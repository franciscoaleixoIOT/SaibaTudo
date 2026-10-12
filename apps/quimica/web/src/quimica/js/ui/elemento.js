// Ficha do elemento: todos os campos do pacote, com unidades legíveis (K também em °C, kg/m³ também em g/cm³) e fontes. Nome no idioma ativo (nomes.js).
import { tentarFormula } from '../calc/formula.js';
import { h, icon } from '../dom.js';
import { fmt } from '../formato.js';
import { idiomaAtual, t } from '../i18n/index.js';
import { minusNoMeio, nomeCompostoExibicao, nomeElementoExibicao } from '../nomes.js';
import { formatarValor, tabelaDePropriedades, valorBruto, categoriaRotulo, estadoRotulo } from '../propriedades.js';
import { capitalizar } from '../texto.js';
import { fonteEl, formulaEl, kvEl, linkRota } from './componentes.js';

export function viewElemento({ store, params }) {
  const simbolo = decodeURIComponent(params.simbolo ?? '');
  const e = store.porSimbolo.get(simbolo) ?? store.elementos.find((x) => String(x.z) === simbolo || x.simbolo.toLowerCase() === simbolo.toLowerCase());
  if (!e) {
    return { titulo: t('ui.elemento.naoEncontrado'), status: 404, node: h('div', null,
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.elemento.naoEncontrado')),
      h('p', { class: 'sub-pagina' }, t('ui.elemento.naoHa', { simbolo })), linkRota('/quimica/tabela', t('ui.elemento.abrirTabela'), { class: 'btn btn-primario' })) };
  }
  const idioma = idiomaAtual();
  const nome = capitalizar(nomeElementoExibicao(e));
  const props = tabelaDePropriedades(store.regras).filter((p) => p.alvo === 'elemento');
  const itens = [];
  if (idioma !== 'en' && (e.nomes?.en ?? e.nomeEn)) itens.push({ rotulo: t('ui.elemento.nomeEmIngles'), valor: e.nomes?.en ?? e.nomeEn });
  for (const p of props) {
    if (p.id === 'simbolo') continue;
    const f = formatarValor(p, valorBruto(p, e), store.ctx);
    if (f) itens.push({ rotulo: capitalizar(p.rotulo), valor: f.texto });
  }
  if (e.massaAtomicaIncerteza != null) itens.push({ rotulo: t('ui.elemento.incerteza'), valor: fmt(e.massaAtomicaIncerteza, { sig: 3 }) });

  const idx = store.elementos.findIndex((x) => x.z === e.z);
  const ant = store.elementos[idx - 1];
  const prox = store.elementos[idx + 1];
  const nomeDe = (x) => capitalizar(nomeElementoExibicao(x));

  // compostos do índice que contêm o elemento
  // (só quando o índice traz fórmulas; com o índice do pipeline, que só tem chaves de busca, a busca de compostos faz esse papel)
  const comEle = store.indice.temNomes ? store.indice.entradas.filter((c) => c.formula && tentarFormula(c.formula)?.atomos.has(e.simbolo)).slice(0, 36) : [];

  const no = h('div', null,
    linkRota('/quimica/tabela', [icon('back', 16), ` ${t('ui.elemento.voltar')}`], { class: 'voltar' }),
    h('div', { class: 'ficha-cab' },
      h('div', { class: `el-grande cat-${e.categoria}`, 'aria-hidden': 'true' }, h('span', { class: 'z' }, String(e.z)), h('span', { class: 's' }, e.simbolo), h('span', { class: 'm' }, e.massaAtomica != null ? fmt(e.massaAtomica, { sig: 7 }) : '')),
      h('div', null,
        h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, `${nome} (${e.simbolo})`),
        h('p', { class: 'sub-pagina' }, t('ui.elemento.sub', { z: e.z, categoria: categoriaRotulo(e.categoria), estado: estadoRotulo(e.estadoPadrao) })))),
    h('section', { class: 'secao' }, h('h2', null, t('ui.elemento.propriedades')), kvEl(itens), fonteEl(e.fontes)),
    !comEle.length && store.indice.entradas.length ? h('section', { class: 'secao' }, h('h2', null, t('ui.elemento.compostosCom', { nome })),
      linkRota(`/quimica/compostos?q=${encodeURIComponent(minusNoMeio(nome).toLowerCase())}`, t('ui.elemento.buscarCompostosDe', { nome: minusNoMeio(nome) }), { class: 'btn btn-contorno peq' })) : null,
    comEle.length ? h('section', { class: 'secao' }, h('h2', null, t('ui.elemento.compostosCom', { nome })),
      h('div', { class: 'lista-links' }, comEle.map((c) => linkRota(`/quimica/composto/${c.cid}`, [nomeCompostoExibicao(c), ' ', h('span', { class: 'mudo' }, '('), formulaEl(c.formula), h('span', { class: 'mudo' }, ')')]))),
      store.indice.entradas.length > comEle.length ? h('p', { class: 'pequeno mudo' }, t('ui.elemento.mostrando', { n: comEle.length })) : null) : null,
    h('div', { class: 'nav-el' },
      ant ? linkRota(`/quimica/elemento/${encodeURIComponent(ant.simbolo)}`, [icon('back', 16), ` ${nomeDe(ant)} (${ant.z})`], { class: 'btn btn-contorno peq' }) : h('span'),
      prox ? linkRota(`/quimica/elemento/${encodeURIComponent(prox.simbolo)}`, [`${nomeDe(prox)} (${prox.z}) `, icon('forward', 16)], { class: 'btn btn-contorno peq' }) : h('span')),
    h('section', { class: 'secao' }, h('h2', null, t('ui.elemento.calcular')),
      linkRota(`/quimica/calculadoras/massa-molar?f=${encodeURIComponent(e.simbolo)}`, t('ui.elemento.massaMolarDe', { nome }), { class: 'btn btn-contorno peq' })));
  return { titulo: `${nome} (${e.simbolo})`, node: no };
}
