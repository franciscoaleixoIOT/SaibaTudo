// Interpretador local por regras (nlu.js): casos golden por idioma (contracts/nlu_golden_cases.json, ≥ 30 por idioma, 100 %) e casos de
// borda: maiúsculas/acentos, "ice cream" em duas palavras, desconhecida, continuação com contexto, tradução pelo glossário, aspas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASE, CHAVE_TESTE_B64, DADOS_REAIS, RAIZ, fetchDeDisco } from './support.mjs';
import { Vetores } from '../src/llms/js/data.js';
import { IDIOMAS } from '../src/llms/js/i18n/index.js';
import { lexico } from '../src/llms/js/nlu/lex/index.js';
import { INTENTS, extrairPalavras, parse } from '../src/llms/js/nlu.js';

const V = await Vetores.carregar({ fetch: fetchDeDisco(), base: BASE, chavePublicaB64: CHAVE_TESTE_B64 });
const GOLDEN = JSON.parse(readFileSync(resolve(RAIZ, 'contracts/nlu_golden_cases.json'), 'utf8'));
const P = (q, idioma = 'pt-BR', contexto = null) => parse(q, lexico(idioma), { vetores: V, idioma, contexto });
const en = (r) => r.palavras.map((p) => p.en);

test('INTENTS: as 13 intenções do contrato', () => {
  assert.deepEqual(INTENTS, ['SAUDACAO', 'AJUDA', 'SOBRE_DADOS', 'FONTES', 'MOSTRAR', 'ANALOGIA', 'VIZINHOS', 'SIMILARIDADE', 'DIRECAO', 'CONCEITO', 'PRESET', 'LIMPAR', 'DESCONHECIDA']);
});

test('golden: ≥ 30 casos por idioma, todos com intenção, palavras, analogia, direção, preset e conceito esperados', () => {
  const porIdioma = Object.fromEntries(IDIOMAS.map((i) => [i, GOLDEN.filter((c) => (c.idioma ?? 'pt-BR') === i)]));
  for (const i of IDIOMAS) assert.ok(porIdioma[i].length >= 30, `${i}: ${porIdioma[i].length} casos`);
  const falhas = [];
  for (const c of GOLDEN) {
    const idioma = c.idioma ?? 'pt-BR';
    const r = P(c.q, idioma, c.contexto ? P(c.contexto, idioma) : null);
    const erro = (campo, esperado, obtido) => falhas.push(`${idioma} "${c.q}": ${campo} esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`);
    if (r.intencao !== c.intencao) erro('intencao', c.intencao, r.intencao);
    if (c.palavras && JSON.stringify(en(r)) !== JSON.stringify(c.palavras)) erro('palavras', c.palavras, en(r));
    if (c.analogia && JSON.stringify([r.analogia?.a, r.analogia?.b, r.analogia?.c]) !== JSON.stringify(c.analogia)) erro('analogia', c.analogia, r.analogia);
    if (c.direcao && JSON.stringify([r.direcao?.w1, r.direcao?.w2]) !== JSON.stringify(c.direcao)) erro('direcao', c.direcao, r.direcao);
    if (c.preset && r.preset !== c.preset) erro('preset', c.preset, r.preset);
    if (c.conceito && r.conceito !== c.conceito) erro('conceito', c.conceito, r.conceito);
    if (c.continuacao != null && r.continuacao !== c.continuacao) erro('continuacao', c.continuacao, r.continuacao);
  }
  assert.deepEqual(falhas, [], `${falhas.length} de ${GOLDEN.length} casos falharam`);
});

test('extrairPalavras: maiúsculas e vírgulas, "hot dog" vira duas palavras, desconhecidas são listadas, tradução pelo glossário é rotulada', () => {
  assert.deepEqual(en(extrairPalavras('King, Queen', lexico('en'), V, 'en')), ['king', 'queen']);
  assert.deepEqual(en(extrairPalavras('hot dog', lexico('en'), V, 'en')), ['hot', 'dog'], 'duas palavras, não uma expressão');
  const r = extrairPalavras('mostre rei e xqzv', lexico('pt-BR'), V, 'pt-BR');
  assert.deepEqual(en(r), ['king']);
  assert.deepEqual(r.palavras[0], { en: 'king', original: 'rei', traduzida: true });
  assert.deepEqual(r.desconhecidas, ['xqzv']);
  assert.deepEqual(en(extrairPalavras('"king" e "queen"', lexico('pt-BR'), V, 'pt-BR')), ['king', 'queen'], 'aspas valem como palavras mesmo quando são stopPalavras');
});

test('chinês: termo do glossário vence a stopPalavra que ele contém (埃及, 和平, 想法); termo igual a uma stopPalavra continua stopPalavra (词)', () => {
  assert.deepEqual(en(P('显示 埃及', 'zh')), ['egypt']);
  assert.deepEqual(en(P('显示 和平 和 战争', 'zh')), ['peace', 'war']);
  assert.deepEqual(en(P('显示 想法 和 国王', 'zh')), ['idea', 'king']);
  assert.deepEqual(en(P('显示 国王 这个词', 'zh')), ['king'], '词 continua sendo stopPalavra');
});

test('normalizadas: maiúsculas e acentos são avisados (Rei → rei) sem mudar a palavra achada; token com maiúscula fora do início não é stopPalavra', () => {
  const r = extrairPalavras('mostre Rei e Rainha', lexico('pt-BR'), V, 'pt-BR');
  assert.deepEqual(en(r), ['king', 'queen']);
  assert.deepEqual(r.normalizadas, [{ de: 'Rei', para: 'rei' }, { de: 'Rainha', para: 'rainha' }]);
  assert.deepEqual(extrairPalavras('mostre rei', lexico('pt-BR'), V, 'pt-BR').normalizadas, []);
  assert.deepEqual(P('King, Queen', 'en').normalizadas, [{ de: 'King', para: 'king' }, { de: 'Queen', para: 'queen' }]);
});

test('pacote real (100 mil palavras): golden inteiro 100 %, FONTES mesmo com "sources" no vocabulário, "São Paulo" vira sao + paulo com aviso', { skip: DADOS_REAIS ? false : 'sem data/llms' }, async () => {
  const chave = readFileSync(resolve(RAIZ, 'pipeline/data_signing_public.b64'), 'utf8').trim();
  const VR = await Vetores.carregar({ fetch: fetchDeDisco(DADOS_REAIS), base: BASE, chavePublicaB64: chave });
  const PR = (q, idioma = 'pt-BR', contexto = null) => parse(q, lexico(idioma), { vetores: VR, idioma, contexto });
  const falhas = [];
  for (const c of GOLDEN) {
    const idioma = c.idioma ?? 'pt-BR';
    const r = PR(c.q, idioma, c.contexto ? PR(c.contexto, idioma) : null);
    if (r.intencao !== c.intencao) falhas.push(`${idioma} "${c.q}": ${c.intencao} → ${r.intencao}`);
    if (c.palavras && JSON.stringify(en(r)) !== JSON.stringify(c.palavras)) falhas.push(`${idioma} "${c.q}": palavras ${JSON.stringify(en(r))}`);
  }
  assert.deepEqual(falhas, [], `${falhas.length} casos falham com o vocabulário real`);
  for (const [q, idioma] of [['sources', 'en'], ['fontes', 'pt-BR'], ['références', 'fr'], ['fuentes', 'es']]) assert.equal(PR(q, idioma).intencao, 'FONTES', q);
  const sp = PR('mostre São Paulo');
  assert.deepEqual(en(sp), ['sao', 'paulo']);
  assert.deepEqual(sp.normalizadas, [{ de: 'São', para: 'sao' }, { de: 'Paulo', para: 'paulo' }]);
});

test('parse: casos de borda', () => {
  assert.equal(P('King, Queen', 'en').intencao, 'MOSTRAR');
  assert.deepEqual(en(P('mostre rei e rainha')), ['king', 'queen']);
  assert.equal(P('mostre rei e rainha').palavras[0].traduzida, true);
  const des = P('xqzv');
  assert.equal(des.intencao, 'DESCONHECIDA');
  assert.deepEqual(des.desconhecidas, ['xqzv']);
  const cont = P('e queen?', 'pt-BR', P('mostre king'));
  assert.equal(cont.intencao, 'MOSTRAR');
  assert.equal(cont.continuacao, true);
  assert.deepEqual(en(cont), ['queen']);
  assert.equal(P('e queen?', 'pt-BR', null).intencao, 'MOSTRAR', 'sem contexto também mostra, mas não é continuação');
  assert.equal(P('e queen?', 'pt-BR', null).continuacao, false);
  assert.equal(P('显示 king 和 queen', 'zh').intencao, 'MOSTRAR');
  assert.deepEqual(en(P('显示 king 和 queen', 'zh')), ['king', 'queen']);
  assert.deepEqual(en(P('显示 国王 和 女王', 'zh')), ['king', 'queen'], 'glossário em chinês');
  const an = P('king - man + woman', 'en');
  assert.equal(an.intencao, 'ANALOGIA');
  assert.deepEqual(an.analogia, { a: 'king', b: 'man', c: 'woman' });
  const an2 = P('rei está para rainha assim como homem está para');
  assert.equal(an2.intencao, 'ANALOGIA');
  assert.deepEqual(an2.analogia, { a: 'queen', b: 'king', c: 'man' }, 'a:b :: c:? → ? = b − a + c; aqui b=rainha, a=rei, c=homem');
  assert.equal(P('o que é um token?').conceito, 'token');
  assert.equal(P('o que é um token?').intencao, 'CONCEITO');
  assert.equal(P('direção do plural').intencao, 'DIRECAO');
  assert.deepEqual(P('direção do plural').direcao, { w1: 'cats', w2: 'cat' });
  assert.deepEqual(P('cats - cat', 'en').direcao, { w1: 'cats', w2: 'cat' });
  assert.equal(P('mostre as capitais').intencao, 'PRESET');
  assert.equal(P('mostre as capitais').preset, 'capitais');
  assert.equal(P('vizinhos de tower', 'pt-BR').intencao, 'VIZINHOS');
  assert.deepEqual(en(P('vizinhos de tower')), ['tower']);
  assert.equal(P('cat e dog são parecidas?').intencao, 'SIMILARIDADE');
  assert.deepEqual(en(P('cat e dog são parecidas?')), ['cat', 'dog']);
  assert.equal(P('').intencao, 'DESCONHECIDA');
  assert.equal(P('   ').intencao, 'DESCONHECIDA');
});
