// Aplicativo (SPA) de /llms/: casca (barra, abas, rodapé), idioma, rotas e telas. Porte do app.js do SaibaTudo Química.
// Idioma (docs/I18N.md §2): ?lang= → preferência → navegador → pt-BR; o seletor (globo na barra e Configurações) grava a preferência e re-renderiza.
// As rotas (/llms/aprenda…) não mudam com o idioma.
import { h, icon, anunciar } from './dom.js';
import { aplicarIdiomaAoDocumento, caminhoPrivacidade, definirIdioma, detectarIdioma, idiomaAtual, t } from './i18n/index.js';
import { aoMudarInstalacao, ehIos, iniciarInstalacao, instalar, jaInstalado, podeInstalarAgora } from './install.js';
import { aplicarAparencia, carregar, salvarIdioma } from './prefs.js';
import { roteador, toast } from './ui/componentes.js';
import { seletorIdioma, viewConfig } from './ui/config.js';
import { viewInicio } from './ui/inicio.js';

export { toast };

const BASE = '/llms/';
/** Estado do app: `vetores` (pacote carregado) e `cena` entram nas tarefas seguintes; `shell` é a casca montada. */
const S = { vetores: null, shell: null, primeira: true, ouvintes: [] };

/** Abas: rota, chave do rótulo no catálogo e ícone. */
const ABAS = [
  ['/llms/', 'inicio', 'sparkles'], ['/llms/aprenda', 'aprenda', 'book'], ['/llms/sobre-os-dados', 'sobre', 'info']
];

const ROTAS = [
  [/^\/llms\/?$/, viewInicio, []],
  [/^\/llms\/configuracoes\/?$/, viewConfig, []]
];

/** Registra uma tela (as tarefas seguintes acrescentam aprenda e sobre-os-dados sem mexer aqui). */
export function registrarRota(rx, view, nomes = []) { ROTAS.push([rx, view, nomes]); }

/** Rota de um caminho: { view, params } ou null. */
export function resolverRota(pathname) {
  for (const [rx, view, nomes] of ROTAS) {
    const m = rx.exec(pathname);
    if (m) return { view, params: Object.fromEntries(nomes.map((n, i) => [n, m[i + 1]])) };
  }
  return null;
}

const raiz = () => document.getElementById('app');

function viewNaoEncontrada() {
  return { titulo: t('ui.app.naoEncontrada.titulo'), status: 404, node: h('div', null,
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.app.naoEncontrada.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.app.naoEncontrada.texto')), h('a', { class: 'btn btn-primario', href: '/llms/' }, t('ui.app.naoEncontrada.inicio'))) };
}

/**
 * Escolhe o idioma inicial (I18N.md §2) e aplica ao documento. `?lang=` grava a preferência (por `salvar`, injetável nos testes). Devolve o idioma efetivo.
 * @param {{url?: URL, prefs?: object, navegador?: readonly string[], salvar?: (idioma: string) => void}} [o]
 */
export function iniciarIdioma({ url = new URL(location.href), prefs = carregar(), navegador = globalThis.navigator?.languages ?? [], salvar = salvarIdioma } = {}) {
  const { idioma, origem } = detectarIdioma({ url, prefs, navegador });
  definirIdioma(idioma);
  if (origem === 'url' && prefs.idioma !== idioma) salvar(idioma);
  aplicarIdiomaAoDocumento();
  return idioma;
}

/** Troca o idioma em tempo de execução: grava a preferência, avisa as telas (contexto da conversa), re-renderiza a casca e a tela atual. */
export async function mudarIdioma(novo) {
  const efetivo = definirIdioma(novo);
  salvarIdioma(efetivo);
  for (const fn of S.ouvintes) { try { fn(efetivo); } catch { /* um ouvinte não derruba os outros */ } }
  aplicarIdiomaAoDocumento();
  try {
    const url = new URL(location.href);
    if (efetivo === 'pt-BR') url.searchParams.delete('lang'); else url.searchParams.set('lang', efetivo);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch { /* sem history: segue */ }
  if (S.shell) { montarShell(); avisoAssinatura(); }
  await renderizar();
  toast(t('ui.app.idiomaTrocado'));
  return efetivo;
}

/** Telas que guardam estado por idioma (contexto da conversa) se registram aqui. */
export const aoMudarIdioma = (fn) => { S.ouvintes.push(fn); return () => { S.ouvintes = S.ouvintes.filter((f) => f !== fn); }; };

function montarShell() {
  const conteudo = h('main', { id: 'conteudo', class: 'conteudo', tabindex: '-1' });
  const nav = h('nav', { class: 'abas', 'aria-label': t('ui.app.secoes') }, h('ul', null, ABAS.map(([href, chave, ic]) => h('li', null, h('a', { href, 'data-aba': href }, icon(ic, 18), t(`ui.app.abas.${chave}`))))));
  const idiomaEl = h('label', { class: 'appbar-idioma' }, h('span', { class: 'btn-icone claro', 'aria-hidden': 'true' }, icon('globe', 22)),
    seletorIdioma({ id: 'sel-idioma-barra', classe: 'appbar-select', aoMudar: mudarIdioma, ariaLabel: t('ui.app.idioma') }));
  const instalarEl = h('span', { class: 'appbar-instalar' });
  const atualizarInstalar = () => instalarEl.replaceChildren(...(podeInstalarAgora() || (ehIos() && !jaInstalado())
    ? [h('button', { type: 'button', class: 'btn-icone claro btn-instalar-barra', 'aria-label': t('ui.config.instalarApp'), title: t('ui.config.instalarApp'),
      onClick: () => (podeInstalarAgora() ? instalar() : irPara('/llms/configuracoes#instalar')) }, icon('download', 22))] : []));
  atualizarInstalar();
  if (!S.pararInstalacao) S.pararInstalacao = aoMudarInstalacao(() => S.shell?.atualizarInstalar?.());
  const topo = h('header', { class: 'appbar' },
    h('a', { class: 'appbar-marca', href: '/llms/', 'aria-label': t('ui.app.marcaAria') },
      h('img', { class: 'appbar-logo', src: '/llms/brand/llms-icon.svg', width: '38', height: '38', alt: '' }),
      h('div', { class: 'appbar-textos' }, h('div', { class: 'appbar-titulo' }, t('ui.marca')), h('div', { class: 'appbar-sub' }, t('ui.app.marcaSub')))),
    h('div', { class: 'appbar-acoes' }, idiomaEl, instalarEl, h('a', { class: 'btn-icone claro', href: '/llms/configuracoes', 'aria-label': t('ui.app.configuracoes'), 'data-aba': '/llms/configuracoes' }, icon('settings', 22))));
  const rodape = h('footer', { class: 'rodape' },
    h('a', { href: '/llms/sobre-os-dados' }, t('ui.app.rodape.sobre')), h('a', { href: caminhoPrivacidade() }, t('ui.app.rodape.privacidade')), h('a', { href: '/llms/configuracoes' }, t('ui.app.rodape.configuracoes')),
    h('p', null, t('ui.app.rodape.projeto')));
  const aviso = h('div', { id: 'aviso-global' });
  raiz().replaceChildren(h('div', { class: 'app' }, h('div', { class: 'topo-fixo' }, topo, nav), aviso, conteudo, rodape));
  const pular = document.querySelector('a.skip');
  if (pular) pular.textContent = t('ui.html.pular');
  S.shell = { conteudo, nav, aviso, atualizarInstalar };
}

function marcarAba(pathname) {
  for (const a of S.shell.nav.querySelectorAll('a[data-aba]')) {
    const href = a.getAttribute('data-aba');
    const ativo = href === BASE ? pathname === '/llms' || pathname === BASE : pathname.startsWith(href);
    if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

function avisoAssinatura() {
  const ruim = S.vetores?.sig?.estado === 'invalida' || S.erroDados != null;
  S.shell.aviso.replaceChildren(...(ruim ? [h('p', { class: 'aviso-caixa', role: 'alert' }, icon('warning', 18), S.erroDados ? t('ui.app.erroDados.complemento', { msg: S.erroDados }) : t('ui.app.avisoAssinatura'))] : []));
}

export async function renderizar() {
  const url = new URL(location.href);
  const rota = resolverRota(url.pathname) ?? { view: viewNaoEncontrada, params: {} };
  marcarAba(url.pathname);
  let r;
  try {
    r = await rota.view({ vetores: S.vetores, params: rota.params, query: url.searchParams, navegar: irPara, mudarIdioma });
  } catch (e) {
    r = { titulo: t('ui.app.erro.titulo'), node: h('div', { class: 'tela-corpo' }, h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.app.erro.cabecalho')), h('p', { class: 'mudo' }, t('ui.app.erro.texto', { msg: e instanceof Error ? e.message : String(e) })), h('a', { class: 'btn btn-primario', href: '/llms/' }, t('ui.app.erro.inicio'))) };
  }
  S.shell.conteudo.replaceChildren(r.node);
  document.title = t('ui.app.tituloJanela', { titulo: r.titulo });
  if (!S.primeira) {
    const alvo = (r.foco && S.shell.conteudo.querySelector(r.foco)) || S.shell.conteudo.querySelector('#titulo-pagina');
    if (url.hash && S.shell.conteudo.querySelector(url.hash)) S.shell.conteudo.querySelector(url.hash).scrollIntoView();
    else { window.scrollTo(0, 0); alvo?.focus({ preventScroll: true }); }
    anunciar(`${r.titulo}`);
  }
  S.primeira = false;
}

export function irPara(href, { substituir = false } = {}) {
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) { location.assign(href); return; }
  if (!resolverRota(url.pathname) && !url.pathname.startsWith(BASE)) { location.assign(href); return; }
  if (idiomaAtual() !== 'pt-BR' && !url.searchParams.has('lang')) url.searchParams.set('lang', idiomaAtual());
  if (url.pathname + url.search + url.hash !== location.pathname + location.search + location.hash) history[substituir ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search + url.hash);
  return renderizar();
}
roteador.ir = irPara;

/** Interceptação de cliques em links internos (sem recarregar a página). */
function interceptarLinks(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  if (!resolverRota(url.pathname)) return; // arquivos e páginas estáticas (privacidade): navegação normal
  e.preventDefault();
  irPara(url.pathname + url.search + url.hash);
}

/** Carregadores de dados registrados pelas tarefas seguintes (data.js): recebem o estado e preenchem S.vetores. */
const carregadores = [];
export const registrarCarregador = (fn) => carregadores.push(fn);

export async function iniciarApp() {
  aplicarAparencia(carregar());
  iniciarIdioma();
  iniciarInstalacao();
  raiz().replaceChildren(h('div', { class: 'carregando', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { class: 'mudo' }, t('ui.app.carregando'))));
  S.erroDados = null;
  for (const fn of carregadores) {
    try { await fn(S); } catch (e) { S.erroDados = e instanceof Error ? e.message : String(e); }
  }
  montarShell();
  avisoAssinatura();
  document.addEventListener('click', interceptarLinks);
  window.addEventListener('popstate', () => renderizar());
  await renderizar();
}

export const _estado = S;
