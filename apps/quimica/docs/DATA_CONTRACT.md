# Contrato de dados — SaibaTudo Química

Pacote: `data/quimica/`. Tudo em JSON UTF-8, chaves em `camelCase`, textos em **português do Brasil** por padrão; valores numéricos em **SI** (K, Pa, kg·m⁻³, J) com o campo
`unidade` quando houver ambiguidade. Nenhum campo é inventado: **ausência de dado = ausência de campo**. Cada registro traz `fontes` (lista de `{nome, url, licenca, acessadoEm}`).

**Idiomas (docs/I18N.md §4).** Códigos BCP 47, sempre estes: `pt-BR` (padrão e referência), `en`, `es`, `de`, `fr`. Os campos por idioma são dicionários
`{ "<idioma>": valor }` em que **só entram os idiomas com dado** — o cliente cai para `en` e depois para `pt-BR` e **rotula** a reserva ("nome em inglês"). Nenhum
texto é traduzido por máquina: nomes vêm do Wikidata (CC0), textos da Wikipédia de cada idioma (CC BY-SA 4.0) e frases GHS do Anexo III multilíngue do CLP (EUR-Lex).
Os campos antigos (`nome`, `nomeEn`, `sinonimos`, `texto`, `pictogramas`…) continuam em português/inglês como sempre, por compatibilidade. O build escolhe os idiomas com
`python pipeline/build.py --idiomas pt-BR,en,es,de,fr` (padrão: os cinco; `--sem-textos-idiomas` pula a Wikipédia em en/es/de/fr).

## 1. `manifest.json` (+ `manifest.sig`)
Mesmo esquema do app de eleições: `{ version, generatedAt, schemaVersion: 1, files: { "<caminho>": { bytes, sha256 } }, sources: [...], licencas: [...],
idiomas: ["pt-BR", "en", "es", "de", "fr"], contagens: {...}, atribuicao, cliente: { pollIntervalMinutes: 10080, baseUrl, nlu: { endpoint }, ask: { enabled: false },
melhoria: { enabled: false } } }`. A assinatura é ECDSA P-256/SHA-256 (DER, Base64) do arquivo `manifest.json` byte a byte; chave pública em
`pipeline/data_signing_public.pem` (e `.b64` para o site e o app). `pollIntervalMinutes` = 7 dias. `files` lista **todos** os arquivos do pacote, inclusive cada lote de
textos e `textos/index.json` (§5), com SHA-256; `stats.json` fica fora.
- `idiomas`: os idiomas construídos neste pacote (pt-BR sempre primeiro).
- `contagens`: `{ elementos, compostos, constantes, textos, textosPorFonte: { "wikipedia-pt": 925, "wikipedia-en": 1073, ... , "chebi": 1305 }, textosPorIdioma:
  { "pt-BR": 1183, "en": 2613, "es": 981, "de": 766, "fr": 804 }, lotesDeTextos: 36, compostosComGhsHarmonizado, compostosComCas,
  compostosComNomePorIdioma: { "pt-BR": 1964, "en": 1963, ... }, elementosComNomePorIdioma: { ... } }`. As chaves de `textosPorFonte` são **fonte e idioma**
  (ids de `fontes.json`: `wikipedia-pt`, `wikipedia-en`, `wikipedia-es`, `wikipedia-de`, `wikipedia-fr`, `wikibooks-pt`, `chebi`, `gutenberg-14474`, `gold-book`).

## 2. `elementos.json` — 118 elementos
```json
{ "z": 8, "simbolo": "O", "nome": "Oxigênio", "nomeEn": "Oxygen",
  "nomes": { "pt-BR": "Oxigênio", "en": "Oxygen", "es": "oxígeno", "de": "Sauerstoff", "fr": "oxygène" },
  "massaAtomica": 15.999, "massaAtomicaIncerteza": null,
  "grupo": 16, "periodo": 2, "bloco": "p", "categoria": "nao_metal",
  "configuracaoEletronica": "[He] 2s2 2p4", "eletronegatividade": 3.44, "raioAtomicoPm": 152, "afinidadeEletronicaKJmol": 141.0,
  "energiaIonizacaoKJmol": 1313.9, "pontoFusaoK": 54.36, "pontoEbulicaoK": 90.188, "densidadeKgm3": 1.429, "estadoPadrao": "gas",
  "estadosOxidacao": [-2, -1, 0, 1, 2], "descoberta": { "ano": 1774, "por": "Carl Wilhelm Scheele; Joseph Priestley" }, "wikidata": "Q629",
  "fontes": [ { "nome": "PubChem Periodic Table", "url": "https://pubchem.ncbi.nlm.nih.gov/periodic-table/", "licenca": "domínio público (NIH)", "acessadoEm": "2026-10-10" } ] }
```
`categoria` ∈ `metal_alcalino | metal_alcalino_terroso | metal_transicao | metal_pos_transicao | semimetal | nao_metal | halogenio | gas_nobre | lantanideo | actinideo | desconhecida`.
Nomes em PT seguem a **SBQ/IUPAC-PT** (ex.: "Oxigênio", "Hidrogênio"); `nomeEn` fica para busca.
`nomes` (opcional): `pt-BR` = `nome` (SBQ continua a autoridade), `en` = `nomeEn` (PubChem), `es`/`de`/`fr` = rótulo (`rdfs:label`) do item do elemento no Wikidata,
**como está lá** (minúsculas em es/fr, maiúscula em de — o cliente capitaliza na exibição). Idioma sem rótulo = chave ausente. O validador exige `nomes["pt-BR"] == nome`.
- `energiaIonizacaoKJmol` = **1ª** energia de ionização. Desde 16/10/2026 vem do Wikidata (P2260, número de ordem 1, referência ao NIST ASD, Z ≤ 103) quando há;
  senão do PubChem. `eletronegatividade` = escala de Pauling (valores revisados de Allred, como no PubChem). `afinidadeEletronicaKJmol` = PubChem.
- `fontesPorPropriedade` (opcional, mesmo formato de §3.1): origem de `energiaIonizacaoKJmol` (Wikidata com `declaracao`, `referencia`, `valorOriginal`
  em eV e `substituiu: {valor, fonte}` quando trocou o do PubChem; ou PubChem), `eletronegatividade` (`escala: "Pauling"`, `nota`) e `afinidadeEletronicaKJmol`
  (PubChem; `aviso` + `revisar: true` nos valores achados desatualizados na conferência de 11/10/2026). A lista `fontes` do registro continua valendo.

## 3. `compostos/<lote>.json` — compostos (núcleo: ~2.000; lotes de 200 por arquivo, `compostos/index.json` com `{ porCid, nomes, nomesPorIdioma, lotes }`)
```json
{ "cid": 2244, "nome": "Ácido acetilsalicílico", "nomePopular": "Aspirina", "nomeIupac": "2-acetyloxybenzoic acid", "sinonimos": ["aspirina", "AAS"],
  "nomes": { "pt-BR": "Ácido acetilsalicílico", "en": "aspirin", "es": "ácido acetilsalicílico", "de": "Acetylsalicylsäure", "fr": "acide acétylsalicylique" },
  "sinonimosPorIdioma": { "en": ["acetylsalicylic acid", "ASA", "o-acetoxybenzoic acid"], "es": ["Cardirene"], "de": ["acesal", "ASS"], "fr": ["aspirine"] },
  "formula": "C9H8O4", "formulaHill": "C9H8O4", "massaMolar": 180.16, "massaExata": 180.0423, "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O", "inchiKey": "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
  "cas": "50-78-2", "propriedades": { "xlogp": 1.2, "doadoresH": 1, "aceptoresH": 4, "ligacoesRotaveis": 3, "carga": 0, "tpsa": 63.6 },
  "ghs": { "pictogramas": ["GHS07"], "palavraSinal": "Atenção", "frasesH": ["H302", "H315", "H319"], "fonte": "Regulation (EC) No 1272/2008 ..." },
  "classes": ["acido_carboxilico", "ester", "aromatico"], "wikidata": "Q18216", "icsc": null,
  "fontes": [ { "nome": "PubChem CID 2244", "url": "https://pubchem.ncbi.nlm.nih.gov/compound/2244", "licenca": "domínio público (NIH)", "acessadoEm": "2026-10-10" } ] }
```
Nome em PT: do Wikidata (rótulo `pt`/`pt-br`) quando existir; senão o nome IUPAC em inglês com `nomePtPendente: true` (a interface mostra o IUPAC).
- `propriedades`: os 6 campos **calculados** do PubChem (`xlogp`, `tpsa`, `doadoresH`, `aceptoresH`, `ligacoesRotaveis`, `carga`) e, desde 16/10/2026, as
  propriedades **medidas** de §3.1 (cada uma com a sua origem em `fontesPorPropriedade`).

### 3.1 Propriedades medidas e origem por valor (`fontesPorPropriedade`, 16/10/2026)
```json
"propriedades": { "xlogp": -0.1, "pontoFusaoK": 159.05, "pontoEbulicaoK": 351.44, "pka": 16, "estadoPadrao": "liquido" },
"fontesPorPropriedade": {
  "pontoFusaoK": { "nome": "Wikidata", "url": "https://www.wikidata.org/wiki/Q153#P2101", "licenca": "CC0", "acessadoEm": "2026-10-16",
                   "declaracao": "Q153$7ebc8bac-4fbb-6f40-72e8-d99b593d7a5a",
                   "referencia": "Basic Laboratory and Industrial Chemicals: A CRC Quick Reference Handbook (Q22236188)",
                   "valorOriginal": -114.1, "unidadeOriginal": "°C" },
  "pontoEbulicaoK": { "...": "...", "condicoes": { "pressaoPa": 101325 } },
  "estadoPadrao": { "nome": "derivado (SaibaTudo Química)", "licenca": "CC0", "metodo": "pontoFusaoK e pontoEbulicaoK do pacote comparados com 298,15 K (1 atm)", "acessadoEm": "2026-10-16" } }
```
| Campo | Unidade | Wikidata | Observação |
| :-- | :-- | :-- | :-- |
| `pontoFusaoK` | K | P2101 | sem pressão declarada ou a 1 atm |
| `pontoEbulicaoK` | K | P2102 | idem; outra pressão fica fora |
| `densidadeKgm3` | kg/m³ | P2054 | temperatura em `condicoes.temperaturaK` (a mais próxima de 298,15 K vence); `condicoes.fase` quando declarada |
| `solubilidadeAguaG100g` | g por 100 g de água | P2177 (g/100 g ou g/kg **de solvente**) | só solvente = água; temperatura em `condicoes` |
| `solubilidadeAguaGL` | g/L (= kg/m³) | P2177 (g/L, mg/L, g/m³, kg/m³) | idem |
| `pka` | — | P1117 | o **menor** pKa aceito (1ª dissociação); para bases o Wikidata costuma dar o pKa do ácido conjugado; ácidos fortes ficam sem |
| `pkaValores` | — | P1117 | lista crescente, só quando há mais de um valor distinto (agrupados a < 0,5); `fontesPorPropriedade.pkaValores` é lista alinhada |
| `estadoPadrao` | `solido`/`liquido`/`gas` | derivado | a 298,15 K e 1 atm, de `pontoFusaoK`/`pontoEbulicaoK`; ausente a ±2 K de 298,15 K |

- **Origem por valor** (`fontesPorPropriedade[campo]`): `{nome, url, licenca, acessadoEm}` (como `fontes`) + `declaracao` (id da declaração no Wikidata),
  `referencia` (o que a declaração cita: "afirmado em" e/ou URL), `valorOriginal`/`unidadeOriginal` (como está no Wikidata), `condicoes` (`temperaturaK`,
  `pressaoPa`, `fase`) e, raramente, `semReferencia: true` + `corroboradoPor: n` (duas ou mais declarações sem referência que concordam, quando nenhuma tem).
  Campo medido sem origem é erro de validação; origem que diga "computed" do PubChem também.
- Ids em `regras.propriedades`: `pontoFusaoK`, `pontoEbulicaoK`, `densidadeKgm3` e `estadoPadrao` ganharam `origens` (elemento **e** composto) e
  `escopos: ["elemento", "composto"]` (`origem`/`escopo` antigos ficam iguais); novos `solubilidade` (as duas origens, com `unidades` por origem) e `pka`,
  os mesmos ids do vocabulário do modelo (`nlu_core.PROPRIEDADES`, `api/_lib/vocab.js`). Os clientes antigos ignoram os campos novos (o Android lê só os
  números de `propriedades`; listas e objetos são ignorados).
- Regras de aceitação e escolha (referência obrigatória, qualificadores excluídos, divergências): `pipeline/coleta_propriedades.py` e `FONTES_E_LICENCAS.md` §8.
  As declarações aceitas e **não escolhidas** ficam fora do pacote, em `<cache>/propriedades_wikidata_alternativas.json`.
- `nomes` (opcional): `pt-BR` = `nome` **só quando é um nome em português de verdade** (ausente se `nomePtPendente`); `en`/`es`/`de`/`fr` = rótulo do item do
  Wikidata naquele idioma, como está lá. O pipeline **nunca** copia `nomeIupac` para `nomes.en`: composto sem item no Wikidata (ou sem rótulo no idioma) fica sem a
  chave e o cliente cai para `nomeIupac`/`nome` **rotulando** a reserva.
- `sinonimosPorIdioma` (opcional): `{ idioma: [até 10] }` — apelidos (`skos:altLabel`) do item no idioma (`pt-BR` = pt + pt-br; `en` também recebe os sinônimos em
  inglês do ChEBI), sem repetir o nome, sem CAS, códigos de banco nem a **fórmula do próprio composto** (nem com subscritos). Idioma sem apelido = chave ausente.
  `sinonimos` (pt + en misturados, até 10) continua por compatibilidade. `nomeIupac` (inglês) e `nomePopular` (pt-BR) ficam.
- `compostos/index.json`: `{ "porCid": { "2244": "lote-001" }, "nomes": [["aspirina", 2244], ...], "nomesPorIdioma": { "en": [["aspirin", 2244], ...], "es": [...],
  "de": [...], "fr": [...] }, "lotes": ["lote-001", ...] }`. `nomes` = chaves normalizadas (minúsculas, sem acento) de nome, popular, IUPAC, sinônimos e fórmulas.
  `nomesPorIdioma[idioma]` = chaves de `nomes[idioma]` + `sinonimosPorIdioma[idioma]` **que ainda não estão em `nomes`** (deduplicado para o índice não dobrar de
  tamanho): a busca no idioma X usa `nomes` ∪ `nomesPorIdioma[X]`. Só idiomas com alguma entrada; `pt-BR` nunca aparece aqui (já está em `nomes`).
Seleção do núcleo: compostos com página na Wikipédia em português (sitelink `ptwiki`) **e** CID no PubChem, mais listas fixas (ácidos/bases/sais do ensino médio, solventes,
gases, polímeros comuns, fármacos de uso geral). Critério de inclusão é público (`pipeline/selecao_compostos.py`).

## 4. `seguranca/icsc/<numero>.json` — Fichas Internacionais de Segurança Química (OIT/OMS), em português
Campos oficiais do cartão: `{ icsc, nome, cas, un, formula, perigosAgudos: {incendio, explosao}, exposicao: {inalacao, pele, olhos, ingestao}, primeirosSocorros: {...},
derramamento, armazenamento, classificacaoGhs, propriedadesFisicas: {...}, fontes }`. Só os cartões que existem em PT; os demais ficam fora (não traduzimos ficha de segurança por máquina).
**Desativado** (FONTES_E_LICENCAS §5): o pacote não pode ter `seguranca/`; cada composto com CAS leva só `icscBuscaUrl`.

## 5. `textos/` — trechos licenciados para explicação e retrieval, em **lotes** com índice
Em vez de um arquivo por trecho, cada fonte grava `textos/<fonte>/lote-NNN.json` (**lista JSON** de até **200** trechos, **ordenados por `id`** — a ordenação torna o lote
de cada trecho estável entre builds) e o pacote traz `textos/index.json`. Fontes (= pasta = id em `fontes.json`): `wikipedia-pt`, `wikipedia-en`, `wikipedia-es`,
`wikipedia-de`, `wikipedia-fr`, `wikibooks-pt`, `chebi`, `gutenberg-14474`. Motivo: com cinco idiomas o pacote passaria de 10.000 arquivos (cota de upload da Vercel,
requisições no app); com lotes são ~55 arquivos. Os clientes **continuam aceitando** arquivo por trecho (objeto único) enquanto houver pacote antigo.

Esquema de cada trecho (igual ao de antes):
```json
{ "id": "wikipedia-en-oxygen-001", "fonte": "Wikipedia (en)", "licenca": "CC BY-SA 4.0",
  "url": "https://en.wikipedia.org/w/index.php?title=Oxygen&oldid=1312345678", "urlArtigo": "https://en.wikipedia.org/wiki/Oxygen",
  "capitulo": "Oxygen", "secao": "Introduction", "titulo": "Oxygen", "textoOriginal": "Oxygen is a chemical element ...", "textoPt": null,
  "traducao": "não se aplica (texto no idioma do artigo; sem tradução)", "idioma": "en", "revisao": 1312345678, "tipo": "elemento",
  "palavrasChave": ["oxygen", "O"], "entidades": { "elementos": ["O"], "compostos": [] },
  "fontes": [ { "nome": "Wikipedia (en): Oxygen", "url": "https://en.wikipedia.org/wiki/Oxygen", "licenca": "CC BY-SA 4.0", "acessadoEm": "2026-10-12" } ] }
```
- `idioma` **do trecho** usa o código da língua do texto como sempre: `pt` (Wikipédia/Wikilivros em português), `en` (Wikipedia en, ChEBI, Faraday), `es`, `de`, `fr`.
  Em português `textoPt` = `textoOriginal`; nos outros idiomas `textoPt` é `null` e `traducao` diz que não se aplica (**nunca traduzimos**; ChEBI e Faraday seguem
  `"traducao": "pendente"`). `fonte` por idioma: "Wikipédia em português", "Wikipedia (en)", "Wikipedia (es)", "Wikipedia (de)", "Wikipedia (fr)".
- Wikipédia em en/es/de/fr: **os mesmos artigos** da coleta em português — 118 elementos, até 150 compostos do pacote e os conceitos de `dataset/topicos.json` +
  lista fixa —, achados pelo item do Wikidata (sitelink `<lang>wiki`); `tema`/`temas` do conceito vêm do artigo em português. Artigo que não existe no idioma = nada
  (o cliente cai para `en` e depois `pt`). Wikilivros só em pt. `url` é o permalink (`oldid`) no wiki do idioma; `revisao` o revid.
- Regras: o trecho original é preservado (auditoria e citação); tradução, quando existir, é marcada como automática até uma pessoa revisar. CC BY-NC-SA (LibreTexts) só
  entra em pasta própria com a licença no `manifest.licencas`, e o dataset derivado dela herda CC BY-NC-SA.

`textos/index.json` — **formato exato** (docs/I18N.md §4); `lotes` em ordem de `caminho`, `trechos` na ordem do arquivo:
```json
{ "versao": 1,
  "lotes": [
    { "caminho": "textos/wikipedia-en/lote-001.json", "fonte": "wikipedia-en", "idioma": "en",
      "trechos": [ { "id": "wikipedia-en-oxygen-001", "titulo": "Oxygen", "chave": "oxygen", "entidades": { "elementos": ["O"], "compostos": [] } } ] },
    { "caminho": "textos/wikipedia-pt/lote-001.json", "fonte": "wikipedia-pt", "idioma": "pt-BR", "trechos": [ ... ] },
    { "caminho": "textos/chebi/lote-001.json", "fonte": "chebi", "idioma": "en", "trechos": [ ... ] }
  ] }
```
- `idioma` **do lote** usa o código do projeto (`pt-BR`, `en`, `es`, `de`, `fr`) para casar com o idioma ativo do cliente.
- `chave` = título normalizado (slug: minúsculas, sem acentos, `-` entre palavras), o que antes era o nome do arquivo sem `.json` e sem o contador `-NNN`
  (ex.: `acido-sulfurico`, `oxygen`, `lecture-1`; para ChEBI o slug do nome do composto). O cliente escolhe os lotes pelo índice (termo da pergunta × `chave`/`titulo`
  /`entidades`, idioma ativo com inglês como reserva) e baixa só os lotes necessários.
- O validador do build exige: índice `versao: 1`; cada `caminho` no manifesto; `fonte` e `idioma` válidos; ids do índice iguais aos do arquivo, na ordem; todo lote
  `lote-*.json` presente no índice; lote ≤ 200 trechos; `titulo`, `chave` e `entidades` em cada trecho.

## 6. `ghs_frases.json` — frases de perigo e rótulos do GHS (Regulamento CLP, Anexo III, EUR-Lex), por idioma
```json
{ "versao": 1, "idiomas": ["pt-BR", "en", "es", "de", "fr"],
  "frasesH": { "H314": { "texto": "Provoca queimaduras na pele e lesões oculares graves.",
                         "textoPorIdioma": { "pt-BR": "Provoca queimaduras na pele e lesões oculares graves.", "en": "Causes severe skin burns and eye damage.",
                                             "es": "Provoca quemaduras graves en la piel y lesiones oculares graves.", "de": "Verursacht schwere Verätzungen der Haut und schwere Augenschäden.",
                                             "fr": "Provoque de graves brûlures de la peau et de graves lésions des yeux." } },
               "H300+H310": { "texto": "Mortal por ingestão; Mortal em contacto com a pele", "textoPorIdioma": { "pt-BR": "...", "en": "..." },
                              "derivado": "junção dos textos oficiais dos componentes (código combinado ausente no Anexo III)", "componentes": ["H300", "H310"] } },
  "usadosSemTexto": ["H350i", "H360D"],
  "todasAsFrases": { "H200": "Explosivo instável.", "...": "..." },
  "todasAsFrasesPorIdioma": { "H200": { "pt-BR": "Explosivo instável.", "en": "Unstable explosive.", "es": "...", "de": "...", "fr": "..." } },
  "pictogramas": { "GHS05": "Corrosão (corrosivo)" },
  "pictogramasPorIdioma": { "GHS05": { "pt-BR": "Corrosão (corrosivo)", "en": "Corrosion (corrosive)", "es": "Corrosión (corrosivo)", "de": "Ätzwirkung (ätzend)", "fr": "Corrosion (corrosif)" } },
  "palavrasSinal": ["Perigo", "Atenção"],
  "palavrasSinalPorIdioma": { "Perigo": { "pt-BR": "Perigo", "en": "Danger", "es": "Peligro", "de": "Gefahr", "fr": "Danger" },
                              "Atenção": { "pt-BR": "Atenção", "en": "Warning", "es": "Atención", "de": "Achtung", "fr": "Attention" } },
  "fontes": [ { "nome": "Regulamento (CE) n.º 1272/2008 (CLP), Anexo III, texto consolidado, EUR-Lex", "url": "...", "licenca": "reutilização livre da legislação (EUR-Lex); citar a fonte", "acessadoEm": "2026-10-12" } ] }
```
- `frasesH` cobre os códigos usados nas classificações harmonizadas do pacote; `todasAsFrases*` todas as frases do Anexo III (H e EUH).
- **`texto`, `todasAsFrases`, `pictogramas` e `palavrasSinal` continuam em português** (é o que site, Android e dataset leem hoje). Por idioma: `textoPorIdioma`,
  `todasAsFrasesPorIdioma`, `pictogramasPorIdioma` (nomes padronizados do GHS/UNECE, autoria própria) e `palavrasSinalPorIdioma` (palavras de advertência oficiais do
  CLP, art. 20; a chave é a forma em português usada em `compostos[].ghs.palavraSinal`). O texto por idioma vem da **mesma tabela multilíngue** do Anexo III (linhas
  PT, EN, ES, DE, FR); idioma sem linha para um código = chave ausente. Nenhuma frase é traduzida por máquina.

## 7. `constantes.json` (CODATA 2022, NIST, domínio público), `regras.json` e `fontes.json`
- `regras.json`: prefixos SI, unidades, série de reatividade, solubilidade, nomenclatura básica — autoria própria com fontes — e a tabela `propriedades`:
  ```json
  "propriedades": { "massaMolar": { "nome": "Massa molar", "unidade": "g/mol", "origem": "compostos.massaMolar", "escopo": "composto",
                                    "sinonimos": ["massa molar", "massa molecular", "peso molecular"],
                                    "rotulos": { "pt-BR": "Massa molar", "en": "Molar mass", "es": "Masa molar", "de": "Molare Masse", "fr": "Masse molaire" },
                                    "sinonimosPorIdioma": { "pt-BR": ["massa molar", "massa molecular", "peso molecular"], "en": ["molar mass", "molecular mass", "molecular weight"],
                                                            "es": ["masa molar", "masa molecular", "peso molecular"], "de": ["molare masse", "molmasse", "molekülmasse", "molekulargewicht"],
                                                            "fr": ["masse molaire", "masse moléculaire", "poids moléculaire"] } } },
  "propriedadesRevisao": { "pt-BR": "humana", "en": "pendente", "es": "pendente", "de": "pendente", "fr": "pendente" }
  ```
  `nome` e `sinonimos` (pt-BR) continuam; `rotulos[idioma]` e `sinonimosPorIdioma[idioma]` trazem os termos fixos de química do glossário (I18N §8) nos idiomas do
  build (`pt-BR` sempre = `nome`/`sinonimos`). As traduções são de agente, marcadas `pendente` em `propriedadesRevisao` até revisão humana. `nomenclatura` segue só em
  português (pendência).
- `fontes.json`: `{ "fontes": [...] }`, **uma entrada por fonte e idioma** (`wikipedia-pt`, `wikipedia-en`, `wikipedia-es`, `wikipedia-de`, `wikipedia-fr`, `wikibooks-pt`,
  `chebi`, `gutenberg-14474`…), cada fonte de texto com `idioma` (código do projeto) além de `nome`, `mantenedor`, `url`, `licenca`, `uso`, `acessadoEm`, `atribuicao` e a lista
  de permissão (`exibir`, `dataset`, `treino`). Exibida em "Sobre os dados"; só entram as fontes que de fato contribuíram para o pacote.

## 8. Dataset (`dataset/`) — não faz parte do pacote assinado; é o material de treino e avaliação
`dataset/qa/*.jsonl` (uma linha por par):
```json
{ "id": "el-8-massa", "pergunta": "Qual é a massa atômica do oxigênio?", "resposta": "A massa atômica do oxigênio (O, Z = 8) é 15,999 u.", "tipo": "fato",
  "nivel": "medio", "entidades": { "elementos": ["O"] }, "numeros": ["15,999", "8"], "fontes": [ { "nome": "PubChem Periodic Table", "licenca": "domínio público" } ],
  "geradoPor": "template:elemento.massa", "revisadoPor": null }
```
`tipo` ∈ `fato | calculo | conceito | seguranca | recusa | nomenclatura | desenho`. `recusa` são pedidos perigosos com a resposta de recusa padrão. Para `conceito`, a resposta
cita o trecho (`fontes[].id` aponta para `textos/`). **Todo número da resposta tem de aparecer em `numeros` e existir na fonte** (teste automático).
`dataset/nlu/*.jsonl`: `{ q, alvo: { intent, entidades... } }` para o modelo de interpretação (mesmo formato do app de eleições).
`contracts/nlu_golden_cases.json`: casos de referência do NLU (nunca entram no treino). `contracts/seguranca_cases.json`: pedidos que **devem** ser recusados e pedidos legítimos
que **não** podem ser recusados (ex.: "como neutralizar ácido derramado").

## 9. Intenções do NLU (v1)
`ELEMENTO` (perfil), `COMPOSTO` (ficha), `PROPRIEDADE` (de X: ponto de fusão, pKa…), `MASSA_MOLAR`, `BALANCEAR`, `ESTEQUIOMETRIA`, `CONCENTRACAO` (molaridade, diluição),
`PH`, `GAS_IDEAL`, `CONVERSAO_UNIDADE`, `NOMENCLATURA` (nome ↔ fórmula), `DESENHAR` (estrutura), `COMPARAR`, `TABELA_PERIODICA` (tendências, grupo, período), `SEGURANCA`
(perigos, EPI, primeiros socorros), `CONCEITO` (explicação), `RECUSA_PERIGO`, `SOBRE_DADOS`, `FONTES`, `AJUDA`, `DESCONHECIDA`.
Entidades: `elemento` (símbolo), `composto` (cid ou nome canônico), `propriedade` (id de `regras.propriedades`), `quantidades: [{valor, unidade}]`, `equacao` (texto),
`nivel` (`fundamental|medio|superior`), `unidadeDestino`.
**Chaves por intenção (14/10/2026):** cada intenção admite só algumas entidades, e algumas são obrigatórias — tabela `ENTIDADES_POR_INTENCAO` em
`backend/modal/nlu_core.py`, derivada do golden e do corpus (ex.: `ELEMENTO` só `elemento`, obrigatório; `PROPRIEDADE` exige `propriedade` e admite
`elemento`/`composto`; `MASSA_MOLAR` admite `elemento`/`composto` sem obrigar; `RECUSA_PERIGO`, `SOBRE_DADOS`, `FONTES`, `AJUDA`, `DESCONHECIDA` não
admitem nenhuma). A gramática do modelo em nuvem só gera essas combinações; o proxy (`api/_lib/normalize.js`) ainda revalida e ancora.
**Resposta da nuvem (`/api/nlu`):** além de `nlu`, traz `resolucao.composto` — o `composto` copiado resolvido no índice do pacote (`{cid, nome}`) ou
`{cid: null, sugestoes: [{cid, nome}]}` (até 3) para o cliente perguntar "você quis dizer…?"; `null` sem composto. Detalhes em `api/README.md`.
