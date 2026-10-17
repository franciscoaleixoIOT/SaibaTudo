// Aplicativo (SPA) de /quimica/: carrega o pacote de dados assinado, monta o motor local e navega entre as telas sem recarregar.
// Idioma (docs/I18N.md §2): ?lang= → preferência → navegador → pt-BR; o seletor (globo na barra e Configurações) grava a preferência, limpa o
// contexto da conversa e re-renderiza. As rotas (/quimica/tabela…) não mudam com o idioma.
import { DataStore } from './data.js';
import { Engine } from './engine.js';
import { h, icon, anunciar } from './dom.js';
import { aplicarIdiomaAoDocumento, caminhoPrivacidade, definirIdioma, detectarIdioma, idiomaAtual, t } from './i18n/index.js';
import { aoMudarInstalacao, ehIos, iniciarInstalacao, instalar, jaInstalado, podeInstalarAgora } from './install.js';
import { iniciarMelhoria } from './melhoria.js';
import { NuvemNlu } from './nuvem.js';
import { aplicarAparencia, carregar, installId, salvarIdioma } from './prefs.js';
import { roteador, toast } from './ui/componentes.js';
import { viewCalculadoras } from './ui/calculadoras.js';
import { viewComposto, viewCompostos } from './ui/compostos.js';
import { seletorIdioma, viewConfig } from './ui/config.js';
import { viewElemento } from './ui/elemento.js';
import { limparUltimaResposta, viewInicio } from './ui/inicio.js';
import { viewSeguranca } from './ui/seguranca.js';
import { viewSobreDados } from './ui/sobre.js';
import { viewTabela } from './ui/tabela.js';

export { toast };

const BASE = '/quimica/';
const S = { store: null, engine: null, shell: null, primeira: true };

/** Abas: rota, chave do rótulo no catálogo e ícone. */
const ABAS = [
  ['/quimica/', 'inicio', 'sparkles'], ['/quimica/tabela', 'tabela', 'table'], ['/quimica/compostos', 'compostos', 'molecule'],
  ['/quimica/calculadoras', 'calculadoras', 'calculator'], ['/quimica/seguranca', 'seguranca', 'shield']
];

const ROTAS = [
  [/^\/quimica\/?$/, viewInicio, []],
  [/^\/quimica\/tabela\/?$/, viewTabela, []],
  [/^\/quimica\/elemento\/([^/]+)\/?$/, viewElemento, ['simbolo']],
  [/^\/quimica\/compostos\/?$/, viewCompostos, []],
  [/^\/quimica\/composto\/(\d+)\/?$/, viewComposto, ['cid']],
  [/^\/quimica\/calculadoras(?:\/([a-z0-9-]+))?\/?$/, viewCalculadoras, ['id']],
  [/^\/quimica\/seguranca\/?$/, viewSeguranca, []],
  [/^\/quimica\/sobre-os-dados\/?$/, viewSobreDados, []],
  [/^\/quimica\/configuracoes\/?$/, viewConfig, []]
];

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
    h('p', { class: 'sub-pagina' }, t('ui.app.naoEncontrada.texto')), h('a', { class: 'btn btn-primario', href: '/quimica/' }, t('ui.app.naoEncontrada.inicio'))) };
}

/**
 * Escolhe o idioma inicial (I18N.md §2) e aplica ao documento. `?lang=` grava a preferência. Devolve o idioma efetivo.
 * @param {{url?: URL, prefs?: object, navegador?: readonly string[]}} [o] injetável para testes
 */
export function iniciarIdioma({ url = new URL(location.href), prefs = carregar(), navegador = globalThis.navigator?.languages ?? [] } = {}) {
  const { idioma, origem } = detectarIdioma({ url, prefs, navegador });
  definirIdioma(idioma);
  if (origem === 'url' && prefs.idioma !== idioma) salvarIdioma(idioma);
  aplicarIdiomaAoDocumento();
  return idioma;
}

/** Troca o idioma em tempo de execução: grava a preferência, limpa o contexto da conversa, re-renderiza a casca e a tela atual. */
export async function mudarIdioma(novo) {
  const efetivo = definirIdioma(novo);
  salvarIdioma(efetivo);
  S.engine?.limparContexto();
  limparUltimaResposta();
  aplicarIdiomaAoDocumento();
  // ?lang= na URL passa a refletir o idioma escolhido (compartilhável); o padrão fica sem parâmetro
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

function montarShell() {
  const conteudo = h('main', { id: 'conteudo', class: 'conteudo', tabindex: '-1' });
  const nav = h('nav', { class: 'abas', 'aria-label': t('ui.app.secoes') }, h('ul', null, ABAS.map(([href, chave, ic]) => h('li', null, h('a', { href, 'data-aba': href }, icon(ic, 18), t(`ui.app.abas.${chave}`))))));
  const idiomaEl = h('label', { class: 'appbar-idioma' }, h('span', { class: 'btn-icone claro', 'aria-hidden': 'true' }, icon('globe', 22)),
    seletorIdioma({ id: 'sel-idioma-barra', classe: 'appbar-select', aoMudar: mudarIdioma, ariaLabel: t('ui.app.idioma') }));
  // Instalar como app na barra (padrão de todos os apps SaibaTudo, docs/PADRAO_ASSISTENTE.md §5): aparece quando o navegador oferece a
  // instalação (beforeinstallprompt) ou no iPhone/iPad sem o app instalado; o clique abre o prompt nativo ou leva às instruções em Configurações.
  const instalarEl = h('span', { class: 'appbar-instalar' });
  const atualizarInstalar = () => instalarEl.replaceChildren(...(podeInstalarAgora() || (ehIos() && !jaInstalado())
    ? [h('button', { type: 'button', class: 'btn-icone claro btn-instalar-barra', 'aria-label': t('ui.config.instalarApp'), title: t('ui.config.instalarApp'),
      onClick: () => (podeInstalarAgora() ? instalar() : irPara('/quimica/configuracoes#instalar')) }, icon('download', 22))] : []));
  atualizarInstalar();
  if (!S.pararInstalacao) S.pararInstalacao = aoMudarInstalacao(() => S.shell?.atualizarInstalar?.());
  const topo = h('header', { class: 'appbar' },
    h('a', { class: 'appbar-marca', href: '/quimica/', 'aria-label': t('ui.app.marcaAria') },
      h('img', { class: 'appbar-logo', src: '/quimica/brand/quimica-icon.svg', width: '38', height: '38', alt: '' }),
      h('div', { class: 'appbar-textos' }, h('div', { class: 'appbar-titulo' }, t('ui.marca')), h('div', { class: 'appbar-sub' }, t('ui.app.marcaSub')))),
    h('div', { class: 'appbar-acoes' }, idiomaEl, instalarEl, h('a', { class: 'btn-icone claro', href: '/quimica/configuracoes', 'aria-label': t('ui.app.configuracoes'), 'data-aba': '/quimica/configuracoes' }, icon('settings', 22))));
  const rodape = h('footer', { class: 'rodape' },
    h('a', { href: '/quimica/sobre-os-dados' }, t('ui.app.rodape.sobre')), h('a', { href: caminhoPrivacidade() }, t('ui.app.rodape.privacidade')), h('a', { href: '/quimica/configuracoes' }, t('ui.app.rodape.configuracoes')),
    h('p', null, t('ui.app.rodape.projeto')));
  const aviso = h('div', { id: 'aviso-global' });
  // barra + abas num só bloco fixo: a altura da barra pode variar (título longo, botão de instalar), e as abas ficam sempre logo abaixo
  raiz().replaceChildren(h('div', { class: 'app' }, h('div', { class: 'topo-fixo' }, topo, nav), aviso, conteudo, rodape));
  const pular = document.querySelector('a.skip');
  if (pular) pular.textContent = t('ui.html.pular');
  S.shell = { conteudo, nav, aviso, atualizarInstalar };
}

function marcarAba(pathname) {
  for (const a of S.shell.nav.querySelectorAll('a[data-aba]')) {
    const href = a.getAttribute('data-aba');
    const ativo = href === BASE ? pathname === '/quimica' || pathname === BASE : pathname.startsWith(href);
    if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

function avisoAssinatura() {
  const ruim = S.store.sig.estado === 'invalida';
  S.shell.aviso.replaceChildren(...(ruim ? [h('p', { class: 'aviso-caixa', role: 'alert' }, icon('warning', 18), t('ui.app.avisoAssinatura'))] : []));
}

export async function renderizar() {
  const url = new URL(location.href);
  const rota = resolverRota(url.pathname) ?? { view: viewNaoEncontrada, params: {} };
  marcarAba(url.pathname);
  let r;
  try {
    r = await rota.view({ store: S.store, engine: S.engine, params: rota.params, query: url.searchParams, navegar: irPara, mudarIdioma });
  } catch (e) {
    r = { titulo: t('ui.app.erro.titulo'), node: h('div', { class: 'tela-corpo' }, h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.app.erro.cabecalho')), h('p', { class: 'mudo' }, t('ui.app.erro.texto', { msg: e instanceof Error ? e.message : String(e) })), h('a', { class: 'btn btn-primario', href: '/quimica/' }, t('ui.app.erro.inicio'))) };
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
  // o idioma escolhido acompanha a navegação interna quando não é o padrão
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

function telaErro(msg) {
  raiz().replaceChildren(h('div', { class: 'tela-corpo offline' }, h('h1', null, t('ui.app.erroDados.titulo')),
    h('p', { class: 'mudo' }, msg), h('p', null, h('button', { class: 'btn btn-primario', type: 'button', onClick: () => iniciarApp() }, t('ui.app.erroDados.tentar')))));
}

export async function iniciarApp() {
  aplicarAparencia(carregar());
  iniciarIdioma();
  iniciarInstalacao();
  raiz().replaceChildren(h('div', { class: 'carregando', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { class: 'mudo' }, t('ui.app.carregando'))));
  try {
    S.store = new DataStore();
    await S.store.iniciar();
    // IA na nuvem (opt-in): o cliente só envia com consentimento — toque no botão da resposta ou chave "automática" em Configurações
    S.engine = new Engine({ store: S.store, nuvem: new NuvemNlu({ installId, habilitada: () => carregar().nuvemAutomatica === true }) });
  } catch (e) {
    telaErro(t('ui.app.erroDados.complemento', { msg: e instanceof Error ? e.message : String(e) }));
    return;
  }
  montarShell();
  avisoAssinatura();
  document.addEventListener('click', interceptarLinks);
  window.addEventListener('popstate', () => renderizar());
  await renderizar();
  // "Ajudar a melhorar o app" (opt-in próprio): tenta enviar a fila guardada na abertura e quando a rede volta (só com a chave ligada)
  iniciarMelhoria();
  // verificação de atualização em segundo plano (dois arquivos pequenos), sem travar a interface
  setTimeout(async () => {
    const r = await S.store.verificarAtualizacao().catch(() => null);
    if (r?.tipo === 'atualizado') { avisoAssinatura(); toast(t('ui.app.dadosAtualizados')); }
  }, 4000);
}

export const _estado = S;
