// Sobre os dados: versão e assinatura do pacote, fontes e licenças (exatamente como em fontes.json) e referências externas. Rótulos pelo catálogo.
import { h, icon } from '../dom.js';
import { fmt } from '../formato.js';
import { fmtData, t, tl } from '../i18n/index.js';
import { kvEl, linkExterno, toast } from './componentes.js';

/** Referências que o aplicativo apenas indica por link (nenhum conteúdo é copiado). Textos de uso: catálogo (ui.sobre.referencias). */
export const REFERENCIAS_EXTERNAS = [
  { nome: 'OpenStax Chemistry 2e', url: 'https://openstax.org/details/books/chemistry-2e', licenca: 'somente link', usoChave: 'openstax', uso: 'Livro didático aberto, com restrições de uso: indicado como leitura; nenhum trecho foi copiado.' },
  { nome: 'ICSC — Fichas Internacionais de Segurança Química (OIT/OMS)', url: 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', licenca: 'somente link', usoChave: 'icsc', uso: 'Fichas por substância; o botão "Ficha ICSC no site da OIT" abre a busca por CAS.' },
  { nome: 'NIST Chemistry WebBook', url: 'https://webbook.nist.gov/chemistry/', licenca: 'somente link', usoChave: 'nist', uso: 'Dados termoquímicos e espectros; indicado como referência.' },
  { nome: 'LibreTexts Chemistry', url: 'https://chem.libretexts.org/', licenca: 'somente link', usoChave: 'libretexts', uso: 'Textos de Química abertos; indicados como leitura complementar.' }
];

export const BIBLIOTECAS = [
  { nome: 'KaTeX 0.19.0', licenca: 'MIT', url: 'https://katex.org/', usoChave: 'katex', uso: 'Fórmulas e passos de cálculo' },
  { nome: 'SmilesDrawer 2.4.1', licenca: 'MIT', url: 'https://github.com/reymond-group/smilesDrawer', usoChave: 'smiles', uso: 'Estrutura 2D das moléculas' },
  { nome: 'Poppins', licenca: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Poppins', usoChave: 'poppins', uso: 'Fonte dos títulos' }
];

export function listaDeFontes(fontes) {
  if (Array.isArray(fontes)) return fontes;
  if (Array.isArray(fontes?.fontes)) return fontes.fontes;
  return [];
}

/** Agrupa as fontes: dados, textos e referências externas (que sempre inclui OpenStax, ICSC, NIST e LibreTexts). */
export function agruparFontes(fontes) {
  const grupos = { dados: [], textos: [], externas: [] };
  for (const f of listaDeFontes(fontes)) {
    if (!f?.nome) continue;
    // `tipo` (nosso) ou `uso: dados | textos | link` (pipeline); as referências "somente link" não são dados do pacote
    const x = String(f.tipo ?? (['dados', 'textos', 'link', 'referencia'].includes(f.uso) ? f.uso : 'dados'));
    if (x === 'link' || x === 'referencia') grupos.externas.push(f);
    else if (x === 'textos') grupos.textos.push(f);
    else grupos.dados.push(f);
  }
  for (const ref of REFERENCIAS_EXTERNAS) {
    const chave = ref.nome.split(/[ —]/)[0].toLowerCase();
    if (!grupos.externas.some((f) => String(f.nome).toLowerCase().includes(chave) || String(f.id ?? '').toLowerCase().includes(chave))) grupos.externas.push(ref);
  }
  return grupos;
}

function fonteItem(f) {
  const uso = f.usoChave ? t(`ui.sobre.referencias.${f.usoChave}`) : f.uso;
  const usoLib = f.usoChave ? t(`ui.sobre.bibliotecasUso.${f.usoChave}`) : null;
  const textoUso = f.usoChave && usoLib !== `ui.sobre.bibliotecasUso.${f.usoChave}` ? usoLib : uso;
  return h('div', { class: 'fonte-item' },
    h('strong', null, f.url ? linkExterno(f.url, f.nome) : f.nome),
    f.mantenedor ? h('div', { class: 'meta' }, t('ui.sobre.mantenedor', { x: f.mantenedor })) : null,
    f.licenca ? h('div', { class: 'meta' }, t('ui.sobre.licenca', { x: f.licenca === 'somente link' ? t('ui.sobre.somenteLink') : f.licenca })) : null,
    f.acessadoEm ? h('div', { class: 'meta' }, t('ui.sobre.acessadoEm', { x: f.acessadoEm })) : null,
    f.atribuicao ? h('div', { class: 'meta' }, t('ui.sobre.atribuicao', { x: f.atribuicao })) : null,
    textoUso && !['dados', 'textos', 'link', 'referencia'].includes(textoUso) ? h('div', { class: 'meta' }, t('ui.sobre.uso', { x: textoUso })) : null);
}

/** Data legível no idioma ativo (longa, com hora, fuso de São Paulo). */
export function dataLegivel(iso) {
  return fmtData(iso, { estilo: 'longa', comHora: true }) ?? String(iso ?? '—');
}

export const rotuloAssinatura = (estado) => t(`ui.sobre.assinaturaRotulo.${estado}`);

export function botaoAtualizacao(store) {
  const msg = h('p', { class: 'pequeno mudo', role: 'status', 'aria-live': 'polite' });
  const botao = h('button', { class: 'btn btn-contorno peq', type: 'button', onClick: async () => {
    botao.disabled = true;
    msg.textContent = t('ui.sobre.atualizacao.verificando');
    const r = await store.verificarAtualizacao();
    botao.disabled = false;
    const motivo = r.motivoChave ? t(`ui.sobre.atualizacao.motivos.${r.motivoChave}`) : r.motivo;
    msg.textContent = { atual: t('ui.sobre.atualizacao.atual'), atualizado: t('ui.sobre.atualizacao.atualizado', { version: r.version }), ignorado: t('ui.sobre.atualizacao.ignorado', { motivo }), rejeitado: motivo, falha: t('ui.sobre.atualizacao.falha', { motivo }) }[r.tipo] ?? r.tipo;
    if (r.tipo === 'atualizado') toast(t('ui.app.dadosAtualizados'));
  } }, icon('refresh', 16), t('ui.sobre.atualizacao.botao'));
  return h('div', null, botao, msg);
}

export function viewSobreDados({ store }) {
  const m = store.manifest;
  const g = agruparFontes(store.fontes);
  const arqs = [...store.arquivos.values()];
  const bytes = arqs.reduce((a, b) => a + (b.bytes ?? 0), 0);
  const licencas = Array.isArray(m?.licencas) ? m.licencas : [];
  const secao = (titulo, lista) => (lista.length ? h('section', { class: 'secao' }, h('h2', null, titulo), lista.map(fonteItem)) : null);

  const no = h('div', null,
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.sobre.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.sobre.intro')),
    h('section', { class: 'secao' }, h('h2', null, t('ui.sobre.pacote')),
      kvEl([
        { rotulo: t('ui.sobre.versao'), valor: String(store.versao) },
        { rotulo: t('ui.sobre.geradoEm'), valor: dataLegivel(m?.generatedAt) },
        { rotulo: t('ui.sobre.assinatura'), valor: rotuloAssinatura(store.sig.estado) },
        { rotulo: t('ui.sobre.origem'), valor: t(`ui.sobre.origemRotulo.${store.origemChave ?? store.sig.estado}`) },
        { rotulo: t('ui.sobre.arquivos'), valor: t('ui.sobre.arquivosValor', { n: arqs.length, kb: fmt(bytes / 1024, { sig: 4 }) }) },
        { rotulo: t('ui.sobre.elementos'), valor: String(store.elementos.length) },
        { rotulo: t('ui.sobre.compostos'), valor: String(store.indice.entradas.length) },
        ...(store.ultimaVerificacao ? [{ rotulo: t('ui.sobre.ultimaVerificacao'), valor: fmtData(new Date(store.ultimaVerificacao).toISOString(), { comHora: true }) }] : [])
      ]),
      store.sig.detalhe ? h('p', { class: 'aviso-caixa' }, icon('warning', 18), t(`ui.sobre.sigDetalhe.${store.sig.estado}`)) : null,
      botaoAtualizacao(store),
      store.erros.length ? h('p', { class: 'pequeno mudo' }, t('ui.sobre.avisosCarga', { msgs: store.erros.map((e) => e.mensagem).join('; ') })) : null),
    secao(t('ui.sobre.dados'), g.dados),
    secao(t('ui.sobre.textos'), g.textos),
    secao(t('ui.sobre.externas'), g.externas),
    licencas.length ? h('section', { class: 'secao' }, h('h2', null, t('ui.sobre.licencasManifesto')), h('ul', { class: 'lista-pontos' }, licencas.map((l) => h('li', null, typeof l === 'string' ? l : l.nome ?? l.id)))) : null,
    h('section', { class: 'secao' }, h('h2', null, t('ui.sobre.comoObtidos')),
      h('ul', { class: 'lista-pontos' }, tl('ui.sobre.como').map((x) => h('li', null, x)))),
    h('section', { class: 'secao' }, h('h2', null, t('ui.sobre.bibliotecas')), BIBLIOTECAS.map(fonteItem)),
    h('p', { class: 'pequeno mudo' }, t('ui.sobre.rodape'), h('a', { href: '/quimica/privacidade' }, t('ui.sobre.privacidade')), '.'));
  return { titulo: t('ui.sobre.titulo'), node: no };
}
