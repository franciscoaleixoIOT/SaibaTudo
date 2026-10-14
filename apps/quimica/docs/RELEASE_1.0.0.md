# Versão 1.0.0 (versionCode 1): primeira versão do app Android para o teste fechado na Play

Primeira versão do **SaibaTudo Química** no Android (`net.saibatudo.quimica`, `minSdk 24`, `targetSdk 37`). Tem o mesmo motor de respostas
do site: NLU local por regras, respostas montadas só com os dados do pacote assinado ou com cálculo local, e fonte e licença em cada resposta.
Os textos estão em cinco idiomas (pt-BR, en, es, de, fr). Detalhes técnicos em [`../app/README.md`](../app/README.md).

## O que tem
1. **Assistente local.** Pergunta em linguagem natural sobre elementos, compostos, propriedades, massa molar, balanceamento, estequiometria,
   concentração, pH, gás ideal, conversão de unidades, nomenclatura, estrutura 2D, comparação, tabela periódica, segurança/GHS e conceitos.
   Pedido perigoso (síntese de explosivos, armas químicas, drogas) é recusado por regra (`Seguranca.kt`) antes de qualquer outra coisa.
2. **IA na nuvem: opcional e só para interpretar.** Toda resposta que não é recusa nem veio da nuvem tem o botão **"Perguntar à IA na nuvem"**,
   com uma nota de consentimento que diz o que sai do aparelho. Também há a opção **Configurações > IA na nuvem automática**, desligada por
   padrão, que vale só para perguntas que o app não entendeu. O app envia apenas o texto da pergunta (até 300 caracteres) e um identificador
   aleatório da instalação (UUID v4) para `https://saibatudo.net/quimica/api/nlu`. O modelo devolve só a intenção e as entidades. O app confere
   cada entidade nos dados locais (o símbolo existe e está escrito na pergunta; o composto se resolve no dicionário do pacote; a propriedade é um
   id conhecido; a unidade é conhecida e o número está escrito na pergunta). Depois monta a resposta no aparelho com o rótulo
   "IA na nuvem • interpretação; dados do pacote". **Nenhum número vem do modelo.** Os estados possíveis são "Consultando a IA na nuvem…" e,
   quando falha, o motivo: desligada, limite atingido, indisponível ou demorou (tempo máximo de 25 s), não entendeu, entendeu do mesmo jeito,
   ou resposta fora do formato. Quando a nuvem sugere outro nome de composto, ele aparece em "Você quis dizer:".
3. **Telas.** Tabela periódica interativa, fichas de elemento e composto (estrutura 2D local com SmilesDrawer, pictogramas GHS, link ICSC),
   busca, calculadoras com passos, segurança/GHS, "Sobre os dados", privacidade e configurações (idioma, tema, tamanho do texto, nível,
   economia de dados, IA na nuvem automática).
4. **Dados embutidos e atualização assinada.** O pacote real `20261012T171653Z-3b8afa4f320b` vem embutido (1.971 compostos, textos em cinco
   idiomas), então o app funciona sem internet desde a primeira vez. A atualização semanal é assinada (ECDSA P-256), com anti-rollback e troca
   atômica.
5. **Ícone da marca.** O ícone vem de `brand/quimica-icon.svg` (frasco branco, líquido verde, bolhas douradas sobre o azul #0C2340). É um ícone
   adaptativo vetorial e tem versão monocromática para o ícone temático do Android 13+. Ele substitui o Erlenmeyer provisório.
6. **Privacidade.** A página de Privacidade e o aviso do Início passaram a dizer "Nada sai do seu aparelho, a menos que você peça à IA na nuvem".
   Eles explicam o que é enviado, o identificador aleatório e que o servidor não registra a pergunta em log (só um cache temporário em memória).

## Como foi testado (14/10/2026)
- `./gradlew.bat :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease`:
  - **152 testes, 0 falhas.** Entre eles, os 28 novos de `CloudNluTest`, que cobrem: o validador (entidades aceitas e descartadas, fora do
    vocabulário, intenção sem a entidade exigida, tipos inesperados, a recusa local que vence a nuvem); o cliente com MockWebServer (200,
    `503 disabled`, `503 budget`, 429, 400/502, tempo esgotado, JSON malformado); e o assistente (resposta local com origem NUVEM, motivos de
    falha, sugestões, pedido perigoso que não sai do aparelho, `iid` UUID v4 estável).
  - **Lint de release sem erro.** Ficam 19 avisos, todos de versões novas de dependências (`GradleDependency`/`NewerVersionAvailable`).
- `python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk` deu **OK**. As 5 classes obrigatórias estão presentes
  (`WorkDatabase_Impl`, `MainActivity`, `SaibaTudoApp`, `DataUpdateWorker`, `BundleManifest`). O pacote embutido está completo, com a mesma
  versão de `data/quimica/` e sem o fixture. Os testes do verificador (`python -m unittest tools.test_verificar_release`) passam: 16, incluindo
  os 2 que leem o APK real.
- **Assinatura:** `jarsigner -verify` no AAB deu "jar verified." e `apksigner verify` no APK confirmou o esquema v2 com 1 signatário (chave de
  upload).
- **Emulador Pixel 9 (Android 15, API 35), APK de release assinado e em inglês (o idioma do emulador):**
  - O app abriu a frio em cerca de 1,2 s sem crash. Apareceram a tela inicial, as sugestões e o novo aviso de privacidade.
  - A resposta "Melting point of Hydrogen" saiu com fonte e licença.
  - O botão "Ask the cloud AI" consultou a API de produção. A nuvem interpretou do mesmo jeito, e o app manteve a resposta e avisou.
  - Para "at what temperature does iron turn into a liquid", o app respondeu localmente o "estado físico" (desvio do NLU local). A nuvem
    (`nlu-v3.3-20261013`) devolveu `DESCONHECIDA`, então o app manteve a resposta e mostrou o aviso. Confirmado com `curl` na mesma API.
- **Não testado:** aparelho real. Também não foi visto no aparelho o caso em que a nuvem troca a resposta (coberto só em teste unitário) nem a
  opção automática. Ficaram de fora o modo escuro do ícone num launcher real e os idiomas pt-BR, es, de e fr no aparelho (só os testes
  `I18nStringsTest`/`RespostasIdiomaTest`). As traduções novas (`nuvem_*`, `ui_config_nuvem_*`, privacidade) são de agente e esperam revisão de
  falante nativo.

## Arquivos para o console
- AAB: `apps/quimica/app/build/outputs/bundle/release/app-release.aab` (7,6 MB). A Play deve mostrar **1 (1.0.0)**.
- APK para teste direto: `apps/quimica/app/build/outputs/apk/release/app-release.apk` (5,4 MB).
- Ícone da ficha: `apps/quimica/brand/png/play-icon-512.png`.

## Notas da versão (texto para o console)
Primeira versão do SaibaTudo Química: pergunte sobre elementos, compostos e cálculos e receba respostas montadas no aparelho com dados
abertos (PubChem, Wikidata e outras fontes), sempre com a fonte. Tem tabela periódica, fichas com estrutura 2D e pictogramas GHS, e
calculadoras com passo a passo. Funciona sem internet. A IA na nuvem é opcional: só interpreta a pergunta quando você pede, e os números
vêm sempre dos dados do app. Em português, inglês, espanhol, alemão e francês.

## Data Safety (Play), para conferir no console
- **Coletado e compartilhado:** nada que identifique a pessoa.
- **O que é enviado sob demanda:** quando a pessoa pede (botão ou opção automática), o texto da pergunta e um identificador aleatório da
  instalação vão para saibatudo.net. Servem só para interpretar a pergunta e aplicar o limite de uso. O servidor não os associa a ninguém e
  não grava a pergunta em log. No formulário, provavelmente entra como "Mensagens/outro conteúdo do usuário: processado de forma efêmera,
  opcional" e "IDs do dispositivo ou outros: identificador do app, opcional". Confirmar no console.
- O tráfego é só HTTPS. Não há login, anúncios, análise de uso nem localização.

## Pendências
1. **Mantenedor:** enviar o AAB ao teste fechado, preencher a ficha e o Data Safety (acima) e testar num aparelho real.
2. **Modelo de NLU na nuvem:** perguntas como "at what temperature does iron turn into a liquid" voltam `DESCONHECIDA` na v3.3. Elas entram
   no próximo ciclo de dados e treino (`docs/MODELO.md`).
3. **Paridade com Eleições ainda pendente** (`PENDENCIAS.md` §8.4): limpar o campo ao enviar, setas ▲▼ do histórico, "Relatar problema",
   captura opt-in "Ajudar a melhorar o app" e o botão de explicação gerada (`/api/ask`). Os desvios conhecidos do NLU local (§6) também
   continuam.
4. **Site:** a web da Química ainda diz que a nuvem "não está disponível" (outro agente cuida de `web/`). Para manter a paridade, o site deve
   ganhar o mesmo opt-in.
5. Teste instrumentado mínimo (Compose) e revisão das traduções novas por falante nativo.
