#!/usr/bin/env node
// Verificação no navegador real: abre o site em Chrome headless (protocolo CDP puro, sem dependências), percorre as telas (assistente,
// explorador, presets, PCA, analogia, Aprenda com "Experimente", Sobre, chinês, privacidade, configurações, offline), coleta erros de console
// e violações da CSP e grava screenshots. Requer o servidor local no ar:
//
//   DATA_DIR=web/test/fixtures/data-llms PUB_KEY_B64="$(cat web/test/fixtures/chave_teste_public.b64)" node web/build.mjs && node web/serve.mjs
//   node web/tools/screenshots.mjs [url-base] [pasta-saida]
//   CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"  (padrão no Windows)
//   ONLY=inicio,explorador   limita os cenários
//
// Sai com código 1 se houver exceção, console.error ou violação de CSP. Porte do screenshots.mjs da química.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const SAIDA = resolve(process.argv[3] ?? join(aqui, '..', '.screenshots'));
const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const PORTA = 9335;
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean);

mkdirSync(SAIDA, { recursive: true });
const perfil = mkdtempSync(join(tmpdir(), 'stl-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function conectar() {
  for (let i = 0; i < 60; i++) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json();
      const pag = alvos.find((a) => a.type === 'page');
      if (pag) return pag.webSocketDebuggerUrl;
    } catch { /* ainda subindo */ }
    await dormir(250);
  }
  throw new Error('Chrome não respondeu no CDP');
}

const ws = new WebSocket(await conectar());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pend = new Map();
const problemas = [];
let contexto = '';
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { const { ok, err } = pend.get(d.id); pend.delete(d.id); d.error ? err(new Error(d.error.message)) : ok(d.result); return; }
  if (d.method === 'Runtime.exceptionThrown') problemas.push(`[${contexto}] exceção: ${d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text}`);
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(d.params.type)) problemas.push(`[${contexto}] console.${d.params.type}: ${d.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  // o /llms/api/ask não existe no servidor local: o 404 esperado do botão da nuvem não é problema
  if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(d.params.entry.level) && !/willReadFrequently|\/llms\/api\/ask/.test(`${d.params.entry.text} ${d.params.entry.url ?? ''}`)) problemas.push(`[${contexto}] log ${d.params.entry.level}: ${d.params.entry.text} ${d.params.entry.url ?? ''}`);
});
const cdp = (method, params = {}) => new Promise((ok, err) => { const id = ++seq; pend.set(id, { ok, err }); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async (expressao) => {
  const r = await cdp('Runtime.evaluate', { expression: expressao, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
async function esperar(expr, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await avaliar(`!!(${expr})`)) return true; } catch { /* página navegando */ }
    await dormir(150);
  }
  throw new Error(`timeout esperando: ${expr}`);
}
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Log.enable');

async function preparar({ largura, altura, escuro, mobile }) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: escuro ? 'dark' : 'light' }] });
}
async function foto(nome) {
  const m = await cdp('Page.getLayoutMetrics');
  const w = Math.ceil(m.cssContentSize?.width ?? m.contentSize.width);
  const alt = Math.min(Math.ceil(m.cssContentSize?.height ?? m.contentSize.height), 3400);
  const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: alt, scale: 1 } });
  writeFileSync(join(SAIDA, `${nome}.png`), Buffer.from(r.data, 'base64'));
}
async function abrir(caminho, esperarExpr) {
  await cdp('Page.navigate', { url: BASE + caminho });
  await esperar(esperarExpr ?? "document.querySelector('#conteudo')?.children.length > 0");
  await dormir(400);
}
const clicar = (sel) => avaliar(`document.querySelector(${JSON.stringify(sel)}).click()`);
const digitar = (sel, texto) => avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.value = ${JSON.stringify(texto)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const texto = (sel) => avaliar(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ''`);
const perguntar = async (q, esperarExpr) => { await digitar('#pergunta', q); await avaliar("document.querySelector('form.assistente-form').requestSubmit()"); await esperar(esperarExpr ?? "!document.querySelector('.cartao-resposta').hidden"); await dormir(250); };
const chipsDoGrafico = () => avaliar("[...document.querySelectorAll('.chip-duplo .chip')].map((b) => b.textContent.trim())");

const CENARIOS = {
  async inicio(p) {
    await abrir('/llms/', "document.querySelector('#pergunta') && document.querySelector('canvas.cena3d')");
    await foto(`${p}-inicio`);
    await perguntar('mostre king, queen, man e woman');
    const chips = await chipsDoGrafico();
    if (!['king', 'queen', 'man', 'woman'].every((w) => chips.includes(w))) throw new Error(`palavras não entraram no gráfico: ${chips}`);
    if (!(await avaliar("[...document.querySelectorAll('.cartao-resposta .resposta-acoes button')].some((b) => /nuvem|cloud/i.test(b.textContent))"))) throw new Error('resposta sem o botão da IA na nuvem');
    await foto(`${p}-resposta-mostrar`);
    await perguntar('king - man + woman', "document.querySelector('.cartao-resposta .lista-pontos li')");
    if (!(await texto('.cartao-resposta')).includes('queen')) throw new Error('analogia sem queen');
    await foto(`${p}-resposta-analogia`);
    await perguntar('o que é um token?');
    if (!(await avaliar("!!document.querySelector('.cartao-resposta a[href=\"/llms/aprenda/tokens\"]')"))) throw new Error('conceito sem o botão Abrir');
    await perguntar('xqzv blorpt');
    if (!(await avaliar("document.querySelectorAll('.cartao-resposta .chips button').length >= 1"))) throw new Error('não entendi sem sugestões');
    await foto(`${p}-nao-entendi`);
  },
  async explorador(p) {
    await abrir('/llms/?palavras=king,queen,man,woman', "document.querySelectorAll('.chip-duplo').length === 4");
    await clicar('.explorador-painel .linha-campo button[aria-pressed]');
    await esperar("document.querySelector('.explorador-painel .linha-campo button[aria-pressed=\"true\"]') && location.search.includes('modo=pca')");
    if ((await texto('#tabela-coords th:nth-child(2)')).trim() !== 'PC1') throw new Error('PCA não aplicado (cabeçalho da tabela)');
    await foto(`${p}-pca`);
    await avaliar("document.querySelector('.explorador-painel select').closest('.linha-campo').querySelector('button').click()");
    await esperar("document.querySelector('.explorador-painel .lista-vizinhos li')");
    await foto(`${p}-analogia`);
    await avaliar("[...document.querySelectorAll('.explorador-painel .chips')][1].querySelector('button').click()"); // 1º preset
    await esperar("document.querySelectorAll('.chip-duplo').length >= 5");
    await clicar('.chip-duplo .chip'); // destacar → vizinhos
    await esperar("document.querySelector('.explorador-painel .bloco .lista-vizinhos li')");
    await foto(`${p}-preset-vizinhos`);
    await clicar('.chip-duplo .chip-remover');
    await digitar('.explorador-painel input.campo', 'zzzzzz');
    await avaliar("document.querySelector('.explorador-painel .linha-campo .btn-primario').click()");
    await esperar("(document.querySelector('.explorador-painel [role=status]')?.innerText ?? '').length > 5");
    await foto(`${p}-palavra-desconhecida`);
  },
  async aprenda(p) {
    await abrir('/llms/aprenda', "document.querySelector('.indice-secoes a')");
    await foto(`${p}-aprenda`);
    await clicar('.indice-secoes a:nth-child(3) a, .indice-secoes li:nth-child(3) a');
    await esperar("document.querySelector('article.secao-aprenda .lista-experimente button')");
    await foto(`${p}-aprenda-embeddings`);
    await clicar('article.secao-aprenda .lista-experimente button');
    await esperar("location.pathname.endsWith('/llms/') && document.querySelectorAll('.chip-duplo').length >= 3");
    await foto(`${p}-experimente`);
  },
  async sobreConfig(p) {
    await abrir('/llms/sobre-os-dados', "document.querySelector('.kv dd')");
    if (!(await texto('#conteudo')).includes('PDDL')) throw new Error('Sobre sem a licença do GloVe');
    await foto(`${p}-sobre`);
    await abrir('/llms/configuracoes', "document.querySelector('#nuvem-automatica')");
    if (!(await avaliar("document.querySelector('#nuvem-automatica').checked === false"))) throw new Error('IA na nuvem automática tem de vir desligada');
    await foto(`${p}-config`);
  },
  async idiomas(p) {
    await abrir('/llms/?lang=zh', "document.querySelector('#pergunta')");
    if (!/[\u4e00-\u9fff]/.test(await texto('#titulo-pagina'))) throw new Error('zh: título sem caracteres Han');
    await perguntar('显示 国王 和 女王');
    const chips = await chipsDoGrafico();
    if (!chips.includes('king') || !chips.includes('queen')) throw new Error(`zh: glossário não traduziu: ${chips}`);
    await foto(`${p}-zh`);
    await abrir('/llms/?lang=de', "document.querySelector('#pergunta')");
    await perguntar('zeige könig und königin');
    if (!(await chipsDoGrafico()).includes('king')) throw new Error('de: glossário não traduziu');
    await cdp('Page.navigate', { url: `${BASE}/llms/privacidade/zh` });
    await esperar("document.querySelector('main h1') && document.documentElement.lang === 'zh'");
    await foto(`${p}-privacidade-zh`);
  },
  async offline(p) {
    await abrir('/llms/?lang=en', "document.querySelector('#pergunta')");
    await avaliar("navigator.serviceWorker.ready.then((r) => r.active.state)");
    await dormir(2500); // pré-cache do pacote terminando
    await cdp('Network.enable');
    await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    try {
      await abrir('/llms/?lang=en&palavras=king,queen', "document.querySelectorAll('.chip-duplo').length === 2");
      await perguntar('neighbours of tower', "document.querySelector('.cartao-resposta .lista-pontos li')");
      await foto(`${p}-offline`);
    } finally {
      await cdp('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
  }
};

const VISTAS = [
  { prefixo: 'mobile-claro', largura: 390, altura: 844, escuro: false, mobile: true },
  { prefixo: 'desktop-escuro', largura: 1280, altura: 800, escuro: true, mobile: false }
];
let cenarios = 0;
try {
  for (const v of VISTAS) {
    await preparar(v);
    for (const [nome, fn] of Object.entries(CENARIOS)) {
      if (ONLY.length && !ONLY.includes(nome)) continue;
      contexto = `${v.prefixo}/${nome}`;
      try { await fn(v.prefixo); cenarios++; console.log(`✔ ${contexto}`); } catch (e) { problemas.push(`[${contexto}] cenário falhou: ${e.message}`); console.log(`✖ ${contexto}: ${e.message}`); try { await foto(`${v.prefixo}-FALHA-${nome}`); } catch { /* ignorado */ } }
    }
  }
} finally {
  chrome.kill();
  await dormir(300);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* arquivos em uso no Windows */ }
}
const unicos = [...new Set(problemas)];
if (unicos.length) { console.log(`\n${unicos.length} problema(s):\n- ${unicos.join('\n- ')}`); process.exit(1); }
console.log(`\nOK: ${cenarios} cenários sem erros de console nem violações de CSP. Screenshots em ${SAIDA}`);
