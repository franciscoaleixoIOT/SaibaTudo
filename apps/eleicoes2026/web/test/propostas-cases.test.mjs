// Regressão de 21/10/2026 (contracts/propostas_cases.json): 20 modelos de frase × 100 temas sobre ONDE CONSULTAR as propostas/planos do 1º e do
// 2º turno. Antes da correção, nenhuma das 2.000 recebia a resposta de plano de governo: "2º turno" na frase virava SEGUNDO_TURNO (882), palavras
// como "portal"/"oficial" e o próprio tema viravam nome de candidato (326), "documentos das candidaturas" caía em LOCAL_VOTACAO (200)...
// O Android confere o mesmo contrato (PropostasCasesTest.kt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ, pacoteCompleto } from './support.mjs';
import { AnswerBuilder } from '../src/eleicoes2026/js/answers.js';
import { parse } from '../src/eleicoes2026/js/nlu.js';

const contrato = JSON.parse(readFileSync(resolve(RAIZ, 'contracts/propostas_cases.json'), 'utf8'));

export function perguntasDoContrato(c = contrato) {
  const saida = [];
  for (const modelo of c.modelos) {
    for (const { tema, esperado } of c.temas) saida.push({ q: modelo.replace('{tema}', tema.toLowerCase()), tema, esperado });
  }
  return saida;
}

test('propostas por tema: intenção aceita em >= 99 % e macrotema reconhecido em >= 98 % das 2.000 perguntas; nunca nome de candidato', async () => {
  const { gaz } = await pacoteCompleto();
  const perguntas = perguntasDoContrato();
  assert.equal(perguntas.length, 2000);
  const falhasIntent = [];
  const falhasTema = [];
  const nomes = [];
  for (const { q, tema, esperado } of perguntas) {
    const p = parse(q, gaz);
    if (!contrato.intencoes_aceitas.includes(p.intent)) falhasIntent.push(`${q} -> ${p.intent}`);
    if (esperado != null && p.tema !== esperado) falhasTema.push(`${q} -> tema ${p.tema} (esperado ${esperado}; tema do CSV "${tema}")`);
    if (p.nome != null) nomes.push(`${q} -> nome ${p.nome}`);
  }
  const pctIntent = 100 * (perguntas.length - falhasIntent.length) / perguntas.length;
  const comTema = perguntas.filter((x) => x.esperado != null).length;
  const pctTema = 100 * (comTema - falhasTema.length) / comTema;
  assert.ok(pctIntent >= contrato.minimo_intencao_pct, `intenção ${pctIntent.toFixed(1)} %:\n${falhasIntent.slice(0, 15).join('\n')}`);
  assert.ok(pctTema >= contrato.minimo_tema_pct, `tema ${pctTema.toFixed(1)} %:\n${falhasTema.slice(0, 15).join('\n')}`);
  assert.deepEqual(nomes.slice(0, 10), [], `palavra comum virou nome de candidato (${nomes.length}):\n${nomes.slice(0, 10).join('\n')}`);
});

test('propostas por tema: a resposta aponta o DivulgaCandContas e as candidaturas que citam o tema, sem apelidos de urna', async () => {
  const { dados, gaz } = await pacoteCompleto();
  const responder = (q, uf = 'SP') => new AnswerBuilder({ data: dados, gaz, hoje: '2026-10-21', ufPadrao: uf, origem: 'LOCAL' }).construir(parse(q, gaz));
  for (const q of ['Onde consultar nos canais oficiais as propostas apresentadas no 1º turno sobre educação básica?',
    'Onde consultar nos canais oficiais o detalhamento das propostas do 2º turno sobre hospitais públicos?',
    'plano de governo sobre educação', 'propostas sobre saúde']) {
    const r = await responder(q);
    assert.equal(r.intent, 'PLANO_GOVERNO', q);
    assert.match(r.directAnswer, /^Propostas sobre (Educação|Saúde) nos planos de governo registrados no TSE:/, `${q}: ${r.directAnswer.slice(0, 120)}`);
    assert.ok(r.directAnswer.includes('DivulgaCandContas') && r.directAnswer.includes('Presidência:'), q);
    assert.ok(!r.directAnswer.startsWith('Encontrei'), q);
    assert.ok(r.candidateIds.length > 0 && r.filters.tema != null, q);
  }
  // "documentos das candidaturas" não é documento para votar; "propostas do 2º turno" não é a regra do 2º turno; "pesquisa científica" não é pesquisa eleitoral
  assert.equal(parse('Onde encontrar nos canais institucionais os documentos públicos das candidaturas do 1º turno sobre saúde?', gaz).intent, 'PLANO_GOVERNO');
  assert.equal(parse('Como pesquisar nos sistemas oficiais de divulgação os compromissos registrados no 2º turno para segurança pública?', gaz).intent, 'PLANO_GOVERNO');
  assert.equal(parse('propostas sobre pesquisa científica', gaz).tema, 'tecnologia');
  // o que já funcionava continua: documentos para votar, regra do 2º turno, patrimônio declarado, perfil por nome
  assert.equal(parse('quais documentos levar para votar?', gaz).intent, 'LOCAL_VOTACAO');
  assert.equal(parse('haverá segundo turno para governador?', gaz).intent, 'SEGUNDO_TURNO');
  assert.equal(parse('haverá segundo turno para presidente?', gaz).intent, 'SEGUNDO_TURNO');
  assert.equal(parse('patrimônio do Lula', gaz).intent, 'PATRIMONIO');
  assert.equal(parse('plano de governo do Lula', gaz).nome, 'lula');
  assert.equal(parse('Candidatos a senador que citam saúde no plano', gaz).intent, 'LISTAR_CANDIDATOS');
});
