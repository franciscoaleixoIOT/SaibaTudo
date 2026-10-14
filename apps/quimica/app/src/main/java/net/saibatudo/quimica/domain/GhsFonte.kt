package net.saibatudo.quimica.domain

import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Fonte

/**
 * Fonte da classificação GHS de um composto. O pacote traz em `ghs.fonte` o nome cru da fonte do PubChem, em inglês
 * ("Regulation (EC) No 1272/2008 of the European Parliament and of the Council"), e, na lista `fontes` do mesmo composto, a entrada já
 * localizada e com URL ("Regulamento (CE) n.º 1272/2008, Anexo VI (classificação harmonizada), via PubChem"). Mostrar os dois dava uma
 * linha "Classificação: Regulation (EC)…" em inglês e repetida nas respostas de segurança (achado de 14/10/2026). Mesma regra do site
 * (`web/src/quimica/js/perigos.js`, `fonteGhs`).
 */
object GhsFonte {
    private val CLP = Regex("""1272/2008|\bCLP\b""", RegexOption.IGNORE_CASE)

    /** O texto é a referência ao Regulamento CLP (1272/2008)? */
    fun ehClp(texto: String?): Boolean = texto != null && CLP.containsMatchIn(texto)

    /**
     * Fonte a exibir junto das frases H: a entrada localizada de `fontes` quando ela cobre o CLP (ou tem o mesmo nome do texto cru);
     * senão o texto cru de `ghs.fonte`; sem fonte, null.
     */
    fun localizada(c: Composto): Fonte? {
        val bruta = c.ghs?.fonte?.trim().orEmpty()
        val lista = c.fontes
        val daLista = lista.firstOrNull { ehClp(it.nome) || ehClp(it.url) }
        if (daLista != null && (bruta.isEmpty() || ehClp(bruta))) return daLista
        if (bruta.isEmpty()) return null
        return lista.firstOrNull { it.nome == bruta } ?: Fonte(nome = bruta)
    }

    /** Texto cru de `ghs.fonte` que ainda vale a pena mostrar como linha própria: só quando NÃO é o CLP (esse já vai na lista de fontes). */
    fun linhaAvulsa(fonte: String?): String? = fonte?.trim()?.takeIf { it.isNotEmpty() && !ehClp(it) }
}
