/**
 * Testes unitários para urlValidator.js
 * Seguindo TDD: testes escritos primeiro
 */

// Mock do Logger para evitar dependência externa nos testes
jest.mock('../../components/Logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock do axios para testes de verifyUrlAccessible
jest.mock('axios');

const { isValidOlxUrl, sanitizeUrl, verifyUrlAccessible } = require('../../utils/urlValidator');
const axios = require('axios');

describe('urlValidator', () => {
  describe('isValidOlxUrl', () => {
    it('should return true for valid OLX search URL', () => {
      const url = 'https://www.olx.com.br/imoveis/estado-rj';
      expect(isValidOlxUrl(url)).toBe(true);
    });

    it('should return true for valid OLX URL with query params', () => {
      const url = 'https://www.olx.com.br/imoveis/estado-rj?pe=300000';
      expect(isValidOlxUrl(url)).toBe(true);
    });

    it('should return true for OLX URL without www', () => {
      const url = 'https://olx.com.br/imoveis/estado-rj';
      expect(isValidOlxUrl(url)).toBe(true);
    });

    it('should return false for HTTP (non-HTTPS) URL', () => {
      const url = 'http://www.olx.com.br/imoveis/estado-rj';
      expect(isValidOlxUrl(url)).toBe(false);
    });

    it('should return false for non-OLX domain', () => {
      const url = 'https://www.mercadolivre.com.br/imoveis';
      expect(isValidOlxUrl(url)).toBe(false);
    });

    it('should return false for individual ad URL (too many path segments)', () => {
      // URLs com mais de 5 segmentos são consideradas de anúncios individuais
      const url = 'https://www.olx.com.br/imoveis/estado/cidade/bairro/tipo/anuncio/123456';
      expect(isValidOlxUrl(url)).toBe(false);
    });

    it('should return false for invalid URL format', () => {
      const url = 'not-a-valid-url';
      expect(isValidOlxUrl(url)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidOlxUrl('')).toBe(false);
    });

    it('should return true for URL with 5 or fewer path segments', () => {
      const url = 'https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro/zona-sul';
      expect(isValidOlxUrl(url)).toBe(true);
    });

    it('should handle URL with trailing slash', () => {
      const url = 'https://www.olx.com.br/imoveis/estado-rj/';
      expect(isValidOlxUrl(url)).toBe(true);
    });
  });

  describe('sanitizeUrl', () => {
    it('should remove UTM parameters', () => {
      const url = 'https://www.olx.com.br/imoveis?utm_source=google&utm_medium=cpc';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis');
    });

    it('should remove fbclid parameter', () => {
      const url = 'https://www.olx.com.br/imoveis?fbclid=abc123';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis');
    });

    it('should remove gclid parameter', () => {
      const url = 'https://www.olx.com.br/imoveis?gclid=xyz789';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis');
    });

    it('should preserve non-tracking parameters', () => {
      const url = 'https://www.olx.com.br/imoveis?pe=300000&ps=100000';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis?pe=300000&ps=100000');
    });

    it('should remove only tracking params and keep others', () => {
      const url = 'https://www.olx.com.br/imoveis?pe=300000&utm_source=google&ps=100000';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis?pe=300000&ps=100000');
    });

    it('should return original URL if invalid', () => {
      const url = 'not-a-valid-url';
      const result = sanitizeUrl(url);
      expect(result).toBe('not-a-valid-url');
    });

    it('should remove ref parameter', () => {
      const url = 'https://www.olx.com.br/imoveis?ref=homepage';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis');
    });

    it('should remove campaign parameter', () => {
      const url = 'https://www.olx.com.br/imoveis?campaign=summer2024';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://www.olx.com.br/imoveis');
    });
  });

  describe('verifyUrlAccessible', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true for accessible URL', async () => {
      (axios.head as jest.Mock).mockResolvedValue({ status: 200 });
      
      const result = await verifyUrlAccessible('https://www.olx.com.br/imoveis');
      
      expect(result).toBe(true);
      expect(axios.head).toHaveBeenCalledWith(
        'https://www.olx.com.br/imoveis',
        expect.objectContaining({
          timeout: 10000,
          maxRedirects: 5
        })
      );
    });

    it('should return false for inaccessible URL', async () => {
      (axios.head as jest.Mock).mockRejectedValue(new Error('Network Error'));
      
      const result = await verifyUrlAccessible('https://www.olx.com.br/imoveis');
      
      expect(result).toBe(false);
    });

    it('should return true for 3xx redirect responses', async () => {
      (axios.head as jest.Mock).mockResolvedValue({ status: 301 });
      
      const result = await verifyUrlAccessible('https://www.olx.com.br/imoveis');
      
      expect(result).toBe(true);
    });

    it('should handle timeout errors', async () => {
      (axios.head as jest.Mock).mockRejectedValue(new Error('Timeout'));
      
      const result = await verifyUrlAccessible('https://www.olx.com.br/imoveis');
      
      expect(result).toBe(false);
    });
  });
});
