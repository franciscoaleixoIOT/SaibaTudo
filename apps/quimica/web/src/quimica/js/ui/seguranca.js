// Segurança: página explicativa (GHS, pictogramas, frases H, boas práticas) com links para fontes oficiais. Não copia fichas de segurança.
import { orientacaoGeral } from '../answers.js';
import { buscarCompostos } from '../busca.js';
import { h, icon } from '../dom.js';
import { idiomaAtual, nomeDoIdioma, t, tl } from '../i18n/index.js';
import { nomeCompostoExibicao } from '../nomes.js';
import { CODIGOS_PICTOGRAMA, FRASES_H, descricaoPictograma, fraseHInfo, gruposFrasesH, nomePictograma, urlPictograma } from '../perigos.js';
import { normalizar } from '../texto.js';
import { formulaEl, linkExterno, linkRota } from './componentes.js';
import { comExibicao } from './compostos.js';

export function viewSeguranca({ store }) {
  const idioma = idiomaAtual();
  const filtro = h('input', { id: 'filtro-h', class: 'campo', type: 'search', placeholder: t('ui.seguranca.placeholderFiltro'), autocomplete: 'off' });
  const lista = h('ul', { class: 'frases-h', 'aria-label': t('ui.componentes.frasesAria') });
  const sem = h('p', { class: 'vazio', hidden: true }, t('ui.seguranca.nenhumaFrase'));
  // frases H: as do pacote no idioma (ghs_frases.json, CLP) ou as pt-BR do app, rotuladas quando não estão no idioma
  const codigos = [...new Set([...Object.keys(FRASES_H), ...Object.keys(store.regras?.frasesHPorIdioma?.[idioma] ?? {})])].sort();
  const frases = codigos.map((c) => [c, fraseHInfo(c, store.regras, idioma)]).filter(([, i]) => i);
  function atualizarH() {
    const q = normalizar(filtro.value);
    const achadas = frases.filter(([c, i]) => !q || normalizar(c).includes(q) || normalizar(i.texto).includes(q));
    lista.replaceChildren(...achadas.map(([c, i]) => h('li', null, h('span', { class: 'cod' }, c), h('span', { lang: i.idioma !== idioma ? i.idioma : null }, i.texto, i.idioma !== idioma ? h('span', { class: 'mudo mini' }, ` ${t('ui.componentes.fraseEmIdioma', { idioma: nomeDoIdioma(i.idioma) })}`) : null))));
    sem.hidden = achadas.length > 0;
  }
  filtro.addEventListener('input', atualizarH);
  atualizarH();

  const busca = h('input', { id: 'busca-seg', class: 'campo', type: 'search', placeholder: t('ui.seguranca.placeholderBusca'), autocomplete: 'off' });
  const resultados = h('ul', { class: 'lista-resultados' });
  let seq = 0;
  busca.addEventListener('input', async () => {
    const meu = ++seq;
    const achados = await comExibicao(store, buscarCompostos(store.indice.entradas, busca.value, 8));
    if (meu !== seq) return;
    resultados.replaceChildren(...achados.map((c) => h('li', null, linkRota(`/quimica/composto/${c.cid}#seguranca`, [h('strong', null, nomeCompostoExibicao(c), c.formula ? [' — ', formulaEl(c.formula)] : null), h('span', { class: 'sub' }, t('ui.seguranca.verPictogramas'))], { class: 'item-res' }))));
  });

  const links = tl('ui.seguranca.links');
  const no = h('div', null,
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.seguranca.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.seguranca.intro')),
    h('p', { class: 'aviso-caixa' }, icon('shield', 18), t('ui.seguranca.aviso')),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.verPerigos')),
      h('label', { class: 'sr-only', for: 'busca-seg' }, t('ui.seguranca.buscar')), busca, resultados),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.pictogramas')),
      h('p', { class: 'sub-pagina' }, t('ui.seguranca.pictogramasIntro')),
      h('ul', { class: 'ghs-pictos' }, CODIGOS_PICTOGRAMA.map((c) => h('li', { class: 'picto grande' },
        h('img', { src: urlPictograma(c), alt: `${c}: ${nomePictograma(c)}`, width: '112', height: '112', loading: 'lazy' }),
        h('strong', null, `${c} — ${nomePictograma(c)}`), h('span', null, descricaoPictograma(c)))))),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.palavraSinal')),
      h('p', null, h('span', { class: 'sinal perigo' }, t('ui.seguranca.perigo')), t('ui.seguranca.sinalTexto1'), h('span', { class: 'sinal atencao' }, t('ui.seguranca.atencao')), t('ui.seguranca.sinalTexto2'))),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.comoLer')),
      h('p', null, t('ui.seguranca.frasesIntro')),
      h('ul', { class: 'lista-pontos' }, gruposFrasesH().map((g) => h('li', null, h('strong', null, `${g.faixa}: ${g.titulo}`), `, ${g.descricao}`))),
      h('p', { class: 'pequeno mudo' }, t('ui.seguranca.codigosSomados')),
      h('label', { class: 'rotulo-campo', for: 'filtro-h' }, t('ui.seguranca.procurarFrase')), filtro, lista, sem),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.boasPraticas')), h('ul', { class: 'lista-pontos' }, orientacaoGeral().map((x) => h('li', null, x)))),
    h('section', { class: 'secao' }, h('h2', null, t('ui.seguranca.fontesOficiais')),
      h('ul', { class: 'lista-pontos' }, links.map(([nome, url, nota]) => h('li', null, linkExterno(url, nome), ` — ${nota}`)))));
  return { titulo: t('ui.seguranca.titulo'), node: no };
}
