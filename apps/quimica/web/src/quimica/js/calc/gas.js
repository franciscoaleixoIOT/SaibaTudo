// Lei dos gases ideais, PV = nRT. R vem do pacote de dados (constantes.json, CODATA); a unidade interna é o SI.
import { arredondar, fmt, fmtTex } from '../formato.js';
import { acharUnidade, deBase, paraBase } from './unidades.js';
import { ErroFormula, formulaUnicode, massaMolar, parseFormula } from './formula.js';
import { t as tr } from '../i18n/index.js';

const T = (chave, params) => tr(`respostas.calc.gas.${chave}`, params);

const UNI = { P: 'pressao', V: 'volume', T: 'temperatura' };
const ROT = (g) => T(`rotulos.${g}`);
const SI = { P: 'Pa', V: 'm3', T: 'K' };

function tex(u) {
  return `\\mathrm{${u.replace(/°/g, '^{\\circ}').replace(/3/g, '^{3}').replace(/µ/g, '\\mu ')}}`;
}

/**
 * @param {{resolver: 'P'|'V'|'n'|'T', P?: {valor:number, unidade:string}, V?: object, n?: object, T?: object, massa?: {valor:number, unidade:string}, formula?: string,
 *   saida?: string}} entrada  `saida` = unidade do resultado (padrão: a mesma do campo, ou atm, L, mol, K)
 */
export function calcularGas(entrada, ctx) {
  const R = ctx.gasR();
  if (!R) return { ok: false, erro: T('semR') };
  const alvo = entrada.resolver;
  if (!['P', 'V', 'n', 'T'].includes(alvo)) return { ok: false, erro: T('escolha') };
  const passos = [];
  const v = {};
  try {
    for (const g of ['P', 'V', 'T']) {
      if (g === alvo) continue;
      const e = entrada[g];
      if (!e || !Number.isFinite(e.valor)) return { ok: false, erro: T('informe', { x: ROT(g).toLowerCase() }) };
      const u = acharUnidade(ctx.unidades, e.unidade).find((x) => x.grupo === UNI[g]);
      if (!u) return { ok: false, erro: T('unidadeDesconhecida', { x: ROT(g).toLowerCase(), u: e.unidade }) };
      v[g] = { si: paraBase(ctx.unidades, e.unidade, UNI[g], e.valor), original: e.valor, unidade: u.rotulo };
    }
    if (alvo !== 'n') {
      let nmol;
      if (entrada.n && Number.isFinite(entrada.n.valor)) {
        const u = acharUnidade(ctx.unidades, entrada.n.unidade || 'mol').find((x) => x.grupo === 'quantidade');
        if (!u) return { ok: false, erro: T('unidadeQuantidade', { u: entrada.n.unidade }) };
        nmol = { si: paraBase(ctx.unidades, entrada.n.unidade || 'mol', 'quantidade', entrada.n.valor), original: entrada.n.valor, unidade: u.rotulo };
      } else if (entrada.massa && Number.isFinite(entrada.massa.valor) && entrada.formula) {
        const f = parseFormula(entrada.formula, { simbolos: ctx.simbolos });
        const mm = massaMolar(f, ctx.massaDe);
        if (mm.faltando.length) return { ok: false, erro: T('semMassaAtomica', { lista: mm.faltando.join(', ') }) };
        const gramas = paraBase(ctx.unidades, entrada.massa.unidade || 'g', 'massa', entrada.massa.valor) * 1000;
        const mol = gramas / mm.total;
        nmol = { si: mol, original: mol, unidade: 'mol' };
        passos.push({ texto: T('passoMassa', { formula: formulaUnicode(f.texto), M: fmt(arredondar(mm.total, 5), { sig: 9 }) }), tex: `n = \\dfrac{m}{M} = \\dfrac{${fmtTex(gramas)}}{${fmtTex(arredondar(mm.total, 5))}} = ${fmtTex(mol)}\\ \\mathrm{mol}` });
      } else return { ok: false, erro: T('informeN') };
      v.n = nmol;
    }
  } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: e.message };
    throw e;
  }
  for (const g of Object.keys(v)) {
    if (!(v[g].si > 0)) return { ok: false, erro: g === 'T' ? T('temperaturaPositiva') : T('maiorQueZero', { x: ROT(g) }) };
  }
  passos.unshift({
    texto: T('passoEquacao', { R: fmt(R.valor, { sig: 10 }), nome: R.nome }),
    tex: 'PV = nRT'
  });
  const conv = ['P', 'V', 'T'].filter((g) => g !== alvo && v[g].unidade !== SI[g]).map((g) => `${ROT(g)}: ${fmt(v[g].original)} ${v[g].unidade} = ${fmt(v[g].si)} ${SI[g].replace('3', '³')}`);
  if (conv.length || (v.n && v.n.unidade !== 'mol')) {
    passos.push({ texto: T('passoSI'), tex: ['P', 'V', 'T', 'n'].filter((g) => v[g]).map((g) => `${g} = ${fmtTex(v[g].si)}\\ ${g === 'n' ? '\\mathrm{mol}' : tex(SI[g])}`), lista: true });
  }
  let si;
  const Rv = R.valor;
  const p = v.P?.si; const vol = v.V?.si; const n = v.n?.si; const t = v.T?.si;
  if (alvo === 'P') { si = (n * Rv * t) / vol; passos.push({ texto: T('isoleP'), tex: `P = \\dfrac{nRT}{V} = \\dfrac{${fmtTex(n)} \\times ${fmtTex(Rv, { sig: 10 })} \\times ${fmtTex(t)}}{${fmtTex(vol)}} = ${fmtTex(si)}\\ \\mathrm{Pa}` }); }
  if (alvo === 'V') { si = (n * Rv * t) / p; passos.push({ texto: T('isoleV'), tex: `V = \\dfrac{nRT}{P} = \\dfrac{${fmtTex(n)} \\times ${fmtTex(Rv, { sig: 10 })} \\times ${fmtTex(t)}}{${fmtTex(p)}} = ${fmtTex(si)}\\ \\mathrm{m^{3}}` }); }
  if (alvo === 'n') { si = (p * vol) / (Rv * t); passos.push({ texto: T('isoleN'), tex: `n = \\dfrac{PV}{RT} = \\dfrac{${fmtTex(p)} \\times ${fmtTex(vol)}}{${fmtTex(Rv, { sig: 10 })} \\times ${fmtTex(t)}} = ${fmtTex(si)}\\ \\mathrm{mol}` }); }
  if (alvo === 'T') { si = (p * vol) / (n * Rv); passos.push({ texto: T('isoleT'), tex: `T = \\dfrac{PV}{nR} = \\dfrac{${fmtTex(p)} \\times ${fmtTex(vol)}}{${fmtTex(n)} \\times ${fmtTex(Rv, { sig: 10 })}} = ${fmtTex(si)}\\ \\mathrm{K}` }); }
  if (!Number.isFinite(si)) return { ok: false, erro: T('naoCalculou') };

  const padrao = { P: 'atm', V: 'L', n: 'mol', T: 'K' };
  const saida = entrada.saida || entrada[alvo]?.unidade || padrao[alvo];
  let valorSaida = si;
  let unidadeSaida = saida;
  if (alvo !== 'n') {
    const u = acharUnidade(ctx.unidades, saida).find((x) => x.grupo === UNI[alvo]);
    if (!u) return { ok: false, erro: T('unidadeSaida', { u: saida }) };
    valorSaida = deBase(ctx.unidades, saida, UNI[alvo], si);
    unidadeSaida = u.rotulo;
    if (u.rotulo !== SI[alvo]) {
      passos.push({ texto: T('converta', { u: u.rotulo }), tex: `${fmtTex(si)}\\ ${tex(SI[alvo])} = ${fmtTex(valorSaida)}\\ ${tex(u.rotulo)}`, destaque: true });
    }
  } else if (saida !== 'mol') {
    const u = acharUnidade(ctx.unidades, saida).find((x) => x.grupo === 'quantidade');
    if (u) { valorSaida = deBase(ctx.unidades, saida, 'quantidade', si); unidadeSaida = u.rotulo; }
  }
  return {
    ok: true,
    resolver: alvo,
    valor: valorSaida,
    valorSI: si,
    unidade: unidadeSaida,
    resultados: [{ rotulo: ROT(alvo), valor: fmt(valorSaida, { sig: 6 }), unidade: unidadeSaida.replace('3', '³'), destaque: true }],
    passos,
    notas: [T('notaModelo')],
    constanteUsada: { nome: R.nome, valor: R.valor, unidade: R.unidade || 'J mol^-1 K^-1', fonte: R.fonte, exata: R.exata },
    fontes: [R.fonte ? { nome: R.fonte.nome ?? String(R.fonte), url: R.fonte.url, licenca: R.fonte.licenca } : { nome: tr('respostas.fontes.constantes') }]
  };
}

/**
 * Lei de Boyle (n e T constantes): P1·V1 = P2·V2. Deixe exatamente um dos quatro valores como null: é ele que será calculado.
 * @param {{P1: {valor:number, unidade:string}|null, V1: object|null, P2: object|null, V2: object|null}} e
 */
export function calcularBoyle(e, ctx) {
  const chaves = ['P1', 'V1', 'P2', 'V2'];
  const faltam = chaves.filter((k) => !e[k] || !Number.isFinite(e[k].valor));
  if (faltam.length !== 1) return { ok: false, erro: T('boyleUmEmBranco') };
  const grupo = (k) => (k[0] === 'P' ? 'pressao' : 'volume');
  const si = {};
  try {
    for (const k of chaves) {
      if (faltam.includes(k)) continue;
      if (!acharUnidade(ctx.unidades, e[k].unidade).some((u) => u.grupo === grupo(k))) return { ok: false, erro: T('boyleUnidade', { u: e[k].unidade }) };
      si[k] = paraBase(ctx.unidades, e[k].unidade, grupo(k), e[k].valor);
      if (!(si[k] > 0)) return { ok: false, erro: T('boylePositivos') };
    }
  } catch (err) { return { ok: false, erro: err.message }; }
  const alvo = faltam[0];
  const irmao = { P1: 'P2', P2: 'P1', V1: 'V2', V2: 'V1' }[alvo];
  const unidade = e[irmao].unidade;
  const outroGrupo = alvo[0] === 'P' ? 'V' : 'P';
  const outro = (n) => si[`${outroGrupo}${n}`];
  const n = alvo[1];
  const m = n === '1' ? '2' : '1';
  // alvo[0]1 · outro1 = alvo[0]2 · outro2
  const valorSI = n === '1' ? (si[`${alvo[0]}2`] * outro('2')) / outro('1') : (si[`${alvo[0]}1`] * outro('1')) / outro('2');
  const valor = deBase(ctx.unidades, unidade, grupo(alvo), valorSI);
  const nome = T(`boyleNomes.${alvo[0]}`);
  const passos = [
    { texto: T('boyleLei'), tex: 'P_1 V_1 = P_2 V_2' },
    { texto: T('boyleIsole', { grandeza: alvo[0], nome, n }),
      tex: `${alvo[0]}_${n} = \\dfrac{${alvo[0]}_${m}\\, ${outroGrupo}_${m}}{${outroGrupo}_${n}} = ${fmtTex(valor)}\\ \\mathrm{${unidade.replace('3', '^{3}').replace('°', '^{\\circ}')}}`, destaque: true }
  ];
  return {
    ok: true, alvo, valor, unidade,
    resultados: [{ rotulo: T('boyleRotulo', { nome, n, alvo }), valor: fmt(valor, { sig: 6 }), unidade, destaque: true }],
    passos, notas: [T('boyleNota')],
    fontes: [{ nome: tr('respostas.fontes.boyle') }]
  };
}
