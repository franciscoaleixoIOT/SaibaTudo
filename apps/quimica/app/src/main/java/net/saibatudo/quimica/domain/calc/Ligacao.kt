package net.saibatudo.quimica.domain.calc

import kotlin.math.abs
import kotlin.math.roundToLong

/** Elemento para a regra da ligação: símbolo, categoria do pacote (id) e eletronegatividade de Pauling. */
data class ElementoLigacao(val simbolo: String, val categoria: String?, val eletronegatividade: Double?)

/**
 * Ligação entre dois elementos: [tipo] ('metalica', 'ionica', 'covalentePolar', 'covalenteApolar', 'nenhuma') e ΔEN (arredondada a 0,01);
 * ou [erro] ('semCategoria', 'semEletronegatividade') com os símbolos que [faltam].
 */
data class LigacaoPar(
    val ok: Boolean,
    val a: String = "",
    val b: String = "",
    val tipo: String? = null,
    val deltaEN: Double? = null,
    val enA: Double? = null,
    val enB: Double? = null,
    val classeA: String? = null,
    val classeB: String? = null,
    val erro: String? = null,
    val faltam: List<String> = emptyList()
)

/** Ligações de uma fórmula ou de dois elementos; [erro] = 'formula', 'semEntrada' ou 'semElemento'. */
data class ResultadoLigacao(
    val ok: Boolean,
    val ligacoes: List<LigacaoPar> = emptyList(),
    val estimado: Boolean = false,
    val formula: String? = null,
    val erro: String? = null,
    val erroFormula: CalculoInvalido? = null,
    val faltam: List<String> = emptyList()
)

/**
 * Tipo de ligação pela diferença de eletronegatividade de Pauling do pacote (docs/CALCULADORAS_2026-10-17.md §2.5), espelho de
 * web/src/quimica/js/calc/ligacao.js: metal + metal → metálica; metal + não metal com ΔEN ≥ 1,7 → iônica; 0,4 ≤ ΔEN < 1,7 → covalente polar;
 * ΔEN < 0,4 → covalente apolar (limites por convenção didática). Semimetais contam como não metal; gás nobre → não forma ligação. Em fórmulas
 * com 3+ elementos os pares são ESTIMADOS (cada metal e cada outro não metal com o não metal mais eletronegativo). Funções PURAS.
 */
object Ligacao {

    const val LIMITE_IONICA = 1.7
    const val LIMITE_POLAR = 0.4

    /** 'metal', 'naoMetal' (inclui semimetais e halogênios) ou 'gasNobre'; null se o pacote não tem a categoria. */
    fun classeParaLigacao(categoria: String?): String? = when {
        categoria.isNullOrEmpty() -> null
        categoria == "gas_nobre" -> "gasNobre"
        categoria in Nox.CATEGORIAS_METAL -> "metal"
        else -> "naoMetal"
    }

    private fun arred(x: Double) = (x * 100).roundToLong() / 100.0

    fun tipoDeLigacao(a: ElementoLigacao, b: ElementoLigacao): LigacaoPar {
        val classeA = classeParaLigacao(a.categoria)
        val classeB = classeParaLigacao(b.categoria)
        val faltamCat = listOf(a to classeA, b to classeB).filter { it.second == null }.map { it.first.simbolo }.distinct()
        if (faltamCat.isNotEmpty()) return LigacaoPar(ok = false, erro = "semCategoria", faltam = faltamCat)
        val enA = a.eletronegatividade?.takeIf { it.isFinite() }
        val enB = b.eletronegatividade?.takeIf { it.isFinite() }
        val base = LigacaoPar(ok = true, a = a.simbolo, b = b.simbolo, enA = enA, enB = enB, classeA = classeA, classeB = classeB)
        val delta = if (enA != null && enB != null) arred(abs(enA - enB)) else null
        if (classeA == "gasNobre" || classeB == "gasNobre") return base.copy(tipo = "nenhuma", deltaEN = delta)
        if (classeA == "metal" && classeB == "metal") return base.copy(tipo = "metalica", deltaEN = delta)
        val faltamEN = listOf(a to enA, b to enB).filter { it.second == null }.map { it.first.simbolo }.distinct()
        if (faltamEN.isNotEmpty()) return LigacaoPar(ok = false, erro = "semEletronegatividade", faltam = faltamEN)
        val d = delta!!
        val umMetal = classeA == "metal" || classeB == "metal"
        val tipo = if (umMetal && d >= LIMITE_IONICA) "ionica" else if (d >= LIMITE_POLAR) "covalentePolar" else "covalenteApolar"
        return base.copy(tipo = tipo, deltaEN = d)
    }

    /** Pares ligados (estimados) de uma fórmula: (pares, estimado). */
    fun paresDaFormula(simbolos: Collection<String>, elemento: (String) -> ElementoLigacao?): Pair<List<Pair<String, String>>, Boolean> {
        val lista = Nox.ordemHill(simbolos)
        if (lista.size == 1) return listOf(lista[0] to lista[0]) to false
        if (lista.size == 2) return listOf(lista[0] to lista[1]) to false
        fun cls(s: String) = classeParaLigacao(elemento(s)?.categoria)
        fun en(s: String) = elemento(s)?.eletronegatividade ?: Double.NEGATIVE_INFINITY
        val metais = lista.filter { cls(it) == "metal" }
        val naoMetais = lista.filter { cls(it) == "naoMetal" }
        val pares = mutableListOf<Pair<String, String>>()
        val ancora = naoMetais.sortedByDescending { en(it) }.firstOrNull()
        if (ancora != null) {
            for (m in metais) pares += m to ancora
            for (x in naoMetais) if (x != ancora) pares += x to ancora
        }
        if (ancora == null && metais.size >= 2) for (i in 1 until metais.size) pares += metais[0] to metais[i]
        return pares to true
    }

    /** Ligações de uma fórmula ("NaCl", "NaOH") ou de dois elementos ([simbolos], só os dois primeiros). */
    fun ligacoesDe(formula: String?, simbolos: List<String>?, elemento: (String) -> ElementoLigacao?, simbolosValidos: Set<String>? = null): ResultadoLigacao {
        val lista: List<String>
        var texto: String? = null
        if (!formula.isNullOrEmpty()) {
            val f = try {
                FormulaQuimica.analisar(formula.trim(), simbolosValidos)
            } catch (e: CalculoInvalido) {
                return ResultadoLigacao(ok = false, erro = "formula", erroFormula = e)
            }
            lista = f.contagem.keys.toList()
            texto = f.texto
        } else if (!simbolos.isNullOrEmpty()) {
            lista = simbolos.take(2)
        } else return ResultadoLigacao(ok = false, erro = "semEntrada")
        val faltam = lista.filter { elemento(it) == null }
        if (faltam.isNotEmpty()) return ResultadoLigacao(ok = false, erro = "semElemento", faltam = faltam)
        val (pares, estimado) = if (!formula.isNullOrEmpty()) paresDaFormula(lista, elemento) else listOf(lista[0] to (lista.getOrNull(1) ?: lista[0])) to false
        val ligacoes = pares.map { (x, y) -> tipoDeLigacao(elemento(x)!!, elemento(y)!!) }
        return ResultadoLigacao(ok = true, ligacoes = ligacoes, estimado = estimado, formula = texto)
    }
}
