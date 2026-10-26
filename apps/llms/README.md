# SaibaTudo LLMs

Como um modelo de linguagem funciona, com as mãos na massa: um gráfico 3D interativo dos vetores de palavras do GloVe (escolha palavras, o app
projeta nas 3 dimensões mais informativas ou em PCA), aritmética de vetores (king − man + woman ≈ queen), vizinhos, produto escalar, seis lições
curtas (tokens, embeddings, atenção, camadas, softmax e temperatura) e um assistente em **português, inglês, espanhol, alemão, francês e chinês**.

- Site/PWA: `https://saibatudo.net/llms/` (rota ligada em 27/10/2026; antes, `https://saibatudo-llms.vercel.app/llms/`). Funciona offline.
- Código aberto (MIT), sem anúncios, login ou rastreadores. Dados: GloVe 6B (Stanford, PDDL 1.0), 100 mil palavras em inglês, 50 dimensões,
  pacote assinado e verificado no aparelho. IA na nuvem opcional (Qwen3-4B no Hugging Face), rotulada e verificada.
- Parte do ecossistema [SaibaTudo](../../README.md), ao lado do Eleições 2026 e do Química.

## Estrutura
```
web/        site/PWA (HTML/CSS/JS puros): build.mjs, src/llms/ (js/{data,projecao,cena3d,explorador,nlu,answers,nuvem}.js, i18n/, conteudo/, ui/), test/
api/        funções serverless (Vercel): health.js, ask.js (+ _lib: validate, config, fidelidade, ask-handler, limites)
pipeline/   gerar_pacote.py (GloVe → vocab.json + vetores.i8 + escalas.f32 + glossario + presets, manifesto assinado), sign.py, tests/
contracts/  glossario.json, presets.json, lexico/<idioma>.json, nlu_golden_cases.json
backend/    hf_space_llms/ (Space do explicador: app.py, ask_core.py, publicar.py)
tools/      gerar_lexico.py, test_workflows.py, test_contratos.py
docs/       ARCHITECTURE, DATA_CONTRACT, I18N, FONTES_E_LICENCAS, OPERACAO, PLANO, PROJECT_MEMORY
brand/      llms-icon.svg e PNGs gerados (web/tools/gerar_icones.mjs)
```

## Rodar e testar
```
cd web && npm test                                   # 82 testes; E2E=1 npm test abre o Chrome
DATA_DIR=web/test/fixtures/data-llms PUB_KEY_B64="$(cat web/test/fixtures/chave_teste_public.b64)" node web/build.mjs && node web/serve.mjs
cd api && npm test
python -m unittest discover -s pipeline/tests; python -m unittest discover -s tools -p "test_*.py"
```
Pacote real: `python pipeline/gerar_pacote.py --saida data/llms --fonte gensim --limite 100000 --chave secrets/data_signing_key.pem`
(`--fonte hf` ou `--fonte <glove.6B.50d.zip do Zenodo>` quando o GitHub estiver inacessível).

## Plano
S1 (este): casca, embeddings, assistente, lições, nuvem opt-in, chinês. S2: tokenizador do Qwen3 no navegador. S3: o modelo por dentro
(Qwen3-0.6B num Space de CPU: embeddings por camada, atenção, próximo token, temperatura). S4: SaibaTudo IA no app. S5: Android. Detalhes em `docs/PLANO.md`.
