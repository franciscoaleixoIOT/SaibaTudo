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
- Pacote real (100 k) e chave de assinatura: Task 18 (ainda não gerados no momento desta anotação). Fixture: 360 palavras com vetores reais
  (espelho do Zenodo, porque GitHub, Stanford e o CDN do HF estavam inacessíveis nesta rede em 25/10).
- Space `franciscoaleixo/saibatudo-llms` e projeto Vercel `saibatudo-llms`: a criar na Task 18 (ações externas agrupadas).
- Domínio `/llms/` e home em chinês: branch `llms-dominio`, merge em **27/10/2026** (congelamento de eleições até 26/10).

## 3. Lições
- Outro agente (kilo) comitou na árvore principal durante o S1 e a trocou de branch; o trabalho seguiu num **worktree** próprio.
- O `import gensim` trava com `scipy 1.18.1` nesta máquina: venv com `scipy<1.17`. Processos presos impediram recriar a venv (`.venv` → `.venv2`).
- A ferramenta de shell mutila barras invertidas em heredocs: scripts com regex vão para arquivo e são executados.
- `replaceChildren(null)` cria um nó de texto "null": filtrar os ramos condicionais.
- O service worker serve o shell antigo na primeira visita depois de um build: limpar caches ao testar no navegador.

## 4. Pendências
- Mantenedor: `HF_TOKEN` na Vercel `saibatudo-llms`; `DATA_SIGNING_KEY_LLMS` e `VERCEL_PROJECT_ID_LLMS` no GitHub; `LLMS_ASK_ENABLED`.
- Revisão por falante nativo das traduções (marcadas `pendente`).
- 27/10: rota, home zh, cartão, `eleicoes-data-refresh.yml`.
- S2 (tokens), S3 (modelo por dentro), S4 (SaibaTudo IA), S5 (Android).
