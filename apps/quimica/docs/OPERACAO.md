# Operação — SaibaTudo Química

> **Este é o documento de estado atual da operação** (molde: [`apps/eleicoes2026/docs/OPERACAO.md`](../../eleicoes2026/docs/OPERACAO.md)).
> [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) é a memória completa do projeto (decisões, medidas, histórico), [`PENDENCIAS.md`](PENDENCIAS.md) a lista do que falta e
> [`MODELO.md`](MODELO.md) o ciclo local dos modelos. Atualizado em **16/10/2026**. Só **nomes** de variáveis aparecem aqui; valores ficam em `secrets/`, na Vercel e no GitHub.

## 1. O que roda, onde e com que cadência

| Peça | Onde | Cadência / gatilho | Quem avisa se quebrar |
| :-- | :-- | :-- | :-- |
| Atualização dos dados | GitHub Actions `quimica-data-refresh.yml` | **semanal**, domingo 03:00 de Brasília (06:00 UTC), e sob demanda (`gh workflow run`, entradas `forcar`, `rapido`, `permitir`). Só publica se o manifesto mudou (ou se foi disparada à mão) | `quimica-data-freshness.yml` (issue `alerta-dados-quimica`) |
| Estado real da atualização | — | **Hoje o build falha no runner do GitHub**: o PubChem responde 429 antes de o build terminar (execuções de 11/10 e 12/10; `PENDENCIAS.md` §9.b e §9.c). **O pacote é publicado da máquina local** (§5). A issue #17 fica aberta até uma execução bem-sucedida | a própria issue #17 |
| Alerta de frescor | `quimica-data-freshness.yml` + `tools/frescor.py` | diário, 07:30 UTC | issue `alerta-dados-quimica` (aberta, atualizada e fechada sozinha) |
| Alerta de divergência de números | passo do `quimica-data-refresh.yml` + `tools/comparar_pacotes.py` | em toda execução que chegaria a publicar | issue `divergencia-dados-quimica` e a execução fica vermelha (§2.1) |
| Snapshot versionado do pacote | passo final do `data_refresh` | depois de cada publicação feita pelo workflow | — |
| Site/PWA e API | Vercel, projeto `saibatudo-quimica` (Hobby), servido em `saibatudo.net/quimica/` por proxy da home | a cada publicação de dados (o push na `main` **não** publica este app) | `GET /quimica/api/health` |
| IA de interpretação (NLU) | Modal, CPU, app `SaibaTudoIA-NLU-Quimica` (Volume `SaibaTudoIA-Models-Quimica`, ponteiro `current.json`); modelo em produção em 16/10/2026: `nlu-v3.3-20261013` | só quando a pessoa pede "Perguntar à IA na nuvem" ou liga a nuvem automática (opt-in, só pergunta não entendida) | `GET /quimica/api/health` (`nlu`, `model`) |
| IA generativa (`/api/ask`, explicador) | ainda não existe (Space do Hugging Face + reserva no Modal, `MODELO.md`) | **desligada** (`ASK_ENABLED` ausente) | `GET /quimica/api/health` (`ask`) |
| Captura "Ajudar a melhorar o app" (`POST /quimica/api/melhoria`) | Vercel + Upstash Redis, lista `quimica:melhoria:<AAAA-MM>` | **desligada por padrão** (§3 e §6) | `GET /quimica/api/health` (`melhoria`) |
| CI do site, da API, dos dados, do dataset e das ferramentas | `quimica-web-ci.yml` | push e PR em `apps/quimica/**` | job vermelho |
| CI do Android | `quimica-android-ci.yml` | push e PR nas pastas do app, dos contratos e dos dados | job vermelho |
| Avaliação noturna do modelo | **não existe** (o de eleições é `eleicoes-nightly-eval.yml`) | — | pendência (`PENDENCIAS.md` §7 e §8.2). Enquanto isso: `eval_golden.py --endpoint` à mão (`MODELO.md` §5) |

`GET https://saibatudo.net/quimica/api/health` resume o que está ligado: `nlu`, `ask`, `melhoria` e `shared` (`on`/`off`), `model` (versão do NLU) e `data`
(versão do pacote, `generatedAt` e idade em dias; `null` se o manifesto não puder ser lido, o que nunca derruba o health).

### Testes de dados: o que bloqueia e o que só avisa
O `data_refresh` roda **integridade** (testes do pipeline, assinatura ECDSA, `sha256`, módulos do site sobre os dados) como bloqueante e **comportamento sobre os dados
reais** (`web/test/*.test.mjs` inteiro) como informativo; o resumo do job avisa "testes de comportamento falharam" e a publicação segue. Os mesmos testes de comportamento
**bloqueiam em push e PR** (`quimica-web-ci.yml`), onde o que muda é o código. O terceiro portão é novo e **bloqueia**: a **divergência de números** entre o pacote novo e o
publicado (§2.1). Um pacote com **menos compostos** que o versionado nunca é publicado (o runner leva 429 do PubChem e um build parcial substituiria o pacote maior).

## 2. Alertas e como responder

| Sintoma | Causa provável | Ação |
| :-- | :-- | :-- |
| Issue `alerta-dados-quimica`: "execuções do data_refresh falharam em sequência" ou "nenhuma execução bem-sucedida" | hoje: 429 do PubChem no runner (conhecido); amanhã: quebra de pipeline, segredo inválido | abra o último run e veja o primeiro passo vermelho. Se for o PubChem, publique da máquina local (§5) e siga a decisão pendente de §9.b. Se for código, corrija e rode `gh workflow run quimica-data-refresh.yml`. **A publicação local não fecha a issue**: ela mede a saúde do automatismo, não só a idade do pacote |
| "O pacote publicado tem N dias" (limite 10 dias) | o domingo passou sem publicação | publique da máquina local (§5) ou dispare o workflow |
| "assinatura do manifesto de produção é INVÁLIDA" | **crítico**: site e apps rejeitam a atualização | reponha o último pacote bom (redeploy do commit anterior na Vercel) e investigue a chave `DATA_SIGNING_KEY_QUIMICA` / `secrets/data_signing_key.pem` (a pública é `pipeline/data_signing_public.pem`) |
| "manifesto de produção inacessível" | Vercel fora, rota `/quimica/data/` quebrada ou domínio | abra `https://saibatudo.net/quimica/data/manifest.json`; conferir o proxy `/quimica/*` em `apps/eleicoes2026/vercel.json` |
| Issue `divergencia-dados-quimica` (publicação bloqueada) | o pacote novo contradiz o publicado | §2.1 |
| `/quimica/api/health` com `data: null` | manifesto indisponível ou domínio fora de `ALLOWED_ORIGINS` | abra o manifesto; o health nunca devolve erro por isso |
| `nlu: "off"` sem ninguém ter desligado | `MODAL_ENDPOINT`, `MODAL_KEY` ou `MODAL_SECRET` ausentes na Vercel | `vercel env ls production` (só nomes) e reponha; o app segue com o NLU local por regras |
| `/quimica/api/nlu` lento ou 504 | contêiner frio no Modal (primeira chamada depois de ocioso: ~9 s com snapshot, 22 s logo após um `modal deploy`) | normal; `MODAL_TIMEOUT_MS` até 45000 desde 20/10/2026 (produção 35000; §4) |
| Muitos 429 | limite por IP/instalação | normal sob abuso; ajuste `RATE_*` só se houver uso legítimo |
| `/quimica/api/melhoria` responde 503 `unavailable` | o Redis falhou: nada foi guardado, o cliente mantém a fila | conferir o painel do Upstash e as variáveis `UPSTASH_REDIS_REST_*` |
| Muitos itens "descartados" nos logs de `melhoria` | filtros de dado pessoal e de pedido perigoso funcionando, ou cliente enviando lixo | olhar `aceitos`/`descartados` nos logs (nunca há texto); se um dado pessoal passou, §6.3 |

### 2.1 Divergência de números entre o pacote novo e o publicado
`tools/comparar_pacotes.py` (só biblioteca padrão) roda no workflow **depois dos testes e antes de publicar**. Compara o pacote recém-construído com o **publicado**
(`https://saibatudo.net/quimica/data/`, cada arquivo conferido contra o `sha256` do manifesto publicado) e, se o download falhar, com o pacote **versionado no Git** (guardado antes do
build; o relatório avisa que usou a reserva). Se reprovar, a execução fica vermelha, **nada é publicado nem comitado** e uma issue `divergencia-dados-quimica` é aberta (ou
comentada, se já houver uma aberta). Quando uma comparação seguinte passa, a issue é fechada sozinha.

| Regra | Reprova quando | Causa típica |
| :-- | :-- | :-- |
| `massa-molar` | a massa molar de um composto mudou mais de **0,5 %** (ou sumiu) | fórmula errada na fonte, parser do PubChem quebrado |
| `elemento-propriedade` | uma propriedade numérica de elemento (massa atômica, eletronegatividade, raio, energias, fusão, ebulição, densidade, grupo, período) mudou mais de **2 %** ou deixou de existir | correção de dado no Wikidata/PubChem; unidade trocada |
| `elementos-sumiram` / `compostos-sumiram` | algum elemento / composto do pacote anterior não está no novo | build parcial, filtro novo, 429 |
| `queda-compostos` | a quantidade de compostos caiu mais de **5 %** | idem |
| `queda-textos` | os textos (total ou de uma fonte) caíram mais de **10 %** | Wikipédia/ChEBI fora do ar durante o build |
| `licenca` | a licença ou a política de uso (`uso`, `exibir`, `dataset`, `treino`) de uma fonte mudou, ou a fonte saiu da lista (`fontes.json` e `sources` do manifesto) | mudança de licença da fonte: **não publique sem entender** (`FONTES_E_LICENCAS.md`) |
| `data-mais-antiga` | o `generatedAt` do manifesto novo é mais antigo que o do publicado | pacote velho sendo restaurado por engano |
| `constante` | o valor de uma constante (CODATA) mudou ou sumiu | edição nova do CODATA (esperada: aceitar) |
| `regras` | algum número de `regras.json` (fatores de unidades, prefixos SI) mudou ou sumiu | edição de regras sem revisão |

O que é aceito sem alarde aparece no fim do relatório ("Diferenças aceitas"): compostos e elementos novos, propriedades e campos novos, massa molar alterada abaixo do limiar.

**Como responder.** Leia o relatório (resumo da execução e corpo da issue; o JSON completo está em `--json`). (a) **Erro da fonte ou do parser:** corrija o pipeline (ou espere a fonte) e rode o
workflow de novo; nada foi publicado. (b) **Diferença esperada e revisada** (ex.: energia de ionização atualizada pelo Wikidata, em 16/10/2026): aceite **só essa** diferença:
```bash
gh workflow run quimica-data-refresh.yml -f permitir=elemento-propriedade:energiaIonizacaoKJmol,elemento-propriedade:afinidadeEletronicaKJmol
```
`REGRA` sozinha aceita a regra inteira; `REGRA:ALVO` aceita só os achados com aquele identificador (CID ou fórmula do composto; símbolo, Z ou nome da propriedade do elemento; `id` da fonte,
da constante ou da fonte de texto). Uma entrada que não aceitou nada é avisada no relatório (confira a grafia); regra desconhecida é erro (código 2).
Códigos de saída: 0 aprovado, 1 divergência, 2 erro de uso ou de leitura (pacote ausente ou ilegível; o workflow também bloqueia, por precaução).

**Local, antes de publicar da máquina** (a mesma ferramenta, mesmos limiares; `--limiar-massa`, `--limiar-elemento`, `--limiar-compostos`, `--limiar-textos` ajustam):
```bash
cd apps/quimica
python tools/comparar_pacotes.py --novo data/quimica --anterior https://saibatudo.net/quimica/data/ --json local/comparacao.json
# sem rede: contra o commit atual (antes de comitar o pacote novo)
mkdir -p "$TMP/ant" && git archive HEAD apps/quimica/data/quimica | tar -x -C "$TMP/ant" && python tools/comparar_pacotes.py --novo data/quimica --anterior "$TMP/ant/apps/quimica/data/quimica"
```

## 3. Chaves de desligamento (kill switches)

No Git Bash grave sempre com `printf '%s' "$VALOR" | vercel env add NOME production [--sensitive]`; `vercel env ls production` lista só os nomes. Alterar variável vale a partir do **próximo deploy**
(`vercel deploy --prod` dentro de `apps/quimica`, ou `gh workflow run quimica-data-refresh.yml`).

| Quero desligar | Faça | Efeito |
| :-- | :-- | :-- |
| IA de interpretação na nuvem | `vercel env rm MODAL_ENDPOINT production -y` (ou esvaziar) + redeploy | `/quimica/api/nlu` 503 `disabled`; `health.nlu = "off"`; o site e o Android usam só o NLU local por regras; o botão da nuvem mostra a falha com o motivo (serviço fora) |
| Captura "Ajudar a melhorar o app" | `MELHORIA_ENABLED` ausente ou diferente de `1` na Vercel (ou remover `UPSTASH_REDIS_REST_*`) + redeploy; apague também a variável do repositório `QUIMICA_MELHORIA_ENABLED` e rode o `data_refresh` para a opção sumir dos clientes | `/quimica/api/melhoria` 503 `disabled`; os clientes guardam a fila local sem mostrar erro. **Limites finos:** `MELHORIA_PER_HOUR` (6 por IP), `MELHORIA_PER_DAY` (20 por instalação), `MELHORIA_MAX_POR_MES` (5.000 itens por lista mensal) |
| IA generativa (explicador, futuro) | remover `ASK_ENABLED` na Vercel **e** `QUIMICA_ASK_ENABLED` no repositório, e publicar. Só o servidor: esvaziar `HF_TOKEN` e `MODAL_ASK_ENDPOINT` | `/quimica/api/ask` 503 `disabled`; o próximo pacote assinado esconde o botão. **Hoje já está desligada** |
| Contadores globais de limite | remover `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_*`) | volta ao limite por instância; **a captura também desliga** (ela exige o Redis) |
| Gastar menos na nuvem | `DAILY_BUDGET` menor (0 = esgotado) | 503 `budget`; o app segue com o NLU local |
| Modelo ruim em produção | `python backend/modal/promover.py --version <anterior> --target nlu --rollback` + `MODEL_VERSION=<anterior>` na Vercel + redeploy (`MODELO.md` §9) | volta ao modelo anterior; a chave do cache muda com `MODEL_VERSION` |
| Pacote de dados ruim | redeploy do commit anterior na Vercel; se a assinatura falhar, investigar a chave | — |

## 4. Custos e limites

| Item | Número | Fonte |
| :-- | :-- | :-- |
| Modal, NLU | app `SaibaTudoIA-NLU-Quimica`: **4 núcleos + 4 GiB** (≈ US$ 0,22/h ligado; US$ 0,047 por núcleo-hora + US$ 0,008 por GiB-hora), janela de ociosidade `scaledown_window` = **5 min** (≈ US$ 0,02 por rajada de uso), `max_containers` = 2, **snapshot de memória ligado** (frio ~9 s; a 1ª chamada depois de um `modal deploy` cria o snapshot: ~22 s; quente 3–5 s). 1 contêiner sempre ligado custaria ~US$ 160/mês: descartado | `MODELO.md` §10 e §13; `backend/modal/nlu_app.py`; `PROJECT_MEMORY.md` §6.i e §6.k |
| Modal, crédito | US$ 30/mês grátis no workspace. **O teto de gasto do workspace ainda não foi definido** (pendência do mantenedor, §8) | `MODELO.md` §10 |
| Modal, reserva do explicador (L4) | ≈ US$ 0,88/h e cobra o contêiner inteiro; por isso só reserva, `MODAL_ASK_DAILY_BUDGET=15`. Não implantado | `MODELO.md` §10 |
| Proteção do NLU | `MODAL_TIMEOUT_MS` (padrão 20000, máximo 45000 desde 20/10/2026 — a partida a frio mediu 16,7 s ao vivo; produção 35000, `api/nlu.js` com `maxDuration: 50`), `DAILY_BUDGET` (padrão 300 chamadas/dia), `RATE_IP_PER_MIN` (20), `RATE_IID_PER_DAY` (60) | `api/_lib/config.js`; `PROJECT_MEMORY.md` §6.i |
| Upstash (Redis) | plano gratuito: 500 mil comandos/mês. A captura faz 1 requisição por envio (`RPUSH` + `LTRIM` + `EXPIREAT`) além dos contadores de limite | `MODELO.md` §10 |
| Vercel (Hobby) | uso não comercial; **cota de 5.000 uploads por dia somando eleições e química**. Medir antes de um deploy grande: `python tools/vercel_cota.py --minimo N` (com token do time a sondagem respondeu 403: rever antes de confiar, `PENDENCIAS.md` §9.c) | `CLAUDE.md` da raiz, regra 4 |
| Hugging Face (explicador, futuro) | conta PRO: 40 min/dia de ZeroGPU, ≈ 3 s de GPU por resposta (≈ 800 respostas/dia); passar da cota só cobra com crédito pré-pago (não deixe saldo) | `MODELO.md` §10 |

## 5. Publicar o pacote da máquina local (enquanto o runner levar 429 do PubChem)

O workflow semanal não completa o build no GitHub (`PENDENCIAS.md` §9.b); quem publica é a máquina do mantenedor, com o pacote já gerado e comitado. Roteiro (dentro de `apps/quimica`):

1. **Construir e assinar:** `python pipeline/build.py --assinar-com secrets/data_signing_key.pem --alvo 2000 --paciente` (ou `--pubchem-offline` para refazer do cache; se o PubChem bloquear, trocar o IP destrava
   na hora, `PROJECT_MEMORY.md`). Conferir: `python pipeline/sign.py verify data/quimica/manifest.json --public pipeline/data_signing_public.pem`.
2. **Testar:** `python -m unittest discover -s pipeline/tests` e `node --test "web/test/*.test.mjs"` (os de integridade `data.test.mjs` e `modules.test.mjs` são os que o workflow bloqueia).
3. **Comparar com o publicado:** `python tools/comparar_pacotes.py --novo data/quimica --anterior https://saibatudo.net/quimica/data/` (§2.1). Reprovou? Corrija ou aceite com `--permitir`, **depois de ler** cada achado.
4. **Medir a cota:** `python tools/vercel_cota.py --minimo N` (N = arquivos novos esperados).
5. **Publicar:** `vercel deploy --prod --yes --token "$VERCEL_TOKEN_TIME"` (o token vem de `secrets/` da raiz para a variável de ambiente; **nunca** no chat nem no Git).
6. **Conferir ao vivo:** `GET /quimica/api/health` (`data.version` = a do manifesto novo) e `https://saibatudo.net/quimica/data/manifest.json`.
7. **Versionar:** `git add apps/quimica/data/quimica`, commit (`chore(data): ...`) e push; depois `gh run list --limit 10` para conferir **todos** os workflows disparados. Pacote com mais de 300 arquivos:
   separar do commit de código (`CLAUDE.md` da raiz, regra 6).

## 6. O ciclo de auto-melhoria da IA (como funciona e como operar)

A interpretação melhora com perguntas reais, **sempre com uma pessoa no meio**. Nenhum modelo gera fatos (regra 2 do `CLAUDE.md`), pedido perigoso é recusado **por regra antes do modelo**, e nenhum
rótulo com entidade entra no treino sem revisão.

```
pergunta que o app NÃO entendeu ──(opt-in)──► POST /quimica/api/melhoria ──► filtros do servidor ──► Redis  quimica:melhoria:<AAAA-MM>  (90 dias após o fim do mês)
                                                                                        │ colher (LRANGE) → local/melhoria/*.jsonl  (git-ignorado, texto cru)
                                                                                        ▼
                                                              PESSOA: rótulo + descartar dado pessoal/perigoso + lacuna de regra local
                                                   ┌──────────────────────────────────┴──────────────────────────────────┐
                                  ~20 % → holdout (só MEDE; contracts/)                                   ~80 % → extras de treino (ia/corpus/)
                                                   └──────────────────────────────────┬──────────────────────────────────┘
                              ia/treino: continuação do LoRA → GGUF → gate por idioma (catraca) → empacotar → Modal/promover → canário manual
```

### 6.1 Ligado ou desligado hoje?
A captura está **desligada em três camadas**: servidor (`MELHORIA_ENABLED` + Redis; sem isso `/api/melhoria` responde 503 `disabled`), manifesto assinado (`cliente.melhoria.enabled=false`) e preferência
da pessoa ("Ajudar a melhorar o app" nas Configurações, desligada por padrão; há também "Enviar esta pergunta" por pergunta). Confira com `GET /quimica/api/health` → `"melhoria"`.
O servidor (`api/_lib/melhoria-handler.js`) e o texto de privacidade em 5 idiomas são da frente A do programa de 16/10/2026 (o cliente do site é da mesma frente; o `MelhoriaClient` do Android, da frente B): conferir o estado em `PROJECT_MEMORY.md`.

### 6.2 Para ligar (em ordem; não pule o passo 1)
1. **Política:** a página `web/src/quimica/privacidade/<idioma>.html` já descreve a captura (versão de 16/10/2026): conferir o texto, criar/atualizar `docs/PRIVACIDADE.md` (pendência de paridade, `PENDENCIAS.md` §3) e declarar no
   *Data Safety* da Play (`PLAY_STORE.md`). É dado de usuário guardado: revise antes de ligar.
2. **Redis:** `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` na Vercel (banco gratuito do Upstash; a captura exige).
3. **Servidor:** `MELHORIA_ENABLED=1` na Vercel + redeploy. Conferir `GET /quimica/api/health` → `"melhoria":"on"`.
4. **Pacote:** variável do repositório `QUIMICA_MELHORIA_ENABLED=1` (o workflow a passa como `SAIBATUDO_MELHORIA_ENABLED`) e publicar. **Atenção, integração pendente:** hoje `pipeline/build.py` escreve
   `cliente.melhoria.enabled=false` fixo; é preciso fazê-lo ler `SAIBATUDO_MELHORIA_ENABLED` (como o de eleições) para a opção aparecer nos clientes.
Para desligar: §3 (qualquer das camadas basta).

O que o servidor garante (`api/_lib/melhoria-handler.js`): refaz os filtros do cliente e **descarta** (não mascara) pedido perigoso (léxico dos 5 idiomas), dado pessoal (e-mail, telefone, CPF/CNPJ, URL, @usuário,
números longos), `RECUSA_PERIGO` e repetidas; guarda **só** `{q, intentLocal, idioma, client, t}` (t = data sem hora), **sem `iid` e sem IP**; nunca registra o texto em log; no máximo `MELHORIA_MAX_POR_MES` itens por mês
(ficam os mais recentes) e a lista expira 90 dias depois do fim do mês.

### 6.3 Rotina de revisão (mensal basta; antes de cada retreino)
1. **Colher** (valores só no ambiente; nada de imprimir o token): a lista é uma lista Redis de JSON.
   ```bash
   curl -s -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_REDIS_REST_URL/lrange/quimica:melhoria:2026-10/0/-1" > local/melhoria/2026-10.json   # {"result":["{\"q\":...}", ...]}
   ```
   `local/` é ignorado pelo Git. Para não reprocessar, depois de salvar apague os itens colhidos (`LTRIM quimica:melhoria:2026-10 <N> -1`, N = quantos colheu) ou deixe expirar. **Ainda não há**, na Química, as ferramentas
   de fila e revisão que o de eleições tem (`colher_sinais.mjs`, `fila.mjs`, `revisar.mjs`, `promover.mjs` em `apps/eleicoes2026/backend/retrain/`): portar é pendência; até lá a revisão é feita à mão sobre o JSONL.
2. **Classificar, uma pergunta por vez** (uma pessoa; mais frequentes primeiro):
   - *Pergunta legítima que o app não entendeu* → rótulo no formato do golden (`contracts/nlu_golden_cases.json`: `q`, `intent`, `idioma` se não for pt-BR, `elemento`/`composto`/`propriedade`/... conforme o contrato).
     O rótulo vem do NLU determinístico dos clientes ou de revisão humana, **nunca** de um modelo sozinho; se o NLU local deveria ter entendido, a correção é uma **regra nova** nos dois clientes (`nlu.js` e `LocalNlu.kt`), coberta no golden.
   - *Fora do escopo ou sem sentido* → `DESCONHECIDA` (serve de exemplo negativo) ou descarte.
   - *Dado pessoal ou pedido perigoso que passou pelos filtros* → **descarte e amplie o filtro**: o caso entra em `contracts/seguranca_cases.json` (perigo) ou nos testes de `api/_lib/dadopessoal.js` (dado pessoal), nos dois lados.
3. **Destino:** ~20 % (por balde estável do texto) viram **holdout** e **nunca treinam** (arquivo de casos reais em `contracts/`, formato do golden; a Química ainda não tem o equivalente do `nlu_real_cases.json` de eleições: criar na
   primeira colheita e fazer `ia/corpus/montar_corpus.py` tratá-lo como teste, como faz com o de eleições); ~80 % viram **extras de treino** em `ia/corpus/` (o filtro de Jaccard ≥ 0,8 contra os casos de teste continua valendo).
4. **Retreinar e promover com gate** (detalhes em [`ia/treino/README.md`](../../../ia/treino/README.md) e `MODELO.md` §13): continuação do LoRA com `ia/treino/misturar_continuacao.py` e `treinar_nlu.py --lora_init`, `exportar_gguf.py`,
   `avaliar_gguf.py --app quimica --holdout` (e `--app eleicoes`: o modelo é um só), `empacotar_versao.py --app quimica --version nlu-vX.Y-AAAAMMDD ...` (com `--previous-eval` do modelo em produção: **catraca de 1 ponto**), depois
   `modal volume put` dos três arquivos, `modal deploy backend/modal/nlu_app.py`, `promover.py --version ...` e `MODEL_VERSION` na Vercel. Gates (bloqueiam): JSON com gramática 100 % e nativo ≥ 98 %, intenção ≥ 85 %, cada entidade ≥ 90 %, alucinação ≤ 5 %,
   holdout, cada idioma, Q4×Q8 ≤ 3 pontos, sem `<think>`. **Reprovou: não publique.** Treino é **sempre local**; **eleições só depois de 27/10/2026** e pelo caminho próprio.
5. **Rollback:** `promover.py --rollback` (§3). Não há canário configurado na Química; a avaliação ao vivo é `eval_golden.py --endpoint` com o par de tokens no ambiente.

### 6.4 Cadência
Dados: semanal. Modelo: mensal, ou quando o gate/medição ao vivo reprovar a produção, ou quando surgirem intenção, propriedade, unidade ou classe novas (então atualizar **juntos** `api/_lib/vocab.js`, `backend/modal/nlu_core.py`,
`LocalNlu.kt`/`nlu.js` e `dataset/vocab_nlu.py`: `test_nlu_core.py` e `vocab.test.mjs` falham se divergirem). Qualquer mudança em `nlu_core.py` exige o gate de novo **antes** do `modal deploy` (`MODELO.md` §13).

## 7. O que o CI garante

| Garantia | Onde |
| :-- | :-- |
| NLU do site e do Android entendem o mesmo (golden compartilhado nos 5 idiomas) e a segurança recusa o mesmo (`seguranca_cases.json`, API e clientes) | `contracts/` lido por `web/test`, `api/test` e pelos testes do Android |
| Pedido perigoso nunca chega ao modelo nem é capturado; léxico dos 5 idiomas sincronizado | `api/test/seguranca*.test.mjs`, `lexico.test.mjs`, `melhoria.test.mjs`; `tools/test_gerar_lexico*.py` |
| Pacote de dados assinado e íntegro; fidelidade numérica do dataset | `python pipeline/sign.py verify` e `pipeline/tests` no `quimica-web-ci.yml`; `dataset/test_*.py` |
| Divergência de números entre pacotes (regras e limiares de §2.1) | `tools/test_comparar_pacotes.py` (fixture e cópias alteradas; download contra servidor local) e o passo do `data_refresh` |
| Workflows válidos (YAML e sintaxe de shell de cada passo), prefixos e permissões do repositório único, passo de comparação antes da publicação | `tools/test_workflows.py` |
| Alerta de frescor | `tools/test_frescor.py` |
| Release Android: testes unitários, `lintRelease`, `assembleRelease` (R8) e classes por reflexão/pacote embutido presentes | `quimica-android-ci.yml` + `tools/verificar_release.py`. **Não substitui rodar o release num aparelho antes de enviar à Play** |
| Gate do modelo, holdout, máscara de perda | `backend/modal/test_*.py`, `backend/retrain/test_*.py`, `ai_model/scripts/test_*.py`, `ia/**/test_*.py` — **rodam à mão**, não estão no CI |

## 8. Pendências que só o mantenedor resolve

- **Definir e testar o teto de gasto do workspace Modal** (ainda não definido).
- Confirmar o **backup offline** de `secrets/upload-keystore.p12`, `keystore.properties` e `secrets/data_signing_key.pem` (perder a chave de dados exige novo app; a de upload foi criada em 14/10).
- **PubChem × GitHub** (`PENDENCIAS.md` §9.b): decidir entre semear o cache de coleta (release `cache-seed`) ou deixar o build sempre local e o workflow só publicar o que está no Git.
- Play Console: criar o app, subir o AAB, preencher App content/Data Safety com `PLAY_STORE.md`, teste interno → fechado; conta de serviço da Play API (`PLAY_STORE.md` §8).
- Decisões de `PENDENCIAS.md` §9: LibreTexts em português, monetização (Vercel Hobby e as fontes só valem para uso não comercial), permissões opcionais (OpenStax, SBQ, OMS/OIT, IUPAC); origem da chave `apikey-sabetudo.txt`.
- Conta do Hugging Face para o explicador (quando houver).
- Revisar o texto de privacidade da captura antes de ligar `MELHORIA_ENABLED` (§6.2) e declarar no Data Safety.
- Habilitar, se quiser, o relato privado de vulnerabilidades em *Settings › Security* (a `SECURITY.md` da raiz já o cita); passada manual de acessibilidade (TalkBack), tablets e orientação horizontal.
