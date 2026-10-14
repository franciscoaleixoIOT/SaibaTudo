# SaibaTudo IA — plano para substituir o Qwen da nuvem por uma IA própria dos apps

> Pedido do mantenedor (12/10/2026): trocar a IA Qwen da nuvem por uma IA **com melhorias, voltada para os apps SaibaTudo e com o
> nome SaibaTudo**, escolhendo a melhor base (Qwen, Gemma…). Este documento é o plano; a **etapa 1 (benchmark) foi executada em 12/10/2026** — resultado em
> [`BENCHMARK_IA_2026-10-12.md`](BENCHMARK_IA_2026-10-12.md); as demais etapas não começaram.
> Restrições que continuam valendo: treino **sempre local** (RTX 5060 Laptop, 8 GB), Modal só serve (teto US$ 30/mês), ZeroGPU do
> Hugging Face (40 min de GPU/dia, conta PRO) para texto gerado, **nenhum número sai do modelo**, neutralidade eleitoral,
> **congelamento de eleições 24–26/10/2026** (nada do app de eleições muda nesses dias), segredos só em `secrets/`.

## 1. O que existe hoje (ponto de partida)

| Peça | Base | Onde roda | Como foi treinada | Observação |
| :-- | :-- | :-- | :-- | :-- |
| NLU da nuvem (eleições, `v2.3-20261007`) | **Qwen2.5-1.5B-Instruct** + LoRA ("hybrid"), GGUF Q4_K_M | Modal (CPU, llama.cpp) | local, 3 h 30, dados de `backend/retrain` | 93,7 % de intenção no golden, 96,8 % em 435 perguntas reservadas |
| Texto gerado (eleições, "ask") | **Qwen2.5-7B-Instruct** sem ajuste (prompt + verificador) | Space privado ZeroGPU; Modal L4 reserva | nenhum treino | 2–6 s por resposta; verificador descarta fatos que contradizem o app |
| Química (fase 5, planejada) | Qwen2.5-1.5B (NLU) e Qwen3-4B (explicador) | idem | dataset de 66.066 pares (CC BY-SA), 20.538 exemplos de NLU, agora em 5 idiomas | ainda não treinada |
| Ciclo e gate | `train_hybrid.py` → `merge_and_export.py` → `convert_local.py` (gate) → Modal/HF | local | — | gate: JSON ≥ 98 %, intenção ≥ 85 %, entidade ≥ 90 %, alucinação ≤ 5 %, catraca de 1 ponto |

O que falta nessa arquitetura, e que o pedido resolve: (a) o texto gerado usa um modelo genérico sem treino de comportamento
(fontes, rótulos, recusas, tom); (b) cada app tem/teria o seu NLU separado; (c) o nome exposto é de terceiro; (d) a química
precisa de cinco idiomas e a eleição de um só.

## 2. Escolha da base — critérios e comparação

Critérios, na ordem que pesam aqui: **licença que permite renomear e distribuir como "SaibaTudo"** (sem obrigação de carregar a
marca alheia no nome do produto), **português do Brasil forte** e os outros quatro idiomas da química, **tamanhos que cabem no
treino local** (QLoRA 4-bit em 8 GB: até ~4B com `max_length` 1024; 7–8B só com `max_length` ≤ 512 e lote 1), **GGUF no
llama.cpp** (o Modal serve assim), **saída JSON confiável** (o NLU usa gramática), **modo "sem raciocínio"** controlável (latência).

| Base (famílias de 2025–26) | Licença | pt-BR / es-de-fr | Tamanhos úteis | Treino local 8 GB | Veredito |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **Qwen3** (0.6B, 1.7B, 4B, 8B; `-Instruct-2507`) | **Apache 2.0** (todos os tamanhos) | muito bom (119 idiomas) | 1.7B (NLU), 4B (explicador), 8B (teto) | 1.7B e 4B: sim; 8B: apertado | **Recomendada.** Mesma família já em uso (ciclo, gate, GGUF prontos); renomear é livre, bastando a atribuição no *model card*. |
| Gemma 3 (1B, 4B, 12B, 27B) / Gemma 3n | Termos próprios do Google (uso permitido, mas com política de uso que acompanha os derivados) | muito bom (140 idiomas) | 1B, 4B | 1B e 4B: sim | Boa alternativa técnica; a licença obriga a repassar restrições de uso aos derivados e dá menos liberdade de marca. Fica como **segunda opção** e como comparativo no benchmark. |
| Llama 3.2 (1B, 3B) / Llama 4 | Licença Llama | bom em pt | 1B, 3B | sim | **Descartada para a marca:** a licença exige "Llama" no início do nome de qualquer derivado e o aviso "Built with Llama". |
| Mistral (Ministral 3B/8B; Mistral Small 24B) | Ministral: licença de pesquisa (uso comercial sob contrato); Small: Apache 2.0 | bom | 24B não cabe | não | Descartada: os tamanhos pequenos não têm licença livre; o livre é grande demais. |
| Phi-4-mini (3.8B) | MIT | pt fraco em relação aos demais | 3.8B | sim | Descartada pela qualidade em português. |
| SmolLM3 (3B) / EuroLLM (1.7B, 9B) | Apache 2.0 | EuroLLM: bom em pt-PT/es/de/fr; SmolLM3: razoável | 1.7B, 3B | sim | Alternativas abertas para o **benchmark** do NLU; EuroLLM não tem pt-BR como foco. |
| **IBM Granite 3.1–3.3** (2B, 8B) / Granite 4.0 | **Apache 2.0** | treinado em 12 idiomas que incluem **pt, es, de, fr**; bom em instrução e JSON | 2B (NLU), 8B (explicador, apertado) | 2B: sim; 8B: apertado | **Desafiante principal do benchmark** (pedido do mantenedor, 12/10): mesma liberdade de marca do Qwen3; na faixa de 2B compete de perto. Granite 4.0 (híbrido Mamba) só se o llama.cpp do Modal já o servir. |
| Phi-4-mini (3.8B) / Phi-4 (14B) | MIT | pt mais fraco que Qwen3/Granite; explicação menos natural | 3.8B | 3.8B: sim; 14B: não | Entra no benchmark **só como controle barato** do NLU. |
| DeepSeek-V3 / R1 e "R1-Distill" | MIT (a parte da DeepSeek); os *distill* pequenos herdam a licença da base (Qwen2.5 ou Llama) | bom | 671B não cabe; distill 1.5B–8B | distill: sim | **Descartada:** os grandes são inviáveis; os pequenos são Qwen/Llama com raciocínio longo em `<think>` (latência e JSON piores). |
| Mistral 7B v0.3 / Mixtral 8x7B | Apache 2.0 | razoável (2023) | 7B | não (7B em 8 GB só com 512 tokens) | Descartada: perde para o Qwen3-4B em multilíngue e é mais cara de treinar. |
| OLMo 2 / OLMoE (Allen AI) | Apache 2.0, dados e treino abertos | fraco em pt (Dolma é quase todo inglês) | 1B, 7B | sim | Descartada pela qualidade em português; a transparência de dados não é o gargalo. |
| Modelos brasileiros (Tucano 1.1B/2.4B, Sabiá) | Tucano Apache 2.0 (base Llama-like treinada do zero em pt); Sabiá-3 só por API | Tucano: pt-BR forte, sem os outros idiomas | 1.1B, 2.4B | sim | Tucano entra no benchmark **do app de eleições** (só pt). Sabiá não serve: não é aberto. |

**Decisão proposta:** família **Qwen3** como base da **SaibaTudo IA**, com **Granite 3.3**, Gemma 3 e Tucano medidos no mesmo benchmark para
confirmar (ou derrubar) a escolha antes de treinar o modelo definitivo. Se Gemma 3 4B vencer o Qwen3 4B por margem clara em
português (≥ 3 pontos no gate) o custo da licença passa a valer a pena e a decisão volta ao mantenedor.

## 3. Arquitetura da SaibaTudo IA (dois modelos, um nome)

Um só nome para o usuário ("SaibaTudo IA"), dois modelos por trás, porque as tarefas são opostas (interpretar em JSON a 1 s em
CPU × escrever um texto curto com GPU):

1. **SaibaTudo-NLU** (interpretador, base Qwen3-1.7B, LoRA → GGUF Q4_K_M, Modal CPU). **Um só modelo para todos os apps**: o
   prompt leva `app` (`eleicoes2026`, `quimica`, …) e `idioma`; o conjunto de intenções é a união dos contratos
   (`contracts/nlu_golden_cases.json` de cada app). Vantagem: um ciclo de treino, um serviço, um gate; o app de eleições só
   troca de modelo depois de 27/10. Saída JSON com gramática, como hoje.
2. **SaibaTudo-Explica** (texto gerado, base Qwen3-4B-Instruct-2507, QLoRA → GGUF Q4/Q5 ou bf16 no ZeroGPU). Treino de
   **comportamento**, não de fatos: responde só com os trechos e dados que recebe, cita fonte e licença, rotula "pode conter
   erros", recusa (neutralidade e segurança química) com os textos dos contratos, respeita o idioma pedido, não inventa número.
   O verificador do servidor continua (defesa em profundidade). Alvo: substituir o Qwen2.5-7B com qualidade igual ou melhor e
   metade do tempo de GPU (4B × 7B).
3. **Opcional, fase posterior — SaibaTudo-NLU-mini** (Qwen3-0.6B, Q4 ≈ 400 MB) embarcado no Android para interpretar sem rede
   quando o NLU por regras falhar. Só se o benchmark mostrar ganho real sobre as regras.

Regras que não mudam: nenhum número vem do modelo; eleições nunca recomendam; fatos críticos vêm dos dados; captura de perguntas
opt-in e filtrada; segredos em `secrets/`.

## 4. Dados de treino (um corpus "SaibaTudo instruct")

- **Formato único** (`backend/retrain/saibatudo/`): `{app, idioma, tarefa: "nlu"|"explica", entrada, contexto[], saida, fonte, licenca}`.
- **NLU:** eleições (`backend/retrain/out-v2.3` + holdout) e química (`dataset/` → 20.538 exemplos de NLU, mais os golden
  por idioma como **teste**, nunca treino). Regras já existentes: extras de "falhas do golden" são recusados; 20 % reservado.
- **Explica:** pares do dataset de química (66.066, CC BY-SA 4.0, fontes licenciadas) reescritos como "trechos + pergunta →
  resposta com fonte"; para eleições, respostas montadas **pelo app** (determinísticas, TSE) usadas como alvo de reescrita
  neutra; **recusas** vindas dos contratos (`seguranca_cases.json`, `opiniao_cases.json`) em pt e, para química, nos 5 idiomas.
  Nada dos livros protegidos (`LivrosQuimica`), nada de texto sem licença.
- **Multilíngue:** só química treina em en/es/de/fr; eleições fica em pt-BR (regra do projeto).
- **Qualidade:** dedupe por normalização, limite por intenção para não enviesar, revisão humana por amostra (o mantenedor).

## 5. Avaliação (benchmark antes de escolher; gate antes de publicar)

- `tools/benchmark_ia/` (novo, raiz): roda os **mesmos** golden e holdouts de todos os apps contra qualquer GGUF, mede intenção,
  entidades, JSON válido, alucinação, latência (CPU Modal-equivalente) e tamanho; para o explicador mede aderência à fonte
  (todo número da resposta existe nos trechos), idioma da resposta, recusas corretas, tamanho da resposta, e um painel de 50
  perguntas por app avaliado às cegas pelo mantenedor (A × B, sem saber qual modelo).
- Candidatos do benchmark: NLU — Qwen2.5-1.5B (atual, referência), Qwen3-1.7B, **Granite-3.3-2B**, Gemma-3-1B, Phi-4-mini
  (controle), Tucano-2.4B (só eleições), SmolLM3-3B; Explica — Qwen2.5-7B (atual), Qwen3-4B, **Granite-3.3-8B**, Gemma-3-4B,
  Qwen3-8B (se couber no treino).
- **Resultado da etapa 1 (12/10/2026, [`BENCHMARK_IA_2026-10-12.md`](BENCHMARK_IA_2026-10-12.md)):** candidatos medidos **sem treino**
  (few-shot + gramática) contra o v2.3 ajustado. NLU: **Qwen3.5-2B** recomendado (72,6 % de intenção média sem treino contra 66,1 % do
  Qwen3-1.7B, 82–85 % na química em todos os cinco idiomas, mesmo custo de CPU ~0,85 s p50); **Qwen3.5-4B** como reserva (76,0 %;
  química 89–94 %; 2× mais lento em CPU). Explicador: **Qwen3-4B-Instruct-2507** mantido (100 % de fidelidade e idioma, o mais rápido,
  o que menos inventa citação); Qwen3.5-4B empatado tecnicamente. Granite 3.3, Phi-4-mini e SmolLM3 ficaram atrás em intenção, JSON
  nativo e latência; Gemma 3 não foi medida (licença não aceita pelo mantenedor, HTTP 403); Tucano-2b4 ficou sem número (saída
  incoerente nos dois runtimes). A família continua **Qwen, Apache 2.0**. Riscos novos do Qwen3.5 (arquitetura híbrida: treino sem os
  kernels `flash-linear-attention`/`causal-conv1d` usa a implementação lenta) → treino-teste curto antes da etapa 3.
- O gate existente (`convert_local.py`) passa a receber `--app` e `--idioma` e a **catraca** compara com o modelo em produção
  de cada app. Nada sobe se perder para o atual.

## 6. Serviço, publicação e marca

- **Hugging Face:** repositórios privados `franciscoaleixo/SaibaTudo-NLU` e `franciscoaleixo/SaibaTudo-Explica`, revisões
  imutáveis por versão (`v3.0-AAAAMMDD`). *Model card* com base, licença Apache 2.0 e aviso de atribuição ("baseado em Qwen3,
  © Alibaba Cloud, Apache 2.0") — exigência da licença; na interface dos apps o nome é só **SaibaTudo IA**.
- **Modal:** Volume `saibatudo-ia-models` com `current.json` por tarefa; a função `nlu` recebe `app`; `MODEL_VERSION` por app na
  Vercel para invalidar cache. O Modal continua reserva do explicador.
- **ZeroGPU:** Space `saibatudo-ia-explica` com o 4B em bf16 (cabe fácil) ou GGUF; mesma API do Space atual para a Vercel não
  mudar; teto diário por app (`HF_ASK_DAILY_BUDGET`).
- **Health:** `/api/health` passa a expor `ia: { nlu: "SaibaTudo-NLU v3.0", explica: "SaibaTudo-Explica v1.0" }` em cada app.
- **Textos dos apps:** "Perguntar à IA na nuvem" vira "Perguntar à SaibaTudo IA"; a nota de rodapé "texto gerado, pode conter
  erros" continua. Catálogos de i18n da química ganham a chave.

## 7. Etapas e esforço (ordem recomendada)

| # | Etapa | Entrega | Esforço local | Depende de |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Benchmark das bases (NLU e Explica) — **feito em 12/10/2026** | `tools/benchmark_ia/` + [`BENCHMARK_IA_2026-10-12.md`](BENCHMARK_IA_2026-10-12.md) | 79 min de GPU/CPU, ~2 h de relógio | — |
| 2 | Corpus SaibaTudo instruct | `backend/retrain/saibatudo/` com validação e contagens por app/idioma | 1 dia | — |
| 3 | SaibaTudo-NLU v3 (**Qwen3.5-2B**, conforme o benchmark; Qwen3-1.7B se o treino do híbrido não couber; Qwen3.5-4B se a química não passar em en/es/de/fr) | treino (~4 h), gate por app, publicação em paralelo ao atual (`MODEL_VERSION` só da química) | 1 noite | 1, 2 |
| 4 | SaibaTudo-Explica v1 (Qwen3-4B-Instruct-2507 QLoRA, confirmado pelo benchmark) | treino (6–10 h), avaliação às cegas, Space novo, Vercel apontando para ele na **química** | 2 noites | 1, 2 |
| 5 | Troca no app de eleições | `MODEL_VERSION` e Space da eleição apontam para a SaibaTudo IA; textos "SaibaTudo IA" | 1 dia | 3, 4, **depois de 27/10** |
| 6 | Ciclo contínuo | retreino mensal com captura opt-in revisada; painel noturno compara versões; `OPERACAO.md` atualizado | contínuo | 5 |
| 7 | (opcional) NLU-mini no Android | Qwen3.5-0.8B Q4 embarcado (57,8 % sem treino, 508 MB, 0,5 s em CPU), só se o treino o levar ao gate | 2 dias | 3 |

Custos previstos: zero em treino (local); Modal dentro dos US$ 30 (o 1.7B em CPU custa como o 1.5B); ZeroGPU: o 4B gasta
menos GPU que o 7B atual, então a cota de 40 min/dia rende mais respostas.

## 8. Riscos e como tratar
- **Qwen3 e "raciocínio":** o modo *thinking* aumenta latência e quebra JSON — treinar e servir com `enable_thinking=False`
  (template) e teste no gate de "nenhum `<think>` na saída".
- **Modelo único de NLU piorar um app:** a catraca por app bloqueia; se não passar, mantém-se um GGUF por app (mesma base).
- **8 GB de VRAM:** 4B em QLoRA 4-bit com `max_length 1024` cabe; 8B só com 512 e lote 1 — o benchmark decide se vale.
- **Licença Gemma, se vencer:** exigiria aceitar e repassar a política de uso proibido; decisão do mantenedor.
- **Nome:** "SaibaTudo IA" é marca do projeto; o *model card* mantém a atribuição da base (Apache 2.0 exige aviso, não o nome).
- **Congelamento:** eleições não muda entre 24 e 26/10; a química pode avançar nesse período.

## 9. Decisões pedidas ao mantenedor

> **Etapa 3 — NLU v3 (Qwen3.5-2B, corpus único) treinado e avaliado em 13/10/2026.** Treino completo em 7 h 38 (6.888 passos, 2 épocas,
> 55.099 exemplos, receita de `ia/treino/README.md`; interrompido no passo 755 por falta de memória do sistema e retomado do checkpoint 500),
> exportado para GGUF (Q4_K_M 1,2 GB; Q8_0 1,9 GB) e avaliado em CPU com o `eval_golden` e a gramática de produção de **cada app**
> (`ia/treino/avaliar_gguf.py --app`). Resultado do Q4_K_M (gate: JSON 100 % com gramática e ≥ 98 % sem, intenção ≥ 85 %, cada entidade ≥ 90 %,
> alucinação ≤ 5 %):
>
> | App / conjunto | JSON (com / sem gramática) | Intenção | Entidades | Veredito |
> | :-- | :-- | :-- | :-- | :-- |
> | Química, golden 723 (pt 145 · en 108 · es 137 · de 150 · fr 183) | 99,9 % / 99,4 % | **97,4 %** (95,9 a 98,1 por idioma) | elemento 95,3 · propriedade 98,3 · equação 100 · unidade 100 · **composto 88,3 %** (pt 88,2 · en 77,5 · es 94 · de 96 · fr 88,4) | **reprovado só em `composto`** (gate 90 %) |
> | Química, holdout 1.807 (nunca treinado) | 100 % | 99,8 % | ≥ 99,1 % em todas | ok nos 5 idiomas |
> | Eleições, golden 114 | 100 % / 100 % | **95,6 %** (v2.3: 93,9 % no mesmo avaliador) | 100 % em todas | reprovado por **1 caso**: "deputado mais votado" → cargo `DEPUTADO_DISTRITAL` (3 casos com cargo null → 33 %) |
> | Eleições, holdout 435 | 100 % | 96,1 % (v2.3: 96,3 %) | ≥ 96,6 % | ok |
>
> O único JSON inválido com gramática é o caso em branco do golden (`"   "`), que o serviço rejeita antes do modelo. Latência em CPU (8 threads):
> 1,8 s com gramática na química (0,9 s sem; a gramática GBNF da química dobra o tempo), 1,3 s nas eleições (v2.3: ~0,7 s). Nenhum `<think>` vazou.
>
> **Diagnóstico do `composto`:** dos 31 erros, 23 são o modelo deixando de copiar o composto em perguntas com nomes **populares** ("ponto de
> ebulição da água", "hazards of sulfuric acid", "Was ist Kochsalz?", "hcl", "queima de 16 g de metano"): o corpus sorteava os 1.971 compostos
> por igual (quase nunca "água", "soda cáustica", "bleach") e os "casos duros" dos geradores ensinavam "perigos do X" **sem** composto. Outros
> 6 são "o que é a amônia?" → CONCEITO (65 exemplos de "o que é {composto}" contra 3.052 de CONCEITO). Antes de medir, o avaliador da
> química só conhecia nomes em português: corrigido para os nomes por idioma do pacote (`eval_golden.carregar_cids`), o que levou `composto`
> de 61 % para 88 % sem gerar de novo (`ia/treino/repontuar_eval.py`).
>
> **Correção (v3.1, em andamento em 13/10):** gerador focado `ia/corpus/quimica_populares.py` (compostos do dia a dia nos 5 idiomas, +8.764
> exemplos), casos duros com o composto/elemento copiado quando a substância está no pacote (5 geradores), corpus remontado (69.090) e
> **treino de continuação** a partir do LoRA v3 (`--lora_init`, 19.280 exemplos = novos + revisão estratificada, 1 época, lr 1e-4, ~1,3 h).
> Depois: gate completo de novo nos dois apps. A publicação continua condicionada ao gate (química primeiro; eleições só depois de 27/10).
>
> **Resultado do v3.1 (13/10, 1 h 45 de treino, gate completo de 2 h 30):** `composto` subiu de 88,3 % para **98,5 %** (holdout 2.266: 99,1 %),
> intenção 96,3 %, mas **`elemento` caiu de 95,3 % para 85,1 %** e o composto passou a aparecer onde deveria ser nulo (5 dos 6 casos): "Fale
> sobre o oxigênio", "Tell me about oxygen", "Sauerstoff", "hidrogênio", "Masa molar: azufre", "souffre" saíram como `COMPOSTO`/`composto`. Causa:
> o pacote traz 13 **substâncias elementares** como compostos (O2, H2, N2, Cl2, O3, F2, Br2, I2, gases nobres; 4 com `nomePopular`) e o gerador
> novo as sorteava pelos nomes de todos os idiomas ("Oxygen", "oxígeno"...) — ensinando que o nome de um elemento é composto, o contrário do
> golden (nome de elemento → `ELEMENTO`/símbolo). Nas eleições a intenção recuou de 95,6 % para 93,9 % (holdout 96,3 %): cinco casos raros
> (`REGRAS_URNA`, `AJUDA`, "Governador do Pará") foram para `DESCONHECIDA`/`PERFIL` — esquecimento por revisão pequena do app (3.944 exemplos).
> Nenhuma queda de quantização; nenhum `<think>`.
>
> **Correção (v3.2, em andamento em 13/10 à tarde):** `quimica_populares.py` exclui substâncias elementares (`eh_elementar`) e ganha um grupo de
> perguntas pelo **nome do elemento** nos 5 idiomas (`M_EL`: ELEMENTO, MASSA_MOLAR, SEGURANCA com `elemento` = símbolo; elementos comuns pesam
> 12×, erro de digitação em 8 %, como no golden "ferrro"/"souffre"); `misturar_continuacao.py --peso-app eleicoes2026=2.5` (revisão das eleições
> ×2,5). Treino de continuação **a partir do v3** (não do v3.1), 1 época, lr 1e-4; depois exportar e gate completo. Enquanto isso o serviço da
> química foi preparado para servir o Qwen3.5 (`apps/quimica/docs/MODELO.md` §13, commit 09fc730): ponteiro com `prompt_suffix`,
> `ia/treino/empacotar_versao.py` e avaliador que trata a pergunta em branco como resposta do sistema.
>
> **Resultado do v3.2 (13/10, 2 h 40 de treino, Q4 dos dois apps até 18h25):** o problema do v3.1 sumiu — química `elemento` **98,6 %**,
> `composto` 97,4 %, intenção 97,9 % (holdout 2.376: 99,4 %), alucinação zero nos casos nulos; eleições intenção 92,1 % no golden de 114 (v3: 95,6 %; esquecimento de REGRAS_URNA),
> holdout de 435: 96,1 %, `cargo` 100 % e sem alucinação; sem `<think>`, template igual ao serviço. Os gates de referência dos dois apps passaram, **mas o gate por idioma
> reprovou**: `propriedade` em pt-BR 85,7 % (3 de 21) e `equacao` em es 80 % (1 de 5). Causa, de novo no gerador novo: as frases de **"massa
> atômica de <elemento>"** entraram em `M_EL` sob **MASSA_MOLAR**, e no golden "massa atômica do oxigênio/carbono", "atomic mass of oxygen",
> "Atommasse von Sauerstoff", "masse atomique de l'oxygène" são `PROPRIEDADE`/`massaAtomica` — o modelo aprendeu o contrário nas 5 línguas
> (6 dos 7 erros de propriedade; o sétimo, "nox do cloro", erra desde o v3). O caso de equação ("combustión del metano: CH4 + O2 = CO2 + H2O" →
> COMPOSTO) é um só e não tem padrão. A avaliação Q8 foi interrompida: a versão não seria publicada.
>
> **Correção (v3.3, iniciada em 13/10 às 19h):** em `M_EL`, "massa atômica/atomic mass/Atommasse/masse atomique" vai para um grupo
> **PROPRIEDADE** com `propriedade = massaAtomica` (cota 50 por idioma) e MASSA_MOLAR fica só com "massa molar/molar mass/molare Masse/masse
> molaire"; o teste do gerador exige a separação. Mesma receita do v3.2 (continuação a partir do v3, revisão das eleições ×2,5), gate completo
> em seguida; cópia do corpus v3.2 em `ia/corpus/out/v32/`.
>
> **Resultado do v3.3 e PUBLICAÇÃO (13/10 à noite, 2 h 20 de treino, gate completo até 23h50):** química **aprovada em tudo** — golden 723 com
> gramática: intenção 99,0 %, elemento 98,6 %, composto 98,1 %, propriedade 98,3 %, equacao 100 %, unidadeDestino 100 %, alucinação 0 % nos
> casos nulos, os 5 idiomas ok; holdout de 2.395 nunca treinados: 99,6 %; Q8 = Q4 (sem queda de quantização); sem `<think>`. Eleições: golden
> 95,6 % (igual ao v3), holdout 96,8 %, reprovado só por "deputado mais votado" → `cargo` DEPUTADO_DISTRITAL (o mesmo caso do v3) e 4 erros
> de intenção em REGRAS_URNA/frases soltas — fica para o ciclo das eleições depois de 27/10. **Publicado na química em 14/10 às 0h00 (UTC 03h):**
> `ia/treino/empacotar_versao.py` → `nlu-v3.3-20261013` (`apps/quimica/ai_model/output/gguf/`), Volume `saibatudo-quimica-models` criado e
> carregado (GGUF Q4 + meta + eval), `modal deploy backend/modal/nlu_app.py` (app `saibatudo-quimica-nlu`; bench: frio 11,2 s, quente p50 2,19 s),
> `promover.py` (ponteiro com `prompt_suffix`), variáveis `MODAL_ENDPOINT`/`MODAL_KEY`/`MODAL_SECRET`/`MODEL_VERSION` na Vercel e
> `vercel deploy --prod` pela CLI local (o workflow de dados ainda não termina no GitHub). Ao vivo: `/quimica/api/health` → `model nlu-v3.3-20261013,
> nlu on`; 5 perguntas em pt/de/es respondidas certas pelo `/quimica/api/nlu` (2,4–3,2 s quente; 9,8 s na primeira, frio). O primeiro NLU
> treinado da SaibaTudo.IA em produção. Próximos passos decididos pelo mantenedor: gramática gerada dos dados, resolução do composto na API e
> normalização da entrada (código, não treino); depois a etapa 1 do AchaVagaIA.

> **Decidido em 12/10/2026 (noite):** o mantenedor aprovou seguir com o **Qwen3.5-2B** como interpretador **único de todos os apps**
> (Qwen3.5-4B de reserva se a química não passar no gate em en/es/de/fr) e deu o nome **"SaibaTudo.IA"** à IA (confirmado em 12/10; o nome fica numa constante única). Em andamento: etapa 2 (corpus único, `ia/corpus/`) e etapa 3a
> (treino-teste curto do Qwen3.5-2B, `ia/treino/`). A pasta `ia/` na raiz reúne o que é da SaibaTudo.IA e lê os apps sem alterá-los.

1. Aprovar as bases indicadas pelo benchmark: **Qwen3.5-2B** para o NLU (reserva Qwen3.5-4B) e **Qwen3-4B-Instruct-2507** para o
   explicador — ou pedir outra. Gemma 3 só entraria se o mantenedor aceitasse a licença no Hugging Face.
2. Um só **SaibaTudo-NLU** para todos os apps (recomendado) ou um por app.
3. ~~Começar o benchmark (etapa 1)~~ — feito em 12/10/2026. Próximo: etapa 2 (corpus) e treino-teste do Qwen3.5-2B.
5. Preencher o painel às cegas (`tools/benchmark_ia/out/cegas.md`, 20 itens, Qwen2.5-7B × Qwen3.5-4B) antes de abrir
   `out/cegas_chave.json`.
4. Nome final na interface: "SaibaTudo IA" (sugerido) ou outro.
