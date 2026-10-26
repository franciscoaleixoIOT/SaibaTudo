// POST /api/ask: kill switch, validação (lang obrigatório), limites, Space do Hugging Face simulado (POST call/ask → event_id → SSE), verificador
// (rodapé, número), cache por pergunta+idioma+contexto, dado pessoal na pergunta, e nenhum texto de pergunta/resposta no log.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAskHandler, createAskState, lerSseGradio } from '../_lib/ask-handler.js';
import { RODAPES } from '../_lib/fidelidade.js';
import { capturarLog, mkRequest, novoIid, relogio } from './_helpers.mjs';

const ENV = Object.freeze({ ASK_ENABLED: '1', HF_ASK_SPACE_URL: 'https://x-saibatudo-llms.hf.space', HF_TOKEN: 'hf_teste', ASK_MODEL_VERSION: 'qwen3-4b-base', HF_ASK_DAILY_BUDGET: '100' });
const corpo = (extra = {}) => ({ q: 'o que mostra o gráfico?', lang: 'pt-BR', context: 'palavras: king, queen; cosseno 0.87', trechos: [{ id: 'pt-BR:embeddings', texto: 'Vetores de 50 números.' }], v: 1, client: 'web', iid: novoIid(), ...extra });
const post = (json, origin = 'https://saibatudo.net') => mkRequest({ url: 'https://saibatudo.net/llms/api/ask', json, headers: { origin, 'x-forwarded-for': '203.0.113.9' } });

/** Space simulado: responde ao POST com event_id e ao GET com SSE "complete" contendo a resposta. */
function spaceFalso(answer, { model = 'Qwen3-4B', status = 200 } = {}) {
  const chamadas = [];
  const fetch = async (url, init = {}) => {
    chamadas.push({ url: String(url), method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null, auth: init.headers?.Authorization });
    if (init.method === 'POST') return new Response(JSON.stringify({ event_id: 'ev123' }), { status });
    const dado = JSON.stringify([{ ok: true, answer, model, gpu_s: 2.1 }]);
    return new Response(`event: complete\ndata: ${dado}\n\n`, { status: 200 });
  };
  return { fetch, chamadas };
}
const montar = (fetch, env = ENV) => {
  const now = relogio();
  const { log, eventos } = capturarLog();
  const handle = createAskHandler({ env: () => env, fetch, now, log, state: createAskState({ now }) });
  return { handle, eventos, now };
};

test('lerSseGradio: pega o último evento complete/error', () => {
  assert.deepEqual(lerSseGradio('event: heartbeat\ndata: 1\n\nevent: complete\ndata: [1]\n'), { evento: 'complete', dado: '[1]' });
  assert.equal(lerSseGradio('data: x'), null);
});

test('desligada por padrão: 503 disabled sem ASK_ENABLED ou sem Space', async () => {
  for (const env of [{}, { ASK_ENABLED: '1' }, { ASK_ENABLED: '1', HF_ASK_SPACE_URL: 'https://x.hf.space' }]) {
    const { handle } = montar(async () => { throw new Error('não deveria chamar'); }, env);
    const res = await handle(post(corpo()));
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, error: 'disabled' });
  }
});

test('feliz: chama o Space com [pergunta, idioma, contexto, trechos], devolve answer + model + cached:false e não loga a pergunta', async () => {
  const { fetch, chamadas } = spaceFalso(`O gráfico mostra king e queen com cosseno 0.87. ${RODAPES['pt-BR']}, pode conter erros.`);
  const { handle, eventos } = montar(fetch);
  const res = await handle(post(corpo()));
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.ok, true);
  assert.equal(j.model, 'Qwen3-4B');
  assert.equal(j.cached, false);
  assert.match(j.answer, /king e queen/);
  assert.equal(chamadas[0].method, 'POST');
  assert.equal(chamadas[0].url, 'https://x-saibatudo-llms.hf.space/gradio_api/call/ask');
  assert.equal(chamadas[0].auth, 'Bearer hf_teste');
  assert.deepEqual(chamadas[0].body.data.slice(0, 3), ['o que mostra o gráfico?', 'pt-BR', 'palavras: king, queen; cosseno 0.87']);
  assert.deepEqual(JSON.parse(chamadas[0].body.data[3]), [{ id: 'pt-BR:embeddings', texto: 'Vetores de 50 números.' }]);
  assert.equal(chamadas[1].url, 'https://x-saibatudo-llms.hf.space/gradio_api/call/ask/ev123');
  const texto = JSON.stringify(eventos);
  assert.ok(!texto.includes('gráfico') && !texto.includes('king'), 'log sem pergunta nem resposta');
  assert.equal(eventos.at(-1).status, 200);
  assert.equal(eventos.at(-1).provider, 'hf');
});

test('verificador: sem rodapé → 422 rejected (motivo rodape); número fora do contexto → 422 (motivo numero)', async () => {
  const semRodape = montar(spaceFalso('O gráfico mostra king e queen.').fetch);
  const r1 = await semRodape.handle(post(corpo()));
  assert.equal(r1.status, 422);
  assert.deepEqual(await r1.json(), { ok: false, error: 'rejected', motivo: 'rodape' });
  const numero = montar(spaceFalso(`O cosseno é 0.91. ${RODAPES['pt-BR']}.`).fetch);
  const r2 = await numero.handle(post(corpo()));
  assert.deepEqual(await r2.json(), { ok: false, error: 'rejected', motivo: 'numero' });
});

test('cache: a mesma pergunta+idioma+contexto volta do cache (cached:true) sem chamar o Space de novo; idioma diferente não', async () => {
  const { fetch, chamadas } = spaceFalso(`Explicação. ${RODAPES['pt-BR']}.`);
  const { handle } = montar(fetch);
  const iid = novoIid();
  await handle(post(corpo({ iid })));
  const r2 = await handle(post(corpo({ iid })));
  assert.equal((await r2.json()).cached, true);
  assert.equal(chamadas.length, 2, 'uma chamada (POST+GET) só');
  await handle(post(corpo({ iid, lang: 'en' })));
  assert.equal(chamadas.length, 4, 'outro idioma = nova chamada');
});

test('400 em corpo inválido (sem lang, pergunta curta), 403 em origem não permitida, 405 em GET, 429 acima do limite por minuto', async () => {
  const { handle } = montar(spaceFalso(`x ${RODAPES['pt-BR']}`).fetch);
  const semLang = await handle(post(corpo({ lang: undefined })));
  assert.equal(semLang.status, 400);
  assert.equal((await semLang.json()).field, 'lang');
  assert.equal((await handle(post(corpo({ q: 'ab' })))).status, 400);
  assert.equal((await handle(post(corpo(), 'https://malicioso.example'))).status, 403);
  assert.equal((await handle(mkRequest({ method: 'GET', url: 'https://saibatudo.net/llms/api/ask', headers: { origin: 'https://saibatudo.net' } }))).status, 405);
  const limitado = montar(spaceFalso(`x ${RODAPES['pt-BR']}`).fetch, { ...ENV, RATE_IP_PER_MIN: '2' });
  await limitado.handle(post(corpo({ q: 'pergunta um sobre vetores' })));
  await limitado.handle(post(corpo({ q: 'pergunta dois sobre vetores' })));
  const r = await limitado.handle(post(corpo({ q: 'pergunta tres sobre vetores' })));
  assert.equal(r.status, 429);
  assert.ok(r.headers.get('retry-after'));
});

test('dado pessoal na pergunta → 422 dadopessoal sem chamar o Space; Space fora do ar → 502; timeout → 504; orçamento do dia → 503 budget', async () => {
  const chamou = { n: 0 };
  const { handle } = montar(async () => { chamou.n++; return new Response('x'); });
  const r = await handle(post(corpo({ q: 'meu email é fulano@gmail.com, explique' })));
  assert.deepEqual(await r.json(), { ok: false, error: 'dadopessoal' });
  assert.equal(chamou.n, 0);
  const fora = montar(async () => new Response('erro', { status: 500 }));
  assert.equal((await fora.handle(post(corpo()))).status, 502);
  const lento = montar(async (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' })))), { ...ENV, HF_ASK_TIMEOUT_MS: '1000' });
  assert.equal((await lento.handle(post(corpo()))).status, 504);
  const semVerba = montar(spaceFalso(`x ${RODAPES['pt-BR']}`).fetch, { ...ENV, HF_ASK_DAILY_BUDGET: '0' });
  const rb = await semVerba.handle(post(corpo()));
  assert.equal(rb.status, 503);
  assert.equal((await rb.json()).error, 'budget');
});
