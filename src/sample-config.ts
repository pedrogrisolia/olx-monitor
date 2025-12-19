import * as dotenv from 'dotenv';
import { Config } from './types';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Arquivo de configuração de exemplo para o OLX Monitor
 * Copie este arquivo para config.ts e edite conforme suas necessidades
 *
 * Ferramenta para criar intervalos cron: https://tool.crontap.com/cronjob-debugger
 */
const config: Config = {
  // URLs do OLX que você quer monitorar
  // Substitua pelos links de busca que você deseja acompanhar
  urls: [
    'url1',
    'url2',
  ],

  // Intervalo de execução (formato cron)
  // Exemplo: '*/5 * * * *' = a cada 5 minutos
  interval: '*/5 * * * *',

  // Configurações do Telegram (vindas do .env)
  telegramToken: process.env.TELEGRAM_TOKEN,
  telegramChatID: process.env.TELEGRAM_CHAT_ID,

  // Caminho para o arquivo do banco de dados
  dbFile: '../data/ads.db',

  // Configuração do logger
  logger: {
    logFilePath: '../data/scrapper.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss',
  },
};

export default config;
