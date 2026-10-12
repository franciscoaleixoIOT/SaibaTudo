// Configurações: idioma, aparência, instalação do app, IA na nuvem (ainda indisponível) e apagar os dados deste aparelho.
import { h, icon } from '../dom.js';
import { IDIOMAS, NOMES_IDIOMAS, caminhoPrivacidade, idiomaAtual, t } from '../i18n/index.js';
import { instalar, instrucoes, jaInstalado, podeInstalarAgora } from '../install.js';
import { FONTES, TEMAS, apagar, aplicarAparencia, carregar, salvar } from '../prefs.js';
import { botaoAtualizacao } from './sobre.js';
import { kvEl, toast } from './componentes.js';

function radios(nome, legenda, opcoes, atual, aoMudar) {
  return h('fieldset', { class: 'radios' }, h('legend', null, legenda),
    opcoes.map(([valor, rotulo]) => h('label', { class: 'radio' }, h('input', { type: 'radio', name: nome, value: valor, checked: valor === atual, onChange: () => aoMudar(valor) }), h('span', null, rotulo))));
}

/** <select> de idioma (endônimos), usado aqui e na barra do app. `aoMudar(idioma)` é definido por app.js (grava, limpa o contexto e re-renderiza). */
export function seletorIdioma({ id = 'sel-idioma', classe = 'campo', aoMudar, ariaLabel = null }) {
  return h('select', { id, class: classe, 'aria-label': ariaLabel, onChange: (e) => aoMudar?.(e.target.value) },
    IDIOMAS.map((i) => h('option', { value: i, selected: i === idiomaAtual(), lang: i }, NOMES_IDIOMAS[i])));
}

export function viewConfig({ store, mudarIdioma }) {
  let prefs = carregar();
  const mudar = (campo, valor) => { prefs = { ...prefs, [campo]: valor }; salvar(prefs); aplicarAparencia(prefs); toast(t('ui.config.salva')); };

  const blocoInstalar = h('div');
  const atualizarInstalar = () => {
    const ins = instrucoes();
    blocoInstalar.replaceChildren(jaInstalado() ? h('p', { class: 'mudo' }, t('ui.config.jaInstalado'))
      : podeInstalarAgora() ? h('button', { class: 'btn btn-primario', type: 'button', onClick: async () => { await instalar(); atualizarInstalar(); } }, icon('download', 18), t('ui.config.instalarApp'))
        : h('div', null, h('p', { class: 'mudo' }, ins.titulo), h('ul', { class: 'lista-pontos' }, ins.passos.map((p) => h('li', null, p)))));
  };
  atualizarInstalar();

  const status = h('p', { class: 'pequeno mudo', role: 'status', 'aria-live': 'polite' });
  const botaoApagar = h('button', { class: 'btn btn-contorno peq perigo', type: 'button', onClick: async () => {
    if (botaoApagar.dataset.confirma !== '1') { botaoApagar.dataset.confirma = '1'; botaoApagar.textContent = t('ui.config.confirmar'); return; }
    apagar();
    try { if (globalThis.caches) for (const k of await caches.keys()) if (k.startsWith('quimica-')) await caches.delete(k); } catch { /* ignorado */ }
    try { const regs = await navigator.serviceWorker?.getRegistrations?.(); for (const r of regs ?? []) if (r.scope.endsWith('/quimica/')) await r.unregister(); } catch { /* ignorado */ }
    status.textContent = t('ui.config.apagados');
    setTimeout(() => location.assign('/quimica/'), 600);
  } }, icon('trash', 16), t('ui.config.apagar'));

  const no = h('div', { class: 'tela-corpo' },
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.config.titulo')),
    h('div', { class: 'grupo' }, t('ui.config.idioma')),
    h('div', null, h('label', { class: 'rotulo-campo', for: 'sel-idioma' }, t('ui.config.idioma')), seletorIdioma({ aoMudar: mudarIdioma }), h('p', { class: 'ajuda-campo' }, t('ui.config.idiomaAjuda'))),
    h('div', { class: 'grupo' }, t('ui.config.aparencia')),
    radios('tema', t('ui.config.tema'), Object.keys(TEMAS).map((k) => [k, t(`ui.prefs.tema.${k}`)]), prefs.tema, (v) => mudar('tema', v)),
    radios('fonte', t('ui.config.tamanhoTexto'), Object.keys(FONTES).map((k) => [k, t(`ui.prefs.fonte.${k}`)]), prefs.tamanhoFonte, (v) => mudar('tamanhoFonte', v)),
    h('div', { class: 'grupo' }, t('ui.config.instalar')), blocoInstalar,
    h('div', { class: 'grupo' }, t('ui.config.ia')),
    h('p', { class: 'aviso-caixa discreto' }, icon('info', 16), t('ui.config.iaAviso')),
    h('div', { class: 'grupo' }, t('ui.config.dados')),
    kvEl([{ rotulo: t('ui.config.versaoPacote'), valor: String(store.versao) }, { rotulo: t('ui.config.assinatura'), valor: t(`ui.config.assinaturaValor.${store.sig.estado}`) }]),
    botaoAtualizacao(store),
    h('div', { class: 'grupo' }, t('ui.config.privacidade')),
    h('p', { class: 'pequeno mudo' }, t('ui.config.privacidadeTexto'), h('a', { href: caminhoPrivacidade() }, t('ui.config.politica')), '.'),
    botaoApagar, status);
  return { titulo: t('ui.config.titulo'), node: no };
}
