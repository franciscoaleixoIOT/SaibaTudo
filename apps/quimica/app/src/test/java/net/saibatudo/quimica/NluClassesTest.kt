package net.saibatudo.quimica

import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.LocalNlu
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

/**
 * "o que é um sal?" pergunta pela CLASSE, não pela ficha do composto que o pacote liga ao apelido ("sal" → NaCl, "açúcar" → sacarose; desde o
 * pacote de 17/10). Espelho de web/test/nlu-classes.test.mjs. Os casos que dependem dos apelidos usam o pacote de conferência local/pacote-l
 * (tem os apelidos) e são pulados sem ele; os do golden (contracts/nlu_golden_cases.json) valem em qualquer pacote.
 */
class NluClassesTest {

    @Test
    fun substantivosDeClasseSaoUmaPalavraSoDoLexicoOuDaLista() {
        val pt = dicionario(TestData.Melhor.pacote, "pt-BR")
        for (w in listOf("sal", "açúcar", "ácido", "base", "óxido", "álcool", "Zucker", "sucre", "sugar")) assertTrue(w, pt.ehClasseDeCompostos(w))
        for (w in listOf("sal de cozinha", "cloreto de sodio", "sacarose", "mol de sal", "")) assertFalse(w, pt.ehClasseDeCompostos(w))
        assertTrue(dicionario(TestData.Melhor.pacote, "de").ehClasseDeCompostos("Säure"))
    }

    @Test
    fun temaLimpoDoConceitoIgualAoDoSite() {
        fun lex(i: String) = dicionario(TestData.Melhor.pacote, i).lexico
        assertEquals("sal", LocalNlu.temaDoConceito("o que é um sal", lex("pt-BR")))
        assertEquals("salt", LocalNlu.temaDoConceito("what is a salt", lex("en")))
        assertEquals("azucar", LocalNlu.temaDoConceito("¿qué es el azúcar?", lex("es")))
        assertEquals("salz", LocalNlu.temaDoConceito("was ist ein Salz", lex("de")))
        assertEquals("sel", LocalNlu.temaDoConceito("qu'est-ce qu'un sel", lex("fr")))
    }

    @Test
    fun nomeDeClasseNaoViraErroDeDigitacao() {
        val d = dicionario(TestData.Melhor.pacote, "pt-BR")
        assertNull(d.aproximar("acucar"))
        assertNull(d.aproximar("o que e acucar"))
    }

    @Test
    fun comOsApelidosGenericosOQueEXEhConceitoEOCompostoFicaComoSugestao() {
        val dir = File("../local/pacote-l").canonicalFile
        assumeTrue("sem local/pacote-l (pacote de conferência com os apelidos genéricos)", File(dir, "manifest.json").isFile)
        val pacote = PacoteDeTeste(dir).pacote
        val nacl = "5234"
        val sacarose = "5988"
        assumeTrue("o pacote não liga \"sal\" ao NaCl", dicionario(pacote, "pt-BR").compostoPorNome("sal") == 5234L)
        val casos = listOf(
            listOf("pt-BR", "O que é um sal?", "CONCEITO", "sal", nacl), listOf("pt-BR", "o que é açúcar?", "CONCEITO", "acucar", sacarose),
            listOf("en", "what is a salt?", "CONCEITO", "salt", nacl), listOf("en", "what is sugar?", "CONCEITO", "sugar", sacarose),
            listOf("es", "¿qué es una sal?", "CONCEITO", "sal", nacl), listOf("es", "¿qué es el azúcar?", "CONCEITO", "azucar", sacarose),
            listOf("de", "was ist ein Salz?", "CONCEITO", "salz", nacl), listOf("de", "Was ist Zucker?", "CONCEITO", "zucker", sacarose),
            listOf("fr", "qu'est-ce qu'un sel ?", "CONCEITO", "sel", nacl), listOf("fr", "qu'est-ce que le sucre ?", "CONCEITO", "sucre", sacarose),
            listOf("pt-BR", "qual o ponto de fusão do sal?", "PROPRIEDADE", null, nacl), listOf("pt-BR", "sal é solúvel em água?", "PROPRIEDADE", null, nacl),
            listOf("pt-BR", "massa molar do sal", "MASSA_MOLAR", null, nacl), listOf("pt-BR", "o sal é perigoso?", "SEGURANCA", null, nacl),
            listOf("pt-BR", "o que é o sal de cozinha?", "COMPOSTO", null, nacl), listOf("pt-BR", "açúcar", "COMPOSTO", null, sacarose),
            listOf("en", "is salt soluble in water?", "PROPRIEDADE", null, nacl), listOf("en", "melting point of salt", "PROPRIEDADE", null, nacl),
            listOf("es", "punto de fusión de la sal", "PROPRIEDADE", null, nacl), listOf("de", "Schmelzpunkt von Salz", "PROPRIEDADE", null, nacl),
            listOf("fr", "point de fusion du sel", "PROPRIEDADE", null, nacl), listOf("fr", "le sel est-il soluble dans l'eau ?", "PROPRIEDADE", null, nacl)
        )
        val dics = HashMap<String, net.saibatudo.quimica.ai.nlu.Dicionario>()
        val falhas = mutableListOf<String>()
        for ((idioma, q, intent, conceito, cid) in casos) {
            val d = dics.getOrPut(idioma!!) { dicionario(pacote, idioma) }
            val p = LocalNlu.parse(q!!, d, null, d.lexico)
            if (p.intent != Intent.valueOf(intent!!) || p.composto != cid || (conceito != null && p.conceito != conceito)) {
                falhas += "[$idioma] \"$q\" → ${p.intent} composto=${p.composto} conceito=${p.conceito}"
            }
        }
        assertTrue(falhas.joinToString("\n"), falhas.isEmpty())
    }
}
