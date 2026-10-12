// Léxicos do interpretador (contracts/lexico/<idioma>.json → js/nlu/lex/<idioma>.js, gerados por tools/gerar_lexico.py): em dia com o contrato,
// mesma estrutura em todos os idiomas, regexes que compilam em JS (e no subconjunto comum ao Java), e o NLU/segurança funcionando por idioma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ, loja } from './support.mjs';
import { IDIOMAS } from '../src/quimica/js/i18n/index.js';
import { IDIOMAS_LEXICO, LEXICOS_BRUTOS, compilar, lexico } from '../src/quimica/js/nlu/lex/index.js';
import { avaliarSeguranca, idiomasDaAvaliacao } from '../src/quimica/js/seguranca.js';
import { Dicionario } from '../src/quimica/js/dicionario.js';
import { lerQuantidades, lerUnidade, parse } from '../src/quimica/js/nlu.js';

const CONTRATOS = resolve(RAIZ, 'contracts/lexico');
const GERADOS = resolve(RAIZ, 'web/src/quimica/js/nlu/lex');
const CABECALHO = '// gerado — não editar.';

function chaves(obj, prefixo = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [prefixo];
  return Object.entries(obj).flatMap(([k, v]) => chaves(v, prefixo ? `${prefixo}.${k}` : k));
}

test('há um contrato e um gerado para cada um dos cinco idiomas, e o gerado está EM DIA com o JSON (mesma serialização do gerador)', () => {
  const contratos = readdirSync(CONTRATOS).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
  assert.deepEqual(contratos, [...IDIOMAS].sort());
  assert.deepEqual(Object.keys(LEXICOS_BRUTOS).sort(), [...IDIOMAS].sort());
  for (const idioma of IDIOMAS) {
    const json = JSON.parse(readFileSync(resolve(CONTRATOS, `${idioma}.json`), 'utf8'));
    assert.equal(json.idioma, idioma);
    const gerado = readFileSync(resolve(GERADOS, `${idioma}.js`), 'utf8');
    assert.ok(gerado.startsWith(CABECALHO), `${idioma}.js sem o cabeçalho de arquivo gerado`);
    const esperado = `export default ${JSON.stringify(json, null, 1)};\n`;
    assert.ok(gerado.endsWith(esperado), `${idioma}.js está DESATUALIZADO em relação a contracts/lexico/${idioma}.json: rode python tools/gerar_lexico.py`);
    assert.deepEqual(LEXICOS_BRUTOS[idioma], json);
  }
});

test('todos os léxicos têm a mesma estrutura do pt-BR (mesmas intenções, pistas, propriedades, símbolos de unidade, categorias, extremos)', () => {
  const ref = LEXICOS_BRUTOS['pt-BR'];
  const estrutura = (b) => chaves({ intencoes: b.intencoes, pistas: b.pistas, nivel: b.nivel, propriedades: b.propriedades, seguranca: { ...b.seguranca, coladaAlvos: b.seguranca.coladaAlvos } }).sort();
  for (const idioma of IDIOMAS) {
    const b = LEXICOS_BRUTOS[idioma];
    assert.deepEqual(estrutura(b), estrutura(ref), idioma);
    assert.deepEqual(new Set(b.unidades.map((u) => u[1])), new Set(ref.unidades.map((u) => u[1])), `${idioma}: símbolos de unidade`);
    assert.deepEqual(new Set(b.categorias.map((c) => c[1])), new Set(ref.categorias.map((c) => c[1])), `${idioma}: categorias`);
    assert.deepEqual(new Set(b.estados.map((c) => c[1])), new Set(ref.estados.map((c) => c[1])), `${idioma}: estados`);
    assert.deepEqual(new Set(b.extremos.map((e) => `${e[1]}|${e[2]}`)), new Set(ref.extremos.map((e) => `${e[1]}|${e[2]}`)), `${idioma}: extremos`);
    for (const k of Object.keys(ref.propriedades)) assert.ok(b.propriedades[k].length >= 1, `${idioma}: sinônimos de ${k}`);
  }
});

test('regexes de todos os léxicos compilam em JS, sem flags embutidas e sem construções fora do subconjunto comum com java.util.regex', () => {
  for (const idioma of IDIOMAS) {
    const b = LEXICOS_BRUTOS[idioma];
    const todas = [...Object.values(b.intencoes), ...Object.values(b.pistas).filter((v) => typeof v === 'string'), ...b.pistas.limparConceito, ...Object.values(b.nivel),
      ...b.unidades.map((u) => u[0]), ...b.categorias.map((c) => c[0]), ...b.estados.map((c) => c[0]), ...b.extremos.map((e) => e[0]),
      ...['acao', 'contextoSeguro', 'alvoExplosivos', 'alvoArmas', 'alvoDrogas', 'precursoresNomes', 'alvoDano', 'alvoAutolesao', 'perigososCaseiros', 'casa'].flatMap((k) => b.seguranca[k]),
      b.seguranca.tirarFazerSeguro, b.seguranca.fazerBomba, b.seguranca.precursoresAcao];
    for (const src of todas) {
      assert.doesNotThrow(() => new RegExp(src, 'u'), `${idioma}: ${src}`);
      assert.ok(!/\(\?<[A-Za-z]/.test(src), `${idioma}: grupo nomeado em ${src}`);
      assert.ok(!/\\p\{/.test(src), `${idioma}: \\p{} em ${src}`);
      assert.ok(!/\(\?<[=!][^)]*(?:[*+]|\{\d*,\d*\})/.test(src), `${idioma}: lookbehind variável em ${src}`);
    }
    const c = compilar(b);
    assert.ok(c.intencoes.massaMolar instanceof RegExp && c.seguranca.acao instanceof RegExp && c.stopPalavras instanceof Set);
    assert.equal(lexico(idioma).idioma, idioma);
  }
  assert.equal(lexico('zz').idioma, 'pt-BR', 'idioma desconhecido cai no pt-BR');
  assert.deepEqual(IDIOMAS_LEXICO.sort(), [...IDIOMAS].sort());
});

test('unidades por extenso em cada idioma e quantidades com os dois separadores decimais', async () => {
  const u = (await loja()).ctx.unidades;
  const casos = {
    'pt-BR': [['graus Celsius', '°C'], ['mililitros', 'mL'], ['mol por litro', 'mol/L'], ['atmosferas', 'atm']],
    en: [['degrees celsius', '°C'], ['milliliters', 'mL'], ['millilitres', 'mL'], ['moles per liter', 'mol/L'], ['atmospheres', 'atm'], ['kelvin', 'K']],
    es: [['grados celsius', '°C'], ['mililitros', 'mL'], ['moles por litro', 'mol/L'], ['atmósferas', 'atm']],
    de: [['grad celsius', '°C'], ['milliliter', 'mL'], ['mol pro liter', 'mol/L'], ['atmosphären', 'atm']],
    fr: [['degrés celsius', '°C'], ['millilitres', 'mL'], ['moles par litre', 'mol/L'], ['atmosphères', 'atm']]
  };
  for (const [idioma, lista] of Object.entries(casos)) for (const [texto, simbolo] of lista) assert.equal(lerUnidade(texto, u, lexico(idioma)), simbolo, `${idioma}: ${texto}`);
  const q = (texto, idioma) => lerQuantidades(texto, u, lexico(idioma)).map((x) => [x.valor, x.unidade]);
  assert.deepEqual(q('1.5 mol/L of HCl', 'en'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('1,5 mol/L de HCl', 'pt-BR'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('2.5 x 10^-3 mol', 'en'), [[0.0025, 'mol']]);
  assert.deepEqual(q('100 mL of water at 300 K', 'en'), [[100, 'mL'], [300, 'K']]);
  assert.deepEqual(q('5 degrees celsius', 'en'), [[5, '°C']]);
  assert.deepEqual(q('1.234,56 g', 'pt-BR'), [[1234.56, 'g']]);
  assert.deepEqual(q('1,234.56 g', 'en'), [[1234.56, 'g']]);
  // es, de e fr: vírgula e ponto decimais, milhar do idioma, unidades coladas à preposição do idioma
  assert.deepEqual(q('1,5 mol/L de HCl', 'es'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('1.5 mol/L de HCl', 'es'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('100 mL de agua a 300 K', 'es'), [[100, 'mL'], [300, 'K']]);
  assert.deepEqual(q('2,5 mol Wasser', 'de'), [[2.5, 'mol']]);
  assert.deepEqual(q('1.5 mol/L HCl', 'de'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('100 mL Wasser bei 300 K', 'de'), [[100, 'mL'], [300, 'K']]);
  assert.deepEqual(q('1,5 mol/L de HCl', 'fr'), [[1.5, 'mol/L']]);
  assert.deepEqual(q('100 mL d eau à 300 K', 'fr'), [[100, 'mL'], [300, 'K']]);
  assert.deepEqual(q('1.234,56 g', 'de'), [[1234.56, 'g']]);
  assert.deepEqual(q('1.234,56 g', 'es'), [[1234.56, 'g']]);
});

test('segurança por idioma: o idioma ativo E sempre inglês e português; os casos pt-BR e en valem sob QUALQUER idioma ativo; cada idioma recusa os próprios casos com o próprio léxico', () => {
  assert.deepEqual(idiomasDaAvaliacao('de'), ['de', 'en', 'pt-BR']);
  assert.deepEqual(idiomasDaAvaliacao('en'), ['en', 'pt-BR']);
  const casos = JSON.parse(readFileSync(resolve(RAIZ, 'contracts/seguranca_cases.json'), 'utf8')).cases;
  const doIdioma = (i) => casos.filter((c) => (c.idioma ?? 'pt-BR') === i);
  const pt = doIdioma('pt-BR');
  const en = doIdioma('en');
  assert.ok(en.filter((c) => c.recusar).length >= 40 && en.filter((c) => !c.recusar).length >= 40, 'casos em inglês suficientes');
  for (const idioma of IDIOMAS) {
    const falhas = [];
    for (const c of [...pt, ...en]) {
      const r = avaliarSeguranca(c.q, idiomasDaAvaliacao(idioma));
      if (r.recusar !== c.recusar) falhas.push(`[${idioma}] ${c.recusar ? 'NÃO recusou' : 'recusou indevidamente'}: "${c.q}"${r.recusar ? ` (${r.categoria}/${r.idioma})` : ''}`);
      else if (c.recusar && c.categoria && r.categoria !== c.categoria) falhas.push(`[${idioma}] categoria de "${c.q}": esperada ${c.categoria}, veio ${r.categoria}`);
    }
    assert.deepEqual(falhas, [], `com o idioma ativo ${idioma}`);
  }
  // só o léxico do próprio idioma (sem os de reserva) recusa os casos do idioma; os pedidos legítimos de um idioma também passam sob o léxico de cada outro idioma ativo
  for (const idioma of IDIOMAS) {
    const proprios = doIdioma(idioma);
    for (const c of proprios.filter((x) => x.recusar)) assert.equal(avaliarSeguranca(c.q, [idioma]).recusar, true, `só ${idioma}: ${c.q}`);
    const falhas = [];
    for (const c of proprios) {
      for (const ativo of IDIOMAS) {
        const r = avaliarSeguranca(c.q, idiomasDaAvaliacao(ativo));
        if (!c.recusar && r.recusar) falhas.push(`[${ativo}] recusou indevidamente (${idioma}): "${c.q}" (${r.categoria}/${r.idioma})`);
        // o idioma do caso, ativo, decide a categoria; sob outro idioma ativo o pedido do idioma não coberto por en/pt-BR pode passar, mas nunca ser permitido pelo PRÓPRIO idioma
        if (c.recusar && ativo === idioma) {
          if (!r.recusar) falhas.push(`[${ativo}] NÃO recusou (${idioma}): "${c.q}"`);
          else if (c.categoria && r.categoria !== c.categoria) falhas.push(`[${ativo}] categoria de "${c.q}": esperada ${c.categoria}, veio ${r.categoria}`);
        }
      }
    }
    assert.deepEqual(falhas, [], `casos de ${idioma}`);
  }
});

test('o NLU em inglês usa o léxico en: intenções, propriedades e categorias com o pacote de teste', async () => {
  const store = await loja();
  const dic = new Dicionario(store, 'en');
  assert.equal(dic.idioma, 'en');
  const p = (q) => parse(q, dic);
  assert.equal(p('melting point of iron').propriedade, 'pontoFusaoK');
  assert.equal(p('melting point of iron').elemento, 'Fe');
  assert.equal(p('elements in group 17').grupo, 17);
  assert.equal(p('alkali metals').categoria, 'metal_alcalino');
  assert.equal(p('convert 5 atm to kPa').unidadeDestino, 'kPa');
  assert.equal(p('what is a mole?').intent, 'CONCEITO');
  assert.equal(p('how to make methamphetamine').intent, 'RECUSA_PERIGO');
  assert.equal(p('como fazer metanfetamina').intent, 'RECUSA_PERIGO', 'pedido perigoso em português também é recusado com o léxico en ativo');
  // continuação em inglês
  const ctx = p('melting point of iron');
  const seg = parse('and the boiling point?', dic, ctx);
  assert.equal(seg.elemento, 'Fe');
  assert.equal(seg.propriedade, 'pontoEbulicaoK');
  const outro = parse('and gold?', dic, ctx);
  assert.equal(outro.elemento, 'Au');
  assert.equal(outro.propriedade, 'pontoFusaoK');
  // o dicionário pt-BR continua igual ao de antes (léxico pt-BR)
  const dicPt = new Dicionario(store, 'pt-BR');
  assert.equal(dicPt.idioma, 'pt-BR');
  assert.equal(parse('ponto de fusão do ferro', dicPt).propriedade, 'pontoFusaoK');
  assert.equal(parse('melting point of iron', dicPt).propriedade, null, 'sinônimos em inglês não entram no dicionário pt-BR');
});
