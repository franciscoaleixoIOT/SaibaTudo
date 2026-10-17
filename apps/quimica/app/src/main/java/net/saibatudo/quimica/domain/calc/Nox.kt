package net.saibatudo.quimica.domain.calc

import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Elemento

/**
 * Dados de cada elemento que as calculadoras novas usam (grupo, categoria do pacote e eletronegatividade de Pauling), por símbolo.
 * Espelho de `dadosElementosDoContexto` (web/src/quimica/js/calc/nox.js). Categoria desconhecida = null.
 */
class DadosElementos(
    val grupo: (String) -> Int?,
    val categoria: (String) -> String?,
    val eletronegatividade: (String) -> Double?
) {
    companion object {
        fun de(porSimbolo: Map<String, Elemento>): DadosElementos = DadosElementos(
            grupo = { porSimbolo[it]?.grupo },
            categoria = { s -> porSimbolo[s]?.categoria?.takeIf { it != CategoriaElemento.DESCONHECIDA }?.id },
            eletronegatividade = { s -> porSimbolo[s]?.eletronegatividade?.takeIf { it.isFinite() } }
        )
    }
}

/** NOX de um elemento numa fórmula: átomos, valor exato, código da regra (o texto vem de strings.xml) e se é NOX médio (fração). */
data class ItemNox(val simbolo: String, val atomos: Int, val nox: Racional, val regra: String) {
    val texto: String get() = Nox.textoNox(nox)
    val medio: Boolean get() = nox.den != java.math.BigInteger.ONE
}

/** Resultado do NOX: [ok] com os itens (ordem de Hill) ou [erro] ('formula', 'hidrato', 'indeterminado', 'inconsistente', 'semDados'). */
data class ResultadoNox(
    val ok: Boolean,
    val formula: String = "",
    val corpo: String = "",
    val carga: Int = 0,
    val itens: List<ItemNox> = emptyList(),
    val soma: Racional = Racional.ZERO,
    val erro: String? = null,
    /** Erro de leitura da fórmula (código 'formula'). */
    val erroFormula: CalculoInvalido? = null,
    val faltam: List<String> = emptyList()
)

/**
 * Número de oxidação pelas regras dos livros didáticos (docs/CALCULADORAS_2026-10-17.md §2.3), na mesma ordem de web/src/quimica/js/calc/nox.js:
 * substância simples 0; íon monoatômico = carga ÷ átomos; F −1; grupo 1 +1; grupo 2 +2; Al +3; H +1 (−1 no hidreto metálico); O −2 (com todos os
 * outros já fixos o O sai do balanço: peróxido, superóxido; com F, OF2 dá +2); Cl/Br/I −1 quando é o mais eletronegativo; o último elemento sem
 * regra sai do balanço. Com dois ou mais sem regra, o mais eletronegativo recebe o NOX negativo usual do grupo. Função PURA (sem texto).
 */
object Nox {

    /** Metais pela categoria do pacote (semimetais e gases nobres não contam). */
    val CATEGORIAS_METAL = setOf("metal_alcalino", "metal_alcalino_terroso", "metal_transicao", "metal_pos_transicao", "lantanideo", "actinideo")
    private val NEGATIVO_DO_GRUPO = mapOf(17 to -1, 16 to -2, 15 to -3, 14 to -4)
    private val HALOGENIOS_REGRA = setOf("Cl", "Br", "I")

    /** "+6", "−2", "0", "−8/3". */
    fun textoNox(f: Racional): String {
        if (f.ehZero) return "0"
        val abs = if (f.sinal < 0) -f else f
        return (if (f.sinal > 0) "+" else "−") + abs.toString()
    }

    /** Notação de Hill dos símbolos (C, H, depois alfabética; sem carbono, tudo alfabético). */
    fun ordemHill(simbolos: Collection<String>): List<String> {
        val l = simbolos.distinct()
        return if ("C" in l) listOf("C") + (if ("H" in l) listOf("H") else emptyList()) + l.filter { it != "C" && it != "H" }.sorted() else l.sorted()
    }

    fun calcular(formula: String, dados: DadosElementos, carga: Int? = null, simbolosValidos: Set<String>? = null): ResultadoNox {
        val f = try {
            FormulaQuimica.analisar(formula.trim(), simbolosValidos)
        } catch (e: CalculoInvalido) {
            return ResultadoNox(ok = false, erro = "formula", erroFormula = e)
        }
        if (f.hidrato) return ResultadoNox(ok = false, erro = "hidrato")
        val q = carga ?: f.carga
        val corpo = FormulaQuimica.separarCarga(f.texto).first
        val simb = ordemHill(f.contagem.keys)
        fun at(s: String) = f.contagem.getValue(s)
        fun ehMetal(s: String) = dados.categoria(s) in CATEGORIAS_METAL
        val nox = LinkedHashMap<String, Pair<Racional, String>>()
        fun fixar(s: String, valor: Racional, regra: String) { if (s !in nox) nox[s] = valor to regra }
        fun fixar(s: String, valor: Int, regra: String) = fixar(s, Racional.de(valor.toLong()), regra)
        fun semRegra() = simb.filter { it !in nox }
        fun somaFixos() = nox.entries.fold(Racional.ZERO) { acc, (s, x) -> acc + x.first * Racional.de(at(s).toLong()) }
        fun balanco(s: String) = fixar(s, (Racional.de(q.toLong()) - somaFixos()) / Racional.de(at(s).toLong()), "balanco")

        if (simb.size == 1) {
            val s = simb[0]
            fixar(s, Racional.de(q.toLong(), at(s).toLong()), if (q == 0) "substanciaSimples" else "ionMonoatomico")
        } else {
            if ("F" in simb) fixar("F", -1, "fluor")
            for (s in simb) {
                if (s == "H") continue
                when {
                    dados.grupo(s) == 1 -> fixar(s, 1, "grupo1")
                    dados.grupo(s) == 2 -> fixar(s, 2, "grupo2")
                    s == "Al" -> fixar(s, 3, "aluminio")
                }
            }
            if ("H" in simb) {
                val outros = simb.filter { it != "H" }
                val hidreto = outros.isNotEmpty() && outros.any { ehMetal(it) } &&
                    outros.all { ehMetal(it) || (dados.categoria(it) == "semimetal" && dados.grupo(it) in setOf(13, 14)) }
                fixar("H", if (hidreto) -1 else 1, if (hidreto) "hidretoMetalico" else "hidrogenio")
            }
            if ("O" in simb && "F" !in simb) {
                // com todos os outros já fixos o O sai do balanço (peróxido, superóxido); senão vale −2
                val outrosSemRegra = simb.filter { it != "O" && it !in nox }
                if (outrosSemRegra.isNotEmpty()) fixar("O", -2, "oxigenio")
                else {
                    balanco("O")
                    val v = nox.getValue("O").first
                    val regra = when (v) {
                        Racional.de(-1) -> "peroxido"
                        Racional.de(-1, 2) -> "superoxido"
                        Racional.de(-2) -> "oxigenio"
                        else -> "balanco"
                    }
                    nox["O"] = v to regra
                }
            }
            val presentesEN = simb.mapNotNull { s -> dados.eletronegatividade(s)?.let { s to it } }
            val maisEN = if (presentesEN.size == simb.size) presentesEN.sortedByDescending { it.second }.first().first else null
            for (s in simb) if (s in HALOGENIOS_REGRA && s == maisEN) fixar(s, -1, "halogenio")
            var livres = semRegra()
            if (livres.size >= 2) {
                val comEN = livres.map { it to dados.eletronegatividade(it) }
                if (comEN.any { it.second == null }) return ResultadoNox(ok = false, erro = "semDados", faltam = comEN.filter { it.second == null }.map { it.first })
                val alvo = comEN.sortedByDescending { it.second!! }.first().first
                NEGATIVO_DO_GRUPO[dados.grupo(alvo)]?.let { fixar(alvo, it, "eletronegatividade") }
                livres = semRegra()
            }
            if (livres.size >= 2) return ResultadoNox(ok = false, erro = "indeterminado", faltam = livres)
            if (livres.size == 1) balanco(livres[0])
        }
        val soma = somaFixos()
        if ((soma - Racional.de(q.toLong())).sinal != 0) return ResultadoNox(ok = false, erro = "inconsistente", soma = soma, carga = q)
        val itens = simb.map { s -> val x = nox.getValue(s); ItemNox(s, at(s), x.first, x.second) }
        return ResultadoNox(ok = true, formula = f.texto, corpo = corpo, carga = q, itens = itens, soma = soma)
    }
}
