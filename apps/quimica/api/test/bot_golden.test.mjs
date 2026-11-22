// Golden do bot: 20 casos pt-BR do golden compartilhado (contracts/nlu_golden_cases.json) passados pelo núcleo do bot devem dar o MESMO
// intent e a MESMA entidade que o site (critério 1 da spec). Roda só com o pacote real assinado em data/quimica; sem ele, pula.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { criarNucleo } from '../_lib/bot/nucleo.js';
import { avaliavel, cidDe } from '../../web/test/contrato.mjs';

const RAIZ = new URL('../../', import.meta.url);
const temPacote = existsSync(new URL('data/quimica/manifest.sig', RAIZ));
const golden = JSON.parse(readFileSync(new URL('contracts/nlu_golden_cases.json', RAIZ), 'utf8')).cases;

test('golden do bot: 20 primeiros casos pt-BR com entidade → mesmo intent e entidade que o contrato', { skip: !temPacote && 'sem pacote real em data/quimica' }, async () => {
  const store = await storeDoDisco();
  const casos = golden.filter((c) => (c.idioma ?? 'pt-BR') === 'pt-BR' && (c.elemento || c.composto != null) && c.intent !== 'DESCONHECIDA' && avaliavel(c, store)).slice(0, 20);
  assert.equal(casos.length, 20);
  const nucleo = criarNucleo({ obterStore: () => storeDoDisco(), env: () => ({ BOT_ENABLED: '1' }), autorizado: () => true });
  const falhas = [];
  for (const [i, c] of casos.entries()) {
    const s = await nucleo.processar({ canal: 'telegram', remetenteId: '1', conversaId: `g${i}`, texto: c.q, acao: null, idioma: 'pt-BR', eventoId: `g:${i}`, callbackId: null });
    if (s.silencio) { falhas.push(`"${c.q}": silêncio ${s.motivo}`); continue; }
    if (s.interpretacao.intent !== c.intent) falhas.push(`"${c.q}": intent ${s.interpretacao.intent} ≠ ${c.intent}`);
    if (c.elemento && s.interpretacao.elemento !== c.elemento) falhas.push(`"${c.q}": elemento ${s.interpretacao.elemento} ≠ ${c.elemento}`);
    if (c.composto != null && s.interpretacao.composto !== cidDe(c.composto, store)) falhas.push(`"${c.q}": composto ${s.interpretacao.composto} ≠ ${cidDe(c.composto, store)}`);
  }
  assert.deepEqual(falhas, []);
});
