// Conteúdo didático próprio (conteudo/<idioma>.js): seis seções nos seis idiomas, mesma ordem e estrutura, "Experimente" com ações válidas,
// referências só acadêmicas (GloVe 2014, word2vec 2013, Transformer 2017), NENHUMA menção a vídeo ou canal, trechos para a nuvem limitados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { IDIOMAS } from '../src/llms/js/i18n/index.js';
import { CONTEUDOS, IDS_SECOES, REFERENCIAS, secao, secoes, trechosPara } from '../src/llms/js/conteudo/index.js';

const ACOES = new Set(['preset', 'analogia', 'direcao', 'modo', 'irPara']);

test('seis seções, nos seis idiomas, com os mesmos ids na mesma ordem', () => {
  assert.deepEqual(IDS_SECOES, ['modelo', 'tokens', 'embeddings', 'atencao', 'camadas', 'softmax']);
  assert.deepEqual(Object.keys(CONTEUDOS).sort(), [...IDIOMAS].sort());
  for (const idioma of IDIOMAS) {
    assert.deepEqual(secoes(idioma).map((s) => s.id), IDS_SECOES, idioma);
    assert.ok(['pendente', 'humana'].includes(CONTEUDOS[idioma].revisao), idioma);
  }
});

test('cada seção tem título, resumo, ≥ 3 parágrafos, ≥ 1 "Experimente" com ação conhecida e referências de ids permitidos', () => {
  for (const idioma of IDIOMAS) {
    for (const s of secoes(idioma)) {
      const onde = `${idioma}/${s.id}`;
      assert.ok(s.titulo.trim() && s.resumo.trim(), `${onde}: título/resumo`);
      assert.ok(Array.isArray(s.paragrafos) && s.paragrafos.length >= 3 && s.paragrafos.every((p) => typeof p === 'string' && p.trim().length > 40), `${onde}: parágrafos`);
      assert.ok(Array.isArray(s.experimente) && s.experimente.length >= 1, `${onde}: experimente`);
      for (const e of s.experimente) {
        assert.ok(e.texto.trim(), `${onde}: texto do experimente`);
        assert.ok(ACOES.has(e.acao?.tipo), `${onde}: ação ${e.acao?.tipo}`);
        if (e.acao.tipo === 'preset') assert.ok(['realeza', 'capitais', 'plural', 'familia', 'cores', 'numeros', 'lideres'].includes(e.acao.id), `${onde}: preset ${e.acao.id}`);
        if (e.acao.tipo === 'analogia') assert.ok(e.acao.a && e.acao.b && e.acao.c, `${onde}: analogia incompleta`);
        if (e.acao.tipo === 'direcao') assert.ok(e.acao.w1 && e.acao.w2, `${onde}: direção incompleta`);
      }
      assert.ok(Array.isArray(s.referencias) && s.referencias.length >= 1, `${onde}: referências`);
      for (const r of s.referencias) assert.ok(REFERENCIAS[r], `${onde}: referência desconhecida ${r}`);
    }
  }
  assert.deepEqual(Object.keys(REFERENCIAS).sort(), ['glove2014', 'transformer2017', 'word2vec2013']);
});

test('nenhuma menção a vídeo, canal ou YouTube em nenhum idioma; o resumo da seção de embeddings cita a aritmética de vetores', () => {
  const proibido = /youtube|3blue1brown|3b1b|v[ií]deo|video|视频|youtu\.be|canal do|channel/i;
  for (const idioma of IDIOMAS) {
    const texto = JSON.stringify(CONTEUDOS[idioma]);
    assert.ok(!proibido.test(texto), `${idioma}: menção proibida: ${proibido.exec(texto)?.[0]}`);
  }
  assert.match(secao('en', 'embeddings').resumo + secao('en', 'embeddings').paragrafos.join(' '), /king/i);
  assert.match(secao('pt-BR', 'softmax').paragrafos.join(' '), /e\^|exp|T/, 'fórmula da softmax com temperatura em texto');
});

test('trechosPara: ids válidos viram {id "<idioma>:<secao>", texto ≤ 2000 caracteres}; ids desconhecidos são ignorados; no máximo 3', () => {
  const tr = trechosPara('pt-BR', ['embeddings', 'xpto', 'tokens', 'softmax', 'modelo']);
  assert.equal(tr.length, 3);
  assert.deepEqual(tr.map((x) => x.id), ['pt-BR:embeddings', 'pt-BR:tokens', 'pt-BR:softmax']);
  for (const x of tr) assert.ok(x.texto.length > 100 && x.texto.length <= 2000, x.id);
  assert.deepEqual(trechosPara('zh', []), []);
  assert.equal(trechosPara('zh', ['atencao'])[0].id, 'zh:atencao');
  assert.equal(secao('fr', 'nao-existe'), null);
});
