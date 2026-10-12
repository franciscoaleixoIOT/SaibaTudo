// Deutscher Katalog (German catalogue). Same keys as pt-BR (checked by test). Glossary and style: docs/I18N.md §8 (formal "Sie"). Initial translation by agent: "revisao: 'pendente'" until a native speaker reviews it.
// Nouns keep their capital letter in the middle of a sentence: regras.minusculaNoMeio = false.
const MARCA = 'SaibaTudo Química';

export default {
  revisao: 'pendente',
  regras: { minusculaNoMeio: false },

  ui: {
    idiomas: { 'pt-BR': 'Portugiesisch', en: 'Englisch', es: 'Spanisch', de: 'Deutsch', fr: 'Französisch' },
    listas: { e: ' und ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo Química — Periodensystem, Verbindungen und Rechner mit offenen Daten',
      descricao: 'Interaktives Periodensystem, Steckbriefe zu Elementen und Verbindungen mit 2D-Strukturen, Rechner mit Rechenweg (molare Masse, Gleichungen ausgleichen, Stöchiometrie, pH, ideales Gas) und chemische Sicherheit. Offene Daten, funktioniert offline und nichts verlässt Ihr Gerät.',
      ogLocale: 'de_DE',
      pular: 'Zum Inhalt springen'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo Química',
      carregando: 'SaibaTudo Química wird geladen…',
      abas: { inicio: 'Start', tabela: 'Periodensystem', compostos: 'Verbindungen', calculadoras: 'Rechner', seguranca: 'Sicherheit' },
      secoes: 'Bereiche',
      marcaAria: 'SaibaTudo Química, Startseite',
      marcaSub: 'Offene Daten, Berechnungen auf Ihrem Gerät',
      configuracoes: 'Einstellungen',
      idioma: 'Sprache',
      rodape: { sobre: 'Über die Daten', privacidade: 'Datenschutz', configuracoes: 'Einstellungen', projeto: 'Unabhängiges Open-Source-Projekt (MIT). Keine Werbung, kein Login, keine Tracker.' },
      naoEncontrada: { titulo: 'Seite nicht gefunden', texto: 'Diese Adresse gibt es in SaibaTudo Química nicht.', inicio: 'Zur Startseite' },
      erro: { titulo: 'Fehler', cabecalho: 'Etwas ist schiefgelaufen', texto: 'Diese Ansicht konnte nicht aufgebaut werden ({msg}).', inicio: 'Zur Startseite' },
      erroDados: { titulo: 'Die Daten konnten nicht geladen werden', complemento: '{msg}. Prüfen Sie Ihre Verbindung; nach dem ersten Laden funktioniert die App offline.', tentar: 'Erneut versuchen' },
      avisoAssinatura: 'Die digitale Signatur des Datenpakets stimmt nicht überein. Es werden weiterhin die eigenen Daten der Website verwendet, sie wurden aber nicht authentifiziert: Verlassen Sie sich nicht auf kritische Werte.',
      dadosAtualizados: 'Daten aktualisiert. Laden Sie die Seite neu, um die neue Version in allen Ansichten zu nutzen.',
      novaVersao: 'Eine neue Version der App wurde installiert. Schließen und öffnen Sie sie erneut (oder laden Sie die Seite neu), um sie zu verwenden.',
      idiomaTrocado: 'Sprache geändert. Der Gesprächskontext wurde gelöscht.'
    },
    prefs: {
      tema: { SISTEMA: 'System folgen', CLARO: 'Hell', ESCURO: 'Dunkel' },
      fonte: { PEQUENA: 'Klein', NORMAL: 'Normal', GRANDE: 'Groß', MUITO_GRANDE: 'Sehr groß' }
    },
    install: {
      ios: { titulo: 'Auf iPhone oder iPad installieren', passos: ['Öffnen Sie diese Seite in Safari.', 'Tippen Sie auf „Teilen“ (das Quadrat mit dem Pfeil nach oben).', 'Wählen Sie „Zum Home-Bildschirm“ und bestätigen Sie mit „Hinzufügen“.'] },
      geral: {
        titulo: 'App installieren',
        passos: [
          'In Chrome oder Edge (Windows, Mac, Linux, Android) nutzen Sie die Schaltfläche „App installieren“ auf dieser Seite oder das Installationssymbol in der Adressleiste.',
          'Wählen Sie im Browsermenü „SaibaTudo Química installieren“ (oder „Zum Startbildschirm hinzufügen“).',
          'Nach der Installation öffnet sich die App in einem eigenen Fenster und funktioniert auch ohne Internet (mit den bereits geladenen Daten).'
        ]
      }
    },
    componentes: {
      fonte: 'Quelle: ',
      palavraSinal: 'Signalwort: ',
      pictogramasAria: 'Gefahrenpiktogramme',
      frasesAria: 'Gefahrenhinweise (H-Sätze)',
      fraseIndisponivel: 'Der Text des Hinweises ist in diesem Paket nicht verfügbar.',
      passoAPasso: 'Schritt für Schritt',
      fraseEmIdioma: '(Text auf {idioma})'
    },
    molecula: {
      aria: '2D-Struktur von {nome}',
      erroDesenho: 'Diese Struktur konnte nicht gezeichnet werden.',
      erroSmiles: 'Der SMILES-Code dieser Struktur konnte nicht interpretiert werden.',
      erroBiblioteca: 'Die Zeichenbibliothek ist derzeit nicht verfügbar (offline?). Der SMILES-Code steht weiterhin im Steckbrief.'
    },
    nomes: {
      emIdioma: '{nome} (Name auf {idioma})',
      nomeEmIdioma: 'Name auf {idioma}'
    },
    inicio: {
      titulo: 'Start',
      cabecalho: 'Fragen Sie zur Chemie',
      intro: 'Elemente, Verbindungen, Berechnungen mit Rechenweg und chemische Sicherheit. Die Antworten stammen aus offenen Daten und aus Berechnungen auf Ihrem Gerät.',
      campoAria: 'Fragen Sie zur Chemie',
      placeholder: 'z. B.: molare Masse von Wasser, Fe + O2 -> Fe2O3, pH von HCl 0,01 mol/L',
      exemplosAria: 'Beispielfragen',
      badge: 'Nichts verlässt Ihr Gerät. KI in der Cloud ist noch nicht verfügbar.',
      explore: 'Entdecken',
      cartoes: {
        tabela: { titulo: 'Periodensystem', descricao: 'Farben nach Kategorie, Filter nach Block, Periode, Gruppe und Aggregatzustand.' },
        compostos: { titulo: 'Verbindungen', descricao: 'Suche nach Name, Formel, CAS oder CID mit 2D-Struktur.' },
        calculadoras: { titulo: 'Rechner', descricao: 'Molare Masse, Gleichungen ausgleichen, Stöchiometrie, Konzentration, pH, ideales Gas und Einheiten.' },
        seguranca: { titulo: 'Sicherheit', descricao: 'GHS-Piktogramme, H-Sätze und wie Sie gefährliche Mischungen vermeiden.' },
        sobre: { titulo: 'Über die Daten', descricao: 'Quellen, Lizenzen, Datumsangaben und Prüfung der digitalen Signatur.' }
      },
      historico: { ultima: 'Letzte Frage', anterior: 'Vorherige Frage', proxima: 'Nächste Frage oder leeres Feld' },
      limpar: 'Text löschen',
      analisando: 'Wird analysiert',
      analisandoPergunta: 'Frage wird analysiert…',
      pensando: 'Denke nach…',
      perguntar: 'Fragen',
      copiada: 'Antwort kopiert.',
      naoCopiou: 'In diesem Browser konnte nicht kopiert werden.',
      copiarRodape: 'Quellen:',
      relatoTitulo: 'Chemie: Antwort auf „{pergunta}“',
      relatoCorpo: 'Was war an der Antwort falsch oder was fehlte? (Bitte keine personenbezogenen Daten angeben.)\n\nFrage: {pergunta}',
      respostaAnuncio: 'Antwort: {titulo}'
    },
    resposta: {
      rotuloRecusa: 'Anfrage aus Sicherheitsgründen abgelehnt',
      rotuloResolvida: 'Antwort auf Ihrem Gerät aus den Daten erstellt',
      rotuloNaoResolvida: 'Ich konnte nicht antworten',
      origemNuvem: 'mit KI in der Cloud',
      origemAparelho: 'auf Ihrem Gerät',
      origem: 'Antwort erstellt {origem}',
      dadosDe: ' • Datenpaket vom {data}',
      fechar: 'Antwort schließen',
      tambem: 'Sie können auch fragen',
      fontes: 'Quellen und Lizenzen ({n})',
      copiar: 'Antwort kopieren',
      relatar: 'Ein Problem mit dieser Antwort melden'
    },
    tabela: {
      titulo: 'Periodensystem',
      intro: 'Tippen Sie auf ein Element, um alle Eigenschaften mit Einheiten und Quellen zu sehen. Die Farben zeigen die Kategorie; filtern Sie nach Block, Periode, Gruppe oder Aggregatzustand.',
      buscar: 'Suchen',
      placeholder: 'Name, Symbol oder Ordnungszahl',
      filtrosAria: 'Filter des Periodensystems',
      bloco: 'Block', blocoN: 'Block {b}', periodo: 'Periode', periodoN: 'Periode {p}', grupo: 'Gruppe', grupoN: 'Gruppe {g}', estado: 'Aggregatzustand', todos: 'Alle',
      estados: { solido: 'Fest', liquido: 'Flüssig', gas: 'Gasförmig' },
      limpar: 'Filter zurücksetzen',
      legendaAria: 'Kategorien (zum Filtern antippen)',
      contagemTodos: '{n} Elemente',
      contagemFiltro: '{n} von {total} Elementen entsprechen den Filtern',
      regiaoAria: 'Periodensystem (auf schmalen Bildschirmen seitlich scrollen)',
      vazio: 'Elementdaten sind nicht verfügbar.',
      rotuloElemento: '{nome}, Symbol {simbolo}, Ordnungszahl {z}, {categoria}, {estado}'
    },
    elemento: {
      naoEncontrado: 'Element nicht gefunden',
      naoHa: 'In den Daten gibt es kein „{simbolo}“.',
      abrirTabela: 'Periodensystem öffnen',
      voltar: 'Periodensystem',
      nomeEmIngles: 'Name auf Englisch',
      incerteza: 'Unsicherheit der Atommasse',
      sub: 'Element {z} · {categoria} · {estado} unter Standardbedingungen',
      propriedades: 'Eigenschaften',
      compostosCom: 'Verbindungen mit {nome}',
      buscarCompostosDe: 'Verbindungen von {nome} suchen',
      mostrando: (p) => (p.n === 1 ? 'Es wird eine Verbindung aus dem Index angezeigt; nutzen Sie die Verbindungssuche, um mehr zu sehen.' : `Es werden ${p.n} Verbindungen aus dem Index angezeigt; nutzen Sie die Verbindungssuche, um mehr zu sehen.`),
      calcular: 'Berechnen',
      massaMolarDe: 'Molare Masse von {nome}'
    },
    compostos: {
      titulo: 'Verbindungen',
      intro: 'Suche nach Name, Trivialname, IUPAC-Name, Formel, CAS-Nummer oder PubChem-CID.',
      placeholder: 'Name, Formel, CAS oder CID (z. B.: Aspirin, H2SO4, 64-17-5)',
      buscar: 'Verbindung suchen',
      buscando: 'Suche läuft…',
      semIndice: 'Der Verbindungsindex ist nicht verfügbar.',
      erro: 'Die Verbindungen konnten nicht geladen werden ({msg}).',
      resultados: (p) => `${p.n} ${p.n === 1 ? 'Ergebnis' : 'Ergebnisse'}`,
      nenhum: 'Keine Verbindung für „{q}“ gefunden.',
      total: '{n} Verbindungen im Paket. Es werden einige in alphabetischer Reihenfolge angezeigt.',
      cas: 'CAS {cas}',
      naoEncontrado: 'Verbindung nicht gefunden',
      naoHa: 'Diese Verbindung ist nicht im Datenpaket enthalten.',
      buscarCompostos: 'Verbindungen suchen',
      cid: 'CID {cid}',
      voltar: 'Verbindungen',
      nomePopular: 'Trivialname',
      nomeIupac: 'IUPAC-Name',
      nomePt: 'Name auf Portugiesisch',
      nomePtPendente: 'ausstehend: angezeigt wird der IUPAC-Name',
      sinonimos: 'Synonyme',
      formula: 'Formel',
      formulaHill: 'Formel (Hill-Notation)',
      cidPubchem: 'PubChem-CID',
      smiles: 'SMILES',
      wikidata: 'Wikidata',
      dados: 'Daten der Verbindung',
      fontePubchem: 'PubChem-CID {cid} (NCBI/NLM)',
      estrutura: '2D-Struktur',
      desenhada: 'Auf Ihrem Gerät aus dem SMILES-Code im Datenpaket mit SmilesDrawer (MIT) gezeichnet.',
      seguranca: 'Sicherheit',
      classificacaoGhs: 'Gefahreneinstufung (GHS)',
      fonteFrases: 'Gefahrenhinweise: UNECE-GHS / ECHA-CLP',
      semGhs: 'Das Paket enthält für diese Verbindung keine harmonisierte GHS-Einstufung. Das heißt nicht, dass sie harmlos ist: Prüfen Sie das Sicherheitsdatenblatt des Produkts.',
      icsc: 'ICSC-Karte auf der Website der ILO',
      comoLer: 'So lesen Sie Piktogramme und H-Sätze',
      definicao: 'Definition (ChEBI)',
      definicaoFonte: 'Definition auf Englisch. Quelle: ',
      chebi: 'ChEBI ({id})',
      chebiSem: 'ChEBI (EMBL-EBI)',
      calcular: 'Berechnen',
      massaMolarDe: 'Molare Masse von {formula}',
      perguntar: 'Zu dieser Verbindung fragen',
      perguntaPerigos: 'Gefahren von {nome}'
    },
    calculadoras: {
      titulo: 'Rechner',
      intro: 'Jedes Ergebnis zeigt Rechenweg und Formeln. Alles wird auf Ihrem Gerät berechnet; Atommassen und Konstanten stammen aus dem signierten Datenpaket.',
      naoEncontrada: 'Rechner nicht gefunden',
      verTodas: 'Alle Rechner ansehen',
      voltar: 'Rechner',
      resultadoAria: 'Ergebnis',
      passoAPasso: 'Schritt für Schritt',
      exemplosAria: 'Beispiele',
      unidadeDe: 'Einheit von {rotulo}',
      lista: {
        'massa-molar': { titulo: 'Molare Masse', descricao: 'Summe der Atommassen aus dem Datenpaket, mit prozentualer Zusammensetzung.' },
        balanceamento: { titulo: 'Gleichungen ausgleichen', descricao: 'Exakte lineare Algebra, mit Ionen und Rechenschritten.' },
        estequiometria: { titulo: 'Stöchiometrie', descricao: 'Masse, Stoffmenge, Teilchen und Volumen (Normbedingungen); limitierendes Reagenz.' },
        concentracao: { titulo: 'Konzentration und Verdünnung', descricao: 'Molarität, g/L, Prozentangaben und C₁V₁ = C₂V₂.' },
        ph: { titulo: 'pH', descricao: 'Starke und schwache Säuren und Basen (mit Ka oder Kb) und Umrechnungen.' },
        'gas-ideal': { titulo: 'Ideales Gas', descricao: 'PV = nRT mit der Konstante R aus dem Paket (CODATA).' },
        unidades: { titulo: 'Einheitenumrechnung', descricao: 'Druck, Volumen, Masse, Temperatur, Energie und mehr.' }
      },
      massaMolar: {
        formula: 'Chemische Formel', placeholder: 'z. B.: Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3', ajuda: 'Klammern, Hydrate mit „·“ (oder „.“), Ladungen am Ende: Fe3+, SO4^2-.',
        fichaDe: 'Steckbrief von {nome}', calcular: 'Molare Masse berechnen'
      },
      balanceamento: {
        equacao: 'Reaktionsgleichung', placeholder: 'z. B.: Fe + O2 -> Fe2O3',
        ajuda: 'Trennen Sie Stoffe mit „+“ und verwenden Sie „->“ oder „→“. Ionen funktionieren: Zn + Cu2+ -> Zn2+ + Cu. Aggregatzustände (s), (l), (g), (aq) werden ignoriert.',
        conferencia: 'Kontrolle: Atome jedes Elements (und Ladung) auf beiden Seiten', elemento: 'Element', reagentes: 'Edukte', produtos: 'Produkte', igual: 'Gleich?', carga: 'Ladung', sim: 'ja', nao: 'nein',
        coeficientesIgnorados: 'Die eingegebenen Koeffizienten wurden ignoriert: Die App gleicht die gesamte Gleichung aus.', balancear: 'Ausgleichen'
      },
      estequiometria: {
        modo: 'Was möchten Sie tun?', conv: 'Masse, Stoffmenge, Teilchen und Volumen (Normbedingungen) eines Stoffes umrechnen', reacao: 'Reaktion: limitierendes Reagenz und Menge der Produkte',
        substancia: 'Stoff (Formel)', placeholderSubstancia: 'z. B.: H2O, CO2, NaCl', quantidade: 'Menge',
        ajudaQuantidade: 'L und mL = Volumen eines idealen Gases bei Normbedingungen (0 °C und 1 atm). „Teilchen“ = Moleküle, Atome oder Ionen.', particulas: 'Teilchen',
        equacao: 'Reaktionsgleichung', placeholderEquacao: 'z. B.: H2 + O2 -> H2O', ajudaEquacao: 'Die App gleicht die Gleichung aus. Geben Sie die Menge mindestens eines Stoffes an.',
        rendimento: 'Ausbeute (%)', ajudaRendimento: 'Optional. 100 % = theoretische Ausbeute.', quantidadeDe: 'Menge von {formula}', calcular: 'Berechnen',
        tabelaTitulo: 'Mengen der einzelnen Stoffe', tabelaLegenda: 'Edukte: Anfangsmenge, verbrauchte und verbleibende Menge; Produkte: gebildete Menge',
        cabecalho: ['Stoff', 'Rolle', 'Koeff.', 'M (g/mol)', 'Mol', 'Masse (g)', 'Teilchen', 'Volumen (Norm, L)'],
        produto: 'Produkt', limitante: 'limitierendes Reagenz', reagente: 'Edukt'
      },
      concentracao: {
        tipo: 'Art der Berechnung', soluto: 'Gelöster Stoff (Formel)', exNaCl: 'z. B.: NaCl', exNaOH: 'z. B.: NaOH', massaSoluto: 'Masse des gelösten Stoffes', volumeSolucao: 'Volumen der Lösung',
        concentracaoDesejada: 'Gewünschte Konzentration', valorConcentracao: 'Konzentrationswert', converter: 'Umrechnen', glParaMol: 'g/L → mol/L', molParaGl: 'mol/L → g/L',
        massaSolucao: 'Masse der Lösung', unidadeConcentracao: 'Konzentrationseinheit', unidadeVolume: 'Volumeneinheit',
        c1: 'C₁ (Anfangskonzentration)', v1: 'V₁ (Anfangsvolumen)', c2: 'C₂ (Endkonzentration)', v2: 'V₂ (Endvolumen)',
        deixeEmBranco: 'Lassen Sie das Feld leer, das berechnet werden soll.', calcular: 'Berechnen'
      },
      ph: {
        tipo: 'Art der Lösung', concentracao: 'Konzentration (mol/L)', ex001: 'z. B.: 0,01', ex01: 'z. B.: 0,1', hLiberados: 'Freigesetzte H⁺ pro Formeleinheit', ohLiberados: 'Freigesetzte OH⁻ pro Formeleinheit',
        ajudaN: 'HCl = 1; H₂SO₄ = 2 (Schulmodell); NaOH = 1; Ca(OH)₂ = 2.', kaOuPka: 'Ka oder pKa', kbOuPkb: 'Kb oder pKb', exK: 'z. B.: 1,8e-5',
        ajudaK: 'Wissenschaftliche Schreibweise: 1,8e-5 oder 1,8 x 10^-5.', valorInformado: 'Der angegebene Wert ist', valorConhecido: 'Bekannter Wert', hMolL: '[H⁺] (mol/L)', ohMolL: '[OH⁻] (mol/L)',
        valor: 'Wert', calcular: 'pH berechnen'
      },
      gas: {
        calcular: 'Berechnen', volume: 'Volumen (V)', pressao: 'Druck (P)', quantidade: 'Stoffmenge (n)', temperatura: 'Temperatur (T)',
        formulaGas: 'Formel des Gases', exCO2: 'z. B.: CO2', massaGas: 'Masse des Gases', usarMassa: 'Statt n die Masse und die Formel des Gases angeben', botao: 'Berechnen'
      },
      unidades: {
        grandeza: 'Größe', valor: 'Wert', ex5: 'z. B.: 5', de: 'Von', para: 'Nach', converter: 'Umrechnen', inverter: 'Tauschen', equivaleA: '{valor} {de} entspricht',
        grandezas: { massa: 'Masse', volume: 'Volumen', comprimento: 'Länge', pressao: 'Druck', energia: 'Energie', temperatura: 'Temperatur', tempo: 'Zeit', quantidade: 'Stoffmenge', concentracao: 'Konzentration' }
      }
    },
    seguranca: {
      titulo: 'Chemische Sicherheit',
      intro: 'So lesen Sie die Gefahrenhinweise auf chemischen Produkten. Die App zeigt die GHS-Einstufung der Verbindungen im Datenpaket und führt Sie zu den offiziellen Karten; sie vermittelt nicht, wie man gefährliche Stoffe herstellt.',
      aviso: 'Aus Sicherheitsgründen lehnt die App Anfragen zu Synthese, Reinigung oder Rezepten für den Hausgebrauch von Sprengstoffen, chemischen Waffen, illegalen Drogen und anderen gefährlichen Reagenzien ab. Fragen zu Gefahren, PSA, Lagerung und Erster Hilfe werden beantwortet.',
      verPerigos: 'Gefahren einer Verbindung ansehen', buscar: 'Verbindung suchen', placeholderBusca: 'Name, Formel oder CAS der Verbindung', verPictogramas: 'Gefahren und Piktogramme ansehen',
      pictogramas: 'GHS-Piktogramme',
      pictogramasIntro: 'Das GHS (das Global Harmonisierte System der UN) verwendet Rauten mit rotem Rand. Die folgenden Zeichnungen sind vereinfachte, für diese App erstellte Versionen.',
      palavraSinal: 'Signalwort', perigo: 'Gefahr', atencao: 'Achtung',
      sinalTexto1: ' kennzeichnet die schwereren Kategorien; ', sinalTexto2: ' kennzeichnet die weniger schweren. Stoffe mit geringerer Gefährlichkeit können ohne Signalwort auftreten.',
      comoLer: 'So lesen Sie H-Sätze', frasesIntro: 'Jeder Gefahrenhinweis hat einen Code: den Buchstaben H und drei Ziffern. Die erste Ziffer gibt die Art der Gefahr an:',
      codigosSomados: 'Kombinierte Codes wie H302+H312 fassen die Hinweise zu einem zusammen. Texte: UNECE-GHS / ECHA-CLP (EUR-Lex), auf Deutsch, wenn verfügbar.',
      procurarFrase: 'Hinweis suchen', placeholderFiltro: 'Nach Code oder Wort filtern (z. B.: H314, entzündbar)', nenhumaFrase: 'Kein Hinweis gefunden.',
      boasPraticas: 'Gute Praxis', fontesOficiais: 'Offizielle Quellen (externe Links)',
      links: [
        ['Internationale Chemikaliensicherheitskarten (ICSC), ILO/WHO', 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', 'Karten nach Stoff (die App kopiert die Karten nicht: Sie verweist nur darauf).'],
        ['PubChem: GHS-Einstufung von Verbindungen', 'https://pubchem.ncbi.nlm.nih.gov/ghs/', 'Erklärt die Herkunft der in dieser App verwendeten Einstufung.'],
        ['UNECE: Beförderung gefährlicher Güter und GHS', 'https://unece.org/transport/dangerous-goods', 'Ursprung des Global Harmonisierten Systems (GHS) der UN.']
      ]
    },
    perigos: {
      pictogramas: {
        GHS01: 'Explosiv', GHS02: 'Entzündbar', GHS03: 'Oxidierend', GHS04: 'Gas unter Druck', GHS05: 'Ätzend',
        GHS06: 'Akute Toxizität (giftig oder tödlich)', GHS07: 'Gesundheitsschädlich, reizend oder sensibilisierend', GHS08: 'Schwere Gesundheitsgefahr', GHS09: 'Gewässergefährdend'
      },
      descricoes: {
        GHS01: 'Explosivstoffe, selbstzersetzliche Stoffe und organische Peroxide',
        GHS02: 'entzündbare Stoffe, pyrophore Stoffe, selbsterhitzungsfähige Stoffe oder Stoffe, die bei Berührung mit Wasser entzündbare Gase abgeben',
        GHS03: 'oxidierende Stoffe', GHS04: 'Gase unter Druck',
        GHS05: 'korrosiv gegenüber Metallen, verursacht Hautverätzungen und schwere Augenschäden', GHS06: 'akute Toxizität (tödlich oder giftig)',
        GHS07: 'mäßige akute Toxizität (gesundheitsschädlich), Haut- und Augenreizung, Hautsensibilisierung und Reizung der Atemwege',
        GHS08: 'Karzinogenität, Keimzellmutagenität, Reproduktionstoxizität, Sensibilisierung der Atemwege, spezifische Zielorgan-Toxizität und Aspirationsgefahr',
        GHS09: 'gewässergefährdend'
      },
      grupos: [
        { faixa: 'H2xx', titulo: 'Physikalische Gefahren', descricao: 'Explosivstoffe, entzündbare Stoffe, oxidierende Stoffe, Gase unter Druck, korrosiv gegenüber Metallen (H200 bis H290).' },
        { faixa: 'H3xx', titulo: 'Gesundheitsgefahren', descricao: 'akute Toxizität, Hautverätzung und -reizung, Augenschäden, Sensibilisierung, Mutagenität, Karzinogenität, Reproduktions- und Zielorgan-Toxizität (H300 bis H373).' },
        { faixa: 'H4xx', titulo: 'Umweltgefahren', descricao: 'Toxizität für Gewässerorganismen und für die Ozonschicht (H400 bis H420).' }
      ],
      sinal: { perigo: 'Gefahr', atencao: 'Achtung' }
    },
    sobre: {
      titulo: 'Über die Daten',
      intro: 'Jede angezeigte Zahl stammt aus dem signierten Datenpaket oder aus einer Berechnung auf Ihrem Gerät. Von KI erzeugte Texte liefern nie Zahlen (und KI in der Cloud ist noch nicht verfügbar).',
      pacote: 'Datenpaket', versao: 'Version', geradoEm: 'Erstellt am', assinatura: 'Digitale Signatur', origem: 'Herkunft', arquivos: 'Dateien', arquivosValor: '{n} ({kb} KB insgesamt)',
      elementos: 'Elemente', compostos: 'Verbindungen im Index', ultimaVerificacao: 'Letzte Prüfung', avisosCarga: 'Warnungen beim Laden: {msgs}',
      dados: 'Daten im Paket', textos: 'Lizenzierte Texte (Erläuterungen)', externas: 'Externe Referenzen (Links)', licencasManifesto: 'Im Manifest aufgeführte Lizenzen',
      comoObtidos: 'Wie die Werte gewonnen werden',
      como: [
        'Elemente, Verbindungen, Konstanten und Regeln: versionierte JSON-Dateien, mit geprüftem SHA-256 und signiertem Manifest.',
        'Molare Masse, Gleichungen ausgleichen, Stöchiometrie, Konzentration, pH, ideales Gas und Einheiten: getesteter, deterministischer Code auf Ihrem Gerät.',
        '2D-Struktur: aus dem SMILES-Code im Paket gezeichnet. GHS-Piktogramme: vereinfachte, für diese App erstellte Zeichnungen.',
        'Auszüge aus Erläuterungen: mit Quelle und Lizenz zitiert; automatische Übersetzungen sind als solche gekennzeichnet.'
      ],
      bibliotecas: 'Open-Source-Bibliotheken',
      rodape: 'SaibaTudo ist unabhängig und Open Source (MIT). ', privacidade: 'Datenschutzerklärung',
      mantenedor: 'Betreuer: {x}', licenca: 'Lizenz: {x}', acessadoEm: 'Abgerufen am: {x}', atribuicao: 'Namensnennung: {x}', uso: 'Verwendung: {x}',
      somenteLink: 'nur Link',
      referencias: {
        openstax: 'Offenes Lehrbuch mit Nutzungsbeschränkungen: als Lektüre empfohlen; es wurde kein Auszug kopiert.',
        icsc: 'Karten nach Stoff; die Schaltfläche „ICSC-Karte auf der Website der ILO“ öffnet die Suche nach CAS.',
        nist: 'Thermochemische Daten und Spektren; als Referenz empfohlen.',
        libretexts: 'Offene Chemietexte; als ergänzende Lektüre empfohlen.'
      },
      bibliotecasUso: { katex: 'Formeln und Rechenschritte', smiles: '2D-Struktur von Molekülen', poppins: 'Schrift der Überschriften' },
      assinaturaRotulo: {
        verificada: 'bestätigt (ECDSA P-256 mit dem öffentlichen Schlüssel der App)',
        invalida: 'stimmt NICHT überein: Es werden weiterhin die eigenen Daten der Website verwendet, sie wurden aber nicht authentifiziert',
        indisponivel: 'konnte in diesem Browser nicht geprüft werden (WebCrypto erfordert HTTPS)'
      },
      origemRotulo: {
        verificada: 'Website (digitale Signatur bestätigt)', invalida: 'Website (Signatur NICHT bestätigt)', indisponivel: 'Website (Prüfung in diesem Browser nicht verfügbar)',
        atualizada: 'geprüfte Aktualisierung (digitale Signatur)'
      },
      sigDetalhe: { invalida: 'Die Signatur des Manifests stimmt nicht überein; es werden die eigenen Dateien der Website verwendet.', indisponivel: 'Der Browser bietet in diesem Kontext kein WebCrypto an (verwenden Sie HTTPS).' },
      atualizacao: {
        botao: 'Auf Datenaktualisierungen prüfen', verificando: 'Wird geprüft…', atual: 'Die Daten sind bereits auf dem neuesten Stand.', atualizado: 'Daten auf Version {version} aktualisiert.',
        ignorado: 'Nichts zu tun: {motivo}', falha: 'Die Prüfung ist derzeit nicht möglich ({motivo}).',
        motivos: {
          semVerificacao: 'Signaturprüfung nicht verfügbar (HTTPS erforderlich)', assinaturaInvalida: 'UNGÜLTIGE Signatur des Manifests — Aktualisierung abgelehnt',
          maisAntigo: 'das entfernte Paket ist älter als das aktive (Rollback-Schutz)'
        }
      }
    },
    config: {
      titulo: 'Einstellungen', salva: 'Einstellung auf diesem Gerät gespeichert.', aparencia: 'Darstellung', tema: 'Design', tamanhoTexto: 'Textgröße', idioma: 'Sprache',
      idiomaAjuda: 'Ändert die Oberfläche, die Antworten und den Interpreter für Ihre Fragen. Namen und Texte, die es in dieser Sprache noch nicht gibt, erscheinen auf Englisch oder Portugiesisch, immer gekennzeichnet.',
      instalar: 'Installieren', jaInstalado: 'Die App ist auf diesem Gerät bereits installiert.', instalarApp: 'App installieren',
      ia: 'Künstliche Intelligenz in der Cloud',
      iaAviso: 'Noch nicht verfügbar. Wenn es sie gibt, ist sie optional, funktioniert nur mit Ihrer Einwilligung und liefert nie Zahlen: Diese stammen weiterhin aus den Daten und den Berechnungen. In dieser Version verlässt nichts Ihr Gerät.',
      dados: 'Daten', versaoPacote: 'Version des Pakets', assinatura: 'Signatur',
      assinaturaValor: { verificada: 'bestätigt', invalida: 'NICHT bestätigt', indisponivel: 'in diesem Browser nicht verfügbar' },
      privacidade: 'Datenschutz', privacidadeTexto: 'Wir speichern auf diesem Gerät nur das Design, die Textgröße und die Sprache sowie den Cache für die Offline-Nutzung. ', politica: 'Datenschutzerklärung',
      apagar: 'Daten auf diesem Gerät löschen', confirmar: 'Zum Bestätigen erneut tippen', apagados: 'Daten gelöscht. Seite wird neu geladen…'
    }
  },

  propriedades: {
    rotulos: {
      numeroAtomico: 'Ordnungszahl', massaAtomica: 'Atommasse', simbolo: 'Symbol', grupo: 'Gruppe (Familie)', periodo: 'Periode', bloco: 'Block', categoria: 'Kategorie',
      configuracaoEletronica: 'Elektronenkonfiguration', eletronegatividade: 'Elektronegativität (Pauling)', raioAtomicoPm: 'Atomradius (van der Waals)',
      afinidadeEletronicaKJmol: 'Elektronenaffinität', energiaIonizacaoKJmol: 'Ionisierungsenergie', pontoFusaoK: 'Schmelzpunkt', pontoEbulicaoK: 'Siedepunkt',
      densidadeKgm3: 'Dichte', estadoPadrao: 'Aggregatzustand (Standardbedingungen)', estadosOxidacao: 'Oxidationszahlen', descoberta: 'Entdeckung',
      massaMolar: 'molare Masse', massaExata: 'exakte Masse (monoisotopisch)', formula: 'Formel', cas: 'CAS-Nummer', cid: 'PubChem-CID', smiles: 'SMILES', inchiKey: 'InChIKey',
      nomeIupac: 'IUPAC-Name', xlogp: 'XLogP (berechnete Lipophilie)', doadoresH: 'Wasserstoffbrücken-Donatoren', aceptoresH: 'Wasserstoffbrücken-Akzeptoren',
      ligacoesRotaveis: 'drehbare Bindungen', carga: 'elektrische Ladung', tpsa: 'polare Oberfläche (TPSA)'
    },
    categorias: {
      metal_alcalino: 'Alkalimetall', metal_alcalino_terroso: 'Erdalkalimetall', metal_transicao: 'Übergangsmetall', metal_pos_transicao: 'Post-Übergangsmetall',
      semimetal: 'Halbmetall', nao_metal: 'Nichtmetall', halogenio: 'Halogen', gas_nobre: 'Edelgas', lantanideo: 'Lanthanoid', actinideo: 'Actinoid',
      desconhecida: 'unbekannte chemische Eigenschaften', metal: 'Metall'
    },
    categoriasPlural: {
      metal_alcalino: 'Alkalimetalle', metal_alcalino_terroso: 'Erdalkalimetalle', metal_transicao: 'Übergangsmetalle', metal_pos_transicao: 'Post-Übergangsmetalle',
      semimetal: 'Halbmetalle', nao_metal: 'Nichtmetalle', halogenio: 'Halogene', gas_nobre: 'Edelgase', lantanideo: 'Lanthanoide', actinideo: 'Actinoide', metal: 'Metalle'
    },
    estados: { solido: 'fest', liquido: 'flüssig', gas: 'gasförmig', desconhecido: 'unbekannt' },
    descoberta: { em: 'im Jahr {ano}', por: 'von {por}' },
    classes: {
      acido: 'Säure', acido_carboxilico: 'Carbonsäure', base: 'Base', sal: 'Salz', oxido: 'Oxid', hidroxido: 'Hydroxid', peroxido: 'Peroxid', oxidante: 'Oxidationsmittel',
      inorganico: 'anorganische Verbindung', organico: 'organische Verbindung', alcool: 'Alkohol', fenol: 'Phenol', aldeido: 'Aldehyd', cetona: 'Keton', eter: 'Ether', ester: 'Ester', amina: 'Amin', amida: 'Amid',
      alcano: 'Alkan', alqueno: 'Alken', alquino: 'Alkin', hidrocarboneto: 'Kohlenwasserstoff', aromatico: 'aromatische Verbindung', heterociclico: 'Heterocyclus', halogenado: 'halogenierte Verbindung',
      carboidrato: 'Kohlenhydrat', aminoacido: 'Aminosäure', lipidio: 'Lipid', proteina: 'Protein', vitamina: 'Vitamin', farmaco: 'Arzneimittel', solvente: 'Lösungsmittel', polimero: 'Polymer',
      gas: 'Gas', metal: 'Metall', nitrocomposto: 'Nitroverbindung', nitrila: 'Nitril', tiol: 'Thiol', sulfonato: 'Sulfonat', organometalico: 'metallorganische Verbindung', ionico: 'ionische Verbindung',
      molecular: 'molekulare Verbindung', esteroide: 'Steroid', alcaloide: 'Alkaloid', acido_forte: 'starke Säure', base_forte: 'starke Base', organoclorado: 'Organochlorverbindung'
    },
    unidades: {
      kg: 'Kilogramm', g: 'Gramm', t: 'Tonne', lb: 'Pfund', oz: 'Unze', 'µg': 'Mikrogramm', m3: 'Kubikmeter', L: 'Liter', cm3: 'Kubikzentimeter', dm3: 'Kubikdezimeter',
      'µL': 'Mikroliter', gal: 'Gallone (US)', m: 'Meter', 'Å': 'Ångström', in: 'Zoll', ft: 'Fuß', mi: 'Meile', Pa: 'Pascal', bar: 'Bar', atm: 'Atmosphäre', mmHg: 'Millimeter Quecksilbersäule',
      psi: 'Pfund-Kraft pro Quadratzoll', J: 'Joule', cal: 'thermochemische Kalorie', eV: 'Elektronenvolt', kWh: 'Kilowattstunde', K: 'Kelvin', '°C': 'Grad Celsius', '°F': 'Grad Fahrenheit',
      s: 'Sekunde', min: 'Minute', h: 'Stunde', d: 'Tag', mol: 'Mol', 'mol/L': 'Mol pro Liter', 'mmol/L': 'Millimol pro Liter', 'µmol/L': 'Mikromol pro Liter'
    }
  },

  respostas: {
    fontes: {
      app: 'SaibaTudo Química (diese App)',
      calculo: 'Lokale Berechnung der App mit Daten aus dem signierten Paket',
      pacote: 'Datenpaket',
      frasesPadrao: 'Gefahrenhinweise: UNECE-GHS / ECHA-CLP',
      regras: 'regras.json (signiertes Datenpaket)',
      politica: 'Sicherheitsrichtlinie der App (lokale Regeln)',
      pubchemCid: 'PubChem-CID {cid} (NCBI/NLM)',
      chebi: 'ChEBI ({id})', chebiSem: 'ChEBI (EMBL-EBI)',
      constanteR: 'Lokale Berechnung mit der Konstante R aus dem Paket (CODATA)',
      tabelaUnidades: 'Einheitentabelle: {origem}',
      orientacaoGeral: 'Allgemeine Hinweise der App (keine Daten zu einem bestimmten Stoff)',
      massasAtomicas: 'Atommassen aus dem Datenpaket (elementos.json)',
      constantes: 'Konstanten aus dem Datenpaket (constantes.json)',
      boyle: 'Lokale Berechnung der App mit der Einheitentabelle aus dem Datenpaket',
      wikipedia: 'Wikipedia auf {idioma}',
      trechoEm: 'Text auf {idioma} (noch nicht übersetzt).'
    },
    unidades: {
      origem: { pacote: 'regras.json (signiertes Datenpaket)', padrao: 'die Standardtabelle der App (SI-Definitionen)' },
      pKw: { regras: 'regras.json (Datenpaket)', constantes: 'constantes.json (Datenpaket)', convencao: 'Konvention bei 25 °C (Ionenprodukt des Wassers, pH + pOH = 14)' },
      constanteRDerivada: 'Universelle Gaskonstante (N_A × k_B)'
    },
    sugestoes: {
      padrao: [
        'Was ist die molare Masse von Wasser?', 'Fe + O2 -> Fe2O3 ausgleichen', 'pH von HCl 0,01 mol/L', 'Struktur von Aspirin', 'Gefahren von Schwefelsäure', '5 atm in kPa umrechnen',
        'Wie viele Mol sind in 18 g Wasser enthalten?', 'Schmelzpunkt von Eisen', 'Elemente der Gruppe 17', 'Was ist ein Mol?', 'Warum darf man Bleichlauge nicht mit Ammoniak mischen?'
      ],
      seguras: ['Welche PSA sollte ich bei Schwefelsäure tragen?', 'Erste Hilfe bei Ätznatron im Auge', 'Warum darf man Bleichlauge nicht mit Ammoniak mischen?'],
      massaAgua: 'Was ist die molare Masse von Wasser?', balancear: 'Fe + O2 -> Fe2O3 ausgleichen', phHcl: 'pH von HCl 0,01 mol/L', perigosSulfurico: 'Gefahren von Schwefelsäure',
      converter: '5 atm in kPa umrechnen', molsAgua: 'Wie viele Mol sind in 18 g Wasser enthalten?', fusaoFerro: 'Schmelzpunkt von Eisen', grupo17: 'Elemente der Gruppe 17', periodo3: 'Elemente der Periode 3',
      misturar: 'Warum darf man Bleichlauge nicht mit Ammoniak mischen?', fontes: 'Was sind die Quellen?', origemDados: 'Woher kommen die Daten?', massaMolarAgua: 'Molare Masse von Wasser',
      formulaSulfurico: 'Wie lautet die Formel von Schwefelsäure?', compareNaCl: 'Natrium und Chlor vergleichen', maisEletronegativo: 'Das elektronegativste Element',
      molaridade: 'Molarität von 5,85 g NaCl in 500 mL', volumeGas: 'Welches Volumen haben 2 mol Gas bei 300 K und 1 atm?',
      fusaoDe: 'Schmelzpunkt von {nome}', configuracaoDe: 'Elektronenkonfiguration von {nome}', massaMolarDe: 'Molare Masse von {nome}', estruturaDe: 'Struktur von {nome}',
      perigosDe: 'Gefahren von {nome}', densidadeDe: 'Dichte von {nome}'
    },
    orientacaoGeral: [
      'Lesen Sie vor der Verwendung das Etikett und das Sicherheitsdatenblatt (SDB) des Produkts und befolgen Sie die Anweisungen des Herstellers.',
      'Tragen Sie zum Produkt passende Handschuhe und Schutzbrille und arbeiten Sie in einem gut belüfteten Raum.',
      'Mischen Sie keine Chemikalien; bewahren Sie sie im Originalbehälter, fest verschlossen, außerhalb der Reichweite von Kindern und fern von Lebensmitteln und Wärmequellen auf.',
      'Spülen Sie bei Haut- oder Augenkontakt mit reichlich fließendem Wasser; gehen Sie nach dem Einatmen an die frische Luft; führen Sie ohne fachliche Anweisung kein Erbrechen herbei.',
      'Suchen Sie bei jeder Vergiftung oder jedem Unfall ärztliche Hilfe oder die Giftinformationszentrale Ihrer Region auf und nehmen Sie die Verpackung des Produkts mit.'
    ],
    blocos: {
      palavraSinal: 'Signalwort: {x}', estrutura2d: '2D-Struktur von {nome}', passoAPasso: 'Schritt für Schritt', comoCalcular: 'So wird gerechnet', comoConverter: 'So wird umgerechnet'
    },
    erro: { titulo: 'Ich konnte diese Antwort nicht erstellen', texto: 'Beim Lesen der Daten ist ein Problem aufgetreten ({msg}). Versuchen Sie es erneut oder nutzen Sie die Bildschirme der App.' },
    recusa: {
      tituloAutolesao: 'Sie sind nicht allein', titulo: 'Dabei kann ich nicht helfen',
      padrao: 'Dabei kann ich Ihnen nicht helfen. SaibaTudo Química gibt keine Anleitungen zur Synthese, Reinigung, Hochskalierung oder zu Rezepten für den Hausgebrauch von Sprengstoffen, chemischen Waffen, illegalen Drogen, deren Vorläuferstoffen oder anderen gefährlichen Reagenzien, weil sie Todesfälle und schwere Verletzungen verursachen können.',
      alternativas: 'Ich kann bei Sicherheit und Wissen helfen: Gefahren, persönliche Schutzausrüstung (PSA), Lagerung, Entsorgung und Erste Hilfe zu einem Stoff; Eigenschaften, Formel, molare Masse und Struktur; chemische Berechnungen und Grundbegriffe.',
      DANO_A_PESSOAS: 'Dabei kann ich Ihnen nicht helfen. Ich gebe keine Anleitung, wie man Menschen oder Tiere verletzt, vergiftet oder berauscht. Wenn jemand in Gefahr ist oder mit einem Stoff in Kontakt gekommen ist, wenden Sie sich sofort an den Notruf oder die Giftinformationszentrale Ihrer Region.',
      AUTOLESAO: 'Es tut mir leid, dass es Ihnen so geht. Zu diesem Thema kann ich keine Anleitung geben, aber Sie sind nicht allein: Wenden Sie sich jetzt an eine Person, der Sie vertrauen, und an den Notruf in Ihrer Region. In Brasilien spricht das Centro de Valorização da Vida (CVV) kostenlos und vertraulich mit allen Menschen unter https://cvv.org.br; anderswo suchen Sie bitte die Krisenhotline vor Ort.',
      categorias: {
        EXPLOSIVOS: 'Sprengstoffe', ARMAS_QUIMICAS: 'chemische Waffen', DROGAS: 'illegale Drogen', PRECURSORES: 'Vorläuferstoffe für Drogen oder Waffen',
        REAGENTES_CASEIROS: 'Rezepte für den Hausgebrauch mit gefährlichen Reagenzien', DANO_A_PESSOAS: 'Schaden für Menschen', AUTOLESAO: 'Gefahr für das eigene Leben'
      }
    },
    ajuda: {
      titulo: 'Was SaibaTudo Química kann',
      texto: 'Ich beantworte Chemiefragen mit offenen Daten und Berechnungen auf Ihrem Gerät: Nichts verlässt Ihr Smartphone oder Ihren Computer.',
      podePerguntar: 'Sie können fragen zu',
      itens: [
        'Elementen und dem Periodensystem (Eigenschaften, Gruppen, Perioden)', 'Verbindungen (Formel, molare Masse, 2D-Struktur und GHS-Gefahren)',
        'Berechnungen mit Rechenweg: molare Masse, Gleichungen ausgleichen, Stöchiometrie, Konzentration und Verdünnung, pH, ideales Gas und Einheiten',
        'Sicherheit: Piktogramme, H-Sätze und wie Sie gefährliche Mischungen vermeiden', 'Grundbegriffen, mit zitierten Auszügen aus offenen Quellen'
      ],
      aviso: 'Ich helfe nicht bei Synthese, Reinigung oder Rezepten für Sprengstoffe, chemische Waffen, illegale Drogen und andere gefährliche Reagenzien.',
      tabela: 'Periodensystem', calculadoras: 'Rechner'
    },
    sobreDados: {
      titulo: 'Über die Daten in dieser App', versao: 'Version des Datenpakets', geradoEm: 'Erstellt am', assinatura: 'Digitale Signatur (ECDSA P-256)',
      sig: { verificada: 'bestätigt', invalida: 'NICHT bestätigt', indisponivel: 'konnte in diesem Browser nicht geprüft werden' },
      elementos: 'Elemente im Paket', compostos: 'Verbindungen im Index', fontesListadas: 'Aufgeführte Quellen',
      texto: 'Die vollständige Liste der Quellen, Lizenzen und Datumsangaben finden Sie unter „Über die Daten“. Jeder angezeigte Wert stammt aus dem signierten Paket oder aus einer lokalen Berechnung.',
      acao: 'Alle Quellen und Lizenzen ansehen'
    },
    fontesResp: { titulo: 'Datenquellen', usa: 'Das Datenpaket verwendet', semLista: 'Die Liste der Quellen finden Sie unter „Über die Daten“.', acao: 'Über die Daten' },
    naoEntendi: {
      titulo: 'Ich habe die Frage nicht verstanden', comPergunta: 'Ich habe „{q}“ nicht verstanden. Nennen Sie ein Element, eine Verbindung, eine Formel oder eine Berechnung, zum Beispiel:', semPergunta: 'Geben Sie Ihre Frage ein, zum Beispiel:',
      tabela: 'Periodensystem', compostos: 'Verbindungen suchen', calculadoras: 'Rechner'
    },
    elemento: {
      nomeEmIngles: 'Name auf Englisch', titulo: '{nome} ({simbolo}), Element {z}', ficha: 'Vollständiger Steckbrief von {nome}', verTabela: 'Im Periodensystem ansehen'
    },
    composto: {
      nomePopular: 'Trivialname', nomeIupac: 'IUPAC-Name', formula: 'Formel', massaMolar: 'Molare Masse', cas: 'CAS-Nummer', cid: 'PubChem-CID', classes: 'Klassen',
      perigosGhs: 'Gefahren (GHS)', definicaoIngles: 'Definition auf Englisch.', ficha: 'Vollständiger Steckbrief', icsc: 'ICSC-Karte auf der Website der ILO', icscDe: 'ICSC-Karte von {nome} auf der Website der ILO'
    },
    propriedade: {
      deQual: 'Von welchem Stoff?',
      digaQualElemento: 'Sagen Sie mir, zu welchem Element oder welcher Verbindung Sie {props} wissen möchten. Zum Beispiel: „Schmelzpunkt von Eisen“.',
      digaQualPropriedade: 'Sagen Sie mir, welche Eigenschaft und welches Element oder welche Verbindung gemeint ist. Zum Beispiel: „Dichte von Gold“.',
      de: '{prop} von {nome}',
      outroTipo: (p) => `${p.prop} (diese Eigenschaft gilt für ${p.alvo === 'composto' ? 'Verbindungen' : 'Elemente'}; ${p.outros} ${p.n > 1 ? 'sind' : 'ist'} von anderer Art)`,
      naoTem: 'Das Datenpaket enthält nicht: {lista}.', fichaDe: 'Steckbrief von {nome}', propriedadesDe: 'Eigenschaften von {nomes}'
    },
    massaMolar: {
      tituloElemento: 'Molare Masse: {nome} ({simbolo})', deAtomos: 'Molare Masse von {nome} (Atome)',
      avisoMolecular: 'Bei einem molekularen Element wie O₂ oder N₂ geben Sie die Formel ein: Die molare Masse ist die Masse des Atoms mal der Anzahl der Atome im Molekül.',
      abrirCalculadora: 'Im Rechner öffnen', deQue: 'Molare Masse wovon?',
      digite: 'Geben Sie die Formel oder den Namen des Stoffes ein. Zum Beispiel: „molare Masse von Wasser“ oder „molare Masse von Ca(OH)2“.', calculadora: 'Rechner für die molare Masse',
      naoConsegui: 'Ich konnte die molare Masse nicht berechnen', composicao: 'Massenzusammensetzung', referencia: 'Referenzwert', pubchemInforma: 'PubChem gibt an',
      titulo: (p) => `Molare Masse${p.nome ? `: ${p.nome}` : ''} (${p.formula})`
    },
    balancear: {
      titulo: 'Gleichung ausgleichen',
      digite: 'Geben Sie die Gleichung mit den Edukten, einem Pfeil und den Produkten ein. Zum Beispiel: Fe + O2 -> Fe2O3. Ionen funktionieren ebenfalls: Zn + Cu2+ -> Zn2+ + Cu.',
      abrir: 'Rechner öffnen', naoConsegui: 'Ich konnte sie nicht ausgleichen', ajustar: 'Im Rechner anpassen', balanceada: 'Ausgeglichene Gleichung',
      coeficientesIgnorados: 'Die eingegebenen Koeffizienten wurden ignoriert: Die App gleicht die gesamte Gleichung aus.', abrirNa: 'Im Rechner öffnen'
    },
    estequiometria: {
      abrir: 'Stöchiometrie-Rechner öffnen', faltam: 'Die Mengen fehlen',
      digaCadaReagente: 'Geben Sie die Menge jedes Edukts mit Name oder Formel an, zum Beispiel „4 g H2 und 16 g O2“.',
      informePeloMenos: 'Geben Sie die Menge mindestens eines Edukts an, zum Beispiel „4 g H2 und 16 g O2“.', naoConsegui: 'Ich konnte nicht rechnen',
      titulo: 'Stöchiometrie: {equacao}', particulas: 'Teilchen', tituloQuantidade: '{valor} {unidade} {formula}', abrirNa: 'Im Rechner öffnen',
      volumeTitulo: 'Volumen von {valor} {unidade} eines idealen Gases bei Normbedingungen', volumeCntp: 'Volumen bei Normbedingungen (0 °C und 1 atm)', volumeMolar: 'Molares Volumen (RT/P)',
      passoVolume: 'Nach der Zustandsgleichung des idealen Gases ist das molare Volumen Vm = RT/P, mit T = 0 °C und P = 1 atm; multiplizieren Sie mit der Stoffmenge.',
      abrirGas: 'Rechner für ideales Gas öffnen', tituloGeral: 'Stöchiometrie',
      explicacao: 'Um Masse, Stoffmenge, Teilchen und Volumen umzurechnen, geben Sie Menge und Stoff an, zum Beispiel „Wie viele Mol sind in 18 g Wasser enthalten?“. Für das limitierende Reagenz schreiben Sie die Gleichung und die Mengen auf.'
    },
    concentracao: {
      abrir: 'Rechner öffnen', titulo: 'Konzentration und Verdünnung',
      diga: 'Geben Sie die Werte mit Einheiten an. Beispiele: „Molarität von 5,85 g NaCl in 500 mL“, „Wie viele Gramm NaOH für 250 mL einer Lösung mit 0,1 mol/L“ oder „100 mL einer Lösung mit 2 mol/L auf 0,5 mol/L verdünnen“.',
      naoConsegui: 'Ich konnte nicht rechnen', padrao: 'Konzentration',
      modos: { molaridade: 'Molarität der Lösung', massa: 'Benötigte Masse an gelöstem Stoff', 'gl-mol': 'Umrechnung g/L ↔ mol/L', 'percentual-mm': 'Massenprozent', 'percentual-mv': 'Masse-Volumen-Prozent', diluicao: 'Verdünnung' }
    },
    ph: {
      abrir: 'pH-Rechner öffnen', conversoes: 'Umrechnungen ausgehend von {de} = {valor}', titulo: 'pH einer Lösung',
      informe: 'Geben Sie die Konzentration in mol/L und den Stoff an. Beispiele: „pH von HCl 0,01 mol/L“ oder „pH von Essigsäure 0,1 mol/L mit Ka 1,8e-5“.',
      maisDados: 'Für den pH fehlen mir Angaben', naoTenho: 'Ich habe „{formula}“ nicht in der Liste der starken Säuren und Basen des Pakets. ',
      fracos: 'Bei schwachen Säuren und Basen geben Sie Ka (oder pKa) bzw. Kb (oder pKb) an; bei starken schreiben Sie die Formel, zum Beispiel HCl oder NaOH.',
      parcial: 'Nur die 1. Ionisierung ist stark; die 2. ist partiell und wurde ignoriert (Näherung).', naoConsegui: 'Ich konnte den pH nicht berechnen',
      tituloResultado: (p) => `pH ${p.ph}${p.formula ? ` (${p.formula} ${p.conc} mol/L)` : ''}`
    },
    gas: {
      abrir: 'Rechner für ideales Gas öffnen', tituloEquacao: 'Ideales Gas: PV = nRT', naEquacao: 'In der Gleichung',
      variaveis: 'P ist der Druck, V das Volumen, n die Stoffmenge (in Mol) und T die absolute Temperatur (in Kelvin).',
      constante: 'R ist die universelle Gaskonstante: {valor} J/(mol·K), Wert aus dem Datenpaket ({fonte}).', constanteSem: 'R ist die universelle Gaskonstante.',
      informeTres: 'Geben Sie drei der vier Größen mit Einheiten an, und ich berechne die vierte samt Rechenweg.', tituloFalta: 'Ideales Gas (PV = nRT)',
      informeTresEx: 'Geben Sie drei der vier Größen (Druck, Volumen, Stoffmenge und Temperatur) mit Einheiten an. Beispiel: „Welches Volumen haben 2 mol Gas bei 300 K und 1 atm?“.',
      naoConsegui: 'Ich konnte nicht rechnen'
    },
    conversao: {
      abrir: 'Einheitenumrechner öffnen', titulo: 'Einheitenumrechnung', diga: 'Geben Sie den Wert, die Einheit und die Zieleinheit an. Beispiel: „5 atm in kPa umrechnen“.',
      naoConsegui: 'Ich konnte nicht umrechnen', em: '{valor} {de} in {para}'
    },
    nomenclatura: {
      titulo: 'Nomenklatur', naoEncontreiFormula: 'Ich habe „{formula}“ unter den Verbindungen im Paket nicht gefunden.', naoEncontrei: 'Ich habe diese Verbindung nicht gefunden.', tente: ' Versuchen Sie es mit dem Trivialnamen oder der Formel.',
      buscar: 'Verbindungen suchen', nome: 'Name', nomePopular: 'Trivialname', nomeIupac: 'IUPAC-Name', formula: 'Formel', formulaHill: 'Formel in Hill-Notation',
      observacao: 'Hinweis', ptPendente: 'Der portugiesische Name steht noch aus; angezeigt wird der IUPAC-Name.', ficha: 'Vollständiger Steckbrief'
    },
    desenhar: {
      estruturaDe: 'Struktur von {nome}', semSmiles: 'Das Datenpaket enthält keinen SMILES-Code für diese Verbindung, daher kann ich die Struktur nicht zeichnen.', ficha: 'Vollständiger Steckbrief',
      estrutura2d: '2D-Struktur von {nome}', smiles: 'SMILES', formula: 'Formel'
    },
    comparar: {
      titulo: 'Vergleich: {nomes}', propriedade: 'Eigenschaft', fichaDe: 'Steckbrief von {nome}',
      linhas: { formula: 'Formel', massaMolar: 'Molare Masse', cas: 'CAS-Nummer', nomeIupac: 'IUPAC-Name', xlogp: 'XLogP', sinal: 'Signalwort (GHS)', pictogramas: 'Piktogramme (GHS)' },
      tituloGeral: 'Vergleichen', explicacao: 'Vergleichen Sie Gleichartiges: zwei Elemente („Natrium und Chlor vergleichen“) oder zwei Verbindungen („Unterschied zwischen Ethanol und Essigsäure“).'
    },
    tabela: {
      abrir: 'Periodensystem öffnen', naoTemProp: 'Das Paket enthält für die geladenen Elemente keine Daten (Eigenschaft: {prop}).',
      extremo: (p) => `${p.prop}, ${p.dir === 'max' ? 'höchster' : 'niedrigster'} Wert im Paket: ${p.nome} (${p.simbolo})`,
      entreOs: 'Unter den {n} Elementen mit dieser Angabe im Paket', elemento: 'Element', simbolo: 'Symbol', nome: 'Name', numero: 'Nr.',
      grupo: 'Gruppe {g}', periodo: 'Periode {p}', bloco: 'Block {b}', estado: 'Zustand: {estado}', elementos: 'Elemente: {criterios}', titulo: 'Periodensystem',
      pacoteTem: (p) => `Das Paket enthält ${p.n} ${p.n === 1 ? 'Element' : 'Elemente'}, geordnet nach Gruppe, Periode und Block, mit Farben nach Kategorie. Tippen Sie auf ein Element, um den vollständigen Steckbrief zu sehen.`,
      nenhum: 'Kein Element im Paket erfüllt diese Kriterien.', destacar: 'Im Periodensystem hervorheben', comContagem: '{titulo} ({n})',
      tendencia: 'Trend: {prop}', tendenciaTexto: 'Werte aus dem Datenpaket entlang einer Periode und einer Gruppe; vergleichen Sie die Zeilen, um den Trend zu sehen.',
      periodoLegenda: 'Periode {p}, von links nach rechts (steigende Ordnungszahl)', grupoLegenda: 'Gruppe {g}, von oben nach unten (steigende Periode)',
      colGrupo: 'Gruppe', colPeriodo: 'Periode', naoTemSuficiente: 'Das Paket enthält für zu wenige Elemente derselben Periode oder Gruppe Daten (Eigenschaft: {prop}).'
    },
    seguranca: {
      naoMisture: 'Mischen Sie {a} nicht mit {b}. {motivo}',
      naoMistureGeral: 'Mischen Sie {a} nicht mit {b}: Das Mischen von Chemikalien kann Wärme oder giftige Gase freisetzen oder andere gefährliche Reaktionen auslösen. Sehen Sie sich unten die Gefahren der einzelnen Stoffe an und mischen Sie niemals Reinigungsmittel.',
      semGhs: 'Das Paket enthält keine (harmonisierte) GHS-Gefahreneinstufung für {nome}. Das heißt nicht, dass der Stoff harmlos ist: Prüfen Sie das Sicherheitsdatenblatt des Produkts.',
      perigosDe: 'Gefahren von {nome} (GHS)',
      elementoSemGhs: 'Das Paket enthält GHS-Gefahreneinstufungen nur für Verbindungen, nicht für das Element {nome}. Die Gefahren hängen von der chemischen Form ab (zum Beispiel Metalldampf oder ein Salz): Prüfen Sie das Sicherheitsdatenblatt des Produkts.',
      orientacao: 'Allgemeine Sicherheitshinweise', naoIdentifiquei: 'Ich habe den Stoff nicht erkannt. Nennen Sie seinen Namen oder seine Formel, um die GHS-Gefahren zu sehen, oder befolgen Sie die allgemeinen Hinweise unten.',
      comoLer: 'So lesen Sie Piktogramme und H-Sätze', titulo: 'Sicherheit: {alvo}', tituloGeral: 'Chemische Sicherheit', eConector: ' und '
    },
    conceito: {
      semTexto: 'Dazu habe ich noch keinen Text',
      naoEncontrei: 'Unter den lizenzierten Auszügen im Datenpaket habe ich keine Erklärung zu „{termo}“ gefunden. Daten zu Elementen und Verbindungen sowie die Rechner stehen weiterhin zur Verfügung.',
      traducaoAutomatica: 'Automatische Übersetzung, noch nicht von einer Person geprüft.', emIngles: 'Text auf Englisch (noch nicht übersetzt).', padrao: 'Begriff'
    },
    calc: {
      formula: {
        vazia: 'Leere Formel', quantidadeInvalida: 'Ungültige Anzahl „{x}“', quantidadeGrande: 'Anzahl zu groß', fechaSemAbre: 'Klammer „)“ ohne passende „(“',
        abreSemFecha: 'Klammer „(“ ohne passende „)“', vazios: 'Leere Klammern', naoSimbolo: '„{x}“ ist kein Elementsymbol',
        minuscula: 'Kleinbuchstabe „{c}“ an falscher Stelle (Symbole beginnen mit einem Großbuchstaben, wie in „Na“ und „Cl“)', inesperado: 'Unerwartetes Zeichen „{c}“', parteVazia: 'Leerer Teil (prüfen Sie das „·“ des Hydrats)'
      },
      balancear: {
        digite: 'Geben Sie die Gleichung ein, zum Beispiel: Fe + O2 -> Fe2O3', semSeta: 'Ich habe den Reaktionspfeil nicht gefunden. Schreiben Sie Edukte -> Produkte, zum Beispiel: H2 + O2 -> H2O',
        duasSetas: 'Die Gleichung enthält mehr als einen Pfeil. Geben Sie jeweils nur eine Reaktion ein.', faltam: 'Die {lado} der Gleichung fehlen', reagentes: 'Edukte', produtos: 'Produkte',
        substancia: 'Stoff „{corpo}“: {msg}', grande: 'Gleichung zu groß (höchstens 40 Stoffe).',
        soDeUmLado: (p) => `Das Element ${p.el} kommt nur ${p.lado === 'r' ? 'auf der Eduktseite' : 'auf der Produktseite'} vor: Prüfen Sie die Formeln oder ergänzen Sie den fehlenden Stoff.`,
        semCombinacao: 'Es gibt keine Kombination von Koeffizienten, die diese Gleichung ausgleicht. Prüfen Sie die Formeln und die Ladungen.',
        varias: 'Die Gleichung kombiniert mehr als eine unabhängige Reaktion, daher gibt es mehrere Möglichkeiten, sie auszugleichen. Geben Sie jeweils nur eine Reaktion ein.',
        coefZero: 'Ein Stoff bekäme den Koeffizienten null: Er nimmt an der Reaktion, so wie sie geschrieben ist, nicht teil. Prüfen Sie die Gleichung.',
        negativos: 'Die Koeffizienten können nicht alle positiv sein: Die Gleichung stellt so, wie sie geschrieben ist, keine mögliche Reaktion dar.', coefGrandes: 'Koeffizienten zu groß für diese Gleichung.',
        passo1: 'Geben Sie jedem Stoff einen unbekannten Koeffizienten (Buchstaben) und schreiben Sie die Gleichung damit auf.',
        passo2: (p) => `Für jedes ${p.carga ? 'Element (und für die elektrische Ladung)' : 'Element'} muss die Anzahl der Atome auf beiden Seiten gleich sein:`, carga: 'Ladung',
        passo3: 'Lösen Sie das Gleichungssystem (Gauß-Verfahren mit exakten Brüchen) und setzen Sie eine der Unbekannten gleich 1:',
        passo4: (p) => `${p.mmc ? `Multiplizieren Sie alles mit ${p.den} (dem kleinsten gemeinsamen Vielfachen der Nenner)` : 'Dividieren Sie durch den größten gemeinsamen Teiler'}, um die kleinsten ganzen Zahlen zu erhalten:`,
        passo4Ja: 'Die Werte sind bereits die kleinsten ganzen Zahlen:', balanceada: 'Ausgeglichene Gleichung:', conferencia: 'Kontrolle (Edukte = Produkte): '
      },
      massa: {
        semMassa: 'Das Datenpaket enthält keine Atommasse für: {lista}.',
        passo1: (p) => `Zählen Sie die Atome jedes Elements in der Formel${p.hidrato ? ' (einschließlich Kristallwasser)' : ''}:`,
        passo2: 'Multiplizieren Sie die Anzahl der Atome mit der Atommasse jedes Elements (Werte aus dem Datenpaket, in g/mol):', passo3: 'Addieren Sie die Beiträge:',
        hidrato: 'Jeder Teil des Hydrats trägt wie folgt bei (g/mol):', eletrons: 'Die Masse der aufgenommenen oder abgegebenen Elektronen wird vernachlässigt (sie ist weit kleiner als die Unsicherheit der Atommassen).',
        massaMolarDe: 'Molare Masse von {formula}', percentual: '{nome} ({simbolo}), Massenanteil in %'
      },
      concentracao: {
        modos: {
          molaridade: 'Molarität (mol/L) aus Masse des gelösten Stoffes und Volumen', massa: 'Benötigte Masse an gelöstem Stoff für eine Lösung', 'gl-mol': 'Umrechnung g/L ↔ mol/L',
          'percentual-mm': 'Massenprozent (m/m)', 'percentual-mv': 'Masse-Volumen-Prozent (g pro 100 mL)', diluicao: 'Verdünnung (C₁V₁ = C₂V₂)'
        },
        informe: 'Geben Sie {x} an.', unidadeMassa: 'Unbekannte Masseneinheit: „{u}“.', unidadeVolume: 'Unbekannte Volumeneinheit: „{u}“.',
        maiorQueZero: '{x} muss größer als null sein.', massaSoluto: 'die Masse des gelösten Stoffes', volumeSolucao: 'das Volumen der Lösung', aMassa: 'Die Masse', oVolume: 'Das Volumen',
        aMassaSoluto: 'Die Masse des gelösten Stoffes', aMassaSolucao: 'Die Masse der Lösung', massaSolucao: 'die Masse der Lösung', aConcentracao: 'Die Konzentration',
        concQuantidade: 'Stoffmengenkonzentration', quantidadeSoluto: 'Stoffmenge des gelösten Stoffes', concMassa: 'Massenkonzentration',
        passoMassaMolar: 'Molare Masse des gelösten Stoffes ({formula}):', passoN: 'Stoffmenge des gelösten Stoffes (n = m ÷ M):', passoC: 'Molarität (C = n ÷ V, mit V in Litern):',
        informeDesejada: 'Geben Sie die gewünschte Konzentration an.', unidadeConc: 'Unbekannte Konzentrationseinheit: „{u}“. Verwenden Sie mol/L, mmol/L oder g/L.',
        passoConcMolL: 'Konzentration in mol/L:', passoNNecessaria: 'Benötigte Stoffmenge (n = C × V):', passoMassaSoluto: 'Masse des gelösten Stoffes (m = n × M):',
        massaDe: 'Masse von {formula}', quantidade: 'Stoffmenge',
        notaDissolva: 'Lösen Sie den Stoff in genügend Lösungsmittel und füllen Sie auf das Endvolumen der Lösung auf (das Volumen ist das der Lösung, nicht das des Lösungsmittels).',
        informeConc: 'Geben Sie die Konzentration an.', passoMassaMolarCurto: 'Molare Masse ({formula}):', divida: 'Teilen Sie die Massenkonzentration durch die molare Masse:', multiplique: 'Multiplizieren Sie die Molarität mit der molaren Masse:',
        solutoMaior: 'Die Masse des gelösten Stoffes darf nicht größer sein als die der Lösung.', percentualMM: 'Massenprozent (m/m)', titulo: 'Massenanteil',
        passoPercentual: 'Teilen Sie die Masse des gelösten Stoffes durch die Masse der Lösung und multiplizieren Sie mit 100:', percentualMV: 'Masse-Volumen-Prozent', passoMV: 'Masse des gelösten Stoffes (g) pro 100 mL Lösung:',
        umEmBranco: 'Lassen Sie genau eines der vier Felder leer: Dieses wird berechnet.', maioresQueZero: 'Die angegebenen Werte müssen größer als null sein.',
        isoleC1: 'Stellen Sie nach der Anfangskonzentration um:', isoleV1: 'Stellen Sie nach dem abzumessenden Volumen der konzentrierten Lösung um:', isoleC2: 'Stellen Sie nach der Endkonzentration um:', isoleV2: 'Stellen Sie nach dem Endvolumen um:',
        rotulos: { C1: 'Anfangskonzentration (C₁)', V1: 'Anfangsvolumen (V₁)', C2: 'Endkonzentration (C₂)', V2: 'Endvolumen (V₂)' },
        notaDiluicao: 'Bei einer Verdünnung ändert sich die Stoffmenge des gelösten Stoffes nicht: C₁V₁ = C₂V₂. Verwenden Sie auf beiden Seiten dieselbe Konzentrations- und dieselbe Volumeneinheit.',
        solventeAcrescentar: 'Zuzugebendes Volumen an Lösungsmittel (V₂ − V₁)', atencaoConcentracao: 'Hinweis: Das Endvolumen ist kleiner als das Anfangsvolumen; das ist eine Aufkonzentrierung, keine Verdünnung.',
        conserva: 'Bei einer Verdünnung bleibt die Stoffmenge des gelösten Stoffes erhalten:', escolha: 'Wählen Sie die Art der Berechnung.', solucaoTex: 'Lösung'
      },
      estequiometria: {
        semMassa: 'Das Datenpaket enthält keine Atommasse für: {lista}.',
        massaParaMol: (p) => `Masse → Stoffmenge${p.rotulo ? ` von ${p.rotulo}` : ''}: Teilen Sie die Masse (in g) durch die molare Masse (${p.M} g/mol).`,
        semVolumeMolar: 'Im Datenpaket fehlen R oder die Normbedingungen, um das molare Volumen bei Normbedingungen zu berechnen.',
        volumeParaMol: 'Volumen (ideales Gas, Normbedingungen: 0 °C und 1 atm) → Stoffmenge: Teilen Sie durch das molare Volumen Vm = RT/P = {vm} L/mol.',
        semAvogadro: 'Die Avogadro-Konstante ist nicht im Datenpaket (constantes.json) enthalten.', particulasParaMol: 'Teilchen → Stoffmenge: Teilen Sie durch die Avogadro-Zahl.',
        unidadeNaoReconhecida: 'Einheit nicht erkannt: „{u}“. Verwenden Sie g, mg, kg, mol, mmol, L, mL oder Teilchen.',
        quantidadeInvalida: 'Geben Sie eine gültige Menge an (eine Zahl größer oder gleich null).', massaMolarDe: 'Molare Masse von {formula} (Summe der Atommassen aus dem Datenpaket):',
        molParaMassa: 'Stoffmenge → Masse: Multiplizieren Sie mit der molaren Masse.', molParaParticulas: 'Stoffmenge → Teilchen: Multiplizieren Sie mit der Avogadro-Zahl.',
        molParaVolume: 'Stoffmenge → Volumen bei Normbedingungen (0 °C und 1 atm, ideales Gas): Multiplizieren Sie mit dem molaren Volumen {vm} L/mol.',
        quantidade: 'Stoffmenge', massa: 'Masse', particulas: 'Anzahl der Teilchen', volumeCntp: 'Volumen bei Normbedingungen (falls es ein ideales Gas ist)',
        notaVolume: 'Das Volumen gilt nur für ideale Gase bei den angenommenen Normbedingungen (0 °C und 1 atm); Feststoffe und Flüssigkeiten folgen dieser Umrechnung nicht.',
        semirreacoes: 'Reaktionen mit Elektronen (Halbreaktionen) haben keine Masse: Verwenden Sie vollständige Gleichungen.', informePeloMenos: 'Geben Sie die Menge mindestens eines Stoffes an.',
        rendimento: 'Die Ausbeute muss zwischen 0 und 100 % liegen.', passoEquacao: 'Ausgeglichene Gleichung (die Koeffizienten geben das Stoffmengenverhältnis an):',
        naoAparece: 'Der Stoff „{x}“ kommt in der Gleichung nicht vor.', quantidadesValidas: 'Geben Sie gültige Mengen an (Zahlen größer oder gleich null).',
        umaVez: 'Jeder Stoff darf nur einmal angegeben werden.',
        soReagentes: 'Bei mehr als einer Menge geben Sie nur Edukte an (das limitierende Reagenz wird unter ihnen bestimmt). Um von einem Produkt auszugehen, geben Sie nur dieses an.',
        passoRazoes: 'Teilen Sie die Stoffmenge jedes Edukts durch seinen Koeffizienten: Der kleinste Quotient zeigt das limitierende Reagenz an.',
        limitante: 'Limitierendes Reagenz: {formula}.', umaQuantidade: 'Es wurde nur eine Menge angegeben ({formula}): Der Reaktionsumsatz ist n ÷ Koeffizient.',
        passoCoeficientes: (p) => `Verwenden Sie die Koeffizienten als Stoffmengenverhältnis: n = Koeffizient × ξ${p.rend != null ? ` × Ausbeute (${p.rend} %)` : ''}.`,
        passoMassa: 'Rechnen Sie in Masse um (m = n × M):', sobra: 'Was von den überschüssigen Edukten übrig bleibt (Anfangsmenge − verbrauchte Menge):',
        reagenteLimitante: 'Limitierendes Reagenz', formado: '{formula} gebildet', emExcesso: '{formula} im Überschuss (verbleibend)', necessario: '{formula} benötigt',
        coeficientesIgnorados: 'Die eingegebenen Koeffizienten wurden ignoriert: Die App gleicht die Gleichung aus.',
        notaTabela: 'Volumen und Teilchen der Produkte stehen in der Tabelle; das Volumen gilt nur für ideale Gase bei Normbedingungen (0 °C und 1 atm).'
      },
      gas: {
        semR: 'Die Gaskonstante (R) ist nicht im Datenpaket (constantes.json) enthalten.', escolha: 'Wählen Sie die zu berechnende Größe: P, V, n oder T.',
        rotulos: { P: 'Druck', V: 'Volumen', n: 'Stoffmenge', T: 'Temperatur' }, informe: 'Geben Sie einen Wert für {x} an.', unidadeDesconhecida: 'Unbekannte Einheit für {x}: „{u}“.',
        unidadeQuantidade: 'Unbekannte Einheit der Stoffmenge: „{u}“.', semMassaAtomica: 'Keine Atommasse im Paket für: {lista}.',
        passoMassa: 'Berechnen Sie die Stoffmenge aus der Masse ({formula}, M = {M} g/mol):', informeN: 'Geben Sie die Stoffmenge (mol) oder die Masse und die Formel des Gases an.',
        temperaturaPositiva: 'Die absolute Temperatur muss größer als 0 K sein.', maiorQueZero: '{x} muss größer als null sein.',
        passoEquacao: 'Zustandsgleichung des idealen Gases mit R = {R} J/(mol·K) ({nome}). Verwenden Sie immer SI-Einheiten: Pa, m³, mol, K.', passoSI: 'Rechnen Sie in SI-Einheiten um:',
        isoleP: 'Stellen Sie nach dem Druck um:', isoleV: 'Stellen Sie nach dem Volumen um:', isoleN: 'Stellen Sie nach der Stoffmenge um:', isoleT: 'Stellen Sie nach der Temperatur um:', naoCalculou: 'Mit diesen Werten war keine Berechnung möglich.',
        unidadeSaida: 'Unbekannte Ausgabeeinheit: „{u}“.', converta: 'Rechnen Sie das Ergebnis in {u} um:', notaModelo: 'Modell des idealen Gases: funktioniert am besten bei niedrigen Drücken und hohen Temperaturen.',
        boyleUmEmBranco: 'Lassen Sie genau einen der vier Werte leer: Dieser wird berechnet.', boyleUnidade: 'Unbekannte Einheit: „{u}“.',
        boylePositivos: 'Drücke und Volumina müssen größer als null sein.', boyleLei: 'Gesetz von Boyle-Mariotte: Bei konstanter Temperatur und gleicher Gasmenge bleibt das Produkt aus Druck × Volumen unverändert.',
        boyleIsole: (p) => `Stellen Sie nach dem ${p.n === '1' ? 'Anfangs' : 'End'}${p.nome} um (alle Werte in derselben Einheit der jeweiligen Größe):`,
        boyleNomes: { P: 'druck', V: 'volumen' }, boyleRotulo: (p) => `${p.n === '1' ? 'Anfangs' : 'End'}${p.nome} (${p.alvo})`,
        boyleNota: 'Gilt für ein ideales Gas mit derselben Stoffmenge und derselben Temperatur in beiden Zuständen.'
      },
      ph: {
        tipos: { 'acido-forte': 'Starke Säure', 'base-forte': 'Starke Base', 'acido-fraco': 'Schwache Säure (Ka angegeben)', 'base-fraca': 'Schwache Base (Kb angegeben)', converter: 'pH, pOH, [H⁺], [OH⁻] umrechnen' },
        classes: { neutra: 'neutral', acida: 'sauer', basica: 'basisch' }, solucao: 'Lösung', pKw: 'Ionenprodukt des Wassers: pKw = {valor} ({origem}).',
        umValor: 'Geben Sie genau einen Wert an: pH, pOH, [H⁺] oder [OH⁻].', concPositiva: 'Die Konzentration muss größer als null sein.', phInformado: 'Der pH wurde angegeben.',
        phDePoh: 'pH = pKw − pOH:', phDeH: 'pH = −log₁₀[H⁺]:', pohDeOh: 'pOH = −log₁₀[OH⁻] und pH = pKw − pOH:', relacoes: 'Verwendete Beziehungen:',
        informeConc: 'Geben Sie die Konzentration (größer als null) in mol/L an.',
        forte: (p) => `Starke ${p.acido ? 'Säure' : 'Base'}: vollständige Ionisierung (Dissoziation). Jede Formeleinheit setzt ${p.n} ${p.acido ? 'H⁺' : 'OH⁻'} frei.`,
        diluida: 'Weil die Lösung sehr verdünnt ist, darf die Autoprotolyse des Wassers nicht vernachlässigt werden; lösen Sie [Ion]² − c[Ion] − Kw = 0:', notaDiluida: 'Sehr verdünnte Lösung: Die Berechnung berücksichtigt das Wasser.',
        notaEscolar: 'Schulmodell: Es wird vollständige Ionisierung der n ionisierbaren Wasserstoffatome angenommen (in der Praxis ist die zweite Ionisierung mehrerer Säuren nur partiell).',
        informeK: (p) => `Geben Sie ${p.acido ? 'Ka (oder pKa)' : 'Kb (oder pKb)'} der schwachen ${p.acido ? 'Säure' : 'Base'} an.`,
        fraco: (p) => `Schwache einprotonige ${p.acido ? 'Säure' : 'Base'}: Gleichgewicht ${p.acido ? 'HA ⇌ H⁺ + A⁻' : 'B + H₂O ⇌ BH⁺ + OH⁻'}. Mit x = [${p.acido ? 'H⁺' : 'OH⁻'}] im Gleichgewicht:`,
        segundoGrau: 'Lösen Sie die quadratische Gleichung x² + K·x − K·C = 0 (ohne Näherungen):', portanto: 'Also gilt [{ion}] = x.',
        grau: (p) => `${p.acido ? 'Protolysegrad' : 'Protolysegrad der Base'} (α = x ÷ C):`, notaPequeno: '[Ion] ist sehr klein ausgefallen: Die Autoprotolyse des Wassers kann eine Rolle spielen, und dieses Modell vernachlässigt sie.',
        grauIonizacao: 'Protolysegrad', escolha: 'Wählen Sie die Art der Lösung.'
      },
      unidades: {
        informeNumero: 'Geben Sie eine Zahl zum Umrechnen an.', naoConheco: 'Ich kenne die Einheit „{u}“ nicht.',
        grandezasDiferentes: '„{de}“ ({gde}) und „{para}“ ({gpara}) sind verschiedene Größen: Die eine lässt sich nicht in die andere umrechnen.',
        passoBase: 'Rechnen Sie in die Basiseinheit der Größe um ({base}): Wert × Faktor + Offset.', passoDaBase: 'Rechnen Sie von der Basiseinheit in {para} um: (Wert − Offset) ÷ Faktor.',
        passoEquivale: '1 {a} entspricht {fa} {base} und 1 {b} entspricht {fb} {base}.', passoFator: 'Multiplizieren Sie mit dem Umrechnungsfaktor (Verhältnis der Einheiten):',
        desconhecida: 'Unbekannte Einheit: {u}'
      }
    }
  }
};
