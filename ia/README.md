# SaibaTudo.IA

IA própria dos apps SaibaTudo (nome dado pelo mantenedor). Plano completo em
[`docs/PLANO_IA_SAIBATUDO.md`](../docs/PLANO_IA_SAIBATUDO.md); escolha das bases em
[`docs/BENCHMARK_IA_2026-10-12.md`](../docs/BENCHMARK_IA_2026-10-12.md).

Um **interpretador (NLU) único para todos os apps** (base Qwen3.5-2B): em produção a função `nlu` recebe `app` (+ `idioma`) e
escolhe o system prompt e a gramática do app; o modelo é um só. O texto gerado ("explica") vem depois.

| Pasta | O que tem |
| :-- | :-- |
| [`corpus/`](corpus/README.md) | Etapa 2: corpus único de treino do NLU (eleições pt-BR + química em pt-BR/en/es/de/fr), holdouts e contagens. |
| [`treino/`](treino/README.md) | Etapa 3: treino QLoRA, exportação GGUF e avaliação local. |
| `gate/` (futuro) | Gate por app e idioma antes de publicar (catraca contra o modelo em produção de cada app). |

Regras que valem aqui: treino sempre local; saídas (`*/out/`) fora do Git; nenhum segredo; nada de `LivrosQuimica`; os golden e
holdouts dos apps são **teste**, nunca treino; eleições não muda de modelo antes de 27/10/2026 (congelamento 24–26/10).
