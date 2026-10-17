package net.saibatudo.quimica.domain.calc

import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.Textos

/** Quantidade conhecida de uma espécie da equação: [indice] (0 = primeira espécie), valor em g ou mol. */
data class QuantidadeConhecida(val indice: Int, val valor: Double, val emMols: Boolean)

/** Linha do resultado para uma espécie. */
data class LinhaEstequiometria(
    val especie: String,
    val coeficiente: Int,
    val reagente: Boolean,
    val massaMolar: Double,
    val mols: Double,
    val massa: Double,
    /** Reagente: o que sobra (mol) quando a quantidade inicial é conhecida. */
    val sobraMols: Double?
)

data class ResultadoEstequiometria(
    val equacao: EquacaoBalanceada,
    val limitante: String?,
    val extensao: Double,
    val linhas: List<LinhaEstequiometria>,
    val passos: List<String>,
    /** Rendimento real (%) informado, abaixo de 100; null = teórico. As [linhas] são sempre as teóricas (n = coeficiente × ξ). */
    val rendimento: Double? = null
) {
    fun comoResultado(t: Textos, rendimentoPercentual: Double? = rendimento): ResultadoCalculo {
        val l = linhas.map {
            val verbo = t(if (it.reagente) R.string.calc_est_consumido else R.string.calc_est_formado)
            val valor = "${t.sig(it.mols, 5)} mol = ${t.sig(it.massa, 5)} g"
            LinhaResultado("${Texto.formulaUnicode(it.especie)} ($verbo)", valor, destaque = !it.reagente)
        }.toMutableList()
        if (rendimentoPercentual != null) {
            linhas.filter { !it.reagente }.forEach {
                val f = rendimentoPercentual / 100.0
                l += LinhaResultado(t(R.string.calc_est_com_rendimento, Texto.formulaUnicode(it.especie), t.sig(rendimentoPercentual, 4)),
                    "${t.sig(it.mols * f, 5)} mol = ${t.sig(it.massa * f, 5)} g")
            }
        }
        return ResultadoCalculo(t(R.string.calc_est_titulo), l, passos, listOf(t(R.string.calc_equacao_balanceada, equacao.texto())))
    }
}

/**
 * Estequiometria a partir de uma equação balanceada: converte massa ↔ mol pela massa molar, usa a proporção dos
 * coeficientes e identifica o reagente limitante quando mais de um reagente tem quantidade conhecida.
 */
object Estequiometria {

    /**
     * [rendimentoPercentual] (0 < r ≤ 100, opcional) é o rendimento real. Partindo de REAGENTES, os produtos obtidos são os teóricos × rendimento.
     * Partindo de um PRODUTO desejado com rendimento < 100 %, a quantidade informada é a obtida: a reação precisa avançar mais
     * (ξ = n ÷ coeficiente ÷ rendimento) e os reagentes necessários são os teóricos ÷ rendimento (igual a `calcularEstequiometria` do site).
     */
    fun calcular(
        t: Textos, eq: EquacaoBalanceada, conhecidas: List<QuantidadeConhecida>, elementos: Map<String, Elemento>, rendimentoPercentual: Double? = null
    ): ResultadoEstequiometria {
        val especies = eq.equacao.todas
        val nr = eq.equacao.reagentes.size
        val rend = rendimentoPercentual ?: 100.0
        if (!rend.isFinite() || rend <= 0.0 || rend > 100.0) throw CalculoInvalido(R.string.erro_est_rendimento)
        if (conhecidas.isEmpty()) throw CalculoInvalido(R.string.erro_est_sem_quantidade)
        if (conhecidas.map { it.indice }.distinct().size != conhecidas.size) throw CalculoInvalido(R.string.erro_est_especie_repetida)
        for (q in conhecidas) {
            if (q.indice !in especies.indices) throw CalculoInvalido(R.string.erro_est_especie_inexistente)
            if (!q.valor.isFinite() || q.valor <= 0) throw CalculoInvalido(R.string.erro_est_quantidade_positiva)
        }
        val massas = especies.map { MassaMolar.calcular(it.formula, elementos).massaMolar }
        val passos = mutableListOf<String>()
        passos += t(R.string.calc_equacao_balanceada, eq.texto())
        passos += t(R.string.calc_est_massas_molares, especies.indices.joinToString("; ") { "${Texto.formulaUnicode(especies[it].rotulo)} = ${t.fixo(massas[it], 3)} g/mol" })

        // mols conhecidos
        val molsConhecidos = conhecidas.associate { q ->
            val mols = if (q.emMols) q.valor else q.valor / massas[q.indice]
            passos += if (q.emMols) t(R.string.calc_est_mol_informado, Texto.formulaUnicode(especies[q.indice].rotulo), t.sig(q.valor, 5))
            else t(R.string.calc_est_mol_de_massa, Texto.formulaUnicode(especies[q.indice].rotulo), t.sig(q.valor, 5), t.fixo(massas[q.indice], 3), t.sig(mols, 5))
            q.indice to mols
        }
        val reagentesConhecidos = molsConhecidos.keys.filter { it < nr }
        val extensao: Double
        var limitante: String? = null
        if (reagentesConhecidos.size >= 2 && reagentesConhecidos.size == molsConhecidos.size) {
            // reagente limitante: menor n/coeficiente
            val razoes = reagentesConhecidos.associateWith { molsConhecidos.getValue(it) / eq.coeficientes[it] }
            passos += t(R.string.calc_est_razao, razoes.entries.joinToString("; ") { "${Texto.formulaUnicode(especies[it.key].rotulo)} = ${t.sig(it.value, 5)}" })
            val lim = razoes.minByOrNull { it.value }!!
            extensao = lim.value
            limitante = especies[lim.key].rotulo
            passos += t(R.string.calc_est_limitante, Texto.formulaUnicode(limitante), t.sig(extensao, 5))
        } else if (molsConhecidos.size == 1) {
            val (i, n) = molsConhecidos.entries.first()
            if (i >= nr && rend < 100.0) {
                // produto desejado com rendimento: a quantidade informada é a real; a extensão teórica é maior
                extensao = n / eq.coeficientes[i] / (rend / 100.0)
                passos += t(R.string.calc_est_produto_com_rendimento, Texto.formulaUnicode(especies[i].rotulo), t.sig(rend, 4)) +
                    " ξ = ${t.sig(n, 5)} ÷ (${eq.coeficientes[i]} × ${t.sig(rend / 100.0, 4)}) = ${t.sig(extensao, 5)} mol."
            } else {
                extensao = n / eq.coeficientes[i]
                passos += t(R.string.calc_est_uma_especie, t.sig(n, 5), eq.coeficientes[i], t.sig(extensao, 5))
            }
        } else {
            throw CalculoInvalido(R.string.erro_est_so_reagentes)
        }

        val linhas = especies.indices.map { i ->
            val mols = eq.coeficientes[i] * extensao
            val sobra = if (i < nr && molsConhecidos.containsKey(i)) molsConhecidos.getValue(i) - mols else null
            LinhaEstequiometria(especies[i].rotulo, eq.coeficientes[i], i < nr, massas[i], mols, mols * massas[i], sobra?.let { if (kotlin.math.abs(it) < 1e-12) 0.0 else it })
        }
        passos += t(R.string.calc_est_cada_especie)
        val necessarios = linhas.filterIndexed { i, l -> l.reagente && !molsConhecidos.containsKey(i) }
        if (necessarios.isNotEmpty()) {
            passos += t(R.string.calc_est_necessarios, necessarios.joinToString("; ") {
                "n(${Texto.formulaUnicode(it.especie)}) = ${it.coeficiente} × ${t.sig(extensao, 5)} = ${t.sig(it.mols, 5)} mol (${t.sig(it.massa, 5)} g)"
            })
        }
        linhas.filter { it.sobraMols != null && it.sobraMols > 0.0 }.forEach {
            passos += t(R.string.calc_est_sobra, Texto.formulaUnicode(it.especie), t.sig(it.sobraMols!!, 5), t.sig(it.sobraMols * it.massaMolar, 5))
        }
        return ResultadoEstequiometria(eq, limitante, extensao, linhas, passos, rend.takeIf { it < 100.0 })
    }
}
