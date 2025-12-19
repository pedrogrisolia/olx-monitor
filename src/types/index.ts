/**
 * Tipos de domínio e contratos internos para o OLX Monitor
 */

// =============================================================================
// Tipos JSON seguros
// =============================================================================

/**
 * Representa valores JSON primitivos seguros
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Representa um array JSON seguro
 */
export type JsonArray = JsonValue[];

/**
 * Representa um objeto JSON seguro
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Representa qualquer valor JSON válido (sem tipos não-seguros)
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// =============================================================================
// Configuração da aplicação
// =============================================================================

/**
 * Configuração do sistema de logging
 */
export interface LoggerConfig {
  logFilePath: string;
  timestampFormat: string;
}

/**
 * Configuração principal da aplicação
 */
export interface Config {
  /** URLs do OLX que serão monitoradas */
  urls: string[];
  /** Intervalo de execução em formato cron */
  interval: string;
  /** Token do bot Telegram (opcional) */
  telegramToken?: string;
  /** ID do chat Telegram (opcional) */
  telegramChatID?: string;
  /** Caminho para o arquivo do banco de dados SQLite */
  dbFile: string;
  /** Configuração do logger */
  logger: LoggerConfig;
}

// =============================================================================
// Rows do banco de dados (mapeamento do schema SQLite)
// =============================================================================

/**
 * Representa uma linha da tabela "ads"
 */
export interface AdRow {
  id: number;
  searchTerm: string;
  title: string;
  price: number;
  url: string;
  created: string;
  lastUpdate: string;
  userId: number | null;
}

/**
 * Representa uma linha da tabela "logs" (scrape logs)
 */
export interface ScrapeLogRow {
  id: number;
  url: string;
  adsFound: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  created: string;
}

/**
 * Representa uma linha da tabela "users"
 */
export interface UserRow {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  created: string;
}

/**
 * Representa uma linha da tabela "user_urls"
 */
export interface UserUrlRow {
  id: number;
  userId: number;
  url: string;
  label: string | null;
  isActive: number;
  created: string;
}

/**
 * Representa uma user_url com dados do join com users
 * (usado em getAllActiveUrls)
 */
export interface UserUrlWithChatId extends UserUrlRow {
  chatId: number;
}
