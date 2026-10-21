package net.saibatudo.eleicoes2026

import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.eleicoes2026.ai.answer.AnswerBuilder
import net.saibatudo.eleicoes2026.ai.model.Intent
import net.saibatudo.eleicoes2026.ai.model.OrigemResposta
import net.saibatudo.eleicoes2026.ai.nlu.LocalNlu
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Regressão de 21/10/2026 (contracts/propostas_cases.json, o mesmo do site em web/test/propostas-cases.test.mjs): 20 modelos de frase × 100 temas
 * sobre ONDE CONSULTAR as propostas/planos do 1º e do 2º turno. Intenção aceita em >= 99 %, macrotema reconhecido em >= 98 %, nunca nome de candidato.
 */
class PropostasCasesTest {
    private val contrato = JsonParser.parseString(File("../contracts/propostas_cases.json").readText()).asJsonObject

    private fun perguntas(): List<Triple<String, String, String?>> {
        val modelos = contrato.getAsJsonArray("modelos").map { it.asString }
        val temas = contrato.getAsJsonArray("temas").map { it.asJsonObject }
        return modelos.flatMap { m ->
            temas.map { t ->
                val tema = t.get("tema").asString
                Triple(m.replace("{tema}", tema.lowercase()), tema, t.get("esperado").takeIf { !it.isJsonNull }?.asString)
            }
        }
    }

    @Test
    fun intencaoTemaENomeNas2000Perguntas() {
        val gaz = TestData.gazetteer
        val aceitas = contrato.getAsJsonArray("intencoes_aceitas").map { it.asString }.toSet()
        val lista = perguntas()
        assertEquals(2000, lista.size)
        val falhasIntent = mutableListOf<String>()
        val falhasTema = mutableListOf<String>()
        val nomes = mutableListOf<String>()
        var comTema = 0
        for ((q, tema, esperado) in lista) {
            val p = LocalNlu.parse(q, gaz)
            if (p.intent.name !in aceitas) falhasIntent += "$q -> ${p.intent}"
            if (esperado != null) {
                comTema++
                if (p.tema != esperado) falhasTema += "$q -> tema ${p.tema} (esperado $esperado; tema \"$tema\")"
            }
            if (p.nome != null) nomes += "$q -> nome ${p.nome}"
        }
        val pctIntent = 100.0 * (lista.size - falhasIntent.size) / lista.size
        val pctTema = 100.0 * (comTema - falhasTema.size) / comTema
        assertTrue("intenção %.1f %%:\n%s".format(pctIntent, falhasIntent.take(15).joinToString("\n")), pctIntent >= contrato.get("minimo_intencao_pct").asDouble)
        assertTrue("tema %.1f %%:\n%s".format(pctTema, falhasTema.take(15).joinToString("\n")), pctTema >= contrato.get("minimo_tema_pct").asDouble)
        assertTrue("palavra comum virou nome (${nomes.size}):\n${nomes.take(10).joinToString("\n")}", nomes.isEmpty())
    }

    @Test
    fun respostaDePlanoPorTemaEOQueJaFuncionavaContinua() {
        val gaz = TestData.gazetteer
        fun responder(q: String) = runBlocking { AnswerBuilder(TestData.dados, gaz, "2026-10-21", "SP", null, OrigemResposta.LOCAL).construir(LocalNlu.parse(q, gaz)) }
        for (q in listOf("Onde consultar nos canais oficiais as propostas apresentadas no 1º turno sobre educação básica?", "plano de governo sobre educação", "propostas sobre saúde")) {
            val r = responder(q)
            assertEquals(q, Intent.PLANO_GOVERNO, r.intent)
            assertTrue(q, r.directAnswer!!.startsWith("Propostas sobre ") && r.directAnswer!!.contains("nos planos de governo registrados no TSE:"))
            assertTrue(q, r.directAnswer!!.contains("DivulgaCandContas") && r.directAnswer!!.contains("Presidência:"))
            assertFalse(q, r.directAnswer!!.startsWith("Encontrei"))
            assertTrue(q, r.candidateIds.isNotEmpty() && r.filters?.tema != null)
        }
        assertEquals(Intent.PLANO_GOVERNO, LocalNlu.parse("Onde encontrar nos canais institucionais os documentos públicos das candidaturas do 1º turno sobre saúde?", gaz).intent)
        assertEquals(Intent.PLANO_GOVERNO, LocalNlu.parse("Como pesquisar nos sistemas oficiais de divulgação os compromissos registrados no 2º turno para segurança pública?", gaz).intent)
        assertEquals("tecnologia", LocalNlu.parse("propostas sobre pesquisa científica", gaz).tema)
        assertEquals(Intent.LOCAL_VOTACAO, LocalNlu.parse("quais documentos levar para votar?", gaz).intent)
        assertEquals(Intent.SEGUNDO_TURNO, LocalNlu.parse("haverá segundo turno para governador?", gaz).intent)
        assertEquals(Intent.PATRIMONIO, LocalNlu.parse("patrimônio do Lula", gaz).intent)
        assertEquals("lula", LocalNlu.parse("plano de governo do Lula", gaz).nome)
        assertEquals(Intent.LISTAR_CANDIDATOS, LocalNlu.parse("Candidatos a senador que citam saúde no plano", gaz).intent)
        assertEquals(Intent.DESCONHECIDA, LocalNlu.parse("Como melhorar o SUS?", gaz).intent)
    }
}
