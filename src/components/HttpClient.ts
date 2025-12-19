import logger from './Logger';
import { getCycleTLSInstance } from './CycleTls';
import { requestsFingerprints } from '../requestsFingerprints';

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

  try {
    // Send request
    const response = await cycleTLS(
      url,
      {
        userAgent: randomRequestFingerprint[0],
        ja3: randomRequestFingerprint[1],
        headers,
      },
      'get'
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
