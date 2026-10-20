package net.saibatudo.quimica.ai.engine

import net.saibatudo.quimica.ai.answer.AnswerBuilder
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.OrigemResposta
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.nlu.CloudNluClient
import net.saibatudo.quimica.ai.nlu.ContextoNuvem
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.NluValidator

/** Por que o pedido à IA na nuvem não trouxe resposta nova (o texto para o usuário sai de `nuvem_falha_*`). */
enum class FalhaNuvem { DESLIGADA, LIMITE, INDISPONIVEL, NAO_ENTENDEU, MESMA_INTERPRETACAO, INVALIDA }

sealed interface DesfechoNuvem {
    data class Respondida(val query: ParsedQuery, val resposta: Resposta) : DesfechoNuvem
    /** [sugestoes]: perguntas reescritas com o composto que a nuvem sugeriu ("você quis dizer…?"), já conferido no pacote. */
    data class Falhou(val motivo: FalhaNuvem, val sugestoes: List<String> = emptyList()) : DesfechoNuvem
}

/**
 * IA na nuvem como APOIO DE INTERPRETAÇÃO (opt-in). O NLU local responde primeiro; a nuvem só é consultada com consentimento (toque no
 * botão ou opção automática) e só devolve intenção + entidades, que o [NluValidator] revalida nos dados do aparelho. A resposta é montada
 * pelo [AnswerBuilder] local, com a origem [OrigemResposta.NUVEM]: nenhum número vem do modelo.
 * Multi-turno (17/10/2026): numa pergunta de continuação, [contexto] (a interpretação ANTERIOR à pergunta, local ou da nuvem) vai junto
 * como `contexto` ([ContextoNuvem.daPergunta]: só intenção e entidades, nunca o texto da pergunta anterior).
 */
class AssistenteNuvem(
    private val cliente: CloudNluClient,
    private val idInstalacao: suspend () -> String,
    /** Opção automática (perguntas não entendidas): a partida a frio do serviço mediu 16,7 s em 20/10/2026 (era 14 s e a 1ª pergunta caía fora). */
    val timeoutAutomaticoMs: Long = 20_000,
    /** Pedido explícito (botão): a pessoa aceitou esperar; partida a frio + função da Vercel (maxDuration 50 desde 20/10/2026). */
    val timeoutExplicitoMs: Long = 45_000
) {
    suspend fun interpretar(
        pergunta: String,
        builder: AnswerBuilder,
        contexto: ParsedQuery?,
        respostaAtual: Resposta?,
        explicito: Boolean
    ): DesfechoNuvem {
        val local = LocalNlu.parseComContexto(pergunta, builder.dic, contexto)
        // pedido perigoso nunca sai do aparelho
        if (local.intent == Intent.RECUSA_PERIGO) return DesfechoNuvem.Falhou(FalhaNuvem.NAO_ENTENDEU)
        val ctx = ContextoNuvem.daPergunta(pergunta, contexto, builder.dic)
        val r = cliente.consultar(pergunta, idInstalacao(), if (explicito) timeoutExplicitoMs else timeoutAutomaticoMs, ctx)
        val ok = when (r) {
            is CloudNluClient.Resultado.Ok -> r
            CloudNluClient.Resultado.Desligada -> return DesfechoNuvem.Falhou(FalhaNuvem.DESLIGADA)
            CloudNluClient.Resultado.Limite -> return DesfechoNuvem.Falhou(FalhaNuvem.LIMITE)
            is CloudNluClient.Resultado.Indisponivel -> return DesfechoNuvem.Falhou(FalhaNuvem.INDISPONIVEL)
            CloudNluClient.Resultado.Invalida -> return DesfechoNuvem.Falhou(FalhaNuvem.INVALIDA)
        }
        val interp = NluValidator.validar(ok.nlu, ok.resolucao, builder.dic, pergunta, local, herdado = contexto.takeIf { ok.contextoEnviado })
        val q = interp.query
        if (q == null) {
            val perguntas = interp.compostoTexto?.let { texto ->
                interp.sugestoes.mapNotNull { cid -> builder.dic.nomeDoComposto(cid)?.let { nome -> reescrever(pergunta, texto, nome) } }
            }.orEmpty()
            return DesfechoNuvem.Falhou(FalhaNuvem.NAO_ENTENDEU, perguntas.distinct())
        }
        if (respostaAtual?.entendida == true && mesmaInterpretacao(q, local)) return DesfechoNuvem.Falhou(FalhaNuvem.MESMA_INTERPRETACAO)
        val resposta = builder.construir(q).copy(origem = OrigemResposta.NUVEM, modelo = ok.modelo)
        if (!resposta.entendida && !resposta.recusa) return DesfechoNuvem.Falhou(FalhaNuvem.NAO_ENTENDEU)
        return DesfechoNuvem.Respondida(q, resposta)
    }

    companion object {
        fun mesmaInterpretacao(a: ParsedQuery, b: ParsedQuery): Boolean =
            a.intent == b.intent && a.elemento == b.elemento && a.composto == b.composto && a.formula == b.formula &&
                a.propriedade == b.propriedade && a.equacao == b.equacao && a.unidadeDestino == b.unidadeDestino

        /** Troca, na pergunta, o texto do composto pelo nome sugerido (sem diferenciar maiúsculas); sem o texto, null. */
        fun reescrever(pergunta: String, texto: String, nome: String): String? {
            val i = pergunta.indexOf(texto, ignoreCase = true)
            if (i < 0) return null
            return pergunta.substring(0, i) + nome + pergunta.substring(i + texto.length)
        }
    }
}
