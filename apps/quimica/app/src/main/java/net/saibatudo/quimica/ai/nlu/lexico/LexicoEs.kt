// gerado — não editar. Fonte: contracts/lexico/es.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxico bruto de es (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */
internal object LexicoEs {
    fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "idioma" to "es",
        "versao" to 1,
        "descricao" to "Léxico en español del intérprete local (NLU por reglas) y de las reglas de seguridad. Misma estructura que pt-BR.json (verificada por test). Regexes como TEXTO, sin flags: el cliente pasa la pregunta a minúsculas y sin acentos (solo [a-z0-9+-] y espacios) antes de comparar. Traducción inicial por agente (revisión humana pendiente).",
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
        "saudacao" to "^(hola+|buenas|buenos dias|buenas tardes|buenas noches|que tal|hey|hello|hi|gracias|muchas gracias|ayuda|help|socorro|menu|inicio|empezar|comenzar|prueba|probando)( que tal| todo bien| como estas| asistente| ia| amigo| a todos)*\$",
        "ajuda" to "\\b(?:que (?:haces|sabes|respondes|puedes hacer)|que (?:hace|sabe|responde|puede) (?:la app|la aplicacion|esta app|esta aplicacion|la ia)|como (?:usar|uso|funciona) (?:la |esta )?(?:app|aplicacion|asistente)|que (?:puedo|se puede) preguntar|necesito ayuda|quien (?:hizo|creo|desarrollo) (?:la |esta )?(?:app|aplicacion))\\b",
        "sobreDados" to "\\b(?:sobre los datos|de donde (?:vienen|salen) los datos|origen de los datos|fuente de los datos|actualizacion de los datos|datos (?:estan )?actualizados|version de los datos|cuando se actualizo|firma de los datos)\\b",
        "fontes" to "\\b(?:cuales son las (?:fuentes|licencias)|que (?:fuentes|licencias)|licencias? (?:tienen|usan|tiene|usa) los datos|con que licencias?|licencias? de los datos|cual es la fuente|fuentes? (?:de (?:la )?)?(?:informacion|respuestas?)|de donde (?:sacaste|viene|sale) (?:esa|esta|la) (?:informacion|respuesta)|referencias?)\\b",
        "balancear" to "\\bbalance\\w*|\\bajust\\w+ (?:la |una )?ecuacion\\b|\\bigual\\w+ (?:la |una )?ecuacion\\b|\\bajust\\w+ (?:los )?coeficientes\\b|\\bequilibr\\w+ (?:la |una )?ecuacion\\b",
        "conversao" to "\\b(?:convert\\w+|convierte|transform\\w+|pasar|pasa|equival\\w+|cuantos? \\S+(?: \\S+)? (?:tiene|hay|son|equivalen|existen|corresponden|caben)|cuantas? \\S+(?: \\S+)? (?:tiene|hay|son|equivalen|existen|corresponden|caben)|en cuantos?)\\b",
        "ph" to "\\b(?:ph|poh)\\b|\\bacidez de\\b|\\bbasicidad\\b|\\balcalinidad\\b",
        "gas" to "\\b(?:gas(?:es)? ideal(?:es)?|gas perfecto|pv ?= ?nrt|pvnrt|ley de los gases|ecuacion (?:de clapeyron|de los gases|general de los gases|de estado)|clapeyron|volumen (?:molar|de un gas|del gas)|presion (?:de un gas|del gas)|ley de boyle|ley de charles|gay lussac|(?:volumen|presion|temperatura) de .{0,24}\\bgas(?:es)?)\\b",
        "gasVariavel" to "\\bgas(?:es)?\\b",
        "concentracao" to "\\b(?:molaridad|concentracion|concentrad[ao]|diluci\\w*|diluir|diluye|diluido|c1 ?v1|c1v1|fraccion (?:en masa|masica)|porcentaje (?:en )?masa|tanto por ciento en masa|partes por millon|ppm|normalidad|molalidad|solucion de|disolucion de|gramos por litro|mol l|mol por litro|moles por litro|g l)\\b",
        "estequiometria" to "\\b(?:estequiometri\\w*|reactivo (?:limitante|en exceso)|limitante|exceso de reactivo|rendimiento|cuantos? (?:moles?|mols?|gramos?|moleculas?|atomos?|litros?|iones?|particulas?|kilos?|mg|miligramos?)\\b|cuantas? (?:moleculas|particulas|gramos|moles|litros)|numero de (?:moles?|moleculas|atomos|particulas|iones)|condiciones normales|cn|tpn|volumen ocupado|constante de avogadro|numero de avogadro)\\b",
        "massaMolar" to "\\b(?:masa molar|masa molecular|masa formula|peso molecular|peso molar|cuanto pesa (?:un )?mol|cuanto vale (?:la )?masa molar)\\b|\\bg mol\\b",
        "desenhar" to "\\b(?:dibuj\\w+|estructura (?:2d|molecular|quimica|plana|de lewis|del|de la|de)|estructura|muestr\\w+ (?:la )?(?:estructura|molecula)|molecula (?:del|de la|de)|como es (?:la )?(?:molecula|estructura)|formula estructural|geometria molecular|visualizar|esqueleto)\\b",
        "comparar" to "\\b(?:compar\\w+|diferencias? entre|\\bversus\\b|\\bvs\\b|cual es la diferencia|semejanza\\w*|similitud\\w*|igual a|parecid\\w+|cual (?:es |tiene |pesa |pesan |tienen )?(?:mas|menos|mayor|menor)\\b)\\b",
        "seguranca" to "\\b(?:peligr\\w+|toxic\\w+|segur\\w+|epp|epis?\\b|equipos? de proteccion|primeros auxilios|derram\\w+|fuga\\w*|almacen\\w+|incendi\\w+|inflamab\\w+|corrosiv\\w+|irritant\\w+|irrita\\w*|ghs|sga|pictogramas?|frases? h\\b|indicaciones? de peligro|ficha de (?:datos de )?seguridad|fds|icsc|mezcl\\w+|incompatib\\w+|desech\\w+|eliminaci\\w+|manipul\\w+|inhal\\w+|ingest\\w+|quemadur\\w+|venenos\\w+|veneno|hace dano|hacen dano|neutraliz\\w+|guantes|gafas de proteccion|palabra de advertencia|clasificacion de peligro|es seguro|es peligroso|cancerigen\\w+|explosiv\\w+|reacciona con agua|reactiv\\w+ con)\\b",
        "nomenclatura" to "\\b(?:cual es (?:el )?nombre|como se llama|nombre (?:quimico|iupac|sistematico|cientifico|oficial)|nomenclatura|como se escribe|cual es (?:la )?formula(?: quimica| molecular)?|formula (?:del|de la|de|quimica del|quimica de la|molecular del|molecular de la)|nombre del compuesto)\\b",
        "tabela" to "\\b(?:tabla periodica|periodicidad|tendencia\\w*|grupo \\d{1,2}|familia \\d{1,2}|periodo \\d|bloque [spdf]|elementos? (?:del|de la|de los|de las) (?:grupo|periodo|bloque|familia)|cuales (?:son )?(?:los )?elementos|cuantos elementos|elementos (?:gaseosos|liquidos|solidos)|metales|no metales|semimetales|metaloides|halogenos?|gases? nobles?|alcalinoterreos?|alcalino terreos?|alcalinos?|lantanidos?|actinidos?|elemento mas|elementos mas|orden creciente|orden decreciente|mayor (?:radio|electronegatividad|energia|punto|masa|densidad)|menor (?:radio|electronegatividad|energia|punto|masa|densidad))\\b",
        "conceitoCue" to "^(?:que (?:es|son|significa|quiere decir|seria)|explic\\w*|defin\\w+|concepto de|definicion de|explicame|como funciona\\w*|por que|porque|para que sirve|cual es (?:la )?(?:definicion|diferencia|importancia|funcion)|diferencia entre|ensen\\w+|resum\\w+)\\b",
        "conceitoTemas" to "\\b(?:mol|ph|estequiometria|enlace (?:ionico|covalente|metalico|quimico)|electronegatividad|oxidacion|reduccion|oxidorreduccion|redox|equilibrio quimico|entalpia|entropia|isomeria|acido|base|sal|oxido|solucion|disolucion|concentracion|molaridad|dilucion|tabla periodica|reaccion quimica|cinetica|catalizador|electrolisis|pila|polaridad|fuerzas? intermoleculares?)\\b"
    )

    private fun n_pistas_limparConceito(): List<Any?> = listOf<Any?>(
        "^(?:es |son |significa |quiere decir |seria )",
        "^(?:un |una |el |la |los |las |de |del )+"
    )

    private fun n_pistas(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "querCalcular" to "\\b(?:limitante|rendimiento|cuantos?|cuantas?|masa de|gramos?|moles?|mols?|produc\\w*|form\\w*|obt\\w+|reaccion\\w*|consum\\w+|sobra\\w*|exceso|volumen|litros?)\\b",
        "conversaoPreposicoes" to "(?:->|→| en | a | hacia | to )",
        "paraUnidade" to "\\b(?:a|en|hacia|hasta)\\s+(?:el |la |los |las )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| por litro| de mercurio)?)\\s*[?!.]*\$",
        "quantosUnidade" to "^\\s*[¿¡]?\\s*(?:cu[aá]ntos?|cu[aá]ntas?)\\s+((?:grados\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:tiene|tienen|hay|son|equivalen|existen|corresponden|vale|valen|caben)(?![A-Za-zÀ-ÿ])",
        "phContexto" to "\\b(?:acido|base|solucion|disolucion)\\b",
        "conector" to "\\bde\\b",
        "prefixoExplicacao" to "^(?:que es|que son|explic|defin|concepto|como funciona|por que|porque)",
        "prefixoExplicacaoPalavra" to "^(?:que es|que son|explic\\w*|defin\\w*|concepto|como funciona|por que|porque)\\b",
        "prefixoDefinicao" to "^(?:que es|que son|explic\\w*|defin\\w*|concepto)\\b",
        "gasGrandezas" to "\\b(?:volumen|presion|temperatura|moles?|mols?|cuantos)\\b",
        "concentracaoForte" to "\\bdilu\\w*|molaridad|concentracion\\b",
        "propriedadesPalavra" to "\\bpropiedades\\b",
        "mistura" to "\\b(?:mezcl\\w+|junto con|juntos|combinar|mezclado|mezclada|incompatib\\w+)\\b",
        "elementoPalavra" to "\\belementos?\\b",
        "gasSubstancia" to "\\bgas\\b",
        "tendencia" to "\\btendencia\\w*|\\bperiodicidad|\\bvari\\w* (?:a lo largo|en el periodo|en el grupo)|\\ba lo largo (?:del|de un) (?:periodo|grupo)",
        "tabelaPalavra" to "\\btabla periodica\\b",
        "grupo" to "\\b(?:grupo|familia)\\s+(\\d{1,2})\\b",
        "periodo" to "\\bperiodo\\s+(\\d)\\b",
        "bloco" to "\\bbloque\\s+([spdf])\\b",
        "continuacao" to "^y (?:el |la |los |las )?(?:de |del |de la |de los |de las )?",
        "limparConceito" to n_pistas_limparConceito(),
        "constantes" to "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|igual a|vale)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
        "quantidadeComplemento" to "(?:de|por)",
        "letrasUnidade" to "A-Za-zñáéíóú",
        "ligacaoPreposicoes" to "(?:de|del)",
        "diluicao" to "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
        "percentualMassa" to "\\bmasa|porcent|por ciento|fraccion\\b",
        "cntp" to "\\b(?:condiciones normales|cn|tpn|volumen)\\b",
        "cueElemento" to "\\b(?:elemento|simbolo|simbolo quimico)\\b"
    )

    private fun n_nivel(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "fundamental" to "\\b(?:primaria|escuela primaria|secundaria basica|nino|ninos|simple|muy simple|facil de entender|para principiantes)\\b",
        "medio" to "\\b(?:bachillerato|secundaria|preparatoria|liceo|selectividad)\\b",
        "superior" to "\\b(?:universidad|facultad|superior|avanzado|grado|a fondo|detallad\\w+)\\b"
    )

    private fun n_unidades_0(): List<Any?> = listOf<Any?>(
        "^grados? (?:celsius|centigrados?)\$|^celsius\$",
        "°C"
    )

    private fun n_unidades_1(): List<Any?> = listOf<Any?>(
        "^grados? fahrenheit\$|^fahrenheit\$",
        "°F"
    )

    private fun n_unidades_2(): List<Any?> = listOf<Any?>(
        "^kelvins?\$|^kelvines\$",
        "K"
    )

    private fun n_unidades_3(): List<Any?> = listOf<Any?>(
        "^atmosferas?\$",
        "atm"
    )

    private fun n_unidades_4(): List<Any?> = listOf<Any?>(
        "^pascales\$|^pascal\$",
        "Pa"
    )

    private fun n_unidades_5(): List<Any?> = listOf<Any?>(
        "^kilopascales\$|^kilopascal\$",
        "kPa"
    )

    private fun n_unidades_6(): List<Any?> = listOf<Any?>(
        "^milimetros? de mercurio\$",
        "mmHg"
    )

    private fun n_unidades_7(): List<Any?> = listOf<Any?>(
        "^litros?\$",
        "L"
    )

    private fun n_unidades_8(): List<Any?> = listOf<Any?>(
        "^mililitros?\$",
        "mL"
    )

    private fun n_unidades_9(): List<Any?> = listOf<Any?>(
        "^microlitros?\$",
        "µL"
    )

    private fun n_unidades_10(): List<Any?> = listOf<Any?>(
        "^gramos?\$",
        "g"
    )

    private fun n_unidades_11(): List<Any?> = listOf<Any?>(
        "^miligramos?\$",
        "mg"
    )

    private fun n_unidades_12(): List<Any?> = listOf<Any?>(
        "^kilogramos?\$|^kilos?\$",
        "kg"
    )

    private fun n_unidades_13(): List<Any?> = listOf<Any?>(
        "^toneladas?\$",
        "t"
    )

    private fun n_unidades_14(): List<Any?> = listOf<Any?>(
        "^moles?\$|^mols?\$",
        "mol"
    )

    private fun n_unidades_15(): List<Any?> = listOf<Any?>(
        "^milimoles?\$",
        "mmol"
    )

    private fun n_unidades_16(): List<Any?> = listOf<Any?>(
        "^kilomoles?\$",
        "kmol"
    )

    private fun n_unidades_17(): List<Any?> = listOf<Any?>(
        "^julios?\$|^joules?\$",
        "J"
    )

    private fun n_unidades_18(): List<Any?> = listOf<Any?>(
        "^calorias?\$",
        "cal"
    )

    private fun n_unidades_19(): List<Any?> = listOf<Any?>(
        "^kilocalorias?\$",
        "kcal"
    )

    private fun n_unidades_20(): List<Any?> = listOf<Any?>(
        "^kilojulios?\$|^kilojoules?\$",
        "kJ"
    )

    private fun n_unidades_21(): List<Any?> = listOf<Any?>(
        "^molar(?:es)?\$",
        "mol/L"
    )

    private fun n_unidades_22(): List<Any?> = listOf<Any?>(
        "^mol por litro\$|^moles por litro\$",
        "mol/L"
    )

    private fun n_unidades_23(): List<Any?> = listOf<Any?>(
        "^gramos? por litro\$",
        "g/L"
    )

    private fun n_unidades_24(): List<Any?> = listOf<Any?>(
        "^(?:moleculas?|atomos?|particulas?|iones?|unidades|entidades)\$",
        "particulas"
    )

    private fun n_unidades_25(): List<Any?> = listOf<Any?>(
        "^metros?\$",
        "m"
    )

    private fun n_unidades_26(): List<Any?> = listOf<Any?>(
        "^centimetros?\$",
        "cm"
    )

    private fun n_unidades_27(): List<Any?> = listOf<Any?>(
        "^milimetros?\$",
        "mm"
    )

    private fun n_unidades_28(): List<Any?> = listOf<Any?>(
        "^nanometros?\$",
        "nm"
    )

    private fun n_unidades_29(): List<Any?> = listOf<Any?>(
        "^kilometros?\$",
        "km"
    )

    private fun n_unidades_30(): List<Any?> = listOf<Any?>(
        "^por ?ciento\$",
        "%"
    )

    private fun n_unidades_31(): List<Any?> = listOf<Any?>(
        "^bar(?:es)?\$",
        "bar"
    )

    private fun n_unidades_32(): List<Any?> = listOf<Any?>(
        "^torrs?\$",
        "Torr"
    )

    private fun n_unidades_33(): List<Any?> = listOf<Any?>(
        "^horas?\$",
        "h"
    )

    private fun n_unidades_34(): List<Any?> = listOf<Any?>(
        "^minutos?\$",
        "min"
    )

    private fun n_unidades_35(): List<Any?> = listOf<Any?>(
        "^segundos?\$",
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
        "\\balcalino ?terre\\w*|\\balcalinos ?terre\\w*",
        "metal_alcalino_terroso"
    )

    private fun n_categorias_1(): List<Any?> = listOf<Any?>(
        "\\bmetal(?:es)? alcalinos?|\\balcalinos\\b",
        "metal_alcalino"
    )

    private fun n_categorias_2(): List<Any?> = listOf<Any?>(
        "\\bmetal(?:es)? de transicion|\\belementos? de transicion",
        "metal_transicao"
    )

    private fun n_categorias_3(): List<Any?> = listOf<Any?>(
        "\\bpos ?transicion|\\bmetal(?:es)? representativos?",
        "metal_pos_transicao"
    )

    private fun n_categorias_4(): List<Any?> = listOf<Any?>(
        "\\bsemimetal(?:es)?|\\bmetaloides?",
        "semimetal"
    )

    private fun n_categorias_5(): List<Any?> = listOf<Any?>(
        "\\bno metal(?:es)?",
        "nao_metal"
    )

    private fun n_categorias_6(): List<Any?> = listOf<Any?>(
        "\\bhalogenos?",
        "halogenio"
    )

    private fun n_categorias_7(): List<Any?> = listOf<Any?>(
        "\\bgas(?:es)? nobles?|\\bnobles\\b",
        "gas_nobre"
    )

    private fun n_categorias_8(): List<Any?> = listOf<Any?>(
        "\\blantanidos?|\\btierras raras",
        "lantanideo"
    )

    private fun n_categorias_9(): List<Any?> = listOf<Any?>(
        "\\bactinidos?|\\bactinoides?",
        "actinideo"
    )

    private fun n_categorias_10(): List<Any?> = listOf<Any?>(
        "\\bmetales\\b|\\bmetal\\b",
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
        "\\b(?:gaseosos?|gases|en estado gaseoso)\\b",
        "gas"
    )

    private fun n_estados_1(): List<Any?> = listOf<Any?>(
        "\\bliquidos?\\b",
        "liquido"
    )

    private fun n_estados_2(): List<Any?> = listOf<Any?>(
        "\\bsolidos?\\b",
        "solido"
    )

    private fun n_estados(): List<Any?> = listOf<Any?>(
        n_estados_0(),
        n_estados_1(),
        n_estados_2()
    )

    private fun n_extremos_0(): List<Any?> = listOf<Any?>(
        "\\bmas electronegativ\\w+|\\bmayor electronegatividad",
        "eletronegatividade",
        "max"
    )

    private fun n_extremos_1(): List<Any?> = listOf<Any?>(
        "\\bmenos electronegativ\\w+|\\bmenor electronegatividad",
        "eletronegatividade",
        "min"
    )

    private fun n_extremos_2(): List<Any?> = listOf<Any?>(
        "\\bmas densos?\\b|\\bmayor densidad",
        "densidadeKgm3",
        "max"
    )

    private fun n_extremos_3(): List<Any?> = listOf<Any?>(
        "\\bmenos densos?\\b|\\bmenor densidad|\\bmas liviano|\\bmas ligero",
        "densidadeKgm3",
        "min"
    )

    private fun n_extremos_4(): List<Any?> = listOf<Any?>(
        "\\bmayor radio|\\bmas voluminos\\w+",
        "raioAtomicoPm",
        "max"
    )

    private fun n_extremos_5(): List<Any?> = listOf<Any?>(
        "\\bmenor radio",
        "raioAtomicoPm",
        "min"
    )

    private fun n_extremos_6(): List<Any?> = listOf<Any?>(
        "\\bmayor punto de fusion",
        "pontoFusaoK",
        "max"
    )

    private fun n_extremos_7(): List<Any?> = listOf<Any?>(
        "\\bmenor punto de fusion",
        "pontoFusaoK",
        "min"
    )

    private fun n_extremos_8(): List<Any?> = listOf<Any?>(
        "\\bmayor punto de ebullicion",
        "pontoEbulicaoK",
        "max"
    )

    private fun n_extremos_9(): List<Any?> = listOf<Any?>(
        "\\bmenor punto de ebullicion",
        "pontoEbulicaoK",
        "min"
    )

    private fun n_extremos_10(): List<Any?> = listOf<Any?>(
        "\\bmayor energia de ionizacion",
        "energiaIonizacaoKJmol",
        "max"
    )

    private fun n_extremos_11(): List<Any?> = listOf<Any?>(
        "\\bmenor energia de ionizacion",
        "energiaIonizacaoKJmol",
        "min"
    )

    private fun n_extremos_12(): List<Any?> = listOf<Any?>(
        "\\bmas pesad\\w+|\\bmayor masa atomica",
        "massaAtomica",
        "max"
    )

    private fun n_extremos_13(): List<Any?> = listOf<Any?>(
        "\\bmenor masa atomica",
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
        "numero atomico",
        "z"
    )

    private fun n_propriedades_massaAtomica(): List<Any?> = listOf<Any?>(
        "masa atomica",
        "peso atomico",
        "masa del atomo"
    )

    private fun n_propriedades_simbolo(): List<Any?> = listOf<Any?>(
        "simbolo"
    )

    private fun n_propriedades_grupo(): List<Any?> = listOf<Any?>(
        "grupo",
        "familia"
    )

    private fun n_propriedades_periodo(): List<Any?> = listOf<Any?>(
        "periodo"
    )

    private fun n_propriedades_bloco(): List<Any?> = listOf<Any?>(
        "bloque"
    )

    private fun n_propriedades_categoria(): List<Any?> = listOf<Any?>(
        "categoria",
        "clasificacion",
        "tipo de elemento",
        "clase del elemento"
    )

    private fun n_propriedades_configuracaoEletronica(): List<Any?> = listOf<Any?>(
        "configuracion electronica",
        "distribucion electronica"
    )

    private fun n_propriedades_eletronegatividade(): List<Any?> = listOf<Any?>(
        "electronegatividad"
    )

    private fun n_propriedades_raioAtomicoPm(): List<Any?> = listOf<Any?>(
        "radio atomico",
        "radio de van der waals",
        "tamano del atomo"
    )

    private fun n_propriedades_afinidadeEletronicaKJmol(): List<Any?> = listOf<Any?>(
        "afinidad electronica",
        "electroafinidad"
    )

    private fun n_propriedades_energiaIonizacaoKJmol(): List<Any?> = listOf<Any?>(
        "energia de ionizacion",
        "potencial de ionizacion",
        "primera energia de ionizacion"
    )

    private fun n_propriedades_pontoFusaoK(): List<Any?> = listOf<Any?>(
        "punto de fusion",
        "temperatura de fusion",
        "fusion",
        "se derrite",
        "se funde",
        "funde"
    )

    private fun n_propriedades_pontoEbulicaoK(): List<Any?> = listOf<Any?>(
        "punto de ebullicion",
        "temperatura de ebullicion",
        "ebullicion",
        "hierve"
    )

    private fun n_propriedades_densidadeKgm3(): List<Any?> = listOf<Any?>(
        "densidad",
        "masa especifica"
    )

    private fun n_propriedades_estadoPadrao(): List<Any?> = listOf<Any?>(
        "estado fisico",
        "estado estandar",
        "estado de la materia",
        "es solido",
        "es liquido",
        "es gaseoso",
        "es un gas"
    )

    private fun n_propriedades_estadosOxidacao(): List<Any?> = listOf<Any?>(
        "estados de oxidacion",
        "numeros de oxidacion",
        "estado de oxidacion",
        "numero de oxidacion",
        "valencia"
    )

    private fun n_propriedades_descoberta(): List<Any?> = listOf<Any?>(
        "descubrimiento",
        "descubrio",
        "descubridor",
        "quien descubrio",
        "ano de descubrimiento",
        "cuando se descubrio",
        "fue descubierto",
        "fue descubierta",
        "fueron descubiertos"
    )

    private fun n_propriedades_massaMolar(): List<Any?> = listOf<Any?>(
        "masa molar",
        "masa molecular",
        "peso molecular",
        "peso molar",
        "masa formula"
    )

    private fun n_propriedades_massaExata(): List<Any?> = listOf<Any?>(
        "masa exacta",
        "masa monoisotopica"
    )

    private fun n_propriedades_formula(): List<Any?> = listOf<Any?>(
        "formula",
        "formula molecular",
        "formula quimica"
    )

    private fun n_propriedades_cas(): List<Any?> = listOf<Any?>(
        "numero cas",
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
        "nombre iupac",
        "nombre sistematico",
        "iupac"
    )

    private fun n_propriedades_xlogp(): List<Any?> = listOf<Any?>(
        "xlogp",
        "logp",
        "lipofilicidad",
        "coeficiente de reparto"
    )

    private fun n_propriedades_doadoresH(): List<Any?> = listOf<Any?>(
        "donadores de hidrogeno",
        "donantes de enlace de hidrogeno",
        "donadores de enlace de hidrogeno"
    )

    private fun n_propriedades_aceptoresH(): List<Any?> = listOf<Any?>(
        "aceptores de hidrogeno",
        "aceptores de enlace de hidrogeno"
    )

    private fun n_propriedades_ligacoesRotaveis(): List<Any?> = listOf<Any?>(
        "enlaces rotables",
        "enlaces rotatorios"
    )

    private fun n_propriedades_carga(): List<Any?> = listOf<Any?>(
        "carga electrica",
        "carga formal"
    )

    private fun n_propriedades_tpsa(): List<Any?> = listOf<Any?>(
        "tpsa",
        "area de superficie polar"
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
        "el",
        "la",
        "los",
        "las",
        "un",
        "una",
        "de",
        "del",
        "y",
        "que",
        "en",
        "para",
        "por",
        "con",
        "cual",
        "cuales",
        "como",
        "se",
        "es",
        "son",
        "ser",
        "quiere",
        "decir",
        "significa",
        "explica",
        "explique",
        "define",
        "concepto",
        "porque",
        "me",
        "funciona",
        "lo"
    )

    private fun n_stopPalavras(): List<Any?> = listOf<Any?>(
        "de",
        "del",
        "la",
        "el",
        "los",
        "las",
        "y",
        "o",
        "un",
        "una",
        "en",
        "que",
        "para",
        "por",
        "con",
        "al",
        "se",
        "es"
    )

    private fun n_palavrasFuncionais(): List<Any?> = listOf<Any?>(
        "sobre",
        "entre",
        "como",
        "donde",
        "cuando",
        "cual",
        "cuales",
        "mas",
        "menos",
        "mucho",
        "poco",
        "todo",
        "nada",
        "tambien",
        "porque",
        "entonces",
        "asi",
        "aun",
        "despues",
        "antes",
        "ahora",
        "siempre",
        "nunca",
        "sea",
        "fue",
        "ser",
        "son",
        "esta",
        "estan",
        "tiene",
        "tener",
        "habla",
        "dime",
        "muestra",
        "explica",
        "quimica",
        "favor",
        "quisiera",
        "queria",
        "podria",
        "puede",
        "quiero",
        "necesito",
        "fuentes",
        "fuente",
        "datos",
        "ayuda",
        "licencia",
        "licencias",
        "informacion",
        "version",
        "referencia",
        "referencias",
        "offline",
        "gratis",
        "gratuito",
        "enlace",
        "enlaces",
        "estado",
        "estados"
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
        "Tu"
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
        "OH"
    )

    private fun n_seguranca_acao(): List<Any?> = listOf<Any?>(
        "hac(?:er|iendo|en|ia|go|e)",
        "fabric(?:ar|ando|o|a|an|aci\\w+)",
        "produc(?!ao|oes)\\w*",
        "elabor\\w*",
        "prepar\\w*",
        "sintetiz\\w*",
        "sintesis",
        "obtener",
        "obtenci\\w*",
        "obtengo",
        "conseguir",
        "adquirir",
        "comprar",
        "compra",
        "vender",
        "vent\\w+ (?:de|del)",
        "trafic\\w*",
        "contraband\\w*",
        "desvi\\w+",
        "burl\\w+",
        "esconder",
        "escond\\w+",
        "ocultar",
        "extraer",
        "extracci\\w*",
        "extrae",
        "cocinar",
        "cocin\\w+",
        "montar",
        "monto",
        "constru(?:ir|yo|ye|yen|yendo|ccion)",
        "armar",
        "crear",
        "crea",
        "generar",
        "genero",
        "genera",
        "purific\\w*",
        "refin\\w+",
        "cristaliz\\w*",
        "destil\\w*",
        "escal(?:ar|a|ando|e)",
        "gran escala",
        "aument\\w+ (?:la |el |de )?(?:produccion|rendimiento|escala|potencia|pureza)",
        "receta",
        "paso a paso",
        "tutorial",
        "instrucci\\w+",
        "ensen\\w*",
        "ruta de sintesis",
        "procedimiento (?:de|para)",
        "protocolo (?:de|para)",
        "como (?:se )?(?:hace|fabrica|produce|prepara|sintetiza|obtiene|extrae|cocina|monta|arma)",
        "cantidad de .{1,40} para (?:hacer|producir|preparar)",
        "que reactivos",
        "cuales reactivos",
        "que necesito para (?:hacer|producir)",
        "ingredientes para",
        "materiales para (?:hacer|montar|producir|armar)"
    )

    private fun n_seguranca_contextoSeguro(): List<Any?> = listOf<Any?>(
        "desech\\w*",
        "eliminaci\\w*",
        "neutraliz\\w*",
        "almacen\\w*",
        "guard\\w*",
        "manej\\w*",
        "manipul\\w*",
        "primeros auxilios",
        "epp",
        "epis?",
        "derram\\w*",
        "fuga\\w*",
        "salpicadura\\w*",
        "inhal(?:ar|e|o|ado|acion)",
        "ingeri\\w*",
        "ingest\\w*",
        "quemadura\\w*",
        "intoxicaci\\w+ (?:por|con)",
        "primera atencion",
        "equipo de proteccion",
        "proteccion personal",
        "guantes",
        "gafas de proteccion",
        "mascarilla",
        "que hacer (?:si|cuando|en caso)",
        "que (?:debo|puedo) hacer (?:si|cuando|en caso)",
        "en caso de",
        "ficha de (?:datos de )?seguridad",
        "fds",
        "icsc",
        "reciclar",
        "reciclaje"
    )

    private fun n_seguranca_alvoExplosivos(): List<Any?> = listOf<Any?>(
        "explosiv\\w*",
        "dinamita",
        "tnt",
        "trinitrotolueno",
        "nitroglicerina",
        "c ?4 explosiv\\w*",
        "c-4",
        "rdx",
        "hmx",
        "petn",
        "hmtd",
        "tatp",
        "peroxido de acetona",
        "triperoxido de triacetona",
        "azida de (?:plomo|sodio)",
        "fulminato\\w*",
        "anfo",
        "picrato\\w*",
        "tetril",
        "polvora(?: negra| sin humo)?",
        "nitrato de amonio (?:con|y|\\+|mas) (?:diesel|gasoil|aceite|combustible|gasolina)",
        "bombas? (?:caseras?|artesanal(?:es)?|improvisadas?|quimicas?|incendiarias?|de humo|de presion|de relojeria|de clavos|de tubo)",
        "pipe bomb",
        "coctel(?:es)? molotov|cocteles? molotov",
        "molotov",
        "napalm",
        "explosives?",
        "nitroglycerin",
        "gunpowder",
        "granadas?",
        "artefactos? explosivos?",
        "detonador(?:es)?",
        "mecha de bomba",
        "fuegos artificiales(?: caseros)?",
        "pirotecnia casera",
        "termita",
        "thermite",
        "material incendiario",
        "bomba atomica",
        "bomba sucia",
        "explosivo",
        "dinamite",
        "polvora"
    )

    private fun n_seguranca_alvoArmas(): List<Any?> = listOf<Any?>(
        "sarin",
        "soman",
        "tabun",
        "vx",
        "nerve agents?",
        "chemical weapons?",
        "mustard gas",
        "novichok",
        "agentes? (?:nervios\\w*|neurotoxic\\w*|vesicant\\w*|quimic\\w*(?: de guerra)?)",
        "armas? quimic\\w*",
        "armas? bacteriologic\\w*",
        "arma de destruccion masiva",
        "gas(?:es)? (?:mostaza|sarin|nervios\\w*|lacrimogeno\\w*|toxic\\w*|venenos\\w*|letal(?:es)?|asfixiante\\w*|de guerra|cloro|fosgeno)",
        "mostaza (?:sulfurada|nitrogenada|de azufre)",
        "fosgeno",
        "cloropicrina",
        "lewisita",
        "ricina",
        "cianuro(?: de hidrogeno| de potasio| de sodio)?",
        "acido cianhidrico",
        "cloraminas?",
        "arsina",
        "fosfina",
        "toxina botulinica",
        "antrax",
        "cloro gaseoso",
        "cloro en gas",
        "acido sulfhidrico",
        "sulfuro de hidrogeno",
        "monoxido de carbono para (?:matar|herir|envenenar)",
        "arma quimica",
        "gas sarin"
    )

    private fun n_seguranca_alvoDrogas(): List<Any?> = listOf<Any?>(
        "metanfetaminas?",
        "methamphetamine",
        "cocaine",
        "heroin",
        "meth",
        "cristal",
        "cocaina",
        "crack(?! (?:the|a|an|this|that|open|code|codes|password|passwords|egg|eggs|nut|nuts|joke|jokes|down|in|up))",
        "pasta base|paco|basuco",
        "heroina",
        "lsd",
        "acido lisergico",
        "mdma",
        "extasis",
        "ecstasy",
        "molly",
        "fentanilo?",
        "fentanyl",
        "pcp",
        "fenciclidina",
        "ketamina",
        "dmt",
        "dimetiltriptamina",
        "mescalina",
        "psilocibina",
        "hongos? alucinogenos?|hongos? magicos?",
        "anfetaminas?",
        "ghb",
        "gbh",
        "oxicodona",
        "opio",
        "marihuana",
        "mariguana",
        "cannabis",
        "hachis",
        "thc",
        "cannabinoides? sinteticos?",
        "spice(?! ?(?:rack|racks|mix|mixes|blend|blends|cabinet|jar|jars|girls))",
        "sales de bano",
        "catinonas? sinteticas?",
        "drogas? sinteticas?",
        "drogas? ilicitas?|drogas? ilegales?",
        "estupefacientes?",
        "narcoticos?",
        "laboratorio clandestino",
        "narcolaboratorio",
        "cocina de drogas"
    )

    private fun n_seguranca_precursoresNomes(): List<Any?> = listOf<Any?>(
        "efedrina",
        "pseudoefedrina",
        "norefedrina",
        "safrol",
        "isosafrol",
        "piperonal",
        "fenilacetona",
        "p2p",
        "fenil-?2-?propanona",
        "acido fenilacetico",
        "anhidrido acetico",
        "ergotamina",
        "ergometrina",
        "acido antranilico",
        "n-?acetilantranilico",
        "acido lisergico",
        "precursores? (?:de|del|para|quimicos?|controlados?)",
        "precursores? controlados?",
        "yodo rojo",
        "fosforo rojo"
    )

    private fun n_seguranca_alvoDano(): List<Any?> = listOf<Any?>(
        "envenen\\w+ (?:a alguien|a una persona|a mi|al|a la|a un|a una|a algunos?|a un animal|animales|al perro|al gato|a los? ninos?|a mi vecin\\w+|a mi colega|a mi profesor\\w*|a mi jefe|a mi marido|a mi esposa|a mi mujer|a mi novi\\w+|a mi ex)",
        "matar (?:a alguien|a una persona|a mi|al|a la|a un|a una)",
        "asesinar",
        "intoxicar (?:a alguien|a una persona|a proposito|intencionalmente)",
        "venenos? (?:indetectable\\w*|que no (?:deja|dejan) rastro\\w*|sin rastro\\w*|letal(?:es)?|mortal(?:es)?|caseros?)",
        "dosis letal para matar",
        "herir (?:a alguien|a una persona)",
        "quemar (?:a alguien|a una persona) con (?:acido|quimico)",
        "tirar acido a|arrojar acido a|echar acido a",
        "atacar (?:a alguien|a una persona) con",
        "envenenar alguem",
        "matar alguem"
    )

    private fun n_seguranca_alvoAutolesao(): List<Any?> = listOf<Any?>(
        "matarme",
        "suicidarme",
        "suicidio",
        "suicidarse",
        "suicidar\\w*",
        "quitarme la vida",
        "acabar con mi vida",
        "envenenarme",
        "quiero morir",
        "morir sin dolor",
        "morir sin sufrir",
        "sobredosis para morir",
        "hacerme dano",
        "lastimarme",
        "herirme",
        "cortarme",
        "intoxicarme a proposito",
        "me matar",
        "suicidio"
    )

    private fun n_seguranca_perigososCaseiros(): List<Any?> = listOf<Any?>(
        "acido (?:sulfurico|nitrico|clorhidrico|muriatico|fluorhidrico|perclorico|picrico|cianhidrico)",
        "agua regia",
        "cloro(?: gaseoso| en gas)?",
        "gas cloro",
        "cianuro\\w*",
        "arsenico",
        "arsina",
        "fosfina",
        "fosgeno",
        "mercurio",
        "fosforo (?:blanco|rojo)",
        "sodio metalico",
        "potasio metalico",
        "amoniaco anhidro",
        "clorato\\w*",
        "perclorato\\w*",
        "peroxido de (?:acetona|metil\\w*|benzoilo)",
        "agua oxigenada (?:concentrada|de? \\d+ ?volumenes?)",
        "peroxido de hidrogeno concentrado",
        "nitrato de (?:amonio|potasio)(?: concentrado)?",
        "permanganato de potasio",
        "acido sulfhidrico",
        "sulfuro de hidrogeno",
        "monoxido de carbono",
        "gas(?:es)? (?:toxic\\w*|venenos\\w*|inflamable\\w*|asfixiante\\w*)",
        "fluoruro\\w*",
        "acido fluorhidrico",
        "venenos?",
        "toxinas?",
        "napalm",
        "termita",
        "thermite",
        "nitrocelulosa",
        "nitroglicerina",
        "tolueno nitrado",
        "acetona y agua oxigenada",
        "lejia y (?:amoniaco|acido|vinagre)",
        "cloro y amoniaco",
        "sosa y aluminio"
    )

    private fun n_seguranca_casa(): List<Any?> = listOf<Any?>(
        "en casa",
        "caser[oa]s?",
        "artesanal(?:es)?",
        "improvisad[oa]s?",
        "en la cocina",
        "en el patio",
        "en el garaje",
        "en el bano",
        "en el apartamento|en el piso|en el departamento",
        "con productos? (?:de casa|domesticos?|de limpieza|del supermercado|de farmacia)",
        "sin laboratorio",
        "hagalo usted mismo|hazlo tu mismo",
        "diy",
        "con materiales? (?:facil(?:es)?|de casa|domesticos?|comunes)",
        "usando (?:solo |apenas )?productos? (?:de casa|domesticos?|de limpieza)",
        "em casa",
        "caseiro"
    )

    private fun n_seguranca_coladaAlvos(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "EXPLOSIVOS" to listOf<Any?>(
            "explosivo",
            "nitroglicerina",
            "dinamita",
            "trinitrotolueno",
            "peroxidodeacetona",
            "molotov",
            "napalm",
            "bombacasera",
            "bombaartesanal",
            "polvora",
            "detonador",
            "fulminato",
            "tatp",
            "hmtd"
        ),
        "ARMAS_QUIMICAS" to listOf<Any?>(
            "sarin",
            "novichok",
            "gasmostaza",
            "agentenervioso",
            "armaquimica",
            "fosgeno",
            "ricina",
            "gastoxico",
            "gasvenenoso",
            "cianuro",
            "cloraminas",
            "gascloro"
        ),
        "DROGAS" to listOf<Any?>(
            "metanfetamina",
            "cocaina",
            "heroina",
            "fentanilo",
            "extasis",
            "mdma",
            "anfetamina",
            "drogassinteticas",
            "pastabase",
            "lsd",
            "ketamina"
        ),
        "PRECURSORES" to listOf<Any?>(
            "pseudoefedrina",
            "efedrina",
            "safrol",
            "fenilacetona",
            "anhidridoacetico",
            "precursores"
        )
    )

    private fun n_seguranca_coladaAcoes(): List<Any?> = listOf<Any?>(
        "sintesis",
        "sintetizar",
        "hacer",
        "fabricar",
        "producir",
        "preparar",
        "purificar",
        "refinar",
        "cocinar",
        "extraer",
        "comosehace",
        "receta",
        "pasoapaso",
        "montar",
        "armar",
        "construir",
        "obtener",
        "comprar",
        "escalar"
    )

    private fun n_seguranca(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "acao" to n_seguranca_acao(),
        "contextoSeguro" to n_seguranca_contextoSeguro(),
        "tirarFazerSeguro" to "\\b(?:que (?:yo |se )?(?:debo |puedo |necesito |debe |tengo que )?hac(?:er|go|e) (?:si|cuando|en caso|tras|despues|con|al|ante)|hac(?:er|go|e) (?:el |la |un |una )?(?:desecho|eliminacion|limpieza|neutralizacion|almacenamiento|transporte|manejo|manipulacion|dilucion|primeros auxilios)|hac(?:er|go|e) para (?:dejar|parar|superar|salir|abandonar|evitar|reducir|controlar)|(?:que dicen? (?:la |las )?(?:ley|leyes|legislacion|normativa)|(?:ley|leyes|legislacion|normativa)(?: vigente)?) (?:sobre|de|acerca de|respecto a) (?:la |el |los |las )?(?:produccion|fabricacion|elaboracion|venta|trafico|consumo|posesion|tenencia)|elabor\\w* (?:un |una |el |la |mi )?(?:informe|trabajo|resumen|ensayo|presentacion|tesis|monografia|cartel|poster|esquema|mapa))\\b",
        "alvoExplosivos" to n_seguranca_alvoExplosivos(),
        "fazerBomba" to "\\b(?:hac(?:er|iendo|e)|hag[oa]n?|haz|fabric\\w*|mont(?:ar|o|a|e|ando)|arm(?:ar|o|a|e|ando)|constru\\w+|cre(?:ar|o|a|e|ando)|elabor\\w*|produc(?:ir|o|e|a|iendo)|prepar\\w*|make|build|fazer)\\s+(?:una?\\s+|an?\\s+|la\\s+|las\\s+)?(?:bomba|bomb)s?\\b(?!\\s+(?:de\\s+)?(?:agua|calor|vacio|insulina|combustible|aire|infusion|hidraulica|calorimetrica|centrifuga|sumergible|peristaltica|de))",
        "alvoArmas" to n_seguranca_alvoArmas(),
        "alvoDrogas" to n_seguranca_alvoDrogas(),
        "precursoresNomes" to n_seguranca_precursoresNomes(),
        "precursoresAcao" to "\\b(?:extraer|extracci\\w*|obtener|comprar|conseguir|desvi\\w+|sin (?:receta|licencia|autorizacion|permiso)|burl\\w+|evadir|vender|trafic\\w*|esconder|escond\\w+|ocultar|sintesis|sintetiz\\w*)\\b",
        "alvoDano" to n_seguranca_alvoDano(),
        "alvoAutolesao" to n_seguranca_alvoAutolesao(),
        "perigososCaseiros" to n_seguranca_perigososCaseiros(),
        "casa" to n_seguranca_casa(),
        "coladaAlvos" to n_seguranca_coladaAlvos(),
        "coladaAcoes" to n_seguranca_coladaAcoes()
    )
}
