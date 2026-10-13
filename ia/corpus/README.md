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
| Química, compostos do dia a dia (5 idiomas, desde o v3.1 em 13/10/2026) | `quimica_populares.py`: ~115 compostos (todos com `nomePopular` + lista conferida de substâncias do cotidiano) pelos nomes como as pessoas escrevem (nome popular, `sinonimosPorIdioma` curtos, fórmula também em minúsculas) nos padrões em que o NLU v3 deixou de copiar o `composto` no golden (perigos/segurança, propriedade, massa molar, "o que é", estequiometria de queima, diluição, pH). Mesmo construtor e filtro do golden; fica **fora** do teto por intenção da química pt (`--escala-populares`, 0 desliga) | CC BY-SA 4.0 |

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

## Arquivos
- `montar_corpus.py`: monta o corpus.
- `quimica_populares.py`: gerador focado dos compostos do dia a dia nos cinco idiomas (ver a tabela de fontes); `test_quimica_populares.py`
  confere composto copiado da pergunta, quantidades na ordem, rótulo válido pelo contrato, nomes populares presentes e filtro de sinônimos.
  Amostra: `python -I ia/corpus/quimica_populares.py --idioma de --n 20`.
- `quimica_multilingue.py`: gerador en/es/de/fr. Reusa por import o pacote, as equações, a nomenclatura, o GHS, as recusas e o contrato
  do app. Ficou aqui, e não dentro de `apps/quimica/dataset/gerar_nlu.py`, porque o gerador pt é todo feito da concordância do
  português; um parâmetro de idioma ali arriscaria mudar a saída pt, que continua idêntica (nada em `apps/` foi alterado).
- `quimica_idiomas/{en,es,de,fr}.py`: os moldes. `verificar_modulo.py` confere a estrutura contra `en.py`, as formas de propriedade
  e de unidade contra `apps/quimica/contracts/lexico/<idioma>.json` e se `com_prep` mantém o nome intacto.
- `test_montar_corpus.py`: os testes (unittest).
