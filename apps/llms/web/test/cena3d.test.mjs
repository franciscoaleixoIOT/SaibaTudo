// Cena 3D em Canvas 2D (cena3d.js): só a matemática pura é testada em Node (rotação, projeção, escala para caber, ordem por profundidade,
// posição de rótulo sem colisão). A classe Cena3D usa DOM/Canvas e é conferida no navegador (e2e e demo manual).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ajustarEscala, aplicar, ordenarPorProfundidade, posicaoRotulo, rotacao } from '../src/llms/js/cena3d.js';

const perto = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const pertoP = (p, q) => { for (const k of ['x', 'y', 'z']) assert.ok(perto(p[k], q[k]), `${k}: ${p[k]} ≠ ${q[k]}`); };

test('rotacao(0, 0) é a identidade (matriz 3×3 em ordem de linhas)', () => {
  assert.deepEqual([...rotacao(0, 0)], [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  pertoP(aplicar(rotacao(0, 0), { x: 1, y: 2, z: 3 }), { x: 1, y: 2, z: 3 });
});

test('rotacao: yaw de 90° leva o eixo x para a profundidade (−z) e pitch de 90° leva y para a profundidade', () => {
  pertoP(aplicar(rotacao(Math.PI / 2, 0), { x: 1, y: 0, z: 0 }), { x: 0, y: 0, z: -1 });
  pertoP(aplicar(rotacao(Math.PI / 2, 0), { x: 0, y: 1, z: 0 }), { x: 0, y: 1, z: 0 });
  pertoP(aplicar(rotacao(0, Math.PI / 2), { x: 0, y: 1, z: 0 }), { x: 0, y: 0, z: 1 });
  // rotações preservam o comprimento
  const p = aplicar(rotacao(0.7, -0.4), { x: 1, y: 2, z: 3 });
  assert.ok(perto(Math.hypot(p.x, p.y, p.z), Math.hypot(1, 2, 3)));
});

test('ajustarEscala: sem pontos ou sem área devolve 1 (nunca NaN/Infinity); com pontos usa a margem e o maior raio', () => {
  assert.equal(ajustarEscala([], 300, 200), 1);
  assert.equal(ajustarEscala([{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }], 0, 0), 1);
  assert.equal(ajustarEscala([{ x: 0, y: 0, z: 0 }], 400, 400), 1, 'todos na origem: escala neutra');
  assert.equal(ajustarEscala([{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }], 400, 400), (400 - 2 * 48) / 2);
  assert.equal(ajustarEscala([{ x: 0, y: 2, z: 0 }], 400, 300, 50), (300 - 100) / 2 / 2, 'o lado menor manda');
  for (const v of [ajustarEscala([{ x: NaN, y: 0, z: 0 }], 100, 100)]) assert.ok(Number.isFinite(v) && v > 0);
});

test('ordenarPorProfundidade: do mais distante (menor z) ao mais próximo, estável', () => {
  const itens = [{ id: 'a', z: 0.5 }, { id: 'b', z: -1 }, { id: 'c', z: 0.5 }, { id: 'd', z: 2 }];
  assert.deepEqual(ordenarPorProfundidade(itens).map((i) => i.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(itens.map((i) => i.id), ['a', 'b', 'c', 'd'], 'não altera a lista original');
});

test('posicaoRotulo: desloca para baixo em passos de 14 px até não colidir com os retângulos ocupados (no máximo 4 tentativas)', () => {
  const livre = posicaoRotulo({ x: 10, y: 10, w: 40, h: 12 }, []);
  assert.deepEqual(livre, { x: 10, y: 10 });
  const ocupado = [{ x: 0, y: 0, w: 60, h: 20 }];
  assert.deepEqual(posicaoRotulo({ x: 10, y: 10, w: 40, h: 12 }, ocupado), { x: 10, y: 24 });
  const muitos = [0, 14, 28, 42, 56].map((dy) => ({ x: 0, y: dy, w: 60, h: 14 }));
  assert.deepEqual(posicaoRotulo({ x: 10, y: 0, w: 40, h: 12 }, muitos), { x: 10, y: 56 }, 'desiste após 4 deslocamentos');
});
