# SaibaTudo LLMs — S1 (casca, embeddings GloVe em 3D, nuvem opt-in) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr no ar `apps/llms/` (SaibaTudo LLMs): PWA em 6 idiomas que carrega 100 000 vetores do GloVe assinados, projeta palavras escolhidas em 3 eixos num gráfico 3D interativo, responde a comandos por um assistente local e explica conceitos por uma IA na nuvem opt-in, rotulada e verificada.

**Architecture:** Mesmo molde do app de química (`apps/quimica/`): site estático sem dependências em tempo de execução (`web/build.mjs` copia, verifica o pacote assinado e gera o service worker), pacote de dados gerado em Python e assinado com ECDSA, funções serverless na Vercel (`api/health.js`, `api/ask.js`) que falam com um Space privado do Hugging Face. Tudo o que é novo (quantização int8, projeção por variância/PCA, cena em Canvas 2D, NLU de comandos) é módulo puro testado em Node; a interface só liga os módulos.

**Tech Stack:** Node ≥ 20 (ESM, `node --test`, sem npm em tempo de execução), Python 3.12 (`gensim`, `numpy`, `ecdsa`, `unittest`), Vercel (projeto `saibatudo-llms`, rota `/llms/`), Hugging Face Space ZeroGPU (Gradio, `transformers>=5.17,<6`, Qwen3-4B-Instruct-2507), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-25-saibatudo-llms-s1-design.md`

## Global Constraints

- Tudo roda de dentro de `apps/llms/` com caminhos relativos; nenhum import de outro app (regra 1 da raiz). O que se copia da química vira arquivo próprio em `apps/llms/` com o prefixo trocado (`quimica` → `llms`).
- Todo caminho publicado começa em `/llms/`; CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (igual à da química); sem CDN, sem analytics, sem login.
- `IDIOMAS = ['pt-BR', 'en', 'es', 'de', 'fr', 'zh']`, pt-BR é a referência; nenhuma string em português fora dos catálogos e léxicos (teste varre).
- Palavras do GloVe em inglês, minúsculas; vocabulário = primeiras **100 000** palavras que casam `^[a-z]+(?:[-'][a-z]+)*$` com ≤ 20 caracteres; int8 com `escala = max|x| / 127` por vetor; arquivos `vocab.json`, `vetores.i8`, `escalas.f32`, `glossario.json`, `presets.json`, `manifest.json`, `manifest.sig`.
- Licenças: código MIT; GloVe 6B **PDDL 1.0** (Pennington, Socher & Manning, 2014); Qwen3 Apache 2.0. Conteúdo didático de autoria própria: **nenhuma menção a vídeo ou canal**; referências só acadêmicas.
- Nuvem: só explica; números só do contexto e dos trechos; rodapé obrigatório; rótulo = `model` da API ("Qwen3-4B" no S1); desligada por padrão (`ASK_ENABLED=1` + `HF_ASK_SPACE_URL`).
- Segredos nunca no Git nem no chat: `apps/llms/secrets/` (ignorado). O agente **não grava segredos** na Vercel nem no GitHub (`HF_TOKEN`, `DATA_SIGNING_KEY_LLMS`, `VERCEL_PROJECT_ID_LLMS` são do mantenedor).
- `apps/eleicoes2026/**` congelado até 26/10/2026: a Tarefa 19 só é executada em 27/10 ou depois.
- Commits pequenos, mensagem em português no estilo do repositório (`feat(llms): …`, `docs(llms): …`), terminados com as duas linhas de atribuição da sessão. Dados e código em commits separados. Depois de cada push: `gh run list --limit 6`.
- Windows/Git Bash: `MSYS_NO_PATHCONV=1` em argumentos que começam com `/`; scripts longos em arquivo, não heredoc.

## Review Focus

1. **Palavra com maiúscula, acento ou espaço** ("King", "São Paulo", "ice cream"): o app deve normalizar para minúsculas, avisar que o GloVe não tem acentos/maiúsculas e tratar "ice cream" como duas palavras — teste na Tarefa 8 (`sugerir`) e na Tarefa 10 (NLU).
2. **Duplicatas e autorreferência** ("king, king" / analogia com a = c): o gráfico não pode ter dois pontos iguais e a analogia exclui a, b, c dos resultados — teste nas Tarefas 7 e 8.
3. **Zoom/pinça num canvas sem tamanho** (aba oculta, `width = 0`): `ajustarEscala` não pode dividir por zero nem gerar `NaN` — teste na Tarefa 6.
4. **Resposta da nuvem no idioma errado ou sem rodapé** (modelo que ignora `lang`): o verificador rejeita e o cliente mantém a resposta local — teste nas Tarefas 13 e 15.
5. **`?palavras=` com 200 palavras ou lixo** (`?palavras=<script>`): o estado da URL é saneado (só palavras do vocabulário, no máximo 40) — teste na Tarefa 7 (`deUrl`).

---

## Mapa de arquivos

```
apps/llms/
  LICENSE  README.md  CLAUDE.md  vercel.json  .vercelignore  .gitignore
  pipeline/   sign.py  gerar_pacote.py  requirements.txt  data_signing_public.pem  data_signing_public.b64  tests/test_gerar_pacote.py
  data/llms/  manifest.json  manifest.sig  vocab.json  vetores.i8  escalas.f32  glossario.json  presets.json
  contracts/  glossario.json  presets.json  lexico/{pt-BR,en,es,de,fr,zh}.json  nlu_golden_cases.json
  tools/      gerar_lexico.py  test_workflows.py  test_contratos.py
  web/        package.json  build.mjs  serve.mjs  tools/minify.mjs  tools/gerar_icones.mjs  tools/screenshots.mjs
    src/llms/ index.html  offline.html  sw.js  manifest.webmanifest  manifest.{en,es,de,fr,zh}.webmanifest  privacidade/{index,en,es,de,fr,zh}.html
      css/base.css  css/app.css
      js/ main.js  app.js  dom.js  prefs.js  install.js  icons.js  texto.js  formato.js  theme-init.js  build-info.js  verify.js
          data.js (classe Vetores)  projecao.js  cena3d.js  nlu.js  answers.js  nuvem.js
          i18n/{idiomas,index}.js  i18n/catalogos/{pt-BR,en,es,de,fr,zh}.js  nlu/lex/{index,pt-BR,en,es,de,fr,zh}.js (gerados)
          conteudo/{pt-BR,en,es,de,fr,zh}.js
          ui/{componentes,inicio,explorador,aprenda,sobre,config}.js
    test/   support.mjs  fixtures/data-llms/  fixtures/palavras_fixture.txt  fixtures/chave_teste.pem
            build.test.mjs  sw.test.mjs  i18n.test.mjs  data.test.mjs  projecao.test.mjs  cena3d.test.mjs  lexico.test.mjs  nlu-golden.test.mjs
            answers.test.mjs  conteudo.test.mjs  nuvem.test.mjs  privacidade.test.mjs  explorador-url.test.mjs  e2e.test.mjs
  api/        package.json  health.js  ask.js  README.md
    _lib/     http.js  cache.js  ratelimit.js  compartilhado.js  validate.js  dadopessoal.js  config.js  fidelidade.js  ask-handler.js
    test/     _helpers.mjs  health.test.mjs  fidelidade.test.mjs  ask-handler.test.mjs
  backend/hf_space_llms/  app.py  ask_core.py  requirements.txt  README.md  publicar.py  test_ask_core.py
  docs/       ARCHITECTURE.md  DATA_CONTRACT.md  I18N.md  FONTES_E_LICENCAS.md  OPERACAO.md  PLANO.md  PROJECT_MEMORY.md  PRIVACIDADE.{pt-BR,en,es,de,fr,zh}.md
  brand/      llms-icon.svg  png/{favicon-32,favicon-48,apple-touch-icon-180,og-llms-1200,pwa-llms-192,pwa-llms-512,pwa-llms-maskable-192,pwa-llms-maskable-512}.png
.github/workflows/  llms-web-ci.yml  llms-data-refresh.yml
(27/10) apps/eleicoes2026/vercel.json  portal/src/{index.html,sw.js}  portal/src/portal/{apps.js,textos.js,i18n/index.js,i18n/zh.js}  tests/rotas.test.mjs  CLAUDE.md (raiz)
```

---

### Tarefa 1: Pipeline do pacote (filtro, quantização, manifesto assinado)

**Files:**
- Create: `apps/llms/pipeline/sign.py` (cópia de `apps/quimica/pipeline/sign.py`, sem mudança), `apps/llms/pipeline/gerar_pacote.py`, `apps/llms/pipeline/requirements.txt` (`ecdsa==0.19.2`, `numpy>=1.26`, `gensim>=4.3`), `apps/llms/pipeline/tests/test_gerar_pacote.py`, `apps/llms/.gitignore` (`secrets/`, `pipeline/.cache/`, `web/dist/`, `__pycache__/`), `apps/llms/LICENSE` (MIT, mesmo texto de `apps/quimica/LICENSE`).

**Interfaces:**
- Produces (`gerar_pacote.py`):
  - `PADRAO_PALAVRA = re.compile(r"^[a-z]+(?:[-'][a-z]+)*$")`, `MAX_LEN = 20`, `LIMITE = 100_000`.
  - `filtrar_palavras(palavras: Iterable[str], limite: int = LIMITE) -> list[str]` — mantém a ordem; para em `limite`.
  - `quantizar(matriz: np.ndarray) -> tuple[np.ndarray, np.ndarray]` — `(int8 [n,50], float32 [n])`, `escala = max|x|/127` por linha (linha toda zero → escala 1.0).
  - `desquantizar(q: np.ndarray, escalas: np.ndarray) -> np.ndarray` (float32).
  - `escrever_pacote(saida: Path, palavras: list[str], matriz: np.ndarray, glossario: dict, presets: dict, chave_privada: Path, fonte: dict) -> dict` — grava os 7 arquivos, devolve o manifesto. Manifesto: `version` (`AAAAMMDDTHHMMSSZ-<12 hex do sha256 do vocab>`), `generatedAt`, `schemaVersion: 1`, `files{nome: {bytes, sha256}}`, `vetores{fonte, licenca, url, palavras, dimensoes: 50, quantizacao: "int8 por vetor (escala = max|x|/127)"}`; assina com `sign.assinar`.
  - CLI: `python pipeline/gerar_pacote.py --saida data/llms [--limite 100000] [--fonte gensim|<arquivo .txt do GloVe>] [--palavras <lista.txt>] --chave secrets/data_signing_key.pem --glossario contracts/glossario.json --presets contracts/presets.json`. `--palavras` restringe o vocabulário a uma lista (usado para a fixture). `--fonte gensim` usa `gensim.downloader.load("glove-wiki-gigaword-50")` com `GENSIM_DATA_DIR=pipeline/.cache`.

- [ ] **Passo 1: testes que falham** — `apps/llms/pipeline/tests/test_gerar_pacote.py`:

```python
def test_filtrar_mantem_ordem_e_regras(self):
    palavras = ["the", ",", "of", "u.s.", "1990", "rock-and-roll", "o'neill", "King", "a"*21, "zebra"]
    self.assertEqual(filtrar_palavras(palavras, limite=5), ["the", "of", "rock-and-roll", "o'neill", "zebra"])

def test_quantizar_ida_e_volta(self):
    m = np.random.default_rng(1).normal(size=(20, 50)).astype(np.float32); m[3] = 0
    q, e = quantizar(m)
    self.assertEqual((q.dtype, e.dtype, q.shape, e.shape), (np.int8, np.float32, (20, 50), (20,)))
    self.assertTrue(np.all(np.abs(desquantizar(q, e) - m) <= e[:, None] / 2 + 1e-6))
    self.assertEqual(e[3], 1.0)

def test_vizinhos_iguais_em_float_e_int8(self):  # 60 palavras sintéticas em grupos; top-10 por cosseno iguais
    ...assertEqual(top10_float(i), top10_int8(i)) para 5 consultas

def test_escrever_pacote_assina_e_lista_arquivos(self):  # tmpdir + chave gerada por sign.gerar
    m = escrever_pacote(...); self.assertEqual(sorted(m["files"]), ["escalas.f32","glossario.json","presets.json","vetores.i8","vocab.json"])
    self.assertEqual(m["vetores"]["palavras"], 3); self.assertEqual(m["vetores"]["licenca"], "PDDL 1.0")
    sign.verificar(saida/"manifest.json", pub)  # não levanta
    self.assertEqual((saida/"vetores.i8").stat().st_size, 3*50)
```

- [ ] **Passo 2: rodar e ver falhar** — `cd apps/llms && python -m unittest discover -s pipeline/tests -v` → `ModuleNotFoundError: gerar_pacote`.
- [ ] **Passo 3: implementar** `gerar_pacote.py` com as assinaturas acima (`numpy` para a quantização; `json.dump(ensure_ascii=False)`; `vocab.json` = lista JSON; `vetores.i8` = `q.tobytes()` em ordem C; `escalas.f32` little-endian). `pip install -r pipeline/requirements.txt` na venv de eleições (`apps/eleicoes2026/ai_model/.venv`) ou numa venv nova `apps/llms/.venv` (ignorada).
- [ ] **Passo 4: rodar e ver passar** — mesmo comando → `OK`.
- [ ] **Passo 5: commit** — `git add apps/llms/pipeline apps/llms/.gitignore apps/llms/LICENSE` · `feat(llms): pipeline do pacote GloVe (filtro, int8 por vetor, manifesto assinado)`.

### Tarefa 2: Glossário, presets e fixture assinada

**Files:**
- Create: `apps/llms/contracts/glossario.json`, `apps/llms/contracts/presets.json`, `apps/llms/tools/test_contratos.py`, `apps/llms/web/test/fixtures/palavras_fixture.txt`, `apps/llms/web/test/fixtures/chave_teste.pem` (+ `chave_teste_public.b64`), `apps/llms/web/test/fixtures/data-llms/*` (gerado), `apps/llms/web/test/fixtures/README.md`.

**Interfaces:**
- `glossario.json`: `{ "king": { "pt-BR": "rei", "es": "rey", "de": "König", "fr": "roi", "zh": "国王" }, … }` — ≥ 300 palavras; todas casam `PADRAO_PALAVRA`; todas as 5 traduções presentes; inclui todas as palavras dos presets e dos exemplos do NLU (Tarefa 10).
- `presets.json`: `{ "realeza": ["king","queen","man","woman","prince","princess"], "capitais": ["france","paris","germany","berlin","italy","rome","japan","tokyo","spain","madrid"], "plural": ["cat","cats","dog","dogs","one","two","three","four"], "familia": ["father","mother","son","daughter","brother","sister","uncle","aunt"], "cores": ["red","blue","green","yellow","black","white","orange","purple"], "numeros": ["one","two","three","four","five","six","seven","eight","nine","ten"], "lideres": ["germany","italy","hitler","mussolini","france","napoleon"] }` (nomes e notas no catálogo, `ui.presets.<id>.{nome,nota}`).
- Fixture: pacote com as ~320 palavras de `palavras_fixture.txt` (glossário ∪ presets ∪ `tower`, `building`, `skyscraper`, `castle`), vetores **reais** do GloVe, assinado com `chave_teste.pem` (chave só de teste, pode ficar no Git).

- [ ] **Passo 1: teste** — `tools/test_contratos.py`: todo id do glossário casa o padrão, tem as 5 traduções não vazias; toda palavra de preset está no glossário; não há palavra repetida num preset.
- [ ] **Passo 2: rodar e ver falhar** — `python -m unittest discover -s tools -p "test_*.py"` → arquivo ausente.
- [ ] **Passo 3: escrever** `glossario.json` (≥ 300 entradas; traduções com glossário fixo: zh simplificado; onde a tradução precisa de gênero, a forma mais comum) e `presets.json`.
- [ ] **Passo 4: gerar a fixture** — `python pipeline/sign.py gen --private web/test/fixtures/chave_teste.pem --public web/test/fixtures/chave_teste_public.pem` e `python pipeline/gerar_pacote.py --saida web/test/fixtures/data-llms --fonte gensim --palavras web/test/fixtures/palavras_fixture.txt --chave web/test/fixtures/chave_teste.pem --glossario contracts/glossario.json --presets contracts/presets.json` (primeira execução baixa 66 MB para `pipeline/.cache`). Conferir `python pipeline/sign.py verify web/test/fixtures/data-llms/manifest.json --public web/test/fixtures/chave_teste_public.pem`.
- [ ] **Passo 5: rodar os testes e ver passar**; commit — `feat(llms): glossario (300 palavras, 5 idiomas), presets e fixture assinada do GloVe`.

### Tarefa 3: Casca do site (build, service worker, i18n em 6 idiomas)

**Files:**
- Create (cópias adaptadas da química, `quimica`→`llms`, `Química`→`LLMs`): `web/package.json`, `web/build.mjs`, `web/serve.mjs`, `web/tools/minify.mjs`, `web/src/llms/{index.html,offline.html,sw.js,manifest.webmanifest,manifest.{en,es,de,fr,zh}.webmanifest}`, `web/src/llms/css/{base,app}.css`, `web/src/llms/js/{main,app,dom,prefs,install,icons,texto,formato,theme-init,build-info}.js`, `web/src/llms/js/i18n/{idiomas,index}.js`, `web/src/llms/js/i18n/catalogos/{pt-BR,en,es,de,fr,zh}.js`, `web/src/llms/js/ui/{componentes,config}.js`, `web/test/{support,build.test,sw.test,i18n.test}.mjs`.

**Interfaces:**
- `i18n/idiomas.js`: `IDIOMAS = ['pt-BR','en','es','de','fr','zh']`, `IDIOMA_PADRAO = 'pt-BR'`, `NOMES_IDIOMAS` (`zh: '中文'`), `normalizarIdioma(x)` (`zh-CN`, `zh-Hans`, `zh-TW` → `zh`).
- `i18n/index.js`: mesma API da química (`t`, `tl`, `definirIdioma`, `idiomaAtual`, `onIdioma`, `detectarIdioma`, `CATALOGOS`).
- Catálogo pt-BR com as seções `ui.{idiomas, listas, marca, html, app, inicio, explorador, presets, aprenda, sobre, config, privacidade, nuvem, instalar}` e `respostas.*`; os outros cinco com as mesmas chaves (`revisao: 'pendente'`). As chaves de `explorador`, `respostas` e `aprenda` são preenchidas nas tarefas 9–12; aqui entram `html`, `app`, `config`, `instalar`, `idiomas`, `listas`, `presets`.
- `build.mjs`: `DATA_DIR` (padrão `data/llms`), `OUT_DIR`, `SKIP_VERIFY`, `NO_MINIFY`; verifica o pacote com `pipeline/data_signing_public.b64`; pré-cache de **todos** os arquivos do pacote (`PRECACHE_DADOS`).
- `support.mjs`: `RAIZ`, `FIXTURE = web/test/fixtures/data-llms`, `DADOS`, `BASE = 'http://teste.local/llms/data/'`, `fetchDeDisco(dir, base, contador)`, `CHAVE_TESTE_B64`.
- `app.js`: rotas `/llms/` (início), `/llms/aprenda[/<secao>]`, `/llms/sobre-os-dados`, `/llms/configuracoes`, `/llms/privacidade` (estática); `irPara(rota)`; `iniciarIdioma()`.

- [ ] **Passo 1: testes** — `build.test.mjs` (build com `DATA_DIR=fixture` gera `dist/llms/index.html`, `sw.js` com `PRECACHE_DADOS` contendo `vetores.i8?v=<sha>`; build com manifesto adulterado falha), `sw.test.mjs` (porte do da química: caches `llms-shell-*`, não intercepta `/llms/api/`), `i18n.test.mjs` (paridade de chaves dos 6 catálogos; `normalizarIdioma('zh-Hans') === 'zh'`; `detectarIdioma({navegador:['zh-CN']})` → zh; `fmt(1234.5)` em zh = `1,234.5`, em pt-BR `1.234,5`; varredura: nenhum `/ção|ões|não |você/` em `js/**/*.js` fora de `i18n/catalogos` e `conteudo`).
- [ ] **Passo 2: rodar e ver falhar** — `cd apps/llms/web && npm test`.
- [ ] **Passo 3: copiar e adaptar** os arquivos listados; `index.html` com `hreflang` dos 6 idiomas, `lang="pt-BR"`, meta `theme-color`, sem texto além dos marcadores que `t()` preenche; CSS: paleta própria (azul-escuro `#0C2340` da marca + acento próprio `#2F80ED`), fontes do sistema para CJK (`font-family` com `"Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei"` em `:lang(zh)`).
- [ ] **Passo 4: rodar e ver passar**; `node build.mjs` com `DATA_DIR=test/fixtures/data-llms` e `node serve.mjs` → abrir `http://localhost:<porta>/llms/` e ver a casca em 6 idiomas (`?lang=zh`).
- [ ] **Passo 5: commit** — `feat(llms): casca do site (build, PWA, i18n em seis idiomas com chines)`.

### Tarefa 4: `verify.js` e a classe `Vetores` (`data.js`)

**Files:**
- Create: `web/src/llms/js/verify.js` (cópia da química com `CHAVE_PUBLICA_B64` do app), `web/src/llms/js/data.js`, `web/test/data.test.mjs`.

**Interfaces (`data.js`):**
- `class ErroDados extends Error { constructor(codigo: 'manifesto'|'assinatura'|'hash'|'rede', detalhe) }`
- `class Vetores`:
  - `static async carregar({ fetch, base = '/llms/data/', chavePublicaB64 }) : Promise<Vetores>` — baixa `manifest.json` + `manifest.sig`, verifica, baixa os 5 arquivos com `?v=<sha256>`, confere SHA-256 (quando `crypto.subtle` existir) e tamanho.
  - `n: number`, `dimensoes: 50`, `manifesto`, `glossario: Record<string, Record<string,string>>`, `presets: Record<string, string[]>`.
  - `indice(palavra: string): number` (−1 se ausente; normaliza para minúsculas e tira acentos/espaços nas pontas), `palavra(i): string`.
  - `vetor(i): Float32Array` (desquantizado, 50), `norma(i): number` (cache).
  - `cosseno(i, j): number`; `cossenoVetor(v: Float32Array, i): number`.
  - `vizinhos(v: Float32Array, n = 10, excluir: number[] = []): {i, palavra, cos}[]` (varre todo o vocabulário em int8).
  - `analogia(a, b, c: number, n = 5): { vetor: Float32Array, resultados: {i, palavra, cos}[] }` — `vetor = v(a) − v(b) + v(c)`, exclui a, b, c.
  - `direcao(w1, w2: number): Float32Array`; `produtoEscalar(d: Float32Array, indices: number[]): {i, palavra, valor}[]` (ordem decrescente).
  - `sugerir(texto: string, n = 5): string[]` — prefixo (lista ordenada alfabeticamente construída uma vez) e, se < n, distância de edição ≤ 2 nas 20 000 primeiras; depois tradução pelo glossário do idioma dado em `sugerirTraduzindo(texto, idioma)` → `{ en, traduzida: true } | null`.
  - `matriz(indices: number[]): Float32Array[]`.

- [ ] **Passo 1: testes** (fixture): `carregar` com `fetchDeDisco` resolve e `n === 320±`; manifesto com `sig` trocada → `ErroDados('assinatura')`; `indice('King ') === indice('king')`; `cosseno(king, queen) > cosseno(king, cat)`; `vizinhos(vetor(tower))` contém `building` ou `skyscraper` nos 10; `analogia(king, man, woman).resultados[0..4]` contém `queen`; `produtoEscalar(direcao(cats, cat), [dogs, dog])` tem `dogs` antes de `dog`; `sugerir('kin')` começa com `king`; `sugerir('quenn')` contém `queen`; `sugerirTraduzindo('rei','pt-BR')` → `{en:'king', traduzida:true}`; `indice('ice cream') === -1`.
- [ ] **Passo 2: rodar e ver falhar.**
- [ ] **Passo 3: implementar** (`Int8Array` sobre o `ArrayBuffer`; produto escalar em laço simples; normas em `Float32Array(n)` preenchidas uma vez).
- [ ] **Passo 4: rodar e ver passar**; medir `vizinhos` com `console.time` na fixture (só sanidade).
- [ ] **Passo 5: commit** — `feat(llms): carga verificada do pacote e operacoes sobre os vetores (vizinhos, analogia, direcao)`.

### Tarefa 5: `projecao.js` (variância e PCA)

**Files:** Create `web/src/llms/js/projecao.js`, `web/test/projecao.test.mjs`.

**Interfaces:**
- `variancias(M: Float32Array[]): number[]` (populacional, por dimensão).
- `eixosPorVariancia(M): number[]` — 3 índices por variância decrescente (empate: menor índice); `M.length === 1` → 3 maiores |valor|; `[]` → `[]`.
- `pca3(M): { coords: {x,y,z}[], autovalores: number[3], explicada: number[3] }` — exige `M.length ≥ 3`; iteração de potência com deflação (≤ 200 iterações, tolerância 1e-9); sinal: maior componente em módulo positiva; `explicada[i] = λi / traço × 100`.
- `projetar(M, modo: 'dimensoes'|'pca'): { pontos: {x,y,z}[], eixos: {rotulo: string, indice?: number, explicada?: number}[], modo, aviso?: 'pcaPoucasPalavras' }` — `pca` com `M.length < 3` cai para `dimensoes` com `aviso`.

- [ ] **Passo 1: testes**: `variancias` de `[[1,2,3],[3,2,1]]` → `[1,0,1]`; `eixosPorVariancia` com 50 dims em que só as dims 7, 21 e 40 variam → `[7,21,40]` ordenados pela variância; uma palavra → 3 maiores |valor|; `pca3` de 100 pontos gerados como `a·u + b·w + ruído 1e-3` (u ⟂ w) → `explicada[0] + explicada[1] > 99`, `autovalores[0] ≥ autovalores[1] ≥ autovalores[2] ≥ 0`, coords centradas (média ≈ 0); `projetar(M2, 'pca').aviso === 'pcaPoucasPalavras'`; rótulos `d7` e `PC1 · 41 %` (formato do rótulo cru em inglês técnico `PC1`, `d7`; a interface traduz "·").
- [ ] **Passo 2: falhar. Passo 3: implementar. Passo 4: passar.**
- [ ] **Passo 5: commit** — `feat(llms): projecao em 3 eixos por variancia e PCA (iteracao de potencia)`.

### Tarefa 6: `cena3d.js` (Canvas 2D)

**Files:** Create `web/src/llms/js/cena3d.js`, `web/test/cena3d.test.mjs`.

**Interfaces:**
- Puras: `rotacao(yaw, pitch): number[9]`, `aplicar(R, p: {x,y,z}): {x,y,z}`, `ajustarEscala(pontos, largura, altura, margem = 48): number` (0 → escala 1; pontos vazios → 1), `ordenarPorProfundidade(itens: {z}[]): itens[]`, `posicaoRotulo(p2d, ocupados: {x,y,w,h}[]): {x,y}` (desloca para baixo em passos de 14 px até não colidir, máx. 4 tentativas).
- `class Cena3D`:
  - `constructor(canvas: HTMLCanvasElement, { tema: () => 'claro'|'escuro', reduzirMovimento: boolean, aoDestacar: (indicePonto|null) => void })`
  - `definir({ pontos: {x,y,z,rotulo,destaque?}[], eixos: {rotulo}[], setas: {de: number, para: number, rotulo?}[] })`
  - `girar(dyaw, dpitch)`, `zoom(fator)`, `reiniciar()` (yaw 0,6, pitch 0,35, zoom 1), `render()`, `redimensionar()`, `destruir()`.
  - Eventos: pointer (arrastar gira; pinça = zoom), roda, duplo toque (reiniciar), teclado (← → ↑ ↓ giram 0,1 rad; `+`/`−` zoom) quando o canvas tem foco (`tabindex=0`); `pointermove` sem arrastar destaca o ponto a ≤ 12 px.
  - Desenho: eixos pela origem com marcas em −1, 0, +1 (nas unidades da projeção, após escala) e rótulo na ponta; pontos (raio 5, destacado 7); setas com cabeça; rótulos com `posicaoRotulo`; cores do tema via `getComputedStyle` (variáveis `--cor-ponto`, `--cor-eixo`, `--cor-seta`, `--cor-texto`).

- [ ] **Passo 1: testes (Node, só as puras)**: `rotacao(0,0)` = identidade; `aplicar(rotacao(Math.PI/2,0), {x:1,y:0,z:0})` ≈ `{x:0,y:0,z:-1}` (ou a convenção escolhida, fixada no teste); `ajustarEscala([], 300, 200) === 1`; `ajustarEscala([{x:1,y:0,z:0},{x:-1,y:0,z:0}], 0, 0) === 1` (sem `NaN`/`Infinity`); `ajustarEscala(...,400,400)` dá `(400−2·48)/2`; `ordenarPorProfundidade` ordena do mais distante ao mais próximo; `posicaoRotulo` desvia de um retângulo ocupado.
- [ ] **Passo 2: falhar. Passo 3: implementar** (as puras exportadas; a classe só usa DOM/Canvas, não é testada em Node).
- [ ] **Passo 4: passar**; abrir uma página de teste manual (`web/tools/cena-demo.html`, não publicada: build ignora `tools/`) com 6 pontos e girar com mouse e toque (emulação do Chrome).
- [ ] **Passo 5: commit** — `feat(llms): cena 3D em Canvas 2D (orbita, zoom, setas, rotulos sem colisao)`.

### Tarefa 7: Estado do explorador (`explorador.js` sem DOM) e tela

**Files:** Create `web/src/llms/js/explorador.js` (estado puro), `web/src/llms/js/ui/explorador.js` (DOM), `web/test/explorador.test.mjs`; Modify `web/src/llms/js/ui/inicio.js` (criado na Tarefa 11; aqui nasce com o explorador e sem assistente) e catálogos (`ui.explorador.*`, `ui.presets.*`).

**Interfaces (`explorador.js`):**
- `const MAX_PALAVRAS = 40`
- `criarEstado(): { palavras: number[], modo: 'dimensoes'|'pca', diferencas: boolean, destaque: number|null, analogia: {a,b,c}|null, direcao: {w1,w2,lista: number[]}|null }`
- `adicionar(estado, indices: number[]): { estado, recusadas: number[] }` — ignora repetidos e −1; acima de 40 recusa o excedente.
- `remover(estado, i)`, `limpar(estado)`, `alternarModo(estado)`, `definirAnalogia(estado, a, b, c)` (a ≠ c, senão `null`), `definirDirecao(estado, w1, w2, lista)`.
- `cenaDe(estado, vetores: Vetores): { pontos, eixos, setas, aviso?, tabela: {palavra, coords: number[3]}[] }` — usa `projetar` (Tarefa 5); com `diferencas`, setas entre pares consecutivos escolhidos; com analogia, inclui o ponto virtual `a − b + c` (rótulo `?`) e setas b→a e c→?.
- `paraUrl(estado, vetores): string` (`palavras=king,queen&modo=pca`), `deUrl(params: URLSearchParams, vetores): estado` — saneia: só palavras do vocabulário, ≤ 40, `modo` ∈ {dimensoes, pca}.

- [ ] **Passo 1: testes**: `adicionar` com `[k, k, -1, q]` → palavras `[k, q]`, `recusadas [-1]`; 41 palavras → 40 e 1 recusada; `definirAnalogia(e, k, m, k)` → `null`; `cenaDe` com 1 palavra → 1 ponto e eixos de |valor|; com analogia → `pontos.length === palavras.length + 1` e 2 setas; `deUrl('palavras=king,<script>,zzzz,queen&modo=x')` → `[king, queen]`, modo `dimensoes`; `paraUrl(deUrl(s))` estável.
- [ ] **Passo 2–4: falhar, implementar, passar.**
- [ ] **Passo 5: tela** `ui/explorador.js`: `viewExplorador(raiz, { vetores, estado, aoMudar })` monta canvas (Tarefa 6) + painel (chips removíveis, campo com `datalist`/lista de sugestões de `sugerir`, botões de modo e "mostrar diferenças", presets com nome e nota do catálogo, tabela de coordenadas com `aria-describedby` no canvas, vizinhos da palavra destacada, formulário de analogia a − b + c, formulário de direção com lista); todo número por `fmt`; rótulo `ui.explorador.calculadoNoAparelho` ("Calculado no aparelho a partir do GloVe (PDDL 1.0)"); grava `paraUrl` em `history.replaceState`.
- [ ] **Passo 6: rodar o site com a fixture** e conferir no navegador: adicionar, remover, PCA, setas, analogia, URL.
- [ ] **Passo 7: commit** — `feat(llms): explorador de embeddings (estado puro, painel, presets, analogia, direcao, estado na URL)`.

### Tarefa 8: Léxico em 6 idiomas e gerador

**Files:** Create `contracts/lexico/{pt-BR,en,es,de,fr,zh}.json`, `tools/gerar_lexico.py` (cópia adaptada: `SAIDA = web/src/llms/js/nlu/lex`, `IDIOMAS` com zh), `web/src/llms/js/nlu/lex/index.js` (cópia adaptada: `IDIOMAS_LEXICO`, `LEXICOS_BRUTOS`, `compilar`, `lexico(idioma)`), `web/test/lexico.test.mjs`.

**Interfaces (chaves do léxico, iguais nos 6):**
- `idioma`, `versao: 1`, `descricao`, `intencoes: { saudacao, ajuda, sobreDados, fontes, mostrar, analogia, vizinhos, similaridade, direcao, conceito, preset, limpar }` (listas de regex como texto), `pistas: { separadorLista, menos, mais, estaPara, aspas, continuacao, plural }`, `conceitos: { embedding: [...], token: [...], atencao, mlp, softmax, temperatura, transformer, parametro, proximoToken, dimensao, vetor, cosseno }`, `presets: { realeza: [...], capitais, plural, familia, cores, numeros, lideres }`, `stopPalavras: [...]`, `semFronteira: boolean` (true só em zh: o compilador não envolve com `\b`), `normalizarAcentos: boolean` (false em zh).

- [ ] **Passo 1: testes** (`lexico.test.mjs`, porte): gerados em dia (`python tools/gerar_lexico.py --check`), mesmas chaves nos 6, toda regex compila em JS e não usa construções proibidas (lookbehind variável, `\p{}` sem `u`), zh com `semFronteira: true`.
- [ ] **Passo 2: falhar. Passo 3: escrever** os 6 JSON (pt-BR primeiro; en/es/de/fr/zh com as mesmas intenções; zh por termos: "显示", "加上", "类比", "相似", "邻近", "方向", "什么是"), rodar `python tools/gerar_lexico.py`.
- [ ] **Passo 4: passar. Passo 5: commit** — `feat(llms): lexico do interpretador em seis idiomas e gerador`.

### Tarefa 9: Catálogos completos e `conteudo/` (seis seções próprias)

**Files:** Create `web/src/llms/js/conteudo/{pt-BR,en,es,de,fr,zh}.js`, `web/src/llms/js/conteudo/index.js`, `web/src/llms/js/ui/aprenda.js`, `web/test/conteudo.test.mjs`; Modify os 6 catálogos (`ui.aprenda.*`, `ui.explorador.*` completos, `ui.sobre.*`, `respostas.*`).

**Interfaces:**
- `conteudo/<idioma>.js`: `export default { revisao: 'pendente'|'humana', secoes: [ { id: 'modelo'|'tokens'|'embeddings'|'atencao'|'camadas'|'softmax', titulo, resumo, paragrafos: string[] (texto; `**negrito**` e `*ênfase*` simples), experimente: { texto, acao: { tipo: 'preset'|'analogia'|'direcao', ...} }[], referencias: { id: 'glove2014'|'word2vec2013'|'transformer2017', texto }[] } ] }`.
- `conteudo/index.js`: `secoes(idioma)`, `secao(idioma, id)`, `trechosPara(idioma, ids: string[]): {id, texto}[]` (id = `<idioma>:<secao>`, texto = parágrafos unidos, ≤ 2 000 caracteres por trecho).
- `ui/aprenda.js`: `viewAprenda(raiz, { idioma, secaoId, aoAgir })` — índice + seção; "Experimente" chama `aoAgir(acao)` que leva ao explorador.

- [ ] **Passo 1: testes**: 6 arquivos com os mesmos 6 ids na mesma ordem; cada seção com ≥ 3 parágrafos e ≥ 1 `experimente`; nenhuma ocorrência (case-insensitive) de `youtube`, `3blue1brown`, `3b1b`, `vídeo|video|视频` em nenhum conteúdo; `trechosPara('pt-BR',['embeddings'])[0].texto.length ≤ 2000`; referências só dos 3 ids permitidos.
- [ ] **Passo 2: falhar. Passo 3: escrever** o conteúdo em pt-BR (autoria própria; a seção `embeddings` explica dimensões, direções, aritmética, cosseno/produto escalar e por que projetar; `softmax` traz a fórmula em texto `p_i = e^(z_i/T) / Σ e^(z_j/T)`), traduzir para os 5 idiomas; completar os catálogos.
- [ ] **Passo 4: passar (inclui o teste de paridade da Tarefa 3). Passo 5: commit** — `feat(llms): seis secoes didaticas proprias em seis idiomas e tela Aprenda`.

### Tarefa 10: NLU local (`nlu.js`) e casos golden

**Files:** Create `web/src/llms/js/nlu.js`, `contracts/nlu_golden_cases.json`, `web/test/nlu-golden.test.mjs`.

**Interfaces:**
- `INTENTS = ['SAUDACAO','AJUDA','SOBRE_DADOS','FONTES','MOSTRAR','ANALOGIA','VIZINHOS','SIMILARIDADE','DIRECAO','CONCEITO','PRESET','LIMPAR','DESCONHECIDA']`
- `extrairPalavras(texto, lex, vetores, idioma): { palavras: {en, original, traduzida: boolean}[], desconhecidas: string[] }` — candidatos: entre aspas, ou tokens que não são stopPalavras; cada um → `vetores.indice` (minúsculas, sem acento) → senão `sugerirTraduzindo(original, idioma)`; "ice cream" vira dois tokens.
- `parse(pergunta, lex, { vetores, idioma, contexto = null }): { intencao, palavras, desconhecidas, analogia: {a,b,c}|null, direcao: {w1,w2}|null, preset: string|null, conceito: string|null, continuacao: boolean }` — ordem: SAUDACAO/AJUDA/SOBRE/FONTES/LIMPAR → PRESET → ANALOGIA (`a - b + c`, `a está para b como c está para`) → DIRECAO (`cats - cat`, "direção do plural" = preset plural) → VIZINHOS → SIMILARIDADE (2 palavras + pista) → CONCEITO → MOSTRAR (≥ 1 palavra conhecida) → DESCONHECIDA. Continuação (`pistas.continuacao` no início e ≤ 6 palavras, com `contexto` de MOSTRAR/PRESET) → MOSTRAR com `continuacao: true`.
- Golden: `[{ idioma, q, intencao, palavras?: string[] (en), analogia?, direcao?, preset?, conceito? }]`, ≥ 30 por idioma.

- [ ] **Passo 1: testes**: golden 100 % por idioma; `parse('King, Queen')` → MOSTRAR `[king, queen]`; `parse('mostre rei e rainha','pt-BR')` → `[king(traduzida), queen(traduzida)]`; `parse('ice cream')` → `[ice, cream]`; `parse('xqzv')` → DESCONHECIDA com `desconhecidas ['xqzv']`; `parse('e queen?', contexto MOSTRAR)` → MOSTRAR continuacao; `parse('显示 king 和 queen','zh')` → MOSTRAR; `parse('king - man + woman')` → ANALOGIA; `parse('o que é um token?')` → CONCEITO `token`.
- [ ] **Passo 2: falhar. Passo 3: implementar `nlu.js` e escrever o golden** (≥ 180 casos). **Passo 4: passar.**
- [ ] **Passo 5: commit** — `feat(llms): interpretador local por regras com glossario e golden em seis idiomas`.

### Tarefa 11: Respostas montadas e tela Início (assistente padrão)

**Files:** Create `web/src/llms/js/answers.js`, `web/src/llms/js/ui/inicio.js` (assistente + explorador), `web/test/answers.test.mjs`, `web/test/prefs-historico.test.mjs` (porte); Modify catálogos (`respostas.*`).

**Interfaces:**
- `responder(parsed, { vetores, estado, idioma, conteudo }): { intencao, titulo, blocos: {tipo: 'texto'|'lista'|'tabela'|'aviso', ...}[], acoes: ({tipo:'adicionar', indices}|{tipo:'analogia', a,b,c}|{tipo:'direcao', w1,w2,lista}|{tipo:'preset', id}|{tipo:'limpar'}|{tipo:'irPara', rota})[], sugestoes: string[] (≤ 6), origem: 'LOCAL', dadosDe: string (generatedAt) }`.
- `rotuloOrigem(r)`: `'LOCAL'` → `t('respostas.origem.local')` ("Montada no aparelho • dados GloVe de {data}"); `'GENERATIVA'` → `t('respostas.origem.generativa', {modelo})`.
- `ui/inicio.js` (porte do padrão): campo que cresce, limpo ao enviar, histórico ↑/↓ (`prefs.historicoPerguntas`, 50 × 300), chips de sugestão, cartão de resposta com origem/data, copiar (texto plano com origem e `https://saibatudo.net/llms/`), fechar (limpa contexto), relatar (link para issue do GitHub com a pergunta no título), `aria-live`, spinner `role=status`, "não entendi" com exemplos e sugestões de `sugerir`; abaixo, o explorador (Tarefa 7) que recebe as `acoes`.

- [ ] **Passo 1: testes**: MOSTRAR gera ação `adicionar` e texto com as palavras (traduzidas rotuladas "rei → king"); ANALOGIA lista 5 resultados com cossenos formatados pelo idioma; DESCONHECIDA ecoa a pergunta e traz ≤ 6 sugestões; CONCEITO devolve o resumo da seção e ação `irPara`; nenhum texto fixo em português (varredura da Tarefa 3 cobre `answers.js`); histórico sem repetir a última.
- [ ] **Passo 2–4.** **Passo 5: conferir no navegador** os itens obrigatórios de `docs/PADRAO_ASSISTENTE.md` §1–§5.
- [ ] **Passo 6: commit** — `feat(llms): respostas montadas no aparelho e tela Inicio no padrao do assistente`.

### Tarefa 12: Sobre os dados, configurações, privacidade em 6 idiomas, manifestos e marca

**Files:** Create `web/src/llms/js/ui/sobre.js`, `web/src/llms/privacidade/{index,en,es,de,fr,zh}.html`, `docs/PRIVACIDADE.{pt-BR,en,es,de,fr,zh}.md`, `web/test/privacidade.test.mjs`, `brand/llms-icon.svg`, `web/tools/gerar_icones.mjs` (cópia adaptada), `brand/png/*`; Modify `ui/config.js` (tema, tamanho do texto, idioma, instalar, modo automático da nuvem, apagar dados, limpar histórico), manifestos.

- [ ] **Passo 1: teste** `privacidade.test.mjs`: cada `privacidade/<idioma>.html` contém o texto de `docs/PRIVACIDADE.<idioma>.md` (parágrafos normalizados), versão `1.0` e data; política diz: nada sai sem toque; nuvem opt-in envia pergunta, idioma, contexto do gráfico e trechos; IP só para limite; sem cookies.
- [ ] **Passo 2–4**: escrever a política (pt-BR → 5 traduções), `sobre.js` (fonte GloVe + PDDL + referência, versão do pacote, assinatura verificada, licenças do código e da base Qwen3, `revisao: pendente` dos catálogos), ícone (eixos 3D com três pontos, cores da marca) e PNGs por `node web/tools/gerar_icones.mjs`.
- [ ] **Passo 5: commit** — `feat(llms): sobre os dados, configuracoes, politica de privacidade em seis idiomas e marca`.

### Tarefa 13: API — `health.js`, `_lib` e verificador de fidelidade

**Files:** Create `api/package.json`, `api/health.js`, `api/_lib/{http,cache,ratelimit,compartilhado,validate,dadopessoal,config}.js` (cópias adaptadas: `validate.js` ganha `lang` ∈ IDIOMAS obrigatório em `validateAskBody`; `config.js` sem Modal/NLU: `askEnabled`, `hfAskUrl`, `hfToken`, `askHfDailyBudget` (padrão 200), `askHfTimeoutMs` (25000), `allowedOrigins`, `askModelVersion`), `api/_lib/fidelidade.js`, `api/test/{_helpers,health,fidelidade}.test.mjs`, `api/README.md`.

**Interfaces:**
- `validateAskBody(body): { ok: true, dados: { q, lang, context, trechos: {id, texto}[], iid, client } } | { ok: false, error }` — `q` 3–400 caracteres, `context` ≤ 1 500, `trechos` ≤ 3 × 2 000, `lang` em IDIOMAS.
- `RODAPES = { 'pt-BR': 'texto gerado por IA', en: 'AI-generated text', es: 'texto generado por IA', de: 'KI-generierter Text', fr: 'texte généré par IA', zh: 'AI生成的文本' }` (o verificador exige o trecho, sem distinguir maiúsculas).
- `verificarFidelidade(resposta: string, dados): { ok: true } | { ok: false, motivo: 'numero'|'rodape'|'escrita'|'dadopessoal'|'tamanho' }` — (a) número de 2+ dígitos ou decimal fora de `q ∪ context ∪ trechos` (normalização `1.000`/`1,000` como na química: copiar `numerosDe`/`semRuido` de `ground.js`); (b) sem rodapé do idioma; (c) `lang === 'zh'` sem nenhum caractere `\p{Script=Han}`, ou `lang !== 'zh'` com ≥ 5 caracteres Han; (d) `temDadoPessoal`; (e) > 3 000 caracteres.
- `health.js`: `{ ok, version, ask: 'on'|'off', model, data: {version, generatedAt, packageAgeDays}|null, time }` lendo `data/llms/manifest.json` (`includeFiles`).

- [ ] **Passo 1: testes**: `fidelidade`: resposta com "0,87" presente no contexto → ok; "0,91" ausente → `numero`; sem rodapé → `rodape`; zh sem Han → `escrita`; pt com "你好世界再见" → `escrita`; CPF no texto → `dadopessoal`. `validateAskBody` sem `lang` → erro. `health` com manifesto da fixture → `data.version` igual.
- [ ] **Passo 2–4.** **Passo 5: commit** — `feat(llms): API health e verificador de fidelidade (numeros, rodape, escrita do idioma)`.

### Tarefa 14: `ask-handler.js`, `ask.js` e o Space (`backend/hf_space_llms`)

**Files:** Create `api/_lib/ask-handler.js` (porte sem Modal), `api/ask.js`, `api/test/ask-handler.test.mjs`, `backend/hf_space_llms/{app.py,ask_core.py,requirements.txt,README.md,publicar.py,test_ask_core.py}`, `vercel.json`, `.vercelignore`.

**Interfaces:**
- `ask_core.py`: `MAX_NEW_TOKENS = 350`; `RODAPES` (mesmo dicionário da Tarefa 13); `NOMES_IDIOMA = {'pt-BR': 'português do Brasil', 'en': 'English', …, 'zh': '简体中文'}`; `validate_question(q) -> str`; `validate_lang(lang) -> str`; `build_messages(question, lang, context, trechos) -> list[dict]` (system: professor de como funcionam modelos de linguagem; responde só em `NOMES_IDIOMA[lang]`; fatos e números só do CONTEXTO e dos TRECHOS; não inventa coordenadas nem cossenos; fora do tema → uma frase de recusa; termina com `RODAPES[lang]`); `build_ask_prompt(...) -> str` via `tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)`.
- `app.py`: igual ao da química com entradas `[pergunta, idioma, contexto, trechos]`, `api_name="ask"`, saída `{ok, answer, model, gpu_s}`, `ASK_MODEL_ID` padrão `Qwen/Qwen3-4B-Instruct-2507`, `ASK_MODEL_LABEL` padrão `Qwen3-4B`, temperatura 0,2, `GPU_SEGUNDOS = 45`.
- `publicar.py --space franciscoaleixo/saibatudo-llms [--hardware zero-a10g] [--teste]`: cria o Space privado (`huggingface_hub.create_repo(repo_type="space", space_sdk="gradio", private=True)`), envia a pasta, grava as variáveis, espera RUNNING, chamada de teste em pt e zh. Token de escrita em `secrets/hf_token_write.txt` (do repositório raiz) ou `hf auth login`.
- `chamarHfAsk(cfg, dados, { doFetch, budget })` (porte: `POST {hfAskUrl}/gradio_api/call/ask` com `Authorization: Bearer {hfToken}`, depois `GET …/{event_id}` lendo SSE com `lerSseGradio`), `createAskHandler(deps)`, resposta `{ ok: true, answer, model, cached }` | `422 { ok: false, error: 'rejected', motivo }` | `503 { error: 'disabled' }` | `429`.
- `vercel.json`: rewrites e headers como na química com `/llms/`; `functions`: `api/health.js` `includeFiles: data/llms/manifest.json`; `api/ask.js` `maxDuration: 50`.

- [ ] **Passo 1: testes** — Node: Space simulado devolve `answer` com rodapé → 200 com `model: 'Qwen3-4B'`; sem rodapé → 422 `rejected`; `ASK_ENABLED` ausente → 503; limite por IP → 429; cache: segunda chamada igual `cached: true`; corpo sem `lang` → 400. Python (`test_ask_core.py`, sem baixar modelo): `build_messages` contém `NOMES_IDIOMA['zh']` e o rodapé zh; `validate_question('ab')` levanta `ValueError`.
- [ ] **Passo 2–4.** **Passo 5: commit** — `feat(llms): /api/ask com Space do Hugging Face (Qwen3-4B) e Space llms`.
- [ ] **Passo 6 (operação, gasta ZeroGPU):** `python backend/hf_space_llms/publicar.py --space franciscoaleixo/saibatudo-llms --teste` → anotar a URL do Space (`https://franciscoaleixo-saibatudo-llms.hf.space`) para a Vercel.

### Tarefa 15: Cliente da nuvem (`nuvem.js`) e integração na tela

**Files:** Create `web/src/llms/js/nuvem.js`, `web/test/nuvem.test.mjs`; Modify `ui/inicio.js`, `ui/config.js`, catálogos (`ui.nuvem.*`: consentimento, botão, indisponível, erro, rótulo).

**Interfaces:**
- `ENDPOINT_NUVEM = '/llms/api/ask'`, `TIMEOUT_NUVEM_MS = 30_000`.
- `contextoDoEstado(estado, vetores, idioma): string` — ≤ 1 500 caracteres: palavras, modo e eixos, coordenadas com 2 casas, vizinhos/analogia/direção quando existirem (números com ponto decimal, independentes do idioma, para o verificador).
- `trechosDaPergunta(parsed, idioma): {id, texto}[]` — escolhe ≤ 3 ids de seção pelo `conceito` do parse ou por palavras-chave da pergunta (padrão `['embeddings']`) e chama `trechosPara(idioma, ids)` de `conteudo/index.js` (Tarefa 9).
- `class NuvemExplica { constructor({ fetch, prefs }) ; async perguntar({ q, idioma, contexto, trechos, sinal }): { ok: true, answer, model } | { ok: false, motivo: 'desligada'|'cota'|'timeout'|'rejeitada'|'rede' } }`.
- Resposta GENERATIVA na tela: bloco "Texto gerado por IA ({modelo}) • Nuvem — pode conter erros" (`rotuloOrigem`), abaixo da resposta local, que permanece.

- [ ] **Passo 1: testes**: `contextoDoEstado` ≤ 1 500 e contém as palavras; `perguntar` com fetch simulado 200 → `{ok, answer, model:'Qwen3-4B'}`; 422 → `rejeitada`; 503 → `desligada`; timeout → `timeout`; `iid` vem de `prefs.installId()`; corpo tem `lang`.
- [ ] **Passo 2–4.** **Passo 5: tela**: botão "Perguntar à IA na nuvem" após cada resposta e no "não entendi", diálogo de consentimento padrão (por pergunta; modo automático em configurações, desligado por padrão), estados de indisponível com aviso claro.
- [ ] **Passo 6: commit** — `feat(llms): IA na nuvem opt-in no assistente, com rotulo do modelo e contexto do grafico`.

### Tarefa 16: Workflows, validador e e2e

**Files:** Create `.github/workflows/llms-web-ci.yml`, `.github/workflows/llms-data-refresh.yml`, `apps/llms/tools/test_workflows.py` (cópia com `glob("llms-*.yml")`), `apps/llms/web/tools/screenshots.mjs` (adaptado: cenários `inicio`, `explorador-preset`, `pca`, `aprenda`, `sobre`, `zh`, `offline`), `apps/llms/web/test/e2e.test.mjs`.

- `llms-web-ci.yml`: `on: push/pull_request paths: apps/llms/**, .github/workflows/llms-web-ci.yml`; `defaults.run.working-directory: apps/llms`; jobs: Node 22 (`npm test` em web e api, `node web/build.mjs` com `DATA_DIR=web/test/fixtures/data-llms`), Python 3.12 (`pip install -r pipeline/requirements.txt pyyaml==6.0.2` — gensim só é importado pelo CLI, não pelos testes; `unittest` de pipeline, tools, backend), verificação `python pipeline/sign.py verify data/llms/manifest.json --public pipeline/data_signing_public.pem` (só se `data/llms/manifest.json` existir).
- `llms-data-refresh.yml`: `workflow_dispatch` apenas; `concurrency: llms-data-refresh`; env `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_LLMS }}`, `SAIBATUDO_ASK_ENABLED: ${{ vars.LLMS_ASK_ENABLED }}`; passos: verificar assinatura do pacote versionado, `node web/build.mjs`, `npm i -g vercel@latest`, `vercel deploy --prod --yes --token "${{ secrets.VERCEL_TOKEN_TIME }}"` com 3 tentativas, depois `curl -fsS https://saibatudo-llms.vercel.app/llms/api/health`.

- [ ] **Passo 1: testes** — `python -m unittest discover -s tools -p "test_workflows.py"` falha (sem arquivos); `e2e.test.mjs` pulado sem `E2E=1`.
- [ ] **Passo 2: escrever os workflows e o screenshots.mjs.** **Passo 3:** `python -m unittest discover -s tools` passa; `E2E=1 npm test` passa no Chrome local (sem erro de console nem CSP; offline após a primeira carga).
- [ ] **Passo 4: commit** — `ci(llms): workflows llms-web-ci e llms-data-refresh, validador e verificacao no navegador`.

### Tarefa 17: Documentos do app e da raiz

**Files:** Create `apps/llms/{README.md,CLAUDE.md}`, `apps/llms/docs/{ARCHITECTURE,DATA_CONTRACT,I18N,FONTES_E_LICENCAS,OPERACAO,PLANO,PROJECT_MEMORY}.md`; Modify `CLAUDE.md` (raiz: linha do app em "Uma pasta por app" e nota no item 8), `docs/PADRAO_ASSISTENTE.md` (linha "LLMs segue o padrão desde …").

- [ ] **Passo 1:** escrever: `CLAUDE.md` (regras do app: GloVe PDDL, inglês, nada do vídeo, nuvem só explica, zh, comandos de teste e publicação), `ARCHITECTURE.md` (fluxo da pergunta: NLU → ações → explorador; nuvem), `DATA_CONTRACT.md` (os 7 arquivos, byte a byte), `I18N.md` (aponta para o da química + regras do zh), `FONTES_E_LICENCAS.md`, `OPERACAO.md` (publicar, variáveis, Space, cota), `PLANO.md` (S1–S5), `PROJECT_MEMORY.md` (entrada 25/10 com as decisões do mantenedor).
- [ ] **Passo 2:** `node --test "tests/*.test.mjs"` na raiz continua verde (nada de rota mudou ainda).
- [ ] **Passo 3: commit** — `docs(llms): guia do app, arquitetura, contrato de dados, i18n com chines, fontes, operacao e plano S1-S5`.

### Tarefa 18: Pacote real, projeto Vercel e primeiro deploy

**Files:** Create `apps/llms/secrets/data_signing_key.pem` (ignorado), `apps/llms/pipeline/data_signing_public.{pem,b64}`, `apps/llms/data/llms/*` (commit só de dados), `apps/llms/web/src/llms/js/verify.js` (chave pública real).

- [ ] **Passo 1:** `python pipeline/sign.py gen --private secrets/data_signing_key.pem --public pipeline/data_signing_public.pem`; copiar o `.b64` para `CHAVE_PUBLICA_B64` em `verify.js`.
- [ ] **Passo 2:** `python pipeline/gerar_pacote.py --saida data/llms --fonte gensim --limite 100000 --chave secrets/data_signing_key.pem --glossario contracts/glossario.json --presets contracts/presets.json`; conferir `vetores.i8` = 5 000 000 bytes, `vocab.json` com 100 000 palavras e `sign.py verify`.
- [ ] **Passo 3:** `DATA_DIR=data/llms node web/build.mjs` e `npm test` (os testes que usam `DADOS_REAIS` passam).
- [ ] **Passo 4: commits** — `feat(llms): chave publica do pacote` (código) e `data(llms): pacote GloVe 100k int8 assinado` (dados; < 300 arquivos).
- [ ] **Passo 5 (agente, API da Vercel com `secrets/vercel_token_time.txt`):** `POST https://api.vercel.com/v11/projects?teamId=team_OtdpApo2TX8QxlO1xUuJIERJ` `{ "name": "saibatudo-llms", "framework": null }`; gravar variáveis **não secretas** de produção: `ALLOWED_ORIGINS=https://saibatudo.net,https://saibatudo-llms.vercel.app`, `HF_ASK_SPACE_URL=<URL do Space>`, `ASK_MODEL_VERSION=qwen3-4b-base`, `ASK_ENABLED=1`, `HF_ASK_DAILY_BUDGET=200`. Anotar o `id` do projeto.
- [ ] **Passo 6 (mantenedor):** gravar `HF_TOKEN` (leitura) no projeto Vercel `saibatudo-llms`; no GitHub, `DATA_SIGNING_KEY_LLMS` (conteúdo do `.pem`) e `VERCEL_PROJECT_ID_LLMS`; variável `LLMS_ASK_ENABLED=1`.
- [ ] **Passo 7:** `gh workflow run llms-data-refresh.yml`; `gh run watch`; `curl https://saibatudo-llms.vercel.app/llms/api/health` → `"ok":true,"ask":"on"`.
- [ ] **Passo 8 (teste ao vivo, Playwright):** abrir `/llms/?lang=pt-BR`, `?lang=en`, `?lang=zh`: preset realeza, PCA, analogia; uma pergunta à nuvem em pt e zh com consentimento; sem erro de console. Registrar resultado em `docs/PROJECT_MEMORY.md`; commit `docs(llms): primeiro deploy em saibatudo-llms.vercel.app`.

### Tarefa 19 (só em 27/10/2026 ou depois): domínio, home em chinês e cartão

**Files:** Modify `apps/eleicoes2026/vercel.json` (6 rewrites: `/llms`, `/llms/`, `/llms/:path*` → `https://saibatudo-llms.vercel.app/llms/…`; `/zh`, `/zh/`, `/zh/:path*` → `https://saibatudo-portal.vercel.app/zh/…`), `portal/src/sw.js` (exclusão `/llms`), `portal/src/portal/i18n/index.js` (`IDIOMAS` + `'zh'`), Create `portal/src/portal/i18n/zh.js`, Modify `portal/src/portal/textos.js` (`UI.zh`, `AVISO.zh`), `portal/src/portal/apps.js` (`traducoes.zh` em `EM_BREVE`), `portal/src/index.html` (cartão fixo `card app-principal` do SaibaTudo LLMs com `btn btn-primario grande` e botão no hero `btn btn-ouro grande`; textos nos 6 catálogos; ícone `portal/src/portal/brand/svg/llms.svg`; na página zh a química linka `/quimica/?lang=en` e eleições/AchaVagaIA levam o selo "só em português"), `tests/rotas.test.mjs` (IDIOMAS com 6; teste `llms: as três formas do endereço`; `/zh*` → portal), `CLAUDE.md` raiz (rota no ar).

- [ ] **Passo 1:** preparar tudo numa branch `llms-dominio` **antes** de 27/10, sem merge; `node --test "tests/*.test.mjs"` e `cd portal && npm test` verdes na branch.
- [ ] **Passo 2 (≥ 27/10):** merge na `main` num só commit (`feat(portal,eleicoes): rota /llms/, home em chines e cartao do SaibaTudo LLMs`), push, `gh run list` (repo-ci, portal-ci, eleicoes-congelamento verdes).
- [ ] **Passo 3:** `gh workflow run eleicoes-data-refresh.yml` (as regras de proxy só valem depois); conferir `https://saibatudo.net/llms/`, `https://saibatudo.net/zh/`, `https://saibatudo.net/llms/api/health`.
- [ ] **Passo 4:** `docs/PROJECT_MEMORY.md` dos apps llms e eleições, memória do agente; commit `docs: SaibaTudo LLMs no ar em saibatudo.net/llms/ e home em chines`.
