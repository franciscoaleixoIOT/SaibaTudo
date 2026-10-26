// Projeção de vetores de 50 dimensões em 3 eixos (puro, sem DOM). Dois modos:
//  - 'dimensoes': os 3 eixos são dimensões ORIGINAIS do GloVe, as de maior variância entre as palavras escolhidas (didático: cada eixo é uma
//    coordenada real do vetor, "d17"). Com uma só palavra, as 3 coordenadas de maior valor absoluto.
//  - 'pca': as 3 componentes principais das palavras escolhidas (iteração de potência com deflação), que preservam melhor as distâncias;
//    cada eixo traz a variância explicada (%). Exige 3 ou mais palavras; com menos cai para 'dimensoes' com aviso.
export const MODOS = ['dimensoes', 'pca'];
const MAX_ITER = 200;
const TOL = 1e-9;

/** Variância populacional por dimensão. */
export function variancias(M) {
  if (!M.length) return new Float64Array(0);
  const d = M[0].length;
  const media = new Float64Array(d);
  for (const v of M) for (let k = 0; k < d; k++) media[k] += v[k];
  for (let k = 0; k < d; k++) media[k] /= M.length;
  const out = new Float64Array(d);
  for (const v of M) for (let k = 0; k < d; k++) { const t = v[k] - media[k]; out[k] += t * t; }
  for (let k = 0; k < d; k++) out[k] /= M.length;
  return out;
}

/** Três maiores índices de `valores` (decrescente; empate pelo menor índice). */
function tresMaiores(valores) {
  return [...valores].map((v, k) => [v, k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 3).map(([, k]) => k);
}

/** Os 3 índices de dimensão com maior variância entre as palavras; uma palavra → maior |valor|; nenhuma → []. */
export function eixosPorVariancia(M) {
  if (!M.length) return [];
  if (M.length === 1) return tresMaiores([...M[0]].map(Math.abs));
  return tresMaiores(variancias(M));
}

/** Autovetor dominante de uma matriz simétrica (iteração de potência). Devolve { vetor, valor }. */
function potencia(C, d, semente) {
  let v = new Float64Array(d);
  for (let k = 0; k < d; k++) v[k] = 1 / Math.sqrt(d) + 1e-3 * Math.sin(semente + k); // chute determinístico
  let valor = 0;
  for (let it = 0; it < MAX_ITER; it++) {
    const w = new Float64Array(d);
    for (let r = 0; r < d; r++) { let s = 0; const linha = C[r]; for (let c = 0; c < d; c++) s += linha[c] * v[c]; w[r] = s; }
    let norma = 0;
    for (let k = 0; k < d; k++) norma += w[k] * w[k];
    norma = Math.sqrt(norma);
    if (norma < 1e-15) return { vetor: v, valor: 0 };
    for (let k = 0; k < d; k++) w[k] /= norma;
    let delta = 0;
    for (let k = 0; k < d; k++) delta += Math.abs(w[k] - v[k]);
    v = w;
    valor = norma;
    if (delta < TOL) break;
  }
  // sinal fixo: a maior componente em módulo fica positiva (resultado determinístico)
  let imax = 0;
  for (let k = 1; k < d; k++) if (Math.abs(v[k]) > Math.abs(v[imax])) imax = k;
  if (v[imax] < 0) for (let k = 0; k < d; k++) v[k] = -v[k];
  return { vetor: v, valor };
}

/** PCA com 3 componentes: coordenadas centradas, autovalores e variância explicada (%). Exige M.length >= 3. */
export function pca3(M) {
  const n = M.length;
  if (n < 3) throw new RangeError('pca3 exige 3 ou mais vetores');
  const d = M[0].length;
  const media = new Float64Array(d);
  for (const v of M) for (let k = 0; k < d; k++) media[k] += v[k];
  for (let k = 0; k < d; k++) media[k] /= n;
  const X = M.map((v) => { const c = new Float64Array(d); for (let k = 0; k < d; k++) c[k] = v[k] - media[k]; return c; });
  // covariância d × d (denominador n − 1)
  const C = Array.from({ length: d }, () => new Float64Array(d));
  for (const x of X) for (let r = 0; r < d; r++) { const xr = x[r]; if (xr === 0) continue; const linha = C[r]; for (let c = 0; c < d; c++) linha[c] += xr * x[c]; }
  let traco = 0;
  for (let r = 0; r < d; r++) { for (let c = 0; c < d; c++) C[r][c] /= (n - 1); traco += C[r][r]; }
  const componentes = [];
  const autovalores = [];
  for (let comp = 0; comp < 3; comp++) {
    const { vetor, valor } = potencia(C, d, comp);
    componentes.push(vetor);
    autovalores.push(valor);
    // deflação: C ← C − λ v vᵀ
    for (let r = 0; r < d; r++) for (let c = 0; c < d; c++) C[r][c] -= valor * vetor[r] * vetor[c];
  }
  const coords = X.map((x) => {
    const p = [0, 0, 0];
    for (let comp = 0; comp < 3; comp++) { let s = 0; const v = componentes[comp]; for (let k = 0; k < d; k++) s += x[k] * v[k]; p[comp] = s; }
    return { x: p[0], y: p[1], z: p[2] };
  });
  const explicada = autovalores.map((l) => (traco > 0 ? (100 * l) / traco : 0));
  return { coords, autovalores, explicada, componentes };
}

/**
 * Projeta as palavras (M: Float32Array[50][]) em 3 eixos.
 * @returns {{ pontos: {x,y,z}[], eixos: {rotulo: string, indice?: number, explicada?: number}[], modo: 'dimensoes'|'pca', aviso?: 'pcaPoucasPalavras' }}
 */
export function projetar(M, modo = 'dimensoes') {
  if (!M.length) return { pontos: [], eixos: [], modo: 'dimensoes' };
  let aviso;
  if (modo === 'pca' && M.length < 3) { modo = 'dimensoes'; aviso = 'pcaPoucasPalavras'; }
  if (modo === 'pca') {
    const r = pca3(M);
    return { pontos: r.coords, eixos: r.explicada.map((e, k) => ({ rotulo: `PC${k + 1}`, explicada: e })), modo };
  }
  const idx = eixosPorVariancia(M);
  const pontos = M.map((v) => ({ x: v[idx[0]], y: v[idx[1]], z: v[idx[2]] }));
  const saida = { pontos, eixos: idx.map((i) => ({ rotulo: `d${i}`, indice: i })), modo: 'dimensoes' };
  if (aviso) saida.aviso = aviso;
  return saida;
}
