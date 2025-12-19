import sqlite3 from 'sqlite3';
import { db } from '../database/database';
import type { ScrapeLogRow } from '../types';

// Logger com interface mínima
interface Logger {
  debug: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('../components/Logger');

/**
 * Dados para salvar um log de scraping
 */
interface SaveLogData {
  url: string;
  adsFound: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
}

/**
 * Salva um log de execução do scraper
 * @param data Dados do log
 * @param database Instância opcional do banco de dados (para testes)
 */
const saveLog = async (
  data: SaveLogData,
  database: sqlite3.Database = db
): Promise<void> => {
  $logger.debug('scrapperRepository: saveLog');

  const query = `
        INSERT INTO logs(  url, adsFound, averagePrice, minPrice, maxPrice, created )
        VALUES( ?, ?, ?, ?, ?, ? )
    `;

  const now = new Date().toISOString();

  const values = [
    data.url,
    data.adsFound,
    data.averagePrice,
    data.minPrice,
    data.maxPrice,
    now,
  ];

  return new Promise<void>((resolve, reject) => {
    database.run(query, values, function (error: Error | null) {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

/**
 * Busca logs por URL
 * @param url URL pesquisada
 * @param limit Limite de resultados
 * @param database Instância opcional do banco de dados (para testes)
 */
const getLogsByUrl = async (
  url: string,
  limit: number,
  database: sqlite3.Database = db
): Promise<ScrapeLogRow[]> => {
  $logger.debug('scrapperRepository: getLogsByUrl');

  const query = `SELECT * FROM logs WHERE url = ? LIMIT ?`;
  const values = [url, limit];

  return new Promise<ScrapeLogRow[]>((resolve, reject) => {
    database.all(query, values, (error: Error | null, rows: ScrapeLogRow[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      // Retorna array vazio se não houver resultados
      resolve(rows || []);
    });
  });
};

export { saveLog, getLogsByUrl };
export type { SaveLogData };
