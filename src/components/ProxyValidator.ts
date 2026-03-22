import config from '../config';
import logger from './Logger';
import { getCycleTLSInstance } from './CycleTls';
import { requestsFingerprints } from '../requestsFingerprints';

const PROXY_HEALTHCHECK_URL = 'https://www.olx.com.br/';
const PROXY_HEALTHCHECK_TIMEOUT_MS = 15000;

const proxyValidationHeaders: Record<string, string> = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
};

let lastValidatedProxyUrl: string | null = null;

const assertProxyIsWorking = async (): Promise<void> => {
  const proxyUrl = config.olxProxyUrl?.trim();

  // Sem proxy configurado, segue fluxo normal
  if (!proxyUrl) {
    return;
  }

  // Evita validar novamente o mesmo proxy em cada URL/página
  if (lastValidatedProxyUrl === proxyUrl) {
    return;
  }

  const cycleTLS = getCycleTLSInstance();
  const randomRequestFingerprint =
    requestsFingerprints[Math.floor(Math.random() * requestsFingerprints.length)];

  try {
    const response = await cycleTLS(
      PROXY_HEALTHCHECK_URL,
      {
        userAgent: randomRequestFingerprint[0],
        ja3: randomRequestFingerprint[1],
        headers: proxyValidationHeaders,
        timeout: PROXY_HEALTHCHECK_TIMEOUT_MS,
        proxy: proxyUrl,
      },
      'get'
    );

    if (response.status < 200 || response.status >= 400) {
      throw new Error(`status HTTP ${response.status}`);
    }

    lastValidatedProxyUrl = proxyUrl;
    logger.info('Proxy configurado em OLX_PROXY_URL validado com sucesso.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Proxy configurado em OLX_PROXY_URL não está funcionando: ${errorMessage}`);
  }
};

export { assertProxyIsWorking };

// Mantém compatibilidade com require() CommonJS
module.exports = { assertProxyIsWorking };
