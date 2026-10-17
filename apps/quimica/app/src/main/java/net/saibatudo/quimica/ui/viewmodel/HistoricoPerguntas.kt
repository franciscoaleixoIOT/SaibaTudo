package net.saibatudo.quimica.ui.viewmodel

import net.saibatudo.quimica.data.prefs.UserPreferences

/**
 * Navegação pelo histórico de perguntas com as setas ▲▼ acima do campo (molde: `apps/eleicoes2026/.../ui/viewmodel/HistoricoPerguntas.kt`;
 * docs/PADRAO_ASSISTENTE.md §1). [itens] é o histórico guardado (mais antiga primeiro); [posicao] == itens.size é o "modo livre" (campo com o
 * rascunho). ▲ sobe para a anterior e guarda o que estava escrito; ▼ desce e, depois da última, devolve o rascunho.
 */
data class HistoricoPerguntas(
    val itens: List<String> = emptyList(),
    val posicao: Int = itens.size,
    val rascunho: String = ""
) {
    /** Última pergunta enviada (exibida acima do campo, que volta em branco). */
    val ultima: String? get() = itens.lastOrNull()
    val podeSubir: Boolean get() = posicao > 0
    val podeDescer: Boolean get() = posicao < itens.size

    /** Seta ▲: pergunta anterior. [atual] é o texto do campo (guardado como rascunho se estava no modo livre). */
    fun subir(atual: String): Pair<HistoricoPerguntas, String>? {
        if (!podeSubir) return null
        val rasc = if (posicao == itens.size) atual else rascunho
        val nova = posicao - 1
        return copy(posicao = nova, rascunho = rasc) to itens[nova]
    }

    /** Seta ▼: pergunta seguinte; ao passar da última, volta ao rascunho (vazio se nada foi escrito). */
    fun descer(): Pair<HistoricoPerguntas, String>? {
        if (!podeDescer) return null
        val nova = posicao + 1
        return if (nova == itens.size) copy(posicao = nova) to rascunho else copy(posicao = nova) to itens[nova]
    }

    companion object {
        const val LIMITE = UserPreferences.LIMITE_HISTORICO
        const val TAMANHO_MAXIMO = 300

        /**
         * Histórico depois de enviar [pergunta]: a pergunta vai para o fim (uma repetição sai do meio, então a última nunca se repete), cortada
         * em [TAMANHO_MAXIMO] caracteres, no máximo [LIMITE] itens.
         */
        fun registrar(historico: List<String>, pergunta: String): List<String> {
            val p = pergunta.trim().take(TAMANHO_MAXIMO)
            if (p.isEmpty()) return historico
            return (historico.filter { it != p } + p).takeLast(LIMITE)
        }

        /**
         * Texto do campo depois de uma edição: o campo cresce de 1 a 3 linhas mas não aceita quebra de linha. Devolve o texto e se a pessoa
         * apertou Enter (uma única quebra digitada no fim = enviar); quebras coladas viram espaço.
         */
        fun editar(anterior: String, novo: String): Pair<String, Boolean> {
            if ('\n' !in novo && '\r' !in novo) return novo.take(TAMANHO_MAXIMO) to false
            val semQuebra = novo.replace("\r\n", "\n").replace('\r', '\n')
            val enter = semQuebra.length == anterior.length + 1 && semQuebra.count { it == '\n' } == 1 && semQuebra.replace("\n", "") == anterior
            val limpo = semQuebra.replace(Regex("""\s*\n\s*"""), " ")
            return (if (enter) anterior else limpo).take(TAMANHO_MAXIMO) to enter
        }
    }
}
