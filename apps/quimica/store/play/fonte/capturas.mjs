#!/usr/bin/env node
// Capturas 1080x1920 (viewport de 432x768 px CSS, DPR 2,5) do PWA https://saibatudo.net/quimica/ para a ficha da Google Play.
// São capturas do SITE/PWA (o app Android não roda aqui): trocar pelas do app Android antes da produção (docs/PLAY_STORE.md §3.4).
// Chrome headless por CDP puro, sem dependências (mesma abordagem de web/tools/screenshots.mjs). Uso:
//   node store/play/fonte/capturas.mjs <pasta-saida> [idioma=pt-BR|en|es|de|fr] [url-base=https://saibatudo.net]
//   ONLY=02,05 limita os cenários · CID=2519 troca o composto da captura 05 · CHROME=<caminho> troca o navegador
// Ajustes cosméticos (só na captura, nada vai para o site): (1) esconde o selo ".ia-badge" ("IA na nuvem ainda não está disponível"),
// que fica desatualizado quando a IA na nuvem entra no ar — rode com HIDE_BADGE=0 para ver o selo; (2) a barra de abas gruda logo abaixo do
// cabeçalho real (no PWA, com 432 px, o cabeçalho passa de 60 px e cobre metade das abas ao rolar); (3) a tabela periódica (18 colunas, rola
// na horizontal no celular) é reduzida com zoom até caber na largura.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SAIDA = resolve(process.argv[2] ?? '.');
const LANG = process.argv[3] ?? 'pt-BR';
const BASE = (process.argv[4] ?? 'https://saibatudo.net').replace(/\/$/, '');
const CHROME = process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORTA = 9347;
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean);

const TEXTOS = {
  'pt-BR': { massa: 'massa molar da água', seg: 'Por que não misturar água sanitária com amoníaco?', calc: 'C8H18 + O2 -> CO2 + H2O' },
  en: { massa: 'molar mass of water', seg: 'Why not mix bleach with ammonia?', calc: 'C8H18 + O2 -> CO2 + H2O' },
  es: { massa: 'masa molar del agua', seg: '¿Por qué no mezclar lejía con amoníaco?', calc: 'C8H18 + O2 -> CO2 + H2O' },
  de: { massa: 'Molare Masse von Wasser', seg: 'Warum darf man Bleichlauge nicht mit Ammoniak mischen?', calc: 'C8H18 + O2 -> CO2 + H2O' },
  fr: { massa: "masse molaire de l'eau", seg: 'Pourquoi ne faut-il pas mélanger l’hypochlorite de sodium et l’ammoniac ?', calc: 'C8H18 + O2 -> CO2 + H2O' }
};
const PERIGO = { 'pt-BR': 'como fazer metanfetamina?', en: 'how to make methamphetamine?', es: '¿cómo hacer metanfetamina?', de: 'wie stellt man Methamphetamin her?', fr: 'comment fabriquer de la méthamphétamine ?' };
const T = { ...(TEXTOS[LANG] ?? TEXTOS['pt-BR']), perigo: PERIGO[LANG] ?? PERIGO['pt-BR'] };

mkdirSync(SAIDA, { recursive: true });
const perfil = mkdtempSync(join(tmpdir(), 'stq-play-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', `--lang=${LANG}`, 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar() {
  for (let i = 0; i < 60; i++) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json();
      const pag = alvos.find((a) => a.type === 'page');
      if (pag) return pag.webSocketDebuggerUrl;
    } catch { /* subindo */ }
    await dormir(250);
  }
  throw new Error('Chrome não respondeu no CDP');
}
const ws = new WebSocket(await conectar());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pend = new Map();
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { const { ok, err } = pend.get(d.id); pend.delete(d.id); d.error ? err(new Error(d.error.message)) : ok(d.result); }
});
const cdp = (method, params = {}) => new Promise((ok, err) => { const id = ++seq; pend.set(id, { ok, err }); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async (expressao) => {
  const r = await cdp('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
async function esperar(expr, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await avaliar(`!!(${expr})`)) return true; } catch { /* navegando */ }
    await dormir(150);
  }
  throw new Error(`timeout esperando: ${expr}`);
}
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Page.setBypassCSP', { enabled: true });
if (process.env.HIDE_BADGE !== '0') await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '.ia-badge{display:none!important}'; document.head.append(s); });" });

async function preparar(escuro) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 432, height: 768, deviceScaleFactor: 2.5, mobile: true });
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: escuro ? 'dark' : 'light' }] });
  await cdp('Emulation.setLocaleOverride', { locale: LANG }).catch(() => {});
}
async function foto(nome) {
  await dormir(500);
  const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(SAIDA, `${nome}.png`), Buffer.from(r.data, 'base64'));
  console.log('  foto', nome);
}
async function abrir(caminho, esperarExpr) {
  const sep = caminho.includes('?') ? '&' : '?';
  await cdp('Page.navigate', { url: `${BASE}${caminho}${sep}lang=${LANG}` });
  await esperar(esperarExpr ?? "document.querySelector('#conteudo')?.children.length > 0");
  await avaliar("(() => { const a = document.querySelector('.abas'); const b = document.querySelector('.appbar'); if (a && b) a.style.top = b.offsetHeight + 'px'; })()");
  await dormir(500);
}
const avalia = avaliar;
const digitar = (sel, texto) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.value = ${JSON.stringify(texto)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const rolar = (sel, extra = 0) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) { const y = e.getBoundingClientRect().top + window.scrollY - 112 + ${extra}; window.scrollTo(0, y); } })()`);
const perguntar = async (q) => {
  await digitar('#pergunta', q);
  await avaliar("document.querySelector('form.busca-form').requestSubmit()");
};
// a tabela tem 18 colunas e no celular rola na horizontal; para a captura ela é reduzida (zoom) até caber na largura
const ajustarTabela = () => avaliar("(() => { const g = document.querySelector('.tp-grade'); const r = document.querySelector('.tp-rolagem'); g.style.zoom = String(r.clientWidth / Math.max(g.scrollWidth, 860)); })()");
const molecula = "(() => { const c = document.querySelector('canvas.molecula'); if (!c) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true; return false; })()";

const CENARIOS = [
  ['01-inicio', async () => {
    await abrir('/quimica/', "document.querySelector('#pergunta')");
    await foto('01-inicio');
  }],
  ['02-resposta-massa-molar', async () => {
    await abrir('/quimica/', "document.querySelector('#pergunta')");
    await perguntar(T.massa);
    await esperar("document.querySelector('.resposta .katex')");
    await dormir(400);
    await rolar('#busca-historico', -8);
    await foto('02-resposta-massa-molar');
  }],
  ['03-seguranca-ghs', async () => {
    await abrir('/quimica/', "document.querySelector('#pergunta')");
    await perguntar(T.seg);
    await esperar("document.querySelector('.resposta .picto img')");
    await dormir(500);
    await rolar('#busca-historico', -8);
    await foto('03-seguranca-ghs');
  }],
  ['04-tabela-periodica', async () => {
    await abrir('/quimica/tabela', "document.querySelector('.tp-grade .el')");
    await ajustarTabela();
    await rolar('.tp-grade', -8);
    await foto('04-tabela-periodica');
  }],
  ['05-composto-estrutura', async () => {
    await abrir('/quimica/composto/' + (process.env.CID ?? '2519'), "document.querySelector('canvas.molecula')");
    await esperar(molecula, 25000);
    await rolar('canvas.molecula', -75);
    await foto('05-composto-estrutura');
  }],
  ['06-calculadora-balanceamento', async () => {
    await abrir('/quimica/calculadoras/balanceamento?eq=' + encodeURIComponent(T.calc), "document.querySelector('.res-calc .katex')");
    await rolar('.res-calc', -8);
    await foto('06-calculadora-balanceamento');
  }],
  ['07-calculadora-ph', async () => {
    await abrir('/quimica/calculadoras/ph');
    await digitar('.form-calc input[type=text]', LANG === 'en' ? '0.01' : '0,01');
    await avaliar("document.querySelector('.form-calc').requestSubmit()");
    await esperar("document.querySelector('.res-calc .katex')");
    await rolar('.form-calc', -8);
    await foto('07-calculadora-ph');
  }],
  ['08-elemento-ferro', async () => {
    await abrir('/quimica/elemento/Fe', "document.querySelector('.ficha-cab')");
    await foto('08-elemento-ferro');
  }],
  ['11-sobre-os-dados', async () => {
    await abrir('/quimica/sobre-os-dados');
    await rolar('.fonte-item', -40);
    await foto('11-sobre-os-dados');
  }],
  ['10-recusa-perigo', async () => {
    await abrir('/quimica/', "document.querySelector('#pergunta')");
    await perguntar(T.perigo);
    await esperar("document.querySelector('.resposta.recusa')");
    await rolar('#busca-historico', -8);
    await foto('10-recusa-perigo');
  }],
  ['09-tema-escuro', async () => {
    await preparar(true);
    await abrir('/quimica/', "document.querySelector('#pergunta')");
    await perguntar(T.massa);
    await esperar("document.querySelector('.resposta .katex')");
    await dormir(400);
    await rolar('#busca-historico', -8);
    await foto('09-tema-escuro');
    await preparar(false);
  }]
];

try {
  await preparar(false);
  for (const [nome, fn] of CENARIOS) {
    if (ONLY.length && !ONLY.some((o) => nome.startsWith(o))) continue;
    try { await fn(); console.log('ok', nome); } catch (e) { console.log('FALHA', nome, e.message); }
  }
} finally {
  chrome.kill();
  await dormir(300);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* arquivos em uso no Windows */ }
}
