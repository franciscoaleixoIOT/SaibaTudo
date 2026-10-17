// Mais lacunas do mapa de perguntas de livros didáticos (17/10/2026), com as MESMAS entradas no Android (NotacaoDestinosTest.kt):
//  A) notação científica dos livros ("1,2 × 10²³", "1,2·10^23", "6,02.10^23", "1.2 × 10**23") e milhar do idioma ("1.520" em pt, "1,520" em en);
//  B) conversão para vários destinos com nomes por extenso ("para litros e metros cúbicos", "para atm, kPa e torr");
//  C) "mistura" que é conceito (substância pura × mistura), não aviso de mistura perigosa;
//  D) pedido de nome de um composto orgânico que não está no pacote (NOMENCLATURA sem composto).
// Os padrões vêm do léxico (contracts/lexico/<idioma>.json: unidades, pistas.paraUnidades, misturaTema, misturaConceito, nomenclaturaPedido,
// nomenclaturaAlvo); os casos golden ficam em contracts/nlu_golden_cases.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loja, lojaNova } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine } from '../src/quimica/js/engine.js';
import { definirIdioma } from '../src/quimica/js/i18n/index.js';
import { lerNumero } from '../src/quimica/js/formato.js';
import { lerDestinos, lerQuantidades, parse } from '../src/quimica/js/nlu.js';
import { lexico } from '../src/quimica/js/nlu/lex/index.js';

/** [idioma, texto, valor] — espelho de NotacaoDestinosTest.NUMEROS. */
export const NUMEROS = [
  ['pt-BR', '1,2 × 10²³', 1.2e23], ['pt-BR', '1,2 x 10^23', 1.2e23], ['pt-BR', '1,2·10^23', 1.2e23], ['pt-BR', '1,2e23', 1.2e23],
  ['pt-BR', '6,02.10^23', 6.02e23], ['pt-BR', '1.2 × 10**23', 1.2e23], ['pt-BR', '3,0 × 10⁻²', 0.03], ['pt-BR', '1,0 × 10^4', 1e4],
  ['pt-BR', '1.520', 1520], ['pt-BR', '1,520', 1.52], ['en', '1,520', 1520], ['en', '1.520', 1.52], ['en', '0,500', 0.5], ['de', '1.520', 1520],
  ['fr', '2,5 × 10⁻³', 0.0025]
];

/** [idioma, texto, [[valor, unidade]…]] — espelho de NotacaoDestinosTest.QUANTIDADES. */
export const QUANTIDADES = [
  ['pt-BR', 'Quantos mols tem 1,2 × 10²³ átomos?', [[1.2e23, 'particulas']]],
  ['pt-BR', 'Converter 1,0 × 10^4 L para dm3', [[1e4, 'L']]],
  ['pt-BR', 'quantos mols são 6,02.10^23 partículas?', [[6.02e23, 'particulas']]],
  ['pt-BR', 'Converter 1.520 mmHg para atm', [[1520, 'mmHg']]],
  ['en', 'convert 1,520 mmHg to atm', [[1520, 'mmHg']]],
  ['en', 'how many moles is 1.2 × 10**23 atoms?', [[1.2e23, 'particulas']]],
  ['es', '¿Cuántos moles hay en 1,2 × 10²³ átomos?', [[1.2e23, 'particulas']]],
  ['de', 'Wie viele Mol sind 1,2 × 10²³ Teilchen?', [[1.2e23, 'particulas']]],
  ['fr', 'Combien de moles y a-t-il dans 1,2 × 10²³ atomes ?', [[1.2e23, 'particulas']]]
];

/** [idioma, texto, destinos] — espelho de NotacaoDestinosTest.DESTINOS. */
export const DESTINOS = [
  ['pt-BR', 'converter 1,820 mL para litros e metros cúbicos', ['L', 'm3']],
  ['pt-BR', 'Converter 1.520 mmHg para atm, kPa e torr', ['atm', 'kPa', 'Torr']],
  ['pt-BR', 'converta 5 atm em kPa', ['kPa']],
  ['pt-BR', 'qual a massa de 2 mol de água?', []],
  ['en', 'convert 750 mL to liters and cubic meters', ['L', 'm3']],
  ['es', 'pasa 1.520 mmHg a atm, kPa y torr', ['atm', 'kPa', 'Torr']],
  ['de', 'Rechne 1.520 mmHg in atm, kPa und Torr um', ['atm', 'kPa', 'Torr']],
  ['fr', 'Convertis 750 mL en litres et en mètres cubes', ['L', 'm3']]
];

test('notação científica dos livros e milhar do idioma (lerNumero), nos cinco idiomas', () => {
  for (const [idioma, texto, valor] of NUMEROS) assert.equal(lerNumero(texto, idioma), valor, `[${idioma}] ${texto}`);
});

test('quantidades com notação científica, expoente sobrescrito e unidade com acento ("átomos")', async () => {
  const store = await loja();
  for (const [idioma, texto, esperado] of QUANTIDADES) {
    const q = lerQuantidades(texto, new Dicionario(store, idioma).unidades, lexico(idioma)).filter((x) => x.unidade).map((x) => [x.valor, x.unidade]);
    assert.deepEqual(q, esperado, `[${idioma}] ${texto}`);
  }
});

test('unidades de destino: uma ou várias, por extenso ou símbolo, separadas por vírgula ou conectivo', async () => {
  const store = await loja();
  for (const [idioma, texto, esperado] of DESTINOS) assert.deepEqual(lerDestinos(texto, new Dicionario(store, idioma).unidades, lexico(idioma)), esperado, `[${idioma}] ${texto}`);
  const pt = new Dicionario(store, 'pt-BR');
  const p = parse('Converter 1.520 mmHg para atm, kPa e torr', pt);
  assert.equal(p.intent, 'CONVERSAO_UNIDADE');
  assert.equal(p.unidadeDestino, 'atm');
  assert.deepEqual(p.unidadesDestino, ['atm', 'kPa', 'Torr']);
  assert.deepEqual(parse('converta 5 atm em kPa', pt).unidadesDestino, []);
});

test('a resposta da conversão lista cada destino; partículas → mol sem substância; nomenclatura sem composto não inventa nome', async () => {
  definirIdioma('pt-BR');
  const e = new Engine({ store: await lojaNova() });
  const conv = await e.responder('Converter 1.520 mmHg para atm, kPa e torr');
  assert.equal(conv.intent, 'CONVERSAO_UNIDADE');
  const linhas = conv.blocos.find((b) => b.tipo === 'resultado').itens;
  assert.deepEqual(linhas.map((x) => x.unidade), ['atm', 'kPa', 'Torr']);
  assert.equal(linhas[0].destaque, true);
  const part = await e.responder('Quantos mols tem 1,2 × 10²³ átomos?');
  assert.equal(part.intent, 'ESTEQUIOMETRIA');
  assert.equal(part.resolvida, true);
  assert.ok(part.blocos.some((b) => b.tipo === 'resultado' && b.itens.some((x) => x.unidade === 'mol')));
  const nome = await e.responder('Como se chama o 2-cloro-3-metil-pentano?');
  assert.equal(nome.intent, 'NOMENCLATURA');
  assert.equal(nome.resolvida, false);
});

test('"mistura" como conceito, sem perder o aviso de mistura perigosa', async () => {
  const store = await loja();
  const casos = [
    ['pt-BR', 'a água mineral é pura ou mistura?', 'CONCEITO', 'mistura'],
    ['pt-BR', 'Classifique esses sistemas em substâncias e misturas', 'CONCEITO', 'mistura'],
    ['pt-BR', 'misturar água sanitária com amoníaco', 'SEGURANCA', null],
    ['pt-BR', 'essa mistura é tóxica?', 'SEGURANCA', null],
    ['en', 'Is seawater a pure substance or a mixture?', 'CONCEITO', 'mixture'],
    ['en', 'is it dangerous to mix bleach and ammonia?', 'SEGURANCA', null],
    ['es', '¿El vinagre es una sustancia pura o una mezcla?', 'CONCEITO', 'mezcla'],
    ['de', 'Ist Milch ein homogenes oder heterogenes Gemisch?', 'CONCEITO', 'gemisch'],
    ['fr', 'Le vinaigre est-il un corps pur ou un mélange ?', 'CONCEITO', 'melange'],
    ['fr', "Est-il dangereux de mélanger de l'eau de Javel avec de l'ammoniac ?", 'SEGURANCA', null]
  ];
  for (const [idioma, q, intent, conceito] of casos) {
    const p = parse(q, new Dicionario(store, idioma));
    assert.equal(p.intent, intent, `[${idioma}] ${q}`);
    if (intent === 'CONCEITO') assert.equal(p.conceito, conceito, `[${idioma}] ${q}`);
    if (intent === 'SEGURANCA') assert.equal(p.mistura, true, `[${idioma}] ${q}`);
  }
});

test('pedido de nome de composto orgânico fora do pacote é NOMENCLATURA; pergunta de elemento não', async () => {
  const store = await loja();
  for (const [idioma, q] of [
    ['pt-BR', 'Como se chama o propil-ciclopropano?'], ['pt-BR', 'nomeie este composto orgânico'], ['en', 'name this organic compound'],
    ['en', 'What is the IUPAC name of 3-ethyl-2-methylhexane?'], ['es', 'nombra este compuesto orgánico'], ['de', 'Benenne diese organische Verbindung'],
    ['fr', 'Nommez ce composé organique']
  ]) {
    const p = parse(q, new Dicionario(store, idioma));
    assert.equal(p.intent, 'NOMENCLATURA', `[${idioma}] ${q}`);
    assert.equal(p.composto, null, `[${idioma}] ${q}`);
  }
  assert.notEqual(parse('qual é o nome do elemento de número atômico 8?', new Dicionario(store, 'pt-BR')).intent, 'NOMENCLATURA');
});
