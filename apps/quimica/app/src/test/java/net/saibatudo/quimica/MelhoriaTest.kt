package net.saibatudo.quimica

import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.data.prefs.InMemoryPreferences
import net.saibatudo.quimica.data.prefs.ItemMelhoria
import net.saibatudo.quimica.data.prefs.UserPreferences
import net.saibatudo.quimica.data.remote.EnvioMelhoria
import net.saibatudo.quimica.data.remote.Melhoria
import net.saibatudo.quimica.data.remote.MelhoriaClient
import net.saibatudo.quimica.data.remote.MelhoriaFila
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

/** "Ajudar a melhorar o app": filtro local (dado pessoal, pedido perigoso), cliente HTTP (MockWebServer) e fila (consentimento, lotes, limites). */
class MelhoriaTest {

    // ---- filtro -------------------------------------------------------------------------------------------------------------------

    @Test
    fun perguntasDeQuimicaPassamNoFiltro() {
        listOf(
            "qual a massa molar do NaCl?", "CAS 7732-18-5", "CID 2244", "pH de HCl 0,01 M", "Fe + O2 -> Fe2O3", "6,02 x 10^23 moléculas",
            "quantos mols em 18 g de água", "ponto de fusão do ferro em 1538 °C", "What is the boiling point of ethanol?", "E. coli e etanol"
        ).forEach { assertEquals(it, it, Melhoria.textoEnfileiravel(it)) }
    }

    @Test
    fun dadoPessoalNuncaEntra() {
        listOf(
            "meu email é fulano@exemplo.com, o que é pH?", "me liga no (11) 91234-5678", "telefone +55 11 912345678", "CPF 123.456.789-09 massa molar",
            "CNPJ 12.345.678/0001-90", "veja https://exemplo.com/x", "site www.quimica.net", "olha exemplo.com.br", "segue @fulano_quimica",
            "o número é 123456789012", "cartão 4111 1111 1111 1111", "ligue 3456-7890"
        ).forEach { assertNull(it, Melhoria.textoEnfileiravel(it)) }
    }

    @Test
    fun pedidoPerigosoNuncaEntraEmNenhumIdioma() {
        assertNull(Melhoria.textoEnfileiravel("Como fazer metanfetamina em casa?", "pt-BR"))
        assertNull(Melhoria.textoEnfileiravel("Passo a passo para sintetizar MDMA", "pt-BR"))
        assertNull(Melhoria.textoEnfileiravel("How to make methamphetamine at home", "en"))
        // a regra vale mesmo com o app em outro idioma (avaliação no idioma + inglês + português)
        assertNull(Melhoria.textoEnfileiravel("How to make methamphetamine at home", "de"))
    }

    @Test
    fun tamanhoEControles() {
        assertNull(Melhoria.textoEnfileiravel("ab"))
        assertNull(Melhoria.textoEnfileiravel("a".repeat(301)))
        assertEquals("o que é pH", Melhoria.textoEnfileiravel("  o que​ é\n\tpH  "))
        assertTrue(Regex("""\d{4}-\d{2}-\d{2}""").matches(Melhoria.hoje(0L)))
    }

    // ---- cliente (MockWebServer) ----------------------------------------------------------------------------------------------

    private lateinit var server: MockWebServer
    private val http = OkHttpClient.Builder().callTimeout(5, TimeUnit.SECONDS).build()
    private val itens = listOf(ItemMelhoria("o que é xyzlândia", "DESCONHECIDA", "2026-10-16", "pt-BR"))
    private val iid = "123e4567-e89b-42d3-a456-426614174000"

    @Before fun subir() { server = MockWebServer(); server.start() }
    @After fun descer() { runCatching { server.shutdown() } }

    private fun cliente() = MelhoriaClient(http, server.url("/quimica/api/melhoria").toString())

    @Test
    fun enviaOCorpoDoContratoE200Aceita() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"ok":true,"aceitos":1,"descartados":0}"""))
        val r = cliente().enviar(itens, iid, "pt-BR")
        assertEquals(EnvioMelhoria.Aceito(1, 0), r)
        val req = server.takeRequest()
        assertEquals("POST", req.method)
        assertEquals("/quimica/api/melhoria", req.path)
        val corpo = JsonParser.parseString(req.body.readUtf8()).asJsonObject
        assertEquals(1, corpo.get("v").asInt)
        assertEquals("android", corpo.get("client").asString)
        assertEquals(iid, corpo.get("iid").asString)
        assertEquals("pt-BR", corpo.get("idioma").asString)
        val item = corpo.getAsJsonArray("itens")[0].asJsonObject
        assertEquals(setOf("q", "intentLocal", "t"), item.keySet())   // nem o "explicito" nem o idioma do item vão por item
        assertEquals("o que é xyzlândia", item.get("q").asString)
        assertEquals("DESCONHECIDA", item.get("intentLocal").asString)
        assertEquals("2026-10-16", item.get("t").asString)
    }

    @Test
    fun respostasDeFalha() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"ok":false,"error":"disabled"}"""))
        assertEquals(EnvioMelhoria.Desligado, cliente().enviar(itens, iid, "pt-BR"))
        server.enqueue(MockResponse().setResponseCode(429).setBody("""{"ok":false,"error":"rate_limited"}"""))
        assertEquals(EnvioMelhoria.Limite, cliente().enviar(itens, iid, "pt-BR"))
        server.enqueue(MockResponse().setResponseCode(400).setBody("""{"ok":false,"error":"invalid"}"""))
        assertEquals(EnvioMelhoria.Invalido, cliente().enviar(itens, iid, "pt-BR"))
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"ok":false,"error":"budget"}"""))
        assertEquals(EnvioMelhoria.Falhou, cliente().enviar(itens, iid, "pt-BR"))
        server.enqueue(MockResponse().setResponseCode(200).setBody("não é json"))
        assertEquals(EnvioMelhoria.Falhou, cliente().enviar(itens, iid, "pt-BR"))
    }

    @Test
    fun semRedeFalhaSemLancar() = runBlocking {
        val url = server.url("/quimica/api/melhoria").toString()
        server.shutdown()
        assertEquals(EnvioMelhoria.Falhou, MelhoriaClient(http, url).enviar(itens, iid, "pt-BR"))
    }

    // ---- fila -------------------------------------------------------------------------------------------------------------------

    private class Envios(var resposta: EnvioMelhoria = EnvioMelhoria.Aceito(0, 0)) {
        val lotes = mutableListOf<Pair<List<ItemMelhoria>, String>>()
        suspend fun enviar(itens: List<ItemMelhoria>, iid: String, idioma: String): EnvioMelhoria { lotes += itens to idioma; return resposta }
    }

    private fun fila(prefs: InMemoryPreferences, envios: Envios) = MelhoriaFila(prefs, enviarLote = envios::enviar, relogio = { 1_760_000_000_000L })

    @Test
    fun semConsentimentoSoEntraPeloBotao() = runBlocking {
        val prefs = InMemoryPreferences()
        val f = fila(prefs, Envios())
        assertFalse(f.enfileirar("o que é xyzlândia", "DESCONHECIDA", "pt-BR"))
        assertTrue(prefs.atual().filaMelhoria.isEmpty())
        assertTrue(f.enfileirar("o que é xyzlândia", "DESCONHECIDA", "pt-BR", explicito = true))
        assertTrue(prefs.atual().filaMelhoria.single().explicito)
    }

    @Test
    fun comConsentimentoFiltraRepeteNaoELimita() = runBlocking {
        val prefs = InMemoryPreferences(UserPreferences(melhoria = true))
        val f = fila(prefs, Envios())
        assertTrue(f.enfileirar("pergunta estranha um", "DESCONHECIDA", "pt-BR"))
        assertFalse(f.enfileirar("PERGUNTA ESTRANHA UM", "DESCONHECIDA", "pt-BR"))
        assertFalse(f.enfileirar("Como fazer metanfetamina em casa?", "RECUSA_PERIGO", "pt-BR"))
        assertFalse(f.enfileirar("meu email é a@b.com", "DESCONHECIDA", "pt-BR"))
        repeat(40) { f.enfileirar("pergunta estranha número ${'a' + (it % 26)}${'a' + it / 26}", "DESCONHECIDA", "pt-BR") }
        assertEquals(Melhoria.LIMITE_FILA, prefs.atual().filaMelhoria.size)
        assertEquals(Melhoria.hoje(1_760_000_000_000L), prefs.atual().filaMelhoria.first().t)
    }

    @Test
    fun loteMinimoTamanhoEResultado() = runBlocking {
        val prefs = InMemoryPreferences(UserPreferences(melhoria = true))
        val envios = Envios()
        val f = fila(prefs, envios)
        f.enfileirar("pergunta estranha um", "DESCONHECIDA", "pt-BR")
        f.enfileirar("pergunta estranha dois", "DESCONHECIDA", "pt-BR")
        assertNull("abaixo do mínimo não envia", f.enviarSePreciso())
        assertTrue(envios.lotes.isEmpty())
        repeat(10) { f.enfileirar("outra pergunta estranha ${'a' + it}", "DESCONHECIDA", "pt-BR") }
        // 503 desligado / 429 / rede: a fila fica
        for (r in listOf(EnvioMelhoria.Desligado, EnvioMelhoria.Limite, EnvioMelhoria.Falhou)) {
            envios.resposta = r
            assertEquals(r, f.enviarSePreciso())
            assertEquals(12, prefs.atual().filaMelhoria.size)
        }
        envios.resposta = EnvioMelhoria.Aceito(10, 0)
        assertEquals(EnvioMelhoria.Aceito(10, 0), f.enviarSePreciso())
        assertEquals(Melhoria.LOTE, envios.lotes.last().first.size)
        assertEquals("pergunta estranha um", envios.lotes.last().first.first().q)   // mais antigas primeiro
        assertEquals(2, prefs.atual().filaMelhoria.size)
        // 400 inválido: sai da fila para não travar
        envios.resposta = EnvioMelhoria.Invalido
        assertEquals(EnvioMelhoria.Invalido, f.enviarSePreciso(forcar = true))
        assertTrue(prefs.atual().filaMelhoria.isEmpty())
    }

    @Test
    fun perguntaDoBotaoVaiSemEsperarOMinimoEOLoteEDeUmIdioma() = runBlocking {
        val prefs = InMemoryPreferences(UserPreferences(melhoria = true))
        val envios = Envios()
        val f = fila(prefs, envios)
        f.enfileirar("strange question one", "DESCONHECIDA", "en")
        f.enfileirar("pergunta estranha um", "DESCONHECIDA", "pt-BR", explicito = true)
        assertNotNull(f.enviarSePreciso())
        assertEquals("en", envios.lotes.single().second)
        assertEquals(listOf("strange question one"), envios.lotes.single().first.map { it.q })
        assertNotNull("a do botão ainda força o envio", f.enviarSePreciso())
        assertEquals("pt-BR", envios.lotes.last().second)
        assertTrue(prefs.atual().filaMelhoria.isEmpty())
    }

    @Test
    fun excecaoNoEnvioNaoPerdeAFila() = runBlocking {
        val prefs = InMemoryPreferences(UserPreferences(melhoria = true))
        val f = MelhoriaFila(prefs, enviarLote = { _, _, _ -> throw IllegalStateException("x") })
        f.enfileirar("pergunta estranha um", "DESCONHECIDA", "pt-BR", explicito = true)
        assertEquals(EnvioMelhoria.Falhou, f.enviarSePreciso())
        assertEquals(1, prefs.atual().filaMelhoria.size)
    }
}
