// Tabela periódica interativa (grade CSS) gerada de elementos.json: cores por categoria, filtros e busca. Tocar num elemento abre a ficha.
import { CATEGORIAS, categoriaRotulo, estadoChave, estadoRotulo } from '../propriedades.js';
import { buscarElementos } from '../busca.js';
import { h } from '../dom.js';
import { fmt } from '../formato.js';
import { t } from '../i18n/index.js';
import { nomeElementoExibicao } from '../nomes.js';
import { capitalizar, normalizar } from '../texto.js';
import { chip } from './componentes.js';

/** Posição na grade: [linha, coluna]. Lantanídeos e actinídeos ficam nas linhas 9 e 10. */
export function posicao(e) {
  if (e.z >= 57 && e.z <= 71) return [9, 3 + (e.z - 57)];
  if (e.z >= 89 && e.z <= 103) return [10, 3 + (e.z - 89)];
  if (Number.isInteger(e.periodo) && Number.isInteger(e.grupo)) return [e.periodo, e.grupo];
  return null;
}

export const rotuloElemento = (e) => t('ui.tabela.rotuloElemento', { nome: capitalizar(nomeElementoExibicao(e)), simbolo: e.simbolo, z: e.z, categoria: categoriaRotulo(e.categoria), estado: estadoRotulo(e.estadoPadrao) });

export function viewTabela({ store, query, navegar }) {
  const els = store.elementos;
  const estado = { q: query.get('q') ?? '', bloco: query.get('bloco') ?? '', periodo: query.get('periodo') ?? '', grupo: query.get('grupo') ?? '', estado: query.get('estado') ?? '', categoria: query.get('categoria') ?? '' };
  const ESTADOS = [['', t('ui.tabela.todos')], ['solido', t('ui.tabela.estados.solido')], ['liquido', t('ui.tabela.estados.liquido')], ['gas', t('ui.tabela.estados.gas')]];

  const campoQ = h('input', { id: 'tp-q', class: 'campo', type: 'search', value: estado.q, placeholder: t('ui.tabela.placeholder'), autocomplete: 'off', onInput: (e) => { estado.q = e.target.value; aplicar(); } });
  const seletor = (id, rotulo, opcoes, chave) => h('div', null, h('label', { for: id }, rotulo),
    h('select', { id, class: 'campo', onChange: (e) => { estado[chave] = e.target.value; aplicar(); } }, opcoes.map(([v, r]) => h('option', { value: v, selected: String(estado[chave]) === String(v) }, r))));
  const gruposDisp = [...new Set(els.map((e) => e.grupo).filter(Number.isInteger))].sort((a, b) => a - b);
  const periodosDisp = [...new Set(els.map((e) => e.periodo).filter(Number.isInteger))].sort((a, b) => a - b);
  const barra = h('div', { class: 'tp-barra', role: 'group', 'aria-label': t('ui.tabela.filtrosAria') },
    h('div', null, h('label', { for: 'tp-q' }, t('ui.tabela.buscar')), campoQ),
    seletor('tp-bloco', t('ui.tabela.bloco'), [['', t('ui.tabela.todos')], ...['s', 'p', 'd', 'f'].map((b) => [b, t('ui.tabela.blocoN', { b })])], 'bloco'),
    seletor('tp-periodo', t('ui.tabela.periodo'), [['', t('ui.tabela.todos')], ...periodosDisp.map((p) => [String(p), t('ui.tabela.periodoN', { p })])], 'periodo'),
    seletor('tp-grupo', t('ui.tabela.grupo'), [['', t('ui.tabela.todos')], ...gruposDisp.map((g) => [String(g), t('ui.tabela.grupoN', { g })])], 'grupo'),
    seletor('tp-estado', t('ui.tabela.estado'), ESTADOS, 'estado'),
    h('button', { class: 'btn btn-texto peq', type: 'button', onClick: limpar }, t('ui.tabela.limpar')));

  const legenda = h('div', { class: 'legenda', role: 'group', 'aria-label': t('ui.tabela.legendaAria') });
  const contagem = h('p', { class: 'tp-contagem', role: 'status', 'aria-live': 'polite' });
  const grade = h('div', { class: 'tp-grade' });
  const celulas = new Map();

  for (const e of els) {
    const pos = posicao(e);
    if (!pos) continue;
    const nome = capitalizar(nomeElementoExibicao(e));
    const b = h('button', {
      type: 'button', class: `el cat-${e.categoria} g${pos[1]} p${pos[0]}`, 'aria-label': rotuloElemento(e), 'data-simbolo': e.simbolo,
      onClick: () => navegar(`/quimica/elemento/${encodeURIComponent(e.simbolo)}`)
    }, h('span', { class: 'z', 'aria-hidden': 'true' }, String(e.z)), h('span', { class: 's', 'aria-hidden': 'true' }, e.simbolo), h('span', { class: 'n', 'aria-hidden': 'true' }, nome));
    b.title = `${nome}${e.massaAtomica != null ? ` — ${fmt(e.massaAtomica, { sig: 7 })} u` : ''}`;
    celulas.set(e.simbolo, b);
    grade.append(b);
  }
  if (els.some((e) => e.z >= 57 && e.z <= 71)) grade.append(h('div', { class: 'marca-fblock g3 p6', 'aria-hidden': 'true' }, '57–71'));
  if (els.some((e) => e.z >= 89 && e.z <= 103)) grade.append(h('div', { class: 'marca-fblock g3 p7', 'aria-hidden': 'true' }, '89–103'));

  function atualizarLegenda() {
    legenda.replaceChildren(...CATEGORIAS.filter((c) => els.some((e) => e.categoria === c)).map((c) => chip({
      rotulo: categoriaRotulo(c), selecionado: estado.categoria === c, icone: false, cor: `var(--cat-${c})`,
      onClick: () => { estado.categoria = estado.categoria === c ? '' : c; aplicar(); }
    })));
  }

  function casa(e) {
    if (estado.bloco && e.bloco !== estado.bloco) return false;
    if (estado.periodo && String(e.periodo) !== estado.periodo) return false;
    if (estado.grupo && String(e.grupo) !== estado.grupo) return false;
    if (estado.estado && estadoChave(e.estadoPadrao) !== estado.estado) return false;
    if (estado.categoria && e.categoria !== estado.categoria) return false;
    return true;
  }

  function aplicar() {
    const porTexto = new Set(buscarElementos(els, estado.q).map((e) => e.simbolo));
    let n = 0;
    for (const e of els) {
      const ok = casa(e) && (!normalizar(estado.q) || porTexto.has(e.simbolo));
      celulas.get(e.simbolo)?.classList.toggle('apagado', !ok);
      if (ok) n++;
    }
    contagem.textContent = n === els.length ? t('ui.tabela.contagemTodos', { n: els.length }) : t('ui.tabela.contagemFiltro', { n, total: els.length });
    atualizarLegenda();
    const qs = new URLSearchParams(Object.entries(estado).filter(([, v]) => v));
    try { history.replaceState(history.state, '', `${location.pathname}${qs.size ? `?${qs}` : ''}`); } catch { /* ignorado */ }
  }

  function limpar() {
    for (const k of Object.keys(estado)) estado[k] = '';
    campoQ.value = '';
    for (const id of ['tp-bloco', 'tp-periodo', 'tp-grupo', 'tp-estado']) { const s = barra.querySelector(`#${id}`); if (s) s.value = ''; }
    aplicar();
  }

  const no = h('div', null,
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.tabela.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.tabela.intro')),
    barra, legenda, contagem,
    h('div', { class: 'tp-rolagem', role: 'region', 'aria-label': t('ui.tabela.regiaoAria'), tabindex: '0' }, grade),
    els.length ? null : h('p', { class: 'vazio' }, t('ui.tabela.vazio')));
  aplicar();
  return { titulo: t('ui.tabela.titulo'), node: no };
}
