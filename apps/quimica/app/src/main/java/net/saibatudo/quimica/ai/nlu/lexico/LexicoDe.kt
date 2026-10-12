// gerado — não editar. Fonte: contracts/lexico/de.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxico bruto de de (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */
internal object LexicoDe {
    fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "idioma" to "de",
        "versao" to 1,
        "descricao" to "Deutsches Lexikon des lokalen regelbasierten Interpreters (NLU) und der Sicherheitsregeln. Gleiche Struktur wie pt-BR.json (per Test geprüft). Regexes als TEXT ohne Flags: der Client normalisiert die Frage (Kleinbuchstaben, ohne Akzente/Umlaute: ä→a, ö→o, ü→u, ß bleibt; nur [a-z0-9+-] und Leerzeichen). Erste Übersetzung durch Agent (menschliche Prüfung ausstehend).",
        "intencoes" to n_intencoes(),
        "pistas" to n_pistas(),
        "nivel" to n_nivel(),
        "unidades" to n_unidades(),
        "categorias" to n_categorias(),
        "estados" to n_estados(),
        "extremos" to n_extremos(),
        "propriedades" to n_propriedades(),
        "rotulosPropriedadeNormalizados" to true,
        "stopwordsBusca" to n_stopwordsBusca(),
        "stopPalavras" to n_stopPalavras(),
        "palavrasFuncionais" to n_palavrasFuncionais(),
        "simbolosAmbiguos" to n_simbolosAmbiguos(),
        "naoFormulas" to n_naoFormulas(),
        "seguranca" to n_seguranca()
    )

    private fun n_intencoes(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "saudacao" to "^(hi+|hallo+|hey|moin|servus|guten morgen|gru(?:ss| )(?:dich|gott|euch)|guten tag|guten abend|danke|vielen danke|dankeschon|hilfe|help|menu|start|startseite|test|teste)( zusammen| alle| schon| sehr| dir| euch| assistent| ki| freund| wie gehts| alles gut)*\$",
        "ajuda" to "\\b(?:was (?:kannst du|machst du|wei(?:ss| )t du|kann (?:die|diese) app|macht (?:die|diese) app|kann die ki)|wie (?:benutze|nutze|verwende) ich (?:die|diese) (?:app|anwendung|assistent)|wie funktioniert (?:die|diese|das) (?:app|anwendung|assistent)?|was kann ich fragen|ich brauche hilfe|wer hat (?:die|diese) app (?:gemacht|erstellt|entwickelt))\\b",
        "sobreDados" to "\\b(?:uber die daten|woher (?:kommen|stammen) die daten|herkunft der daten|datenquelle|aktualisierung der daten|sind die daten aktuell|datenversion|wann wurden die daten aktualisiert|signatur der daten)\\b",
        "fontes" to "\\b(?:welche (?:quellen|lizenzen)|was sind die quellen|lizenzen? der daten|was ist die quelle|quellen? (?:der |dieser )?(?:information|antwort(?:en)?)|woher (?:hast du|kommt|stammt) (?:diese|die) (?:information|antwort)|referenzen?|literatur)\\b",
        "balancear" to "\\bausgleich\\w*|\\bausbalancier\\w*|\\bbalancier\\w*|\\breaktionsgleichung (?:aufstellen|ausgleichen)|\\bgleichung (?:ausgleichen|aufstellen)|\\bkoeffizienten (?:bestimmen|anpassen)|\\bstochiometrisch\\w* koeffizient\\w*|\\bgleich(?:e|en|st|t)? .{1,60}\\baus\\b|\\bstell\\w* .{0,30}gleichung\\w* auf\\b|\\bgleichung\\w* aufstell\\w*",
        "conversao" to "\\b(?:umrechn\\w*|umwandl\\w*|konvertier\\w*|rechn(?:e|en|et) .{1,40} um|wandl\\w* .{1,40} um|stell\\w* .{1,40} um|entspricht|entsprechen|wie ?viele? \\S+(?: \\S+)? (?:sind|hat|haben|entsprechen|ergeben|passen)|in wie ?viele?)\\b",
        "ph" to "\\b(?:ph|poh)\\b|\\bph wert\\b|\\bsaure(?:grad|starke) von\\b|\\bbasizitat\\b|\\balkalitat\\b",
        "gas" to "\\b(?:ideale?s? gase?|perfektes gas|pv ?= ?nrt|pvnrt|gasgesetz\\w*|allgemeine gasgleichung|ideale gasgleichung|zustandsgleichung|clapeyron|molvolumen|molares volumen|volumen (?:eines|des) gases|druck (?:eines|des) gases|boyle mariotte|gesetz von boyle|gesetz von charles|gay lussac)\\b",
        "gasVariavel" to "\\bgase?s?\\b",
        "concentracao" to "\\b(?:molaritat|konzentration|konzentriert\\w*|verdunn\\w*|c1 ?v1|c1v1|massenanteil|massenprozent|gewichtsprozent|prozent (?:der )?masse|teile pro million|ppm|normalitat|molalitat|losung (?:von|aus)|gramm pro liter|mol l|mol pro liter|g l)\\b",
        "estequiometria" to "\\b(?:stochiometri\\w*|limitierend\\w* (?:reagenz|reaktant|edukt)|begrenzend\\w* (?:reagenz|reaktant)|im uberschuss|uberschuss|ausbeute|wie ?viele? (?:mol|molekule|atome|ionen|teilchen)\\b|wie ?viele? (?:gramm|liter|kilo|kilogramm|mg|milligramm)\\b(?!\\s+(?:sind|ist|entsprechen|entspricht|ergeben|hat|haben)\\s+\\d+(?: \\d+)* ?(?:kg|g|mg|l|ml|liter|milliliter|gramm|kilogramm|milligramm)\\b)|anzahl (?:der |an )?(?:mol|molekule|atome|teilchen|ionen)|normbedingungen|standardbedingungen|eingenommenes volumen|avogadro(?:konstante|zahl)|avogadro'?sche (?:zahl|konstante))\\b",
        "massaMolar" to "\\b(?:molare masse|molmasse|molekulmasse|molekulargewicht|molekulare masse|formelmasse|molgewicht|wie ?viel wiegt (?:ein )?mol|wie ?viel wiegen (?:ein|1) mol|wie schwer (?:ist|sind) (?:ein|1) mol|wie gro(?:ss| ) ist (?:die )?molare masse|was ist die molare masse)\\b|\\bg mol\\b",
        "desenhar" to "\\b(?:zeichn\\w+|struktur (?:2d|molekular|chemisch\\w*|von|des|der)|2d struktur|struktur|zeig\\w* (?:mir )?(?:die )?(?:struktur|molekul)|molekul (?:von|des|der)|wie sieht (?:das |die )?(?:molekul|struktur) (?:von \\S+ )?aus|strukturformel|molekulgeometrie|visualisier\\w*|gerust|skizz\\w+)\\b",
        "comparar" to "\\b(?:vergleich\\w*|unterscheid\\w*|unterschied(?:e)? zwischen|\\bversus\\b|\\bvs\\b|was ist der unterschied|ahnlichkeit\\w*|gleich wie|(?:was|welches|welcher|welche) (?:element |stoff |verbindung |von beiden )?(?:ist|hat|sind) (?:schwerer|leichter|dichter|gro(?:ss| )er|kleiner|hoher|niedriger|starker|schwacher|elektronegativer|reaktiver)|ahnlich wie|gemeinsamkeit\\w*)\\b",
        "seguranca" to "\\b(?:gefahr\\w*|gefahrlich\\w*|giftig\\w*|toxisch\\w*|toxizitat|sicher\\w*|psa|schutzausrustung|erste hilfe|verschutt\\w*|auslauf\\w*|leck\\w*|lager\\w*|aufbewahr\\w*|brand\\w*|feuer\\w*|entzundlich\\w*|brennbar\\w*|atzend\\w*|korrosiv\\w*|reizend\\w*|reiz\\w*|ghs|piktogramm\\w*|h[- ]?satz\\w*|h[- ]?satze|gefahrenhinweis\\w*|sicherheitsdatenblatt|sdb|icsc|misch\\w*|unvertraglich\\w*|entsorg\\w*|handhab\\w*|umgang mit|einatm\\w*|verschluck\\w*|verbrenn\\w*|gift|vergift\\w*|schadlich|ist (?:es|das) sicher|ist (?:es|das) gefahrlich|neutralisier\\w*|handschuhe|schutzbrille|signalwort|gefahreneinstufung|krebserregend|karzinogen\\w*|explosiv\\w*|reagiert mit wasser|reaktiv\\w* mit)\\b",
        "nomenclatura" to "\\b(?:wie (?:hei(?:ss| )t|lautet) der name|wie hei(?:ss| )t|wie nennt man|name (?:von|des|der|fur)|chemische\\w* name|iupac name|systematische\\w* name|wissenschaftliche\\w* name|offizielle\\w* name|nomenklatur|wie schreibt man|wie lautet die (?:chemische |molekulare |summen)?formel|was ist die (?:chemische |summen)?formel|formel (?:von|des|der|fur)|summenformel|name der verbindung)\\b",
        "tabela" to "\\b(?:periodensystem|pse|periodizitat|trends?|gruppe \\d{1,2}|familie \\d{1,2}|periode \\d|block [spdf]|[spdf][- ]block|elemente? (?:der|des|aus der|aus dem|in der|in) (?:gruppe|periode|block|familie)|welche elemente|wie ?viele elemente|(?:gasformige|flussige|feste) elemente|metalle|nichtmetalle|halbmetalle|metalloide|halogene?|edelgase?|erdalkalimetalle?|alkalimetalle?|lanthanoide?|lanthanide?|actinoide?|actinide?|element mit (?:der|dem) (?:hochsten|gro(?:ss| )ten|niedrigsten|kleinsten)|aufsteigend\\w* reihenfolge|absteigend\\w* reihenfolge|(?:hochste|gro(?:ss| )te|niedrigste|kleinste)r? (?:atomradius|radius|elektronegativitat|energie|punkt|masse|dichte))\\b",
        "conceitoCue" to "^(?:was (?:ist|sind|bedeutet|hei(?:ss| )t|bedeuten)|erklar\\w*|definier\\w*|definition (?:von|des|der)|begriff|konzept|erzahl\\w* mir|wie funktioniert|wie funktionieren|warum|wieso|weshalb|wozu (?:dient|braucht man)|was ist (?:die |der )?(?:definition|unterschied|bedeutung|funktion|rolle)|unterschied zwischen|bring\\w* mir .{1,20} bei|zusammenfass\\w*|fasse .{1,30} zusammen)\\b",
        "conceitoTemas" to "\\b(?:mol|ph|stochiometrie|(?:ionen|atom|metall|kovalente|chemische) ?bindung|elektronegativitat|oxidation|reduktion|redox|chemisches gleichgewicht|enthalpie|entropie|isomerie|saure|base|salz|oxid|losung|konzentration|molaritat|verdunnung|periodensystem|chemische reaktion|kinetik|katalysator|elektrolyse|batterie|galvanische zelle|polaritat|zwischenmolekulare krafte|intermolekulare krafte)\\b"
    )

    private fun n_pistas_limparConceito(): List<Any?> = listOf<Any?>(
        "^\\s*(?:mir |uns |bitte |doch |mal |kurz |genau |eigentlich |noch |einmal )+",
        "^\\s*(?:was|wie|wer|wo)\\s+(?=\\S)",
        "^\\s*(?:ist |sind |bedeutet |hei(?:ss| )t |bedeuten )+",
        "^\\s*(?:ein |eine |einer |der |die |das |den |dem |von |des )+",
        "\\s+(?:ist|sind|bedeutet|hei(?:ss| )t|bedeuten)\$"
    )

    private fun n_pistas(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "querCalcular" to "\\b(?:limitierend\\w*|ausbeute|wie ?viele?|masse von|gramm|mol|entsteh\\w*|bild\\w*|erhalt\\w*|reagier\\w*|verbrauch\\w*|ubrig|bleib\\w*|uberschuss|volumen|liter)\\b",
        "conversaoPreposicoes" to "(?:->|→| in | zu | nach | to )",
        "paraUnidade" to "\\b(?:in|zu|nach)\\s+(?:den |die |das |dem |der )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| pro liter| quecksilbersaule)?)(?:\\s+(?:umrechnen|umwandeln|konvertieren|angeben|ausdrucken|darstellen|um|dar|an|aus))?\\s*[?!.]*\$",
        "quantosUnidade" to "^\\s*(?:wie ?viele?|wieviel)\\s+((?:grad\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:sind|hat|haben|entsprechen|ergeben|passen|ist)(?![A-Za-z])",
        "phContexto" to "\\b(?:saure|base|losung|lauge)\\b",
        "conector" to "\\b(?:von|des|der)\\b",
        "prefixoExplicacao" to "^(?:was ist|was sind|erklar|definier|definition|begriff|konzept|wie funktioniert|warum|wieso)",
        "prefixoExplicacaoPalavra" to "^(?:was ist|was sind|erklar\\w*|definier\\w*|definition|begriff|konzept|wie funktioniert|warum|wieso)\\b",
        "prefixoDefinicao" to "^(?:was ist|was sind|erklar\\w*|definier\\w*|definition|begriff|konzept)\\b(?!\\s+(?:die |der |das )?(?:molare masse|molmasse|molekulmasse|formelmasse|molgewicht|molekulargewicht)\\s+(?:von|des|der|vom)\\b)",
        "gasGrandezas" to "\\b(?:volumen|druck|temperatur|mol|wie ?viele?)\\b",
        "concentracaoForte" to "\\bverdunn\\w*|molaritat|konzentration\\b",
        "propriedadesPalavra" to "\\beigenschaften\\b",
        "mistura" to "\\b(?:misch\\w*|zusammen mit|zusammen|kombinier\\w+|gemischt|unvertraglich\\w*)\\b",
        "elementoPalavra" to "\\belemente?s?\\b",
        "gasSubstancia" to "\\bgas\\b",
        "tendencia" to "\\btrends?\\b|\\bperiodizitat|\\bander\\w* sich (?:entlang|innerhalb|in) (?:der|einer) (?:periode|gruppe)|\\b(?:entlang|innerhalb) (?:der|einer) (?:periode|gruppe)",
        "tabelaPalavra" to "\\bperiodensystem\\b",
        "grupo" to "\\b(?:gruppe|familie)\\s+(\\d{1,2})\\b",
        "periodo" to "\\bperiode\\s+(\\d)\\b",
        "bloco" to "\\bblocks?\\s+([spdf])\\b|\\b([spdf])[- ]blocks?\\b",
        "continuacao" to "^und (?:der |die |das |den |dem )?(?:von |des |der )?",
        "limparConceito" to n_pistas_limparConceito(),
        "constantes" to "\\b(pka|pkb|ka|kb)\\s*(?:=|:|von|ist|gleich|betragt)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
        "quantidadeComplemento" to "(?:pro|an)",
        "letrasUnidade" to "A-Za-zäöüß",
        "ligacaoPreposicoes" to "(?:an|von|des|der)",
        "diluicao" to "\\b(?:verdunn\\w*|c1v1|c1 v1)\\b",
        "percentualMassa" to "\\bmasse|prozent|anteil|gewicht\\b",
        "cntp" to "\\b(?:normbedingungen|standardbedingungen|volumen)\\b",
        "cueElemento" to "\\b(?:element|symbol|elementsymbol|chemisches symbol)\\b"
    )

    private fun n_nivel(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "fundamental" to "\\b(?:grundschule|kinder|kind|einfach|ganz einfach|leicht verstandlich|fur anfanger|fur laien)\\b",
        "medio" to "\\b(?:gymnasium|oberstufe|mittelstufe|abitur|realschule|schule)\\b",
        "superior" to "\\b(?:universitat|uni|hochschule|studium|fortgeschritten|vertieft|ausfuhrlich|detailliert)\\b"
    )

    private fun n_unidades_0(): List<Any?> = listOf<Any?>(
        "^grad (?:celsius|centigrad)\$|^celsius\$",
        "°C"
    )

    private fun n_unidades_1(): List<Any?> = listOf<Any?>(
        "^grad fahrenheit\$|^fahrenheit\$",
        "°F"
    )

    private fun n_unidades_2(): List<Any?> = listOf<Any?>(
        "^kelvin\$",
        "K"
    )

    private fun n_unidades_3(): List<Any?> = listOf<Any?>(
        "^atmosphare(?:n)?\$",
        "atm"
    )

    private fun n_unidades_4(): List<Any?> = listOf<Any?>(
        "^pascal\$",
        "Pa"
    )

    private fun n_unidades_5(): List<Any?> = listOf<Any?>(
        "^kilopascal\$",
        "kPa"
    )

    private fun n_unidades_6(): List<Any?> = listOf<Any?>(
        "^millimeter quecksilbersaule\$|^mm quecksilbersaule\$",
        "mmHg"
    )

    private fun n_unidades_7(): List<Any?> = listOf<Any?>(
        "^liter?n?\$",
        "L"
    )

    private fun n_unidades_8(): List<Any?> = listOf<Any?>(
        "^milliliter?n?\$",
        "mL"
    )

    private fun n_unidades_9(): List<Any?> = listOf<Any?>(
        "^mikroliter?n?\$",
        "µL"
    )

    private fun n_unidades_10(): List<Any?> = listOf<Any?>(
        "^gramm\$",
        "g"
    )

    private fun n_unidades_11(): List<Any?> = listOf<Any?>(
        "^milligramm\$",
        "mg"
    )

    private fun n_unidades_12(): List<Any?> = listOf<Any?>(
        "^kilogramm\$|^kilo\$",
        "kg"
    )

    private fun n_unidades_13(): List<Any?> = listOf<Any?>(
        "^tonnen?\$",
        "t"
    )

    private fun n_unidades_14(): List<Any?> = listOf<Any?>(
        "^mol\$",
        "mol"
    )

    private fun n_unidades_15(): List<Any?> = listOf<Any?>(
        "^millimol\$",
        "mmol"
    )

    private fun n_unidades_16(): List<Any?> = listOf<Any?>(
        "^kilomol\$",
        "kmol"
    )

    private fun n_unidades_17(): List<Any?> = listOf<Any?>(
        "^joule\$",
        "J"
    )

    private fun n_unidades_18(): List<Any?> = listOf<Any?>(
        "^kalorien?\$",
        "cal"
    )

    private fun n_unidades_19(): List<Any?> = listOf<Any?>(
        "^kilokalorien?\$",
        "kcal"
    )

    private fun n_unidades_20(): List<Any?> = listOf<Any?>(
        "^kilojoule\$",
        "kJ"
    )

    private fun n_unidades_21(): List<Any?> = listOf<Any?>(
        "^molar\$",
        "mol/L"
    )

    private fun n_unidades_22(): List<Any?> = listOf<Any?>(
        "^mol pro liter\$",
        "mol/L"
    )

    private fun n_unidades_23(): List<Any?> = listOf<Any?>(
        "^gramm pro liter\$",
        "g/L"
    )

    private fun n_unidades_24(): List<Any?> = listOf<Any?>(
        "^(?:molekule?|atome?|teilchen|ionen?|einheiten|entitaten)\$",
        "particulas"
    )

    private fun n_unidades_25(): List<Any?> = listOf<Any?>(
        "^meter?n?\$",
        "m"
    )

    private fun n_unidades_26(): List<Any?> = listOf<Any?>(
        "^zentimeter?n?\$",
        "cm"
    )

    private fun n_unidades_27(): List<Any?> = listOf<Any?>(
        "^millimeter?n?\$",
        "mm"
    )

    private fun n_unidades_28(): List<Any?> = listOf<Any?>(
        "^nanometer?n?\$",
        "nm"
    )

    private fun n_unidades_29(): List<Any?> = listOf<Any?>(
        "^kilometer?n?\$",
        "km"
    )

    private fun n_unidades_30(): List<Any?> = listOf<Any?>(
        "^prozent\$",
        "%"
    )

    private fun n_unidades_31(): List<Any?> = listOf<Any?>(
        "^bar\$",
        "bar"
    )

    private fun n_unidades_32(): List<Any?> = listOf<Any?>(
        "^torr\$",
        "mmHg"
    )

    private fun n_unidades_33(): List<Any?> = listOf<Any?>(
        "^stunden?\$",
        "h"
    )

    private fun n_unidades_34(): List<Any?> = listOf<Any?>(
        "^minuten?\$",
        "min"
    )

    private fun n_unidades_35(): List<Any?> = listOf<Any?>(
        "^sekunden?\$",
        "s"
    )

    private fun n_unidades(): List<Any?> = listOf<Any?>(
        n_unidades_0(),
        n_unidades_1(),
        n_unidades_2(),
        n_unidades_3(),
        n_unidades_4(),
        n_unidades_5(),
        n_unidades_6(),
        n_unidades_7(),
        n_unidades_8(),
        n_unidades_9(),
        n_unidades_10(),
        n_unidades_11(),
        n_unidades_12(),
        n_unidades_13(),
        n_unidades_14(),
        n_unidades_15(),
        n_unidades_16(),
        n_unidades_17(),
        n_unidades_18(),
        n_unidades_19(),
        n_unidades_20(),
        n_unidades_21(),
        n_unidades_22(),
        n_unidades_23(),
        n_unidades_24(),
        n_unidades_25(),
        n_unidades_26(),
        n_unidades_27(),
        n_unidades_28(),
        n_unidades_29(),
        n_unidades_30(),
        n_unidades_31(),
        n_unidades_32(),
        n_unidades_33(),
        n_unidades_34(),
        n_unidades_35()
    )

    private fun n_categorias_0(): List<Any?> = listOf<Any?>(
        "\\berdalkali\\w*",
        "metal_alcalino_terroso"
    )

    private fun n_categorias_1(): List<Any?> = listOf<Any?>(
        "\\balkalimetall\\w*|\\balkalien\\b",
        "metal_alcalino"
    )

    private fun n_categorias_2(): List<Any?> = listOf<Any?>(
        "\\bubergangsmetall\\w*|\\bubergangselement\\w*",
        "metal_transicao"
    )

    private fun n_categorias_3(): List<Any?> = listOf<Any?>(
        "\\bpost ?ubergangsmetall\\w*|\\bhauptgruppenmetall\\w*",
        "metal_pos_transicao"
    )

    private fun n_categorias_4(): List<Any?> = listOf<Any?>(
        "\\bhalbmetall\\w*|\\bmetalloid\\w*",
        "semimetal"
    )

    private fun n_categorias_5(): List<Any?> = listOf<Any?>(
        "\\bnichtmetall\\w*",
        "nao_metal"
    )

    private fun n_categorias_6(): List<Any?> = listOf<Any?>(
        "\\bhalogene?s?\\b",
        "halogenio"
    )

    private fun n_categorias_7(): List<Any?> = listOf<Any?>(
        "\\bedelgase?s?\\b|\\bedle gase\\b",
        "gas_nobre"
    )

    private fun n_categorias_8(): List<Any?> = listOf<Any?>(
        "\\blanthanoide?n?\\b|\\blanthanide?n?\\b|\\bseltene erden",
        "lantanideo"
    )

    private fun n_categorias_9(): List<Any?> = listOf<Any?>(
        "\\bactinoide?n?\\b|\\bactinide?n?\\b|\\baktinoide?n?\\b",
        "actinideo"
    )

    private fun n_categorias_10(): List<Any?> = listOf<Any?>(
        "\\bmetalle\\b|\\bmetall\\b",
        "metal"
    )

    private fun n_categorias(): List<Any?> = listOf<Any?>(
        n_categorias_0(),
        n_categorias_1(),
        n_categorias_2(),
        n_categorias_3(),
        n_categorias_4(),
        n_categorias_5(),
        n_categorias_6(),
        n_categorias_7(),
        n_categorias_8(),
        n_categorias_9(),
        n_categorias_10()
    )

    private fun n_estados_0(): List<Any?> = listOf<Any?>(
        "\\b(?:gasformige?s?|gase|im gasformigen zustand)\\b",
        "gas"
    )

    private fun n_estados_1(): List<Any?> = listOf<Any?>(
        "\\bflussige?s?\\b",
        "liquido"
    )

    private fun n_estados_2(): List<Any?> = listOf<Any?>(
        "\\bfeste?s?\\b|\\bfeststoffe?\\b",
        "solido"
    )

    private fun n_estados(): List<Any?> = listOf<Any?>(
        n_estados_0(),
        n_estados_1(),
        n_estados_2()
    )

    private fun n_extremos_0(): List<Any?> = listOf<Any?>(
        "\\bam (?:starksten )?elektronegativ\\w*|\\bhochste elektronegativitat|\\belektronegativste\\w*",
        "eletronegatividade",
        "max"
    )

    private fun n_extremos_1(): List<Any?> = listOf<Any?>(
        "\\bam wenigsten elektronegativ\\w*|\\bniedrigste elektronegativitat",
        "eletronegatividade",
        "min"
    )

    private fun n_extremos_2(): List<Any?> = listOf<Any?>(
        "\\bdichteste\\w*|\\bam dichtesten|\\bhochste dichte",
        "densidadeKgm3",
        "max"
    )

    private fun n_extremos_3(): List<Any?> = listOf<Any?>(
        "\\bam wenigsten dicht|\\bniedrigste dichte|\\bleichteste\\w*",
        "densidadeKgm3",
        "min"
    )

    private fun n_extremos_4(): List<Any?> = listOf<Any?>(
        "\\bgro(?:ss| )te\\w* (?:atom)?radius|\\bam gro(?:ss| )ten|\\bvoluminoseste\\w*",
        "raioAtomicoPm",
        "max"
    )

    private fun n_extremos_5(): List<Any?> = listOf<Any?>(
        "\\bkleinste\\w* (?:atom)?radius",
        "raioAtomicoPm",
        "min"
    )

    private fun n_extremos_6(): List<Any?> = listOf<Any?>(
        "\\bhochste\\w* schmelzpunkt",
        "pontoFusaoK",
        "max"
    )

    private fun n_extremos_7(): List<Any?> = listOf<Any?>(
        "\\bniedrigste\\w* schmelzpunkt",
        "pontoFusaoK",
        "min"
    )

    private fun n_extremos_8(): List<Any?> = listOf<Any?>(
        "\\bhochste\\w* siedepunkt",
        "pontoEbulicaoK",
        "max"
    )

    private fun n_extremos_9(): List<Any?> = listOf<Any?>(
        "\\bniedrigste\\w* siedepunkt",
        "pontoEbulicaoK",
        "min"
    )

    private fun n_extremos_10(): List<Any?> = listOf<Any?>(
        "\\bhochste\\w* ionisierungsenergie",
        "energiaIonizacaoKJmol",
        "max"
    )

    private fun n_extremos_11(): List<Any?> = listOf<Any?>(
        "\\bniedrigste\\w* ionisierungsenergie",
        "energiaIonizacaoKJmol",
        "min"
    )

    private fun n_extremos_12(): List<Any?> = listOf<Any?>(
        "\\bschwerste\\w*|\\bhochste\\w* atommasse",
        "massaAtomica",
        "max"
    )

    private fun n_extremos_13(): List<Any?> = listOf<Any?>(
        "\\bniedrigste\\w* atommasse|\\bleichteste\\w* atom",
        "massaAtomica",
        "min"
    )

    private fun n_extremos(): List<Any?> = listOf<Any?>(
        n_extremos_0(),
        n_extremos_1(),
        n_extremos_2(),
        n_extremos_3(),
        n_extremos_4(),
        n_extremos_5(),
        n_extremos_6(),
        n_extremos_7(),
        n_extremos_8(),
        n_extremos_9(),
        n_extremos_10(),
        n_extremos_11(),
        n_extremos_12(),
        n_extremos_13()
    )

    private fun n_propriedades_numeroAtomico(): List<Any?> = listOf<Any?>(
        "ordnungszahl",
        "atomnummer",
        "kernladungszahl",
        "z"
    )

    private fun n_propriedades_massaAtomica(): List<Any?> = listOf<Any?>(
        "atommasse",
        "atomgewicht",
        "masse des atoms",
        "relative atommasse"
    )

    private fun n_propriedades_simbolo(): List<Any?> = listOf<Any?>(
        "symbol",
        "elementsymbol"
    )

    private fun n_propriedades_grupo(): List<Any?> = listOf<Any?>(
        "gruppe",
        "familie",
        "hauptgruppe"
    )

    private fun n_propriedades_periodo(): List<Any?> = listOf<Any?>(
        "periode"
    )

    private fun n_propriedades_bloco(): List<Any?> = listOf<Any?>(
        "block"
    )

    private fun n_propriedades_categoria(): List<Any?> = listOf<Any?>(
        "kategorie",
        "klassifizierung",
        "einteilung",
        "elementart",
        "elementklasse"
    )

    private fun n_propriedades_configuracaoEletronica(): List<Any?> = listOf<Any?>(
        "elektronenkonfiguration",
        "elektronenverteilung",
        "elektronenanordnung"
    )

    private fun n_propriedades_eletronegatividade(): List<Any?> = listOf<Any?>(
        "elektronegativitat"
    )

    private fun n_propriedades_raioAtomicoPm(): List<Any?> = listOf<Any?>(
        "atomradius",
        "van der waals radius",
        "grosse des atoms",
        "atomgrosse",
        "gro e des atoms",
        "atomgro e"
    )

    private fun n_propriedades_afinidadeEletronicaKJmol(): List<Any?> = listOf<Any?>(
        "elektronenaffinitat"
    )

    private fun n_propriedades_energiaIonizacaoKJmol(): List<Any?> = listOf<Any?>(
        "ionisierungsenergie",
        "ionisationsenergie",
        "ionisierungspotential",
        "erste ionisierungsenergie"
    )

    private fun n_propriedades_pontoFusaoK(): List<Any?> = listOf<Any?>(
        "schmelzpunkt",
        "schmelztemperatur",
        "schmilzt",
        "schmelzen"
    )

    private fun n_propriedades_pontoEbulicaoK(): List<Any?> = listOf<Any?>(
        "siedepunkt",
        "siedetemperatur",
        "siedet",
        "kocht",
        "kochpunkt"
    )

    private fun n_propriedades_densidadeKgm3(): List<Any?> = listOf<Any?>(
        "dichte",
        "spezifische masse"
    )

    private fun n_propriedades_estadoPadrao(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_propriedades_estadosOxidacao(): List<Any?> = listOf<Any?>(
        "oxidationsstufen",
        "oxidationszahlen",
        "oxidationsstufe",
        "oxidationszahl",
        "wertigkeit",
        "valenz"
    )

    private fun n_propriedades_descoberta(): List<Any?> = listOf<Any?>(
        "entdeckung",
        "entdeckt",
        "entdecker",
        "wer hat entdeckt",
        "wer entdeckte",
        "entdeckungsjahr",
        "wann wurde entdeckt",
        "wurde entdeckt",
        "wurden entdeckt"
    )

    private fun n_propriedades_massaMolar(): List<Any?> = listOf<Any?>(
        "molare masse",
        "molmasse",
        "molekulmasse",
        "molekulargewicht",
        "molgewicht",
        "formelmasse"
    )

    private fun n_propriedades_massaExata(): List<Any?> = listOf<Any?>(
        "exakte masse",
        "monoisotopische masse"
    )

    private fun n_propriedades_formula(): List<Any?> = listOf<Any?>(
        "formel",
        "summenformel",
        "molekulformel",
        "chemische formel"
    )

    private fun n_propriedades_cas(): List<Any?> = listOf<Any?>(
        "cas nummer",
        "cas"
    )

    private fun n_propriedades_cid(): List<Any?> = listOf<Any?>(
        "cid",
        "pubchem"
    )

    private fun n_propriedades_smiles(): List<Any?> = listOf<Any?>(
        "smiles"
    )

    private fun n_propriedades_inchiKey(): List<Any?> = listOf<Any?>(
        "inchikey",
        "inchi key"
    )

    private fun n_propriedades_nomeIupac(): List<Any?> = listOf<Any?>(
        "iupac name",
        "systematischer name",
        "iupac"
    )

    private fun n_propriedades_xlogp(): List<Any?> = listOf<Any?>(
        "xlogp",
        "logp",
        "lipophilie",
        "verteilungskoeffizient"
    )

    private fun n_propriedades_doadoresH(): List<Any?> = listOf<Any?>(
        "wasserstoffbruckendonatoren",
        "h brucken donatoren",
        "wasserstoffdonatoren"
    )

    private fun n_propriedades_aceptoresH(): List<Any?> = listOf<Any?>(
        "wasserstoffbruckenakzeptoren",
        "h brucken akzeptoren",
        "wasserstoffakzeptoren"
    )

    private fun n_propriedades_ligacoesRotaveis(): List<Any?> = listOf<Any?>(
        "drehbare bindungen",
        "rotierbare bindungen"
    )

    private fun n_propriedades_carga(): List<Any?> = listOf<Any?>(
        "elektrische ladung",
        "formalladung",
        "ladung"
    )

    private fun n_propriedades_tpsa(): List<Any?> = listOf<Any?>(
        "tpsa",
        "polare oberflache"
    )

    private fun n_propriedades(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "numeroAtomico" to n_propriedades_numeroAtomico(),
        "massaAtomica" to n_propriedades_massaAtomica(),
        "simbolo" to n_propriedades_simbolo(),
        "grupo" to n_propriedades_grupo(),
        "periodo" to n_propriedades_periodo(),
        "bloco" to n_propriedades_bloco(),
        "categoria" to n_propriedades_categoria(),
        "configuracaoEletronica" to n_propriedades_configuracaoEletronica(),
        "eletronegatividade" to n_propriedades_eletronegatividade(),
        "raioAtomicoPm" to n_propriedades_raioAtomicoPm(),
        "afinidadeEletronicaKJmol" to n_propriedades_afinidadeEletronicaKJmol(),
        "energiaIonizacaoKJmol" to n_propriedades_energiaIonizacaoKJmol(),
        "pontoFusaoK" to n_propriedades_pontoFusaoK(),
        "pontoEbulicaoK" to n_propriedades_pontoEbulicaoK(),
        "densidadeKgm3" to n_propriedades_densidadeKgm3(),
        "estadoPadrao" to n_propriedades_estadoPadrao(),
        "estadosOxidacao" to n_propriedades_estadosOxidacao(),
        "descoberta" to n_propriedades_descoberta(),
        "massaMolar" to n_propriedades_massaMolar(),
        "massaExata" to n_propriedades_massaExata(),
        "formula" to n_propriedades_formula(),
        "cas" to n_propriedades_cas(),
        "cid" to n_propriedades_cid(),
        "smiles" to n_propriedades_smiles(),
        "inchiKey" to n_propriedades_inchiKey(),
        "nomeIupac" to n_propriedades_nomeIupac(),
        "xlogp" to n_propriedades_xlogp(),
        "doadoresH" to n_propriedades_doadoresH(),
        "aceptoresH" to n_propriedades_aceptoresH(),
        "ligacoesRotaveis" to n_propriedades_ligacoesRotaveis(),
        "carga" to n_propriedades_carga(),
        "tpsa" to n_propriedades_tpsa()
    )

    private fun n_stopwordsBusca(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_stopPalavras(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_palavrasFuncionais(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_simbolosAmbiguos(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_naoFormulas(): List<Any?> = listOf<Any?>(
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
        "WO"
    )

    private fun n_seguranca_acao(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_contextoSeguro(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoExplosivos(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoArmas(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoDrogas(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_precursoresNomes(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoDano(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoAutolesao(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_perigososCaseiros(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_casa(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_coladaAlvos(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "EXPLOSIVOS" to listOf<Any?>(
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
        ),
        "ARMAS_QUIMICAS" to listOf<Any?>(
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
        ),
        "DROGAS" to listOf<Any?>(
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
        ),
        "PRECURSORES" to listOf<Any?>(
            "pseudoephedrin",
            "ephedrin",
            "safrol",
            "phenylaceton",
            "esigsaureanhydrid",
            "vorlaufer",
            "precursor",
            "pseudoefedrina"
        )
    )

    private fun n_seguranca_coladaAcoes(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "acao" to n_seguranca_acao(),
        "contextoSeguro" to n_seguranca_contextoSeguro(),
        "tirarFazerSeguro" to "\\b(?:was (?:soll|kann|muss|sollte|konnte) (?:ich|man|wir) (?:tun|machen) (?:wenn|bei|im fall|nach|mit|falls)|(?:die |eine |den )?(?:entsorgung|reinigung|neutralisation|lagerung|transport|handhabung|verdunnung|erste hilfe) (?:machen|durchfuhren|vornehmen))\\b",
        "alvoExplosivos" to n_seguranca_alvoExplosivos(),
        "fazerBomba" to "\\b(?:bau(?:en|e|t|st)|herstell\\w*|mach(?:en|e|t|st)|zusammenbau\\w*|konstruier\\w*|erschaff\\w*|produzier\\w*|bast(?:le|elt|eln|elst)|basteln?)\\s+(?:(?!bomb)\\w+\\s+){0,5}?(?:eine?\\s+|einen\\s+|die\\s+|an?\\s+|uma?\\s+)?(?:(?:selbst\\w*|hausgemacht\\w*|improvisiert\\w*)\\s+)?(?:bombe|bomb|bomba)n?\\b(?!\\s+(?:kalorimeter|drohung|fur (?:wasser|warme|vakuum|insulin|treibstoff|luft)))|\\b(?:make|build|fazer)\\s+(?:eine?\\s+|einen\\s+|die\\s+|an?\\s+|uma?\\s+)?(?:bombe|bomb|bomba)n?\\b(?!\\s+(?:kalorimeter|drohung|fur (?:wasser|warme|vakuum|insulin|treibstoff|luft)))|\\b(?:bombe|bomb|bomba)n?\\s+(?:(?!bomb)\\w+\\s+){0,3}?(?:selber |selbst )?(?:bauen|basteln|herstellen|machen|zusammenbauen|produzieren|konstruieren|zubereiten)\\b|\\b(?:bau|herstellung|konstruktion|zusammenbau)\\s+(?:von |einer |eines |der |ein )?(?:(?:selbst\\w*|hausgemacht\\w*|improvisiert\\w*)\\s+)?bomben?\\b",
        "alvoArmas" to n_seguranca_alvoArmas(),
        "alvoDrogas" to n_seguranca_alvoDrogas(),
        "precursoresNomes" to n_seguranca_precursoresNomes(),
        "precursoresAcao" to "\\b(?:extrahier\\w*|gewinn\\w*|beschaff\\w*|besorg\\w*|kauf\\w*|erwerb\\w*|bekomm\\w*|komm\\w* .{0,30}\\ban\\b|ranzukomm\\w*|umleit\\w*|ohne (?:rezept|lizenz|genehmigung|erlaubnis)|umgeh\\w*|verkauf\\w*|handel\\w*|schmuggel\\w*|versteck\\w*|verberg\\w*|synthese|synthetisier\\w*)\\b",
        "alvoDano" to n_seguranca_alvoDano(),
        "alvoAutolesao" to n_seguranca_alvoAutolesao(),
        "perigososCaseiros" to n_seguranca_perigososCaseiros(),
        "casa" to n_seguranca_casa(),
        "coladaAlvos" to n_seguranca_coladaAlvos(),
        "coladaAcoes" to n_seguranca_coladaAcoes()
    )
}
