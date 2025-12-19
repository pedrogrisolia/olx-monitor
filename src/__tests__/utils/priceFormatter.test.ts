/**
 * Testes unitários para priceFormatter.js
 * Seguindo TDD: testes escritos primeiro
 */

const { formatPrice } = require('../../utils/priceFormatter');

describe('priceFormatter', () => {
  describe('formatPrice', () => {
    it('should format a simple price correctly', () => {
      expect(formatPrice(1500)).toBe('R$ 1.500');
    });

    it('should format a large price with thousands separator', () => {
      expect(formatPrice(1500000)).toBe('R$ 1.500.000');
    });

    it('should handle string number input', () => {
      expect(formatPrice('2500')).toBe('R$ 2.500');
    });

    it('should return "R$ 0" for null input', () => {
      expect(formatPrice(null)).toBe('R$ 0');
    });

    it('should return "R$ 0" for undefined input', () => {
      expect(formatPrice(undefined)).toBe('R$ 0');
    });

    it('should return "R$ 0" for NaN input', () => {
      expect(formatPrice(NaN)).toBe('R$ 0');
    });

    it('should return "R$ 0" for empty string', () => {
      expect(formatPrice('')).toBe('R$ 0');
    });

    it('should return "R$ 0" for non-numeric string', () => {
      expect(formatPrice('abc')).toBe('R$ 0');
    });

    it('should handle zero correctly', () => {
      expect(formatPrice(0)).toBe('R$ 0');
    });

    it('should truncate decimal values', () => {
      expect(formatPrice(1500.99)).toBe('R$ 1.500');
    });

    it('should handle negative numbers', () => {
      // parseInt vai converter, mas a função não tem validação específica
      const result = formatPrice(-100);
      expect(result).toBe('R$ -100');
    });

    it('should format small prices correctly', () => {
      expect(formatPrice(5)).toBe('R$ 5');
    });

    it('should format prices in hundreds', () => {
      expect(formatPrice(500)).toBe('R$ 500');
    });
  });
});
