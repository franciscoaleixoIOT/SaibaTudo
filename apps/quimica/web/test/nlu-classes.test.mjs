// "o que é um sal?" pergunta pela CLASSE, não pela ficha do composto que o pacote liga ao apelido ("sal" → NaCl, "açúcar" → sacarose; desde
// o pacote de 17/10). Mesma regra no Android (LocalNluTest/NluClassesTest). Os casos que dependem dos apelidos rodam com o pacote de DATA_DIR quando ele
// os tem (ex.: DATA_DIR=local/pacote-l); os do golden (contracts/nlu_golden_cases.json) valem em qualquer pacote.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DADOS, loja } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { parse, temaDoConceito } from '../src/quimica/js/nlu.js';
import { lexico } from '../src/quimica/js/nlu/lex/index.js';

const NACL = 5234;
const SACAROSE = 5988;

test('substantivos de classe: temas de conceito do léxico e a lista dos cinco idiomas; uma palavra só', async () => {
  const store = await loja();
  const pt = new Dicionario(store, 'pt-BR');
  for (const w of ['sal', 'açúcar', 'ácido', 'base', 'óxido', 'álcool', 'Zucker', 'sucre', 'sugar']) assert.ok(pt.ehClasseDeCompostos(w), w);
  for (const w of ['sal de cozinha', 'cloreto de sodio', 'sacarose', 'mol de sal', '']) assert.ok(!pt.ehClasseDeCompostos(w), w);
  assert.ok(new Dicionario(store, 'de').ehClasseDeCompostos('Säure'));
});

test('tema limpo do conceito (igual a LocalNlu.temaDoConceito do Android)', () => {
  assert.equal(temaDoConceito('o que é um sal', lexico('pt-BR')), 'sal');
  assert.equal(temaDoConceito('o que é a massa molar', lexico('pt-BR')), 'massa molar');
  assert.equal(temaDoConceito('what is a salt', lexico('en')), 'salt');
  assert.equal(temaDoConceito('¿qué es el azúcar?', lexico('es')), 'azucar');
  assert.equal(temaDoConceito('was ist ein Salz', lexico('de')), 'salz');
  assert.equal(temaDoConceito("qu'est-ce qu'un sel", lexico('fr')), 'sel');
});

test('nome de classe não vira erro de digitação de outro composto ("acucar" ≉ "acular")', async () => {
  const d = new Dicionario(await loja(), 'pt-BR');
  assert.equal(d.aproximar('acucar'), null);
  assert.equal(d.aproximar('o que e acucar'), null);
});

/** O pacote liga o apelido genérico ao composto? (pt "sal" → NaCl; DATA_DIR=local/pacote-l tem os apelidos de 17/10.) */
async function comApelidos() {
  const store = await loja(DADOS);
  const d = new Dicionario(store, 'pt-BR');
  return d.nomesCompostoMap.get('sal') === NACL && d.nomesCompostoMap.get('acucar') === SACAROSE ? store : null;
}

test('com os apelidos genéricos: "o que é X?" é CONCEITO (o composto fica como sugestão); propriedade, massa, segurança e "X de cozinha" seguem no composto',
  { skip: (await comApelidos()) ? false : 'o pacote de DATA_DIR não tem os apelidos genéricos (use DATA_DIR=local/pacote-l)' }, async () => {
    const store = await comApelidos();
    const casos = [
      ['pt-BR', 'O que é um sal?', 'CONCEITO', 'sal', NACL], ['pt-BR', 'o que é açúcar?', 'CONCEITO', 'acucar', SACAROSE],
      ['en', 'what is a salt?', 'CONCEITO', 'salt', NACL], ['en', 'what is sugar?', 'CONCEITO', 'sugar', SACAROSE],
      ['es', '¿qué es una sal?', 'CONCEITO', 'sal', NACL], ['es', '¿qué es el azúcar?', 'CONCEITO', 'azucar', SACAROSE],
      ['de', 'was ist ein Salz?', 'CONCEITO', 'salz', NACL], ['de', 'Was ist Zucker?', 'CONCEITO', 'zucker', SACAROSE],
      ['fr', "qu'est-ce qu'un sel ?", 'CONCEITO', 'sel', NACL], ['fr', "qu'est-ce que le sucre ?", 'CONCEITO', 'sucre', SACAROSE],
      ['pt-BR', 'qual o ponto de fusão do sal?', 'PROPRIEDADE', null, NACL], ['pt-BR', 'sal é solúvel em água?', 'PROPRIEDADE', null, NACL],
      ['pt-BR', 'massa molar do sal', 'MASSA_MOLAR', null, NACL], ['pt-BR', 'o sal é perigoso?', 'SEGURANCA', null, NACL],
      ['pt-BR', 'o que é o sal de cozinha?', 'COMPOSTO', null, NACL], ['pt-BR', 'açúcar', 'COMPOSTO', null, SACAROSE],
      ['en', 'is salt soluble in water?', 'PROPRIEDADE', null, NACL], ['en', 'melting point of salt', 'PROPRIEDADE', null, NACL],
      ['es', 'punto de fusión de la sal', 'PROPRIEDADE', null, NACL], ['de', 'Schmelzpunkt von Salz', 'PROPRIEDADE', null, NACL],
      ['fr', 'point de fusion du sel', 'PROPRIEDADE', null, NACL], ['fr', "le sel est-il soluble dans l'eau ?", 'PROPRIEDADE', null, NACL]
    ];
    const dics = new Map();
    const falhas = [];
    for (const [idioma, q, intent, conceito, cid] of casos) {
      if (!dics.has(idioma)) dics.set(idioma, new Dicionario(store, idioma));
      const p = parse(q, dics.get(idioma));
      if (p.intent !== intent || p.composto !== cid || (conceito != null && p.conceito !== conceito)) falhas.push(`[${idioma}] "${q}" → ${p.intent} composto=${p.composto} conceito=${p.conceito}`);
    }
    assert.deepEqual(falhas, []);
  });
