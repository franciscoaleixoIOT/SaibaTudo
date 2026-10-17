// Número de oxidação (NOX) pelas regras dos livros didáticos (docs/CALCULADORAS_2026-10-17.md §2.3), nesta ordem:
//   substância simples 0; íon monoatômico (um só elemento) = carga ÷ átomos; F −1; grupo 1 +1; grupo 2 +2; Al +3;
//   H +1 (−1 no hidreto metálico: H só com metais, ou com metal e semimetal dos grupos 13–14, como NaH, CaH2, LiAlH4, NaBH4);
//   O −2 (sem F e com outro elemento sem regra; quando todos os outros já têm NOX fixo, o O sai do balanço: peróxido −1 em H2O2/Na2O2/BaO2,
//   superóxido −1/2 em KO2; com F, OF2 dá +2); Cl/Br/I −1 quando é o elemento mais eletronegativo presente;
//   o ÚLTIMO elemento sem regra sai do balanço (Σ NOX·átomos = carga). Com dois ou mais sem regra, o mais eletronegativo (pacote) recebe o NOX
//   negativo usual do grupo (17 −1, 16 −2, 15 −3, 14 −4) e o outro sai do balanço; se ainda não fecha: indeterminado por regra (use a estrutura).
// NOX fracionário = "NOX médio" (C no C3H8 = −8/3). Frações exatas (frac.js). Função PURA: erros e regras são códigos (o texto vem do catálogo).
// Espelho no Android: domain/calc/Nox.kt.
import { Frac } from './frac.js';
import { ErroFormula, SIMBOLOS_SET, ordemHill, parseFormula } from './formula.js';

/** Metais pela categoria do pacote (semimetais e gases nobres não contam). */
export const CATEGORIAS_METAL = new Set(['metal_alcalino', 'metal_alcalino_terroso', 'metal_transicao', 'metal_pos_transicao', 'lantanideo', 'actinideo']);
const NEGATIVO_DO_GRUPO = { 17: -1, 16: -2, 15: -3, 14: -4 };
const HALOGENIOS_REGRA = new Set(['Cl', 'Br', 'I']);

/**
 * Acessores dos dados de cada elemento a partir do contexto das calculadoras (pacote): grupo, categoria e eletronegatividade (Pauling).
 * @param {{porSimbolo: Map<string, object>}} ctx
 */
export function dadosElementosDoContexto(ctx) {
  const de = (s) => ctx?.porSimbolo?.get(s) ?? null;
  return {
    grupo: (s) => (Number.isFinite(de(s)?.grupo) ? de(s).grupo : null),
    categoria: (s) => de(s)?.categoria ?? null,
    eletronegatividade: (s) => (Number.isFinite(de(s)?.eletronegatividade) ? de(s).eletronegatividade : null)
  };
}

/** Texto de um NOX (Frac): "+6", "−2", "0", "−8/3". */
export function textoNox(f) {
  if (f.zero) return '0';
  const sinal = f.sinal() > 0 ? '+' : '−';
  const abs = f.sinal() < 0 ? f.neg() : f;
  return `${sinal}${abs.toString()}`;
}

/**
 * Calcula o NOX de cada elemento de uma fórmula (com carga opcional no texto: "MnO4-", "Cr2O7 2-", "SO4^2-", "NH4+", ou em `carga`).
 * @param {string} formula
 * @param {{carga?: number|null, dados: ReturnType<typeof dadosElementosDoContexto>, simbolos?: Set<string>}} op
 * @returns {{ok: true, formula: string, corpo: string, carga: number, itens: {simbolo, atomos, nox: Frac, texto, regra, medio}[], soma: Frac}
 *   | {ok: false, erro: 'formula'|'hidrato'|'indeterminado'|'inconsistente'|'semDados', mensagem?, faltam?: string[]}}
 */
export function calcularNox(formula, { carga = null, dados, simbolos = SIMBOLOS_SET } = {}) {
  let f;
  try { f = parseFormula(String(formula ?? '').trim(), { simbolos }); } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: 'formula', mensagem: e.message };
    throw e;
  }
  if (f.hidrato) return { ok: false, erro: 'hidrato' };
  const q = Number.isInteger(carga) ? carga : f.carga;
  const simb = ordemHill(f.atomos.keys());
  const at = (s) => f.atomos.get(s);
  const grupo = (s) => dados?.grupo?.(s) ?? null;
  const categoria = (s) => dados?.categoria?.(s) ?? null;
  const en = (s) => dados?.eletronegatividade?.(s) ?? null;
  const ehMetal = (s) => CATEGORIAS_METAL.has(categoria(s));
  const nox = new Map(); // símbolo → {nox: Frac, regra}
  const fixar = (s, valor, regra) => { if (!nox.has(s)) nox.set(s, { nox: Frac.de(valor), regra }); };
  const semRegra = () => simb.filter((s) => !nox.has(s));
  const somaFixos = () => [...nox.entries()].reduce((acc, [s, x]) => acc.add(x.nox.mul(at(s))), new Frac(0));
  const balanco = (s) => fixar(s, new Frac(q).sub(somaFixos()).div(at(s)), 'balanco');

  if (simb.length === 1) {
    const s = simb[0];
    fixar(s, new Frac(q, at(s)), q === 0 ? 'substanciaSimples' : 'ionMonoatomico');
  } else {
    if (simb.includes('F')) fixar('F', -1, 'fluor');
    for (const s of simb) {
      if (s === 'H') continue;
      if (grupo(s) === 1) fixar(s, 1, 'grupo1');
      else if (grupo(s) === 2) fixar(s, 2, 'grupo2');
      else if (s === 'Al') fixar(s, 3, 'aluminio');
    }
    if (simb.includes('H')) {
      const outros = simb.filter((s) => s !== 'H');
      const hidreto = outros.length > 0 && outros.some(ehMetal) && outros.every((s) => ehMetal(s) || (categoria(s) === 'semimetal' && [13, 14].includes(grupo(s))));
      fixar('H', hidreto ? -1 : 1, hidreto ? 'hidretoMetalico' : 'hidrogenio');
    }
    if (simb.includes('O') && !simb.includes('F')) {
      // com todos os outros já fixos o O sai do balanço (peróxido, superóxido); senão vale −2
      const outrosSemRegra = simb.filter((s) => s !== 'O' && !nox.has(s));
      if (outrosSemRegra.length) fixar('O', -2, 'oxigenio');
      else {
        balanco('O');
        const v = nox.get('O').nox;
        nox.get('O').regra = v.n === -1n && v.d === 1n ? 'peroxido' : v.n === -1n && v.d === 2n ? 'superoxido' : v.n === -2n && v.d === 1n ? 'oxigenio' : 'balanco';
      }
    }
    const presentesEN = simb.map((s) => [s, en(s)]).filter(([, v]) => v != null);
    const maisEN = presentesEN.length === simb.length ? presentesEN.sort((a, b) => b[1] - a[1])[0][0] : null;
    for (const s of simb) if (HALOGENIOS_REGRA.has(s) && s === maisEN) fixar(s, -1, 'halogenio');
    let livres = semRegra();
    if (livres.length >= 2) {
      const comEN = livres.map((s) => [s, en(s)]);
      if (comEN.some(([, v]) => v == null)) return { ok: false, erro: 'semDados', faltam: comEN.filter(([, v]) => v == null).map(([s]) => s) };
      const [alvo] = comEN.sort((a, b) => b[1] - a[1])[0];
      const usual = NEGATIVO_DO_GRUPO[grupo(alvo)];
      if (usual != null) fixar(alvo, usual, 'eletronegatividade');
      livres = semRegra();
    }
    if (livres.length >= 2) return { ok: false, erro: 'indeterminado', faltam: livres };
    if (livres.length === 1) balanco(livres[0]);
  }
  const soma = somaFixos();
  if (soma.sub(new Frac(q)).sinal() !== 0) return { ok: false, erro: 'inconsistente', soma: soma.toString(), carga: q };
  const itens = simb.map((s) => {
    const x = nox.get(s);
    return { simbolo: s, atomos: at(s), nox: x.nox, texto: textoNox(x.nox), regra: x.regra, medio: !x.nox.inteiro };
  });
  return { ok: true, formula: f.texto, corpo: f.corpo, carga: q, itens, soma };
}
