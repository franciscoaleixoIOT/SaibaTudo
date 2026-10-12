// Idiomas do app (BCP 47, docs/I18N.md). Módulo sem dependências, para prefs.js e i18n/index.js compartilharem a lista sem importação circular.
export const IDIOMAS = ['pt-BR', 'en', 'es', 'de', 'fr'];
export const IDIOMA_PADRAO = 'pt-BR';

/** Nome de cada idioma no próprio idioma (endônimo): igual em todos os catálogos. */
export const NOMES_IDIOMAS = { 'pt-BR': 'Português (Brasil)', en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français' };

/** "pt", "pt-br", "PT-PT" → "pt-BR"; "en-US" → "en"; desconhecido → null. */
export function normalizarIdioma(x) {
  const s = String(x ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'pt-br' || s === 'pt' || s.startsWith('pt-')) return 'pt-BR';
  const base = s.split('-')[0];
  return IDIOMAS.includes(base) ? base : null;
}
