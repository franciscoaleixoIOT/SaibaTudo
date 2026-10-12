package net.saibatudo.quimica.ui

import android.app.Activity
import android.app.LocaleManager
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import android.os.LocaleList
import androidx.core.content.edit
import net.saibatudo.quimica.domain.Idiomas

/**
 * Idioma do app por aplicativo (docs/I18N.md §2, Android): no Android 13+ (API 33) usa o idioma por app do sistema ([LocaleManager] — o mesmo
 * que `AppCompatDelegate.setApplicationLocales` grava, e que o usuário também muda em Configurações > Idiomas do app, graças ao
 * `android:localeConfig`); antes disso guarda a escolha no aparelho e aplica o idioma ao contexto da Activity ([contexto]). Sem escolha, vale o
 * primeiro idioma do sistema que o app fala, com pt-BR como reserva. O mesmo idioma vai para o interpretador, o dicionário e as respostas.
 * (Sem AppCompat: o app é 100% Compose sobre o tema da plataforma, e o AppCompat exigiria trocar Activity e tema e somaria uma dependência.)
 */
object IdiomaApp {
    private const val PREFS = "idioma_app"
    private const val CHAVE = "idioma"

    /** Idioma escolhido pelo usuário (no app ou, no Android 13+, nas configurações do sistema); null = seguir o sistema. */
    fun escolhido(ctx: Context): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val locais = ctx.getSystemService(LocaleManager::class.java)?.applicationLocales
            return if (locais == null || locais.isEmpty) null else Idiomas.normalizar(locais[0].toLanguageTag())
        }
        return Idiomas.normalizar(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CHAVE, null))
    }

    /** Primeiro idioma do SISTEMA que o app fala (pt-BR se nenhum). */
    fun doSistema(): String {
        val locais = Resources.getSystem().configuration.locales
        return Idiomas.dePreferencias((0 until locais.size()).map { locais[it].toLanguageTag() })
    }

    /** Idioma em uso: o escolhido ou o do sistema. */
    fun atual(ctx: Context): String = escolhido(ctx) ?: doSistema()

    /** Troca o idioma do app ([idioma] null = seguir o sistema) e recria a tela para a interface mudar. */
    fun definir(ctx: Context, idioma: String?) {
        val id = Idiomas.normalizar(idioma)
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit { if (id == null) remove(CHAVE) else putString(CHAVE, id) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // o sistema grava a escolha e recria as Activities sozinho
            ctx.getSystemService(LocaleManager::class.java)?.applicationLocales = if (id == null) LocaleList.getEmptyLocaleList() else LocaleList.forLanguageTags(id)
        } else {
            atividade(ctx)?.recreate()
        }
    }

    /** Contexto com o idioma escolhido (Android 12 ou anterior; no 13+ o sistema já entrega o contexto no idioma do app). */
    fun contexto(base: Context): Context {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return base
        val id = escolhido(base) ?: return base
        val config = Configuration(base.resources.configuration)
        config.setLocales(LocaleList(Idiomas.locale(id)))
        return base.createConfigurationContext(config)
    }

    private tailrec fun atividade(ctx: Context): Activity? = when (ctx) {
        is Activity -> ctx
        is ContextWrapper -> atividade(ctx.baseContext)
        else -> null
    }
}
