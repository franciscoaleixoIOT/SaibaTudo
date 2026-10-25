// Build (web/build.mjs), service worker gerado, servidor local e vercel.json. O build usa o pacote de teste (DATA_DIR) assinado com a chave de teste.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CHAVE_TESTE_B64, DADOS, RAIZ } from './support.mjs';

const IDIOMAS_EXTRA = ['en', 'es', 'de', 'fr', 'zh'];
const aqui = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(aqui, '../build.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'stl-build-'));
const OUT = join(tmp, 'dist');
const OUT2 = join(tmp, 'dist2');
const L = (base = OUT) => join(base, 'llms');
// a fixture é assinada com a chave de teste: o build recebe a chave pública por PUB_KEY_B64 (em produção usa pipeline/data_signing_public.b64)
const roda = (out, env = {}) => execFileSync(process.execPath, [BUILD], { env: { ...process.env, DATA_DIR: DADOS, OUT_DIR: out, PUB_KEY_B64: CHAVE_TESTE_B64, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

before(() => { roda(OUT); });
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* arquivos em uso no Windows */ } });

const ler = (p, base = OUT) => readFileSync(join(L(base), ...p.split('/')), 'utf8');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const vercel = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8'));

test('estrutura de dist: tudo sob /llms/ (páginas, manifestos por idioma, catálogos, service worker, CSS, JS e os 7 arquivos do pacote)', () => {
  for (const p of ['index.html', 'offline.html', 'manifest.webmanifest', ...IDIOMAS_EXTRA.flatMap((i) => [`manifest.${i}.webmanifest`, `js/i18n/catalogos/${i}.js`]), 'js/i18n/catalogos/pt-BR.js', 'js/i18n/index.js', 'js/i18n/idiomas.js',
    'sw.js', 'css/base.css', 'css/app.css', 'js/main.js', 'js/app.js', 'js/prefs.js', 'js/build-info.js', 'js/theme-init.js',
    'data/manifest.json', 'data/manifest.sig', 'data/vocab.json', 'data/vetores.i8', 'data/escalas.f32', 'data/glossario.json', 'data/presets.json']) {
    assert.ok(existsSync(join(L(), ...p.split('/'))), `faltando em dist/llms: ${p}`);
  }
  assert.deepEqual(readdirSync(OUT), ['llms'], 'nada fora de /llms/ (o projeto é servido assim, direto ou por rewrite)');
  // a chave pública que assina o pacote é injetada no cliente pelo build (a fonte traz só o marcador): o site verifica com a mesma chave do build
  assert.ok(ler('js/verify.js').includes(CHAVE_TESTE_B64), 'verify.js em dist com a chave pública do build');
  assert.ok(!ler('js/verify.js').includes('__CHAVE_PUBLICA__'), 'marcador substituído');
});

test('dados em dist são cópias byte a byte do pacote assinado e conferem com o manifesto', () => {
  const m = JSON.parse(readFileSync(join(DADOS, 'manifest.json'), 'utf8'));
  for (const [path, a] of Object.entries(m.files)) assert.equal(sha(readFileSync(join(L(), 'data', ...path.split('/')))), a.sha256, path);
  assert.equal(sha(readFileSync(join(L(), 'data/manifest.json'))), sha(readFileSync(join(DADOS, 'manifest.json'))));
  assert.equal(ler('data/manifest.sig'), readFileSync(join(DADOS, 'manifest.sig'), 'utf8'));
});

test('service worker gerado: versão, pré-cache do shell com URLs limpas e pré-cache de TODOS os arquivos do pacote (?v=sha)', () => {
  const sw = ler('sw.js');
  assert.ok(!sw.includes('/*__'), 'marcadores não substituídos');
  const versao = /const VERSAO = "([0-9a-f]{12})"/.exec(sw)?.[1];
  assert.ok(versao, 'VERSAO (hash do conteúdo)');
  assert.ok(new RegExp(`export const BUILD = "${versao}"`).test(ler('js/build-info.js')));
  const m = JSON.parse(readFileSync(join(DADOS, 'manifest.json'), 'utf8'));
  assert.match(ler('js/build-info.js'), new RegExp(`DATA_VERSION = "${m.version}"`));
  const pre = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(sw)[1]);
  for (const u of ['/llms/', '/llms/offline', '/llms/js/main.js', '/llms/css/app.css', '/llms/manifest.webmanifest', ...IDIOMAS_EXTRA.flatMap((i) => [`/llms/manifest.${i}.webmanifest`, `/llms/js/i18n/catalogos/${i}.js`])]) {
    assert.ok(pre.includes(u), `pré-cache sem ${u}`);
  }
  assert.ok(pre.every((u) => u.startsWith('/llms/') && !u.endsWith('.html') && !u.includes('/api/') && !u.startsWith('/llms/data/') && !u.includes('og-llms')), 'URLs limpas, sem dados nem API no shell');
  const dados = JSON.parse(/const PRECACHE_DADOS = (\[[\s\S]*?\]);/.exec(sw)[1]);
  assert.ok(dados.includes('/llms/data/manifest.json') && dados.includes('/llms/data/manifest.sig'));
  for (const f of ['vocab.json', 'vetores.i8', 'escalas.f32', 'glossario.json', 'presets.json']) {
    assert.ok(dados.some((u) => new RegExp(`^/llms/data/${f.replace('.', '\\.')}\\?v=[0-9a-f]{16}$`).test(u)), `pacote inteiro no pré-cache: ${f}`);
  }
  for (const u of [...pre, ...dados]) {
    const p = u.split('?')[0].replace(/^\/llms\/?/, '');
    const abs = join(L(), ...p.split('/').filter(Boolean));
    assert.ok(existsSync(abs) || existsSync(join(abs, 'index.html')) || existsSync(abs + '.html'), `pré-cache aponta para arquivo inexistente: ${u}`);
  }
  assert.match(sw, /startsWith\(['"]\/api\//);
  assert.match(sw, /startsWith\(['"]\/llms\/api\//);
  assert.match(sw, /req\.method!=="GET"|req\.method !== 'GET'/);
  assert.ok(sw.includes('llms-shell-') && sw.includes('llms-dados-v1'), 'nomes dos caches com o prefixo do app');
});

test('a versão (hash) é determinística: duas builds idênticas geram o mesmo BUILD e o mesmo service worker', () => {
  roda(OUT2);
  assert.equal(ler('js/build-info.js', OUT2), ler('js/build-info.js'));
  assert.equal(ler('sw.js', OUT2), ler('sw.js'));
});

test('o build recusa pacote adulterado (sha256 divergente) e manifesto com assinatura inválida; SKIP_VERIFY=1 só para testes', () => {
  const falso = join(tmp, 'falso');
  cpSync(DADOS, falso, { recursive: true });
  writeFileSync(join(falso, 'vocab.json'), '["x"]');
  assert.throws(() => roda(join(tmp, 'dist3'), { DATA_DIR: falso }), /(tamanho|sha256) divergente/);
  const falso2 = join(tmp, 'falso2');
  cpSync(DADOS, falso2, { recursive: true });
  const m = JSON.parse(readFileSync(join(falso2, 'manifest.json'), 'utf8'));
  m.generatedAt = '2030-01-01T00:00:00Z';
  writeFileSync(join(falso2, 'manifest.json'), JSON.stringify(m));
  assert.throws(() => roda(join(tmp, 'dist4'), { DATA_DIR: falso2 }), /assinatura do manifesto INV/);
  assert.doesNotThrow(() => roda(join(tmp, 'dist5'), { DATA_DIR: falso2, SKIP_VERIFY: '1' }));
});

test('vercel.json: rewrites de /llms/api e SPA, CSP estrita sem CDN, headers de segurança e funções com includeFiles do manifesto', () => {
  const rw = Object.fromEntries(vercel.rewrites.map((r) => [r.source, r.destination]));
  assert.equal(rw['/llms/api/:path*'], '/api/:path*');
  assert.ok(Object.keys(rw).some((s) => s.startsWith('/llms/:path')), 'rota SPA');
  const geral = vercel.headers.find((h) => h.source === '/(.*)').headers;
  const csp = geral.find((h) => h.key === 'Content-Security-Policy').value;
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /connect-src 'self'/);
  assert.ok(!/unsafe-inline|https?:\/\//.test(csp), 'sem inline nem origens externas');
  for (const k of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Strict-Transport-Security', 'Permissions-Policy']) assert.ok(geral.some((h) => h.key === k), k);
  assert.equal(vercel.functions['api/health.js'].includeFiles, 'data/llms/manifest.json');
  assert.equal(vercel.outputDirectory, 'web/dist');
  assert.equal(vercel.buildCommand, 'node web/build.mjs');
});
