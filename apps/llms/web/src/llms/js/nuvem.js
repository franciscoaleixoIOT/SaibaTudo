// IA na nuvem (opcional, OPT-IN): só EXPLICA conceitos e o que o gráfico mostra; nunca fornece números (os números do gráfico vão no contexto,
// calculados aqui). Consentimento: por pergunta (toque em "Perguntar à IA na nuvem") ou contínuo (modo automático em Configurações, desligado
// por padrão). O corpo leva pergunta, idioma, um resumo do gráfico (≤ 1500 caracteres, números com ponto) e até 3 trechos das seções; nunca o
// histórico. O servidor (api/ask.js) valida, limita, chama o Space e verifica a resposta; o cliente mostra o texto rotulado com o modelo.
import { trechosPara } from './conteudo/index.js';
import { projetar } from './projecao.js';

export const ENDPOINT_NUVEM = '/llms/api/ask';
export const TIMEOUT_NUVEM_MS = 30_000;
export const MAX_CONTEXTO = 1500;
const MAX_TRECHOS = 3;

const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const n3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);

/** Resumo do estado do explorador para o modelo: palavras, modo e eixos, coordenadas, vizinhos/analogia/direção. Números com ponto. */
export function contextoDoEstado(estado, vetores, idioma) {
  const linhas = [`idioma: ${idioma}`];
  const palavras = estado?.palavras ?? [];
  if (!palavras.length) {
    linhas.push('grafico: vazio (nenhuma palavra escolhida)');
  } else {
    const nomes = palavras.map((i) => vetores.palavra(i));
    linhas.push(`palavras (${nomes.length}): ${nomes.join(', ')}`);
    const M = vetores.matriz(palavras);
    const proj = projetar(M, estado.modo);
    linhas.push(`modo: ${proj.modo}; eixos: ${proj.eixos.map((e) => (e.indice != null ? e.rotulo : `${e.rotulo} (${n2(e.explicada)}% var)`)).join(', ')}`);
    linhas.push('coordenadas: ' + proj.pontos.map((p, k) => `${nomes[k]} (${n2(p.x)}, ${n2(p.y)}, ${n2(p.z)})`).join('; '));
    if (estado.destaque != null && palavras.includes(estado.destaque)) {
      const viz = vetores.vizinhos(vetores.vetor(estado.destaque), 10, [estado.destaque]);
      linhas.push(`vizinhos de ${vetores.palavra(estado.destaque)}: ${viz.map((v) => `${v.palavra} (${n3(v.cos)})`).join(', ')}`);
    }
  }
  if (estado?.analogia) {
    const { a, b, c } = estado.analogia;
    const r = vetores.analogia(a, b, c, 5);
    linhas.push(`analogia: ${vetores.palavra(a)} - ${vetores.palavra(b)} + ${vetores.palavra(c)} ~ ${r.resultados.map((x) => `${x.palavra} (${n3(x.cos)})`).join(', ')}`);
  }
  if (estado?.direcao) {
    const { w1, w2, lista } = estado.direcao;
    const r = vetores.produtoEscalar(vetores.direcao(w1, w2), lista.length ? lista : palavras);
    linhas.push(`direcao ${vetores.palavra(w1)} - ${vetores.palavra(w2)}; produto escalar: ${r.map((x) => `${x.palavra} ${n2(x.valor)}`).join(', ')}`);
  }
  let texto = linhas.join('\n');
  if (texto.length > MAX_CONTEXTO) texto = texto.slice(0, MAX_CONTEXTO - 1) + '…';
  return texto;
}

const SECAO_DO_CONCEITO = { embedding: 'embeddings', vetor: 'embeddings', dimensao: 'embeddings', cosseno: 'embeddings', token: 'tokens', atencao: 'atencao', transformer: 'atencao', mlp: 'camadas', parametro: 'camadas', softmax: 'softmax', temperatura: 'softmax', proximoToken: 'modelo' };

/** Até 3 trechos das seções no idioma: a do conceito interpretado e as citadas por termo na pergunta; padrão embeddings. */
export function trechosDaPergunta(parsed, idioma, lex = null) {
  const ids = [];
  const add = (id) => { if (id && !ids.includes(id) && ids.length < MAX_TRECHOS) ids.push(id); };
  if (parsed?.conceito) add(SECAO_DO_CONCEITO[parsed.conceito]);
  if (lex && parsed?.original) {
    const norm = String(parsed.original).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const [conceito, termos] of Object.entries(lex.conceitos)) if (termos.some((t) => norm.includes(t))) add(SECAO_DO_CONCEITO[conceito]);
  }
  if (!ids.length) add('embeddings');
  return trechosPara(idioma, ids);
}

/** Motivo de falha a partir do status e do corpo da API. */
export function motivoDe(status, corpo) {
  const erro = corpo?.error;
  if (status === 422 && erro === 'rejected') return 'rejeitada';
  if (status === 422 && erro === 'dadopessoal') return 'dadopessoal';
  if (status === 503 && erro === 'disabled') return 'desligada';
  if (status === 503 && erro === 'budget') return 'cota';
  if (status === 429) return 'cota';
  if (status === 504 || erro === 'timeout') return 'timeout';
  return 'rede';
}

export class NuvemExplica {
  /** @param {{ fetch?: typeof fetch, installId: () => string, timeoutMs?: number, endpoint?: string }} o */
  constructor({ fetch = (...a) => globalThis.fetch(...a), installId, timeoutMs = TIMEOUT_NUVEM_MS, endpoint = ENDPOINT_NUVEM }) {
    this.fetch = fetch;
    this.installId = installId;
    this.timeoutMs = timeoutMs;
    this.endpoint = endpoint;
  }

  /**
   * @param {{ q: string, idioma: string, contexto: string, trechos: {id, texto}[], sinal?: AbortSignal }} o
   * @returns {Promise<{ ok: true, answer: string, model: string } | { ok: false, motivo: 'desligada'|'cota'|'timeout'|'rejeitada'|'dadopessoal'|'rede' }>}
   */
  async perguntar({ q, idioma, contexto, trechos, sinal = null }) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    sinal?.addEventListener?.('abort', () => ctl.abort());
    try {
      const corpo = { q: String(q).slice(0, 400), lang: idioma, context: String(contexto ?? '').slice(0, MAX_CONTEXTO), trechos: (trechos ?? []).slice(0, MAX_TRECHOS), v: 1, client: 'web', iid: this.installId() };
      const r = await this.fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(corpo), signal: ctl.signal });
      let json = null;
      try { json = await r.json(); } catch { json = null; }
      if (r.status === 200 && json?.ok === true && typeof json.answer === 'string' && json.answer.trim()) {
        return { ok: true, answer: json.answer.trim(), model: typeof json.model === 'string' && json.model.trim() ? json.model.trim() : '' };
      }
      return { ok: false, motivo: motivoDe(r.status, json) };
    } catch (e) {
      return { ok: false, motivo: e?.name === 'AbortError' ? 'timeout' : 'rede' };
    } finally {
      clearTimeout(timer);
    }
  }
}
