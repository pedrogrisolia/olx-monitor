import initCycleTLS from 'cycletls';

/**
 * Tipo para a instância CycleTLS
 * Inferido do retorno da função initCycleTLS
 */
type CycleTLSInstance = Awaited<ReturnType<typeof initCycleTLS>>;

/**
 * Instância singleton do CycleTLS
 */
let cycleTLSInstance: CycleTLSInstance | null = null;

/**
 * Inicializa a instância do CycleTLS
 * Deve ser chamado uma vez no início da aplicação
 */
async function initializeCycleTLS(): Promise<void> {
  cycleTLSInstance = await initCycleTLS();
}

/**
 * Encerra a instância do CycleTLS
 * Deve ser chamado ao encerrar a aplicação
 */
async function exitCycleTLS(): Promise<void> {
  if (cycleTLSInstance) {
    await cycleTLSInstance.exit();
  }
}

/**
 * Retorna a instância do CycleTLS
 * @throws Se a instância não foi inicializada
 */
function getCycleTLSInstance(): CycleTLSInstance {
  if (!cycleTLSInstance) {
    throw new Error('CycleTLS not initialized. Call initializeCycleTLS() first.');
  }
  return cycleTLSInstance;
}

export { initializeCycleTLS, getCycleTLSInstance, exitCycleTLS };

// Mantém compatibilidade com require() CommonJS
module.exports = {
  initializeCycleTLS,
  getCycleTLSInstance,
  exitCycleTLS,
};
