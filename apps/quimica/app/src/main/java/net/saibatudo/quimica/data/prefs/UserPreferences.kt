package net.saibatudo.quimica.data.prefs

import android.content.Context
import androidx.annotation.StringRes
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import net.saibatudo.quimica.R

enum class TemaApp(@param:StringRes val rotulo: Int) { SISTEMA(R.string.tema_sistema), CLARO(R.string.tema_claro), ESCURO(R.string.tema_escuro) }

enum class TamanhoFonte(@param:StringRes val rotulo: Int, val fator: Float) {
    PEQUENA(R.string.fonte_pequena, 0.9f), NORMAL(R.string.fonte_normal, 1f), GRANDE(R.string.fonte_grande, 1.15f), MUITO_GRANDE(R.string.fonte_muito_grande, 1.3f)
}

/** Nível de detalhe das explicações e fichas: fundamental, médio ou superior. */
enum class Nivel(val id: String, @param:StringRes val rotulo: Int, @param:StringRes val descricao: Int) {
    FUNDAMENTAL("fundamental", R.string.nivel_fundamental, R.string.nivel_fundamental_descricao),
    MEDIO("medio", R.string.nivel_medio, R.string.nivel_medio_descricao),
    SUPERIOR("superior", R.string.nivel_superior, R.string.nivel_superior_descricao);

    companion object {
        fun de(id: String?): Nivel = entries.firstOrNull { it.id == id } ?: MEDIO
    }
}

/**
 * Preferências do usuário (armazenadas apenas no aparelho). Nada aqui é enviado a servidores. A rede serve para a atualização assinada
 * do pacote de dados e, só com consentimento (botão "Perguntar à IA na nuvem" ou [iaNuvemAutomatica]), para enviar o TEXTO de uma
 * pergunta ao NLU na nuvem; o [idInstalacao] é aleatório (UUID v4, não identifica a pessoa) e só acompanha essas chamadas (limite de uso).
 */
data class UserPreferences(
    val tema: TemaApp = TemaApp.SISTEMA,
    val tamanhoFonte: TamanhoFonte = TamanhoFonte.NORMAL,
    val nivel: Nivel = Nivel.MEDIO,
    /** Economia de dados: atualiza o pacote só em Wi-Fi/rede sem franquia. */
    val economiaDeDados: Boolean = false,
    val ultimaVerificacaoDados: Long = 0L,
    val ultimaVersaoDados: String? = null,
    val historicoPerguntas: List<String> = emptyList(),
    /** IA na nuvem automática: as perguntas que o app não entende vão (só o texto) ao NLU na nuvem. Desligada por padrão. */
    val iaNuvemAutomatica: Boolean = false,
    /** Identificador aleatório desta instalação, criado no primeiro pedido à nuvem (ou ao "Ajudar a melhorar o app"). */
    val idInstalacao: String? = null,
    /** "Ajudar a melhorar o app": as perguntas que o app não entendeu vão (filtradas) para revisão. Desligado por padrão. */
    val melhoria: Boolean = false,
    /** Perguntas aguardando envio ao "Ajudar a melhorar o app" (só no aparelho; apagadas ao desligar a opção ou apagar os dados). */
    val filaMelhoria: List<ItemMelhoria> = emptyList()
) {
    companion object {
        /** Histórico de perguntas: até 50 itens (docs/PADRAO_ASSISTENTE.md §1). */
        const val LIMITE_HISTORICO = 50
    }
}

/** Uma pergunta na fila do "Ajudar a melhorar o app". [explicito]: veio do botão "Enviar esta pergunta" (não vai ao servidor). */
data class ItemMelhoria(val q: String, val intentLocal: String, val t: String, val idioma: String, val explicito: Boolean = false)

/** Armazenamento de preferências (interface para permitir testes sem Android). */
interface PreferencesStore {
    val preferencias: Flow<UserPreferences>
    suspend fun atual(): UserPreferences = preferencias.first()
    suspend fun atualizar(transformacao: (UserPreferences) -> UserPreferences)
}

private val Context.preferenciasDataStore by preferencesDataStore(name = "preferencias_saibatudo_quimica")

class DataStorePreferences(private val context: Context) : PreferencesStore {
    private object K {
        val tema = stringPreferencesKey("tema")
        val fonte = stringPreferencesKey("tamanho_fonte")
        val nivel = stringPreferencesKey("nivel")
        val economia = booleanPreferencesKey("economia_de_dados")
        val verif = longPreferencesKey("ultima_verificacao_dados")
        val versao = stringPreferencesKey("ultima_versao_dados")
        val historico = stringPreferencesKey("historico_perguntas")
        val iaNuvem = booleanPreferencesKey("ia_nuvem_automatica")
        val iid = stringPreferencesKey("id_instalacao")
        val melhoria = booleanPreferencesKey("melhoria")
        val filaMelhoria = stringPreferencesKey("fila_melhoria")
    }

    private val gson = Gson()

    override val preferencias: Flow<UserPreferences> = context.preferenciasDataStore.data.map { p -> ler(p) }

    private fun ler(p: Preferences) = UserPreferences(
        tema = p[K.tema]?.let { n -> TemaApp.entries.firstOrNull { it.name == n } } ?: TemaApp.SISTEMA,
        tamanhoFonte = p[K.fonte]?.let { n -> TamanhoFonte.entries.firstOrNull { it.name == n } } ?: TamanhoFonte.NORMAL,
        nivel = Nivel.de(p[K.nivel]),
        economiaDeDados = p[K.economia] ?: false,
        ultimaVerificacaoDados = p[K.verif] ?: 0L,
        ultimaVersaoDados = p[K.versao],
        historicoPerguntas = p[K.historico]?.let { raw ->
            try {
                gson.fromJson(raw, Array<String>::class.java)?.toList()
            } catch (_: Exception) {
                null
            }
        } ?: emptyList(),
        iaNuvemAutomatica = p[K.iaNuvem] ?: false,
        idInstalacao = p[K.iid],
        melhoria = p[K.melhoria] ?: false,
        filaMelhoria = p[K.filaMelhoria]?.let { raw ->
            try {
                gson.fromJson(raw, Array<ItemMelhoria>::class.java)?.toList()?.filter { it.q.isNotBlank() }
            } catch (_: Exception) {
                null
            }
        } ?: emptyList()
    )

    override suspend fun atualizar(transformacao: (UserPreferences) -> UserPreferences) {
        context.preferenciasDataStore.edit { p ->
            val novo = transformacao(ler(p))
            p[K.tema] = novo.tema.name
            p[K.fonte] = novo.tamanhoFonte.name
            p[K.nivel] = novo.nivel.id
            p[K.economia] = novo.economiaDeDados
            p[K.verif] = novo.ultimaVerificacaoDados
            if (novo.ultimaVersaoDados != null) p[K.versao] = novo.ultimaVersaoDados else p.remove(K.versao)
            p[K.iaNuvem] = novo.iaNuvemAutomatica
            if (novo.idInstalacao != null) p[K.iid] = novo.idInstalacao else p.remove(K.iid)
            p[K.melhoria] = novo.melhoria
            if (novo.filaMelhoria.isNotEmpty()) p[K.filaMelhoria] = gson.toJson(novo.filaMelhoria.takeLast(30)) else p.remove(K.filaMelhoria)
            if (novo.historicoPerguntas.isNotEmpty()) {
                p[K.historico] = gson.toJson(novo.historicoPerguntas.takeLast(UserPreferences.LIMITE_HISTORICO))
            } else {
                p.remove(K.historico)
            }
        }
    }
}

/** Identificador aleatório da instalação (UUID v4): o guardado ou um novo, que fica salvo. */
suspend fun PreferencesStore.idInstalacao(): String {
    atual().idInstalacao?.let { return it }
    var id = ""
    atualizar { p -> if (p.idInstalacao != null) p.also { id = it.idInstalacao!! } else p.copy(idInstalacao = java.util.UUID.randomUUID().toString()).also { id = it.idInstalacao!! } }
    return id
}

/** Implementação em memória (testes unitários e pré-visualizações). */
class InMemoryPreferences(inicial: UserPreferences = UserPreferences()) : PreferencesStore {
    private val estado = MutableStateFlow(inicial)
    override val preferencias: Flow<UserPreferences> = estado
    override suspend fun atualizar(transformacao: (UserPreferences) -> UserPreferences) {
        estado.value = transformacao(estado.value)
    }
}
