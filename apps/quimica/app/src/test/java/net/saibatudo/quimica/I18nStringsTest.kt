package net.saibatudo.quimica

import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Nomes
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Textos do app (docs/I18N.md §6): `res/values/strings.xml` é o pt-BR (a referência) e `values-en|es|de|fr` têm a MESMA lista de chaves e os MESMOS
 * parâmetros (`%1$s`, `%2$d`) em cada texto, sem sobras. É a mesma conferência do lint (MissingTranslation/ExtraTranslation), só que também dos
 * parâmetros, e roda sem Android. Também confere que nenhum texto longo ficou igual ao português (tradução esquecida) e a rotulagem das reservas de nome.
 */
class I18nStringsTest {

    private val res = File("src/main/res").canonicalFile
    private val outros = listOf("en", "es", "de", "fr")
    private val pt = RecursosXml.arquivo("pt-BR")

    /** Chaves marcadas `translatable="false"` em values/strings.xml (marca, endônimos): existem só ali. */
    private val intraduziveis: Set<String> by lazy {
        val doc = javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(File(res, "values/strings.xml"))
        val l = doc.getElementsByTagName("string")
        (0 until l.length).map { l.item(it) as org.w3c.dom.Element }.filter { it.getAttribute("translatable") == "false" }.map { it.getAttribute("name") }.toSet()
    }

    private val rx = Regex("""%(\d)\$[sd]""")
    private fun parametros(t: String): List<String> = rx.findAll(t).map { it.value }.toSet().sorted()
    private fun parametrosPlural(m: Map<String, String>): List<String> = m.values.flatMap { parametros(it) }.toSet().sorted()

    @Test fun osRecursosDoCodigoEstaoTodosNoPortugues() {
        val faltam = RecursosXml.nomesDeString() - pt.strings.keys
        assertTrue("R.string sem texto em values/strings.xml: $faltam", faltam.isEmpty())
        val faltamP = RecursosXml.nomesDePlural() - pt.plurais.keys
        assertTrue("R.plurals sem texto em values/strings.xml: $faltamP", faltamP.isEmpty())
        assertTrue("o pt-BR deve ter centenas de textos", pt.strings.size > 700)
    }

    @Test fun cadaIdiomaTemAsMesmasChavesEOsMesmosParametros() {
        val traduziveis = pt.strings.keys - intraduziveis
        for (idioma in outros) {
            val a = RecursosXml.arquivo(idioma)
            assertTrue("$idioma: sem res/${RecursosXml.pasta(idioma)}/strings.xml", a.strings.isNotEmpty())
            val faltam = traduziveis - a.strings.keys
            val sobram = a.strings.keys - pt.strings.keys
            val intrusos = a.strings.keys.intersect(intraduziveis)
            assertTrue("$idioma: faltam ${faltam.size} textos: ${faltam.take(25)}", faltam.isEmpty())
            assertTrue("$idioma: textos que não existem em pt-BR: ${sobram.take(25)}", sobram.isEmpty())
            assertTrue("$idioma: traduziu o que é translatable=false: $intrusos", intrusos.isEmpty())
            val faltamP = pt.plurais.keys - a.plurais.keys
            assertTrue("$idioma: faltam plurais: $faltamP", faltamP.isEmpty())
            assertTrue("$idioma: plurais que não existem em pt-BR: ${a.plurais.keys - pt.plurais.keys}", (a.plurais.keys - pt.plurais.keys).isEmpty())

            val parametrosErrados = traduziveis.filter { parametros(pt.strings.getValue(it)) != parametros(a.strings.getValue(it)) }
                .map { "$it: pt=${parametros(pt.strings.getValue(it))} $idioma=${parametros(a.strings.getValue(it))}" }
            assertTrue("$idioma: parâmetros diferentes do pt-BR:\n" + parametrosErrados.take(25).joinToString("\n"), parametrosErrados.isEmpty())
            val parametrosPluraisErrados = pt.plurais.keys.filter { parametrosPlural(pt.plurais.getValue(it)) != parametrosPlural(a.plurais.getValue(it)) }
            assertTrue("$idioma: parâmetros dos plurais diferentes: $parametrosPluraisErrados", parametrosPluraisErrados.isEmpty())
            for ((nome, itens) in a.plurais) assertTrue("$idioma: plural $nome sem 'other'", "other" in itens)
        }
    }

    /** Só estes textos podem ficar vazios: o ajuste gramatical do português para "Qual o ponto de…" (nos outros idiomas não há ajuste). */
    private val podeSerVazio = setOf("sug_propriedade_ajuste_de", "sug_propriedade_ajuste_para")

    @Test fun nenhumTextoVazioNemTraducaoEsquecida() {
        for (idioma in listOf("pt-BR") + outros) {
            val a = RecursosXml.arquivo(idioma)
            val vazios = a.strings.filter { it.value.isBlank() && it.key !in podeSerVazio }.keys
            assertTrue("$idioma: textos vazios: $vazios", vazios.isEmpty())
        }
        // texto longo igual ao português = tradução esquecida (fórmulas sem palavra, como "pOH = pKw − pH = …", podem coincidir)
        for (idioma in outros) {
            val a = RecursosXml.arquivo(idioma)
            val iguais = a.strings.filter { (k, v) -> v.length > 40 && v == pt.strings[k] && Regex("""\p{L}{4,}""").containsMatchIn(v.replace(rx, "")) }.keys
            assertTrue("$idioma: textos iguais ao pt-BR (sem tradução): ${iguais.take(25)}", iguais.isEmpty())
        }
    }

    @Test fun placeholderDeTextoNaoVirouTextoFixoNoXml() {
        // lint não pega "%" sem par em texto com parâmetros; aqui, todo "%" de texto com parâmetro precisa ser "%%" ou um parâmetro
        for (idioma in listOf("pt-BR") + outros) {
            val a = RecursosXml.arquivo(idioma)
            val ruins = File(res, "${RecursosXml.pasta(idioma)}/strings.xml").readText().lines().filter { it.contains("%") && rx.containsMatchIn(it) }
                .filter { Regex("""%(?!\d\$[sd]|%)""").containsMatchIn(it.replace("%%", "")) }
            assertTrue("$idioma: '%' solto em texto com parâmetros: ${ruins.take(5)}", ruins.isEmpty())
            assertTrue(a.strings.isNotEmpty())
        }
    }

    // ---- o pt-BR de strings.xml continua igual aos dados em português que o app já tinha ----------------------------------------------

    @Test fun portuguesDeStringsXmlConfereComOsDadosGeradosEPadroes() {
        val t = Tx.pt
        for (u in net.saibatudo.quimica.domain.calc.Unidades.PADRAO) {
            assertEquals("nome da unidade ${u.simbolo}", u.nome, net.saibatudo.quimica.domain.calc.UnidadeNomes.nome(u, t))
        }
        for (id in net.saibatudo.quimica.domain.GhsTextos.CLASSES_PT.keys) {
            assertEquals("classe $id", net.saibatudo.quimica.domain.GhsTextos.classePt(id), net.saibatudo.quimica.domain.ClassesCompostos.nome(id, t))
        }
        for ((cod, par) in net.saibatudo.quimica.domain.GhsTextos.PICTOGRAMAS) {
            assertEquals("desenho $cod", par.first, t(net.saibatudo.quimica.domain.GhsPictogramas.desenho(cod)))
            assertEquals("descrição $cod", par.second, t(net.saibatudo.quimica.domain.GhsPictogramas.descricao(cod)))
        }
        assertEquals(net.saibatudo.quimica.domain.GhsTextos.FONTE_NOME, t(R.string.fonte_ghs_nome))
        assertEquals(net.saibatudo.quimica.domain.GhsTextos.FONTE_LICENCA, t(R.string.fonte_ghs_licenca))
        assertEquals(9, net.saibatudo.quimica.domain.GhsPictogramas.CODIGOS.size)
        for (c in net.saibatudo.quimica.data.model.CategoriaElemento.entries) {
            assertTrue(t(c.rotulo).isNotBlank() && t(c.meio).isNotBlank() && t(c.plural).isNotBlank())
        }
    }

    @Test fun unidadesClassesEPictogramasTemNomeEmTodosOsIdiomas() {
        for (idioma in Idiomas.TODOS) {
            val t = Tx.de(idioma)
            for (u in net.saibatudo.quimica.domain.calc.Unidades.PADRAO) assertTrue("$idioma ${u.simbolo}", !net.saibatudo.quimica.domain.calc.UnidadeNomes.nome(u, t).isNullOrBlank())
            for (cod in net.saibatudo.quimica.domain.GhsPictogramas.CODIGOS) {
                assertTrue("$idioma $cod", t(net.saibatudo.quimica.domain.GhsPictogramas.nome(cod)).isNotBlank())
            }
        }
    }

    // ---- reserva de nomes rotulada (docs/I18N.md §1.2) ------------------------------------------------------------------------------

    private fun elementoSoEmIngles() = Elemento(z = 99, simbolo = "Xx", nome = "Xenônio-teste", nomeEn = "testium")
    private fun elementoSoEmPortugues() = Elemento(z = 98, simbolo = "Yy", nome = "Itérbio-teste")

    @Test fun nomeQueNaoExisteNoIdiomaSaiRotuladoComoReserva() {
        val rotulos = mapOf("pt-BR" to "nome em inglês", "es" to "nombre en inglés", "de" to "Name auf Englisch", "fr" to "nom en anglais")
        for ((idioma, rotulo) in rotulos) {
            val t = Tx.de(idioma)
            val n = Nomes.elemento(elementoSoEmIngles(), idioma)
            if (idioma == "pt-BR") {
                assertEquals("em pt-BR o nome é o do pacote, sem rótulo", "Xenônio-teste", t.nomeRotulado(n))
            } else {
                assertTrue("$idioma reserva", n.reserva)
                assertEquals("Testium (${rotulo})".lowercase(), t.nomeRotulado(n).lowercase())
            }
        }
        val en = Tx.de("en")
        assertEquals("em inglês o nome inglês é o próprio, sem rótulo", "Testium", en.nomeRotulado(Nomes.elemento(elementoSoEmIngles(), "en")))
        val soPt = en.nomeRotulado(Nomes.elemento(elementoSoEmPortugues(), "en"))
        assertEquals("Itérbio-teste (name in Portuguese)", soPt)
        assertEquals("Nome em inglês", Tx.pt.rotuloNomeEm("en"))
        assertEquals("Name in Portuguese", en.rotuloNomeEm("pt-BR"))
    }

    @Test fun compostoSemNomeNoIdiomaCaiParaOIngles() {
        val c = Composto(cid = 1, nome = "Água-teste", nomes = mapOf("en" to "test water"))
        val es = Tx.de("es")
        assertEquals("test water (nombre en inglés)", es.nomeRotulado(Nomes.composto(c, "es")))
        val fr = Composto(cid = 2, nome = "Água-teste", nomes = mapOf("fr" to "eau test", "en" to "test water"))
        assertEquals("eau test", Tx.de("fr").nomeRotulado(Nomes.composto(fr, "fr")))
    }

    // ---- números, datas e formas de texto no idioma ----------------------------------------------------------------------------------

    @Test fun numerosSaemNoFormatoDoIdioma() {
        assertEquals("18,015", Tx.pt.fixo(18.0153, 3))
        assertEquals("18.015", Tx.de("en").fixo(18.0153, 3))
        assertEquals("18,015", Tx.de("es").fixo(18.0153, 3))
        assertEquals("18,015", Tx.de("de").fixo(18.0153, 3))
        assertEquals("18,015", Tx.de("fr").fixo(18.0153, 3))
        assertEquals("1.811", Tx.pt.sig(1811.0, 4))
        assertEquals("1,811", Tx.de("en").sig(1811.0, 4))
        assertEquals("6,022 × 10²³", Tx.pt.cient(6.02214076e23, 3))
        assertEquals("6.022 × 10²³", Tx.de("en").cient(6.02214076e23, 3))
    }

    @Test fun datasSaemNoFormatoDoIdioma() {
        val iso = "2026-10-12T17:16:53Z"
        assertTrue(Tx.pt.data(iso)!!.contains("2026"))
        val dePt = Tx.pt.data("2026-10-12")!!
        val dEn = Tx.de("en").data("2026-10-12")!!
        assertTrue("$dePt x $dEn", dePt != dEn && dEn.contains("Oct"))
        assertEquals(null, Tx.pt.data("não é data"))
        assertTrue(Tx.de("de").data(iso, comHora = true)!!.contains(":"))
    }

    @Test fun regraDeCaixaNoMeioDaFrase() {
        assertEquals("ponto de fusão", Idiomas.minusNoMeio("Ponto de fusão", "pt-BR"))
        assertEquals("Schmelzpunkt", Idiomas.minusNoMeio("Schmelzpunkt", "de"))
        assertEquals("CID 962", Idiomas.minusNoMeio("CID 962", "pt-BR"))
    }

    @Test fun pluraisSeguemAsFormasDoIdioma() {
        val t = Tx.de("en")
        assertTrue(t.plural(R.plurals.resp_tab_n_elementos, 1, 1).contains("1 element") && !t.plural(R.plurals.resp_tab_n_elementos, 1, 1).contains("elements"))
        assertTrue(t.plural(R.plurals.resp_tab_n_elementos, 3, 3).contains("3 elements"))
        assertEquals("1 elemento(s)", Tx.pt.plural(R.plurals.resp_tab_n_elementos, 1, 1).substringBefore(" no pacote"))
        val dias = Tx.pt.plural(R.plurals.resp_pacote_assinado, 7, 7)
        assertTrue(dias, dias.endsWith("a cada 7 dias."))
    }
}
