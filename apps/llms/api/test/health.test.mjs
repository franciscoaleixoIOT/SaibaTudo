// GET /api/health: sem segredos, sem chamar o Hugging Face; lê o manifesto do pacote de dados (arquivo ou site).
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleHealth, lerDadosPublicados } from '../health.js';
import { mkRequest } from './_helpers.mjs';

const MANIFESTO = { version: '20261025T163006Z-f66bfe641722', generatedAt: '2026-10-25T16:30:06Z', schemaVersion: 1, vetores: { palavras: 100000 } };
const agora = Date.UTC(2026, 9, 28, 15, 0, 0);
const get = (url = 'https://saibatudo.net/llms/api/health', method = 'GET') => mkRequest({ method, url });
const doArquivo = { readFileFn: async () => JSON.stringify(MANIFESTO), now: () => agora };

test('responde ok com a versão do pacote lida do arquivo, a idade em dias e o estado da nuvem', async () => {
  const res = await handleHealth(get(), { VERCEL_GIT_COMMIT_SHA: 'abcdef1234567' }, doArquivo);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.ok, true);
  assert.equal(j.version, 'abcdef1');
  assert.equal(j.ask, 'off');
  assert.equal(j.model, 'dev');
  assert.deepEqual(j.data, { version: MANIFESTO.version, generatedAt: MANIFESTO.generatedAt, packageAgeDays: 2, palavras: 100000 });
  assert.match(j.time, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('ask reflete ASK_ENABLED + HF_ASK_SPACE_URL + HF_TOKEN; nunca expõe segredos', async () => {
  const env = { ASK_ENABLED: '1', HF_ASK_SPACE_URL: 'https://x.hf.space', HF_TOKEN: 'hf_segredo', ASK_MODEL_VERSION: 'qwen3-4b-base', UPSTASH_REDIS_REST_URL: 'https://r.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tok_redis' };
  const texto = await (await handleHealth(get(), env, doArquivo)).text();
  const j = JSON.parse(texto);
  assert.deepEqual([j.ask, j.shared, j.model], ['on', 'on', 'qwen3-4b-base']);
  for (const segredo of ['hf_segredo', 'tok_redis']) assert.ok(!texto.includes(segredo), segredo);
  assert.equal(JSON.parse(await (await handleHealth(get(), { ASK_ENABLED: '1' }, doArquivo)).text()).ask, 'off', 'sem Space configurado fica off');
});

test('sem o arquivo, busca o manifesto no próprio site (origem permitida) e nunca em outro host; falha vira data: null', async () => {
  const buscados = [];
  const fetchFn = async (url) => { buscados.push(String(url)); return new Response(JSON.stringify(MANIFESTO), { status: 200 }); };
  const semArquivo = { readFileFn: async () => { throw new Error('ENOENT'); }, fetchFn, now: () => agora };
  const j = await (await handleHealth(get(), {}, semArquivo)).json();
  assert.deepEqual(buscados, ['https://saibatudo.net/llms/data/manifest.json']);
  assert.equal(j.data.version, MANIFESTO.version);
  const outro = await lerDadosPublicados(get('https://malicioso.example/llms/api/health'), { allowedOrigins: ['https://saibatudo.net'] }, semArquivo);
  assert.equal(outro, null);
  const falha = await (await handleHealth(get(), {}, { readFileFn: async () => { throw new Error('x'); }, fetchFn: async () => { throw new Error('rede'); }, now: () => agora })).json();
  assert.equal(falha.data, null);
  assert.equal(falha.ok, true);
});

test('método não permitido e preflight', async () => {
  assert.equal((await handleHealth(get(undefined, 'POST'), {}, doArquivo)).status, 405);
  assert.equal((await handleHealth(get(undefined, 'OPTIONS'), {}, doArquivo)).status, 204);
});
