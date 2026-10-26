// Política de privacidade em seis idiomas (privacidade/index.html = pt-BR, texto-fonte; privacidade/<idioma>.html): mesma estrutura de seções e
// tabela de conexões, hreflang dos seis + x-default, canonical, link de volta ao app no idioma, contato do responsável, versão, sem inline (CSP),
// e o que a política promete bate com o app: nuvem opt-in por /llms/api/ask, sem "ajudar a melhorar", nada de analytics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IDIOMAS, caminhoPrivacidade } from '../src/llms/js/i18n/index.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src/llms');
const pagina = (i) => readFileSync(join(SRC, 'privacidade', i === 'pt-BR' ? 'index.html' : `${i}.html`), 'utf8');
const alternativas = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => `${m[1]} ${m[2]}`);
const ESPERADAS = [...IDIOMAS.map((i) => `${i} https://saibatudo.net${caminhoPrivacidade(i)}`), 'x-default https://saibatudo.net/llms/privacidade'];

test('pt-BR é o texto-fonte: versão 1.0, contato, 12 seções, tabela de conexões com Vercel, links externos e IA na nuvem; sem inline', () => {
  const pt = pagina('pt-BR');
  assert.match(pt, /<html lang="pt-BR">/);
  assert.match(pt, /<link rel="canonical" href="https:\/\/saibatudo\.net\/llms\/privacidade">/);
  assert.deepEqual(alternativas(pt), ESPERADAS);
  assert.match(pt, /Versão 1\.0/);
  assert.ok(pt.includes('saibatudo@saibatudo.net') && pt.includes('Francisco Aleixo'));
  assert.equal((pt.match(/<h2>/g) ?? []).length, 12);
  assert.ok((pt.match(/<tr>/g) ?? []).length >= 4, 'cabeçalho + 3 conexões');
  assert.ok(pt.includes('/llms/api/ask') && /Hugging Face/.test(pt), 'a conexão da IA na nuvem está descrita');
  assert.ok(!/melhoria|Ajudar a melhorar/.test(pt), 'este app não tem a captura de perguntas');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(pt) && !/\sstyle=/.test(pt), 'CSP: sem script nem estilo inline');
  assert.ok(pt.includes('GloVe'), 'origem dos dados');
});

test('cada idioma: html lang, canonical próprio, as seis alternativas, link ao texto-fonte, volta ao app no idioma, mesma estrutura do pt-BR', () => {
  const pt = pagina('pt-BR');
  for (const idioma of IDIOMAS.filter((i) => i !== 'pt-BR')) {
    const p = pagina(idioma);
    assert.match(p, new RegExp(`<html lang="${idioma}">`), idioma);
    assert.match(p, new RegExp(`<link rel="canonical" href="https://saibatudo\\.net/llms/privacidade/${idioma}">`), idioma);
    assert.deepEqual(alternativas(p), ESPERADAS, idioma);
    assert.match(p, /<a href="\/llms\/privacidade" hreflang="pt-BR" lang="pt-BR">/, `${idioma}: link para o texto-fonte`);
    assert.ok(p.includes(`/llms/?lang=${idioma}`), `${idioma}: volta ao app no idioma`);
    assert.equal((p.match(/<h2>/g) ?? []).length, (pt.match(/<h2>/g) ?? []).length, `${idioma}: seções`);
    assert.equal((p.match(/<tr>/g) ?? []).length, (pt.match(/<tr>/g) ?? []).length, `${idioma}: tabela`);
    assert.ok(p.includes('saibatudo@saibatudo.net') && p.includes('Francisco Aleixo'), `${idioma}: contato`);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(p) && !/\sstyle=/.test(p), `${idioma}: CSP`);
    assert.ok(p.includes('/llms/api/ask'), `${idioma}: conexão da IA`);
    if (idioma === 'zh') assert.ok(/[一-鿿]{20,}/.test(p), 'zh: texto em chinês');
  }
});
