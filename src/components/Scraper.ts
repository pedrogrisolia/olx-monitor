import * as cheerio from 'cheerio';
import logger from './Logger';
import httpClient from './HttpClient';
import * as scraperRepository from '../repositories/scrapperRepository';
import * as notifier from './Notifier';
import Ad from './Ad';

/**
 * Limite máximo de anúncios por busca
 */
const MAX_ADS_PER_SEARCH = 500;

/**
 * Variáveis de estado do scraper (resetadas a cada URL)
 */
let page = 1;
let maxPrice = 0;
let minPrice = 99999999;
let sumPrices = 0;
let validAds = 0;
let adsFound = 0;
let nextPage = true;
let maxAdsLimit = MAX_ADS_PER_SEARCH;
let totalOfAds: number | null = null;
let currentUrl: string = '';

/**
 * Informação de URL para o scraper
 * Pode ser uma string simples ou objeto com metadados
 */
interface UrlInfo {
  url: string;
  userId?: number | null;
  chatId?: string | number | null;
}

/**
 * Função principal do scraper
 * Processa uma URL de busca do OLX e extrai anúncios
 * @param urlInfo URL ou objeto com URL e metadados
 */
const scraper = async (urlInfo: string | UrlInfo): Promise<void> => {
  // Reset state variables
  page = 1;
  maxPrice = 0;
  minPrice = 99999999;
  sumPrices = 0;
  adsFound = 0;
  validAds = 0;
  nextPage = true;
  maxAdsLimit = MAX_ADS_PER_SEARCH;
  totalOfAds = null;

  // Suporta tanto string simples quanto objeto
  const url = typeof urlInfo === 'string' ? urlInfo : urlInfo.url;
  const userId = typeof urlInfo === 'object' ? urlInfo.userId : null;
  const chatId = typeof urlInfo === 'object' ? urlInfo.chatId : null;

  const parsedUrl = new URL(url);
  const searchTerm = parsedUrl.searchParams.get('q') || '';
  const notify = await urlAlreadySearched(url);
  if (!notify) {
    logger.info(`First run for URL ${url} - notifications disabled`);
  } else {
    logger.info(`URL ${url} already processed - notifications enabled`);
  }

  do {
    currentUrl = setUrlParam(url, 'o', page);
    let response: string | undefined;
    try {
      response = await httpClient(currentUrl);
      if (!response) {
        logger.error('Failed to fetch URL: ' + currentUrl);
        return;
      }
      const $ = cheerio.load(response);

      // Extrair totalOfAds apenas na primeira iteração
      if (page === 1) {
        const totalAds = extractTotalOfAds($);
        if (totalAds) {
          totalOfAds = totalAds;
          // Usa MAX_ADS_PER_SEARCH se totalOfAds for maior que o limite
          maxAdsLimit = totalAds > MAX_ADS_PER_SEARCH ? MAX_ADS_PER_SEARCH : totalAds;
          logger.info(`Total ads found: ${totalOfAds}, using limit: ${maxAdsLimit}`);

          // Notificar se for primeira execução e houver totalOfAds
          if (!notify && totalOfAds) {
            const msg = `🔍 Foram encontrados ${totalOfAds} anúncios para essa busca.\n\nVocê será notificado sempre que aparecer novos anúncios ou algum anúncio cair de preço.`;
            try {
              await notifier.sendNotification(msg, chatId);
            } catch (error) {
              logger.error('Could not send initial notification: ' + error);
            }
          }
        }
      }

      nextPage = await scrapePage($, searchTerm, notify, url, userId, chatId);

      // Para se atingiu o limite de anúncios válidos
      if (validAds >= maxAdsLimit) {
        logger.info(`Limit of ${maxAdsLimit} valid ads reached. Stopping search.`);
        nextPage = false;
      }
    } catch (error) {
      logger.error(error as Error);
      return;
    }
    page++;
  } while (nextPage);

  logger.info('Valid ads: ' + validAds);

  if (validAds) {
    const averagePrice = sumPrices / validAds;

    logger.info('Maximum price: ' + maxPrice);
    logger.info('Minimum price: ' + minPrice);
    logger.info('Average price: ' + sumPrices / validAds);

    const scrapperLog = {
      url,
      adsFound: validAds,
      averagePrice,
      minPrice,
      maxPrice,
    };

    await scraperRepository.saveLog(scrapperLog);
  }
};

/**
 * Processa uma página de resultados do OLX
 * @param $ Instância do Cheerio carregada com o HTML
 * @param searchTerm Termo de busca
 * @param notify Se deve notificar sobre novos anúncios
 * @param url URL original da busca
 * @param userId ID do usuário (opcional)
 * @param chatId ID do chat para notificações (opcional)
 * @returns true se há mais páginas, false caso contrário
 */
const scrapePage = async (
  $: cheerio.CheerioAPI,
  searchTerm: string,
  notify: boolean,
  url: string,
  userId: number | null = null,
  chatId: string | number | null = null
): Promise<boolean> => {
  try {
    const script = $('script[id="__NEXT_DATA__"]').text();

    if (!script) {
      return false;
    }

    const parsedData = JSON.parse(script) as {
      props: {
        pageProps: {
          ads: Array<{
            listId: number;
            subject: string;
            url: string;
            price?: string;
          }>;
        };
      };
    };

    const adList = parsedData.props.pageProps.ads;

    if (!Array.isArray(adList) || !adList.length) {
      return false;
    }

    adsFound += adList.length;

    logger.info(`Checking new ads for: ${searchTerm}`);
    logger.info('Ads found: ' + adsFound);

    for (let i = 0; i < adList.length; i++) {
      // Para se atingiu o limite de anúncios válidos
      if (validAds >= maxAdsLimit) {
        break;
      }

      logger.debug('Checking ad: ' + (i + 1));

      const advert = adList[i];
      const title = advert.subject;
      const id = advert.listId;
      const adUrl = advert.url;
      const price = parseInt(advert.price?.replace('R$ ', '')?.replace('.', '') || '0');

      const result = {
        id,
        url: adUrl,
        title,
        searchTerm,
        price,
        notify,
        userId,
        chatId,
      };

      const ad = new Ad(result);
      // IMPORTANTE: Mantém o comportamento original de não aguardar ad.process()
      ad.process();

      if (ad.valid) {
        validAds++;
        minPrice = checkMinPrice(ad.price, minPrice);
        maxPrice = checkMaxPrice(ad.price, maxPrice);
        sumPrices += ad.price;
      }
    }

    return true;
  } catch (error) {
    logger.error(error as Error);
    throw new Error('Scraping failed');
  }
};

/**
 * Verifica se a URL já foi pesquisada anteriormente
 * @param url URL para verificar
 * @returns true se já foi pesquisada (deve notificar), false se é primeira execução
 */
const urlAlreadySearched = async (url: string): Promise<boolean> => {
  try {
    const ad = await scraperRepository.getLogsByUrl(url, 1);
    if (ad.length) {
      return true;
    }
    logger.info('First run, no notifications');
    return false;
  } catch (error) {
    logger.error(error as Error);
    return false;
  }
};

/**
 * Define um parâmetro na URL
 * @param url URL base
 * @param param Nome do parâmetro
 * @param value Valor do parâmetro
 * @returns URL modificada
 */
const setUrlParam = (url: string, param: string, value: number): string => {
  const newUrl = new URL(url);
  const searchParams = newUrl.searchParams;
  searchParams.set(param, String(value));
  newUrl.search = searchParams.toString();
  return newUrl.toString();
};

/**
 * Verifica e retorna o menor preço
 */
const checkMinPrice = (price: number, currentMin: number): number => {
  if (price < currentMin) return price;
  else return currentMin;
};

/**
 * Verifica e retorna o maior preço
 */
const checkMaxPrice = (price: number, currentMax: number): number => {
  if (price > currentMax) return price;
  else return currentMax;
};

/**
 * Extrai o total de anúncios do dataLayer da página
 * @param $ Instância do Cheerio carregada com o HTML
 * @returns Número total de anúncios ou null se não encontrado
 */
const extractTotalOfAds = ($: cheerio.CheerioAPI): number | null => {
  try {
    const dataLayerScript = $('script[id="datalayer"]').text();
    if (!dataLayerScript) {
      return null;
    }

    // Extrair o JSON do dataLayer
    // O script contém: window.dataLayer = window.dataLayer || []; dataLayer.push({...})
    // Precisamos extrair o objeto dentro do push()
    const pushIndex = dataLayerScript.indexOf('dataLayer.push(');
    if (pushIndex === -1) {
      return null;
    }

    // Encontrar o início do objeto JSON (primeira chave após push()
    const startIndex = dataLayerScript.indexOf('{', pushIndex);
    if (startIndex === -1) {
      return null;
    }

    // Encontrar o final do objeto JSON contando chaves abertas/fechadas
    let braceCount = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < dataLayerScript.length; i++) {
      if (dataLayerScript[i] === '{') braceCount++;
      if (dataLayerScript[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (braceCount !== 0) {
      return null;
    }

    const jsonString = dataLayerScript.substring(startIndex, endIndex);
    const dataLayerData = JSON.parse(jsonString) as {
      page?: {
        detail?: {
          totalOfAds?: string | number;
        };
      };
    };
    const totalAdsValue = dataLayerData?.page?.detail?.totalOfAds;

    return totalAdsValue ? parseInt(String(totalAdsValue)) : null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.debug('Could not extract totalOfAds from datalayer: ' + errorMessage);
    return null;
  }
};

// Exporta para TypeScript
export { scraper, scrapePage, urlAlreadySearched, setUrlParam, extractTotalOfAds };

// Mantém compatibilidade com require() CommonJS
module.exports = {
  scraper,
  scrapePage,
  urlAlreadySearched,
  setUrlParam,
  extractTotalOfAds,
};
