// Vocabulário de ancoragem em TODOS os idiomas (pt-BR, en, es, de, fr), derivado do contrato compartilhado (contracts/lexico/<idioma>.json,
// pelas cópias de _lib/lexico/) e dos nomes de elementos do pacote de dados. Complementa as tabelas em português de vocab.js SEM substituí-las:
// o comportamento em português continua sendo o de vocab.js; aqui entram só as formas a mais, de qualquer idioma.
//
// O NLU da nuvem não recebe o idioma do cliente, então a ancoragem aceita a evidência em qualquer um dos cinco: o modelo só devolve uma
// entidade que ele próprio extraiu da pergunta, e a ancoragem apenas confere que o texto a sustenta (o cliente ainda revalida tudo).

import { IDIOMAS_LEXICO, LEXICOS_BRUTOS, formasDePropriedade, unidadesPorIdioma } from './lexico.js';
import NOMES_ES_DE_FR from './lexico/nomes-elementos.js';
import { FORMAS_PROPRIEDADE, NIVEIS, PROPRIEDADE_SET, UNIDADE_SET } from './vocab.js';

const dobrar = (s) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();

/**
 * Formas de superfície de cada propriedade vindas do léxico (todos os idiomas), minúsculas e sem acento, ainda não presentes em
 * FORMAS_PROPRIEDADE. Formas de menos de 3 letras ("z") ficam de fora: casariam com qualquer palavra que começa por elas.
 * Devem ser testadas como palavra/expressão INTEIRA (ground.js usa fronteira no fim).
 */
export const FORMAS_PROPRIEDADE_LEXICO = Object.freeze(Object.fromEntries(
  Object.entries(formasDePropriedade())
    .filter(([id]) => PROPRIEDADE_SET.has(id))
    .map(([id, formas]) => {
      const ja = new Set(FORMAS_PROPRIEDADE[id] ?? []);
      return [id, Object.freeze([...new Set(formas.map(dobrar).filter((f) => f.length >= 3 && !ja.has(f)))])];
    }),
));

/** "Mais eletronegativo", "heaviest", "schwerste Atom"...: expressões que pedem a propriedade sem nomeá-la (léxico `extremos`, todos os idiomas). */
export const EXTREMOS_POR_PROPRIEDADE = (() => {
  const out = {};
  for (const idioma of IDIOMAS_LEXICO) {
    for (const [src, id] of LEXICOS_BRUTOS[idioma].extremos) {
      if (PROPRIEDADE_SET.has(id)) (out[id] ??= []).push(new RegExp(src));
    }
  }
  return Object.freeze(out);
})();

/** Expressões de nível ("for kids", "ensino médio", "Abitur"...) de todos os idiomas: nível -> RegExp[] (texto já dobrado). */
export const NIVEIS_LEXICO = Object.freeze(Object.fromEntries(NIVEIS.map((nivel) => [
  nivel,
  IDIOMAS_LEXICO.map((idioma) => LEXICOS_BRUTOS[idioma].nivel?.[nivel]).filter(Boolean).map((src) => new RegExp(src)),
])));

/** Unidades do léxico ("degrees celsius", "litres", "grad celsius"): só as que existem no vocabulário fechado da API. [{ rx, simbolo }] */
export const UNIDADES_LEXICO = Object.freeze(unidadesPorIdioma().filter((u) => UNIDADE_SET.has(u.simbolo)).map(({ rx, simbolo }) => ({ rx, simbolo })));

/**
 * Nomes dos elementos em espanhol, alemão e francês (símbolo -> nomes). Nomes de menos de 3 letras ficam de fora: o ouro francês, "or",
 * é a conjunção inglesa ("gold or mercury") e ancoraria o elemento errado em qualquer pergunta em inglês.
 */
export const NOMES_ELEMENTOS_OUTROS = Object.freeze(Object.fromEntries(
  Object.entries(NOMES_ES_DE_FR).map(([simbolo, porIdioma]) => [simbolo, Object.freeze(Object.values(porIdioma).filter((n) => dobrar(n).length >= 3))]),
));
