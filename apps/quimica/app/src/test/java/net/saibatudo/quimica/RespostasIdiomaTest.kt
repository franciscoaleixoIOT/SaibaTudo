package net.saibatudo.quimica

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.answer.sugestoes
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.Idiomas
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * As respostas saem no idioma escolhido (docs/I18N.md §6): para os casos do contrato compartilhado (`contracts/nlu_golden_cases.json`, campo `idioma`)
 * a resposta é bem formada e não deixa vazar português (a verificação espelha web/test/answers.test.mjs); a recusa de segurança e o "não entendi" saem
 * no idioma; os números saem no formato do idioma; e toda pergunta sugerida (a lista fixa e a gerada dos dados) é entendida e respondida no idioma.
 */
class RespostasIdiomaTest {

    private val pacote = TestData.Melhor.pacote
    private val usandoReal = TestData.Real != null
    private val casos: List<JsonObject> by lazy {
        JsonParser.parseString(File(TestData.contratos, "nlu_golden_cases.json").readText()).asJsonObject.getAsJsonArray("cases").map { it.asJsonObject }
    }
    private val construtores = HashMap<String, AnswerBuilder>()
    private fun builder(idioma: String) = construtores.getOrPut(idioma) { AnswerBuilder(pacote, dicionario(pacote, idioma), Nivel.MEDIO) }
    private fun r(idioma: String, q: String): Resposta = runBlocking { builder(idioma).responder(q).second }

    /** Palavras e trechos que só existem em português (como no teste do site): se aparecerem numa resposta que não é em português, a tradução vazou. */
    private val soPortugues = Regex("""ção\b|ções\b|Massa molar|Ponto de fusão|Perigos d|Estrutura 2D|Não entendi|Qual a |Quais |pacote de dados|Segurança|Cálculo feito""")

    /** Nomes próprios brasileiros que ficam em português em qualquer idioma (serviço de emergência, CVV e a marca). */
    private val nomesProprios = Regex("""Disque-Intoxicação|Valorização|SaibaTudo Química""")

    /** O que a resposta ESCREVE (título, parágrafos, avisos, listas, passos e rótulos de campo); nomes de fontes e valores vêm do pacote e não entram. */
    private fun corpo(r: Resposta): String = nomesProprios.replace(
        "${r.titulo} " + r.blocos.joinToString(" ") {
            when (it) {
                is Bloco.Paragrafo -> it.texto
                is Bloco.Aviso -> it.texto
                is Bloco.Lista -> it.itens.joinToString(" ")
                is Bloco.Passos -> it.titulo + " " + it.passos.joinToString(" ")
                is Bloco.Campo -> it.rotulo
                else -> ""
            }
        },
        ""
    )

    private fun vazou(r: Resposta) = soPortugues.containsMatchIn(corpo(r))

    private fun texto(r: Resposta, idioma: String) = r.texto(Tx.de(idioma))

    private fun casosDo(idioma: String) = casos.filter { ContratoNlu.idiomaDoCaso(it) == idioma }.filter { c ->
        usandoReal || ContratoNlu.elegivel(c, builder(idioma).dic)
    }

    @Test fun todoCasoDoContratoGeraRespostaBemFormadaNoIdioma() {
        for (idioma in Idiomas.TODOS) {
            var n = 0
            for (c in casosDo(idioma)) {
                val q = c.get("q").asString
                if (q.isBlank()) continue
                val r = r(idioma, q)
                assertTrue("$idioma \"$q\": título vazio", r.titulo.isNotBlank())
                assertTrue("$idioma \"$q\": resposta sem blocos", r.blocos.isNotEmpty())
                val t = texto(r, idioma)
                assertFalse("$idioma \"$q\": resposta com chave de texto sem resolver: $t", t.contains("%1$") || t.contains("%s"))
                if (idioma != Idiomas.PADRAO && r.intent !in setOf(Intent.CONCEITO, Intent.FONTES, Intent.SOBRE_DADOS)) {
                    assertFalse("$idioma \"$q\": português vazou: ${r.titulo} | ${t.take(160)}", vazou(r))
                }
                n++
            }
            assertTrue("$idioma: casos exercitados = $n", n >= if (usandoReal) 40 else 15)
        }
    }

    @Test fun respostaDeMassaMolarFalaOIdiomaEFormataOsNumeros() {
        val esperado = mapOf(
            "pt-BR" to Triple("qual a massa molar da água?", "Massa molar", "18,015 g/mol"),
            "en" to Triple("what is the molar mass of water?", "Molar mass", "18.015 g/mol"),
            "es" to Triple("¿cuál es la masa molar del agua?", "Masa molar", "18,015 g/mol"),
            "de" to Triple("Was ist die molare Masse von Wasser?", "Molare Masse", "18,015 g/mol"),
            "fr" to Triple("quelle est la masse molaire de l'eau ?", "Masse molaire", "18,015 g/mol")
        )
        for ((idioma, e) in esperado) {
            val a = r(idioma, e.first)
            val t = texto(a, idioma)
            assertEquals("$idioma: $t", Intent.MASSA_MOLAR, a.intent)
            assertTrue("$idioma: rótulo '${e.second}' em $t", t.contains(e.second, ignoreCase = true))
            assertTrue("$idioma: número ${e.third} em $t", t.contains(e.third))
            if (idioma != Idiomas.PADRAO) assertFalse("$idioma: português vazou em $t", vazou(a))
        }
    }

    @Test fun respostaEmInglesNaoTemPalavrasSoDoPortugues() {
        val q = listOf(
            "balance Fe + O2 -> Fe2O3", "pH of HCl 0.01 mol/L", "convert 5 atm to kPa", "melting point of iron", "what are the hazards of sulfuric acid?",
            "elements in group 17", "help", "draw ethanol", "compare sodium and chlorine"
        )
        for (pergunta in q) {
            val a = r("en", pergunta)
            val t = texto(a, "en")
            assertFalse("en \"$pergunta\": português vazou em: $t", vazou(a) || Regex("""[ãõçáéíóúâêô]""").containsMatchIn(corpo(a)))
        }
        val ph = texto(r("en", "pH of HCl 0.01 mol/L"), "en")
        assertTrue(ph, ph.contains("2.00") && !ph.contains("2,00"))
    }

    @Test fun recusaENaoEntendiSaemNoIdioma() {
        for (idioma in Idiomas.TODOS) {
            val t = Tx.de(idioma)
            val recusa = casos.firstOrNull { ContratoNlu.idiomaDoCaso(it) == idioma && it.get("intent").asString == "RECUSA_PERIGO" } ?: continue
            val a = r(idioma, recusa.get("q").asString)
            assertEquals(idioma, Intent.RECUSA_PERIGO, a.intent)
            assertTrue(a.recusa)
            assertEquals("$idioma: título da recusa", t(R.string.resp_recusa_titulo), a.titulo)
            val corpo = a.blocos.filterIsInstance<Bloco.Paragrafo>().joinToString("\n") { it.texto }
            assertTrue("$idioma: recusa no idioma: $corpo", corpo.contains(t(R.string.seg_recusa_padrao)) || corpo.contains(t(R.string.seg_recusa_dano)) || corpo.contains(t(R.string.seg_recusa_autolesao)))
            assertEquals("$idioma: sugestões seguras no idioma", listOf(t(R.string.sug_segura_epi), t(R.string.sug_segura_primeiros_socorros), t(R.string.sug_segura_misturar)), a.sugestoes)

            val ne = casos.firstOrNull { ContratoNlu.idiomaDoCaso(it) == idioma && it.get("intent").asString == "DESCONHECIDA" } ?: continue
            val n = r(idioma, ne.get("q").asString)
            assertEquals(idioma, Intent.DESCONHECIDA, n.intent)
            assertEquals("$idioma: título do 'não entendi'", t(R.string.resp_nao_entendi_titulo), n.titulo)
            assertTrue("$idioma: texto do 'não entendi'", n.blocos.filterIsInstance<Bloco.Paragrafo>().first().texto == t(R.string.resp_nao_entendi_texto))
        }
    }

    /** A lista fixa de perguntas sugeridas de cada idioma precisa ser entendida e respondida pelo interpretador DESSE idioma. */
    private val sugestoesFixas = listOf(
        R.string.sug_converter, R.string.sug_balancear, R.string.sug_balancear_fe, R.string.sug_massa_molar_caoh2, R.string.sug_massa_molar_agua,
        R.string.sug_mols_agua, R.string.sug_ph_hcl, R.string.sug_halogenios, R.string.sug_mais_eletronegativo, R.string.sug_tendencia
    )

    @Test fun perguntasSugeridasSaoEntendidasEmCadaIdioma() {
        for (idioma in Idiomas.TODOS) {
            val t = Tx.de(idioma)
            val problemas = mutableListOf<String>()
            for (id in sugestoesFixas + listOf(R.string.sug_segura_epi, R.string.sug_segura_primeiros_socorros, R.string.sug_segura_misturar)) {
                val pergunta = t(id)
                val a = r(idioma, pergunta)
                if (!a.entendida || a.intent == Intent.DESCONHECIDA) problemas += "\"$pergunta\" -> ${a.intent}: ${a.titulo}"
            }
            assertTrue("$idioma: sugestões que o app não entende:\n" + problemas.joinToString("\n"), problemas.isEmpty())
            // geradas dos dados (nomes no idioma): todas respondidas, em quantidade razoável
            val geradas = runBlocking { builder(idioma).sugestoes(12) }
            assertTrue("$idioma: sugestões geradas = $geradas", geradas.size >= if (usandoReal) 8 else 5)
            for (g in geradas) assertTrue("$idioma: \"$g\" sem resposta", r(idioma, g).entendida)
            // os atalhos das respostas também: cada sugestão dentro de uma resposta é respondida
            for (pergunta in listOf(t(R.string.sug_massa_molar_agua), t(R.string.sug_converter))) {
                for (s in r(idioma, pergunta).sugestoes) assertTrue("$idioma: sugestão \"$s\" (de \"$pergunta\") sem resposta", r(idioma, s).entendida)
            }
        }
    }

    @Test fun ajudaTraduzida() {
        for (idioma in Idiomas.TODOS) {
            val ajuda = casos.firstOrNull { ContratoNlu.idiomaDoCaso(it) == idioma && it.get("intent").asString == "AJUDA" } ?: continue
            val a = r(idioma, ajuda.get("q").asString)
            assertEquals(idioma, Intent.AJUDA, a.intent)
            assertEquals(idioma, Tx.de(idioma)(R.string.resp_ajuda_titulo), a.titulo)
        }
    }
}
