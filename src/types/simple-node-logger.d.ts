/**
 * Declaração de tipos para simple-node-logger
 * Esta biblioteca não possui tipos oficiais, então definimos os tipos mínimos usados.
 */

declare module 'simple-node-logger' {
  /**
   * Opções do logger
   */
  interface LoggerOptions {
    logFilePath?: string;
    timestampFormat?: string;
    dateFormat?: string;
  }

  /**
   * Instância do logger
   */
  interface Logger {
    info: (message: string) => void;
    debug: (message: string) => void;
    error: (message: string | Error) => void;
    warn: (message: string) => void;
    fatal: (message: string) => void;
    trace: (message: string) => void;
    setLevel: (level: string) => void;
  }

  /**
   * Cria um logger simples
   * @param options Opções de configuração
   */
  function createSimpleLogger(options: LoggerOptions): Logger;

  /**
   * Cria um logger para arquivo rotativo
   * @param options Opções de configuração
   */
  function createRollingFileLogger(options: LoggerOptions): Logger;

  export { createSimpleLogger, createRollingFileLogger, Logger, LoggerOptions };
}
