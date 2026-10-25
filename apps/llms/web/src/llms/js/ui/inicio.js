// Tela inicial: o explorador de embeddings (o assistente padrão entra na tarefa seguinte, acima do explorador).
// O estado do explorador vive aqui (módulo) para sobreviver à troca de tela e vem do endereço (?palavras=…&modo=…) na primeira abertura.
import { h, icon } from '../dom.js';
import { criarEstado, deUrl } from '../explorador.js';
import { t } from '../i18n/index.js';
import { montarExplorador } from './explorador.js';

let estadoExplorador = null;
let explorador = null;

/** Exposto para o assistente (answers.js) agir sobre o gráfico. */
export const exploradorAtual = () => explorador;
export const limparEstadoExplorador = () => { estadoExplorador = null; };

export function viewInicio({ vetores, query }) {
  const titulo = t('ui.inicio.titulo');
  if (!vetores) {
    return { titulo, node: h('div', { class: 'tela-corpo' },
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, titulo),
      h('p', { class: 'aviso-caixa', role: 'alert' }, icon('warning', 18), t('ui.app.erroDados.titulo'))) };
  }
  if (!estadoExplorador) estadoExplorador = query?.has('palavras') ? deUrl(query, vetores) : criarEstado();
  explorador?.destruir?.();
  explorador = montarExplorador({ vetores, estado: estadoExplorador, aoMudar: (novo) => { estadoExplorador = novo; } });
  return { titulo, node: h('div', { class: 'tela-corpo' },
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, titulo),
    h('p', { class: 'sub-pagina' }, t('ui.inicio.subtitulo')),
    explorador.node) };
}
