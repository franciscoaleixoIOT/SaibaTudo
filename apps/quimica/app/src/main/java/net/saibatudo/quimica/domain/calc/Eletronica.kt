package net.saibatudo.quimica.domain.calc

/** Subnível com n (1…7), l (0 = s … 3 = f) e elétrons. */
data class Subnivel(val n: Int, val l: Int, val e: Int) {
    /** "3d". */
    val rotulo: String get() = "$n${Eletronica.LETRAS_SUBNIVEL[l]}"
}

/** Configuração lida: cerne de gás nobre (ou null), subníveis escritos (sem o cerne) e o que foi ignorado ("(prevista)"). */
data class ConfiguracaoLida(val cerne: String?, val subniveis: List<Subnivel>, val ignorados: List<String>)

/** Elétrons de uma camada (K…Q). */
data class Camada(val camada: String, val n: Int, val eletrons: Int)

/**
 * Distribuição eletrônica de um elemento ou íon; [erro] = 'semConfiguracao', 'totalDiferente' (com [total] e [esperado]) ou 'cargaInvalida'.
 * [valenciaTipo]: 'camada', 'ns+(n-1)d' ou 'ns+(n-1)d+(n-2)f'.
 */
data class DistribuicaoEletronica(
    val ok: Boolean,
    val carga: Int = 0,
    val totalEletrons: Int = 0,
    val bloco: String? = null,
    val ignorados: List<String> = emptyList(),
    val configuracaoPacote: String = "",
    val ordemPauling: List<Subnivel> = emptyList(),
    val ordemCamadas: List<Subnivel> = emptyList(),
    val camadas: List<Camada> = emptyList(),
    val camadaValencia: Camada? = null,
    val eletronsValencia: Int = 0,
    val valenciaTipo: String = "camada",
    val subnivelMaisEnergetico: Subnivel? = null,
    val erro: String? = null,
    val total: Int? = null,
    val esperado: Int? = null
)

/**
 * Configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §2.2), espelho de web/src/quimica/js/calc/eletronica.js: a partir da notação do pacote
 * (PubChem, abreviada: "[Ar] 4s2 3d6"), expande o cerne, ordena pela ordem de preenchimento (Madelung / Linus Pauling) e por camadas, soma por
 * camada (K…Q), acha a camada e os elétrons de valência e o subnível mais energético, e confere o total com Z. Íons: o cátion perde da camada de
 * maior n (e maior l nela); o ânion ganha na ordem de preenchimento. Funções PURAS (erros são códigos).
 */
object Eletronica {

    val LETRAS_SUBNIVEL = listOf("s", "p", "d", "f")
    val CAMADAS = listOf("K", "L", "M", "N", "O", "P", "Q")
    fun capacidadeSubnivel(l: Int) = 2 * (2 * l + 1)

    /** Ordem de preenchimento (regra de Madelung): n + l crescente e, no empate, n crescente. */
    val ORDEM_PAULING: List<Pair<Int, Int>> = (1..7).flatMap { n -> (0..minOf(3, n - 1)).map { l -> n to l } }
        .sortedWith(compareBy<Pair<Int, Int>> { it.first + it.second }.thenBy { it.first })

    private fun indicePauling(n: Int, l: Int) = ORDEM_PAULING.indexOf(n to l)

    /** Gases nobres do cerne e o número atômico de cada um. */
    val CERNES = mapOf("He" to 2, "Ne" to 10, "Ar" to 18, "Kr" to 36, "Xe" to 54, "Rn" to 86, "Og" to 118)

    /** Preenchimento ideal (Madelung) de [z] elétrons, na ordem de preenchimento. */
    fun preencherMadelung(z: Int): List<Subnivel> {
        val out = mutableListOf<Subnivel>()
        var resto = z
        for ((n, l) in ORDEM_PAULING) {
            if (resto <= 0) break
            val e = minOf(resto, capacidadeSubnivel(l))
            out += Subnivel(n, l, e)
            resto -= e
        }
        return out
    }

    private val RX_SUBNIVEL = Regex("""^(\d)([spdf])(\d{1,2})$""")
    private val RX_CERNE = Regex("""^\[([A-Z][a-z]?)]$""")
    private val SOBRESCRITOS = mapOf('⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4', '⁵' to '5', '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9')

    /** Lê a notação (abreviada ou completa); null se não houver nenhum subnível válido nem cerne. */
    fun lerConfiguracao(texto: String?): ConfiguracaoLida? {
        val s = (texto ?: "").map { SOBRESCRITOS[it] ?: it }.joinToString("").replace("^", "").trim()
        if (s.isEmpty()) return null
        var cerne: String? = null
        val subniveis = mutableListOf<Subnivel>()
        val ignorados = mutableListOf<String>()
        for (tok in s.split(Regex("""[\s.,;]+""")).filter { it.isNotEmpty() }) {
            val mC = RX_CERNE.matchEntire(tok)
            if (mC != null && CERNES[mC.groupValues[1]] != null && cerne == null && subniveis.isEmpty()) { cerne = mC.groupValues[1]; continue }
            val m = RX_SUBNIVEL.matchEntire(tok)
            if (m != null) {
                val n = m.groupValues[1].toInt()
                val l = LETRAS_SUBNIVEL.indexOf(m.groupValues[2])
                val e = m.groupValues[3].toInt()
                if (l < n && e >= 0 && e <= capacidadeSubnivel(l)) { subniveis += Subnivel(n, l, e); continue }
            }
            ignorados += tok
        }
        if (subniveis.isEmpty() && cerne == null) return null
        return ConfiguracaoLida(cerne, subniveis, ignorados)
    }

    /** Soma subníveis repetidos e tira os vazios (na ordem da primeira aparição). */
    private fun juntar(lista: List<Subnivel>): List<Subnivel> {
        val mapa = LinkedHashMap<Pair<Int, Int>, Int>()
        for (s in lista) mapa[s.n to s.l] = (mapa[s.n to s.l] ?: 0) + s.e
        return mapa.map { (k, e) -> Subnivel(k.first, k.second, e) }.filter { it.e > 0 }
    }

    fun emOrdemPauling(lista: List<Subnivel>) = lista.sortedBy { indicePauling(it.n, it.l) }
    fun emOrdemCamadas(lista: List<Subnivel>) = lista.sortedWith(compareBy<Subnivel> { it.n }.thenBy { it.l })

    /** Configuração completa (cerne expandido), sem repetição. */
    fun expandirCerne(lida: ConfiguracaoLida?): List<Subnivel> {
        if (lida == null) return emptyList()
        val base = lida.cerne?.let { preencherMadelung(CERNES.getValue(it)) }.orEmpty()
        return juntar(base + lida.subniveis)
    }

    /** Aplica a carga de um íon; null se a carga passa do número de elétrons. */
    fun aplicarCarga(subniveis: List<Subnivel>, carga: Int): List<Subnivel>? {
        var lista = juntar(subniveis).toMutableList()
        if (carga > 0) {
            var tirar = carga
            while (tirar > 0 && lista.isNotEmpty()) {
                val alvo = lista.sortedWith(compareByDescending<Subnivel> { it.n }.thenByDescending { it.l }).first()
                val k = minOf(tirar, alvo.e)
                val i = lista.indexOf(alvo)
                lista[i] = alvo.copy(e = alvo.e - k)
                tirar -= k
                lista = lista.filter { it.e > 0 }.toMutableList()
            }
            if (tirar > 0) return null
        } else if (carga < 0) {
            var por = -carga
            for ((n, l) in ORDEM_PAULING) {
                if (por <= 0) break
                val i = lista.indexOfFirst { it.n == n && it.l == l }
                val atual = if (i >= 0) lista[i].e else 0
                val livre = capacidadeSubnivel(l) - atual
                if (livre <= 0) continue
                val k = minOf(livre, por)
                if (i >= 0) lista[i] = lista[i].copy(e = atual + k) else lista += Subnivel(n, l, k)
                por -= k
            }
        }
        return juntar(lista)
    }

    /** "1s2 2s2 2p6"; com [sobrescrito], "1s² 2s² 2p⁶". */
    fun textoSubniveis(lista: List<Subnivel>, sobrescrito: Boolean = false): String {
        val sup = "⁰¹²³⁴⁵⁶⁷⁸⁹"
        return lista.joinToString(" ") { s -> s.rotulo + (if (sobrescrito) s.e.toString().map { sup[it - '0'] }.joinToString("") else s.e.toString()) }
    }

    /** Distribuição eletrônica de um elemento (ou íon). [configuracao] = notação do pacote; [z] = número atômico. */
    fun distribuicao(configuracao: String?, z: Int?, carga: Int = 0, bloco: String? = null): DistribuicaoEletronica {
        val lida = lerConfiguracao(configuracao) ?: return DistribuicaoEletronica(ok = false, erro = "semConfiguracao")
        val neutro = expandirCerne(lida)
        val totalNeutro = neutro.sumOf { it.e }
        // o dado do pacote tem de fechar com Z: se não fechar, não "corrijo" à mão (§2.2)
        if (z != null && totalNeutro != z) return DistribuicaoEletronica(ok = false, erro = "totalDiferente", total = totalNeutro, esperado = z)
        val q = carga
        if ((z != null && q >= z) || q < -8) return DistribuicaoEletronica(ok = false, erro = "cargaInvalida", carga = q)
        val lista = (if (q != 0) aplicarCarga(neutro, q) else neutro) ?: return DistribuicaoEletronica(ok = false, erro = "cargaInvalida", carga = q)
        val ordemPauling = emOrdemPauling(lista)
        val ordemCamadas = emOrdemCamadas(lista)
        val camadas = mutableListOf<Camada>()
        for (s in ordemCamadas) {
            val i = camadas.indexOfFirst { it.n == s.n }
            if (i >= 0) camadas[i] = camadas[i].copy(eletrons = camadas[i].eletrons + s.e) else camadas += Camada(CAMADAS[s.n - 1], s.n, s.e)
        }
        val ultima = camadas.lastOrNull()
        // bloco: o do pacote ou o do último subnível na ordem de preenchimento do átomo neutro
        val blocoFinal = bloco ?: emOrdemPauling(neutro).lastOrNull()?.let { LETRAS_SUBNIVEL[it.l] }
        var eletronsValencia = ultima?.eletrons ?: 0
        var valenciaTipo = "camada"
        if (q == 0 && ultima != null && (blocoFinal == "d" || blocoFinal == "f")) {
            // metais de transição: elétrons de valência convencionais ns + (n−1)d (e (n−2)f no bloco f)
            val nMax = ultima.n
            fun ePor(n: Int, l: Int) = lista.firstOrNull { it.n == n && it.l == l }?.e ?: 0
            eletronsValencia = ePor(nMax, 0) + ePor(nMax - 1, 2) + (if (blocoFinal == "f") ePor(nMax - 2, 3) else 0)
            valenciaTipo = if (blocoFinal == "f") "ns+(n-1)d+(n-2)f" else "ns+(n-1)d"
        }
        return DistribuicaoEletronica(
            ok = true, carga = q, totalEletrons = lista.sumOf { it.e }, bloco = blocoFinal, ignorados = lida.ignorados,
            configuracaoPacote = configuracao.orEmpty().trim(), ordemPauling = ordemPauling, ordemCamadas = ordemCamadas, camadas = camadas,
            camadaValencia = ultima, eletronsValencia = eletronsValencia, valenciaTipo = valenciaTipo, subnivelMaisEnergetico = ordemPauling.lastOrNull()
        )
    }
}
