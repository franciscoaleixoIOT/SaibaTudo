// IA na nuvem (opcional, OPT-IN, desde 14/10/2026): só ajuda a INTERPRETAR a pergunta. Porte de cloud.js do SaibaTudo Eleições.
// A nuvem NUNCA fornece fatos: devolve intenção + entidades (texto copiado da pergunta), que são revalidadas contra o dicionário do pacote
// assinado (símbolo existe, CID existe, propriedade e unidade conhecidas); qualquer valor fora dos dados é descartado. A resposta é montada
// pelo AnswerBuilder local, com fonte e licença em cada bloco. Contrato: api/README.md ("POST /api/nlu") e docs/DATA_CONTRACT.md §8–9.
// Consentimento: por pergunta (toque em "Perguntar à IA na nuvem") ou contínuo (modo automático em Configurações, desligado por padrão).
// Multi-turno (NLU v3.4+, desde 17/10/2026): numa PERGUNTA DE CONTINUAÇÃO ("e o do potássio?", "em gramas?", "desenhe") o corpo leva também
// `contexto`, a INTERPRETAÇÃO da pergunta anterior (intenção + entidades como texto, nunca o CID), nunca o texto dela nem o histórico.
// Regra em `ehContinuacao`; objeto em `contextoParaNuvem`; paridade com o Android em ai/nlu/CloudNlu.kt (ContextoNuvem).
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
  BALANCEAR: (p) => p.equacao != null,
  NOX: (p) => p.composto != null || p.formula != null,
  EQUILIBRIO: (p) => p.equacao != null
};

const sv = (o, k) => {
  const v = o?.[k];
  if (v == null || typeof v === 'object') return null;
  const s = String(v).trim();
  return s !== '' && s !== 'null' && s.length <= 300 ? s : null;
};
// ---------------------------------------------------------------------------------------------------- contexto multi-turno
/** Tamanho máximo do contexto na forma canônica do servidor (api/_lib/contexto.js, nlu_core.format_output). */
export const MAX_CONTEXTO = 400;
const MAX_COMPOSTO_CONTEXTO = 60;
const MAX_EQUACAO_CONTEXTO = 120;
const MAX_QUANTIDADES_CONTEXTO = 4;
/** Pergunta que começa com conectivo de continuação só conta como continuação se for curta (em palavras normalizadas). */
export const MAX_PALAVRAS_CONTINUACAO = 10;
/** Ordem fixa das chaves (= nlu_core.KEYS e CHAVES_CONTEXTO da API). */
export const CHAVES_CONTEXTO = Object.freeze(['intent', 'elemento', 'composto', 'propriedade', 'quantidades', 'equacao', 'nivel', 'unidadeDestino']);
/** Chaves que cada intenção admite (espelho das permitidas de ENTIDADES_POR_INTENCAO em backend/modal/nlu_core.py; o teste confere). */
export const CHAVES_POR_INTENCAO = Object.freeze({
  ELEMENTO: ['elemento'],
  COMPOSTO: ['composto'],
  PROPRIEDADE: ['elemento', 'composto', 'propriedade'],
  MASSA_MOLAR: ['elemento', 'composto'],
  BALANCEAR: ['equacao'],
  ESTEQUIOMETRIA: ['elemento', 'composto', 'quantidades', 'equacao'],
  CONCENTRACAO: ['composto', 'quantidades', 'unidadeDestino'],
  PH: ['composto', 'quantidades'],
  GAS_IDEAL: ['composto', 'quantidades'],
  CONVERSAO_UNIDADE: ['quantidades', 'unidadeDestino'],
  NOMENCLATURA: ['composto'],
  DESENHAR: ['composto'],
  COMPARAR: ['elemento', 'composto', 'propriedade'],
  TABELA_PERIODICA: ['propriedade'],
  SEGURANCA: ['elemento', 'composto'],
  CONCEITO: ['composto', 'nivel'],
  NOX: ['elemento', 'composto'],
  ENTALPIA: ['composto', 'quantidades', 'equacao'],
  EQUILIBRIO: ['equacao', 'quantidades'],
  LIGACAO: ['elemento', 'composto']
});
/** Unidades do contrato (espelho de UNIDADES em api/_lib/vocab.js; o teste confere): outra unidade não vai no contexto. */
export const UNIDADES_CONTEXTO = new Set([
  'g', 'mg', 'kg', 'u', 'mol', 'mmol', 'L', 'mL', 'dm3', 'm3', 'cm3',
  'mol/L', 'mmol/L', 'g/L', 'mg/L', 'g/mL', 'g/cm3', 'kg/m3', 'g/mol', 'kJ/mol', 'kcal/mol',
  '%', 'ppm', 'K', '°C', '°F', 'atm', 'Pa', 'kPa', 'bar', 'mmHg', 'torr',
  'J', 'kJ', 'cal', 'kcal', 'eV', 'm', 'cm', 'mm', 'nm', 'pm', 'Å', 's', 'min', 'h'
]);
// eslint-disable-next-line no-control-regex
const PROIBIDOS_CONTEXTO = /[\u0000-\u001f\u007f"\\]|<\||\|>/;
const textoContexto = (v, max) => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s.length >= 1 && s.length <= max && !PROIBIDOS_CONTEXTO.test(s) && !/^\d+$/.test(s) ? s : null;
};

/**
 * Texto do composto para o contexto, NUNCA o CID: a fórmula digitada; o nome de exibição (quando o índice tem); o texto que a nuvem devolveu;
 * o trecho da pergunta que resolveu o composto (fórmula como foi escrita ou o nome normalizado, "acido sulfurico"); uma chave do índice.
 */
function textoDoComposto(p, dic) {
  const cid = p.composto != null ? Number(p.composto) : null;
  const naPergunta = () => {
    if (cid == null || !p.textoOriginal || typeof dic?.entidades !== 'function') return null;
    const a = dic.entidades(p.textoOriginal).compostos.find((c) => c.cid === cid);
    return a ? a.texto ?? a.chave ?? null : null;
  };
  const e = cid != null ? dic?.entrada?.(cid) : null;
  const cands = [() => p.formula, () => p.compostoNome, () => (cid != null ? dic?.nomeDaEntrada?.(cid) : null), () => p.compostoTexto, naPergunta,
    () => e?.chavesPorIdioma?.[dic?.idioma]?.[0], () => e?.chaves?.[0], () => p.formulas?.[0]];
  for (const pega of cands) { const s = textoContexto(pega(), MAX_COMPOSTO_CONTEXTO); if (s) return s; }
  return null;
}

/** Serialização canônica do servidor (api/_lib/contexto.js `contextoCanonico`), só para medir o tamanho. */
export function tamanhoContexto(ctx) {
  const partes = [];
  for (const k of CHAVES_CONTEXTO) {
    const v = ctx?.[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    partes.push(k === 'quantidades'
      ? `"quantidades": [${v.map((x) => `{"valor": ${String(x.valor)}, "unidade": ${JSON.stringify(x.unidade)}}`).join(', ')}]`
      : `${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  }
  return `{${partes.join(', ')}}`.length;
}

/**
 * Interpretação (ParsedQuery do site, local ou da nuvem) → objeto `contexto` do contrato: `intent` + só as chaves que a intenção admite,
 * entidades como TEXTO (símbolo, nome/fórmula do composto, id da propriedade, unidades do vocabulário), sem null, até 400 caracteres na
 * forma canônica. null quando não há o que herdar (intenção sem entidades, DESCONHECIDA, recusa, institucional) ou o objeto não cabe.
 */
export function contextoParaNuvem(p, dic) {
  const intent = typeof p?.intent === 'string' ? p.intent : null;
  const chaves = intent ? CHAVES_POR_INTENCAO[intent] : null;
  if (!chaves) return null;
  const v = {};
  if (chaves.includes('elemento') && typeof p.elemento === 'string' && /^[A-Z][a-z]{0,2}$/.test(p.elemento)) v.elemento = p.elemento;
  if (chaves.includes('composto') && (p.composto != null || p.formula)) { const c = textoDoComposto(p, dic); if (c) v.composto = c; }
  if (chaves.includes('propriedade') && typeof p.propriedade === 'string' && /^[A-Za-z0-9]{1,40}$/.test(p.propriedade)) v.propriedade = p.propriedade;
  if (chaves.includes('quantidades')) {
    const qs = (Array.isArray(p.quantidades) ? p.quantidades : [])
      .filter((q) => typeof q?.valor === 'number' && Number.isFinite(q.valor) && UNIDADES_CONTEXTO.has(q.unidade))
      .slice(0, MAX_QUANTIDADES_CONTEXTO).map((q) => ({ valor: q.valor, unidade: q.unidade }));
    if (qs.length) v.quantidades = qs;
  }
  if (chaves.includes('equacao')) { const e = textoContexto(p.equacao, MAX_EQUACAO_CONTEXTO); if (e) v.equacao = e; }
  if (chaves.includes('nivel') && NIVEIS.has(p.nivel)) v.nivel = p.nivel;
  if (chaves.includes('unidadeDestino') && UNIDADES_CONTEXTO.has(p.unidadeDestino)) v.unidadeDestino = p.unidadeDestino;
  // um só alvo: a propriedade fica com o alvo que a resposta usou; nas outras intenções (menos COMPARAR), o composto citado vence o elemento
  if (v.elemento && v.composto && intent !== 'COMPARAR') {
    if (intent === 'PROPRIEDADE' && p.alvoPropriedade === 'elemento') delete v.composto; else delete v.elemento;
  }
  if (!Object.keys(v).some((k) => k !== 'nivel')) return null;
  const ctx = { intent };
  for (const k of CHAVES_CONTEXTO) if (v[k] !== undefined) ctx[k] = v[k];
  return tamanhoContexto(ctx) <= MAX_CONTEXTO ? ctx : null;
}

/** A interpretação local (sem contexto) ficou sem a entidade de que a intenção precisa: "qual o raio atômico?", "desenhe", "é perigoso?". */
export function faltaEntidade(p) {
  const nEl = p.elementos?.length ?? (p.elemento ? 1 : 0);
  const nCo = (p.compostos?.length ?? (p.composto != null ? 1 : 0)) + (p.formulas?.length ?? (p.formula ? 1 : 0));
  switch (p.intent) {
    case 'ELEMENTO': return !p.elemento;
    case 'COMPOSTO': case 'NOMENCLATURA': case 'DESENHAR': return nCo === 0;
    case 'PROPRIEDADE': return !p.propriedade || nEl + nCo === 0;
    case 'MASSA_MOLAR': case 'SEGURANCA': return nEl + nCo === 0;
    case 'COMPARAR': return nEl + nCo < 2;
    case 'CONVERSAO_UNIDADE': return !p.unidadeDestino || !(p.quantidades ?? []).some((q) => q.unidade);
    case 'BALANCEAR': return !p.equacao;
    default: return false;
  }
}

/**
 * A pergunta é de CONTINUAÇÃO (e pode levar o contexto à nuvem)? `local` é a interpretação local da pergunta SEM o contexto da conversa.
 * Sim quando: o NLU local não entendeu (DESCONHECIDA); ou entendeu a intenção sem a entidade obrigatória (`faltaEntidade`); ou a pergunta é
 * curta (até MAX_PALAVRAS_CONTINUACAO palavras) e tem conectivo de continuação do idioma (`pistas.continuacaoNuvem` do léxico: "e o…",
 * "também", "and for…", "too", "y el…", "und für…", "auch", "et pour…", "aussi", "em gramas?", "desenhe", "mostre"…). Recusa nunca.
 */
export function ehContinuacao(pergunta, local, lex) {
  const n = normalizar(pergunta);
  if (!n || !local || local.intent === 'RECUSA_PERIGO') return false;
  if (local.intent === 'DESCONHECIDA' || faltaEntidade(local)) return true;
  const rx = lex?.pistas?.continuacaoNuvem;
  return !!rx && n.split(' ').length <= MAX_PALAVRAS_CONTINUACAO && rx.test(n);
}

/**
 * O `contexto` a mandar com `pergunta`, ou null: só em pergunta de continuação (`ehContinuacao`) e com uma interpretação ANTERIOR da mesma
 * conversa (`anterior`, local ou da nuvem) que não seja DESCONHECIDA/RECUSA_PERIGO e que tenha o que herdar (`contextoParaNuvem`).
 */
export function contextoDaPergunta(pergunta, anterior, dic, lex = dic?.lex) {
  if (!anterior || anterior.intent === 'DESCONHECIDA' || anterior.intent === 'RECUSA_PERIGO') return null;
  const ctx = contextoParaNuvem(anterior, dic);
  if (!ctx) return null;
  return ehContinuacao(pergunta, parse(pergunta, dic, null, lex), lex) ? ctx : null;
}

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
 * (interpretação não confiável). `resolucao` é o campo da API com o CID do composto citado (ou sugestões). `anterior`: a interpretação enviada
 * como `contexto` (o composto herdado, já resolvido nela, vale quando o texto devolvido é o mesmo que foi enviado).
 */
export function validarNluNuvem(nlu, dic, textoOriginal, resolucao = null, lex = dic?.lex, anterior = null) {
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
    if (cid == null && anterior?.composto != null && cidValido(dic, anterior.composto) && normalizar(textoDoComposto(anterior, dic) ?? '') === normalizar(compostoTexto)) {
      cid = Number(anterior.composto); // composto herdado do contexto: o mesmo texto que o cliente mandou
    }
    if (cid == null && ents.formulas[0]) { p.formulas = [ents.formulas[0].texto]; p.formula = p.formulas[0]; }
  }
  if (cid != null) {
    p.composto = cid;
    p.compostos = [cid];
    p.compostoNome = dic.nomeDaEntrada(cid) ?? compostoTexto;
    p.compostoTexto = compostoTexto; // o texto que a nuvem devolveu (volta como contexto numa continuação)
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
    /** `contexto` do último envio (objeto do contrato) ou null; `ultimoContextoUsado`: o servidor confirmou que o usou (`"contexto": true`). */
    this.ultimoContexto = null;
    this.ultimoContextoUsado = false;
  }

  /**
   * Modo automático: só envia com o consentimento contínuo ligado em Configurações. `anterior`: interpretação anterior da conversa, já
   * escolhida pelo motor para ir como `contexto` (pergunta de continuação, `contextoDaPergunta`); null = só a pergunta.
   */
  async interpretar(pergunta, dic, anterior = null) {
    if (!this.habilitada()) return null; // nunca envia sem consentimento
    return this._enviar(pergunta, dic, this.timeoutMs, anterior);
  }

  /** Pedido explícito: o toque no botão é o consentimento para enviar SÓ esta pergunta (não liga o modo automático). */
  async interpretarAgora(pergunta, dic, anterior = null) {
    return this._enviar(pergunta, dic, this.timeoutExplicitoMs, anterior);
  }

  async _enviar(pergunta, dic, timeoutMs, anterior = null) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    this.ultimasSugestoes = [];
    this.ultimoModelo = null;
    this.ultimoContexto = null;
    this.ultimoContextoUsado = false;
    let contexto = anterior ? contextoParaNuvem(anterior, dic) : null;
    const post = (ctx) => this.fetchFn(this.endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', cache: 'no-store',
      body: JSON.stringify({ q: String(pergunta).slice(0, 300), v: 1, client: 'web', iid: this.installId(), ...(ctx ? { contexto: ctx } : {}) }),
      signal: ctl?.signal
    });
    try {
      let r = await post(contexto);
      // contexto recusado pelo servidor (400 {error:"contexto"}): repete UMA vez só com a pergunta
      if (contexto && r.status === 400) {
        let erro = null;
        try { erro = JSON.parse(await r.text())?.error ?? null; } catch { erro = null; }
        if (erro === 'contexto') { contexto = null; r = await post(null); }
      }
      this.ultimoContexto = contexto;
      this.ultimoResultado = 'indisponivel';
      if (!r.ok) return null; // 503 disabled, 429 limite, 4xx/5xx: a resposta local continua valendo
      const txt = await r.text();
      if (txt.length > 20000) return null;
      const raiz = JSON.parse(txt);
      if (raiz?.ok !== true || !raiz.nlu || typeof raiz.nlu !== 'object') return null;
      this.ultimoModelo = typeof raiz.model === 'string' ? raiz.model.slice(0, 60) : null;
      this.ultimoContextoUsado = contexto != null && raiz.contexto === true;
      this.ultimasSugestoes = sugestoesDaResolucao(raiz.resolucao, dic);
      const parsed = validarNluNuvem(raiz.nlu, dic, pergunta, raiz.resolucao, dic?.lex, contexto ? anterior : null);
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
  if (motivo === 'igual') return 'mesmaInterpretacao';
  if (motivo === 'nao_entendeu') return entendida ? 'semOutraInterpretacao' : 'naoEntendeu';
  if (motivo === 'indisponivel') return entendida ? 'indisponivelConferir' : 'indisponivel';
  return entendida ? 'falhouConferir' : 'falhou';
}
