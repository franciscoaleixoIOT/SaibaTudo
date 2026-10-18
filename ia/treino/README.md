# SaibaTudo.IA — treino do interpretador (NLU)

Pasta nova da IA própria dos apps (plano: [`docs/PLANO_IA_SAIBATUDO.md`](../../docs/PLANO_IA_SAIBATUDO.md)). Aqui fica o ciclo de treino
do **NLU único** sobre o **Qwen3.5-2B** (`Qwen/Qwen3.5-2B`, Apache 2.0). Resultado do treino-teste (etapa 3a):
[`docs/TREINO_TESTE_QWEN35_2026-10-12.md`](../../docs/TREINO_TESTE_QWEN35_2026-10-12.md).

Só lê os apps (importa `treino_utils.py`, `nlu_core.py` e `eval_golden.py` de `apps/eleicoes2026/` pelo caminho, sem cópia). Não
publica nada: nada de Modal, Vercel, Hugging Face Space nem `MODEL_VERSION`. Saídas grandes (LoRA, modelo mesclado, GGUF, logs) em
`ia/treino/out/` (fora do Git).

## Requisitos (esta máquina)
- **Python do ambiente de treino** (`C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\ai_model\.venv`, torch 2.11+cu128,
  transformers 5.17, peft 0.21.1, bitsandbytes 0.50.2, llama-cpp-python 0.3.19 só CPU). **Não instale nada nele** (treina a produção).
  Rode sempre com `-I`.
- **Conversor do llama.cpp** na tag **b11575** (checkout esparso só de `convert_hf_to_gguf.py`, `conversion/` e `gguf-py/`) em
  `C:\Users\franc\models\llama.cpp-src\b11575`:
  `git clone --depth 1 --branch b11575 --filter=blob:none --no-checkout https://github.com/ggml-org/llama.cpp.git b11575`, depois
  `git sparse-checkout init --no-cone` com `/convert_hf_to_gguf.py`, `/conversion/`, `/gguf-py/`, `/LICENSE` e `git checkout b11575`.
  É código baixado: só o conversor roda, sobre os pesos, com `python -E -s` (precisa da própria pasta no `sys.path` para o pacote `conversion/`) e `cwd` fora dela.
- **`llama-quantize.exe`** oficial da mesma tag em `C:\Users\franc\models\llama.cpp\b11575` (ver `tools/benchmark_ia/README.md`).
- **Windows acordado** durante o treino: `pwsh -NoProfile -File tools/benchmark_ia/acordado.ps1` (apague `tools/benchmark_ia/out/acordado.on` no fim).
- O Controle de Aplicativo do Windows (WDAC) bloqueia DLLs não assinadas: `pyarrow/arrow_dataset.dll` (o `treinar_nlu.py` esconde o
  pacote `datasets`, não usado, do Trainer) e **o triton** — logo nada de `flash-linear-attention`/`causal-conv1d`/`torch.compile`: o Gated
  DeltaNet treina na implementação em PyTorch puro. Não pedir exclusão nem mudar a política.
- No Windows não há `expandable_segments`; com lote 4 use `--pad_fixo 160` (formas constantes, sem fragmentação da VRAM).

## Rodar (da raiz; `PY` = Python do ambiente de treino)
| Etapa | Comando | Saída |
| :-- | :-- | :-- |
| treino-teste (200 passos) | `$PY -I -u ia/treino/treinar_nlu.py --max_steps 200 --out ia/treino/out/nlu-qwen35-2b-teste` | `final/` (LoRA + `train_meta.json`), `medicoes.json` |
| treino completo (3 épocas) | `$PY -I -u ia/treino/treinar_nlu.py --epochs 3 --batch_size 4 --grad_accum 4 --pad_fixo 160 --out ia/treino/out/nlu-qwen35-2b` (~3,3 h; se faltar VRAM: lote 2 × 8 sem `--pad_fixo`, ~5,9 h) | idem |
| mesclar + GGUF | `$PY -I ia/treino/exportar_gguf.py --lora <out>/final --out <out>/gguf [--q8]` | `mesclado/`, `*-bf16.gguf`, `*-Q4_K_M.gguf` (`*-Q8_0.gguf`) |
| latência CPU comparada | `$PY -I ia/treino/latencia_cpu.py --n 30 --gguf v2.3=<gguf> --gguf novo=<gguf>:qwen35` | prompt / livre / gramática, p50 e p90 |
| avaliar (gate, CPU) | `$PY -I ia/treino/avaliar_gguf.py --app quimica\|eleicoes --gguf <gguf> --threads 8 [--holdout] [--sem_livre] [--baseline <eval_q8.json>] --out <out>/eval_<app>_q4.json` | métricas do `eval_golden` **do app** (golden com/sem gramática e, com `--holdout`, os casos reservados de `ia/corpus/out/holdout_<app>.json`), tudo também **por idioma**, template, latência, `<think>`; um processo por app |
| empacotar para o app | `$PY -I ia/treino/empacotar_versao.py --app quimica --version nlu-v3.1-AAAAMMDD --gguf <Q4_K_M.gguf> --eval <out>/eval_quimica_q4.json --eval-q8 <out>/eval_quimica_q8.json --train-meta <out>/final/train_meta.json --origem "..."` | `apps/quimica/ai_model/output/gguf/<versão>/{model-Q4_K_M.gguf, meta.json, eval.json}` no formato que `backend/modal/promover.py` lê (`passed` = gates do app + por idioma + template + `<think>`; `prompt_suffix` do Qwen3.5); não publica nada |

Receita (igual à do v2.3, só muda a base e o template): QLoRA 4-bit NF4 com dupla quantização, LoRA r=16, alpha=32, dropout 0,05 em
**todas as lineares** (atenção cheia `q/k/v/o_proj`, Gated DeltaNet `in_proj_qkv/z/a/b` e `out_proj`, MLP `gate/up/down_proj`),
lote 2 × acúmulo 8, lr 2e-4 cosseno com 25 passos de aquecimento, `max_length` 256, `paged_adamw_8bit`, gradient checkpointing, bf16.
Carrega só a parte de linguagem (`Qwen3_5ForCausalLM`; visão e MTP do checkpoint ficam de fora).

## Continuação de um treino (correção dirigida, sem repetir as 7,6 h)
Quando o gate reprova por um padrão que falta no corpus, corrige-se o gerador, remonta-se o corpus e treina-se **a partir do LoRA já
treinado** só com o que mudou mais uma amostra de revisão:

| Etapa | Comando |
| :-- | :-- |
| guardar o corpus anterior | `mkdir ia/corpus/out/v3 && cp ia/corpus/out/{train,val}.json ia/corpus/out/v3/` (antes de remontar) |
| mistura novos + revisão | `$PY -I ia/treino/misturar_continuacao.py --novo ia/corpus/out/train.json --antigo ia/corpus/out/v3/train.json --out <out>/train_cont.json --revisao 1.2` |
| continuar o LoRA | `$PY -I -u ia/treino/treinar_nlu.py --dataset <out>/train_cont.json --lora_init <treino anterior>/final --lr 1e-4 --epochs 1 --batch_size 2 --grad_accum 8 --out <out>` |
| repontuar sem gerar | `$PY -I ia/treino/repontuar_eval.py --app quimica --eval <out>/eval_quimica_q4.json --out <out>/eval_quimica_q4_repontuado.json` (quando só o avaliador do app mudou) |

`--lora_init` carrega o adaptador com `PeftModel.from_pretrained(..., is_trainable=True)` (r/alpha vêm do `adapter_config.json`); o
agendamento de lr recomeça (cosseno, 25 passos de aquecimento). A revisão é estratificada por app e idioma na proporção do corpus atual,
só com exemplos que o LoRA já viu com o mesmo rótulo; rótulos que mudaram entram como novos.

## Gate do NLU único
O mesmo GGUF é avaliado com o `eval_golden` e a gramática de produção de **cada app** (`--app quimica` e `--app eleicoes`), no golden e no
holdout que nunca treinou, e o resultado é recortado por idioma (`idioma` do caso; ausente = pt-BR). Limiares (iguais nos dois apps):
JSON com gramática 100 %, validade nativa sem gramática ≥ 98 %, intenção ≥ 85 %, cada entidade ≥ 90 %, alucinação ≤ 5 %, queda Q4 × Q8 ≤ 3 p.p.
Cadeia completa (≈ 1,5 h em CPU): química Q4 com holdout → eleições Q4 com holdout → Q8 dos dois só no golden (`--sem_livre`, referência
da quantização). Resultado do v3: `docs/PLANO_IA_SAIBATUDO.md` §9.

Testes desta pasta (partes puras do empacotador): `$PY -I -m unittest discover -s ia/treino -t ia/treino -p "test_*.py"`.

## Publicar no app (química primeiro)
O GGUF aprovado vai ao app pelo caminho do próprio app, nunca daqui: `empacotar_versao.py` (acima) e depois, dentro de `apps/quimica`,
`modal volume put` dos três arquivos, `modal deploy backend/modal/nlu_app.py`, `backend/modal/promover.py --version <versão>` e as variáveis
na Vercel (`docs/MODELO.md` §13 do app). O ponteiro do Volume carrega `prompt_suffix` (o bloco de raciocínio vazio do Qwen3.5) e `nlu_app.py`
o acrescenta a `build_prompt()`: treino, gate e serviço montam o mesmo prompt. Eleições: só depois de 27/10, pelo `convert_gguf.py` de lá.

## Formato do prompt (treino = serviço)
Template do Qwen3.5 com `enable_thinking=False` (no Qwen3.5 também é o padrão quando a variável não é passada):

```
<|im_start|>system\n{nlu_core.SYSTEM_PROMPT_V2}<|im_end|>\n<|im_start|>user\n{pergunta}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n{JSON}<|im_end|>\n
```

O serviço monta exatamente `nlu_core.build_prompt(pergunta, "v2") + "<think>\n\n</think>\n\n"` e gera com a gramática v2 e parada em
`<|im_end|>`. `avaliar_gguf.py` confere que o template gravado no GGUF, o do tokenizer HF e essa string são idênticos (e a tokenização).

## v3.4 (16–17/10/2026): multi-turno, comparação ancorada e conceitos — APROVADO e PUBLICADO na química em 17/10
Registro completo em `ia/treino/out/nlu-v34-cont/` (corpus.log, train_cont.resumo.json, treino.log, medicoes.json, eval_*.json/log,
baseline_v33_*.json, empacotar.log). Corpus: `ia/corpus/out/v34/` (ver `ia/corpus/README.md`, seção v3.4).

- **Corpus** (`montar_corpus.py --out ia/corpus/out/v34 --escala-v34 0.69`): 74.435 pares (treino 68.630, val 2.662, holdout 3.143); química
  69,9 % do treino. Novos: multi-turno 1.417 de treino + 135 reservados (5 idiomas), COMPARAR +~1.580 (3.359 no treino), CONCEITO pt 2.366 no
  treino (meta 2.000), RECUSA_PERIGO 1.630 (sem gerador novo). Holdouts novos: `holdout_v34_{multiturno,comparar,conceito,revisor}.json`
  (135 / 129 / 73 / 89). O holdout base da química (2.371) difere do v3.3 (2.395) só pela normalização `=>` → `→` de 14/10.
- **Treino:** continuação do LoRA v3.3 (`--lora_init ia/treino/out/nlu-v33-cont/final --lr 1e-4 --epochs 1 --batch_size 2 --grad_accum 8`),
  16.065 pares (`misturar_continuacao.py --revisao 2.0 --peso-app eleicoes2026=2.5`: 4.057 novos + 12.008 de revisão, 6.491 das eleições),
  1.005 passos em 1 h 38 min, perda 0,0102 → 0,0015, máx. 245 tokens (nenhum truncado).
- **Gate (Q4_K_M, CPU 8 threads):** química golden **777** (o contrato ganhou 54 casos desde o v3.3) intenção 98,5 % (v3.3 no mesmo golden:
  98,3 %), elemento 98,6, composto 98,7, propriedade 98,0, equação 100, unidadeDestino 97,7, alucinação 0, JSON 100 % / 99,4 % sem gramática,
  5 idiomas ok; holdout 2.371: 99,6 %; Q8 = Q4 (98,5 %); sem `<think>`; template = serviço. Holdouts novos (meta 90 %): multi-turno 99,3 %
  de intenção (v3.3: 84,4 %; quantidades 50 % → 100 %), comparar 100 %, conceito 100 %, revisor 100 % (propriedade 84,8 % → 100 %).
  Eleições: golden 97,4 % (v3.3: 95,6 %), holdout 97,0 % (96,8 %); o gate de lá segue reprovado pelo MESMO caso do v3.3 (cargo em
  "deputado mais votado") — publicação de eleições só depois de 27/10. A catraca automática do empacotador foi ignorada (golden mudou de 723
  para 777); a comparação manual no mesmo golden está acima.
- **Pacote:** `apps/quimica/ai_model/output/gguf/nlu-v3.4-20261017/` (`passed: true`). **Publicado na química em 17/10/2026 (~05h, horário de Brasília):** `modal volume put` ×3 no Volume `SaibaTudoIA-Models-Quimica`, `promover.py --version nlu-v3.4-20261017` (ponteiro `current.json` com sha256 `7797…f62c`), `modal deploy` do `nlu_app.py` (precisou de mudança no código — `SNAPSHOT_EPOCH` — porque o snapshot de memória guardava o v3.3 carregado), `MODEL_VERSION` na Vercel e `vercel deploy --prod`. Ao vivo: `/quimica/api/health` → `model nlu-v3.4-20261017`; 5 perguntas pelo `/quimica/api/nlu` certas (de MASSA_MOLAR "Kochsalz" → CID 5234; pt COMPARAR F/eletronegatividade; pt CONCEITO "o que é um sal?"; en pedido perigoso → RECUSA_PERIGO por regra; fr "formule brute de l'acide acétique" → NOMENCLATURA + CID 176, o único desvio do golden); fria 22,1 s (cria o snapshot), quente 2,3–3,8 s. O `contexto` multi-turno ainda não é enviado por serviço nem clientes (onda 3); sem contexto o modelo se comporta como o v3.3 ou melhor.
- **Contexto implementado e publicado em 17/10 (~06h)** em serviço (`nlu_core.montar_entrada`/`validate_contexto`/`build_user_message`, `nlu_app.py`), proxy (`api/_lib/contexto.js`, `validate.js`, `normalize.herdadaDoContexto`, `nlu-handler.js`), site (`nuvem.js` `ehContinuacao`/`contextoParaNuvem`) e Android (`ContextoNuvem.kt`, 1.0.2); `ia/corpus/test_contexto_nlu.py` confere que o serviço e este módulo produzem a mesma string e que os 135 contextos do holdout passam na validação do proxy. O plano original era: (formato em `ia/corpus/contexto_nlu.py`): (1) `nlu_core.build_prompt`
  aceitar `contexto` e montar a mensagem do usuário como `contexto: <format_output(contexto)>\n<pergunta limpa>` (validar o contexto com
  `has_valid_shape` e serializar com `format_output`; a pergunta continua passando por `validate_question` sozinha — ela junta linhas);
  (2) `nlu_app.py` e o proxy (`api/_lib/nlu-handler.js`) aceitarem `{q, v, contexto}`, com o contexto entrando na chave do cache;
  (3) a ancoragem do proxy (`ground.js`/`normalize.js`) aceitar entidade herdada do contexto (hoje exige o composto no texto da pergunta);
  (4) site e Android mandarem a interpretação da pergunta anterior (o JSON do NLU, composto como texto, não o CID) só em perguntas de
  continuação. Sem contexto o modelo se comporta como o v3.3 (golden e holdout acima); foi assim que ele entrou no ar.
- **Vazamento corrigido depois do gate:** o golden ganhou em 16/10 (f2ce884) o caso fr "Qu'est-ce que la stœchiométrie ?", que já era um exemplo de treino desde o v3.3 (`test_nenhum_caso_de_teste_no_treino` reprovava). O caso do golden foi reescrito para "Explique-moi ce qu'est la stœchiométrie" (o treino não muda; o golden deixa de medir um exemplo visto). Regra: rodar `python -m pytest ia/corpus` depois de mexer no golden de qualquer app.

## v3.5 (treino iniciado em 18/10/2026, 02h52): calculadoras, famílias de superfície, ΔGf°/S°/partículas
Corpus: `ia/corpus/out/v35/` (`ia/corpus/README.md`, seção v3.5; montagem final de 18/10 com teto pt 760 e piso por propriedade 25/6): 74.935 pares, treino 68.388 (química 69,8 %), ids novos `energiaGibbsFormacaoKJmol`, `entropiaPadraoJmolK`, `particulas` e Kc sem equação → CONCEITO (contrato de 18/10, `apps/quimica/docs/CALCULADORAS_2026-10-17.md` §7), NOX/ENTALPIA/EQUILIBRIO/LIGACAO
~0,9–1,1 mil cada no treino (5 idiomas), `entalpiaFormacaoKJmol`, notação científica, números por extenso, estequiometria sem "quantos",
nomenclatura por nome sistemático, misturas, ordenação e pistas de configuração eletrônica; 13 holdouts `holdout_v35_*.json` (536 casos, inclusive `particulas` e os dois lados de `equilibrio`). Treino previsto = **continuação do LoRA
v3.4**, a mesma receita do v3.4 (lr 1e-4, 1 época, lote 2 × 8), com `max_length` 288 (o maior par do corpus tem 258 tokens; com 256 o fim do
JSON seria cortado):

```bash
PY='C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\ai_model\.venv\Scripts\python.exe'
O=ia/treino/out/nlu-v35-cont
"$PY" -I ia/treino/misturar_continuacao.py --novo ia/corpus/out/v35/train.json --antigo ia/corpus/out/v34/train.json \
  --out $O/train_cont.json --revisao 0.3 --peso-app eleicoes2026=2.5
"$PY" -I -u ia/treino/treinar_nlu.py --dataset $O/train_cont.json --lora_init ia/treino/out/nlu-v34-cont/final \
  --lr 1e-4 --epochs 1 --batch_size 2 --grad_accum 8 --max_length 288 --out $O
```
Mistura real (18/10, `ia/treino/out/nlu-v35-cont/train_cont.resumo.json`): 28.304 "novos" + 15.056 de revisão = 43.360 pares
(21 rótulos mudados: os moldes "quantos prótons/elétrons tem X" passaram de `numeroAtomico` a `particulas`), 2.710 passos, ~5 s/passo na
RTX 5060 (estimativa 3 h 50 min; pico 6,1 GiB de VRAM). Roteiro completo em `ia/treino/out/nlu-v35-cont/pipeline.sh` (mistura → treino →
`exportar_gguf.py --q8` → `gate.sh`, com `tools/benchmark_ia/acordado.ps1` impedindo a suspensão). Gate: `gate.sh` da pasta = o do v3.4 com
`H=ia/corpus/out/v35` e `--extra` para os 13 `holdout_v35_*.json` + os holdouts do v3.4 (meta 90 % em cada extra). Antes do treino:
`CORPUS_OUT=ia/corpus/out/v35 python -I -m unittest discover -s ia/corpus -p "test_*.py"` → 43 OK (vazamento golden 984 × treino limpo).
Eleições: só depois de 27/10.
