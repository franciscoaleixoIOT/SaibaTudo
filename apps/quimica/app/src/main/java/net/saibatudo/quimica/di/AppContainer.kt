package net.saibatudo.quimica.di

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import net.saibatudo.quimica.BuildConfig
import net.saibatudo.quimica.ai.nlu.CloudNluClient
import net.saibatudo.quimica.data.bundle.BundleStore
import net.saibatudo.quimica.data.bundle.DataUpdateScheduler
import net.saibatudo.quimica.data.bundle.DataUpdater
import net.saibatudo.quimica.data.bundle.ManifestVerifier
import net.saibatudo.quimica.data.bundle.UpdateCoordinator
import net.saibatudo.quimica.data.prefs.DataStorePreferences
import net.saibatudo.quimica.data.prefs.PreferencesStore
import net.saibatudo.quimica.data.remote.HttpClientFactory
import net.saibatudo.quimica.data.remote.MelhoriaClient
import net.saibatudo.quimica.data.remote.MelhoriaFila
import net.saibatudo.quimica.data.repository.QuimicaDataStore
import net.saibatudo.quimica.domain.FonteDeTextos
import net.saibatudo.quimica.ui.RecursosAndroid
import okhttp3.OkHttpClient

/** Contêiner de dependências do app (injeção manual). */
class AppContainer(private val app: Context) {
    private val escopo = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /** Único cliente HTTP do app: atualização assinada do pacote de dados e, com consentimento, a IA na nuvem. */
    val http: OkHttpClient by lazy { HttpClientFactory.criar(BuildConfig.VERSION_NAME) }

    /** Textos do app (res/values-<idioma>/strings.xml) por idioma: respostas, dicionário e telas. */
    val recursos: FonteDeTextos by lazy { RecursosAndroid(app) }

    /** NLU na nuvem (`POST <API_BASE_URL>nlu`): só chamado com consentimento; só interpreta, a resposta é montada no aparelho. */
    val nuvem: CloudNluClient by lazy { CloudNluClient(http, BuildConfig.API_BASE_URL + "nlu") }

    val preferencias: PreferencesStore by lazy { DataStorePreferences(app) }

    /** "Ajudar a melhorar o app" (`POST <API_BASE_URL>melhoria`): só com consentimento; fila no DataStore, filtrada no aparelho. */
    val melhoria: MelhoriaFila by lazy {
        val cliente = MelhoriaClient(http, BuildConfig.API_BASE_URL + "melhoria")
        MelhoriaFila(preferencias, enviarLote = cliente::enviar)
    }
    private val verificador: ManifestVerifier by lazy { ManifestVerifier(BuildConfig.DATA_PUBLIC_KEY) }
    val pacotes: BundleStore by lazy { BundleStore(app, verificador) }
    val dados: QuimicaDataStore by lazy { QuimicaDataStore(pacotes) }

    private val atualizador: DataUpdater by lazy {
        DataUpdater(pacotes, http, BuildConfig.DATA_BASE_URL, verificador, BuildConfig.VERSION_CODE)
    }
    val atualizacoes: UpdateCoordinator by lazy { UpdateCoordinator(app, atualizador, dados, preferencias) }

    /** Chamado em Application.onCreate: carrega o pacote e agenda a atualização semanal em segundo plano. */
    fun iniciar() {
        escopo.launch { dados.carregar() }
        escopo.launch {
            val economia = preferencias.atual().economiaDeDados
            DataUpdateScheduler.agendar(app, atualizacoes.intervaloMinutos(), economia)
        }
    }
}
