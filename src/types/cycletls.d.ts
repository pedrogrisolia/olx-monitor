/**
 * Declaração de tipos para cycletls
 * Esta biblioteca não possui tipos oficiais, então definimos os tipos mínimos usados.
 */

declare module 'cycletls' {
  /**
   * Opções de requisição para CycleTLS
   */
  interface CycleTLSRequestOptions {
    /** User-Agent para a requisição */
    userAgent: string;
    /** JA3 fingerprint TLS */
    ja3: string;
    /** Headers HTTP */
    headers: Record<string, string>;
    /** Corpo da requisição (opcional) */
    body?: string;
    /** Cookies (opcional) */
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
    /** Timeout em milissegundos (opcional) */
    timeout?: number;
    /** Desabilitar redirect (opcional) */
    disableRedirect?: boolean;
    /** Proxy (opcional) */
    proxy?: string;
  }

  /**
   * Resposta da requisição CycleTLS
   */
  interface CycleTLSResponse {
    /** Status HTTP */
    status: number;
    /** Corpo da resposta como string */
    body: string;
    /** Headers da resposta */
    headers: Record<string, string>;
    /** Cookies da resposta */
    cookies: Record<string, string>;
    /** URL final após redirects */
    finalUrl: string;
  }

  /**
   * Instância do cliente CycleTLS
   */
  interface CycleTLSClient {
    /**
     * Faz uma requisição HTTP
     * @param url URL para requisição
     * @param options Opções da requisição
     * @param method Método HTTP (get, post, etc)
     */
    (url: string, options: CycleTLSRequestOptions, method: string): Promise<CycleTLSResponse>;

    /**
     * Encerra a instância CycleTLS
     */
    exit(): Promise<void>;
  }

  /**
   * Inicializa uma nova instância CycleTLS
   */
  function initCycleTLS(): Promise<CycleTLSClient>;

  export = initCycleTLS;
}
