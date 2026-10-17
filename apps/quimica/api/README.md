# API (funções serverless da Vercel) — SaibaTudo Química

Node 22, módulos ES, **zero dependências**. Mesmos padrões do app de eleições: `Request`/`Response` padrão (`api/_lib/*-handler.js` não conhecem a Vercel e são
testados sem rede), CORS só para `https://saibatudo.net`, limites por IP e por instalação, cache em memória, orçamento diário, e **log sem o texto da
pergunta** (só status, latência, cache, `client` e o motivo do erro).

| Rota | Arquivo | O que faz | Estado padrão |
| :-- | :-- | :-- | :-- |
| `GET /quimica/api/health` | `health.js` | saúde, versão do modelo, `nlu`/`ask`/`melhoria`/`shared` ligados ou não, idade do pacote de dados | sempre ligada |
| `POST /quimica/api/nlu` | `nlu.js` + `_lib/nlu-handler.js` | interpreta a pergunta na nuvem (intenção + entidades ancoradas na pergunta); chamada pelo site desde 14/10/2026 (`web/.../js/nuvem.js`, opt-in) | ligada desde 14/10 (sem `MODAL_ENDPOINT` → `503 disabled`) |
| `POST /quimica/api/ask` | `ask.js` + `_lib/ask-handler.js` | explicação gerada, ancorada nos trechos licenciados, com verificador de fidelidade | **desligada**: `503 disabled` |
| `POST /quimica/api/melhoria` | `melhoria.js` + `_lib/melhoria-handler.js` (+ `_lib/dadopessoal.js`) | "Ajudar a melhorar o app": guarda, com consentimento próprio, as perguntas que o app **não entendeu** (filtradas) para melhorar o interpretador; chamada pelo site desde 16/10/2026 (`web/.../js/melhoria.js`) | **desligada**: sem `MELHORIA_ENABLED=1` **e** o Redis → `503 disabled` |

## Rewrite necessário (aplicar no `vercel.json`, fora da área de quem escreveu a API)
O site chama `/quimica/api/*`; as funções vivem em `/api/*`. Acrescentar ao `vercel.json` deste projeto:

```json
{
  "rewrites": [ { "source": "/quimica/api/:path*", "destination": "/api/:path*" } ],
  "functions": { "api/health.js": { "includeFiles": "data/quimica/manifest.json" } }
}
```
O `includeFiles` leva o manifesto do pacote de dados junto da função de saúde (`data` no `/health`). Sem ele o health busca `/quimica/data/manifest.json` no próprio site
(até 2 s) e, se também falhar, devolve `data: null` — nunca erro. O projeto irmão (`SaibaTudoEleicao2026`) continua precisando do rewrite `/quimica/*` → este projeto,
que já está descrito no `CLAUDE.md`. Regra do firewall (Vercel, plano Hobby): 60 requisições/minuto por IP em `/api/*`.

## Contratos

### `POST /api/nlu`
Entrada `{ "q": "...", "v": 1, "client": "android"|"web", "iid": "<uuid v4/v7>" }` (`q`: 3 a 300 caracteres; o corpo tem no máximo 4 KB).
Saída `200 { "ok": true, "nlu": { "intent": "...", ... }, "model": "<MODEL_VERSION>", "cached": false }`, com as chaves na ordem do contrato (`docs/DATA_CONTRACT.md` §8):
`intent`, `elemento` (símbolo), `composto` (**texto** copiado da pergunta — nome ou fórmula; o cliente resolve para o CID no dicionário local), `propriedade`
(id de `regras.propriedades` — o nome do campo do contrato, com unidade: `pontoFusaoK`, `densidadeKgm3`, `raioAtomicoPm`...), `quantidades [{valor, unidade}]`, `equacao`, `nivel`, `unidadeDestino`.
Cada entidade só vem se tiver **evidência no texto da pergunta** (`_lib/ground.js`); fora do vocabulário (`_lib/vocab.js`) é descartada. Intenções que são a própria
entidade (`ELEMENTO`, `COMPOSTO`, `PROPRIEDADE`, `MASSA_MOLAR`, `NOMENCLATURA`, `DESENHAR`, `COMPARAR`) sem a entidade viram `DESCONHECIDA`; as calculadoras continuam
sem entidades. Pedido perigoso (`_lib/seguranca.js`) **nunca chega ao modelo**: `200 { "nlu": { "intent": "RECUSA_PERIGO" }, "model": "regra" }`.

**`resolucao` (desde 14/10/2026, `_lib/compostos.js`):** quando `nlu.composto` existe, a API procura o texto no índice do pacote de dados
(`data/quimica/compostos/index.json`, incluído na função pelo `vercel.json`; nomes em 5 idiomas, apelidos e fórmulas, sem acento e em minúsculas;
aceita artigo/preposição à frente). Achou: `"resolucao": { "composto": { "cid": "962", "nome": "agua" } }`. Não achou: `{ "composto": { "cid": null,
"sugestoes": [ { "cid": "1118", "nome": "acido sulfurico" } ] } }` (até 3, por distância de edição ou prefixo) — o cliente mostra "não encontrei X;
você quis dizer Y?" com os nomes de exibição do próprio dicionário, em vez de inventar. `null` quando não há composto ou o índice não veio junto.
A resolução vai junto no cache e nunca derruba a resposta (erro interno vira `null`). A API continua sem fornecer fatos: só CID e nome de busca.

**`contexto` — multi-turno (desde 17/10/2026, NLU `nlu-v3.4-20261017`+; `_lib/contexto.js`):** campo opcional do corpo com a interpretação da
pergunta ANTERIOR, numa pergunta de continuação ("e a do KCl?", "e em fahrenheit?"): o mesmo objeto `nlu` que esta rota devolve —
`intent` + entidades como **texto** (composto como nome/fórmula, **nunca o CID**), ex.: `{ "q": "e a do KCl?", "v": 1, "client": "web", "iid": "…",
"contexto": { "intent": "MASSA_MOLAR", "composto": "NaCl" } }`. Ausente ou `null` = comportamento de antes. Regras: objeto plano; `intent` do
contrato; só as chaves de `nlu_core.KEYS` **admitidas pela intenção** (`ENTIDADES_POR_INTENCAO`; as obrigatórias não são exigidas); `elemento`,
`propriedade`, `nivel` e `unidadeDestino` do vocabulário fechado; `composto` (até 60) e `equacao` (até 120) texto sem quebra de linha, controle, aspas,
`\` nem `<|`/`|>`; `quantidades` 1 a 4 `{valor: número finito, unidade}`; valor `null` = chave ausente; a forma canônica (a de `nlu_core.format_output`:
ordem do contrato, separadores `", "`/`": "`, acentos sem escape) com no máximo **400 caracteres**. Inválido → **`400 { "ok": false, "error": "contexto" }`**
(o Modal não é chamado). A forma canônica entra na chave do cache (`<MODEL_VERSION>|<contexto canônico ou vazio>|<pergunta normalizada>`); o
objeto saneado vai ao Modal (`{ q, v, contexto }`), que monta a mensagem `contexto: <json canônico>\n<pergunta>` (igual ao treino,
`ia/corpus/contexto_nlu.py`). **Ancoragem herdada:** com contexto, uma entidade do modelo que não está na pergunta também passa se for **igual**
(mesma normalização: símbolo, id, unidade, composto sem acento/caixa ou mesma fórmula, equação sem espaços, quantidade com o mesmo valor e
unidade) à entidade **da mesma chave** no contexto; o que não está nem na pergunta nem no contexto continua caindo. **Segurança:** além da pergunta,
a regra avalia a pergunta junto com o `composto`/`equacao` do contexto ("como fazer em casa?" depois de um explosivo → `RECUSA_PERIGO`, sem
modelo). A resposta tem a mesma forma, mais **`"contexto": true`** quando o contexto entrou no prompt (também no `cached: true`); o log só
registra `ctx: true`, nunca o conteúdo.

### `POST /api/melhoria` ("Ajudar a melhorar o app", desde 16/10/2026)
Captura **opcional**, com consentimento **próprio** (separado do da IA na nuvem), das perguntas que o app não entendeu. Diferente do `/api/nlu`,
aqui o texto é **guardado** para uma pessoa revisar. Porte de `apps/eleicoes2026/api/melhoria.js` (lá: hash por dia e filtro de opinião política; aqui: lista
por mês, filtro de pedido perigoso e de dado pessoal ampliado).

Entrada (corpo até 8 KB):
```json
{ "v": 1, "client": "web" | "android", "iid": "<uuid v4/v7>", "idioma": "pt-BR" | "en" | "es" | "de" | "fr",
  "itens": [ { "q": "3 a 300 caracteres", "intentLocal": "<intenção do NLU local>" | "DESCONHECIDA", "t": "AAAA-MM-DD (opcional)" } ] }
```
1 a 10 itens. `intentLocal` ausente vale `DESCONHECIDA`; fora do vocabulário (`_lib/vocab.js`) é guardada como `DESCONHECIDA`; fora do formato `[A-Z_]` = `400`.
`t` com hora ou data impossível = `400`; ausente = o dia de hoje (Brasília).

Saída: `200 { "ok": true, "aceitos": n, "descartados": m }` · `400 { "error": "bad_request", "field": "v"|"client"|"iid"|"idioma"|"itens"|"body" }` ·
`403 origin` · `405` · `413`/`415` · `429 rate_limited` (com `Retry-After`) · `503 disabled` (desligado: `MELHORIA_ENABLED` diferente de `1` ou sem Redis) ·
`503 unavailable` (o Redis falhou: **nada** foi guardado; o cliente mantém a fila).

No servidor, **antes de guardar**, cada item é **descartado** (nunca mascarado), contando em `descartados`, quando:
- tem menos de 3 ou mais de 300 caracteres depois da limpeza (controles, espaços repetidos, delimitadores do ChatML: `cleanText`);
- é **pedido perigoso** (`_lib/seguranca.js` → `avaliarPedido`: regras próprias + léxico de **todos** os idiomas, sempre) ou veio com `intentLocal: "RECUSA_PERIGO"`;
- tem **dado pessoal** (`_lib/dadopessoal.js`): e-mail (também "arroba ... ponto com" e nomes de provedor), CPF, CNPJ, telefone (Brasil, com ou sem DDD, e internacional
  com `+`), URL/`www.`/domínio com TLD conhecido, `@usuário`, ou sequência de 9 ou mais dígitos (com espaços, pontos, hífens). Número CAS (`7732-18-5`) e decimal
  (`6.02214076`) não contam. Hidratos com ponto (`CuSO4.5H2O`) não são domínio. Intervalos de temperatura `2000-3000 K` caem no padrão de telefone: a pergunta não é
  guardada (falso positivo aceito, privacidade primeiro). Espelho no site: `web/src/quimica/js/melhoria.js` (o teste do site confere os dois com os mesmos casos);
- é repetido no mesmo envio (sem diferença de caixa).

Guardado: `RPUSH quimica:melhoria:<AAAA-MM>` (mês de Brasília) de `{"q","intentLocal","idioma","client","t"}` — **sem iid, sem IP, sem hora** —, depois
`LTRIM` (no máximo `MELHORIA_MAX_POR_MES` = 5.000; ficam as mais recentes) e `EXPIREAT` 90 dias depois do fim do mês (retenção máxima ~4 meses). O texto **nunca**
vai para o log (só `evt`, `status`, `ms`, `client`, `idioma`, `err`, `aceitos`, `descartados`). Limites: `MELHORIA_PER_HOUR` por IP e `MELHORIA_PER_DAY` por
instalação (memória da instância + contador no Redis `st:quimica:melhoria:{ip|iid}:<balde>`, que expira com a janela). Não há leitor automático: a colheita
para revisão humana ainda não existe aqui (molde: `apps/eleicoes2026/backend/retrain/colher_sinais.mjs` e `docs/OPERACAO.md` §7 de lá).

**Para ligar:** política de privacidade 1.2 publicada (`web/src/quimica/privacidade/*`, já com a linha "Ajudar a melhorar o app") → `UPSTASH_REDIS_REST_URL` e
`UPSTASH_REDIS_REST_TOKEN` na Vercel → `MELHORIA_ENABLED=1` → deploy → `GET /quimica/api/health` com `"melhoria":"on"`. O site mostra a opção sempre (desligada por
padrão); com o servidor desligado a fila fica no aparelho e a resposta é "não disponível agora", sem erro.

### `POST /api/ask`
Entrada `{ "q", "context"?, "trechos"?: [{ "id", "texto" }], "v": 1, "client", "iid" }`: contexto até 4.000 caracteres; até 6 trechos (`id` no formato de
`data/quimica/textos`, `texto` até 1.200 caracteres, 6.000 no total); corpo até 24 KB.
Saída `200 { "ok": true, "answer", "model", "fontes": [ids dos trechos citados], "cached" }`. O servidor **rejeita** (`422 { "error": "rejected" }`, motivo só no log) a resposta que:
(a) traga número com 2 ou mais dígitos, ou decimal, que não está na pergunta, no `context` nem nos `trechos`;
(b) viole a segurança química (passos de produção junto de um alvo perigoso);
(c) afirme fórmula química que não está nos dados enviados (molécula elementar como `O2` vale se o elemento aparece nos dados);
(d) invente fonte: `[id]` que não foi enviado, DOI/endereço/ISBN ou nome de fonte/obra (OpenStax, IUPAC, PubChem...) ausentes dos dados.
Pedido perigoso na pergunta: `422 { "error": "seguranca" }` sem tocar em provedor nenhum. `fidelidade.js` é a barreira final; os gates do modelo (`backend/modal/eval_*.py`) medem antes de publicar.

Provedores: **Space do Hugging Face (ZeroGPU)** é o principal (`POST /gradio_api/call/ask` devolve um `event_id`; `GET .../<event_id>` devolve o resultado em SSE); o **Modal** é a reserva
(cota esgotada, Space fora do ar, tempo esgotado), com orçamento próprio e baixo. Resposta reprovada no verificador não é refeita no outro provedor.

Erros comuns: `400` corpo inválido · `403` origem não permitida · `405` método · `413`/`415` corpo grande ou tipo errado · `429` limite (com `Retry-After`) · `502` provedor · `503` desligada ou orçamento do dia · `504` tempo esgotado.

## Variáveis de ambiente (Vercel, produção) — nomes apenas; segredos nunca no Git
| Variável | Para quê | Padrão |
| :-- | :-- | :-- |
| `MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET` | NLU no Modal (URL https + par de tokens de proxy). **Esvaziar `MODAL_ENDPOINT` desliga o NLU.** | vazio = desligado |
| `MODEL_VERSION` | versão do NLU em produção (`nlu-v1-AAAAMMDD`); entra na chave do cache (promover invalida) | `dev` |
| `MODAL_TIMEOUT_MS` · `DAILY_BUDGET` | tempo total (500 a 25.000 ms) · chamadas ao Modal por dia (global, com Redis) | 12000 · 300 |
| `ASK_ENABLED` | **só `1` liga** o explicador (e é preciso um provedor abaixo) | desligado |
| `HF_ASK_SPACE_URL`, `HF_TOKEN` | Space do Hugging Face (https) e token de leitura fine-grained | vazio |
| `HF_ASK_DAILY_BUDGET` · `HF_ASK_TIMEOUT_MS` | chamadas ao Space por dia (protege a cota da conta) · tempo | 400 · 25000 |
| `MODAL_ASK_ENDPOINT` (+ `MODAL_KEY`/`MODAL_SECRET`) | reserva do explicador no Modal | vazio |
| `MODAL_ASK_DAILY_BUDGET` · `MODAL_ASK_TIMEOUT_MS` | chamadas à reserva por dia (a GPU cobra o contêiner) · tempo | 15 · 30000 |
| `ASK_MODEL_VERSION` | versão do explicador (chave do cache); sem ela vale `MODEL_VERSION` | `dev` |
| `RATE_IP_PER_MIN` · `RATE_IID_PER_DAY` | limites por IP e por instalação (`iid`) | 20 · 60 |
| `CACHE_TTL_SECONDS` · `CACHE_MAX_ENTRIES` | cache em memória por instância | 3600 · 500 |
| `ALLOWED_ORIGINS` | origens CORS, separadas por vírgula; `*` casa só um trecho de hostname | `https://saibatudo.net,https://www.saibatudo.net` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_*`) | contadores **globais** de limite e de orçamento entre instâncias (opcional; falha aberto) e o armazenamento do `/api/melhoria` (obrigatório para ele) | vazio = só local |
| `MELHORIA_ENABLED` | **só `1` liga** o `/api/melhoria` (e é preciso o Redis acima) | desligado |
| `MELHORIA_PER_HOUR` · `MELHORIA_PER_DAY` · `MELHORIA_MAX_POR_MES` | envios por IP/hora · envios por instalação/dia · perguntas guardadas por mês (as mais antigas saem) | 6 · 20 · 5000 |
| `VERCEL_GIT_COMMIT_SHA` | preenchida pela Vercel; vira `version` no health | `dev` |

No Git Bash grave sempre com `printf '%s' "$VALOR" | vercel env add NOME production [--sensitive]` (sem quebra de linha no fim). `vercel env ls production` lista só os nomes.

## Como desligar cada recurso (kill switch, vale a partir do próximo deploy)
| Recurso | Como | Efeito no cliente |
| :-- | :-- | :-- |
| NLU na nuvem | `vercel env rm MODAL_ENDPOINT production -y` (ou esvaziar) + deploy | `503 disabled`; o app usa só o NLU local por regras |
| Explicação por IA | `vercel env rm ASK_ENABLED production -y` + deploy | `503 disabled`; o app mantém a resposta montada dos dados |
| Só o Hugging Face | remover `HF_ASK_SPACE_URL` (a reserva no Modal passa a ser o principal, com o orçamento dela) | explicação via Modal |
| Só a reserva do Modal | remover `MODAL_ASK_ENDPOINT` | falha do Space vira `502` |
| Limites compartilhados | remover `UPSTASH_REDIS_REST_*` | volta a valer só o limite por instância (e o `/api/melhoria` desliga: `503 disabled`) |
| "Ajudar a melhorar o app" | `vercel env rm MELHORIA_ENABLED production -y` + deploy | `503 disabled`; a fila fica no aparelho, sem erro |
| Gastar menos | `DAILY_BUDGET`, `HF_ASK_DAILY_BUDGET`, `MODAL_ASK_DAILY_BUDGET` menores (0 = esgotado) | `503 budget` |
Reverter a versão do modelo: `docs/MODELO.md` §9.

## Testes
`cd api && npm test` (`node:test`, sem rede). Cobrem: normalização e ancoragem (≥ 40 casos), segurança (casos de `test/seguranca_cases_api.json` e de `contracts/seguranca_cases.json`),
segurança e ancoragem em **todos os idiomas** (`seguranca_idiomas`, `ground_idiomas`, `lexico`: cópias do léxico em dia),
fidelidade, golden compartilhado (`contracts/nlu_golden_cases.json`: o "modelo perfeito" não perde entidade, sem tolerância; os casos sem a entidade que a intenção exige — o golden
não traz `composto` quando o composto não está no pacote — devem virar `DESCONHECIDA`), handlers (503 desligado, CORS, validação, limites por IP/instalação/Redis, cache,
`melhoria` (desligado/ligado, filtros de pedido perigoso em 5 idiomas e de dado pessoal com falsos positivos da química, lista do mês com LTRIM/EXPIREAT, privacidade do que é guardado e do log),
orçamento, coalescência, falhas do Modal, caminho Hugging Face → Modal → falha, verificador), health e adaptador Node. Não há modo mock: nada responde "como se fosse o modelo".

## Idiomas: como a API usa o léxico compartilhado
O site e o app falam pt-BR (padrão), en, es, de e fr. A **fonte da verdade** dos padrões de interpretação e de segurança é `contracts/lexico/<idioma>.json`
(um arquivo por idioma; regex como texto, sem flags; o texto chega minúsculo, sem acento, só `[a-z0-9]` e espaços). A API **não recebe o idioma da interface**
(o corpo é só `q`, `v`, `client`, `iid`), então aplica **sempre os cinco** em tudo o que decide segurança ou confere evidência.

- **Cópias geradas.** A Vercel não leva `contracts/` (`.vercelignore`) e a função só enxerga o que o bundler rastreia pelos `import`. Por isso a API importa
  `_lib/lexico/<idioma>.js` (mesmo formato dos léxicos do site) e `_lib/lexico/nomes-elementos.js` (nomes de elementos em es/de/fr, de `data/quimica/elementos.json`).
  Mudou um contrato ou os nomes? `cd api && node _lib/lexico/sincronizar.mjs` (e `--check` para só conferir). `test/lexico.test.mjs` falha se as cópias estiverem defasadas.
  Nunca edite os gerados nem o contrato por aqui. `_lib/lexico.js` compila a seção `seguranca` do mesmo jeito que o site (`web/.../nlu/lex/index.js`).
- **Segurança (`_lib/seguranca.js`).** `avaliarPedido` recusa se **qualquer** de duas camadas recusar: (1) as regras próprias em português (alvo + ação forte/genérica, proteção,
  tolerância fonética e a um erro de digitação); (2) `avaliarPorLexico`, a mesma lógica de `web/src/quimica/js/seguranca.js` nos cinco idiomas: autolesão primeiro, depois ação + alvo
  (explosivos, armas, drogas, precursores), dano a pessoas, reagente caseiro e a versão "colada"; as visões do texto são a normal, a com "leet" resolvido e a com letras soltas
  reunidas (`c.o.c.a.i.n.e`). Só do lado da API (o léxico é mais grosso que as regras em português): lista de bombas inofensivas (banho, chocolate...), "como fazer para parar de
  usar…", pergunta sobre a lei (substantivo "produção/production" não é ação), cloro gasoso por eletrólise de salmoura fora de contexto caseiro, nomes de rua do inglês em
  expressões comuns ("ice cubes", "crackers", "weed killer", "hash function"), e três complementos do alemão/espanhol (abaixo). Essas exceções **removem uma frase ou palavra**
  antes do teste e nunca salvam o pedido inteiro: receita, passo a passo ou outro alvo na mesma frase continuam recusando (`test/seguranca_idiomas.test.mjs`).
- **Ancoragem (`_lib/vocab-i18n.js` → `ground.js`).** As formas em português de `vocab.js` seguem como eram; somam-se as formas de propriedade do léxico (todos os idiomas, palavra ou
  expressão inteira, mínimo 3 letras), as expressões de extremo (`heaviest`, `mais eletronegativo`), as de nível, as unidades por extenso (`degrees celsius`, `Liter`) e os nomes de
  elemento em es/de/fr. Nomes de 2 letras ficam de fora (o "or" francês é a conjunção inglesa: "ouro" em francês cai no NLU local). "cloruro de sodio"/"chlorure de sodium" não ancoram `Na`.
- **O texto gerado** (`respostaViolaSeguranca`, usado pelo verificador de fidelidade) **continua com os verbos de procedimento em português** (e alguns em inglês): resposta em outro
  idioma que descreva passos de produção só é pega pelo "alvo + ação forte + sem recusa" e pela presença do alvo; ampliar exige uma lista de imperativos por idioma que o léxico não tem.

**Lacunas do contrato (para quem mantém `contracts/lexico/*.json`; a API cobre com complementos locais, o site não):**
`de`: o verbo separável (`Wie stelle ich Sprengstoff her?`), a inversão sujeito-verbo em `fazerBomba` (`Wie baue ich eine Bombe?`) e `alvoDano` para `Welches Gift tötet unauffällig?`;
`es`: falta `elaborar` em `acao`; `pt-BR`: `tirarFazerSeguro` não cobre `como fazer para parar de usar crack`, e `gás cloro` é arma mesmo por eletrólise de salmoura (cloro-álcali);
`en`/`de`: `fazerBomba` casa "fazer uma bomba de banho" (só pt/es/fr têm a exceção genérica `bomba de …`); `en`: `ice`, `speed`, `crack`, `weed`, `hash`, `spice`, `coke` em `alvoDrogas`/colada
recusam "how to make ice cubes/crackers/weed killer" (o site também); `es`/`fr`: `produc*`/`production` em `acao` casam o substantivo português "produção" ("qual a lei sobre produção de drogas?").

## Pontos a reconciliar com o resto do projeto
- **Ids de propriedade (unificado em 10/10/2026).** Cliente, modelo, golden e `regras.propriedades` usam o **mesmo** id: o nome do campo do contrato, com unidade
  (`pontoFusaoK`, `densidadeKgm3`, `raioAtomicoPm`, `energiaIonizacaoKJmol`, `afinidadeEletronicaKJmol`, `pontoEbulicaoK`). `PROPRIEDADE_CLIENTE` (vocab.js/nlu_core.py) ficou vazio.
- **`composto` como CID.** O golden traz o CID; a nuvem devolve texto (nome ou fórmula copiados da pergunta) e o cliente resolve. `eval_golden.py` traduz o CID por `data/quimica/compostos`.
- **Chaves do golden fora do contrato da nuvem** (`grupo`, `periodo`, `bloco`, `categoria`, `estado`, `formula`): a nuvem não as devolve (o NLU local cuida); `formula` vai em `composto`.
- **`contracts/seguranca_cases.json`** é a fonte comum; `api/test/seguranca_cases_api.json` tem casos extras da API e pode ser incorporado a ele.
