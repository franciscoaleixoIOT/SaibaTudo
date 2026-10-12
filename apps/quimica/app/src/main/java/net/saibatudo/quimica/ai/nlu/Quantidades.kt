package net.saibatudo.quimica.ai.nlu

import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.Unidades

/** Quantidade "valor + unidade" lida de uma pergunta; [unidade] é nula quando o texto depois do número não é uma unidade. */
data class QuantidadeLida(val valor: Double, val unidade: String?, val texto: String, val faixa: IntRange)

/**
 * Leitura de números e de quantidades com unidade (espelha lerNumero/lerQuantidades/lerUnidade do site). Os nomes de unidade por extenso
 * vêm do léxico do idioma (contracts/lexico/<idioma>.json, `unidades`); os números aceitam vírgula e ponto em qualquer idioma (I18N §1.3).
 */
object Quantidades {

    private val RX_SO_SIMBOLO = Regex("""^[A-Za-zµμ°º/³²⁻¹·.-]+$""")

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
        s = Regex("""\s*[x×*·]\s*10\s*\^?\s*\{?(-?\d+)\}?""", RegexOption.IGNORE_CASE).replaceFirst(s, "e$1")
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
                    sep != Idiomas.separadorDecimal(idioma) && Regex("""^\d{1,3}$""").matches(partes[0]) && Regex("""^\d{3}$""").matches(partes[1]) ->
                        partes.joinToString("")   // separador de milhar do idioma: "1.000" (pt) = 1000; "1,000" (en) = 1000
                    else -> partes[0].ifEmpty { "0" } + "." + partes[1]
                }
            }
            else -> corpo
        }
        return "$sinal$numero$exp".toDoubleOrNull()?.takeIf { it.isFinite() }
    }

    /** Número: inteiro com grupos ("1.000.000"), decimal com vírgula ou ponto e notação científica; quem decide é [lerNumero]. */
    internal const val NUM = """(\d+(?:[.,]\d+)*(?:\s*(?:[x×*]\s*10\s*\^?\s*\{?-?\d+\}?|e[+-]?\d+))?)"""
    private val cacheQuant = java.util.concurrent.ConcurrentHashMap<String, Regex>()

    /** Quantidade + unidade (símbolo, °C, % ou nome por extenso com até duas palavras: "mol por litro", "degrees celsius"). */
    private fun rxQuant(lex: Lexico): Regex = cacheQuant.getOrPut(lex.idioma) {
        val l = lex.letrasUnidade
        Regex("""(?<![A-Za-z(\[)\]^_\-.,\d])$NUM\s*(°\s*[CF]|º\s*[CF]|%|[A-Za-zµμ°º][A-Za-zµμ°º/³²⁻¹·.-]*(?:\s+${lex.quantidadeComplemento}\s+[$l]+)?(?:\s+[$l]+)?)?""")
    }

    /** Quantidades com unidade encontradas no texto, na ordem; [unidade] nula quando não reconhecida. */
    fun ler(texto: String, un: Unidades?, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<QuantidadeLida> {
        val out = mutableListOf<QuantidadeLida>()
        for (m in rxQuant(lex).findAll(texto)) {
            val valor = lerNumero(m.groupValues[1], lex.idioma) ?: continue
            var unidade: String? = null
            var usado = ""
            var fim = m.groups[1]!!.range.last + 1
            val g2 = m.groups[2]
            if (g2 != null && g2.value.isNotBlank()) {
                val tokens = Regex("""\S+""").findAll(g2.value).toList()
                var k = minOf(tokens.size, 3)
                while (k >= 1 && unidade == null) {
                    val frase = tokens.take(k).joinToString(" ") { it.value }
                    unidade = lerUnidade(frase.replace(Regex("""^°\s*"""), "°"), un, lex)
                    if (unidade != null) {
                        usado = frase
                        fim = g2.range.first + tokens[k - 1].range.last + 1
                    }
                    k--
                }
            }
            out += QuantidadeLida(valor, unidade, ("${m.groupValues[1]}${if (usado.isNotEmpty()) " $usado" else ""}").trim(), m.range.first until maxOf(fim, m.range.first + 1))
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
