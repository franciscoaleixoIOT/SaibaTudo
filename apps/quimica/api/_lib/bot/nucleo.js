// Núcleo do bot de mensagens (independente de canal e de HTTP): autorização, deduplicação, limites por conversa, comandos, o MOTOR DO SITE
// (web/src/quimica/js/engine.js) sobre o pacote assinado lido do disco, contexto de conversa por 30 min e, só quando a pessoa toca em
// "Explicar com IA", o pedido à nuvem pela função interna chamarAsk (mesmo orçamento, verificador de fidelidade e contador global do /api/ask).
// Textos fixos em pt-BR são permitidos aqui (servidor, teste interno; spec §9): o que já existe no catálogo do app vem de t()/tl().
// Nada do que passa por aqui vai a log além de { evt, motivo, ms }.
import { Engine } from '../../../web/src/quimica/js/engine.js';
import { SEM_NUVEM } from '../../../web/src/quimica/js/nuvem.js';
import { SUGESTOES_PADRAO, dataDoPacote } from '../../../web/src/quimica/js/answers.js';
import { t, tl } from '../../../web/src/quimica/js/i18n/index.js';
import { askAtivo, readConfig } from '../config.js';
import { chamarAsk, createAskState } from '../ask-handler.js';
import { MAX_ASK_CONTEXT, MAX_Q, MAX_TRECHOS, MAX_TRECHOS_TOTAL, MAX_TRECHO_TEXTO, cleanText } from '../validate.js';
import { criarConversas } from './conversas.js';

export const COMANDOS = ['/start', '/ajuda', '/limpar', '/sobre'];
export const ACAO_EXPLICAR = 'explicar';
export const ACAO_SUGESTOES = 'sugestoes';
export const PREFIXO_SUGESTAO = 'sug:';
const MAX_BOTOES_SUGESTAO = 4;

export const TEXTOS = Object.freeze({
  start: 'Olá! Eu sou o SaibaTudo Química em teste interno. Pergunte sobre elementos, compostos, cálculos e segurança química: as respostas vêm do pacote de dados assinado do app, e a IA na nuvem só entra quando você toca em "Explicar com IA". Comandos: /ajuda, /sobre, /limpar.',
  limpar: 'Contexto da conversa apagado.',
  semResposta: 'Não há resposta recente para explicar. Faça uma pergunta primeiro.',
  botaoAntigo: 'Esse botão é de uma resposta anterior. Faça a pergunta de novo para ter botões atualizados.',
  limite: 'Muitas mensagens em pouco tempo. Aguarde um minuto e tente de novo.',
  dados: 'Dados indisponíveis no momento. Tente de novo em alguns minutos.',
  gerando: 'Gerando a explicação…',
  explicarRotulo: 'Explicar com IA',
  sugestoesRotulo: 'Sugestões',
  sugestoesTitulo: 'Sugestões de perguntas',
  tituloIa: 'Explicação gerada por IA',
  avisoIa: 'Texto gerado por IA ({modelo}); pode conter erros. Os números que valem são os da resposta anterior, montada dos dados.',
  falhaIa: Object.freeze({
    disabled: 'A IA na nuvem está desligada no momento.',
    budget: 'A cota diária da IA na nuvem acabou. A resposta anterior continua valendo.',
    rejected: 'A IA gerou um texto que não passou na verificação do servidor; a resposta anterior continua valendo.',
    timeout: 'A IA na nuvem demorou demais. Tente de novo em instantes.',
    upstream: 'A IA na nuvem está indisponível agora. Tente de novo em instantes.',
    auth: 'A IA na nuvem recusou a credencial do servidor; avise o mantenedor.',
    bad_output: 'A IA na nuvem devolveu uma resposta inválida. Tente de novo em instantes.',
  }),
});

function inteiro(valor, padrao, min, max) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function lerConfigBot(env = process.env) {
  return {
    ativo: (env.BOT_ENABLED ?? '').trim() === '1',
    ratePorMin: inteiro(env.BOT_RATE_POR_MIN, 10, 1, 1000),
    ratePorDia: inteiro(env.BOT_RATE_POR_DIA, 200, 1, 100_000),
  };
}

const B = {
  texto: (texto) => ({ tipo: 'texto', texto }),
  aviso: (texto) => ({ tipo: 'aviso', texto }),
  lista: (titulo, itens) => ({ tipo: 'lista', titulo, itens }),
  kv: (itens) => ({ tipo: 'kv', titulo: null, itens }),
};

const ordemIdioma = (idioma) => { const i = String(idioma ?? '').toLowerCase(); return i === 'pt' || i === 'pt-br' ? 0 : i === 'en' ? 1 : 2; };

/** Trechos licenciados do pacote ligados à entidade da interpretação (elemento ou composto), pt antes de en, até `max`. */
export async function trechosPara(store, parsed, { max = MAX_TRECHOS } = {}) {
  const elemento = parsed?.elemento ?? null;
  const composto = parsed?.composto != null ? Number(parsed.composto) : null;
  if (!elemento && composto === null) return [];
  const indice = await store.indiceDeTextos();
  if (!indice) return [];
  const candidatos = [];
  for (const lote of indice.lotes ?? []) {
    for (const tr of lote.trechos ?? []) {
      const e = tr.entidades ?? {};
      const bate = (elemento && (e.elementos ?? []).includes(elemento)) || (composto !== null && (e.compostos ?? []).map(Number).includes(composto));
      if (bate) candidatos.push({ lote, id: tr.id, ordem: ordemIdioma(lote.idioma) });
    }
  }
  candidatos.sort((a, b) => a.ordem - b.ordem);
  const escolhidos = candidatos.slice(0, max);
  const lotes = new Map();
  const out = [];
  for (const c of escolhidos) {
    if (!lotes.has(c.lote.caminho)) {
      try { lotes.set(c.lote.caminho, await store.carregar(c.lote.caminho)); } catch { lotes.set(c.lote.caminho, []); }
    }
    const registro = (lotes.get(c.lote.caminho) ?? []).find((x) => x?.id === c.id);
    const texto = registro?.textoPt ?? registro?.textoOriginal;
    if (typeof texto === 'string' && texto.trim()) out.push({ id: c.id, texto });
  }
  return out;
}

/** Corpo do pedido à nuvem a partir da última resposta guardada: mesmos limites do /api/ask (validate.js). */
export function montarPedidoAsk(ultima, trechos = []) {
  const q = cleanText(ultima?.q ?? '').slice(0, MAX_Q);
  const context = cleanText(`Dados do app: ${ultima?.directAnswer ?? ''}`).slice(0, MAX_ASK_CONTEXT);
  const limpos = [];
  let total = 0;
  for (const tr of trechos) {
    if (limpos.length >= MAX_TRECHOS) break;
    const texto = cleanText(tr.texto ?? '').slice(0, MAX_TRECHO_TEXTO);
    if (texto.length < 3 || total + texto.length > MAX_TRECHOS_TOTAL) break;
    total += texto.length;
    limpos.push({ id: tr.id, texto });
  }
  return { q, context, trechos: limpos };
}

const nomesDasFontes = (fontes) => [...new Set((fontes ?? []).map((f) => f?.nome).filter(Boolean))];
const listaDeFontes = (store) => { const f = store.fontes; return (Array.isArray(f) ? f : f?.fontes ?? []).map((x) => x?.nome ?? x?.name ?? x?.id).filter(Boolean); };

/**
 * @param {{ obterStore: () => Promise<import('../../../web/src/quimica/js/data.js').DataStore>, env?: () => object, agora?: () => number,
 *   fetchFn?: typeof fetch, log?: (o: object) => void, autorizado: (msg: object) => boolean, conversas?: object, estadoAsk?: object }} deps
 */
export function criarNucleo({
  obterStore,
  env = () => process.env,
  agora = () => Date.now(),
  fetchFn = (...a) => globalThis.fetch(...a),
  log = () => {},
  autorizado,
  conversas = criarConversas({ now: agora }),
  estadoAsk = createAskState({ now: agora }),
}) {
  let engine = null;
  let fila = Promise.resolve();
  const serial = (fn) => { const p = fila.then(fn, fn); fila = p.catch(() => {}); return p; };

  const rodape = (store, fontes) => ({ fontes: nomesDasFontes(fontes), dataPacote: dataDoPacote(store) });
  const botaoSugestoes = { rotulo: TEXTOS.sugestoesRotulo, acao: ACAO_SUGESTOES };
  // Cada estado guardado da conversa tem um número (`seq`); os botões levam esse número para que um botão de resposta antiga não aja sobre a atual.
  const seqDe = (ctx) => (Number.isInteger(ctx?.seq) ? ctx.seq : 0);
  const botoesSugestao = (sugestoes, seq) => sugestoes.slice(0, MAX_BOTOES_SUGESTAO).map((s, i) => ({ rotulo: s, acao: `${PREFIXO_SUGESTAO}${seq}:${i}` }));
  const sugestoesDe = (ctx) => (Array.isArray(ctx?.sugestoes) && ctx.sugestoes.length ? ctx.sugestoes : SUGESTOES_PADRAO);
  const guardarSugestoes = (conversaId, ctx, sugestoes, seq = seqDe(ctx)) => conversas.guardar(conversaId, { ultimoContexto: null, ultimaInterpretacao: null, ultima: null, ...(ctx ?? {}), sugestoes, seq });
  const botaoAntigo = () => ({ resposta: { titulo: null, blocos: [B.texto(TEXTOS.botaoAntigo)] }, botoes: [], motivo: 'botao_antigo' });

  async function comando(nome, msg, store, ctx) {
    if (nome === '/limpar') {
      await conversas.apagar(msg.conversaId);
      return { resposta: { titulo: null, blocos: [B.texto(TEXTOS.limpar)] }, botoes: [] };
    }
    await guardarSugestoes(msg.conversaId, ctx, SUGESTOES_PADRAO);
    if (nome === '/start') return { resposta: { titulo: t('respostas.ajuda.titulo'), blocos: [B.texto(TEXTOS.start)] }, botoes: [botaoSugestoes] };
    if (nome === '/sobre') {
      const kv = B.kv([
        { rotulo: t('respostas.sobreDados.versao'), valor: String(store.versao) },
        { rotulo: t('respostas.sobreDados.geradoEm'), valor: String(dataDoPacote(store)) },
        { rotulo: t('respostas.sobreDados.assinatura'), valor: t(`respostas.sobreDados.sig.${store.sig.estado}`) },
        { rotulo: t('respostas.sobreDados.elementos'), valor: String(store.elementos.length) },
        { rotulo: t('respostas.sobreDados.compostos'), valor: String(store.indice.entradas.length) },
      ]);
      const fontes = listaDeFontes(store).slice(0, 12);
      const blocos = fontes.length ? [kv, B.lista(t('respostas.fontesResp.titulo'), fontes)] : [kv];
      return { resposta: { titulo: t('respostas.sobreDados.titulo'), blocos, rodape: { dataPacote: dataDoPacote(store) } }, botoes: [botaoSugestoes] };
    }
    // /ajuda e qualquer comando desconhecido
    return {
      resposta: {
        titulo: t('respostas.ajuda.titulo'),
        blocos: [B.texto(t('respostas.ajuda.texto')), B.lista(t('respostas.ajuda.podePerguntar'), tl('respostas.ajuda.itens')), B.aviso(t('respostas.ajuda.aviso'))],
      },
      botoes: [botaoSugestoes],
    };
  }

  async function responder(texto, msg, store, ctx) {
    engine ??= new Engine({ store });
    const r = await serial(async () => {
      engine._ultimoContexto = ctx?.ultimoContexto ?? null;
      engine._ultimaInterpretacao = ctx?.ultimaInterpretacao ?? null;
      const resposta = await engine.responder(texto);
      return { resposta, ultimoContexto: engine._ultimoContexto, ultimaInterpretacao: engine._ultimaInterpretacao };
    });
    const resp = r.resposta;
    const parsed = resp.parsed ?? {};
    const interpretacao = { intent: parsed.intent ?? resp.intent, elemento: parsed.elemento ?? null, composto: parsed.composto ?? null };
    const sugestoes = Array.isArray(resp.sugestoes) ? resp.sugestoes : [];
    const recusa = interpretacao.intent === 'RECUSA_PERIGO';
    const seq = seqDe(ctx) + 1;
    if (!recusa) {
      if (resp.resolvida && !SEM_NUVEM.has(resp.intent)) {
        await conversas.guardar(msg.conversaId, {
          ultimoContexto: r.ultimoContexto,
          ultimaInterpretacao: r.ultimaInterpretacao,
          ultima: { q: texto, directAnswer: resp.directAnswer ?? '', parsed: interpretacao },
          sugestoes,
          seq,
        });
      } else {
        await guardarSugestoes(msg.conversaId, ctx, sugestoes.length ? sugestoes : SUGESTOES_PADRAO, seq);
      }
    }
    const botoes = [];
    if (!recusa) {
      if (resp.resolvida && !SEM_NUVEM.has(resp.intent) && askAtivo(readConfig(env()))) botoes.push({ rotulo: TEXTOS.explicarRotulo, acao: `${ACAO_EXPLICAR}:${seq}` });
      if (resp.resolvida) { if (sugestoes.length) botoes.push(botaoSugestoes); } else botoes.push(...botoesSugestao(sugestoes.length ? sugestoes : SUGESTOES_PADRAO, seq));
    }
    return { resposta: { titulo: resp.titulo ?? null, blocos: resp.blocos ?? [], rodape: rodape(store, resp.fontes) }, botoes, interpretacao };
  }

  async function explicar(msg, store, ctx) {
    const cfg = readConfig(env());
    if (!askAtivo(cfg)) return { resposta: { titulo: null, blocos: [B.texto(TEXTOS.falhaIa.disabled)] }, botoes: [], motivo: 'ia_disabled' };
    const ultima = ctx?.ultima;
    if (!ultima?.q) return { resposta: { titulo: null, blocos: [B.texto(TEXTOS.semResposta)] }, botoes: [], motivo: 'sem_resposta' };
    const trechos = await trechosPara(store, ultima.parsed);
    const dados = montarPedidoAsk(ultima, trechos);
    const r = await chamarAsk(cfg, dados, { doFetch: fetchFn, now: agora, state: estadoAsk });
    if (!r.ok) {
      return { resposta: { titulo: null, blocos: [B.texto(TEXTOS.falhaIa[r.kind] ?? TEXTOS.falhaIa.upstream)] }, botoes: [], motivo: `ia_${r.kind}` };
    }
    return {
      resposta: { titulo: TEXTOS.tituloIa, blocos: [B.texto(r.answer), B.aviso(TEXTOS.avisoIa.replace('{modelo}', r.model))], rodape: { origem: r.model } },
      botoes: [],
    };
  }

  async function processar(msg) {
    const t0 = agora();
    const fim = (saida) => { log({ evt: 'bot_nucleo', motivo: saida.motivo ?? (saida.silencio ? 'silencio' : 'ok'), ms: agora() - t0 }); return saida; };
    try {
      return await processarInterno(msg, fim);
    } catch {
      // erro inesperado: a pessoa recebe um aviso (em vez de silêncio e reenvio pelo Telegram); nada do erro vai ao log (poderia trazer texto)
      return fim({ resposta: { titulo: null, blocos: [B.texto(TEXTOS.dados)] }, botoes: [], motivo: 'erro' });
    }
  }

  async function processarInterno(msg, fim) {
    if (!autorizado(msg)) return fim({ silencio: true, motivo: 'nao_autorizado' });
    if (await conversas.jaVisto(msg.eventoId)) return fim({ silencio: true, motivo: 'duplicado' });
    const cfg = lerConfigBot(env());
    if (await conversas.limiteExcedido(msg.conversaId, { porMin: cfg.ratePorMin, porDia: cfg.ratePorDia })) {
      return fim({ resposta: { titulo: null, blocos: [B.texto(TEXTOS.limite)] }, botoes: [], motivo: 'limite' });
    }
    let store;
    try { store = await obterStore(); } catch { return fim({ resposta: { titulo: null, blocos: [B.texto(TEXTOS.dados)] }, botoes: [], motivo: 'dados' }); }
    const ctx = await conversas.obter(msg.conversaId);

    let texto = typeof msg.texto === 'string' ? cleanText(msg.texto).slice(0, MAX_Q) : '';
    if (msg.acao != null) {
      const acao = String(msg.acao);
      const seqAtual = seqDe(ctx);
      // "explicar" ou "explicar:<seq>": só a resposta atual pode ser explicada
      const mExplicar = acao.match(/^explicar(?::(\d{1,9}))?$/);
      if (mExplicar) {
        if (mExplicar[1] !== undefined && Number(mExplicar[1]) !== seqAtual) return fim(botaoAntigo());
        return fim(await explicar(msg, store, ctx));
      }
      if (acao === ACAO_SUGESTOES) {
        const sugestoes = sugestoesDe(ctx);
        return fim({ resposta: { titulo: TEXTOS.sugestoesTitulo, blocos: [B.lista(null, sugestoes.slice(0, MAX_BOTOES_SUGESTAO))] }, botoes: botoesSugestao(sugestoes, seqAtual) });
      }
      // "sug:<seq>:<i>" (botões atuais) ou "sug:<i>" (forma curta)
      const mSug = acao.match(/^sug:(?:(\d{1,9}):)?(\d)$/);
      if (!mSug) return fim({ silencio: true, motivo: 'acao_invalida' });
      if (mSug[1] !== undefined && Number(mSug[1]) !== seqAtual) return fim(botaoAntigo());
      const i = Number(mSug[2]);
      const sugestoes = sugestoesDe(ctx);
      if (i >= Math.min(sugestoes.length, MAX_BOTOES_SUGESTAO)) return fim({ silencio: true, motivo: 'acao_invalida' });
      texto = cleanText(sugestoes[i]).slice(0, MAX_Q);
    }
    if (!texto) return fim(await comando('/ajuda', msg, store, ctx));
    if (texto.startsWith('/')) return fim(await comando(texto.split(/\s+/)[0].toLowerCase(), msg, store, ctx));
    return fim(await responder(texto, msg, store, ctx));
  }

  return { processar };
}
