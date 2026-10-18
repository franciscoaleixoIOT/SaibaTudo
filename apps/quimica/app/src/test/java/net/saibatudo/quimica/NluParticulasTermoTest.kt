package net.saibatudo.quimica

import com.google.gson.JsonParser
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.NluValidator
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Contrato do NLU de 18/10/2026 (docs/CALCULADORAS_2026-10-17.md §7), espelho de web/test/nlu-particulas-termo.test.mjs: propriedades
 * energiaGibbsFormacaoKJmol (ΔGf°), entropiaPadraoJmolK (S°) e particulas (prótons, nêutrons e elétrons de um átomo ou íon), os campos só do
 * cliente `cargaFormula` (íon) e `numeroMassa`, e Kc/Kp sem equação → CONCEITO. Só a INTERPRETAÇÃO (as respostas vêm em outra camada).
 */
class NluParticulasTermoTest {

    private val pacote = TestData.Fixture.pacote
    private val dic = dicionario(pacote)
    private val dicEn = dicionario(pacote, "en")
    private fun p(q: String) = LocalNlu.parse(q, dic, null, dic.lexico)
    private fun resumo(q: String, d: net.saibatudo.quimica.ai.nlu.Dicionario = dic): List<Any?> =
        LocalNlu.parse(q, d, null, d.lexico).let { listOf(it.intent, it.elemento, it.propriedade, it.cargaFormula, it.numeroMassa) }

    @Test fun idsNovosNoLexicoNasCincoLinguasEPistas() {
        for (idioma in listOf("pt-BR", "en", "es", "de", "fr")) {
            val lex = Lexico.de(idioma)
            for (nome in listOf("deFormacao", "constanteEquilibrio", "ionRomano")) lex.pista(nome)
        }
        for (id in listOf("energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK", "particulas")) assertTrue(id, dic.propriedade(id) != null)
        assertEquals("elemento", dic.propriedade("particulas")!!.alvo)
    }

    @Test fun ionsEIsotoposEmTodasAsGrafias() {
        fun ion(q: String) = LocalNlu.lerIonsEIsotopo(q, dic).ions
        assertEquals(listOf("Fe" to 2), ion("quantos elétrons tem o Fe2+?"))
        assertEquals(listOf("Fe" to 2), ion("Fe²⁺"))
        assertEquals(listOf("Fe" to 2), ion("o Fe+2"))
        assertEquals(listOf("Fe" to 2), ion("o Fe 2+"))
        assertEquals(listOf("Fe" to 3), ion("o Fe^{3+}"))
        assertEquals(listOf("Cl" to -1), ion("íon Cl-"))
        assertEquals(listOf("Cl" to -1), ion("íon Cl⁻"))
        assertEquals(listOf("S" to -2), ion("S2-"))
        assertEquals(listOf("Na" to 1, "Cl" to -1), ion("cátion Na+ e ânion Cl-"))
        assertEquals(listOf("Fe" to 2), ion("íon ferro 2+"))
        assertEquals(listOf("Fe" to 3), ion("íon ferro(III)"))
        assertEquals(listOf("Fe" to 2), LocalNlu.lerIonsEIsotopo("iron(II) ion", dicEn, dicEn.lexico).ions)
        assertEquals(emptyList<Pair<String, Int>>(), ion("Fe + O2 -> Fe2O3"))
        assertEquals(emptyList<Pair<String, Int>>(), ion("NOX do S no SO4 2-"))
        assertEquals(emptyList<Pair<String, Int>>(), ion("o íon OH-"))
        fun iso(q: String, pista: Boolean = false) = LocalNlu.lerIonsEIsotopo(q, dic, dic.lexico, pista).isotopo
        assertEquals("Fe" to 56, iso("Fe-56"))
        assertEquals("C" to 14, iso("C-14"))
        assertEquals("Fe" to 56, iso("⁵⁶Fe"))
        assertEquals("Fe" to 56, iso("ferro-56"))
        assertEquals("C" to 14, iso("carbono-14"))
        assertEquals("C" to 14, iso("quantos nêutrons tem o carbono 14?"))
        assertNull(iso("56Fe"))
        assertEquals("Fe" to 56, iso("56Fe", true))
        assertNull(iso("2Na", true))
        assertNull(iso("C-200"))
    }

    @Test fun particulasDeAtomoIonENumeroDeMassa() {
        val P = Intent.PROPRIEDADE
        assertEquals(listOf<Any?>(P, "Fe", "particulas", null, null), resumo("quantos prótons tem o ferro"))
        assertEquals(listOf<Any?>(P, "Fe", "particulas", 2, null), resumo("quantos prótons, nêutrons e elétrons tem o Fe2+?"))
        assertEquals(listOf<Any?>(P, "Cl", "particulas", -1, null), resumo("quantos elétrons tem o íon Cl-"))
        assertEquals(listOf<Any?>(P, "Fe", "particulas", 2, null), resumo("quantos elétrons tem o íon ferro 2+"))
        assertEquals(listOf<Any?>(P, "C", "particulas", null, 14), resumo("quantos nêutrons tem o carbono-14"))
        assertEquals(listOf<Any?>(P, "Fe", "particulas", null, 56), resumo("número de massa do Fe-56"))
        assertEquals(listOf<Any?>(P, "Fe", "particulas", null, 56), resumo("quantos nêutrons tem o 56Fe"))
        assertEquals(listOf<Any?>(P, "O", "particulas", null, null), resumo("quantas partículas subatômicas tem o oxigênio"))
        assertEquals(listOf<Any?>(Intent.ELEMENTO, "Fe", null, 2, null), resumo("o que é Fe2+"))
        assertEquals(listOf<Any?>(Intent.ELEMENTO, "O", null, -2, null), resumo("ânion O2-"))
        // precedência: pistas mais específicas vencem
        assertEquals("configuracaoEletronica", p("elétrons de valência do Na").propriedade)
        assertEquals("configuracaoEletronica", p("distribuição eletrônica do ferro").propriedade)
        assertEquals("numeroAtomico", p("número atômico do Fe").propriedade)
        assertEquals(Intent.CONCEITO, p("o que são elétrons?").intent)
        assertEquals(Intent.ESTEQUIOMETRIA, p("quantas partículas há em 2 mol de Fe").intent)
        val semi = p("Fe2+ + 2 e- -> Fe")
        assertEquals(listOf<Any?>(Intent.BALANCEAR, null), listOf(semi.intent, semi.cargaFormula))
        val lig = p("qual a ligação entre Na+ e Cl-")
        assertEquals(listOf<Any?>(Intent.LIGACAO, listOf("Na", "Cl")), listOf(lig.intent, lig.elementos))
        assertEquals(listOf<Any?>(P, "Fe", "particulas", 2, null), resumo("how many electrons does Fe2+ have", dicEn))
        assertEquals(listOf<Any?>(P, "C", "particulas", null, 14), resumo("how many neutrons are in carbon-14", dicEn))
    }

    @Test fun gibbsEEntropiaComDeltaFormasEComparar() {
        fun t(q: String, d: net.saibatudo.quimica.ai.nlu.Dicionario = dic) = LocalNlu.parse(q, d, null, d.lexico).let { listOf(it.intent, it.propriedade, it.composto) }
        val P = Intent.PROPRIEDADE
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "280"), t("energia livre de Gibbs de formação do CO2"))
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "297"), t("ΔGf do metano"))
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "962"), t("ΔG°f da água"))
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "222"), t("ΔG de formação da amônia"))
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "962"), t("entalpia livre de formação da água"))
        assertEquals(listOf<Any?>(P, "entalpiaFormacaoKJmol", "297"), t("ΔH de formação do metano"))
        assertEquals(listOf<Any?>(Intent.ENTALPIA, null, "297"), t("ΔH da combustão do metano"))
        assertEquals(listOf<Any?>(P, "entropiaPadraoJmolK", "962"), t("entropia padrão da água"))
        assertEquals(listOf<Any?>(P, "entropiaPadraoJmolK", "297"), t("qual a entropia do metano?"))
        assertEquals(listOf<Any?>(Intent.COMPARAR, "entropiaPadraoJmolK", "962"), t("qual tem maior entropia padrão, água ou metano?"))
        assertEquals(listOf<Any?>(P, "energiaGibbsFormacaoKJmol", "962"), t("what is the standard Gibbs free energy of formation of water", dicEn))
        assertEquals(listOf<Any?>(P, "entropiaPadraoJmolK", "297"), t("standard molar entropy of methane", dicEn))
        assertEquals(Intent.CONCEITO, p("o que é entropia?").intent)
        assertEquals(Intent.CONCEITO, p("explique entropia").intent)
    }

    @Test fun kcSemEquacaoEhConceito() {
        for (q in listOf("qual o Kp a 500 K", "como calcular o Kc", "calcule o Kc da reação", "o que é Kc", "fórmula do Kp", "constante de equilíbrio")) {
            val x = p(q)
            assertEquals(q, listOf<Any?>(Intent.CONCEITO, LocalNlu.CONCEITO_CONSTANTE_EQUILIBRIO, null), listOf(x.intent, x.conceito, x.propriedade))
        }
        assertEquals(Intent.CONCEITO, LocalNlu.parse("how to calculate Kp", dicEn, null, dicEn.lexico).intent)
        assertEquals(Intent.EQUILIBRIO, p("expressão do Kc para N2 + 3 H2 ⇌ 2 NH3").intent)
        assertEquals(Intent.EQUILIBRIO, p("Kp de 2 SO2 + O2 -> 2 SO3 a 500 K").intent)
    }

    @Test fun nuvemMesclaOsCamposDoClienteDoMesmoElemento() {
        fun v(q: String, nlu: String) = NluValidator.validar(JsonParser.parseString(nlu).asJsonObject, null, dic, q).query
        var x = v("quantos elétrons tem o Fe2+?", """{"intent":"PROPRIEDADE","elemento":"Fe","propriedade":"particulas"}""")!!
        assertEquals(listOf<Any?>(Intent.PROPRIEDADE, "Fe", "particulas", 2, null), listOf(x.intent, x.elemento, x.propriedade, x.cargaFormula, x.numeroMassa))
        x = v("quantos nêutrons tem o carbono-14?", """{"intent":"PROPRIEDADE","elemento":"C","propriedade":"particulas"}""")!!
        assertEquals(14, x.numeroMassa)
        x = v("quantos elétrons tem o Fe2+ e o cloro?", """{"intent":"PROPRIEDADE","elemento":"Cl","propriedade":"particulas"}""")!!
        assertNull(x.cargaFormula)
        x = v("como calcular o Kc", """{"intent":"CONCEITO"}""")!!
        assertEquals(listOf<Any?>(Intent.CONCEITO, LocalNlu.CONCEITO_CONSTANTE_EQUILIBRIO), listOf(x.intent, x.conceito))
    }
}
