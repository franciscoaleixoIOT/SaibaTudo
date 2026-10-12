package net.saibatudo.quimica.domain.calc

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Constante
import net.saibatudo.quimica.domain.Textos

/** Variáveis da equação dos gases ideais PV = nRT. */
enum class VariavelGas(val simbolo: String, @param:StringRes val nome: Int, val grandeza: String) {
    P("P", R.string.var_gas_pressao, "pressao"), V("V", R.string.var_gas_volume, "volume"), N("n", R.string.var_gas_quantidade, "quantidade"),
    T("T", R.string.var_gas_temperatura, "temperatura")
}

/** Gás ideal: resolve a variável que falta em PV = nRT, com R vindo das constantes do pacote (CODATA). */
object GasIdeal {

    fun resolver(
        tx: Textos, p: CampoQtd, v: CampoQtd, n: CampoQtd, t: CampoQtd,
        r: Constante?, unidades: Unidades
    ): ResultadoCalculo {
        if (r == null) throw CalculoInvalido(R.string.erro_gas_sem_r)
        val campos = mapOf(VariavelGas.P to p, VariavelGas.V to v, VariavelGas.N to n, VariavelGas.T to t)
        for ((variavel, c) in campos) {
            if (c.unidade.grandeza != variavel.grandeza) throw CalculoInvalido(R.string.erro_unidade_nao_serve, c.unidade.simbolo, tx.minusNoMeio(tx(variavel.nome)))
        }
        val faltando = campos.filter { it.value.valor == null }.keys
        if (faltando.size != 1) throw CalculoInvalido(R.string.erro_um_campo_vazio_gas, faltando.size)
        val alvo = faltando.first()

        val passos = mutableListOf<String>()
        passos += tx(R.string.calc_gas_equacao, tx.sig(r.valor, 10), r.unidade ?: "J mol-1 K-1", r.fontes.firstOrNull()?.nome ?: tx(R.string.calc_gas_fonte_padrao))
        passos += tx(R.string.calc_gas_convertendo_si)
        val si = mutableMapOf<VariavelGas, Double>()
        for ((variavel, c) in campos) {
            val valor = c.valor ?: continue
            val base = unidades.base(variavel.grandeza) ?: throw CalculoInvalido(R.string.erro_falta_unidade_base, GrandezaRef(variavel.grandeza))
            val (conv, passo) = unidades.converterComPasso(tx, valor, c.unidade, base)
            si[variavel] = conv
            passos += "${variavel.simbolo}: $passo"
            if (conv <= 0) throw CalculoInvalido(R.string.erro_gas_positiva, tx(variavel.nome), base.simbolo)
        }
        val rv = r.valor
        val resultadoSi = when (alvo) {
            VariavelGas.P -> si[VariavelGas.N]!! * rv * si[VariavelGas.T]!! / si[VariavelGas.V]!!
            VariavelGas.V -> si[VariavelGas.N]!! * rv * si[VariavelGas.T]!! / si[VariavelGas.P]!!
            VariavelGas.N -> si[VariavelGas.P]!! * si[VariavelGas.V]!! / (rv * si[VariavelGas.T]!!)
            VariavelGas.T -> si[VariavelGas.P]!! * si[VariavelGas.V]!! / (si[VariavelGas.N]!! * rv)
        }
        val formula = when (alvo) {
            VariavelGas.P -> "P = nRT / V"; VariavelGas.V -> "V = nRT / P"; VariavelGas.N -> "n = PV / RT"; VariavelGas.T -> "T = PV / nR"
        }
        val baseAlvo = unidades.base(alvo.grandeza)!!
        passos += tx(R.string.calc_gas_isolando, alvo.simbolo, formula, tx.sig(resultadoSi, 6), baseAlvo.simbolo)
        val unAlvo = campos[alvo]!!.unidade
        val final = unidades.converter(resultadoSi, baseAlvo, unAlvo)
        if (unAlvo.simbolo != baseAlvo.simbolo) {
            passos += tx(R.string.calc_convertendo_para, unAlvo.simbolo, tx.sig(resultadoSi, 6), baseAlvo.simbolo, tx.sig(final, 6))
        }
        val notas = listOf(tx(R.string.calc_gas_nota))
        return ResultadoCalculo(
            titulo = tx(R.string.calc_gas_titulo, tx.minusNoMeio(tx(alvo.nome))),
            linhas = listOf(LinhaResultado("${tx(alvo.nome)} (${alvo.simbolo})", "${tx.sig(final, 5)} ${unAlvo.simbolo}", destaque = true)),
            passos = passos,
            notas = notas
        )
    }
}
