// Concentração de soluções: molaridade, massa necessária, g/L ↔ mol/L, percentuais e diluição (C1·V1 = C2·V2).
import { arredondar, fmt, fmtTex } from '../formato.js';
import { ErroFormula, formulaUnicode, massaMolar, parseFormula } from './formula.js';
import { acharUnidade, paraBase } from './unidades.js';
import { t } from '../i18n/index.js';

const T = (chave, params) => t(`respostas.calc.concentracao.${chave}`, params);

const fm = (x, sig = 6) => fmt(x, { sig });
const ft = (x, sig = 6) => fmtTex(x, { sig });

/** Modos (ids estáveis; rótulos pt-BR de referência — use modosConcentracao() para o idioma ativo). */
export const MODOS_CONCENTRACAO = [
  { id: 'molaridade', rotulo: 'Molaridade (mol/L) a partir da massa de soluto e do volume' },
  { id: 'massa', rotulo: 'Massa de soluto necessária para uma solução' },
  { id: 'gl-mol', rotulo: 'Converter g/L ↔ mol/L' },
  { id: 'percentual-mm', rotulo: 'Percentual em massa (m/m)' },
  { id: 'percentual-mv', rotulo: 'Percentual massa/volume (g por 100 mL)' },
  { id: 'diluicao', rotulo: 'Diluição (C₁V₁ = C₂V₂)' }
];
export const modosConcentracao = () => MODOS_CONCENTRACAO.map((m) => ({ id: m.id, rotulo: T(`modos.${m.id}`) }));

function gramas(e, ctx, rot) {
  if (!e || !Number.isFinite(e.valor)) throw new ErroFormula(T('informe', { x: rot }));
  if (!acharUnidade(ctx.unidades, e.unidade || 'g').some((x) => x.grupo === 'massa')) throw new ErroFormula(T('unidadeMassa', { u: e.unidade }));
  return paraBase(ctx.unidades, e.unidade || 'g', 'massa', e.valor) * 1000;
}
function litros(e, ctx, rot) {
  if (!e || !Number.isFinite(e.valor)) throw new ErroFormula(T('informe', { x: rot }));
  if (!acharUnidade(ctx.unidades, e.unidade || 'L').some((x) => x.grupo === 'volume')) throw new ErroFormula(T('unidadeVolume', { u: e.unidade }));
  return paraBase(ctx.unidades, e.unidade || 'L', 'volume', e.valor) * 1000;
}
function massaMolarDe(formula, ctx) {
  const f = parseFormula(formula, { simbolos: ctx.simbolos });
  const mm = massaMolar(f, ctx.massaDe);
  if (mm.faltando.length) throw new ErroFormula(t('respostas.calc.massa.semMassa', { lista: mm.faltando.join(', ') }));
  return { f, M: arredondar(mm.total, 6) };
}
const positivo = (x, rot) => { if (!(x > 0)) throw new ErroFormula(T('maiorQueZero', { x: rot })); return x; };

/** @param {{modo: string} & Record<string, any>} e */
export function calcularConcentracao(e, ctx) {
  try {
    const fontes = [ctx.fonteElemento ?? { nome: t('respostas.fontes.massasAtomicas') }];
    if (e.modo === 'molaridade') {
      const { f, M } = massaMolarDe(e.formula, ctx);
      const m = positivo(gramas(e.massa, ctx, T('massaSoluto')), T('aMassa'));
      const V = positivo(litros(e.volume, ctx, T('volumeSolucao')), T('oVolume'));
      const n = m / M;
      const C = n / V;
      return {
        ok: true, modo: e.modo, valor: C,
        resultados: [{ rotulo: T('concQuantidade'), valor: fm(C), unidade: 'mol/L', destaque: true }, { rotulo: T('quantidadeSoluto'), valor: fm(n), unidade: 'mol' }, { rotulo: T('concMassa'), valor: fm(m / V), unidade: 'g/L' }],
        passos: [
          { texto: T('passoMassaMolar', { formula: formulaUnicode(f.texto) }), tex: `M = ${ft(M)}\\ \\mathrm{g/mol}` },
          { texto: T('passoN'), tex: `n = \\dfrac{${ft(m)}\\ \\mathrm{g}}{${ft(M)}\\ \\mathrm{g/mol}} = ${ft(n)}\\ \\mathrm{mol}` },
          { texto: T('passoC'), tex: `C = \\dfrac{n}{V} = \\dfrac{${ft(n)}\\ \\mathrm{mol}}{${ft(V)}\\ \\mathrm{L}} = ${ft(C)}\\ \\mathrm{mol/L}`, destaque: true }
        ],
        notas: [], fontes
      };
    }
    if (e.modo === 'massa') {
      const { f, M } = massaMolarDe(e.formula, ctx);
      const V = positivo(litros(e.volume, ctx, T('volumeSolucao')), T('oVolume'));
      const c = e.concentracao;
      if (!c || !Number.isFinite(c.valor)) throw new ErroFormula(T('informeDesejada'));
      const u = String(c.unidade || 'mol/L');
      let molL;
      let tex1;
      if (/^g\/l$/i.test(u)) { molL = c.valor / M; tex1 = `C = \\dfrac{${ft(c.valor)}\\ \\mathrm{g/L}}{${ft(M)}\\ \\mathrm{g/mol}} = ${ft(molL)}\\ \\mathrm{mol/L}`; }
      else {
        const un = acharUnidade(ctx.unidades, u).find((x) => x.grupo === 'concentracao');
        if (!un) throw new ErroFormula(T('unidadeConc', { u }));
        molL = (c.valor * un.fator) / 1000;
        tex1 = molL === c.valor ? null : `C = ${ft(molL)}\\ \\mathrm{mol/L}`;
      }
      positivo(molL, T('aConcentracao'));
      const n = molL * V;
      const m = n * M;
      const passos = [{ texto: T('passoMassaMolar', { formula: formulaUnicode(f.texto) }), tex: `M = ${ft(M)}\\ \\mathrm{g/mol}` }];
      if (tex1) passos.push({ texto: T('passoConcMolL'), tex: tex1 });
      passos.push({ texto: T('passoNNecessaria'), tex: `n = ${ft(molL)} \\times ${ft(V)} = ${ft(n)}\\ \\mathrm{mol}` });
      passos.push({ texto: T('passoMassaSoluto'), tex: `m = ${ft(n)} \\times ${ft(M)} = ${ft(m)}\\ \\mathrm{g}`, destaque: true });
      return { ok: true, modo: e.modo, valor: m, resultados: [{ rotulo: T('massaDe', { formula: formulaUnicode(f.texto) }), valor: fm(m), unidade: 'g', destaque: true }, { rotulo: T('quantidade'), valor: fm(n), unidade: 'mol' }], passos, notas: [T('notaDissolva')], fontes };
    }
    if (e.modo === 'gl-mol') {
      const { f, M } = massaMolarDe(e.formula, ctx);
      if (!Number.isFinite(e.valor)) throw new ErroFormula(T('informeConc'));
      positivo(e.valor, T('aConcentracao'));
      const deGL = /g\/l/i.test(e.de || 'g/L');
      const res = deGL ? e.valor / M : e.valor * M;
      return {
        ok: true, modo: e.modo, valor: res,
        resultados: [{ rotulo: deGL ? T('concQuantidade') : T('concMassa'), valor: fm(res), unidade: deGL ? 'mol/L' : 'g/L', destaque: true }],
        passos: [
          { texto: T('passoMassaMolarCurto', { formula: formulaUnicode(f.texto) }), tex: `M = ${ft(M)}\\ \\mathrm{g/mol}` },
          deGL
            ? { texto: T('divida'), tex: `C = \\dfrac{C_m}{M} = \\dfrac{${ft(e.valor)}\\ \\mathrm{g/L}}{${ft(M)}\\ \\mathrm{g/mol}} = ${ft(res)}\\ \\mathrm{mol/L}`, destaque: true }
            : { texto: T('multiplique'), tex: `C_m = C \\times M = ${ft(e.valor)}\\ \\mathrm{mol/L} \\times ${ft(M)}\\ \\mathrm{g/mol} = ${ft(res)}\\ \\mathrm{g/L}`, destaque: true }
        ],
        notas: [], fontes
      };
    }
    if (e.modo === 'percentual-mm') {
      const s = positivo(gramas(e.soluto, ctx, T('massaSoluto')), T('aMassaSoluto'));
      const tt = positivo(gramas(e.solucao, ctx, T('massaSolucao')), T('aMassaSolucao'));
      if (s > tt) throw new ErroFormula(T('solutoMaior'));
      const p = (s / tt) * 100;
      return {
        ok: true, modo: e.modo, valor: p,
        resultados: [{ rotulo: T('percentualMM'), valor: fm(p), unidade: '%', destaque: true }, { rotulo: T('titulo'), valor: fm(s / tt), unidade: '' }],
        passos: [{ texto: T('passoPercentual'), tex: `\\%\\,(m/m) = \\dfrac{m_{\\text{soluto}}}{m_{\\text{${T('solucaoTex')}}}} \\times 100 = \\dfrac{${ft(s)}}{${ft(tt)}} \\times 100 = ${ft(p)}\\,\\%`, destaque: true }],
        notas: [], fontes: []
      };
    }
    if (e.modo === 'percentual-mv') {
      const s = positivo(gramas(e.soluto, ctx, T('massaSoluto')), T('aMassaSoluto'));
      const mL = positivo(litros(e.volume, ctx, T('volumeSolucao')) * 1000, T('oVolume'));
      const p = (s / mL) * 100;
      return {
        ok: true, modo: e.modo, valor: p,
        resultados: [{ rotulo: T('percentualMV'), valor: fm(p), unidade: 'g/100 mL', destaque: true }],
        passos: [{ texto: T('passoMV'), tex: `\\%\\,(m/V) = \\dfrac{${ft(s)}\\ \\mathrm{g}}{${ft(mL)}\\ \\mathrm{mL}} \\times 100 = ${ft(p)}\\ \\mathrm{g/100\\,mL}`, destaque: true }],
        notas: [], fontes: []
      };
    }
    if (e.modo === 'diluicao') {
      const uc = e.unidadeC || 'mol/L';
      const uv = e.unidadeV || 'L';
      const vals = { C1: e.C1, V1: e.V1, C2: e.C2, V2: e.V2 };
      const faltam = Object.keys(vals).filter((k) => vals[k] == null || !Number.isFinite(vals[k]));
      if (faltam.length !== 1) throw new ErroFormula(T('umEmBranco'));
      for (const k of Object.keys(vals)) if (!faltam.includes(k) && !(vals[k] > 0)) throw new ErroFormula(T('maioresQueZero'));
      const alvo = faltam[0];
      let r;
      let tex;
      let texto;
      const q = { C1: ft(vals.C1), V1: ft(vals.V1), C2: ft(vals.C2), V2: ft(vals.V2) };
      if (alvo === 'C1') { r = (vals.C2 * vals.V2) / vals.V1; tex = `C_1 = \\dfrac{C_2 V_2}{V_1} = \\dfrac{${q.C2} \\times ${q.V2}}{${q.V1}} = ${ft(r)}`; texto = T('isoleC1'); }
      if (alvo === 'V1') { r = (vals.C2 * vals.V2) / vals.C1; tex = `V_1 = \\dfrac{C_2 V_2}{C_1} = \\dfrac{${q.C2} \\times ${q.V2}}{${q.C1}} = ${ft(r)}`; texto = T('isoleV1'); }
      if (alvo === 'C2') { r = (vals.C1 * vals.V1) / vals.V2; tex = `C_2 = \\dfrac{C_1 V_1}{V_2} = \\dfrac{${q.C1} \\times ${q.V1}}{${q.V2}} = ${ft(r)}`; texto = T('isoleC2'); }
      if (alvo === 'V2') { r = (vals.C1 * vals.V1) / vals.C2; tex = `V_2 = \\dfrac{C_1 V_1}{C_2} = \\dfrac{${q.C1} \\times ${q.V1}}{${q.C2}} = ${ft(r)}`; texto = T('isoleV2'); }
      const unid = alvo[0] === 'C' ? uc : uv;
      const resultados = [{ rotulo: T(`rotulos.${alvo}`), valor: fm(r), unidade: unid, destaque: true }];
      const notas = [T('notaDiluicao')];
      if (alvo === 'V1' || alvo === 'V2') {
        const v1 = alvo === 'V1' ? r : vals.V1; const v2 = alvo === 'V2' ? r : vals.V2;
        if (v2 >= v1) { resultados.push({ rotulo: T('solventeAcrescentar'), valor: fm(v2 - v1), unidade: uv }); } else notas.push(T('atencaoConcentracao'));
      }
      return { ok: true, modo: e.modo, valor: r, resultados, passos: [{ texto: T('conserva'), tex: 'C_1 V_1 = C_2 V_2' }, { texto, tex: `${tex}\\ \\mathrm{${unid.replace(/\//g, '/')}}`, destaque: true }], notas, fontes: [] };
    }
    return { ok: false, erro: T('escolha') };
  } catch (err) {
    if (err instanceof ErroFormula) return { ok: false, erro: err.message };
    throw err;
  }
}
