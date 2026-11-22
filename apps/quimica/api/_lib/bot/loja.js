// Loja do bot: o DataStore do SITE (web/src/quimica/js/data.js) lido do DISCO da função serverless. O pacote data/quimica/ vai junto da
// função pelo `includeFiles` do vercel.json; o `fetchFn` injetado só lê arquivos dessa pasta (molde: fetchDeDisco de web/test/support.mjs).
// A assinatura do manifesto é verificada no arranque, como no site: pacote sem assinatura válida não serve o bot.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { DataStore } from '../../../web/src/quimica/js/data.js';

export const DIR_PADRAO = new URL('../../../data/quimica/', import.meta.url);
export const BASE_BOT = 'https://bot.local/quimica/data/';

/** Pasta (URL ou caminho) como URL de diretório, com barra final. */
function dirUrl(dir) {
  const u = dir instanceof URL ? new URL(dir.href) : pathToFileURL(String(dir));
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  return u;
}

/** fetch que serve os arquivos do pacote em disco (ignora a query ?v=): 404 fora da base ou para arquivo ausente. */
export function fetchDoDisco(dir = DIR_PADRAO, base = BASE_BOT) {
  const raiz = dirUrl(dir);
  return async (url) => {
    const u = String(url).split('?')[0];
    if (!u.startsWith(base)) return new Response('fora do pacote', { status: 404 });
    try {
      const bytes = await readFile(new URL(u.slice(base.length), raiz));
      return new Response(bytes, { status: 200 });
    } catch {
      return new Response('não encontrado', { status: 404 });
    }
  };
}

/** DataStore iniciado a partir da pasta; lança se a assinatura do manifesto não for verificada. */
export async function criarStoreDoDisco({ dir = DIR_PADRAO } = {}) {
  const store = new DataStore({ baseUrl: BASE_BOT, fetchFn: fetchDoDisco(dir) });
  await store.iniciar();
  if (store.sig.estado !== 'verificada') throw new Error('assinatura do pacote não verificada');
  return store;
}

const memo = new Map();

/** Uma loja por pasta e por instância, reaproveitada entre invocações; uma promessa rejeitada é esquecida para a próxima chamada tentar de novo. */
export function storeDoDisco({ dir = DIR_PADRAO } = {}) {
  const chave = dirUrl(dir).href;
  if (!memo.has(chave)) {
    const p = criarStoreDoDisco({ dir });
    p.catch(() => memo.delete(chave));
    memo.set(chave, p);
  }
  return memo.get(chave);
}
