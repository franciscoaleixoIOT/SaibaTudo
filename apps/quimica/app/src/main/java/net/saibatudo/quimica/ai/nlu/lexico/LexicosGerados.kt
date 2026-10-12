// gerado — não editar. Fonte: contracts/lexico/<idioma>.json (tools/gerar_lexico_kt.py).
// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).
package net.saibatudo.quimica.ai.nlu.lexico

/** Léxicos gerados, na ordem do contrato (pt-BR é a referência e o padrão). */
internal object LexicosGerados {
    val IDIOMAS: List<String> = listOf("pt-BR", "en", "es", "de", "fr")

    fun bruto(idioma: String): Map<String, Any?>? = when (idioma) {
        "pt-BR" -> LexicoPtBr.bruto()
        "en" -> LexicoEn.bruto()
        "es" -> LexicoEs.bruto()
        "de" -> LexicoDe.bruto()
        "fr" -> LexicoFr.bruto()
        else -> null
    }
}
