// Lacunas do mapa de perguntas de livros didáticos (17/10/2026), com as MESMAS entradas no Android (QuantidadesOrdemTest.kt):
//  A) estequiometria sem "quantos" ("massa de água formada a partir de 2 g de hidrogênio");
//  B) frações e numerais por extenso nas quantidades ("1/2 mol", "½ mol", "meio mol", "half a mole", "ein halbes Mol", "une demi-mole");
//  C) comparar/ordenar vários elementos ("ordem crescente de número atômico de Na, Ca, Fe e Cu"), com a lista ordenada antes da tabela.
// As palavras (numerais, verbos de reação, ordem) vêm do léxico (contracts/lexico/<idioma>.json); os casos golden ficam em contracts/nlu_golden_cases.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lojaNova, loja } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine } from '../src/quimica/js/engine.js';
import { definirIdioma } from '../src/quimica/js/i18n/index.js';
import { lerQuantidades, parse } from '../src/quimica/js/nlu.js';
import { lexico } from '../src/quimica/js/nlu/lex/index.js';

/** [idioma, texto, [[valor, unidade]…]] — espelho de QuantidadesOrdemTest.CASOS_QUANTIDADES. */
export const CASOS_QUANTIDADES = [
  ['pt-BR', 'massa de 1/2 mol de NaCl', [[0.5, 'mol']]],
  ['pt-BR', 'massa de ½ mol de NaCl', [[0.5, 'mol']]],
  ['pt-BR', 'massa de meio mol de NaCl', [[0.5, 'mol']]],
  ['pt-BR', 'Meio mol de água', [[0.5, 'mol']]],
  ['pt-BR', 'um mol de água', [[1, 'mol']]],
  ['pt-BR', 'dois mols de CO2 e três litros de O2', [[2, 'mol'], [3, 'L']]],
  ['pt-BR', '2 g de H2 e meio mol de O2', [[2, 'g'], [0.5, 'mol']]],
  ['pt-BR', 'um elemento do grupo 1', []],
  ['en', 'mass of half a mole of NaCl', [[0.5, 'mol']]],
  ['en', 'two moles of water', [[2, 'mol']]],
  ['en', 'mass of 1/4 mol of glucose', [[0.25, 'mol']]],
  ['es', 'masa de medio mol de agua', [[0.5, 'mol']]],
  ['es', 'dos moles de CO2', [[2, 'mol']]],
  ['de', 'Masse von einem halben Mol Wasser', [[0.5, 'mol']]],
  ['de', 'ein halbes Mol Wasser', [[0.5, 'mol']]],
  ['de', 'zwei Mol CO2', [[2, 'mol']]],
  ['fr', "masse d'une demi-mole d'eau", [[0.5, 'mol']]],
  ['fr', 'deux moles de CO2', [[2, 'mol']]]
];

test('quantidades: frações ("1/2", "½") e numerais por extenso do léxico, nos cinco idiomas, na ordem do texto', async () => {
  const store = await loja();
  for (const [idioma, texto, esperado] of CASOS_QUANTIDADES) {
    const q = lerQuantidades(texto, new Dicionario(store, idioma).unidades, lexico(idioma)).filter((x) => x.unidade);
    assert.deepEqual(q.map((x) => [x.valor, x.unidade]), esperado, `[${idioma}] ${texto}: ${JSON.stringify(q)}`);
  }
});

test('lacuna A: estequiometria sem "quantos" (verbo de reação ou pedido de massa/mols com quantidade); definição e massa molar não mudam', async () => {
  const store = await loja();
  const pt = new Dicionario(store, 'pt-BR');
  const r = parse('massa de água formada a partir de 2 g de hidrogênio', pt);
  assert.equal(r.intent, 'ESTEQUIOMETRIA');
  assert.equal(r.composto, 962);
  const meio = parse('massa de meio mol de NaCl', pt);
  assert.equal(meio.intent, 'ESTEQUIOMETRIA');
  assert.deepEqual(meio.quantidades.map((x) => [x.valor, x.unidade]), [[0.5, 'mol']]);
  assert.equal(parse('massa molar de 2 mol de NaCl', pt).intent, 'MASSA_MOLAR');
  assert.equal(parse('o que é um mol?', pt).intent, 'CONCEITO');
  assert.equal(parse('mass of water formed from 2 g of hydrogen', new Dicionario(store, 'en')).intent, 'ESTEQUIOMETRIA');
});

test('lacuna C: ordenar vários elementos é COMPARAR com a ordem pedida; a resposta traz a lista ordenada antes da tabela', async () => {
  const store = await loja();
  const pt = new Dicionario(store, 'pt-BR');
  const c = parse('ordem crescente de número atômico de Na, Ca, Fe e Cu', pt);
  assert.equal(c.intent, 'COMPARAR');
  assert.deepEqual(c.elementos, ['Na', 'Ca', 'Fe', 'Cu']);
  assert.equal(c.propriedade, 'numeroAtomico');
  assert.equal(c.ordem, 'crescente');
  const d = parse('coloque em ordem decrescente de eletronegatividade: Cl, S e O', pt);
  assert.equal(d.ordem, 'decrescente');
  assert.deepEqual(d.elementos, ['Cl', 'S', 'O']);
  // "qual tem maior X": decrescente; "F" e "K" sozinhos continuam ambíguos, mas numa lista com símbolo de duas letras viram elementos
  assert.equal(parse('qual tem maior raio atômico: Na ou Ca?', pt).ordem, 'decrescente');
  assert.deepEqual(parse('ordem decrescente de eletronegatividade: F, Cl e O', pt).elementos, ['F', 'Cl', 'O']);
  assert.deepEqual(parse('converta 300 K para °C', pt).elementos, []);

  definirIdioma('pt-BR');
  const e = new Engine({ store: await lojaNova() });
  const r = await e.responder('ordem crescente de número atômico de Na, Ca, Fe e Cu');
  assert.equal(r.intent, 'COMPARAR');
  assert.equal(r.blocos[0].tipo, 'texto', 'a lista ordenada vem antes da tabela');
  const txt = r.blocos[0].texto;
  const pos = ['(Na)', '(Ca)', '(Fe)', '(Cu)'].map((s) => txt.indexOf(s));
  assert.ok(pos.every((x, i) => x >= 0 && (i === 0 || x > pos[i - 1])), txt);
  assert.ok(txt.includes(' < ') && txt.includes('11'), txt);
  assert.ok(r.blocos[0].fonte, 'a frase tem fonte');
  const dr = await e.responder('coloque em ordem decrescente de eletronegatividade: Cl, S e O');
  const t2 = dr.blocos[0].texto;
  assert.ok(t2.indexOf('(O)') < t2.indexOf('(Cl)') && t2.indexOf('(Cl)') < t2.indexOf('(S)') && t2.includes(' > '), t2);
  for (const [idioma, q] of [['en', 'arrange Na, Ca, Fe and Cu in increasing order of atomic number'], ['es', 'ordena Na, Ca, Fe y Cu en orden creciente de número atómico'],
    ['de', 'Ordne Na, Ca, Fe und Cu nach aufsteigender Ordnungszahl'], ['fr', 'Classez Na, Ca, Fe et Cu par ordre croissant de numéro atomique']]) {
    definirIdioma(idioma);
    const ri = await new Engine({ store: await lojaNova() }).responder(q);
    assert.equal(ri.intent, 'COMPARAR', `[${idioma}] ${q}`);
    assert.equal(ri.blocos[0].tipo, 'texto', `[${idioma}] ${q}`);
    assert.ok(ri.blocos[0].texto.indexOf('(Na)') < ri.blocos[0].texto.indexOf('(Cu)'), `[${idioma}] ${ri.blocos[0].texto}`);
  }
  definirIdioma('pt-BR');
});
