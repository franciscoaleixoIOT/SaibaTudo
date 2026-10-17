package net.saibatudo.quimica

import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.model.PacoteJson
import net.saibatudo.quimica.data.model.Regras
import net.saibatudo.quimica.data.model.SolubilidadeBase
import net.saibatudo.quimica.data.model.Trecho
import net.saibatudo.quimica.data.model.UnidadeDef
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.calc.Balanceador
import net.saibatudo.quimica.domain.calc.CalculoInvalido
import net.saibatudo.quimica.domain.calc.Estequiometria
import net.saibatudo.quimica.domain.calc.GasIdeal
import net.saibatudo.quimica.domain.calc.MassaMolar
import net.saibatudo.quimica.domain.calc.Qtd
import net.saibatudo.quimica.domain.calc.QuantidadeConhecida
import net.saibatudo.quimica.domain.calc.ResultadoCalculo
import net.saibatudo.quimica.domain.calc.Solucoes
import net.saibatudo.quimica.domain.calc.TipoForte
import net.saibatudo.quimica.domain.calc.Unidades
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

/**
 * Paridade com as correções de química do site de 16–17/10/2026 (frente H; `web/test/calc.test.mjs` e `answers.test.mjs`): expoente nas
 * unidades, mmHg × Torr, estequiometria com rendimento a partir de produto, notas CNTP × IUPAC, nota dos 25 °C no pH e aviso de saturação de
 * bases pouco solúveis; e os erros de dicionário/unidades do Android listados em docs/RELEASE_1.0.1.md.
 */
class CorrecoesQuimicaSiteTest {

    private val fixture = TestData.Fixture.pacote
    private val unFixture = Unidades.de(fixture.regras)
    private val real = TestData.Real?.pacote
    private fun unidadesDosPacotes(): List<Unidades> = listOfNotNull(unFixture, real?.let { Unidades.de(it.regras) })

    /** Regras do pacote de conferência da frente J (local/, fora do Git): os testes que dependem dele são pulados sem o arquivo. */
    private val regrasJ: Regras? = File("../local/pacote-j/regras.json").takeIf { it.isFile }?.let { PacoteJson.regras(PacoteJson.parse(it.readBytes())) }

    // ---- (a) expoente, não subscrito ----------------------------------------------------------------------------------------------------

    @Test fun unidadeComExpoenteSobrescrito() {
        assertEquals("m³", Unidades.simboloExibicao("m3"))
        assertEquals("cm³", Unidades.simboloExibicao("cm3"))
        assertEquals("dm³", Unidades.simboloExibicao("dm3"))
        assertEquals("m²", Unidades.simboloExibicao("m2"))
        assertEquals("s⁻¹", Unidades.simboloExibicao("s-1"))
        assertEquals("mol/m³", Unidades.simboloExibicao("mol/m3"))
        for (igual in listOf("m³", "mmHg", "°C", "°F", "µL", "Å", "kWh", "mol/L", "gal (EUA)", "L·atm")) assertEquals(igual, Unidades.simboloExibicao(igual))
        // o pacote real escreve "m3", "dm3", "cm3", "ft3": o app mostra o expoente, e a grafia do pacote continua aceita
        val un = Unidades.de(Regras(unidades = listOf(UnidadeDef("volume", "m3", null, 1.0), UnidadeDef("volume", "dm3", null, 1e-3), UnidadeDef("volume", "L", null, 1e-3))))
        assertTrue(un.todas.none { u -> u.simbolo.any { it.isDigit() } || u.simbolo.any { it in '₀'..'₉' } })
        assertEquals("m³", un.buscar("m3")?.simbolo)
        assertEquals("dm³", un.buscar("dm3")?.simbolo)
        assertEquals("cm³", un.buscar("cc")?.simbolo)   // apelido do padrão continua valendo
        val (_, passo) = un.converterComPasso(Tx.pt, 1.0, un.buscar("m3")!!, un.buscar("L")!!)
        assertEquals("1 m³ = 1.000 L", passo)
        for (u in unidadesDosPacotes()) assertTrue(u.todas.map { it.simbolo }.toString(), u.todas.none { x -> x.simbolo.any { it.isDigit() } })
    }

    // ---- (b) mmHg e Torr separados -----------------------------------------------------------------------------------------------------

    @Test fun mmHgETorrSeparados() {
        for (un in unidadesDosPacotes()) {
            val mmHg = un.buscar("mmHg")!!
            val torr = un.buscar("torr")!!
            assertEquals("Torr", torr.simbolo)
            assertEquals("Torr", un.buscar("Torr")!!.simbolo)
            assertEquals(133.322387415, un.converter(1.0, mmHg, un.porSimbolo("Pa")!!), 1e-12)
            assertEquals(101325.0 / 760.0, un.converter(1.0, torr, un.porSimbolo("Pa")!!), 1e-9)
            assertEquals(1.0, un.converter(760.0, torr, un.porSimbolo("atm")!!), 1e-12)
            assertEquals(1.0, un.converter(760.0, mmHg, un.porSimbolo("atm")!!), 1e-6)
            assertEquals("Torr", Quantidades.ler("a 760 torr", un, Lexico.de("pt-BR")).single().unidade)
            assertEquals("mmHg", Quantidades.ler("a 760 mmHg", un, Lexico.de("pt-BR")).single().unidade)
        }
        assertEquals("torr", net.saibatudo.quimica.domain.calc.UnidadeNomes.nome(unFixture.buscar("Torr")!!, Tx.pt))
        // gás ideal com a pressão em torr
        val d = dicionario(fixture)
        assertEquals(Intent.GAS_IDEAL, LocalNlu.parse("qual o volume de 2 mol de gás a 760 torr e 300 K?", d, null, d.lexico).intent)
    }

    // ---- (c) estequiometria com rendimento a partir de produto ---------------------------------------------------------------------------

    @Test fun produtoDesejadoComRendimento() {
        val pacote = TestData.Melhor.pacote
        val el = pacote.porSimbolo
        val eq = Balanceador.balancear(Tx.pt, "N2 + H2 -> NH3", el.keys).balanceada
        val iNH3 = eq.equacao.todas.indexOfFirst { it.rotulo == "NH3" }
        val mNH3 = MassaMolar.calcular("NH3", el).massaMolar
        val nNH3 = 10.0 / mNH3
        val r = Estequiometria.calcular(Tx.pt, eq, listOf(QuantidadeConhecida(iNH3, 10.0, emMols = false)), el, 80.0)
        val n2 = r.linhas.first { it.especie == "N2" }
        val h2 = r.linhas.first { it.especie == "H2" }
        assertEquals(nNH3 / 2 / 0.8, n2.mols, 1e-12)
        assertEquals(3 * nNH3 / 2 / 0.8, h2.mols, 1e-12)
        assertEquals(nNH3 / 0.8, r.linhas.first { it.especie == "NH3" }.mols, 1e-12)   // teórico (100 %)
        if (TestData.Real != null) {   // golden do site: N₂ 10,2805 g e H₂ 2,21948 g
            assertEquals(10.2805, n2.massa, 5e-4)
            assertEquals(2.21948, h2.massa, 5e-5)
        }
        assertEquals(10.0, (n2.massa + h2.massa) * 0.8, 1e-9)
        assertTrue(r.passos.joinToString(), r.passos.any { it.contains("divida pelo rendimento") && it.contains("ξ = ") })
        assertTrue(r.passos.joinToString(), r.passos.any { it.startsWith("Reagentes necessários (n = coeficiente × ξ): n(N₂) = 1 × ") })
        // o produto informado não muda: a linha "com rendimento" dá os 10 g
        val res = r.comoResultado(Tx.pt)
        assertTrue(res.linhas.toString(), res.linhas.any { it.rotulo == "NH₃ com rendimento de 80 %" && it.valor.endsWith("= 10 g") })
        // sem rendimento, o teórico; partindo de reagente com rendimento, produto = teórico × rendimento (como antes)
        val r100 = Estequiometria.calcular(Tx.pt, eq, listOf(QuantidadeConhecida(iNH3, 10.0, emMols = false)), el)
        assertEquals(nNH3 / 2, r100.linhas.first { it.especie == "N2" }.mols, 1e-12)
        assertNull(r100.rendimento)
        val rr = Estequiometria.calcular(Tx.pt, eq, listOf(QuantidadeConhecida(0, 1.0, emMols = true)), el, 80.0)
        assertEquals(2.0, rr.linhas.first { it.especie == "NH3" }.mols, 1e-12)
        assertTrue(rr.comoResultado(Tx.pt).linhas.any { it.rotulo.contains("80 %") && it.valor.startsWith("1,6 mol") })
        for (ruim in listOf(0.0, -5.0, 120.0, Double.NaN)) {
            try { Estequiometria.calcular(Tx.pt, eq, listOf(QuantidadeConhecida(iNH3, 10.0, false)), el, ruim); fail("$ruim") } catch (_: CalculoInvalido) { }
        }
        // textos do passo nos cinco idiomas
        for ((idioma, trecho) in listOf("en" to "divide by the yield", "es" to "divide entre el rendimiento", "de" to "Teilen Sie durch die Ausbeute", "fr" to "divisez par le rendement")) {
            val x = Estequiometria.calcular(Tx.de(idioma), eq, listOf(QuantidadeConhecida(iNH3, 10.0, false)), el, 80.0)
            assertTrue(x.passos.joinToString(), x.passos.any { it.contains(trecho) })
        }
    }

    // ---- (d) CNTP × IUPAC ----------------------------------------------------------------------------------------------------------------

    @Test fun notasCntpEIupacPorRtSobreP() {
        val r = fixture.constante("R")
        assertEquals(22.4139695, GasIdeal.volumeMolar(r, unFixture, "atm")!!, 1e-4)
        assertEquals(22.7109546, GasIdeal.volumeMolar(r, unFixture, "bar")!!, 1e-4)
        val nota = GasIdeal.notasCntp(Tx.pt, r, unFixture).single()
        assertTrue(nota, nota.contains("CNTP (0 °C, 1 atm): 22,4 L/mol, o volume molar usado aqui."))
        assertTrue(nota, nota.contains("Na condição padrão atual da IUPAC (0 °C, 1 bar), o volume molar é 22,7 L/mol."))
        assertTrue(GasIdeal.notasCntp(Tx.de("en"), r, unFixture).single().contains("STP (0 °C, 1 atm): 22.4 L/mol"))
        assertTrue(GasIdeal.notasCntp(Tx.pt, null, unFixture).isEmpty())   // sem R no pacote, nenhuma nota inventada
        val b = runBlocking { AnswerBuilder(fixture, dicionario(fixture), Nivel.MEDIO) }
        for (q in listOf("qual o volume de 2 mol de gás nas CNTP?", "volume molar de um gás ideal")) {
            val a = runBlocking { b.responder(q).second }.texto()
            assertTrue(a, a.contains("CNTP (0 °C, 1 atm): 22,4 L/mol") && a.contains("IUPAC (0 °C, 1 bar), o volume molar é 22,7 L/mol"))
        }
    }

    // ---- (e) 25 °C em todo pH ------------------------------------------------------------------------------------------------------------

    private fun notaVinteECinco(r: ResultadoCalculo) = r.notas.any { it.contains("pKw = 14,00 e pH neutro = 7,00 valem a 25 °C") }

    @Test fun notaDos25GrausEmTodoPh() {
        val molL = unFixture.porSimbolo("mol/L")!!
        assertTrue(notaVinteECinco(Solucoes.phForte(Tx.pt, TipoForte.ACIDO, Qtd(0.01, molL), 1, unFixture)))
        assertTrue(notaVinteECinco(Solucoes.phForte(Tx.pt, TipoForte.BASE, Qtd(0.01, molL), 1, unFixture)))
        assertTrue(notaVinteECinco(Solucoes.phFraco(Tx.pt, TipoForte.ACIDO, Qtd(0.1, molL), 1.8e-5, "Ka", unFixture)))
        assertTrue(notaVinteECinco(Solucoes.phFraco(Tx.pt, TipoForte.BASE, Qtd(0.1, molL), 1.8e-5, "Kb", unFixture)))
        val en = Solucoes.phForte(Tx.de("en"), TipoForte.ACIDO, Qtd(0.01, molL), 1, unFixture)
        assertTrue(en.notas.toString(), en.notas.any { it.startsWith("pKw = 14.00 and neutral pH = 7.00 hold at 25 °C") })
        val a = runBlocking { AnswerBuilder(fixture, dicionario(fixture), Nivel.MEDIO).responder("pH de NaOH 0,001 mol/L").second }.texto()
        assertTrue(a, a.contains("pKw = 14,00 e pH neutro = 7,00 valem a 25 °C"))
    }

    @Test fun pKwDaAguaNasRegrasTemPrecedencia() {
        assertEquals(13.9 to true, Solucoes.pKwDoPacote(emptyList(), 13.9))
        assertEquals(14.0 to false, Solucoes.pKwDoPacote(emptyList(), null))
        val regras = PacoteJson.regras(PacoteJson.parse("""{"agua": {"pKw": 14.0, "pKw25CPreciso": 13.997}}""".toByteArray()))
        assertEquals(14.0, regras.pKwAgua!!, 0.0)
        regrasJ?.let { assertEquals(14.0, it.pKwAgua!!, 0.0) }
    }

    // ---- (f) saturação de bases pouco solúveis ------------------------------------------------------------------------------------------

    @Test fun avisoDeSaturacaoComKps() {
        val molL = unFixture.porSimbolo("mol/L")!!
        val tabela = listOf(SolubilidadeBase("Ca(OH)2", kps = 5.02e-6, temperaturaC = 25.0, fonte = "fonte de teste"))
        val sat = Solucoes.solubilidadeDe("Ca(OH)2", tabela)!!
        assertEquals(0.0108, sat.s, 5e-5)          // s = (Kps / 4)^(1/3)
        assertEquals(2, sat.n)
        assertTrue(sat.deKps)
        assertNotNull(Solucoes.solubilidadeDe("CaH2O2", tabela))   // fórmula de Hill do PubChem
        assertNull(Solucoes.solubilidadeDe("NaOH", tabela))
        assertNull(Solucoes.solubilidadeDe("Ca(OH)2", emptyList()))  // sem a tabela no pacote, nenhum aviso
        val acima = Solucoes.phForte(Tx.pt, TipoForte.BASE, Qtd(0.1, molL), 2, unFixture, saturacao = sat)
        val aviso = acima.notas.first()
        assertTrue(aviso, aviso.startsWith("Atenção: Ca(OH)₂ é pouco solúvel em água (a 25 °C): dissolve no máximo cerca de 0,0108 mol/L (calculado do Kps), segundo fonte de teste."))
        assertTrue(aviso, aviso.endsWith("o pH real não passa de cerca de 12,33."))
        val abaixo = Solucoes.phForte(Tx.pt, TipoForte.BASE, Qtd(0.005, molL), 2, unFixture, saturacao = sat)
        assertFalse(abaixo.notas.any { it.contains("satur") })
        // ácido nunca recebe o aviso
        assertFalse(Solucoes.phForte(Tx.pt, TipoForte.ACIDO, Qtd(0.1, molL), 2, unFixture, saturacao = sat).notas.any { it.contains("satur") })
        // as cinco línguas têm o texto
        for (idioma in listOf("en", "es", "de", "fr")) {
            val x = Solucoes.phForte(Tx.de(idioma), TipoForte.BASE, Qtd(0.1, molL), 2, unFixture, saturacao = sat).notas.first()
            assertTrue(x, x.contains("Ca(OH)₂") && x.contains("12") && !x.contains("%"))
        }
    }

    @Test fun solubilidadeBasesNoPacote() {
        val lista = PacoteJson.regras(PacoteJson.parse("""{"solubilidadeBases": {"Mg(OH)2": {"kps": 5.61e-12, "fonte": {"nome": "X"}}}}""".toByteArray())).solubilidadeBases
        assertEquals(listOf(SolubilidadeBase("Mg(OH)2", kps = 5.61e-12, fonte = "X")), lista)
        assertTrue(PacoteJson.regras(PacoteJson.parse("{}".toByteArray())).solubilidadeBases.isEmpty())
        val j = regrasJ
        assumeTrue("sem local/pacote-j/regras.json", j != null)
        assertEquals(setOf("Ca(OH)2", "Mg(OH)2", "Sr(OH)2", "Ba(OH)2"), j!!.solubilidadeBases.map { it.formula }.toSet())
        val ca = Solucoes.solubilidadeDe("Ca(OH)2", j.solubilidadeBases)!!
        assertFalse(ca.deKps)   // o pacote traz a solubilidade medida
        val molL = unFixture.porSimbolo("mol/L")!!
        val aviso = Solucoes.phForte(Tx.pt, TipoForte.BASE, Qtd(0.1, molL), 2, unFixture, saturacao = ca).notas.first()
        assertTrue(aviso, aviso.contains("Ca(OH)₂ é pouco solúvel em água (a 20 °C)") && aviso.contains("segundo Wikipedia"))
        // série de reatividade (ordem nova, dentro de {ordem, criterio, potenciais}) e notas das regras de solubilidade
        assertEquals("Li", j.serieReatividade.first())
        assertEquals("Au", j.serieReatividade.last())
        assertTrue(j.solubilidade.any { it.contains("fluoretos") })
    }

    // ---- dicionário e unidades do Android (docs/RELEASE_1.0.1.md) --------------------------------------------------------------------------

    @Test fun anosNaoSaoAngstrom() {
        for (un in unidadesDosPacotes()) {
            assertNull(Quantidades.ler("hace 10 años", un, Lexico.de("es")).single().unidade)
            assertNull(Quantidades.ler("há 10 anos", un, Lexico.de("pt-BR")).single().unidade)
            assertNull(Quantidades.ler("10 years ago", un, Lexico.de("en")).single().unidade)
            assertNull(un.buscar("a"))
            assertEquals("Å", un.buscar("Å")?.simbolo)
            assertEquals("Å", un.buscar("angstrom")?.simbolo)
            assertEquals("atm", Quantidades.ler("¿cuántos kilopascales son 2 atmósferas?", un, Lexico.de("es")).single().unidade)
        }
    }

    @Test fun decimetroCubicoEhVolume() {
        for (un in unidadesDosPacotes()) {
            for ((texto, esperado) in listOf("3,5 dm3" to "dm³", "3,5 dm³" to "dm³", "250 cm3" to "cm³", "2 m3" to "m³", "4 g de H2" to "g")) {
                val q = Quantidades.ler(texto, un, Lexico.de("pt-BR")).first()
                assertEquals(texto, esperado, q.unidade)
                assertEquals(texto, if (esperado == "g") "massa" else "volume", un.buscar(q.unidade!!)!!.grandeza)
            }
        }
        val d = dicionario(fixture)
        val p = LocalNlu.parse("converta 3,5 dm3 para mL", d, null, d.lexico)
        assertEquals(Intent.CONVERSAO_UNIDADE, p.intent)
        assertEquals("dm³", p.quantidades.single().unidade)
    }

    @Test fun constanteDeEquilibrioNaoViraComposto() {
        val pacote = TestData.Real?.pacote
        assumeTrue("sem o pacote real (data/quimica)", pacote != null)
        val d = dicionario(pacote!!)
        val p = LocalNlu.parse("O que significa constante de equilíbrio", d, null, d.lexico)
        assertEquals(Intent.CONCEITO, p.intent)
        assertNull(d.aproximar("constante de equilibrio"))
        assertNotEquals("2160", p.composto)
        // o sinônimo exato continua valendo, e a aproximação pelos nomes principais também
        assertEquals(2160L, d.compostoPorNome("Equilibrin"))
        assertEquals(Intent.ELEMENTO, LocalNlu.parse("oxigenioo", d, null, d.lexico).intent)
    }

    // ---- textos traduzidos automaticamente (pt-BR) ---------------------------------------------------------------------------------------

    @Test fun traducaoAutomaticaContaComoPortugues() {
        val tr = Trecho("x", "ChEBI", "CC BY 4.0", titulo = "Asparagine", textoOriginal = "An amino acid.", textoPt = "Um aminoácido.", traducao = "automatica", tituloPt = "Asparagina", idiomaTexto = "en")
        assertTrue(tr.traducaoAutomatica)
        assertTrue(tr.copy(traducao = "automática").traducaoAutomatica)
        assertFalse(tr.copy(textoPt = null).traducaoAutomatica)
        assertFalse(tr.copy(traducao = "não se aplica (texto no idioma do artigo; sem tradução)").traducaoAutomatica)
        val lido = PacoteJson.trecho(PacoteJson.parse("""{"id": "c1", "fonte": "ChEBI", "licenca": "CC BY 4.0", "titulo": "Asparagine", "tituloPt": "Asparagina", "textoPt": "Um aminoácido.", "traducao": "automatica", "idioma": "en"}""".toByteArray()))!!
        assertEquals("Asparagina", lido.tituloPt)
        assertTrue(lido.traducaoAutomatica)
    }
}
