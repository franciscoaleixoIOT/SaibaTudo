# API do SaibaTudo LLMs (funções serverless na Vercel, sem dependências)

Rota pública: `https://saibatudo.net/llms/api/<função>` (rewrite de `/llms/api/:path*` → `/api/:path*` em `vercel.json`).

| Função | Método | O que faz |
| :-- | :-- | :-- |
| `health.js` | GET | `{ ok, version, model, ask:"on"\|"off", shared, data:{version, generatedAt, packageAgeDays, palavras}\|null, time }`. Sem segredos, sem chamar o Hugging Face. |
| `ask.js` | POST | Explicação gerada por IA, **opt-in**, ancorada no contexto do gráfico e nos trechos das seções que o app envia. Provedor: Space privado do Hugging Face (`backend/hf_space_llms/`). Resposta só sai se passar no verificador (`_lib/fidelidade.js`). |

## POST /api/ask
Entrada: `{ q, lang, context?, trechos?: [{id, texto}], v: 1, client: "web"|"android", iid: "<uuid>" }` (`_lib/validate.js`: `q` 3–400 caracteres,
`lang` em pt-BR/en/es/de/fr/zh, `context` ≤ 1 500, até 3 trechos de 2 000).
Saída: `200 { ok:true, answer, model, cached }` · `422 { ok:false, error:"rejected", motivo }` (número fora do enviado, sem rodapé, escrita errada,
dado pessoal, tamanho) · `503 { error:"disabled" }` (kill switch) · `429` (limites) · `400` (corpo inválido) · `502/504` (Space fora ou lento).
O texto da pergunta e a resposta **nunca** vão para o log (só status, latência, cache, cliente, motivo).

## Variáveis (Vercel, produção)
| Variável | Padrão | Papel |
| :-- | :-- | :-- |
| `ASK_ENABLED` | vazio (off) | `1` liga a nuvem (junto com o Space configurado). Esvaziar = kill switch. |
| `HF_ASK_SPACE_URL` | — | URL do Space (`https://<usuario>-saibatudo-llms.hf.space`). |
| `HF_TOKEN` | — | **Segredo**: token de leitura do Hugging Face (o Space é privado). Só o mantenedor grava. |
| `ASK_MODEL_VERSION` | `dev` | Rótulo da versão do explicador no health (ex.: `qwen3-4b-base`). |
| `HF_ASK_DAILY_BUDGET` | 200 | Chamadas por dia ao Space (protege a cota ZeroGPU da conta). |
| `HF_ASK_TIMEOUT_MS` | 25000 | Tempo máximo por chamada. |
| `RATE_IP_PER_MIN` / `RATE_IID_PER_DAY` | 20 / 60 | Limites por IP e por instalação. |
| `CACHE_TTL_SECONDS` / `CACHE_MAX_ENTRIES` | 3600 / 500 | Cache em memória por pergunta normalizada + idioma + contexto. |
| `ALLOWED_ORIGINS` | saibatudo.net, www, saibatudo-llms.vercel.app | CORS. |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | — | Opcionais: limites compartilhados entre instâncias (falha aberto). |

Testes: `cd api && npm test`.
