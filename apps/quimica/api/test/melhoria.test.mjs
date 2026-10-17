// POST /api/melhoria ("Ajudar a melhorar o app"): desligado por padrão, validação, filtros de pedido perigoso e de dado pessoal, limites,
// Redis simulado (sem rede) e privacidade (nada de iid/IP no que é guardado nem do texto no log).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveDoMes, comandosDoMes, createMelhoriaHandler, createMelhoriaState, filtrarItens, MAX_ITENS, validateMelhoriaBody
} from '../_lib/melhoria-handler.js';
import { motivoDadoPessoal, temDadoPessoal } from '../_lib/dadopessoal.js';
import { createSharedLimiter } from '../_lib/compartilhado.js';
import { handleHealth } from '../health.js';
import handlerNode from '../melhoria.js';
import { IID_V4, capturarLog, fakeNodeReq, fakeNodeRes, mkRequest, novoIid, relogio } from './_helpers.mjs';

const REDIS = { UPSTASH_REDIS_REST_URL: 'https://exemplo.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tok' };
const ENV_ON = { ...REDIS, MELHORIA_ENABLED: '1' };

/** Redis falso: guarda os pipelines recebidos e responde como o Upstash. `falha` = 500 só nos envios de perguntas (RPUSH). */
function redisFalso({ falha = false } = {}) {
  const pedidos = [];
  const listas = new Map();
  const fetchFn = async (url, init) => {
    const cmds = JSON.parse(init.body);
    pedidos.push(cmds);
    if (falha && cmds[0][0] === 'RPUSH') return new Response('erro', { status: 500 });
    const contadores = new Map();
    const res = cmds.map(([op, chave, ...args]) => {
      if (op === 'RPUSH') { const l = listas.get(chave) ?? []; l.push(...args); listas.set(chave, l); return { result: l.length }; }
      if (op === 'LTRIM') { const l = listas.get(chave) ?? []; const ini = Number(args[0]); listas.set(chave, l.slice(ini < 0 ? Math.max(0, l.length + ini) : ini)); return { result: 'OK' }; }
      if (op === 'INCR') { const n = (contadores.get(chave) ?? 0) + 1; contadores.set(chave, n); return { result: n }; }
      return { result: 1 };
    });
    return new Response(JSON.stringify(res), { status: 200 });
  };
  const salvos = () => pedidos.filter((p) => p[0][0] === 'RPUSH');
  const registros = (mes = '2026-10') => (listas.get(`quimica:melhoria:${mes}`) ?? []).map((x) => JSON.parse(x));
  return { fetchFn, pedidos, salvos, registros, listas };
}

function montar({ env = ENV_ON, redis = redisFalso(), now = relogio() } = {}) {
  const cap = capturarLog();
  const shared = createSharedLimiter({ env: () => env, fetchFn: redis.fetchFn, now });
  const handler = createMelhoriaHandler({ env: () => env, now, log: cap.log, state: createMelhoriaState({ now, shared }) });
  return { handler, redis, cap, now };
}

const URL_M = 'https://saibatudo.net/quimica/api/melhoria';
const post = (body, headers = {}) => mkRequest({ url: URL_M, json: body, headers: { 'x-forwarded-for': '203.0.113.9', ...headers } });
const corpo = (itens, extra = {}) => ({
  v: 1, client: 'web', iid: IID_V4, idioma: 'pt-BR',
  itens: itens.map((q) => (typeof q === 'string' ? { q, intentLocal: 'DESCONHECIDA' } : q)), ...extra,
});

test('desligado por padrão: sem MELHORIA_ENABLED=1 ou sem Redis responde 503 disabled e não toca no store', async () => {
  for (const env of [REDIS, { MELHORIA_ENABLED: '1' }, {}, { ...REDIS, MELHORIA_ENABLED: 'true' }, { MELHORIA_ENABLED: '1', UPSTASH_REDIS_REST_URL: 'http://inseguro', UPSTASH_REDIS_REST_TOKEN: 't' }]) {
    const m = montar({ env });
    const res = await m.handler(post(corpo(['qual a cor do enxofre derretido'])));
    assert.equal(res.status, 503, JSON.stringify(env));
    assert.equal((await res.json()).error, 'disabled');
    assert.equal(m.redis.pedidos.length, 0);
  }
});

test('ligado: guarda só {q, intentLocal, idioma, client, t} na lista do mês, com LTRIM e EXPIREAT', async () => {
  const m = montar();
  const res = await m.handler(post(corpo([
    { q: 'qual a  cor do enxofre derretido', intentLocal: 'DESCONHECIDA', t: '2026-09-30' },
    { q: 'quanto pesa um mol de sal', intentLocal: 'COMPOSTO' },
  ])));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, aceitos: 2, descartados: 0 });
  assert.equal(m.redis.salvos().length, 1, 'um único pipeline');
  const [rpush, ltrim, expireat] = m.redis.salvos()[0];
  assert.equal(rpush[0], 'RPUSH');
  assert.equal(rpush[1], 'quimica:melhoria:2026-10');
  assert.deepEqual(ltrim, ['LTRIM', 'quimica:melhoria:2026-10', '-5000', '-1']);
  assert.equal(expireat[0], 'EXPIREAT');
  // fim de outubro (1/11 0h de Brasília) + 90 dias
  assert.equal(Number(expireat[2]), Math.floor((Date.UTC(2026, 10, 1, 3) + 90 * 86_400_000) / 1000));
  assert.deepEqual(m.redis.registros(), [
    { q: 'qual a cor do enxofre derretido', intentLocal: 'DESCONHECIDA', idioma: 'pt-BR', client: 'web', t: '2026-09-30' },
    { q: 'quanto pesa um mol de sal', intentLocal: 'COMPOSTO', idioma: 'pt-BR', client: 'web', t: '2026-10-01' },
  ]);
  for (const r of m.redis.registros()) assert.deepEqual(Object.keys(r), ['q', 'intentLocal', 'idioma', 'client', 't']);
});

test('PRIVACIDADE: nada do iid nem do IP vai para a lista; nenhum horário, só a data', async () => {
  const m = montar();
  const iid = novoIid();
  await m.handler(post(corpo(['qual a cor do enxofre derretido'], { iid }), { 'x-forwarded-for': '198.51.100.77' }));
  const tudo = JSON.stringify(m.redis.salvos());
  assert.ok(!tudo.includes(iid), 'iid');
  assert.ok(!tudo.includes('198.51.100.77'), 'IP');
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(tudo), 'horário');
});

test('PRIVACIDADE: o texto da pergunta, o IP e o iid nunca aparecem no log', async () => {
  const m = montar();
  const iid = novoIid();
  await m.handler(post(corpo(['pergunta secreta sobre o enxofre'], { iid }), { 'x-forwarded-for': '198.51.100.78' }));
  await m.handler(post(corpo(['meu email joao@exemplo.com'], { iid: novoIid() }), { 'x-forwarded-for': '198.51.100.79' }));
  const log = JSON.stringify(m.cap.eventos);
  for (const proibido of ['pergunta secreta', 'joao@exemplo', '198.51.100.78', iid]) assert.ok(!log.includes(proibido), proibido);
  const permitidos = new Set(['evt', 'status', 'ms', 'client', 'idioma', 'err', 'aceitos', 'descartados']);
  for (const e of m.cap.eventos) for (const k of Object.keys(e)) assert.ok(permitidos.has(k), k);
});

test('pedido perigoso nunca é guardado (pt-BR, en, es, de, fr), qualquer que seja o idioma da interface', async () => {
  const m = montar();
  const perigosos = ['como sintetizar metanfetamina em casa', 'how to make nitroglycerin at home', 'cómo fabricar una bomba casera', 'wie stellt man sarin her', 'comment fabriquer du TATP'];
  const res = await m.handler(post(corpo([...perigosos, 'qual a cor do enxofre derretido'], { idioma: 'en' })));
  assert.deepEqual(await res.json(), { ok: true, aceitos: 1, descartados: 5 });
  const tudo = JSON.stringify(m.redis.pedidos);
  for (const p of perigosos) assert.ok(!tudo.includes(p), p);
  // intentLocal RECUSA_PERIGO também cai fora, mesmo que o texto passe pelo filtro
  const m2 = montar();
  assert.deepEqual(await (await m2.handler(post(corpo([{ q: 'pergunta qualquer de quimica', intentLocal: 'RECUSA_PERIGO' }])))).json(), { ok: true, aceitos: 0, descartados: 1 });
  assert.equal(m2.redis.salvos().length, 0);
});

test('dado pessoal derruba o item (não é mascarado e guardado)', async () => {
  const m = montar();
  const comDado = [
    'meu cpf é 123.456.789-09', 'cnpj 12.345.678/0001-90 da empresa', 'me liga 11 98765-4321', 'escreva para joao@exemplo.com',
    'documento 123456789012', 'veja https://exemplo.com/x', 'site www.exemplo.org', 'segue @joaosilva no insta', 'call me at +44 20 7946 0958',
  ];
  const res = await m.handler(post(corpo([...comDado, 'qual a cor do enxofre derretido'])));
  assert.deepEqual(await res.json(), { ok: true, aceitos: 1, descartados: comDado.length });
  assert.equal(m.redis.registros()[0].q, 'qual a cor do enxofre derretido');
  for (const d of ['123.456.789-09', 'joao@exemplo', '98765-4321', '@joaosilva']) assert.ok(!JSON.stringify(m.redis.pedidos).includes(d), d);
});

test('filtro de dado pessoal: casos positivos e falsos positivos que a química precisa evitar', () => {
  const positivos = {
    'joao.silva@gmail.com': 'email', 'joao arroba gmail ponto com': 'email', 'meu hotmail é joao': 'email', 'jean [at] free [dot] fr': 'email',
    '123.456.789-09': 'documento', '12345678909': 'documento', '12.345.678/0001-90': 'documento',
    '(11) 98765-4321': 'telefone', '98765-4321': 'telefone', '3333-4444': 'telefone', '+33 1 23 45 67 89': 'telefone', '+1 (415) 555-2671': 'telefone',
    'http://x.y/z': 'url', 'www.algo.com.br': 'url', 'veja exemplo.com.br/pagina': 'url', 'site quimica.org': 'url',
    'fala com @fulano_99': 'usuario', '123 456 789 012': 'numero', '1234567890123': 'numero',
  };
  for (const [q, motivo] of Object.entries(positivos)) assert.equal(motivoDadoPessoal(q), motivo, q);
  const legitimos = [
    'qual o CAS 7732-18-5', 'cas 1234567-89-0 é de quê', 'constante de avogadro 6.02214076e23', 'carga do elétron 1,602176634e-19 C',
    'massa molar de CuSO4.5H2O', 'Na2CO3.H2O é hidrato?', 'ponto de fusão entre 1000-1500 K', 'C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O',
    'converter 25 °C em K', 'what is the boiling point of water at stp. thanks', 'z.B. Natriumchlorid', 'densidade do ferro em g/cm3',
    'quanto é 1 000 000 de mols', 'pH de 0,01 mol/L de HCl', 'configuração 1s2 2s2 2p6 3s2 3p6',
  ];
  for (const q of legitimos) assert.equal(temDadoPessoal(q), false, q);
});

test('validação: método, corpo, idioma, itens, client, iid, intentLocal e data', async () => {
  const m = montar();
  assert.equal((await m.handler(mkRequest({ method: 'GET', url: URL_M }))).status, 405);
  const ok = 'qual a cor do enxofre derretido';
  const casos = [
    [corpo([ok]), 200],
    [{ ...corpo([ok]), v: 2 }, 400],
    [{ ...corpo([ok]), client: 'ios' }, 400],
    [{ ...corpo([ok]), iid: 'nao-e-uuid' }, 400],
    [{ ...corpo([ok]), idioma: 'zh' }, 400],
    [{ ...corpo([ok]), idioma: undefined }, 400],
    [{ ...corpo([ok]), itens: [] }, 400],
    [{ ...corpo([ok]), itens: 'texto' }, 400],
    [corpo(Array.from({ length: MAX_ITENS + 1 }, (_, i) => `pergunta valida ${i}`)), 400],
    [{ ...corpo([ok]), itens: [{ q: 123 }] }, 400],
    [{ ...corpo([ok]), itens: [null] }, 400],
    [{ ...corpo([ok]), itens: [{ q: ok, intentLocal: 42 }] }, 400],
    [{ ...corpo([ok]), itens: [{ q: ok, intentLocal: 'x; drop' }] }, 400],
    [{ ...corpo([ok]), itens: [{ q: ok, t: '2026-10-16T10:00:00Z' }] }, 400],
    [{ ...corpo([ok]), itens: [{ q: ok, t: '2026-02-30' }] }, 400],
    [{ ...corpo([ok]), itens: [{ q: 'x'.repeat(601) }] }, 400],
    [{ ...corpo([ok]), itens: [{ q: ok }] }, 200], // intentLocal ausente vira DESCONHECIDA
  ];
  for (const [b, esperado] of casos) {
    const mm = montar();
    const res = await mm.handler(post(b));
    assert.equal(res.status, esperado, JSON.stringify(b).slice(0, 120));
  }
  // intenção desconhecida do servidor é guardada como DESCONHECIDA (o NLU local pode ter intenção nova)
  const m3 = montar();
  await m3.handler(post(corpo([{ q: ok, intentLocal: 'INTENCAO_NOVA' }])));
  assert.equal(m3.redis.registros()[0].intentLocal, 'DESCONHECIDA');
  // corpo não-JSON e tipo errado
  assert.equal((await m.handler(mkRequest({ url: URL_M, body: 'x', headers: { 'content-type': 'text/plain' } }))).status, 415);
  assert.equal((await m.handler(mkRequest({ url: URL_M, body: '{', headers: { 'content-type': 'application/json' } }))).status, 400);
});

test('limite de itens: 10 itens de 300 caracteres acentuados cabem no corpo; mais de 8 KB = 413', async () => {
  const m = montar();
  const longa = (i) => `${i} ${'ácido sulfúrico concentrado '.repeat(11)}`.slice(0, 300);
  const res = await m.handler(post(corpo(Array.from({ length: 10 }, (_, i) => longa(i)))));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).aceitos, 10);
  const enorme = { ...corpo(['ok ok ok']), lixo: 'x'.repeat(9000) };
  assert.equal((await m.handler(post(enorme))).status, 413);
});

test('curta, longa e repetida no mesmo envio são descartadas', async () => {
  const m = montar();
  const r = await (await m.handler(post(corpo(['oi', 'x'.repeat(400), 'qual a cor do enxofre', 'Qual a cor do enxofre  ', 'outra pergunta boa'])))).json();
  assert.deepEqual(r, { ok: true, aceitos: 2, descartados: 3 });
  const tudoFora = montar();
  assert.deepEqual(await (await tudoFora.handler(post(corpo(['oi', 'cpf 123.456.789-09'])))).json(), { ok: true, aceitos: 0, descartados: 2 });
  assert.equal(tudoFora.redis.salvos().length, 0, 'nada é guardado');
});

test('máximo por mês: LTRIM mantém só as mais recentes; mês novo usa outra lista', async () => {
  const relo = relogio();
  const m = montar({ env: { ...ENV_ON, MELHORIA_MAX_POR_MES: '100', MELHORIA_PER_HOUR: '1000', MELHORIA_PER_DAY: '1000' }, now: relo });
  for (let lote = 0; lote < 11; lote++) {
    const res = await m.handler(post(corpo(Array.from({ length: 10 }, (_, i) => `pergunta numero ${lote} ${i} sobre sais`))));
    assert.equal(res.status, 200);
  }
  const regs = m.redis.registros();
  assert.equal(regs.length, 100);
  assert.equal(regs[0].q, 'pergunta numero 1 0 sobre sais', 'as 10 mais antigas saíram');
  relo.avancar(31 * 86_400_000);
  await m.handler(post(corpo(['pergunta de novembro sobre sais'])));
  assert.equal(m.redis.registros('2026-11').length, 1);
  assert.equal(chaveDoMes(Date.UTC(2026, 9, 31, 2, 0)).chave, 'quimica:melhoria:2026-10', '23h de 30/10 em Brasília ainda é outubro');
  assert.equal(chaveDoMes(Date.UTC(2026, 10, 1, 2, 59)).chave, 'quimica:melhoria:2026-10');
  assert.equal(chaveDoMes(Date.UTC(2026, 10, 1, 3, 0)).chave, 'quimica:melhoria:2026-11');
});

test('limite por IP/hora e por instalação/dia (429 com Retry-After)', async () => {
  const m = montar({ env: { ...ENV_ON, MELHORIA_PER_HOUR: '2', MELHORIA_PER_DAY: '50' } });
  const ip = { 'x-forwarded-for': '203.0.113.31' };
  assert.equal((await m.handler(post(corpo(['pergunta numero um']), ip))).status, 200);
  assert.equal((await m.handler(post(corpo(['pergunta numero dois'], { iid: novoIid() }), ip))).status, 200);
  const terceira = await m.handler(post(corpo(['pergunta numero tres'], { iid: novoIid() }), ip));
  assert.equal(terceira.status, 429);
  assert.ok(Number(terceira.headers.get('retry-after')) >= 1);

  const porIid = montar({ env: { ...ENV_ON, MELHORIA_PER_HOUR: '100', MELHORIA_PER_DAY: '2' } });
  const iid = novoIid();
  for (const [n, ipx] of [[1, '203.0.113.41'], [2, '203.0.113.42']]) assert.equal((await porIid.handler(post(corpo([`pergunta ${n} sobre sais`], { iid }), { 'x-forwarded-for': ipx }))).status, 200);
  assert.equal((await porIid.handler(post(corpo(['pergunta 3 sobre sais'], { iid }), { 'x-forwarded-for': '203.0.113.43' }))).status, 429);
});

test('store indisponível: 503 unavailable (a captura não finge ter guardado)', async () => {
  const m = montar({ redis: redisFalso({ falha: true }) });
  const res = await m.handler(post(corpo(['qual a cor do enxofre derretido'])));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'unavailable');
});

test('CORS: origem não permitida é negada; sem Origin (Android) e saibatudo.net passam; preflight 204', async () => {
  const m = montar();
  assert.equal((await m.handler(post(corpo(['qual a cor do enxofre derretido']), { origin: 'https://evil.example.com' }))).status, 403);
  assert.equal((await m.handler(post(corpo(['qual a cor do enxofre derretido'], { iid: novoIid() }), { origin: 'https://saibatudo.net' }))).status, 200);
  const pre = await m.handler(mkRequest({ method: 'OPTIONS', url: URL_M, headers: { origin: 'https://saibatudo.net' } }));
  assert.equal(pre.status, 204);
});

test('funções puras: filtrarItens e comandosDoMes', () => {
  const v = validateMelhoriaBody(corpo(['qual a cor do enxofre derretido', 'como sintetizar metanfetamina em casa']));
  assert.ok(v.ok);
  const f = filtrarItens(v.value.itens);
  assert.equal(f.aceitos.length, 1);
  assert.equal(f.descartados, 1);
  const cmds = comandosDoMes(f.aceitos, { idioma: 'fr', client: 'android', agora: Date.UTC(2026, 9, 16, 12), maxPorMes: 5000 });
  assert.deepEqual(JSON.parse(cmds[0][2]), { q: 'qual a cor do enxofre derretido', intentLocal: 'DESCONHECIDA', idioma: 'fr', client: 'android', t: '2026-10-16' });
});

test('adaptador Node (Vercel): sem variáveis responde 503 disabled', async () => {
  const antes = { m: process.env.MELHORIA_ENABLED };
  delete process.env.MELHORIA_ENABLED;
  try {
    const res = fakeNodeRes();
    await handlerNode(fakeNodeReq({ url: '/quimica/api/melhoria', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo(['qual a cor do enxofre'])) }), res);
    assert.equal(res.statusCode, 503);
    assert.equal(JSON.parse(res.body).error, 'disabled');
  } finally {
    if (antes.m !== undefined) process.env.MELHORIA_ENABLED = antes.m;
  }
});

test('health: melhoria "on" só com MELHORIA_ENABLED=1 E Redis', async () => {
  const get = () => mkRequest({ method: 'GET', url: 'https://saibatudo.net/quimica/api/health' });
  const val = async (env) => (await (await handleHealth(get(), env, { semDados: true })).json()).melhoria;
  assert.equal(await val({}), 'off');
  assert.equal(await val({ MELHORIA_ENABLED: '1' }), 'off');
  assert.equal(await val(REDIS), 'off');
  assert.equal(await val(ENV_ON), 'on');
});
