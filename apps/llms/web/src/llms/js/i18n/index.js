// Internacionalização (docs/I18N.md §2–3): um só código, um catálogo por idioma. `t(chave, params)` lê o catálogo do idioma ativo e cai no
// pt-BR (referência: toda chave existe nele). Números e datas usam Intl com o idioma ativo; formato.js continua o único formatador de números.
import { definirLocaleNumeros, fmt } from '../formato.js';
import { definirConjuncaoLista } from '../texto.js';
import { IDIOMAS, IDIOMA_PADRAO, NOMES_IDIOMAS, normalizarIdioma } from './idiomas.js';
import ptBR from './catalogos/pt-BR.js';
import en from './catalogos/en.js';
import es from './catalogos/es.js';
import de from './catalogos/de.js';
import fr from './catalogos/fr.js';
import zh from './catalogos/zh.js';

export { IDIOMAS, IDIOMA_PADRAO, NOMES_IDIOMAS, normalizarIdioma };

export const CATALOGOS = { 'pt-BR': ptBR, en, es, de, fr, zh };

let atual = IDIOMA_PADRAO;
const ouvintes = new Set();

export const idiomaAtual = () => atual;
export const catalogo = (idioma = atual) => CATALOGOS[idioma] ?? CATALOGOS[IDIOMA_PADRAO];

/** Locale para Intl (o mesmo código BCP 47 do catálogo). */
export const localeDe = (idioma = atual) => idioma;

/** Lê uma chave "a.b.c" num catálogo; undefined se não existir. */
export function lerChave(obj, chave) {
  let v = obj;
  for (const parte of String(chave).split('.')) {
    if (v == null || typeof v !== 'object') return undefined;
    v = v[parte];
  }
  return v;
}

const interpolar = (texto, params) => (params ? String(texto).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : String(texto));

/**
 * Texto do idioma ativo. Valores podem ser strings com {param} ou funções (plural/concordância) que recebem `params`.
 * Chave ausente no idioma ativo cai para pt-BR; ausente em todos devolve a própria chave (visível nos testes).
 * @param {string} chave
 * @param {Record<string, any>} [params]
 * @param {string} [idioma]
 */
export function t(chave, params = undefined, idioma = atual) {
  let v = lerChave(CATALOGOS[idioma], chave);
  if (v === undefined && idioma !== IDIOMA_PADRAO) v = lerChave(CATALOGOS[IDIOMA_PADRAO], chave);
  if (v === undefined) return chave;
  if (typeof v === 'function') return v(params ?? {});
  if (Array.isArray(v) || typeof v === 'object') return v;
  return interpolar(v, params);
}

/** Lista (array) do catálogo, ou [] se não existir. */
export const tl = (chave, idioma = atual) => { const v = t(chave, undefined, idioma); return Array.isArray(v) ? v : []; };

/** Define o idioma ativo (normaliza; desconhecido = pt-BR) e avisa os ouvintes quando muda. Devolve o idioma efetivo. */
export function definirIdioma(x) {
  const novo = normalizarIdioma(x) ?? IDIOMA_PADRAO;
  const mudou = novo !== atual;
  atual = novo;
  definirLocaleNumeros(novo);
  definirConjuncaoLista(t('ui.listas.e', undefined, novo));
  if (mudou) for (const fn of ouvintes) { try { fn(novo); } catch { /* um ouvinte não derruba os outros */ } }
  return atual;
}

/** Chamada a cada mudança de idioma. Devolve a função que cancela. */
export function onIdioma(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }

/**
 * Ordem de seleção (I18N.md §2): ?lang= na URL → preferência salva → navigator.languages (prefixo) → pt-BR.
 * Puro: não grava nada. `origem` diz de onde veio ('url' | 'prefs' | 'navegador' | 'padrao').
 * @param {{url?: URL|string|null, prefs?: {idioma?: string}|null, navegador?: readonly string[]|null}} [o]
 */
export function detectarIdioma({ url = null, prefs = null, navegador = null } = {}) {
  try {
    const u = url == null ? null : typeof url === 'string' ? new URL(url, 'https://saibatudo.net') : url;
    const daUrl = normalizarIdioma(u?.searchParams?.get('lang'));
    if (daUrl) return { idioma: daUrl, origem: 'url' };
  } catch { /* URL inválida: segue */ }
  const daPref = normalizarIdioma(prefs?.idioma);
  if (daPref) return { idioma: daPref, origem: 'prefs' };
  for (const l of navegador ?? []) {
    const n = normalizarIdioma(l);
    if (n) return { idioma: n, origem: 'navegador' };
  }
  return { idioma: IDIOMA_PADRAO, origem: 'padrao' };
}

/** Número no formato do idioma ativo (delegando a formato.js). */
export const fmtNumero = (n, opcoes = {}) => fmt(n, { ...opcoes, locale: atual });

/** Data (ISO) no formato do idioma: curta ("12/10/2026", "10/12/2026") ou longa. */
export function fmtData(iso, { estilo = 'curta', fusoHorario = 'America/Sao_Paulo', comHora = false } = {}) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  try {
    const o = estilo === 'longa' ? { dateStyle: 'long' } : { year: 'numeric', month: '2-digit', day: '2-digit' };
    if (comHora) o.timeStyle = 'short';
    return new Intl.DateTimeFormat(atual, { ...o, timeZone: fusoHorario }).format(d);
  } catch { return String(iso); }
}

/** Nome de um idioma para rótulos ("nome em inglês"): usa o catálogo ativo (ui.idiomas.<codigo>). */
export const nomeDoIdioma = (idioma) => t(`ui.idiomas.${idioma}`);

/** Caminho do arquivo por idioma: ("manifest", "webmanifest") → manifest.webmanifest | manifest.en.webmanifest. */
export const arquivoPorIdioma = (base, ext, idioma = atual) => (idioma === IDIOMA_PADRAO ? `${base}.${ext}` : `${base}.${idioma}.${ext}`);

/** Política de privacidade no idioma ativo: pt-BR é a página-fonte (/llms/privacidade); os outros idiomas têm /llms/privacidade/<idioma> (privacidade/<idioma>.html). */
export const caminhoPrivacidade = (idioma = atual) => (idioma === IDIOMA_PADRAO ? '/llms/privacidade' : `/llms/privacidade/${idioma}`);

/** URLs alternativas da home por idioma (hreflang): pt-BR é a canônica e o x-default. */
export function alternativasHreflang(origem = 'https://saibatudo.net') {
  const base = `${origem}/llms/`;
  return [...IDIOMAS.map((i) => ({ hreflang: i, href: i === IDIOMA_PADRAO ? base : `${base}?lang=${i}` })), { hreflang: 'x-default', href: base }];
}

/** Aplica o idioma ao documento: <html lang>, <title>, meta description, hreflang, manifesto. Sem DOM não faz nada. */
export function aplicarIdiomaAoDocumento(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  doc.documentElement.setAttribute('lang', atual);
  const meta = doc.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('ui.html.descricao'));
  const og = doc.querySelector('meta[property="og:locale"]');
  if (og) og.setAttribute('content', t('ui.html.ogLocale'));
  const manifest = doc.querySelector('link[rel="manifest"]');
  if (manifest) manifest.setAttribute('href', '/llms/' + arquivoPorIdioma('manifest', 'webmanifest'));
  for (const l of doc.querySelectorAll('link[rel="alternate"][hreflang]')) l.remove();
  const head = doc.head ?? doc.documentElement;
  for (const a of alternativasHreflang()) {
    const l = doc.createElement('link');
    l.setAttribute('rel', 'alternate');
    l.setAttribute('hreflang', a.hreflang);
    l.setAttribute('href', a.href);
    head.append(l);
  }
}

// estado inicial coerente com o padrão
definirIdioma(IDIOMA_PADRAO);
