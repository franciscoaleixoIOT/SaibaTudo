package net.saibatudo.quimica.domain.calc

import java.math.BigInteger
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToLong

/** Espécie para o cálculo por formação: lado 'r'/'p', coeficiente, se é substância simples no estado padrão e o ΔHf° (null = sem valor). */
data class EspecieEntalpia(val formula: String, val coef: Double, val lado: String, val simples: Boolean = false, val estado: String? = null, val dHf: Double? = null)

/** Termo da soma por formação: a espécie e a contribuição (± n·ΔHf°), null se falta o ΔHf°. */
data class TermoEntalpia(val especie: EspecieEntalpia, val contribuicao: Double?)

/** Soma por formação; [erro] = 'faltaEntalpia' com as fórmulas que [faltam] (nenhum número inventado). */
data class ResultadoFormacao(val ok: Boolean, val dH: Double = 0.0, val termos: List<TermoEntalpia> = emptyList(), val faltam: List<String> = emptyList()) {
    val exotermica: Boolean get() = dH < 0
}

/** Espécies de uma equação (coeficientes digitados ou do balanceamento); [erro] = código de [ErroEquacao], 'formula' ou 'balancear'. */
data class EspeciesDaEquacao(val ok: Boolean, val especies: List<EspecieEntalpia> = emptyList(), val balanceada: Boolean = false, val erro: String? = null, val mensagem: CalculoInvalido? = null)

/** Combustão completa balanceada; [erro] = 'formula', 'naoQueima' ou 'balancear'. [equacao] em Unicode ("CH₄ + 2 O₂ → CO₂ + 2 H₂O"). */
data class Combustao(
    val ok: Boolean,
    val equacao: String = "",
    val coefComposto: Int = 1,
    val especies: List<EspecieEntalpia> = emptyList(),
    val erro: String? = null,
    val mensagem: CalculoInvalido? = null,
    val elementos: List<String> = emptyList()
)

/** Passo da lei de Hess: equação [indice] (0…) × [fator] (invertida se negativo) e o ΔH dela já multiplicado. */
data class PassoHess(val indice: Int, val fator: Racional, val dH: Double) {
    val invertida: Boolean get() = fator.sinal < 0
}

/** Lei de Hess; [erro] = 'alvo', 'equacao', 'naoBalanceada', 'semDH' ou 'semCombinacao' ([indice] da equação, [mensagem] do erro de fórmula). */
data class ResultadoHess(val ok: Boolean, val dH: Double = 0.0, val passos: List<PassoHess> = emptyList(), val erro: String? = null, val indice: Int? = null, val mensagem: CalculoInvalido? = null) {
    val exotermica: Boolean get() = dH < 0
}

/**
 * Entalpia de reação (docs/CALCULADORAS_2026-10-17.md §2.1), espelho de web/src/quimica/js/calc/entalpia.js: por entalpias padrão de formação
 * (ΔH° = Σ n·ΔHf°(produtos) − Σ n·ΔHf°(reagentes)), combustão completa de um composto (CxHyOz(N,S) + O2 → CO2 + H2O (+ N2, SO2)) e lei de Hess
 * (combinação linear exata das equações dadas). Quem chama resolve o ΔHf° de cada espécie (pacote) e a substância simples no estado padrão vale 0
 * por definição. Funções PURAS, sem texto.
 */
object Entalpia {

    /** Atomicidade da forma padrão das substâncias simples que não são monoatômicas (H2, N2, O2, F2, Cl2, Br2, I2; S8 e P4 também valem). */
    private val ATOMICIDADE_PADRAO = mapOf(
        "H" to listOf(2), "N" to listOf(2), "O" to listOf(2), "F" to listOf(2), "Cl" to listOf(2), "Br" to listOf(2), "I" to listOf(2),
        "S" to listOf(1, 8), "P" to listOf(1, 4)
    )

    /** Substância simples na forma do estado padrão (ΔHf° = 0 por definição)? "O2", "Fe", "C", "N2" sim; "O3", "O", "H" não. */
    fun ehSubstanciaSimplesPadrao(formula: String, simbolosValidos: Set<String>? = null): Boolean {
        val f = FormulaQuimica.tentar(formula, simbolosValidos) ?: return false
        if (f.carga != 0 || f.contagem.size != 1 || f.hidrato) return false
        val (s, n) = f.contagem.entries.first()
        return n in (ATOMICIDADE_PADRAO[s] ?: listOf(1))
    }

    /** Arredondamento como `Math.round(x·10^casas)/10^casas` do site. */
    internal fun arred(x: Double, casas: Int = 4): Double {
        val p = 10.0.pow(casas)
        return Math.round(x * p) / p + 0.0
    }

    fun somaPorFormacao(especies: List<EspecieEntalpia>): ResultadoFormacao {
        val termos = especies.map { x -> TermoEntalpia(x, x.dHf?.takeIf { it.isFinite() }?.let { (if (x.lado == "p") 1 else -1) * x.coef * it + 0.0 }) }
        val faltam = termos.filter { it.contribuicao == null }.map { it.especie.formula }.distinct()
        if (faltam.isNotEmpty()) return ResultadoFormacao(ok = false, termos = termos, faltam = faltam)
        val dH = arred(termos.sumOf { it.contribuicao!! }, 3)
        return ResultadoFormacao(ok = true, dH = dH, termos = termos)
    }

    fun especiesDaEquacao(equacao: String, simbolosValidos: Set<String>? = null): EspeciesDaEquacao {
        val eq = try {
            Equilibrio.lerEquacaoComEstados(equacao, simbolosValidos)
        } catch (e: ErroEquacao) {
            return EspeciesDaEquacao(ok = false, erro = e.codigo ?: "formula", mensagem = e.formula)
        }
        var balanceada = false
        val coefs: List<Double> = if (!eq.digitouCoeficientes) {
            val b = try {
                Equilibrio.balancearEspecies(eq)
            } catch (e: CalculoInvalido) {
                return EspeciesDaEquacao(ok = false, erro = "balancear", mensagem = e)
            }
            balanceada = b.any { it != 1 }
            b.map { it.toDouble() }
        } else eq.todas.map { it.coef ?: 1.0 }
        val nr = eq.reagentes.size
        return EspeciesDaEquacao(
            ok = true, balanceada = balanceada,
            especies = eq.todas.mapIndexed { i, x -> EspecieEntalpia(x.formula, coefs[i], if (i < nr) "r" else "p", ehSubstanciaSimplesPadrao(x.formula, simbolosValidos), x.estado) }
        )
    }

    /** Elementos que a combustão completa sabe tratar e os produtos de cada um. */
    private val PRODUTOS_COMBUSTAO = listOf("C" to "CO2", "H" to "H2O", "N" to "N2", "S" to "SO2")

    fun equacaoDeCombustao(formula: String, simbolosValidos: Set<String>? = null): Combustao {
        val f = try {
            FormulaQuimica.analisar(formula, simbolosValidos)
        } catch (e: CalculoInvalido) {
            return Combustao(ok = false, erro = "formula", mensagem = e)
        }
        val els = f.contagem.keys.toList()
        val fora = els.filter { it !in setOf("C", "H", "O", "N", "S") }
        if (fora.isNotEmpty() || f.carga != 0 || f.hidrato || els.none { it in setOf("C", "H", "S") }) return Combustao(ok = false, erro = "naoQueima", elementos = fora)
        val produtos = PRODUTOS_COMBUSTAO.filter { it.first in f.contagem }.map { it.second }
        val texto = "${f.texto} + O2 -> ${produtos.joinToString(" + ")}"
        val bal = try {
            val eq = Balanceador.interpretar(texto, simbolosValidos)
            EquacaoBalanceada(eq, Balanceador.coeficientes(eq))
        } catch (e: CalculoInvalido) {
            return Combustao(ok = false, erro = "balancear", mensagem = e)
        }
        val nr = bal.equacao.reagentes.size
        val especies = bal.equacao.todas.mapIndexed { i, e ->
            EspecieEntalpia(e.rotulo, bal.coeficientes[i].toDouble(), if (i < nr) "r" else "p", ehSubstanciaSimplesPadrao(e.rotulo, simbolosValidos))
        }
        return Combustao(ok = true, equacao = bal.texto(), coefComposto = bal.coeficientes[0], especies = especies)
    }

    /** Calor de uma amostra: q = n(composto) ÷ coef(composto) × ΔH(reação). Devolve (q, extensão). */
    fun calorDaAmostra(dH: Double, coefComposto: Int, mol: Double): Pair<Double, Double> {
        val extensao = mol / coefComposto
        return arred(dH * extensao, 4) to extensao
    }

    /** Número (inteiro ou decimal, até 9 casas) → fração exata. */
    fun fracDe(x: Double): Racional {
        require(x.isFinite()) { "numero" }
        var d = BigInteger.ONE
        var v = x
        var k = 0
        while (k < 9 && abs(v - Math.round(v)) > 1e-12) { v *= 10; d *= BigInteger.TEN; k++ }
        return Racional.de(BigInteger.valueOf(v.roundToLong()), d)
    }

    /** Vetor (chave → coeficiente líquido: produtos +, reagentes −) de uma equação lida. */
    private fun vetor(eq: EquacaoComEstados, coefs: List<Double?>, comEstado: Boolean): Map<String, Racional> {
        val v = LinkedHashMap<String, Racional>()
        val nr = eq.reagentes.size
        eq.todas.forEachIndexed { i, x ->
            val k = if (comEstado && x.estado != null) "${x.chave}(${x.estado})" else x.chave
            val sinal = Racional.de(if (i < nr) -1L else 1L)
            v[k] = (v[k] ?: Racional.ZERO) + fracDe(coefs[i] ?: 1.0) * sinal
        }
        return v.filterValues { !it.ehZero }
    }

    /** Átomos conservados (equação dada como balanceada)? */
    private fun balanceadaComoEscrita(eq: EquacaoComEstados, coefs: List<Double?>): Boolean {
        val soma = LinkedHashMap<String, Racional>()
        val nr = eq.reagentes.size
        eq.todas.forEachIndexed { i, x ->
            val sinal = if (i < nr) -1L else 1L
            for ((s, n) in x.analisada.contagem) soma[s] = (soma[s] ?: Racional.ZERO) + fracDe(coefs[i] ?: 1.0) * Racional.de(n * sinal)
        }
        return soma.values.all { it.ehZero }
    }

    /** Resolve A·x = b (frações) por Gauss-Jordan; variáveis livres = 0. null se o sistema não tem solução. */
    private fun resolver(a: List<List<Racional>>, b: List<Racional>, nCols: Int): List<Racional>? {
        val m = a.mapIndexed { i, l -> (l + b[i]).toMutableList() }.toMutableList()
        val pivos = mutableListOf<Int>()
        var r = 0
        for (c in 0 until nCols) {
            if (r >= m.size) break
            var p = r
            while (p < m.size && m[p][c].ehZero) p++
            if (p == m.size) continue
            val tmp = m[r]; m[r] = m[p]; m[p] = tmp
            val inv = Racional.UM / m[r][c]
            m[r] = m[r].map { it * inv }.toMutableList()
            for (i in m.indices) if (i != r && !m[i][c].ehZero) {
                val f = m[i][c]
                m[i] = m[i].mapIndexed { j, x -> x - f * m[r][j] }.toMutableList()
            }
            pivos += c
            r++
        }
        for (i in r until m.size) if (!m[i][nCols].ehZero) return null
        val x = MutableList(nCols) { Racional.ZERO }
        pivos.forEachIndexed { i, c -> x[c] = m[i][nCols] }
        return x
    }

    /**
     * Lei de Hess: os multiplicadores racionais das [equacoes] (equação, ΔH em kJ) cuja soma é a equação [alvo] (sem coeficientes, é balanceada
     * antes), ΔH do alvo e os passos. Primeiro com os estados físicos distintos (H2O(l) ≠ H2O(g)); se não fechar, sem eles.
     */
    fun combinarHess(alvo: String, equacoes: List<Pair<String, Double?>>, simbolosValidos: Set<String>? = null): ResultadoHess {
        val eqAlvo: EquacaoComEstados
        var coefAlvo: List<Double?>
        try {
            eqAlvo = Equilibrio.lerEquacaoComEstados(alvo, simbolosValidos)
            coefAlvo = eqAlvo.todas.map { it.coef }
            if (!eqAlvo.digitouCoeficientes && !balanceadaComoEscrita(eqAlvo, coefAlvo)) {
                coefAlvo = try {
                    Equilibrio.balancearEspecies(eqAlvo).map { it.toDouble() }
                } catch (e: CalculoInvalido) {
                    return ResultadoHess(ok = false, erro = "alvo", mensagem = e)
                }
            }
        } catch (e: ErroEquacao) {
            return ResultadoHess(ok = false, erro = "alvo", mensagem = if (e.codigo == null) e.formula else null)
        }
        val lidas = mutableListOf<EquacaoComEstados>()
        for ((i, x) in equacoes.withIndex()) {
            val dH = x.second
            if (dH == null || !dH.isFinite()) return ResultadoHess(ok = false, erro = "semDH", indice = i)
            val eq = try {
                Equilibrio.lerEquacaoComEstados(x.first, simbolosValidos)
            } catch (e: ErroEquacao) {
                return ResultadoHess(ok = false, erro = "equacao", indice = i, mensagem = if (e.codigo == null) e.formula else null)
            }
            lidas += eq
            if (!balanceadaComoEscrita(eq, eq.todas.map { it.coef })) return ResultadoHess(ok = false, erro = "naoBalanceada", indice = i)
        }
        if (lidas.isEmpty()) return ResultadoHess(ok = false, erro = "semCombinacao")
        for (comEstado in listOf(true, false)) {
            val t = vetor(eqAlvo, coefAlvo, comEstado)
            val vs = lidas.map { vetor(it, it.todas.map { e -> e.coef }, comEstado) }
            val chaves = LinkedHashSet<String>().apply { addAll(t.keys); vs.forEach { addAll(it.keys) } }.toList()
            val a = chaves.map { k -> vs.map { it[k] ?: Racional.ZERO } }
            val b = chaves.map { t[it] ?: Racional.ZERO }
            val x = resolver(a, b, vs.size) ?: continue
            val passos = x.mapIndexed { i, f -> PassoHess(i, f, arred(f.toDouble() * equacoes[i].second!!, 3)) }.filter { !it.fator.ehZero }
            val dH = arred(passos.sumOf { it.dH }, 3)
            return ResultadoHess(ok = true, dH = dH, passos = passos)
        }
        return ResultadoHess(ok = false, erro = "semCombinacao")
    }
}
