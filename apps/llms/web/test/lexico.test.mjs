// Léxicos do interpretador (contracts/lexico/<idioma>.json → js/nlu/lex/<idioma>.js, gerados por tools/gerar_lexico.py): em dia com o contrato,
// mesma estrutura nos seis idiomas, regexes que compilam em JS (subconjunto comum ao java.util.regex), chinês sem \b e sem normalização de acentos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ } from './support.mjs';
import { IDIOMAS } from '../src/llms/js/i18n/index.js';
import { IDIOMAS_LEXICO, LEXICOS_BRUTOS, compilar, lexico, normalizarParaLexico } from '../src/llms/js/nlu/lex/index.js';

const CONTRATOS = resolve(RAIZ, 'contracts/lexico');
const GERADOS = resolve(RAIZ, 'web/src/llms/js/nlu/lex');
const CABECALHO = '// gerado — não editar.';
const INTENCOES = ['saudacao', 'ajuda', 'sobreDados', 'fontes', 'mostrar', 'analogia', 'vizinhos', 'similaridade', 'direcao', 'conceito', 'preset', 'limpar'];
const PISTAS = ['separadorLista', 'menos', 'mais', 'estaPara', 'aspas', 'continuacao', 'plural', 'pergunta'];
const CONCEITOS = ['embedding', 'token', 'atencao', 'mlp', 'softmax', 'temperatura', 'transformer', 'parametro', 'proximoToken', 'dimensao', 'vetor', 'cosseno'];
const PRESETS = ['realeza', 'capitais', 'plural', 'familia', 'cores', 'numeros', 'lideres'];

function chaves(obj, prefixo = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [prefixo];
  return Object.entries(obj).flatMap(([k, v]) => chaves(v, prefixo ? `${prefixo}.${k}` : k));
}

test('há um contrato e um gerado para cada um dos seis idiomas, e o gerado está EM DIA com o JSON (mesma serialização do gerador)', () => {
  const contratos = readdirSync(CONTRATOS).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
  assert.deepEqual(contratos, [...IDIOMAS].sort());
  assert.deepEqual(Object.keys(LEXICOS_BRUTOS).sort(), [...IDIOMAS].sort());
  for (const idioma of IDIOMAS) {
    const json = JSON.parse(readFileSync(resolve(CONTRATOS, `${idioma}.json`), 'utf8'));
    assert.equal(json.idioma, idioma);
    const gerado = readFileSync(resolve(GERADOS, `${idioma}.js`), 'utf8');
    assert.ok(gerado.startsWith(CABECALHO), `${idioma}.js sem o cabeçalho de arquivo gerado`);
    const esperado = `export default ${JSON.stringify(json, null, 1)};\n`;
    assert.ok(gerado.replace(/\r\n/g, '\n').endsWith(esperado), `${idioma}.js está DESATUALIZADO em relação a contracts/lexico/${idioma}.json: rode python tools/gerar_lexico.py`);
    assert.deepEqual(LEXICOS_BRUTOS[idioma], json);
  }
});

test('todos os léxicos têm a mesma estrutura: 12 intenções, 8 pistas, 12 conceitos, 7 presets, stopPalavras; zh sem fronteira de palavra e sem normalização de acentos', () => {
  for (const idioma of IDIOMAS) {
    const b = LEXICOS_BRUTOS[idioma];
    assert.deepEqual(Object.keys(b.intencoes).sort(), [...INTENCOES].sort(), `${idioma}: intenções`);
    assert.deepEqual(Object.keys(b.pistas).sort(), [...PISTAS].sort(), `${idioma}: pistas`);
    assert.deepEqual(Object.keys(b.conceitos).sort(), [...CONCEITOS].sort(), `${idioma}: conceitos`);
    assert.deepEqual(Object.keys(b.presets).sort(), [...PRESETS].sort(), `${idioma}: presets`);
    for (const k of CONCEITOS) assert.ok(Array.isArray(b.conceitos[k]) && b.conceitos[k].length >= 1, `${idioma}: termos de ${k}`);
    for (const k of PRESETS) assert.ok(Array.isArray(b.presets[k]) && b.presets[k].length >= 1, `${idioma}: termos do preset ${k}`);
    assert.ok(Array.isArray(b.stopPalavras) && b.stopPalavras.length >= 5, `${idioma}: stopPalavras`);
    assert.equal(b.semFronteira, idioma === 'zh', `${idioma}: semFronteira`);
    assert.equal(b.normalizarAcentos, idioma !== 'zh', `${idioma}: normalizarAcentos`);
    assert.equal(typeof b.versao, 'number');
  }
  assert.deepEqual(chaves(LEXICOS_BRUTOS.zh.intencoes).sort(), chaves(LEXICOS_BRUTOS['pt-BR'].intencoes).sort());
});

test('regexes compilam em JS (com a flag u), sem flags embutidas, sem grupo nomeado, \\p{} nem lookbehind variável; em zh nenhuma usa \\b', () => {
  for (const idioma of IDIOMAS) {
    const b = LEXICOS_BRUTOS[idioma];
    const todas = [...Object.values(b.intencoes), ...Object.values(b.pistas)];
    for (const src of todas) {
      assert.equal(typeof src, 'string', `${idioma}: ${src}`);
      assert.doesNotThrow(() => new RegExp(src, 'u'), `${idioma}: ${src}`);
      assert.ok(!/\(\?<[A-Za-z]/.test(src), `${idioma}: grupo nomeado em ${src}`);
      assert.ok(!/\\p\{/.test(src), `${idioma}: \\p{} em ${src}`);
      assert.ok(!/\(\?<[=!][^)]*(?:[*+]|\{\d*,\d*\})/.test(src), `${idioma}: lookbehind variável em ${src}`);
      if (idioma === 'zh') assert.ok(!/\\b/.test(src), `zh: \\b em ${src} (não há fronteira de palavra em chinês)`);
    }
    const c = compilar(b);
    assert.ok(c.intencoes.mostrar instanceof RegExp && c.pistas.menos instanceof RegExp && c.stopPalavras instanceof Set);
    assert.ok(Array.isArray(c.conceitos.embedding) && typeof c.conceitos.embedding[0] === 'string');
    assert.equal(lexico(idioma).idioma, idioma);
  }
  assert.equal(lexico('zz').idioma, 'pt-BR', 'idioma desconhecido cai no pt-BR');
  assert.deepEqual([...IDIOMAS_LEXICO].sort(), [...IDIOMAS].sort());
});

test('normalizarParaLexico: minúsculas e sem acentos nos idiomas latinos; em zh só minúsculas e espaços comprimidos', () => {
  assert.equal(normalizarParaLexico('  Mostre  REI e Rainha!', lexico('pt-BR')), 'mostre rei e rainha!');
  assert.equal(normalizarParaLexico('König', lexico('de')), 'konig');
  assert.equal(normalizarParaLexico('显示 King 和 Queen', lexico('zh')), '显示 king 和 queen');
});

test('as regexes de intenção reconhecem frases simples em cada idioma', () => {
  const casos = {
    'pt-BR': { mostrar: 'mostre king e queen', vizinhos: 'palavras parecidas com tower', conceito: 'o que e um token?', limpar: 'limpar o grafico', analogia: 'king - man + woman', saudacao: 'oi' },
    en: { mostrar: 'show king and queen', vizinhos: 'words similar to tower', conceito: 'what is a token?', limpar: 'clear the chart', analogia: 'king - man + woman', saudacao: 'hello' },
    es: { mostrar: 'muestra king y queen', vizinhos: 'palabras parecidas a tower', conceito: 'que es un token?', limpar: 'limpiar el grafico', analogia: 'king - man + woman', saudacao: 'hola' },
    de: { mostrar: 'zeige king und queen', vizinhos: 'worter ahnlich wie tower', conceito: 'was ist ein token?', limpar: 'diagramm leeren', analogia: 'king - man + woman', saudacao: 'hallo' },
    fr: { mostrar: 'montre king et queen', vizinhos: 'mots proches de tower', conceito: 'qu est ce qu un token ?', limpar: 'effacer le graphique', analogia: 'king - man + woman', saudacao: 'bonjour' },
    zh: { mostrar: '显示 king 和 queen', vizinhos: '和 tower 相似的词', conceito: '什么是 token？', limpar: '清空图表', analogia: 'king - man + woman', saudacao: '你好' }
  };
  for (const [idioma, frases] of Object.entries(casos)) {
    const lx = lexico(idioma);
    for (const [intencao, frase] of Object.entries(frases)) {
      assert.ok(lx.intencoes[intencao].test(normalizarParaLexico(frase, lx)), `${idioma}: ${intencao} ← "${frase}"`);
    }
  }
});
