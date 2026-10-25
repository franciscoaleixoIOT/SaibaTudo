// Carga verificada do pacote (manifesto assinado, SHA-256 dos arquivos) e operações sobre os vetores int8: índice, cosseno, vizinhos, analogia,
// direção/produto escalar e sugestões (prefixo, aproximação, glossário). Usa a fixture (vetores reais do GloVe para ~360 palavras).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASE, CHAVE_TESTE_B64, DADOS, fetchAdulterado, fetchDeDisco, lerJson } from './support.mjs';
import { ErroDados, Vetores } from '../src/llms/js/data.js';

const carregar = (fetch = fetchDeDisco()) => Vetores.carregar({ fetch, base: BASE, chavePublicaB64: CHAVE_TESTE_B64 });
const V = await carregar();
const i = (w) => { const k = V.indice(w); assert.ok(k >= 0, `fixture sem "${w}"`); return k; };
const palavrasDe = (lista) => lista.map((x) => x.palavra);

test('carregar: verifica assinatura e hashes, lê os 5 arquivos e expõe manifesto, glossário e presets', () => {
  const m = lerJson('manifest.json');
  assert.equal(V.n, m.vetores.palavras);
  assert.ok(V.n >= 300);
  assert.equal(V.dimensoes, 50);
  assert.equal(V.manifesto.version, m.version);
  assert.deepEqual(V.sig, { estado: 'verificada' });
  assert.equal(V.glossario.king['pt-BR'], 'rei');
  assert.deepEqual(V.presets.realeza.slice(0, 2), ['king', 'queen']);
  assert.equal(V.vetor(0).length, 50);
  assert.ok(Math.abs(V.norma(i('king')) - Math.hypot(...V.vetor(i('king')))) < 1e-4);
});

test('carregar: assinatura inválida e hash divergente são ErroDados; 404 do manifesto é ErroDados("rede")', async () => {
  const sig = readFileSync(resolve(DADOS, 'manifest.sig'), 'utf8');
  const sigFalsa = sig.replace(/^([A-Za-z0-9+/])/, (c) => (c === 'A' ? 'B' : 'A'));
  await assert.rejects(carregar(fetchAdulterado('manifest.sig', sigFalsa)), (e) => e instanceof ErroDados && e.codigo === 'assinatura');
  await assert.rejects(carregar(fetchAdulterado('vocab.json', '["x"]')), (e) => e instanceof ErroDados && e.codigo === 'hash');
  await assert.rejects(Vetores.carregar({ fetch: async () => new Response(null, { status: 404 }), base: BASE, chavePublicaB64: CHAVE_TESTE_B64 }), (e) => e instanceof ErroDados && e.codigo === 'rede');
  await assert.rejects(carregar(fetchAdulterado('manifest.json', '{"version":"x"}')), (e) => e instanceof ErroDados && ['assinatura', 'manifesto'].includes(e.codigo));
});

test('indice: minúsculas, espaços nas pontas e acentos normalizados; "ice cream" e desconhecidas dão -1', () => {
  assert.equal(V.indice('King '), V.indice('king'));
  assert.equal(V.indice('  QUEEN'), V.indice('queen'));
  assert.equal(V.indice('ice cream'), -1);
  assert.equal(V.indice('xqzv'), -1);
  assert.equal(V.indice(''), -1);
  assert.equal(V.palavra(V.indice('king')), 'king');
});

test('cosseno: rei está mais perto de rainha do que de gato; cosseno de um vetor consigo mesmo é 1', () => {
  assert.ok(V.cosseno(i('king'), i('queen')) > V.cosseno(i('king'), i('cat')));
  assert.ok(Math.abs(V.cosseno(i('king'), i('king')) - 1) < 1e-5);
  assert.ok(Math.abs(V.cossenoVetor(V.vetor(i('king')), i('queen')) - V.cosseno(i('king'), i('queen'))) < 1e-5);
});

test('vizinhos: os 10 de "tower" incluem building ou skyscraper; a própria palavra e os excluídos não aparecem; ordem decrescente de cosseno', () => {
  const viz = V.vizinhos(V.vetor(i('tower')), 10, [i('tower')]);
  assert.equal(viz.length, 10);
  const nomes = palavrasDe(viz);
  assert.ok(nomes.includes('building') || nomes.includes('skyscraper') || nomes.includes('castle'), nomes.join(','));
  assert.ok(!nomes.includes('tower'));
  for (let k = 1; k < viz.length; k++) assert.ok(viz[k - 1].cos >= viz[k].cos);
  assert.ok(viz.every((x) => typeof x.i === 'number' && typeof x.cos === 'number'));
});

test('analogia: king − man + woman tem queen entre os 5 resultados, sem a, b, c', () => {
  const r = V.analogia(i('king'), i('man'), i('woman'), 5);
  assert.equal(r.vetor.length, 50);
  const nomes = palavrasDe(r.resultados);
  assert.ok(nomes.includes('queen'), nomes.join(','));
  for (const w of ['king', 'man', 'woman']) assert.ok(!nomes.includes(w), `${w} não pode voltar`);
  assert.equal(r.resultados.length, 5);
});

test('direção e produto escalar: com a direção cats − cat, dogs pontua mais que dog e a lista vem em ordem decrescente', () => {
  const d = V.direcao(i('cats'), i('cat'));
  const r = V.produtoEscalar(d, [i('dog'), i('dogs'), i('house'), i('houses')]);
  assert.deepEqual(palavrasDe(r).slice(0, 1), [r[0].palavra]);
  const pos = Object.fromEntries(r.map((x, k) => [x.palavra, k]));
  assert.ok(pos.dogs < pos.dog, 'plural antes do singular');
  assert.ok(pos.houses < pos.house, 'plural antes do singular');
  for (let k = 1; k < r.length; k++) assert.ok(r[k - 1].valor >= r[k].valor);
});

test('sugerir: prefixo ("kin" → king primeiro), aproximação ("quenn" → queen) e glossário por idioma ("rei" → king, rotulado)', () => {
  assert.equal(V.sugerir('kin')[0], 'king');
  assert.ok(V.sugerir('quenn').includes('queen'));
  assert.deepEqual(V.sugerir('zzzzzz'), []);
  assert.deepEqual(V.sugerirTraduzindo('rei', 'pt-BR'), { en: 'king', traduzida: true });
  assert.deepEqual(V.sugerirTraduzindo('Rei', 'pt-BR'), { en: 'king', traduzida: true });
  assert.deepEqual(V.sugerirTraduzindo('国王', 'zh'), { en: 'king', traduzida: true });
  assert.deepEqual(V.sugerirTraduzindo('König', 'de'), { en: 'king', traduzida: true });
  assert.equal(V.sugerirTraduzindo('xqzv', 'pt-BR'), null);
  assert.equal(V.sugerirTraduzindo('king', 'pt-BR'), null, 'palavra que já é inglesa não é tradução');
});

test('matriz devolve um Float32Array de 50 por índice, na ordem pedida', () => {
  const m = V.matriz([i('king'), i('queen')]);
  assert.equal(m.length, 2);
  assert.ok(m[0] instanceof Float32Array && m[0].length === 50);
  assert.deepEqual([...m[1]], [...V.vetor(i('queen'))]);
});
