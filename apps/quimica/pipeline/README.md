# pipeline — coleta, validação e assinatura do pacote de dados

Python 3, só biblioteca padrão (`urllib`, `json`, `xml.etree`, `html.parser`) + `ecdsa` (assinatura). Saída: `data/quimica/`
(contrato em `docs/DATA_CONTRACT.md`; política de fontes em `docs/FONTES_E_LICENCAS.md` §5).

## Como rodar
```bash
pip install -r pipeline/requirements.txt
python pipeline/build.py --assinar-com secrets/data_signing_key.pem          # completo (~30-40 min na 1ª vez; depois usa o cache)
python pipeline/build.py --rapido --assinar-com secrets/data_signing_key.pem # 300 compostos, textos reduzidos (CI, testes)
python pipeline/sign.py verify data/quimica/manifest.json --public pipeline/data_signing_public.pem
python -m unittest discover -s pipeline/tests                                # testes (offline; usa pipeline/tests/fixtures/cache)
```
Idiomas (docs/I18N.md §4): `--idiomas pt-BR,en,es,de,fr` (padrão: os cinco; pt-BR sempre entra) controla `elementos[].nomes`, `compostos[].nomes`/
`sinonimosPorIdioma` (Wikidata `wbgetentities`, 50 itens por chamada), `ghs_frases.json` por idioma (linhas PT/EN/ES/DE/FR do Anexo III), `regras.propriedades[].rotulos`
e as pastas `textos/wikipedia-<lang>/` (mesmos artigos da coleta em português, achados pelos sitelinks do Wikidata). `--sem-textos-idiomas` pula só a Wikipédia em
en/es/de/fr (build rápido). Os textos saem em **lotes** (`textos/<fonte>/lote-NNN.json`, até 200 trechos ordenados por id) + `textos/index.json`.
Custo da parte multilíngue no build completo (medido em 12/10/2026, PubChem do cache): ~50 chamadas ao Wikidata (3 elementos + 40 compostos + 7 conceitos) e ~29 por
idioma à Wikipédia (20 títulos por chamada), tudo a 1 req/s em série: ~30-45 s por idioma, ~3 min no total; a Wikipédia pt continua ~55 chamadas.
Opções úteis: `--offline` (só cache), `--cache DIR`, `--out DIR`, `--alvo N` (tamanho do núcleo, padrão 2000),
`--limite-compostos N`, `--limite-textos N`, `--sem-wikimedia`, `--hoje AAAA-MM-DD`, `--gutenberg-zip ARQ` (reserva).
A saída é atômica: o pacote é montado em `<out>.novo`, validado e só então troca `<out>`; se a validação falha, o anterior fica.
`stats.json` (contagens, fontes, descartes, tempos, falhas por família) fica ao lado do manifesto, fora dele.

## O que cada módulo faz
| Módulo | Função |
| :-- | :-- |
| `http_cache.py` | GET/POST com cache em `pipeline/.cache/<sha256 da URL>` (corpo gzip + cabeçalhos), ETag/Last-Modified, retentativas, limite por host |
| `robots.py` | checa `robots.txt` (exceções documentadas só para as APIs oficiais: PUG REST, WDQS, `/w/api.php`) |
| `fontes.py` | `FONTES` (nome, mantenedor, url, licença, uso, `idioma`, `acessadoEm`, lista de permissão; uma entrada por fonte e idioma) -> `fontes.json` e `manifest.licencas` |
| `common.py` | utilidades + `IDIOMAS`/`WIKI_POR_IDIOMA`/`normalizar_idiomas` (códigos do projeto) |
| `wikidata.py` | SPARQL (WDQS) e `entidades()` (`wbgetentities`: rótulos, apelidos e sitelinks por idioma, 50 ids por chamada, URL determinística para o cache) |
| `coleta_elementos.py` | 118 elementos: PubChem Periodic Table + Wikidata; nomes da SBQ em `quimica_util.py`; `nomes` por idioma (pt-BR = SBQ, en = PubChem, es/de/fr = rótulo do Wikidata) |
| `lista_fixa.py`, `selecao_compostos.py` | núcleo de ~2.000 compostos: lista fixa (CID conferido pela fórmula) + Wikidata (P662, ptwiki) por sitelinks |
| `pubchem.py`, `coleta_compostos.py` | PUG REST (campos calculados), GHS harmonizado (CLP Anexo VI), nomes/CAS/fórmula (Wikidata), `nomes`/`sinonimosPorIdioma` (rótulos e apelidos do Wikidata por idioma), `definicaoChebi`, lotes de 200, índice com `nomesPorIdioma` |
| `clp.py` | frases H/EUH em pt-BR/en/es/de/fr: linhas PT/EN/ES/DE/FR do Anexo III multilíngue do Regulamento CLP (EUR-Lex/Cellar) -> `ghs_frases.json` (`texto` pt + `textoPorIdioma`; pictogramas e palavras de advertência por idioma) |
| `coleta_chebi.py` | definições e nomes do ChEBI (CC BY 4.0) pela API pública em lote |
| `coleta_constantes.py` | CODATA 2022 (NIST) -> `constantes.json` |
| `coleta_wikimedia.py` | Wikipédia pt (introduções) e Wikilivros pt, CC BY-SA 4.0, com `revisao` e `tema`; `coletar_wikipedia_idioma()` repete os mesmos artigos em en/es/de/fr pelo item do Wikidata (sitelinks), sem busca nem tradução |
| `coleta_textos.py` | trechos de 400-1.200 caracteres; Faraday (Gutenberg #14474); sonda do Gold Book |
| `coleta_icsc.py` | só o link de busca por CAS (`icscBuscaUrl`); parser dos cartões **desativado** |
| `regras.py` | `regras.json` (prefixos SI, unidades, reatividade, solubilidade, nomenclatura, `propriedades` com `rotulos`/`sinonimosPorIdioma` por idioma — glossário I18N §8, revisão pendente) |
| `build.py`, `sign.py` | orquestração, validação (gates) e assinatura ECDSA P-256/SHA-256 do manifesto |

## Limites de taxa (respeitados em `http_cache.LIMITES_POR_HOST`)
PubChem 2 req/s (teto pedido: 4; o servidor devolveu 429 a ~3,3 req/s sustentados e **bloqueia o IP por alguns minutos**: depois de um
429 o limitador reduz a taxa e espera 30 s, 60 s, ... até 5 min) · Wikidata 1 req/s · OIT 1 req/s · Wikimedia 1 req/s em série ·
EBI/ChEBI 1 req/10 s (Crawl-delay do `robots.txt`) · demais 2 req/s. Qualquer host `*.wikipedia.org`/`*.wikibooks.org` cai em 1 req/s mesmo sem entrada
explícita (`LimitadorTaxa.intervalo`); `www.wikidata.org` (`wbgetentities`) 1 req/s. `User-Agent`: `SaibaTudoQuimica/0.1 (+https://saibatudo.net; saibatudo@saibatudo.net)`.

## Como adicionar uma fonte
1. Ler os termos e o `robots.txt`; registrar a linha em `docs/FONTES_E_LICENCAS.md`.
2. Acrescentar o objeto em `fontes.py` (`FONTES`) com `licenca`, `uso` e `exibir/dataset/treino`.
3. Criar `coleta_<fonte>.py` com `coletar(http, hoje)` devolvendo `(dados, stats)`; usar só `HttpCache` (nunca `urllib` direto).
4. Ligar em `build.py` (`tentar(...)` registra falha em `stats.json` sem derrubar o build) e acrescentar o gate em `validar()` se for obrigatória.
5. Testes em `pipeline/tests/` (parser com amostra sintética ou pequena resposta real em `fixtures/cache`).
Regras que o `validar()` impõe: licença de texto só `CC BY-SA 4.0`, `CC BY 4.0` ou `domínio público`; nada de OpenStax; nada de
`seguranca/` (ICSC); `ghs` só da fonte harmonizada (Regulamento 1272/2008); `icscBuscaUrl` exatamente quando há `cas`.

## Fixtures dos testes
`pipeline/tests/fixtures/cache/` guarda respostas reais pequenas (PubChem, Wikidata, CODATA, Wikimedia, ChEBI, Gutenberg) no formato do
cache (inclui `wbgetentities` dos 118 elementos, de 12 compostos e dos conceitos, e as introduções da Wikipédia em pt/en/es/de/fr para 6 elementos, 3 compostos e
6 conceitos). Para regravar: `python pipeline/build.py --rapido --out /tmp/x --cache /tmp/fx --limite-compostos 12 --limite-textos 6 --hoje 2026-10-10`
(copiar antes a pasta de fixtures para `/tmp/fx`, para reaproveitar o que já existe e só baixar o que mudou)
e copiar `/tmp/fx` (sem a entrada do CLP, 29 MB) para a pasta de fixtures.
