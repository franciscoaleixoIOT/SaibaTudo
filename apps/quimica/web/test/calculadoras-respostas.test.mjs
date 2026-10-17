// Intenções NOX, ENTALPIA, EQUILIBRIO e LIGACAO e a resposta enriquecida de configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §1, §2, §4):
// regras do NLU local (campos só do cliente: `concentracoes`, `cargaFormula`), respostas com fonte e licença em cada bloco, números só do pacote
// ou do cálculo, e falta de ΔHf° → `resolvida: false` dizendo o que falta. O pacote de teste não traz `entalpiaFormacaoKJmol`: os testes de
// entalpia acrescentam o campo, com a fonte, em alguns compostos da loja (fixture própria em memória). Espelho no Android (a portar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DADOS, lojaNova } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine } from '../src/quimica/js/engine.js';
import { AnswerBuilder } from '../src/quimica/js/answers.js';
import { definirIdioma } from '../src/quimica/js/i18n/index.js';
import { lerConcentracoes, parse } from '../src/quimica/js/nlu.js';
import { lexico } from '../src/quimica/js/nlu/lex/index.js';
import { validarTexDaResposta } from './tex.mjs';

// ΔHf° (kJ/mol, 298,15 K) como o pipeline os grava: propriedades.entalpiaFormacaoKJmol + fontesPorPropriedade.entalpiaFormacaoKJmol
const ENTALPIAS = { 297: [-74.6, 'gas'], 280: [-393.5, 'gas'], 962: [-285.8, 'liquido'], 702: [-277.6, 'liquido'] };
async function lojaComEntalpias() {
  const store = await lojaNova(DADOS);
  for (const [cid, [v, fase]] of Object.entries(ENTALPIAS)) {
    const c = await store.composto(Number(cid));
    c.propriedades = { ...(c.propriedades ?? {}), entalpiaFormacaoKJmol: v };
    c.fontesPorPropriedade = { ...(c.fontesPorPropriedade ?? {}), entalpiaFormacaoKJmol: { fonte: 'wikidata', nome: 'Wikidata (P3078)', url: `https://www.wikidata.org/wiki/${c.wikidata ?? 'Q1'}`, licenca: 'CC0', condicoes: { fase } } };
  }
  return store;
}

function validar(r, q) {
  assert.equal(r.origem, 'LOCAL', q);
  assert.ok(!/NaN|undefined|\[object|null\b/.test(r.directAnswer), `${q}: lixo no texto: ${r.directAnswer.slice(0, 200)}`);
  for (const b of r.blocos) {
    const fs = Array.isArray(b.fonte) ? b.fonte : [b.fonte];
    assert.ok(fs.length && fs.every((f) => f && f.nome), `${q}: bloco ${b.tipo} sem fonte`);
  }
  validarTexDaResposta(r, q);
}

test('NLU: NOX com carga separada ("Cr2O7 2-") e íons; o gatilho "nox" não vira o composto NOx; sem composto continua PROPRIEDADE estadosOxidacao', async () => {
  const dic = new Dicionario(await lojaNova(DADOS), 'pt-BR');
  let p = parse('nox do cromo no Cr2O7 2-', dic);
  assert.deepEqual([p.intent, p.formula, p.cargaFormula, p.elemento], ['NOX', 'Cr2O7', -2, null], 'Cr não está no pacote de teste');
  p = parse('número de oxidação do Mn no MnO4-', dic);
  assert.deepEqual([p.intent, p.formula, p.cargaFormula], ['NOX', 'MnO4-', null]);
  p = parse('NOX do enxofre no H2SO4', dic);
  assert.deepEqual([p.intent, p.elemento, p.composto, p.formula], ['NOX', 'S', 1118, 'H2SO4']);
  p = parse('nox do nitrogênio no NH4+', dic);
  assert.deepEqual([p.intent, p.elemento, p.formula], ['NOX', 'N', 'NH4+']);
  assert.equal(parse('estados de oxidação do ferro', dic).intent, 'PROPRIEDADE');
  assert.equal(parse('massa molar do H2SO4', dic).intent, 'MASSA_MOLAR');
});

test('NLU: EQUILIBRIO exige equação (seta dupla mantida como ⇌), concentrações entre colchetes na ordem (antes ou depois da equação), temperatura nas quantidades', async () => {
  const dic = new Dicionario(await lojaNova(DADOS), 'pt-BR');
  let p = parse('calcule Kc de N2 + 3 H2 <=> 2 NH3 com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L', dic);
  assert.equal(p.intent, 'EQUILIBRIO');
  assert.equal(p.equacao, 'N2 + 3 H2 ⇌ 2 NH3');
  assert.deepEqual(p.concentracoes.map((c) => [c.especie, c.valor, c.unidade]), [['N2', 0.5, 'mol/L'], ['H2', 1.5, 'mol/L'], ['NH3', 0.2, 'mol/L']]);
  p = parse('com [N2O4] = 0,04 mol/L e [NO2] é 0,12 mol/L, qual o Kc de N2O4 ⇌ 2 NO2?', dic);
  assert.deepEqual([p.intent, p.equacao, p.concentracoes.map((c) => c.especie)], ['EQUILIBRIO', 'N2O4 ⇌ 2 NO2', ['N2O4', 'NO2']]);
  p = parse('Kp de 2 SO2 + O2 -> 2 SO3 a 500 K', dic);
  assert.deepEqual([p.intent, p.equacao], ['EQUILIBRIO', '2 SO2 + O2 -> 2 SO3']);
  assert.ok(p.quantidades.some((q) => q.valor === 500 && q.unidade === 'K'));
  assert.equal(parse('o que é Kc?', dic).intent, 'CONCEITO');
  assert.equal(parse('balancear N2 + H2 -> NH3', dic).intent, 'BALANCEAR', 'sem pista de equilíbrio continua BALANCEAR');
  const lex = lexico('en');
  assert.deepEqual(lerConcentracoes('[H2] = 1.5 mol/L and [I2] is 0.5 mol/L', null, lex).map((c) => [c.especie, c.valor]), [['H2', 1.5], ['I2', 0.5]]);
});

test('NLU: ENTALPIA (combustão, equação, Hess, ΔH) × PROPRIEDADE entalpiaFormacaoKJmol (formação de um composto) × CONCEITO; LIGACAO × CONCEITO × propriedade "ligações rotáveis"', async () => {
  const dic = new Dicionario(await lojaNova(DADOS), 'pt-BR');
  const casos = [
    ['ΔH da combustão do metano', 'ENTALPIA'], ['entalpia de formação da água', 'PROPRIEDADE'], ['ΔHf do metano', 'PROPRIEDADE'], ['o que é entalpia?', 'CONCEITO'],
    ['variação de entalpia de 2 H2 + O2 → 2 H2O', 'ENTALPIA'], ['entalpia da reação pela lei de Hess', 'ENTALPIA'], ['calor liberado na queima de 10 g de etanol', 'ENTALPIA'],
    ['quantos gramas de CO2 se formam na queima de 16 g de metano?', 'ESTEQUIOMETRIA'], ['tipo de ligação do NaCl', 'LIGACAO'], ['que ligação há entre H e Cl', 'LIGACAO'],
    ['o que é ligação iônica', 'CONCEITO'], ['número de ligações rotáveis da aspirina', 'PROPRIEDADE'], ['elétrons de valência do enxofre', 'PROPRIEDADE']
  ];
  for (const [q, intent] of casos) assert.equal(parse(q, dic).intent, intent, q);
  assert.equal(parse('entalpia de formação da água', dic).propriedade, 'entalpiaFormacaoKJmol');
  assert.equal(parse('ΔHf do metano', dic).propriedade, 'entalpiaFormacaoKJmol');
  assert.equal(parse('elétrons de valência do enxofre', dic).propriedade, 'configuracaoEletronica');
  const l = parse('que ligação há entre H e Cl', dic);
  assert.deepEqual([l.elemento, l.elementos], ['H', ['H', 'Cl']]);
});

test('respostas: combustão do metano ≈ −890 kJ/mol com os ΔHf° do pacote (fonte Wikidata CC0 + regra do O2 = 0), calor de uma amostra, equação digitada e Hess', async () => {
  const e = new Engine({ store: await lojaComEntalpias() });
  let r = await e.responder('ΔH da combustão do metano');
  validar(r, 'metano');
  assert.equal(r.intent, 'ENTALPIA');
  assert.equal(r.resolvida, true);
  assert.ok(Math.abs(r.dHporMol - -890.5) < 1e-9, `ΔH = ${r.dHporMol}`);
  assert.match(r.directAnswer, /−890,5 kJ\/mol/);
  assert.match(r.directAnswer, /exotérmica/);
  assert.ok(r.fontes.some((f) => f.licenca === 'CC0' && /Wikidata/.test(f.nome)), 'fonte do ΔHf°');
  assert.ok(r.fontes.some((f) => /ΔHf° = 0/.test(f.nome)), 'regra da substância simples');
  assert.match(r.directAnswer, /fase: líquido/, 'condições da medida (fase) da água');
  e.limparContexto();
  r = await e.responder('calor liberado na queima de 8 g de metano');
  validar(r, 'amostra');
  const amostra = r.blocos.find((b) => b.tipo === 'resultado').itens.find((i) => /8 g/.test(i.rotulo));
  assert.ok(amostra, 'calor da amostra');
  assert.match(amostra.valor, /^−4\d\d/, `q de 0,5 mol ≈ −445 kJ: ${amostra.valor}`);
  e.limparContexto();
  r = await e.responder('variação de entalpia da reação CH4 + 2 O2 -> CO2 + 2 H2O');
  validar(r, 'equação');
  assert.ok(Math.abs(r.dH - -890.5) < 1e-9);
  e.limparContexto();
  r = await e.responder('qual a entalpia de formação do metano?');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.match(r.directAnswer, /−74,6 kJ\/mol/);
  e.limparContexto();
  // falta o ΔHf° do NH3 no pacote: não calcula, diz qual falta
  r = await e.responder('variação de entalpia de N2 + 3 H2 -> 2 NH3');
  validar(r, 'falta');
  assert.equal(r.resolvida, false);
  assert.match(r.directAnswer, /não tem a entalpia padrão de formação \(ΔHf°\) de: NH₃/);
  assert.ok(!r.blocos.some((b) => b.tipo === 'resultado'), 'nenhum número inventado');
  e.limparContexto();
  r = await e.responder('entalpia da reação pela lei de Hess');
  validar(r, 'hess');
  assert.ok(r.acoes.some((a) => a.rota === '/quimica/calculadoras/entalpia?modo=hess'));
  const ab = new AnswerBuilder({ store: e.store, dic: e.dicionario() });
  const h = ab.respostaHess('C + 1/2 O2 -> CO', [{ equacao: 'C + O2 -> CO2', dH: -393.5 }, { equacao: 'CO + 1/2 O2 -> CO2', dH: -283.0 }]);
  validar(h, 'hess calc');
  assert.equal(h.dH, -110.5);
  assert.match(h.directAnswer, /invertida/);
});

test('respostas: NOX, ligação, Kc/Kp e configuração eletrônica com fonte e licença; sem ΔHf° no pacote, a combustão não é resolvida', async () => {
  const e = new Engine({ store: await lojaNova(DADOS) });
  let r = await e.responder('NOX do enxofre no H2SO4');
  validar(r, 'nox');
  assert.equal(r.titulo, 'NOX de enxofre em H₂SO₄: +6');
  assert.deepEqual(r.nox, [{ simbolo: 'H', nox: '1' }, { simbolo: 'O', nox: '-2' }, { simbolo: 'S', nox: '6' }]);
  assert.ok(r.fontes.some((f) => /Regras de NOX/.test(f.nome)));
  e.limparContexto();
  r = await e.responder('nox do carbono em C3H8');
  assert.match(r.directAnswer, /−8\/3/);
  assert.match(r.directAnswer, /NOX médio/);
  e.limparContexto();
  r = await e.responder('tipo de ligação do NaCl');
  validar(r, 'NaCl');
  assert.deepEqual(r.ligacoes, [{ a: 'Cl', b: 'Na', tipo: 'ionica', deltaEN: 2.23 }]);
  assert.match(r.directAnswer, /iônica/);
  assert.match(r.directAnswer, /convenção/);
  e.limparContexto();
  r = await e.responder('que ligação há entre H e Cl?');
  assert.equal(r.ligacoes[0].tipo, 'covalentePolar');
  e.limparContexto();
  r = await e.responder('a ligação no CO2 é polar ou apolar?');
  assert.match(r.directAnswer, /geometria/);
  e.limparContexto();
  r = await e.responder('calcule Kc de N2 + 3 H2 <=> 2 NH3 com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L a 500 K');
  validar(r, 'kc');
  assert.equal(r.intent, 'EQUILIBRIO');
  assert.ok(Math.abs(r.kc - 0.2 ** 2 / (0.5 * 1.5 ** 3)) < 1e-12);
  assert.equal(r.deltaN, -2);
  assert.match(r.directAnswer, /Kp/);
  assert.ok(r.fontes.some((f) => /CODATA/.test(f.nome)) && r.fontes.some((f) => /ação das massas/.test(f.nome)));
  e.limparContexto();
  r = await e.responder('Kc de N2 + 3 H2 ⇌ 2 NH3 com [N2] = 0,5 mol/L');
  assert.equal(r.resolvida, false);
  assert.match(r.directAnswer, /Faltam as concentrações no equilíbrio de: H₂ e NH₃/);
  e.limparContexto();
  r = await e.responder('configuração eletrônica do ferro');
  validar(r, 'Fe');
  const kv = r.blocos.find((b) => b.tipo === 'kv' && /Distribuição eletrônica/.test(b.titulo ?? ''));
  assert.ok(kv, 'bloco da distribuição');
  const v = Object.fromEntries(kv.itens.map((i) => [i.rotulo, i.valor]));
  assert.equal(v['Elétrons por camada'], '2, 8, 14, 2 (K, L, M, N)');
  assert.match(v['Notação completa (ordem de preenchimento, Linus Pauling)'], /4s² 3d⁶$/);
  assert.match(v['Camada de valência'], /^N \(n = 4\), 2/);
  assert.ok(r.acoes.some((a) => a.rota === '/quimica/calculadoras/configuracao-eletronica?el=Fe'));
  e.limparContexto();
  r = await e.responder('ΔH da combustão do metano');
  assert.equal(r.resolvida, false);
  assert.match(r.directAnswer, /pacote de dados não tem a entalpia padrão de formação \(ΔHf°\) de: CH₄, CO₂ e H₂O/);
  const ab = new AnswerBuilder({ store: e.store, dic: e.dicionario() });
  const fe2 = ab.respostaEletronica({ simbolo: 'Fe', carga: 2 });
  assert.equal(fe2.resolvida, true);
  assert.match(fe2.directAnswer, /2, 8, 14 \(K, L, M\)/);
});

test('respostas em inglês: os mesmos números, texto do catálogo en', async () => {
  definirIdioma('en');
  try {
    const e = new Engine({ store: await lojaComEntalpias() });
    let r = await e.responder('enthalpy of combustion of methane');
    validar(r, 'en metano');
    assert.match(r.directAnswer, /−890\.5 kJ\/mol/);
    assert.match(r.directAnswer, /exothermic/);
    e.limparContexto();
    r = await e.responder('oxidation number of sulfur in H2SO4');
    assert.equal(r.titulo, 'Oxidation number of sulfur in H₂SO₄: +6');
    e.limparContexto();
    r = await e.responder('what type of bond is in NaCl?');
    assert.match(r.directAnswer, /ionic/);
  } finally { definirIdioma('pt-BR'); }
});
