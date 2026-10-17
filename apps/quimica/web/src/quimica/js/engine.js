// Motor LOCAL e DETERMINÍSTICO: segurança por regras → NLU por regras + dicionário dos dados → resposta montada dos dados. Funciona offline.
// IA na nuvem (desde 14/10/2026, opt-in): só INTERPRETA a pergunta quando a pessoa pede (botão) ou liga o modo automático; a resposta continua
// sendo montada aqui, dos dados do pacote (js/nuvem.js). Pedido perigoso nunca é enviado: a segurança roda antes.
// Multi-turno (17/10/2026): numa pergunta de continuação, a nuvem recebe também a INTERPRETAÇÃO da pergunta anterior (`contextoDaPergunta`).
import { AnswerBuilder } from './answers.js';
import { Dicionario } from './dicionario.js';
import { idiomaAtual } from './i18n/index.js';
import { parse } from './nlu.js';
import { contextoDaPergunta } from './nuvem.js';
import { avaliarSeguranca } from './seguranca.js';

const SEM_CONTEXTO = new Set(['RECUSA_PERIGO', 'AJUDA', 'SOBRE_DADOS', 'FONTES']);

export class Engine {
  /** @param {{store: import('./data.js').DataStore, nuvem?: import('./nuvem.js').NuvemNlu|null}} o */
  constructor({ store, nuvem = null }) {
    this.store = store;
    this.nuvem = nuvem;
    this._dic = null;
    this._rev = -1;
    this._ultimoContexto = null;
    /**
     * Última interpretação RESPONDIDA da conversa (local ou da nuvem; qualquer intenção menos DESCONHECIDA, recusa e institucionais), mais
     * larga que `_ultimoContexto` (que só guarda o que o NLU local sabe herdar). É a que vai como `contexto` à nuvem numa continuação.
     */
    this._ultimaInterpretacao = null;
    /** Motivo do último pedido à nuvem sem resposta nova: 'igual' (entendeu como o app) | 'nao_entendeu' | 'indisponivel' | null. */
    this.ultimoMotivoNuvem = null;
    /** Compostos sugeridos pela API quando o texto citado não bate com o pacote ("quis dizer…?"): [{cid, nome}]. */
    this.ultimasSugestoesNuvem = [];
  }

  /** Dicionário derivado dos dados e do idioma ativo; reconstruído quando o pacote ou o idioma muda. */
  dicionario() {
    if (!this._dic || this._rev !== this.store.rev || this._dic.idioma !== idiomaAtual()) {
      this._dic = new Dicionario(this.store, idiomaAtual());
      this._rev = this.store.rev;
    }
    return this._dic;
  }

  /** Interpretação sem montar a resposta (útil para testes e para a interface). */
  interpretar(pergunta, contexto = this._ultimoContexto) {
    return parse(pergunta, this.dicionario(), contexto);
  }

  /** Responde uma pergunta. Nunca lança: erros viram uma resposta não resolvida. */
  async responder(pergunta, { contexto = undefined } = {}) {
    const ctx = contexto !== undefined ? contexto : this._ultimoContexto;
    const anterior = this._ultimaInterpretacao; // a da pergunta ANTERIOR (o botão da nuvem reinterpreta esta pergunta com ela)
    // 1) segurança primeiro: nenhuma outra etapa vê o pedido recusado
    const seg = avaliarSeguranca(pergunta);
    if (!seg.recusar) await this.resolverCas(pergunta);
    const p = seg.recusar
      ? { ...parse('', this.dicionario()), intent: 'RECUSA_PERIGO', textoOriginal: String(pergunta ?? '').slice(0, 300), seguranca: seg }
      : parse(pergunta, this.dicionario(), ctx);
    const r = { ...(await this._montar(p)), interpretacaoAnterior: seg.recusar ? null : anterior };
    // 2) modo automático (consentimento contínuo em Configurações): pergunta não entendida vai à nuvem sem toque
    if (!r.resolvida && !seg.recusar && this.nuvem?.habilitada?.()) {
      const nova = await this.perguntarANuvem(pergunta, r, { explicito: false });
      if (nova?.resolvida) return nova;
    }
    return r;
  }

  async _montar(p) {
    const builder = new AnswerBuilder({ store: this.store, dic: this.dicionario() });
    const r = await builder.construir(p);
    if (r.resolvida && !SEM_CONTEXTO.has(r.intent) && (p.elemento || p.composto || p.propriedade)) this._ultimoContexto = p;
    if (r.resolvida && !SEM_CONTEXTO.has(p.intent) && p.intent !== 'DESCONHECIDA') this._ultimaInterpretacao = p;
    return { ...r, pergunta: p.textoOriginal, parsed: p };
  }

  /**
   * Pede à IA na nuvem uma interpretação da pergunta e monta a resposta DOS DADOS LOCAIS com ela (origem 'NUVEM'). Nunca lança.
   * `explicito` = toque no botão (consentimento desta pergunta; espera até 25 s); false = modo automático (só com a chave ligada).
   * Devolve null quando não houve interpretação útil; o motivo fica em `ultimoMotivoNuvem` e as sugestões em `ultimasSugestoesNuvem`.
   * Pergunta de continuação (`contextoDaPergunta`): manda junto a interpretação anterior à pergunta de `atual` (ou, sem `atual`, a última da
   * conversa) — só intenção e entidades.
   */
  async perguntarANuvem(pergunta, atual = null, { explicito = true } = {}) {
    this.ultimoMotivoNuvem = null;
    this.ultimasSugestoesNuvem = [];
    if (!this.nuvem) { this.ultimoMotivoNuvem = 'indisponivel'; return null; }
    const q = String(pergunta ?? '').trim();
    if (!q || avaliarSeguranca(q).recusar) { this.ultimoMotivoNuvem = 'nao_entendeu'; return null; }
    const dic = this.dicionario();
    const anterior = atual && 'interpretacaoAnterior' in atual ? atual.interpretacaoAnterior : this._ultimaInterpretacao;
    const herdar = contextoDaPergunta(q, anterior, dic) ? anterior : null;
    let p = null;
    try {
      p = explicito ? await this.nuvem.interpretarAgora(q, dic, herdar) : await this.nuvem.interpretar(q, dic, herdar);
    } catch { p = null; }
    this.ultimasSugestoesNuvem = this.nuvem.ultimasSugestoes ?? [];
    if (!p) { this.ultimoMotivoNuvem = this.nuvem.ultimoResultado === 'ok' ? 'nao_entendeu' : (this.nuvem.ultimoResultado ?? 'indisponivel'); return null; }
    // interpretação igual à local: nada de novo para mostrar
    if (atual?.parsed && mesmaInterpretacao(atual.parsed, p)) { this.ultimoMotivoNuvem = 'igual'; return null; }
    await this.resolverCas(q);
    const r = await this._montar(p);
    if (!r.resolvida) { this.ultimoMotivoNuvem = 'nao_entendeu'; return null; }
    return { ...r, origem: 'NUVEM', modelo: this.nuvem.ultimoModelo ?? null, interpretacaoAnterior: anterior ?? null, contextoUsado: this.nuvem.ultimoContextoUsado === true };
  }

  /** Número CAS citado na pergunta e ausente do dicionário (o índice do pipeline não tem CAS): procura nos lotes e ensina o dicionário. */
  async resolverCas(pergunta) {
    const dic = this.dicionario();
    for (const m of String(pergunta ?? '').matchAll(/\b(\d{2,7}-\d{2}-\d)\b/g)) {
      if (dic.casParaCid.has(m[1])) continue;
      try { const cid = await this.store.cidPorCas(m[1]); if (cid != null) dic.casParaCid.set(m[1], cid); } catch { /* sem o lote, o CAS fica sem resolver */ }
    }
  }

  limparContexto() { this._ultimoContexto = null; this._ultimaInterpretacao = null; }
}

/**
 * Duas interpretações equivalentes (mesma intenção e mesmas entidades que a resposta usa): a nuvem não trouxe nada novo.
 * A propriedade só conta nas intenções que respondem por ela (o NLU local anota "massa molar" como propriedade também em MASSA_MOLAR).
 */
export function mesmaInterpretacao(a, b) {
  if (!a || !b || a.intent !== b.intent) return false;
  const usaPropriedade = a.intent === 'PROPRIEDADE' || a.intent === 'TABELA_PERIODICA' || a.intent === 'COMPARAR';
  const chave = (p) => JSON.stringify([p.elemento ?? null, p.composto ?? null, usaPropriedade ? p.propriedade ?? null : null, p.equacao ?? null, p.unidadeDestino ?? null,
    (p.quantidades ?? []).map((q) => [q.valor, q.unidade ?? null])]);
  return chave(a) === chave(b);
}
