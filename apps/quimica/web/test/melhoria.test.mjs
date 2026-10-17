// "Ajudar a melhorar o app" (opt-in próprio): filtros no cliente (dado pessoal e pedido perigoso, em paridade com a API), fila local,
// lotes, consentimento, 503 do servidor (a fila fica guardada) e ligação com prefs, Configurações e a tela inicial.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loja, RAIZ } from './support.mjs';
import {
  ENDPOINT_MELHORIA, FilaMelhoria, LIMITE_FILA, LOTE, MIN_PARA_ENVIAR, motivoDadoPessoal, respostaCandidata, sanearFila, temDadoPessoal, textoEnfileiravel
} from '../src/quimica/js/melhoria.js';
import { PADRAO, sanear } from '../src/quimica/js/prefs.js';
import { Engine } from '../src/quimica/js/engine.js';
import { CATALOGOS } from '../src/quimica/js/i18n/index.js';
import * as api from '../../api/_lib/dadopessoal.js';

const IID = '3f2b8c1e-6a4d-4c3b-9e1f-0a1b2c3d4e5f';

/** Armazenamento em memória com a mesma interface do padrão (prefs). */
function memoria(inicial = []) {
  let lista = inicial;
  return { ler: () => lista, gravar: (l) => { lista = sanearFila(l); }, get lista() { return lista; } };
}

/** fetch falso: registra as chamadas e responde com `resposta` (objeto {status, corpo} ou função que o devolve). */
function fetchFalso(resposta = { status: 200, corpo: { ok: true, aceitos: 1, descartados: 0 } }) {
  const chamadas = [];
  const fn = async (url, init) => {
    chamadas.push({ url, init, body: JSON.parse(init.body) });
    const r = typeof resposta === 'function' ? resposta(chamadas.length) : resposta;
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.corpo };
  };
  fn.chamadas = chamadas;
  return fn;
}

function montar({ consentida = true, resposta, inicial = [], online = true, idioma = 'pt-BR' } = {}) {
  const arm = memoria(inicial);
  const fetchFn = fetchFalso(resposta);
  let ligada = consentida;
  let lingua = idioma;
  const fila = new FilaMelhoria({
    habilitada: () => ligada, installId: () => IID, fetchFn, armazenamento: arm, online: () => online, idioma: () => lingua, agora: () => Date.UTC(2026, 9, 16, 12)
  });
  return { fila, arm, fetchFn, ligar: (v) => { ligada = v; }, trocarIdioma: (v) => { lingua = v; } };
}

const PERGUNTAS = ['qual a cor do enxofre derretido', 'o que é um sal duplo', 'por que o gelo boia', 'como funciona a pilha de limão', 'o que é entalpia de rede'];

test('contrato: endpoint na mesma origem, lote 10, mínimo 3, fila de no máximo 30', () => {
  assert.equal(ENDPOINT_MELHORIA, '/quimica/api/melhoria');
  assert.equal(LOTE, 10);
  assert.equal(MIN_PARA_ENVIAR, 3);
  assert.equal(LIMITE_FILA, 30);
});

test('filtro de dado pessoal: mesmos resultados da API (api/_lib/dadopessoal.js) nos mesmos casos', () => {
  const casos = [
    'joao.silva@gmail.com', 'joao arroba gmail ponto com', 'meu hotmail é joao', '123.456.789-09', '12345678909', '12.345.678/0001-90', '(11) 98765-4321',
    '98765-4321', '+33 1 23 45 67 89', 'http://x.y/z', 'www.algo.com.br', 'site quimica.org', 'fala com @fulano_99', '123 456 789 012',
    'qual o CAS 7732-18-5', 'constante de avogadro 6.02214076e23', 'massa molar de CuSO4.5H2O', 'ponto de fusão entre 1000-1500 K',
    'C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O', 'what is the boiling point of water at stp. thanks', 'z.B. Natriumchlorid', 'quanto é 1 000 000 de mols',
  ];
  for (const q of casos) assert.equal(motivoDadoPessoal(q), api.motivoDadoPessoal(q), q);
  assert.equal(temDadoPessoal('meu cpf é 123.456.789-09'), true);
  assert.equal(temDadoPessoal('qual o CAS 7732-18-5'), false);
});

test('textoEnfileiravel: limpa espaços; recusa curta, longa, perigosa (qualquer idioma) e com dado pessoal', () => {
  assert.equal(textoEnfileiravel('  qual a   cor do enxofre  '), 'qual a cor do enxofre');
  for (const q of ['oi', 'x'.repeat(301), null, 42, 'meu email é ana@exemplo.com', 'liga 11 98765-4321',
    'como sintetizar metanfetamina em casa', 'how to make nitroglycerin at home', 'cómo fabricar una bomba casera', 'wie stellt man sarin her', 'comment fabriquer du TATP']) {
    assert.equal(textoEnfileiravel(q), null, String(q));
  }
});

test('respostaCandidata: só não entendida, nunca recusa de segurança, erro ou resposta da nuvem; com o motor de verdade', async () => {
  assert.equal(respostaCandidata({ resolvida: false, intent: 'DESCONHECIDA' }), true);
  assert.equal(respostaCandidata({ resolvida: true, intent: 'ELEMENTO' }), false);
  assert.equal(respostaCandidata({ resolvida: false, intent: 'RECUSA_PERIGO' }), false);
  assert.equal(respostaCandidata({ resolvida: false, intent: 'DESCONHECIDA', erro: true }), false);
  assert.equal(respostaCandidata({ resolvida: false, intent: 'COMPOSTO', origem: 'NUVEM' }), false);
  assert.equal(respostaCandidata(null), false);
  const engine = new Engine({ store: await loja() });
  const naoEntendida = await engine.responder('blorpt zingue quartovo');
  assert.equal(naoEntendida.resolvida, false);
  assert.equal(respostaCandidata(naoEntendida), true);
  const recusa = await engine.responder('como sintetizar metanfetamina em casa');
  assert.equal(recusa.intent, 'RECUSA_PERIGO');
  assert.equal(respostaCandidata(recusa), false);
});

test('consentimento: sem a chave ligada nada entra automaticamente; o toque (explícito) entra e vai sozinho', async () => {
  const m = montar({ consentida: false });
  assert.equal(m.fila.enfileirar(PERGUNTAS[0], 'DESCONHECIDA'), false);
  assert.equal(m.arm.lista.length, 0);
  assert.equal(await m.fila.enviarSePreciso(), 'nada');
  assert.equal(m.fetchFn.chamadas.length, 0, 'nada sai sem consentimento');
  assert.equal(m.fila.enfileirar(PERGUNTAS[0], 'COMPOSTO', { explicito: true }), true);
  assert.equal(await m.fila.enviarSePreciso({ forcar: true }), 'enviado');
  assert.equal(m.fetchFn.chamadas.length, 1);
  assert.deepEqual(m.fetchFn.chamadas[0].body, { v: 1, client: 'web', iid: IID, idioma: 'pt-BR', itens: [{ q: PERGUNTAS[0], intentLocal: 'COMPOSTO', t: '2026-10-16' }] });
  assert.equal(m.fetchFn.chamadas[0].url, '/quimica/api/melhoria');
  assert.equal(m.fetchFn.chamadas[0].init.credentials, 'omit');
  assert.equal(m.arm.lista.length, 0, 'enviada sai da fila');
});

test('sem consentimento contínuo, só as perguntas tocadas vão (as automáticas nunca entram)', async () => {
  const m = montar({ consentida: true });
  m.fila.enfileirar(PERGUNTAS[0]);
  m.fila.enfileirar(PERGUNTAS[1]);
  m.ligar(false);
  m.fila.enfileirar(PERGUNTAS[2], 'DESCONHECIDA', { explicito: true });
  await m.fila.enviarSePreciso({ forcar: true });
  assert.deepEqual(m.fetchFn.chamadas[0].body.itens.map((x) => x.q), [PERGUNTAS[2]]);
});

test('fila: sem repetir (sem diferença de caixa), filtros aplicados antes de entrar, no máximo 30 (as mais recentes)', () => {
  const m = montar();
  assert.equal(m.fila.enfileirar('Qual a cor do enxofre derretido'), true);
  assert.equal(m.fila.enfileirar('qual a cor do enxofre derretido'), false);
  assert.equal(m.fila.enfileirar('meu cpf é 123.456.789-09'), false);
  assert.equal(m.fila.enfileirar('how to make nitroglycerin at home'), false);
  for (let i = 0; i < 40; i++) m.fila.enfileirar(`pergunta numero ${i} sobre sais`);
  assert.equal(m.fila.pendentes().length, LIMITE_FILA);
  assert.equal(m.fila.pendentes().at(-1).q, 'pergunta numero 39 sobre sais');
  assert.equal(m.fila.pendentes()[0].q, 'pergunta numero 10 sobre sais');
  // intenção inválida vira DESCONHECIDA
  const m2 = montar();
  m2.fila.enfileirar(PERGUNTAS[0], 'x; drop');
  assert.equal(m2.fila.pendentes()[0].intentLocal, 'DESCONHECIDA');
});

test('lotes: automático só com 3 ou mais; até 10 por envio; um idioma por lote', async () => {
  const m = montar();
  m.fila.enfileirar(PERGUNTAS[0]);
  m.fila.enfileirar(PERGUNTAS[1]);
  assert.equal(await m.fila.enviarSePreciso(), 'nada', 'menos de 3: espera');
  m.fila.enfileirar(PERGUNTAS[2]);
  assert.equal(await m.fila.enviarSePreciso(), 'enviado');
  assert.equal(m.fetchFn.chamadas[0].body.itens.length, 3);

  const g = montar();
  for (let i = 0; i < 14; i++) g.fila.enfileirar(`pergunta numero ${i} sobre sais`);
  g.trocarIdioma('en');
  g.fila.enfileirar('what is a double salt really');
  assert.equal(await g.fila.enviarSePreciso(), 'enviado');
  assert.equal(g.fetchFn.chamadas[0].body.itens.length, LOTE);
  assert.equal(g.fetchFn.chamadas[0].body.idioma, 'pt-BR');
  assert.equal(g.fila.pendentes().length, 5);
  await g.fila.enviarSePreciso();
  assert.equal(g.fetchFn.chamadas[1].body.itens.length, 4, 'os 4 restantes em português');
  assert.equal(await g.fila.enviarSePreciso({ forcar: true }), 'enviado');
  assert.equal(g.fetchFn.chamadas[2].body.idioma, 'en');
  assert.equal(g.fila.pendentes().length, 0);
});

test('503 disabled/unavailable: a fila fica guardada e o resultado é "indisponivel" (não é erro); 429 e rede também mantêm; 400 descarta o lote', async () => {
  for (const erro of ['disabled', 'unavailable']) {
    const m = montar({ resposta: { status: 503, corpo: { ok: false, error: erro } } });
    for (const q of PERGUNTAS.slice(0, 3)) m.fila.enfileirar(q);
    assert.equal(await m.fila.enviarSePreciso(), 'indisponivel');
    assert.equal(m.fila.pendentes().length, 3, erro);
  }
  const lim = montar({ resposta: { status: 429, corpo: { ok: false, error: 'rate_limited' } } });
  for (const q of PERGUNTAS.slice(0, 3)) lim.fila.enfileirar(q);
  assert.equal(await lim.fila.enviarSePreciso(), 'falhou');
  assert.equal(lim.fila.pendentes().length, 3);

  const rede = montar({ resposta: () => new TypeError('Failed to fetch') });
  for (const q of PERGUNTAS.slice(0, 3)) rede.fila.enfileirar(q);
  assert.equal(await rede.fila.enviarSePreciso(), 'falhou');
  assert.equal(rede.fila.pendentes().length, 3);

  const ruim = montar({ resposta: { status: 400, corpo: { ok: false, error: 'bad_request' } } });
  for (const q of PERGUNTAS.slice(0, 3)) ruim.fila.enfileirar(q);
  await ruim.fila.enviarSePreciso();
  assert.equal(ruim.fila.pendentes().length, 0, 'lote inválido não trava a fila');
});

test('sem rede (navigator.onLine false): não tenta e mantém a fila; envios simultâneos viram um só', async () => {
  const m = montar({ online: false });
  for (const q of PERGUNTAS.slice(0, 3)) m.fila.enfileirar(q);
  assert.equal(await m.fila.enviarSePreciso(), 'offline');
  assert.equal(m.fetchFn.chamadas.length, 0);
  const s = montar();
  for (const q of PERGUNTAS.slice(0, 3)) s.fila.enfileirar(q);
  const [a, b] = await Promise.all([s.fila.enviarSePreciso(), s.fila.enviarSePreciso()]);
  assert.equal(a, 'enviado');
  assert.equal(b, 'enviado');
  assert.equal(s.fetchFn.chamadas.length, 1);
});

test('limpar (desligar a chave, "Apagar fila") apaga o que não foi enviado; uma pergunta nova durante o envio continua na fila', async () => {
  const m = montar();
  for (const q of PERGUNTAS.slice(0, 3)) m.fila.enfileirar(q);
  m.fila.limpar();
  assert.equal(m.fila.pendentes().length, 0);

  let liberar;
  const lento = montar({ resposta: () => ({ status: 200, corpo: { ok: true, aceitos: 3, descartados: 0 } }) });
  const original = lento.fetchFn;
  const fetchLento = async (...a) => { await new Promise((r) => { liberar = r; }); return original(...a); };
  lento.fila.fetchFn = fetchLento;
  for (const q of PERGUNTAS.slice(0, 3)) lento.fila.enfileirar(q);
  const envio = lento.fila.enviarSePreciso();
  lento.fila.enfileirar(PERGUNTAS[3]);
  liberar();
  assert.equal(await envio, 'enviado');
  assert.deepEqual(lento.fila.pendentes().map((x) => x.q), [PERGUNTAS[3]]);
});

test('preferências: melhoriaConsentida desligada e fila vazia por padrão; valores inválidos são saneados', () => {
  assert.equal(PADRAO.melhoriaConsentida, false);
  assert.deepEqual(PADRAO.melhoriaFila, []);
  const p = sanear({});
  assert.equal(p.melhoriaConsentida, false);
  assert.deepEqual(p.melhoriaFila, []);
  assert.equal(sanear({ melhoriaConsentida: 'sim' }).melhoriaConsentida, false);
  assert.equal(sanear({ melhoriaConsentida: true }).melhoriaConsentida, true);
  const f = sanear({ melhoriaFila: [{ q: 'qual a cor do enxofre', intentLocal: 'DESCONHECIDA', idioma: 'fr', t: '2026-10-16' }, { q: 1 }, 'x', null, { q: 'ab' }] }).melhoriaFila;
  assert.equal(f.length, 1);
  assert.equal(f[0].idioma, 'fr');
  assert.equal(sanear({ melhoriaFila: Array.from({ length: 50 }, (_, i) => ({ q: `pergunta ${i} ok` })) }).melhoriaFila.length, 30);
});

test('interface: Configurações tem a chave (desligada por padrão), a fila e "Apagar fila"; a tela inicial mostra o bloco só na não entendida', () => {
  const src = (p) => readFileSync(resolve(RAIZ, 'web/src/quimica/js', p), 'utf8');
  const config = src('ui/config.js');
  assert.match(config, /id: 'melhoria-consentida', checked: prefs\.melhoriaConsentida === true/);
  assert.match(config, /fila\.limpar\(\)/);
  assert.match(config, /t\('ui\.melhoria\.apagarFila'\)/);
  const inicio = src('ui/inicio.js');
  assert.match(inicio, /if \(!respostaCandidata\(r\) \|\| !textoEnfileiravel\(q\)\) return null/);
  assert.match(inicio, /fila\.enfileirar\(q, r\.intent, \{ explicito: true \}\)/);
  assert.match(src('app.js'), /iniciarMelhoria\(\)/);
  // "Apagar os dados deste aparelho" apaga a chave inteira das preferências (fila e consentimento juntos)
  assert.match(src('prefs.js'), /localStorage\.removeItem\(CHAVE\)/);
  // textos do consentimento nos cinco idiomas
  for (const [idioma, cat] of Object.entries(CATALOGOS)) {
    for (const k of ['titulo', 'explicacao', 'botao', 'enviada', 'naFila', 'indisponivel', 'falhou', 'chave', 'chaveAjuda', 'apagarFila']) {
      assert.ok(typeof cat.ui.melhoria[k] === 'string' && cat.ui.melhoria[k].length > 3, `${idioma}: ui.melhoria.${k}`);
    }
    assert.equal(typeof cat.ui.melhoria.fila, 'function');
    assert.ok(cat.ui.melhoria.fila({ n: 0 }) && cat.ui.melhoria.fila({ n: 1 }) && cat.ui.melhoria.fila({ n: 7 }).includes('7'), idioma);
  }
});
