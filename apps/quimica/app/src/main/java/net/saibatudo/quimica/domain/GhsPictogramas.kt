package net.saibatudo.quimica.domain

import androidx.annotation.StringRes
import net.saibatudo.quimica.R

/**
 * Os nove pictogramas do GHS em texto, no idioma de quem os mostra: [nome] (legenda curta: "Explosivo"), [desenho] (o que está desenhado:
 * "bomba explodindo") e [descricao] (quando aparece). Tudo em strings.xml; os vetores estão em res/drawable (ic_ghs01…09).
 */
object GhsPictogramas {
    val CODIGOS: List<String> = listOf("GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09")

    private val NOMES = mapOf(
        "GHS01" to R.string.ghs_nome_ghs01, "GHS02" to R.string.ghs_nome_ghs02, "GHS03" to R.string.ghs_nome_ghs03, "GHS04" to R.string.ghs_nome_ghs04,
        "GHS05" to R.string.ghs_nome_ghs05, "GHS06" to R.string.ghs_nome_ghs06, "GHS07" to R.string.ghs_nome_ghs07, "GHS08" to R.string.ghs_nome_ghs08,
        "GHS09" to R.string.ghs_nome_ghs09
    )
    private val DESENHOS = mapOf(
        "GHS01" to R.string.ghs_desenho_ghs01, "GHS02" to R.string.ghs_desenho_ghs02, "GHS03" to R.string.ghs_desenho_ghs03, "GHS04" to R.string.ghs_desenho_ghs04,
        "GHS05" to R.string.ghs_desenho_ghs05, "GHS06" to R.string.ghs_desenho_ghs06, "GHS07" to R.string.ghs_desenho_ghs07, "GHS08" to R.string.ghs_desenho_ghs08,
        "GHS09" to R.string.ghs_desenho_ghs09
    )
    private val DESCRICOES = mapOf(
        "GHS01" to R.string.ghs_descricao_ghs01, "GHS02" to R.string.ghs_descricao_ghs02, "GHS03" to R.string.ghs_descricao_ghs03, "GHS04" to R.string.ghs_descricao_ghs04,
        "GHS05" to R.string.ghs_descricao_ghs05, "GHS06" to R.string.ghs_descricao_ghs06, "GHS07" to R.string.ghs_descricao_ghs07, "GHS08" to R.string.ghs_descricao_ghs08,
        "GHS09" to R.string.ghs_descricao_ghs09
    )

    /** Nome curto do pictograma, ou null se o código não é um dos nove. */
    @StringRes fun nomeOuNull(codigo: String): Int? = NOMES[codigo.uppercase()]

    @StringRes fun nome(codigo: String): Int = NOMES.getValue(codigo.uppercase())
    @StringRes fun desenho(codigo: String): Int = DESENHOS.getValue(codigo.uppercase())
    @StringRes fun descricao(codigo: String): Int = DESCRICOES.getValue(codigo.uppercase())
}
