// POST /api/nlu devolve `resolucao` (14/10/2026): o `composto` copiado pelo modelo resolvido no índice do pacote (CID) ou sugestões;
// null quando não há composto ou índice. A resolução vai junto no cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNluHandler, createNluState } from '../_lib/nlu-handler.js';
import { criarResolvedor, resolverComposto } from '../_lib/compostos.js';
import { ENV_BASE, SAIDA_MASSA_FERRO, bodyNlu, capturarLog, mkRequest, relogio, respostaModal } from './_helpers.mjs';

const URL_NLU = 'https://saibatudo.net/quimica/api/nlu';
const post = (q) => mkRequest({ url: URL_NLU, json: bodyNlu(q), headers: { 'x-forwarded-for': '203.0.113.9' } });

const INDICE_MINI = {
  porCid: { 962: 'lote-001', 1118: 'lote-001' },
  nomes: [['acido sulfurico', 1118], ['agua', 962], ['h2o', 962], ['h2so4', 1118]],
  nomesPorIdioma: { en: [['water', 962]] },
};
const resolvedorMini = criarResolvedor(INDICE_MINI);

function montar({ saida, resolver = (t) => resolverComposto(t, resolvedorMini) } = {}) {
  const chamadas = [];
  const fetchFalso = async (url, init) => {
    chamadas.push({ url: String(url), init });
    return respostaModal(saida);
  };
  const now = relogio();
  const cap = capturarLog();
  const handler = createNluHandler({ env: () => ENV_BASE, fetch: fetchFalso, now, log: cap.log, state: createNluState({ now }), resolver });
  return { handler, chamadas };
}

test('composto conhecido: resolucao.composto traz o CID e o nome de busca; a 2ª chamada vem do cache com a mesma resolução', async () => {
  const { handler, chamadas } = montar({ saida: { intent: 'MASSA_MOLAR', composto: 'água' } });
  const r1 = await (await handler(post('massa molar da água'))).json();
  assert.deepEqual(r1.nlu, { intent: 'MASSA_MOLAR', composto: 'água' });
  assert.deepEqual(r1.resolucao, { composto: { cid: '962', nome: 'agua' } });
  assert.equal(r1.cached, false);
  const r2 = await (await handler(post('massa molar da água'))).json();
  assert.equal(r2.cached, true);
  assert.deepEqual(r2.resolucao, { composto: { cid: '962', nome: 'agua' } });
  assert.equal(chamadas.length, 1);
});

test('fórmula em minúsculas e nome em inglês resolvem', async () => {
  const { handler } = montar({ saida: { intent: 'MASSA_MOLAR', composto: 'h2so4' } });
  const r = await (await handler(post('molar mass h2so4'))).json();
  assert.equal(r.resolucao.composto.cid, '1118');
  const { handler: h2 } = montar({ saida: { intent: 'COMPOSTO', composto: 'water' } });
  const r2 = await (await h2(post('what is water?'))).json();
  assert.equal(r2.resolucao.composto.cid, '962');
});

test('composto desconhecido: cid null e sugestões (para o cliente perguntar "você quis dizer…?"), intenção preservada', async () => {
  const { handler } = montar({ saida: { intent: 'MASSA_MOLAR', composto: 'acido sulfurco' } });
  const r = await (await handler(post('massa molar do acido sulfurco'))).json();
  assert.equal(r.nlu.intent, 'MASSA_MOLAR');
  assert.equal(r.resolucao.composto.cid, null);
  assert.deepEqual(r.resolucao.composto.sugestoes.map((s) => s.cid), ['1118']);
});

test('sem composto na interpretação, resolucao é null; sem índice também', async () => {
  const { handler } = montar({ saida: SAIDA_MASSA_FERRO });
  const r = await (await handler(post('qual a massa atômica do ferro?'))).json();
  assert.equal(r.nlu.elemento, 'Fe');
  assert.equal(r.resolucao, null);
  const { handler: semIndice } = montar({ saida: { intent: 'MASSA_MOLAR', composto: 'água' }, resolver: () => null });
  const r2 = await (await semIndice(post('massa molar da água'))).json();
  assert.equal(r2.resolucao, null);
  assert.equal(r2.nlu.composto, 'água');
});

test('a resolução nunca derruba a resposta: resolvedor que lança vira null', async () => {
  const { handler } = montar({ saida: { intent: 'MASSA_MOLAR', composto: 'água' }, resolver: () => { throw new Error('boom'); } });
  const res = await handler(post('massa molar da água'));
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.resolucao, null);
});
