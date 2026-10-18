// gerado — não editar. Fonte: contracts/lexico/de.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "de",
 "versao": 1,
 "descricao": "Deutsches Lexikon des lokalen regelbasierten Interpreters (NLU) und der Sicherheitsregeln. Gleiche Struktur wie pt-BR.json (per Test geprüft). Regexes als TEXT ohne Flags: der Client normalisiert die Frage (Kleinbuchstaben, ohne Akzente/Umlaute: ä→a, ö→o, ü→u, ß bleibt; nur [a-z0-9+-] und Leerzeichen). Erste Übersetzung durch Agent (menschliche Prüfung ausstehend).",
 "intencoes": {
  "saudacao": "^(hi+|hallo+|hey|moin|servus|guten morgen|gru(?:ss| )(?:dich|gott|euch)|guten tag|guten abend|danke|vielen danke|dankeschon|hilfe|help|menu|start|startseite|test|teste)( zusammen| alle| schon| sehr| dir| euch| assistent| ki| freund| wie gehts| alles gut)*$",
  "ajuda": "\\b(?:was (?:kannst du|machst du|wei(?:ss| )t du|kann (?:die|diese) app|macht (?:die|diese) app|kann die ki)|wie (?:benutze|nutze|verwende) ich (?:die|diese) (?:app|anwendung|assistent)|wie funktioniert (?:die|diese|das) (?:app|anwendung|assistent)?|was kann ich fragen|ich brauche hilfe|wer hat (?:die|diese) app (?:gemacht|erstellt|entwickelt))\\b",
  "sobreDados": "\\b(?:uber die daten|woher (?:kommen|stammen) die daten|herkunft der daten|datenquelle|aktualisierung der daten|sind die daten aktuell|datenversion|wann wurden die daten aktualisiert|signatur der daten)\\b",
  "fontes": "\\b(?:welche (?:quellen|lizenzen)|was sind die quellen|lizenzen? der daten|was ist die quelle|quellen? (?:der |dieser )?(?:information|antwort(?:en)?)|woher (?:hast du|kommt|stammt) (?:diese|die) (?:information|antwort)|referenzen?|literatur)\\b",
  "balancear": "\\bausgleich\\w*|\\bausbalancier\\w*|\\bbalancier\\w*|\\breaktionsgleichung (?:aufstellen|ausgleichen)|\\bgleichung (?:ausgleichen|aufstellen)|\\bkoeffizienten (?:bestimmen|anpassen)|\\bstochiometrisch\\w* koeffizient\\w*|\\bgleich(?:e|en|st|t)? .{1,60}\\baus\\b|\\bstell\\w* .{0,30}gleichung\\w* auf\\b|\\bgleichung\\w* aufstell\\w*",
  "conversao": "\\b(?:umrechn\\w*|umwandl\\w*|konvertier\\w*|rechn(?:e|en|et) .{1,40} um|wandl\\w* .{1,40} um|stell\\w* .{1,40} um|entspricht|entsprechen|wie ?viele? \\S+(?: \\S+)? (?:sind|hat|haben|entsprechen|ergeben|passen)|in wie ?viele?)\\b",
  "ph": "\\b(?:ph|poh)\\b|\\bph wert\\b|\\bsaure(?:grad|starke) von\\b|\\bbasizitat\\b|\\balkalitat\\b",
  "gas": "\\b(?:ideale?s? gase?|perfektes gas|pv ?= ?nrt|pvnrt|gasgesetz\\w*|allgemeine gasgleichung|ideale gasgleichung|zustandsgleichung|clapeyron|molvolumen|molares volumen|volumen (?:eines|des) gases|druck (?:eines|des) gases|boyle mariotte|gesetz von boyle|gesetz von charles|gay lussac)\\b",
  "gasVariavel": "\\bgase?s?\\b",
  "concentracao": "\\b(?:molaritat|konzentration|konzentriert\\w*|verdunn\\w*|c1 ?v1|c1v1|massenanteil|massenprozent|gewichtsprozent|prozent (?:der )?masse|teile pro million|ppm|normalitat|molalitat|losung (?:von|aus)|gramm pro liter|mol l|mol pro liter|g l)\\b",
  "estequiometria": "\\b(?:stochiometri\\w*|limitierend\\w* (?:reagenz|reaktant|edukt)|begrenzend\\w* (?:reagenz|reaktant)|im uberschuss|uberschuss|ausbeute|wie ?viele? (?:mol|molekule|atome|ionen|teilchen)\\b|wie ?viele? (?:gramm|liter|kilo|kilogramm|mg|milligramm)\\b(?!\\s+(?:sind|ist|entsprechen|entspricht|ergeben|hat|haben)\\s+\\d+(?: \\d+)* ?(?:kg|g|mg|l|ml|liter|milliliter|gramm|kilogramm|milligramm)\\b)|anzahl (?:der |an )?(?:mol|molekule|atome|teilchen|ionen)|normbedingungen|standardbedingungen|eingenommenes volumen|avogadro(?:konstante|zahl)|avogadro'?sche (?:zahl|konstante))\\b",
  "massaMolar": "\\b(?:molare masse|molmasse|molekulmasse|molekulargewicht|molekulare masse|formelmasse|molgewicht|wie ?viel wiegt (?:ein )?mol|wie ?viel wiegen (?:ein|1) mol|wie schwer (?:ist|sind) (?:ein|1) mol|wie gro(?:ss| ) ist (?:die )?molare masse|was ist die molare masse)\\b|\\bg mol\\b",
  "desenhar": "\\b(?:zeichn\\w+|struktur (?:2d|molekular|chemisch\\w*|von|des|der)|2d struktur|struktur|zeig\\w* (?:mir )?(?:die )?(?:struktur|molekul)|molekul (?:von|des|der)|wie sieht (?:das |die )?(?:molekul|struktur) (?:von \\S+ )?aus|strukturformel|molekulgeometrie|visualisier\\w*|gerust|skizz\\w+)\\b",
  "comparar": "\\b(?:vergleich\\w*|unterscheid\\w*|unterschied(?:e)? zwischen|\\bversus\\b|\\bvs\\b|was ist der unterschied|ahnlichkeit\\w*|gleich wie|(?:was|welches|welcher|welche) (?:element |stoff |verbindung |von beiden )?(?:ist|hat|sind) (?:schwerer|leichter|dichter|gro(?:ss| )er|kleiner|hoher|niedriger|starker|schwacher|elektronegativer|reaktiver)|ahnlich wie|gemeinsamkeit\\w*|(?:aufsteigend|absteigend|zunehmend|abnehmend)\\w*|reihenfolge|ordne\\w*|sortier\\w*|(?:welche[rs]?|was) (?:element |stoff |verbindung |von beiden )?(?:hat|ist) (?:den |die |das )?(?:grossere\\w*|kleinere\\w*|hohere\\w*|niedrigere\\w*|mehr|weniger))\\b",
  "seguranca": "\\b(?:gefahr\\w*|gefahrlich\\w*|giftig\\w*|toxisch\\w*|toxizitat|sicher\\w*|psa|schutzausrustung|erste hilfe|verschutt\\w*|auslauf\\w*|leck\\w*|lager\\w*|aufbewahr\\w*|brand\\w*|feuer\\w*|entzundlich\\w*|brennbar\\w*|atzend\\w*|korrosiv\\w*|reizend\\w*|reiz\\w*|ghs|piktogramm\\w*|h[- ]?satz\\w*|h[- ]?satze|gefahrenhinweis\\w*|sicherheitsdatenblatt|sdb|icsc|misch\\w*|unvertraglich\\w*|entsorg\\w*|handhab\\w*|umgang mit|einatm\\w*|verschluck\\w*|verbrenn\\w*|gift|vergift\\w*|schadlich|ist (?:es|das) sicher|ist (?:es|das) gefahrlich|neutralisier\\w*|handschuhe|schutzbrille|signalwort|gefahreneinstufung|krebserregend|karzinogen\\w*|explosiv\\w*|reagiert mit wasser|reaktiv\\w* mit)\\b",
  "nomenclatura": "\\b(?:wie (?:hei(?:ss| )t|lautet) der name|wie hei(?:ss| )t|wie nennt man|name (?:von|des|der|fur)|chemische\\w* name|iupac name|systematische\\w* name|wissenschaftliche\\w* name|offizielle\\w* name|nomenklatur|wie schreibt man|wie lautet die (?:chemische |molekulare |summen)?formel|was ist die (?:chemische |summen)?formel|formel (?:von|des|der|fur)|summenformel|name der verbindung)\\b",
  "tabela": "\\b(?:periodensystem|pse|periodizitat|trends?|gruppe \\d{1,2}|familie \\d{1,2}|periode \\d|block [spdf]|[spdf][- ]block|elemente? (?:der|des|aus der|aus dem|in der|in) (?:gruppe|periode|block|familie)|welche elemente|wie ?viele elemente|(?:gasformige|flussige|feste) elemente|metalle|nichtmetalle|halbmetalle|metalloide|halogene?|edelgase?|erdalkalimetalle?|alkalimetalle?|lanthanoide?|lanthanide?|actinoide?|actinide?|element mit (?:der|dem) (?:hochsten|gro(?:ss| )ten|niedrigsten|kleinsten)|aufsteigend\\w* reihenfolge|absteigend\\w* reihenfolge|(?:hochste|gro(?:ss| )te|niedrigste|kleinste)r? (?:atomradius|radius|elektronegativitat|energie|punkt|masse|dichte))\\b",
  "conceitoCue": "^(?:was (?:ist|sind|bedeutet|hei(?:ss| )t|bedeuten)|erklar\\w*|definier\\w*|definition (?:von|des|der)|begriff|konzept|erzahl\\w* mir|wie funktioniert|wie funktionieren|warum|wieso|weshalb|wozu (?:dient|braucht man)|was ist (?:die |der )?(?:definition|unterschied|bedeutung|funktion|rolle)|unterschied zwischen|bring\\w* mir .{1,20} bei|zusammenfass\\w*|fasse .{1,30} zusammen)\\b",
  "conceitoTemas": "\\b(?:mol|ph|stochiometrie|(?:ionen|atom|metall|kovalente|chemische) ?bindung|elektronegativitat|oxidation|reduktion|redox|chemisches gleichgewicht|enthalpie|entropie|isomerie|saure|base|salz|oxid|losung|konzentration|molaritat|verdunnung|periodensystem|chemische reaktion|kinetik|katalysator|elektrolyse|batterie|galvanische zelle|polaritat|zwischenmolekulare krafte|intermolekulare krafte)\\b",
  "nox": "\\b(?:oxidationszahl\\w*|oxidationsstufe\\w*)\\b",
  "entalpia": "\\b(?:\\w*enthalpie\\w*|reaktionswarme|verbrennungswarme|(?:freigesetzte|frei werdende|abgegebene|aufgenommene) (?:warme|energie)|satz von hess|hess\\w*|delta h|exotherm\\w*|endotherm\\w*)\\b",
  "equilibrio": "\\b(?:kc|kp|gleichgewichtskonstante\\w*|massenwirkungsgesetz\\w*|im gleichgewicht|chemisch\\w* gleichgewicht\\w*|reaktionsquotient\\w*)\\b",
  "ligacao": "\\b(?:bindungsart\\w*|bindungstyp\\w*|art der bindung|ionenbindung\\w*|atombindung\\w*|metallbindung\\w*|elektronenpaarbindung\\w*|kovalente bindung\\w*|polare bindung\\w*|unpolare bindung\\w*|welche bindung\\w*|bindung\\w* (?:zwischen|in|im))\\b"
 },
 "pistas": {
  "querCalcular": "\\b(?:limitierend\\w*|ausbeute|wie ?viele?|masse von|gramm|mol|entsteh\\w*|bild\\w*|erhalt\\w*|reagier\\w*|verbrauch\\w*|ubrig|bleib\\w*|uberschuss|volumen|liter)\\b",
  "conversaoPreposicoes": "(?:->|→| in | zu | nach | to )",
  "paraUnidade": "\\b(?:in|zu|nach)\\s+(?:den |die |das |dem |der )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| pro liter| quecksilbersaule)?)(?:\\s+(?:umrechnen|umwandeln|konvertieren|angeben|ausdrucken|darstellen|um|dar|an|aus))?\\s*[?!.]*$",
  "quantosUnidade": "^\\s*(?:wie ?viele?|wieviel)\\s+((?:grad\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:sind|hat|haben|entsprechen|ergeben|passen|ist)(?![A-Za-z])",
  "phContexto": "\\b(?:saure|base|losung|lauge)\\b",
  "conector": "\\b(?:von|des|der)\\b",
  "prefixoExplicacao": "^(?:was ist|was sind|erklar|definier|definition|begriff|konzept|wie funktioniert|warum|wieso)",
  "prefixoExplicacaoPalavra": "^(?:was ist|was sind|erklar\\w*|definier\\w*|definition|begriff|konzept|wie funktioniert|warum|wieso)\\b",
  "prefixoDefinicao": "^(?:was ist|was sind|erklar\\w*|definier\\w*|definition|begriff|konzept)\\b(?!\\s+(?:die |der |das )?(?:molare masse|molmasse|molekulmasse|formelmasse|molgewicht|molekulargewicht)\\s+(?:von|des|der|vom)\\b)",
  "gasGrandezas": "\\b(?:volumen|druck|temperatur|mol|wie ?viele?)\\b",
  "concentracaoForte": "\\bverdunn\\w*|molaritat|konzentration\\b",
  "propriedadesPalavra": "\\beigenschaften\\b",
  "mistura": "\\b(?:misch\\w*|zusammen mit|zusammen|kombinier\\w+|gemischt|unvertraglich\\w*)\\b",
  "elementoPalavra": "\\belemente?s?\\b",
  "gasSubstancia": "\\bgas\\b",
  "tendencia": "\\btrends?\\b|\\bperiodizitat|\\bander\\w* sich (?:entlang|innerhalb|in) (?:der|einer) (?:periode|gruppe)|\\b(?:entlang|innerhalb) (?:der|einer) (?:periode|gruppe)",
  "tabelaPalavra": "\\bperiodensystem\\b",
  "grupo": "\\b(?:gruppe|familie)\\s+(\\d{1,2})\\b",
  "periodo": "\\bperiode\\s+(\\d)\\b",
  "bloco": "\\bblocks?\\s+([spdf])\\b|\\b([spdf])[- ]blocks?\\b",
  "continuacao": "^und (?:der |die |das |den |dem )?(?:von |des |der )?",
  "continuacaoNuvem": "^(?:und|jetzt|nun|ok|okay|super|alles klar|gut|dann|auch|in|mit|dasselbe|das gleiche|zeichne|zeig|zeige|mehr)(?: |$)|(?:^| )(?:auch|ebenfalls|noch|sein|seine|seinen|davon|dasselbe|es)(?: |$)",
  "limparConceito": [
   "^\\s*(?:mir |uns |bitte |doch |mal |kurz |genau |eigentlich |noch |einmal )+",
   "^\\s*(?:was|wie|wer|wo)\\s+(?=\\S)",
   "^\\s*(?:ist |sind |bedeutet |hei(?:ss| )t |bedeuten )+",
   "^\\s*(?:ein |eine |einer |der |die |das |den |dem |von |des )+",
   "\\s+(?:ist|sind|bedeutet|hei(?:ss| )t|bedeuten)$"
  ],
  "constantes": "\\b(pka|pkb|ka|kb)\\s*(?:=|:|von|ist|gleich|betragt)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
  "quantidadeComplemento": "(?:pro|an)",
  "letrasUnidade": "A-Za-zäöüß",
  "ligacaoPreposicoes": "(?:an|von|des|der)",
  "diluicao": "\\b(?:verdunn\\w*|c1v1|c1 v1)\\b",
  "percentualMassa": "\\bmasse|prozent|anteil|gewicht\\b",
  "cntp": "\\b(?:normbedingungen|standardbedingungen|volumen)\\b",
  "cueElemento": "\\b(?:element|symbol|elementsymbol|chemisches symbol)\\b",
  "reacaoVerbo": "\\b(?:entsteh\\w*|entstanden\\w*|gebildet\\w*|bildet|bilden|erhalten\\w*|gewonnen\\w*|reagier\\w*|verbraucht\\w*|benotigt\\w*|freigesetzt\\w*|aus|verbrenn\\w*|zersetz\\w*)\\b",
  "pedidoQuantidade": "\\b(?:wiegt|wiegen|masse(?! (?:von )?(?:molar|molekul|atom))|mol|stoffmenge|volumen)\\b",
  "ordemCrescente": "\\b(?:aufsteigend\\w*|zunehmend\\w*|steigend\\w*|vom kleinsten zum grossten|(?:welche[rs]?|was) (?:element |stoff |verbindung |von beiden )?(?:hat|ist) (?:den |die |das )?(?:kleinere\\w*|niedrigere\\w*|weniger|leichter))\\b",
  "ordemDecrescente": "\\b(?:absteigend\\w*|abnehmend\\w*|fallend\\w*|vom grossten zum kleinsten|(?:welche[rs]?|was) (?:element |stoff |verbindung |von beiden )?(?:hat|ist) (?:den |die |das )?(?:grossere\\w*|hohere\\w*|mehr|schwerer|dichter))\\b",
  "conectivoLista": "^(?:und|oder|bzw)$",
  "paraUnidades": "\\b(?:in|zu|nach)\\s+(?:den |die |das |dem |der )?",
  "paraUnidadesFim": "(?:\\s+(?:umrechnen|umwandeln|konvertieren|angeben|ausdrucken|darstellen|um|dar|an|aus))?\\s*[?!.]*$",
  "misturaTema": "\\b(gemisch|mischung|gemenge)(?:e|en|es)?\\b",
  "misturaConceito": "\\b(?:reinstoff\\w*|stoff\\w*|substanz\\w*|rein|homogen\\w*|heterogen\\w*|system\\w*|einteil\\w*|teile? \\S+ ein|klassifizier\\w*|ordne\\w*|arten von|was (?:ist|sind)|unterschied zwischen|phasen?)\\b",
  "nomenclaturaPedido": "\\b(?:wie hei(?:ss| )t|wie nennt man|wie lautet der (?:iupac[- ]?)?name|benenne\\w*|gib den (?:iupac[- ]?)?namen|(?:iupac|systematische\\w*|offizielle\\w*)[- ]?name\\w*)\\b",
  "nomenclaturaAlvo": "\\b(?:verbindung\\w*|stoff\\w*|substanz\\w*|molekul\\w*|kohlenwasserstoff\\w*|organisch\\w*|kette\\w*|struktur\\w*|\\w*(?:meth|eth|prop|but|pent|hex|hept|oct|non|dec|phen|benz)\\w*(?:an|en|in|ol|on|yl|amin))\\b",
  "noxAlvo": "\\b(?:von|vom|des|der|fur) (\\S+(?: \\S+)?) (?:in|im|innerhalb)\\b",
  "entalpiaCombustao": "\\b(?:verbrennung\\w*|verbrenn\\w*|verbrannt\\w*)\\b",
  "entalpiaFormacao": "\\b(?:\\w*bildungsenthalpie\\w*|bildungswarme)\\b",
  "hess": "\\b(?:satz von hess|hess\\w*)\\b",
  "kcKp": "\\b(?:kp|partialdruck\\w*)\\b",
  "concentracaoColchete": "=|:|ist|betragt|gleich|von",
  "ligacaoPolaridade": "\\b(?:ionisch\\w*|kovalent\\w*|polar\\w*|unpolar\\w*|metallisch\\w*)\\b",
  "deFormacao": "\\b(?:der bildung|bildung\\w*)\\b",
  "constanteEquilibrio": "\\b(?:kc|kp|gleichgewichtskonstante\\w*)\\b",
  "ionRomano": "\\b([a-z]+) (i{1,3}|iv|vi{0,2}|v) ?-?(?:ions?|ionen|kations?|kationen)\\b|\\b(?:ions?|kations?) (?:des |von )?([a-z]+) (i{1,3}|iv|vi{0,2}|v)\\b"
 },
 "nivel": {
  "fundamental": "\\b(?:grundschule|kinder|kind|einfach|ganz einfach|leicht verstandlich|fur anfanger|fur laien)\\b",
  "medio": "\\b(?:gymnasium|oberstufe|mittelstufe|abitur|realschule|schule)\\b",
  "superior": "\\b(?:universitat|uni|hochschule|studium|fortgeschritten|vertieft|ausfuhrlich|detailliert)\\b"
 },
 "unidades": [
  [
   "^grad (?:celsius|centigrad)$|^celsius$",
   "°C"
  ],
  [
   "^grad fahrenheit$|^fahrenheit$",
   "°F"
  ],
  [
   "^kelvin$",
   "K"
  ],
  [
   "^atmosphare(?:n)?$",
   "atm"
  ],
  [
   "^pascal$",
   "Pa"
  ],
  [
   "^kilopascal$",
   "kPa"
  ],
  [
   "^millimeter quecksilbersaule$|^mm quecksilbersaule$",
   "mmHg"
  ],
  [
   "^liter?n?$",
   "L"
  ],
  [
   "^milliliter?n?$",
   "mL"
  ],
  [
   "^mikroliter?n?$",
   "µL"
  ],
  [
   "^gramm$",
   "g"
  ],
  [
   "^milligramm$",
   "mg"
  ],
  [
   "^kilogramm$|^kilo$",
   "kg"
  ],
  [
   "^tonnen?$",
   "t"
  ],
  [
   "^mol$",
   "mol"
  ],
  [
   "^millimol$",
   "mmol"
  ],
  [
   "^kilomol$",
   "kmol"
  ],
  [
   "^joule$",
   "J"
  ],
  [
   "^kalorien?$",
   "cal"
  ],
  [
   "^kilokalorien?$",
   "kcal"
  ],
  [
   "^kilojoule$",
   "kJ"
  ],
  [
   "^molar$",
   "mol/L"
  ],
  [
   "^mol pro liter$",
   "mol/L"
  ],
  [
   "^gramm pro liter$",
   "g/L"
  ],
  [
   "^(?:molekule?|atome?|teilchen|ionen?|einheiten|entitaten)$",
   "particulas"
  ],
  [
   "^meter?n?$",
   "m"
  ],
  [
   "^zentimeter?n?$",
   "cm"
  ],
  [
   "^millimeter?n?$",
   "mm"
  ],
  [
   "^nanometer?n?$",
   "nm"
  ],
  [
   "^kilometer?n?$",
   "km"
  ],
  [
   "^prozent$",
   "%"
  ],
  [
   "^bar$",
   "bar"
  ],
  [
   "^torrs?$",
   "Torr"
  ],
  [
   "^stunden?$",
   "h"
  ],
  [
   "^minuten?$",
   "min"
  ],
  [
   "^sekunden?$",
   "s"
  ],
  [
   "^kubikmeter?n?$",
   "m3"
  ],
  [
   "^kubikdezimeter?n?$",
   "dm3"
  ],
  [
   "^kubikzentimeter?n?$",
   "cm3"
  ]
 ],
 "numerais": [
  [
   "ein halbes|eine halbe|einem halben|einer halben|ein halb|halbes|halbe|halben|halb",
   0.5
  ],
  [
   "ein|eine|einem|einen|einer|eins",
   1
  ],
  [
   "zwei",
   2
  ],
  [
   "drei",
   3
  ],
  [
   "vier",
   4
  ],
  [
   "funf",
   5
  ],
  [
   "sechs",
   6
  ],
  [
   "sieben",
   7
  ],
  [
   "acht",
   8
  ],
  [
   "neun",
   9
  ],
  [
   "zehn",
   10
  ]
 ],
 "categorias": [
  [
   "\\berdalkali\\w*",
   "metal_alcalino_terroso"
  ],
  [
   "\\balkalimetall\\w*|\\balkalien\\b",
   "metal_alcalino"
  ],
  [
   "\\bubergangsmetall\\w*|\\bubergangselement\\w*",
   "metal_transicao"
  ],
  [
   "\\bpost ?ubergangsmetall\\w*|\\bhauptgruppenmetall\\w*",
   "metal_pos_transicao"
  ],
  [
   "\\bhalbmetall\\w*|\\bmetalloid\\w*",
   "semimetal"
  ],
  [
   "\\bnichtmetall\\w*",
   "nao_metal"
  ],
  [
   "\\bhalogene?s?\\b",
   "halogenio"
  ],
  [
   "\\bedelgase?s?\\b|\\bedle gase\\b",
   "gas_nobre"
  ],
  [
   "\\blanthanoide?n?\\b|\\blanthanide?n?\\b|\\bseltene erden",
   "lantanideo"
  ],
  [
   "\\bactinoide?n?\\b|\\bactinide?n?\\b|\\baktinoide?n?\\b",
   "actinideo"
  ],
  [
   "\\bmetalle\\b|\\bmetall\\b",
   "metal"
  ]
 ],
 "estados": [
  [
   "\\b(?:gasformige?s?|gase|im gasformigen zustand)\\b",
   "gas"
  ],
  [
   "\\bflussige?s?\\b",
   "liquido"
  ],
  [
   "\\bfeste?s?\\b|\\bfeststoffe?\\b",
   "solido"
  ]
 ],
 "extremos": [
  [
   "\\bam (?:starksten )?elektronegativ\\w*|\\bhochste elektronegativitat|\\belektronegativste\\w*",
   "eletronegatividade",
   "max"
  ],
  [
   "\\bam wenigsten elektronegativ\\w*|\\bniedrigste elektronegativitat",
   "eletronegatividade",
   "min"
  ],
  [
   "\\bdichteste\\w*|\\bam dichtesten|\\bhochste dichte",
   "densidadeKgm3",
   "max"
  ],
  [
   "\\bam wenigsten dicht|\\bniedrigste dichte|\\bleichteste\\w*",
   "densidadeKgm3",
   "min"
  ],
  [
   "\\bgro(?:ss| )te\\w* (?:atom)?radius|\\bam gro(?:ss| )ten|\\bvoluminoseste\\w*",
   "raioAtomicoPm",
   "max"
  ],
  [
   "\\bkleinste\\w* (?:atom)?radius",
   "raioAtomicoPm",
   "min"
  ],
  [
   "\\bhochste\\w* schmelzpunkt",
   "pontoFusaoK",
   "max"
  ],
  [
   "\\bniedrigste\\w* schmelzpunkt",
   "pontoFusaoK",
   "min"
  ],
  [
   "\\bhochste\\w* siedepunkt",
   "pontoEbulicaoK",
   "max"
  ],
  [
   "\\bniedrigste\\w* siedepunkt",
   "pontoEbulicaoK",
   "min"
  ],
  [
   "\\bhochste\\w* ionisierungsenergie",
   "energiaIonizacaoKJmol",
   "max"
  ],
  [
   "\\bniedrigste\\w* ionisierungsenergie",
   "energiaIonizacaoKJmol",
   "min"
  ],
  [
   "\\bschwerste\\w*|\\bhochste\\w* atommasse",
   "massaAtomica",
   "max"
  ],
  [
   "\\bniedrigste\\w* atommasse|\\bleichteste\\w* atom",
   "massaAtomica",
   "min"
  ]
 ],
 "propriedades": {
  "numeroAtomico": [
   "ordnungszahl",
   "atomnummer",
   "kernladungszahl",
   "z"
  ],
  "massaAtomica": [
   "atommasse",
   "atomgewicht",
   "masse des atoms",
   "relative atommasse"
  ],
  "simbolo": [
   "symbol",
   "elementsymbol"
  ],
  "grupo": [
   "gruppe",
   "familie",
   "hauptgruppe"
  ],
  "periodo": [
   "periode"
  ],
  "bloco": [
   "block"
  ],
  "categoria": [
   "kategorie",
   "klassifizierung",
   "einteilung",
   "elementart",
   "elementklasse"
  ],
  "configuracaoEletronica": [
   "elektronenkonfiguration",
   "elektronenverteilung",
   "elektronenanordnung",
   "valenzelektronen",
   "valenzschale",
   "aussenelektronen",
   "elektronenschalen",
   "schalenbesetzung",
   "elektronen pro schale",
   "unterschalen"
  ],
  "eletronegatividade": [
   "elektronegativitat"
  ],
  "raioAtomicoPm": [
   "atomradius",
   "van der waals radius",
   "grosse des atoms",
   "atomgrosse",
   "gro e des atoms",
   "atomgro e"
  ],
  "afinidadeEletronicaKJmol": [
   "elektronenaffinitat"
  ],
  "energiaIonizacaoKJmol": [
   "ionisierungsenergie",
   "ionisationsenergie",
   "ionisierungspotential",
   "erste ionisierungsenergie"
  ],
  "pontoFusaoK": [
   "schmelzpunkt",
   "schmelztemperatur",
   "schmilzt",
   "schmelzen"
  ],
  "pontoEbulicaoK": [
   "siedepunkt",
   "siedetemperatur",
   "siedet",
   "kocht",
   "kochpunkt"
  ],
  "densidadeKgm3": [
   "dichte",
   "spezifische masse"
  ],
  "estadoPadrao": [
   "aggregatzustand",
   "physikalischer zustand",
   "standardzustand",
   "ist fest",
   "ist flussig",
   "ist gasformig",
   "ist ein gas",
   "flussig",
   "gasformig",
   "fest bei raumtemperatur",
   "flussig bei raumtemperatur",
   "gasformig bei raumtemperatur",
   "ist ein feststoff",
   "ist eine flussigkeit"
  ],
  "estadosOxidacao": [
   "oxidationsstufen",
   "oxidationszahlen",
   "oxidationsstufe",
   "oxidationszahl",
   "wertigkeit",
   "valenz"
  ],
  "descoberta": [
   "entdeckung",
   "entdeckt",
   "entdecker",
   "wer hat entdeckt",
   "wer entdeckte",
   "entdeckungsjahr",
   "wann wurde entdeckt",
   "wurde entdeckt",
   "wurden entdeckt"
  ],
  "massaMolar": [
   "molare masse",
   "molmasse",
   "molekulmasse",
   "molekulargewicht",
   "molgewicht",
   "formelmasse"
  ],
  "massaExata": [
   "exakte masse",
   "monoisotopische masse"
  ],
  "formula": [
   "formel",
   "summenformel",
   "molekulformel",
   "chemische formel"
  ],
  "cas": [
   "cas nummer",
   "cas"
  ],
  "cid": [
   "cid",
   "pubchem"
  ],
  "smiles": [
   "smiles"
  ],
  "inchiKey": [
   "inchikey",
   "inchi key"
  ],
  "nomeIupac": [
   "iupac name",
   "systematischer name",
   "iupac"
  ],
  "xlogp": [
   "xlogp",
   "logp",
   "lipophilie",
   "verteilungskoeffizient"
  ],
  "doadoresH": [
   "wasserstoffbruckendonatoren",
   "h brucken donatoren",
   "wasserstoffdonatoren"
  ],
  "aceptoresH": [
   "wasserstoffbruckenakzeptoren",
   "h brucken akzeptoren",
   "wasserstoffakzeptoren"
  ],
  "ligacoesRotaveis": [
   "drehbare bindungen",
   "rotierbare bindungen"
  ],
  "carga": [
   "elektrische ladung",
   "formalladung",
   "ladung"
  ],
  "tpsa": [
   "tpsa",
   "polare oberflache"
  ],
  "solubilidade": [
   "loslichkeit",
   "wasserloslichkeit",
   "loslichkeit in wasser",
   "wasserloslich",
   "loslich in wasser",
   "unloslich in wasser",
   "loslich",
   "unloslich",
   "wie viel lost sich",
   "lost sich in wasser",
   "lost sich"
  ],
  "pka": [
   "pka",
   "pks",
   "pka-wert",
   "pka wert",
   "pks-wert",
   "pks wert",
   "saurekonstante",
   "sauredissoziationskonstante",
   "aciditatskonstante"
  ],
  "entalpiaFormacaoKJmol": [
   "standardbildungsenthalpie",
   "bildungsenthalpie",
   "bildungswarme"
  ],
  "energiaGibbsFormacaoKJmol": [
   "freie standardbildungsenthalpie",
   "freie bildungsenthalpie",
   "gibbs-energie der bildung",
   "gibbs energie der bildung",
   "freie standardbildungsenergie",
   "freie bildungsenergie",
   "gibbs-bildungsenergie",
   "freie enthalpie der bildung"
  ],
  "entropiaPadraoJmolK": [
   "molare standardentropie",
   "standardentropie",
   "absolute entropie",
   "molare entropie",
   "entropie von",
   "entropie des",
   "entropie der"
  ],
  "particulas": [
   "subatomare teilchen",
   "anzahl der protonen",
   "anzahl der neutronen",
   "anzahl der elektronen",
   "protonenzahl",
   "neutronenzahl",
   "elektronenzahl",
   "massenzahl",
   "nukleonenzahl",
   "protonen",
   "proton",
   "neutronen",
   "neutron",
   "elektronen",
   "elektron"
  ]
 },
 "rotulosPropriedadeNormalizados": true,
 "stopwordsBusca": [
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "ein",
  "eine",
  "einer",
  "eines",
  "von",
  "und",
  "oder",
  "dass",
  "in",
  "im",
  "an",
  "auf",
  "zu",
  "fur",
  "mit",
  "was",
  "welche",
  "welcher",
  "wie",
  "ist",
  "sind",
  "sein",
  "bedeutet",
  "heisst",
  "erklar",
  "erklare",
  "definiere",
  "begriff",
  "konzept",
  "warum",
  "wieso",
  "mir",
  "funktioniert",
  "es",
  "bitte"
 ],
 "stopPalavras": [
  "von",
  "des",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "und",
  "oder",
  "ein",
  "eine",
  "einer",
  "in",
  "im",
  "an",
  "zu",
  "fur",
  "mit",
  "ist",
  "es"
 ],
 "palavrasFuncionais": [
  "uber",
  "zwischen",
  "wie",
  "wo",
  "wann",
  "welche",
  "welcher",
  "welches",
  "mehr",
  "weniger",
  "viel",
  "wenig",
  "alles",
  "nichts",
  "auch",
  "weil",
  "dann",
  "also",
  "noch",
  "nach",
  "vor",
  "jetzt",
  "immer",
  "nie",
  "sei",
  "war",
  "sein",
  "sind",
  "bin",
  "hat",
  "haben",
  "sag",
  "sage",
  "zeig",
  "zeige",
  "erklar",
  "erklare",
  "chemie",
  "bitte",
  "mochte",
  "wollte",
  "konnte",
  "kann",
  "will",
  "brauche",
  "quellen",
  "quelle",
  "daten",
  "hilfe",
  "lizenz",
  "lizenzen",
  "information",
  "informationen",
  "version",
  "referenz",
  "referenzen",
  "offline",
  "gratis",
  "kostenlos",
  "gib",
  "finde",
  "weiss",
  "denke",
  "einige",
  "dort",
  "hier",
  "nur",
  "sehr",
  "meist",
  "viele",
  "andere",
  "gleiche",
  "als",
  "sie",
  "ihr",
  "mein",
  "unser",
  "einheit",
  "einheiten",
  "wert",
  "punkt",
  "name",
  "masse",
  "molar",
  "zustand"
 ],
 "simbolosAmbiguos": [
  "Na",
  "No",
  "Os",
  "As",
  "Se",
  "Ar",
  "Si",
  "In",
  "At",
  "Be",
  "Am",
  "Ta",
  "Re",
  "Ge",
  "Pa",
  "Mo",
  "Ho",
  "Er",
  "Ra",
  "Ca",
  "Co",
  "Ir",
  "La",
  "Li",
  "Lu",
  "Mi",
  "Y",
  "Es",
  "Al",
  "Ni",
  "Te",
  "Du",
  "Zu",
  "Ob",
  "Es",
  "He",
  "Sb"
 ],
 "naoFormulas": [
  "OK",
  "SOS",
  "PH",
  "HOHO",
  "IN",
  "AS",
  "BIS",
  "PIS",
  "SP",
  "CIP",
  "OH",
  "NO",
  "WO",
  "SAL"
 ],
 "seguranca": {
  "acao": [
   "richt\\w* .{0,60}\\bein\\b",
   "aufzureinig\\w*",
   "anzufertig\\w*",
   "zusammenzubau\\w*",
   "zuzubereit\\w*",
   "herzustell\\w*",
   "herstell(?:en|e|st|t|ung|ungs\\w*)\\b",
   "mach(?:en|e|t|st)",
   "gemacht",
   "produzier\\w*",
   "produktion",
   "fabrizier\\w*",
   "fertig(?:en|e|t)",
   "anfertig\\w*",
   "zubereit\\w*",
   "synthetisier\\w*",
   "synthese",
   "synthetisch herstell\\w*",
   "beschaff\\w*",
   "besorg\\w*",
   "erwerb\\w*",
   "erlang\\w*",
   "bekomm\\w*",
   "kriege?n?",
   "kauf\\w*",
   "verkauf\\w*",
   "handel(?:n)? mit",
   "schmuggel\\w*",
   "umleit\\w*",
   "umgeh\\w*",
   "versteck\\w*",
   "verberg\\w*",
   "verheimlich\\w*",
   "extrahier\\w*",
   "extraktion",
   "gewinn(?:en|e|t|ung)",
   "koch(?:en|e|t)",
   "bau(?:en|e|t|st)",
   "zusammenbau\\w*",
   "zusammensetz(?:en|e|t|st)\\b",
   "konstruier\\w*",
   "erschaff\\w*",
   "erzeug\\w*",
   "generier\\w*",
   "reinig\\w*",
   "aufreinig\\w*",
   "raffinier\\w*",
   "kristallisier\\w*",
   "destillier\\w*",
   "hochskalier\\w*",
   "skalier\\w*",
   "im gro(?:ss| )en ma(?:ss| )stab",
   "gro(?:ss| )technisch",
   "(?:die |den )?(?:produktion|ausbeute|reinheit|wirkung|menge) (?:erhoh|steiger|verbesser)\\w*",
   "rezept",
   "schritt fur schritt",
   "anleitung",
   "tutorial",
   "anweisung\\w*",
   "bring\\w* mir .{1,20} bei",
   "synthese(?:weg|route)",
   "syntheseroute",
   "verfahren (?:zur|fur|um)",
   "protokoll (?:zur|fur|um)",
   "wie (?:kann (?:ich|man) |macht man |stellt man |produziert man |synthetisiert man |baut man |kocht man |gewinnt man |bekommt man )?(?:herstell\\w*|mach\\w*|produzier\\w*|synthetisier\\w*|bau\\w*|koch\\w*|gewinn\\w*|bekomm\\w*)",
   "menge (?:an|von) .{1,40} (?:um|zum|zur) .{0,20}(?:herstell|produzier|mach)\\w*",
   "welche (?:reagenzien|chemikalien|zutaten|stoffe)",
   "was brauche ich (?:um|fur|zum|zur)",
   "zutaten fur",
   "materialien (?:fur|um|zum)",
   "stell\\w* .{0,60}\\bher\\b",
   "bau\\w* .{0,60}\\bzusammen\\b",
   "kauf\\w* .{0,60}\\bein\\b",
   "fertig\\w* .{0,60}\\ban\\b",
   "bereit\\w* .{0,60}\\bzu\\b",
   "ruhr\\w* .{0,60}\\ban\\b",
   "misch\\w* .{0,60}\\ban\\b",
   "gewinn\\w* .{0,60}\\baus\\b",
   "baste\\w*",
   "selber (?:bauen|machen|herstellen)",
   "selbst (?:bauen|machen|herstellen)"
  ],
  "contextoSeguro": [
   "entsorg\\w*",
   "neutralisier\\w*",
   "lager\\w*",
   "aufbewahr\\w*",
   "handhab\\w*",
   "umgang",
   "umgeh(?:en|e|t) mit",
   "erste hilfe",
   "psa",
   "verschutt\\w*",
   "auslauf\\w*",
   "leck\\w*",
   "spritzer",
   "einatm\\w*",
   "inhalier\\w*",
   "verschluck\\w*",
   "verbrenn\\w*",
   "verbrennung\\w*",
   "vergiftung (?:durch|mit)",
   "erstversorgung",
   "schutzausrustung",
   "personlicher schutz",
   "handschuhe",
   "schutzbrille",
   "maske",
   "atemschutz",
   "was tun (?:wenn|bei|im fall)",
   "was (?:soll|kann|muss) (?:ich|man) (?:tun|machen) (?:wenn|bei|im fall)",
   "im fall(?:e)? (?:von|eines|einer)",
   "sicherheitsdatenblatt",
   "sdb",
   "msds",
   "icsc",
   "recycl\\w*",
   "wiederverwert\\w*"
  ],
  "tirarFazerSeguro": "\\b(?:was (?:soll|kann|muss|sollte|konnte) (?:ich|man|wir) (?:tun|machen) (?:wenn|bei|im fall|nach|mit|falls)|(?:die |eine |den )?(?:entsorgung|reinigung|neutralisation|lagerung|transport|handhabung|verdunnung|erste hilfe) (?:machen|durchfuhren|vornehmen))\\b",
  "alvoExplosivos": [
   "explosiv\\w*",
   "sprengstoff\\w*",
   "dynamit",
   "tnt",
   "trinitrotoluol",
   "nitroglycerin",
   "nitroglyzerin",
   "c ?4 sprengstoff",
   "c-4",
   "rdx",
   "hmx",
   "petn",
   "hmtd",
   "tatp",
   "acetonperoxid",
   "triacetontriperoxid",
   "(?:blei|natrium)azid",
   "fulminat\\w*",
   "knallquecksilber",
   "anfo",
   "pikrat\\w*",
   "pikrinsaure",
   "tetryl",
   "schwarzpulver",
   "schie(?:ss| )pulver",
   "rauchloses pulver",
   "ammoniumnitrat (?:mit|und|\\+|plus) (?:diesel|ol|treibstoff|benzin)",
   "(?:selbstgebaute|selbstgemachte|improvisierte|chemische|brand|rauch|rohr|nagel|zeit|auto|dunger|schnellkochtopf)bombe\\w*",
   "rohrbombe\\w*",
   "molotow(?:cocktail)?\\w*",
   "molotov",
   "napalm",
   "granate\\w*",
   "sprengsatz\\w*",
   "sprengvorrichtung\\w*",
   "usbv",
   "ied",
   "zunder",
   "detonator\\w*",
   "bombenzunder",
   "(?:selbstgemachte\\w* |selbstgebaute\\w* )?feuerwerk\\w*",
   "thermit",
   "brandsatz\\w*",
   "brandbeschleuniger",
   "atombombe",
   "kernwaffe",
   "schmutzige bombe",
   "explosivo",
   "dinamite",
   "polvora",
   "gunpowder"
  ],
  "fazerBomba": "\\b(?:bau(?:en|e|t|st)|herstell\\w*|mach(?:en|e|t|st)|zusammenbau\\w*|konstruier\\w*|erschaff\\w*|produzier\\w*|bast(?:le|elt|eln|elst)|basteln?)\\s+(?:(?!bomb)\\w+\\s+){0,5}?(?:eine?\\s+|einen\\s+|die\\s+|an?\\s+|uma?\\s+)?(?:(?:selbst\\w*|hausgemacht\\w*|improvisiert\\w*)\\s+)?(?:bombe|bomb|bomba)n?\\b(?!\\s+(?:kalorimeter|drohung|fur (?:wasser|warme|vakuum|insulin|treibstoff|luft)))|\\b(?:make|build|fazer)\\s+(?:eine?\\s+|einen\\s+|die\\s+|an?\\s+|uma?\\s+)?(?:bombe|bomb|bomba)n?\\b(?!\\s+(?:kalorimeter|drohung|fur (?:wasser|warme|vakuum|insulin|treibstoff|luft)))|\\b(?:bombe|bomb|bomba)n?\\s+(?:(?!bomb)\\w+\\s+){0,3}?(?:selber |selbst )?(?:bauen|basteln|herstellen|machen|zusammenbauen|produzieren|konstruieren|zubereiten)\\b|\\b(?:bau|herstellung|konstruktion|zusammenbau)\\s+(?:von |einer |eines |der |ein )?(?:(?:selbst\\w*|hausgemacht\\w*|improvisiert\\w*)\\s+)?bomben?\\b",
  "alvoArmas": [
   "sarin",
   "soman",
   "tabun",
   "vx",
   "nervengas\\w*",
   "nervenkampfstoff\\w*",
   "chemische\\w* waffe\\w*",
   "chemische\\w* kampfstoff\\w*",
   "c waffe\\w*",
   "kampfgas\\w*",
   "giftgas\\w*",
   "senfgas",
   "schwefelsenf",
   "stickstoffsenf",
   "lost",
   "novichok",
   "nowitschok",
   "phosgen",
   "chlorpikrin",
   "lewisit",
   "(?:gift|toxische?s?|tranen|todliche?s?|kriegs|nerven|erstickende?s?) ?gase?",
   "chlorgas",
   "gasformiges chlor",
   "ricin",
   "rizin",
   "(?:wasserstoff|kalium|natrium|zyan)?cyanid\\w*",
   "zyankali",
   "blausaure",
   "cyanwasserstoff",
   "chloramin\\w*",
   "arsin",
   "arsenwasserstoff",
   "phosphin",
   "monophosphan",
   "botulinumtoxin",
   "botulinum",
   "anthrax",
   "milzbrand",
   "schwefelwasserstoff",
   "massenvernichtungswaffe\\w*",
   "biowaffe\\w*",
   "biologische\\w* waffe\\w*",
   "kohlenmonoxid (?:um|zum) .{0,10}(?:toten|verletzen|vergiften)",
   "nerve agents?",
   "chemical weapons?",
   "mustard gas",
   "arma quimica",
   "gas sarin",
   "fosgenio",
   "(?:wasserstoff|kalium|natrium)?zyanid\\w*",
   "zyanwasserstoff"
  ],
  "alvoDrogas": [
   "methamphetamin\\w*",
   "metamphetamin\\w*",
   "meth",
   "crystal meth",
   "crystal",
   "kokain",
   "koks",
   "crack(?! (?:the|a|an|this|that|open|code|codes|password|passwords|egg|eggs|nut|nuts|joke|jokes|down|in|up))",
   "freebase",
   "heroin",
   "lsd",
   "lysergsaure",
   "mdma",
   "ecstasy",
   "molly",
   "fentanyl\\w*",
   "carfentanil",
   "pcp",
   "phencyclidin",
   "ketamin",
   "dmt",
   "dimethyltryptamin",
   "mescalin",
   "psilocybin",
   "zauberpilze?",
   "magic mushrooms?",
   "amphetamin\\w*",
   "speed(?! of| limit| up| test| camera| boat| record| reading)",
   "pep",
   "ghb",
   "gbl",
   "liquid ecstasy",
   "oxycodon",
   "opium",
   "marihuana",
   "marijuana",
   "cannabis",
   "haschisch",
   "hasch",
   "gras",
   "thc",
   "synthetische\\w* cannabinoid\\w*",
   "spice(?! ?(?:rack|racks|mix|mixes|blend|blends|cabinet|jar|jars|girls))",
   "badesalz\\w*",
   "synthetische\\w* cathinon\\w*",
   "synthetische\\w* drogen?",
   "(?:illegale|verbotene) drogen?",
   "betaubungsmittel",
   "rauschgift",
   "rauschmittel",
   "drogenlabor\\w*",
   "drogenkuche",
   "methlabor",
   "methamphetamine",
   "cocaine",
   "metanfetamina",
   "cocaina",
   "heroina"
  ],
  "precursoresNomes": [
   "ephedrin",
   "pseudoephedrin",
   "norephedrin",
   "safrol",
   "isosafrol",
   "piperonal",
   "phenylaceton",
   "p2p",
   "phenyl-?2-?propanon",
   "phenylessigsaure",
   "essigsaureanhydrid",
   "acetanhydrid",
   "ergotamin",
   "ergometrin",
   "anthranilsaure",
   "n-?acetylanthranilsaure",
   "lysergsaure",
   "(?:drogen|grundstoff|chemische|kontrollierte|uberwachte) ?(?:vorlaufer|precursor|ausgangsstoff)\\w*",
   "vorlauferstoff\\w*",
   "vorlaufersubstanz\\w*",
   "roter phosphor",
   "rotes iod",
   "iod und roter phosphor",
   "roten? phosphor",
   "rotem iod"
  ],
  "precursoresAcao": "\\b(?:extrahier\\w*|gewinn\\w*|beschaff\\w*|besorg\\w*|kauf\\w*|erwerb\\w*|bekomm\\w*|komm\\w* .{0,30}\\ban\\b|ranzukomm\\w*|umleit\\w*|ohne (?:rezept|lizenz|genehmigung|erlaubnis)|umgeh\\w*|verkauf\\w*|handel\\w*|schmuggel\\w*|versteck\\w*|verberg\\w*|synthese|synthetisier\\w*)\\b",
  "alvoDano": [
   "(?:jemanden|eine person|menschen|leute|meinen|meine|mein|den|die|das|ihn|sie|einen hund|eine katze|ein tier|tiere|kinder|ein kind|nachbar\\w*|kolleg\\w*|lehrer\\w*|chef\\w*|mann|frau|freund\\w*|ex|partner\\w*) (?:vergift\\w*|tot\\w*|umbring\\w*|verletz\\w*|schaden)",
   "vergift\\w* (?:jemanden|eine person|menschen|leute|meinen|meine|mein|den|die|das|ihn|sie|einen hund|eine katze|ein tier|tiere|kinder|ein kind)",
   "ermord\\w*",
   "mord",
   "umbring\\w*",
   "absichtlich (?:vergift|betaub)\\w*",
   "(?:unauffindbare\\w*|nicht nachweisbare\\w*|spurlose\\w*|todliche\\w*|selbstgemachte\\w*) gift\\w*",
   "gift(?:,)? das keine spuren hinterlasst",
   "todliche dosis (?:um|zum) .{0,10}(?:toten|umbringen)",
   "(?:jemanden|eine person) mit (?:saure|chemikalien) (?:verbrenn|verletz|angreif)\\w*",
   "saure (?:auf|ins gesicht|in die augen) (?:werfen|schutten|kippen|spritzen)",
   "saureangriff",
   "(?:jemanden|eine person|menschen) (?:angreif|attackier)\\w* mit",
   "envenenar alguem",
   "matar alguem",
   "kill someone",
   "poison someone",
   "vergift(?:e|en|et|st) (?:ich |man |wir |du )?(?:jemanden|eine person|menschen|leute|meinen|meine|mein|den|die|das|ihn|einen hund|eine katze|ein tier|tiere|kinder|ein kind|nachbar\\w*|kolleg\\w*|lehrer\\w*|chef\\w*|mann|frau|freund\\w*|ex|partner\\w*)\\b",
   "bring(?:e|en|t|st) (?:ich |man |wir |du )?(?:jemanden|eine person|menschen|leute|meinen \\w+|meine \\w+|mein \\w+|ihn|sie) um\\b",
   "(?:jemanden|jemand|eine person|einen menschen|menschen|leute|mensch|ihn|sie|nachbar\\w*|kolleg\\w*|lehrer\\w*|chef\\w*|mann|frau|freund\\w*|partner\\w*|hund|katze|kind\\w*|baby|eltern|mutter|vater) (?:\\w+ ){0,5}tot(?:en|e)\\b",
   "\\btot(?:e|en|et) (?:ich |man |wir |du )?(?:jemanden|eine person|einen menschen|menschen|leute|meinen \\w+|meine \\w+|mein \\w+|ihn|sie)\\b"
  ],
  "alvoAutolesao": [
   "mich (?:selbst )?(?:toten|umbringen|vergiften|verletzen|schneiden|ritzen)",
   "selbstmord",
   "suizid",
   "freitod",
   "mir das leben nehmen",
   "mein leben beenden",
   "ich will sterben",
   "ich mochte sterben",
   "sterben (?:ohne schmerzen|schmerzlos|ohne zu leiden)",
   "schmerzloser tod",
   "uberdosis (?:um|zum) sterben",
   "wie ?viel \\S+ (?:um|zum) (?:zu )?sterben",
   "mir (?:selbst )?(?:schaden|weh ?tun|wehtun)",
   "selbstverletz\\w*",
   "mich absichtlich vergiften",
   "me matar",
   "suicidio",
   "kill myself",
   "suicide"
  ],
  "perigososCaseiros": [
   "(?:schwefel|salpeter|salz|fluss|perchlor|pikrin|blau)saure",
   "konigswasser",
   "chlor(?: ?gas)?",
   "chlorgas",
   "cyanid\\w*",
   "zyankali",
   "blausaure",
   "arsen",
   "arsin",
   "phosphin",
   "phosgen",
   "quecksilber",
   "(?:weisser|roter) phosphor",
   "metallisches natrium",
   "natriummetall",
   "metallisches kalium",
   "kaliummetall",
   "wasserfreies ammoniak",
   "chlorat\\w*",
   "perchlorat\\w*",
   "(?:aceton|methylethylketon|benzoyl)peroxid",
   "(?:hochkonzentriertes |konzentriertes )?wasserstoffperoxid(?: \\d+ ?(?:%|prozent))?",
   "(?:konzentriertes )?(?:ammonium|kalium)nitrat",
   "kaliumpermanganat",
   "schwefelwasserstoff",
   "kohlenmonoxid",
   "(?:gift|toxische?s?|brennbare?s?|entzundliche?s?|erstickende?s?) ?gase?",
   "fluorid\\w*",
   "flusssaure",
   "gift\\w*",
   "toxin\\w*",
   "napalm",
   "thermit",
   "nitrocellulose",
   "nitrozellulose",
   "schie(?:ss| )baumwolle",
   "nitroglycerin",
   "nitroglyzerin",
   "nitriertes toluol",
   "aceton und wasserstoffperoxid",
   "bleiche und (?:ammoniak|saure|essig)",
   "chlorreiniger und (?:ammoniak|saure|essig)",
   "chlor und ammoniak",
   "natronlauge und aluminium",
   "rohrreiniger und aluminium"
  ],
  "casa": [
   "zu hause",
   "zuhause",
   "daheim",
   "selbstgemacht\\w*",
   "selbst gemacht\\w*",
   "selbstgebaut\\w*",
   "hausgemacht\\w*",
   "handgemacht\\w*",
   "improvisiert\\w*",
   "in (?:der|meiner) kuche",
   "im (?:garten|hinterhof|keller|bad|badezimmer|wohnzimmer|schlafzimmer|zimmer)",
   "in der (?:garage|wohnung|wg)",
   "mit (?:haushalts|haushalt|reinigungs|putz|supermarkt|drogerie|apotheken|baumarkt)(?:mitteln|produkten|chemikalien|artikeln|sachen|zutaten)",
   "ohne labor",
   "selber machen",
   "selbst machen",
   "diy",
   "mit (?:einfachen|leicht erhaltlichen|haushaltsublichen|gewohnlichen|alltaglichen) (?:materialien|mitteln|zutaten|chemikalien|sachen)",
   "nur mit (?:haushalts|reinigungs|putz)(?:mitteln|produkten)",
   "em casa",
   "caseiro",
   "at home",
   "homemade"
  ],
  "coladaAlvos": {
   "EXPLOSIVOS": [
    "sprengstof",
    "explosiv",
    "nitroglycerin",
    "nitroglyzerin",
    "dynamit",
    "trinitrotoluol",
    "acetonperoxid",
    "molotow",
    "molotov",
    "napalm",
    "rohrbombe",
    "selbstgebautebombe",
    "schwarzpulver",
    "zunder",
    "detonator",
    "fulminat",
    "tatp",
    "hmtd",
    "explosivo"
   ],
   "ARMAS_QUIMICAS": [
    "sarin",
    "novichok",
    "nowitschok",
    "senfgas",
    "nervengas",
    "nervenkampfstof",
    "chemischewafe",
    "phosgen",
    "ricin",
    "rizin",
    "giftgas",
    "cyanid",
    "zyankali",
    "blausaure",
    "chloramin",
    "chlorgas",
    "armaquimica",
    "zyanid"
   ],
   "DROGAS": [
    "methamphetamin",
    "metamphetamin",
    "kokain",
    "heroin",
    "fentanyl",
    "ecstasy",
    "mdma",
    "amphetamin",
    "synthetischedrogen",
    "crystalmeth",
    "lsd",
    "ketamin",
    "metanfetamina",
    "cocaina"
   ],
   "PRECURSORES": [
    "pseudoephedrin",
    "ephedrin",
    "safrol",
    "phenylaceton",
    "esigsaureanhydrid",
    "vorlaufer",
    "precursor",
    "pseudoefedrina"
   ]
  },
  "coladaAcoes": [
   "synthese",
   "synthetisieren",
   "herstelen",
   "herstelung",
   "machen",
   "produzieren",
   "zubereiten",
   "reinigen",
   "aufreinigen",
   "rafinieren",
   "kochen",
   "extrahieren",
   "gewinen",
   "wiemachtman",
   "wiestelt",
   "rezept",
   "anleitung",
   "schritfurschrit",
   "bauen",
   "zusamenbauen",
   "beschafen",
   "kaufen",
   "hochskalieren"
  ]
 }
};
