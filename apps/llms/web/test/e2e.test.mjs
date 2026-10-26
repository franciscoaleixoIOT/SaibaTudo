// Verificação no navegador real (Chrome headless): percorre as telas (assistente, explorador, presets, PCA, Aprenda, Sobre, chinês, privacidade),
// testa o modo offline com o service worker e falha se houver exceção, console.error ou violação de CSP. Só roda com E2E=1 (precisa do Chrome):
//
//   E2E=1 npm test            (ou: E2E=1 node --test test/e2e.test.mjs)
//   CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DADOS } from './support.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const habilitado = process.env.E2E === '1' && (process.platform !== 'win32' || existsSync(CHROME));

test('navegador real: telas, explorador, nuvem, chinês, CSP sem violações e offline', { skip: habilitado ? false : 'defina E2E=1 (e tenha o Chrome instalado)', timeout: 600000 }, async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'stl-e2e-'));
  const out = join(tmp, 'dist');
  const chave = readFileSync(resolve(aqui, 'fixtures/chave_teste_public.b64'), 'utf8').trim();
  execFileSync(process.execPath, [resolve(aqui, '../build.mjs')], { env: { ...process.env, DATA_DIR: DADOS, OUT_DIR: out, PUB_KEY_B64: chave }, stdio: 'ignore' });
  const porta = 4900 + Math.floor(Math.random() * 90);
  const srv = spawn(process.execPath, [resolve(aqui, '../serve.mjs')], { env: { ...process.env, PORT: String(porta), DIR: out }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${porta}/llms/`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
    let saida = '';
    try {
      saida = execFileSync(process.execPath, [resolve(aqui, '../tools/screenshots.mjs'), `http://127.0.0.1:${porta}`, join(tmp, 'shots')], { env: { ...process.env, CHROME }, encoding: 'utf8', timeout: 550000 });
    } catch (e) { assert.fail(`verificação no navegador falhou:\n${e.stdout ?? ''}${e.stderr ?? ''}`); }
    assert.match(saida, /OK: \d+ cenários/);
  } finally {
    srv.kill();
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows */ }
  }
});
