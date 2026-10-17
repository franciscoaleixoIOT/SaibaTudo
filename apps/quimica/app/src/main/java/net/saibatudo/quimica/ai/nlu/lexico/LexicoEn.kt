// gerado — não editar. Fonte: contracts/lexico/en.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxico bruto de en (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */
internal object LexicoEn {
    fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "idioma" to "en",
        "versao" to 1,
        "descricao" to "English lexicon of the local rule-based NLU and of the safety rules. Same structure as pt-BR.json (checked by test). Regexes as TEXT, no flags: the client lowercases and strips accents (only [a-z0-9+-] and spaces) before matching. Only syntax common to JS and java.util.regex.",
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
        "saudacao" to "^(hi+|hello|hey|good morning|good afternoon|good evening|howdy|yo|thanks?|thank you|thx|ty|cheers|help|menu|home|start|test|testing)( there| everyone| assistant| ai| friend| folks| how are you| whats up| all good)*\$",
        "ajuda" to "\\b(?:what (?:do you|can you|does (?:this|the) app|does it) (?:do|know|answer)|how (?:do i|to|does (?:this|the) app|does it) (?:use|work)(?: (?:this|the) (?:app|assistant))?|what can i ask|i need help|who (?:made|built|created|developed) (?:this|the) app|how does this work)\\b",
        "sobreDados" to "\\b(?:about the data|where (?:does|do) the data come from|origin of the data|data source|data update|is the data (?:up to date|updated)|data version|when was (?:it|the data) (?:last )?updated|data signature)\\b",
        "fontes" to "\\b(?:what are the (?:sources|licen[cs]es)|which sources|which licen[cs]es|data licen[cs]es?|what is the source|sources? (?:of (?:the )?)?(?:information|answers?)|where (?:did you get|does) (?:this|that|the) (?:information|answer)(?: come from)?|references?)\\b",
        "balancear" to "\\bbalanc\\w*|\\bequalize the equation\\b|\\badjust (?:the )?coefficients\\b",
        "conversao" to "\\b(?:convert\\w*|transform\\w*|change|equivalent|equals?|how many \\S+(?: \\S+)? (?:are|is|in|make|equal|correspond)|how much \\S+(?: \\S+)? (?:is|in|makes?|equals?)|in how many|into)\\b",
        "ph" to "\\b(?:ph|poh)\\b|\\bacidity of\\b|\\bbasicity\\b|\\balkalinity\\b",
        "gas" to "\\b(?:ideal gas(?:es)?|perfect gas|pv ?= ?nrt|pvnrt|gas law|ideal gas (?:law|equation)|clapeyron|molar volume|volume of (?:a |the )?gas|pressure of (?:a |the )?gas|boyle'?s? law|charles'?s? law|gay[- ]lussac|(?:pressure|volume|temperature) of .{0,24}\\bgas)\\b",
        "gasVariavel" to "\\bgas(?:es)?\\b",
        "concentracao" to "\\b(?:molarity|concentration|concentrated|dilut\\w*|c1 ?v1|c1v1|mass fraction|mass percent(?:age)?|percent(?:age)? by mass|weight percent|parts per million|ppm|normality|molality|solution of|grams per lit(?:er|re)|mol l|mol per lit(?:er|re)|moles per lit(?:er|re)|g l)\\b",
        "estequiometria" to "\\b(?:stoichiometr\\w*|limiting (?:reagent|reactant)|reagent in excess|excess reagent|excess reactant|yield|how many (?:moles?|mols?|grams?|molecules?|atoms?|lit(?:er|re)s?|ions?|particles?|kilos?|kilograms?|mg|milligrams?)\\b|number of (?:moles?|molecules|atoms|particles|ions)|stp|standard (?:temperature and pressure|conditions)|volume occupied|avogadro'?s? (?:constant|number))\\b",
        "massaMolar" to "\\b(?:molar mass|molecular (?:mass|weight)|formula (?:mass|weight)|molar weight|how much does (?:a |one )?mole(?: of \\S+)? weigh|what is the molar mass)\\b|\\bg mol\\b",
        "desenhar" to "\\b(?:draw\\w*|structure (?:2d|molecular|chemical|of|for)|2d structure|structure|show (?:me )?(?:the )?(?:structure|molecule)|molecule of|what does (?:the )?(?:molecule|structure) (?:of \\S+ )?look like|structural formula|molecular geometry|visuali[sz]e|skeleton|sketch)\\b",
        "comparar" to "\\b(?:compar\\w+|difference between|differences between|\\bversus\\b|which (?:is|one is|has) (?:heavier|lighter|denser|bigger|larger|smaller|higher|lower|stronger|weaker|more|less|the (?:highest|lowest|greatest|biggest|smallest))|\\bvs\\b|what is the difference|similarit\\w+|same as|similar to|alike)\\b",
        "seguranca" to "\\b(?:danger\\w*|hazard\\w*|toxic\\w*|safe\\w*|ppe|protective equipment|first aid|spill\\w*|leak\\w*|stor(?:e|age|ing)|fire\\w*|flammab\\w*|corrosiv\\w*|irritant\\w*|irritat\\w*|ghs|pictograms?|h[- ]?statements?|h[- ]?phrases?|safety data sheet|sds|msds|icsc|mix\\w*|incompatib\\w*|dispos\\w*|handl\\w+|inhal\\w+|ingest\\w+|swallow\\w*|burns?|poison\\w*|harmful|is it safe|is it dangerous|neutrali[sz]\\w+|gloves|goggles|signal word|hazard classification|carcinogen\\w*|explosiv\\w*|reacts? with water|reactiv\\w+ with)\\b",
        "nomenclatura" to "\\b(?:what is the name|what is it called|what is \\S+ called|what do we call|what do you call|name (?:of|for)|chemical name|iupac name|systematic name|scientific name|official name|nomenclature|how (?:do you|to) (?:write|spell)|what is the (?:chemical |molecular )?formula|formula (?:of|for)|name of the compound)\\b",
        "tabela" to "\\b(?:periodic table|periodicity|trends?|group \\d{1,2}|family \\d{1,2}|period \\d|block [spdf]|[spdf][- ]block|elements? (?:of|in|from) (?:the )?(?:group|period|block|family)|which (?:are the )?elements|what elements|how many elements|(?:gaseous|liquid|solid) elements|metals|non[- ]?metals|nonmetals|metalloids|semimetals|halogens?|noble gas(?:es)?|alkaline earth metals?|alkali metals?|lanthanides?|lanthanoids?|actinides?|actinoids?|most \\w+ element|least \\w+ element|ascending order|descending order|(?:highest|largest|biggest|greatest|lowest|smallest) (?:atomic radius|radius|electronegativity|energy|point|mass|density))\\b",
        "conceitoCue" to "^(?:what (?:is|are|does|do) (?:a |an |the )?(?:\\w+ )?(?:mean|means)?|what is|what are|what does \\S+ mean|whats|explain\\w*|defin\\w+|concept of|definition of|tell me about|how does \\S+ work|how do \\S+ work|why|what is \\S+ for|what is the (?:definition|difference|importance|function|role)|difference between|teach\\w*|summari[sz]e)\\b",
        "conceitoTemas" to "\\b(?:mole|ph|stoichiometry|(?:ionic|covalent|metallic|chemical) bond(?:ing)?|electronegativity|oxidation|reduction|redox|chemical equilibrium|enthalpy|entropy|isomer(?:ism|s)|acid|base|salt|oxide|solution|concentration|molarity|dilution|periodic table|chemical reaction|kinetics|catalyst|electrolysis|battery|galvanic cell|polarity|intermolecular forces?)\\b"
    )

    private fun n_pistas_limparConceito(): List<Any?> = listOf<Any?>(
        "^(?:is |are |does |do |mean |means |a |an |the )+",
        "^(?:a |an |the |of |for )+"
    )

    private fun n_pistas(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "querCalcular" to "\\b(?:limiting|yield|how many|how much|mass of|grams?|moles?|mols?|produc\\w*|form\\w*|obtain\\w*|react\\w*|consum\\w+|left over|remain\\w*|excess|volume|lit(?:er|re)s?)\\b",
        "conversaoPreposicoes" to "(?:->|→| to | into | in )",
        "paraUnidade" to "\\b(?:to|into|in)\\s+(?:the )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| per lit(?:er|re)| of mercury)?)\\s*[?!.]*\$",
        "quantosUnidade" to "^\\s*(?:how many|how much)\\s+((?:degrees\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:are|is|in|make|equal|equals|correspond|fit)(?![A-Za-z])",
        "phContexto" to "\\b(?:acid|base|solution)\\b",
        "conector" to "\\bof\\b",
        "prefixoExplicacao" to "^(?:what is|what are|whats|explain|defin|concept|how does|why)(?!\\s+the\\b)",
        "prefixoExplicacaoPalavra" to "^(?:what is|what are|whats|explain\\w*|defin\\w*|concept|how does|why)\\b(?!\\s+the\\b)",
        "prefixoDefinicao" to "^(?:what is|what are|whats|explain\\w*|defin\\w*|concept)\\b(?!\\s+the\\b)",
        "gasGrandezas" to "\\b(?:volume|pressure|temperature|moles?|mols?|how many|how much)\\b",
        "concentracaoForte" to "\\bdilut\\w*|molarity|concentration\\b",
        "propriedadesPalavra" to "\\bproperties\\b",
        "mistura" to "\\b(?:mix\\w*|together with|together|combin\\w+|mixed|incompatib\\w+)\\b",
        "elementoPalavra" to "\\belements?\\b",
        "gasSubstancia" to "\\bgas\\b",
        "tendencia" to "\\btrends?\\b|\\bperiodicity|\\bvar(?:y|ies|iation) (?:along|across|down|within) (?:the )?(?:period|group)|\\b(?:along|across|down) (?:the |a )?(?:period|group)",
        "tabelaPalavra" to "\\bperiodic table\\b",
        "grupo" to "\\b(?:group|family)\\s+(\\d{1,2})\\b",
        "periodo" to "\\bperiod\\s+(\\d)\\b",
        "bloco" to "\\bblock\\s+([spdf])\\b|\\b([spdf])[- ]block\\b",
        "continuacao" to "^(?:and|what about) (?:the |that |this )?(?:of |for )?",
        "limparConceito" to n_pistas_limparConceito(),
        "constantes" to "\\b(pka|pkb|ka|kb)\\s*(?:=|:|of|is|equal to|equals)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
        "quantidadeComplemento" to "(?:of|per)",
        "letrasUnidade" to "A-Za-z",
        "ligacaoPreposicoes" to "(?:of)",
        "diluicao" to "\\b(?:dilut\\w*|c1v1|c1 v1)\\b",
        "percentualMassa" to "\\bmass|percent|weight|fraction\\b",
        "cntp" to "\\b(?:stp|standard conditions|standard temperature|volume)\\b",
        "cueElemento" to "\\b(?:element|symbol|chemical symbol)\\b"
    )

    private fun n_nivel(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "fundamental" to "\\b(?:elementary school|primary school|middle school|for kids|for children|simple|very simple|easy to understand|for beginners|layman)\\b",
        "medio" to "\\b(?:high school|secondary school|sat|a level|ib)\\b",
        "superior" to "\\b(?:college|university|undergraduate|advanced|graduate|in depth|detailed)\\b"
    )

    private fun n_unidades_0(): List<Any?> = listOf<Any?>(
        "^degrees? (?:celsius|centigrade)\$|^celsius\$|^centigrade\$",
        "°C"
    )

    private fun n_unidades_1(): List<Any?> = listOf<Any?>(
        "^degrees? fahrenheit\$|^fahrenheit\$",
        "°F"
    )

    private fun n_unidades_2(): List<Any?> = listOf<Any?>(
        "^kelvins?\$",
        "K"
    )

    private fun n_unidades_3(): List<Any?> = listOf<Any?>(
        "^atmospheres?\$",
        "atm"
    )

    private fun n_unidades_4(): List<Any?> = listOf<Any?>(
        "^pascals?\$",
        "Pa"
    )

    private fun n_unidades_5(): List<Any?> = listOf<Any?>(
        "^kilopascals?\$",
        "kPa"
    )

    private fun n_unidades_6(): List<Any?> = listOf<Any?>(
        "^millimet(?:er|re)s? of mercury\$",
        "mmHg"
    )

    private fun n_unidades_7(): List<Any?> = listOf<Any?>(
        "^lit(?:er|re)s?\$",
        "L"
    )

    private fun n_unidades_8(): List<Any?> = listOf<Any?>(
        "^millilit(?:er|re)s?\$",
        "mL"
    )

    private fun n_unidades_9(): List<Any?> = listOf<Any?>(
        "^microlit(?:er|re)s?\$",
        "µL"
    )

    private fun n_unidades_10(): List<Any?> = listOf<Any?>(
        "^grams?\$|^grammes?\$",
        "g"
    )

    private fun n_unidades_11(): List<Any?> = listOf<Any?>(
        "^milligrams?\$",
        "mg"
    )

    private fun n_unidades_12(): List<Any?> = listOf<Any?>(
        "^kilograms?\$|^kilos?\$",
        "kg"
    )

    private fun n_unidades_13(): List<Any?> = listOf<Any?>(
        "^tons?\$|^tonnes?\$",
        "t"
    )

    private fun n_unidades_14(): List<Any?> = listOf<Any?>(
        "^moles?\$|^mols?\$",
        "mol"
    )

    private fun n_unidades_15(): List<Any?> = listOf<Any?>(
        "^millimoles?\$|^millimols?\$",
        "mmol"
    )

    private fun n_unidades_16(): List<Any?> = listOf<Any?>(
        "^kilomoles?\$|^kilomols?\$",
        "kmol"
    )

    private fun n_unidades_17(): List<Any?> = listOf<Any?>(
        "^joules?\$",
        "J"
    )

    private fun n_unidades_18(): List<Any?> = listOf<Any?>(
        "^calories?\$",
        "cal"
    )

    private fun n_unidades_19(): List<Any?> = listOf<Any?>(
        "^kilocalories?\$",
        "kcal"
    )

    private fun n_unidades_20(): List<Any?> = listOf<Any?>(
        "^kilojoules?\$",
        "kJ"
    )

    private fun n_unidades_21(): List<Any?> = listOf<Any?>(
        "^molar\$",
        "mol/L"
    )

    private fun n_unidades_22(): List<Any?> = listOf<Any?>(
        "^moles? per lit(?:er|re)\$|^mols? per lit(?:er|re)\$",
        "mol/L"
    )

    private fun n_unidades_23(): List<Any?> = listOf<Any?>(
        "^grams? per lit(?:er|re)\$",
        "g/L"
    )

    private fun n_unidades_24(): List<Any?> = listOf<Any?>(
        "^(?:molecules?|atoms?|particles?|ions?|units|entities)\$",
        "particulas"
    )

    private fun n_unidades_25(): List<Any?> = listOf<Any?>(
        "^met(?:er|re)s?\$",
        "m"
    )

    private fun n_unidades_26(): List<Any?> = listOf<Any?>(
        "^centimet(?:er|re)s?\$",
        "cm"
    )

    private fun n_unidades_27(): List<Any?> = listOf<Any?>(
        "^millimet(?:er|re)s?\$",
        "mm"
    )

    private fun n_unidades_28(): List<Any?> = listOf<Any?>(
        "^nanomet(?:er|re)s?\$",
        "nm"
    )

    private fun n_unidades_29(): List<Any?> = listOf<Any?>(
        "^kilomet(?:er|re)s?\$",
        "km"
    )

    private fun n_unidades_30(): List<Any?> = listOf<Any?>(
        "^per ?cent\$|^percent\$",
        "%"
    )

    private fun n_unidades_31(): List<Any?> = listOf<Any?>(
        "^bars?\$",
        "bar"
    )

    private fun n_unidades_32(): List<Any?> = listOf<Any?>(
        "^torrs?\$",
        "Torr"
    )

    private fun n_unidades_33(): List<Any?> = listOf<Any?>(
        "^hours?\$",
        "h"
    )

    private fun n_unidades_34(): List<Any?> = listOf<Any?>(
        "^minutes?\$",
        "min"
    )

    private fun n_unidades_35(): List<Any?> = listOf<Any?>(
        "^seconds?\$",
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
        "\\balkaline earth\\w*",
        "metal_alcalino_terroso"
    )

    private fun n_categorias_1(): List<Any?> = listOf<Any?>(
        "\\balkali metals?|\\balkali\\b|\\balkalis\\b",
        "metal_alcalino"
    )

    private fun n_categorias_2(): List<Any?> = listOf<Any?>(
        "\\btransition metals?|\\btransition elements?",
        "metal_transicao"
    )

    private fun n_categorias_3(): List<Any?> = listOf<Any?>(
        "\\bpost[- ]?transition|\\brepresentative metals?",
        "metal_pos_transicao"
    )

    private fun n_categorias_4(): List<Any?> = listOf<Any?>(
        "\\bmetalloids?|\\bsemimetals?|\\bsemi[- ]metals?",
        "semimetal"
    )

    private fun n_categorias_5(): List<Any?> = listOf<Any?>(
        "\\bnon[- ]?metals?|\\bnonmetals?",
        "nao_metal"
    )

    private fun n_categorias_6(): List<Any?> = listOf<Any?>(
        "\\bhalogens?",
        "halogenio"
    )

    private fun n_categorias_7(): List<Any?> = listOf<Any?>(
        "\\bnoble gas(?:es)?|\\binert gas(?:es)?",
        "gas_nobre"
    )

    private fun n_categorias_8(): List<Any?> = listOf<Any?>(
        "\\blanthanides?|\\blanthanoids?|\\brare earths?",
        "lantanideo"
    )

    private fun n_categorias_9(): List<Any?> = listOf<Any?>(
        "\\bactinides?|\\bactinoids?",
        "actinideo"
    )

    private fun n_categorias_10(): List<Any?> = listOf<Any?>(
        "\\bmetals\\b|\\bmetal\\b",
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
        "\\b(?:gaseous|gases|in the gas(?:eous)? state)\\b",
        "gas"
    )

    private fun n_estados_1(): List<Any?> = listOf<Any?>(
        "\\bliquids?\\b",
        "liquido"
    )

    private fun n_estados_2(): List<Any?> = listOf<Any?>(
        "\\bsolids?\\b",
        "solido"
    )

    private fun n_estados(): List<Any?> = listOf<Any?>(
        n_estados_0(),
        n_estados_1(),
        n_estados_2()
    )

    private fun n_extremos_0(): List<Any?> = listOf<Any?>(
        "\\bmost electronegativ\\w+|\\bhighest electronegativity",
        "eletronegatividade",
        "max"
    )

    private fun n_extremos_1(): List<Any?> = listOf<Any?>(
        "\\bleast electronegativ\\w+|\\blowest electronegativity",
        "eletronegatividade",
        "min"
    )

    private fun n_extremos_2(): List<Any?> = listOf<Any?>(
        "\\bdensest\\b|\\bmost dense\\b|\\bhighest density",
        "densidadeKgm3",
        "max"
    )

    private fun n_extremos_3(): List<Any?> = listOf<Any?>(
        "\\bleast dense\\b|\\blowest density|\\blightest\\b",
        "densidadeKgm3",
        "min"
    )

    private fun n_extremos_4(): List<Any?> = listOf<Any?>(
        "\\b(?:largest|biggest|greatest) (?:atomic )?radius|\\bmost voluminous",
        "raioAtomicoPm",
        "max"
    )

    private fun n_extremos_5(): List<Any?> = listOf<Any?>(
        "\\bsmallest (?:atomic )?radius",
        "raioAtomicoPm",
        "min"
    )

    private fun n_extremos_6(): List<Any?> = listOf<Any?>(
        "\\bhighest melting point",
        "pontoFusaoK",
        "max"
    )

    private fun n_extremos_7(): List<Any?> = listOf<Any?>(
        "\\blowest melting point",
        "pontoFusaoK",
        "min"
    )

    private fun n_extremos_8(): List<Any?> = listOf<Any?>(
        "\\bhighest boiling point",
        "pontoEbulicaoK",
        "max"
    )

    private fun n_extremos_9(): List<Any?> = listOf<Any?>(
        "\\blowest boiling point",
        "pontoEbulicaoK",
        "min"
    )

    private fun n_extremos_10(): List<Any?> = listOf<Any?>(
        "\\bhighest ionization energy|\\bhighest ionisation energy",
        "energiaIonizacaoKJmol",
        "max"
    )

    private fun n_extremos_11(): List<Any?> = listOf<Any?>(
        "\\blowest ionization energy|\\blowest ionisation energy",
        "energiaIonizacaoKJmol",
        "min"
    )

    private fun n_extremos_12(): List<Any?> = listOf<Any?>(
        "\\bhighest atomic mass|\\bheaviest\\b",
        "massaAtomica",
        "max"
    )

    private fun n_extremos_13(): List<Any?> = listOf<Any?>(
        "\\blowest atomic mass|\\blightest atom",
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
        "atomic number",
        "z"
    )

    private fun n_propriedades_massaAtomica(): List<Any?> = listOf<Any?>(
        "atomic mass",
        "atomic weight",
        "mass of the atom"
    )

    private fun n_propriedades_simbolo(): List<Any?> = listOf<Any?>(
        "symbol"
    )

    private fun n_propriedades_grupo(): List<Any?> = listOf<Any?>(
        "group",
        "family"
    )

    private fun n_propriedades_periodo(): List<Any?> = listOf<Any?>(
        "period"
    )

    private fun n_propriedades_bloco(): List<Any?> = listOf<Any?>(
        "block"
    )

    private fun n_propriedades_categoria(): List<Any?> = listOf<Any?>(
        "category",
        "classification",
        "type of element",
        "element class",
        "kind of element"
    )

    private fun n_propriedades_configuracaoEletronica(): List<Any?> = listOf<Any?>(
        "electron configuration",
        "electronic configuration",
        "electron distribution"
    )

    private fun n_propriedades_eletronegatividade(): List<Any?> = listOf<Any?>(
        "electronegativity"
    )

    private fun n_propriedades_raioAtomicoPm(): List<Any?> = listOf<Any?>(
        "atomic radius",
        "van der waals radius",
        "size of the atom",
        "atomic size"
    )

    private fun n_propriedades_afinidadeEletronicaKJmol(): List<Any?> = listOf<Any?>(
        "electron affinity"
    )

    private fun n_propriedades_energiaIonizacaoKJmol(): List<Any?> = listOf<Any?>(
        "ionization energy",
        "ionisation energy",
        "ionization potential",
        "first ionization energy"
    )

    private fun n_propriedades_pontoFusaoK(): List<Any?> = listOf<Any?>(
        "melting point",
        "melting temperature",
        "fusion point",
        "melts",
        "melt"
    )

    private fun n_propriedades_pontoEbulicaoK(): List<Any?> = listOf<Any?>(
        "boiling point",
        "boiling temperature",
        "boils",
        "boil"
    )

    private fun n_propriedades_densidadeKgm3(): List<Any?> = listOf<Any?>(
        "density",
        "specific mass"
    )

    private fun n_propriedades_estadoPadrao(): List<Any?> = listOf<Any?>(
        "physical state",
        "standard state",
        "state of matter",
        "is solid",
        "is liquid",
        "is gaseous",
        "is a gas",
        "is a liquid",
        "is a solid",
        "a liquid",
        "a solid",
        "a gas",
        "liquid at room temperature",
        "solid at room temperature",
        "gas at room temperature"
    )

    private fun n_propriedades_estadosOxidacao(): List<Any?> = listOf<Any?>(
        "oxidation states",
        "oxidation numbers",
        "oxidation state",
        "oxidation number",
        "valence",
        "valency"
    )

    private fun n_propriedades_descoberta(): List<Any?> = listOf<Any?>(
        "discovery",
        "discovered",
        "discoverer",
        "who discovered",
        "year of discovery",
        "when was it discovered",
        "was discovered",
        "were discovered"
    )

    private fun n_propriedades_massaMolar(): List<Any?> = listOf<Any?>(
        "molar mass",
        "molecular mass",
        "molecular weight",
        "molar weight",
        "formula mass",
        "formula weight"
    )

    private fun n_propriedades_massaExata(): List<Any?> = listOf<Any?>(
        "exact mass",
        "monoisotopic mass"
    )

    private fun n_propriedades_formula(): List<Any?> = listOf<Any?>(
        "formula",
        "molecular formula",
        "chemical formula"
    )

    private fun n_propriedades_cas(): List<Any?> = listOf<Any?>(
        "cas number",
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
        "systematic name",
        "iupac"
    )

    private fun n_propriedades_xlogp(): List<Any?> = listOf<Any?>(
        "xlogp",
        "logp",
        "lipophilicity",
        "partition coefficient"
    )

    private fun n_propriedades_doadoresH(): List<Any?> = listOf<Any?>(
        "hydrogen bond donors",
        "h bond donors",
        "hydrogen donors"
    )

    private fun n_propriedades_aceptoresH(): List<Any?> = listOf<Any?>(
        "hydrogen bond acceptors",
        "h bond acceptors",
        "hydrogen acceptors"
    )

    private fun n_propriedades_ligacoesRotaveis(): List<Any?> = listOf<Any?>(
        "rotatable bonds"
    )

    private fun n_propriedades_carga(): List<Any?> = listOf<Any?>(
        "electric charge",
        "formal charge",
        "charge"
    )

    private fun n_propriedades_tpsa(): List<Any?> = listOf<Any?>(
        "tpsa",
        "polar surface area"
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
        "the",
        "a",
        "an",
        "of",
        "and",
        "or",
        "that",
        "in",
        "on",
        "to",
        "for",
        "by",
        "with",
        "what",
        "which",
        "how",
        "is",
        "are",
        "be",
        "does",
        "do",
        "mean",
        "means",
        "explain",
        "define",
        "concept",
        "whats",
        "why",
        "me",
        "work",
        "works",
        "tell",
        "about",
        "it"
    )

    private fun n_stopPalavras(): List<Any?> = listOf<Any?>(
        "of",
        "the",
        "a",
        "an",
        "and",
        "or",
        "in",
        "on",
        "at",
        "to",
        "for",
        "by",
        "with",
        "that",
        "this",
        "is",
        "are",
        "it",
        "its"
    )

    private fun n_palavrasFuncionais(): List<Any?> = listOf<Any?>(
        "about",
        "between",
        "like",
        "where",
        "when",
        "which",
        "what",
        "more",
        "less",
        "much",
        "little",
        "all",
        "nothing",
        "also",
        "because",
        "then",
        "so",
        "still",
        "after",
        "before",
        "now",
        "always",
        "never",
        "was",
        "were",
        "be",
        "been",
        "have",
        "has",
        "had",
        "tell",
        "say",
        "show",
        "explain",
        "chemistry",
        "please",
        "would",
        "could",
        "can",
        "want",
        "need",
        "sources",
        "source",
        "data",
        "help",
        "licence",
        "license",
        "licences",
        "licenses",
        "information",
        "version",
        "reference",
        "references",
        "offline",
        "free",
        "give",
        "find",
        "know",
        "think",
        "some",
        "there",
        "here",
        "does",
        "did",
        "make",
        "made",
        "into",
        "from",
        "only",
        "very",
        "most",
        "many",
        "other",
        "same",
        "than",
        "them",
        "they",
        "your",
        "mine",
        "ours",
        "unit",
        "units",
        "value",
        "point",
        "name",
        "mass",
        "molar",
        "state"
    )

    private fun n_simbolosAmbiguos(): List<Any?> = listOf<Any?>(
        "He",
        "No",
        "In",
        "As",
        "At",
        "Be",
        "Am",
        "Os",
        "Si",
        "Se",
        "Ar",
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
        "Na",
        "Y",
        "Us",
        "We",
        "So",
        "Sb",
        "Ti"
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
        "HI",
        "NO",
        "US",
        "WHO",
        "FAQ"
    )

    private fun n_seguranca_acao(): List<Any?> = listOf<Any?>(
        "make",
        "making",
        "makes",
        "manufactur(?:e|es|ing)",
        "produc(?:e|ing|ed|tion)",
        "prepar(?:e|ing|ed|ation)",
        "synthesi[sz]\\w*",
        "synthesis",
        "obtain\\w*",
        "acquir\\w+",
        "get hold of",
        "procure\\w*",
        "buy\\w*",
        "purchas\\w+",
        "sell\\w*",
        "traffick?\\w*",
        "smuggl\\w+",
        "divert\\w*",
        "circumvent\\w*",
        "hide",
        "hiding",
        "conceal\\w*",
        "extract\\w*",
        "cook\\w*",
        "assembl\\w+",
        "build\\w*",
        "set(?:ting)? up",
        "construct(?:ing|ed|s)?",
        "creat\\w+",
        "generat\\w+",
        "purif\\w+",
        "refin\\w+",
        "crystalli[sz]\\w*",
        "distil\\w*",
        "scal(?:e|ing) up",
        "scale-up",
        "large scale",
        "increas\\w+ (?:the )?(?:production|yield|scale|potency|purity)",
        "recipe",
        "step by step",
        "step-by-step",
        "tutorial",
        "describe (?:the process|how|in detail)",
        "instructions?",
        "teach me",
        "synthesis route",
        "synthetic route",
        "procedure (?:for|to)",
        "protocol (?:for|to)",
        "how (?:do (?:i|you) |to |is it )?(?:make|manufacture|produce|prepare|synthesi[sz]e|obtain|extract|cook|build|get)",
        "amount of .{1,40} (?:to|needed to) (?:make|produce|prepare)",
        "what reagents",
        "which reagents",
        "what (?:do i|would i) need to (?:make|produce)",
        "ingredients for",
        "materials (?:for|to) (?:make|build|produce)",
        "fabricar",
        "produzir",
        "sintetizar"
    )

    private fun n_seguranca_contextoSeguro(): List<Any?> = listOf<Any?>(
        "dispos\\w*",
        "neutrali[sz]\\w*",
        "stor(?:e|age|ing|ed)",
        "keep",
        "handl\\w*",
        "manipulat\\w*",
        "first aid",
        "ppe",
        "spill\\w*",
        "leak\\w*",
        "splash\\w*",
        "inhal(?:e|ed|ation|ing)",
        "ingest\\w*",
        "swallow\\w*",
        "burns?",
        "poisoning (?:by|with|from)",
        "exposure to",
        "protective equipment",
        "personal protection",
        "gloves",
        "goggles",
        "safety glasses",
        "mask",
        "respirator",
        "what to do (?:with|about|if|when|in case)",
        "what (?:should|can|do) (?:i|we|you) do (?:if|when|in case)",
        "in case of",
        "safety data sheet",
        "sds",
        "msds",
        "icsc",
        "recycl\\w*"
    )

    private fun n_seguranca_alvoExplosivos(): List<Any?> = listOf<Any?>(
        "explosiv\\w*",
        "dynamite",
        "tnt",
        "trinitrotoluene",
        "nitroglycerin\\w*",
        "c ?4 explosiv\\w*",
        "c-4",
        "rdx",
        "hmx",
        "petn",
        "hmtd",
        "tatp",
        "acetone peroxide",
        "triacetone triperoxide",
        "(?:lead|sodium) azide",
        "fulminate\\w*",
        "anfo",
        "picrate\\w*",
        "tetryl",
        "(?:black |smokeless )?gunpowder",
        "black powder",
        "ammonium nitrate (?:with|and|\\+|plus) (?:diesel|oil|fuel|gasoline|petrol)",
        "(?:homemade|home-made|improvised|chemical|incendiary|smoke|pressure cooker|nail|pipe|fertili[sz]er|car|time) bombs?",
        "pipe bombs?",
        "molotov(?: cocktails?)?",
        "napalm",
        "grenades?",
        "explosive devices?",
        "ied",
        "detonators?",
        "bomb fuse",
        "(?:homemade |home-made )?fireworks",
        "thermite",
        "incendiary (?:material|device)",
        "atomic bomb",
        "nuclear bomb",
        "dirty bomb",
        "explosivo",
        "dinamite",
        "nitroglicerina",
        "polvora"
    )

    private fun n_seguranca_alvoArmas(): List<Any?> = listOf<Any?>(
        "sarin",
        "soman",
        "tabun",
        "vx",
        "nerve agents?",
        "chemical weapons?",
        "chemical warfare agents?",
        "mustard gas",
        "sulfur mustard",
        "sulphur mustard",
        "nitrogen mustard",
        "novichok",
        "phosgene",
        "chloropicrin",
        "lewisite",
        "(?:poison|poisonous|toxic|tear|lethal|deadly|war|nerve|asphyxiating|suffocating) gas(?:es)?",
        "chlorine gas",
        "gaseous chlorine",
        "ricin",
        "(?:hydrogen |potassium |sodium )?cyanide",
        "hydrocyanic acid",
        "prussic acid",
        "chloramines?",
        "arsine",
        "phosphine",
        "botulinum toxin",
        "botulin",
        "anthrax",
        "hydrogen sulfide",
        "hydrogen sulphide",
        "weapons? of mass destruction",
        "bioweapons?",
        "biological weapons?",
        "carbon monoxide to (?:kill|hurt|poison|harm)",
        "arma quimica",
        "gas sarin",
        "gas mostarda",
        "fosgenio"
    )

    private fun n_seguranca_alvoDrogas(): List<Any?> = listOf<Any?>(
        "methamphetamines?",
        "meth",
        "crystal meth",
        "ice(?! ?cubes?| ?cream| rink| pack| water| bath| skat\\w*| age| cold| melt\\w*| machine| maker| tray)",
        "speed(?! of| limit| up| test| camera| boat| record| reading)",
        "cocaine",
        "coke(?! ?(?:oven|can|bottle|zero|cola|coal))",
        "crack(?! (?:the|a|an|this|that|open|code|codes|password|passwords|egg|eggs|nut|nuts|joke|jokes|down|in|up))",
        "freebase",
        "heroin",
        "lsd",
        "lysergic acid",
        "mdma",
        "ecstasy",
        "molly",
        "fentanyl\\w*",
        "carfentanil",
        "pcp",
        "phencyclidine",
        "ketamine",
        "dmt",
        "dimethyltryptamine",
        "mescaline",
        "psilocybin",
        "magic mushrooms?",
        "amphetamines?",
        "ghb",
        "gbh",
        "oxycodone",
        "opium",
        "marijuana",
        "marihuana",
        "cannabis",
        "hashish",
        "hash(?! ?(?:function|functions|table|tables|map|tag|tags|brown|browns|sum|code|rate|value))",
        "weed(?! ?killers?| control| whacker| eater| ?(?:s|ing) (?:in|from|out) (?:the|my|a) (?:garden|lawn|yard|beds?))",
        "thc",
        "synthetic cannabinoids?",
        "spice(?! ?(?:rack|racks|mix|mixes|blend|blends|cabinet|jar|jars|girls))",
        "k2",
        "bath salts",
        "synthetic cathinones?",
        "synthetic drugs?",
        "(?:illegal|illicit|street|recreational) drugs?",
        "narcotics?",
        "(?:clandestine|illegal|drug|meth) lab(?:oratory)?",
        "metanfetamina",
        "cocaina",
        "heroina"
    )

    private fun n_seguranca_precursoresNomes(): List<Any?> = listOf<Any?>(
        "ephedrine",
        "pseudoephedrine",
        "norephedrine",
        "safrole",
        "isosafrole",
        "piperonal",
        "phenylacetone",
        "p2p",
        "phenyl-?2-?propanone",
        "phenylacetic acid",
        "acetic anhydride",
        "ergotamine",
        "ergometrine",
        "anthranilic acid",
        "n-?acetylanthranilic",
        "lysergic acid",
        "(?:controlled|drug|chemical|listed|scheduled) precursors?",
        "precursors? (?:for|of|to) (?:drugs?|meth\\w*|explosives?|weapons?)",
        "red phosphorus",
        "red iodine"
    )

    private fun n_seguranca_alvoDano(): List<Any?> = listOf<Any?>(
        "poison(?:ing)? (?:someone|somebody|a person|people|my|the|him|her|them|a dog|a cat|an animal|animals|children|a child|kids|neighbou?rs?|colleagues?|a colleague|teachers?|a teacher|boss|husband|wife|girlfriend|boyfriend|partner|ex)",
        "kill (?:someone|somebody|a person|people|my|the|him|her|them)",
        "murder\\w*",
        "assassinat\\w+",
        "intoxicate (?:someone|somebody|a person|on purpose)",
        "(?:undetectable|untraceable|lethal|deadly|homemade|home-made) poisons?",
        "poison that leaves no trace",
        "lethal dose to kill",
        "hurt (?:someone|somebody|a person|people)",
        "harm (?:someone|somebody|a person|people)",
        "burn (?:someone|somebody|a person) with (?:acid|chemicals?)",
        "throw acid (?:at|on|in)",
        "attack (?:someone|somebody|a person|people) with",
        "envenenar alguem",
        "matar alguem"
    )

    private fun n_seguranca_alvoAutolesao(): List<Any?> = listOf<Any?>(
        "kill myself",
        "commit suicide",
        "suicide",
        "suicidal",
        "take my (?:own )?life",
        "end my life",
        "end it all",
        "poison myself",
        "i want to die",
        "want to die",
        "die (?:painlessly|without pain|without suffering|peacefully)",
        "painless death",
        "overdose to die",
        "how much \\S+ to die",
        "hurt myself",
        "harm myself",
        "self[- ]harm",
        "cut myself",
        "intoxicate myself on purpose",
        "me matar",
        "suicidio"
    )

    private fun n_seguranca_perigososCaseiros(): List<Any?> = listOf<Any?>(
        "(?:sulfuric|sulphuric|nitric|hydrochloric|muriatic|hydrofluoric|perchloric|picric|hydrocyanic) acid",
        "aqua regia",
        "chlorine(?: gas)?",
        "cyanide\\w*",
        "arsenic",
        "arsine",
        "phosphine",
        "phosgene",
        "mercury",
        "(?:white|red) phosphorus",
        "sodium metal",
        "metallic sodium",
        "potassium metal",
        "metallic potassium",
        "anhydrous ammonia",
        "chlorate\\w*",
        "perchlorate\\w*",
        "(?:acetone|methyl ethyl ketone|benzoyl) peroxide",
        "(?:concentrated |high[- ]strength )?hydrogen peroxide(?: \\d+ ?(?:%|percent|volumes?))?",
        "(?:concentrated )?(?:ammonium|potassium) nitrate",
        "potassium permanganate",
        "hydrogen sul(?:f|ph)ide",
        "carbon monoxide",
        "(?:toxic|poisonous|poison|flammable|asphyxiating) gas(?:es)?",
        "fluoride\\w*",
        "hydrofluoric acid",
        "poisons?",
        "toxins?",
        "napalm",
        "thermite",
        "nitrocellulose",
        "nitroglycerin\\w*",
        "nitrated toluene",
        "acetone and hydrogen peroxide",
        "bleach and (?:ammonia|acid|vinegar)",
        "chlorine and ammonia",
        "lye and alumin(?:i)?um",
        "drain cleaner and alumin(?:i)?um"
    )

    private fun n_seguranca_casa(): List<Any?> = listOf<Any?>(
        "at home",
        "homemade",
        "home-made",
        "home made",
        "artisanal",
        "improvised",
        "in (?:my|the) kitchen",
        "in (?:my|the) (?:backyard|back yard|garage|bathroom|apartment|flat|basement|bedroom|dorm)",
        "with (?:household|home|cleaning|supermarket|grocery|pharmacy|drugstore|hardware store|store-bought) (?:products|chemicals|items|supplies|stuff)",
        "without a lab(?:oratory)?",
        "do it yourself",
        "diy",
        "with (?:easy|simple|household|common|everyday|readily available) (?:materials|items|ingredients|chemicals)",
        "using (?:only |just )?(?:household|cleaning|everyday) (?:products|chemicals|items)",
        "em casa",
        "caseiro"
    )

    private fun n_seguranca_coladaAlvos(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "EXPLOSIVOS" to listOf<Any?>(
            "explosive",
            "nitroglycerin",
            "dynamite",
            "trinitrotoluene",
            "acetoneperoxide",
            "molotov",
            "napalm",
            "homemadebomb",
            "pipebomb",
            "gunpowder",
            "detonator",
            "fulminate",
            "tatp",
            "hmtd",
            "explosivo",
            "nitroglicerina"
        ),
        "ARMAS_QUIMICAS" to listOf<Any?>(
            "sarin",
            "novichok",
            "mustardgas",
            "nerveagent",
            "chemicalweapon",
            "phosgene",
            "ricin",
            "toxicgas",
            "poisongas",
            "cyanide",
            "chloramine",
            "chlorinegas",
            "armaquimica",
            "fosgenio"
        ),
        "DROGAS" to listOf<Any?>(
            "methamphetamine",
            "cocaine",
            "heroin",
            "fentanyl",
            "ecstasy",
            "mdma",
            "amphetamine",
            "syntheticdrugs",
            "crystalmeth",
            "lsd",
            "ketamine",
            "metanfetamina",
            "cocaina"
        ),
        "PRECURSORES" to listOf<Any?>(
            "pseudoephedrine",
            "ephedrine",
            "safrole",
            "phenylacetone",
            "aceticanhydride",
            "precursors",
            "pseudoefedrina"
        )
    )

    private fun n_seguranca_coladaAcoes(): List<Any?> = listOf<Any?>(
        "synthesis",
        "synthesize",
        "synthesise",
        "produce",
        "prepare",
        "purify",
        "refine",
        "cook",
        "extract",
        "howtomake",
        "howtobuild",
        "recipe",
        "stepbystep",
        "assemble",
        "obtain",
        "scaleup"
    )

    private fun n_seguranca(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "acao" to n_seguranca_acao(),
        "contextoSeguro" to n_seguranca_contextoSeguro(),
        "tirarFazerSeguro" to "\\b(?:what to do (?:with|about|if|when|in case|after)|what (?:should|can|do|must|would) (?:i|we|you|one|someone) do (?:if|when|in case|after|with|upon|about)|do (?:the |a )?(?:disposal|cleanup|clean up|neutrali[sz]ation|storage|transport|handling|dilution|first aid))\\b",
        "alvoExplosivos" to n_seguranca_alvoExplosivos(),
        "fazerBomba" to "\\b(?:make|making|made|build\\w*|assembl\\w+|construct\\w*|creat\\w+|produc\\w+|prepar\\w+|fazer|montar|construir)\\s+(?:an?\\s+|the\\s+|some\\s+|uma?\\s+)?(?:bomb|bomba)s?\\b(?!\\s+(?:calorimeter|calorimetry|threat|shelter|of (?:water|heat|vacuum|insulin|fuel|air)|pump|for (?:the |a )?(?:bath|tub|party)))",
        "alvoArmas" to n_seguranca_alvoArmas(),
        "alvoDrogas" to n_seguranca_alvoDrogas(),
        "precursoresNomes" to n_seguranca_precursoresNomes(),
        "precursoresAcao" to "\\b(?:extract\\w*|obtain\\w*|buy\\w*|purchas\\w+|get|acquir\\w+|divert\\w*|without (?:a )?(?:prescription|licen[cs]e|authori[sz]ation|permit)|circumvent\\w*|bypass\\w*|sell\\w*|traffick?\\w*|hide|conceal\\w*|synthesis|synthesi[sz]\\w*)\\b",
        "alvoDano" to n_seguranca_alvoDano(),
        "alvoAutolesao" to n_seguranca_alvoAutolesao(),
        "perigososCaseiros" to n_seguranca_perigososCaseiros(),
        "casa" to n_seguranca_casa(),
        "coladaAlvos" to n_seguranca_coladaAlvos(),
        "coladaAcoes" to n_seguranca_coladaAcoes()
    )
}
