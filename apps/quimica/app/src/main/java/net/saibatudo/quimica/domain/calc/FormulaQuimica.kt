package net.saibatudo.quimica.domain.calc

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.domain.Textos
import java.text.Normalizer

/**
 * Erro de entrada de cálculo. A mensagem é um recurso de `strings.xml` mais os argumentos: o texto sai no idioma de quem a mostra
 * ([texto]), nunca fixo em quem lançou o erro. Um argumento que seja outro [CalculoInvalido] é resolvido junto (erros aninhados) um [Elemento] vira o nome dele no idioma e uma [GrandezaRef] o nome da grandeza.
 */
class CalculoInvalido(@param:StringRes val id: Int, vararg val args: Any?) : Exception("CalculoInvalido($id)") {
    fun texto(t: Textos): String = t(id, *args.map {
        when (it) {
            is CalculoInvalido -> it.texto(t)
            is Elemento -> t.nomeRotulado(Nomes.elemento(it, t.idioma))   // o nome do elemento no idioma (rotulado se for reserva)
            is GrandezaRef -> t.grandeza(it.id)
            else -> it
        }
    }.toTypedArray())
}

/**
 * Fórmula interpretada: contagem de átomos por símbolo (na ordem em que aparecem), carga líquida, o texto normalizado
 * (sem espaços, "·" nos hidratos, parênteses no lugar de colchetes) e o número de partes (hidrato = 2 ou mais).
 */
data class FormulaAnalisada(
    val contagem: Map<String, Int>,
    val carga: Int,
    val original: String,
    val texto: String = original,
    val partes: Int = 1
) {
    /** "H2O" vira "H₂O"; a carga aparece como sobrescrito. */
    fun exibicao(): String = net.saibatudo.quimica.domain.Texto.formulaUnicode(texto)
    val hidrato: Boolean get() = partes > 1

    /** Um símbolo isolado, sem índice, parte nem carga ("Fe"): é o elemento, não um composto. */
    val ehSimboloSimples: Boolean get() = contagem.size == 1 && contagem.values.first() == 1 && partes == 1 && carga == 0 && !texto.contains('(')

    /** Notação de Hill: C, H, depois ordem alfabética (sem carbono: tudo em ordem alfabética). */
    fun hill(): String {
        val s = contagem.keys.toList()
        val ordem = if ("C" in s) listOf("C") + (if ("H" in s) listOf("H") else emptyList()) + s.filter { it != "C" && it != "H" }.sorted() else s.sorted()
        return ordem.joinToString("") { it + (contagem.getValue(it).takeIf { n -> n > 1 }?.toString() ?: "") }
    }
}

/**
 * Leitura de fórmulas químicas (mesma lógica de web/src/quimica/js/calc/formula.js): elementos (maiúscula + minúscula
 * opcional), índices, parênteses aninhados com multiplicador, hidratos ("CuSO4·5H2O", também com "." ou "*"), subscritos
 * Unicode e carga ("Fe3+", "SO4^2-", "OH-", "NH4+"). Os símbolos aceitos são os 118 da IUPAC, a não ser que a chamada
 * passe outro conjunto.
 *
 * Carga sem "^": um dígito logo antes do sinal é CARGA quando o resto é um único elemento (Fe3+, Cu2+) e SUBSCRITO nos demais
 * casos (NO3-, NH4+); com dois ou mais dígitos, o último é a carga ("SO42-" = SO4 com 2-).
 */
object FormulaQuimica {

    /** Símbolos dos 118 elementos (IUPAC): servem para validar a escrita; as propriedades vêm do pacote de dados. */
    val SIMBOLOS: Set<String> = (
        "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe " +
            "Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
            "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
        ).split(' ').toSet()

    private const val MAX_QUANTIDADE = 100_000L
    private val RX_ESTADO = Regex("""\((?:s|l|g|aq)\)$""", RegexOption.IGNORE_CASE)
    private val SUP = mapOf('⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4', '⁵' to '5', '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9', '⁺' to '+', '⁻' to '-')

    /** Texto limpo: Unicode vira ASCII (carga com "^"), pontos de hidrato viram "·", colchetes viram parênteses, sem espaços nem estado físico. */
    fun normalizarEntrada(texto: String): String {
        var s = Normalizer.normalize(texto, Normalizer.Form.NFC)
        s = Regex("[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+").replace(s) { m -> "^" + m.value.map { SUP.getValue(it) }.joinToString("") }
        s = s.map { c -> if (c in '₀'..'₉') ('0' + (c - '₀')) else c }.joinToString("")
        s = s.replace(Regex("[−–—‒]"), "-").replace('＋', '+')
        s = Regex("[•∙⋅*]").replace(s, "·")
        s = Regex("""(?<=[A-Za-z0-9)\]}])\.(?=[0-9A-Z(\[{])""").replace(s, "·")
        s = s.replace('[', '(').replace('{', '(').replace(']', ')').replace('}', ')')
        s = Regex("""\s+""").replace(s, "")
        s = RX_ESTADO.replace(s, "")
        return s
    }

    /** Separa a carga elétrica do corpo da fórmula. */
    internal fun separarCarga(norm: String): Pair<String, Int> {
        Regex("""\^\{?([+-]?)(\d*)([+-]?)\}?$""").find(norm)?.let { m ->
            if (m.groupValues[1].isNotEmpty() || m.groupValues[3].isNotEmpty()) {
                val sinal = if ((m.groupValues[1].ifEmpty { m.groupValues[3] }) == "-") -1 else 1
                val n = if (m.groupValues[2].isEmpty()) 1 else m.groupValues[2].toInt()
                return norm.substring(0, m.range.first) to sinal * n
            }
        }
        Regex("""([+-])(\d+)$""").find(norm)?.let { m ->
            if (m.range.first > 0) return norm.substring(0, m.range.first) to (if (m.groupValues[1] == "-") -1 else 1) * m.groupValues[2].toInt()
        }
        Regex("""(\d*)([+-]+)$""").find(norm)?.let { m ->
            val run = m.groupValues[1]
            val sinais = m.groupValues[2]
            if (m.range.first + run.length > 0) {
                val antes = norm.substring(0, m.range.first)
                if (sinais.toSet().size > 1) return norm to 0
                val sinal = if (sinais[0] == '-') -1 else 1
                if (sinais.length > 1) return (antes + run) to sinal * sinais.length
                if (run.isEmpty()) return antes to sinal
                if (run.length >= 2) return (antes + run.dropLast(1)) to sinal * run.last().digitToInt()
                if (Regex("^[A-Z][a-z]?$").matches(antes)) return antes to sinal * run.toInt()
                return (antes + run) to sinal
            }
        }
        return norm to 0
    }

    fun analisar(texto: String, simbolosValidos: Set<String>? = null): FormulaAnalisada {
        val simbolos = simbolosValidos ?: SIMBOLOS
        val norm = normalizarEntrada(texto)
        if (norm.isEmpty()) throw CalculoInvalido(R.string.erro_formula_digite)
        val (corpo, carga) = separarCarga(norm)
        if (corpo.isEmpty()) throw CalculoInvalido(R.string.erro_formula_vazia)
        val total = LinkedHashMap<String, Int>()
        var nPartes = 0
        for (bruta in corpo.split('·')) {
            var i = 0
            while (i < bruta.length && bruta[i].isDigit()) i++
            val coef = if (i == 0) 1 else bruta.substring(0, i).toIntOrNull()?.takeIf { it in 1..MAX_QUANTIDADE } ?: throw CalculoInvalido(R.string.erro_coeficiente_invalido, bruta)
            val resto = bruta.substring(i)
            if (resto.isEmpty()) throw CalculoInvalido(R.string.erro_parte_vazia)
            val grupo = Leitor(resto, simbolos).ler()
            if (grupo.isEmpty()) throw CalculoInvalido(R.string.erro_formula_sem_elementos, texto)
            nPartes++
            for ((s, n) in grupo) {
                val novo = total.getOrDefault(s, 0).toLong() + n.toLong() * coef
                if (novo > MAX_QUANTIDADE) throw CalculoInvalido(R.string.erro_atomos_demais, texto)
                total[s] = novo.toInt()
            }
        }
        return FormulaAnalisada(total, carga, texto.trim(), norm, nPartes)
    }

    fun tentar(texto: String, simbolosValidos: Set<String>? = null): FormulaAnalisada? = try {
        analisar(texto, simbolosValidos)
    } catch (_: CalculoInvalido) {
        null
    }

    private class Leitor(val s: String, val simbolos: Set<String>) {
        var i = 0

        fun ler(): LinkedHashMap<String, Int> {
            val r = grupo(aninhado = false)
            return r
        }

        private fun grupo(aninhado: Boolean): LinkedHashMap<String, Int> {
            val atomos = LinkedHashMap<String, Int>()
            while (i < s.length) {
                val c = s[i]
                when {
                    c == ')' -> {
                        if (!aninhado) throw CalculoInvalido(R.string.erro_parentese_fecha_sem_abre)
                        return atomos
                    }
                    c == '(' -> {
                        i++
                        val interno = grupo(aninhado = true)
                        if (i >= s.length || s[i] != ')') throw CalculoInvalido(R.string.erro_parentese_abre_sem_fecha)
                        if (interno.isEmpty()) throw CalculoInvalido(R.string.erro_parenteses_vazios)
                        i++
                        val q = contagem()
                        for ((k, v) in interno) atomos[k] = atomos.getOrDefault(k, 0) + v * q
                    }
                    c in 'A'..'Z' -> {
                        val dois = if (i + 1 < s.length && s[i + 1] in 'a'..'z') "$c${s[i + 1]}" else null
                        val simbolo = when {
                            dois != null && dois in simbolos -> dois
                            c.toString() in simbolos -> c.toString()
                            else -> throw CalculoInvalido(R.string.erro_nao_e_simbolo, dois ?: c)
                        }
                        i += simbolo.length
                        atomos[simbolo] = atomos.getOrDefault(simbolo, 0) + contagem()
                    }
                    c in 'a'..'z' -> throw CalculoInvalido(R.string.erro_letra_minuscula, c)
                    else -> throw CalculoInvalido(R.string.erro_caractere_inesperado, c)
                }
            }
            if (aninhado) throw CalculoInvalido(R.string.erro_parentese_abre_sem_fecha)
            return atomos
        }

        private fun contagem(): Int {
            val ini = i
            while (i < s.length && s[i] in '0'..'9') i++
            if (i == ini) return 1
            val n = s.substring(ini, i).toLongOrNull() ?: throw CalculoInvalido(R.string.erro_quantidade_invalida, s.substring(ini, i))
            if (n < 1) throw CalculoInvalido(R.string.erro_quantidade_invalida, s.substring(ini, i))
            if (n > MAX_QUANTIDADE) throw CalculoInvalido(R.string.erro_quantidade_grande)
            return n.toInt()
        }
    }
}
