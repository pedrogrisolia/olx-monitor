import config from './config';
import cron from 'node-cron';
import { initializeCycleTLS } from './components/CycleTls';
import { scraper } from './components/Scraper';
import { createTables } from './database/database';
import { initializeTelegramBot } from './components/TelegramBot';
import * as userUrlRepository from './repositories/userUrlRepository';

// Logger com interface mínima
interface Logger {
  info: (message: string) => void;
  error: (message: string | Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('./components/Logger');

/**
 * Executa o scraper para todas as URLs ativas dos usuários
 */
const runScraper = async (): Promise<void> => {
  const userUrls = await userUrlRepository.getAllActiveUrls();

  if (userUrls.length === 0) {
    $logger.info('Nenhuma URL para monitorar. Adicione URLs via bot.');
    return;
  }

  for (const urlInfo of userUrls) {
    try {
      await scraper({
        url: urlInfo.url,
        userId: urlInfo.userId,
        chatId: urlInfo.chatId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      $logger.error(errorMessage);
    }
  }
};

/**
 * Função principal de inicialização
 */
const main = async (): Promise<void> => {
  $logger.info('Program started');
  await createTables();
  await initializeCycleTLS();
  initializeTelegramBot();
  runScraper();
};

// Inicialização
main();

// Agendamento de execuções periódicas
cron.schedule(config.interval, () => {
  runScraper();
});
