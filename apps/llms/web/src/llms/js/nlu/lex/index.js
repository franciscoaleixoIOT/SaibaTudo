// Léxicos do interpretador por idioma (docs/I18N.md): os arquivos <idioma>.js desta pasta são GERADOS de contracts/lexico/<idioma>.json por
// tools/gerar_lexico.py (regexes como texto). Aqui eles são compilados uma vez por idioma; nlu.js recebe o léxico compilado (`lexico(idioma)`)
// e não tem texto em língua natural fixo. Chinês: `semFronteira` (nenhuma regex usa \b) e `normalizarAcentos: false`.
import { idiomaAtual } from '../../i18n/index.js';
import { IDIOMA_PADRAO, normalizarIdioma } from '../../i18n/idiomas.js';
import ptBR from './pt-BR.js';
import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';
import zh from './zh.js';

export const LEXICOS_BRUTOS = { 'pt-BR': ptBR, en, es, de, fr, zh };

const rx = (src) => new RegExp(src);

/** Texto como o léxico espera: minúsculas, espaços comprimidos e, nos idiomas latinos, sem acentos (NFD sem marcas). */
export function normalizarParaLexico(texto, lex) {
  let s = String(texto ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (lex?.normalizarAcentos !== false) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s;
}

/** Compila um léxico bruto (JSON) em RegExp e Sets. Puro: o mesmo JSON dá o mesmo resultado. */
export function compilar(bruto) {
  return {
    idioma: bruto.idioma,
    versao: bruto.versao,
    semFronteira: bruto.semFronteira === true,
    normalizarAcentos: bruto.normalizarAcentos !== false,
    intencoes: Object.fromEntries(Object.entries(bruto.intencoes).map(([k, v]) => [k, rx(v)])),
    pistas: Object.fromEntries(Object.entries(bruto.pistas).map(([k, v]) => [k, rx(v)])),
    /** Termos (substrings do texto normalizado) por conceito e por preset. */
    conceitos: Object.fromEntries(Object.entries(bruto.conceitos).map(([k, v]) => [k, [...v]])),
    presets: Object.fromEntries(Object.entries(bruto.presets).map(([k, v]) => [k, [...v]])),
    stopPalavras: new Set(bruto.stopPalavras)
  };
}

const cache = new Map();
/** Léxico compilado do idioma (padrão: o idioma ativo). Idioma desconhecido cai no pt-BR. */
export function lexico(idioma = idiomaAtual()) {
  const id = normalizarIdioma(idioma) ?? IDIOMA_PADRAO;
  const chave = LEXICOS_BRUTOS[id] ? id : IDIOMA_PADRAO;
  if (!cache.has(chave)) cache.set(chave, compilar(LEXICOS_BRUTOS[chave]));
  return cache.get(chave);
}

export const IDIOMAS_LEXICO = Object.keys(LEXICOS_BRUTOS);
