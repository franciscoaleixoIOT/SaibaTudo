package net.saibatudo.quimica.domain

import net.saibatudo.quimica.BuildConfig
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.OrigemResposta
import java.net.URLEncoder

/**
 * "Relatar problema nesta resposta" (docs/PADRAO_ASSISTENTE.md §3), igual ao site (`urlRelato` em web/.../ui/inicio.js): um link para uma
 * issue PÚBLICA no GitHub já preenchida. Nada é enviado pelo app: o navegador abre a página e a pessoa decide se publica.
 * O corpo leva só a pergunta, a intenção, a origem da resposta e as versões do app e dos dados (sem nome, e-mail nem localização).
 * Pedido perigoso recusado ([Intent.RECUSA_PERIGO]) não ganha relato: o texto dele nunca sai do aparelho.
 */
object Relato {
    const val ROTULOS = "quimica,resposta"
    const val MAX_TITULO = 80

    fun urlRelato(
        t: Textos,
        pergunta: String,
        intent: Intent,
        origem: OrigemResposta,
        versaoApp: String = BuildConfig.VERSION_NAME,
        versaoDados: String?,
        base: String = BuildConfig.SOURCE_URL
    ): String? {
        if (intent == Intent.RECUSA_PERIGO) return null
        val q = pergunta.trim()
        val titulo = t(R.string.relato_titulo, q.take(MAX_TITULO))
        val corpo = t(
            R.string.relato_corpo, q, intent.name, origem.name.lowercase(), versaoApp,
            versaoDados?.takeIf { it.isNotBlank() } ?: "?"
        )
        return base.trimEnd('/') + "/issues/new?title=" + cod(titulo) + "&labels=" + cod(ROTULOS) + "&body=" + cod(corpo)
    }

    /** Codificação de componente de URL (espaço como %20, não "+"). `URLEncoder.encode(String, Charset)` só existe no API 33. */
    internal fun cod(s: String): String = URLEncoder.encode(s, "UTF-8").replace("+", "%20")
}
