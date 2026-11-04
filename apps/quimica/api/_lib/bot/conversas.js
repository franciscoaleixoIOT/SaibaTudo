// Conversas do bot: contexto por conversa (30 min), deduplicação de evento e limites por conversa.
// 1ª camada: memória da instância (barata, sem rede). 2ª camada, opcional: o mesmo Redis do Upstash dos limites compartilhados
// (compartilhado.js), para que outra instância continue a conversa e não reprocesse um update reenviado. FALHA ABERTA: sem Redis ou com
// Redis fora do ar vale só a memória. Privacidade: a chave no Redis leva o SHA-256 do id da conversa, nunca o id em claro; nada aqui vai a log.
import { createHash } from 'node:crypto';
import { JANELAS, createSlidingWindow } from '../ratelimit.js';

export const TTL_CONVERSA_MS = 30 * 60_000;

export const hashConversa = (id) => createHash('sha256').update(String(id)).digest('hex');

/**
 * @param {{ shared?: ReturnType<import('../compartilhado.js').createSharedLimiter>|null, now?: () => number, ttlMs?: number }} deps
 */
export function criarConversas({ shared = null, now = () => Date.now(), ttlMs = TTL_CONVERSA_MS } = {}) {
  const ttlSeg = String(Math.ceil(ttlMs / 1000));
  /** @type {Map<string, object>} hash → contexto (com guardadoEm) */
  const contextos = new Map();
  /** @type {Map<string, number>} eventoId → instante */
  const eventos = new Map();
  const porMinuto = createSlidingWindow({ windowMs: JANELAS.MINUTO, now });
  const porDia = createSlidingWindow({ windowMs: JANELAS.DIA, now });

  const ativo = () => { try { return Boolean(shared?.ativo?.()); } catch { return false; } };
  /** Pipeline no Redis; null quando indisponível (nunca lança). */
  const redis = async (comandos) => { try { return ativo() ? await shared.executar(comandos) : null; } catch { return null; } };
  const expirado = (ctx) => !ctx || typeof ctx.guardadoEm !== 'number' || now() - ctx.guardadoEm > ttlMs;

  function podarEventos() {
    const corte = now() - ttlMs;
    for (const [id, t] of eventos) if (t <= corte) eventos.delete(id);
  }

  return {
    async obter(conversaId) {
      const h = hashConversa(conversaId);
      const local = contextos.get(h);
      if (local && !expirado(local)) return local;
      if (local) contextos.delete(h);
      const r = await redis([['GET', `bot:ctx:${h}`]]);
      if (!r || typeof r[0] !== 'string') return null;
      let ctx = null;
      try { ctx = JSON.parse(r[0]); } catch { return null; }
      if (expirado(ctx)) return null;
      contextos.set(h, ctx);
      return ctx;
    },

    async guardar(conversaId, ctx) {
      const h = hashConversa(conversaId);
      const completo = { ...ctx, guardadoEm: now() };
      contextos.set(h, completo);
      await redis([['SET', `bot:ctx:${h}`, JSON.stringify(completo), 'EX', ttlSeg]]);
    },

    async apagar(conversaId) {
      const h = hashConversa(conversaId);
      contextos.delete(h);
      await redis([['DEL', `bot:ctx:${h}`]]);
    },

    /** true = este evento já foi processado (aqui ou em outra instância). Marca como visto ao devolver false. */
    async jaVisto(eventoId) {
      podarEventos();
      if (eventos.has(eventoId)) return true;
      eventos.set(eventoId, now());
      const r = await redis([['SET', `bot:evt:${hashConversa(eventoId)}`, '1', 'EX', ttlSeg, 'NX']]);
      return Array.isArray(r) && r[0] === null;
    },

    /** true = a conversa passou do limite por minuto ou por dia (local primeiro; depois o contador global, se houver). */
    async limiteExcedido(conversaId, { porMin, porDia: limiteDia }) {
      const h = hashConversa(conversaId);
      if (!porMinuto.check(h, porMin).allowed || !porDia.check(h, limiteDia).allowed) return true;
      porMinuto.record(h);
      porDia.record(h);
      if (!ativo()) return false;
      try {
        const m = await shared.hit(`bot:min:${h}`, 60, porMin);
        if (!m.allowed) return true;
        const d = await shared.hit(`bot:dia:${h}`, 86400, limiteDia);
        return !d.allowed;
      } catch {
        return false;
      }
    },
  };
}
