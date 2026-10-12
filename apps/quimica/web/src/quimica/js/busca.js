// Busca de compostos e elementos nos dados (sem rede): nomes no idioma ativo (e em inglês/português como reserva), popular, IUPAC, sinônimos por
// idioma, fórmula, CAS e CID. Os `motivo`s são chaves internas (não são exibidos).
import { chaveFormula } from './calc/formula.js';
import { idiomaAtual } from './i18n/index.js';
import { todosOsNomes } from './nomes.js';
import { normalizar } from './texto.js';

function pontuarNome(q, nome) {
  if (!nome) return 0;
  const n = normalizar(nome);
  if (!n) return 0;
  if (n === q) return 90;
  if (n.startsWith(q)) return 70;
  if (n.split(' ').some((p) => p.startsWith(q))) return 55;
  if (q.length >= 3 && n.includes(q)) return 35;
  return 0;
}

/**
 * @param {object[]} entradas índice de compostos (cid, nome, nomePopular, nomeIupac, sinonimos, nomes, sinonimosPorIdioma, formula, cas, chaves, chavesPorIdioma)
 * @returns {object[]} as melhores entradas, com `pontos` e `motivo`
 */
export function buscarCompostos(entradas, consulta, limite = 50, idioma = idiomaAtual()) {
  const bruto = String(consulta ?? '').trim();
  if (!bruto) return [];
  const q = normalizar(bruto);
  const f = chaveFormula(bruto);
  const ehCas = /^\d{2,7}-\d{2}-\d$/.test(bruto);
  const cid = /^(?:cid\s*)?(\d{1,9})$/i.exec(bruto)?.[1];
  const out = [];
  for (const e of entradas) {
    let pontos = 0;
    let motivo = '';
    const tenta = (p, m) => { if (p > pontos) { pontos = p; motivo = m; } };
    if (ehCas && e.cas === bruto) tenta(100, 'CAS');
    if (cid && String(e.cid) === cid) tenta(100, 'CID');
    if (e.formula && f) {
      const ef = chaveFormula(e.formula);
      if (ef === f) tenta(f.length >= 2 ? 88 : 60, 'fórmula');
      else if (f.length >= 3 && ef.startsWith(f)) tenta(40, 'fórmula');
    }
    // índice do pipeline: só chaves de busca normalizadas (nomes, sinônimos, fórmulas), gerais e por idioma
    if (f && e.chavesF?.length) {
      if (e.chavesF.includes(f)) tenta(f.length >= 2 ? 88 : 60, 'fórmula');
      else if (f.length >= 3 && e.chavesF.some((x) => x.startsWith(f))) tenta(40, 'fórmula');
    }
    if (q) {
      for (const k of e.chaves ?? []) tenta(pontuarNome(q, k) - 3, 'nome');
      for (const k of e.chavesPorIdioma?.[idioma] ?? []) tenta(pontuarNome(q, k) - 1, 'nome');
      if (idioma !== 'en') for (const k of e.chavesPorIdioma?.en ?? []) tenta(pontuarNome(q, k) - 4, 'nome');
      const proprio = e.nomes?.[idioma] ?? (idioma === 'pt-BR' ? e.nome : null);
      if (proprio) tenta(pontuarNome(q, proprio), 'nome');
      for (const s of e.sinonimosPorIdioma?.[idioma] ?? []) tenta(pontuarNome(q, s) - 2, 'sinônimo');
      for (const nm of todosOsNomes(e, idioma)) tenta(pontuarNome(q, nm) - 3, 'nome');
      tenta(pontuarNome(q, e.nomePopular) - (idioma === 'pt-BR' ? 0 : 4), 'nome popular');
      tenta(pontuarNome(q, e.nomeIupac) - 5, 'nome IUPAC');
    }
    if (pontos > 0) out.push({ ...e, pontos, motivo });
  }
  out.sort((a, b) => b.pontos - a.pontos || String(a.nome ?? '').localeCompare(String(b.nome ?? ''), idioma));
  return out.slice(0, limite);
}

/** Elementos por símbolo, número atômico ou nome (no idioma ativo, em inglês ou em português). */
export function buscarElementos(elementos, consulta, idioma = idiomaAtual()) {
  const bruto = String(consulta ?? '').trim();
  if (!bruto) return elementos;
  const q = normalizar(bruto);
  return elementos.filter((e) => e.simbolo.toLowerCase() === bruto.toLowerCase() || String(e.z) === bruto
    || todosOsNomes(e, idioma).some((nm) => normalizar(nm).includes(q)));
}
