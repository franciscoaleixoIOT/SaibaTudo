# Versão 1.0.2 (versionCode 3): perguntas de continuação com a IA na nuvem

Terceira versão do **SaibaTudo Química** no Android (`net.saibatudo.quimica`, `minSdk 24`, `targetSdk 37`). Sai no lugar da 1.0.1
(`RELEASE_1.0.1.md`, versionCode 2), que foi compilada em 17/10/2026 de madrugada mas **nunca enviada à Play**: tudo o que a 1.0.1 trazia está
aqui, mais o contexto multi-turno. Programa de 16/10 (`PROGRAMA_2026-10-16.md`), frente E e onda 3.

## O que entra (além da 1.0.1)
1. **Pergunta de continuação com a IA na nuvem.** Quando a pergunta é curta ou incompleta ("e o do potássio?", "desenhe", "e em gramas?") e existe uma
   interpretação anterior na conversa, o pedido à IA na nuvem (opt-in, como antes) leva junto a **interpretação** da pergunta anterior — só intenção e
   entidades como texto (ex.: `{"intent":"MASSA_MOLAR","composto":"Água"}`), nunca o texto da pergunta anterior, nunca o histórico, nunca o CID. Regra
   igual à do site (`docs/PADRAO_ASSISTENTE.md` §9): `ai/nlu/ContextoNuvem.kt` (`ehContinuacao`, `daPergunta`), `CloudNlu.kt`, `AssistenteNuvem.kt`.
   A resposta herdada passa pela mesma validação contra o pacote; se o servidor recusar o contexto (400), o app repete a pergunta sem ele.
2. **Pista `continuacaoNuvem` no léxico** dos 5 idiomas (gerada de `contracts/lexico/*.json` para `ai/nlu/lexico/Lexico*.kt`, igual ao site).
3. **Textos** (5 idiomas): nota da nuvem, descrição em Configurações e texto de privacidade dizem que a interpretação anterior pode ir junto.
4. O modelo da nuvem é o **SaibaTudoIA NLU v3.4** (`nlu-v3.4-20261017`), publicado em 17/10: multi-turno, comparações e conceitos.

## Build (17/10/2026, ~05h40)
`./gradlew.bat :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease`: **218 testes, 0 falhas** (7 novos em
`ContextoNuvemTest`), lint de release sem erro; `tools/verificar_release.py` OK (classes e pacote embutido `20261017T042452Z` igual a
`data/quimica`); AAB assinado com a chave de upload (`jarsigner -verify` ok): `app/build/outputs/bundle/release/app-release.aab` (8,1 MB), APK ao
lado (5,9 MB). A Play deve mostrar **3 (1.0.2)**. Não testado em aparelho real. Notas da versão para a Play em `store/play/release-notes-1.0.2.json`
(cobrem 1.0.1 + 1.0.2, porque a 1.0.1 não foi publicada).

## Pendências desta versão
- Teste em aparelho real (nuvem com contexto, 400 → repetição sem contexto).
- O texto do composto no contexto é o nome do pacote no Android ("Água") e a fórmula/nome normalizado no site ("agua"): os dois valem no contrato.
