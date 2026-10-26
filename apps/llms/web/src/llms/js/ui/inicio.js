// Tela inicial: o assistente padrão dos apps SaibaTudo (docs/PADRAO_ASSISTENTE.md) em cima e o explorador de embeddings embaixo.
// Campo que cresce e é limpo ao enviar; histórico ↑/↓ só no aparelho; chips de sugestão; resposta com origem e data dos dados, copiar, fechar
// (limpa o contexto), relatar (issue pública com a pergunta no título); aria-live; spinner; "não entendi" com sugestões. As ações da resposta
// (adicionar, analogia, direção, preset, limpar, destacar, irPara) vão para o explorador. O estado vive no módulo para sobreviver à troca de tela.
import { responder, rotuloOrigem, textoParaCopiar } from '../answers.js';
import { anunciar, h, icon } from '../dom.js';
import { criarEstado, deUrl } from '../explorador.js';
import { idiomaAtual, t, tl } from '../i18n/index.js';
import { lexico } from '../nlu/lex/index.js';
import { parse } from '../nlu.js';
import { carregar, registrarPergunta } from '../prefs.js';
import { aoMudarIdioma } from '../app.js';
import { blocoEl, campoAutoAltura, chip, toast } from './componentes.js';
import { montarExplorador } from './explorador.js';

const ISSUES = 'https://github.com/franciscoaleixoIOT/SaibaTudo/issues/new';

let estadoExplorador = null;
let explorador = null;
let contexto = null;      // interpretação da pergunta anterior (continuação)
let ultima = null;        // { pergunta, resposta, parsed }
let registradoIdioma = false;

/** Exposto para a tela Aprenda agir sobre o gráfico. */
export const exploradorAtual = () => explorador;
export function limparUltimaResposta() { ultima = null; contexto = null; }
export const limparEstadoExplorador = () => { estadoExplorador = null; };
/** Gancho da nuvem (nuvem.js): chamado depois de cada resposta local com { ultima, vetores, respostaEl, renderResposta, acrescentar }. */
export const ganchos = { aoResponder: null };

/** Aplica as ações de uma resposta ao explorador (e navegação). */
export function aplicarAcoes(acoes, { navegar }) {
  for (const a of acoes ?? []) {
    if (a.tipo === 'irPara') continue; // vira um botao na resposta (renderResposta): a pessoa escolhe quando abrir a secao
    if (a.tipo === 'destacar') { explorador?.destacar?.(a.indice); continue; }
    explorador?.aplicarAcao(a);
  }
}

export function viewInicio({ vetores, query, navegar }) {
  const titulo = t('ui.inicio.titulo');
  if (!vetores) {
    return { titulo, node: h('div', { class: 'tela-corpo' },
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, titulo),
      h('p', { class: 'aviso-caixa', role: 'alert' }, icon('warning', 18), t('ui.app.erroDados.titulo'))) };
  }
  if (!registradoIdioma) { aoMudarIdioma(() => limparUltimaResposta()); registradoIdioma = true; }
  if (!estadoExplorador) estadoExplorador = query?.has('palavras') ? deUrl(query, vetores) : criarEstado();
  explorador?.destruir?.();
  explorador = montarExplorador({ vetores, estado: estadoExplorador, aoMudar: (novo) => { estadoExplorador = novo; } });

  // ---------------------------------------------------------------- campo e histórico
  let processando = false;
  let posHistorico = -1; let rascunho = '';
  const historico = () => carregar().historicoPerguntas ?? [];
  const campo = campoAutoAltura({ id: 'pergunta', placeholder: t('ui.inicio.placeholder'), 'aria-label': t('ui.inicio.campoRotulo'), autocomplete: 'off', onEnter: () => enviar() });
  campo.addEventListener('input', () => { posHistorico = -1; atualizarBotoes(); });
  campo.addEventListener('keydown', (e) => {
    const lista = historico();
    if (e.key === 'ArrowUp' && campo.selectionStart === 0 && lista.length) { e.preventDefault(); if (posHistorico === -1) rascunho = campo.value; posHistorico = Math.min(lista.length - 1, posHistorico + 1); campo.value = lista[lista.length - 1 - posHistorico]; atualizarUltima(); }
    else if (e.key === 'ArrowDown' && campo.selectionStart === campo.value.length && posHistorico >= 0) { e.preventDefault(); posHistorico -= 1; campo.value = posHistorico === -1 ? rascunho : lista[lista.length - 1 - posHistorico]; atualizarUltima(); }
    atualizarBotoes();
  });
  const botaoLimpar = h('button', { type: 'button', class: 'btn-icone btn-limpar-campo', 'aria-label': t('ui.inicio.limparCampo'), onClick: () => { campo.value = ''; campo.focus(); atualizarBotoes(); } }, icon('x', 18));
  const spinner = h('span', { class: 'spinner peq', role: 'status', 'aria-label': t('ui.inicio.analisando'), hidden: true });
  const botaoEnviar = h('button', { type: 'submit', class: 'btn btn-primario' }, icon('send', 18), t('ui.inicio.enviar'));
  const atualizarBotoes = () => { botaoLimpar.hidden = !campo.value.trim(); botaoEnviar.disabled = processando || !campo.value.trim(); for (const c of chipsSugestoes.querySelectorAll('button')) c.disabled = processando; };
  const form = h('form', { class: 'assistente-form', onSubmit: (e) => { e.preventDefault(); enviar(); } },
    h('label', { class: 'sr-only', for: 'pergunta' }, t('ui.inicio.campoRotulo')),
    h('div', { class: 'assistente-linha' }, campo, botaoLimpar, botaoEnviar, spinner));

  const ultimaEl = h('div', { class: 'ultima-pergunta pequeno mudo' });
  const atualizarUltima = () => {
    const lista = historico();
    if (!lista.length) { ultimaEl.replaceChildren(); return; }
    const atual = posHistorico >= 0 ? lista[lista.length - 1 - posHistorico] : lista[lista.length - 1];
    ultimaEl.replaceChildren(
      h('span', null, `${t('ui.inicio.ultimaPergunta')}: `), h('button', { type: 'button', class: 'link', onClick: () => { campo.value = atual; campo.focus(); atualizarBotoes(); } }, atual), ' ',
      h('button', { type: 'button', class: 'btn-icone mini', 'aria-label': t('ui.inicio.anterior'), disabled: posHistorico >= lista.length - 1, onClick: () => { posHistorico = Math.min(lista.length - 1, posHistorico + 1); campo.value = lista[lista.length - 1 - posHistorico]; atualizarUltima(); atualizarBotoes(); } }, '▲'),
      h('button', { type: 'button', class: 'btn-icone mini', 'aria-label': t('ui.inicio.proxima'), disabled: posHistorico <= 0, onClick: () => { posHistorico -= 1; campo.value = lista[lista.length - 1 - posHistorico]; atualizarUltima(); atualizarBotoes(); } }, '▼'));
  };

  // ---------------------------------------------------------------- sugestões e resposta
  const chipsSugestoes = h('div', { class: 'chips' });
  const renderSugestoes = (lista) => chipsSugestoes.replaceChildren(...lista.map((s) => chip({ rotulo: s, icone: 'sparkles', classe: 'sug', onClick: () => enviar(s) })));
  const respostaEl = h('section', { class: 'cartao-resposta', 'aria-live': 'polite', 'aria-label': t('ui.inicio.respostaAria') });

  function renderResposta() {
    if (!ultima) { respostaEl.replaceChildren(); respostaEl.hidden = true; return; }
    const { pergunta, resposta: r } = ultima;
    const copiar = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: async () => { try { await navigator.clipboard.writeText(textoParaCopiar(r, pergunta)); toast(t('ui.inicio.copiado')); } catch { /* sem clipboard */ } } }, icon('copy', 16), t('ui.inicio.copiar'));
    const fechar = h('button', { type: 'button', class: 'btn-icone', 'aria-label': t('ui.inicio.fechar'), onClick: () => { limparUltimaResposta(); renderResposta(); renderSugestoes(tl('respostas.sugestoes.padrao')); campo.focus(); } }, icon('x', 18));
    const issue = `${ISSUES}?title=${encodeURIComponent(`[llms] ${pergunta.slice(0, 120)}`)}&body=${encodeURIComponent(`${t('respostas.copiar.pergunta')} ${pergunta}\n\n${r.titulo}\n${rotuloOrigem(r)}\n${idiomaAtual()} · ${location.href}`)}`;
    const relatar = h('a', { class: 'btn btn-contorno peq', href: issue, target: '_blank', rel: 'noopener noreferrer', title: t('ui.inicio.relatarAjuda') }, icon('github', 16), t('ui.inicio.relatar'));
    // replaceChildren converte null em texto "null": filtra os ramos condicionais
    respostaEl.replaceChildren(...[
      h('div', { class: 'resposta-topo' }, h('h2', { id: 'titulo-resposta', tabindex: '-1' }, r.titulo), fechar),
      h('p', { class: 'resposta-pergunta mudo pequeno' }, pergunta),
      ...r.blocos.map(blocoEl).filter(Boolean),
      r.gerado ? h('div', { class: 'bloco bloco-gerado' }, h('p', { class: 'bloco-texto' }, r.gerado.texto), h('p', { class: 'mini mudo' }, rotuloOrigem({ origem: 'GENERATIVA', modelo: r.gerado.modelo }))) : null,
      h('p', { class: 'resposta-origem mini mudo' }, icon('verified', 14), ' ', rotuloOrigem(r)),
      h('div', { class: 'resposta-acoes' }, ...r.acoes.filter((a) => a.tipo === 'irPara').map((a) => h('a', { class: 'btn btn-primario peq', href: a.rota }, icon('book', 16), t('ui.inicio.abrir'))), copiar, relatar, ...(r.extras ?? [])),
      r.sugestoes?.length ? h('div', null, h('p', { class: 'pequeno mudo' }, t('ui.inicio.sugestoesTitulo')), h('div', { class: 'chips' }, r.sugestoes.map((s) => chip({ rotulo: s, icone: 'sparkles', classe: 'sug', onClick: () => enviar(s) })))) : null
    ].filter(Boolean));
    respostaEl.hidden = false;
  }

  function enviar(texto = campo.value) {
    const q = String(texto ?? '').trim();
    if (!q || processando) return;
    processando = true;
    campo.value = ''; posHistorico = -1; rascunho = '';
    spinner.hidden = false; atualizarBotoes();
    anunciar(t('ui.inicio.analisando'));
    registrarPergunta(q); atualizarUltima();
    try {
      const idioma = idiomaAtual();
      const parsed = parse(q, lexico(idioma), { vetores, idioma, contexto });
      const r = responder(parsed, { vetores, estado: estadoExplorador, idioma });
      contexto = ['DESCONHECIDA', 'SAUDACAO', 'AJUDA', 'SOBRE_DADOS', 'FONTES', 'LIMPAR'].includes(parsed.intencao) ? null : parsed;
      ultima = { pergunta: q, resposta: r, parsed };
      aplicarAcoes(r.acoes, { navegar });
      renderResposta();
      ganchos.aoResponder?.({ ultima, vetores, estado: estadoExplorador, respostaEl, renderResposta, acrescentar: (campos) => { if (ultima) { Object.assign(ultima.resposta, campos); renderResposta(); } } });
      requestAnimationFrame(() => { respostaEl.querySelector('#titulo-resposta')?.focus({ preventScroll: false }); anunciar(r.titulo); });
    } finally {
      processando = false; spinner.hidden = true; atualizarBotoes();
    }
  }

  renderSugestoes(tl('respostas.sugestoes.padrao'));
  atualizarUltima(); atualizarBotoes(); renderResposta();
  const deep = query?.get('q');
  if (deep && !ultima) setTimeout(() => enviar(deep), 0);

  return { titulo, node: h('div', { class: 'tela-corpo' },
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, titulo),
    h('p', { class: 'sub-pagina' }, t('ui.inicio.subtitulo')),
    h('div', { class: 'assistente' }, form, ultimaEl, chipsSugestoes, respostaEl),
    explorador.node) };
}
