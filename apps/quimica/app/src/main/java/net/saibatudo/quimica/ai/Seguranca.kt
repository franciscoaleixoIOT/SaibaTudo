package net.saibatudo.quimica.ai

import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import java.text.Normalizer

/** Categorias de recusa (mesmos ids de web/src/quimica/js/seguranca.js). */
enum class CategoriaRecusa(val rotulo: String) {
    EXPLOSIVOS("explosivos"),
    ARMAS_QUIMICAS("armas químicas"),
    DROGAS("drogas ilícitas"),
    PRECURSORES("precursores de drogas ou de armas"),
    REAGENTES_CASEIROS("receitas caseiras com reagentes perigosos"),
    DANO_A_PESSOAS("dano a pessoas"),
    AUTOLESAO("risco à própria vida")
}

/** [idioma]: léxico cujas regras recusaram o pedido (o ativo, o inglês ou o português). */
data class AvaliacaoSeguranca(val recusar: Boolean, val categoria: CategoriaRecusa? = null, val motivo: String? = null, val idioma: String? = null) {
    val rotulo: String? get() = categoria?.rotulo
}

/** Resposta padrão de recusa (sem dados, sem números). */
data class RespostaRecusa(val principal: String, val linhas: List<String>, val categoria: CategoriaRecusa?)

/**
 * Segurança química: recusa por REGRAS, antes de qualquer outro processamento (NLU, dados ou modelo), de pedidos de síntese,
 * purificação ou ampliação de escala de explosivos, armas químicas, drogas ilícitas e precursores, e de receitas "em casa" com
 * reagentes perigosos. Perguntas legítimas (neutralizar um derramamento, EPI, primeiros socorros, por que não misturar produtos
 * de limpeza, fórmula ou estrutura de uma substância) NÃO são recusadas.
 *
 * Espelho de web/src/quimica/js/seguranca.js (mesmas listas e a mesma ordem de decisão). Casos compartilhados:
 * contracts/seguranca_cases.json. Estratégia: (alvo perigoso) E (ação de produzir/obter/esconder) no mesmo pedido; a frase é
 * examinada em três versões: normal (sem acentos), com trocas de "leet" (s1ntese, 3xplosivo) e "colada" (letras repetidas e
 * separadores removidos: "explo sivo", "e x p l o s i v o").
 */
object Seguranca {

    // ---- normalização ----------------------------------------------------------------------------------------------------

    private val RX_INVISIVEIS = Regex("[\\u200B-\\u200F\\u2060\\uFEFF\\u00AD\\u202A-\\u202E]")
    private val RX_COMBINANTES = Regex("[\\u0300-\\u036F]")
    private val RX_NAO_ALFANUM = Regex("[^a-z0-9]+")
    private val RX_ESPACOS = Regex("\\s+")
    private val RX_NAO_LETRA = Regex("[^a-z]")
    private val RX_REPETIDAS = Regex("(.)\\1+")

    /** Texto sem acentos, minúsculo e sem caracteres invisíveis. */
    private fun limpar(texto: String): String =
        RX_COMBINANTES.replace(RX_INVISIVEIS.replace(Normalizer.normalize(Texto.ligaduras(texto), Normalizer.Form.NFKD), ""), "").lowercase()

    private fun espacado(s: String) = RX_ESPACOS.replace(RX_NAO_ALFANUM.replace(s, " "), " ").trim()

    private fun leet(s: String): String = buildString(s.length) {
        for (c in s) append(
            when (c) {
                '0' -> 'o'; '1' -> 'i'; '3' -> 'e'; '4' -> 'a'; '5' -> 's'; '7' -> 't'; '8' -> 'b'
                '@' -> 'a'; '$' -> 's'; '!' -> 'i'; '|' -> 'l'; '€' -> 'e'
                else -> c
            }
        )
    }

    /** Colada: só letras, sem repetições consecutivas ("exploosivo" vira "explosivo"). */
    private fun colada(s: String) = RX_REPETIDAS.replace(RX_NAO_LETRA.replace(s, ""), "$1")

    // ---- mensagens -----------------------------------------------------------------------------------------------------------

    private const val MSG_PADRAO =
        "Não posso ajudar com isso. O SaibaTudo Química não fornece instruções de síntese, purificação, ampliação de escala nem receitas caseiras de explosivos, armas químicas, drogas ilícitas, seus precursores ou outros reagentes perigosos, porque podem causar mortes e ferimentos graves."
    private const val MSG_ALTERNATIVAS =
        "Posso ajudar com segurança e conhecimento: perigos, equipamentos de proteção (EPI), armazenamento, descarte e primeiros socorros de uma substância; propriedades, fórmula, massa molar e estrutura; cálculos e conceitos de Química."
    private const val MSG_DANO =
        "Não posso ajudar com isso. Não oriento sobre como ferir, envenenar ou intoxicar pessoas ou animais. Se alguém corre perigo ou foi exposto a uma substância, procure imediatamente um serviço de emergência ou um centro de informação toxicológica da sua região."
    private const val MSG_AUTOLESAO =
        "Sinto muito que você esteja passando por isso. Não posso orientar sobre esse assunto, mas você não está sozinho(a): procure agora alguém de confiança e um serviço de emergência da sua região. O Centro de Valorização da Vida (CVV) conversa com qualquer pessoa, de forma gratuita e sigilosa, em https://cvv.org.br."

    /** Perguntas de segurança legítimas, respondíveis pelo app (usadas como sugestões). */
    val SUGESTOES_SEGURAS = listOf(
        "Quais EPIs usar com ácido sulfúrico?",
        "Primeiros socorros para respingo de soda cáustica no olho",
        "Por que não misturar água sanitária com amoníaco?"
    )

    // ---- avaliação -------------------------------------------------------------------------------------------------------------

    private val LIBERADO = AvaliacaoSeguranca(false)

    private fun recusa(c: CategoriaRecusa, motivo: String, idioma: String) = AvaliacaoSeguranca(true, c, motivo, idioma)

    /** Idiomas cujos padrões são aplicados: o ativo e, sempre, inglês e português (um pedido perigoso em qualquer idioma é recusado). */
    fun idiomasDaAvaliacao(idioma: String = Idiomas.PADRAO): List<String> = listOf(Idiomas.normalizar(idioma) ?: Idiomas.PADRAO, "en", Idiomas.PADRAO).distinct()

    /**
     * Avalia o pedido com os léxicos de [idiomas] (padrão: pt-BR + en). Autolesão primeiro, em todos os idiomas; depois, por idioma, dano a
     * pessoas, "fazer uma bomba", alvos graves com ação, precursores e receitas caseiras; por fim a versão "colada" (grafia disfarçada).
     */
    fun avaliar(texto: String, idiomas: List<String> = idiomasDaAvaliacao()): AvaliacaoSeguranca {
        val base = limpar(texto)
        if (base.isBlank()) return LIBERADO
        val v1 = espacado(base)
        val v2 = espacado(leet(base))
        val visoes = if (v1 == v2) listOf(v1) else listOf(v1, v2)
        val lexicos = idiomas.distinct().map { Lexico.de(it) }.distinctBy { it.idioma }

        // autolesão primeiro, em todos os idiomas: resposta de acolhimento, mesmo sem "ação"
        for (lx in lexicos) for (v in visoes) if (lx.seguranca.alvoAutolesao.containsMatchIn(v)) return recusa(CategoriaRecusa.AUTOLESAO, "pedido ligado a autolesão", lx.idioma)

        for (lx in lexicos) {
            val s = lx.seguranca
            for (v in visoes) {
                val incidente = s.contextoSeguro.containsMatchIn(v)
                // "o que fazer se…", "fazer o descarte…" não são pedidos de produção: saem da frase antes de procurar a ação
                val vc = s.tirarFazerSeguro.replace(v, " ")
                val acao = s.acao.containsMatchIn(vc)
                val casa = s.casa.containsMatchIn(v)
                // dano a pessoas: o alvo já contém a ação
                if (s.alvoDano.containsMatchIn(v)) return recusa(CategoriaRecusa.DANO_A_PESSOAS, "pedido para ferir ou envenenar", lx.idioma)
                if (s.fazerBomba.containsMatchIn(vc)) return recusa(CategoriaRecusa.EXPLOSIVOS, "construção de artefato explosivo", lx.idioma)
                // alvos graves: a recusa vale mesmo com palavras de "segurança" na frase (não há como produzir "com segurança")
                if (acao && s.alvoExplosivos.containsMatchIn(vc)) return recusa(CategoriaRecusa.EXPLOSIVOS, "produção de explosivos", lx.idioma)
                if (acao && s.alvoArmas.containsMatchIn(vc)) return recusa(CategoriaRecusa.ARMAS_QUIMICAS, "produção de agentes tóxicos ou armas químicas", lx.idioma)
                if (acao && s.alvoDrogas.containsMatchIn(vc)) return recusa(CategoriaRecusa.DROGAS, "produção ou obtenção de drogas ilícitas", lx.idioma)
                if (acao && s.precursoresNomes.containsMatchIn(vc) && (s.alvoDrogas.containsMatchIn(vc) || s.precursoresAcao.containsMatchIn(vc))) {
                    return recusa(CategoriaRecusa.PRECURSORES, "obtenção ou uso de precursores controlados", lx.idioma)
                }
                // receitas caseiras com reagentes perigosos: "em casa" + produzir; fica de fora quem trata de descarte, EPI, incidente etc.
                if (!incidente && acao && casa && s.perigososCaseiros.containsMatchIn(vc)) {
                    return recusa(CategoriaRecusa.REAGENTES_CASEIROS, "receita caseira com reagente perigoso", lx.idioma)
                }
            }
        }

        // versão colada: tolera "explo sivo", "e x p l o s i v o", "exploosivo"
        for (lx in lexicos) {
            val s = lx.seguranca
            val c = colada(s.tirarFazerSeguro.replace(RX_NAO_ALFANUM.replace(leet(base), " "), " "))
            if (c.length >= 8 && !s.contextoSeguro.containsMatchIn(v1) && s.coladaAcoes.any { c.contains(it) }) {
                for ((cat, alvos) in s.coladaAlvos) {
                    val categoria = CategoriaRecusa.entries.firstOrNull { it.name == cat } ?: continue
                    if (alvos.any { c.contains(it) }) return recusa(categoria, "pedido de produção (grafia disfarçada)", lx.idioma)
                }
            }
        }
        return LIBERADO
    }

    /** Avaliação no idioma ativo (ele + inglês + português). */
    fun avaliarNoIdioma(texto: String, idioma: String): AvaliacaoSeguranca = avaliar(texto, idiomasDaAvaliacao(idioma))

    /** Resposta padrão de recusa. */
    fun respostaRecusa(avaliacao: AvaliacaoSeguranca?): RespostaRecusa {
        val principal = when (avaliacao?.categoria) {
            CategoriaRecusa.DANO_A_PESSOAS -> MSG_DANO
            CategoriaRecusa.AUTOLESAO -> MSG_AUTOLESAO
            else -> MSG_PADRAO
        }
        val linhas = mutableListOf(principal)
        if (avaliacao?.categoria != CategoriaRecusa.AUTOLESAO) linhas += MSG_ALTERNATIVAS
        return RespostaRecusa(principal, linhas, avaliacao?.categoria)
    }
}
