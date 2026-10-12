// Léxicos do interpretador por idioma (docs/I18N.md §3): os arquivos <idioma>.js desta pasta são GERADOS de contracts/lexico/<idioma>.json por
// tools/gerar_lexico.py (regexes como texto). Aqui eles são compilados uma vez por idioma; nlu.js, dicionario.js e seguranca.js recebem o léxico
// compilado (`lexico(idioma)`) e não têm texto em língua natural fixo.
import { idiomaAtual } from '../../i18n/index.js';
import { IDIOMA_PADRAO, normalizarIdioma } from '../../i18n/idiomas.js';
import ptBR from './pt-BR.js';
import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';

export const LEXICOS_BRUTOS = { 'pt-BR': ptBR, en, es, de, fr };

const rx = (src) => new RegExp(src);
const rxG = (src) => new RegExp(src, 'g');
const rxAlt = (partes) => new RegExp('\\b(?:' + partes.join('|') + ')\\b');
/** "Colada": só letras, sem repetições consecutivas ("exploosivo" → "explosivo"), como em seguranca.js. */
export const colada = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');

/** Compila um léxico bruto (JSON) em RegExp e Sets. Puro: o mesmo JSON dá o mesmo resultado. */
export function compilar(bruto) {
  const intencoes = Object.fromEntries(Object.entries(bruto.intencoes).map(([k, v]) => [k, rx(v)]));
  const p = bruto.pistas;
  const pistas = {
    ...Object.fromEntries(Object.entries(p).filter(([k]) => !['limparConceito', 'quantidadeComplemento', 'letrasUnidade', 'ligacaoPreposicoes', 'constantes', 'paraUnidade', 'quantosUnidade'].includes(k)).map(([k, v]) => [k, rx(v)])),
    limparConceito: p.limparConceito.map(rx),
    constantes: new RegExp(p.constantes, 'gi'),
    paraUnidade: new RegExp(p.paraUnidade, 'i'),
    quantosUnidade: new RegExp(p.quantosUnidade, 'i'),
    quantidadeComplemento: p.quantidadeComplemento,
    letrasUnidade: p.letrasUnidade,
    ligacaoPreposicoes: p.ligacaoPreposicoes
  };
  const s = bruto.seguranca;
  const seguranca = {
    acao: rxAlt(s.acao),
    contextoSeguro: rxAlt(s.contextoSeguro),
    tirarFazerSeguro: rxG(s.tirarFazerSeguro),
    alvoExplosivos: rxAlt(s.alvoExplosivos),
    fazerBomba: rx(s.fazerBomba),
    alvoArmas: rxAlt(s.alvoArmas),
    alvoDrogas: rxAlt(s.alvoDrogas),
    precursoresNomes: rxAlt(s.precursoresNomes),
    precursoresAcao: rx(s.precursoresAcao),
    alvoDano: rxAlt(s.alvoDano),
    alvoAutolesao: rxAlt(s.alvoAutolesao),
    perigososCaseiros: rxAlt(s.perigososCaseiros),
    casa: rxAlt(s.casa),
    coladaAlvos: Object.fromEntries(Object.entries(s.coladaAlvos).map(([cat, l]) => [cat, l.map(colada)])),
    coladaAcoes: s.coladaAcoes.map(colada)
  };
  return {
    idioma: bruto.idioma,
    intencoes,
    pistas,
    nivel: Object.fromEntries(Object.entries(bruto.nivel).map(([k, v]) => [k, rx(v)])),
    unidades: bruto.unidades.map(([src, simbolo]) => [rx(src), simbolo]),
    categorias: bruto.categorias.map(([src, id]) => [rx(src), id]),
    estados: bruto.estados.map(([src, id]) => [rx(src), id]),
    extremos: bruto.extremos.map(([src, prop, dir]) => [rx(src), [prop, dir]]),
    propriedades: bruto.propriedades,
    stopwordsBusca: new Set(bruto.stopwordsBusca),
    stopPalavras: new Set(bruto.stopPalavras),
    palavrasFuncionais: new Set([...bruto.stopPalavras, ...bruto.palavrasFuncionais]),
    simbolosAmbiguos: new Set(bruto.simbolosAmbiguos),
    naoFormulas: new Set(bruto.naoFormulas),
    seguranca
  };
}

const cache = new Map();
/** Léxico compilado do idioma (padrão: o idioma ativo). Idioma desconhecido cai no pt-BR. */
export function lexico(idioma = idiomaAtual()) {
  const id = normalizarIdioma(idioma) ?? IDIOMA_PADRAO;
  const chave = LEXICOS_BRUTOS[id] ? id : IDIOMA_PADRAO;
  if (!cache.has(chave)) cache.set(chave, compilar(LEXICOS_BRUTOS[chave]));
  return cache.get(chave);
}

export const IDIOMAS_LEXICO = Object.keys(LEXICOS_BRUTOS);
