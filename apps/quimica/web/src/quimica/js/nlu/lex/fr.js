// gerado — não editar. Fonte: contracts/lexico/fr.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "fr",
 "versao": 1,
 "descricao": "Lexique français de l'interpréteur local (NLU par règles) et des règles de sécurité. Même structure que pt-BR.json (vérifiée par test). Regex sous forme de TEXTE, sans drapeaux : le client met la question en minuscules sans accents (seulement [a-z0-9+-] et espaces) avant de comparer. Traduction initiale par agent (révision humaine en attente).",
 "intencoes": {
  "saudacao": "^(salut+|bonjour|bonsoir|coucou|hey|hello|hi|merci|merci beaucoup|aide|help|au secours|menu|accueil|demarrer|commencer|test|essai)( tout le monde| a tous| assistant| ia| ami| ca va| comment ca va)*$",
  "ajuda": "\\b(?:que (?:fais[- ]tu|sais[- ]tu|peux[- ]tu faire|fait (?:l app|l application|cette app|cette application|l ia)|sait (?:l app|l application))|qu est[- ]ce que (?:tu fais|tu sais faire|l app fait|l application fait|je peux demander)|comment (?:utiliser|utilise[- ]t[- ]on|fonctionne|marche) (?:l |cette |le |l )?(?:app|application|assistant)|que puis[- ]je (?:demander|te demander|vous demander|poser)|que peut[- ]on demander|j ai besoin d aide|(?:pouvez|pouvons|peux|peut)[- ](?:vous|tu|on|nous) m aider|aidez[- ]moi|aide[- ]moi|qui a (?:fait|cree|developpe) (?:l |cette )?(?:app|application))\\b",
  "sobreDados": "\\b(?:a propos des donnees|sur les donnees|d ou (?:viennent|proviennent) les donnees|origine des donnees|source des donnees|mise a jour des donnees|les donnees sont[- ](?:elles )?(?:a jour|mises a jour)|les donnees sont (?:a jour|mises a jour)|version des donnees|quand (?:ont ete|les donnees ont[- ]elles ete|les donnees ont ete) mises a jour|signature des donnees)\\b",
  "fontes": "\\b(?:quelles (?:sont )?(?:les )?(?:sources|licences)|quelle licence|sous quelle licence|licences? des donnees|quelle est la source|sources? (?:de (?:l |la |cette )?)?(?:information|reponses?)|d ou (?:vient|sort|provient) (?:cette|la) (?:information|reponse)|references?|bibliographie)\\b",
  "balancear": "\\bequilibr\\w*|\\bajust\\w+ (?:l |une |cette )?equation\\b|\\bajust\\w+ (?:les )?coefficients\\b|\\bbalanc\\w*",
  "conversao": "\\b(?:convert\\w+|convertis|transform\\w+|passer|passe|equivau\\w+|equival\\w+|combien (?:de |d )?\\S+(?: \\S+)? (?:y a[- ]t[- ]il|il y a|font|valent|dans|correspondent|font[- ]ils)|en combien)\\b",
  "ph": "\\b(?:ph|poh)\\b|\\bacidite de\\b|\\bbasicite\\b|\\balcalinite\\b",
  "gas": "\\b(?:gaz parfaits?|gaz ideal|gaz ideaux|pv ?= ?nrt|pvnrt|loi des gaz|equation (?:de clapeyron|des gaz parfaits|d etat)|clapeyron|volume (?:molaire|d un gaz|du gaz)|pression (?:d un gaz|du gaz)|loi de boyle|loi de mariotte|boyle mariotte|loi de charles|gay lussac)\\b",
  "gasVariavel": "\\bgaz\\b",
  "concentracao": "\\b(?:molarite|concentration|concentre\\w*|dilu\\w*|c1 ?v1|c1v1|fraction massique|titre massique|pourcentage (?:en |de )?masse|pourcentage massique|pour ?cent (?:en |de )?masse|pour ?cent massique|parties par million|ppm|normalite|molalite|solution de|grammes? par litre|mol l|mol par litre|moles par litre|g l)\\b",
  "estequiometria": "\\b(?:st(?:oe| )chiometri\\w*|reactif (?:limitant|en exces)|limitant|exces de reactif|rendement|combien de (?:moles?|mol|grammes?|molecules?|atomes?|litres?|ions?|particules?|kilos?|kilogrammes?|mg|milligrammes?)\\b|nombre de (?:moles?|molecules|atomes|particules|ions)|masse de [0-9][0-9.,]* ?(?:mol|moles?|mmol)\\b|cntp|tpn|conditions normales|volume occupe|constante d avogadro|nombre d avogadro)\\b",
  "massaMolar": "\\b(?:masse molaire|masse moleculaire|masse formulaire|poids moleculaire|poids molaire|combien pese (?:une )?mole|quelle est la masse molaire)\\b|\\bg mol\\b",
  "desenhar": "\\b(?:dessin\\w+|structure (?:2d|moleculaire|chimique|plane|de lewis|du|de la|de l|de)|structure|montr\\w+ (?:moi )?(?:la )?(?:structure|molecule)|molecule (?:du|de la|de l|de)|a quoi ressemble (?:la )?(?:molecule|structure)|formule (?:developpee|structurale|semi developpee)|geometrie moleculaire|visualis\\w+|squelette|schema de)\\b",
  "comparar": "\\b(?:compar\\w+|differences? entre|\\bversus\\b|\\bvs\\b|quelle est la difference|\\blequel\\b|\\bquel(?:le)? est (?:le |la )?plus\\b|\\blaquelle\\b|ressemblance\\w*|similitude\\w*|pareil que|semblable a|similaire a)\\b",
  "seguranca": "\\b(?:danger\\w*|dangereu\\w*|risque\\w*|toxi\\w+|securit\\w+|(?:est|est[- ]il|est[- ]elle|c est) sur\\b|epi|equipements? de protection|premiers (?:soins|secours)|deversement\\w*|renvers\\w*|fuite\\w*|stock\\w+|entrepos\\w+|incendie\\w*|feu|inflammab\\w+|corrosi\\w+|irritant\\w*|irrit\\w*|ghs|sgh|pictogramme\\w*|mentions? de danger|phrases? h\\b|fiche de (?:donnees de )?securite|fds|icsc|melang\\w+|incompatib\\w+|elimin\\w+|jeter|manipul\\w+|inhal\\w+|ingest\\w+|ingere\\w*|brulure\\w*|poison\\w*|venimeu\\w*|nocif\\w*|fait mal|est[- ]ce (?:sur|dangereux)|neutralis\\w+|gants|lunettes de protection|mention d avertissement|classification (?:de|des) danger|cancerigen\\w*|cancerogen\\w*|explosi\\w+|reagit avec l eau|reacti\\w+ avec)\\b",
  "nomenclatura": "\\b(?:quel est (?:le |son )?nom|comment (?:s appelle|ca s appelle|on appelle|appelle[- ]t[- ]on)|nom (?:chimique|iupac|systematique|scientifique|officiel)|nomenclature|comment (?:s ecrit|ecrire|on ecrit|ecrit[- ]on)|quelle est (?:la |sa )?formule(?: chimique| brute| moleculaire)?|formule (?:du|de la|de l|de|chimique du|chimique de|brute du|brute de|moleculaire du|moleculaire de)|nom du compose)\\b",
  "tabela": "\\b(?:tableau periodique|classification periodique|periodicite|tendance\\w*|groupe \\d{1,2}|famille \\d{1,2}|periode \\d|bloc [spdf]|elements? (?:du|de la|des|de) (?:groupe|periode|bloc|famille)|quels (?:sont )?(?:les )?elements|combien d elements|elements (?:gazeux|liquides|solides)|metaux|non metaux|semi metaux|metalloides|halogenes?|gaz nobles?|gaz rares?|alcalino terreux|alcalins?|lanthanides?|actinides?|element le plus|elements les plus|ordre croissant|ordre decroissant|plus (?:grand|grande|haut|haute|eleve|elevee) (?:rayon|electronegativite|energie|point|masse|densite)|plus (?:petit|petite|bas|basse|faible) (?:rayon|electronegativite|energie|point|masse|densite))\\b",
  "conceitoCue": "^(?:qu est[- ]ce (?:que |qu )?|c est quoi |que (?:veut dire|signifie)|expli\\w*(?:[- ]moi)?|defin\\w+|concept de|definition (?:de|du|d)|parle[- ]moi de|dis[- ]moi (?:ce que|ce qu)|comment (?:fonctionne|marche)|pourquoi|a quoi sert|quelle est (?:la )?(?:definition|difference|importance|fonction|utilite)|difference entre|apprend\\w*[- ]moi|resum\\w+)\\b",
  "conceitoTemas": "\\b(?:mole|ph|st(?:oe| )chiometrie|liaison (?:ionique|covalente|metallique|chimique)|electronegativite|oxydation|reduction|oxydoreduction|redox|equilibre chimique|enthalpie|entropie|isomerie|acide|base|sel|oxyde|solution|concentration|molarite|dilution|tableau periodique|reaction chimique|cinetique|catalyseur|electrolyse|pile|polarite|forces? intermoleculaires?)\\b"
 },
 "pistas": {
  "querCalcular": "\\b(?:limitant|rendement|combien|masse de|grammes?|moles?|mol|produi\\w*|form\\w*|obt\\w+|reagi\\w*|consomm\\w+|reste\\w*|exces|volume|litres?)\\b",
  "conversaoPreposicoes": "(?:->|→| en | vers | to )",
  "paraUnidade": "(?:\\b(?:en|vers|jusqu['’ ]?a)|(?:^|\\s)[aà])\\s+(?:le |la |les |l['’ ])?((?:degr[eé]s?\\s+)?[A-Za-zÀ-ÿµμ°º/³²·.]+(?: celsius| fahrenheit| par litre| de mercure)?)\\s*[?!.]*$",
  "quantosUnidade": "^\\s*combien (?:de |d['’ ])((?:degr[eé]s\\s+)?[A-Za-zÀ-ÿµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:y a[- ]t[- ]il|il y a|font|valent|dans|correspondent|fait|vaut)(?![A-Za-zÀ-ÿ])",
  "phContexto": "\\b(?:acide|base|solution)\\b",
  "conector": "\\b(?:de|du|d)\\b",
  "prefixoExplicacao": "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli|defin|concept|definition|comment fonctionne|comment marche|pourquoi)",
  "prefixoExplicacaoPalavra": "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli\\w*|defin\\w*|concept|definition|parle[- ]moi de|comment fonctionne|comment marche|pourquoi)\\b",
  "prefixoDefinicao": "^(?:qu est[- ]ce|c est quoi|que veut dire|que signifie|expli\\w*|defin\\w*|concept|definition)\\b",
  "gasGrandezas": "\\b(?:volume|pression|temperature|moles?|mol|combien)\\b",
  "concentracaoForte": "\\bdilu\\w*|molarite|concentration\\b",
  "propriedadesPalavra": "\\bproprietes\\b",
  "mistura": "\\b(?:melang\\w+|avec|ensemble|combin\\w+|incompatib\\w+)\\b",
  "elementoPalavra": "\\belements?\\b",
  "gasSubstancia": "\\bgaz\\b",
  "tendencia": "\\btendance\\w*|\\bperiodicite|\\bvari\\w* (?:le long|dans la periode|dans le groupe|au sein)|\\ble long (?:de la|d une|du|d un) (?:periode|groupe)",
  "tabelaPalavra": "\\btableau periodique\\b|\\bclassification periodique\\b",
  "grupo": "\\b(?:groupe|famille)\\s+(\\d{1,2})\\b",
  "periodo": "\\bperiode\\s+(\\d)\\b",
  "bloco": "\\bbloc\\s+([spdf])\\b",
  "continuacao": "^et (?:le |la |les |l |celui |celle |ceux )?(?:de |du |des |d |pour )?",
  "limparConceito": [
   "^[- ]*(?:est |sont |signifie |veut dire |serait |ce que |que |moi )*",
   "^(?:un |une |le |la |les |l |de |du |des |d )+"
  ],
  "constantes": "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|egal a|egale a|vaut|est)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
  "quantidadeComplemento": "(?:de|d|par)",
  "letrasUnidade": "A-Za-zçéèêàù",
  "ligacaoPreposicoes": "(?:de|d|du|des)",
  "diluicao": "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
  "percentualMassa": "\\bmasse|pourcent|pour cent|titre|fraction\\b",
  "cntp": "\\b(?:cntp|tpn|conditions normales|volume)\\b",
  "cueElemento": "\\b(?:element|symbole|symbole chimique)\\b"
 },
 "nivel": {
  "fundamental": "\\b(?:primaire|ecole primaire|college|enfant|enfants|simple|tres simple|facile a comprendre|pour debutants|pour les nuls)\\b",
  "medio": "\\b(?:lycee|secondaire|bac|baccalaureat|terminale|premiere|seconde)\\b",
  "superior": "\\b(?:universite|fac|faculte|superieur|avance|licence|master|approfondi\\w*|detaille\\w*)\\b"
 },
 "unidades": [
  [
   "^degres? (?:celsius|centigrades?)$|^celsius$",
   "°C"
  ],
  [
   "^degres? fahrenheit$|^fahrenheit$",
   "°F"
  ],
  [
   "^kelvins?$",
   "K"
  ],
  [
   "^atmospheres?$|^atmosph$",
   "atm"
  ],
  [
   "^pascals?$",
   "Pa"
  ],
  [
   "^kilopascals?$",
   "kPa"
  ],
  [
   "^millimetres? de mercure$",
   "mmHg"
  ],
  [
   "^litres?$",
   "L"
  ],
  [
   "^millilitres?$",
   "mL"
  ],
  [
   "^microlitres?$",
   "µL"
  ],
  [
   "^grammes?$",
   "g"
  ],
  [
   "^milligrammes?$",
   "mg"
  ],
  [
   "^kilogrammes?$|^kilos?$",
   "kg"
  ],
  [
   "^tonnes?$",
   "t"
  ],
  [
   "^moles?$|^mols?$",
   "mol"
  ],
  [
   "^millimoles?$",
   "mmol"
  ],
  [
   "^kilomoles?$",
   "kmol"
  ],
  [
   "^joules?$",
   "J"
  ],
  [
   "^calories?$",
   "cal"
  ],
  [
   "^kilocalories?$",
   "kcal"
  ],
  [
   "^kilojoules?$",
   "kJ"
  ],
  [
   "^molaires?$",
   "mol/L"
  ],
  [
   "^mol par litre$|^moles? par litre$",
   "mol/L"
  ],
  [
   "^grammes? par litre$",
   "g/L"
  ],
  [
   "^(?:molecules?|atomes?|particules?|ions?|unites|entites)$",
   "particulas"
  ],
  [
   "^metres?$",
   "m"
  ],
  [
   "^centimetres?$",
   "cm"
  ],
  [
   "^millimetres?$",
   "mm"
  ],
  [
   "^nanometres?$",
   "nm"
  ],
  [
   "^kilometres?$",
   "km"
  ],
  [
   "^pour ?cent$",
   "%"
  ],
  [
   "^bars?$",
   "bar"
  ],
  [
   "^torr$",
   "mmHg"
  ],
  [
   "^heures?$",
   "h"
  ],
  [
   "^minutes?$",
   "min"
  ],
  [
   "^secondes?$",
   "s"
  ]
 ],
 "categorias": [
  [
   "\\balcalino ?terreu\\w*",
   "metal_alcalino_terroso"
  ],
  [
   "\\bmetaux alcalins?|\\bmetal alcalin|\\balcalins\\b",
   "metal_alcalino"
  ],
  [
   "\\bmetaux de transition|\\bmetal de transition|\\belements? de transition",
   "metal_transicao"
  ],
  [
   "\\bpost ?transition|\\bmetaux pauvres|\\bmetal pauvre",
   "metal_pos_transicao"
  ],
  [
   "\\bsemi ?metaux|\\bsemi ?metal|\\bmetalloides?",
   "semimetal"
  ],
  [
   "\\bnon ?metaux|\\bnon ?metal",
   "nao_metal"
  ],
  [
   "\\bhalogenes?",
   "halogenio"
  ],
  [
   "\\bgaz nobles?|\\bgaz rares?|\\bnobles\\b",
   "gas_nobre"
  ],
  [
   "\\blanthanides?|\\bterres rares",
   "lantanideo"
  ],
  [
   "\\bactinides?|\\bactinoides?",
   "actinideo"
  ],
  [
   "\\bmetaux\\b|\\bmetal\\b",
   "metal"
  ]
 ],
 "estados": [
  [
   "\\b(?:gazeux|gaz|a l etat gazeux)\\b",
   "gas"
  ],
  [
   "\\bliquides?\\b",
   "liquido"
  ],
  [
   "\\bsolides?\\b",
   "solido"
  ]
 ],
 "extremos": [
  [
   "\\bplus electronegati\\w+|\\bplus (?:grande|forte|haute|elevee) electronegativite|\\belectronegativite (?:la )?plus (?:grande|forte|haute|elevee)",
   "eletronegatividade",
   "max"
  ],
  [
   "\\bmoins electronegati\\w+|\\bplus (?:petite|faible|basse) electronegativite|\\belectronegativite (?:la )?plus (?:petite|faible|basse)",
   "eletronegatividade",
   "min"
  ],
  [
   "\\bplus dense\\b|\\bplus (?:grande|forte|haute|elevee) (?:densite|masse volumique)|\\b(?:densite|masse volumique) (?:la )?plus (?:grande|forte|haute|elevee)",
   "densidadeKgm3",
   "max"
  ],
  [
   "\\bmoins dense\\b|\\bplus (?:petite|faible|basse) (?:densite|masse volumique)|\\b(?:densite|masse volumique) (?:la )?plus (?:petite|faible|basse)",
   "densidadeKgm3",
   "min"
  ],
  [
   "\\bplus (?:grand|gros) rayon|\\brayon (?:atomique )?(?:le )?plus (?:grand|gros)|\\bplus volumineu\\w+",
   "raioAtomicoPm",
   "max"
  ],
  [
   "\\bplus petit rayon|\\brayon (?:atomique )?(?:le )?plus petit",
   "raioAtomicoPm",
   "min"
  ],
  [
   "\\bplus (?:haut|eleve|grand) point de fusion|\\bpoint de fusion (?:le )?plus (?:haut|eleve|grand)",
   "pontoFusaoK",
   "max"
  ],
  [
   "\\bplus (?:bas|faible|petit) point de fusion|\\bpoint de fusion (?:le )?plus (?:bas|faible|petit)",
   "pontoFusaoK",
   "min"
  ],
  [
   "\\bplus (?:haut|eleve|grand) point d ebullition|\\bpoint d ebullition (?:le )?plus (?:haut|eleve|grand)",
   "pontoEbulicaoK",
   "max"
  ],
  [
   "\\bplus (?:bas|faible|petit) point d ebullition|\\bpoint d ebullition (?:le )?plus (?:bas|faible|petit)",
   "pontoEbulicaoK",
   "min"
  ],
  [
   "\\bplus (?:haute|elevee|grande) energie d ionisation|\\benergie d ionisation (?:la )?plus (?:haute|elevee|grande)",
   "energiaIonizacaoKJmol",
   "max"
  ],
  [
   "\\bplus (?:basse|faible|petite) energie d ionisation|\\benergie d ionisation (?:la )?plus (?:basse|faible|petite)",
   "energiaIonizacaoKJmol",
   "min"
  ],
  [
   "\\bplus lourd\\w*|\\bplus (?:grande|haute|elevee) masse atomique|\\bmasse atomique (?:la )?plus (?:grande|haute|elevee)",
   "massaAtomica",
   "max"
  ],
  [
   "\\bplus (?:petite|faible|basse) masse atomique|\\bmasse atomique (?:la )?plus (?:petite|faible|basse)|\\bplus leger\\w*",
   "massaAtomica",
   "min"
  ]
 ],
 "propriedades": {
  "numeroAtomico": [
   "numero atomique",
   "nombre atomique",
   "z"
  ],
  "massaAtomica": [
   "masse atomique",
   "poids atomique",
   "masse de l atome"
  ],
  "simbolo": [
   "symbole"
  ],
  "grupo": [
   "groupe",
   "famille"
  ],
  "periodo": [
   "periode"
  ],
  "bloco": [
   "bloc"
  ],
  "categoria": [
   "categorie",
   "classification",
   "type d element",
   "classe de l element"
  ],
  "configuracaoEletronica": [
   "configuration electronique",
   "structure electronique",
   "repartition electronique"
  ],
  "eletronegatividade": [
   "electronegativite"
  ],
  "raioAtomicoPm": [
   "rayon atomique",
   "rayon de van der waals",
   "taille de l atome"
  ],
  "afinidadeEletronicaKJmol": [
   "affinite electronique"
  ],
  "energiaIonizacaoKJmol": [
   "energie d ionisation",
   "potentiel d ionisation",
   "premiere energie d ionisation"
  ],
  "pontoFusaoK": [
   "point de fusion",
   "temperature de fusion",
   "fusion",
   "fond",
   "fondre"
  ],
  "pontoEbulicaoK": [
   "point d ebullition",
   "temperature d ebullition",
   "ebullition",
   "bout",
   "bouillir"
  ],
  "densidadeKgm3": [
   "densite",
   "masse volumique"
  ],
  "estadoPadrao": [
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
  ],
  "estadosOxidacao": [
   "etats d oxydation",
   "nombres d oxydation",
   "etat d oxydation",
   "nombre d oxydation",
   "degre d oxydation",
   "degres d oxydation",
   "valence"
  ],
  "descoberta": [
   "decouverte",
   "decouvert",
   "decouvreur",
   "qui a decouvert",
   "annee de decouverte",
   "quand a ete decouvert",
   "a ete decouvert",
   "a ete decouverte",
   "ont ete decouverts"
  ],
  "massaMolar": [
   "masse molaire",
   "masse moleculaire",
   "poids moleculaire",
   "poids molaire",
   "masse formulaire"
  ],
  "massaExata": [
   "masse exacte",
   "masse monoisotopique"
  ],
  "formula": [
   "formule",
   "formule moleculaire",
   "formule chimique",
   "formule brute"
  ],
  "cas": [
   "numero cas",
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
   "nom iupac",
   "nom systematique",
   "iupac"
  ],
  "xlogp": [
   "xlogp",
   "logp",
   "lipophilie",
   "coefficient de partage"
  ],
  "doadoresH": [
   "donneurs de liaison hydrogene",
   "donneurs d hydrogene",
   "donneurs de liaisons hydrogene"
  ],
  "aceptoresH": [
   "accepteurs de liaison hydrogene",
   "accepteurs d hydrogene",
   "accepteurs de liaisons hydrogene"
  ],
  "ligacoesRotaveis": [
   "liaisons rotatives",
   "liaisons rotables"
  ],
  "carga": [
   "charge electrique",
   "charge formelle"
  ],
  "tpsa": [
   "tpsa",
   "surface polaire",
   "aire de surface polaire"
  ]
 },
 "rotulosPropriedadeNormalizados": true,
 "stopwordsBusca": [
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
 ],
 "stopPalavras": [
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
 ],
 "palavrasFuncionais": [
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
  "Tu",
  "Ce",
  "Ne",
  "Sa",
  "Ma",
  "Au",
  "Du",
  "Ou"
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
  "NON"
 ],
 "seguranca": {
  "acao": [
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
  ],
  "contextoSeguro": [
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
  ],
  "tirarFazerSeguro": "\\b(?:que (?:(?:dois|puis|devrais|peux|doit|peut|faut|pourrais|pourrait|devons|pouvons)[- ](?:je|tu|on|il|nous|vous) )?faire (?:si|quand|en cas|lorsque|apres|avec|face a|de la|de l|des|du|de|d)|faire (?:l |la |le |un |une )?(?:elimination|nettoyage|neutralisation|stockage|transport|manipulation|dilution|premiers soins|premiers secours|rangement|recyclage|(?:un |une |le |la |l |des )?(?:expose|presentation|resume|dissertation|devoir|fiche|recherche|etude|rapport|analyse|calcul|schema|dessin|bilan|inventaire)s?))\\b",
  "alvoExplosivos": [
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
  ],
  "fazerBomba": "\\b(?:fai(?:re|s|t)|fabriqu\\w*|mont\\w*|assembl\\w*|constru\\w*|cre\\w*|produi\\w*|prepar\\w*|make|build|fazer)\\s+(?:une?\\s+|la\\s+|des\\s+|an?\\s+|uma?\\s+)?(?:bombe|bomb|bomba)s?\\b(?!\\s+(?:calorimetrique|a eau|a chaleur|a vide|a insuline|a carburant|a air|a infusion|hydraulique|peristaltique|immergee|de))",
  "alvoArmas": [
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
  ],
  "alvoDrogas": [
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
  ],
  "precursoresNomes": [
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
  ],
  "precursoresAcao": "\\b(?:extrai\\w*|extraction|obten\\w*|achet\\w*|se procurer|procur\\w*|acqu[ei]r\\w*|detourn\\w*|sans (?:ordonnance|licence|autorisation|permis)|contourn\\w*|vend\\w*|trafiqu\\w*|trafic|cach\\w*|dissimul\\w*|synthese|synthetis\\w*)\\b",
  "alvoDano": [
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
  ],
  "alvoAutolesao": [
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
  ],
  "perigososCaseiros": [
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
  ],
  "casa": [
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
  ],
  "coladaAlvos": {
   "EXPLOSIVOS": [
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
   ],
   "ARMAS_QUIMICAS": [
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
   ],
   "DROGAS": [
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
   ],
   "PRECURSORES": [
    "pseudoephedrine",
    "ephedrine",
    "safrole",
    "phenylacetone",
    "anhydrideacetique",
    "precurseurs",
    "pseudoefedrina"
   ]
  },
  "coladaAcoes": [
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
  ]
 }
};
