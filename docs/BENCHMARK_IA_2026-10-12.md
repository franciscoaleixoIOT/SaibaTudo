# Benchmark das bases da SaibaTudo IA — 12/10/2026

> Etapa 1 de [`PLANO_IA_SAIBATUDO.md`](PLANO_IA_SAIBATUDO.md). Ferramenta: [`tools/benchmark_ia/`](../tools/benchmark_ia/README.md)
> (reproduzível, um comando por etapa). Números brutos: `tools/benchmark_ia/out/resumo.json` e `out/tabelas.md`; painel às cegas:
> `out/cegas.md` (chave em `out/cegas_chave.json`). Nada em produção foi alterado (Modal, Vercel, Spaces e `MODEL_VERSION` intactos).

## 1. Resumo e recomendação

| Tarefa | Recomendação | Por quê (em uma linha) |
| :-- | :-- | :-- |
| **SaibaTudo-NLU** (interpretador) | **Qwen3.5-2B** (troca o Qwen3-1.7B do plano); **Qwen3.5-4B** como reserva se o 2B não passar no gate da química em en/es/de/fr | O 2B tem o 2º melhor potencial sem treino (72,6 % de intenção média contra 66,1 % do Qwen3-1.7B), é o mais uniforme nos 5 idiomas (82–85 %) e custa em CPU o mesmo que o Qwen3-1.7B (~0,85 s p50, 8 threads); o 4B é o melhor (76,0 %; química 89–94 % em todos os idiomas), mas é 2× mais lento em CPU e 2,5× maior |
| **SaibaTudo-Explica** (texto com fontes) | **Qwen3-4B-Instruct-2507** (mantém o plano); **Qwen3.5-4B** empatado tecnicamente, como alternativa | Os três primeiros empatam em fidelidade (100 %) e idioma (100 %); o Qwen3-4B-2507 é o mais rápido (1,4 s p50, 88 tok/s), o que menos inventa citação (7 contra 23) e responde sempre no idioma pedido. O Qwen3.5-4B recusa melhor (9/10 contra 7/10), mas é 40 % mais lento e copia o id de exemplo do prompt como citação. Recusa e citação são o que o ajuste de comportamento (etapa 4) vai treinar; latência e tamanho não se treinam |

- **Família:** continua **Qwen (Apache 2.0)**. Nenhum concorrente sem ajuste chegou perto: Granite 3.3, Phi-4-mini e SmolLM3 ficaram
  atrás do Qwen3.5 em intenção, em JSON nativo (76–78 % em média, 52–58 % na química, contra 91–96 %) e em latência de CPU; no explicador o Granite-3.3-8B foi o
  pior (95 % de fidelidade, 5/10 recusas, 7 respostas truncadas, 3,6 s p50).
- **Atenção à comparação:** os candidatos de NLU foram medidos **sem treino** (few-shot com gramática). O v2.3 de produção, ajustado,
  fez 93,9 % (golden) e 96,3 % (holdout); a base dele sem ajuste (Qwen2.5-1.5B) fez 72,8 % e 50,6 % no mesmo teste. Ou seja: o
  benchmark mede o **potencial antes do treino**, a velocidade e o tamanho — não o resultado final. O precedente do v2.3 (+21 a +46 pontos
  com o ajuste) indica que qualquer base acima de ~65 % chega ao gate de 85 % depois do treino; o que decide é custo e multilíngue.
- **O Qwen3.5 muda o plano:** sim, no NLU. O plano (anterior ao Qwen3.5) previa Qwen3-1.7B; o **Qwen3.5-2B** vence o Qwen3-1.7B em tudo
  o que importa (+6,5 pontos de intenção média, +2,5 na química, +6,5 no holdout de eleições, química sem queda fora do português)
  pelo mesmo custo de CPU (+14 ms p50). No explicador não muda a escolha (ver §4). Riscos novos do Qwen3.5 em §7.
- **Pulados:** Gemma 3 1B e 4B (licença não aceita pelo mantenedor — repositórios condicionados, HTTP 403); Tucano-2b4 (saída incoerente
  nos dois runtimes disponíveis; ver §6).

## 2. Como foi medido

- **Máquina e runtime:** RTX 5060 Laptop 8 GB, Windows 11. `llama-server` oficial do llama.cpp **b11575** (build CUDA 13.4), um modelo por
  vez, GGUF **Q4_K_M** (Qwen2.5-7B em Q4_K_M dividido em 2 partes). O `llama-cpp-python 0.3.19` do ambiente de treino foi compilado
  **sem CUDA** (`llama_supports_gpu_offload() == False`) — por isso o binário oficial. Conferido à parte: o 0.3.19 (runtime do Modal)
  **carrega** Qwen3-1.7B, Qwen3.5-4B, Granite-3.3-2B e Qwen3-4B-2507 em CPU; o SmolLM3 falha no template de chat dele (`unknown tag 'generation'`).
- **Fidelidade do avaliador:** o v2.3 neste runtime fez 93,9 % no golden atual (114 casos) e 96,3 % no holdout de 435 — o `eval.json`
  da conversão registrou 93,7 % (111 casos) e 96,8 %. A pontuação é a do gate de produção: `eval_golden.evaluate` de cada app, importado sem cópia.
- **NLU:** golden de eleições (114) + holdout reservado do v2.3 (435) + golden de química (723: pt-BR 145, en 108, es 137, de 150, fr 183).
  Mesmo prompt few-shot para todos (`prompts_nlu.py`: as 21 intenções explicadas em uma linha, vocabulário das entidades e 1 exemplo
  por intenção tirado do **treino**; na química +4 exemplos escritos à mão em en/es/de/fr, conferidos contra o golden). Template de chat
  do próprio GGUF, raciocínio desligado (`enable_thinking=false`), **gramática GBNF de produção** de cada app, decodificação gulosa.
  O v2.3 usa o prompt curto do treino (é ajustado). JSON nativo = amostra sem gramática (40 casos de eleições + 50 de química).
  Latência de CPU = 30 casos por app, 8 threads (como o Modal), com o prefixo do prompt em cache (servidor de pé); o "prompt frio" é a 1ª chamada.
- **Explicador:** 100 prompts + 10 recusas (`casos_explica.py`, determinístico). Química (60): 10 conceitos do holdout do dataset com
  trechos licenciados (mesma seleção do `eval_fidelidade.py`), 5 de segurança GHS e 5 "resuma o elemento X" com o contexto do pacote, e
  10 por idioma en/es/de/fr (6 trechos da Wikipédia no idioma + 4 com contexto em português e pergunta no idioma). Eleições (40):
  contexto **sintético com candidatos e partidos fictícios** (listas, perfis, patrimônio, apuração, 2º turno, contagens, pesquisas,
  contas, regras), 10 pedindo "cite a fonte". Prompts de sistema **de produção** (química: `ask_core.ASK_SYSTEM_PROMPT`, só a frase do
  idioma muda; eleições: `nlu_core.ASK_SYSTEM_PROMPT`), temperatura 0, `repeat_penalty` 1,05.
  Métricas: fidelidade numérica (química: `ask_core.numeros_sem_fonte`; eleições: porte de `numerosNaoFundamentados`), idioma
  (palavras funcionais + marcas ortográficas; resposta curta só com números fica "indeterminada" e fora da média), citação, recomendação,
  recusas (5 pedidos de recomendação do golden de eleições; 5 pedidos perigosos de `seguranca_cases.json`, um por idioma).

## 3. NLU (interpretador) — resultados

Ordenado pelo critério pedido: intenção média (eleições golden + holdout + química), depois entidade, JSON nativo e CPU.

| Modelo | Intenção média | Eleições golden | Eleições holdout | Química (5 idiomas) | Entidade média | JSON nativo | CPU p50 / p90 (ms) | CPU prompt frio | GGUF | VRAM pico |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| *v2.3 produção (ajustado)* | *95,1 %* | *93,9 %* | *96,3 %* | — | *99,5 %* | *100 %* | *518 / 687* | *0,6 s* | *940 MB* | *1,2 GB* |
| **Qwen3.5-4B** | **76,0 %** | **75,4 %** | 61,6 % | **91,0 %** | **84,6 %** | 96 % | 1674 / 2594 | 18,0 s | 2614 MB | 3,0 GB |
| **Qwen3.5-2B** | 72,6 % | 73,7 % | 60,5 % | 83,7 % | 75,4 % | 91 % | 846 / 1161 | 7,8 s | 1222 MB | 1,5 GB |
| SmolLM3-3B | 69,8 % | 66,7 % | **67,6 %** | 75,2 % | 71,0 % | 76 % | 1345 / 2206 | 16,7 s | 1827 MB | 2,3 GB |
| Phi-4-mini | 66,9 % | 69,3 % | 54,5 % | 77,0 % | 79,2 % | 76 % | 1508 / 2134 | 16,2 s | 2376 MB | 3,1 GB |
| Qwen3-1.7B | 66,1 % | 63,2 % | 54,0 % | 81,2 % | 80,6 % | **96 %** | 832 / 1370 | 9,1 s | 1056 MB | 1,7 GB |
| Qwen2.5-1.5B (base do v2.3) | 64,7 % | 72,8 % | 50,6 % | 70,7 % | 67,7 % | 94 % | 630 / 1076 | 8,1 s | 1066 MB | 1,2 GB |
| Granite-3.3-2B | 63,9 % | 69,3 % | 49,0 % | 73,3 % | 73,5 % | 78 % | 1318 / 2199 | 17,6 s | 1474 MB | 2,0 GB |
| Qwen3.5-0.8B (extra, NLU-mini) | 57,8 % | 59,6 % | 44,8 % | 69,0 % | 64,1 % | 84 % | **493 / 719** | 3,7 s | 508 MB | 0,7 GB |

Química por idioma (intenção):

| Modelo | pt-BR | en | es | de | fr | elemento | composto* | propriedade |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| Qwen3.5-4B | 93,8 % | 90,7 % | 91,2 % | 89,3 % | 90,2 % | 96,6 % | 64,5 % | 89,7 % |
| Qwen3.5-2B | 84,1 % | 83,3 % | 81,8 % | 84,7 % | 84,2 % | 84,5 % | 61,5 % | 67,2 % |
| Qwen3-1.7B | 82,1 % | 80,6 % | 85,4 % | 80,0 % | 78,7 % | 76,4 % | 58,5 % | 64,7 % |
| SmolLM3-3B | 82,1 % | 75,9 % | 73,0 % | 74,7 % | 71,6 % | 82,4 % | 63,0 % | 67,2 % |
| Phi-4-mini | 80,7 % | 76,9 % | 75,9 % | 75,3 % | 76,5 % | 89,2 % | 57,4 % | 75,0 % |
| Qwen2.5-1.5B | 77,2 % | 73,1 % | 71,5 % | 65,3 % | 67,8 % | 52,7 % | 51,3 % | 45,7 % |
| Granite-3.3-2B | 76,6 % | 74,1 % | 71,5 % | 73,3 % | 71,6 % | 77,0 % | 58,5 % | 79,3 % |

\* `composto` do golden é um CID, traduzido pelos nomes do pacote (em português e fórmulas); nome em inglês/alemão digitado pelo usuário
("benzene", "Benzol") nem sempre casa — o teto desta coluna é baixo para todos e ela não discrimina bem os modelos.

Leituras:
- **Eleições, holdout:** os erros sem treino são de **convenção do projeto**, não de entendimento: "Como melhorar saúde?" ou "Quem
  representa continuidade?" são `LISTAR_CANDIDATOS` (com `tema`) no contrato, e os modelos dizem `DESCONHECIDA`; `turno` quase nunca
  é preenchido sem treino (13–35 % no Phi/Granite/Qwen3.5). É exatamente o que o ajuste ensina (o v2.3 faz 100 %).
- **Alucinação de entidade** (holdout de eleições, pior entidade): 0,6 % no Qwen3.5-4B; 13–30 % nos demais (preenchem `cargo`/`uf`
  onde o contrato exige ausência). Na química as amostras de casos `null` são pequenas (5–6 casos) e não permitem comparar.
- **`<think>`:** nenhum vazamento de raciocínio com `enable_thinking=false` (o llama-server ecoa o bloco vazio que o template do Qwen3
  pré-preenche; não é gerado e não conta).
- **Latência:** com o prefixo em cache, o custo por pergunta em CPU é parecido com o do prompt curto do v2.3 (Qwen3-1.7B e Qwen3.5-2B
  ~0,85 s; v2.3 0,5 s). O "prompt frio" de 8–18 s só existe no few-shot — o modelo treinado volta ao prompt curto (~100 tokens).

## 4. Explicador — resultados

Ordenado por fidelidade, idioma, recusas e latência (GPU, 110 prompts cada).

| Modelo | Fiel (números) | Idioma | Cita fonte | Citação inventada | Recusas (eleições / química) | Tokens | tok/s | ms p50 | GGUF | VRAM pico |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Qwen3.5-4B | 100 % | 100 % | 95,5 % | 23 | **9/10** (4/5 · 5/5) | 150 | 80 | 2013 | 2,6 GB | 3,0 GB |
| *Qwen2.5-7B (atual, Q4)* | *100 %* | *100 %* | *97,7 %* | *23* | *8/10 (4/5 · 4/5)* | *84* | *61* | *1350* | *4,5 GB* | *4,7 GB* |
| **Qwen3-4B-Instruct-2507** | 100 % | 100 % | **100 %** | **7** | 7/10 (4/5 · 3/5) | 135 | **88** | 1434 | 2,4 GB | 3,2 GB |
| Qwen3-8B | 99 % (1 violação) | 98,9 % | 100 % | 12 | 7/10 (5/5 · 2/5) | 122 | 58 | 2261 | 4,8 GB | 5,3 GB |
| Granite-3.3-8B | 95 % (8 violações) | 100 % | 100 % | 21 | 5/10 (2/5 · 3/5) | 201 | 56 | 3622 | 4,7 GB | 5,2 GB |

- **Fidelidade quase saturada:** com o prompt de produção e decodificação gulosa, os Qwen não inventaram número nenhum nos 100 prompts;
  só o Granite (8 números, sobretudo em francês/alemão) e o Qwen3-8B (1: "26,98" para 26,9815384 u — arredondamento). A métrica
  continua no gate, mas não separa os três primeiros.
- **Recusas:** nos Qwen, todas as respostas aos pedidos de recomendação foram **neutras** (nenhuma recomendou; no Granite o detector marcou 1 de 5); o que varia é a recusa explícita.
  Na química, as falhas são respostas do tipo "a informação não está nos trechos" (sem recusar e, no Granite em alemão, com conteúdo
  sobre a proporção pedida) — exatamente o comportamento que o treino de recusas (contratos em 5 idiomas) vai fixar. Lembrete: em
  produção a regra da API barra esses pedidos **antes** do modelo; aqui o modelo foi medido sozinho, de propósito.
- **Citação inventada:** quando não há trecho (só contexto), vários modelos copiam o id **de exemplo** do prompt da química
  (`[openstax-chem2e-3.1-001]`: 75 vezes no Qwen3.5-4B, 30 no Qwen2.5-7B, 22 no Granite) ou escrevem `[contexto]`. É um defeito do
  prompt + falta de treino, não da base: ver §8.
- **Idioma:** todos responderam no idioma pedido, inclusive com contexto em português e pergunta em en/es/de/fr; únicas exceções: Qwen3-8B
  (1 resposta em português a uma pergunta em espanhol) e Granite (1 recusa em português/espanhol misturados).
- **Painel às cegas:** `tools/benchmark_ia/out/cegas.md` — 20 prompts (10 química, 2 por idioma; 10 eleições) com Qwen2.5-7B ×
  Qwen3.5-4B (1º do ranking automático) em ordem sorteada. Para comparar com o Qwen3-4B-2507, rode
  `python -I tools/benchmark_ia/cegas.py --candidato qwen3-4b-2507` (as respostas já estão gravadas).

## 5. Licenças e marca "SaibaTudo"

| Base | Licença (model card) | Pode chamar o derivado de "SaibaTudo IA"? |
| :-- | :-- | :-- |
| Qwen2.5 / Qwen3 / Qwen3-2507 / **Qwen3.5** (0.8B, 2B, 4B) | Apache 2.0 | **Sim.** Exige manter a licença e os avisos (NOTICE/atribuição no *model card*), não o nome da base no produto |
| Granite 3.3 (2B, 8B) | Apache 2.0 | Sim (mesmas condições) |
| SmolLM3-3B | Apache 2.0 | Sim |
| Phi-4-mini | MIT | Sim (manter o aviso de copyright/licença) |
| Tucano-2b4 | Apache 2.0 | Sim |
| Gemma 3 (1B, 4B) | Gemma Terms of Use + Prohibited Use Policy | Nome livre, mas os termos e a política de uso proibido **acompanham todo derivado** e têm de ser repassados aos usuários; o acesso exige aceitar a licença na conta (não aceito → não medido) |

Os GGUF Qwen3/Qwen3.5 usados são da **Unsloth** (o repositório oficial `Qwen/Qwen3-1.7B-GGUF` só tem Q8_0 e não existe `Qwen/Qwen3.5-*-GGUF`);
os pesos são os mesmos da Qwen. Para o treino (etapas 3–4) parte-se dos safetensors oficiais `Qwen/...`, não do GGUF.

## 6. O que ficou de fora e por quê

- **Gemma-3-1B-it e Gemma-3-4B-it:** `google/gemma-3-*-it-qat-q4_0-gguf` respondeu **HTTP 403** — licença não aceita pelo mantenedor.
  Existem espelhos sem bloqueio (ex.: Unsloth), mas aceitar os termos da Gemma é decisão do mantenedor (plano §2/§9), então não foram usados.
  Para medir: aceitar a licença em huggingface.co/google/gemma-3-4b-it e rodar `baixar.py --so gemma-3-1b,gemma-3-4b` + as etapas.
- **Tucano-2b4-Instruct:** não há GGUF Q4_K_M de quantizador conhecido; o convertido aqui (do safetensors oficial, `convert_hf_to_gguf`
  b11355 + `llama-quantize`) e o de terceiro (`GuilhermeAumo/...-Q4_K_M-GGUF`) geram texto incoerente até para "Qual é a capital do
  Brasil?" e dão erro de tokenizador (`invalid unordered_map<K, T> key`) nos prompts longos; pelo transformers 5.17 (bf16, pesos
  oficiais, `tools/benchmark_ia/tucano_hf.py`) a saída também é incoerente. Provável incompatibilidade do tokenizador do Tucano com essas
  versões; ficou sem número. Como o Tucano só serviria às eleições (só pt) e o Qwen3.5 já é forte em pt, não vale mais esforço agora.
- **Qwen3.5-2B e Qwen3.5-0.8B** não estavam na lista e **foram acrescentados** (mesma família do Qwen3.5-4B; 2B no tamanho do Qwen3-1.7B,
  0.8B como candidato ao NLU-mini embarcado).
- Nenhum modelo precisou de redução de casos: todos rodaram 100 % dos conjuntos.

## 7. Custos e surpresas

- **Tempo de medição:** 79 min de GPU/CPU no total (NLU GPU 1–8 min por modelo; CPU 0,3–2,4 min; explicador 2,8–7 min por modelo),
  mais ~15 min nas tentativas do Tucano; ~2 h de relógio com downloads.
- **Disco:** 31,4 GB de GGUF novos no cache do Hugging Face + 0,7 GB do llama.cpp em `C:\Users\franc\models\`; o Tucano ocupou mais
  12 GB (safetensors oficiais 9,2 GB, GGUF de terceiro 1,4 GB, GGUF convertido 1,4 GB) e **pode ser apagado** sem perda.
- **Surpresas:**
  1. O 7B atual roda **inteiro na GPU de 8 GB** em Q4_K_M (4,7 GB de pico) a 60 tok/s — mais rápido que o Qwen3.5-4B (80 tok/s, mas
     respostas 80 % mais longas).
  2. O Qwen3.5-4B, sem treino, já interpreta química em alemão/francês a ~90 % — mais que o Qwen3-1.7B em português.
  3. O verificador de produção das eleições (`respostaRecomenda`) **descartaria** respostas corretas: as recusas ("Não posso
     recomendar candidatos") e "Estes documentos são aceitos para **votar no** 1º turno" casam com a regex de recomendação. Hoje não
     afeta usuários (pedidos de recomendação são barrados antes do modelo e a regra do 1º turno quase não aparece), mas é um falso
     positivo real — anotar para depois de 27/10 (congelamento).
  4. O `llama-cpp-python 0.3.19` do ambiente de treino não tem CUDA (só CPU); serve para o gate, não para benchmark de GPU.
- **Riscos do Qwen3.5 (arquitetura híbrida, atenção + Gated DeltaNet, checkpoint multimodal):** o transformers 5.17 do ambiente já tem
  `qwen3_5`, mas faltam `flash-linear-attention` e `causal-conv1d` (sem eles o treino usa a implementação lenta em PyTorch); o cache de
  prefixo no llama.cpp é menos eficiente em camadas recorrentes. Fazer um treino-teste curto (200 passos) antes de comprometer a etapa 3.

## 8. Próximos passos sugeridos

1. **Etapa 3 com Qwen3.5-2B** (`Qwen/Qwen3.5-2B`, LoRA → GGUF Q4_K_M): treino-teste curto para medir VRAM/tempo sem os kernels
   lineares; se ficar inviável, voltar ao Qwen3-1.7B (o custo de CPU é o mesmo, perde ~6 pontos de potencial). Reserva: Qwen3.5-4B se
   a química em en/es/de/fr não passar no gate (o dataset de NLU da química é só em português; o 4B é o que menos depende de treino
   para os outros idiomas), aceitando o dobro de CPU no Modal (e `MEMORY_MIB` maior que os 3072 de hoje).
2. **Etapa 4 com Qwen3-4B-Instruct-2507**; refazer este benchmark do explicador com o Qwen3.5-4B depois do primeiro treino, se o
   painel às cegas preferir o Qwen3.5.
3. **Prompt da química:** trocar o id de exemplo da regra 3 por um marcador que não pareça id real (ou citar só "quando houver trechos")
   e incluir no treino exemplos sem trecho que não citam nada.
4. **Painel às cegas:** o mantenedor preenche `out/cegas.md` (20 itens) antes de abrir `cegas_chave.json`.
5. Gemma: só se o mantenedor aceitar a licença (os números do Qwen3.5 tornam improvável uma vitória "por ≥ 3 pontos" que justifique o custo de licença).
