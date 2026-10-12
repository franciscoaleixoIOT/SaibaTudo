package net.saibatudo.quimica.domain.calc

import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.Textos

/** Linha da soma da massa molar: [quantidade] átomos de [simbolo] × [massaAtomica] = [subtotal]. */
data class LinhaMassa(val simbolo: String, val elemento: Elemento, val quantidade: Int, val massaAtomica: Double, val subtotal: Double) {
    /** Nome em português (o do pacote); para exibir no idioma use [nomeNo]. */
    val nome: String get() = elemento.nome

    /** Nome do elemento no idioma de [t], rotulado quando é uma reserva. */
    fun nomeNo(t: Textos): String = t.nomeRotulado(Nomes.elemento(elemento, t.idioma))
}

data class ResultadoMassaMolar(
    val formula: FormulaAnalisada,
    val linhas: List<LinhaMassa>,
    /** g/mol */
    val massaMolar: Double
) {
    fun comoResultado(t: Textos): ResultadoCalculo = ResultadoCalculo(
        titulo = t(R.string.calc_mm_titulo, formula.exibicao()),
        linhas = listOf(LinhaResultado(t(R.string.rot_massa_molar), "${t.fixo(massaMolar, 3)} g/mol", destaque = true)),
        passos = linhas.map { t(R.string.calc_mm_passo, it.simbolo, it.nomeNo(t), it.quantidade, t.num(it.massaAtomica, 4), t.num(it.subtotal, 4)) } +
            t(R.string.calc_mm_soma, t.num(massaMolar, 4), formula.exibicao(), t.fixo(massaMolar, 3)),
        notas = if (formula.carga != 0) listOf(t(R.string.calc_mm_nota_carga, formula.carga)) else emptyList()
    )
}

/** Massa molar a partir da fórmula e das massas atômicas do pacote de dados. */
object MassaMolar {
    fun calcular(formula: String, elementos: Map<String, Elemento>): ResultadoMassaMolar {
        val f = FormulaQuimica.analisar(formula, elementos.keys)
        return calcular(f, elementos)
    }

    fun calcular(f: FormulaAnalisada, elementos: Map<String, Elemento>): ResultadoMassaMolar {
        val linhas = f.contagem.map { (simbolo, n) ->
            val e = elementos[simbolo] ?: throw CalculoInvalido(R.string.erro_nao_e_elemento_do_pacote, simbolo)
            val m = e.massaAtomica ?: throw CalculoInvalido(R.string.erro_sem_massa_atomica, e)
            LinhaMassa(simbolo, e, n, m, n * m)
        }
        return ResultadoMassaMolar(f, linhas, linhas.sumOf { it.subtotal })
    }
}
