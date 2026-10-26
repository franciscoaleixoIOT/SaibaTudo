# Operação — SaibaTudo LLMs

## 1. Publicar o site
1. Pacote de dados versionado em `data/llms/` (gerado localmente: `python pipeline/gerar_pacote.py --saida data/llms --fonte gensim --limite 100000
   --chave secrets/data_signing_key.pem`; `--fonte hf` ou `--fonte pipeline/.cache/zenodo/glove.6B.50d.zip` se o GitHub estiver fora). Commit de dados
   separado do de código.
2. `gh workflow run llms-data-refresh.yml` (sob demanda; verifica a assinatura, roda os testes de integridade, builda e faz `vercel deploy --prod`
   no projeto `saibatudo-llms` com `VERCEL_TOKEN_TIME`). Push na `main` não publica.
3. Conferir: `curl https://saibatudo-llms.vercel.app/llms/api/health` → `"ok":true`, `"data":{…,"palavras":100000}`, `"ask":"on"|"off"`.
4. Depois de 27/10/2026 (rota no `vercel.json` de eleições): `https://saibatudo.net/llms/` e `.../llms/api/health`.

## 2. Variáveis e segredos
| Onde | Nome | Quem grava | Para quê |
| :-- | :-- | :-- | :-- |
| GitHub (secrets) | `VERCEL_PROJECT_ID_LLMS` | mantenedor | id do projeto `saibatudo-llms` |
| GitHub (secrets) | `DATA_SIGNING_KEY_LLMS` | mantenedor | reserva da chave privada do pacote (o workflow não assina; só verifica) |
| GitHub (vars) | `LLMS_ASK_ENABLED` | mantenedor | informativo no log do deploy |
| Vercel (produção) | `HF_TOKEN` | **mantenedor** (segredo) | token de leitura do HF para chamar o Space privado |
| Vercel | `ASK_ENABLED`, `HF_ASK_SPACE_URL`, `ASK_MODEL_VERSION`, `HF_ASK_DAILY_BUDGET`, `ALLOWED_ORIGINS` | agente (API REST do time) ou mantenedor | nuvem; `ASK_ENABLED` vazio = kill switch |
| Local | `secrets/data_signing_key.pem` | gerado por `sign.py gen` | assina o pacote |

## 3. Space do explicador
- Publicar/atualizar: `python backend/hf_space_llms/publicar.py --space franciscoaleixo/saibatudo-llms --teste` (token de escrita em
  `secrets/hf_token_write.txt` da raiz; `--teste` espera RUNNING e faz uma chamada em pt e zh — gasta ZeroGPU).
- Trocar o modelo (S4): variáveis `ASK_MODEL_ID`, `ASK_MODEL_REVISION`, `ASK_MODEL_LABEL` no Space; sem mexer no código. O rótulo que o app
  mostra vem do `model` da resposta.
- Space em RUNTIME_ERROR: ver logs em `https://huggingface.co/spaces/franciscoaleixo/saibatudo-llms`; `transformers>=5.17,<6` é obrigatório.
- Cota ZeroGPU: compartilhada com os Spaces da química e de eleições; `HF_ASK_DAILY_BUDGET` (padrão 200) limita as chamadas por dia.

## 4. Kill switch e falhas
- Desligar a nuvem: esvaziar `ASK_ENABLED` na Vercel (vale na próxima requisição). O app mostra "IA na nuvem desligada nesta versão".
- Resposta rejeitada pelo verificador: o app mostra o aviso e mantém a resposta local; o log tem só `rejected_<motivo>`.
- Pacote inválido no ar: o app avisa e desliga o explorador; republicar com o pacote correto.

### Limites aceitos do verificador (S1)
O verificador (`api/_lib/fidelidade.js`) desconta só a frase do rodapé e confere TODO o resto (antes e depois): números fora do enviado, escrita
(Han) e dado pessoal. Ficam de fora, por decisão do S1: número por extenso ("noventa e sete centésimos"), dígito único ("dimensão 7"), corpo em
outro idioma latino com o rodapé certo e resposta zh com um único caractere Han. O cliente mostra o texto sempre rotulado com o modelo, abaixo da
resposta local, que permanece.

## 5. Domínio e home (27/10/2026)
Branch `llms-dominio`: três rewrites `/llms*` e três `/zh*` em `apps/eleicoes2026/vercel.json`, exclusão `/llms/` em `portal/src/sw.js`, cartão fixo
do app em `portal/src/index.html` + catálogos (6, com `zh.js`), `IDIOMAS` do portal com `zh`, `tests/rotas.test.mjs`. Depois do merge:
`gh workflow run eleicoes-data-refresh.yml` (as regras de proxy só valem após o deploy de eleições) e `portal-ci.yml` publica a home.

## 6. Checagens antes de dizer "pronto"
`cd web && npm test` · `E2E=1 npm test` (Chrome) · `cd api && npm test` · Python (pipeline, tools, backend) · `gh run list --limit 6` depois do push ·
teste ao vivo com Playwright em pt, en e zh (explorador, Aprenda, nuvem).
