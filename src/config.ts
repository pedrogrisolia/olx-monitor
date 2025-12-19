import * as dotenv from 'dotenv';
import { Config } from './types';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Configuração principal da aplicação OLX Monitor
 */
const config: Config = {
  // URLs do OLX que você quer monitorar
  // Exemplo: 'https://sp.olx.com.br/sao-paulo-e-regiao/centro/celulares/iphone?cond=1&cond=2&pe=1600&ps=600&q=iphone'
  urls: [
    'https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro-e-regiao/itaborai-e-regiao/mage?pe=300000',
  ],

  // Intervalo de execução (formato cron)
  // Exemplo: '*/5 * * * *' = a cada 5 minutos
  // Ferramenta para criar intervalos: https://tool.crontap.com/cronjob-debugger
  interval: '*/5 * * * *',

  // Configurações do Telegram (opcionais, vindas do .env)
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
