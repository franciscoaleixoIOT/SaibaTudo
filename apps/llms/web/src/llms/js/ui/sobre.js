// "Sobre os dados": fonte e licença dos vetores (GloVe, PDDL 1.0), versão e assinatura do pacote, referências, licenças do código e da IA,
// estado da revisão das traduções. Tudo pelo catálogo; números pelo formatador do idioma.
import { REFERENCIAS } from '../conteudo/index.js';
import { h, icon } from '../dom.js';
import { CATALOGOS, IDIOMAS, NOMES_IDIOMAS, fmtData, fmtNumero, t, tl } from '../i18n/index.js';
import { kvEl, linkExterno } from './componentes.js';

export const LICENCAS = [
  { nome: 'GloVe 6B (Wikipedia 2014 + Gigaword 5), 50d', licenca: 'PDDL 1.0', url: 'https://nlp.stanford.edu/projects/glove/' },
  { nome: 'SaibaTudo LLMs (código, textos e glossário)', licenca: 'MIT', url: 'https://github.com/franciscoaleixoIOT/SaibaTudo' },
  { nome: 'Qwen3-4B-Instruct-2507 (IA na nuvem, opcional)', licenca: 'Apache 2.0', url: 'https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507' },
  { nome: 'Poppins (fonte)', licenca: 'OFL 1.1', url: 'https://fonts.google.com/specimen/Poppins' }
];

export function viewSobreDados({ vetores }) {
  const m = vetores?.manifesto;
  const dados = m ? kvEl([
    { rotulo: t('ui.sobre.fonte'), valor: m.vetores?.nome ?? 'GloVe' },
    { rotulo: t('ui.sobre.licenca'), valor: m.vetores?.licenca ?? 'PDDL 1.0' },
    { rotulo: t('ui.sobre.palavras'), valor: fmtNumero(vetores.n, { casas: 0 }) },
    { rotulo: t('ui.sobre.dimensoes'), valor: String(vetores.dimensoes) },
    { rotulo: t('ui.sobre.quantizacao'), valor: m.vetores?.quantizacao ?? 'int8' },
    { rotulo: t('ui.sobre.versaoPacote'), valor: m.version },
    { rotulo: t('ui.sobre.geradoEm'), valor: fmtData(m.generatedAt, { comHora: true }) ?? m.generatedAt },
    { rotulo: t('ui.config.assinatura'), valor: t(`ui.config.assinaturaValor.${vetores.sig?.estado ?? 'indisponivel'}`) }
  ]) : h('p', { class: 'mudo' }, t('ui.config.semDados'));
  const revisao = IDIOMAS.map((i) => `${NOMES_IDIOMAS[i]}: ${t(`ui.sobre.revisao.${CATALOGOS[i].revisao}`)}`);
  return { titulo: t('ui.sobre.titulo'), node: h('div', { class: 'tela-corpo' },
    h('h1', { id: 'titulo-pagina', tabindex: '-1' }, t('ui.sobre.titulo')),
    h('p', { class: 'sub-pagina' }, t('ui.sobre.subtitulo')),
    h('div', { class: 'grupo' }, t('ui.sobre.vetores')), dados,
    h('p', { class: 'pequeno' }, t('ui.sobre.ingles')),
    h('div', { class: 'grupo' }, t('ui.sobre.comoCalcula')),
    h('ul', { class: 'lista-pontos' }, tl('ui.sobre.calculos').map((x) => h('li', null, x))),
    h('div', { class: 'grupo' }, t('ui.sobre.ia')),
    h('p', { class: 'pequeno' }, t('ui.sobre.iaTexto')),
    h('div', { class: 'grupo' }, t('ui.sobre.referencias')),
    h('ul', { class: 'lista-pontos pequeno' }, Object.values(REFERENCIAS).map((r) => h('li', null, r.texto, ' ', linkExterno(r.url, t('ui.aprenda.link'))))),
    h('div', { class: 'grupo' }, t('ui.sobre.licencas')),
    h('ul', { class: 'lista-pontos pequeno' }, LICENCAS.map((l) => h('li', null, linkExterno(l.url, l.nome), ` — ${l.licenca}`))),
    h('div', { class: 'grupo' }, t('ui.sobre.traducoes')),
    h('ul', { class: 'lista-pontos pequeno' }, revisao.map((x) => h('li', null, x))),
    h('p', { class: 'mini mudo' }, icon('github', 14), ' ', linkExterno('https://github.com/franciscoaleixoIOT/SaibaTudo/tree/main/apps/llms', t('ui.sobre.codigo')))) };
}
