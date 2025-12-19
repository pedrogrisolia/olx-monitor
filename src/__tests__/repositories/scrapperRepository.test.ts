import sqlite3 from 'sqlite3';
import { createTables } from '../../database/database';
import { saveLog, getLogsByUrl } from '../../repositories/scrapperRepository';
import type { ScrapeLogRow } from '../../types';

describe('scrapperRepository', () => {
  let testDb: sqlite3.Database;

  beforeEach(async () => {
    testDb = await new Promise<sqlite3.Database>((resolve, reject) => {
      const db = new sqlite3.Database(':memory:', (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
    await createTables(testDb);
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      testDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  describe('saveLog', () => {
    it('deve salvar um log de execução do scraper', async () => {
      const logData = {
        url: 'https://www.olx.com.br/search?q=test',
        adsFound: 10,
        averagePrice: 1500.5,
        minPrice: 500,
        maxPrice: 3000,
      };

      await saveLog(logData, testDb);

      const row = await new Promise<ScrapeLogRow>((resolve, reject) => {
        testDb.get('SELECT * FROM logs WHERE url = ?', [logData.url], (err, row) => {
          if (err) reject(err);
          else resolve(row as ScrapeLogRow);
        });
      });

      expect(row).toBeDefined();
      expect(row.url).toBe(logData.url);
      expect(row.adsFound).toBe(logData.adsFound);
      expect(row.averagePrice).toBe(logData.averagePrice);
      expect(row.minPrice).toBe(logData.minPrice);
      expect(row.maxPrice).toBe(logData.maxPrice);
      expect(row.created).toBeDefined();
    });
  });

  describe('getLogsByUrl', () => {
    it('deve retornar logs de uma URL específica', async () => {
      const logData1 = {
        url: 'https://olx.com.br/logs-test',
        adsFound: 5,
        averagePrice: 1000,
        minPrice: 500,
        maxPrice: 1500,
      };

      const logData2 = {
        url: 'https://olx.com.br/logs-test',
        adsFound: 7,
        averagePrice: 1200,
        minPrice: 600,
        maxPrice: 1800,
      };

      const logData3 = {
        url: 'https://olx.com.br/other-url',
        adsFound: 3,
        averagePrice: 800,
        minPrice: 400,
        maxPrice: 1200,
      };

      await saveLog(logData1, testDb);
      await saveLog(logData2, testDb);
      await saveLog(logData3, testDb);

      const logs = await getLogsByUrl('https://olx.com.br/logs-test', 10, testDb);

      expect(logs).toHaveLength(2);
      expect(logs.every((log: ScrapeLogRow) => log.url === 'https://olx.com.br/logs-test')).toBe(true);
    });

    it('deve respeitar o limite', async () => {
      const logData = {
        url: 'https://olx.com.br/limit-test',
        adsFound: 1,
        averagePrice: 100,
        minPrice: 50,
        maxPrice: 150,
      };

      await saveLog(logData, testDb);
      await saveLog(logData, testDb);
      await saveLog(logData, testDb);

      const logs = await getLogsByUrl('https://olx.com.br/limit-test', 2, testDb);

      expect(logs).toHaveLength(2);
    });

    it('deve retornar array vazio para URL sem logs', async () => {
      const logs = await getLogsByUrl('https://olx.com.br/no-logs', 10, testDb);
      expect(logs).toEqual([]);
    });
  });
});
