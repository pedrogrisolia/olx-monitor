/**
 * Testes unitários para TelegramBot.ts
 * Testa inicialização e handlers de comandos do bot
 */

// Tipos para helpers de teste
interface TelegramMessage {
  chat: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface RegExpMatch extends Array<string> {
  index: number;
  input: string;
}

interface OnTextHandler {
  (msg: TelegramMessage, match: RegExpMatch | null): Promise<void>;
}

interface OnEventHandler {
  (error: Error): void;
}

// Mocks são criados aqui para serem acessíveis globalmente
const mockSendMessage = jest.fn().mockResolvedValue({});
const mockOnText = jest.fn();
const mockOn = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

// Mock config compartilhado
let mockTelegramToken: string | undefined = undefined;

// Helper para capturar handlers registrados
const getRegisteredHandlers = (): Map<string, OnTextHandler> => {
  const handlers = new Map<string, OnTextHandler>();
  
  mockOnText.mock.calls.forEach((call: [RegExp, OnTextHandler]) => {
    const pattern = call[0].toString();
    const handler = call[1];
    handlers.set(pattern, handler);
  });
  
  return handlers;
};

// Helper para encontrar handler por padrão
const findHandler = (pattern: string): OnTextHandler | undefined => {
  const handlers = getRegisteredHandlers();
  
  for (const [key, handler] of handlers) {
    if (key.includes(pattern)) {
      return handler;
    }
  }
  
  return undefined;
};

// Helper para criar mensagem fake
const createMessage = (chatId: number, options: Partial<TelegramMessage['chat']> = {}): TelegramMessage => ({
  chat: {
    id: chatId,
    username: options.username || 'testuser',
    first_name: options.first_name || 'Test',
    last_name: options.last_name || 'User',
  },
});

describe('TelegramBot', () => {
  // Mocks para repositórios
  let mockUserExists: jest.Mock;
  let mockCreateUser: jest.Mock;
  let mockUrlExistsForUser: jest.Mock;
  let mockCreateUserUrl: jest.Mock;
  let mockGetUserUrls: jest.Mock;
  let mockDeleteUserUrl: jest.Mock;
  let mockIsValidOlxUrl: jest.Mock;
  let mockSanitizeUrl: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Reset mocks
    mockSendMessage.mockClear();
    mockOnText.mockClear();
    mockOn.mockClear();
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockLoggerDebug.mockClear();
    
    // Default config
    mockTelegramToken = undefined;
    
    // Initialize repository mocks
    mockUserExists = jest.fn();
    mockCreateUser = jest.fn().mockResolvedValue(1);
    mockUrlExistsForUser = jest.fn();
    mockCreateUserUrl = jest.fn().mockResolvedValue(1);
    mockGetUserUrls = jest.fn();
    mockDeleteUserUrl = jest.fn();
    mockIsValidOlxUrl = jest.fn();
    mockSanitizeUrl = jest.fn((url: string) => url);
    
    // Mock node-telegram-bot-api
    jest.doMock('node-telegram-bot-api', () => {
      return jest.fn().mockImplementation(() => ({
        sendMessage: mockSendMessage,
        onText: mockOnText,
        on: mockOn,
      }));
    });
    
    // Mock Logger
    jest.doMock('../../components/Logger', () => ({
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      debug: mockLoggerDebug,
    }));
    
    // Mock config
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        get telegramToken() { return mockTelegramToken; },
        telegramChatID: undefined,
        urls: [],
        interval: '*/5 * * * *',
        dbFile: '../data/ads.db',
        logger: {
          logFilePath: '../data/scrapper.log',
          timestampFormat: 'YYYY-MM-DD HH:mm:ss',
        },
      },
    }));
    
    // Mock repositories
    jest.doMock('../../repositories/userRepository', () => ({
      userExists: mockUserExists,
      createUser: mockCreateUser,
    }));
    
    jest.doMock('../../repositories/userUrlRepository', () => ({
      urlExistsForUser: mockUrlExistsForUser,
      createUserUrl: mockCreateUserUrl,
      getUserUrls: mockGetUserUrls,
      deleteUserUrl: mockDeleteUserUrl,
    }));
    
    // Mock urlValidator
    jest.doMock('../../utils/urlValidator', () => ({
      isValidOlxUrl: mockIsValidOlxUrl,
      sanitizeUrl: mockSanitizeUrl,
    }));
  });

  describe('initializeTelegramBot', () => {
    it('não deve inicializar quando config.telegramToken está ausente', () => {
      mockTelegramToken = undefined;
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      const TelegramBotMock = require('node-telegram-bot-api');
      
      initializeTelegramBot();

      expect(TelegramBotMock).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Telegram token not configured. Bot will not be initialized.'
      );
    });

    it('deve inicializar quando config.telegramToken está presente', () => {
      mockTelegramToken = 'test-token-123';
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      const TelegramBotMock = require('node-telegram-bot-api');
      
      initializeTelegramBot();

      expect(TelegramBotMock).toHaveBeenCalledWith('test-token-123', { polling: true });
      expect(mockLoggerInfo).toHaveBeenCalledWith('Telegram bot initialized');
    });
  });

  describe('/start command', () => {
    it('deve registrar usuário se não existe e enviar mensagem de boas-vindas', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(false);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const startHandler = findHandler('start');
      expect(startHandler).toBeDefined();

      const msg = createMessage(12345, {
        username: 'newuser',
        first_name: 'John',
        last_name: 'Doe',
      });

      await startHandler!(msg, null);

      expect(mockUserExists).toHaveBeenCalledWith(12345);
      expect(mockCreateUser).toHaveBeenCalledWith({
        id: 12345,
        username: 'newuser',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith('New user registered: 12345');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('🎉 Olá! Sou o OLX Monitor Bot.')
      );
    });

    it('não deve criar usuário se já existe', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(true);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const startHandler = findHandler('start');
      const msg = createMessage(12345);

      await startHandler!(msg, null);

      expect(mockUserExists).toHaveBeenCalledWith(12345);
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('🎉 Olá!')
      );
    });

    it('deve enviar mensagem de erro quando ocorre exceção', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockRejectedValue(new Error('Database error'));
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const startHandler = findHandler('start');
      const msg = createMessage(12345);

      await startHandler!(msg, null);

      expect(mockLoggerError).toHaveBeenCalledWith('Error in /start command: Database error');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Erro ao processar comando. Tente novamente.'
      );
    });
  });

  describe('/adicionar command', () => {
    it('deve rejeitar se usuário não existe', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(false);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const addHandler = findHandler('adicionar');
      expect(addHandler).toBeDefined();

      const msg = createMessage(12345);
      const matchArr = ['', 'adicionar', 'https://www.olx.com.br/imoveis'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/adicionar https://www.olx.com.br/imoveis' });

      await addHandler!(msg, match);

      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Por favor, use /start primeiro para se registrar.'
      );
      expect(mockCreateUserUrl).not.toHaveBeenCalled();
    });

    it('deve rejeitar URL inválida', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(true);
      mockIsValidOlxUrl.mockReturnValue(false);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const addHandler = findHandler('adicionar');
      const msg = createMessage(12345);
      const matchArr = ['', 'adicionar', 'https://invalid.com'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/adicionar https://invalid.com' });

      await addHandler!(msg, match);

      expect(mockIsValidOlxUrl).toHaveBeenCalledWith('https://invalid.com');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('❌ URL inválida')
      );
      expect(mockCreateUserUrl).not.toHaveBeenCalled();
    });

    it('deve rejeitar URL duplicada', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(true);
      mockIsValidOlxUrl.mockReturnValue(true);
      mockSanitizeUrl.mockReturnValue('https://www.olx.com.br/imoveis');
      mockUrlExistsForUser.mockResolvedValue(true);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const addHandler = findHandler('adicionar');
      const msg = createMessage(12345);
      const matchArr = ['', 'adicionar', 'https://www.olx.com.br/imoveis'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/adicionar https://www.olx.com.br/imoveis' });

      await addHandler!(msg, match);

      expect(mockUrlExistsForUser).toHaveBeenCalledWith(12345, 'https://www.olx.com.br/imoveis');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Você já possui este link cadastrado.'
      );
      expect(mockCreateUserUrl).not.toHaveBeenCalled();
    });

    it('deve criar e confirmar quando URL é válida', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockResolvedValue(true);
      mockIsValidOlxUrl.mockReturnValue(true);
      mockSanitizeUrl.mockReturnValue('https://www.olx.com.br/imoveis');
      mockUrlExistsForUser.mockResolvedValue(false);
      mockCreateUserUrl.mockResolvedValue(42);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const addHandler = findHandler('adicionar');
      const msg = createMessage(12345);
      const matchArr = ['', 'adicionar', 'https://www.olx.com.br/imoveis'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/adicionar https://www.olx.com.br/imoveis' });

      await addHandler!(msg, match);

      expect(mockCreateUserUrl).toHaveBeenCalledWith(12345, 'https://www.olx.com.br/imoveis');
      expect(mockLoggerInfo).toHaveBeenCalledWith('User 12345 added URL: https://www.olx.com.br/imoveis');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '✅ Link adicionado com sucesso! ID: 42'
      );
    });

    it('deve enviar mensagem de erro quando ocorre exceção', async () => {
      mockTelegramToken = 'test-token-123';
      mockUserExists.mockRejectedValue(new Error('DB error'));
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const addHandler = findHandler('adicionar');
      const msg = createMessage(12345);
      const matchArr = ['', 'adicionar', 'https://www.olx.com.br/imoveis'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/adicionar https://www.olx.com.br/imoveis' });

      await addHandler!(msg, match);

      expect(mockLoggerError).toHaveBeenCalledWith('Error in /adicionar command: DB error');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Erro ao adicionar link. Tente novamente.'
      );
    });
  });

  describe('/listar command', () => {
    it('deve mostrar mensagem vazia quando não há URLs', async () => {
      mockTelegramToken = 'test-token-123';
      mockGetUserUrls.mockResolvedValue([]);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const listHandler = findHandler('listar');
      expect(listHandler).toBeDefined();

      const msg = createMessage(12345);

      await listHandler!(msg, null);

      expect(mockGetUserUrls).toHaveBeenCalledWith(12345);
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('📭 Você ainda não tem links cadastrados.')
      );
    });

    it('deve mostrar lista formatada quando há URLs', async () => {
      mockTelegramToken = 'test-token-123';
      mockGetUserUrls.mockResolvedValue([
        { id: 1, url: 'https://olx.com.br/busca1', isActive: 1, label: null },
        { id: 2, url: 'https://olx.com.br/busca2', isActive: 1, label: 'Minha busca' },
        { id: 3, url: 'https://olx.com.br/busca3', isActive: 0, label: null },
      ]);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const listHandler = findHandler('listar');
      const msg = createMessage(12345);

      await listHandler!(msg, null);

      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('📋 Seus links cadastrados:')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('ID: 1')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('ID: 2')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('Label: Minha busca')
      );
    });

    it('deve enviar mensagem de erro quando ocorre exceção', async () => {
      mockTelegramToken = 'test-token-123';
      mockGetUserUrls.mockRejectedValue(new Error('DB error'));
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const listHandler = findHandler('listar');
      const msg = createMessage(12345);

      await listHandler!(msg, null);

      expect(mockLoggerError).toHaveBeenCalledWith('Error in /listar command: DB error');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Erro ao listar links. Tente novamente.'
      );
    });
  });

  describe('/remover command', () => {
    it('deve chamar delete e confirmar sucesso', async () => {
      mockTelegramToken = 'test-token-123';
      mockDeleteUserUrl.mockResolvedValue(true);
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const removeHandler = findHandler('remover');
      expect(removeHandler).toBeDefined();

      const msg = createMessage(12345);
      const matchArr = ['', 'remover', '42'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/remover 42' });

      await removeHandler!(msg, match);

      expect(mockDeleteUserUrl).toHaveBeenCalledWith(42, 12345);
      expect(mockLoggerInfo).toHaveBeenCalledWith('User 12345 removed URL ID: 42');
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '✅ Link removido com sucesso!'
      );
    });

    it('deve enviar mensagem de erro quando delete falha', async () => {
      mockTelegramToken = 'test-token-123';
      mockDeleteUserUrl.mockRejectedValue(
        new Error('URL not found or you do not have permission')
      );
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const removeHandler = findHandler('remover');
      const msg = createMessage(12345);
      const matchArr = ['', 'remover', '99'];
      const match: RegExpMatch = Object.assign(matchArr, { index: 0, input: '/remover 99' });

      await removeHandler!(msg, match);

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Error in /remover command: URL not found or you do not have permission'
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        '❌ Erro ao remover link. Verifique se o ID está correto e se você possui este link.'
      );
    });
  });

  describe('/ajuda command', () => {
    it('deve enviar mensagem de ajuda', async () => {
      mockTelegramToken = 'test-token-123';
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      const helpHandler = findHandler('ajuda');
      expect(helpHandler).toBeDefined();

      const msg = createMessage(12345);

      await helpHandler!(msg, null);

      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('📖 Comandos disponíveis:')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('/start')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('/adicionar')
      );
    });
  });

  describe('polling_error handler', () => {
    it('deve registrar handler de polling_error', () => {
      mockTelegramToken = 'test-token-123';
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      // Verifica se o handler foi registrado
      const pollingErrorCall = mockOn.mock.calls.find(
        (call: [string, OnEventHandler]) => call[0] === 'polling_error'
      );
      expect(pollingErrorCall).toBeDefined();
      expect(typeof pollingErrorCall[1]).toBe('function');
    });

    it('deve logar erro de polling', () => {
      mockTelegramToken = 'test-token-123';
      
      const { initializeTelegramBot } = require('../../components/TelegramBot');
      initializeTelegramBot();

      // Encontrar o handler de polling_error
      const pollingErrorCall = mockOn.mock.calls.find(
        (call: [string, OnEventHandler]) => call[0] === 'polling_error'
      );
      expect(pollingErrorCall).toBeDefined();

      const errorHandler = pollingErrorCall[1] as OnEventHandler;
      errorHandler(new Error('Connection timeout'));

      expect(mockLoggerError).toHaveBeenCalledWith('Telegram bot polling error: Connection timeout');
    });
  });
});
