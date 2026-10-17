package net.saibatudo.quimica

import net.saibatudo.quimica.ui.viewmodel.HistoricoPerguntas
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Caixa de pergunta (docs/PADRAO_ASSISTENTE.md §1): histórico com ▲▼ e rascunho, registro sem repetir a última, campo sem quebra de linha. */
class HistoricoPerguntasTest {

    @Test
    fun registrarMoveRepeticaoParaOFimELimita() {
        var h = emptyList<String>()
        h = HistoricoPerguntas.registrar(h, " massa molar da água ")
        h = HistoricoPerguntas.registrar(h, "pH de HCl 0,01 M")
        h = HistoricoPerguntas.registrar(h, "massa molar da água")
        assertEquals(listOf("pH de HCl 0,01 M", "massa molar da água"), h)
        assertEquals(h, HistoricoPerguntas.registrar(h, "   "))
        repeat(80) { h = HistoricoPerguntas.registrar(h, "pergunta $it") }
        assertEquals(HistoricoPerguntas.LIMITE, h.size)
        assertEquals("pergunta 79", h.last())
        assertEquals(300, HistoricoPerguntas.registrar(emptyList(), "x".repeat(400)).single().length)
    }

    @Test
    fun setasPercorremEDevolvemORascunho() {
        var h = HistoricoPerguntas(listOf("a", "b", "c"))
        assertEquals("c", h.ultima)
        assertTrue(h.podeSubir)
        assertFalse(h.podeDescer)
        val (h1, t1) = h.subir("rascunho")!!
        assertEquals("c", t1)
        val (h2, t2) = h1.subir(t1)!!
        assertEquals("b", t2)
        val (h3, t3) = h2.subir(t2)!!
        assertEquals("a", t3)
        assertNull("no topo não sobe mais", h3.subir(t3))
        h = h3
        val (h4, t4) = h.descer()!!
        assertEquals("b", t4)
        val (h5, t5) = h4.descer()!!.let { it.first.descer()!! }
        assertEquals("depois da última volta ao rascunho", "rascunho", t5)
        assertFalse(h5.podeDescer)
        assertNull(h5.descer())
    }

    @Test
    fun historicoVazioNaoMostraSetas() {
        val h = HistoricoPerguntas(emptyList())
        assertNull(h.ultima)
        assertFalse(h.podeSubir)
        assertFalse(h.podeDescer)
    }

    @Test
    fun campoSemQuebraDeLinhaEEnterEnvia() {
        assertEquals("massa molar" to false, HistoricoPerguntas.editar("massa mola", "massa molar"))
        assertEquals("massa molar" to true, HistoricoPerguntas.editar("massa molar", "massa molar\n"))
        assertEquals("massa molar" to true, HistoricoPerguntas.editar("massa molar", "massa\n molar".replace("\n ", " ").let { "massa molar\n" }))
        // texto colado com quebras: vira espaço, não envia
        assertEquals("linha um linha dois" to false, HistoricoPerguntas.editar("", "linha um\nlinha dois"))
        assertEquals("a b" to false, HistoricoPerguntas.editar("x", "a\r\nb"))
        assertEquals(300, HistoricoPerguntas.editar("", "y".repeat(500)).first.length)
    }
}
