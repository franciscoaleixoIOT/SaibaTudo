// Pacote de dados do SaibaTudo LLMs: carga VERIFICADA (assinatura ECDSA do manifesto + SHA-256 de cada arquivo) e operações sobre os vetores
// do GloVe guardados em int8 com uma escala por vetor (docs/DATA_CONTRACT.md). Sem DOM: funciona no navegador e no Node (testes).
//
// Produto escalar direto nos int8: dot(a, b) = sa · sb · Σ ai·bi, com as normas calculadas uma vez. 100 000 × 50 int8 cabem em 5 MB e
// uma varredura completa (vizinhos) são 5 milhões de multiplicações: dezenas de milissegundos num celular.
import { CHAVE_PUBLICA_B64, subtleDisponivel, verificarManifesto } from './verify.js';

export const SCHEMA_SUPORTADO = 1;
export const DIMENSOES = 50;
/** Os arquivos que o cliente precisa, na ordem em que são lidos. */
export const ARQUIVOS = ['vocab.json', 'vetores.i8', 'escalas.f32', 'glossario.json', 'presets.json'];
/** Aproximação por distância de edição só nas palavras mais frequentes (custo linear). */
export const LIMITE_APROXIMACAO = 20_000;

export class ErroDados extends Error {
  /** @param {'manifesto'|'assinatura'|'hash'|'rede'} codigo */
  constructor(codigo, detalhe = '') {
    super(detalhe ? `${codigo}: ${detalhe}` : codigo);
    this.name = 'ErroDados';
    this.codigo = codigo;
  }
}

const normalizarPalavra = (p) => String(p ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function sha256Hex(bytes) {
  if (!subtleDisponivel()) return null;
  const d = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Distância de edição limitada (Levenshtein até `max`; devolve max+1 quando passa). */
export function distanciaAte(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let menor = cur[0];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < menor) menor = cur[j];
    }
    if (menor > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export class Vetores {
  /**
   * @param {{ palavras: string[], q: Int8Array, escalas: Float32Array, glossario: object, presets: object, manifesto: object, sig: {estado: string} }} o
   */
  constructor({ palavras, q, escalas, glossario, presets, manifesto, sig }) {
    this.palavras = palavras;
    this.n = palavras.length;
    this.dimensoes = DIMENSOES;
    this.q = q;
    this.escalas = escalas;
    this.glossario = glossario ?? {};
    this.presets = presets ?? {};
    this.manifesto = manifesto ?? null;
    this.sig = sig ?? { estado: 'indisponivel' };
    this._indice = new Map(palavras.map((p, i) => [p, i]));
    this._normas = null;
    this._ordenadas = null;
    this._glossarioInverso = null;
  }

  /**
   * Baixa manifest.json + manifest.sig, verifica a assinatura, baixa os arquivos (?v=<sha256>) conferindo bytes e SHA-256 (quando há WebCrypto).
   * @param {{ fetch?: typeof fetch, base?: string, chavePublicaB64?: string }} o
   */
  static async carregar({ fetch = globalThis.fetch, base = '/llms/data/', chavePublicaB64 = CHAVE_PUBLICA_B64 } = {}) {
    const url = (p, v = null) => `${base}${p}${v ? `?v=${v.slice(0, 16)}` : ''}`;
    const baixar = async (p, v = null) => {
      let r;
      try { r = await fetch(url(p, v), { headers: { accept: '*/*' } }); } catch (e) { throw new ErroDados('rede', `${p}: ${e?.message ?? e}`); }
      if (!r || !r.ok) throw new ErroDados('rede', `${p}: HTTP ${r?.status ?? '?'}`);
      return new Uint8Array(await r.arrayBuffer());
    };
    const manifestoBytes = await baixar('manifest.json');
    let manifesto;
    try { manifesto = JSON.parse(new TextDecoder().decode(manifestoBytes)); } catch { throw new ErroDados('manifesto', 'JSON inválido'); }
    if (!manifesto || typeof manifesto !== 'object' || !manifesto.files || typeof manifesto.version !== 'string') throw new ErroDados('manifesto', 'campos ausentes');
    if (manifesto.schemaVersion !== SCHEMA_SUPORTADO) throw new ErroDados('manifesto', `schemaVersion ${manifesto.schemaVersion}`);
    const sigB64 = new TextDecoder().decode(await baixar('manifest.sig')).trim();
    let sig;
    if (!subtleDisponivel()) sig = { estado: 'indisponivel' };
    else if (await verificarManifesto(manifestoBytes, sigB64, chavePublicaB64)) sig = { estado: 'verificada' };
    else throw new ErroDados('assinatura', 'assinatura do manifesto não confere');
    const conteudo = {};
    for (const nome of ARQUIVOS) {
      const meta = manifesto.files[nome];
      if (!meta || typeof meta.sha256 !== 'string' || typeof meta.bytes !== 'number') throw new ErroDados('manifesto', `sem ${nome}`);
      const bytes = await baixar(nome, meta.sha256);
      if (bytes.length !== meta.bytes) throw new ErroDados('hash', `${nome}: ${bytes.length} bytes, esperados ${meta.bytes}`);
      const hex = await sha256Hex(bytes);
      if (hex && hex !== meta.sha256) throw new ErroDados('hash', `${nome}: sha256 divergente`);
      conteudo[nome] = bytes;
    }
    const json = (nome) => JSON.parse(new TextDecoder().decode(conteudo[nome]));
    const palavras = json('vocab.json');
    const q = new Int8Array(conteudo['vetores.i8'].buffer, conteudo['vetores.i8'].byteOffset, conteudo['vetores.i8'].byteLength);
    const esc = conteudo['escalas.f32'];
    const escalas = new Float32Array(esc.byteLength / 4);
    new Uint8Array(escalas.buffer).set(esc); // cópia alinhada, little-endian como o pipeline grava
    if (!Array.isArray(palavras) || q.length !== palavras.length * DIMENSOES || escalas.length !== palavras.length) throw new ErroDados('manifesto', 'tamanhos dos arquivos não batem');
    return new Vetores({ palavras, q, escalas, glossario: json('glossario.json'), presets: json('presets.json'), manifesto, sig });
  }

  // ---------------------------------------------------------------- acesso

  /** Índice da palavra (minúsculas, sem acentos, sem espaços nas pontas) ou -1. */
  indice(palavra) {
    const p = normalizarPalavra(palavra);
    if (!p) return -1;
    return this._indice.get(p) ?? -1;
  }

  palavra(i) { return this.palavras[i]; }

  /** Vetor desquantizado (Float32Array de 50). */
  vetor(i) {
    const out = new Float32Array(DIMENSOES);
    const s = this.escalas[i];
    const o = i * DIMENSOES;
    for (let k = 0; k < DIMENSOES; k++) out[k] = this.q[o + k] * s;
    return out;
  }

  matriz(indices) { return indices.map((i) => this.vetor(i)); }

  norma(i) {
    if (!this._normas) {
      this._normas = new Float32Array(this.n);
      for (let j = 0; j < this.n; j++) {
        const o = j * DIMENSOES;
        let soma = 0;
        for (let k = 0; k < DIMENSOES; k++) soma += this.q[o + k] * this.q[o + k];
        this._normas[j] = Math.sqrt(soma) * this.escalas[j];
      }
    }
    return this._normas[i];
  }

  // ---------------------------------------------------------------- medidas

  /** Produto escalar de um vetor float com a palavra i (direto nos int8). */
  _dot(v, i) {
    const o = i * DIMENSOES;
    let soma = 0;
    for (let k = 0; k < DIMENSOES; k++) soma += v[k] * this.q[o + k];
    return soma * this.escalas[i];
  }

  cossenoVetor(v, i) {
    let nv = 0;
    for (let k = 0; k < DIMENSOES; k++) nv += v[k] * v[k];
    nv = Math.sqrt(nv);
    const ni = this.norma(i);
    if (nv === 0 || ni === 0) return 0;
    return this._dot(v, i) / (nv * ni);
  }

  cosseno(i, j) { return this.cossenoVetor(this.vetor(i), j); }

  /** Os n vizinhos mais próximos (cosseno) de um vetor, sem os índices excluídos. */
  vizinhos(v, n = 10, excluir = []) {
    const fora = new Set(excluir);
    let nv = 0;
    for (let k = 0; k < DIMENSOES; k++) nv += v[k] * v[k];
    nv = Math.sqrt(nv);
    if (nv === 0) return [];
    this.norma(0);
    const melhores = []; // lista ordenada decrescente, tamanho ≤ n
    for (let i = 0; i < this.n; i++) {
      if (fora.has(i)) continue;
      const ni = this._normas[i];
      if (ni === 0) continue;
      const cos = this._dot(v, i) / (nv * ni);
      if (melhores.length === n && cos <= melhores[n - 1].cos) continue;
      let pos = melhores.length;
      while (pos > 0 && melhores[pos - 1].cos < cos) pos--;
      melhores.splice(pos, 0, { i, palavra: this.palavras[i], cos });
      if (melhores.length > n) melhores.pop();
    }
    return melhores;
  }

  /** a − b + c (ex.: king − man + woman) e os n vizinhos do resultado, fora de a, b e c. */
  analogia(a, b, c, n = 5) {
    const va = this.vetor(a); const vb = this.vetor(b); const vc = this.vetor(c);
    const vetor = new Float32Array(DIMENSOES);
    for (let k = 0; k < DIMENSOES; k++) vetor[k] = va[k] - vb[k] + vc[k];
    return { vetor, resultados: this.vizinhos(vetor, n, [a, b, c]) };
  }

  /** Direção w1 − w2 (ex.: cats − cat). */
  direcao(w1, w2) {
    const v1 = this.vetor(w1); const v2 = this.vetor(w2);
    const d = new Float32Array(DIMENSOES);
    for (let k = 0; k < DIMENSOES; k++) d[k] = v1[k] - v2[k];
    return d;
  }

  /** Produto escalar de uma direção com cada palavra pedida, em ordem decrescente. */
  produtoEscalar(d, indices) {
    return indices.map((i) => ({ i, palavra: this.palavras[i], valor: this._dot(d, i) })).sort((x, y) => y.valor - x.valor);
  }

  // ---------------------------------------------------------------- sugestões

  _ordenadasAlfabeticamente() {
    if (!this._ordenadas) this._ordenadas = [...this.palavras].sort();
    return this._ordenadas;
  }

  /** Sugestões para um texto: por prefixo (ordem alfabética) e, se faltar, por distância de edição ≤ 2 entre as mais frequentes. */
  sugerir(texto, n = 5) {
    const p = normalizarPalavra(texto);
    if (!p) return [];
    const saida = [];
    const ord = this._ordenadasAlfabeticamente();
    let lo = 0; let hi = ord.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ord[mid] < p) lo = mid + 1; else hi = mid; }
    for (let k = lo; k < ord.length && saida.length < n && ord[k].startsWith(p); k++) saida.push(ord[k]);
    if (saida.length < n) {
      const limite = Math.min(this.n, LIMITE_APROXIMACAO);
      const perto = [];
      for (let i = 0; i < limite; i++) {
        const w = this.palavras[i];
        if (saida.includes(w)) continue;
        const d = distanciaAte(p, w, 2);
        if (d <= 2) perto.push({ w, d, i });
      }
      perto.sort((x, y) => x.d - y.d || x.i - y.i);
      for (const x of perto) { if (saida.length >= n) break; saida.push(x.w); }
    }
    return saida;
  }

  /** Palavra em outro idioma → palavra inglesa do glossário ({en, traduzida: true}) ou null (inclusive se já for inglesa ou desconhecida). */
  sugerirTraduzindo(texto, idioma) {
    const p = normalizarPalavra(texto);
    if (!p || this._indice.has(p)) return null;
    if (!this._glossarioInverso) {
      this._glossarioInverso = new Map();
      for (const [en, trad] of Object.entries(this.glossario)) {
        for (const [idi, valor] of Object.entries(trad ?? {})) {
          const chave = `${idi}|${normalizarPalavra(valor)}`;
          if (!this._glossarioInverso.has(chave)) this._glossarioInverso.set(chave, en);
        }
      }
    }
    const en = this._glossarioInverso.get(`${idioma}|${p}`);
    return en && this._indice.has(en) ? { en, traduzida: true } : null;
  }
}
