// Preferências (tema, tamanho do texto, idioma, histórico de perguntas, IA na nuvem automática, "Ajudar a melhorar o app" com a sua fila e o
// código aleatório da instalação): ficam só neste navegador (localStorage). Nada daqui é enviado a servidores, exceto o código da instalação
// (iid), que acompanha as chamadas à IA na nuvem e os envios do "Ajudar a melhorar o app" que a pessoa autorizou (limite de uso por instalação
// no servidor; não identifica ninguém), e as perguntas da fila `melhoriaFila` quando a pessoa liga a opção ou toca em "Enviar esta pergunta"
// (js/melhoria.js). "Apagar os dados deste aparelho" apaga tudo, inclusive a fila e o consentimento.
import { normalizarIdioma } from './i18n/idiomas.js';

const CHAVE = 'stq:prefs';

/** Chaves das opções (os rótulos exibidos vêm do catálogo: ui.prefs.tema / ui.prefs.fonte). Os valores em português são os rótulos de referência. */
export const TEMAS = { SISTEMA: 'Seguir o sistema', CLARO: 'Claro', ESCURO: 'Escuro' };
export const FONTES = {
  PEQUENA: { rotulo: 'Pequena', fator: 0.9 }, NORMAL: { rotulo: 'Normal', fator: 1 },
  GRANDE: { rotulo: 'Grande', fator: 1.15 }, MUITO_GRANDE: { rotulo: 'Muito grande', fator: 1.3 }
};
/** `idioma` null = ainda não escolhido (vale a detecção: ?lang=, navegador, pt-BR). */
export const PADRAO = Object.freeze({ tema: 'SISTEMA', tamanhoFonte: 'NORMAL', idioma: null, historicoPerguntas: Object.freeze([]), nuvemAutomatica: false,
  melhoriaConsentida: false, melhoriaFila: Object.freeze([]), iid: null });
const RX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MAX_HISTORICO = 50;

let memoria = null; // fallback quando o armazenamento está bloqueado (modo privado etc.)

/** Histórico de perguntas: só textos não vazios, sem espaços nas pontas, no máximo 300 caracteres e as últimas MAX_HISTORICO. */
export function sanearHistorico(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim().slice(0, 300)).slice(-MAX_HISTORICO);
}

/** Acrescenta a pergunta ao histórico salvo (sem repetir a última) e devolve a lista nova. */
export function registrarPergunta(pergunta) {
  const atual = carregar();
  const itens = atual.historicoPerguntas ?? [];
  const texto = String(pergunta ?? '').trim();
  if (!texto || itens[itens.length - 1] === texto) return itens;
  const novos = sanearHistorico([...itens, texto]);
  salvar({ ...atual, historicoPerguntas: novos });
  return novos;
}

export const MAX_FILA_MELHORIA = 30;
const RX_DATA = /^\d{4}-\d{2}-\d{2}$/;
/** Fila do "Ajudar a melhorar o app" (o saneamento completo, com os filtros, está em melhoria.js): só itens com texto de 3 a 300 caracteres. */
export function sanearFilaPrefs(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x) => x && typeof x === 'object' && typeof x.q === 'string' && x.q.trim().length >= 3 && x.q.trim().length <= 300)
    .map((x) => ({
      q: x.q.trim(), intentLocal: typeof x.intentLocal === 'string' ? x.intentLocal.slice(0, 40) : 'DESCONHECIDA',
      idioma: normalizarIdioma(x.idioma) ?? 'pt-BR', t: typeof x.t === 'string' && RX_DATA.test(x.t) ? x.t : null, ...(x.e === true ? { e: true } : {})
    })).slice(-MAX_FILA_MELHORIA);
}

/** Valida e completa as preferências lidas (valores inválidos voltam ao padrão). */
export function sanear(b) {
  const o = b && typeof b === 'object' ? b : {};
  return {
    historicoPerguntas: sanearHistorico(o.historicoPerguntas), tema: o.tema in TEMAS ? o.tema : PADRAO.tema, tamanhoFonte: o.tamanhoFonte in FONTES ? o.tamanhoFonte : PADRAO.tamanhoFonte,
    idioma: normalizarIdioma(o.idioma), nuvemAutomatica: o.nuvemAutomatica === true,
    melhoriaConsentida: o.melhoriaConsentida === true, melhoriaFila: sanearFilaPrefs(o.melhoriaFila), iid: typeof o.iid === 'string' && RX_UUID.test(o.iid) ? o.iid.toLowerCase() : null
  };
}

export function carregar() {
  let bruto = null;
  try { bruto = JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); } catch { bruto = memoria; }
  memoria = sanear(bruto);
  return memoria;
}

export function salvar(p) {
  memoria = p;
  try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: vale só nesta sessão */ }
}

/** Grava só o idioma escolhido (mantendo as outras preferências). */
export function salvarIdioma(idioma) {
  const atual = carregar();
  const novo = { ...atual, idioma: normalizarIdioma(idioma) };
  salvar(novo);
  return novo;
}

/** UUID v4 aleatório desta instalação (criado na primeira chamada à IA na nuvem e guardado nas preferências). */
export function installId() {
  const atual = carregar();
  if (atual.iid) return atual.iid;
  const iid = gerarUuid();
  salvar({ ...atual, iid });
  return iid;
}

export function gerarUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function apagar() {
  memoria = null;
  try { localStorage.removeItem(CHAVE); } catch { /* ignorado */ }
}

/** Aplica tema e tamanho de texto ao documento. */
export function aplicarAparencia(p, doc = document) {
  const r = doc.documentElement;
  if (p.tema === 'CLARO') r.setAttribute('data-theme', 'light');
  else if (p.tema === 'ESCURO') r.setAttribute('data-theme', 'dark');
  else r.removeAttribute('data-theme');
  r.style.setProperty('--fs', String(FONTES[p.tamanhoFonte].fator));
}

/** O tema efetivo agora ('light' | 'dark'), considerando a preferência do aparelho. */
export function temaEfetivo(doc = document) {
  const t = doc.documentElement.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
