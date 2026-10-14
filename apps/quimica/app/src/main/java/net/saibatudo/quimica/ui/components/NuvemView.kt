package net.saibatudo.quimica.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.engine.FalhaNuvem
import net.saibatudo.quimica.ai.model.OrigemResposta
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.viewmodel.EstadoNuvem

/** Texto do motivo quando o pedido à IA na nuvem não trouxe resposta nova (separa "o modelo não entendeu" de "o serviço está fora"). */
fun textoFalhaNuvem(motivo: FalhaNuvem, entendida: Boolean): Int = when (motivo) {
    FalhaNuvem.DESLIGADA -> R.string.nuvem_falha_desligada
    FalhaNuvem.LIMITE -> R.string.nuvem_falha_limite
    FalhaNuvem.INDISPONIVEL -> if (entendida) R.string.nuvem_falha_indisponivel_entendida else R.string.nuvem_falha_indisponivel
    FalhaNuvem.NAO_ENTENDEU -> if (entendida) R.string.nuvem_falha_mesma else R.string.nuvem_falha_nao_entendeu
    FalhaNuvem.MESMA_INTERPRETACAO -> R.string.nuvem_falha_mesma
    FalhaNuvem.INVALIDA -> R.string.nuvem_falha_invalida
}

/**
 * Oferta da IA na nuvem embaixo de uma resposta (docs/PADRAO_ASSISTENTE.md §3): botão "Perguntar à IA na nuvem" com a nota de
 * consentimento (o que sai do aparelho), estado "Consultando…" e o motivo da falha. Não aparece em recusa nem em resposta que já veio da nuvem.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PainelNuvem(resposta: Resposta, estado: EstadoNuvem, onPerguntar: () -> Unit, onSugestao: (String) -> Unit) {
    val t = LocalTextos.current
    if (resposta.recusa) return
    val oferecer = resposta.origem != OrigemResposta.NUVEM
    if (!oferecer && !estado.consultando && estado.falha == null) return
    Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        when {
            estado.consultando -> Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text(t(R.string.nuvem_consultando), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            oferecer -> {
                OutlinedButton(onClick = onPerguntar) {
                    Icon(Icons.Filled.Cloud, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(t(R.string.nuvem_botao_perguntar))
                }
                Text(
                    t(if (resposta.entendida) R.string.nuvem_nota_entendida else R.string.nuvem_nota_nao_entendida),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        val falha = estado.falha
        if (falha != null && !estado.consultando) {
            Text(t(textoFalhaNuvem(falha, resposta.entendida)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            if (estado.sugestoes.isNotEmpty()) {
                Text(t(R.string.nuvem_voce_quis_dizer), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    estado.sugestoes.forEach { s -> SuggestionChip(onClick = { onSugestao(s) }, label = { Text(s) }) }
                }
            }
        }
    }
}
