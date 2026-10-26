# Versão 1.0.6 (versionCode 7) — o que muda em relação à 1.0.5 (versionCode 6)

A 1.0.5 (versionCode 6, 12/10/2026) foi gerada e testada em emulador, mas não chegou aos testadores. Esta versão sobe para **7** e
leva tudo o que o código do app ganhou desde 19/10 e a fase pós-eleição de 26/10. O site recebeu as mesmas mudanças nas datas
indicadas; o Android só muda com um release novo (decisão do mantenedor).

## O que entra
1. **Pós-eleição (26/10/2026).** Com `POS_ELEICAO` (data de `regras.json` + relógio), as respostas falam do 2º turno no passado:
   "Houve 2º turno para Presidente da República em 25/10/2026… ELEITO(A)…" pela apuração ao vivo do turno 2; sem ela, os
   classificados do pacote e o link do TSE (nunca "haverá" nem "disputam"). "Quem foi eleito…", panorama e resumo por cargo idem.
2. **Resultado por candidato.** "Lula foi eleito?", "quantos votos o X teve no segundo turno?", "o X ganhou?" respondem com a linha
   do candidato na apuração ao vivo (ou com o que o pacote traz).
3. **Título e justificativa depois da eleição.** "Onde voto?", "não votei, como justifico?", "prazo para justificar" respondem com
   justificativa por turno (03/12/2026 e 08/01/2027), multa e cancelamento (Código Eleitoral, arts. 7º e 71), sem "no dia: leve documento".
4. **Calendário** com prestação de contas final (03/11 e 14/11/2026, Lei 9.504 art. 29), diplomação até 18/12/2026 (Res. TSE
   23.760/2026) e posse de Deputados e Senadores em 1º/02/2027.
5. **Interpretação (NLU por regras):** "quem é o novo presidente", "a eleição acabou?", "qual foi a abstenção" (o app avisa que não
   traz esse total), "foi eleito", "ganhou/venceu/perdeu" → resultados; "candidatos que nunca foram eleitos" continua listagem.
6. **Contexto da IA generativa** com as datas oficiais e o tempo verbal da fase ("ocorreu" depois do 2º turno), nos dois caminhos.
7. **Desde 19/10 a 25/10 (já no site):** link novo do Autoatendimento Eleitoral, textos do 2º turno, regra "não votei no 1º turno",
   "quem já ganhou no 1º turno" e resumo nacional de governadores/senadores, propostas por tema, rótulo com o nome do modelo que
   escreveu o texto gerado, perguntas de status da votação/apuração.

## Como foi testado
- `./gradlew :app:testDebugUnitTest :app:lintRelease`: 114 testes, lint limpo (26/10/2026). Contratos compartilhados com o site:
  `contracts/nlu_golden_cases.json` (127 casos) e `contracts/answers_parity.json` (regerado).
- `./gradlew :app:bundleRelease :app:assembleRelease` + `tools/verificar_release.py app/build/outputs/apk/release/app-release.apk`.
- **Falta, e só você pode fazer:** instalar o APK de release num aparelho (ou emulador), conferir "Segundo turno para presidente",
  "Lula foi eleito?", "Onde voto?" e "Quando é a eleição?", e enviar `app/build/outputs/bundle/release/app-release.aab` ao teste
  fechado. A Play deve mostrar **7 (1.0.6)**.

## Notas da versão (texto para o console)
Eleições encerradas: o app passa a falar do 2º turno no passado, mostra quem foi eleito pela apuração oficial do TSE, responde
"fulano foi eleito?" e "quantos votos teve", explica como justificar a ausência (prazos de 03/12/2026 e 08/01/2027) e traz os
prazos de prestação de contas, diplomação e posse. Correções de interpretação e textos do 2º turno acumulados desde 19/10.
