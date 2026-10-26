// Home de saibatudo.net (projeto próprio, servido pelo proxy do projeto de eleições): build, páginas por idioma, catálogos,
// independência dos outros projetos, service worker (arquivo real num ambiente simulado) e vercel.json.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { IDIOMAS, ORIGEM, PADRAO, caminho, pasta } from '../src/portal/i18n/index.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');
const tmp = mkdtempSync(join(tmpdir(), 'st-portal-'));
const OUT = join(tmp, 'dist');
const OUT2 = join(tmp, 'dist2');
const roda = (out) => execFileSync(process.execPath, [join(RAIZ, 'build.mjs')], { env: { ...process.env, OUT_DIR: out }, encoding: 'utf8' });
const ler = (p, base = OUT) => readFileSync(join(base, ...p.split('/').filter(Boolean)), 'utf8');
const pagina = (idioma, base = OUT) => ler(`${pasta(idioma)}/index.html`, base);
const existe = (u, base = OUT) => {
  const p = u.split(/[?#]/)[0];
  if (p.endsWith('/')) return existsSync(join(base, ...p.split('/').filter(Boolean), 'index.html'));
  return existsSync(join(base, ...p.split('/').filter(Boolean)));
};
const semQuery = (u) => u.split(/[?#]/)[0];
const OUTROS = IDIOMAS.filter((i) => i !== PADRAO);
/** Links de navegação para páginas de outros projetos no mesmo domínio (não são recursos da home). */
const PAGINAS = ['/eleicoes2026/', '/privacidade', '/sobre-os-dados', '/quimica/', '/llms/', '/achavagaia/'];
const catalogo = async (idioma) => (await import(pathToFileURL(join(SRC, 'portal/i18n', `${idioma}.js`)).href)).default;

before(() => { roda(OUT); });
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows */ } });

test('todo recurso local da home existe no próprio projeto (independente de eleições e química), nas cinco páginas', () => {
  for (const idioma of IDIOMAS) {
    const html = pagina(idioma);
    const locais = [...html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)].map((m) => m[1]);
    assert.ok(locais.length > 10);
    for (const u of locais) {
      const p = semQuery(u);
      if (PAGINAS.includes(p) || IDIOMAS.some((i) => caminho(i) === p)) { assert.ok(existe(p) || PAGINAS.includes(p), `${idioma}: página ausente ${p}`); continue; }
      assert.ok(p.startsWith('/portal/') || p === '/manifest.webmanifest', `${idioma}: recurso fora de /portal/: ${u}`);
      assert.ok(existe(p), `${idioma}: recurso ausente no build: ${u}`);
    }
    for (const m of html.matchAll(/content="https:\/\/saibatudo\.net(\/[^"]+)"/g)) if (!IDIOMAS.some((i) => caminho(i) === m[1])) assert.ok(existe(m[1]), `imagem de compartilhamento ausente: ${m[1]}`);
  }
  for (const arq of ['index.html', 'en/index.html', 'portal/home.js', 'portal/textos.js', 'portal/base.css', 'portal/site.css', 'manifest.webmanifest']) {
    const s = ler(arq);
    for (const proibido of ['"/assets/', "'/assets/", '"/brand/', '"/fonts/', '/eleicoes2026/js/', '/quimica/js/', '/achavagaia/js/']) assert.ok(!s.includes(proibido), `${arq} depende de outro projeto: ${proibido}`);
  }
  for (const m of ler('portal/home.js').matchAll(/from '([^']+)'/g)) assert.ok(m[1].startsWith('/portal/') && existe(m[1]), `import fora do portal: ${m[1]}`);
  for (const m of ler('portal/base.css').matchAll(/url\("([^"]+)"\)/g)) assert.ok(existe(m[1]), `CSS aponta para arquivo ausente: ${m[1]}`);
  for (const i of JSON.parse(ler('manifest.webmanifest')).icons) assert.ok(existe(i.src), `ícone do manifesto ausente: ${i.src}`);
  assert.equal(readFileSync(join(OUT, 'portal/fonts/poppins-semibold.woff')).subarray(0, 4).toString('latin1'), 'wOFF');
  // os três apps têm o MESMO destaque (decisão do mantenedor, 12/10/2026): botão dourado no topo e cartão principal com ícone
  // próprio e o mesmo botão primário grande
  const html = pagina(PADRAO);
  assert.match(html, /class="hero-acoes">[\s\S]*href="\/eleicoes2026\/"[\s\S]*href="\/quimica\/"[\s\S]*href="\/llms\/"[\s\S]*href="\/achavagaia\/"[\s\S]*?<\/p>/);
  assert.equal((html.match(/class="card app-principal/g) || []).length, 4);
  assert.ok(html.includes('/portal/brand/svg/quimica-icon.svg') && html.includes('/portal/brand/svg/eleicoes2026-icon.svg') && html.includes('/portal/brand/svg/achavagaia-icon.svg') && html.includes('/portal/brand/svg/llms-icon.svg'));
  for (const idioma of IDIOMAS) {
    const h = pagina(idioma);
    const hero = /class="hero-acoes">([\s\S]*?)<\/p>/.exec(h)[1];
    const botoesHero = [...hero.matchAll(/<a class="([^"]+)" href="(\/[^"]*)"/g)].map((m) => m.slice(1));
    assert.deepEqual(botoesHero.map((b) => b[0]), Array(4).fill('btn btn-ouro grande'), `${idioma}: botões do topo com o mesmo destaque`);
    assert.deepEqual(botoesHero.map((b) => b[1].split('?')[0]), ['/eleicoes2026/', '/quimica/', '/llms/', '/achavagaia/'], `${idioma}: botões do topo`);
    const cartoes = [...h.matchAll(/<article class="card app-principal[^"]*">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
    assert.equal(cartoes.length, 4, `${idioma}: cartões principais`);
    const abrir = cartoes.map((x) => /<a class="(btn btn-primario grande)" href="(\/[^"]*)"/.exec(x));
    assert.ok(abrir.every(Boolean), `${idioma}: cada cartão tem o botão primário grande`);
    assert.deepEqual(abrir.map((m) => m[2].split('?')[0]), ['/eleicoes2026/', '/quimica/', '/llms/', '/achavagaia/'], `${idioma}: botões dos cartões`);
    assert.ok(cartoes.every((x) => x.includes('<img class="app-icone"')), `${idioma}: cada cartão tem ícone`);
  }
  assert.ok(existsSync(join(OUT, 'portal/brand/svg/achavagaia-icon.svg')));
  // o molde e os catálogos são só de build: não vão para dist/
  assert.ok(!existsSync(join(OUT, 'portal/i18n')), 'catálogos não devem ir para dist/');
  assert.ok(!html.includes('{{') && !html.includes('<!-- molde'), 'marcadores do molde na página');
});

test('módulos da home: apps.js, textos.js e icons.js carregam; apps com id, nome e endereço; "Em breve" e UI traduzidos', async () => {
  const { APPS, EM_BREVE, NUMEROS_QUIMICA } = await import(pathToFileURL(join(OUT, 'portal/apps.js')).href);
  const { svgIcone } = await import(pathToFileURL(join(OUT, 'portal/icons.js')).href);
  const { UI, AVISO } = await import(pathToFileURL(join(OUT, 'portal/textos.js')).href);
  assert.ok(Array.isArray(APPS) && Array.isArray(EM_BREVE));
  for (const a of APPS) assert.ok(a.id && a.nome && /^\/[a-z0-9-]+\/$/.test(a.url), JSON.stringify(a));
  for (const a of EM_BREVE) for (const i of OUTROS) assert.ok(a.traducoes?.[i]?.titulo && a.traducoes[i].descricao, `EM_BREVE ${a.id}: falta tradução ${i}`);
  for (const k of ['elementos', 'compostos', 'compostosComGhsHarmonizado']) assert.ok(Number.isInteger(NUMEROS_QUIMICA[k]) && NUMEROS_QUIMICA[k] > 0, k);
  for (const idioma of IDIOMAS) for (const s of pagina(idioma).matchAll(/data-icone="([a-z-]+)"/gi)) assert.match(svgIcone(s[1], 20), /^<svg/, `ícone ${s[1]}`);
  assert.deepEqual(Object.keys(UI).sort(), [...IDIOMAS].sort());
  const forma = (o) => Object.entries(o).map(([k, v]) => `${k}:${typeof v === 'object' ? Object.keys(v).sort().join(',') : typeof v}`).sort().join('|');
  for (const i of OUTROS) assert.equal(forma(UI[i]), forma(UI[PADRAO]), `UI ${i} difere de pt-BR`);
  assert.deepEqual(Object.keys(AVISO).sort(), [...OUTROS].sort());
  for (const i of OUTROS) assert.ok(AVISO[i].texto && AVISO[i].fechar, `AVISO ${i}`);
  // o rótulo inicial do botão de tema na página bate com o que home.js aplica ao carregar
  for (const idioma of IDIOMAS) assert.ok(pagina(idioma).includes(`aria-label="${UI[idioma].temaAria(UI[idioma].tema.SISTEMA)}"`), `${idioma}: aria-label do tema`);
});

test('catálogos: mesmas chaves que pt-BR, sem vazios, mesmas marcas inline e {num:}; marcas não traduzidas; revisão marcada', async () => {
  const ref = await catalogo(PADRAO);
  const folhas = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? folhas(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
  const refFolhas = Object.fromEntries(folhas(ref));
  const marcas = (s) => (String(s).match(/<[^>]+>|\{num:[A-Za-z]+\}/g) || []).sort().join(' ');
  assert.equal(ref.idioma, PADRAO);
  for (const idioma of OUTROS) {
    const c = await catalogo(idioma);
    const f = Object.fromEntries(folhas(c));
    assert.deepEqual(Object.keys(f).sort(), Object.keys(refFolhas).sort(), `${idioma}: chaves diferentes de pt-BR`);
    for (const [k, v] of Object.entries(f)) {
      assert.ok(typeof v === 'string' && v.trim() !== '', `${idioma}: ${k} vazio`);
      assert.equal(marcas(v), marcas(refFolhas[k]), `${idioma}: ${k} com marcas/números diferentes de pt-BR`);
    }
    assert.equal(c.idioma, idioma);
    assert.ok(['pendente', 'humana'].includes(c.revisao), `${idioma}: revisao deve ser 'pendente' ou 'humana'`);
    assert.equal(c.eleicoes.nome, 'SaibaTudo — Eleições 2026', `${idioma}: marca traduzida`);
    assert.equal(c.quimica.nome, 'SaibaTudo — Química', `${idioma}: marca traduzida`);
    assert.equal(c.achavagaia.nome, 'SaibaTudo — AchaVagaIA', `${idioma}: marca traduzida`);
    assert.equal(c.llms.nome, 'SaibaTudo — LLMs', `${idioma}: marca traduzida`);
    assert.ok(c.meta.titulo.startsWith('SaibaTudo') && c.nomeNativo && c.ogLocale && c.eleicoes.apenasPortugues && c.achavagaia.apenasPortugues, idioma);
  }
  // pt-BR: só eleicoes.apenasPortugues e achavagaia.apenasPortugues podem ser vazios (o selo "só em português" não aparece na página em português)
  for (const [k, v] of Object.entries(refFolhas)) if (!/^(eleicoes|achavagaia)\.apenasPortugues$/.test(k)) assert.ok(typeof v === 'string' && v.trim() !== '', `pt-BR: ${k} vazio`);
  assert.equal(ref.eleicoes.apenasPortugues, '');
  assert.equal(ref.achavagaia.apenasPortugues, '');
});

test('uma página por idioma: lang, título, canônica, hreflang (cinco + x-default), seletor com aria-current, links de química com ?lang (AchaVagaIA sem) e selos de eleições e AchaVagaIA', async () => {
  for (const idioma of IDIOMAS) {
    const html = pagina(idioma);
    const c = await catalogo(idioma);
    assert.ok(html.startsWith('<!doctype html>'), idioma);
    assert.ok(html.includes(`<html lang="${idioma}">`), `${idioma}: <html lang>`);
    assert.ok(html.includes(`<title>${c.meta.titulo}</title>`), `${idioma}: título`);
    assert.ok(html.includes(`<meta name="description" content="${c.meta.descricao}">`), `${idioma}: description`);
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGEM}${caminho(idioma)}">`), `${idioma}: canônica`);
    assert.ok(html.includes(`<meta property="og:url" content="${ORIGEM}${caminho(idioma)}">`) && html.includes(`<meta property="og:locale" content="${c.ogLocale}">`), `${idioma}: Open Graph`);
    for (const i of IDIOMAS) assert.ok(html.includes(`<link rel="alternate" hreflang="${i}" href="${ORIGEM}${caminho(i)}">`), `${idioma}: hreflang ${i}`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${ORIGEM}/">`), `${idioma}: x-default`);
    assert.equal((html.match(/hreflang="x-default"/g) || []).length, 1);
    // seletor: um link por idioma, com hreflang + lang, e só o idioma atual com aria-current
    const nav = /<nav class="idiomas" aria-label="([^"]+)">([\s\S]*?)<\/nav>/.exec(html);
    assert.ok(nav, `${idioma}: seletor de idiomas`);
    assert.equal(nav[1], c.idiomas.rotulo);
    const links = [...nav[2].matchAll(/<a href="([^"]+)" hreflang="([^"]+)" lang="([^"]+)"( aria-current="page")?>([^<]+)<\/a>/g)];
    assert.deepEqual(links.map((m) => m[2]), IDIOMAS, `${idioma}: links do seletor`);
    for (const m of links) { assert.equal(m[1], caminho(m[2])); assert.equal(m[3], m[2]); assert.ok(m[5].trim()); }
    assert.deepEqual(links.filter((m) => m[4]).map((m) => m[2]), [idioma], `${idioma}: aria-current`);
    assert.ok(html.includes('data-icone="globe"'));
    // química no idioma da página; eleições sempre em português, com selo fora do português
    const quimica = [...html.matchAll(/href="(\/quimica\/[^"]*)"/g)].map((m) => m[1]);
    assert.ok(quimica.length >= 3, `${idioma}: links de química`);
    const langQuimica = idioma === 'zh' ? 'en' : idioma; // a química ainda não fala chinês
    for (const u of quimica) assert.equal(u, idioma === PADRAO ? '/quimica/' : `/quimica/?lang=${langQuimica}`, `${idioma}: ${u}`);
    const llms = [...html.matchAll(/href="(\/llms\/[^"]*)"/g)].map((m) => m[1]);
    assert.ok(llms.length >= 3, `${idioma}: links do LLMs`);
    for (const u of llms) assert.equal(u, idioma === PADRAO ? '/llms/' : `/llms/?lang=${idioma}`, `${idioma}: ${u}`);
    assert.ok(html.includes('href="/eleicoes2026/"') && !html.includes('/eleicoes2026/?lang'), `${idioma}: eleições`);
    const selos = [...html.matchAll(/<span class="tag tag-neutro selo-idioma">([^<]+)<\/span>/g)].map((m) => m[1]);
    if (idioma === PADRAO) assert.deepEqual(selos, [], 'a página em português não tem selo "só em português"');
    else assert.deepEqual(selos, [c.eleicoes.apenasPortugues, c.achavagaia.apenasPortugues], `${idioma}: selos "só em português" (eleições e AchaVagaIA)`);
    // AchaVagaIA: só em português por enquanto, então o link NÃO ganha ?lang= (diferente de química); selo de "em construção" em todos os idiomas
    const achavaga = [...html.matchAll(/href="(\/achavagaia\/[^"]*)"/g)].map((m) => m[1]);
    assert.equal(achavaga.length, 2, `${idioma}: links do AchaVagaIA (botão do topo e do cartão)`);
    for (const u of achavaga) assert.equal(u, '/achavagaia/', `${idioma}: link do AchaVagaIA sem ?lang=`);
    assert.ok(html.includes(`<span class="tag tag-ouro selo-idioma">${c.achavagaia.emConstrucao}</span>`), `${idioma}: selo de primeira versão em construção`);
    assert.ok(!/github\.com\/[^"]*achavaga/i.test(html), `${idioma}: a home não linka o repositório do AchaVagaIA`);
    assert.ok(html.includes(`href="${caminho(idioma)}" aria-label="${c.topo.marcaAria}"`), `${idioma}: marca leva à home do idioma`);
    assert.ok(!html.includes('{{') && !html.includes('{num:') && !html.includes('<!-- molde'), `${idioma}: marcador não resolvido`);
  }
});

test('números do cartão de química no formato de cada idioma (Intl.NumberFormat), com os ganchos data-num', async () => {
  const { NUMEROS_QUIMICA } = await import(pathToFileURL(join(OUT, 'portal/apps.js')).href);
  for (const idioma of IDIOMAS) {
    const fmt = new Intl.NumberFormat(idioma);
    const nums = [...pagina(idioma).matchAll(/<span data-num="([A-Za-z]+)">([^<]+)<\/span>/g)];
    assert.deepEqual(nums.map((m) => m[1]).sort(), Object.keys(NUMEROS_QUIMICA).sort(), `${idioma}: data-num`);
    for (const [, k, v] of nums) assert.equal(v, fmt.format(NUMEROS_QUIMICA[k]), `${idioma}: ${k}`);
  }
  assert.ok(pagina('en').includes('data-num="compostos">1,971<') && pagina(PADRAO).includes('data-num="compostos">1.971<'));
});

test('service worker: versão (hash), pré-cache (com as cinco páginas) e páginas por idioma preenchidos; sem /api, /data nem outros apps; build reproduzível', () => {
  const sw = ler('sw.js');
  assert.ok(!sw.includes('/*__'), 'marcadores não substituídos');
  assert.match(sw, /const VERSAO = "[0-9a-f]{12}"/);
  const pre = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(sw)[1]);
  assert.ok(pre.includes('/') && pre.includes('/portal/home.js') && pre.includes('/portal/apps.js') && pre.includes('/portal/textos.js') && pre.includes('/manifest.webmanifest'));
  for (const i of IDIOMAS) assert.ok(pre.includes(caminho(i)), `pré-cache sem ${caminho(i)}`);
  for (const u of pre) {
    assert.ok(existe(u), `pré-cache aponta para arquivo inexistente: ${u}`);
    assert.ok(!/^\/(api|data|quimica|achavagaia|eleicoes2026)\//.test(u) && !u.endsWith('.html') && !u.includes('/i18n/'), `fora do escopo da home: ${u}`);
  }
  assert.deepEqual(JSON.parse(/const PAGINAS_IDIOMA = (\[[^\]]*\]);/.exec(sw)[1]), OUTROS.map(caminho));
  new vm.Script(sw, { filename: 'sw.js' });
  roda(OUT2);
  assert.equal(ler('sw.js', OUT2), sw, 'duas builds idênticas geram o mesmo service worker');
  for (const i of IDIOMAS) assert.equal(pagina(i, OUT2), pagina(i), `${i}: build não reproduzível`);
});

/** Carrega o sw.js do src e devolve intercepta(url, modo) → true se o SW chamou respondWith. */
function carregarSw() {
  const manipuladores = {};
  const self = { location: new URL('https://saibatudo.net'), addEventListener: (t, fn) => { manipuladores[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const caches = { open: async () => ({ match: async () => undefined, put: async () => {} }), keys: async () => [], delete: async () => true };
  vm.runInNewContext(readFileSync(join(SRC, 'sw.js'), 'utf8'), { self, caches, fetch: async () => new Response('ok'), Response, Request, URL, Promise, console }, { filename: 'sw.js' });
  return (url, mode = 'cors', method = 'GET') => {
    let interceptou = false;
    manipuladores.fetch({ request: { url: new URL(url, 'https://saibatudo.net').href, mode, method }, respondWith: (p) => { interceptou = true; p.catch(() => {}); }, waitUntil: () => {} });
    return interceptou;
  };
}

test('service worker: NUNCA intercepta química, AchaVagaIA, API, dados, navegações de eleições nem métodos além de GET; atende as páginas por idioma', () => {
  const intercepta = carregarSw();
  for (const u of ['/quimica', '/quimica/', '/quimica/tabela', '/quimica/js/main.js', '/quimica/data/manifest.json', '/quimica/api/health', '/quimica/?lang=en',
    '/achavagaia', '/achavagaia/', '/achavagaia/curriculo', '/achavagaia/js/main.js', '/achavagaia/manifest.webmanifest', '/achavagaia/?lang=en']) {
    assert.equal(intercepta(u), false, u);
    assert.equal(intercepta(u, 'navigate'), false, `${u} (navegação)`);
  }
  assert.equal(intercepta('/api/health'), false);
  assert.equal(intercepta('/data/eleicoes2026/manifest.json'), false);
  assert.equal(intercepta('/eleicoes2026/', 'navigate'), false);
  assert.equal(intercepta('/portal/home.js', 'cors', 'POST'), false);
  assert.equal(intercepta('/', 'navigate'), true);
  for (const i of OUTROS) { assert.equal(intercepta(caminho(i), 'navigate'), true, caminho(i)); assert.equal(intercepta(caminho(i).slice(0, -1), 'navigate'), true, `/${i}`); }
  assert.equal(intercepta('/portal/home.js'), true);
  assert.equal(intercepta('/quimicax/arquivo.js'), true, 'só o prefixo exato /quimica/ fica de fora');
  assert.equal(intercepta('/achavagaiax/arquivo.js'), true, 'só o prefixo exato /achavagaia/ fica de fora');
});

test('service worker offline: a navegação a /en/ cai na página do idioma em cache, não na portuguesa', async () => {
  const sw = ler('sw.js');
  const manipuladores = {};
  const guardado = new Map([['/', 'pt'], ['/en/', 'en']]);
  const self = { location: new URL('https://saibatudo.net'), addEventListener: (t, fn) => { manipuladores[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const caches = { open: async () => ({ match: async (req) => { const u = typeof req === 'string' ? req : new URL(req.url).pathname; return guardado.has(u) ? new Response(guardado.get(u)) : undefined; }, put: async () => {} }), keys: async () => [], delete: async () => true };
  vm.runInNewContext(sw, { self, caches, fetch: async () => { throw new TypeError('offline'); }, Response, Request, URL, Promise, console }, { filename: 'sw.js' });
  const navega = (u) => new Promise((ok) => manipuladores.fetch({ request: { url: `https://saibatudo.net${u}`, mode: 'navigate', method: 'GET' }, respondWith: (p) => ok(p), waitUntil: () => {} }));
  assert.equal(await (await navega('/en')).text(), 'en');
  assert.equal(await (await navega('/en/?x=1')).text(), 'en');
  assert.equal(await (await navega('/fr/')).text(), 'pt', 'idioma sem cópia em cache cai na home');
  assert.equal(await (await navega('/')).text(), 'pt');
});

test('manifesto web da home: campos exigidos, escopo / e ícones any + maskable', () => {
  const m = JSON.parse(ler('manifest.webmanifest'));
  assert.equal(m.name, 'SaibaTudo');
  assert.equal(m.short_name, 'SaibaTudo');
  assert.equal(m.scope, '/');
  assert.equal(m.display, 'standalone');
  assert.equal(m.theme_color, '#0C2340');
  assert.equal(m.lang, 'pt-BR');
  assert.ok(m.start_url.startsWith('/') && m.start_url.includes('source=pwa'));
  assert.ok(m.background_color);
  const tamanhos = m.icons.map((i) => `${i.sizes}:${i.purpose}`);
  for (const t of ['192x192:any', '512x512:any', '192x192:maskable', '512x512:maskable']) assert.ok(tamanhos.includes(t), `ícone ${t}`);
  for (const s of m.shortcuts ?? []) assert.ok(s.url.startsWith('/') && s.icons.every((i) => existe(i.src)), `atalho ${s.name}`);
});

test('vercel.json: build, saída, cleanUrls e CSP restritiva', () => {
  const v = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8'));
  assert.equal(v.buildCommand, 'node build.mjs');
  assert.equal(v.outputDirectory, 'dist');
  assert.equal(v.cleanUrls, true);
  const csp = v.headers.find((h) => h.source === '/(.*)').headers.find((x) => x.key === 'Content-Security-Policy').value;
  assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval') && !/https?:\/\//.test(csp));
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
});
