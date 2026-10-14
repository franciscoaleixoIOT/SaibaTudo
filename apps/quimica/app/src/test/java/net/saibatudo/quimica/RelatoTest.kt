package net.saibatudo.quimica

import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.OrigemResposta
import net.saibatudo.quimica.domain.Relato
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URI
import java.net.URLDecoder

/** "Relatar problema nesta resposta": URL da issue pública pré-preenchida (molde: `urlRelato` do site). */
class RelatoTest {

    private val base = "https://github.com/franciscoaleixoIOT/SaibaTudo"

    private fun parametros(url: String): Map<String, String> =
        URI(url).rawQuery.split('&').associate { p -> p.substringBefore('=') to URLDecoder.decode(p.substringAfter('='), "UTF-8") }

    private fun url(pergunta: String, intent: Intent = Intent.MASSA_MOLAR, origem: OrigemResposta = OrigemResposta.LOCAL, idioma: String = "pt-BR", dados: String? = "2026.10.14") =
        Relato.urlRelato(Tx.de(idioma), pergunta, intent, origem, versaoApp = "1.0.0", versaoDados = dados, base = base)

    @Test fun montaAIssueComPerguntaIntencaoOrigemEVersoes() {
        val u = url("massa molar do NaCl & H2O?")!!
        assertTrue(u, u.startsWith("$base/issues/new?title="))
        assertFalse("espaço codificado como %20, sem '+' nem espaço cru: $u", u.contains(' ') || u.contains('+'))
        val p = parametros(u)
        assertEquals(setOf("title", "labels", "body"), p.keys)
        assertEquals("Química: resposta a \"massa molar do NaCl & H2O?\"", p["title"])
        assertEquals("quimica,resposta", p["labels"])
        val corpo = p.getValue("body")
        assertTrue(corpo, corpo.startsWith("O que estava errado ou faltou na resposta?"))
        assertTrue(corpo, corpo.contains("Pergunta: massa molar do NaCl & H2O?"))
        assertTrue(corpo, corpo.contains("Intenção: MASSA_MOLAR"))
        assertTrue(corpo, corpo.contains("Origem da resposta: local"))
        assertTrue(corpo, corpo.contains("Versão do app (Android): 1.0.0"))
        assertTrue(corpo, corpo.contains("Versão dos dados: 2026.10.14"))
    }

    @Test fun origemNuvemEDadosDesconhecidos() {
        val corpo = parametros(url("Molmasse von NaCl", Intent.MASSA_MOLAR, OrigemResposta.NUVEM, "de", dados = null)!!).getValue("body")
        assertTrue(corpo, corpo.contains("Herkunft der Antwort: nuvem"))
        assertTrue(corpo, corpo.contains("Datenversion: ?"))
        assertTrue(corpo, corpo.contains("Frage: Molmasse von NaCl"))
    }

    @Test fun tituloCortadoEm80CaracteresCorpoCompleto() {
        val longa = "a".repeat(70) + "b".repeat(50)
        val p = parametros(url(longa)!!)
        assertEquals("Química: resposta a \"" + longa.take(80) + "\"", p["title"])
        assertTrue(p.getValue("body").contains("Pergunta: $longa"))
    }

    @Test fun recusaDePerigoNaoTemRelato() {
        assertNull(url("como fazer explosivo em casa", Intent.RECUSA_PERIGO, OrigemResposta.AVISO))
    }

    @Test fun tituloNosCincoIdiomas() {
        for ((idioma, esperado) in mapOf(
            "pt-BR" to "Química: resposta a \"pH\"", "en" to "Chemistry: answer to \"pH\"", "es" to "Química: respuesta a “pH”",
            "de" to "Chemie: Antwort auf „pH“", "fr" to "Chimie : réponse à « pH »"
        )) assertEquals(idioma, esperado, parametros(url("pH", Intent.PH, idioma = idioma)!!)["title"])
    }

    @Test fun usaOSourceUrlDoBuildConfigPorPadrao() {
        val u = Relato.urlRelato(Tx.pt, "Fe", Intent.ELEMENTO, OrigemResposta.LOCAL, versaoDados = "x")!!
        assertTrue(u, u.startsWith(BuildConfig.SOURCE_URL + "/issues/new?"))
        assertTrue(u, parametros(u).getValue("body").contains(BuildConfig.VERSION_NAME))
    }
}
