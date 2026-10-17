package net.saibatudo.quimica.ai.nlu

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Texto
import kotlin.math.abs

/**
 * Multi-turno da IA na nuvem (NLU v3.4+, desde 17/10/2026; api/README.md, "POST /api/nlu", campo `contexto`). Numa PERGUNTA DE CONTINUAÇÃO
 * ("e o do potássio?", "em gramas?", "desenhe") o app manda junto a INTERPRETAÇÃO da pergunta anterior da conversa — intenção + entidades
 * como TEXTO (símbolo, nome/fórmula do composto, nunca o CID; id da propriedade; unidades do vocabulário) —, nunca o texto dela nem o
 * histórico. Paridade com o site: `contextoParaNuvem`/`ehContinuacao`/`contextoDaPergunta` em web/src/quimica/js/nuvem.js; casos em
 * contracts/nlu_contexto_cases.json.
 */
object ContextoNuvem {
    /** Tamanho máximo do contexto na forma canônica do servidor (api/_lib/contexto.js, nlu_core.format_output). */
    const val MAX_CONTEXTO = 400
    private const val MAX_COMPOSTO = 60
    private const val MAX_EQUACAO = 120
    private const val MAX_QUANTIDADES = 4
    /** Pergunta que começa com conectivo de continuação só conta se for curta (em palavras normalizadas). */
    const val MAX_PALAVRAS_CONTINUACAO = 10

    /** Ordem fixa das chaves (= nlu_core.KEYS). */
    val CHAVES = listOf("intent", "elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino")

    /** Chaves que cada intenção admite (espelho das permitidas de ENTIDADES_POR_INTENCAO em backend/modal/nlu_core.py; o teste confere). */
    val CHAVES_POR_INTENCAO: Map<Intent, List<String>> = mapOf(
        Intent.ELEMENTO to listOf("elemento"),
        Intent.COMPOSTO to listOf("composto"),
        Intent.PROPRIEDADE to listOf("elemento", "composto", "propriedade"),
        Intent.MASSA_MOLAR to listOf("elemento", "composto"),
        Intent.BALANCEAR to listOf("equacao"),
        Intent.ESTEQUIOMETRIA to listOf("elemento", "composto", "quantidades", "equacao"),
        Intent.CONCENTRACAO to listOf("composto", "quantidades", "unidadeDestino"),
        Intent.PH to listOf("composto", "quantidades"),
        Intent.GAS_IDEAL to listOf("composto", "quantidades"),
        Intent.CONVERSAO_UNIDADE to listOf("quantidades", "unidadeDestino"),
        Intent.NOMENCLATURA to listOf("composto"),
        Intent.DESENHAR to listOf("composto"),
        Intent.COMPARAR to listOf("elemento", "composto", "propriedade"),
        Intent.TABELA_PERIODICA to listOf("propriedade"),
        Intent.SEGURANCA to listOf("elemento", "composto"),
        Intent.CONCEITO to listOf("composto", "nivel"),
        Intent.NOX to listOf("elemento", "composto"),
        Intent.ENTALPIA to listOf("composto", "quantidades", "equacao"),
        Intent.EQUILIBRIO to listOf("equacao", "quantidades"),
        Intent.LIGACAO to listOf("elemento", "composto")
    )

    /** Unidades do contrato (espelho de UNIDADES em api/_lib/vocab.js; o teste confere): outra unidade não vai no contexto. */
    val UNIDADES: Set<String> = setOf(
        "g", "mg", "kg", "u", "mol", "mmol", "L", "mL", "dm3", "m3", "cm3",
        "mol/L", "mmol/L", "g/L", "mg/L", "g/mL", "g/cm3", "kg/m3", "g/mol", "kJ/mol", "kcal/mol",
        "%", "ppm", "K", "°C", "°F", "atm", "Pa", "kPa", "bar", "mmHg", "torr",
        "J", "kJ", "cal", "kcal", "eV", "m", "cm", "mm", "nm", "pm", "Å", "s", "min", "h"
    )

    private val PROIBIDOS = Regex("""[\u0000-\u001f\u007f"\\]|<\||\|>""")

    private fun textoValido(v: String?, max: Int): String? {
        val s = v?.let { Regex("""\s+""").replace(it, " ").trim() } ?: return null
        return s.takeIf { it.isNotEmpty() && it.length <= max && !PROIBIDOS.containsMatchIn(it) && !it.all(Char::isDigit) }
    }

    /**
     * Texto do composto, NUNCA o CID: a fórmula digitada; o nome de exibição do pacote no idioma; o trecho da pergunta que resolveu o
     * composto (fórmula como foi escrita ou o nome normalizado); outra fórmula citada.
     */
    fun textoDoComposto(q: ParsedQuery, d: Dicionario): String? {
        val cid = q.composto?.toLongOrNull()
        val candidatos = sequence {
            yield(q.formula)
            yield(q.compostoNome)
            if (cid != null) yield(d.nomeDoComposto(cid))
            if (cid != null && q.textoOriginal.isNotBlank()) {
                val a = d.entidades(q.textoOriginal).compostos.firstOrNull { it.cid == cid }
                yield(a?.texto ?: a?.chave)
            }
            yield(q.formulas.firstOrNull())
        }
        return candidatos.firstNotNullOfOrNull { textoValido(it, MAX_COMPOSTO) }
    }

    /** Número como o servidor serializa: inteiro sem ".0"; senão o decimal. */
    private fun numero(v: Double): Number = if (v == Math.rint(v) && abs(v) < 1e15) v.toLong() else v

    /** Serialização canônica do servidor (api/_lib/contexto.js `contextoCanonico`), só para medir o tamanho. */
    fun tamanho(ctx: JsonObject): Int {
        val partes = CHAVES.mapNotNull { k ->
            val v = ctx.get(k) ?: return@mapNotNull null
            if (k == "quantidades") {
                val itens = v.asJsonArray.joinToString(", ") { e ->
                    val o = e.asJsonObject
                    "{\"valor\": ${o.get("valor").asNumber}, \"unidade\": ${o.get("unidade")}}"
                }
                "\"quantidades\": [$itens]"
            } else "\"$k\": $v"
        }
        return partes.joinToString(", ", "{", "}").length
    }

    /**
     * Interpretação (local ou da nuvem) → objeto `contexto` do contrato: `intent` + só as chaves que a intenção admite, na ordem fixa, sem
     * null, até [MAX_CONTEXTO] caracteres na forma canônica. null quando não há o que herdar (DESCONHECIDA, recusa, institucionais, intenção
     * sem entidades) ou o objeto não cabe.
     */
    fun paraNuvem(q: ParsedQuery, d: Dicionario): JsonObject? {
        val chaves = CHAVES_POR_INTENCAO[q.intent] ?: return null
        var elemento = q.elemento?.takeIf { "elemento" in chaves && Regex("^[A-Z][a-z]{0,2}$").matches(it) }
        var composto = if ("composto" in chaves && (q.composto != null || q.formula != null)) textoDoComposto(q, d) else null
        val propriedade = q.propriedade?.takeIf { "propriedade" in chaves && Regex("^[A-Za-z0-9]{1,40}$").matches(it) }
        val quantidades = if ("quantidades" in chaves) {
            q.quantidades.filter { it.valor.isFinite() && it.unidade in UNIDADES }.take(MAX_QUANTIDADES)
        } else emptyList()
        val equacao = if ("equacao" in chaves) textoValido(q.equacao, MAX_EQUACAO) else null
        val nivel = q.nivel?.takeIf { "nivel" in chaves && it in NluValidator.NIVEIS }
        val destino = q.unidadeDestino?.takeIf { "unidadeDestino" in chaves && it in UNIDADES }
        // um só alvo: a propriedade fica com o alvo que a resposta usou; nas outras intenções (menos COMPARAR), o composto vence o elemento
        if (elemento != null && composto != null && q.intent != Intent.COMPARAR) {
            if (q.intent == Intent.PROPRIEDADE && q.alvoPropriedade == "elemento") composto = null else elemento = null
        }
        if (elemento == null && composto == null && propriedade == null && quantidades.isEmpty() && equacao == null && destino == null) return null
        val o = JsonObject()
        o.addProperty("intent", q.intent.name)
        elemento?.let { o.addProperty("elemento", it) }
        composto?.let { o.addProperty("composto", it) }
        propriedade?.let { o.addProperty("propriedade", it) }
        if (quantidades.isNotEmpty()) {
            o.add("quantidades", JsonArray().apply {
                quantidades.forEach { x -> add(JsonObject().apply { addProperty("valor", numero(x.valor)); addProperty("unidade", x.unidade) }) }
            })
        }
        equacao?.let { o.addProperty("equacao", it) }
        nivel?.let { o.addProperty("nivel", it) }
        destino?.let { o.addProperty("unidadeDestino", it) }
        return o.takeIf { tamanho(it) <= MAX_CONTEXTO }
    }

    /** A interpretação local (sem contexto) ficou sem a entidade de que a intenção precisa: "qual o raio atômico?", "desenhe", "é perigoso?". */
    fun faltaEntidade(q: ParsedQuery): Boolean {
        val nEl = maxOf(q.elementos.size, if (q.elemento != null) 1 else 0)
        val nCo = maxOf(q.compostos.size, if (q.composto != null) 1 else 0) + maxOf(q.formulas.size, if (q.formula != null) 1 else 0)
        return when (q.intent) {
            Intent.ELEMENTO -> q.elemento == null
            Intent.COMPOSTO, Intent.NOMENCLATURA, Intent.DESENHAR -> nCo == 0
            Intent.PROPRIEDADE -> q.propriedade == null || nEl + nCo == 0
            Intent.MASSA_MOLAR, Intent.SEGURANCA -> nEl + nCo == 0
            Intent.COMPARAR -> nEl + nCo < 2
            Intent.CONVERSAO_UNIDADE -> q.unidadeDestino == null || q.quantidades.isEmpty()
            Intent.BALANCEAR -> q.equacao == null
            else -> false
        }
    }

    /**
     * A pergunta é de CONTINUAÇÃO? [local] é a interpretação local da pergunta SEM o contexto da conversa. Sim quando o NLU local não entendeu
     * (DESCONHECIDA), entendeu a intenção sem a entidade obrigatória ([faltaEntidade]), ou a pergunta é curta (até [MAX_PALAVRAS_CONTINUACAO]
     * palavras) e tem conectivo de continuação do idioma (`pistas.continuacaoNuvem` do léxico). Recusa nunca.
     */
    fun ehContinuacao(pergunta: String, local: ParsedQuery, lex: Lexico): Boolean {
        val n = Texto.nlu(pergunta)
        if (n.isEmpty() || local.intent == Intent.RECUSA_PERIGO) return false
        if (local.intent == Intent.DESCONHECIDA || faltaEntidade(local)) return true
        return n.split(' ').size <= MAX_PALAVRAS_CONTINUACAO && lex.pista("continuacaoNuvem").containsMatchIn(n)
    }

    /**
     * O `contexto` a mandar com [pergunta], ou null: só numa pergunta de continuação e com uma interpretação ANTERIOR da mesma conversa
     * ([anterior], local ou da nuvem) que não seja DESCONHECIDA/RECUSA_PERIGO e tenha o que herdar.
     */
    fun daPergunta(pergunta: String, anterior: ParsedQuery?, d: Dicionario): JsonObject? {
        if (anterior == null || anterior.intent == Intent.DESCONHECIDA || anterior.intent == Intent.RECUSA_PERIGO) return null
        val ctx = paraNuvem(anterior, d) ?: return null
        return ctx.takeIf { ehContinuacao(pergunta, LocalNlu.parse(pergunta, d), d.lexico) }
    }
}
