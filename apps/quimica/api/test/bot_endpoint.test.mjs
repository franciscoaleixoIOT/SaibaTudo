// POST /api/bot/telegram: 401 sem o segredo, 200 silencioso com BOT_ENABLED vazio, silêncio para quem não está na lista, dedup de update_id,
// sendMessage em HTML com botões, callback "Explicar" com answerCallbackQuery antes, log só com evt/canal/status/ms/motivo. Sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_BODY_BOT, createTelegramBotHandler } from '../bot/telegram.js';
import { CABECALHO_SEGREDO } from '../_lib/bot/telegram.js';
import { TEXTOS } from '../_lib/bot/nucleo.js';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { capturarLog, mkRequest, relogio } from './_helpers.mjs';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);
const URL_BOT = 'https://saibatudo.net/quimica/api/bot/telegram';
const ENV = { BOT_ENABLED: '1', BOT_TELEGRAM_TOKEN: '123:abc', BOT_TELEGRAM_SECRET: 'segredo-ok', BOT_TELEGRAM_IDS: '827000000' };
let uid = 100;
const update = (texto, from = 827000000) => ({ update_id: ++uid, message: { message_id: uid, from: { id: from, is_bot: false }, chat: { id: from, type: 'private' }, date: 1, text: texto } });
const callback = (data, from = 827000000) => ({ update_id: ++uid, callback_query: { id: `cb${uid}`, from: { id: from }, message: { message_id: 1, chat: { id: from, type: 'private' } }, data } });

function montar({ env = ENV, hf = null } = {}) {
  const now = relogio();
  const telegram = [];
  const fetchFn = async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.telegram.org/')) {
      telegram.push({ metodo: u.split('/').at(-1), body: JSON.parse(init.body) });
      return new Response('{"ok":true}', { status: 200 });
    }
    if (init?.method === 'POST') return new Response(JSON.stringify({ event_id: 'ev1' }), { status: 200 });
    return hf ? hf() : new Response('event: error\ndata: null\n\n', { status: 200 });
  };
  const cap = capturarLog();
  const handler = createTelegramBotHandler({ env: () => env, now, fetch: fetchFn, log: cap.log, obterStore: () => storeDoDisco({ dir: FIXTURE }), esperar: async () => {} });
  return { handler, telegram, cap };
}
const post = (json, segredo = 'segredo-ok', headers = {}) => mkRequest({ url: URL_BOT, json, headers: { ...(segredo === null ? {} : { [CABECALHO_SEGREDO]: segredo }), ...headers } });

test('segredo errado ou ausente → 401 e nada enviado; GET → 405', async () => {
  const { handler, telegram, cap } = montar();
  assert.equal((await handler(post(update('oi'), 'errado'))).status, 401);
  assert.equal((await handler(post(update('oi'), null))).status, 401);
  assert.equal((await handler(mkRequest({ method: 'GET', url: URL_BOT }))).status, 405);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos[0].motivo, 'auth_falhou');
});

test('BOT_ENABLED vazio → 200 silencioso, nada enviado, motivo desligado', async () => {
  const { handler, telegram, cap } = montar({ env: { ...ENV, BOT_ENABLED: '' } });
  assert.equal((await handler(post(update('massa molar da água')))).status, 200);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos[0].motivo, 'desligado');
});

test('remetente fora da lista → 200 e nenhuma mensagem; corpo inválido e update sem texto → 200', async () => {
  const { handler, telegram, cap } = montar();
  assert.equal((await handler(post(update('massa molar da água', 999)))).status, 200);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos.at(-1).motivo, 'nao_autorizado');
  assert.equal((await handler(mkRequest({ url: URL_BOT, body: '{nope', headers: { 'content-type': 'application/json', [CABECALHO_SEGREDO]: 'segredo-ok' } }))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'corpo_invalido');
  assert.equal((await handler(post({ update_id: 5, message: { from: { id: 827000000 }, chat: { id: 827000000, type: 'private' }, sticker: {} } }))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'ignorado');
  assert.equal(telegram.length, 0);
});

test('mensagem autorizada: sendMessage em HTML para o chat, com botões na última parte; update_id repetido → 200 sem reenviar', async () => {
  const { handler, telegram, cap } = montar();
  const u = update('Qual é a massa molar da água?');
  assert.equal((await handler(post(u))).status, 200);
  assert.equal(telegram.length, 1);
  assert.equal(telegram[0].metodo, 'sendMessage');
  assert.equal(telegram[0].body.chat_id, '827000000');
  assert.equal(telegram[0].body.parse_mode, 'HTML');
  assert.ok(telegram[0].body.text.includes('<b>'));
  assert.ok(telegram[0].body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'sugestoes'));
  assert.equal((await handler(post(u))).status, 200);
  assert.equal(telegram.length, 1, 'não reprocessou');
  assert.equal(cap.eventos.at(-1).motivo, 'duplicado');
});

test('callback Explicar: answerCallbackQuery imediato com "Gerando…", depois a explicação em mensagem nova', async () => {
  const BOA = 'A água é um composto cuja massa molar é 18,015 g/mol.';
  const env = { ...ENV, ASK_ENABLED: '1', HF_ASK_SPACE_URL: 'https://exemplo.hf.space', HF_TOKEN: 'hf_x' };
  const { handler, telegram } = montar({ env, hf: () => new Response(`event: complete\ndata: ${JSON.stringify([{ ok: true, answer: BOA, model: 'Qwen3-4B' }])}\n\n`, { status: 200 }) });
  await handler(post(update('Qual é a massa molar da água?')));
  assert.ok(telegram[0].body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'explicar'));
  await handler(post(callback('explicar')));
  assert.equal(telegram[1].metodo, 'answerCallbackQuery');
  assert.equal(telegram[1].body.text, TEXTOS.gerando);
  assert.equal(telegram[2].metodo, 'sendMessage');
  assert.ok(telegram[2].body.text.includes(BOA) && telegram[2].body.text.includes('Qwen3-4B'));
});

test('log: um evento por requisição, só evt/canal/status/ms/motivo; nunca texto, id nem token', async () => {
  const { handler, cap } = montar();
  await handler(post(update('Qual é a massa molar da água?')));
  assert.equal(cap.eventos.length, 1);
  for (const e of cap.eventos) assert.deepEqual(Object.keys(e).sort(), ['canal', 'evt', 'motivo', 'ms', 'status']);
  const s = JSON.stringify(cap.eventos);
  assert.ok(!s.includes('massa molar') && !s.includes('827000000') && !s.includes('123:abc') && !s.includes('segredo-ok'));
});

test('corpo maior que MAX_BODY_BOT → 200 corpo_invalido (sem derrubar a função)', async () => {
  const { handler, cap } = montar();
  const grande = update('x'.repeat(MAX_BODY_BOT + 10));
  assert.equal((await handler(post(grande))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'corpo_invalido');
});

test('vercel.json: a função do bot leva o pacote inteiro', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(vercel.functions['api/bot/telegram.js'], { includeFiles: 'data/quimica/**' });
});
