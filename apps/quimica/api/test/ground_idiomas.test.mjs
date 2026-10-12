// Ancoragem em TODOS os idiomas: a evidência textual de elemento, propriedade, unidade e nível pode estar em pt-BR, en, es, de ou fr
// (formas do contrato compartilhado contracts/lexico/<idioma>.json + nomes de elementos do pacote de dados). O português não muda.
// Sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeModelOutput } from '../_lib/normalize.js';
import { groundElemento, groundNivel, groundPropriedade, quantidadesDoTexto } from '../_lib/ground.js';
import { FORMAS_PROPRIEDADE_LEXICO, NOMES_ELEMENTOS_OUTROS, UNIDADES_LEXICO } from '../_lib/vocab-i18n.js';
import { NOMES_ELEMENTOS, SIMBOLOS } from '../_lib/vocab.js';

const mantem = (q, modelo) => {
  const r = normalizeModelOutput(modelo, { question: q });
  assert.equal(r.ok, true, q);
  return r;
};

test('propriedade + elemento sobrevivem à ancoragem em es, de e fr (e en, pt-BR)', () => {
  const casos = [
    ['Punto de fusión del hierro', 'Fe', 'pontoFusaoK'],
    ['Cuál es la densidad del oro?', 'Au', 'densidadeKgm3'],
    ['Electronegatividad del cloro', 'Cl', 'eletronegatividade'],
    ['Quién descubrió el oxígeno?', 'O', 'descoberta'],
    ['Schmelzpunkt von Eisen', 'Fe', 'pontoFusaoK'],
    ['Wie hoch ist die Dichte von Quecksilber?', 'Hg', 'densidadeKgm3'],
    ['Elektronegativität von Chlor', 'Cl', 'eletronegatividade'],
    ['Wer hat den Sauerstoff entdeckt?', 'O', 'descoberta'],
    ['Quelle est la température de fusion du fer ?', 'Fe', 'pontoFusaoK'],
    ['Électronégativité du chlore', 'Cl', 'eletronegatividade'],
    ["Qui a découvert l'oxygène ?", 'O', 'descoberta'],
    ['melting point of iron', 'Fe', 'pontoFusaoK'],
    ['qual o ponto de fusão do ferro?', 'Fe', 'pontoFusaoK'],
  ];
  for (const [q, elemento, propriedade] of casos) {
    const r = mantem(q, { intent: 'PROPRIEDADE', elemento, propriedade });
    assert.deepEqual(r.nlu, { intent: 'PROPRIEDADE', elemento, propriedade }, q);
  }
});

test('ELEMENTO: o nome do elemento em es, de e fr ancora; "or" (ouro em francês) e "z" não ancoram nada por engano', () => {
  for (const [q, s] of [['Perfil del azufre', 'S'], ['Informationen über Schwefel', 'S'], ['Parle-moi du soufre', 'S'], ['Quecksilber', 'Hg'], ['plomo', 'Pb'], ['Kupfer', 'Cu']]) {
    assert.equal(groundElemento(s, q), true, q);
  }
  assert.equal(groundElemento('Au', 'hydrogen or oxygen'), false, '"or" é a conjunção inglesa');
  assert.equal(groundElemento('Au', 'Parle-moi de l\'or'), false, 'ouro em francês tem 2 letras: não ancora (cai no NLU local)');
  assert.equal(groundElemento('Au', 'oro'), true, 'ouro em espanhol');
  assert.equal(normalizeModelOutput({ intent: 'PROPRIEDADE', elemento: 'Zn', propriedade: 'numeroAtomico' }, { question: 'zinc' }).nlu.intent, 'DESCONHECIDA');
  assert.equal(groundPropriedade('numeroAtomico', 'zinc'), false, '"z" sozinho não é forma de superfície');
});

test('nome de elemento dentro do nome de um composto não ancora o elemento (pt, es, fr)', () => {
  for (const q of ['cloreto de sódio', 'cloruro de sodio', 'chlorure de sodium', "chlorure d'argent"]) {
    const s = /argent/.test(q) ? 'Ag' : 'Na';
    assert.equal(groundElemento(s, q), false, q);
  }
  assert.equal(groundElemento('Na', 'sodio'), true);
});

test('os nomes em es/de/fr vêm do pacote de dados e cobrem os 118 elementos', () => {
  assert.deepEqual(Object.keys(NOMES_ELEMENTOS_OUTROS).sort(), [...SIMBOLOS].sort());
  for (const s of SIMBOLOS) {
    assert.ok(NOMES_ELEMENTOS_OUTROS[s].length >= 1 || ['Au'].includes(s), s);
    for (const n of NOMES_ELEMENTOS_OUTROS[s]) assert.ok(n.normalize('NFD').replace(/\p{M}/gu, '').length >= 3, `${s}: ${n}`);
  }
  assert.ok(NOMES_ELEMENTOS_OUTROS.Fe.includes('hierro') && NOMES_ELEMENTOS_OUTROS.Fe.includes('Eisen'));
  assert.equal(NOMES_ELEMENTOS.Fe[0], 'Ferro', 'o português continua em vocab.js');
});

test('extremos do léxico sustentam a propriedade ("heaviest", "mais eletronegativo", "schwerste Atom")', () => {
  assert.equal(groundPropriedade('massaAtomica', 'heaviest element'), true);
  assert.equal(groundPropriedade('massaAtomica', 'das schwerste Atom'), true);
  assert.equal(groundPropriedade('eletronegatividade', 'most electronegative element'), true);
  assert.equal(groundPropriedade('eletronegatividade', 'elemento mais eletronegativo'), true);
  assert.equal(groundPropriedade('densidadeKgm3', 'heaviest element'), false);
});

test('formas do léxico: palavra/expressão inteira e nunca com menos de 3 letras', () => {
  for (const formas of Object.values(FORMAS_PROPRIEDADE_LEXICO)) for (const f of formas) assert.ok(f.length >= 3, f);
  assert.ok(FORMAS_PROPRIEDADE_LEXICO.pontoFusaoK.includes('melting point'));
  assert.equal(groundPropriedade('cas', 'a casa de campo'), false, '"cas" não é prefixo de "casa"');
  assert.equal(groundPropriedade('cas', 'CAS number of aspirin'), true);
});

test('unidades por extenso em qualquer idioma viram quantidade ancorada', () => {
  const unidades = (q) => quantidadesDoTexto(q).map((x) => x.unidade);
  assert.deepEqual(unidades('Convert 100 degrees celsius to fahrenheit'), ['°C']);
  assert.deepEqual(unidades('mass percent of 5 grams of salt in 100 grams of solution'), ['g', 'g']);
  assert.deepEqual(unidades('How many mL are in 2.5 liters?'), ['L']);
  assert.deepEqual(unidades('Wie viele Milliliter sind 2,5 Liter?'), ['L']);
  assert.deepEqual(unidades('quantos mols em 2 litros'), ['L']);
  assert.ok(UNIDADES_LEXICO.length > 0);
  const r = mantem('Convert 100 degrees celsius to fahrenheit', { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 100, unidade: '°C' }], unidadeDestino: '°F' });
  assert.deepEqual(r.nlu, { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 100, unidade: '°C' }], unidadeDestino: '°F' });
  // número sem unidade, ou com palavra que não é unidade, não ancora
  assert.deepEqual(unidades('5 apples'), [null]);
});

test('nível: expressões do léxico em outros idiomas ancoram; o português segue como antes', () => {
  assert.equal(groundNivel('fundamental', 'explain it for kids'), true);
  assert.equal(groundNivel('fundamental', 'erkläre es für Kinder'), true);
  assert.equal(groundNivel('superior', 'qué es un mol (nivel universidad)'), true);
  assert.equal(groundNivel('medio', 'explique para o ensino médio'), true);
  assert.equal(groundNivel('superior', 'explique para o ensino médio'), false);
});

test('português: o que já era descartado continua descartado (alucinação do modelo)', () => {
  // "massa molar da ferrugem" não sustenta o elemento Fe; a água não sustenta propriedade de ponto de fusão sem a expressão
  assert.equal(normalizeModelOutput({ intent: 'MASSA_MOLAR', elemento: 'Fe' }, { question: 'massa molar da ferrugem' }).nlu.intent, 'DESCONHECIDA');
  assert.equal(normalizeModelOutput({ intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'densidadeKgm3' }, { question: 'qual o ponto de fusão do ferro?' }).nlu.intent, 'DESCONHECIDA');
});
