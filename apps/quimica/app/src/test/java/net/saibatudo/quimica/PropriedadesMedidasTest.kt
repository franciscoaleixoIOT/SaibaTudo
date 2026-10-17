package net.saibatudo.quimica

import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.data.model.EstadoFisico
import net.saibatudo.quimica.data.model.FonteValor
import net.saibatudo.quimica.data.model.CondicoesMedida
import net.saibatudo.quimica.data.model.PacoteJson
import net.saibatudo.quimica.data.model.PropriedadeDef
import net.saibatudo.quimica.data.model.Regras
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.Propriedades
import net.saibatudo.quimica.domain.calc.Unidades
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * Propriedades físicas medidas dos compostos com origem por valor (docs/DATA_CONTRACT.md §2, §3.1 e §7; paridade com o site em 17/10/2026:
 * web/src/quimica/js/propriedades.js, ui/compostos.js, ui/elemento.js e answers.js). Os testes de modelo e formatação usam JSON escrito aqui;
 * os de resposta usam o pacote real (data/quimica) e são pulados sem ele.
 */
class PropriedadesMedidasTest {

    private val pt = Tx.pt
    private val un = Unidades.de(TestData.Fixture.pacote.regras)

    private fun obj(json: String) = JsonParser.parseString(json).asJsonObject

    private val ACETAMIDA = """
        { "cid": 178, "nome": "Acetamida",
          "propriedades": { "xlogp": -0.9, "pontoFusaoK": 353.31, "solubilidadeAguaG100g": 68.9, "pka": 0.63, "pkaValores": [0.63, 15.1], "estadoPadrao": "solido" },
          "fontesPorPropriedade": {
            "pontoFusaoK": { "nome": "Wikidata", "url": "https://www.wikidata.org/wiki/Q421721#P2101", "licenca": "CC0", "acessadoEm": "2026-10-17",
                             "declaracao": "Q421721${'$'}11fae314", "referencia": "CRC Handbook of Chemistry and Physics (97th edition) (Q42107747)",
                             "valorOriginal": 80.16, "unidadeOriginal": "°C" },
            "solubilidadeAguaG100g": { "nome": "Wikidata", "url": "https://www.wikidata.org/wiki/Q421721#P2177", "licenca": "CC0",
                             "referencia": "CRC Handbook", "condicoes": { "temperaturaK": 293.15 } },
            "pkaValores": [ { "nome": "Wikidata", "url": "https://www.wikidata.org/wiki/Q421721#P1117", "licenca": "CC0", "referencia": "DrugBank (Q1122544)" },
                            { "nome": "Wikidata", "url": "https://www.wikidata.org/wiki/Q421721#P1117", "licenca": "CC0", "referencia": "CRC Handbook",
                              "condicoes": { "temperaturaK": 298.15 } } ],
            "estadoPadrao": { "nome": "derivado (SaibaTudo Química)", "licenca": "CC0", "metodo": "pontoFusaoK e pontoEbulicaoK do pacote comparados com 298,15 K (1 atm)" } } }
    """.trimIndent()

    private fun tabelaPt(regras: Regras = Regras()) = Propriedades.tabela(regras, pt)

    // ---- modelos ---------------------------------------------------------------------------------------------------------------

    @Test fun compostoLeMedidasListasEOrigemPorValor() {
        val c = PacoteJson.composto(obj(ACETAMIDA))!!
        assertEquals(353.31, c.propriedades.getValue("pontoFusaoK"), 0.0)
        assertEquals(listOf(0.63, 15.1), c.propriedadesListas.getValue("pkaValores"))
        assertEquals("solido", c.propriedadesTexto.getValue("estadoPadrao"))
        val f = c.fontesPorPropriedade.getValue("pontoFusaoK").single()
        assertEquals("Wikidata", f.nome)
        assertEquals("CRC Handbook of Chemistry and Physics (97th edition) (Q42107747)", f.referencia)
        assertEquals(80.16, f.valorOriginal!!, 0.0)
        assertEquals("°C", f.unidadeOriginal)
        assertEquals(293.15, c.fontesPorPropriedade.getValue("solubilidadeAguaG100g").single().condicoes!!.temperaturaK!!, 0.0)
        assertEquals(2, c.fontesPorPropriedade.getValue("pkaValores").size)
        assertNotNull(c.fontesPorPropriedade.getValue("estadoPadrao").single().metodo)
    }

    @Test fun elementoLeAvisoEscalaERegrasLeemEscoposEOrigens() {
        val e = PacoteJson.elemento(obj("""
            { "z": 5, "simbolo": "B", "nome": "Boro", "afinidadeEletronicaKJmol": 26.7, "eletronegatividade": 2.04,
              "fontesPorPropriedade": {
                "afinidadeEletronicaKJmol": { "nome": "PubChem Periodic Table", "licenca": "domínio público", "aviso": "possivelmente desatualizado", "revisar": true },
                "eletronegatividade": { "nome": "PubChem Periodic Table", "escala": "Pauling", "nota": "valores revisados (Allred, 1961)" } } }
        """))!!
        assertTrue(e.fontesPorPropriedade.getValue("afinidadeEletronicaKJmol").single().precisaRevisar)
        assertEquals("Pauling", e.fontesPorPropriedade.getValue("eletronegatividade").single().escala)
        val r = PacoteJson.regras(obj("""
            { "propriedades": {
                "pontoFusaoK": { "nome": "Ponto de fusão", "origem": "elementos.pontoFusaoK", "escopo": "elemento",
                                 "origens": ["elementos.pontoFusaoK", "compostos.propriedades.pontoFusaoK"], "escopos": ["elemento", "composto"] },
                "eletronegatividade": { "nome": "Eletronegatividade (Pauling)", "origem": "elementos.eletronegatividade", "escopo": "elemento", "escala": "Pauling" },
                "solubilidade": { "nome": "Solubilidade em água", "origem": "compostos.propriedades.solubilidadeAguaG100g", "escopo": "composto",
                                  "origens": ["compostos.propriedades.solubilidadeAguaG100g", "compostos.propriedades.solubilidadeAguaGL"], "sinonimos": ["solubilidade"] },
                "pka": { "nome": "pKa", "origem": "compostos.propriedades.pka", "escopo": "composto", "sinonimos": ["pka", "constante de acidez"] } } }
        """))
        val fusao = r.propriedades.first { it.id == "pontoFusaoK" }
        assertEquals(listOf("elemento", "composto"), fusao.escopos)
        assertEquals("elemento", fusao.alvo)                                    // `escopo` antigo continua lido
        assertTrue(fusao.temEscopo("composto"))
        assertEquals("Pauling", r.propriedades.first { it.id == "eletronegatividade" }.escala)
        // tabela efetiva: ids novos do pacote casam com os padrões (medidas com dois campos) e somam sinônimos
        val tab = tabelaPt(r).associateBy { it.id }
        assertTrue(tab.getValue("pontoFusaoK").temEscopo("elemento") && tab.getValue("pontoFusaoK").temEscopo("composto"))
        assertEquals(listOf("solubilidadeAguaG100g", "solubilidadeAguaGL"), tab.getValue("solubilidade").campos)
        assertTrue(tab.getValue("solubilidade").medida && !tab.getValue("solubilidade").temEscopo("elemento"))
        assertTrue("constante de acidez" in tab.getValue("pka").sinonimos)
        assertEquals("Pauling", tab.getValue("eletronegatividade").escala)
    }

    @Test fun pacoteAntigoSemEscoposContinuaComFusaoDeComposto() {
        // pacote antigo: `escopo: elemento` e nada de `escopos`/`origens`; o fixture usa `alvo: ambos`
        val antigo = Regras(propriedades = listOf(PropriedadeDef("pontoFusaoK", "Ponto de fusão", null, "elemento", origem = "elementos.pontoFusaoK")))
        assertTrue(tabelaPt(antigo).first { it.id == "pontoFusaoK" }.temEscopo("composto"))
        val fixture = Propriedades.tabela(TestData.Fixture.pacote.regras, pt).associateBy { it.id }
        assertTrue(fixture.getValue("densidadeKgm3").temEscopo("composto") && fixture.getValue("densidadeKgm3").temEscopo("elemento"))
        assertFalse(fixture.getValue("massaAtomica").temEscopo("composto"))
    }

    // ---- leitura e formatação ----------------------------------------------------------------------------------------------------

    @Test fun lerValorEscolheOCampoEFormataComAUnidadeCerta() {
        val c = PacoteJson.composto(obj(ACETAMIDA))!!
        val tab = tabelaPt().associateBy { it.id }
        val pka = Propriedades.lerValor(tab.getValue("pka"), c)!!
        assertEquals("pkaValores", pka.campo)
        assertEquals("0,63 e 15,1", Propriedades.formatar(pt, tab.getValue("pka"), pka.valor, un, campo = pka.campo)!!.texto)
        assertEquals("0.63 and 15.1", Propriedades.formatar(Tx.de("en"), tab.getValue("pka"), pka.valor, un, campo = pka.campo)!!.texto)
        val sol = Propriedades.lerValor(tab.getValue("solubilidade"), c)!!
        assertEquals("solubilidadeAguaG100g", sol.campo)
        assertEquals("68,9 g/100 g de água", Propriedades.formatar(pt, tab.getValue("solubilidade"), sol.valor, un, campo = sol.campo)!!.texto)
        // g/L: a unidade vem do campo, não da propriedade
        val porLitro = Propriedades.formatar(pt, tab.getValue("solubilidade"), 360.0, un, campo = "solubilidadeAguaGL")!!
        assertEquals("360 g/L (em água)", porLitro.texto)
        assertEquals("360 g/L", porLitro.curto)
        // estado do composto vem como texto do pacote
        assertEquals(EstadoFisico.SOLIDO, Propriedades.lerValor(tab.getValue("estadoPadrao"), c)!!.valor)
        assertEquals("1.073,85 K (800,7 °C)", Propriedades.formatar(pt, tab.getValue("pontoFusaoK"), 1073.85, un)!!.texto)
        assertEquals("1.044,6 kg/m³ (1,0446 g/cm³)", Propriedades.formatar(pt, tab.getValue("densidadeKgm3"), 1044.6, un)!!.texto)
        // propriedade de elemento não é lida do composto
        assertNull(Propriedades.lerValor(tab.getValue("massaAtomica"), c))
    }

    @Test fun origemPorValorComCondicoesReferenciaEMarcas() {
        val f = Propriedades.fonteDoValor(
            FonteValor("Wikidata", "https://www.wikidata.org/wiki/Q283#P2102", "CC0", condicoes = CondicoesMedida(298.15, 101325.0, "liquido"),
                semReferencia = true, corroboradoPor = 2), pt, un
        )
        assertEquals(listOf("a 298,15 K (25 °C)", "a 101.325 Pa (1 atm)", "fase: líquido"), f.condicoes)
        assertEquals("Wikidata – CC0 (sem referência no Wikidata (2 declarações concordam))", f.fonte.rotulo())
        assertTrue(f.semReferencia)
        val ref = Propriedades.fonteDoValor(FonteValor("Wikidata", "https://www.wikidata.org/x", "CC0", referencia = "CRC Handbook"), Tx.de("de"), un)
        assertEquals("Beleg: CRC Handbook", ref.fonte.detalhe)
        val derivado = Propriedades.fonteDoValor(FonteValor("derivado (SaibaTudo Química)", licenca = "CC0", metodo = "pontoFusaoK e pontoEbulicaoK"), pt, un)
        assertEquals("SaibaTudo Química (valor derivado)", derivado.fonte.nome)
        assertTrue(derivado.fonte.detalhe!!.startsWith("derivado do ponto de fusão"))
        val revisar = Propriedades.fonteDoValor(FonteValor("PubChem", "http://inseguro", aviso = "desatualizado", revisar = true), pt, un)
        assertNull("só https", revisar.fonte.url)
        assertEquals("valor a revisar", revisar.fonte.detalhe)
        // pkaValores: uma origem por valor; a mesma declaração não se repete
        val c = PacoteJson.composto(obj(ACETAMIDA))!!
        assertEquals(2, Propriedades.fontesDoCampo(c, "pkaValores", pt, un).size)
    }

    @Test fun fichaDoCompostoSeparaAsMedidasNaOrdemDoSite() {
        val c = PacoteJson.composto(obj(ACETAMIDA))!!
        val tab = tabelaPt()
        val ficha = Propriedades.fichaComposto(pt, c, tab, un, Nivel.SUPERIOR)
        assertFalse(ficha.toString(), ficha.any { it.rotulo.startsWith("Ponto de fusão") || it.rotulo.startsWith("pKa") || it.rotulo.startsWith("Solub") || it.rotulo.startsWith("Pka") })
        assertFalse("campos da medida não viram linha solta", ficha.any { it.rotulo.contains("Solubilidade Agua") })
        val medidas = Propriedades.medidasDoComposto(c, tab, pt, un)
        assertEquals(listOf("estadoPadrao", "pontoFusaoK", "solubilidade", "pka"), medidas.map { it.def.id })
        assertEquals("estado físico a 25 °C e 1 atm", Propriedades.rotuloMedida(medidas[0].def, pt))
        assertEquals("68,9 g/100 g de água — a 293,15 K (20 °C)", Propriedades.textoMedida(medidas[2], pt))
    }

    // ---- elemento: valor a revisar e escala de Pauling (pacote real) ---------------------------------------------------------------

    @Test fun fichaDoBoroTemAvisoNaAfinidadeENotaDePauling() {
        val real = TestData.Real
        assumeTrue("sem data/quimica", real != null)
        val p = real!!.pacote
        val b = p.porSimbolo.getValue("B")
        val linhas = Propriedades.fichaElemento(pt, b, Propriedades.tabela(p.regras, pt), Unidades.de(p.regras), Nivel.MEDIO)
        val afinidade = linhas.first { it.rotulo.startsWith("Afinidade") }
        assertTrue(afinidade.aviso!!.startsWith("Valor a revisar"))
        assertTrue(linhas.first { it.rotulo.startsWith("Eletronegatividade") }.nota!!.startsWith("Escala de Pauling"))
        assertNull(linhas.first { it.rotulo.startsWith("Energia de ionização") }.aviso)
        val fr = Propriedades.fichaElemento(Tx.de("fr"), b, Propriedades.tabela(p.regras, Tx.de("fr")), Unidades.de(p.regras), Nivel.MEDIO)
        assertTrue(fr.any { it.aviso?.startsWith("Valeur à vérifier") == true })
    }

    // ---- respostas com o pacote real ------------------------------------------------------------------------------------------

    private fun real(idioma: String = "pt-BR"): AnswerBuilder? = TestData.Real?.pacote?.let { AnswerBuilder(it, dicionario(it, idioma), Nivel.MEDIO) }

    private fun responder(b: AnswerBuilder, q: String): Resposta = runBlocking { b.responder(q).second }

    @Test fun pontoDeFusaoDoNaClComFonteDoValor() {
        val b = real() ?: return assumeTrue(false)
        val q = LocalNlu.parse("qual o ponto de fusão do NaCl?", b.dic)
        assertEquals(Intent.PROPRIEDADE, q.intent)
        assertEquals("5234", q.composto)
        assertEquals("composto", q.alvoPropriedade)
        val r = responder(b, "qual o ponto de fusão do NaCl?")
        assertTrue(r.entendida)
        assertTrue(r.texto(), r.texto().contains("1.073,85 K (800,7 °C)"))
        val f = r.fontes.single()
        assertEquals("Wikidata", f.nome)
        assertEquals("https://www.wikidata.org/wiki/Q2314#P2101", f.url)
        assertTrue(f.detalhe!!.startsWith("referência: Basic Laboratory and Industrial Chemicals"))
        // inglês e alemão: mesmos números, textos do idioma
        val en = responder(real("en")!!, "melting point of NaCl")
        assertTrue(en.texto(Tx.de("en")), en.texto(Tx.de("en")).contains("1,073.85 K (800.7 °C)") && en.fontes.single().detalhe!!.startsWith("reference:"))
    }

    @Test fun pkaDoAcidoAceticoComCondicaoENota() {
        val b = real() ?: return assumeTrue(false)
        val r = responder(b, "pKa do ácido acético")
        assertEquals(Intent.PROPRIEDADE, r.intent)
        val campo = r.blocos.filterIsInstance<Bloco.Campo>().single()
        assertEquals("pKa", campo.rotulo)                                      // "pKa" não vira "PKa"
        assertEquals("4,76 — a 298,15 K (25 °C)", campo.valor)
        assertTrue(r.blocos.any { it is Bloco.Aviso && it.texto.startsWith("Menor pKa registrado (primeira dissociação)") })
        assertTrue(r.fontes.single().detalhe!!.contains("CRC Handbook of Chemistry and Physics (95th edition)"))
        // vários pKa (lista crescente), uma origem por valor
        val arsenico = responder(b, "pKa do ácido arsênico")
        assertTrue(arsenico.texto(), arsenico.texto().contains("2,26, 6,76 e 11,29"))
    }

    @Test fun densidadeDoEtanolDizQueNaoTemEOQueOPacoteTraz() {
        val b = real() ?: return assumeTrue(false)
        val r = responder(b, "densidade do etanol")
        assertEquals(Intent.PROPRIEDADE, r.intent)
        assertFalse(r.entendida)
        val txt = r.texto()
        assertTrue(txt, txt.contains("não traz densidade para Etanol"))
        assertTrue(txt, txt.contains("Para Etanol, o pacote traz: estado físico a 25 °C e 1 atm (líquido), ponto de fusão (159,05 K), ponto de ebulição (351,44 K) e pKa (16)."))
        assertFalse("nenhum número inventado", txt.contains("789"))
        val es = responder(real("es")!!, "densidad del etanol")
        assertTrue(es.texto(Tx.de("es")), es.texto(Tx.de("es")).contains("el paquete trae"))
    }

    @Test fun compararDensidadeDaAguaEDoAcidoAcetico() {
        val b = real() ?: return assumeTrue(false)
        val r = responder(b, "compare a densidade da água e do ácido acético")
        assertEquals(Intent.COMPARAR, r.intent)
        val txt = r.texto()
        assertTrue(txt, txt.contains("Densidade: Água: 997,048 kg/m³ | Ácido acético: 1.044,6 kg/m³"))
        assertTrue(txt, txt.contains("Densidade: maior em Ácido acético (1.044,6 kg/m³)."))
        assertTrue(txt, txt.contains("Ponto de fusão: Água: 273,15 K | Ácido acético: 289,75 K"))
        assertTrue(r.fontes.any { it.nome == "Wikidata" && it.detalhe?.contains("CRC Handbook") == true })
        // sem a propriedade pedida não há frase de "maior"
        assertFalse(responder(b, "diferença entre água e ácido acético").texto().contains("maior em"))
    }

    @Test fun solubilidadeEmAguaNaoTrataAAguaComoAlvo() {
        val b = real() ?: return assumeTrue(false)
        for (q in listOf("solubilidade da acetamida em água", "qual a solubilidade em água da acetamida")) {
            val r = responder(b, q)
            assertEquals(q, Intent.PROPRIEDADE, r.intent)
            assertTrue(r.texto(), r.titulo.startsWith("Acetamida"))
            assertTrue(r.texto(), r.texto().contains("68,9 g/100 g de água — a 293,15 K (20 °C)"))
            assertFalse(r.texto(), r.texto().contains("Água"))
        }
        val agua = responder(b, "solubilidade da água")
        assertFalse(agua.entendida)
        assertTrue(agua.texto(), agua.texto().contains("Diga de qual composto você quer a solubilidade em água"))
    }

    @Test fun fichaResumidaDoCompostoTrazAsMedidas() {
        val b = real() ?: return assumeTrue(false)
        val r = responder(b, "o que é cloreto de sódio")
        assertEquals(Intent.COMPOSTO, r.intent)
        assertTrue(r.texto(), r.blocos.any { it is Bloco.Campo && it.rotulo == "Ponto de fusão" && it.valor == "1.073,85 K (800,7 °C)" })
        assertTrue(r.blocos.any { it is Bloco.Campo && it.rotulo == "Estado físico a 25 °C e 1 atm" && it.valor == "sólido" })
        assertTrue(r.fontes.any { it.nome == "SaibaTudo Química (valor derivado)" })
    }

    @Test fun elementoComAvisoENotaNaResposta() {
        val b = real() ?: return assumeTrue(false)
        val af = responder(b, "afinidade eletrônica do boro")
        assertTrue(af.blocos.any { it is Bloco.Aviso && it.texto.startsWith("Valor a revisar") })
        val en = responder(b, "eletronegatividade do boro")
        assertTrue(en.blocos.any { it is Bloco.Aviso && it.texto.startsWith("Escala de Pauling") })
        assertFalse(responder(b, "eletronegatividade do flúor").blocos.any { it is Bloco.Aviso && it.texto.startsWith("Valor a revisar") })
    }

    /** Varredura: toda medida de todo composto do pacote real formata, tem origem e nunca é lida de um campo de outra unidade. */
    @Test fun varreduraDasMedidasDoPacoteReal() = runBlocking {
        val p = TestData.Real?.pacote ?: return@runBlocking assumeTrue(false)
        val un = Unidades.de(p.regras)
        val tab = Propriedades.tabela(p.regras, pt)
        var comMedida = 0
        var total = 0
        for (e in p.indice.entradas) {
            val c = p.composto(e.cid) ?: continue
            val ms = Propriedades.medidasDoComposto(c, tab, pt, un)
            if (ms.any { it.def.id != "estadoPadrao" }) comMedida++
            for (m in ms) {
                total++
                assertTrue("${c.cid} ${m.def.id} sem origem", m.fontes.isNotEmpty())
                if (m.def.id == "solubilidade") assertTrue(m.formatado.curto.endsWith(if (m.campo == "solubilidadeAguaGL") "g/L" else "g/100 g"))
            }
        }
        assertTrue("compostos com medidas: $comMedida", comMedida >= 800)
        assertTrue(total > comMedida)
    }
}
