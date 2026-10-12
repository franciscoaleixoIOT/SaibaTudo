package net.saibatudo.quimica.domain

import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento

/** Nome escolhido para exibição: o texto, o idioma em que ele está e se é uma reserva (outro idioma: a interface rotula). */
data class NomeNoIdioma(val nome: String, val idioma: String, val reserva: Boolean)

/**
 * Nomes de elementos e compostos no idioma (docs/I18N.md §1.2, espelho de web/src/quimica/js/nomes.js): o nome vem do pacote
 * (`nomes[idioma]`, Wikidata), com reserva em inglês (`nomes.en`, `nomeEn`, `nomeIupac`) e depois em português (`nome`), marcada como
 * [NomeNoIdioma.reserva]. Nenhum nome é traduzido no cliente. Em pt-BR o resultado é o de sempre (`nome`/`nomeExibicao`).
 */
object Nomes {

    /** Primeira letra maiúscula (es/fr vêm do Wikidata em minúsculas: "oxígeno"). */
    fun capitalizar(s: String, idioma: String): String = s.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Idiomas.locale(idioma)) else it.toString() }

    fun elemento(e: Elemento, idioma: String): NomeNoIdioma {
        val id = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO
        val proprio = e.nomes[id] ?: when (id) { Idiomas.PADRAO -> e.nome; "en" -> e.nomeEn; else -> null }
        if (!proprio.isNullOrBlank()) return NomeNoIdioma(capitalizar(proprio, id), id, false)
        val ingles = e.nomes["en"] ?: e.nomeEn
        if (!ingles.isNullOrBlank()) return NomeNoIdioma(capitalizar(ingles, "en"), "en", id != "en")
        return NomeNoIdioma(e.nome, Idiomas.PADRAO, id != Idiomas.PADRAO)
    }

    fun composto(c: Composto, idioma: String): NomeNoIdioma {
        val id = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO
        if (id == Idiomas.PADRAO) return NomeNoIdioma(c.nomeExibicao, id, false)
        val proprio = c.nomes[id] ?: if (id == "en") c.nomeIupac else null
        if (!proprio.isNullOrBlank()) return NomeNoIdioma(proprio, id, false)    // como está no Wikidata (o site também não capitaliza)
        val ingles = c.nomes["en"] ?: c.nomeIupac
        if (!ingles.isNullOrBlank()) return NomeNoIdioma(ingles, "en", id != "en")
        return NomeNoIdioma(c.nomeExibicao, Idiomas.PADRAO, true)
    }

    /** Todos os nomes de um elemento para busca, na ordem de prioridade do idioma (o do idioma, inglês, português). */
    fun todosDoElemento(e: Elemento, idioma: String): List<String> {
        val id = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO
        return listOfNotNull(e.nomes[id], if (id == Idiomas.PADRAO) e.nome else null, e.nomes["en"], e.nomeEn, e.nomes[Idiomas.PADRAO], e.nome)
            .filter { it.isNotBlank() }.distinct()
    }
}
