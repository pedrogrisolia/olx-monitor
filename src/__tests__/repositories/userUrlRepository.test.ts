import sqlite3 from 'sqlite3';
import { createTables } from '../../database/database';
import { createUser } from '../../repositories/userRepository';
import {
  createUserUrl,
  getUserUrls,
  getUserUrl,
  getAllActiveUrls,
  deleteUserUrl,
  urlExistsForUser,
} from '../../repositories/userUrlRepository';
import type { UserUrlRow, UserUrlWithChatId } from '../../types';

describe('userUrlRepository', () => {
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

  describe('createUserUrl', () => {
    it('deve criar uma URL para um usuário', async () => {
      const user = { id: 123, username: 'testuser' };
      await createUser(user, testDb);

      const urlId = await createUserUrl(user.id, 'https://www.olx.com.br/search?q=test', 'Busca Teste', testDb);

      expect(urlId).toBeDefined();
      expect(typeof urlId).toBe('number');

      const row = await new Promise<UserUrlRow>((resolve, reject) => {
        testDb.get('SELECT * FROM user_urls WHERE id = ?', [urlId], (err, row) => {
          if (err) reject(err);
          else resolve(row as UserUrlRow);
        });
      });

      expect(row.userId).toBe(user.id);
      expect(row.url).toBe('https://www.olx.com.br/search?q=test');
      expect(row.label).toBe('Busca Teste');
      expect(row.isActive).toBe(1);
    });

    it('deve criar URL sem label', async () => {
      const user = { id: 456, username: 'nolabel' };
      await createUser(user, testDb);

      const urlId = await createUserUrl(user.id, 'https://www.olx.com.br/test', null, testDb);

      const row = await new Promise<UserUrlRow>((resolve, reject) => {
        testDb.get('SELECT * FROM user_urls WHERE id = ?', [urlId], (err, row) => {
          if (err) reject(err);
          else resolve(row as UserUrlRow);
        });
      });

      expect(row.label).toBeNull();
    });
  });

  describe('getUserUrls', () => {
    it('deve retornar todas as URLs de um usuário', async () => {
      const user = { id: 789, username: 'multiurl' };
      await createUser(user, testDb);

      await createUserUrl(user.id, 'https://olx.com.br/1', 'URL 1', testDb);
      await createUserUrl(user.id, 'https://olx.com.br/2', 'URL 2', testDb);
      await createUserUrl(user.id, 'https://olx.com.br/3', 'URL 3', testDb);

      const urls = await getUserUrls(user.id, testDb);

      expect(urls).toHaveLength(3);
    });

    it('deve retornar array vazio para usuário sem URLs', async () => {
      const user = { id: 999, username: 'nourl' };
      await createUser(user, testDb);

      const urls = await getUserUrls(user.id, testDb);

      expect(urls).toEqual([]);
    });
  });

  describe('getUserUrl', () => {
    it('deve retornar uma URL específica pelo id', async () => {
      const user = { id: 111, username: 'geturl' };
      await createUser(user, testDb);

      const urlId = await createUserUrl(user.id, 'https://olx.com.br/specific', 'Específica', testDb);

      const url = await getUserUrl(urlId, testDb);

      expect(url.id).toBe(urlId);
      expect(url.url).toBe('https://olx.com.br/specific');
      expect(url.label).toBe('Específica');
    });

    it('deve rejeitar quando URL não existe', async () => {
      await expect(getUserUrl(99999, testDb)).rejects.toBe('No URL with this ID was found');
    });
  });

  describe('getAllActiveUrls', () => {
    it('deve retornar URLs ativas com url, userId e chatId', async () => {
      const user1 = { id: 100, username: 'user100' };
      const user2 = { id: 200, username: 'user200' };
      await createUser(user1, testDb);
      await createUser(user2, testDb);

      await createUserUrl(user1.id, 'https://olx.com.br/user1', 'User1 URL', testDb);
      await createUserUrl(user2.id, 'https://olx.com.br/user2', 'User2 URL', testDb);

      const activeUrls = await getAllActiveUrls(testDb);

      expect(activeUrls).toHaveLength(2);

      // Verifica que cada URL retornada tem os campos esperados
      for (const activeUrl of activeUrls) {
        expect(activeUrl).toHaveProperty('url');
        expect(activeUrl).toHaveProperty('userId');
        expect(activeUrl).toHaveProperty('chatId');
        expect(typeof activeUrl.url).toBe('string');
        expect(typeof activeUrl.userId).toBe('number');
        expect(typeof activeUrl.chatId).toBe('number');
      }

      // Verifica que chatId é igual ao userId (conforme query JOIN)
      const user1Url = activeUrls.find((u: UserUrlWithChatId) => u.userId === 100);
      expect(user1Url).toBeDefined();
      expect(user1Url!.chatId).toBe(100);
    });

    it('deve retornar array vazio quando não há URLs ativas', async () => {
      const activeUrls = await getAllActiveUrls(testDb);
      expect(activeUrls).toEqual([]);
    });
  });

  describe('deleteUserUrl', () => {
    it('deve deletar uma URL do usuário', async () => {
      const user = { id: 333, username: 'deleteuser' };
      await createUser(user, testDb);

      const urlId = await createUserUrl(user.id, 'https://olx.com.br/delete', 'Para Deletar', testDb);

      await deleteUserUrl(urlId, user.id, testDb);

      await expect(getUserUrl(urlId, testDb)).rejects.toBe('No URL with this ID was found');
    });

    it('deve rejeitar ao deletar URL inexistente', async () => {
      await expect(deleteUserUrl(99999, 1, testDb)).rejects.toBe(
        'URL not found or you do not have permission to delete it'
      );
    });

    it('deve rejeitar ao deletar URL de outro usuário', async () => {
      const user1 = { id: 444, username: 'owner' };
      const user2 = { id: 555, username: 'notowner' };
      await createUser(user1, testDb);
      await createUser(user2, testDb);

      const urlId = await createUserUrl(user1.id, 'https://olx.com.br/protected', 'Protegida', testDb);

      // user2 tenta deletar URL de user1
      await expect(deleteUserUrl(urlId, user2.id, testDb)).rejects.toBe(
        'URL not found or you do not have permission to delete it'
      );
    });
  });

  describe('urlExistsForUser', () => {
    it('deve retornar true se URL existe para o usuário', async () => {
      const user = { id: 666, username: 'hasurl' };
      await createUser(user, testDb);

      await createUserUrl(user.id, 'https://olx.com.br/exists', 'Existe', testDb);

      const exists = await urlExistsForUser(user.id, 'https://olx.com.br/exists', testDb);

      expect(exists).toBe(true);
    });

    it('deve retornar false se URL não existe para o usuário', async () => {
      const user = { id: 777, username: 'nohasurl' };
      await createUser(user, testDb);

      const exists = await urlExistsForUser(user.id, 'https://olx.com.br/notexists', testDb);

      expect(exists).toBe(false);
    });
  });
});
