// Lektionen auf Deutsch (Übersetzung des pt-BR, der Referenz). Eigener Inhalt von SaibaTudo (MIT). Prüfung durch Muttersprachler steht aus.
export default {
  revisao: 'pendente',
  secoes: [
    {
      id: 'modelo',
      titulo: 'Was ein Sprachmodell tut',
      resumo: 'Ein Sprachmodell nimmt einen Text und gibt für jede mögliche Fortsetzung eine Wahrscheinlichkeit zurück. Alles andere entsteht daraus.',
      paragrafos: [
        'Ein **Sprachmodell** ist ein Programm, das für eine einzige Aufgabe trainiert wurde: Gegeben ein Stück Text, schätze, welches Stück als Nächstes kommt. Es gibt kein Wort zurück, sondern eine Liste von Kandidaten, jeder mit einer Wahrscheinlichkeit. Auf „Die Katze kletterte auf das“ folgt „Dach“ mit hoher Wahrscheinlichkeit, „Mauer“ mit geringerer und „Meer“ mit fast keiner.',
        'Um einen ganzen Text zu schreiben, wiederholt das Modell diesen Schritt: Es wählt eine Fortsetzung, hängt sie an den Text und schätzt die nächste. Ein Chat-Assistent ist derselbe Vorgang, angewandt auf einen Text, der mit dem bisherigen Gespräch beginnt; die Antwort ist die wahrscheinlichste Fortsetzung dieses Dialogs, Stück für Stück.',
        'Immer den wahrscheinlichsten Kandidaten zu wählen erzeugt eintönige Texte; unter den Kandidaten gemäß ihren Wahrscheinlichkeiten zu losen erzeugt abwechslungsreichere. Deshalb kann dieselbe Frage verschiedene Antworten bekommen: Bei jedem Schritt wird gelost.',
        'Ein großes Modell lernt diese Gewohnheit, indem es Milliarden Wörter liest. Es schlägt nicht in einer Faktendatenbank nach: Was es „weiß“, ist über Zahlen verteilt, die beim Training angepasst wurden. Deshalb kann es sich selbstsicher irren, und deshalb kennzeichnen die SaibaTudo-Apps, was von einem Modell kommt, und übernehmen von ihm nie eine kritische Zahl.',
        'Diese App öffnet die Teile dieses Mechanismus einen nach dem anderen: wie Text zu Stücken wird (Tokens), wie jedes Stück zu einem Vektor wird (Embedding), wie die Vektoren miteinander sprechen (Attention), wie sie umgeformt werden (Schichten) und wie die letzte Zahlenliste zu Wahrscheinlichkeiten wird (Softmax).'
      ],
      experimente: [
        { texto: 'Beginnen Sie mit dem Teil, den man sehen kann: Laden Sie das Beispiel „Königtum und Geschlecht“ und drehen Sie das Diagramm.', acao: { tipo: 'preset', id: 'realeza' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'tokens',
      titulo: 'Tokens: Text in Stücken',
      resumo: 'Das Modell liest weder Buchstaben noch ganze Wörter: Es liest Tokens, Textstücke aus einem festen Vokabular, jedes mit einer Nummer.',
      paragrafos: [
        'Vor jeder Berechnung wird der Text in **Tokens** zerlegt. Ein Token kann ein ganzes häufiges Wort sein („Haus“), ein Wortteil („ung“) oder ein Satzzeichen. Die Menge aller möglichen Tokens ist das **Vokabular** des Modells, mit Zehn- oder Hunderttausenden Einträgen, und jeder Eintrag hat eine Nummer.',
        'Die Zerlegung wird aus der Häufigkeit gelernt: Buchstabenfolgen, die oft vorkommen, werden ein einziges Token; seltene werden aus mehreren zusammengesetzt. Im Englischen passen viele Wörter in ein Token. Im Deutschen werden lange Wörter meist zu zwei oder drei. Im Chinesischen kann ein Schriftzeichen ein Token oder Teil eines Tokens sein, je nach Häufigkeit.',
        'Das erklärt manche kuriosen Verhaltensweisen: Ein Modell „sieht“ die Zahl 1234 als ein oder zwei Stücke, nicht als vier Ziffern, und kann stolpern, wenn es die Buchstaben eines Wortes zählen soll, das für es ein einziger Block ist.',
        'Was für den nächsten Abschnitt zählt: Nach der Zerlegung arbeitet das Modell nicht mehr mit Text. Es arbeitet mit der Liste der Token-Nummern, und der erste Schritt ist, jede Nummer gegen einen Vektor zu tauschen.'
      ],
      experimente: [
        { texto: 'Sehen Sie im nächsten Abschnitt, was mit jedem Token passiert: die Wortvektoren.', acao: { tipo: 'irPara', rota: '/llms/aprenda/embeddings' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'embeddings',
      titulo: 'Embeddings: Wörter als Vektoren',
      resumo: 'Jedes Token wird zu einer Zahlenliste, einem Vektor. Richtungen in diesem Raum tragen Bedeutung: König − Mann + Frau landet nahe bei Königin.',
      paragrafos: [
        'Ein **Embedding** ist ein Vektor: eine Liste von Zahlen, die ein Token darstellt. Die in dieser App verwendeten GloVe-Vektoren haben je 50 Zahlen; die eines großen Sprachmodells haben Tausende. Niemand wählt die Werte: Sie entstehen beim Training, so angepasst, dass Wörter aus ähnlichen Kontexten ähnliche Vektoren bekommen.',
        'Wie misst man „ähnlich“? Mit dem **Kosinus** des Winkels zwischen zwei Vektoren: 1, wenn sie in dieselbe Richtung zeigen, 0, wenn sie senkrecht stehen, −1, wenn sie entgegengesetzt sind. Das **Skalarprodukt** ist dieselbe Idee ohne Normierung: positiv, wenn die Vektoren übereinstimmen, negativ, wenn nicht. Die nächsten Nachbarn von „tower“ sind Wörter für Gebäude, weil sie in denselben Kontexten vorkommen.',
        'Das Überraschendste: **Richtungen** haben Bedeutung. Die Differenz der Vektoren von king und queen ähnelt der Differenz von man und woman: Es gibt eine Richtung, die das Geschlecht trägt. Deshalb funktioniert die Rechnung: king − man + woman ergibt einen Vektor, dessen nächster Nachbar queen ist. Dasselbe gilt für Land und Hauptstadt, Singular und Plural und für alle Assoziationen, die das Korpus enthält, gute wie schlechte.',
        'Mit 50 Dimensionen lässt sich nichts zeichnen. Das Diagramm dieser App wählt **3 Achsen**. Im Modus „3 Dimensionen“ sind die Achsen drei der 50 ursprünglichen Koordinaten, die zwischen den gewählten Wörtern am stärksten variieren: Sie sehen echte Zahlen des Vektors. Im PCA-Modus sind die Achsen Kombinationen der 50 Dimensionen, die die meiste Variation bewahren; die Abstände sind treuer, aber die Achsen sind keine einfachen Koordinaten mehr.',
        'Zwei Vorbehalte. Erstens ist GloVe auf englischen Texten trainiert (Wikipedia und Nachrichten): Die Wörter sind englisch und die Assoziationen sind die dieser Texte, Verzerrungen eingeschlossen. Zweitens ist in heutigen Sprachmodellen das Embedding nur der Ausgangspunkt: Die folgenden Schichten verändern jeden Vektor je nach Kontext.'
      ],
      experimente: [
        { texto: 'Berechnen Sie king − man + woman und sehen Sie, wer als Nachbar des Ergebnisses erscheint.', acao: { tipo: 'analogia', a: 'king', b: 'man', c: 'woman' } },
        { texto: 'Messen Sie die Pluralrichtung (cats − cat) gegen dog, dogs, house und houses.', acao: { tipo: 'direcao', w1: 'cats', w2: 'cat', lista: ['dog', 'dogs', 'house', 'houses'] } },
        { texto: 'Laden Sie „Länder und Hauptstädte“ und wechseln Sie zwischen 3 Dimensionen und PCA.', acao: { tipo: 'preset', id: 'capitais' } }
      ],
      referencias: ['glove2014', 'word2vec2013']
    },
    {
      id: 'atencao',
      titulo: 'Attention: Vektoren, die miteinander sprechen',
      resumo: 'Der Vektor eines Wortes beginnt in jedem Satz gleich. Attention lässt jeden Vektor Information von den anderen aufnehmen, damit „Bank“ weiß, ob es ein Sitz oder ein Geldinstitut ist.',
      paragrafos: [
        'Das Embedding von „Bank“ ist dasselbe in „ich saß auf der Bank“ und in „ich ging zur Bank, um Geld zu holen“. Damit das Modell den Satz versteht, muss jeder Vektor **durch den Kontext aktualisiert** werden. Genau das tut der **Attention**-Mechanismus: Jedes Token betrachtet die anderen Tokens der Sequenz und entscheidet, von welchen es Information erhalten soll und wie viel.',
        'Vereinfacht gesagt stellt jedes Token eine Frage (eine Query) und bietet eine Antwort (einen Key und einen Value). Passt die Query eines Tokens zum Key eines anderen, wird ein Teil des Values dieses anderen Tokens zum Vektor des ersten addiert. „Bank“ passt zu „saß“ und zieht die Bedeutung Sitz heran; es passt zu „Geld“ und zieht die finanzielle Bedeutung heran.',
        'Das geschieht parallel für alle Tokens und in mehreren **Attention-Köpfen**, von denen jeder frei ist, eine Art Beziehung zu lernen: Kongruenz, Pronomenbezug, Nähe. Das Ergebnis ist eine Menge von Vektoren, die keine isolierten Wörter mehr darstellen, sondern Wörter in diesem Satz.',
        'Attention ist der Teil, der der **Transformer**-Architektur von 2017 ihren Namen gab: Das sequenzielle Lesen wird durch einen Mechanismus ersetzt, in dem sich jedes Token mit jedem anderen verbinden kann, was das Training parallelisierbar und lange Kontexte handhabbar macht.'
      ],
      experimente: [
        { texto: 'Sehen Sie, wie sich Familienwörter vor jedem Kontext gruppieren: Von dort geht Attention aus.', acao: { tipo: 'preset', id: 'familia' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'camadas',
      titulo: 'Schichten, Parameter und Training',
      resumo: 'Zwischen zwei Attention-Schritten durchläuft jeder Vektor ein kleines neuronales Netz. Dutzende solcher Schichten mit Milliarden anpassbarer Zahlen bilden das Modell.',
      paragrafos: [
        'Nach der Attention folgt ein Schritt, in dem jeder Vektor für sich verarbeitet wird, ohne die anderen anzusehen: ein **mehrschichtiges Perzeptron** (MLP), zwei Matrixmultiplikationen mit einer nichtlinearen Funktion dazwischen. Dort scheint ein guter Teil des Faktenwissens gespeichert zu sein; Attention bewegt Information, das MLP formt sie um.',
        'Ein Transformer stapelt Dutzende gleicher Blöcke, jeder mit einer Attention und einem MLP. Der Vektor jedes Tokens betritt den ersten Block als Embedding und verlässt den letzten mit Kontext beladen. Der letzte Vektor der Sequenz wird zur Vorhersage des nächsten Tokens verwendet.',
        'Alles, was das Modell weiß, steckt in seinen **Parametern**: den Zahlen der Matrizen. Ein kleines Modell hat Hunderte Millionen; große haben Hunderte Milliarden. Trainieren heißt, diese Zahlen nach und nach so anzupassen, dass die Vorhersage des nächsten Tokens in echten Texten immer besser wird. Niemand schreibt Regeln: Das Verhalten entsteht aus der Anpassung.',
        'Deshalb lässt sich ein Modell nicht durch das Ändern einer Zeile korrigieren. Um zu ändern, was es sagt, muss man weiter trainieren (Feinabstimmung) oder die Information im Eingabetext mitgeben. In den SaibaTudo-Apps kommen die amtlichen Daten in den Eingabetext und ein Prüfer kontrolliert die Ausgabe: Das Modell erklärt, die Daten antworten.'
      ],
      experimente: [
        { texto: 'Laden Sie „Farben“ und beobachten Sie, wie sich allein aus den Embeddings eine kompakte Gruppe bildet, vor jeder Schicht.', acao: { tipo: 'preset', id: 'cores' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'softmax',
      titulo: 'Softmax und Temperatur',
      resumo: 'Am Ende hat das Modell eine Zahl für jedes Token des Vokabulars. Softmax macht aus diesen Zahlen Wahrscheinlichkeiten; die Temperatur steuert, wie viel das Losen riskiert.',
      paragrafos: [
        'Der letzte Vektor der Sequenz wird mit einer letzten Matrix multipliziert und wird zu einer Liste mit einer Zahl pro Vokabular-Token: den **Logits**. Größere Zahlen bedeuten plausiblere Fortsetzungen, aber es sind noch keine Wahrscheinlichkeiten: Sie können negativ sein und summieren sich nicht zu 1.',
        'Die Funktion **Softmax** löst das. Für jedes Logit z_i berechnet sie e^(z_i) und teilt durch die Summe aller: p_i = e^(z_i) / Σ_j e^(z_j). Das Ergebnis ist eine Liste von Wahrscheinlichkeiten, alle positiv, Summe 1, in der große Unterschiede zwischen Logits zu riesigen Unterschieden zwischen Wahrscheinlichkeiten werden.',
        'Die **Temperatur** T kommt ins Spiel, indem die Logits vor der Softmax durch sie geteilt werden: p_i = e^(z_i / T) / Σ_j e^(z_j / T). Bei T nahe 0 verschluckt die größte Wahrscheinlichkeit die anderen und das Modell wählt fast immer dieselbe Fortsetzung. Bei T = 1 sind die Wahrscheinlichkeiten die des Trainings. Bei hohem T flacht die Verteilung ab und unwahrscheinliche Fortsetzungen werden gelost: kreativere und fehlerhaftere Texte.',
        'Nach dem Losen wird das gewählte Token an den Text gehängt und der Zyklus beginnt von vorn: Tokens, Embeddings, Attention, Schichten, Softmax. Jedes Wort, das ein Assistent schreibt, hat diesen ganzen Weg durchlaufen.'
      ],
      experimente: [
        { texto: 'Laden Sie „Zahlen“: Vektoren bedeutungsnaher Wörter bleiben nah beieinander, dieselbe Regelmäßigkeit, die Softmax am Ende nutzt.', acao: { tipo: 'preset', id: 'numeros' } }
      ],
      referencias: ['transformer2017']
    }
  ]
};
