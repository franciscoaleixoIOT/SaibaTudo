// Cliente da IA na nuvem (nuvem.js): resumo do gráfico para o contexto (≤ 1500, números com ponto), trechos escolhidos pela interpretação,
// chamada a /llms/api/ask com consentimento (corpo com lang e iid), e os motivos de falha mapeados (desligada, cota, timeout, rejeitada, rede).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, CHAVE_TESTE_B64, fetchDeDisco } from './support.mjs';
import { Vetores } from '../src/llms/js/data.js';
import { adicionar, criarEstado, definirAnalogia } from '../src/llms/js/explorador.js';
import { lexico } from '../src/llms/js/nlu/lex/index.js';
import { parse } from '../src/llms/js/nlu.js';
import { ENDPOINT_NUVEM, MAX_CONTEXTO, NuvemExplica, TIMEOUT_NUVEM_MS, contextoDoEstado, trechosDaPergunta } from '../src/llms/js/nuvem.js';

const V = await Vetores.carregar({ fetch: fetchDeDisco(), base: BASE, chavePublicaB64: CHAVE_TESTE_B64 });
const i = (w) => V.indice(w);
const IID = '3f2b8c1e-6a4d-4c3b-9e1f-0a1b2c3d4e5f';

test('constantes do contrato', () => {
  assert.equal(ENDPOINT_NUVEM, '/llms/api/ask');
  assert.equal(MAX_CONTEXTO, 1500);
  assert.equal(TIMEOUT_NUVEM_MS, 30_000);
});

test('contextoDoEstado: palavras, modo e eixos, coordenadas com ponto decimal e 2 casas, analogia com os 5 vizinhos; ≤ 1500 caracteres', () => {
  let e = adicionar(criarEstado(), [i('king'), i('queen'), i('man'), i('woman')]).estado;
  e = definirAnalogia(e, i('king'), i('man'), i('woman'));
  const c = contextoDoEstado(e, V, 'pt-BR');
  assert.ok(c.includes('king') && c.includes('queen'), c);
  assert.match(c, /dimensoes|pca/);
  assert.match(c, /-?\d\.\d{2}\b/, 'coordenadas com ponto, independentemente do idioma');
  assert.ok(!/\d,\d/.test(c), 'sem vírgula decimal');
  assert.match(c, /king - man \+ woman/);
  assert.match(c, /queen \(0\.\d{3}\)/, 'vizinhos da analogia com cosseno');
  assert.ok(c.length <= MAX_CONTEXTO);
  const muitas = adicionar(criarEstado(), Array.from({ length: 40 }, (_, k) => k)).estado;
  assert.ok(contextoDoEstado(muitas, V, 'en').length <= MAX_CONTEXTO, 'corta em 1500');
  assert.equal(contextoDoEstado(criarEstado(), V, 'pt-BR').length > 0, true, 'sem palavras ainda descreve o estado');
});

test('trechosDaPergunta: conceito do parse → seção; sem conceito → embeddings; ids do idioma; ≤ 3', () => {
  const p = (q, idioma = 'pt-BR') => parse(q, lexico(idioma), { vetores: V, idioma });
  assert.deepEqual(trechosDaPergunta(p('o que é um token?'), 'pt-BR').map((t) => t.id), ['pt-BR:tokens']);
  assert.deepEqual(trechosDaPergunta(p('mostre king'), 'zh').map((t) => t.id), ['zh:embeddings']);
  assert.deepEqual(trechosDaPergunta(p('o que é temperatura?'), 'en').map((t) => t.id), ['en:softmax']);
  const t = trechosDaPergunta(p('como funciona a atenção e a softmax?'), 'pt-BR');
  assert.ok(t.length >= 1 && t.length <= 3);
  for (const x of t) assert.ok(x.texto.length > 100 && x.texto.length <= 2000);
});

test('NuvemExplica.perguntar: corpo com q, lang, context, trechos, v, client, iid; respostas 200/422/503/429/timeout/rede', async () => {
  const chamadas = [];
  const fetchOk = async (url, init) => { chamadas.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ ok: true, answer: 'Explicação. texto gerado por IA, pode conter erros.', model: 'Qwen3-4B', cached: false }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const nuvem = new NuvemExplica({ fetch: fetchOk, installId: () => IID });
  const r = await nuvem.perguntar({ q: 'o que mostra o gráfico?', idioma: 'pt-BR', contexto: 'palavras: king', trechos: [{ id: 'pt-BR:embeddings', texto: 'x'.repeat(120) }] });
  assert.deepEqual(r, { ok: true, answer: 'Explicação. texto gerado por IA, pode conter erros.', model: 'Qwen3-4B' });
  assert.equal(chamadas[0].url, ENDPOINT_NUVEM);
  assert.deepEqual(chamadas[0].body, { q: 'o que mostra o gráfico?', lang: 'pt-BR', context: 'palavras: king', trechos: [{ id: 'pt-BR:embeddings', texto: 'x'.repeat(120) }], v: 1, client: 'web', iid: IID });
  const casos = [[422, { ok: false, error: 'rejected', motivo: 'numero' }, 'rejeitada'], [422, { ok: false, error: 'dadopessoal' }, 'dadopessoal'], [503, { ok: false, error: 'disabled' }, 'desligada'], [503, { ok: false, error: 'budget' }, 'cota'], [429, { ok: false, error: 'rate_limited' }, 'cota'], [504, { ok: false, error: 'timeout' }, 'timeout'], [502, { ok: false, error: 'upstream' }, 'rede']];
  for (const [status, corpo, motivo] of casos) {
    const n = new NuvemExplica({ fetch: async () => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } }), installId: () => IID });
    assert.deepEqual(await n.perguntar({ q: 'pergunta', idioma: 'en', contexto: '', trechos: [] }), { ok: false, motivo }, `${status} → ${motivo}`);
  }
  const abortada = new NuvemExplica({ fetch: async (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })))), installId: () => IID, timeoutMs: 20 });
  assert.deepEqual(await abortada.perguntar({ q: 'pergunta', idioma: 'en', contexto: '', trechos: [] }), { ok: false, motivo: 'timeout' });
  const semRede = new NuvemExplica({ fetch: async () => { throw new TypeError('Failed to fetch'); }, installId: () => IID });
  assert.deepEqual(await semRede.perguntar({ q: 'pergunta', idioma: 'en', contexto: '', trechos: [] }), { ok: false, motivo: 'rede' });
  const malformada = new NuvemExplica({ fetch: async () => new Response('<html>', { status: 200 }), installId: () => IID });
  assert.deepEqual(await malformada.perguntar({ q: 'pergunta', idioma: 'en', contexto: '', trechos: [] }), { ok: false, motivo: 'rede' });
});
