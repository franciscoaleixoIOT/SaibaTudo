package net.saibatudo.quimica.ui

import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import androidx.compose.runtime.compositionLocalOf
import net.saibatudo.quimica.domain.FonteDeTextos
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Textos
import java.util.concurrent.ConcurrentHashMap

/**
 * Textos do app no aparelho: `Resources` do idioma pedido (um por idioma, guardado), não o da Activity — assim o idioma das respostas é
 * sempre o do ViewModel/dicionário e nunca depende de qual `Context` chamou. `values/` (pt-BR) responde quando um idioma não tem a chave
 * (o teste `I18nStringsTest` garante que todos têm).
 */
class RecursosAndroid(private val base: Context) : FonteDeTextos {
    private val porIdioma = ConcurrentHashMap<String, Resources>()

    private fun recursos(idioma: String): Resources = porIdioma.getOrPut(Idiomas.normalizar(idioma) ?: Idiomas.PADRAO) {
        val config = Configuration(base.resources.configuration)
        config.setLocale(Idiomas.locale(idioma))
        base.createConfigurationContext(config).resources
    }

    override fun texto(id: Int, idioma: String, args: Array<out Any?>): String =
        if (args.isEmpty()) recursos(idioma).getString(id) else recursos(idioma).getString(id, *args)

    override fun plural(id: Int, quantidade: Int, idioma: String, args: Array<out Any?>): String =
        recursos(idioma).getQuantityString(id, quantidade, *args)
}

/** Os textos do idioma do app para as telas (fornecido em [net.saibatudo.quimica.ui.screens.MainAppScreen]). */
val LocalTextos = compositionLocalOf<Textos> { error("LocalTextos não fornecido") }
