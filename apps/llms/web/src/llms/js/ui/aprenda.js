// Tela "Aprenda": índice das seis seções e a seção aberta, com "Experimente" (ações no explorador) e referências acadêmicas.
import { REFERENCIAS, secao, secoes } from '../conteudo/index.js';
import { h, icon } from '../dom.js';
import { idiomaAtual, t } from '../i18n/index.js';
import { linkExterno } from './componentes.js';
import { exploradorAtual } from './inicio.js';

/** Texto com **negrito** simples → nós (sem innerHTML). */
export function marcacao(texto) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return partes.map((p) => (p.startsWith('**') && p.endsWith('**') ? h('strong', null, p.slice(2, -2)) : p));
}

/** Ação do "Experimente" (palavras em inglês) → ação do explorador (índices), aplicada depois de ir ao início. */
export async function agir(acao, { vetores, navegar }) {
  if (acao.tipo === 'irPara') { await navegar(acao.rota); return; }
  await navegar('/llms/');
  const ex = exploradorAtual();
  if (!ex || !vetores) return;
  const i = (w) => vetores.indice(w);
  if (acao.tipo === 'preset') ex.aplicarAcao({ tipo: 'preset', id: acao.id });
  else if (acao.tipo === 'analogia') ex.aplicarAcao({ tipo: 'analogia', a: i(acao.a), b: i(acao.b), c: i(acao.c) });
  else if (acao.tipo === 'direcao') ex.aplicarAcao({ tipo: 'direcao', w1: i(acao.w1), w2: i(acao.w2), lista: (acao.lista ?? []).map(i).filter((k) => k >= 0) });
  else if (acao.tipo === 'modo') ex.aplicarAcao({ tipo: 'modo', modo: acao.modo });
}

export function viewAprenda({ vetores, params, navegar }) {
  const idioma = idiomaAtual();
  const lista = secoes(idioma);
  const atual = params?.secao ? secao(idioma, params.secao) : null;
  const indice = h('ol', { class: 'indice-secoes' }, lista.map((s, k) => h('li', null,
    h('a', { href: `/llms/aprenda/${s.id}`, 'aria-current': atual?.id === s.id ? 'page' : null }, h('span', { class: 'num' }, String(k + 1)), h('span', null, h('strong', null, s.titulo), h('span', { class: 'mudo pequeno' }, ' ', s.resumo))))));
  if (!atual) {
    return { titulo: t('ui.aprenda.titulo'), node: h('div', { class: 'tela-corpo' },
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.aprenda.titulo')),
      h('p', { class: 'sub-pagina' }, t('ui.aprenda.subtitulo')),
      indice,
      h('p', { class: 'mini mudo' }, t('ui.aprenda.autoria'))) };
  }
  const pos = lista.findIndex((s) => s.id === atual.id);
  const anterior = lista[pos - 1]; const proxima = lista[pos + 1];
  const node = h('article', { class: 'tela-corpo secao-aprenda' },
    h('p', { class: 'mini mudo' }, t('ui.aprenda.secaoN', { n: pos + 1, total: lista.length })),
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, atual.titulo),
    h('p', { class: 'sub-pagina' }, atual.resumo),
    atual.paragrafos.map((p) => h('p', { class: 'paragrafo' }, marcacao(p))),
    h('div', { class: 'grupo' }, t('ui.aprenda.experimente')),
    h('ul', { class: 'lista-experimente' }, atual.experimente.map((e) => h('li', null,
      h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: () => agir(e.acao, { vetores, navegar }) }, icon('sparkles', 16), t('ui.aprenda.abrir')),
      ' ', h('span', null, e.texto)))),
    h('div', { class: 'grupo' }, t('ui.aprenda.referencias')),
    h('ul', { class: 'lista-pontos pequeno' }, atual.referencias.map((r) => h('li', null, REFERENCIAS[r].texto, ' ', linkExterno(REFERENCIAS[r].url, t('ui.aprenda.link'))))),
    h('nav', { class: 'nav-secoes', 'aria-label': t('ui.aprenda.navegacao') },
      anterior ? h('a', { class: 'btn btn-contorno peq', href: `/llms/aprenda/${anterior.id}` }, icon('back', 16), anterior.titulo) : h('span'),
      proxima ? h('a', { class: 'btn btn-primario peq', href: `/llms/aprenda/${proxima.id}` }, proxima.titulo, icon('forward', 16)) : h('a', { class: 'btn btn-primario peq', href: '/llms/' }, t('ui.aprenda.irExplorar'))),
    h('details', { class: 'indice-dobravel' }, h('summary', null, t('ui.aprenda.indice')), indice));
  return { titulo: atual.titulo, node };
}
