import sqlite3 from 'sqlite3';
import { createTables } from '../../database/database';
import {
  createUser,
  getUser,
  getAllUsers,
  userExists,
} from '../../repositories/userRepository';
import type { UserRow } from '../../types';

describe('userRepository', () => {
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

  describe('createUser', () => {
    it('deve criar um usuário no banco de dados', async () => {
      const user = {
        id: 12345678,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      await createUser(user, testDb);

      const row = await new Promise<UserRow>((resolve, reject) => {
        testDb.get('SELECT * FROM users WHERE id = ?', [user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row as UserRow);
        });
      });

      expect(row).toBeDefined();
      expect(row.id).toBe(user.id);
      expect(row.username).toBe(user.username);
      expect(row.firstName).toBe(user.firstName);
      expect(row.lastName).toBe(user.lastName);
      expect(row.created).toBeDefined();
    });

    it('deve criar usuário com campos opcionais como null', async () => {
      const user = {
        id: 87654321,
      };

      await createUser(user, testDb);

      const row = await new Promise<UserRow>((resolve, reject) => {
        testDb.get('SELECT * FROM users WHERE id = ?', [user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row as UserRow);
        });
      });

      expect(row.username).toBeNull();
      expect(row.firstName).toBeNull();
      expect(row.lastName).toBeNull();
    });
  });

  describe('getUser', () => {
    it('deve retornar um usuário existente pelo id', async () => {
      const user = {
        id: 11111111,
        username: 'findme',
        firstName: 'Find',
        lastName: 'Me',
      };

      await createUser(user, testDb);

      const result = await getUser(user.id, testDb);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.username).toBe(user.username);
    });

    it('deve rejeitar quando usuário não existe', async () => {
      await expect(getUser(999999999, testDb)).rejects.toBe('No user with this ID was found');
    });
  });

  describe('getAllUsers', () => {
    it('deve retornar array vazio quando não há usuários', async () => {
      const result = await getAllUsers(testDb);
      expect(result).toEqual([]);
    });

    it('deve retornar todos os usuários', async () => {
      const users = [
        { id: 1, username: 'user1', firstName: 'User', lastName: 'One' },
        { id: 2, username: 'user2', firstName: 'User', lastName: 'Two' },
        { id: 3, username: 'user3', firstName: 'User', lastName: 'Three' },
      ];

      for (const user of users) {
        await createUser(user, testDb);
      }

      const result = await getAllUsers(testDb);

      expect(result).toHaveLength(3);
    });
  });

  describe('userExists', () => {
    it('deve retornar true para usuário existente', async () => {
      const user = { id: 44444444, username: 'exists' };
      await createUser(user, testDb);

      const exists = await userExists(user.id, testDb);

      expect(exists).toBe(true);
    });

    it('deve retornar false para usuário inexistente', async () => {
      const exists = await userExists(888888888, testDb);

      expect(exists).toBe(false);
    });
  });
});
