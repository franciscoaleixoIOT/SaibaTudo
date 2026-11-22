// Adaptador do Telegram: configuração, segredo do webhook (tempo constante), leitura do update → MensagemInterna, teclado inline,
// cliente sendMessage/answerCallbackQuery com 1 retentativa e sem token no log. Sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { API_TELEGRAM, CABECALHO_SEGREDO, criarClienteTelegram, lerConfigTelegram, lerUpdate, tecladoInline, verificarSegredo } from '../_lib/bot/telegram.js';
import { mkRequest } from './_helpers.mjs';

const UPDATE_TEXTO = { update_id: 10, message: { message_id: 1, from: { id: 827000000, is_bot: false, language_code: 'pt-br' }, chat: { id: 827000000, type: 'private' }, date: 1, text: 'massa molar da água' } };
const UPDATE_CALLBACK = { update_id: 11, callback_query: { id: 'cb77', from: { id: 827000000 }, message: { message_id: 2, chat: { id: 827000000, type: 'private' } }, data: 'explicar' } };

test('lerConfigTelegram: ids por vírgula, trim, vazios fora', () => {
  const c = lerConfigTelegram({ BOT_TELEGRAM_TOKEN: ' 123:abc ', BOT_TELEGRAM_SECRET: 's', BOT_TELEGRAM_IDS: ' 1, 2 ,,3 ' });
  assert.equal(c.token, '123:abc');
  assert.equal(c.segredo, 's');
  assert.deepEqual([...c.ids], ['1', '2', '3']);
  assert.deepEqual([...lerConfigTelegram({}).ids], []);
});

test('verificarSegredo: igual → true; diferente, ausente, segredo vazio → false', () => {
  const req = (v) => mkRequest({ url: 'https://saibatudo.net/quimica/api/bot/telegram', headers: v === undefined ? {} : { [CABECALHO_SEGREDO]: v }, json: {} });
  assert.equal(verificarSegredo(req('abc'), 'abc'), true);
  assert.equal(verificarSegredo(req('abd'), 'abc'), false);
  assert.equal(verificarSegredo(req('ab'), 'abc'), false);
  assert.equal(verificarSegredo(req(), 'abc'), false);
  assert.equal(verificarSegredo(req(''), ''), false, 'segredo vazio nunca autoriza');
});

test('lerUpdate: texto privado e callback viram MensagemInterna; foto, edited_message, grupo e lixo viram null', () => {
  assert.deepEqual(lerUpdate(UPDATE_TEXTO), { canal: 'telegram', remetenteId: '827000000', conversaId: '827000000', texto: 'massa molar da água', acao: null, idioma: 'pt-br', eventoId: 'tg:10', callbackId: null });
  const cb = lerUpdate(UPDATE_CALLBACK);
  assert.equal(cb.acao, 'explicar');
  assert.equal(cb.texto, null);
  assert.equal(cb.callbackId, 'cb77');
  assert.equal(cb.eventoId, 'tg:11');
  assert.equal(cb.remetenteId, '827000000');
  assert.equal(lerUpdate({ update_id: 12, message: { from: { id: 1 }, chat: { id: 1, type: 'private' }, photo: [{}] } }), null);
  assert.equal(lerUpdate({ update_id: 13, edited_message: { ...UPDATE_TEXTO.message } }), null);
  assert.equal(lerUpdate({ update_id: 14, message: { ...UPDATE_TEXTO.message, chat: { id: -5, type: 'group' } } }), null);
  assert.equal(lerUpdate({ message: UPDATE_TEXTO.message }), null, 'sem update_id');
  assert.equal(lerUpdate(null), null);
  assert.equal(lerUpdate('x'), null);
});

test('tecladoInline: um botão por linha; sem botões → undefined', () => {
  assert.deepEqual(tecladoInline([{ rotulo: 'A', acao: 'a' }, { rotulo: 'B', acao: 'b' }]), { inline_keyboard: [[{ text: 'A', callback_data: 'a' }], [{ text: 'B', callback_data: 'b' }]] });
  assert.equal(tecladoInline([]), undefined);
});

test('enviar: sendMessage em HTML com teclado; falha → 1 retentativa após 500 ms; duas falhas → false e log sem URL', async () => {
  const chamadas = [];
  let falhas = 0;
  const esperas = [];
  const eventos = [];
  const fetchFn = async (url, init) => {
    chamadas.push({ url: String(url), body: JSON.parse(init.body) });
    if (falhas-- > 0) return new Response('x', { status: 502 });
    return new Response('{"ok":true}', { status: 200 });
  };
  const cli = criarClienteTelegram({ token: '123:abc', fetchFn, esperar: async (ms) => { esperas.push(ms); }, log: (e) => eventos.push(e) });
  assert.equal(await cli.enviar(827000000, '<b>oi</b>', { botoes: [{ rotulo: 'Explicar com IA', acao: 'explicar' }] }), true);
  assert.equal(chamadas[0].url, `${API_TELEGRAM}/bot123:abc/sendMessage`);
  assert.deepEqual(chamadas[0].body, { chat_id: 827000000, text: '<b>oi</b>', parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: 'Explicar com IA', callback_data: 'explicar' }]] } });
  await cli.enviar(1, 'x');
  assert.ok(!('reply_markup' in chamadas.at(-1).body), 'sem botões não há reply_markup');
  falhas = 1;
  assert.equal(await cli.enviar(1, 'y'), true);
  assert.deepEqual(esperas, [500]);
  falhas = 2;
  assert.equal(await cli.enviar(1, 'z'), false);
  assert.equal(eventos.at(-1).evt, 'bot_envio_falhou');
  assert.ok(!JSON.stringify(eventos).includes('123:abc'), 'o token nunca vai ao log');
  const lanca = criarClienteTelegram({ token: 't', fetchFn: async () => { throw new Error('rede'); }, esperar: async () => {}, log: () => {} });
  assert.equal(await lanca.enviar(1, 'w'), false, 'exceção não propaga');
});

test('enviar: 400 do Telegram (HTML recusado) → reenvia em texto simples sem parse_mode, sem tags e com entidades desfeitas', async () => {
  const chamadas = [];
  const fetchFn = async (url, init) => {
    const body = JSON.parse(init.body);
    chamadas.push(body);
    return body.parse_mode ? new Response('{"ok":false,"description":"Bad Request: can\'t parse entities"}', { status: 400 }) : new Response('{"ok":true}', { status: 200 });
  };
  const cli = criarClienteTelegram({ token: 't', fetchFn, esperar: async () => {}, log: () => {} });
  assert.equal(await cli.enviar(1, '<b>Água</b>\n\n⚠️ 1 &lt; 2 &amp; <i>x</i>', { botoes: [{ rotulo: 'A', acao: 'a' }] }), true);
  assert.equal(chamadas.length, 2);
  assert.ok(!('parse_mode' in chamadas[1]));
  assert.equal(chamadas[1].text, 'Água\n\n⚠️ 1 < 2 & x');
  assert.deepEqual(chamadas[1].reply_markup, chamadas[0].reply_markup, 'os botões continuam');
});

test('responderCallback: answerCallbackQuery com texto; falha → false sem lançar', async () => {
  const chamadas = [];
  const cli = criarClienteTelegram({ token: 't', fetchFn: async (url, init) => { chamadas.push({ url: String(url), body: JSON.parse(init.body) }); return new Response('{"ok":true}', { status: 200 }); } });
  assert.equal(await cli.responderCallback('cb77', 'Gerando a explicação…'), true);
  assert.equal(chamadas[0].url, `${API_TELEGRAM}/bott/answerCallbackQuery`);
  assert.deepEqual(chamadas[0].body, { callback_query_id: 'cb77', text: 'Gerando a explicação…' });
  const ruim = criarClienteTelegram({ token: 't', fetchFn: async () => new Response('x', { status: 400 }) });
  assert.equal(await ruim.responderCallback('cb', ''), false);
});
