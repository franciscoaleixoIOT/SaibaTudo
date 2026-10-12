# App Android — SaibaTudo Química (v0)

Kotlin + Jetpack Compose (Material 3), MVVM, DataStore, WorkManager, OkHttp, Gson. Pacote `net.saibatudo.quimica`, `versionName 1.0.0`
(`versionCode 1`), `minSdk 24`. Molde: o app do SaibaTudo Eleições 2026.

**O que faz:** início com campo de pergunta (NLU local, respostas só dos dados com fonte), tabela periódica interativa, ficha do elemento e do
composto (estrutura 2D numa WebView local com SmilesDrawer, GHS com pictogramas vetoriais, link da ficha ICSC no site da OIT), busca,
calculadoras com passos (massa molar, balanceamento, estequiometria, concentração/diluição, pH forte e fraco, gás ideal, unidades),
segurança/GHS, "Sobre os dados", privacidade e configurações (tema, tamanho do texto, nível). Nesta versão **nada do usuário sai do aparelho**:
a internet serve só para a atualização assinada do pacote de dados; a IA na nuvem aparece como "ainda não disponível".

## Construir

Pré-requisitos: JDK do Android Studio e SDK em `%LOCALAPPDATA%\Android\Sdk` (`local.properties`).

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
./gradlew.bat testDebugUnitTest lintDebug     # testes e lint
./gradlew.bat assembleDebug                    # app/build/outputs/apk/debug/app-debug.apk
./gradlew.bat assembleRelease lintRelease      # R8 ligado (regras em app/src/main/keepRules/rules.keep)
```

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

A chave de upload será criada pelo mantenedor. Crie `keystore.properties` na raiz (**fora do Git**, já está no `.gitignore`):

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
