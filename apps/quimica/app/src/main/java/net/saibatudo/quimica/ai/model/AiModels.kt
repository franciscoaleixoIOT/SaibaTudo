package net.saibatudo.quimica.ai.model

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.Ghs
import net.saibatudo.quimica.domain.Textos

/**
 * Intenções reconhecidas (docs/DATA_CONTRACT.md §8). O NLU só produz uma [ParsedQuery]; TODA resposta factual é montada
 * pelo AnswerBuilder a partir dos dados do pacote ou de cálculo local.
 */
enum class Intent {
    ELEMENTO,
    COMPOSTO,
    PROPRIEDADE,
    MASSA_MOLAR,
    BALANCEAR,
    ESTEQUIOMETRIA,
    CONCENTRACAO,
    PH,
    GAS_IDEAL,
    CONVERSAO_UNIDADE,
    NOMENCLATURA,
    DESENHAR,
    COMPARAR,
    TABELA_PERIODICA,
    SEGURANCA,
    CONCEITO,
    /** 17/10/2026 (docs/CALCULADORAS_2026-10-17.md §1): calculadoras de NOX, entalpia, equilíbrio (Kc/Kp) e tipo de ligação. */
    NOX,
    ENTALPIA,
    EQUILIBRIO,
    LIGACAO,
    RECUSA_PERIGO,
    SOBRE_DADOS,
    FONTES,
    AJUDA,
    DESCONHECIDA
}

/** Quantidade lida da pergunta: valor, unidade (símbolo) e o trecho original ("25 °C"). */
data class Quantidade(val valor: Double, val unidade: String, val texto: String = "")

/** EQUILIBRIO: concentração no equilíbrio escrita entre colchetes ("[N2] = 0,5 mol/L"), como `concentracoes` do site (campo só do cliente). */
data class Concentracao(val especie: String, val valor: Double, val unidade: String? = null)

/** Interpretação estruturada de uma pergunta (entidades do contrato §8 e campos auxiliares; mesmos nomes do site). */
data class ParsedQuery(
    val intent: Intent,
    val textoOriginal: String = "",
    /** Símbolo do elemento (ex.: "Fe") e todos os elementos citados, na ordem. */
    val elemento: String? = null,
    val elementos: List<String> = emptyList(),
    /** Composto: CID (como texto) quando está no índice; [compostos] traz todos os citados. */
    val composto: String? = null,
    val compostoNome: String? = null,
    val compostos: List<String> = emptyList(),
    /** Fórmula digitada fora do índice (ex.: "Ca(OH)2") e todas as fórmulas citadas. */
    val formula: String? = null,
    val formulas: List<String> = emptyList(),
    /** Id de `regras.propriedades` (ex.: "pontoFusao") e todos os ids citados. */
    val propriedade: String? = null,
    val propriedades: List<String> = emptyList(),
    val quantidades: List<Quantidade> = emptyList(),
    val equacao: String? = null,
    val nivel: String? = null,
    val unidadeDestino: String? = null,
    /** CONVERSAO_UNIDADE com vários destinos ("para atm, kPa e torr"): todos, na ordem (o primeiro é [unidadeDestino]); vazio com um só. */
    val unidadesDestino: List<String> = emptyList(),
    /** Assunto de CONCEITO. */
    val conceito: String? = null,
    // ---- tabela periódica ----
    val grupo: Int? = null,
    val periodo: Int? = null,
    val bloco: String? = null,
    val categoria: String? = null,
    val estado: String? = null,
    /** Extremo pedido: (propriedade, "max" ou "min"). */
    val extremo: Pair<String, String>? = null,
    val tendencia: Boolean = false,
    /** COMPARAR: ordem pedida de uma propriedade numérica ("crescente" ou "decrescente"), como `ordem` do site. */
    val ordem: String? = null,
    // ---- outros ----
    val mistura: Boolean = false,
    /** Ka, Kb, pKa e pKb citados na pergunta. */
    val constantes: Map<String, Double> = emptyMap(),
    val alvoPropriedade: String? = null,
    /** A entidade veio da pergunta anterior ("e o ponto de ebulição?"). */
    val herdado: Boolean = false,
    /** EQUILIBRIO: concentrações entre colchetes, na ordem (campo só do cliente, docs/CALCULADORAS_2026-10-17.md §1). */
    val concentracoes: List<Concentracao> = emptyList(),
    /**
     * Campo só do cliente: NOX → carga escrita separada da fórmula ("Cr2O7 2-" → -2); desde 18/10/2026 também a carga do íon de UM elemento
     * citado ("Fe2+", "Cl⁻", "íon ferro 2+" → +2/-1, docs/CALCULADORAS_2026-10-17.md §7). null quando não há.
     */
    val cargaFormula: Int? = null,
    /** Número de massa escrito na pergunta ("Fe-56", "⁵⁶Fe", "carbono-14"), do [elemento]; campo só do cliente (18/10/2026, §7). */
    val numeroMassa: Int? = null
)

enum class OrigemResposta(@param:StringRes val rotulo: Int) {
    LOCAL(R.string.origem_local),
    AVISO(R.string.origem_aviso),
    /** A IA na nuvem só INTERPRETOU a pergunta; a resposta foi montada no aparelho com os dados do pacote. */
    NUVEM(R.string.origem_nuvem)
}

/** Calculadoras do app, para os atalhos "Abrir calculadora". */
enum class TipoCalculadora(@param:StringRes val rotulo: Int) {
    MASSA_MOLAR(R.string.calculadora_massa_molar),
    BALANCEAMENTO(R.string.calculadora_balanceamento),
    ESTEQUIOMETRIA(R.string.calculadora_estequiometria),
    CONCENTRACAO(R.string.calculadora_concentracao),
    PH(R.string.calculadora_ph),
    GAS_IDEAL(R.string.calculadora_gas_ideal),
    UNIDADES(R.string.calculadora_unidades),
    /** 17/10/2026 (docs/CALCULADORAS_2026-10-17.md §2): entalpia (formação e Hess), configuração eletrônica, NOX, Kc/Kp e tipo de ligação. */
    ENTALPIA(R.string.calculadora_entalpia),
    ELETRONICA(R.string.calculadora_eletronica),
    NOX(R.string.calculadora_nox),
    EQUILIBRIO(R.string.calculadora_equilibrio),
    LIGACAO(R.string.calculadora_ligacao)
}

sealed interface Bloco {
    data class Paragrafo(val texto: String) : Bloco
    data class Campo(val rotulo: String, val valor: String) : Bloco
    data class Lista(val itens: List<String>) : Bloco
    data class Passos(val titulo: String, val passos: List<String>) : Bloco
    /** Equação ou fórmula em destaque (já em Unicode). */
    data class Destaque(val texto: String) : Bloco
    data class Estrutura(val smiles: String, val descricao: String) : Bloco
    data class Aviso(val texto: String) : Bloco
    data class GhsBloco(val ghs: Ghs, val textosH: Map<String, String>) : Bloco
}

sealed interface Acao {
    val rotulo: String
    data class AbrirElemento(val z: Int, override val rotulo: String) : Acao
    data class AbrirComposto(val cid: Long, override val rotulo: String) : Acao
    data class AbrirCalculadora(val tipo: TipoCalculadora, override val rotulo: String, val preenchimento: Map<String, String> = emptyMap()) : Acao
    data class AbrirTabela(override val rotulo: String) : Acao
    data class AbrirSobreDados(override val rotulo: String) : Acao
    data class AbrirSeguranca(override val rotulo: String) : Acao
    data class AbrirUrl(val url: String, override val rotulo: String) : Acao
}

/** Resposta pronta para exibir: texto estruturado, fontes e atalhos. Nenhum número aqui vem de modelo de linguagem. */
data class Resposta(
    val intent: Intent,
    val titulo: String,
    val blocos: List<Bloco>,
    val fontes: List<Fonte> = emptyList(),
    val origem: OrigemResposta = OrigemResposta.LOCAL,
    val acoes: List<Acao> = emptyList(),
    /** Perguntas que o app sabe responder (no fluxo de "não entendi" e nas respostas parciais). */
    val sugestoes: List<String> = emptyList(),
    val recusa: Boolean = false,
    /** false = o app não entendeu ou não tem o dado. */
    val entendida: Boolean = true,
    /** Origem NUVEM: o modelo que interpretou a pergunta (campo `model` da API), para a linha de origem. */
    val modelo: String? = null
) {
    /** Texto simples (copiar, acessibilidade e testes): título, blocos e fontes, com os rótulos no idioma de [t]. */
    fun texto(t: Textos): String = buildString {
        append(titulo)
        for (b in blocos) {
            append('\n')
            when (b) {
                is Bloco.Paragrafo -> append(b.texto)
                is Bloco.Campo -> append(b.rotulo).append(": ").append(b.valor)
                is Bloco.Lista -> append(b.itens.joinToString("\n") { "• $it" })
                is Bloco.Passos -> append(b.titulo).append('\n').append(b.passos.joinToString("\n") { "• $it" })
                is Bloco.Destaque -> append(b.texto)
                is Bloco.Estrutura -> append(t(R.string.texto_estrutura_2d, b.descricao))
                is Bloco.Aviso -> append(b.texto)
                is Bloco.GhsBloco -> {
                    append(t(R.string.texto_ghs, b.ghs.pictogramas.joinToString(", ")))
                    b.ghs.palavraSinal?.let { append(" – ").append(t.palavraSinal(it)) }
                    if (b.ghs.frasesH.isNotEmpty()) append('\n').append(b.ghs.frasesH.joinToString("; ") { c -> c + (b.textosH[c]?.let { h -> " ($h)" } ?: "") })
                }
            }
        }
        if (fontes.isNotEmpty()) append('\n').append(t(R.string.texto_fonte, fontes.joinToString("; ") { it.rotulo() }))
    }
}
