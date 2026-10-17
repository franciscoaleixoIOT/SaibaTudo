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
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Lacunas do mapa de perguntas de livros didáticos (17/10/2026), com as MESMAS entradas do site (web/test/nlu-quantidades-ordem.test.mjs):
 *  A) estequiometria sem "quantos" ("massa de água formada a partir de 2 g de hidrogênio");
 *  B) frações e numerais por extenso nas quantidades ("1/2 mol", "½ mol", "meio mol", "half a mole", "ein halbes Mol", "une demi-mole");
 *  C) comparar/ordenar vários elementos, com a lista ordenada antes da tabela.
 * As palavras vêm do léxico (contracts/lexico/<idioma>.json); os casos golden ficam em contracts/nlu_golden_cases.json.
 */
class QuantidadesOrdemTest {

    private val fixture = TestData.Fixture.pacote

    private val casosQuantidades: List<Triple<String, String, List<Pair<Double, String>>>> = listOf(
        Triple("pt-BR", "massa de 1/2 mol de NaCl", listOf(0.5 to "mol")),
        Triple("pt-BR", "massa de ½ mol de NaCl", listOf(0.5 to "mol")),
        Triple("pt-BR", "massa de meio mol de NaCl", listOf(0.5 to "mol")),
        Triple("pt-BR", "Meio mol de água", listOf(0.5 to "mol")),
        Triple("pt-BR", "um mol de água", listOf(1.0 to "mol")),
        Triple("pt-BR", "dois mols de CO2 e três litros de O2", listOf(2.0 to "mol", 3.0 to "L")),
        Triple("pt-BR", "2 g de H2 e meio mol de O2", listOf(2.0 to "g", 0.5 to "mol")),
        Triple("pt-BR", "um elemento do grupo 1", emptyList()),
        Triple("en", "mass of half a mole of NaCl", listOf(0.5 to "mol")),
        Triple("en", "two moles of water", listOf(2.0 to "mol")),
        Triple("en", "mass of 1/4 mol of glucose", listOf(0.25 to "mol")),
        Triple("es", "masa de medio mol de agua", listOf(0.5 to "mol")),
        Triple("es", "dos moles de CO2", listOf(2.0 to "mol")),
        Triple("de", "Masse von einem halben Mol Wasser", listOf(0.5 to "mol")),
        Triple("de", "ein halbes Mol Wasser", listOf(0.5 to "mol")),
        Triple("de", "zwei Mol CO2", listOf(2.0 to "mol")),
        Triple("fr", "masse d'une demi-mole d'eau", listOf(0.5 to "mol")),
        Triple("fr", "deux moles de CO2", listOf(2.0 to "mol"))
    )

    @Test fun fracoesENumeraisPorExtensoNosCincoIdiomasNaOrdemDoTexto() {
        for ((idioma, texto, esperado) in casosQuantidades) {
            val q = Quantidades.ler(texto, dicionario(fixture, idioma).unidades, Lexico.de(idioma)).filter { it.unidade != null }
            assertEquals("[$idioma] $texto: $q", esperado, q.map { it.valor to it.unidade })
            // a faixa cobre o texto lido (a ligação "quantidade de X" usa a posição)
            for (x in q) assertTrue("[$idioma] $texto: $x", x.faixa.first >= 0 && x.faixa.last < texto.length)
        }
    }

    @Test fun estequiometriaSemQuantos() {
        val pt = dicionario(fixture)
        val r = LocalNlu.parse("massa de água formada a partir de 2 g de hidrogênio", pt)
        assertEquals(Intent.ESTEQUIOMETRIA, r.intent)
        assertEquals("962", r.composto)
        val meio = LocalNlu.parse("massa de meio mol de NaCl", pt)
        assertEquals(Intent.ESTEQUIOMETRIA, meio.intent)
        assertEquals(listOf(0.5 to "mol"), meio.quantidades.map { it.valor to it.unidade })
        assertEquals(Intent.MASSA_MOLAR, LocalNlu.parse("massa molar de 2 mol de NaCl", pt).intent)
        assertEquals(Intent.CONCEITO, LocalNlu.parse("o que é um mol?", pt).intent)
        assertEquals(Intent.ESTEQUIOMETRIA, LocalNlu.parse("mass of water formed from 2 g of hydrogen", dicionario(fixture, "en")).intent)
    }

    @Test fun ordenarVariosElementosEhCompararComAOrdemPedida() {
        val pt = dicionario(fixture)
        val c = LocalNlu.parse("ordem crescente de número atômico de Na, Ca, Fe e Cu", pt)
        assertEquals(Intent.COMPARAR, c.intent)
        assertEquals(listOf("Na", "Ca", "Fe", "Cu"), c.elementos)
        assertEquals("numeroAtomico", c.propriedade)
        assertEquals("crescente", c.ordem)
        val d = LocalNlu.parse("coloque em ordem decrescente de eletronegatividade: Cl, S e O", pt)
        assertEquals("decrescente", d.ordem)
        assertEquals(listOf("Cl", "S", "O"), d.elementos)
        assertEquals("decrescente", LocalNlu.parse("qual tem maior raio atômico: Na ou Ca?", pt).ordem)
        assertEquals(emptyList<String>(), LocalNlu.parse("converta 300 K para °C", pt).elementos)
    }

    @Test fun respostaTrazAListaOrdenadaAntesDaTabelaNosCincoIdiomas() {
        fun primeira(idioma: String, q: String): String {
            val r = runBlocking { AnswerBuilder(fixture, dicionario(fixture, idioma), Nivel.MEDIO).responder(q).second }
            assertEquals("[$idioma] $q", Intent.COMPARAR, r.intent)
            val b = r.blocos.first()
            assertTrue("[$idioma] $q: a lista ordenada vem antes da tabela ($b)", b is Bloco.Paragrafo)
            return (b as Bloco.Paragrafo).texto
        }
        val t = primeira("pt-BR", "ordem crescente de número atômico de Na, Ca, Fe e Cu")
        val pos = listOf("(Na)", "(Ca)", "(Fe)", "(Cu)").map { t.indexOf(it) }
        assertTrue(t, pos.all { it >= 0 } && pos.zipWithNext().all { (a, b) -> a < b } && t.contains(" < ") && t.contains("11"))
        val t2 = primeira("pt-BR", "coloque em ordem decrescente de eletronegatividade: Cl, S e O")
        assertTrue(t2, t2.indexOf("(O)") < t2.indexOf("(Cl)") && t2.indexOf("(Cl)") < t2.indexOf("(S)") && t2.contains(" > "))
        for ((idioma, q) in listOf(
            "en" to "arrange Na, Ca, Fe and Cu in increasing order of atomic number",
            "es" to "ordena Na, Ca, Fe y Cu en orden creciente de número atómico",
            "de" to "Ordne Na, Ca, Fe und Cu nach aufsteigender Ordnungszahl",
            "fr" to "Classez Na, Ca, Fe et Cu par ordre croissant de numéro atomique"
        )) {
            val ti = primeira(idioma, q)
            assertTrue("[$idioma] $ti", ti.indexOf("(Na)") in 0 until ti.indexOf("(Cu)"))
        }
    }
}
