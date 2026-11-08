// Loja do bot: DataStore do site lido do DISCO da função (pacote empacotado pelo includeFiles), sem rede. Usa o pacote de teste.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_BOT, criarStoreDoDisco, fetchDoDisco, storeDoDisco } from '../_lib/bot/loja.js';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);

test('fetchDoDisco: serve arquivos do pacote (ignorando ?v=), 404 fora da base e para arquivo ausente', async () => {
  const f = fetchDoDisco(FIXTURE);
  const ok = await f(`${BASE_BOT}manifest.json?v=abc`);
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(Buffer.from(await ok.arrayBuffer()).toString('utf8')).version, 'fixture-1');
  assert.equal((await f('https://outro.local/x.json')).status, 404);
  assert.equal((await f(`${BASE_BOT}nao-existe.json`)).status, 404);
});

test('criarStoreDoDisco: pacote de teste iniciado com assinatura verificada; elementos e compostos no índice', async () => {
  const store = await criarStoreDoDisco({ dir: FIXTURE });
  assert.equal(store.sig.estado, 'verificada');
  assert.ok(store.porSimbolo.has('O'));
  assert.ok(store.indice.porCid.has(962), 'água no pacote de teste');
});

test('storeDoDisco: memoiza por pasta e esquece a promessa rejeitada', async () => {
  const a = storeDoDisco({ dir: FIXTURE });
  assert.equal(storeDoDisco({ dir: FIXTURE }), a, 'mesma promessa');
  const ruim = new URL('../../web/test/fixtures/nao-existe/', import.meta.url);
  const primeira = storeDoDisco({ dir: ruim });
  await assert.rejects(primeira);
  const segunda = storeDoDisco({ dir: ruim });
  assert.notEqual(segunda, primeira, 'tenta de novo em vez de devolver a promessa rejeitada antiga');
  await assert.rejects(segunda);
});
