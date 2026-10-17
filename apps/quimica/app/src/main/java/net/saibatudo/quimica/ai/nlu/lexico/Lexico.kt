package net.saibatudo.quimica.ai.nlu.lexico

import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import java.util.concurrent.ConcurrentHashMap

/**
 * Léxico COMPILADO do interpretador num idioma: intenções, pistas, unidades por extenso, categorias, estados, extremos, sinônimos de
 * propriedade, listas de palavras e as regras de segurança. A fonte é contracts/lexico/<idioma>.json, gerada em Kotlin por
 * tools/gerar_lexico_kt.py (LexicoPtBr.kt, LexicoEn.kt…); aqui as regexes viram [Regex] uma vez por idioma. Mesma semântica de
 * web/src/quimica/js/nlu/lex/index.js (`compilar`): sem flags, exceto `constantes`, `paraUnidade` e `quantosUnidade` (sem diferenciar
 * maiúsculas, porque se aplicam ao texto original); as listas de segurança viram `\b(?:a|b|…)\b`.
 */
class Lexico private constructor(bruto: Map<String, Any?>) {

    /** Regras de segurança do idioma (bloco `seguranca` do léxico). */
    class Seguranca internal constructor(s: Map<String, Any?>) {
        val acao: Regex = alternativas(s, "acao")
        val contextoSeguro: Regex = alternativas(s, "contextoSeguro")
        val tirarFazerSeguro: Regex = Regex(texto(s, "tirarFazerSeguro"))
        val alvoExplosivos: Regex = alternativas(s, "alvoExplosivos")
        val fazerBomba: Regex = Regex(texto(s, "fazerBomba"))
        val alvoArmas: Regex = alternativas(s, "alvoArmas")
        val alvoDrogas: Regex = alternativas(s, "alvoDrogas")
        val precursoresNomes: Regex = alternativas(s, "precursoresNomes")
        val precursoresAcao: Regex = Regex(texto(s, "precursoresAcao"))
        val alvoDano: Regex = alternativas(s, "alvoDano")
        val alvoAutolesao: Regex = alternativas(s, "alvoAutolesao")
        val perigososCaseiros: Regex = alternativas(s, "perigososCaseiros")
        val casa: Regex = alternativas(s, "casa")
        /** Categoria (EXPLOSIVOS, ARMAS_QUIMICAS…) → alvos "colados" (só letras, sem repetições). */
        val coladaAlvos: Map<String, List<String>> = mapa(s, "coladaAlvos").mapValues { (_, v) -> textos(v).map(::colada) }
        val coladaAcoes: List<String> = textos(s["coladaAcoes"]).map(::colada)
    }

    val idioma: String = texto(bruto, "idioma")
    private val intencoes: Map<String, Regex> = mapa(bruto, "intencoes").mapValues { (_, v) -> Regex(v as String) }
    private val pistasRx: Map<String, Regex>
    val limparConceito: List<Regex>
    /** `pka 4,76`, `Ka = 1,8e-5` (texto original, sem diferenciar maiúsculas). */
    val constantes: Regex
    val paraUnidade: Regex
    val quantosUnidade: Regex
    /** Fragmentos de regex usados dentro de outras expressões (quantidades e "4 g de H2"). */
    val quantidadeComplemento: String
    val letrasUnidade: String
    val ligacaoPreposicoes: String
    private val nivelRx: List<Pair<String, Regex>> = mapa(bruto, "nivel").map { (k, v) -> k to Regex(v as String) }
    val unidades: List<Pair<Regex, String>> = pares(bruto["unidades"])
    /** Numerais por extenso antes de uma unidade ("meio mol", "two moles"): (regex como texto, valor), na ordem do contrato. */
    val numerais: List<Pair<String, Double>> = (bruto["numerais"] as? List<*>).orEmpty().map { e ->
        val l = e as List<*>
        (l[0] as String) to (l[1] as Number).toDouble()
    }
    val categorias: List<Pair<Regex, String>> = pares(bruto["categorias"])
    val estados: List<Pair<Regex, String>> = pares(bruto["estados"])
    /** Regex → (id da propriedade, "max"|"min"). */
    val extremos: List<Pair<Regex, Pair<String, String>>> = (bruto["extremos"] as List<*>).map { e ->
        val l = e as List<*>
        Regex(l[0] as String) to ((l[1] as String) to (l[2] as String))
    }
    /** id da propriedade → sinônimos no idioma (sem acentos, minúsculos). */
    val propriedades: Map<String, List<String>> = mapa(bruto, "propriedades").mapValues { (_, v) -> textos(v) }
    val stopwordsBusca: Set<String> = textos(bruto["stopwordsBusca"]).toSet()
    val stopPalavras: Set<String> = textos(bruto["stopPalavras"]).toSet()
    /** Palavras de parada + funcionais: não valem aproximação por erro de digitação nem viram nome de composto. */
    val palavrasFuncionais: Set<String> = stopPalavras + textos(bruto["palavrasFuncionais"])
    val simbolosAmbiguos: Set<String> = textos(bruto["simbolosAmbiguos"]).toSet()
    val naoFormulas: Set<String> = textos(bruto["naoFormulas"]).toSet()
    val seguranca: Seguranca = Seguranca(mapa(bruto, "seguranca"))

    init {
        val p = mapa(bruto, "pistas")
        val especiais = setOf("limparConceito", "quantidadeComplemento", "letrasUnidade", "ligacaoPreposicoes", "constantes", "paraUnidade", "quantosUnidade")
        val ajustes = AJUSTES_PENDENTES[idioma].orEmpty()
        pistasRx = p.filterKeys { it !in especiais }.mapValues { (k, v) ->
            // ajuste só enquanto o contrato tiver EXATAMENTE o texto antigo; qualquer mudança no JSON desliga o ajuste
            val src = v as String
            Regex(ajustes[k]?.takeIf { it.first == src }?.second ?: src)
        }
        limparConceito = textos(p["limparConceito"]).map { Regex(it) }
        constantes = Regex(texto(p, "constantes"), RegexOption.IGNORE_CASE)
        paraUnidade = Regex(texto(p, "paraUnidade"), RegexOption.IGNORE_CASE)
        quantosUnidade = Regex(texto(p, "quantosUnidade"), RegexOption.IGNORE_CASE)
        quantidadeComplemento = texto(p, "quantidadeComplemento")
        letrasUnidade = texto(p, "letrasUnidade")
        ligacaoPreposicoes = texto(p, "ligacaoPreposicoes")
    }

    /** Intenção do léxico (`massaMolar`, `ph`, `conceitoCue`…); falha alto se o contrato não a tiver (o gerador já confere as chaves). */
    fun intencao(nome: String): Regex = intencoes[nome] ?: error("léxico $idioma sem a intenção '$nome'")

    /** Pista do léxico (`querCalcular`, `grupo`, `continuacao`…). */
    fun pista(nome: String): Regex = pistasRx[nome] ?: error("léxico $idioma sem a pista '$nome'")

    /** Nível pedido na pergunta (fundamental, medio, superior) ou null, na ordem do contrato. */
    fun nivelDe(n: String): String? = nivelRx.firstOrNull { it.second.containsMatchIn(n) }?.first

    companion object {
        private val cache = ConcurrentHashMap<String, Lexico>()

        /**
         * Lacunas conhecidas do contrato, corrigidas aqui até o JSON ser atualizado (idioma → pista → (texto atual no contrato, texto
         * corrigido)). pt-BR: `prefixoDefinicao`/`prefixoExplicacaoPalavra` têm "expli"/"defin" seguidos de `\b`, que não casa com "explique"/
         * "defina" (em en/es/fr o contrato já usa `expli\w*`/`defin\w*`); o Android sempre tratou "explique o que é massa molar" como CONCEITO.
         * O ajuste só vale enquanto o contrato tiver exatamente o texto antigo. Remover quando contracts/lexico/pt-BR.json for corrigido.
         */
        private val AJUSTES_PENDENTES: Map<String, Map<String, Pair<String, String>>> = mapOf(
            "pt-BR" to mapOf(
                "prefixoDefinicao" to ("^(?:o que|oque|expli|defin|conceito)\\b" to "^(?:o que|oque|expli\\w*|defin\\w*|conceito)\\b"),
                "prefixoExplicacaoPalavra" to ("^(?:o que|oque|expli|defin|conceito|como funciona|por que)\\b" to "^(?:o que|oque|expli\\w*|defin\\w*|conceito|como funciona|por que)\\b")
            )
        )

        /** Pistas em que o Android aplica hoje um ajuste sobre o contrato (para o teste e o relatório). */
        internal fun ajustesAtivos(idioma: String): List<String> {
            val bruto = LexicosGerados.bruto(idioma) ?: return emptyList()
            @Suppress("UNCHECKED_CAST") val p = bruto["pistas"] as Map<String, Any?>
            return AJUSTES_PENDENTES[idioma].orEmpty().filter { (k, v) -> p[k] == v.first }.keys.toList()
        }

        /** Idiomas com léxico gerado (pt-BR primeiro). */
        val IDIOMAS: List<String> get() = LexicosGerados.IDIOMAS

        /** Léxico compilado do idioma; idioma desconhecido cai no pt-BR. */
        fun de(idioma: String?): Lexico {
            val id = Idiomas.normalizar(idioma)?.takeIf { LexicosGerados.bruto(it) != null } ?: Idiomas.PADRAO
            return cache.getOrPut(id) { compilar(LexicosGerados.bruto(id)!!) }
        }

        /** Compila um léxico bruto (árvore do JSON). Puro: o mesmo JSON dá o mesmo resultado. */
        fun compilar(bruto: Map<String, Any?>): Lexico = Lexico(bruto)

        /** Palavras de parada/funcionais de TODOS os idiomas, normalizadas: um apelido do pacote igual a uma delas ("PARA") nunca vira nome. */
        val PALAVRAS_FUNCIONAIS_TODAS: Set<String> by lazy {
            // direto das listas brutas: não precisa compilar as regexes dos cinco idiomas só para isso
            IDIOMAS.flatMap { i -> LexicosGerados.bruto(i)!!.let { textos(it["stopPalavras"]) + textos(it["palavrasFuncionais"]) } }.map { Texto.nlu(it) }.toSet()
        }

        /** "Colada": só letras, sem repetições consecutivas ("exploosivo" → "explosivo"), como em seguranca.js. */
        fun colada(s: String): String = Regex("(.)\\1+").replace(s.lowercase().replace(Regex("[^a-z]"), ""), "$1")

        @Suppress("UNCHECKED_CAST")
        private fun mapa(m: Map<String, Any?>, k: String): Map<String, Any?> = m[k] as? Map<String, Any?> ?: error("léxico sem '$k'")
        private fun texto(m: Map<String, Any?>, k: String): String = m[k] as? String ?: error("léxico sem o texto '$k'")
        private fun textos(v: Any?): List<String> = (v as? List<*>)?.map { it as String }.orEmpty()
        private fun pares(v: Any?): List<Pair<Regex, String>> = (v as List<*>).map { e -> val l = e as List<*>; Regex(l[0] as String) to (l[1] as String) }
        private fun alternativas(s: Map<String, Any?>, k: String): Regex = Regex("\\b(?:" + textos(s[k]).joinToString("|") + ")\\b")
    }
}
