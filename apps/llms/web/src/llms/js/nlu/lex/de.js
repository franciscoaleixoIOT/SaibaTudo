// gerado — não editar. Fonte: contracts/lexico/de.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "de",
 "versao": 1,
 "descricao": "Lexikon des SaibaTudo-LLMs-Interpreters, Deutsch. Regexes auf normalisiertem Text (Kleinbuchstaben, ohne Akzente/Umlautzeichen).",
 "intencoes": {
  "saudacao": "^(?:hallo|hi|hey|guten morgen|guten tag|guten abend|servus|moin)\\b[!.,]*\\s*$",
  "ajuda": "\\b(?:hilfe|hilf mir|wie (?:benutze|funktioniert|geht)|was kannst du|was kann ich fragen)\\b",
  "sobreDados": "\\b(?:woher (?:kommen|stammen) die daten|uber die daten|welche daten|datenquelle|lizenz der daten|welches korpus|welche wortvektoren)\\b",
  "fontes": "\\b(?:quellen?|referenzen?|literatur|glove[- ]paper|wer hat glove)\\b",
  "mostrar": "\\b(?:zeig\\w*|anzeig\\w*|stell\\w* dar|fug\\w* hinzu|hinzufug\\w*|setz\\w*|leg\\w*|zeichn\\w*|plott\\w*|visualisier\\w*|ins diagramm|projizier\\w*|sehen|ansehen)\\b",
  "analogia": "[a-z'-]+\\s*[-−–]\\s*[a-z'-]+\\s*\\+\\s*[a-z'-]+|\\b(?:analogie|verhalt sich zu|wie .* zu|erganze)\\b",
  "vizinhos": "\\b(?:nachbarn?|ahnlich\\w*|verwandt\\w*|nah(?:e|en|este[nr]?)? (?:bei|an|zu)|in der nahe|worter wie|erinner\\w*)\\b",
  "similaridade": "\\b(?:ahnlichkeit|wie ahnlich|wie nah|sind .* ahnlich|kosinus (?:zwischen|von)|abstand zwischen|distanz zwischen)\\b",
  "direcao": "\\b(?:richtung|skalarprodukt|plural(?:achse|richtung)|geschlechts?(?:achse|richtung)|singular und plural trennen)\\b",
  "conceito": "\\b(?:was (?:ist|sind|bedeutet|heisst)|erklar\\w*|definier\\w*|definition|wie funktioniert\\w*|warum|wozu|wofur|begriff)\\b",
  "preset": "\\b(?:beispiele?|presets?|vorlagen?|vordefiniert\\w*|fertig\\w*)\\b",
  "limpar": "\\b(?:leer\\w*|losch\\w*|zurucksetz\\w*|alles entfern\\w*|neu anfang\\w*|reset)\\b"
 },
 "pistas": {
  "separadorLista": "\\s*(?:,|;|\\bund\\b|\\boder\\b|\\bmit\\b)\\s*",
  "menos": "\\s[-−–]\\s|[-−–]",
  "mais": "\\+",
  "estaPara": "([a-z'-]+)\\s+verhalt sich zu\\s+([a-z'-]+)\\s+wie\\s+([a-z'-]+)\\s+zu\\s*([a-z'-]*)",
  "aspas": "[\"“”'‘’«»]([^\"“”'‘’«»]+)[\"“”'‘’«»]",
  "continuacao": "^(?:und|auch|jetzt|noch|dazu|und auch|was ist mit)\\b",
  "plural": "\\b(?:plural|plurale|singular|singulare|mehrzahl|einzahl)\\b"
 },
 "conceitos": {
  "embedding": [
   "embedding",
   "embeddings",
   "wortvektor",
   "wortvektoren",
   "vektordarstellung",
   "word2vec",
   "glove"
  ],
  "token": [
   "token",
   "tokens",
   "tokenisierung",
   "tokenizer",
   "subwort",
   "wortstuck"
  ],
  "atencao": [
   "attention",
   "aufmerksamkeit",
   "aufmerksamkeitsmechanismus",
   "attention head",
   "attention-kopf"
  ],
  "mlp": [
   "mlp",
   "perzeptron",
   "dichte schicht",
   "schichten",
   "feed-forward",
   "feedforward",
   "neuronales netz"
  ],
  "softmax": [
   "softmax",
   "wahrscheinlichkeit",
   "wahrscheinlichkeiten",
   "wahrscheinlichkeitsverteilung",
   "logit",
   "logits"
  ],
  "temperatura": [
   "temperatur",
   "temperature",
   "kreativitat des modells",
   "zufall"
  ],
  "transformer": [
   "transformer",
   "transformers",
   "architektur",
   "llm",
   "sprachmodell",
   "gpt",
   "chatgpt"
  ],
  "parametro": [
   "parameter",
   "gewicht",
   "gewichte",
   "training",
   "milliarden parameter"
  ],
  "proximoToken": [
   "nachstes token",
   "nachstes wort",
   "vorhersagen",
   "vorhersage",
   "autovervollstandigung",
   "text erzeugen"
  ],
  "dimensao": [
   "dimension",
   "dimensionen",
   "achse",
   "achsen",
   "50 dimensionen",
   "koordinate",
   "koordinaten",
   "pca",
   "hauptkomponente"
  ],
  "vetor": [
   "vektor",
   "vektoren",
   "pfeil",
   "pfeile",
   "vektorrechnung",
   "vektoraddition"
  ],
  "cosseno": [
   "kosinus",
   "kosinus-ahnlichkeit",
   "skalarprodukt",
   "winkel zwischen",
   "abstand"
  ]
 },
 "presets": {
  "realeza": [
   "konigtum",
   "konig und konigin",
   "konige und koniginnen",
   "geschlecht",
   "mann und frau",
   "royal"
  ],
  "capitais": [
   "hauptstadte",
   "hauptstadt",
   "lander und hauptstadte",
   "lander",
   "stadte"
  ],
  "plural": [
   "plural",
   "mehrzahl",
   "singular und plural",
   "katze und katzen"
  ],
  "familia": [
   "familie",
   "verwandte",
   "vater und mutter",
   "verwandtschaft"
  ],
  "cores": [
   "farben",
   "farbe",
   "rot blau grun"
  ],
  "numeros": [
   "zahlen",
   "zahlworter",
   "eins bis zehn",
   "eins zwei drei",
   "zahlen"
  ],
  "lideres": [
   "anfuhrer",
   "diktatoren",
   "lander und anfuhrer",
   "hitler",
   "mussolini",
   "napoleon"
  ]
 },
 "stopPalavras": [
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "ein",
  "eine",
  "einen",
  "einem",
  "einer",
  "und",
  "oder",
  "in",
  "im",
  "an",
  "am",
  "auf",
  "zu",
  "zum",
  "zur",
  "fur",
  "mit",
  "von",
  "vom",
  "bei",
  "was",
  "wie",
  "welche",
  "welcher",
  "welches",
  "mir",
  "mich",
  "bitte",
  "ich",
  "will",
  "mochte",
  "kannst",
  "du",
  "wort",
  "worter",
  "diagramm",
  "vektor",
  "vektoren",
  "zeige",
  "zeig",
  "zeigen",
  "fuge",
  "hinzu",
  "setze",
  "lege",
  "zeichne",
  "auch",
  "jetzt",
  "noch",
  "dazu",
  "zwischen",
  "sind",
  "ist",
  "ahnlich",
  "ahnliche",
  "nah",
  "nahe",
  "nachbarn",
  "verwandt",
  "es",
  "sie",
  "ihn",
  "ihr",
  "uber",
  "aus"
 ],
 "semFronteira": false,
 "normalizarAcentos": true
};
