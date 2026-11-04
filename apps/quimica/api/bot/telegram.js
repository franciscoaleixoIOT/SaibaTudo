// POST /api/bot/telegram — webhook do bot @SaibaTudoNetBot (teste interno, desde 04/11/2026). Spec: docs/superpowers/specs/2026-11-04-quimica-bot-mensagens-design.md.
//
// Entrada : update do Telegram (JSON) com o cabeçalho X-Telegram-Bot-Api-Secret-Token.
// Saída   : 401 { ok:false, error:"unauthorized" } se o segredo não bate; senão SEMPRE 200 { ok:true } depois de tratar (o Telegram reenvia
//           o update enquanto não recebe 2xx): BOT_ENABLED vazio, corpo inválido, update sem texto e remetente fora de BOT_TELEGRAM_IDS
//           são 200 silenciosos. A resposta vai ao chat por sendMessage (HTML, partes de 4 000, botões na última).
// Núcleo em _lib/bot/ (motor do site sobre o pacote empacotado por includeFiles). O TEXTO DAS MENSAGENS E O ID DO REMETENTE NUNCA VÃO A LOG:
// só { evt, canal, status, ms, motivo }. Kill switch: BOT_ENABLED. Operação: docs/OPERACAO.md §9.

import { createAskState } from '../_lib/ask-handler.js';
import { createSharedLimiter } from '../_lib/compartilhado.js';
import { json, readJsonBody, toNodeHandler } from '../_lib/http.js';
import { criarConversas } from '../_lib/bot/conversas.js';
import { paraTelegramHtml } from '../_lib/bot/formato.js';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { ACAO_EXPLICAR, TEXTOS, criarNucleo, lerConfigBot } from '../_lib/bot/nucleo.js';
import { criarClienteTelegram, lerConfigTelegram, lerUpdate, verificarSegredo } from '../_lib/bot/telegram.js';

export const MAX_BODY_BOT = 65_536;

/** Whitelist de campos: nunca texto, id de remetente, chat ou token. */
export function logBot(evento) {
  const { evt, canal, status, ms, motivo } = evento;
  console.log(JSON.stringify({ evt, canal, status, ms, motivo }));
}

export function createTelegramBotHandler(deps = {}) {
  const env = deps.env ?? (() => process.env);
  const now = deps.now ?? (() => Date.now());
  const fetchFn = deps.fetch ?? ((...a) => globalThis.fetch(...a));
  const log = deps.log ?? logBot;
  const obterStore = deps.obterStore ?? (() => storeDoDisco());
  const conversas = deps.conversas ?? criarConversas({ shared: createSharedLimiter({ env, now }), now });
  const estadoAsk = deps.estadoAsk ?? createAskState({ now });
  const nucleo = deps.nucleo ?? criarNucleo({
    obterStore,
    env,
    agora: now,
    fetchFn,
    log: () => {},
    autorizado: (m) => lerConfigTelegram(env()).ids.has(m.remetenteId),
    conversas,
    estadoAsk,
  });

  return async function handleTelegram(request) {
    const t0 = now();
    const responder = (status, motivo, corpo = { ok: true }, extra = {}) => {
      log({ evt: 'bot', canal: 'telegram', status, ms: now() - t0, motivo });
      return json(status, corpo, extra);
    };
    if (request.method !== 'POST') return responder(405, 'metodo', { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
    const cfgTg = lerConfigTelegram(env());
    if (!verificarSegredo(request, cfgTg.segredo)) return responder(401, 'auth_falhou', { ok: false, error: 'unauthorized' });
    if (!lerConfigBot(env()).ativo) return responder(200, 'desligado');

    const corpo = await readJsonBody(request, MAX_BODY_BOT);
    if (!corpo.ok) return responder(200, 'corpo_invalido');
    const msg = lerUpdate(corpo.value);
    if (!msg) return responder(200, 'ignorado');

    const cliente = criarClienteTelegram({ token: cfgTg.token, fetchFn, esperar: deps.esperar, log: () => {} });
    if (msg.callbackId) await cliente.responderCallback(msg.callbackId, msg.acao === ACAO_EXPLICAR ? TEXTOS.gerando : '');

    const saida = await nucleo.processar(msg);
    if (saida.silencio) return responder(200, saida.motivo);

    const partes = paraTelegramHtml(saida.resposta);
    let enviadas = true;
    for (const [i, parte] of partes.entries()) {
      const ultima = i === partes.length - 1;
      enviadas = (await cliente.enviar(msg.conversaId, parte, { botoes: ultima ? saida.botoes : [] })) && enviadas;
    }
    return responder(200, enviadas ? (saida.motivo ?? 'ok') : 'envio_falhou');
  };
}

export const handle = createTelegramBotHandler();

export default toNodeHandler(handle, { maxBodyBytes: MAX_BODY_BOT });

// Duração máxima (s): a resposta local leva < 3 s, mas a explicação por IA pode levar 20 a 45 s (fila do ZeroGPU, partida a frio do Modal).
export const config = { maxDuration: 60 };
