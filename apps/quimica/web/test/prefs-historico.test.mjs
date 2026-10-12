// Histórico de perguntas (padrão dos apps SaibaTudo, igual ao de Eleições): fica só neste navegador, sem repetir a última
// pergunta, no máximo 50 itens de até 300 caracteres; qualquer lixo salvo é saneado ao carregar.
import test from 'node:test';
import assert from 'node:assert/strict';

const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k)
};
const prefs = await import('../src/quimica/js/prefs.js');

test('sanear: histórico ausente ou inválido vira lista vazia; itens são aparados, cortados a 300 e limitados aos últimos 50', () => {
  assert.deepEqual(prefs.sanear({}).historicoPerguntas, []);
  assert.deepEqual(prefs.sanear({ historicoPerguntas: 'x' }).historicoPerguntas, []);
  const bruto = Array.from({ length: 60 }, (_, i) => `  Pergunta ${i + 1}  `);
  bruto.push('', '   ', null, 123, 'a'.repeat(400));
  const s = prefs.sanear({ historicoPerguntas: bruto }).historicoPerguntas;
  assert.equal(s.length, prefs.MAX_HISTORICO);
  assert.equal(s[0], 'Pergunta 12'); // 60 perguntas + o item de 400 caracteres = 61 válidos; ficam os últimos 50
  assert.equal(s[s.length - 1].length, 300);
  assert.equal(prefs.sanear({}).tema, 'SISTEMA', 'os outros campos continuam saneados');
});

test('registrarPergunta: acrescenta, não repete a última, persiste e sobrevive a um novo carregar()', () => {
  memoria.clear();
  assert.deepEqual(prefs.registrarPergunta('massa molar da água'), ['massa molar da água']);
  assert.deepEqual(prefs.registrarPergunta('  massa molar da água '), ['massa molar da água'], 'repetição imediata não duplica');
  assert.deepEqual(prefs.registrarPergunta('e do potássio?'), ['massa molar da água', 'e do potássio?']);
  assert.deepEqual(prefs.registrarPergunta(''), ['massa molar da água', 'e do potássio?'], 'vazio não entra');
  assert.deepEqual(prefs.carregar().historicoPerguntas, ['massa molar da água', 'e do potássio?']);
  assert.equal(prefs.carregar().tema, 'SISTEMA', 'não apaga as outras preferências');
});

test('o início usa o histórico e o campo que cresce (texto do módulo, sem navegador)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/quimica/js/ui/inicio.js', import.meta.url), 'utf8');
  for (const trecho of ['registrarPergunta(q)', "campo.value = ''", 'campoAutoAltura({', "e.key === 'ArrowUp'", "e.key === 'ArrowDown'", "icon('chevUp'", 'busca-historico-slot']) {
    assert.ok(src.includes(trecho), `inicio.js sem: ${trecho}`);
  }
  const comp = await import('../src/quimica/js/ui/componentes.js').catch(() => null);
  assert.ok(comp === null || typeof comp.campoAutoAltura === 'function');
});
