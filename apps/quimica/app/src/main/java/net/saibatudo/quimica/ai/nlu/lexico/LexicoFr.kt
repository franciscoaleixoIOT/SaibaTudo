// gerado — não editar. Fonte: contracts/lexico/fr.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxico bruto de fr (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */
internal object LexicoFr {
    fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "idioma" to "fr",
        "versao" to 1,
        "descricao" to "Lexique français de l'interpréteur local (NLU par règles) et des règles de sécurité. Même structure que pt-BR.json (vérifiée par test). Regex sous forme de TEXTE, sans drapeaux : le client met la question en minuscules sans accents (seulement [a-z0-9+-] et espaces) avant de comparer. Traduction initiale par agent (révision humaine en attente).",
        "intencoes" to n_intencoes(),
        "pistas" to n_pistas(),
        "nivel" to n_nivel(),
        "unidades" to n_unidades(),
        "numerais" to n_numerais(),
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
        "saudacao" to "^(salut+|bonjour|bonsoir|coucou|hey|hello|hi|merci|merci beaucoup|aide|help|au secours|menu|accueil|demarrer|commencer|test|essai)( tout le monde| a tous| assistant| ia| ami| ca va| comment ca va)*\$",
        "ajuda" to "\\b(?:que (?:fais[- ]tu|sais[- ]tu|peux[- ]tu faire|fait (?:l app|l application|cette app|cette application|l ia)|sait (?:l app|l application))|qu est[- ]ce que (?:tu fais|tu sais faire|l app fait|l application fait|je peux demander)|comment (?:utiliser|utilise[- ]t[- ]on|fonctionne|marche) (?:l |cette |le |l )?(?:app|application|assistant)|que puis[- ]je (?:demander|te demander|vous demander|poser)|que peut[- ]on demander|j ai besoin d aide|(?:pouvez|pouvons|peux|peut)[- ](?:vous|tu|on|nous) m aider|aidez[- ]moi|aide[- ]moi|qui a (?:fait|cree|developpe) (?:l |cette )?(?:app|application))\\b",
        "sobreDados" to "\\b(?:a propos des donnees|sur les donnees|d ou (?:viennent|proviennent) les donnees|origine des donnees|source des donnees|mise a jour des donnees|les donnees sont[- ](?:elles )?(?:a jour|mises a jour)|les donnees sont (?:a jour|mises a jour)|version des donnees|quand (?:ont ete|les donnees ont[- ]elles ete|les donnees ont ete) mises a jour|signature des donnees)\\b",
        "fontes" to "\\b(?:quelles (?:sont )?(?:les )?(?:sources|licences)|quelle licence|sous quelle licence|licences? des donnees|quelle est la source|sources? (?:de (?:l |la |cette )?)?(?:information|reponses?)|d ou (?:vient|sort|provient) (?:cette|la) (?:information|reponse)|references?|bibliographie)\\b",
        "balancear" to "\\bequilibr\\w*|\\bajust\\w+ (?:l |une |cette )?equation\\b|\\bajust\\w+ (?:les )?coefficients\\b|\\bbalanc\\w*",
        "conversao" to "\\b(?:convert\\w+|convertis|transform\\w+|passer|passe|equivau\\w+|equival\\w+|combien (?:de |d )?\\S+(?: \\S+)? (?:y a[- ]t[- ]il|il y a|font|valent|dans|correspondent|font[- ]ils)|en combien)\\b",
        "ph" to "\\b(?:ph|poh)\\b|(?<!constante d )\\bacidite de\\b|\\bbasicite\\b|\\balcalinite\\b",
        "gas" to "\\b(?:gaz parfaits?|gaz ideal|gaz ideaux|pv ?= ?nrt|pvnrt|loi des gaz|equation (?:de clapeyron|des gaz parfaits|d etat)|clapeyron|volume (?:molaire|d un gaz|du gaz)|pression (?:d un gaz|du gaz)|loi de boyle|loi de mariotte|boyle mariotte|loi de charles|gay lussac)\\b",
        "gasVariavel" to "\\bgaz\\b",
        "concentracao" to "\\b(?:molarite|concentration|concentre\\w*|dilu\\w*|c1 ?v1|c1v1|fraction massique|titre massique|pourcentage (?:en |de )?masse|pourcentage massique|pour ?cent (?:en |de )?masse|pour ?cent massique|parties par million|ppm|normalite|molalite|solution de|grammes? par litre|mol l|mol par litre|moles par litre|g l)\\b",
        "estequiometria" to "\\b(?:st(?:oe| )chiometri\\w*|reactif (?:limitant|en exces)|limitant|exces de reactif|rendement|combien de (?:moles?|mol|grammes?|molecules?|atomes?|litres?|ions?|particules?|kilos?|kilogrammes?|mg|milligrammes?)\\b|nombre de (?:moles?|molecules|atomes|particules|ions)|masse de [0-9][0-9.,]* ?(?:mol|moles?|mmol)\\b|cntp|tpn|conditions normales|volume occupe|constante d avogadro|nombre d avogadro)\\b",
        "massaMolar" to "\\b(?:masse molaire|masse moleculaire|masse formulaire|poids moleculaire|poids molaire|combien pese (?:une )?mole|quelle est la masse molaire)\\b|\\bg mol\\b",
        "desenhar" to "\\b(?:dessin\\w+|structure (?:2d|moleculaire|chimique|plane|de lewis|du|de la|de l|de)|structure|montr\\w+ (?:moi )?(?:la )?(?:structure|molecule)|molecule (?:du|de la|de l|de)|a quoi ressemble (?:la )?(?:molecule|structure)|formule (?:developpee|structurale|semi developpee)|geometrie moleculaire|visualis\\w+|squelette|schema de)\\b",
        "comparar" to "\\b(?:compar\\w+|differences? entre|\\bversus\\b|\\bvs\\b|quelle est la difference|\\blequel\\b|\\bquel(?:le)? est (?:le |la )?plus\\b|\\blaquelle\\b|ressemblance\\w*|similitude\\w*|pareil que|semblable a|similaire a|ordre (?:croissant|decroissant)|par ordre|dans l ordre|class(?:er|ez|e)\\b|rang(?:er|ez|e)\\b|ordonn\\w+|du plus \\w+ au plus|(?:qui|quel(?:le)?) (?:a|possede) (?:le |la )?(?:plus|moins))\\b",
        "seguranca" to "\\b(?:danger\\w*|dangereu\\w*|risque\\w*|toxi\\w+|securit\\w+|(?:est|est[- ]il|est[- ]elle|c est) sur\\b|epi|equipements? de protection|premiers (?:soins|secours)|deversement\\w*|renvers\\w*|fuite\\w*|stock\\w+|entrepos\\w+|incendie\\w*|feu|inflammab\\w+|corrosi\\w+|irritant\\w*|irrit\\w*|ghs|sgh|pictogramme\\w*|mentions? de danger|phrases? h\\b|fiche de (?:donnees de )?securite|fds|icsc|melang\\w+|incompatib\\w+|elimin\\w+|jeter|manipul\\w+|inhal\\w+|ingest\\w+|ingere\\w*|brulure\\w*|poison\\w*|venimeu\\w*|nocif\\w*|fait mal|est[- ]ce (?:sur|dangereux)|neutralis\\w+|gants|lunettes de protection|mention d avertissement|classification (?:de|des) danger|cancerigen\\w*|cancerogen\\w*|explosi\\w+|reagit avec l eau|reacti\\w+ avec)\\b",
        "nomenclatura" to "\\b(?:quel est (?:le |son )?nom|comment (?:s appelle|ca s appelle|on appelle|appelle[- ]t[- ]on)|nom (?:chimique|iupac|systematique|scientifique|officiel)|nomenclature|comment (?:s ecrit|ecrire|on ecrit|ecrit[- ]on)|quelle est (?:la |sa )?formule(?: chimique| brute| moleculaire)?|formule (?:du|de la|de l|de|chimique du|chimique de|brute du|brute de|moleculaire du|moleculaire de)|nom du compose)\\b",
        "tabela" to "\\b(?:tableau periodique|classification periodique|periodicite|tendance\\w*|groupe \\d{1,2}|famille \\d{1,2}|periode \\d|bloc [spdf]|elements? (?:du|de la|des|de) (?:groupe|periode|bloc|famille)|quels (?:sont )?(?:les )?elements|combien d elements|elements (?:gazeux|liquides|solides)|metaux|non metaux|semi metaux|metalloides|halogenes?|gaz nobles?|gaz rares?|alcalino terreux|alcalins?|lanthanides?|actinides?|element le plus|elements les plus|ordre croissant|ordre decroissant|plus (?:grand|grande|haut|haute|eleve|elevee) (?:rayon|electronegativite|energie|point|masse|densite)|plus (?:petit|petite|bas|basse|faible) (?:rayon|electronegativite|energie|point|masse|densite))\\b",
        "conceitoCue" to "^(?:qu est[- ]ce (?:que |qu )?|c est quoi |que (?:veut dire|signifie)|expli\\w*(?:[- ]moi)?|defin\\w+|concept de|definition (?:de|du|d)|parle[- ]moi de|dis[- ]moi (?:ce que|ce qu)|comment (?:fonctionne|marche)|pourquoi|a quoi sert|quelle est (?:la )?(?:definition|difference|importance|fonction|utilite)|difference entre|apprend\\w*[- ]moi|resum\\w+)\\b",
        "conceitoTemas" to "\\b(?:mole|ph|st(?:oe| )chiometrie|liaison (?:ionique|covalente|metallique|chimique)|electronegativite|oxydation|reduction|oxydoreduction|redox|equilibre chimique|enthalpie|entropie|isomerie|acide|base|sel|oxyde|solution|concentration|molarite|dilution|tableau periodique|reaction chimique|cinetique|catalyseur|electrolyse|pile|polarite|forces? intermoleculaires?)\\b",
        "nox" to "\\b(?:nombres? d oxydation|degres? d oxydation|etats? d oxydation)\\b",
        "entalpia" to "\\b(?:enthalpies?|variation d enthalpie|delta h|chaleur (?:de reaction|de la reaction|de combustion|liberee|degagee|absorbee)|energie (?:liberee|degagee|absorbee)|loi de hess|hess|reaction (?:exothermique|endothermique)|exothermiques?|endothermiques?)\\b",
        "equilibrio" to "\\b(?:kc|kp|constantes? d equilibre|expression (?:de|du|de la) (?:kc|kp|constante)|loi d action de masse|loi d action des masses|a l equilibre|equilibre chimique|quotient de reaction)\\b",
        "ligacao" to "\\b(?:types? de liaisons?|liaisons? (?:chimiques?|ioniques?|covalentes?|metalliques?|polaires?|apolaires?)|(?:quel|quelle|quels|quelles) (?:type de )?liaisons?|liaisons? (?:entre|dans|du|de la|des))\\b"
    )

    private fun n_pistas_limparConceito(): List<Any?> = listOf<Any?>(
        "^[- ]*(?:est |sont |signifie |veut dire |serait |ce que |que |moi )*",
        "^(?:un |une |le |la |les |l |de |du |des |d )+"
    )

    private fun n_pistas(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "querCalcular" to "\\b(?:limitant|rendement|combien|masse de|grammes?|moles?|mol|produi\\w*|form\\w*|obt\\w+|reagi\\w*|consomm\\w+|reste\\w*|exces|volume|litres?)\\b",
        "conversaoPreposicoes" to "(?:->|→| en | vers | to )",
        "paraUnidade" to "(?:\\b(?:en|vers|jusqu['’ ]?a)|(?:^|\\s)[aà])\\s+(?:le |la |les |l['’ ])?((?:degr[eé]s?\\s+)?[A-Za-zÀ-ÿµμ°º/³²·.]+(?: celsius| fahrenheit| par litre| de mercure)?)\\s*[?!.]*\$",
        "quantosUnidade" to "^\\s*combien (?:de |d['’ ])((?:degr[eé]s\\s+)?[A-Za-zÀ-ÿµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:y a[- ]t[- ]il|il y a|font|valent|dans|correspondent|fait|vaut)(?![A-Za-zÀ-ÿ])",
        "phContexto" to "\\b(?:acide|base|solution)\\b",
        "conector" to "\\b(?:de|du|d)\\b",
        "prefixoExplicacao" to "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli|defin|concept|definition|comment fonctionne|comment marche|pourquoi)",
        "prefixoExplicacaoPalavra" to "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli\\w*|defin\\w*|concept|definition|parle[- ]moi de|comment fonctionne|comment marche|pourquoi)\\b",
        "prefixoDefinicao" to "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli\\w*|defin\\w*|concept|definition)\\b",
        "gasGrandezas" to "\\b(?:volume|pression|temperature|moles?|mol|combien)\\b",
        "concentracaoForte" to "\\bdilu\\w*|molarite|concentration\\b",
        "propriedadesPalavra" to "\\bproprietes\\b",
        "mistura" to "\\b(?:melang\\w+|avec|ensemble|combin\\w+|incompatib\\w+)\\b",
        "elementoPalavra" to "\\belements?\\b",
        "gasSubstancia" to "\\bgaz\\b",
        "tendencia" to "\\btendance\\w*|\\bperiodicite|\\bvari\\w* (?:le long|dans la periode|dans le groupe|au sein)|\\ble long (?:de la|d une|du|d un) (?:periode|groupe)",
        "tabelaPalavra" to "\\btableau periodique\\b|\\bclassification periodique\\b",
        "grupo" to "\\b(?:groupe|famille)\\s+(\\d{1,2})\\b",
        "periodo" to "\\bperiode\\s+(\\d)\\b",
        "bloco" to "\\bbloc\\s+([spdf])\\b",
        "continuacao" to "^et (?:le |la |les |l |celui |celle |ceux )?(?:de |du |des |d |pour )?",
        "continuacaoNuvem" to "^(?:et|maintenant|ok|d accord|super|bien|alors|aussi|en|avec|pareil|refais|fais le|dessine|montre|dis m en plus|dis moi en plus|qu en est il)(?: |\$)|(?:^| )(?:aussi|egalement|son|sa|ses|en plus)(?: |\$)",
        "limparConceito" to n_pistas_limparConceito(),
        "constantes" to "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|egal a|egale a|vaut|est)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
        "quantidadeComplemento" to "(?:de|d|par)",
        "letrasUnidade" to "A-Za-zçéèêàù",
        "ligacaoPreposicoes" to "(?:de|d|du|des)",
        "diluicao" to "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
        "percentualMassa" to "\\bmasse|pourcent|pour cent|titre|fraction\\b",
        "cntp" to "\\b(?:cntp|tpn|conditions normales|volume)\\b",
        "cueElemento" to "\\b(?:element|symbole|symbole chimique)\\b",
        "reacaoVerbo" to "\\b(?:forme(?:e|s|es)?|se forment?|produit(?:e|s|es)?|obtenue?s?|obtenu|reagi\\w*|consommee?s?|necessaires?|liberee?s?|liberent?|a partir d(?:e|u|es)?|brul\\w+|combustion|decomposition|decompose)\\b",
        "pedidoQuantidade" to "\\b(?:pese\\w*|masse(?! (?:molaire|moleculaire|atomique|exacte|volumique))|moles?|mol|quantite de matiere|volume)\\b",
        "ordemCrescente" to "\\b(?:croissant\\w*|du plus (?:petit|faible|bas) au plus (?:grand|fort|haut|eleve)|(?:lequel|laquelle) (?:a|est) (?:le |la )?(?:plus (?:petit|petite|faible|bas|basse|leger|legere)|moins))\\b",
        "ordemDecrescente" to "\\b(?:decroissant\\w*|du plus (?:grand|fort|haut|eleve) au plus (?:petit|faible|bas)|(?:lequel|laquelle) (?:a|est) (?:le |la )?plus (?:grand|grande|fort|forte|haut|haute|eleve|elevee|dense|lourd|lourde))\\b",
        "conectivoLista" to "^(?:et|ou)\$",
        "paraUnidades" to "(?:\\b(?:en|vers|jusqu['’ ]?a)|(?:^|\\s)[aà])\\s+(?:le |la |les |l['’ ])?",
        "paraUnidadesFim" to "\\s*[?!.]*\$",
        "misturaTema" to "\\b(melange)s?\\b",
        "misturaConceito" to "\\b(?:substances?|corps purs?|pure?s?|homogene\\w*|heterogene\\w*|systemes?|classe[rz]?|classifi\\w*|types? de|qu est[- ]ce qu\\w*|difference entre|phases?)\\b",
        "nomenclaturaPedido" to "\\b(?:comment (?:s appelle|ca s appelle|on appelle|appelle[- ]t[- ]on|nommer|nomme[- ]t[- ]on|se nomme)|nomme[zr]|donne[rz]? le nom|quel est (?:le |son )?nom|nom (?:officiel|iupac|usuel|systematique))\\b",
        "nomenclaturaAlvo" to "\\b(?:composes?|substances?|molecules?|hydrocarbures?|organiques?|chaines?|structures?|\\w*(?:meth|eth|prop|but|pent|hex|hept|oct|non|dec|phen|benz)\\w*(?:ane|ene|yne|ol|one|oique|yle|amine))\\b",
        "noxAlvo" to "\\b(?:du|de la|de l|des|de|d) (\\S+(?: \\S+)?) (?:dans|au sein de|au sein du)\\b",
        "entalpiaCombustao" to "\\b(?:combustions?|bruler|brule\\w*|brulant)\\b",
        "entalpiaFormacao" to "\\b(?:enthalpies? (?:standard )?de formation|chaleurs? de formation)\\b",
        "hess" to "\\b(?:loi de hess|hess)\\b",
        "kcKp" to "\\b(?:kp|pressions partielles)\\b",
        "concentracaoColchete" to "=|:|est|vaut|egal a|egale a|de",
        "ligacaoPolaridade" to "\\b(?:ioniques?|covalentes?|polaires?|apolaires?|metalliques?)\\b"
    )

    private fun n_nivel(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "fundamental" to "\\b(?:primaire|ecole primaire|college|enfant|enfants|simple|tres simple|facile a comprendre|pour debutants|pour les nuls)\\b",
        "medio" to "\\b(?:lycee|secondaire|bac|baccalaureat|terminale|premiere|seconde)\\b",
        "superior" to "\\b(?:universite|fac|faculte|superieur|avance|licence|master|approfondi\\w*|detaille\\w*)\\b"
    )

    private fun n_unidades_0(): List<Any?> = listOf<Any?>(
        "^degres? (?:celsius|centigrades?)\$|^celsius\$",
        "°C"
    )

    private fun n_unidades_1(): List<Any?> = listOf<Any?>(
        "^degres? fahrenheit\$|^fahrenheit\$",
        "°F"
    )

    private fun n_unidades_2(): List<Any?> = listOf<Any?>(
        "^kelvins?\$",
        "K"
    )

    private fun n_unidades_3(): List<Any?> = listOf<Any?>(
        "^atmospheres?\$|^atmosph\$",
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
        "^millimetres? de mercure\$",
        "mmHg"
    )

    private fun n_unidades_7(): List<Any?> = listOf<Any?>(
        "^litres?\$",
        "L"
    )

    private fun n_unidades_8(): List<Any?> = listOf<Any?>(
        "^millilitres?\$",
        "mL"
    )

    private fun n_unidades_9(): List<Any?> = listOf<Any?>(
        "^microlitres?\$",
        "µL"
    )

    private fun n_unidades_10(): List<Any?> = listOf<Any?>(
        "^grammes?\$",
        "g"
    )

    private fun n_unidades_11(): List<Any?> = listOf<Any?>(
        "^milligrammes?\$",
        "mg"
    )

    private fun n_unidades_12(): List<Any?> = listOf<Any?>(
        "^kilogrammes?\$|^kilos?\$",
        "kg"
    )

    private fun n_unidades_13(): List<Any?> = listOf<Any?>(
        "^tonnes?\$",
        "t"
    )

    private fun n_unidades_14(): List<Any?> = listOf<Any?>(
        "^moles?\$|^mols?\$",
        "mol"
    )

    private fun n_unidades_15(): List<Any?> = listOf<Any?>(
        "^millimoles?\$",
        "mmol"
    )

    private fun n_unidades_16(): List<Any?> = listOf<Any?>(
        "^kilomoles?\$",
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
        "^molaires?\$",
        "mol/L"
    )

    private fun n_unidades_22(): List<Any?> = listOf<Any?>(
        "^mol par litre\$|^moles? par litre\$",
        "mol/L"
    )

    private fun n_unidades_23(): List<Any?> = listOf<Any?>(
        "^grammes? par litre\$",
        "g/L"
    )

    private fun n_unidades_24(): List<Any?> = listOf<Any?>(
        "^(?:molecules?|atomes?|particules?|ions?|unites|entites)\$",
        "particulas"
    )

    private fun n_unidades_25(): List<Any?> = listOf<Any?>(
        "^metres?\$",
        "m"
    )

    private fun n_unidades_26(): List<Any?> = listOf<Any?>(
        "^centimetres?\$",
        "cm"
    )

    private fun n_unidades_27(): List<Any?> = listOf<Any?>(
        "^millimetres?\$",
        "mm"
    )

    private fun n_unidades_28(): List<Any?> = listOf<Any?>(
        "^nanometres?\$",
        "nm"
    )

    private fun n_unidades_29(): List<Any?> = listOf<Any?>(
        "^kilometres?\$",
        "km"
    )

    private fun n_unidades_30(): List<Any?> = listOf<Any?>(
        "^pour ?cent\$",
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
        "^heures?\$",
        "h"
    )

    private fun n_unidades_34(): List<Any?> = listOf<Any?>(
        "^minutes?\$",
        "min"
    )

    private fun n_unidades_35(): List<Any?> = listOf<Any?>(
        "^secondes?\$",
        "s"
    )

    private fun n_unidades_36(): List<Any?> = listOf<Any?>(
        "^metres? cubes?\$",
        "m3"
    )

    private fun n_unidades_37(): List<Any?> = listOf<Any?>(
        "^decimetres? cubes?\$",
        "dm3"
    )

    private fun n_unidades_38(): List<Any?> = listOf<Any?>(
        "^centimetres? cubes?\$",
        "cm3"
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
        n_unidades_35(),
        n_unidades_36(),
        n_unidades_37(),
        n_unidades_38()
    )

    private fun n_numerais_0(): List<Any?> = listOf<Any?>(
        "une demi|un demi|demie|demi",
        0.5
    )

    private fun n_numerais_1(): List<Any?> = listOf<Any?>(
        "un|une",
        1
    )

    private fun n_numerais_2(): List<Any?> = listOf<Any?>(
        "deux",
        2
    )

    private fun n_numerais_3(): List<Any?> = listOf<Any?>(
        "trois",
        3
    )

    private fun n_numerais_4(): List<Any?> = listOf<Any?>(
        "quatre",
        4
    )

    private fun n_numerais_5(): List<Any?> = listOf<Any?>(
        "cinq",
        5
    )

    private fun n_numerais_6(): List<Any?> = listOf<Any?>(
        "six",
        6
    )

    private fun n_numerais_7(): List<Any?> = listOf<Any?>(
        "sept",
        7
    )

    private fun n_numerais_8(): List<Any?> = listOf<Any?>(
        "huit",
        8
    )

    private fun n_numerais_9(): List<Any?> = listOf<Any?>(
        "neuf",
        9
    )

    private fun n_numerais_10(): List<Any?> = listOf<Any?>(
        "dix",
        10
    )

    private fun n_numerais(): List<Any?> = listOf<Any?>(
        n_numerais_0(),
        n_numerais_1(),
        n_numerais_2(),
        n_numerais_3(),
        n_numerais_4(),
        n_numerais_5(),
        n_numerais_6(),
        n_numerais_7(),
        n_numerais_8(),
        n_numerais_9(),
        n_numerais_10()
    )

    private fun n_categorias_0(): List<Any?> = listOf<Any?>(
        "\\balcalino ?terreu\\w*",
        "metal_alcalino_terroso"
    )

    private fun n_categorias_1(): List<Any?> = listOf<Any?>(
        "\\bmetaux alcalins?|\\bmetal alcalin|\\balcalins\\b",
        "metal_alcalino"
    )

    private fun n_categorias_2(): List<Any?> = listOf<Any?>(
        "\\bmetaux de transition|\\bmetal de transition|\\belements? de transition",
        "metal_transicao"
    )

    private fun n_categorias_3(): List<Any?> = listOf<Any?>(
        "\\bpost ?transition|\\bmetaux pauvres|\\bmetal pauvre",
        "metal_pos_transicao"
    )

    private fun n_categorias_4(): List<Any?> = listOf<Any?>(
        "\\bsemi ?metaux|\\bsemi ?metal|\\bmetalloides?",
        "semimetal"
    )

    private fun n_categorias_5(): List<Any?> = listOf<Any?>(
        "\\bnon ?metaux|\\bnon ?metal",
        "nao_metal"
    )

    private fun n_categorias_6(): List<Any?> = listOf<Any?>(
        "\\bhalogenes?",
        "halogenio"
    )

    private fun n_categorias_7(): List<Any?> = listOf<Any?>(
        "\\bgaz nobles?|\\bgaz rares?|\\bnobles\\b",
        "gas_nobre"
    )

    private fun n_categorias_8(): List<Any?> = listOf<Any?>(
        "\\blanthanides?|\\bterres rares",
        "lantanideo"
    )

    private fun n_categorias_9(): List<Any?> = listOf<Any?>(
        "\\bactinides?|\\bactinoides?",
        "actinideo"
    )

    private fun n_categorias_10(): List<Any?> = listOf<Any?>(
        "\\bmetaux\\b|\\bmetal\\b",
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
        "\\b(?:gazeux|gaz|a l etat gazeux)\\b",
        "gas"
    )

    private fun n_estados_1(): List<Any?> = listOf<Any?>(
        "\\bliquides?\\b",
        "liquido"
    )

    private fun n_estados_2(): List<Any?> = listOf<Any?>(
        "\\bsolides?\\b",
        "solido"
    )

    private fun n_estados(): List<Any?> = listOf<Any?>(
        n_estados_0(),
        n_estados_1(),
        n_estados_2()
    )

    private fun n_extremos_0(): List<Any?> = listOf<Any?>(
        "\\bplus electronegati\\w+|\\bplus (?:grande|forte|haute|elevee) electronegativite|\\belectronegativite (?:la )?plus (?:grande|forte|haute|elevee)",
        "eletronegatividade",
        "max"
    )

    private fun n_extremos_1(): List<Any?> = listOf<Any?>(
        "\\bmoins electronegati\\w+|\\bplus (?:petite|faible|basse) electronegativite|\\belectronegativite (?:la )?plus (?:petite|faible|basse)",
        "eletronegatividade",
        "min"
    )

    private fun n_extremos_2(): List<Any?> = listOf<Any?>(
        "\\bplus dense\\b|\\bplus (?:grande|forte|haute|elevee) (?:densite|masse volumique)|\\b(?:densite|masse volumique) (?:la )?plus (?:grande|forte|haute|elevee)",
        "densidadeKgm3",
        "max"
    )

    private fun n_extremos_3(): List<Any?> = listOf<Any?>(
        "\\bmoins dense\\b|\\bplus (?:petite|faible|basse) (?:densite|masse volumique)|\\b(?:densite|masse volumique) (?:la )?plus (?:petite|faible|basse)",
        "densidadeKgm3",
        "min"
    )

    private fun n_extremos_4(): List<Any?> = listOf<Any?>(
        "\\bplus (?:grand|gros) rayon|\\brayon (?:atomique )?(?:le )?plus (?:grand|gros)|\\bplus volumineu\\w+",
        "raioAtomicoPm",
        "max"
    )

    private fun n_extremos_5(): List<Any?> = listOf<Any?>(
        "\\bplus petit rayon|\\brayon (?:atomique )?(?:le )?plus petit",
        "raioAtomicoPm",
        "min"
    )

    private fun n_extremos_6(): List<Any?> = listOf<Any?>(
        "\\bplus (?:haut|eleve|grand) point de fusion|\\bpoint de fusion (?:le )?plus (?:haut|eleve|grand)",
        "pontoFusaoK",
        "max"
    )

    private fun n_extremos_7(): List<Any?> = listOf<Any?>(
        "\\bplus (?:bas|faible|petit) point de fusion|\\bpoint de fusion (?:le )?plus (?:bas|faible|petit)",
        "pontoFusaoK",
        "min"
    )

    private fun n_extremos_8(): List<Any?> = listOf<Any?>(
        "\\bplus (?:haut|eleve|grand) point d ebullition|\\bpoint d ebullition (?:le )?plus (?:haut|eleve|grand)",
        "pontoEbulicaoK",
        "max"
    )

    private fun n_extremos_9(): List<Any?> = listOf<Any?>(
        "\\bplus (?:bas|faible|petit) point d ebullition|\\bpoint d ebullition (?:le )?plus (?:bas|faible|petit)",
        "pontoEbulicaoK",
        "min"
    )

    private fun n_extremos_10(): List<Any?> = listOf<Any?>(
        "\\bplus (?:haute|elevee|grande) energie d ionisation|\\benergie d ionisation (?:la )?plus (?:haute|elevee|grande)",
        "energiaIonizacaoKJmol",
        "max"
    )

    private fun n_extremos_11(): List<Any?> = listOf<Any?>(
        "\\bplus (?:basse|faible|petite) energie d ionisation|\\benergie d ionisation (?:la )?plus (?:basse|faible|petite)",
        "energiaIonizacaoKJmol",
        "min"
    )

    private fun n_extremos_12(): List<Any?> = listOf<Any?>(
        "\\bplus lourd\\w*|\\bplus (?:grande|haute|elevee) masse atomique|\\bmasse atomique (?:la )?plus (?:grande|haute|elevee)",
        "massaAtomica",
        "max"
    )

    private fun n_extremos_13(): List<Any?> = listOf<Any?>(
        "\\bplus (?:petite|faible|basse) masse atomique|\\bmasse atomique (?:la )?plus (?:petite|faible|basse)|\\bplus leger\\w*",
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
        "numero atomique",
        "nombre atomique",
        "z"
    )

    private fun n_propriedades_massaAtomica(): List<Any?> = listOf<Any?>(
        "masse atomique",
        "poids atomique",
        "masse de l atome"
    )

    private fun n_propriedades_simbolo(): List<Any?> = listOf<Any?>(
        "symbole"
    )

    private fun n_propriedades_grupo(): List<Any?> = listOf<Any?>(
        "groupe",
        "famille"
    )

    private fun n_propriedades_periodo(): List<Any?> = listOf<Any?>(
        "periode"
    )

    private fun n_propriedades_bloco(): List<Any?> = listOf<Any?>(
        "bloc"
    )

    private fun n_propriedades_categoria(): List<Any?> = listOf<Any?>(
        "categorie",
        "classification",
        "type d element",
        "classe de l element"
    )

    private fun n_propriedades_configuracaoEletronica(): List<Any?> = listOf<Any?>(
        "configuration electronique",
        "structure electronique",
        "repartition electronique",
        "electrons de valence",
        "couche de valence",
        "couches electroniques",
        "repartition par couches",
        "electrons par couche",
        "sous-couches",
        "regle de klechkowski",
        "diagramme de klechkowski"
    )

    private fun n_propriedades_eletronegatividade(): List<Any?> = listOf<Any?>(
        "electronegativite"
    )

    private fun n_propriedades_raioAtomicoPm(): List<Any?> = listOf<Any?>(
        "rayon atomique",
        "rayon de van der waals",
        "taille de l atome"
    )

    private fun n_propriedades_afinidadeEletronicaKJmol(): List<Any?> = listOf<Any?>(
        "affinite electronique"
    )

    private fun n_propriedades_energiaIonizacaoKJmol(): List<Any?> = listOf<Any?>(
        "energie d ionisation",
        "potentiel d ionisation",
        "premiere energie d ionisation"
    )

    private fun n_propriedades_pontoFusaoK(): List<Any?> = listOf<Any?>(
        "point de fusion",
        "temperature de fusion",
        "fusion",
        "fond",
        "fondre"
    )

    private fun n_propriedades_pontoEbulicaoK(): List<Any?> = listOf<Any?>(
        "point d ebullition",
        "temperature d ebullition",
        "ebullition",
        "bout",
        "bouillir"
    )

    private fun n_propriedades_densidadeKgm3(): List<Any?> = listOf<Any?>(
        "densite",
        "masse volumique"
    )

    private fun n_propriedades_estadoPadrao(): List<Any?> = listOf<Any?>(
        "etat physique",
        "etat standard",
        "etat de la matiere",
        "est solide",
        "est liquide",
        "est gazeux",
        "est un gaz",
        "est il liquide",
        "est il solide",
        "est il gazeux",
        "est il un gaz",
        "est elle liquide",
        "est elle solide",
        "est elle gazeuse",
        "est-il liquide",
        "est-il solide",
        "est-il gazeux",
        "est-il un gaz",
        "est-elle liquide",
        "est-elle solide",
        "est-elle gazeuse"
    )

    private fun n_propriedades_estadosOxidacao(): List<Any?> = listOf<Any?>(
        "etats d oxydation",
        "nombres d oxydation",
        "etat d oxydation",
        "nombre d oxydation",
        "degre d oxydation",
        "degres d oxydation",
        "valence"
    )

    private fun n_propriedades_descoberta(): List<Any?> = listOf<Any?>(
        "decouverte",
        "decouvert",
        "decouvreur",
        "qui a decouvert",
        "annee de decouverte",
        "quand a ete decouvert",
        "a ete decouvert",
        "a ete decouverte",
        "ont ete decouverts"
    )

    private fun n_propriedades_massaMolar(): List<Any?> = listOf<Any?>(
        "masse molaire",
        "masse moleculaire",
        "poids moleculaire",
        "poids molaire",
        "masse formulaire"
    )

    private fun n_propriedades_massaExata(): List<Any?> = listOf<Any?>(
        "masse exacte",
        "masse monoisotopique"
    )

    private fun n_propriedades_formula(): List<Any?> = listOf<Any?>(
        "formule",
        "formule moleculaire",
        "formule chimique",
        "formule brute"
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
        "nom iupac",
        "nom systematique",
        "iupac"
    )

    private fun n_propriedades_xlogp(): List<Any?> = listOf<Any?>(
        "xlogp",
        "logp",
        "lipophilie",
        "coefficient de partage"
    )

    private fun n_propriedades_doadoresH(): List<Any?> = listOf<Any?>(
        "donneurs de liaison hydrogene",
        "donneurs d hydrogene",
        "donneurs de liaisons hydrogene"
    )

    private fun n_propriedades_aceptoresH(): List<Any?> = listOf<Any?>(
        "accepteurs de liaison hydrogene",
        "accepteurs d hydrogene",
        "accepteurs de liaisons hydrogene"
    )

    private fun n_propriedades_ligacoesRotaveis(): List<Any?> = listOf<Any?>(
        "liaisons rotatives",
        "liaisons rotables"
    )

    private fun n_propriedades_carga(): List<Any?> = listOf<Any?>(
        "charge electrique",
        "charge formelle"
    )

    private fun n_propriedades_tpsa(): List<Any?> = listOf<Any?>(
        "tpsa",
        "surface polaire",
        "aire de surface polaire"
    )

    private fun n_propriedades_solubilidade(): List<Any?> = listOf<Any?>(
        "solubilite",
        "solubilite dans l eau",
        "soluble dans l eau",
        "insoluble dans l eau",
        "soluble",
        "insoluble",
        "combien se dissout",
        "se dissout dans l eau",
        "se dissout",
        "dissout dans l eau"
    )

    private fun n_propriedades_pka(): List<Any?> = listOf<Any?>(
        "pka",
        "constante d acidite",
        "constante d ionisation acide",
        "constante de dissociation acide",
        "constante de dissociation de l acide",
        "ka de",
        "ka du",
        "ka de l"
    )

    private fun n_propriedades_entalpiaFormacaoKJmol(): List<Any?> = listOf<Any?>(
        "enthalpie standard de formation",
        "enthalpie de formation",
        "chaleur de formation"
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
        "tpsa" to n_propriedades_tpsa(),
        "solubilidade" to n_propriedades_solubilidade(),
        "pka" to n_propriedades_pka(),
        "entalpiaFormacaoKJmol" to n_propriedades_entalpiaFormacaoKJmol()
    )

    private fun n_stopwordsBusca(): List<Any?> = listOf<Any?>(
        "le",
        "la",
        "les",
        "l",
        "un",
        "une",
        "de",
        "du",
        "des",
        "d",
        "et",
        "que",
        "qu",
        "en",
        "dans",
        "pour",
        "par",
        "avec",
        "quel",
        "quelle",
        "quels",
        "quelles",
        "comment",
        "se",
        "est",
        "sont",
        "etre",
        "veut",
        "dire",
        "signifie",
        "explique",
        "expliquer",
        "definis",
        "definir",
        "concept",
        "pourquoi",
        "moi",
        "fonctionne",
        "ce",
        "c",
        "quoi"
    )

    private fun n_stopPalavras(): List<Any?> = listOf<Any?>(
        "de",
        "du",
        "des",
        "d",
        "la",
        "le",
        "les",
        "l",
        "et",
        "ou",
        "un",
        "une",
        "en",
        "dans",
        "que",
        "qu",
        "pour",
        "par",
        "avec",
        "au",
        "aux",
        "se",
        "est"
    )

    private fun n_palavrasFuncionais(): List<Any?> = listOf<Any?>(
        "sur",
        "entre",
        "comment",
        "ou",
        "quand",
        "quel",
        "quelle",
        "quels",
        "quelles",
        "plus",
        "moins",
        "beaucoup",
        "peu",
        "tout",
        "rien",
        "aussi",
        "parce",
        "alors",
        "ainsi",
        "encore",
        "apres",
        "avant",
        "maintenant",
        "toujours",
        "jamais",
        "soit",
        "etait",
        "etre",
        "sont",
        "cette",
        "ces",
        "a",
        "avoir",
        "dis",
        "dites",
        "montre",
        "explique",
        "chimie",
        "plait",
        "voudrais",
        "voulais",
        "pourrais",
        "peut",
        "veux",
        "besoin",
        "sources",
        "source",
        "donnees",
        "aide",
        "licence",
        "licences",
        "information",
        "informations",
        "version",
        "reference",
        "references",
        "offline",
        "gratuit",
        "gratuite",
        "donne",
        "trouve",
        "sais",
        "pense",
        "quelques",
        "ici",
        "seulement",
        "tres",
        "autre",
        "autres",
        "meme",
        "leur",
        "leurs",
        "votre",
        "notre",
        "unite",
        "unites",
        "valeur",
        "point",
        "nom",
        "masse",
        "molaire",
        "etat",
        "pas",
        "cet",
        "nos",
        "tel",
        "periodique",
        "difference",
        "differences",
        "definition",
        "explication",
        "signification",
        "exemple",
        "exemples",
        "importance",
        "utilite",
        "poser",
        "passer",
        "fontes",
        "titre",
        "litre",
        "litres",
        "plane",
        "eleve",
        "elevee",
        "rayon",
        "rayons",
        "master"
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
        "Tu",
        "Ce",
        "Ne",
        "Sa",
        "Ma",
        "Au",
        "Du",
        "Ou"
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
        "NON",
        "SAL"
    )

    private fun n_seguranca_acao(): List<Any?> = listOf<Any?>(
        "fai(?:re|s|t|sons|tes|sant)",
        "fabriqu\\w*",
        "fabrication",
        "produi\\w*",
        "production",
        "prepar\\w*",
        "synthetis\\w*",
        "synthese",
        "obten\\w*",
        "obtient",
        "se procurer",
        "procur\\w*",
        "acqu[ei]r\\w*",
        "achet\\w*",
        "achat",
        "vend\\w*",
        "vente de",
        "trafiqu\\w*",
        "trafic",
        "contreband\\w*",
        "detourn\\w*",
        "contourn\\w*",
        "cach\\w*",
        "dissimul\\w*",
        "extrai\\w*",
        "extraction",
        "cuisin(?:er|ez|ons|ant)",
        "(?:je|tu|on|nous|vous|ils?|elles?) cuisin(?:e|es|ent)",
        "mont(?:er|e|es|ons|ez|ent|ant|ages?|ees?)",
        "assembl\\w*",
        "constru(?:ire|is|it|isons|isez|isent)",
        "cre(?:er|ez|ons|ant|ation)",
        "(?:je|tu|on) cree",
        "gener(?:er|e|es|ons|ez|ent|ant|ation|ees?)",
        "purifi\\w*",
        "raffin\\w*",
        "cristallis\\w*",
        "distill\\w*",
        "augment\\w+ (?:l |la |le |de )?(?:echelle|production|rendement|puissance|purete)",
        "a grande echelle",
        "passer a l echelle",
        "recette",
        "pas a pas",
        "etape par etape",
        "tutoriel",
        "tuto",
        "instructions?",
        "mode d emploi",
        "apprend\\w* moi",
        "voie de synthese",
        "route de synthese",
        "procedure (?:de|pour)",
        "protocole (?:de|pour)",
        "comment (?:on |peut on |faire pour )?(?:fai(?:re|t)|fabriqu\\w*|produi\\w*|prepar\\w*|synthetis\\w*|obten\\w*|extrai\\w*|cuisin\\w*|mont\\w*|assembl\\w*|constru\\w*)",
        "quantite de .{1,40} pour (?:faire|produire|preparer|fabriquer)",
        "quels reactifs",
        "quels produits",
        "de quoi ai je besoin pour (?:faire|produire|fabriquer)",
        "ingredients pour",
        "materiel pour (?:faire|monter|produire|fabriquer)",
        "sans (?:ordonnance|licence|autorisation|permis)"
    )

    private fun n_seguranca_contextoSeguro(): List<Any?> = listOf<Any?>(
        "elimin\\w*",
        "jeter",
        "dechets?",
        "neutralis\\w*",
        "stock\\w*",
        "entrepos\\w*",
        "conserv\\w*",
        "rang\\w*",
        "manipul\\w*",
        "premiers (?:soins|secours)",
        "epi",
        "deversement\\w*",
        "renvers\\w*",
        "fuite\\w*",
        "eclaboussure\\w*",
        "projection\\w*",
        "inhal\\w*",
        "respir\\w*",
        "ingest\\w*",
        "ingere\\w*",
        "aval\\w*",
        "brulure\\w*",
        "intoxication (?:par|au|a la|aux)",
        "premiere intervention",
        "equipement de protection",
        "protection individuelle",
        "gants",
        "lunettes de protection",
        "masque",
        "que faire (?:si|quand|en cas|lorsque)",
        "que (?:dois je|puis je|faut il) faire (?:si|quand|en cas|lorsque)",
        "en cas de",
        "fiche de (?:donnees de )?securite",
        "fds",
        "icsc",
        "recycl\\w*"
    )

    private fun n_seguranca_alvoExplosivos(): List<Any?> = listOf<Any?>(
        "explosi\\w*",
        "dynamite",
        "tnt",
        "trinitrotoluene",
        "nitroglycerine",
        "c ?4 explosi\\w*",
        "c-4",
        "rdx",
        "hmx",
        "petn",
        "hmtd",
        "tatp",
        "peroxyde d acetone",
        "triperoxyde de triacetone",
        "azoture de (?:plomb|sodium)",
        "fulminate\\w*",
        "anfo",
        "picrate\\w*",
        "tetryl",
        "poudre (?:noire|a canon|sans fumee)",
        "nitrate d ammonium (?:avec|et|\\+|plus) (?:du )?(?:diesel|gazole|gasoil|huile|carburant|essence|fioul)",
        "bombes? (?:artisanales?|maison|improvisees?|chimiques?|incendiaires?|fumigenes?|a pression|a retardement|a clous|tube)",
        "pipe bomb",
        "cocktails? molotov",
        "molotov",
        "napalm",
        "grenades?",
        "engins? explosifs?",
        "eei",
        "ied",
        "detonateurs?",
        "meche de bombe",
        "feux d artifice (?:artisanaux|maison|faits maison)?",
        "thermite",
        "materiel incendiaire",
        "engin incendiaire",
        "bombe atomique",
        "bombe nucleaire",
        "bombe sale",
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
        "nerve agents?",
        "chemical weapons?",
        "mustard gas",
        "novichok",
        "novitchok",
        "agents? (?:neurotoxiques?|nerveux|vesicants?|chimiques?(?: de guerre)?|de guerre)",
        "armes? chimiques?",
        "armes? bacteriologiques?",
        "armes? de destruction massive",
        "gaz (?:moutarde|sarin|neurotoxique\\w*|lacrymogene\\w*|toxique\\w*|empoisonne\\w*|mortel\\w*|letal\\w*|asphyxiant\\w*|de combat|de guerre|chlore|phosgene)",
        "ypérite|yperite",
        "moutarde (?:soufree|au soufre|azotee|a l azote)",
        "phosgene",
        "chloropicrine",
        "lewisite",
        "ricine",
        "cyanure(?: d hydrogene| de potassium| de sodium)?",
        "acide cyanhydrique",
        "acide prussique",
        "chloramines?",
        "arsine",
        "phosphine",
        "toxine botulique",
        "botulisme",
        "anthrax",
        "charbon bacteridien",
        "chlore gazeux",
        "chlore en gaz",
        "sulfure d hydrogene",
        "hydrogene sulfure",
        "monoxyde de carbone pour (?:tuer|blesser|empoisonner)",
        "arma quimica",
        "gas sarin",
        "fosgenio"
    )

    private fun n_seguranca_alvoDrogas(): List<Any?> = listOf<Any?>(
        "methamphetamines?",
        "meth",
        "crystal meth",
        "cristal meth",
        "ice(?! ?cubes?| ?cream| rink| pack| water| bath| skat\\w*| age| cold| melt\\w*| machine| maker| tray)",
        "cocaine",
        "coke(?! ?(?:oven|can|bottle|zero|cola|coal))",
        "crack(?! (?:the|a|an|this|that|open|code|codes|password|passwords|egg|eggs|nut|nuts|joke|jokes|down|in|up))",
        "freebase",
        "heroine",
        "lsd",
        "acide lysergique",
        "mdma",
        "ecstasy",
        "extasy",
        "molly",
        "fentanyl\\w*",
        "carfentanil",
        "pcp",
        "phencyclidine",
        "ketamine",
        "dmt",
        "dimethyltryptamine",
        "mescaline",
        "psilocybine",
        "champignons? (?:hallucinogenes?|magiques?)",
        "amphetamines?",
        "speed(?! of| limit| up| test| camera| boat| record| reading)",
        "ghb",
        "gbl",
        "oxycodone",
        "opium",
        "marijuana",
        "cannabis",
        "haschich",
        "hashish",
        "shit",
        "beuh",
        "thc",
        "cannabinoides? de synthese",
        "cannabinoides? synthetiques?",
        "spice(?! ?(?:rack|racks|mix|mixes|blend|blends|cabinet|jar|jars|girls))",
        "sels de bain",
        "cathinones? de synthese",
        "drogues? de synthese",
        "drogues? synthetiques?",
        "drogues? (?:illicites?|illegales?)",
        "stupefiants?",
        "narcotiques?",
        "laboratoire clandestin",
        "labo clandestin",
        "narcolaboratoire",
        "methamphetamine",
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
        "acide phenylacetique",
        "anhydride acetique",
        "ergotamine",
        "ergometrine",
        "acide anthranilique",
        "n-?acetylanthranilique",
        "acide lysergique",
        "precurseurs? (?:de|du|des|pour|chimiques?|controles?|classifies?)",
        "precurseurs? controles?",
        "iode rouge",
        "phosphore rouge"
    )

    private fun n_seguranca_alvoDano(): List<Any?> = listOf<Any?>(
        "empoisonn\\w+ (?:quelqu un|une personne|des gens|mon|ma|mes|le|la|les|un|une|son|sa|un chien|un chat|un animal|des animaux|des enfants|un enfant|voisin\\w*|collegue|prof\\w*|patron|chef|mari|femme|copain|copine|petit ami|petite amie|ex|partenaire)",
        "tuer (?:quelqu un|une personne|des gens|mon|ma|mes|le|la|les|un|une|son|sa)",
        "assassin\\w*",
        "meurtre",
        "intoxiquer (?:quelqu un|une personne|volontairement|expres|intentionnellement)",
        "poisons? (?:indetectables?|introuvables?|sans traces?|mortels?|letaux?|letal|maison|artisanaux?)",
        "poison qui ne laisse pas de traces?",
        "dose (?:letale|mortelle) pour tuer",
        "blesser (?:quelqu un|une personne)",
        "faire du mal a (?:quelqu un|une personne)",
        "bruler (?:quelqu un|une personne) (?:avec de l acide|a l acide|avec des produits)",
        "jeter de l acide (?:sur|au visage)",
        "attaquer (?:quelqu un|une personne) avec",
        "attaque a l acide",
        "envenenar alguem",
        "matar alguem",
        "kill someone",
        "poison someone"
    )

    private fun n_seguranca_alvoAutolesao(): List<Any?> = listOf<Any?>(
        "me tuer",
        "me suicider",
        "suicide",
        "suicidaire",
        "mettre fin a mes jours",
        "mettre fin a ma vie",
        "en finir avec la vie",
        "en finir",
        "m empoisonner",
        "je veux mourir",
        "j ai envie de mourir",
        "mourir (?:sans douleur|sans souffrir|paisiblement)",
        "mort sans douleur",
        "mort douce",
        "overdose pour mourir",
        "surdose pour mourir",
        "combien de \\S+ pour mourir",
        "me faire du mal",
        "me blesser",
        "me couper",
        "me scarifier",
        "automutil\\w*",
        "m intoxiquer volontairement",
        "me matar",
        "suicidio",
        "kill myself",
        "s empoisonner",
        "s intoxiquer volontairement",
        "se tuer",
        "se suicider",
        "me donner la mort",
        "(?:dose|quantite|combien) .{0,40}pour (?:mourir|me tuer|en finir)"
    )

    private fun n_seguranca_perigososCaseiros(): List<Any?> = listOf<Any?>(
        "acide (?:sulfurique|nitrique|chlorhydrique|muriatique|fluorhydrique|perchlorique|picrique|cyanhydrique)",
        "eau regale",
        "chlore(?: gazeux| en gaz)?",
        "gaz chlore",
        "cyanure\\w*",
        "arsenic",
        "arsine",
        "phosphine",
        "phosgene",
        "mercure",
        "phosphore (?:blanc|rouge)",
        "sodium metallique",
        "potassium metallique",
        "ammoniac anhydre",
        "chlorate\\w*",
        "perchlorate\\w*",
        "peroxyde (?:d acetone|de methyl\\w*|de benzoyle)",
        "eau oxygenee (?:concentree|a \\d+ ?(?:%|volumes?|pour ?cent))",
        "peroxyde d hydrogene concentre",
        "nitrate (?:d ammonium|de potassium)(?: concentre)?",
        "permanganate de potassium",
        "sulfure d hydrogene",
        "hydrogene sulfure",
        "monoxyde de carbone",
        "gaz (?:toxique\\w*|empoisonne\\w*|inflammable\\w*|asphyxiant\\w*)",
        "fluorure\\w*",
        "acide fluorhydrique",
        "poisons?",
        "toxines?",
        "napalm",
        "thermite",
        "nitrocellulose",
        "nitroglycerine",
        "toluene nitre",
        "acetone et eau oxygenee",
        "javel et (?:ammoniaque|ammoniac|acide|vinaigre)",
        "eau de javel et (?:ammoniaque|ammoniac|acide|vinaigre)",
        "chlore et ammoniac",
        "soude et aluminium",
        "destop et aluminium"
    )

    private fun n_seguranca_casa(): List<Any?> = listOf<Any?>(
        "a la maison",
        "chez (?:moi|soi)",
        "maison\\b",
        "fait maison",
        "faits? maison",
        "artisanal\\w*",
        "improvise\\w*",
        "dans (?:ma|la|sa) cuisine",
        "dans (?:mon|le|son) (?:jardin|garage|appartement|appart|sous sol|salon|chambre)",
        "dans (?:ma|la|sa) salle de bain",
        "avec des produits (?:menagers|de la maison|domestiques|d entretien|de nettoyage|du supermarche|de pharmacie|de droguerie|de bricolage)",
        "sans laboratoire",
        "sans labo",
        "soi meme",
        "faire soi meme",
        "diy",
        "avec des (?:materiaux|produits|ingredients|choses) (?:faciles? a trouver|simples|courants|de tous les jours|du quotidien)",
        "en utilisant (?:seulement |uniquement |juste )?des produits (?:menagers|d entretien|de nettoyage)",
        "em casa",
        "caseiro",
        "at home",
        "homemade"
    )

    private fun n_seguranca_coladaAlvos(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "EXPLOSIVOS" to listOf<Any?>(
            "explosif",
            "nitroglycerine",
            "dynamite",
            "trinitrotoluene",
            "peroxydedacetone",
            "molotov",
            "napalm",
            "bombeartisanale",
            "bombemaison",
            "poudrenoire",
            "poudreacanon",
            "detonateur",
            "fulminate",
            "tatp",
            "hmtd",
            "explosivo"
        ),
        "ARMAS_QUIMICAS" to listOf<Any?>(
            "sarin",
            "novichok",
            "gazmoutarde",
            "agentneurotoxique",
            "armechimique",
            "phosgene",
            "ricine",
            "gaztoxique",
            "gazempoisone",
            "cyanure",
            "chloramine",
            "gazchlore",
            "armaquimica"
        ),
        "DROGAS" to listOf<Any?>(
            "methamphetamine",
            "cocaine",
            "heroine",
            "fentanyl",
            "ecstasy",
            "mdma",
            "amphetamine",
            "droguesdesynthese",
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
            "anhydrideacetique",
            "precurseurs",
            "pseudoefedrina"
        )
    )

    private fun n_seguranca_coladaAcoes(): List<Any?> = listOf<Any?>(
        "synthese",
        "synthetiser",
        "fabriquer",
        "fabrication",
        "produire",
        "preparer",
        "purifier",
        "rafiner",
        "cuisiner",
        "extraire",
        "comentfaire",
        "recete",
        "pasapas",
        "etapeparetape",
        "monter",
        "asembler",
        "construire",
        "obtenir",
        "seprocurer",
        "acheter",
        "grandeechele"
    )

    private fun n_seguranca(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "acao" to n_seguranca_acao(),
        "contextoSeguro" to n_seguranca_contextoSeguro(),
        "tirarFazerSeguro" to "\\b(?:que (?:(?:dois|puis|devrais|peux|doit|peut|faut|pourrais|pourrait|devons|pouvons)[- ](?:je|tu|on|il|nous|vous) )?faire (?:si|quand|en cas|lorsque|apres|avec|face a|de la|de l|des|du|de|d)|faire (?:l |la |le |un |une )?(?:elimination|nettoyage|neutralisation|stockage|transport|manipulation|dilution|premiers soins|premiers secours|rangement|recyclage|(?:un |une |le |la |l |des )?(?:expose|presentation|resume|dissertation|devoir|fiche|recherche|etude|rapport|analyse|calcul|schema|dessin|bilan|inventaire)s?))\\b",
        "alvoExplosivos" to n_seguranca_alvoExplosivos(),
        "fazerBomba" to "\\b(?:fai(?:re|s|t)|fabriqu\\w*|mont\\w*|assembl\\w*|constru\\w*|cre\\w*|produi\\w*|prepar\\w*|make|build|fazer)\\s+(?:une?\\s+|la\\s+|des\\s+|an?\\s+|uma?\\s+)?(?:bombe|bomb|bomba)s?\\b(?!\\s+(?:calorimetrique|a eau|a chaleur|a vide|a insuline|a carburant|a air|a infusion|hydraulique|peristaltique|immergee|de))",
        "alvoArmas" to n_seguranca_alvoArmas(),
        "alvoDrogas" to n_seguranca_alvoDrogas(),
        "precursoresNomes" to n_seguranca_precursoresNomes(),
        "precursoresAcao" to "\\b(?:extrai\\w*|extraction|obten\\w*|achet\\w*|se procurer|procur\\w*|acqu[ei]r\\w*|detourn\\w*|sans (?:ordonnance|licence|autorisation|permis)|contourn\\w*|vend\\w*|trafiqu\\w*|trafic|cach\\w*|dissimul\\w*|synthese|synthetis\\w*)\\b",
        "alvoDano" to n_seguranca_alvoDano(),
        "alvoAutolesao" to n_seguranca_alvoAutolesao(),
        "perigososCaseiros" to n_seguranca_perigososCaseiros(),
        "casa" to n_seguranca_casa(),
        "coladaAlvos" to n_seguranca_coladaAlvos(),
        "coladaAcoes" to n_seguranca_coladaAcoes()
    )
}
