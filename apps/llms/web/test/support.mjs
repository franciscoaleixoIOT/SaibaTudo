// Apoio aos testes. Por padrão os testes usam o pacote de FIXTURE (web/test/fixtures/data-llms: ~360 palavras com vetores reais do GloVe,
// assinado com a chave de teste chave_teste.pem, que pode ficar no Git). DATA_DIR força outra pasta. Se existir o pacote real válido em
// data/llms, alguns testes também o usam (DADOS_REAIS).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
export const RAIZ = resolve(aqui, '../..');
export const FIXTURE = resolve(aqui, 'fixtures/data-llms');
export const DADOS = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : FIXTURE;
export const DADOS_REAIS = existsSync(resolve(RAIZ, 'data/llms/manifest.json')) && existsSync(resolve(RAIZ, 'data/llms/manifest.sig')) ? resolve(RAIZ, 'data/llms') : null;
export const BASE = 'http://teste.local/llms/data/';
/** Chave pública (SPKI em Base64) que assina a fixture. */
export const CHAVE_TESTE_B64 = readFileSync(resolve(aqui, 'fixtures/chave_teste_public.b64'), 'utf8').trim();

export const lerJson = (p, dir = DADOS) => JSON.parse(readFileSync(resolve(dir, p), 'utf8'));

/** fetch que serve os arquivos do pacote em disco (ignora a query ?v=). `contador` recebe os caminhos pedidos. */
export function fetchDeDisco(dir = DADOS, base = BASE, contador = null) {
  return async (url) => {
    const u = new URL(String(url), base);
    const rel = decodeURIComponent(u.pathname.slice(new URL(base).pathname.length));
    contador?.push(rel);
    const caminho = resolve(dir, ...rel.split('/'));
    if (!existsSync(caminho)) return new Response(null, { status: 404 });
    const bytes = readFileSync(caminho);
    return new Response(bytes, { status: 200, headers: { 'content-type': rel.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
  };
}

/** fetch de disco que troca o conteúdo de um arquivo (para testar hash/assinatura inválidos). */
export function fetchAdulterado(arquivo, bytes, dir = DADOS, base = BASE) {
  const normal = fetchDeDisco(dir, base);
  return async (url) => {
    const u = new URL(String(url), base);
    if (u.pathname.endsWith('/' + arquivo)) return new Response(bytes, { status: 200 });
    return normal(url);
  };
}
