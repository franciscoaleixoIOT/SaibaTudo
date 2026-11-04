// Formato do bot: blocos da resposta (answers.js) → HTML do Telegram em partes de até 4 000 caracteres, com HTML escapado, aviso com ⚠️ e
// rodapé (fontes, data do pacote, modelo) só na última parte; e texto simples sem tags.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_TELEGRAM, dividir, escaparHtml, paraTelegramHtml, paraTextoSimples, rodapeTexto } from '../_lib/bot/formato.js';

const R = {
  titulo: 'Massa molar de água (H₂O)',
  blocos: [
    { tipo: 'kv', titulo: null, itens: [{ rotulo: 'Fórmula', valor: 'H2O' }, { rotulo: 'Massa molar', valor: '18,015 g/mol' }], fonte: { nome: 'PubChem' } },
    { tipo: 'lista', titulo: 'Passos', itens: ['2 × H = 2,016', '1 × O = 15,999'], fonte: { nome: 'App' } },
    { tipo: 'aviso', texto: 'Valor a 25 °C <ref>', fonte: { nome: 'App' } },
  ],
  rodape: { fontes: ['PubChem', 'SaibaTudo Química (este aplicativo)'], dataPacote: '28/10/2026' },
};

test('escaparHtml: &, < e >', () => assert.equal(escaparHtml('a<b>&c'), 'a&lt;b&gt;&amp;c'));

test('paraTelegramHtml: título em negrito, kv e lista como texto, aviso com ⚠️, HTML escapado, rodapé em itálico no fim', () => {
  const partes = paraTelegramHtml(R);
  assert.equal(partes.length, 1);
  const h = partes[0];
  assert.ok(h.startsWith('<b>Massa molar de água (H₂O)</b>'));
  assert.ok(h.includes('Fórmula: H2O') && h.includes('Massa molar: 18,015 g/mol'));
  assert.ok(h.includes('• 2 × H = 2,016'));
  assert.ok(h.includes('⚠️ Valor a 25 °C &lt;ref&gt;'), 'HTML do conteúdo é escapado');
  assert.ok(h.trimEnd().endsWith('<i>Fontes: PubChem, SaibaTudo Química (este aplicativo) · Dados de 28/10/2026</i>'));
});

test('paraTextoSimples: mesmo conteúdo sem tags; rodapeTexto junta só o que existe', () => {
  const t = paraTextoSimples(R);
  assert.ok(!/<\/?(b|i)>/.test(t), 'sem tags de formatação (o "<ref>" do aviso é conteúdo)');
  assert.ok(t.includes('Valor a 25 °C <ref>'), 'conteúdo não é escapado no texto simples');
  assert.ok(t.includes('Fontes: PubChem') && t.includes('Dados de 28/10/2026'));
  assert.equal(rodapeTexto({ origem: 'Qwen3-4B' }), 'Modelo: Qwen3-4B');
  assert.equal(rodapeTexto({}), '');
});

test('dividir e partes numeradas: nada acima de 4 000, corte em quebra de linha, rodapé só na última, tags inteiras', () => {
  const linhas = Array.from({ length: 400 }, (_, i) => `Linha ${i} com <b>texto</b> suficiente para encher a mensagem do Telegram.`);
  const partes = dividir(linhas.join('\n'));
  assert.ok(partes.length >= 2);
  for (const p of partes) {
    assert.ok(p.length <= LIMITE_TELEGRAM);
    assert.equal((p.match(/<b>/g) ?? []).length, (p.match(/<\/b>/g) ?? []).length, 'tags inteiras');
  }
  assert.equal(partes.join('\n'), linhas.join('\n'), 'nada se perde');
  const grande = { titulo: 'Fontes', blocos: [{ tipo: 'lista', titulo: null, itens: Array.from({ length: 300 }, (_, i) => `Fonte número ${i} com licença CC BY-SA 4.0 e endereço longo`) }], rodape: { dataPacote: '28/10/2026' } };
  const html = paraTelegramHtml(grande);
  assert.ok(html.length >= 2);
  assert.ok(html[0].startsWith('(1/') && html.at(-1).startsWith(`(${html.length}/${html.length}) `));
  assert.ok(html.at(-1).includes('Dados de 28/10/2026') && !html[0].includes('Dados de'), 'rodapé só na última');
  for (const p of html) assert.ok(p.length <= LIMITE_TELEGRAM);
});
