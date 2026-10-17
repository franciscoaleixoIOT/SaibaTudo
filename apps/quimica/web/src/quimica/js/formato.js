// Números no formato do idioma ativo (Intl.NumberFormat; padrão pt-BR, vírgula decimal) e leitura tolerante do que a pessoa digita. Sem DOM.
// Este é o ÚNICO formatador de números do app: i18n/index.js só informa o idioma (definirLocaleNumeros) para não haver importação circular.

const NF = new Map();
let LOCALE = 'pt-BR';

/** Idiomas aceitos pelos formatadores (BCP 47, os mesmos de i18n/index.js). */
export const LOCALES_NUMEROS = ['pt-BR', 'en', 'es', 'de', 'fr'];

/** Define o idioma usado por fmt/fmtTex/lerNumero quando não recebem `locale`. Idioma desconhecido volta para pt-BR. */
export function definirLocaleNumeros(locale) {
  LOCALE = LOCALES_NUMEROS.includes(locale) ? locale : 'pt-BR';
  return LOCALE;
}
export const localeNumeros = () => LOCALE;

function nf(locale, opts) {
  const k = `${locale}|${JSON.stringify(opts)}`;
  if (!NF.has(k)) NF.set(k, new Intl.NumberFormat(locale, opts));
  return NF.get(k);
}

const SEP = new Map();
/** Separadores decimal e de milhar do idioma: { decimal, grupo } (ex.: pt-BR {",", "."}; en {".", ","}; fr {",", " "}). */
export function separadores(locale = LOCALE) {
  if (!SEP.has(locale)) {
    const partes = nf(locale, { useGrouping: true }).formatToParts(1234567.5);
    const decimal = partes.find((p) => p.type === 'decimal')?.value ?? '.';
    const grupo = partes.find((p) => p.type === 'group')?.value ?? '';
    SEP.set(locale, { decimal, grupo });
  }
  return SEP.get(locale);
}

const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

/** Mantissa e expoente decimais com `sig` algarismos significativos (sem erros de arredondamento de toExponential). */
function cientifico(n, sig) {
  const [m, e] = n.toExponential(Math.max(0, sig - 1)).split('e');
  return { mantissa: Number(m), expoente: Number(e) };
}

/**
 * Formata um número: sempre com algarismos significativos (padrão 6), notação científica para valores muito grandes ou pequenos.
 * @param {number} n
 * @param {{sig?: number, casas?: number, cientifica?: 'auto'|boolean, semMilhar?: boolean, locale?: string}} [o] `casas` = casas decimais fixas
 */
export function fmt(n, { sig = 6, casas = null, cientifica = 'auto', semMilhar = false, locale = LOCALE } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
  if (n === 0) return casas != null && casas > 0 ? nf(locale, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(0) : '0';
  const abs = Math.abs(n);
  const usaCient = cientifica === true || (cientifica === 'auto' && casas == null && (abs >= 1e7 || abs < 1e-4));
  if (usaCient) {
    const { mantissa, expoente } = cientifico(n, Math.min(sig, 15));
    const m = nf(locale, { maximumFractionDigits: Math.max(0, Math.min(sig, 15) - 1) }).format(mantissa);
    return `${m} × 10${[...String(expoente)].map((c) => SUPER[c] ?? c).join('')}`;
  }
  const opts = casas != null
    ? { minimumFractionDigits: casas, maximumFractionDigits: casas }
    : { maximumSignificantDigits: sig };
  if (semMilhar) opts.useGrouping = false;
  return nf(locale, opts).format(n).replace('-', '−');
}

/** O mesmo número em TeX: "1{,}5", "1{,}8 \\times 10^{-5}", milhares com espaço fino (em inglês: "1.5", "1{,}234" vira "1\\,234"). */
export function fmtTex(n, o = {}) {
  if (n == null || Number.isNaN(n)) return '\\text{—}';
  if (!Number.isFinite(n)) return n > 0 ? '\\infty' : '-\\infty';
  const locale = o.locale ?? LOCALE;
  const s = fmt(n, { semMilhar: false, ...o, locale });
  const m = /^(.*?) × 10(.+)$/.exec(s);
  const { decimal, grupo } = separadores(locale);
  const tex = (x) => [...x.replace(/−/g, '-')].map((c) => (c === decimal ? (decimal === ',' ? '{,}' : '.') : grupo && c === grupo ? '\\,' : c)).join('');
  if (m) {
    const exp = [...m[2]].map((c) => Object.keys(SUPER).find((k) => SUPER[k] === c) ?? c).join('');
    return `${tex(m[1])} \\times 10^{${exp}}`;
  }
  return tex(s);
}

/** Dígitos após a vírgula necessários para exibir `n` com `sig` algarismos significativos. */
export function casasPara(n, sig = 4) {
  if (!n) return 0;
  return Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(n))));
}

const DIGITO_SOBRESCRITO = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/**
 * Lê um número digitado em qualquer dos idiomas do app: "1,5", "1.5", "1.234,56", "1,234.56", "1,8e-5", "1,8 x 10^-5", "10^-3", e a notação
 * científica dos livros: "1,2 × 10²³" (expoente sobrescrito), "1,2·10^23", "6,02.10^23" (ponto como "vezes"), "1.2 × 10**23".
 * Heurística (docs/I18N.md §1.3): com "," e "." no mesmo número, o último é o decimal; com um só separador, vale a convenção do idioma
 * ("1.000" é mil em pt/es/de/fr e 1 em inglês; "1,000" é mil em inglês e 1 nos demais), exceto quando os grupos não têm três dígitos ("1,5" e "1.5").
 * @returns {number} NaN se não for um número.
 */
export function lerNumero(entrada, locale = LOCALE) {
  let s = String(entrada ?? '').trim().replace(/\s+/g, ' ').replace(/−/g, '-');
  if (!s) return NaN;
  s = s.replace(/10\s*([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, (_, e) => `10^${[...e].map((c) => DIGITO_SOBRESCRITO[c]).join('')}`).replace(/\*\*/g, '^');
  s = s.replace(/\s*(?:[x×*·]\s*10\s*\^?|\.10\s*\^)\s*\{?(-?\d+)\}?/i, 'e$1').replace(/^10\s*\^\s*\{?(-?\d+)\}?$/, '1e$1');
  s = s.replace(/[\s  ]/g, '');
  const m = /^([+-]?)([\d.,]+)(e[+-]?\d+)?$/i.exec(s);
  if (!m) return NaN;
  const [, sinal, corpo, exp = ''] = m;
  if (!/^\d/.test(corpo) && !/^[.,]\d/.test(corpo)) return NaN;
  const temV = corpo.includes(',');
  const temP = corpo.includes('.');
  let numero;
  if (temV && temP) {
    const dec = corpo.lastIndexOf(',') > corpo.lastIndexOf('.') ? ',' : '.';
    const grupo = dec === ',' ? '.' : ',';
    const [int, frac = ''] = corpo.split(dec);
    if (corpo.split(dec).length > 2 || !new RegExp(`^\\d{1,3}(\\${grupo}\\d{3})+$`).test(int) || /[.,]/.test(frac)) return NaN;
    numero = `${int.split(grupo).join('')}.${frac}`;
  } else if (temV || temP) {
    const sep = temV ? ',' : '.';
    const partes = corpo.split(sep);
    const decimalDoIdioma = separadores(locale).decimal;
    if (partes.length > 2) {
      if (!/^\d{1,3}$/.test(partes[0]) || !partes.slice(1).every((p) => /^\d{3}$/.test(p))) return NaN;
      numero = partes.join('');
    } else if (sep !== decimalDoIdioma && /^[1-9]\d{0,2}$/.test(partes[0]) && /^\d{3}$/.test(partes[1])) {
      numero = partes.join(''); // separador de milhar do idioma: "1.000" (pt) = 1000; "1,000" (en) = 1000; "0,500" é sempre 0,5
    } else {
      numero = `${partes[0] || '0'}.${partes[1] ?? ''}`;
    }
  } else numero = corpo;
  const n = Number(`${sinal}${numero}${exp}`);
  return Number.isFinite(n) ? n : NaN;
}

/** Arredonda para n casas (evita 18.015000000000001). */
export const arredondar = (x, casas = 6) => Number(Number(x).toFixed(casas));
