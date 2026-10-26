# Contrato de dados — SaibaTudo LLMs

Pacote em `data/llms/` (produção) e `web/test/fixtures/data-llms/` (fixture de 360 palavras com vetores reais, assinada com a chave de teste).
Gerado por `pipeline/gerar_pacote.py`; servido em `/llms/data/<arquivo>?v=<sha256[:16]>` (cache-first versionado no service worker).

| Arquivo | Conteúdo | Tamanho (100 k) |
| :-- | :-- | --: |
| `manifest.json` | `version` (`AAAAMMDDTHHMMSSZ-<12 hex do sha256 do vocab>`), `generatedAt`, `schemaVersion: 1`, `files{nome: {bytes, sha256}}`, `vetores{nome, licenca: "PDDL 1.0", url, referencia, palavras, dimensoes: 50, quantizacao}` | ~1 KB |
| `manifest.sig` | assinatura ECDSA P-256 / SHA-256 do `manifest.json`, DER em Base64 (`pipeline/sign.py`) | 98 B |
| `vocab.json` | lista JSON das palavras, na ordem de frequência do GloVe; o índice é a posição | ~0,9 MB |
| `vetores.i8` | `n × 50` int8, ordem C: `q[i*50 + k]` | 5,0 MB |
| `escalas.f32` | `n` float32 little-endian: `x = q × escala[i]`; `escala = max|x|/127` por vetor (linha nula → 1.0) | 0,4 MB |
| `glossario.json` | `{ "king": { "pt-BR": "rei", "es": "rey", "de": "König", "fr": "roi", "zh": "国王" }, … }` (360 palavras, autoria própria) | ~30 KB |
| `presets.json` | `{ realeza: [...], capitais, plural, familia, cores, numeros, lideres }` | <1 KB |

Seleção: primeiras 100 000 palavras do GloVe (`glove-wiki-gigaword-50`) que casam `^[a-z]+(?:[-'][a-z]+)*$` e têm ≤ 20 caracteres.
Fontes aceitas pelo pipeline: `--fonte gensim` (gensim-data no GitHub), `--fonte hf` (espelho `fse/glove-wiki-gigaword-50`, formato KeyedVectors),
`--fonte <glove.6B.50d.zip>` (espelho Zenodo 4925376, word2vec binário) ou o arquivo texto do Stanford.

Verificações: o build recusa pacote com bytes/SHA-256 divergentes ou assinatura inválida; o cliente (`data.js`) repete a verificação (WebCrypto)
e, se falhar, lança `ErroDados('assinatura'|'hash'|'manifesto'|'rede')` — o app avisa e segue sem o explorador. Teste do pipeline: os 10 vizinhos
mais próximos de 50 palavras-amostra são o mesmo conjunto em float32 e int8.

Erro de quantização: ≤ `escala/2` por componente (≤ 0,4 % do maior valor do vetor); cossenos mudam na 3ª casa decimal, no máximo.

## API `/llms/api/ask` (POST)
Entrada `{ q (3–400), lang (pt-BR|en|es|de|fr|zh), context? (≤ 1500: resumo do gráfico com números em ponto decimal), trechos? (≤ 3 × 2000, ids
"<idioma>:<secao>"), v: 1, client: web|android, iid: uuid }`. Saída `{ ok, answer, model, cached }`; `422 rejected {motivo}`; `503 disabled|budget`;
`429`; `400 {field}`. O Space recebe `[pergunta, idioma, contexto, trechosJSON]` e devolve `{ok, answer, model, gpu_s}`.
