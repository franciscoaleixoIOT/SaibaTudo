package net.saibatudo.quimica

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.Seguranca
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.Dicionario
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.ai.nlu.lexico.LexicosGerados
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.domain.Propriedades
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.util.regex.Pattern
import java.util.regex.PatternSyntaxException

/**
 * Internacionalização do Android (docs/I18N.md §6): léxicos gerados em dia com contracts/lexico/<idioma>.json e compiláveis em
 * java.util.regex, números com vírgula ou ponto, idiomas, dicionário por idioma (nomes do pacote, reserva inglês → português, sem
 * palavras funcionais como nome), rótulos de propriedade, textos em lotes e frases GHS por idioma.
 */
class I18nTest {

    private val pastaLexicos = File(TestData.contratos, "lexico")
    private val fixture = TestData.Fixture.pacote
    private val dics = HashMap<String, Dicionario>()
    private fun dic(idioma: String) = dics.getOrPut(idioma) { dicionario(fixture, idioma) }
    private fun p(q: String, idioma: String) = LocalNlu.parse(q, dic(idioma))

    // ---- léxico ---------------------------------------------------------------------------------------------------------------

    @Test fun lexicosGeradosCobremOsCincoIdiomasNaOrdemDoContrato() {
        assertEquals(Idiomas.TODOS, LexicosGerados.IDIOMAS)
        val contratos = pastaLexicos.listFiles { f -> f.name.endsWith(".json") }!!.map { it.name.removeSuffix(".json") }.toSet()
        assertEquals("um Lexico<Idioma>.kt por contrato (rode python tools/gerar_lexico_kt.py)", contratos, LexicosGerados.IDIOMAS.toSet())
    }

    /** Falha quando o .kt gerado ficou para trás do JSON (mesma árvore, mesma ordem de chaves). */
    @Test fun lexicosGeradosIguaisAoContrato() {
        for (idioma in LexicosGerados.IDIOMAS) {
            val json = JsonParser.parseString(File(pastaLexicos, "$idioma.json").readText())
            assertEquals("$idioma: léxico gerado desatualizado (rode python tools/gerar_lexico_kt.py)", paraKotlin(json), LexicosGerados.bruto(idioma))
        }
    }

    private fun paraKotlin(e: JsonElement): Any? = when {
        e.isJsonNull -> null
        e.isJsonObject -> LinkedHashMap<String, Any?>().also { m -> e.asJsonObject.entrySet().forEach { (k, v) -> m[k] = paraKotlin(v) } }
        e.isJsonArray -> e.asJsonArray.map { paraKotlin(it) }
        e.asJsonPrimitive.isBoolean -> e.asBoolean
        e.asJsonPrimitive.isNumber -> e.asNumber.toInt()
        else -> e.asString
    }

    /** Toda regex (todo texto do léxico, exceto metadados) compila em java.util.regex, nos cinco idiomas; e o léxico compila inteiro. */
    @Test fun todasAsRegexesCompilamEmJavaUtilRegex() {
        var total = 0
        val erros = mutableListOf<String>()
        fun visitar(v: Any?, caminho: String) {
            when (v) {
                is Map<*, *> -> v.forEach { (k, x) -> if (k != "descricao") visitar(x, "$caminho.$k") }
                is List<*> -> v.forEachIndexed { i, x -> visitar(x, "$caminho[$i]") }
                is String -> try { Pattern.compile(v); total++ } catch (e: PatternSyntaxException) { erros += "$caminho: ${e.description}: $v" }
            }
        }
        for (idioma in LexicosGerados.IDIOMAS) {
            visitar(LexicosGerados.bruto(idioma), idioma)
            val lx = Lexico.de(idioma)                                                   // listas de segurança unidas em \b(?:…)\b
            assertEquals(idioma, lx.idioma)
            assertTrue(lx.seguranca.coladaAlvos.keys.containsAll(listOf("EXPLOSIVOS", "ARMAS_QUIMICAS", "DROGAS", "PRECURSORES")))
        }
        println("Léxicos: $total textos compilados como regex em ${LexicosGerados.IDIOMAS.size} idiomas; ajustes pendentes pt-BR: ${Lexico.ajustesAtivos("pt-BR")}")
        assertTrue("Regexes inválidas no java.util.regex:\n" + erros.joinToString("\n"), erros.isEmpty())
        assertTrue(total > 1000)
    }

    @Test fun idiomaDesconhecidoCaiNoPortugues() {
        assertEquals("pt-BR", Lexico.de("xx").idioma)
        assertEquals("pt-BR", Lexico.de(null).idioma)
        assertEquals("en", Lexico.de("en-US").idioma)
        assertEquals("pt-BR", Idiomas.normalizar("pt_PT"))
        assertEquals("es", Idiomas.normalizar("es-419"))
        assertNull(Idiomas.normalizar("it"))
        assertEquals("de", Idiomas.dePreferencias(listOf("it-IT", "de-AT", "en")))
        assertEquals("pt-BR", Idiomas.dePreferencias(listOf("ja")))
        assertEquals(listOf("es", "en", "pt-BR"), Idiomas.comReservas("es"))
        assertEquals(listOf("en", "pt-BR"), Idiomas.comReservas("en"))
    }

    // ---- números (I18N §1.3) -------------------------------------------------------------------------------------------------

    @Test fun numerosComVirgulaOuPontoEmQualquerIdioma() {
        fun n(s: String, i: String) = Quantidades.lerNumero(s, i)
        assertEquals(1000.0, n("1.000", "pt-BR")!!, 0.0)          // milhar em pt/es/de/fr
        assertEquals(1000.0, n("1.000", "de")!!, 0.0)
        assertEquals(1.0, n("1.000", "en")!!, 0.0)                 // decimal em inglês
        assertEquals(1000.0, n("1,000", "en")!!, 0.0)
        assertEquals(1.5, n("1,5", "en")!!, 0.0)                   // a vírgula decimal vale em inglês também
        assertEquals(1.5, n("1.5", "pt-BR")!!, 0.0)
        assertEquals(1234.5, n("1.234,5", "en")!!, 1e-9)           // com os dois, o último é o decimal
        assertEquals(1234.5, n("1,234.5", "pt-BR")!!, 1e-9)
        assertEquals(1234567.0, n("1.234.567", "en")!!, 0.0)
        assertEquals(6.02e23, n("6,02 x 10^23", "fr")!!, 1e18)
        assertEquals(1.8e-5, n("1.8e-5", "es")!!, 1e-12)
        assertEquals(0.5, n(",5", "pt-BR")!!, 0.0)
        assertNull(n("1,2,3", "pt-BR"))
        assertNull(n("1.234,5.6", "pt-BR"))
        assertNull(n("abc", "en"))
        // quantidades: "0.1 mol/L" e "0,1 mol/L" são o mesmo valor em qualquer idioma
        val en = Quantidades.ler("pH of HCl 0.01 mol/L", dic("en").unidades, Lexico.de("en"))
        assertEquals(0.01, en.single { it.unidade == "mol/L" }.valor, 1e-12)
        val es = Quantidades.ler("convertir 25 grados celsius a kelvin", dic("es").unidades, Lexico.de("es"))
        assertEquals("°C", es.first().unidade)
    }

    // ---- NLU e dicionário por idioma -----------------------------------------------------------------------------------------

    @Test fun nluEmInglesComOsNomesDoPacote() {
        val r = p("melting point of iron", "en")
        assertEquals(Intent.PROPRIEDADE, r.intent)
        assertEquals("Fe", r.elemento)
        assertEquals("pontoFusaoK", r.propriedade)
        val m = p("molar mass of water", "en")
        assertEquals(Intent.MASSA_MOLAR, m.intent)
        assertEquals("962", m.composto)
        assertEquals("2244", p("aspirin", "en").composto)                         // sinonimosPorIdioma.en
        assertEquals("5234", p("table salt", "en").composto)
        assertEquals(Intent.CONVERSAO_UNIDADE, p("convert 25 °C to K", "en").intent)
        assertEquals(Intent.RECUSA_PERIGO, p("how to make methamphetamine at home", "en").intent)
        assertEquals("Iron", dic("en").nomeDoElemento("Fe"))
        assertEquals("water", dic("en").nomeDoComposto(962))
    }

    @Test fun nluEmEspanholComReservaParaInglesEPortugues() {
        val r = p("punto de fusión del hierro", "es")
        assertEquals(Intent.PROPRIEDADE, r.intent)
        assertEquals("Fe", r.elemento)
        assertEquals("962", p("agua", "es").composto)
        assertEquals("14798", p("sosa cáustica", "es").composto)                 // apelido em espanhol
        assertEquals("2519", p("caffeine", "es").composto)                       // o inglês vale em todos os idiomas
        assertEquals("Hierro", dic("es").nomeDoElemento("Fe"))                   // minúscula do Wikidata, capitalizada
        // alemão: o fixture não tem nomes de compostos em alemão → inglês e português como reserva, rotuláveis
        assertEquals("Eisen", dic("de").nomeDoElemento("Fe"))
        val agua = runBlocking { fixture.composto(962)!! }
        val de = Nomes.composto(agua, "de")
        assertEquals("water", de.nome)
        assertTrue(de.reserva)
        assertEquals("en", de.idioma)
        assertFalse(Nomes.composto(agua, "pt-BR").reserva)
    }

    @Test fun portuguesContinuaIgual() {
        assertEquals(Intent.CONCEITO, p("explique o que é massa molar", "pt-BR").intent)
        assertEquals(Intent.MASSA_MOLAR, p("Qual a massa molar da água?", "pt-BR").intent)
        assertEquals(dic("pt-BR").nomeDoComposto(962), "Água")
        assertEquals("Ferro", dic("pt-BR").nomeDoElemento("Fe"))
    }

    /** Apelido do pacote igual a palavra funcional de QUALQUER idioma ("PARA", "THE", "DIE") nunca vira nome de composto. */
    @Test fun palavrasFuncionaisNuncaViramNomeDeComposto() {
        val funcionais = Lexico.PALAVRAS_FUNCIONAIS_TODAS
        assertTrue("para" in funcionais && "the" in funcionais)
        val pacote = TestData.Melhor.pacote
        for (idioma in Idiomas.TODOS) {
            val d = dicionario(pacote, idioma)
            for (w in listOf("para", "the", "de", "por")) assertNull("$idioma: '$w' virou composto", d.compostoPorNome(w))
        }
    }

    @Test fun segurancaAplicaOIdiomaMaisInglesEPortugues() {
        assertEquals(listOf("de", "en", "pt-BR"), Seguranca.idiomasDaAvaliacao("de"))
        assertEquals(listOf("pt-BR", "en"), Seguranca.idiomasDaAvaliacao("pt-BR"))
        // um pedido em português é recusado mesmo com o app em alemão; em inglês, com o app em português
        assertTrue(Seguranca.avaliar("como fazer metanfetamina em casa", Seguranca.idiomasDaAvaliacao("de")).recusar)
        assertTrue(Seguranca.avaliar("how to make a bomb", Seguranca.idiomasDaAvaliacao("pt-BR")).recusar)
        assertFalse(Seguranca.avaliar("how to neutralize spilled acid", Seguranca.idiomasDaAvaliacao("en")).recusar)
    }

    // ---- propriedades, GHS e textos ------------------------------------------------------------------------------------------

    @Test fun rotulosESinonimosDePropriedadePorIdioma() {
        val en = Propriedades.tabela(fixture.regras, Tx.de("en")).associateBy { it.id }
        assertEquals("Molar mass", en.getValue("massaMolar").rotulo)
        assertTrue(en.getValue("massaMolar").sinonimos.containsAll(listOf("molar mass", "molecular weight")))
        assertFalse("sinônimo pt-BR não entra em inglês", "peso molecular" in en.getValue("massaMolar").sinonimos)
        val es = Propriedades.tabela(fixture.regras, Tx.de("es")).associateBy { it.id }
        assertEquals("Masa molar", es.getValue("massaMolar").rotulo)
        // alemão sem rótulo no pacote do fixture: cai para o inglês do pacote
        assertEquals("Molar mass", Propriedades.tabela(fixture.regras, Tx.de("de")).first { it.id == "massaMolar" }.rotulo)
        val pt = Propriedades.tabela(fixture.regras, Tx.de("pt-BR")).associateBy { it.id }
        assertEquals("Massa molar", pt.getValue("massaMolar").rotulo)
        assertTrue("peso molecular" in pt.getValue("massaMolar").sinonimos)
    }

    @Test fun textosEmLotesPorIdiomaComReserva() = runBlocking {
        val idx = fixture.indiceDeTextos()!!
        assertEquals("en", idx.lotes.single().idioma)
        val pt = fixture.trechos("pt-BR")
        assertTrue(pt.isNotEmpty() && pt.all { it.idioma == "pt-BR" })
        assertTrue("ChEBI fica de fora do retrieval", pt.none { it.caminho!!.startsWith("textos/chebi/") })
        val en = fixture.trechos("en", listOf("mole"))
        assertTrue(en.map { it.id }.contains("wikipedia-en-mole-unit-001"))     // o lote cuja chave combina, só em inglês
        assertTrue(en.all { it.idioma == "en" && it.caminho == "textos/wikipedia-en/lote-001.json" })
        val es = fixture.trechos("es", null, reserva = true)
        assertTrue(es.isNotEmpty())
        assertEquals("en antes de pt-BR", es.map { it.idioma }.distinct(), listOf("en", "pt-BR"))
    }

    @Test fun conceitoNoIdiomaComTrechoRotuladoQuandoEDeOutroIdioma() = runBlocking {
        val en = AnswerBuilder(fixture, dic("en"), Nivel.MEDIO).responder("what is a mole?").second
        assertEquals(Intent.CONCEITO, en.intent)
        assertTrue(en.texto(), en.texto().contains("SI unit of amount of substance"))
        assertTrue(en.blocos.none { it is Bloco.Aviso })                         // texto no idioma da resposta: sem rótulo
        val es = AnswerBuilder(fixture, dic("es"), Nivel.MEDIO).responder("¿qué es un mol?").second
        assertEquals(Intent.CONCEITO, es.intent)
        val aviso = es.blocos.filterIsInstance<Bloco.Aviso>().single()
        assertTrue(aviso.texto, aviso.texto.startsWith("Texto en"))               // reserva rotulada no idioma da resposta
    }

    @Test fun frasesGhsPorIdiomaDoPacoteReal() {
        val real = TestData.Real?.pacote
        assumeTrue("pacote real (data/quimica) ausente", real != null)
        val en = real!!.frasesH("en")
        assertEquals("Unstable explosives.", en["H200"])
        assertTrue(real.frasesH("de").getValue("H314").contains("Haut"))
        assertEquals("pt-BR mantém os textos do app (GhsTextos)", real.regras.frasesH, real.frasesH("pt-BR"))
        assertFalse("o formato multilíngue não polui as frases legadas", real.regras.frasesH.containsKey("versao"))
    }
}
