// Núcleo do bot sobre o pacote de TESTE (fixture: 14 elementos, 15 compostos, 2 trechos em inglês): autorização, dedup, limites, comandos,
// motor do site com contexto de conversa, botões, pedido à nuvem pelo chamarAsk interno. Sem rede (fetch simulado).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAskState } from '../_lib/ask-handler.js';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { criarConversas } from '../_lib/bot/conversas.js';
import { ACAO_EXPLICAR, ACAO_SUGESTOES, TEXTOS, criarNucleo, lerConfigBot, montarPedidoAsk, trechosPara } from '../_lib/bot/nucleo.js';
import { MAX_Q } from '../_lib/validate.js';
import { relogio } from './_helpers.mjs';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);
const HF = 'https://exemplo-saibatudo-quimica.hf.space';
const ENV_IA = { BOT_ENABLED: '1', ASK_ENABLED: '1', HF_ASK_SPACE_URL: HF, HF_TOKEN: 'hf_segredo' };
const ENV_SEM_IA = { BOT_ENABLED: '1' };
let n = 0;
const msg = (texto, extra = {}) => ({ canal: 'telegram', remetenteId: '1', conversaId: `c${++n}`, texto, acao: null, idioma: 'pt-BR', eventoId: `tg:${++n}`, callbackId: null, ...extra });

function montar({ env = ENV_SEM_IA, hf = null, autorizado = () => true } = {}) {
  const now = relogio();
  const chamadas = [];
  const fetchFn = async (url, init) => {
    chamadas.push({ url: String(url), init });
    if (init?.method === 'POST') return new Response(JSON.stringify({ event_id: 'ev1' }), { status: 200 });
    return hf ? hf() : new Response('event: error\ndata: null\n\n', { status: 200 });
  };
  const eventos = [];
  const nucleo = criarNucleo({ obterStore: () => storeDoDisco({ dir: FIXTURE }), env: () => env, agora: now, fetchFn, log: (e) => eventos.push(e), autorizado, conversas: criarConversas({ now }), estadoAsk: createAskState({ now }) });
  return { nucleo, chamadas, eventos, now };
}

test('lerConfigBot: BOT_ENABLED só com "1"; limites com padrão 10/200 e faixas', () => {
  assert.equal(lerConfigBot({}).ativo, false);
  assert.equal(lerConfigBot({ BOT_ENABLED: '1' }).ativo, true);
  assert.equal(lerConfigBot({ BOT_ENABLED: 'true' }).ativo, false);
  assert.equal(lerConfigBot({}).ratePorMin, 10);
  assert.equal(lerConfigBot({}).ratePorDia, 200);
  assert.equal(lerConfigBot({ BOT_RATE_POR_MIN: '0' }).ratePorMin, 1);
});

test('não autorizado e evento repetido: silêncio com motivo; nada chega ao motor', async () => {
  const { nucleo } = montar({ autorizado: (m) => m.remetenteId === '1' });
  assert.deepEqual(await nucleo.processar(msg('massa molar da água', { remetenteId: '2' })), { silencio: true, motivo: 'nao_autorizado' });
  const m = msg('massa molar da água');
  assert.equal((await nucleo.processar(m)).silencio, undefined);
  assert.deepEqual(await nucleo.processar(m), { silencio: true, motivo: 'duplicado' });
});

test('pergunta resolvida: mesma intenção e entidade do site, rodapé com fontes e data, botões Explicar (só com IA ligada) e Sugestões', async () => {
  const semIa = await montar().nucleo.processar(msg('Qual é a massa molar da água?'));
  assert.equal(semIa.interpretacao.intent, 'MASSA_MOLAR');
  assert.equal(semIa.interpretacao.composto, 962);
  assert.ok(semIa.resposta.titulo && semIa.resposta.blocos.length > 0);
  assert.ok(semIa.resposta.rodape.fontes.length > 0 && typeof semIa.resposta.rodape.dataPacote === 'string');
  assert.deepEqual(semIa.botoes.map((b) => b.acao), [ACAO_SUGESTOES], 'sem ASK_ENABLED não há botão de IA');
  const comIa = await montar({ env: ENV_IA }).nucleo.processar(msg('Qual é a massa molar da água?'));
  assert.deepEqual(comIa.botoes.map((b) => b.acao.split(':')[0]), [ACAO_EXPLICAR, ACAO_SUGESTOES]);
  assert.match(comIa.botoes[0].acao, /^explicar:\d+$/, 'o botão leva o número da resposta a que pertence');
  assert.equal(comIa.botoes[0].rotulo, TEXTOS.explicarRotulo);
  for (const b of comIa.botoes) assert.ok(Buffer.byteLength(b.acao) <= 64);
});

test('continuação usa o contexto da conversa ("e o ponto de ebulição?" depois do ferro) e /limpar apaga', async () => {
  const { nucleo } = montar();
  const c = 'conversa-1';
  const primeira = await nucleo.processar(msg('Ponto de fusão do ferro', { conversaId: c }));
  assert.equal(primeira.interpretacao.elemento, 'Fe');
  const seg = await nucleo.processar(msg('e o ponto de ebulição?', { conversaId: c }));
  assert.equal(seg.interpretacao.intent, 'PROPRIEDADE');
  assert.equal(seg.interpretacao.elemento, 'Fe', 'herdou o elemento');
  const limpo = await nucleo.processar(msg('/limpar', { conversaId: c }));
  assert.equal(limpo.resposta.blocos[0].texto, TEXTOS.limpar);
  const depois = await nucleo.processar(msg('e o ponto de ebulição?', { conversaId: c }));
  assert.notEqual(depois.interpretacao.elemento, 'Fe', 'sem contexto, não herda');
});

test('pedido perigoso: recusa sem botão de IA e sem mexer no contexto', async () => {
  const { nucleo } = montar({ env: ENV_IA });
  const c = 'conversa-2';
  await nucleo.processar(msg('Ponto de fusão do ferro', { conversaId: c }));
  const r = await nucleo.processar(msg('Como fazer metanfetamina em casa?', { conversaId: c }));
  assert.equal(r.interpretacao.intent, 'RECUSA_PERIGO');
  assert.deepEqual(r.botoes, []);
  const seg = await nucleo.processar(msg('e o ponto de ebulição?', { conversaId: c }));
  assert.equal(seg.interpretacao.elemento, 'Fe', 'o contexto do ferro continua');
});

test('não resolvida: até 4 sugestões como botões sug:<i>; sug:<i> reenvia a sugestão; índice inválido e ação desconhecida → silêncio', async () => {
  const { nucleo } = montar();
  const c = 'conversa-3';
  const r = await nucleo.processar(msg('xyzzy plugh', { conversaId: c }));
  assert.equal(r.interpretacao.intent, 'DESCONHECIDA');
  assert.ok(r.botoes.length >= 1 && r.botoes.length <= 4 && r.botoes.every((b) => b.acao.startsWith('sug:')));
  const s = await nucleo.processar(msg(null, { conversaId: c, acao: r.botoes[0].acao, callbackId: 'cb1' }));
  assert.notEqual(s.interpretacao.intent, 'DESCONHECIDA', 'a sugestão é uma pergunta que o app entende');
  assert.deepEqual(await nucleo.processar(msg(null, { conversaId: c, acao: 'sug:9', callbackId: 'cb2' })), { silencio: true, motivo: 'acao_invalida' });
  assert.deepEqual(await nucleo.processar(msg(null, { conversaId: c, acao: 'zzz', callbackId: 'cb3' })), { silencio: true, motivo: 'acao_invalida' });
});

test('comandos: /start, /ajuda (textos do catálogo), /sobre (versão, assinatura verificada, contagens), comando desconhecido = /ajuda', async () => {
  const { nucleo } = montar();
  const start = await nucleo.processar(msg('/start'));
  assert.equal(start.resposta.blocos[0].texto, TEXTOS.start);
  assert.deepEqual(start.botoes.map((b) => b.acao), [ACAO_SUGESTOES]);
  const ajuda = await nucleo.processar(msg('/ajuda'));
  assert.ok(ajuda.resposta.blocos.some((b) => b.tipo === 'lista' && b.itens.length >= 4));
  const sobre = await nucleo.processar(msg('/sobre'));
  const kv = sobre.resposta.blocos.find((b) => b.tipo === 'kv');
  assert.ok(kv.itens.some((i) => /verificada/.test(String(i.valor))));
  assert.ok(kv.itens.some((i) => String(i.valor) === '14'), 'elementos do pacote de teste');
  assert.equal((await nucleo.processar(msg('/xpto'))).resposta.titulo, ajuda.resposta.titulo);
  const sug = await nucleo.processar(msg(null, { acao: ACAO_SUGESTOES, callbackId: 'cb' }));
  assert.equal(sug.resposta.titulo, TEXTOS.sugestoesTitulo);
  assert.equal(sug.botoes.length, 4);
});

test('pergunta longa é cortada em MAX_Q sem erro; texto vazio vira /ajuda', async () => {
  const { nucleo } = montar();
  const r = await nucleo.processar(msg('massa molar da água ' + 'x'.repeat(2000)));
  assert.ok(r.resposta && !r.silencio);
  assert.ok(montarPedidoAsk({ q: 'a'.repeat(500), directAnswer: '' }, []).q.length <= MAX_Q);
  assert.equal((await nucleo.processar(msg('   '))).resposta.titulo, (await nucleo.processar(msg('/ajuda'))).resposta.titulo);
});

test('trechosPara e montarPedidoAsk: oxigênio traz o trecho em inglês do pacote de teste; limites respeitados', async () => {
  const store = await storeDoDisco({ dir: FIXTURE });
  const tr = await trechosPara(store, { intent: 'ELEMENTO', elemento: 'O', composto: null });
  assert.deepEqual(tr.map((t) => t.id), ['wikipedia-en-oxygen-001']);
  assert.ok(tr[0].texto.length > 20 && tr[0].texto.length <= 1200);
  assert.deepEqual(await trechosPara(store, { intent: 'MASSA_MOLAR', elemento: null, composto: 962 }), []);
  const p = montarPedidoAsk({ q: 'Fale sobre o oxigênio', directAnswer: 'Oxigênio (O), elemento 8\nMassa atômica: 15,999 u' }, tr);
  assert.equal(p.q, 'Fale sobre o oxigênio');
  assert.ok(p.context.startsWith('Dados do app: Oxigênio (O), elemento 8'));
  assert.equal(p.trechos.length, 1);
});

test('Explicar com IA: sem resposta recente → aviso; com resposta → chamarAsk com q/context/trechos e sem iid; sucesso vira texto + aviso do modelo; cota/recusa/fora viram o motivo', async () => {
  const BOA = 'O oxigênio é o elemento 8 e sua massa atômica é 15,999 u.';
  const sse = (obj) => new Response(`event: complete\ndata: ${JSON.stringify([obj])}\n\n`, { status: 200 });
  const { nucleo, chamadas } = montar({ env: ENV_IA, hf: () => sse({ ok: true, answer: BOA, model: 'Qwen3-4B' }) });
  const c = 'conversa-ia';
  const vazio = await nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(vazio.resposta.blocos[0].texto, TEXTOS.semResposta);
  await nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  const ex = await nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(ex.resposta.titulo, TEXTOS.tituloIa);
  assert.equal(ex.resposta.blocos[0].texto, BOA);
  assert.ok(ex.resposta.blocos[1].tipo === 'aviso' && ex.resposta.blocos[1].texto.includes('Qwen3-4B'));
  const corpo = JSON.parse(chamadas.find((x) => x.init?.method === 'POST').init.body);
  assert.equal(corpo.data[0], 'Fale sobre o oxigênio');
  assert.ok(corpo.data[1].startsWith('Dados do app:'));
  assert.equal(JSON.parse(corpo.data[2])[0].id, 'wikipedia-en-oxygen-001');
  assert.ok(!JSON.stringify(corpo).includes('"iid"'));

  const fora = montar({ env: ENV_IA });
  await fora.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  const f = await fora.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(f.motivo, 'ia_upstream');
  assert.equal(f.resposta.blocos[0].texto, TEXTOS.falhaIa.upstream);

  const desligada = montar({ env: ENV_SEM_IA });
  await desligada.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  assert.equal((await desligada.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }))).motivo, 'ia_disabled');

  const cota = montar({ env: { ...ENV_IA, HF_ASK_DAILY_BUDGET: '0' } });
  await cota.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  assert.equal((await cota.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }))).motivo, 'ia_budget');
});

test('botão de uma resposta anterior (Explicar ou sugestão) → aviso "botão antigo", nada é executado; o botão atual funciona', async () => {
  const BOA = 'O ferro é o elemento 26.';
  const sse = (obj) => new Response(`event: complete\ndata: ${JSON.stringify([obj])}\n\n`, { status: 200 });
  const { nucleo, chamadas } = montar({ env: ENV_IA, hf: () => sse({ ok: true, answer: BOA, model: 'Qwen3-4B' }) });
  const c = 'conversa-seq';
  const antiga = await nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  const nova = await nucleo.processar(msg('Fale sobre o ferro', { conversaId: c }));
  const botaoAntigo = antiga.botoes.find((b) => b.acao.startsWith(ACAO_EXPLICAR)).acao;
  const botaoNovo = nova.botoes.find((b) => b.acao.startsWith(ACAO_EXPLICAR)).acao;
  assert.notEqual(botaoAntigo, botaoNovo);
  const r = await nucleo.processar(msg(null, { conversaId: c, acao: botaoAntigo, callbackId: 'cb1' }));
  assert.equal(r.motivo, 'botao_antigo');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.botaoAntigo);
  assert.equal(chamadas.filter((x) => x.init?.method === 'POST').length, 0, 'não chamou a nuvem');
  const ok = await nucleo.processar(msg(null, { conversaId: c, acao: botaoNovo, callbackId: 'cb2' }));
  assert.equal(ok.resposta.blocos[0].texto, BOA);
  const naoResolvida = await nucleo.processar(msg('xyzzy plugh', { conversaId: c }));
  await nucleo.processar(msg('Fale sobre o ferro', { conversaId: c }));
  const sugAntiga = await nucleo.processar(msg(null, { conversaId: c, acao: naoResolvida.botoes[0].acao, callbackId: 'cb3' }));
  assert.equal(sugAntiga.motivo, 'botao_antigo');
});

test('erro interno inesperado (ex.: armazenamento das conversas lança) → resposta "dados indisponíveis", motivo erro, sem lançar', async () => {
  const quebrado = { ...criarConversas(), obter: async () => { throw new Error('redis explodiu'); } };
  const nucleo = criarNucleo({ obterStore: () => storeDoDisco({ dir: FIXTURE }), env: () => ENV_SEM_IA, autorizado: () => true, conversas: quebrado });
  const r = await nucleo.processar(msg('/ajuda'));
  assert.equal(r.motivo, 'erro');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.dados);
});

test('limite por conversa: a 11ª mensagem no minuto recebe o aviso de limite', async () => {
  const { nucleo } = montar();
  const c = 'conversa-limite';
  for (let i = 0; i < 10; i++) await nucleo.processar(msg('/ajuda', { conversaId: c }));
  const r = await nucleo.processar(msg('/ajuda', { conversaId: c }));
  assert.equal(r.motivo, 'limite');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.limite);
});

test('pacote indisponível: resposta "dados indisponíveis", motivo dados, sem lançar', async () => {
  const nucleo = criarNucleo({ obterStore: () => Promise.reject(new Error('x')), env: () => ENV_SEM_IA, autorizado: () => true });
  const r = await nucleo.processar(msg('/ajuda'));
  assert.equal(r.motivo, 'dados');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.dados);
});

test('log do núcleo nunca contém texto de pergunta, resposta nem id', async () => {
  const { nucleo, eventos } = montar();
  await nucleo.processar(msg('Qual é a massa molar da água?', { remetenteId: '827000000', conversaId: '827000000' }));
  const s = JSON.stringify(eventos);
  assert.ok(!s.includes('massa molar') && !s.includes('827000000') && !s.includes('18,015'));
});
