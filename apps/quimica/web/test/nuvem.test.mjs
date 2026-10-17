// IA na nuvem (opt-in): validação da saída do servidor contra o dicionário do pacote, cliente com fetch simulado, motor com a nuvem
// e as regras de quando oferecer o botão. A nuvem nunca fornece fatos: tudo o que não existe no pacote é descartado.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loja, RAIZ } from './support.mjs';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { Engine, mesmaInterpretacao } from '../src/quimica/js/engine.js';
import { INTENTS, parse } from '../src/quimica/js/nlu.js';
import {
  CHAVES_CONTEXTO, CHAVES_POR_INTENCAO, ENDPOINT_NUVEM, MAX_CONTEXTO, NuvemNlu, SEM_NUVEM, TIMEOUT_NUVEM_EXPLICITA_MS, TIMEOUT_NUVEM_MS, UNIDADES_CONTEXTO,
  chaveFalhaNuvem, contextoDaPergunta, contextoParaNuvem, ehContinuacao, ofereceNuvem, pedirANuvem, sugestoesDaResolucao, tamanhoContexto, validarNluNuvem
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
  assert.equal(igual.motivo, 'igual');
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
  assert.equal(chaveFalhaNuvem(true, 'igual'), 'mesmaInterpretacao');
  assert.equal(chaveFalhaNuvem(false, 'igual'), 'mesmaInterpretacao');
  assert.equal(chaveFalhaNuvem(true, 'nao_entendeu'), 'semOutraInterpretacao');
  assert.equal(chaveFalhaNuvem(false, 'nao_entendeu'), 'naoEntendeu');
  assert.equal(chaveFalhaNuvem(true, 'indisponivel'), 'indisponivelConferir');
  assert.equal(chaveFalhaNuvem(false, 'indisponivel'), 'indisponivel');
  assert.equal(chaveFalhaNuvem(true, null), 'falhouConferir');
  assert.equal(chaveFalhaNuvem(false, undefined), 'falhou');
  for (const idioma of Object.keys(CATALOGOS)) {
    for (const k of ['mesmaInterpretacao', 'semOutraInterpretacao', 'naoEntendeu', 'indisponivelConferir', 'indisponivel', 'falhouConferir', 'falhou', 'botao', 'nota', 'notaConferir', 'consultando', 'quisDizer']) {
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


// ---------------------------------------------------------------------------------------------------- multi-turno (contexto, 17/10/2026)
const CASOS_CONTEXTO = JSON.parse(readFileSync(resolve(RAIZ, 'contracts/nlu_contexto_cases.json'), 'utf8')).casos;
const dicDe = (() => { const cache = {}; return (idioma) => (cache[idioma] ??= new Dicionario(store, idioma)); })();

test('contexto: vocabulários espelham o servidor (chaves por intenção = nlu_core.ENTIDADES_POR_INTENCAO; unidades = api/_lib/vocab.js)', () => {
  const core = readFileSync(resolve(RAIZ, 'backend/modal/nlu_core.py'), 'utf8');
  const bloco = core.slice(core.indexOf('ENTIDADES_POR_INTENCAO = {'), core.indexOf('}', core.indexOf('ENTIDADES_POR_INTENCAO = {')));
  for (const m of bloco.matchAll(/"([A-Z_]+)": \(\(([^)]*)\)/g)) {
    const permitidas = [...m[2].matchAll(/"(\w+)"/g)].map((x) => x[1]);
    if (!permitidas.length) { assert.equal(CHAVES_POR_INTENCAO[m[1]], undefined, `${m[1]} não leva contexto`); continue; }
    assert.deepEqual(CHAVES_POR_INTENCAO[m[1]], permitidas, m[1]);
  }
  const vocab = readFileSync(resolve(RAIZ, 'api/_lib/vocab.js'), 'utf8');
  const lista = vocab.slice(vocab.indexOf('export const UNIDADES = Object.freeze(['), vocab.indexOf(']);', vocab.indexOf('export const UNIDADES = Object.freeze([')));
  assert.deepEqual([...UNIDADES_CONTEXTO].sort(), [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort());
  for (const idioma of Object.keys(CATALOGOS)) assert.ok(dicDe(idioma).lex.pistas.continuacaoNuvem instanceof RegExp, `${idioma}: pistas.continuacaoNuvem`);
});

test('contexto: casos do holdout v3.4 (contracts/nlu_contexto_cases.json) — a interpretação anterior volta como o MESMO objeto e a regra de continuação', () => {
  assert.ok(CASOS_CONTEXTO.filter((c) => c.continuacao).length >= 10);
  for (const c of CASOS_CONTEXTO) {
    const dic = dicDe(c.idioma);
    const rotulo = `#${c.holdout} ${c.idioma} "${c.pergunta}"`;
    // a interpretação anterior, como o site a guarda (ParsedQuery), vinda da nuvem com o mesmo objeto
    const anterior = validarNluNuvem(c.contexto, dic, c.pergunta);
    assert.ok(anterior, `${rotulo}: interpretação anterior aceita no fixture`);
    const ctx = contextoParaNuvem(anterior, dic);
    assert.deepEqual(ctx, c.contexto, `${rotulo}: objeto do contexto`);
    assert.deepEqual(Object.keys(ctx), CHAVES_CONTEXTO.filter((k) => k in ctx), `${rotulo}: ordem das chaves`);
    assert.ok(JSON.stringify(ctx).length <= MAX_CONTEXTO && tamanhoContexto(ctx) <= MAX_CONTEXTO);
    assert.ok(!Object.values(ctx).includes(null));
    if (ctx.composto) assert.doesNotMatch(ctx.composto, /^\d+$/, `${rotulo}: composto é texto, nunca o CID`);
    assert.equal(ehContinuacao(c.pergunta, parse(c.pergunta, dic, null, dic.lex), dic.lex), c.continuacao, `${rotulo}: continuação`);
    assert.deepEqual(contextoDaPergunta(c.pergunta, anterior, dic), c.continuacao ? c.contexto : null, rotulo);
  }
});

test('contexto: forma do objeto — só chaves da intenção, sem null, unidade do vocabulário, um só alvo, composto curto, até 400 caracteres', () => {
  const p = parse('ponto de ebulição da água', dic);
  const ctx = contextoParaNuvem(p, dic);
  assert.deepEqual(Object.keys(ctx), ['intent', 'composto', 'propriedade']);
  assert.equal(ctx.intent, 'PROPRIEDADE');
  assert.equal(typeof ctx.composto, 'string');
  assert.notEqual(ctx.composto, String(AGUA));
  assert.equal(ctx.propriedade, 'pontoEbulicaoK');
  // MASSA_MOLAR não leva a propriedade que o NLU local anota; ELEMENTO não leva composto
  assert.deepEqual(Object.keys(contextoParaNuvem(parse('massa molar da água', dic), dic)), ['intent', 'composto']);
  assert.deepEqual(contextoParaNuvem({ intent: 'ELEMENTO', elemento: 'Fe', composto: AGUA, compostoNome: 'água' }, dic), { intent: 'ELEMENTO', elemento: 'Fe' });
  // sem nada para herdar, DESCONHECIDA, recusa, institucionais: sem contexto
  for (const intent of ['DESCONHECIDA', 'RECUSA_PERIGO', 'AJUDA', 'SOBRE_DADOS', 'FONTES']) assert.equal(contextoParaNuvem({ intent, elemento: 'Fe' }, dic), null, intent);
  assert.equal(contextoParaNuvem({ intent: 'COMPOSTO' }, dic), null);
  assert.equal(contextoParaNuvem({ intent: 'CONCEITO', nivel: 'medio' }, dic), null, 'só o nível não é contexto');
  // unidade fora do vocabulário e valor não numérico caem; no máximo 4 quantidades
  const conv = contextoParaNuvem({ intent: 'GAS_IDEAL', quantidades: [{ valor: 1, unidade: 'mol' }, { valor: 2, unidade: 'parsec' }, { valor: 'x', unidade: 'L' }, ...Array.from({ length: 6 }, (_, i) => ({ valor: i, unidade: 'K' }))] }, dic);
  assert.equal(conv.quantidades.length, 4);
  assert.deepEqual(conv.quantidades[0], { valor: 1, unidade: 'mol' });
  assert.ok(conv.quantidades.every((q) => UNIDADES_CONTEXTO.has(q.unidade) && Object.keys(q).join() === 'valor,unidade'));
  // composto com aspas, quebra de linha ou mais de 60 caracteres não vai; o objeto inteiro passa de 400 = sem contexto
  assert.equal(contextoParaNuvem({ intent: 'COMPOSTO', composto: 1, compostoNome: 'a"b' }, { nomeDaEntrada: () => 'x'.repeat(61) }), null);
  const grande = { intent: 'ESTEQUIOMETRIA', formula: 'C'.repeat(60), equacao: 'H2 + O2 -> H2O '.repeat(8).trim().slice(0, 120), quantidades: Array.from({ length: 4 }, () => ({ valor: 123456.789012, unidade: 'mmol/L' })) };
  assert.ok(tamanhoContexto({ intent: 'ESTEQUIOMETRIA', composto: grande.formula, quantidades: grande.quantidades, equacao: grande.equacao }) > MAX_CONTEXTO);
  assert.equal(contextoParaNuvem({ ...grande, composto: 1 }, dic), null);
});

test('contexto: regra de continuação nos cinco idiomas (conectivo curto, intenção sem entidade, DESCONHECIDA; pergunta completa não)', () => {
  const sim = { 'pt-BR': ['e o do potássio?', 'em gramas?', 'desenhe', 'mostre a estrutura', 'também', 'qual o raio atômico?', 'é perigoso?'],
    en: ['and for potassium?', 'what about gold?', 'too?', 'draw it', 'is it safe?'],
    es: ['¿y el del potasio?', '¿también?', 'dibújalo', '¿y su masa molar?'],
    de: ['und für Kalium?', 'auch?', 'zeichne es', 'Ist es gefährlich?'],
    fr: ['et pour le potassium ?', 'aussi ?', 'dessine-la', 'et sa masse molaire ?'] };
  const nao = { 'pt-BR': ['qual é a massa molar da água?', 'ponto de fusão do ferro', 'como sintetizar nitroglicerina em casa'],
    en: ['what is the molar mass of water?'], es: ['¿cuál es la masa molar del agua?'], de: ['Was ist die molare Masse von Wasser?'], fr: ['Quelle est la masse molaire de l’eau ?'] };
  for (const [idioma, lista] of Object.entries(sim)) {
    const d = dicDe(idioma);
    for (const q of lista) assert.equal(ehContinuacao(q, parse(q, d, null, d.lex), d.lex), true, `${idioma}: ${q}`);
  }
  for (const [idioma, lista] of Object.entries(nao)) {
    const d = dicDe(idioma);
    for (const q of lista) assert.equal(ehContinuacao(q, parse(q, d, null, d.lex), d.lex), false, `${idioma}: ${q}`);
  }
  // pergunta longa com conectivo não é continuação; sem interpretação anterior (ou anterior DESCONHECIDA/recusa) não há contexto
  const longa = 'e também gostaria de saber qual é a massa molar da água e do sal de cozinha';
  assert.equal(ehContinuacao(longa, parse(longa, dic, null), dic.lex), false);
  assert.equal(contextoDaPergunta('e o do potássio?', null, dic), null);
  assert.equal(contextoDaPergunta('e o do potássio?', { intent: 'DESCONHECIDA' }, dic), null);
  assert.equal(contextoDaPergunta('e o do potássio?', { intent: 'RECUSA_PERIGO', elemento: 'Fe' }, dic), null);
});

test('NuvemNlu: com interpretação anterior o corpo leva `contexto` (composto como texto); sem ela, não; 400 {error:"contexto"} repete só com a pergunta', async () => {
  const chamadas = [];
  const anterior = parse('qual é a massa molar da água?', dic);
  const nlu = new NuvemNlu({ fetchFn: fetchDe(() => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, nlu: { intent: 'PROPRIEDADE', composto: contextoParaNuvem(anterior, dic).composto, propriedade: 'pontoEbulicaoK' }, contexto: true, model: 'nlu-v3.4-teste' }) }), chamadas), installId: () => IID });
  const p = await nlu.interpretarAgora('e o ponto de ebulição?', dic, anterior);
  assert.deepEqual(chamadas[0].body, { q: 'e o ponto de ebulição?', v: 1, client: 'web', iid: IID, contexto: { intent: 'MASSA_MOLAR', composto: contextoParaNuvem(anterior, dic).composto } });
  assert.equal(typeof chamadas[0].body.contexto.composto, 'string');
  assert.ok(!JSON.stringify(chamadas[0].body).includes('massa molar da'), 'o texto da pergunta anterior nunca vai');
  assert.equal(p.composto, AGUA, 'composto herdado resolvido para o CID pelo pacote');
  assert.equal(p.propriedade, 'pontoEbulicaoK');
  assert.equal(nlu.ultimoContextoUsado, true);
  assert.deepEqual(nlu.ultimoContexto, chamadas[0].body.contexto);
  await nlu.interpretarAgora('massa molar da água', dic);
  assert.equal('contexto' in chamadas[1].body, false, 'sem anterior: só a pergunta');
  assert.equal(nlu.ultimoContexto, null);

  // servidor recusa o contexto: segunda tentativa sem ele, e a resposta vale
  const tentativas = [];
  let n = 0;
  const recusa = new NuvemNlu({ fetchFn: fetchDe(() => (n++ === 0
    ? { ok: false, status: 400, text: async () => JSON.stringify({ ok: false, error: 'contexto' }) }
    : respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } })), tentativas), installId: () => IID });
  const q = await recusa.interpretarAgora('e a massa molar?', dic, anterior);
  assert.equal(tentativas.length, 2);
  assert.ok('contexto' in tentativas[0].body);
  assert.equal('contexto' in tentativas[1].body, false);
  assert.equal(q.composto, AGUA);
  assert.equal(recusa.ultimoContexto, null);
  // 400 por outro motivo: não repete
  const outro = [];
  const ruim = new NuvemNlu({ fetchFn: fetchDe({ ok: false, status: 400, text: async () => JSON.stringify({ ok: false, error: 'q' }) }, outro), installId: () => IID });
  assert.equal(await ruim.interpretarAgora('e a massa molar?', dic, anterior), null);
  assert.equal(outro.length, 1);
  assert.equal(ruim.ultimoResultado, 'indisponivel');
});

test('Engine: continuação manda a interpretação ANTERIOR (local ou da nuvem); pergunta completa não manda; heurística local resolvida não chama a nuvem sozinha', async () => {
  const chamadas = [];
  let resposta = respostaOk({ intent: 'MASSA_MOLAR', composto: 'água' }, { composto: { cid: String(AGUA) } });
  const nuvem = new NuvemNlu({ fetchFn: fetchDe(() => resposta, chamadas), installId: () => IID, habilitada: () => true });
  const engine = new Engine({ store, nuvem });
  const r1 = await engine.responder('qual é a massa molar da água?');
  assert.equal(r1.resolvida, true);
  assert.equal(r1.interpretacaoAnterior, null, 'primeira pergunta da conversa');
  // continuação que a heurística local resolve: o modo automático não chama a nuvem
  const r2 = await engine.responder('e o ponto de ebulição?');
  assert.equal(r2.resolvida, true);
  assert.equal(chamadas.length, 0);
  assert.equal(r2.interpretacaoAnterior.intent, 'MASSA_MOLAR');
  // o botão (explícito) reinterpreta ESTA pergunta com a interpretação ANTERIOR a ela (a da massa molar), não com a dela mesma
  resposta = respostaOk({ intent: 'PROPRIEDADE', composto: 'água', propriedade: 'pontoFusaoK' }, { composto: { cid: String(AGUA) } });
  const viaBotao = await pedirANuvem({ engine, atual: r2, pergunta: r2.pergunta });
  assert.equal(chamadas.length, 1);
  assert.deepEqual(chamadas[0].body.contexto, contextoParaNuvem(r1.parsed, dic));
  assert.equal(chamadas[0].body.contexto.intent, 'MASSA_MOLAR');
  assert.equal(viaBotao.ok, true);
  assert.equal(viaBotao.resposta.origem, 'NUVEM');
  // pergunta nova e completa: o botão manda só a pergunta
  const r3 = await engine.responder('qual é a massa molar da água?');
  await pedirANuvem({ engine, atual: r3, pergunta: r3.pergunta });
  assert.equal('contexto' in chamadas[1].body, false);
  // continuação que o app não entende: o modo automático manda o contexto (a interpretação da nuvem também vira anterior)
  resposta = respostaOk({ intent: 'SEGURANCA', composto: 'água' }, { composto: { cid: String(AGUA) } });
  const r4 = await engine.responder('e o tal do troço?');
  assert.equal(chamadas.length, 3);
  assert.deepEqual(chamadas[2].body.contexto, { intent: 'PROPRIEDADE', composto: 'água', propriedade: 'pontoFusaoK' }, 'a interpretação da nuvem (com o texto que ela devolveu) (resposta do botão) virou a anterior');
  assert.equal(r4.origem, 'NUVEM');
  assert.equal(r4.contextoUsado, false, 'o servidor de teste não confirmou o uso');
  // fechar a resposta / trocar de tela limpa o contexto: nada vai
  engine.limparContexto();
  await engine.perguntarANuvem('e aquilo lá?', null, { explicito: true });
  assert.equal('contexto' in chamadas[3].body, false);
  // recusa de segurança nunca vira contexto nem sai do aparelho
  await engine.responder('qual é a massa molar da água?');
  const perigo = await engine.responder('como sintetizar nitroglicerina em casa');
  assert.equal(perigo.interpretacaoAnterior, null);
  assert.equal(chamadas.length, 4);
});

test('validarNluNuvem: composto herdado do contexto vale quando é o texto enviado (o CID vem da interpretação anterior)', () => {
  const anterior = { ...parse('', dic), intent: 'MASSA_MOLAR', composto: AGUA, compostos: [AGUA], compostoNome: dic.nomeDaEntrada(AGUA) };
  const texto = contextoParaNuvem(anterior, dic).composto;
  const sem = { ...anterior, compostoNome: 'xyzitol herdado' };
  assert.equal(validarNluNuvem({ intent: 'DESENHAR', composto: 'xyzitol herdado' }, dic, 'desenhe', null, dic.lex, sem).composto, AGUA);
  assert.equal(validarNluNuvem({ intent: 'DESENHAR', composto: 'xyzitol herdado' }, dic, 'desenhe'), null, 'sem o contexto, o texto não resolve');
  assert.equal(validarNluNuvem({ intent: 'DESENHAR', composto: 'outro texto' }, dic, 'desenhe', null, dic.lex, sem), null, 'texto diferente do enviado não herda');
  assert.equal(validarNluNuvem({ intent: 'DESENHAR', composto: texto }, dic, 'desenhe', null, dic.lex, anterior).composto, AGUA);
});
