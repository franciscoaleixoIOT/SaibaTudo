package net.saibatudo.quimica

import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.Ghs
import net.saibatudo.quimica.domain.GhsFonte
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Linha "Classificação: Regulation (EC) No 1272/2008…" em inglês e repetida (achado de 14/10/2026): a fonte localizada da lista vence o texto cru. */
class GhsFonteTest {
    private val cru = "Regulation (EC) No 1272/2008 of the European Parliament and of the Council"
    private val clpLocalizada = Fonte(nome = "Regulamento (CE) n.º 1272/2008, Anexo VI (classificação harmonizada), via PubChem", url = "https://pubchem.ncbi.nlm.nih.gov/")
    private val pubchem = Fonte(nome = "PubChem (NCBI/NLM)", url = "https://pubchem.ncbi.nlm.nih.gov/")

    private fun composto(fonteGhs: String?, fontes: List<Fonte>) = Composto(cid = 313, nome = "Ácido clorídrico", formula = "HCl", ghs = Ghs(pictogramas = listOf("GHS05"), fonte = fonteGhs), fontes = fontes)

    @Test
    fun `ehClp reconhece o regulamento em qualquer idioma e ignora outras fontes`() {
        assertTrue(GhsFonte.ehClp(cru))
        assertTrue(GhsFonte.ehClp("Regulamento (CE) n.º 1272/2008, Anexo VI"))
        assertTrue(GhsFonte.ehClp("ECHA CLP"))
        assertFalse(GhsFonte.ehClp("PubChem (NCBI/NLM)"))
        assertFalse(GhsFonte.ehClp(null))
    }

    @Test
    fun `localizada prefere a entrada traduzida da lista de fontes ao texto cru em ingles`() {
        assertEquals(clpLocalizada, GhsFonte.localizada(composto(cru, listOf(pubchem, clpLocalizada))))
        assertEquals(clpLocalizada, GhsFonte.localizada(composto(null, listOf(clpLocalizada))))
    }

    @Test
    fun `sem entrada localizada o texto cru continua valendo e sem fonte nenhuma da null`() {
        assertEquals(Fonte(nome = cru), GhsFonte.localizada(composto(cru, listOf(pubchem))))
        assertEquals("texto cru igual ao nome de uma fonte da lista reaproveita a entrada", pubchem, GhsFonte.localizada(composto("PubChem (NCBI/NLM)", listOf(pubchem))))
        assertNull(GhsFonte.localizada(composto(null, listOf(pubchem))))
        assertNull(GhsFonte.localizada(composto("  ", emptyList())))
    }

    @Test
    fun `linhaAvulsa some para o CLP (ja esta na lista de fontes) e fica para outras fontes`() {
        assertNull(GhsFonte.linhaAvulsa(cru))
        assertNull(GhsFonte.linhaAvulsa(null))
        assertEquals("GHS Japan", GhsFonte.linhaAvulsa(" GHS Japan "))
    }
}
