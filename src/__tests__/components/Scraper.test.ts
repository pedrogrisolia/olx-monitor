/**
 * Testes unitários para Scraper.ts
 * Testa parsing de HTML, paginação e estatísticas
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

jest.mock('../../components/HttpClient', () => jest.fn());

jest.mock('../../repositories/scrapperRepository', () => ({
  saveLog: jest.fn().mockResolvedValue(undefined),
  getLogsByUrl: jest.fn(),
}));

jest.mock('../../repositories/adRepository', () => ({
  getAd: jest.fn().mockRejectedValue('No ad with this ID was found'),
  createAd: jest.fn().mockResolvedValue(undefined),
  updateAd: jest.fn().mockResolvedValue(true),
}));

import * as cheerio from 'cheerio';
import * as notifier from '../../components/Notifier';
import httpClient from '../../components/HttpClient';
import * as scraperRepository from '../../repositories/scrapperRepository';
import logger from '../../components/Logger';
import { scraper, scrapePage, extractTotalOfAds, setUrlParam } from '../../components/Scraper';

// Fixtures de HTML mínimas
const createHtmlWithNextData = (ads: Array<{ listId: number; subject: string; url: string; price?: string }>) => `
<!DOCTYPE html>
<html>
<head><title>OLX</title></head>
<body>
<script id="__NEXT_DATA__" type="application/json">
${JSON.stringify({
  props: {
    pageProps: {
      ads: ads
    }
  }
})}
</script>
</body>
</html>
`;

const createHtmlWithDataLayer = (totalOfAds: number) => `
<!DOCTYPE html>
<html>
<head><title>OLX</title></head>
<body>
<script id="datalayer">
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  "page": {
    "detail": {
      "totalOfAds": "${totalOfAds}"
    }
  }
});
</script>
<script id="__NEXT_DATA__" type="application/json">
${JSON.stringify({
  props: {
    pageProps: {
      ads: [
        { listId: 1, subject: 'Anúncio 1', url: 'https://olx.com.br/1', price: 'R$ 100.000' }
      ]
    }
  }
})}
</script>
</body>
</html>
`;

const createHtmlWithoutNextData = () => `
<!DOCTYPE html>
<html>
<head><title>OLX</title></head>
<body>
<div>Página sem dados</div>
</body>
</html>
`;

const createHtmlWithEmptyAds = () => `
<!DOCTYPE html>
<html>
<head><title>OLX</title></head>
<body>
<script id="__NEXT_DATA__" type="application/json">
${JSON.stringify({
  props: {
    pageProps: {
      ads: []
    }
  }
})}
</script>
</body>
</html>
`;

describe('Scraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTotalOfAds', () => {
    it('deve extrair totalOfAds do datalayer corretamente', () => {
      const html = createHtmlWithDataLayer(150);
      const $ = cheerio.load(html);

      const result = extractTotalOfAds($);

      expect(result).toBe(150);
    });

    it('deve retornar null quando datalayer não existe', () => {
      const html = createHtmlWithNextData([]);
      const $ = cheerio.load(html);

      const result = extractTotalOfAds($);

      expect(result).toBeNull();
    });

    it('deve retornar null quando datalayer não contém totalOfAds', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
        <script id="datalayer">
        window.dataLayer = window.dataLayer || [];
        dataLayer.push({
          "page": {
            "other": "data"
          }
        });
        </script>
        </body>
        </html>
      `;
      const $ = cheerio.load(html);

      const result = extractTotalOfAds($);

      expect(result).toBeNull();
    });
  });

  describe('scrapePage', () => {
    it('deve retornar false quando __NEXT_DATA__ está ausente', async () => {
      const html = createHtmlWithoutNextData();
      const $ = cheerio.load(html);

      const result = await scrapePage($, 'apartamento', true, 'https://olx.com.br/busca');

      expect(result).toBe(false);
    });

    it('deve retornar false quando lista de ads está vazia', async () => {
      const html = createHtmlWithEmptyAds();
      const $ = cheerio.load(html);

      const result = await scrapePage($, 'apartamento', true, 'https://olx.com.br/busca');

      expect(result).toBe(false);
    });

    it('deve retornar true quando existem anúncios para processar', async () => {
      const html = createHtmlWithNextData([
        { listId: 123, subject: 'Casa Centro', url: 'https://olx.com.br/123', price: 'R$ 200.000' },
        { listId: 456, subject: 'Apartamento', url: 'https://olx.com.br/456', price: 'R$ 150.000' },
      ]);
      const $ = cheerio.load(html);

      const result = await scrapePage($, 'imoveis', false, 'https://olx.com.br/busca');

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Checking new ads for: imoveis');
    });

    it('deve processar preços corretamente', async () => {
      const html = createHtmlWithNextData([
        { listId: 789, subject: 'Terreno', url: 'https://olx.com.br/789', price: 'R$ 50.000' },
      ]);
      const $ = cheerio.load(html);

      await scrapePage($, 'terreno', true, 'https://olx.com.br/busca');

      expect(logger.debug).toHaveBeenCalledWith('Checking ad: 1');
    });
  });

  describe('setUrlParam', () => {
    it('deve adicionar parâmetro de página à URL', () => {
      const url = 'https://www.olx.com.br/imoveis?pe=300000';
      const result = setUrlParam(url, 'o', 2);

      expect(result).toContain('o=2');
      expect(result).toContain('pe=300000');
    });

    it('deve substituir parâmetro existente', () => {
      const url = 'https://www.olx.com.br/imoveis?o=1&pe=300000';
      const result = setUrlParam(url, 'o', 5);

      expect(result).toContain('o=5');
      expect(result).not.toContain('o=1');
    });
  });

  describe('scraper - integração', () => {
    it('deve parar paginação quando __NEXT_DATA__ está ausente', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (httpClient as jest.Mock).mockResolvedValue(createHtmlWithoutNextData());

      await scraper('https://www.olx.com.br/imoveis?pe=300000');

      // Deve ter feito apenas 1 requisição
      expect(httpClient).toHaveBeenCalledTimes(1);
      // Não deve salvar log pois não há anúncios válidos
      expect(scraperRepository.saveLog).not.toHaveBeenCalled();
    });

    it('deve enviar notificação inicial na primeira execução com totalOfAds', async () => {
      // Simula primeira execução (URL não encontrada nos logs)
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([]);
      (httpClient as jest.Mock).mockResolvedValue(createHtmlWithDataLayer(50));

      await scraper({
        url: 'https://www.olx.com.br/imoveis?pe=300000',
        chatId: '123456789',
      });

      expect(notifier.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Foram encontrados 50 anúncios para essa busca'),
        '123456789'
      );
    });

    it('não deve enviar notificação inicial se não for primeira execução', async () => {
      // Simula URL já pesquisada antes
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (httpClient as jest.Mock)
        .mockResolvedValueOnce(createHtmlWithDataLayer(50))
        .mockResolvedValueOnce(createHtmlWithEmptyAds());

      await scraper({
        url: 'https://www.olx.com.br/imoveis?pe=300000',
        chatId: '123456789',
      });

      // Não deve ter chamado a notificação inicial (pode ter chamado outras)
      const calls = (notifier.sendNotification as jest.Mock).mock.calls;
      const initialNotificationCalls = calls.filter(
        (call: string[]) => call[0].includes('🔍 Foram encontrados')
      );
      expect(initialNotificationCalls.length).toBe(0);
    });

    it('deve processar anúncios e salvar log com estatísticas', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const htmlPage1 = createHtmlWithNextData([
        { listId: 1, subject: 'Casa 1', url: 'https://olx.com.br/1', price: 'R$ 100.000' },
        { listId: 2, subject: 'Casa 2', url: 'https://olx.com.br/2', price: 'R$ 200.000' },
      ]);
      const htmlPage2 = createHtmlWithEmptyAds();

      (httpClient as jest.Mock)
        .mockResolvedValueOnce(htmlPage1)
        .mockResolvedValueOnce(htmlPage2);

      await scraper('https://www.olx.com.br/imoveis?pe=300000');

      expect(scraperRepository.saveLog).toHaveBeenCalledWith({
        url: 'https://www.olx.com.br/imoveis?pe=300000',
        adsFound: 2,
        averagePrice: 150000,
        minPrice: 100000,
        maxPrice: 200000,
      });
    });

    it('deve suportar URL como string simples', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([]);
      (httpClient as jest.Mock).mockResolvedValue(createHtmlWithoutNextData());

      await scraper('https://www.olx.com.br/imoveis');

      expect(httpClient).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('First run for URL')
      );
    });

    it('deve suportar URL como objeto com metadados', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([]);
      (httpClient as jest.Mock).mockResolvedValue(createHtmlWithoutNextData());

      await scraper({
        url: 'https://www.olx.com.br/imoveis',
        userId: 42,
        chatId: '123456789',
      });

      expect(httpClient).toHaveBeenCalled();
    });

    it('deve tratar erro quando httpClient retorna undefined', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (httpClient as jest.Mock).mockResolvedValue(undefined);

      await scraper('https://www.olx.com.br/imoveis');

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch URL'));
    });
  });

  describe('scraper - logs de estatísticas', () => {
    it('deve logar preços máximo, mínimo e médio', async () => {
      (scraperRepository.getLogsByUrl as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const html = createHtmlWithNextData([
        { listId: 1, subject: 'Casa Barata', url: 'https://olx.com.br/1', price: 'R$ 50.000' },
        { listId: 2, subject: 'Casa Média', url: 'https://olx.com.br/2', price: 'R$ 100.000' },
        { listId: 3, subject: 'Casa Cara', url: 'https://olx.com.br/3', price: 'R$ 150.000' },
      ]);

      (httpClient as jest.Mock)
        .mockResolvedValueOnce(html)
        .mockResolvedValueOnce(createHtmlWithEmptyAds());

      await scraper('https://www.olx.com.br/imoveis');

      expect(logger.info).toHaveBeenCalledWith('Maximum price: 150000');
      expect(logger.info).toHaveBeenCalledWith('Minimum price: 50000');
      expect(logger.info).toHaveBeenCalledWith('Average price: 100000');
    });
  });
});
