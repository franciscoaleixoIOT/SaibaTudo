// gerado — não editar. Fonte: contracts/lexico/en.json (api/_lib/lexico/sincronizar.mjs). Regexes como texto; _lib/lexico.js compila.
export default {
 "idioma": "en",
 "versao": 1,
 "descricao": "English lexicon of the local rule-based NLU and of the safety rules. Same structure as pt-BR.json (checked by test). Regexes as TEXT, no flags: the client lowercases and strips accents (only [a-z0-9+-] and spaces) before matching. Only syntax common to JS and java.util.regex.",
 "intencoes": {
  "saudacao": "^(hi+|hello|hey|good morning|good afternoon|good evening|howdy|yo|thanks?|thank you|thx|ty|cheers|help|menu|home|start|test|testing)( there| everyone| assistant| ai| friend| folks| how are you| whats up| all good)*$",
  "ajuda": "\\b(?:what (?:do you|can you|does (?:this|the) app|does it) (?:do|know|answer)|how (?:do i|to|does (?:this|the) app|does it) (?:use|work)(?: (?:this|the) (?:app|assistant))?|what can i ask|i need help|who (?:made|built|created|developed) (?:this|the) app|how does this work)\\b",
  "sobreDados": "\\b(?:about the data|where (?:does|do) the data come from|origin of the data|data source|data update|is the data (?:up to date|updated)|data version|when was (?:it|the data) (?:last )?updated|data signature)\\b",
  "fontes": "\\b(?:what are the (?:sources|licen[cs]es)|which sources|which licen[cs]es|data licen[cs]es?|what is the source|sources? (?:of (?:the )?)?(?:information|answers?)|where (?:did you get|does) (?:this|that|the) (?:information|answer)(?: come from)?|references?)\\b",
  "balancear": "\\bbalanc\\w*|\\bequalize the equation\\b|\\badjust (?:the )?coefficients\\b",
  "conversao": "\\b(?:convert\\w*|transform\\w*|change|equivalent|equals?|how many \\S+(?: \\S+)? (?:are|is|in|make|equal|correspond)|how much \\S+(?: \\S+)? (?:is|in|makes?|equals?)|in how many|into)\\b",
  "ph": "\\b(?:ph|poh)\\b|\\bacidity of\\b|\\bbasicity\\b|\\balkalinity\\b",
  "gas": "\\b(?:ideal gas(?:es)?|perfect gas|pv ?= ?nrt|pvnrt|gas law|ideal gas (?:law|equation)|clapeyron|molar volume|volume of (?:a |the )?gas|pressure of (?:a |the )?gas|boyle'?s? law|charles'?s? law|gay[- ]lussac|(?:pressure|volume|temperature) of .{0,24}\\bgas)\\b",
  "gasVariavel": "\\bgas(?:es)?\\b",
  "concentracao": "\\b(?:molarity|concentration|concentrated|dilut\\w*|c1 ?v1|c1v1|mass fraction|mass percent(?:age)?|percent(?:age)? by mass|weight percent|parts per million|ppm|normality|molality|solution of|grams per lit(?:er|re)|mol l|mol per lit(?:er|re)|moles per lit(?:er|re)|g l)\\b",
  "estequiometria": "\\b(?:stoichiometr\\w*|limiting (?:reagent|reactant)|reagent in excess|excess reagent|excess reactant|yield|how many (?:moles?|mols?|grams?|molecules?|atoms?|lit(?:er|re)s?|ions?|particles?|kilos?|kilograms?|mg|milligrams?)\\b|number of (?:moles?|molecules|atoms|particles|ions)|stp|standard (?:temperature and pressure|conditions)|volume occupied|avogadro'?s? (?:constant|number))\\b",
  "massaMolar": "\\b(?:molar mass|molecular (?:mass|weight)|formula (?:mass|weight)|molar weight|how much does (?:a |one )?mole(?: of \\S+)? weigh|what is the molar mass)\\b|\\bg mol\\b",
  "desenhar": "\\b(?:draw\\w*|structure (?:2d|molecular|chemical|of|for)|2d structure|structure|show (?:me )?(?:the )?(?:structure|molecule)|molecule of|what does (?:the )?(?:molecule|structure) (?:of \\S+ )?look like|structural formula|molecular geometry|visuali[sz]e|skeleton|sketch)\\b",
  "comparar": "\\b(?:compar\\w+|difference between|differences between|\\bversus\\b|which (?:is|one is|has) (?:heavier|lighter|denser|bigger|larger|smaller|higher|lower|stronger|weaker|more|less|the (?:highest|lowest|greatest|biggest|smallest))|\\bvs\\b|what is the difference|similarit\\w+|same as|similar to|alike|(?:increasing|decreasing|ascending|descending) order|in order of|order (?:them|these|from)|arrange\\w*|rank\\w*|put (?:them |these )?in order|which (?:one )?(?:is|has) the (?:higher|larger|bigger|greater|lower|smaller|heavier|lighter|denser|highest|largest|lowest|smallest)|which (?:one )?is (?:more|less) \\w+)\\b",
  "seguranca": "\\b(?:danger\\w*|hazard\\w*|toxic\\w*|safe\\w*|ppe|protective equipment|first aid|spill\\w*|leak\\w*|stor(?:e|age|ing)|fire\\w*|flammab\\w*|corrosiv\\w*|irritant\\w*|irritat\\w*|ghs|pictograms?|h[- ]?statements?|h[- ]?phrases?|safety data sheet|sds|msds|icsc|mix\\w*|incompatib\\w*|dispos\\w*|handl\\w+|inhal\\w+|ingest\\w+|swallow\\w*|burns?|poison\\w*|harmful|is it safe|is it dangerous|neutrali[sz]\\w+|gloves|goggles|signal word|hazard classification|carcinogen\\w*|explosiv\\w*|reacts? with water|reactiv\\w+ with)\\b",
  "nomenclatura": "\\b(?:what is the name|what is it called|what is \\S+ called|what do we call|what do you call|name (?:of|for)|chemical name|iupac name|systematic name|scientific name|official name|nomenclature|how (?:do you|to) (?:write|spell)|what is the (?:chemical |molecular )?formula|formula (?:of|for)|name of the compound)\\b",
  "tabela": "\\b(?:periodic table|periodicity|trends?|group \\d{1,2}|family \\d{1,2}|period \\d|block [spdf]|[spdf][- ]block|elements? (?:of|in|from) (?:the )?(?:group|period|block|family)|which (?:are the )?elements|what elements|how many elements|(?:gaseous|liquid|solid) elements|metals|non[- ]?metals|nonmetals|metalloids|semimetals|halogens?|noble gas(?:es)?|alkaline earth metals?|alkali metals?|lanthanides?|lanthanoids?|actinides?|actinoids?|most \\w+ element|least \\w+ element|ascending order|descending order|(?:highest|largest|biggest|greatest|lowest|smallest) (?:atomic radius|radius|electronegativity|energy|point|mass|density))\\b",
  "conceitoCue": "^(?:what (?:is|are|does|do) (?:a |an |the )?(?:\\w+ )?(?:mean|means)?|what is|what are|what does \\S+ mean|whats|explain\\w*|defin\\w+|concept of|definition of|tell me about|how does \\S+ work|how do \\S+ work|why|what is \\S+ for|what is the (?:definition|difference|importance|function|role)|difference between|teach\\w*|summari[sz]e)\\b",
  "conceitoTemas": "\\b(?:mole|ph|stoichiometry|(?:ionic|covalent|metallic|chemical) bond(?:ing)?|electronegativity|oxidation|reduction|redox|chemical equilibrium|enthalpy|entropy|isomer(?:ism|s)|acid|base|salt|oxide|solution|concentration|molarity|dilution|periodic table|chemical reaction|kinetics|catalyst|electrolysis|battery|galvanic cell|polarity|intermolecular forces?)\\b",
  "nox": "\\b(?:oxidation (?:number|state)s?|ox(?:idation)? numbers?)\\b",
  "entalpia": "\\b(?:enthalp(?:y|ies)|heats? of (?:reaction|combustion)|reaction heat|heat (?:released|absorbed|given off|evolved)|energy (?:released|absorbed)|hess s law|hess law|hess|delta h|exothermic|endothermic)\\b",
  "equilibrio": "\\b(?:kc|kp|equilibrium constants?|equilibrium expression|expression for (?:kc|kp|the equilibrium constant)|law of mass action|at equilibrium|reaction quotient|chemical equilibrium)\\b",
  "ligacao": "\\b(?:(?:type|kind)s? of (?:chemical )?bonds?|bond types?|(?:ionic|covalent|metallic|polar|nonpolar|non polar|apolar) bonds?|(?:what|which) (?:type of |kind of )?bonds?|bonds? (?:between|in|of)|bonding (?:between|in)|nature of the bond)\\b"
 },
 "pistas": {
  "querCalcular": "\\b(?:limiting|yield|how many|how much|mass of|grams?|moles?|mols?|produc\\w*|form\\w*|obtain\\w*|react\\w*|consum\\w+|left over|remain\\w*|excess|volume|lit(?:er|re)s?)\\b",
  "conversaoPreposicoes": "(?:->|→| to | into | in )",
  "paraUnidade": "\\b(?:to|into|in)\\s+(?:the )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| per lit(?:er|re)| of mercury)?)\\s*[?!.]*$",
  "quantosUnidade": "^\\s*(?:how many|how much)\\s+((?:degrees\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:are|is|in|make|equal|equals|correspond|fit)(?![A-Za-z])",
  "phContexto": "\\b(?:acid|base|solution)\\b",
  "conector": "\\bof\\b",
  "prefixoExplicacao": "^(?:what is|what are|whats|explain|defin|concept|how does|why)(?!\\s+the\\b)",
  "prefixoExplicacaoPalavra": "^(?:what is|what are|whats|explain\\w*|defin\\w*|concept|how does|why)\\b(?!\\s+the\\b)",
  "prefixoDefinicao": "^(?:what is|what are|whats|explain\\w*|defin\\w*|concept)\\b(?!\\s+the\\b)",
  "gasGrandezas": "\\b(?:volume|pressure|temperature|moles?|mols?|how many|how much)\\b",
  "concentracaoForte": "\\bdilut\\w*|molarity|concentration\\b",
  "propriedadesPalavra": "\\bproperties\\b",
  "mistura": "\\b(?:mix\\w*|together with|together|combin\\w+|mixed|incompatib\\w+)\\b",
  "elementoPalavra": "\\belements?\\b",
  "gasSubstancia": "\\bgas\\b",
  "tendencia": "\\btrends?\\b|\\bperiodicity|\\bvar(?:y|ies|iation) (?:along|across|down|within) (?:the )?(?:period|group)|\\b(?:along|across|down) (?:the |a )?(?:period|group)",
  "tabelaPalavra": "\\bperiodic table\\b",
  "grupo": "\\b(?:group|family)\\s+(\\d{1,2})\\b",
  "periodo": "\\bperiod\\s+(\\d)\\b",
  "bloco": "\\bblock\\s+([spdf])\\b|\\b([spdf])[- ]block\\b",
  "continuacao": "^(?:and|what about) (?:the |that |this )?(?:of |for )?",
  "continuacaoNuvem": "^(?:and|what about|how about|now|ok|okay|cool|got it|so|then|also|too|in|with|same|redo|draw|show|tell me more)(?: |$)|(?:^| )(?:too|also|as well|its|it)(?: |$)",
  "limparConceito": [
   "^(?:is |are |does |do |mean |means |a |an |the )+",
   "^(?:a |an |the |of |for )+"
  ],
  "constantes": "\\b(pka|pkb|ka|kb)\\s*(?:=|:|of|is|equal to|equals)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
  "quantidadeComplemento": "(?:of|per)",
  "letrasUnidade": "A-Za-z",
  "ligacaoPreposicoes": "(?:of)",
  "diluicao": "\\b(?:dilut\\w*|c1v1|c1 v1)\\b",
  "percentualMassa": "\\bmass|percent|weight|fraction\\b",
  "cntp": "\\b(?:stp|standard conditions|standard temperature|volume)\\b",
  "cueElemento": "\\b(?:element|symbol|chemical symbol)\\b",
  "reacaoVerbo": "\\b(?:formed|produced|obtained|react|reacts|reacting|reacted|consumed|needed|required|released|given off|from|burn\\w*|combustion|decompos\\w+)\\b",
  "pedidoQuantidade": "\\b(?:weigh\\w*|mass(?! (?:number|spectrometry))|moles?|mols?|amount of substance|volume)\\b",
  "ordemCrescente": "\\b(?:increasing|ascending|from (?:the )?(?:lowest|smallest|least) to (?:the )?(?:highest|largest|greatest|most)|which (?:one )?(?:is|has) (?:the )?(?:lower|smaller|lowest|smallest|lighter|less|least))\\b",
  "ordemDecrescente": "\\b(?:decreasing|descending|from (?:the )?(?:highest|largest|greatest|most) to (?:the )?(?:lowest|smallest|least)|which (?:one )?(?:is|has) (?:the )?(?:higher|larger|bigger|greater|highest|largest|biggest|greatest|heavier|denser|more|most))\\b",
  "conectivoLista": "^(?:and|or)$",
  "paraUnidades": "\\b(?:to|into|in)\\s+(?:the )?",
  "paraUnidadesFim": "\\s*[?!.]*$",
  "misturaTema": "\\b(mixture)s?\\b",
  "misturaConceito": "\\b(?:substances?|pure|homogeneous|heterogeneous|systems?|classif\\w*|types? of|what (?:is|are)|difference between|phases?)\\b",
  "nomenclaturaPedido": "\\b(?:what is (?:it|this|that) called|what is \\S+ called|what do (?:we|you) call|name (?:this|these|that|the following|the)|give the (?:iupac |systematic |correct )?name|what is the (?:iupac |systematic |official |common |correct )?name|(?:iupac|systematic|official) name|how (?:do (?:you|i|we) |to |would you )name)\\b",
  "nomenclaturaAlvo": "\\b(?:compounds?|substances?|molecules?|hydrocarbons?|organic|chains?|structures?|\\w*(?:meth|eth|prop|but|pent|hex|hept|oct|non|dec|phen|benz)\\w*(?:ane|ene|yne|ol|one|oic|yl|amine))\\b",
  "noxAlvo": "\\b(?:of|for) (?:the )?(\\S+(?: \\S+)?) (?:in|within)\\b",
  "entalpiaCombustao": "\\b(?:combustion|combusting|burning|burn|burned|burnt)\\b",
  "entalpiaFormacao": "\\b(?:(?:standard )?enthalp(?:y|ies) of formation|heats? of formation|formation enthalp(?:y|ies))\\b",
  "hess": "\\b(?:hess s law|hess law|hess)\\b",
  "kcKp": "\\b(?:kp|partial pressures?)\\b",
  "concentracaoColchete": "=|:|is|equals|of",
  "ligacaoPolaridade": "\\b(?:ionic|covalent|polar|nonpolar|non polar|apolar|metallic)\\b"
 },
 "nivel": {
  "fundamental": "\\b(?:elementary school|primary school|middle school|for kids|for children|simple|very simple|easy to understand|for beginners|layman)\\b",
  "medio": "\\b(?:high school|secondary school|sat|a level|ib)\\b",
  "superior": "\\b(?:college|university|undergraduate|advanced|graduate|in depth|detailed)\\b"
 },
 "unidades": [
  [
   "^degrees? (?:celsius|centigrade)$|^celsius$|^centigrade$",
   "°C"
  ],
  [
   "^degrees? fahrenheit$|^fahrenheit$",
   "°F"
  ],
  [
   "^kelvins?$",
   "K"
  ],
  [
   "^atmospheres?$",
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
   "^millimet(?:er|re)s? of mercury$",
   "mmHg"
  ],
  [
   "^lit(?:er|re)s?$",
   "L"
  ],
  [
   "^millilit(?:er|re)s?$",
   "mL"
  ],
  [
   "^microlit(?:er|re)s?$",
   "µL"
  ],
  [
   "^grams?$|^grammes?$",
   "g"
  ],
  [
   "^milligrams?$",
   "mg"
  ],
  [
   "^kilograms?$|^kilos?$",
   "kg"
  ],
  [
   "^tons?$|^tonnes?$",
   "t"
  ],
  [
   "^moles?$|^mols?$",
   "mol"
  ],
  [
   "^millimoles?$|^millimols?$",
   "mmol"
  ],
  [
   "^kilomoles?$|^kilomols?$",
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
   "^molar$",
   "mol/L"
  ],
  [
   "^moles? per lit(?:er|re)$|^mols? per lit(?:er|re)$",
   "mol/L"
  ],
  [
   "^grams? per lit(?:er|re)$",
   "g/L"
  ],
  [
   "^(?:molecules?|atoms?|particles?|ions?|units|entities)$",
   "particulas"
  ],
  [
   "^met(?:er|re)s?$",
   "m"
  ],
  [
   "^centimet(?:er|re)s?$",
   "cm"
  ],
  [
   "^millimet(?:er|re)s?$",
   "mm"
  ],
  [
   "^nanomet(?:er|re)s?$",
   "nm"
  ],
  [
   "^kilomet(?:er|re)s?$",
   "km"
  ],
  [
   "^per ?cent$|^percent$",
   "%"
  ],
  [
   "^bars?$",
   "bar"
  ],
  [
   "^torrs?$",
   "Torr"
  ],
  [
   "^hours?$",
   "h"
  ],
  [
   "^minutes?$",
   "min"
  ],
  [
   "^seconds?$",
   "s"
  ],
  [
   "^cubic met(?:er|re)s?$",
   "m3"
  ],
  [
   "^cubic decimet(?:er|re)s?$",
   "dm3"
  ],
  [
   "^cubic centimet(?:er|re)s?$",
   "cm3"
  ]
 ],
 "numerais": [
  [
   "half an?|half",
   0.5
  ],
  [
   "one",
   1
  ],
  [
   "two",
   2
  ],
  [
   "three",
   3
  ],
  [
   "four",
   4
  ],
  [
   "five",
   5
  ],
  [
   "six",
   6
  ],
  [
   "seven",
   7
  ],
  [
   "eight",
   8
  ],
  [
   "nine",
   9
  ],
  [
   "ten",
   10
  ]
 ],
 "categorias": [
  [
   "\\balkaline earth\\w*",
   "metal_alcalino_terroso"
  ],
  [
   "\\balkali metals?|\\balkali\\b|\\balkalis\\b",
   "metal_alcalino"
  ],
  [
   "\\btransition metals?|\\btransition elements?",
   "metal_transicao"
  ],
  [
   "\\bpost[- ]?transition|\\brepresentative metals?",
   "metal_pos_transicao"
  ],
  [
   "\\bmetalloids?|\\bsemimetals?|\\bsemi[- ]metals?",
   "semimetal"
  ],
  [
   "\\bnon[- ]?metals?|\\bnonmetals?",
   "nao_metal"
  ],
  [
   "\\bhalogens?",
   "halogenio"
  ],
  [
   "\\bnoble gas(?:es)?|\\binert gas(?:es)?",
   "gas_nobre"
  ],
  [
   "\\blanthanides?|\\blanthanoids?|\\brare earths?",
   "lantanideo"
  ],
  [
   "\\bactinides?|\\bactinoids?",
   "actinideo"
  ],
  [
   "\\bmetals\\b|\\bmetal\\b",
   "metal"
  ]
 ],
 "estados": [
  [
   "\\b(?:gaseous|gases|in the gas(?:eous)? state)\\b",
   "gas"
  ],
  [
   "\\bliquids?\\b",
   "liquido"
  ],
  [
   "\\bsolids?\\b",
   "solido"
  ]
 ],
 "extremos": [
  [
   "\\bmost electronegativ\\w+|\\bhighest electronegativity",
   "eletronegatividade",
   "max"
  ],
  [
   "\\bleast electronegativ\\w+|\\blowest electronegativity",
   "eletronegatividade",
   "min"
  ],
  [
   "\\bdensest\\b|\\bmost dense\\b|\\bhighest density",
   "densidadeKgm3",
   "max"
  ],
  [
   "\\bleast dense\\b|\\blowest density|\\blightest\\b",
   "densidadeKgm3",
   "min"
  ],
  [
   "\\b(?:largest|biggest|greatest) (?:atomic )?radius|\\bmost voluminous",
   "raioAtomicoPm",
   "max"
  ],
  [
   "\\bsmallest (?:atomic )?radius",
   "raioAtomicoPm",
   "min"
  ],
  [
   "\\bhighest melting point",
   "pontoFusaoK",
   "max"
  ],
  [
   "\\blowest melting point",
   "pontoFusaoK",
   "min"
  ],
  [
   "\\bhighest boiling point",
   "pontoEbulicaoK",
   "max"
  ],
  [
   "\\blowest boiling point",
   "pontoEbulicaoK",
   "min"
  ],
  [
   "\\bhighest ionization energy|\\bhighest ionisation energy",
   "energiaIonizacaoKJmol",
   "max"
  ],
  [
   "\\blowest ionization energy|\\blowest ionisation energy",
   "energiaIonizacaoKJmol",
   "min"
  ],
  [
   "\\bhighest atomic mass|\\bheaviest\\b",
   "massaAtomica",
   "max"
  ],
  [
   "\\blowest atomic mass|\\blightest atom",
   "massaAtomica",
   "min"
  ]
 ],
 "propriedades": {
  "numeroAtomico": [
   "atomic number",
   "z"
  ],
  "massaAtomica": [
   "atomic mass",
   "atomic weight",
   "mass of the atom"
  ],
  "simbolo": [
   "symbol"
  ],
  "grupo": [
   "group",
   "family"
  ],
  "periodo": [
   "period"
  ],
  "bloco": [
   "block"
  ],
  "categoria": [
   "category",
   "classification",
   "type of element",
   "element class",
   "kind of element"
  ],
  "configuracaoEletronica": [
   "electron configuration",
   "electronic configuration",
   "electron distribution",
   "electron shells",
   "electrons per shell",
   "shell configuration",
   "valence electrons",
   "valence shell",
   "aufbau diagram",
   "subshells",
   "highest energy subshell",
   "electron shell distribution"
  ],
  "eletronegatividade": [
   "electronegativity"
  ],
  "raioAtomicoPm": [
   "atomic radius",
   "van der waals radius",
   "size of the atom",
   "atomic size"
  ],
  "afinidadeEletronicaKJmol": [
   "electron affinity"
  ],
  "energiaIonizacaoKJmol": [
   "ionization energy",
   "ionisation energy",
   "ionization potential",
   "first ionization energy"
  ],
  "pontoFusaoK": [
   "melting point",
   "melting temperature",
   "fusion point",
   "melts",
   "melt"
  ],
  "pontoEbulicaoK": [
   "boiling point",
   "boiling temperature",
   "boils",
   "boil"
  ],
  "densidadeKgm3": [
   "density",
   "specific mass"
  ],
  "estadoPadrao": [
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
  ],
  "estadosOxidacao": [
   "oxidation states",
   "oxidation numbers",
   "oxidation state",
   "oxidation number",
   "valence",
   "valency"
  ],
  "descoberta": [
   "discovery",
   "discovered",
   "discoverer",
   "who discovered",
   "year of discovery",
   "when was it discovered",
   "was discovered",
   "were discovered"
  ],
  "massaMolar": [
   "molar mass",
   "molecular mass",
   "molecular weight",
   "molar weight",
   "formula mass",
   "formula weight"
  ],
  "massaExata": [
   "exact mass",
   "monoisotopic mass"
  ],
  "formula": [
   "formula",
   "molecular formula",
   "chemical formula"
  ],
  "cas": [
   "cas number",
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
   "systematic name",
   "iupac"
  ],
  "xlogp": [
   "xlogp",
   "logp",
   "lipophilicity",
   "partition coefficient"
  ],
  "doadoresH": [
   "hydrogen bond donors",
   "h bond donors",
   "hydrogen donors"
  ],
  "aceptoresH": [
   "hydrogen bond acceptors",
   "h bond acceptors",
   "hydrogen acceptors"
  ],
  "ligacoesRotaveis": [
   "rotatable bonds"
  ],
  "carga": [
   "electric charge",
   "formal charge",
   "charge"
  ],
  "tpsa": [
   "tpsa",
   "polar surface area"
  ],
  "solubilidade": [
   "solubility",
   "water solubility",
   "solubility in water",
   "soluble in water",
   "insoluble in water",
   "soluble",
   "insoluble",
   "how much dissolves",
   "how much will dissolve",
   "does it dissolve",
   "dissolves in water",
   "dissolve in water"
  ],
  "pka": [
   "pka",
   "acid dissociation constant",
   "acidity constant",
   "acid ionization constant",
   "acid ionisation constant",
   "acid constant",
   "ka of"
  ],
  "entalpiaFormacaoKJmol": [
   "standard enthalpy of formation",
   "enthalpy of formation",
   "heat of formation"
  ]
 },
 "rotulosPropriedadeNormalizados": true,
 "stopwordsBusca": [
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
 ],
 "stopPalavras": [
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
 ],
 "palavrasFuncionais": [
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
 ],
 "simbolosAmbiguos": [
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
  "HI",
  "NO",
  "US",
  "WHO",
  "FAQ",
  "SAL"
 ],
 "seguranca": {
  "acao": [
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
  ],
  "contextoSeguro": [
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
  ],
  "tirarFazerSeguro": "\\b(?:what to do (?:with|about|if|when|in case|after)|what (?:should|can|do|must|would) (?:i|we|you|one|someone) do (?:if|when|in case|after|with|upon|about)|do (?:the |a )?(?:disposal|cleanup|clean up|neutrali[sz]ation|storage|transport|handling|dilution|first aid))\\b",
  "alvoExplosivos": [
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
  ],
  "fazerBomba": "\\b(?:make|making|made|build\\w*|assembl\\w+|construct\\w*|creat\\w+|produc\\w+|prepar\\w+|fazer|montar|construir)\\s+(?:an?\\s+|the\\s+|some\\s+|uma?\\s+)?(?:bomb|bomba)s?\\b(?!\\s+(?:calorimeter|calorimetry|threat|shelter|of (?:water|heat|vacuum|insulin|fuel|air)|pump|for (?:the |a )?(?:bath|tub|party)))",
  "alvoArmas": [
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
  ],
  "alvoDrogas": [
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
  ],
  "precursoresAcao": "\\b(?:extract\\w*|obtain\\w*|buy\\w*|purchas\\w+|get|acquir\\w+|divert\\w*|without (?:a )?(?:prescription|licen[cs]e|authori[sz]ation|permit)|circumvent\\w*|bypass\\w*|sell\\w*|traffick?\\w*|hide|conceal\\w*|synthesis|synthesi[sz]\\w*)\\b",
  "alvoDano": [
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
  ],
  "alvoAutolesao": [
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
  ],
  "perigososCaseiros": [
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
  ],
  "casa": [
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
  ],
  "coladaAlvos": {
   "EXPLOSIVOS": [
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
   ],
   "ARMAS_QUIMICAS": [
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
   ],
   "DROGAS": [
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
   ],
   "PRECURSORES": [
    "pseudoephedrine",
    "ephedrine",
    "safrole",
    "phenylacetone",
    "aceticanhydride",
    "precursors",
    "pseudoefedrina"
   ]
  },
  "coladaAcoes": [
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
  ]
 }
};
