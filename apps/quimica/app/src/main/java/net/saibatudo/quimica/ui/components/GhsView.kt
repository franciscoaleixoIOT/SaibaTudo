package net.saibatudo.quimica.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Ghs
import net.saibatudo.quimica.domain.GhsFonte
import net.saibatudo.quimica.domain.GhsPictogramas
import net.saibatudo.quimica.domain.GhsTextos
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Textos
import net.saibatudo.quimica.ui.LocalTextos

/** Pictogramas GHS: vetores em res/drawable e textos (nome, desenho, descrição) em strings.xml, no idioma do app. */
object GhsUi {
    /** Legenda curta do pictograma ("Explosivo"); o próprio código se ele não é um dos nove. */
    fun nome(codigo: String, t: Textos): String = GhsPictogramas.nomeOuNull(codigo)?.let { t(it) } ?: codigo

    fun recurso(codigo: String): Int? = when (codigo.uppercase()) {
        "GHS01" -> R.drawable.ic_ghs01
        "GHS02" -> R.drawable.ic_ghs02
        "GHS03" -> R.drawable.ic_ghs03
        "GHS04" -> R.drawable.ic_ghs04
        "GHS05" -> R.drawable.ic_ghs05
        "GHS06" -> R.drawable.ic_ghs06
        "GHS07" -> R.drawable.ic_ghs07
        "GHS08" -> R.drawable.ic_ghs08
        "GHS09" -> R.drawable.ic_ghs09
        else -> null
    }

    /** Texto alternativo (acessibilidade) do pictograma: "Pictograma GHS01: Explosivo (desenho: bomba explodindo)". */
    fun descricao(codigo: String, t: Textos): String {
        val c = codigo.uppercase()
        return t(R.string.ghs_pictograma_desc, c, nome(c, t), GhsPictogramas.nomeOuNull(c)?.let { t(GhsPictogramas.desenho(c)) }.orEmpty())
    }
}

/** Um pictograma GHS (vetor simplificado) com texto alternativo e legenda opcional. */
@Composable
fun PictogramaGhs(codigo: String, tamanho: Dp = 72.dp, legenda: Boolean = true) {
    val recurso = GhsUi.recurso(codigo) ?: return
    val t = LocalTextos.current
    Column(Modifier.width(tamanho + 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Image(painterResource(recurso), contentDescription = GhsUi.descricao(codigo, t), modifier = Modifier.size(tamanho))
        if (legenda) {
            Text(
                GhsUi.nome(codigo, t), style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.semantics { contentDescription = "" }
            )
        }
    }
}

/** Classificação GHS de um composto: pictogramas, palavra de sinal e frases H (os textos vêm no idioma do app; em pt-BR, GhsTextos completa). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GhsView(ghs: Ghs, textosH: Map<String, String>, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (ghs.pictogramas.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ghs.pictogramas.forEach { PictogramaGhs(it) }
            }
        }
        ghs.palavraSinal?.let { dado ->
            val sinal = t.palavraSinal(dado)
            Row(Modifier.semantics(mergeDescendants = true) { contentDescription = t(R.string.ghs_palavra_sinal_desc, sinal) }) {
                Text(t(R.string.ghs_palavra_sinal_rotulo) + " ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(sinal, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = if (sinal == t(R.string.ghs_sinal_perigo)) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
            }
        }
        if (ghs.frasesH.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                ghs.frasesH.forEach { codigo ->
                    val texto = textosH[codigo] ?: if (t.idioma == Idiomas.PADRAO) GhsTextos.fraseH(codigo) else null
                    Text(
                        if (texto != null) "$codigo: $texto" else codigo, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
        GhsFonte.linhaAvulsa(ghs.fonte)?.let { Text(t(R.string.ghs_classificacao, it), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}
