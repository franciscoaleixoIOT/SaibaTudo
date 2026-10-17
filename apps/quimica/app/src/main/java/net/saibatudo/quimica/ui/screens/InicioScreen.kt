package net.saibatudo.quimica.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.runtime.remember
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.data.repository.EstadoDados
import net.saibatudo.quimica.ui.components.AvisoBox
import net.saibatudo.quimica.ui.components.Cartao
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.components.PainelNuvem
import net.saibatudo.quimica.ui.components.RespostaView
import net.saibatudo.quimica.ui.viewmodel.EnvioPergunta
import net.saibatudo.quimica.ui.viewmodel.HistoricoPerguntas
import net.saibatudo.quimica.ui.viewmodel.Tela
import net.saibatudo.quimica.ui.viewmodel.UiState

/** Início: campo de pergunta, resposta, atalhos e perguntas sugeridas (todas respondíveis pelos dados). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InicioScreen(
    estado: UiState,
    onPerguntar: (String) -> Unit,
    onLimpar: () -> Unit,
    onAcao: (Acao) -> Unit,
    onAbrir: (Tela) -> Unit,
    onAba: (Tela) -> Unit,
    onAbrirUrl: (String) -> Unit,
    onLimparHistorico: () -> Unit,
    modifier: Modifier = Modifier,
    onPerguntarNuvem: () -> Unit = {},
    onEnviarMelhoria: () -> Unit = {}
) {
    val t = LocalTextos.current
    val teclado = LocalSoftwareKeyboardController.current
    var texto by rememberSaveable { mutableStateOf("") }
    val pronto = estado.dados is EstadoDados.Pronto
    // histórico guardado (mais antiga primeiro) + posição das setas ▲▼; volta ao "modo livre" a cada pergunta nova
    val itensHistorico = estado.prefs.historicoPerguntas
    var historico by remember(itensHistorico) { mutableStateOf(HistoricoPerguntas(itensHistorico)) }
    val podeEnviar = pronto && !estado.pensando && texto.isNotBlank()
    // a pergunta vai para o histórico e o campo volta em branco (docs/PADRAO_ASSISTENTE.md §1)
    val perguntar: (String) -> Unit = { q -> if (pronto && !estado.pensando && q.isNotBlank()) { texto = ""; teclado?.hide(); onPerguntar(q) } }
    val enviar = { if (podeEnviar) perguntar(texto) }

    LazyColumn(modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(t(R.string.app_name), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
                Text(
                    t(R.string.ui_inicio_subtitulo),
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                historico.ultima?.let { ultima ->
                    UltimaPergunta(
                        ultima, podeSubir = historico.podeSubir, podeDescer = historico.podeDescer,
                        onSubir = { historico.subir(texto)?.let { (h, q) -> historico = h; texto = q } },
                        onDescer = { historico.descer()?.let { (h, q) -> historico = h; texto = q } }
                    )
                }
                OutlinedTextField(
                    value = texto,
                    onValueChange = { novo ->
                        val (limpo, enter) = HistoricoPerguntas.editar(texto, novo)
                        texto = limpo
                        if (enter) enviar()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(t(R.string.ui_inicio_campo_rotulo)) },
                    placeholder = { Text(t(R.string.ui_inicio_campo_dica)) },
                    trailingIcon = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (texto.isNotEmpty()) {
                                IconButton(onClick = { texto = "" }, modifier = Modifier.size(36.dp)) {
                                    Icon(Icons.Filled.Clear, contentDescription = t(R.string.ui_inicio_limpar_texto), modifier = Modifier.size(18.dp))
                                }
                            }
                            if (estado.pensando) {
                                val analisando = t(R.string.ui_inicio_analisando)
                                CircularProgressIndicator(
                                    Modifier.padding(horizontal = 10.dp).size(22.dp).semantics { contentDescription = analisando; liveRegion = LiveRegionMode.Polite },
                                    strokeWidth = 2.5.dp
                                )
                            } else {
                                IconButton(onClick = enviar, enabled = podeEnviar) {
                                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = t(R.string.ui_inicio_enviar))
                                }
                            }
                        }
                    },
                    singleLine = false, minLines = 1, maxLines = 3,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { enviar() })
                )
            }
        }
        when (val d = estado.dados) {
            EstadoDados.Carregando -> item { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CircularProgressIndicator(Modifier.padding(4.dp)); Text(t(R.string.ui_inicio_carregando)) } }
            is EstadoDados.Erro -> item {
                AvisoBox(d.mensagem?.let { t(R.string.ui_inicio_erro_pacote, it) } ?: t(R.string.ui_inicio_erro_pacote_sem_detalhe))
            }
            is EstadoDados.Pronto -> Unit
        }
        if (estado.pensando) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        estado.resposta?.let { r ->
            item(key = "resposta-" + r.pergunta) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(t(R.string.ui_inicio_voce_perguntou, r.pergunta), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    RespostaView(
                        r.resposta, onAcao = onAcao, onSugestao = perguntar, onAbrirUrl = onAbrirUrl,
                        pergunta = r.pergunta, versaoDados = (estado.dados as? EstadoDados.Pronto)?.pacote?.manifest?.version,
                        dataDados = (estado.dados as? EstadoDados.Pronto)?.pacote?.manifest?.generatedAt?.let { t.data(it) }
                    )
                    if (estado.nuvemDisponivel) {
                        PainelNuvem(r.resposta, estado.nuvem, onPerguntar = onPerguntarNuvem, onSugestao = perguntar)
                    }
                    if (estado.melhoriaDisponivel) PainelMelhoria(estado.envioPergunta, onEnviarMelhoria)
                    TextButton(onClick = { onLimpar(); texto = ""; historico = HistoricoPerguntas(itensHistorico) }) { Text(t(R.string.ui_inicio_nova_pergunta)) }
                }
            }
        }
        if (estado.resposta == null) {
            item {
                Text(t(R.string.ui_inicio_atalhos), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Atalho(t(R.string.ui_inicio_atalho_tabela), Icons.Filled.GridView, Modifier.weight(1f)) { onAba(Tela.Tabela) }
                        Atalho(t(R.string.ui_inicio_atalho_buscar), Icons.Filled.Search, Modifier.weight(1f)) { onAba(Tela.Busca) }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Atalho(t(R.string.ui_inicio_atalho_calculadoras), Icons.Filled.Calculate, Modifier.weight(1f)) { onAba(Tela.Calculadoras) }
                        Atalho(t(R.string.ui_inicio_atalho_seguranca), Icons.Filled.Security, Modifier.weight(1f)) { onAbrir(Tela.Seguranca) }
                    }
                }
            }
            if (estado.sugestoes.isNotEmpty()) {
                item { Text(t(R.string.ui_inicio_experimente), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() }) }
                item {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        estado.sugestoes.forEach { s -> SuggestionChip(onClick = { perguntar(s) }, enabled = pronto && !estado.pensando, label = { Text(s) }) }
                    }
                }
            }
            val historico = estado.prefs.historicoPerguntas.reversed().take(6)
            if (historico.isNotEmpty()) {
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(t(R.string.ui_inicio_recentes), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
                        TextButton(onClick = onLimparHistorico) { Text(t(R.string.ui_inicio_limpar)) }
                    }
                }
                items(historico, key = { "h-$it" }) { h ->
                    Text(
                        h, Modifier.fillMaxWidth().clickable(enabled = pronto && !estado.pensando) { perguntar(h) }.padding(vertical = 10.dp),
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            item {
                AvisoBox(t(R.string.ui_inicio_privacidade))
            }
        }
    }
}

@Composable
private fun Atalho(rotulo: String, icone: ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick, modifier = modifier, shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Row(Modifier.padding(14.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(icone, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
            Text(rotulo, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** Cartão "Última pergunta" acima do campo, com as setas ▲▼ que percorrem o histórico (molde: SearchBarAi do app de Eleições). */
@Composable
private fun UltimaPergunta(ultima: String, podeSubir: Boolean, podeDescer: Boolean, onSubir: () -> Unit, onDescer: () -> Unit) {
    val t = LocalTextos.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(start = 12.dp, top = 2.dp, bottom = 2.dp, end = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f).padding(vertical = 4.dp)) {
            Text(t(R.string.ui_inicio_ultima_pergunta), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(ultima, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
        }
        IconButton(onClick = onSubir, enabled = podeSubir) {
            Icon(Icons.Filled.KeyboardArrowUp, contentDescription = t(R.string.ui_inicio_pergunta_anterior))
        }
        IconButton(onClick = onDescer, enabled = podeDescer) {
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = t(R.string.ui_inicio_pergunta_seguinte))
        }
    }
}

/** "Ajudar a melhorar o app" numa resposta não entendida: botão "Enviar esta pergunta" ou o estado do envio (nada sai sem o toque ou a opção). */
@Composable
private fun PainelMelhoria(envio: EnvioPergunta, onEnviar: () -> Unit) {
    val t = LocalTextos.current
    when (envio) {
        EnvioPergunta.INDISPONIVEL -> Unit
        EnvioPergunta.DISPONIVEL -> Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            androidx.compose.material3.OutlinedButton(onClick = onEnviar) { Text(t(R.string.ui_melhoria_enviar)) }
            Text(t(R.string.ui_melhoria_nota), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        else -> Text(
            t(
                when (envio) {
                    EnvioPergunta.ENVIANDO -> R.string.ui_melhoria_enviando
                    EnvioPergunta.ENVIADA -> R.string.ui_melhoria_enviada
                    EnvioPergunta.GUARDADA -> R.string.ui_melhoria_guardada
                    else -> R.string.ui_melhoria_recusada
                }
            ),
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
        )
    }
}
