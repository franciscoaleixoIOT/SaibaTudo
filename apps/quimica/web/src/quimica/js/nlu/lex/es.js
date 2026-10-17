// gerado — não editar. Fonte: contracts/lexico/es.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "es",
 "versao": 1,
 "descricao": "Léxico en español del intérprete local (NLU por reglas) y de las reglas de seguridad. Misma estructura que pt-BR.json (verificada por test). Regexes como TEXTO, sin flags: el cliente pasa la pregunta a minúsculas y sin acentos (solo [a-z0-9+-] y espacios) antes de comparar. Traducción inicial por agente (revisión humana pendiente).",
 "intencoes": {
  "saudacao": "^(hola+|buenas|buenos dias|buenas tardes|buenas noches|que tal|hey|hello|hi|gracias|muchas gracias|ayuda|help|socorro|menu|inicio|empezar|comenzar|prueba|probando)( que tal| todo bien| como estas| asistente| ia| amigo| a todos)*$",
  "ajuda": "\\b(?:que (?:haces|sabes|respondes|puedes hacer)|que (?:hace|sabe|responde|puede) (?:la app|la aplicacion|esta app|esta aplicacion|la ia)|como (?:usar|uso|funciona) (?:la |esta )?(?:app|aplicacion|asistente)|que (?:puedo|se puede) preguntar|necesito ayuda|quien (?:hizo|creo|desarrollo) (?:la |esta )?(?:app|aplicacion))\\b",
  "sobreDados": "\\b(?:sobre los datos|de donde (?:vienen|salen) los datos|origen de los datos|fuente de los datos|actualizacion de los datos|datos (?:estan )?actualizados|version de los datos|cuando se actualizo|firma de los datos)\\b",
  "fontes": "\\b(?:cuales son las (?:fuentes|licencias)|que (?:fuentes|licencias)|licencias? (?:tienen|usan|tiene|usa) los datos|con que licencias?|licencias? de los datos|cual es la fuente|fuentes? (?:de (?:la )?)?(?:informacion|respuestas?)|de donde (?:sacaste|viene|sale) (?:esa|esta|la) (?:informacion|respuesta)|referencias?)\\b",
  "balancear": "\\bbalance\\w*|\\bajust\\w+ (?:la |una )?ecuacion\\b|\\bigual\\w+ (?:la |una )?ecuacion\\b|\\bajust\\w+ (?:los )?coeficientes\\b|\\bequilibr\\w+ (?:la |una )?ecuacion\\b",
  "conversao": "\\b(?:convert\\w+|convierte|transform\\w+|pasar|pasa|equival\\w+|cuantos? \\S+(?: \\S+)? (?:tiene|hay|son|equivalen|existen|corresponden|caben)|cuantas? \\S+(?: \\S+)? (?:tiene|hay|son|equivalen|existen|corresponden|caben)|en cuantos?)\\b",
  "ph": "\\b(?:ph|poh)\\b|(?<!constante de )\\bacidez de\\b|\\bbasicidad\\b|\\balcalinidad\\b",
  "gas": "\\b(?:gas(?:es)? ideal(?:es)?|gas perfecto|pv ?= ?nrt|pvnrt|ley de los gases|ecuacion (?:de clapeyron|de los gases|general de los gases|de estado)|clapeyron|volumen (?:molar|de un gas|del gas)|presion (?:de un gas|del gas)|ley de boyle|ley de charles|gay lussac|(?:volumen|presion|temperatura) de .{0,24}\\bgas(?:es)?)\\b",
  "gasVariavel": "\\bgas(?:es)?\\b",
  "concentracao": "\\b(?:molaridad|concentracion|concentrad[ao]|diluci\\w*|diluir|diluye|diluido|c1 ?v1|c1v1|fraccion (?:en masa|masica)|porcentaje (?:en )?masa|tanto por ciento en masa|partes por millon|ppm|normalidad|molalidad|solucion de|disolucion de|gramos por litro|mol l|mol por litro|moles por litro|g l)\\b",
  "estequiometria": "\\b(?:estequiometri\\w*|reactivo (?:limitante|en exceso)|limitante|exceso de reactivo|rendimiento|cuantos? (?:moles?|mols?|gramos?|moleculas?|atomos?|litros?|iones?|particulas?|kilos?|mg|miligramos?)\\b|cuantas? (?:moleculas|particulas|gramos|moles|litros)|numero de (?:moles?|moleculas|atomos|particulas|iones)|condiciones normales|cn|tpn|volumen ocupado|constante de avogadro|numero de avogadro)\\b",
  "massaMolar": "\\b(?:masa molar|masa molecular|masa formula|peso molecular|peso molar|cuanto pesa (?:un )?mol|cuanto vale (?:la )?masa molar)\\b|\\bg mol\\b",
  "desenhar": "\\b(?:dibuj\\w+|estructura (?:2d|molecular|quimica|plana|de lewis|del|de la|de)|estructura|muestr\\w+ (?:la )?(?:estructura|molecula)|molecula (?:del|de la|de)|como es (?:la )?(?:molecula|estructura)|formula estructural|geometria molecular|visualizar|esqueleto)\\b",
  "comparar": "\\b(?:compar\\w+|diferencias? entre|\\bversus\\b|\\bvs\\b|cual es la diferencia|semejanza\\w*|similitud\\w*|igual a|parecid\\w+|cual (?:es |tiene |pesa |pesan |tienen )?(?:mas|menos|mayor|menor)\\b|orden (?:creciente|decreciente|ascendente|descendente)|en orden|orden[ae]\\w*|de (?:menor|mayor) a (?:mayor|menor)|cual (?:de ellos |de los dos |de las dos )?(?:es |tiene |posee )?(?:el |la )(?:mayor|menor|mas|menos)|que (?:es|tiene|pesa) (?:el |la )?(?:mas|menos|mayor|menor))\\b",
  "seguranca": "\\b(?:peligr\\w+|toxic\\w+|segur\\w+|epp|epis?\\b|equipos? de proteccion|primeros auxilios|derram\\w+|fuga\\w*|almacen\\w+|incendi\\w+|inflamab\\w+|corrosiv\\w+|irritant\\w+|irrita\\w*|ghs|sga|pictogramas?|frases? h\\b|indicaciones? de peligro|ficha de (?:datos de )?seguridad|fds|icsc|mezcl\\w+|incompatib\\w+|desech\\w+|eliminaci\\w+|manipul\\w+|inhal\\w+|ingest\\w+|quemadur\\w+|venenos\\w+|veneno|hace dano|hacen dano|neutraliz\\w+|guantes|gafas de proteccion|palabra de advertencia|clasificacion de peligro|es seguro|es peligroso|cancerigen\\w+|explosiv\\w+|reacciona con agua|reactiv\\w+ con)\\b",
  "nomenclatura": "\\b(?:cual es (?:el )?nombre|como se llama|nombre (?:quimico|iupac|sistematico|cientifico|oficial)|nomenclatura|como se escribe|cual es (?:la )?formula(?: quimica| molecular)?|formula (?:del|de la|de|quimica del|quimica de la|molecular del|molecular de la)|nombre del compuesto)\\b",
  "tabela": "\\b(?:tabla periodica|periodicidad|tendencia\\w*|grupo \\d{1,2}|familia \\d{1,2}|periodo \\d|bloque [spdf]|elementos? (?:del|de la|de los|de las) (?:grupo|periodo|bloque|familia)|cuales (?:son )?(?:los )?elementos|cuantos elementos|elementos (?:gaseosos|liquidos|solidos)|metales|no metales|semimetales|metaloides|halogenos?|gases? nobles?|alcalinoterreos?|alcalino terreos?|alcalinos?|lantanidos?|actinidos?|elemento mas|elementos mas|orden creciente|orden decreciente|mayor (?:radio|electronegatividad|energia|punto|masa|densidad)|menor (?:radio|electronegatividad|energia|punto|masa|densidad))\\b",
  "conceitoCue": "^(?:que (?:es|son|significa|quiere decir|seria)|explic\\w*|defin\\w+|concepto de|definicion de|explicame|como funciona\\w*|por que|porque|para que sirve|cual es (?:la )?(?:definicion|diferencia|importancia|funcion)|diferencia entre|ensen\\w+|resum\\w+)\\b",
  "conceitoTemas": "\\b(?:mol|ph|estequiometria|enlace (?:ionico|covalente|metalico|quimico)|electronegatividad|oxidacion|reduccion|oxidorreduccion|redox|equilibrio quimico|entalpia|entropia|isomeria|acido|base|sal|oxido|solucion|disolucion|concentracion|molaridad|dilucion|tabla periodica|reaccion quimica|cinetica|catalizador|electrolisis|pila|polaridad|fuerzas? intermoleculares?)\\b"
 },
 "pistas": {
  "querCalcular": "\\b(?:limitante|rendimiento|cuantos?|cuantas?|masa de|gramos?|moles?|mols?|produc\\w*|form\\w*|obt\\w+|reaccion\\w*|consum\\w+|sobra\\w*|exceso|volumen|litros?)\\b",
  "conversaoPreposicoes": "(?:->|→| en | a | hacia | to )",
  "paraUnidade": "\\b(?:a|en|hacia|hasta)\\s+(?:el |la |los |las )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| por litro| de mercurio)?)\\s*[?!.]*$",
  "quantosUnidade": "^\\s*[¿¡]?\\s*(?:cu[aá]ntos?|cu[aá]ntas?)\\s+((?:grados\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:tiene|tienen|hay|son|equivalen|existen|corresponden|vale|valen|caben)(?![A-Za-zÀ-ÿ])",
  "phContexto": "\\b(?:acido|base|solucion|disolucion)\\b",
  "conector": "\\bde\\b",
  "prefixoExplicacao": "^(?:que es|que son|explic|defin|concepto|como funciona|por que|porque)",
  "prefixoExplicacaoPalavra": "^(?:que es|que son|explic\\w*|defin\\w*|concepto|como funciona|por que|porque)\\b",
  "prefixoDefinicao": "^(?:que es|que son|explic\\w*|defin\\w*|concepto)\\b",
  "gasGrandezas": "\\b(?:volumen|presion|temperatura|moles?|mols?|cuantos)\\b",
  "concentracaoForte": "\\bdilu\\w*|molaridad|concentracion\\b",
  "propriedadesPalavra": "\\bpropiedades\\b",
  "mistura": "\\b(?:mezcl\\w+|junto con|juntos|combinar|mezclado|mezclada|incompatib\\w+)\\b",
  "elementoPalavra": "\\belementos?\\b",
  "gasSubstancia": "\\bgas\\b",
  "tendencia": "\\btendencia\\w*|\\bperiodicidad|\\bvari\\w* (?:a lo largo|en el periodo|en el grupo)|\\ba lo largo (?:del|de un) (?:periodo|grupo)",
  "tabelaPalavra": "\\btabla periodica\\b",
  "grupo": "\\b(?:grupo|familia)\\s+(\\d{1,2})\\b",
  "periodo": "\\bperiodo\\s+(\\d)\\b",
  "bloco": "\\bbloque\\s+([spdf])\\b",
  "continuacao": "^y (?:el |la |los |las )?(?:de |del |de la |de los |de las )?",
  "continuacaoNuvem": "^(?:y|que tal|ahora|ok|vale|bien|gracias|entonces|tambien|en|con|igual|lo mismo|hazlo|haz|dibuja|dibujalo|muestra|muestrame|dime mas)(?: |$)|(?:^| )(?:tambien|igualmente|su|sus|eso|esto)(?: |$)",
  "limparConceito": [
   "^(?:es |son |significa |quiere decir |seria )",
   "^(?:un |una |el |la |los |las |de |del )+"
  ],
  "constantes": "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|igual a|vale)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
  "quantidadeComplemento": "(?:de|por)",
  "letrasUnidade": "A-Za-zñáéíóú",
  "ligacaoPreposicoes": "(?:de|del)",
  "diluicao": "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
  "percentualMassa": "\\bmasa|porcent|por ciento|fraccion\\b",
  "cntp": "\\b(?:condiciones normales|cn|tpn|volumen)\\b",
  "cueElemento": "\\b(?:elemento|simbolo|simbolo quimico)\\b",
  "reacaoVerbo": "\\b(?:formad[oa]s?|se forman?|producid[oa]s?|producen?|obtenid[oa]s?|reacciona|reaccionan|reaccionar|consumid[oa]s?|consume|consumen|necesari[oa]s?|liberad[oa]s?|liberan?|a partir de|quema|combustion|descomposicion|descompone)\\b",
  "pedidoQuantidade": "\\b(?:cuanto pesan?|pesa|pesan|masa(?! (?:molar|molecular|atomica|exacta))|moles?|mols?|cantidad de sustancia|volumen)\\b",
  "ordemCrescente": "\\b(?:creciente|ascendente|de menor a mayor|del menor al mayor|cual (?:de ellos |de los dos |de las dos )?(?:es |tiene |posee )?(?:el |la )?(?:menor|menos)|que (?:es|tiene) (?:el |la )?(?:menor|menos))\\b",
  "ordemDecrescente": "\\b(?:decreciente|descendente|de mayor a menor|del mayor al menor|cual (?:de ellos |de los dos |de las dos )?(?:es |tiene |posee )?(?:el |la )?(?:mayor|mas)|que (?:es|tiene) (?:el |la )?(?:mayor|mas))\\b",
  "conectivoLista": "^(?:y|e|o|u)$",
  "paraUnidades": "\\b(?:a|en|hacia|hasta)\\s+(?:el |la |los |las )?",
  "paraUnidadesFim": "\\s*[?!.]*$",
  "misturaTema": "\\b(mezcla)s?\\b",
  "misturaConceito": "\\b(?:sustancias?|pura|puras|puro|puros|homogene\\w*|heterogene\\w*|sistemas?|clasifi\\w*|tipos? de|que (?:es|son)|diferencia entre|fases?)\\b",
  "nomenclaturaPedido": "\\b(?:como se llama|como se nombra|como nombrar|nombra|nombrar|nombre (?:este|esta|estos|estas|el siguiente)|da el nombre|de el nombre|cual es el nombre|nombre (?:oficial|iupac|usual|sistematico|correcto))\\b",
  "nomenclaturaAlvo": "\\b(?:compuestos?|sustancias?|moleculas?|hidrocarburos?|organic[oa]s?|cadenas?|estructuras?|\\w*(?:met|et|prop|but|pent|hex|hept|oct|non|dec|fen|benc)\\w*(?:ano|eno|ino|ol|ona|oico|il|amina))\\b"
 },
 "nivel": {
  "fundamental": "\\b(?:primaria|escuela primaria|secundaria basica|nino|ninos|simple|muy simple|facil de entender|para principiantes)\\b",
  "medio": "\\b(?:bachillerato|secundaria|preparatoria|liceo|selectividad)\\b",
  "superior": "\\b(?:universidad|facultad|superior|avanzado|grado|a fondo|detallad\\w+)\\b"
 },
 "unidades": [
  [
   "^grados? (?:celsius|centigrados?)$|^celsius$",
   "°C"
  ],
  [
   "^grados? fahrenheit$|^fahrenheit$",
   "°F"
  ],
  [
   "^kelvins?$|^kelvines$",
   "K"
  ],
  [
   "^atmosferas?$",
   "atm"
  ],
  [
   "^pascales$|^pascal$",
   "Pa"
  ],
  [
   "^kilopascales$|^kilopascal$",
   "kPa"
  ],
  [
   "^milimetros? de mercurio$",
   "mmHg"
  ],
  [
   "^litros?$",
   "L"
  ],
  [
   "^mililitros?$",
   "mL"
  ],
  [
   "^microlitros?$",
   "µL"
  ],
  [
   "^gramos?$",
   "g"
  ],
  [
   "^miligramos?$",
   "mg"
  ],
  [
   "^kilogramos?$|^kilos?$",
   "kg"
  ],
  [
   "^toneladas?$",
   "t"
  ],
  [
   "^moles?$|^mols?$",
   "mol"
  ],
  [
   "^milimoles?$",
   "mmol"
  ],
  [
   "^kilomoles?$",
   "kmol"
  ],
  [
   "^julios?$|^joules?$",
   "J"
  ],
  [
   "^calorias?$",
   "cal"
  ],
  [
   "^kilocalorias?$",
   "kcal"
  ],
  [
   "^kilojulios?$|^kilojoules?$",
   "kJ"
  ],
  [
   "^molar(?:es)?$",
   "mol/L"
  ],
  [
   "^mol por litro$|^moles por litro$",
   "mol/L"
  ],
  [
   "^gramos? por litro$",
   "g/L"
  ],
  [
   "^(?:moleculas?|atomos?|particulas?|iones?|unidades|entidades)$",
   "particulas"
  ],
  [
   "^metros?$",
   "m"
  ],
  [
   "^centimetros?$",
   "cm"
  ],
  [
   "^milimetros?$",
   "mm"
  ],
  [
   "^nanometros?$",
   "nm"
  ],
  [
   "^kilometros?$",
   "km"
  ],
  [
   "^por ?ciento$",
   "%"
  ],
  [
   "^bar(?:es)?$",
   "bar"
  ],
  [
   "^torrs?$",
   "Torr"
  ],
  [
   "^horas?$",
   "h"
  ],
  [
   "^minutos?$",
   "min"
  ],
  [
   "^segundos?$",
   "s"
  ],
  [
   "^metros? cubicos?$",
   "m3"
  ],
  [
   "^decimetros? cubicos?$",
   "dm3"
  ],
  [
   "^centimetros? cubicos?$",
   "cm3"
  ]
 ],
 "numerais": [
  [
   "medio|media",
   0.5
  ],
  [
   "un|una|uno",
   1
  ],
  [
   "dos",
   2
  ],
  [
   "tres",
   3
  ],
  [
   "cuatro",
   4
  ],
  [
   "cinco",
   5
  ],
  [
   "seis",
   6
  ],
  [
   "siete",
   7
  ],
  [
   "ocho",
   8
  ],
  [
   "nueve",
   9
  ],
  [
   "diez",
   10
  ]
 ],
 "categorias": [
  [
   "\\balcalino ?terre\\w*|\\balcalinos ?terre\\w*",
   "metal_alcalino_terroso"
  ],
  [
   "\\bmetal(?:es)? alcalinos?|\\balcalinos\\b",
   "metal_alcalino"
  ],
  [
   "\\bmetal(?:es)? de transicion|\\belementos? de transicion",
   "metal_transicao"
  ],
  [
   "\\bpos ?transicion|\\bmetal(?:es)? representativos?",
   "metal_pos_transicao"
  ],
  [
   "\\bsemimetal(?:es)?|\\bmetaloides?",
   "semimetal"
  ],
  [
   "\\bno metal(?:es)?",
   "nao_metal"
  ],
  [
   "\\bhalogenos?",
   "halogenio"
  ],
  [
   "\\bgas(?:es)? nobles?|\\bnobles\\b",
   "gas_nobre"
  ],
  [
   "\\blantanidos?|\\btierras raras",
   "lantanideo"
  ],
  [
   "\\bactinidos?|\\bactinoides?",
   "actinideo"
  ],
  [
   "\\bmetales\\b|\\bmetal\\b",
   "metal"
  ]
 ],
 "estados": [
  [
   "\\b(?:gaseosos?|gases|en estado gaseoso)\\b",
   "gas"
  ],
  [
   "\\bliquidos?\\b",
   "liquido"
  ],
  [
   "\\bsolidos?\\b",
   "solido"
  ]
 ],
 "extremos": [
  [
   "\\bmas electronegativ\\w+|\\bmayor electronegatividad",
   "eletronegatividade",
   "max"
  ],
  [
   "\\bmenos electronegativ\\w+|\\bmenor electronegatividad",
   "eletronegatividade",
   "min"
  ],
  [
   "\\bmas densos?\\b|\\bmayor densidad",
   "densidadeKgm3",
   "max"
  ],
  [
   "\\bmenos densos?\\b|\\bmenor densidad|\\bmas liviano|\\bmas ligero",
   "densidadeKgm3",
   "min"
  ],
  [
   "\\bmayor radio|\\bmas voluminos\\w+",
   "raioAtomicoPm",
   "max"
  ],
  [
   "\\bmenor radio",
   "raioAtomicoPm",
   "min"
  ],
  [
   "\\bmayor punto de fusion",
   "pontoFusaoK",
   "max"
  ],
  [
   "\\bmenor punto de fusion",
   "pontoFusaoK",
   "min"
  ],
  [
   "\\bmayor punto de ebullicion",
   "pontoEbulicaoK",
   "max"
  ],
  [
   "\\bmenor punto de ebullicion",
   "pontoEbulicaoK",
   "min"
  ],
  [
   "\\bmayor energia de ionizacion",
   "energiaIonizacaoKJmol",
   "max"
  ],
  [
   "\\bmenor energia de ionizacion",
   "energiaIonizacaoKJmol",
   "min"
  ],
  [
   "\\bmas pesad\\w+|\\bmayor masa atomica",
   "massaAtomica",
   "max"
  ],
  [
   "\\bmenor masa atomica",
   "massaAtomica",
   "min"
  ]
 ],
 "propriedades": {
  "numeroAtomico": [
   "numero atomico",
   "z"
  ],
  "massaAtomica": [
   "masa atomica",
   "peso atomico",
   "masa del atomo"
  ],
  "simbolo": [
   "simbolo"
  ],
  "grupo": [
   "grupo",
   "familia"
  ],
  "periodo": [
   "periodo"
  ],
  "bloco": [
   "bloque"
  ],
  "categoria": [
   "categoria",
   "clasificacion",
   "tipo de elemento",
   "clase del elemento"
  ],
  "configuracaoEletronica": [
   "configuracion electronica",
   "distribucion electronica"
  ],
  "eletronegatividade": [
   "electronegatividad"
  ],
  "raioAtomicoPm": [
   "radio atomico",
   "radio de van der waals",
   "tamano del atomo"
  ],
  "afinidadeEletronicaKJmol": [
   "afinidad electronica",
   "electroafinidad"
  ],
  "energiaIonizacaoKJmol": [
   "energia de ionizacion",
   "potencial de ionizacion",
   "primera energia de ionizacion"
  ],
  "pontoFusaoK": [
   "punto de fusion",
   "temperatura de fusion",
   "fusion",
   "se derrite",
   "se funde",
   "funde"
  ],
  "pontoEbulicaoK": [
   "punto de ebullicion",
   "temperatura de ebullicion",
   "ebullicion",
   "hierve"
  ],
  "densidadeKgm3": [
   "densidad",
   "masa especifica"
  ],
  "estadoPadrao": [
   "estado fisico",
   "estado estandar",
   "estado de la materia",
   "es solido",
   "es liquido",
   "es gaseoso",
   "es un gas"
  ],
  "estadosOxidacao": [
   "estados de oxidacion",
   "numeros de oxidacion",
   "estado de oxidacion",
   "numero de oxidacion",
   "valencia"
  ],
  "descoberta": [
   "descubrimiento",
   "descubrio",
   "descubridor",
   "quien descubrio",
   "ano de descubrimiento",
   "cuando se descubrio",
   "fue descubierto",
   "fue descubierta",
   "fueron descubiertos"
  ],
  "massaMolar": [
   "masa molar",
   "masa molecular",
   "peso molecular",
   "peso molar",
   "masa formula"
  ],
  "massaExata": [
   "masa exacta",
   "masa monoisotopica"
  ],
  "formula": [
   "formula",
   "formula molecular",
   "formula quimica"
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
   "nombre iupac",
   "nombre sistematico",
   "iupac"
  ],
  "xlogp": [
   "xlogp",
   "logp",
   "lipofilicidad",
   "coeficiente de reparto"
  ],
  "doadoresH": [
   "donadores de hidrogeno",
   "donantes de enlace de hidrogeno",
   "donadores de enlace de hidrogeno"
  ],
  "aceptoresH": [
   "aceptores de hidrogeno",
   "aceptores de enlace de hidrogeno"
  ],
  "ligacoesRotaveis": [
   "enlaces rotables",
   "enlaces rotatorios"
  ],
  "carga": [
   "carga electrica",
   "carga formal"
  ],
  "tpsa": [
   "tpsa",
   "area de superficie polar"
  ],
  "solubilidade": [
   "solubilidad",
   "solubilidad en agua",
   "coeficiente de solubilidad",
   "soluble en agua",
   "insoluble en agua",
   "soluble",
   "insoluble",
   "cuanto se disuelve",
   "cuanto disuelve",
   "se disuelve",
   "se disuelve en agua",
   "disuelve en agua"
  ],
  "pka": [
   "pka",
   "constante de acidez",
   "constante de ionizacion acida",
   "constante de disociacion acida",
   "constante de ionizacion del acido",
   "constante de disociacion del acido",
   "ka de",
   "ka del"
  ]
 },
 "rotulosPropriedadeNormalizados": true,
 "stopwordsBusca": [
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
 ],
 "stopPalavras": [
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
 ],
 "palavrasFuncionais": [
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
  "Tu"
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
  "SAL"
 ],
 "seguranca": {
  "acao": [
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
  ],
  "contextoSeguro": [
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
  ],
  "tirarFazerSeguro": "\\b(?:que (?:yo |se )?(?:debo |puedo |necesito |debe |tengo que )?hac(?:er|go|e) (?:si|cuando|en caso|tras|despues|con|al|ante)|hac(?:er|go|e) (?:el |la |un |una )?(?:desecho|eliminacion|limpieza|neutralizacion|almacenamiento|transporte|manejo|manipulacion|dilucion|primeros auxilios)|hac(?:er|go|e) para (?:dejar|parar|superar|salir|abandonar|evitar|reducir|controlar)|(?:que dicen? (?:la |las )?(?:ley|leyes|legislacion|normativa)|(?:ley|leyes|legislacion|normativa)(?: vigente)?) (?:sobre|de|acerca de|respecto a) (?:la |el |los |las )?(?:produccion|fabricacion|elaboracion|venta|trafico|consumo|posesion|tenencia)|elabor\\w* (?:un |una |el |la |mi )?(?:informe|trabajo|resumen|ensayo|presentacion|tesis|monografia|cartel|poster|esquema|mapa))\\b",
  "alvoExplosivos": [
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
  ],
  "fazerBomba": "\\b(?:hac(?:er|iendo|e)|hag[oa]n?|haz|fabric\\w*|mont(?:ar|o|a|e|ando)|arm(?:ar|o|a|e|ando)|constru\\w+|cre(?:ar|o|a|e|ando)|elabor\\w*|produc(?:ir|o|e|a|iendo)|prepar\\w*|make|build|fazer)\\s+(?:una?\\s+|an?\\s+|la\\s+|las\\s+)?(?:bomba|bomb)s?\\b(?!\\s+(?:de\\s+)?(?:agua|calor|vacio|insulina|combustible|aire|infusion|hidraulica|calorimetrica|centrifuga|sumergible|peristaltica|de))",
  "alvoArmas": [
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
  ],
  "alvoDrogas": [
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
  ],
  "precursoresNomes": [
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
  ],
  "precursoresAcao": "\\b(?:extraer|extracci\\w*|obtener|comprar|conseguir|desvi\\w+|sin (?:receta|licencia|autorizacion|permiso)|burl\\w+|evadir|vender|trafic\\w*|esconder|escond\\w+|ocultar|sintesis|sintetiz\\w*)\\b",
  "alvoDano": [
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
  ],
  "alvoAutolesao": [
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
  ],
  "perigososCaseiros": [
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
  ],
  "casa": [
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
  ],
  "coladaAlvos": {
   "EXPLOSIVOS": [
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
   ],
   "ARMAS_QUIMICAS": [
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
   ],
   "DROGAS": [
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
   ],
   "PRECURSORES": [
    "pseudoefedrina",
    "efedrina",
    "safrol",
    "fenilacetona",
    "anhidridoacetico",
    "precursores"
   ]
  },
  "coladaAcoes": [
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
  ]
 }
};
