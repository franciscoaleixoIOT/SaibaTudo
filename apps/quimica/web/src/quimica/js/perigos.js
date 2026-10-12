// Perigos (GHS): pictogramas, palavra de sinal e frases H. Os textos pt-BR das frases vêm de ghs.js (gerado de dataset/ghs_pt.py); o pacote de dados
// (ghs_frases.json, Regulamento CLP) pode trazer as frases em vários idiomas (`texto: { "pt-BR": …, "en": … }`), que valem mais. A classificação de
// cada composto vem do pacote (campo `ghs`). Rótulos de pictograma e palavra de sinal: catálogo do idioma ativo.
import { FONTE_GHS, FRASES_H, PICTOGRAMAS } from './ghs.js';
import { idiomaAtual, t } from './i18n/index.js';

export { FRASES_H, PICTOGRAMAS, FONTE_GHS };

/** Rótulos pt-BR de referência (compatibilidade); use nomePictograma() para o idioma ativo. */
export const NOMES_PICTOGRAMA = {
  GHS01: 'Explosivo', GHS02: 'Inflamável', GHS03: 'Comburente (oxidante)', GHS04: 'Gás sob pressão', GHS05: 'Corrosivo',
  GHS06: 'Toxicidade aguda (tóxico ou fatal)', GHS07: 'Nocivo, irritante ou sensibilizante', GHS08: 'Perigo grave à saúde', GHS09: 'Perigoso ao ambiente aquático'
};
export const CODIGOS_PICTOGRAMA = Object.keys(NOMES_PICTOGRAMA);
export const urlPictograma = (codigo) => `/quimica/vendor/ghs/${String(codigo).toLowerCase()}.svg`;
export const nomePictograma = (codigo) => t(`ui.perigos.pictogramas.${codigo}`);
export const descricaoPictograma = (codigo) => t(`ui.perigos.descricoes.${codigo}`);

/** Grupos de frases H (H2xx, H3xx, H4xx) com título e descrição no idioma ativo. */
export const gruposFrasesH = () => t('ui.perigos.grupos');
/** Compatibilidade (pt-BR). */
export const GRUPOS_FRASES_H = [
  { faixa: 'H2xx', titulo: 'Perigos físicos', descricao: 'explosivos, inflamáveis, comburentes, gases sob pressão, corrosivos para metais (H200 a H290).' },
  { faixa: 'H3xx', titulo: 'Perigos para a saúde', descricao: 'toxicidade aguda, corrosão e irritação da pele e dos olhos, sensibilização, mutagenicidade, carcinogenicidade, toxicidade reprodutiva e para órgãos-alvo (H300 a H373).' },
  { faixa: 'H4xx', titulo: 'Perigos ao meio ambiente', descricao: 'toxicidade para organismos aquáticos e para a camada de ozônio (H400 a H420).' }
];

/** Mapa código → texto no idioma pedido, a partir das regras do pacote (`frasesH` em pt-BR e `frasesHPorIdioma[idioma]`). */
function mapaFrases(regras, idioma) {
  const porIdioma = regras?.frasesHPorIdioma?.[idioma];
  const doPacote = regras?.frasesH;
  const sobreposicao = doPacote && typeof doPacote === 'object' && !Array.isArray(doPacote) ? doPacote : null;
  if (idioma === 'pt-BR') return { ...FRASES_H, ...(porIdioma ?? {}), ...(sobreposicao ?? {}) };
  if (porIdioma && typeof porIdioma === 'object') return porIdioma;
  return null;
}

function fraseEm(mapa, cod) {
  if (!mapa) return null;
  if (mapa[cod]) return mapa[cod];
  const partes = cod.split(/\s*\+\s*/);
  if (partes.length > 1 && partes.every((c) => mapa[c])) return `${partes.map((c) => mapa[c].replace(/\.$/, '')).join(' / ')}.`;
  return null;
}

/**
 * Texto de uma frase H ("H314", ou combinada "H302+H312") com o idioma em que está: no idioma pedido quando o pacote traz; senão em pt-BR
 * (rotulado pela interface). null se desconhecida.
 * @returns {{texto: string, idioma: string}|null}
 */
export function fraseHInfo(codigo, regras = null, idioma = idiomaAtual()) {
  const cod = String(codigo ?? '').trim().toUpperCase();
  const proprio = fraseEm(mapaFrases(regras, idioma), cod);
  if (proprio) return { texto: proprio, idioma };
  if (idioma !== 'en') { const en = fraseEm(mapaFrases(regras, 'en'), cod); if (en) return { texto: en, idioma: 'en' }; }
  const pt = fraseEm(mapaFrases(regras, 'pt-BR'), cod);
  return pt ? { texto: pt, idioma: 'pt-BR' } : null;
}

/** Texto de uma frase H no idioma (ou na reserva); null se desconhecida. */
export function fraseH(codigo, regras = null, idioma = idiomaAtual()) {
  return fraseHInfo(codigo, regras, idioma)?.texto ?? null;
}

/** Chave da palavra de sinal: 'perigo' | 'atencao' | null (aceita o valor do pacote em pt ou en). */
export function sinalChave(p) {
  const x = String(p ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!x) return null;
  if (x === 'danger' || x === 'perigo' || x === 'peligro' || x === 'gefahr') return 'perigo';
  if (x === 'warning' || x === 'atencao' || x === 'atencion' || x === 'achtung' || x === 'attention') return 'atencao';
  return null;
}

/** Palavra de sinal no idioma ativo ("Danger" → "Perigo"); valores desconhecidos passam como vieram. */
export function palavraSinal(p) {
  const k = sinalChave(p);
  if (k) return t(`ui.perigos.sinal.${k}`);
  return p == null || String(p).trim() === '' ? null : String(p);
}

/**
 * Descrição pronta da classificação GHS de um composto (campo `ghs` do pacote), ou null se não houver.
 * @returns {{pictogramas: {codigo: string, nome: string, descricao: string, url: string}[], palavraSinal: string|null, sinal: string|null, frases: {codigo: string, texto: string|null, idiomaTexto: string|null}[], fonte: string|null}|null}
 */
export function descreverGhs(ghs, regras = null) {
  if (!ghs || typeof ghs !== 'object') return null;
  const pict = (Array.isArray(ghs.pictogramas) ? ghs.pictogramas : []).map((c) => String(c).toUpperCase()).filter((c) => /^GHS0[1-9]$/.test(c));
  const frases = (Array.isArray(ghs.frasesH) ? ghs.frasesH : []).map((c) => String(c).toUpperCase()).map((codigo) => {
    const info = fraseHInfo(codigo, regras);
    return { codigo, texto: info?.texto ?? null, idiomaTexto: info?.idioma ?? null };
  });
  if (!pict.length && !frases.length && !ghs.palavraSinal) return null;
  return {
    pictogramas: pict.map((codigo) => ({ codigo, nome: nomePictograma(codigo), descricao: descricaoPictograma(codigo), url: urlPictograma(codigo) })),
    palavraSinal: palavraSinal(ghs.palavraSinal),
    sinal: sinalChave(ghs.palavraSinal),
    frases,
    fonte: ghs.fonte ?? null
  };
}

/** URL externa segura (só https). */
export const urlSegura = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.href : null; } catch { return null; } };
