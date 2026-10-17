package net.saibatudo.quimica.ai.nlu

import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.Unidades

/** Quantidade "valor + unidade" lida de uma pergunta; [unidade] é nula quando o texto depois do número não é uma unidade. */
data class QuantidadeLida(val valor: Double, val unidade: String?, val texto: String, val faixa: IntRange)

/** Concentração entre colchetes ("[N2] = 0,5 mol/L"): espécie como foi escrita, valor, unidade (ou null) e o trecho [inicio, fim). */
data class ConcentracaoLida(val especie: String, val valor: Double, val unidade: String?, val inicio: Int, val fim: Int)

/**
 * Leitura de números e de quantidades com unidade (espelha lerNumero/lerQuantidades/lerUnidade do site). Os nomes de unidade por extenso
 * vêm do léxico do idioma (contracts/lexico/<idioma>.json, `unidades`); os números aceitam vírgula e ponto em qualquer idioma (I18N §1.3).
 */
object Quantidades {

    /** Símbolo de unidade, com o expoente em dígito no fim ("dm3", "cm3", "m-3" = dm³, cm³, m⁻³). */
    private val RX_SO_SIMBOLO = Regex("""^[A-Za-zµμ°º/³²⁻¹·.-]+(?:-?[1-3])?$""")

    /** Interpreta uma unidade escrita (símbolo ou nome por extenso no idioma do léxico): devolve o símbolo ou null. */
    fun lerUnidade(texto: String?, un: Unidades?, lex: Lexico = Lexico.de(Idiomas.PADRAO)): String? {
        val bruto = (texto ?: "").trim().trimEnd('.', ',', ';', ':', '!', '?')
        if (bruto.isEmpty()) return null
        if (bruto == "%") return "%"
        val n = Texto.nlu(bruto)
        for ((rx, sim) in lex.unidades) if (rx.containsMatchIn(n)) return sim
        if (RX_SO_SIMBOLO.matches(bruto) && un != null) {
            val limpo = bruto.replace('·', '/').replace(Regex("/+"), "/")
            un.buscar(limpo)?.let { return it.simbolo }
        }
        return null
    }

    private val DIGITO_SOBRESCRITO = mapOf('⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4', '⁵' to '5', '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9', '⁻' to '-')
    private val RX_EXPOENTE_SOBRESCRITO = Regex("""10\s*(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)""")
    private val RX_INTEIRO_GRUPO_PONTO = Regex("""^\d{1,3}(\.\d{3})+$""")
    private val RX_INTEIRO_GRUPO_VIRGULA = Regex("""^\d{1,3}(,\d{3})+$""")
    private val RX_CORPO = Regex("""^([+-]?)([\d.,]+)(e[+-]?\d+)?$""", RegexOption.IGNORE_CASE)

    /**
     * Número escrito com vírgula ou ponto ("1.234,5", "1,234.5", "0,01", "0.01", "6,02 x 10^23", "1,8e-5"); null se não for número.
     * Heurística (docs/I18N.md §1.3, igual a formato.js do site): com "," e "." no mesmo número, o último é o decimal; com só um deles,
     * vale o do idioma — "1.000" é mil em pt/es/de/fr e 1,0 em inglês; "1,000" é mil em inglês. Grupos de três após vários separadores = milhar.
     */
    fun lerNumero(entrada: String?, idioma: String = Idiomas.PADRAO): Double? {
        var s = (entrada ?: "").trim().replace(Regex("""\s+"""), " ").replace('−', '-')
        if (s.isEmpty()) return null
        // notação dos livros: "1,2 × 10²³" (expoente sobrescrito), "1.2 × 10**23", "6,02.10^23" (ponto como "vezes"), como lerNumero do site
        s = (RX_EXPOENTE_SOBRESCRITO.find(s)?.let { m -> s.replaceRange(m.range, "10^" + m.groupValues[1].map { c -> DIGITO_SOBRESCRITO[c] ?: c }.joinToString("")) } ?: s).replace("**", "^")
        s = Regex("""\s*(?:[x×*·]\s*10\s*\^?|\.10\s*\^)\s*\{?(-?\d+)\}?""", RegexOption.IGNORE_CASE).replaceFirst(s, "e$1")
        s = Regex("""^10\s*\^\s*\{?(-?\d+)\}?$""").replace(s) { "1e" + it.groupValues[1] }
        s = s.replace(Regex("""[\s  ]"""), "")
        val m = RX_CORPO.matchEntire(s) ?: return null
        val sinal = m.groupValues[1]
        val corpo = m.groupValues[2]
        val exp = m.groupValues[3]
        if (!corpo[0].isDigit() && !(corpo.length >= 2 && (corpo[0] == '.' || corpo[0] == ',') && corpo[1].isDigit())) return null
        val temV = ',' in corpo
        val temP = '.' in corpo
        val numero: String = when {
            temV && temP -> {
                val dec = if (corpo.lastIndexOf(',') > corpo.lastIndexOf('.')) ',' else '.'
                val partes = corpo.split(dec)
                if (partes.size > 2) return null
                val int = partes[0]
                val frac = partes.getOrElse(1) { "" }
                val grupoOk = if (dec == ',') RX_INTEIRO_GRUPO_PONTO.matches(int) else RX_INTEIRO_GRUPO_VIRGULA.matches(int)
                if (!grupoOk || frac.contains('.') || frac.contains(',')) return null
                int.replace(if (dec == ',') "." else ",", "") + "." + frac
            }
            temV || temP -> {
                val sep = if (temV) ',' else '.'
                val partes = corpo.split(sep)
                when {
                    partes.size > 2 -> {
                        if (!Regex("""^\d{1,3}$""").matches(partes[0]) || !partes.drop(1).all { Regex("""^\d{3}$""").matches(it) }) return null
                        partes.joinToString("")
                    }
                    sep != Idiomas.separadorDecimal(idioma) && Regex("""^[1-9]\d{0,2}$""").matches(partes[0]) && Regex("""^\d{3}$""").matches(partes[1]) ->
                        partes.joinToString("")   // separador de milhar do idioma: "1.000" (pt) = 1000; "1,000" (en) = 1000; "0,500" é sempre 0,5
                    else -> partes[0].ifEmpty { "0" } + "." + partes[1]
                }
            }
            else -> corpo
        }
        return "$sinal$numero$exp".toDoubleOrNull()?.takeIf { it.isFinite() }
    }

    /**
     * Número: inteiro com grupos ("1.000.000"), decimal com vírgula ou ponto e notação científica ("2,5 x 10^-3", "1,2 × 10²³", "1,2·10^23",
     * "6,02.10^23", "1.2 × 10**23", "1.8e-5"); quem decide o valor é [lerNumero]. Um ".10^" depois da mantissa é o "vezes", não a casa decimal.
     */
    internal const val NUM = """(\d+(?:[.,](?!10\s*(?:\^|\*\*))\d+)*(?:\s*(?:[x×*·]\s*10\s*(?:(?:\^|\*\*)?\s*\{?[-−]?\d+\}?|⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)|\.10\s*(?:\^|\*\*)\s*\{?[-−]?\d+\}?|e[+-]?\d+))?)"""
    /** Fração com barra ("1/2 mol") ou caractere de fração ("½ mol"): vem antes do número comum, senão "1/2" viraria "1" e "2 mol". */
    private const val FRACAO = """\d+\s?/\s?[1-9]\d*|[½¼¾]"""
    private val FRACOES_UNICODE = mapOf("½" to 0.5, "¼" to 0.25, "¾" to 0.75)
    private val RX_FRACAO = Regex("""^(\d+)\s?/\s?(\d+)$""")

    /** Valor de um número lido: fração ("1/2", "½") ou número com vírgula/ponto ([lerNumero]). */
    private fun valorDoNumero(s: String, idioma: String): Double? {
        FRACOES_UNICODE[s]?.let { return it }
        RX_FRACAO.matchEntire(s)?.let { f ->
            val den = f.groupValues[2].toDouble()
            return if (den == 0.0) null else f.groupValues[1].toDouble() / den
        }
        return lerNumero(s, idioma)
    }

    /** Os padrões de quantidade de um idioma: com algarismos, com numeral por extenso do léxico, e cada numeral com o seu valor. */
    private class Padroes(val digitos: Regex, val extenso: Regex?, val numerais: List<Pair<Regex, Double>>)
    private val cacheQuant = java.util.concurrent.ConcurrentHashMap<String, Padroes>()

    /**
     * Unidade logo depois do número: símbolo (com o expoente em dígito, "3,5 dm3"), °C, % ou nome por extenso com até duas palavras
     * ("mol por litro", "degrees celsius"); a palavra vai inteira, com acentos: "10 años" não vira "10 a" (Å) e "2 atmósferas" é lida pelo léxico.
     */
    private fun unidadeRx(lex: Lexico): String {
        val l = lex.letrasUnidade
        return """(°\s*[CF]|º\s*[CF]|%|[\p{L}µμ°º][\p{L}µμ°º/³²⁻¹·.-]*(?:-?[1-3](?![\d.,]?\d))?(?:\s+${lex.quantidadeComplemento}\s+[$l]+)?(?:\s+[$l]+)?)"""
    }

    /** Quantidade + unidade (número, fração ou numeral por extenso do léxico: "meio mol", "two moles"). */
    private fun padroes(lex: Lexico): Padroes = cacheQuant.getOrPut(lex.idioma) {
        val inteiro = NUM.substring(1, NUM.length - 1)
        val palavras = lex.numerais.joinToString("|") { "(?:${it.first})" }
        Padroes(
            digitos = Regex("""(?<![A-Za-z(\[)\]^_\-.,\d])($FRACAO|$inteiro)\s*${unidadeRx(lex)}?"""),
            // aplicado ao texto em minúsculas e sem acentos (mesmo comprimento do original): "Meio mol", "três mols", "une demi-mole"
            extenso = if (palavras.isEmpty()) null else Regex("""(?<![A-Za-z\d])($palavras)[\s-]+${unidadeRx(lex)}"""),
            numerais = lex.numerais.map { (src, v) -> Regex("^(?:$src)$") to v }
        )
    }

    /** Minúsculas sem acento, caractere a caractere: o texto continua com o MESMO comprimento (as posições valem no original). */
    internal fun dobrarMesmoComprimento(s: String): String {
        val sb = StringBuilder(s.length)
        for (c in s) {
            val d = Texto.semAcentos(c.toString()).lowercase(java.util.Locale.ROOT)
            sb.append(if (d.length == 1) d[0] else c)
        }
        return sb.toString()
    }

    /** A unidade no começo de [trecho] (até três palavras): (símbolo, texto usado, fim do texto usado relativo ao trecho) ou null. */
    private fun unidadeNoInicio(trecho: String, un: Unidades?, lex: Lexico): Triple<String, String, Int>? {
        if (trecho.isBlank()) return null
        val tokens = Regex("""\S+""").findAll(trecho).toList()
        var k = minOf(tokens.size, 3)
        while (k >= 1) {
            val frase = tokens.take(k).joinToString(" ") { it.value }
            lerUnidade(frase.replace(Regex("""^°\s*"""), "°"), un, lex)?.let { return Triple(it, frase, tokens[k - 1].range.last + 1) }
            k--
        }
        return null
    }

    /** Quantidades com unidade encontradas no texto, na ordem; [QuantidadeLida.unidade] nula quando não reconhecida. */
    fun ler(texto: String, un: Unidades?, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<QuantidadeLida> {
        val out = mutableListOf<QuantidadeLida>()
        val pd = padroes(lex)
        for (m in pd.digitos.findAll(texto)) {
            val valor = valorDoNumero(m.groupValues[1], lex.idioma) ?: continue
            var fim = m.groups[1]!!.range.last + 1
            val g2 = m.groups[2]
            val achada = if (g2 != null && g2.value.isNotBlank()) unidadeNoInicio(g2.value, un, lex) else null
            if (achada != null) fim = g2!!.range.first + achada.third
            val usado = achada?.second.orEmpty()
            out += QuantidadeLida(valor, achada?.first, ("${m.groupValues[1]}${if (usado.isNotEmpty()) " $usado" else ""}").trim(), m.range.first until maxOf(fim, m.range.first + 1))
        }
        // numeral por extenso ("meio mol", "half a mole", "zwei Mol"): só conta com unidade reconhecida (senão "um elemento" seria quantidade)
        if (pd.extenso != null) {
            for (m in pd.extenso.findAll(dobrarMesmoComprimento(texto))) {
                val g1 = m.groups[1]!!
                val g2 = m.groups[2] ?: continue
                val achada = unidadeNoInicio(texto.substring(g2.range.first, g2.range.last + 1), un, lex) ?: continue
                if (achada.first == "%") continue
                val valor = pd.numerais.firstOrNull { it.first.matches(g1.value) }?.second ?: continue
                out += QuantidadeLida(valor, achada.first, "${texto.substring(g1.range.first, g1.range.last + 1)} ${achada.second}", m.range.first until g2.range.first + achada.third)
            }
        }
        return out.sortedBy { it.faixa.first }
    }

    /**
     * Unidades de destino de uma conversão escritas no fim da pergunta, depois de uma preposição do léxico (`pistas.paraUnidades`): uma ou
     * várias, separadas por vírgula ou por conectivo (`pistas.conectivoLista`): "para litros e metros cúbicos" → [L, m3]; "para atm, kPa e
     * torr" → [atm, kPa, Torr]. Todas as partes têm de ser unidades; `pistas.paraUnidadesFim` tira o resto (pontuação, "umrechnen").
     * Lista vazia quando não acha. Espelho de `lerDestinos` do site (nlu.js).
     */
    fun lerDestinos(texto: String, un: Unidades?, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<String> {
        val dobrado = dobrarMesmoComprimento(texto)
        val prep = lex.pista("paraUnidades")
        val fim = lex.pista("paraUnidadesFim")
        val conectivo = lex.pista("conectivoLista")
        // "en litres et en mètres cubes", "e para m³": a preposição repetida no começo de uma parte não conta
        fun semPreposicao(x: String): String {
            val mp = prep.find(dobrarMesmoComprimento(x))
            return if (mp != null && mp.range.first == 0) x.substring(mp.range.last + 1).trim() else x
        }
        for (m in prep.findAll(dobrado)) {
            val ini = m.range.last + 1
            val caudaD = dobrado.substring(ini)
            val corte = fim.find(caudaD)?.range?.first ?: caudaD.length
            val cauda = texto.substring(ini, ini + corte)
            val partes = mutableListOf(mutableListOf<String>())
            for (tok in cauda.replace(",", " , ").split(Regex("""\s+""")).filter { it.isNotEmpty() }) {
                if (tok == "," || conectivo.containsMatchIn(Texto.nlu(tok))) partes += mutableListOf<String>()
                else partes.last() += tok
            }
            val textos = partes.filter { it.isNotEmpty() }.map { semPreposicao(it.joinToString(" ")) }.filter { it.isNotEmpty() }
            if (textos.isEmpty() || textos.any { it.split(' ').size > 3 }) continue
            val lidas = textos.map { lerUnidade(it.replace(Regex("""^°\s*"""), "°"), un, lex) }
            if (lidas.all { it != null && it != "%" }) return lidas.filterNotNull().distinct()
        }
        return emptyList()
    }

    private val cacheColchete = java.util.concurrent.ConcurrentHashMap<String, Regex>()

    /** "[N2] = 0,5 mol/L", "[H2] é 1,5 mol/L": a espécie entre colchetes, o conector do léxico (`pistas.concentracaoColchete`) e o número. */
    private fun rxColchete(lex: Lexico): Regex = cacheColchete.getOrPut(lex.idioma) {
        Regex("""\[\s*([^\[\]\s]{1,24})\s*]\s*(?:${lex.pista("concentracaoColchete").pattern})\s*$NUM""")
    }

    /**
     * Concentrações escritas com colchetes, na ordem (docs/CALCULADORAS_2026-10-17.md §1): a espécie com a caixa original, o valor, a unidade
     * (ou null) e o trecho que ocupam (o fim inclui a unidade). Espelho de `lerConcentracoes` do site (nlu.js).
     */
    fun lerConcentracoes(texto: String, un: Unidades?, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<ConcentracaoLida> {
        val dobrado = dobrarMesmoComprimento(texto)
        val out = mutableListOf<ConcentracaoLida>()
        for (m in rxColchete(lex).findAll(dobrado)) {
            val gEsp = m.groups[1]!!
            val gNum = m.groups[2]!!
            val valor = lerNumero(texto.substring(gNum.range.first, gNum.range.last + 1), lex.idioma) ?: continue
            val fimMatch = m.range.last + 1
            val achada = unidadeNoInicio(texto.substring(fimMatch), un, lex)
            out += ConcentracaoLida(texto.substring(gEsp.range.first, gEsp.range.last + 1), valor, achada?.first, m.range.first, fimMatch + (achada?.third ?: 0))
        }
        return out
    }

    /** Constantes de equilíbrio citadas ("Ka 1,8e-5", "pKa = 4,76"); o padrão vem do léxico (`pistas.constantes`). */
    fun lerConstantes(original: String, lex: Lexico = Lexico.de(Idiomas.PADRAO)): Map<String, Double> {
        val out = LinkedHashMap<String, Double>()
        for (m in lex.constantes.findAll(original)) {
            val v = lerNumero(m.groupValues[2], lex.idioma) ?: continue
            val nome = when (m.groupValues[1].lowercase()) { "pka" -> "pKa"; "pkb" -> "pKb"; "ka" -> "Ka"; else -> "Kb" }
            out[nome] = v
        }
        return out
    }
}
