// Textos que a home cria em tempo de execução (home.js), por idioma da página (<html lang>). Os textos fixos da página vêm
// do build (src/portal/i18n/<idioma>.js). Mesmas chaves em todos os idiomas; pt-BR é a referência (o teste confere).
// Traduções en/es/de/fr por agente (12/10/2026); revisão por falante nativo pendente.
export const UI = {
  'pt-BR': { abrir: (n) => `Abrir ${n}`, play: 'Baixar na Google Play', emBreve: 'Em breve', repo: 'Repositório sugerido: ', tema: { SISTEMA: 'seguir o sistema', CLARO: 'claro', ESCURO: 'escuro' }, temaAria: (r) => `Tema: ${r}. Toque para alternar entre sistema, claro e escuro.`, temaTitulo: (r) => `Tema: ${r}`, temaRot: { SISTEMA: 'Auto', CLARO: 'Claro', ESCURO: 'Escuro' } },
  en: { abrir: (n) => `Open ${n}`, play: 'Get it on Google Play', emBreve: 'Coming soon', repo: 'Suggested repository: ', tema: { SISTEMA: 'follow the system', CLARO: 'light', ESCURO: 'dark' }, temaAria: (r) => `Theme: ${r}. Tap to switch between system, light and dark.`, temaTitulo: (r) => `Theme: ${r}`, temaRot: { SISTEMA: 'Auto', CLARO: 'Light', ESCURO: 'Dark' } },
  es: { abrir: (n) => `Abrir ${n}`, play: 'Descargar en Google Play', emBreve: 'Próximamente', repo: 'Repositorio sugerido: ', tema: { SISTEMA: 'seguir el sistema', CLARO: 'claro', ESCURO: 'oscuro' }, temaAria: (r) => `Tema: ${r}. Toca para alternar entre sistema, claro y oscuro.`, temaTitulo: (r) => `Tema: ${r}`, temaRot: { SISTEMA: 'Auto', CLARO: 'Claro', ESCURO: 'Oscuro' } },
  de: { abrir: (n) => `${n} öffnen`, play: 'Bei Google Play laden', emBreve: 'Demnächst', repo: 'Vorgeschlagenes Repository: ', tema: { SISTEMA: 'dem System folgen', CLARO: 'hell', ESCURO: 'dunkel' }, temaAria: (r) => `Design: ${r}. Tippen Sie, um zwischen System, Hell und Dunkel zu wechseln.`, temaTitulo: (r) => `Design: ${r}`, temaRot: { SISTEMA: 'Auto', CLARO: 'Hell', ESCURO: 'Dunkel' } },
  fr: { abrir: (n) => `Ouvrir ${n}`, play: 'Télécharger sur Google Play', emBreve: 'Bientôt', repo: 'Dépôt suggéré : ', tema: { SISTEMA: 'suivre le système', CLARO: 'clair', ESCURO: 'sombre' }, temaAria: (r) => `Thème : ${r}. Touchez pour alterner entre système, clair et sombre.`, temaTitulo: (r) => `Thème : ${r}`, temaRot: { SISTEMA: 'Auto', CLARO: 'Clair', ESCURO: 'Sombre' } }
};

/** Aviso mostrado só na página em português a quem navega em outro idioma da home (texto no idioma oferecido). */
export const AVISO = {
  en: { texto: 'This page is also available in English', fechar: 'Dismiss' },
  es: { texto: 'Esta página también está disponible en español', fechar: 'Cerrar' },
  de: { texto: 'Diese Seite gibt es auch auf Deutsch', fechar: 'Schließen' },
  fr: { texto: 'Cette page est aussi disponible en français', fechar: 'Fermer' }
};
