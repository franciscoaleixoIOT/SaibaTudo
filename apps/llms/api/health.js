// GET /api/health — verificação de saúde (sem segredos e sem chamar o Hugging Face: não gera custo).
//   Saída: { ok:true, version, model, ask:"on"|"off", shared:"on"|"off", data:{version, generatedAt, packageAgeDays, palavras}|null, time }
// "ask":"off" = kill switch ativo (o cliente mostra a nuvem como indisponível). `data` descreve o PACOTE DE DADOS publicado: lido de
// data/llms/manifest.json quando o arquivo vai junto da função (vercel.json `includeFiles`) ou buscado no próprio site em até 2 s.
import { readFile } from 'node:fs/promises';
import { askAtivo, readConfig } from './_lib/config.js';
import { lerConfigCompartilhado } from './_lib/compartilhado.js';
import { json, origemPermitida, toNodeHandler } from './_lib/http.js';

const TIMEOUT_DADOS_MS = 2000;
const MANIFESTO_LOCAL = new URL('../data/llms/manifest.json', import.meta.url);
const CAMINHO_PUBLICO = '/llms/data/manifest.json';

function resumir(m, now) {
  const gerado = Date.parse(m?.generatedAt);
  return {
    version: typeof m?.version === 'string' ? m.version : null,
    generatedAt: typeof m?.generatedAt === 'string' ? m.generatedAt : null,
    packageAgeDays: Number.isNaN(gerado) ? null : Math.max(0, Math.floor((now() - gerado) / 86_400_000)),
    palavras: Number.isInteger(m?.vetores?.palavras) ? m.vetores.palavras : null,
  };
}

/** Resumo do manifesto publicado, ou null. Só consulta o PRÓPRIO site (origem permitida): nunca um host escolhido pelo cliente. */
export async function lerDadosPublicados(request, cfg, { readFileFn = (u) => readFile(u, 'utf8'), fetchFn = (...a) => globalThis.fetch(...a), now = () => Date.now() } = {}) {
  try {
    return resumir(JSON.parse(await readFileFn(MANIFESTO_LOCAL)), now);
  } catch { /* arquivo não empacotado: tenta o site */ }
  let alvo;
  try {
    const origem = new URL(request.url).origin;
    const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem);
    if (!local && !origemPermitida(origem, cfg.allowedOrigins)) return null;
    alvo = new URL(CAMINHO_PUBLICO, origem);
  } catch { return null; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_DADOS_MS);
  try {
    const r = await fetchFn(alvo, { signal: ctl.signal, headers: { accept: 'application/json' } });
    return r.ok ? resumir(await r.json(), now) : null;
  } catch { return null; } finally { clearTimeout(timer); }
}

export async function handleHealth(request, env = process.env, deps = {}) {
  if (request.method === 'OPTIONS') return json(204, null, { Allow: 'GET, HEAD, OPTIONS' });
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'GET, HEAD' });
  const cfg = readConfig(env);
  const data = deps.semDados ? null : await lerDadosPublicados(request, cfg, deps);
  return json(200, {
    ok: true,
    version: cfg.version,
    model: cfg.askModelVersion,
    ask: askAtivo(cfg) ? 'on' : 'off',
    shared: lerConfigCompartilhado(env).ativo ? 'on' : 'off',
    data,
    time: new Date().toISOString(),
  });
}

export default toNodeHandler((request) => handleHealth(request), { maxBodyBytes: 0 });

export const config = { maxDuration: 5 };
