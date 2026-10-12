package net.saibatudo.quimica.domain.calc

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Constante
import net.saibatudo.quimica.domain.Textos
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.sqrt

enum class TipoForte(@param:StringRes val rotulo: Int) { ACIDO(R.string.forte_acido), BASE(R.string.forte_base) }

/** Concentração (molaridade), diluição e pH de ácidos e bases fortes. Tudo calculado localmente, com passos. */
object Solucoes {

    /** [nome] é o substantivo com artigo, já no idioma ("A massa", "O volume", "C₁"): a mensagem é "<nome> deve ser um número positivo.". */
    private fun positivo(valor: Double, nome: String) {
        if (!valor.isFinite() || valor <= 0.0) throw CalculoInvalido(R.string.erro_deve_ser_positivo, nome)
    }

    /** Molaridade M = n / V, com n = m / MM. */
    fun molaridade(t: Textos, massa: Qtd, massaMolar: Double, volume: Qtd, unidades: Unidades, formula: String? = null): ResultadoCalculo {
        positivo(massa.valor, t(R.string.sol_a_massa)); positivo(volume.valor, t(R.string.sol_o_volume)); positivo(massaMolar, t(R.string.sol_a_massa_molar))
        val g = unidades.porSimbolo("g", "massa") ?: throw CalculoInvalido(R.string.erro_falta_unidade_grama)
        val l = unidades.porSimbolo("L", "volume") ?: throw CalculoInvalido(R.string.erro_falta_unidade_litro)
        val massaG = unidades.converter(massa.valor, massa.unidade, g)
        val volumeL = unidades.converter(volume.valor, volume.unidade, l)
        val mols = massaG / massaMolar
        val m = mols / volumeL
        val passos = listOf(
            t(R.string.calc_sol_massa_passo, unidades.converterComPasso(t, massa.valor, massa.unidade, g).second),
            t(R.string.calc_sol_volume_passo, unidades.converterComPasso(t, volume.valor, volume.unidade, l).second),
            t(R.string.calc_sol_mols_de_massa, t.sig(massaG, 5), t.sig(massaMolar, 5), t.sig(mols, 5)),
            t(R.string.calc_sol_molaridade_passo, t.sig(mols, 5), t.sig(volumeL, 5), t.sig(m, 5))
        )
        return ResultadoCalculo(
            titulo = if (formula != null) t(R.string.calc_sol_molaridade_de, formula) else t(R.string.calc_sol_molaridade),
            linhas = listOf(
                LinhaResultado(t(R.string.calc_sol_qtd_materia), "${t.sig(mols, 5)} mol"),
                LinhaResultado(t(R.string.calc_sol_molaridade), "${t.sig(m, 5)} mol/L", destaque = true)
            ),
            passos = passos
        )
    }

    /** Massa de soluto para preparar [volume] de solução na concentração [conc]: m = C · V · MM. */
    fun massaParaPreparar(t: Textos, conc: Qtd, volume: Qtd, massaMolar: Double, unidades: Unidades, formula: String? = null): ResultadoCalculo {
        positivo(conc.valor, t(R.string.sol_a_concentracao)); positivo(volume.valor, t(R.string.sol_o_volume)); positivo(massaMolar, t(R.string.sol_a_massa_molar))
        val molL = unidades.porSimbolo("mol/L", "concentracao") ?: throw CalculoInvalido(R.string.erro_falta_unidade_mol_l)
        val l = unidades.porSimbolo("L", "volume") ?: throw CalculoInvalido(R.string.erro_falta_unidade_litro)
        val c = unidades.converter(conc.valor, conc.unidade, molL)
        val v = unidades.converter(volume.valor, volume.unidade, l)
        val mols = c * v
        val massa = mols * massaMolar
        val passos = listOf(
            t(R.string.calc_sol_concentracao_passo, unidades.converterComPasso(t, conc.valor, conc.unidade, molL).second),
            t(R.string.calc_sol_volume_passo, unidades.converterComPasso(t, volume.valor, volume.unidade, l).second),
            t(R.string.calc_sol_mols_de_conc, t.sig(c, 5), t.sig(v, 5), t.sig(mols, 5)),
            t(R.string.calc_sol_massa_de_mols, t.sig(mols, 5), t.sig(massaMolar, 5), t.sig(massa, 5))
        )
        return ResultadoCalculo(
            titulo = if (formula != null) t(R.string.calc_sol_preparar_de, formula) else t(R.string.calc_sol_preparar),
            linhas = listOf(LinhaResultado(t(R.string.calc_sol_massa_soluto), "${t.sig(massa, 5)} g", destaque = true)),
            passos = passos,
            notas = listOf(t(R.string.calc_sol_nota_dissolver))
        )
    }

    /** Diluição C₁V₁ = C₂V₂: deixe exatamente um dos quatro campos vazio. */
    fun diluicao(t: Textos, c1: CampoQtd, v1: CampoQtd, c2: CampoQtd, v2: CampoQtd, unidades: Unidades): ResultadoCalculo {
        val campos = listOf("C₁" to c1, "V₁" to v1, "C₂" to c2, "V₂" to v2)
        val vazios = campos.filter { it.second.valor == null }
        if (vazios.size != 1) throw CalculoInvalido(R.string.erro_um_campo_vazio)
        for ((nome, c) in campos) {
            val esperado = if (nome.startsWith("C")) "concentracao" else "volume"
            if (c.unidade.grandeza != esperado) throw CalculoInvalido(R.string.erro_unidade_nao_serve, c.unidade.simbolo, nome)
            c.valor?.let { positivo(it, nome) }
        }
        val molL = unidades.porSimbolo("mol/L", "concentracao") ?: throw CalculoInvalido(R.string.erro_falta_unidade_mol_l)
        val l = unidades.porSimbolo("L", "volume") ?: throw CalculoInvalido(R.string.erro_falta_unidade_litro)
        fun si(c: CampoQtd) = c.valor?.let { unidades.converter(it, c.unidade, if (c.unidade.grandeza == "volume") l else molL) }
        val a = si(c1); val b = si(v1); val c = si(c2); val d = si(v2)
        val (nome, resultadoBase, unidadeBase) = when (vazios[0].first) {
            "C₁" -> Triple("C₁", c!! * d!! / b!!, molL)
            "V₁" -> Triple("V₁", c!! * d!! / a!!, l)
            "C₂" -> Triple("C₂", a!! * b!! / d!!, molL)
            else -> Triple("V₂", a!! * b!! / c!!, l)
        }
        val alvo = campos.first { it.first == nome }.second
        val final = unidades.converter(resultadoBase, unidadeBase, alvo.unidade)
        val formula = when (nome) {
            "C₁" -> "C₁ = C₂·V₂ / V₁"; "V₁" -> "V₁ = C₂·V₂ / C₁"; "C₂" -> "C₂ = C₁·V₁ / V₂"; else -> "V₂ = C₁·V₁ / C₂"
        }
        val passos = mutableListOf(t(R.string.calc_dil_principio))
        passos += t(R.string.calc_dil_valores, campos.filter { it.second.valor != null }
            .joinToString("; ") { (n, q) -> "$n = ${t.sig(si(q)!!, 5)} ${if (q.unidade.grandeza == "volume") "L" else "mol/L"}" })
        passos += "$formula = ${t.sig(resultadoBase, 5)} ${unidadeBase.simbolo}."
        if (alvo.unidade.simbolo != unidadeBase.simbolo) passos += t(R.string.calc_dil_convertendo, t.sig(resultadoBase, 5), unidadeBase.simbolo, t.sig(final, 5), alvo.unidade.simbolo)
        val notas = mutableListOf<String>()
        val c1v = if (nome == "C₁") resultadoBase else a!!
        val c2v = if (nome == "C₂") resultadoBase else c!!
        if (c2v > c1v * 1.000000001) notas += t(R.string.calc_dil_nota_c2_maior)
        return ResultadoCalculo(
            titulo = t(R.string.calc_dil_titulo),
            linhas = listOf(LinhaResultado(nome, "${t.sig(final, 5)} ${alvo.unidade.simbolo}", destaque = true)),
            passos = passos,
            notas = notas
        )
    }

    /**
     * pH de ácido ou base FRACO com a constante de equilíbrio informada ([k] = Ka do ácido ou Kb da base): resolve a equação do
     * segundo grau x² + K·x − K·C = 0 para [H⁺] (ácido) ou [OH⁻] (base), sem aproximações.
     */
    fun phFraco(t: Textos, tipo: TipoForte, conc: Qtd, k: Double, nomeK: String, unidades: Unidades, pKw: Double = 14.0, pKwDoPacote: Boolean = false): ResultadoCalculo {
        positivo(conc.valor, t(R.string.sol_a_concentracao))
        positivo(k, t(R.string.sol_a_constante, nomeK))
        val molL = unidades.porSimbolo("mol/L", "concentracao") ?: throw CalculoInvalido(R.string.erro_falta_unidade_mol_l)
        val c = unidades.converter(conc.valor, conc.unidade, molL)
        val x = (-k + sqrt(k * k + 4 * k * c)) / 2
        val passos = mutableListOf<String>()
        val ph: Double
        val poh: Double
        if (tipo == TipoForte.ACIDO) {
            passos += t(R.string.calc_ph_fraco_acido_1, nomeK, t.sig(c, 5), t.sig(k, 5))
            passos += t(R.string.calc_ph_fraco_acido_2, nomeK, t.sig(x, 5))
            ph = -log10(x); poh = pKw - ph
            passos += t(R.string.calc_ph_fraco_acido_3, t.fixo(ph, 2), t.fixo(poh, 2))
        } else {
            passos += t(R.string.calc_ph_fraco_base_1, nomeK, t.sig(c, 5), t.sig(k, 5))
            passos += t(R.string.calc_ph_fraco_base_2, nomeK, t.sig(x, 5))
            poh = -log10(x); ph = pKw - poh
            passos += t(R.string.calc_ph_fraco_base_3, t.fixo(poh, 2), t.fixo(ph, 2))
        }
        val grau = x / c
        passos += t(R.string.calc_ph_grau_passo, t.sig(grau * 100, 3))
        val notas = mutableListOf(
            if (pKwDoPacote) t(R.string.calc_ph_nota_pkw_pacote, t.fixo(pKw, 2)) else t(R.string.calc_ph_nota_kw_padrao),
            t(R.string.calc_ph_nota_k_informada, nomeK)
        )
        return ResultadoCalculo(
            titulo = t(if (tipo == TipoForte.ACIDO) R.string.calc_ph_titulo_acido_fraco else R.string.calc_ph_titulo_base_fraca),
            linhas = listOf(LinhaResultado("pH", t.fixo(ph, 2), destaque = true), LinhaResultado("pOH", t.fixo(poh, 2)), LinhaResultado(t(R.string.calc_ph_linha_grau), "${t.sig(grau * 100, 3)} %")),
            passos = passos, notas = notas
        )
    }

    /** pKw usado nos cálculos: da constante Kw/pKw do pacote, se existir; senão 14 a 25 °C (indicado nas notas). */
    fun pKwDoPacote(constantes: List<Constante>): Pair<Double, Boolean> {
        constantes.firstOrNull { it.id.equals("pKw", true) }?.let { return it.valor to true }
        constantes.firstOrNull { it.id.equals("Kw", true) && it.valor > 0 }?.let { return -log10(it.valor) to true }
        return 14.0 to false
    }

    /**
     * pH de ácido ou base forte, totalmente dissociado: [H⁺] (ou [OH⁻]) = n·C, com a correção da autoionização da água
     * (equação do segundo grau), que só importa em soluções muito diluídas.
     */
    fun phForte(t: Textos, tipo: TipoForte, conc: Qtd, ionizaveis: Int, unidades: Unidades, pKw: Double = 14.0, pKwDoPacote: Boolean = false): ResultadoCalculo {
        positivo(conc.valor, t(R.string.sol_a_concentracao))
        if (ionizaveis < 1 || ionizaveis > 4) throw CalculoInvalido(R.string.erro_ph_ionizaveis)
        val molL = unidades.porSimbolo("mol/L", "concentracao") ?: throw CalculoInvalido(R.string.erro_falta_unidade_mol_l)
        val c = unidades.converter(conc.valor, conc.unidade, molL)
        val total = c * ionizaveis
        val kw = 10.0.pow(-pKw)
        val ion = (total + sqrt(total * total + 4 * kw)) / 2   // [H+] (ácido) ou [OH-] (base) incluindo a água
        val passos = mutableListOf<String>()
        passos += t(if (tipo == TipoForte.ACIDO) R.string.calc_ph_forte_acido_ionizado else R.string.calc_ph_forte_base_ionizada, ionizaveis, t.sig(c, 5), t.sig(total, 5))
        val ph: Double
        val poh: Double
        if (tipo == TipoForte.ACIDO) {
            ph = -log10(ion); poh = pKw - ph
            passos += t(R.string.calc_ph_forte_acido_ph, t.sig(ion, 5), t.fixo(ph, 2))
            passos += t(R.string.calc_ph_forte_acido_poh, t.fixo(pKw, 2), t.fixo(ph, 2), t.fixo(poh, 2))
        } else {
            poh = -log10(ion); ph = pKw - poh
            passos += t(R.string.calc_ph_forte_base_poh, t.sig(ion, 5), t.fixo(poh, 2))
            passos += t(R.string.calc_ph_forte_base_ph, t.fixo(pKw, 2), t.fixo(poh, 2), t.fixo(ph, 2))
        }
        val notas = mutableListOf<String>()
        notas += if (pKwDoPacote) t(R.string.calc_ph_nota_pkw_pacote, t.fixo(pKw, 2))
        else t(R.string.calc_ph_nota_kw_padrao)
        if (abs(ion - total) / total > 0.01) notas += t(R.string.calc_ph_nota_diluida)
        notas += t(R.string.calc_ph_nota_vale_fortes)
        val classe = t(when {
            ph < 7 - 0.005 -> R.string.calc_ph_solucao_acida
            ph > 7 + 0.005 -> R.string.calc_ph_solucao_basica
            else -> R.string.calc_ph_solucao_neutra
        })
        return ResultadoCalculo(
            titulo = t(if (tipo == TipoForte.ACIDO) R.string.calc_ph_titulo_acido_forte else R.string.calc_ph_titulo_base_forte),
            linhas = listOf(
                LinhaResultado("pH", t.fixo(ph, 2), destaque = true),
                LinhaResultado("pOH", t.fixo(poh, 2)),
                LinhaResultado(t(R.string.calc_ph_linha_solucao), classe)
            ),
            passos = passos,
            notas = notas
        )
    }
}
