// Resolução do `composto` devolvido pelo modelo (texto copiado da pergunta: nome, apelido ou fórmula) no índice do PACOTE DE DADOS
// (data/quimica/compostos/index.json, que vai junto da função pelo `includeFiles` do vercel.json). Decisão do mantenedor (13/10/2026):
// a API diz se achou o composto (CID) e, se não achou, sugere até 3 nomes parecidos — o cliente mostra "não encontrei X; você quis dizer Y?"
// em vez de inventar uma resposta. A API continua NÃO fornecendo fatos: só o CID e nomes de busca do pacote assinado.
//
// Índice: { porCid: {cid: lote}, nomes: [[nome normalizado, cid], ...], nomesPorIdioma: {en|es|de|fr: [[nome, cid], ...]} }. Os nomes já
// vêm em minúsculas e sem acentos (mesma normalização de `fold`); fórmulas também em minúsculas ("h2so4"). Chave repetida (ex.: "h2o" para
// a água e para um isotopólogo): vale a PRIMEIRA ocorrência, como o índice está ordenado (nome, cid).

import { readFileSync } from 'node:fs';
import { fold } from './ground.js';

const INDICE_LOCAL = new URL('../../data/quimica/compostos/index.json', import.meta.url);
export const MAX_SUGESTOES = 3;
const MIN_PREFIXO = 4;

/** Chave de busca de um texto: minúsculas, sem acentos nem sub/sobrescritos, espaços colapsados, sem pontuação final. */
export function chaveBusca(texto) {
  return fold(texto).replace(/\s+/g, ' ').replace(/[\s?!.,;:]+$/g, '').trim();
}

/** Variantes da chave que o modelo costuma copiar: com artigo/preposição à frente ("o ácido", "de água", "the water", "l'eau"). */
function variantes(chave) {
  const v = [chave];
  const semArtigo = chave.replace(/^(?:o|a|os|as|um|uma|de|do|da|dos|das|el|la|los|las|un|una|de la|del|the|an?|of|der|die|das|den|dem|des|ein|eine|le|les|une|du|de l'|l'|d')\s*/u, '');
  if (semArtigo && semArtigo !== chave) v.push(semArtigo);
  return v;
}

/** Distância de Levenshtein limitada: devolve `limite + 1` assim que passa do limite (barato para 27 mil nomes). */
export function distancia(a, b, limite) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let minimoLinha = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      atual.push(v);
      if (v < minimoLinha) minimoLinha = v;
    }
    if (minimoLinha > limite) return limite + 1;
    anterior = atual;
  }
  return anterior[b.length];
}

/** Monta o resolvedor a partir do objeto do índice (ou de qualquer objeto com `nomes`/`nomesPorIdioma` no mesmo formato). */
export function criarResolvedor(indice) {
  const porNome = new Map(); // chave -> cid (primeira ocorrência vence)
  const adicionar = (lista) => {
    if (!Array.isArray(lista)) return;
    for (const par of lista) {
      const [nome, cid] = Array.isArray(par) ? par : [par?.nome ?? par?.n, par?.cid];
      const k = typeof nome === 'string' ? chaveBusca(nome) : '';
      const c = Number(cid);
      if (!k || !Number.isInteger(c) || c <= 0 || porNome.has(k)) continue;
      porNome.set(k, c);
    }
  };
  adicionar(indice?.nomes);
  for (const lista of Object.values(indice?.nomesPorIdioma ?? {})) adicionar(lista);
  const nomes = [...porNome.keys()];

  /**
   * @param {string} texto  `composto` do modelo (já normalizado pelo proxy)
   * @returns {{cid: string, nome: string} | {cid: null, sugestoes: {cid: string, nome: string}[]} | null}  null se o texto não dá chave
   */
  function resolver(texto) {
    if (typeof texto !== 'string') return null;
    const base = chaveBusca(texto);
    if (!base) return null;
    for (const k of variantes(base)) {
      const cid = porNome.get(k);
      if (cid) return { cid: String(cid), nome: k };
    }
    return { cid: null, sugestoes: sugerir(base) };
  }

  /** Até MAX_SUGESTOES nomes parecidos (um por CID): prefixo comum de 4+ letras ou distância de edição pequena; os mais próximos primeiro. */
  function sugerir(chave) {
    const limite = chave.length <= 5 ? 1 : chave.length <= 12 ? 2 : 3;
    const candidatos = [];
    for (const nome of nomes) {
      let pontos = null;
      const d = distancia(chave, nome, limite);
      if (d <= limite) pontos = d;
      else if (chave.length >= MIN_PREFIXO && (nome.startsWith(chave) || chave.startsWith(nome)) && Math.abs(nome.length - chave.length) <= 12) pontos = limite + 1 + Math.abs(nome.length - chave.length) / 100;
      else if (chave.length >= MIN_PREFIXO + 2 && nome.includes(chave) && nome.length <= chave.length + 15) pontos = limite + 2 + nome.length / 100;
      if (pontos !== null) candidatos.push({ nome, pontos });
    }
    candidatos.sort((x, y) => x.pontos - y.pontos || x.nome.length - y.nome.length || (x.nome < y.nome ? -1 : 1));
    const vistos = new Set();
    const saida = [];
    for (const c of candidatos) {
      const cid = String(porNome.get(c.nome));
      if (vistos.has(cid)) continue;
      vistos.add(cid);
      saida.push({ cid, nome: c.nome });
      if (saida.length >= MAX_SUGESTOES) break;
    }
    return saida;
  }

  return { resolver, sugerir, tamanho: porNome.size };
}

let padrao;
/** Resolvedor do índice publicado junto da função. Sem o arquivo (deploy sem includeFiles), devolve null e a API segue sem `resolucao`. */
export function resolvedorPadrao(readFn = (u) => readFileSync(u, 'utf8')) {
  if (padrao === undefined) {
    try {
      padrao = criarResolvedor(JSON.parse(readFn(INDICE_LOCAL)));
    } catch {
      padrao = null;
    }
  }
  return padrao;
}

/** Atalho usado pelo handler: { composto: {cid, nome} | {cid: null, sugestoes} } ou null quando não há índice/composto. */
export function resolverComposto(texto, resolvedor = resolvedorPadrao()) {
  if (!resolvedor || typeof texto !== 'string') return null;
  const r = resolvedor.resolver(texto);
  return r ? { composto: r } : null;
}
