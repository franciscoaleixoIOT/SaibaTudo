// Léxicos por idioma do contrato compartilhado (contracts/lexico/<idioma>.json), como a API os consome.
//
// A fonte da verdade é o JSON de cada idioma (site e Android o usam também). Aqui entram as cópias geradas `_lib/lexico/<idioma>.js`
// (ver _lib/lexico/sincronizar.mjs: o deploy da Vercel não leva contracts/). A API usa duas partes:
//   - `seguranca`: padrões de recusa (alvo + ação, exceções de contexto seguro, dano a pessoas, autolesão...). Aplicados em TODOS os idiomas,
//     sempre: um pedido perigoso em qualquer língua tem de ser barrado antes de qualquer modelo (compilação idêntica à do site, nlu/lex/index.js);
//   - `propriedades`: formas de superfície de cada propriedade (ancoragem do NLU em ground.js).
// O texto que chega às expressões é minúsculo, sem acento e só com [a-z0-9] e espaços (ver seguranca.js).

import pt from './lexico/pt-BR.js';
import en from './lexico/en.js';
import es from './lexico/es.js';
import de from './lexico/de.js';
import fr from './lexico/fr.js';

export const IDIOMAS_LEXICO = Object.freeze(['pt-BR', 'en', 'es', 'de', 'fr']);
export const LEXICOS_BRUTOS = Object.freeze({ 'pt-BR': pt, en, es, de, fr });

const rx = (src) => new RegExp(src);
const rxG = (src) => new RegExp(src, 'g');
const rxAlt = (partes) => new RegExp(`\\b(?:${partes.join('|')})\\b`);

/** "Colada": só letras, sem repetições consecutivas ("exploosivo" -> "explosivo"), como no site. */
export const colada = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');

/** Compila a seção `seguranca` de um léxico bruto (a mesma compilação de web/src/quimica/js/nlu/lex/index.js). */
export function compilarSeguranca(bruto) {
  const s = bruto.seguranca;
  return {
    acao: rxAlt(s.acao),
    contextoSeguro: rxAlt(s.contextoSeguro),
    tirarFazerSeguro: rxG(s.tirarFazerSeguro),
    alvoExplosivos: rxAlt(s.alvoExplosivos),
    fazerBomba: rx(s.fazerBomba),
    fazerBombaG: rxG(s.fazerBomba), // para iterar todas as ocorrências (matchAll)
    alvoArmas: rxAlt(s.alvoArmas),
    alvoDrogas: rxAlt(s.alvoDrogas),
    precursoresNomes: rxAlt(s.precursoresNomes),
    precursoresAcao: rx(s.precursoresAcao),
    alvoDano: rxAlt(s.alvoDano),
    alvoAutolesao: rxAlt(s.alvoAutolesao),
    perigososCaseiros: rxAlt(s.perigososCaseiros),
    casa: rxAlt(s.casa),
    coladaAlvos: Object.fromEntries(Object.entries(s.coladaAlvos).map(([cat, l]) => [cat, l.map(colada)])),
    coladaAcoes: s.coladaAcoes.map(colada),
  };
}

let segurancaCompilada = null;
/** [{ idioma, ...padrões compilados }] para os cinco idiomas, na ordem de IDIOMAS_LEXICO (compilado uma vez). */
export function segurancaPorIdioma() {
  segurancaCompilada ??= IDIOMAS_LEXICO.map((idioma) => ({ idioma, ...compilarSeguranca(LEXICOS_BRUTOS[idioma]) }));
  return segurancaCompilada;
}

/**
 * Formas de superfície de cada propriedade, de todos os idiomas, na forma que o léxico as guarda (minúsculas, sem acento).
 * @returns {Record<string, string[]>} id -> formas (sem repetição)
 */
export function formasDePropriedade() {
  const out = {};
  for (const idioma of IDIOMAS_LEXICO) {
    for (const [id, formas] of Object.entries(LEXICOS_BRUTOS[idioma].propriedades)) {
      const lista = (out[id] ??= []);
      for (const f of formas) if (!lista.includes(f)) lista.push(f);
    }
  }
  return out;
}

/**
 * Unidades por idioma: [{ idioma, rx: RegExp, simbolo }]. Cada `rx` é ancorada (^...$) e testa UMA expressão de unidade já dobrada
 * ("degrees celsius", "litres"), não um texto inteiro.
 */
export function unidadesPorIdioma() {
  const out = [];
  for (const idioma of IDIOMAS_LEXICO) {
    for (const [src, simbolo] of LEXICOS_BRUTOS[idioma].unidades) out.push({ idioma, rx: rx(src), simbolo });
  }
  return out;
}
