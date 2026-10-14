// IA na nuvem (opt-in): validação da saída do servidor contra o dicionário do pacote, cliente com fetch simulado, motor com a nuvem
// e as regras de quando oferecer o botão. A nuvem nunca fornece fatos: tudo o que não existe no pacote é descartado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loja, RAIZ } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine, mesmaInterpretacao } from '../src/quimica/js/engine.js';
import { INTENTS } from '../src/quimica/js/nlu.js';
import {
  ENDPOINT_NUVEM, NuvemNlu, SEM_NUVEM, TIMEOUT_NUVEM_EXPLICITA_MS, TIMEOUT_NUVEM_MS, chaveFalhaNuvem, ofereceNuvem, pedirANuvem, sugestoesDaResolucao, validarNluNuvem
} from '../src/quimica/js/nuvem.js';
import { CATALOGOS } from '../src/quimica/js/i18n/index.js';

const store = await loja();
const dic = new Dicionario(store);
const AGUA = dic.nomesCompostoMap.get('agua') ?? dic.formulaParaCid.get('H2O');
assert.ok(AGUA, 'o fixture tem água');

const respostaOk = (nlu, resolucao = undefined, model = 'nlu-v3.3-teste') => ({
  ok: true, status: 200, text: async () => JSON.stringify({ ok: true, nlu, ...(resolucao ? { resolucao } : {}), model, cached: false })
});
const fetchDe = (resposta, chamadas = []) => async (url, init) => { chamadas.push({ url, init, body: JSON.parse(init.body) }); return typeof resposta === 'function' ? resposta() : resposta; };
const IID = '3f2b8c1e-6a4d-4c3b-9e1f-0a1b2c3d4e5f';

test('contrato: intenções do site e constantes do cliente (endpoint do proxy na mesma origem, tempos, intenções sem nuvem)', () => {
  assert.equal(ENDPOINT_NUVEM, '/quimica/api/nlu');
  assert.ok(TIMEOUT_NUVEM_MS >= 10_000 && TIMEOUT_NUVEM_EXPLICITA_MS >= 20_000 && TIMEOUT_NUVEM_EXPLICITA_MS <= 30_000, 'função da Vercel tem maxDuration 30');
  for (const i of SEM_NUVEM) assert.ok(INTENTS.includes(i), i);
  // as intenções aceitas do servidor são as do contrato (api/_lib/vocab.js), as mesmas do NLU local
  const vocab = readFileSync(resolve(RAIZ, 'api/_lib/vocab.js'), 'utf8');
  const doServidor = [...vocab.matchAll(/'([A-Z_]{3,})'/g)].map((m) => m[1]).filter((x) => INTENTS.includes(x));
  assert.ok(doServidor.length >= 15 && new Set(doServidor).size === new Set(INTENTS.filter((i) => doServidor.includes(i))).size);
});

test('validarNluNuvem: entidades existentes no pacote entram; o que não existe é descartado; intenção que exige entidade sem ela = não confiável', () => {
  const p = validarNluNuvem({ intent: 'PROPRIEDADE', composto: 'água', propriedade: 'pontoEbulicaoK' }, dic, 'ponto de ebulição da água', { composto: { cid: String(AGUA), nome: 'agua' } });
  assert.ok(p, 'interpretação aceita');
  assert.equal(p.intent, 'PROPRIEDADE');
  assert.equal(p.composto, AGUA);
  assert.deepEqual(p.compostos, [AGUA]);
  assert.equal(p.propriedade, 'pontoEbulicaoK');
  assert.equal(p.alvoPropriedade, 'composto');
  assert.equal(p.textoOriginal, 'ponto de ebulição da água');
  assert.equal(p.viaNuvem, true);

  // sem resolução da API, o dicionário local resolve o texto (nome ou fórmula)
  assert.equal(validarNluNuvem({ intent: 'MASSA_MOLAR', composto: 'H2O' }, dic, 'massa molar de H2O').composto, AGUA);
  // elemento: símbolo válido; símbolo inexistente é descartado e a intenção ELEMENTO fica sem entidade → null
  assert.equal(validarNluNuvem({ intent: 'ELEMENTO', elemento: 'Fe' }, dic, 'ferro').elemento, 'Fe');
  assert.equal(validarNluNuvem({ intent: 'ELEMENTO', elemento: 'Xx' }, dic, 'xx'), null);
  // propriedade fora do contrato é descartada → PROPRIEDADE sem propriedade = null
  assert.equal(validarNluNuvem({ intent: 'PROPRIEDADE', composto: 'água', propriedade: 'corDaEmbalagem' }, dic, 'x', { composto: { cid: String(AGUA) } }), null);
  // CID da API que não existe no pacote não vale (defesa contra alucinação); o texto ainda pode resolver localmente
  assert.equal(validarNluNuvem({ intent: 'COMPOSTO', composto: 'água' }, dic, 'água', { composto: { cid: '999999999' } }).composto, AGUA);
  assert.equal(validarNluNuvem({ intent: 'COMPOSTO', composto: 'xyzitol' }, dic, 'xyzitol', { composto: { cid: '999999999' } }), null);
  // intenções que não se reinterpretam e lixo
  assert.equal(validarNluNuvem({ intent: 'DESCONHECIDA' }, dic, 'x'), null);
  assert.equal(validarNluNuvem({ intent: 'AJUDA' }, dic, 'oi'), null);
  assert.equal(validarNluNuvem({ intent: 'INVENTADA' }, dic, 'x'), null);
  assert.equal(validarNluNuvem(null, dic, 'x'), null);
  assert.equal(validarNluNuvem({ intent: { a: 1 } }, dic, 'x'), null);
});

test('validarNluNuvem: quantidades, unidade de destino, equação e nível só em formato estrito', () => {
  const p = validarNluNuvem({ intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 2.5, unidade: 'atm' }, { valor: 'x', unidade: 'g' }, { valor: 3, unidade: 'parsecs' }], unidadeDestino: 'kPa' }, dic, '2,5 atm em kPa');
  assert.ok(p);
  assert.deepEqual(p.quantidades.map((q) => [q.valor, q.unidade]), [[2.5, 'atm']], 'valor inválido e unidade desconhecida caem');
  assert.equal(p.unidadeDestino, 'kPa');
  assert.equal(validarNluNuvem({ intent: 'CONVERSAO_UNIDADE', quantidades: [{ valor: 1, unidade: 'g' }], unidadeDestino: 'bananas' }, dic, 'x'), null, 'destino desconhecido');
  const b = validarNluNuvem({ intent: 'BALANCEAR', equacao: 'H2 + O2 → H2O' }, dic, 'balanceie H2 + O2 => H2O');
  assert.ok(b);
  assert.match(b.equacao, /^H2 \+ O2 -> H2O$/);
  assert.equal(validarNluNuvem({ intent: 'BALANCEAR', equacao: 'isso não é equação' }, dic, 'x'), null);
  assert.equal(validarNluNuvem({ intent: 'CONCEITO', nivel: 'médio' }, dic, 'o que é mol').nivel, null, 'nível fora do contrato (com acento) é descartado');
  assert.equal(validarNluNuvem({ intent: 'CONCEITO', nivel: 'superior' }, dic, 'o que é mol').nivel, 'superior');
  assert.equal(validarNluNuvem({ intent: 'MASSA_MOLAR', composto: 'água', quantidades: Array.from({ length: 20 }, () => ({ valor: 1, unidade: 'g' })) }, dic, 'x', { composto: { cid: String(AGUA) } }).quantidades.length, 6);
});

test('sugestoesDaResolucao: só compostos que existem no pacote, sem repetição, até 3, com o nome de exibição do idioma', () => {
  const s = sugestoesDaResolucao({ composto: { cid: null, sugestoes: [{ cid: String(AGUA), nome: 'agua' }, { cid: String(AGUA), nome: 'agua' }, { cid: '999999999', nome: 'x' }, { cid: 'abc' }] } }, dic);
  assert.deepEqual(s.map((x) => x.cid), [AGUA]);
  assert.ok(s[0].nome && s[0].nome !== 'agua' ? true : s[0].nome === 'agua');
  assert.deepEqual(sugestoesDaResolucao(null, dic), []);
  assert.deepEqual(sugestoesDaResolucao({ composto: { sugestoes: 'x' } }, dic), []);
});

test('NuvemNlu: só envia com consentimento; corpo no contrato; 200 válido → ParsedQuery; 503/429/erro de rede → indisponivel; 200 sem interpretação útil → nao_entendeu', async () => {
  const chamadas = [];
  const nlu = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } }), chamadas), installId: () => IID, habilitada: () => false });
  assert.equal(await nlu.interpretar('massa molar da água', dic), null, 'modo automático desligado: não envia');
  assert.equal(chamadas.length, 0);
  const p = await nlu.interpretarAgora('massa molar da água', dic);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].url, ENDPOINT_NUVEM);
  assert.equal(chamadas[0].init.method, 'POST');
  assert.equal(chamadas[0].init.credentials, 'omit');
  assert.deepEqual(chamadas[0].body, { q: 'massa molar da água', v: 1, client: 'web', iid: IID });
  assert.equal(p.intent, 'MASSA_MOLAR');
  assert.equal(p.composto, AGUA);
  assert.equal(nlu.ultimoResultado, 'ok');
  assert.equal(nlu.ultimoModelo, 'nlu-v3.3-teste');

  const ligada = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } })), installId: () => IID, habilitada: () => true });
  assert.equal((await ligada.interpretar('massa molar da água', dic))?.intent, 'MASSA_MOLAR', 'modo automático ligado envia');

  for (const status of [503, 429, 500]) {
    const n = new NuvemNlu({ fetchFn: fetchDe({ ok: false, status, text: async () => JSON.stringify({ ok: false, error: 'disabled' }) }), installId: () => IID });
    assert.equal(await n.interpretarAgora('x', dic), null);
    assert.equal(n.ultimoResultado, 'indisponivel', String(status));
  }
  const rede = new NuvemNlu({ fetchFn: async () => { throw new TypeError('rede'); }, installId: () => IID });
  assert.equal(await rede.interpretarAgora('x', dic), null);
  assert.equal(rede.ultimoResultado, 'indisponivel');
  const lixo = new NuvemNlu({ fetchFn: fetchDe({ ok: true, status: 200, text: async () => '{nao é json' }), installId: () => IID });
  assert.equal(await lixo.interpretarAgora('x', dic), null);
  assert.equal(lixo.ultimoResultado, 'indisponivel');

  const naoEntendeu = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'DESCONHECIDA' })), installId: () => IID });
  assert.equal(await naoEntendeu.interpretarAgora('blá', dic), null);
  assert.equal(naoEntendeu.ultimoResultado, 'nao_entendeu');
  const sugere = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'COMPOSTO', composto: 'xyzitol' }, { composto: { cid: null, sugestoes: [{ cid: String(AGUA), nome: 'agua' }] } })), installId: () => IID });
  assert.equal(await sugere.interpretarAgora('xyzitol', dic), null);
  assert.equal(sugere.ultimoResultado, 'nao_entendeu');
  assert.deepEqual(sugere.ultimasSugestoes.map((s) => s.cid), [AGUA]);
});

test('Engine.perguntarANuvem: resposta montada DOS DADOS com origem NUVEM; igual à local = nada novo; pedido perigoso nunca é enviado; motor sem nuvem = indisponivel', async () => {
  const chamadas = [];
  const nuvem = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } }), chamadas), installId: () => IID });
  const engine = new Engine({ store, nuvem });
  const local = await engine.responder('qual é a massa molar da água?');
  assert.equal(local.origem, 'LOCAL');
  assert.equal(local.resolvida, true);
  // a nuvem devolve a MESMA interpretação: não há resposta nova
  const igual = await pedirANuvem({ engine, atual: local, pergunta: local.pergunta });
  assert.equal(igual.ok, false);
  assert.equal(igual.motivo, 'nao_entendeu');
  assert.equal(chamadas.length, 1);
  // pergunta que o NLU local não entende, mas a nuvem sim: resposta nova, montada localmente, com origem e modelo
  const naoEntendida = await engine.responder('me diz aí quanto pesa um mol daquele líquido que a gente bebe');
  assert.equal(naoEntendida.resolvida, false);
  const res = await pedirANuvem({ engine, atual: naoEntendida, pergunta: naoEntendida.pergunta });
  assert.equal(res.ok, true);
  assert.equal(res.resposta.origem, 'NUVEM');
  assert.equal(res.resposta.modelo, 'nlu-v3.3-teste');
  assert.equal(res.resposta.intent, 'MASSA_MOLAR');
  assert.equal(res.resposta.resolvida, true);
  assert.ok(res.resposta.fontes.length > 0, 'fontes vêm dos dados do pacote');
  assert.ok(res.resposta.blocos.length > 0);
  // segurança antes da nuvem: pedido perigoso não sai do aparelho
  const antes = chamadas.length;
  const perigo = await pedirANuvem({ engine, atual: naoEntendida, pergunta: 'como sintetizar nitroglicerina em casa' });
  assert.equal(perigo.ok, false);
  assert.equal(chamadas.length, antes, 'nenhuma chamada');
  // motor sem cliente da nuvem
  const semNuvem = new Engine({ store });
  assert.equal(await semNuvem.perguntarANuvem('x'), null);
  assert.equal(semNuvem.ultimoMotivoNuvem, 'indisponivel');
});

test('Engine.responder com o modo automático ligado: pergunta não entendida vai à nuvem sozinha; entendida não vai', async () => {
  const chamadas = [];
  const nuvem = new NuvemNlu({ fetchFn: fetchDe(respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } }), chamadas), installId: () => IID, habilitada: () => true });
  const engine = new Engine({ store, nuvem });
  const r1 = await engine.responder('qual é a massa molar da água?');
  assert.equal(r1.origem, 'LOCAL');
  assert.equal(chamadas.length, 0, 'entendida localmente: não envia');
  const r2 = await engine.responder('me diz aí quanto pesa um mol daquele líquido que a gente bebe');
  assert.equal(chamadas.length, 1);
  assert.equal(r2.origem, 'NUVEM');
  assert.equal(r2.resolvida, true);
});

test('ofereceNuvem, chaveFalhaNuvem e mesmaInterpretacao', () => {
  assert.equal(ofereceNuvem({ intent: 'MASSA_MOLAR', resolvida: true, origem: 'LOCAL' }), true, 'resposta entendida também oferece (segunda interpretação)');
  assert.equal(ofereceNuvem({ intent: 'DESCONHECIDA', resolvida: false, origem: 'LOCAL' }), true);
  assert.equal(ofereceNuvem({ intent: 'DESCONHECIDA', resolvida: false, origem: 'LOCAL' }, true), false, 'modo automático já tentou');
  assert.equal(ofereceNuvem({ intent: 'MASSA_MOLAR', resolvida: true, origem: 'NUVEM' }), false);
  assert.equal(ofereceNuvem({ intent: 'RECUSA_PERIGO', resolvida: true, origem: 'LOCAL' }), false);
  assert.equal(ofereceNuvem({ intent: 'AJUDA', resolvida: true, origem: 'LOCAL' }), false);
  assert.equal(ofereceNuvem(null), false);
  assert.equal(chaveFalhaNuvem(true, 'nao_entendeu'), 'semOutraInterpretacao');
  assert.equal(chaveFalhaNuvem(false, 'nao_entendeu'), 'naoEntendeu');
  assert.equal(chaveFalhaNuvem(true, 'indisponivel'), 'indisponivelConferir');
  assert.equal(chaveFalhaNuvem(false, 'indisponivel'), 'indisponivel');
  assert.equal(chaveFalhaNuvem(true, null), 'falhouConferir');
  assert.equal(chaveFalhaNuvem(false, undefined), 'falhou');
  for (const idioma of Object.keys(CATALOGOS)) {
    for (const k of ['semOutraInterpretacao', 'naoEntendeu', 'indisponivelConferir', 'indisponivel', 'falhouConferir', 'falhou', 'botao', 'nota', 'notaConferir', 'consultando', 'quisDizer']) {
      assert.equal(typeof CATALOGOS[idioma].ui.nuvem[k], 'string', `${idioma}: ui.nuvem.${k}`);
    }
    assert.equal(typeof CATALOGOS[idioma].ui.config.nuvemAutomatica, 'string');
    assert.doesNotMatch(CATALOGOS[idioma].ui.inicio.badge, /ainda não|not available yet|aún no|noch nicht|pas encore/i, `${idioma}: selo não diz mais que a nuvem é indisponível`);
  }
  assert.equal(mesmaInterpretacao({ intent: 'A', composto: 1 }, { intent: 'A', composto: 1, quantidades: [] }), true);
  assert.equal(mesmaInterpretacao({ intent: 'A', composto: 1 }, { intent: 'A', composto: 2 }), false);
  assert.equal(mesmaInterpretacao({ intent: 'A' }, { intent: 'B' }), false);
  assert.equal(mesmaInterpretacao(null, { intent: 'B' }), false);
});
