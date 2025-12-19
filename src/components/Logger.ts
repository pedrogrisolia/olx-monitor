import config from '../config';
import * as SimpleNodeLogger from 'simple-node-logger';

/**
 * Interface para o logger
 */
interface LoggerInstance {
  info: (message: string) => void;
  debug: (message: string) => void;
  error: (message: string | Error) => void;
  warn: (message: string) => void;
}

/**
 * Instância do logger configurada
 * Usa simple-node-logger com as configurações do config
 */
const logger: LoggerInstance = SimpleNodeLogger.createSimpleLogger(config.logger);

export default logger;

// Mantém compatibilidade com require() CommonJS
module.exports = logger;
