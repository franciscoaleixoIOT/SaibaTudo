// Gera, com o MOTOR DO SITE e o pacote oficial em disco, as respostas determinísticas que servem de CONTEXTO e de alvo para o
// explicador SaibaTudo IA (texto gerado): para cada pergunta, a resposta que o app mostra e o contexto EXATAMENTE como o site o envia
// ao /api/ask (engine.perguntarANuvem: "Dados apurados no sistema:" + candidaturas no escopo). Nada é inventado: tudo vem do pacote
// do TSE. A montagem dos exemplos de treino (prompt do explicador, holdout, verificação de fidelidade) é do build_ask_dataset.py.
//
//   node backend/retrain/dump_respostas_ask.mjs --out backend/retrain/out-ask/respostas.jsonl [--hoje 2026-10-27] [--max-nomes 320] [--sem-apuracao]
//
// Fontes de perguntas: contracts/nlu_golden_cases.json e nlu_nome_cases.json (perguntas), opiniao_cases.json (recusas), uma grade
// cargo × UF (listar, contar, resultado, 2º turno), perguntas institucionais e perguntas sobre candidatos reais (nome de urna).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApuracaoClient } from '../../web/src/eleicoes2026/js/live.js';
import { motor } from '../../web/test/support.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null)).filter(Boolean));
const OUT = resolve(RAIZ, args.out ?? 'backend/retrain/out-ask/respostas.jsonl');
const HOJE = args.hoje ?? '2026-10-27';
const MAX_NOMES = Number.parseInt(args['max-nomes'] ?? '320', 10);

const lerCasos = (f) => JSON.parse(readFileSync(resolve(RAIZ, 'contracts', f), 'utf8')).cases;
const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const CARGOS = [['governador', 'Governador'], ['senador', 'Senador'], ['deputado federal', 'Deputado Federal'], ['deputado estadual', 'Deputado Estadual']];

const INSTITUCIONAIS = [
  'Quando é o segundo turno?', 'Qual o horário de votação?', 'Quais documentos levar para votar?', 'Onde eu voto?',
  'Como justificar o voto?', 'Posso votar em trânsito?', 'Como funciona a biometria?', 'Não votei no primeiro turno, posso votar no segundo?',
  'Meu local de votação mudou para o 2º turno?', 'Ordem de votação na urna', 'Posso levar celular na cabine?', 'Posso votar de bermuda?',
  'Quantos dígitos tem o voto para deputado federal?', 'Como votar em branco?', 'O que é voto nulo?', 'Quem é obrigado a votar?',
  'Por que voto em dois senadores?', 'Quem pode ser candidato a presidente?', 'O que é ficha limpa?', 'Quais são as fontes dos dados?',
  'De onde vêm os dados do app?', 'Como funciona o segundo turno?', 'Quem disputa a Presidência?', 'Quem disputa o segundo turno?',
  'Resultado da eleição para presidente', 'Quantas candidaturas há no Brasil?', 'Quantas mulheres são candidatas?', 'Pesquisas para presidente',
  'O que o app faz?', 'Ajuda', 'Simular voto na urna', 'Quem foi eleito presidente?', 'Haverá segundo turno para presidente?',
  // pós-eleição (26/10/2026 em diante)
  'Quem é o novo presidente?', 'A eleição acabou?', 'Quem ganhou o segundo turno?', 'Quem foi eleito governador?', 'Houve segundo turno para governador?',
  'Quem foi eleito senador?', 'Quantos votos o presidente eleito teve?', 'Qual foi a abstenção?', 'Não votei, como justifico?',
  'Até quando posso justificar?', 'Quanto é a multa por não votar?', 'Quando é a diplomação dos eleitos?', 'Quando é a posse do presidente?',
  'Prazo da prestação de contas final', 'Segundo turno para presidente', 'Resultado do segundo turno', 'Quem perdeu o segundo turno?',
];

/** O contexto é o do próprio motor (engine.contextoParaNuvem): o treino vê EXATAMENTE o que o site envia ao /api/ask, inclusive o
 *  tempo verbal das regras do 2º turno na fase atual. */
const contextoDe = (engine, resposta, pergunta) => engine.contextoParaNuvem(pergunta, resposta);

function* perguntas(engine) {
  for (const c of lerCasos('nlu_golden_cases.json')) yield { q: c.q, tipo: c.intent === 'RECOMENDACAO' ? 'recusa' : 'golden' };
  for (const c of lerCasos('nlu_nome_cases.json')) yield { q: c.q, tipo: 'nome' };
  for (const c of lerCasos('opiniao_cases.json')) if (c.opiniao) yield { q: c.q, tipo: 'recusa' };
  for (const q of INSTITUCIONAIS) yield { q, tipo: 'institucional' };
  for (const uf of UFS) {
    for (const [cargo] of CARGOS) {
      yield { q: `candidatos a ${cargo} em ${uf}`, tipo: 'grade' };
      yield { q: `quantos candidatos a ${cargo} em ${uf}?`, tipo: 'grade' };
    }
    yield { q: `resultado para governador em ${uf}`, tipo: 'grade' };
    yield { q: `quem vai para o segundo turno em ${uf}?`, tipo: 'grade' };
    yield { q: `quem foi eleito governador em ${uf}?`, tipo: 'grade' };
    yield { q: `houve segundo turno para governador em ${uf}?`, tipo: 'grade' };
    yield { q: `senadores eleitos em ${uf}`, tipo: 'grade' };
    yield { q: `candidatas mulheres a deputada federal em ${uf}`, tipo: 'grade' };
    yield { q: `candidatos do PT a deputado estadual em ${uf}`, tipo: 'grade' };
  }
  // candidatos reais: nome de urna, amostra estável por hash, majoritários e proporcionais
  const todos = engine.store.candidatos.filter((c) => c.nomeUrna && c.nomeUrna.length >= 4);
  const h = (s) => createHash('sha256').update(s).digest('hex');
  const amostra = todos.map((c) => [h(String(c.id)), c]).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, MAX_NOMES).map((x) => x[1]);
  const moldes = [
    (n) => `quem é ${n}?`, (n) => `${n} é ficha limpa?`, (n) => `plano de governo de ${n}`, (n) => `patrimônio declarado de ${n}`,
    (n) => `qual o número de ${n}?`, (n) => `${n} foi eleito?`, (n) => `prestação de contas de ${n}`, (n) => `quantos votos ${n} teve?`,
  ];
  for (const [i, c] of amostra.entries()) yield { q: moldes[i % moldes.length](c.nomeUrna.toLowerCase()), tipo: 'candidato' };
}

// apuração oficial ao vivo (resultados.tse.jus.br), como o site faz; `--sem-apuracao` treina só com o pacote
let engine;
const apuracao = 'sem-apuracao' in args ? null : new ApuracaoClient(() => engine?.store?.regras?.resultadosTse ?? null);
engine = await motor({ hoje: HOJE, ufPadrao: 'SP', apuracao });
await engine.store.ensureTodas?.();
mkdirSync(dirname(OUT), { recursive: true });
const vistos = new Set();
const linhas = [];
for (const { q, tipo } of perguntas(engine)) {
  const chave = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  let r;
  try { r = await engine.responder(q); engine.limparContexto?.(); } catch (e) { continue; }
  linhas.push(JSON.stringify({
    id: createHash('sha256').update(`eleicoes|${chave}`).digest('hex').slice(0, 16), q, tipo, intent: r.intent ?? null, resolvida: Boolean(r.resolvida),
    directAnswer: r.directAnswer ?? '', fonte: r.fonte ?? '', contexto: contextoDe(engine, r, q),
  }));
}
writeFileSync(OUT, `${linhas.join('\n')}\n`, 'utf8');
const porTipo = {};
for (const l of linhas) { const t = JSON.parse(l).tipo; porTipo[t] = (porTipo[t] ?? 0) + 1; }
console.log(JSON.stringify({ total: linhas.length, porTipo, hoje: HOJE, out: OUT }, null, 1));
