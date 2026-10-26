---
title: SaibaTudo LLMs — explicação por IA
emoji: 🧭
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: apache-2.0
---

# Space do explicador do SaibaTudo LLMs

Gera a explicação em linguagem natural que o app pede (opt-in), com o **Qwen3-4B-Instruct-2507** (Apache 2.0) sem ajuste no S1. Chamado só pelo
servidor do projeto (`apps/llms/api/ask.js`), que valida a entrada, aplica limites e **verifica a resposta** (números só do contexto e dos trechos,
rodapé do idioma, escrita, dado pessoal). O Space é **privado**: a Vercel chama com `HF_TOKEN` (leitura).

Variáveis do Space: `ASK_MODEL_ID` (padrão `Qwen/Qwen3-4B-Instruct-2507`), `ASK_MODEL_REVISION` (opcional), `ASK_MODEL_LABEL` (padrão `Qwen3-4B`; o
rótulo que o app mostra: "Texto gerado por IA (Qwen3-4B)"). Quando o S4 publicar o explicador treinado, troque as variáveis, sem mexer no código.

Publicar: `python backend/hf_space_llms/publicar.py --space franciscoaleixo/saibatudo-llms --teste` (token de escrita em `secrets/hf_token_write.txt`
da raiz do repositório ou `hf auth login`). Teste local do prompt: `python -m unittest discover -s backend/hf_space_llms -p "test_*.py"`.
