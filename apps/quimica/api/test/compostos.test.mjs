// Resolução do `composto` no índice do pacote (api/_lib/compostos.js): CID exato, variantes com artigo, sugestões e índice real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveBusca, criarResolvedor, distancia, resolvedorPadrao, resolverComposto, MAX_SUGESTOES } from '../_lib/compostos.js';

const INDICE_MINI = {
  porCid: { 962: 'lote-001', 1118: 'lote-001', 5234: 'lote-002', 24602: 'lote-003', 702: 'lote-001' },
  nomes: [['acido sulfurico', 1118], ['agua', 962], ['etanol', 702], ['h2o', 962], ['h2o', 24602], ['h2so4', 1118], ['nacl', 5234], ['sal de cozinha', 5234]],
  nomesPorIdioma: { en: [['water', 962], ['table salt', 5234]], fr: [['eau', 962]], de: [['Wasser', 962]] },
};
const R = criarResolvedor(INDICE_MINI);

test('chaveBusca: minúsculas, sem acento, sub/sobrescritos e pontuação final', () => {
  assert.equal(chaveBusca('  Ácido  Sulfúrico? '), 'acido sulfurico');
  assert.equal(chaveBusca('H₂SO₄'), 'h2so4');
  assert.equal(chaveBusca('NaCl.'), 'nacl');
});

test('resolve nome, fórmula, apelido e nome em outro idioma; chave repetida fica com a primeira ocorrência', () => {
  assert.deepEqual(R.resolver('água'), { cid: '962', nome: 'agua' });
  assert.deepEqual(R.resolver('H2O'), { cid: '962', nome: 'h2o' });
  assert.deepEqual(R.resolver('H₂SO₄'), { cid: '1118', nome: 'h2so4' });
  assert.deepEqual(R.resolver('sal de cozinha'), { cid: '5234', nome: 'sal de cozinha' });
  assert.deepEqual(R.resolver('Water'), { cid: '962', nome: 'water' });
  assert.deepEqual(R.resolver('wasser'), { cid: '962', nome: 'wasser' });
});

test('aceita artigo ou preposição à frente, como o modelo às vezes copia', () => {
  assert.equal(R.resolver('a água').cid, '962');
  assert.equal(R.resolver('do ácido sulfúrico').cid, '1118');
  assert.equal(R.resolver('the water').cid, '962');
  assert.equal(R.resolver("l'eau").cid, '962');
});

test('sem acerto: sugestões por distância de edição ou prefixo, uma por CID, no máximo 3', () => {
  const r = R.resolver('acido sulfurco'); // letra faltando
  assert.equal(r.cid, null);
  assert.deepEqual(r.sugestoes.map((s) => s.cid), ['1118']);
  const p = R.resolver('etan'); // prefixo
  assert.equal(p.sugestoes[0].nome, 'etanol');
  const nada = R.resolver('xptoquimico');
  assert.deepEqual(nada, { cid: null, sugestoes: [] });
  assert.ok(R.resolver('sal').sugestoes.length <= MAX_SUGESTOES);
});

test('texto vazio ou não textual não dá chave', () => {
  assert.equal(R.resolver(''), null);
  assert.equal(R.resolver('???'), null);
  assert.equal(R.resolver(42), null);
});

test('distancia limitada', () => {
  assert.equal(distancia('agua', 'agua', 2), 0);
  assert.equal(distancia('agua', 'aguia', 2), 1);
  assert.equal(distancia('agua', 'etanol', 2), 3); // passou do limite: limite + 1
});

test('índice real do pacote: água, ácido sulfúrico, soda cáustica e sal resolvem; erro de digitação sugere', () => {
  const real = resolvedorPadrao();
  if (!real) {
    assert.ok(true, 'índice ausente nesta máquina');
    return;
  }
  assert.ok(real.tamanho > 10_000, `índice pequeno: ${real.tamanho}`);
  assert.equal(real.resolver('água').cid, '962');
  assert.equal(real.resolver('H2O').cid, '962');
  assert.equal(real.resolver('ácido sulfúrico').cid, '1118');
  assert.equal(real.resolver('soda cáustica').cid, '14798');
  assert.equal(real.resolver('sal de cozinha').cid, '5234');
  const erro = real.resolver('acido sulfurioc');
  assert.equal(erro.cid, null);
  assert.ok(erro.sugestoes.some((s) => s.cid === '1118'), JSON.stringify(erro));
  assert.deepEqual(resolverComposto('agua'), { composto: { cid: '962', nome: 'agua' } });
});

test('sem índice legível a API segue sem resolução', () => {
  const r = resolvedorPadrao(() => {
    throw new Error('sem arquivo');
  });
  // já carregado nesta execução: devolve o padrão em cache (não lança); o contrato é "nunca lança"
  assert.ok(r === null || typeof r.resolver === 'function');
  assert.equal(resolverComposto('agua', null), null);
});
