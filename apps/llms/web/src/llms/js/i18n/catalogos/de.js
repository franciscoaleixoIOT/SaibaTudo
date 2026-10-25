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
      subtitulo: 'Wählen Sie Wörter und sehen Sie ihre GloVe-Vektoren auf drei Achsen. König − Mann + Frau ≈ Königin.'
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
  }
};
