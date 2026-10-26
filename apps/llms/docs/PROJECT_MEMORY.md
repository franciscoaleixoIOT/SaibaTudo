# PROJECT_MEMORY — SaibaTudo LLMs

Memória viva do app (o que não está no código nem no histórico do Git): decisões, estado, pendências. Atualizar a cada mudança de estado.
Guia do app: `../CLAUDE.md`. Plano e spec do S1 na raiz do repositório (`docs/superpowers/`).

## 1. Decisões do mantenedor
- **25/10/2026:** criar o SaibaTudo LLMs, código aberto, padrão da química, com as mesmas traduções **mais chinês** (também na home). Objetivo:
  projeções 3D interativas dos vetores do `glove-wiki-gigaword-50`, escolhendo as 3 dimensões mais informativas das palavras selecionadas.
  Escolhas: capítulo inteiro dividido em S1–S5; S1 primeiro; **3 dimensões originais por variância + PCA opcional**; **Canvas 2D próprio**;
  **Qwen3** como base (Qwen3-4B-Instruct-2507 na nuvem do S1; Qwen3-0.6B em Space de CPU no S3); Android depois do site; **nuvem opt-in já no S1**;
  **nenhuma referência ao vídeo** que motivou o app (conteúdo didático próprio, referências acadêmicas e ao GloVe); preset "países e líderes"
  (Itália − Alemanha + Hitler ≈ Mussolini) incluído com nota histórica; execução do plano em modo nativo.

## 2. Estado (25–26/10/2026)
- S1 implementado no branch `llms-s1` (worktree `SaibaTudo-llms`): Tasks 1–16 do plano. Suíte: web 82 testes, API 19, pipeline 7, contratos 6,
  workflows 7, Space 6; e2e no Chrome (celular claro e desktop escuro) com explorador, assistente, Aprenda, Sobre, zh/de, privacidade e offline.
- **Task 18 (26/10/2026):** pacote real de 100 000 palavras (`data/llms`, versão `20261026T025754Z-2fe6548eff37`) gerado do espelho Zenodo e
  assinado (chave em `secrets/data_signing_key.pem`, pública em `pipeline/data_signing_public.pem`); validado em Node (king − man + woman →
  queen 0,862; italy − germany + hitler → mussolini 0,847; varredura de vizinhos ~5 ms). Fixture dos testes: 360 palavras com vetores reais.
- **Primeiro deploy:** `https://saibatudo-llms.vercel.app/llms/` (projeto Vercel `saibatudo-llms`, `prj_Im2Kc4GkzGtZhjC6PnVUq9nZ5BRy`, deploy
  local com a CLI 62.1.0 e `VERCEL_TOKEN_TIME`). Health `ok`, 100 000 palavras, `ask: off` até o mantenedor gravar `HF_TOKEN`. Página zh
  conferida no navegador.
- **Space `franciscoaleixo/saibatudo-llms`** (privado, ZeroGPU, Qwen3-4B-Instruct-2507): publicado em 26/10 (primeira tentativa caiu num 500
  do HF; a repetição subiu), RUNNING, teste do `publicar.py --teste` ok em pt-BR (6,4 s de GPU) e zh (3,2 s) com rodapé de IA gerada.
- Domínio `/llms/` e home em chinês: **preparados na branch `llms-dominio`** (commit 549cc39: rotas `/llms*` e `/zh*` no `vercel.json` de
  eleições, SW da home, IDIOMAS + zh, `portal/src/portal/i18n/zh.js`, seção `llms` nos seis catálogos, botão, cartão e ícone; testes do portal
  10/10 e da raiz 9/9). **Mergeada na main em 26/10/2026** (1bf75fa2, com `[congelamento-ok]` porque as eleições terminaram em 25/10 e o
  mantenedor autorizou descongelar); `eleicoes-data-refresh.yml` republicou o proxy e `portal-ci.yml` a home. Conferido ao vivo:
  saibatudo.net/llms/ (health ok, 100 000 palavras, SW no escopo /llms/, analogia king − man + woman funciona), saibatudo.net/zh/ (lang zh,
  link `/llms/?lang=zh`, química cai em `en`) e cartão + botão do LLMs na home em pt-BR.

- **Revisão final da branch (26/10/2026, revisor novo em Opus):** 0 críticos, 7 importantes, todos corrigidos com teste RED→GREEN no mesmo dia:
  (1) o verificador só olhava o texto antes do rodapé → agora desconta só a frase do rodapé e confere o resto; (2) resposta da nuvem podia cair sob
  outra pergunta feita enquanto esperava → só anexa se a resposta exibida ainda for a que pediu (e2e com `/llms/api/ask` simulado pelo CDP);
  (3) em chinês as stopwords cortavam 12 termos do glossário (和平, 埃及, 想法…) → concorrência por comprimento; (4) FONTES falhava com o
  vocabulário real ("sources", "fontes" existem no GloVe) → palavras achadas têm de estar dentro do termo; o golden roda também sobre o pacote real
  e revelou mais 15 casos: **o glossário agora vem antes do vocabulário fora do inglês** ("rei" era token do GloVe) e es/fr/de ganharam stopwords
  ("tan", "cerca", "qui", "ins"); (5) política de privacidade descrevia um cache por hash que não existia → chave do cache e iid do limitador
  virados em SHA-256 e texto corrigido nos 6 idiomas; (6) ação `destacar` do assistente não fazia nada → `destacar()` no explorador; (7) maiúsculas e
  acentos eram normalizados em silêncio → aviso "Rei → rei" e "São Paulo" vira sao + paulo. Extra: analogia digitada com palavra do preset
  "líderes" recebe a nota histórica. Menores adiados no ledger (`.superpowers/sdd/…/progress.md`): destaque na cena ao clicar no chip, `remover`
  não limpa analogia, poda de fatias antigas no SW, bundle minificado sem teste no CI, `role` do canvas, `decodeURIComponent` da query.

## 3. Lições
- Outro agente (kilo) comitou na árvore principal durante o S1 e a trocou de branch; o trabalho seguiu num **worktree** próprio.
- O `import gensim` trava com `scipy 1.18.1` nesta máquina: venv com `scipy<1.17`. Processos presos impediram recriar a venv (`.venv` → `.venv2`).
- A ferramenta de shell mutila barras invertidas em heredocs: scripts com regex vão para arquivo e são executados.
- `replaceChildren(null)` cria um nó de texto "null": filtrar os ramos condicionais.
- O upload ao HF Hub pode cair num 500 do servidor no meio: repetir `publicar.py` (idempotente).
- **CRLF quebra assinatura (26/10):** o `manifest.json` gravado no Windows saía com CRLF e era assinado assim; o Git normalizava para LF e o CI no
  Ubuntu rejeitava a assinatura (primeiro CI da main vermelho). Correção: pipeline grava LF (`newline='
'`), `.gitattributes` com `-text` para o
  pacote e a fixture, manifestos re-assinados; deploy 3 com o pacote LF. Regra: bytes assinados nunca passam por conversão de fim de linha.
- A fixture de 360 palavras esconde o que o vocabulário real faz: o GloVe de 100 mil tem "rei", "gato", "sources", "tan"… Rodar o golden também sobre
  `data/llms` (o teste faz isso sozinho quando o pacote existe).
- O e2e persiste o idioma salvo entre cenários (`?lang=zh` → próximo cenário em zh): cada cenário com perguntas em português abre com `?lang=pt-BR`.
- O service worker serve o shell antigo na primeira visita depois de um build: limpar caches ao testar no navegador.

## 4. Pendências
- Mantenedor: `HF_TOKEN` na Vercel `saibatudo-llms`; `DATA_SIGNING_KEY_LLMS` e `VERCEL_PROJECT_ID_LLMS` no GitHub; `LLMS_ASK_ENABLED`.
- Revisão por falante nativo das traduções (marcadas `pendente`).
- 27/10: merge da `llms-dominio` na main, `gh run list`, `gh workflow run eleicoes-data-refresh.yml`, conferir saibatudo.net/llms/ e /zh/.
- S2 (tokens), S3 (modelo por dentro), S4 (SaibaTudo IA), S5 (Android).
