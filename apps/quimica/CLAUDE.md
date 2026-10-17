# SaibaTudo Química — guia para agentes de código

> **Repositório único (11/10/2026).** Este app vive em `apps/quimica/` do repositório `franciscoaleixoIOT/SaibaTudo`
> (o antigo `SaibaTudo-Quimica` foi incorporado com todo o histórico e arquivado). Rode os comandos daqui. Workflows na
> raiz: `.github/workflows/quimica-*.yml`; segredos `DATA_SIGNING_KEY_QUIMICA`, `VERCEL_PROJECT_ID_QUIMICA` e
> `VERCEL_TOKEN_TIME` (token do time inteiro, criado em 11/10; publica este app e a home). O app de eleições, que era o molde, está em `../eleicoes2026/`. Guia da raiz: [`../../CLAUDE.md`](../../CLAUDE.md).

Segundo app do ecossistema SaibaTudo (o primeiro é o **SaibaTudo Eleições 2026**, em `../eleicoes2026`, que é o **molde**: mesma estrutura, mesmos padrões de teste,
mesmo pipeline de publicação; leia o `CLAUDE.md` e o `docs/PROJECT_MEMORY.md` de lá quando precisar de um padrão).
**Idiomas (12/10/2026):** português do Brasil é o padrão; o app fala também **inglês, espanhol, alemão e francês** — todo texto que o
usuário lê passa pelos catálogos (`web/src/quimica/js/i18n/catalogos/`), todo padrão do interpretador vem do léxico compartilhado
(`contracts/lexico/<idioma>.json`, gerado para o site por `tools/gerar_lexico.py`) e dados no idioma vêm do pacote (nunca tradução no
cliente). Contrato completo: [`docs/I18N.md`](docs/I18N.md). Nunca escreva texto fixo em português no código do site.

**Leia antes de codar:** `docs/ARCHITECTURE.md` (princípios, fluxo, modelo, desenho), `docs/DATA_CONTRACT.md` (esquemas), `docs/FONTES_E_LICENCAS.md` (o que pode entrar),
`docs/PLANO.md` (fases e divisão por agente).

## Regras que não se negociam
1. **Só fontes com licença de reuso** (PubChem, CODATA, Wikidata, Wikipédia/Wikilivros CC BY-SA, ICSC, fatos da IUPAC; **OpenStax e LibreTexts só como link** — CC BY-NC-SA e cláusula anti-IA, ver `docs/FONTES_E_LICENCAS.md` §4). Os livros da pasta `LivrosQuimica`
   do projeto irmão são **obras protegidas**: nunca extrair texto, tabelas ou exercícios deles para o repositório, o dataset ou o modelo. Fonte sem licença = só link.
2. **Nenhum número sai do modelo.** Massa, constante, propriedade, perigo: do pacote assinado ou de cálculo local testado. O texto gerado é rotulado e verificado.
3. **Segurança química.** Rotas de síntese/purificação de explosivos, armas químicas, drogas ilícitas e precursores, ou "como fazer em casa" com reagentes perigosos são
   **recusadas por regra antes de qualquer modelo** (`seguranca.js` ↔ `Seguranca.kt`, casos em `contracts/seguranca_cases.json`). Perigos, EPI e primeiros socorros (ICSC/GHS)
   são respondidos normalmente.
4. **Cada resposta traz a fonte e a licença.** "Sobre os dados" lista tudo.
5. **Sem CDN, CSP estrita, sem analytics, sem anúncios, sem login.** Bibliotecas vendorizadas em `web/src/quimica/vendor/` com a licença ao lado (SmilesDrawer e KaTeX: MIT).
6. **Segredos em `secrets/`** (ignorado). A chave privada dos dados é `secrets/data_signing_key.pem` (**diferente** da do app de eleições); pública em `pipeline/data_signing_public.pem`.
7. **Treino e conversão de modelo são locais**; o Hugging Face é a publicação principal e o Modal, a reserva.
8. **Android:** release assinado com `keystore.properties` + `secrets/upload-keystore.p12` (fora do Git; criados em 14/10/2026). `./gradlew.bat :app:bundleRelease` + `python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk` antes de enviar; `docs/PLAY_STORE.md` e `docs/RELEASE_<versão>.md`.

## Publicar
- Push na `main` **não** faz deploy: `gh workflow run quimica-data-refresh.yml` publica; conferir `https://saibatudo.net/quimica/api/health` depois.
- Conferir **todos** os workflows depois de cada push (`gh run list --limit 6`).
- Home do saibatudo.net: o cartão deste app é um objeto em `web/src/assets/apps.js` do projeto irmão; a rota `/quimica/*` é um *rewrite* no `vercel.json` de lá para este projeto.

## Testar
`cd web && npm test` · `cd api && npm test` · `python -m unittest discover -s pipeline/tests` · `python -m unittest discover -s dataset -p "test_*.py"` ·
`python tools/test_workflows.py` · Android (fase 6): `./gradlew.bat testDebugUnitTest lintRelease` com `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`.
Antes de dizer "corrigido": reproduza, corrija, meça de novo (varredura de todos os elementos/compostos, comparação antigo × novo) e teste ao vivo depois do deploy.

## Armadilhas desta máquina (Windows 11, Git Bash)
`MSYS_NO_PATHCONV=1` para argumentos que começam com `/` · scripts longos: gravar arquivo e executar, não heredoc · `wsl --shutdown` depois de usar o WSL · treino de
GPU: impedir a suspensão do Windows · `printf '%s'` ao gravar variáveis na Vercel · `git pull --rebase` quando o robô de dados tiver comitado.
