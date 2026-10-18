package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.domain.Texto

/*
 * Respostas de 18/10/2026 (docs/CALCULADORAS_2026-10-17.md §7, camada de respostas): partículas do átomo ou do íon (PROPRIEDADE `particulas`, com os
 * campos só do cliente `cargaFormula` e `numeroMassa`), a linha do íon/isótopo na ficha do ELEMENTO e o CONCEITO "constante de equilibrio" (Kc/Kp sem
 * equação) com a ação que abre a calculadora de Kc e Kp. Números só do pacote (Z, massa atômica) e da pergunta (carga, A); o número de massa
 * estimado pela massa atômica sai ROTULADO como aproximação, nunca como fato.
 */

/** Carga como sobrescrito: +2 → "²⁺", −1 → "⁻". */
internal fun cargaSobrescrita(carga: Int): String {
    val abs = kotlin.math.abs(carga)
    return Texto.sobrescrito((if (abs == 1) "" else abs.toString()) + if (carga > 0) "+" else "-")
}

/** Espécie com sobrescritos: "Fe²⁺", "Cl⁻", "¹⁴C", "⁵⁶Fe²⁺". */
internal fun especieTexto(simbolo: String, carga: Int?, numeroMassa: Int?): String =
    (numeroMassa?.let { Texto.sobrescrito(it.toString()) } ?: "") + simbolo + (carga?.takeIf { it != 0 }?.let { cargaSobrescrita(it) } ?: "")

/** Carga legível ("2+", "1−"), para "cátion (carga 2+)". */
private fun cargaLegivel(carga: Int) = "${kotlin.math.abs(carga)}${if (carga > 0) "+" else "−"}"

/** Conta dos elétrons do íon: "26 − 2 = 24" (cátion) ou "17 + 1 = 18" (ânion). */
internal fun contaEletrons(z: Int, carga: Int): String =
    if (carga >= 0) "$z − $carga = ${z - carga}" else "$z + ${-carga} = ${z - carga}"

/** Número de massa da pergunta, se plausível para o elemento (A ≥ Z). */
private fun numeroMassaValido(e: Elemento, a: Int?): Int? = a?.takeIf { it >= e.z }

/**
 * Blocos das partículas de [e] com a [carga] e o [numeroMassa] da pergunta: prótons = Z, elétrons = Z − carga, nêutrons = A − Z (A da pergunta,
 * exato; sem ele, a massa atômica arredondada, rotulada como aproximação). [ok] = false se a carga não é possível (elétrons < 0).
 */
internal class Particulas(val blocos: List<Bloco>, val ok: Boolean, val especie: String)

internal fun AnswerBuilder.blocosParticulas(e: Elemento, carga: Int?, numeroMassa: Int?): Particulas {
    val z = e.z
    val q = carga ?: 0
    val a = numeroMassaValido(e, numeroMassa)
    val especie = especieTexto(e.simbolo, q, a)
    val blocos = mutableListOf<Bloco>()
    val eletrons = z - q
    if (eletrons < 0) return Particulas(listOf(Bloco.Aviso(t(R.string.resp_part_carga_invalida, especie, nomeDe(e)))), false, especie)
    if (q > 0) blocos += Bloco.Paragrafo(t(R.string.resp_part_cation, especie, cargaLegivel(q), t.minusNoMeio(nomeDe(e))))
    if (q < 0) blocos += Bloco.Paragrafo(t(R.string.resp_part_anion, especie, cargaLegivel(q), t.minusNoMeio(nomeDe(e))))
    blocos += Bloco.Campo(t(R.string.resp_part_protons), t(R.string.resp_part_protons_valor, z))
    blocos += Bloco.Campo(t(R.string.resp_part_eletrons), if (q == 0) t(R.string.resp_part_eletrons_neutro, z) else t(R.string.resp_part_eletrons_ion, eletrons, contaEletrons(z, q)))
    if (a != null) {
        blocos += Bloco.Campo(t(R.string.resp_part_numero_massa), t(R.string.resp_part_a_da_pergunta, a, especieTexto(e.simbolo, null, a)))
        blocos += Bloco.Campo(t(R.string.resp_part_neutrons), t(R.string.resp_part_neutrons_exato, a - z, "$a − $z = ${a - z}"))
    } else {
        val m = e.massaAtomica?.takeIf { it.isFinite() && it > 0 }
        if (m != null) {
            val aprox = Math.round(m).toInt()
            blocos += Bloco.Campo(t(R.string.resp_part_numero_massa), t(R.string.resp_part_a_aprox, aprox))
            blocos += Bloco.Campo(t(R.string.resp_part_neutrons), t(R.string.resp_part_neutrons_aprox, aprox - z, "$aprox − $z = ${aprox - z}"))
            // 55,845 → "55,85" (meio para cima, como se escreve à mão; o binário de 55,845 arredondaria para baixo)
            val m2 = java.math.BigDecimal(m.toString()).setScale(2, java.math.RoundingMode.HALF_UP).toDouble()
            blocos += Bloco.Aviso(t(R.string.resp_part_aviso_aprox, t.fixo(m2, 2), aprox, e.simbolo))
        } else {
            blocos += Bloco.Aviso(t(R.string.resp_part_sem_massa, t.minusNoMeio(nomeDe(e))))
        }
    }
    return Particulas(blocos, true, especie)
}

/** Linhas extras da ficha do ELEMENTO quando a pergunta cita um íon ("o que é Fe2+") ou um isótopo ("o que é C-14"). */
internal fun AnswerBuilder.linhasIonIsotopo(e: Elemento, carga: Int?, numeroMassa: Int?): List<Bloco> = buildList {
    val q = carga?.takeIf { it != 0 }
    if (q != null && e.z - q >= 0) {
        val ion = especieTexto(e.simbolo, q, null)
        add(Bloco.Campo(t(if (q > 0) R.string.resp_elemento_cation else R.string.resp_elemento_anion, ion), t.plural(R.plurals.resp_elemento_ion_eletrons, e.z - q, e.z - q, contaEletrons(e.z, q))))
    }
    val a = numeroMassaValido(e, numeroMassa)
    if (a != null) {
        add(Bloco.Campo(t(R.string.resp_elemento_isotopo, especieTexto(e.simbolo, null, a)), t.plural(R.plurals.resp_elemento_isotopo_neutrons, a - e.z, a - e.z, "$a − ${e.z} = ${a - e.z}")))
    }
}

// ---- CONCEITO "constante de equilibrio" (Kc/Kp sem equação) ------------------------------------------------------------------------

/**
 * "Como calcular o Kc", "o que é Kp", "constante de equilíbrio" (sem equação; `conceito` = [net.saibatudo.quimica.ai.nlu.LocalNlu.CONCEITO_CONSTANTE_EQUILIBRIO]):
 * o trecho licenciado do pacote se houver um sobre o tema; senão o parágrafo por regra (lei da ação das massas). Sempre as duas relações, o pedido da
 * equação e a ação "Abrir a calculadora de Kc e Kp".
 */
internal suspend fun AnswerBuilder.conceitoConstanteEquilibrio(q: ParsedQuery): Resposta {
    // o trecho licenciado só vale se é do tema, no idioma da resposta (sem o aviso "trecho em…") e legível (sem restos de fórmula LaTeX/MathML)
    val licenciado = buscarConceito(q).takeIf { r ->
        r.entendida && Texto.nlu(r.titulo).let { s -> "equilib" in s || "gleichgewicht" in s } &&
            r.blocos.none { it is Bloco.Aviso } && r.blocos.filterIsInstance<Bloco.Paragrafo>().none { "\\displaystyle" in it.texto || "\n\n" in it.texto }
    }
    val regra = Fonte(t(R.string.fonte_acao_das_massas))
    val blocos = mutableListOf<Bloco>()
    if (licenciado != null) blocos += licenciado.blocos else blocos += Bloco.Paragrafo(t(R.string.resp_kc_conceito_texto))
    blocos += Bloco.Destaque("Kc = [C]^c·[D]^d / ([A]^a·[B]^b)")
    blocos += Bloco.Destaque("Kp = Kc·(RT)^Δn")
    blocos += Bloco.Paragrafo(t(R.string.resp_kc_conceito_pedir))
    return Resposta(
        Intent.CONCEITO, licenciado?.titulo ?: t(R.string.resp_kc_conceito_titulo), blocos,
        fontes = (licenciado?.fontes.orEmpty() + regra).distinctBy { "${it.nome}|${it.url}" },
        acoes = listOf(acaoCalculadora(TipoCalculadora.EQUILIBRIO)),
        sugestoes = listOf(t(R.string.sug_kc_amonia))
    )
}
