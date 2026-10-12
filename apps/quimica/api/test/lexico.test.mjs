// O léxico que a API consome: cópias geradas de contracts/lexico/<idioma>.json (e dos nomes de elementos do pacote de dados) em dia, e
// compiláveis. Falhou aqui? O contrato mudou: rode `node _lib/lexico/sincronizar.mjs` (da pasta api/) e refaça os testes. Sem rede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { IDIOMAS, desatualizados, textoGerado, textoNomes } from '../_lib/lexico/sincronizar.mjs';
import { IDIOMAS_LEXICO, LEXICOS_BRUTOS, compilarSeguranca, formasDePropriedade, segurancaPorIdioma, unidadesPorIdioma } from '../_lib/lexico.js';
import nomes from '../_lib/lexico/nomes-elementos.js';

const CONTRATOS = new URL('../../contracts/lexico/', import.meta.url);
const ELEMENTOS = new URL('../../data/quimica/elementos.json', import.meta.url);

test('os módulos gerados estão em dia com os contratos (contracts/lexico) e com os nomes do pacote de dados', (t) => {
  if (!existsSync(CONTRATOS)) return t.skip('contracts/ não está neste checkout (deploy)');
  assert.deepEqual(desatualizados(), [], 'rode: node _lib/lexico/sincronizar.mjs');
  for (const idioma of IDIOMAS) {
    const contrato = JSON.parse(readFileSync(new URL(`${idioma}.json`, CONTRATOS), 'utf8'));
    assert.deepEqual(LEXICOS_BRUTOS[idioma], contrato, idioma);
    assert.equal(textoGerado(idioma) !== null, true);
  }
});

test('nomes de elementos em es/de/fr: 118 símbolos, iguais ao pacote de dados', (t) => {
  assert.equal(Object.keys(nomes).length, 118);
  for (const [s, porIdioma] of Object.entries(nomes)) {
    assert.deepEqual(Object.keys(porIdioma), ['es', 'de', 'fr'], s);
    for (const n of Object.values(porIdioma)) assert.ok(typeof n === 'string' && n.length >= 2, s);
  }
  if (!existsSync(ELEMENTOS)) return t.skip('data/quimica/elementos.json não está neste checkout');
  assert.equal(textoNomes() !== null, true);
  for (const e of JSON.parse(readFileSync(ELEMENTOS, 'utf8'))) {
    for (const idioma of ['es', 'de', 'fr']) assert.equal(nomes[e.simbolo][idioma], e.nomes[idioma].trim(), `${e.simbolo} ${idioma}`);
  }
});

test('os cinco léxicos existem, têm o idioma certo e compilam a seção de segurança', () => {
  assert.deepEqual(IDIOMAS_LEXICO, IDIOMAS);
  for (const idioma of IDIOMAS) {
    assert.equal(LEXICOS_BRUTOS[idioma].idioma, idioma);
    const S = compilarSeguranca(LEXICOS_BRUTOS[idioma]);
    for (const k of ['acao', 'contextoSeguro', 'alvoExplosivos', 'alvoArmas', 'alvoDrogas', 'precursoresNomes', 'alvoDano', 'alvoAutolesao', 'perigososCaseiros', 'casa']) {
      assert.ok(S[k] instanceof RegExp, `${idioma}.${k}`);
    }
    assert.deepEqual(Object.keys(S.coladaAlvos).sort(), ['ARMAS_QUIMICAS', 'DROGAS', 'EXPLOSIVOS', 'PRECURSORES'], idioma);
    assert.ok(S.coladaAcoes.length > 0 && S.coladaAcoes.every((a) => /^[a-z]+$/.test(a)), idioma);
  }
  assert.equal(segurancaPorIdioma().length, 5);
});

test('formas de propriedade e unidades de todos os idiomas estão disponíveis', () => {
  const formas = formasDePropriedade();
  assert.ok(formas.pontoFusaoK.includes('melting point') && formas.pontoFusaoK.includes('ponto de fusao'));
  assert.ok(formas.pontoFusaoK.includes('schmelzpunkt'));
  const unidades = unidadesPorIdioma();
  assert.ok(unidades.some((u) => u.simbolo === 'g' && u.rx.test('grams')));
  assert.ok(unidades.some((u) => u.simbolo === 'g' && u.rx.test('gramas')));
});
