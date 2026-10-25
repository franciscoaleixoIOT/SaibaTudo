// Tela inicial. Nesta etapa (casca) só apresenta o app; o explorador e o assistente entram nas tarefas seguintes.
import { h } from '../dom.js';
import { t } from '../i18n/index.js';

export function viewInicio() {
  return { titulo: t('ui.inicio.titulo'), node: h('div', { class: 'tela-corpo' },
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.inicio.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.inicio.subtitulo'))) };
}
