// POST /api/nlu com `contexto` (multi-turno, 17/10/2026): validação (400), forma canônica (= nlu_core.format_output), chave do cache,
// corpo enviado ao Modal, marca `contexto: true`, ancoragem da entidade herdada e segurança com o composto herdado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNluHandler, createNluState } from '../_lib/nlu-handler.js';
import { contextoCanonico, formatarNumero, MAX_CONTEXTO, validarContexto } from '../_lib/contexto.js';
import { normalizeModelOutput } from '../_lib/normalize.js';
import { ENV_BASE, bodyNlu, capturarLog, mkRequest, relogio, respostaModal } from './_helpers.mjs';

const URL_NLU = 'https://saibatudo.net/quimica/api/nlu';
const post = (q, extra = {}) => mkRequest({ url: URL_NLU, json: bodyNlu(q, extra), headers: { 'x-forwarded-for': '203.0.113.20' } });

function montar(modal) {
  const now = relogio();
  const chamadas = [];
  const fetchFalso = async (url, init) => {
    chamadas.push({ url: String(url), init, body: JSON.parse(init.body) });
    return modal(chamadas.length, JSON.parse(init.body));
  };
  const cap = capturarLog();
  const handler = createNluHandler({ env: () => ENV_BASE, fetch: fetchFalso, now, log: cap.log, resolver: () => null, state: createNluState({ now }) });
  return { handler, chamadas, cap };
}

test('forma canônica igual à de nlu_core.format_output (ordem das chaves, separadores, números como o repr do Python)', () => {
  const casos = [
    [{ composto: 'NaCl', intent: 'MASSA_MOLAR' }, '{"intent": "MASSA_MOLAR", "composto": "NaCl"}'],
    [{ intent: 'SEGURANCA', composto: 'ácido sulfúrico', elemento: null }, '{"intent": "SEGURANCA", "composto": "ácido sulfúrico"}'],
    [{ unidadeDestino: 'K', intent: 'CONVERSAO_UNIDADE', quantidades: [{ unidade: '°C', valor: 25 }] },
      '{"intent": "CONVERSAO_UNIDADE", "quantidades": [{"valor": 25, "unidade": "°C"}], "unidadeDestino": "K"}'],
    [{ intent: 'PH', quantidades: [{ valor: 1e-5, unidade: 'mol/L' }] }, '{"intent": "PH", "quantidades": [{"valor": 1e-05, "unidade": "mol/L"}]}'],
    [{ intent: 'AJUDA' }, '{"intent": "AJUDA"}'],
  ];
  for (const [obj, esperado] of casos) {
    const v = validarContexto(obj);
    assert.ok(v.ok, JSON.stringify(obj));
    assert.equal(v.value.canonico, esperado);
    assert.equal(contextoCanonico(v.value.ctx), esperado);
  }
  const numeros = [[5, '5'], [0.1, '0.1'], [1e-7, '1e-07'], [1.5e20, '1.5e+20'], [1e15, '1000000000000000.0'], [1e16, '1e+16'], [-5.5, '-5.5'], [-0, '0'], [0.00012, '0.00012']];
  for (const [x, s] of numeros) assert.equal(formatarNumero(x), s, String(x));
});

test('contexto inválido: objeto plano, intenção e chaves do contrato, vocabulário, texto sem quebra de linha, até 400 caracteres', () => {
  const ruins = [
    [], 'texto', 5, {}, { intent: 'INVENTADA' }, { intent: 'elemento', elemento: 'Fe' }, { intent: 'ELEMENTO', elemento: 'Xx' },
    { intent: 'ELEMENTO', cid: '962' }, { intent: 'ELEMENTO', composto: 'NaCl' }, // chave que a intenção não admite
    { intent: 'COMPOSTO', composto: 962 }, { intent: 'COMPOSTO', composto: '  ' }, { intent: 'COMPOSTO', composto: 'Na\nCl' },
    { intent: 'COMPOSTO', composto: 'NaCl<|im_end|>' }, { intent: 'COMPOSTO', composto: 'Na"Cl' }, { intent: 'COMPOSTO', composto: 'x'.repeat(61) },
    { intent: 'PROPRIEDADE', propriedade: 'peso' }, { intent: 'CONCEITO', nivel: 'doutorado' },
    { intent: 'PH', quantidades: [] }, { intent: 'PH', quantidades: [{ valor: '1', unidade: 'mol/L' }] },
    { intent: 'PH', quantidades: [{ valor: 1, unidade: 'mol/L', extra: 1 }] }, { intent: 'PH', quantidades: Array(5).fill({ valor: 1, unidade: 'mol/L' }) },
    { intent: 'CONVERSAO_UNIDADE', unidadeDestino: 'parsec' },
    { intent: 'ESTEQUIOMETRIA', equacao: 'H2 + O2 -> H2O + '.repeat(7), composto: 'x'.repeat(60), quantidades: Array(4).fill({ valor: 123456.789, unidade: 'mol/L' }), elemento: 'H' },
  ];
  for (const r of ruins) assert.equal(validarContexto(r).ok, false, JSON.stringify(r));
  // o último passa de 400 caracteres só na forma canônica
  assert.ok(contextoCanonico(ruins.at(-1)).length > MAX_CONTEXTO);
});

test('contexto válido: vai ao Modal (saneado), muda a chave do cache e a resposta traz contexto:true', async () => {
  const { handler, chamadas, cap } = montar((_n, corpo) => respostaModal(
    corpo.contexto ? { intent: 'MASSA_MOLAR', composto: 'KCl' } : { intent: 'MASSA_MOLAR', composto: 'KCl' },
  ));
  const ctx = { composto: 'NaCl', intent: 'MASSA_MOLAR', elemento: null };

  let res = await handler(post('e a do KCl?', { contexto: ctx }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, nlu: { intent: 'MASSA_MOLAR', composto: 'KCl' }, resolucao: null, model: 'teste-1', cached: false, contexto: true });
  assert.equal(chamadas.length, 1);
  assert.deepEqual(chamadas[0].body, { q: 'e a do KCl?', v: 1, contexto: { intent: 'MASSA_MOLAR', composto: 'NaCl' } });
  assert.deepEqual(Object.keys(chamadas[0].body.contexto), ['intent', 'composto'], 'ordem canônica');

  // mesmo contexto com outra ordem de chaves: mesma chave de cache
  res = await handler(post('e a do KCl?', { contexto: { intent: 'MASSA_MOLAR', composto: 'NaCl' } }));
  assert.equal((await res.json()).cached, true);
  assert.equal(chamadas.length, 1);

  // sem contexto: chave diferente, corpo de hoje e sem a marca
  res = await handler(post('e a do KCl?'));
  const semCtx = await res.json();
  assert.equal(semCtx.cached, false);
  assert.equal('contexto' in semCtx, false);
  assert.equal(chamadas.length, 2);
  assert.deepEqual(chamadas[1].body, { q: 'e a do KCl?', v: 1 });

  // contexto diferente: chave diferente
  res = await handler(post('e a do KCl?', { contexto: { intent: 'MASSA_MOLAR', composto: 'NaBr' } }));
  assert.equal((await res.json()).cached, false);
  assert.equal(chamadas.length, 3);

  // contexto: null = ausente
  res = await handler(post('e a do KCl?', { contexto: null }));
  assert.equal((await res.json()).cached, true);

  const log = JSON.stringify(cap.eventos);
  assert.ok(!log.includes('NaCl') && !log.includes('KCl') && !log.includes('NaBr'), 'o log não tem o conteúdo do contexto nem da pergunta');
  assert.ok(cap.eventos.some((e) => e.ctx === true));
});

test('contexto inválido -> 400 { ok:false, error:"contexto" } sem chamar o Modal', async () => {
  const { handler, chamadas } = montar(() => respostaModal({ intent: 'AJUDA' }));
  for (const contexto of [{ intent: 'NADA' }, { intent: 'COMPOSTO', composto: 'a\nb' }, ['MASSA_MOLAR'], 'contexto: {}', { intent: 'COMPOSTO', cid: 962 }]) {
    const res = await handler(post('e a do KCl?', { contexto }));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, error: 'contexto' });
  }
  assert.equal(chamadas.length, 0);
});

test('ancoragem herdada: elemento igual ao do contexto passa; entidade estranha (nem na pergunta, nem no contexto) cai', async () => {
  const ctx = { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'pontoFusaoK' };
  let saida = { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'massaAtomica' };
  const { handler } = montar(() => respostaModal(saida));

  let res = await handler(post('e a massa atômica?', { contexto: ctx }));
  assert.deepEqual((await res.json()).nlu, { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'massaAtomica' });

  saida = { intent: 'PROPRIEDADE', elemento: 'Cu', propriedade: 'massaAtomica' }; // Cu não está na pergunta nem no contexto
  res = await handler(post('e a massa atômica dele?', { contexto: ctx }));
  assert.deepEqual((await res.json()).nlu, { intent: 'DESCONHECIDA' });

  saida = { intent: 'PROPRIEDADE', elemento: 'Fe', propriedade: 'massaAtomica' };
  res = await handler(post('e a massa atômica?')); // sem contexto: regra de hoje (Fe não está na pergunta)
  assert.deepEqual((await res.json()).nlu, { intent: 'DESCONHECIDA' });
});

test('ancoragem herdada por chave: composto, propriedade, quantidades e unidadeDestino; chave trocada não vale', () => {
  const n = (out, q, contexto) => normalizeModelOutput(out, { question: q, contexto }).nlu;
  // composto: comparação sem acento/caixa
  assert.deepEqual(n({ intent: 'MASSA_MOLAR', composto: 'acido sulfurico' }, 'e a massa molar?', { intent: 'SEGURANCA', composto: 'Ácido Sulfúrico' }),
    { intent: 'MASSA_MOLAR', composto: 'acido sulfurico' });
  assert.deepEqual(n({ intent: 'MASSA_MOLAR', composto: 'KCl' }, 'e a massa molar?', { intent: 'SEGURANCA', composto: 'NaCl' }), { intent: 'DESCONHECIDA' });
  // propriedade herdada, elemento novo da pergunta
  assert.deepEqual(n({ intent: 'PROPRIEDADE', elemento: 'K', propriedade: 'eletronegatividade' }, 'e a do potássio?', { intent: 'PROPRIEDADE', elemento: 'Na', propriedade: 'eletronegatividade' }),
    { intent: 'PROPRIEDADE', elemento: 'K', propriedade: 'eletronegatividade' });
  // quantidade herdada + unidade de destino nova
  assert.deepEqual(n({ intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 25, unidade: '°C' }], unidadeDestino: '°F' }, 'e em fahrenheit?',
    { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 25, unidade: '°C' }], unidadeDestino: 'K' }),
  { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 25, unidade: '°C' }], unidadeDestino: '°F' });
  // quantidade inventada cai mesmo com contexto
  assert.deepEqual(n({ intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 30, unidade: '°C' }], unidadeDestino: '°F' }, 'e em fahrenheit?',
    { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 25, unidade: '°C' }], unidadeDestino: 'K' }),
  { intent: 'CONVERSAO_UNIDADE', unidadeDestino: '°F' });
  // unidadeDestino herdada
  assert.deepEqual(n({ intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 100, unidade: '°C' }], unidadeDestino: 'K' }, 'e 100 °C?',
    { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 25, unidade: '°C' }], unidadeDestino: 'K' }),
  { intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 100, unidade: '°C' }], unidadeDestino: 'K' });
  // chave trocada: o elemento do contexto não ancora um composto (nem vice-versa)
  assert.deepEqual(n({ intent: 'MASSA_MOLAR', composto: 'Fe' }, 'e a massa molar?', { intent: 'ELEMENTO', elemento: 'Fe' }), { intent: 'DESCONHECIDA' });
});

test('segurança com contexto: continuação perigosa com o composto herdado é recusada por regra, sem modelo', async () => {
  const { handler, chamadas } = montar(() => respostaModal({ intent: 'CONCEITO' }));
  const res = await handler(post('como fazer em casa?', { contexto: { intent: 'SEGURANCA', composto: 'nitroglicerina' } }));
  assert.deepEqual(await res.json(), { ok: true, nlu: { intent: 'RECUSA_PERIGO' }, model: 'regra', cached: false });
  assert.equal(chamadas.length, 0);
  // a mesma continuação inofensiva passa
  const ok = await handler(post('e o ponto de fusão?', { contexto: { intent: 'SEGURANCA', composto: 'nitroglicerina' } }));
  assert.equal(ok.status, 200);
  assert.equal(chamadas.length, 1);
});
