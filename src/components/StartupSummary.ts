import * as userRepository from '../repositories/userRepository';
import * as userUrlRepository from '../repositories/userUrlRepository';

// Logger com interface mínima
interface Logger {
  info: (message: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger: Logger = require('./Logger');

/**
 * Imprime um resumo de usuários e URLs cadastradas no startup da aplicação
 */
const logStartupUsersSummary = async (): Promise<void> => {
  const users = await userRepository.getAllUsers();

  $logger.info(`Usuários cadastrados: ${users.length}`);

  let totalUrls = 0;

  for (const user of users) {
    const userUrls = await userUrlRepository.getUserUrls(user.id);
    const urlsCount = userUrls.length;
    totalUrls += urlsCount;

    const userIdentifier = user.username ? `@${user.username}` : `ID ${user.id}`;
    $logger.info(`- ${userIdentifier}: ${urlsCount} URL(s) cadastrada(s)`);
  }

  $logger.info(`Total de URLs cadastradas: ${totalUrls}`);
};

export { logStartupUsersSummary };

// Mantém compatibilidade com require() CommonJS
module.exports = { logStartupUsersSummary };
