package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.domain.Idiomas

/**
 * Moldes de texto das respostas que já dependem do idioma (docs/I18N.md §6). É o ponto único por onde a próxima etapa ("strings": os ~770
 * textos do Kotlin em res/values-<idioma>/strings.xml) troca os moldes fixos por recursos: cada função recebe o idioma e devolve o texto pronto.
 * Os valores são os do catálogo do site (web/src/quimica/js/i18n/catalogos/<idioma>.js); de/fr ainda herdam o inglês lá (`copiaDe: 'en'`).
 */
internal object Moldes {

    /** Nome de um idioma escrito no idioma [em] (catálogos `ui.idiomas`). */
    private val NOMES_DOS_IDIOMAS: Map<String, Map<String, String>> = mapOf(
        "pt-BR" to mapOf("pt-BR" to "português", "en" to "inglês", "es" to "espanhol", "de" to "alemão", "fr" to "francês"),
        "en" to mapOf("pt-BR" to "Portuguese", "en" to "English", "es" to "Spanish", "de" to "German", "fr" to "French"),
        "es" to mapOf("pt-BR" to "portugués", "en" to "inglés", "es" to "español", "de" to "alemán", "fr" to "francés"),
        "de" to mapOf("pt-BR" to "Portugiesisch", "en" to "Englisch", "es" to "Spanisch", "de" to "Deutsch", "fr" to "Französisch"),
        "fr" to mapOf("pt-BR" to "portugais", "en" to "anglais", "es" to "espagnol", "de" to "allemand", "fr" to "français")
    )

    /** `respostas.fontes.trechoEm`. */
    private val TRECHO_EM: Map<String, String> = mapOf(
        "pt-BR" to "Texto em {idioma} (ainda sem tradução).",
        "en" to "Text in {idioma} (not yet translated).",
        "es" to "Texto en {idioma} (aún sin traducir)."
    )

    private fun no(idioma: String) = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO

    fun nomeDoIdioma(idioma: String, em: String): String = NOMES_DOS_IDIOMAS[no(em)]?.get(no(idioma)) ?: idioma

    /** Aviso de um trecho citado em [idiomaDoTexto] numa resposta em [em]. */
    fun trechoEm(idiomaDoTexto: String, em: String): String =
        (TRECHO_EM[no(em)] ?: TRECHO_EM.getValue("en")).replace("{idioma}", nomeDoIdioma(idiomaDoTexto, em))
}
