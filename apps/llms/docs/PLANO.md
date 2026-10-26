# Plano do SaibaTudo LLMs (subprojetos)

Decisões do mantenedor (25/10/2026): app de código aberto no padrão da química, seis idiomas (com chinês, também na home), base **Qwen3**
para a IA do app e para a demonstração, gráfico 3D em Canvas 2D próprio, nuvem opt-in já no S1, Android depois do site, nenhuma referência
ao vídeo que motivou o app (conteúdo próprio), preset "países e líderes" com nota histórica.

| Sub | Conteúdo | Estado |
| :-- | :-- | :-- |
| **S1** | `apps/llms/`: PWA, i18n em 6 idiomas, pacote GloVe assinado (100 k, int8), explorador 3D (variância/PCA), aritmética de vetores, vizinhos, produto escalar, assistente por regras, seis seções próprias, IA na nuvem opt-in (Qwen3-4B em Space), workflows, projeto Vercel. Domínio e home em zh em 27/10. | em execução (spec `docs/superpowers/specs/2026-10-25-saibatudo-llms-s1-design.md`, plano `…/plans/2026-10-25-saibatudo-llms-s1.md`) |
| S2 | Tokens: tokenizador do Qwen3 no navegador (BPE a partir do `tokenizer.json`): texto → tokens, ids, contagem; "palavra ≠ token" em pt e zh. | a desenhar |
| S3 | O modelo por dentro: Space de **CPU** com o Qwen3-0.6B e rota `/llms/api/modelo`: embeddings por camada no mesmo explorador, mapas de atenção por camada/cabeça, logits do próximo token; softmax e temperatura no navegador. | a desenhar |
| S4 | SaibaTudo IA no app: NLU único (Qwen3.5-2B) e explicador treinado (Qwen3-4B) substituem a base pura, pelo ciclo normal de gate (`../../docs/PLANO_IA_SAIBATUDO.md`). | depois do S1 |
| S5 | Android (`net.saibatudo.llms`), reaproveitando contratos e léxico. | depois do S3 |

## Critérios de sucesso do S1
1. Pacote assinado ≥ 100 000 palavras; vizinhos float × int8 iguais em 50 palavras-amostra (teste do pipeline).
2. Projeção testada; gráfico sem erro de console nem violação de CSP (e2e no Chrome, celular e desktop).
3. Golden do NLU ≥ 30 casos por idioma a 100 %; catálogos com as mesmas chaves; nenhuma string fixa em português.
4. `/llms/api/ask` responde no idioma com o rótulo do modelo; verificador rejeita número fora do contexto; teste ao vivo em pt, en e zh.
5. Offline após a primeira visita.
6. Publicado em `saibatudo-llms.vercel.app/llms/` com health ok; em 27/10, `saibatudo.net/llms/` e cartão na home em 6 idiomas.

## Pendências conhecidas (S1)
- Revisão por falante nativo das traduções (en/es/de/fr/zh) — catálogos, léxicos, conteúdo, política.
- Space e projeto Vercel: criados na fase de publicação (Task 18); `HF_TOKEN`, `DATA_SIGNING_KEY_LLMS`, `VERCEL_PROJECT_ID_LLMS` só o mantenedor grava.
- Android (S5) e o explorador com vetores de contexto (S3).
