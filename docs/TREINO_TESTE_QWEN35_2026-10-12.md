# Treino-teste do Qwen3.5-2B (SaibaTudo.IA, NLU) — 12/10/2026

> Etapa 3a do [`PLANO_IA_SAIBATUDO.md`](PLANO_IA_SAIBATUDO.md), depois do [benchmark](BENCHMARK_IA_2026-10-12.md) (§7 "Riscos do Qwen3.5"
> e §8). Objetivo: provar ou derrubar a viabilidade do **Qwen3.5-2B** como base do interpretador (NLU) único da **SaibaTudo.IA**
> antes do treino completo. Tudo foi feito na máquina local (RTX 5060 Laptop, 8 GB). Nada mudou no Modal, na Vercel, nos Spaces
> do Hugging Face nem no `MODEL_VERSION`, e não houve commit. Código: [`ia/treino/`](../ia/treino/README.md). Saídas brutas (fora do Git):
> `ia/treino/out/`.

## 1. Veredito

**Viável. Recomendação: seguir com o Qwen3.5-2B na etapa 3.** Não é preciso cair para o Qwen3-1.7B.

| Critério de corte do pedido | Resultado | Situação |
| :-- | :-- | :-- |
| Treino QLoRA cabe em 8 GB | pico de **4,7 GB alocados / 5,1 GB reservados** pelo PyTorch (7,0 GB no dispositivo, com ~2 GB do Windows) | ok |
| 3 épocas em até ~8 h | **5,9 h** com a receita exata do v2.3 (lote 2 × 8); **3,3 h** com lote 4 × 4 e preenchimento fixo de 160 tokens (mesmo lote efetivo de 16) | ok |
| Exportação de ponta a ponta | LoRA → mescla → `convert_hf_to_gguf.py` (b11575) → `llama-quantize` Q4_K_M → **carrega no `llama-cpp-python 0.3.19`** (runtime do Modal) | ok |
| JSON com gramática | **100 %** (golden 114 e holdout 435) | ok |
| `<think>` vazando | **0** com gramática e **0** sem gramática | ok |
| Template treino = serviço = GGUF | idênticos, caractere por caractere e token por token | ok |
| Latência de CPU (8 threads) parecida com a do benchmark (~0,85 s p50) | **0,95 s** p50 no `llama-server` b11575 (mesmo runtime do benchmark); **1,2–1,5 s** p50 no `llama-cpp-python 0.3.19` | atenção (§6) |

Depois de apenas **200 passos** (15 % de uma época), o modelo já faz **86,8 %** de intenção no golden e **84,8 %** no holdout de
435. A base sem ajuste fazia 73,7 % e 60,5 %, e isso com prompt few-shot. O gate é de 85 %.

Condições para a etapa 3:
1. A latência em CPU fica **cerca de 2× a do v2.3** no mesmo runtime (§6). O aumento vem da arquitetura híbrida: o prompt é
   relido inteiro a cada pergunta e o vocabulário tem 248 mil tokens. O prompt pode ser enxugado depois do ajuste, e o serviço pode
   passar a um runtime mais novo. O custo de CPU no Modal precisa caber no teto de US$ 30/mês: medir antes de publicar.
2. Sem os kernels lineares (fla/triton), o treino roda em PyTorch puro. O Controle de Aplicativo da máquina bloqueia o triton
   (§7.1), então o tempo acima já é o tempo real.

## 2. Medições do treino

Base `Qwen/Qwen3.5-2B` (safetensors oficiais, revisão `15852e8c`, `trust_remote_code=False`). Carregada como `Qwen3_5ForCausalLM`,
só a parte de linguagem: os pesos `model.visual.*` e `mtp.*` do checkpoint ficam de fora. Dataset v2.3:
`SaibaTudoEleicao2026/backend/retrain/out-v23/train.json`, 20.748 pares, sha256 `d09049d2…`.

Receita do v2.3: QLoRA 4-bit NF4 com dupla quantização, LoRA r=16, alpha=32, dropout 0,05 em **todas as lineares**, lr 2e-4
cosseno com 25 passos de aquecimento, `max_length` 256, `paged_adamw_8bit`, gradient checkpointing, bf16 e semente 2026.

As lineares com LoRA são 12 tipos de módulo:
- atenção cheia: `q/k/v/o_proj`;
- Gated DeltaNet: `in_proj_qkv`, `in_proj_z`, `in_proj_a`, `in_proj_b`, `out_proj`;
- MLP: `gate/up/down_proj`.

Ao todo, 16,8 M parâmetros treináveis (0,89 %). Tokens por exemplo com o template novo: média 119,3, máximo 158. Nenhuma amostra
truncada (máscara do prompt: `ok` em 20.748 de 20.748).

| Configuração (lote × acúmulo) | s/passo (mediana) | 3 épocas (3.891 passos) | VRAM alocada / reservada (pico) | Dispositivo (pico) | Observação |
| :-- | --: | --: | --: | --: | :-- |
| **2 × 8 (receita v2.3), 200 passos** | **5,43** | **5,9 h** | 4.689 / 5.058 MiB | 6.957 MiB | execução de referência deste relatório |
| 4 × 4, preenchimento dinâmico | 3,39 | 3,9 h | 5.551 / **10.076** MiB | 8.150 (cheio) | fragmentação: transborda para a memória compartilhada; **não usar** |
| 8 × 2, preenchimento dinâmico | 2,71 | 3,8 h | 7.338 / 11.378 MiB | 8.150 (cheio) | idem |
| 4 × 4 sem gradient checkpointing | 22,6 | 26 h | 10.162 / 12.436 MiB | 8.150 (cheio) | transborda; inviável |
| 8 × 2 sem gradient checkpointing | — | — | — | — | falta de memória (OOM) |
| 4 × 4 + `expandable_segments` | 3,29 | 3,5 h | 5.551 / 10.076 MiB | 8.150 | `expandable_segments not supported on this platform` (Windows) |
| **4 × 4 + `--pad_fixo 160`**, 30 passos | **2,93** | **3,3 h** | 5.710 / **6.606** MiB | 7.926 MiB | formas constantes acabam com a fragmentação; perda igual à de 2 × 8 (1,114 → 0,339 → 0,153 nos passos 10/20/30) |

- **Perda (2 × 8, a cada 10 passos):** 1,114 → 0,340 → 0,152 → 0,091 → 0,057 → … → 0,0101 (passo 190) → **0,0056 (passo 200)**. O
  v2.3 (Qwen2.5-1.5B) registrou 0,957 → 0,181 nos passos 20/40 e terminou em 0,00026 depois de 3 épocas.
- **Comparação de tempo:** o v2.2 (Qwen2.5-1.5B, mesma receita) levou 3 h 53 min, ou 3,7 s/passo. O `train_meta.json` do v2.3
  registra 9,0 h de relógio; provavelmente inclui pausas, porque tem o mesmo número de passos. O Qwen3.5-2B na receita exata gasta
  **+47 % por passo**.
- **Uso de GPU de só ~30 % no lote 2.** Sem fla, a regra delta em blocos do Gated DeltaNet roda em PyTorch puro: são muitas
  operações pequenas, e o gargalo é o lançamento de kernels, não a conta. Por isso o lote 4 rende quase o dobro por passo. A folga de
  VRAM com 4 × 4 + preenchimento fixo é de só ~220 MB (com ~2 GB usados pelo Windows e pelos apps abertos). Para o treino completo,
  feche os apps que usam GPU. Se faltar memória, volte para 2 × 8 (5,9 h).
- A descarga híbrida para a RAM (`--cpu_offload`) não foi necessária.

## 3. Caminho de exportação que funcionou

| Etapa | Ferramenta e versão | Comando | Tempo |
| :-- | :-- | :-- | --: |
| Mescla LoRA → bf16 (CPU) | transformers 5.17.0, peft 0.21.1, torch 2.11.0+cu128 | `python -I ia/treino/exportar_gguf.py --lora ia/treino/out/nlu-qwen35-2b-teste/final --out ia/treino/out/gguf-teste --q8` | 12 s |
| HF → GGUF bf16 | `convert_hf_to_gguf.py` do llama.cpp **b11575** (commit `48e98575`, checkout esparso em `C:\Users\franc\models\llama.cpp-src\b11575`) | `python -E -s convert_hf_to_gguf.py <mesclado> --outfile …-bf16.gguf --outtype bf16 --no-mtp --model-name SaibaTudo-NLU` | 25–30 s |
| Quantização | `llama-quantize.exe` b11575 (oficial, `C:\Users\franc\models\llama.cpp\b11575`) | `llama-quantize …-bf16.gguf …-Q4_K_M.gguf Q4_K_M` (e `Q8_0`) | 7–11 s |
| Carga e avaliação | **llama-cpp-python 0.3.19** (CPU, sem CUDA; o runtime do Modal) | `python -I ia/treino/avaliar_gguf.py --gguf …-Q4_K_M.gguf --threads 8 --holdout` | carga 1,1 s |

Arquivos em `ia/treino/out/gguf-teste/`:

| Arquivo | Tamanho |
| :-- | --: |
| `saibatudo-nlu-qwen35-2b-Q4_K_M.gguf` | 1.215 MiB |
| `saibatudo-nlu-qwen35-2b-Q8_0.gguf` | 1.919 MiB |
| `saibatudo-nlu-qwen35-2b-bf16.gguf` | 3.601 MiB |
| `mesclado/` (safetensors) | — |

O GGUF tem arquitetura `qwen35`, 24 blocos (sem MTP), `tokenizer.ggml.pre = qwen35`, EOS 248046 (`<|im_end|>`) e o template de chat
oficial. O Q4_K_M ficou do tamanho do da Unsloth (1.222 MiB), mas sem imatriz.

Detalhes que importam:
- **`--no-mtp` é obrigatório.** O modelo mesclado é só texto e não tem a cabeça MTP, mas o `config.json` ainda declara
  `mtp_num_hidden_layers: 1`. Sem a opção, o conversor espera um 25º bloco que não existe.
- **O conversor do b11575 virou pacote** (`conversion/`). Com `python -I` a pasta do script sai do `sys.path` e dá
  `ModuleNotFoundError: conversion`. Ele roda com `-E -s` (ignora as variáveis `PYTHON*` e o site do usuário) e com `cwd` fora da
  pasta dele. Só o conversor foi executado, sobre os pesos.
- A mescla carrega a base em **bf16 na CPU**: não disputa a GPU, e o Qwen3.5 é nativo em bf16. O `merge_and_export.py` de produção
  carrega em fp16.
- O llama.cpp do b11575 grava a chave nova `qwen35.attention.recurrent_layers`, que o GGUF da Unsloth não tem. O 0.3.19 carregou
  sem reclamar.

## 4. Resultado do `eval_golden` (Q4_K_M, depois de 200 passos)

Pontuação idêntica à do gate: `eval_golden.evaluate`, importado sem cópia, formato v2, gramática GBNF de produção (`nlu_core.grammar_for("v2")`).

| Conjunto | JSON | Intenção | Entidades (acerto) | Alucinação (casos `null`) | `<think>` |
| :-- | --: | --: | :-- | :-- | --: |
| Golden 114, **com gramática** (Q4_K_M) | **100 %** | **86,8 %** | cargo 100, UF 100, partido 100, nome 92,3, tema 100, histórico 100, turno 100, deferidas 100 | **cargo 66,7 % (2 de 3)**; demais 0 % | 0 |
| Golden 114, sem gramática (validade nativa) | 99,1 % | 86,8 % | UF 93,8, nome 84,6, demais 100 | cargo 66,7 % | **0** |
| Holdout v2.3 (435), com gramática | **100 %** | **84,8 %** | cargo 100, UF 98,4, nome 100, tema 89,7, turno 100; deferidas 0 (9 casos) | cargo 0,3 %, UF 1,0 % | 0 |
| Golden 114, com gramática (**Q8_0**) | 100 % | 86,8 % | nome 100 (+1 caso), demais iguais | cargo 66,7 % | 0 |

Referências: o v2.3 de produção faz 93,9 % e 96,3 %; a base Qwen3.5-2B sem treino, com few-shot, fez 73,7 % e 60,5 %.

- **Gate (só referência, o modelo não é candidato):** reprovado pela alucinação de cargo e pelo holdout 0,2 ponto abaixo de 85 %.
  - A alucinação de cargo vem de 2 dos 3 casos `null`: "deputado mais votado" → `DEPUTADO_ESTADUAL`.
  - Os erros de intenção mais comuns são REGRAS_URNA → LOCAL_VOTACAO (4) e DESCONHECIDA → LISTAR_CANDIDATOS (3).
  - O holdout ainda não aprendeu `apenasDeferidas`.
  - É o esperado com 15 % de uma época; o v2.3 só chega a 93,9 % depois de 3 épocas.
- **Queda Q4 × Q8:** 0 ponto na intenção e 1 caso de nome. Fica dentro do limite de 3 pontos do gate.

**Latência de CPU (8 threads, golden, Q4_K_M):**

| Runtime | Modo | p50 | p95 / p90 | Prompt frio |
| :-- | :-- | --: | --: | --: |
| llama-cpp-python 0.3.19 | com gramática | 1,16 s | 2,36 s (p95) | 1,12 s |
| llama-cpp-python 0.3.19 | sem gramática | 0,70 s | 1,20 s (p95) | — |

As outras duas medições de latência (repetição na mesma hora contra o v2.3, e `llama-server` b11575) estão no §6.

## 5. Formato exato do prompt (treino = serviço = GGUF)

O treino monta o prompt com o template de chat do tokenizer, com `enable_thinking=False`. No Qwen3.5 esse também é o padrão quando a
variável não é passada: o template só abre `<think>\n` se `enable_thinking` for `true`. O alvo é o JSON compacto v2, seguido de
`<|im_end|>\n`. A perda cai só no alvo e no `<|im_end|>\n`, pela máscara de `treino_utils.mascarar_prompt`.

```
<|im_start|>system
Você interpreta perguntas de eleitores para o SaibaTudo Eleições 2026. Converta a pergunta em JSON compacto com a intenção e somente as entidades citadas na pergunta (cargo, uf, partido, nome, tema, apenasDeferidas, historico, turno). Não responda a pergunta e não invente dados.<|im_end|>
<|im_start|>user
{pergunta}<|im_end|>
<|im_start|>assistant
<think>

</think>

{"intent": "LISTAR_CANDIDATOS", "cargo": "GOVERNADOR", "uf": "SP"}<|im_end|>
```

O serviço tem de enviar exatamente:

```
nlu_core.build_prompt(pergunta, "v2") + "<think>\n\n</think>\n\n"
```

Ou seja, o prompt ChatML de produção seguido do bloco de raciocínio **vazio**: `<think>`, `\n\n`, `</think>`, `\n\n`. A geração
usa a gramática v2 e para em `<|im_end|>` ou `<|endoftext|>` (`core.STOP_TOKENS`). O `nlu_core.py` de produção ainda não acrescenta
esse bloco. Isso entra junto com a troca de modelo (etapa 3; nas eleições, só depois de 27/10).

Tokens especiais (iguais no tokenizer HF e no GGUF):

| Token | Id |
| :-- | --: |
| `<|im_start|>` | 248045 |
| `<|im_end|>` | 248046 (EOS) |
| `<think>` | 248068 |
| `</think>` | 248069 |
| `<|endoftext|>` | 248044 (pad) |

O bloco vazio vira `[248068, 271, 248069, 271]`.

Conferências automáticas (`avaliar_gguf.py`, todas verdadeiras):
- o template gravado no GGUF, renderizado com `enable_thinking=false`, é igual à string do serviço;
- o mesmo template sem a variável dá a mesma string;
- o template do tokenizer HF dá a mesma string;
- a tokenização HF é igual à do GGUF, com 97 tokens de prompt para a pergunta de teste.

## 6. Latência: o que muda com o híbrido

Os dois modelos foram medidos na mesma máquina e na mesma hora (`ia/treino/latencia_cpu.py`): 30 perguntas do golden, CPU com
8 threads, Q4_K_M.

| Modelo / runtime | Só o prompt | Livre | **Com gramática** p50 (p90) | ms/token livre | ms/token com gramática | Reuso do prefixo |
| :-- | --: | --: | --: | --: | --: | :-- |
| v2.3 (Qwen2.5-1.5B), llama-cpp-python 0.3.19 | 57 ms | 410 ms | **784 ms** (1.246) | 21,7 | 44,6 | sim: só ~15 tokens novos |
| Qwen3.5-2B, 200 passos, llama-cpp-python 0.3.19 | 313 ms | 852 ms | **1.523 ms** (2.242) | 33,5 | 74,2 | **não**: os ~95 tokens a cada pergunta |
| Qwen3.5-2B, base da Unsloth (sem treino, prompt curto) | 345 ms | 3.279 ms | 6.421 ms | 31,7 | 73,7 | não; sem treino gera ~85 tokens |
| v2.3, `llama-server` b11575 | — | — | **454 ms** (683) | — | — | `cache_n` 90 |
| Qwen3.5-2B, 200 passos, `llama-server` b11575 | — | — | **947 ms** (1.253) | — | — | `cache_n` 0 |

A máquina estava carregada por outro agente; a passada do `eval_golden` deu 1,16 s p50 para o mesmo arquivo.

- **Por que é 2× mais lento:**
  - O cache de prefixo não funciona nas camadas recorrentes: o estado do DeltaNet não pode ser "rebobinado" até o fim do system
    prompt, nem no 0.3.19 nem no `llama-server`. Custa ~250 ms por pergunta.
  - O modelo é maior (1,9 B contra 1,5 B), e a cabeça de saída cobre 248 mil tokens contra 152 mil. Custa +55 % por token.
  - A gramática custa ~40 ms/token nos dois modelos.
- **No runtime do benchmark** (`llama-server` b11575) o modelo treinado fica em **0,95 s p50**, perto dos 0,85 s do benchmark. No
  `llama-cpp-python 0.3.19` (Modal) fica em 1,2–1,5 s.
- **Mitigações para a etapa 3, a medir no gate:**
  1. **Enxugar o system prompt** depois do ajuste. O modelo ajustado não precisa da instrução longa; com 97 → ~30 tokens de prompt, o
     custo cai na proporção.
  2. **Subir o runtime do Modal** para um `llama-cpp-python` mais novo, ou servir com o `llama-server`.
  3. Manter as saídas curtas, como hoje (~16 tokens).
  4. Medir o custo de CPU no Modal contra o teto de US$ 30/mês antes de publicar.

  O Qwen3-1.7B do plano original não resolve a gramática nem a cabeça de 152 mil tokens, mas reusaria o prefixo. Se a latência for
  decisiva, ele continua sendo a alternativa (benchmark: 0,83 s p50).

## 7. Problemas encontrados e como foram resolvidos

1. **Controle de Aplicativo (Code Integrity, WDAC) bloqueia DLLs não assinadas.** É uma restrição da máquina: não peça exclusão
   nem mude a política.
   - `pyarrow\_dataset…pyd` / `arrow_dataset.dll` no venv de produção (evento 3077, 20:27:53): o `Trainer` importa `datasets` só
     porque o pacote existe. **Solução sem mexer no venv:** `treinar_nlu.py` faz `sys.modules.setdefault("datasets", None)` antes de
     importar o transformers. O treino não usa `datasets`.
   - `triton\_C\libtriton.pyd` (21:14:58) num venv experimental (`ia/.venv`). Esse venv usava um `.pth` que só **lia** o venv de
     treino, e nele foram instalados `triton-windows 3.7.1.post27`, `fla-core 0.5.2` e `einops 0.8.2` (`pip install --no-deps`).
     O triton não carrega nesta máquina. Por isso também não rodam o `flash-linear-attention`, o `causal-conv1d` compilado nem o
     `torch.compile` com triton. **Caminho encerrado:** o `ia/.venv` foi apagado e o treino segue em PyTorch puro. O
     `causal-conv1d` 1.7.0 só existe como código-fonte (precisa do CUDA Toolkit e do MSVC) e não foi tentado. Nada foi instalado no
     venv de produção.
2. **O conversor do b11575 não roda com `-I`:** ver §3. Solução: `-E -s`.
3. **O conversor espera o MTP:** ver §3. Solução: `--no-mtp`.
4. **Memória de paginação:** a 1ª tentativa de mescla, feita durante o treino, falhou com `os error 1455`. A RAM estava ocupada
   pelo treino, pelo WSL e pelo outro agente. Com a mescla depois do treino, deu certo.
5. **Fragmentação da VRAM com lote 4:** `expandable_segments` não existe no Windows. Solução: `--pad_fixo 160` (§2).
6. **`general.name`** saía como "Mesclado". Agora `exportar_gguf.py` passa `--model-name SaibaTudo-NLU`.

## 8. Recomendação

**Seguir com o Qwen3.5-2B na etapa 3.** O treino cabe com folga em 8 GB. As 3 épocas levam **5,9 h** com a receita idêntica, ou
**3,3 h** com 4 × 4 + `--pad_fixo 160` (mesmo lote efetivo). A exportação funciona de ponta a ponta até o runtime do Modal, o template
fica garantido e não vaza `<think>`. Com 15 % de uma época o modelo já está no nível do gate de intenção.

Nenhum critério de queda do pedido foi atingido: o tempo fica abaixo de 8 h e não houve falha de exportação.

Ponto de atenção: a **latência em CPU fica ~2× a do v2.3** no mesmo runtime (~1,2–1,5 s p50 contra 0,6–0,8 s). A etapa 3 deve medir
o prompt enxugado e o runtime mais novo antes de publicar. O Qwen3-1.7B continua como plano B se a latência ou o custo no Modal
decidirem.

Comando sugerido para o treino completo, com os apps que usam GPU fechados:

```
python -I -u ia/treino/treinar_nlu.py --epochs 3 --batch_size 4 --grad_accum 4 --pad_fixo 160 --out ia/treino/out/nlu-qwen35-2b
```

Se faltar VRAM, use `--batch_size 2 --grad_accum 8`, sem `--pad_fixo`. O dataset da etapa 3 é o corpus unificado da etapa 2, com
eleições e química; este teste usou só eleições v2.3.
