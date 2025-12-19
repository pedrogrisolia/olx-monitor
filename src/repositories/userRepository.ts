import sqlite3 from 'sqlite3';
import { db } from '../database/database';
import type { UserRow } from '../types';

// Logger com interface mínima
interface Logger {
  debug: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('../components/Logger');

/**
 * Dados para criar um usuário
 */
interface CreateUserData {
  id: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Cria um novo usuário no banco de dados
 * @param user Dados do usuário
 * @param database Instância opcional do banco de dados (para testes)
 */
const createUser = async (
  user: CreateUserData,
  database: sqlite3.Database = db
): Promise<number> => {
  $logger.debug('userRepository: createUser');

  const query = `
        INSERT INTO users( id, username, firstName, lastName, created )
        VALUES( ?, ?, ?, ?, ? )
    `;

  const now = new Date().toISOString();

  const values = [
    user.id,
    user.username || null,
    user.firstName || null,
    user.lastName || null,
    now,
  ];

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
 * Busca um usuário pelo ID
 * @param id ID do usuário
 * @param database Instância opcional do banco de dados (para testes)
 */
const getUser = async (id: number, database: sqlite3.Database = db): Promise<UserRow> => {
  $logger.debug('userRepository: getUser');

  const query = `SELECT * FROM users WHERE id = ?`;
  const values = [id];

  return new Promise<UserRow>((resolve, reject) => {
    database.get(query, values, (error: Error | null, row: UserRow | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      if (!row) {
        reject('No user with this ID was found');
        return;
      }

      resolve(row);
    });
  });
};

/**
 * Retorna todos os usuários
 * @param database Instância opcional do banco de dados (para testes)
 */
const getAllUsers = async (database: sqlite3.Database = db): Promise<UserRow[]> => {
  $logger.debug('userRepository: getAllUsers');

  const query = `SELECT * FROM users`;

  return new Promise<UserRow[]>((resolve, reject) => {
    database.all(query, [], (error: Error | null, rows: UserRow[] | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows || []);
    });
  });
};

/**
 * Verifica se um usuário existe
 * @param id ID do usuário
 * @param database Instância opcional do banco de dados (para testes)
 */
const userExists = async (id: number, database: sqlite3.Database = db): Promise<boolean> => {
  $logger.debug('userRepository: userExists');

  try {
    await getUser(id, database);
    return true;
  } catch (_error) {
    return false;
  }
};

export { createUser, getUser, getAllUsers, userExists };
export type { CreateUserData };
