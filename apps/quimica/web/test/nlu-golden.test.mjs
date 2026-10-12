// Casos de referência compartilhados com o Android (contracts/nlu_golden_cases.json): o NLU do site DEVE passar em todos.
// Chave ausente = não verificada; chave com null = deve estar ausente. Com o pacote de teste (13 elementos, 12 compostos), casos que citam
// uma entidade que o pacote de teste não tem são pulados (e contados); com o pacote real (data/quimica) nenhum é pulado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DADOS, DADOS_REAIS, RAIZ, loja } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { IDIOMAS, tl } from '../src/quimica/js/i18n/index.js';
import { INTENTS, parse } from '../src/quimica/js/nlu.js';
import { CHAVES_GOLDEN, avaliavel, falhasDoCaso } from './contrato.mjs';

const golden = JSON.parse(readFileSync(resolve(RAIZ, 'contracts/nlu_golden_cases.json'), 'utf8'));
const idiomaDe = (c) => c.idioma ?? 'pt-BR';
/** Roda todos os casos, cada um com o dicionário (léxico + nomes) do seu idioma. */
async function rodar(dir) {
  const store = await loja(dir);
  const dics = new Map();
  let puladas = 0;
  const falhas = [];
  for (const c of golden.cases) {
    if (!avaliavel(c, store)) { puladas++; continue; }
    const idioma = idiomaDe(c);
    if (!dics.has(idioma)) dics.set(idioma, new Dicionario(store, idioma));
    const p = parse(c.q, dics.get(idioma));
    for (const f of falhasDoCaso(c, p, store)) falhas.push(`"${c.q}" → ${p.intent}: ${f}`);
    if (p.intent !== c.intent && !falhas.some((x) => x.startsWith(`"${c.q}"`))) falhas.push(`"${c.q}": intenção esperada ${c.intent}, veio ${p.intent}`);
  }
  return { falhas, puladas, total: golden.cases.length };
}

test('contrato dos casos de referência: pelo menos 60 casos POR IDIOMA (pt-BR, en, es, de e fr), só intenções e chaves conhecidas, cobrindo todas as intenções em cada idioma', () => {
  assert.ok(golden.cases.length >= 60, `casos: ${golden.cases.length}`);
  for (const c of golden.cases) {
    assert.ok(INTENTS.includes(c.intent), `${c.q}: intenção desconhecida ${c.intent}`);
    for (const k of Object.keys(c)) assert.ok(k === 'q' || k === 'idioma' || CHAVES_GOLDEN.includes(k), `${c.q}: chave não verificada ${k}`);
    if (c.idioma) assert.ok(IDIOMAS.includes(c.idioma), `${c.q}: idioma desconhecido ${c.idioma}`);
  }
  for (const idioma of IDIOMAS) {
    const casos = golden.cases.filter((c) => idiomaDe(c) === idioma);
    assert.ok(casos.length >= 60, `${idioma}: ${casos.length} casos (mínimo 60)`);
    const usadas = new Set(casos.map((c) => c.intent));
    for (const i of INTENTS) assert.ok(usadas.has(i), `${idioma}: nenhum caso para ${i}`);
  }
});

test('perguntas sugeridas pelo app (chips: padrão e seguras) em es/de/fr são casos golden: o que o app oferece, o NLU entende', () => {
  // comparação como a do dataset (norm_question): sem acento, minúsculas, só letras e números ("Balancear Fe + O2 -> Fe2O3" é a mesma pergunta em pt-BR e es: um só caso a cobre)
  const fold = (q) => (String(q).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) ?? []).join(' ');
  const perguntas = new Set(golden.cases.map((c) => fold(c.q)));
  for (const idioma of ['es', 'de', 'fr']) {
    for (const q of [...tl('respostas.sugestoes.padrao', idioma), ...tl('respostas.sugestoes.seguras', idioma)]) assert.ok(perguntas.has(fold(q)), `${idioma}: sugestão sem caso golden: ${q}`);
  }
});

test('cada idioma tem casos com número decimal em vírgula e em ponto, fórmulas e equações (formatos reais de digitação)', () => {
  for (const idioma of IDIOMAS) {
    const casos = golden.cases.filter((c) => idiomaDe(c) === idioma).map((c) => c.q);
    assert.ok(casos.some((q) => /[0-9],[0-9]/.test(q)), `${idioma}: sem caso com vírgula decimal`);
    if (idioma !== 'pt-BR') assert.ok(casos.some((q) => /[0-9][.][0-9]/.test(q)), `${idioma}: sem caso com ponto decimal`);
    assert.ok(casos.some((q) => q.includes('->')), `${idioma}: sem equação`);
  }
});

test('todos os casos de referência do NLU (golden cases) com o pacote de teste', async () => {
  const { falhas, puladas, total } = await rodar(DADOS);
  assert.ok(puladas < total * 0.5, `muitos casos pulados (${puladas}/${total}): o pacote de teste não cobre as entidades`);
  assert.deepEqual(falhas, [], 'Falhas de NLU:\n' + falhas.join('\n'));
});

test('todos os casos de referência do NLU com o pacote REAL (se existir em data/quimica)', { skip: DADOS_REAIS ? false : 'sem pacote real em data/quimica' }, async () => {
  const { falhas, puladas } = await rodar(DADOS_REAIS);
  assert.deepEqual(falhas, [], 'Falhas de NLU no pacote real:\n' + falhas.join('\n'));
  assert.equal(puladas, 0, 'com o pacote real nenhum caso deve ser pulado');
});

test('pergunta vazia ou gigante não quebra o NLU', async () => {
  const dic = new Dicionario(await loja());
  assert.equal(parse('', dic).intent, 'DESCONHECIDA');
  assert.equal(parse('???', dic).intent, 'DESCONHECIDA');
  const longa = parse('massa molar da água '.repeat(500), dic);
  assert.ok(longa.textoOriginal.length <= 300);
  assert.equal(longa.intent, 'MASSA_MOLAR');
});
