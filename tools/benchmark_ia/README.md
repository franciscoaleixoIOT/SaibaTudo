# Benchmark da SaibaTudo IA (etapa 1 de `docs/PLANO_IA_SAIBATUDO.md`)

Compara bases candidatas para os dois modelos da SaibaTudo IA — o **interpretador (NLU)** e o **explicador** (texto gerado com fontes) —
nos mesmos casos e com as mesmas funções de pontuação dos gates de produção dos apps (importadas de `apps/*/backend/modal/`, sem cópia).
Só lê os apps; não publica nada (sem Modal, Vercel, Hugging Face Space nem `MODEL_VERSION`). Relatório: `docs/BENCHMARK_IA_2026-10-12.md`.

## Requisitos (esta máquina)
- Python do ambiente de treino: `C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\ai_model\.venv\Scripts\python.exe`
  (usa `huggingface_hub`; `torch/transformers/gguf` só para converter o Tucano). Rode sempre com `-I` (isolado).
- **llama.cpp oficial, build CUDA** (`llama-server.exe`), em `C:\Users\franc\models\llama.cpp\b11575` (variável `LLAMA_BIN` muda o
  caminho). Motivo: o `llama-cpp-python 0.3.19` do ambiente foi compilado **sem CUDA** e não conhece Qwen3.5/SmolLM3.
  Baixar: `gh release download b11575 -R ggml-org/llama.cpp -p "llama-b11575-bin-win-cuda-13.4-x64.zip" -p "cudart-llama-bin-win-cuda-13.4-x64.zip"`
  e descompactar os dois na mesma pasta.
- Login no Hugging Face feito pela API Python (o `hf.exe` é bloqueado pelo Device Guard). Repositórios Gemma exigem aceitar a licença no site.

## Rodar (da raiz do repositório; `PY` = o Python acima)
| Etapa | Comando | Saída |
| :-- | :-- | :-- |
| 0. manter o Windows acordado | `pwsh -NoProfile -File tools/benchmark_ia/acordado.ps1` (apague `out/acordado.on` para encerrar) | — |
| 1. baixar modelos | `$PY -I tools/benchmark_ia/baixar.py [--so id1,id2]` | `out/downloads.json` |
| 2. prompts do explicador | `$PY -I tools/benchmark_ia/casos_explica.py` | `out/casos_explica.json` |
| 3. NLU (GPU, tudo) | `$PY -I tools/benchmark_ia/nlu_bench.py --sem-cpu [--modelos ...] [--fracao 0.5]` | `out/nlu_<id>.json/.jsonl` |
| 4. NLU (CPU, 30 casos/app) | `$PY -I tools/benchmark_ia/nlu_bench.py --so-cpu [--modelos ...]` (rodar sem outra carga na máquina) | idem |
| 5. explicador | `$PY -I tools/benchmark_ia/explica_bench.py [--modelos ...] [--fracao 0.5]` | `out/explica_<id>.json/.jsonl` |
| 6. resumo e rankings | `$PY -I tools/benchmark_ia/resumo.py` | `out/resumo.json`, `out/tabelas.md` |
| 7. painel às cegas | `$PY -I tools/benchmark_ia/cegas.py [--atual qwen2.5-7b] [--candidato id]` | `out/cegas.md`, `out/cegas_chave.json` |

Atalho: `bash tools/benchmark_ia/rodar_tudo.sh [nlu-gpu explica nlu-cpu resumo cegas]` (variáveis `NLU_MODELOS`, `EXP_MODELOS`,
`EXP_FRACAO`). Mudou um detector (idioma, recusa, citação) em `comum.py`/`explica_bench.py`? `explica_bench.py --repontuar` recalcula as
métricas a partir dos `.jsonl` sem rodar modelo. `tucano_hf.py` tenta o Tucano pelo transformers (não funcionou: ver o relatório).

Sem `--modelos`, cada etapa roda todos os modelos do registro (`modelos.py`) que estiverem baixados. Os modelos rodam um de cada vez
(um `llama-server` por modelo, encerrado no fim; a VRAM é liberada entre eles).

## O que é medido
- **NLU** (`nlu_bench.py`): golden de eleições (114) + holdout reservado do v2.3 (435) + golden de química (723, 5 idiomas). Prompt few-shot
  igual para todos (`prompts_nlu.py`, exemplos só do conjunto de treino), template de chat do próprio GGUF, raciocínio desligado
  (`enable_thinking=false`), **gramática GBNF de produção** de cada app. Pontuação = `eval_golden.evaluate` do app (intenção, cada
  entidade, alucinação em casos `null`, JSON válido). Validade **nativa** do JSON e vazamento de `<think>` numa amostra sem gramática
  (40 + 50 casos). Latência GPU em todos os casos; latência **CPU, 8 threads** (como o Modal) em 30 casos por app, com o prefixo do prompt já
  em cache (servidor de pé) e o "prompt frio" medido à parte. O v2.3 de produção é ajustado e usa o seu prompt curto de treino; os demais
  **não têm ajuste** (mede o potencial antes do treino).
- **Explicador** (`explica_bench.py`): 100 prompts (60 química em 5 idiomas com trechos/contexto reais do dataset; 40 eleições com contexto
  **sintético e fictício**) + 10 pedidos que devem ser recusados (dos contratos). Fidelidade numérica (todo número da resposta tem de estar
  nas fontes: `ask_core.numeros_sem_fonte` na química, porte de `numerosNaoFundamentados` nas eleições), idioma da resposta (heurística de
  palavras funcionais, `comum.detectar_idioma`), citação de fonte, recomendação, recusas, tokens, latência e tokens/s.

## Arquivos
`modelos.py` (registro, licenças) · `servidor.py` (llama-server + VRAM) · `comum.py` (carga dos módulos dos apps, idioma, recusa, verificador
de números da eleição) · `prompts_nlu.py` · `casos_explica.py` · `nlu_bench.py` · `explica_bench.py` · `resumo.py` · `cegas.py` ·
`baixar.py` · `acordado.ps1` · `rodar_tudo.sh` · `tucano_hf.py`. Em `out/` só `resumo.json`, `tabelas.md`, `cegas.md` e `cegas_chave.json` são versionáveis (o resto está
no `.gitignore`).
