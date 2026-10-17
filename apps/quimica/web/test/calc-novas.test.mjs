// Calculadoras novas (docs/CALCULADORAS_2026-10-17.md §2): entalpia (formação, combustão, Hess), configuração eletrônica, NOX, Kc/Kp e tipo de
// ligação. Casos clássicos de livro com dados de teste (ELEMENTOS abaixo: grupo, categoria, eletronegatividade de Pauling e configuração como no
// PubChem). Espelho no Android: domain/calc/*Test.kt (a portar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarContexto } from '../src/quimica/js/calc/contexto.js';
import { Frac } from '../src/quimica/js/calc/frac.js';
import { calcularNox, dadosElementosDoContexto, textoNox } from '../src/quimica/js/calc/nox.js';
import { aplicarCarga, distribuicaoEletronica, lerConfiguracao, ORDEM_PAULING, preencherMadelung, rotuloSubnivel, textoSubniveis } from '../src/quimica/js/calc/eletronica.js';
import { classeParaLigacao, ligacoesDe, paresDaFormula, tipoDeLigacao } from '../src/quimica/js/calc/ligacao.js';
import { calcularKc, expressaoEquilibrio, kpDeKc, lerEquacaoComEstados, rLitroAtm, temperaturaEmK } from '../src/quimica/js/calc/equilibrio.js';
import { calorDaAmostra, combinarHess, ehSubstanciaSimplesPadrao, equacaoDeCombustao, especiesDaEquacao, fracDe, somaPorFormacao } from '../src/quimica/js/calc/entalpia.js';
import { lerJson } from './support.mjs';
import { validarTex } from './tex.mjs';

// [símbolo, Z, grupo, categoria, eletronegatividade, configuração (PubChem)]
const ELEMENTOS = [
  ['H', 1, 1, 'nao_metal', 2.2, '1s1'], ['He', 2, 18, 'gas_nobre', null, '1s2'], ['Li', 3, 1, 'metal_alcalino', 0.98, '[He] 2s1'],
  ['B', 5, 13, 'semimetal', 2.04, '[He] 2s2 2p1'], ['C', 6, 14, 'nao_metal', 2.55, '[He] 2s2 2p2'], ['N', 7, 15, 'nao_metal', 3.04, '[He] 2s2 2p3'],
  ['O', 8, 16, 'nao_metal', 3.44, '[He] 2s2 2p4'], ['F', 9, 17, 'halogenio', 3.98, '[He] 2s2 2p5'], ['Na', 11, 1, 'metal_alcalino', 0.93, '[Ne] 3s1'],
  ['Mg', 12, 2, 'metal_alcalino_terroso', 1.31, '[Ne] 3s2'], ['Al', 13, 13, 'metal_pos_transicao', 1.61, '[Ne] 3s2 3p1'], ['S', 16, 16, 'nao_metal', 2.58, '[Ne] 3s2 3p4'],
  ['Cl', 17, 17, 'halogenio', 3.16, '[Ne] 3s2 3p5'], ['K', 19, 1, 'metal_alcalino', 0.82, '[Ar] 4s1'], ['Ca', 20, 2, 'metal_alcalino_terroso', 1, '[Ar] 4s2'],
  ['Cr', 24, 6, 'metal_transicao', 1.66, '[Ar] 3d5 4s1'], ['Mn', 25, 7, 'metal_transicao', 1.55, '[Ar] 4s2 3d5'], ['Fe', 26, 8, 'metal_transicao', 1.83, '[Ar] 4s2 3d6'],
  ['Cu', 29, 11, 'metal_transicao', 1.9, '[Ar] 4s1 3d10'], ['Ba', 56, 2, 'metal_alcalino_terroso', 0.89, '[Xe] 6s2'], ['I', 53, 17, 'halogenio', 2.66, '[Kr] 5s2 4d10 5p5'],
  ['Xe', 54, 18, 'gas_nobre', 2.6, '[Kr] 5s2 4d10 5p6'], ['La', 57, null, 'lantanideo', 1.1, '[Xe] 6s2 5d1'], ['Au', 79, 11, 'metal_transicao', 2.54, '[Xe] 6s1 4f14 5d10'],
  ['Og', 118, 18, 'gas_nobre', null, '[Rn] 7s2 7p6 5f14 6d10 (prevista)']
].map(([simbolo, z, grupo, categoria, eletronegatividade, configuracaoEletronica]) => ({ simbolo, z, grupo, categoria, eletronegatividade, configuracaoEletronica }));
const ctx = criarContexto({ elementos: ELEMENTOS, constantes: lerJson('constantes.json'), regras: lerJson('regras.json') });
const dados = dadosElementosDoContexto(ctx);
const el = (s) => ctx.porSimbolo.get(s) ?? null;
const nox = (f, op = {}) => {
  const r = calcularNox(f, { dados, ...op });
  assert.ok(r.ok, `${f}: ${js(r)}`);
  return Object.fromEntries(r.itens.map((i) => [i.simbolo, i.texto]));
};
const js = (x) => JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? String(v) : v));
const perto = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ------------------------------------------------------------------------------------------------ NOX
test('NOX: casos de livro (MnO4⁻ +7, Cr2O7²⁻ +6, H2SO4 S +6, C3H8 C −8/3 médio, H2O2 O −1, NaH H −1, NH4⁺ N −3) e a soma confere com a carga', () => {
  assert.deepEqual(nox('MnO4-'), { Mn: '+7', O: '−2' });
  assert.deepEqual(nox('Cr2O7 2-'), { Cr: '+6', O: '−2' });
  assert.deepEqual(nox('Cr2O7', { carga: -2 }), { Cr: '+6', O: '−2' }, 'carga separada (ParsedQuery.cargaFormula)');
  assert.deepEqual(nox('SO4^2-'), { O: '−2', S: '+6' });
  assert.deepEqual(nox('H2SO4'), { H: '+1', O: '−2', S: '+6' });
  assert.deepEqual(nox('C3H8'), { C: '−8/3', H: '+1' });
  assert.deepEqual(nox('H2O2'), { H: '+1', O: '−1' });
  assert.deepEqual(nox('NaH'), { H: '−1', Na: '+1' });
  assert.deepEqual(nox('NH4+'), { H: '+1', N: '−3' });
  assert.deepEqual(nox('KMnO4'), { K: '+1', Mn: '+7', O: '−2' });
  assert.deepEqual(nox('K2Cr2O7'), { Cr: '+6', K: '+1', O: '−2' });
  const r = calcularNox('C3H8', { dados });
  assert.equal(r.itens.find((i) => i.simbolo === 'C').medio, true);
  assert.equal(r.soma.toString(), '0');
  assert.equal(calcularNox('MnO4-', { dados }).soma.toString(), '-1');
});

test('NOX: peróxido, superóxido, OF2, hidretos, halogênio mais eletronegativo, substância simples, íon monoatômico e dois elementos sem regra (eletronegatividade)', () => {
  assert.deepEqual(nox('Na2O2'), { Na: '+1', O: '−1' });
  assert.deepEqual(nox('BaO2'), { Ba: '+2', O: '−1' });
  assert.deepEqual(nox('KO2'), { K: '+1', O: '−1/2' });
  assert.deepEqual(nox('OF2'), { F: '−1', O: '+2' });
  assert.deepEqual(nox('CaH2'), { Ca: '+2', H: '−1' });
  assert.deepEqual(nox('NaBH4'), { B: '+3', H: '−1', Na: '+1' }, 'semimetal do grupo 13 com metal: hidreto');
  assert.deepEqual(nox('Al2O3'), { Al: '+3', O: '−2' });
  assert.deepEqual(nox('KClO3'), { Cl: '+5', K: '+1', O: '−2' }, 'com O presente o Cl não é o mais eletronegativo');
  assert.deepEqual(nox('ICl'), { Cl: '−1', I: '+1' });
  assert.deepEqual(nox('HCl'), { Cl: '−1', H: '+1' });
  assert.deepEqual(nox('Cl2'), { Cl: '0' });
  assert.deepEqual(nox('Fe'), { Fe: '0' });
  assert.deepEqual(nox('Fe3+'), { Fe: '+3' });
  assert.deepEqual(nox('Fe3O4'), { Fe: '+8/3', O: '−2' });
  assert.deepEqual(nox('CS2'), { C: '+4', S: '−2' }, 'S mais eletronegativo: −2 do grupo 16');
  assert.deepEqual(nox('HCN'), { C: '+2', H: '+1', N: '−3' });
  assert.deepEqual(nox('CH4'), { C: '−4', H: '+1' });
  assert.equal(calcularNox('C3H8', { dados }).itens.find((i) => i.simbolo === 'C').regra, 'balanco');
  assert.equal(calcularNox('H2O2', { dados }).itens.find((i) => i.simbolo === 'O').regra, 'peroxido');
  assert.equal(calcularNox('KO2', { dados }).itens.find((i) => i.simbolo === 'O').regra, 'superoxido');
});

test('NOX: erros sem número inventado (fórmula inválida, hidrato, elemento sem dado no pacote) e textoNox', () => {
  assert.equal(calcularNox('Xy2', { dados }).erro, 'formula');
  assert.equal(calcularNox('CuSO4·5H2O', { dados }).erro, 'hidrato');
  const semDados = calcularNox('KMnO4', { dados: dadosElementosDoContexto(criarContexto({ elementos: ELEMENTOS.filter((e) => !['K', 'Mn'].includes(e.simbolo)) })) });
  assert.equal(semDados.ok, false);
  assert.deepEqual(semDados.faltam.sort(), ['K', 'Mn']);
  assert.equal(textoNox(new Frac(-8, 3)), '−8/3');
  assert.equal(textoNox(new Frac(6)), '+6');
  assert.equal(textoNox(new Frac(0)), '0');
});

// ------------------------------------------------------------------------------------------------ configuração eletrônica
test('configuração eletrônica: ordem de Madelung, Fe = 2, 8, 14, 2 com 4s2 3d6, Cr e Cu (exceções do pacote), valência e subnível mais energético', () => {
  assert.deepEqual(ORDEM_PAULING.slice(0, 10).map(rotuloSubnivel), ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d']);
  assert.equal(textoSubniveis(preencherMadelung(18)), '1s2 2s2 2p6 3s2 3p6');
  const fe = distribuicaoEletronica({ configuracao: '[Ar] 4s2 3d6', z: 26 });
  assert.ok(fe.ok);
  assert.equal(textoSubniveis(fe.ordemPauling), '1s2 2s2 2p6 3s2 3p6 4s2 3d6');
  assert.equal(textoSubniveis(fe.ordemCamadas), '1s2 2s2 2p6 3s2 3p6 3d6 4s2');
  assert.deepEqual(fe.camadas.map((c) => c.eletrons), [2, 8, 14, 2]);
  assert.deepEqual(fe.camadas.map((c) => c.camada), ['K', 'L', 'M', 'N']);
  assert.deepEqual([fe.camadaValencia.camada, fe.camadaValencia.eletrons], ['N', 2]);
  assert.equal(rotuloSubnivel(fe.subnivelMaisEnergetico) + fe.subnivelMaisEnergetico.e, '3d6');
  assert.equal(fe.bloco, 'd');
  assert.deepEqual([fe.eletronsValencia, fe.valenciaTipo], [8, 'ns+(n-1)d']);
  assert.equal(textoSubniveis(fe.ordemPauling, { sobrescrito: true }).endsWith('4s² 3d⁶'), true);
  const cr = distribuicaoEletronica({ configuracao: '[Ar] 3d5 4s1', z: 24 });
  assert.deepEqual(cr.camadas.map((c) => c.eletrons), [2, 8, 13, 1]);
  const cu = distribuicaoEletronica({ configuracao: '[Ar] 4s1 3d10', z: 29 });
  assert.deepEqual(cu.camadas.map((c) => c.eletrons), [2, 8, 18, 1]);
  const s = distribuicaoEletronica({ configuracao: '[Ne] 3s2 3p4', z: 16 });
  assert.deepEqual([s.camadaValencia.camada, s.eletronsValencia, s.valenciaTipo, s.bloco], ['M', 6, 'camada', 'p']);
  const au = distribuicaoEletronica({ configuracao: '[Xe] 6s1 4f14 5d10', z: 79 });
  assert.deepEqual(au.camadas.map((c) => c.eletrons), [2, 8, 18, 32, 18, 1]);
  const og = distribuicaoEletronica({ configuracao: '[Rn] 7s2 7p6 5f14 6d10 (prevista)', z: 118 });
  assert.ok(og.ok);
  assert.deepEqual(og.ignorados, ['(prevista)']);
  assert.deepEqual(og.camadas.map((c) => c.eletrons), [2, 8, 18, 32, 32, 18, 8]);
  assert.deepEqual(lerConfiguracao('1s² 2s² 2p⁶').subniveis.map((x) => x.e), [2, 2, 6]);
});

test('configuração eletrônica: íons (cátion perde da camada de maior n; ânion ganha na ordem de preenchimento) e total ≠ Z não é "corrigido"', () => {
  const fe2 = distribuicaoEletronica({ configuracao: '[Ar] 4s2 3d6', z: 26, carga: 2 });
  assert.equal(textoSubniveis(fe2.ordemCamadas), '1s2 2s2 2p6 3s2 3p6 3d6');
  const fe3 = distribuicaoEletronica({ configuracao: '[Ar] 4s2 3d6', z: 26, carga: 3 });
  assert.equal(textoSubniveis(fe3.ordemCamadas), '1s2 2s2 2p6 3s2 3p6 3d5');
  const cl = distribuicaoEletronica({ configuracao: '[Ne] 3s2 3p5', z: 17, carga: -1 });
  assert.deepEqual(cl.camadas.map((c) => c.eletrons), [2, 8, 8]);
  assert.equal(cl.totalEletrons, 18);
  assert.equal(textoSubniveis(aplicarCarga(lerConfiguracao('1s2 2s2 2p4').subniveis, -2)), '1s2 2s2 2p6');
  const errado = distribuicaoEletronica({ configuracao: '[Ar] 4s2 3d5', z: 26 });
  assert.deepEqual([errado.ok, errado.erro, errado.total, errado.esperado], [false, 'totalDiferente', 25, 26]);
  assert.equal(distribuicaoEletronica({ configuracao: '', z: 1 }).erro, 'semConfiguracao');
  assert.equal(distribuicaoEletronica({ configuracao: '1s1', z: 1, carga: 2 }).erro, 'cargaInvalida');
});

// ------------------------------------------------------------------------------------------------ tipo de ligação
test('tipo de ligação: NaCl iônica, HCl covalente polar, Cl2 apolar, Fe–Cu metálica, HF polar (não metal + não metal), gás nobre sem ligação', () => {
  const tipo = (x) => { const r = ligacoesDe({ ...x, elemento: el }); assert.ok(r.ok, JSON.stringify(r)); return r.ligacoes.map((l) => `${l.a}-${l.b}:${l.tipo}`); };
  assert.deepEqual(tipo({ formula: 'NaCl' }), ['Cl-Na:ionica']);
  assert.deepEqual(tipo({ formula: 'HCl' }), ['Cl-H:covalentePolar']);
  assert.deepEqual(tipo({ formula: 'Cl2' }), ['Cl-Cl:covalenteApolar']);
  assert.deepEqual(tipo({ simbolos: ['Fe', 'Cu'] }), ['Fe-Cu:metalica']);
  assert.deepEqual(tipo({ simbolos: ['H', 'Cl'] }), ['H-Cl:covalentePolar']);
  assert.deepEqual(tipo({ formula: 'HF' }), ['F-H:covalentePolar'], 'ΔEN 1,78 entre não metais: covalente polar (iônica exige metal)');
  assert.deepEqual(tipo({ formula: 'CO2' }), ['C-O:covalentePolar']);
  assert.deepEqual(tipo({ formula: 'CH4' }), ['C-H:covalenteApolar'], 'ΔEN 0,35 < 0,4');
  assert.deepEqual(tipo({ simbolos: ['Xe', 'Na'] }), ['Xe-Na:nenhuma']);
  const nacl = tipoDeLigacao(el('Na'), el('Cl'));
  assert.equal(nacl.deltaEN, 2.23);
  assert.deepEqual([nacl.enA, nacl.enB], [0.93, 3.16]);
  const naoh = ligacoesDe({ formula: 'NaOH', elemento: el });
  assert.equal(naoh.estimado, true);
  assert.deepEqual(naoh.ligacoes.map((l) => `${l.a}-${l.b}:${l.tipo}`), ['Na-O:ionica', 'H-O:covalentePolar']);
  assert.deepEqual(paresDaFormula(['H', 'S', 'O'], el).pares, [['H', 'O'], ['S', 'O']]);
  assert.equal(classeParaLigacao('semimetal'), 'naoMetal');
  assert.equal(ligacoesDe({ simbolos: ['He', 'F'], elemento: el }).ligacoes[0].tipo, 'nenhuma');
  const semEN = ligacoesDe({ simbolos: ['Og', 'F'], elemento: el });
  assert.equal(semEN.ligacoes[0].tipo, 'nenhuma');
  assert.equal(ligacoesDe({ formula: 'Xy', elemento: el }).erro, 'formula');
  assert.equal(ligacoesDe({ formula: 'NaCl', elemento: (s) => (s === 'Na' ? el('Na') : null) }).erro, 'semElemento');
});

// ------------------------------------------------------------------------------------------------ equilíbrio
test('Kc e Kp: N2 + 3 H2 ⇌ 2 NH3 (expressão, Δn = −2, Kc com as concentrações, Kp = Kc·(RT)^−2 com R do pacote), sólidos fora, setas aceitas', () => {
  const ex = expressaoEquilibrio('N2 + 3 H2 ⇌ 2 NH3');
  assert.ok(ex.ok);
  assert.equal(ex.texto, 'Kc = [NH₃]^2 / ([N₂]·[H₂]^3)');
  validarTex(ex.tex, 'Kc');
  assert.equal(ex.deltaN, -2);
  assert.deepEqual(ex.hipoteses, ['gasPorHipotese']);
  const kc = calcularKc(ex, [{ especie: 'N2', valor: 0.5 }, { especie: 'H2', valor: 1.5 }, { especie: 'NH3', valor: 0.2 }]);
  assert.ok(kc.ok);
  assert.ok(perto(kc.kc, 0.2 ** 2 / (0.5 * 1.5 ** 3)));
  const R = rLitroAtm(ctx);
  assert.ok(perto(R.valor, 0.0820574, 1e-5), `R = ${R.valor}`);
  const kp = kpDeKc({ deltaN: ex.deltaN, T: 500, rLatm: R.valor, kc: kc.kc });
  assert.ok(perto(kp.kp, kc.kc * (R.valor * 500) ** -2));
  assert.ok(perto(kp.fator, (R.valor * 500) ** -2));
  assert.equal(kpDeKc({ deltaN: 1, T: 0, rLatm: R.valor }).ok, false);
  assert.equal(temperaturaEmK({ valor: 25, unidade: '°C' }, ctx), 298.15);
  for (const seta of ['<=>', '<->', '⇄', '->', '→', '=']) assert.equal(expressaoEquilibrio(`H2 + I2 ${seta} 2 HI`).texto, 'Kc = [HI]^2 / ([H₂]·[I₂])', seta);
  const caco3 = expressaoEquilibrio('CaCO3(s) ⇌ CaO(s) + CO2(g)');
  assert.equal(caco3.texto, 'Kc = [CO₂]');
  assert.equal(caco3.deltaN, 1);
  assert.ok(caco3.hipoteses.includes('semSolidoLiquido'));
  const semCoef = expressaoEquilibrio('N2 + H2 -> NH3');
  assert.equal(semCoef.balanceada, true);
  assert.equal(semCoef.texto, ex.texto, 'sem coeficientes, balanceia antes');
  const agua = expressaoEquilibrio('CH4 + 2 O2 ⇌ CO2 + 2 H2O', { estadoDoPacote: (f) => (f === 'H2O' ? 'liquido' : null) });
  assert.equal(agua.texto, 'Kc = [CO₂] / ([CH₄]·[O₂]^2)', 'líquido pelo pacote sai da expressão');
  assert.ok(agua.hipoteses.includes('faseDoPacote'));
  const falta = calcularKc(ex, [{ especie: 'N2', valor: 0.5 }]);
  assert.deepEqual([falta.ok, falta.erro, falta.faltam], [false, 'faltamConcentracoes', ['H2', 'NH3']]);
  assert.equal(calcularKc(ex, [{ especie: 'N2', valor: 0 }, { especie: 'H2', valor: 1 }, { especie: 'NH3', valor: 1 }]).erro, 'concentracaoInvalida');
  assert.equal(expressaoEquilibrio('N2 + H2').erro, 'semSeta');
  const lida = lerEquacaoComEstados('1/2 N2(g) + 3/2 H2(g) ⇌ NH3(g)');
  assert.deepEqual(lida.reagentes.map((x) => [x.coef, x.formula, x.estado]), [[0.5, 'N2', 'g'], [1.5, 'H2', 'g']]);
});

// ------------------------------------------------------------------------------------------------ entalpia
test('entalpia por formação: combustão do metano ≈ −890 kJ/mol com ΔHf −74,6 / −393,5 / −285,8; O2 = 0 por definição; falta de ΔHf não vira número', () => {
  const comb = equacaoDeCombustao('CH4');
  assert.ok(comb.ok);
  assert.equal(comb.equacao, 'CH₄ + 2 O₂ → CO₂ + 2 H₂O');
  assert.equal(comb.coefComposto, 1);
  const dHf = { CH4: -74.6, CO2: -393.5, H2O: -285.8 };
  const r = somaPorFormacao(comb.especies.map((x) => ({ ...x, dHf: x.simples ? 0 : dHf[x.formula] ?? null })));
  assert.ok(r.ok);
  assert.ok(perto(r.dH, -890.5, 1e-9), `ΔH = ${r.dH}`);
  assert.equal(r.exotermica, true);
  const semAgua = somaPorFormacao(comb.especies.map((x) => ({ ...x, dHf: x.simples ? 0 : x.formula === 'H2O' ? null : dHf[x.formula] })));
  assert.deepEqual([semAgua.ok, semAgua.faltam], [false, ['H2O']]);
  const etanol = equacaoDeCombustao('C2H6O');
  assert.equal(etanol.equacao, 'C₂H₆O + 3 O₂ → 2 CO₂ + 3 H₂O');
  assert.equal(equacaoDeCombustao('C2H6').coefComposto, 2);
  assert.ok(equacaoDeCombustao('C2H7NO2S').ok, 'N e S também');
  assert.equal(equacaoDeCombustao('NaCl').erro, 'naoQueima');
  for (const f of ['O2', 'N2', 'H2', 'Cl2', 'Fe', 'C', 'S8', 'P4', 'Br2']) assert.equal(ehSubstanciaSimplesPadrao(f), true, f);
  for (const f of ['O3', 'O', 'H', 'H2O', 'Fe3+', 'Cl']) assert.equal(ehSubstanciaSimplesPadrao(f), false, f);
  const e = especiesDaEquacao('2 H2 + O2 -> 2 H2O');
  assert.deepEqual(e.especies.map((x) => [x.coef, x.formula, x.simples]), [[2, 'H2', true], [1, 'O2', true], [2, 'H2O', false]]);
  assert.equal(especiesDaEquacao('H2 + O2 -> H2O').balanceada, true);
  assert.deepEqual(calorDaAmostra({ dH: -890.5, coefComposto: 1, mol: 0.5 }), { q: -445.25, extensao: 0.5 });
  assert.deepEqual(calorDaAmostra({ dH: -3120, coefComposto: 2, mol: 1 }), { q: -1560, extensao: 0.5 });
});

test('lei de Hess: C + ½O2 → CO a partir de C → CO2 e CO → CO2 (−110,5 kJ); formação do metano por três combustões (−74,8 kJ); erros', () => {
  const co = combinarHess('C + 1/2 O2 -> CO', [{ equacao: 'C + O2 -> CO2', dH: -393.5 }, { equacao: 'CO + 1/2 O2 -> CO2', dH: -283.0 }]);
  assert.ok(co.ok, js(co));
  assert.ok(perto(co.dH, -110.5));
  assert.deepEqual(co.passos.map((p) => [p.indice, p.fator.toString(), p.invertida]), [[0, '1', false], [1, '-1', true]]);
  const ch4 = combinarHess('C(s) + 2 H2(g) -> CH4(g)', [
    { equacao: 'C(s) + O2(g) -> CO2(g)', dH: -393.5 }, { equacao: 'H2(g) + 1/2 O2(g) -> H2O(l)', dH: -285.8 }, { equacao: 'CH4(g) + 2 O2(g) -> CO2(g) + 2 H2O(l)', dH: -890.3 }
  ]);
  assert.ok(ch4.ok);
  assert.ok(perto(ch4.dH, -74.8));
  assert.deepEqual(ch4.passos.map((p) => p.fator.toString()), ['1', '2', '-1']);
  const semCoef = combinarHess('C + O2 -> CO', [{ equacao: 'C + O2 -> CO2', dH: -393.5 }, { equacao: '2 CO + O2 -> 2 CO2', dH: -566.0 }]);
  assert.ok(semCoef.ok, 'alvo sem coeficientes é balanceado antes (2 C + O2 → 2 CO)');
  assert.ok(perto(semCoef.dH, -221.0));
  assert.equal(combinarHess('C + O2 -> CO2', [{ equacao: 'H2 + O2 -> H2O', dH: -1 }]).erro, 'naoBalanceada');
  assert.equal(combinarHess('C + O2 -> CO2', [{ equacao: 'C + O2 -> CO2', dH: Number.NaN }]).erro, 'semDH');
  assert.equal(combinarHess('C + O2 -> CO2', [{ equacao: '2 H2 + O2 -> 2 H2O', dH: -571.6 }]).erro, 'semCombinacao');
  assert.equal(combinarHess('C + O2', []).erro, 'alvo');
  assert.equal(fracDe(0.5).toString(), '1/2');
  assert.equal(fracDe(1.5).toString(), '3/2');
});
