import sqlite3 from 'sqlite3';
import { db } from '../database/database';
import type { AdRow } from '../types';

// Logger com interface mínima
interface Logger {
  debug: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('../components/Logger');

/**
 * Dados para criar um anúncio
 */
interface CreateAdData {
  id: number;
  url: string;
  title: string;
  searchTerm: string;
  price: number;
  userId?: number | null;
}

/**
 * Dados para atualizar um anúncio
 */
interface UpdateAdData {
  id: number;
  price: number;
}

/**
 * Busca um anúncio pelo ID
 * @param id ID do anúncio
 * @param database Instância opcional do banco de dados (para testes)
 */
const getAd = async (id: number, database: sqlite3.Database = db): Promise<AdRow> => {
  $logger.debug('adRepository: getAd');

  const query = `SELECT * FROM ads WHERE id = ?`;
  const values = [id];

  return new Promise<AdRow>((resolve, reject) => {
    database.get(query, values, (error: Error | null, row: AdRow | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      if (!row) {
        reject('No ad with this ID was found');
        return;
      }

      resolve(row);
    });
  });
};

/**
 * Busca anúncios por termo de busca
 * @param term Termo de busca
 * @param limit Limite de resultados
 * @param database Instância opcional do banco de dados (para testes)
 */
const getAdsBySearchTerm = async (
  term: string,
  limit: number,
  database: sqlite3.Database = db
): Promise<AdRow[]> => {
  $logger.debug('adRepository: getAdsBySearchTerm');

  const query = `SELECT * FROM ads WHERE searchTerm = ? LIMIT ?`;
  const values = [term, limit];

  return new Promise<AdRow[]>((resolve, reject) => {
    database.all(query, values, (error: Error | null, rows: AdRow[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      if (!rows) {
        reject('No ad with this term was found');
        return;
      }

      resolve(rows);
    });
  });
};

/**
 * Busca anúncios por ID de busca
 * @param id ID da busca
 * @param limit Limite de resultados
 * @param database Instância opcional do banco de dados (para testes)
 */
const getAdsBySearchId = async (
  id: number,
  limit: number,
  database: sqlite3.Database = db
): Promise<AdRow[]> => {
  $logger.debug('adRepository: getAdsBySearchId');

  const query = `SELECT * FROM ads WHERE searchId = ? LIMIT ?`;
  const values = [id, limit];

  return new Promise<AdRow[]>((resolve, reject) => {
    database.all(query, values, (error: Error | null, rows: AdRow[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      // Retorna array vazio se não houver resultados
      resolve(rows || []);
    });
  });
};

/**
 * Cria um novo anúncio no banco de dados
 * @param ad Dados do anúncio
 * @param database Instância opcional do banco de dados (para testes)
 */
const createAd = async (
  ad: CreateAdData,
  database: sqlite3.Database = db
): Promise<void> => {
  $logger.debug('adRepository: createAd');

  const query = `
        INSERT INTO ads( id, url, title, searchTerm, price, created, lastUpdate, userId )
        VALUES( ?, ?, ?, ?, ?, ?, ?, ? )
    `;

  const now = new Date().toISOString();

  const values = [ad.id, ad.url, ad.title, ad.searchTerm, ad.price, now, now, ad.userId || null];

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
 * Atualiza o preço de um anúncio existente
 * @param ad Dados do anúncio com novo preço
 * @param database Instância opcional do banco de dados (para testes)
 */
const updateAd = async (
  ad: UpdateAdData,
  database: sqlite3.Database = db
): Promise<boolean> => {
  $logger.debug('adRepository: updateAd');

  const query = `UPDATE ads SET price = ?, lastUpdate = ?  WHERE id = ?`;
  const values = [ad.price, new Date().toISOString(), ad.id];

  return new Promise<boolean>((resolve, reject) => {
    database.run(query, values, function (error: Error | null) {
      if (error) {
        reject(error);
        return;
      }

      resolve(true);
    });
  });
};

export { getAd, getAdsBySearchTerm, getAdsBySearchId, createAd, updateAd };
export type { CreateAdData, UpdateAdData };
