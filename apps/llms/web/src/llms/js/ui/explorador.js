// Tela do explorador de embeddings: cena 3D (cena3d.js) + painel (chips das palavras, campo com sugestões, modo 3 dimensões / PCA, diferenças,
// presets, tabela de coordenadas, vizinhos da palavra destacada, analogia a − b + c e direção w1 − w2 contra uma lista). O estado é o de
// explorador.js (puro); esta tela só liga DOM e estado e grava o estado no endereço (?palavras=…&modo=…). Todo número passa por fmtNumero.
import { Cena3D } from '../cena3d.js';
import { h, icon } from '../dom.js';
import { MAX_PALAVRAS, adicionar, alternarModo, cenaDe, definirAnalogia, definirDirecao, limpar, paraUrl, remover } from '../explorador.js';
import { fmtNumero, idiomaAtual, t } from '../i18n/index.js';
import { temaEfetivo } from '../prefs.js';
import { chip, novoId, tabelaEl, toast } from './componentes.js';

const COORD = { casas: 2 };
const COS = { casas: 3 };
const reduzirMovimento = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Monta o explorador. `aoMudar(estadoNovo)` é chamado a cada mudança; o chamador guarda o estado e chama `atualizar(estado)`.
 * @returns {{ node: HTMLElement, atualizar: (estado) => void, aplicarAcao: (acao) => void, destruir: () => void }}
 */
export function montarExplorador({ vetores, estado, aoMudar }) {
  let atual = estado;
  const emitir = (novo) => { atual = novo; aoMudar?.(novo); atualizar(novo); };

  // ---------------------------------------------------------------- resolução de palavras digitadas
  /** Texto → índices (aceita vírgulas/espaços; glossário do idioma; avisa o que não achou). */
  const resolver = (texto) => {
    const indices = []; const avisos = [];
    for (const bruto of String(texto).split(/[,\s;]+/).map((x) => x.trim()).filter(Boolean)) {
      let i = vetores.indice(bruto);
      if (i < 0) {
        const trad = vetores.sugerirTraduzindo(bruto, idiomaAtual());
        if (trad) { i = vetores.indice(trad.en); toast(t('ui.explorador.traduzida', { original: bruto, en: trad.en })); }
      }
      if (i >= 0) indices.push(i);
      else avisos.push(bruto);
    }
    return { indices, avisos };
  };

  const adicionarTexto = (texto) => {
    const { indices, avisos } = resolver(texto);
    const r = adicionar(atual, indices);
    if (r.recusadas.length) toast(t('ui.explorador.avisoLimite', { n: MAX_PALAVRAS }));
    if (avisos.length) {
      const sug = vetores.sugerir(avisos[0], 5);
      naoEncontrada.replaceChildren(h('span', null, t('ui.explorador.naoEncontrada', { palavra: avisos[0] })), ' ', ...sug.map((w) => chip({ rotulo: w, onClick: () => { naoEncontrada.replaceChildren(); adicionarTexto(w); } })));
    } else naoEncontrada.replaceChildren();
    emitir(r.estado);
  };

  // ---------------------------------------------------------------- cena
  const canvas = h('canvas', { class: 'cena3d', role: 'img', tabindex: '0', 'aria-label': t('ui.explorador.graficoAria'), 'aria-describedby': 'tabela-coords' });
  const legendaEixos = h('p', { class: 'pequeno mudo', id: 'eixos-legenda' });
  const aviso = h('p', { class: 'aviso-caixa discreto', hidden: true });
  const cena = new Cena3D(canvas, { tema: temaEfetivo, reduzirMovimento: reduzirMovimento(), aoDestacar: (k) => destacarPonto(k) });

  // ---------------------------------------------------------------- painel: palavras
  const chips = h('div', { class: 'chips', 'aria-label': t('ui.explorador.palavrasAria') });
  const naoEncontrada = h('div', { class: 'pequeno', role: 'status' });
  const idCampo = novoId('palavra');
  const lista = h('datalist', { id: `${idCampo}-sug` });
  const campo = h('input', { id: idCampo, type: 'text', class: 'campo', list: lista.id, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: t('ui.explorador.adicionarPlaceholder'),
    onInput: () => { const v = campo.value.trim(); lista.replaceChildren(...(v.length >= 2 ? vetores.sugerir(v, 8).map((w) => h('option', { value: w })) : [])); },
    onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); if (campo.value.trim()) { adicionarTexto(campo.value); campo.value = ''; lista.replaceChildren(); } } } });
  const botaoAdicionar = h('button', { type: 'button', class: 'btn btn-primario peq', onClick: () => { if (campo.value.trim()) { adicionarTexto(campo.value); campo.value = ''; } } }, icon('plus', 16), t('ui.explorador.botaoAdicionar'));
  const botaoLimpar = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: () => emitir(limpar()) }, icon('trash', 16), t('ui.explorador.limpar'));
  const botaoModo = h('button', { type: 'button', class: 'btn btn-contorno peq', 'aria-pressed': 'false', onClick: () => emitir(alternarModo(atual)) });
  const chaveDiferencas = h('label', { class: 'chave' }, h('input', { type: 'checkbox', onChange: (e) => emitir({ ...atual, diferencas: e.target.checked }) }), h('span', null, t('ui.explorador.diferencas')));

  // presets
  const presets = h('div', { class: 'chips' }, Object.keys(vetores.presets).map((id) => chip({ rotulo: t(`ui.presets.${id}.nome`), icone: 'sparkles', title: t(`ui.presets.${id}.nota`), onClick: () => aplicarPreset(id) })));
  const notaPreset = h('p', { class: 'pequeno mudo', role: 'status' });
  const aplicarPreset = (id) => {
    const indices = (vetores.presets[id] ?? []).map((w) => vetores.indice(w)).filter((i) => i >= 0);
    notaPreset.textContent = t(`ui.presets.${id}.nota`);
    emitir({ ...limpar(), modo: atual.modo, palavras: adicionar(limpar(), indices).estado.palavras });
  };

  // tabela, vizinhos
  const tabela = h('div', { id: 'tabela-coords' });
  const vizinhos = h('div', { class: 'bloco' });

  // analogia
  const sel = (nome) => h('select', { class: 'campo peq', 'aria-label': nome });
  const selA = sel(t('ui.explorador.analogiaA')); const selB = sel(t('ui.explorador.analogiaB')); const selC = sel(t('ui.explorador.analogiaC'));
  const resultadoAnalogia = h('div', { class: 'pequeno', role: 'status' });
  const botaoAnalogia = h('button', { type: 'button', class: 'btn btn-primario peq', onClick: () => {
    const [a, b, c] = [selA, selB, selC].map((s) => Number(s.value));
    const novo = definirAnalogia(atual, a, b, c);
    if (!novo.analogia) { toast(t('ui.explorador.analogiaInvalida')); return; }
    emitir(novo);
  } }, t('ui.explorador.analogiaBotao'));
  const botaoAnalogiaLimpar = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: () => emitir({ ...atual, analogia: null }) }, t('ui.explorador.analogiaLimpar'));

  // direção
  const selW1 = sel(t('ui.explorador.direcaoW1')); const selW2 = sel(t('ui.explorador.direcaoW2'));
  const campoLista = h('input', { type: 'text', class: 'campo peq', placeholder: t('ui.explorador.direcaoLista'), autocapitalize: 'off', spellcheck: 'false' });
  const resultadoDirecao = h('div', { class: 'pequeno', role: 'status' });
  const botaoDirecao = h('button', { type: 'button', class: 'btn btn-primario peq', onClick: () => {
    const { indices, avisos } = resolver(campoLista.value || atual.palavras.map((i) => vetores.palavra(i)).join(','));
    if (avisos.length) toast(t('ui.explorador.naoEncontrada', { palavra: avisos[0] }));
    const novo = definirDirecao(atual, Number(selW1.value), Number(selW2.value), indices);
    if (!novo.direcao) { toast(t('ui.explorador.direcaoInvalida')); return; }
    emitir(novo);
  } }, t('ui.explorador.direcaoBotao'));

  const rodapeNumeros = h('p', { class: 'mini mudo' }, t('ui.explorador.calculadoNoAparelho'));

  const node = h('section', { class: 'explorador' },
    h('div', { class: 'explorador-grafico' }, canvas, legendaEixos, aviso),
    h('div', { class: 'explorador-painel' },
      h('div', { class: 'grupo' }, t('ui.explorador.palavras')),
      chips,
      h('div', { class: 'linha-campo' }, h('label', { class: 'sr-only', for: idCampo }, t('ui.explorador.adicionarRotulo')), campo, lista, botaoAdicionar, botaoLimpar),
      naoEncontrada,
      h('div', { class: 'linha-campo' }, botaoModo, chaveDiferencas),
      h('div', { class: 'grupo' }, t('ui.explorador.presetsTitulo')), presets, notaPreset,
      h('div', { class: 'grupo' }, t('ui.explorador.tabelaTitulo')), tabela,
      h('div', { class: 'grupo' }, t('ui.explorador.vizinhosTitulo')), vizinhos,
      h('div', { class: 'grupo' }, t('ui.explorador.analogiaTitulo')),
      h('p', { class: 'pequeno mudo' }, t('ui.explorador.analogiaExplicacao')),
      h('div', { class: 'linha-campo' }, selA, h('span', { 'aria-hidden': 'true' }, '−'), selB, h('span', { 'aria-hidden': 'true' }, '+'), selC, botaoAnalogia, botaoAnalogiaLimpar),
      resultadoAnalogia,
      h('div', { class: 'grupo' }, t('ui.explorador.direcaoTitulo')),
      h('p', { class: 'pequeno mudo' }, t('ui.explorador.direcaoExplicacao')),
      h('div', { class: 'linha-campo' }, selW1, h('span', { 'aria-hidden': 'true' }, '−'), selW2, campoLista, botaoDirecao),
      resultadoDirecao,
      rodapeNumeros));

  // ---------------------------------------------------------------- atualização
  function destacarPonto(k) {
    const i = k == null ? null : atual.palavras[k] ?? null;
    if (i === atual.destaque) return;
    atual = { ...atual, destaque: i };
    aoMudar?.(atual);
    renderVizinhos();
    for (const c of chips.children) { const b = c.querySelector('.chip'); if (b) { b.classList.toggle('on', Number(c.dataset.indice) === i); b.setAttribute('aria-pressed', Number(c.dataset.indice) === i ? 'true' : 'false'); } }
  }

  function renderVizinhos() {
    const i = atual.destaque;
    if (i == null) { vizinhos.replaceChildren(h('p', { class: 'pequeno mudo' }, t('ui.explorador.vizinhosVazio'))); return; }
    const lista10 = vetores.vizinhos(vetores.vetor(i), 10, [i]);
    vizinhos.replaceChildren(
      h('p', { class: 'pequeno' }, t('ui.explorador.vizinhosDe', { palavra: vetores.palavra(i) })),
      h('ul', { class: 'lista-vizinhos' }, lista10.map((v) => h('li', null,
        chip({ rotulo: v.palavra, onClick: () => adicionarTexto(v.palavra), title: t('ui.explorador.adicionarEsta') }),
        h('span', { class: 'mudo' }, ` ${t('ui.explorador.cosseno')} ${fmtNumero(v.cos, COS)}`)))));
  }

  function preencherSelects(estado) {
    const opcoes = estado.palavras.map((i) => h('option', { value: String(i) }, vetores.palavra(i)));
    for (const [s, k] of [[selA, 0], [selB, 1], [selC, 2], [selW1, 0], [selW2, 1]]) {
      const anterior = s.value;
      s.replaceChildren(...opcoes.map((o) => o.cloneNode(true)));
      if ([...s.options].some((o) => o.value === anterior)) s.value = anterior; else if (s.options[k]) s.selectedIndex = k;
    }
  }

  function atualizar(estado) {
    atual = estado;
    const c = cenaDe(estado, vetores);
    cena.definir({ pontos: c.pontos, eixos: c.eixos, setas: c.setas });
    cena.destacar(estado.destaque == null ? null : estado.palavras.indexOf(estado.destaque));
    botaoModo.replaceChildren(icon('cube', 16), estado.modo === 'pca' ? t('ui.explorador.modoPca') : t('ui.explorador.modoDimensoes'));
    botaoModo.setAttribute('aria-pressed', estado.modo === 'pca' ? 'true' : 'false');
    chaveDiferencas.querySelector('input').checked = estado.diferencas;
    aviso.hidden = !c.aviso;
    if (c.aviso) aviso.replaceChildren(icon('info', 16), t(`ui.explorador.aviso.${c.aviso}`));
    legendaEixos.textContent = c.eixos.map((e, k) => `${t('ui.explorador.eixo', { n: k + 1 })}: ${e.indice != null ? t('ui.explorador.eixoDimensao', { n: e.indice }) : t('ui.explorador.eixoPca', { n: k + 1, pct: fmtNumero(e.explicada, { casas: 0 }) })}`).join(' · ');
    // cada palavra: um botão que destaca (vizinhos) e um botão × que remove (dois irmãos: botão dentro de botão não é HTML válido)
    chips.replaceChildren(...estado.palavras.map((i) => {
      const w = vetores.palavra(i);
      const el = h('span', { class: 'chip-duplo', 'data-indice': String(i) },
        chip({ rotulo: w, selecionado: i === estado.destaque, ariaLabel: t('ui.explorador.destacar', { palavra: w }), onClick: () => destacarPonto(i === atual.destaque ? null : estado.palavras.indexOf(i)) }),
        h('button', { type: 'button', class: 'chip-remover', 'aria-label': t('ui.explorador.remover', { palavra: w }), onClick: () => emitir(remover(atual, i)) }, icon('x', 12)));
      return el;
    }));
    tabela.replaceChildren(c.tabela.length ? tabelaEl({ legenda: t('ui.explorador.tabelaLegenda'), cabecalho: [t('ui.explorador.tabelaPalavra'), ...c.eixos.map((e) => e.rotulo)], linhas: c.tabela.map((l) => [l.palavra, ...l.coords.map((v) => fmtNumero(v, COORD))]) })
      : h('p', { class: 'pequeno mudo' }, t('ui.explorador.semPalavras')));
    preencherSelects(estado);
    renderVizinhos();
    if (estado.analogia) {
      const { a, b, c: cc } = estado.analogia;
      const r = vetores.analogia(a, b, cc, 5);
      resultadoAnalogia.replaceChildren(h('p', null, t('ui.explorador.analogiaResultado', { a: vetores.palavra(a), b: vetores.palavra(b), c: vetores.palavra(cc) })),
        h('ol', { class: 'lista-vizinhos' }, r.resultados.map((v) => h('li', null, chip({ rotulo: v.palavra, onClick: () => adicionarTexto(v.palavra), title: t('ui.explorador.adicionarEsta') }), h('span', { class: 'mudo' }, ` ${t('ui.explorador.cosseno')} ${fmtNumero(v.cos, COS)}`)))));
    } else resultadoAnalogia.replaceChildren();
    if (estado.direcao) {
      const { w1, w2, lista: li } = estado.direcao;
      const r = vetores.produtoEscalar(vetores.direcao(w1, w2), li.length ? li : estado.palavras);
      const maior = Math.max(...r.map((x) => Math.abs(x.valor)), 1e-9);
      resultadoDirecao.replaceChildren(h('p', null, t('ui.explorador.direcaoResultado', { w1: vetores.palavra(w1), w2: vetores.palavra(w2) })),
        h('ul', { class: 'barras' }, r.map((x) => { const li2 = h('li', null, h('span', { class: 'barra-rotulo' }, x.palavra), h('span', { class: `barra ${x.valor < 0 ? 'neg' : ''}` }), h('span', { class: 'mudo' }, fmtNumero(x.valor, COORD))); li2.querySelector('.barra').style.width = `${Math.round((Math.abs(x.valor) / maior) * 100)}%`; return li2; })));
    } else resultadoDirecao.replaceChildren();
    try {
      const url = new URL(location.href);
      const q = paraUrl(estado, vetores);
      for (const k of ['palavras', 'modo']) url.searchParams.delete(k);
      for (const [k, v] of new URLSearchParams(q)) url.searchParams.set(k, v);
      history.replaceState(history.state, '', url.pathname + (url.search ? '?' + decodeURIComponent(url.searchParams.toString()).replace(/%2C/g, ',') : '') + url.hash);
    } catch { /* sem history */ }
  }

  /** Ações vindas do assistente (answers.js): adicionar, analogia, direcao, preset, limpar, modo (destacar: ver `destacar`). */
  function aplicarAcao(acao) {
    switch (acao?.tipo) {
      case 'adicionar': { const r = adicionar(atual, acao.indices ?? []); if (r.recusadas.length) toast(t('ui.explorador.avisoLimite', { n: MAX_PALAVRAS })); emitir(r.estado); break; }
      case 'analogia': { const com = adicionar(atual, [acao.a, acao.b, acao.c]).estado; emitir(definirAnalogia(com, acao.a, acao.b, acao.c)); break; }
      case 'direcao': { const com = adicionar(atual, [acao.w1, acao.w2, ...(acao.lista ?? [])]).estado; emitir(definirDirecao(com, acao.w1, acao.w2, acao.lista ?? [])); break; }
      case 'preset': aplicarPreset(acao.id); break;
      case 'limpar': emitir(limpar()); break;
      case 'modo': emitir({ ...atual, modo: acao.modo === 'pca' ? 'pca' : 'dimensoes' }); break;
      default: break;
    }
  }

  /** Destaca (ou tira o destaque de) uma palavra pelo índice no vocabulário: acende o ponto na cena e o painel de vizinhos. */
  function destacar(indice) {
    const k = atual.palavras.indexOf(indice);
    destacarPonto(k < 0 ? null : k);
  }

  atualizar(estado);
  return { node, atualizar, aplicarAcao, destacar, destruir: () => cena.destruir() };
}
