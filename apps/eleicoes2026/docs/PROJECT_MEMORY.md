# Memória do projeto — SaibaTudo Eleições 2026

> **Repositório único (11/10/2026).** Este app vive em `apps/eleicoes2026/` do repositório `franciscoaleixoIOT/SaibaTudo`
> (o antigo `SaibaTudo-Eleicao2026`, renomeado; o GitHub redireciona). Rode os comandos daqui. Workflows na raiz, com prefixo:
> `.github/workflows/eleicoes-*.yml` (publicar: `gh workflow run eleicoes-data-refresh.yml`). A **home** de saibatudo.net saiu
> deste app: é o projeto `portal/` (Vercel `saibatudo-portal`), servido pelas regras de proxy do `vercel.json` daqui. O
> `VERCEL_TOKEN` do GitHub é restrito a este projeto. Guia da raiz: [`../../../CLAUDE.md`](../../../CLAUDE.md).

> **Atualizado em 09/10/2026** (entre o 1º turno, 04/10, e o 2º, 25/10). Feito para que outra pessoa, ou outra sessão do Claude, assuma o projeto sem contexto prévio:
> o que está no ar, **como publicar**, **como testar**, o que o mantenedor decidiu e o que já deu errado.
> Estado operacional contínuo (alertas, chaves de desligamento, ciclo de auto-melhoria): [`OPERACAO.md`](OPERACAO.md).
> Entrada para agentes de código: [`../CLAUDE.md`](../CLAUDE.md). Contrato de dados: [`DATA_CONTRACT.md`](DATA_CONTRACT.md).

## 1. Em uma página — estado em 09/10/2026

| Peça | Estado |
| :-- | :-- |
| Fase eleitoral | Entre turnos. 2º turno em **25/10/2026**. **Congelamento de 24 a 26/10** (ver §4.9). |
| Site/PWA `saibatudo.net` e API | No ar na Vercel. Versão publicada = commit curto em `GET /api/health` (conferir contra `git rev-parse --short HEAD`). |
| Pacote de dados | Atualizado a cada 30 min pelo GitHub Actions, assinado (ECDSA P-256). Já traz os resultados do 1º turno (governadores e deputados); **Presidente só pela apuração ao vivo do TSE** (ver §7). 19/10: percentual de Presidente no pacote agrupado por `SG_UE` (antes, pela UF da linha: 100 % e 99,92 % para os dois classificados). |
| IA de interpretação (NLU) | Modelo **`v2.3-20261007`** no Modal (CPU). Intenção 93,7 % nos 111 casos de referência e 96,8 % em 435 perguntas reservadas. Treino e conversão **locais**. |
| IA generativa (texto gerado) | **Ligada desde 07/10.** Space privado `franciscoaleixo/saibatudo-qwen7b` no ZeroGPU do Hugging Face (principal), Modal L4 como reserva (15/dia). Só roda quando a pessoa toca em "Gerar explicação com IA". Desde 22/10 o rótulo nomeia o modelo que respondeu (`model` da API). Troca pelo explicador SaibaTudo IA: ask-v1.3 reprovou no holdout de eleições em 22/10 (5,3 %); v1.5 em treino. |
| Captura de perguntas ("Ajudar a melhorar o app") | Servidor ligado desde 06/10, Redis no Upstash. No app é **opt-in, desligado por padrão**. Filtro de dado pessoal e de opinião política no aparelho e no servidor. |
| Política de privacidade | **Versão 1.4** (07/10/2026), em `docs/PRIVACIDADE.md` e `web/src/privacidade/index.html` (devem ser idênticas). |
| Android | Teste fechado na Play em andamento. A **1.0.3 (versionCode 4)** foi enviada à Play; a **1.0.4 (versionCode 5)** foi gerada mas não publicada; a **1.0.5 (versionCode 6)** (12/10/2026) traz a 1.0.4 + "deputado mais votado" + ponta a ponta do Android 15 sem `statusBarColor`/`navigationBarColor` (apontados pelo Play Console). AAB assinado em `app/build/outputs/bundle/release/`; falta testar num aparelho e enviar (`docs/RELEASE_1.0.5.md`). **19/10:** o código do app ganhou os textos do 2º turno (local de votação, prazos de justificativa, link novo do Autoatendimento) e a regra "não votei no 1º turno"; só chegam a quem instalar um release novo (versionCode 7), decisão do mantenedor. |
| CI | `eleicoes-web-ci.yml`, `eleicoes-android-ci.yml`, `eleicoes-data-refresh.yml` verdes no commit `cc804a3` (09/10). |
| Custos | Dentro dos US$ 30/mês grátis do Modal (§8). Cobrado até agora: **US$ 0**. |

## 2. Identidade, contas e onde cada coisa mora

| Item | Valor |
| :-- | :-- |
| Nome | SaibaTudo Eleições 2026 (repositório `SaibaTudo-Eleicao2026`; ecossistema SaibaTudo.Net) |
| Pacote Android | `net.saibatudo.eleicoes2026` |
| Repositório | <https://github.com/franciscoaleixoIOT/SaibaTudo> (MIT). Nesta máquina o git está configurado como **Cacx01** (Cauã); os commits do dia a dia saem com esse autor. |
| Equipe | Francisco Aleixo (mantenedor, @franciscoaleixoIOT), Cauã Francisco (@Cacx01, dono da conta do Play Console) |
| Vercel | projeto `saibatudo`, time `franciscoaleixo-9696`, domínio `saibatudo.net` (plano Hobby, uso **não comercial**) |
| Modal | workspace `franciscoaleixo/main`. Apps: `saibatudo-nlu` (CPU 8 núcleos, 3 GiB, desliga em 5 min desde 14/10/2026, snapshot de memória ligado, máx. 2 contêineres) e `saibatudo-qwen7b-awq` (L4, desliga em 120 s, máx. 1). Volume `saibatudo-nlu-models` com as versões `v1-legado`, `v2.1-20261003`, `v2.3-20261007` e o ponteiro `current.json` (hoje aponta para a v2.3). |
| Hugging Face | usuário `franciscoaleixo` (conta **PRO**: 40 min de GPU por dia no ZeroGPU). Space `saibatudo-qwen7b` (privado, `zero-a10g`). Modelo NLU publicado antigo: `franciscoaleixo/SaibaTudo-Eleicao2026` (v2.1; as versões novas não passam mais por lá). |
| Upstash | banco Redis `saibatudo` (plano gratuito, `sa-east-1`, 500 mil comandos/mês, 256 MB). Credenciais em `secrets/upstash.env`. |
| Play Console | conta de Cauã. Conta pessoal nova: exige teste fechado com **12 testadores por 14 dias contínuos**. |
| Contato público | `saibatudo@saibatudo.net` (nunca publicar o e-mail pessoal do mantenedor) |

## 3. Mapa do repositório

| Pasta | O que é |
| :-- | :-- |
| `app/` | App Android (Kotlin, Compose, MVVM). NLU local em `ai/nlu/`, respostas em `ai/answer/`, motor híbrido em `ai/engine/`. |
| `web/` | Site e PWA em JavaScript puro (sem CDN). `src/eleicoes2026/js/` espelha o app (mesmos módulos: `nlu.js`, `answers.js`, `engine.js`, `cloud.js`). Build: `node web/build.mjs`. |
| `api/` | Funções da Vercel: `nlu`, `ask`, `report`, `melhoria`, `health`. Núcleo em `api/_lib/`. |
| `pipeline/` | Coleta do TSE, ETL, validação, assinatura do pacote de dados. |
| `data/eleicoes2026/` | Snapshot oficial versionado (assets do app e semente do site). Um commit automático por dia (`chore(data): snapshot`). |
| `backend/modal/` | Serviços do Modal, gate de qualidade do modelo (`eval_golden.py`), **conversão local** (`convert_local.py`). |
| `backend/retrain/` | Ciclo de dados do modelo: geração, rotulagem, revisão humana, holdout. |
| `backend/hf_space_qwen7b/` | Código do Space do Hugging Face (texto gerado). |
| `ai_model/` | Scripts de treino local (`train_hybrid.py`, `merge_and_export.py`). Saídas em `ai_model/output/` (fora do Git). |
| `contracts/` | Casos compartilhados entre Android, site e servidor (§5.3). |
| `eval/` | **Histórico do painel de qualidade**: um arquivo por modelo em produção. Medições de apoio vão em `eval/local/`. |
| `tools/` | Verificações do CI (release R8, workflows, frescor dos dados, congelamento, métricas). |
| `secrets/` | **Fora do Git.** Chaves e tokens (§10). |
| `docs/` | Documentação. `OPERACAO.md` (estado), este arquivo (memória), `PRIVACIDADE.md`, `DATA_CONTRACT.md`, `PLAY_STORE.md`, `RELEASE_1.0.3.md` e `RELEASE_1.0.4.md` (notas e passo a passo de cada envio à Play). |

## 4. Processo de publicação

### 4.1 Regra de ouro
**Dar push na `main` não publica o site.** Quem faz o deploy na Vercel é o workflow `eleicoes-data-refresh.yml` (a cada 30 min no relógio `10,40 * * * *`, ou sob demanda). Depois de qualquer push que mude código ou documentação do site:

```bash
git push origin main
gh workflow run eleicoes-data-refresh.yml              # publica agora, sem esperar o relógio
gh run watch <id> --exit-status               # id: gh run list --workflow eleicoes-data-refresh.yml --limit 1
curl -s https://saibatudo.net/api/health      # "version" tem de ser o commit curto publicado
```

**Depois de cada push, conferir também os outros workflows** (`eleicoes-web-ci.yml`, `eleicoes-android-ci.yml`): o deploy pode estar verde com o CI vermelho (aconteceu em 07/10, ver §7).
Mudar uma variável de ambiente da Vercel só vale no **próximo deploy**: rode o `data_refresh` depois.

### 4.2 Antes do push (checklist)
1. Rodar os testes das camadas tocadas (§5.1). Para mudança de comportamento, rodar tudo.
2. Texto de privacidade? Atualizar **os dois** arquivos e o número da versão (§4.7).
3. Mudou algo que o app Android também faz (NLU, respostas, textos de consentimento)? Portar para o Kotlin e rodar o Gradle: os contratos em `contracts/` existem para pegar divergência.
4. `git pull --rebase origin main` se o push for recusado: o robô de dados cria commits na `main` (`chore(data): snapshot ...`).
5. Mensagem de commit em inglês, no formato `tipo(escopo): resumo`, com o corpo explicando o porquê. Terminar com a linha `Co-Authored-By` da sessão.

### 4.3 Variáveis e segredos
| Onde | Nomes (nunca os valores) |
| :-- | :-- |
| **Vercel (produção)** | `MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET`, `MODAL_TIMEOUT_MS`, `MODEL_VERSION`, `DAILY_BUDGET`, `MODAL_ASK_ENDPOINT`, `ASK_ENABLED`, `HF_ASK_SPACE_URL`, `HF_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `MELHORIA_ENABLED`, `GITHUB_TOKEN` (relatos) |
| **GitHub, segredos** | `DATA_SIGNING_KEY`, `UPLOAD_KEYSTORE_B64`, `UPLOAD_KEYSTORE_PASSWORD`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` |
| **GitHub, variáveis** | `ASK_ENABLED=1`, `MELHORIA_ENABLED=1` (o pipeline escreve `cliente.ask.enabled` e `cliente.melhoria.enabled` no pacote assinado a partir delas) |

Comandos: `vercel env ls production` (só lista nomes), `printf '%s' "$VALOR" | vercel env add NOME production [--sensitive]`, `vercel env rm NOME production -y`, `gh variable set NOME --body 1`.
No Git Bash use sempre `printf '%s'` (sem quebra de linha no fim). **Quando o mantenedor precisa passar um segredo, ele cola em um arquivo dentro de `secrets/` (ignorado pelo Git), não no chat.**
Ainda **não existem** no GitHub os segredos `MODAL_ENDPOINT`, `MODAL_KEY` e `MODAL_SECRET`: por isso a avaliação noturna (`eleicoes-nightly-eval.yml`) fica verde mas **pula a medição** (§9).

### 4.4 Dados
Automático. `pipeline/fetch.py` baixa só o que mudou (ETag), `pipeline/build.py` monta e assina o pacote, e o `data_refresh` publica. Testes de **integridade** bloqueiam a publicação; testes de **comportamento** sobre dados reais só avisam (lição de 05/10). Se uma publicação falhar, abre a issue `alerta-dados` (OPERACAO §2). Forçar o download de tudo: `gh workflow run eleicoes-data-refresh.yml -f forcar=true`; gravar o snapshot na `main` fora do ritmo diário: `-f commit_snapshot=true`.

### 4.5 Modelo de interpretação (NLU na nuvem) — ciclo local completo
Tudo roda nesta máquina (RTX 5060 de 8 GB). O Modal só recebe o arquivo final.

1. **Dados:** `python backend/retrain/extra/gerar_formas_v22.py > backend/retrain/extra/formas_<nova>.txt` (formulações por assunto; para o próximo ciclo, edite as listas do script) → `node backend/retrain/label_extra.mjs --in ... --out ...rotuladas_....jsonl --fonte ... --licenca ... --coletado-em AAAA-MM-DD` (o rótulo vem do NLU determinístico dos clientes, nunca da fonte) → `python backend/retrain/build_nlu_dataset.py --out backend/retrain/out-<vN> --verify --extra <jsonl>... --extra-max-pct 25`.
   Regras: extras `origem=falhas_golden` são **recusados** (ensinar a prova contamina a nota); 20 % das perguntas externas vão para o **holdout** e nunca treinam; cubra **classes inteiras** (todos os estados, todos os temas), não os casos do teste.
2. **Treino:** renomear antes `ai_model/output/SaibaTudo-Eleicao2026-hybrid` (o script reutiliza o nome), depois
   `ai_model/.venv/Scripts/python.exe ai_model/scripts/train_hybrid.py --base_model Qwen/Qwen2.5-1.5B-Instruct --dataset backend/retrain/out-<vN>/train.json --max_length 256 --epochs 3 --seed 2026 > ai_model/output/treino_<vN>.log`.
   Leva cerca de 3 h 30 e usa a GPU inteira. **Impedir a suspensão do Windows** durante o treino (o notebook suspendeu às 2h40 de 07/10 e congelou o treino por 5 h): `SetThreadExecutionState` num PowerShell que vive enquanto o processo viver.
3. **Mesclar:** `merge_and_export.py --lora_dir ai_model/output/SaibaTudo-Eleicao2026-hybrid/final --output_dir ai_model/output/SaibaTudo-NLU-<vN>-merged` e copiar `train_meta.json` para a pasta mesclada.
4. **Converter e passar no gate (local):** `ai_model/.venv/Scripts/python.exe backend/modal/convert_local.py --model-dir ai_model/output/SaibaTudo-NLU-<vN>-merged --version <vN>-AAAAMMDD --threads 8 --holdout-cases backend/retrain/out-<vN>/holdout_cases.json --previous-eval eval/<ultima-versao-em-producao>.json --previous-version <ultima> --origem "<dataset, épocas, perda>"`.
   O gate **bloqueia**: JSON válido ≥ 98 %, intenção ≥ 85 %, cada entidade ≥ 90 % (com ≥ 3 casos), alucinação ≤ 5 %, queda Q4×Q8 ≤ 3 pontos, catraca (não cai mais de 1 ponto contra a versão em produção). Reprovou → **não envie nada**; leia `ai_model/output/gguf/<versão>/eval.json`.
5. **Enviar ao Modal (só se aprovou):** `MSYS_NO_PATHCONV=1 python -m modal volume put saibatudo-nlu-models <pasta>/<arquivo> /<versão>/<arquivo>` para `model-Q4_K_M.gguf`, `meta.json`, `eval.json` (o `--upload` do script faz o mesmo; **sem** `MSYS_NO_PATHCONV=1` o Git Bash reescreve o destino para `C:/Program Files/Git/...`).
6. **Promover:** `python -m modal run backend/modal/convert_gguf.py::promote --version <versão>` → `MODEL_VERSION=<versão>` na Vercel (invalida o cache) → `gh workflow run eleicoes-data-refresh.yml` → testar ao vivo (`POST /api/nlu`).
7. **Registrar:** copiar o resultado para `eval/AAAA-MM-DD_<versão>.json` no formato de `eval_golden.py --out` (`{passed, reasons, constrained, unconstrained, real}`); o resto vai para `eval/local/`.
8. **Rollback:** `python -m modal run backend/modal/convert_gguf.py::promote --version v2.1-20261003` + `MODEL_VERSION` anterior + deploy.

WSL: se usar, rode `wsl --shutdown` logo depois (pedido do mantenedor, a máquina fica sem memória). O caminho atual **não** precisa de WSL.

### 4.6 Texto gerado (Qwen 7B no Hugging Face)
- Código: `backend/hf_space_qwen7b/` (`app.py`, `requirements.txt`, `README.md`; o `nlu_core.py` é copiado de `backend/modal/`). Publicar mudanças: `huggingface_hub.HfApi().upload_file(..., repo_id="franciscoaleixo/saibatudo-qwen7b", repo_type="space")`.
- O servidor (`api/_lib/ask-handler.js`) chama o Space primeiro (`POST /gradio_api/call/ask`, depois `GET .../<event_id>` em SSE) e cai no Modal só se o Space falhar ou a cota do dia acabar. Orçamentos: `HF_ASK_DAILY_BUDGET` (400/dia) e `MODAL_ASK_DAILY_BUDGET` (15/dia).
- Token do Space: fine-grained `acessosaibatudo` (somente leitura), guardado em `secrets/hf_token.txt` e na Vercel como `HF_TOKEN` (sensível). Trocar: `vercel env rm HF_TOKEN production -y` e `add --sensitive`, depois deploy.
- **Verificador** (`api/_lib/neutralidade.js`): pedido de recomendação nem chega ao modelo; a resposta é descartada se recomendar, trouxer número ou contagem que não está nos dados enviados, contradisser a regra do 2º turno ou **contradisser o que o app apurou**. Descartou → o usuário continua vendo a resposta do app.
- Medido em 07/10: 3,0 s de GPU por resposta em média (≈ 800 respostas/dia dentro dos 40 min); espera do usuário de 1 a 18 s conforme a fila.
- **Desligar:** OPERACAO §3.

### 4.7 Política de privacidade
`docs/PRIVACIDADE.md` e `web/src/privacidade/index.html` precisam dizer o mesmo (testes em `web/test/modules.test.mjs` conferem versão, parágrafo da localização, resumo, tabela e base legal). Para mudar: editar os dois, subir o número no cabeçalho (`**Versão 1.X — data**` no Markdown e `<strong>Versão 1.X — data</strong>` no HTML), rodar `npm test` em `web/`, publicar (§4.1). O que muda para quem usa o app Android só chega no próximo build.
Fatos que a política afirma e que o código precisa continuar respeitando: o app Android **não usa localização**; "Ajudar a melhorar o app" é opt-in e filtra dado pessoal e opinião política; o texto gerado vem rotulado; nada é enviado sem toque ou consentimento.

### 4.8 App Android (Play)
1. Subir `versionCode` (único e crescente, a Play recusa repetido) e `versionName` em `app/build.gradle.kts`.
2. `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew.bat --console=plain testDebugUnitTest lintRelease bundleRelease assembleRelease`.
3. Conferir: `python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk` (5 classes obrigatórias), `jarsigner -verify app/build/outputs/bundle/release/app-release.aab` e o `aapt2 dump badging` (versionCode e versionName).
4. **Testar o release num aparelho** (`adb install -r app/build/outputs/apk/release/app-release.apk`; desinstalar antes se o app da Play estiver instalado). O R8 já quebrou o release sem quebrar nenhum teste; o verificador não substitui isso.
5. Play Console → Testar e lançar → Teste fechado → Criar nova versão → enviar `app/build/outputs/bundle/release/app-release.aab`. Notas da versão em `<pt-BR>...</pt-BR>`, **no máximo 500 caracteres** (modelo pronto em `docs/RELEASE_1.0.3.md`).
6. Revisar *Segurança dos dados* sempre que entrar recurso que envia texto (opt-in, não compartilhado, criptografado em trânsito, sem identificador junto do texto). Os 14 dias de teste contínuo não reiniciam com versão nova.
7. Assinatura: chave de **upload** em `secrets/upload-keystore.p12` + `keystore.properties`; a Play reassina com a chave dela (por isso o APK local não atualiza por cima do instalado pela Play).

### 4.9 Congelamento do 2º turno (24 a 26/10/2026)
Nada que decida o que o eleitor lê muda: modelo, NLU, respostas, API, pipeline, contratos, workflows e app. Dados, documentação, métricas e testes seguem livres. `eleicoes-congelamento.yml` roda em todo push e falha se um arquivo protegido mudar; exceção consciente: `[congelamento-ok]` na mensagem do commit. Checklist da véspera em OPERACAO §6.

### 4.10 Reversões rápidas
| O que | Como |
| :-- | :-- |
| Modelo NLU | `promote --version <anterior>` + `MODEL_VERSION` + deploy (§4.5, passo 8) |
| Texto gerado | remover `ASK_ENABLED` (Vercel e GitHub) + deploy |
| Captura de perguntas | remover `MELHORIA_ENABLED` + deploy |
| Dados ruins | redeploy do commit anterior na Vercel; investigar `DATA_SIGNING_KEY` se a assinatura falhar |
| Release Android | corrigir e subir **novo versionCode**; a Play não volta versão, só pausa a faixa |

## 5. Testes

### 5.1 Comandos e contagens (09/10/2026)
| Camada | Comando | Resultado esperado |
| :-- | :-- | :-- |
| API | `cd api && npm test` | 228 testes |
| Site | `cd web && npm test` | 176 testes (inclui a varredura de todos os candidatos) |
| Retreino (Node) | `node --test "backend/retrain/*.test.mjs"` | 54 testes |
| Pipeline | `python -m unittest discover -s pipeline/tests` | verde |
| Ferramentas | `python -m unittest discover -s tools -p "test_*.py"` | 48 testes |
| Treino | `python -m unittest discover -s ai_model/scripts -p "test_treino*.py"` | verde |
| Modal/gate | `python -m unittest discover -s backend/modal -p "test_*.py"` | verde (1 pulado) |
| Retreino (Python) | `python -m unittest discover -s backend/retrain -p "test_*.py"` | verde |
| Workflows | `python tools/test_workflows.py` | YAML e shell de cada passo válidos |
| Android | `./gradlew.bat testDebugUnitTest lintRelease` | 102 testes unitários, lint limpo. Instrumentados (4) só em aparelho. |

**O Gradle pode dizer "BUILD SUCCESSFUL" com relatório antigo** (tarefa UP-TO-DATE): confira o horário dos XML em `app/build/test-results/testDebugUnitTest/`.

### 5.2 CI
| Workflow | Quando | O que garante |
| :-- | :-- | :-- |
| `eleicoes-web-ci.yml` | push e PR | site, API, pipeline, ferramentas, modelo/gate, retreino, painel de métricas |
| `eleicoes-android-ci.yml` | push e PR | testes unitários, lint, bundle, verificador de release |
| `eleicoes-data-refresh.yml` | a cada 30 min e manual | dados + deploy (integridade bloqueia; comportamento só avisa) |
| `eleicoes-data-freshness.yml` | a cada 30 min | alerta de dados atrasados (issue `alerta-dados`) |
| `eleicoes-nightly-eval.yml` | 03:00 de Brasília | medição do modelo em produção e painel (**hoje pula a medição**, faltam os segredos do Modal) |
| `eleicoes-lacunas-nlu.yml` | manual | perguntas reais que o NLU local não entende |
| `eleicoes-congelamento.yml` | push e PR | guarda do congelamento (§4.9) |

### 5.3 Contratos compartilhados (`contracts/`)
Mesmo arquivo, conferido por Android, site e, quando cabe, servidor. Mudou o comportamento de propósito → mude os três lados e o contrato.
| Arquivo | Conteúdo |
| :-- | :-- |
| `nlu_golden_cases.json` | 111 casos de referência do NLU (e do gate do modelo; **não acrescente casos** sem refazer a linha de base, a catraca compara o mesmo número de casos) |
| `nlu_real_cases.json` | perguntas reais revisadas por uma pessoa, só para medir (hoje vazio) |
| `nlu_nome_cases.json` | 33 casos de candidato por nome ("quem é o candidato a deputado X", nomes com palavras de outras regras) e listagens que não podem virar perfil |
| `answers_parity.json` | 66 textos de resposta idênticos entre Android e site (regerar: `node web/tools/gerar_paridade.mjs`) |
| `opiniao_cases.json` | 47 casos do filtro de opinião política da captura de perguntas |
| `geo_cases.json` | casos da sugestão de UF pela localização (site e o código inerte do Android, `SugestaoUfTest.kt`) |

### 5.4 Medir antes de afirmar
Lição repetida: não dizer "corrigido" sem reproduzir antes e depois. Padrões que funcionaram: (a) **varredura** de todos os 20.290 candidatos por várias formas de perguntar (a falha de "candidato a CARGO + nome" era 100 %); (b) **comparar o NLU antigo com o novo** sobre milhares de perguntas conhecidas e revisar cada diferença; (c) usar a **resposta real do TSE** como amostra de teste (o formato inventado escondeu o erro do 2º turno); (d) testar **ao vivo** depois do deploy (`/api/nlu`, `/api/ask`, `/api/health`).

## 6. Decisões do mantenedor (valem sobre qualquer sugestão em contrário)
| Data | Decisão |
| :-- | :-- |
| 01/10 | Dados **somente oficiais do TSE**; nada fictício. App sem anúncios e sem analytics. |
| 06/10 | **Estado escolhido à mão** na primeira abertura do Android, **sem localização** (evitar restrição na aprovação da Play). O site pode sugerir pelo aparelho. |
| 06/10 | O botão "Perguntar à IA na nuvem" **fica sempre disponível**, mesmo depois de uma resposta local correta (o NLU local às vezes erra). |
| 06/10 | **Treino e conversão de modelo são sempre locais**, para poupar o crédito do Modal. O Modal só serve. |
| 06/10 | Captura de perguntas **ligada**; o mantenedor avaliou que, com o filtro de opinião e o consentimento específico, atende à LGPD. A política mantém o texto "pode revelar opinião política" e a base do art. 11, I. |
| 07/10 | Texto gerado **ligado**, no ZeroGPU do Hugging Face (custo), Modal só de reserva com teto baixo. |
| 07/10 | Segredos vão em arquivo dentro de `secrets/`, não no chat. Depois de usar o WSL, `wsl --shutdown`. |

## 7. Observações e armadilhas (o que já deu errado)

**Dados e resultados**
- **Apuração do TSE:** o JSON ao vivo manda `e:"s"` também para quem **passa ao 2º turno** (`st:"2º turno"`). Ler só o `e` fez o app dizer "não haverá 2º turno, eleito com 47 %" em 06/10. Quem decide é o campo `st`. Há uma função única (`leituraSegundoTurno`) e uma trava: dois marcados e o primeiro abaixo de 50 % nunca é "eleito".
- O CSV `votacao_candidato_munzona` de 2026 **não traz linhas de Presidente** (o `_BR.csv` vem só com o cabeçalho): o pacote assinado não tem resultado de Presidente. A única fonte oficial desse cargo é a apuração ao vivo (`resultados.tse.jus.br`); sem ela o app avisa que não conseguiu consultar. Governadores têm a situação "2º TURNO" no pacote (AC, AM, DF, ES, RJ, RN, TO).
- **Percentual de majoritários no pipeline agrupa por `SG_UE`, não por `SG_UF`** (19/10): o CSV `votacao_candidato_munzona` traz uma linha por município, e para Presidente a UF muda a cada arquivo; agrupar pela UF da última linha lida deixou Lula com 100 % e Flávio Bolsonaro com 99,92 % no pacote publicado. `SG_UE` é "BR" para Presidente e a UF para Governador/Senador. Teste em `pipeline/tests/test_pipeline.py`.
- **`autoatendimento.tse.jus.br` deixou de existir** (NXDOMAIN em 19/10): o Autoatendimento Eleitoral vive em `https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/` (justifica.tse.jus.br redireciona para lá). O link mora em `web/src/eleicoes2026/js/model.js`, `AppConstants.kt`, `pipeline/static/fontes_oficiais.json` e no teste `test_fontes.py`; `www.tse.jus.br` responde 403 a clientes simples, então confira num navegador.
- **Snapshot versionado dos dados não entrava desde 16/10:** o checkout do `data_refresh` é raso e `git log -1 -- manifest.json` devolvia a data do commit mais recente de qualquer coisa (sempre "menos de 24 h"). Desde 19/10 a idade vem do `generatedAt` do manifesto commitado (`git show HEAD:...`).
- Muitos 404 em `resultados.tse.jus.br` bloqueiam o IP por ~10 min: não sondar. Fotos: só `…/fotos/<uf>/<sq>.jpeg` de candidaturas com `temFoto`.

**Vercel**
- **A cota de uploads do plano Hobby (5.000 arquivos por 24 h, janela móvel) é da CONTA e é dividida com o projeto SaibaTudo Química.** Em 10/10 ~21h20 o 1º deploy de química (sem `.vercelignore`) gastou ~4.400; se um `data_refresh` daqui falhar com `api-upload-free`, é isso. O site continua no ar com o último deploy. Medir: `python ../SaibaTudoQuimica/tools/vercel_cota.py`. A CLI só envia arquivos novos (por SHA-1) e **não lê o `.gitignore`**.
- **Recarregar qualquer tela do app dava 404 em produção** (ex.: `/eleicoes2026/configuracoes`) desde o início: com `cleanUrls: true`, o destino do rewrite tem de ser `/eleicoes2026/`, não `/eleicoes2026/index.html`. Corrigido em 10/10 (3d5ffa9), com teste. **Barra final é literal nas regras** (`/quimica` ≠ `/quimica/`): a regra exata `/quimica/` (01fb70e) evita o 404 do cartão da home. O service worker da home (escopo `/`) **não intercepta `/quimica/`** (teste `web/test/sw-portal.test.mjs`). Em 10/10 a conta ativou o **trial do Pro** (cota 40.000 uploads/24 h).

**NLU e modelo**
- **"candidato a CARGO" virava listagem e o nome se perdia** (todos os 20.290 candidatos falhavam). Corrigido em 09/10 no site e no Android; nome completo dentro da frase sai do texto antes das regras (nomes como "Maria Gato" ou "Tulio Fontes" não viram regra da urna ou fontes). Sobram 17 nomes sem solução pelo texto (2 letras, iguais a palavra ou estado, homônimos).
- **"deputado mais votado" sem federal/estadual (12/10):** o NLU não tem cargo para "deputado" sozinho e a resposta de resultados pedia o cargo de novo; a IA da nuvem recebia esse pedido como contexto e dizia "dado não disponível". Agora `resultados()` (site e Android) assume Deputado Federal com aviso e, quando a pergunta tem "mais votado", abre com a linha "Mais votado(a): …". Lição: quando a resposta local é uma pergunta de esclarecimento, a nuvem não tem o que explicar — resolver o esclarecimento localmente sempre que a intenção já é clara.
- **O modelo de nuvem não é "mais preciso" por definição:** o v2.1 devolvia "desconhecida" em um terço das perguntas comuns. Antes de prometer qualquer coisa, meça no gate.
- **Contaminação do gate:** extras derivados das falhas do golden são recusados; o v2.2 reprovou justamente por isso (estado digitado sozinho) e a correção foi cobrir a classe inteira, não os casos.
- O NLU da nuvem recebe **só a pergunta atual**; o contexto de conversa ("e de SP?") é aplicado **no aparelho** depois (`resolverContinuacao`). Nunca enviar perguntas anteriores ao servidor sem mudar a política.
- Número de candidato ("quem é o 13?") **não existe** no contrato v2 do modelo: o proxy tira o número do texto da pergunta (`groundNumero`), nunca da saída do modelo.
- Falha da nuvem tem dois motivos com avisos diferentes: o modelo **não entendeu** × o serviço **indisponível**.

**Texto gerado**
- Visto em teste: o modelo recebeu uma lista cortada em 1.000 caracteres e afirmou "total de 5 candidaturas" (eram 13). Por isso o contexto não corta no meio da linha e avisa quando está incompleto, e o verificador barra contagem sem fonte. **Builds antigos do Android ainda cortam em 1.000**: o servidor cobre.
- Fatos críticos (quem foi eleito, se há 2º turno) **nunca** vêm do texto gerado; o verificador compara com o que o app apurou.

**Ambiente (Windows / Git Bash / ferramenta de shell)**
- `git push` recusado por causa dos commits do robô de dados: `git pull --rebase origin main` e enviar de novo.
- Avisos "LF will be replaced by CRLF" do Git são inofensivos (os scripts de edição preservam o fim de linha de cada arquivo).
- Git Bash reescreve caminhos que começam com `/` em argumentos de programa Windows: `MSYS_NO_PATHCONV=1` (visto no `modal volume put` e no `adb`).
- Heredocs com muitas aspas ou `\n` dentro de Python quebram na ferramenta de shell: grave o script com a ferramenta de escrita e rode o arquivo. `\u0000` vira byte nulo: use `chr()`.
- Smart App Control/WDAC bloqueia binários não assinados (`llama-quantize.exe`): a quantização usa a API do `llama-cpp-python` (a wheel carrega).
- O notebook suspende e congela o treino (§4.5). Treino e conversão disputam GPU/CPU: não rodar medições pesadas durante o treino.
- Gradle: ver §5.1 (relatório antigo).
- **`eval/` é só o histórico do painel** (um arquivo por execução no formato de `eval_golden.py --out`); arquivos em outro formato quebram `tools/test_metricas.py` e o CI (aconteceu em 07/10).
- Linhas "PROBLEMA: classe obrigatória AUSENTE" no log do CI eram saída simulada de um teste do verificador de release (agora capturada); um release real quebrado teria o passo `verificar_release` vermelho.

**Android**
- R8 + WorkManager/Room quebrou o release: regras em `app/src/main/keepRules/rules.keep`. **Sempre** testar o release em aparelho.
- Campos de texto no Compose: nunca alimentar `value` por `StateFlow` ou DataStore (cursor volta em Xiaomi/Gboard); use `mutableStateOf`.
- Xiaomi/HyperOS: `adb shell input` exige "Depuração USB (Configurações de segurança)".
- Toda sugestão exibida precisa ser respondível (`PerguntasReaisTest` percorre as sugestões).

**Operação**
- **Conferir o CI, não só o deploy**, depois de cada push.
- Mudança de variável da Vercel só vale no próximo deploy.
- O pacote assinado manda o que os apps mostram (`cliente.ask.enabled`, `cliente.melhoria.enabled`); mudar uma flag exige publicar dados.

## 8. Custos e limites
| Recurso | Limite | Uso e observação |
| :-- | :-- | :-- |
| Modal | US$ 30/mês grátis (workspace) | 1 a 6/10: US$ 4,50 medidos (NLU US$ 0,49; Qwen 7B na GPU US$ 3,50; conversão US$ 0,38); cobrado US$ 0. `python -m modal billing summary` e `billing report --for "this month" -r d --show-resources --json`. **O teto de gasto só se define no painel.** |
| Modal, NLU (CPU) | ~US$ 0,40/h ligado | ~US$ 3/mês no ritmo atual |
| Modal, Qwen 7B (L4) | ~US$ 0,88/h ligado, cobra o contêiner inteiro (inclui 120 s de espera) | ~US$ 39/mês se usado como em 04–05/10; por isso o principal agora é o Hugging Face e a reserva tem teto de 15/dia |
| Hugging Face (PRO) | 40 min de GPU/dia no ZeroGPU, conta só o tempo de GPU | ~3 s por resposta; passar da cota só cobra se houver **crédito pré-pago** (US$ 1 por 10 min): não deixe saldo |
| Upstash (gratuito) | 500 mil comandos/mês, 256 MB | cada chamada de nuvem usa ~4 comandos (2 contadores de limite × INCR+EXPIRE) |
| Vercel (Hobby) | uso não comercial | firewall: 60 req/min por IP em `/api/*` |

## 9. Pendências abertas
1. **Enviar a 1.0.4 (versionCode 5) ao teste fechado** e testar o release num aparelho antes (`docs/RELEASE_1.0.4.md`; a 1.0.3 já foi enviada e o versionCode não se repete). Manter os 12 testadores por 14 dias.
2. **Definir o teto de gasto no painel do Modal** (US$ 30) e testar.
3. **Segredos `MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET` no GitHub** para a avaliação noturna realmente medir (hoje pula).
4. **Decidir o texto gerado no congelamento** (24 a 26/10): hoje `on`.
5. Backup offline de `secrets/upload-keystore.p12`, `keystore.properties` e `secrets/data_signing_key.pem` (perder a chave de dados exige novo app).
6. **Próximo ciclo do modelo (v2.4):** "quantos votos teve o lula?" volta sem o `nome`; "no rio" não vira RJ na nuvem; "Quantas mulheres são candidatas?" marca tema; acrescentar formulações com essas classes. Fora do congelamento.
7. Texto gerado: avaliar o volume real (a cota de 40 min é da conta inteira) e a revisão jurídica da política 1.4.
8. Código inerte de sugestão de estado por localização no Android (`SugestaoUf.kt`): pode ser removido numa limpeza.
9. **Release Android com os textos do 2º turno** (19/10: local de votação, prazos de justificativa 03/12/2026 e 08/01/2027, link novo do Autoatendimento, regra "não votei no 1º turno"): subir para versionCode 7, testar num aparelho e enviar antes de 24/10, ou deixar para depois do congelamento — decisão do mantenedor. O site recebe tudo no próximo `data_refresh`.
10. **SaibaTudo IA em eleições (`SaibaTudoIA-NLU-Eleicoes`, nlu-v3.4-20261017)** — app e Volume próprios no ar e medidos (96,6 %) em 20/10; faltam
    só as variáveis da Vercel (`MODAL_CANARY_ENDPOINT`, `CANARY_MODEL_VERSION`, `CANARY_PCT=100`, `MODAL_TIMEOUT_MS=30000`) e o `data_refresh`
    (OPERACAO §7). Depois do teste: `MODAL_ENDPOINT` no app novo e `modal app stop saibatudo-nlu`. Explicador: Space `backend/hf_space_explica/`
    + `HF_ASK_SPACE_URL` quando o modelo ajustado passar nos gates.
11. Licença da base Qwen2.5 no model card; relato privado de vulnerabilidades (*Settings › Security*); passada de acessibilidade (TalkBack) e tablets.

## 10. Segredos e backups (nunca no Git)
`secrets/upload-keystore.p12` + `keystore.properties` (chave de **upload** do Play), `secrets/data_signing_key.pem` (assinatura dos **dados**; chave pública em `pipeline/data_signing_public.pem`), `secrets/hf_token.txt` (token do Space), `secrets/upstash.env` (URL e token do Redis). A pasta `secrets/` é ignorada pelo Git. Faça backup offline das chaves de assinatura.

## 11. Histórico recente (05 a 22/10/2026)
- **22/10 (manhã):** mantenedor: "no eleições ainda aparece como IA da nuvem o Qwen; ajustar para usar a IA treinada". (1) **Rótulos** (0d7ef34): site e
  Android deixam de dizer "Qwen" fixo e mostram o `model` devolvido pelo servidor (`rotuloOrigem()` em answers.js + `modelo` na resposta GENERATIVA;
  Android `CloudAskClient.gerar()` + `HybridAiInferenceEngine.fonteGerada()` — entra no release 7). API: padrão do Space HF passa a "SaibaTudo IA".
  (2) **Gate de eleições do ask-v1.3** (explicador compartilhado, aprovado na química a 80 %): 188 pares do holdout em CPU (28 min) + verificador →
  **REPROVADO: 10/188 = 5,3 %** (mínimo 95 %). 174 falhas só por falta do rodapé "pode conter erros" (eleições era 8 % da mistura: 749 de 8.890 pares);
  **sem a regra do rodapé, 158/178 = 88,8 %**, ainda abaixo — e com erros reais: patrimônio R$ 535.811 em vez de 1.235.811, despesas 589.396 em vez de
  689.396, nº 70292 em vez de 70192, "25/10/22", calendário e "não votei no 1º turno" respondidos de memória sem contexto, "foi eleito?" respondido com
  "não foi eleita" quando o app pediu o cargo (`backend/retrain/out-ask/holdout_gate_v13.json`). **`HF_ASK_SPACE_URL` NÃO foi trocado**: eleições segue
  no Qwen 7B. (3) **v1.5** em treino (fila 7, `ia/treino/out/fila-20261022g.sh`): mesma mistura do v1.3 com eleições ×3 (10.388 pares); pós-treino roda
  os dois gates (química e eleições) e não publica. Lição: Space que lê modelo de repositório privado precisa do segredo `HF_TOKEN` (`publicar_explica.py`
  passou a gravá-lo). Pendência apontada: a política de privacidade 1.4 ainda diz "hoje desligada" para a IA generativa, ligada desde 07/10.
- **21/10 (05h):** mantenedor relatou que "quem já ganhou no 1o turno para governador?" não era respondida (local nem nuvem). Dois defeitos,
  reproduzidos no motor do site com o pacote real: (1) **NLU por regras**: `RX_RESULTADOS` exigia "quem ganhou" colado; o "já" fazia a pergunta
  cair em LISTAR_CANDIDATOS (191 candidaturas) — agora `quem (ja|afinal|mesmo)? (ganhou|…)` e `ja (ganhou|venceu|foi eleito|…)`, no site e no Android
  (`LocalNlu.kt`, idênticos). (2) **Resposta de resultados**: Governador/Senador sem UF só pediam o estado; agora `resultadosNacionais()` resume o
  país pelo pacote (CSV oficial do TSE): governadores eleitos no 1º turno por estado (21 estados), estados com 2º turno (A × B) e os sem definição;
  senadores eleitos por estado. Com UF padrão, o resumo nacional só sai quando a pergunta pede o país (plural "governadores", "já ganhou", "todos
  os estados", "quais estados"); "quem foi eleito governador?" com UF padrão continua respondendo o estado. Deputados continuam pedindo a UF. Mesmo
  texto no site (`answers.js`) e no Android (`RespostasResultados.kt`). A nuvem (SaibaTudo IA/Modal) só interpreta; a resposta é montada pelo
  mesmo motor, por isso falhava igual. Testes: web 180, Android (AnswerBuilderTest, NomeCandidatoTest). Modelo da nuvem inalterado.
- **21/10 (06h):** segundo relato: "quem já ganhou no 1o turno para deputado" mostrou "Total de deputados eleitos: 10 / Nenhum candidato
  obteve mais de 50% dos votos válidos, então não houve segundo turno". Esse texto não existe no app: é a **resposta generativa da nuvem**
  (Qwen 7B via `/api/ask`), que recebeu a lista dos 70 eleitos de SP cortada em 1.800 caracteres (`resumoParaContexto`), contou "10" e colou a
  regra do Executivo. O motor local responde certo. Dois buracos do verificador fechados em `api/_lib/neutralidade.js`: (1) `contagensSemFonte`
  não casava "Total de … eleitos: 10" (dois-pontos) nem "10 deputados eleitos"; (2) novo `contradizLegislativo`: consulta só de deputado/senador
  (sem presidente/governador na pergunta ou no contexto) com texto que aplica a regra do Executivo ("50% dos votos válidos", "maioria absoluta")
  é descartada (`motivo: contradicao_legislativo`); datas e "não disputam 2º turno" passam. E o cabeçalho da lista de eleitos pelo pacote agora
  traz o total — "Eleitos para Deputado Federal em São Paulo segundo o TSE (70):" — no site e no Android, para a nuvem receber o número certo
  mesmo com a lista cortada. Testes: API 230 (+1), web 179, Android AnswerBuilderTest/paridade.
- **21/10 (07h):** teste ao vivo depois do deploy (3bd0b63): o Qwen 7B gerou, para a mesma pergunta, "Não há informações sobre vitórias no
  1º turno… foram confirmados para o segundo mandato, mas não houve vitória direta" com a lista dos 70 eleitos no contexto. Regra nova
  `negaDadosDoApp` (`motivo: nega_dados`): contexto com eleitos ("Deputados eleitos (70):", "— ELEITO", "foi eleito") e texto que nega o dado
  ("não há informações/dados/resultado", "não houve vitória/vencedor", "ainda não há resultado") ou inventa "segundo mandato"/"reeleito" sem
  base é descartado. API 231. O texto gerado pelo Qwen 7B sobre listas de resultado continua fraco; a troca pelo explicador SaibaTudo IA (gate
  de fidelidade no holdout de eleições) fica para depois de 27/10.
- **21/10 (08h–09h30): NLU de propostas por tema.** O mantenedor enviou 2.000 perguntas (20 modelos × 100 temas, "onde consultar nos canais
  oficiais as propostas/planos do 1º ou 2º turno sobre {tema}"). Rodadas no motor com o pacote real (UF padrão SP): NENHUMA recebia a resposta de
  plano de governo — "2º turno" na frase virava SEGUNDO_TURNO (882), "portal"/"oficial"/"ferramentas" e o próprio tema viravam nome de candidato
  (326: "FERREIRA DO PORTAL", "REJANE DA EDUCAÇÃO"), "documentos das candidaturas" caía em LOCAL_VOTACAO (200), "debates/diretrizes/plataformas/
  prioridades/metas" não existiam no léxico (260 DESCONHECIDA + 128 listagens), e só 15 dos 100 temas eram reconhecidos. Correções, idênticas em
  `nlu.js` e `LocalNlu.kt`: (1) `sobrePropostas` = pergunta de plano/fontes sem contexto de votação → não aplica documentos-para-votar, urna,
  local nem regra do 2º turno; "pesquisa científica" não é pesquisa eleitoral; "patrimônio histórico/cultural" não é patrimônio declarado;
  (2) `RX_PLANO` ganhou plataformas eleitorais, diretrizes, prioridades, metas, compromissos, programas registrados e "documentos/propostas das
  candidaturas"; FONTES só quando a frase não pede plano; (3) `STOP_EXTRA` com ~90 palavras de "onde consultar…" e de temas; em pergunta de plano
  com tema o tema nunca vira nome (`resolverNome(semTemas)`); (4) ~180 temas finos → macrotemas do pacote (alfabetização → educação, hospitais →
  saúde, ferrovias → transporte, energias renováveis → energia…; 97 dos 100 temas do CSV); (5) resposta nova de PLANO_GOVERNO com tema
  (`answers.js`/`RespostasRegistro.kt`, texto idêntico): "Propostas sobre Educação nos planos de governo registrados no TSE: • 194 candidaturas a
  Presidente e a Governador citam o tema (detecção por palavras-chave; o app não resume nem compara) • Presidência: … • Governador em SP: … •
  DivulgaCandContas…", filtro por tema e cartões. Listagem explícita ("candidatos a X que citam saúde") continua LISTAR_CANDIDATOS; golden
  intocado (o "SUS" ficou fora dos sinônimos porque "Como melhorar o SUS?" é DESCONHECIDA no golden). Resultado nas 2.000: PLANO_GOVERNO 1.309,
  SOBRE_DADOS 200, FONTES 200, LISTAR 291 (frases com "candidaturas" + tema), 0 nomes falsos, 1.940 com tema. Contrato novo
  `contracts/propostas_cases.json` (modelos + temas + macrotema esperado; mínimos 99 % intenção / 98 % tema) conferido por
  `web/test/propostas-cases.test.mjs` e `PropostasCasesTest.kt`; fora do gate do modelo da nuvem. Testes: web 181, Android (golden, reais, propostas,
  AnswerBuilder, nomes, paridade).
- **20/10 (madrugada):** (1) **tempos da nuvem maiores** (pedido do mantenedor: "o tempo inicial tem que ser maior; depois da primeira a segunda
  funciona"): a partida a frio do Modal mediu 16,7 s ao vivo na química; `MODAL_TIMEOUT_MS` padrão 20000 e teto 45000 (`config.js`), `api/nlu.js`
  `maxDuration: 50`, site 20 s automático / 45 s explícito (`cloud.js`); Vercel `MODAL_TIMEOUT_MS=30000` fica para o mantenedor (bloqueio do
  classificador). (2) **SaibaTudo IA como canário:** `nlu_app.py` aceita `prompt_suffix`/`base_model` do ponteiro (Qwen3.5), `nlu_core.THINK_VAZIO`
  + teste; GGUF `nlu-v3.4-20261017` copiado para o Volume de eleições; comandos finais em `OPERACAO.md` §7. Testes: API 228, web 178, Modal 84.
  Android de eleições não será publicado por enquanto (decisão do mantenedor).
- **20/10 (01h–02h):** mantenedor mandou "iniciar já" o renome e "seguir e finalizar" o explicador. (1) **`SaibaTudoIA-NLU-Eleicoes` no ar**
  com Volume `SaibaTudoIA-Models-Eleicoes` (v3.4, `format: v2`, `prompt_suffix`); gate ao vivo 96,6 % de intenção (116), entidades 100 %, 2,6 s;
  reprova só pela alucinação de `cargo` 1/3 (`eval/local/…endpoint.json`). Falta a Vercel (OPERACAO §7). (2) **Explicador SaibaTudo IA v1 em
  treino** (QLoRA Qwen3-4B-Instruct-2507, 1 época, 281 passos a ~48 s, RTX 5060 8 GB): dataset de eleições novo — `backend/retrain/dump_respostas_ask.mjs`
  (837 perguntas respondidas pelo motor do site com o contexto exatamente como o site envia ao `/api/ask`) + `build_ask_dataset.py` (749 treino /
  188 holdout: reescrita neutra determinística do que o app mostra, recusas com o texto do app, "dado não disponível"; nenhum número fora do
  contexto) — misturado com o da química (`ia/treino/misturar_explica.py`: 4.724 pares, segurança GHS com teto 2.000). (3) Space
  `backend/hf_space_explica/` pronto para substituir o Qwen 7B (mesma API; só `HF_ASK_SPACE_URL` muda), com `ASK_MODEL_ID` apontando ao
  explicador ajustado quando passar nos gates (fidelidade e segurança da química; neutralidade de eleições pelo verificador).
- **20/10 (03h):** gate do explicador sobre o holdout de eleições preparado e um **falso positivo do verificador** corrigido. Ao conferir
  as 188 respostas esperadas do holdout com o próprio `verificarRespostaAsk` do servidor, 14 eram descartadas como "recomendação": textos
  institucionais do app que a IA ecoa ("cada eleitor vota em DOIS senadores", "voto em branco", "posso votar no 2º?") e a recusa neutra do app
  ("Não indico, recomendo, comparo nem prevejo candidatos") — em produção, isso derrubava o texto gerado de "Como votar?", "Quantos votos para
  senador?" e similares (fail-safe: o usuário via a resposta local). `respostaRecomenda` agora tira o objeto GENÉRICO depois de "vote em/no/na"
  (branco, nulo, dois, quem, turno, 1/2…; o verbo fica, então "você deve votar" continua barrado) e a recusa neutra; "vote no 13", "vote em
  FULANO", "vote nele" seguem barrados (+1 teste; API 229). Holdout: 188/188 das saídas do dataset passam; 0 das 749 do treino são barradas.
  Ferramentas: `backend/retrain/avaliar_explica_holdout.py` (GGUF + prompt do treino, 400 tokens como o Space) e
  `backend/retrain/verificar_holdout_explica.mjs` (verificador do servidor + recusa sem número + "dado não disponível" + rodapé; mínimo 95 %).
  Publicação do explicador em um comando: `ia/treino/publicar_explica.py` (precisa de token HF com escrita em `secrets/hf_token_write.txt`:
  o `hf_token.txt` daqui é só leitura).
- **19/10 (noite):** revisão para o 2º turno. (1) Link do Autoatendimento trocado (`autoatendimento.tse.jus.br` não resolve mais) no site, no Android e no diretório de fontes. (2) Resposta de local de votação ganhou o 2º turno: mesmo local do 1º turno em regra, TREs mudaram locais pontualmente (conferir no e-Título, "Onde votar"), cada turno é independente, justificativa até 03/12/2026 (1º) e 08/01/2027 (2º) — fonte: Manual do Eleitor 2026 do TSE; mesmos prazos na resposta de obrigatoriedade do voto. (3) NLU por regras (site e Android, idênticas): "não votei no primeiro turno, posso votar no segundo?" e variantes (faltei, perdi o 1º turno, ausência) → LOCAL_VOTACAO; 2 casos novos no golden (116). (4) Pipeline: percentual de Presidente agrupado por `SG_UE` (teste de regressão). (5) Resposta de resultado pelo pacote lista quem disputa o 2º turno (antes só os "NÃO ELEITO"). (6) Workflow: idade do snapshot pelo `generatedAt` do manifesto commitado. Testes: web 178, API 228, retrain 54, pipeline 31, workflows 6, Android 103 + lint. **Modelo v2.3 inalterado**; texto gerado continua Qwen2.5-7B (o rótulo é verdadeiro; explicador próprio só depois de 27/10).
- **05/10:** `data_refresh` falhou 18 vezes (testes web assumiam "ninguém eleito"); resultados do 1º turno só chegaram à produção às 02:26 UTC de 06/10. Os testes de comportamento deixaram de bloquear a publicação de dados.
- **06/10:** plano em 6 fases executado (gate endurecido, holdout, captura de perguntas com revisão humana, canário, paridade Android×site, testes de workflows). IA generativa e captura entregues desligadas. Filtro de opinião política nas 3 camadas. Política 1.3. Upstash criado e captura ligada. Botão da nuvem restaurado depois de resposta correta. Nuvem passou a seguir a conversa. Correção do 2º turno (`e:"s"` × `st`). Mensagem de falha da nuvem separada em dois motivos. Avaliação noturna e painel.
- **07/10:** modelos **v2.2** (reprovou no gate: estado e tema) e **v2.3** (aprovado e promovido; treino e conversão locais). Número de candidato na nuvem. "No Rio" = RJ. Texto gerado no ZeroGPU do Hugging Face com Modal de reserva, verificador reforçado, política 1.4, recurso **ligado**. CI vermelho por 6 execuções (`eval/` em formato errado), corrigido; saída simulada do verificador silenciada.
- **08 a 09/10:** release **1.0.3 (versionCode 4)** montado e verificado; notas e passo a passo em `docs/RELEASE_1.0.3.md`. **Correção do NLU para "quem é o candidato a deputado X"** e nomes com palavras de outras regras (de 100 % de falha para 0,08 % entre os candidatos; contrato `nlu_nome_cases.json`). Este arquivo reescrito e `CLAUDE.md` criado.
- **09/10 (noite):** a 1.0.3 foi enviada à Play pelo mantenedor; como a correção dos nomes entrou depois, foi gerada a **1.0.4 (versionCode 5)** (`docs/RELEASE_1.0.4.md`). Regra aprendida: **não reutilizar versionCode**; quando o mantenedor já tiver enviado, subir o número.

---

# Registro anterior (01 a 05/10/2026)

> Mantido como história. Itens marcados **(superado)** já não valem; o que vale está acima.

## Estado em 06/10/2026 (após o 1º turno) — **(superado em parte: ver §1, §4 e §11 acima)**
Ver [`OPERACAO.md`](OPERACAO.md) (documento de estado atual). Resumo do que mudou desde 03/10:
- **Incidente 05/10 16:49 UTC a 06/10 02:23 UTC:** `data_refresh` falhou 18 vezes seguidas porque dois testes web assumiam "ninguém eleito"; os resultados do 1º turno só chegaram à produção às 02:26 UTC. Correção: testes seguem `manifest.resultadosDisponiveis`; o workflow separa integridade (bloqueante) de comportamento (informativo); alerta `eleicoes-data-freshness.yml`.
- **`/api/ask` (Qwen 7B, texto gerado) desligado por padrão**: exige `ASK_ENABLED=1` + `MODAL_ASK_ENDPOINT` explícito; o manifesto assinado traz `cliente.ask.enabled=false` e os clientes escondem o botão. Respostas passam por `api/_lib/neutralidade.js` (recomendação, contradição do 2º turno, números sem fonte); texto rotulado "pode conter erros".
- **Gate do modelo endurecido**: todos os limiares bloqueiam. Medido sobre os 111 casos do contrato, o `v2.1-20261003` em produção tem **intenção 78,4 %** (os 87,1 % eram sobre 93 casos) e seria reprovado; as falhas estão em REGRAS_URNA/LOCAL_VOTACAO, que o NLU local resolve. Retreino v2.2 pendente (fora do congelamento).
- **Holdout**: `contracts/nlu_real_cases.json` (vazio, só perguntas reais revisadas) + balde estável sha256 % 100 (20 %) idêntico em Python e JS; extras `origem=falhas_golden` são recusados.
- **Operação**: build atômico do pacote, cron a cada 30 min, snapshot versionado diário, contadores globais opcionais (Upstash), guarda de congelamento de 24 a 26/10.
- **Lições**: (1) teste de hipótese de fase não pode bloquear publicação de dados; (2) `\u0000` em heredoc/Python pela ferramenta de shell vira byte nulo: escreva blocos com Write e use `chr()`; (3) o gate documentado não era o gate implementado.

## Estado em 01/10/2026 — **(superado)**
- **Dados:** pipeline reprodutível (`pipeline/`), snapshot oficial `data/eleicoes2026` (extração TSE 01/10/2026 12:31): 20.988 candidaturas (19.919 na urna), 3.457 pesquisas, bens, prestação de contas (19.166), planos (219 com PDF), fotos de majoritários; manifesto assinado ECDSA.
- **App Android:** reescrito (MVVM, DataStore, WorkManager), release R8 de ~8 MB assinado com chave de upload; 39 testes unitários + 4 instrumentados passam; lint limpo.
- **IA:** local-first (NLU por regras + respostas dos dados); nuvem opcional (opt-in) via `/api/nlu` → Modal (CPU, llama.cpp) — **código pronto, não implantado** (precisa de contas/credenciais).
- **Site/PWA e API:** construídos em `web/`, `api/`, `backend/` (ver relatórios abaixo); **não implantados** (precisa da Vercel/Modal do usuário).
- **Play Store:** materiais prontos (`store/play`, `docs/PLAY_STORE.md`); envio é manual.

## Publicação (02/10/2026, madrugada)
- **Vercel:** projeto `saibatudo` (time `franciscoaleixo-9696`), produção em <https://saibatudo.vercel.app>; domínios
  `saibatudo.net` e `www.saibatudo.net` adicionados — falta o DNS no GoDaddy (`A @` e `A www` → `76.76.21.21`; NS atuais
  `domaincontrol.com`). Firewall: regra "Limite da API" 60 req/min por IP em `/api/*`. `.vercelignore` precisa manter
  `web/tools/minify.mjs` e `brand/fonts/` (usados pelo build).
- **GitHub (segredos):** `DATA_SIGNING_KEY`, `UPLOAD_KEYSTORE_B64`, `UPLOAD_KEYSTORE_PASSWORD`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID` configurados; **`VERCEL_TOKEN` falta** (a API da Vercel não deixa a credencial da CLI criar token: gerar em
  vercel.com/account/tokens). Sem ele, `data_refresh` gera e assina mas não publica (aviso no resumo). Rótulo `relato-ia` criado.
- **Modal:** imagem compila `llama-cpp-python` do código-fonte (a wheel "cpu" do índice é musl e não carrega no Debian).
  Teto de gasto do workspace só pelo painel (Settings → Usage & Billing).
- **Relatos (`/api/report`):** desligados até criar um token *fine-grained* do GitHub só com `Issues: write` (`GITHUB_TOKEN` na Vercel).

## Decisões-chave (e por quê)
1. **Ficha Limpa só derivada da situação oficial.** O cálculo antigo marcava renunciados/falecidos/pendentes como "inelegíveis" e chamava "processos administrativos" a contagem de motivos de indeferimento. Agora: situação oficial do julgamento + motivos; campo `naUrna` distingue 1.069 registros fora da urna (ex.: Pablo Marçal, indeferido). Após o teste no celular (01/10), o usuário pediu a Ficha Limpa visível: ela é **derivada e rotulada** (deferido = sem impedimento; indeferido com motivo "Inelegibilidade infraconstitucional (LC 64/90)" = inelegível), regra em `DATA_CONTRACT.md` §3.1.
2. **Reeleição:** `ST_REELEICAO` vem `#NE` em 2026; usamos "já eleito para este cargo (histórico TSE)" rotulado como derivado.
3. **IA interpreta, dados respondem; sem recomendação.** Res. TSE 23.755/2026 proíbe IAs de ranquear/recomendar candidaturas. Listas em ordem fixa; recusa de "em quem votar".
4. **Local-first + nuvem opt-in.** Reduz custo (Modal CPU, créditos gratuitos), risco de abuso e superfície de privacidade. Sem chave de IA no APK.
5. **Sem anúncios, sem analytics; localização só no aparelho.** A pedido do usuário (01/10), a UF vem **sugerida pela localização aproximada** (permissão COARSE, malha do IBGE embutida em `data/geo/ufs.json`, ponto-no-polígono no aparelho; casos em `contracts/geo_cases.json`); nada é enviado, só a sigla escolhida é guardada; Vercel Hobby é não comercial; Google Ads veta conteúdo de candidatos. **(superado em 06/10: no Android a UF é escolhida à mão e o app não usa localização; só o site sugere pelo aparelho.)**
6. **Dados assinados e atualizáveis sem nova versão do app** (ECDSA P-256; chave privada só no CI/local; **perder a chave = novo app**). `.gitattributes` impede conversão de EOL no pacote.
7. **Resultados:** apuração ao vivo direto do TSE (`-u.json`, CORS aberto; ≤100 req/IP/s; cache 60 s; **muitos 404 bloqueiam o IP ~10 min — não sondar agressivamente**); CSV oficiais (`votacao_candidato_munzona`) aparecem como arquivo de 1 byte até a apuração e são tratados como "ainda não publicado". `DS_SIT_TOT_TURNO` vem em maiúsculas após a eleição.
8. **PWA como canal principal em outubro:** a Play não publica antes do 1º turno (e, com conta pessoal nova, nem antes do 2º).
9. **Modal em CPU (GGUF Q4) atrás de proxy Vercel**; GPU e Inference Endpoints do HF descartados por custo; HF Pro deixa de ser necessário para este fluxo. **(em parte superado: o NLU segue em CPU no Modal, mas o texto gerado usa GPU, no ZeroGPU do Hugging Face com reserva no Modal L4; ver §4.6.)**

## Armadilhas conhecidas
- **R8 + WorkManager/Room:** o release quebrava (`WorkDatabase` removido) — regras em `app/src/main/keepRules/rules.keep`. **Sempre teste o release em dispositivo.**
- **Git Bash no Windows converte `/sdcard/...` em caminho do Git** (`MSYS_NO_PATHCONV=1`); a cwd dentro de pastas a renomear trava `git mv`.
- **WDAC** bloqueia `_lzma.pyd`/extensões C no Python do projeto: pipeline usa só Python puro (`pypdf`, `ecdsa`); `ai_model/.venv/.../sitecustomize.py` contorna `lzma` no treino.
- **Akamai/WAF** bloqueia `divulgacandcontas`, `www.tse.jus.br` e TREs para clientes simples; a CDN `cdn.tse.jus.br` e `resultados.tse.jus.br` respondem normalmente (User-Agent de navegador).
- Fotos: o CDN de resultados serve `…/fotos/<uf>/<sq>.jpeg` para todas as candidaturas **com foto** (`temFoto`); pedir fotos inexistentes gera 404 em massa.
- Emulador: não é possível alterar a data do sistema (para testar fases use testes de unidade/instrumentados com `hoje` injetado).
- **Campos de texto no Compose:** nunca alimentar `value` de um `TextField` por `StateFlow` coletado ou DataStore (atualização assíncrona) — em teclados reais (Xiaomi/Gboard) o cursor volta e as letras saem fora de ordem. Use `mutableStateOf` (síncrono).
- **Xiaomi/HyperOS:** `adb shell input` exige "Depuração USB (Configurações de segurança)"; sem isso só dá para instalar e capturar tela.
- **Toda sugestão exibida precisa ser respondível:** `PerguntasReaisTest` percorre as sugestões (2 níveis) e falha se alguma cair em "não entendi".

## Segredos e backups (nunca no Git)
`secrets/upload-keystore.p12` + `keystore.properties` (chave de **upload** do Play), `secrets/data_signing_key.pem` (assinatura dos **dados**; chave pública em `pipeline/data_signing_public.pem`). Faça backup offline.
Segredos de CI/Vercel/Modal listados em [`PLANO_PRODUCAO.md`](PLANO_PRODUCAO.md) §5 e [`BACKEND.md`](BACKEND.md).

## Histórico resumido
- 30/09/2026 — primeira versão com dados do TSE (30/09), modelo Qwen2.5-1.5B publicado no HF.
- 01/10/2026 — **auditoria e produção**: pipeline v2, correções de semântica, novo app (pacote `net.saibatudo.eleicoes2026`), atualização assinada, resultados ao vivo, prestação de contas, identidade visual, CI, site/PWA, backend de IA, documentação e materiais da Play. Commits `c660903` → `e89a8d6` (e seguintes).
- 01/10/2026 (noite) — **correções do teste no celular**: cursor/travamento nos campos de texto, perguntas não entendidas (número de urna, vice, plano de governo, contas, voto branco/nulo, saudações, simulador pelas sugestões), Ficha Limpa derivada e visível, respostas em linhas/tópicos. Contrato de NLU v2 (74 casos).
- 02/10/2026 — **NLU: fim dos perfis falsos** (nomes de urna que são palavras comuns: TRANSPORTE, SAUDE, FAVORITO, CONTRA, SOCIAL…): `resolverNome` em 3 modos (indício de pessoa / só o nome / sem indício exige 2+ palavras e remove temas), `RX_CUE_FALSO`, `RECOMENDACAO` ampliada (favorito, chances, próximo presidente, virada, rejeição — Res. 23.755/2026) e cobertura nova (urna segura, voto impresso, cabine/celular, mesário, voto em trânsito, biometria, quem fiscaliza, fake news/denúncia). Contrato 74 → **93 casos**. **Pipeline de perguntas externas**: `backend/retrain/label_extra.mjs` (o rótulo sai do NLU dos clientes sobre o pacote oficial e só vale se for ponto fixo do normalizador), `colher_relatos.mjs` (relatos públicos, exige `--confirmar-finalidade` por LGPD) e `--extra/--extra-max-pct` no gerador com proveniência/licença. **Fontes oficiais**: 3 links mortos trocados (Senado, MPF, AGU), 12 anomalias de URL sanadas (`?session=`, `http://`, `/.`, `copy_of_`), `sistemasNacionais` 3 → 6 e `pipeline/tests/test_fontes.py` (12 testes; antes não havia nenhum). Commits `415d7ee`, `0f7f8da`, `fe270b3`.
- 14/10/2026 — **Serviço do NLU** (modelo v2.3 inalterado): normalização tipográfica da entrada antes do modelo (igual à química), snapshot de
  memória ligado e `scaledown_window` de 5 min (decisão do mantenedor). Gate local sobre o GGUF v2.3 idêntico (intenção 93,9 %, entidades 100 %,
  114 casos; registros em `eval/local/2026-10-14_v2.3_normalizacao_*.json`); frio ao vivo ainda 19–21 s nas duas primeiras chamadas (que criaram o snapshot; execução 1,5–2,9 s), quente 1,7–2,7 s — medir de novo quando
  o Modal passar a só restaurar (na química ficou em ~9 s). Gramática por intenção e
  demais itens do ciclo SaibaTudo.IA ficam para depois de 27/10 (`docs/PLANO_IA_SAIBATUDO.md`).
- 03/10/2026 — **NLU v2.1 no ar**: dataset com 20.618 exemplos (554 externos: 441 da lista do mantenedor + 173 formas fracas derivadas das falhas do gate), treino local na RTX (3 épocas, 3.663 passos, perda 2,3383 → 0,1321), quantização **local no WSL2** (Q4_K_M 940 MB + Q5_K_M + Q8_0, llama.cpp b11355), gate local com `llama-cpp-python 0.3.19`: JSON nativo **100 %**, intenção **87,1 %** (90,0 % excluindo os 3 casos que o contrato v2 não expressa), entidades 100/93,3/100, alucinação **0 %**, **0,77 s** média. Promovido no Modal (`current=v2.1-20261003`, `format=v2`) subindo o GGUF direto para o Volume com `modal volume put` + `convert_gguf.py::promote` — sem depender do upload HF. `MODEL_VERSION` atualizado na Vercel, deploy via `data_refresh` forçado e produção validada (1-2 s quente, cold start 14 s sem 504, `RECOMENDACAO` funcionando). Snapshot `data/eleicoes2026` sincronizado com o pacote assinado de produção (789 arquivos, ECDSA + sha256 verificados localmente). Commits `1121726`, `0076402`.

### Lições operacionais de 02–03/10/2026
- **Memória mata o treino:** `.wslconfig` com `memory=20GB` + pagefile fixo de 28 GB em máquina de 31,5 GB → evento Windows 2004 ("memória virtual insuficiente": vmmemWSL 21 GB, python 7,8 GB, kilo 3,1 GB), `WinError 1455` e `LiveKernelEvent 141/193`. Regra: **não treinar com o WSL ligado**; `dataloader_num_workers=0` no Windows (o spawn recarrega o torch e estoura a paginação).
- **Smart App Control/WDAC bloqueia binários não assinados** (evento CodeIntegrity 3077 no `llama-quantize-impl.dll`): no Windows só roda o que é assinado — `llama-cpp-python` (wheel) carrega, os `.exe` do llama.cpp não. Saída: quantizar no **WSL2** (e `wsl --shutdown` ao terminar) ou no job do Modal.
- **Gradle mente com "BUILD SUCCESSFUL":** testes que leem arquivos fora do módulo (`contracts/`, `data/`) precisam de `inputs.files(...)` declarado, senão a tarefa fica UP-TO-DATE e o relatório é antigo. Confira sempre o **timestamp do XML** em `app/build/test-results/`.
- **O gate de código é mais fraco que a documentação:** `check_gates` só bloqueia JSON válido (≥98 % nativo, 100 % com gramática), `--min-entity-acc` (default 0) e queda Q4×Q8 ≤3 pp. Intenção/entidades/alucinação são **reportados, não bloqueantes** — pendência: endurecer `check_gates`.
- **Publicação de modelo:** nunca sobrescrever sem fixar a revisão anterior (`13851ea0d02628546da18121f03831a92d2a38f4` = v1-legado, recuperável por `--revision`), e o rollback é `convert_gguf.py::promote --version v1-legado` (o Volume guarda versões imutáveis; o serviço não baixa do HF em runtime).
