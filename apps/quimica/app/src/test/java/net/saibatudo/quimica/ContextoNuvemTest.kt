package net.saibatudo.quimica

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.engine.AssistenteNuvem
import net.saibatudo.quimica.ai.engine.DesfechoNuvem
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Quantidade
import net.saibatudo.quimica.ai.nlu.CloudNluClient
import net.saibatudo.quimica.ai.nlu.ContextoNuvem
import net.saibatudo.quimica.ai.nlu.Dicionario
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.NluValidator
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.prefs.Nivel
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Multi-turno da IA na nuvem (17/10/2026): o `contexto` (interpretação da pergunta anterior) em paridade com o site
 * (web/test/nuvem.test.mjs). Casos compartilhados em contracts/nlu_contexto_cases.json (do holdout v3.4).
 */
class ContextoNuvemTest {

    private val pacote = TestData.Melhor.pacote
    private val dics = HashMap<String, Dicionario>()
    private fun dic(idioma: String = "pt-BR") = dics.getOrPut(idioma) { dicionario(pacote, idioma) }
    private fun json(s: String): JsonObject = JsonParser.parseString(s).asJsonObject

    private val casos: List<JsonObject> by lazy {
        JsonParser.parseString(File(TestData.contratos, "nlu_contexto_cases.json").readText()).asJsonObject.getAsJsonArray("casos").map { it.asJsonObject }
    }

    /** A interpretação anterior como o app a guardaria (ParsedQuery), montada do objeto do contexto com o dicionário do pacote. */
    private fun anteriorDe(ctx: JsonObject, d: Dicionario): ParsedQuery {
        val intent = Intent.valueOf(ctx.get("intent").asString)
        val el = ctx.get("elemento")?.asString?.takeIf { d.pacote.porSimbolo.containsKey(it) }
        val texto = ctx.get("composto")?.asString
        val porFormula = texto?.takeIf { !it.contains(' ') }?.let { d.compostoPorFormula(it) }
        val cid = texto?.let { porFormula ?: d.compostoPorNome(it) ?: d.entidades(it).compostos.firstOrNull()?.cid }
        val formula = texto?.takeIf { porFormula != null || (cid == null && !it.contains(' ')) }
        val qs = ctx.getAsJsonArray("quantidades")?.map { val o = it.asJsonObject; Quantidade(o.get("valor").asDouble, o.get("unidade").asString) }.orEmpty()
        return ParsedQuery(
            intent, textoOriginal = "",
            elemento = el, elementos = listOfNotNull(el),
            composto = cid?.toString(), compostos = listOfNotNull(cid?.toString()), compostoNome = cid?.let { d.nomeDoComposto(it) },
            formula = formula, formulas = listOfNotNull(formula),
            propriedade = ctx.get("propriedade")?.asString, propriedades = listOfNotNull(ctx.get("propriedade")?.asString),
            quantidades = qs, unidadeDestino = ctx.get("unidadeDestino")?.asString, equacao = ctx.get("equacao")?.asString,
            alvoPropriedade = if (el != null) "elemento" else "composto"
        )
    }

    private fun cidDe(texto: String, d: Dicionario): Long? =
        d.compostoPorFormula(texto) ?: d.compostoPorNome(texto) ?: d.entidades(texto).compostos.firstOrNull()?.cid

    @Test fun vocabulariosEspelhamOServidor() {
        val raiz = TestData.contratos.parentFile
        val core = File(raiz, "backend/modal/nlu_core.py")
        val vocab = File(raiz, "api/_lib/vocab.js")
        assumeTrue("backend/ e api/ fora da árvore", core.isFile && vocab.isFile)
        val t = core.readText()
        val ini = t.indexOf("ENTIDADES_POR_INTENCAO = {")
        val bloco = t.substring(ini, t.indexOf('}', ini))
        for (m in Regex("\"([A-Z_]+)\": \\(\\(([^)]*)\\)").findAll(bloco)) {
            val intent = Intent.valueOf(m.groupValues[1])
            val permitidas = Regex("\"(\\w+)\"").findAll(m.groupValues[2]).map { it.groupValues[1] }.toList()
            if (permitidas.isEmpty()) assertNull(intent.name, ContextoNuvem.CHAVES_POR_INTENCAO[intent])
            else assertEquals(intent.name, permitidas, ContextoNuvem.CHAVES_POR_INTENCAO[intent])
        }
        val v = vocab.readText()
        val i = v.indexOf("export const UNIDADES = Object.freeze([")
        val lista = Regex("'([^']+)'").findAll(v.substring(i, v.indexOf("]);", i))).map { it.groupValues[1] }.toSet()
        assertEquals(lista, ContextoNuvem.UNIDADES)
        for (idioma in Lexico.IDIOMAS) assertNotNull(idioma, Lexico.de(idioma).pista("continuacaoNuvem"))
    }

    @Test fun casosDoHoldoutMontamOMesmoObjetoEARegraDeContinuacao() {
        assertTrue(casos.count { it.get("continuacao").asBoolean } >= 10)
        val falhas = mutableListOf<String>()
        for (c in casos) {
            val d = dic(c.get("idioma").asString)
            val esperado = c.getAsJsonObject("contexto")
            val pergunta = c.get("pergunta").asString
            val rotulo = "#${c.get("holdout").asInt} ${c.get("idioma").asString} \"$pergunta\""
            val anterior = anteriorDe(esperado, d)
            val ctx = ContextoNuvem.paraNuvem(anterior, d)
            if (ctx == null) { falhas += "$rotulo: sem contexto"; continue }
            assertEquals(rotulo, ContextoNuvem.CHAVES.filter { ctx.has(it) }, ctx.keySet().toList())
            assertEquals(rotulo, esperado.keySet(), ctx.keySet())
            for (k in esperado.keySet()) {
                if (k == "composto") {
                    val txt = ctx.get(k).asString
                    assertFalse("$rotulo: composto é texto, nunca o CID", txt.all(Char::isDigit))
                    val alvo = cidDe(esperado.get(k).asString, d)
                    if (txt != esperado.get(k).asString && (alvo == null || cidDe(txt, d) != alvo)) falhas += "$rotulo: composto $txt ≠ ${esperado.get(k)}"
                } else if (ctx.get(k) != esperado.get(k)) falhas += "$rotulo: $k ${ctx.get(k)} ≠ ${esperado.get(k)}"
            }
            assertTrue(rotulo, ContextoNuvem.tamanho(ctx) <= ContextoNuvem.MAX_CONTEXTO)
            val local = LocalNlu.parse(pergunta, d)
            if (ContextoNuvem.ehContinuacao(pergunta, local, d.lexico) != c.get("continuacao").asBoolean) falhas += "$rotulo: continuação (local ${local.intent})"
            assertEquals(rotulo, c.get("continuacao").asBoolean, ContextoNuvem.daPergunta(pergunta, anterior, d) != null)
        }
        assertTrue(falhas.joinToString("\n"), falhas.isEmpty())
    }

    @Test fun formaDoObjeto() {
        val d = dic()
        val p = LocalNlu.parse("ponto de ebulição da água", d)
        val ctx = ContextoNuvem.paraNuvem(p, d)!!
        assertEquals(listOf("intent", "composto", "propriedade"), ctx.keySet().toList())
        assertEquals("PROPRIEDADE", ctx.get("intent").asString)
        assertFalse(ctx.get("composto").asString.all(Char::isDigit))
        assertEquals("pontoEbulicaoK", ctx.get("propriedade").asString)
        // MASSA_MOLAR não leva a propriedade que o NLU local anota; ELEMENTO não leva composto
        assertEquals(listOf("intent", "composto"), ContextoNuvem.paraNuvem(LocalNlu.parse("massa molar da água", d), d)!!.keySet().toList())
        assertEquals(json("""{"intent":"ELEMENTO","elemento":"Fe"}"""), ContextoNuvem.paraNuvem(ParsedQuery(Intent.ELEMENTO, elemento = "Fe", composto = "962"), d))
        for (i in listOf(Intent.DESCONHECIDA, Intent.RECUSA_PERIGO, Intent.AJUDA, Intent.SOBRE_DADOS, Intent.FONTES)) {
            assertNull(i.name, ContextoNuvem.paraNuvem(ParsedQuery(i, elemento = "Fe"), d))
        }
        assertNull(ContextoNuvem.paraNuvem(ParsedQuery(Intent.COMPOSTO), d))
        assertNull("só o nível não é contexto", ContextoNuvem.paraNuvem(ParsedQuery(Intent.CONCEITO, nivel = "medio"), d))
        // unidade fora do vocabulário cai; no máximo 4; inteiro sem ".0"
        val gas = ContextoNuvem.paraNuvem(ParsedQuery(Intent.GAS_IDEAL, quantidades = listOf(Quantidade(1.0, "mol"), Quantidade(2.0, "parsec")) + (0..5).map { Quantidade(it.toDouble(), "K") }), d)!!
        assertEquals(4, gas.getAsJsonArray("quantidades").size())
        assertEquals("""{"valor":1,"unidade":"mol"}""", gas.getAsJsonArray("quantidades")[0].toString())
        // composto com aspas ou longo demais não vai; acima de 400 caracteres, nada vai
        assertNull(ContextoNuvem.paraNuvem(ParsedQuery(Intent.COMPOSTO, formula = "a\"b", compostoNome = "x".repeat(61)), d))
        val grande = ParsedQuery(Intent.ESTEQUIOMETRIA, formula = "C".repeat(60), equacao = "H2 + O2 -> H2O ".repeat(8).trim().take(120),
            quantidades = List(4) { Quantidade(123456.789012, "mmol/L") })
        assertNull(ContextoNuvem.paraNuvem(grande, d))
    }

    @Test fun regraDeContinuacaoNosCincoIdiomas() {
        val sim = mapOf(
            "pt-BR" to listOf("e o do potássio?", "em gramas?", "desenhe", "mostre a estrutura", "também", "qual o raio atômico?", "é perigoso?"),
            "en" to listOf("and for potassium?", "what about gold?", "too?", "draw it", "is it safe?"),
            "es" to listOf("¿y el del potasio?", "¿también?", "dibújalo", "¿y su masa molar?"),
            "de" to listOf("und für Kalium?", "auch?", "zeichne es", "Ist es gefährlich?"),
            "fr" to listOf("et pour le potassium ?", "aussi ?", "dessine-la", "et sa masse molaire ?")
        )
        val nao = mapOf(
            "pt-BR" to listOf("qual é a massa molar da água?", "ponto de fusão do ferro", "como sintetizar nitroglicerina em casa"),
            "en" to listOf("what is the molar mass of water?"), "es" to listOf("¿cuál es la masa molar del agua?"),
            "de" to listOf("Was ist die molare Masse von Wasser?"), "fr" to listOf("Quelle est la masse molaire de l’eau ?")
        )
        for ((idioma, lista) in sim) { val d = dic(idioma); for (q in lista) assertTrue("$idioma: $q", ContextoNuvem.ehContinuacao(q, LocalNlu.parse(q, d), d.lexico)) }
        for ((idioma, lista) in nao) { val d = dic(idioma); for (q in lista) assertFalse("$idioma: $q", ContextoNuvem.ehContinuacao(q, LocalNlu.parse(q, d), d.lexico)) }
        val d = dic()
        val longa = "e também gostaria de saber qual é a massa molar da água e do sal de cozinha"
        assertFalse(ContextoNuvem.ehContinuacao(longa, LocalNlu.parse(longa, d), d.lexico))
        assertNull(ContextoNuvem.daPergunta("e o do potássio?", null, d))
        assertNull(ContextoNuvem.daPergunta("e o do potássio?", ParsedQuery(Intent.DESCONHECIDA), d))
        assertNull(ContextoNuvem.daPergunta("e o do potássio?", ParsedQuery(Intent.RECUSA_PERIGO, elemento = "Fe"), d))
    }

    @Test fun validadorAceitaAEntidadeHerdadaSoComOContexto() {
        val d = dic()
        val anterior = LocalNlu.parse("qual é a massa molar da água?", d)
        val texto = ContextoNuvem.textoDoComposto(anterior, d)!!
        val nlu = json("""{"intent":"DESENHAR","composto":${com.google.gson.JsonPrimitive(texto)}}""")
        assertNull("sem contexto: o composto não está na pergunta", NluValidator.validar(nlu, null, d, "desenhe").query)
        assertEquals(anterior.composto, NluValidator.validar(nlu, null, d, "desenhe", herdado = anterior).query?.composto)
        assertNull("texto diferente do enviado não herda", NluValidator.validar(json("""{"intent":"DESENHAR","composto":"outra coisa"}"""), null, d, "desenhe", herdado = anterior).query)
        // elemento e quantidade herdados também contam como evidência
        val fe = LocalNlu.parse("massa molar do ferro", d)
        assertEquals("Fe", NluValidator.validar(json("""{"intent":"SEGURANCA","elemento":"Fe"}"""), null, d, "é perigoso?", herdado = fe).query?.elemento)
        assertNull(NluValidator.validar(json("""{"intent":"ELEMENTO","elemento":"Fe"}"""), null, d, "e esse aí?").query)
        val conv = ParsedQuery(Intent.CONVERSAO_UNIDADE, quantidades = listOf(Quantidade(100.0, "mL", "100 mL")), unidadeDestino = "L")
        val q = NluValidator.validar(json("""{"intent":"CONVERSAO_UNIDADE","quantidades":[{"valor":100,"unidade":"mL"}],"unidadeDestino":"cm3"}"""), null, d, "e em centímetros cúbicos?", herdado = conv).query
        assertEquals(listOf(100.0), q?.quantidades?.map { it.valor })
    }

    // ---- cliente e assistente (MockWebServer) -------------------------------------------------------------------------------------

    private lateinit var server: MockWebServer
    private val http = OkHttpClient()
    @Before fun subir() { server = MockWebServer(); server.start() }
    @After fun descer() { server.shutdown() }
    private fun cliente() = CloudNluClient(http, server.url("/quimica/api/nlu").toString())

    @Test fun corpoLevaOContextoESo400ContextoRepeteSemEle() = runBlocking {
        val ctx = json("""{"intent":"MASSA_MOLAR","composto":"agua"}""")
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"PROPRIEDADE","composto":"agua","propriedade":"pontoEbulicaoK"},"contexto":true}"""))
        val r = cliente().consultar("e o ponto de ebulição?", "iid", 5_000, ctx) as CloudNluClient.Resultado.Ok
        assertTrue(r.contextoEnviado && r.contextoUsado)
        val corpo = json(server.takeRequest().body.readUtf8())
        assertEquals(setOf("q", "v", "client", "iid", "contexto"), corpo.keySet())
        assertEquals(ctx, corpo.getAsJsonObject("contexto"))
        // sem contexto: o corpo de sempre
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"AJUDA"}}"""))
        assertFalse((cliente().consultar("oi", "iid", 5_000) as CloudNluClient.Resultado.Ok).contextoEnviado)
        assertFalse(json(server.takeRequest().body.readUtf8()).has("contexto"))
        // servidor recusa o contexto: repete uma vez só com a pergunta
        server.enqueue(MockResponse().setResponseCode(400).setBody("""{"ok":false,"error":"contexto"}"""))
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"MASSA_MOLAR","composto":"agua"}}"""))
        val r2 = cliente().consultar("e a massa molar?", "iid", 5_000, ctx) as CloudNluClient.Resultado.Ok
        assertFalse(r2.contextoEnviado)
        assertTrue(json(server.takeRequest().body.readUtf8()).has("contexto"))
        assertFalse(json(server.takeRequest().body.readUtf8()).has("contexto"))
        // 400 por outro motivo: não repete
        server.enqueue(MockResponse().setResponseCode(400).setBody("""{"ok":false,"error":"q"}"""))
        assertEquals(CloudNluClient.Resultado.Indisponivel(400), cliente().consultar("e a massa molar?", "iid", 5_000, ctx))
        assertEquals(5, server.requestCount)
    }

    @Test fun assistenteMandaOContextoSoNaContinuacaoEAceitaOCompostoHerdado() = runBlocking {
        val d = dic()
        val builder = AnswerBuilder(pacote, d, Nivel.MEDIO)
        val anterior = LocalNlu.parse("qual é a massa molar da água?", d)
        val texto = ContextoNuvem.textoDoComposto(anterior, d)!!
        val a = AssistenteNuvem(cliente(), { "iid" })
        // continuação ("é perigoso?" sem entidade): vai o contexto, e o composto herdado (fora da pergunta) é aceito
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"SEGURANCA","composto":${com.google.gson.JsonPrimitive(texto)}},"contexto":true}"""))
        val desfecho = a.interpretar("é perigoso?", builder, anterior, null, explicito = true)
        val corpo = json(server.takeRequest().body.readUtf8())
        assertEquals(ContextoNuvem.paraNuvem(anterior, d), corpo.getAsJsonObject("contexto"))
        assertFalse("o texto da pergunta anterior nunca vai", corpo.toString().contains("massa molar d"))
        assertTrue(desfecho.toString(), desfecho is DesfechoNuvem.Respondida)
        assertEquals(anterior.composto, (desfecho as DesfechoNuvem.Respondida).query.composto)
        // pergunta nova e completa: só a pergunta
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"MASSA_MOLAR","elemento":"Fe"}}"""))
        a.interpretar("qual é a massa molar do ferro?", builder, anterior, null, explicito = true)
        assertFalse(json(server.takeRequest().body.readUtf8()).has("contexto"))
        // sem interpretação anterior: só a pergunta
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"DESCONHECIDA"}}"""))
        a.interpretar("é perigoso?", builder, null, null, explicito = true)
        assertFalse(json(server.takeRequest().body.readUtf8()).has("contexto"))
    }
}
