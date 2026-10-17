// POST /api/melhoria — "Ajudar a melhorar o app": captura, COM CONSENTIMENTO PRÓPRIO (separado do da IA na nuvem), das perguntas que o app
// NÃO entendeu, para melhorar o interpretador. Porte de apps/eleicoes2026/api/_lib/melhoria-handler.js, adaptado à química.
//
// É um canal DIFERENTE da "IA na nuvem" (que só interpreta uma pergunta e a descarta): aqui o texto é GUARDADO. Por isso:
//   - desligado por padrão: exige MELHORIA_ENABLED=1 E o Redis compartilhado (UPSTASH_REDIS_REST_URL/TOKEN); sem isso responde 503 `disabled`
//     e os clientes guardam a fila sem mostrar erro;
//   - o cliente só envia se a pessoa ligou a opção (ou tocou em "Enviar esta pergunta") e depois de filtrar; o servidor REFAZ os filtros e
//     DESCARTA (não mascara) qualquer item com:
//       * pedido perigoso (`_lib/seguranca.js`: regras próprias + léxico de pt-BR, en, es, de e fr, SEMPRE os cinco) — nunca é guardado;
//       * dado pessoal (`_lib/dadopessoal.js`: e-mail, telefone, CPF/CNPJ, URL/domínio, @usuário, sequências longas de dígitos);
//       * intentLocal RECUSA_PERIGO (o cliente nunca deveria mandar; se mandar, cai fora);
//   - guarda só { q, intentLocal, idioma, client, t } (t = data sem hora) numa lista por mês `quimica:melhoria:<AAAA-MM>` com no máximo
//     MELHORIA_MAX_POR_MES itens (LTRIM, ficam os mais recentes) e expiração 90 dias depois do fim do mês. NÃO guarda iid nem IP;
//   - o texto NUNCA é registrado em log (só status, latência, client, idioma, contagens e o motivo do erro);
//   - os limites por IP (hora) e por instalação (dia) usam o iid só na memória da instância e no contador do Redis (expira em 1 dia),
//     como o /api/nlu; o iid não entra no que é guardado.
//
// Entrada : { v:1, client:"web"|"android", iid:"<uuid v4/v7>", idioma:"pt-BR"|"en"|"es"|"de"|"fr",
//             itens:[ { q:"3..300 caracteres", intentLocal:"<intenção do NLU local>"|"DESCONHECIDA", t?:"AAAA-MM-DD" } ] }  (1 a 10 itens, corpo ≤ 8 KB)
// Saída   : 200 { ok:true, aceitos:n, descartados:m } · 400 bad_request (field) · 403 origin · 405 · 413/415 · 429 rate_limited (Retry-After)
//           · 503 disabled (desligado) · 503 unavailable (Redis falhou: nada foi guardado; o cliente mantém a fila)

import { readConfig } from './config.js';
import { createSharedLimiter, lerConfigCompartilhado } from './compartilhado.js';
import { temDadoPessoal } from './dadopessoal.js';
import { avaliarCors, clientIp, json, readJsonBody } from './http.js';
import { IDIOMAS_LEXICO } from './lexico.js';
import { createSlidingWindow, diaBrasilia, JANELAS } from './ratelimit.js';
import { avaliarPedido } from './seguranca.js';
import { cleanText, MAX_Q, MIN_Q, UUID_RX } from './validate.js';
import { CLIENTS, INTENT_SET } from './vocab.js';

export const MAX_ITENS = 10;
export const MAX_BODY_MELHORIA = 8192;
export const RETENCAO_DIAS_APOS_MES = 90;
export const PREFIXO_CHAVE = 'quimica:melhoria:';
const IDIOMAS = new Set(IDIOMAS_LEXICO);
const RX_INTENT = /^[A-Z_]{2,40}$/;
const RX_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function defaultLog(evento) {
  // Whitelist: nunca o texto, o IP ou o iid.
  const { evt, status, ms, client, idioma, err, aceitos, descartados } = evento;
  console.log(JSON.stringify({ evt, status, ms, client, idioma, err, aceitos, descartados }));
}

export function createMelhoriaState({ now = Date.now, shared = null } = {}) {
  return {
    shared: shared ?? createSharedLimiter({ now }),
    ipWindow: createSlidingWindow({ windowMs: JANELAS.HORA, now }),
    iidWindow: createSlidingWindow({ windowMs: JANELAS.DIA, now }),
  };
}

const fail = (status, error, field) => ({ ok: false, status, error, ...(field ? { field } : {}) });
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Data AAAA-MM-DD válida (calendário real)? */
function dataValida(s) {
  if (typeof s !== 'string' || !RX_DATA.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Valida o corpo. Devolve { ok, value:{ client, iid, idioma, itens:[{q (bruto), intentLocal, t|null}] } }.
 * O tamanho do texto (3..300 depois da limpeza) NÃO é erro de validação: item curto/longo é descartado (conta em `descartados`).
 */
export function validateMelhoriaBody(body) {
  if (!isObject(body)) return fail(400, 'bad_request', 'body');
  const { v, client, iid, idioma, itens } = body;
  if (v !== 1) return fail(400, 'bad_request', 'v');
  if (typeof client !== 'string' || !CLIENTS.has(client)) return fail(400, 'bad_request', 'client');
  if (typeof iid !== 'string' || !UUID_RX.test(iid)) return fail(400, 'bad_request', 'iid');
  if (typeof idioma !== 'string' || !IDIOMAS.has(idioma)) return fail(400, 'bad_request', 'idioma');
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > MAX_ITENS) return fail(400, 'bad_request', 'itens');
  const lista = [];
  for (const it of itens) {
    if (!isObject(it) || typeof it.q !== 'string' || it.q.length > MAX_Q * 2) return fail(400, 'bad_request', 'itens');
    let intentLocal = 'DESCONHECIDA';
    if (it.intentLocal !== undefined && it.intentLocal !== null) {
      if (typeof it.intentLocal !== 'string' || !RX_INTENT.test(it.intentLocal)) return fail(400, 'bad_request', 'itens');
      intentLocal = INTENT_SET.has(it.intentLocal) ? it.intentLocal : 'DESCONHECIDA';
    }
    let t = null;
    if (it.t !== undefined && it.t !== null) {
      if (!dataValida(it.t)) return fail(400, 'bad_request', 'itens');
      t = it.t;
    }
    lista.push({ q: it.q, intentLocal, t });
  }
  return { ok: true, value: { client, iid: iid.toLowerCase(), idioma, itens: lista } };
}

/** Separa o que pode ser guardado do que deve ser descartado (sem mascarar: qualquer acerto derruba o item inteiro). */
export function filtrarItens(itens) {
  const aceitos = [];
  let descartados = 0;
  const vistos = new Set();
  for (const it of itens) {
    const q = cleanText(it.q);
    if (q.length < MIN_Q || q.length > MAX_Q) { descartados++; continue; }
    if (it.intentLocal === 'RECUSA_PERIGO') { descartados++; continue; }
    if (avaliarPedido(q).recusar) { descartados++; continue; } // pedido perigoso nunca é guardado, em nenhum idioma
    if (temDadoPessoal(q)) { descartados++; continue; }
    const chave = q.toLowerCase();
    if (vistos.has(chave)) { descartados++; continue; } // repetida no mesmo envio
    vistos.add(chave);
    aceitos.push({ ...it, q });
  }
  return { aceitos, descartados };
}

/** Mês (AAAA-MM, Brasília) e o instante de expiração da lista (90 dias depois do fim do mês), em segundos. */
export function chaveDoMes(agora) {
  const mes = diaBrasilia(agora).slice(0, 7);
  const [a, m] = mes.split('-').map(Number);
  const fimDoMes = Date.UTC(a, m, 1) + 3 * 3600 * 1000; // 1º dia do mês seguinte, 0h de Brasília
  return { chave: `${PREFIXO_CHAVE}${mes}`, expiraEm: Math.floor((fimDoMes + RETENCAO_DIAS_APOS_MES * 86_400_000) / 1000) };
}

/** Comandos Redis: RPUSH de cada registro (só q, intentLocal, idioma, client, t) + LTRIM (máximo por mês) + EXPIREAT. */
export function comandosDoMes(aceitos, { idioma, client, agora, maxPorMes }) {
  const { chave, expiraEm } = chaveDoMes(agora);
  const hoje = diaBrasilia(agora);
  const registros = aceitos.map((it) => JSON.stringify({ q: it.q, intentLocal: it.intentLocal, idioma, client, t: it.t ?? hoje }));
  return [['RPUSH', chave, ...registros], ['LTRIM', chave, String(-maxPorMes), '-1'], ['EXPIREAT', chave, String(expiraEm)]];
}

export function melhoriaAtiva(cfg, env) {
  return cfg.melhoriaEnabled === true && lerConfigCompartilhado(env).ativo;
}

export function createMelhoriaHandler(deps = {}) {
  const getEnv = deps.env ?? (() => process.env);
  const now = deps.now ?? (() => Date.now());
  const log = deps.log ?? defaultLog;
  const state = deps.state ?? createMelhoriaState({ now, shared: deps.shared ?? null });

  return async function handleMelhoria(request) {
    const t0 = now();
    const env = getEnv();
    const cfg = readConfig(env);
    const cors = avaliarCors(request, cfg.allowedOrigins, 'POST, OPTIONS');
    const meta = { client: undefined };
    const responder = (status, corpo, extra = {}) => {
      log({ evt: 'melhoria', status, ms: now() - t0, ...meta });
      return json(status, corpo, { ...cors.headers, ...extra });
    };

    if (!cors.allowed) return responder(403, { ok: false, error: 'origin' });
    if (request.method === 'OPTIONS') { meta.err = 'preflight'; return responder(204, null); }
    if (request.method !== 'POST') return responder(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });

    if (!melhoriaAtiva(cfg, env)) { meta.err = 'disabled'; return responder(503, { ok: false, error: 'disabled' }); }

    const corpo = await readJsonBody(request, MAX_BODY_MELHORIA);
    if (!corpo.ok) { meta.err = corpo.error; return responder(corpo.status, { ok: false, error: corpo.error }); }
    const v = validateMelhoriaBody(corpo.value);
    if (!v.ok) { meta.err = `invalid_${v.field ?? 'body'}`; return responder(v.status, { ok: false, error: v.error, field: v.field }); }
    const { client, iid, idioma, itens } = v.value;
    meta.client = client;
    meta.idioma = idioma;

    // limites: poucos envios por IP/hora e por instalação/dia (cada envio já leva até 10 perguntas). Só consome se ambos permitirem.
    const ip = clientIp(request);
    const porIp = state.ipWindow.check(ip, cfg.melhoriaPerHour);
    const porIid = state.iidWindow.check(iid, cfg.melhoriaPerDay);
    if (!porIp.allowed || !porIid.allowed) {
      meta.err = 'rate_limited';
      return responder(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': String(Math.ceil(Math.max(porIp.retryAfterMs, porIid.retryAfterMs) / 1000)) });
    }
    state.ipWindow.record(ip);
    state.iidWindow.record(iid);
    const gIp = await state.shared.hit(`quimica:melhoria:ip:${ip}`, 3600, cfg.melhoriaPerHour);
    const gIid = gIp.allowed ? await state.shared.hit(`quimica:melhoria:iid:${iid}`, 86400, cfg.melhoriaPerDay) : gIp;
    if (!gIp.allowed || !gIid.allowed) {
      meta.err = 'rate_limited';
      return responder(429, { ok: false, error: 'rate_limited' }, { 'Retry-After': String(Math.ceil(Math.max(gIp.retryAfterMs, gIid.retryAfterMs) / 1000)) });
    }

    const { aceitos, descartados } = filtrarItens(itens);
    meta.aceitos = aceitos.length;
    meta.descartados = descartados;
    if (aceitos.length === 0) return responder(200, { ok: true, aceitos: 0, descartados });

    const r = await state.shared.executar(comandosDoMes(aceitos, { idioma, client, agora: now(), maxPorMes: cfg.melhoriaMaxPorMes }));
    if (r === null) { meta.err = 'store_unavailable'; return responder(503, { ok: false, error: 'unavailable' }); }
    return responder(200, { ok: true, aceitos: aceitos.length, descartados });
  };
}
