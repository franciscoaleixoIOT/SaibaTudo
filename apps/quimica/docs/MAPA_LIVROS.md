# Mapa dos livros didáticos: o que o estudante pergunta e o que o app responde (17/10/2026)

**Para que serve.** Os livros de química da pasta `LivrosQuimica` do projeto irmão são obras protegidas (CLAUDE.md §1): nada do texto, das
tabelas ou dos exercícios deles entra no repositório, no dataset ou no modelo. Mas eles dizem **o que um estudante pergunta de verdade** e
**onde olhar**. Este mapa usa os livros só como bússola: cada exercício foi reduzido localmente a derivados estruturais (tema, o que é
pedido, entidades químicas citadas, se a resposta é um dado ou um cálculo) e a UMA pergunta curta em pt-BR escrita por um modelo local,
no estilo de quem digita no app. As respostas continuam vindo do pacote (PubChem, Wikidata, CODATA, CLP) e dos cálculos locais.

**Onde está o que não pode entrar no Git.** Scripts, cache de texto, classificação, relatórios detalhados e gabaritos ficam em
`apps/quimica/local/mapa_livros/` (pasta ignorada; `README` no topo de `lib_livros.py`). Este documento traz só contagens e conclusões.

## 1. Método

| Etapa | Ferramenta (local) | Resultado |
|---|---|---|
| Estrutura dos PDFs | PyMuPDF: sumário nativo, capítulos por regex, páginas com exercícios | 23 PDFs; 20 com camada de texto (3 só imagem, fora: Levine, Martha Reis FQ, McQuarrie); 1 `.azw3` não lido |
| Segmentação | regex de numeração ("12.", "12 (Fuvest)", "5.12", "E1A.1") | **15.382 exercícios** em 16 livros (Atkins 2.249, Tito 1 1.549, Tito 2 1.520, Weller 1.479, Brown 1.135, Inorgânica 5ª 1.102, Martha 1 1.086, Tito 3 999, Martha 2 983, Martha 3 952, Suplemento 539, Feltre 2 493, Feltre 3 475, Feltre 1 439, Solomons 228, Clayden 154) |
| Classificação | Qwen3-4B-Instruct-2507 (Apache 2.0) em 4 bits na GPU local, saída JSON | amostra estratificada por livro + todos os itens com gabarito: **2.052 exercícios classificados** (117 inválidos refeitos/descartados) |
| Perguntas derivadas | "pergunta_app" escrita pelo modelo local (nunca o enunciado) | **2.030 perguntas** em pt-BR, avaliadas pelas regras do site (`nlu.js`, pacote real) e pelo NLU v3.4 (GGUF local) |
| Gabaritos | blocos "Respostas" dos livros do ensino médio (nº → letra) | 615 questões de múltipla escolha casadas; 240 de tipo calculável |
| Compostos citados | fórmulas (regex) e nomes (classificador) resolvidos no pacote por fórmula/nome | 1.415 termos distintos |

Texto dos livros não sai da máquina: o classificador roda na GPU local e os agentes na nuvem receberam só os derivados.

## 2. O que os exercícios pedem × o que o app faz

Tipo = tema principal do pedido (taxonomia do app + temas fora dela). "dado/cálculo" = parcela cuja resposta é um dado tabelado ou um
cálculo padrão com os números do enunciado (o resto exige raciocínio, mecanismo, gráfico ou estrutura desenhada).

| tipo | no app? | como atende | exercícios | % | dado/cálculo |
|---|---|---|---|---|---|
| CONCEITO | sim | texto do pacote | 489 | 23,8 % | 8 % |
| PROPRIEDADE | sim | ficha/tabela | 308 | 15,0 % | 72 % |
| ESTEQUIOMETRIA | sim | calculadora | 97 | 4,7 % | 99 % |
| REACAO_ORGANICA | **não** | — | 96 | 4,7 % | 44 % |
| NOMENCLATURA | sim | ficha | 89 | 4,3 % | 88 % |
| GAS_IDEAL | sim | calculadora | 88 | 4,3 % | 98 % |
| COMPOSTO | sim | ficha | 88 | 4,3 % | 85 % |
| TERMOQUIMICA | **não** | — | 88 | 4,3 % | 84 % |
| CONCENTRACAO | sim | calculadora | 67 | 3,3 % | 94 % |
| ISOMERIA_ESTRUTURA | **não** | — | 64 | 3,1 % | 80 % |
| ATOMISTICA | **não** | — | 50 | 2,4 % | 86 % |
| EQUILIBRIO | **não** | — | 46 | 2,2 % | 74 % |
| TABELA_PERIODICA | sim | tabela | 43 | 2,1 % | 81 % |
| CINETICA | **não** | — | 43 | 2,1 % | 67 % |
| LIGACAO_QUIMICA | **não** | — | 42 | 2,0 % | 74 % |
| BALANCEAR | sim | calculadora | 35 | 1,7 % | 97 % |
| MASSA_MOLAR | sim | calculadora | 34 | 1,7 % | 100 % |
| DESENHAR | sim | estrutura 2D | 32 | 1,6 % | 25 % |
| FORCAS_INTERMOLECULARES | **não** | — | 29 | 1,4 % | 55 % |
| ELETROQUIMICA | **não** | — | 25 | 1,2 % | 68 % |
| CONVERSAO_UNIDADE | sim | calculadora | 21 | 1,0 % | 100 % |
| SEPARACAO_MISTURAS | **não** | — | 21 | 1,0 % | 76 % |
| AMBIENTAL_INDUSTRIA | **não** | — | 17 | 0,8 % | 29 % |
| SEGURANCA | sim | GHS/regras | 15 | 0,7 % | 53 % |
| ESTADOS_DA_MATERIA | **não** | — | 15 | 0,7 % | 87 % |
| PH | sim | calculadora | 14 | 0,7 % | 100 % |
| RADIOATIVIDADE | **não** | — | 14 | 0,7 % | 64 % |
| ELEMENTO | sim | ficha | 13 | 0,6 % | 100 % |
| PROPRIEDADES_COLIGATIVAS | **não** | — | 13 | 0,6 % | 38 % |
| COMPARAR | sim | tabela/ordem | 10 | 0,5 % | 90 % |
| SOLUBILIDADE | **não** | — | 10 | 0,5 % | 100 % |
| POLIMEROS_BIOQUIMICA | **não** | — | 5 | 0,2 % | 100 % |
| OUTRO | — | — | 31 | 1,5 % | 6 % |

**Leitura.** 70,3 % dos exercícios (1.443) caem em intenções que o app já tem; 29,7 % (609) ficam fora. Entre os temas de fora, os que
mais pesam E têm resposta de dado/cálculo (candidatos a calculadora/ficha nova, por rendimento): **termoquímica** (88; entalpia de reação por
Hess/formação, 84 % calculáveis), **atomística** (50; configuração eletrônica, números quânticos: 86 %), **equilíbrio** (46; Kc/Kp/Ksp,
Le Chatelier: 74 %), **cinética** (43), **ligação química** (42; tipo de ligação por eletronegatividade: 74 %), **eletroquímica** (25;
NOX e potencial padrão: 68 %), **solubilidade** (10; 100 %). Reação orgânica e isomeria pedem mecanismo/estrutura desenhada: ficam para o
explicador (SaibaTudoIA-Explica), não para calculadora.

Perfil por livro (amostra): ensino médio (Tito, Feltre, Martha, Suplemento) concentra concentração, pH, estequiometria, tabela periódica e
nomenclatura; superior (Atkins, Brown, Clayden, Solomons, Weller, Inorgânica) concentra conceito, termoquímica, atomística, isomeria e reação
orgânica. A tabela completa tipo × livro fica em `local/mapa_livros/cache/MATRIZ.md`.

## 3. O interpretador entende as perguntas derivadas?

Perguntas derivadas (texto nosso) avaliadas com o pacote real. "Coerente" = a intenção devolvida é a do tipo do exercício ou uma
equivalente (COMPOSTO para MASSA_MOLAR/PROPRIEDADE de composto etc.); para temas fora do app, coerente = CONCEITO/DESCONHECIDA (não
inventar um dado).

| avaliador | perguntas em intenções do app | coerentes | observações |
|---|---|---|---|
| Regras do site (`nlu.js`), ANTES das correções de 17/10 | 1.376 | 693 (50,4 %) | fortes: BALANCEAR 89 %, MASSA_MOLAR 78 %, CONCENTRACAO 77 %, PH 77 %; fracas: CONVERSAO_UNIDADE 5 %, GAS_IDEAL 12 %, ESTEQUIOMETRIA 37 %, CONCEITO 44 % |
| Regras do site, DEPOIS das correções de 17/10 (mesmas perguntas) | 1.378 | 728 (52,8 %) | NOMENCLATURA 48 → 79 %, CONVERSAO_UNIDADE 5 → 24 %; o resto das discordâncias é recorte ou pergunta que depende de figura |
| Regras do site, DEPOIS das calculadoras novas (17/10, noite; `CALCULADORAS_2026-10-17.md`) | 1.423 | 723 (50,8 %) | 61 perguntas mudaram: TERMOQUIMICA → ENTALPIA 22 (eram COMPOSTO), LIGACAO_QUIMICA → LIGACAO 13, NOX 5; a base cresceu porque EQUILIBRIO (45) passou a contar como intenção do app — e só 1 bate: a pergunta derivada de um passo perde a equação, que o contrato de EQUILIBRIO exige ("qual a expressão da constante de equilíbrio dessa reação?"). Termoquímica de livro de nível superior (capacidade térmica, ΔG(T), entropia de expansão) continua fora por desenho |
| NLU v3.4 (GGUF local, gramática de produção) | 1.376 | 800 (58,1 %) | fortes: PH 100 %, NOMENCLATURA 92 %, ELEMENTO 91 %, CONCENTRACAO 88 %, BALANCEAR 86 %, DESENHAR 84 %, CONCEITO 74 %; fracas: PROPRIEDADE 23 % (ver §3.1), CONVERSAO_UNIDADE 33 %, ESTEQUIOMETRIA 40 %, GAS_IDEAL 41 % |

Boa parte das discordâncias é do próprio recorte (o classificador chama de GAS_IDEAL "volume de 2 mol nas CNTP", que o app resolve como
ESTEQUIOMETRIA; perguntas que dependem de figura/tabela do livro são irrespondíveis por texto). As lacunas reais das regras, confirmadas
uma a uma com perguntas de sonda, foram corrigidas em 17/10 (site + Android em paridade, léxico nos 5 idiomas, casos golden novos):

1. Estequiometria sem "quantos": "massa de água formada a partir de 2 g de hidrogênio", "qual massa de O2 reage com 10 g de Cu2S?" (caíam em COMPOSTO).
2. Frações e numerais por extenso: "1/2 mol", "½ mol", "meio mol", "dois mols" (lidos como duas quantidades ou nenhuma).
3. Ordenar/comparar vários: "ordem crescente de número atômico de Na, Al, Zn, Ni e Pd", "qual tem maior raio atômico: K ou Na?" (caíam em PROPRIEDADE de um só); COMPARAR ganhou lista ordenada com valores e fonte.
4. Notação científica e sobrescritos: "1,2 × 10²³ átomos", "1,0 × 10^4 L" (caíam em DESCONHECIDA).
5. Conversão com unidades por extenso e vários destinos: "1,820 mL para litros e metros cúbicos", "1.520 mmHg para atm, kPa e torr".
6. "mistura" não é segurança: "a água mineral é pura ou mistura?" (caía em SEGURANCA).
7. Nomenclatura com nome IUPAC fora do pacote: "como se chama o 2-cloro-butano?" (caía em DESCONHECIDA).

### 3.1 NLU v3.4 (modelo)
1.945 perguntas derivadas avaliadas com o GGUF de produção (CPU, gramática). O modelo entende melhor que as regras o que é conceito
(74 % × 44 %) e o que é nomenclatura/pH/concentração, e cita 827 compostos, dos quais 438 (53 %) resolvem no pacote — os outros são
nomes IUPAC de orgânicos, íons e classes que o pacote não tem (§4). A fraqueza em PROPRIEDADE (23 %) é em grande parte do recorte: o
classificador local chama de PROPRIEDADE perguntas conceituais sobre propriedades ("quais são as propriedades das nanoestruturas", "qual
a geometria molecular de X"), que o modelo devolve como CONCEITO (96 casos) ou COMPARAR (51, quando há dois elementos); o app responde as
duas. Discordâncias que valem treino (corpus v3.5): ESTEQUIOMETRIA → CONCENTRACAO (23) e → BALANCEAR (12), CONVERSAO_UNIDADE →
ESTEQUIOMETRIA (10), TERMOQUIMICA → GAS_IDEAL (14; o modelo não tem a intenção e inventa a vizinha), ISOMERIA → DESENHAR (15, aceitável).
Detalhe em `local/mapa_livros/cache/NLU_COBERTURA.md`.

## 4. Compostos que os livros citam e o pacote não tinha

Dos 1.415 termos citados (fórmulas e nomes), 550 resolvem no pacote (1.832 citações) e 865 não (1.043 citações). A cauda é longa
(radicais, íons, classes, nomes de estrutura desenhada); os compostos reais mais citados que faltavam, e o que foi feito:

| termo | citações | ação (17/10) |
|---|---|---|
| Fe₂O₃, Fe(OH)₃, Ag₂O, P₂O₅/P₄O₁₀, Fe₃O₄, Na₂S, CaC₂, CoCl₂, glutamato monossódico | 8, 6, 4, 4, 3, … | **estavam na lista fixa e eram descartados em todo build**: a busca por nome do PubChem devolve 404 para nomes de Stock ("iron(III) oxide") ou um registro de fórmula diferente. Dica `cid=NNN` na `lista_fixa.py` (conferida pela fórmula) |
| NH₄OH, Ag₂S, ICl, Ag₂SO₄, HIO₄, HBrO₃, HMnO₄, FeI₃, KIO₃, KF, Cu₂S | 6, 4, 4, 3, 2, 2, 2, 2, … | acrescentados à lista fixa (CIDs conferidos no PubChem) |
| gelo seco (CO₂), leite de magnésia (Mg(OH)₂) | 3 | apelidos populares nos 5 idiomas (`APELIDOS_POR_IDIOMA`) |
| polietileno, poliestireno, PVC, celulose | 6, 5, 4, 3 | polímeros sem CID único de substância: ficam para a família "polímeros" (conceito), não para ficha |
| éster, alceno, alcano, álcoois, amida, hidrocarbonetos | 4, 4, 3, 3, 2, 2 | classes, não compostos: pendência "CLASSES_DE_COMPOSTOS no léxico" (PENDENCIAS §6.b) ganha prioridade |

Tudo isso vale no próximo build do pacote (`quimica-data-refresh` ou build local).

## 5. Conferência de respostas numéricas contra os gabaritos

240 questões de múltipla escolha do ensino médio com gabarito e tipo calculável foram submetidas ao motor do site pela pergunta derivada:
16 conferem com a letra do gabarito, 21 divergem, 65 não casam com nenhuma alternativa, 40 são ambíguas e 98 não têm número na resposta.
**A divergência não indica erro do app**: a pergunta derivada é uma simplificação (um só passo) de um problema de vários passos, e as
alternativas trazem números intermediários. Nos casos olhados um a um (pH de HCl 0,01 mol/L → pH 2,00; 2,08 g de CO₂ → 0,0473 mol), o
app está certo e o gabarito responde a outra pergunta. A conferência de **dados** (massas, constantes, propriedades) contra o CRC já foi
feita em 11/10 (PENDENCIAS §10); para exercícios completos seria preciso resolver o problema inteiro, o que é papel do explicador.

## 6. Decisões e próximos passos

- **Dados**: lista fixa corrigida e ampliada (§4). **Feito em 17/10 (noite):** rebuild local com `--paciente --pubchem-cache-primeiro` (473 s;
  `listaFixaDescartadas` vazia, os 20 compostos no pacote; o total fica em 1.971 porque o alvo 2.000 cede 20 vagas do Wikidata à lista fixa) +
  termoquímica padrão (ΔHf° em 281 compostos, ΔGf° 81, S° 258; chembox da Wikipédia en, `DATA_CONTRACT.md` §3.1).
- **Regras do NLU**: 7 lacunas corrigidas (§3) e, à noite, as 4 intenções novas + configuração eletrônica enriquecida (tabela de §3, linha
  "DEPOIS das calculadoras novas").
- **Corpus do NLU (v3.5)**: os padrões reais que faltam ao gerador — notação científica, frações, "massa de X formada a partir de", "como se
  chama <nome IUPAC>", "é mistura ou substância pura", ordenação de listas — entram como famílias novas em `ia/corpus/` antes do próximo
  treino. Nenhuma frase dos livros entra: só o padrão.
- **Calculadoras novas por rendimento** — **feitas em 17/10 (noite), na ordem decidida pelo mantenedor:** entalpia (formação + combustão +
  lei de Hess na tela Calculadoras; ΔHf° do pacote), configuração eletrônica (resposta de PROPRIEDADE enriquecida: notação completa, camadas,
  valência; sem intenção nova), NOX por regra, Kc/Kp (expressão, Δn, Kp = Kc(RT)^Δn, valor com concentrações), tipo de ligação por ΔEN de
  Pauling. Contrato, fontes e decisões em `docs/CALCULADORAS_2026-10-17.md`. Lacunas que o mapa mostrava nesses temas, **fechadas em 18/10 (madrugada)**: Kc sem
  equação → CONCEITO "constante de equilíbrio" com ação "Abrir a calculadora de Kc e Kp"; prótons/nêutrons/elétrons de átomo, íon e isótopo →
  propriedade `particulas` (carga e número de massa lidos da pergunta); ΔGf° e S° com id no NLU e na ficha. Continua em aberto: Kps e
  solubilidade de sais (SOLUBILIDADE 0 %).
- **Classes de compostos** no léxico e no CONCEITO (éster, alceno, amida…), já pendente, sobe de prioridade.
- **Livros abertos (CC BY)** da pendência §(UNILA/USP) continuam sendo a fonte certa de TEXTO para os conceitos que os livros fechados
  mostraram faltar.
