package net.saibatudo.quimica.data.remote

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import net.saibatudo.quimica.ai.Seguranca
import net.saibatudo.quimica.data.prefs.ItemMelhoria
import net.saibatudo.quimica.data.prefs.PreferencesStore
import net.saibatudo.quimica.data.prefs.idInstalacao
import net.saibatudo.quimica.domain.Idiomas
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * "Ajudar a melhorar o app": envio OPCIONAL das perguntas que o app NÃO entendeu (`POST <API_BASE_URL>melhoria`), molde do app de Eleições
 * (`apps/eleicoes2026/.../data/remote/MelhoriaClient.kt`).
 *
 * Diferente da IA na nuvem (que só interpreta e descarta), aqui o texto é GUARDADO no servidor para uma pessoa revisar e ensinar o NLU. Por isso:
 * - consentimento próprio (Configurações > "Ajudar a melhorar o app", desligado por padrão) ou o toque em "Enviar esta pergunta" numa resposta
 *   não entendida (consentimento só para aquela pergunta);
 * - pedido perigoso NUNCA entra na fila (a regra de [Seguranca] decide, nos mesmos idiomas do NLU);
 * - texto com dado pessoal (e-mail, telefone, CPF/CNPJ, URL, @usuário, sequência longa de dígitos) também não entra — o filtro é local e o
 *   servidor refaz a checagem;
 * - a fila fica só no aparelho (DataStore), limitada a [LIMITE_FILA]; o envio vai em lotes de até [LOTE] quando há pelo menos [MIN_PARA_ENVIAR]
 *   (ou uma pergunta enviada pelo botão); desligar a opção ou "Apagar os dados deste aparelho" apaga a fila.
 * - O envio leva só a pergunta, a intenção local, a data (dia, sem hora), o idioma e o identificador aleatório da instalação (o mesmo da nuvem).
 */
object Melhoria {
    const val LIMITE_FILA = 30
    const val LOTE = 10
    const val MIN_PARA_ENVIAR = 3
    const val MIN_Q = 3
    const val MAX_Q = 300

    private val RX_PESSOAL = listOf(
        // e-mail
        Regex("""[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"""),
        // @usuário (redes sociais)
        Regex("""(?<![\w.])@[A-Za-z0-9_][A-Za-z0-9_.]{1,}"""),
        // URL e domínio
        Regex("""(?i)\b(?:https?://|www\.)\S+"""),
        Regex("""(?i)\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|br|io|gov|edu|info|me|app|dev|co|xyz|site|online)(?:\.[a-z]{2})?\b"""),
        // CPF (000.000.000-00) e CNPJ (00.000.000/0000-00)
        Regex("""\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b"""),
        Regex("""\b\d{2}\.?\d{3}\.?\d{3}/\d{4}-?\d{2}\b"""),
        // telefone: "+55 11 91234-5678", "(11) 1234-5678", "91234 5678"
        Regex("""\+\d[\d\s().-]{7,}\d"""),
        Regex("""(?:\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]\d{4}\b"""),
        // sequência longa de dígitos (9 ou mais, com ou sem espaços/pontos entre grupos): documento, cartão, telefone sem máscara
        Regex("""\d(?:\s?\d){8,}""")
    )
    private val RX_CONTROLES = Regex("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]")
    private val RX_ESPACOS = Regex("""\s+""")

    /** O texto tem algo que pode identificar alguém (e-mail, telefone, CPF/CNPJ, URL, @usuário, sequência longa de dígitos)? */
    fun temDadoPessoal(q: String): Boolean = RX_PESSOAL.any { it.containsMatchIn(q) }

    /**
     * Texto limpo se a pergunta puder ir para a fila; null se for curta, longa, tiver dado pessoal ou for um pedido perigoso (a mesma regra que
     * recusa a resposta, no idioma do app + inglês + português).
     */
    fun textoEnfileiravel(q: String, idioma: String = Idiomas.PADRAO): String? {
        val t = q.replace(RX_CONTROLES, " ").replace(RX_ESPACOS, " ").trim()
        if (t.length < MIN_Q || t.length > MAX_Q) return null
        if (temDadoPessoal(t)) return null
        if (Seguranca.avaliar(t, Seguranca.idiomasDaAvaliacao(idioma)).recusar) return null
        return t
    }

    /** Data de hoje no formato do contrato (AAAA-MM-DD, só o dia). */
    fun hoje(agora: Long = System.currentTimeMillis()): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date(agora))
}

/** Resultado de um envio ao servidor. */
sealed interface EnvioMelhoria {
    /** 200 `{ok:true, aceitos, descartados}`: o lote sai da fila. */
    data class Aceito(val aceitos: Int, val descartados: Int) : EnvioMelhoria
    /** 503 `{error:"disabled"}`: captura desligada no servidor; a fila fica guardada, sem erro na tela. */
    data object Desligado : EnvioMelhoria
    /** 429: limite de envios; tentar depois. */
    data object Limite : EnvioMelhoria
    /** 400: o servidor recusou o lote por inválido; ele nunca será aceito, então sai da fila para não travá-la. */
    data object Invalido : EnvioMelhoria
    /** Rede, tempo ou outro erro: mantém a fila e tenta depois. */
    data object Falhou : EnvioMelhoria
}

class MelhoriaClient(private val http: OkHttpClient, private val endpoint: String) {
    private val json = "application/json; charset=utf-8".toMediaType()

    /** Corpo do contrato: `{v:1, client:"android", iid, idioma, itens:[{q, intentLocal, t}]}`. */
    fun corpo(itens: List<ItemMelhoria>, installId: String, idioma: String): String {
        val lista = JsonArray().apply {
            itens.forEach { i ->
                add(JsonObject().apply { addProperty("q", i.q); addProperty("intentLocal", i.intentLocal); addProperty("t", i.t) })
            }
        }
        return JsonObject().apply {
            addProperty("v", 1)
            addProperty("client", "android")
            addProperty("iid", installId)
            addProperty("idioma", idioma)
            add("itens", lista)
        }.toString()
    }

    suspend fun enviar(itens: List<ItemMelhoria>, installId: String, idioma: String): EnvioMelhoria = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url(endpoint).post(corpo(itens, installId, idioma).toRequestBody(json)).build()
            http.newCall(req).execute().use { r ->
                val raiz = try {
                    JsonParser.parseString(r.body?.string().orEmpty()).takeIf { it.isJsonObject }?.asJsonObject
                } catch (_: Exception) { null }
                when {
                    r.code == 400 -> EnvioMelhoria.Invalido
                    r.code == 429 -> EnvioMelhoria.Limite
                    r.code == 503 && raiz?.get("error")?.takeIf { it.isJsonPrimitive }?.asString == "disabled" -> EnvioMelhoria.Desligado
                    !r.isSuccessful -> EnvioMelhoria.Falhou
                    raiz?.get("ok")?.takeIf { it.isJsonPrimitive }?.asBoolean == true -> EnvioMelhoria.Aceito(
                        aceitos = raiz.get("aceitos")?.takeIf { it.isJsonPrimitive }?.asInt ?: itens.size,
                        descartados = raiz.get("descartados")?.takeIf { it.isJsonPrimitive }?.asInt ?: 0
                    )
                    else -> EnvioMelhoria.Falhou
                }
            }
        } catch (_: IOException) {
            EnvioMelhoria.Falhou
        } catch (_: RuntimeException) {
            EnvioMelhoria.Falhou
        }
    }
}

/**
 * Fila local das perguntas não entendidas, persistida nas preferências ([PreferencesStore]); o envio é injetável (testes).
 * Uma pergunta entra (a) sozinha, com a opção "Ajudar a melhorar o app" ligada, quando o app não a entendeu, ou (b) pelo botão "Enviar esta
 * pergunta" (consentimento só para ela, que é enviada logo). Nos dois casos passa pelo filtro de [Melhoria.textoEnfileiravel].
 */
class MelhoriaFila(
    private val prefs: PreferencesStore,
    private val enviarLote: suspend (itens: List<ItemMelhoria>, installId: String, idioma: String) -> EnvioMelhoria,
    private val relogio: () -> Long = { System.currentTimeMillis() }
) {
    private val trava = Mutex()

    /** A pergunta pode ir para a fila (passa no filtro de dado pessoal e de pedido perigoso)? Decide se o botão aparece. */
    fun podeEnviar(q: String, idioma: String): Boolean = Melhoria.textoEnfileiravel(q, idioma) != null

    /**
     * Põe a pergunta na fila. Sem [explicito], só com a opção ligada. Devolve se entrou (repetida, filtrada ou sem consentimento = false).
     */
    suspend fun enfileirar(q: String, intentLocal: String, idioma: String, explicito: Boolean = false): Boolean = trava.withLock {
        if (!explicito && !prefs.atual().melhoria) return@withLock false
        val texto = Melhoria.textoEnfileiravel(q, idioma) ?: return@withLock false
        val idi = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO
        var entrou = false
        prefs.atualizar { p ->
            val igual = p.filaMelhoria.indexOfFirst { it.q.equals(texto, ignoreCase = true) && it.idioma == idi }
            when {
                igual >= 0 && explicito && !p.filaMelhoria[igual].explicito -> {
                    entrou = true
                    p.copy(filaMelhoria = p.filaMelhoria.toMutableList().also { it[igual] = it[igual].copy(explicito = true) })
                }
                igual >= 0 -> p
                else -> {
                    entrou = true
                    val item = ItemMelhoria(texto, intentLocal, Melhoria.hoje(relogio()), idi, explicito)
                    p.copy(filaMelhoria = (p.filaMelhoria + item).takeLast(Melhoria.LIMITE_FILA))
                }
            }
        }
        entrou
    }

    /**
     * Envia um lote (até [Melhoria.LOTE] perguntas do mesmo idioma, as mais antigas primeiro) se houver pelo menos [Melhoria.MIN_PARA_ENVIAR],
     * se alguma veio do botão, ou com [forcar]. Nunca lança; só tira da fila o que o servidor aceitou (ou recusou por inválido).
     * Devolve null quando não havia o que enviar.
     */
    suspend fun enviarSePreciso(forcar: Boolean = false): EnvioMelhoria? = trava.withLock {
        val fila = prefs.atual().filaMelhoria
        if (fila.isEmpty()) return@withLock null
        if (!forcar && fila.size < Melhoria.MIN_PARA_ENVIAR && fila.none { it.explicito }) return@withLock null
        val idioma = fila.first().idioma
        val lote = fila.filter { it.idioma == idioma }.take(Melhoria.LOTE)
        val resultado = try {
            enviarLote(lote, prefs.idInstalacao(), idioma)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (_: Exception) {
            EnvioMelhoria.Falhou
        }
        if (resultado is EnvioMelhoria.Aceito || resultado == EnvioMelhoria.Invalido) {
            prefs.atualizar { p -> p.copy(filaMelhoria = p.filaMelhoria.filterNot { it in lote }) }
        }
        resultado
    }
}
