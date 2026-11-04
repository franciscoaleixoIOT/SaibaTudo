# SaibaTudo Química — bot de mensagens (Telegram e WhatsApp), teste interno (desenho)

> Pedido do mantenedor (04/11/2026): oferecer o SaibaTudo por WhatsApp e Telegram usando a IA que já existe (interpretador no Modal,
> explicador no Hugging Face), **começando por um teste interno sem divulgação do endereço**, com uma única pessoa autorizada (o próprio
> mantenedor). Decisões registradas aqui: começar **só pelo app de química**; bot **dentro do app** (`apps/quimica/`), não em pasta nova;
> **Telegram primeiro**, WhatsApp quando a conta da Meta estiver pronta; um bot por app no futuro (a Meta dá um número de teste por app).

## 0. Fases

| Fase | Conteúdo | Depende de |
| :-- | :-- | :-- |
| **F1 (esta spec, implementação agora)** | Núcleo comum do bot + canal **Telegram** (`@SaibaTudoNetBot`), autorização por lista, resposta local, botão "Explicar com IA", contexto de conversa, política de privacidade da química com a seção do bot, publicação e teste ao vivo pelo mantenedor. | token do Telegram em `secrets/` (feito em 04/11) |
| **F2 (mesma spec, plano separado)** | Canal **WhatsApp** pela Cloud API da Meta: aperto de mão do webhook, assinatura HMAC, botões de resposta, número de teste com até 5 destinatários. | app "Empresa" na Meta com o produto WhatsApp, token, IDs e chave secreta em `secrets/whatsapp.env` |
| Futuro (fora desta spec) | Eleições e LLMs como bots próprios; imagens de moléculas; outros idiomas; grupos; voz; divulgação pública; verificação de empresa na Meta. | — |

## 1. Objetivo e critérios de sucesso

**Objetivo.** O mantenedor abre uma conversa com o bot no Telegram (depois no WhatsApp), faz perguntas de química em português e recebe a
**mesma resposta que o site daria**: dados do pacote assinado, fontes e data dos dados, recusa dos pedidos perigosos, e, só quando ele tocar
no botão, a explicação gerada pela IA na nuvem, rotulada com o modelo e verificada pelo servidor. Ninguém fora da lista de autorizados recebe
resposta.

**Sucesso (medível antes de dizer "pronto"):**
1. As 20 perguntas mais frequentes do golden de química (`contracts/nlu_golden_cases.json`) produzem pelo bot o mesmo `intent` e o mesmo
   composto/elemento que o site (teste automático sobre o pacote real).
2. Webhook com segredo errado → 401; remetente não autorizado → 200 e **nenhuma** mensagem enviada; `update_id` repetido → 200 sem reprocessar.
3. Mensagem local respondida em menos de 3 s de ponta a ponta no teste ao vivo; a explicação por IA chega em mensagem separada ou é
   substituída pelo motivo (cota, recusa do verificador, nuvem fora).
4. Nenhum texto de pergunta ou resposta aparece nos logs da Vercel (só `evt`, `status`, `ms`, `canal`, `motivo`).
5. Política de privacidade da química publicada com a seção do bot **antes** de o webhook ser registrado; `npm test` do site e da API verdes;
   `python tools/test_workflows.py` e os testes de `vercel.json` verdes.
6. Teste ao vivo pelo mantenedor: 5 perguntas no Telegram incluindo uma continuação ("e a do KCl?"), um pedido perigoso recusado, um
   `/limpar` e um toque em "Explicar com IA".

## 2. Arquitetura

```
Telegram ──POST /quimica/api/bot/telegram──▶ api/bot/telegram.js ─┐
                                                                   ├─▶ api/_lib/bot/nucleo.js ─▶ motor do site (web/src/quimica/js/engine.js)
WhatsApp ──POST /quimica/api/bot/whatsapp──▶ api/bot/whatsapp.js ─┘        │                     + DataStore lido do disco do deploy
                                                                           └─▶ chamarAsk (api/_lib/ask-handler.js) → HF Space / Modal
```

- Dois endpoints novos no **mesmo projeto Vercel** de química (`saibatudo-quimica`), atrás das rotas `/quimica/api/bot/*` que o `vercel.json`
  já encaminha para `/api/*`. Nenhuma pasta nova de app, nenhum import entre apps (regra 1 do repositório).
- Cada endpoint é um **adaptador**: valida a origem (segredo/assinatura), converte o evento do canal numa `MensagemInterna`
  `{ canal, remetenteId, conversaId, texto?, acao?, idioma, eventoId }`, chama o núcleo e envia o resultado pela API do canal.
- O **núcleo** é independente de canal e de HTTP: autorização, dedup, contexto, motor, montagem da resposta em blocos e botões, pedido à nuvem.
- O **motor** é o do site, importado tal como está. O pacote de dados chega à função pelo `includeFiles` (`data/quimica/**`, 17 MB, 56 arquivos;
  o `DataStore` carrega sob demanda, então cada invocação lê só o que a pergunta exige). A assinatura do manifesto é verificada no arranque,
  como no site.
- A **IA na nuvem** é a função interna `chamarAsk(cfg, dados, { doFetch, now, state })` com `createAskState()` do próprio módulo: o mesmo
  orçamento diário, o mesmo verificador de fidelidade e o mesmo contador global do Upstash. Não passa pelo handler HTTP (sem CORS/origem).

## 3. Componentes (todos em `apps/quimica/`)

| Arquivo | Responsabilidade | Depende de |
| :-- | :-- | :-- |
| `api/_lib/bot/loja.js` | `criarStoreDoDisco()`: `DataStore` com `fetchFn` que lê `data/quimica/` do disco da função (molde: `fetchDeDisco` de `web/test/support.mjs`); um por instância, reaproveitado entre invocações. | `web/src/quimica/js/data.js` |
| `api/_lib/bot/nucleo.js` | `criarNucleo({ store, config, estado, agora })` → `processar(msg)`: autoriza, dedup por `eventoId`, recupera o contexto da conversa, chama `Engine.responder`, devolve `{ blocos, botoes, resposta }`; `explicar(msg)`: monta o corpo do ask a partir da última resposta e chama `chamarAsk`; comandos `/start`, `/limpar`, `/sobre`, `/ajuda`. | `engine.js`, `ask-handler.js`, `ratelimit.js`, `compartilhado.js` |
| `api/_lib/bot/formato.js` | `paraTelegramHtml(blocos)` e `paraTextoSimples(blocos)`: títulos, listas, pares rótulo:valor, avisos, fontes com data do pacote; corte em 4 000 caracteres com "(continua)" e envio em partes; escape de HTML. | `answers.js` (`textoDoBloco`) |
| `api/_lib/bot/telegram.js` | `verificarSegredo(req)`, `lerUpdate(json)` → `MensagemInterna`, `enviar(chatId, html, { botoes })`, `responderCallback(id)`, `registrarWebhook(url, segredo)` (usado por `tools/bot_telegram_webhook.py`). | `fetch` |
| `api/_lib/bot/whatsapp.js` (F2) | `verificarAssinatura(req, appSecret)`, aperto de mão GET (`hub.verify_token`), `lerEvento(json)`, `enviar(numero, texto, { botoes })`. | `fetch`, `node:crypto` |
| `api/bot/telegram.js` | Endpoint: `POST` → adaptador → núcleo → envio; sempre 200 depois de tratar (ou 401 se o segredo falhar). `config = { maxDuration: 60 }`. | acima |
| `api/bot/whatsapp.js` (F2) | Endpoint: `GET` aperto de mão, `POST` eventos. | acima |
| `tools/bot_telegram_webhook.py` | Registra/remove o webhook com o token de `secrets/telegram_token.txt` e o segredo; imprime `getWebhookInfo`. Nunca imprime o token. | `urllib` |
| `web/src/quimica/privacidade/{index,en,es,de,fr}.html` (política 1.3 → 1.4) | Seção nova "Bot de mensagens (teste interno)"; versão da política incrementada; teste existente ajustado. | — |
| `vercel.json` | `functions["api/bot/telegram.js"].includeFiles = "data/quimica/**"` (e o do WhatsApp na F2); testes de `vercel.json` cobrem. | — |
| `api/README.md`, `docs/OPERACAO.md`, `docs/PROJECT_MEMORY.md`, `docs/PENDENCIAS.md`, `CLAUDE.md` | Variáveis, chaves de desligamento, como registrar o webhook, como autorizar alguém, estado. | — |

## 4. Fluxo de uma mensagem (Telegram)

1. Telegram chama `POST /quimica/api/bot/telegram` com o cabeçalho `X-Telegram-Bot-Api-Secret-Token`. Diferente de `BOT_TELEGRAM_SECRET` → **401**.
2. `BOT_ENABLED` vazio → **200** sem processar (chave de desligamento; o site e o Android não mudam).
3. `from.id` fora de `BOT_TELEGRAM_IDS` → **200**, nada enviado, contador agregado `bot_nao_autorizado` no log (sem id, sem texto).
4. `update_id` já visto nos últimos 30 min → **200** sem reprocessar (o Telegram reenvia quando não recebe 2xx).
5. Comando? `/start` apresenta o bot e o aviso de teste interno; `/limpar` chama `engine.limparContexto()` e apaga o contexto guardado;
   `/sobre` dá origem (PubChem, Wikidata, CODATA…) e data do pacote; `/ajuda` lista exemplos (as sugestões padrão do site).
6. Texto: `nucleo.processar` → `Engine.responder(texto, { contexto })`. A segurança química roda primeiro dentro do motor; recusa vira
   resposta de recusa sem botão de nuvem e sem guardar contexto.
7. Resposta resolvida: blocos → HTML do Telegram, rodapé com fontes e "Dados de <data do pacote>", teclado inline com **"Explicar com IA"**
   e **"Sugestões"**. Não resolvida: aviso padrão do app + até 4 sugestões como botões que reenviam a pergunta.
8. O contexto da conversa (`_ultimoContexto` e `_ultimaInterpretacao` do motor, serializados) é guardado por `conversaId` com validade de
   **30 min**: em memória da instância e, se `UPSTASH_REDIS_REST_*` existirem, no Redis sob `bot:ctx:<sha256(conversaId)>` com `EXPIRE`.
   Falha aberta: sem Redis, vale só a memória.
9. Toque em "Explicar com IA" (`callback_query`): `answerCallbackQuery` imediato ("Gerando…"); o núcleo monta
   `{ q, contexto, trechos }` a partir da última resposta guardada (mesma montagem que `nuvem.js` faz no site) e chama `chamarAsk`;
   sucesso → mensagem nova com o texto, rótulo do modelo e aviso "texto gerado por IA, pode conter erros"; falha → mensagem curta com o
   motivo (`budget`, `rejected`, `upstream`, `timeout`, `disabled`), igual aos textos do site.
10. A função devolve **200** só depois de enviar (ou tentar enviar) a resposta: uma retentativa no `sendMessage`; se falhar de novo, log
    `bot_envio_falhou` sem texto. Tudo dentro de `maxDuration: 60` (a nuvem pode levar 20 a 45 s).

## 5. Segurança e privacidade

- **Segredos** (nunca no Git nem no chat): `apps/quimica/secrets/telegram_token.txt` (feito), `secrets/whatsapp.env` (F2). Na Vercel, como
  variáveis **sensíveis** de produção: `BOT_TELEGRAM_TOKEN`, `BOT_TELEGRAM_SECRET` (gerado localmente, 32 bytes aleatórios em hex),
  `BOT_TELEGRAM_IDS`; F2: `BOT_WHATSAPP_TOKEN`, `BOT_WHATSAPP_PHONE_ID`, `BOT_WHATSAPP_APP_SECRET`, `BOT_WHATSAPP_VERIFY_TOKEN`,
  `BOT_WHATSAPP_NUMEROS`. Ligar/desligar: `BOT_ENABLED=1`.
- **Autorização**: lista fechada; não autorizado recebe silêncio (não revela que o bot existe nem que há lista). Autorizar alguém = editar a
  variável e redeploy; documentado em `OPERACAO.md`.
- **Logs**: só `evt`, `status`, `ms`, `canal`, `motivo`, `cache`. Nenhum id de remetente em claro, nenhum texto. O contexto no Redis é
  indexado pelo SHA-256 do id da conversa e expira em 30 min; nenhuma mensagem é guardada.
- **Limites**: por conversa, `BOT_RATE_POR_MIN` (padrão 10) e `BOT_RATE_POR_DIA` (padrão 200) via `ratelimit.js`; o orçamento diário da nuvem é o global (`ask-hf`, Upstash), então o bot entra na mesma proteção da
  cota ZeroGPU que os apps.
- **Segurança química**: o filtro do motor roda antes de tudo; pedido recusado nunca vai à nuvem nem ao Redis.
- **Política de privacidade** (química, nos idiomas em que o app a publica; pt-BR é o texto-fonte): seção "Bot de mensagens
  (teste interno)" com: Telegram (e Meta na F2) como operadores que veem o número/ID e o texto da conversa pelas regras deles; o que o
  servidor do projeto recebe (texto da pergunta, id da conversa), o que guarda (contexto por 30 min, resumo irreversível do id) e o que não
  guarda (texto, id em claro); IA na nuvem só por toque no botão. Versão da política incrementada; publicada **antes** de registrar o webhook.
- **CSP/CORS**: os endpoints do bot não são chamados pelo navegador; respondem sem CORS e com os `SECURITY_HEADERS` já usados pela API.

## 6. Erros e limites

| Situação | Comportamento |
| :-- | :-- |
| Segredo/assinatura inválidos | 401, nada processado, log `bot_auth_falhou` |
| `BOT_ENABLED` vazio | 200 silencioso |
| Pacote não carrega / assinatura inválida | 200 ao canal + mensagem "Dados indisponíveis no momento" ao autorizado; log `bot_dados_falhou` |
| Resposta > 4 000 caracteres | partes numeradas "(1/2)", rodapé só na última |
| Nuvem desligada (`ASK_ENABLED` vazio) | botão "Explicar com IA" não aparece |
| Cota/limite/recusa/timeout da nuvem | mensagem curta com o motivo, resposta local permanece |
| `sendMessage` falha | 1 retentativa após 500 ms; depois log `bot_envio_falhou` |
| Instância fria | primeira pergunta pode levar 2 a 4 s (carga do índice de compostos); aceitável no teste interno |

## 7. Testes

- **API (`api/test/bot_*.test.mjs`)**: segredo válido/inválido; não autorizado → nenhum `fetch` de envio; dedup de `update_id`; comandos;
  formatação (HTML escapado, listas, corte em partes); contexto guardado e expirado; botão → corpo do ask igual ao do site; mapeamento dos
  motivos de falha; `BOT_ENABLED` vazio. Tudo com `fetch` simulado, sem rede.
- **Golden do bot (`api/test/bot_golden.test.mjs`)**: 20 perguntas do golden sobre o pacote real via `criarStoreDoDisco()` comparando `intent`
  e entidade com o esperado do contrato.
- **Contratos**: `vercel.json` (rotas e `includeFiles`), `tools/test_workflows.py` (nenhum workflow novo é necessário na F1), teste de
  privacidade (versão nova e seção do bot em todos os idiomas publicados).
- **Ao vivo** (mantenedor, após deploy e `setWebhook`): o roteiro do critério 6 da §1, com `gh`/`vercel logs` conferidos para ausência de texto.

## 8. Publicação (F1)

1. Código + política + docs na `main` (CI `quimica-web-ci.yml` verde).
2. Variáveis na Vercel (`BOT_ENABLED`, `BOT_TELEGRAM_*`), `vercel deploy --prod` de `apps/quimica` **ou** `gh workflow run quimica-data-refresh.yml`
   (lembrar o bloqueio atual do teste de integridade com `QUIMICA_ASK_ENABLED`, pendência aberta à parte).
3. `python tools/bot_telegram_webhook.py --registrar https://saibatudo.net/quimica/api/bot/telegram` e conferir `getWebhookInfo`.
4. Teste ao vivo pelo mantenedor; `PROJECT_MEMORY.md` e `PENDENCIAS.md` atualizados no mesmo ciclo.
5. Reversão: `BOT_ENABLED` vazio (imediato) ou `--remover` o webhook.

## 9. Fora de escopo (decidido)

Eleições e LLMs; imagens de moléculas (SmilesDrawer exige canvas); idiomas além de pt-BR (o motor já é multilíngue; ligar depois pelo
`language_code` do Telegram é trabalho pequeno, mas fica para depois do teste); grupos e canais; mensagens de voz; captura de perguntas
("Ajudar a melhorar"); divulgação pública; verificação de empresa e token permanente da Meta (F2 começa com o token temporário de 24 h).
