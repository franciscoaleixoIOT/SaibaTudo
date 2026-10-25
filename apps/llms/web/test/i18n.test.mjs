// Internacionalização em seis idiomas (pt-BR referência, en, es, de, fr e zh): catálogos com as mesmas chaves, detecção e normalização do idioma
// (zh-CN/zh-Hans/zh-TW → zh), números por idioma, hreflang, manifesto por idioma e NENHUM texto fixo em português fora dos catálogos, léxicos e conteúdo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGOS, IDIOMAS, IDIOMA_PADRAO, NOMES_IDIOMAS, alternativasHreflang, aplicarIdiomaAoDocumento, arquivoPorIdioma, caminhoPrivacidade, definirIdioma, detectarIdioma, fmtNumero, idiomaAtual, lerChave, normalizarIdioma, onIdioma, t, tl } from '../src/llms/js/i18n/index.js';
import { fmt, LOCALES_NUMEROS } from '../src/llms/js/formato.js';
import { sanear } from '../src/llms/js/prefs.js';
import { iniciarIdioma, resolverRota } from '../src/llms/js/app.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(aqui, '../src/llms');

function folhas(obj, prefixo = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const c = prefixo ? `${prefixo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...folhas(v, c)); else out.push([c, v]);
  }
  return out;
}
const params = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('seis idiomas: lista, padrão pt-BR, endônimos (zh = 中文) e normalização de códigos (zh-CN, zh-Hans, zh-TW → zh; pt-PT → pt-BR; klingon → null)', () => {
  assert.deepEqual(IDIOMAS, ['pt-BR', 'en', 'es', 'de', 'fr', 'zh']);
  assert.equal(IDIOMA_PADRAO, 'pt-BR');
  assert.equal(NOMES_IDIOMAS.zh, '中文');
  assert.deepEqual(Object.keys(NOMES_IDIOMAS), IDIOMAS);
  for (const [entrada, saida] of [['zh', 'zh'], ['zh-CN', 'zh'], ['zh-Hans', 'zh'], ['zh-hans-cn', 'zh'], ['zh-TW', 'zh'], ['pt', 'pt-BR'], ['pt-PT', 'pt-BR'], ['en-US', 'en'], ['de-AT', 'de'], ['klingon', null], ['', null], [null, null]]) {
    assert.equal(normalizarIdioma(entrada), saida, String(entrada));
  }
  assert.deepEqual(LOCALES_NUMEROS, IDIOMAS);
});

test('catálogos: os seis idiomas existem, pt-BR é a referência e todos têm EXATAMENTE as mesmas chaves, tipos e parâmetros; zh tem caracteres Han', () => {
  assert.deepEqual(Object.keys(CATALOGOS).sort(), [...IDIOMAS].sort());
  const ref = new Map(folhas(CATALOGOS['pt-BR']));
  assert.ok(ref.size > 60, `o catálogo pt-BR tem ${ref.size} textos`);
  assert.equal(CATALOGOS['pt-BR'].revisao, 'humana');
  for (const idioma of IDIOMAS.filter((i) => i !== 'pt-BR')) {
    const cat = new Map(folhas(CATALOGOS[idioma]));
    assert.deepEqual([...ref.keys()].filter((k) => !cat.has(k)), [], `${idioma}: chaves que faltam`);
    assert.deepEqual([...cat.keys()].filter((k) => !ref.has(k)), [], `${idioma}: chaves a mais`);
    for (const [k, v] of ref) {
      const w = cat.get(k);
      assert.equal(typeof w, typeof v, `${idioma}: tipo de ${k}`);
      if (typeof v === 'string' && k !== 'revisao') assert.deepEqual(params(w), params(v), `${idioma}: parâmetros de ${k}`);
      if (Array.isArray(v)) assert.equal(w.length, v.length, `${idioma}: tamanho de ${k}`);
      if (typeof v === 'string' && v.trim() && k !== 'revisao' && !k.startsWith('ui.idiomas.')) assert.ok(w.trim(), `${idioma}: ${k} vazio`);
    }
    assert.equal(CATALOGOS[idioma].revisao, 'pendente', `${idioma}: revisão por falante nativo é pendência registrada`);
    assert.equal(CATALOGOS[idioma].ui.marca, 'SaibaTudo LLMs', 'a marca não se traduz');
    assert.deepEqual(Object.keys(CATALOGOS[idioma].ui.idiomas).sort(), [...IDIOMAS].sort());
    if (idioma !== 'en') {
      const pt = ref;
      for (const [k, v] of cat) if (typeof v === 'string' && !k.startsWith('ui.idiomas.') && k !== 'ui.marca' && pt.get(k) === v && /[ãõç]/.test(v)) assert.fail(`${idioma}: ${k} ficou em português: ${v}`);
    }
  }
  const zh = folhas(CATALOGOS.zh).filter(([k, v]) => typeof v === 'string' && v.length > 3 && !k.startsWith('ui.idiomas.') && k !== 'ui.marca' && k !== 'revisao' && !k.startsWith('ui.html.ogLocale'));
  const comHan = zh.filter(([, v]) => /[一-鿿]/.test(v)).length;
  assert.ok(comHan / zh.length > 0.9, `zh: ${comHan} de ${zh.length} textos com caracteres Han`);
  assert.equal(CATALOGOS.zh.ui.html.ogLocale, 'zh_CN');
  assert.equal(CATALOGOS.zh.ui.listas.e, '和');
});

test('t(): interpolação, funções, listas, reserva em pt-BR e chave ausente devolvida como está', () => {
  definirIdioma('pt-BR');
  assert.equal(t('ui.app.tituloJanela', { titulo: 'X' }), 'X — SaibaTudo LLMs');
  assert.equal(t('nao.existe'), 'nao.existe');
  assert.ok(Array.isArray(tl('ui.install.geral.passos')) && tl('ui.install.geral.passos').length > 0);
  assert.equal(lerChave({ a: { b: 1 } }, 'a.b'), 1);
  definirIdioma('zh');
  assert.equal(t('ui.app.tituloJanela', { titulo: '词' }), '词 — SaibaTudo LLMs');
  definirIdioma('pt-BR');
});

test('definirIdioma avisa os ouvintes só quando muda; desconhecido vira pt-BR', () => {
  const vistos = [];
  const cancelar = onIdioma((i) => vistos.push(i));
  try {
    assert.equal(definirIdioma('zh'), 'zh');
    assert.equal(definirIdioma('zh'), 'zh');
    assert.equal(definirIdioma('klingon'), 'pt-BR');
    assert.deepEqual(vistos, ['zh', 'pt-BR']);
    assert.equal(idiomaAtual(), 'pt-BR');
  } finally { cancelar(); definirIdioma('pt-BR'); }
});

test('números no formato do idioma: pt/es/de/fr com vírgula, en e zh com ponto', () => {
  assert.equal(fmt(1234.5, { locale: 'pt-BR' }), '1.234,5');
  assert.equal(fmt(1234.5, { locale: 'en' }), '1,234.5');
  assert.equal(fmt(1234.5, { locale: 'zh' }), '1,234.5');
  assert.equal(fmt(0.87, { locale: 'de' }), '0,87');
  definirIdioma('zh');
  assert.equal(fmtNumero(0.5), '0.5');
  definirIdioma('pt-BR');
  assert.equal(fmtNumero(0.5), '0,5');
});

test('seleção do idioma: ?lang= → preferência → navegador (zh-CN → zh) → pt-BR; iniciarIdioma grava a preferência vinda da URL', () => {
  assert.deepEqual(detectarIdioma({ url: 'https://saibatudo.net/llms/?lang=zh' }), { idioma: 'zh', origem: 'url' });
  assert.deepEqual(detectarIdioma({ url: 'https://saibatudo.net/llms/?lang=xx', prefs: { idioma: 'de' } }), { idioma: 'de', origem: 'prefs' });
  assert.deepEqual(detectarIdioma({ navegador: ['zh-CN', 'en-US'] }), { idioma: 'zh', origem: 'navegador' });
  assert.deepEqual(detectarIdioma({ navegador: ['ja', 'ko'] }), { idioma: 'pt-BR', origem: 'padrao' });
  assert.deepEqual(detectarIdioma({ navegador: ['pt-PT'] }), { idioma: 'pt-BR', origem: 'navegador' });
  const salvos = [];
  const idioma = iniciarIdioma({ url: new URL('https://saibatudo.net/llms/?lang=fr'), prefs: { idioma: null }, navegador: [], salvar: (i) => salvos.push(i) });
  assert.equal(idioma, 'fr');
  assert.deepEqual(salvos, ['fr']);
  definirIdioma('pt-BR');
  assert.equal(sanear({ idioma: 'zh-Hans' }).idioma, 'zh');
});

test('hreflang dos seis idiomas + x-default no index.html e em alternativasHreflang; manifesto e política por idioma', () => {
  const html = readFileSync(join(SRC, 'index.html'), 'utf8');
  for (const i of IDIOMAS) assert.match(html, new RegExp(`<link rel="alternate" hreflang="${i}" href="https://saibatudo\\.net/llms/${i === 'pt-BR' ? '' : `\\?lang=${i}`}">`), i);
  assert.match(html, /hreflang="x-default" href="https:\/\/saibatudo\.net\/llms\/"/);
  assert.match(html, /<html lang="pt-BR">/);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(html) && !/\sstyle=/.test(html), 'CSP: sem script nem estilo inline');
  const alt = alternativasHreflang();
  assert.deepEqual(alt.map((a) => a.hreflang), [...IDIOMAS, 'x-default']);
  assert.equal(alt.find((a) => a.hreflang === 'zh').href, 'https://saibatudo.net/llms/?lang=zh');
  const pt = JSON.parse(readFileSync(join(SRC, 'manifest.webmanifest'), 'utf8'));
  assert.equal(pt.scope, '/llms/');
  assert.equal(pt.name, 'SaibaTudo LLMs');
  for (const idioma of IDIOMAS.filter((i) => i !== 'pt-BR')) {
    const m = JSON.parse(readFileSync(join(SRC, arquivoPorIdioma('manifest', 'webmanifest', idioma)), 'utf8'));
    assert.equal(m.lang, idioma);
    assert.equal(m.id, pt.id);
    assert.equal(m.scope, pt.scope);
    assert.equal(m.name, pt.name);
    assert.deepEqual(m.icons, pt.icons);
    assert.ok(m.start_url.includes(`lang=${idioma}`), `${idioma}: start_url`);
    assert.notEqual(m.description, pt.description, `${idioma}: descrição traduzida`);
    assert.equal(caminhoPrivacidade(idioma), `/llms/privacidade/${idioma}`);
  }
  assert.equal(caminhoPrivacidade('pt-BR'), '/llms/privacidade');
  assert.equal(resolverRota('/llms/zh/aprenda'), null, 'não há rota traduzida: o idioma vai em ?lang=');
});

test('aplicarIdiomaAoDocumento troca <html lang>, descrição, og:locale, manifesto e hreflang', () => {
  const criar = () => {
    const attrs = new Map();
    const links = [];
    const el = (tag) => ({ tag, attrs: new Map(), setAttribute(k, v) { this.attrs.set(k, v); }, remove() { links.splice(links.indexOf(this), 1); } });
    const nos = { 'meta[name="description"]': el('meta'), 'meta[property="og:locale"]': el('meta'), 'link[rel="manifest"]': el('link') };
    return {
      documentElement: { setAttribute: (k, v) => attrs.set(k, v) }, head: { append: (l) => links.push(l) }, attrs, links, nos,
      querySelector: (sel) => nos[sel] ?? null, querySelectorAll: () => [...links], createElement: (tag) => el(tag)
    };
  };
  const doc = criar();
  definirIdioma('zh');
  try {
    aplicarIdiomaAoDocumento(doc);
    assert.equal(doc.attrs.get('lang'), 'zh');
    assert.equal(doc.nos['meta[property="og:locale"]'].attrs.get('content'), 'zh_CN');
    assert.equal(doc.nos['link[rel="manifest"]'].attrs.get('href'), '/llms/manifest.zh.webmanifest');
    assert.equal(doc.nos['meta[name="description"]'].attrs.get('content'), t('ui.html.descricao', undefined, 'zh'));
    assert.deepEqual(doc.links.map((l) => l.attrs.get('hreflang')), [...IDIOMAS, 'x-default']);
  } finally { definirIdioma('pt-BR'); }
});

test('nenhum texto fixo em português fora dos catálogos, léxicos e conteúdo (app, main, install, prefs, data, projecao, cena3d, explorador, nlu, answers, nuvem, ui/*)', () => {
  const candidatos = ['js/app.js', 'js/main.js', 'js/install.js', 'js/prefs.js', 'js/data.js', 'js/projecao.js', 'js/cena3d.js', 'js/explorador.js', 'js/nlu.js', 'js/answers.js', 'js/nuvem.js', 'js/verify.js'];
  const ui = existsSync(join(SRC, 'js/ui')) ? readdirSync(join(SRC, 'js/ui')).map((f) => `js/ui/${f}`) : [];
  const rx = /ção|ções|ões|não |\bé\b|\bsão\b|ência|ância|você/;
  const problemas = [];
  for (const a of [...candidatos, ...ui].filter((a) => existsSync(join(SRC, a)))) {
    const s = readFileSync(join(SRC, a), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, ''));
    s.forEach((l, i) => { if (rx.test(l) && !/^\s*\*|rotulo: '|rotuloPt|ROTULO_/.test(l)) problemas.push(`${a}:${i + 1}: ${l.trim().slice(0, 100)}`); });
  }
  assert.deepEqual(problemas, []);
});
