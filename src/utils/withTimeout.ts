/**
 * Rejeita se a promise não resolver em `ms` milissegundos.
 *
 * O CycleTLS já tem um timeout próprio no processo Go, mas a Promise do lado
 * do Node pode nunca resolver quando a resposta se perde no websocket. Sem esta
 * guarda, uma única requisição perdida trava o ciclo do scraper para sempre.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label}: sem resposta após ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

export { withTimeout };

// Mantém compatibilidade com require() CommonJS
module.exports = { withTimeout };
