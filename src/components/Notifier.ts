import config from '../config';
import axios from 'axios';

/**
 * Envia uma notificação via Telegram Bot API
 * @param msg Mensagem a ser enviada
 * @param chatId ID do chat (opcional, usa config se não fornecido)
 * @returns Promise com a resposta do axios
 */
export const sendNotification = async (
  msg: string,
  chatId?: string | number | null
): Promise<ReturnType<typeof axios.get>> => {
  const targetChatId = chatId || config.telegramChatID;
  const apiUrl = `https://api.telegram.org/bot${config.telegramToken}/sendMessage?chat_id=${targetChatId}&text=`;
  const encodedMsg = encodeURIComponent(msg);
  return await axios.get(apiUrl + encodedMsg, { timeout: 5000 });
};

// Mantém compatibilidade com require() CommonJS
module.exports = { sendNotification };
