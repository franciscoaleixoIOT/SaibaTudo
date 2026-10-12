package net.saibatudo.quimica

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.nlu.Dicionario
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

/**
 * Casos de referência compartilhados com o site (contracts/nlu_golden_cases.json): garantem que Android e Web interpretam as
 * perguntas da mesma forma, em CADA idioma. O campo `idioma` do caso escolhe o léxico e o dicionário (ausente = pt-BR); um idioma novo no
 * contrato (es, de, fr…) entra sozinho aqui. Com o pacote real (data/quimica) todos os casos valem; com o fixture de testes valem só os
 * casos cujas entidades existem nele.
 */
class NluGoldenCasesTest {

    private val arquivo = File(TestData.contratos, "nlu_golden_cases.json")

    @Test
    fun todosOsCasosDeReferenciaEmCadaIdioma() {
        assumeTrue("contracts/nlu_golden_cases.json ainda não existe", arquivo.isFile)
        val pacote = TestData.Melhor.pacote
        val casos = JsonParser.parseString(arquivo.readText()).asJsonObject.getAsJsonArray("cases").map { it.asJsonObject }
        val porIdioma: Map<String, List<JsonObject>> = casos.groupBy { ContratoNlu.idiomaDoCaso(it) }
        val usandoReal = TestData.Real != null
        val falhas = mutableListOf<String>()
        val resumo = mutableListOf<String>()
        var verificados = 0
        for ((idioma, lista) in porIdioma) {
            assertTrue("idioma desconhecido no contrato: $idioma", idioma in Lexico.IDIOMAS)
            val d = dicionario(pacote, idioma)
            val validos = lista.filter { usandoReal || ContratoNlu.elegivel(it, d) }
            val f = validos.flatMap { c -> ContratoNlu.falhasDoCaso(c, d).map { "[$idioma] \"${c.get("q").asString}\": $it" } }
            resumo += "$idioma ${validos.size}/${lista.size} (falhas ${f.size})"
            verificados += validos.size
            falhas += f
        }
        println("NLU golden (${if (usandoReal) "pacote real" else "fixture"}): ${resumo.joinToString("; ")}")
        assertTrue("Falhas de NLU (${falhas.size}):\n" + falhas.joinToString("\n"), falhas.isEmpty())
        assertTrue("casos esperados", verificados >= if (usandoReal) 90 else 50)
        assertTrue("pt-BR é a referência do contrato", (porIdioma[Idiomas.PADRAO]?.size ?: 0) > 0)
    }
}
