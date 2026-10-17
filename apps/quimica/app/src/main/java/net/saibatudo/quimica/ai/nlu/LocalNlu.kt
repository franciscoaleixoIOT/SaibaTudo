package net.saibatudo.quimica.ai.nlu

import net.saibatudo.quimica.ai.Seguranca
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Quantidade
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.Balanceador
import net.saibatudo.quimica.domain.calc.FormulaQuimica

/**
 * NLU LOCAL determinístico (regras + dicionário derivado dos dados): converte uma pergunta em [ParsedQuery] (intenção +
 * entidades). Não consulta nem produz fatos. É o espelho de web/src/quimica/js/nlu.js, com a MESMA ORDEM de regras; os casos
 * de referência de contracts/nlu_golden_cases.json (por `idioma`) validam os dois. Todo texto em língua natural (gatilhos, unidades por
 * extenso, categorias…) vem do LÉXICO do idioma ([Lexico], gerado de contracts/lexico/<idioma>.json): nada de português fixo aqui.
 *
 * Ordem (a primeira regra que casa vence):
 *  1. segurança química (RECUSA_PERIGO), antes de qualquer outra coisa;
 *  2. conversa e meta: AJUDA (saudação), SOBRE_DADOS, FONTES, AJUDA ("o que você faz");
 *  3. equação química: ESTEQUIOMETRIA (com quantidades) ou BALANCEAR;
 *  4. CONVERSAO_UNIDADE (duas unidades da mesma grandeza);
 *  5. cálculos: PH, GAS_IDEAL, CONCENTRACAO, ESTEQUIOMETRIA, MASSA_MOLAR;
 *  6. COMPARAR, DESENHAR, SEGURANCA, NOMENCLATURA;
 *  7. TABELA_PERIODICA;
 *  8. PROPRIEDADE, ELEMENTO, COMPOSTO;
 *  9. CONCEITO e, por fim, DESCONHECIDA.
 */
object LocalNlu {

    const val TAMANHO_MAXIMO = 300

    private val RX_SETA = Regex("""\s*(?:<=>|<->|⇌|⇄|-->|->|→|⟶|⇒|=>|==|=)\s*""")

    // ---- equação -----------------------------------------------------------------------------------------------------------------

    private val RX_ELETRON = Regex("""^e(?:\^?[-−]|⁻)$""")

    private fun ehEspecie(tok: String): Boolean {
        val t = tok.trimEnd('.', ',', ';', ':', '!', '?')
        if (t.isEmpty()) return false
        if (t == "+" || t.all { it.isDigit() }) return true
        val partes = Balanceador.dividirEspecies(t)
        if (partes.isEmpty()) return false
        return partes.all { p ->
            val corpo = p.replace(Regex("""^\d+\s*"""), "")
            RX_ELETRON.matches(corpo) || (corpo.isNotEmpty() && (corpo[0] in 'A'..'Z' || corpo[0] == '(' || corpo[0] == '[') && FormulaQuimica.tentar(corpo) != null)
        }
    }

    /** Extrai "Fe + O2 -> Fe2O3" de uma frase; null se não houver equação. */
    fun extrairEquacao(original: String): String? = extrairEquacaoComPosicao(original)?.first

    /** A equação normalizada e o trecho (índices do texto original) que ela ocupa. */
    fun extrairEquacaoComPosicao(original: String): Pair<String, IntRange>? {
        val m = RX_SETA.find(original) ?: return null
        val tok = Regex("""\S+""")
        val esq = tok.findAll(original.substring(0, m.range.first)).toList()
        val dirOffset = m.range.last + 1
        val dir = tok.findAll(original.substring(dirOffset)).toList()
        val l = ArrayDeque<MatchResult>()
        for (i in esq.indices.reversed()) { if (ehEspecie(esq[i].value)) l.addFirst(esq[i]) else break }
        val r = mutableListOf<Pair<String, IntRange>>()
        for (x in dir) {
            if (!ehEspecie(x.value)) break
            val limpo = x.value.trimEnd('.', ',', ';', ':', '!', '?')
            r += limpo to ((dirOffset + x.range.first)..(dirOffset + x.range.first + limpo.length - 1))
        }
        val lista = l.map { it.value to it.range }.toMutableList()
        while (lista.isNotEmpty() && lista.last().first == "+") lista.removeAt(lista.lastIndex)
        while (r.isNotEmpty() && r.last().first == "+") r.removeAt(r.lastIndex)
        fun soNumerosOuMais(x: List<Pair<String, IntRange>>) = x.all { it.first.all { c -> c.isDigit() } || it.first == "+" }
        if (lista.isEmpty() || r.isEmpty() || soNumerosOuMais(lista) || soNumerosOuMais(r)) return null
        val equacao = lista.joinToString(" ") { it.first } + " -> " + r.joinToString(" ") { it.first }
        return equacao to (lista.first().second.first..r.last().second.last)
    }

    // ---- parse -------------------------------------------------------------------------------------------------------------------------

    /**
     * Interpreta [pergunta] com o dicionário [d] (pacote + idioma) e o léxico [lex] do idioma (padrão: o do dicionário). [contexto] é a
     * pergunta anterior já resolvida (para "e o ponto de ebulição?"/"and gold?").
     */
    fun parse(pergunta: String, d: Dicionario, contexto: ParsedQuery? = null, lex: Lexico = d.lexico): ParsedQuery {
        val original = Regex("""\s+""").replace(pergunta, " ").trim().take(TAMANHO_MAXIMO)
        val n = Texto.nlu(original)
        var p = ParsedQuery(Intent.DESCONHECIDA, textoOriginal = original)
        if (n.isEmpty() && !RX_SETA.containsMatchIn(original)) return p
        fun i(nome: String) = lex.intencao(nome).containsMatchIn(n)
        fun pista(nome: String) = lex.pista(nome).containsMatchIn(n)

        // 1) segurança: antes de tudo (idioma do léxico + inglês + português)
        if (Seguranca.avaliar(original, Seguranca.idiomasDaAvaliacao(lex.idioma)).recusar) return p.copy(intent = Intent.RECUSA_PERIGO)

        val unidades = d.unidades
        val ents = d.entidades(original)
        val props = d.propriedadesEm(n)
        val quant = Quantidades.ler(original, unidades, lex)
        val temQuant = quant.any { it.unidade != null && it.unidade != "%" }
        val equacao = extrairEquacao(original)
        val nivel = lex.nivelDe(n)
        val constantes = Quantidades.lerConstantes(original, lex)
        val quantidadesPublicas = quant.mapNotNull { q -> q.unidade?.let { Quantidade(q.valor, it, q.texto) } }

        // entidades: um nome de elemento que também é de composto prefere o elemento, salvo "gás"/fórmula digitada
        val els = ents.elementos
        val comps = ents.compostos
        var compostos = comps
        if (els.isNotEmpty() && comps.isNotEmpty()) {
            val nomesEl = els.map { Texto.nlu(it.nome) }.toSet()
            compostos = comps.filter { it.via != "nome" || Texto.nlu(it.nome) !in nomesEl || pista("gasSubstancia") }
        }
        // um nome de elemento que só aparece dentro do nome de uma propriedade não cita o elemento ("radio atómico" em espanhol não é o rádio)
        val nSemProp = if (props.isNotEmpty()) d.semPropriedades(n) else n
        fun temPalavra(txt: String, w: String) = w.isNotEmpty() && " $txt ".contains(" $w ")
        fun soNaPropriedade(e: Achado) = e.via == "nome" && temPalavra(n, Texto.nlu(e.nome)) && !temPalavra(nSemProp, Texto.nlu(e.nome))
        val elementos = els.filter { e -> !(compostos.isNotEmpty() && compostos.any { it.via == "formula" && it.texto == e.simbolo }) && !soNaPropriedade(e) }
        val formulasTexto = ents.formulas.map { it.texto!! }
        p = p.copy(
            nivel = nivel, quantidades = quantidadesPublicas, constantes = constantes,
            elementos = elementos.map { it.simbolo!! }, elemento = elementos.firstOrNull()?.simbolo,
            compostos = compostos.map { it.cid.toString() }, composto = compostos.firstOrNull()?.cid?.toString(), compostoNome = compostos.firstOrNull()?.nome,
            formulas = formulasTexto, formula = formulasTexto.firstOrNull() ?: compostos.firstOrNull { it.via == "formula" }?.texto,
            propriedades = props.map { it.id }, propriedade = props.firstOrNull()?.id
        )
        val nEnt = p.elementos.size + p.compostos.size + p.formulas.size
        val tem = nEnt > 0
        fun fim(intent: Intent, extra: (ParsedQuery) -> ParsedQuery = { it }): ParsedQuery = extra(p.copy(intent = intent))

        // 2) conversa e meta (uma saudação cujo único "nome" veio de aproximação por erro de digitação continua saudação)
        val todos = ents.elementos + ents.compostos + ents.formulas
        val soAproximado = todos.isNotEmpty() && todos.all { it.via == "aproximado" }
        if (i("saudacao") && (!tem || soAproximado)) return fim(Intent.AJUDA)
        if (i("sobreDados")) return fim(Intent.SOBRE_DADOS)
        if (i("fontes") && !tem) return fim(Intent.FONTES)
        if (i("ajuda")) return fim(Intent.AJUDA)

        // 3) equação química
        if (equacao != null || i("balancear")) {
            val querCalcular = temQuant && pista("querCalcular")
            if (equacao != null && querCalcular) return fim(Intent.ESTEQUIOMETRIA) { it.copy(equacao = equacao) }
            return fim(Intent.BALANCEAR) { it.copy(equacao = equacao) }
        }

        // 4) conversão de unidades (duas unidades de uma mesma grandeza, ou "converter X para Y")
        val unidadesLidas = quant.filter { it.unidade != null }
        val textoCompacto = Regex("""^(.*\d)\s+""").replace(original.trim(), "$1 ").trim()
        val paraUnidade: String? = lex.paraUnidade.find(textoCompacto)?.let { Quantidades.lerUnidade(it.groupValues[1], unidades, lex) }
        val quantosUnidade = lex.quantosUnidade.find(Texto.semAcentos(original))
        // "para litros e metros cúbicos", "para atm, kPa e torr": um ou vários destinos (o primeiro é o unidadeDestino)
        val destinos = Quantidades.lerDestinos(original, unidades, lex)
        if (!tem || p.formulas.isEmpty() || temQuant) {
            val temConv = i("conversao") || quantosUnidade != null || lex.pista("conversaoPreposicoes").containsMatchIn(original)
            if (unidadesLidas.isNotEmpty() && temConv && !i("ph") && !i("gas") && !i("concentracao") && !i("estequiometria") && !i("massaMolar")) {
                var destino = if (quantosUnidade != null) Quantidades.lerUnidade(quantosUnidade.groupValues[1], unidades, lex) else paraUnidade ?: destinos.firstOrNull()
                if (destino == null && unidadesLidas.size >= 2) destino = unidadesLidas.last().unidade
                val origem = unidadesLidas.first().unidade
                if (destino != null && origem != null && destino != origem && unidades.buscar(origem) != null) {
                    val unidadesDestino = if (destinos.size > 1 && destinos[0] == destino) destinos.filter { u -> u != origem } else emptyList()
                    return fim(Intent.CONVERSAO_UNIDADE) { it.copy(unidadeDestino = destino, unidadesDestino = unidadesDestino, quantidades = listOfNotNull(unidadesLidas.first().let { q -> q.unidade?.let { u -> Quantidade(q.valor, u, q.texto) } })) }
                }
            }
        }

        // 5) cálculos
        val temKaKb = constantes.isNotEmpty()
        if (i("ph")) {
            if (temQuant || temKaKb || tem || pista("phContexto")) {
                if (temQuant || temKaKb) return fim(Intent.PH)
                if (pista("conector") && tem) return fim(Intent.PH)   // "pH da água" (sem concentração): a resposta pede os dados
            }
            return fim(Intent.CONCEITO) { it.copy(conceito = "ph") }
        }
        val gasPorVariaveis = i("gasVariavel") && unidadesLidas.any { it.unidade in UNIDADES_DE_GAS } && pista("gasGrandezas")
        if (i("gas") || RX_PV_NRT.containsMatchIn(original) || gasPorVariaveis) {
            if (pista("prefixoExplicacao") && !temQuant) return fim(Intent.CONCEITO) { it.copy(conceito = "gas ideal") }
            return fim(Intent.GAS_IDEAL)
        }
        if (i("concentracao") && (temQuant || pista("concentracaoForte")) && !pista("prefixoExplicacaoPalavra")) return fim(Intent.CONCENTRACAO)
        if (i("estequiometria") && (temQuant || tem) && !pista("prefixoDefinicao")) {
            // com várias substâncias, a primeira é a que recebe a quantidade ("16 g de metano" em "quantos gramas de CO2 se formam de 16 g de metano")
            val ligado = compostoLigadoAQuantidade(original, quant, d, p.compostos, lex)
            return fim(Intent.ESTEQUIOMETRIA) {
                if (ligado == null) it.copy(equacao = equacao)
                else it.copy(equacao = equacao, composto = ligado, compostos = listOf(ligado) + it.compostos.filter { c -> c != ligado })
            }
        }
        if (i("massaMolar") && !pista("prefixoDefinicao")) return fim(Intent.MASSA_MOLAR)
        // estequiometria sem "quantos": uma quantidade de massa, mols ou volume + substância citada + verbo de reação ("formada a partir de 2 g
        // de hidrogênio", "reage com 10 g de Cu2S") ou pedido de massa/mols/volume ("massa de meio mol de NaCl")
        val quantEsteq = unidadesLidas.any { q -> GRANDEZAS_ESTEQUIOMETRIA.any { g -> unidades.buscar(q.unidade!!, g) != null } }
        if (tem && quantEsteq && (pista("reacaoVerbo") || pista("pedidoQuantidade")) && !pista("prefixoDefinicao")) {
            val ligado = compostoLigadoAQuantidade(original, quant, d, p.compostos, lex)
            return fim(Intent.ESTEQUIOMETRIA) {
                if (ligado == null) it.copy(equacao = equacao)
                else it.copy(equacao = equacao, composto = ligado, compostos = listOf(ligado) + it.compostos.filter { c -> c != ligado })
            }
        }

        // 6) representação, comparação, segurança, nomenclatura
        if (i("comparar") && p.compostos.size + p.elementos.size + p.formulas.size >= 2) {
            // "ordem crescente de número atômico", "qual tem maior raio": a ordem pedida e, sem propriedade citada, a do extremo ("qual é mais denso")
            val extremoCmp = lex.extremos.firstOrNull { it.first.containsMatchIn(n) }?.second
            val ordem = when {
                pista("ordemDecrescente") -> "decrescente"
                pista("ordemCrescente") -> "crescente"
                extremoCmp != null -> if (extremoCmp.second == "max") "decrescente" else "crescente"
                else -> null
            }
            return fim(Intent.COMPARAR) { it.copy(ordem = ordem, propriedade = p.propriedade ?: if (ordem != null && extremoCmp != null) extremoCmp.first else null) }
        }
        if (i("desenhar") && (p.compostos.isNotEmpty() || p.formulas.isNotEmpty()) && !pista("propriedadesPalavra")) return fim(Intent.DESENHAR)
        // "a água mineral é pura ou mistura?", "classifique em substâncias e misturas": a mistura como CONCEITO, não o aviso de mistura perigosa.
        // Vale quando a palavra "mistura" (`pistas.misturaTema`) vem com uma pista de classificação (`pistas.misturaConceito`) e, sem ela, nada
        // na pergunta fala de perigo nem de misturar X com Y ("misturar água sanitária com amoníaco" e "essa mistura é tóxica?" continuam SEGURANCA)
        val temaMistura = lex.pista("misturaTema").find(n)
        if (temaMistura != null && pista("misturaConceito")) {
            val resto = lex.pista("misturaTema").replace(n, " ")
            if (!lex.intencao("seguranca").containsMatchIn(resto) && !lex.pista("mistura").containsMatchIn(resto)) {
                return fim(Intent.CONCEITO) { it.copy(conceito = temaMistura.groupValues[1]) }
            }
        }
        if (i("seguranca")) return fim(Intent.SEGURANCA) { it.copy(mistura = pista("mistura")) }
        if (i("nomenclatura") && (p.compostos.isNotEmpty() || p.formulas.isNotEmpty())) return fim(Intent.NOMENCLATURA)
        // "como se chama o 2-cloro-butano?", "nomeie este composto orgânico": o pedido de nome (`pistas.nomenclaturaPedido`) sobre um composto
        // (`pistas.nomenclaturaAlvo`: "composto", "molécula" ou nome com raiz orgânica; ou uma fórmula/composto citado) é NOMENCLATURA mesmo sem composto do pacote (a resposta
        // diz que não o encontrou); pergunta de elemento ou de outra propriedade (que não o próprio nome IUPAC) não entra
        val soPropriedadeDeNome = p.propriedades.all { it in PROPRIEDADES_DE_NOME }
        if (pista("nomenclaturaPedido") && (pista("nomenclaturaAlvo") || p.formulas.isNotEmpty() || p.compostos.isNotEmpty()) && p.elementos.isEmpty() && soPropriedadeDeNome && !pista("elementoPalavra")) return fim(Intent.NOMENCLATURA)

        // 7) tabela periódica
        val grupo = lex.pista("grupo").find(n)
        val periodo = lex.pista("periodo").find(n)
        val bloco = lex.pista("bloco").find(n)?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }
        val categoria = lex.categorias.firstOrNull { it.first.containsMatchIn(n) }?.second
        val estado = lex.estados.firstOrNull { it.first.containsMatchIn(n) }?.second
        val extremo = lex.extremos.firstOrNull { it.first.containsMatchIn(n) }?.second
        val tendencia = pista("tendencia")
        val filtroTabela = grupo != null || periodo != null || bloco != null || categoria != null || extremo != null || tendencia || pista("tabelaPalavra")
        if (filtroTabela && !(p.propriedade != null && nEnt > 0 && grupo == null && periodo == null && bloco == null && !tendencia)) {
            val naoEhFiltroPuro = nEnt > 0 && categoria == "metal" && grupo == null && periodo == null
            if (!naoEhFiltroPuro) {
                return fim(Intent.TABELA_PERIODICA) {
                    it.copy(
                        grupo = grupoDe(grupo), periodo = grupoDe(periodo), bloco = bloco, categoria = categoria,
                        estado = if (pista("elementoPalavra") || categoria != null) estado else null, extremo = extremo, tendencia = tendencia,
                        propriedade = p.propriedade ?: extremo?.first
                    )
                }
            }
        }
        if (estado != null && pista("elementoPalavra") && nEnt == 0) return fim(Intent.TABELA_PERIODICA) { it.copy(estado = estado) }

        // 8) propriedades e perfis
        if (p.propriedade != null && tem) {
            // escopos (DATA_CONTRACT §3.1): fusão, ebulição, densidade e estado valem para elemento E composto; propriedade de composto
            // com um elemento citado prefere o composto
            val alvos = props.flatMap { it.escopos }.toSet()
            return fim(Intent.PROPRIEDADE) { it.copy(alvoPropriedade = if ("composto" in alvos && p.compostos.isNotEmpty()) "composto" else if (p.elementos.isNotEmpty()) "elemento" else "composto") }
        }
        val cue = i("conceitoCue")
        if (p.propriedade != null && !tem && cue) return fim(Intent.CONCEITO) { it.copy(conceito = conceitoDe(n, lex)) }
        if (p.propriedade != null && !tem) {
            if (contexto != null && (contexto.elemento != null || contexto.composto != null)) {
                return fim(Intent.PROPRIEDADE) {
                    it.copy(elemento = contexto.elemento, elementos = contexto.elementos, composto = contexto.composto, compostos = contexto.compostos, compostoNome = contexto.compostoNome, herdado = true)
                }
            }
            return fim(Intent.PROPRIEDADE)
        }
        // "o que é um sal?": a classe (CONCEITO), não a ficha do composto do apelido; o composto fica em p.composto como sugestão de ficha.
        // "ponto de fusão do sal", "massa molar do sal", "o sal é perigoso?" continuam no composto (regras acima).
        val classe = if (cue && tem) classeGenerica(compostos, p, n, d, lex) else null
        if (classe != null) return fim(Intent.CONCEITO) { it.copy(conceito = classe) }
        if (tem) {
            // "e do ferro?" / "and gold?" depois de uma pergunta de propriedade
            if (pista("continuacao") && n.split(' ').size <= 5 && contexto?.propriedade != null && contexto.intent == Intent.PROPRIEDADE) {
                return fim(Intent.PROPRIEDADE) { it.copy(propriedade = contexto.propriedade, propriedades = contexto.propriedades.ifEmpty { listOf(contexto.propriedade) }, herdado = true) }
            }
            if (p.compostos.isNotEmpty() || p.formulas.isNotEmpty()) {
                if (p.elementos.isNotEmpty() && p.compostos.isEmpty() && p.formulas.isEmpty()) return fim(Intent.ELEMENTO)
                return fim(Intent.COMPOSTO)
            }
            return fim(Intent.ELEMENTO)
        }

        // 9) conceito
        if (cue || i("conceitoTemas")) {
            val conceito = conceitoDe(n, lex)
            if (conceito.isNotEmpty()) return fim(Intent.CONCEITO) { it.copy(conceito = conceito) }
        }
        return p
    }

    private val RX_PV_NRT = Regex("""pv\s*=\s*nrt""", RegexOption.IGNORE_CASE)
    private val UNIDADES_DE_GAS = setOf("atm", "Pa", "kPa", "mmHg", "Torr", "bar", "K", "°C")
    /** Grandezas (grupos de regras.unidades) de uma quantidade de estequiometria: massa, quantidade de matéria e volume. */
    private val GRANDEZAS_ESTEQUIOMETRIA = listOf("massa", "quantidade", "volume")
    /** Propriedades (ids de regras.propriedades) que são o próprio nome: "nome IUPAC de X" num pedido de nomenclatura não é pergunta de propriedade. */
    private val PROPRIEDADES_DE_NOME = setOf("nomeIupac")

    /** Número do primeiro grupo de captura que casou (as pistas `grupo`/`periodo` de alguns idiomas têm alternativas com grupos diferentes). */
    private fun grupoDe(m: MatchResult?): Int? = m?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }?.toIntOrNull()

    /**
     * Assunto de CONCEITO exatamente como o site (`limparConceito` de nlu.js): tira o gatilho e aplica UMA vez cada padrão de limpeza do
     * léxico, SEM aparar o espaço que o gatilho deixa — por isso, como no site, o artigo fica em "o que é a massa molar" ("a massa molar") e
     * "explique o que é massa molar" vira "o que e massa molar". O contrato (ParsedQuery) é igual nos dois clientes; quem procura o texto
     * usa [temaDoConceito], que limpa de verdade.
     */
    internal fun conceitoDe(n: String, lex: Lexico): String {
        var s = n.replaceFirst(lex.intencao("conceitoCue"), "")
        for (rx in lex.limparConceito) s = s.replaceFirst(rx, "")
        return s.trim()
    }

    /**
     * Tema "limpo" para procurar o trecho licenciado: repete gatilho + limpeza do léxico até estabilizar ("o que e massa molar" → "massa molar";
     * "a massa molar" → "massa molar"; "what molar mass is" → "molar mass is"). Só a busca de texto usa; o ParsedQuery guarda [conceitoDe].
     */
    fun temaDoConceito(conceito: String, lex: Lexico): String {
        var s = Texto.nlu(conceito).trim()
        repeat(4) {
            var t = s.replaceFirst(lex.intencao("conceitoCue"), "").trim()
            for (rx in lex.limparConceito) t = t.replaceFirst(rx, "").trim()
            if (t == s || t.isEmpty()) return if (t.isEmpty()) s else t
            s = t
        }
        return s
    }

    /**
     * "o que é um sal?" / "what is sugar?": a pergunta é só o gatilho de conceito + UM nome de classe de compostos que o pacote também usa como
     * apelido de um composto (sal → NaCl, açúcar → sacarose). Devolve o tema (a chave casada) ou null. Espelho de `classeGenerica` do site.
     */
    private fun classeGenerica(compostos: List<Achado>, p: ParsedQuery, n: String, d: Dicionario, lex: Lexico): String? {
        if (compostos.size != 1 || p.elementos.isNotEmpty() || p.formulas.isNotEmpty()) return null
        val c = compostos[0]
        val chave = c.chave ?: return null
        if (c.via != "nome" || !d.ehClasseDeCompostos(chave)) return null
        return if (temaDoConceito(n, lex) == chave) chave else null
    }

    /** Composto citado logo depois de uma quantidade ("16 g de metano"): é a substância à qual a quantidade se refere. */
    private fun compostoLigadoAQuantidade(original: String, quant: List<QuantidadeLida>, d: Dicionario, cids: List<String>, lex: Lexico): String? {
        if (cids.size < 2) return null
        val sem = Texto.semAcentos(original).lowercase()
        for (q in quant) {
            if (q.unidade == null || q.unidade == "%") continue
            val resto = sem.substring(minOf(q.faixa.last + 1, sem.length)).trimStart(' ', ',', ':')
                .replace(Regex("""^${lex.ligacaoPreposicoes}\s+"""), "")
            for (cid in cids) {
                if (d.nomesEFormulaDe(cid.toLong()).any { resto.startsWith(it) }) return cid
            }
        }
        return null
    }

    /**
     * Variante para conversa: se a pergunta não traz entidade (ex.: "e o ponto de ebulição?"), herda a do contexto.
     * O parse já trata a continuação quando há propriedade; aqui só se completa o que faltou.
     */
    fun parseComContexto(pergunta: String, d: Dicionario, contexto: ParsedQuery?): ParsedQuery = parse(pergunta, d, contexto, d.lexico)

    /** Palavras da pergunta úteis para recuperar trechos de texto (sem artigos nem verbos de pedido do idioma). */
    fun termosDeBusca(texto: String, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<String> =
        Texto.nlu(texto).split(' ').filter { it.length >= 2 && it !in lex.stopwordsBusca }
}
