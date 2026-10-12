package net.saibatudo.quimica.domain

import java.util.Locale

/**
 * Idiomas do app (docs/I18N.md): códigos BCP 47, sempre estes. Português do Brasil é o padrão e a referência; o que não existe no idioma pedido
 * cai para o inglês e depois para o português (sempre rotulado na interface). Espelha web/src/quimica/js/i18n/idiomas.js.
 */
object Idiomas {
    const val PADRAO = "pt-BR"
    val TODOS: List<String> = listOf("pt-BR", "en", "es", "de", "fr")

    /** Nome de cada idioma no próprio idioma (endônimo): igual em todos os catálogos. */
    val ENDONIMOS: Map<String, String> = mapOf("pt-BR" to "Português (Brasil)", "en" to "English", "es" to "Español", "de" to "Deutsch", "fr" to "Français")

    /** "pt", "pt-br", "PT-PT" → "pt-BR"; "en-US" → "en"; "es_419" → "es"; desconhecido → null. */
    fun normalizar(x: String?): String? {
        val s = x?.trim()?.lowercase(Locale.ROOT)?.replace('_', '-') ?: return null
        if (s.isEmpty()) return null
        if (s == "pt" || s.startsWith("pt-")) return PADRAO
        val base = s.substringBefore('-')
        return base.takeIf { it in TODOS }
    }

    /** Primeiro idioma suportado de uma lista de preferências (do sistema), ou pt-BR. */
    fun dePreferencias(tags: List<String?>): String = tags.firstNotNullOfOrNull { normalizar(it) } ?: PADRAO

    /** Ordem de busca de um dado no idioma: o próprio, inglês e português (sem repetir). */
    fun comReservas(idioma: String): List<String> = listOf(normalizar(idioma) ?: PADRAO, "en", PADRAO).distinct()

    /** Separador decimal do idioma (I18N §1.3): ponto em inglês, vírgula nos demais. */
    fun separadorDecimal(idioma: String): Char = if (normalizar(idioma) == "en") '.' else ','

    fun locale(idioma: String): Locale = Locale.forLanguageTag(normalizar(idioma) ?: PADRAO)

    /**
     * Primeira letra minúscula no meio da frase ("Ponto de fusão" → "ponto de fusão"), exceto no alemão, que mantém a maiúscula dos substantivos
     * (catálogo `regras.minusculaNoMeio` do site); siglas e fórmulas ("CID 962", "DDT", "H₂O") ficam como estão.
     */
    fun minusNoMeio(s: String, idioma: String): String {
        if (s.isEmpty() || normalizar(idioma) == "de") return s
        if (s.length >= 2 && s[0] in 'A'..'Z' && s[1] in 'A'..'Z' || s.take(3).any { it.isDigit() }) return s
        return s.replaceFirstChar { it.lowercase(locale(idioma)) }
    }
}
