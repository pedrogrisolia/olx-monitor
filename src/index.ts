import config from './config';
import cron from 'node-cron';
import { initializeCycleTLS } from './components/CycleTls';
import { scraper } from './components/Scraper';
import { createTables } from './database/database';
import { initializeTelegramBot } from './components/TelegramBot';
import { logStartupUsersSummary } from "./components/StartupSummary";
import * as userUrlRepository from "./repositories/userUrlRepository";
import {
  applyExtractionWindowToCron,
  EXTRACTION_WINDOW_LABEL,
  isFiveFieldCronExpression,
  shouldRunScraperNow,
} from "./utils/scraperSchedule";

// Logger com interface mínima
interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string | Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require("./components/Logger");

/**
 * Executa o scraper para todas as URLs ativas dos usuários
 */
const runScraper = async (): Promise<void> => {
  // Guarda defensiva para chamadas manuais e fallback quando config.interval é inválido.
  // Em operação normal, o cron já restringe a execução à janela de extração.
  if (!shouldRunScraperNow()) {
    $logger.info(
      `Fora da janela de extração (${EXTRACTION_WINDOW_LABEL}). Execução do scraper ignorada.`,
    );
    return;
  }

  const userUrls = await userUrlRepository.getAllActiveUrls();

  if (userUrls.length === 0) {
    $logger.info("Nenhuma URL para monitorar. Adicione URLs via bot.");
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      $logger.error(errorMessage);
    }
  }
};

/**
 * Função principal de inicialização
 */
const main = async (): Promise<void> => {
  $logger.info("Program started");
  await createTables();
  try {
    await logStartupUsersSummary();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    $logger.error(
      "Falha ao gerar resumo inicial de usuários/URLs: " + errorMessage,
    );
  }
  await initializeCycleTLS();
  initializeTelegramBot();
  runScraper();
};

// Inicialização
main();

// Agendamento de execuções periódicas
const isValidCronExpression = isFiveFieldCronExpression(config.interval);
const scheduleExpression = isValidCronExpression
  ? applyExtractionWindowToCron(config.interval)
  : config.interval;
if (!isValidCronExpression) {
  $logger.warn(
    `Expressão cron inválida em config.interval: "${config.interval}". O agendamento será usado sem aplicar janela de extração no cron.`,
  );
}
$logger.info(
  `Agendamento do scraper: original="${config.interval}" aplicado="${scheduleExpression}" janela="${EXTRACTION_WINDOW_LABEL}"`,
);
cron.schedule(scheduleExpression, () => {
  runScraper();
});
