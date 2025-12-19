import sqlite3 from 'sqlite3';
import { createTables, closeDatabase } from '../../database/database';

describe('database', () => {
  let testDb: sqlite3.Database;

  beforeEach((done) => {
    // Usa banco em memória para testes
    testDb = new sqlite3.Database(':memory:', done);
  });

  afterEach((done) => {
    testDb.close(done);
  });

  describe('createTables', () => {
    it('deve criar a tabela "ads" com as colunas corretas', async () => {
      await createTables(testDb);

      const columns = await new Promise<{ name: string; type: string }[]>((resolve, reject) => {
        testDb.all("PRAGMA table_info(ads)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows as { name: string; type: string }[]);
        });
      });

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('searchTerm');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('price');
      expect(columnNames).toContain('url');
      expect(columnNames).toContain('created');
      expect(columnNames).toContain('lastUpdate');
      expect(columnNames).toContain('userId');
    });

    it('deve criar a tabela "logs" com as colunas corretas', async () => {
      await createTables(testDb);

      const columns = await new Promise<{ name: string; type: string }[]>((resolve, reject) => {
        testDb.all("PRAGMA table_info(logs)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows as { name: string; type: string }[]);
        });
      });

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('url');
      expect(columnNames).toContain('adsFound');
      expect(columnNames).toContain('averagePrice');
      expect(columnNames).toContain('minPrice');
      expect(columnNames).toContain('maxPrice');
      expect(columnNames).toContain('created');
    });

    it('deve criar a tabela "users" com as colunas corretas', async () => {
      await createTables(testDb);

      const columns = await new Promise<{ name: string; type: string }[]>((resolve, reject) => {
        testDb.all("PRAGMA table_info(users)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows as { name: string; type: string }[]);
        });
      });

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('firstName');
      expect(columnNames).toContain('lastName');
      expect(columnNames).toContain('created');
    });

    it('deve criar a tabela "user_urls" com as colunas corretas', async () => {
      await createTables(testDb);

      const columns = await new Promise<{ name: string; type: string }[]>((resolve, reject) => {
        testDb.all("PRAGMA table_info(user_urls)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows as { name: string; type: string }[]);
        });
      });

      const columnNames = columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('url');
      expect(columnNames).toContain('label');
      expect(columnNames).toContain('isActive');
      expect(columnNames).toContain('created');
    });

    it('deve poder ser chamado múltiplas vezes sem erro (IF NOT EXISTS)', async () => {
      await createTables(testDb);
      await createTables(testDb);
      // Se não lançar erro, passou
      expect(true).toBe(true);
    });
  });

  describe('closeDatabase', () => {
    it('deve fechar o banco de dados sem erro', async () => {
      const db = new sqlite3.Database(':memory:');
      await closeDatabase(db);
      // Se não lançar erro, passou
      expect(true).toBe(true);
    });
  });
});
