// IA na nuvem (opcional, OPT-IN, desde 14/10/2026): só ajuda a INTERPRETAR a pergunta. Porte de cloud.js do SaibaTudo Eleições.
// A nuvem NUNCA fornece fatos: devolve intenção + entidades (texto copiado da pergunta), que são revalidadas contra o dicionário do pacote
// assinado (símbolo existe, CID existe, propriedade e unidade conhecidas); qualquer valor fora dos dados é descartado. A resposta é montada
// pelo AnswerBuilder local, com fonte e licença em cada bloco. Contrato: api/README.md ("POST /api/nlu") e docs/DATA_CONTRACT.md §8–9.
// Consentimento: por pergunta (toque em "Perguntar à IA na nuvem") ou contínuo (modo automático em Configurações, desligado por padrão).
import { INTENTS, extrairEquacao, lerUnidade, parse } from './nlu.js';
import { normalizar } from './texto.js';

/** Proxy serverless da Vercel (mesma origem). É ele que guarda o segredo do Modal; o site nunca fala com o Modal. */
export const ENDPOINT_NUVEM = '/quimica/api/nlu';
/** Modo automático: o serviço quente responde em 2–5 s; a partida a frio pode passar de 10 s. */
export const TIMEOUT_NUVEM_MS = 14_000;
/** Pedido explícito: a pessoa escolheu esperar (partida a frio do modelo + função da Vercel: a primeira chamada ao vivo passou de 25 s em 14/10/2026; a função tem maxDuration 30). */
export const TIMEOUT_NUVEM_EXPLICITA_MS = 30_000;
/** Intenções cuja resposta não depende de interpretação: não há o que reinterpretar na nuvem. */
export const SEM_NUVEM = new Set(['RECUSA_PERIGO', 'AJUDA', 'SOBRE_DADOS', 'FONTES']);
const NIVEIS = new Set(['fundamental', 'medio', 'superior']);
const MAX_QUANTIDADES = 6;

/** Entidade obrigatória por intenção (espelho de ENTIDADES_POR_INTENCAO em backend/modal/nlu_core.py): sem ela a interpretação não é confiável. */
const EXIGE = {
  ELEMENTO: (p) => p.elemento != null,
  COMPOSTO: (p) => p.composto != null || p.formula != null,
  PROPRIEDADE: (p) => p.propriedade != null,
  MASSA_MOLAR: (p) => p.composto != null || p.formula != null || p.elemento != null,
  DESENHAR: (p) => p.composto != null || p.formula != null,
  NOMENCLATURA: (p) => p.composto != null || p.formula != null,
  COMPARAR: (p) => p.compostos.length + p.elementos.length + p.formulas.length >= 2,
  CONVERSAO_UNIDADE: (p) => p.unidadeDestino != null && p.quantidades.some((q) => q.unidade),
  BALANCEAR: (p) => p.equacao != null
};

const sv = (o, k) => {
  const v = o?.[k];
  if (v == null || typeof v === 'object') return null;
  const s = String(v).trim();
  return s !== '' && s !== 'null' && s.length <= 300 ? s : null;
};
const cidValido = (dic, cid) => cid != null && /^\d{1,9}$/.test(String(cid)) && dic.entrada(cid) != null;

/** Sugestões de composto da API ("não encontrei X; quis dizer…?"), só as que existem no pacote: [{cid, nome}] (até 3). */
export function sugestoesDaResolucao(resolucao, dic) {
  const lista = resolucao?.composto?.sugestoes;
  if (!Array.isArray(lista)) return [];
  const out = [];
  for (const s of lista) {
    if (!cidValido(dic, s?.cid)) continue;
    const cid = Number(s.cid);
    if (out.some((x) => x.cid === cid)) continue;
    out.push({ cid, nome: dic.nomeDaEntrada(cid) ?? sv(s, 'nome') ?? String(cid) });
    if (out.length === 3) break;
  }
  return out;
}

/**
 * Valida a saída do NLU da nuvem contra o dicionário do pacote. Devolve um ParsedQuery (mesmo formato de nlu.js) ou null
 * (interpretação não confiável). `resolucao` é o campo da API com o CID do composto citado (ou sugestões).
 */
export function validarNluNuvem(nlu, dic, textoOriginal, resolucao = null, lex = dic?.lex) {
  const intent = sv(nlu, 'intent')?.toUpperCase() ?? null;
  if (!intent || !INTENTS.includes(intent) || intent === 'DESCONHECIDA' || SEM_NUVEM.has(intent)) return null;
  const p = parse('', dic, null, lex); // ParsedQuery vazio, com todas as chaves
  p.textoOriginal = String(textoOriginal ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  p.intent = intent;
  p.viaNuvem = true;

  // elemento: o modelo emite o símbolo; tolera o nome no idioma do dicionário
  const el = sv(nlu, 'elemento');
  if (el) {
    const simbolo = dic.porSimbolo.has(el) ? el : dic.porSimbolo.has(el[0].toUpperCase() + el.slice(1).toLowerCase()) ? el[0].toUpperCase() + el.slice(1).toLowerCase()
      : dic.nomesElementoMap?.get(normalizar(el)) ?? null;
    if (simbolo) { p.elemento = simbolo; p.elementos = [simbolo]; }
  }

  // composto: texto copiado da pergunta; CID resolvido pela API (conferido no pacote) ou pelo dicionário local
  const compostoTexto = sv(nlu, 'composto');
  let cid = cidValido(dic, resolucao?.composto?.cid) ? Number(resolucao.composto.cid) : null;
  if (cid == null && compostoTexto) {
    const ents = dic.entidades(compostoTexto);
    cid = ents.compostos[0]?.cid ?? null;
    if (cid == null && ents.formulas[0]) { p.formulas = [ents.formulas[0].texto]; p.formula = p.formulas[0]; }
  }
  if (cid != null) {
    p.composto = cid;
    p.compostos = [cid];
    p.compostoNome = dic.nomeDaEntrada(cid) ?? compostoTexto;
    const viaFormula = compostoTexto && dic.formulaParaCid && [...dic.formulaParaCid.values()].includes(cid) && /^[A-Z(]/.test(compostoTexto) && !/\s/.test(compostoTexto);
    if (viaFormula) p.formula = compostoTexto;
  }

  // propriedade: id do contrato (regras.propriedades), nunca texto livre
  const prop = sv(nlu, 'propriedade');
  if (prop && dic.propPorId.has(prop)) {
    p.propriedade = prop;
    p.propriedades = [prop];
    p.alvoPropriedade = p.compostos.length ? 'composto' : p.elementos.length ? 'elemento' : dic.propPorId.get(prop)?.alvo ?? 'composto';
  }

  // quantidades: número finito + unidade conhecida (símbolo ou nome por extenso no idioma); unidade desconhecida descarta a quantidade
  const qs = Array.isArray(nlu?.quantidades) ? nlu.quantidades : [];
  p.quantidades = qs.map((q) => {
    const valor = typeof q?.valor === 'number' ? q.valor : Number(String(q?.valor ?? '').replace(',', '.'));
    if (!Number.isFinite(valor)) return null;
    const uTxt = sv(q, 'unidade');
    const unidade = uTxt ? lerUnidade(uTxt, dic.unidades, lex) : null;
    if (uTxt && !unidade) return null;
    return { valor, unidade, texto: `${valor}${unidade ? ' ' + unidade : ''}` };
  }).filter(Boolean).slice(0, MAX_QUANTIDADES);

  // equação: passa pelo mesmo extrator do NLU local (normaliza setas e espécies); texto inválido vira null
  const eq = sv(nlu, 'equacao');
  p.equacao = eq ? extrairEquacao(eq.replace(/→|⟶|⇒|=>|-->/g, '->')) : null;

  const nivel = sv(nlu, 'nivel')?.toLowerCase() ?? null;
  p.nivel = nivel && NIVEIS.has(nivel) ? nivel : null;

  const dest = sv(nlu, 'unidadeDestino');
  p.unidadeDestino = dest ? lerUnidade(dest, dic.unidades, lex) : null;

  const exige = EXIGE[intent];
  if (exige && !exige(p)) return null;
  return p;
}

/** Cliente do NLU na nuvem (POST /quimica/api/nlu, mesma origem). Só é chamado com consentimento. */
export class NuvemNlu {
  /**
   * @param {{endpoint?: string, fetchFn?: typeof fetch, installId: () => string, habilitada: () => boolean, timeoutMs?: number,
   *   timeoutExplicitoMs?: number}} o  `habilitada`: consentimento contínuo (modo automático, Configurações).
   */
  constructor({
    endpoint = ENDPOINT_NUVEM, fetchFn = (...a) => globalThis.fetch(...a), installId, habilitada = () => false, timeoutMs = TIMEOUT_NUVEM_MS,
    timeoutExplicitoMs = TIMEOUT_NUVEM_EXPLICITA_MS
  }) {
    Object.assign(this, { endpoint, fetchFn, installId, habilitada, timeoutMs, timeoutExplicitoMs });
    /** 'ok' | 'nao_entendeu' (o serviço respondeu, o modelo não achou interpretação útil) | 'indisponivel' (rede, tempo, limite, desligada) */
    this.ultimoResultado = null;
    this.ultimoModelo = null;
    this.ultimasSugestoes = [];
  }

  /** Modo automático: só envia com o consentimento contínuo ligado em Configurações. */
  async interpretar(pergunta, dic) {
    if (!this.habilitada()) return null; // nunca envia sem consentimento
    return this._enviar(pergunta, dic, this.timeoutMs);
  }

  /** Pedido explícito: o toque no botão é o consentimento para enviar SÓ esta pergunta (não liga o modo automático). */
  async interpretarAgora(pergunta, dic) {
    return this._enviar(pergunta, dic, this.timeoutExplicitoMs);
  }

  async _enviar(pergunta, dic, timeoutMs) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    this.ultimasSugestoes = [];
    this.ultimoModelo = null;
    try {
      const r = await this.fetchFn(this.endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', cache: 'no-store',
        body: JSON.stringify({ q: String(pergunta).slice(0, 300), v: 1, client: 'web', iid: this.installId() }),
        signal: ctl?.signal
      });
      this.ultimoResultado = 'indisponivel';
      if (!r.ok) return null; // 503 disabled, 429 limite, 4xx/5xx: a resposta local continua valendo
      const txt = await r.text();
      if (txt.length > 20000) return null;
      const raiz = JSON.parse(txt);
      if (raiz?.ok !== true || !raiz.nlu || typeof raiz.nlu !== 'object') return null;
      this.ultimoModelo = typeof raiz.model === 'string' ? raiz.model.slice(0, 60) : null;
      this.ultimasSugestoes = sugestoesDaResolucao(raiz.resolucao, dic);
      const parsed = validarNluNuvem(raiz.nlu, dic, pergunta, raiz.resolucao);
      // o servidor respondeu: se a interpretação não serve, foi o MODELO que não entendeu (não é indisponibilidade)
      this.ultimoResultado = parsed ? 'ok' : 'nao_entendeu';
      return parsed;
    } catch {
      this.ultimoResultado = 'indisponivel';
      return null; // rede/timeout/JSON malformado: segue com a resposta local
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

/**
 * A resposta atual oferece o botão "Perguntar à IA na nuvem"? Sempre que ela não veio da nuvem — inclusive depois de uma resposta local
 * entendida (o interpretador local às vezes erra; a pessoa pode pedir uma segunda interpretação). Com o modo automático ligado, a nuvem já foi
 * tentada nas perguntas não entendidas (não repete); nas entendidas o botão continua. Recusa de segurança e respostas institucionais não têm o botão.
 */
export const ofereceNuvem = (resposta, automatica = false) =>
  resposta != null && resposta.origem !== 'NUVEM' && resposta.erro !== true && !SEM_NUVEM.has(resposta.intent) &&
  (resposta.resolvida === true || !automatica);

/**
 * Executa o pedido explícito para a resposta `atual`. Sucesso ⇒ `{ ok: true, resposta }` (nova resposta montada dos dados locais via NLU na nuvem);
 * falha ⇒ `{ ok: false, resposta: atual, motivo, sugestoes }`. Nunca lança.
 */
export async function pedirANuvem({ engine, atual, pergunta }) {
  let nova = null;
  try { nova = await engine.perguntarANuvem(pergunta, atual, { explicito: true }); } catch { nova = null; }
  if (nova && nova.resolvida === true) return { ok: true, resposta: nova, sugestoes: [] };
  return { ok: false, resposta: atual, motivo: engine?.ultimoMotivoNuvem ?? null, sugestoes: engine?.ultimasSugestoesNuvem ?? [] };
}

/**
 * Chave do catálogo (ui.nuvem.*) para o aviso quando o pedido não trouxe resposta nova. Separa "o modelo não entendeu" de "o serviço está fora":
 * a primeira NÃO é falha do serviço e não deve parecer uma. `entendida` = o app já tinha respondido a pergunta.
 */
export function chaveFalhaNuvem(entendida, motivo) {
  if (motivo === 'nao_entendeu') return entendida ? 'semOutraInterpretacao' : 'naoEntendeu';
  if (motivo === 'indisponivel') return entendida ? 'indisponivelConferir' : 'indisponivel';
  return entendida ? 'falhouConferir' : 'falhou';
}
