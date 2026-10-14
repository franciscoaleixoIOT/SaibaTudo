package net.saibatudo.quimica.ai.nlu

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Quantidade
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.FormulaQuimica
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.max

/** Interpretação da nuvem já revalidada: [query] null = não confiável; [sugestoes] são CIDs do pacote para "você quis dizer…?". */
data class InterpretacaoNuvem(
    val query: ParsedQuery?,
    val sugestoes: List<Long> = emptyList(),
    /** Texto do composto copiado da pergunta pela nuvem (para reescrever a pergunta com a sugestão). */
    val compostoTexto: String? = null
)

/**
 * Valida a saída do NLU da nuvem (`POST /api/nlu`, api/README.md). A nuvem NUNCA fornece fatos: só a intenção e as entidades, e cada
 * entidade é conferida aqui contra os dados LOCAIS (o [Dicionario] do pacote assinado) e contra o texto da pergunta:
 *  - `elemento`: símbolo que existe no pacote e aparece na pergunta (símbolo ou nome);
 *  - `composto`: texto que aparece na pergunta e se resolve no dicionário local; o CID de `resolucao` só vale se existir no pacote;
 *    fórmula fora do índice só vale se for uma fórmula válida;
 *  - `propriedade`: id conhecido de `regras.propriedades`;
 *  - `quantidades`/`unidadeDestino`: unidade conhecida e número que está escrito na pergunta (nenhum número vem do modelo);
 *  - `equacao`: equação de espécies válidas, todas escritas na pergunta; `nivel`: fundamental/medio/superior.
 * Fora do vocabulário = descartado. Intenção que exige entidade sem a entidade = não confiável (null). A resposta é sempre montada pelo
 * AnswerBuilder local a partir do [ParsedQuery] devolvido.
 */
object NluValidator {
    val NIVEIS = setOf("fundamental", "medio", "superior")
    private const val MAX_QUANTIDADES = 6

    /**
     * [nlu] é o objeto `nlu` da resposta; [resolucao] o objeto `resolucao` (pode faltar); [local] é a interpretação local da MESMA
     * pergunta (traz os campos auxiliares que a nuvem não manda: constantes, fórmulas, filtros da tabela…). Sem [local], é calculada aqui.
     */
    fun validar(nlu: JsonObject, resolucao: JsonObject?, d: Dicionario, pergunta: String, local: ParsedQuery? = null): InterpretacaoNuvem {
        val original = Regex("""\s+""").replace(pergunta, " ").trim().take(LocalNlu.TAMANHO_MAXIMO)
        val base = local ?: LocalNlu.parse(original, d)
        // a segurança local vem antes de tudo: se o aparelho recusa, a nuvem não muda isso
        if (base.intent == Intent.RECUSA_PERIGO) return InterpretacaoNuvem(base)
        val intent = nlu.str("intent")?.uppercase()?.let { n -> Intent.entries.firstOrNull { it.name == n } } ?: return InterpretacaoNuvem(null)
        if (intent == Intent.RECUSA_PERIGO) return InterpretacaoNuvem(ParsedQuery(Intent.RECUSA_PERIGO, textoOriginal = original))

        val n = Texto.nlu(original)
        val ascii = Texto.paraAscii(original)
        val compostoTexto = nlu.str("composto")?.take(80)
        val sugestoes = sugestoesDe(resolucao, d)
        if (intent == Intent.DESCONHECIDA) return InterpretacaoNuvem(null, sugestoes, compostoTexto)

        // ---- entidades, uma a uma ----
        val elemento = nlu.str("elemento")?.let { validarElemento(it, d, original, n, base) }
        var cid: Long? = null
        var formula: String? = null
        if (compostoTexto != null && temEvidencia(compostoTexto, n)) {
            cid = d.compostoPorNome(compostoTexto) ?: d.compostoPorFormula(compostoTexto)
                ?: cidResolvido(resolucao)?.takeIf { d.nomeDoComposto(it) != null }
            if (cid == null && FormulaQuimica.tentar(Texto.paraAscii(compostoTexto).trim()) != null && compostoTexto.none { it.isWhitespace() }) {
                formula = Texto.paraAscii(compostoTexto).trim()
            }
        }
        val propriedade = nlu.str("propriedade")?.takeIf { d.propriedade(it) != null }
        val unidadeDestino = nlu.str("unidadeDestino")?.let { unidade(it, d) }
        val nivel = nlu.str("nivel")?.lowercase()?.takeIf { it in NIVEIS }
        val equacao = nlu.str("equacao")?.take(200)?.let { validarEquacao(it, ascii) }
        val quantidades = validarQuantidades(nlu.get("quantidades"), d, original)

        // ---- junta com a interpretação local (os campos que a nuvem não manda) ----
        val elementos = (listOfNotNull(elemento) + base.elementos).distinct()
        val compostos = (listOfNotNull(cid?.toString()) + base.compostos).distinct()
        val formulas = (listOfNotNull(formula) + base.formulas).distinct()
        val propriedades = (listOfNotNull(propriedade) + base.propriedades).distinct()
        var q = base.copy(
            intent = intent,
            elemento = elemento ?: base.elemento, elementos = elementos,
            composto = cid?.toString() ?: base.composto, compostos = compostos,
            compostoNome = cid?.let { d.nomeDoComposto(it) } ?: base.compostoNome,
            formula = formula ?: base.formula, formulas = formulas,
            propriedade = propriedade ?: base.propriedade, propriedades = propriedades,
            quantidades = quantidades.ifEmpty { base.quantidades },
            equacao = equacao ?: base.equacao,
            nivel = nivel ?: base.nivel,
            unidadeDestino = unidadeDestino ?: base.unidadeDestino,
            herdado = false
        )
        q = when (intent) {
            Intent.CONCEITO -> q.copy(conceito = base.conceito ?: LocalNlu.conceitoDe(n, d.lexico).ifEmpty { null })
            Intent.PROPRIEDADE -> {
                val alvo = q.propriedade?.let { d.propriedade(it)?.alvo }
                q.copy(alvoPropriedade = if (alvo == "composto" && (q.composto != null || q.formula != null)) "composto" else if (q.elemento != null) "elemento" else "composto")
            }
            Intent.SEGURANCA -> q.copy(mistura = base.mistura || d.lexico.pista("mistura").containsMatchIn(n))
            else -> q
        }
        if (!temAsEntidadesExigidas(q)) return InterpretacaoNuvem(null, sugestoes, compostoTexto)
        return InterpretacaoNuvem(q, sugestoes, compostoTexto)
    }

    /** Intenções que são a própria entidade (api/README.md) e calculadoras que não funcionam sem o dado principal. */
    fun temAsEntidadesExigidas(q: ParsedQuery): Boolean {
        val temComposto = q.composto != null || q.formula != null
        return when (q.intent) {
            Intent.ELEMENTO -> q.elemento != null
            Intent.COMPOSTO, Intent.NOMENCLATURA, Intent.DESENHAR -> temComposto
            Intent.PROPRIEDADE -> q.propriedade != null
            Intent.MASSA_MOLAR -> q.elemento != null || temComposto
            Intent.COMPARAR -> q.elementos.size + q.compostos.size + q.formulas.size >= 2
            Intent.BALANCEAR -> q.equacao != null
            Intent.CONVERSAO_UNIDADE -> q.unidadeDestino != null && q.quantidades.isNotEmpty()
            Intent.DESCONHECIDA -> false
            else -> true
        }
    }

    private fun validarElemento(bruto: String, d: Dicionario, original: String, n: String, base: ParsedQuery): String? {
        val simbolo = bruto.takeIf { d.pacote.porSimbolo.containsKey(it) }
            ?: d.pacote.porSimbolo.keys.firstOrNull { it.equals(bruto, ignoreCase = true) }
            ?: d.elementoPorNome(bruto)
            ?: return null
        if (simbolo in base.elementos) return simbolo
        // evidência: o símbolo escrito (com a caixa certa) ou um nome do elemento em qualquer idioma do pacote
        if (Regex("""(?<![A-Za-z])${Regex.escape(simbolo)}(?![a-z])""").containsMatchIn(original)) return simbolo
        val e = d.pacote.porSimbolo[simbolo] ?: return null
        val nomes = listOfNotNull(e.nome, e.nomeEn) + e.nomes.values
        return simbolo.takeIf { nomes.any { nome -> Texto.nlu(nome).let { it.isNotEmpty() && " $n ".contains(" $it ") } } }
    }

    /** O texto (nome ou fórmula) está escrito na pergunta? Compara na normalização do NLU, por palavras inteiras. */
    private fun temEvidencia(texto: String, n: String): Boolean {
        val k = Texto.nlu(Texto.paraAscii(texto))
        return k.isNotEmpty() && " $n ".contains(" $k ")
    }

    private fun unidade(texto: String, d: Dicionario): String? =
        d.unidades.porSimbolo(texto.trim())?.simbolo ?: Quantidades.lerUnidade(texto, d.unidades, d.lexico)

    private fun validarQuantidades(el: JsonElement?, d: Dicionario, original: String): List<Quantidade> {
        if (el == null || !el.isJsonArray) return emptyList()
        val lidas = Quantidades.ler(original, d.unidades, d.lexico)
        val out = mutableListOf<Quantidade>()
        for (item in el.asJsonArray.take(MAX_QUANTIDADES)) {
            val o = item.takeIf { it.isJsonObject }?.asJsonObject ?: continue
            val p = o.get("valor")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber } ?: continue
            val valor = p.asDouble.takeIf { it.isFinite() } ?: continue
            val u = o.str("unidade")?.let { unidade(it, d) } ?: continue
            // o número tem de estar escrito na pergunta
            val lida = lidas.firstOrNull { abs(it.valor - valor) <= 1e-9 * max(1.0, abs(valor)) } ?: continue
            out += Quantidade(lida.valor, u, lida.texto)
        }
        return out
    }

    private fun validarEquacao(eq: String, ascii: String): String? {
        val norm = LocalNlu.extrairEquacao(Texto.paraAscii(eq)) ?: return null
        val especies = norm.split(' ').filter { it != "+" && it != "->" }.map { it.replace(Regex("""^\d+"""), "") }.filter { it.isNotEmpty() }
        return norm.takeIf { especies.isNotEmpty() && especies.all { ascii.contains(it) } }
    }

    private fun cidResolvido(resolucao: JsonObject?): Long? =
        resolucao?.get("composto")?.takeIf { it.isJsonObject }?.asJsonObject?.str("cid")?.toLongOrNull()

    private fun sugestoesDe(resolucao: JsonObject?, d: Dicionario): List<Long> {
        val arr = resolucao?.get("composto")?.takeIf { it.isJsonObject }?.asJsonObject?.get("sugestoes")?.takeIf { it.isJsonArray }?.asJsonArray
            ?: return emptyList()
        return arr.take(3).mapNotNull { s -> s.takeIf { it.isJsonObject }?.asJsonObject?.str("cid")?.toLongOrNull() }
            .filter { d.nomeDoComposto(it) != null }.distinct()
    }

    private fun JsonObject.str(k: String): String? =
        get(k)?.takeIf { it.isJsonPrimitive }?.asString?.trim()?.takeIf { it.isNotEmpty() && it != "null" }
}

/**
 * Cliente do NLU na nuvem (`POST <API_BASE_URL>nlu`, api/README.md). Só é chamado com consentimento: o toque em "Perguntar à IA na
 * nuvem" (por pergunta) ou a opção "IA na nuvem automática" (só nas perguntas que o app não entendeu). Envia apenas o texto da pergunta
 * (até 300 caracteres) e o identificador aleatório da instalação; nada mais.
 */
class CloudNluClient(
    private val http: OkHttpClient,
    private val endpoint: String,
    private val clientName: String = "android"
) {
    private val json = "application/json; charset=utf-8".toMediaType()

    sealed interface Resultado {
        data class Ok(val nlu: JsonObject, val resolucao: JsonObject?, val modelo: String?) : Resultado
        /** `503 {"error":"disabled"}`: a nuvem está desligada no servidor. */
        data object Desligada : Resultado
        /** `429` (limite por IP/instalação) ou `503 budget` (orçamento do dia). */
        data object Limite : Resultado
        /** Rede, tempo esgotado ou erro do servidor (5xx, 4xx inesperado). */
        data class Indisponivel(val codigo: Int? = null) : Resultado
        /** Resposta 200 que não é o JSON do contrato. */
        data object Invalida : Resultado
    }

    suspend fun consultar(pergunta: String, installId: String, timeoutMs: Long): Resultado = withContext(Dispatchers.IO) {
        val corpo = JsonObject().apply {
            addProperty("q", pergunta.take(LocalNlu.TAMANHO_MAXIMO))
            addProperty("v", 1)
            addProperty("client", clientName)
            addProperty("iid", installId)
        }.toString()
        val req = Request.Builder().url(endpoint).post(corpo.toRequestBody(json)).build()
        val cliente = http.newBuilder()
            .callTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .readTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .build()
        try {
            cliente.newCall(req).execute().use { r ->
                val txt = r.body?.string().orEmpty().take(20_001)
                if (!r.isSuccessful) {
                    val erro = runCatching { JsonParser.parseString(txt).asJsonObject.get("error")?.asString }.getOrNull()
                    return@withContext when {
                        r.code == 503 && erro == "disabled" -> Resultado.Desligada
                        r.code == 503 && erro == "budget" -> Resultado.Limite
                        r.code == 429 -> Resultado.Limite
                        else -> Resultado.Indisponivel(r.code)
                    }
                }
                if (txt.length > 20_000) return@withContext Resultado.Invalida
                val raiz = JsonParser.parseString(txt).takeIf { it.isJsonObject }?.asJsonObject ?: return@withContext Resultado.Invalida
                if (raiz.get("ok")?.takeIf { it.isJsonPrimitive }?.asBoolean != true) return@withContext Resultado.Invalida
                val nlu = raiz.get("nlu")?.takeIf { it.isJsonObject }?.asJsonObject ?: return@withContext Resultado.Invalida
                val resolucao = raiz.get("resolucao")?.takeIf { it.isJsonObject }?.asJsonObject
                val modelo = raiz.get("model")?.takeIf { it.isJsonPrimitive }?.asString
                Resultado.Ok(nlu, resolucao, modelo)
            }
        } catch (_: IOException) {
            Resultado.Indisponivel()
        } catch (_: RuntimeException) {
            Resultado.Invalida // JSON malformado / campos com tipo inesperado
        }
    }
}
