# SaibaTudo LLMs — subprojeto S1: casca, embeddings e nuvem opt-in (desenho)

> Pedido do mantenedor (25/10/2026): um novo app de código aberto, **SaibaTudo LLMs**, no padrão dos apps SaibaTudo (sobretudo o de
> química), com as mesmas traduções **mais o chinês**, que ensine como um modelo de linguagem funciona. A primeira peça é um gráfico
> 3D interativo com os vetores de palavras do `glove-wiki-gigaword-50`: escolhidas as palavras, o app seleciona as 3 dimensões mais
> informativas e projeta nelas. Base aberta da IA do app e da demonstração: **família Qwen3** (decisão do mantenedor, 25/10).
> Decisões do mantenedor registradas aqui: capítulo inteiro em subprojetos; S1 primeiro; 3 dimensões originais + PCA opcional;
> Canvas 2D próprio; Qwen3-0.6B em Space de CPU para o S3; Android depois do site; **nuvem opt-in já no S1**; **chinês também na home**;
> **nenhuma referência direta ao vídeo** que motivou o app (conteúdo didático próprio, referências acadêmicas e ao GloVe);
> preset "países e líderes" incluído com nota histórica.

## 0. Decomposição do app (visão geral; cada subprojeto ganha a sua spec)

| Sub | Conteúdo | Depende de |
| :-- | :-- | :-- |
| **S1 (esta spec)** | `apps/llms/`: PWA sem CDN, i18n em 6 idiomas (zh novo, também na home), assistente padrão com NLU local por regras, pacote de dados assinado com o GloVe, explorador 3D (variância / PCA), aritmética de vetores, vizinhos, produto escalar, seis seções didáticas próprias (só embeddings interativa), **IA na nuvem opt-in** (Qwen3-4B-Instruct-2507 em Space, rotulada), workflows `llms-*`, projeto Vercel. Domínio e cartão em 27/10. | — |
| S2 | Tokens: tokenizador do Qwen3 no navegador (BPE a partir do `tokenizer.json`, Apache 2.0): texto → tokens, ids, contagem; "palavra ≠ token" em pt e zh. | S1 |
| S3 | O modelo por dentro: Space de **CPU** com o **Qwen3-0.6B** e rota `/llms/api/modelo`: embeddings por camada (projetados no mesmo explorador), mapas de atenção por camada/cabeça, logits do próximo token; softmax e temperatura no navegador. | S1, S2 |
| S4 | SaibaTudo IA no app: NLU único (Qwen3.5-2B) e explicador treinado (Qwen3-4B) substituem a base pura do S1, pelo ciclo normal de gate (`docs/PLANO_IA_SAIBATUDO.md`). | S1 |
| S5 | Android (`net.saibatudo.llms`), reaproveitando contratos e léxico. | S1–S3 |

## 1. Objetivo e critérios de sucesso do S1

**Objetivo.** Uma pessoa em qualquer dos seis idiomas abre `saibatudo.net/llms/`, escolhe palavras (ou pede ao assistente), vê os vetores
projetados em 3 eixos num gráfico que gira, entende por que "rei − homem + mulher ≈ rainha", e pode pedir à IA na nuvem (opt-in) uma
explicação em linguagem natural, rotulada e verificada.

**Sucesso (medível antes de publicar):**
1. Pacote de dados assinado com ≥ 100 000 palavras; os 10 vizinhos mais próximos de 50 palavras-amostra são iguais em float32 e int8.
2. Projeção: testes de `projecao.js` passam (variância, PCA contra valores conhecidos); o gráfico abre em celular e desktop sem erro de console nem violação de CSP (e2e no Chrome).
3. Assistente: golden do NLU com ≥ 30 casos por idioma (6 idiomas) a 100 %; os catálogos dos 6 idiomas têm as mesmas chaves; nenhuma string fixa em português fora dos catálogos.
4. Nuvem: `/llms/api/ask` responde no idioma pedido com o rótulo do modelo; o verificador rejeita número fora do contexto/trechos; teste ao vivo em 3 idiomas (pt, en, zh).
5. Offline: depois da primeira visita, o app e o pacote funcionam sem rede (service worker).
6. Publicado em `saibatudo-llms.vercel.app/llms/` com health `ok`; em 27/10, `saibatudo.net/llms/` e cartão na home em 6 idiomas.

**Fora do S1:** tokens, atenção, próximo token, NLU na nuvem, treino de modelo, Android.

## 2. Estrutura e infraestrutura

```
apps/llms/
  CLAUDE.md  README.md  LICENSE (MIT)  vercel.json  .vercelignore
  web/        build.mjs  serve.mjs  package.json  src/llms/  test/  tools/minify.mjs
  api/        health.js  ask.js  _lib/ (config, http, cache, ratelimit, compartilhado, validate, dadopessoal, fidelidade, ask-handler)  test/
  pipeline/   gerar_pacote.py  sign.py  requirements.txt  data_signing_public.pem|.b64  tests/
  data/llms/  manifest.json  manifest.sig  vocab.json  vetores.i8  escalas.f32  glossario.json
  contracts/  lexico/<idioma>.json  nlu_golden_cases.json  glossario.json  presets.json
  tools/      gerar_lexico.py  test_workflows.py
  docs/       ARCHITECTURE.md  DATA_CONTRACT.md  I18N.md  FONTES_E_LICENCAS.md  OPERACAO.md  PLANO.md  PROJECT_MEMORY.md  PRIVACIDADE.<idioma>.md
  brand/      llms-icon.svg  png/ (favicon 32/48, apple 180, og 1200)
  backend/hf_space_llms/  app.py  ask_core.py  requirements.txt  README.md
  secrets/    (ignorado) data_signing_key.pem  hf_token.txt
```

- **Rota** `/llms/` (todo caminho publicado começa assim); projeto Vercel **`saibatudo-llms`** (criado pela API REST com `VERCEL_TOKEN_TIME`,
  time `team_OtdpApo2TX8QxlO1xUuJIERJ`); `vercel.json` igual ao da química (CSP `default-src 'self'`, sem `unsafe-inline`, `connect-src 'self'`,
  `cleanUrls`, rewrites `/llms/api/:path*` → `/api/:path*` e SPA), funções `api/health.js` e `api/ask.js` (`maxDuration` 50).
- **Workflows** (regra 2 da raiz): `llms-web-ci.yml` (testes Node e Python, build, verificação da assinatura) e `llms-data-refresh.yml`
  (sob demanda: build + verificação + `vercel deploy --prod` da pasta `apps/llms`; sem agenda, o GloVe não muda). Segredos
  `DATA_SIGNING_KEY_LLMS`, `VERCEL_PROJECT_ID_LLMS` (o mantenedor grava; o agente não grava segredos), reuso de `VERCEL_ORG_ID` e `VERCEL_TOKEN_TIME`;
  variável `LLMS_ASK_ENABLED`. `tools/test_workflows.py` valida só `llms-*`.
- **Domínio (27/10, fora do congelamento):** três regras de proxy em `apps/eleicoes2026/vercel.json` (`/llms`, `/llms/`, `/llms/:path*` →
  `https://saibatudo-llms.vercel.app/llms/…`), exclusão de `/llms/` em `portal/src/sw.js`, cartão fixo na home (ver §7), `tests/rotas.test.mjs`
  atualizado, e `eleicoes-data-refresh.yml` para valer. Até lá o app vive em `saibatudo-llms.vercel.app/llms/`.

## 3. Pacote de dados (GloVe)

- **Fonte:** `glove-wiki-gigaword-50` (GloVe 6B: Wikipedia 2014 + Gigaword 5, 400 000 palavras sem maiúsculas, 50 dimensões), baixado pelo
  `gensim.downloader` com cache local (66 MB). Licença **PDDL 1.0** (Open Data Commons); referência: Pennington, Socher & Manning (2014),
  *GloVe: Global Vectors for Word Representation*. Palavras em **inglês**: a interface diz isso em cada idioma.
- **Seleção:** na ordem de frequência do GloVe, as primeiras **100 000** palavras que casam `^[a-z]+(?:[-'][a-z]+)*$` e têm até 20 caracteres
  (fora: números, pontuação, `<unk>`). O índice da palavra é a posição de frequência.
- **Quantização:** int8 por vetor, `escala = max|x| / 127`, `q = round(x / escala)`. Arquivos: `vocab.json` (lista de palavras, ~0,9 MB),
  `vetores.i8` (100 000 × 50 bytes = 5,0 MB), `escalas.f32` (100 000 float32 little-endian, 0,4 MB). Produto escalar e cosseno no cliente
  direto nos int8 (`sa·sb·Σ ai·bi`), normas calculadas uma vez.
- **Glossário** (`contracts/glossario.json` → copiado ao pacote): ~300 palavras de exemplo em inglês com tradução em pt-BR, es, de, fr e zh,
  autoria própria (MIT). Serve às sugestões ("rei → king") e ao NLU em outros idiomas. **Presets** (`contracts/presets.json`): realeza e
  gênero; países e capitais; plural; família; cores; números; países e líderes (germany, italy, hitler, mussolini — com nota histórica no
  catálogo, sem juízo além do fato de que o corpus associa as palavras).
- **Manifesto** (`manifest.json`, assinado ECDSA P-256 com **chave nova** em `apps/llms/secrets/`): `version`, `generatedAt`, `schemaVersion`,
  `files{bytes, sha256}`, `vetores{fonte, licenca, url, palavras, dimensoes, quantizacao}`. `sign.py` igual ao da química. O build do
  site verifica bytes, SHA-256 e assinatura antes de copiar; o cliente verifica de novo (`verify.js`) e, se falhar, mostra aviso e não carrega vetores.
- **Testes do pipeline (Python):** filtro de palavras, quantização ida e volta (erro máximo < 1/127 da escala), vizinhos float × int8 iguais
  nos top-10 de 50 palavras-amostra, manifesto e assinatura. Fixture para o site: `web/test/fixtures/data-llms` com ~300 palavras (as do glossário
  e dos presets), assinada com uma chave de teste.
- **Serviço de dados no cliente** (`data.js`): carrega manifesto → verifica → carrega os três arquivos (cache-first versionado `?v=<sha256>` no SW,
  pré-cache dos ~6,3 MB); API: `indice(palavra)`, `vetor(i)` (Float32Array 50), `cosseno(i, j)`, `vizinhos(vetor, n, excluir)`,
  `analogia(a, b, c, n)`, `produtoEscalar(direcao, palavras)`, `sugerir(prefixo | aproximado)` (prefixo por lista ordenada; distância de edição ≤ 2
  nas 20 000 mais frequentes).

## 4. Explorador 3D

- **`projecao.js` (puro, testado em Node).**
  - `eixosPorVariancia(M)`: M = k × 50; variância populacional por dimensão; devolve os 3 índices de maior variância (empate: menor índice),
    na ordem x, y, z. k = 1: os 3 índices de maior |valor|. k = 0: vazio.
  - `pca3(M)`: k ≥ 3; centraliza, covariância 50 × 50 (k − 1), três autovetores por iteração de potência com deflação (≤ 200 iterações, tolerância 1e-9),
    sinal fixado (maior componente em módulo positiva), devolve coordenadas, autovalores e variância explicada (%) de cada eixo. k = 2 cai para
    variância com aviso no painel.
  - `projetar(M, modo)` devolve `{pontos: [{x,y,z}], eixos: [{rotulo, variancia}], modo}`; o rótulo é `d17` (dimensão original) ou `PC1 · 41 %`.
- **`cena3d.js` (Canvas 2D, sem dependência).** Rotação por ângulos (yaw, pitch) e projeção ortográfica com escala para caber; eixos passando pela
  origem com marcas ±, pontos com rótulo (afastamento simples para não sobrepor), **setas** para diferenças de vetores (ligado o modo "mostrar diferenças",
  cada par escolhido vira uma seta; a ferramenta de analogia desenha a → b e c → resultado), ordenação por profundidade, destaque ao passar/tocar,
  hi-DPI, tema claro/escuro, `prefers-reduced-motion` (sem animação de entrada). Interação: arrastar/toque gira; roda e pinça dão zoom; duplo toque
  reinicia; teclas ← → ↑ ↓ giram (acessibilidade); o gráfico tem `role="img"` com descrição e uma **tabela** equivalente (palavra × 3 coordenadas) sempre visível.
- **Painel.** Chips das palavras (remover, destacar), campo com autocompletar do vocabulário, alternância **"3 dimensões" / "PCA"**, "mostrar
  diferenças", presets, tabela de coordenadas, **vizinhos** (10, por cosseno) da palavra destacada, **analogia** (a − b + c → 5 resultados fora de
  a, b, c, com cossenos), **direção** (w1 − w2 contra uma lista; o preset do plural traz cat/cats, dog/dogs, one…four). Todo número com o rótulo
  "calculado no aparelho a partir do GloVe (PDDL)". Estado no endereço (`?palavras=king,queen&modo=pca`) para compartilhar.
- **Limites:** até 40 palavras no gráfico (além disso, aviso). Palavra fora do vocabulário → sugestões por prefixo e por aproximação, e a
  explicação de que o GloVe é em inglês (com a tradução do glossário quando houver).

## 5. Assistente (padrão `docs/PADRAO_ASSISTENTE.md`)

- **Campo, histórico, contexto, resposta, acessibilidade e preferências:** todos os itens obrigatórios do padrão, portados da química
  (campo que cresce, limpo ao enviar, ↑/↓, chips, origem e data dos dados, copiar, fechar, relatar por issue do GitHub, `aria-live`, tema,
  tamanho do texto, instalar, apagar dados do aparelho).
- **NLU local por regras** (`nlu.js`), léxico por idioma em `contracts/lexico/<idioma>.json` gerado para o site por `tools/gerar_lexico.py`
  (mesmo formato da química: regex como texto, só sintaxe comum a JS e `java.util.regex`). Intenções: `SAUDACAO`, `AJUDA`, `MOSTRAR` (palavras para o
  gráfico: "coloque king, queen, man e woman", "mostre rei e rainha"), `ANALOGIA` ("king − man + woman", "rei está para rainha como homem está para…"),
  `VIZINHOS`, `SIMILARIDADE` ("cat e dog são parecidas?"), `DIRECAO` ("direção do plural", "cats − cat"), `CONCEITO` (termo das seções: embedding, vetor,
  dimensão, token, atenção, MLP, softmax, temperatura, transformer, parâmetro, próximo token — responde com o texto didático e um link para a seção),
  `PRESET` ("mostre as capitais"), `LIMPAR`, `SOBRE_DADOS`, `FONTES`, `DESCONHECIDA`.
- **Extração de palavras:** tokens entre aspas ou após a pista da intenção; cada um é procurado no vocabulário (inglês, minúsculas) e, não achando,
  no glossário do idioma ativo ("rei" → king, rotulado "traduzido"). Em chinês não há `\b` nem acentos: o léxico zh usa listas de termos e o glossário
  casa por substring.
- **Contexto da conversa:** continuação ("e queen?", "e a rainha?", "也加上 queen") acrescenta ao gráfico atual; fechar a resposta limpa.
- **Casos golden:** `contracts/nlu_golden_cases.json` com `idioma`, ≥ 30 por idioma, mesmas intenções; teste de paridade dos léxicos gerados.

## 6. IA na nuvem (opt-in, já no S1)

- **Papel:** só **explica** (conceitos e o que o gráfico mostra); não interpreta comandos (fica para o S4) e não fornece números: os números do
  gráfico são calculados no aparelho e vão no `contexto`.
- **Fluxo:** botão "Perguntar à IA na nuvem" depois de cada resposta (e no "não entendi"), consentimento padrão por pergunta ou contínuo
  (configurações, desligado por padrão). Corpo: `{q, lang, context, trechos, iid}` — `context` = resumo do estado (palavras, modo, eixos, até 10 vizinhos
  ou o resultado da analogia, com os cossenos), `trechos` = as seções didáticas relevantes no idioma (escolhidas pelo NLU local por palavra-chave, até 3,
  ≤ 6 000 caracteres). Nunca o histórico.
- **Servidor** (`api/ask.js` + `_lib`, porte da química): CORS por origem permitida, limites por IP e por `iid`, orçamento diário, cache por pergunta
  normalizada + idioma + contexto, filtro de dado pessoal na pergunta (`dadopessoal.js`), timeout 25 s, sem log de pergunta ou resposta. Provedor:
  **Space privado `franciscoaleixo/saibatudo-llms`** (ZeroGPU, `backend/hf_space_llms/`, Gradio `api_name="ask"`; o Space não precisa de segredo,
  o modelo é público; a Vercel guarda `HF_TOKEN` para chamar o Space privado). Modelo **Qwen3-4B-Instruct-2507** (Apache 2.0) sem ajuste, `enable_thinking`
  desligado, temperatura 0,2, ≤ 350 tokens. Sem reserva no Modal no S1.
- **Prompt (`ask_core.py`, o mesmo que o S4 usará no treino):** professor de como funcionam os modelos de linguagem; responde **no idioma `lang`**;
  usa só o contexto e os trechos para fatos e números; não inventa coordenadas nem cossenos; recusa com uma frase o que não é sobre o app ou sobre
  modelos de linguagem; termina sempre com o rodapé no idioma ("texto gerado por IA, pode conter erros").
- **Verificador** (`fidelidade.js`, adaptado): rejeita (a) número de 2+ dígitos ou decimal que não esteja na pergunta, no contexto nem nos trechos;
  (b) ausência do rodapé; (c) resposta em escrita errada (zh pedido sem caracteres CJK, ou CJK em outro idioma); (d) dado pessoal. Rejeitou →
  o cliente mantém a resposta local, sem o texto gerado.
- **Rótulo honesto:** o campo `model` da API devolve o rótulo do Space (`ASK_MODEL_LABEL`, "Qwen3-4B"); o cliente mostra
  "Texto gerado por IA (Qwen3-4B) • Nuvem — pode conter erros". Quando o S4 publicar o explicador treinado, o rótulo passa a "SaibaTudo IA" sem mudar o cliente.
- **Health:** `/llms/api/ask` desligada por padrão (`ASK_ENABLED=1` + `HF_ASK_SPACE_URL` ligam); `health.js` expõe `ask: on|off`, `data{version, generatedAt}`.
- **Privacidade:** política em 6 idiomas (`privacidade/<idioma>.html` ↔ `docs/PRIVACIDADE.<idioma>.md`, teste compara): nada sai do aparelho sem toque;
  na nuvem vão pergunta, idioma, contexto do gráfico e trechos; IP só para limite de uso; `iid` aleatório local.

## 7. Idiomas, incluindo o chinês

- **No app:** `IDIOMAS = ['pt-BR','en','es','de','fr','zh']`, pt-BR referência. `zh` = chinês simplificado (`<html lang="zh">`, `Intl` com `zh`),
  fontes do sistema para CJK (sem webfont), nomes de idioma nativos no seletor ("中文"). Seleção: `?lang=` → preferência → `navigator.languages`
  (`zh-*` → zh) → pt-BR. Catálogos iniciais por agente com glossário fixo (`revisao: 'pendente'`); revisão por falante nativo é pendência registrada.
  Testes de paridade de chaves e de ausência de texto fixo em português cobrem os seis.
- **Na home (`portal/`):** catálogo `zh.js`, `IDIOMAS` com `zh`, `UI`/`AVISO` em `textos.js`, `traducoes.zh` nos itens de `EM_BREVE`; cartão fixo do
  SaibaTudo LLMs com destaque igual aos outros (README do portal, item 5), com textos nos seis catálogos. Na página zh, o link da química vai com
  `?lang=en` (a química não tem zh) e eleições/AchaVagaIA levam o selo "só em português". Rotas `/zh`, `/zh/`, `/zh/:path*` e o cartão só em 27/10
  (`vercel.json` de eleições congelado): o commit do portal com zh e o do `tests/rotas.test.mjs` (que fixa os idiomas) saem **junto** com as regras de proxy.
- **Documento `docs/I18N.md` do app** aponta para o da química e registra o que muda para o zh (léxico sem `\b`, sem normalização de acento, glossário por substring).

## 8. Conteúdo didático (autoria própria)

Seis seções curtas em `web/src/llms/js/conteudo/<idioma>.js` (texto com marcação mínima: parágrafos, ênfase, fórmulas simples em texto):
1. **O que um modelo de linguagem faz** — prever o próximo token, repetir, amostrar; 2. **Tokens** — pedaços de texto, ids; 3. **Embeddings** —
vetores, dimensões, direções com significado, aritmética, produto escalar, por que projetar em 3D (interativa no S1); 4. **Atenção** — vetores que
trocam informação pelo contexto; 5. **MLP e camadas** — processamento em paralelo, muitas camadas, parâmetros; 6. **Softmax e temperatura** —
de números a probabilidades. Cada seção traz "Experimente" (ações no explorador) e as referências: GloVe (Pennington et al., 2014), word2vec
(Mikolov et al., 2013, analogias), Transformer (Vaswani et al., 2017). **Nenhuma menção a vídeo ou canal**; nenhuma figura ou trecho de terceiros.
As seções são também os `trechos` que a nuvem recebe.

## 9. Erros e limites

| Situação | Comportamento |
| :-- | :-- |
| Pacote com assinatura ou hash inválido | Aviso "dados indisponíveis", explorador desativado, seções e assistente de conceitos continuam. |
| Palavra fora das 100 000 | Sugestões (prefixo, aproximação, glossário) e explicação de que o corpus é em inglês. |
| < 2 palavras (variância) / < 3 (PCA) | Uma palavra: eixos por |valor|; PCA com 2: cai para variância com aviso. |
| > 40 palavras | Aviso; as excedentes não entram. |
| Canvas indisponível | Só a tabela de coordenadas. |
| Nuvem desligada, cota, timeout, resposta rejeitada | Aviso claro no idioma; a resposta local permanece. Nunca botão quebrado. |
| Sem rede | App e pacote do cache; nuvem indisponível com aviso. |

## 10. Testes

- **Node (`web/test`):** `projecao` (variância com matriz conhecida; PCA contra autovalores de uma matriz 3 × 3 ampliada; sinais; variância explicada
  soma ≤ 100 %), `quantizacao` (fixture float ↔ int8), `vetores` (vizinhos, analogia king − man + woman contém queen na fixture, produto escalar do plural),
  `nlu-golden` por idioma, `i18n` (paridade, `?lang=`, detecção, formato de números por idioma, zh sem `\b`), `lexico` (gerado = JSON), `conteudo`
  (6 idiomas, mesmas seções, sem URL de vídeo), `sw`, `build` (verificação, `?v=`), `e2e` no Chrome (E2E=1: telas, gráfico, offline, CSP).
- **API (`api/test`):** `ask` com Space simulado (idioma, rótulo, rejeições do verificador, limites, cache, dado pessoal), `health`.
- **Python (`pipeline/tests`, `tools`):** seleção, quantização, vizinhos float × int8, manifesto/assinatura, workflows `llms-*`.
- **Ao vivo depois do deploy:** Playwright em `saibatudo-llms.vercel.app/llms/` nos idiomas pt, en e zh; health; uma pergunta à nuvem.

## 11. Publicação e operação (ordem)

1. Chave ECDSA nova (`pipeline/sign.py gen`), pacote gerado e assinado localmente, commit de código e de dados separados (regra 6 da raiz).
2. Projeto Vercel `saibatudo-llms` criado pela API; variáveis não secretas gravadas pela API; **o mantenedor grava** `HF_TOKEN` na Vercel e
   `DATA_SIGNING_KEY_LLMS` + `VERCEL_PROJECT_ID_LLMS` no GitHub.
3. Space `saibatudo-llms` criado por `ia/treino/publicar_explica.py` estendido (`--app llms`) ou script próprio; teste pela API do Gradio.
4. `gh workflow run llms-data-refresh.yml` → deploy; health; teste ao vivo.
5. 27/10: regras de proxy (llms e zh), service worker da home, cartão, `tests/rotas.test.mjs`, `eleicoes-data-refresh.yml`.
6. Documentos: `CLAUDE.md` da raiz (nova linha do app), `apps/llms/docs/PROJECT_MEMORY.md`, memória do agente.

## 12. Riscos

- `gensim` no Python 3.12 do Windows (há wheels; reserva: ler o arquivo texto do Stanford, 822 MB).
- Cota ZeroGPU compartilhada com os Spaces da química e de eleições (orçamento diário baixo no S1, `HF_ASK_DAILY_BUDGET`).
- Qualidade do Qwen3-4B sem ajuste em zh e em explicações: mitigada pelo verificador e pelo rótulo; o S4 treina.
- Traduções por agente (zh sobretudo): `revisao: 'pendente'` visível no "Sobre".
