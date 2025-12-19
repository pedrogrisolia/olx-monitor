import path from 'path';
import sqlite3 from 'sqlite3';
import config from '../config';

const sqlite = sqlite3.verbose();

// Instância global do banco de dados para uso padrão
// Resolve o caminho a partir do diretório de execução (onde está o package.json).
// Isso evita dependência do caminho de build (dist) e mantém compatibilidade com dev e Docker.
const db: sqlite3.Database = new sqlite.Database(
  path.resolve(process.cwd(), config.dbFile)
);

/**
 * Cria todas as tabelas necessárias no banco de dados
 * @param database Instância opcional do banco de dados (para testes)
 * @returns Promise que resolve quando todas as tabelas forem criadas
 */
const createTables = async (database: sqlite3.Database = db): Promise<boolean> => {
  const queries = [
    `
    CREATE TABLE IF NOT EXISTS "ads" (
        "id"            INTEGER NOT NULL UNIQUE,
        "searchTerm"    TEXT NOT NULL,
        "title"         TEXT NOT NULL,
        "price"         INTEGER NOT NULL,
        "url"           TEXT NOT NULL,
        "created"       TEXT NOT NULL,
        "lastUpdate"    TEXT NOT NULL,
        "userId"        INTEGER
    );`,

    `CREATE TABLE IF NOT EXISTS "logs" (
        "id"            INTEGER NOT NULL UNIQUE,
        "url"           TEXT NOT NULL,  
        "adsFound"      INTEGER NOT NULL, 
        "averagePrice"  NUMERIC NOT NULL,
        "minPrice"      NUMERIC NOT NULL,
        "maxPrice"      NUMERIC NOT NULL, 
        "created"       TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
    );`,

    `CREATE TABLE IF NOT EXISTS "users" (
        "id"            INTEGER PRIMARY KEY,
        "username"      TEXT,
        "firstName"     TEXT,
        "lastName"      TEXT,
        "created"       TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "user_urls" (
        "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
        "userId"        INTEGER NOT NULL,
        "url"           TEXT NOT NULL,
        "label"         TEXT,
        "isActive"      INTEGER DEFAULT 1,
        "created"       TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
    );`,
  ];

  // Add userId column to ads table if it doesn't exist (for existing databases)
  const alterQueries = [`ALTER TABLE ads ADD COLUMN userId INTEGER;`];

  return new Promise<boolean>((resolve, reject) => {
    // Iterate through the array of queries and execute them one by one
    const executeQuery = (index: number): void => {
      if (index === queries.length) {
        // After creating tables, try to add userId column to ads (will fail silently if already exists)
        const executeAlter = (alterIndex: number): void => {
          if (alterIndex === alterQueries.length) {
            resolve(true);
            return;
          }
          database.run(alterQueries[alterIndex], function (_error: Error | null) {
            // Ignore error if column already exists
            executeAlter(alterIndex + 1);
          });
        };
        executeAlter(0);
        return;
      }

      database.run(queries[index], function (error: Error | null) {
        if (error) {
          reject(error);
          return;
        }

        // Execute the next query in the array
        executeQuery(index + 1);
      });
    };

    // Start executing the queries from index 0
    executeQuery(0);
  });
};

/**
 * Fecha a conexão com o banco de dados
 * @param database Instância opcional do banco de dados (para testes)
 * @returns Promise que resolve quando a conexão for fechada
 */
const closeDatabase = (database: sqlite3.Database = db): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    database.close((error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

export { db, createTables, closeDatabase };
