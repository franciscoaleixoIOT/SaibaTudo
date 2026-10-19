# Calculadoras novas a partir do mapa dos livros (17/10/2026)

Decisão do mantenedor (17/10/2026): implementar, nesta ordem, **entalpia (Hess/formação)**, **configuração eletrônica**, **NOX**,
**Kc/Kp** e **tipo de ligação** — os temas que o mapa dos livros (`MAPA_LIVROS.md`, PENDENCIAS §13) mostrou com resposta de cálculo e sem
cobertura no app. Este documento é o contrato comum para site, API, Android, modelo (NLU) e corpus. Regras que continuam valendo:
nenhum número sai do modelo (tudo vem do pacote assinado ou de cálculo local testado), toda resposta traz fonte e licença, texto só pelos
catálogos i18n, padrões do interpretador só pelo léxico compartilhado (`contracts/lexico/<idioma>.json`), paridade site ↔ Android.

## 1. Contrato do NLU (v1, estendido)

Intenções novas em `backend/modal/nlu_core.py` (`INTENTS`, `ENTIDADES_POR_INTENCAO`, gramática) e em todos os espelhos
(`api/_lib/vocab.js`, `api/_lib/contexto.js`, `web/src/quimica/js/nlu.js`, `web/src/quimica/js/nuvem.js`, `AiModels.kt`, `ContextoNuvem.kt`,
`dataset/gerar_nlu.py`, `DATA_CONTRACT.md` §9):

| Intenção | Entidades admitidas | Obrigatórias | Exemplos (pt-BR) |
| :-- | :-- | :-- | :-- |
| `NOX` | `elemento`, `composto` | `composto` | "NOX do enxofre no H2SO4" (elemento S, composto H2SO4); "número de oxidação do Mn no MnO4-"; "estados de oxidação de cada elemento no KMnO4" (só composto) |
| `ENTALPIA` | `composto`, `quantidades`, `equacao` | — | "ΔH da combustão do metano" (composto); "variação de entalpia de 2 H2 + O2 → 2 H2O" (equacao); "calor liberado na queima de 10 g de etanol" (composto + quantidades); "entalpia da reação pela lei de Hess" |
| `EQUILIBRIO` | `equacao`, `quantidades` | `equacao` | "expressão do Kc para N2 + 3 H2 ⇌ 2 NH3"; "Kp em função de Kc para ... a 500 K" (quantidades = temperatura); "calcule Kc de ... com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L" |
| `LIGACAO` | `elemento`, `composto` | — | "tipo de ligação do NaCl" (composto); "que ligação há entre H e Cl" (elemento = o PRIMEIRO citado, como em COMPARAR); "a ligação no CO2 é polar ou apolar" |

O `composto` e a `equacao` continuam sendo o texto copiado da pergunta (com a caixa). Em `EQUILIBRIO` a seta pode ser `⇌`, `<=>`, `<->`,
`=` entre espécies ou `→`: a normalização do serviço (`normalize_question`) mapeia `<=>`/`<->`/`⇌`/`⇄` para `⇌` e os clientes aceitam as duas setas.
`quantidades` segue `[{valor, unidade}]` com as unidades já existentes (`mol/L`, `K`, `°C`, `g`, `mol`, `kJ`...). As concentrações entre
colchetes (`[N2] = 0,5 mol/L`) entram nas quantidades na ordem em que aparecem; a espécie de cada colchete é lida só pelas regras dos clientes.

Propriedade nova (id de contrato, igual em `PROPRIEDADES` do `nlu_core.py`, `propriedades.js`, `regras.json`, léxico e golden):
`entalpiaFormacaoKJmol` — entalpia padrão de formação a 298,15 K, em kJ/mol, dos compostos (Wikidata P3078, CC0; ver §3). "Entalpia de
formação da água" é `PROPRIEDADE` + `propriedade: entalpiaFormacaoKJmol` (e `COMPARAR` funciona como para qualquer propriedade). "Entalpia da
REAÇÃO/combustão" é `ENTALPIA`.

**Configuração eletrônica não ganha intenção:** continua `PROPRIEDADE` + `propriedade: configuracaoEletronica` (o pacote já traz a notação
abreviada do PubChem para os 118 elementos). O que muda é a RESPOSTA (§2.2) e as pistas do léxico ("distribuição eletrônica", "diagrama de
Linus Pauling", "camadas eletrônicas", "elétrons de valência", "subníveis", "camada de valência"), nos 5 idiomas.

## 2. Calculadoras (site `web/src/quimica/js/calc/`, Android `domain/calc/`), todas puras e testadas

### 2.1 Entalpia — `calc/entalpia.js` ↔ `Entalpia.kt`
- **Por formação:** ΔH°reação = Σ n·ΔHf°(produtos) − Σ n·ΔHf°(reagentes), com a equação balanceada (reusa `balancear.js`/`Balanceador.kt` se
  vier sem coeficientes) e ΔHf° do pacote (`propriedades.entalpiaFormacaoKJmol` de cada composto resolvido pelo dicionário). Substância
  simples no estado padrão (O2, N2, H2, Cl2, metais, C grafite) tem ΔHf° = 0 por definição (regra, citar). Se falta ΔHf° de alguma espécie:
  resposta `resolvida: false` dizendo qual falta (sem inventar número), com a expressão montada.
- **Combustão de um composto** ("ΔH da combustão do etanol"): monta CxHyOz(N,S) + O2 → CO2 + H2O (+ N2/SO2), balanceia e aplica o item acima;
  com `quantidades` em massa/mol, converte para o calor da amostra (q = n·ΔH) e diz se é exotérmica/endotérmica.
- **Lei de Hess (combinação de equações):** função `combinarHess(alvo, [{equacao, dH}])` que acha os multiplicadores racionais (álgebra linear
  racional de `frac.js`/`Racional.kt`) e devolve ΔH do alvo + os passos ("equação 1 × 2, equação 2 invertida"). Fica exposta na tela
  **Calculadoras** (campos: equação alvo, até 4 equações com ΔH), porque a pergunta de uma linha raramente traz todas as equações; o
  assistente responde `ENTALPIA` com a via de formação e oferece a ação "abrir calculadora (Hess)".
- Fonte na resposta: Wikidata (P3078, CC0) + "cálculo local"; unidades kJ/mol e kJ; sinal e convenção ("ΔH < 0: exotérmica").

### 2.2 Configuração eletrônica — `calc/eletronica.js` ↔ `Eletronica.kt`
- Entrada: `configuracaoEletronica` do pacote (ex.: `[Ar] 4s2 3d6`) → expande o cerne de gás nobre em notação completa, ordena em
  **ordem de preenchimento (Linus Pauling)** e em **ordem de camadas**, soma por camada (K, L, M, N, O, P, Q), camada de valência e elétrons
  de valência (grupo principal; para metais de transição informa os elétrons de valência convencionais ns + (n−1)d), subnível mais energético,
  e bloco. Confere que o total de elétrons = Z (se não bater, resposta `resolvida: false` — nunca corrige o dado "na mão").
- Íons (só na tela Calculadoras e no Android, campo "carga"): cátion retira elétrons da camada de maior n (e dentro dela do maior l);
  ânion acrescenta na ordem de preenchimento.
- Resposta do assistente para `PROPRIEDADE configuracaoEletronica` (site `answers.js` + Android `AnswerBuilder.kt`): valor do pacote +
  notação completa + distribuição por camadas (ex.: `2, 8, 14, 2`) + camada de valência + elétrons de valência; fonte PubChem/pacote +
  "distribuição calculada".

### 2.3 NOX — `calc/nox.js` ↔ `Nox.kt`
- Entrada: fórmula (com parênteses, hidratos não) e carga opcional (`MnO4-`, `MnO4^-`, `MnO₄⁻`, `Cr2O7 2-`, `SO4^2-`, `NH4+`).
- Regras, nesta ordem, como nos livros didáticos (citar "regras de NOX"): substância simples 0; íon monoatômico = carga; F −1; grupo 1 +1;
  grupo 2 +2; Al +3; H +1 (−1 em hidreto metálico: H só com metal); O −2 (peróxido −1: `H2O2`, `M2O2`/`MO2` de grupo 1/2; superóxido −1/2:
  `KO2`; `OF2` +2); halogênio Cl/Br/I −1 quando é o elemento mais eletronegativo presente; o ÚLTIMO elemento sem regra sai do balanço
  (Σ NOX·átomos = carga). Dois ou mais sem regra → usa a eletronegatividade do pacote para fixar o mais eletronegativo com o NOX negativo
  usual (grupo 16 −2, 15 −3, 14 −4) e resolve o outro; se ainda não fecha, `resolvida: false` ("indeterminado por regra; use a estrutura").
- Saída: NOX de cada elemento (fração → "NOX médio", ex.: C no C3H8 = −8/3), destaque do elemento pedido, conferência da soma.
- Fonte: regra didática + eletronegatividade (pacote, PubChem/Wikidata).

### 2.4 Equilíbrio Kc/Kp — `calc/equilibrio.js` ↔ `Equilibrio.kt`
- Da equação (balanceada; aceita `⇌`/`→`): expressão `Kc = [C]^c·[D]^d / ([A]^a·[B]^b)` em KaTeX/texto, ignorando sólidos e líquidos puros
  quando a espécie vem com `(s)`/`(l)` ou, sem rótulo, quando o pacote diz `estadoPadrao` sólido/líquido (dizer a hipótese na resposta).
- Δn (gases) = Σ coef. produtos gasosos − Σ coef. reagentes gasosos; `Kp = Kc·(R·T)^Δn` com R = 0,082057 L·atm·mol⁻¹·K⁻¹ (derivado do R de
  `constantes.json`, CODATA) e T em K (converte °C). Com T nas quantidades, calcula o fator numérico; sem T, só a relação.
- Com concentrações `[X] = v mol/L` para TODAS as espécies em fase gasosa/aquosa: valor numérico de Kc (e Kp se houver T). Faltando alguma:
  `resolvida: false` com a expressão e o que falta.
- Fonte: lei da ação das massas (regra) + CODATA.

### 2.5 Tipo de ligação — `calc/ligacao.js` ↔ `Ligacao.kt`
- Entre dois elementos (ou cada par ligado de uma fórmula binária; em fórmulas com 3+ elementos: pares "metal–não metal" e "não metal–não
  metal" do composto, ex.: NaOH → Na–O iônica, O–H covalente polar) pela diferença de eletronegatividade de Pauling do pacote:
  metal + metal → **metálica**; metal + não metal com ΔEN ≥ 1,7 → **iônica**; 0,4 ≤ ΔEN < 1,7 → **covalente polar**; ΔEN < 0,4 → **covalente
  apolar**. Dizer que os limites 0,4 e 1,7 são convenção didática (escala de Pauling) e mostrar ΔEN com os dois valores e a fonte.
- Metal/não metal: pela `categoria` do pacote (metais: alcalino, alcalino-terroso, transição, pós-transição, lantanídeo, actinídeo;
  semimetais contam como não metal para a regra; gases nobres → "não forma ligação em condições comuns").
- Fonte: pacote (PubChem/Wikidata, eletronegatividade) + regra.

## 3. Pacote: termoquímica padrão (pipeline) — feito em 17/10/2026
Fonte primária: **chembox da Wikipédia em inglês** (`pipeline/coleta_termo_wikipedia.py`, CC BY-SA 4.0, permalink `oldid` por valor), campos
`propriedades.entalpiaFormacaoKJmol`, `energiaGibbsFormacaoKJmol` e `entropiaPadraoJmolK`; o Wikidata (P3078, `coleta_propriedades.py`) só com
referência forte e só onde o artigo não tem o campo. Cobertura no pacote de 17/10: ΔHf em 281 compostos (CO₂ −393,5; NaCl −411,12; CH₄ −74,6; glicose
−1271; CaCO₃ −1207; HCl −92,31; NH₃ −46; H₂O −285,83 líquida). Caminhos descartados e por quê: OpenStax Apêndice G (CC BY-NC-SA + cláusula anti-IA,
`FONTES_E_LICENCAS.md` §4) e Wikidata com referência fraca (CO₂ +394, NaCl −234,8: importações erradas). Regras completas em `DATA_CONTRACT.md` §3.1.

## 4. Léxico, catálogos, golden
- `contracts/lexico/{pt-BR,en,es,de,fr}.json`: `intencoes.nox`, `intencoes.entalpia`, `intencoes.equilibrio`, `intencoes.ligacao`, pistas
  (`entalpiaCombustao`, `entalpiaFormacao`, `hess`, `kcKp`, `concentracaoColchete`, `ligacaoPolaridade`, `configuracaoPistas`...), propriedade
  `entalpiaFormacaoKJmol` nas formas de propriedade; regenerar com `tools/gerar_lexico.py`, `tools/gerar_lexico_kt.py` e
  `cd api && node _lib/lexico/sincronizar.mjs`.
- Catálogos i18n do site (`web/src/quimica/js/i18n/catalogos/*.json`) e `strings.xml` ×5 no Android: títulos, rótulos, avisos ("falta ΔHf de
  X"), hipóteses ("considerei todas as espécies gasosas").
- Golden (`contracts/nlu_golden_cases.json`): ~12 casos por intenção nova (pt-BR ≥ 5, demais idiomas ≥ 1 cada) + ~6 de configuração
  eletrônica com as pistas novas + ~4 de `entalpiaFormacaoKJmol`; respeitar o limite da API (≤ 5 casos sem a entidade obrigatória).
- Tela **Calculadoras** (site `ui/calculadoras.js`, Android `Calculadoras.kt`): cartões Entalpia (formação + Hess), Configuração eletrônica
  (com carga), NOX, Kc/Kp, Tipo de ligação.

## 5. Corpus v3.5 (`ia/corpus/`)
Famílias novas (só padrões escritos por nós, nenhuma frase dos livros; testes fora do treino continuam valendo): as 4 intenções novas e a
propriedade nova nos 5 idiomas; notação científica e sobrescritos nas quantidades; frações e numerais por extenso ("meio mol", "dois mols");
"massa de X formada a partir de N g de Y" (ESTEQUIOMETRIA sem "quantos"); "como se chama <nome IUPAC>" (NOMENCLATURA com composto copiado);
"é mistura ou substância pura" / "mistura homogênea ou heterogênea" (CONCEITO); ordenação de listas ("ordem crescente de raio atômico de Na,
K e Rb" → COMPARAR com o primeiro elemento e a propriedade). Nada em `apps/eleicoes2026/` muda antes de 27/10.

## 6. Estado em 18/10/2026 (madrugada)
- **Feito em 17/10 (noite):** contrato em todos os espelhos; pacote com termoquímica (§3); site (regras, 5 calculadoras, respostas, tela
  Calculadoras, catálogos nos 5 idiomas, golden 873 → 929); Android em paridade; corpus v3.5 montado.
- **Feito em 18/10 (madrugada):** §7 inteira — contrato (ids `energiaGibbsFormacaoKJmol`, `entropiaPadraoJmolK`, `particulas`; `cargaFormula`/
  `numeroMassa` só do cliente; Kc sem equação → CONCEITO; golden 929 → 984) e respostas (ficha com ΔHf°/ΔGf°/S°, partículas de íons e isótopos,
  conceito de Kc com ação para a calculadora) em site e Android; revisão de terminologia en/es/de/fr dos textos de 17/10 por agente (166 textos
  ajustados; `revisao: pendente` mantido porque não foi falante nativo); corpus v3.5 remontado (teto pt 760 + piso por propriedade; 74.935 pares,
  química 69,8 %); **treino do v3.5 iniciado às 02h52** (`ia/treino/README.md` §v3.5); Android **1.0.3 (versionCode 4)** gerado e verificado
  (`docs/RELEASE_1.0.3.md`). Testes: web 229 (226 + 3 pulados), API 253, modal 133, dataset 87, pipeline 243, tools 112, Android 255 + lint 0 erros,
  corpus 43, raiz 8, portal 10.
- **Pendente:** decisão do mantenedor sobre a promoção do NLU (v3.5 medido às 10h e v3.6 às 21h29 de 18/10, `ia/treino/README.md` §v3.5
  e §v3.6: o v3.6 recupera CONCEITO pt e fica acima do v3.4 no golden em comum, mas reprova pelos 3 casos IUPAC do golden e por es
  unidadeDestino 9/11; pacotes e arquivos já no Volume) e então `promover.py` → `SNAPSHOT_EPOCH` + `modal deploy` →
  `MODEL_VERSION` na Vercel (o serviço ainda roda o `nlu_core.py` sem as intenções e ids novos, de propósito); testar a tela Calculadoras, a ficha
  e as respostas novas no aparelho e enviar o AAB 1.0.3; revisão por falante nativo dos textos en/es/de/fr; "compare o ΔGf de X e Y" → COMPARAR
  (hoje PROPRIEDADE com resposta de comparação); Kps/solubilidade; TeX cru nos trechos da Wikipédia pt (pipeline).

## 7. 18/10/2026: propriedades ΔGf°/S°/partículas e Kc sem equação

Decisões do mantenedor (18/10/2026), camada "contrato do NLU" (as respostas e a interface vêm numa camada à parte):

- **Três ids novos de propriedade**, no FIM do vocabulário, nesta ordem: `energiaGibbsFormacaoKJmol` (ΔGf° a 298,15 K, kJ/mol),
  `entropiaPadraoJmolK` (S° a 298,15 K, J/(mol·K)) — os dois já estavam no pacote (`DATA_CONTRACT.md` §3.1) — e `particulas` (prótons,
  nêutrons e elétrons de um átomo ou íon; `PROPRIEDADE` com `elemento`, alvo `elemento`, campo `z`, tipo `particulas`). Espelhos:
  `nlu_core.PROPRIEDADES`, `api/_lib/vocab.js` (`PROPRIEDADES`, `FORMAS_PROPRIEDADE`: "número de prótons" saiu de `numeroAtomico`),
  `propriedades.js`, `Propriedades.kt`, `dataset/vocab_nlu.py`, catálogos (`propriedades.rotulos`) e `strings.xml` (`prop_energia_gibbs_formacao`,
  `prop_entropia_padrao`, `prop_particulas`) nos 5 idiomas.
- **Formas** (`contracts/lexico/<idioma>.json`, `propriedades`): ΔGf° ("energia livre de Gibbs de formação", "entalpia livre de formação",
  "standard Gibbs free energy of formation", "freie Standardbildungsenthalpie", "enthalpie libre standard de formation"…), S° ("entropia
  padrão/molar/absoluta", "entropia do/da/de X"; "o que é entropia" segue `CONCEITO` pelo gatilho de definição), partículas ("prótons",
  "nêutrons", "elétrons", "número de massa", "partículas subatômicas", "Protonenzahl", "Massenzahl"…). Precedência pela forma mais longa:
  "elétrons de valência", "camada de valência", "distribuição eletrônica" (e agora "elétrons na última camada") continuam
  `configuracaoEletronica`; "número atômico" continua `numeroAtomico`. "Quantas partículas há em 2 mol de Fe" (com quantidade) continua
  `ESTEQUIOMETRIA`.
- **Δ na pergunta** (a normalização apaga Δ/∆; as regras olham o texto original): "ΔGf", "ΔG°f", "ΔGf°" e "ΔG de formação" (pista
  `deFormacao` do léxico) → `PROPRIEDADE energiaGibbsFormacaoKJmol`; "ΔH de formação" passou a `entalpiaFormacaoKJmol` como "ΔHf" (antes
  era `ENTALPIA`). "Entalpia livre de formação" / "enthalpie libre…" com composto não é `ENTALPIA`.
- **Íon e número de massa: campos só do cliente.** `cargaFormula` (já usado pelo NOX) passa a guardar também a carga do íon de UM símbolo
  de elemento ("Fe2+", "Fe²⁺", "Fe+2", "Fe 2+", "Fe^{3+}", "Cl-", "Cl⁻", "S2-", "íon ferro 2+", "íon ferro(III)"/"iron(III) ion" pela pista
  `ionRomano`); `numeroMassa` (novo) guarda o número de massa ("Fe-56", "C-14", "⁵⁶Fe", "ferro-56", "carbono-14", "carbono 14?"; "56Fe" sem
  sobrescrito só com pista de partícula; aceito se Z ≤ A ≤ 3Z + 10). O token do íon sai de `formulas`/`compostos` ("O2-" é óxido, não O2) e
  o elemento dele vem primeiro em `elementos`. Fórmula de mais de um elemento ("NO3-", "SO4 2-", "OH-") não conta; com equação na pergunta
  (semirreação) nada muda. Sem pista de partícula, o íon é `ELEMENTO` com `cargaFormula` ("o que é Fe2+"). Funções: `lerIonsEIsotopo`
  (`nlu.js`) ↔ `LocalNlu.lerIonsEIsotopo`. O modelo **não** emite esses campos: saída para "quantos elétrons tem o Fe2+" =
  `{"intent": "PROPRIEDADE", "elemento": "Fe", "propriedade": "particulas"}`; os clientes os tiram da pergunta e os mesclam quando a nuvem
  fala do mesmo elemento (`nuvem.js` `mesclarCamposDoCliente`, `CloudNlu.kt`; no NOX, a carga depois da fórmula; a nuvem que copiar
  "Fe2+" como composto vira o elemento). No `contexto` da API eles são chave fora do contrato (`api/_lib/contexto.js` `CAMPOS_SO_DO_CLIENTE`).
  A ancoragem do proxy aceita o símbolo em "Fe-56" (`ground.js`).
- **Kc/Kp sem equação → `CONCEITO`** (pista `constanteEquilibrio`): "qual o Kp a 500 K", "como calcular o Kc", "calcule o Kc da reação",
  "o que é Kc", "fórmula do Kp", "constante de equilíbrio". Saída do modelo `{"intent": "CONCEITO"}`; `conceito: "constante de equilibrio"`
  (`CONCEITO_CONSTANTE_EQUILIBRIO`) é do cliente. Com equação continua `EQUILIBRIO`.
- **Golden** 929 → 984 (+55: partículas/íons/número de massa, precedência, ΔGf°/S° com COMPARAR, Kc sem equação; pt, en, es, de, fr). Chaves
  novas conferidas pelos clientes: `cargaFormula`, `numeroMassa` (o site também confere `conceito`).
- **Dataset** (`dataset/gerar_nlu.py`): "quantos prótons/elétrons tem X" agora rotula `particulas`; famílias novas `COTA_18_10` (PARTICULAS
  450, ION_ELEMENTO 120, TERMO 300, TERMO_COMPARAR 150, KC_CONCEITO 40; sorteio próprio, seed + 36), placeholders `{elion}`/`{eliso}`.
- **Fica para a camada de respostas:** resposta de `particulas` (Z, A − Z, Z − carga), ΔGf°/S° na ficha e nas respostas com fonte por valor,
  CONCEITO de Kc/Kp com a ação "abrir calculadora", ELEMENTO com `cargaFormula`; corpus v3.5 e treino; `modal deploy` só depois do gate.
