// Conversas do bot: contexto por conversa (30 min), dedup de evento e limites por conversa — memória da instância + Redis opcional
// (chaves com o SHA-256 do id, nunca o id em claro), FALHA ABERTA quando o Redis não responde. Sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedLimiter } from '../_lib/compartilhado.js';
import { TTL_CONVERSA_MS, criarConversas, hashConversa } from '../_lib/bot/conversas.js';
import { relogio } from './_helpers.mjs';

const ENV_REDIS = { UPSTASH_REDIS_REST_URL: 'https://redis.exemplo.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tok' };

/** Redis falso: executa SET/GET/DEL/INCR/EXPIRE em memória; `quebrado` responde 500. */
function redisFalso({ quebrado = false } = {}) {
  const dados = new Map();
  const comandos = [];
  const fetchFn = async (url, init) => {
    if (quebrado) return new Response('erro', { status: 500 });
    const lote = JSON.parse(init.body);
    comandos.push(...lote);
    const out = lote.map(([cmd, k, v, ...resto]) => {
      if (cmd === 'SET') { if (resto.includes('NX') && dados.has(k)) return { result: null }; dados.set(k, v); return { result: 'OK' }; }
      if (cmd === 'GET') return { result: dados.get(k) ?? null };
      if (cmd === 'DEL') return { result: dados.delete(k) ? 1 : 0 };
      if (cmd === 'INCR') { dados.set(k, String(Number(dados.get(k) ?? 0) + 1)); return { result: Number(dados.get(k)) }; }
      return { result: 1 };
    });
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { fetchFn, dados, comandos };
}

const CTX = {
  ultimoContexto: { intent: 'MASSA_MOLAR', composto: 962 },
  ultimaInterpretacao: { intent: 'MASSA_MOLAR', composto: 962 },
  ultima: { q: 'massa molar da água', directAnswer: '18,015 g/mol', parsed: { intent: 'MASSA_MOLAR', elemento: null, composto: 962 } },
  sugestoes: ['pH de HCl 0,01 mol/L'],
};

test('hashConversa: HMAC-SHA256 com chave do servidor (hex, determinístico, não contém o id); chaves diferentes dão resumos diferentes', () => {
  const h = hashConversa(827000000, 'chave-a');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, hashConversa('827000000', 'chave-a'));
  assert.ok(!h.includes('827000000'));
  assert.notEqual(h, hashConversa(827000000, 'chave-b'), 'um id denso não pode ser enumerado sem a chave');
  assert.notEqual(h, hashConversa(827000000), 'sem chave (só testes) o resumo é outro');
});

test('criarConversas({ chave }): as chaves do Redis usam o HMAC com a chave do servidor', async () => {
  const r = redisFalso();
  const shared = createSharedLimiter({ env: () => ENV_REDIS, fetchFn: r.fetchFn, now: relogio() });
  const c = criarConversas({ shared, now: relogio(), chave: 'segredo-do-webhook' });
  await c.guardar('827000000', CTX);
  assert.ok(r.dados.has(`bot:ctx:${hashConversa('827000000', 'segredo-do-webhook')}`));
  assert.ok(!r.dados.has(`bot:ctx:${hashConversa('827000000')}`));
});

test('memória: guardar/obter/apagar e expiração em 30 min', async () => {
  const now = relogio();
  const c = criarConversas({ now });
  assert.equal(await c.obter('1'), null);
  await c.guardar('1', CTX);
  assert.deepEqual((await c.obter('1')).ultima.parsed, CTX.ultima.parsed);
  now.avancar(TTL_CONVERSA_MS + 1);
  assert.equal(await c.obter('1'), null, 'expirou');
  await c.guardar('1', CTX);
  await c.apagar('1');
  assert.equal(await c.obter('1'), null);
});

test('Redis: chaves bot:ctx:<hash> com EX 1800, bot:evt:<hash> com NX; o id nunca aparece em claro; outra instância lê o contexto', async () => {
  const r = redisFalso();
  const now = relogio();
  const shared = createSharedLimiter({ env: () => ENV_REDIS, fetchFn: r.fetchFn, now });
  const a = criarConversas({ shared, now });
  await a.guardar('827000000', CTX);
  const chaveCtx = `bot:ctx:${hashConversa('827000000')}`;
  assert.ok(r.dados.has(chaveCtx));
  assert.ok([...r.dados.keys()].every((k) => !k.includes('827000000')));
  assert.ok(r.comandos.some((c) => c[0] === 'SET' && c[1] === chaveCtx && c[3] === 'EX' && c[4] === '1800'));
  const b = criarConversas({ shared, now });
  assert.equal((await b.obter('827000000')).ultima.q, CTX.ultima.q, 'instância nova lê do Redis');
  assert.equal(await a.jaVisto('tg:1'), false);
  assert.equal(await b.jaVisto('tg:1'), true, 'dedup entre instâncias via SET NX');
  assert.ok(r.comandos.some((c) => c[0] === 'SET' && c[1].startsWith('bot:evt:') && c.includes('NX')));
});

test('falha aberta: Redis com erro → só memória, sem lançar', async () => {
  const r = redisFalso({ quebrado: true });
  const now = relogio();
  const c = criarConversas({ shared: createSharedLimiter({ env: () => ENV_REDIS, fetchFn: r.fetchFn, now }), now });
  await c.guardar('1', CTX);
  assert.equal((await c.obter('1')).ultima.q, CTX.ultima.q);
  assert.equal(await c.jaVisto('tg:9'), false);
  assert.equal(await c.jaVisto('tg:9'), true);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false);
});

test('limites: 11ª mensagem no minuto e 201ª no dia são barradas; a janela do minuto libera depois de 60 s', async () => {
  const now = relogio();
  const c = criarConversas({ now });
  for (let i = 0; i < 10; i++) assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false, `msg ${i + 1}`);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), true);
  now.avancar(60_001);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false);
  const d = criarConversas({ now });
  for (let i = 0; i < 200; i++) await d.limiteExcedido('2', { porMin: 1000, porDia: 200 });
  assert.equal(await d.limiteExcedido('2', { porMin: 1000, porDia: 200 }), true);
});
