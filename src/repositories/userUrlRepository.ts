import sqlite3 from 'sqlite3';
import { db } from '../database/database';
import type { UserUrlRow, UserUrlWithChatId } from '../types';

// Logger com interface mínima
interface Logger {
  debug: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('../components/Logger');

/**
 * Cria uma URL para um usuário
 * @param userId ID do usuário
 * @param url URL a ser monitorada
 * @param label Rótulo opcional
 * @param database Instância opcional do banco de dados (para testes)
 */
const createUserUrl = async (
  userId: number,
  url: string,
  label: string | null = null,
  database: sqlite3.Database = db
): Promise<number> => {
  $logger.debug('userUrlRepository: createUserUrl');

  const query = `
        INSERT INTO user_urls( userId, url, label, isActive, created )
        VALUES( ?, ?, ?, ?, ? )
    `;

  const now = new Date().toISOString();

  const values = [userId, url, label || null, 1, now];

  return new Promise<number>((resolve, reject) => {
    database.run(query, values, function (this: sqlite3.RunResult, error: Error | null) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this.lastID);
    });
  });
};

/**
 * Retorna todas as URLs de um usuário
 * @param userId ID do usuário
 * @param database Instância opcional do banco de dados (para testes)
 */
const getUserUrls = async (
  userId: number,
  database: sqlite3.Database = db
): Promise<UserUrlRow[]> => {
  $logger.debug('userUrlRepository: getUserUrls');

  const query = `SELECT * FROM user_urls WHERE userId = ? ORDER BY created DESC`;
  const values = [userId];

  return new Promise<UserUrlRow[]>((resolve, reject) => {
    database.all(query, values, (error: Error | null, rows: UserUrlRow[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows || []);
    });
  });
};

/**
 * Busca uma URL específica pelo ID
 * @param id ID da URL
 * @param database Instância opcional do banco de dados (para testes)
 */
const getUserUrl = async (
  id: number,
  database: sqlite3.Database = db
): Promise<UserUrlRow> => {
  $logger.debug('userUrlRepository: getUserUrl');

  const query = `SELECT * FROM user_urls WHERE id = ?`;
  const values = [id];

  return new Promise<UserUrlRow>((resolve, reject) => {
    database.get(query, values, (error: Error | null, row: UserUrlRow | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      if (!row) {
        reject('No URL with this ID was found');
        return;
      }

      resolve(row);
    });
  });
};

/**
 * Retorna todas as URLs ativas com dados do usuário
 * @param database Instância opcional do banco de dados (para testes)
 */
const getAllActiveUrls = async (
  database: sqlite3.Database = db
): Promise<UserUrlWithChatId[]> => {
  $logger.debug('userUrlRepository: getAllActiveUrls');

  const query = `
        SELECT uu.id, uu.userId, uu.url, uu.label, u.id as chatId
        FROM user_urls uu
        JOIN users u ON uu.userId = u.id
        WHERE uu.isActive = 1
    `;

  return new Promise<UserUrlWithChatId[]>((resolve, reject) => {
    database.all(query, [], (error: Error | null, rows: UserUrlWithChatId[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows || []);
    });
  });
};

/**
 * Deleta uma URL de um usuário
 * @param id ID da URL
 * @param userId ID do usuário (para verificação de permissão)
 * @param database Instância opcional do banco de dados (para testes)
 */
const deleteUserUrl = async (
  id: number,
  userId: number,
  database: sqlite3.Database = db
): Promise<boolean> => {
  $logger.debug('userUrlRepository: deleteUserUrl');

  const query = `DELETE FROM user_urls WHERE id = ? AND userId = ?`;
  const values = [id, userId];

  return new Promise<boolean>((resolve, reject) => {
    database.run(query, values, function (this: sqlite3.RunResult, error: Error | null) {
      if (error) {
        reject(error);
        return;
      }

      if (this.changes === 0) {
        reject('URL not found or you do not have permission to delete it');
        return;
      }

      resolve(true);
    });
  });
};

/**
 * Verifica se uma URL já existe para um usuário
 * @param userId ID do usuário
 * @param url URL a verificar
 * @param database Instância opcional do banco de dados (para testes)
 */
const urlExistsForUser = async (
  userId: number,
  url: string,
  database: sqlite3.Database = db
): Promise<boolean> => {
  $logger.debug('userUrlRepository: urlExistsForUser');

  const query = `SELECT * FROM user_urls WHERE userId = ? AND url = ?`;
  const values = [userId, url];

  return new Promise<boolean>((resolve, reject) => {
    database.get(query, values, (error: Error | null, row: UserUrlRow | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(!!row);
    });
  });
};

export {
  createUserUrl,
  getUserUrls,
  getUserUrl,
  getAllActiveUrls,
  deleteUserUrl,
  urlExistsForUser,
};
