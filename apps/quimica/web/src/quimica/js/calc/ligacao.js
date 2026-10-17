// Tipo de ligação pela diferença de eletronegatividade de Pauling do pacote (docs/CALCULADORAS_2026-10-17.md §2.5):
//   metal + metal → metálica; metal + não metal com ΔEN ≥ 1,7 → iônica; 0,4 ≤ ΔEN < 1,7 → covalente polar; ΔEN < 0,4 → covalente apolar.
// Os limites 0,4 e 1,7 são convenção didática (escala de Pauling); semimetais contam como não metal; gás nobre → não forma ligação em condições
// comuns. Em fórmulas com 3+ elementos os pares são ESTIMADOS pela fórmula (cada metal com o não metal mais eletronegativo; cada outro não metal com
// o não metal mais eletronegativo): a estrutura real pode ter outras ligações (ex.: C–H, C–C nos orgânicos). Funções PURAS, sem texto.
// Espelho no Android: domain/calc/Ligacao.kt.
import { ErroFormula, SIMBOLOS_SET, ordemHill, parseFormula } from './formula.js';
import { CATEGORIAS_METAL } from './nox.js';

/** Limites da convenção didática (escala de Pauling). */
export const LIMITE_IONICA = 1.7;
export const LIMITE_POLAR = 0.4;

/** Classe de um elemento para a regra: 'metal', 'naoMetal' (inclui semimetais e halogênios) ou 'gasNobre'; null se o pacote não tem a categoria. */
export function classeParaLigacao(categoria) {
  if (!categoria) return null;
  if (categoria === 'gas_nobre') return 'gasNobre';
  return CATEGORIAS_METAL.has(categoria) ? 'metal' : 'naoMetal';
}

const arred = (x) => Math.round(x * 100) / 100;

/**
 * Tipo da ligação entre dois elementos.
 * @param {{simbolo: string, categoria?: string, eletronegatividade?: number}} a
 * @param {{simbolo: string, categoria?: string, eletronegatividade?: number}} b
 * @returns {{ok: true, a, b, tipo: 'metalica'|'ionica'|'covalentePolar'|'covalenteApolar'|'nenhuma', deltaEN: number|null, enA, enB, classeA, classeB}
 *   | {ok: false, erro: 'semCategoria'|'semEletronegatividade', faltam: string[]}}
 */
export function tipoDeLigacao(a, b) {
  const classeA = classeParaLigacao(a?.categoria);
  const classeB = classeParaLigacao(b?.categoria);
  const faltamCat = [[a, classeA], [b, classeB]].filter(([, c]) => !c).map(([x]) => x?.simbolo ?? '?');
  if (faltamCat.length) return { ok: false, erro: 'semCategoria', faltam: [...new Set(faltamCat)] };
  const enA = Number.isFinite(a.eletronegatividade) ? a.eletronegatividade : null;
  const enB = Number.isFinite(b.eletronegatividade) ? b.eletronegatividade : null;
  const base = { ok: true, a: a.simbolo, b: b.simbolo, enA, enB, classeA, classeB };
  if (classeA === 'gasNobre' || classeB === 'gasNobre') return { ...base, tipo: 'nenhuma', deltaEN: enA != null && enB != null ? arred(Math.abs(enA - enB)) : null };
  if (classeA === 'metal' && classeB === 'metal') return { ...base, tipo: 'metalica', deltaEN: enA != null && enB != null ? arred(Math.abs(enA - enB)) : null };
  const faltamEN = [[a, enA], [b, enB]].filter(([, v]) => v == null).map(([x]) => x.simbolo);
  if (faltamEN.length) return { ok: false, erro: 'semEletronegatividade', faltam: [...new Set(faltamEN)] };
  const deltaEN = arred(Math.abs(enA - enB));
  const umMetal = classeA === 'metal' || classeB === 'metal';
  const tipo = umMetal && deltaEN >= LIMITE_IONICA ? 'ionica' : deltaEN >= LIMITE_POLAR ? 'covalentePolar' : 'covalenteApolar';
  return { ...base, tipo, deltaEN };
}

/**
 * Pares ligados (estimados) de uma fórmula: um elemento só → o próprio par (Cl2, Fe); dois → o par; três ou mais → cada metal com o não metal
 * mais eletronegativo e cada outro não metal com o não metal mais eletronegativo (NaOH → Na–O, H–O).
 * @param {string[]} simbolos  em qualquer ordem
 * @param {(s: string) => object|null} elemento  dados do pacote do elemento
 * @returns {{pares: [string, string][], estimado: boolean}}
 */
export function paresDaFormula(simbolos, elemento) {
  const lista = ordemHill(new Set(simbolos));
  if (lista.length === 1) return { pares: [[lista[0], lista[0]]], estimado: false };
  if (lista.length === 2) return { pares: [[lista[0], lista[1]]], estimado: false };
  const cls = (s) => classeParaLigacao(elemento(s)?.categoria);
  const en = (s) => elemento(s)?.eletronegatividade ?? -Infinity;
  const metais = lista.filter((s) => cls(s) === 'metal');
  const naoMetais = lista.filter((s) => cls(s) === 'naoMetal');
  const pares = [];
  const ancora = [...naoMetais].sort((a, b) => en(b) - en(a))[0] ?? null;
  for (const m of metais) if (ancora) pares.push([m, ancora]);
  for (const x of naoMetais) if (ancora && x !== ancora) pares.push([x, ancora]);
  if (!ancora && metais.length >= 2) for (let i = 1; i < metais.length; i++) pares.push([metais[0], metais[i]]);
  return { pares, estimado: true };
}

/**
 * Ligações de uma fórmula ("NaCl", "HCl", "Cl2", "NaOH", "CO2") ou de dois elementos (`simbolos: ['H', 'Cl']`).
 * @param {{formula?: string, simbolos?: string[], elemento: (s: string) => object|null, simbolosValidos?: Set<string>}} e
 * @returns {{ok: true, ligacoes: ReturnType<typeof tipoDeLigacao>[], estimado: boolean, formula: string|null}
 *   | {ok: false, erro: 'formula'|'semEntrada'|'semElemento', mensagem?, faltam?: string[]}}
 */
export function ligacoesDe({ formula = null, simbolos = null, elemento, simbolosValidos = SIMBOLOS_SET }) {
  let lista;
  let texto = null;
  if (formula) {
    try {
      const f = parseFormula(String(formula).trim(), { simbolos: simbolosValidos });
      lista = [...f.atomos.keys()];
      texto = f.texto;
    } catch (e) {
      if (e instanceof ErroFormula) return { ok: false, erro: 'formula', mensagem: e.message };
      throw e;
    }
  } else if (Array.isArray(simbolos) && simbolos.length >= 1) {
    lista = simbolos.slice(0, 2);
  } else return { ok: false, erro: 'semEntrada' };
  const faltam = lista.filter((s) => !elemento(s));
  if (faltam.length) return { ok: false, erro: 'semElemento', faltam };
  const { pares, estimado } = formula ? paresDaFormula(lista, elemento) : { pares: [[lista[0], lista[1] ?? lista[0]]], estimado: false };
  const ligacoes = pares.map(([x, y]) => tipoDeLigacao({ simbolo: x, ...elemento(x) }, { simbolo: y, ...elemento(y) }));
  return { ok: true, ligacoes, estimado, formula: texto };
}
