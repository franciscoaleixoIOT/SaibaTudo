// Respostas montadas dos dados oficiais — equivalentes a AnswerBuilderTest.kt (Android) + regras de neutralidade.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pacoteCompleto } from './support.mjs';
import { inteiro } from '../src/eleicoes2026/js/model.js';
import { AnswerBuilder } from '../src/eleicoes2026/js/answers.js';
import { parse } from '../src/eleicoes2026/js/nlu.js';
import { ApuracaoClient, parseApuracao } from '../src/eleicoes2026/js/live.js';
import { PADRAO, sanear } from '../src/eleicoes2026/js/prefs.js';

const aqui = dirname(fileURLToPath(import.meta.url));
// Formato do JSON de apuração do TSE (fixture SOMENTE de teste; nunca é publicada no site).
const fixture = readFileSync(resolve(aqui, 'fixtures/tse_apuracao_presidente.json'), 'utf8');

async function responder(pergunta, { hoje = '2026-10-01', uf = null, apuracao = null } = {}) {
  const { dados, gaz } = await pacoteCompleto();
  return new AnswerBuilder({ data: dados, gaz, hoje, ufPadrao: uf, apuracao, origem: 'LOCAL' }).construir(parse(pergunta, gaz));
}

test('presidenciáveis na urna são listados (13) e Pablo Marçal não aparece', async () => {
  const r = await responder('Quem disputa a Presidência em 2026?');
  const t = r.directAnswer;
  assert.ok(t.includes('13 candidaturas na urna'), t);
  assert.ok(t.includes('• 13 — LULA (PT)'), t);
  assert.ok(!t.includes('PABLO MARÇAL'), 'candidato com registro indeferido e fora da urna não deve ser listado: ' + t);
  assert.ok(t.includes('fora da urna'));
  assert.ok(r.fonte.includes('TSE'));
  assert.equal(r.filters.cargo, 'PRESIDENTE');
});

test('perfil mostra a situação oficial e a Ficha Limpa DERIVADA dela (nunca "sem pendências")', async () => {
  const r = await responder('Quem é Pablo Marçal?');
  const t = r.directAnswer;
  assert.ok(t.includes('Candidatura indeferida'), t);
  assert.ok(t.includes('NÃO está inserida na urna'), t);
  assert.ok(!t.toLowerCase().includes('ficha limpa sem pend'));
  assert.ok(t.includes('\nFicha Limpa: Inelegibilidade reconhecida (LC 64/90, alterada pela Lei da Ficha Limpa)'), t);
  assert.ok(t.includes('\nMotivos registrados: '), t);
});

test('pedido de recomendação é recusado com neutralidade', async () => {
  const r = await responder('Em quem devo votar para presidente?');
  assert.equal(r.intent, 'RECOMENDACAO');
  assert.ok(r.directAnswer.includes('Não indico, recomendo'));
  assert.deepEqual(r.candidateIds, []);
  assert.equal(r.origem, 'AVISO');
  for (const q of ['Qual o melhor candidato a governador?', 'Quem vai ganhar a eleição?', 'Me indique um candidato a deputado', 'quem merece meu voto']) {
    const x = await responder(q);
    assert.equal(x.intent, 'RECOMENDACAO', q);
    assert.deepEqual(x.candidateIds, [], q);
  }
});

test('resultados antes da eleição explicam que a votação não ocorreu', async () => {
  const r = await responder('Quem foi eleito presidente?', { hoje: '2026-10-01' });
  assert.ok(r.directAnswer.includes('ainda não ocorreu'));
  assert.ok(r.directAnswer.includes('04/10/2026'));
});

test('resultados ao vivo usam os números do TSE sem alterar', async () => {
  const ap = { obter: async (cargo, uf, turno) => parseApuracao(fixture, cargo, uf, turno) };
  const r = await responder('Resultado para presidente', { hoje: '2026-10-04', apuracao: ap });
  const t = r.directAnswer;
  assert.ok(t.includes('• 13 — LULA (PT): 1.234.567 votos (46,10%)'), t);
  assert.ok(t.includes('Apuração em andamento (50,00% das seções totalizadas)'));
  assert.ok(r.abrirResultados);
  assert.equal(r.candidateIds[0], '280002542548');
  assert.equal(r.apuracao.linhas.length, 3);
});

test('resultados pós-eleição: sem apuração publicada informam que não há resultado; com resultados no pacote, citam o TSE', async () => {
  const { dados } = await pacoteCompleto();
  const r = await responder('Resultado para governador em SP', { hoje: '2026-10-05', apuracao: { obter: async () => null } });
  if (dados.manifest.resultadosDisponiveis) {
    // o pacote já traz resultados oficiais (CSV do TSE): a resposta vem deles, não da mensagem de "ainda não há resultado"
    assert.ok(!r.directAnswer.includes('Ainda não há resultado oficial publicado'), r.directAnswer);
    assert.ok(r.directAnswer.includes('São Paulo'), r.directAnswer);
    assert.ok(/segundo o TSE|TSE/.test(r.directAnswer), r.directAnswer);
  } else {
    assert.ok(r.directAnswer.includes('Ainda não há resultado oficial publicado'), r.directAnswer);
  }
});

test('resultados sem cargo pedem o cargo; governador sem UF resume o país; com UF padrão responde o estado', async () => {
  assert.ok((await responder('Resultado da apuração', { hoje: '2026-10-04' })).directAnswer.includes('De qual cargo'));
  const pais = await responder('Quem foi eleito governador?', { hoje: '2026-10-04' });
  assert.ok(pais.directAnswer.includes('Governador — 1º turno'), pais.directAnswer);
  assert.ok(pais.directAnswer.includes('Eleitos no 1º turno') && pais.directAnswer.includes('São Paulo (SP)'), pais.directAnswer);
  assert.ok(pais.directAnswer.includes('2º turno em'), pais.directAnswer);
  const comUf = await responder('Quem foi eleito governador?', { hoje: '2026-10-04', uf: 'SP', apuracao: { obter: async () => null } });
  assert.ok(comUf.directAnswer.includes('Governador em São Paulo'), comUf.directAnswer);
  const status2t = await responder('qual status das votação atual', { hoje: '2026-10-25', uf: 'SP', apuracao: {
    obter: async (cargo, uf, turno) => cargo === 'PRESIDENTE' && turno === 2 ? {
      cargo, uf, turno, geradoEm: '25/10/2026 18:10:00', secoesTotalizadasPct: '42,50', totalizacaoFinal: false,
      linhas: [
        { sqCandidato: '280002542548', numero: '13', nome: 'LULA', partido: 'PT', votos: 25100000, percentual: '50,40', eleito: false, segundoTurno: false },
        { sqCandidato: '280002551544', numero: '22', nome: 'FLAVIO BOLSONARO', partido: 'PL', votos: 24700000, percentual: '49,60', eleito: false, segundoTurno: false }
      ]
    } : null
  } });
  assert.equal(status2t.intent, 'RESULTADOS');
  assert.ok(status2t.directAnswer.includes('Status da votação e apuração — 2º turno'), status2t.directAnswer);
  assert.ok(status2t.directAnswer.includes('42,50% das seções totalizadas'), status2t.directAnswer);
  assert.ok(status2t.directAnswer.includes('13 — LULA (PT): 25.100.000 votos (50,40%)'), status2t.directAnswer);
  assert.ok(status2t.directAnswer.includes('Governador (SP):'), status2t.directAnswer);
  assert.ok(status2t.abrirResultados);
});

test('"quem já ganhou no 1o turno para governador?" é resultado (não listagem) e resume os estados; o plural também, mesmo com UF padrão', async () => {
  for (const pergunta of ['quem já ganhou no 1o turno para governador?', 'Quem já foi eleito governador?', 'quais governadores foram eleitos no primeiro turno?']) {
    const r = await responder(pergunta, { hoje: '2026-10-21', uf: 'SP', apuracao: { obter: async () => null } });
    assert.equal(r.intent, 'RESULTADOS', pergunta);
    assert.ok(r.directAnswer.includes('Governador — 1º turno') && r.directAnswer.includes('(SP)'), `${pergunta}: ${r.directAnswer.slice(0, 120)}`);
    assert.ok(r.candidateIds.length > 0, pergunta);
  }
  const senado = await responder('quais senadores foram eleitos?', { hoje: '2026-10-21' });
  assert.ok(senado.directAnswer.includes('Senador — 1º turno') && senado.directAnswer.includes('Eleitos ('), senado.directAnswer.slice(0, 160));
  // Deputado continua pedindo a UF (lista longa demais para um resumo nacional); com UF, o total vai no cabeçalho (a nuvem recebe a lista cortada)
  assert.ok((await responder('quem foi eleito deputado federal?', { hoje: '2026-10-21' })).directAnswer.includes('De qual estado?'));
  const sp = await responder('quem já ganhou no 1o turno para deputado?', { hoje: '2026-10-21', uf: 'SP', apuracao: { obter: async () => null } });
  assert.match(sp.directAnswer, /Eleitos para Deputado Federal em São Paulo segundo o TSE \(\d{2}\):/, sp.directAnswer.slice(0, 200));
});

test('segundo turno: antes da apuração explica a regra; depois consulta o resultado', async () => {
  const antes = await responder('Quem vai pro segundo turno?', { hoje: '2026-10-01' });
  assert.equal(antes.intent, 'SEGUNDO_TURNO');
  assert.ok(antes.directAnswer.includes('Só para Presidente e Governador'), antes.directAnswer);
  const depois = await responder('Quem vai pro segundo turno para presidente?', { hoje: '2026-10-10', apuracao: { obter: async () => null } });
  assert.equal(depois.intent, 'SEGUNDO_TURNO');
});

test('o calendário muda com a fase eleitoral', async () => {
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-10-01' })).directAnswer.includes('daqui a 3 dias'));
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-10-03' })).directAnswer.includes('amanhã'));
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-10-04' })).directAnswer.includes('Hoje é o 1º turno'));
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-10-10' })).directAnswer.includes('O 1º turno foi em 04/10/2026'));
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-10-25' })).directAnswer.includes('Hoje é o 2º turno'));
  assert.ok((await responder('Quando é a eleição?', { hoje: '2026-11-02' })).directAnswer.includes('As votações ocorreram'));
});

test('elegibilidade não emite certidão de Ficha Limpa e filtra apenas deferidas', async () => {
  const r = await responder('O que é ficha limpa?');
  assert.ok(r.directAnswer.includes('NÃO emite certidão'));
  assert.ok(r.directAnswer.includes('\nO que significa cada situação:'), r.directAnswer);
  assert.equal(r.filters.apenasDeferidas, true);
  assert.equal(r.filters.apenasIndeferidas, null);
  const n = await responder('Qual a situação da candidatura do Pablo Marçal?');
  assert.ok(n.directAnswer.startsWith('PABLO MARÇAL (Presidente da República, nº 28) — Ficha Limpa e situação do registro no TSE'), n.directAnswer);
  assert.ok(n.directAnswer.includes('\nSituação no TSE: Candidatura indeferida — NÃO está inserida na urna'));
  assert.ok(n.directAnswer.includes('\nMotivos registrados: '));
  assert.ok(n.directAnswer.includes('não é certidão e pode caber recurso'));
});

test('pergunta desconhecida fica não resolvida (possível apoio da nuvem)', async () => {
  const r = await responder('asdkjh qwerty');
  assert.equal(r.resolvida, false);
  assert.ok(r.suggestedQuestions[0]);
});

test('contagem por cargo e UF', async () => {
  const r = await responder('Quantos candidatos a governador em SP?');
  assert.ok(r.directAnswer.includes('sendo'), r.directAnswer);
  assert.equal(r.filters.estadoUf, 'SP');
  const total = await responder('Quantos candidatos foram registrados?');
  const { store } = await pacoteCompleto();
  assert.ok(total.directAnswer.includes(`${inteiro(store.manifest.contagens.candidaturas)} candidaturas`), total.directAnswer);
  assert.ok(total.directAnswer.includes('\nNa urna, por cargo:\n• '), total.directAnswer);
});

test('patrimônio declarado vem do registro do candidato', async () => {
  const r = await responder('Qual o patrimônio declarado de Flávio Bolsonaro?');
  assert.equal(r.intent, 'PATRIMONIO');
  assert.ok(r.directAnswer.startsWith('FLAVIO BOLSONARO (Presidente da República, nº 22) — bens declarados ao TSE'), r.directAnswer);
  assert.ok(/\nPatrimônio declarado: R\$\s[\d.]+,\d{2} \(\d+ bens\)/.test(r.directAnswer), r.directAnswer);
  assert.ok((await responder('patrimônio dos candidatos')).directAnswer.includes('Pergunte pelo nome'));
});

test('pesquisas: o registro não traz resultados', async () => {
  const { store, gaz } = await pacoteCompleto();
  await store.ensurePesquisas();
  // snapshot novo: o de pacoteCompleto() foi tirado antes de as pesquisas serem carregadas
  const r = await new AnswerBuilder({ data: store.snapshot(), gaz, hoje: '2026-10-01' }).construir(parse('Pesquisas para governador de SP', gaz));
  assert.ok(r.directAnswer.includes('o registro no TSE não traz os resultados'), r.directAnswer);
  assert.ok(r.directAnswer.includes(' pesquisas eleitorais registradas em São Paulo (Governador).'), r.directAnswer);
  assert.match(r.directAnswer, /registrada em \d{2}\/\d{2}\/\d{4}/);
});

test('regras da urna e senado (dois votos)', async () => {
  const u = await responder('Qual a ordem de votação na urna?');
  assert.ok(u.directAnswer.includes('\n• 1º) Deputado Federal — 4 dígitos') && u.directAnswer.includes('não é a urna oficial'), u.directAnswer);
  const s = await responder('Quantos votos para senador?');
  assert.equal(s.intent, 'SENADO_DOIS_VOTOS');
  assert.ok(s.directAnswer.includes('segundo voto é anulado'));
});

test('fontes oficiais e sobre os dados', async () => {
  const f = await responder('Sites oficiais do TSE');
  assert.ok(f.directAnswer.includes('DivulgaCandContas'));
  const sd = await responder('De onde vêm os dados?');
  assert.ok(sd.directAnswer.includes('licença CC BY') && sd.directAnswer.includes('\nPacote: 2026'), sd.directAnswer);
});

test('toda resposta factual cita a fonte (TSE) e é determinística', async () => {
  for (const q of ['Candidatos a governador em SP', 'Quem é Lula?', 'Quando é a eleição?', 'Onde eu voto?']) {
    const a = await responder(q);
    const b = await responder(q);
    assert.ok(a.fonte && a.fonte.includes('TSE'), q);
    assert.deepEqual(a, b, q);
  }
});

test('o cliente de apuração (ApuracaoClient) alimenta a resposta de resultados', async () => {
  const { dados } = await pacoteCompleto();
  const cliente = new ApuracaoClient(() => dados.resultadosTse, {
    fetchFn: async () => new Response(fixture, { status: 200 }), esperar: async () => {}
  });
  const r = await responder('Resultado para presidente', { hoje: '2026-10-04', apuracao: cliente });
  assert.ok(r.directAnswer.includes('1.234.567 votos (46,10%)'));
});

test('"deputado mais votado" sem federal/estadual: Deputado Federal com aviso e linha do mais votado (não pede o cargo de novo)', async () => {
  const pedidos = [];
  const apDep = { obter: async (cargo, uf, turno) => { pedidos.push(cargo); return cargo !== 'DEPUTADO_FEDERAL' && cargo !== 'DEPUTADO_ESTADUAL' ? null : {
    cargo, uf, turno, geradoEm: '05/10/2026 02:00:00', secoesTotalizadasPct: '100,00', totalizacaoFinal: true,
    linhas: [{ sqCandidato: null, numero: '1234', nome: 'FULANA MAIS VOTADA', partido: 'PX', votos: 900000, percentual: '3,50', eleito: true, segundoTurno: false },
      { sqCandidato: null, numero: '5678', nome: 'BELTRANO', partido: 'PY', votos: 400000, percentual: '1,60', eleito: true, segundoTurno: false }] }; } };
  for (const q of ['qual o candidato a deputado mais votado', 'deputado mais votado', 'qual deputado foi o mais votado?']) {
    const r = await responder(q, { hoje: '2026-10-06', uf: 'SP', apuracao: apDep });
    assert.equal(r.intent, 'RESULTADOS', q);
    assert.ok(r.directAnswer.startsWith('Mais votado(a): FULANA MAIS VOTADA (PX), nº 1234 — 900.000 votos (3,50%) — ELEITO.'), `${q}: ${r.directAnswer}`);
    assert.ok(r.directAnswer.includes('Você perguntou por "deputado": mostrei Deputado Federal em SP.'), q);
    assert.ok(!r.directAnswer.includes('De qual cargo'), q);
    assert.equal(r.filters.cargo, 'DEPUTADO_FEDERAL');
  }
  assert.ok(pedidos.every((c) => c === 'DEPUTADO_FEDERAL'), String(pedidos));
  // sem estado conhecido pede só a UF (não o cargo); com "estadual" explícito não há aviso
  const semUf = await responder('deputado mais votado', { hoje: '2026-10-06', apuracao: apDep });
  assert.ok(semUf.directAnswer.startsWith('De qual estado?'), semUf.directAnswer);
  const est = await responder('deputado estadual mais votado em SP', { hoje: '2026-10-06', apuracao: apDep });
  assert.ok(est.directAnswer.startsWith('Mais votado(a):') && !est.directAnswer.includes('Você perguntou por'), est.directAnswer);
  // perguntas sem "mais votado" não ganham a linha de destaque
  const normal = await responder('Resultado para deputado federal em SP', { hoje: '2026-10-06', apuracao: apDep });
  assert.ok(!normal.directAnswer.startsWith('Mais votado(a):'));
});

test('"Meu estado" vale para cargos estaduais sem UF na pergunta (paridade com o Android)', async () => {
  const r = await responder('Candidatos a governador', { uf: 'SP' });
  assert.equal(r.filters.estadoUf, 'SP');
  assert.ok(r.directAnswer.endsWith('\nFiltrado pelo seu estado (SP). Para ver o Brasil todo, peça "em todo o Brasil" ou desligue "Meu estado".'), r.directAnswer);
  assert.ok(r.directAnswer.includes('em São Paulo'));
  // contagem também; senador e deputados idem
  assert.equal((await responder('Quantos candidatos a senador?', { uf: 'MG' })).filters.estadoUf, 'MG');
  assert.equal((await responder('Candidatos a deputado federal', { uf: 'RJ' })).filters.estadoUf, 'RJ');
  // cargo nacional não é afetado; UF explícita na pergunta prevalece
  assert.ok(!(await responder('Quem disputa a Presidência?', { uf: 'SP' })).directAnswer.includes('Filtrado'));
  const rj = await responder('Candidatos a governador em RJ', { uf: 'SP' });
  assert.equal(rj.filters.estadoUf, 'RJ');
  assert.ok(!rj.directAnswer.includes('Filtrado'));
  // sem "Meu estado" ligado (uf nula) a pergunta continua nacional
  assert.equal((await responder('Candidatos a governador')).filters.estadoUf, null);
  // outras intenções não são afetadas (perfil, pesquisas, calendário)
  assert.ok(!(await responder('Quando é a eleição?', { uf: 'SP' })).directAnswer.includes('Filtrado'));
  // "em todo o Brasil" afasta o recorte, como a própria dica ensina
  const br = await responder('Candidatos a governador em todo o Brasil', { uf: 'SP' });
  assert.equal(br.filters.estadoUf, null);
  assert.ok(!br.directAnswer.includes('Filtrado'));
});

test('prestação de contas aparece no perfil só quando há valores (receitas ou despesas > 0)', async () => {
  const { store, gaz, dados } = await pacoteCompleto();
  const b = new AnswerBuilder({ data: dados, gaz, hoje: '2026-10-01' });
  const com = store.candidatos.find((c) => c.contas && (c.contas.receitas > 0 || c.contas.despesasContratadas > 0));
  assert.ok(com, 'o pacote tem candidaturas com prestação de contas');
  const t = b.descricaoPerfil(com);
  assert.ok(/\nContas de campanha \([^)]+\): receitas R\$\s\S+ · despesas contratadas R\$\s\S+/.test(t), t);
  assert.ok(t.includes((com.contas.tipo ?? 'parcial').toLowerCase()));
  const zerada = { ...com, contas: { receitas: 0, despesasContratadas: 0, tipo: 'PARCIAL', geradoEm: null } };
  assert.ok(!b.descricaoPerfil(zerada).includes('Contas de campanha'));
  assert.ok(!b.descricaoPerfil({ ...com, contas: null }).includes('Contas de campanha'));
});

test('preferências: historicoPerguntas é saneado (máximo 50, corte de espaços e strings válidas)', () => {
  assert.deepEqual(PADRAO.historicoPerguntas, []);
  const invalido = sanear({ historicoPerguntas: 'não é array' });
  assert.deepEqual(invalido.historicoPerguntas, []);

  const bruto = Array.from({ length: 60 }, (_, i) => `  Pergunta ${i + 1}  `);
  bruto.push('', '   ', null, 123);
  const saneado = sanear({ historicoPerguntas: bruto });
  assert.equal(saneado.historicoPerguntas.length, 50);
  assert.equal(saneado.historicoPerguntas[0], 'Pergunta 11');
  assert.equal(saneado.historicoPerguntas[49], 'Pergunta 60');
});

// ---- 2º turno com a apuração REAL do TSE (05/10/2026): nenhum candidato passou de 50% e o TSE marca os dois primeiros com "e":"s" ----
import { leituraSegundoTurno } from '../src/eleicoes2026/js/answers.js';

const real1t = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/tse_apuracao_presidente_1t_final.json'), 'utf8');
const apReal = { obter: async (cargo, uf, turno) => (cargo === 'PRESIDENTE' && turno === 1 ? parseApuracao(real1t, cargo, uf, turno) : null) };

test('REGRESSÃO GRAVE: com 47% o app nunca diz "eleito em 1º turno" nem "não haverá 2º turno" para Presidente', async () => {
  for (const q of ['haverá 2a turno para presidente', 'haverá 2º turno para presidente?', 'vai ter segundo turno para presidente', 'tem 2 turno pra presidente?']) {
    const r = await responder(q, { hoje: '2026-10-06', apuracao: apReal });
    assert.equal(r.intent, 'SEGUNDO_TURNO', q);
    const t = r.directAnswer;
    assert.ok(t.startsWith('Sim, haverá 2º turno para Presidente da República.'), `${q}: ${t}`);
    assert.ok(!/Não haverá 2º turno|foi eleito|maioria absoluta dos votos válidos \(mais de 50%\), a eleição foi liquidada/.test(t), `${q}: ${t}`);
    assert.ok(t.includes('1º: FLAVIO BOLSONARO (PL) — 47,03% (56.104.503 votos)'), t);
    assert.ok(t.includes('2º: LULA (PT) — 45,16% (53.879.538 votos)'), t);
    assert.ok(t.includes('25/10/2026'), t);
  }
});

test('visão geral e resultados com a apuração real: 2º turno entre os dois, ninguém "ELEITO"', async () => {
  const geral = await responder('Quem vai pro segundo turno?', { hoje: '2026-10-06', apuracao: apReal });
  assert.ok(geral.directAnswer.includes('Presidente da República: Sim, haverá 2º turno entre FLAVIO BOLSONARO (47,03%) e LULA (45,16%)'), geral.directAnswer);
  assert.ok(!/Presidente da República: Não haverá/.test(geral.directAnswer));
  const res = await responder('Resultado para presidente', { hoje: '2026-10-06', apuracao: apReal });
  assert.ok(res.directAnswer.includes('47,03%) — 2º TURNO'), res.directAnswer);
  assert.ok(res.directAnswer.includes('45,16%) — 2º TURNO'), res.directAnswer);
  assert.ok(!res.directAnswer.includes('— ELEITO'), res.directAnswer);
  assert.ok(res.apuracao.linhas.every((l) => l.eleito === false));
});

test('leituraSegundoTurno: nunca "ELEITO" abaixo de 50% com dois marcados; eleito de verdade; andamento; totalizado sem maioria', () => {
  const ap = (linhas, extra = {}) => ({ linhas, totalizacaoFinal: true, secoesTotalizadasPct: '100,00', ...extra });
  const l = (nome, votos, pct, o = {}) => ({ nome, votos, percentual: pct, eleito: false, segundoTurno: false, ...o });
  // formato antigo/defensivo: dois "eleitos" sem a situação e o primeiro com menos de 50%
  assert.equal(leituraSegundoTurno(ap([l('A', 47, '47,03', { eleito: true }), l('B', 45, '45,16', { eleito: true })])).tipo, 'SEGUNDO');
  assert.equal(leituraSegundoTurno(ap([l('A', 47, '47,03', { segundoTurno: true }), l('B', 45, '45,16', { segundoTurno: true }), l('C', 8, '7,81')])).tipo, 'SEGUNDO');
  const eleito = leituraSegundoTurno(ap([l('A', 62, '62,65', { eleito: true }), l('B', 36, '36,42')]));
  assert.deepEqual([eleito.tipo, eleito.maioria, eleito.l1.nome], ['ELEITO', true, 'A']);
  assert.equal(leituraSegundoTurno(ap([l('A', 49, '49,99'), l('B', 34, '34,51')])).tipo, 'SEGUNDO', 'totalizado e ninguém acima de 50%');
  assert.equal(leituraSegundoTurno(ap([l('A', 49, '49,99'), l('B', 34, '34,51')], { totalizacaoFinal: false, secoesTotalizadasPct: '60,00' })).tipo, 'ANDAMENTO');
  assert.equal(leituraSegundoTurno(ap([])).tipo, null);
});

test('sem apuração ao vivo depois do 1º turno: usa o pacote oficial e não fala como se a votação não tivesse ocorrido', async () => {
  const off = { obter: async () => null };
  const { dados } = await pacoteCompleto();
  const pres = await responder('haverá 2º turno para presidente?', { hoje: '2026-10-06', apuracao: off });
  assert.ok(!/depende da apuração do 1º turno/.test(pres.directAnswer), pres.directAnswer);
  assert.ok(!/Não haverá 2º turno/.test(pres.directAnswer), pres.directAnswer);
  if (dados.manifest.resultadosDisponiveis) {
    const ac = await responder('vai ter segundo turno para governador do acre?', { hoje: '2026-10-06', apuracao: off });
    assert.ok(ac.directAnswer.startsWith('Sim, haverá 2º turno para Governador no Acre.'), ac.directAnswer);
    assert.ok(ac.directAnswer.includes('segundo a totalização oficial do TSE'), ac.directAnswer);
    const sp = await responder('tem 2ª turno pra governador em sp?', { hoje: '2026-10-06', apuracao: off });
    assert.ok(sp.directAnswer.startsWith('Não haverá 2º turno para Governador em São Paulo.'), sp.directAnswer);
  }
});

// ------------------------------------------------------------------ pós-eleição (26/10/2026): o 2º turno já ocorreu
const POS = '2026-10-26';
const linhaLula = (o = {}) => ({ sqCandidato: '280002542548', numero: '13', nome: 'LULA', partido: 'PT', votos: 60345678, percentual: '51,79', eleito: true, segundoTurno: false, ...o });
const linhaFlavio = (o = {}) => ({ sqCandidato: '280002551544', numero: '22', nome: 'FLAVIO BOLSONARO', partido: 'PL', votos: 56123456, percentual: '48,21', eleito: false, segundoTurno: false, ...o });
/** Apuração ao vivo do 2º turno (totalização final) só para Presidente; nada para os demais. */
const ap2tFinal = { obter: async (cargo, uf, turno) => cargo === 'PRESIDENTE' && turno === 2
  ? { cargo, uf, turno, geradoEm: '25/10/2026 23:27:10', secoesTotalizadasPct: '100,00', totalizacaoFinal: true, linhas: [linhaLula(), linhaFlavio()] }
  : null };
const semAoVivo = { obter: async () => null };
const noFuturo = (t) => /haver[aá] 2º turno|Votação do 2º turno|disputam o 2º turno|no dia: leve/i.test(t);

test('pós-eleição: "segundo turno para presidente" fala no passado e traz o eleito da apuração do 2º turno', async () => {
  const r = await responder('Segundo turno para presidente', { hoje: POS, apuracao: ap2tFinal });
  assert.equal(r.intent, 'SEGUNDO_TURNO');
  assert.ok(r.directAnswer.startsWith('Houve 2º turno para Presidente da República em 25/10/2026'), r.directAnswer);
  assert.ok(r.directAnswer.includes('LULA (PT)') && r.directAnswer.includes('51,79%') && r.directAnswer.includes('ELEITO'), r.directAnswer);
  assert.ok(r.directAnswer.includes('Totalização final'), r.directAnswer);
  assert.ok(!noFuturo(r.directAnswer), r.directAnswer);
  assert.deepEqual(r.candidateIds, ['280002542548', '280002551544']);
});

test('pós-eleição sem apuração ao vivo: 2º turno no passado, com os classificados do pacote e o link do TSE, nunca "haverá"', async () => {
  for (const [q, inicio] of [['Segundo turno para presidente', 'Houve 2º turno para Presidente da República em 25/10/2026'],
    ['vai ter segundo turno para governador no ES?', 'Houve 2º turno para Governador no Espírito Santo em 25/10/2026']]) {
    const r = await responder(q, { hoje: POS, apuracao: semAoVivo });
    assert.equal(r.intent, 'SEGUNDO_TURNO', q);
    assert.ok(r.directAnswer.startsWith(inicio), `${q}: ${r.directAnswer}`);
    assert.ok(r.directAnswer.includes('resultados.tse.jus.br'), r.directAnswer);
    assert.ok(!noFuturo(r.directAnswer), r.directAnswer);
  }
  const geral = await responder('Quem vai pro segundo turno?', { hoje: POS, uf: 'ES', apuracao: semAoVivo });
  assert.ok(geral.directAnswer.includes('O 2º turno, onde houve, foi em 25/10/2026'), geral.directAnswer);
  assert.ok(geral.directAnswer.includes('Presidente da República: Houve 2º turno entre'), geral.directAnswer);
  assert.ok(geral.directAnswer.includes('Governador (ES): Houve 2º turno entre'), geral.directAnswer);
  assert.ok(!noFuturo(geral.directAnswer), geral.directAnswer);
  // cargo eleito no 1º turno continua no passado ("Não houve")
  const sp = await responder('tem 2º turno pra governador em sp?', { hoje: POS, apuracao: semAoVivo });
  assert.ok(sp.directAnswer.startsWith('Não houve 2º turno para Governador em São Paulo.'), sp.directAnswer);
});

test('pós-eleição: "quem foi eleito presidente" sem apuração ao vivo não diz que "disputam" o 2º turno', async () => {
  const r = await responder('Quem foi eleito presidente?', { hoje: POS, apuracao: semAoVivo });
  assert.equal(r.intent, 'RESULTADOS');
  assert.ok(r.directAnswer.includes('O 2º turno para Presidente da República ocorreu em 25/10/2026'), r.directAnswer);
  assert.ok(r.directAnswer.includes('resultados.tse.jus.br'), r.directAnswer);
  assert.ok(!noFuturo(r.directAnswer), r.directAnswer);
  const pan = await responder('como está a apuração?', { hoje: POS, uf: 'ES', apuracao: semAoVivo });
  assert.ok(!noFuturo(pan.directAnswer), pan.directAnswer);
  assert.ok(pan.directAnswer.includes('2º turno em 25/10/2026 entre'), pan.directAnswer);
});

test('pós-eleição: resultado por candidato ("Lula foi eleito?", "quantos votos o Lula teve no segundo turno?")', async () => {
  for (const q of ['Lula foi eleito?', 'quantos votos o lula teve no segundo turno?', 'o lula ganhou?']) {
    const r = await responder(q, { hoje: POS, apuracao: ap2tFinal });
    assert.equal(r.intent, 'RESULTADOS', q);
    assert.ok(r.directAnswer.startsWith('LULA (PT, nº 13) — Presidente da República, 2º turno'), `${q}: ${r.directAnswer}`);
    assert.ok(r.directAnswer.includes('60.345.678 votos (51,79%) — ELEITO'), r.directAnswer);
    assert.ok(r.directAnswer.includes('Totalização final'), r.directAnswer);
    assert.deepEqual(r.candidateIds, ['280002542548'], q);
    assert.ok(r.fonte.includes('ao vivo'), r.fonte);
  }
  // sem apuração ao vivo: o que o pacote (CSV do TSE) tem do candidato, sem inventar o 2º turno
  const off = await responder('Lula foi eleito?', { hoje: POS, apuracao: semAoVivo });
  assert.ok(off.directAnswer.startsWith('LULA (PT, nº 13) — Presidente da República'), off.directAnswer);
  assert.ok(off.directAnswer.includes('1º turno'), off.directAnswer);
  assert.ok(off.directAnswer.includes('resultados.tse.jus.br'), off.directAnswer);
  assert.ok(!noFuturo(off.directAnswer), off.directAnswer);
  // candidato eleito no 1º turno pelo pacote
  const tarc = await responder('Tarcísio foi eleito?', { hoje: POS, apuracao: semAoVivo });
  assert.ok(tarc.directAnswer.startsWith('TARCÍSIO (REPUBLICANOS, nº 10) — Governador em São Paulo, 1º turno'), tarc.directAnswer);
  assert.ok(tarc.directAnswer.includes('— ELEITO'), tarc.directAnswer);
});

test('pós-eleição: abstenção e "a eleição acabou?" são respondidas pelos resultados, com o aviso de que o app não traz os totais de abstenção', async () => {
  const abs = await responder('Qual foi a abstenção no segundo turno?', { hoje: POS, apuracao: ap2tFinal });
  assert.equal(abs.intent, 'RESULTADOS');
  assert.ok(abs.directAnswer.startsWith('Abstenção, comparecimento e votos brancos e nulos: o app não traz esses totais; consulte https://resultados.tse.jus.br/'), abs.directAnswer);
  const fim = await responder('A eleição acabou?', { hoje: POS, apuracao: ap2tFinal });
  assert.equal(fim.intent, 'RESULTADOS');
  assert.ok(fim.directAnswer.includes('Status dos resultados das Eleições 2026'), fim.directAnswer);
});

test('pós-eleição: local de votação vira título, justificativa e multa; nada de "no dia" nem "pode votar no 2º turno"', async () => {
  for (const q of ['Onde voto?', 'Não votei, como justifico?', 'Qual o prazo para justificar?']) {
    const r = await responder(q, { hoje: POS });
    assert.equal(r.intent, 'LOCAL_VOTACAO', q);
    assert.ok(r.directAnswer.startsWith('Título de eleitor e justificativa depois das Eleições 2026 (sistemas oficiais):'), `${q}: ${r.directAnswer}`);
    assert.ok(r.directAnswer.includes('03/12/2026') && r.directAnswer.includes('08/01/2027'), r.directAnswer);
    assert.ok(r.directAnswer.includes('multa'), r.directAnswer);
    assert.ok(!/No dia: leve|pode votar no 2º|vota-se no mesmo local/.test(r.directAnswer), r.directAnswer);
  }
  // antes do fim da eleição o texto antigo continua
  assert.ok((await responder('Onde voto?', { hoje: '2026-10-20' })).directAnswer.includes('No dia: leve documento'));
});

test('calendário traz os prazos pós-eleitorais com fonte oficial (prestação de contas, diplomação, posse)', async () => {
  const r = await responder('Quando é a eleição?', { hoje: POS });
  assert.ok(r.directAnswer.includes('Prestação de contas final: até 03/11/2026 (1º turno) e 14/11/2026 (2º turno) — Lei 9.504/1997, art. 29'), r.directAnswer);
  assert.ok(r.directAnswer.includes('Diplomação dos eleitos: até 18/12/2026 (Res. TSE 23.760/2026)'), r.directAnswer);
  assert.ok(r.directAnswer.includes('Posse: Presidente em 05/01/2027; Governadores em 06/01/2027 (EC 111/2021); Deputados e Senadores em 1º/02/2027'), r.directAnswer);
});
