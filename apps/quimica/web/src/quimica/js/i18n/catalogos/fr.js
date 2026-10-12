// Catálogo fr: ANDAIME da etapa D (docs/I18N.md §9). Até a tradução, herda os textos do inglês (mesmas chaves do pt-BR, conferidas por teste)
// e troca só o que é próprio do idioma (nomes dos idiomas, conjunção das listas, locale do Open Graph). Marcado 'pendente' até revisão humana.
import en from './en.js';

export default {
  ...en,
  revisao: 'pendente',
  copiaDe: 'en',
  regras: { minusculaNoMeio: true },
  ui: {
    ...en.ui,
    idiomas: { 'pt-BR': 'portugais', en: 'anglais', es: 'espagnol', de: 'allemand', fr: 'français' },
    listas: { e: ' et ' },
    html: { ...en.ui.html, ogLocale: 'fr_FR' }
  }
};
