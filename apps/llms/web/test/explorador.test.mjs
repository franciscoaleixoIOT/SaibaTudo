// Estado puro do explorador (explorador.js): palavras escolhidas (sem repetição, até 40), modo de projeção, diferenças, analogia, direção,
// cena derivada (pontos, eixos, setas, tabela) e estado no endereço (?palavras=…&modo=…), saneado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Vetores } from '../src/llms/js/data.js';
import { MAX_PALAVRAS, adicionar, alternarModo, cenaDe, criarEstado, deUrl, definirAnalogia, definirDirecao, limpar, paraUrl, remover } from '../src/llms/js/explorador.js';

// Vetores sintéticos (sem fixture): 60 palavras, 50 dimensões, int8 com escala 1/127 por vetor.
const PALAVRAS = ['king', 'queen', 'man', 'woman', 'cat', 'cats', 'dog', 'dogs', ...Array.from({ length: 52 }, (_, k) => `w${k}`)];
const q = new Int8Array(PALAVRAS.length * 50);
for (let i = 0; i < PALAVRAS.length; i++) for (let k = 0; k < 50; k++) q[i * 50 + k] = ((i * 37 + k * 11) % 255) - 127;
const V = new Vetores({ palavras: PALAVRAS, q, escalas: new Float32Array(PALAVRAS.length).fill(1 / 127), glossario: {}, presets: {}, manifesto: { version: 'teste' }, sig: { estado: 'verificada' } });
const K = V.indice('king'); const Q = V.indice('queen'); const M = V.indice('man'); const W = V.indice('woman');

test('criarEstado: vazio, modo dimensoes, sem diferenças, analogia e direção', () => {
  assert.deepEqual(criarEstado(), { palavras: [], modo: 'dimensoes', diferencas: false, destaque: null, analogia: null, direcao: null });
  assert.equal(MAX_PALAVRAS, 40);
});

test('adicionar ignora repetidos e índices inválidos (-1), recusa acima de 40 e não altera o estado original', () => {
  const e0 = criarEstado();
  const r = adicionar(e0, [K, K, -1, Q]);
  assert.deepEqual(r.estado.palavras, [K, Q]);
  assert.deepEqual(r.recusadas, [-1]);
  assert.deepEqual(e0.palavras, [], 'imutável');
  const muitos = Array.from({ length: 41 }, (_, k) => k + 8);
  const r2 = adicionar(e0, muitos);
  assert.equal(r2.estado.palavras.length, 40);
  assert.deepEqual(r2.recusadas, [48]);
  const r3 = adicionar(r.estado, [Q, M]);
  assert.deepEqual(r3.estado.palavras, [K, Q, M], 'repetido com o que já estava é ignorado em silêncio');
  assert.deepEqual(r3.recusadas, []);
});

test('remover, limpar e alternarModo', () => {
  const e = adicionar(criarEstado(), [K, Q, M]).estado;
  assert.deepEqual(remover(e, Q).palavras, [K, M]);
  assert.deepEqual(remover({ ...e, destaque: Q }, Q).destaque, null, 'remover a destacada limpa o destaque');
  assert.deepEqual(limpar(e), criarEstado());
  assert.equal(alternarModo(e).modo, 'pca');
  assert.equal(alternarModo(alternarModo(e)).modo, 'dimensoes');
});

test('definirAnalogia exige a ≠ c e índices válidos; definirDirecao guarda w1, w2 e a lista', () => {
  const e = criarEstado();
  assert.equal(definirAnalogia(e, K, M, K).analogia, null);
  assert.equal(definirAnalogia(e, K, M, -1).analogia, null);
  assert.deepEqual(definirAnalogia(e, K, M, W).analogia, { a: K, b: M, c: W });
  assert.deepEqual(definirDirecao(e, V.indice('cats'), V.indice('cat'), [V.indice('dog'), V.indice('dogs')]).direcao, { w1: V.indice('cats'), w2: V.indice('cat'), lista: [V.indice('dog'), V.indice('dogs')] });
});

test('cenaDe: uma palavra → 1 ponto com rótulo e eixos de maior |valor|; tabela com as 3 coordenadas; vazio → cena vazia', () => {
  const e = adicionar(criarEstado(), [K]).estado;
  const c = cenaDe(e, V);
  assert.equal(c.pontos.length, 1);
  assert.equal(c.pontos[0].rotulo, 'king');
  assert.equal(c.eixos.length, 3);
  assert.deepEqual(c.setas, []);
  assert.equal(c.tabela.length, 1);
  assert.equal(c.tabela[0].palavra, 'king');
  assert.equal(c.tabela[0].coords.length, 3);
  assert.equal(c.modo, 'dimensoes');
  assert.deepEqual(cenaDe(criarEstado(), V), { pontos: [], eixos: [], setas: [], tabela: [], modo: 'dimensoes' });
});

test('cenaDe com analogia: ponto virtual "?" a mais e duas setas (b→a e c→?); com diferenças: setas entre pares consecutivos', () => {
  let e = adicionar(criarEstado(), [K, Q, M, W]).estado;
  e = definirAnalogia(e, K, M, W);
  const c = cenaDe(e, V);
  assert.equal(c.pontos.length, 5);
  assert.equal(c.pontos[4].rotulo, '?');
  assert.equal(c.setas.length, 2);
  assert.deepEqual(c.setas[0], { de: 2, para: 0 }, 'man → king');
  assert.deepEqual(c.setas[1], { de: 3, para: 4 }, 'woman → ?');
  const d = cenaDe({ ...adicionar(criarEstado(), [K, Q, M, W]).estado, diferencas: true }, V);
  assert.deepEqual(d.setas, [{ de: 0, para: 1 }, { de: 2, para: 3 }]);
  const pca = cenaDe({ ...adicionar(criarEstado(), [K, Q]).estado, modo: 'pca' }, V);
  assert.equal(pca.aviso, 'pcaPoucasPalavras');
  assert.equal(pca.modo, 'dimensoes');
});

test('URL: paraUrl grava palavras e modo; deUrl saneia (só palavras do vocabulário, ≤ 40, modo válido) e é estável', () => {
  const e = { ...adicionar(criarEstado(), [K, Q]).estado, modo: 'pca' };
  assert.equal(paraUrl(e, V), 'palavras=king,queen&modo=pca');
  assert.equal(paraUrl(criarEstado(), V), '');
  const lido = deUrl(new URLSearchParams('palavras=king,<script>,zzzz,queen,king&modo=x'), V);
  assert.deepEqual(lido.palavras, [K, Q]);
  assert.equal(lido.modo, 'dimensoes');
  const muitas = deUrl(new URLSearchParams(`palavras=${PALAVRAS.join(',')}`), V);
  assert.equal(muitas.palavras.length, 40);
  assert.equal(paraUrl(deUrl(new URLSearchParams(paraUrl(e, V)), V), V), paraUrl(e, V));
  assert.deepEqual(deUrl(new URLSearchParams(''), V), criarEstado());
});
