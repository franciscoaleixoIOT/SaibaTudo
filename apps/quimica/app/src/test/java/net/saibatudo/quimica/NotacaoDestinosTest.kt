package net.saibatudo.quimica

import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.prefs.Nivel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mais lacunas do mapa de perguntas de livros didáticos (17/10/2026), com as MESMAS entradas do site (web/test/nlu-notacao-destinos.test.mjs):
 *  A) notação científica dos livros ("1,2 × 10²³", "1,2·10^23", "6,02.10^23", "1.2 × 10**23") e milhar do idioma ("1.520" em pt, "1,520" em en);
 *  B) conversão para vários destinos com nomes por extenso ("para litros e metros cúbicos", "para atm, kPa e torr");
 *  C) "mistura" que é conceito (substância pura × mistura), não aviso de mistura perigosa;
 *  D) pedido de nome de um composto orgânico que não está no pacote (NOMENCLATURA sem composto).
 */
class NotacaoDestinosTest {

    private val fixture = TestData.Fixture.pacote

    private val numeros = listOf(
        Triple("pt-BR", "1,2 × 10²³", 1.2e23), Triple("pt-BR", "1,2 x 10^23", 1.2e23), Triple("pt-BR", "1,2·10^23", 1.2e23), Triple("pt-BR", "1,2e23", 1.2e23),
        Triple("pt-BR", "6,02.10^23", 6.02e23), Triple("pt-BR", "1.2 × 10**23", 1.2e23), Triple("pt-BR", "3,0 × 10⁻²", 0.03), Triple("pt-BR", "1,0 × 10^4", 1e4),
        Triple("pt-BR", "1.520", 1520.0), Triple("pt-BR", "1,520", 1.52), Triple("en", "1,520", 1520.0), Triple("en", "1.520", 1.52), Triple("en", "0,500", 0.5),
        Triple("de", "1.520", 1520.0), Triple("fr", "2,5 × 10⁻³", 0.0025)
    )

    private val quantidades = listOf(
        Triple("pt-BR", "Quantos mols tem 1,2 × 10²³ átomos?", listOf(1.2e23 to "particulas")),
        Triple("pt-BR", "Converter 1,0 × 10^4 L para dm3", listOf(1e4 to "L")),
        Triple("pt-BR", "quantos mols são 6,02.10^23 partículas?", listOf(6.02e23 to "particulas")),
        Triple("pt-BR", "Converter 1.520 mmHg para atm", listOf(1520.0 to "mmHg")),
        Triple("en", "convert 1,520 mmHg to atm", listOf(1520.0 to "mmHg")),
        Triple("en", "how many moles is 1.2 × 10**23 atoms?", listOf(1.2e23 to "particulas")),
        Triple("es", "¿Cuántos moles hay en 1,2 × 10²³ átomos?", listOf(1.2e23 to "particulas")),
        Triple("de", "Wie viele Mol sind 1,2 × 10²³ Teilchen?", listOf(1.2e23 to "particulas")),
        Triple("fr", "Combien de moles y a-t-il dans 1,2 × 10²³ atomes ?", listOf(1.2e23 to "particulas"))
    )

    private val destinos = listOf(
        Triple("pt-BR", "converter 1,820 mL para litros e metros cúbicos", listOf("L", "m3")),
        Triple("pt-BR", "Converter 1.520 mmHg para atm, kPa e torr", listOf("atm", "kPa", "Torr")),
        Triple("pt-BR", "converta 5 atm em kPa", listOf("kPa")),
        Triple("pt-BR", "qual a massa de 2 mol de água?", emptyList()),
        Triple("en", "convert 750 mL to liters and cubic meters", listOf("L", "m3")),
        Triple("es", "pasa 1.520 mmHg a atm, kPa y torr", listOf("atm", "kPa", "Torr")),
        Triple("de", "Rechne 1.520 mmHg in atm, kPa und Torr um", listOf("atm", "kPa", "Torr")),
        Triple("fr", "Convertis 750 mL en litres et en mètres cubes", listOf("L", "m3"))
    )

    @Test fun notacaoCientificaDosLivrosEMilharDoIdioma() {
        for ((idioma, texto, valor) in numeros) assertEquals("[$idioma] $texto", valor, Quantidades.lerNumero(texto, idioma)!!, 0.0)
    }

    @Test fun quantidadesComNotacaoCientificaEUnidadeComAcento() {
        for ((idioma, texto, esperado) in quantidades) {
            val q = Quantidades.ler(texto, dicionario(fixture, idioma).unidades, Lexico.de(idioma)).filter { it.unidade != null }
            assertEquals("[$idioma] $texto", esperado, q.map { it.valor to it.unidade })
        }
    }

    @Test fun unidadesDeDestinoUmaOuVarias() {
        for ((idioma, texto, esperado) in destinos) {
            assertEquals("[$idioma] $texto", esperado, Quantidades.lerDestinos(texto, dicionario(fixture, idioma).unidades, Lexico.de(idioma)))
        }
        val pt = dicionario(fixture)
        val p = LocalNlu.parse("Converter 1.520 mmHg para atm, kPa e torr", pt)
        assertEquals(Intent.CONVERSAO_UNIDADE, p.intent)
        assertEquals("atm", p.unidadeDestino)
        assertEquals(listOf("atm", "kPa", "Torr"), p.unidadesDestino)
        assertEquals(emptyList<String>(), LocalNlu.parse("converta 5 atm em kPa", pt).unidadesDestino)
    }

    @Test fun respostasConversaoParticulasENomenclatura() {
        fun responder(q: String) = runBlocking { AnswerBuilder(fixture, dicionario(fixture), Nivel.MEDIO).responder(q).second }
        val conv = responder("Converter 1.520 mmHg para atm, kPa e torr")
        assertEquals(Intent.CONVERSAO_UNIDADE, conv.intent)
        val destaques = conv.blocos.filterIsInstance<Bloco.Destaque>().map { it.texto }
        assertEquals(destaques.toString(), 3, destaques.size)
        assertTrue(destaques.toString(), destaques[0].endsWith(" atm") && destaques[1].endsWith(" kPa") && destaques[2].endsWith(" Torr"))
        val part = responder("Quantos mols tem 1,2 × 10²³ átomos?")
        assertEquals(Intent.ESTEQUIOMETRIA, part.intent)
        assertTrue(part.entendida)
        assertTrue(part.blocos.toString(), part.blocos.any { it is Bloco.Campo && it.valor.endsWith(" mol") })
        val nome = responder("Como se chama o 2-cloro-3-metil-pentano?")
        assertEquals(Intent.NOMENCLATURA, nome.intent)
        assertFalse(nome.entendida)
    }

    @Test fun misturaComoConceitoSemPerderOAvisoDeMisturaPerigosa() {
        val casos = listOf(
            listOf("pt-BR", "a água mineral é pura ou mistura?", "CONCEITO", "mistura"),
            listOf("pt-BR", "Classifique esses sistemas em substâncias e misturas", "CONCEITO", "mistura"),
            listOf("pt-BR", "misturar água sanitária com amoníaco", "SEGURANCA", null),
            listOf("pt-BR", "essa mistura é tóxica?", "SEGURANCA", null),
            listOf("en", "Is seawater a pure substance or a mixture?", "CONCEITO", "mixture"),
            listOf("en", "is it dangerous to mix bleach and ammonia?", "SEGURANCA", null),
            listOf("es", "¿El vinagre es una sustancia pura o una mezcla?", "CONCEITO", "mezcla"),
            listOf("de", "Ist Milch ein homogenes oder heterogenes Gemisch?", "CONCEITO", "gemisch"),
            listOf("fr", "Le vinaigre est-il un corps pur ou un mélange ?", "CONCEITO", "melange"),
            listOf("fr", "Est-il dangereux de mélanger de l'eau de Javel avec de l'ammoniac ?", "SEGURANCA", null)
        )
        for ((idioma, q, intent, conceito) in casos) {
            val p = LocalNlu.parse(q!!, dicionario(fixture, idioma!!))
            assertEquals("[$idioma] $q", Intent.valueOf(intent!!), p.intent)
            if (p.intent == Intent.CONCEITO) assertEquals("[$idioma] $q", conceito, p.conceito)
            if (p.intent == Intent.SEGURANCA) assertTrue("[$idioma] $q", p.mistura)
        }
    }

    @Test fun pedidoDeNomeDeCompostoForaDoPacoteEhNomenclatura() {
        for ((idioma, q) in listOf(
            "pt-BR" to "Como se chama o propil-ciclopropano?", "pt-BR" to "nomeie este composto orgânico", "en" to "name this organic compound",
            "en" to "What is the IUPAC name of 3-ethyl-2-methylhexane?", "es" to "nombra este compuesto orgánico", "de" to "Benenne diese organische Verbindung",
            "fr" to "Nommez ce composé organique"
        )) {
            val p = LocalNlu.parse(q, dicionario(fixture, idioma))
            assertEquals("[$idioma] $q", Intent.NOMENCLATURA, p.intent)
            assertNull("[$idioma] $q", p.composto)
        }
        assertNotEquals(Intent.NOMENCLATURA, LocalNlu.parse("qual é o nome do elemento de número atômico 8?", dicionario(fixture)).intent)
    }
}
