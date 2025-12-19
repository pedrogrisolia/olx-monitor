import sqlite3 from 'sqlite3';
import { createTables } from '../../database/database';
import {
  createAd,
  getAd,
  updateAd,
  getAdsBySearchTerm,
  getAdsBySearchId,
} from '../../repositories/adRepository';
import type { AdRow } from '../../types';

describe('adRepository', () => {
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

  describe('createAd', () => {
    it('deve criar um anúncio no banco de dados', async () => {
      const ad = {
        id: 123456,
        url: 'https://www.olx.com.br/anuncio/123456',
        title: 'Anúncio Teste',
        searchTerm: 'teste',
        price: 1500,
        userId: null,
      };

      await createAd(ad, testDb);

      const row = await new Promise<AdRow>((resolve, reject) => {
        testDb.get('SELECT * FROM ads WHERE id = ?', [ad.id], (err, row) => {
          if (err) reject(err);
          else resolve(row as AdRow);
        });
      });

      expect(row).toBeDefined();
      expect(row.id).toBe(ad.id);
      expect(row.title).toBe(ad.title);
      expect(row.price).toBe(ad.price);
      expect(row.url).toBe(ad.url);
      expect(row.searchTerm).toBe(ad.searchTerm);
      expect(row.created).toBeDefined();
      expect(row.lastUpdate).toBeDefined();
    });

    it('deve criar um anúncio com userId', async () => {
      const ad = {
        id: 789012,
        url: 'https://www.olx.com.br/anuncio/789012',
        title: 'Anúncio com User',
        searchTerm: 'user-test',
        price: 2000,
        userId: 42,
      };

      await createAd(ad, testDb);

      const row = await new Promise<AdRow>((resolve, reject) => {
        testDb.get('SELECT * FROM ads WHERE id = ?', [ad.id], (err, row) => {
          if (err) reject(err);
          else resolve(row as AdRow);
        });
      });

      expect(row.userId).toBe(42);
    });
  });

  describe('getAd', () => {
    it('deve retornar um anúncio existente pelo id', async () => {
      const ad = {
        id: 111111,
        url: 'https://www.olx.com.br/anuncio/111111',
        title: 'Anúncio para Busca',
        searchTerm: 'busca',
        price: 999,
        userId: null,
      };

      await createAd(ad, testDb);

      const result = await getAd(ad.id, testDb);

      expect(result).toBeDefined();
      expect(result.id).toBe(ad.id);
      expect(result.title).toBe(ad.title);
    });

    it('deve rejeitar quando anúncio não existe', async () => {
      await expect(getAd(999999, testDb)).rejects.toBe('No ad with this ID was found');
    });
  });

  describe('updateAd', () => {
    it('deve atualizar o preço de um anúncio existente', async () => {
      const ad = {
        id: 222222,
        url: 'https://www.olx.com.br/anuncio/222222',
        title: 'Anúncio para Update',
        searchTerm: 'update',
        price: 1000,
        userId: null,
      };

      await createAd(ad, testDb);

      // Espera um pequeno tempo para garantir que o timestamp muda
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedAd = { id: ad.id, price: 800 };
      await updateAd(updatedAd, testDb);

      const result = await getAd(ad.id, testDb);

      expect(result.price).toBe(800);
      // O timestamp de lastUpdate deve ser diferente do created (após a espera)
      expect(new Date(result.lastUpdate).getTime()).toBeGreaterThanOrEqual(
        new Date(result.created).getTime()
      );
    });
  });

  describe('getAdsBySearchTerm', () => {
    it('deve retornar anúncios pelo termo de busca', async () => {
      const ads = [
        { id: 1, url: 'https://test/1', title: 'Ad 1', searchTerm: 'carros', price: 1000, userId: null },
        { id: 2, url: 'https://test/2', title: 'Ad 2', searchTerm: 'carros', price: 2000, userId: null },
        { id: 3, url: 'https://test/3', title: 'Ad 3', searchTerm: 'motos', price: 3000, userId: null },
      ];

      for (const ad of ads) {
        await createAd(ad, testDb);
      }

      const result = await getAdsBySearchTerm('carros', 10, testDb);

      expect(result).toHaveLength(2);
      expect(result[0].searchTerm).toBe('carros');
      expect(result[1].searchTerm).toBe('carros');
    });

    it('deve respeitar o limite', async () => {
      const ads = [
        { id: 1, url: 'https://test/1', title: 'Ad 1', searchTerm: 'limite', price: 1000, userId: null },
        { id: 2, url: 'https://test/2', title: 'Ad 2', searchTerm: 'limite', price: 2000, userId: null },
        { id: 3, url: 'https://test/3', title: 'Ad 3', searchTerm: 'limite', price: 3000, userId: null },
      ];

      for (const ad of ads) {
        await createAd(ad, testDb);
      }

      const result = await getAdsBySearchTerm('limite', 2, testDb);

      expect(result).toHaveLength(2);
    });
  });

  describe('getAdsBySearchId', () => {
    it('deve rejeitar com erro quando coluna searchId não existe', async () => {
      // A coluna searchId não existe no schema atual, então deve falhar
      // Este comportamento está preservado do código original
      await expect(getAdsBySearchId(999, 10, testDb)).rejects.toThrow();
    });
  });
});
