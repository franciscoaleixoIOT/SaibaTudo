# Dataset do SaibaTudo Química (fase 2)

Perguntas e respostas em **português do Brasil**, com **proveniência**, para treinar e avaliar o app: o modelo de **interpretação** (NLU:
pergunta → intenção + entidades) e o de **explicação** (resposta ancorada em dados e trechos licenciados). Python 3 puro (biblioteca padrão).

```
dataset/
  gerar_qa.py        gera qa/*.jsonl + qa/stats.json          gerar_nlu.py   gera nlu/train|val.jsonl (+ *_sft.jsonl) + nlu/stats.json
  gerar_amostra.py   gera AMOSTRA.md (60 pares legíveis)      topicos.json   mapa de temas (cobertura de conceitos e segurança)
  gerar_catalogo.py  gera CATALOGO.md (catálogo completo) + CATALOGO.jsonl (todos os pares)
  conceitos/*.jsonl  pares de conceito/segurança escritos à mão a partir dos trechos licenciados (entrada do gerador)
  fam_*.py           uma família de perguntas por módulo      calculo.py     fórmulas, massa molar, balanceador, estequiometria, pH, gás, unidades
  dados_recusas.py   pedidos perigosos + a resposta padrão    ghs_pt.py      frases H em PT (fallback), pictogramas, rótulos
  dados_escopo.py    perguntas fora do escopo + respostas     nomes_populares.py  nomes populares com a evidência no pacote
  tests/             testes (python -m unittest ...)          tests/fixtures pacote mínimo de teste (10 elementos, 20 compostos, 6 textos)
```
Famílias da ampliação de 10–11/10/2026 (PENDENCIAS §8.2), cada uma com sorteio próprio (`qa_base.SubCtx`), de modo que as famílias
anteriores continuam gerando exatamente os mesmos pares: `fam_comparacoes.py`, `fam_seguranca_rotulo.py`, `fam_conceitos_texto.py`,
`fam_escopo.py` e `fam_variantes.py` (esta por último: varia uma fração dos pares já gerados).

## Como gerar

```bash
python dataset/gerar_qa.py            # lê data/quimica/ (ou a fixture, se o pacote ainda não existir) -> dataset/qa/
python dataset/gerar_nlu.py           # -> dataset/nlu/ (remove os casos de contracts/nlu_golden_cases.json e seguranca_cases.json)
python dataset/gerar_amostra.py       # -> dataset/AMOSTRA.md
python dataset/gerar_catalogo.py      # -> dataset/CATALOGO.md + dataset/CATALOGO.jsonl
python -m unittest discover -s dataset -p "test_*.py"
```

Semente fixa (`--seed 2026`): a mesma entrada produz exatamente os mesmos arquivos. `stats.json` informa `fonteDados` (`real`, `parcial` ou `fixture`): **só `real` serve
para treino**. `--data <pasta>` aponta outro pacote; `DATASET_TESTE_PACOTE=fixture|real|<pasta>` força o pacote usado pelos testes.

### Estado atual (11/10/2026, madrugada)
Pacote real assinado `20261010T234125Z-acb63c6864b4` (118 elementos, 491 compostos, 1.787 textos; `fonteDados: "real"`). **29.673 pares** de QA (eram 24.023):

| Tipo | Antes | Agora | De onde vem o acréscimo |
| :-- | --: | --: | :-- |
| fato | 16.148 | 18.331 | 1.418 comparações entre elementos, 131 de escopo, 634 variantes de linguagem |
| calculo | 4.039 | 4.211 | variantes de linguagem |
| conceito | 479 | 2.059 | 1.533 recortes literais dos textos em português (2.012 sem contar variantes) + 47 variantes |
| seguranca | 594 | 2.210 | 1.507 do rótulo GHS por composto (frase H, pictograma, palavra de advertência, cuidados) + 109 variantes |
| nomenclatura | 1.374 | 1.415 | variantes |
| desenho | 970 | 1.028 | variantes (inclui nomes populares: "desenhe a cal viva") |
| recusa | 419 | 419 | — (a ampliação das recusas ficou para depois; ver PENDENCIAS §8.2) |

Por arquivo: elementos 7.019 · compostos 8.759 · calculos 4.039 · nomenclatura 1.374 · regras 370 · desenho 970 · seguranca 2.101 · recusas 419 · conceitos 2.012 ·
**comparacoes 1.418 · escopo 131 · variantes 1.061**. NLU: **20.492 exemplos** (eram 18.206; 19.627 treino, 865 validação, 380 modelos), dos quais 1.082 variantes
de linguagem (881 informais, 178 com fórmula subscrita, 23 com nome popular). Explicador (`backend/retrain/build_ask_dataset.py` sobre este QA): **3.722 exemplos de
treino e 925 de holdout** (antes: 924 e 228), 6 descartados (eram 335: as frases de perigo por composto agora levam `contexto`).

## Catálogo completo de perguntas e respostas
`dataset/gerar_catalogo.py` produz dois artefatos a partir de `qa/*.jsonl`:
- `CATALOGO.md` — catálogo legível, **completo em cobertura**: todos os modelos de pergunta por família (um exemplo real cada), os pares escritos à mão (conceitos e
  segurança geral) **na íntegra**, todas as perguntas de recusa, a tabela dos 65 temas com exemplo e o índice de entidades (118 elementos, todos os compostos);
- `CATALOGO.jsonl` — a lista **literal** de **todos** os pares (id, família, tipo, nível, tema, pergunta, resposta, fontes).


## Formato do QA (`qa/*.jsonl`, uma linha por par; DATA_CONTRACT §7)

Campos do contrato: `id`, `pergunta`, `resposta`, `tipo` (`fato | calculo | conceito | seguranca | recusa | nomenclatura | desenho`), `nivel`
(`fundamental | medio | superior`), `entidades`, `numeros`, `fontes`, `geradoPor`, `revisadoPor` (sempre `null` até uma pessoa revisar).
Campos adicionados: `numerosOrigem` (de onde veio cada número), `calculo` (tipo, entrada e resultado, nos cálculos), `acao` + `smiles` (desenho), `tema`
(id de `topicos.json`, nos conceitos e na segurança geral), `contexto` (nos pares de segurança por composto: os dados do rótulo que o app mostra — composto, CID,
palavra de sinal, pictogramas, frases H —, que o montador do explicador passa como CONTEXTO), `comparacao` (campo, eixo grupo/período, sentido e o vencedor
ou a ordem, para o teste recomputar pelo pacote), `origem` (nas variantes: o id do par original) e `nomePopular` (variante com nome popular).
Nos pares tirados de textos da Wikipédia/Wikilivros, cada item de `fontes` traz `id`, `nome`, `licenca`, `url` (artigo), `revisao` (link da revisão usada), `titulo` e
`alteracoes` ("recorte em frases completas", "paráfrase"...), como pede a CC BY-SA.

| Arquivo | Conteúdo | Origem dos dados |
| :-- | :-- | :-- |
| `elementos.jsonl` | ~30 templates × 118 elementos (símbolo, Z, massa, grupo/período/bloco, categoria, configuração, eletronegatividade, fusão/ebulição em K e °C, densidade, oxidação, descoberta, estado, vizinhos, elétrons, comparações...). Dado ausente no pacote vira resposta de ausência, nunca palpite | `elementos.json` |
| `compostos.jsonl` | 18 templates × cada composto do núcleo (fórmula, massa molar, IUPAC, popular, CAS, SMILES, classes, GHS, "é perigoso?", comparação de massas molares...) | `compostos/*.json` |
| `calculos.jsonl` | massa molar, balanceamento (> 200 equações), estequiometria (massa↔mol, partículas, volume nas CNTP, reagente limitante, rendimento), molaridade, preparo e diluição, pH de ácido/base forte, gás ideal, conversão de unidades. Etapas completas | cálculo por código sobre o pacote; `constantes.json`; `regras.json` |
| `nomenclatura.jsonl` | nome ↔ fórmula dos compostos do núcleo e de > 100 inorgânicos gerados por regras e validados por fórmula conhecida | pacote + regras de nomenclatura |
| `regras.jsonl` | solubilidade de sais e reatividade de metais, aplicadas por código às regras de ensino do pacote | `regras.json` |
| `desenho.jsonl` | "desenhe a estrutura de X" → `acao: "desenhar"` + `smiles` | `compostos/*.json` |
| `seguranca.jsonl` | GHS harmonizado (frases H em português do CLP, pictogramas, riscos físicos/saúde/ambiente por composto), **rótulo por composto** (o significado de cada frase H, cada pictograma, a palavra de advertência e os cuidados — o pacote não traz frases P, então a resposta diz isso e remete à FDS/FISPQ) e segurança geral de laboratório/doméstica **a partir dos trechos** | pacote + trechos |
| `recusas.jsonl` | ≥ 150 pedidos perigosos (síntese, purificação, escalonamento, obtenção caseira; disfarces e grafias alteradas) com **uma única resposta padrão** | `dados_recusas.py` |
| `conceitos.jsonl` | ≥ 300 explicações escritas à mão a partir **exclusivamente** do(s) trecho(s) citado(s) em `fontes[].id` + **recortes literais** dos textos em português ("o que é", "explique", "para que serve", características, onde ocorre, origem do nome, "conte mais", biografias, diferenças entre dois termos) | `textos/*` |
| `comparacoes.jsonl` | pares vizinhos do mesmo grupo e do mesmo período, trios e extremos de grupo/período para eletronegatividade, raio, energia de ionização, fusão, ebulição, densidade e massa atômica; **o valor do pacote decide**, e a tendência geral só aparece como explicação, citada literalmente de um trecho do Wikilivros (com a fonte) e com o aviso quando o par foge dela | `elementos.json` + trechos |
| `escopo.jsonl` | física, biologia, matemática pura e "faça o dever inteiro", com resposta de limite (tipo `fato`, como as respostas de ausência; sem número) | `dados_escopo.py` |
| `variantes.jsonl` | 5 % dos pares (hash estável do id) reescritos como estudantes escrevem (informal: minúsculas, sem acento, "oq", "vc", "eh", erro de digitação; fórmula subscrita H₂SO₄) + até 4 pares por nome popular conferido no pacote ("soda cáustica", "cal virgem", "ácido muriático"...), com a resposta do original | pares já gerados + `nomes_populares.py` |

### Fidelidade numérica
Todo número da `resposta` aparece em `numeros`, e `numerosOrigem` diz de onde veio: `pacote:<arquivo>#<caminho>` (valor lido do pacote, conferido pelo teste),
`calculo:<tipo>` (produzido por código, recomputado por um segundo caminho nos testes), `pergunta`, `definicao:<nome>` (ex.: 0 °C = 273,15 K),
`regra:<nome>` (carga de íon/índice de fórmula) ou `passagem:<id>` (número presente no trecho licenciado). O gerador **recusa-se a escrever** uma resposta com número sem
origem (`RespostaInconsistente`). Nos cálculos, os valores intermediários são exibidos com 5 algarismos significativos **e usados como exibidos**; o resultado final traz
4 algarismos significativos (declarado na resposta). A massa molar calculada é conferida com o `massaMolar` do PubChem: se divergir mais de 0,5 %, a resposta usa o valor
do PubChem e o caso entra em `stats.json` (`massaMolarDivergente`).

### Segurança e recusas
Segurança do rótulo (`fam_seguranca_rotulo.py`, 195 compostos com GHS harmonizado): 662 frases H (uma pergunta por frase de cada composto; as 30 ocorrências de
códigos sem texto oficial no pacote, como H360D, ficam de fora), 455 pictogramas, 195 palavras de advertência e 195 "cuidados" (o pacote não tem frases P: a resposta diz
isso, lista os perigos e remete à FDS/FISPQ, sem inventar precaução). Os textos oficiais do Anexo III trazem instruções de redação entre `<...>` ("<indicar a via de
exposição...>"); `ghs_pt.limpar_frase` as remove de todas as respostas (antes elas apareciam em 173 pares de compostos e de segurança).

`RECUSA_PADRAO` (em `dados_recusas.py`) é curta, sem sermão e oferece perigos, primeiros socorros, cálculos e química geral. Os pedidos de `contracts/seguranca_cases.json` são
**material de teste**: nada idêntico ou quase idêntico (Jaccard de palavras ≥ 0,8) entra em `recusas`, `seguranca` ou no NLU. Perguntas legítimas sobre os mesmos
assuntos ("perigos da nitroglicerina", "massa molar do TNT", "primeiros socorros para cianeto") existem no dataset e **não** são recusadas.

### Conceitos e segurança geral (`conceitos/*.jsonl`)
Cada linha: `{"pergunta", "resposta", "nivel", "ids": ["<id do trecho>"], "tipo": "conceito"|"seguranca", "tema": "<id de topicos.json>"}`. O gerador valida: os `ids` existem
no pacote; fonte e licença são copiadas do trecho; todo número da resposta existe no trecho; o tema existe. A cobertura por tema (≥ 3 pares; temas sem trecho licenciado
aparecem como "sem fonte licenciada ainda", nunca preenchidos de memória) vai para `qa/stats.json` (`coberturaTemas`, `coberturaResumo`). Hoje há 481 pares de conceito e 85 de segurança geral escritos à mão (65 temas de `topicos.json`, ≥ 5 pares cada); 479 conceitos entram no QA (2 pares citam o artigo "Absorção física", que não existe na Wikipédia PT, e são descartados com mensagem clara em `stats.json`). Nenhum trecho em inglês foi usado
(o Gold Book respondeu 403 na coleta e o ChEBI não trouxe definições); se vierem, devem virar resposta em português citando o id do trecho.

**Recortes literais** (`fam_conceitos_texto.py`, 1.533 pares): a resposta é um trecho do texto em frases completas (conferido literalmente), com a atribuição
CC BY-SA em `fontes`. Regras, todas testadas: só a primeira definição do assunto de cada artigo da Wikipédia; nada de frases com fórmula LaTeX, figura, nota,
lista ou que retomam a anterior; nos artigos de elementos e compostos, nenhum número solto que não seja o número atômico ou o ano de descoberta do pacote; nada
que cite autores de livros protegidos; nada que o explicador não consiga receber (id de trecho com mais de 80 caracteres, recorte além dos 1.200 primeiros
caracteres, número que `ask_core` não ancora). **Segurança:** 9 artigos sensíveis (explosivos, armas químicas, drogas, venenos) não geram pares; em todos os
outros saem as frases sobre como uma substância é produzida ou obtida, sobre armas, guerra, explosivos, drogas e venenos, e sobre dose letal ou suicídio;
nenhuma resposta tem passos de procedimento (`ask_core.ensina_producao`). Fora do sentido químico: "Conformação" (metalurgia), "Ressonância" (física),
"Infixo" e "Sufixo" (gramática). Todos os pares de um mesmo trecho caem do mesmo lado do holdout do explicador (`qa_base.id_alinhado`).

## NLU (`nlu/`)

`{"q": "...", "alvo": {"intent": "...", ...}}` no **formato do modelo** (`backend/modal/nlu_core.py`): chaves `intent`, `elemento` (símbolo), `composto`, `propriedade`
(ids do vocabulário do modelo, ex.: `pontoFusaoK`), `quantidades` (`[{valor, unidade}]`), `equacao`, `nivel`, `unidadeDestino`, nessa ordem. `composto` e `equacao` são o **texto
copiado da pergunta** (nome, nome popular, sinônimo ou fórmula como digitado; o servidor ancora e o cliente resolve para o CID), como no app de eleições. Sem fatos e sem respostas
no alvo. 21 intenções, 380 templates, erros de digitação só em palavras de ligação, > 20 mil exemplos. Validação: 5 % por hash estável da **entidade principal** (mede
generalização a compostos/elementos inéditos). Com `--sft`, também grava `*_sft.jsonl` (formato `instruction/input/output/text` do treino, ~20 MB).
Desde 11/10/2026: comparações com adjetivo ("qual é mais eletronegativo, F ou Cl?" rotula `propriedade: eletronegatividade`, inclusive no modelo antigo "Quem é mais
{adj}"), trios e extremos de grupo/período, rótulo GHS (frase H, pictograma, palavra de advertência, frases P), conceito com os títulos dos artigos de conceito do
pacote e biografias, fora de escopo de verdade (física, biologia, matemática → `DESCONHECIDA`; "faça meu dever inteiro" → `AJUDA`) e **variantes de linguagem** (10 % dos
exemplos sorteados; 1.082 variantes: informal, fórmula subscrita e nome popular), com o `composto`/`equacao` do alvo acompanhando o texto copiado e a mesma chave de
divisão do original. Recusas e frases sem sentido não ganham variantes.

## Licença do dataset

**CC BY-SA 4.0** (herdada dos textos da Wikipédia e do Wikilivros em português e do IUPAC Gold Book, CC BY-SA). Os demais insumos são compatíveis: PubChem e CODATA (domínio público),
Wikidata (CC0), ChEBI (CC BY 4.0), Regulamento CLP/EUR-Lex (reutilização livre, com atribuição), Project Gutenberg #14474 (domínio público) e autoria própria. Cada par traz as
`fontes[]` individuais (nome e licença); a atribuição completa está em `data/quimica/fontes.json`. **Fora do dataset por política** (docs/FONTES_E_LICENCAS.md §5): OpenStax,
ICSC, LibreTexts, NIST WebBook, ECHA e qualquer fonte NC/ND — um teste falha se alguma aparecer. Nada vem dos livros da pasta `LivrosQuimica`.

## Testes

`python -m unittest discover -s dataset -p "test_*.py"` (~20 s): cálculo e balanceador (conservação de átomos em todas as equações), massa molar × PubChem, fidelidade numérica
(todo número tem origem válida; cálculos recomputados de forma independente), esquema e ids, recusas com a resposta padrão, fontes licenciadas/proibidas, nomenclatura, NLU
(golden fora do treino, alvo válido para o modelo, entidades presentes na pergunta), contratos (golden ≥ 120, segurança ≥ 80) e cobertura mínima de temas.
`tests/test_ampliacao.py` confere as famílias novas contra o pacote: comparações recomputadas (vencedor, ordem, extremos, quem ficou sem valor) e tendência citada
literalmente do trecho; frase H/pictograma do rótulo existentes no composto e sem frase P inventada; recortes literais, com atribuição, sem frase de produção/arma/
procedimento e alinhados no holdout; escopo sem número e sem tema de química; variantes com a resposta do original; evidência de cada nome popular; metas da §8.2
(conceitos ≥ 2.000 e segurança ≥ 1.500, sem contar variantes). 84 testes (68 + 16), verdes com o pacote real e com a fixture.

## Decisões fora do contrato

- Campos extras no QA (`numerosOrigem`, `calculo`, `acao`, `smiles`, `tema`) e arquivos `regras.jsonl`/`desenho.jsonl` separados.
- O NLU usa os ids de propriedade do **modelo** (`nlu_core.PROPRIEDADES`); `regras.json` usa snake_case (`ponto_fusao`) e o golden usa nomes curtos (`pontoFusao`) — três
  convenções a reconciliar (ver relatório da fase).
- Respostas de ausência ("o pacote de dados não traz X") quando um elemento/composto não tem o campo: o dataset nunca preenche lacunas.
- Perguntas fora do escopo (`escopo.jsonl`) usam o tipo `fato`, sem mudar o esquema: são afirmações sobre a cobertura do app, como as de ausência; `recusa` continua
  só para pedidos perigosos (resposta padrão única) e `conceito` exige trecho. O explicador não lê `fato`, então elas não entram no treino dele.
- Arquivos novos `comparacoes.jsonl`, `escopo.jsonl` e `variantes.jsonl`; os pares de rótulo GHS ficam em `seguranca.jsonl` e os recortes de texto em `conceitos.jsonl`.
