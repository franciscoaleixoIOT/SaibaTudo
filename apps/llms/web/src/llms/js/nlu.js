// Interpretador local por regras (sem texto fixo em língua natural: tudo vem do léxico do idioma, js/nlu/lex). Entrada: a pergunta; saída:
// intenção + palavras do GloVe (em inglês, com a forma original e se foi traduzida pelo glossário), analogia (a − b + c), direção (w1 − w2),
// preset, conceito e se é continuação da pergunta anterior. Nunca inventa dados: só reconhece o que está no vocabulário ou no glossário.
import { normalizarParaLexico } from './nlu/lex/index.js';

export const INTENTS = ['SAUDACAO', 'AJUDA', 'SOBRE_DADOS', 'FONTES', 'MOSTRAR', 'ANALOGIA', 'VIZINHOS', 'SIMILARIDADE', 'DIRECAO', 'CONCEITO', 'PRESET', 'LIMPAR', 'DESCONHECIDA'];
const MAX_PALAVRAS_CONTINUACAO = 6;
const LATINA = /[a-z][a-z'-]*/g;
const HAN = /[一-鿿]+/g;
const FORMULA_ANALOGIA = /([a-z'-]+)\s*[-−–]\s*([a-z'-]+)\s*\+\s*([a-z'-]+)/;
const FORMULA_DIRECAO = /^\s*([a-z'-]+)\s*[-−–]\s*([a-z'-]+)\s*[?!.]*\s*$/;

/** Resolve um token no vocabulário ou no glossário do idioma: {en, original, traduzida} ou null. */
function resolverToken(tok, vetores, idioma) {
  const i = vetores.indice(tok);
  if (i >= 0) return { en: vetores.palavra(i), original: tok, traduzida: false };
  const trad = vetores.sugerirTraduzindo(tok, idioma);
  return trad ? { en: trad.en, original: tok, traduzida: true } : null;
}

/** Sequências Han: tenta a sequência inteira no glossário e, se falhar, pedaços de 1 a 4 caracteres (ganancioso da esquerda). */
function tokensHan(run, vetores, idioma) {
  const saida = [];
  const inteiro = resolverToken(run, vetores, idioma);
  if (inteiro) return [inteiro];
  let i = 0;
  while (i < run.length) {
    let achou = null;
    for (let n = Math.min(4, run.length - i); n >= 1; n--) {
      const r = resolverToken(run.slice(i, i + n), vetores, idioma);
      if (r) { achou = r; i += n; break; }
    }
    if (achou) saida.push(achou); else i += 1;
  }
  return saida;
}

/**
 * Palavras do GloVe citadas no texto: entre aspas (valem mesmo sendo stopPalavras) e tokens latinos fora das stopPalavras; em chinês também
 * as sequências Han pelo glossário. Devolve { palavras: [{en, original, traduzida}], desconhecidas: [] } sem repetição (por `en`).
 */
export function extrairPalavras(texto, lex, vetores, idioma) {
  const norm = normalizarParaLexico(texto, lex);
  const palavras = []; const desconhecidas = []; const vistos = new Set();
  const empurrar = (r) => { if (r && !vistos.has(r.en)) { vistos.add(r.en); palavras.push(r); } };
  const aspas = new RegExp(lex.pistas.aspas.source, 'g');
  const citadas = new Set();
  for (const m of norm.matchAll(aspas)) for (const tok of m[1].split(/\s+/).filter(Boolean)) citadas.add(tok);
  const candidatos = [];
  for (const m of norm.matchAll(LATINA)) candidatos.push(m[0]);
  for (const tok of candidatos) {
    const citado = citadas.has(tok);
    if (!citado && (lex.stopPalavras.has(tok) || tok.length < 2)) continue;
    const r = resolverToken(tok, vetores, idioma);
    if (r) empurrar(r); else if (!desconhecidas.includes(tok)) desconhecidas.push(tok);
  }
  if (lex.semFronteira) {
    for (const m of norm.matchAll(HAN)) {
      // tira as stopPalavras Han (de, 和…) das pontas antes de procurar
      let run = m[0];
      for (const sp of lex.stopPalavras) { if (sp && /[一-鿿]/.test(sp)) run = run.split(sp).join(' '); }
      for (const pedaco of run.split(' ').filter(Boolean)) for (const r of tokensHan(pedaco, vetores, idioma)) empurrar(r);
    }
  }
  return { palavras, desconhecidas };
}

const contem = (norm, termos) => {
  let melhor = null;
  for (const t of termos) if (norm.includes(t) && (!melhor || t.length > melhor.length)) melhor = t;
  return melhor;
};

/** Conceito citado no texto (o termo mais longo que casa), ou null. */
function conceitoDe(norm, lex) {
  let melhor = null;
  for (const [id, termos] of Object.entries(lex.conceitos)) {
    const t = contem(norm, termos);
    if (t && (!melhor || t.length > melhor.termo.length)) melhor = { id, termo: t };
  }
  return melhor?.id ?? null;
}

function presetDe(norm, lex, comTermo = false) {
  let melhor = null;
  for (const [id, termos] of Object.entries(lex.presets)) {
    const t = contem(norm, termos);
    if (t && (!melhor || t.length > melhor.termo.length)) melhor = { id, termo: t };
  }
  return comTermo ? melhor : (melhor?.id ?? null);
}

const contarPalavras = (norm, lex) => (lex.semFronteira ? norm.replace(/\s+/g, '').length : norm.split(/\s+/).filter(Boolean).length);

/**
 * Interpreta a pergunta.
 * @returns {{ intencao: string, palavras: {en, original, traduzida}[], desconhecidas: string[], analogia: {a,b,c}|null, direcao: {w1,w2}|null, preset: string|null, conceito: string|null, continuacao: boolean }}
 */
export function parse(pergunta, lex, { vetores, idioma, contexto = null }) {
  const norm = normalizarParaLexico(pergunta, lex);
  const base = { intencao: 'DESCONHECIDA', palavras: [], desconhecidas: [], analogia: null, direcao: null, preset: null, conceito: null, continuacao: false };
  if (!norm) return base;
  const I = lex.intencoes; const Pi = lex.pistas;
  const { palavras, desconhecidas } = extrairPalavras(pergunta, lex, vetores, idioma);
  const r = { ...base, palavras, desconhecidas };
  const en = (tok) => resolverToken(tok, vetores, idioma)?.en ?? null;

  const conceito = conceitoDe(norm, lex);
  if (I.saudacao.test(norm)) return { ...r, intencao: 'SAUDACAO' };
  if (I.ajuda.test(norm) && !conceito) return { ...r, intencao: 'AJUDA' };
  if (I.sobreDados.test(norm)) return { ...r, intencao: 'SOBRE_DADOS' };
  if (I.fontes.test(norm) && !palavras.length) return { ...r, intencao: 'FONTES' };
  if (I.limpar.test(norm) && !FORMULA_ANALOGIA.test(norm)) return { ...r, intencao: 'LIMPAR' };

  // analogia por fórmula ("king - man + woman") ou por "a está para b como c está para"
  const f = FORMULA_ANALOGIA.exec(norm);
  if (f) {
    const [a, b, c] = [f[1], f[2], f[3]].map(en);
    if (a && b && c) return { ...r, intencao: 'ANALOGIA', analogia: { a, b, c } };
  }
  const ep = Pi.estaPara.exec(norm);
  if (ep) {
    const [x, y, z] = [ep[1], ep[2], ep[3]].map(en);
    if (x && y && z) return { ...r, intencao: 'ANALOGIA', analogia: { a: y, b: x, c: z } };
  }
  // direção por fórmula ("cats - cat") ou por pista de plural
  const fd = FORMULA_DIRECAO.exec(norm);
  if (fd) {
    const [w1, w2] = [fd[1], fd[2]].map(en);
    if (w1 && w2) return { ...r, intencao: 'DIRECAO', direcao: { w1, w2 } };
  }
  const presetAchado = presetDe(norm, lex, true);
  const preset = presetAchado?.id ?? null;
  if (I.direcao.test(norm) || (Pi.plural.test(norm) && !I.mostrar.test(norm) && palavras.length < 2)) {
    if (Pi.plural.test(norm) || preset === 'plural') return { ...r, intencao: 'DIRECAO', direcao: { w1: 'cats', w2: 'cat' } };
    if (palavras.length >= 2) return { ...r, intencao: 'DIRECAO', direcao: { w1: palavras[0].en, w2: palavras[1].en } };
  }
  if (I.analogia.test(norm) && palavras.length >= 3) return { ...r, intencao: 'ANALOGIA', analogia: { a: palavras[0].en, b: palavras[1].en, c: palavras[2].en } };
  // preset: pedido explícito, ou termo do preset sem outras palavras citadas (as palavras citadas têm de estar dentro do próprio termo)
  if (preset && (I.preset.test(norm) || palavras.every((p) => presetAchado.termo.includes(normalizarParaLexico(p.original, lex))))) return { ...r, intencao: 'PRESET', preset };
  if (I.vizinhos.test(norm) && palavras.length >= 1 && !I.similaridade.test(norm)) return { ...r, intencao: 'VIZINHOS' };
  if (I.similaridade.test(norm) && palavras.length >= 2) return { ...r, intencao: 'SIMILARIDADE' };
  if (I.conceito.test(norm) && conceito) return { ...r, intencao: 'CONCEITO', conceito };
  if (conceito && !palavras.length) return { ...r, intencao: 'CONCEITO', conceito };
  if (I.conceito.test(norm) && !palavras.length) return { ...r, intencao: 'CONCEITO', conceito: 'embedding' };
  // pergunta factual ("qual é a capital da França?") não é um comando de mostrar: fica desconhecida, com as palavras achadas como sugestão
  const comando = I.mostrar.test(norm) || I.vizinhos.test(norm) || Pi.continuacao.test(norm);
  if (palavras.length >= 1 && Pi.pergunta.test(norm) && !comando) return { ...r, intencao: 'DESCONHECIDA' };
  if (palavras.length >= 1) {
    const curta = contarPalavras(norm, lex) <= (lex.semFronteira ? 12 : MAX_PALAVRAS_CONTINUACAO);
    const continuacao = Boolean(contexto && ['MOSTRAR', 'PRESET', 'ANALOGIA', 'VIZINHOS'].includes(contexto.intencao) && Pi.continuacao.test(norm) && curta);
    return { ...r, intencao: 'MOSTRAR', continuacao };
  }
  if (I.vizinhos.test(norm) || I.similaridade.test(norm) || I.mostrar.test(norm)) return { ...r, intencao: 'DESCONHECIDA' };
  return r;
}
