import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import * as userRepository from '../repositories/userRepository';
import * as userUrlRepository from '../repositories/userUrlRepository';
import { isValidOlxUrl, sanitizeUrl } from '../utils/urlValidator';

// Logger com interface mínima
interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('./Logger');

// Tipos para mensagens do Telegram
interface TelegramMessage {
  chat: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

// Instância do bot
let bot: TelegramBot | null = null;

/**
 * Inicializa o bot do Telegram e registra os handlers de comandos
 */
const initializeTelegramBot = (): void => {
  if (!config.telegramToken) {
    $logger.warn('Telegram token not configured. Bot will not be initialized.');
    return;
  }

  try {
    bot = new TelegramBot(config.telegramToken, { polling: true });
    $logger.info('Telegram bot initialized');

    // Comando /start
    bot.onText(/\/start/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const user = {
        id: chatId,
        username: msg.chat.username || null,
        firstName: msg.chat.first_name || null,
        lastName: msg.chat.last_name || null,
      };

      try {
        const exists = await userRepository.userExists(chatId);
        if (!exists) {
          await userRepository.createUser(user);
          $logger.info(`New user registered: ${chatId}`);
        }

        const welcomeMsg =
          '🎉 Olá! Sou o OLX Monitor Bot.\n\n' +
          'Use os seguintes comandos para gerenciar seus links de monitoramento:\n\n' +
          '/adicionar <url> - Adiciona um novo link para monitorar\n' +
          '/listar - Lista todos os seus links cadastrados\n' +
          '/remover <id> - Remove um link pelo ID\n' +
          '/ajuda - Mostra esta mensagem de ajuda';

        bot!.sendMessage(chatId, welcomeMsg);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        $logger.error('Error in /start command: ' + errorMessage);
        bot!.sendMessage(chatId, '❌ Erro ao processar comando. Tente novamente.');
      }
    });

    // Comando /adicionar ou /add
    bot.onText(/^\/(adicionar|add)\s+(.+)$/, async (msg: TelegramMessage, match: RegExpExecArray | null) => {
      const chatId = msg.chat.id;
      const url = match ? match[2] : '';

      if (!url) {
        bot!.sendMessage(
          chatId,
          '❌ Por favor, forneça uma URL.\nExemplo: /adicionar https://www.olx.com.br/imoveis/...'
        );
        return;
      }

      try {
        // Verifica se usuário existe
        const userExists = await userRepository.userExists(chatId);
        if (!userExists) {
          bot!.sendMessage(chatId, '❌ Por favor, use /start primeiro para se registrar.');
          return;
        }

        // Valida formato da URL
        if (!isValidOlxUrl(url)) {
          bot!.sendMessage(
            chatId,
            '❌ URL inválida. Use uma URL de busca do OLX.\n' +
              'Exemplo: https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro-e-regiao'
          );
          return;
        }

        // Sanitiza URL
        const sanitizedUrl = sanitizeUrl(url);

        // Verifica se usuário já tem esta URL
        const alreadyExists = await userUrlRepository.urlExistsForUser(chatId, sanitizedUrl);
        if (alreadyExists) {
          bot!.sendMessage(chatId, '❌ Você já possui este link cadastrado.');
          return;
        }

        // Salva no banco
        const urlId = await userUrlRepository.createUserUrl(chatId, sanitizedUrl);
        $logger.info(`User ${chatId} added URL: ${sanitizedUrl}`);

        bot!.sendMessage(chatId, `✅ Link adicionado com sucesso! ID: ${urlId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        $logger.error('Error in /adicionar command: ' + errorMessage);
        bot!.sendMessage(chatId, '❌ Erro ao adicionar link. Tente novamente.');
      }
    });

    // Comando /listar ou /list
    bot.onText(/\/listar|\/list/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;

      try {
        const urls = await userUrlRepository.getUserUrls(chatId);

        if (urls.length === 0) {
          bot!.sendMessage(
            chatId,
            '📭 Você ainda não tem links cadastrados.\n\nUse /adicionar <url> para adicionar um.'
          );
          return;
        }

        let message = '📋 Seus links cadastrados:\n\n';
        urls.forEach((url) => {
          const status = url.isActive ? '✅' : '❌';
          message += `${status} ID: ${url.id}\n`;
          if (url.label) {
            message += `   Label: ${url.label}\n`;
          }
          message += `   URL: ${url.url}\n\n`;
        });

        bot!.sendMessage(chatId, message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        $logger.error('Error in /listar command: ' + errorMessage);
        bot!.sendMessage(chatId, '❌ Erro ao listar links. Tente novamente.');
      }
    });

    // Comando /remover ou /remove
    bot.onText(/^\/(remover|remove)\s+(\d+)$/, async (msg: TelegramMessage, match: RegExpExecArray | null) => {
      const chatId = msg.chat.id;
      const urlId = match ? parseInt(match[2], 10) : 0;

      if (!urlId) {
        bot!.sendMessage(chatId, '❌ Por favor, forneça o ID do link.\nExemplo: /remover 1');
        return;
      }

      try {
        await userUrlRepository.deleteUserUrl(urlId, chatId);
        $logger.info(`User ${chatId} removed URL ID: ${urlId}`);
        bot!.sendMessage(chatId, '✅ Link removido com sucesso!');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        $logger.error('Error in /remover command: ' + errorMessage);
        bot!.sendMessage(
          chatId,
          '❌ Erro ao remover link. Verifique se o ID está correto e se você possui este link.'
        );
      }
    });

    // Comando /ajuda ou /help
    bot.onText(/\/ajuda|\/help/, async (msg: TelegramMessage) => {
      const chatId = msg.chat.id;
      const helpMsg =
        '📖 Comandos disponíveis:\n\n' +
        '/start - Inicia o bot e registra seu usuário\n' +
        '/adicionar <url> - Adiciona um novo link para monitorar\n' +
        '/listar - Lista todos os seus links cadastrados\n' +
        '/remover <id> - Remove um link pelo ID\n' +
        '/ajuda - Mostra esta mensagem de ajuda';

      bot!.sendMessage(chatId, helpMsg);
    });

    // Tratamento de erros
    bot.on('polling_error', (error: Error) => {
      $logger.error('Telegram bot polling error: ' + error.message);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    $logger.error('Error initializing Telegram bot: ' + errorMessage);
  }
};

export { initializeTelegramBot };

// Mantém compatibilidade com require() CommonJS
module.exports = { initializeTelegramBot };
