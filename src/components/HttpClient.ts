import logger from './Logger';
import { getCycleTLSInstance } from './CycleTls';
import { requestsFingerprints } from '../requestsFingerprints';
import config from '../config';
import { withTimeout } from '../utils/withTimeout';

/** Timeout da requisição no processo Go do CycleTLS (em segundos) */
const REQUEST_TIMEOUT_SECONDS = 30;

/** Guarda no lado do Node caso a resposta do CycleTLS nunca chegue */
const REQUEST_HARD_TIMEOUT_MS = 60_000;

/**
 * Headers padrão para as requisições HTTP
 * Simula um navegador real para evitar detecção
 */
const headers: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
};

/**
 * Cliente HTTP que usa CycleTLS para evitar detecção de bots
 * @param url URL para fazer a requisição
 * @returns Corpo da resposta HTML
 */
const httpClient = async (url: string): Promise<string | undefined> => {
  const cycleTLS = getCycleTLSInstance();

  const randomRequestFingerprint =
    requestsFingerprints[Math.floor(Math.random() * requestsFingerprints.length)];

  const proxyUrl = config.olxProxyUrl?.trim();

  try {
    // Send request
    const response = await withTimeout(
      cycleTLS(
        url,
        {
          userAgent: randomRequestFingerprint[0],
          ja3: randomRequestFingerprint[1],
          headers,
          timeout: REQUEST_TIMEOUT_SECONDS,
          ...(proxyUrl ? { proxy: proxyUrl } : {}),
        },
        'get'
      ),
      REQUEST_HARD_TIMEOUT_MS,
      `GET ${url}`
    );

    return response.body;
  } catch (error) {
    logger.error(error as Error);
    return undefined;
  }
};

export default httpClient;

// Mantém compatibilidade com require() CommonJS
module.exports = httpClient;
