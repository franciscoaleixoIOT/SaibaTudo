# SaibaTudo Química — bot de mensagens, F1 (núcleo + Telegram): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O mantenedor conversa com `@SaibaTudoNetBot` no Telegram e recebe a mesma resposta que o site de química daria (dados do pacote assinado, fontes, recusas), com um botão "Explicar com IA" que chama a nuvem já existente; ninguém fora da lista de autorizados recebe resposta.

**Architecture:** Um endpoint serverless novo no projeto Vercel de química (`api/bot/telegram.js`) valida o segredo do webhook, converte o update numa `MensagemInterna` e chama um núcleo sem dependência de canal (`api/_lib/bot/nucleo.js`), que roda o motor do site (`web/src/quimica/js/engine.js`) sobre um `DataStore` lido do disco da função (`includeFiles: data/quimica/**`) e, no botão, a função interna `chamarAsk` de `api/_lib/ask-handler.js`. O contexto da conversa (30 min) e a deduplicação ficam em memória e, se houver `UPSTASH_REDIS_REST_*`, no Redis sob hash do id. Formatação em HTML do Telegram em partes de até 4 000 caracteres.

**Tech Stack:** Node ≥ 22 (ESM, `node:test`, zero dependências, `globalThis.fetch`), Telegram Bot API (webhook com `X-Telegram-Bot-Api-Secret-Token`, `sendMessage` HTML, `callback_query`), Vercel Functions (`maxDuration: 60`, `includeFiles`), Python 3 `urllib` + `unittest` para a ferramenta do webhook.

**Spec:** `docs/superpowers/specs/2026-11-04-quimica-bot-mensagens-design.md` (§0–§9; este plano cobre a F1).

## Global Constraints

- Tudo dentro de `apps/quimica/`; **nenhum import de outro app** (regra 1 do repositório). Rode comandos de dentro de `apps/quimica`.
- **Segredos nunca no Git nem no chat**: token em `secrets/telegram_token.txt`; `BOT_TELEGRAM_IDS`, `BOT_TELEGRAM_SECRET` e os demais valores em `secrets/telegram_bot.env` (já gravado em 04/11/2026). Na Vercel, variáveis **sensíveis** de produção.
- **Logs sem texto**: só `evt`, `canal`, `status`, `ms`, `motivo`, `cache`. Nenhum id de remetente em claro, nenhuma pergunta, nenhuma resposta, nenhum token (spec §5; testes conferem a ausência de texto no log).
- O código do **site** (`web/src/`) continua sem texto fixo em português; o código do bot (`api/_lib/bot/`) é servidor, fala pt-BR nesta fase (spec §9) e lê os textos do app pelos catálogos (`t`, `tl` de `web/src/quimica/js/i18n/index.js`) sempre que existir chave.
- Testes **sem rede** (`fetch` simulado) e sem Redis; o golden roda sobre o pacote real só quando `data/quimica/manifest.sig` existe (padrão dos testes do site).
- Mudanças no código do site limitadas a **uma linha**: exportar `textoDoBloco` em `web/src/quimica/js/answers.js`. O motor (`engine.js`) não muda; o núcleo lê e grava `engine._ultimoContexto` e `engine._ultimaInterpretacao` (spec §4.8).
- Variáveis: `BOT_ENABLED` (`'1'` liga), `BOT_TELEGRAM_TOKEN`, `BOT_TELEGRAM_SECRET`, `BOT_TELEGRAM_IDS` (ids separados por vírgula), `BOT_RATE_POR_MIN` (padrão **10**), `BOT_RATE_POR_DIA` (padrão **200**). Contexto por conversa: **30 min**; dedup de `update_id`: **30 min**; corte de mensagem: **4 000** caracteres; retentativa do `sendMessage`: **1**, após **500 ms**.
- Política de privacidade da química: **1.3 → 1.4**, nos cinco idiomas publicados (`privacidade/{index,en,es,de,fr}.html`), **antes** de registrar o webhook.
- Commits em inglês no padrão do repositório (`feat(quimica): …`), com as linhas de atribuição da sessão. Push na `main` não publica; publicação é a Task 11.
- **Desvio registrado da spec §5:** para o botão "Explicar com IA" funcionar, o contexto guardado por 30 min inclui o texto da última pergunta e da última resposta (spec §4.9 exige montar o pedido "a partir da última resposta guardada"). A frase "não guarda texto" da §5 vale para logs e para qualquer guarda além dos 30 min; a política 1.4 diz isso explicitamente.

## Review Focus

1. **Update sem texto** (foto, sticker, `edited_message`, chat de grupo): a função responde 200 e não envia nada. Teste em Task 5 (`lerUpdate` devolve `null`) e Task 6.
2. **Pergunta com mais de 300 caracteres**: o núcleo corta em `MAX_Q` antes do motor; nada quebra. Teste em Task 4.
3. **`callback_data` desconhecido ou fora da faixa** (`sug:9`, `x`): o callback é respondido, nada é enviado, 200. Teste em Task 4.
4. **Resposta maior que 4 000 caracteres** (ex.: `/sobre` com muitas fontes): partes "(1/2)", "(2/2)", rodapé só na última, nenhuma parte acima do limite, tags HTML não cortadas ao meio. Teste em Task 3.
5. **Redis fora do ar ou devolvendo erro**: contexto, dedup e limites continuam só em memória, sem lançar. Teste em Task 2.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
| :-- | :-- | :-- |
| `api/_lib/bot/loja.js` (novo) | `DataStore` lido do disco da função; memoizado | 1 |
| `api/_lib/bot/conversas.js` (novo) | contexto por conversa (30 min), dedup de evento, limites por conversa; memória + Redis opcional | 2 |
| `api/_lib/bot/formato.js` (novo) | blocos → HTML do Telegram / texto simples; divisão em partes | 3 |
| `web/src/quimica/js/answers.js` (1 linha) | exportar `textoDoBloco` | 3 |
| `api/_lib/bot/nucleo.js` (novo) | autorização, comandos, motor, botões, pedido à nuvem | 4 |
| `api/_lib/bot/telegram.js` (novo) | segredo, leitura do update, cliente `sendMessage`/`answerCallbackQuery` | 5 |
| `api/bot/telegram.js` (novo) | endpoint; `vercel.json` `functions` + teste em `web/test/build.test.mjs` | 6 |
| `api/test/bot_golden.test.mjs` (novo) | 20 casos do golden sobre o pacote real | 7 |
| `tools/bot_telegram_webhook.py` + `tools/test_bot_telegram_webhook.py` (novos) | registrar/remover/consultar o webhook | 8 |
| `web/src/quimica/privacidade/{index,en,es,de,fr}.html` + `web/test/i18n.test.mjs` | política 1.4 | 9 |
| `api/README.md`, `docs/OPERACAO.md`, `docs/PROJECT_MEMORY.md`, `docs/PENDENCIAS.md`, `CLAUDE.md` | documentação | 10 |
| Vercel + webhook + teste ao vivo | publicação (operacional) | 11 |

Tipos compartilhados (JSDoc, sem TypeScript), definidos uma vez aqui e usados pelos nomes abaixo em todas as tasks:

```js
/** @typedef {{ canal:'telegram', remetenteId:string, conversaId:string, texto:string|null, acao:string|null, idioma:string, eventoId:string, callbackId:string|null }} MensagemInterna */
/** @typedef {{ rotulo:string, acao:string }} Botao */                       // acao ≤ 64 bytes (limite do Telegram)
/** @typedef {{ titulo?:string|null, blocos:object[], rodape?:{ fontes?:string[], dataPacote?:string|null, origem?:string|null } }} Resposta */  // blocos no formato de answers.js (tipo: texto|aviso|lista|kv|...)
/** @typedef {{ silencio:true, motivo:string } | { silencio?:false, resposta:Resposta, botoes:Botao[], motivo?:string, interpretacao?:{intent:string, elemento:string|null, composto:number|null} }} Saida */
/** @typedef {{ ultimoContexto:object|null, ultimaInterpretacao:object|null, ultima:{ q:string, directAnswer:string, parsed:{intent:string, elemento:string|null, composto:number|null} }|null, sugestoes:string[], guardadoEm:number }} Contexto */
```

---

### Task 1: Loja do disco (`api/_lib/bot/loja.js`)

**Files:**
- Create: `apps/quimica/api/_lib/bot/loja.js`
- Test: `apps/quimica/api/test/bot_loja.test.mjs`

**Interfaces:**
- Consumes: `DataStore` de `web/src/quimica/js/data.js` (`new DataStore({ baseUrl, fetchFn })`, `await iniciar()`, `store.sig.estado`, `store.porSimbolo`, `store.indice.porCid`).
- Produces:
  - `export const DIR_PADRAO = new URL('../../../data/quimica/', import.meta.url)`
  - `export const BASE_BOT = 'https://bot.local/quimica/data/'`
  - `export function fetchDoDisco(dir = DIR_PADRAO, base = BASE_BOT)` → função `(url, init?) => Promise<Response>`; ignora `?v=`; 404 fora da base ou arquivo ausente; `dir` é `URL` ou caminho (string).
  - `export async function criarStoreDoDisco({ dir = DIR_PADRAO } = {})` → `Promise<DataStore>` iniciado; **lança** `Error('assinatura do pacote não verificada')` quando `store.sig.estado !== 'verificada'`.
  - `export function storeDoDisco({ dir = DIR_PADRAO } = {})` → `Promise<DataStore>` memoizada por `dir` (string da URL); se a promessa rejeitar, a memo é apagada para a próxima chamada tentar de novo.

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_loja.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarStoreDoDisco, fetchDoDisco, storeDoDisco, BASE_BOT } from '../_lib/bot/loja.js';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);

test('fetchDoDisco: serve arquivos do pacote (ignorando ?v=), 404 fora da base e para arquivo ausente', async () => {
  const f = fetchDoDisco(FIXTURE);
  const ok = await f(`${BASE_BOT}manifest.json?v=abc`);
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(Buffer.from(await ok.arrayBuffer()).toString('utf8')).schema, 1);
  assert.equal((await f('https://outro.local/x.json')).status, 404);
  assert.equal((await f(`${BASE_BOT}nao-existe.json`)).status, 404);
});

test('criarStoreDoDisco: pacote de teste iniciado com assinatura verificada; elementos e compostos no índice', async () => {
  const store = await criarStoreDoDisco({ dir: FIXTURE });
  assert.equal(store.sig.estado, 'verificada');
  assert.ok(store.porSimbolo.has('O'));
  assert.ok(store.indice.porCid.has(962), 'água no pacote de teste');
});

test('storeDoDisco: memoiza por pasta e esquece a promessa rejeitada', async () => {
  const a = storeDoDisco({ dir: FIXTURE });
  assert.equal(storeDoDisco({ dir: FIXTURE }), a, 'mesma promessa');
  const ruim = new URL('../../web/test/fixtures/nao-existe/', import.meta.url);
  await assert.rejects(storeDoDisco({ dir: ruim }));
  assert.notEqual(storeDoDisco({ dir: ruim }), undefined);
  await assert.rejects(storeDoDisco({ dir: ruim }), undefined, 'tenta de novo em vez de devolver a promessa rejeitada antiga');
});
```

Se a chave `schema` não existir no manifesto da fixture, troque a asserção por `assert.ok(typeof m.version === 'string')`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_loja.test.mjs`
Expected: FAIL (`Cannot find module '../_lib/bot/loja.js'`).

- [ ] **Step 3: Implementar `api/_lib/bot/loja.js`**

Leitura com `readFile` de `node:fs/promises` sobre `new URL(caminhoRelativo, dirUrl)` (converter `dir` string com `pathToFileURL` e garantir a barra final). Devolver `new Response(bytes, { status: 200 })`. Memo: `const memo = new Map()` com chave `String(dir)`; `.catch(() => memo.delete(chave))` encadeado sem engolir a rejeição devolvida.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/quimica/api && node --test test/bot_loja.test.mjs`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/_lib/bot/loja.js apps/quimica/api/test/bot_loja.test.mjs
git commit -m "feat(quimica): bot data store read from the function's disk (signed package, memoized)"
```

---

### Task 2: Conversas — contexto, dedup e limites (`api/_lib/bot/conversas.js`)

**Files:**
- Create: `apps/quimica/api/_lib/bot/conversas.js`
- Test: `apps/quimica/api/test/bot_conversas.test.mjs`

**Interfaces:**
- Consumes: `createSharedLimiter` de `api/_lib/compartilhado.js` (`shared.ativo()`, `shared.executar(comandos) → Promise<any[]|null>`, `shared.hit(chave, janelaSeg, limite)`); `createSlidingWindow`, `JANELAS` de `api/_lib/ratelimit.js`; `createHash` de `node:crypto`.
- Produces:
  - `export const TTL_CONVERSA_MS = 30 * 60_000`
  - `export const hashConversa = (id) => string` (SHA-256 hex de `String(id)`)
  - `export function criarConversas({ shared = null, now = () => Date.now(), ttlMs = TTL_CONVERSA_MS } = {})` → objeto:
    - `obter(conversaId): Promise<Contexto|null>` — memória; se ausente e `shared?.ativo()`, `GET bot:ctx:<hash>` e desserializa; descarta se `now() - guardadoEm > ttlMs`.
    - `guardar(conversaId, ctx): Promise<void>` — grava `{ ...ctx, guardadoEm: now() }` na memória e, se ativo, `SET bot:ctx:<hash> <json> EX <ttl em s>`.
    - `apagar(conversaId): Promise<void>` — memória + `DEL`.
    - `jaVisto(eventoId): Promise<boolean>` — memória (`Map eventoId → t`, poda acima de `ttlMs`); se não visto e ativo, `SET bot:evt:<hash> 1 EX 1800 NX` → resultado `null` significa já visto por outra instância. Marca como visto ao devolver `false`.
    - `limiteExcedido(conversaId, { porMin, porDia }): Promise<boolean>` — janelas locais (`JANELAS.MINUTO`, `JANELAS.DIA`) com `check` + `record`; depois `shared.hit('bot:min:<hash>', 60, porMin)` e `shared.hit('bot:dia:<hash>', 86400, porDia)` (falha aberta: sem shared, só local).
  - Nunca lança: qualquer erro do Redis vira comportamento só em memória.

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_conversas.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedLimiter } from '../_lib/compartilhado.js';
import { criarConversas, hashConversa, TTL_CONVERSA_MS } from '../_lib/bot/conversas.js';
import { relogio } from './_helpers.mjs';

const ENV_REDIS = { UPSTASH_REDIS_REST_URL: 'https://redis.exemplo.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'tok' };
/** Redis falso: executa SET/GET/DEL/INCR/EXPIRE em memória; `quebrado` responde 500. */
function redisFalso({ quebrado = false } = {}) {
  const dados = new Map();
  const comandos = [];
  const fetchFn = async (url, init) => {
    if (quebrado) return new Response('erro', { status: 500 });
    const lote = JSON.parse(init.body);
    comandos.push(...lote);
    const out = lote.map(([cmd, k, v, ...resto]) => {
      if (cmd === 'SET') { if (resto.includes('NX') && dados.has(k)) return { result: null }; dados.set(k, v); return { result: 'OK' }; }
      if (cmd === 'GET') return { result: dados.get(k) ?? null };
      if (cmd === 'DEL') return { result: dados.delete(k) ? 1 : 0 };
      if (cmd === 'INCR') { dados.set(k, String(Number(dados.get(k) ?? 0) + 1)); return { result: Number(dados.get(k)) }; }
      return { result: 1 };
    });
    return new Response(JSON.stringify(out), { status: 200 });
  };
  return { fetchFn, dados, comandos };
}
const CTX = { ultimoContexto: { intent: 'MASSA_MOLAR', composto: 962 }, ultimaInterpretacao: { intent: 'MASSA_MOLAR', composto: 962 }, ultima: { q: 'massa molar da água', directAnswer: '18,015 g/mol', parsed: { intent: 'MASSA_MOLAR', elemento: null, composto: 962 } }, sugestoes: ['pH de HCl 0,01 mol/L'] };

test('hashConversa: SHA-256 hex, determinístico, não contém o id', () => {
  const h = hashConversa(827000000);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, hashConversa('827000000'));
  assert.ok(!h.includes('827000000'));
});

test('memória: guardar/obter/apagar e expiração em 30 min', async () => {
  const now = relogio();
  const c = criarConversas({ now });
  assert.equal(await c.obter('1'), null);
  await c.guardar('1', CTX);
  assert.deepEqual((await c.obter('1')).ultima.parsed, CTX.ultima.parsed);
  now.avancar(TTL_CONVERSA_MS + 1);
  assert.equal(await c.obter('1'), null, 'expirou');
  await c.guardar('1', CTX);
  await c.apagar('1');
  assert.equal(await c.obter('1'), null);
});

test('Redis: chaves bot:ctx:<hash> com EX 1800, bot:evt:<hash> com NX; o id nunca aparece em claro; outra instância lê o contexto', async () => {
  const r = redisFalso();
  const now = relogio();
  const shared = createSharedLimiter({ env: () => ENV_REDIS, fetchFn: r.fetchFn, now });
  const a = criarConversas({ shared, now });
  await a.guardar('827000000', CTX);
  const chaveCtx = `bot:ctx:${hashConversa('827000000')}`;
  assert.ok(r.dados.has(chaveCtx));
  assert.ok([...r.dados.keys()].every((k) => !k.includes('827000000')));
  assert.ok(r.comandos.some((c) => c[0] === 'SET' && c[1] === chaveCtx && c[3] === 'EX' && c[4] === '1800'));
  const b = criarConversas({ shared, now });
  assert.equal((await b.obter('827000000')).ultima.q, CTX.ultima.q, 'instância nova lê do Redis');
  assert.equal(await a.jaVisto('tg:1'), false);
  assert.equal(await b.jaVisto('tg:1'), true, 'dedup entre instâncias via SET NX');
  assert.ok(r.comandos.some((c) => c[0] === 'SET' && c[1].startsWith('bot:evt:') && c.includes('NX')));
});

test('falha aberta: Redis com erro → só memória, sem lançar', async () => {
  const r = redisFalso({ quebrado: true });
  const now = relogio();
  const c = criarConversas({ shared: createSharedLimiter({ env: () => ENV_REDIS, fetchFn: r.fetchFn, now }), now });
  await c.guardar('1', CTX);
  assert.equal((await c.obter('1')).ultima.q, CTX.ultima.q);
  assert.equal(await c.jaVisto('tg:9'), false);
  assert.equal(await c.jaVisto('tg:9'), true);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false);
});

test('limites: 11ª mensagem no minuto e 201ª no dia são barradas; a janela do minuto libera depois de 60 s', async () => {
  const now = relogio();
  const c = criarConversas({ now });
  for (let i = 0; i < 10; i++) assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false, `msg ${i + 1}`);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), true);
  now.avancar(60_001);
  assert.equal(await c.limiteExcedido('1', { porMin: 10, porDia: 200 }), false);
  const d = criarConversas({ now });
  for (let i = 0; i < 200; i++) { await d.limiteExcedido('2', { porMin: 1000, porDia: 200 }); }
  assert.equal(await d.limiteExcedido('2', { porMin: 1000, porDia: 200 }), true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_conversas.test.mjs`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implementar `api/_lib/bot/conversas.js`**

Memória: `Map hash → Contexto` (poda ao `obter`), `Map eventoId → t`. `limiteExcedido`: quando barrado localmente, **não** chama o Redis. Serialização JSON do contexto; ao ler do Redis, `JSON.parse` dentro de `try` (JSON inválido = `null`).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/quimica/api && node --test test/bot_conversas.test.mjs`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/_lib/bot/conversas.js apps/quimica/api/test/bot_conversas.test.mjs
git commit -m "feat(quimica): bot conversation context, event dedup and per-conversation limits (memory + optional Redis, fail open)"
```

---

### Task 3: Formato (`api/_lib/bot/formato.js`) e `textoDoBloco` exportado

**Files:**
- Modify: `apps/quimica/web/src/quimica/js/answers.js:50` (`function textoDoBloco` → `export function textoDoBloco`)
- Create: `apps/quimica/api/_lib/bot/formato.js`
- Test: `apps/quimica/api/test/bot_formato.test.mjs`

**Interfaces:**
- Consumes: `textoDoBloco(bloco)` de `answers.js` (texto plano de qualquer bloco; `''` para tipo desconhecido).
- Produces:
  - `export const LIMITE_TELEGRAM = 4000`
  - `export const escaparHtml = (s) => string` (`&`, `<`, `>`)
  - `export function rodapeTexto(rodape): string` — junta com ` · ` as partes presentes, nesta ordem: `Fontes: a, b`, `Dados de <dataPacote>`, `Modelo: <origem>`; `''` sem nada.
  - `export function paraTextoSimples(resposta: Resposta): string` — título, blocos (`textoDoBloco`) e `rodapeTexto`, separados por linha em branco, sem tags.
  - `export function paraTelegramHtml(resposta: Resposta): string[]` — partes ≤ `LIMITE_TELEGRAM`; título em `<b>…</b>`; bloco `aviso` com prefixo `⚠️ `; bloco `citacao` em `<i>…</i>`; rodapé = `<i>${escaparHtml(rodapeTexto(rodape))}</i>` só na **última** parte; com mais de uma parte, prefixo `(i/n) `.
  - `export function dividir(texto, limite = LIMITE_TELEGRAM): string[]` — corta em quebras de linha (último `\n` antes do limite; sem `\n`, corta no limite); nunca corta dentro de uma tag (`<`…`>`).

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_formato.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_TELEGRAM, dividir, escaparHtml, paraTelegramHtml, paraTextoSimples, rodapeTexto } from '../_lib/bot/formato.js';

const R = {
  titulo: 'Massa molar de água (H₂O)',
  blocos: [
    { tipo: 'kv', titulo: null, itens: [{ rotulo: 'Fórmula', valor: 'H2O' }, { rotulo: 'Massa molar', valor: '18,015 g/mol' }], fonte: { nome: 'PubChem' } },
    { tipo: 'lista', titulo: 'Passos', itens: ['2 × H = 2,016', '1 × O = 15,999'], fonte: { nome: 'App' } },
    { tipo: 'aviso', texto: 'Valor a 25 °C <ref>', fonte: { nome: 'App' } },
  ],
  rodape: { fontes: ['PubChem', 'SaibaTudo Química (este aplicativo)'], dataPacote: '28/10/2026' },
};

test('escaparHtml: &, < e >', () => assert.equal(escaparHtml('a<b>&c'), 'a&lt;b&gt;&amp;c'));

test('paraTelegramHtml: título em negrito, kv e lista como texto, aviso com ⚠️, HTML escapado, rodapé em itálico no fim', () => {
  const partes = paraTelegramHtml(R);
  assert.equal(partes.length, 1);
  const h = partes[0];
  assert.ok(h.startsWith('<b>Massa molar de água (H₂O)</b>'));
  assert.ok(h.includes('Fórmula: H2O') && h.includes('Massa molar: 18,015 g/mol'));
  assert.ok(h.includes('• 2 × H = 2,016'));
  assert.ok(h.includes('⚠️ Valor a 25 °C &lt;ref&gt;'), 'HTML do conteúdo é escapado');
  assert.ok(h.trimEnd().endsWith('<i>Fontes: PubChem, SaibaTudo Química (este aplicativo) · Dados de 28/10/2026</i>'));
});

test('paraTextoSimples: mesmo conteúdo sem tags', () => {
  const t = paraTextoSimples(R);
  assert.ok(!/<[a-z]/.test(t));
  assert.ok(t.includes('Fontes: PubChem') && t.includes('Dados de 28/10/2026'));
  assert.equal(rodapeTexto({ origem: 'Qwen3-4B' }), 'Modelo: Qwen3-4B');
  assert.equal(rodapeTexto({}), '');
});

test('dividir e partes numeradas: nada acima de 4 000, corte em quebra de linha, rodapé só na última, tags inteiras', () => {
  const linhas = Array.from({ length: 400 }, (_, i) => `Linha ${i} com <b>texto</b> suficiente para encher a mensagem do Telegram.`);
  const partes = dividir(linhas.join('\n'));
  assert.ok(partes.length >= 2);
  for (const p of partes) { assert.ok(p.length <= LIMITE_TELEGRAM); assert.equal((p.match(/<b>/g) ?? []).length, (p.match(/<\/b>/g) ?? []).length, 'tags inteiras'); }
  assert.equal(partes.join('\n'), linhas.join('\n'), 'nada se perde');
  const grande = { titulo: 'Fontes', blocos: [{ tipo: 'lista', titulo: null, itens: Array.from({ length: 300 }, (_, i) => `Fonte número ${i} com licença CC BY-SA 4.0 e endereço longo`) }], rodape: { dataPacote: '28/10/2026' } };
  const html = paraTelegramHtml(grande);
  assert.ok(html.length >= 2);
  assert.ok(html[0].startsWith('(1/') && html.at(-1).startsWith(`(${html.length}/${html.length}) `));
  assert.ok(html.at(-1).includes('Dados de 28/10/2026') && !html[0].includes('Dados de'), 'rodapé só na última');
  for (const p of html) assert.ok(p.length <= LIMITE_TELEGRAM);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_formato.test.mjs`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Exportar `textoDoBloco` e implementar `api/_lib/bot/formato.js`**

Em `answers.js:50` só acrescente `export`. No formato: corpo = `[tituloHtml, ...blocos.map(blocoHtml)].filter(Boolean).join('\n\n')`; `blocoHtml` escapa `textoDoBloco(b)` e aplica o prefixo/tag do tipo. Divisão: quebra o **corpo** com `dividir(corpo, LIMITE_TELEGRAM - 12)` (reserva para o prefixo `(i/n) `), depois anexa o rodapé à última parte; se passar do limite, o rodapé vira parte própria. Em `dividir`, para não cortar tag: se a posição de corte cair entre `<` e o próximo `>`, recue até antes do `<`.

- [ ] **Step 4: Rodar e ver passar; rodar a suíte do site (o export não quebra nada)**

Run: `cd apps/quimica/api && node --test test/bot_formato.test.mjs && cd ../web && npm test`
Expected: PASS; suíte do site verde (mesma contagem de antes).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/web/src/quimica/js/answers.js apps/quimica/api/_lib/bot/formato.js apps/quimica/api/test/bot_formato.test.mjs
git commit -m "feat(quimica): bot formatter (Telegram HTML, 4000-char parts, footer with sources and package date)"
```

---

### Task 4: Núcleo (`api/_lib/bot/nucleo.js`)

**Files:**
- Create: `apps/quimica/api/_lib/bot/nucleo.js`
- Test: `apps/quimica/api/test/bot_nucleo.test.mjs`

**Interfaces:**
- Consumes: `Engine` (`new Engine({ store })`, `await engine.responder(texto)` → `{ intent, resolvida, titulo, blocos, directAnswer, fontes:[{nome}], sugestoes, parsed }`, `engine._ultimoContexto`, `engine._ultimaInterpretacao`, `engine.limparContexto()`), `SEM_NUVEM` de `web/src/quimica/js/nuvem.js`, `SUGESTOES_PADRAO`, `dataDoPacote` de `answers.js`, `t`, `tl` de `i18n/index.js`; `readConfig`, `askAtivo` de `api/_lib/config.js`; `chamarAsk`, `createAskState` de `api/_lib/ask-handler.js`; `cleanText`, `MAX_Q`, `MAX_ASK_CONTEXT`, `MAX_TRECHOS`, `MAX_TRECHO_TEXTO`, `MAX_TRECHOS_TOTAL` de `api/_lib/validate.js`; `criarConversas` (Task 2); `store.indiceDeTextos()`, `store.carregar(caminho)`, `store.versao`, `store.sig.estado`, `store.elementos`, `store.indice.entradas`, `store.fontes`.
- Produces:
  - `export const COMANDOS = ['/start', '/ajuda', '/limpar', '/sobre']`
  - `export const ACAO_EXPLICAR = 'explicar'`, `ACAO_SUGESTOES = 'sugestoes'`, `PREFIXO_SUGESTAO = 'sug:'`
  - `export const TEXTOS` (pt-BR, objeto congelado) com as chaves e valores exatos:
    - `start`: `'Olá! Eu sou o SaibaTudo Química em teste interno. Pergunte sobre elementos, compostos, cálculos e segurança química: as respostas vêm do pacote de dados assinado do app, e a IA na nuvem só entra quando você toca em "Explicar com IA". Comandos: /ajuda, /sobre, /limpar.'`
    - `limpar`: `'Contexto da conversa apagado.'`
    - `semResposta`: `'Não há resposta recente para explicar. Faça uma pergunta primeiro.'`
    - `limite`: `'Muitas mensagens em pouco tempo. Aguarde um minuto e tente de novo.'`
    - `dados`: `'Dados indisponíveis no momento. Tente de novo em alguns minutos.'`
    - `gerando`: `'Gerando a explicação…'`
    - `explicarRotulo`: `'Explicar com IA'`, `sugestoesRotulo`: `'Sugestões'`, `sugestoesTitulo`: `'Sugestões de perguntas'`
    - `tituloIa`: `'Explicação gerada por IA'`
    - `avisoIa`: `'Texto gerado por IA ({modelo}); pode conter erros. Os números que valem são os da resposta anterior, montada dos dados.'`
    - `falhaIa`: `{ disabled: 'A IA na nuvem está desligada no momento.', budget: 'A cota diária da IA na nuvem acabou. A resposta anterior continua valendo.', rejected: 'A IA gerou um texto que não passou na verificação do servidor; a resposta anterior continua valendo.', timeout: 'A IA na nuvem demorou demais. Tente de novo em instantes.', upstream: 'A IA na nuvem está indisponível agora. Tente de novo em instantes.', auth: 'A IA na nuvem recusou a credencial do servidor; avise o mantenedor.', bad_output: 'A IA na nuvem devolveu uma resposta inválida. Tente de novo em instantes.' }`
  - `export function lerConfigBot(env)` → `{ ativo: env.BOT_ENABLED?.trim() === '1', ratePorMin: inteiro(BOT_RATE_POR_MIN, 10, 1, 1000), ratePorDia: inteiro(BOT_RATE_POR_DIA, 200, 1, 100000) }`
  - `export async function trechosPara(store, parsed, { max = MAX_TRECHOS } = {})` → `Promise<{id, texto}[]>`: do `indiceDeTextos()`, trechos cujo `entidades.elementos` inclui `parsed.elemento` ou `entidades.compostos` inclui `parsed.composto`; ordem: lotes com `idioma` `'pt'`/`'pt-BR'` primeiro, depois `'en'`, depois os outros; carrega cada lote necessário com `store.carregar(lote.caminho)` e pega `textoPt ?? textoOriginal`; sem entidade ou sem índice → `[]`.
  - `export function montarPedidoAsk(ultima, trechos)` → `{ q, context, trechos }`: `q = cleanText(ultima.q).slice(0, MAX_Q)`; `context = cleanText('Dados do app: ' + ultima.directAnswer).slice(0, MAX_ASK_CONTEXT)`; `trechos` até `MAX_TRECHOS`, cada `texto` `cleanText(...).slice(0, MAX_TRECHO_TEXTO)`, soma ≤ `MAX_TRECHOS_TOTAL` (para de acrescentar quando estourar).
  - `export function criarNucleo({ obterStore, env = () => process.env, agora = () => Date.now(), fetchFn = (...a) => globalThis.fetch(...a), log = () => {}, autorizado, conversas = criarConversas({ now: agora }), estadoAsk = createAskState({ now: agora }) })` → `{ processar(msg: MensagemInterna): Promise<Saida> }`.
    - `autorizado: (msg) => boolean` (o canal decide com a sua lista).
    - Ordem em `processar`: não autorizado → `{ silencio:true, motivo:'nao_autorizado' }`; `await conversas.jaVisto(msg.eventoId)` → `{ silencio:true, motivo:'duplicado' }`; `limiteExcedido` → resposta `TEXTOS.limite`, `motivo:'limite'`; `obterStore()` rejeitou → resposta `TEXTOS.dados`, `motivo:'dados'`; depois despacho por `acao`/comando/texto.
    - Despacho: `acao === ACAO_EXPLICAR` → explicar; `acao === ACAO_SUGESTOES` → resposta `{ titulo: TEXTOS.sugestoesTitulo, blocos: [lista das sugestões do contexto ou SUGESTOES_PADRAO] }` com até 4 botões `{ rotulo: sugestão, acao: 'sug:<i>' }`; `acao` `sug:<i>` com índice válido → trata como texto `sugestoes[i]`; `acao` desconhecida ou índice inválido → `{ silencio:true, motivo:'acao_invalida' }`; texto começando com `/` → comando (desconhecido = `/ajuda`); texto → pergunta (cortada em `MAX_Q`; vazia após `cleanText` → `/ajuda`).
    - Pergunta: um `Engine` por núcleo (criado na 1ª vez que o store resolve); fila `_fila` (promessa encadeada) para serializar; antes: `engine._ultimoContexto = ctx?.ultimoContexto ?? null`, `engine._ultimaInterpretacao = ctx?.ultimaInterpretacao ?? null`; `r = await engine.responder(texto)`; depois: se `r.resolvida && !SEM_NUVEM.has(r.intent)` → `conversas.guardar(conversaId, { ultimoContexto: engine._ultimoContexto, ultimaInterpretacao: engine._ultimaInterpretacao, ultima: { q: texto, directAnswer: r.directAnswer, parsed: { intent: r.parsed.intent, elemento: r.parsed.elemento ?? null, composto: r.parsed.composto ?? null } }, sugestoes: r.sugestoes })`; se `!r.resolvida` → guarda só `sugestoes` (mantendo o resto do ctx anterior); `RECUSA_PERIGO` → não toca no contexto. `Saida`: `{ resposta: { titulo: r.titulo, blocos: r.blocos, rodape: { fontes: nomes únicos de r.fontes, dataPacote: dataDoPacote(store) } }, botoes, interpretacao: { intent, elemento, composto } }`; botões: resolvida e `askAtivo(readConfig(env()))` e `!SEM_NUVEM.has(intent)` → `[{ rotulo: TEXTOS.explicarRotulo, acao: ACAO_EXPLICAR }]`; resolvida com sugestões → `+ [{ rotulo: TEXTOS.sugestoesRotulo, acao: ACAO_SUGESTOES }]`; não resolvida → até 4 botões `sug:<i>`.
    - Comandos: `/start` → `{ titulo: t('respostas.ajuda.titulo'), blocos: [{tipo:'texto', texto: TEXTOS.start}] }` + botão Sugestões; `/ajuda` → `{ titulo: t('respostas.ajuda.titulo'), blocos: [texto t('respostas.ajuda.texto'), lista(t('respostas.ajuda.podePerguntar'), tl('respostas.ajuda.itens')), aviso t('respostas.ajuda.aviso')] }` + botão Sugestões; `/sobre` → `{ titulo: t('respostas.sobreDados.titulo'), blocos: [kv com t('respostas.sobreDados.versao')=store.versao, t('respostas.sobreDados.geradoEm')=dataDoPacote(store), t('respostas.sobreDados.assinatura')=t('respostas.sobreDados.sig.'+store.sig.estado), t('respostas.sobreDados.elementos')=store.elementos.length, t('respostas.sobreDados.compostos')=store.indice.entradas.length, lista(t('respostas.fontesResp.titulo'), nomes das 12 primeiras fontes de store.fontes)] }`; `/limpar` → `conversas.apagar` + `engine.limparContexto()` + `{ blocos:[texto TEXTOS.limpar] }`. Nos comandos, `conversas.guardar` recebe `sugestoes: SUGESTOES_PADRAO` (mantendo o resto).
    - Explicar: `cfg = readConfig(env())`; `!askAtivo(cfg)` → `falhaIa.disabled`, `motivo:'ia_disabled'`; `ctx?.ultima` ausente → `TEXTOS.semResposta`, `motivo:'sem_resposta'`; `trechos = await trechosPara(store, ultima.parsed)`; `dados = montarPedidoAsk(ultima, trechos)`; `r = await chamarAsk(cfg, dados, { doFetch: fetchFn, now: agora, state: estadoAsk })`; ok → `{ resposta: { titulo: TEXTOS.tituloIa, blocos: [texto r.answer, aviso TEXTOS.avisoIa com {modelo: r.model}], rodape: { origem: r.model } }, botoes: [] }`; falha → `{ resposta: { blocos: [texto TEXTOS.falhaIa[r.kind] ?? TEXTOS.falhaIa.upstream] }, botoes: [], motivo: 'ia_' + r.kind }`.
    - `log` recebe só `{ evt:'bot_nucleo', motivo, ms }`.

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_nucleo.test.mjs — núcleo sobre o pacote de TESTE (fixture: 14 elementos, 15 compostos, 2 trechos em inglês)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAskState } from '../_lib/ask-handler.js';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { criarConversas } from '../_lib/bot/conversas.js';
import { ACAO_EXPLICAR, ACAO_SUGESTOES, TEXTOS, criarNucleo, lerConfigBot, montarPedidoAsk, trechosPara } from '../_lib/bot/nucleo.js';
import { MAX_Q } from '../_lib/validate.js';
import { relogio } from './_helpers.mjs';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);
const HF = 'https://exemplo-saibatudo-quimica.hf.space';
const ENV_IA = { BOT_ENABLED: '1', ASK_ENABLED: '1', HF_ASK_SPACE_URL: HF, HF_TOKEN: 'hf_segredo' };
const ENV_SEM_IA = { BOT_ENABLED: '1' };
let n = 0;
const msg = (texto, extra = {}) => ({ canal: 'telegram', remetenteId: '1', conversaId: extra.conversaId ?? `c${++n}`, texto, acao: null, idioma: 'pt-BR', eventoId: `tg:${++n}`, callbackId: null, ...extra });

function montar({ env = ENV_SEM_IA, hf = null, autorizado = () => true } = {}) {
  const now = relogio();
  const chamadas = [];
  const fetchFn = async (url, init) => {
    chamadas.push({ url: String(url), init });
    if (init?.method === 'POST') return new Response(JSON.stringify({ event_id: 'ev1' }), { status: 200 });
    return hf ? hf() : new Response('event: error\ndata: null\n\n', { status: 200 });
  };
  const eventos = [];
  const nucleo = criarNucleo({ obterStore: () => storeDoDisco({ dir: FIXTURE }), env: () => env, agora: now, fetchFn, log: (e) => eventos.push(e), autorizado, conversas: criarConversas({ now }), estadoAsk: createAskState({ now }) });
  return { nucleo, chamadas, eventos, now };
}

test('lerConfigBot: BOT_ENABLED só com "1"; limites com padrão 10/200 e faixas', () => {
  assert.equal(lerConfigBot({}).ativo, false);
  assert.equal(lerConfigBot({ BOT_ENABLED: '1' }).ativo, true);
  assert.deepEqual(lerConfigBot({ BOT_ENABLED: 'true' }).ativo, false);
  assert.equal(lerConfigBot({}).ratePorMin, 10);
  assert.equal(lerConfigBot({}).ratePorDia, 200);
  assert.equal(lerConfigBot({ BOT_RATE_POR_MIN: '0' }).ratePorMin, 1);
});

test('não autorizado e evento repetido: silêncio com motivo; nada chega ao motor', async () => {
  const { nucleo } = montar({ autorizado: (m) => m.remetenteId === '1' });
  assert.deepEqual(await nucleo.processar(msg('massa molar da água', { remetenteId: '2' })), { silencio: true, motivo: 'nao_autorizado' });
  const m = msg('massa molar da água');
  assert.equal((await nucleo.processar(m)).silencio, undefined);
  assert.deepEqual(await nucleo.processar(m), { silencio: true, motivo: 'duplicado' });
});

test('pergunta resolvida: mesma intenção e entidade do site, rodapé com fontes e data, botões Explicar (só com IA ligada) e Sugestões', async () => {
  const semIa = await montar().nucleo.processar(msg('Qual é a massa molar da água?'));
  assert.equal(semIa.interpretacao.intent, 'MASSA_MOLAR');
  assert.equal(semIa.interpretacao.composto, 962);
  assert.ok(semIa.resposta.titulo && semIa.resposta.blocos.length > 0);
  assert.ok(semIa.resposta.rodape.fontes.length > 0 && typeof semIa.resposta.rodape.dataPacote === 'string');
  assert.deepEqual(semIa.botoes.map((b) => b.acao), [ACAO_SUGESTOES], 'sem ASK_ENABLED não há botão de IA');
  const comIa = await montar({ env: ENV_IA }).nucleo.processar(msg('Qual é a massa molar da água?'));
  assert.deepEqual(comIa.botoes.map((b) => b.acao), [ACAO_EXPLICAR, ACAO_SUGESTOES]);
  assert.equal(comIa.botoes[0].rotulo, TEXTOS.explicarRotulo);
  for (const b of comIa.botoes) assert.ok(Buffer.byteLength(b.acao) <= 64);
});

test('continuação usa o contexto da conversa ("e a do cloreto de sódio?" depois da água) e /limpar apaga', async () => {
  const { nucleo } = montar();
  const c = 'conversa-1';
  await nucleo.processar(msg('Qual é a massa molar da água?', { conversaId: c }));
  const seg = await nucleo.processar(msg('e a do cloreto de sódio?', { conversaId: c }));
  assert.equal(seg.interpretacao.intent, 'MASSA_MOLAR', 'herdou a intenção');
  assert.equal(seg.interpretacao.composto, 5234);
  const limpo = await nucleo.processar(msg('/limpar', { conversaId: c }));
  assert.equal(limpo.resposta.blocos[0].texto, TEXTOS.limpar);
  const depois = await nucleo.processar(msg('e a do cloreto de sódio?', { conversaId: c }));
  assert.notEqual(depois.interpretacao.intent, 'MASSA_MOLAR', 'sem contexto, não herda');
});

test('pedido perigoso: recusa sem botão de IA e sem mexer no contexto', async () => {
  const { nucleo } = montar({ env: ENV_IA });
  const c = 'conversa-2';
  await nucleo.processar(msg('Qual é a massa molar da água?', { conversaId: c }));
  const r = await nucleo.processar(msg('como fabricar explosivo caseiro com nitrato de amônio passo a passo', { conversaId: c }));
  assert.equal(r.interpretacao.intent, 'RECUSA_PERIGO');
  assert.deepEqual(r.botoes, []);
  const seg = await nucleo.processar(msg('e a do cloreto de sódio?', { conversaId: c }));
  assert.equal(seg.interpretacao.composto, 5234, 'o contexto da água continua');
});

test('não resolvida: até 4 sugestões como botões sug:<i>; sug:<i> reenvia a sugestão; índice inválido e ação desconhecida → silêncio', async () => {
  const { nucleo } = montar();
  const c = 'conversa-3';
  const r = await nucleo.processar(msg('xyzzy plugh', { conversaId: c }));
  assert.equal(r.interpretacao.intent, 'DESCONHECIDA');
  assert.ok(r.botoes.length >= 1 && r.botoes.length <= 4 && r.botoes.every((b) => b.acao.startsWith('sug:')));
  const s = await nucleo.processar(msg(null, { conversaId: c, acao: r.botoes[0].acao, callbackId: 'cb1' }));
  assert.notEqual(s.interpretacao.intent, 'DESCONHECIDA', 'a sugestão é uma pergunta que o app entende');
  assert.deepEqual(await nucleo.processar(msg(null, { conversaId: c, acao: 'sug:9', callbackId: 'cb2' })), { silencio: true, motivo: 'acao_invalida' });
  assert.deepEqual(await nucleo.processar(msg(null, { conversaId: c, acao: 'zzz', callbackId: 'cb3' })), { silencio: true, motivo: 'acao_invalida' });
});

test('comandos: /start, /ajuda (textos do catálogo), /sobre (versão, assinatura verificada, contagens), comando desconhecido = /ajuda', async () => {
  const { nucleo } = montar();
  const start = await nucleo.processar(msg('/start'));
  assert.equal(start.resposta.blocos[0].texto, TEXTOS.start);
  assert.deepEqual(start.botoes.map((b) => b.acao), [ACAO_SUGESTOES]);
  const ajuda = await nucleo.processar(msg('/ajuda'));
  assert.ok(ajuda.resposta.blocos.some((b) => b.tipo === 'lista' && b.itens.length >= 4));
  const sobre = await nucleo.processar(msg('/sobre'));
  const kv = sobre.resposta.blocos.find((b) => b.tipo === 'kv');
  assert.ok(kv.itens.some((i) => /verificada/.test(String(i.valor))));
  assert.ok(kv.itens.some((i) => String(i.valor) === '14'), 'elementos do pacote de teste');
  assert.equal((await nucleo.processar(msg('/xpto'))).resposta.titulo, ajuda.resposta.titulo);
  const sug = await nucleo.processar(msg(null, { acao: ACAO_SUGESTOES, callbackId: 'cb' }));
  assert.equal(sug.resposta.titulo, TEXTOS.sugestoesTitulo);
  assert.equal(sug.botoes.length, 4);
});

test('pergunta longa é cortada em MAX_Q sem erro; texto vazio vira /ajuda', async () => {
  const { nucleo } = montar();
  const r = await nucleo.processar(msg('massa molar da água ' + 'x'.repeat(2000)));
  assert.ok(r.resposta && !r.silencio);
  assert.ok(montarPedidoAsk({ q: 'a'.repeat(500), directAnswer: '' }, []).q.length <= MAX_Q);
  assert.equal((await nucleo.processar(msg('   '))).resposta.titulo, (await nucleo.processar(msg('/ajuda'))).resposta.titulo);
});

test('trechosPara e montarPedidoAsk: oxigênio traz o trecho em inglês do pacote de teste; limites respeitados', async () => {
  const store = await storeDoDisco({ dir: FIXTURE });
  const tr = await trechosPara(store, { intent: 'ELEMENTO', elemento: 'O', composto: null });
  assert.deepEqual(tr.map((t) => t.id), ['wikipedia-en-oxygen-001']);
  assert.ok(tr[0].texto.length > 20 && tr[0].texto.length <= 1200);
  assert.deepEqual(await trechosPara(store, { intent: 'MASSA_MOLAR', elemento: null, composto: 962 }), []);
  const p = montarPedidoAsk({ q: 'Fale sobre o oxigênio', directAnswer: 'Oxigênio (O), elemento 8\nMassa atômica: 15,999 u' }, tr);
  assert.equal(p.q, 'Fale sobre o oxigênio');
  assert.ok(p.context.startsWith('Dados do app: Oxigênio (O), elemento 8'));
  assert.equal(p.trechos.length, 1);
});

test('Explicar com IA: sem resposta recente → aviso; com resposta → chamarAsk com q/context/trechos e sem iid; sucesso vira texto + aviso do modelo; cota/recusa/fora viram o motivo', async () => {
  const BOA = 'O oxigênio é o elemento 8 e sua massa atômica é 15,999 u.';
  const sse = (obj) => new Response(`event: complete\ndata: ${JSON.stringify([obj])}\n\n`, { status: 200 });
  const { nucleo, chamadas } = montar({ env: ENV_IA, hf: () => sse({ ok: true, answer: BOA, model: 'Qwen3-4B' }) });
  const c = 'conversa-ia';
  const vazio = await nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(vazio.resposta.blocos[0].texto, TEXTOS.semResposta);
  await nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  const ex = await nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(ex.resposta.titulo, TEXTOS.tituloIa);
  assert.equal(ex.resposta.blocos[0].texto, BOA);
  assert.ok(ex.resposta.blocos[1].tipo === 'aviso' && ex.resposta.blocos[1].texto.includes('Qwen3-4B'));
  const corpo = JSON.parse(chamadas.find((x) => x.init?.method === 'POST').init.body);
  assert.equal(corpo.data[0], 'Fale sobre o oxigênio');
  assert.ok(corpo.data[1].startsWith('Dados do app:'));
  assert.ok(JSON.parse(corpo.data[2])[0].id === 'wikipedia-en-oxygen-001');
  assert.ok(!JSON.stringify(corpo).includes('"iid"'));

  const fora = montar({ env: ENV_IA });
  await fora.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  const f = await fora.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }));
  assert.equal(f.motivo, 'ia_upstream');
  assert.equal(f.resposta.blocos[0].texto, TEXTOS.falhaIa.upstream);

  const desligada = montar({ env: ENV_SEM_IA });
  await desligada.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  assert.equal((await desligada.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }))).motivo, 'ia_disabled');

  const cota = montar({ env: { ...ENV_IA, HF_ASK_DAILY_BUDGET: '0' } });
  await cota.nucleo.processar(msg('Fale sobre o oxigênio', { conversaId: c }));
  assert.equal((await cota.nucleo.processar(msg(null, { conversaId: c, acao: ACAO_EXPLICAR, callbackId: 'cb' }))).motivo, 'ia_budget');
});

test('limite por conversa: a 11ª mensagem no minuto recebe o aviso de limite', async () => {
  const { nucleo } = montar();
  const c = 'conversa-limite';
  for (let i = 0; i < 10; i++) await nucleo.processar(msg('/ajuda', { conversaId: c }));
  const r = await nucleo.processar(msg('/ajuda', { conversaId: c }));
  assert.equal(r.motivo, 'limite');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.limite);
});

test('pacote indisponível: resposta "dados indisponíveis", motivo dados, sem lançar', async () => {
  const nucleo = criarNucleo({ obterStore: () => Promise.reject(new Error('x')), env: () => ENV_SEM_IA, autorizado: () => true });
  const r = await nucleo.processar(msg('/ajuda'));
  assert.equal(r.motivo, 'dados');
  assert.equal(r.resposta.blocos[0].texto, TEXTOS.dados);
});

test('log do núcleo nunca contém texto de pergunta, resposta nem id', async () => {
  const { nucleo, eventos } = montar();
  await nucleo.processar(msg('Qual é a massa molar da água?', { remetenteId: '827000000', conversaId: '827000000' }));
  const s = JSON.stringify(eventos);
  assert.ok(!s.includes('massa molar') && !s.includes('827000000') && !s.includes('18,015'));
});
```

Ajustes permitidos ao escrever o teste: se a fixture não entender "e a do cloreto de sódio?" como continuação, use "e a do NaCl?"; se o pedido perigoso do teste não for recusado pela regra, use um caso de `contracts/seguranca_cases.json` marcado como recusa. O CID de NaCl na fixture é 5234 (confira em `web/test/fixtures/data-quimica/compostos/index.json`, lista `nomes`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_nucleo.test.mjs`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implementar `api/_lib/bot/nucleo.js`**

Imports relativos: `../../../web/src/quimica/js/engine.js`, `.../nuvem.js` (`SEM_NUVEM`), `.../answers.js` (`SUGESTOES_PADRAO`, `dataDoPacote`), `.../i18n/index.js` (`t`, `tl`). Função auxiliar `inteiro(valor, padrao, min, max)` igual à de `config.js` (copiar as 5 linhas; não exportar de lá). Blocos montados com objetos literais `{ tipo:'texto', texto }`, `{ tipo:'aviso', texto }`, `{ tipo:'lista', titulo, itens }`, `{ tipo:'kv', titulo:null, itens:[{rotulo, valor}] }`. Em `trechosPara`, `entidades.compostos` são números: compare com `Number(parsed.composto)`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/quimica/api && node --test test/bot_nucleo.test.mjs`
Expected: PASS (13 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/_lib/bot/nucleo.js apps/quimica/api/test/bot_nucleo.test.mjs
git commit -m "feat(quimica): bot core — authorization, commands, site engine with conversation context, cloud explanation on demand"
```

---

### Task 5: Adaptador do Telegram (`api/_lib/bot/telegram.js`)

**Files:**
- Create: `apps/quimica/api/_lib/bot/telegram.js`
- Test: `apps/quimica/api/test/bot_telegram.test.mjs`

**Interfaces:**
- Consumes: `timingSafeEqual` de `node:crypto`; `fetch` injetado.
- Produces:
  - `export const API_TELEGRAM = 'https://api.telegram.org'`
  - `export const CABECALHO_SEGREDO = 'x-telegram-bot-api-secret-token'`
  - `export function lerConfigTelegram(env)` → `{ token: string, segredo: string, ids: Set<string> }` (`BOT_TELEGRAM_TOKEN`, `BOT_TELEGRAM_SECRET`, `BOT_TELEGRAM_IDS` separados por vírgula, `trim`, vazios fora).
  - `export function verificarSegredo(request, segredo)` → `boolean`: `false` se `segredo` vazio ou cabeçalho ausente; comparação em tempo constante (buffers de tamanho igual; tamanhos diferentes → `false`).
  - `export function lerUpdate(update)` → `MensagemInterna | null`: `message` com `text` (string) em `chat.type === 'private'` → `{ canal:'telegram', remetenteId:String(from.id), conversaId:String(chat.id), texto, acao:null, idioma: from.language_code ?? 'pt-BR', eventoId:'tg:'+update_id, callbackId:null }`; `callback_query` com `data` e `message.chat` → `{ ..., texto:null, acao:data, remetenteId:String(callback_query.from.id), conversaId:String(callback_query.message.chat.id), callbackId:callback_query.id }`; qualquer outra coisa (foto, sticker, `edited_message`, grupo, sem `update_id`) → `null`.
  - `export function tecladoInline(botoes)` → `{ inline_keyboard: botoes.map((b) => [{ text: b.rotulo, callback_data: b.acao }]) }` (um botão por linha) ou `undefined` sem botões.
  - `export function criarClienteTelegram({ token, fetchFn = (...a) => globalThis.fetch(...a), esperar = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} })` → `{ enviar(chatId, html, { botoes = [] } = {}): Promise<boolean>, responderCallback(callbackId, texto = ''): Promise<boolean> }`: `POST ${API_TELEGRAM}/bot${token}/sendMessage` com `{ chat_id, text, parse_mode:'HTML', disable_web_page_preview:true, reply_markup? }`; resposta não-ok ou exceção → **1** retentativa após `esperar(500)`; falhando de novo → `log({ evt:'bot_envio_falhou', status })` e `false`. `answerCallbackQuery` com `{ callback_query_id, text }`, sem retentativa. Nunca lança; nunca loga a URL (contém o token).

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_telegram.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { API_TELEGRAM, CABECALHO_SEGREDO, criarClienteTelegram, lerConfigTelegram, lerUpdate, tecladoInline, verificarSegredo } from '../_lib/bot/telegram.js';
import { mkRequest } from './_helpers.mjs';

const UPDATE_TEXTO = { update_id: 10, message: { message_id: 1, from: { id: 827000000, is_bot: false, language_code: 'pt-br' }, chat: { id: 827000000, type: 'private' }, date: 1, text: 'massa molar da água' } };
const UPDATE_CALLBACK = { update_id: 11, callback_query: { id: 'cb77', from: { id: 827000000 }, message: { message_id: 2, chat: { id: 827000000, type: 'private' } }, data: 'explicar' } };

test('lerConfigTelegram: ids por vírgula, trim, vazios fora', () => {
  const c = lerConfigTelegram({ BOT_TELEGRAM_TOKEN: ' 123:abc ', BOT_TELEGRAM_SECRET: 's', BOT_TELEGRAM_IDS: ' 1, 2 ,,3 ' });
  assert.equal(c.token, '123:abc');
  assert.deepEqual([...c.ids], ['1', '2', '3']);
  assert.deepEqual([...lerConfigTelegram({}).ids], []);
});

test('verificarSegredo: igual → true; diferente, ausente, segredo vazio → false', () => {
  const req = (v) => mkRequest({ url: 'https://saibatudo.net/quimica/api/bot/telegram', headers: v === undefined ? {} : { [CABECALHO_SEGREDO]: v }, json: {} });
  assert.equal(verificarSegredo(req('abc'), 'abc'), true);
  assert.equal(verificarSegredo(req('abd'), 'abc'), false);
  assert.equal(verificarSegredo(req('ab'), 'abc'), false);
  assert.equal(verificarSegredo(req(), 'abc'), false);
  assert.equal(verificarSegredo(req(''), ''), false, 'segredo vazio nunca autoriza');
});

test('lerUpdate: texto privado e callback viram MensagemInterna; foto, edited_message, grupo e lixo viram null', () => {
  assert.deepEqual(lerUpdate(UPDATE_TEXTO), { canal: 'telegram', remetenteId: '827000000', conversaId: '827000000', texto: 'massa molar da água', acao: null, idioma: 'pt-br', eventoId: 'tg:10', callbackId: null });
  const cb = lerUpdate(UPDATE_CALLBACK);
  assert.equal(cb.acao, 'explicar');
  assert.equal(cb.texto, null);
  assert.equal(cb.callbackId, 'cb77');
  assert.equal(cb.eventoId, 'tg:11');
  assert.equal(lerUpdate({ update_id: 12, message: { from: { id: 1 }, chat: { id: 1, type: 'private' }, photo: [{}] } }), null);
  assert.equal(lerUpdate({ update_id: 13, edited_message: { ...UPDATE_TEXTO.message } }), null);
  assert.equal(lerUpdate({ update_id: 14, message: { ...UPDATE_TEXTO.message, chat: { id: -5, type: 'group' } } }), null);
  assert.equal(lerUpdate({ message: UPDATE_TEXTO.message }), null, 'sem update_id');
  assert.equal(lerUpdate(null), null);
  assert.equal(lerUpdate('x'), null);
});

test('tecladoInline: um botão por linha; sem botões → undefined', () => {
  assert.deepEqual(tecladoInline([{ rotulo: 'A', acao: 'a' }, { rotulo: 'B', acao: 'b' }]), { inline_keyboard: [[{ text: 'A', callback_data: 'a' }], [{ text: 'B', callback_data: 'b' }]] });
  assert.equal(tecladoInline([]), undefined);
});

test('enviar: sendMessage em HTML com teclado; falha → 1 retentativa após 500 ms; duas falhas → false e log sem URL', async () => {
  const chamadas = [];
  let falhas = 0;
  const esperas = [];
  const eventos = [];
  const fetchFn = async (url, init) => { chamadas.push({ url: String(url), body: JSON.parse(init.body) }); if (falhas-- > 0) return new Response('x', { status: 502 }); return new Response('{"ok":true}', { status: 200 }); };
  const cli = criarClienteTelegram({ token: '123:abc', fetchFn, esperar: async (ms) => { esperas.push(ms); }, log: (e) => eventos.push(e) });
  assert.equal(await cli.enviar(827000000, '<b>oi</b>', { botoes: [{ rotulo: 'Explicar com IA', acao: 'explicar' }] }), true);
  assert.equal(chamadas[0].url, `${API_TELEGRAM}/bot123:abc/sendMessage`);
  assert.deepEqual(chamadas[0].body, { chat_id: 827000000, text: '<b>oi</b>', parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: 'Explicar com IA', callback_data: 'explicar' }]] } });
  await cli.enviar(1, 'x');
  assert.ok(!('reply_markup' in chamadas.at(-1).body), 'sem botões não há reply_markup');
  falhas = 1;
  assert.equal(await cli.enviar(1, 'y'), true);
  assert.deepEqual(esperas, [500]);
  falhas = 2;
  assert.equal(await cli.enviar(1, 'z'), false);
  assert.equal(eventos.at(-1).evt, 'bot_envio_falhou');
  assert.ok(!JSON.stringify(eventos).includes('123:abc'), 'o token nunca vai ao log');
  const lanca = criarClienteTelegram({ token: 't', fetchFn: async () => { throw new Error('rede'); }, esperar: async () => {}, log: () => {} });
  assert.equal(await lanca.enviar(1, 'w'), false, 'exceção não propaga');
});

test('responderCallback: answerCallbackQuery com texto; falha → false sem lançar', async () => {
  const chamadas = [];
  const cli = criarClienteTelegram({ token: 't', fetchFn: async (url, init) => { chamadas.push({ url: String(url), body: JSON.parse(init.body) }); return new Response('{"ok":true}', { status: 200 }); } });
  assert.equal(await cli.responderCallback('cb77', 'Gerando a explicação…'), true);
  assert.equal(chamadas[0].url, `${API_TELEGRAM}/bott/answerCallbackQuery`);
  assert.deepEqual(chamadas[0].body, { callback_query_id: 'cb77', text: 'Gerando a explicação…' });
  const ruim = criarClienteTelegram({ token: 't', fetchFn: async () => new Response('x', { status: 400 }) });
  assert.equal(await ruim.responderCallback('cb', ''), false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_telegram.test.mjs`
Expected: FAIL (módulo ausente).

- [ ] **Step 3: Implementar `api/_lib/bot/telegram.js`**

`verificarSegredo`: `const a = Buffer.from(recebido), b = Buffer.from(segredo); return a.length === b.length && timingSafeEqual(a, b)`. `enviar` monta o corpo uma vez e tenta até 2 vezes (`for (let tentativa = 0; tentativa < 2; tentativa++)`), com `await esperar(500)` entre elas.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/quimica/api && node --test test/bot_telegram.test.mjs`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/_lib/bot/telegram.js apps/quimica/api/test/bot_telegram.test.mjs
git commit -m "feat(quimica): Telegram adapter — webhook secret check, update parsing, sendMessage with inline keyboard and one retry"
```

---

### Task 6: Endpoint `api/bot/telegram.js`, `vercel.json` e teste do contrato

**Files:**
- Create: `apps/quimica/api/bot/telegram.js`
- Modify: `apps/quimica/vercel.json` (`functions`)
- Modify: `apps/quimica/web/test/build.test.mjs:261-268` (`deepEqual` de `vercel.functions`)
- Test: `apps/quimica/api/test/bot_endpoint.test.mjs`

**Interfaces:**
- Consumes: `json`, `readJsonBody`, `toNodeHandler` de `api/_lib/http.js`; `lerConfigBot`, `criarNucleo`, `TEXTOS`, `ACAO_EXPLICAR` (Task 4); `lerConfigTelegram`, `verificarSegredo`, `lerUpdate`, `criarClienteTelegram` (Task 5); `paraTelegramHtml` (Task 3); `storeDoDisco` (Task 1); `criarConversas` (Task 2); `createAskState`; `createSharedLimiter`.
- Produces:
  - `export const MAX_BODY_BOT = 65_536`
  - `export function logBot(evento)` — whitelist `{ evt, canal, status, ms, motivo }` em `console.log(JSON.stringify(...))`.
  - `export function createTelegramBotHandler(deps = {})` → `(request: Request) => Promise<Response>`; `deps: { env?, now?, fetch?, log?, nucleo?, obterStore?, conversas?, estadoAsk?, esperar? }`. Fluxo: método ≠ `POST` → `405` (`Allow: POST`); `!verificarSegredo(request, cfgTg.segredo)` → `401 { ok:false, error:'unauthorized' }`, `motivo:'auth_falhou'`; `!lerConfigBot(env).ativo` → `200 { ok:true }`, `motivo:'desligado'`; `readJsonBody(request, MAX_BODY_BOT)` inválido → `200 { ok:true }`, `motivo:'corpo_invalido'` (o Telegram não deve reenviar); `lerUpdate` `null` → `200`, `motivo:'ignorado'`; `callbackId` presente → `cliente.responderCallback(callbackId, acao === ACAO_EXPLICAR ? TEXTOS.gerando : '')` **antes** do núcleo; `saida = await nucleo.processar(msg)`; `silencio` → `200`, `motivo` da saída; senão `partes = paraTelegramHtml(saida.resposta)` e `enviar(conversaId, parte, { botoes: última ? saida.botoes : [] })` em ordem; algum `false` → `motivo:'envio_falhou'`; sempre `200 { ok:true }` no fim. Log único por requisição: `{ evt:'bot', canal:'telegram', status, ms, motivo }`.
  - `export const handle = createTelegramBotHandler()`; `export default toNodeHandler(handle, { maxBodyBytes: MAX_BODY_BOT })`; `export const config = { maxDuration: 60 }`.
  - Núcleo padrão (quando `deps.nucleo` ausente), criado **uma vez** por módulo/instância: `criarNucleo({ obterStore: () => storeDoDisco(), env, agora: now, fetchFn, log, autorizado: (m) => lerConfigTelegram(env()).ids.has(m.remetenteId), conversas: criarConversas({ shared: createSharedLimiter({ env, now }), now }), estadoAsk: createAskState({ now }) })`.
- `vercel.json`: `"api/bot/telegram.js": { "includeFiles": "data/quimica/**" }` acrescentado em `functions`.

- [ ] **Step 1: Escrever o teste do endpoint e atualizar o teste do `vercel.json`**

```js
// api/test/bot_endpoint.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_BODY_BOT, createTelegramBotHandler } from '../bot/telegram.js';
import { CABECALHO_SEGREDO } from '../_lib/bot/telegram.js';
import { TEXTOS } from '../_lib/bot/nucleo.js';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { capturarLog, mkRequest, relogio } from './_helpers.mjs';

const FIXTURE = new URL('../../web/test/fixtures/data-quimica/', import.meta.url);
const URL_BOT = 'https://saibatudo.net/quimica/api/bot/telegram';
const ENV = { BOT_ENABLED: '1', BOT_TELEGRAM_TOKEN: '123:abc', BOT_TELEGRAM_SECRET: 'segredo-ok', BOT_TELEGRAM_IDS: '827000000' };
let uid = 100;
const update = (texto, from = 827000000) => ({ update_id: ++uid, message: { message_id: uid, from: { id: from, is_bot: false }, chat: { id: from, type: 'private' }, date: 1, text: texto } });
const callback = (data, from = 827000000) => ({ update_id: ++uid, callback_query: { id: `cb${uid}`, from: { id: from }, message: { message_id: 1, chat: { id: from, type: 'private' } }, data } });

function montar({ env = ENV, hf = null } = {}) {
  const now = relogio();
  const telegram = [];
  const fetchFn = async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.telegram.org/')) { telegram.push({ metodo: u.split('/').at(-1), body: JSON.parse(init.body) }); return new Response('{"ok":true}', { status: 200 }); }
    if (init?.method === 'POST') return new Response(JSON.stringify({ event_id: 'ev1' }), { status: 200 });
    return hf ? hf() : new Response('event: error\ndata: null\n\n', { status: 200 });
  };
  const cap = capturarLog();
  const handler = createTelegramBotHandler({ env: () => env, now, fetch: fetchFn, log: cap.log, obterStore: () => storeDoDisco({ dir: FIXTURE }), esperar: async () => {} });
  return { handler, telegram, cap };
}
const post = (json, segredo = 'segredo-ok', headers = {}) => mkRequest({ url: URL_BOT, json, headers: { ...(segredo === null ? {} : { [CABECALHO_SEGREDO]: segredo }), ...headers } });

test('segredo errado ou ausente → 401 e nada enviado; GET → 405', async () => {
  const { handler, telegram, cap } = montar();
  assert.equal((await handler(post(update('oi'), 'errado'))).status, 401);
  assert.equal((await handler(post(update('oi'), null))).status, 401);
  assert.equal((await handler(mkRequest({ method: 'GET', url: URL_BOT }))).status, 405);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos[0].motivo, 'auth_falhou');
});

test('BOT_ENABLED vazio → 200 silencioso, nada enviado, motivo desligado', async () => {
  const { handler, telegram, cap } = montar({ env: { ...ENV, BOT_ENABLED: '' } });
  assert.equal((await handler(post(update('massa molar da água')))).status, 200);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos[0].motivo, 'desligado');
});

test('remetente fora da lista → 200 e nenhuma mensagem; corpo inválido e update sem texto → 200', async () => {
  const { handler, telegram, cap } = montar();
  assert.equal((await handler(post(update('massa molar da água', 999)))).status, 200);
  assert.equal(telegram.length, 0);
  assert.equal(cap.eventos.at(-1).motivo, 'nao_autorizado');
  assert.equal((await handler(mkRequest({ url: URL_BOT, body: '{nope', headers: { 'content-type': 'application/json', [CABECALHO_SEGREDO]: 'segredo-ok' } }))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'corpo_invalido');
  assert.equal((await handler(post({ update_id: 5, message: { from: { id: 827000000 }, chat: { id: 827000000, type: 'private' }, sticker: {} } }))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'ignorado');
  assert.equal(telegram.length, 0);
});

test('mensagem autorizada: sendMessage em HTML para o chat, com botões na última parte; update_id repetido → 200 sem reenviar', async () => {
  const { handler, telegram, cap } = montar();
  const u = update('Qual é a massa molar da água?');
  assert.equal((await handler(post(u))).status, 200);
  assert.equal(telegram.length, 1);
  assert.equal(telegram[0].metodo, 'sendMessage');
  assert.equal(telegram[0].body.chat_id, '827000000');
  assert.equal(telegram[0].body.parse_mode, 'HTML');
  assert.ok(telegram[0].body.text.includes('<b>'));
  assert.ok(telegram[0].body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'sugestoes'));
  assert.equal((await handler(post(u))).status, 200);
  assert.equal(telegram.length, 1, 'não reprocessou');
  assert.equal(cap.eventos.at(-1).motivo, 'duplicado');
});

test('callback Explicar: answerCallbackQuery imediato com "Gerando…", depois a explicação em mensagem nova', async () => {
  const BOA = 'A água é um composto cuja massa molar é 18,015 g/mol.';
  const env = { ...ENV, ASK_ENABLED: '1', HF_ASK_SPACE_URL: 'https://exemplo.hf.space', HF_TOKEN: 'hf_x' };
  const { handler, telegram } = montar({ env, hf: () => new Response(`event: complete\ndata: ${JSON.stringify([{ ok: true, answer: BOA, model: 'Qwen3-4B' }])}\n\n`, { status: 200 }) });
  await handler(post(update('Qual é a massa molar da água?')));
  assert.ok(telegram[0].body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === 'explicar'));
  await handler(post(callback('explicar')));
  assert.equal(telegram[1].metodo, 'answerCallbackQuery');
  assert.equal(telegram[1].body.text, TEXTOS.gerando);
  assert.equal(telegram[2].metodo, 'sendMessage');
  assert.ok(telegram[2].body.text.includes(BOA) && telegram[2].body.text.includes('Qwen3-4B'));
});

test('log: um evento por requisição, só evt/canal/status/ms/motivo; nunca texto, id nem token', async () => {
  const { handler, cap } = montar();
  await handler(post(update('Qual é a massa molar da água?')));
  for (const e of cap.eventos) assert.deepEqual(Object.keys(e).sort(), ['canal', 'evt', 'motivo', 'ms', 'status']);
  const s = JSON.stringify(cap.eventos);
  assert.ok(!s.includes('massa molar') && !s.includes('827000000') && !s.includes('123:abc') && !s.includes('segredo-ok'));
});

test('corpo maior que MAX_BODY_BOT → 200 corpo_invalido (sem derrubar a função)', async () => {
  const { handler, cap } = montar();
  const grande = update('x'.repeat(MAX_BODY_BOT + 10));
  assert.equal((await handler(post(grande))).status, 200);
  assert.equal(cap.eventos.at(-1).motivo, 'corpo_invalido');
});

test('vercel.json: a função do bot leva o pacote inteiro', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(vercel.functions['api/bot/telegram.js'], { includeFiles: 'data/quimica/**' });
});
```

Em `web/test/build.test.mjs:261-268`, acrescente ao `deepEqual` a entrada `'api/bot/telegram.js': { includeFiles: 'data/quimica/**' }` e estenda a mensagem: "… e o pacote inteiro junto do bot do Telegram".

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/api && node --test test/bot_endpoint.test.mjs; cd ../web && node --test test/build.test.mjs`
Expected: FAIL nos dois (módulo ausente; `vercel.functions` sem a entrada).

- [ ] **Step 3: Implementar `api/bot/telegram.js` e editar `vercel.json`**

Cabeçalho do arquivo no estilo de `api/ask.js` (o que entra, o que sai, kill switch, "o texto nunca é registrado"). `motivo` padrão `'ok'`. O `cliente` é criado por requisição com o token lido do `env()` naquele momento (kill switch sem reiniciar).

- [ ] **Step 4: Rodar e ver passar; suíte completa da API e do site**

Run: `cd apps/quimica/api && npm test && cd ../web && npm test`
Expected: PASS em ambas (contagem anterior + os testes novos do bot).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/bot/telegram.js apps/quimica/vercel.json apps/quimica/web/test/build.test.mjs apps/quimica/api/test/bot_endpoint.test.mjs
git commit -m "feat(quimica): Telegram webhook endpoint (401 on bad secret, silent for non-allowlisted, dedup, HTML replies) with the data package bundled"
```

---

### Task 7: Golden do bot sobre o pacote real (`api/test/bot_golden.test.mjs`)

**Files:**
- Test: `apps/quimica/api/test/bot_golden.test.mjs`

**Interfaces:**
- Consumes: `criarNucleo`, `storeDoDisco` (dir padrão = `data/quimica`), `avaliavel`, `cidDe` de `web/test/contrato.mjs`, `contracts/nlu_golden_cases.json`.

- [ ] **Step 1: Escrever o teste**

```js
// api/test/bot_golden.test.mjs — 20 casos do golden pt-BR pelo bot devem dar o mesmo intent e a mesma entidade que o site (critério 1 da spec).
// Roda só com o pacote real assinado em data/quimica; sem ele, pula.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { storeDoDisco } from '../_lib/bot/loja.js';
import { criarNucleo } from '../_lib/bot/nucleo.js';
import { avaliavel, cidDe } from '../../web/test/contrato.mjs';

const RAIZ = new URL('../../', import.meta.url);
const temPacote = existsSync(new URL('data/quimica/manifest.sig', RAIZ));
const golden = JSON.parse(readFileSync(new URL('contracts/nlu_golden_cases.json', RAIZ), 'utf8')).cases;

test('golden do bot: 20 primeiros casos pt-BR com entidade → mesmo intent e entidade que o contrato', { skip: !temPacote && 'sem pacote real em data/quimica' }, async () => {
  const store = await storeDoDisco();
  const casos = golden.filter((c) => (c.idioma ?? 'pt-BR') === 'pt-BR' && (c.elemento || c.composto != null) && c.intent !== 'DESCONHECIDA' && avaliavel(c, store)).slice(0, 20);
  assert.equal(casos.length, 20);
  const nucleo = criarNucleo({ obterStore: () => storeDoDisco(), env: () => ({ BOT_ENABLED: '1' }), autorizado: () => true });
  const falhas = [];
  for (const [i, c] of casos.entries()) {
    const s = await nucleo.processar({ canal: 'telegram', remetenteId: '1', conversaId: `g${i}`, texto: c.q, acao: null, idioma: 'pt-BR', eventoId: `g:${i}`, callbackId: null });
    if (s.silencio) { falhas.push(`"${c.q}": silêncio ${s.motivo}`); continue; }
    if (s.interpretacao.intent !== c.intent) falhas.push(`"${c.q}": intent ${s.interpretacao.intent} ≠ ${c.intent}`);
    if (c.elemento && s.interpretacao.elemento !== c.elemento) falhas.push(`"${c.q}": elemento ${s.interpretacao.elemento} ≠ ${c.elemento}`);
    if (c.composto != null && s.interpretacao.composto !== cidDe(c.composto, store)) falhas.push(`"${c.q}": composto ${s.interpretacao.composto} ≠ ${cidDe(c.composto, store)}`);
  }
  assert.deepEqual(falhas, []);
});
```

- [ ] **Step 2: Rodar**

Run: `cd apps/quimica/api && node --test test/bot_golden.test.mjs`
Expected: PASS (ou `skipped` numa máquina sem o pacote). Se um caso falhar por diferença real entre bot e site, o defeito está no núcleo (contexto vazando entre conversas ou corte do texto): corrija lá, não no teste.

- [ ] **Step 3: Commit**

```bash
git add apps/quimica/api/test/bot_golden.test.mjs
git commit -m "test(quimica): bot golden — 20 pt-BR cases give the site's intent and entity through the bot core"
```

---

### Task 8: Ferramenta do webhook (`tools/bot_telegram_webhook.py`)

**Files:**
- Create: `apps/quimica/tools/bot_telegram_webhook.py`
- Test: `apps/quimica/tools/test_bot_telegram_webhook.py`

**Interfaces:**
- Produces (módulo Python, `urllib` apenas):
  - `ler_token(caminho: Path) -> str` (conteúdo `strip`).
  - `ler_env(caminho: Path) -> dict[str, str]` (linhas `CHAVE=valor`, ignora `#` e vazias).
  - `chamar(metodo: str, token: str, payload: dict | None, abrir=urllib.request.urlopen) -> dict` — `POST https://api.telegram.org/bot<token>/<metodo>` com JSON; devolve o JSON da resposta; **lança `RuntimeError(f"{metodo}: {descricao}")` sem o token** quando `ok` é falso.
  - `registrar(url: str, segredo: str, token: str, abrir=...) -> dict` — payload exato `{"url": url, "secret_token": segredo, "allowed_updates": ["message", "callback_query"], "drop_pending_updates": True, "max_connections": 4}`.
  - `remover(token, abrir=...) -> dict` — `deleteWebhook` com `{"drop_pending_updates": True}`.
  - `info(token, abrir=...) -> dict` — `getWebhookInfo`.
  - `resumo_info(resultado: dict) -> str` — linhas `url=…`, `pending_update_count=…`, `last_error_message=…` (ou `nenhum`), `max_connections=…`.
  - `main(argv) -> int` — `--registrar URL | --remover | --info` (um deles obrigatório), `--token-arquivo` (padrão `secrets/telegram_token.txt`), `--env-arquivo` (padrão `secrets/telegram_bot.env`, chave `BOT_TELEGRAM_SECRET`). Imprime só `resumo_info(info(...))` no fim; nunca o token nem o segredo. Exige que a URL comece com `https://` (conferido **antes** de ler qualquer arquivo; falha → mensagem em stderr e código 2). Erros de `RuntimeError` → mensagem em stderr e código 1.

- [ ] **Step 1: Escrever o teste**

```python
# tools/test_bot_telegram_webhook.py
# -*- coding: utf-8 -*-
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import bot_telegram_webhook as w  # noqa: E402

TOKEN = "123456:ABC-segredo"


class Abridor:
    """urlopen falso: guarda URL e payload; responde o que `respostas` manda, na ordem."""

    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.chamadas = []

    def __call__(self, req, timeout=None):
        self.chamadas.append((req.full_url, json.loads(req.data.decode("utf-8")) if req.data else None))
        corpo = json.dumps(self.respostas.pop(0)).encode("utf-8")
        return io.BytesIO(corpo)


class Arquivos(unittest.TestCase):
    def test_ler_token_e_env(self):
        with tempfile.TemporaryDirectory() as d:
            t = Path(d, "t.txt"); t.write_text(TOKEN + "\n", encoding="utf-8")
            e = Path(d, "b.env"); e.write_text("# comentário\nBOT_TELEGRAM_IDS=1\nBOT_TELEGRAM_SECRET=abc=def\n\n", encoding="utf-8")
            self.assertEqual(w.ler_token(t), TOKEN)
            self.assertEqual(w.ler_env(e), {"BOT_TELEGRAM_IDS": "1", "BOT_TELEGRAM_SECRET": "abc=def"})


class Chamadas(unittest.TestCase):
    def test_registrar_payload_exato(self):
        a = Abridor([{"ok": True, "result": True}])
        w.registrar("https://saibatudo.net/quimica/api/bot/telegram", "seg", TOKEN, abrir=a)
        url, payload = a.chamadas[0]
        self.assertEqual(url, f"https://api.telegram.org/bot{TOKEN}/setWebhook")
        self.assertEqual(payload, {"url": "https://saibatudo.net/quimica/api/bot/telegram", "secret_token": "seg",
                                   "allowed_updates": ["message", "callback_query"], "drop_pending_updates": True, "max_connections": 4})

    def test_remover_e_info(self):
        a = Abridor([{"ok": True, "result": True}, {"ok": True, "result": {"url": "", "pending_update_count": 0}}])
        w.remover(TOKEN, abrir=a)
        self.assertTrue(a.chamadas[0][0].endswith("/deleteWebhook"))
        self.assertEqual(a.chamadas[0][1], {"drop_pending_updates": True})
        r = w.info(TOKEN, abrir=a)
        self.assertEqual(r["pending_update_count"], 0)

    def test_erro_da_api_nao_vaza_token(self):
        a = Abridor([{"ok": False, "description": "Unauthorized"}])
        with self.assertRaises(RuntimeError) as cm:
            w.chamar("getWebhookInfo", TOKEN, None, abrir=a)
        self.assertNotIn(TOKEN, str(cm.exception))

    def test_resumo_info(self):
        s = w.resumo_info({"url": "https://x/y", "pending_update_count": 2, "max_connections": 4})
        self.assertIn("url=https://x/y", s)
        self.assertIn("pending_update_count=2", s)
        self.assertIn("last_error_message=nenhum", s)


class Main(unittest.TestCase):
    def test_main_registrar_imprime_so_o_resumo(self):
        with tempfile.TemporaryDirectory() as d:
            t = Path(d, "t.txt"); t.write_text(TOKEN, encoding="utf-8")
            e = Path(d, "b.env"); e.write_text("BOT_TELEGRAM_SECRET=seg\n", encoding="utf-8")
            a = Abridor([{"ok": True, "result": True}, {"ok": True, "result": {"url": "https://saibatudo.net/quimica/api/bot/telegram", "pending_update_count": 0}}])
            saida = io.StringIO()
            with redirect_stdout(saida):
                rc = w.main(["--registrar", "https://saibatudo.net/quimica/api/bot/telegram", "--token-arquivo", str(t), "--env-arquivo", str(e), ], abrir=a)
            self.assertEqual(rc, 0)
            self.assertNotIn(TOKEN, saida.getvalue())
            self.assertNotIn("seg", saida.getvalue().replace("telegram", ""))
            self.assertIn("pending_update_count=0", saida.getvalue())

    def test_main_recusa_http(self):
        self.assertNotEqual(w.main(["--registrar", "http://inseguro/x", "--token-arquivo", "x", "--env-arquivo", "y"], abrir=Abridor([])), 0)


if __name__ == "__main__":
    unittest.main()
```

`main(argv, abrir=urllib.request.urlopen)` recebe `abrir` como parâmetro nomeado para o teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica && python -m unittest tools.test_bot_telegram_webhook -v`
Expected: FAIL (`ModuleNotFoundError: bot_telegram_webhook`).

- [ ] **Step 3: Implementar `tools/bot_telegram_webhook.py`**

Docstring de uso no topo (os três modos). Timeout de 20 s nas chamadas. Caminhos padrão relativos à pasta do app (`Path(__file__).resolve().parents[1]`).

- [ ] **Step 4: Rodar e ver passar; suíte Python das ferramentas**

Run: `cd apps/quimica && python -m unittest discover -s tools -p "test_*.py"`
Expected: PASS (contagem anterior + 7).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/tools/bot_telegram_webhook.py apps/quimica/tools/test_bot_telegram_webhook.py
git commit -m "feat(quimica): tool to register, remove and inspect the Telegram webhook without printing the token"
```

---

### Task 9: Política de privacidade 1.4 (cinco idiomas)

**Files:**
- Modify: `apps/quimica/web/src/quimica/privacidade/index.html` (texto-fonte), `en.html`, `es.html`, `de.html`, `fr.html`
- Modify: `apps/quimica/web/test/i18n.test.mjs:365-407`

**Interfaces:**
- Produces: política **1.4 — 4 de novembro de 2026** com (a) linha da versão atualizada, (b) **uma linha nova** na tabela de conexões (§4), (c) Telegram em §7 operadores, (d) retenção do contexto do bot em §8, (e) **uma seção nova `<h2>12. Bot de mensagens no Telegram (teste interno)</h2>`** antes de "Alterações", que passa a **13**. Mesmo número de `<h2>` e de `<tr>` nos cinco arquivos (o teste já exige).

- [ ] **Step 1: Estender o teste**

Em `web/test/i18n.test.mjs`, dentro do teste `index.html: hreflang dos cinco idiomas…` (linha 365), acrescente logo após `assert.deepEqual(alternativas(ptPriv), esperadas, …)`:

```js
  assert.match(ptPriv, /Versão 1\.4 — 4 de novembro de 2026/);
  assert.ok(ptPriv.includes('<h2>12. Bot de mensagens no Telegram (teste interno)</h2>') && ptPriv.includes('<h2>13. Alterações</h2>'), 'seção do bot antes de Alterações');
  assert.ok(ptPriv.includes('/quimica/api/bot/telegram') && ptPriv.includes('30 minutos'), 'destino e retenção do bot');
  assert.equal((ptPriv.match(/<tr>/g) ?? []).length, 6, 'cabeçalho + 5 conexões (Telegram incluído)');
```

e dentro do `for (const idioma …)`, após a asserção da tabela (linha 400):

```js
    assert.ok(priv.includes('1.4') && priv.includes('Telegram') && priv.includes('/quimica/api/bot/telegram'), `${idioma}: política 1.4 com a seção do bot`);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/quimica/web && node --test test/i18n.test.mjs`
Expected: FAIL (`Versão 1.4` ausente).

- [ ] **Step 3: Editar o texto-fonte `privacidade/index.html`**

Trocas exatas (pt-BR):

1. Linha 32: `<strong>Versão 1.3 — 17 de outubro de 2026</strong> (IA na nuvem opcional, …; “Ajudar a melhorar o app” opcional)` → `<strong>Versão 1.4 — 4 de novembro de 2026</strong> (bot de mensagens no Telegram em teste interno; IA na nuvem opcional, com a interpretação da pergunta anterior nas continuações; “Ajudar a melhorar o app” opcional)`.
2. Tabela §4, nova `<tr>` depois da linha de "Ajudar a melhorar o app":
   `<tr><td><strong>Bot de mensagens</strong> (teste interno, desde 04/11/2026; só para pessoas autorizadas pelo responsável)</td><td><strong>Telegram</strong> (operador do aplicativo de mensagens) → <code>saibatudo.net/quimica/api/bot/telegram</code> (Vercel) → <strong>Upstash</strong> (contexto da conversa) e, só ao tocar em “Explicar com IA”, <strong>Hugging Face</strong> ou <strong>Modal</strong> (servidor do modelo, EUA)</td><td>o Telegram entrega ao nosso servidor o texto da mensagem, o identificador numérico da sua conta e do chat e o idioma do aplicativo; o servidor compara o identificador com a lista de pessoas autorizadas e ignora as demais sem responder</td><td>Responder à pergunta com os mesmos dados do aplicativo. Guardamos, por até <strong>30 minutos</strong>, o contexto da conversa (a última pergunta, a última resposta e a interpretação) indexado por um resumo irreversível (SHA-256) do identificador do chat, para continuações e para o botão “Explicar com IA”; o identificador em claro, as mensagens e as respostas não ficam em log nem em banco de dados. A explicação por IA só é gerada quando você toca no botão, com a mesma verificação do servidor</td></tr>`
3. §7: depois de `<strong>Upstash</strong> (banco de dados Redis do servidor: contadores de limite de uso e as perguntas enviadas por “Ajudar a melhorar o app”)` acrescente `, <strong>Telegram</strong> (entrega das mensagens do bot em teste interno; o Telegram vê o conteúdo da conversa conforme a política dele)`.
4. §8: acrescente ao fim do parágrafo: ` O contexto das conversas do bot de mensagens expira em 30 minutos.`
5. Antes de `<h2>12. Alterações</h2>` insira:
   `<h2>12. Bot de mensagens no Telegram (teste interno)</h2>` + `<p>Desde 04/11/2026 o SaibaTudo Química existe também como bot no Telegram, em <strong>teste interno</strong>: só pessoas autorizadas pelo responsável recebem resposta; qualquer outra mensagem é ignorada em silêncio. O bot responde com os mesmos dados assinados do aplicativo e recusa os mesmos pedidos perigosos. O Telegram, como operador do serviço de mensagens, recebe e guarda a conversa segundo a política de privacidade dele. Nosso servidor recebe o texto da mensagem e o identificador numérico do chat, guarda por até 30 minutos o contexto da conversa (sob um resumo irreversível do identificador) e não registra em log o texto nem o identificador. A explicação gerada por IA só é pedida quando você toca em “Explicar com IA” e segue as mesmas regras da IA na nuvem (seções 4 e 7). Base legal: execução do serviço que você pediu ao escrever ao bot (art. 7º, V) e segurança (art. 7º, IX). Para sair do teste, basta parar de escrever ao bot ou bloqueá-lo; para apagar o contexto antes dos 30 minutos, envie <code>/limpar</code>.</p>`
   e renumere `<h2>12. Alterações</h2>` → `<h2>13. Alterações</h2>`.

Faça as trocas com um script Python no scratchpad que confira `count == 1` antes de cada `replace` (molde: `scratchpad/llms_pol/editar.py` da sessão de 04/11), gravando com `newline="\n"`.

- [ ] **Step 4: Traduzir as mesmas cinco mudanças para `en.html`, `es.html`, `de.html`, `fr.html`**

Mesma posição estrutural (versão, nova `<tr>` na mesma posição, §7, §8, nova seção 12 e "Alterações" → 13), mantendo `<code>saibatudo.net/quimica/api/bot/telegram</code>`, `/quimica/api/bot/telegram`, a palavra `Telegram`, "SHA-256", "30" + unidade de minutos no idioma, "1.4" e a data `4` de novembro de 2026 no formato do idioma (en `Version 1.4 — 4 November 2026`, es `Versión 1.4 — 4 de noviembre de 2026`, de `Version 1.4 — 4. November 2026`, fr `Version 1.4 — 4 novembre 2026`). Sem inline `style`/`script` (CSP). Nenhuma outra linha muda.

- [ ] **Step 5: Rodar os testes do site**

Run: `cd apps/quimica/web && npm test`
Expected: PASS (`i18n.test.mjs`, `modules.test.mjs`, `build.test.mjs` verdes; nenhum `<h2>`/`<tr>` divergente).

- [ ] **Step 6: Commit**

```bash
git add apps/quimica/web/src/quimica/privacidade apps/quimica/web/test/i18n.test.mjs
git commit -m "feat(quimica): privacy policy 1.4 (Telegram bot internal test: operator, what the server receives, 30-minute context) in five languages"
```

---

### Task 10: Documentação

**Files:**
- Modify: `apps/quimica/api/README.md` (§Contratos: nova subseção; §Variáveis: 6 linhas; §Como desligar: 1 linha; §Testes: 1 frase)
- Modify: `apps/quimica/docs/OPERACAO.md` (§3 tabela: 1 linha; nova `## 9. Bot de mensagens (Telegram, teste interno)`)
- Modify: `apps/quimica/docs/PROJECT_MEMORY.md` (nova `### 6.ah. 04/11/2026: bot de mensagens F1 (Telegram, teste interno)`; §7 Contas e segredos: `secrets/telegram_token.txt` e `secrets/telegram_bot.env`)
- Modify: `apps/quimica/docs/PENDENCIAS.md` (nova `## 14. Bot de mensagens (04/11/2026)` com a F2 WhatsApp: app "Empresa" na Meta, token `EAA…`, PHONE_ID, WABA_ID, APP_SECRET em `secrets/whatsapp.env`; idiomas do bot; teste ao vivo)
- Modify: `apps/quimica/CLAUDE.md` (regra 6: os dois arquivos novos de `secrets/`; "Testar": `python -m unittest discover -s tools -p "test_*.py"` já cobre; "Publicar": uma frase sobre o webhook)

**Interfaces:** nenhuma; conteúdo fixado abaixo.

- [ ] **Step 1: `api/README.md`**

Nova subseção depois de `### POST /api/ask`:

```markdown
### `POST /api/bot/telegram` (bot de mensagens, teste interno, desde 04/11/2026)
Webhook do Telegram (`@SaibaTudoNetBot`). Cabeçalho `X-Telegram-Bot-Api-Secret-Token` ≠ `BOT_TELEGRAM_SECRET` → `401`; `BOT_ENABLED` vazio → `200` sem processar;
`from.id` fora de `BOT_TELEGRAM_IDS` → `200` e **nenhuma** mensagem (silêncio); `update_id` repetido em 30 min → `200` sem reprocessar. Comandos `/start`, `/ajuda`,
`/sobre`, `/limpar`; texto → motor do site (`web/src/quimica/js/engine.js`) sobre o pacote empacotado na função (`includeFiles: data/quimica/**`); botões
"Explicar com IA" (chama `chamarAsk` internamente: mesmo orçamento, verificador e contador global) e "Sugestões". Contexto por conversa 30 min (memória + Redis
`bot:ctx:<sha256>`); limites `BOT_RATE_POR_MIN`/`BOT_RATE_POR_DIA` por conversa. Sempre `200 { ok:true }` depois de enviar (1 retentativa). Log: só `evt`, `canal`,
`status`, `ms`, `motivo`. Módulos: `_lib/bot/{loja,conversas,formato,nucleo,telegram}.js`; registro do webhook: `tools/bot_telegram_webhook.py`.
```

Linhas na tabela de variáveis (antes de `VERCEL_GIT_COMMIT_SHA`):

```markdown
| `BOT_ENABLED` | **só `1` liga** o bot de mensagens (`/api/bot/*`) | desligado |
| `BOT_TELEGRAM_TOKEN`, `BOT_TELEGRAM_SECRET` | token do bot (BotFather) e segredo do webhook (32 bytes hex, gerado localmente) — sensíveis | vazio |
| `BOT_TELEGRAM_IDS` | ids numéricos do Telegram autorizados, separados por vírgula (lista fechada; os demais recebem silêncio) | vazio = ninguém |
| `BOT_RATE_POR_MIN` · `BOT_RATE_POR_DIA` | mensagens por conversa por minuto · por dia | 10 · 200 |
```

Linha em "Como desligar": `| Bot de mensagens | \`vercel env rm BOT_ENABLED production -y\` + deploy (imediato: \`python tools/bot_telegram_webhook.py --remover\`) | o Telegram recebe 200 e nada é respondido |`.

Em "Testes", acrescente: `bot (\`bot_*\`: loja do disco, contexto/dedup/limites com Redis falso, formato HTML em partes, núcleo sobre o pacote de teste, adaptador e endpoint do Telegram, golden de 20 casos sobre o pacote real)`.

- [ ] **Step 2: `docs/OPERACAO.md`**

Linha na tabela §3: `| Bot de mensagens (Telegram) | \`BOT_ENABLED\` vazio + redeploy; ou \`python tools/bot_telegram_webhook.py --remover\` (imediato, sem deploy) | o Telegram recebe 200 e ninguém é respondido; o site e o Android não mudam |`.

Nova seção ao fim:

```markdown
## 9. Bot de mensagens (Telegram, teste interno, desde 04/11/2026)

Spec: `docs/superpowers/specs/2026-11-04-quimica-bot-mensagens-design.md` (raiz). Endpoint `POST /quimica/api/bot/telegram` (`api/bot/telegram.js`), núcleo em `api/_lib/bot/`.
- **Segredos locais**: `secrets/telegram_token.txt` (BotFather) e `secrets/telegram_bot.env` (`BOT_TELEGRAM_IDS`, `BOT_TELEGRAM_SECRET`, `BOT_ENABLED`, limites). Nunca no Git nem no chat.
- **Vercel (produção, sensíveis)**: `BOT_ENABLED=1`, `BOT_TELEGRAM_TOKEN`, `BOT_TELEGRAM_SECRET`, `BOT_TELEGRAM_IDS`; opcionais `BOT_RATE_POR_MIN` (10), `BOT_RATE_POR_DIA` (200). Gravar com `printf '%s' "$VALOR" | vercel env add NOME production --sensitive`.
- **Registrar o webhook** (depois do deploy e com a política 1.4 no ar): `python tools/bot_telegram_webhook.py --registrar https://saibatudo.net/quimica/api/bot/telegram`; conferir com `--info` (`pending_update_count=0`, `last_error_message=nenhum`). Remover: `--remover`.
- **Autorizar alguém**: pedir que a pessoa escreva ao bot, ler o `from.id` com `getUpdates` (só funciona sem webhook; com webhook, ler o id no log não dá: o id nunca vai ao log — use `--remover`, `getUpdates`, `--registrar`), acrescentar à `BOT_TELEGRAM_IDS` e republicar.
- **Reverter**: `BOT_ENABLED` vazio + deploy, ou `--remover` (imediato).
- **Logs**: `vercel logs` mostra só `{evt:"bot", canal, status, ms, motivo}`; motivos: `ok`, `auth_falhou`, `desligado`, `corpo_invalido`, `ignorado`, `nao_autorizado`, `duplicado`, `limite`, `dados`, `acao_invalida`, `sem_resposta`, `ia_<kind>`, `envio_falhou`.
- **Custos**: a explicação por IA consome o mesmo orçamento diário do `/api/ask` (`HF_ASK_DAILY_BUDGET`, contador global `ask-hf` no Upstash); o pacote inteiro (17 MB) vai junto da função.
```

- [ ] **Step 3: `docs/PROJECT_MEMORY.md`, `docs/PENDENCIAS.md`, `CLAUDE.md`**

PROJECT_MEMORY: nova `### 6.ah. 04/11/2026: bot de mensagens, F1 (Telegram, teste interno)` com: decisão do mantenedor (química primeiro, bot dentro do app, Telegram antes do WhatsApp, só ele autorizado), o que foi feito (lista dos módulos, política 1.4, ferramenta, testes), o que falta (Task 11: variáveis, deploy, webhook, teste ao vivo) e a F2 (WhatsApp: app "Empresa" na Meta pendente). §7: acrescentar `secrets/telegram_token.txt` (BotFather, 04/11/2026) e `secrets/telegram_bot.env`.

PENDENCIAS: nova `## 14. Bot de mensagens (04/11/2026)` com os itens: (1) publicar F1 (Task 11); (2) F2 WhatsApp: criar app "Outro → Empresa" na Meta, produto WhatsApp, token `EAA…`, `WHATSAPP_PHONE_ID`, `WHATSAPP_WABA_ID`, novo `WHATSAPP_APP_SECRET` em `secrets/whatsapp.env` (o app atual é "Login do Facebook" e não serve); (3) idiomas do bot pelo `language_code`; (4) imagens de moléculas (fora de escopo por ora).

CLAUDE.md: regra 6 passa a listar `secrets/telegram_token.txt` e `secrets/telegram_bot.env`; em "Publicar", frase: "Bot do Telegram: depois do deploy, `python tools/bot_telegram_webhook.py --registrar <url>` (`docs/OPERACAO.md` §9)".

- [ ] **Step 4: Conferir os testes de documentação e workflows**

Run: `cd apps/quimica && python tools/test_workflows.py && cd web && npm test`
Expected: PASS (nenhum workflow novo; nada do site mudou nesta task).

- [ ] **Step 5: Commit**

```bash
git add apps/quimica/api/README.md apps/quimica/docs/OPERACAO.md apps/quimica/docs/PROJECT_MEMORY.md apps/quimica/docs/PENDENCIAS.md apps/quimica/CLAUDE.md
git commit -m "docs(quimica): Telegram bot (F1) — contract, variables, kill switch, webhook registration, state and pending WhatsApp F2"
```

---

### Task 11: Publicação e teste ao vivo (operacional; spec §8)

**Files:** nenhum no repositório (variáveis na Vercel, deploy, webhook). `docs/PROJECT_MEMORY.md` §6.ah recebe o resultado.

**Pré-requisitos:** Tasks 1–10 na `main` com `gh run list --limit 6` verde (`quimica-web-ci.yml`).

- [ ] **Step 1: Variáveis na Vercel (projeto `saibatudo-quimica`, produção, sensíveis)**

Dentro de `apps/quimica`, lendo os arquivos de `secrets/` (sem ecoar valores):

```bash
printf '%s' "$(cat secrets/telegram_token.txt)" | vercel env add BOT_TELEGRAM_TOKEN production --sensitive
for k in BOT_TELEGRAM_SECRET BOT_TELEGRAM_IDS; do printf '%s' "$(grep "^$k=" secrets/telegram_bot.env | cut -d= -f2-)" | vercel env add $k production --sensitive; done
printf '%s' 1 | vercel env add BOT_ENABLED production
vercel env ls production | grep -c BOT_   # esperado: 4
```

- [ ] **Step 2: Deploy**

`git pull --rebase` e depois `vercel deploy --prod` dentro de `apps/quimica` (o classificador da sessão bloqueia este comando para o agente: o mantenedor roda, ou libera `Bash(vercel deploy:*)`), **ou** `gh workflow run quimica-data-refresh.yml` (lembrar a pendência do teste de integridade com `QUIMICA_ASK_ENABLED`, issue #22).
Conferir: `curl -s https://saibatudo.net/quimica/api/health` (`ok:true`) e `curl -s -o /dev/null -w '%{http_code}' -X POST https://saibatudo.net/quimica/api/bot/telegram -H 'content-type: application/json' -d '{}'` → `401` (segredo ausente).

- [ ] **Step 3: Registrar o webhook**

```bash
python tools/bot_telegram_webhook.py --registrar https://saibatudo.net/quimica/api/bot/telegram
python tools/bot_telegram_webhook.py --info     # url=…/quimica/api/bot/telegram, pending_update_count=0, last_error_message=nenhum
```

- [ ] **Step 4: Teste ao vivo pelo mantenedor (critério 6 da spec)**

No Telegram, com `@SaibaTudoNetBot`: (1) `/start`; (2) "Qual é a massa molar da água?"; (3) "e a do KCl?" (continuação); (4) um pedido perigoso (deve recusar, sem botão de IA); (5) `/limpar`; (6) nova pergunta + toque em "Explicar com IA" (explicação em mensagem nova ou motivo: cota/recusa/fora). Medir: resposta local em menos de 3 s depois da primeira (instância fria pode levar 2–4 s). Conferir `vercel logs` (ou o painel): só `evt/canal/status/ms/motivo`, nenhum texto.

- [ ] **Step 5: Registrar o resultado**

Atualizar `docs/PROJECT_MEMORY.md` §6.ah (data/hora, o que funcionou, tempos medidos, motivos vistos) e `docs/PENDENCIAS.md` §14 (item 1 riscado). Commit:

```bash
git add apps/quimica/docs/PROJECT_MEMORY.md apps/quimica/docs/PENDENCIAS.md
git commit -m "docs(quimica): Telegram bot F1 live test results"
```

Reversão a qualquer momento: `python tools/bot_telegram_webhook.py --remover` (imediato) ou `BOT_ENABLED` vazio + deploy.
