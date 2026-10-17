// Entalpia de reação (docs/CALCULADORAS_2026-10-17.md §2.1): por entalpias padrão de formação (ΔH° = Σ n·ΔHf°(produtos) − Σ n·ΔHf°(reagentes)),
// combustão de um composto (monta CxHyOz(N,S) + O2 → CO2 + H2O (+ N2/SO2) e balanceia) e lei de Hess (combinação linear exata de equações dadas).
// ΔHf° vem do pacote (`propriedades.entalpiaFormacaoKJmol`, Wikidata P3078, CC0) — quem chama resolve cada espécie; substância simples no estado
// padrão (O2, N2, H2, Cl2, metais, C grafite…) tem ΔHf° = 0 por definição (regra). Falta de ΔHf° de alguma espécie → `ok: false` com a lista
// (nunca um número inventado). Funções PURAS, sem texto. Espelho no Android: domain/calc/Entalpia.kt.
import { balancear } from './balancear.js';
import { Frac } from './frac.js';
import { ErroFormula, SIMBOLOS_SET, parseFormula } from './formula.js';
import { lerEquacaoComEstados } from './equilibrio.js';

/** Atomicidade da forma padrão das substâncias simples que não são monoatômicas (fatos da IUPAC): H2, N2, O2, F2, Cl2, Br2, I2; S8 e P4 também valem. */
const ATOMICIDADE_PADRAO = { H: [2], N: [2], O: [2], F: [2], Cl: [2], Br: [2], I: [2], S: [1, 8], P: [1, 4] };

/** A fórmula é uma substância simples na forma do estado padrão (ΔHf° = 0 por definição)? "O2", "Fe", "C", "N2" sim; "O3", "O", "H" não. */
export function ehSubstanciaSimplesPadrao(formula, { simbolos = SIMBOLOS_SET } = {}) {
  let f;
  try { f = parseFormula(String(formula ?? ''), { simbolos }); } catch { return false; }
  if (f.carga !== 0 || f.atomos.size !== 1 || f.hidrato) return false;
  const [[s, n]] = [...f.atomos.entries()];
  return (ATOMICIDADE_PADRAO[s] ?? [1]).includes(n);
}

const arred = (x, casas = 4) => Math.round(x * 10 ** casas) / 10 ** casas;

/**
 * Soma por formação. Cada espécie: {formula, coef, lado: 'r'|'p', dHf: number|null, origem?: 'pacote'|'regra'}.
 * @returns {{ok: true, dH: number, termos: {formula, coef, lado, dHf, contribuicao, origem}[], exotermica: boolean}
 *   | {ok: false, erro: 'faltaEntalpia', faltam: string[], termos}}
 */
export function somaPorFormacao(especies) {
  const termos = especies.map((x) => ({ ...x, contribuicao: Number.isFinite(x.dHf) ? (x.lado === 'p' ? 1 : -1) * x.coef * x.dHf + 0 : null }));
  const faltam = [...new Set(termos.filter((x) => x.contribuicao == null).map((x) => x.formula))];
  if (faltam.length) return { ok: false, erro: 'faltaEntalpia', faltam, termos };
  const dH = arred(termos.reduce((a, x) => a + x.contribuicao, 0), 3);
  return { ok: true, dH, termos, exotermica: dH < 0 };
}

/**
 * Espécies de uma equação para o cálculo por formação: coeficientes digitados ou, sem eles, os do balanceamento.
 * @returns {{ok: true, especies: {formula, coef, lado, estado, simples: boolean}[], balanceada: boolean} | {ok: false, erro, mensagem?}}
 */
export function especiesDaEquacao(equacao, { simbolos = SIMBOLOS_SET } = {}) {
  let eq;
  try { eq = lerEquacaoComEstados(equacao, { simbolos }); } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: e.codigo ?? 'formula', mensagem: e.codigo ? null : e.message };
    throw e;
  }
  const todas = [...eq.reagentes.map((x) => ({ ...x, lado: 'r' })), ...eq.produtos.map((x) => ({ ...x, lado: 'p' }))];
  let balanceada = false;
  if (!eq.digitouCoeficientes) {
    const b = balancear(`${eq.reagentes.map((x) => x.formula).join(' + ')} -> ${eq.produtos.map((x) => x.formula).join(' + ')}`, { simbolos });
    if (!b.ok) return { ok: false, erro: 'balancear', mensagem: b.erro };
    todas.forEach((x, i) => { x.coef = b.coeficientes[i]; });
    balanceada = b.coeficientes.some((c) => c !== 1);
  } else todas.forEach((x) => { if (x.coef == null) x.coef = 1; });
  return {
    ok: true, balanceada,
    especies: todas.map((x) => ({ formula: x.formula, coef: x.coef, lado: x.lado, estado: x.estado, simples: ehSubstanciaSimplesPadrao(x.formula, { simbolos }) }))
  };
}

/** Elementos que a combustão completa sabe tratar e os produtos de cada um. */
const PRODUTOS_COMBUSTAO = [['C', 'CO2'], ['H', 'H2O'], ['N', 'N2'], ['S', 'SO2']];

/**
 * Equação de combustão completa de um composto: CxHyOz(N,S) + O2 → CO2 + H2O (+ N2, SO2), balanceada, com o coeficiente do composto.
 * @returns {{ok: true, equacao: string, coefComposto: number, especies: {formula, coef, lado, simples}[]} | {ok: false, erro: 'formula'|'naoQueima'|'balancear', mensagem?, elementos?}}
 */
export function equacaoDeCombustao(formula, { simbolos = SIMBOLOS_SET } = {}) {
  let f;
  try { f = parseFormula(String(formula ?? ''), { simbolos }); } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: 'formula', mensagem: e.message };
    throw e;
  }
  const els = [...f.atomos.keys()];
  const fora = els.filter((s) => !['C', 'H', 'O', 'N', 'S'].includes(s));
  if (fora.length || f.carga !== 0 || f.hidrato || !els.some((s) => ['C', 'H', 'S'].includes(s))) {
    return { ok: false, erro: 'naoQueima', elementos: fora };
  }
  const produtos = PRODUTOS_COMBUSTAO.filter(([s]) => f.atomos.has(s)).map(([, p]) => p);
  const texto = `${f.texto} + O2 -> ${produtos.join(' + ')}`;
  const b = balancear(texto, { simbolos });
  if (!b.ok) return { ok: false, erro: 'balancear', mensagem: b.erro };
  const especies = [...b.reagentes.map((x) => ({ formula: x.formula, coef: x.coef, lado: 'r' })), ...b.produtos.map((x) => ({ formula: x.formula, coef: x.coef, lado: 'p' }))]
    .map((x) => ({ ...x, simples: ehSubstanciaSimplesPadrao(x.formula, { simbolos }) }));
  return { ok: true, equacao: b.equacao, equacaoTex: b.equacaoTex, coefComposto: b.reagentes[0].coef, especies };
}

/**
 * Calor de uma amostra: q = n(composto) ÷ coef(composto) × ΔH(reação). `mol` = quantidade de matéria do composto.
 * @returns {{q: number, extensao: number}}
 */
export function calorDaAmostra({ dH, coefComposto, mol }) {
  const extensao = mol / coefComposto;
  return { q: arred(dH * extensao, 4), extensao };
}

/** Número (inteiro, decimal ou já fração) → Frac exata (até 9 casas decimais). */
export function fracDe(x) {
  if (x instanceof Frac) return x;
  if (!Number.isFinite(x)) throw new RangeError('numero');
  let d = 1n;
  let v = x;
  for (let k = 0; k < 9 && Math.abs(v - Math.round(v)) > 1e-12; k++) { v *= 10; d *= 10n; }
  return new Frac(BigInt(Math.round(v)), d);
}

/** Vetor {chave → coeficiente líquido (produtos +, reagentes −)} de uma equação lida. */
function vetor(eq, comEstado) {
  const v = new Map();
  const add = (x, sinal) => {
    const k = comEstado && x.estado ? `${x.chave}(${x.estado})` : x.chave;
    v.set(k, (v.get(k) ?? new Frac(0)).add(fracDe(x.coef ?? 1).mul(sinal)));
  };
  eq.reagentes.forEach((x) => add(x, -1));
  eq.produtos.forEach((x) => add(x, 1));
  for (const [k, c] of v) if (c.zero) v.delete(k);
  return v;
}

/** Átomos conservados? (equação dada como balanceada) */
function balanceadaComoEscrita(eq) {
  const soma = new Map();
  const add = (x, sinal) => { for (const [s, n] of x.atomos) soma.set(s, (soma.get(s) ?? new Frac(0)).add(fracDe(x.coef ?? 1).mul(n * sinal))); };
  eq.reagentes.forEach((x) => add(x, -1));
  eq.produtos.forEach((x) => add(x, 1));
  return [...soma.values()].every((c) => c.zero);
}

/** Resolve A·x = b (frações) por Gauss-Jordan; variáveis livres = 0. null se o sistema não tem solução. */
function resolver(A, b, nCols) {
  const M = A.map((l, i) => [...l, b[i]]);
  const pivos = [];
  let r = 0;
  for (let c = 0; c < nCols && r < M.length; c++) {
    let p = r;
    while (p < M.length && M[p][c].zero) p++;
    if (p === M.length) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const inv = new Frac(1).div(M[r][c]);
    M[r] = M[r].map((x) => x.mul(inv));
    for (let i = 0; i < M.length; i++) if (i !== r && !M[i][c].zero) { const f = M[i][c]; M[i] = M[i].map((x, j) => x.sub(f.mul(M[r][j]))); }
    pivos.push(c);
    r++;
  }
  for (let i = r; i < M.length; i++) if (!M[i][nCols].zero) return null;
  const x = Array.from({ length: nCols }, () => new Frac(0));
  pivos.forEach((c, i) => { x[c] = M[i][nCols]; });
  return x;
}

/**
 * Lei de Hess: acha os multiplicadores racionais das equações dadas cuja soma é a equação alvo e devolve ΔH do alvo + os passos.
 * @param {string} alvo  equação alvo (sem coeficientes, é balanceada antes)
 * @param {{equacao: string, dH: number}[]} equacoes  até 4 (ou mais) equações balanceadas com ΔH em kJ
 * @returns {{ok: true, dH: number, passos: {indice: number, fator: Frac, invertida: boolean, dH: number}[], alvo: string}
 *   | {ok: false, erro: 'alvo'|'equacao'|'naoBalanceada'|'semDH'|'semCombinacao', indice?: number, mensagem?: string}}
 */
export function combinarHess(alvo, equacoes, { simbolos = SIMBOLOS_SET } = {}) {
  let eqAlvo;
  try {
    eqAlvo = lerEquacaoComEstados(alvo, { simbolos });
    if (!eqAlvo.digitouCoeficientes && !balanceadaComoEscrita(eqAlvo)) {
      const b = balancear(`${eqAlvo.reagentes.map((x) => x.formula).join(' + ')} -> ${eqAlvo.produtos.map((x) => x.formula).join(' + ')}`, { simbolos });
      if (!b.ok) return { ok: false, erro: 'alvo', mensagem: b.erro };
      [...eqAlvo.reagentes, ...eqAlvo.produtos].forEach((x, i) => { x.coef = b.coeficientes[i]; });
    }
  } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: 'alvo', mensagem: e.codigo ? null : e.message };
    throw e;
  }
  const lidas = [];
  for (const [i, x] of (equacoes ?? []).entries()) {
    if (!Number.isFinite(x?.dH)) return { ok: false, erro: 'semDH', indice: i };
    try { lidas.push(lerEquacaoComEstados(x.equacao, { simbolos })); } catch (e) {
      if (e instanceof ErroFormula) return { ok: false, erro: 'equacao', indice: i, mensagem: e.codigo ? null : e.message };
      throw e;
    }
    if (!balanceadaComoEscrita(lidas[i])) return { ok: false, erro: 'naoBalanceada', indice: i };
  }
  if (!lidas.length) return { ok: false, erro: 'semCombinacao' };
  // primeiro com os estados físicos distintos (H2O(l) ≠ H2O(g)); se não fechar, sem eles
  for (const comEstado of [true, false]) {
    const t = vetor(eqAlvo, comEstado);
    const vs = lidas.map((eq) => vetor(eq, comEstado));
    const chaves = [...new Set([...t.keys(), ...vs.flatMap((v) => [...v.keys()])])];
    const A = chaves.map((k) => vs.map((v) => v.get(k) ?? new Frac(0)));
    const b = chaves.map((k) => t.get(k) ?? new Frac(0));
    const x = resolver(A, b, vs.length);
    if (!x) continue;
    const passos = x.map((f, i) => ({ indice: i, fator: f, invertida: f.sinal() < 0, dH: arred(f.toNumber() * equacoes[i].dH, 3) })).filter((p) => !p.fator.zero);
    const dH = arred(passos.reduce((a, p) => a + p.dH, 0), 3);
    return { ok: true, dH, passos, exotermica: dH < 0 };
  }
  return { ok: false, erro: 'semCombinacao' };
}
