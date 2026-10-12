// Nomes de elementos e compostos no idioma ativo (docs/I18N.md §1.2): o nome vem do pacote (`nomes[idioma]`, Wikidata), com reserva em
// inglês (`nomes.en`, `nomeEn`, `nomeIupac`) e depois em português (`nome`), SEMPRE rotulado quando não está no idioma pedido.
// Nenhum nome é traduzido no cliente. Sem DOM.
import { idiomaAtual, nomeDoIdioma, t, catalogo } from './i18n/index.js';

const vazio = (x) => x == null || x === '';

/**
 * Nome do elemento no idioma: { nome, idioma (do nome), rotulado }. `rotulado` = true quando o nome mostrado não está no idioma pedido.
 * @param {object} e registro de elementos.json (nome, nomeEn, nomes?)
 */
export function nomeElemento(e, idioma = idiomaAtual()) {
  if (!e) return { nome: '', idioma, rotulado: false };
  const proprio = e.nomes?.[idioma] ?? (idioma === 'pt-BR' ? e.nome : idioma === 'en' ? e.nomeEn ?? e.nomes?.en : null);
  if (!vazio(proprio)) return { nome: proprio, idioma, rotulado: false };
  const ingles = e.nomes?.en ?? e.nomeEn;
  if (!vazio(ingles)) return { nome: ingles, idioma: 'en', rotulado: idioma !== 'en' };
  if (!vazio(e.nome)) return { nome: e.nome, idioma: 'pt-BR', rotulado: idioma !== 'pt-BR' };
  return { nome: e.simbolo ?? '', idioma, rotulado: false };
}

/**
 * Nome do composto no idioma: `nomes[idioma]` → (pt-BR: `nome`; en: `nomes.en` ou `nomeIupac`) → inglês rotulado → português rotulado → "CID n".
 * @param {object} c registro de compostos/<lote>.json ou entrada do índice
 */
export function nomeComposto(c, idioma = idiomaAtual()) {
  if (!c) return { nome: '', idioma, rotulado: false };
  const proprio = c.nomes?.[idioma] ?? (idioma === 'pt-BR' ? c.nome : idioma === 'en' ? c.nomes?.en ?? c.nomeIupac : null);
  if (!vazio(proprio)) return { nome: proprio, idioma, rotulado: false };
  const ingles = c.nomes?.en ?? c.nomeIupac;
  if (!vazio(ingles)) return { nome: ingles, idioma: 'en', rotulado: idioma !== 'en' };
  if (!vazio(c.nome)) return { nome: c.nome, idioma: 'pt-BR', rotulado: idioma !== 'pt-BR' };
  return { nome: c.cid != null ? t('ui.compostos.cid', { cid: c.cid }) : '', idioma, rotulado: false };
}

/** Texto para exibição: o nome, com o rótulo "(nome em inglês)" quando não está no idioma ativo. Nunca mostra uma reserva sem rótulo. */
export function exibirNome(info) {
  if (!info?.nome) return '';
  return info.rotulado ? t('ui.nomes.emIdioma', { nome: info.nome, idioma: nomeDoIdioma(info.idioma) }) : info.nome;
}

/** Nome do elemento pronto para exibir (com rótulo quando for reserva). */
export const nomeElementoExibicao = (e, idioma = idiomaAtual()) => exibirNome(nomeElemento(e, idioma));
/** Nome do composto pronto para exibir (com rótulo quando for reserva). */
export const nomeCompostoExibicao = (c, idioma = idiomaAtual()) => exibirNome(nomeComposto(c, idioma));

/** Primeira letra minúscula para o meio da frase ("Ponto de fusão de ferro"), exceto em idiomas que mantêm maiúscula (alemão). */
export function minusNoMeio(s, idioma = idiomaAtual()) {
  if (!s) return s;
  if (catalogo(idioma)?.regras?.minusculaNoMeio === false) return s;
  // siglas e fórmulas ("CID 962", "DDT", "H₂O") ficam como estão
  if (/^[A-Z]{2}/.test(s) || /\d/.test(s.slice(0, 3))) return s;
  return s[0].toLowerCase() + s.slice(1);
}

/** Lista de nomes (um por idioma disponível) de um registro, para busca e índices: sem repetições, na ordem de prioridade do idioma. */
export function todosOsNomes(reg, idioma = idiomaAtual()) {
  if (!reg) return [];
  const out = [];
  const add = (x) => { if (typeof x === 'string' && x.trim() && !out.includes(x)) out.push(x); };
  add(reg.nomes?.[idioma]);
  for (const s of reg.sinonimosPorIdioma?.[idioma] ?? []) add(s);
  if (idioma === 'pt-BR') { add(reg.nome); add(reg.nomePopular); }
  add(reg.nomes?.en); add(reg.nomeEn); add(reg.nomeIupac);
  for (const s of reg.sinonimosPorIdioma?.en ?? []) add(s);
  for (const s of reg.sinonimos ?? []) add(s);
  add(reg.nomes?.['pt-BR']); add(reg.nome); add(reg.nomePopular);
  return out;
}
