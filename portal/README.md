# Portal — a home de saibatudo.net

Projeto próprio (Vercel `saibatudo-portal`, https://saibatudo-portal.vercel.app), servido em **https://saibatudo.net/**
pelo proxy do projeto de eleições (`apps/eleicoes2026/vercel.json`: `/`, `/sw.js`, `/manifest.webmanifest`, `/portal/*` e
as páginas por idioma `/en`, `/en/`, `/en/*`, idem `es`, `de`, `fr`). Os apps: `/eleicoes2026/` é do próprio projeto de eleições; `/quimica`, `/quimica/`, `/quimica/*`
(`saibatudo-quimica`) e `/achavagaia`, `/achavagaia/`, `/achavagaia/*` (`saibatudo-achavagaia`, repositório privado: a home
não o linka) vão por proxy, no mesmo `vercel.json`.

- `src/index.html` — o **molde** da página (não é servido tal qual): `{{chave}}` recebe o texto do catálogo do idioma,
  `{{?chave}}…{{/chave}}` só entra se a chave não for vazia, `{{pagina.*}}` é calculado no build (lang, canônica, hreflang,
  seletor de idiomas) e `href="/quimica/"` ganha `?lang=<idioma>` fora do português (`/achavagaia/` **não** ganha: o app é só em
  português por enquanto; o `build.mjs` só reescreve `/quimica/`).
- `src/portal/i18n/` — `index.js` (lista de idiomas `pt-BR`, `en`, `es`, `de`, `fr` e caminhos) e um catálogo por idioma
  (`pt-BR.js` é a referência; os outros têm as mesmas chaves, conferidas por teste). **Só de build**: não vão para `dist/`.
- `src/portal/` — tudo o que a home usa, com cópias próprias (CSS, tema, ícones, marca, fonte Poppins com a licença OFL).
  `apps.js` é a configuração (Google Play, "Em breve" com traduções, `NUMEROS_QUIMICA` citados no cartão de química);
  `textos.js` tem os poucos textos que `home.js` cria em tempo de execução, por idioma.
  A home não depende de arquivo de nenhum app: o teste `test/portal.test.mjs` garante.
- `src/manifest.webmanifest` e `src/sw.js` (service worker de escopo `/`; as páginas por idioma seguem a regra da home:
  rede primeiro, cache se offline).
- `build.mjs` — copia `src/` para `dist/`, gera uma página por idioma (`dist/index.html` = pt-BR, `dist/en/index.html`, …)
  e preenche o service worker (versão = hash do conteúdo, lista de pré-cache com as cinco páginas, páginas por idioma).

```bash
node build.mjs                    # gera dist/
node --test test/*.test.mjs       # build, páginas por idioma, catálogos, independência, service worker, manifesto, vercel.json
vercel deploy --prod --yes        # publicação manual (normalmente: push na main → .github/workflows/portal-ci.yml)
```

## Idiomas
Uma página por idioma, gerada no build (contrato: `apps/quimica/docs/I18N.md` §2 e §5): `/` (pt-BR, padrão e `x-default`),
`/en/`, `/es/`, `/de/`, `/fr/`. Cada página tem `<html lang>`, título/descrição/Open Graph no idioma, `<link rel="alternate"
hreflang>` para as cinco + `x-default`, canônica própria, seletor de idiomas no topo (links simples, sem JS; idioma atual com
`aria-current`), o cartão de Química apontando para `/quimica/?lang=<idioma>`, o cartão de Eleições com o selo
"só em português" (o app de Eleições é só em português) e o cartão do AchaVagaIA com os selos "primeira versão em construção"
(todos os idiomas) e "só em português" (fora do português), apontando para `/achavagaia/` sem `?lang=`. Os números do cartão de química saem no formato do idioma
(`Intl.NumberFormat`), mantendo os ganchos `<span data-num>`. Na página em português, `home.js` mostra a quem não navega
em português um aviso de uma linha ("This page is also available in English", dispensável, lembrado em `localStorage`);
nunca redireciona.

### Como traduzir ou corrigir um texto
Edite `src/portal/i18n/<idioma>.js` (textos fixos da página), `src/portal/textos.js` (textos criados por `home.js`:
tema, "Em breve", Google Play, aviso de idioma) ou `traducoes` em `src/portal/apps.js` (cartões "Em breve"). Marcas
(`SaibaTudo`, `SaibaTudo — Eleições 2026`, `SaibaTudo — Química`, `SaibaTudo — AchaVagaIA`, `PubChem`, `Wikidata`) não se traduzem. Os catálogos
en/es/de/fr foram escritos por agente e estão marcados `revisao: 'pendente'`; depois da revisão por falante nativo, troque
para `'humana'`.

### Como adicionar um idioma
1. Crie `src/portal/i18n/<codigo>.js` com as mesmas chaves de `pt-BR.js` (`idioma`, `nomeNativo`, `ogLocale`,
   `revisao: 'pendente'` e todos os textos; mesmas marcas inline `<strong>`/`<em>`/`<a>` e os mesmos `{num:…}`).
2. Acrescente o código em `IDIOMAS` (`src/portal/i18n/index.js`), em `UI` e `AVISO` (`src/portal/textos.js`) e em
   `traducoes` de cada item de `EM_BREVE` (`src/portal/apps.js`).
3. Rota: em `apps/eleicoes2026/vercel.json`, as três regras de proxy (`/<codigo>`, `/<codigo>/` e `/<codigo>/:path*` →
   `https://saibatudo-portal.vercel.app/<codigo>/…`), fora do congelamento de eleições; valem depois do próximo
   `eleicoes-data-refresh.yml`. O service worker e o pré-cache acompanham sozinhos (o build lista as páginas).
4. `node --test test/*.test.mjs` aqui e `node --test "tests/*.test.mjs"` na raiz conferem catálogo, páginas, rotas e SW.

## Como adicionar um novo app à home
1. Cartão: os apps principais no ar (Eleições, Química e AchaVagaIA) são cartões fixos no `src/index.html`, com textos nos
   cinco catálogos (`src/portal/i18n/*.js`, mesmas chaves, conferidas por teste) e ícone em `src/portal/brand/svg/`. Outros
   apps: `src/portal/apps.js` (`APPS` para apps no ar, `EM_BREVE` para planejados, com `traducoes`).
2. Rota: se o app é outro projeto da Vercel, acrescente em `apps/eleicoes2026/vercel.json` as três regras de proxy
   (`/<app>`, `/<app>/` e `/<app>/:path*` — a barra final é literal) fora do congelamento de eleições.
3. Service worker: inclua o prefixo do app nas exclusões de `src/sw.js` (cache-primeiro aqui prenderia arquivos antigos).
4. `node --test "tests/*.test.mjs"` na raiz do repositório confere as três coisas juntas.
5. Destaque igual para todos os apps no ar: no `index.html`, um botão no hero com a mesma classe (`btn btn-ouro grande`) e um
   cartão `card app-principal` com o mesmo botão `btn btn-primario grande` (decisão do mantenedor, 12/10/2026: nenhum app
   com cor ou destaque diferente dos outros). O teste da home confere os botões do topo e dos cartões nas cinco páginas.
6. App só em português (como Eleições e AchaVagaIA): selo "só em português" nos idiomas que não são pt-BR e link **sem**
   `?lang=` (só o `/quimica/` é reescrito pelo `build.mjs`).
