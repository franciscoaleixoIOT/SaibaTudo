package net.saibatudo.quimica

import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.answer.respostaEletronica
import net.saibatudo.quimica.ai.answer.respostaHess
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.prefs.Nivel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Intenções NOX, ENTALPIA, EQUILIBRIO e LIGACAO e a resposta enriquecida de configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §1, §2, §4):
 * os casos de web/test/calculadoras-respostas.test.mjs. Campos só do cliente (`concentracoes`, `cargaFormula`), respostas com fonte, números só do
 * pacote ou do cálculo, e falta de ΔHf° → resposta não resolvida dizendo o que falta. O fixture não traz `entalpiaFormacaoKJmol`: os valores de
 * entalpia são conferidos com o pacote real (data/quimica), quando existe.
 */
class CalculadorasRespostasTest {

    private val pacote = TestData.Fixture.pacote
    private val dic = dicionario(pacote)
    private val builder = AnswerBuilder(pacote, dic, Nivel.MEDIO)
    private fun p(q: String) = LocalNlu.parse(q, dic, null, dic.lexico)
    private fun r(q: String, b: AnswerBuilder = builder): Resposta = runBlocking { b.responder(q).second }

    private fun validar(r: Resposta, q: String) {
        val t = r.texto()
        assertFalse("$q: lixo no texto: ${t.take(200)}", Regex("""NaN|null\b|%\d\$|%s""").containsMatchIn(t))
        assertTrue("$q: sem fonte", r.fontes.isNotEmpty() && r.fontes.all { it.nome.isNotBlank() })
    }

    @Test fun nluNoxComCargaSeparadaIonsEGatilhoQueNaoViraNOx() {
        var x = p("nox do cromo no Cr2O7 2-")
        assertEquals(listOf<Any?>(Intent.NOX, "Cr2O7", -2, null), listOf(x.intent, x.formula, x.cargaFormula, x.elemento))
        x = p("número de oxidação do Mn no MnO4-")
        assertEquals(listOf<Any?>(Intent.NOX, "MnO4-", null), listOf(x.intent, x.formula, x.cargaFormula))
        x = p("NOX do enxofre no H2SO4")
        assertEquals(listOf<Any?>(Intent.NOX, "S", "1118", "H2SO4"), listOf(x.intent, x.elemento, x.composto, x.formula))
        x = p("nox do nitrogênio no NH4+")
        assertEquals(listOf<Any?>(Intent.NOX, "N", "NH4+"), listOf(x.intent, x.elemento, x.formula))
        assertEquals(Intent.PROPRIEDADE, p("estados de oxidação do ferro").intent)
        assertEquals(Intent.MASSA_MOLAR, p("massa molar do H2SO4").intent)
    }

    @Test fun nluEquilibrioComSetaDuplaConcentracoesETemperatura() {
        var x = p("calcule Kc de N2 + 3 H2 <=> 2 NH3 com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L")
        assertEquals(Intent.EQUILIBRIO, x.intent)
        assertEquals("N2 + 3 H2 ⇌ 2 NH3", x.equacao)
        assertEquals(listOf(Triple("N2", 0.5, "mol/L"), Triple("H2", 1.5, "mol/L"), Triple("NH3", 0.2, "mol/L")), x.concentracoes.map { Triple(it.especie, it.valor, it.unidade) })
        x = p("com [N2O4] = 0,04 mol/L e [NO2] é 0,12 mol/L, qual o Kc de N2O4 ⇌ 2 NO2?")
        assertEquals(listOf<Any?>(Intent.EQUILIBRIO, "N2O4 ⇌ 2 NO2", listOf("N2O4", "NO2")), listOf(x.intent, x.equacao, x.concentracoes.map { it.especie }))
        x = p("Kp de 2 SO2 + O2 -> 2 SO3 a 500 K")
        assertEquals(listOf<Any?>(Intent.EQUILIBRIO, "2 SO2 + O2 -> 2 SO3"), listOf(x.intent, x.equacao))
        assertTrue(x.quantidades.any { it.valor == 500.0 && it.unidade == "K" })
        assertEquals(Intent.CONCEITO, p("o que é Kc?").intent)
        assertEquals("sem pista de equilíbrio continua BALANCEAR", Intent.BALANCEAR, p("balancear N2 + H2 -> NH3").intent)
        assertEquals(listOf("H2" to 1.5, "I2" to 0.5), Quantidades.lerConcentracoes("[H2] = 1.5 mol/L and [I2] is 0.5 mol/L", null, Lexico.de("en")).map { it.especie to it.valor })
    }

    @Test fun nluEntalpiaPropriedadeConceitoELigacao() {
        val casos = listOf(
            "ΔH da combustão do metano" to Intent.ENTALPIA, "entalpia de formação da água" to Intent.PROPRIEDADE, "ΔHf do metano" to Intent.PROPRIEDADE,
            "o que é entalpia?" to Intent.CONCEITO, "variação de entalpia de 2 H2 + O2 → 2 H2O" to Intent.ENTALPIA, "entalpia da reação pela lei de Hess" to Intent.ENTALPIA,
            "calor liberado na queima de 10 g de etanol" to Intent.ENTALPIA, "quantos gramas de CO2 se formam na queima de 16 g de metano?" to Intent.ESTEQUIOMETRIA,
            "tipo de ligação do NaCl" to Intent.LIGACAO, "que ligação há entre H e Cl" to Intent.LIGACAO, "o que é ligação iônica" to Intent.CONCEITO,
            "número de ligações rotáveis da aspirina" to Intent.PROPRIEDADE, "elétrons de valência do enxofre" to Intent.PROPRIEDADE
        )
        for ((q, intent) in casos) assertEquals(q, intent, p(q).intent)
        assertEquals("entalpiaFormacaoKJmol", p("entalpia de formação da água").propriedade)
        assertEquals("entalpiaFormacaoKJmol", p("ΔHf do metano").propriedade)
        assertEquals("configuracaoEletronica", p("elétrons de valência do enxofre").propriedade)
        val l = p("que ligação há entre H e Cl")
        assertEquals("H" to listOf("H", "Cl"), l.elemento to l.elementos)
    }

    @Test fun respostasNoxLigacaoKcKpEConfiguracaoEletronicaComFonte() {
        var a = r("NOX do enxofre no H2SO4")
        validar(a, "nox")
        assertEquals("NOX de enxofre em H₂SO₄: +6", a.titulo)
        assertTrue(a.fontes.any { it.nome.startsWith("Regras de NOX") })
        a = r("nox do carbono em C3H8")
        assertTrue(a.texto(), a.texto().contains("−8/3") && a.texto().contains("NOX médio"))
        a = r("tipo de ligação do NaCl")
        validar(a, "NaCl")
        assertTrue(a.texto(), a.texto().contains("Cl–Na: iônica") && a.texto().contains("2,23") && a.texto().contains("convenção"))
        a = r("que ligação há entre H e Cl?")
        assertTrue(a.texto(), a.texto().contains("H–Cl: covalente polar"))
        a = r("a ligação no CO2 é polar ou apolar?")
        assertTrue(a.texto(), a.texto().contains("geometria"))
        a = r("calcule Kc de N2 + 3 H2 <=> 2 NH3 com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L a 500 K")
        validar(a, "kc")
        assertEquals(Intent.EQUILIBRIO, a.intent)
        assertTrue(a.entendida)
        val kc = 0.2 * 0.2 / (0.5 * 1.5 * 1.5 * 1.5)
        assertTrue(a.texto(), a.texto().contains("Kc: ${Tx.pt.sig(kc, 4)}") && a.texto().contains("Kp") && a.texto().contains("Δn (gases): produtos − reagentes: -2"))
        assertTrue(a.fontes.any { "CODATA" in it.nome } && a.fontes.any { "ação das massas" in it.nome })
        a = r("Kc de N2 + 3 H2 ⇌ 2 NH3 com [N2] = 0,5 mol/L")
        assertFalse(a.entendida)
        assertTrue(a.texto(), a.texto().contains("Faltam as concentrações no equilíbrio de: H₂ e NH₃"))
        a = r("configuração eletrônica do ferro")
        validar(a, "Fe")
        val campos = a.blocos.filterIsInstance<Bloco.Campo>().associate { it.rotulo to it.valor }
        assertEquals("2, 8, 14, 2 (K, L, M, N)", campos["Elétrons por camada"])
        assertTrue(campos["Notação completa (ordem de preenchimento, Linus Pauling)"]!!.endsWith("4s² 3d⁶"))
        assertTrue(campos["Camada de valência"]!!.startsWith("N (n = 4), 2"))
        assertTrue(a.acoes.any { it is Acao.AbrirCalculadora && it.tipo == TipoCalculadora.ELETRONICA && it.preenchimento["elemento"] == "Fe" })
        a = r("ΔH da combustão do metano")
        assertFalse("o fixture não traz ΔHf°", a.entendida)
        assertTrue(a.texto(), a.texto().contains("não tem a entalpia padrão de formação (ΔHf°) de: CH₄, CO₂ e H₂O"))
        val fe2 = builder.respostaEletronica("Fe", 2)
        assertTrue(fe2.entendida)
        assertTrue(fe2.texto(), fe2.texto().contains("2, 8, 14 (K, L, M)"))
        val hess = builder.respostaHess("C + 1/2 O2 -> CO", listOf("C + O2 -> CO2" to -393.5, "CO + 1/2 O2 -> CO2" to -283.0))
        validar(hess, "hess calc")
        assertTrue(hess.texto(), hess.texto().contains("-110,5 kJ") && hess.texto().contains("invertida"))
        a = r("entalpia da reação pela lei de Hess")
        assertTrue(a.acoes.any { it is Acao.AbrirCalculadora && it.tipo == TipoCalculadora.ENTALPIA && it.preenchimento["modo"] == "hess" })
    }

    @Test fun entalpiaComOsDhfDoPacoteReal() {
        val real = TestData.Real?.pacote
        assumeTrue("pacote real (data/quimica) ausente", real != null)
        val b = AnswerBuilder(real!!, dicionario(real), Nivel.MEDIO)
        var a = r("ΔH da combustão do metano", b)
        validar(a, "metano")
        assertEquals(Intent.ENTALPIA, a.intent)
        assertTrue(a.texto(), a.entendida && a.texto().contains("kJ/mol") && a.texto().contains("exotérmica"))
        assertTrue(a.fontes.any { it.nome.contains("ΔHf° = 0") })
        a = r("calor liberado na queima de 8 g de metano", b)
        validar(a, "amostra")
        assertTrue(a.texto(), a.blocos.filterIsInstance<Bloco.Campo>().any { it.rotulo.contains("8 g") && it.valor.startsWith("-4") })
        a = r("variação de entalpia da reação CH4 + 2 O2 -> CO2 + 2 H2O", b)
        validar(a, "equação")
        assertTrue(a.texto(), a.entendida && a.texto().contains("ΔH° da reação"))
        a = r("qual a entalpia de formação do metano?", b)
        assertEquals(Intent.PROPRIEDADE, a.intent)
        assertTrue(a.texto(), a.texto().contains("-74,6") || a.texto().contains("−74,6"))
        val en = AnswerBuilder(real, dicionario(real, "en"), Nivel.MEDIO)
        a = r("enthalpy of combustion of methane", en)
        assertTrue(a.texto(Tx.de("en")), a.texto(Tx.de("en")).contains("exothermic"))
        a = r("oxidation number of sulfur in H2SO4", en)
        assertEquals("Oxidation number of sulfur in H₂SO₄: +6", a.titulo)
        a = r("what type of bond is in NaCl?", en)
        assertTrue(a.texto(Tx.de("en")), a.texto(Tx.de("en")).contains("ionic"))
    }
}
