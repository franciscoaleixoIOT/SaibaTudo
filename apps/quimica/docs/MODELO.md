# Modelos de IA — ciclo local completo, cadência, custos e reversão

Dois modelos, treinados **nesta máquina** (RTX 5060, 8 GB). O Hugging Face é a publicação principal e o Modal, a reserva e o serviço do NLU. Tudo aqui foi escrito com base no
ciclo já validado do app de eleições (`../SaibaTudoEleicao2026/docs/PROJECT_MEMORY.md` §4.5) e **ainda não foi executado**: o código e os testes existem (fase 5 "base"), o treino
e o deploy são a fase 5 de verdade (§11).

| | NLU (interpretação) | Explicador (`ask`) |
| :-- | :-- | :-- |
| Papel | pergunta -> JSON `{intent, elemento, composto, propriedade, quantidades, equacao, nivel, unidadeDestino}` | explica um conceito a partir de **trechos licenciados** + dados que o app já mostrou |
| Base | **`Qwen/Qwen3.5-2B`** (SaibaTudo-NLU único de todos os apps, treinado em `ia/treino/` — §13; o `Qwen2.5-1.5B` do plano original nunca foi publicado) | `Qwen/Qwen3-4B-Instruct-2507` |
| Treino | QLoRA 4-bit, `max_length 256`, 3 épocas | QLoRA 4-bit, `max_length 1024`, lote 1 × acúmulo 16, 2 épocas |
| Versão | `nlu-v3.1-AAAAMMDD` (imutável; minor = continuação de treino) | `ask-v1-AAAAMMDD` (imutável) |
| Serve em | Modal, CPU, GGUF Q4_K_M + gramática GBNF (`backend/modal/nlu_app.py`) | **Space ZeroGPU do HF** (`backend/hf_space_quimica`); reserva Modal L4 (`ask_app.py`) |
| Repositório HF (a criar) | `franciscoaleixo/SaibaTudoIA-NLU` (o NLU é um só para todos os apps) | `franciscoaleixo/SaibaTudoIA-Explica-Quimica` |
| Modal | app `SaibaTudoIA-NLU-Quimica`, Volume `SaibaTudoIA-Models-Quimica` (ponteiro `current.json`) | reserva: app `SaibaTudoIA-Explica-Quimica` (não implantado), mesmo Volume (ponteiro `ask-current.json`) |
| Gates (bloqueiam) | `eval_golden.py` (via `ia/treino/avaliar_gguf.py --app quimica`, golden e holdout, **por idioma**): JSON ≥ 98 %, intenção ≥ 85 %, cada entidade ≥ 90 %, alucinação ≤ 5 %, holdout, catraca ≤ 1 ponto, Q4×Q8 ≤ 3 pontos | `eval_seguranca.py`: 0 % de resposta útil a pedido perigoso e ≥ 95 % de resposta aos legítimos · `eval_fidelidade.py`: ≥ 98 % das explicações sem número fora dos trechos |

Regras que não mudam: o modelo **não fornece fatos** (números vêm do pacote assinado ou de cálculo local); os casos de `contracts/` **nunca treinam**; pedido perigoso é recusado
**por regra antes do modelo** (`api/_lib/seguranca.js`) e o texto gerado passa pelo verificador do servidor (`api/_lib/fidelidade.js`); dataset gerado da *fixture* não treina.

## 1. Preparação (uma vez)
- **Python do treino.** Reaproveite o ambiente do app de eleições (`..\SaibaTudoEleicao2026\ai_model\.venv\Scripts\python.exe`), que já tem torch (CUDA 12.8, Blackwell), transformers, peft,
  bitsandbytes e `llama-cpp-python==0.3.19` (a versão do gate = a do serviço). Ou crie um: `python -m venv ai_model/.venv` e instale `torch` do índice `cu128`, `ai_model/requirements.txt` e `llama-cpp-python==0.3.19`.
- **Contas e ferramentas:** `hf auth login` (token de escrita só nesta máquina), `python -m modal setup`, `vercel login`, `gh auth login`. Segredos ficam em `secrets/` (ignorado pelo Git); quando
  precisar passar um valor ao assistente, cole-o em um arquivo de `secrets/`, nunca no chat.
- **Repositórios no Hugging Face** (uma vez): `hf repos create franciscoaleixo/SaibaTudoIA-NLU` e `.../SaibaTudoIA-Explica-Quimica`; o Space: `hf repos create franciscoaleixo/SaibaTudoIA-Explica-Quimica --type space --space-sdk gradio --private` (padrão de nomes `SaibaTudoIA-<Papel>-<App>`, decidido em 14/10/2026 — `docs/PLANO_IA_SAIBATUDO.md` §6).
- **Armadilhas desta máquina:** `MSYS_NO_PATHCONV=1` para argumentos que começam com `/` (destinos do `modal volume put`); **impedir a suspensão do Windows** durante o treino
  (`SetThreadExecutionState` em um PowerShell que viva enquanto o treino viver); scripts longos: gravar em arquivo e executar; se usar o WSL, `wsl --shutdown` logo depois.

## 2. Dados e dataset
1. Pacote de dados real: `python pipeline/build.py ...` (ver `docs/ARCHITECTURE.md`). **Sem `data/quimica/` real não há treino:** o gerador do dataset cai na fixture de teste e marca `fonteDados: "fixture"`.
2. `python dataset/gerar_nlu.py` e `python dataset/gerar_qa.py`; conferir `dataset/AMOSTRA.md` e `python -m unittest discover -s dataset -p "test_*.py"` (fidelidade numérica 100 %).
3. Montar os conjuntos de treino (ignorados pelo Git, `backend/retrain/out*/`):
   ```bash
   python backend/retrain/build_nlu_dataset.py --out backend/retrain/out-nlu
   python backend/retrain/build_ask_dataset.py --out backend/retrain/out-ask
   ```
   Os dois **recusam** dataset da fixture (`--permitir-fixture` só para testar o fluxo), **tiram do treino** toda pergunta igual ou quase igual (Jaccard ≥ 0,8) às de `contracts/`
   (`nlu_golden_cases`, `nlu_real_cases`, `seguranca_cases`), separam o **holdout** (NLU: respeita o `val.jsonl` do gerador, que separa por entidade; explicador: 20 % por hash do id) e gravam
   `stats.json`, `meta.json` (hash dos insumos) e `descartados.jsonl` (revisar: número sem fonte, recusa sem frase de recusa, conceito sem trecho). No explicador, a resposta de cada exemplo ganha `[id]` do trecho citado.
4. Regra de ouro dos extras (do ciclo de eleições): o rótulo vem do NLU determinístico dos clientes, **nunca** da fonte da pergunta; extras `origem=falhas_golden` são recusados (ensinar a prova contamina a nota);
   cubra **classes inteiras** (todos os elementos, todas as propriedades), não os casos do teste.

## 3. Treino (local)
Antes: se já existe `ai_model/output/SaibaTudo-Quimica-NLU-hybrid/final`, renomeie a pasta (o script não sobrescreve sem `--sobrescrever`). Com o Python do treino:
```bash
python ai_model/scripts/train_hybrid.py --target nlu --version nlu-v1-AAAAMMDD > ai_model/output/treino_nlu-v1.log
python ai_model/scripts/train_hybrid.py --target ask --version ask-v1-AAAAMMDD > ai_model/output/treino_ask-v1.log
```
A perda é calculada só na saída (prompt mascarado com -100); `train_meta.json` grava dataset (sha256), base, hiperparâmetros, semente (2026), commit, versões e perda final. Tempo: o NLU de eleições levou ~3 h 30
(20 mil exemplos, `max_length 256`); o explicador (4B, 1024 tokens) será bem mais lento — **medir no primeiro treino e anotar aqui**. Se faltar VRAM: `--max_length 768`, `--cpu_offload on`.

## 4. Fusão
```bash
python ai_model/scripts/merge_and_export.py --target nlu     # -> ai_model/output/SaibaTudo-Quimica-NLU-merged
python ai_model/scripts/merge_and_export.py --target ask     # -> ai_model/output/SaibaTudo-Quimica-Ask-merged
```
Copia `train_meta.json` e o cartão do modelo (`ai_model/MODEL_CARD_*.md` vira o `README.md`) para a pasta mesclada. As pastas mescladas são imutáveis: renomeie antes de refazer.

## 5. Conversão e gates (local; só o aprovado sobe)
```bash
# NLU: gate do golden, catraca contra a versão em produção (eval/<ultima>.json) e holdout do gerador
python backend/modal/convert_local.py --target nlu --model-dir ai_model/output/SaibaTudo-Quimica-NLU-merged --version nlu-v1-AAAAMMDD --threads 8 \
    --holdout-cases backend/retrain/out-nlu/holdout_cases.json --previous-eval eval/<ultima>.json --previous-version <ultima> --origem "<dataset, épocas, perda>"
# Explicador: segurança + fidelidade (--gpu-layers 99 se o llama-cpp-python tiver CUDA; em CPU a amostra de 200 respostas leva horas)
python backend/modal/convert_local.py --target ask --model-dir ai_model/output/SaibaTudo-Quimica-Ask-merged --version ask-v1-AAAAMMDD --gpu-layers 99
```
O que faz: `convert_hf_to_gguf.py` do llama.cpp na tag fixa `b11355` (clonado em `ai_model/output/.llama_cpp/`), quantiza **Q4_K_M** (produção) e **Q8_0** (referência da queda de quantização), roda os gates e grava
`ai_model/output/gguf/<versão>/{model-*.gguf, meta.json, eval.json}`; sai com código ≠ 0 se reprovar. **Reprovou: não envie nada** — leia `eval.json` (cada caso errado vem com a saída do modelo).
- Pode-se rodar os gates soltos: `eval_golden.py --gguf ... --unconstrained`, `eval_seguranca.py --gguf ...`, `eval_fidelidade.py --gguf ... --amostra 200`; todos aceitam `--endpoint` (URL do Modal; `MODAL_KEY` e `MODAL_SECRET` no ambiente).
- `eval_golden.py` traduz o CID do golden pelos nomes de `data/quimica/compostos` (sem o pacote, o acerto de `composto` não é medido e o aviso aparece).
- Registrar: copie o resultado para `eval/AAAA-MM-DD_<versão>.json` (formato de `eval_golden.py --out`); é a base da catraca do próximo ciclo.

## 6. Publicar no Hugging Face (revisão nova e imutável)
```bash
hf upload franciscoaleixo/SaibaTudoIA-NLU ai_model/output/SaibaTudo-Quimica-NLU-merged . --commit-message "nlu-v1-AAAAMMDD: <gates>"
hf upload franciscoaleixo/SaibaTudoIA-NLU ai_model/output/gguf/nlu-v1-AAAAMMDD/model-Q4_K_M.gguf gguf/nlu-v1-AAAAMMDD-Q4_K_M.gguf     # opcional: o GGUF aprovado
hf repos tag create franciscoaleixo/SaibaTudoIA-NLU nlu-v1-AAAAMMDD
```
(idem para `-Ask`). Anote o **SHA do commit** do upload: a versão é a revisão, não `main`. O `main` pode mudar; a revisão antiga continua recuperável (`--revision <SHA>`).
**Space do explicador** (principal em produção): publicar `backend/hf_space_quimica/` com o `ask_core.py` copiado (receita no README de lá), e nas *Variables* do Space `ASK_MODEL_ID=franciscoaleixo/SaibaTudo-Quimica-Ask`,
`ASK_MODEL_REVISION=<SHA>`; o Space reinicia sozinho. Enquanto não houver modelo ajustado aprovado, ele serve o `Qwen3-4B-Instruct-2507` base com o mesmo prompt e o servidor verifica a resposta do mesmo jeito.

## 7. Enviar ao Modal (reserva e serviço do NLU)
```bash
# só se o gate aprovou; o --upload do convert_local.py faz o mesmo. Sem MSYS_NO_PATHCONV=1 o Git Bash reescreve o destino para C:/Program Files/Git/...
MSYS_NO_PATHCONV=1 python -m modal volume put SaibaTudoIA-Models-Quimica ai_model/output/gguf/<versão>/model-Q4_K_M.gguf /<versão>/model-Q4_K_M.gguf
MSYS_NO_PATHCONV=1 python -m modal volume put SaibaTudoIA-Models-Quimica ai_model/output/gguf/<versão>/meta.json /<versão>/meta.json
MSYS_NO_PATHCONV=1 python -m modal volume put SaibaTudoIA-Models-Quimica ai_model/output/gguf/<versão>/eval.json /<versão>/eval.json
python -m modal deploy backend/modal/nlu_app.py          # NLU (CPU), app SaibaTudoIA-NLU-Quimica; primeira vez: python -m modal run backend/modal/nlu_app.py::bench
python -m modal deploy backend/modal/ask_app.py          # reserva do explicador (L4); primeira vez: ... ask_app.py::bench
```
O `deploy` pode ser feito antes de promover (os contêineres só sobem quando houver ponteiro). Anote as URLs (`https://franciscoaleixo--saibatudoia-nlu-quimica-nlu-infer.us-east.modal.run`; o Modal escreve o nome do app em minúsculas na URL) e crie o par de tokens de proxy no painel do Modal (Settings → Proxy Auth Tokens).

## 8. Promover, configurar a Vercel e testar ao vivo
1. **Promover:** `python backend/modal/promover.py --version nlu-v1-AAAAMMDD` (e `--version ask-v1-AAAAMMDD`). Lê `meta.json`, exige `passed`; reprovada só com `--force --reason "..."` (fica registrado). Grava `/current.json` ou `/ask-current.json` no Volume.
   **Depois de promover, mude `SNAPSHOT_EPOCH` em `backend/modal/nlu_app.py` para a versão nova e rode `python -m modal deploy backend/modal/nlu_app.py`.** Com o snapshot de memória ligado, um deploy sem mudança no código é pulado ("no changes detected") e os contêineres novos restauram o snapshot com o modelo **anterior** já carregado — o ponteiro novo só é lido quando há um deploy novo (lição da promoção do v3.4, 17/10/2026).
2. **Variáveis na Vercel** (produção; `printf '%s'` sempre):
   ```bash
   printf '%s' "https://<...>-infer.modal.run"  | vercel env add MODAL_ENDPOINT production
   printf '%s' "$MODAL_KEY"                     | vercel env add MODAL_KEY production --sensitive
   printf '%s' "$MODAL_SECRET"                  | vercel env add MODAL_SECRET production --sensitive
   printf '%s' "nlu-v1-AAAAMMDD"                | vercel env add MODEL_VERSION production        # invalida o cache
   printf '%s' "1"                              | vercel env add ASK_ENABLED production           # só quando o explicador estiver aprovado
   printf '%s' "https://franciscoaleixo-saibatudo-quimica.hf.space" | vercel env add HF_ASK_SPACE_URL production
   printf '%s' "$HF_TOKEN_LEITURA"              | vercel env add HF_TOKEN production --sensitive  # fine-grained, somente leitura (secrets/hf_token.txt)
   printf '%s' "https://<...>-ask.modal.run"    | vercel env add MODAL_ASK_ENDPOINT production
   printf '%s' "ask-v1-AAAAMMDD"                | vercel env add ASK_MODEL_VERSION production
   ```
   O pacote de dados tem `cliente.nlu.endpoint` e `cliente.ask.enabled` (`docs/DATA_CONTRACT.md` §1): o pipeline os escreve a partir de variáveis do GitHub (`gh variable set ASK_ENABLED --body 1`).
3. **Deploy:** push na `main` **não** faz deploy; `gh workflow run quimica-data-refresh.yml` publica. Depois, `gh run list --limit 6` (conferir **todos** os workflows).
4. **Testar ao vivo:** `curl https://saibatudo.net/quimica/api/health` (esperado `nlu:"on"`, `ask:"on"`, `model` = a versão); `POST /quimica/api/nlu` com uma pergunta real e uma perigosa (esperado `RECUSA_PERIGO`, `model:"regra"`);
   `POST /quimica/api/ask` com trechos de teste. Ver `api/README.md`. Medir o tempo de GPU por resposta no Space (a cota é de 40 min/dia na conta PRO) e anotar.

## 9. Como reverter
| O que | Como |
| :-- | :-- |
| NLU para a versão anterior | `python backend/modal/promover.py --version <anterior> --target nlu --rollback` + `MODEL_VERSION=<anterior>` na Vercel + deploy |
| Explicador para a versão anterior | `ASK_MODEL_REVISION=<SHA anterior>` no Space (volta sozinho) · reserva: `promover.py --version <ask anterior> --target ask --rollback` · `ASK_MODEL_VERSION` na Vercel |
| Desligar a IA | `vercel env rm ASK_ENABLED production -y` (explicação) e/ou `vercel env rm MODAL_ENDPOINT production -y` (NLU) + deploy: o app continua 100 % funcional offline, com o NLU local |
| Modelo ruim detectado depois | a avaliação noturna (`eval_golden.py --endpoint`) reprova -> rollback acima; abrir issue com os casos |
| Dados ruins | redeploy do commit anterior na Vercel; investigar a assinatura se falhar |

## 10. Cadência, custos e limites
- **Dados:** semanal (domingo 03:00, Brasília), só publica se uma fonte mudou. **Modelo:** mensal, ou quando o painel noturno reprovar a produção, ou quando surgirem **intenção, propriedade, unidade ou classe de composto novos**
  (nesse caso atualizar *juntos*: `api/_lib/vocab.js`, `backend/modal/nlu_core.py`, `LocalNlu.kt`/`nlu.js` e `dataset/vocab_nlu.py`; `test_nlu_core.py` e `vocab.test.mjs` falham se divergirem).
- **Custos de referência** (medidos no app de eleições; **medir de novo** aqui): Modal US$ 30/mês grátis no workspace (o teto de gasto só se define no painel); NLU em CPU ≈ US$ 0,40/h ligado (≈ US$ 3/mês no ritmo atual);
  **química, 14/10/2026:** contêiner de 4 núcleos + 4 GiB ≈ US$ 0,22/h (US$ 0,047/núcleo-h + US$ 0,008/GiB-h); `scaledown_window` 300 s (~US$ 0,02 por rajada);
  snapshot de memória ligado (frio ~9 s ao vivo em vez de 12–19 s; quente 2–3 s); 1 contêiner sempre ligado custaria ~US$ 160/mês (descartado);
  L4 ≈ US$ 0,88/h e cobra o contêiner inteiro (inclui os 60 s de `scaledown_window`) — por isso é só reserva, com `MODAL_ASK_DAILY_BUDGET=15`; Hugging Face PRO: 40 min/dia de ZeroGPU, ≈ 3 s de GPU por resposta
  (≈ 800 respostas/dia), passar da cota só cobra com **crédito pré-pago** (não deixe saldo); Upstash gratuito (500 mil comandos/mês, ≈ 4 por chamada); Vercel Hobby (uso não comercial).
- **Limites de proteção:** `RATE_IP_PER_MIN=20`, `RATE_IID_PER_DAY=60`, `DAILY_BUDGET=300`, `HF_ASK_DAILY_BUDGET=400`; firewall da Vercel 60 req/min por IP em `/api/*`.

## 11. Antes do primeiro treino (o que falta)
1. `data/quimica/` real publicado e dataset **não** gerado da fixture (`stats.json`); golden com mais cobertura (hoje não há `quantidades` nem `nivel` no `nlu_golden_cases.json`: esses gates ficam sem casos).
2. Unificar os ids de propriedade e a regra do `composto` (CID × texto) — ver "Pontos a reconciliar" em `api/README.md`; o gerador do dataset (`dataset/vocab_nlu.py`) usa os ids do **modelo** (`pontoFusaoK`...).
3. Aplicar o rewrite e o `includeFiles` no `vercel.json` (`api/README.md`); criar os repositórios do HF e o Space; criar o par de tokens do Modal; token de leitura do HF em `secrets/`.
4. Validar no primeiro uso, porque não puderam ser executados: build do `llama-cpp-python` com CUDA em `ask_app.py`, `bench` do NLU (CPU_CORES e `MODAL_TIMEOUT_MS`), tempo de GPU do Space, tempo de treino do 4B, `--gpu-layers` do gate.
5. Depois do primeiro modelo aprovado: criar `eval/` com o resultado, ligar a avaliação noturna (segredos `MODAL_*` no GitHub) e atualizar o cartão de cada modelo com as versões e métricas.

## 12. Mapa de arquivos
`api/` (rotas e `_lib/`: `vocab`, `ground`, `normalize`, `seguranca`, `fidelidade`, handlers) · `backend/modal/` (`nlu_core.py`, `ask_core.py`, `nlu_app.py`, `ask_app.py`, `convert_local.py`, `promover.py`, `eval_golden.py`, `eval_seguranca.py`, `eval_fidelidade.py`, `eval_ask_common.py`, `gbnf_mini.py`) ·
`backend/hf_space_quimica/` · `backend/retrain/` (`build_nlu_dataset.py`, `build_ask_dataset.py`, `dataset_common.py`) · `ai_model/` (`scripts/train_hybrid.py`, `merge_and_export.py`, `treino_utils.py`, cartões dos modelos).
Testes: `cd api && npm test` · `python -m unittest discover -s backend/modal -p "test_*.py"` · `python -m unittest discover -s backend/retrain -p "test_*.py"` · `python -m unittest discover -s ai_model/scripts -p "test_*.py"`.

## 13. SaibaTudo-NLU (Qwen3.5-2B): o fluxo real do NLU a partir de 13/10/2026
O interpretador em nuvem deste app é o **NLU único** da SaibaTudo.IA (`docs/PLANO_IA_SAIBATUDO.md` §9 da raiz): um só modelo, treinado em
`ia/treino/` sobre o corpus unificado de `ia/corpus/` (química em pt-BR, en, es, de, fr + eleições), avaliado com o `eval_golden.py` e a gramática
**deste** app. Para o NLU, as seções 3 a 5 acima (treino/fusão/conversão com `train_hybrid.py` e `convert_local.py`, base Qwen2.5) ficam como
histórico; o explicador (`ask`) continua nelas.

| Etapa | Onde | Comando (da raiz; `$PY` = Python do treino) |
| :-- | :-- | :-- |
| treino / continuação | `ia/treino/` | `treinar_nlu.py` (`--lora_init` para continuar de um LoRA) — ver `ia/treino/README.md` |
| exportar GGUF | `ia/treino/` | `exportar_gguf.py --lora <out>/final --out <out>/gguf --q8` (llama.cpp **b11575**, `--no-mtp`) |
| gate | `ia/treino/` | `avaliar_gguf.py --app quimica --gguf <Q4> --holdout --out <out>/eval_quimica_q4.json` e `--gguf <Q8> --sem_livre --out <out>/eval_quimica_q8.json` (e o mesmo com `--app eleicoes`: o modelo é um só) |
| empacotar | `ia/treino/` | `empacotar_versao.py --app quimica --version nlu-v3.1-AAAAMMDD --gguf <Q4> --eval <q4.json> --eval-q8 <q8.json> --train-meta <out>/final/train_meta.json --origem "..."` → `ai_model/output/gguf/<versão>/{model-Q4_K_M.gguf, meta.json, eval.json}`; `passed` só se os gates do app, **cada idioma**, o template e a ausência de `<think>` passarem |
| enviar e servir | este app | §7: `MSYS_NO_PATHCONV=1 python -m modal volume put SaibaTudoIA-Models-Quimica ai_model/output/gguf/<versão>/<arquivo> /<versão>/<arquivo>` para os três arquivos; `python -m modal deploy backend/modal/nlu_app.py` |
| promover | este app | §8: `python backend/modal/promover.py --version <versão>` (exige `passed`), depois `MODEL_VERSION`, `MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET` na Vercel e `gh workflow run quimica-data-refresh.yml` |

**Prompt igual no treino, no gate e no serviço.** O Qwen3.5 responde sem raciocínio: o template põe um bloco de raciocínio vazio no início do turno
do assistente (`nlu_core.THINK_VAZIO`). O `meta.json` grava `prompt_suffix` e `base_model`; `promover.py` copia os dois para o ponteiro
(`current.json`) e `nlu_app.py` envia `nlu_core.build_prompt(q) + prompt_suffix` (ponteiro sem o campo = sufixo vazio, Qwen2.5). `avaliar_gguf.py`
confere que o template gravado no GGUF, o do tokenizer e essa string são idênticos (`template.gguf_template_igual_servico`), e o empacotador reprova se não forem.

**Gramática condicionada à intenção e normalização da pergunta (14/10/2026, decisão do mantenedor; itens 1 e 4 da lista de melhorias de código).**
`nlu_core.build_grammar()` gera uma alternativa da raiz por intenção: só as chaves que a intenção admite, na ordem do contrato, com as obrigatórias
sem `?` (`ENTIDADES_POR_INTENCAO`, tabela derivada do golden de 723 e do corpus de 44.703 + 1.406 alvos, nenhum fora dela; `test_nlu_core` confere
o golden inteiro). `elemento`, `propriedade`, `unidadeDestino` e `nivel` já eram vocabulários fechados (118 símbolos, ids do pacote, unidades);
`MASSA_MOLAR`/`COMPOSTO`/`BALANCEAR` **não** obrigam entidade porque o golden tem perguntas genéricas. `has_valid_shape` continua só estrutural
(sem gramática, uma chave fora da intenção conta como erro de entidade no avaliador, não como JSON inválido). `nlu_core.normalize_question`
(dentro de `clean_question`, logo também no gate e no `eval_golden`) canoniza tipografia antes do modelo: subscritos → dígitos, aspas e traços
curvos, setas exóticas e `=>`/`-->` → `→`, NBSP, `×` → `x`, pontuação repetida; nada vira minúscula e acentos ficam (o modelo copia o composto como
está). **Qualquer mudança em `nlu_core.py` exige rodar de novo o gate (`avaliar_gguf.py --app quimica --holdout`) com o GGUF em produção antes de
`python -m modal deploy backend/modal/nlu_app.py`**, porque a gramática e a limpeza da pergunta são as mesmas do serviço.

**Pergunta inválida no golden** (`"   "` → `DESCONHECIDA`): o serviço a recusa antes do modelo (proxy 400 → NLU local → `DESCONHECIDA`), por isso
`eval_golden.evaluate` não chama o modelo nesses casos e conta a resposta do sistema (`cases[].servico`).

**Primeira versão publicada:** não há catraca (nenhum NLU treinado esteve em produção na química antes); a partir da segunda, `--previous-eval
ai_model/output/gguf/<anterior>/eval.json --previous-version <anterior>` no empacotador. Rollback: §9 (`promover.py --rollback` assume o sufixo do
Qwen3.5; para um modelo Qwen2.5 seria preciso editar o ponteiro).

**Eleições:** o mesmo GGUF passa pelo gate de lá (`--app eleicoes`), mas a publicação segue o `convert_gguf.py`/Volume `saibatudo-nlu-models` do app
de eleições e só depois do congelamento (27/10).


**NLU v3.4 publicado (17/10/2026, ~05h):** `nlu-v3.4-20261017` (continuação do LoRA v3.3 com multi-turno por `contexto`, COMPARAR ancorado e CONCEITO pt; corpus `ia/corpus/out/v34`, registro `ia/treino/out/nlu-v34-cont/`, resumo em `ia/treino/README.md` §v3.4). Gate: golden 777 98,5 % de intenção (v3.3 no mesmo golden: 98,3 %), holdout 2.371 99,6 %, holdouts novos multi-turno 99,3 % / comparar 100 % / conceito 100 % / revisor 100 %, eleições sem regressão (97,4 % golden, 97,0 % holdout). **Publicado na química em 17/10/2026 (~05h, horário de Brasília):** `modal volume put` ×3 no Volume `SaibaTudoIA-Models-Quimica`, `promover.py --version nlu-v3.4-20261017` (ponteiro `current.json` com sha256 `7797…f62c`), `modal deploy` do `nlu_app.py` (precisou de mudança no código — `SNAPSHOT_EPOCH` — porque o snapshot de memória guardava o v3.3 carregado), `MODEL_VERSION` na Vercel e `vercel deploy --prod`. Ao vivo: `/quimica/api/health` → `model nlu-v3.4-20261017`; 5 perguntas pelo `/quimica/api/nlu` certas (de MASSA_MOLAR "Kochsalz" → CID 5234; pt COMPARAR F/eletronegatividade; pt CONCEITO "o que é um sal?"; en pedido perigoso → RECUSA_PERIGO por regra; fr "formule brute de l'acide acétique" → NOMENCLATURA + CID 176, o único desvio do golden); fria 22,1 s (cria o snapshot), quente 2,3–3,8 s. O `contexto` multi-turno ainda não é enviado por serviço nem clientes (onda 3); sem contexto o modelo se comporta como o v3.3 ou melhor.

**Contexto no serviço (17/10/2026).** `nlu_app.py` aceita `{q, contexto?}`: a pergunta passa por `validate_question` sozinha, o contexto por
`nlu_core.validate_contexto` (`has_valid_shape` + texto sem controle/quebra/`<|` + `format_output` com até 400 caracteres; inválido → 400) e o
prompt é `build_prompt(build_user_message(q, contexto)) + prompt_suffix`, a mesma mensagem `contexto: …\n<pergunta>` do treino e do gate
(`ia/corpus/contexto_nlu.py`; `ia/corpus/test_contexto_nlu.py` confere as duas implementações e o holdout multi-turno inteiro). A gramática não
depende do contexto. O proxy valida o mesmo contrato (`api/_lib/contexto.js`), põe a forma canônica na chave do cache, aceita a entidade herdada
igual à do contexto na ancoragem e responde `contexto: true` (`api/README.md`). A gramática e a limpeza da pergunta não mudaram (o gate do v3.4
já mediu o multi-turno com esse formato: 99,3 %); publicar exige `modal deploy` com `SNAPSHOT_EPOCH` novo e `vercel deploy`.

**Renome no Modal (14/10/2026, manhã):** o app `saibatudo-quimica-nlu` e o Volume `saibatudo-quimica-models` viraram `SaibaTudoIA-NLU-Quimica` e `SaibaTudoIA-Models-Quimica` (padrão `SaibaTudoIA-<Papel>-<App>` com hífen, decidido pelo mantenedor). O Modal não renomeia: Volume novo criado, os três arquivos da `nlu-v3.3-20261013` e o `current.json` copiados (sha256 do GGUF conferido), `modal deploy` com o nome novo, `MODAL_ENDPOINT` trocado na Vercel (produção) e redeploy; o app e o Volume antigos foram apagados depois do teste ao vivo. Medidas no endpoint novo: primeira chamada 22,2 s (cria o snapshot), quente 3,6–4,3 s direto no Modal e 3,0–4,9 s pela Vercel. O par de Proxy Auth Token é do workspace e não mudou.

**Corpus v3.5 pronto, não treinado (17/10/2026, noite):** intenções novas NOX, ENTALPIA, EQUILIBRIO e LIGACAO e a propriedade
`entalpiaFormacaoKJmol` entraram no contrato (`nlu_core.py` INTENTS/ENTIDADES_POR_INTENCAO/gramática, API, clientes) e no corpus
(`ia/corpus/quimica_v35.py`, famílias de superfície: notação científica, numerais por extenso, estequiometria sem "quantos", nomenclatura por
nome sistemático, mistura, ordenação). O serviço no Modal **continua com o `nlu_core.py` anterior** de propósito: o v3.4 não foi treinado nas
intenções novas e a gramática nova só deve ir ao ar junto com o v3.5 aprovado no gate (golden 929 agora inclui 56 casos das intenções novas —
o v3.4 vai errar esses; comparar por intenção). Treino: `ia/treino/README.md` §v3.5 (continuação do LoRA v3.4, `max_length 288`, ~4 h).

**Treino do v3.5 iniciado (18/10/2026, 02h52):** depois do contrato de 18/10 (`CALCULADORAS_2026-10-17.md` §7: ids `energiaGibbsFormacaoKJmol`,
`entropiaPadraoJmolK`, `particulas`; Kc sem equação → CONCEITO), o corpus foi remontado (teto pt 760 + piso por propriedade; 74.935 pares; 43 testes,
vazamento golden 984 × treino limpo) e a mistura de continuação (43.360 pares, 21 rótulos mudados pelos moldes de prótons) começou a treinar sobre o
LoRA v3.4 (`ia/treino/README.md` §v3.5; roteiro `ia/treino/out/nlu-v35-cont/pipeline.sh`). Gate previsto: golden 984 (o v3.4 erra os casos das
intenções e ids novos — comparar por intenção), holdout da química, 13 holdouts do v3.5 e os do v3.4 (meta 90 % cada), eleições sem regressão. O
serviço no Modal continua com o `nlu_core.py` anterior até a promoção.

**v3.5 treinado e medido (18/10/2026, 10h) — promoção PENDENTE:** gate em `ia/treino/README.md` §v3.5: golden 984 intenção 98,4 % (776 casos em
comum com o v3.4: 98,5 → 97,9 %; 208 casos novos 100 %), holdout 2.538 99,4 %, Q8 = Q4, 17 extras com intenção ≥ 90 %; eleições 96,5 % / 96,6 %.
`passed: false` só por "alucinação de composto" em 3 de 10 casos null — NOMENCLATURA de nomes IUPAC fora do pacote em que o modelo copia o nome da
pergunta para `composto` (o contrato admite; desacordo entre o golden e o contrato, não entidade inventada). Pacote
`ai_model/output/gguf/nlu-v3.5-20261018/` e os 3 arquivos já no Volume (`/nlu-v3.5-20261018/`); **ponteiro, `SNAPSHOT_EPOCH` e `MODEL_VERSION`
continuam no v3.4**. A promoção com `promover.py --force --reason` ficou para o mantenedor (opções A/B/C no README do treino). O serviço continua
com o `nlu_core.py` anterior até a promoção.

**v3.6 treinado e medido (18/10/2026, 21h29) — promoção PENDENTE:** continuação curta do LoRA v3.5 com a mistura de reforço de
`ia/treino/misturar_reforco.py` (todo CONCEITO da química + eleições com todos os `apenasDeferidas` + retenção; `ia/treino/README.md` §v3.6).
Golden 984 intenção 98,9 % (776 em comum com o v3.4: 98,5 → 97,9 → 98,7 %; CONCEITO pt 15/15 de volta; 208 casos novos 207/208), holdout 2.538 99,6 %,
Q8 98,8 %, 13 dos 17 extras inteiros; eleições golden 94,7 % e `apenasDeferidas` 8/9. `passed: false` pelos mesmos 3 casos IUPAC e por
**es unidadeDestino 9/11** ("25 °C a K" → PROPRIEDADE; "mmHg a atm, kPa y torr" → kPa). Pacote `ai_model/output/gguf/nlu-v3.6-20261018/` e Volume
(`/nlu-v3.6-20261018/`); **ponteiro, `SNAPSHOT_EPOCH` e `MODEL_VERSION` continuam no v3.4**; o serviço continua com o `nlu_core.py` anterior.
Decisão do mantenedor (A forçar o v3.6 / B v3.7 multilíngue + golden alinhado / C nada) e comandos no README do treino.

**Opção B (18/10/2026, noite): golden alinhado e v3.7 em treino.** O mantenedor escolheu manter o v3.4, alinhar o golden e treinar antes de
promover. Os 3 casos NOMENCLATURA de nome IUPAC fora do pacote perderam o `composto: null` (`contracts/nlu_golden_cases.json`, 984 casos; chave
ausente = não medida; a `descricao` registra a regra: o contrato admite o nome copiado e o proxy só o mantém com evidência no texto). Testes web,
API, Modal e Android do contrato continuam verdes. v3.7 = continuação do LoRA v3.6 com reforço **multilíngue** (21.654 pares: foco com teto
350 por intenção × idioma, retenção equilibrada por idioma, eleições com REGRAS_URNA e AJUDA inteiras; `ia/treino/README.md` §v3.7). Promoção
só com `passed: true` sem força; até lá o serviço segue no v3.4 com o `nlu_core.py` anterior.
