// Katalog de (gleiche Schlüssel wie pt-BR; per Test geprüft). Von einem Agenten übersetzt; Prüfung durch Muttersprachler steht aus.
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'pendente',

  ui: {
    idiomas: { 'pt-BR': 'Portugiesisch', en: 'Englisch', es: 'Spanisch', de: 'Deutsch', fr: 'Französisch', zh: 'Chinesisch' },
    listas: { e: ' und ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — wie ein Sprachmodell funktioniert, mit Wortvektoren in 3D',
      descricao: 'Verstehen Sie, wie ein Sprachmodell funktioniert: Wörter wählen, ihre GloVe-Vektoren auf 3 Achsen in einem interaktiven Diagramm sehen, Vektorrechnung machen (König − Mann + Frau) und Nachbarn und Skalarprodukte erkunden. Offene Daten, funktioniert offline, und nichts verlässt Ihr Gerät ohne Ihr Tippen.',
      ogLocale: 'de_DE',
      pular: 'Zum Inhalt springen'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: 'SaibaTudo LLMs wird geladen…',
      abas: { inicio: 'Erkunden', aprenda: 'Lernen', sobre: 'Über die Daten' },
      secoes: 'Bereiche',
      marcaAria: 'SaibaTudo LLMs, Start',
      marcaSub: 'Wortvektoren in 3D, auf Ihrem Gerät',
      configuracoes: 'Einstellungen',
      idioma: 'Sprache',
      rodape: { sobre: 'Über die Daten', privacidade: 'Datenschutz', configuracoes: 'Einstellungen', projeto: 'Unabhängiges Open-Source-Projekt (MIT). Ohne Werbung, Login oder Tracker.' },
      naoEncontrada: { titulo: 'Seite nicht gefunden', texto: 'Diese Adresse gibt es in SaibaTudo LLMs nicht.', inicio: 'Zum Start' },
      erro: { titulo: 'Fehler', cabecalho: 'Etwas ist schiefgelaufen', texto: 'Diese Ansicht konnte nicht aufgebaut werden ({msg}).', inicio: 'Zum Start' },
      erroDados: { titulo: 'Daten nicht verfügbar', complemento: 'Die Wortvektoren konnten nicht geladen werden ({msg}). Die Lektionen und der Begriffsassistent bleiben verfügbar.', tentar: 'Erneut versuchen' },
      avisoAssinatura: 'Die digitale Signatur des Datenpakets stimmt nicht. Der Explorer wurde deaktiviert: Vertrauen Sie keinen Werten aus diesen Daten.',
      dadosAtualizados: 'Daten aktualisiert. Laden Sie die Seite neu, um die neue Version überall zu nutzen.',
      novaVersao: 'Eine neue Version der App wurde installiert. Schließen und erneut öffnen (oder neu laden), um sie zu nutzen.',
      idiomaTrocado: 'Sprache geändert. Der Gesprächskontext wurde gelöscht.'
    },
    prefs: {
      tema: { SISTEMA: 'Dem System folgen', CLARO: 'Hell', ESCURO: 'Dunkel' },
      fonte: { PEQUENA: 'Klein', NORMAL: 'Normal', GRANDE: 'Groß', MUITO_GRANDE: 'Sehr groß' }
    },
    install: {
      ios: { titulo: 'Installation auf iPhone oder iPad:', passos: ['Tippen Sie in der Safari-Leiste auf Teilen (das Quadrat mit dem Pfeil).', 'Wählen Sie „Zum Home-Bildschirm“.', 'Bestätigen Sie den Namen und tippen Sie auf Hinzufügen.'] },
      geral: { titulo: 'Installation als App:', passos: ['Öffnen Sie das Browsermenü (⋮ oder ⋯).', 'Wählen Sie „App installieren“ oder „Zum Startbildschirm hinzufügen“.', 'Bestätigen Sie. Die App öffnet sich im eigenen Fenster und funktioniert offline.'] }
    },
    componentes: { fonte: 'Quelle: ', passoAPasso: 'Schritt für Schritt' },
    inicio: {
      titulo: 'Embeddings erkunden',
      subtitulo: 'Wählen Sie Wörter und sehen Sie ihre GloVe-Vektoren auf drei Achsen. König − Mann + Frau ≈ Königin.',
      campoRotulo: 'Fragen Sie etwas oder nennen Sie Wörter für das Diagramm', placeholder: 'Z. B. zeige king, queen, man und woman · king − man + woman · was ist ein Token?',
      enviar: 'Fragen', limparCampo: 'Feld leeren', analisando: 'Wird analysiert…', ultimaPergunta: 'Letzte Frage', anterior: 'Vorige Frage', proxima: 'Nächste Frage',
      sugestoesTitulo: 'Sie können auch fragen', copiar: 'Antwort kopieren', copiado: 'Antwort kopiert.', fechar: 'Antwort schließen', relatar: 'Problem mit dieser Antwort melden',
      relatarAjuda: 'Öffnet ein öffentliches GitHub-Issue mit der Frage im Titel; nichts wird gesendet, bevor Sie dort bestätigen.',
      abrir: 'Öffnen', respostaAria: 'Antwort', historicoVazio: 'Noch keine Fragen.'
    },
    aprenda: {
      titulo: 'Lernen: die Bausteine eines Sprachmodells', subtitulo: 'Sechs kurze Abschnitte, von der Vorhersage des nächsten Tokens bis zur Softmax. Jeder hat ein „Ausprobieren“, das in den Explorer führt.',
      secaoN: 'Abschnitt {n} von {total}', experimente: 'Ausprobieren', abrir: 'Im Explorer öffnen', referencias: 'Literatur', link: 'ansehen', navegacao: 'Benachbarte Abschnitte', irExplorar: 'Zum Explorer', indice: 'Alle Abschnitte',
      autoria: 'Text des SaibaTudo-Projekts (MIT) mit wissenschaftlichen Quellen. In den anderen Sprachen von einem Agenten übersetzt; Prüfung durch Muttersprachler steht aus.'
    },
    sobre: {
      titulo: 'Über die Daten', subtitulo: 'Woher die Vektoren kommen, wie die Zahlen berechnet werden und was die Cloud-KI tut (und nicht tut).',
      vetores: 'Wortvektoren', fonte: 'Quelle', licenca: 'Lizenz', palavras: 'Wörter', dimensoes: 'Dimensionen', quantizacao: 'Quantisierung', versaoPacote: 'Paketversion', geradoEm: 'Erzeugt am',
      ingles: 'GloVe wurde auf englischen Texten trainiert (Wikipedia 2014 und Gigaword-5-Nachrichten): Die Wörter sind englisch und die Assoziationen, Verzerrungen eingeschlossen, sind die dieser Texte. Das Glossar übersetzt Beispielwörter zur Erleichterung; die 100 000 häufigsten Wörter kommen ins Paket, mit Vektoren als int8 (eine Skala pro Vektor).',
      comoCalcula: 'Wie die Zahlen berechnet werden', calculos: ['Kosinus und Skalarprodukt: auf diesem Gerät aus den int8-Vektoren berechnet, ohne Rundung über die Quantisierung hinaus.', 'Nachbarn und Analogien: Durchlauf des gesamten Vokabulars nach Kosinus; die Analogie ist a − b + c ohne a, b und c.', 'Diagrammachsen: die 3 Dimensionen mit der größten Varianz unter den gewählten Wörtern oder die 3 Hauptkomponenten (PCA) mit erklärter Varianz.', 'Keine Zahl stammt aus einem Sprachmodell; generierter Text wird, wenn Sie ihn anfordern, gekennzeichnet und auf dem Server geprüft.'],
      ia: 'Cloud-KI (optional)', iaTexto: 'Standardmäßig aus. Auf Anfrage sendet der Projektserver die Frage, die Sprache, eine Zusammenfassung des Diagramms und Auszüge der Abschnitte an ein offenes Modell (Qwen3-4B-Instruct-2507, Apache 2.0) in einem Hugging-Face-Space; die Antwort kommt mit dem Modellnamen gekennzeichnet zurück und wird abgelehnt, wenn sie eine Zahl enthält, die nicht im Gesendeten steht.',
      referencias: 'Literatur', licencas: 'Lizenzen', traducoes: 'Übersetzungen', revisao: { pendente: 'von einem Agenten übersetzt, Prüfung durch Muttersprachler steht aus', humana: 'Quelltext, geprüft' }, codigo: 'Quellcode der App auf GitHub'
    },
    nuvem: {
      botao: 'Die Cloud-KI fragen', consultando: 'Cloud-KI wird gefragt…', titulo: 'Erklärung der Cloud-KI',
      consentimento: 'Diese Frage an die Cloud-KI senden? An unseren Server gehen der Fragetext, die Sprache, eine Zusammenfassung des aktuellen Diagramms und Auszüge der Abschnitte sowie ein zufälliger Code dieser Installation. Nichts wird zusammen mit der Frage gespeichert. Die Antwort erzeugt ein Modell (derzeit Qwen3-4B), gekennzeichnet und geprüft: Zahlen außerhalb des Gesendeten werden abgelehnt.',
      confirmar: 'Senden', cancelar: 'Jetzt nicht', lembrar: 'Nicht mehr fragen (automatischer Modus; in den Einstellungen abschaltbar)',
      falha: { desligada: 'Die Cloud-KI ist in dieser Version aus. Die Antwort oben wurde auf Ihrem Gerät erstellt.', cota: 'Die Cloud-KI hat ihr Nutzungslimit vorerst erreicht. Versuchen Sie es später.', timeout: 'Die Cloud-KI hat zu lange gebraucht; der Aufruf wurde abgebrochen.', rejeitada: 'Die Cloud-KI hat geantwortet, aber der Text bestand die Prüfung nicht (Zahl oder Sprache außerhalb des Erwarteten) und wurde verworfen.', dadopessoal: 'Die Frage scheint personenbezogene Daten zu enthalten und wurde nicht an die Cloud gesendet.', rede: 'Die Cloud-KI war nicht erreichbar (kein Netz oder Dienst ausgefallen).' }
    },
    presets: {
      realeza: { nome: 'Königtum und Geschlecht', nota: 'Die Differenz König − Königin ähnelt Mann − Frau: eine Richtung des Raums trägt das grammatische Geschlecht.' },
      capitais: { nome: 'Länder und Hauptstädte', nota: 'Jedes Land liegt in ähnlichem Abstand zu seiner Hauptstadt: die Richtung „Hauptstadt von“ wiederholt sich.' },
      plural: { nome: 'Plural', nota: 'Die Richtung Katzen − Katze ähnelt Hunde − Hund; das Skalarprodukt damit trennt Singular von Plural.' },
      familia: { nome: 'Familie', nota: 'Paare wie Vater/Mutter und Bruder/Schwester unterscheiden sich durch dieselbe Geschlechtsrichtung.' },
      cores: { nome: 'Farben', nota: 'Farben bilden eine kompakte Gruppe: sie erscheinen im Korpus in ähnlichen Kontexten.' },
      numeros: { nome: 'Zahlen', nota: 'Von eins bis zehn reihen sich die Vektoren in einem Band auf; nahe Zahlen bleiben nah.' },
      lideres: { nome: 'Länder und Anführer', nota: 'Historischer Hinweis: Italien − Deutschland + Hitler landet nahe Mussolini, weil das Korpus (Wikipedia und Nachrichten) jeden Achsen-Diktator mit seinem Land verbindet. Das ist eine statistische Regelmäßigkeit der Texte, kein Urteil der App.' }
    },
    explorador: {
      palavras: 'Wörter im Diagramm', palavrasAria: 'Gewählte Wörter', adicionarRotulo: 'Wort hinzufügen', adicionarPlaceholder: 'Ein englisches (oder übersetztes) Wort eingeben und Enter drücken',
      botaoAdicionar: 'Hinzufügen', limpar: 'Leeren', remover: '{palavra} entfernen', destacar: '{palavra} hervorheben und Nachbarn zeigen', adicionarEsta: 'Zum Diagramm hinzufügen',
      modoDimensoes: '3 Dimensionen', modoPca: 'PCA', diferencas: 'Differenzen zeigen (Pfeile zwischen Paaren)',
      presetsTitulo: 'Fertige Beispiele', tabelaTitulo: 'Koordinaten auf den 3 Achsen', tabelaLegenda: 'Koordinaten jedes Wortes auf den gewählten Achsen', tabelaPalavra: 'Wort',
      semPalavras: 'Noch keine Wörter. Geben Sie oben eines ein, wählen Sie ein Beispiel oder fragen Sie den Assistenten.',
      eixo: 'Achse {n}', eixoDimensao: 'Dimension {n} des Vektors', eixoPca: 'Hauptkomponente {n} ({pct} % der Varianz)',
      aviso: { pcaPoucasPalavras: 'PCA braucht mindestens 3 Wörter; gezeigt werden die 3 Dimensionen mit der größten Varianz.' },
      avisoLimite: 'Höchstens {n} Wörter im Diagramm.', naoEncontrada: '„{palavra}“ gehört nicht zu den 100 000 GloVe-Wörtern (Englisch, ohne Akzente). Vorschläge:',
      traduzida: '{original} → {en} (über das Glossar übersetzt)',
      vizinhosTitulo: 'Nächste Nachbarn', vizinhosVazio: 'Tippen Sie auf ein Wort im Diagramm oder einen Chip, um die 10 nächsten Wörter zu sehen (Kosinus).', vizinhosDe: 'Die 10 Wörter, die {palavra} am nächsten sind:', cosseno: 'Kosinus',
      analogiaTitulo: 'Analogie (a − b + c)', analogiaExplicacao: 'b von a abziehen und c addieren: die Wörter, die dem Ergebnis am nächsten liegen, vervollständigen die Analogie. Z. B. king − man + woman ≈ queen.',
      analogiaA: 'Wort a', analogiaB: 'Wort b', analogiaC: 'Wort c', analogiaBotao: 'Berechnen', analogiaLimpar: 'Aus dem Diagramm entfernen', analogiaInvalida: 'Wählen Sie drei verschiedene Wörter aus dem Diagramm (a und c dürfen nicht gleich sein).',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: 'Richtung und Skalarprodukt', direcaoExplicacao: 'Die Differenz w1 − w2 definiert eine Richtung (z. B. cats − cat, der Plural). Das Skalarprodukt jedes Wortes mit dieser Richtung misst, wie stark es dorthin „zeigt“.',
      direcaoW1: 'Wort w1', direcaoW2: 'Wort w2', direcaoLista: 'Zu messende Wörter, durch Komma getrennt (leer = die im Diagramm)', direcaoBotao: 'Messen', direcaoInvalida: 'Wählen Sie zwei verschiedene Wörter.',
      direcaoResultado: 'Skalarprodukt mit der Richtung {w1} − {w2}:',
      graficoAria: '3D-Diagramm der gewählten Wörter; ziehen zum Drehen, Mausrad oder Zwei-Finger-Geste zum Zoomen, Pfeiltasten drehen. Die Tabelle darunter hat dieselben Koordinaten.',
      calculadoNoAparelho: 'Auf Ihrem Gerät aus GloVe berechnet (Pennington, Socher & Manning, 2014; Lizenz PDDL 1.0). Englische Wörter.'
    },
    config: {
      titulo: 'Einstellungen', salva: 'Einstellung auf diesem Gerät gespeichert.', aparencia: 'Darstellung', tema: 'Design', tamanhoTexto: 'Textgröße', idioma: 'Sprache',
      idiomaAjuda: 'Ändert die Oberfläche, die Antworten und den Frageninterpreter. Die Wörter im Diagramm bleiben Englisch, die Sprache von GloVe.',
      instalar: 'Installieren', jaInstalado: 'Die App ist auf diesem Gerät bereits installiert.', instalarApp: 'App installieren',
      ia: 'Künstliche Intelligenz in der Cloud',
      iaAviso: 'Optional und standardmäßig aus. Sie erklärt nur Begriffe und das, was das Diagramm zeigt; die Zahlen werden weiterhin auf diesem Gerät berechnet. Wenn Sie auf „Die Cloud-KI fragen“ tippen, gehen der Fragetext, die Sprache, eine Zusammenfassung des aktuellen Diagramms und ein zufälliger Code dieser Installation an unseren Server.',
      nuvemAutomatica: 'Automatische Cloud-KI',
      nuvemAutomaticaAjuda: 'Wenn die App eine Frage nicht versteht, sie ohne Nachfrage an die Cloud-KI senden. Gesendet werden nur der Fragetext, die Sprache und die Zusammenfassung des Diagramms.',
      dados: 'Daten', versaoPacote: 'Paketversion', palavras: 'Wörter', assinatura: 'Signatur', semDados: 'Das Datenpaket wurde noch nicht geladen.',
      assinaturaValor: { verificada: 'geprüft', invalida: 'NICHT geprüft', indisponivel: 'in diesem Browser nicht verfügbar' },
      privacidade: 'Datenschutz', privacidadeTexto: 'Auf diesem Gerät speichern wir nur Design, Textgröße, Sprache und den Fragenverlauf sowie den Cache für die Offline-Nutzung. ', politica: 'Datenschutzerklärung',
      apagar: 'Daten auf diesem Gerät löschen', confirmar: 'Zum Bestätigen erneut tippen', apagados: 'Daten gelöscht. Wird neu geladen…'
    }
  },

  respostas: {
    origem: { local: 'Auf Ihrem Gerät erstellt • GloVe-Daten vom {data}', generativa: 'KI-generierter Text ({modelo}) • Cloud — kann Fehler enthalten', nuvem: 'Cloud-KI' },
    sugestoes: {
      padrao: ['zeige king, queen, man und woman', 'king − man + woman', 'nachbarn von tower', 'pluralrichtung', 'zeige die hauptstädte', 'was ist ein embedding?'],
      vizinhosDe: 'nachbarn von {palavra}', analogiaCom: '{a} − {b} + {c}', plural: 'pluralrichtung', conceitoToken: 'was ist ein token?', mostrar: 'zeige {palavra}'
    },
    saudacao: { titulo: 'Hallo!', texto: 'Ich bin der Assistent von SaibaTudo LLMs. Nennen Sie Wörter für das Diagramm, eine Analogie, die Nachbarn eines Wortes oder einen Begriff, den ich erklären soll.' },
    ajuda: { titulo: 'Was Sie fragen können', texto: 'Ich verstehe Anfragen zum Diagramm (englische Wörter oder über das Glossar übersetzte) und Fragen zu den Begriffen der sechs Abschnitte. Beispiele:', exemplos: ['zeige king, queen, man und woman', 'king − man + woman', 'nachbarn von tower', 'sind cat und dog ähnlich?', 'pluralrichtung', 'was ist attention?'] },
    sobreDados: { titulo: 'Über die Daten', texto: 'Die Vektoren stammen aus GloVe (Pennington, Socher & Manning, 2014; Wikipedia 2014 + Gigaword 5; Lizenz PDDL 1.0): {n} englische Wörter, 50 Dimensionen, Paket {versao}, auf diesem Gerät per digitaler Signatur geprüft.' },
    fontes: { titulo: 'Quellen', itens: ['GloVe 6B, 50 Dimensionen — Stanford NLP (PDDL 1.0)', 'Pennington, Socher & Manning (2014), GloVe: Global Vectors for Word Representation', 'Mikolov et al. (2013), Linguistic Regularities in Continuous Space Word Representations', 'Vaswani et al. (2017), Attention Is All You Need'] },
    limpar: { titulo: 'Diagramm geleert', texto: 'Ich habe alle Wörter aus dem Diagramm entfernt.' },
    preset: { texto: 'Beispiel „{nome}“ geladen: {lista}.' },
    conceito: { leiaMais: 'Der vollständige Abschnitt steht unter Lernen; tippen Sie auf die Schaltfläche, um ihn zu öffnen.' },
    mostrar: { titulo: 'Wörter im Diagramm', texto: 'Ich habe {lista} ins Diagramm gesetzt.', textoContinuacao: 'Ich habe {lista} zum Diagramm hinzugefügt.', traduzidas: 'Über das Glossar übersetzt: {lista}.', desconhecidas: 'In GloVe nicht gefunden: {lista}.' },
    analogia: { titulo: 'Analogie', texto: '{a} − {b} + {c} ≈', item: '{palavra} (Kosinus {cos})', explicacao: 'Ich habe den Vektor von b von a abgezogen, c addiert und die Wörter gesucht, die dem Ergebnis am nächsten liegen (ohne a, b und c).' },
    vizinhos: { titulo: 'Nachbarn von {palavra}', texto: 'Die 10 Wörter, die {palavra} am nächsten sind, nach Kosinus:' },
    similaridade: { titulo: 'Ähnlichkeit', texto: 'Kosinus zwischen {a} und {b}: {cos}.', escala: 'Nahe 1 = Vektoren fast in derselben Richtung (ähnliche Kontexte); nahe 0 = kein Zusammenhang; negativ = entgegengesetzte Richtungen.' },
    direcao: { titulo: 'Richtung und Skalarprodukt', texto: 'Richtung {w1} − {w2}. Skalarprodukt jedes Wortes mit dieser Richtung:', palavra: 'Wort', produto: 'Skalarprodukt', explicacao: 'Größere Werte zeigen stärker zu {w1}; kleinere zu {w2}.' },
    naoEntendi: { titulo: 'Nicht verstanden', texto: 'Ich habe „{q}“ nicht verstanden. Ich kann Wörter ins Diagramm setzen, Analogien, Nachbarn und Richtungen berechnen oder die Begriffe der Abschnitte erklären.', sugestoesPalavras: 'Ähnliche GloVe-Wörter: {lista}.', palavrasAchadas: 'Ich habe die Wörter {lista} erkannt; sagen Sie „zeige“, um sie ins Diagramm zu setzen.' },
    copiar: { pergunta: 'Frage:', rodape: 'Quelle: GloVe (PDDL 1.0) • SaibaTudo LLMs • https://saibatudo.net/llms/' }
  },
};
