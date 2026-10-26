// Cache LRU com TTL, em memória (por instância). Guarda a RESPOSTA gerada (answer + model) por até 1 h, sob uma chave que é um resumo SHA-256
// (ask-handler.js) da pergunta normalizada + idioma + contexto + trechos + versão do modelo: o texto da pergunta nunca fica guardado, nem em
// memória. `normalizeQuestion` (minúsculas, sem acentos, espaços colapsados) só serve para perguntas iguais caírem na mesma chave.

/** Chave de cache: minúsculas, sem acentos, só letras/dígitos separados por 1 espaço. */
export function normalizeQuestion(q) {
  return String(q)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function createCache({ maxEntries = 500, ttlMs = 60 * 60 * 1000, now = Date.now } = {}) {
  /** @type {Map<string, {valor:any, expira:number}>} (ordem de inserção = ordem de uso, do mais antigo ao mais recente) */
  const store = new Map();

  return {
    get(chave) {
      const e = store.get(chave);
      if (!e) return undefined;
      if (e.expira <= now()) {
        store.delete(chave);
        return undefined;
      }
      // LRU: reinsere como o mais recente
      store.delete(chave);
      store.set(chave, e);
      return e.valor;
    },
    set(chave, valor, ttl = ttlMs) {
      if (store.has(chave)) store.delete(chave);
      store.set(chave, { valor, expira: now() + ttl });
      while (store.size > maxEntries) {
        const maisAntigo = store.keys().next().value;
        store.delete(maisAntigo);
      }
    },
    delete: (chave) => store.delete(chave),
    clear: () => store.clear(),
    size: () => store.size,
    keys: () => [...store.keys()],
  };
}
