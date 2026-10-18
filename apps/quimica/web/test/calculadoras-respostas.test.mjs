// Intenções NOX, ENTALPIA, EQUILIBRIO e LIGACAO e a resposta enriquecida de configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §1, §2, §4):
// regras do NLU local (campos só do cliente: `concentracoes`, `cargaFormula`), respostas com fonte e licença em cada bloco, números só do pacote
// ou do cálculo, e falta de ΔHf° → `resolvida: false` dizendo o que falta. O pacote de teste não traz `entalpiaFormacaoKJmol`: os testes de
// entalpia acrescentam o campo, com a fonte, em alguns compostos da loja (fixture própria em memória). Espelho no Android (a portar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DADOS, DADOS_REAIS, lojaNova } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine } from '../src/quimica/js/engine.js';
import { AnswerBuilder, cargaSobrescrita, notacaoEspecie } from '../src/quimica/js/answers.js';
import { MEDIDAS_COMPOSTO, medidasDoComposto } from '../src/quimica/js/propriedades.js';
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

// ------------------------------------------------------------------------------------------------ camada de respostas de 18/10/2026
// (docs/CALCULADORAS_2026-10-17.md §7): ΔGf°/S° como ΔHf° (valor, estado padrão, fonte por valor do chembox, "falta" sem estimar), ficha com as
// três medidas termoquímicas, partículas por regra (íon, isótopo, aproximação rotulada), CONCEITO de Kc/Kp com a ação da calculadora e fonte
// sem repetir no mesmo bloco (LIGACAO com H e Cl citava a fonte do PubChem duas vezes).
const TERMO = {
  // cid: { campo: [valor, fase da fonte | null] } — como o pipeline grava (chembox da Wikipédia en, CC BY-SA 4.0, permalink com oldid)
  962: { entalpiaFormacaoKJmol: [-285.83, 'liquido'], entropiaPadraoJmolK: [69.95, 'liquido'] },
  280: { entalpiaFormacaoKJmol: [-393.5, 'gas'], energiaGibbsFormacaoKJmol: [-394.39, 'gas'], entropiaPadraoJmolK: [213.785, null] },
  297: { entalpiaFormacaoKJmol: [-74.6, null], energiaGibbsFormacaoKJmol: [-50.5, null], entropiaPadraoJmolK: [186.3, null] }
};
const CAMPO_CHEMBOX = { entalpiaFormacaoKJmol: 'DeltaHf', energiaGibbsFormacaoKJmol: 'DeltaGf', entropiaPadraoJmolK: 'Entropy' };
async function lojaComTermo() {
  const store = await lojaNova(DADOS);
  for (const [cid, campos] of Object.entries(TERMO)) {
    const c = await store.composto(Number(cid));
    for (const [campo, [v, fase]] of Object.entries(campos)) {
      c.propriedades = { ...(c.propriedades ?? {}), [campo]: v };
      c.fontesPorPropriedade = { ...(c.fontesPorPropriedade ?? {}), [campo]: { nome: `Wikipedia (en): Artigo ${cid}`, url: `https://en.wikipedia.org/w/index.php?title=Artigo_${cid}&oldid=1380000${cid}`, licenca: 'CC BY-SA 4.0', acessadoEm: '2026-10-18', campoOriginal: CAMPO_CHEMBOX[campo], valorOriginal: v, ...(fase ? { condicoes: { fase } } : {}) } };
    }
    if (Number(cid) === 297) c.propriedades.estadoPadrao = 'gas'; // fase do estado padrão quando a fonte não a marca
  }
  return store;
}
const fontesRepetidas = (r) => r.blocos.filter((b) => Array.isArray(b.fonte)).filter((b) => new Set(b.fonte.map((f) => `${f.nome}|${f.url ?? ''}|${f.licenca ?? ''}|${f.detalhe ?? ''}`)).size !== b.fonte.length);

test('ΔGf° e S°: valor com unidade (até 2 casas), estado padrão, fonte com permalink e CC BY-SA 4.0; "falta ΔGf° de X" sem estimar; COMPARAR maior e mais negativo', async () => {
  const e = new Engine({ store: await lojaComTermo() });
  const R = async (q) => { e.limparContexto(); const r = await e.responder(q); validar(r, q); return r; };
  let r = await R('qual a entropia do CO2?');
  assert.deepEqual([r.intent, r.resolvida], ['PROPRIEDADE', true]);
  assert.match(r.directAnswer, /Entropia molar padrão de Dióxido de carbono: 213,79 J\/\(mol·K\) — estado padrão a 298,15 K \(25 °C\)/, 'arredonda a 2 casas');
  const f = r.fontes.find((x) => /Wikipedia \(en\)/.test(x.nome));
  assert.ok(f && f.licenca === 'CC BY-SA 4.0' && /oldid=\d+/.test(f.url), `fonte por valor: ${JSON.stringify(r.fontes)}`);
  assert.equal(f.detalhe, 'campo Entropy do chembox');
  r = await R('ΔGf do metano');
  assert.equal(r.titulo, 'Energia livre de Gibbs padrão de formação de Metano');
  assert.match(r.directAnswer, /: −50,5 kJ\/mol — estado padrão a 298,15 K \(25 °C\); fase: gás \(estado físico do composto a 25 °C\)/, 'sem fase na fonte: a do estado padrão');
  r = await R('energia livre de Gibbs de formação do CO2');
  assert.match(r.directAnswer, /−394,39 kJ\/mol — estado padrão a 298,15 K \(25 °C\); fase: gás$/m, 'fase marcada pela fonte');
  // a água não tem ΔGf° no pacote (como no pacote real): diz o que falta e o que há, sem número de ΔGf°
  r = await R('ΔGf da água');
  assert.equal(r.resolvida, true, 'falta de dado não é falha de interpretação');
  assert.match(r.directAnswer, /Falta ΔGf° de água no pacote de dados; o aplicativo não estima esse valor\./);
  assert.match(r.directAnswer, /Para Água, o pacote traz: entalpia padrão de formação \(−285,83 kJ\/mol\) e entropia molar padrão \(69,95 J\/\(mol·K\)\)/);
  assert.ok(!/Energia livre de Gibbs padrão de formação de Água: /.test(r.directAnswer), 'nenhum valor estimado');
  // COMPARAR (regra local: "qual tem menor …"): maior e mais negativo, com a fonte de cada valor
  r = await R('qual tem menor energia livre de Gibbs de formação: metano ou CO2?');
  assert.equal(r.intent, 'COMPARAR');
  assert.match(r.directAnswer, /Energia livre de Gibbs padrão de formação: maior em Metano \(−50,5 kJ\/mol\)\./);
  assert.match(r.directAnswer, /Energia livre de Gibbs padrão de formação: mais negativo em Dióxido de carbono \(−394,39 kJ\/mol\)\./);
  assert.match(r.directAnswer, /Energia livre de Gibbs padrão de formação, em ordem crescente: Dióxido de carbono −394,39 kJ\/mol < Metano −50,5 kJ\/mol/);
  assert.ok(r.fontes.filter((x) => x.licenca === 'CC BY-SA 4.0').length >= 2);
  r = await R('qual tem menor energia livre de Gibbs de formação: água ou CO2?');
  assert.match(r.directAnswer, /Falta ΔGf° de água no pacote de dados/);
  r = await R('qual tem maior entropia padrão, água ou metano?');
  assert.equal(r.intent, 'COMPARAR');
  assert.match(r.directAnswer, /Entropia molar padrão: maior em Metano \(186,3 J\/\(mol·K\)\)\./);
  assert.ok(!/Entropia molar padrão: mais negativo/.test(r.directAnswer), '"mais negativo" só nas energias');
  // "ΔGf" com Δ cai em PROPRIEDADE (regra do Δ do NLU): com dois compostos a resposta também diz o maior e o mais negativo
  r = await R('qual tem o ΔGf mais negativo, metano ou CO2?');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.match(r.directAnswer, /mais negativo em Dióxido de carbono \(−394,39 kJ\/mol\)/);
  // ΔHf° segue igual (molde): 2 casas no máximo, sem zeros inventados
  r = await R('entalpia de formação do metano');
  assert.match(r.directAnswer, /−74,6 kJ\/mol/);
  assert.ok(!/−74,60/.test(r.directAnswer));
});

test('ficha do composto: ΔHf°, ΔGf° e S° depois das medidas atuais, cada um com a sua fonte (água, CO2 e metano)', async () => {
  assert.deepEqual(MEDIDAS_COMPOSTO.slice(-3), ['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK']);
  assert.deepEqual(MEDIDAS_COMPOSTO.slice(0, 6), ['estadoPadrao', 'pontoFusaoK', 'pontoEbulicaoK', 'densidadeKgm3', 'solubilidade', 'pka']);
  const store = await lojaComTermo();
  const dic = new Dicionario(store, 'pt-BR');
  const ab = new AnswerBuilder({ store, dic });
  const esperado = { 962: ['entalpiaFormacaoKJmol', 'entropiaPadraoJmolK'], 280: ['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK'], 297: ['estadoPadrao', 'entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK'] };
  for (const [cid, ids] of Object.entries(esperado)) {
    const c = await store.composto(Number(cid));
    const ms = medidasDoComposto(c, dic.props, store.ctx);
    assert.deepEqual(ms.map((m) => m.prop.id), ids, `ficha ${cid}`);
    for (const m of ms.filter((x) => x.prop.id !== 'estadoPadrao')) {
      assert.ok(m.fontes.length === 1 && m.fontes[0].licenca === 'CC BY-SA 4.0' && /oldid=/.test(m.fontes[0].url), `${cid} ${m.prop.id}: fonte`);
      assert.ok(m.condicoes.includes('estado padrão a 298,15 K (25 °C)'), `${cid} ${m.prop.id}: condições ${m.condicoes}`);
    }
    const r = ab.fichaResumida(c, {});
    validar(r, `ficha ${cid}`);
    const kv = r.blocos.find((b) => b.tipo === 'kv' && b.titulo === 'Propriedades físicas');
    assert.ok(kv, `ficha ${cid}: bloco das medidas`);
    assert.equal(kv.fonte.filter((x) => x.licenca === 'CC BY-SA 4.0').length, ids.filter((i) => i !== 'estadoPadrao').length, `ficha ${cid}: uma fonte por valor`);
  }
  const co2 = ab.fichaResumida(await store.composto(280), {});
  const v = Object.fromEntries(co2.blocos.find((b) => b.titulo === 'Propriedades físicas').itens.map((i) => [i.rotulo, i.valor]));
  assert.equal(v['Entalpia padrão de formação'], '−393,5 kJ/mol — estado padrão a 298,15 K (25 °C); fase: gás');
  assert.equal(v['Energia livre de Gibbs padrão de formação'], '−394,39 kJ/mol — estado padrão a 298,15 K (25 °C); fase: gás');
  assert.equal(v['Entropia molar padrão'], '213,79 J/(mol·K) — estado padrão a 298,15 K (25 °C)');
});

test('ficha no pacote real (se houver): água, CO2 e metano trazem a termoquímica com a fonte do chembox', { skip: !DADOS_REAIS }, async () => {
  const store = await lojaNova(DADOS_REAIS);
  const dic = new Dicionario(store, 'pt-BR');
  for (const cid of [962, 280, 297]) {
    const c = await store.composto(cid);
    const ms = medidasDoComposto(c, dic.props, store.ctx).filter((m) => ['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK'].includes(m.prop.id));
    assert.ok(ms.some((m) => m.prop.id === 'entalpiaFormacaoKJmol'), `${cid}: ΔHf° na ficha`);
    for (const m of ms) assert.ok(m.fontes.length && m.fontes.every((f) => f.licenca && f.url), `${cid} ${m.prop.id}: fonte com link e licença`);
  }
});

test('partículas: prótons = Z, elétrons = Z − carga (íon nomeado, com a conta), nêutrons = A − Z exato com o isótopo e ROTULADO como aproximação sem ele', async () => {
  const e = new Engine({ store: await lojaNova(DADOS) });
  const R = async (q) => { e.limparContexto(); const r = await e.responder(q); validar(r, q); return r; };
  let r = await R('quantos prótons, nêutrons e elétrons tem o Fe2+?');
  assert.deepEqual([r.intent, r.resolvida], ['PROPRIEDADE', true]);
  assert.equal(r.titulo, 'Fe²⁺: 26 prótons, 24 elétrons e cerca de 30 nêutrons');
  assert.deepEqual(r.particulas, [{ simbolo: 'Fe', protons: 26, eletrons: 24, neutrons: 30, numeroMassa: 56, carga: 2, aproximado: true }]);
  assert.match(r.directAnswer, /Espécie: cátion Fe²⁺ \(ferro\)/);
  assert.match(r.directAnswer, /Elétrons: 24 \(26 − 2 = 24\)/);
  assert.match(r.directAnswer, /Nêutrons: cerca de 30 \(A − Z ≈ 56 − 26\)/);
  assert.match(r.directAnswer, /Número de massa aproximado pela massa atômica \(55,845 → 56\); o número de nêutrons depende do isótopo/);
  assert.ok(r.fontes.some((x) => /PubChem/.test(x.nome)) && r.fontes.some((x) => /Contagem por regra/.test(x.nome)), 'fonte do elemento + regra');
  assert.ok(r.acoes.some((a) => a.rota === '/quimica/calculadoras/configuracao-eletronica?el=Fe&q=2'));
  r = await R('quantos nêutrons tem o carbono-14');
  assert.equal(r.titulo, '¹⁴C: 6 prótons, 8 nêutrons e 6 elétrons');
  assert.match(r.directAnswer, /Espécie: isótopo ¹⁴C \(carbono\)/);
  assert.match(r.directAnswer, /Nêutrons: 8 \(A − Z = 14 − 6\)/);
  assert.ok(!/aproximad|cerca de/.test(r.directAnswer), 'com o número de massa da pergunta, nada de aproximação');
  r = await R('número de massa do Fe-56');
  assert.equal(r.titulo, '⁵⁶Fe: 26 prótons, 30 nêutrons e 26 elétrons');
  r = await R('quantos elétrons tem o íon Cl-');
  assert.match(r.directAnswer, /Espécie: ânion Cl⁻ \(cloro\)/);
  assert.match(r.directAnswer, /Elétrons: 18 \(17 \+ 1 = 18\)/);
  r = await R('quantos prótons tem o ferro');
  assert.equal(r.titulo, 'Fe: 26 prótons, 26 elétrons e cerca de 30 nêutrons');
  assert.match(r.directAnswer, /Espécie: átomo neutro de ferro/);
  // ELEMENTO com cargaFormula ("o que é Fe2+"): a ficha do elemento + a linha do íon
  r = await R('o que é Fe2+');
  assert.equal(r.intent, 'ELEMENTO');
  assert.match(r.directAnswer, /Íon Fe²⁺ \(cátion\): 24 elétrons \(26 − 2 = 24\)\./);
  assert.match(r.directAnswer, /Número atômico: 26/);
  assert.ok(!/Prótons, nêutrons e elétrons:/.test(r.directAnswer), 'a propriedade calculada não vira linha da ficha');
  r = await R('ânion O2-');
  assert.match(r.directAnswer, /Íon O²⁻ \(ânion\): 10 elétrons \(8 \+ 2 = 10\)\./);
  // carga impossível: não inventa elétrons negativos
  const ab = new AnswerBuilder({ store: e.store, dic: e.dicionario() });
  const h = ab.blocosParticulas(e.store.porSimbolo.get('H'), 3);
  assert.equal(h.ok, false);
  assert.match(h.blocos[0].texto, /A carga \+3 tiraria mais elétrons do que hidrogênio tem \(1\)/);
  assert.equal(notacaoEspecie('Fe', 3, 56), '⁵⁶Fe³⁺');
  assert.deepEqual([cargaSobrescrita(1), cargaSobrescrita(-1), cargaSobrescrita(-2), cargaSobrescrita(0)], ['⁺', '⁻', '²⁻', '']);
  definirIdioma('en');
  try {
    const en = new Engine({ store: e.store });
    r = await en.responder('how many electrons does Fe2+ have');
    validar(r, 'en Fe2+');
    assert.equal(r.titulo, 'Fe²⁺: 26 protons, 24 electrons and about 30 neutrons');
    assert.match(r.directAnswer, /Fe²⁺ cation \(iron\)/);
    assert.match(r.directAnswer, /the number of neutrons depends on the isotope/);
    en.limparContexto();
    r = await en.responder('how many neutrons are in carbon-14');
    assert.equal(r.titulo, '¹⁴C: 6 protons, 8 neutrons and 6 electrons');
  } finally { definirIdioma('pt-BR'); }
});

test('CONCEITO "constante de equilibrio" (Kc/Kp sem equação): explicação por regra, pedido da equação e ação que abre o cartão Kc/Kp (temperatura pré-preenchida)', async () => {
  const e = new Engine({ store: await lojaNova(DADOS) });
  const R = async (q) => { e.limparContexto(); const r = await e.responder(q); validar(r, q); return r; };
  let r = await R('como calcular o Kc');
  assert.deepEqual([r.intent, r.resolvida, r.conceito], ['CONCEITO', true, 'constante de equilibrio']);
  assert.equal(r.titulo, 'Constante de equilíbrio (Kc e Kp)');
  assert.match(r.directAnswer, /Kc = \[C\]\^c·\[D\]\^d \/ \(\[A\]\^a·\[B\]\^b\)/);
  assert.match(r.directAnswer, /Só entram gases e espécies em solução aquosa/);
  assert.match(r.directAnswer, /Kp = Kc·\(RT\)\^Δn/);
  assert.match(r.directAnswer, /Me dê a equação \(ex\.: N2 \+ 3 H2 ⇌ 2 NH3\) e eu monto a expressão\./);
  assert.equal(r.blocos.filter((b) => b.tipo === 'equacao').length, 2, 'Kc e Kp em TeX (validados pelo KaTeX)');
  assert.ok(r.fontes.some((x) => /ação das massas/.test(x.nome)));
  assert.deepEqual(r.acoes.map((a) => [a.rota, a.rotulo]), [['/quimica/calculadoras/equilibrio', 'Abrir a calculadora de Kc e Kp']]);
  r = await R('qual o Kp a 500 K');
  assert.equal(r.intent, 'CONCEITO');
  assert.equal(r.temperaturaK, 500);
  assert.match(r.directAnswer, /A temperatura da pergunta \(500 K\) já vai preenchida na calculadora\./);
  assert.equal(r.acoes[0].rota, '/quimica/calculadoras/equilibrio?t=500&ut=K');
  r = await R('expressão do Kc para N2 + 3 H2 ⇌ 2 NH3');
  assert.equal(r.intent, 'EQUILIBRIO', 'com equação continua a calculadora');
  definirIdioma('en');
  try {
    const en = new Engine({ store: e.store });
    r = await en.responder('how to calculate Kp');
    validar(r, 'en Kp');
    assert.equal(r.titulo, 'Equilibrium constant (Kc and Kp)');
    assert.match(r.directAnswer, /Give me the equation \(e\.g\. N2 \+ 3 H2 ⇌ 2 NH3\) and I will write the expression\./);
  } finally { definirIdioma('pt-BR'); }
});

test('fontes: a mesma fonte não se repete dentro de um bloco (LIGACAO entre H e Cl citava o PubChem duas vezes)', async () => {
  const e = new Engine({ store: await lojaComTermo() });
  for (const q of ['que ligação há entre H e Cl?', 'tipo de ligação do NaCl', 'tipo de ligação da água', 'qual tem menor energia livre de Gibbs de formação: metano ou CO2?', 'quantos elétrons tem o Fe2+?', 'compare sódio e cloro']) {
    e.limparContexto();
    const r = await e.responder(q);
    validar(r, q);
    assert.deepEqual(fontesRepetidas(r), [], `${q}: fonte repetida num bloco`);
  }
  e.limparContexto();
  const r = await e.responder('que ligação há entre H e Cl?');
  const res = r.blocos.find((b) => b.tipo === 'resultado');
  assert.equal(res.fonte.filter((x) => /PubChem/.test(x.nome)).length, 1, 'uma linha do PubChem');
});
