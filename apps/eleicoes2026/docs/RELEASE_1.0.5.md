# Versão 1.0.5 (versionCode 6) — o que muda em relação à 1.0.4 (versionCode 5)

A 1.0.4 (versionCode 5) foi gerada em 10/10 mas não chegou a ser publicada no console; para não reaproveitar um versionCode
que pode ter sido enviado como rascunho, esta versão sobe para **6**. Ela contém tudo da 1.0.4 (busca por nome, "deputado"
dentro de frases) mais:

## Correções
1. **"Deputado mais votado" sem "federal/estadual" não pede mais o cargo.** O app assume Deputado Federal (no estado da
   pergunta ou do "Meu estado"), avisa como pedir a Assembleia e abre a resposta com a linha "Mais votado(a): …". Antes, a
   pergunta de esclarecimento ia como contexto para a IA da nuvem, que respondia "dado não disponível". Mesma correção do
   site (12/10/2026); casos no contrato compartilhado `contracts/nlu_golden_cases.json`.
2. **Android 15 (SDK 35), ponta a ponta.** O Play Console apontou "APIs ou parâmetros descontinuados para exibição de ponta a
   ponta": eram `android:statusBarColor` e `android:navigationBarColor` nos temas XML. Foram removidos dos três temas
   (`values`, `values-night`, `values-v31`); as barras transparentes continuam vindo de `enableEdgeToEdge()` na
   `MainActivity`, que vale também para versões anteriores. O conteúdo já respeitava os recuos (Scaffold/TopAppBar do
   Material 3 e `statusBarsPadding`/`navigationBarsPadding` no onboarding).

## Como foi testado
- `./gradlew :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease`: 103 testes, lint limpo,
  `tools/verificar_release.py` OK (classes do R8 presentes).
- **Falta, e só você pode fazer:** instalar o release num aparelho com Android 15 (ou o emulador API 35) e conferir que
  nada fica sob a barra de status/navegação nas telas principal, configurações, sobre os dados e onboarding; depois enviar
  `app/build/outputs/bundle/release/app-release.aab` ao teste fechado. A Play deve mostrar **6 (1.0.5)**.

## Notas da versão (texto para o console)
Correções: a pergunta "deputado mais votado" agora responde direto com o deputado federal mais votado do seu estado (e explica
como ver a Assembleia). Compatibilidade com o Android 15: exibição de ponta a ponta atualizada.
