package net.saibatudo.quimica.domain.calc

import net.saibatudo.quimica.domain.Texto
import java.text.Normalizer
import kotlin.math.pow

/** Erro de leitura de equação: [codigo] ('semSeta', 'duasSetas', 'lado', 'eletron') ou o erro da fórmula ([formula]). */
class ErroEquacao(val codigo: String?, val formula: CalculoInvalido? = null) : Exception("ErroEquacao($codigo)")

/** Espécie lida com coeficiente digitado (ou null) e estado físico ('s', 'l', 'g', 'aq' ou null). [formula] = texto normalizado. */
data class EspecieLida(val coef: Double?, val formula: String, val chave: String, val estado: String?, val analisada: FormulaAnalisada)

data class EquacaoComEstados(val reagentes: List<EspecieLida>, val produtos: List<EspecieLida>, val digitouCoeficientes: Boolean) {
    val todas: List<EspecieLida> get() = reagentes + produtos
}

/** Espécie da expressão de equilíbrio: lado 'r'/'p', fase ('s', 'l', 'g', 'aq'), origem da fase ('rotulo', 'pacote', 'hipotese') e se entra. */
data class EspecieEquilibrio(val formula: String, val chave: String, val coef: Double, val lado: String, val fase: String, val origem: String) {
    val entra: Boolean get() = fase == "g" || fase == "aq"
}

/** Expressão de Kc; [erro] = código de [ErroEquacao], 'formula' (com [mensagem]) ou 'balancear' (com [mensagem]). */
data class ExpressaoEquilibrio(
    val ok: Boolean,
    val especies: List<EspecieEquilibrio> = emptyList(),
    val deltaN: Double = 0.0,
    val texto: String = "",
    val balanceada: Boolean = false,
    val hipoteses: List<String> = emptyList(),
    val erro: String? = null,
    val mensagem: CalculoInvalido? = null
)

/** Concentração no equilíbrio usada no Kc. */
data class ConcentracaoUsada(val formula: String, val coef: Double, val lado: String, val valor: Double)

/** Valor de Kc; [erro] = 'expressao', 'faltamConcentracoes' (com [faltam]) ou 'concentracaoInvalida'. */
data class ResultadoKc(val ok: Boolean, val kc: Double = 0.0, val usadas: List<ConcentracaoUsada> = emptyList(), val erro: String? = null, val faltam: List<String> = emptyList())

/** Kp = Kc·(RT)^Δn: o fator, RT e Kp (quando há Kc); [ok] falso sem temperatura ou R válidos. */
data class ResultadoKp(val ok: Boolean, val fator: Double = 0.0, val rt: Double = 0.0, val kp: Double? = null)

/**
 * Equilíbrio químico (docs/CALCULADORAS_2026-10-17.md §2.4), espelho de web/src/quimica/js/calc/equilibrio.js: expressão de Kc (lei da ação das
 * massas, sem sólidos nem líquidos puros), Δn dos gases, Kp = Kc·(RT)^Δn e o valor de Kc pelas concentrações. A fase vem do rótulo, do pacote ou,
 * sem os dois, é gás por hipótese (dita na resposta). R em L·atm·mol⁻¹·K⁻¹ é derivado do R do pacote e da tabela de unidades. Funções PURAS.
 */
object Equilibrio {

    /** Setas aceitas: ⇌ <=> <-> ⇄ ↔ → -> = (e variantes). */
    val RX_SETA_EQUILIBRIO = Regex("""\s*(?:<=>|<-->|<->|⇌|⇄|↔|-->|->|→|⟶|⇒|=>|==|=)\s*""")
    private val RX_ESTADO = Regex("""\(\s*(s|l|g|aq)\s*\)\s*$""", RegexOption.IGNORE_CASE)
    private val RX_ELETRON = Regex("""^e(?:\^?[-−]|⁻)$""")
    private val RX_COEF = Regex("""^(\d+(?:[.,]\d+)?|\d+/\d+)\s*(?=[A-Za-z(\[])(.*)$""")

    /** Texto simples para comparar fórmulas ("H2O" → "h2o"), como `chaveFormula` do site. */
    fun chaveFormula(texto: String): String = FormulaQuimica.normalizarEntrada(texto).replace("^", "").lowercase()

    /** Lê "N2(g) + 3 H2(g) ⇌ 2 NH3(g)" mantendo coeficientes (também "1/2", "1,5") e estados físicos. Lança [ErroEquacao]. */
    fun lerEquacaoComEstados(texto: String, simbolosValidos: Set<String>? = null): EquacaoComEstados {
        val bruto = Normalizer.normalize(texto, Normalizer.Form.NFC).replace(Regex("[−–—]"), "-").trim()
        val m = RX_SETA_EQUILIBRIO.find(bruto) ?: throw ErroEquacao("semSeta")
        val esq = bruto.substring(0, m.range.first)
        val dir = bruto.substring(m.range.last + 1)
        if (RX_SETA_EQUILIBRIO.containsMatchIn(dir)) throw ErroEquacao("duasSetas")
        var digitou = false
        fun lado(s: String): List<EspecieLida> {
            val itens = Balanceador.dividirEspecies(s)
            if (itens.isEmpty()) throw ErroEquacao("lado")
            return itens.map { item ->
                val mc = RX_COEF.find(item.trim())
                var coef: Double? = null
                var corpo = item.trim()
                if (mc != null) {
                    val c = mc.groupValues[1]
                    coef = if ('/' in c) c.substringBefore('/').toDouble() / c.substringAfter('/').toDouble() else c.replace(',', '.').toDouble()
                    corpo = mc.groupValues[2].trim()
                    digitou = true
                }
                val me = RX_ESTADO.find(corpo)
                val estado = me?.groupValues?.get(1)?.lowercase()
                if (me != null) corpo = corpo.substring(0, me.range.first).trim()
                if (RX_ELETRON.matches(corpo.replace(Regex("""\s+"""), ""))) throw ErroEquacao("eletron")
                val f = try {
                    FormulaQuimica.analisar(corpo, simbolosValidos)
                } catch (e: CalculoInvalido) {
                    throw ErroEquacao(null, e)
                }
                EspecieLida(coef, f.texto, chaveFormula(f.texto), estado, f)
            }
        }
        val r = lado(esq)
        val p = lado(dir)
        return EquacaoComEstados(r, p, digitou)
    }

    /** Coeficientes do balanceamento das espécies lidas (na ordem reagentes + produtos). Lança [CalculoInvalido]. */
    internal fun balancearEspecies(eq: EquacaoComEstados): List<Int> = Balanceador.coeficientes(
        Equacao(eq.reagentes.map { Especie(it.formula, it.analisada) }, eq.produtos.map { Especie(it.formula, it.analisada) })
    )

    /** Coeficiente como texto, igual a `String(número)` do site: 2 → "2", 0.5 → "0.5". */
    fun textoCoef(c: Double): String = if (c == Math.floor(c) && kotlin.math.abs(c) < 1e15) c.toLong().toString() else c.toString()

    /** Estado físico de um composto a [temperaturaK] pelos pontos de fusão e de ebulição; sem eles, o `estadoPadrao` ('solido', 'liquido', 'gas'). */
    fun estadoNaTemperatura(estadoPadrao: String?, pontoFusaoK: Double?, pontoEbulicaoK: Double?, temperaturaK: Double?): String? {
        if (temperaturaK != null && temperaturaK.isFinite()) {
            if (pontoEbulicaoK != null && temperaturaK >= pontoEbulicaoK) return "gas"
            if (pontoFusaoK != null && temperaturaK < pontoFusaoK) return "solido"
            if (pontoFusaoK != null && pontoEbulicaoK != null) return "liquido"
        }
        return estadoPadrao?.takeIf { it in setOf("solido", "liquido", "gas") }
    }

    /** Expressão da constante de equilíbrio. [estadoDoPacote]: fórmula → 'solido' | 'liquido' | 'gas' | null. */
    fun expressao(equacao: String, estadoDoPacote: ((String) -> String?)? = null, simbolosValidos: Set<String>? = null): ExpressaoEquilibrio {
        val eq = try {
            lerEquacaoComEstados(equacao, simbolosValidos)
        } catch (e: ErroEquacao) {
            return ExpressaoEquilibrio(ok = false, erro = e.codigo ?: "formula", mensagem = e.formula)
        }
        val coefs: List<Double>
        var balanceada = false
        if (!eq.digitouCoeficientes) {
            val b = try {
                balancearEspecies(eq)
            } catch (e: CalculoInvalido) {
                return ExpressaoEquilibrio(ok = false, erro = "balancear", mensagem = e)
            }
            coefs = b.map { it.toDouble() }
            balanceada = b.any { it != 1 }
        } else coefs = eq.todas.map { it.coef ?: 1.0 }
        val hipoteses = LinkedHashSet<String>()
        val nr = eq.reagentes.size
        val especies = eq.todas.mapIndexed { i, x ->
            val (fase, origem) = faseDe(x, estadoDoPacote)
            if (origem == "hipotese") hipoteses += "gasPorHipotese"
            if (origem == "pacote") hipoteses += "faseDoPacote"
            EspecieEquilibrio(x.formula, x.chave, coefs[i], if (i < nr) "r" else "p", fase, origem)
        }
        if (especies.any { !it.entra }) hipoteses += "semSolidoLiquido"
        fun gas(lado: String) = especies.filter { it.lado == lado && it.fase == "g" }.sumOf { it.coef }
        val deltaN = gas("p") - gas("r")
        fun termo(x: EspecieEquilibrio): String {
            val f = "[${Texto.formulaUnicode(x.formula)}]"
            return if (x.coef == 1.0) f else "$f^${textoCoef(x.coef)}"
        }
        val num = especies.filter { it.lado == "p" && it.entra }
        val den = especies.filter { it.lado == "r" && it.entra }
        fun juntar(l: List<EspecieEquilibrio>) = if (l.isEmpty()) "1" else l.joinToString("·") { termo(it) }
        val texto = "Kc = ${juntar(num)}" + if (den.isNotEmpty()) " / " + (if (den.size > 1) "(${juntar(den)})" else juntar(den)) else ""
        return ExpressaoEquilibrio(ok = true, especies = especies, deltaN = deltaN, texto = texto, balanceada = balanceada, hipoteses = hipoteses.toList())
    }

    /** Fase de uma espécie: rótulo → pacote → hipótese gás. */
    private fun faseDe(esp: EspecieLida, estadoDoPacote: ((String) -> String?)?): Pair<String, String> {
        esp.estado?.let { return it to "rotulo" }
        val fase = when (estadoDoPacote?.invoke(esp.formula)) { "solido" -> "s"; "liquido" -> "l"; "gas" -> "g"; else -> null }
        return if (fase != null) fase to "pacote" else "g" to "hipotese"
    }

    /** R em L·atm·mol⁻¹·K⁻¹ a partir do R do pacote (J·mol⁻¹·K⁻¹) e da tabela de unidades; null se faltar algo. */
    fun rLitroAtm(rJmolK: Double?, un: Unidades): Double? {
        if (rJmolK == null || !(rJmolK > 0)) return null
        val atm = un.porSimbolo("atm", "pressao") ?: return null
        val litro = un.porSimbolo("L", "volume") ?: return null
        return rJmolK / un.paraBase(1.0, atm) / un.paraBase(1.0, litro)
    }

    /** Temperatura em K de um valor com unidade (K, °C, °F pela tabela de unidades); null se não for temperatura. */
    fun temperaturaEmK(valor: Double, unidade: String, un: Unidades): Double? {
        if (!valor.isFinite()) return null
        val u = un.buscar(unidade, "temperatura") ?: return null
        return un.paraBase(valor, u)
    }

    /** Kp = Kc·(RT)^Δn. Com [kc] devolve o valor; sem ele, só o fator. */
    fun kpDeKc(deltaN: Double, temperaturaK: Double, rLatm: Double, kc: Double? = null): ResultadoKp {
        if (!(temperaturaK > 0) || !(rLatm > 0)) return ResultadoKp(ok = false)
        val fator = (rLatm * temperaturaK).pow(deltaN)
        return ResultadoKp(ok = true, fator = fator, rt = rLatm * temperaturaK, kp = kc?.takeIf { it.isFinite() }?.let { it * fator })
    }

    /** Valor de Kc a partir das concentrações no equilíbrio (espécie, mol/L) de TODAS as espécies que entram na expressão. */
    fun calcularKc(expr: ExpressaoEquilibrio, concentracoes: List<Pair<String, Double>>): ResultadoKc {
        if (!expr.ok) return ResultadoKc(ok = false, erro = "expressao")
        val porChave = LinkedHashMap<String, Double>()
        for ((esp, v) in concentracoes) if (v.isFinite()) porChave[chaveFormula(RX_ESTADO.replace(esp, ""))] = v
        val entram = expr.especies.filter { it.entra }
        val faltam = entram.filter { it.chave !in porChave }.map { it.formula }
        if (faltam.isNotEmpty()) return ResultadoKc(ok = false, erro = "faltamConcentracoes", faltam = faltam)
        if (entram.any { !(porChave.getValue(it.chave) > 0) }) return ResultadoKc(ok = false, erro = "concentracaoInvalida")
        var kc = 1.0
        val usadas = entram.map { x ->
            val v = porChave.getValue(x.chave)
            kc *= if (x.lado == "p") v.pow(x.coef) else v.pow(-x.coef)
            ConcentracaoUsada(x.formula, x.coef, x.lado, v)
        }
        return ResultadoKc(ok = true, kc = kc, usadas = usadas)
    }
}
