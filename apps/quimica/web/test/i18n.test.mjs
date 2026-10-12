// Internacionalização (docs/I18N.md): catálogos com as mesmas chaves do pt-BR, números e datas por idioma, seleção do idioma (?lang=, preferência,
// navegador), nomes por idioma do pacote (reserva sempre rotulada), textos em lotes por idioma e NENHUM texto fixo em português fora dos catálogos e léxicos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DADOS, lojaNova } from './support.mjs';
import { CATALOGOS, IDIOMAS, alternativasHreflang, aplicarIdiomaAoDocumento, arquivoPorIdioma, caminhoPrivacidade, definirIdioma, detectarIdioma, fmtData, fmtNumero, idiomaAtual, lerChave, nomeDoIdioma, normalizarIdioma, onIdioma, t, tl } from '../src/quimica/js/i18n/index.js';
import { fmt, fmtTex, lerNumero, separadores } from '../src/quimica/js/formato.js';
import { listar } from '../src/quimica/js/texto.js';
import { exibirNome, minusNoMeio, nomeComposto, nomeElemento, todosOsNomes } from '../src/quimica/js/nomes.js';
import { fraseH, fraseHInfo, palavraSinal, sinalChave } from '../src/quimica/js/perigos.js';
import { categoriaRotulo, estadoRotulo, rotuloPropriedade, tabelaDePropriedades } from '../src/quimica/js/propriedades.js';
import { sanear } from '../src/quimica/js/prefs.js';
import { iniciarIdioma, resolverRota } from '../src/quimica/js/app.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(aqui, '../src/quimica');

/** Caminhos "a.b.c" de todas as folhas (strings, funções e arrays) de um catálogo. */
function folhas(obj, prefixo = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const c = prefixo ? `${prefixo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...folhas(v, c)); else out.push([c, v]);
  }
  return out;
}
const params = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('catálogos: os cinco idiomas existem, pt-BR é a referência e todos têm EXATAMENTE as mesmas chaves, com os mesmos tipos e parâmetros', () => {
  assert.deepEqual(Object.keys(CATALOGOS).sort(), [...IDIOMAS].sort());
  const ref = new Map(folhas(CATALOGOS['pt-BR']));
  assert.ok(ref.size > 500, `o catálogo pt-BR tem ${ref.size} textos`);
  assert.equal(CATALOGOS['pt-BR'].revisao, 'humana');
  for (const idioma of IDIOMAS.filter((i) => i !== 'pt-BR')) {
    const cat = new Map(folhas(CATALOGOS[idioma]).filter(([k]) => k !== 'copiaDe'));
    const faltam = [...ref.keys()].filter((k) => !cat.has(k));
    const sobram = [...cat.keys()].filter((k) => !ref.has(k));
    assert.deepEqual(faltam, [], `${idioma}: chaves que faltam`);
    assert.deepEqual(sobram, [], `${idioma}: chaves a mais`);
    for (const [k, v] of ref) {
      const w = cat.get(k);
      assert.equal(typeof w, typeof v, `${idioma}: tipo de ${k}`);
      if (typeof v === 'string' && k !== 'revisao') assert.deepEqual(params(w), params(v), `${idioma}: parâmetros de ${k}`);
      if (Array.isArray(v)) assert.equal(w.length, v.length, `${idioma}: tamanho de ${k}`);
      if (typeof v === 'string' && v.trim() && k !== 'revisao' && !k.startsWith('ui.idiomas.')) assert.ok(w.trim(), `${idioma}: ${k} vazio`);
    }
    assert.ok(['pendente', 'humana'].includes(CATALOGOS[idioma].revisao), `${idioma}: revisao`);
  }
  // os endônimos e as listas são iguais em todo idioma (regra da interface)
  assert.deepEqual(tl('respostas.sugestoes.padrao', 'en').length, tl('respostas.sugestoes.padrao', 'pt-BR').length);
});

test('catálogos es/de/fr: traduzidos de verdade (sem andaime), funções de plural/concordância devolvem texto bem formado e nada fica em inglês ou português por engano', () => {
  const en = new Map(folhas(CATALOGOS.en));
  const pt = new Map(folhas(CATALOGOS['pt-BR']));
  // chaves cujo valor pode (e costuma) coincidir com o inglês: marca, siglas, termos técnicos iguais, endereços e exemplos de fórmula
  const igualPermitido = (k, v) => typeof v !== 'string' || k === 'revisao' || /^(ui\.idiomas\.|ui\.marca$)/.test(k) || !/[A-Za-zÀ-ÿ]{4,}/.test(v.replace(/https?:[^\s]+/g, '').replace(/SaibaTudo Química|PubChem|Wikidata|SMILES|InChIKey|CAS|CID|ChEBI|XLogP|TPSA|GHS|UNECE|ECHA|CLP|ICSC|ILO|CODATA|NIST|NCBI|NLM/g, ''));
  const bags = [];
  for (const n of [1, 3]) for (const alvo of ['composto', 'elemento']) for (const flag of [true, false]) {
    const base = { n, alvo, outros: 'densidad', prop: 'propiedad', nome: 'agua', formula: 'H2O', acido: flag, carga: flag, mmc: flag, hidrato: flag, den: 2, el: 'O', lado: flag ? 'r' : 'p', rotulo: 'agua', M: '18,015', rend: flag ? 90 : null, ph: '2,00', conc: '0,1', dir: flag ? 'max' : 'min', simbolo: 'O', grandeza: flag ? 'P' : 'V', cond: flag };
    bags.push(base, { ...base, n: String(n), nome: 'presión' });
  }
  for (const idioma of ['es', 'de', 'fr']) {
    const cat = CATALOGOS[idioma];
    assert.equal(cat.copiaDe, undefined, `${idioma}: ainda é andaime (copiaDe)`);
    assert.equal(cat.revisao, 'pendente', `${idioma}: revisão humana é pendência registrada`);
    assert.deepEqual(cat.regras, { minusculaNoMeio: idioma !== 'de' }, `${idioma}: regra de caixa (substantivos alemães ficam maiúsculos)`);
    let iguais = 0;
    for (const [k, v] of folhas(cat)) {
      if (k === 'copiaDe') continue;
      if (typeof v === 'function') {
        for (const b of bags) {
          const s = v(b);
          assert.ok(typeof s === 'string' && s.trim() && !/undefined|NaN|\[object|\{\w+\}/.test(s), `${idioma}: ${k}(${JSON.stringify(b)}) = ${s}`);
        }
        continue;
      }
      if (typeof v !== 'string') continue;
      assert.ok(!/[ \t]{2,}|^\s|\s$/.test(v.replace(/^ +| +$/g, '')), `${idioma}: espaços estranhos em ${k}`);
      if (en.get(k) === v && !igualPermitido(k, v)) { iguais++; }
      if (!k.startsWith('respostas.sugestoes.') && pt.get(k) === v && /[ãõç]/.test(v)) assert.fail(`${idioma}: ${k} ficou em português: ${v}`);
    }
    assert.ok(iguais <= 80, `${idioma}: ${iguais} textos idênticos ao inglês (esperado: só cognatos como "Volume", "Danger", "Name", "Symbol", "base", "ester")`);
    for (const k of ['ui.app.abas.inicio', 'ui.app.abas.tabela', 'ui.inicio.cabecalho', 'ui.tabela.titulo', 'ui.seguranca.titulo', 'respostas.recusa.padrao', 'respostas.ajuda.titulo', 'ui.sobre.titulo', 'ui.config.titulo', 'propriedades.rotulos.massaMolar']) {
      assert.notEqual(lerChave(cat, k), lerChave(CATALOGOS.en, k), `${idioma}: ${k} igual ao inglês`);
      assert.notEqual(lerChave(cat, k), lerChave(CATALOGOS['pt-BR'], k), `${idioma}: ${k} igual ao português`);
    }
    // a marca e os termos técnicos que não se traduzem aparecem como no original
    assert.equal(cat.ui.marca, 'SaibaTudo Química');
    assert.ok(cat.ui.html.titulo.startsWith('SaibaTudo Química'));
    assert.equal(cat.ui.html.ogLocale, { es: 'es_ES', de: 'de_DE', fr: 'fr_FR' }[idioma]);
    assert.equal(cat.ui.listas.e, { es: ' y ', de: ' und ', fr: ' et ' }[idioma]);
    // o catálogo nomeia os cinco idiomas no próprio idioma da interface
    assert.deepEqual(Object.keys(cat.ui.idiomas).sort(), [...IDIOMAS].sort());
    // glossário (docs/I18N.md §8): termos fixos por idioma
    const termos = { es: ['masa molar', 'punto de fusión', 'punto de ebullición', 'electronegatividad', 'densidad'], de: ['molare Masse', 'Schmelzpunkt', 'Siedepunkt', 'Elektronegativität', 'Dichte'], fr: ['masse molaire', 'point de fusion', 'point d’ébullition', 'électronégativité', 'densité'] }[idioma];
    const rotulos = cat.propriedades.rotulos;
    for (const [campo, termo] of [['massaMolar', termos[0]], ['pontoFusaoK', termos[1]], ['pontoEbulicaoK', termos[2]], ['eletronegatividade', termos[3]], ['densidadeKgm3', termos[4]]]) {
      assert.ok(rotulos[campo].toLowerCase().includes(termo.toLowerCase()), `${idioma}: rótulo de ${campo} ("${rotulos[campo]}") deveria usar o termo do glossário "${termo}"`);
    }
  }
  // tipografia francesa (espaço normal antes de : ; ? !) e alemã (substantivos com maiúscula no meio da frase)
  const fr = folhas(CATALOGOS.fr).filter(([k, v]) => typeof v === 'string' && !k.startsWith('ui.idiomas'));
  for (const [k, v] of fr) {
    assert.ok(!/[\u00A0\u202F\u2009]/.test(v), `fr: espaço especial em ${k}`);
    assert.ok(!/\S[?!;]/.test(v.replace(/https?:[^\s]+/g, '').replace(/\?[a-z]+=/g, '')), `fr: falta espaço antes de ? ! ; em ${k}: ${v}`);
  }
});

test('t(): interpolação, funções (plural), listas, reserva em pt-BR e chave ausente devolvida como está', () => {
  definirIdioma('pt-BR');
  assert.equal(t('ui.app.tituloJanela', { titulo: 'X' }), 'X — SaibaTudo Química');
  assert.equal(t('ui.elemento.mostrando', { n: 1 }), 'Mostrando um composto do índice; use a busca de compostos para ver mais.');
  assert.equal(t('ui.elemento.mostrando', { n: 3 }), 'Mostrando 3 compostos do índice; use a busca de compostos para ver mais.');
  assert.ok(Array.isArray(t('respostas.sugestoes.padrao')) && tl('respostas.sugestoes.padrao').length === 11);
  assert.equal(t('nao.existe.mesmo'), 'nao.existe.mesmo');
  definirIdioma('en');
  assert.equal(t('ui.app.abas.inicio'), 'Home');
  assert.equal(t('ui.elemento.mostrando', { n: 3 }), 'Showing 3 compounds from the index; use the compound search to see more.');
  assert.equal(lerChave(CATALOGOS.en, 'ui.app.abas.inicio'), 'Home');
  assert.equal(t('ui.app.abas.inicio', undefined, 'pt-BR'), 'Início', 'idioma explícito');
  definirIdioma('pt-BR');
});

test('números: pt-BR (vírgula) é o padrão e continua byte a byte; en usa ponto; es/de/fr seguem o Intl; fmtTex troca o decimal certo', () => {
  definirIdioma('pt-BR');
  assert.equal(fmt(1811), '1.811');
  assert.equal(fmt(1537.85, { sig: 7 }), '1.537,85');
  assert.equal(fmt(18.015), '18,015');
  assert.equal(fmt(1.8e-5), '1,8 × 10⁻⁵');
  assert.equal(fmtTex(1537.85, { sig: 7 }), '1\\,537{,}85');
  assert.equal(fmtTex(1.8e-5), '1{,}8 \\times 10^{-5}');
  assert.deepEqual(separadores('pt-BR'), { decimal: ',', grupo: '.' });
  definirIdioma('en');
  assert.equal(fmt(1811), '1,811');
  assert.equal(fmt(1537.85, { sig: 7 }), '1,537.85');
  assert.equal(fmt(18.015), '18.015');
  assert.equal(fmt(1.8e-5), '1.8 × 10⁻⁵');
  assert.equal(fmtTex(1537.85, { sig: 7 }), '1\\,537.85');
  assert.equal(fmtTex(1.8e-5), '1.8 \\times 10^{-5}');
  assert.equal(fmtNumero(0.5), '0.5');
  assert.deepEqual(separadores('en'), { decimal: '.', grupo: ',' });
  definirIdioma('de');
  assert.equal(fmt(18.015), '18,015');
  assert.equal(separadores('de').decimal, ',');
  definirIdioma('fr');
  assert.equal(separadores('fr').decimal, ',');
  assert.ok(/^1.537,85$/.test(fmt(1537.85, { sig: 7 })), fmt(1537.85, { sig: 7 }));
  definirIdioma('es');
  assert.equal(separadores('es').decimal, ',');
  definirIdioma('pt-BR');
  // o número formatado por fmt é sempre lido de volta por lerNumero no mesmo idioma (fidelidade)
  for (const idioma of IDIOMAS) for (const n of [0.01, 1.5, 18.015, 1537.85, 1811, 101325, 6.02214076e23, 1.8e-5]) {
    assert.ok(Math.abs(lerNumero(fmt(n, { sig: 9, locale: idioma }).replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '0123456789-'['⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)]), idioma) - n) <= Math.abs(n) * 1e-8, `${idioma}: ${n}`);
  }
});

test('lerNumero aceita vírgula e ponto em qualquer idioma (heurística do I18N.md §1.3)', () => {
  // ambos: o último separador é o decimal
  for (const idioma of IDIOMAS) {
    assert.equal(lerNumero('1.234,56', idioma), 1234.56, idioma);
    assert.equal(lerNumero('1,234.56', idioma), 1234.56, idioma);
    assert.equal(lerNumero('1,5', idioma), 1.5, idioma);
    assert.equal(lerNumero('1.5', idioma), 1.5, idioma);
    assert.equal(lerNumero('2,5 x 10^-3', idioma), 0.0025, idioma);
    assert.equal(lerNumero('1.8e-5', idioma), 1.8e-5, idioma);
    assert.equal(lerNumero('1,8e-5', idioma), 1.8e-5, idioma);
    assert.equal(lerNumero('10^-3', idioma), 0.001, idioma);
    assert.ok(Number.isNaN(lerNumero('abc', idioma)));
    assert.ok(Number.isNaN(lerNumero('1,2,3,4', idioma)));
  }
  // um só separador com grupos de três dígitos: convenção do idioma
  assert.equal(lerNumero('1.000', 'pt-BR'), 1000);
  assert.equal(lerNumero('1,000', 'pt-BR'), 1);
  assert.equal(lerNumero('1.000', 'en'), 1);
  assert.equal(lerNumero('1,000', 'en'), 1000);
  assert.equal(lerNumero('1.000', 'de'), 1000);
  assert.equal(lerNumero('1.000', 'fr'), 1000);
  assert.equal(lerNumero('1.000.000', 'pt-BR'), 1000000);
  assert.equal(lerNumero('1,000,000', 'en'), 1000000);
  assert.equal(lerNumero('1 000', 'fr'), 1000);
});

test('datas e listas no idioma', () => {
  definirIdioma('pt-BR');
  assert.equal(fmtData('2026-01-01T00:00:00Z'), '31/12/2025'); // fuso de São Paulo
  assert.equal(listar(['a', 'b', 'c']), 'a, b e c');
  definirIdioma('en');
  assert.equal(fmtData('2026-01-01T12:00:00Z'), '01/01/2026');
  assert.equal(listar(['a', 'b', 'c']), 'a, b and c');
  definirIdioma('de');
  assert.equal(listar(['a', 'b']), 'a und b');
  definirIdioma('fr');
  assert.equal(listar(['a', 'b']), 'a et b');
  definirIdioma('es');
  assert.equal(listar(['a', 'b']), 'a y b');
  definirIdioma('pt-BR');
  assert.equal(fmtData('inválida'), null);
});

test('seleção do idioma: ?lang= → preferência → navegador → pt-BR; normalização de códigos; ?lang= grava a preferência', () => {
  assert.equal(normalizarIdioma('pt'), 'pt-BR');
  assert.equal(normalizarIdioma('PT-pt'), 'pt-BR');
  assert.equal(normalizarIdioma('en-US'), 'en');
  assert.equal(normalizarIdioma('de-CH'), 'de');
  assert.equal(normalizarIdioma('zh'), null);
  assert.equal(normalizarIdioma(''), null);
  assert.deepEqual(detectarIdioma({ url: 'https://saibatudo.net/quimica/?lang=en', prefs: { idioma: 'de' }, navegador: ['fr'] }), { idioma: 'en', origem: 'url' });
  assert.deepEqual(detectarIdioma({ url: 'https://saibatudo.net/quimica/?lang=xx', prefs: { idioma: 'de' }, navegador: ['fr'] }), { idioma: 'de', origem: 'prefs' });
  assert.deepEqual(detectarIdioma({ url: 'https://saibatudo.net/quimica/', prefs: { idioma: null }, navegador: ['zh-CN', 'fr-FR', 'en'] }), { idioma: 'fr', origem: 'navegador' });
  assert.deepEqual(detectarIdioma({ url: null, prefs: null, navegador: ['zh'] }), { idioma: 'pt-BR', origem: 'padrao' });
  assert.deepEqual(detectarIdioma(), { idioma: 'pt-BR', origem: 'padrao' });
  // preferências: idioma saneado
  assert.equal(sanear({ idioma: 'en-GB' }).idioma, 'en');
  assert.equal(sanear({ idioma: 'klingon' }).idioma, null);
  assert.equal(sanear({}).idioma, null);
  // iniciarIdioma (app.js) com dependências injetadas, sem DOM: ?lang= vence e vira preferência
  const memoria = new Map();
  globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k) };
  try {
    assert.equal(iniciarIdioma({ url: new URL('https://saibatudo.net/quimica/?lang=es'), prefs: sanear({}), navegador: ['en'] }), 'es');
    assert.equal(JSON.parse(memoria.get('stq:prefs')).idioma, 'es', '?lang= gravou a preferência');
    assert.equal(iniciarIdioma({ url: new URL('https://saibatudo.net/quimica/tabela'), prefs: sanear(JSON.parse(memoria.get('stq:prefs'))), navegador: ['en'] }), 'es', 'a preferência vale sem ?lang=');
  } finally { delete globalThis.localStorage; definirIdioma('pt-BR'); }
  // as rotas não mudam com o idioma
  for (const r of ['/quimica/tabela', '/quimica/compostos', '/quimica/calculadoras/ph', '/quimica/seguranca', '/quimica/sobre-os-dados', '/quimica/configuracoes']) assert.ok(resolverRota(r), r);
  assert.equal(resolverRota('/quimica/en/tabela'), null, 'não há rota traduzida');
  const alt = alternativasHreflang();
  assert.deepEqual(alt.map((a) => a.hreflang), ['pt-BR', 'en', 'es', 'de', 'fr', 'x-default']);
  assert.equal(alt.find((a) => a.hreflang === 'x-default').href, 'https://saibatudo.net/quimica/');
  assert.equal(alt.find((a) => a.hreflang === 'en').href, 'https://saibatudo.net/quimica/?lang=en');
});

test('definirIdioma avisa os ouvintes só quando muda e devolve o idioma efetivo', () => {
  const vistos = [];
  const cancelar = onIdioma((i) => vistos.push(i));
  try {
    assert.equal(definirIdioma('en'), 'en');
    assert.equal(definirIdioma('en'), 'en');
    assert.equal(definirIdioma('klingon'), 'pt-BR');
    assert.deepEqual(vistos, ['en', 'pt-BR']);
    assert.equal(idiomaAtual(), 'pt-BR');
  } finally { cancelar(); definirIdioma('pt-BR'); }
});

test('nomes por idioma (nomes.js): nomes[idioma] → inglês rotulado → português rotulado; nunca uma reserva sem rótulo', () => {
  const el = { simbolo: 'O', nome: 'Oxigênio', nomeEn: 'Oxygen', nomes: { 'pt-BR': 'Oxigênio', en: 'oxygen', es: 'oxígeno' } };
  assert.deepEqual(nomeElemento(el, 'pt-BR'), { nome: 'Oxigênio', idioma: 'pt-BR', rotulado: false });
  assert.deepEqual(nomeElemento(el, 'es'), { nome: 'oxígeno', idioma: 'es', rotulado: false });
  assert.deepEqual(nomeElemento(el, 'en'), { nome: 'oxygen', idioma: 'en', rotulado: false });
  assert.deepEqual(nomeElemento(el, 'fr'), { nome: 'oxygen', idioma: 'en', rotulado: true }, 'sem nome em francês: inglês, rotulado');
  const soPt = { simbolo: 'Fe', nome: 'Ferro' };
  assert.deepEqual(nomeElemento(soPt, 'en'), { nome: 'Ferro', idioma: 'pt-BR', rotulado: true });
  const antigo = { simbolo: 'Fe', nome: 'Ferro', nomeEn: 'Iron' };
  assert.deepEqual(nomeElemento(antigo, 'en'), { nome: 'Iron', idioma: 'en', rotulado: false }, 'nomeEn vale hoje, antes do pacote novo');
  const co = { cid: 962, nome: 'Água', nomeIupac: 'oxidane', nomes: { 'pt-BR': 'Água', en: 'water' }, sinonimosPorIdioma: { en: ['dihydrogen monoxide'] }, sinonimos: ['água destilada'] };
  assert.deepEqual(nomeComposto(co, 'pt-BR'), { nome: 'Água', idioma: 'pt-BR', rotulado: false });
  assert.deepEqual(nomeComposto(co, 'en'), { nome: 'water', idioma: 'en', rotulado: false });
  assert.deepEqual(nomeComposto(co, 'de'), { nome: 'water', idioma: 'en', rotulado: true });
  const pendente = { cid: 1, nome: '2-acetyloxybenzoic acid', nomeIupac: '2-acetyloxybenzoic acid', nomePtPendente: true };
  assert.deepEqual(nomeComposto(pendente, 'en'), { nome: '2-acetyloxybenzoic acid', idioma: 'en', rotulado: false }, 'nomes.en nunca é o IUPAC: cai para nomeIupac sem rótulo em inglês');
  assert.deepEqual(nomeComposto(pendente, 'es'), { nome: '2-acetyloxybenzoic acid', idioma: 'en', rotulado: true });
  assert.deepEqual(nomeComposto({ cid: 5 }, 'en'), { nome: 'CID 5', idioma: 'en', rotulado: false });
  definirIdioma('es');
  assert.equal(exibirNome(nomeComposto(co, 'es')), t('ui.nomes.emIdioma', { nome: 'water', idioma: nomeDoIdioma('en') }), 'rótulo da reserva no idioma ativo (catálogo es)');
  assert.notEqual(exibirNome(nomeComposto(co, 'es')), 'water (name in English)', 'o catálogo es não herda mais o rótulo em inglês');
  assert.match(exibirNome(nomeComposto(co, 'es')), /^water \(.*inglés.*\)$/);
  definirIdioma('pt-BR');
  assert.equal(exibirNome(nomeComposto(co, 'fr')), 'water (nome em inglês)');
  assert.equal(exibirNome(nomeComposto(co, 'pt-BR')), 'Água');
  assert.deepEqual(todosOsNomes(co, 'en').slice(0, 3), ['water', 'dihydrogen monoxide', 'oxidane']);
  assert.ok(todosOsNomes(co, 'en').includes('Água') && todosOsNomes(co, 'en').includes('água destilada'), 'português é a última reserva de busca');
  // minúscula no meio da frase, exceto em alemão (substantivos) e para siglas/fórmulas
  assert.equal(minusNoMeio('Ferro', 'pt-BR'), 'ferro');
  assert.equal(minusNoMeio('Sauerstoff', 'de'), 'Sauerstoff');
  assert.equal(minusNoMeio('CID 962', 'en'), 'CID 962');
  assert.equal(minusNoMeio('DDT', 'en'), 'DDT');
});

test('rótulos de propriedades, categorias, estados, pictogramas e frases H no idioma; frases H do pacote por idioma com reserva rotulada', async () => {
  const store = await lojaNova();
  definirIdioma('en');
  try {
    const props = tabelaDePropriedades(store.regras, 'en');
    const fusao = props.find((p) => p.id === 'pontoFusaoK');
    assert.equal(fusao.rotulo, 'Melting point', 'rótulo do pacote (regras.propriedades[id].rotulos.en)');
    assert.ok(fusao.sinonimos.includes('melting point') && fusao.sinonimos.includes('melting temperature'), 'sinônimos do léxico + do pacote');
    assert.ok(!fusao.sinonimos.includes('ponto de fusao'), 'sinônimos pt-BR não entram no dicionário en');
    assert.equal(rotuloPropriedade({ id: 'densidadeKgm3', rotulo: 'densidade' }, 'en'), 'density', 'sem pacote: catálogo');
    assert.equal(rotuloPropriedade({ id: 'xpto', rotulo: 'xpto pt' }, 'en'), 'xpto pt', 'sem catálogo: referência');
    assert.equal(categoriaRotulo('halogenio'), 'halogen');
    assert.equal(estadoRotulo('liquido'), 'liquid');
    assert.equal(estadoRotulo('gas'), 'gas');
    assert.equal(palavraSinal('Perigo'), 'Danger');
    assert.equal(palavraSinal('Danger'), 'Danger');
    assert.equal(sinalChave('Atenção'), 'atencao');
    assert.deepEqual(fraseHInfo('H314', store.regras, 'en'), { texto: 'Causes severe skin burns and eye damage.', idioma: 'en' }, 'frase do pacote em inglês (textoPorIdioma)');
    assert.equal(fraseHInfo('H200', store.regras, 'en').idioma, 'pt-BR', 'sem texto em inglês: reserva em português, rotulada pela interface');
    assert.equal(fraseH('H314', store.regras, 'es'), 'Provoca quemaduras graves en la piel y lesiones oculares graves.');
    assert.equal(fraseHInfo('H314', store.regras, 'fr').idioma, 'en', 'sem francês: inglês antes do português');
  } finally { definirIdioma('pt-BR'); }
  assert.equal(fraseH('H314', store.regras), 'Provoca queimaduras graves na pele e lesões oculares graves.');
  assert.equal(tabelaDePropriedades(store.regras).find((p) => p.id === 'pontoFusaoK').rotulo, 'Ponto de fusão', 'pt-BR: rótulo do pacote');
});

test('textos em lotes (I18N.md §4): índice + lote em inglês, arquivos avulsos em português, seleção por idioma e reserva rotulada', async () => {
  const store = await lojaNova();
  const pt = await store.textos();
  assert.ok(pt.length >= 3 && pt.every((x) => x._idioma === 'pt-BR' && x.textoPt), 'padrão: só português (textoPt presente)');
  const en = await store.textos(null, { idioma: 'en' });
  assert.deepEqual(en.map((x) => x.id).sort(), ['wikipedia-en-mole-unit-001', 'wikipedia-en-oxygen-001']);
  assert.ok(en.every((x) => x._idioma === 'en' && x.textoPt === null && x.textoOriginal && x._path === 'textos/wikipedia-en/lote-001.json'));
  const so = await store.textos(['mole'], { idioma: 'en' });
  assert.deepEqual(so.map((x) => x.id), ['wikipedia-en-mole-unit-001', 'wikipedia-en-oxygen-001'], 'o lote inteiro é a unidade de carga; a chave do índice seleciona o lote');
  const fr = await store.textos(['mol'], { idioma: 'fr', reserva: true });
  assert.deepEqual([...new Set(fr.map((x) => x._idioma))], ['en', 'pt-BR'], 'reserva: inglês antes do português');
  assert.equal((await store.textos(['mol'], { idioma: 'fr' })).length, 0, 'sem reserva, nada em francês');
  assert.ok((await store.indiceDeTextos()).lotes.length >= 1);
  // conceito em inglês com texto em inglês; em francês cai para o inglês, rotulado
  const { Engine } = await import('../src/quimica/js/engine.js');
  definirIdioma('en');
  try {
    const r = await new Engine({ store }).responder('what is a mole?');
    assert.equal(r.intent, 'CONCEITO');
    const c = r.blocos.find((b) => b.tipo === 'citacao');
    assert.match(c.texto, /Avogadro number/);
    assert.equal(c.aviso, null, 'texto no idioma ativo: sem aviso');
    assert.equal(c.fonte.nome, 'Wikipedia (en): Mole (unit)');
    definirIdioma('fr');
    const rf = await new Engine({ store }).responder('qu est ce qu une mole ?');
    const cf = rf.blocos.find((b) => b.tipo === 'citacao');
    assert.ok(cf, rf.directAnswer);
    assert.equal(cf.idiomaTexto, 'en');
    assert.match(cf.aviso, /English|anglais/);
  } finally { definirIdioma('pt-BR'); }
  const rp = await new Engine({ store }).responder('o que é um mol?');
  assert.match(rp.blocos.find((b) => b.tipo === 'citacao').texto, /número de Avogadro/);
});

test('nenhum texto fixo em português fora dos catálogos e léxicos (answers, nlu, ui, app, calc, dicionário, segurança, propriedades, perigos)', () => {
  const arquivos = ['js/answers.js', 'js/nlu.js', 'js/app.js', 'js/main.js', 'js/dicionario.js', 'js/seguranca.js', 'js/propriedades.js', 'js/perigos.js', 'js/busca.js', 'js/nomes.js', 'js/install.js', 'js/molecula.js',
    ...readdirSync(join(SRC, 'js/ui')).map((f) => `js/ui/${f}`), ...readdirSync(join(SRC, 'js/calc')).map((f) => `js/calc/${f}`)];
  // referências pt-BR que ficam de propósito, para compatibilidade/testes (constantes exportadas documentadas como tal)
  const permitidos = new Set(['js/propriedades.js', 'js/perigos.js', 'js/seguranca.js', 'js/answers.js', 'js/calc/ph.js', 'js/calc/concentracao.js', 'js/calc/unidades.js', 'js/calc/contexto.js', 'js/ui/sobre.js']);
  const rx = /ção|ções|ões|não|\bé\b|\bsão\b|ência|ância/;
  const problemas = [];
  for (const a of arquivos) {
    let s = readFileSync(join(SRC, a), 'utf8');
    s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
    const linhas = s.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => rx.test(l));
    if (!linhas.length) continue;
    if (permitidos.has(a)) {
      // nesses arquivos só constantes de compatibilidade (ROTULO_*, NOMES_PICTOGRAMA, GRUPOS_FRASES_H, SUGESTOES_*, FONTE_APP, TIPOS_PH, MODOS_CONCENTRACAO, UNIDADES_PADRAO, REFERENCIAS_EXTERNAS, BIBLIOTECAS, origem/motivo técnicos) podem ter português
      for (const [n, l] of linhas) if (!/rotulo: '|rotuloPt|ROTULO_|NOMES_PICTOGRAMA|GRUPOS_FRASES_H|SUGESTOES_|FONTE_APP|TIPOS_PH|MODOS_CONCENTRACAO|UNIDADES_PADRAO|PREFIXOS_PADRAO|REFERENCIAS_EXTERNAS|BIBLIOTECAS|titulo: 'Perigos|descricao: '|uso: '|nome: '|nota: 'forte|origem: '|^\s*\{ id: '|^\s*\[|^\s*(?:metal_|semimetal|gas_nobre|halogenio|lantanideo|actinideo|desconhecida|nao_metal)\w*:|^\s*\w+: T\('/.test(l)) problemas.push(`${a}:${n}: ${l.trim().slice(0, 100)}`);
      continue;
    }
    for (const [n, l] of linhas) problemas.push(`${a}:${n}: ${l.trim().slice(0, 100)}`);
  }
  assert.deepEqual(problemas, []);
});

test('index.html: hreflang dos cinco idiomas + x-default; cada idioma tem manifesto e política de privacidade próprios, e o app troca para eles', () => {
  const html = readFileSync(join(SRC, 'index.html'), 'utf8');
  for (const i of IDIOMAS) assert.match(html, new RegExp(`<link rel="alternate" hreflang="${i}" href="https://saibatudo\\.net/quimica/${i === 'pt-BR' ? '' : `\\?lang=${i}`}">`), i);
  assert.match(html, /hreflang="x-default" href="https:\/\/saibatudo\.net\/quimica\/"/);
  const pt = JSON.parse(readFileSync(join(SRC, 'manifest.webmanifest'), 'utf8'));
  const ptPriv = readFileSync(join(SRC, 'privacidade/index.html'), 'utf8');
  const alternativas = (pagina) => [...pagina.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => `${m[1]} ${m[2]}`);
  const esperadas = [...IDIOMAS.map((i) => `${i} https://saibatudo.net/quimica/privacidade${i === 'pt-BR' ? '' : `/${i}`}`), 'x-default https://saibatudo.net/quimica/privacidade'];
  assert.deepEqual(alternativas(ptPriv), esperadas, 'a política em português lista as cinco versões');
  const descricoes = new Set([pt.description]);
  for (const idioma of IDIOMAS.filter((i) => i !== 'pt-BR')) {
    const m = JSON.parse(readFileSync(join(SRC, arquivoPorIdioma('manifest', 'webmanifest', idioma)), 'utf8'));
    assert.equal(m.lang, idioma);
    assert.equal(m.id, pt.id);
    assert.equal(m.scope, pt.scope);
    assert.equal(m.name, pt.name, 'a marca não se traduz');
    assert.deepEqual(m.icons, pt.icons);
    assert.equal(m.theme_color, pt.theme_color);
    assert.equal(m.shortcuts.length, pt.shortcuts.length);
    assert.ok(m.start_url.includes(`lang=${idioma}`), `${idioma}: start_url`);
    for (const [k, s] of m.shortcuts.entries()) {
      assert.ok(s.url.includes(`lang=${idioma}`), `${idioma}: atalho ${k}`);
      assert.equal(s.url.split('?')[0], pt.shortcuts[k].url.split('?')[0], `${idioma}: atalho ${k} aponta para a mesma rota`);
      assert.ok(s.name && s.short_name && s.description, `${idioma}: atalho ${k} sem texto`);
    }
    assert.ok(!descricoes.has(m.description), `${idioma}: descrição repetida de outro idioma`);
    descricoes.add(m.description);
    const priv = readFileSync(join(SRC, `privacidade/${idioma}.html`), 'utf8');
    assert.match(priv, new RegExp(`<html lang="${idioma}">`));
    assert.match(priv, new RegExp(`<link rel="canonical" href="https://saibatudo\\.net/quimica/privacidade/${idioma}">`));
    assert.deepEqual(alternativas(priv), esperadas, `${idioma}: as cinco versões da política + x-default`);
    assert.match(priv, /<a href="\/quimica\/privacidade" hreflang="pt-BR" lang="pt-BR">/, `${idioma}: link para o texto-fonte em português`);
    assert.ok(priv.includes(`/quimica/?lang=${idioma}`), `${idioma}: volta ao app no mesmo idioma`);
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(priv) && !/\sstyle=/.test(priv), `${idioma}: CSP, sem inline`);
    assert.equal((priv.match(/<h2>/g) ?? []).length, (ptPriv.match(/<h2>/g) ?? []).length, `${idioma}: mesma estrutura de seções da política em português`);
    assert.equal((priv.match(/<tr>/g) ?? []).length, (ptPriv.match(/<tr>/g) ?? []).length, `${idioma}: mesma tabela de conexões`);
    assert.ok(priv.includes('saibatudo@saibatudo.net') && priv.includes('Francisco Aleixo'), `${idioma}: contato do responsável`);
    assert.equal(arquivoPorIdioma('manifest', 'webmanifest', idioma), `manifest.${idioma}.webmanifest`);
    assert.equal(caminhoPrivacidade(idioma), `/quimica/privacidade/${idioma}`);
  }
  assert.equal(arquivoPorIdioma('manifest', 'webmanifest', 'pt-BR'), 'manifest.webmanifest');
  assert.equal(caminhoPrivacidade('pt-BR'), '/quimica/privacidade');
});

test('aplicarIdiomaAoDocumento troca <html lang>, descrição, og:locale, manifesto e hreflang para QUALQUER idioma', () => {
  const criar = () => {
    const attrs = new Map();
    const meta = { desc: null, og: null, manifest: null };
    const links = [];
    const el = (tag) => ({ tag, attrs: new Map(), setAttribute(k, v) { this.attrs.set(k, v); }, remove() { links.splice(links.indexOf(this), 1); } });
    const head = { append: (l) => links.push(l) };
    const nos = { 'meta[name="description"]': el('meta'), 'meta[property="og:locale"]': el('meta'), 'link[rel="manifest"]': el('link') };
    return {
      documentElement: { setAttribute: (k, v) => attrs.set(k, v) }, head, attrs, links, nos,
      querySelector: (sel) => nos[sel] ?? null,
      querySelectorAll: () => [...links],
      createElement: el
    };
  };
  try {
    for (const idioma of IDIOMAS) {
      const doc = criar();
      definirIdioma(idioma);
      aplicarIdiomaAoDocumento(doc);
      assert.equal(doc.attrs.get('lang'), idioma);
      assert.equal(doc.nos['meta[name="description"]'].attrs.get('content'), t('ui.html.descricao'));
      assert.equal(doc.nos['meta[property="og:locale"]'].attrs.get('content'), t('ui.html.ogLocale'));
      assert.equal(doc.nos['link[rel="manifest"]'].attrs.get('href'), `/quimica/${idioma === 'pt-BR' ? 'manifest.webmanifest' : `manifest.${idioma}.webmanifest`}`);
      assert.deepEqual(doc.links.map((l) => l.attrs.get('hreflang')), ['pt-BR', 'en', 'es', 'de', 'fr', 'x-default']);
    }
    assert.deepEqual(['pt-BR', 'en', 'es', 'de', 'fr'].map((i) => CATALOGOS[i].ui.html.ogLocale), ['pt_BR', 'en_US', 'es_ES', 'de_DE', 'fr_FR']);
  } finally { definirIdioma('pt-BR'); }
});

test('DADOS da fixture trazem os campos por idioma do contrato (nomes, sinonimosPorIdioma, nomesPorIdioma, frases por idioma, index de textos)', async () => {
  const store = await lojaNova(DADOS);
  const o = store.porSimbolo.get('O');
  assert.equal(o.nomes.en, 'Oxygen');
  const agua = await store.composto(962);
  assert.equal(agua.nomes.en, 'water');
  assert.ok(Array.isArray(agua.sinonimosPorIdioma.en));
  const entrada = store.indice.porCid.get(962);
  assert.ok(entrada.chavesPorIdioma.en?.includes('water') || entrada.chaves.includes('water'), 'nome em inglês pesquisável pelo índice (nomes ∪ nomesPorIdioma.en)');
  assert.equal(store.regras.frasesHPorIdioma.en.H314, 'Causes severe skin burns and eye damage.');
  assert.ok(store.arquivos.has('textos/index.json'));
});
