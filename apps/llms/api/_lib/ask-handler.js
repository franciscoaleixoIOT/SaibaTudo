// Núcleo do POST /api/ask (Request/Response padrão): explicação gerada, ANCORADA no contexto do gráfico e nos trechos das seções que o app
// enviou. Provedor único no S1: Space privado do Hugging Face (ZeroGPU). A resposta só sai se passar no verificador (fidelidade.js).
// O TEXTO DA PERGUNTA E A RESPOSTA NUNCA SÃO REGISTRADOS em log. Porte do ask-handler.js da química, sem Modal e sem segurança química.
import { createHash } from 'node:crypto';
import { askAtivo, readConfig } from './config.js';
import { createSharedLimiter, orcamentoComCompartilhado } from './compartilhado.js';
import { temDadoPessoal } from './dadopessoal.js';
import { verificarFidelidade } from './fidelidade.js';
import { avaliarCors, clientIp, json, readJsonBody } from './http.js';
import { createCache, normalizeQuestion } from './cache.js';
import { createDailyBudget, createSlidingWindow, JANELAS } from './ratelimit.js';
import { MAX_ASK_BODY_BYTES, validateAskBody } from './validate.js';

export function defaultLog(evento) {
  // Whitelist de campos: status, latência, cache, client, motivo — nunca pergunta, resposta, IP ou iid.
  const { evt, status, ms, cache, client, err, provider } = evento;
  console.log(JSON.stringify({ evt, status, ms, cache, client, err, provider }));
}

/** Estado em memória da instância (limitadores, orçamento, cache, requisições em andamento). */
const resumo = (texto) => createHash('sha256').update(String(texto)).digest('hex');

export function createAskState({ now = Date.now, cacheMax = 500, cacheTtlMs = 3600_000, shared = null } = {}) {
  const compartilhado = shared ?? createSharedLimiter({ now });
  return {
    shared: compartilhado,
    ipWindow: createSlidingWindow({ windowMs: JANELAS.MINUTO, now }),
    iidWindow: createSlidingWindow({ windowMs: JANELAS.DIA, now }),
    budgetHf: orcamentoComCompartilhado(createDailyBudget({ now }), compartilhado, 'ask-hf'),
    cache: createCache({ maxEntries: cacheMax, ttlMs: cacheTtlMs, now }),
    inflight: new Map(),
  };
}

const RX_EVENT_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Último evento "complete"/"error" de uma resposta SSE do Gradio: { evento, dado } ou null. */
export function lerSseGradio(texto) {
  let evento = null;
  let achado = null;
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    if (linha.startsWith('event:')) evento = linha.slice(6).trim();
    else if (linha.startsWith('data:') && (evento === 'complete' || evento === 'error')) achado = { evento, dado: linha.slice(5).trim() };
  }
  return achado;
}

/**
 * Chama o Space (Gradio): POST /gradio_api/call/ask → event_id; GET .../<event_id> → SSE. Entradas do Space: [pergunta, idioma, contexto, trechos (JSON)].
 * @returns {Promise<{ok:true, answer, model, provedor:'hf'} | {ok:false, kind:'budget'|'auth'|'upstream'|'bad_output'|'timeout'|'rejected', motivo?}>}
 */
export async function chamarHfAsk(cfg, dados, { doFetch, budget }) {
  if (!(await budget.consume(cfg.askHfDailyBudget))) return { ok: false, kind: 'budget' };
  const base = `${cfg.hfAskUrl.replace(/\/+$/, '')}/gradio_api/call/ask`;
  const cab = { Authorization: `Bearer ${cfg.hfToken}`, 'Content-Type': 'application/json' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), Math.max(1, cfg.askHfTimeoutMs));
  try {
    const corpo = JSON.stringify({ data: [dados.q, dados.lang, dados.context || '', JSON.stringify(dados.trechos)] });
    const r1 = await doFetch(base, { method: 'POST', headers: cab, body: corpo, signal: ctl.signal });
    if (r1.status === 401 || r1.status === 403) return { ok: false, kind: 'auth' };
    if (!r1.ok) return { ok: false, kind: 'upstream' };
    let id;
    try { id = JSON.parse(await r1.text())?.event_id; } catch { return { ok: false, kind: 'bad_output' }; }
    if (typeof id !== 'string' || !RX_EVENT_ID.test(id)) return { ok: false, kind: 'bad_output' };
    const r2 = await doFetch(`${base}/${id}`, { method: 'GET', headers: { Authorization: cab.Authorization }, signal: ctl.signal });
    if (!r2.ok) return { ok: false, kind: 'upstream' };
    const texto = await r2.text();
    if (texto.length > 60_000) return { ok: false, kind: 'bad_output' };
    const fim = lerSseGradio(texto);
    if (!fim || fim.evento !== 'complete') return { ok: false, kind: 'upstream' }; // inclui cota do dia esgotada e fila cheia
    let saida;
    try { saida = JSON.parse(fim.dado)?.[0]; } catch { return { ok: false, kind: 'bad_output' }; }
    if (!saida || saida.ok === false) return { ok: false, kind: 'upstream' };
    const resposta = typeof saida.answer === 'string' ? saida.answer.trim() : null;
    if (!resposta) return { ok: false, kind: 'bad_output' };
    const v = verificarFidelidade(resposta, dados);
    if (!v.ok) return { ok: false, kind: 'rejected', motivo: v.motivo };
    return { ok: true, answer: resposta, model: typeof saida.model === 'string' ? saida.model : cfg.askModelVersion, provedor: 'hf' };
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: false, kind: 'timeout' };
    return { ok: false, kind: 'upstream' };
  } finally {
    clearTimeout(timer);
  }
}

export function createAskHandler(deps = {}) {
  const getEnv = deps.env ?? (() => process.env);
  const now = deps.now ?? (() => Date.now());
  const doFetch = deps.fetch ?? ((...args) => globalThis.fetch(...args));
  const log = deps.log ?? defaultLog;
  const state = deps.state ?? createAskState({ now });

  return async function handleAsk(request) {
    const t0 = now();
    const cfg = readConfig(getEnv());
    const cors = avaliarCors(request, cfg.allowedOrigins, 'POST, OPTIONS');
    const meta = { client: undefined, cache: 'na' };
    const responder = (status, corpo, extra = {}) => {
      log({ evt: 'ask', status, ms: now() - t0, ...meta });
      return json(status, corpo, { ...cors.headers, ...extra });
    };

    if (!cors.allowed) return responder(403, { ok: false, error: 'origin' });
    if (request.method === 'OPTIONS') { meta.err = 'preflight'; return responder(204, null); }
    if (request.method !== 'POST') return responder(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
    if (!askAtivo(cfg)) { meta.err = 'disabled'; return responder(503, { ok: false, error: 'disabled' }); }

    const corpo = await readJsonBody(request, MAX_ASK_BODY_BYTES);
    if (!corpo.ok) { meta.err = corpo.error; return responder(corpo.status, { ok: false, error: corpo.error }); }
    const v = validateAskBody(corpo.value);
    if (!v.ok) { meta.err = `invalid_${v.field ?? 'body'}`; return responder(v.status, { ok: false, error: v.error, field: v.field }); }
    const dados = v.value;
    const { q, lang, client, iid, context, trechos } = dados;
    meta.client = client;

    // --- rate limit (IP por minuto e iid por dia), local e depois compartilhado (Redis opcional; falha aberto)
    const ip = clientIp(request);
    const porIp = state.ipWindow.check(ip, cfg.rateIpPerMin);
    const iidResumo = resumo(iid).slice(0, 32); // o UUID da instalação nunca é guardado em claro (memória ou Redis)
    const porIid = state.iidWindow.check(iidResumo, cfg.rateIidPerDay);
    if (!porIp.allowed || !porIid.allowed) {
      meta.err = 'rate_limited';
      return responder(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': String(Math.ceil(Math.max(porIp.retryAfterMs, porIid.retryAfterMs) / 1000)) });
    }
    state.ipWindow.record(ip);
    state.iidWindow.record(iidResumo);
    const globalIp = await state.shared.hit(`ask:ip:${ip}`, 60, cfg.rateIpPerMin);
    const globalIid = globalIp.allowed ? await state.shared.hit(`ask:iid:${iidResumo}`, 86400, cfg.rateIidPerDay) : globalIp;
    if (!globalIp.allowed || !globalIid.allowed) {
      meta.err = 'rate_limited';
      return responder(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': String(Math.ceil(Math.max(globalIp.retryAfterMs, globalIid.retryAfterMs) / 1000)) });
    }

    // --- dado pessoal na pergunta: nunca chega ao modelo (nem ao log)
    if (temDadoPessoal(q)) { meta.err = 'dadopessoal'; return responder(422, { ok: false, error: 'dadopessoal' }); }

    // --- cache: a chave é um resumo SHA-256 de versão do modelo + idioma + pergunta normalizada + contexto + trechos (nada em claro)
    const ids = trechos.map((t) => t.id).join(',');
    const chave = `ask|${resumo(`${cfg.askModelVersion}|${lang}|${normalizeQuestion(q)}|${normalizeQuestion(context)}|${ids}|${normalizeQuestion(trechos.map((t) => t.texto).join(' '))}`)}`;
    const emCache = state.cache.get(chave);
    if (emCache) { meta.cache = 'hit'; return responder(200, { ok: true, answer: emCache.answer, model: emCache.model, cached: true }); }
    meta.cache = 'miss';

    // --- chamada ao Space (coalescida: pedidos idênticos simultâneos compartilham 1 chamada)
    let pendente = state.inflight.get(chave);
    if (!pendente) {
      pendente = chamarHfAsk(cfg, dados, { doFetch, budget: state.budgetHf }).finally(() => state.inflight.delete(chave));
      state.inflight.set(chave, pendente);
    }
    const r = await pendente;
    if (!r.ok) {
      meta.err = r.kind;
      if (r.kind === 'budget') return responder(503, { ok: false, error: 'budget' });
      if (r.kind === 'timeout') return responder(504, { ok: false, error: 'timeout' });
      if (r.kind === 'rejected') { meta.err = `rejected_${r.motivo}`; return responder(422, { ok: false, error: 'rejected', motivo: r.motivo }); }
      return responder(502, { ok: false, error: 'upstream' });
    }
    meta.provider = r.provedor;
    state.cache.set(chave, { answer: r.answer, model: r.model }, cfg.cacheTtlMs);
    return responder(200, { ok: true, answer: r.answer, model: r.model, cached: false });
  };
}
