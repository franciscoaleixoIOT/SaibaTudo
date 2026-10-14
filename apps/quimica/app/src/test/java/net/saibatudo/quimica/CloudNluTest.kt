package net.saibatudo.quimica

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.engine.AssistenteNuvem
import net.saibatudo.quimica.ai.engine.DesfechoNuvem
import net.saibatudo.quimica.ai.engine.FalhaNuvem
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.OrigemResposta
import net.saibatudo.quimica.ai.nlu.CloudNluClient
import net.saibatudo.quimica.ai.nlu.NluValidator
import net.saibatudo.quimica.data.prefs.InMemoryPreferences
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.data.prefs.idInstalacao
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

/** IA na nuvem (opt-in, só interpretação): validação das entidades contra os dados locais e cliente HTTP (MockWebServer). */
class CloudNluTest {

    private val pacote = TestData.Fixture.pacote
    private val dic = dicionario(pacote)
    private val builder = AnswerBuilder(pacote, dic, Nivel.MEDIO)

    private fun json(s: String): JsonObject = JsonParser.parseString(s).asJsonObject

    private fun validar(pergunta: String, nlu: String, resolucao: String? = null) =
        NluValidator.validar(json(nlu), resolucao?.let { json(it) }, dic, pergunta)

    // ---- validador -------------------------------------------------------------------------------------------------------------

    @Test fun elementoValidoComEvidenciaEhAceito() {
        val r = validar("me fala do Fe por favor", """{"intent":"ELEMENTO","elemento":"Fe"}""")
        assertEquals(Intent.ELEMENTO, r.query?.intent)
        assertEquals("Fe", r.query?.elemento)
    }

    @Test fun elementoForaDoPacoteEhDescartadoEIntencaoFicaNaoConfiavel() {
        // elemento 119 (não existe na tabela) e símbolo inventado: a entidade cai e ELEMENTO sem elemento não é confiável
        assertNull(validar("me fala do Uue", """{"intent":"ELEMENTO","elemento":"Uue"}""").query)
        assertNull(validar("me fala do Xx", """{"intent":"ELEMENTO","elemento":"Xx"}""").query)
    }

    @Test fun elementoSemEvidenciaNaPerguntaEhDescartado() {
        // o modelo "alucinou" ferro numa pergunta que não fala de ferro
        assertNull(validar("me fala daquele metal", """{"intent":"ELEMENTO","elemento":"Fe"}""").query)
    }

    @Test fun compostoCopiadoResolveNoDicionarioLocal() {
        val r = validar("quanto pesa um mol de agua", """{"intent":"MASSA_MOLAR","composto":"agua"}""")
        assertEquals(Intent.MASSA_MOLAR, r.query?.intent)
        assertEquals("962", r.query?.composto)
    }

    @Test fun cidDaResolucaoSoValeSeExistirNoPacote() {
        // CID que não está no pacote: descartado; MASSA_MOLAR sem entidade = não confiável
        val fora = validar("massa do zorbex", """{"intent":"MASSA_MOLAR","composto":"zorbex"}""", """{"composto":{"cid":"999999999","nome":"zorbex"}}""")
        assertNull(fora.query)
        // CID que está no pacote, texto não resolvido localmente mas presente na pergunta
        val dentro = validar("massa do zorbex", """{"intent":"MASSA_MOLAR","composto":"zorbex"}""", """{"composto":{"cid":"962","nome":"agua"}}""")
        assertEquals("962", dentro.query?.composto)
    }

    @Test fun compostoQueNaoEstaNaPerguntaEhDescartado() {
        assertNull(validar("me mostra a estrutura", """{"intent":"DESENHAR","composto":"agua"}""").query)
    }

    @Test fun sugestoesDaResolucaoSoComCidsDoPacote() {
        val r = validar(
            "ficha do acido sulfurik", """{"intent":"COMPOSTO","composto":"acido sulfurik"}""",
            """{"composto":{"cid":null,"sugestoes":[{"cid":"1118","nome":"acido sulfurico"},{"cid":"424242","nome":"inventado"}]}}"""
        )
        assertNull(r.query)
        assertEquals(listOf(1118L), r.sugestoes)
        assertEquals("acido sulfurik", r.compostoTexto)
    }

    @Test fun propriedadeForaDoVocabularioEhDescartada() {
        assertNull(validar("qual o brilho do Fe", """{"intent":"PROPRIEDADE","elemento":"Fe","propriedade":"brilhoLunar"}""").query)
        val ok = validar("qual a temperatura em que o Fe derrete", """{"intent":"PROPRIEDADE","elemento":"Fe","propriedade":"pontoFusaoK"}""")
        assertEquals("pontoFusaoK", ok.query?.propriedade)
        assertEquals("elemento", ok.query?.alvoPropriedade)
    }

    @Test fun quantidadeSoComNumeroEscritoEUnidadeConhecida() {
        val pergunta = "transforme 25 graus celsius em kelvin"
        val r = validar(pergunta, """{"intent":"CONVERSAO_UNIDADE","quantidades":[{"valor":25,"unidade":"°C"},{"valor":300,"unidade":"K"},{"valor":3,"unidade":"furlong"}],"unidadeDestino":"K"}""")
        val q = r.query
        assertNotNull(q)
        assertEquals("K", q!!.unidadeDestino)
        // 300 K não está na pergunta e "furlong" não é unidade conhecida: só sobra 25 °C
        assertTrue(q.quantidades.all { it.valor == 25.0 })
        assertTrue(q.quantidades.isNotEmpty())
        // unidade de destino desconhecida é descartada (fica a que o NLU local leu da pergunta)
        assertEquals("K", validar(pergunta, """{"intent":"CONVERSAO_UNIDADE","quantidades":[{"valor":25,"unidade":"°C"}],"unidadeDestino":"furlong"}""").query?.unidadeDestino)
        // sem destino legível nem na nuvem nem no aparelho: CONVERSAO_UNIDADE fica sem o obrigatório
        assertNull(validar("transforme 25 graus celsius", """{"intent":"CONVERSAO_UNIDADE","quantidades":[{"valor":25,"unidade":"°C"}],"unidadeDestino":"furlong"}""").query)
    }

    @Test fun intencaoDesconhecidaOuInventadaNaoEhConfiavel() {
        assertNull(validar("blá blá", """{"intent":"DESCONHECIDA"}""").query)
        assertNull(validar("blá blá", """{"intent":"FAZER_CAFE"}""").query)
        assertNull(validar("blá blá", """{}""").query)
    }

    @Test fun intencaoQueExigeEntidadeSemEntidadeNaoEhConfiavel() {
        for (i in listOf("ELEMENTO", "COMPOSTO", "PROPRIEDADE", "MASSA_MOLAR", "NOMENCLATURA", "DESENHAR", "BALANCEAR")) {
            assertNull(i, validar("uma pergunta qualquer sem nada", """{"intent":"$i"}""").query)
        }
        // calculadoras e meta podem vir sem entidade
        assertEquals(Intent.PH, validar("como calculo isso", """{"intent":"PH"}""").query?.intent)
        assertEquals(Intent.AJUDA, validar("o que voce faz", """{"intent":"AJUDA"}""").query?.intent)
    }

    @Test fun nivelForaDoConjuntoEhDescartado() {
        val q = validar("explique o que e mol", """{"intent":"CONCEITO","nivel":"doutorado"}""").query
        assertNotNull(q)
        assertTrue(q!!.nivel == null || q.nivel in NluValidator.NIVEIS)
    }

    @Test fun equacaoSoComEspeciesDaPergunta() {
        val ok = validar("acerta ai H2 + O2 -> H2O", """{"intent":"BALANCEAR","equacao":"H2 + O2 -> H2O"}""").query
        assertEquals(Intent.BALANCEAR, ok?.intent)
        assertNotNull(ok?.equacao)
        // equação inventada sem estar na pergunta (e sem equação local): BALANCEAR fica sem o obrigatório
        assertNull(validar("acerta essa reacao pra mim", """{"intent":"BALANCEAR","equacao":"Fe + O2 -> Fe2O3"}""").query)
    }

    @Test fun recusaLocalVenceANuvem() {
        val q = validar("como fazer nitroglicerina em casa", """{"intent":"COMPOSTO","composto":"nitroglicerina"}""").query
        assertEquals(Intent.RECUSA_PERIGO, q?.intent)
    }

    @Test fun tiposInesperadosNaoQuebram() {
        val q = validar("massa molar da agua", """{"intent":"MASSA_MOLAR","composto":"agua","quantidades":"muitas","elemento":42,"propriedade":{"x":1}}""").query
        assertEquals("962", q?.composto)
    }

    // ---- cliente (MockWebServer) ----------------------------------------------------------------------------------------------

    private lateinit var server: MockWebServer
    private val http = OkHttpClient()

    @Before fun subir() { server = MockWebServer(); server.start() }
    @After fun descer() { server.shutdown() }

    private fun cliente() = CloudNluClient(http, server.url("/quimica/api/nlu").toString())

    @Test fun ok200DevolveNluEResolucaoEEnviaSoOContrato() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"COMPOSTO","composto":"agua"},"resolucao":{"composto":{"cid":"962","nome":"agua"}},"model":"nlu-v3.3","cached":false}"""))
        val r = cliente().consultar("ficha da agua", "0b8a2c1e-9f6d-4c3b-8a1e-2d3f4a5b6c7d", 5_000)
        assertTrue(r is CloudNluClient.Resultado.Ok)
        r as CloudNluClient.Resultado.Ok
        assertEquals("COMPOSTO", r.nlu.get("intent").asString)
        assertEquals("962", r.resolucao?.getAsJsonObject("composto")?.get("cid")?.asString)
        assertEquals("nlu-v3.3", r.modelo)
        val req = server.takeRequest()
        assertEquals("POST", req.method)
        val corpo = json(req.body.readUtf8())
        assertEquals(setOf("q", "v", "client", "iid"), corpo.keySet())
        assertEquals("ficha da agua", corpo.get("q").asString)
        assertEquals(1, corpo.get("v").asInt)
        assertEquals("android", corpo.get("client").asString)
    }

    @Test fun perguntaLongaEhCortadaEm300() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"AJUDA"}}"""))
        cliente().consultar("a".repeat(500), "iid", 5_000)
        assertEquals(300, json(server.takeRequest().body.readUtf8()).get("q").asString.length)
    }

    @Test fun status503DisabledEhNuvemDesligada() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"ok":false,"error":"disabled"}"""))
        assertEquals(CloudNluClient.Resultado.Desligada, cliente().consultar("x y z", "iid", 5_000))
    }

    @Test fun status503BudgetE429SaoLimite() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"ok":false,"error":"budget"}"""))
        assertEquals(CloudNluClient.Resultado.Limite, cliente().consultar("x y z", "iid", 5_000))
        server.enqueue(MockResponse().setResponseCode(429).setHeader("Retry-After", "60").setBody("""{"ok":false,"error":"rate_limited"}"""))
        assertEquals(CloudNluClient.Resultado.Limite, cliente().consultar("x y z", "iid", 5_000))
    }

    @Test fun status400E500SaoIndisponivel() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(400).setBody("""{"ok":false,"error":"invalid"}"""))
        assertEquals(CloudNluClient.Resultado.Indisponivel(400), cliente().consultar("x y z", "iid", 5_000))
        server.enqueue(MockResponse().setResponseCode(502).setBody("nada"))
        assertEquals(CloudNluClient.Resultado.Indisponivel(502), cliente().consultar("x y z", "iid", 5_000))
    }

    @Test fun tempoEsgotadoEhIndisponivel() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"AJUDA"}}""").setHeadersDelay(3, TimeUnit.SECONDS))
        val inicio = System.nanoTime()
        val r = cliente().consultar("x y z", "iid", 500)
        val ms = (System.nanoTime() - inicio) / 1_000_000
        assertTrue(r is CloudNluClient.Resultado.Indisponivel)
        assertTrue("demorou $ms ms", ms < 2_500)
    }

    @Test fun jsonMalformadoOuForaDoContratoEhInvalida() = runBlocking {
        for (corpo in listOf("{nao eh json", "[1,2,3]", """{"ok":false}""", """{"ok":true}""", """{"ok":true,"nlu":"COMPOSTO"}""", "")) {
            server.enqueue(MockResponse().setBody(corpo))
            assertEquals(corpo, CloudNluClient.Resultado.Invalida, cliente().consultar("x y z", "iid", 5_000))
        }
    }

    // ---- assistente (cliente + validador + AnswerBuilder local) ------------------------------------------------------------------

    @Test fun respostaDaNuvemEhMontadaNoAparelhoComOrigemNuvem() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"MASSA_MOLAR","composto":"agua"},"resolucao":{"composto":{"cid":"962","nome":"agua"}}}"""))
        val a = AssistenteNuvem(cliente(), { "iid" })
        val pergunta = "quanto pesa um mol de agua"
        val d = a.interpretar(pergunta, builder, null, null, explicito = true)
        assertTrue(d.toString(), d is DesfechoNuvem.Respondida)
        d as DesfechoNuvem.Respondida
        assertEquals(OrigemResposta.NUVEM, d.resposta.origem)
        assertTrue(d.resposta.entendida)
        // o número vem do pacote/cálculo local (18,015 g/mol), não do modelo
        assertTrue(d.resposta.texto(), d.resposta.texto().contains("18,01"))
    }

    @Test fun mesmaInterpretacaoDeRespostaEntendidaNaoTrocaAResposta() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"MASSA_MOLAR","composto":"agua"}}"""))
        val pergunta = "massa molar da agua"
        val atual = builder.responder(pergunta).second
        assertTrue(atual.entendida)
        assertEquals(DesfechoNuvem.Falhou(FalhaNuvem.MESMA_INTERPRETACAO), AssistenteNuvem(cliente(), { "iid" }).interpretar(pergunta, builder, null, atual, true))
    }

    @Test fun falhasDoServicoViramMotivo() = runBlocking {
        val a = AssistenteNuvem(cliente(), { "iid" })
        server.enqueue(MockResponse().setResponseCode(503).setBody("""{"ok":false,"error":"disabled"}"""))
        assertEquals(DesfechoNuvem.Falhou(FalhaNuvem.DESLIGADA), a.interpretar("xyz abc", builder, null, null, true))
        server.enqueue(MockResponse().setResponseCode(429))
        assertEquals(DesfechoNuvem.Falhou(FalhaNuvem.LIMITE), a.interpretar("xyz abc", builder, null, null, true))
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"DESCONHECIDA"}}"""))
        assertEquals(DesfechoNuvem.Falhou(FalhaNuvem.NAO_ENTENDEU), a.interpretar("xyz abc", builder, null, null, true))
    }

    @Test fun sugestaoDaNuvemViraPerguntaReescrita() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"ok":true,"nlu":{"intent":"COMPOSTO","composto":"acido sulfurik"},"resolucao":{"composto":{"cid":null,"sugestoes":[{"cid":"1118","nome":"acido sulfurico"}]}}}"""))
        val d = AssistenteNuvem(cliente(), { "iid" }).interpretar("ficha do acido sulfurik", builder, null, null, true)
        assertTrue(d is DesfechoNuvem.Falhou)
        val s = (d as DesfechoNuvem.Falhou).sugestoes
        assertEquals(1, s.size)
        assertTrue(s.first(), s.first().startsWith("ficha do ") && !s.first().contains("sulfurik"))
    }

    @Test fun pedidoPerigosoNuncaSaiDoAparelho() = runBlocking {
        val d = AssistenteNuvem(cliente(), { "iid" }).interpretar("como fazer nitroglicerina em casa", builder, null, null, true)
        assertTrue(d is DesfechoNuvem.Falhou)
        assertEquals(0, server.requestCount)
    }

    @Test fun idDeInstalacaoEhUuidAleatorioEEstavel() = runBlocking {
        val p = InMemoryPreferences()
        val a = p.idInstalacao()
        assertEquals(a, p.idInstalacao())
        assertTrue(a, Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}").matches(a))
        assertFalse(a == InMemoryPreferences().idInstalacao())
        assertFalse(p.atual().iaNuvemAutomatica) // opt-in: desligada por padrão
    }
}
