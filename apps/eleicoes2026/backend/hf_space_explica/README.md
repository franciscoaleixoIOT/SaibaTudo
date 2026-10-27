---
title: SaibaTudoIA Explica Eleicoes
emoji: 🗳️
colorFrom: blue
colorTo: yellow
sdk: gradio
sdk_version: 5.49.1
python_version: 3.10.13
app_file: app.py
pinned: false
short_description: Texto gerado da SaibaTudo IA para o app de eleicoes
---

Space do projeto **SaibaTudo Eleições 2026**: gera o texto da "SaibaTudo IA" (explicador Qwen3-4B-Instruct-2507 ajustado em comportamento, no
ZeroGPU), chamado só pelo servidor do projeto (`/api/ask`). O servidor descarta a resposta que recomende candidato, contradiga os dados do app
ou traga número sem fonte no contexto; o texto pode conter erros e não é dado oficial. Código-fonte: `backend/hf_space_explica/` no repositório.

## Publicar
Este Space precisa de `nlu_core.py`, copiado de `backend/modal/` (o prompt é o mesmo do treino). Com o `hf` autenticado (token em `secrets/hf_token.txt`,
nunca no Git nem no chat):

```bash
mkdir -p ai_model/output/space_build_explica && cp backend/hf_space_explica/{app.py,requirements.txt,README.md} ai_model/output/space_build_explica/
cp backend/modal/nlu_core.py ai_model/output/space_build_explica/
hf upload franciscoaleixo/SaibaTudoIA-Explica-Eleicoes ai_model/output/space_build_explica . --repo-type space
```

Space **privado**; o servidor chama com `HF_TOKEN` (token de leitura) em `HF_ASK_SPACE_URL`. Variáveis do Space (Settings → Variables):
`ASK_MODEL_ID` (repositório privado do explicador ajustado, ex.: `franciscoaleixo/SaibaTudoIA-Explica`), `ASK_MODEL_REVISION` (SHA da revisão
publicada) e `ASK_MODEL_LABEL` (padrão "SaibaTudo IA"). Sem elas, serve a base `Qwen/Qwen3-4B-Instruct-2507`.
**Segredo obrigatório** (Settings → Secrets): `HF_TOKEN` = token de LEITURA do dono (fine-grained, `repo.content.read`), porque o modelo
está em repositório privado e o Space não herda permissão do dono; sem ele a carga falha com 401 (lição de 22/10/2026).
`ia/treino/publicar_explica.py` grava variáveis e segredo de uma vez.
Para trocar o app de eleições para este Space: `HF_ASK_SPACE_URL=https://franciscoaleixo-saibatudoia-explica-eleicoes.hf.space` na Vercel
(`docs/PROJECT_MEMORY.md` §4.6) e redeploy pelo `eleicoes-data-refresh.yml`.
