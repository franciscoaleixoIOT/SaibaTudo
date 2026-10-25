// Conteúdo didático PRÓPRIO do SaibaTudo LLMs (autoria do projeto, MIT): seis seções por idioma, em conteudo/<idioma>.js. Nenhuma figura ou
// trecho de terceiros; as referências são artigos acadêmicos. As seções também são os "trechos" que a IA na nuvem recebe (trechosPara).
import ptBR from './pt-BR.js';
import en from './en.js';
import es from './es.js';
import de from './de.js';
import fr from './fr.js';
import zh from './zh.js';

export const CONTEUDOS = { 'pt-BR': ptBR, en, es, de, fr, zh };
export const IDS_SECOES = ['modelo', 'tokens', 'embeddings', 'atencao', 'camadas', 'softmax'];
export const MAX_TRECHO = 2000;
export const MAX_TRECHOS = 3;

/** Referências acadêmicas citadas pelas seções (iguais em todo idioma). */
export const REFERENCIAS = {
  glove2014: { texto: 'Pennington, J., Socher, R. & Manning, C. D. (2014). GloVe: Global Vectors for Word Representation. EMNLP 2014.', url: 'https://nlp.stanford.edu/projects/glove/' },
  word2vec2013: { texto: 'Mikolov, T., Yih, W. & Zweig, G. (2013). Linguistic Regularities in Continuous Space Word Representations. NAACL-HLT 2013; Mikolov, T. et al. (2013). Efficient Estimation of Word Representations in Vector Space.', url: 'https://aclanthology.org/N13-1090/' },
  transformer2017: { texto: 'Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS 2017.', url: 'https://arxiv.org/abs/1706.03762' }
};

export const secoes = (idioma) => (CONTEUDOS[idioma] ?? CONTEUDOS['pt-BR']).secoes;
export const secao = (idioma, id) => secoes(idioma).find((s) => s.id === id) ?? null;

/** Trechos para a nuvem: até MAX_TRECHOS seções válidas, cada uma com id "<idioma>:<secao>" e texto (título + parágrafos) ≤ MAX_TRECHO. */
export function trechosPara(idioma, ids) {
  const out = [];
  for (const id of ids) {
    if (out.length >= MAX_TRECHOS) break;
    const s = secao(idioma, id);
    if (!s) continue;
    const texto = `${s.titulo}. ${s.paragrafos.join(' ')}`.replace(/\*\*?/g, '');
    out.push({ id: `${idioma}:${id}`, texto: texto.length > MAX_TRECHO ? texto.slice(0, MAX_TRECHO - 1) + '…' : texto });
  }
  return out;
}
