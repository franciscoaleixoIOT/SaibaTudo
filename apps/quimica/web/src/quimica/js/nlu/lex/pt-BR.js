// gerado — não editar. Fonte: contracts/lexico/pt-BR.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "pt-BR",
 "versao": 1,
 "descricao": "Léxico do interpretador local (NLU por regras) e das regras de segurança, compartilhado entre o site (js/nlu/lex/<idioma>.js, gerado por tools/gerar_lexico.py) e o Android (Kotlin, etapa E). Regexes como TEXTO, sem flags: o cliente normaliza a pergunta (minúsculas, sem acentos, só [a-z0-9+-] e espaços) antes de casar. Só sintaxe comum a JS e java.util.regex (sem lookbehind variável, sem \\p{...}). Listas de palavras já normalizadas.",
 "intencoes": {
  "saudacao": "^(oi+|ola|opa|bom dia|boa tarde|boa noite|e ai|eai|hey|hello|hi|obrigad[oa]|muito obrigad[oa]|valeu|vlw|brigad[oa]|ajuda|help|socorro|menu|inicio|comecar|teste|testando)( tudo bem| td bem| tudo bom| como vai| assistente| ia| amigo| pessoal)*$",
  "ajuda": "\\b(?:o que (?:voce|vc|o app|o aplicativo|esse app|este app|a ia) (?:faz|sabe|responde|pode)|como (?:usar|uso|funciona) (?:o |este |esse )?(?:app|aplicativo|assistente)|o que (?:posso|eu posso|da para|da pra) perguntar|preciso de ajuda|quem (?:fez|criou|desenvolveu) (?:o |este |esse )?(?:app|aplicativo))\\b",
  "sobreDados": "\\b(?:sobre os dados|de onde (?:vem|vêm|veem) os dados|origem dos dados|fonte dos dados|atualizacao dos dados|dados (?:sao )?atualizados|versao dos dados|quando foi atualizado|assinatura dos dados)\\b",
  "fontes": "\\b(?:quais (?:sao )?as (?:fontes|licencas)|licencas? dos dados|qual (?:e )?a fonte|fontes? (?:das? )?(?:informac\\w+|respostas?)|de onde (?:tirou|vem) (?:essa|esta|a) (?:informacao|resposta)|referencias?)\\b",
  "balancear": "\\bbalanc\\w*|\\bequilibr\\w+ (?:a |uma )?equacao\\b|\\bacert\\w+ (?:os )?coeficientes\\b",
  "conversao": "\\b(?:convert\\w+|converta|transform\\w+|passar|passe|equivale\\w*|quantos? \\S+(?: \\S+)? (?:tem|ha|sao|equivalem|existem|correspondem)|quantas? \\S+(?: \\S+)? (?:tem|ha|sao|equivalem|existem|correspondem)|em quantos?)\\b",
  "ph": "\\b(?:ph|poh)\\b|\\bacidez de\\b|\\bbasicidade\\b",
  "gas": "\\b(?:gas(?:es)? ideais?|gas ideal|pv ?= ?nrt|pvnrt|lei dos gases|equacao (?:de clapeyron|dos gases|geral dos gases)|clapeyron|volume (?:molar|de um gas|de gas)|pressao (?:de um gas|do gas)|lei de boyle|lei de charles|gay lussac)\\b",
  "gasVariavel": "\\bgas(?:es)?\\b",
  "concentracao": "\\b(?:molaridade|concentracao|concentrad[ao]|diluic\\w*|diluir|dilua|diluido|c1 ?v1|c1v1|titulo (?:em massa|da solucao)|percentual (?:em )?massa|porcentagem em massa|partes por milhao|ppm|normalidade|molalidade|solucao de|gramas por litro|mol l|mol por litro|g l)\\b",
  "estequiometria": "\\b(?:estequiometri\\w*|reagente (?:limitante|em excesso)|limitante|excesso de reagente|rendimento|quantos? (?:mols?|gramas?|moleculas?|atomos?|litros?|ions?|particulas?|quilos?|mg|miligramas?)\\b|quantas? (?:moleculas|particulas|atomos|gramas|mols|litros)|numero de (?:mols?|moleculas|atomos|particulas|ions)|cntp|condicoes normais|volume ocupado|constante de avogadro|numero de avogadro)\\b",
  "massaMolar": "\\b(?:massa molar|massa molecular|massa formula|peso molecular|peso molar|quanto pesa (?:um )?mol|quanto vale (?:a )?massa molar)\\b|\\bg mol\\b",
  "desenhar": "\\b(?:desenh\\w+|estrutura (?:2d|molecular|quimica|plana|de lewis|do|da|de)|estrutura|mostr\\w+ (?:a )?(?:estrutura|molecula)|molecula (?:do|da|de)|como (?:e|eh) (?:a )?(?:molecula|estrutura)|formula estrutural|geometria molecular|visualizar|esqueleto)\\b",
  "comparar": "\\b(?:compar\\w+|diferenca (?:s )?entre|diferencas? entre|\\bversus\\b|\\bvs\\b|qual (?:a )?diferenca|semelhanca\\w*|igual a|parecid\\w+)\\b",
  "seguranca": "\\b(?:perig\\w+|toxic\\w+|segur\\w+|epis?\\b|equipamentos? de protecao|primeiros? socorros|derram\\w+|vazament\\w+|armazen\\w+|incendi\\w+|inflamav\\w+|corrosiv\\w+|irritant\\w+|irrita\\w*|ghs|pictogramas?|frases? h\\b|ficha de seguranca|icsc|fispq|mistur\\w+|incompativ\\w+|descart\\w+|manusear|manuseio|inala\\w+|ingest\\w+|queimadur\\w+|venenos\\w+|veneno|faz mal|fazem mal|neutraliz\\w+|luvas|oculos de protecao|palavra de sinal|classificacao de perigo|e seguro|e perigoso|cancerigen\\w+|explosiv\\w+|reage com agua|reativ\\w+ com)\\b",
  "nomenclatura": "\\b(?:qual (?:e )?(?:o )?nome|como (?:se )?chama|nome (?:quimico|iupac|sistematico|cientifico|oficial)|nomenclatura|como (?:se )?escreve|qual (?:e )?a? ?formula(?: quimica| molecular)?|formula (?:do|da|de|quimica do|quimica da|molecular do|molecular da)|nome do composto)\\b",
  "tabela": "\\b(?:tabela periodica|periodicidade|tendencia\\w*|grupo \\d{1,2}|familia \\d{1,2}|periodo \\d|bloco [spdf]|elementos? (?:do|da|dos|das) (?:grupo|periodo|bloco|familia)|quais (?:sao )?(?:os )?elementos|quantos elementos|elementos (?:gasosos|liquidos|solidos)|metais|nao metais|ametais|semimetais|metaloides|halogenios?|gases? nobres?|alcalino terrosos?|alcalinos?|lantanideos?|lantanidios?|actinideos?|actinidios?|elemento mais|elementos mais|ordem crescente|ordem decrescente|maior (?:raio|eletronegatividade|energia|ponto|massa|densidade)|menor (?:raio|eletronegatividade|energia|ponto|massa|densidade))\\b",
  "conceitoCue": "^(?:o que (?:e|eh|sao|significa|quer dizer|seria)|oque e|expli(?:c|qu)\\w*|defin\\w+|conceito de|definicao de|me explica\\w*|como funciona\\w*|por que|por qu[eê]|porque|para que serve|qual (?:e )?a? ?(?:definicao|diferenca|importancia|funcao)|diferenca entre|ensin\\w+|resum\\w+)\\b",
  "conceitoTemas": "\\b(?:mol|ph|estequiometria|ligacao (?:ionica|covalente|metalica|quimica)|eletronegatividade|oxidacao|reducao|oxirreducao|redox|equilibrio quimico|entalpia|entropia|isomeria|acido|base|sal|oxido|solucao|concentracao|molaridade|diluicao|tabela periodica|reacao quimica|cinetica|catalisador|eletrolise|pilha|polaridade|forca intermolecular|forcas intermoleculares)\\b"
 },
 "pistas": {
  "querCalcular": "\\b(?:limitante|rendimento|quantos?|quantas?|massa de|gramas?|mols?|produz\\w*|forma\\w*|obt\\w+|reage\\w*|consum\\w+|sobra\\w*|excesso|volume|litros?)\\b",
  "conversaoPreposicoes": "(?:->|→| em | para | pra | to )",
  "paraUnidade": "\\b(?:para|em|a|pra|ate)\\s+(?:o |a |os |as )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| por litro| de mercurio)?)\\s*[?!.]*$",
  "quantosUnidade": "^\\s*(?:quantos?|quantas?)\\s+((?:graus\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:tem|t[eê]m|h[aá]|s[aã]o|equivalem|existem|correspondem|vale|valem)(?![A-Za-zÀ-ÿ])",
  "phContexto": "\\b(?:acido|base|solucao)\\b",
  "conector": "\\bde\\b",
  "prefixoExplicacao": "^(?:o que|oque|expli\\w*|defin\\w*|conceito|como funciona|por que)",
  "prefixoExplicacaoPalavra": "^(?:o que|oque|expli\\w*|defin\\w*|conceito|como funciona|por que)\\b",
  "prefixoDefinicao": "^(?:o que|oque|expli\\w*|defin\\w*|conceito)\\b",
  "gasGrandezas": "\\b(?:volume|pressao|temperatura|mols?|quantos)\\b",
  "concentracaoForte": "\\bdilu\\w*|molaridade|concentracao\\b",
  "propriedadesPalavra": "\\bpropriedades\\b",
  "mistura": "\\b(?:mistur\\w+|junto com|juntos|combinar|misturado|misturada|incompativ\\w+)\\b",
  "elementoPalavra": "\\belementos?\\b",
  "gasSubstancia": "\\bgas\\b",
  "tendencia": "\\btendencia\\w*|\\bperiodicidade|\\bvaria\\w* (?:ao longo|no periodo|no grupo)|\\bao longo d[oa] (?:periodo|grupo)",
  "tabelaPalavra": "\\btabela periodica\\b",
  "grupo": "\\b(?:grupo|familia)\\s+(\\d{1,2})\\b",
  "periodo": "\\bperiodo\\s+(\\d)\\b",
  "bloco": "\\bbloco\\s+([spdf])\\b",
  "continuacao": "^e (?:o |a |os |as )?(?:de |do |da |dos |das )?",
  "limparConceito": [
   "^(?:e |eh |sao |significa |quer dizer |seria )",
   "^(?:um |uma |o |a |os |as |de |do |da )+"
  ],
  "constantes": "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|igual a|vale)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
  "quantidadeComplemento": "(?:de|por)",
  "letrasUnidade": "A-Za-zçãéêíóú",
  "ligacaoPreposicoes": "(?:de|do|da|dos|das)",
  "diluicao": "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
  "percentualMassa": "\\bmassa|percent|porcent|titulo\\b",
  "cntp": "\\b(?:cntp|condicoes normais|volume)\\b",
  "cueElemento": "\\b(?:elemento|simbolo|simbolo quimico)\\b"
 },
 "nivel": {
  "fundamental": "\\b(?:ensino fundamental|fundamental|crianca|simples|bem simples|facil de entender|para leigos)\\b",
  "medio": "\\b(?:ensino medio|medio|enem|vestibular)\\b",
  "superior": "\\b(?:faculdade|universidade|superior|avancado|graduacao|aprofundad\\w+|detalhad\\w+)\\b"
 },
 "unidades": [
  [
   "^graus? (?:celsius|centigrados?)$|^celsius$",
   "°C"
  ],
  [
   "^graus? fahrenheit$|^fahrenheit$",
   "°F"
  ],
  [
   "^kelvins?$",
   "K"
  ],
  [
   "^atmosferas?$",
   "atm"
  ],
  [
   "^pascais$|^pascal$",
   "Pa"
  ],
  [
   "^quilopascais$|^quilopascal$",
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
   "^gramas?$",
   "g"
  ],
  [
   "^miligramas?$",
   "mg"
  ],
  [
   "^quilogramas?$|^quilos?$",
   "kg"
  ],
  [
   "^toneladas?$",
   "t"
  ],
  [
   "^mols?$",
   "mol"
  ],
  [
   "^milimols?$",
   "mmol"
  ],
  [
   "^kilomols?$|^quilomols?$",
   "kmol"
  ],
  [
   "^joules?$",
   "J"
  ],
  [
   "^calorias?$",
   "cal"
  ],
  [
   "^quilocalorias?$",
   "kcal"
  ],
  [
   "^quilojoules?$",
   "kJ"
  ],
  [
   "^molar(?:es)?$",
   "mol/L"
  ],
  [
   "^mol por litro$|^mols por litro$",
   "mol/L"
  ],
  [
   "^gramas? por litro$",
   "g/L"
  ],
  [
   "^(?:moleculas?|atomos?|particulas?|ions?|unidades|entidades)$",
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
   "^quilometros?$",
   "km"
  ],
  [
   "^por ?cento$",
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
  ]
 ],
 "categorias": [
  [
   "\\balcalino terros\\w*|\\balcalinos terros\\w*",
   "metal_alcalino_terroso"
  ],
  [
   "\\bmetais? alcalinos?|\\balcalinos\\b",
   "metal_alcalino"
  ],
  [
   "\\bmetais? de transicao|\\bmetal de transicao|\\belementos? de transicao",
   "metal_transicao"
  ],
  [
   "\\bpos transicao|\\bmetais? representativos?",
   "metal_pos_transicao"
  ],
  [
   "\\bsemimetais?|\\bmetaloides?",
   "semimetal"
  ],
  [
   "\\bnao metais?|\\bametais?",
   "nao_metal"
  ],
  [
   "\\bhalogenios?",
   "halogenio"
  ],
  [
   "\\bgas(?:es)? nobres?|\\bnobres\\b",
   "gas_nobre"
  ],
  [
   "\\blantanideos?|\\blantanidios?|\\bterras raras",
   "lantanideo"
  ],
  [
   "\\bactinideos?|\\bactinidios?|\\bactinoides?|\\bactinios\\b",
   "actinideo"
  ],
  [
   "\\bmetais\\b|\\bmetal\\b",
   "metal"
  ]
 ],
 "estados": [
  [
   "\\b(?:gasosos?|gases|no estado gasoso)\\b",
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
   "\\bmais eletronegativ\\w+|\\bmaior eletronegatividade",
   "eletronegatividade",
   "max"
  ],
  [
   "\\bmenos eletronegativ\\w+|\\bmenor eletronegatividade",
   "eletronegatividade",
   "min"
  ],
  [
   "\\bmais densos?\\b|\\bmaior densidade",
   "densidadeKgm3",
   "max"
  ],
  [
   "\\bmenos densos?\\b|\\bmenor densidade|\\bmais leves?\\b",
   "densidadeKgm3",
   "min"
  ],
  [
   "\\bmaior raio|\\bmais volumos\\w+",
   "raioAtomicoPm",
   "max"
  ],
  [
   "\\bmenor raio",
   "raioAtomicoPm",
   "min"
  ],
  [
   "\\bmaior ponto de fusao",
   "pontoFusaoK",
   "max"
  ],
  [
   "\\bmenor ponto de fusao",
   "pontoFusaoK",
   "min"
  ],
  [
   "\\bmaior ponto de ebulicao",
   "pontoEbulicaoK",
   "max"
  ],
  [
   "\\bmenor ponto de ebulicao",
   "pontoEbulicaoK",
   "min"
  ],
  [
   "\\bmaior energia de ionizacao",
   "energiaIonizacaoKJmol",
   "max"
  ],
  [
   "\\bmenor energia de ionizacao",
   "energiaIonizacaoKJmol",
   "min"
  ],
  [
   "\\bmais pesad\\w+|\\bmaior massa atomica",
   "massaAtomica",
   "max"
  ],
  [
   "\\bmenor massa atomica",
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
   "massa atomica",
   "peso atomico",
   "massa do atomo"
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
   "bloco"
  ],
  "categoria": [
   "categoria",
   "classificacao",
   "tipo de elemento",
   "classe do elemento"
  ],
  "configuracaoEletronica": [
   "configuracao eletronica",
   "distribuicao eletronica"
  ],
  "eletronegatividade": [
   "eletronegatividade"
  ],
  "raioAtomicoPm": [
   "raio atomico",
   "raio de van der waals",
   "tamanho do atomo"
  ],
  "afinidadeEletronicaKJmol": [
   "afinidade eletronica",
   "eletroafinidade"
  ],
  "energiaIonizacaoKJmol": [
   "energia de ionizacao",
   "potencial de ionizacao",
   "primeira energia de ionizacao"
  ],
  "pontoFusaoK": [
   "ponto de fusao",
   "temperatura de fusao",
   "fusao",
   "derrete",
   "funde"
  ],
  "pontoEbulicaoK": [
   "ponto de ebulicao",
   "temperatura de ebulicao",
   "ebulicao",
   "ferve"
  ],
  "densidadeKgm3": [
   "densidade",
   "massa especifica"
  ],
  "estadoPadrao": [
   "estado fisico",
   "estado padrao",
   "estado da materia",
   "e solido",
   "e liquido",
   "e gasoso"
  ],
  "estadosOxidacao": [
   "estados de oxidacao",
   "numeros de oxidacao",
   "nox",
   "estado de oxidacao",
   "valencia"
  ],
  "descoberta": [
   "descoberta",
   "descobriu",
   "descobridor",
   "quem descobriu",
   "ano da descoberta",
   "quando foi descoberto",
   "foi descoberto",
   "foi descoberta",
   "foram descobertos"
  ],
  "massaMolar": [
   "massa molar",
   "massa molecular",
   "peso molecular",
   "peso molar",
   "massa formula"
  ],
  "massaExata": [
   "massa exata",
   "massa monoisotopica"
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
   "nome iupac",
   "nome sistematico",
   "iupac"
  ],
  "xlogp": [
   "xlogp",
   "logp",
   "lipofilicidade",
   "coeficiente de particao"
  ],
  "doadoresH": [
   "doadores de hidrogenio",
   "doadores de ligacao de hidrogenio"
  ],
  "aceptoresH": [
   "aceptores de hidrogenio",
   "aceptores de ligacao de hidrogenio"
  ],
  "ligacoesRotaveis": [
   "ligacoes rotaveis"
  ],
  "carga": [
   "carga eletrica",
   "carga formal"
  ],
  "tpsa": [
   "tpsa",
   "area de superficie polar"
  ]
 },
 "rotulosPropriedadeNormalizados": true,
 "stopwordsBusca": [
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "e",
  "que",
  "em",
  "no",
  "na",
  "para",
  "por",
  "com",
  "qual",
  "quais",
  "como",
  "se",
  "eh",
  "sao",
  "ser",
  "quer",
  "dizer",
  "significa",
  "explique",
  "explica",
  "defina",
  "conceito",
  "oque",
  "porque",
  "me",
  "funciona"
 ],
 "stopPalavras": [
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "em",
  "no",
  "na",
  "que",
  "para",
  "por",
  "com",
  "ao",
  "se"
 ],
 "palavrasFuncionais": [
  "sobre",
  "entre",
  "como",
  "onde",
  "quando",
  "qual",
  "quais",
  "mais",
  "menos",
  "muito",
  "pouco",
  "tudo",
  "nada",
  "tambem",
  "porque",
  "entao",
  "assim",
  "ainda",
  "depois",
  "antes",
  "agora",
  "sempre",
  "nunca",
  "seja",
  "foi",
  "ser",
  "sao",
  "esta",
  "estao",
  "tem",
  "ter",
  "fale",
  "fala",
  "diga",
  "mostre",
  "explique",
  "explica",
  "quimica",
  "favor",
  "gostaria",
  "queria",
  "poderia",
  "pode",
  "quero",
  "preciso",
  "fontes",
  "fonte",
  "dados",
  "ajuda",
  "licenca",
  "licencas",
  "informacao",
  "informacoes",
  "versao",
  "referencia",
  "referencias",
  "offline",
  "gratis",
  "gratuito"
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
  "Y"
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
  "OH"
 ],
 "seguranca": {
  "acao": [
   "fa(?:z|zer|zendo|zem|zia|co|ca|cam)",
   "fabric(?:ar|ando|o|a|am|ac\\w+)",
   "produz\\w*",
   "prepar\\w*",
   "sintetiz\\w*",
   "sintese",
   "obter",
   "obtenc\\w*",
   "obtem",
   "conseguir",
   "adquirir",
   "comprar",
   "compra",
   "vender",
   "vend\\w+ (?:de|da|do)",
   "trafic\\w*",
   "contrabande\\w*",
   "desvi\\w+",
   "burl\\w+",
   "esconder",
   "escond\\w+",
   "extrair",
   "extrac\\w*",
   "extrai",
   "cozinhar",
   "cozinh\\w+",
   "montar",
   "monto",
   "constru(?:ir|o|a|am|iu|indo|cao|coes)",
   "criar",
   "cria",
   "gerar",
   "gero",
   "gera",
   "purific\\w*",
   "refin\\w+",
   "cristaliz\\w*",
   "destil\\w*",
   "escalon\\w*",
   "escal(?:ar|a|ando|e)",
   "larga escala",
   "aument\\w+ (?:a |o |de )?(?:producao|rendimento|escala|potencia|pureza)",
   "receita",
   "passo a passo",
   "tutorial",
   "instruc\\w+",
   "ensina\\w*",
   "rota de sintese",
   "procedimento (?:de|para)",
   "protocolo (?:de|para)",
   "como (?:se )?(?:faz|fabrica|produz|prepara|sintetiza|obtem|extrai|cozinha|monta)",
   "quantidade de .{1,40} para (?:fazer|produzir|preparar)",
   "quais reagentes",
   "que reagentes",
   "o que preciso para (?:fazer|produzir)",
   "ingredientes para",
   "materiais para (?:fazer|montar|produzir)"
  ],
  "contextoSeguro": [
   "descart\\w*",
   "neutraliz\\w*",
   "armazen\\w*",
   "guard\\w*",
   "manuse\\w*",
   "manipul\\w*",
   "primeiros? socorros?",
   "epis?",
   "derram\\w*",
   "vazament\\w*",
   "respingo\\w*",
   "inal(?:ar|ei|ou|ado|acao)",
   "ingeri\\w*",
   "queimadura\\w*",
   "intoxicac\\w+ (?:por|com)",
   "primeiro atendimento",
   "equipamento de protecao",
   "protecao individual",
   "luvas",
   "oculos de protecao",
   "mascara",
   "o que fazer (?:se|quando|em caso)",
   "o que (?:eu )?(?:devo|posso) fazer (?:se|quando|em caso)",
   "em caso de",
   "ficha de seguranca",
   "fispq",
   "icsc",
   "reciclar",
   "reciclagem"
  ],
  "tirarFazerSeguro": "\\b(?:o que (?:eu |a gente |se )?(?:devo |posso |preciso |deve |tenho que )?fa(?:zer|co|z) (?:se|quando|em caso|apos|depois|com|ao|diante)|fa(?:zer|co|z) (?:o |a |um |uma )?(?:descarte|limpeza|neutralizacao|armazenamento|transporte|manuseio|diluicao|primeiros socorros))\\b",
  "alvoExplosivos": [
   "explosiv\\w*",
   "dinamite",
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
   "azida de (?:chumbo|sodio)",
   "fulminato\\w*",
   "anfo",
   "picrato\\w*",
   "tetril",
   "polvora(?: negra| sem fumaca)?",
   "nitrato de amonio (?:com|e|\\+|mais) (?:diesel|oleo|combustivel|gasolina)",
   "bomba[s]? (?:caseira[s]?|artesana(?:l|is)|improvisada[s]?|quimica[s]?|incendiaria[s]?|de fumaca|de pressao|relogio|de pregos?|de tubo)",
   "pipe bomb",
   "coquetel[s]? molotov",
   "molotov",
   "napalm",
   "explosives?",
   "nitroglycerin",
   "gunpowder",
   "granada[s]?",
   "artefato[s]? explosivo[s]?",
   "detonador(?:es)?",
   "pavio de bomba",
   "fogos? de artificio(?: caseiro[s]?)?",
   "termit[ae]",
   "thermite",
   "material incendiario",
   "bomba atomica",
   "bomba suja"
  ],
  "fazerBomba": "\\b(?:fa(?:z|zer|zendo)|fabric\\w*|montar|constru\\w+|criar|produzir|preparar|make|build)\\s+(?:uma?\\s+|an?\\s+|as\\s+|a\\s+)?(?:bomba|bomb)\\b(?!\\s+(?:de\\s+)?(?:agua|calor|vacuo|insulina|combustivel|ar|infusao|hidraulica|calorimetrica|centrifuga|submersa|peristaltica|de))",
  "alvoArmas": [
   "sarin",
   "soman",
   "tabun",
   "vx",
   "nerve agents?",
   "chemical weapons?",
   "mustard gas",
   "novichok",
   "agentes? (?:nervos\\w*|neurotoxic\\w*|vesican\\w*|quimic\\w*(?: de guerra)?)",
   "armas? quimic\\w*",
   "armas? bacteriologic\\w*",
   "arma de destruicao em massa",
   "gas(?:es)? (?:mostarda|sarin|nervos\\w*|lacrimogeneo\\w*|toxic\\w*|venenos\\w*|letal|letais|asfixiante\\w*|de guerra|cloro|fosgenio)",
   "mostarda (?:sulfurada|nitrogenada)",
   "fosgenio",
   "cloropicrina",
   "lewisita",
   "ricina",
   "cianeto(?: de hidrogenio| de potassio| de sodio)?",
   "acido cianidrico",
   "cloraminas?",
   "arsina",
   "fosfina",
   "toxina botulinica",
   "antraz",
   "cloro gasoso",
   "cloro em gas",
   "acido sulfidrico",
   "gas sulfidrico",
   "monoxido de carbono (?:para|pra) (?:matar|ferir|envenenar)"
  ],
  "alvoDrogas": [
   "metanfetamina[s]?",
   "methamphetamine",
   "cocaine",
   "heroin",
   "meth",
   "cristal (?:de )?meth",
   "cocaina",
   "crack(?! (?:the|a|an|this|that|open|code|codes|password|passwords|egg|eggs|nut|nuts|joke|jokes|down|in|up))",
   "pasta base",
   "merla",
   "heroina",
   "lsd",
   "acido lisergico",
   "mdma",
   "ecstasy",
   "extase",
   "molly",
   "fentanil\\w*",
   "fentanyl",
   "pcp",
   "fenciclidina",
   "ketamina",
   "cetamina",
   "dmt",
   "dimetiltriptamina",
   "mescalina",
   "psilocibina",
   "cogumelos? magicos?",
   "anfetamina[s]?",
   "ghb",
   "gbh",
   "oxicodona",
   "opio",
   "maconha",
   "cannabis",
   "haxixe",
   "thc",
   "canabinoides? sinteticos?",
   "spice(?! ?(?:rack|racks|mix|mixes|blend|blends|cabinet|jar|jars|girls))",
   "bath salts",
   "catinonas? sinteticas?",
   "drogas? sinteticas?",
   "droga[s]? ilicitas?",
   "entorpecentes?",
   "lanca[- ]perfume",
   "cheirinho da loló",
   "lolo",
   "skank",
   "laboratorio clandestino",
   "narcolaboratorio"
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
   "anidrido acetico",
   "ergotamina",
   "ergometrina",
   "acido antranilico",
   "n-?acetilantranilico",
   "acido lisergico",
   "precursores? (?:de|da|do|para|quimicos?|controlados?)",
   "precursores? controlados?",
   "iodo vermelho",
   "fosforo vermelho"
  ],
  "precursoresAcao": "\\b(?:extrair|extrac\\w*|obter|comprar|conseguir|desvi\\w+|sem (?:receita|licenca|autorizacao)|burl\\w+|vender|trafic\\w*|esconder|escond\\w+|sintese|sintetiz\\w*)\\b",
  "alvoDano": [
   "envenen\\w+ (?:alguem|uma pessoa|o|a|meu|minha|um|uma|alguns?|animal|animais|cachorro|gato|crianca[s]?|vizinh\\w+|colega|professor\\w*|chefe|marido|esposa|mulher|namorad\\w+|ex)",
   "matar (?:alguem|uma pessoa|meu|minha|o|a|um|uma)",
   "assassinar",
   "intoxicar (?:alguem|uma pessoa|propositalmente)",
   "veneno[s]? (?:indetectave\\w+|que nao (?:deixa|deixam) rastro\\w*|sem rastro\\w*|letal|letais|mortal|mortais|caseiro[s]?)",
   "dose letal para matar",
   "ferir (?:alguem|uma pessoa)",
   "queimar (?:alguem|uma pessoa) com (?:acido|quimico)",
   "jogar acido em",
   "atacar (?:alguem|uma pessoa) com"
  ],
  "alvoAutolesao": [
   "me matar",
   "me suicidar",
   "suicidio",
   "suicidar",
   "tirar (?:a )?minha vida",
   "acabar com (?:a )?minha vida",
   "me envenenar",
   "quero morrer",
   "morrer sem dor",
   "morrer sem sofrer",
   "overdose para morrer",
   "me machucar",
   "me ferir",
   "me cortar",
   "me intoxicar de proposito"
  ],
  "perigososCaseiros": [
   "acido (?:sulfurico|nitrico|cloridrico|muriatico|fluoridrico|perclorico|picrico|cianidrico)",
   "agua regia",
   "cloro(?: gasoso| em gas)?",
   "gas cloro",
   "cianeto\\w*",
   "arsenio",
   "arsina",
   "fosfina",
   "fosgenio",
   "mercurio",
   "fosforo (?:branco|vermelho)",
   "sodio metalico",
   "potassio metalico",
   "amonia anidra",
   "clorato\\w*",
   "perclorato\\w*",
   "peroxido de (?:acetona|metil\\w*|benzoila)",
   "agua oxigenada (?:concentrada|de? \\d+ ?volumes?)",
   "nitrato de (?:amonio|potassio) (?:concentrado)?",
   "permanganato de potassio",
   "acido sulfidrico",
   "sulfeto de hidrogenio",
   "monoxido de carbono",
   "gas(?:es)? (?:toxic\\w*|venenos\\w*|inflamave\\w*|asfixiante\\w*)",
   "fluoreto\\w*",
   "acido fluoridrico",
   "veneno[s]?",
   "toxina[s]?",
   "napalm",
   "termit[ae]",
   "thermite",
   "nitrocelulose",
   "nitroglicerina",
   "tolueno nitrado",
   "acetona e agua oxigenada",
   "agua sanitaria e (?:amonia|acido|vinagre)",
   "cloro e amonia",
   "soda e aluminio"
  ],
  "casa": [
   "em casa",
   "caseir[oa]s?",
   "artesana(?:l|is)",
   "improvisad[oa]s?",
   "na cozinha",
   "no quintal",
   "na garagem",
   "no banheiro",
   "no apartamento",
   "com produtos? (?:de casa|domesticos?|de limpeza|de supermercado|de farmacia)",
   "sem laboratorio",
   "faca voce mesmo",
   "diy",
   "com materiais? (?:facil|faceis|de casa|domesticos?)",
   "usando (?:so |apenas )?produtos? (?:de casa|domesticos?|de limpeza)"
  ],
  "coladaAlvos": {
   "EXPLOSIVOS": [
    "explosivo",
    "nitroglicerina",
    "dinamite",
    "trinitrotolueno",
    "peroxidodeacetona",
    "molotov",
    "napalm",
    "bombacaseira",
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
    "gasmostarda",
    "agentenervoso",
    "armaquimica",
    "fosgenio",
    "ricina",
    "gastoxico",
    "gasvenenoso",
    "cianeto",
    "cloraminas",
    "gascloro"
   ],
   "DROGAS": [
    "metanfetamina",
    "cocaina",
    "heroina",
    "fentanil",
    "ecstasy",
    "mdma",
    "anfetamina",
    "drogassinteticas",
    "pastabase",
    "lsd",
    "ketamina",
    "cetamina"
   ],
   "PRECURSORES": [
    "pseudoefedrina",
    "efedrina",
    "safrol",
    "fenilacetona",
    "anidridoacetico",
    "precursores"
   ]
  },
  "coladaAcoes": [
   "sintese",
   "sintetizar",
   "fazer",
   "fabricar",
   "produzir",
   "preparar",
   "purificar",
   "refinar",
   "cozinhar",
   "extrair",
   "comofaz",
   "receita",
   "passoapasso",
   "montar",
   "construir",
   "obter",
   "comprar",
   "escalonar"
  ]
 }
};
