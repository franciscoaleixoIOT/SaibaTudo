# Pendências — SaibaTudo Química

> **Em 11/10/2026, madrugada (horário de Brasília).** Repositório único: este app está em `apps/quimica/` de `franciscoaleixoIOT/SaibaTudo`. Ordem de execução recomendada. `[x]` = feito; `[~]` = feito em parte. Contexto completo em [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md).

## 1. Pacote de dados (`data/quimica/`)
- [x] **Pacote real assinado com o núcleo completo da lista fixa** (491 compostos, 1787 textos): `python pipeline/build.py --alvo 491 --assinar-com secrets/data_signing_key.pem` (o build sem limite, alvo 2000, continua válido para ampliar depois). `Pacote válido: 20261010T234125Z-...`.
- [x] **Núcleo de compostos ampliado para 1.971** (12/10/2026; alvo 2.000 menos duplicatas e exclusões). O `quimica-data-refresh.yml` agora roda `--alvo 2000 --paciente` (timeout 300 min) e **nunca publica um pacote com menos compostos que o versionado**. Lições: o PubChem bloqueia o PUG View (GHS) por horas quando o próprio serviço está em `Black`; trocar o IP destrava na hora; `--pubchem-offline` refaz do cache em segundos; o rename atômico no Windows precisa de retentativas (antivírus/editor seguram a pasta).
- [ ] Conferir `fontes.json` e `manifest.licencas` contra a seção 5 de `FONTES_E_LICENCAS.md` (nada de "CC BY 4.0" para OpenStax; Wikimedia e Gold Book CC BY-SA; ChEBI CC BY).
- [x] `python -m unittest discover -s pipeline/tests` (83, verde).

## 2. Integração (depende de 1)
- [x] **Unificar os ids de propriedade** (10/10/2026, 21h30): cliente (web + Android), modelo, golden e `regras.propriedades` usam o MESMO id = nome do campo do contrato com unidade (`pontoFusaoK`, `pontoEbulicaoK`, `densidadeKgm3`, `raioAtomicoPm`, `energiaIonizacaoKJmol`, `afinidadeEletronicaKJmol`). `PROPRIEDADE_CLIENTE` ficou vazio (proxy e nlu_core). Tocado em: `pipeline/regras.py`, `web/src/quimica/js/{propriedades,nlu}.js`, `app/.../{domain/Propriedades,ai/nlu/LocalNlu,ai/answer/AnswerBuilder}.kt`, `contracts/nlu_golden_cases.json`, fixtures (web + `app/tools/gerar_fixture_pacote.py`), `api/_lib/{vocab,normalize}.js`, `backend/modal/{nlu_core,eval_golden}.py`. **Novo teste de paridade:** `tools/test_vocab_paridade.py`.
- [ ] **Campo `composto`:** decidir (recomendado: o cliente resolve nome/fórmula → CID; o golden guarda o texto citado **e** o CID esperado; a nuvem devolve texto copiado da pergunta, nunca CID). O proxy já aceita CID mas o modelo emite `composto` como texto/número — falta fechar.
- [x] `python dataset/gerar_qa.py && python dataset/gerar_nlu.py && python dataset/gerar_amostra.py && python dataset/gerar_catalogo.py` com o pacote real; testes do dataset verdes (68). Tudo commitado e enviado em `af68d02` (CI verde).
- [x] `cd web && npm test` com o pacote real: **112/113** (1 pulado = E2E; 0 falhas). `node web/build.mjs` verde.
- [x] `cd api && npm test` (168, verde). Golden real do Android verde (145 casos).
- [x] `python app/tools/copiar_pacote_para_assets.py` e `./gradlew.bat testDebugUnitTest lintDebug assembleRelease` com o pacote real (92 testes, lint limpo, APK release 3,7 MB; assets em `af68d02`).
- [ ] Consolidar `api/test/seguranca_cases_api.json` (~115 casos) em `contracts/seguranca_cases.json` e conferir os três `seguranca` (api, web, Android) contra o contrato unificado; incluir "escalar a produção de X" (o Android já pega).
- [x] `vercel.json`: rewrite `/quimica/api/:path*` → `/api/:path*` antes do SPA, SPA exclui `api/`, `includeFiles` do manifesto; coberto por teste (`5963a1f`). Obs.: o cliente web ainda não chama a API (nuvem fica para a fase 5).
- [ ] Revisão humana por amostragem dos 85 pares de segurança escritos à mão (`dataset/conceitos/12-seguranca-geral.jsonl`) e de ~50 conceitos; preencher `revisadoPor`.
- [ ] `tools/test_workflows.py` exige `bash` no PATH (valida a sintaxe dos passos dos workflows): roda no CI (Ubuntu); na máquina Windows falha por ambiente, não por código.

## 3. Primeiro deploy
- [x] **Primeiro deploy (10/10 ~22h25, com o trial do Pro).** No ar em https://saibatudo.net/quimica/ e https://saibatudo-quimica.vercel.app/quimica/; conferência completa ao vivo verde. Correções que só apareceram em produção: destino do SPA `/quimica/` (com `cleanUrls`, `/quimica/index.html` dava 404 em toda rota interna).
- [x] Repositório de eleições: cartão + regras de proxy + `.vercelignore` publicados (3d5ffa9, 01fb70e), com a regra exata `/quimica/` (sem ela o link do cartão dava 404) e o service worker da home ignorando `/quimica/`.
- [~] CSP: pelo proxy vale a CSP da home (a de eleições, que só acrescenta `resultados.tse.jus.br`): compatível hoje. No plano de repositório único, a home deixa de aplicar cabeçalhos aos caminhos dos apps.
- [ ] **Trial do Pro da Vercel:** ao terminar, a cota volta a 5.000 uploads/24 h dividida com eleições. Decidir: manter o Pro ou ficar no Hobby (os lotes de textos da §8.1 reduzem o deploy completo de ~1.930 para ~180 arquivos).
- [x] **Token da Vercel do time inteiro** (`VERCEL_TOKEN_TIME`, criado pelo mantenedor em 11/10/2026; arquivo em `SaibaTudo/secrets/vercel_token_time.txt`): o portal já publicou pelo CI com ele. O `VERCEL_TOKEN` antigo só publica eleições.
- [ ] Privacidade: `docs/PRIVACIDADE.md` ainda não existe; criar a partir da página `web/src/quimica/privacidade/` (os dois devem ser idênticos, com teste como no app de eleições).

## 4. Modelo (fase 5) — só depois de 2
- [x] **NLU em produção: `nlu-v3.4-20261017` desde 17/10/2026 (~05h)** — multi-turno por `contexto` (ainda não enviado por serviço nem clientes), COMPARAR ancorado e CONCEITO pt; golden 777 98,5 %, holdout 99,6 %; `MODELO.md` §13 e `ia/treino/README.md` §v3.4. Antes dele, desde 14/10/2026 (0h): `nlu-v3.3-20261013` = SaibaTudo-NLU (Qwen3.5-2B, um só para todos os apps, treinado em `ia/treino/` da raiz — o caminho antigo `train_hybrid.py --target nlu` com Qwen2.5 não foi usado). Gate em `docs/MODELO.md` §13: golden 723 com gramática 99,0 % de intenção, elemento 98,6 %, composto 98,1 %, propriedade 98,3 %, equação 100 %, 5 idiomas ok, holdout 2.395 = 99,6 %, Q8 = Q4. Volume `saibatudo-quimica-models` (criado 13/10), app Modal `saibatudo-quimica-nlu` (bench: frio 11,2 s, quente p50 2,19 s), ponteiro com `prompt_suffix`. Histórico das versões reprovadas (v3, v3.1, v3.2) em `docs/PLANO_IA_SAIBATUDO.md` §9.
- [~] ~~**Clientes ainda não chamam `/api/nlu`**~~ **Site ligado em 14/10/2026 (tarde):** botão "Perguntar à IA na nuvem" em toda resposta que não veio da nuvem (inclusive entendidas: segunda interpretação), nota de consentimento, chave "IA na nuvem automática" em Configurações (desligada por padrão; só nas não entendidas), estados "Consultando…"/falha com motivo (modelo não entendeu × serviço fora) e chips "quis dizer" com as sugestões da API. `js/nuvem.js` (porte do `cloud.js` do Eleições): valida intenção e cada entidade contra o dicionário do pacote (símbolo, CID, id de propriedade, unidade); a resposta é montada pelo `AnswerBuilder` local com origem `NUVEM` e o nome do modelo; pedido perigoso nunca sai do aparelho; `iid` = UUID aleatório nas preferências (apagado com os dados). Textos nos 5 idiomas; política de privacidade 1.1 (Modal como operador). Testes `test/nuvem.test.mjs`. **Android:** ver §6 (versão 1.0.0 em preparação na mesma data).
- [~] `MODAL_TIMEOUT_MS` **subiu de 12000 para 25000 (máximo aceito por `config.js`) em 14/10 (5h)** depois de duas chamadas frias ao vivo estourarem o padrão de 12 s (12,5–12,7 s) e de uma passar em 18,7 s com 20000 — perto demais (`api/nlu.js` já tem `maxDuration: 30`). Vale a partir do deploy seguinte (o deploy a07d6fe ainda roda com 20000). **Causa de fundo:** `scaledown_window` de 30 s em `nlu_app.py` — o contêiner desligava meio minuto depois da última pergunta, então quase toda pergunta real era fria (~10–11 s). **Decisão do mantenedor em 14/10 (manhã):** (a) **snapshot de memória ligado** (`USE_SNAPSHOT=True`, GGUF lido para a RAM sem mmap): o Modal cria o snapshot no primeiro contêiner e restaura nos seguintes; frio ao vivo caiu de 12–19 s para ~9 s (carga do modelo de 4–6 s deixa de existir; o que sobra é subir o contêiner + Vercel); (b) **janela de 5 min** (`SCALEDOWN_SECONDS=300`, ~US$ 0,02 por rajada de uso a US$ 0,22/h de contêiner). Contêiner sempre ligado (~US$ 160/mês) descartado.
- [x] **Melhorias de código do serviço (decididas em 13/10, feitas e publicadas em 14/10 à madrugada; `MODELO.md` §13, `DATA_CONTRACT.md` §9, `api/README.md`):** (1) **gramática GBNF condicionada à intenção** em `nlu_core.py` — tabela `ENTIDADES_POR_INTENCAO` (chaves permitidas e obrigatórias por intenção, derivada dos dados e conferida sem violação no golden de 723 e no corpus de 46 mil alvos), uma regra por intenção na gramática; elemento, propriedade, unidade e nível já eram vocabulários fechados. Obrigatórias só em ELEMENTO, PROPRIEDADE, DESENHAR e CONVERSAO_UNIDADE (MASSA_MOLAR, COMPOSTO e BALANCEAR têm perguntas genéricas no golden, então não podem obrigar entidade). (2) **resolução do `composto` na API** (`api/_lib/compostos.js`, índice do pacote embarcado em `api/nlu.js` via `includeFiles`): a resposta de `/api/nlu` ganhou `resolucao` — `{composto:{cid,nome}}` quando o nome existe no índice (pt e en/es/de/fr), ou `{composto:{cid:null, sugestoes:[até 3]}}` por distância de edição/prefixo para o cliente perguntar "você quis dizer…?"; null quando não há composto. (4) **normalização da entrada** (`normalize_question`, dentro de `clean_question`: serviço, gate e avaliador iguais): subscritos Unicode → dígitos, aspas e traços tipográficos, NBSP, `×`, setas exóticas e `=>`/`-->` → `→`, pontuação repetida; **não** passa para minúsculas nem tira acentos. Gate rodado de novo com o GGUF em produção: números idênticos (intenção 99,0 %, 5 idiomas ok, holdout 99,6 %), latência local igual. Ao vivo em 14/10 5h: "massa molar do acido sulfurco" → 3 sugestões com CID; "água" → CID 962; "Kochsalz" → CID 5234; `=>` e `-->` viraram `→`. **Não feito (de propósito):** `=` como seta (ambíguo com equilíbrio/igualdade), correção de digitação pelo léxico **antes** do modelo (a sugestão pós-modelo cobre o caso) e confiança por logprobs.
- [ ] Explicador: `backend/retrain/build_ask_dataset.py` → `train_hybrid.py --target ask` (Qwen3-4B, `max_length 1024`; medir tempo: pode passar de 8 h); merge; gates `eval_fidelidade.py` e `eval_seguranca.py`.
- [~] ~~enviar GGUF do NLU ao Volume do Modal e implantar `backend/modal/nlu_app.py`~~ (feito 14/10; **renomeados em 14/10 de manhã** para o app `SaibaTudoIA-NLU-Quimica` e o Volume `SaibaTudoIA-Models-Quimica`, padrão `SaibaTudoIA-<Papel>-<App>` do mantenedor — `MODAL_ENDPOINT` novo na Vercel, antigos apagados; `MODELO.md` §13). Publicar no Hugging Face em repositórios novos (`franciscoaleixo/SaibaTudoIA-NLU`, `SaibaTudoIA-Explica-Quimica`), revisão imutável; criar o Space `franciscoaleixo/SaibaTudoIA-Explica-Quimica` (ZeroGPU) com `backend/hf_space_quimica/`.
- [~] Vercel: ~~`MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET`, `MODEL_VERSION`~~ (gravadas 14/10, produção; deploy pela CLI local; health `nlu on`), `HF_ASK_SPACE_URL`, `HF_TOKEN`, `ASK_ENABLED=1`; variável do repositório `ASK_ENABLED=1`; deploy; teste ao vivo; política de privacidade atualizada (nuvem opt-in, Hugging Face e Modal como operadores).
- [ ] Impedir a suspensão do Windows durante o treino; não rodar outras cargas na GPU.
- [ ] Teto de gasto no painel do Modal (ainda não definido pelo mantenedor).

## 5. Fontes e dataset (contínuo)
- [ ] **Livros abertos verificados em 10/10 (noite), ver `FONTES_E_LICENCAS.md` §6** — criar `pipeline/livros_abertos.json` + `pipeline/coleta_livros_abertos.py` (PDF → trechos por seção; `pypdf`; checar a ficha catalográfica no PDF antes; nunca re-hospedar o PDF) com: UNILA *Química geral no laboratório* e *Química analítica no laboratório* (CC BY 4.0), USP/IQSC *Ensinando físico-química na prática* (CC BY 4.0, id 1584), USP *Métodos analíticos… águas residuárias* (CC BY, id 625), USP *Conservação da massa e energia* (CC BY-SA, id 1010, pasta separada), eduCAPES *Prática Pedagógica em Química* (CC BY 3.0 BR). Depois regerar conceitos por tema.
- [ ] Wikiversidade pt pelo **dump** (`ptwikiversity-latest-pages-articles.xml.bz2`, CC BY-SA): "Org - Química Orgânica" e Categoria:Química/Bioquímica.
- [ ] **Decisão do mantenedor:** LibreTexts *Química 1e/2e (OpenStax)* em português está rotulado CC BY 4.0 (edição de 2019, licença irrevogável) — usar ou manter só link até a OpenStax responder? Hoje: só link.
- [ ] Pedir permissão escrita à OpenStax (formulário https://riceuniversity.tfaforms.net/52) para Chemistry 2e e Química 2ed; se vier, pasta própria com licença NC-SA e dataset derivado separado.
- [ ] Gold Book: licença em conflito (CC BY-SA na home × CC BY-NC-ND no IUPAC Cookbook) e 403 ao coletor; endpoints `/terms/index/all/json` e `/terms/view/{CODE}/json`. Só verbetes pontuais com atribuição; para a coleção, pedir permissão (formulário IUPAC).
- [ ] Química Nova via SciELO (CC BY 4.0 confirmado a partir do fascículo 39-9/2016): coletar resumos/artigos de ensino em `textos/quimica-nova/` (índices `https://www.scielo.br/j/qn/i/<ano>.v<vol>n<num>/`). QNEsc continua só link (NC-ND + proibição de armazenar em banco de dados).
- [ ] `regras.incompatibilidades` e `pKw` no pacote (o site hoje usa 14 a 25 °C e avisa). Fonte das incompatibilidades: **HSDB/NIOSH via PubChem PUG View** (domínio público), não CAMEO (proíbe duplicação — só link).
- [ ] **Novas fontes estruturadas verificadas em 10/10 (noite), ver `FONTES_E_LICENCAS.md` §7** — ordem sugerida: (1) Wikidata P1117 pKa, P2177 solubilidade, P2054 densidade, P2101/P2102 fusão/ebulição, P2114 semivida, P2374 abundância, P1121 oxidação → `compostos[].propriedades` e `elementos[]`; (2) PubChem PUG View com **lista branca de licenças** (HSDB, NIOSH, OSHA, EPA, ChEMBL; recusar DrugBank, Haz-Map, HMDB, IUPAC pKa, IPTEI, CAMEO, JECFA) → solubilidade, pKa, armazenamento, primeiros socorros; (3) CODATA 2022 (`allascii.txt`, citar Rev. Mod. Phys. 97, 025002); (4) páginas de dados da Wikipédia (potenciais padrão, pKa, solubilidade por temperatura) com `oldid`; (5) Nobel API (dados CC0, confirmar) + Wikidata para biografias curtas; (6) listas oficiais PF (Portaria 204/2022) e Anvisa (344/98) → reforço da recusa por regra; (7) Wikimedia Commons (vidraria, com autor/licença); (8) CIAAW pesos atômicos 2021 (uso educacional). Cada fonte: entrada em `fontes.json`, teste de licença no pipeline, cache por ETag, User-Agent.
- [ ] Conferência local por amostragem dos números das respostas contra as tabelas dos livros de referência (relatório fora do Git; nada do livro é copiado).

## 6. Android (fase 6, depois de 3)
- [x] **Versão 1.0.0 (versionCode 1) gerada em 14/10/2026** (`docs/RELEASE_1.0.0.md`): chave de upload criada (`secrets/upload-keystore.p12` + `keystore.properties`, fora do Git — **fazer backup offline**), `bundleRelease`/`assembleRelease` assinados, `tools/verificar_release.py` (classes R8 + pacote embutido completo e igual a `data/quimica`) com testes, 152 testes de unidade, lint de release limpo, testado no emulador Pixel 9 (Android 15). IA na nuvem opt-in portada (`CloudNlu.kt`, `AssistenteNuvem.kt`, `NuvemView.kt`, chave automática, textos nos 5 idiomas). Traduções novas revisadas por agente "falante nativo" (site e Android, 14/10 à noite); `quimica-android-ci.yml` criado (testes, lint de release, `assembleRelease` sem chave e verificador); 162 testes de unidade. **Falta:** teste em aparelho real.
- [~] ~~Ícone: trocar o Erlenmeyer próprio por `brand/quimica-icon.svg`~~ (feito 14/10: ícone adaptativo vetorial + monocromático). Falta revisar o modo escuro num launcher real e um teste instrumentado mínimo.
- [ ] Paridade do NLU Android × site: `LocalNlu.kt` tem desvios conhecidos ("licenças" → FONTES, "explique o que é massa molar" → CONCEITO, tema sem artigo, ordem composto/quantidade); alinhar com `nlu.js` e cobrir no golden.
- [~] Play: ~~ficha, Data Safety~~ preparadas em 14/10 (`docs/PLAY_STORE.md`, imagens em `store/play/`; capturas vêm do PWA — trocar por capturas do app antes da produção). **Falta (só o mantenedor):** criar o app no Play Console, subir o AAB, preencher App content/Data safety com o documento, teste interno → fechado (≥ 12 testadores por 14 dias se a conta exigir).

- [~] **Achados da preparação da ficha (14/10/2026, agente) — resolvidos na mesma noite, exceto (f) e (g):** (a) ~~Android sem "Relatar problema nesta resposta"~~ (feito: botão no rodapé de cada resposta que abre a issue pública pré-preenchida, `domain/Relato.kt` + `RelatoTest`; nunca em recusa de segurança); (b) ~~`BuildConfig.SOURCE_URL` apontava para o repositório arquivado~~ (corrigido 14/10 para `franciscoaleixoIOT/SaibaTudo`); (c) ~~`.vercelignore` sem `/store/`~~ (corrigido 14/10: 63 imagens, 11 MB, não vão mais para a Vercel); (d) ~~PWA: em 432 px o cabeçalho passa de 60 px e cobre parte da barra de abas ao rolar~~ (feito: barra + abas num só bloco fixo `.topo-fixo`, título numa linha; conferido ao vivo em 432 px); (e) ~~linha "Classificação: Regulation (EC) No 1272/2008…" em inglês e repetida~~ (feito no site, `perigos.js` `fonteGhs`, e no Android, `domain/GhsFonte.kt`: a entrada localizada da lista de fontes do composto vence o texto cru do PubChem); (f) capturas da Play são do emulador (Pixel 9); falta a recusa de pedido perigoso no Android (só há a do PWA); (g) conta de serviço da Play API não existe (`PLAY_STORE.md` §8).

## 6.b Onda 3 (depois de 17/10/2026) — o que ficou do programa de 16/10
- [x] **Multi-turno de verdade com o v3.4 — FEITO e publicado em 17/10/2026 (~06h):** serviço, proxy, site e Android 1.0.2 mandam/aceitam o `contexto` (contrato em `api/README.md` /nlu e `DATA_CONTRACT.md` §9; regra de "pergunta de continuação" em `PADRAO_ASSISTENTE.md` §9; pista `continuacaoNuvem` no léxico dos 5 idiomas; páginas de privacidade 1.3). Ao vivo (17/10, ~06h): `POST /quimica/api/nlu` com `contexto` — "e a do KCl?" após MASSA_MOLAR NaCl → MASSA_MOLAR KCl (CID 4873); "and for 2 mol?" após GAS_IDEAL water 1 mol/25 °C → 2 mol herdando o resto; "y el del potasio?" após raio atômico do Na → K; "et sa densité ?" após ELEMENTO Fe → PROPRIEDADE densidadeKgm3; "e como fazer em casa?" com contexto nitroglicerina → RECUSA_PERIGO por regra; contexto fora do contrato → 400 `contexto`; 4,5–8 s quente pela Vercel (prompt maior), 26 s na primeira chamada fria (504 do proxy: o snapshot é recriado a cada deploy). No site (Chrome headless): "massa molar do cloreto de sódio" → "desenhe" (local não entende) → botão da nuvem manda `{intent: MASSA_MOLAR, composto: "cloreto de sodio"}` e volta "Estrutura 2D de Cloreto de sódio"; "e o do potássio?" após raio atômico do sódio: o local já herda pelo contexto da conversa e a nuvem, com o contexto, entende igual. Ficou: (a) o texto do composto no contexto difere entre site (fórmula/nome normalizado, ex. "agua") e Android (nome do pacote, ex. "Água") — ambos válidos; (b) nenhuma tela mostra `contexto: true`; (c) 5 casos do holdout multi-turno caem na ancoragem da própria pergunta ("zn too pls?", "Gruppennummer?", "si aussi ?", "mm Quecksilbersäule", "nombres d'oxydation") — léxico/`ground.js`; (d) a primeira chamada fria depois de um deploy passa dos 25 s do proxy (504) — aquecer com uma chamada ao `health`/`infer` logo após `modal deploy`. Plano original: (formato em `ia/corpus/contexto_nlu.py`: linha `contexto: {json da interpretação anterior}` antes da pergunta): (1) `nlu_core.build_prompt(q, contexto)` validando com `has_valid_shape` e serializando com `format_output`; (2) `nlu_app.py` e `api/_lib/nlu-handler.js` aceitarem `{q, v, contexto}` com o contexto na chave do cache; (3) `ground.js`/`normalize.js` aceitarem entidade herdada do contexto (hoje exigem o composto no texto); (4) site (`nuvem.js`) e Android (`CloudNlu.kt`) mandarem a interpretação anterior (composto como texto, não CID) só em perguntas de continuação; testes com os 135 casos de `ia/corpus/out/v34/holdout_v34_multiturno.json`.
- [ ] Recusas novas no corpus do NLU: o gerador de moldes de pedidos perigosos foi bloqueado pelo filtro do modelo; ampliar só a partir de casos escritos e revisados por pessoas (§11); 1.630 pares de RECUSA_PERIGO hoje.
- [ ] Gate de eleições do NLU: "deputado mais votado" → `cargo` inventado (mesmo caso desde o v3); corrigir no corpus de eleições depois de 27/10.
- [ ] `empacotar_versao.py`: a catraca automática não roda quando o golden muda de tamanho (723 → 777); comparar a versão anterior no golden atual (rodar `avaliar_gguf.py` nela) em vez de pular.
- [ ] Resposta de CONCEITO oferecer "ver a ficha de X" quando a pergunta trouxe um apelido de classe (`p.composto` fica preenchido; site `answers.js` e Android `RespostasConhecimento.kt`).
- [ ] Mover `CLASSES_DE_COMPOSTOS` (nlu.js/LocalNlu.kt) para `conceitoTemas` do léxico; "o que é álcool?" passou a dar conceito (etanol como sugestão) — confirmar com o mantenedor.
- [ ] `tools/comparar_pacotes.py`: comparar também `ghs` (perdas e trocas de classificação) e `regras.json`.
- [ ] Cu₂O (CID 18346908) sem CAS no pacote → sem GHS; pôr o CAS 1317-39-1 na lista fixa.
- [ ] Revisão humana por amostragem das 1.540 traduções automáticas (hidroxi/hidroxila, calcos "portando"); só então tirar o rótulo `automatica`.
- [ ] Leitor/revisor da fila `quimica:melhoria:<mês>` (porte de `colher_sinais`/`fila`/`revisar` do Eleições) e `nlu_real_cases.json`.
- [ ] Clientes lerem `notaPorIdioma`/`avisoPorIdioma`/`nomePorIdioma` do pacote (hoje usam textos do catálogo).
- [ ] Android: isômeros com a mesma fórmula escolhem CIDs diferentes do site (~570 perguntas); calculadora de pH sem campo de fórmula (sem aviso de saturação).
- [ ] Site: nome de elemento em minúsculas vira fórmula ("bromo" → BrOMo); `quantosUnidade` com acento; "ºC" ordinal; `limparConceito` deixa o artigo.
- [ ] `ui.config.privacidadeTexto` do site não cita a fila nem o histórico; `<meta description>` das páginas de privacidade.
- [ ] Retenção da captura (4 meses) e região do Upstash a confirmar com o mantenedor; política de privacidade cita IP/iid nos contadores por 1 dia.

## 7. Operação (fase 7)
- [~] ~~`docs/OPERACAO.md`~~ (feito 16/10/2026, frente F) e ~~captura opt-in de perguntas não entendidas com filtro de dado pessoal~~ (feito 16/10 no site e na API: `POST /quimica/api/melhoria`, lista Redis `quimica:melhoria:<mês>`, `MELHORIA_ENABLED=1` na Vercel; falta o leitor/revisor da fila como o `colher_sinais` do Eleições e o Android, frente B); painel noturno de qualidade do modelo.
- [ ] `CLAUDE.md` e este arquivo atualizados a cada mudança de estado.

## 8. Melhorias identificadas na revisão de 10/10/2026 (23h) — por impacto
Diagnóstico sobre o pacote e o dataset reais (números em `PROJECT_MEMORY.md` §6.d).

### 8.1 Dados (o que o estudante pergunta e o pacote ainda não tem)
- [~] **Propriedades físicas dos compostos**: hoje só as 6 computadas do PubChem (xlogp, TPSA, H doadores/aceptores, ligações rotáveis, carga). Faltam **ponto de fusão/ebulição, densidade, solubilidade em água, estado físico a 25 °C, pKa/pKb, cor/odor**. Caminhos com licença ok: Wikidata (P2101 fusão, P2102 ebulição, P2054 densidade, P2177 solubilidade, P1117 pKa — CC0) e PubChem PUG View (`heading=Solubility`, `Dissociation+Constants`…) **filtrando por `LicenseNote` da referência** (HSDB/NIOSH/OSHA/EPA domínio público; DrugBank, Haz-Map, IUPAC pKa fora — ver `FONTES_E_LICENCAS.md` §7). Entra em `compostos[].propriedades` com `fontes` por valor e nos `regras.propriedades` do contrato (ids com unidade, como `pontoFusaoK`); regerar `template:composto.*` e a intenção PROPRIEDADE para compostos. **→ 16/10/2026: Wikidata (CC0) com fonte por valor em 871 compostos (fusão 790, ebulição 525, densidade 277, solubilidade 216, pKa 93); site e Android passam a exibir (onda 2); ficam solubilidades em g/kg e mmol/L, cor e odor.**
- [ ] **GHS só em 195/491** (harmonizado CLP). Completar com PubChem PUG View "GHS Classification" (notificações agregadas, com aviso "notificado, não harmonizado") para os outros ~300; marcar origem.
- [~] **608 textos em inglês sem tradução** (`traducao: "pendente"`: ChEBI 373, Gutenberg 235). Tradução local em lote com o Qwen3-4B (job `pipeline/traduzir_textos.py`, cache por hash, campo `traducao: "automatica"`, revisão por amostragem) — o site já cai no original com aviso, mas a busca penaliza o inglês e as respostas de conceito ficam piores. **→ 16–17/10/2026: eram 1.540 (ChEBI 1.305 + Gutenberg 235); traduzidos pelo kilo (Qwen3.8 Max) com validador de números/fórmulas (`pipeline/traduzir_textos.py`, `pipeline/traducoes/`), aplicados no build como `textoPt`/`tituloPt` com `traducao: automatica`; falta revisão humana por amostragem.**
- [~] **Tabelas de referência em `regras.json`** (fatos, com citação por valor): potenciais padrão de redução e Ka/pKa comuns (páginas de dados da Wikipédia + Wikidata P1117), `pKw` por temperatura, `incompatibilidades` (HSDB/NIOSH via PubChem; **CAMEO só link**). **Kps e entalpias de formação não têm fonte aberta estruturada** — compilar à mão de fontes múltiplas abertas, com citação. Cada tabela gera 1–3 famílias novas de perguntas e calculadoras (Nernst simples, pH de ácido fraco, solubilidade molar). **→ 17/10: potenciais padrão da série de reatividade, `solubilidadeBases` (Kps), `agua.pKw` por temperatura, com fontes; faltam Ka/pKa comuns e incompatibilidades.**
- [~] **Elementos**: 118 com `afinidadeEletronicaKJmol` só em 57, `grupo` em 88 (lantanídeos/actinídeos sem grupo é correto), `pontoEbulicaoK` 93. Completar via Wikidata/CIAAW (pesos atômicos 2021; uso educacional) e **isótopos** (abundância P2374, semivida **P2114** — P2050 é envergadura) para perguntas de radioatividade. **→ 16/10: energia de ionização de 88 elementos pelo NIST via Wikidata; afinidade eletrônica continua do PubChem marcada `revisar`.**
- [ ] **Nomenclatura em português**: `nomeIupac` vem em inglês do PubChem (489). Gerar nome IUPAC em português por regra para as classes simples (óxidos, ácidos, sais, hidrocarbonetos até C10) e marcar `nomeIupacPt` com `geradoPor: regra`; onde a Wikipédia-pt dá o nome, usar o título.
- [ ] Agrupar `textos/<fonte>/*.json` em **lotes** como os compostos (1.786 arquivos → ~40): o deploy completo cai de ~1.930 para ~180 arquivos (a cota de 5.000/24 h é dividida com eleições), menos requisições no app; manter o id por texto no `index.json`.

### 8.2 Dataset (mais perguntas, e perguntas melhores)
- [~] **Desbalanceamento**: 16.148 "fato" de template × 479 conceitos × 594 segurança × 419 recusas. Metas para a próxima geração: conceitos ≥ 2.000 (um por seção dos 1.178 textos em português já no pacote: "explique", "dê um exemplo", "qual a diferença entre X e Y", "por que"), segurança ≥ 1.500 (uma pergunta por frase H/P de cada composto com GHS + "o que fazer se…" via primeiros socorros de fonte pública), recusas ≥ 1.000 com paráfrases adversariais (gírias, erros de digitação, pedidos indiretos "para um trabalho da escola").
  **Feito em 11/10/2026 (madrugada; QA 24.023 → 29.673, NLU 18.206 → 20.492, ver `dataset/README.md`):** conceitos **2.012** sem contar variantes (479 à mão + 1.533 recortes literais dos textos em português: "o que é", "explique", "para que serve", características, onde ocorre, origem do nome, "conte mais", biografias e 34 "qual a diferença entre", com atribuição CC BY-SA e filtros de segurança — `fam_conceitos_texto.py`); segurança **2.101** sem variantes (+1.507 do rótulo por composto: 662 frases H, 455 pictogramas, 195 palavras de advertência e 195 "cuidados" — `fam_seguranca_rotulo.py`, com `contexto` para o explicador); instruções `<...>` do Anexo III tiradas das frases H. **Falta:** frases **P** (o pacote não as tem: coletar o Anexo IV do CLP e as P harmonizadas no pipeline), "o que fazer se…" (primeiros socorros de fonte pública ainda não está no pacote), "por que"/"dê um exemplo" (não há como recortar com segurança sem revisão) e as **recusas ≥ 1.000** (não ampliadas nesta rodada; continuam 419).
- [~] **Perguntas de comparação e raciocínio** (hoje só `comparar_massa_molar`): "qual é mais eletronegativo", "qual tem maior ponto de ebulição e por quê", "ordene por reatividade", "qual é mais ácido" — ancoradas nas tabelas de 8.1.
  **Feito para elementos (11/10/2026):** 1.418 pares em `comparacoes.jsonl` (`fam_comparacoes.py`) — pares vizinhos do mesmo grupo e do mesmo período (1.050), trios para ordenar (210) e extremos de grupo/período (158) em eletronegatividade, raio, energia de ionização, fusão, ebulição, densidade e massa atômica; o valor do pacote decide e a tendência geral entra só como explicação, citada literalmente do Wikilivros (com aviso quando o par foge dela). NLU com comparações por adjetivo/trios/extremos. **Falta:** "qual é mais ácido" (precisa de pKa, §8.1) e o rótulo do raio (o campo é raio de van der Waals, ver `PROJECT_MEMORY.md` §6.e) também nesta família.
- [ ] **Multi-turno** (o app de eleições já tem contexto de sequência): "e o do potássio?", "e em gramas?", "desenhe" após uma resposta; gerar 1.000 pares com histórico curto para o NLU (campo `contexto`).
- [ ] **Cálculos**: faltam diluição em série, mistura de soluções, titulação (ponto de equivalência), pH de ácido fraco (Ka), Kps→solubilidade, Lei de Hess, rendimento percentual com reagente limitante combinados, gases (mistura, Dalton), calorimetria (q = m·c·ΔT), meia-vida. Cada um = calculadora em `web/src/quimica/js/calc/` + Kotlin + gerador + teste de fidelidade numérica.
- [ ] **Desenho**: 970 pares só "mostre a estrutura". Acrescentar "desenhe o isômero…", "estrutura de Lewis de…" (gerar por regra para moléculas pequenas), "qual a geometria (VSEPR) de…", "quantas ligações pi"; verificar que o SmilesDrawer renderiza íons/aromáticos de todos os 491 SMILES (teste automático de render no E2E).
- [x] **Variedade linguística**: 4.258 moldes de 3 palavras para 24 k pares — ampliar paráfrases (sem pontuação, erros comuns "acido", "molecula", maiúsculas, fórmulas com dígitos subscritos Unicode, nomes populares: soda cáustica, cal virgem, água oxigenada, bicarbonato) e perguntas "fora de escopo" com resposta de limite (física, biologia, dever de casa inteiro).
  **Feito em 11/10/2026:** `variantes.jsonl` com 1.061 pares (870 informais — minúsculas, sem acento, "oq", "vc", "eh", erro de digitação —, 97 com fórmula subscrita e 94 com nome popular), 5 % dos pares por hash estável + até 4 por nome popular; 24 nomes populares, cada um com a evidência no pacote (`nomes_populares.py`; fora por falta de correspondência: "cloro de piscina", "soda" sozinho, "álcool" sozinho, "cal hidratada/apagada" — dois registros com o mesmo nome — e "gelo seco"). NLU: 1.082 variantes (881 informais, 178 subscritas, 23 com nome popular). Fora de escopo: 131 pares em `escopo.jsonl` (tipo `fato`, resposta de limite) e no NLU (`DESCONHECIDA`; dever inteiro → `AJUDA`).
- [ ] **Revisão humana** dos 85 pares de segurança e amostra de conceitos (`revisadoPor`), antes de treinar.
- [ ] **Avaliação**: holdout por família + conjunto "perguntas reais" (capturadas opt-in quando o site estiver no ar) como no app de eleições; gate de alucinação numérica já existe (`eval_fidelidade.py`).

### 8.3 Produto e operação
- [~] ~~Cliente web/Android ainda **não chamam a API**~~ (nuvem opt-in ligada no site e no Android em 14/10/2026, §4). ~~Falta só o `MelhoriaClient`~~ (site feito em 16/10; Android na 1.0.1) (captura opt-in com filtro de dado pessoal; aqui sem filtro político, mas com filtro de **pedidos perigosos** — nunca capturar texto de síntese recusada).
- [ ] Deploy: se a cota da Vercel voltar a estourar, ligar o repositório ao projeto (Git integration) ou usar lotes de textos (8.1).
- [x] Monitoramento: `quimica-data-freshness.yml` já alerta por idade (240 h); ~~acrescentar alerta de **divergência de números**~~ (feito 16/10: `tools/comparar_pacotes.py` + passo bloqueante no `quimica-data-refresh.yml`, issue `divergencia-dados-quimica`) entre pacote novo e anterior (ex.: massa molar mudou > 0,5 %) antes de assinar.

## 8.4 Paridade do assistente com o app de Eleições (`docs/PADRAO_ASSISTENTE.md`, 12/10/2026)
Feito na web em 12/10: campo que cresce (1–3 linhas, Enter envia), campo limpo ao enviar, histórico de perguntas com cartão ▲▼ e
teclas ↑/↓ (prefs, só no navegador), estados do envio (X, enviar desabilitado, spinner, chips desabilitados), origem + data dos
dados na resposta, copiar resposta, fechar resposta, relatar problema (issue com a pergunta no título), anúncio "Analisando…".
- [x] **Android (química):** ~~limpar o campo ao enviar; setas ▲▼ no histórico (hoje só lista "Perguntas recentes"); campo multilinha ~~ **(feito na 1.0.1, 17/10/2026: campo limpo, ▲▼, origem + data; desvios do NLU alinhados)**
      sem `
`; ~~"Relatar problema"~~ (feito 14/10); mostrar origem + data dos dados. Molde: `apps/eleicoes2026/app/.../ui/components/SearchBarAi.kt`,
      `HistoricoPerguntas.kt`, `Dialogos.kt:68-101`.
- [ ] **Contexto da conversa mais amplo** (web e Android): herdar quantidade/unidade em cálculos ("e em gramas?", "e para 2 mol?"),
      equação anterior ("balanceie de novo com O3"), e limpar o contexto ao fechar a resposta/trocar de tela (`engine.limparContexto`
      existe e ninguém chama). Molde: `resolverContinuacao` em eleições.
- [ ] **Chips da home mudam a cada resposta** (hoje são 11 fixos) e "Limpar histórico" nas configurações.
- [~] **IA na nuvem** ~~(botão, consentimento)~~ feita na web em 14/10/2026 (§4; sem gate pelo manifesto: o kill switch é o `MODAL_ENDPOINT` da Vercel, 503 `disabled` = aviso de indisponível). ~~Falta **"Ajudar a melhorar o app"**~~ (feito no site em 16/10/2026; Android na 1.0.1) (endpoint novo com filtro de dado
      pessoal; sem filtro político aqui, mas nunca capturar texto de pedido perigoso).
- [ ] **Relatar problema com diálogo e `/api/report`** (hoje é link para a issue) — copiar `apps/eleicoes2026/api/report.js`.
- [ ] **Nível (fundamental/médio/superior) na web** como preferência que muda o motor (o Android já tem; `nlu.nivelDe` existe e é ignorado).
- [~] ~~Instalar PWA na barra (não só em configurações) com instruções para iOS~~ (feito em 14/10/2026: botão na barra quando o navegador
      oferece a instalação ou no iOS sem o app; clique = prompt nativo ou Configurações#instalar; mesmo padrão no AchaVagaIA); economia de dados;
      checagem de dados ao voltar o foco.
- [ ] Eleições web: mover o foco para o título da resposta (como Química faz).

## 9. Decisões pedidas ao mantenedor (10/10/2026, noite)
1. **LibreTexts *Química 1e/2e (OpenStax)* em português** rotulado CC BY 4.0 (edição de 2019, licença irrevogável) × decisão atual de respeitar a vontade da OpenStax (NC-SA + anti-IA nas edições novas). Usar ou manter só link? Hoje: só link.
2. **Monetização:** CIAAW, OpenStax, PhET e o plano Hobby da Vercel só valem para uso não comercial. Confirmar que o app segue gratuito e sem anúncios (hoje sim).
3. **Pedidos de permissão** (opcionais): OpenStax (formulário), SBQ para QNEsc, OMS/OIT para ICSC em português (ipcsmail@who.int), IUPAC para o Gold Book inteiro.

## 9.b Atualização semanal no GitHub × PubChem (12/10/2026)
- [ ] **O runner do GitHub leva 429 do PubChem antes de terminar** (duas execuções: 11/10 agendada e 12/10 manual, ambas no build). O cache
      de coleta agora é salvo mesmo em falha (9573091) — a execução de 12/10 guardou 7 MB —, então cada rodada avança um pouco, mas pode
      levar semanas até completar. Saída mais rápida, a decidir com o mantenedor: **semear o cache** com o `pipeline/.cache` local (27 MB,
      respostas públicas do PubChem/Wikidata/Wikimedia) publicado como asset de uma release `cache-seed` e baixado pelo workflow quando o
      cache do Actions estiver vazio. Alternativa: rodar o build sempre local e deixar o workflow só publicar o que está no repositório.
- [ ] Enquanto isso o site segue com o pacote de 11/10 (978 compostos); a issue `alerta-dados-quimica` (#17) fica aberta até uma execução
      bem-sucedida.

### 9.c Publicação de 12/10 (noite) — o que aconteceu
- `quimica-data-refresh.yml` (run 38286751540) ficou **1 h 45 parado** em "Construir, validar e assinar o pacote" (cache HTTP do
  runner sem o PubChem completo + bloqueio do IP; `--paciente` espera até 15 min por tentativa). Cancelado; a publicação foi feita
  **do diretório local** (`vercel deploy --prod --yes --token <VERCEL_TOKEN_TIME>` em `apps/quimica`, pacote já comitado) e
  conferida ao vivo (`/quimica/api/health` = `acde06a`, `data/manifest.json` com `idiomas` e 53 arquivos).
- [ ] Fazer o workflow **não reconstruir** quando o pacote comitado já é mais novo que o publicado (publicar o que está no Git),
      ou enviar o cache HTTP completo para o cache do GitHub a partir desta máquina; hoje toda execução agendada corre o risco
      de ficar horas esperando o PubChem.
- [ ] `tools/vercel_cota.py` com o token do time respondeu **HTTP 403 / 0 de 0** mas o deploy funcionou: o endpoint de sondagem
      (`POST /v2/files` vazio) parece bloqueado para tokens de time — rever a sondagem antes de confiar na medida.

## 10. Conferência com os livros de referência (11/10/2026) — o que ficou para depois
Relatório local em `local/conferencia_livros/RELATORIO.md` (fora do Git). Já corrigido no pipeline: massa molar pela fórmula,
CAS (desempate e item do elemento), duplicatas, carbono/arsênio sem fusão a 1 atm; rótulo "raio atômico (van der Waals)".
- [x] **Energia de ionização desatualizada no PubChem** (Ta, W, Os, Ir, Fr, Ac, Th; 1,5–4,5 %): trocar a fonte desses valores por **→ corrigida em 16/10 via Wikidata/NIST (Ta 728,4; W 758,8; Os 814,2; Ir 865,2; Fr 393,0; Th 608,5; Ac sem valor NIST, marcado).**
      uma aberta e atual (Wikidata P2260, com referência ao NIST) e registrar a fonte por valor. O NIST ASD é "todos os direitos
      reservados": só link.
- [~] **Afinidade eletrônica desatualizada** (B, F, Al, Fe, Ga, Ge, Rb, Nb, Sn, Sb, La, Ce, Tl, Pb, Fr; ex.: Tl 19,3 × 36,4 kJ/mol): **→ 16/10: sem fonte aberta estruturada (Wikidata não tem); valores marcados `revisar` com aviso na ficha.**
      mesma estratégia (Wikidata, se houver propriedade com referência); senão, marcar como "valor antigo" ou não publicar.
- [x] **Eletronegatividade**: documentar na interface e em "Sobre os dados" que é a escala de Pauling com os valores revisados **(feito 16/10: `regras.propriedades.eletronegatividade.nota/escala`, fontes e ficha do elemento)**
      (Allred), como no PubChem; livros que usam os valores originais diferem (W 1,7 × 2,36; Pb 1,8 × 2,33).
- [ ] **Bk** (fusão 1323 K × 1259–1269 K), **Tc/Mt** (isótopo mais longevo: ⁹⁸Tc, ²⁷⁸Mt), densidade de **Tc** (calculada),
      **Cs** e **Am**: rechecar em Wikidata/PubChem e marcar "estimado/calculado" quando for o caso.
- [x] **Água deuterada**: conferir no próximo build que a fórmula aparece como D₂O (regra nova do pipeline). **(conferido 16/10: D₂O, CID 24602)**

## 11. Observações do agente do dataset (11/10/2026)
- [ ] **Recusas (meta ≥ 1.000) não foram ampliadas**: o agente se recusou a escrever paráfrases "adversariais" de pedidos de
      explosivos, armas e drogas, mesmo para treinar recusa. Ficam as 419 revisadas. Alternativa a decidir com o mantenedor:
      ampliar pela **regra de recusa do próprio app** (casos do contrato `contracts/seguranca_cases.json`, escritos e revisados
      por pessoa) em vez de gerar pedidos perigosos novos.
- [ ] **33 trechos com id de mais de 80 caracteres** são rejeitados pelo montador do explicador (já tira 2 pares escritos à mão,
      co-0318 e co-0319): encurtar os ids no pipeline (ex.: hash curto do título) e regenerar.
- [ ] Frases P (precaução) não estão no pacote: as respostas dizem isso e remetem à FDS/FISPQ. Primeiros socorros e "qual é
      mais ácido" dependem de fonte nova (HSDB/NIOSH via PubChem; pKa do Wikidata — §8.1).

## 12. Internacionalização (12/10/2026) — contrato em `I18N.md`

Decisão do mantenedor: pt-BR padrão; **en, es, de, fr** com assistente completo; chinês depois; Eleições só em português.
Etapas (A–F em `I18N.md` §9):
- [x] **A** site (12/10): base de i18n (`js/i18n/`), catálogos pt-BR (referência) e en completos, léxico compartilhado
      `contracts/lexico/<idioma>.json` → `tools/gerar_lexico.py` → `js/nlu/lex/`, seletor (globo + Configurações, `?lang=`),
      textos em lotes no `data.js`, segurança nos cinco idiomas, golden 254 casos (pt-BR + en), segurança 272 casos.
- [x] **B** pipeline (12/10): `nomes`/`sinonimosPorIdioma`, `index.nomesPorIdioma`, GHS `textoPorIdioma` (EUR-Lex), Wikipédia
      en/es/de/fr via sitelinks, `textos/index.json` + 36 lotes (pacote: 2.742 → 56 arquivos, 15 MB), contrato reescrito.
      Apelidos do Wikidata iguais a palavras funcionais ("PARA") são descartados (pipeline e dicionário do site).
- [x] **C** home (12/10, no ar): `/en/`, `/es/`, `/de/`, `/fr/` + `hreflang` + regras no proxy de eleições publicadas.
- [x] **D** (12/10): catálogos es/de/fr completos (1.056 chaves cada, `revisao: 'pendente'`), privacidade e manifesto por idioma,
      golden es 137 / de 150 / fr 183 casos (21 intenções), segurança ≈ 75 recusar / 90 permitir por idioma, léxicos ajustados
      (verbos separáveis em de, elisão em fr, `elaborar` em es). Revisão nativa pendente — termos a conferir: es "disolución",
      "balanceo"; de Protolysegrad, Normbedingungen, Edukte/Produkte, Ka/Kb; fr "jeu de données", CNTP, "métal pauvre".
- [x] API da nuvem (12/10): segurança nos cinco idiomas (léxico compartilhado + regras pt próprias, em OU) e ancoragem com formas
      por idioma (`api/_lib/vocab-i18n.js`); cópias geradas em `api/_lib/lexico/` (`node _lib/lexico/sincronizar.mjs --check`),
      porque `.vercelignore` exclui `contracts/`. Falta: `fold` do `ground.js` não trata elisão francesa ("énergie d'ionisation") —
      2 golden fr foram retirados até corrigir.
- [x] **E (núcleo)** Android (12/10): `tools/gerar_lexico_kt.py` → `ai/nlu/lexico/` (5 léxicos + índice, `--check`); `LocalNlu`,
      `Seguranca`, `Dicionario`, `Propriedades`, `Pacote` (lotes + `textoPorIdioma`) por idioma; seletor em Configurações
      (`LocaleManager`/`attachBaseContext`, `locales_config.xml`); `bundle.language.enableSplit = false`; snapshot de assets
      atualizado (2.744 → 55 arquivos; APK debug +0,5 MB); golden e segurança por idioma no mesmo contrato.
- [x] **E (strings)** Android (12/10): 818 strings + 3 plurais em `res/values{,-en,-es,-de,-fr}/strings.xml` (única fonte;
      `domain/Textos.kt`, `ui/RecursosAndroid.kt`, testes leem o XML do disco sem Robolectric); rótulo de reserva de nome;
      números/datas por idioma; 124 testes, lint 0 erros; APK debug +0,97 MB (`resources.arsc`). Falta: pistas de cálculo só em
      pt no `AnswerBuilder` ("ácido forte", "final", CNTP, "misturar") → mover para `contracts/lexico`; letra da célula da tabela
      (`CategoriaElemento.letra`) ainda é a inicial em português; revisão nativa (níveis de ensino, sugestões em fr, "paquet de données").
- [ ] Miúdos do site achados na etapa D: `ligarQuantidades` exige preposição (alemão "4 g H2 und 16 g O2"); quantidade só aceita
      ASCII no 1º token ("20 degrés Celsius"); nomes de elemento com < 3 letras ("or", ouro em fr) não entram no dicionário;
      "radio" (Ra) vence "radio atómico"; aproximação faz "Francia" virar frâncio; `calc/gas.js` baixa "Druck"/"Volumen";
      "rótulo: valor" sem espaço antes dos dois-pontos em fr; composição percentual com nome pt; licenças de `fontes.json` em pt.
- [ ] Pipeline: apelidos comuns em de (Salzsäure, Natronlauge, Essig, Zucker) e fr ("eau de Javel") não vêm do Wikidata; glicose sem es/de/fr.
- [ ] Pipeline, miúdos: `regras.nomenclatura` por idioma; H281/H351/EUH211 sem texto em algum idioma (formato da linha no
      EUR-Lex); glicose (CID 5793) cai no item "D-glucopyranose" do Wikidata (sem es/de) — conferir o casamento do item.
- [~] **E** Android: ~~`strings.xml` por idioma, léxico gerado do mesmo JSON, seletor~~ (feitos: `values-{en,es,de,fr}`, `LexicosGerados.kt`, Configurações > Idioma); falta a leitura dos lotes de textos por idioma e a revisão nativa dos ~770 textos antigos (só os de 14/10 foram revisados).
- [ ] **F** dataset e avaliação por idioma; retreino do NLU em nuvem com os cinco idiomas.
- [ ] Revisão humana das traduções (catálogos marcados `revisao: pendente`). **Conferência com o DeepL feita em 12/10**
      (`REVISAO_DEEPL_2026-10-12.md`: 771 textos × 4 idiomas, nenhum parâmetro errado, divergências concentradas em
      terminologia em que o catálogo está certo); chave em `secrets/deepl_api_key.txt` (cota de 500.000 caracteres/mês, 133 mil usados).
- [ ] Pacote completo multilíngue: rodar o build cheio (Wikipédia ×4) e medir tamanho e quantidade de arquivos antes de publicar
      (cota de upload da Vercel — `tools/vercel_cota.py --minimo N`).

## 13. Mapa dos livros didáticos (17/10/2026) — `docs/MAPA_LIVROS.md`
Livros protegidos usados só como bússola (derivados locais em `local/mapa_livros/`, fora do Git). 15.382 exercícios segmentados, 2.052
classificados por modelo local; 70 % caem em intenções do app. Feito em 17/10: lista fixa corrigida (9 compostos descartados por 404 do
PubChem voltam com `cid=`), +11 compostos e 2 apelidos; 7 lacunas das regras do NLU corrigidas (site + Android + léxico + golden).
- [x] **Rebuild do pacote** (17/10, noite): local, `--alvo 2000 --paciente --pubchem-cache-primeiro` (473 s); `listaFixaDescartadas`
  vazia, 20 compostos novos/recuperados no pacote; total segue 1.971 (o Wikidata cede 20 vagas). Depois, com `--pubchem-offline` (44 s),
  o pacote `20261017T200629Z` ganhou a **termoquímica padrão** (`entalpiaFormacaoKJmol` 281, `energiaGibbsFormacaoKJmol` 81,
  `entropiaPadraoJmolK` 258; chembox da Wikipédia en + Wikidata forte; `DATA_CONTRACT.md` §3.1) e foi copiado para os assets do Android.
  O `quimica-data-refresh.yml` na nuvem continua a falhar no PubChem: publicar o pacote pelo commit + deploy local até ele voltar.
- [x] **Corpus v3.5** montado (17/10, noite; `ia/corpus/quimica_v35.py`, 12 famílias × 5 idiomas + moldes pt das 4 intenções em
  `dataset/gerar_nlu.py`): 75.041 pares (treino 68.589; química 69,9 %), holdouts `holdout_v35_*` 472 casos, 36 testes verdes, vazamento
  golden × treino limpo. **Não treinado.** Decisões a confirmar antes do treino: tetos de 850 (pt) e 180 (estrangeiros) por intenção para
  caber abaixo de 70 % (cortam PROPRIEDADE, CONCEITO, SEGURANCA…); família `configuracao` extra; comando em `ia/treino/README.md` (~4 h).
- [ ] **Treinar e passar no gate o NLU v3.5** — **treino iniciado em 18/10/2026 às 02h52** (`ia/treino/out/nlu-v35-cont/pipeline.sh`:
  mistura 43.360 pares → continuação do LoRA v3.4, `max_length 288`, 2.710 passos, ~3 h 50 → `exportar_gguf.py --q8` → `gate.sh` com os 13 holdouts
  do v3.5 + os do v3.4). Cortes do corpus confirmados em 18/10: teto pt 760 por intenção (era 850) com **piso de 25 exemplos por id de propriedade**
  (6 por idioma estrangeiro; `--piso-propriedade-*` em `montar_corpus.py`) — só pelo hash, `ligacoesRotaveis`/`doadoresH`/`carga` ficavam com 5–10;
  química 69,8 % do treino (`ia/corpus/README.md`). Depois do gate: `empacotar_versao.py`, `modal volume put` ×3, `promover.py`, `SNAPSHOT_EPOCH` +
  `modal deploy` do `nlu_app.py` (o serviço ainda roda o `nlu_core.py` ANTERIOR, sem as 4 intenções nem os 3 ids novos), `MODEL_VERSION` na Vercel.
- [x] **Calculadoras novas** (17/10, noite, ordem do mantenedor: entalpia, configuração eletrônica, NOX, Kc/Kp, tipo de ligação) —
  contrato, fontes e decisões em `docs/CALCULADORAS_2026-10-17.md`; intenções NOX/ENTALPIA/EQUILIBRIO/LIGACAO em todos os espelhos;
  site (calc/, nlu.js, answers.js, tela Calculadoras, catálogos 5 idiomas; 217 testes, E2E Chrome), golden 873 → 929; Android portado em paridade (domain/calc/{Entalpia,Eletronica,Nox,Equilibrio,Ligacao}.kt, RespostasCalculadoras.kt, LocalNlu 2b/5b, 5 cartões em Calculadoras.kt, 196 strings × 5 idiomas; 242 testes, golden 929, lint sem aviso novo; tela ainda não testada no aparelho).
  Reavaliação do mapa (`MAPA_LIVROS.md` §3): 61 perguntas derivadas passaram a ENTALPIA/LIGACAO/NOX; EQUILIBRIO segue 1/45 porque a
  pergunta derivada perde a equação (exigida pelo contrato).
- [x] Lacunas que o mapa mostrava nos temas novos — resolvidas em 18/10 (abaixo), exceto Kps/solubilidade de sais: Kc sem equação (→ CONCEITO com
  ação), prótons/nêutrons/elétrons de íon ("Fe2+" caía em COMPOSTO), `energiaGibbsFormacaoKJmol`/`entropiaPadraoJmolK` sem id nem ficha,
  `MEDIDAS_COMPOSTO` sem a entalpia de formação.
  - [x] **18/10/2026, camada "contrato do NLU"** (`CALCULADORAS_2026-10-17.md` §7): ids `energiaGibbsFormacaoKJmol`, `entropiaPadraoJmolK` e
    `particulas` no fim do vocabulário (nlu_core, api/vocab, propriedades.js, Propriedades.kt, dataset); íon de um elemento → `elemento` +
    `cargaFormula` e número de massa → `numeroMassa` (campos só do cliente, mesclados na interpretação da nuvem); ΔGf/ΔG°f/ΔG de formação;
    Kc/Kp sem equação → CONCEITO "constante de equilibrio"; léxico 5 idiomas, golden 929 → 984, site e Android em paridade, dataset regerado.
  - [x] **Camada de respostas (18/10, madrugada; site e Android em paridade):** `particulas` (prótons = Z; elétrons = Z − carga; nêutrons =
    A − Z com A da pergunta — "C-14", "⁵⁶Fe" — ou, na falta, a massa atômica arredondada ROTULADA como aproximação, "depende do isótopo"); íon
    nomeado (cátion Fe²⁺/ânion Cl⁻) com a conta; ELEMENTO com `cargaFormula`/`numeroMassa` ganha a linha do íon/isótopo; ΔGf°/S° na ficha
    (`MEDIDAS_COMPOSTO` += ΔHf°, ΔGf°, S°, com fonte por valor, "estado padrão a 298,15 K" e fase do `estadoPadrao` quando a fonte não marca) e
    em PROPRIEDADE/COMPARAR ("mais negativo"); sem valor → "falta ΔGf° de X; o app não estima"; CONCEITO "constante de equilibrio" com parágrafo
    por regra (Kc, Kp = Kc(RT)^Δn), pedido da equação e ação "Abrir a calculadora de Kc e Kp" (`/quimica/calculadoras/equilibrio?t=500&ut=K`
    pré-preenche a temperatura); fonte repetida no mesmo bloco removida (bug da ligação, só no site). Site 229 testes (226 + 3 pulados antigos);
    Android 255 testes, lint 0 erros; `web/tools/screenshots.mjs` com cenários de partículas e ΔGf°. Textos en/es/de/fr novos sem revisão nativa.
    **Fica:** "compare o ΔGf do metano e do CO2" cai em PROPRIEDADE (a regra do Δ vem antes de COMPARAR; o site responde maior/mais negativo
    mesmo assim; com as formas por extenso já é COMPARAR); Kps/solubilidade de sais; texto da Wikipédia pt sobre constante de equilíbrio chega
    com TeX cru (`{\displaystyle…}`) e é filtrado — vale limpar no pipeline.
- [ ] **Classes de compostos** (éster, alceno, amida, álcoois…) no léxico/CONCEITO — item de 6.b, sobe de prioridade (citadas 20+ vezes).
- [ ] OCR dos 3 livros só imagem (Levine, Martha Reis FQ, McQuarrie) se o mapa precisar de físico-química de nível superior em pt.
- [ ] Conferência de respostas × gabaritos ficou inconclusiva por desenho (pergunta derivada é 1 passo; alternativa tem valores
  intermediários): só vale com um resolvedor de problema inteiro (explicador).

## Pendente com o mantenedor (resumo)
1. ~~`VERCEL_TOKEN_TIME`~~ criado em 11/10.
2. Origem da chave `apikey-sabetudo.txt`.
3. Permissão da OpenStax (opcional; em 17/10 a termoquímica foi resolvida sem ela, pelo chembox da Wikipédia en — o CLAUDE.md da química passou a dizer "OpenStax e LibreTexts só como link").
4. ~~Tokens do Modal~~ (par de Proxy Auth criado pelo mantenedor em 13/10, em `secrets/modal_proxy_quimica.env` da raiz e na Vercel); conta do Hugging Face para o explicador; **teto de gasto no Modal** (ainda não definido).
5. ~~Chave de upload~~ (criada em 14/10, fazer backup) e conta da Play para o Android (criar o app, subir o AAB, teste interno → fechado). **AAB 1.0.3 (versionCode 4) gerado em 18/10** (`docs/RELEASE_1.0.3.md`, notas em `store/play/release-notes-1.0.3.json`); testar num aparelho antes de enviar (nenhum conectado em 18/10 de madrugada).
