// Equilíbrio químico: expressão de Kc, Δn dos gases, Kp = Kc·(RT)^Δn e o valor de Kc a partir das concentrações (docs/CALCULADORAS_2026-10-17.md §2.4).
// Lei da ação das massas (regra): Kc = Π[produtos]^coef / Π[reagentes]^coef, sem sólidos nem líquidos puros. A fase de cada espécie vem do rótulo
// ((s), (l), (g), (aq)) ou, sem rótulo, do pacote (`estadoPadrao` do composto); sem nenhum dos dois a espécie é tratada como gás (hipótese dita na
// resposta). R em L·atm·mol⁻¹·K⁻¹ é derivado do R do pacote (constantes.json, CODATA) e da tabela de unidades. Funções PURAS, sem texto.
// Espelho no Android: domain/calc/Equilibrio.kt.
import { balancear, dividirEspecies } from './balancear.js';
import { ErroFormula, SIMBOLOS_SET, chaveFormula, formulaTex, formulaUnicode, parseFormula } from './formula.js';
import { paraBase } from './unidades.js';

/** Setas aceitas: ⇌ <=> <-> ⇄ ↔ → -> = (e variantes). */
export const RX_SETA_EQUILIBRIO = /\s*(?:<=>|<-->|<->|⇌|⇄|↔|-->|->|→|⟶|⇒|=>|==|=)\s*/;
const RX_ESTADO = /\(\s*(s|l|g|aq)\s*\)\s*$/i;
const RX_ELETRON = /^e(?:\^?[-−]|⁻)$/;

/**
 * Lê uma equação mantendo coeficientes e estados físicos: "N2(g) + 3 H2(g) ⇌ 2 NH3(g)".
 * @returns {{reagentes: {coef: number|null, formula: string, chave: string, estado: string|null, atomos: Map}[], produtos: [...], digitouCoeficientes: boolean}}
 * @throws {ErroFormula} com `codigo` ('semSeta', 'duasSetas', 'lado', 'eletron') ou a mensagem da fórmula
 */
export function lerEquacaoComEstados(texto, { simbolos = SIMBOLOS_SET } = {}) {
  const bruto = String(texto ?? '').normalize('NFC').replace(/[−–—]/g, '-').trim();
  const m = RX_SETA_EQUILIBRIO.exec(bruto);
  const erro = (codigo) => Object.assign(new ErroFormula(codigo), { codigo });
  if (!m) throw erro('semSeta');
  const esq = bruto.slice(0, m.index);
  const dir = bruto.slice(m.index + m[0].length);
  if (RX_SETA_EQUILIBRIO.test(dir)) throw erro('duasSetas');
  let digitou = false;
  const lado = (s) => {
    const itens = dividirEspecies(s);
    if (!itens.length) throw erro('lado');
    return itens.map((item) => {
      const mc = /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(?=[A-Za-z(\[])(.*)$/.exec(item.trim());
      let coef = null;
      let corpo = item.trim();
      if (mc) {
        const c = mc[1].includes('/') ? Number(mc[1].split('/')[0]) / Number(mc[1].split('/')[1]) : Number(mc[1].replace(',', '.'));
        coef = c;
        corpo = mc[2].trim();
        digitou = true;
      }
      const me = RX_ESTADO.exec(corpo);
      const estado = me ? me[1].toLowerCase() : null;
      if (me) corpo = corpo.slice(0, me.index).trim();
      if (RX_ELETRON.test(corpo.replace(/\s+/g, ''))) throw erro('eletron');
      const f = parseFormula(corpo, { simbolos });
      return { coef, formula: f.texto, chave: chaveFormula(f.texto), estado, atomos: f.atomos, carga: f.carga };
    });
  };
  return { reagentes: lado(esq), produtos: lado(dir), digitouCoeficientes: digitou };
}

/** Fase de uma espécie para a lei da ação das massas: rótulo → pacote → hipótese gás. */
function faseDe(esp, estadoDoPacote) {
  if (esp.estado) return { fase: esp.estado, origem: 'rotulo' };
  const p = estadoDoPacote?.(esp.formula) ?? null;
  const fase = p === 'solido' ? 's' : p === 'liquido' ? 'l' : p === 'gas' ? 'g' : null;
  return fase ? { fase, origem: 'pacote' } : { fase: 'g', origem: 'hipotese' };
}

/**
 * Estado físico de um composto: a `temperaturaK`, pelos pontos de fusão e de ebulição (K) do pacote; sem temperatura (ou sem os pontos), o
 * `estadoPadrao` do pacote (25 °C, 1 atm). Devolve 'solido' | 'liquido' | 'gas' | null.
 */
export function estadoNaTemperatura({ estadoPadrao = null, pontoFusaoK = null, pontoEbulicaoK = null }, temperaturaK = null) {
  if (Number.isFinite(temperaturaK)) {
    if (Number.isFinite(pontoEbulicaoK) && temperaturaK >= pontoEbulicaoK) return 'gas';
    if (Number.isFinite(pontoFusaoK) && temperaturaK < pontoFusaoK) return 'solido';
    if (Number.isFinite(pontoFusaoK) && Number.isFinite(pontoEbulicaoK)) return 'liquido';
  }
  return ['solido', 'liquido', 'gas'].includes(estadoPadrao) ? estadoPadrao : null;
}

/**
 * Expressão da constante de equilíbrio.
 * @param {string} equacao
 * @param {{estadoDoPacote?: (formula: string) => 'solido'|'liquido'|'gas'|null, simbolos?: Set<string>}} [op]
 * @returns {{ok: true, especies: {formula, coef, lado: 'r'|'p', fase, origem, entra: boolean}[], deltaN: number, texto: string, tex: string,
 *   balanceada: boolean, hipoteses: string[]} | {ok: false, erro: string, mensagem?: string}}
 */
export function expressaoEquilibrio(equacao, { estadoDoPacote = null, simbolos = SIMBOLOS_SET } = {}) {
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
  const hipoteses = new Set();
  const especies = todas.map((x) => {
    const { fase, origem } = faseDe(x, estadoDoPacote);
    if (origem === 'hipotese') hipoteses.add('gasPorHipotese');
    if (origem === 'pacote') hipoteses.add('faseDoPacote');
    return { formula: x.formula, chave: x.chave, coef: x.coef, lado: x.lado, fase, origem, entra: fase === 'g' || fase === 'aq' };
  });
  if (especies.some((x) => !x.entra)) hipoteses.add('semSolidoLiquido');
  const gas = (lado) => especies.filter((x) => x.lado === lado && x.fase === 'g').reduce((a, x) => a + x.coef, 0);
  const deltaN = gas('p') - gas('r');
  const termo = (x, tex) => {
    const f = tex ? `[${formulaTex(x.formula)}]` : `[${formulaUnicode(x.formula)}]`;
    if (x.coef === 1) return f;
    return tex ? `${f}^{${x.coef}}` : `${f}^${x.coef}`;
  };
  const num = especies.filter((x) => x.lado === 'p' && x.entra);
  const den = especies.filter((x) => x.lado === 'r' && x.entra);
  const juntar = (l, tex) => (l.length ? l.map((x) => termo(x, tex)).join(tex ? '\\,' : '·') : '1');
  const texto = `Kc = ${juntar(num, false)}${den.length ? ` / ${den.length > 1 ? `(${juntar(den, false)})` : juntar(den, false)}` : ''}`;
  const tex = `K_c = \\dfrac{${juntar(num, true)}}{${juntar(den, true)}}`;
  return { ok: true, especies, deltaN, texto, tex, balanceada, hipoteses: [...hipoteses] };
}

/** R em L·atm·mol⁻¹·K⁻¹ a partir do R do pacote (J·mol⁻¹·K⁻¹ = Pa·m³·mol⁻¹·K⁻¹) e da tabela de unidades; null se faltar algo. */
export function rLitroAtm(ctx) {
  const R = ctx?.gasR?.();
  if (!R) return null;
  try {
    const atm = paraBase(ctx.unidades, 'atm', 'pressao', 1);
    const litro = paraBase(ctx.unidades, 'L', 'volume', 1);
    return { valor: R.valor / atm / litro, R };
  } catch { return null; }
}

/** Temperatura em K de uma quantidade {valor, unidade} (K, °C, °F pela tabela de unidades); null se não for temperatura. */
export function temperaturaEmK(q, ctx) {
  if (!q || !Number.isFinite(q.valor)) return null;
  try { return paraBase(ctx.unidades, q.unidade, 'temperatura', q.valor); } catch { return null; }
}

/**
 * Kp = Kc·(RT)^Δn. Com `kc` numérico devolve o valor; sem ele, só o fator.
 * @param {{deltaN: number, T: number, rLatm: number, kc?: number|null}} e
 */
export function kpDeKc({ deltaN, T, rLatm, kc = null }) {
  if (!(T > 0) || !(rLatm > 0)) return { ok: false, erro: 'temperatura' };
  const fator = (rLatm * T) ** deltaN;
  return { ok: true, fator, RT: rLatm * T, kp: Number.isFinite(kc) ? kc * fator : null };
}

/**
 * Valor de Kc a partir das concentrações no equilíbrio ([X] = v mol/L) de TODAS as espécies que entram na expressão.
 * @param {ReturnType<typeof expressaoEquilibrio>} expr
 * @param {{especie: string, valor: number}[]} concentracoes
 * @returns {{ok: true, kc: number, usadas: {formula, coef, lado, valor}[]} | {ok: false, erro: 'faltamConcentracoes'|'concentracaoInvalida', faltam?: string[]}}
 */
export function calcularKc(expr, concentracoes) {
  if (!expr?.ok) return { ok: false, erro: 'expressao' };
  const porChave = new Map();
  for (const c of concentracoes ?? []) {
    let k;
    try { k = chaveFormula(String(c.especie).replace(RX_ESTADO, '')); } catch { continue; }
    if (Number.isFinite(c.valor)) porChave.set(k, c.valor);
  }
  const entram = expr.especies.filter((x) => x.entra);
  const faltam = entram.filter((x) => !porChave.has(x.chave)).map((x) => x.formula);
  if (faltam.length) return { ok: false, erro: 'faltamConcentracoes', faltam };
  if (entram.some((x) => !(porChave.get(x.chave) > 0))) return { ok: false, erro: 'concentracaoInvalida' };
  let kc = 1;
  const usadas = entram.map((x) => {
    const v = porChave.get(x.chave);
    kc *= x.lado === 'p' ? v ** x.coef : v ** -x.coef;
    return { formula: x.formula, coef: x.coef, lado: x.lado, valor: v };
  });
  return { ok: true, kc, usadas };
}
