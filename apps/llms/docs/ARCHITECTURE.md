# Arquitetura — SaibaTudo LLMs

> Terceiro app do ecossistema SaibaTudo, no molde do **SaibaTudo Química**: local-first, código aberto (MIT), sem anúncios, dados licenciados e
> com fonte, e uma IA que **explica** mas **não calcula**. Rota: `https://saibatudo.net/llms/`. Projeto Vercel `saibatudo-llms`.

## 1. Princípios
1. **Dados abertos com fonte.** GloVe 6B (Pennington, Socher & Manning, 2014; PDDL 1.0). O pacote é gerado e assinado localmente e verificado
   no build (`web/build.mjs`) e no aparelho (`verify.js`, chave pública injetada pelo build).
2. **Cálculo no aparelho.** Cosseno, produto escalar, vizinhos (varredura das 100 mil palavras em int8), analogia, projeção (variância / PCA):
   código testado em Node, nunca modelo.
3. **A IA explica; os dados respondem.** O texto gerado é opt-in, rotulado com o modelo e verificado no servidor.
4. **Conteúdo próprio.** As seis seções são texto do projeto, com referências acadêmicas; nenhuma referência a vídeos ou canais.
5. **Local-first e privado.** Offline após a primeira visita (service worker pré-cacheia o pacote inteiro, ~6 MB). Nada sai sem toque.
6. **Seis idiomas.** pt-BR referência; en, es, de, fr e **zh** (primeiro app com chinês).

## 2. Visão geral
```
GloVe (gensim / espelho HF / Zenodo) ──► pipeline/gerar_pacote.py (filtra 100k palavras, int8 por vetor, assina) ──► data/llms/ (7 arquivos)
                                                                                                  │ llms-data-refresh.yml (sob demanda): build + vercel deploy
        ┌─────────────────────────────────────────────────────────────────────────────────────────┤
        ▼                                                                                         ▼
 site/PWA na Vercel (/llms/): data.js (Vetores) · projecao.js · cena3d.js ·               api/ask.js (opt-in) ──► Space privado do HF (Qwen3-4B)
 explorador.js · nlu.js + lex/ · answers.js · conteudo/ · nuvem.js · ui/                  api/_lib/fidelidade.js verifica a resposta
```

### 2.1 Fluxo de uma pergunta
1. **NLU local** (`nlu.js` + `contracts/lexico/<idioma>.json`): intenção (MOSTRAR, ANALOGIA, VIZINHOS, SIMILARIDADE, DIRECAO, CONCEITO, PRESET,
   LIMPAR, SAUDACAO, AJUDA, SOBRE_DADOS, FONTES, DESCONHECIDA), palavras do GloVe (inglês; outros idiomas pelo glossário, rotulado "traduzida"),
   analogia a − b + c, direção w1 − w2, continuação ("e queen?") com o contexto da pergunta anterior. Golden: `contracts/nlu_golden_cases.json` (266 casos).
2. **Resposta montada** (`answers.js`): texto do catálogo + números calculados + **ações** para o explorador (adicionar, analogia, direcao, preset,
   limpar, destacar) e `irPara` (vira botão "Abrir"). Rótulo de origem com a data dos dados.
3. **Explorador** (`explorador.js` puro + `ui/explorador.js`): estado (palavras ≤ 40, modo, diferenças, destaque, analogia, direção) → `cenaDe`
   → `projecao.projetar` → `cena3d.Cena3D` (Canvas 2D). Estado no endereço (`?palavras=…&modo=…`), saneado.
4. **Nuvem opt-in** (`nuvem.js` + `ui/nuvem-ui.js`): botão em cada resposta; consentimento; corpo `{q, lang, context, trechos, v, client, iid}`;
   o servidor valida, limita, chama o Space e verifica; o texto entra na resposta rotulado "Texto gerado por IA ({modelo})".

## 3. Módulos (um arquivo, uma responsabilidade)
| Módulo | Faz | Testado por |
| :-- | :-- | :-- |
| `data.js` (`Vetores`) | carga verificada, int8 → float, cosseno, vizinhos, analogia, direção/produto escalar, sugestões, glossário | `data.test.mjs` (fixture real, 360 palavras) |
| `projecao.js` | variâncias, 3 eixos por variância, PCA (iteração de potência), `projetar` | `projecao.test.mjs` |
| `cena3d.js` | rotação, projeção ortográfica, escala, rótulos sem colisão; classe com órbita/zoom/toque/teclado | `cena3d.test.mjs` (puras) + e2e |
| `explorador.js` | estado puro e `cenaDe`, URL | `explorador.test.mjs` |
| `nlu.js` + `nlu/lex/` | interpretação por regras em 6 idiomas | `nlu-golden.test.mjs`, `lexico.test.mjs` |
| `answers.js` | respostas e ações | `answers.test.mjs` |
| `conteudo/` | seis seções × 6 idiomas, `trechosPara` | `conteudo.test.mjs` |
| `nuvem.js` | contexto, trechos, chamada à API | `nuvem.test.mjs` |
| `api/_lib/*` | validação, config, verificador, handler | `api/test/*` |

## 4. Decisões registradas
- Canvas 2D próprio em vez de three.js (sem dependência, CSP simples, ~300 linhas testáveis).
- 100 mil palavras int8 (5 MB) em vez de 400 mil (20 MB): cabe no pré-cache e cobre os exemplos.
- NLU devolve palavras (não índices); `answers.js` resolve índices.
- Pergunta factual com palavras conhecidas ("qual é a capital da França?") fica DESCONHECIDA (pista `pergunta`), não vira comando de mostrar.
- Ação `irPara` vira botão na resposta (não navega sozinha), para não esconder a resposta e o botão da nuvem.
- A chave pública do pacote é injetada pelo build em `verify.js` (marcador `__CHAVE_PUBLICA__`): produção usa `pipeline/data_signing_public.b64`,
  testes usam a chave de teste da fixture.
