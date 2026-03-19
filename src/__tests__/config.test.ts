import { Config } from '../types';

describe('config.ts', () => {
  // Store original env to restore after tests
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset modules to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('default values', () => {
    it('should have a default interval of "*/5 * * * *"', () => {
      const config: Config = require('../config.ts').default;
      expect(config.interval).toBe('*/5 * * * *');
    });

    it('should have a default dbFile of "../data/ads.db"', () => {
      const config: Config = require('../config.ts').default;
      expect(config.dbFile).toBe('../data/ads.db');
    });

    it('should have logger configuration with logFilePath and timestampFormat', () => {
      const config: Config = require('../config.ts').default;
      expect(config.logger).toBeDefined();
      expect(config.logger.logFilePath).toBe('../data/scrapper.log');
      expect(config.logger.timestampFormat).toBe('YYYY-MM-DD HH:mm:ss');
    });

    it('should have urls array', () => {
      const config: Config = require('../config.ts').default;
      expect(Array.isArray(config.urls)).toBe(true);
    });

    it('should have olxProxyUrl as undefined when OLX_PROXY_URL is not set', () => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      delete process.env.OLX_PROXY_URL;
      const config: Config = require('../config.ts').default;
      expect(config.olxProxyUrl).toBeUndefined();
    });
  });

  describe('proxy configuration from environment variable', () => {
    it('should include olxProxyUrl when OLX_PROXY_URL env var is set', () => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      process.env.OLX_PROXY_URL = 'http://user:pass@proxy.example.com:8080';
      const config: Config = require('../config.ts').default;
      expect(config.olxProxyUrl).toBe('http://user:pass@proxy.example.com:8080');
    });
  });

  describe('telegram configuration from environment variables', () => {
    it('should include telegramToken when TELEGRAM_TOKEN env var is set', () => {
      // Mock dotenv to do nothing (env already set manually)
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      process.env.TELEGRAM_TOKEN = 'test-token-123';
      const config: Config = require('../config.ts').default;
      expect(config.telegramToken).toBe('test-token-123');
    });

    it('should include telegramChatID when TELEGRAM_CHAT_ID env var is set', () => {
      // Mock dotenv to do nothing (env already set manually)
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      process.env.TELEGRAM_CHAT_ID = 'test-chat-id-456';
      const config: Config = require('../config.ts').default;
      expect(config.telegramChatID).toBe('test-chat-id-456');
    });

    it('should have both telegram values when both env vars are set', () => {
      // Mock dotenv to do nothing (env already set manually)
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      process.env.TELEGRAM_TOKEN = 'token-abc';
      process.env.TELEGRAM_CHAT_ID = 'chat-xyz';
      const config: Config = require('../config.ts').default;
      expect(config.telegramToken).toBe('token-abc');
      expect(config.telegramChatID).toBe('chat-xyz');
    });
  });

  describe('undefined telegram configuration', () => {
    it('should have telegramToken as undefined when TELEGRAM_TOKEN env var is not set', () => {
      // Mock dotenv to prevent loading from .env file
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      delete process.env.TELEGRAM_TOKEN;
      const config: Config = require('../config.ts').default;
      expect(config.telegramToken).toBeUndefined();
    });

    it('should have telegramChatID as undefined when TELEGRAM_CHAT_ID env var is not set', () => {
      // Mock dotenv to prevent loading from .env file
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      delete process.env.TELEGRAM_CHAT_ID;
      const config: Config = require('../config.ts').default;
      expect(config.telegramChatID).toBeUndefined();
    });

    it('should have both telegram values as undefined when neither env var is set', () => {
      // Mock dotenv to prevent loading from .env file
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      delete process.env.TELEGRAM_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
      const config: Config = require('../config.ts').default;
      expect(config.telegramToken).toBeUndefined();
      expect(config.telegramChatID).toBeUndefined();
    });
  });
});
