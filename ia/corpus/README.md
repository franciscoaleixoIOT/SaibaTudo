# SaibaTudo.IA — corpus único do interpretador (NLU)

Etapa 2 de [`docs/PLANO_IA_SAIBATUDO.md`](../../docs/PLANO_IA_SAIBATUDO.md). O corpus treina **um** NLU para todos os apps (base
Qwen3.5-2B). Em produção a função `nlu` recebe `app` (+ `idioma`) e escolhe o system prompt e a gramática do app. Por isso o
`instruction` de cada exemplo é **exatamente** o system prompt de produção do seu app, importado por caminho e sem cópia:

| app | prompt | formato de saída |
| :-- | :-- | :-- |
| `eleicoes2026` | `apps/eleicoes2026/backend/modal/nlu_core.py` → `SYSTEM_PROMPT_V2` | v2 (`format_output_v2`) |
| `quimica` | `apps/quimica/backend/modal/nlu_core.py` → `SYSTEM_PROMPT` | v1 (`format_output`, gramática GBNF) |

## Como rodar (só CPU, ~1 min)
```bash
python -I ia/corpus/montar_corpus.py                 # grava ia/corpus/out/ (fora do Git: /ia/**/out/)
python -I -m unittest discover -s ia/corpus -p "test_*.py"
python -I ia/corpus/quimica_idiomas/verificar_modulo.py      # confere os moldes en/es/de/fr contra o léxico
python -I ia/corpus/quimica_multilingue.py --idiomas de --amostra 30   # amostra do gerador multilíngue
```
Opções: `--teto-intencao-quimica-pt` (padrão 2400; 0 desliga), `--val-pct-quimica` (3), `--idiomas`, `--escala`,
`--linha-idioma-quimica` (acrescenta a linha proposta abaixo; **não** é o prompt de produção).

## Saídas (`out/`)
- `corpus_nlu.jsonl`: o formato único `{app, idioma, tarefa: "nlu", entrada, saida (string JSON do contrato do app), fonte, licenca, origem
  (template | externo | holdout), divisao (treino | val | holdout)}`.
- `train.json` / `val.json`: `{instruction, input, output, app, idioma, intent}`. É o formato que
  `apps/eleicoes2026/ai_model/scripts/train_hybrid.py` lê. Os exemplos vêm em ordem estável, com apps e idiomas intercalados.
- `holdout_eleicoes.json` / `holdout_quimica.json`: `{"cases": [...]}` no esquema dos golden (`eval_golden.py --cases`), com `idioma`.
  Esses casos **nunca treinam**.
- `contagens.json`: contagens por app, idioma, intenção, origem e divisão, os descartes de cada filtro, o teto aplicado, a configuração
  e os prompts usados.

## Fontes e licenças
| Fatia | Fonte | Licença registrada |
| :-- | :-- | :-- |
| Eleições, pt-BR | `../SaibaTudoEleicao2026/backend/retrain/out-v23/{train,val}.json`, o treino do v2.3, **como está** (nenhum exemplo novo antes de 27/10). As perguntas de `apps/eleicoes2026/backend/retrain/extra/rotuladas_*.jsonl` recebem `origem: externo` com a fonte e a licença de lá | formulações do projeto; rótulos sobre dados abertos do TSE (CC BY) |
| Eleições, holdout | `out-v23/holdout_cases.json`: as 435 perguntas reservadas do gate do v2.3 | idem |
| Química, pt-BR | `apps/quimica/dataset/nlu/{train,val}.jsonl` (`dataset/gerar_nlu.py`), passados por `backend/retrain/build_nlu_dataset.construir`. O `val.jsonl` (divisão por entidade) vira holdout | CC BY-SA 4.0 |
| Química, en/es/de/fr | `quimica_multilingue.py` + `quimica_idiomas/<idioma>.py`, também passados por `build_nlu_dataset.construir`. Usa nomes do pacote assinado (`elementos[].nomes`, `compostos[].nomes`/`sinonimosPorIdioma`: PubChem, Wikidata), equações, fórmulas e códigos H dos módulos de `apps/quimica/dataset/` | CC BY-SA 4.0 |
| Química, compostos do dia a dia (5 idiomas, desde o v3.1 em 13/10/2026) | `quimica_populares.py`: ~115 compostos (todos com `nomePopular` + lista conferida de substâncias do cotidiano) pelos nomes como as pessoas escrevem (nome popular, `sinonimosPorIdioma` curtos, fórmula também em minúsculas) nos padrões em que o NLU v3 deixou de copiar o `composto` no golden (perigos/segurança, propriedade, massa molar, "o que é", estequiometria de queima, diluição, pH). Desde o v3.2: **sem** as 13 substâncias elementares do pacote (O2, H2, Cl2, O3, gases nobres — nome de elemento é `ELEMENTO`, nunca composto) e com um grupo de perguntas pelo **nome do elemento** nos 5 idiomas (ELEMENTO, MASSA_MOLAR, PROPRIEDADE só para `massaAtomica` — "massa atômica de X" é PROPRIEDADE e "massa molar de X" é MASSA_MOLAR, como no golden; SEGURANCA → `elemento` = símbolo; elementos comuns pesam 12×, 8 % com erro de digitação). Mesmo construtor e filtro do golden; fica **fora** do teto por intenção da química pt (`--escala-populares`, 0 desliga) | CC BY-SA 4.0 |

Nada de `LivrosQuimica`. Os moldes en/es/de/fr têm só formas de perguntar, sem fatos químicos. Os de es/de/fr foram escritos sem
abrir os golden nem os casos de segurança.

## Regras aplicadas (todas testadas em `test_montar_corpus.py`)
- **Testes fora do treino.** Nenhuma pergunta de train/val é idêntica (texto normalizado) ou quase idêntica (Jaccard de palavras ≥ 0,8,
  com a mesma normalização de `apps/eleicoes2026/backend/retrain/build_nlu_dataset.py`) a um caso de teste. Os casos de teste são: o golden
  das eleições, `nlu_real_cases`, `nlu_nome_cases`, `opiniao_cases`, o holdout de 435, o golden da química nos cinco idiomas (723) e
  `seguranca_cases`. A química também passa pelo filtro do próprio app (`dataset_common.FiltroDeContrato`).
- **Rótulos pelo contrato de cada app.** Na eleição o `has_valid_shape(v2)` vale junto com os vocabulários de cargo, UF, tema e histórico, e
  a saída tem de estar canônica. Na química valem `has_valid_shape` e `format_output`. O `composto` e a `equacao` são o texto copiado da
  pergunta: o gerador confere isso, inclusive a caixa, e a evidência das quantidades vem de `build_nlu_dataset.evidencia_basica`.
- **Sem duplicatas.** Duplicata é o mesmo texto por app, a menos de espaços. Variantes de caixa ficam, porque o nome é copiado com a caixa da
  pergunta. O v2.3 tem 65 pares desses.
- **Superfície nos idiomas estrangeiros**, como no gerador pt: caixa, acentos, cortesia (prefixos e sufixos), abreviações de chat, ~8 % de
  fórmulas com subscrito (H₂SO₄) e erros de digitação **só em palavras de ligação** (`TYPO_OK`), nunca em entidades.
- **Holdout por entidade.** Nos idiomas estrangeiros 5 % das entidades (composto, elemento ou equação) ficam só no holdout. Isso mede a
  generalização a nomes inéditos.
- **Proporção.** A química pt tem teto de 2400 exemplos por intenção, que só corta PROPRIEDADE (3200 → 2400). A eleição fica como está.
  Resultado no treino: química ~62 %, eleições ~38 %. É a faixa prevista: eleições ~20 mil, química pt ~20 mil e ~4 mil por idioma
  estrangeiro. O teste exige que nenhum app passe de 70 %.

## Prompt da química e idioma
A API da química não passa o idioma ao modelo. `api/_lib/nlu-handler.js` envia só `{q, v: 1}`, e `api/_lib/seguranca.js` diz que "o
idioma da interface não chega à API". O `nlu_app.py` monta o prompt com `SYSTEM_PROMPT` + a pergunta. Como o contrato de saída não depende
do idioma (o composto é copiado e propriedade e unidade são ids), o NLU **não precisa** de uma linha por pedido. O prompt de produção, porém,
está em português e não diz que a pergunta pode vir em outra língua. **Mudança proposta** (não aplicada; entra junto com a troca do modelo
da química): acrescentar ao `SYSTEM_PROMPT` de `apps/quimica/backend/modal/nlu_core.py` a frase

> A pergunta pode estar em português, inglês, espanhol, alemão ou francês; o JSON usa sempre o vocabulário do contrato e copia o composto e a equação como foram escritos.

e regerar o corpus com `--linha-idioma-quimica`, para que treino e serviço usem o mesmo texto. O teste de igualdade lê a configuração
gravada em `contagens.json`. Se a SaibaTudo.IA passar a receber `idioma`, ele entra no mesmo lugar ("Idioma da interface: en."), mas
isso exige mudar o handler (`{q, v, idioma}`) e o Modal.

## v3.4 (16–17/10/2026): multi-turno, comparação ancorada e conceitos
`quimica_v34.py` (geradores) e `contexto_nlu.py` (formato da entrada com contexto), chamados pelo `montar_corpus.py` (`--escala-v34`, 0 desliga;
`--out` escolhe a pasta). Corpus do v3.4: `python -I ia/corpus/montar_corpus.py --out ia/corpus/out/v34 --escala-v34 0.69` (0.69 para a química
ficar abaixo de 70 % do treino); testes contra ele: `CORPUS_OUT=ia/corpus/out/v34 python -I -m unittest discover -s ia/corpus -p "test_*.py"`.
- **Multi-turno** (5 idiomas): a mensagem do usuário ganha uma linha `contexto: {JSON do contrato da pergunta anterior}` antes da pergunta de
  continuação; a saída é a de uma pergunta completa, com a entidade herdada. Cenários: troca de elemento/composto, troca de propriedade,
  ação sobre a mesma entidade (massa molar, segurança, desenhar, nomenclatura, "o que é"), troca de quantidade, troca de unidade de destino e
  ~22 % com contexto mas pergunta completa nova (o contexto não pode vazar). Validação: pergunta por `validate_question`, filtro do contrato só
  na pergunta, forma + `combinacao_valida`, evidência no texto inteiro.
- **Comparação** (5 idiomas): COMPARAR com o primeiro elemento/composto citado e a propriedade do predicado ("é mais eletronegativo",
  "ferve a uma temperatura mais alta", "é mais ácido" → `pka`, "é mais lipofílico" → `xlogp`); reatividade fica sem propriedade (não há id).
  Pares de elementos só com propriedades que todos têm no pacote, com valores diferentes; `massaMolar`/`xlogp`/`tpsa` de compostos também
  conferidos no pacote. Ebulição/fusão/densidade/solubilidade/pKa de **compostos ainda não estão no pacote** (frente C de 16/10): o NLU só
  interpreta, a resposta depende do pacote novo.
- **Conceitos** (pt-BR): títulos da Wikipédia pt (tipo conceito, filtros do `gerar_nlu`) e do Wikilivros pt; "dê um exemplo", "por que",
  "qual a diferença entre X e Y" (mesmo tema), com nível.
- **Recusas:** nenhum gerador novo. O corpus já tem 1.630 pares de RECUSA_PERIGO revisados (meta 1.000).
- Holdouts próprios (nunca treinam; texto exato fora do treino): `holdout_v34_{multiturno,comparar,conceito}.json` (~8 % por hash) e
  `holdout_v34_revisor.json` (perguntas de um revisor independente conferidas contra o contrato; montado à parte, não pelo montador).
- Equações: desde a normalização de 14/10 a pergunta chega com `→`; o rótulo agora copia a equação da pergunta normalizada.
- Para remontar o corpus do v3.4 depois do v3.5: acrescente `--escala-v35 0` (o padrão agora liga o v3.5). Os testes contra `out/v34` deixaram
  de passar em `test_quimica_cinco_idiomas...`, que desde o v3.5 exige exemplos das 4 intenções novas.

## v3.5 (17/10/2026): calculadoras (NOX, ENTALPIA, EQUILIBRIO, LIGACAO), `entalpiaFormacaoKJmol` e famílias de superfície
Contrato: `apps/quimica/docs/CALCULADORAS_2026-10-17.md` (§1 intenções, §5 famílias). Gerador `quimica_v35.py` (`--escala-v35`, 0 desliga),
chamado por `montar_corpus.carregar_v35`, e moldes pt-BR das 4 intenções em `apps/quimica/dataset/gerar_nlu.py` (`T["NOX"]`... e
`COTA_CALCULADORAS` 700/800/700/650, gerados **depois** das variantes de linguagem e com sorteio próprio: todas as outras famílias do dataset
geram exatamente os mesmos pares de antes). Só padrões escritos por nós, nenhuma frase de livro; compostos, fórmulas, íons (derivados dos sais e
ácidos do pacote: `gerar_nlu.ions_do_pacote`), equações (as de `dataset/equacoes.py`, com os coeficientes de `calculo.balancear`) e elementos vêm do
pacote e dos módulos do dataset.

Corpus do v3.5 (a química fica em 69,8 % do treino):
```bash
python -I ia/corpus/montar_corpus.py --out ia/corpus/out/v35 --escala-v34 0.69 --escala-v35 1.0 --teto-intencao-quimica-pt 850 --teto-intencao-quimica-estrangeiros 180
CORPUS_OUT=ia/corpus/out/v35 python -I -m unittest discover -s ia/corpus -p "test_*.py"
python -I ia/corpus/quimica_v35.py --familia extenso --idioma de --n 20      # amostra de uma família
```
Os tetos abrem espaço para ~7,6 mil exemplos novos sem passar de 70 %: o pt base vai a 850 por intenção (PROPRIEDADE, CONCEITO, SEGURANCA,
ESTEQUIOMETRIA, COMPARAR, MASSA_MOLAR, CONCENTRACAO e NOMENCLATURA são cortadas) e o gerador multilíngue base a 180 por intenção e idioma.
O corte é estável (hash da pergunta), não tira nenhuma recusa (`RECUSA_PERIGO` é isenta) e não toca nos populares, no v3.4 nem no v3.5.

Números (75.041 pares; treino 68.589, val 2.697, holdout 3.755; química 47.927 de treino = 69,9 %; 4.756 do gerador v3.5): NOX 1.018 no
treino (pt 728, en 74, es 70, de 74, fr 72), ENTALPIA 1.107, EQUILIBRIO 987, LIGACAO 938; `entalpiaFormacaoKJmol` 275 (PROPRIEDADE 167, COMPARAR 108). Famílias de superfície no
treino (pt / en, es, de, fr): notação 177 / 70–77, extenso 180 / 70–80, estequiometria sem "quantos" 178 / 67–72, nomenclatura por nome
sistemático 171 / 58–64, mistura 172 / 63–73, ordenação 179 / 73–81, pistas de configuração eletrônica 80 / 40–47.

| Família | Intenção e rótulo |
| :-- | :-- |
| `nox` | NOX: "NOX do S no H2SO4" → elemento (um elemento DA fórmula) + composto; "NOX de cada elemento no KMnO4" → só composto (o golden mede `elemento: null`); 15 % orgânicos ("nox do carbono em C3H8"); íons "MnO4-", "Cr2O7 2-", "NH4+" copiados como composto |
| `entalpia` | ENTALPIA: combustão de <combustível do pacote> (composto), de <equação balanceada> (equacao), calor da queima de <quantidade> de <composto> (composto + quantidades), "lei de Hess" sem entidade |
| `equilibrio` | EQUILIBRIO (equacao obrigatória): seta `⇌`, `<=>`, `<->`, `→`, `=` ou `->` (o serviço normaliza para `⇌`/`→` e o rótulo copia a pergunta normalizada); 25 % com o estado físico de cada espécie pelo `estadoPadrao` do pacote ("CaCO3(s) ⇌ CaO(s) + CO2(g)"); Kp a <T> (quantidade K/°C); `[X] = v mol/L` e `p(X) = v atm` na ordem do texto, também antes da equação ("com [N2O4] = ..., qual o Kc de ...?") |
| `ligacao` | LIGACAO: par de elementos → elemento = o PRIMEIRO; composto → composto; "ligação no ferro metálico" → elemento |
| `entalpia_formacao` | PROPRIEDADE/COMPARAR com `entalpiaFormacaoKJmol` (formas do léxico: "entalpia (padrão) de formação", "calor de formação"); COMPARAR com o primeiro composto; + CONCEITO de contraste ("o que é entalpia?", "o que é NOX?") |
| `configuracao` | PROPRIEDADE + `configuracaoEletronica` pelas pistas novas ("elétrons de valência", "camada de valência", "diagrama de Linus Pauling", "distribuição eletrônica"; CALCULADORAS §1: não é intenção nova). Família a mais do que o §5 pede, porque o golden de 17/10 traz esses casos |
| `notacao` | quantidades "2,5 × 10³ g", "3x10^-2 mol", "1,5·10⁻³ mol/L", "4 x 10^(-5) M", "1.5e-3" (ESTEQUIOMETRIA, CONCENTRACAO, PH, CONVERSAO_UNIDADE, GAS_IDEAL) |
| `extenso` | "meio mol" 0,5; "um quarto de mol" 0,25; "um mol e meio" 1,5; "dois mols" 2; "1/2", "½"; "meio litro", "dois quilos"; en "half a mole", es "medio mol", de "ein halbes Mol"/"einem halben Mol", fr "une demi-mole". "um mol" fica de fora (é MASSA_MOLAR) |
| `esteq_formada` | ESTEQUIOMETRIA sem "quantos": "massa de X formada a partir de N g de Y", "quanto CO2 se forma na queima de 10 g de CH4" → composto = o que tem a quantidade (como no golden: o combustível); se ele é um elemento, elemento = ele e composto = o produto |
| `nomenclatura_nome` | NOMENCLATURA: "como se chama o 2-metilpropano?", "que substância é <nome sistemático do pacote>" → composto copiado |
| `mistura` | CONCEITO (nível opcional): "o leite é mistura homogênea ou heterogênea?", "água e óleo é que tipo de mistura?" sem entidade (misturas do dia a dia, escritas aqui); com composto do pacote, o composto é copiado |
| `ordenacao` | COMPARAR: "ordem crescente de raio atômico de Na, K e Rb", "ordene Cl, Br, I pela eletronegatividade" → elemento = o primeiro, propriedade; 3–4 elementos com a propriedade no pacote e valores distintos (18 % com compostos) |

- **Evidência das quantidades.** A do app (`apps/quimica/backend/retrain/build_nlu_dataset.evidencia_basica`, sobre `ask_core.numeros_de`) é a
  que o montador usa (a de `apps/eleicoes2026/backend/retrain/` não entra na química). Ela lê "2,5 × 10³" (= 2500) e "3x10^-2", mas **não** lê
  "meio mol", "1/2", "½", os numerais por extenso nem o ponto médio de "1,5·10⁻³": rejeitaria ~100 % da família `extenso` e ~25 % da `notacao`.
  Como `apps/` não muda aqui, essas duas famílias passam por `quimica_v35.evidencia_v35`: a equação pela função do app e as quantidades por
  `numeros_v35` (os números de `ask_core` + "·10" lido como "x10" + frações "a/b", "½ ¼ ¾" + os numerais do idioma). Testes em
  `test_montar_corpus.EvidenciaV35` (lê o que deve, não aceita valor que não está no texto, e documenta que a do app recusa essas formas).
  Proposta para quando o site puder mudar: levar a mesma leitura ao `ask_core.numeros_de`/`ground.js` (o site já lê "meio mol" e "1,2·10^23").
- **Íons e a gramática.** O `composto` da gramática (`nlu_core._COMPOSTO_CHARS`) não tem `^` nem sobrescritos `⁺⁻`: os íons são escritos
  "MnO4-", "MnO4 -", "Cr2O7 2-", "Cr2O7(2-)", "SO4 2-", "NH4+" (12 % com subscritos, normalizados para dígitos). "SO4^2-" e "MnO₄⁻" não são
  copiáveis hoje; para aceitá-los, acrescentar `^⁺⁻⁰-⁹` à classe da gramática e ao filtro do proxy.
- **Pacote.** `entalpiaFormacaoKJmol` ainda não está nos compostos do pacote (coleta P3078 do Wikidata, CALCULADORAS §3): COMPARAR com ela não
  é ancorado em valores (como ebulição/pKa de compostos no v3.4). Equilíbrio usa equações do dataset sem estado físico (s/l/g).
- **Testes fora do treino** continuam valendo (golden 5 idiomas, segurança, eleições). Holdouts do v3.5 (~8 % por hash da entidade, nunca treinam;
  conferidos no teste `test_v35_calculadoras_e_familias`): `holdout_v35_{nox,entalpia,equilibrio,ligacao,entalpia_formacao,notacao,extenso,
  esteq_formada,nomenclatura_nome,mistura,ordenacao,configuracao}.json` (30 / 37 / 27 / 44 / 30 / 51 / 47 / 47 / 39 / 57 / 37 / 26 = 472). O holdout base da
  química (`holdout_quimica.json`) também ganha as 4 intenções pela divisão por entidade do `gerar_nlu` (`val.jsonl`: NOX 36, ENTALPIA 48,
  EQUILIBRIO 39, LIGACAO 16).
- **Dataset do app regerado** (`apps/quimica/dataset/nlu/`, pacote local `20261017T200629Z`): 22.257 de treino + 1.091 de validação; os 19.549 + 949
  pares das outras famílias são idênticos aos gerados sem as calculadoras (conferido), mais 2.708 + 142 delas (treino: NOX 662, ENTALPIA 752,
  EQUILIBRIO 660, LIGACAO 634). O pacote local mudou durante o trabalho (o pipeline de outro agente), por isso o dataset difere do versionado
  também fora das calculadoras.
- **Comprimento:** equilíbrio sem combustões, até 3 concentrações e unidades curtas: o maior par tem 258 tokens no template do Qwen3.5 (um
  multi-turno do v3.4 com pergunta de equilíbrio); por isso o treino previsto usa `--max_length 288` (ver `ia/treino/README.md`).
- **Risco a medir no gate:** a família `nomenclatura_nome` ensina a copiar o nome sistemático; o golden tem casos `composto: null` para nomes que
  não estão no pacote ("Como se chama o 2-cloro-3-metil-pentano?"), em que o modelo tende a copiar o nome (conta como alucinação de composto).

## Arquivos
- `montar_corpus.py`: monta o corpus.
- `quimica_v35.py`: geradores do v3.5 (12 famílias, 5 idiomas) e a evidência `evidencia_v35`; `quimica_v34.py`: geradores do v3.4.
- `quimica_populares.py`: gerador focado dos compostos do dia a dia nos cinco idiomas (ver a tabela de fontes); `test_quimica_populares.py`
  confere composto copiado da pergunta, quantidades na ordem, rótulo válido pelo contrato, nomes populares presentes, filtro de sinônimos,
  substâncias elementares fora do pool e o grupo por nome de elemento (símbolo válido, sem `composto`).
  Amostra: `python -I ia/corpus/quimica_populares.py --idioma de --n 20`.
- `quimica_multilingue.py`: gerador en/es/de/fr. Reusa por import o pacote, as equações, a nomenclatura, o GHS, as recusas e o contrato
  do app. Ficou aqui, e não dentro de `apps/quimica/dataset/gerar_nlu.py`, porque o gerador pt é todo feito da concordância do
  português; um parâmetro de idioma ali arriscaria mudar a saída pt, que continua idêntica (nada em `apps/` foi alterado).
- `quimica_idiomas/{en,es,de,fr}.py`: os moldes. `verificar_modulo.py` confere a estrutura contra `en.py`, as formas de propriedade
  e de unidade contra `apps/quimica/contracts/lexico/<idioma>.json` e se `com_prep` mantém o nome intacto.
- `test_montar_corpus.py`: os testes (unittest).
