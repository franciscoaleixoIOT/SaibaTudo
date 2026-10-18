# Versão 1.0.3 (versionCode 4): calculadoras do mapa dos livros e termoquímica

Quarta versão do **SaibaTudo Química** no Android (`net.saibatudo.quimica`, `minSdk 24`, `targetSdk 37`). Sai no lugar da 1.0.2
(`RELEASE_1.0.2.md`, versionCode 3), compilada em 17/10/2026 e **nunca enviada à Play**: tudo o que a 1.0.1 e a 1.0.2 traziam está aqui.
Origem: mapa dos livros didáticos (`MAPA_LIVROS.md`) e calculadoras novas (`CALCULADORAS_2026-10-17.md`, incluindo a §7 de 18/10).

## O que entra (além da 1.0.2)
1. **Cinco calculadoras novas** na tela Calculadoras e nas respostas, em paridade com o site: entalpia (formação, combustão e lei de Hess),
   configuração eletrônica enriquecida (notação completa, camadas, valência, íons), NOX por regra, Kc/Kp (expressão, Δn, Kp = Kc(RT)^Δn, valor
   com concentrações) e tipo de ligação por eletronegatividade de Pauling (`domain/calc/{Entalpia,Eletronica,Nox,Equilibrio,Ligacao}.kt`,
   `ai/answer/RespostasCalculadoras.kt`). Intenções novas NOX, ENTALPIA, EQUILIBRIO e LIGACAO na interpretação local (`LocalNlu` passos 2b/5b) e
   no contrato da nuvem.
2. **Termoquímica padrão no pacote embutido** (`20261018T051923Z`): ΔHf° em 281 compostos, ΔGf° em 81, S° em 258 (chembox da Wikipédia em
   inglês, CC BY-SA 4.0, com link permanente por valor; Wikidata só com referência própria). As três aparecem na ficha do composto e nas
   respostas de PROPRIEDADE/COMPARAR (`energiaGibbsFormacaoKJmol`, `entropiaPadraoJmolK`); sem valor, o app diz que falta e não estima.
3. **Prótons, nêutrons e elétrons** de átomos e íons (`particulas`): "quantos elétrons tem o Fe2+", "nêutrons do C-14" — carga e número de massa
   lidos da pergunta (`cargaFormula`, `numeroMassa`, só no aparelho); sem número de massa, A é a massa atômica arredondada, rotulada como aproximação.
4. **Kc/Kp sem equação** ("como calcular o Kc") vira o conceito "constante de equilíbrio" com a ação "Abrir a calculadora de Kc e Kp".
5. **Léxico dos 5 idiomas** regenerado de `contracts/lexico/*.json` (formas das propriedades novas, pistas de íon, isótopo e constante de
   equilíbrio); golden do NLU 873 → 984 casos, conferido no app. Textos novos nos 5 idiomas (en/es/de/fr revisados por agente, não por falante
   nativo; `fonte_constante_r` e os textos das calculadoras passaram por revisão de terminologia em 18/10).
6. A IA na nuvem (opt-in) continua a interpretar com o modelo publicado no serviço; o v3.5 (treinado nas intenções novas) entra no serviço quando
   passar no gate — até lá, as perguntas das calculadoras são resolvidas pelas regras locais do app.

## Build (18/10/2026, ~03h15)
`./gradlew.bat :app:bundleRelease :app:assembleRelease :app:lintRelease` (depois de `:app:testDebugUnitTest` e `:app:lintDebug` no mesmo
código): **255 testes, 0 falhas** (7 novos em `CalculadorasRespostasTest`, `NluParticulasTermoTest` novo), lint de release **0 erros**, 19 avisos
(dependências mais novas, os mesmos de antes); `tools/verificar_release.py` OK (5 classes obrigatórias no release; pacote embutido completo e igual
a `data/quimica`); AAB assinado com a chave de upload (`jarsigner -verify`: jar verified): `app/build/outputs/bundle/release/app-release.aab`
(8,3 MB), APK ao lado (6,1 MB). A Play deve mostrar **4 (1.0.3)**. Notas da versão em `store/play/release-notes-1.0.3.json` (cobrem 1.0.1 a
1.0.3, porque nenhuma foi publicada).

## Pendências desta versão
- **Teste em aparelho real** (nenhum aparelho estava conectado em 18/10 de madrugada): tela Calculadoras (5 cartões), ficha do composto com
  ΔHf°/ΔGf°/S°, resposta de íon e isótopo, ação "Abrir a calculadora de Kc e Kp", nuvem com contexto (400 → repetição sem contexto, pendente
  desde a 1.0.2).
- Revisão por falante nativo dos textos novos en/es/de/fr.
- Backup offline da chave de upload (`secrets/upload-keystore.p12` + `keystore.properties`), pendente desde 14/10.
