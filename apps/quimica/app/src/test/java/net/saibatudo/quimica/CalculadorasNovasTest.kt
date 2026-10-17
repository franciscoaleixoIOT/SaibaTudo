package net.saibatudo.quimica

import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.domain.calc.DadosElementos
import net.saibatudo.quimica.domain.calc.Eletronica
import net.saibatudo.quimica.domain.calc.ElementoLigacao
import net.saibatudo.quimica.domain.calc.Entalpia
import net.saibatudo.quimica.domain.calc.EspecieEntalpia
import net.saibatudo.quimica.domain.calc.Equilibrio
import net.saibatudo.quimica.domain.calc.ErroEquacao
import net.saibatudo.quimica.domain.calc.Ligacao
import net.saibatudo.quimica.domain.calc.Nox
import net.saibatudo.quimica.domain.calc.Racional
import net.saibatudo.quimica.domain.calc.Unidades
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs
import kotlin.math.pow

/**
 * Calculadoras novas (docs/CALCULADORAS_2026-10-17.md §2): os MESMOS casos de web/test/calc-novas.test.mjs (NOX, configuração eletrônica, tipo de
 * ligação, Kc/Kp, entalpia por formação, combustão e lei de Hess), com os mesmos dados de teste dos elementos (como no PubChem).
 */
class CalculadorasNovasTest {

    // [símbolo, Z, grupo, categoria, eletronegatividade, configuração (PubChem)] — os mesmos de calc-novas.test.mjs
    private val elementos: Map<String, Elemento> = listOf(
        listOf("H", 1, 1, "nao_metal", 2.2, "1s1"), listOf("He", 2, 18, "gas_nobre", null, "1s2"), listOf("Li", 3, 1, "metal_alcalino", 0.98, "[He] 2s1"),
        listOf("B", 5, 13, "semimetal", 2.04, "[He] 2s2 2p1"), listOf("C", 6, 14, "nao_metal", 2.55, "[He] 2s2 2p2"), listOf("N", 7, 15, "nao_metal", 3.04, "[He] 2s2 2p3"),
        listOf("O", 8, 16, "nao_metal", 3.44, "[He] 2s2 2p4"), listOf("F", 9, 17, "halogenio", 3.98, "[He] 2s2 2p5"), listOf("Na", 11, 1, "metal_alcalino", 0.93, "[Ne] 3s1"),
        listOf("Mg", 12, 2, "metal_alcalino_terroso", 1.31, "[Ne] 3s2"), listOf("Al", 13, 13, "metal_pos_transicao", 1.61, "[Ne] 3s2 3p1"), listOf("S", 16, 16, "nao_metal", 2.58, "[Ne] 3s2 3p4"),
        listOf("Cl", 17, 17, "halogenio", 3.16, "[Ne] 3s2 3p5"), listOf("K", 19, 1, "metal_alcalino", 0.82, "[Ar] 4s1"), listOf("Ca", 20, 2, "metal_alcalino_terroso", 1.0, "[Ar] 4s2"),
        listOf("Cr", 24, 6, "metal_transicao", 1.66, "[Ar] 3d5 4s1"), listOf("Mn", 25, 7, "metal_transicao", 1.55, "[Ar] 4s2 3d5"), listOf("Fe", 26, 8, "metal_transicao", 1.83, "[Ar] 4s2 3d6"),
        listOf("Cu", 29, 11, "metal_transicao", 1.9, "[Ar] 4s1 3d10"), listOf("Ba", 56, 2, "metal_alcalino_terroso", 0.89, "[Xe] 6s2"), listOf("I", 53, 17, "halogenio", 2.66, "[Kr] 5s2 4d10 5p5"),
        listOf("Xe", 54, 18, "gas_nobre", 2.6, "[Kr] 5s2 4d10 5p6"), listOf("La", 57, null, "lantanideo", 1.1, "[Xe] 6s2 5d1"), listOf("Au", 79, 11, "metal_transicao", 2.54, "[Xe] 6s1 4f14 5d10"),
        listOf("Og", 118, 18, "gas_nobre", null, "[Rn] 7s2 7p6 5f14 6d10 (prevista)")
    ).associate { l ->
        val s = l[0] as String
        s to Elemento(
            z = l[1] as Int, simbolo = s, nome = s, grupo = l[2] as Int?, categoria = CategoriaElemento.de(l[3] as String),
            eletronegatividade = (l[4] as Number?)?.toDouble(), configuracaoEletronica = l[5] as String
        )
    }
    private val dados = DadosElementos.de(elementos)
    private val un = Unidades.de(TestData.Fixture.pacote.regras)

    private fun nox(f: String, carga: Int? = null): Map<String, String> {
        val r = Nox.calcular(f, dados, carga)
        assertTrue("$f: $r", r.ok)
        return r.itens.associate { it.simbolo to it.texto }
    }

    private fun perto(a: Double, b: Double, tol: Double = 1e-9) = abs(a - b) <= tol * maxOf(1.0, abs(b))
    private fun el(s: String): ElementoLigacao? = elementos[s]?.let { ElementoLigacao(s, it.categoria.takeIf { c -> c != CategoriaElemento.DESCONHECIDA }?.id, it.eletronegatividade) }

    // ---- NOX ------------------------------------------------------------------------------------------------------------------------------

    @Test fun noxCasosDeLivroESomaConfereComACarga() {
        assertEquals(mapOf("Mn" to "+7", "O" to "−2"), nox("MnO4-"))
        assertEquals(mapOf("Cr" to "+6", "O" to "−2"), nox("Cr2O7 2-"))
        assertEquals("carga separada (ParsedQuery.cargaFormula)", mapOf("Cr" to "+6", "O" to "−2"), nox("Cr2O7", -2))
        assertEquals(mapOf("O" to "−2", "S" to "+6"), nox("SO4^2-"))
        assertEquals(mapOf("H" to "+1", "O" to "−2", "S" to "+6"), nox("H2SO4"))
        assertEquals(mapOf("C" to "−8/3", "H" to "+1"), nox("C3H8"))
        assertEquals(mapOf("H" to "+1", "O" to "−1"), nox("H2O2"))
        assertEquals(mapOf("H" to "−1", "Na" to "+1"), nox("NaH"))
        assertEquals(mapOf("H" to "+1", "N" to "−3"), nox("NH4+"))
        assertEquals(mapOf("K" to "+1", "Mn" to "+7", "O" to "−2"), nox("KMnO4"))
        assertEquals(mapOf("Cr" to "+6", "K" to "+1", "O" to "−2"), nox("K2Cr2O7"))
        val r = Nox.calcular("C3H8", dados)
        assertTrue(r.itens.first { it.simbolo == "C" }.medio)
        assertEquals("0", r.soma.toString())
        assertEquals("-1", Nox.calcular("MnO4-", dados).soma.toString())
    }

    @Test fun noxPeroxidoSuperoxidoOf2HidretosHalogenioSimplesIonEEletronegatividade() {
        assertEquals(mapOf("Na" to "+1", "O" to "−1"), nox("Na2O2"))
        assertEquals(mapOf("Ba" to "+2", "O" to "−1"), nox("BaO2"))
        assertEquals(mapOf("K" to "+1", "O" to "−1/2"), nox("KO2"))
        assertEquals(mapOf("F" to "−1", "O" to "+2"), nox("OF2"))
        assertEquals(mapOf("Ca" to "+2", "H" to "−1"), nox("CaH2"))
        assertEquals("semimetal do grupo 13 com metal: hidreto", mapOf("B" to "+3", "H" to "−1", "Na" to "+1"), nox("NaBH4"))
        assertEquals(mapOf("Al" to "+3", "O" to "−2"), nox("Al2O3"))
        assertEquals("com O presente o Cl não é o mais eletronegativo", mapOf("Cl" to "+5", "K" to "+1", "O" to "−2"), nox("KClO3"))
        assertEquals(mapOf("Cl" to "−1", "I" to "+1"), nox("ICl"))
        assertEquals(mapOf("Cl" to "−1", "H" to "+1"), nox("HCl"))
        assertEquals(mapOf("Cl" to "0"), nox("Cl2"))
        assertEquals(mapOf("Fe" to "0"), nox("Fe"))
        assertEquals(mapOf("Fe" to "+3"), nox("Fe3+"))
        assertEquals(mapOf("Fe" to "+8/3", "O" to "−2"), nox("Fe3O4"))
        assertEquals("S mais eletronegativo: −2 do grupo 16", mapOf("C" to "+4", "S" to "−2"), nox("CS2"))
        assertEquals(mapOf("C" to "+2", "H" to "+1", "N" to "−3"), nox("HCN"))
        assertEquals(mapOf("C" to "−4", "H" to "+1"), nox("CH4"))
        assertEquals("balanco", Nox.calcular("C3H8", dados).itens.first { it.simbolo == "C" }.regra)
        assertEquals("peroxido", Nox.calcular("H2O2", dados).itens.first { it.simbolo == "O" }.regra)
        assertEquals("superoxido", Nox.calcular("KO2", dados).itens.first { it.simbolo == "O" }.regra)
    }

    @Test fun noxErrosSemNumeroInventadoETextoNox() {
        assertEquals("formula", Nox.calcular("Xy2", dados).erro)
        assertEquals("hidrato", Nox.calcular("CuSO4·5H2O", dados).erro)
        val semDados = Nox.calcular("KMnO4", DadosElementos.de(elementos.filterKeys { it !in setOf("K", "Mn") }))
        assertFalse(semDados.ok)
        assertEquals(listOf("K", "Mn"), semDados.faltam.sorted())
        assertEquals("−8/3", Nox.textoNox(Racional.de(-8, 3)))
        assertEquals("+6", Nox.textoNox(Racional.de(6)))
        assertEquals("0", Nox.textoNox(Racional.ZERO))
    }

    // ---- configuração eletrônica ------------------------------------------------------------------------------------------------------------

    @Test fun configuracaoMadelungFeCrCuValenciaESubnivelMaisEnergetico() {
        assertEquals(listOf("1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d"), Eletronica.ORDEM_PAULING.take(10).map { (n, l) -> "$n${Eletronica.LETRAS_SUBNIVEL[l]}" })
        assertEquals("1s2 2s2 2p6 3s2 3p6", Eletronica.textoSubniveis(Eletronica.preencherMadelung(18)))
        val fe = Eletronica.distribuicao("[Ar] 4s2 3d6", 26)
        assertTrue(fe.ok)
        assertEquals("1s2 2s2 2p6 3s2 3p6 4s2 3d6", Eletronica.textoSubniveis(fe.ordemPauling))
        assertEquals("1s2 2s2 2p6 3s2 3p6 3d6 4s2", Eletronica.textoSubniveis(fe.ordemCamadas))
        assertEquals(listOf(2, 8, 14, 2), fe.camadas.map { it.eletrons })
        assertEquals(listOf("K", "L", "M", "N"), fe.camadas.map { it.camada })
        assertEquals("N" to 2, fe.camadaValencia!!.camada to fe.camadaValencia!!.eletrons)
        assertEquals("3d6", fe.subnivelMaisEnergetico!!.rotulo + fe.subnivelMaisEnergetico!!.e)
        assertEquals("d", fe.bloco)
        assertEquals(8 to "ns+(n-1)d", fe.eletronsValencia to fe.valenciaTipo)
        assertTrue(Eletronica.textoSubniveis(fe.ordemPauling, sobrescrito = true).endsWith("4s² 3d⁶"))
        assertEquals(listOf(2, 8, 13, 1), Eletronica.distribuicao("[Ar] 3d5 4s1", 24).camadas.map { it.eletrons })
        assertEquals(listOf(2, 8, 18, 1), Eletronica.distribuicao("[Ar] 4s1 3d10", 29).camadas.map { it.eletrons })
        val s = Eletronica.distribuicao("[Ne] 3s2 3p4", 16)
        assertEquals(listOf("M", "6", "camada", "p"), listOf(s.camadaValencia!!.camada, s.eletronsValencia.toString(), s.valenciaTipo, s.bloco))
        assertEquals(listOf(2, 8, 18, 32, 18, 1), Eletronica.distribuicao("[Xe] 6s1 4f14 5d10", 79).camadas.map { it.eletrons })
        val og = Eletronica.distribuicao("[Rn] 7s2 7p6 5f14 6d10 (prevista)", 118)
        assertTrue(og.ok)
        assertEquals(listOf("(prevista)"), og.ignorados)
        assertEquals(listOf(2, 8, 18, 32, 32, 18, 8), og.camadas.map { it.eletrons })
        assertEquals(listOf(2, 2, 6), Eletronica.lerConfiguracao("1s² 2s² 2p⁶")!!.subniveis.map { it.e })
    }

    @Test fun configuracaoIonsETotalDiferenteNaoECorrigido() {
        assertEquals("1s2 2s2 2p6 3s2 3p6 3d6", Eletronica.textoSubniveis(Eletronica.distribuicao("[Ar] 4s2 3d6", 26, carga = 2).ordemCamadas))
        assertEquals("1s2 2s2 2p6 3s2 3p6 3d5", Eletronica.textoSubniveis(Eletronica.distribuicao("[Ar] 4s2 3d6", 26, carga = 3).ordemCamadas))
        val cl = Eletronica.distribuicao("[Ne] 3s2 3p5", 17, carga = -1)
        assertEquals(listOf(2, 8, 8), cl.camadas.map { it.eletrons })
        assertEquals(18, cl.totalEletrons)
        assertEquals("1s2 2s2 2p6", Eletronica.textoSubniveis(Eletronica.aplicarCarga(Eletronica.lerConfiguracao("1s2 2s2 2p4")!!.subniveis, -2)!!))
        val errado = Eletronica.distribuicao("[Ar] 4s2 3d5", 26)
        assertEquals(listOf<Any?>(false, "totalDiferente", 25, 26), listOf(errado.ok, errado.erro, errado.total, errado.esperado))
        assertEquals("semConfiguracao", Eletronica.distribuicao("", 1).erro)
        assertEquals("cargaInvalida", Eletronica.distribuicao("1s1", 1, carga = 2).erro)
    }

    // ---- tipo de ligação ----------------------------------------------------------------------------------------------------------------------

    private fun tipo(formula: String? = null, simbolos: List<String>? = null): List<String> {
        val r = Ligacao.ligacoesDe(formula, simbolos, ::el)
        assertTrue("$formula $simbolos: $r", r.ok)
        return r.ligacoes.map { "${it.a}-${it.b}:${it.tipo}" }
    }

    @Test fun ligacaoIonicaPolarApolarMetalicaEGasNobre() {
        assertEquals(listOf("Cl-Na:ionica"), tipo("NaCl"))
        assertEquals(listOf("Cl-H:covalentePolar"), tipo("HCl"))
        assertEquals(listOf("Cl-Cl:covalenteApolar"), tipo("Cl2"))
        assertEquals(listOf("Fe-Cu:metalica"), tipo(simbolos = listOf("Fe", "Cu")))
        assertEquals(listOf("H-Cl:covalentePolar"), tipo(simbolos = listOf("H", "Cl")))
        assertEquals("ΔEN 1,78 entre não metais: covalente polar", listOf("F-H:covalentePolar"), tipo("HF"))
        assertEquals(listOf("C-O:covalentePolar"), tipo("CO2"))
        assertEquals("ΔEN 0,35 < 0,4", listOf("C-H:covalenteApolar"), tipo("CH4"))
        assertEquals(listOf("Xe-Na:nenhuma"), tipo(simbolos = listOf("Xe", "Na")))
        val nacl = Ligacao.tipoDeLigacao(el("Na")!!, el("Cl")!!)
        assertEquals(2.23, nacl.deltaEN!!, 0.0)
        assertEquals(0.93 to 3.16, nacl.enA to nacl.enB)
        val naoh = Ligacao.ligacoesDe("NaOH", null, ::el)
        assertTrue(naoh.estimado)
        assertEquals(listOf("Na-O:ionica", "H-O:covalentePolar"), naoh.ligacoes.map { "${it.a}-${it.b}:${it.tipo}" })
        assertEquals(listOf("H" to "O", "S" to "O"), Ligacao.paresDaFormula(listOf("H", "S", "O"), ::el).first)
        assertEquals("naoMetal", Ligacao.classeParaLigacao("semimetal"))
        assertEquals("nenhuma", Ligacao.ligacoesDe(null, listOf("He", "F"), ::el).ligacoes[0].tipo)
        assertEquals("nenhuma", Ligacao.ligacoesDe(null, listOf("Og", "F"), ::el).ligacoes[0].tipo)
        assertEquals("formula", Ligacao.ligacoesDe("Xy", null, ::el).erro)
        assertEquals("semElemento", Ligacao.ligacoesDe("NaCl", null, { s -> if (s == "Na") el("Na") else null }).erro)
    }

    // ---- equilíbrio -----------------------------------------------------------------------------------------------------------------------------

    @Test fun kcEKpDaAmoniaSolidosForaESetasAceitas() {
        val ex = Equilibrio.expressao("N2 + 3 H2 ⇌ 2 NH3")
        assertTrue(ex.ok)
        assertEquals("Kc = [NH₃]^2 / ([N₂]·[H₂]^3)", ex.texto)
        assertEquals(-2.0, ex.deltaN, 0.0)
        assertEquals(listOf("gasPorHipotese"), ex.hipoteses)
        val kc = Equilibrio.calcularKc(ex, listOf("N2" to 0.5, "H2" to 1.5, "NH3" to 0.2))
        assertTrue(kc.ok)
        assertTrue(perto(kc.kc, 0.2.pow(2) / (0.5 * 1.5.pow(3))))
        val r = Equilibrio.rLitroAtm(TestData.Fixture.pacote.constante("R")!!.valor, un)!!
        assertTrue("R = $r", perto(r, 0.0820574, 1e-5))
        val kp = Equilibrio.kpDeKc(ex.deltaN, 500.0, r, kc.kc)
        assertTrue(perto(kp.kp!!, kc.kc * (r * 500).pow(-2)))
        assertTrue(perto(kp.fator, (r * 500).pow(-2)))
        assertFalse(Equilibrio.kpDeKc(1.0, 0.0, r).ok)
        assertEquals(298.15, Equilibrio.temperaturaEmK(25.0, "°C", un)!!, 1e-9)
        for (seta in listOf("<=>", "<->", "⇄", "->", "→", "=")) assertEquals(seta, "Kc = [HI]^2 / ([H₂]·[I₂])", Equilibrio.expressao("H2 + I2 $seta 2 HI").texto)
        val caco3 = Equilibrio.expressao("CaCO3(s) ⇌ CaO(s) + CO2(g)")
        assertEquals("Kc = [CO₂]", caco3.texto)
        assertEquals(1.0, caco3.deltaN, 0.0)
        assertTrue("semSolidoLiquido" in caco3.hipoteses)
        val semCoef = Equilibrio.expressao("N2 + H2 -> NH3")
        assertTrue(semCoef.balanceada)
        assertEquals("sem coeficientes, balanceia antes", ex.texto, semCoef.texto)
        val agua = Equilibrio.expressao("CH4 + 2 O2 ⇌ CO2 + 2 H2O", { f -> if (f == "H2O") "liquido" else null })
        assertEquals("líquido pelo pacote sai da expressão", "Kc = [CO₂] / ([CH₄]·[O₂]^2)", agua.texto)
        assertTrue("faseDoPacote" in agua.hipoteses)
        val falta = Equilibrio.calcularKc(ex, listOf("N2" to 0.5))
        assertEquals(listOf<Any?>(false, "faltamConcentracoes", listOf("H2", "NH3")), listOf(falta.ok, falta.erro, falta.faltam))
        assertEquals("concentracaoInvalida", Equilibrio.calcularKc(ex, listOf("N2" to 0.0, "H2" to 1.0, "NH3" to 1.0)).erro)
        assertEquals("semSeta", Equilibrio.expressao("N2 + H2").erro)
        val lida = Equilibrio.lerEquacaoComEstados("1/2 N2(g) + 3/2 H2(g) ⇌ NH3(g)")
        assertEquals(listOf(Triple(0.5, "N2", "g"), Triple(1.5, "H2", "g")), lida.reagentes.map { Triple(it.coef, it.formula, it.estado) })
        val erro = runCatching { Equilibrio.lerEquacaoComEstados("Fe2+ + 2 e- -> Fe") }.exceptionOrNull()
        assertEquals("eletron", (erro as ErroEquacao).codigo)
    }

    // ---- entalpia -------------------------------------------------------------------------------------------------------------------------------

    @Test fun entalpiaPorFormacaoCombustaoDoMetanoESubstanciasSimples() {
        val comb = Entalpia.equacaoDeCombustao("CH4")
        assertTrue(comb.ok)
        assertEquals("CH₄ + 2 O₂ → CO₂ + 2 H₂O", comb.equacao)
        assertEquals(1, comb.coefComposto)
        val dHf = mapOf("CH4" to -74.6, "CO2" to -393.5, "H2O" to -285.8)
        val r = Entalpia.somaPorFormacao(comb.especies.map { it.copy(dHf = if (it.simples) 0.0 else dHf[it.formula]) })
        assertTrue(r.ok)
        assertTrue("ΔH = ${r.dH}", perto(r.dH, -890.5))
        assertTrue(r.exotermica)
        val semAgua = Entalpia.somaPorFormacao(comb.especies.map { it.copy(dHf = if (it.simples) 0.0 else if (it.formula == "H2O") null else dHf[it.formula]) })
        assertEquals(false to listOf("H2O"), semAgua.ok to semAgua.faltam)
        assertEquals("C₂H₆O + 3 O₂ → 2 CO₂ + 3 H₂O", Entalpia.equacaoDeCombustao("C2H6O").equacao)
        assertEquals(2, Entalpia.equacaoDeCombustao("C2H6").coefComposto)
        assertTrue("N e S também", Entalpia.equacaoDeCombustao("C2H7NO2S").ok)
        assertEquals("naoQueima", Entalpia.equacaoDeCombustao("NaCl").erro)
        for (f in listOf("O2", "N2", "H2", "Cl2", "Fe", "C", "S8", "P4", "Br2")) assertTrue(f, Entalpia.ehSubstanciaSimplesPadrao(f))
        for (f in listOf("O3", "O", "H", "H2O", "Fe3+", "Cl")) assertFalse(f, Entalpia.ehSubstanciaSimplesPadrao(f))
        val e = Entalpia.especiesDaEquacao("2 H2 + O2 -> 2 H2O")
        assertEquals(listOf(Triple(2.0, "H2", true), Triple(1.0, "O2", true), Triple(2.0, "H2O", false)), e.especies.map { Triple(it.coef, it.formula, it.simples) })
        assertTrue(Entalpia.especiesDaEquacao("H2 + O2 -> H2O").balanceada)
        assertEquals(-445.25 to 0.5, Entalpia.calorDaAmostra(-890.5, 1, 0.5))
        assertEquals(-1560.0 to 0.5, Entalpia.calorDaAmostra(-3120.0, 2, 1.0))
        assertEquals(listOf("r", "r", "p"), e.especies.map(EspecieEntalpia::lado))
    }

    @Test fun leiDeHessMonoxidoMetanoEErros() {
        val co = Entalpia.combinarHess("C + 1/2 O2 -> CO", listOf("C + O2 -> CO2" to -393.5, "CO + 1/2 O2 -> CO2" to -283.0))
        assertTrue(co.toString(), co.ok)
        assertTrue(perto(co.dH, -110.5))
        assertEquals(listOf(Triple(0, "1", false), Triple(1, "-1", true)), co.passos.map { Triple(it.indice, it.fator.toString(), it.invertida) })
        val ch4 = Entalpia.combinarHess(
            "C(s) + 2 H2(g) -> CH4(g)",
            listOf("C(s) + O2(g) -> CO2(g)" to -393.5, "H2(g) + 1/2 O2(g) -> H2O(l)" to -285.8, "CH4(g) + 2 O2(g) -> CO2(g) + 2 H2O(l)" to -890.3)
        )
        assertTrue(ch4.ok)
        assertTrue(perto(ch4.dH, -74.8))
        assertEquals(listOf("1", "2", "-1"), ch4.passos.map { it.fator.toString() })
        val semCoef = Entalpia.combinarHess("C + O2 -> CO", listOf("C + O2 -> CO2" to -393.5, "2 CO + O2 -> 2 CO2" to -566.0))
        assertTrue("alvo sem coeficientes é balanceado antes (2 C + O2 → 2 CO)", semCoef.ok)
        assertTrue(perto(semCoef.dH, -221.0))
        assertEquals("naoBalanceada", Entalpia.combinarHess("C + O2 -> CO2", listOf("H2 + O2 -> H2O" to -1.0)).erro)
        assertEquals("semDH", Entalpia.combinarHess("C + O2 -> CO2", listOf("C + O2 -> CO2" to Double.NaN)).erro)
        assertEquals("semCombinacao", Entalpia.combinarHess("C + O2 -> CO2", listOf("2 H2 + O2 -> 2 H2O" to -571.6)).erro)
        assertEquals("alvo", Entalpia.combinarHess("C + O2", emptyList()).erro)
        assertEquals("1/2", Entalpia.fracDe(0.5).toString())
        assertEquals("3/2", Entalpia.fracDe(1.5).toString())
    }
}
