// Contratos entre os projetos do repositório único, no mesmo domínio (saibatudo.net):
// a home (portal/, Vercel saibatudo-portal, em cinco idiomas), o dono do domínio (apps/eleicoes2026/vercel.json) e os apps
// servidos por proxy. Roda na raiz: node --test "tests/*.test.mjs"
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IDIOMAS, ORIGEM, PADRAO, caminho, pasta } from '../portal/src/portal/i18n/index.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const eleicoes = JSON.parse(readFileSync(join(RAIZ, 'apps/eleicoes2026/vercel.json'), 'utf8'));
const por = Object.fromEntries(eleicoes.rewrites.map((r) => [r.source, r.destination]));
const PORTAL = 'https://saibatudo-portal.vercel.app';
const QUIMICA = 'https://saibatudo-quimica.vercel.app';
const ACHAVAGAIA = 'https://saibatudo-achavagaia.vercel.app';
const LLMS = 'https://saibatudo-llms.vercel.app';
const OUTROS = IDIOMAS.filter((i) => i !== PADRAO);
/** Páginas do próprio projeto de eleições (não precisam de regra de proxy). */
const PROPRIOS = ['/eleicoes2026/', '/privacidade', '/sobre-os-dados'];

// A home é gerada no build (uma página por idioma): os testes de links e números olham o resultado, não só o molde.
const tmp = mkdtempSync(join(tmpdir(), 'st-rotas-'));
const pagina = (idioma) => readFileSync(join(tmp, ...pasta(idioma).split('/').filter(Boolean), 'index.html'), 'utf8');
before(() => { execFileSync(process.execPath, [join(RAIZ, 'portal/build.mjs')], { env: { ...process.env, OUT_DIR: tmp }, encoding: 'utf8' }); });
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows */ } });

test('a home vem do portal (proxy) e eleições não gera mais os arquivos da home', () => {
  for (const [origem, destino] of [['/', `${PORTAL}/`], ['/sw.js', `${PORTAL}/sw.js`], ['/manifest.webmanifest', `${PORTAL}/manifest.webmanifest`],
    ['/portal/:path*', `${PORTAL}/portal/:path*`]]) assert.equal(por[origem], destino, origem);
  for (const p of ['portal/src/index.html', 'portal/src/sw.js', 'portal/src/manifest.webmanifest']) assert.ok(existsSync(join(RAIZ, p)), p);
  // o sistema de arquivos vem antes das regras na Vercel: um index.html na raiz do site de eleições esconderia a home do portal
  for (const p of ['index.html', 'sw.js', 'manifest.webmanifest']) assert.ok(!existsSync(join(RAIZ, 'apps/eleicoes2026/web/src', p)), `eleições não pode ter ${p}`);
});

test('home em cinco idiomas: as três formas do endereço de cada idioma (/en, /en/, /en/*) vão ao portal, e eleições não tem pasta com esse nome', () => {
  assert.deepEqual(IDIOMAS, ['pt-BR', 'en', 'es', 'de', 'fr', 'zh']);
  for (const i of OUTROS) {
    assert.equal(por[`/${i}`], `${PORTAL}/${i}/`, `/${i}`);
    assert.equal(por[`/${i}/`], `${PORTAL}/${i}/`, `/${i}/`);
    assert.equal(por[`/${i}/:path*`], `${PORTAL}/${i}/:path*`, `/${i}/:path*`);
    assert.ok(!existsSync(join(RAIZ, 'apps/eleicoes2026/web/src', i)), `eleições não pode ter a pasta web/src/${i}`);
    assert.ok(existsSync(join(tmp, i, 'index.html')), `o build do portal não gerou /${i}/`);
  }
  // nenhuma regra de idioma se mistura com as rotas de eleições (que ficam sob /eleicoes2026/ e /data/)
  for (const r of eleicoes.rewrites) if (/^\/(en|es|de|fr|zh)(\/|$)/.test(r.source)) assert.ok(r.destination.startsWith(`${PORTAL}/`), r.source);
});

test('cada cartão da home tem rota: app do próprio domínio de eleições ou regra exata de proxy (a barra final é literal)', async () => {
  const { APPS } = await import(pathToFileURL(join(RAIZ, 'portal/src/portal/apps.js')).href);
  for (const app of APPS) assert.ok(app.url.startsWith('/eleicoes2026/') || por[app.url], `cartão ${app.id}: sem regra para ${app.url}`);
});

test('química: as três formas do endereço vão ao projeto de química', () => {
  assert.equal(por['/quimica'], `${QUIMICA}/quimica/`);
  assert.equal(por['/quimica/'], `${QUIMICA}/quimica/`);
  assert.equal(por['/quimica/:path*'], `${QUIMICA}/quimica/:path*`);
});

test('LLMs: as três formas do endereço vão ao projeto saibatudo-llms, antes do SPA de eleições', () => {
  assert.equal(por['/llms'], `${LLMS}/llms/`);
  assert.equal(por['/llms/'], `${LLMS}/llms/`);
  assert.equal(por['/llms/:path*'], `${LLMS}/llms/:path*`);
  const fontes = eleicoes.rewrites.map((r) => r.source);
  assert.ok(fontes.indexOf('/llms/:path*') < fontes.findIndex((f) => f.startsWith('/eleicoes2026/')), 'proxy antes do SPA de eleições');
});

test('AchaVagaIA: as três formas do endereço vão ao projeto saibatudo-achavagaia (sempre em /achavagaia/ na origem)', () => {
  assert.equal(por['/achavagaia'], `${ACHAVAGAIA}/achavagaia/`);
  assert.equal(por['/achavagaia/'], `${ACHAVAGAIA}/achavagaia/`);
  assert.equal(por['/achavagaia/:path*'], `${ACHAVAGAIA}/achavagaia/:path*`);
  // proxy antes do SPA de eleições, que responde por /eleicoes2026/* e não pode engolir o app novo
  const fontes = eleicoes.rewrites.map((r) => r.source);
  assert.ok(fontes.indexOf('/achavagaia/:path*') < fontes.findIndex((f) => f.startsWith('/eleicoes2026/')), 'proxy antes do SPA de eleições');
});

test('o service worker da home (escopo /) não intercepta nenhum app servido por proxy, mas atende as páginas da própria home', () => {
  const sw = readFileSync(join(RAIZ, 'portal/src/sw.js'), 'utf8');
  const regras = eleicoes.rewrites.filter((r) => /^\/[a-zA-Z0-9-]+\/:path\*$/.test(r.source)).map((r) => [r.source.split('/')[1], r.destination]);
  const apps = [...new Set(regras.filter(([, d]) => !d.startsWith(`${PORTAL}/`)).map(([p]) => p))];
  const daHome = [...new Set(regras.filter(([, d]) => d.startsWith(`${PORTAL}/`)).map(([p]) => p))];
  assert.ok(apps.includes('quimica') && apps.includes('achavagaia') && apps.includes('llms'), 'química, AchaVagaIA e LLMs são apps por proxy');
  for (const p of apps) assert.ok(sw.includes(`p.startsWith('/${p}/')`), `portal/src/sw.js precisa ignorar /${p}/`);
  assert.ok(daHome.includes('portal') && OUTROS.every((i) => daHome.includes(i)), 'portal e idiomas vão ao portal');
  for (const p of daHome) assert.ok(!sw.includes(`p.startsWith('/${p}/')`), `portal/src/sw.js não deve ignorar /${p}/ (é da home)`);
});

test('todo link das cinco páginas da home tem rota (próprio de eleições, página da home ou proxy exato); química recebe ?lang= fora do português e o AchaVagaIA nunca', () => {
  const inicio = IDIOMAS.map(caminho);
  for (const idioma of IDIOMAS) {
    const html = pagina(idioma);
    assert.ok(html.includes(`<html lang="${idioma}">`), `${idioma}: <html lang>`);
    for (const i of IDIOMAS) assert.ok(html.includes(`<link rel="alternate" hreflang="${i}" href="${ORIGEM}${caminho(i)}">`), `${idioma}: hreflang ${i}`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${ORIGEM}/">`), `${idioma}: x-default`);
    const links = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('/portal/') && u !== '/manifest.webmanifest');
    const esperadoQuimica = idioma === PADRAO ? '/quimica/' : `/quimica/?lang=${idioma === 'zh' ? 'en' : idioma}`; // a química não tem zh
    const esperadoLlms = idioma === PADRAO ? '/llms/' : `/llms/?lang=${idioma}`;
    assert.ok(links.includes(esperadoQuimica) && links.includes(esperadoLlms) && links.includes('/eleicoes2026/') && links.includes('/achavagaia/'), `${idioma}: a home leva aos quatro apps`);
    for (const u of links) {
      const p = u.split(/[?#]/)[0];
      assert.ok(PROPRIOS.includes(p) || inicio.includes(p) || por[p], `${idioma}: link da home sem rota: ${u}`);
      if (p === '/quimica/') assert.equal(u, esperadoQuimica, `${idioma}: link de química`);
      if (p === '/llms/') assert.equal(u, esperadoLlms, `${idioma}: link do LLMs (seis idiomas)`);
      if (p === '/achavagaia/') assert.equal(u, '/achavagaia/', `${idioma}: link do AchaVagaIA (só em português: sem ?lang=)`);
    }
    for (const i of OUTROS) if (i !== idioma) assert.ok(links.includes(caminho(i)), `${idioma}: seletor sem ${caminho(i)}`);
  }
});

test('os números do app de química citados na home batem com o pacote publicado (NUMEROS_QUIMICA ↔ manifest.contagens) nas cinco páginas', async () => {
  const { NUMEROS_QUIMICA } = await import(pathToFileURL(join(RAIZ, 'portal/src/portal/apps.js')).href);
  const contagens = JSON.parse(readFileSync(join(RAIZ, 'apps/quimica/data/quimica/manifest.json'), 'utf8')).contagens;
  const chaves = Object.keys(NUMEROS_QUIMICA);
  assert.ok(chaves.length >= 3 && ['elementos', 'compostos', 'compostosComGhsHarmonizado'].every((k) => chaves.includes(k)), 'a home cita elementos, compostos e compostos com GHS');
  for (const k of chaves) assert.equal(NUMEROS_QUIMICA[k], contagens[k], `home diz ${NUMEROS_QUIMICA[k]} ${k}; o pacote tem ${contagens[k]}`);
  for (const idioma of IDIOMAS) {
    const fmt = new Intl.NumberFormat(idioma);
    const nums = [...pagina(idioma).matchAll(/<span data-num="([A-Za-z]+)">([^<]+)<\/span>/g)];
    assert.deepEqual(nums.map((m) => m[1]).sort(), chaves.sort(), `${idioma}: data-num`);
    for (const [, k, v] of nums) assert.equal(v, fmt.format(contagens[k]), `${idioma}: ${k}`);
  }
});
