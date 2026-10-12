// Idiomas da home (contrato: apps/quimica/docs/I18N.md §2 e §5). Usado só no build e nos testes: NÃO vai para dist/.
// Para adicionar um idioma: crie portal/src/portal/i18n/<codigo>.js com as mesmas chaves de pt-BR.js (o teste confere),
// acrescente o código aqui, as três regras de proxy em apps/eleicoes2026/vercel.json (ver portal/README.md) e os textos
// de execução em portal/src/portal/home.js (UI e AVISO) e as traduções de EM_BREVE em apps.js.
export const IDIOMAS = ['pt-BR', 'en', 'es', 'de', 'fr'];
export const PADRAO = 'pt-BR';
export const ORIGEM = 'https://saibatudo.net';

/** Caminho da página do idioma no site: '/' para o padrão, '/en/' para os demais (a barra final é literal no proxy). */
export const caminho = (idioma) => (idioma === PADRAO ? '/' : `/${idioma}/`);

/** Pasta de saída relativa a dist/ ('' para o padrão, 'en' para os demais). */
export const pasta = (idioma) => (idioma === PADRAO ? '' : idioma);
