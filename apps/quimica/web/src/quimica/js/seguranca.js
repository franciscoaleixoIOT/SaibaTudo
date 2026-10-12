// Segurança química: recusa por REGRAS, antes de qualquer outro processamento (NLU, dados ou modelo), de pedidos de síntese, purificação ou
// ampliação de escala de explosivos, armas químicas, drogas ilícitas e precursores, e de receitas "em casa" com reagentes perigosos.
// Perguntas legítimas (neutralizar um derramamento, EPI, primeiros socorros, por que não misturar produtos de limpeza, fórmula ou estrutura de
// uma substância) NÃO são recusadas. Espelho: Seguranca.kt (Android). Casos compartilhados: contracts/seguranca_cases.json.
//
// Os padrões vivem no léxico de cada idioma (contracts/lexico/<idioma>.json, bloco `seguranca`). A avaliação aplica o idioma ativo E SEMPRE o
// inglês e o português (um pedido perigoso em qualquer idioma tem de ser recusado). Estratégia: (alvo perigoso) E (ação de produzir/obter/esconder)
// no mesmo pedido, em três versões da frase: normal (sem acentos), com trocas de "leet" (s1ntese, 3xplosivo) e "colada" (letras repetidas e separadores removidos).
import { idiomaAtual, t, tl } from './i18n/index.js';
import { colada as colar, lexico } from './nlu/lex/index.js';

export const CATEGORIAS_RECUSA = ['EXPLOSIVOS', 'ARMAS_QUIMICAS', 'DROGAS', 'PRECURSORES', 'REAGENTES_CASEIROS', 'DANO_A_PESSOAS', 'AUTOLESAO'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '€': 'e' };

/** Texto sem acentos, minúsculo e sem caracteres invisíveis. */
function limpar(texto) {
  return String(texto ?? '')
    .normalize('NFKD')
    .replace(/[​-‏⁠﻿­‪-‮]/g, '')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
const espacado = (s) => s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const leet = (s) => s.replace(/[01345789@$!|€]/g, (c) => LEET[c] ?? c);

/** Idiomas cujos padrões são aplicados: o ativo e, sempre, inglês e português. */
export function idiomasDaAvaliacao(idioma = idiomaAtual()) {
  return [...new Set([idioma, 'en', 'pt-BR'])];
}

/** Compatibilidade: sugestões seguras em pt-BR. Use sugestoesSeguras() para o idioma ativo. */
export const SUGESTOES_SEGURAS = ['Quais EPIs usar com ácido sulfúrico?', 'Primeiros socorros para respingo de soda cáustica no olho', 'Por que não misturar água sanitária com amoníaco?'];
export const sugestoesSeguras = () => tl('respostas.sugestoes.seguras');

/**
 * @param {string} texto
 * @param {string[]} [idiomas] padrão: idioma ativo + en + pt-BR
 * @returns {{recusar: boolean, categoria: string|null, rotulo: string|null, motivo: string|null, idioma?: string}}
 */
export function avaliarSeguranca(texto, idiomas = idiomasDaAvaliacao()) {
  const base = limpar(texto);
  if (!base.trim()) return { recusar: false, categoria: null, rotulo: null, motivo: null };
  const v1 = espacado(base);
  const v2 = espacado(leet(base));
  const visoes = v1 === v2 ? [v1] : [v1, v2];
  const lexicos = [...new Set(idiomas)].map((i) => lexico(i));

  // autolesão primeiro, em todos os idiomas: resposta de acolhimento, mesmo sem "ação"
  for (const lx of lexicos) for (const v of visoes) if (lx.seguranca.alvoAutolesao.test(v)) return recusa('AUTOLESAO', 'autolesao', lx.idioma);

  for (const lx of lexicos) {
    const S = lx.seguranca;
    for (const v of visoes) {
      const incidente = S.contextoSeguro.test(v);
      // "o que fazer se…", "fazer o descarte…" não são pedidos de produção
      const vc = v.replace(S.tirarFazerSeguro, ' ');
      const acao = S.acao.test(vc);
      const casa = S.casa.test(v);
      // dano a pessoas: o alvo já contém a ação
      if (S.alvoDano.test(v)) return recusa('DANO_A_PESSOAS', 'dano', lx.idioma);
      if (S.fazerBomba.test(vc)) return recusa('EXPLOSIVOS', 'bomba', lx.idioma);
      // alvos graves: a recusa vale mesmo com palavras de "segurança" na frase (não há como produzir "com segurança")
      if (acao && S.alvoExplosivos.test(vc)) return recusa('EXPLOSIVOS', 'explosivos', lx.idioma);
      if (acao && S.alvoArmas.test(vc)) return recusa('ARMAS_QUIMICAS', 'armas', lx.idioma);
      if (acao && S.alvoDrogas.test(vc)) return recusa('DROGAS', 'drogas', lx.idioma);
      if (acao && S.precursoresNomes.test(vc) && (S.alvoDrogas.test(vc) || S.precursoresAcao.test(vc))) return recusa('PRECURSORES', 'precursores', lx.idioma);
      // receitas caseiras com reagentes perigosos: "em casa" + produzir; fica de fora quem trata de descarte, EPI, incidente etc.
      if (!incidente && acao && casa && S.perigososCaseiros.test(vc)) return recusa('REAGENTES_CASEIROS', 'caseiro', lx.idioma);
    }
  }

  // versão colada: tolera "explo sivo", "e x p l o s i v o", "exploosivo"
  for (const lx of lexicos) {
    const S = lx.seguranca;
    const c = colar(leet(base).replace(/[^a-z0-9]+/g, ' ').replace(S.tirarFazerSeguro, ' '));
    if (c.length >= 8 && !S.contextoSeguro.test(v1)) {
      const acao = S.coladaAcoes.some((a) => c.includes(a));
      if (acao) {
        for (const [cat, alvos] of Object.entries(S.coladaAlvos)) {
          if (alvos.some((a) => c.includes(a))) return recusa(cat, 'disfarce', lx.idioma);
        }
      }
    }
  }
  return { recusar: false, categoria: null, rotulo: null, motivo: null };
}

function recusa(categoria, motivo, idioma) {
  return { recusar: true, categoria, rotulo: t(`respostas.recusa.categorias.${categoria}`), motivo, idioma };
}

/** Resposta padrão de recusa no idioma ativo (sem dados, sem números). */
export function respostaRecusa(avaliacao) {
  const cat = avaliacao?.categoria ?? 'padrao';
  const chave = cat === 'DANO_A_PESSOAS' || cat === 'AUTOLESAO' ? cat : 'padrao';
  const principal = t(`respostas.recusa.${chave}`);
  const linhas = [principal];
  if (cat !== 'AUTOLESAO') linhas.push(t('respostas.recusa.alternativas'));
  return { principal, linhas, categoria: avaliacao?.categoria ?? null };
}
