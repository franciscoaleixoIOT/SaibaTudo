package net.saibatudo.quimica

import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.LocalNlu
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Paridade com o site (web/src/quimica/js/nlu.js) no que o contrato golden não confere: o assunto de CONCEITO. Os valores esperados são a
 * saída do `parse` do site (conferida em 16/10/2026 com o pacote real: 30.363 perguntas do dataset, do golden e do corpus multilíngue).
 * O site tira só o gatilho e aplica cada limpeza do léxico uma vez, sem aparar o espaço — o artigo fica ("a massa molar"). A busca do texto
 * no Android usa [LocalNlu.temaDoConceito], que limpa de verdade.
 */
class NluParidadeSiteTest {

    private fun conceito(q: String, idioma: String = "pt-BR"): String? {
        val d = dicionario(TestData.Melhor.pacote, idioma)
        val p = LocalNlu.parse(q, d, null, d.lexico)
        assertEquals(q, Intent.CONCEITO, p.intent)
        return p.conceito
    }

    @Test
    fun assuntoDeConceitoIgualAoDoSite() {
        assertEquals("massa molar", conceito("o que é massa molar"))
        assertEquals("a massa molar", conceito("o que é a massa molar?"))
        assertEquals("o que e massa molar", conceito("explique o que é massa molar"))
        assertEquals("massa molar", conceito("explique massa molar"))
        assertEquals("um mol", conceito("o que é um mol"))
        assertEquals("de isotopos", conceito("Qual a definição de isótopos?"))
        assertEquals("what molar mass is", conceito("explain what molar mass is", "en"))
        assertEquals("electronegativity", conceito("what is electronegativity", "en"))
        assertEquals("la masa molar", conceito("qué es la masa molar", "es"))
        assertEquals("molare masse", conceito("was ist die molare Masse", "de"))
        assertEquals("molare masse", conceito("erkläre, was die molare Masse ist", "de"))
        assertEquals("masse molaire", conceito("qu'est-ce que la masse molaire", "fr"))
        assertEquals("ce qu est la masse molaire", conceito("explique ce qu'est la masse molaire", "fr"))
    }

    @Test
    fun temaLimpoParaABuscaDoTexto() {
        val pt = dicionario(TestData.Melhor.pacote, "pt-BR").lexico
        assertEquals("massa molar", LocalNlu.temaDoConceito("o que e massa molar", pt))
        assertEquals("massa molar", LocalNlu.temaDoConceito("a massa molar", pt))
        assertEquals("isotopos", LocalNlu.temaDoConceito("de isotopos", pt))
        assertEquals("ligacao covalente", LocalNlu.temaDoConceito("uma ligacao covalente", pt))
        assertEquals("ph", LocalNlu.temaDoConceito("ph", pt))
        assertEquals("gas ideal", LocalNlu.temaDoConceito("gas ideal", pt))
        val es = dicionario(TestData.Melhor.pacote, "es").lexico
        assertEquals("masa molar", LocalNlu.temaDoConceito("la masa molar", es))
    }
}
