# App Android — SaibaTudo Química (1.0.0)

Kotlin + Jetpack Compose (Material 3), MVVM, DataStore, WorkManager, OkHttp, Gson. Pacote `net.saibatudo.quimica`, `versionName 1.0.0`
(`versionCode 1`), `minSdk 24`. Molde: o app do SaibaTudo Eleições 2026.

**O que faz:** início com campo de pergunta (NLU local, respostas só dos dados com fonte), tabela periódica interativa, ficha do elemento e do
composto (estrutura 2D numa WebView local com SmilesDrawer, GHS com pictogramas vetoriais, link da ficha ICSC no site da OIT), busca,
calculadoras com passos (massa molar, balanceamento, estequiometria, concentração/diluição, pH forte e fraco, gás ideal, unidades),
segurança/GHS, "Sobre os dados", privacidade e configurações (idioma, tema, tamanho do texto, nível, economia de dados, IA na nuvem automática).
**Nada sai do aparelho, a menos que a pessoa peça à IA na nuvem**: a internet serve para a atualização assinada do pacote de dados e, só com
consentimento, para a interpretação na nuvem (abaixo).

**Estado (14/10/2026):** versão **1.0.0 (versionCode 1)** pronta para o teste fechado na Play — IA na nuvem opt-in (só interpretação), ícone da
marca, release assinado com R8 e verificador de release. Notas e como foi testado: [`../docs/RELEASE_1.0.0.md`](../docs/RELEASE_1.0.0.md).

## IA na nuvem (opt-in, só interpretação)

Molde: `apps/eleicoes2026/.../ai/nlu/CloudNlu.kt` e `HybridAiInferenceEngine.kt`. Contrato do servidor em `../api/README.md` (§ `POST /api/nlu`).
- **Quando sai algo do aparelho:** só no toque em "Perguntar à IA na nuvem" (embaixo de toda resposta que não é recusa nem já veio da nuvem; o texto da
  nota muda se a resposta foi ou não entendida) ou com **Configurações > IA na nuvem automática** ligada (desligada por padrão; só nas perguntas
  que o app não entendeu). Pedido perigoso (`Seguranca.kt`) nunca sai do aparelho.
- **O que sai:** `POST <API_BASE_URL>nlu` com `{"q": <até 300 caracteres>, "v": 1, "client": "android", "iid": <UUID v4 aleatório da instalação>}`.
  O `iid` é criado no primeiro pedido e guardado no DataStore (`id_instalacao`); a chave automática é `ia_nuvem_automatica`.
- **Nenhum número vem do modelo.** `ai/nlu/CloudNlu.kt`: `CloudNluClient` (200 → `Ok`; `503 disabled` → desligada; `429`/`503 budget` → limite;
  rede/tempo/5xx/4xx → indisponível; JSON fora do contrato → inválida) e `NluValidator`, que revalida cada entidade nos dados LOCAIS
  (símbolo existe no pacote e está escrito na pergunta; composto copiado da pergunta e resolvido no dicionário local, CID de `resolucao` só se
  existir no pacote, fórmula válida; propriedade com id conhecido; unidade conhecida e número escrito na pergunta; equação com espécies da
  pergunta; nível válido). Fora do vocabulário = descartado; intenção que exige entidade sem a entidade = não confiável. A segurança local vence.
- `ai/engine/AssistenteNuvem.kt` junta a interpretação validada com a local, monta a resposta no `AnswerBuilder` com `OrigemResposta.NUVEM`
  (rótulo "IA na nuvem • interpretação; dados do pacote") e devolve o motivo da falha (`FalhaNuvem`: desligada, limite, indisponível, não entendeu,
  mesma interpretação, inválida). Sugestões de `resolucao.composto.sugestoes` (só CIDs do pacote) viram perguntas reescritas ("Você quis dizer:").
- Tempo: **25 s** no pedido explícito (o serviço leva até ~22 s na partida a frio) e 14 s no automático (`callTimeout` por pedido).
- UI: `ui/components/NuvemView.kt` (botão, nota de consentimento, "Consultando a IA na nuvem…", motivo da falha); textos `nuvem_*`,
  `origem_nuvem`, `ui_origem_nuvem`, `ui_config_nuvem_*` e a página de Privacidade nos cinco idiomas.
- Testes: `CloudNluTest` (validador: aceitas/descartadas, fora do vocabulário, intenção sem entidade, tipos inesperados, recusa local; cliente com
  MockWebServer: 200, 503 disabled/budget, 429, 400/502, tempo esgotado, JSON malformado; assistente: resposta local com origem NUVEM, motivos, sugestões,
  pedido perigoso não sai; `iid` UUID v4 estável).

## Relatar problema nesta resposta

Rodapé de cada resposta (`ui/components/RespostaView.kt`): abre no navegador uma issue pública pré-preenchida no GitHub (`domain/Relato.kt`, `urlRelato`:
`BuildConfig.SOURCE_URL/issues/new?title=…&labels=quimica,resposta&body=…`, pergunta cortada em 80 no título; corpo com pergunta, intenção, origem
local/nuvem e versões do app e dos dados); nada sai sem o toque e a confirmação no GitHub; nunca em `RECUSA_PERIGO`. Textos `ui_relatar_resposta*`,
`relato_*`; testes em `RelatoTest`.

## Ícone

`res/drawable/ic_launcher_{background,foreground,monochrome}.xml` são a conversão direta de `../brand/quimica-icon.svg` (só polígonos e círculos;
vector drawable, sem PNG): fundo #0C2340 com a faixa #143A66, frasco branco, líquido #22C55E e bolhas #FFB81C, escala 0,774 para caber na zona
segura do ícone adaptativo; o monocromático (ícone temático do Android 13+) é a silhueta com o nível do líquido vazado. Ícone da ficha da Play:
`../brand/png/play-icon-512.png`.

## Construir

Pré-requisitos: JDK do Android Studio e SDK em `%LOCALAPPDATA%\Android\Sdk` (`local.properties`).

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
./gradlew.bat testDebugUnitTest lintDebug     # testes e lint
./gradlew.bat assembleDebug                    # app/build/outputs/apk/debug/app-debug.apk
./gradlew.bat assembleRelease lintRelease      # R8 ligado (regras em app/src/main/keepRules/rules.keep)
./gradlew.bat :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease   # release completo (Play)
python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk                # classes do R8 + pacote embutido
```

`tools/verificar_release.py` (testes: `python -m unittest tools.test_verificar_release`) lê o DEX do APK e confere as classes criadas por reflexão
(`WorkDatabase_Impl`, `MainActivity`, `SaibaTudoApp`, `DataUpdateWorker`, `BundleManifest`), os assets da estrutura 2D e o pacote de dados embutido:
todos os arquivos do manifesto com o tamanho declarado, versão igual à de `data/quimica/manifest.json` e nunca o fixture.

Os testes leem arquivos reais fora do módulo: `contracts/*.json` (NLU e segurança, compartilhados com o site) e `pipeline/data_signing_public.b64`;
`inputs.files` declara `contracts` e `data` para o Gradle não pular testes quando eles mudam. Sem `data/quimica/`, os testes de contrato usam o
fixture (`app/src/test/resources/data-quimica`, assinado com a chave do projeto) e só os casos cujas entidades ele tem; com o pacote real, valem todos.

## Dados embutidos

Ordem de preferência do Gradle para os assets (`quimica/`):
1. `app/src/main/assets/quimica/` (copiado por `python app/tools/copiar_pacote_para_assets.py`; `--remover` desfaz);
2. `data/quimica/` do repositório (pacote real do pipeline, usado direto);
3. o fixture de testes (só para o app abrir antes de existir o pacote real; ele é rotulado como fixture nas fontes).

Outros utilitários em `app/tools/`: `gerar_fixture_pacote.py` (refaz e assina o fixture com `secrets/data_signing_key.pem`) e `gerar_ghs_kt.py`
(gera `domain/GhsTextos.kt` de `dataset/ghs_pt.py`, as mesmas frases H do site).

## Atualização de dados

`BundleLoader` lê o pacote embutido ou o baixado; `DataUpdater` baixa `manifest.json` + `manifest.sig`, verifica a assinatura ECDSA P-256 com a chave de
`pipeline/data_signing_public.b64` (embutida por BuildConfig), rejeita schema/versão incompatível e pacote mais antigo (anti-rollback), baixa só
o que mudou, confere sha256 e tamanho, e troca de forma atômica (`BundleStore`, com rollback para a versão anterior ou para o pacote embutido).
O WorkManager repete a verificação no intervalo `cliente.pollIntervalMinutes` do manifesto (semanal); o app também confere ao abrir.
Lotes de compostos (`compostos/index.json` → `compostos/<lote>.json`) são lidos sob demanda.

## Assinatura de release

A chave de upload existe desde 14/10/2026: `secrets/upload-keystore.p12` + `keystore.properties` na raiz do app (os dois **fora do Git**; nunca
copie o conteúdo para o chat, logs ou documentos). Formato do `keystore.properties`:

```properties
storeFile=caminho/para/upload.jks
storePassword=...
keyAlias=...
keyPassword=...
```

(ou as variáveis `SAIBATUDO_STORE_FILE`, `SAIBATUDO_STORE_PASSWORD`, `SAIBATUDO_KEY_ALIAS`, `SAIBATUDO_KEY_PASSWORD` no CI). Sem isso, `assembleRelease`
gera `app-release-unsigned.apk`.

## NLU e segurança

`ai/nlu/LocalNlu.kt` é o espelho de `web/src/quimica/js/nlu.js` (mesma ordem de regras, documentada no cabeçalho) e `ai/Seguranca.kt` de `seguranca.js`;
os casos de `contracts/nlu_golden_cases.json` e `contracts/seguranca_cases.json` conferem os dois. O dicionário é derivado dos dados do pacote.

## Idiomas (docs/I18N.md §6)

pt-BR é o padrão; o app fala também en, es, de e fr. **Seletor** em Configurações > Idioma (`ui/IdiomaApp.kt`: `LocaleManager` no Android 13+,
que também aparece em Configurações do sistema > Idiomas do app via `res/xml/locales_config.xml`; idioma aplicado ao contexto da Activity
antes disso); sem escolha, vale o primeiro idioma do sistema que o app fala. O idioma escolhido vai para o NLU, o dicionário e as respostas.
- **Léxico** (padrões do NLU e da segurança): `ai/nlu/lexico/Lexico<Idioma>.kt` + `LexicosGerados.kt` são **gerados** de
  `contracts/lexico/<idioma>.json` por `python tools/gerar_lexico_kt.py` (`--check` só confere; teste: `python -m unittest tools.test_gerar_lexico_kt`).
  Não edite à mão. `Lexico.kt` compila as regexes por idioma; `I18nTest` falha se o gerado ficou para trás do JSON e compila todas as regexes
  com `java.util.regex`. `Seguranca.kt` aplica o idioma ativo + en + pt-BR (autolesão primeiro).
- **Dados no idioma** vêm do pacote: `nomes[idioma]`, `sinonimosPorIdioma`, `compostos/index.json.nomesPorIdioma`, `regras.propriedades[id].rotulos`
  e `sinonimosPorIdioma`, `ghs_frases.json` `textoPorIdioma` (pt-BR continua com `GhsTextos`), `textos/index.json` + lotes (o pacote antigo, um arquivo
  por trecho, continua aceito). Reserva: inglês, depois português (`domain/Nomes.kt` marca a reserva).
- **Números**: `Quantidades.lerNumero(texto, idioma)` aceita vírgula e ponto (I18N §1.3).
- **Textos** (etapa "strings", 12/10/2026): TODO texto que o usuário lê está em `res/values/strings.xml` (pt-BR, a referência) e `res/values-en|es|de|fr/strings.xml`;
  o Kotlin não tem português fixo (símbolos, fórmulas, unidades e marcas ficam inline). Como se usa:
  - `domain/Textos.kt`: `Textos(idioma, fonte)`; `t(R.string.chave, arg…)`, `t.plural(R.plurals.chave, n, …)`, números no idioma (`t.num/fixo/sig/cient`),
    datas (`t.data`, `t.dataHora`), nomes de idiomas, `t.nomeRotulado(...)` (nome de reserva sai com o rótulo "(nome em inglês)") e `t.minusNoMeio` (alemão mantém a maiúscula).
  - **Uma só fonte de texto: o XML.** No aparelho, `ui/RecursosAndroid.kt` lê os `Resources` do idioma pedido (não o da Activity); nos testes de unidade
    (sem Android, sem Robolectric) `TestSupport.kt` (`RecursosXml`) lê os mesmos `strings.xml` do disco e resolve nome → id pela classe `R`. Não existe tabela paralela em Kotlin.
  - Telas (Compose): `LocalTextos.current` (fornecido por `MainAppScreen`). Respostas: `AnswerBuilder.t` = `dic.textos` (o dicionário nasce com os textos do idioma:
    `Dicionario.criar(pacote, textos)`). Calculadoras do domínio recebem `t` como primeiro parâmetro; erros são `CalculoInvalido(R.string.erro_…, args)` e o texto sai com `e.texto(t)`.
  - Enums com rótulo (`CategoriaElemento`, `EstadoFisico`, `TemaApp`, `TamanhoFonte`, `Nivel`, `TipoCalculadora`, `TipoForte`, `OrigemPacote`, `OrigemResposta`) guardam o id do recurso;
    `GhsPictogramas`, `ClassesCompostos` e `UnidadeNomes` ligam códigos/símbolos aos textos (nome do pictograma, classe do composto, nome da unidade).
  - Regras do `strings.xml`: `%1$s`/`%2$d` posicionais (a tradução pode reordenar); `%%` só em texto com parâmetros; sem espaço nas pontas (a marca de pontuação com espaço antes, como o ":" do francês, fica na chave);
    `<plurals>` só onde a forma muda (`one`/`other`); `translatable="false"` para marca e endônimos. Tom: tú (es), Sie (de), vous (fr); glossário em `docs/I18N.md` §8.
  - Testes: `I18nStringsTest` (mesmas chaves e mesmos parâmetros nos cinco idiomas, nenhum texto vazio nem longo igual ao pt-BR, reserva rotulada, números e datas por idioma) e
    `RespostasIdiomaTest` (casos do contrato por idioma, sem português vazando, recusa/"não entendi"/sugestões no idioma). O lint confere MissingTranslation/ExtraTranslation.
  - Revisão: as traduções iniciais são de agente (glossário fixo) e aguardam revisão de falante nativo (pendência a registrar em `docs/PENDENCIAS.md` §12).
- O AAB não separa idiomas (`bundle.language.enableSplit = false`): todas as strings precisam estar no aparelho para o seletor funcionar.
