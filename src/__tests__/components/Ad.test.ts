/**
 * Testes unitários para Ad.ts
 * Testa processamento, validação e notificações de anúncios
 */

// Mocks devem ser declarados antes dos imports
jest.mock('../../components/Logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../components/Notifier', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../repositories/adRepository', () => ({
  getAd: jest.fn(),
  createAd: jest.fn().mockResolvedValue(undefined),
  updateAd: jest.fn().mockResolvedValue(true),
}));

import Ad from '../../components/Ad';
import * as notifier from '../../components/Notifier';
import * as adRepository from '../../repositories/adRepository';
import logger from '../../components/Logger';

describe('Ad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidAd', () => {
    it('deve retornar true para anúncio com todos os campos obrigatórios', () => {
      const ad = new Ad({
        id: 123,
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: true,
      });

      expect(ad.isValidAd()).toBe(true);
      expect(ad.valid).toBe(true);
    });

    it('deve retornar false para anúncio sem URL', () => {
      const ad = new Ad({
        id: 123,
        url: '',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: true,
      });

      expect(ad.isValidAd()).toBe(false);
      expect(ad.valid).toBe(false);
    });

    it('deve retornar false para anúncio sem ID', () => {
      const ad = new Ad({
        id: 0,
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: true,
      });

      expect(ad.isValidAd()).toBe(false);
      expect(ad.valid).toBe(false);
    });

    it('deve retornar false para anúncio com preço NaN', () => {
      const ad = new Ad({
        id: 123,
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: NaN,
        notify: true,
      });

      expect(ad.isValidAd()).toBe(false);
      expect(ad.valid).toBe(false);
    });
  });

  describe('process - anúncio inválido', () => {
    it('não deve gravar nem notificar para anúncio inválido', async () => {
      const ad = new Ad({
        id: 0, // ID inválido
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: true,
      });

      const result = await ad.process();

      expect(result).toBe(false);
      expect(adRepository.createAd).not.toHaveBeenCalled();
      expect(adRepository.getAd).not.toHaveBeenCalled();
      expect(notifier.sendNotification).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Ad not valid');
    });
  });

  describe('process - anúncio novo com notify=true', () => {
    it('deve chamar createAd e sendNotification para novo anúncio com notify true', async () => {
      // Mock getAd para rejeitar (anúncio não existe)
      (adRepository.getAd as jest.Mock).mockRejectedValue('No ad with this ID was found');

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 250000,
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.createAd).toHaveBeenCalledWith(ad);
      expect(notifier.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('🆕 Novo anúncio encontrado!'),
        '123456789'
      );
      expect(notifier.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('Casa Nova'),
        '123456789'
      );
    });

    it('não deve chamar sendNotification para novo anúncio com notify false', async () => {
      (adRepository.getAd as jest.Mock).mockRejectedValue('No ad with this ID was found');

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 250000,
        notify: false,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.createAd).toHaveBeenCalledWith(ad);
      expect(notifier.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('process - anúncio existente com queda de preço', () => {
    it('deve chamar updateAd e sendNotification para queda > 5%', async () => {
      // Mock getAd para retornar anúncio existente
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000, // Preço antigo
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 90000, // Preço novo (10% de queda)
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalledWith(ad);
      expect(notifier.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('📉 Preço baixou 10%!'),
        '123456789'
      );
    });

    it('deve atualizar preço sem notificar queda > 5% quando notify é false', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 90000,
        notify: false,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalledWith(ad);
      expect(notifier.sendNotification).not.toHaveBeenCalled();
    });

    it('deve chamar updateAd e sendNotification para queda de exatamente 6%', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 94000, // 6% de queda
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalled();
      expect(notifier.sendNotification).toHaveBeenCalled();
    });

    it('não deve notificar para queda <= 5%', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 95000, // 5% de queda (exatamente no limite)
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalledWith(ad);
      expect(notifier.sendNotification).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Price reduction of 5% is less than 5%')
      );
    });

    it('não deve notificar para queda de 3%', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 97000, // 3% de queda
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalled();
      expect(notifier.sendNotification).not.toHaveBeenCalled();
    });

    it('não deve notificar para aumento de preço', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 110000, // 10% de aumento
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).toHaveBeenCalled();
      expect(notifier.sendNotification).not.toHaveBeenCalled();
    });

    it('não deve fazer nada se o preço não mudou', async () => {
      (adRepository.getAd as jest.Mock).mockResolvedValue({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000,
        created: '2024-01-01',
        lastUpdate: '2024-01-01',
        userId: null,
      });

      const ad = new Ad({
        id: 12345,
        url: 'https://olx.com.br/anuncio/12345',
        title: 'Casa Nova',
        searchTerm: 'casa',
        price: 100000, // Mesmo preço
        notify: true,
        chatId: '123456789',
      });

      await ad.process();

      expect(adRepository.updateAd).not.toHaveBeenCalled();
      expect(notifier.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('deve inicializar propriedades corretamente', () => {
      const ad = new Ad({
        id: 123,
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: true,
        userId: 42,
        chatId: '987654321',
      });

      expect(ad.id).toBe(123);
      expect(ad.url).toBe('https://olx.com.br/anuncio/123');
      expect(ad.title).toBe('Apartamento Centro');
      expect(ad.searchTerm).toBe('apartamento');
      expect(ad.price).toBe(150000);
      expect(ad.notify).toBe(true);
      expect(ad.userId).toBe(42);
      expect(ad.chatId).toBe('987654321');
      expect(ad.valid).toBe(false);
      expect(ad.saved).toBeNull();
    });

    it('deve usar null para userId e chatId quando não fornecidos', () => {
      const ad = new Ad({
        id: 123,
        url: 'https://olx.com.br/anuncio/123',
        title: 'Apartamento Centro',
        searchTerm: 'apartamento',
        price: 150000,
        notify: false,
      });

      expect(ad.userId).toBeNull();
      expect(ad.chatId).toBeNull();
    });
  });
});
