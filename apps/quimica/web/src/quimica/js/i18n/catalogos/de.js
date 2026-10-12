// Catálogo de: ANDAIME da etapa D (docs/I18N.md §9). Até a tradução, herda os textos do inglês (mesmas chaves do pt-BR, conferidas por teste)
// e troca só o que é próprio do idioma (nomes dos idiomas, conjunção das listas, locale do Open Graph). Marcado 'pendente' até revisão humana.
// Em alemão os substantivos (nomes de elementos) ficam com maiúscula no meio da frase: minusculaNoMeio = false.
import en from './en.js';

export default {
  ...en,
  revisao: 'pendente',
  copiaDe: 'en',
  regras: { minusculaNoMeio: false },
  ui: {
    ...en.ui,
    idiomas: { 'pt-BR': 'Portugiesisch', en: 'Englisch', es: 'Spanisch', de: 'Deutsch', fr: 'Französisch' },
    listas: { e: ' und ' },
    html: { ...en.ui.html, ogLocale: 'de_DE' }
  }
};
