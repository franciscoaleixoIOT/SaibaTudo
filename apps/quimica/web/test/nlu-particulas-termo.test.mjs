// Contrato do NLU de 18/10/2026 (docs/CALCULADORAS_2026-10-17.md §7): propriedades energiaGibbsFormacaoKJmol (ΔGf°), entropiaPadraoJmolK (S°) e
// particulas (prótons, nêutrons e elétrons de um átomo ou íon), os campos só do cliente `cargaFormula` (íon) e `numeroMassa`, e Kc/Kp sem equação
// → CONCEITO. Só a INTERPRETAÇÃO (as respostas vêm em outra camada). Espelho Android: app/src/test/.../NluParticulasTermoTest.kt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loja } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { CONCEITO_CONSTANTE_EQUILIBRIO, lerIonsEIsotopo, parse } from '../src/quimica/js/nlu.js';
import { PROPRIEDADES_PADRAO } from '../src/quimica/js/propriedades.js';
import { validarNluNuvem } from '../src/quimica/js/nuvem.js';
import { lexico } from '../src/quimica/js/nlu/lex/index.js';
import { CATALOGOS } from '../src/quimica/js/i18n/index.js';

const store = await loja();
const dic = new Dicionario(store, 'pt-BR');
const dicEn = new Dicionario(store, 'en');
const resumo = (p) => ({ intent: p.intent, elemento: p.elemento, propriedade: p.propriedade, cargaFormula: p.cargaFormula, numeroMassa: p.numeroMassa });

test('ids novos no fim da lista de propriedades, com unidade e rótulo nos 5 catálogos', () => {
  const ids = PROPRIEDADES_PADRAO.map((p) => p.id);
  assert.deepEqual(ids.slice(-3), ['energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK', 'particulas']);
  const porId = Object.fromEntries(PROPRIEDADES_PADRAO.map((p) => [p.id, p]));
  assert.equal(porId.energiaGibbsFormacaoKJmol.unidade, 'kJ/mol');
  assert.equal(porId.entropiaPadraoJmolK.unidade, 'J/(mol·K)');
  assert.equal(porId.particulas.alvo, 'elemento');
  for (const [idioma, cat] of Object.entries(CATALOGOS)) {
    for (const id of ['energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK', 'particulas']) assert.ok(cat.propriedades.rotulos[id], `${idioma}: rótulo de ${id}`);
  }
  for (const idioma of ['pt-BR', 'en', 'es', 'de', 'fr']) {
    const lex = lexico(idioma);
    for (const id of ['energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK', 'particulas']) assert.ok(lex.propriedades[id]?.length >= 3, `${idioma}: formas de ${id}`);
    for (const k of ['deFormacao', 'constanteEquilibrio', 'ionRomano']) assert.ok(lex.pistas[k] instanceof RegExp, `${idioma}: pista ${k}`);
  }
});

test('lerIonsEIsotopo: símbolo + carga em todas as grafias, nome + carga, romano com íon, número de massa; fórmula de mais de um elemento não é íon', () => {
  const ion = (q) => { const r = lerIonsEIsotopo(q, dic); return r.ions.map((x) => [x.simbolo, x.carga]); };
  assert.deepEqual(ion('quantos elétrons tem o Fe2+?'), [['Fe', 2]]);
  assert.deepEqual(ion('Fe²⁺'), [['Fe', 2]]);
  assert.deepEqual(ion('o Fe+2'), [['Fe', 2]]);
  assert.deepEqual(ion('o Fe 2+'), [['Fe', 2]]);
  assert.deepEqual(ion('o Fe^{3+}'), [['Fe', 3]]);
  assert.deepEqual(ion('íon Cl-'), [['Cl', -1]]);
  assert.deepEqual(ion('íon Cl⁻'), [['Cl', -1]]);
  assert.deepEqual(ion('S2-'), [['S', -2]]);
  assert.deepEqual(ion('cátion Na+ e ânion Cl-'), [['Na', 1], ['Cl', -1]]);
  assert.deepEqual(ion('íon ferro 2+'), [['Fe', 2]]);
  assert.deepEqual(ion('íon ferro(III)'), [['Fe', 3]]);
  assert.deepEqual(lerIonsEIsotopo('iron(II) ion', dicEn, lexico('en')).ions.map((x) => [x.simbolo, x.carga]), [['Fe', 2]]);
  assert.deepEqual(ion('Fe + O2 -> Fe2O3'), [], '"Fe +" de uma equação não é íon');
  assert.deepEqual(ion('NOX do S no SO4 2-'), [], 'SO4 tem dois elementos');
  assert.deepEqual(ion('o íon OH-'), []);
  assert.deepEqual(ion('NO3-'), []);
  const iso = (q, pista = false) => lerIonsEIsotopo(q, dic, dic.lex, pista).isotopo;
  assert.deepEqual(iso('Fe-56'), { simbolo: 'Fe', numeroMassa: 56 });
  assert.deepEqual(iso('C-14'), { simbolo: 'C', numeroMassa: 14 });
  assert.deepEqual(iso('⁵⁶Fe'), { simbolo: 'Fe', numeroMassa: 56 });
  assert.deepEqual(iso('ferro-56'), { simbolo: 'Fe', numeroMassa: 56 });
  assert.deepEqual(iso('carbono-14'), { simbolo: 'C', numeroMassa: 14 });
  assert.deepEqual(iso('quantos nêutrons tem o carbono 14?'), { simbolo: 'C', numeroMassa: 14 });
  assert.equal(iso('56Fe'), null, 'sem sobrescrito e sem pista de partículas, "56Fe" não vale');
  assert.deepEqual(iso('56Fe', true), { simbolo: 'Fe', numeroMassa: 56 });
  assert.equal(iso('2Na', true), null, 'coeficiente (A < Z) não é número de massa');
  assert.equal(iso('C-200'), null, 'fora do intervalo plausível');
});

test('PROPRIEDADE particulas: átomo, íon (cargaFormula) e número de massa (numeroMassa); sem pista de partícula, íon = ELEMENTO com a carga', () => {
  const casos = [
    ['quantos prótons tem o ferro', { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: null, numeroMassa: null }],
    ['quantos prótons, nêutrons e elétrons tem o Fe2+?', { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: 2, numeroMassa: null }],
    ['quantos elétrons tem o íon Cl-', { intent: 'PROPRIEDADE', elemento: 'Cl', propriedade: 'particulas', cargaFormula: -1, numeroMassa: null }],
    ['quantos elétrons tem o íon ferro 2+', { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: 2, numeroMassa: null }],
    ['quantos nêutrons tem o carbono-14', { intent: 'PROPRIEDADE', elemento: 'C', propriedade: 'particulas', cargaFormula: null, numeroMassa: 14 }],
    ['número de massa do Fe-56', { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: null, numeroMassa: 56 }],
    ['quantos nêutrons tem o 56Fe', { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: null, numeroMassa: 56 }],
    ['quantas partículas subatômicas tem o oxigênio', { intent: 'PROPRIEDADE', elemento: 'O', propriedade: 'particulas', cargaFormula: null, numeroMassa: null }],
    ['o que é Fe2+', { intent: 'ELEMENTO', elemento: 'Fe', propriedade: null, cargaFormula: 2, numeroMassa: null }],
    ['ânion O2-', { intent: 'ELEMENTO', elemento: 'O', propriedade: null, cargaFormula: -2, numeroMassa: null }]
  ];
  for (const [q, esperado] of casos) assert.deepEqual(resumo(parse(q, dic)), esperado, q);
  // precedência: pistas mais específicas vencem
  assert.equal(parse('elétrons de valência do Na', dic).propriedade, 'configuracaoEletronica');
  assert.equal(parse('distribuição eletrônica do ferro', dic).propriedade, 'configuracaoEletronica');
  assert.equal(parse('número atômico do Fe', dic).propriedade, 'numeroAtomico');
  assert.equal(parse('o que são elétrons?', dic).intent, 'CONCEITO');
  assert.equal(parse('quantas partículas há em 2 mol de Fe', dic).intent, 'ESTEQUIOMETRIA', 'com quantidade, "partículas" é cálculo');
  // equação: nada de íon (semirreação continua BALANCEAR)
  const semi = parse('Fe2+ + 2 e- -> Fe', dic);
  assert.equal(semi.intent, 'BALANCEAR');
  assert.equal(semi.cargaFormula, null);
  // LIGACAO entre dois íons continua LIGACAO com os dois elementos
  const lig = parse('qual a ligação entre Na+ e Cl-', dic);
  assert.deepEqual([lig.intent, lig.elementos], ['LIGACAO', ['Na', 'Cl']]);
  // inglês
  assert.deepEqual(resumo(parse('how many electrons does Fe2+ have', dicEn)), { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: 2, numeroMassa: null });
  assert.deepEqual(resumo(parse('how many neutrons are in carbon-14', dicEn)), { intent: 'PROPRIEDADE', elemento: 'C', propriedade: 'particulas', cargaFormula: null, numeroMassa: 14 });
});

test('ΔGf° e S°: formas do léxico, ΔGf/ΔG°f/ΔG de formação, "entalpia livre de formação", COMPARAR; "o que é entropia" segue CONCEITO', () => {
  const p = (q, d = dic) => { const r = parse(q, d); return [r.intent, r.propriedade, r.composto]; };
  assert.deepEqual(p('energia livre de Gibbs de formação do CO2'), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 280]);
  assert.deepEqual(p('ΔGf do metano'), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 297]);
  assert.deepEqual(p('ΔG°f da água'), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 962]);
  assert.deepEqual(p('ΔG de formação da amônia'), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 222]);
  assert.deepEqual(p('entalpia livre de formação da água'), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 962]);
  assert.deepEqual(p('ΔH de formação do metano'), ['PROPRIEDADE', 'entalpiaFormacaoKJmol', 297]);
  assert.deepEqual(p('ΔH da combustão do metano'), ['ENTALPIA', null, 297]);
  assert.deepEqual(p('entropia padrão da água'), ['PROPRIEDADE', 'entropiaPadraoJmolK', 962]);
  assert.deepEqual(p('qual a entropia do metano?'), ['PROPRIEDADE', 'entropiaPadraoJmolK', 297]);
  assert.deepEqual(p('qual tem maior entropia padrão, água ou metano?'), ['COMPARAR', 'entropiaPadraoJmolK', 962]);
  assert.deepEqual(p('what is the standard Gibbs free energy of formation of water', dicEn), ['PROPRIEDADE', 'energiaGibbsFormacaoKJmol', 962]);
  assert.deepEqual(p('standard molar entropy of methane', dicEn), ['PROPRIEDADE', 'entropiaPadraoJmolK', 297]);
  assert.equal(parse('o que é entropia?', dic).intent, 'CONCEITO');
  assert.equal(parse('explique entropia', dic).intent, 'CONCEITO');
});

test('Kc/Kp sem equação → CONCEITO "constante de equilibrio"; com equação continua EQUILIBRIO', () => {
  for (const q of ['qual o Kp a 500 K', 'como calcular o Kc', 'calcule o Kc da reação', 'o que é Kc', 'fórmula do Kp', 'constante de equilíbrio']) {
    const r = parse(q, dic);
    assert.deepEqual([r.intent, r.conceito, r.propriedade], ['CONCEITO', CONCEITO_CONSTANTE_EQUILIBRIO, null], q);
  }
  assert.deepEqual([parse('how to calculate Kp', dicEn).intent, parse('how to calculate Kp', dicEn).conceito], ['CONCEITO', CONCEITO_CONSTANTE_EQUILIBRIO]);
  assert.equal(parse('expressão do Kc para N2 + 3 H2 ⇌ 2 NH3', dic).intent, 'EQUILIBRIO');
  assert.equal(parse('Kp de 2 SO2 + O2 -> 2 SO3 a 500 K', dic).intent, 'EQUILIBRIO');
});

test('nuvem: o modelo não emite cargaFormula/numeroMassa/conceito; o cliente os mescla da interpretação local (mesmo elemento)', () => {
  let p = validarNluNuvem({ intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas' }, dic, 'quantos elétrons tem o Fe2+?');
  assert.deepEqual(resumo(p), { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'particulas', cargaFormula: 2, numeroMassa: null });
  p = validarNluNuvem({ intent: 'PROPRIEDADE', elemento: 'C', propriedade: 'particulas' }, dic, 'quantos nêutrons tem o carbono-14?');
  assert.equal(p.numeroMassa, 14);
  // a nuvem copiou o íon como composto: vira o elemento com a carga
  p = validarNluNuvem({ intent: 'ELEMENTO', composto: 'Fe2+' }, dic, 'o que é Fe2+');
  assert.deepEqual([p?.intent, p?.elemento, p?.cargaFormula, p?.formula], ['ELEMENTO', 'Fe', 2, null]);
  // outro elemento que o da pergunta: a carga não passa
  p = validarNluNuvem({ intent: 'PROPRIEDADE', elemento: 'Cl', propriedade: 'particulas' }, dic, 'quantos elétrons tem o Fe2+ e o cloro?');
  assert.equal(p.cargaFormula, null);
  // Kc sem equação: a nuvem diz só CONCEITO; o assunto vem do cliente
  p = validarNluNuvem({ intent: 'CONCEITO' }, dic, 'como calcular o Kc');
  assert.deepEqual([p.intent, p.conceito], ['CONCEITO', CONCEITO_CONSTANTE_EQUILIBRIO]);
  // NOX: carga escrita separada da fórmula
  p = validarNluNuvem({ intent: 'NOX', elemento: 'S', composto: 'SO4' }, dic, 'NOX do S no SO4 2-');
  assert.equal(p?.cargaFormula ?? null, -2);
});
