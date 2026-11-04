// Adaptador do Telegram (Bot API): confere o segredo do webhook (X-Telegram-Bot-Api-Secret-Token, em tempo constante), converte um update
// em MensagemInterna (só texto em chat privado e callback_query; o resto é ignorado) e envia respostas (sendMessage em HTML com teclado
// inline, 1 retentativa; answerCallbackQuery). Nunca lança; nunca registra a URL (ela leva o token) nem o conteúdo.
import { timingSafeEqual } from 'node:crypto';

export const API_TELEGRAM = 'https://api.telegram.org';
export const CABECALHO_SEGREDO = 'x-telegram-bot-api-secret-token';
const ESPERA_RETENTATIVA_MS = 500;

export function lerConfigTelegram(env = process.env) {
  const ids = String(env.BOT_TELEGRAM_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return { token: (env.BOT_TELEGRAM_TOKEN ?? '').trim(), segredo: (env.BOT_TELEGRAM_SECRET ?? '').trim(), ids: new Set(ids) };
}

/** true só quando o cabeçalho existe e é igual ao segredo configurado (comparação em tempo constante). Segredo vazio nunca autoriza. */
export function verificarSegredo(request, segredo) {
  if (!segredo) return false;
  const recebido = request.headers.get(CABECALHO_SEGREDO);
  if (typeof recebido !== 'string') return false;
  const a = Buffer.from(recebido, 'utf8');
  const b = Buffer.from(segredo, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

const idStr = (v) => (v === undefined || v === null ? null : String(v));

/** @returns {object|null} MensagemInterna, ou null para o que o bot ignora (foto, edição, grupo, lixo). */
export function lerUpdate(update) {
  if (!update || typeof update !== 'object' || !Number.isInteger(update.update_id)) return null;
  const eventoId = `tg:${update.update_id}`;
  const m = update.message;
  if (m && typeof m === 'object' && typeof m.text === 'string' && m.chat?.type === 'private' && m.from?.id != null) {
    return { canal: 'telegram', remetenteId: idStr(m.from.id), conversaId: idStr(m.chat.id), texto: m.text, acao: null, idioma: m.from.language_code ?? 'pt-BR', eventoId, callbackId: null };
  }
  const cb = update.callback_query;
  if (cb && typeof cb === 'object' && typeof cb.data === 'string' && cb.from?.id != null && cb.message?.chat?.id != null) {
    return { canal: 'telegram', remetenteId: idStr(cb.from.id), conversaId: idStr(cb.message.chat.id), texto: null, acao: cb.data, idioma: cb.from.language_code ?? 'pt-BR', eventoId, callbackId: idStr(cb.id) };
  }
  return null;
}

/** Um botão por linha. */
export function tecladoInline(botoes) {
  if (!Array.isArray(botoes) || !botoes.length) return undefined;
  return { inline_keyboard: botoes.map((b) => [{ text: b.rotulo, callback_data: b.acao }]) };
}

export function criarClienteTelegram({ token, fetchFn = (...a) => globalThis.fetch(...a), esperar = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} }) {
  async function chamar(metodo, corpo) {
    try {
      const r = await fetchFn(`${API_TELEGRAM}/bot${token}/${metodo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      return r.ok ? { ok: true, status: r.status } : { ok: false, status: r.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  return {
    /** sendMessage em HTML; 1 retentativa após 500 ms; false quando as duas falham (log bot_envio_falhou, sem texto). */
    async enviar(chatId, html, { botoes = [] } = {}) {
      const corpo = { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true };
      const teclado = tecladoInline(botoes);
      if (teclado) corpo.reply_markup = teclado;
      let ultimo = { ok: false, status: 0 };
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        if (tentativa > 0) await esperar(ESPERA_RETENTATIVA_MS);
        ultimo = await chamar('sendMessage', corpo);
        if (ultimo.ok) return true;
      }
      log({ evt: 'bot_envio_falhou', status: ultimo.status });
      return false;
    },

    async responderCallback(callbackId, texto = '') {
      return (await chamar('answerCallbackQuery', { callback_query_id: callbackId, text: texto })).ok;
    },
  };
}
