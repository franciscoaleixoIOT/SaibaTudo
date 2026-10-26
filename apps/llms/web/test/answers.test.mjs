// Respostas montadas no aparelho (answers.js): cada intenção do NLU vira {titulo, blocos, acoes, sugestoes, origem}; rótulo de origem; histórico de
// perguntas (prefs). Nenhum texto fixo: tudo pelo catálogo do idioma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, CHAVE_TESTE_B64, fetchDeDisco } from './support.mjs';
import { Vetores } from '../src/llms/js/data.js';
import { criarEstado } from '../src/llms/js/explorador.js';
import { definirIdioma, t } from '../src/llms/js/i18n/index.js';
import { lexico } from '../src/llms/js/nlu/lex/index.js';
import { parse } from '../src/llms/js/nlu.js';
import { responder, rotuloOrigem } from '../src/llms/js/answers.js';
import { sanearHistorico } from '../src/llms/js/prefs.js';

const V = await Vetores.carregar({ fetch: fetchDeDisco(), base: BASE, chavePublicaB64: CHAVE_TESTE_B64 });
const R = (q, idioma = 'pt-BR', estado = criarEstado()) => {
  definirIdioma(idioma);
  const parsed = parse(q, lexico(idioma), { vetores: V, idioma });
  return responder(parsed, { vetores: V, estado, idioma });
};
const textos = (r) => r.blocos.map((b) => b.texto ?? (b.itens ?? []).join(' ') ?? '').join(' ');
const i = (w) => V.indice(w);

test('MOSTRAR: ação adicionar com índices, texto cita as palavras e rotula as traduzidas ("rei → king")', () => {
  const r = R('mostre rei e queen');
  assert.equal(r.intencao, 'MOSTRAR');
  assert.deepEqual(r.acoes, [{ tipo: 'adicionar', indices: [i('king'), i('queen')] }]);
  assert.ok(textos(r).includes('king') && textos(r).includes('queen'));
  assert.ok(textos(r).includes('rei → king'), 'tradução rotulada');
  assert.equal(r.origem, 'LOCAL');
  assert.ok(r.sugestoes.length >= 1 && r.sugestoes.length <= 6);
  assert.equal(typeof r.dadosDe, 'string');
});

test('ANALOGIA: lista 5 resultados com cossenos formatados no idioma e ação analogia', () => {
  const r = R('king - man + woman', 'en');
  assert.equal(r.intencao, 'ANALOGIA');
  assert.deepEqual(r.acoes[0], { tipo: 'analogia', a: i('king'), b: i('man'), c: i('woman') });
  const lista = r.blocos.find((b) => b.tipo === 'lista');
  assert.equal(lista.itens.length, 5);
  assert.ok(lista.itens.some((x) => x.startsWith('queen')), lista.itens.join(' | '));
  assert.match(lista.itens[0], /0\.\d{3}/, 'cosseno com ponto em inglês');
  const rp = R('king - man + woman', 'pt-BR');
  assert.match(rp.blocos.find((b) => b.tipo === 'lista').itens[0], /0,\d{3}/, 'cosseno com vírgula em português');
});

test('VIZINHOS, SIMILARIDADE e DIRECAO: números calculados no aparelho e ações coerentes', () => {
  const v = R('vizinhos de tower');
  assert.equal(v.intencao, 'VIZINHOS');
  assert.equal(v.blocos.find((b) => b.tipo === 'lista').itens.length, 10);
  assert.deepEqual(v.acoes, [{ tipo: 'adicionar', indices: [i('tower')] }, { tipo: 'destacar', indice: i('tower') }]);
  const s = R('cat e dog são parecidas?');
  assert.equal(s.intencao, 'SIMILARIDADE');
  assert.match(textos(s), /0,\d/);
  assert.ok(s.acoes.some((a) => a.tipo === 'adicionar'));
  const d = R('direção do plural');
  assert.equal(d.intencao, 'DIRECAO');
  assert.deepEqual(d.acoes[0].tipo, 'direcao');
  assert.equal(d.acoes[0].w1, i('cats'));
  assert.ok(d.blocos.some((b) => b.tipo === 'tabela' || b.tipo === 'lista'));
});

test('CONCEITO: resumo da seção e ação irPara; PRESET: ação preset e nota; LIMPAR: ação limpar', () => {
  const c = R('o que é um token?');
  assert.equal(c.intencao, 'CONCEITO');
  assert.ok(textos(c).length > 40);
  assert.deepEqual(c.acoes, [{ tipo: 'irPara', rota: '/llms/aprenda/tokens' }]);
  const p = R('mostre as capitais');
  assert.deepEqual(p.acoes, [{ tipo: 'preset', id: 'capitais' }]);
  assert.ok(textos(p).includes(t('ui.presets.capitais.nota')));
  assert.deepEqual(R('limpar o gráfico').acoes, [{ tipo: 'limpar' }]);
});

test('DESCONHECIDA: ecoa a pergunta, sugere palavras próximas e traz chips; SAUDACAO/AJUDA/SOBRE_DADOS/FONTES sem ações', () => {
  const d = R('xqzv');
  assert.equal(d.intencao, 'DESCONHECIDA');
  assert.ok(textos(d).includes('xqzv'));
  assert.ok(d.sugestoes.length >= 3 && d.sugestoes.length <= 6);
  assert.deepEqual(d.acoes, []);
  for (const q of ['oi', 'ajuda', 'sobre os dados', 'fontes']) {
    const r = R(q);
    assert.ok(['SAUDACAO', 'AJUDA', 'SOBRE_DADOS', 'FONTES'].includes(r.intencao), q);
    assert.ok(textos(r).length > 20, q);
  }
  assert.ok(textos(R('fontes')).includes('GloVe'));
});

test('rotuloOrigem: montada no aparelho com a data dos dados; texto gerado nomeia o modelo', () => {
  definirIdioma('pt-BR');
  const local = rotuloOrigem({ origem: 'LOCAL', dadosDe: '2026-10-25T16:30:06Z' });
  assert.ok(local.includes('GloVe') && local.includes('2026'), local);
  const gen = rotuloOrigem({ origem: 'GENERATIVA', modelo: 'Qwen3-4B' });
  assert.ok(gen.includes('Qwen3-4B'), gen);
  definirIdioma('zh');
  assert.ok(/[一-鿿]/.test(rotuloOrigem({ origem: 'LOCAL', dadosDe: '2026-10-25T16:30:06Z' })));
  definirIdioma('pt-BR');
});

test('histórico de perguntas: saneado (sem vazios, 300 caracteres, últimas 50)', () => {
  const h = sanearHistorico(['', '  a  ', 'x'.repeat(400), ...Array.from({ length: 60 }, (_, k) => `p${k}`)]);
  assert.equal(h.length, 50);
  assert.equal(h[h.length - 1], 'p59');
  assert.ok(!h.includes(''));
});
