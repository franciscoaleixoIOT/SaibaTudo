#!/usr/bin/env node
// Gera o gráfico de recursos da Google Play (1024x500) do SaibaTudo Química: ícone da marca + nome + frase curta.
// Sem dependências: monta um HTML (Poppins de brand/fonts, SIL OFL; ícone brand/quimica-icon.svg) e o fotografa no Chrome headless por CDP,
// no mesmo estilo do gráfico do Eleições 2026 (fundo azul-marinho, faixa diagonal, tile do ícone, "Tudo" em verde, subtítulo dourado).
//
//   node store/play/fonte/grafico.mjs            # grava store/play/feature-graphic-1024x500.png (pt-BR) e -en/-es/-de/-fr
//   CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe" node store/play/fonte/grafico.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const PLAY = resolve(aqui, '..');
const BRAND = resolve(aqui, '..', '..', '..', 'brand');
const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const PORTA = 9348;

const TEXTOS = {
  'pt-BR': { arquivo: 'feature-graphic-1024x500.png', frase: ['Elementos, compostos, cálculos e segurança química', 'com fontes abertas, sem anúncios e sem cadastro'], nota: 'Gratuito · funciona offline · código aberto' },
  en: { arquivo: 'feature-graphic-1024x500-en.png', frase: ['Elements, compounds, calculations and chemical safety', 'from open sources, no ads and no sign-up'], nota: 'Free · works offline · open source' },
  es: { arquivo: 'feature-graphic-1024x500-es.png', frase: ['Elementos, compuestos, cálculos y seguridad química', 'con fuentes abiertas, sin anuncios ni registro'], nota: 'Gratis · funciona sin conexión · código abierto' },
  de: { arquivo: 'feature-graphic-1024x500-de.png', frase: ['Elemente, Verbindungen, Rechner und Chemiesicherheit', 'aus offenen Quellen, ohne Werbung und Anmeldung'], nota: 'Kostenlos · funktioniert offline · Open Source' },
  fr: { arquivo: 'feature-graphic-1024x500-fr.png', frase: ['Éléments, composés, calculs et sécurité chimique', 'à partir de sources ouvertes, sans pub ni inscription'], nota: 'Gratuit · fonctionne hors ligne · code ouvert' }
};

const url = (p) => pathToFileURL(p).href;
function html(t, lang) {
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
@font-face{font-family:Poppins;font-weight:700;src:url('${url(join(BRAND, 'fonts', 'Poppins-Bold.ttf'))}')}
@font-face{font-family:Poppins;font-weight:600;src:url('${url(join(BRAND, 'fonts', 'Poppins-SemiBold.ttf'))}')}
@font-face{font-family:Poppins;font-weight:500;src:url('${url(join(BRAND, 'fonts', 'Poppins-Medium.ttf'))}')}
html,body{margin:0;padding:0;width:1024px;height:500px;overflow:hidden;background:#0C2340;font-family:Poppins,sans-serif}
.fundo{position:absolute;inset:0}
.tile{position:absolute;left:80px;top:70px;width:168px;height:168px}
.tile img{display:block;width:168px;height:168px}
.tile i{position:absolute;inset:0;border-radius:37px;box-shadow:inset 0 0 0 4px #3B6EA8}
.marca{position:absolute;left:278px;top:62px;margin:0;font-weight:700;font-size:100px;line-height:1.15;color:#fff;letter-spacing:-1px}
.marca b{color:#22C55E;font-weight:700}
.sub{position:absolute;left:282px;top:176px;margin:0;font-weight:600;font-size:34px;letter-spacing:9px;color:#FFB81C}
.frase{position:absolute;left:80px;top:286px;margin:0;font-weight:500;font-size:28px;line-height:1.5;color:#E8EEF6}
.nota{position:absolute;left:80px;top:448px;margin:0;font-weight:500;font-size:16px;color:#94A3B8}
</style>
<svg class="fundo" width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,430 L1024,250 L1024,500 L0,500Z" fill="#143A66"/>
  <g transform="translate(790 150)" opacity="0.13" fill="none" stroke="#fff" stroke-width="30" stroke-linejoin="round" stroke-linecap="round">
    <path d="M0,-170 L147,-85 L147,85 L0,170 L-147,85 L-147,-85Z"/>
    <path d="M-98,-67 L-9,-118" stroke-width="22"/><path d="M107,-55 L107,55" stroke-width="22"/><path d="M-98,67 L-9,118" stroke-width="22"/>
  </g>
</svg>
<div class="tile"><img src="${url(join(BRAND, 'quimica-icon.svg'))}" alt=""><i></i></div>
<p class="marca">Saiba<b>Tudo</b></p>
<p class="sub">QUÍMICA</p>
<p class="frase">${t.frase[0]}<br>${t.frase[1]}</p>
<p class="nota">${t.nota}</p>
</html>`;
}

const perfil = mkdtempSync(join(tmpdir(), 'stq-grafico-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
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
try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1024, height: 500, deviceScaleFactor: 1, mobile: false });
  for (const [lang, t] of Object.entries(TEXTOS)) {
    const arq = join(perfil, `g-${lang}.html`);
    writeFileSync(arq, html(t, lang), 'utf8');
    await cdp('Page.navigate', { url: url(arq) });
    await dormir(600);
    await cdp('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => document.fonts.size)', awaitPromise: true, returnByValue: true });
    await dormir(400);
    const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(PLAY, t.arquivo), Buffer.from(r.data, 'base64'));
    console.log('gravado', t.arquivo);
  }
} finally {
  chrome.kill();
  await dormir(300);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* arquivos em uso no Windows */ }
}
