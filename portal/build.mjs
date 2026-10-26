// Gera portal/dist (a home de saibatudo.net) sem dependências npm: copia src/, gera uma página por idioma a partir do molde
// src/index.html e dos catálogos src/portal/i18n/<idioma>.js (dist/index.html = pt-BR, dist/en/index.html, …) e preenche o
// service worker com a versão (hash do conteúdo, build reproduzível), a lista de pré-cache e as páginas por idioma.
//
//   node build.mjs            OUT_DIR (opcional) = pasta de saída; padrão portal/dist
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IDIOMAS, ORIGEM, PADRAO, caminho, pasta } from './src/portal/i18n/index.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const SRC = join(aqui, 'src');
const OUT = resolve(process.env.OUT_DIR ?? join(aqui, 'dist'));
const posix = (p) => p.split(sep).join('/');
function* arquivos(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* arquivos(p); else yield p;
  }
}
const falhar = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

// ---------- páginas por idioma ----------
const { NUMEROS_QUIMICA } = await import(pathToFileURL(join(SRC, 'portal', 'apps.js')).href);
const catalogos = {};
for (const idioma of IDIOMAS) catalogos[idioma] = (await import(pathToFileURL(join(SRC, 'portal', 'i18n', `${idioma}.js`)).href)).default;

const obter = (ctx, chave) => chave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);

/** Seletor de idiomas: links simples (sem JS), idioma atual com aria-current, hreflang + lang em cada link. */
function seletor(idioma) {
  const links = IDIOMAS.map((i) => `<a href="${caminho(i)}" hreflang="${i}" lang="${i}"${i === idioma ? ' aria-current="page"' : ''}>${catalogos[i].nomeNativo}</a>`);
  return `<nav class="idiomas" aria-label="${catalogos[idioma].idiomas.rotulo}">\n    <span data-icone="globe" data-tam="16" class="idiomas-ic"></span>\n    ${links.join('\n    ')}\n  </nav>`;
}

function alternates() {
  const l = IDIOMAS.map((i) => `<link rel="alternate" hreflang="${i}" href="${ORIGEM}${caminho(i)}">`);
  l.push(`<link rel="alternate" hreflang="x-default" href="${ORIGEM}${caminho(PADRAO)}">`);
  return l.join('\n  ');
}

/** Molde + catálogo → HTML da página do idioma. */
export function renderizar(molde, idioma, catalogo) {
  const ctx = { ...catalogo, pagina: { lang: idioma, url: ORIGEM + caminho(idioma), inicio: caminho(idioma), alternates: alternates(), seletor: seletor(idioma) } };
  const fmt = new Intl.NumberFormat(idioma);
  let s = molde.replace(/^<!--\s*molde[\s\S]*?-->\r?\n/m, '');
  s = s.replace(/\{\{\?([\w.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, k, dentro) => (obter(ctx, k) ? dentro : ''));
  s = s.replace(/\{\{([\w.-]+)\}\}/g, (m, k) => {
    const v = obter(ctx, k);
    if (typeof v !== 'string' || v === '') falhar(`catálogo ${idioma}: chave ausente ou vazia: ${k}`);
    return v;
  });
  s = s.replace(/\{num:([A-Za-z]+)\}/g, (m, k) => {
    if (!(k in NUMEROS_QUIMICA)) falhar(`catálogo ${idioma}: número desconhecido {num:${k}} (ver NUMEROS_QUIMICA em apps.js)`);
    return `<span data-num="${k}">${fmt.format(NUMEROS_QUIMICA[k])}</span>`;
  });
  if (idioma !== PADRAO) {
    const langQuimica = idioma === 'zh' ? 'en' : idioma; // a química ainda não fala chinês: a página zh leva ao inglês
    s = s.replace(/href="\/quimica\/"/g, `href="/quimica/?lang=${langQuimica}"`);
    s = s.replace(/href="\/llms\/"/g, `href="/llms/?lang=${idioma}"`);
  }
  if (/\{\{|\{num:/.test(s)) falhar(`página ${idioma}: marcador não resolvido: ${/\{\{[^}]*\}\}|\{num:[^}]*\}/.exec(s)[0]}`);
  return s;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// O molde e os catálogos são só de build: não vão para dist/ (nem para o pré-cache)
cpSync(SRC, OUT, { recursive: true, filter: (s) => { const r = posix(relative(SRC, s)); return r !== 'index.html' && r !== 'portal/i18n' && !r.startsWith('portal/i18n/'); } });

const molde = readFileSync(join(SRC, 'index.html'), 'utf8');
for (const idioma of IDIOMAS) {
  const dir = join(OUT, ...pasta(idioma).split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderizar(molde, idioma, catalogos[idioma]));
}

// ---------- service worker ----------
// Fora do pré-cache: o próprio service worker, a licença da fonte, a imagem grande de compartilhamento e os ícones maskable
const FORA = new Set(['sw.js', 'portal/fonts/OFL.txt', 'portal/brand/og-symbol-1200.png']);
const lista = [...arquivos(OUT)].map((f) => posix(relative(OUT, f))).sort();
const hash = createHash('sha256');
for (const r of lista.filter((x) => x !== 'sw.js')) hash.update(r).update('\0').update(readFileSync(join(OUT, ...r.split('/')))).update('\0');
const VERSAO = hash.digest('hex').slice(0, 12);
const url = (r) => (r === 'index.html' ? '/' : r.endsWith('/index.html') ? '/' + r.slice(0, -'index.html'.length) : '/' + r);
const PRECACHE = lista.filter((r) => !FORA.has(r) && !r.includes('maskable')).map(url);
const PAGINAS_IDIOMA = IDIOMAS.filter((i) => i !== PADRAO).map(caminho);

const swArq = join(OUT, 'sw.js');
let sw = readFileSync(swArq, 'utf8');
for (const [rx, valor] of [[/\/\*__BUILD__\*\/\s*'dev'/, JSON.stringify(VERSAO)], [/\/\*__PRECACHE__\*\/\s*\[\]/, JSON.stringify(PRECACHE, null, 2)], [/\/\*__IDIOMAS__\*\/\s*\[\]/, JSON.stringify(PAGINAS_IDIOMA)]]) {
  if (!rx.test(sw)) falhar(`marcador ausente em sw.js: ${rx}`);
  sw = sw.replace(rx, valor);
}
writeFileSync(swArq, sw);

let total = 0;
for (const f of arquivos(OUT)) total += statSync(f).size;
console.log(`✔ portal ${VERSAO}: ${IDIOMAS.length} idiomas, ${lista.length} arquivos, ${PRECACHE.length} no pré-cache, ${(total / 1024).toFixed(0)} KB em ${posix(relative(aqui, OUT)) || '.'}`);
