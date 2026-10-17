# Versão 1.0.1 (versionCode 2): paridade da caixa de pergunta, origem dos dados e "Ajudar a melhorar o app"

Segunda versão do **SaibaTudo Química** no Android (`net.saibatudo.quimica`, `minSdk 24`, `targetSdk 37`). Traz para o app o que o site e o
app de Eleições já tinham na caixa de pergunta (`docs/PADRAO_ASSISTENTE.md` §1 e §3), a captura opcional de perguntas não entendidas e o
assunto de CONCEITO igual ao do site. Detalhes técnicos em [`../app/README.md`](../app/README.md). Frente B do
[`PROGRAMA_2026-10-16.md`](PROGRAMA_2026-10-16.md).

## O que entra
1. **Campo limpo ao enviar.** A pergunta sai do campo e vai para o histórico (até 50 perguntas de até 300 caracteres, sem repetir a última, só no
   aparelho). Vale para o Enter, o botão de enviar, os chips de sugestão e as perguntas recentes.
2. **Histórico com ▲▼.** Cartão "Última pergunta" acima do campo com as setas, que percorrem o histórico e põem a pergunta no campo para
   editar ou reenviar; ▼ depois da última devolve o que estava sendo escrito. Mesmo comportamento do app de Eleições.
3. **Campo de 1 a 3 linhas, sem quebra de linha.** Enter envia; texto colado com quebras vira uma linha só.
4. **Estados do envio.** Botão X para limpar o texto (só com texto). Enviar desabilitado sem texto, sem pacote e enquanto responde; nesse tempo o
   botão vira um indicador "Analisando a pergunta…", anunciado ao leitor de tela. Chips e perguntas recentes ficam desabilitados enquanto
   responde, o que evita envio duplo.
5. **Origem + data dos dados em cada resposta.** "Resposta montada no seu aparelho • dados do pacote de 12 de out. de 2026", ou "…com a
   pergunta interpretada pela IA na nuvem (<modelo>) • …". A data é o `generatedAt` do manifesto no formato do idioma, o mesmo texto do site.
   A linha também vai no "Copiar resposta".
6. **"Ajudar a melhorar o app" (opcional, desligado por padrão).** É uma opção nova em Configurações. Ligada, as perguntas que o app não entendeu
   vão para `POST https://saibatudo.net/quimica/api/melhoria`, para uma pessoa revisar e ensinar o NLU. Desligada, a resposta não entendida mostra
   **"Enviar esta pergunta"** (consentimento só para ela). O envio leva só o texto, a intenção local, o idioma, a data (sem hora) e o
   identificador aleatório da instalação (o mesmo da IA na nuvem). Nunca saem do aparelho:
   - pedidos perigosos (a mesma regra de `Seguranca.kt` que recusa a resposta);
   - texto com e-mail, telefone, CPF/CNPJ, endereço de site, @usuário ou 9 ou mais dígitos seguidos.

   A fila fica no aparelho (até 30). O envio vai em lotes de 10 quando há pelo menos 3 perguntas, ou na hora, quando a pergunta veio do botão.
   Uma nova tentativa acontece ao voltar para o app. Respostas do servidor:
   - `503 disabled` e `429`: a fila é guardada, sem erro na tela;
   - `400`: o lote é descartado.

   Desligar a opção apaga a fila.
7. **"Apagar os dados deste aparelho"** (Configurações): apaga o histórico de perguntas, a fila e o consentimento do "Ajudar a melhorar o app",
   a IA na nuvem automática e o identificador aleatório. Tema, tamanho do texto, nível, idioma e economia de dados ficam.
8. **Privacidade.** A página ganhou o cartão "Ajudar a melhorar o app (opcional)": o que vai, por que fica guardado no servidor, o filtro e como
   apagar. Os textos "O que sai do aparelho" e "O que fica guardado" mencionam a opção.
9. **NLU igual ao do site:**
   - **Assunto de CONCEITO.** É calculado como no `limparConceito` do site ("o que é a massa molar" → "a massa molar"). A busca do texto licenciado
     usa um tema limpo (`LocalNlu.temaDoConceito`: "massa molar"), então a resposta não piora.
   - **Normalização (`Texto.nlu`).** Passou a trocar ß/œ/æ/ø e a usar NFKD, como `texto.js`. Antes, "Brønsted" virava "br nsted",
     "stœchiométrie" virava "st chiométrie" e "Fußball" virava "fu ball".
   - Os desvios antigos do §6 de `PENDENCIAS.md` ("licenças" → FONTES, "explique o que é massa molar" → CONCEITO, ordem composto/quantidade)
     já estavam resolvidos e iguais nos dois clientes; agora são cobertos por casos novos do golden.
10. **Textos novos nos cinco idiomas** (`ui_inicio_ultima_pergunta`, `ui_inicio_pergunta_*`, `ui_inicio_limpar_texto`, `ui_inicio_analisando`,
    `ui_resposta_origem_*`, `ui_resposta_dados_de`, `ui_melhoria_*`, `ui_config_melhoria_*`, `ui_config_apagar_dados*`, `ui_privacidade_melhoria_*`).
    Os textos de origem seguem os catálogos do site (`ui.resposta.origem*`, `dadosDe`). A chave `ui_origem_local` saiu, substituída pela linha de origem.

## Contrato golden (`contracts/nlu_golden_cases.json`)
Cinco casos novos, que o site e o Android passam:
- "explique o que é massa molar" e "o que é a massa molar?" → CONCEITO;
- "Explique Teoria ácido-base de Brønsted-Lowry" → CONCEITO (normalização do ø);
- en "explain what molar mass is" → CONCEITO;
- fr "Qu'est-ce que la stœchiométrie ?" → CONCEITO.

Resultado com o pacote real:
- Android: pt-BR 148, en 109, es 137, de 150 e fr 184 casos, 0 falhas;
- site: `web/test/nlu-golden.test.mjs` 6/6;
- API: `api/test/golden.test.mjs` 4/4;
- gramática do modelo: `backend/modal` `test_eval_golden`/`test_nlu_core`, 67 OK.

O caso "18 g de água em mol" (CONVERSAO_UNIDADE com composto) ficou de fora, porque a gramática por intenção do modelo não aceita essa combinação.

## Paridade do NLU: varredura de 16/10/2026
As mesmas 30.363 perguntas foram passadas pelos dois `parse`, com o pacote real:
- dataset NLU pt-BR;
- golden;
- holdout da química;
- 8.000 perguntas do corpus multilíngue (en/es/de/fr).

Depois das correções acima, a intenção difere em 65 perguntas (0,2 %). Nenhuma diferença vem do `LocalNlu`; todas estão no dicionário, nas
unidades ou nas quantidades.

**Erros do site (o Android acerta):**
- Nome de elemento em minúsculas lido como fórmula: "bromo" vira BrOMo e "neon", "helio" e "krypton" viram COMPOSTO. "o bromo é um metal?" vira
  COMPOSTO no site e ELEMENTO no Android. Também "estearato" lido como fórmula.
- "quantos nanômetros são 50 m?" não converte no site: o `quantosUnidade` é aplicado ao texto com acento.
- "ºC" (o indicador ordinal, não o símbolo de grau) não conta como unidade de gás no site. Por isso "380 milímetros de mercúrio a 100 ºC" vira
  ESTEQUIOMETRIA, e não GAS_IDEAL.
- "3,5 dm3" é lido como "3,5 dm" (comprimento) e convertido para "cc".

**Erros do Android (a corrigir no dicionário; ficaram fora desta versão):**
- O dicionário do Android usa também os sinônimos dos lotes de compostos (`sinonimosPorIdioma` completo). O site usa só os nomes do
  `compostos/index.json`. Por isso a aproximação por erro de digitação casa "equilíbrio" com "Equilibrin", um sinônimo da amitriptilina (CID 2160).
  "O que significa constante de equilíbrio" vira COMPOSTO no Android e CONCEITO no site (cerca de 18 perguntas da varredura).
- Fórmula com isômeros: os dois escolhem CIDs diferentes (ex.: C5H12 dá 6556 no site e 8003 no Android), porque o `formulaParaCid` é montado
  em ordens diferentes. São cerca de 570 perguntas, quase todas de fórmula molecular ambígua.
- Unidades:
  - "10 años" é lido como 10 Å, porque o `Unidades.buscar` aceita "a";
  - "dm3" não é reconhecido;
  - "l"/"M" saem normalizados ("L"/"mol/L"), o que só muda a representação.
- Diluição ("Quantos mL de solução 0,5 M preciso para preparar 500 mL de 1 molar"): os dois erram, de jeitos diferentes. O site responde
  CONVERSAO_UNIDADE e o Android, CONCEITO ou ELEMENTO (o "Li" de "litro").

## Como foi testado (16–17/10/2026)
- `./gradlew.bat :app:testDebugUnitTest :app:lintRelease`:
  - **180 testes, 0 falhas.** Eram 162; entraram 18. Os novos:
    - `MelhoriaTest` (12): filtro; cliente com MockWebServer (corpo do contrato, 200, 503 disabled/budget, 429, 400, JSON inválido, sem rede);
      fila (consentimento, botão, repetição, limite de 30, mínimo de 3, lote de 10 por idioma, falhas que guardam, exceção);
    - `HistoricoPerguntasTest` (4);
    - `NluParidadeSiteTest` (2).
    - O `NluTest` foi ajustado ao assunto do site ("o mol").
  - **Lint de release sem erro.** Os 19 avisos são os mesmos de antes (versões novas de dependências).
- **Emulador Pixel 9 (Android 15), APK debug, app em pt-BR:**
  - o app abriu sem erro;
  - "massa molar da agua" + Enter: o campo voltou em branco, apareceu o cartão "Última pergunta" e a resposta trouxe "Resposta montada no seu
    aparelho • dados do pacote de 12 de out. de 2026";
  - ▲ pôs a pergunta no campo, com o X visível, ▲ desabilitado no topo e ▼ habilitado;
  - uma pergunta não entendida mostrou "Perguntar à IA na nuvem" e "Enviar esta pergunta", com a nota.
- **Não testado no aparelho:**
  - o envio real a `/api/melhoria`, de propósito, para não mandar texto de teste ao servidor de produção (a frente A ainda publica o endpoint);
    só há o teste com MockWebServer;
  - a opção ligada em Configurações e "Apagar os dados deste aparelho";
  - os idiomas en/es/de/fr na tela;
  - aparelho real.
- As traduções novas são de agente e aguardam revisão de falante nativo.

## Para gerar (orquestrador)
`./gradlew.bat :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease` e
`python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk`. Na Play, a versão deve aparecer como **2 (1.0.1)**. O
`ItemMelhoria` (fila no DataStore, JSON via Gson) tem uma regra de R8 em `app/src/main/keepRules/rules.keep`. É preciso conferir no APK de release
que a fila sobrevive a fechar e abrir o app.

## Notas da versão (texto para o console)
A pergunta agora sai do campo ao enviar, e as setas ▲▼ trazem de volta as perguntas anteriores. Cada resposta diz onde foi montada e de quando
são os dados. Há uma opção nova, desligada por padrão, para ajudar a melhorar o app com as perguntas que ele não entendeu, sem dados pessoais.
Também é possível apagar os dados guardados no aparelho.

## Data Safety (Play): o que muda
O "Ajudar a melhorar o app" é opcional e desligado por padrão. Com ele, o texto de perguntas não entendidas fica **guardado** no servidor para
revisão, o que é diferente da IA na nuvem, que não guarda. Provavelmente entra no formulário como:
- "Mensagens/outro conteúdo do usuário: coletado, opcional, para desenvolvimento do app";
- o identificador aleatório da instalação.

Confirmar no console junto com o texto da política (`PRIVACIDADE.md`, onda 2).

## Pendências
1. **Dicionário do Android × site** (acima): a origem dos nomes de composto, a ordem do `formulaParaCid` e as unidades ("a", "dm3"). Também os
   erros do site (minúsculas como fórmula, `quantosUnidade` com acento, "ºC").
2. **Envio real do "Ajudar a melhorar o app"** contra o endpoint publicado pela frente A (200, e `503 disabled` enquanto `MELHORIA_ENABLED`
   estiver desligado).
3. **Teclas ↑/↓ de teclado físico no campo** (o site tem; aqui só há as setas na tela, como no app de Eleições).
4. **Chips da home que mudam a cada resposta** e **contexto da conversa mais amplo** (`PENDENCIAS.md` §8.4) continuam abertos.
5. Revisão das traduções novas por falante nativo; teste em aparelho real.

## Paridade com as correções de química do site (17/10/2026, frente H)
O Android passou a seguir as correções que o site recebeu em 16–17/10 (`web/src/quimica/js/calc/*`, commit 70ee75a). Os textos novos
são os dos catálogos do site, nos cinco idiomas.
1. **Expoente nas unidades, nunca subscrito.** O pacote escreve "m3", "dm3", "cm3", "ft3". O app mostra "m³", "dm³", "cm³", "ft³" e
   também "s⁻¹", "mol/m³" (`Unidades.simboloExibicao`, a mesma regra do `unidadeTex` do site). A grafia do pacote continua aceita como
   apelido, e os apelidos do padrão ("cc" etc.) são somados.
2. **mmHg e Torr separados:**
   - mmHg = 133,322387415 Pa;
   - Torr = 101325/760 Pa;
   - "torr" passa a ser Torr. Um apelido igual ao de outra unidade da grandeza é descartado, então o "torr" do fixture antigo não casa mais com mmHg.
   - "Torr" entrou em `UNIDADES_DE_GAS` (`LocalNlu`). O nome é `unidade_nome_torr`.
3. **Estequiometria com rendimento a partir de PRODUTO.** `Estequiometria.calcular(..., rendimentoPercentual)`: com o produto informado e
   rendimento < 100 %, ξ = n ÷ coeficiente ÷ rendimento. A quantidade informada não muda, e os reagentes necessários são os teóricos ÷
   rendimento. Os passos novos são `calc_est_produto_com_rendimento` e `calc_est_necessarios`. Rendimento fora de 0–100 % gera um erro
   (`erro_est_rendimento`). Golden do site: 10 g de NH₃ a 80 % → N₂ 10,2805 g e H₂ 2,21948 g. A calculadora passa o rendimento ao cálculo.
4. **Notas CNTP × IUPAC** (`GasIdeal.notasCntp`):
   - "CNTP (0 °C, 1 atm): 22,4 L/mol…" e "IUPAC (0 °C, 1 bar)… 22,7 L/mol", as duas calculadas por RT/P com o R do pacote;
   - aparecem nas respostas de volume nas CNTP e de gás ideal com "volume molar"/CNTP;
   - sem R no pacote, a nota não aparece.
5. **pH:**
   - toda resposta traz a nota "pKw = 14,00 e pH neutro = 7,00 valem a 25 °C…";
   - `regras.agua.pKw` do pacote tem precedência, como no site.
6. **Saturação de bases pouco solúveis.** O app lê `regras.solubilidadeBases` (lista ou mapa) e funciona sem ela (sem a tabela, não há aviso).
   - Quando a solubilidade em mol/L não vem, ela é calculada do Kps: s = (Kps/nⁿ)^(1/(n+1)).
   - Acima da solubilidade, o aviso traz o pH máximo, pKw + log₁₀(n·s).
   - Ca(OH)₂ com Kps 5,02e-6 dá s ≈ 0,0108 mol/L e pH máximo ≈ 12,33.
7. **Pacote da frente J:**
   - `serieReatividadeMetais.ordem` é lido (antes a chave lida era `reatividade` e a lista ficava vazia);
   - as regras de solubilidade saem uma por linha, com a `nota`. Nenhuma tela do Android mostra essas duas listas hoje.
   - Em pt-BR, um trecho com `traducao: "automatica"` e `textoPt` (ChEBI, Faraday) conta como português: corpo `textoPt`, título
     `tituloPt` e o aviso de tradução automática. Antes, o teste procurava "automática" com acento e não casava.
8. **Dicionário e unidades** (pendências desta versão):
   - "10 años"/"anos"/"years" não é mais 10 Å. A palavra da unidade é lida inteira, com acentos, e uma letra solta não casa por
     normalização ("a" ≠ Å). Com isso, "2 atmósferas" segue lida pelo léxico.
   - "dm3"/"cm3"/"m3" com o expoente em dígito são volume. "3,5 dm3" deixou de virar "3,5 dm".
   - A aproximação por erro de digitação ignora os nomes que vêm só dos sinônimos dos lotes (o site aproxima só pelos nomes do índice).
     "O que significa constante de equilíbrio" passou a ser CONCEITO, e não Equilibrin (CID 2160). O sinônimo exato continua casando.
   - Continua aberta a ordem do `formulaParaCid` (isômeros).

Testes: `CorrecoesQuimicaSiteTest` (12). `./gradlew.bat :app:testDebugUnitTest :app:lintRelease` deu **192 testes, 0 falhas**, com o
pacote real presente. O lint de release fechou sem erro e com os mesmos 19 avisos de versão de dependência. Os testes que usam
`local/pacote-j/regras.json` (fora do Git) são pulados se o arquivo não existir.

## Propriedades físicas medidas dos compostos (17/10/2026, frente M, onda 2)
Paridade com o site (commit 88cedda: `propriedades.js`, `ui/compostos.js`, `ui/elemento.js`, `answers.js`). Os textos novos são os dos catálogos
do site nos cinco idiomas (`prop_medida_*`, `prop_solubilidade`, `prop_pka`, `resp_prop_de|nao_tem|oferece|solubilidade_de_qual|propriedades_de`,
`resp_comparar_maior`, `lista_e`).
1. **Modelos** (`Models.kt`, `PacoteJson.kt`):
   - `compostos[].propriedades` com números, textos (`estadoPadrao`) e listas (`pkaValores` → `propriedadesListas`);
   - `fontesPorPropriedade` de compostos e elementos (`FonteValor`: nome, url, licença, data, declaração, referência, valor e unidade
     originais, `condicoes {temperaturaK, pressaoPa, fase}`, `semReferencia` + `corroboradoPor`, `metodo`, `aviso`/`revisar`, `escala`, `nota`);
   - `regras.propriedades[]` com `escopos`, `origens` e `escala`. O formato antigo continua aceito (`escopo`/`origem`, `alvo: "ambos"` do fixture).
2. **Domínio** (`Propriedades.kt`): ids novos `solubilidade` (lê `solubilidadeAguaG100g` ou `solubilidadeAguaGL`, com a unidade do campo) e
   `pka` (lista quando há mais de um). Fusão, ebulição, densidade e estado valem para elemento E composto. Funções novas, com os nomes do site:
   `lerValor`, `condicoesDaMedida`, `fonteDoValor`, `fontesDoCampo`, `medidasDoComposto`, `avisoDoValor`, `notaEletronegatividade`.
   `Texto.capitalizar` não transforma "pKa" em "PKa". `Fonte.detalhe` leva a referência citada, "sem referência no Wikidata", "valor
   derivado" e "valor a revisar".
3. **Ficha do composto:** novo cartão "Propriedades físicas", no lugar das medidas soltas entre as propriedades calculadas. Cada valor
   aparece com K e °C, kg/m³ e g/cm³, as condições da medida e a sua fonte (link, licença e referência).
4. **Ficha do elemento:**
   - aviso "Valor a revisar" junto da afinidade eletrônica (15 elementos marcados no pacote);
   - nota da escala de Pauling na eletronegatividade;
   - a energia de ionização e a afinidade eletrônica passaram a aparecer também no nível médio.
5. **Assistente:**
   - PROPRIEDADE trata várias propriedades e entidades, por escopo, como o site;
   - medida do composto com fonte por valor e condições, e nota do pKa;
   - "O pacote não traz X para Y" seguido de "Para Y, o pacote traz: …";
   - em "solubilidade do X em água", a água não é o alvo;
   - COMPARAR entre compostos inclui as medidas que dois ou mais deles têm, com a frase "maior em…" para a propriedade pedida;
   - a ficha resumida (COMPOSTO) inclui as medidas;
   - o NLU (`LocalNlu`, `Dicionario.propriedadesEm`, `CloudNlu`) decide o alvo pelos escopos.
6. **Pacote embutido:** o snapshot `app/src/main/assets/quimica/` (que tem prioridade no Gradle) ainda era o de 12/10. Ele foi
   atualizado com `app/tools/copiar_pacote_para_assets.py` para `20261017T034210Z-2a180a93a84a`. Sem essa troca, o app sairia sem as
   medidas, e o `verificar_release.py` recusaria a versão.

Exemplos com o pacote real:
- "qual o ponto de fusão do NaCl?" → 1.073,85 K (800,7 °C). Fonte: Wikidata – CC0 (referência: Basic Laboratory and Industrial Chemicals: A CRC
  Quick Reference Handbook).
- "pKa do ácido acético" → 4,76 — a 298,15 K (25 °C), com a nota da 1ª dissociação.
- "densidade do etanol" → o pacote não traz a densidade para Etanol. Ele traz: estado físico a 25 °C e 1 atm (líquido), ponto de fusão
  (159,05 K), ponto de ebulição (351,44 K) e pKa (16).
- "compare a densidade da água e do ácido acético" → a tabela traz Densidade 997,048 kg/m³ | 1.044,6 kg/m³ e a frase "Densidade: maior em Ácido acético".

Testes: `PropriedadesMedidasTest` (15 testes) cobre modelos, escopos, formatação, origem por valor, fichas, o boro, as respostas acima em
pt/en/es e uma varredura de todas as medidas do pacote real. `./gradlew.bat :app:testDebugUnitTest :app:lintRelease` deu **207 testes, 0
falhas**. O lint de release fechou sem erro, com os 19 avisos de versão de dependência de antes. O texto "N declarações concordam" virou
`<plurals>`, com `many` em es e fr.

Conferido no emulador (Pixel 9, debug):
- a pergunta do NaCl e a ficha do NaCl, com "Propriedades físicas" e a fonte por valor;
- a ficha do boro, com a nota de Pauling e "Valor a revisar".

Achado fora do app: o GHS do NaCl no pacote é GHS05/H318/H412, que vem de uma entrada errada do CLP ("product-by-process… polyazodyestuff").
Isso é para o pipeline corrigir.
