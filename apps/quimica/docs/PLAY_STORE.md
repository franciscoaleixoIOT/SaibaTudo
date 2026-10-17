# Publicação na Google Play — SaibaTudo Química

Pacote: **`net.saibatudo.quimica`** · Nome na loja: **SaibaTudo Química** · Versão inicial: `1.0.0` (versionCode 1) · minSdk 24 · targetSdk 37
Molde: [`apps/eleicoes2026/docs/PLAY_STORE.md`](../../eleicoes2026/docs/PLAY_STORE.md) (mesmas seções e mesma ordem). Tudo que pode ser
preparado fora do Play Console está pronto neste repositório. **O envio e as declarações exigem acesso manual à conta** (a conta de
desenvolvedor não é acessível por este projeto).

Estado em 14/10/2026: a **IA na nuvem** (interpretação opcional da pergunta, `/quimica/api/nlu`) está sendo ligada hoje no site e no
Android. Esta ficha, as declarações e o Data safety descrevem o app **com** a IA na nuvem. A política de privacidade **v1.1 de 14/10**
(cinco idiomas, já no ar em `saibatudo.net/quimica/privacidade`) também; falta nela só o relato de erro pelo GitHub (§9, item 1).

## 1. Artefatos prontos

| Item | Arquivo |
| :-- | :-- |
| App Bundle assinado (chave de upload) | `app/build/outputs/bundle/release/app-release.aab` (7,6 MB, `1.0.0` / versionCode 1, gerado em 14/10; refazer com `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew.bat bundleRelease` se o código mudar). O APK de release (R8) tem 5,4 MB e as duas bibliotecas nativas do AndroidX estão alinhadas a 16 KB (conferido nos cabeçalhos ELF). `docs/RELEASE_1.0.0.md` registra os testes dessa versão |
| Chave de upload | `secrets/upload-keystore.p12` + `keystore.properties` (ambos ignorados pelo Git). **Faça backup agora** (cofre de senhas + cópia offline). Ative o **Play App Signing** (padrão): se a chave de upload for perdida, o Google permite redefini-la |
| Ícone 512×512 (quadrado, sem cantos — a Play aplica a máscara) | `store/play/icon-512.png` (cópia de `brand/png/play-icon-512.png`, gerado por `web/tools/gerar_icones.mjs` a partir de `brand/quimica-icon.svg`) |
| Gráfico de recursos 1024×500 | `store/play/feature-graphic-1024x500.png` (pt-BR) e `…-en.png`, `…-es.png`, `…-de.png`, `…-fr.png` (um por localização). Gerados por `store/play/fonte/grafico.mjs` (Chrome headless + Poppins de `brand/fonts`) |
| Capturas de tela (1080×1920, 9:16) | **Do app Android** (APK de release no emulador Pixel 9, API 35): `store/play/screenshots/*.png` (pt-BR, 01–08 + alternativa) e `store/play/screenshots/{en,es,de,fr}/01…08*.png`. Capturas do PWA ficam em `store/play/screenshots/pwa/` só como reserva. Detalhes no §3.4 |
| Notas de versão em 5 idiomas | `store/play/release-notes-1.0.0.json` (texto igual ao §3.5) |
| Política de privacidade | `web/src/quimica/privacidade/index.html` (+ `en.html`, `es.html`, `de.html`, `fr.html`) → publicada em `https://saibatudo.net/quimica/privacidade` (o seletor de idioma da página escolhe o idioma; no Console cabe uma única URL) |
| Respostas do Data safety e do App content | seções 4 e 5 deste documento |

## 2. Pré-requisitos e prazos (verificar HOJE)
1. **Play Console › Configurações › Detalhes da conta**: confirme se a conta é **pessoal** ou **organização** e a data de criação.
   - Conta **pessoal criada após 13/11/2023**: é obrigatório um **teste fechado com ≥ 12 testadores, opt-in contínuo por ≥ 14 dias**
     antes de pedir acesso à produção (depois, a análise leva "até 7 dias ou mais"). Confirme no painel **deste app** (Testar e lançar)
     se o requisito se repete para o segundo app da conta; assuma que sim. Os mesmos 12 testadores do Eleições servem, mas cada um
     precisa entrar no teste **deste** app. Estimativa: teste fechado começando em 20/10 → pedido de produção por volta de 03/11 →
     produção em meados ou fim de novembro (o prazo real depende da análise do Google).
   - Conta de organização ou conta pessoal antiga: a regra acima não se aplica; a revisão do 1º envio leva de 1 a 7 dias.
2. **Verificação de desenvolvedor do Android** (em vigor no Brasil desde 30/09/2026 em dispositivos certificados): confira no Play
   Console se há pedido de registro do pacote `net.saibatudo.quimica`; o APK distribuído fora da Play só instala sem atrito se o pacote
   estiver registrado.
3. **targetSdk 37** (≥ 36 exigido para apps novos desde 31/08/2026) ✔. AAB ✔ (7,6 MB). Bibliotecas nativas alinhadas a 16 KB ✔
   (conferido no APK de release; o emulador usado nas capturas é uma imagem de 16 KB e o app abriu normalmente). APK de ~5,4 MB ✔
   (inclui o pacote de dados embutido: 14,7 MB descomprimido, 2,8 MB no APK).
4. **Conta de serviço da Play API** (§8): em 14/10 não existe `secrets/play-service-account.json` em nenhum dos dois apps. Crie uma vez
   e reutilize para os dois.
5. **IA na nuvem fora do ar não pode quebrar o app**: tudo responde localmente; a nuvem é opcional (o `GET /quimica/api/health` mostra
   `nlu` ligada e `ask` desligada em 14/10).

## 3. Ficha da loja

### 3.1 Dados gerais
- **Nome (≤ 30):** `SaibaTudo Química` (17 caracteres), igual em todos os idiomas (é a marca; `app_name` não é traduzido no app).
- **Idioma padrão:** Português (Brasil) – pt-BR. **Localizações adicionais:** en-US, es-419, de-DE, fr-FR (os cinco idiomas do app).
  A Play mostra a localização mais próxima do idioma do aparelho; sem localização, cai na padrão.
- **Categoria:** **Educação** (alternativa: Livros e referências). **Evite "Saúde e fitness"** e "Notícias e revistas".
- **Preço:** gratuito, sem compras no app, sem anúncios.
- **E-mail de contato:** `saibatudo@saibatudo.net` · **Site:** `https://saibatudo.net/quimica/` · **Política de privacidade:**
  `https://saibatudo.net/quimica/privacidade` · **Código-fonte:** `https://github.com/franciscoaleixoIOT/SaibaTudo`

### 3.2 Ficha em pt-BR (idioma padrão)

- **Nome (≤ 30):** `SaibaTudo Química` (17 caracteres)
- **Descrição curta (≤ 80):** `Elementos, compostos, cálculos e segurança química com fontes abertas.` (70 caracteres)
- **Descrição completa (≤ 4000):** 3035 caracteres (contados com quebras de linha; o texto abaixo é o que se cola)

```
Consulte Química com dados abertos e fontes à vista: elementos, compostos, perigos e cálculos com passo a passo, no celular e até sem internet.

O QUE VOCÊ ENCONTRA
• Pergunte do seu jeito: "massa molar da água", "balancear Fe + O2 -> Fe2O3", "perigos do ácido sulfúrico". A resposta é montada no seu aparelho a partir dos dados, e cada bloco mostra a fonte, a licença e a data.
• Tabela periódica interativa com os 118 elementos, com filtros por categoria, bloco, período, grupo e estado físico, e uma ficha completa de cada elemento.
• Cerca de 2.000 compostos, com nome, fórmula, estrutura 2D desenhada no aparelho, propriedades e classificação de perigo GHS com pictogramas.
• Segurança química: perigos GHS, cuidados e primeiros socorros em linguagem simples, avisos sobre misturas que nunca se deve fazer e link para a ficha ICSC da OIT.
• Calculadoras com passo a passo: massa molar, balanceamento de equações, estequiometria, concentração e diluição, pH de ácidos e bases fortes e fracos, gás ideal e conversão de unidades.
• Cinco idiomas, escolhidos dentro do app: português do Brasil, inglês, espanhol, alemão e francês.
• Funciona offline: o pacote de dados já vem no app e se atualiza pela internet; cada atualização é conferida por assinatura digital.
• Tema claro, escuro ou do sistema, tamanho de texto ajustável, sem anúncios e sem cadastro.

IA QUE AJUDA, SEM INVENTAR NÚMEROS
• Nenhum número vem de modelo de IA. Massas, constantes, propriedades e perigos saem do pacote de dados assinado ou de cálculos feitos no aparelho e testados.
• A IA na nuvem é opcional e vem desligada. Só quando você toca em "Perguntar à IA na nuvem" (ou liga o modo automático em Configurações), o texto daquela pergunta é enviado para ser interpretado. A resposta continua vindo dos dados do app.
• Achou um erro? Você pode relatar o problema direto no app.

SEGURANÇA EM PRIMEIRO LUGAR
• Pedidos de síntese ou de "como fazer em casa" de explosivos, drogas, armas químicas e seus precursores são recusados por regra, antes de qualquer modelo de IA. Perigos, EPI e primeiros socorros continuam sendo respondidos.
• Conteúdo educativo e informativo: não substitui a ficha de segurança do produto nem a orientação de um profissional. Em emergência, procure o serviço de emergência local.

FONTES E LICENÇAS
PubChem (NCBI/NLM) e CODATA/NIST (domínio público), Wikidata (CC0), regulamento CLP da União Europeia (EUR-Lex), ChEBI (CC BY), Wikipédia e Wikilivros (CC BY-SA). As fichas ICSC da OIT/OMS entram apenas como link. A lista completa, com licenças e datas, está em "Sobre os dados".

PRIVACIDADE
Sem login, sem anúncios, sem análise de uso e sem localização. A internet serve para atualizar os dados e, só se você pedir, para a IA na nuvem: nesse caso, o texto da pergunta (até 300 caracteres) e um identificador aleatório da instalação são enviados ao nosso servidor apenas para interpretar a pergunta; o texto não é guardado.

Aplicativo independente, gratuito e de código aberto (licença MIT): github.com/franciscoaleixoIOT/SaibaTudo
```

### 3.3 Localizações adicionais (en-US, es-419, de-DE, fr-FR)

O nome é o mesmo nas cinco localizações. Tom: *tú* em espanhol, *Sie* em alemão, *vous* em francês (como no app, `docs/I18N.md` §8). Os textos são de agente, com o glossário do projeto, e aguardam revisão de falante nativo (mesma pendência do app). Para o espanhol usei `es-419` (América Latina, coerente com o público do app); acrescente `es-ES` colando o mesmo texto, se quiser.

| Localização | Descrição curta (≤ 80) | Descrição completa (≤ 4000) | Notas da versão (≤ 500) |
| :-- | --: | --: | --: |
| Português (Brasil) – pt-BR | 70 | 3035 | 259 |
| English (United States) – en-US | 72 | 2898 | 254 |
| Español (Latinoamérica) – es-419 | 73 | 3152 | 266 |
| Deutsch – de-DE | 73 | 3245 | 250 |
| Français (France) – fr-FR | 67 | 3312 | 275 |

#### English (United States) – en-US

- **Nome:** `SaibaTudo Química`
- **Descrição curta (72/80):** `Elements, compounds, calculations and chemical safety from open sources.`
- **Descrição completa (2898/4000):**

```
Explore chemistry with open data and sources in plain sight: elements, compounds, hazards and step-by-step calculations on your phone, even without internet.

WHAT YOU GET
• Ask in your own words: "molar mass of water", "balance Fe + O2 -> Fe2O3", "hazards of sulfuric acid". The answer is built on your device from the data, and every block shows its source, license and date.
• Interactive periodic table with all 118 elements, filters by category, block, period, group and state of matter, and a full page for each element.
• About 2,000 compounds with name, formula, a 2D structure drawn on your device, properties and GHS hazard classification with pictograms.
• Chemical safety: GHS hazards, precautions and first-aid guidance in plain language, warnings about mixtures you must never make, and a link to the ILO's ICSC card.
• Calculators with step-by-step work: molar mass, equation balancing, stoichiometry, concentration and dilution, pH of strong and weak acids and bases, ideal gas and unit conversion.
• Five languages, chosen inside the app: Brazilian Portuguese, English, Spanish, German and French.
• Works offline: the data package comes with the app and updates over the internet; every update is checked with a digital signature.
• Light, dark or system theme, adjustable text size, no ads and no sign-up.

AI THAT HELPS, WITHOUT INVENTING NUMBERS
• No number comes from an AI model. Masses, constants, properties and hazards come from the signed data package or from tested calculations on your device.
• The cloud AI is optional and off by default. Only when you tap "Ask the cloud AI" (or turn on automatic mode in Settings) is the text of that question sent to be interpreted. The answer still comes from the app's data.
• Found a mistake? You can report the problem right from the app.

SAFETY FIRST
• Requests for synthesis or "how to make it at home" of explosives, drugs, chemical weapons and their precursors are refused by rule, before any AI model. Hazards, PPE and first aid are still answered.
• Educational and informational content: it does not replace the product's safety data sheet or professional advice. In an emergency, contact your local emergency services.

SOURCES AND LICENSES
PubChem (NCBI/NLM) and CODATA/NIST (public domain), Wikidata (CC0), the European Union CLP Regulation (EUR-Lex), ChEBI (CC BY), Wikipedia and Wikibooks (CC BY-SA). The ILO/WHO ICSC cards are only linked. The full list, with licenses and dates, is under "About the data".

PRIVACY
No login, no ads, no usage analytics and no location. The internet is used to update the data and, only if you ask, for the cloud AI: in that case the question text (up to 300 characters) and a random installation identifier are sent to our server only to interpret the question; the text is not stored.

Independent, free and open-source app (MIT license): github.com/franciscoaleixoIOT/SaibaTudo
```

#### Español (Latinoamérica) – es-419

- **Nome:** `SaibaTudo Química`
- **Descrição curta (73/80):** `Elementos, compuestos, cálculos y seguridad química con fuentes abiertas.`
- **Descrição completa (3152/4000):**

```
Consulta Química con datos abiertos y fuentes a la vista: elementos, compuestos, peligros y cálculos paso a paso, en tu celular y hasta sin internet.

QUÉ ENCONTRARÁS
• Pregunta a tu manera: "masa molar del agua", "balancear Fe + O2 -> Fe2O3", "peligros del ácido sulfúrico". La respuesta se arma en tu dispositivo a partir de los datos, y cada bloque muestra la fuente, la licencia y la fecha.
• Tabla periódica interactiva con los 118 elementos, con filtros por categoría, bloque, periodo, grupo y estado físico, y una ficha completa de cada elemento.
• Cerca de 2000 compuestos, con nombre, fórmula, estructura 2D dibujada en tu dispositivo, propiedades y clasificación de peligro SGA con pictogramas.
• Seguridad química: peligros SGA, precauciones y primeros auxilios en lenguaje sencillo, avisos sobre mezclas que nunca se deben hacer y enlace a la ficha ICSC de la OIT.
• Calculadoras paso a paso: masa molar, balanceo de ecuaciones, estequiometría, concentración y dilución, pH de ácidos y bases fuertes y débiles, gas ideal y conversión de unidades.
• Cinco idiomas, a elegir dentro de la app: portugués de Brasil, inglés, español, alemán y francés.
• Funciona sin conexión: el paquete de datos ya viene en la app y se actualiza por internet; cada actualización se comprueba con una firma digital.
• Tema claro, oscuro o del sistema, tamaño de texto ajustable, sin anuncios y sin registro.

IA QUE AYUDA, SIN INVENTAR NÚMEROS
• Ningún número proviene de un modelo de IA. Masas, constantes, propiedades y peligros salen del paquete de datos firmado o de cálculos hechos en tu dispositivo y probados.
• La IA en la nube es opcional y viene desactivada. Solo cuando tocas "Preguntar a la IA en la nube" (o activas el modo automático en Configuración), el texto de esa pregunta se envía para interpretarlo. La respuesta sigue saliendo de los datos de la app.
• ¿Encontraste un error? Puedes informar del problema desde la app.

LA SEGURIDAD, PRIMERO
• Las solicitudes de síntesis o de "cómo hacerlo en casa" de explosivos, drogas, armas químicas y sus precursores se rechazan por regla, antes de cualquier modelo de IA. Los peligros, los EPP y los primeros auxilios se siguen respondiendo.
• Contenido educativo e informativo: no reemplaza la ficha de seguridad del producto ni el consejo de un profesional. En una emergencia, llama a los servicios de emergencia locales.

FUENTES Y LICENCIAS
PubChem (NCBI/NLM) y CODATA/NIST (dominio público), Wikidata (CC0), el reglamento CLP de la Unión Europea (EUR-Lex), ChEBI (CC BY), Wikipedia y Wikibooks (CC BY-SA). Las fichas ICSC de la OIT/OMS solo se enlazan. La lista completa, con licencias y fechas, está en "Sobre los datos".

PRIVACIDAD
Sin inicio de sesión, sin anuncios, sin analíticas de uso y sin ubicación. Internet se usa para actualizar los datos y, solo si lo pides, para la IA en la nube: en ese caso, el texto de la pregunta (hasta 300 caracteres) y un identificador aleatorio de la instalación se envían a nuestro servidor solo para interpretar la pregunta; el texto no se guarda.

App independiente, gratuita y de código abierto (licencia MIT): github.com/franciscoaleixoIOT/SaibaTudo
```

#### Deutsch – de-DE

- **Nome:** `SaibaTudo Química`
- **Descrição curta (73/80):** `Elemente, Verbindungen, Rechner und Chemiesicherheit aus offenen Quellen.`
- **Descrição completa (3245/4000):**

```
Entdecken Sie Chemie mit offenen Daten und sichtbaren Quellen: Elemente, Verbindungen, Gefahren und Berechnungen Schritt für Schritt, auf dem Smartphone und sogar ohne Internet.

DAS FINDEN SIE
• Fragen Sie in Ihren eigenen Worten: „Molare Masse von Wasser“, „Fe + O2 -> Fe2O3 ausgleichen“, „Gefahren von Schwefelsäure“. Die Antwort wird auf Ihrem Gerät aus den Daten erstellt, und jeder Block zeigt Quelle, Lizenz und Datum.
• Interaktives Periodensystem mit allen 118 Elementen, Filtern nach Kategorie, Block, Periode, Gruppe und Aggregatzustand sowie einem vollständigen Steckbrief je Element.
• Rund 2.000 Verbindungen mit Name, Formel, auf Ihrem Gerät gezeichneter 2D-Struktur, Eigenschaften und GHS-Gefahreneinstufung mit Piktogrammen.
• Chemikaliensicherheit: GHS-Gefahren, Vorsichtsmaßnahmen und Erste Hilfe in einfacher Sprache, Warnungen vor Mischungen, die man nie herstellen darf, und ein Link zum ICSC-Datenblatt der ILO.
• Rechner mit Rechenweg: molare Masse, Reaktionsgleichungen ausgleichen, Stöchiometrie, Konzentration und Verdünnung, pH starker und schwacher Säuren und Basen, ideales Gas und Einheitenumrechnung.
• Fünf Sprachen, direkt in der App wählbar: Brasilianisches Portugiesisch, Englisch, Spanisch, Deutsch und Französisch.
• Funktioniert offline: Das Datenpaket ist in der App enthalten und wird über das Internet aktualisiert; jedes Update wird per digitaler Signatur geprüft.
• Helles, dunkles oder System-Design, einstellbare Schriftgröße, keine Werbung und keine Anmeldung.

KI, DIE HILFT, OHNE ZAHLEN ZU ERFINDEN
• Keine Zahl stammt aus einem KI-Modell. Massen, Konstanten, Eigenschaften und Gefahren kommen aus dem signierten Datenpaket oder aus getesteten Berechnungen auf Ihrem Gerät.
• Die KI in der Cloud ist optional und standardmäßig aus. Nur wenn Sie auf „KI in der Cloud fragen“ tippen (oder in den Einstellungen den Automatikmodus einschalten), wird der Text dieser Frage zur Deutung gesendet. Die Antwort stammt weiterhin aus den Daten der App.
• Fehler entdeckt? Sie können das Problem direkt in der App melden.

SICHERHEIT ZUERST
• Anfragen zur Synthese oder zum „Selbermachen zu Hause“ von Sprengstoffen, Drogen, chemischen Kampfstoffen und deren Vorläufern werden per Regel abgelehnt, noch vor jedem KI-Modell. Gefahren, Schutzausrüstung und Erste Hilfe werden weiterhin beantwortet.
• Bildungs- und Informationsinhalt: ersetzt weder das Sicherheitsdatenblatt des Produkts noch fachlichen Rat. Im Notfall wenden Sie sich an den örtlichen Notruf.

QUELLEN UND LIZENZEN
PubChem (NCBI/NLM) und CODATA/NIST (gemeinfrei), Wikidata (CC0), CLP-Verordnung der EU (EUR-Lex), ChEBI (CC BY), Wikipedia und Wikibooks (CC BY-SA). Die ICSC-Datenblätter der ILO/WHO sind nur verlinkt. Die vollständige Liste mit Lizenzen und Daten steht unter „Über die Daten“.

DATENSCHUTZ
Keine Anmeldung, keine Werbung, keine Nutzungsanalyse und kein Standort. Das Internet dient dem Aktualisieren der Daten und, nur auf Ihren Wunsch, der KI in der Cloud: Dann werden der Fragetext (bis zu 300 Zeichen) und eine zufällige Installationskennung nur zur Deutung der Frage an unseren Server gesendet; der Text wird nicht gespeichert.

Unabhängige, kostenlose Open-Source-App (MIT-Lizenz): github.com/franciscoaleixoIOT/SaibaTudo
```

#### Français (France) – fr-FR

- **Nome:** `SaibaTudo Química`
- **Descrição curta (67/80):** `Éléments, composés, calculs et sécurité chimique, sources ouvertes.`
- **Descrição completa (3312/4000):**

```
Consultez la chimie avec des données ouvertes et des sources toujours visibles : éléments, composés, dangers et calculs pas à pas, sur votre téléphone et même sans internet.

CE QUE VOUS TROUVEZ
• Posez vos questions à votre façon : « masse molaire de l’eau », « équilibrer Fe + O2 -> Fe2O3 », « dangers de l’acide sulfurique ». La réponse est construite sur votre appareil à partir des données, et chaque bloc indique la source, la licence et la date.
• Tableau périodique interactif avec les 118 éléments, des filtres par catégorie, bloc, période, groupe et état physique, et une fiche complète pour chaque élément.
• Environ 2 000 composés, avec nom, formule, structure 2D dessinée sur votre appareil, propriétés et classification de danger SGH avec pictogrammes.
• Sécurité chimique : dangers SGH, précautions et premiers secours en langage simple, avertissements sur les mélanges à ne jamais faire et lien vers la fiche ICSC de l’OIT.
• Calculatrices pas à pas : masse molaire, équilibrage d’équations, stœchiométrie, concentration et dilution, pH des acides et bases forts et faibles, gaz parfait et conversion d’unités.
• Cinq langues, à choisir dans l’appli : portugais du Brésil, anglais, espagnol, allemand et français.
• Fonctionne hors ligne : le jeu de données est inclus dans l’appli et se met à jour via internet ; chaque mise à jour est vérifiée par une signature numérique.
• Thème clair, sombre ou du système, taille du texte réglable, sans publicité et sans inscription.

UNE IA QUI AIDE, SANS INVENTER DE NOMBRES
• Aucun nombre ne vient d’un modèle d’IA. Masses, constantes, propriétés et dangers proviennent du jeu de données signé ou de calculs testés effectués sur votre appareil.
• L’IA dans le cloud est facultative et désactivée par défaut. Seulement quand vous touchez « Demander à l’IA dans le cloud » (ou activez le mode automatique dans les Paramètres), le texte de cette question est envoyé pour être interprété. La réponse continue de venir des données de l’appli.
• Une erreur ? Vous pouvez signaler le problème directement dans l’appli.

LA SÉCURITÉ D’ABORD
• Les demandes de synthèse ou de « fabrication maison » d’explosifs, de drogues, d’armes chimiques et de leurs précurseurs sont refusées par règle, avant tout modèle d’IA. Les dangers, les EPI et les premiers secours restent traités.
• Contenu éducatif et informatif : ne remplace ni la fiche de données de sécurité du produit ni l’avis d’un professionnel. En cas d’urgence, contactez les secours locaux.

SOURCES ET LICENCES
PubChem (NCBI/NLM) et CODATA/NIST (domaine public), Wikidata (CC0), règlement CLP de l’Union européenne (EUR-Lex), ChEBI (CC BY), Wikipédia et Wikibooks (CC BY-SA). Les fiches ICSC de l’OIT/OMS ne sont que liées. La liste complète, avec licences et dates, se trouve dans « À propos des données ».

CONFIDENTIALITÉ
Sans compte, sans publicité, sans analyse d’usage et sans localisation. Internet sert à mettre à jour les données et, seulement si vous le demandez, à l’IA dans le cloud : dans ce cas, le texte de la question (300 caractères maximum) et un identifiant aléatoire de l’installation sont envoyés à notre serveur uniquement pour interpréter la question ; le texte n’est pas conservé.

Appli indépendante, gratuite et open source (licence MIT) : github.com/franciscoaleixoIOT/SaibaTudo
```


### 3.4 Imagens e capturas de tela

| Imagem | Arquivo | Observação |
| :-- | :-- | :-- |
| Ícone (512×512, PNG 32 bits) | `store/play/icon-512.png` | frasco de laboratório com líquido verde e bolhas douradas sobre o fundo azul-marinho da marca, sem cantos arredondados; é o mesmo desenho do ícone adaptativo do app |
| Gráfico de recursos (1024×500, PNG 24 bits, sem transparência) | `store/play/feature-graphic-1024x500.png` (+ `-en/-es/-de/-fr`) | logotipo "SaibaTudo **Química**", frase curta e nota "gratuito · offline · código aberto". Sem selos de terceiros (PubChem, OIT, IUPAC) e sem "oficial" |
| Capturas de telefone (1080×1920) | `store/play/screenshots/` | tabela abaixo; o Console aceita de 2 a 8 por tipo de dispositivo |

**As capturas são do app Android** (APK de release `1.0.0`, com a IA na nuvem, instalado no emulador Pixel 9 / Android 15 / imagem de
16 KB, tela forçada a 1080×1920 e 420 dpi, relógio 10:00 e bateria cheia pelo "demo mode" da barra de status, animações desligadas),
uma pasta por idioma: `screenshots/` = pt-BR; `screenshots/en/`, `es/`, `de/`, `fr/`. Cada pasta tem as mesmas oito telas:

| Arquivo | Mostra |
| :-- | :-- |
| `01-inicio.png` | início: campo de pergunta, atalhos, sugestões e o aviso "nada sai do aparelho, a menos que você peça à IA na nuvem" |
| `02-resposta-massa-molar.png` | resposta montada no aparelho, com passo a passo, fonte e licença (massa molar do NaCl) |
| `03-ia-nuvem-opcional.png` | fim da resposta: o botão **"Perguntar à IA na nuvem"** e a nota de consentimento (o que sai do aparelho, até 25 s). É a tela que mostra ao revisor que a IA é opcional |
| `04-seguranca-ghs.png` | segurança: pictograma GHS, palavra de sinal e frases H (etanol; tolueno em francês) |
| `05-tabela-periodica.png` | tabela periódica com legenda por categoria (metais de transição) |
| `06-composto-estrutura.png` | composto (cafeína) com a estrutura 2D desenhada no aparelho |
| `07-calculadora-balanceamento.png` | calculadora de balanceamento com passo a passo |
| `08-elemento-ferro.png` | ficha do elemento (ferro) |
| `09-tema-escuro.png` | alternativa só em pt-BR: a resposta de `02` no tema escuro |

Ordem sugerida de envio (as três primeiras são as que mais aparecem): 02, 03, 06, 05, 04, 07, 01, 08.

Como foram feitas (e como refazer): `store/play/fonte/capturas_android.py` (com `andutil.py` ao lado) dirige o app por ADB e uiautomator:
`python store/play/fonte/capturas_android.py <pasta> pt-BR` (idiomas `en`, `es`, `de`, `fr`; `--escuro` para o tema escuro). Precisa do
emulador `Pixel_9` ligado (`emulator -avd Pixel_9 -no-window -gpu swiftshader_indirect`), do APK instalado (`adb install -r
app/build/outputs/apk/release/app-release.apk`) e de `adb shell wm size 1080x1920`. O `adb input text` só digita ASCII, então as perguntas
foram escolhidas sem acento ("massa molar do NaCl", "perigos do etanol"). Dá para refazer num aparelho real com `adb exec-out screencap -p`
(precisa estar em 9:16: um aparelho de 20:9, como o Pixel 9 de fábrica, 1080×2424, **não serve**, porque o lado maior não pode passar do
dobro do menor). Os gráficos: `node store/play/fonte/grafico.mjs`. Depois de usar o emulador: `adb shell wm size reset`, `adb shell wm density reset`, `adb emu kill`.

Reserva, **não usar na produção**: `screenshots/pwa/` tem capturas do PWA (`https://saibatudo.net/quimica/`, pt-BR) feitas com Chrome
headless por `store/play/fonte/capturas.mjs`. A interface do site é diferente da do app, e a política de metadados da Play exige que as
imagens mostrem o app de verdade.

Observações sobre o conteúdo das capturas: a resposta de segurança traz uma linha "Classificação: Regulation (EC) No 1272/2008…" em
inglês (e repetida) vinda do pacote de dados, e a linha "Fonte: … — domínio público" também é do pacote em português em todos os
idiomas; são detalhes do app e dos dados, não da captura. As traduções do app são de agente e aguardam revisão de falante nativo.

### 3.5 Notas de versão 1.0.0
`docs/RELEASE_1.0.0.md` traz um texto equivalente só em pt-BR; use os abaixo (cinco idiomas, mesmo conteúdo).

Texto por localização (≤ 500 caracteres cada; a Play pede o código do idioma, como em `store/play/release-notes-1.0.0.json`):

- **pt-BR** (259): `Primeira versão: tabela periódica, cerca de 2.000 compostos com estrutura 2D e perigos GHS, calculadoras com passo a passo, assistente de perguntas com fonte e licença em cada resposta, cinco idiomas e uso offline. IA na nuvem opcional (desligada por padrão).`
- **en-US** (254): `First release: periodic table, about 2,000 compounds with 2D structures and GHS hazards, step-by-step calculators, a question assistant that shows the source and license in every answer, five languages and offline use. Optional cloud AI (off by default).`
- **es-419** (266): `Primera versión: tabla periódica, cerca de 2000 compuestos con estructura 2D y peligros SGA, calculadoras paso a paso, asistente de preguntas con fuente y licencia en cada respuesta, cinco idiomas y uso sin conexión. IA en la nube opcional (desactivada por defecto).`
- **de-DE** (250): `Erste Version: Periodensystem, rund 2.000 Verbindungen mit 2D-Struktur und GHS-Gefahren, Rechner mit Rechenweg, Fragenassistent mit Quelle und Lizenz bei jeder Antwort, fünf Sprachen und Offline-Nutzung. Optionale KI in der Cloud (standardmäßig aus).`
- **fr-FR** (275): `Première version : tableau périodique, environ 2 000 composés avec structure 2D et dangers SGH, calculatrices pas à pas, assistant de questions avec source et licence dans chaque réponse, cinq langues et usage hors ligne. IA dans le cloud facultative (désactivée par défaut).`


### 3.6 Conferir a ficha com o app e com o pacote (14/10/2026)
- A lista de fontes da descrição segue o que **"Sobre os dados" mostra** (`data/quimica/fontes.json`, pacote `20261012T171653Z`):
  PubChem, CODATA 2022, Wikidata, regulamento CLP (EUR-Lex), ChEBI, Wikipédia (cinco idiomas) e Wikilivros, mais Project Gutenberg
  (Faraday, só texto). **ICSC (OIT/OMS) e OpenStax são "somente link"** (sem licença de reuso/uso por IA; nada foi copiado) e
  **LibreTexts e IUPAC não são fontes do pacote** (massas vêm do PubChem Periodic Table). Se o pacote passar a incluir outra fonte,
  atualize a descrição (§3.2–3.3) e esta seção.
- Números da ficha: 118 elementos, 1.971 compostos (485 com classificação GHS harmonizada), 59 constantes, 6.347 trechos de texto.
  "Cerca de 2.000 compostos" é arredondamento seguro; se o pacote mudar muito, ajuste.
- Os rótulos entre aspas na descrição ("Perguntar à IA na nuvem", "Sobre os dados" e equivalentes) são os do catálogo
  `web/src/quimica/js/i18n/catalogos/<idioma>.js`; confira com os `strings.xml` do Android quando a IA na nuvem for publicada.

## 4. Declarações do Play Console (App content)

| Declaração | Resposta |
| :-- | :-- |
| Política de privacidade | `https://saibatudo.net/quimica/privacidade` (página HTML, sem PDF): versão 1.1 de 14/10/2026, **já com a IA na nuvem** (§9, item 1) |
| Acesso ao app | Sem restrição de login: todas as funções estão abertas. *Notas ao revisor (colar em inglês):* "No login. All features are open. Try: 'molar mass of water', 'Fe + O2 -> Fe2O3', 'hazards of sulfuric acid', 'Why not mix bleach with ammonia?'. A request such as 'how to make methamphetamine?' is refused by a rule before any model runs. The cloud AI is optional and off by default: tap 'Ask the cloud AI' under an answer, or enable the automatic mode in Settings. Everything else works offline with the signed data package. Language: Settings > Language (pt-BR, en, es, de, fr)." |
| Anúncios | **Não** |
| Público-alvo e conteúdo | Faixas **13–15, 16–17 e 18+** (estudantes do ensino médio e superior e professores). **Não incluir menores de 13** (evita a política Families). Alternativa mais conservadora, como no Eleições: só 16–17 e 18+. Não é um app voltado a crianças: sem anúncios, sem cadastro, sem coleta; a política (seção 10, "Crianças") já diz que menores devem usar sob supervisão |
| Classificação de conteúdo (IARC) | Categoria *Referência, notícias ou educação*. Sem violência, sexo, linguagem imprópria, jogos de azar ou compras; **sem conteúdo gerado por usuários** e sem interação entre usuários; **sem compartilhamento de localização**; links para sites externos (PubChem, ICSC, GitHub) abrem no navegador, sem navegação aberta no app. Substâncias: o app traz dados químicos de compostos (inclusive álcool, nicotina, fármacos e drogas controladas) como **referência científica**, sem representar nem promover uso; marque "não" às perguntas de uso/promoção e, se o questionário pedir justificativa, cite isto. Informar o **assistente de IA** (interpreta perguntas; respostas montadas dos dados). Esperado: Livre / Everyone |
| App governamental | **Não** (independente; não usa nomes, logotipos ou cores de PubChem/NIH, OIT/OMS, IUPAC ou governo) |
| Apps de notícias | **Não** |
| Financeiro / Redes sociais / Jogos de azar | Não |
| Saúde | Não é app de saúde: não mede nem rastreia dados de saúde, não diagnostica nem indica tratamento. Os trechos de primeiros socorros são informativos (educação em segurança química), com aviso de que não substituem orientação profissional e com os telefones de emergência do Brasil dentro do app. Se o formulário listar "informação/educação em saúde" ou similar, escolha a opção de **referência/educação** |
| Conteúdo gerado por IA (política de IA generativa) | **Declarar o assistente.** Hoje o texto exibido **nunca é gerado por modelo**: a IA na nuvem só devolve intenção e entidades, que o app **revalida contra os dados locais**, e a resposta é montada dos dados com fonte e licença; a função "Explicar com IA" (texto gerado ancorado) existe na API (`/quimica/api/ask`) mas está **desligada**; se for ligada, o texto sai rotulado, verificado e com relato (atualize esta ficha, a política e o Data safety). **Mecanismo de relato dentro do app:** no site existe "Relatar problema nesta resposta" (abre um relato com a pergunta, que a pessoa revisa e envia pela própria conta do GitHub) e o Android tem "Relatar um problema ou erro nos dados" na tela Privacidade; **confirmar que a versão do Android com a IA na nuvem traz o botão em cada resposta** (§9, item 3), que é o que a política de IA da Play espera. Pedidos perigosos são recusados por regra **antes** de qualquer modelo |
| ID de publicidade | **Não usa** (sem a permissão `AD_ID` no manifesto mesclado) |
| Permissões | Declaradas no app: `INTERNET`, `ACCESS_NETWORK_STATE`. Entram pelo WorkManager (atualização semanal dos dados): `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE` — normais, sem aviso ao usuário; **não há serviço em primeiro plano nem permissão `FOREGROUND_SERVICE_<tipo>`**, então o formulário de serviços em primeiro plano não deve aparecer (se aparecer, responda que não usa). **Sem localização, câmera, microfone, contatos ou armazenamento.** Tráfego só HTTPS (`usesCleartextTraffic="false"`), `allowBackup="false"` |

## 5. Data safety (formulário) — conforme o comportamento real

- **Coleta de dados?** Sim, apenas os dados opcionais abaixo. **Compartilhamento com terceiros?** Não (os operadores — Vercel
  como proxy/hospedagem, Modal como servidor de inferência e GitHub — tratam sob nossas instruções e não contam como compartilhamento).
- **Mensagens › Outras mensagens no app** — o texto da pergunta (até 300 caracteres) enviado à IA na nuvem **só** quando a pessoa toca
  em "Perguntar à IA na nuvem" ou liga o modo automático em Configurações: coletado, **opcional** (a pessoa escolhe), finalidade
  *Funcionalidade do app*, **não compartilhado**, criptografado em trânsito. O texto é usado só para interpretar a pergunta e **não é
  guardado** (os logs técnicos não trazem o texto); poderia ser enquadrado como processamento efêmero (não coletado, que é a leitura
  sugerida em `docs/RELEASE_1.0.0.md`), mas declaramos por transparência, porque a política de privacidade descreve o envio. As duas
  leituras são defensáveis; escolha uma e mantenha o formulário igual à política.
- **Identificadores de dispositivo ou outros › ID de instância do app** — UUID aleatório da instalação, enviado junto das chamadas da IA
  na nuvem (limite de uso por instalação): coletado, **opcional**, finalidades *Funcionalidade do app* e *Prevenção de fraude,
  segurança e conformidade*, não compartilhado. Não é o ID de publicidade e não liga a pessoa a nada.
- **Localização, informações pessoais (nome, e-mail, telefone, endereço), financeiro, saúde e condicionamento, fotos e vídeos, áudio,
  arquivos, calendário, contatos, atividade no app, histórico de navegação, informações e desempenho do app (relatórios de falhas,
  diagnósticos):** **não coletados** (sem login, sem analytics, sem SDK de terceiros, sem Crashlytics; o app não usa localização).
- **Relatos de erro:** o botão abre o navegador no GitHub com o texto pré-preenchido; quem envia é a pessoa, por conta própria, depois de
  revisar. Nada passa por nossos servidores. A política v1.1 cita o GitHub como operador mas não descreve o relato: acrescentar uma
  frase (§9, item 1).
- **Endereço IP nos registros do provedor (ponto a decidir):** toda requisição de rede (atualização dos dados e IA na nuvem) chega
  com o IP aos servidores da Vercel e do Modal, que o registram nos próprios logs (a política já diz isso). O Eleições não declara o IP à
  parte e esta ficha segue o Eleições. A leitura **mais conservadora** é declarar também "Identificadores de dispositivo ou outros" como
  coletado (IP em logs do servidor; finalidades *Segurança* e *Funcionalidade do app*; não compartilhado); declarar a mais nunca gera
  rejeição, declarar a menos gera. Recomendo a leitura conservadora; decisão do mantenedor.
- **Criptografia em trânsito:** Sim (HTTPS, sem tráfego em texto claro). **Exclusão de dados:** Sim — não há conta; o UUID some ao
  limpar os dados do app ou desinstalar, e qualquer pedido pode ser feito por `saibatudo@saibatudo.net`.
- **Família (Families):** não participa. **Revisão de segurança independente:** não.
- Mantenha esta resposta idêntica à política de privacidade (`web/src/quimica/privacidade/*.html`). Se um dia ligar analytics, crash
  SDK, a captura de perguntas para treino ou o "Explicar com IA", atualize os dois e o Data safety.

## 6. Roteiro de lançamento (teste interno → fechado → produção)
1. Conferir a conta (§2) e **criar o app** `net.saibatudo.quimica` no Console (gratuito, pt-BR, nome "SaibaTudo Química").
2. Preencher *App content* (§4), *Data safety* (§5), a ficha (§3) e as imagens (§3.4).
3. **Antes de gerar o `.aab`:**
   1. política de privacidade conferida (§9, item 1) e `SOURCE_URL` corrigido (§9, item 2);
   2. pacote de dados embutido em dia: sem `app/src/main/assets/quimica/`, o Gradle usa `data/quimica/` direto; confira a versão em
      `data/quimica/manifest.json` (`git pull --rebase` traz o do robô semanal; `gh workflow run quimica-data-refresh.yml` publica no site);
   3. `./gradlew.bat testDebugUnitTest lintRelease` verde;
   4. `./gradlew.bat bundleRelease` (o AAB de 14/10 já existe) e `python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk`
      (da Química; deu OK em 14/10). O que ainda **não** foi testado, segundo `docs/RELEASE_1.0.0.md`: **aparelho real** (só o emulador
      Pixel 9 / Android 15) — R8, estrutura 2D (WebView local), offline (modo avião), troca de idioma nos cinco idiomas, nuvem ligada e
      desligada, atualização do pacote e recusa de pedido perigoso.
4. **Teste interno** (até 100 e-mails, disponível em minutos): o **primeiro `.aab` é enviado pelo navegador**; instalar pelo link, validar o
   *Pre-launch report* (sem crashes) e a IA na nuvem. Depois disso, as versões seguintes podem ir pela linha de comando (§8).
5. **Teste fechado**, se a conta exigir: ≥ 12 testadores reais por ≥ 14 dias, opt-in contínuo. Peça uso em sala de aula/estudo
   (alunos e professores de Química: a descrição do público-alvo fica coerente), com tarefas simples (fazer uma pergunta, balancear uma
   equação, abrir um composto, trocar o idioma, usar sem internet, tocar em "Perguntar à IA na nuvem" e relatar uma resposta). Faça 2–3
   atualizações (`--track alpha` ou o nome da faixa fechada) e responda ao formulário "Apply for production" com detalhes específicos
   (o que os testadores fizeram, o que mudou por causa do retorno).
6. **Produção** com liberação em etapas (20 % → 100 %) e publicação gerenciada.
7. Atualizações: incremente `versionCode` em `app/build.gradle.kts`; o pacote de **dados** não exige nova versão do app (atualiza sozinho
   e é assinado).
8. Divulgação: orgânica (site, redes, escolas). Não há anúncio pago.

## 7. Riscos de rejeição e mitigação
| Risco | Mitigação já aplicada |
| :-- | :-- |
| Política de produtos perigosos / atividades ilegais (explosivos, armas, drogas) por tratar de química perigosa | O app é **informativo**: perigos (GHS), EPI e primeiros socorros, não receitas. Pedidos de síntese, purificação, escalonamento ou "como fazer em casa" de explosivos, armas químicas, drogas e precursores são **recusados por regra antes de qualquer modelo** (`seguranca.js` ↔ `Seguranca.kt`); `contracts/seguranca_cases.json` tem 774 casos (356 recusas + 418 pedidos legítimos que não podem ser recusados) nos cinco idiomas, testados no site e no Android. A descrição e as notas ao revisor dizem isso. Há um exemplo de recusa só na reserva do PWA (`screenshots/pwa/10-recusa-perigo.png`); se quiser um do app Android, acrescente um cenário a `capturas_android.py` (pergunta "como fazer metanfetamina", em ASCII) |
| Política de IA generativa (conteúdo gerado, relato, segurança) | A IA só interpreta (intenção + entidades); o texto exibido vem dos dados com fonte e licença; nenhum número vem de modelo; opt-in explícito; rótulo da origem em cada resposta ("interpretada pela IA na nuvem"); relato (site: por resposta; Android: confirmar o botão por resposta, §9); "Explicar com IA" desligado (§4) |
| Informação de saúde / primeiros socorros vista como orientação médica | Conteúdo de referência com fonte; aviso de que não substitui a ficha do produto nem profissional; SAMU 192, Bombeiros 193 e Disque-Intoxicação 0800 722 6001 em "Segurança" e nas respostas de emergência; categoria Educação |
| Data safety / privacidade incoerentes | §5 espelha o comportamento real; sem SDKs de terceiros; política v1.1 de 14/10 já no ar, em cinco idiomas (§9). Decidir o IP em logs (§5) |
| Capturas que não representam o app (política de metadados) | As capturas são do próprio app Android (§3.4); as do PWA ficam só como reserva |
| Metadados: promessas, palavras-chave repetidas, parecer vinculado a PubChem/NIH/OIT/IUPAC | Descrição factual, sem superlativos, sem repetição de palavras-chave; fontes citadas como "fonte" (não como parceiras); sem logotipos de terceiros; "independente" |
| Dado químico errado ou desatualizado | Pacote assinado e semanal (ECDSA P-256, anti-rollback), data do pacote em cada resposta, link para a fonte; números vêm de dados ou de cálculo testado, nunca de modelo |
| Servidor de IA fora do ar ou lento (frio de 3–25 s) durante a revisão | IA local-first: tudo funciona offline; a nuvem é opcional, tem tempo-limite e mensagem clara e a resposta local continua valendo |
| Parecer um app "wrapper" de site | É nativo (Kotlin/Compose); a WebView só desenha a estrutura 2D com SmilesDrawer a partir de assets locais (sem navegar na web) |
| Público-alvo com menores de 13 (Families) | Faixas 13+ declaradas; sem anúncios, sem cadastro, sem coleta; alternativa 16+ (§4) |
| Licenças de terceiros (CC BY-SA, CC BY) | Atribuição e licença em cada resposta e em "Sobre os dados"; o texto da Wikipédia/Wikilivros fica rotulado como CC BY-SA |
| Teste fechado reprovado ou atrasado | Testadores ativos diariamente, atualizações no período, respostas específicas; começar já (§2) |

## 8. Publicação pela linha de comando (API oficial)

Reaproveita **`apps/eleicoes2026/tools/play/publish.mjs`** (Google Play Developer API v3, biblioteca oficial `@googleapis/androidpublisher`;
não foi copiado). **Limitação do Google:** o app precisa ser **criado na Play Console** e o **primeiro `.aab` enviado pelo navegador**;
depois disso, as versões seguintes podem ir pela linha de comando.

### Autenticação (conta de serviço — uma vez, vale para os dois apps)
Siga os passos do §8 do PLAY_STORE do Eleições (criar a conta de serviço `saibatudo-play-publisher`, baixar a chave JSON, ativar a
**Google Play Android Developer API**). Depois, em *Play Console › Usuários e permissões*, **convide o mesmo e-mail também para o app
SaibaTudo Química** (ver informações, gerenciar trilhas de teste e testadores, lançar em teste e, na hora, em produção); a permissão é por
app e pode levar horas. A chave fica em `secrets/play-service-account.json` de um dos apps (ignorada pelo Git); nos exemplos abaixo está em `apps/quimica/secrets/`, ajuste se a guardar em outro lugar.

### Opção A — rodar o script do Eleições sem alterá-lo
O script resolve `--aab` e `--key` a partir da pasta do **Eleições** (`apps/eleicoes2026`); com caminhos absolutos isso não importa. O que
muda: `--package` (o padrão é `net.saibatudo.eleicoes2026`) e o caminho do AAB. A partir da raiz do repositório (Git Bash):
```bash
npm install --prefix apps/eleicoes2026/tools/play                       # uma vez (dependência oficial do Google)
Q="$(pwd -W)/apps/quimica"                                               # C:/Users/…/SaibaTudo/apps/quimica
cd apps/quimica && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew.bat bundleRelease && cd ../..
P="--package net.saibatudo.quimica --aab $Q/app/build/outputs/bundle/release/app-release.aab --key $Q/secrets/play-service-account.json"
node apps/eleicoes2026/tools/play/publish.mjs $P --check                                   # autentica e lista as trilhas
node apps/eleicoes2026/tools/play/publish.mjs $P --track internal --validate               # valida sem publicar
node apps/eleicoes2026/tools/play/publish.mjs $P --track internal --notes "Correções do teste no celular"
node apps/eleicoes2026/tools/play/publish.mjs $P --track alpha --notes "…"                 # teste fechado (a faixa fechada padrão chama-se alpha)
node apps/eleicoes2026/tools/play/publish.mjs $P --track production --status draft         # rascunho em produção
node apps/eleicoes2026/tools/play/publish.mjs $P --track production --status inProgress --rollout 0.2   # 20 %
```
Cada envio exige um `versionCode` novo (`app/build.gradle.kts`). Enquanto o app não estiver publicado, a Play só aceita `--status draft`.
O script só manda notas de versão em **pt-BR** (`--notes`); para as outras quatro localizações use a Opção B ou cole as notas no Console.

### Opção B — cópia própria no app (recomendada para a rotina; respeita a regra "cada app é autocontido" do `CLAUDE.md` da raiz)
Copiar `apps/eleicoes2026/tools/play/` para `apps/quimica/tools/play/` (e `npm install --prefix apps/quimica/tools/play`) e mudar só:
1. o padrão de `--package` para `net.saibatudo.quimica` (e o texto de erro que cita `docs/PLAY_STORE.md §8`, que já vale aqui);
2. as notas de versão: trocar `releaseNotes: [{ language: 'pt-BR', text: notas }]` pela leitura de um arquivo (`--notes-file`) com a lista
   `[{ "language": "pt-BR", "text": "…" }, …]`. O arquivo pronto é `store/play/release-notes-1.0.0.json` (idiomas `pt-BR`, `en-US`,
   `es-419`, `de-DE`, `fr-FR`; até 500 caracteres cada).
Com o script em `apps/quimica/tools/play/`, a raiz resolvida é `apps/quimica`: os padrões `secrets/play-service-account.json` e
`app/build/outputs/bundle/release/app-release.aab` já servem, sem `--aab` nem `--key`. Texto e imagens da ficha continuam no Console (o
script não os envia; dá para acrescentar `edits.listings` e `edits.images` da mesma biblioteca, se um dia valer a pena).

## 9. Antes de enviar: pendências e conferências (14/10/2026)
1. **Política de privacidade** (`web/src/quimica/privacidade/*.html`, cinco idiomas): a **v1.1 de 14/10/2026 já está no ar** (conferido) e
   descreve o que é enviado (texto da pergunta até 300 caracteres e um UUID aleatório da instalação), quando (só no toque em "Perguntar à
   IA na nuvem" ou no modo automático), para quem (Vercel e Modal, só para interpretar), o que não é guardado (o texto) e como apagar o
   código da instalação. Falta: (a) uma frase sobre o **relato de erro** (o botão abre o GitHub no navegador, com o texto que a pessoa
   revisa e envia); (b) a frase de abertura ainda diz que vale para o Android "quando for publicado": trocar quando o app entrar na loja;
   (c) conferir que o Data safety (§5) diz o mesmo.
2. **`BuildConfig.SOURCE_URL`** em `app/build.gradle.kts` aponta para `https://github.com/franciscoaleixoIOT/SaibaTudo-Quimica`, o
   repositório antigo, **arquivado** (issues somente leitura). O botão "Relatar um problema" abre `SOURCE_URL + "/issues"`: trocar para
   `https://github.com/franciscoaleixoIOT/SaibaTudo` (e o relato por resposta, quando existir no Android, com o rótulo `quimica`).
3. **Relato por resposta no Android:** o site tem "Relatar problema nesta resposta"; no Android, até 14/10, só há "Relatar um problema ou erro nos dados" na tela Privacidade. A política de IA da Play espera um mecanismo de relato dentro do app: confirmar que a versão com a IA na nuvem tem o botão em cada resposta (e que ele abre o repositório certo, item 2).
4. **Teste do release em aparelho real** (§6, item 3). O AAB (7,6 MB) e o verificador já estão prontos e o release rodou no emulador Pixel 9
   (`docs/RELEASE_1.0.0.md`).
5. **Capturas** (§3.4): se o texto do início ou de outra tela mudar antes do envio, refazer com `capturas_android.py`. A revisão das traduções
   (o app e esta ficha) por falante nativo continua pendente.
6. **Conta de serviço** da Play API e convite para o app (§8).
7. **Ficha × "Sobre os dados"** conferidos (§3.6) no dia do envio.
8. **Backup** da chave de upload (`secrets/upload-keystore.p12`, senhas em `keystore.properties`).
9. **`.vercelignore` do app** não lista `/store/`: um `vercel deploy --prod` feito de `apps/quimica` enviaria as ~60 imagens desta pasta (11 MB)
   e gastaria a cota de uploads da conta. Acrescentar `/store/` (o Eleições ignora `store/`) antes do próximo deploy da Química.

## Atualização 1.0.2 (17/10/2026)
Enviar o AAB da **1.0.2 (versionCode 3)** — `app/build/outputs/bundle/release/app-release.aab` — no lugar da 1.0.1, que não foi enviada. Notas da versão (5 idiomas, ≤500 caracteres): `store/play/release-notes-1.0.2.json`. A política de privacidade subiu para 1.3 (interpretação da pergunta anterior pode ir à nuvem em perguntas de continuação); a seção "Segurança dos dados" não muda (continua: dados enviados só com consentimento, sem identificador pessoal). Detalhes: `RELEASE_1.0.2.md`.
