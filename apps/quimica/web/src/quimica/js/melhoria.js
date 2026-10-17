// "Ajudar a melhorar o app" (opcional, com consentimento PRÓPRIO, separado do da IA na nuvem): envio das perguntas que o app NÃO entendeu
// para melhorar o interpretador (POST /quimica/api/melhoria). Porte de apps/eleicoes2026/web/.../js/melhoria.js, adaptado à química.
//
// Diferente da "IA na nuvem" (que só interpreta uma pergunta e a descarta), aqui o texto é GUARDADO no servidor para uma pessoa revisar.
// Regras:
//  - só entram perguntas NÃO entendidas (resolvida === false), nunca a recusa de segurança, nunca respostas da nuvem;
//  - automático só com a chave "Ajudar a melhorar o app" ligada em Configurações (padrão: desligada); sem ela, só o toque em
//    "Enviar esta pergunta" (consentimento daquela pergunta);
//  - ANTES de entrar na fila: pedido perigoso (seguranca.js, nos cinco idiomas) e dado pessoal (e-mail, telefone, CPF/CNPJ, URL, @usuário,
//    sequências longas de dígitos) derrubam a pergunta. O servidor refaz os dois filtros (api/_lib/melhoria-handler.js);
//  - a fila fica só neste navegador (preferências `melhoriaFila`, no máximo LIMITE_FILA), vai em lotes de até LOTE (mínimo MIN_PARA_ENVIAR
//    no automático) quando há rede; desligar a chave, "Apagar fila" ou "Apagar os dados deste aparelho" apagam o que não foi enviado;
//  - vai só { q, intentLocal, t (data sem hora) } + idioma, client e o código aleatório da instalação (o servidor NÃO guarda o código);
//  - servidor desligado (503 disabled) ou fora do ar: a fila fica guardada e nada aparece como erro ("não disponível agora").
import { IDIOMAS } from './i18n/idiomas.js';
import { idiomaAtual } from './i18n/index.js';
import { carregar, installId, salvar } from './prefs.js';
import { avaliarSeguranca } from './seguranca.js';

export const ENDPOINT_MELHORIA = '/quimica/api/melhoria';
export const LIMITE_FILA = 30;
export const LOTE = 10;
export const MIN_PARA_ENVIAR = 3;
export const MIN_Q = 3;
export const MAX_Q = 300;
export const TIMEOUT_MELHORIA_MS = 10_000;
const RX_INTENT = /^[A-Z_]{2,40}$/;
const RX_DATA = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- dado pessoal
// ESPELHO de api/_lib/dadopessoal.js (mesmas expressões; web/test/melhoria.test.mjs confere os dois com os mesmos casos).
const RX_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const RX_EMAIL_DISFARCADO = /\b[a-z0-9._%+-]{2,}\s*(?:\[at\]|\(at\)|\[arroba\]|\(arroba\)|\sarroba\s|\sarobase\s)\s*[a-z0-9-]{2,}\s*(?:\.|\sponto\s|\spunto\s|\spoint\s|\sdot\s|\[dot\]|\(dot\))\s*[a-z]{2,}\b/i;
const RX_PROVEDOR = /\b(?:gmail|hotmail|outlook|yahoo|icloud|protonmail|proton\.me|bol\.com|uol\.com|terra\.com|live\.com|msn\.com|gmx|web\.de|laposte|orange\.fr|free\.fr)\b/i;
const RX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const RX_CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const RX_TELEFONE_BR = /(?:\+?55[\s-]?)?(?:\(?\d{2}\)[\s-]?)?(?<![\d.,])9?[2-9]\d{3}[\s-]\d{4}(?![\d.,])/;
const RX_TELEFONE_INTL = /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,}/;
const RX_URL = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/i;
const TLDS = 'com|net|org|br|io|info|biz|gov|edu|me|co|app|dev|xyz|online|site|ly|tv|uk|eu|us|pt|de|fr|es|it|ar|mx|cl|ca|au|ru|cn|jp|in';
const RX_DOMINIO = new RegExp(`\\b[a-z0-9-]{2,}(?:\\.[a-z0-9-]{2,})*\\.(?:${TLDS})(?:\\.[a-z]{2})?(?=$|[\\s/?#:),;!]|\\.(?:\\s|$))`, 'i');
const RX_USUARIO = /(?:^|[^\w@＠])[@＠][A-Za-z0-9_][A-Za-z0-9_.]{1,}/;
const RX_RUN_DIGITOS = /\+?\d[\d\s().\-/]*\d/g;
const RX_CAS_G = /(?<![\d-])\d{2,7}-\d{2}-\d(?![\d-])/g;
const RX_DECIMAL_G = /(?<![\d.,])\d+[.,]\d+(?![\d.,])/g;

function temSequenciaLonga(texto) {
  const semCas = String(texto).replace(RX_CAS_G, ' | ').replace(RX_DECIMAL_G, ' | ');
  for (const m of semCas.matchAll(RX_RUN_DIGITOS)) if (m[0].replace(/\D/g, '').length >= 9) return true;
  return false;
}

/** Motivo ('email'|'url'|'usuario'|'documento'|'telefone'|'numero') ou null. Heurístico: pode falhar (o consentimento diz isso). */
export function motivoDadoPessoal(texto) {
  const t = String(texto ?? '');
  if (RX_EMAIL.test(t) || RX_EMAIL_DISFARCADO.test(t) || RX_PROVEDOR.test(t)) return 'email';
  if (RX_URL.test(t) || RX_DOMINIO.test(t)) return 'url';
  if (RX_USUARIO.test(t)) return 'usuario';
  if (RX_CNPJ.test(t) || RX_CPF.test(t)) return 'documento';
  if (RX_TELEFONE_INTL.test(t) || RX_TELEFONE_BR.test(t)) return 'telefone';
  if (temSequenciaLonga(t)) return 'numero';
  return null;
}
export const temDadoPessoal = (texto) => motivoDadoPessoal(texto) !== null;

// ---------------------------------------------------------------- filtros

const CONTROLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** Texto limpo se a pergunta puder ir para a fila; null se for curta, longa, perigosa (qualquer idioma) ou tiver dado pessoal. */
export function textoEnfileiravel(q) {
  if (typeof q !== 'string') return null;
  const t = q.replace(CONTROLES, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < MIN_Q || t.length > MAX_Q) return null;
  if (avaliarSeguranca(t, IDIOMAS).recusar) return null;
  if (temDadoPessoal(t)) return null;
  return t;
}

/** A resposta é candidata ("o app não entendeu")? Nunca recusa de segurança, erro ou resposta vinda da nuvem. */
export const respostaCandidata = (r) => r != null && r.resolvida === false && r.intent !== 'RECUSA_PERIGO' && r.erro !== true && r.origem !== 'NUVEM';

/** Fila saneada lida das preferências: só itens bem formados, sem repetição, no máximo LIMITE_FILA (os mais recentes). */
export function sanearFila(lista) {
  if (!Array.isArray(lista)) return [];
  const out = [];
  const vistos = new Set();
  for (const x of lista) {
    if (!x || typeof x !== 'object' || typeof x.q !== 'string') continue;
    const q = x.q.trim();
    if (q.length < MIN_Q || q.length > MAX_Q) continue;
    const chave = q.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const item = {
      q,
      intentLocal: typeof x.intentLocal === 'string' && RX_INTENT.test(x.intentLocal) ? x.intentLocal : 'DESCONHECIDA',
      idioma: IDIOMAS.includes(x.idioma) ? x.idioma : 'pt-BR',
      t: typeof x.t === 'string' && RX_DATA.test(x.t) ? x.t : hoje()
    };
    if (x.e === true) item.e = true;
    out.push(item);
  }
  return out.slice(-LIMITE_FILA);
}

/** Data de hoje (AAAA-MM-DD, sem hora). */
export function hoje(agora = Date.now()) {
  return new Date(agora).toISOString().slice(0, 10);
}

/** Armazenamento padrão: as preferências deste navegador (`melhoriaFila`); `apagar` das preferências limpa tudo junto. */
export const armazenamentoPrefs = Object.freeze({
  ler: () => carregar().melhoriaFila ?? [],
  gravar: (lista) => salvar({ ...carregar(), melhoriaFila: sanearFila(lista) })
});

export class FilaMelhoria {
  /**
   * @param {{ habilitada?: () => boolean, installId?: () => string, endpoint?: string, fetchFn?: typeof fetch, idioma?: () => string,
   *   armazenamento?: {ler: () => object[], gravar: (l: object[]) => void}, online?: () => boolean, agora?: () => number, timeoutMs?: number }} [o]
   *   `habilitada`: a chave "Ajudar a melhorar o app" está ligada (consentimento contínuo).
   */
  constructor({
    habilitada = () => carregar().melhoriaConsentida === true, installId: iid = installId, endpoint = ENDPOINT_MELHORIA,
    fetchFn = (...a) => globalThis.fetch(...a), idioma = idiomaAtual, armazenamento = armazenamentoPrefs,
    online = () => globalThis.navigator?.onLine !== false, agora = () => Date.now(), timeoutMs = TIMEOUT_MELHORIA_MS
  } = {}) {
    Object.assign(this, { habilitada, installId: iid, endpoint, fetchFn, idioma, armazenamento, online, agora, timeoutMs });
    this.enviando = null;
    /** 'enviado' | 'indisponivel' (503 disabled/unavailable) | 'falhou' (rede, limite) | null */
    this.ultimoResultado = null;
  }

  pendentes() { return sanearFila(this.armazenamento.ler()); }

  /**
   * Põe a pergunta na fila. Automático (`explicito: false`) só com a chave ligada; `explicito: true` = toque em "Enviar esta pergunta".
   * Devolve se entrou (false: sem consentimento, filtrada ou já na fila).
   */
  enfileirar(pergunta, intentLocal = 'DESCONHECIDA', { explicito = false } = {}) {
    if (!explicito && this.habilitada() !== true) return false;
    const q = textoEnfileiravel(pergunta);
    if (!q) return false;
    const atual = this.pendentes();
    const existente = atual.find((x) => x.q.toLowerCase() === q.toLowerCase());
    if (existente) {
      if (explicito && !existente.e) { existente.e = true; this.armazenamento.gravar(atual); return true; }
      return false;
    }
    const item = { q, intentLocal: typeof intentLocal === 'string' && RX_INTENT.test(intentLocal) ? intentLocal : 'DESCONHECIDA', idioma: this.idioma(), t: hoje(this.agora()) };
    if (explicito) item.e = true;
    this.armazenamento.gravar([...atual, item].slice(-LIMITE_FILA));
    return true;
  }

  /** "Apagar fila" e desligar a chave: o que ainda não foi enviado é apagado. */
  limpar() { this.armazenamento.gravar([]); }

  /**
   * Envia um lote se houver o bastante (mínimo MIN_PARA_ENVIAR no automático; `forcar` = toque no botão, basta 1). Sem a chave ligada, só
   * as perguntas tocadas em "Enviar esta pergunta" vão. Um lote leva itens de UM idioma. Só remove da fila o que o servidor confirmou
   * (ou rejeitou como inválido, 400). Nunca lança.
   * @returns {Promise<'enviado'|'nada'|'offline'|'indisponivel'|'falhou'>}
   */
  async enviarSePreciso({ forcar = false } = {}) {
    if (this.enviando) return this.enviando;
    const fila = this.pendentes();
    const aptos = this.habilitada() === true ? fila : fila.filter((x) => x.e === true);
    if (aptos.length === 0 || (!forcar && aptos.length < MIN_PARA_ENVIAR)) return 'nada';
    if (!this.online()) return 'offline';
    const idioma = aptos[0].idioma;
    const lote = aptos.filter((x) => x.idioma === idioma).slice(0, LOTE);
    this.enviando = this._enviar(lote, idioma).finally(() => { this.enviando = null; });
    return this.enviando;
  }

  async _enviar(lote, idioma) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), this.timeoutMs) : null;
    const tirar = () => {
      const enviados = new Set(lote.map((x) => x.q.toLowerCase()));
      this.armazenamento.gravar(this.pendentes().filter((x) => !enviados.has(x.q.toLowerCase())));
    };
    try {
      const r = await this.fetchFn(this.endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', cache: 'no-store',
        body: JSON.stringify({ v: 1, client: 'web', iid: this.installId(), idioma, itens: lote.map(({ q, intentLocal, t }) => ({ q, intentLocal, t })) }),
        signal: ctl?.signal
      });
      let corpo = null;
      try { corpo = await r.json(); } catch { corpo = null; }
      if (r.ok && corpo?.ok === true) { tirar(); this.ultimoResultado = 'enviado'; return 'enviado'; }
      // 400 com o lote inválido nunca vai passar: descarta para não travar a fila. 503 (desligado ou sem armazenamento), 429 e rede: mantém.
      if (r.status === 400) { tirar(); this.ultimoResultado = 'falhou'; return 'falhou'; }
      this.ultimoResultado = r.status === 503 ? 'indisponivel' : 'falhou';
      return this.ultimoResultado;
    } catch {
      this.ultimoResultado = 'falhou';
      return 'falhou';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

let padrao = null;
/** Fila única do app (preferências deste navegador). */
export function filaMelhoria() {
  if (!padrao) padrao = new FilaMelhoria();
  return padrao;
}

/** Tenta enviar o que estiver na fila quando a rede volta e na abertura do app (automático: só com a chave ligada). */
export function iniciarMelhoria(fila = filaMelhoria(), alvo = globalThis) {
  const tentar = () => { fila.enviarSePreciso().catch(() => {}); };
  try { alvo.addEventListener?.('online', tentar); } catch { /* sem eventos */ }
  setTimeout(tentar, 6000);
}
