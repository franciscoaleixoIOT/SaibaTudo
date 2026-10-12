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
3. **Tela de boas-vindas no Android 15:** ao rolar, o conteúdo claro passava por baixo da barra de status (ícones claros) e o
   relógio ficava ilegível — visto no emulador Pixel 9/API 35. Agora há um véu escuro fixo com a altura da barra de status
   (`windowInsetsTopHeight(WindowInsets.statusBars)`) sobre o conteúdo rolável.

## Como foi testado
- `./gradlew :app:testDebugUnitTest :app:lintRelease :app:bundleRelease :app:assembleRelease`: 103 testes, lint limpo,
  `tools/verificar_release.py` OK (classes do R8 presentes).
- **Testado em 12/10/2026 nos emuladores Pixel 9 (Android 15, API 35) e Medium Phone (Android 16, API 36)**, com o APK de
  release assinado: onboarding (topo e rolado), tela principal, diálogo de resultados, configurações e a resposta de
  "deputado mais votado". **Falta, e só você pode fazer:** conferir num aparelho real se quiser e enviar
  `app/build/outputs/bundle/release/app-release.aab` ao teste fechado. A Play deve mostrar **6 (1.0.5)**.

## Notas da versão (texto para o console)
Correções: a pergunta "deputado mais votado" agora responde direto com o deputado federal mais votado do seu estado (e explica
como ver a Assembleia). Compatibilidade com o Android 15: exibição de ponta a ponta atualizada.
