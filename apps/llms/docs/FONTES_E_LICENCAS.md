# Fontes e licenças — SaibaTudo LLMs

| O quê | Fonte | Licença | Onde entra |
| :-- | :-- | :-- | :-- |
| Vetores de palavras | **GloVe 6B** (Wikipedia 2014 + Gigaword 5), 50d — Pennington, Socher & Manning (2014), Stanford NLP; modelo `glove-wiki-gigaword-50` (gensim-data), espelhos `fse/glove-wiki-gigaword-50` (HF) e Zenodo 4925376 | **PDDL 1.0** (Open Data Commons Public Domain Dedication and License) | `data/llms/` (100 mil palavras mais frequentes, int8) |
| Glossário (360 palavras × 5 traduções), presets, léxicos, casos golden | projeto SaibaTudo | MIT | `contracts/` |
| Seis seções didáticas (6 idiomas) | projeto SaibaTudo (autoria própria; sem trechos ou figuras de terceiros) | MIT | `web/src/llms/js/conteudo/` |
| Referências citadas | Pennington et al. 2014 (EMNLP); Mikolov, Yih & Zweig 2013 (NAACL-HLT) e Mikolov et al. 2013 (arXiv); Vaswani et al. 2017 (NeurIPS) | citação acadêmica, links para as páginas oficiais | `conteudo/index.js` (`REFERENCIAS`) |
| Modelo da IA na nuvem | **Qwen3-4B-Instruct-2507** (Alibaba Qwen) | Apache 2.0 (aviso de atribuição no Space e em "Sobre os dados") | `backend/hf_space_llms/` |
| Fonte tipográfica | Poppins SemiBold | OFL 1.1 | `brand/fonts/` → WOFF no build |
| Ícone e marca | projeto SaibaTudo (`web/tools/gerar_icones.mjs`) | MIT | `brand/` |
| Código do app | projeto SaibaTudo | MIT | tudo |

## O que NÃO entra
- Transcrições, imagens, animações ou textos de vídeos, canais ou cursos de terceiros (decisão do mantenedor, 25/10/2026): o conteúdo é escrito do zero.
- Embeddings ou corpora sem licença de reuso clara. Candidatos para o futuro (MUSE/fastText alinhados, CC BY-SA) só com esta tabela atualizada.
- Livros protegidos (regra do ecossistema).

## Atribuição exigida
- PDDL não exige atribuição, mas o app cita o GloVe e a licença em "Sobre os dados", nas respostas (rótulo "calculado a partir do GloVe (PDDL 1.0)")
  e no manifesto do pacote (`vetores.fonte/licenca/url/referencia`).
- Apache 2.0 (Qwen3): aviso no `README.md` do Space e o nome do modelo no rótulo do texto gerado.
