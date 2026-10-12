// Massa molar a partir da fórmula e das massas atômicas do pacote de dados, com passos e composição percentual.
import { arredondar, fmt, fmtTex } from '../formato.js';
import { ErroFormula, formulaTex, formulaUnicode, massaMolar, ordemHill, parseFormula } from './formula.js';
import { t } from '../i18n/index.js';

const T = (chave, params) => t(`respostas.calc.massa.${chave}`, params);

const m = (x) => fmt(arredondar(x, 5), { sig: 9, cientifica: false });
const mt = (x) => fmtTex(arredondar(x, 5), { sig: 9, cientifica: false });

/** Resultado da massa molar de uma fórmula. Nunca lança. */
export function calcularMassaMolar(texto, ctx) {
  let f;
  try { f = parseFormula(texto, { simbolos: ctx.simbolos }); } catch (e) {
    if (e instanceof ErroFormula) return { ok: false, erro: e.message };
    throw e;
  }
  const mm = massaMolar(f, ctx.massaDe);
  if (mm.faltando.length) {
    return { ok: false, erro: T('semMassa', { lista: mm.faltando.map((s) => `${ctx.nomeDe(s)} (${s})`).join(', ') }) };
  }
  const total = arredondar(mm.total, 6);
  const passos = [
    {
      texto: T('passo1', { hidrato: f.hidrato }),
      tex: `${formulaTex(f.texto)} \\;\\Rightarrow\\; ${mm.linhas.map((l) => `${l.n}\\,\\mathrm{${l.simbolo}}`).join(',\\; ')}`
    },
    {
      texto: T('passo2'),
      tex: mm.linhas.map((l) => `\\mathrm{${l.simbolo}}:\\; ${l.n} \\times ${mt(l.massa)} = ${mt(l.subtotal)}`),
      lista: true
    },
    {
      texto: T('passo3'),
      tex: `M = ${mm.linhas.map((l) => mt(l.subtotal)).join(' + ')} = ${mt(total)}\\ \\mathrm{g/mol}`,
      destaque: true
    }
  ];
  if (f.hidrato) {
    const partes = f.partes.map((p) => {
      const ps = massaMolar({ atomos: p.atomos }, ctx.massaDe);
      return { ...p, massa: ps.total * p.coef };
    });
    passos.push({
      texto: T('hidrato'),
      tex: partes.map((p) => `${p.coef > 1 ? `${p.coef}\\times ` : ''}${formulaTex(p.corpo)}:\\; ${mt(p.massa)}`),
      lista: true
    });
  }
  const notas = [];
  if (f.carga !== 0) notas.push(T('eletrons'));
  const composicao = mm.linhas.map((l) => ({ simbolo: l.simbolo, nome: ctx.nomeDe(l.simbolo), n: l.n, massa: l.massa, subtotal: l.subtotal, percentual: (l.subtotal / mm.total) * 100 }));
  return {
    ok: true,
    formula: f.texto,
    formulaUnicode: formulaUnicode(f.texto),
    hill: f.hill,
    carga: f.carga,
    massaMolar: total,
    composicao,
    resultados: [
      { rotulo: T('massaMolarDe', { formula: formulaUnicode(f.texto) }), valor: m(total), unidade: 'g/mol', destaque: true },
      ...composicao.map((c) => ({ rotulo: T('percentual', { nome: c.nome, simbolo: c.simbolo }), valor: fmt(c.percentual, { sig: 4 }), unidade: '%' }))
    ],
    passos,
    notas,
    elementosUsados: ordemHill(f.atomos.keys()),
    fontes: [ctx.fonteElemento ?? { nome: t('respostas.fontes.massasAtomicas') }]
  };
}
