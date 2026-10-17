// gerado — não editar. Fonte: contracts/lexico/pt-BR.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxico bruto de pt-BR (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */
internal object LexicoPtBr {
    fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "idioma" to "pt-BR",
        "versao" to 1,
        "descricao" to "Léxico do interpretador local (NLU por regras) e das regras de segurança, compartilhado entre o site (js/nlu/lex/<idioma>.js, gerado por tools/gerar_lexico.py) e o Android (Kotlin, etapa E). Regexes como TEXTO, sem flags: o cliente normaliza a pergunta (minúsculas, sem acentos, só [a-z0-9+-] e espaços) antes de casar. Só sintaxe comum a JS e java.util.regex (sem lookbehind variável, sem \\p{...}). Listas de palavras já normalizadas.",
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
        "saudacao" to "^(oi+|ola|opa|bom dia|boa tarde|boa noite|e ai|eai|hey|hello|hi|obrigad[oa]|muito obrigad[oa]|valeu|vlw|brigad[oa]|ajuda|help|socorro|menu|inicio|comecar|teste|testando)( tudo bem| td bem| tudo bom| como vai| assistente| ia| amigo| pessoal)*\$",
        "ajuda" to "\\b(?:o que (?:voce|vc|o app|o aplicativo|esse app|este app|a ia) (?:faz|sabe|responde|pode)|como (?:usar|uso|funciona) (?:o |este |esse )?(?:app|aplicativo|assistente)|o que (?:posso|eu posso|da para|da pra) perguntar|preciso de ajuda|quem (?:fez|criou|desenvolveu) (?:o |este |esse )?(?:app|aplicativo))\\b",
        "sobreDados" to "\\b(?:sobre os dados|de onde (?:vem|vêm|veem) os dados|origem dos dados|fonte dos dados|atualizacao dos dados|dados (?:sao )?atualizados|versao dos dados|quando foi atualizado|assinatura dos dados)\\b",
        "fontes" to "\\b(?:quais (?:sao )?as (?:fontes|licencas)|licencas? dos dados|qual (?:e )?a fonte|fontes? (?:das? )?(?:informac\\w+|respostas?)|de onde (?:tirou|vem) (?:essa|esta|a) (?:informacao|resposta)|referencias?)\\b",
        "balancear" to "\\bbalanc\\w*|\\bequilibr\\w+ (?:a |uma )?equacao\\b|\\bacert\\w+ (?:os )?coeficientes\\b",
        "conversao" to "\\b(?:convert\\w+|converta|transform\\w+|passar|passe|equivale\\w*|quantos? \\S+(?: \\S+)? (?:tem|ha|sao|equivalem|existem|correspondem)|quantas? \\S+(?: \\S+)? (?:tem|ha|sao|equivalem|existem|correspondem)|em quantos?)\\b",
        "ph" to "\\b(?:ph|poh)\\b|(?<!constante de )\\bacidez de\\b|\\bbasicidade\\b",
        "gas" to "\\b(?:gas(?:es)? ideais?|gas ideal|pv ?= ?nrt|pvnrt|lei dos gases|equacao (?:de clapeyron|dos gases|geral dos gases)|clapeyron|volume (?:molar|de um gas|de gas)|pressao (?:de um gas|do gas)|lei de boyle|lei de charles|gay lussac)\\b",
        "gasVariavel" to "\\bgas(?:es)?\\b",
        "concentracao" to "\\b(?:molaridade|concentracao|concentrad[ao]|diluic\\w*|diluir|dilua|diluido|c1 ?v1|c1v1|titulo (?:em massa|da solucao)|percentual (?:em )?massa|porcentagem em massa|partes por milhao|ppm|normalidade|molalidade|solucao de|gramas por litro|mol l|mol por litro|g l)\\b",
        "estequiometria" to "\\b(?:estequiometri\\w*|reagente (?:limitante|em excesso)|limitante|excesso de reagente|rendimento|quantos? (?:mols?|gramas?|moleculas?|atomos?|litros?|ions?|particulas?|quilos?|mg|miligramas?)\\b|quantas? (?:moleculas|particulas|atomos|gramas|mols|litros)|numero de (?:mols?|moleculas|atomos|particulas|ions)|cntp|condicoes normais|volume ocupado|constante de avogadro|numero de avogadro)\\b",
        "massaMolar" to "\\b(?:massa molar|massa molecular|massa formula|peso molecular|peso molar|quanto pesa (?:um )?mol|quanto vale (?:a )?massa molar)\\b|\\bg mol\\b",
        "desenhar" to "\\b(?:desenh\\w+|estrutura (?:2d|molecular|quimica|plana|de lewis|do|da|de)|estrutura|mostr\\w+ (?:a )?(?:estrutura|molecula)|molecula (?:do|da|de)|como (?:e|eh) (?:a )?(?:molecula|estrutura)|formula estrutural|geometria molecular|visualizar|esqueleto)\\b",
        "comparar" to "\\b(?:compar\\w+|diferenca (?:s )?entre|diferencas? entre|\\bversus\\b|\\bvs\\b|qual (?:a )?diferenca|semelhanca\\w*|igual a|parecid\\w+|ordem (?:crescente|decrescente)|em ordem|orden\\w+|qual (?:deles |delas |dos dois |das duas )?(?:tem|possui|apresenta|e) (?:o |a )?(?:maior|menor|mais|menos)|quem (?:tem|e) (?:o |a )?(?:maior|menor|mais|menos)|do (?:menor|maior) (?:para|ao) (?:o )?(?:maior|menor))\\b",
        "seguranca" to "\\b(?:perig\\w+|toxic\\w+|segur\\w+|epis?\\b|equipamentos? de protecao|primeiros? socorros|derram\\w+|vazament\\w+|armazen\\w+|incendi\\w+|inflamav\\w+|corrosiv\\w+|irritant\\w+|irrita\\w*|ghs|pictogramas?|frases? h\\b|ficha de seguranca|icsc|fispq|mistur\\w+|incompativ\\w+|descart\\w+|manusear|manuseio|inala\\w+|ingest\\w+|queimadur\\w+|venenos\\w+|veneno|faz mal|fazem mal|neutraliz\\w+|luvas|oculos de protecao|palavra de sinal|classificacao de perigo|e seguro|e perigoso|cancerigen\\w+|explosiv\\w+|reage com agua|reativ\\w+ com)\\b",
        "nomenclatura" to "\\b(?:qual (?:e )?(?:o )?nome|como (?:se )?chama|nome (?:quimico|iupac|sistematico|cientifico|oficial)|nomenclatura|como (?:se )?escreve|qual (?:e )?a? ?formula(?: quimica| molecular)?|formula (?:do|da|de|quimica do|quimica da|molecular do|molecular da)|nome do composto)\\b",
        "tabela" to "\\b(?:tabela periodica|periodicidade|tendencia\\w*|grupo \\d{1,2}|familia \\d{1,2}|periodo \\d|bloco [spdf]|elementos? (?:do|da|dos|das) (?:grupo|periodo|bloco|familia)|quais (?:sao )?(?:os )?elementos|quantos elementos|elementos (?:gasosos|liquidos|solidos)|metais|nao metais|ametais|semimetais|metaloides|halogenios?|gases? nobres?|alcalino terrosos?|alcalinos?|lantanideos?|lantanidios?|actinideos?|actinidios?|elemento mais|elementos mais|ordem crescente|ordem decrescente|maior (?:raio|eletronegatividade|energia|ponto|massa|densidade)|menor (?:raio|eletronegatividade|energia|ponto|massa|densidade))\\b",
        "conceitoCue" to "^(?:o que (?:e|eh|sao|significa|quer dizer|seria)|oque e|expli(?:c|qu)\\w*|defin\\w+|conceito de|definicao de|me explica\\w*|como funciona\\w*|por que|por qu[eê]|porque|para que serve|qual (?:e )?a? ?(?:definicao|diferenca|importancia|funcao)|diferenca entre|ensin\\w+|resum\\w+)\\b",
        "conceitoTemas" to "\\b(?:mol|ph|estequiometria|ligacao (?:ionica|covalente|metalica|quimica)|eletronegatividade|oxidacao|reducao|oxirreducao|redox|equilibrio quimico|entalpia|entropia|isomeria|acido|base|sal|oxido|solucao|concentracao|molaridade|diluicao|tabela periodica|reacao quimica|cinetica|catalisador|eletrolise|pilha|polaridade|forca intermolecular|forcas intermoleculares)\\b"
    )

    private fun n_pistas_limparConceito(): List<Any?> = listOf<Any?>(
        "^(?:e |eh |sao |significa |quer dizer |seria )",
        "^(?:um |uma |o |a |os |as |de |do |da )+"
    )

    private fun n_pistas(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "querCalcular" to "\\b(?:limitante|rendimento|quantos?|quantas?|massa de|gramas?|mols?|produz\\w*|forma\\w*|obt\\w+|reage\\w*|consum\\w+|sobra\\w*|excesso|volume|litros?)\\b",
        "conversaoPreposicoes" to "(?:->|→| em | para | pra | to )",
        "paraUnidade" to "\\b(?:para|em|a|pra|ate)\\s+(?:o |a |os |as )?([A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit| por litro| de mercurio)?)\\s*[?!.]*\$",
        "quantosUnidade" to "^\\s*(?:quantos?|quantas?)\\s+((?:graus\\s+)?[A-Za-zµμ°º/³²·.]+(?: celsius| fahrenheit)?)\\s+(?:tem|t[eê]m|h[aá]|s[aã]o|equivalem|existem|correspondem|vale|valem)(?![A-Za-zÀ-ÿ])",
        "phContexto" to "\\b(?:acido|base|solucao)\\b",
        "conector" to "\\bde\\b",
        "prefixoExplicacao" to "^(?:o que|oque|expli\\w*|defin\\w*|conceito|como funciona|por que)",
        "prefixoExplicacaoPalavra" to "^(?:o que|oque|expli\\w*|defin\\w*|conceito|como funciona|por que)\\b",
        "prefixoDefinicao" to "^(?:o que|oque|expli\\w*|defin\\w*|conceito)\\b",
        "gasGrandezas" to "\\b(?:volume|pressao|temperatura|mols?|quantos)\\b",
        "concentracaoForte" to "\\bdilu\\w*|molaridade|concentracao\\b",
        "propriedadesPalavra" to "\\bpropriedades\\b",
        "mistura" to "\\b(?:mistur\\w+|junto com|juntos|combinar|misturado|misturada|incompativ\\w+)\\b",
        "elementoPalavra" to "\\belementos?\\b",
        "gasSubstancia" to "\\bgas\\b",
        "tendencia" to "\\btendencia\\w*|\\bperiodicidade|\\bvaria\\w* (?:ao longo|no periodo|no grupo)|\\bao longo d[oa] (?:periodo|grupo)",
        "tabelaPalavra" to "\\btabela periodica\\b",
        "grupo" to "\\b(?:grupo|familia)\\s+(\\d{1,2})\\b",
        "periodo" to "\\bperiodo\\s+(\\d)\\b",
        "bloco" to "\\bbloco\\s+([spdf])\\b",
        "continuacao" to "^e (?:o |a |os |as )?(?:de |do |da |dos |das )?",
        "continuacaoNuvem" to "^(?:e|ok|certo|beleza|entendi|agora|entao|mas|tambem|em|com|faz|faca|refaz|refaca|repete|repita|desenhe|desenha|mostre|mostra|me fala mais|fala mais|e se)(?: |\$)|(?:^| )(?:tambem|tb|idem|dele|dela|disso|desse|dessa|nele|nela)(?: |\$)",
        "limparConceito" to n_pistas_limparConceito(),
        "constantes" to "\\b(pka|pkb|ka|kb)\\s*(?:=|:|de|igual a|vale)?\\s*([0-9][0-9.,]*(?:\\s*(?:[x×*]\\s*10\\s*\\^?\\s*\\{?-?\\d+\\}?|e-?\\d+))?)",
        "quantidadeComplemento" to "(?:de|por)",
        "letrasUnidade" to "A-Za-zçãéêíóú",
        "ligacaoPreposicoes" to "(?:de|do|da|dos|das)",
        "diluicao" to "\\b(?:dilu\\w*|c1v1|c1 v1)\\b",
        "percentualMassa" to "\\bmassa|percent|porcent|titulo\\b",
        "cntp" to "\\b(?:cntp|condicoes normais|volume)\\b",
        "cueElemento" to "\\b(?:elemento|simbolo|simbolo quimico)\\b",
        "reacaoVerbo" to "\\b(?:formad[oa]s?|se formam?|produzid[oa]s?|produz(?:em)?|obtid[oa]s?|reage|reagem|reagir|reagindo|consumid[oa]s?|consome|consomem|necessari[oa]s?|liberad[oa]s?|liberam?|a partir de|queima|combustao|decomposicao|decompoe)\\b",
        "pedidoQuantidade" to "\\b(?:quanto pesam?|pesa|pesam|massa(?! (?:molar|molecular|atomica|exata|especifica|formula))|mols?|quantidade de materia|quantidade em mols?|volume)\\b",
        "ordemCrescente" to "\\b(?:crescente|do menor (?:para|ao) (?:o )?maior|qual (?:deles |delas |dos dois |das duas )?(?:tem|possui|apresenta|e) (?:o |a )?(?:menor|menos)|quem (?:tem|e) (?:o |a )?(?:menor|menos))\\b",
        "ordemDecrescente" to "\\b(?:decrescente|do maior (?:para|ao) (?:o )?menor|qual (?:deles |delas |dos dois |das duas )?(?:tem|possui|apresenta|e) (?:o |a )?(?:maior|mais)|quem (?:tem|e) (?:o |a )?(?:maior|mais))\\b",
        "conectivoLista" to "^(?:e|ou)\$",
        "paraUnidades" to "\\b(?:para|em|a|pra|ate)\\s+(?:o |a |os |as )?",
        "paraUnidadesFim" to "\\s*[?!.]*\$",
        "misturaTema" to "\\b(mistura)s?\\b",
        "misturaConceito" to "\\b(?:substancias?|pura|puras|puro|puros|homogene\\w*|heterogene\\w*|sistemas?|classifi\\w*|tipos? de|o que (?:e|sao)|diferenca entre|fases?)\\b",
        "nomenclaturaPedido" to "\\b(?:como (?:se )?chama|como (?:se )?nomeia|como nomear|nomei(?:e|a|em)|nomear|de o nome|da o nome|qual (?:e )?o nome|nome (?:oficial|iupac|usual|sistematico|correto))\\b",
        "nomenclaturaAlvo" to "\\b(?:compostos?|substancias?|moleculas?|hidrocarbonetos?|organic[oa]s?|cadeias?|estruturas?|\\w*(?:met|et|prop|but|pent|hex|hept|oct|non|dec|fen|benz)\\w*(?:ano|eno|ino|ol|ona|oico|il|amina))\\b"
    )

    private fun n_nivel(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "fundamental" to "\\b(?:ensino fundamental|fundamental|crianca|simples|bem simples|facil de entender|para leigos)\\b",
        "medio" to "\\b(?:ensino medio|medio|enem|vestibular)\\b",
        "superior" to "\\b(?:faculdade|universidade|superior|avancado|graduacao|aprofundad\\w+|detalhad\\w+)\\b"
    )

    private fun n_unidades_0(): List<Any?> = listOf<Any?>(
        "^graus? (?:celsius|centigrados?)\$|^celsius\$",
        "°C"
    )

    private fun n_unidades_1(): List<Any?> = listOf<Any?>(
        "^graus? fahrenheit\$|^fahrenheit\$",
        "°F"
    )

    private fun n_unidades_2(): List<Any?> = listOf<Any?>(
        "^kelvins?\$",
        "K"
    )

    private fun n_unidades_3(): List<Any?> = listOf<Any?>(
        "^atmosferas?\$",
        "atm"
    )

    private fun n_unidades_4(): List<Any?> = listOf<Any?>(
        "^pascais\$|^pascal\$",
        "Pa"
    )

    private fun n_unidades_5(): List<Any?> = listOf<Any?>(
        "^quilopascais\$|^quilopascal\$",
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
        "^gramas?\$",
        "g"
    )

    private fun n_unidades_11(): List<Any?> = listOf<Any?>(
        "^miligramas?\$",
        "mg"
    )

    private fun n_unidades_12(): List<Any?> = listOf<Any?>(
        "^quilogramas?\$|^quilos?\$",
        "kg"
    )

    private fun n_unidades_13(): List<Any?> = listOf<Any?>(
        "^toneladas?\$",
        "t"
    )

    private fun n_unidades_14(): List<Any?> = listOf<Any?>(
        "^mols?\$",
        "mol"
    )

    private fun n_unidades_15(): List<Any?> = listOf<Any?>(
        "^milimols?\$",
        "mmol"
    )

    private fun n_unidades_16(): List<Any?> = listOf<Any?>(
        "^kilomols?\$|^quilomols?\$",
        "kmol"
    )

    private fun n_unidades_17(): List<Any?> = listOf<Any?>(
        "^joules?\$",
        "J"
    )

    private fun n_unidades_18(): List<Any?> = listOf<Any?>(
        "^calorias?\$",
        "cal"
    )

    private fun n_unidades_19(): List<Any?> = listOf<Any?>(
        "^quilocalorias?\$",
        "kcal"
    )

    private fun n_unidades_20(): List<Any?> = listOf<Any?>(
        "^quilojoules?\$",
        "kJ"
    )

    private fun n_unidades_21(): List<Any?> = listOf<Any?>(
        "^molar(?:es)?\$",
        "mol/L"
    )

    private fun n_unidades_22(): List<Any?> = listOf<Any?>(
        "^mol por litro\$|^mols por litro\$",
        "mol/L"
    )

    private fun n_unidades_23(): List<Any?> = listOf<Any?>(
        "^gramas? por litro\$",
        "g/L"
    )

    private fun n_unidades_24(): List<Any?> = listOf<Any?>(
        "^(?:moleculas?|atomos?|particulas?|ions?|unidades|entidades)\$",
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
        "^quilometros?\$",
        "km"
    )

    private fun n_unidades_30(): List<Any?> = listOf<Any?>(
        "^por ?cento\$",
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

    private fun n_unidades_36(): List<Any?> = listOf<Any?>(
        "^metros? cubicos?\$",
        "m3"
    )

    private fun n_unidades_37(): List<Any?> = listOf<Any?>(
        "^decimetros? cubicos?\$",
        "dm3"
    )

    private fun n_unidades_38(): List<Any?> = listOf<Any?>(
        "^centimetros? cubicos?\$",
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
        "meio|meia",
        0.5
    )

    private fun n_numerais_1(): List<Any?> = listOf<Any?>(
        "um|uma",
        1
    )

    private fun n_numerais_2(): List<Any?> = listOf<Any?>(
        "dois|duas",
        2
    )

    private fun n_numerais_3(): List<Any?> = listOf<Any?>(
        "tres",
        3
    )

    private fun n_numerais_4(): List<Any?> = listOf<Any?>(
        "quatro",
        4
    )

    private fun n_numerais_5(): List<Any?> = listOf<Any?>(
        "cinco",
        5
    )

    private fun n_numerais_6(): List<Any?> = listOf<Any?>(
        "seis",
        6
    )

    private fun n_numerais_7(): List<Any?> = listOf<Any?>(
        "sete",
        7
    )

    private fun n_numerais_8(): List<Any?> = listOf<Any?>(
        "oito",
        8
    )

    private fun n_numerais_9(): List<Any?> = listOf<Any?>(
        "nove",
        9
    )

    private fun n_numerais_10(): List<Any?> = listOf<Any?>(
        "dez",
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
        "\\balcalino terros\\w*|\\balcalinos terros\\w*",
        "metal_alcalino_terroso"
    )

    private fun n_categorias_1(): List<Any?> = listOf<Any?>(
        "\\bmetais? alcalinos?|\\balcalinos\\b",
        "metal_alcalino"
    )

    private fun n_categorias_2(): List<Any?> = listOf<Any?>(
        "\\bmetais? de transicao|\\bmetal de transicao|\\belementos? de transicao",
        "metal_transicao"
    )

    private fun n_categorias_3(): List<Any?> = listOf<Any?>(
        "\\bpos transicao|\\bmetais? representativos?",
        "metal_pos_transicao"
    )

    private fun n_categorias_4(): List<Any?> = listOf<Any?>(
        "\\bsemimetais?|\\bmetaloides?",
        "semimetal"
    )

    private fun n_categorias_5(): List<Any?> = listOf<Any?>(
        "\\bnao metais?|\\bametais?",
        "nao_metal"
    )

    private fun n_categorias_6(): List<Any?> = listOf<Any?>(
        "\\bhalogenios?",
        "halogenio"
    )

    private fun n_categorias_7(): List<Any?> = listOf<Any?>(
        "\\bgas(?:es)? nobres?|\\bnobres\\b",
        "gas_nobre"
    )

    private fun n_categorias_8(): List<Any?> = listOf<Any?>(
        "\\blantanideos?|\\blantanidios?|\\bterras raras",
        "lantanideo"
    )

    private fun n_categorias_9(): List<Any?> = listOf<Any?>(
        "\\bactinideos?|\\bactinidios?|\\bactinoides?|\\bactinios\\b",
        "actinideo"
    )

    private fun n_categorias_10(): List<Any?> = listOf<Any?>(
        "\\bmetais\\b|\\bmetal\\b",
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
        "\\b(?:gasosos?|gases|no estado gasoso)\\b",
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
        "\\bmais eletronegativ\\w+|\\bmaior eletronegatividade",
        "eletronegatividade",
        "max"
    )

    private fun n_extremos_1(): List<Any?> = listOf<Any?>(
        "\\bmenos eletronegativ\\w+|\\bmenor eletronegatividade",
        "eletronegatividade",
        "min"
    )

    private fun n_extremos_2(): List<Any?> = listOf<Any?>(
        "\\bmais densos?\\b|\\bmaior densidade",
        "densidadeKgm3",
        "max"
    )

    private fun n_extremos_3(): List<Any?> = listOf<Any?>(
        "\\bmenos densos?\\b|\\bmenor densidade|\\bmais leves?\\b",
        "densidadeKgm3",
        "min"
    )

    private fun n_extremos_4(): List<Any?> = listOf<Any?>(
        "\\bmaior raio|\\bmais volumos\\w+",
        "raioAtomicoPm",
        "max"
    )

    private fun n_extremos_5(): List<Any?> = listOf<Any?>(
        "\\bmenor raio",
        "raioAtomicoPm",
        "min"
    )

    private fun n_extremos_6(): List<Any?> = listOf<Any?>(
        "\\bmaior ponto de fusao",
        "pontoFusaoK",
        "max"
    )

    private fun n_extremos_7(): List<Any?> = listOf<Any?>(
        "\\bmenor ponto de fusao",
        "pontoFusaoK",
        "min"
    )

    private fun n_extremos_8(): List<Any?> = listOf<Any?>(
        "\\bmaior ponto de ebulicao",
        "pontoEbulicaoK",
        "max"
    )

    private fun n_extremos_9(): List<Any?> = listOf<Any?>(
        "\\bmenor ponto de ebulicao",
        "pontoEbulicaoK",
        "min"
    )

    private fun n_extremos_10(): List<Any?> = listOf<Any?>(
        "\\bmaior energia de ionizacao",
        "energiaIonizacaoKJmol",
        "max"
    )

    private fun n_extremos_11(): List<Any?> = listOf<Any?>(
        "\\bmenor energia de ionizacao",
        "energiaIonizacaoKJmol",
        "min"
    )

    private fun n_extremos_12(): List<Any?> = listOf<Any?>(
        "\\bmais pesad\\w+|\\bmaior massa atomica",
        "massaAtomica",
        "max"
    )

    private fun n_extremos_13(): List<Any?> = listOf<Any?>(
        "\\bmenor massa atomica",
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
        "massa atomica",
        "peso atomico",
        "massa do atomo"
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
        "bloco"
    )

    private fun n_propriedades_categoria(): List<Any?> = listOf<Any?>(
        "categoria",
        "classificacao",
        "tipo de elemento",
        "classe do elemento"
    )

    private fun n_propriedades_configuracaoEletronica(): List<Any?> = listOf<Any?>(
        "configuracao eletronica",
        "distribuicao eletronica"
    )

    private fun n_propriedades_eletronegatividade(): List<Any?> = listOf<Any?>(
        "eletronegatividade"
    )

    private fun n_propriedades_raioAtomicoPm(): List<Any?> = listOf<Any?>(
        "raio atomico",
        "raio de van der waals",
        "tamanho do atomo"
    )

    private fun n_propriedades_afinidadeEletronicaKJmol(): List<Any?> = listOf<Any?>(
        "afinidade eletronica",
        "eletroafinidade"
    )

    private fun n_propriedades_energiaIonizacaoKJmol(): List<Any?> = listOf<Any?>(
        "energia de ionizacao",
        "potencial de ionizacao",
        "primeira energia de ionizacao"
    )

    private fun n_propriedades_pontoFusaoK(): List<Any?> = listOf<Any?>(
        "ponto de fusao",
        "temperatura de fusao",
        "fusao",
        "derrete",
        "funde"
    )

    private fun n_propriedades_pontoEbulicaoK(): List<Any?> = listOf<Any?>(
        "ponto de ebulicao",
        "temperatura de ebulicao",
        "ebulicao",
        "ferve"
    )

    private fun n_propriedades_densidadeKgm3(): List<Any?> = listOf<Any?>(
        "densidade",
        "massa especifica"
    )

    private fun n_propriedades_estadoPadrao(): List<Any?> = listOf<Any?>(
        "estado fisico",
        "estado padrao",
        "estado da materia",
        "e solido",
        "e liquido",
        "e gasoso"
    )

    private fun n_propriedades_estadosOxidacao(): List<Any?> = listOf<Any?>(
        "estados de oxidacao",
        "numeros de oxidacao",
        "nox",
        "estado de oxidacao",
        "valencia"
    )

    private fun n_propriedades_descoberta(): List<Any?> = listOf<Any?>(
        "descoberta",
        "descobriu",
        "descobridor",
        "quem descobriu",
        "ano da descoberta",
        "quando foi descoberto",
        "foi descoberto",
        "foi descoberta",
        "foram descobertos"
    )

    private fun n_propriedades_massaMolar(): List<Any?> = listOf<Any?>(
        "massa molar",
        "massa molecular",
        "peso molecular",
        "peso molar",
        "massa formula"
    )

    private fun n_propriedades_massaExata(): List<Any?> = listOf<Any?>(
        "massa exata",
        "massa monoisotopica"
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
        "nome iupac",
        "nome sistematico",
        "iupac"
    )

    private fun n_propriedades_xlogp(): List<Any?> = listOf<Any?>(
        "xlogp",
        "logp",
        "lipofilicidade",
        "coeficiente de particao"
    )

    private fun n_propriedades_doadoresH(): List<Any?> = listOf<Any?>(
        "doadores de hidrogenio",
        "doadores de ligacao de hidrogenio"
    )

    private fun n_propriedades_aceptoresH(): List<Any?> = listOf<Any?>(
        "aceptores de hidrogenio",
        "aceptores de ligacao de hidrogenio"
    )

    private fun n_propriedades_ligacoesRotaveis(): List<Any?> = listOf<Any?>(
        "ligacoes rotaveis"
    )

    private fun n_propriedades_carga(): List<Any?> = listOf<Any?>(
        "carga eletrica",
        "carga formal"
    )

    private fun n_propriedades_tpsa(): List<Any?> = listOf<Any?>(
        "tpsa",
        "area de superficie polar"
    )

    private fun n_propriedades_solubilidade(): List<Any?> = listOf<Any?>(
        "solubilidade",
        "solubilidade em agua",
        "solubilidade na agua",
        "coeficiente de solubilidade",
        "soluvel em agua",
        "soluvel na agua",
        "insoluvel em agua",
        "insoluvel na agua",
        "soluvel",
        "insoluvel",
        "quanto dissolve",
        "quanto se dissolve",
        "se dissolve",
        "dissolve em agua",
        "dissolve na agua"
    )

    private fun n_propriedades_pka(): List<Any?> = listOf<Any?>(
        "pka",
        "constante de acidez",
        "constante de ionizacao acida",
        "constante de dissociacao acida",
        "constante de ionizacao do acido",
        "constante de dissociacao do acido",
        "ka de",
        "ka do",
        "ka da"
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
        "pka" to n_propriedades_pka()
    )

    private fun n_stopwordsBusca(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_stopPalavras(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_palavrasFuncionais(): List<Any?> = listOf<Any?>(
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
        "Y"
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
        "SAL"
    )

    private fun n_seguranca_acao(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_contextoSeguro(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoExplosivos(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoDrogas(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoDano(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_alvoAutolesao(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_perigososCaseiros(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_casa(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca_coladaAlvos(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "EXPLOSIVOS" to listOf<Any?>(
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
        ),
        "ARMAS_QUIMICAS" to listOf<Any?>(
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
        ),
        "DROGAS" to listOf<Any?>(
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
        ),
        "PRECURSORES" to listOf<Any?>(
            "pseudoefedrina",
            "efedrina",
            "safrol",
            "fenilacetona",
            "anidridoacetico",
            "precursores"
        )
    )

    private fun n_seguranca_coladaAcoes(): List<Any?> = listOf<Any?>(
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
    )

    private fun n_seguranca(): Map<String, Any?> = linkedMapOf<String, Any?>(
        "acao" to n_seguranca_acao(),
        "contextoSeguro" to n_seguranca_contextoSeguro(),
        "tirarFazerSeguro" to "\\b(?:o que (?:eu |a gente |se )?(?:devo |posso |preciso |deve |tenho que )?fa(?:zer|co|z) (?:se|quando|em caso|apos|depois|com|ao|diante)|fa(?:zer|co|z) (?:o |a |um |uma )?(?:descarte|limpeza|neutralizacao|armazenamento|transporte|manuseio|diluicao|primeiros socorros))\\b",
        "alvoExplosivos" to n_seguranca_alvoExplosivos(),
        "fazerBomba" to "\\b(?:fa(?:z|zer|zendo)|fabric\\w*|montar|constru\\w+|criar|produzir|preparar|make|build)\\s+(?:uma?\\s+|an?\\s+|as\\s+|a\\s+)?(?:bomba|bomb)\\b(?!\\s+(?:de\\s+)?(?:agua|calor|vacuo|insulina|combustivel|ar|infusao|hidraulica|calorimetrica|centrifuga|submersa|peristaltica|de))",
        "alvoArmas" to n_seguranca_alvoArmas(),
        "alvoDrogas" to n_seguranca_alvoDrogas(),
        "precursoresNomes" to n_seguranca_precursoresNomes(),
        "precursoresAcao" to "\\b(?:extrair|extrac\\w*|obter|comprar|conseguir|desvi\\w+|sem (?:receita|licenca|autorizacao)|burl\\w+|vender|trafic\\w*|esconder|escond\\w+|sintese|sintetiz\\w*)\\b",
        "alvoDano" to n_seguranca_alvoDano(),
        "alvoAutolesao" to n_seguranca_alvoAutolesao(),
        "perigososCaseiros" to n_seguranca_perigososCaseiros(),
        "casa" to n_seguranca_casa(),
        "coladaAlvos" to n_seguranca_coladaAlvos(),
        "coladaAcoes" to n_seguranca_coladaAcoes()
    )
}
