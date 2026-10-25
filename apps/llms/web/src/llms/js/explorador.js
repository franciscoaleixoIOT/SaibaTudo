// Estado PURO do explorador de embeddings (sem DOM): palavras escolhidas (índices do vocabulário, sem repetição, até MAX_PALAVRAS), modo de
// projeção ('dimensoes' | 'pca'), setas de diferenças, destaque, analogia (a − b + c) e direção (w1 − w2 contra uma lista). As funções devolvem
// um estado NOVO. `cenaDe` deriva o que a cena desenha (projecao.js) e a tabela de coordenadas; `paraUrl`/`deUrl` guardam o estado no endereço.
import { MODOS, projetar } from './projecao.js';

export const MAX_PALAVRAS = 40;

export function criarEstado() {
  return { palavras: [], modo: 'dimensoes', diferencas: false, destaque: null, analogia: null, direcao: null };
}

const valido = (i) => Number.isInteger(i) && i >= 0;

/** Acrescenta índices: ignora repetidos (inclusive entre si) e índices inválidos; acima de MAX_PALAVRAS recusa o excedente. */
export function adicionar(estado, indices) {
  const palavras = [...estado.palavras];
  const vistos = new Set(palavras);
  const recusadas = [];
  for (const i of indices) {
    if (!valido(i)) { recusadas.push(i); continue; }
    if (vistos.has(i)) continue;
    if (palavras.length >= MAX_PALAVRAS) { recusadas.push(i); continue; }
    vistos.add(i);
    palavras.push(i);
  }
  return { estado: { ...estado, palavras }, recusadas };
}

export function remover(estado, i) {
  return { ...estado, palavras: estado.palavras.filter((p) => p !== i), destaque: estado.destaque === i ? null : estado.destaque };
}

export const limpar = () => criarEstado();

export function alternarModo(estado) {
  return { ...estado, modo: estado.modo === 'pca' ? 'dimensoes' : 'pca' };
}

/** a − b + c: exige três índices válidos e a ≠ c (senão a analogia é removida). */
export function definirAnalogia(estado, a, b, c) {
  const ok = [a, b, c].every(valido) && a !== c;
  return { ...estado, analogia: ok ? { a, b, c } : null };
}

export function definirDirecao(estado, w1, w2, lista = []) {
  const ok = valido(w1) && valido(w2) && w1 !== w2;
  return { ...estado, direcao: ok ? { w1, w2, lista: lista.filter(valido) } : null };
}

/**
 * Cena derivada do estado: pontos (com rótulo), eixos, setas, tabela de coordenadas e modo efetivo (com aviso quando o PCA cai para dimensões).
 * Com analogia, acrescenta o ponto virtual a − b + c (rótulo "?") e as setas b→a e c→?. Com `diferencas`, setas entre pares consecutivos.
 */
export function cenaDe(estado, vetores) {
  const indices = estado.palavras;
  if (!indices.length) return { pontos: [], eixos: [], setas: [], tabela: [], modo: 'dimensoes' };
  const M = vetores.matriz(indices);
  const rotulos = indices.map((i) => vetores.palavra(i));
  let virtual = null;
  if (estado.analogia) {
    const { a, b, c } = estado.analogia;
    const va = vetores.vetor(a); const vb = vetores.vetor(b); const vc = vetores.vetor(c);
    virtual = new Float32Array(va.length);
    for (let k = 0; k < va.length; k++) virtual[k] = va[k] - vb[k] + vc[k];
    M.push(virtual);
    rotulos.push('?');
  }
  const proj = projetar(M, estado.modo);
  const pontos = proj.pontos.map((p, k) => ({ ...p, rotulo: rotulos[k], destaque: indices[k] === estado.destaque }));
  const setas = [];
  const pos = new Map(indices.map((i, k) => [i, k]));
  if (estado.analogia) {
    const { a, b, c } = estado.analogia;
    if (pos.has(a) && pos.has(b)) setas.push({ de: pos.get(b), para: pos.get(a) });
    if (pos.has(c)) setas.push({ de: pos.get(c), para: pontos.length - 1 });
  } else if (estado.diferencas) {
    for (let k = 0; k + 1 < indices.length; k += 2) setas.push({ de: k, para: k + 1 });
  }
  const tabela = indices.map((i, k) => ({ palavra: vetores.palavra(i), coords: [proj.pontos[k].x, proj.pontos[k].y, proj.pontos[k].z] }));
  const cena = { pontos, eixos: proj.eixos, setas, tabela, modo: proj.modo };
  if (proj.aviso) cena.aviso = proj.aviso;
  return cena;
}

/** "palavras=king,queen&modo=pca" (vazio sem palavras e no modo padrão). */
export function paraUrl(estado, vetores) {
  const p = new URLSearchParams();
  if (estado.palavras.length) p.set('palavras', estado.palavras.map((i) => vetores.palavra(i)).join(','));
  if (estado.modo !== 'dimensoes') p.set('modo', estado.modo);
  return p.toString().replace(/%2C/g, ',');
}

/** Lê o estado do endereço, saneando: só palavras do vocabulário (sem repetição, ≤ MAX_PALAVRAS) e modo conhecido. */
export function deUrl(params, vetores) {
  const base = criarEstado();
  const lista = String(params.get('palavras') ?? '').split(',').map((w) => vetores.indice(w)).filter((i) => i >= 0);
  const { estado } = adicionar(base, lista);
  const modo = params.get('modo');
  return { ...estado, modo: MODOS.includes(modo) ? modo : 'dimensoes' };
}
