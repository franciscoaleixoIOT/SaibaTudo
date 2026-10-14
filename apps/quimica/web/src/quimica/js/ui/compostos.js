// Busca de compostos (nomes no idioma ativo, popular, IUPAC, sinônimos, fórmula, CAS, CID) e ficha do composto com estrutura 2D, GHS e fontes.
// O índice do pacote pode trazer só chaves de busca (sem nomes de exibição): nesse caso os resultados são completados com os registros dos lotes, sob demanda.
import { h, icon } from '../dom.js';
import { buscarCompostos } from '../busca.js';
import { formulaUnicode } from '../calc/formula.js';
import { fmt } from '../formato.js';
import { idiomaAtual, nomeDoIdioma, t } from '../i18n/index.js';
import { moleculaEl } from '../molecula.js';
import { minusNoMeio, nomeComposto, nomeCompostoExibicao } from '../nomes.js';
import { fonteGhs, descreverGhs, urlSegura } from '../perigos.js';
import { classeRotulo, formatarValor, tabelaDePropriedades, valorBruto } from '../propriedades.js';
import { capitalizar, listar } from '../texto.js';
import { fonteEl, formulaEl, ghsEl, kvEl, linkExterno, linkRota } from './componentes.js';

/** Resultados de busca com os campos de exibição (nome, fórmula…) vindos dos registros dos lotes quando o índice não os traz. */
export async function comExibicao(store, entradas) {
  if (entradas.every((e) => e.nome != null)) return entradas;
  const registros = new Map((await store.enriquecer(entradas)).map((r) => [Number(r.cid), r]));
  return entradas.map((e) => { const r = registros.get(e.cid); return r ? { ...e, nome: r.nome, nomes: r.nomes ?? e.nomes, nomePopular: r.nomePopular ?? e.nomePopular, nomeIupac: r.nomeIupac, formula: r.formula, cas: r.cas, massaMolar: r.massaMolar } : e; });
}

/** Itens por página na lista de compostos e teto de resultados de uma busca (paginados). */
export const POR_PAGINA = 40;
export const LIMITE_BUSCA = 400;

export function viewCompostos({ store, query }) {
  const inicial = query.get('q') ?? '';
  const campo = h('input', { id: 'busca-composto', class: 'campo', type: 'search', value: inicial, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: t('ui.compostos.placeholder') });
  const lista = h('ul', { class: 'lista-resultados' });
  const status = h('p', { class: 'tp-contagem', role: 'status', 'aria-live': 'polite', tabindex: '-1' });
  const todos = store.indice.entradas;
  let sequencia = 0;
  const idioma = idiomaAtual();

  function item(c) {
    const nome = nomeCompostoExibicao(c);
    const sub = [idioma === 'pt-BR' && c.nomePopular && c.nomePopular !== c.nome ? c.nomePopular : null, c.nomeIupac !== nome ? c.nomeIupac : null, c.cas ? t('ui.compostos.cas', { cas: c.cas }) : null, c.massaMolar != null ? `${fmt(c.massaMolar, { sig: 7 })} g/mol` : null].filter(Boolean).join(' · ');
    return h('li', null, linkRota(`/quimica/composto/${c.cid}`, [
      h('strong', null, nome, c.formula ? [' — ', formulaEl(c.formula)] : null),
      sub ? h('span', { class: 'sub' }, sub) : null
    ], { class: 'item-res' }));
  }

  // Paginação (14/10/2026): a lista inteira (alfabética) e os resultados da busca vêm em páginas de POR_PAGINA; a página atual vai na URL (?p=).
  let pagina = Math.max(1, Number.parseInt(query.get('p') ?? '1', 10) || 1);
  const paginacao = h('nav', { class: 'paginacao', 'aria-label': t('ui.compostos.paginacao'), hidden: true });
  let ordenados = null; // cache da lista alfabética completa (só muda com o idioma, que recarrega a tela)

  const faixaTexto = (de, ate, n) => t('ui.compostos.faixa', { de: fmt(de), ate: fmt(ate), n: fmt(n) });

  function desenharPaginacao(total, irPara) {
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    paginacao.hidden = paginas <= 1;
    if (paginacao.hidden) { paginacao.replaceChildren(); return; }
    paginacao.replaceChildren(
      h('button', { type: 'button', class: 'btn btn-contorno peq', disabled: pagina <= 1, 'aria-label': t('ui.compostos.anterior'), onClick: () => irPara(pagina - 1) }, icon('back', 16), t('ui.compostos.anterior')),
      h('span', { class: 'pag-info' }, t('ui.compostos.pagina', { p: fmt(pagina), total: fmt(paginas) })),
      h('button', { type: 'button', class: 'btn btn-contorno peq', disabled: pagina >= paginas, 'aria-label': t('ui.compostos.proxima'), onClick: () => irPara(pagina + 1) }, t('ui.compostos.proxima'), icon('forward', 16)));
  }

  async function atualizar() {
    const q = campo.value.trim();
    const meu = ++sequencia;
    status.textContent = todos.length ? t('ui.compostos.buscando') : t('ui.compostos.semIndice');
    let encontrados; // lista completa (sem exibição) de onde sai a página
    let achados;
    try {
      if (q) {
        encontrados = buscarCompostos(todos, q, LIMITE_BUSCA);
        if (!encontrados.length && /^\d{2,7}-\d{2}-\d$/.test(q)) { // o índice do pacote não traz CAS: procura nos lotes
          const cid = await store.cidPorCas(q);
          if (cid != null) encontrados = [{ ...store.indice.porCid.get(cid), pontos: 100, motivo: 'CAS' }];
        }
      }
      else if (store.indice.temNomes) encontrados = ordenados ??= [...todos].sort((a, b) => nomeComposto(a).nome.localeCompare(nomeComposto(b).nome, idioma));
      else encontrados = await store.compostosIniciais(POR_PAGINA * 5);
      const paginas = Math.max(1, Math.ceil(encontrados.length / POR_PAGINA));
      if (pagina > paginas) pagina = paginas;
      // só a página visível é completada com os registros dos lotes (quando o índice não traz os nomes de exibição)
      achados = await comExibicao(store, encontrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA));
    } catch (e) {
      if (meu === sequencia) status.textContent = t('ui.compostos.erro', { msg: e instanceof Error ? e.message : String(e) });
      return;
    }
    if (meu !== sequencia) return; // uma busca mais nova já começou
    lista.replaceChildren(...achados.map(item));
    const n = encontrados.length;
    const de = n ? (pagina - 1) * POR_PAGINA + 1 : 0;
    const ate = Math.min(n, pagina * POR_PAGINA);
    const faixa = n > POR_PAGINA ? ` ${faixaTexto(de, ate, n)}` : '';
    status.textContent = !todos.length ? t('ui.compostos.semIndice')
      : q ? (n ? t('ui.compostos.resultados', { n }) + faixa : t('ui.compostos.nenhum', { q }))
        : t('ui.compostos.total', { n: todos.length }) + faixa;
    desenharPaginacao(n, (p) => { pagina = p; atualizar().then(() => { status.focus?.(); status.scrollIntoView?.({ block: 'start' }); }); });
    try {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (pagina > 1) qs.set('p', String(pagina));
      const s = qs.toString();
      history.replaceState(history.state, '', `${location.pathname}${s ? `?${s}` : ''}`);
    } catch { /* ignorado */ }
  }
  let tm = null;
  campo.addEventListener('input', () => { clearTimeout(tm); pagina = 1; tm = setTimeout(atualizar, 150); });

  const no = h('div', null,
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.compostos.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.compostos.intro')),
    h('label', { class: 'sr-only', for: 'busca-composto' }, t('ui.compostos.buscar')), campo, status, lista, paginacao);
  atualizar();
  return { titulo: t('ui.compostos.titulo'), node: no };
}

export async function viewComposto({ store, params }) {
  const cid = Number(params.cid);
  const c = Number.isInteger(cid) ? await store.composto(cid) : null;
  if (!c) {
    return { titulo: t('ui.compostos.naoEncontrado'), status: 404, node: h('div', null,
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.compostos.naoEncontrado')),
      h('p', { class: 'sub-pagina' }, t('ui.compostos.naoHa')), linkRota('/quimica/compostos', t('ui.compostos.buscarCompostos'), { class: 'btn btn-primario' })) };
  }
  const idioma = idiomaAtual();
  const info = nomeComposto(c);
  const nome = info.nome || t('ui.compostos.cid', { cid: c.cid });
  const props = tabelaDePropriedades(store.regras).filter((p) => p.alvo === 'composto' && !['formula', 'smiles', 'cid', 'nomeIupac'].includes(p.id));
  const itens = [];
  if (info.rotulado) itens.push({ rotulo: t('ui.nomes.nomeEmIdioma', { idioma: nomeDoIdioma(info.idioma) }), valor: info.nome });
  if (idioma === 'pt-BR' && c.nomePopular && c.nomePopular !== c.nome) itens.push({ rotulo: t('ui.compostos.nomePopular'), valor: c.nomePopular });
  if (c.nomeIupac) itens.push({ rotulo: t('ui.compostos.nomeIupac'), valor: c.nomeIupac });
  if (c.nomePtPendente && idioma === 'pt-BR') itens.push({ rotulo: t('ui.compostos.nomePt'), valor: t('ui.compostos.nomePtPendente') });
  const sinonimos = c.sinonimosPorIdioma?.[idioma] ?? (idioma === 'pt-BR' ? c.sinonimos : c.sinonimosPorIdioma?.en) ?? [];
  if (sinonimos?.length) itens.push({ rotulo: t('ui.compostos.sinonimos'), valor: listar(sinonimos.slice(0, 12)) });
  if (c.formula) itens.push({ rotulo: t('ui.compostos.formula'), valor: formulaEl(c.formula) });
  if (c.formulaHill && c.formulaHill !== c.formula) itens.push({ rotulo: t('ui.compostos.formulaHill'), valor: formulaEl(c.formulaHill) });
  for (const p of props) {
    const f = formatarValor(p, valorBruto(p, c), store.ctx);
    if (f) itens.push({ rotulo: capitalizar(p.rotulo), valor: f.texto });
  }
  itens.push({ rotulo: t('ui.compostos.cidPubchem'), valor: linkExterno(`https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}`, String(c.cid)) });
  if (c.smiles) itens.push({ rotulo: t('ui.compostos.smiles'), valor: h('code', null, c.smiles) });
  if (c.wikidata) itens.push({ rotulo: t('ui.compostos.wikidata'), valor: linkExterno(`https://www.wikidata.org/wiki/${encodeURIComponent(c.wikidata)}`, c.wikidata) });

  const g = descreverGhs(c.ghs, store.regras);
  const icsc = urlSegura(c.icscBuscaUrl ?? store.indice.porCid.get(c.cid)?.icscBuscaUrl);
  const defin = c.definicaoChebi ? (typeof c.definicaoChebi === 'string' ? { texto: c.definicaoChebi } : c.definicaoChebi) : null;
  const definTexto = defin?.texto ?? defin?.definicao ?? null;
  const chebiId = defin?.chebiId ?? defin?.chebi ?? defin?.id ?? null;
  const chebiUrl = urlSegura(defin?.url) ?? (chebiId && /^(?:CHEBI:)?\d+$/i.test(String(chebiId)) ? `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${/^\d+$/.test(String(chebiId)) ? `CHEBI:${chebiId}` : chebiId}` : 'https://www.ebi.ac.uk/chebi/');
  const fonteFrases = store.fonteFrasesH ? { nome: store.fonteFrasesH.nome, url: store.fonteFrasesH.url, licenca: store.fonteFrasesH.licenca } : { nome: t('ui.compostos.fonteFrases') };
  const tituloNome = info.rotulado ? t('ui.nomes.emIdioma', { nome, idioma: nomeDoIdioma(info.idioma) }) : nome;

  const no = h('div', null,
    linkRota('/quimica/compostos', [icon('back', 16), ` ${t('ui.compostos.voltar')}`], { class: 'voltar' }),
    h('div', { class: 'ficha-cab' }, h('div', null,
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, tituloNome),
      c.formula ? h('p', null, formulaEl(c.formula, { grande: true })) : null,
      c.classes?.length ? h('div', { class: 'tags' }, c.classes.map((x) => h('span', { class: 'tag tag-neutro' }, classeRotulo(x)))) : null)),
    h('section', { class: 'secao' }, h('h2', null, t('ui.compostos.dados')), kvEl(itens), fonteEl(c.fontes ?? [{ nome: t('ui.compostos.fontePubchem', { cid: c.cid }), url: `https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}` }])),
    c.smiles ? h('section', { class: 'secao' }, h('h2', null, t('ui.compostos.estrutura')), moleculaEl(c.smiles, nome),
      h('p', { class: 'bloco-fonte' }, t('ui.compostos.desenhada'))) : null,
    h('section', { class: 'secao', id: 'seguranca' }, h('h2', null, t('ui.compostos.seguranca')),
      g ? [ghsEl({ ...g, titulo: t('ui.compostos.classificacaoGhs') }, { grande: true }), fonteEl([fonteGhs(c), fonteFrases].filter(Boolean))]
        : h('p', { class: 'aviso-caixa' }, icon('info', 18), t('ui.compostos.semGhs')),
      h('div', { class: 'resp-acoes' },
        icsc ? h('a', { class: 'btn btn-contorno peq', href: icsc, target: '_blank', rel: 'noopener noreferrer' }, t('ui.compostos.icsc'), icon('external', 14)) : null,
        linkRota('/quimica/seguranca', t('ui.compostos.comoLer'), { class: 'btn btn-texto peq' }))),
    definTexto ? h('section', { class: 'secao' }, h('h2', null, t('ui.compostos.definicao')),
      h('blockquote', { class: 'bloco-texto', lang: idioma === 'en' ? null : 'en' }, definTexto),
      h('p', { class: 'bloco-fonte' }, t('ui.compostos.definicaoFonte'), linkExterno(chebiUrl, chebiId ? t('ui.compostos.chebi', { id: chebiId }) : t('ui.compostos.chebiSem')), ` — ${defin.licenca ?? 'CC BY 4.0'}.`)) : null,
    h('section', { class: 'secao' }, h('h2', null, t('ui.compostos.calcular')),
      h('div', { class: 'resp-acoes' }, c.formula ? linkRota(`/quimica/calculadoras/massa-molar?f=${encodeURIComponent(c.formula)}`, t('ui.compostos.massaMolarDe', { formula: formulaUnicode(c.formula) }), { class: 'btn btn-contorno peq' }) : null,
        linkRota(`/quimica/?q=${encodeURIComponent(t('ui.compostos.perguntaPerigos', { nome: minusNoMeio(nome) }))}`, t('ui.compostos.perguntar'), { class: 'btn btn-contorno peq' }))));
  return { titulo: tituloNome, node: no };
}
