jest.mock('../../repositories/userRepository', () => ({
  getAllUsers: jest.fn(),
}));

jest.mock('../../repositories/userUrlRepository', () => ({
  getUserUrls: jest.fn(),
}));

jest.mock('../../components/Logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import * as userRepository from '../../repositories/userRepository';
import * as userUrlRepository from '../../repositories/userUrlRepository';
import logger from '../../components/Logger';
import { logStartupUsersSummary } from '../../components/StartupSummary';

describe('StartupSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve imprimir zero usuários e zero URLs quando não há usuários cadastrados', async () => {
    (userRepository.getAllUsers as jest.Mock).mockResolvedValue([]);

    await logStartupUsersSummary();

    expect(logger.info).toHaveBeenCalledWith('Usuários cadastrados: 0');
    expect(logger.info).toHaveBeenCalledWith('Total de URLs cadastradas: 0');
    expect(userUrlRepository.getUserUrls).not.toHaveBeenCalled();
  });

  it('deve imprimir quantas URLs cada usuário possui e o total geral', async () => {
    (userRepository.getAllUsers as jest.Mock).mockResolvedValue([
      {
        id: 101,
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Silva',
        created: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 202,
        username: null,
        firstName: 'Bob',
        lastName: null,
        created: '2026-01-01T00:00:00.000Z',
      },
    ]);

    (userUrlRepository.getUserUrls as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, userId: 101, url: 'https://olx.com.br/a', label: null, isActive: 1, created: '' },
        { id: 2, userId: 101, url: 'https://olx.com.br/b', label: null, isActive: 1, created: '' },
      ])
      .mockResolvedValueOnce([
        { id: 3, userId: 202, url: 'https://olx.com.br/c', label: null, isActive: 1, created: '' },
      ]);

    await logStartupUsersSummary();

    expect(logger.info).toHaveBeenCalledWith('Usuários cadastrados: 2');
    expect(logger.info).toHaveBeenCalledWith('- @alice: 2 URL(s) cadastrada(s)');
    expect(logger.info).toHaveBeenCalledWith('- ID 202: 1 URL(s) cadastrada(s)');
    expect(logger.info).toHaveBeenCalledWith('Total de URLs cadastradas: 3');

    expect(userUrlRepository.getUserUrls).toHaveBeenCalledTimes(2);
    expect(userUrlRepository.getUserUrls).toHaveBeenNthCalledWith(1, 101);
    expect(userUrlRepository.getUserUrls).toHaveBeenNthCalledWith(2, 202);
  });
});
