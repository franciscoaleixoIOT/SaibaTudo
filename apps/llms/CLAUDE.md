# SaibaTudo LLMs — guia para agentes de código

> Terceiro app do ecossistema SaibaTudo (repositório único `franciscoaleixoIOT/SaibaTudo`, pasta `apps/llms/`). O molde é o **SaibaTudo Química**
> (`../quimica/`): mesma estrutura, mesmos padrões de teste e de publicação; leia o `CLAUDE.md` e o `docs/PROJECT_MEMORY.md` de lá quando precisar
> de um padrão. Guia da raiz: [`../../CLAUDE.md`](../../CLAUDE.md). Spec e plano do S1: `docs/superpowers/specs/2026-10-25-saibatudo-llms-s1-design.md`
> e `docs/superpowers/plans/2026-10-25-saibatudo-llms-s1.md` (raiz do repositório). Rode todos os comandos de dentro desta pasta.

O app ensina **como um modelo de linguagem funciona**: um explorador 3D de vetores de palavras (GloVe, 100 mil palavras em inglês, 50 dimensões,
projetadas em 3 eixos por variância ou PCA), um assistente por regras em **seis idiomas (pt-BR, en, es, de, fr e zh)**, seis seções didáticas
próprias e uma IA na nuvem opcional que só explica. Rota `saibatudo.net/llms/` (proxy no `vercel.json` de eleições, no ar desde 26/10/2026; alias direto `saibatudo-llms.vercel.app/llms/`).

## Regras que não se negociam
1. **Dados com licença e fonte.** Os vetores são o GloVe 6B (Stanford, **PDDL 1.0**); o pacote é gerado localmente (`pipeline/gerar_pacote.py`),
   assinado (ECDSA, chave em `secrets/`) e verificado no build e no aparelho. Nenhum outro embedding entra sem licença de reuso documentada em
   `docs/FONTES_E_LICENCAS.md`.
2. **Conteúdo didático de autoria própria.** As seis seções (`web/src/llms/js/conteudo/`) são texto do projeto (MIT) com referências acadêmicas
   (GloVe 2014, word2vec 2013, Transformer 2017). **Nenhuma menção a vídeo, canal ou criador de conteúdo**, nem figura ou trecho de terceiros
   (decisão do mantenedor, 25/10/2026; teste `web/test/conteudo.test.mjs`).
3. **Nenhum número vem do modelo.** Cossenos, produtos escalares, coordenadas e vizinhos são calculados no aparelho (`data.js`, `projecao.js`).
   O texto da IA na nuvem é rotulado com o nome do modelo e **rejeitado** pelo servidor se trouxer número fora do que foi enviado, sem o rodapé
   do idioma, na escrita errada ou com dado pessoal (`api/_lib/fidelidade.js`).
4. **Seis idiomas, um código.** Todo texto passa pelos catálogos (`web/src/llms/js/i18n/catalogos/`), todo padrão do interpretador vem do
   léxico (`contracts/lexico/<idioma>.json` → `tools/gerar_lexico.py`), as palavras do GloVe são inglesas e o glossário (`contracts/glossario.json`)
   traduz exemplos. Chinês: léxico sem `\b` e sem normalização de acentos (`docs/I18N.md`). Nunca escreva texto fixo em português no código do site.
5. **Sem CDN, CSP estrita, sem analytics, sem anúncios, sem login.** O gráfico 3D é Canvas 2D próprio (`cena3d.js`); não há biblioteca vendorizada.
6. **Nuvem opt-in, que só explica.** Consentimento por pergunta ou chave em Configurações (desligada por padrão); o corpo leva pergunta, idioma,
   resumo do gráfico e trechos das seções, nunca o histórico. Kill switch: `ASK_ENABLED` na Vercel. Política de privacidade em seis arquivos
   (`web/src/llms/privacidade/`), pt-BR é o texto-fonte.
7. **Segredos em `secrets/`** (ignorado): `data_signing_key.pem` (chave do pacote, diferente das dos outros apps). Na Vercel: `HF_TOKEN`; no GitHub:
   `DATA_SIGNING_KEY_LLMS`, `VERCEL_PROJECT_ID_LLMS` (o agente não grava segredos). O Space do Hugging Face é privado.
8. **Padrão do assistente** (`../../docs/PADRAO_ASSISTENTE.md`): campo que cresce, histórico ↑/↓, chips, origem e data dos dados, copiar, fechar,
   relatar, nuvem opt-in, acessibilidade. Melhoria num app → portar para os outros.

## Publicar
- Push na `main` **não** faz deploy: `gh workflow run llms-data-refresh.yml` publica (pacote versionado + build + `vercel deploy --prod`); conferir
  `https://saibatudo-llms.vercel.app/llms/api/health` (e `saibatudo.net/llms/api/health` depois do proxy).
- Conferir **todos** os workflows depois de cada push (`gh run list --limit 6`).
- Space: `python backend/hf_space_llms/publicar.py --space franciscoaleixo/saibatudo-llms --teste`. Operação completa: `docs/OPERACAO.md`.

## Testar
`cd web && npm test` (82 testes; `E2E=1` acrescenta a verificação no Chrome) · `cd api && npm test` · `python -m unittest discover -s pipeline/tests` ·
`python -m unittest discover -s tools -p "test_*.py"` · `python -m unittest discover -s backend/hf_space_llms -p "test_*.py"` ·
`python tools/gerar_lexico.py --check`. Python: venv própria (`.venv*/`, ignorada) com `numpy`, `ecdsa`, `scipy<1.17`, `gensim` (o scipy 1.18 trava o
`import gensim` nesta máquina). Antes de dizer "corrigido": reproduza, corrija, rode a suíte e teste ao vivo depois do deploy.

## Armadilhas desta máquina (Windows 11, Git Bash)
`MSYS_NO_PATHCONV=1` para argumentos que começam com `/` · scripts longos: gravar arquivo e executar, não heredoc (barras invertidas são
mutiladas) · a fonte do GloVe pode cair (GitHub/Stanford/CDN do HF fora do ar em 25/10): `--fonte hf` e o espelho do Zenodo (`--fonte <zip>`) são
alternativas · outro agente pode estar usando a árvore principal: trabalhe num worktree (`git worktree add ../SaibaTudo-llms <branch>`).
