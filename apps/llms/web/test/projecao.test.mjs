// Projeção em 3 eixos (projecao.js, puro): variâncias por dimensão, escolha das 3 dimensões de maior variância, PCA por iteração de potência
// com deflação (3 componentes, variância explicada) e `projetar(M, modo)` com rótulos e aviso quando há poucas palavras para o PCA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { eixosPorVariancia, pca3, projetar, variancias } from '../src/llms/js/projecao.js';

const f32 = (a) => Float32Array.from(a);
const zeros = (n) => new Array(n).fill(0);
const perto = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('variancias: populacional por dimensão', () => {
  assert.deepEqual([...variancias([f32([1, 2, 3]), f32([3, 2, 1])])].map((v) => Number(v.toFixed(6))), [1, 0, 1]);
  assert.deepEqual([...variancias([])], []);
});

test('eixosPorVariancia: as 3 dimensões (de 50) que mais variam, em ordem decrescente; empate pelo menor índice', () => {
  const linhas = [];
  for (let i = 0; i < 6; i++) {
    const v = zeros(50);
    v[7] = i * 3; // variância maior
    v[21] = i * 2;
    v[40] = i; // menor das três
    v[3] = 0.5; // constante: variância 0
    linhas.push(f32(v));
  }
  assert.deepEqual(eixosPorVariancia(linhas), [7, 21, 40]);
  const empate = [f32(zeros(50)), f32(zeros(50).map((_, k) => (k === 10 || k === 30 || k === 45 || k === 48 ? 1 : 0)))];
  assert.deepEqual(eixosPorVariancia(empate), [10, 30, 45]);
});

test('eixosPorVariancia com uma palavra: os 3 índices de maior valor absoluto; sem palavras: []', () => {
  const v = zeros(50); v[4] = -9; v[12] = 7; v[33] = 8; v[0] = 1;
  assert.deepEqual(eixosPorVariancia([f32(v)]), [4, 33, 12]);
  assert.deepEqual(eixosPorVariancia([]), []);
});

test('pca3: dados num plano (a·u + b·w + ruído) → duas componentes explicam > 99 %, autovalores decrescentes, coordenadas centradas', () => {
  // u e w ortogonais em 50 dimensões
  const u = zeros(50); u[0] = 1;
  const w = zeros(50); w[1] = 1;
  let semente = 42;
  const rnd = () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296 - 0.5; };
  const M = [];
  for (let i = 0; i < 100; i++) {
    const a = rnd() * 10; const b = rnd() * 4;
    M.push(f32(u.map((_, k) => a * u[k] + b * w[k] + rnd() * 1e-3 + (k === 5 ? 3 : 0))));
  }
  const r = pca3(M);
  assert.equal(r.coords.length, 100);
  assert.ok(r.autovalores[0] >= r.autovalores[1] && r.autovalores[1] >= r.autovalores[2] && r.autovalores[2] >= 0);
  assert.ok(r.explicada[0] + r.explicada[1] > 99, `explicada ${r.explicada}`);
  assert.ok(r.explicada[0] + r.explicada[1] + r.explicada[2] <= 100.000001);
  for (const eixo of ['x', 'y', 'z']) {
    const media = r.coords.reduce((s, p) => s + p[eixo], 0) / r.coords.length;
    assert.ok(perto(media, 0, 1e-4), `${eixo} centrado`);
  }
  // a primeira componente é a direção u (maior variância, amplitude 10): |coord x| acompanha |a|
  const ordenadoPorX = [...r.coords].sort((p, q) => p.x - q.x);
  assert.ok(ordenadoPorX[99].x - ordenadoPorX[0].x > ordenadoPorX[99].y - ordenadoPorX[0].y);
});

test('pca3: sinal fixado (maior componente do autovetor positiva) → resultado determinístico', () => {
  const M = [f32([1, 0, 0, ...zeros(47)]), f32([2, 0, 0, ...zeros(47)]), f32([4, 0, 0, ...zeros(47)]), f32([-1, 0, 0, ...zeros(47)])];
  const r = pca3(M);
  const r2 = pca3(M);
  assert.deepEqual(r.coords, r2.coords);
  assert.ok(r.coords[2].x > r.coords[3].x, 'a palavra com maior valor em d0 fica com x maior');
});

test('projetar: modo dimensoes rotula d<índice>; modo pca rotula PC1..PC3 com variância explicada; pca com < 3 palavras cai para dimensões com aviso', () => {
  const linhas = [];
  for (let i = 0; i < 5; i++) { const v = zeros(50); v[7] = i; v[21] = i * 2; v[40] = -i; linhas.push(f32(v)); }
  const d = projetar(linhas, 'dimensoes');
  assert.equal(d.modo, 'dimensoes');
  assert.deepEqual(d.eixos.map((e) => e.rotulo), ['d21', 'd7', 'd40']);
  assert.deepEqual(d.eixos.map((e) => e.indice), [21, 7, 40]);
  assert.deepEqual(d.pontos[1], { x: 2, y: 1, z: -1 });
  assert.equal(d.aviso, undefined);
  const p = projetar(linhas, 'pca');
  assert.equal(p.modo, 'pca');
  assert.deepEqual(p.eixos.map((e) => e.rotulo), ['PC1', 'PC2', 'PC3']);
  assert.ok(p.eixos[0].explicada > 99);
  assert.equal(p.pontos.length, 5);
  const poucas = projetar(linhas.slice(0, 2), 'pca');
  assert.equal(poucas.modo, 'dimensoes');
  assert.equal(poucas.aviso, 'pcaPoucasPalavras');
  assert.deepEqual(projetar([], 'dimensoes'), { pontos: [], eixos: [], modo: 'dimensoes' });
});
