package net.saibatudo.quimica.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.BuildConfig
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.bundle.EstadoAtualizacao
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.data.prefs.TamanhoFonte
import net.saibatudo.quimica.data.prefs.TemaApp
import net.saibatudo.quimica.data.prefs.UserPreferences
import net.saibatudo.quimica.data.repository.Pacote
import net.saibatudo.quimica.domain.GhsPictogramas
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.components.AvisoBox
import net.saibatudo.quimica.ui.components.Cartao
import net.saibatudo.quimica.ui.components.FontesView
import net.saibatudo.quimica.ui.components.LinhaCampo
import net.saibatudo.quimica.ui.components.PictogramaGhs
import net.saibatudo.quimica.ui.components.TituloSecao
import net.saibatudo.quimica.ui.viewmodel.MainViewModel
import net.saibatudo.quimica.ui.viewmodel.Tela

@Composable
private fun Pagina(titulo: String, modifier: Modifier = Modifier, conteudo: @Composable () -> Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(titulo, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
        conteudo()
    }
}

// ---- Mais ----------------------------------------------------------------------------------------------------------------------------

@Composable
fun MaisScreen(onAbrir: (Tela) -> Unit, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    val itens = listOf(
        Triple(t(R.string.ui_seguranca_titulo), t(R.string.ui_mais_seguranca_descricao), Tela.Seguranca),
        Triple(t(R.string.ui_sobre_titulo), t(R.string.ui_mais_sobre_descricao), Tela.Sobre),
        Triple(t(R.string.ui_privacidade_titulo), t(R.string.ui_mais_privacidade_descricao), Tela.Privacidade),
        Triple(t(R.string.ui_config_titulo), t(R.string.ui_mais_config_descricao), Tela.Configuracoes)
    )
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Text(t(R.string.ui_mais_titulo), Modifier.padding(16.dp).semantics { heading() }, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        itens.forEach { (titulo, desc, tela) ->
            Row(
                Modifier.fillMaxWidth().clickable(role = Role.Button) { onAbrir(tela) }.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(Modifier.weight(1f)) {
                    Text(titulo, style = MaterialTheme.typography.titleMedium)
                    Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
        Text(
            t(R.string.ui_mais_versao, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE),
            Modifier.padding(16.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

// ---- Segurança e GHS --------------------------------------------------------------------------------------------------------------------

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SegurancaScreen(pacote: Pacote?, onAbrirUrl: (String) -> Unit, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    val ghsFonte = pacote?.fontesExibicao?.firstOrNull { it.nome.contains("CLP", true) || it.id.equals("clp", true) }
    val icscFonte = pacote?.fontesExibicao?.firstOrNull { it.nome.contains("ICSC", true) && it.url != null }
    Pagina(t(R.string.ui_seguranca_titulo), modifier) {
        Cartao {
            TituloSecao(t(R.string.ui_seguranca_oque_titulo))
            Text(t(R.string.ui_seguranca_oque_p1), style = MaterialTheme.typography.bodyMedium)
            Text(t(R.string.ui_seguranca_oque_p2), style = MaterialTheme.typography.bodyMedium)
        }
        Cartao {
            TituloSecao(t(R.string.ui_seguranca_pictogramas_titulo))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GhsPictogramas.CODIGOS.forEach { PictogramaGhs(it, tamanho = 64.dp) }
            }
            GhsPictogramas.CODIGOS.forEach { cod ->
                LinhaCampo(cod, t(R.string.ui_seguranca_pictograma_linha, t(GhsPictogramas.desenho(cod)), t(GhsPictogramas.descricao(cod))))
            }
        }
        Cartao {
            TituloSecao(t(R.string.ui_seguranca_sinal_titulo))
            LinhaCampo(t(R.string.ui_seguranca_sinal_perigo), t(R.string.ui_seguranca_sinal_perigo_desc))
            LinhaCampo(t(R.string.ui_seguranca_sinal_atencao), t(R.string.ui_seguranca_sinal_atencao_desc))
            LinhaCampo("H2xx", t(R.string.ui_seguranca_h2xx))
            LinhaCampo("H3xx", t(R.string.ui_seguranca_h3xx))
            LinhaCampo("H4xx", t(R.string.ui_seguranca_h4xx))
            Text(
                t(R.string.ui_seguranca_texto_frases, t(R.string.fonte_ghs_nome), t(R.string.fonte_ghs_licenca)),
                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Cartao {
            TituloSecao(t(R.string.ui_seguranca_icsc_titulo))
            Text(t(R.string.ui_seguranca_icsc_texto), style = MaterialTheme.typography.bodyMedium)
            icscFonte?.url?.takeIf { it.startsWith("https://") }?.let { u -> OutlinedButton(onClick = { onAbrirUrl(u) }) { Text(t(R.string.ui_seguranca_icsc_botao)) } }
        }
        Cartao {
            TituloSecao(t(R.string.ui_seguranca_cuidados_titulo))
            listOf(
                R.string.ui_seguranca_cuidado1,
                R.string.ui_seguranca_cuidado2,
                R.string.ui_seguranca_cuidado3,
                R.string.ui_seguranca_cuidado4,
                R.string.ui_seguranca_cuidado5
            ).forEach { Row { Text("•  ", color = MaterialTheme.colorScheme.primary); Text(t(it), style = MaterialTheme.typography.bodyMedium) } }
            AvisoBox(t(R.string.ui_seguranca_emergencias))
        }
        ghsFonte?.let { Cartao { FontesView(listOf(it), onAbrirUrl) } }
    }
}

// ---- Sobre os dados ---------------------------------------------------------------------------------------------------------------------

@Composable
fun SobreDadosScreen(
    pacote: Pacote?, prefs: UserPreferences, atualizacao: EstadoAtualizacao, onAtualizar: () -> Unit, onAbrirUrl: (String) -> Unit, modifier: Modifier = Modifier
) {
    val t = LocalTextos.current
    Pagina(t(R.string.ui_sobre_titulo), modifier) {
        if (pacote == null) {
            Text(t(R.string.ui_sobre_carregando))
            return@Pagina
        }
        val m = pacote.manifest
        val dias = m.pollIntervalMinutes / (24 * 60)
        Cartao {
            TituloSecao(t(R.string.ui_sobre_pacote_titulo))
            LinhaCampo(t(R.string.ui_sobre_versao), m.version.orEmpty())
            LinhaCampo(t(R.string.ui_sobre_gerado_em), t.data(m.generatedAt, comHora = true) ?: m.generatedAt.orEmpty())
            LinhaCampo(t(R.string.ui_sobre_origem), t(pacote.origem.rotulo))
            LinhaCampo(t(R.string.ui_sobre_elementos), pacote.elementos.size.toString())
            LinhaCampo(t(R.string.ui_sobre_compostos), pacote.indice.tamanho.toString())
            LinhaCampo(t(R.string.ui_sobre_arquivos), m.arquivos.size.toString())
            Text(t(R.string.ui_sobre_assinatura), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Cartao {
            TituloSecao(t(R.string.ui_sobre_atualizacao_titulo))
            Text(t.plural(R.plurals.ui_sobre_intervalo_dias, dias, dias), style = MaterialTheme.typography.bodyMedium)
            if (prefs.ultimaVerificacaoDados > 0) LinhaCampo(t(R.string.ui_sobre_ultima_verificacao), t.dataHora(prefs.ultimaVerificacaoDados))
            prefs.ultimaVersaoDados?.let { LinhaCampo(t(R.string.ui_sobre_ultima_versao), it) }
            when (atualizacao) {
                EstadoAtualizacao.Ociosa -> Unit
                EstadoAtualizacao.Verificando -> Text(t(R.string.ui_sobre_verificando))
                is EstadoAtualizacao.Concluida -> Text(MainViewModel.descreverResultado(atualizacao.resultado, t), style = MaterialTheme.typography.bodyMedium)
            }
            Button(onClick = onAtualizar, enabled = atualizacao != EstadoAtualizacao.Verificando) { Text(t(R.string.ui_sobre_atualizar_agora)) }
        }
        Cartao {
            TituloSecao(t(R.string.ui_sobre_fontes_titulo))
            pacote.fontesExibicao.forEach { f ->
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(f.nome, style = MaterialTheme.typography.titleSmall)
                    Text(
                        listOfNotNull(
                            f.licenca?.let { t(R.string.ui_sobre_fonte_licenca, it) },
                            f.uso?.let { t(R.string.ui_sobre_fonte_uso, it) },
                            f.acessadoEm?.let { data -> t(R.string.ui_sobre_fonte_acesso, t.data(data) ?: data) }
                        ).joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    f.url?.takeIf { it.startsWith("https://") }?.let { u -> OutlinedButton(onClick = { onAbrirUrl(u) }) { Text(t(R.string.ui_sobre_abrir_site)) } }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            }
            if (pacote.manifest.licencas.isNotEmpty()) {
                Text(t(R.string.ui_sobre_licencas, pacote.manifest.licencas.joinToString(", ") { it.nome }), style = MaterialTheme.typography.bodySmall)
            }
        }
        Cartao {
            TituloSecao(t(R.string.ui_sobre_app_titulo))
            Text(t(R.string.ui_sobre_app_texto), style = MaterialTheme.typography.bodyMedium)
            OutlinedButton(onClick = { onAbrirUrl(BuildConfig.SOURCE_URL) }) { Text(t(R.string.ui_sobre_codigo_fonte)) }
        }
    }
}

// ---- Privacidade ---------------------------------------------------------------------------------------------------------------------------

@Composable
fun PrivacidadeScreen(onAbrirUrl: (String) -> Unit, onLimparHistorico: () -> Unit, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    Pagina(t(R.string.ui_privacidade_titulo), modifier) {
        Cartao {
            TituloSecao(t(R.string.ui_privacidade_nada_sai_titulo))
            Text(t(R.string.ui_privacidade_nada_sai_texto), style = MaterialTheme.typography.bodyMedium)
        }
        Cartao {
            TituloSecao(t(R.string.ui_privacidade_guardado_titulo))
            listOf(
                R.string.ui_privacidade_guardado_item1,
                R.string.ui_privacidade_guardado_item2,
                R.string.ui_privacidade_guardado_item3
            ).forEach { Row { Text("•  ", color = MaterialTheme.colorScheme.primary); Text(t(it), style = MaterialTheme.typography.bodyMedium) } }
            OutlinedButton(onClick = onLimparHistorico) { Text(t(R.string.ui_privacidade_apagar_historico)) }
        }
        Cartao {
            TituloSecao(t(R.string.ui_privacidade_sai_titulo))
            Text(t(R.string.ui_privacidade_sai_texto), style = MaterialTheme.typography.bodyMedium)
        }
        Cartao {
            TituloSecao(t(R.string.ui_privacidade_nao_tem_titulo))
            Text(t(R.string.ui_privacidade_nao_tem_texto), style = MaterialTheme.typography.bodyMedium)
        }
        Cartao {
            TituloSecao(t(R.string.ui_privacidade_nuvem_titulo))
            Text(t(R.string.ui_privacidade_nuvem_texto), style = MaterialTheme.typography.bodyMedium)
        }
        OutlinedButton(onClick = { onAbrirUrl(BuildConfig.PRIVACY_URL) }) { Text(t(R.string.ui_privacidade_politica_completa)) }
        OutlinedButton(onClick = { onAbrirUrl(BuildConfig.SOURCE_URL + "/issues") }) { Text(t(R.string.ui_privacidade_relatar)) }
    }
}

// ---- Configurações -----------------------------------------------------------------------------------------------------------------------

@Composable
fun ConfiguracoesScreen(
    prefs: UserPreferences, onTema: (TemaApp) -> Unit, onFonte: (TamanhoFonte) -> Unit, onNivel: (Nivel) -> Unit, onEconomia: (Boolean) -> Unit,
    modifier: Modifier = Modifier, idioma: String = Idiomas.PADRAO, onIdioma: (String) -> Unit = {}
) {
    val t = LocalTextos.current
    Pagina(t(R.string.ui_config_titulo), modifier) {
        Cartao {
            TituloSecao(t(R.string.config_idioma_titulo))
            Text(t(R.string.config_idioma_descricao), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Column(Modifier.selectableGroup()) {
                IDIOMAS_DO_SELETOR.forEach { (id, rotulo) -> OpcaoRadio(t(rotulo), null, idioma == id) { onIdioma(id) } }
            }
        }
        Cartao {
            TituloSecao(t(R.string.ui_config_tema_titulo))
            Column(Modifier.selectableGroup()) {
                TemaApp.entries.forEach { tema -> OpcaoRadio(t(tema.rotulo), null, prefs.tema == tema) { onTema(tema) } }
            }
        }
        Cartao {
            TituloSecao(t(R.string.ui_config_fonte_titulo))
            Column(Modifier.selectableGroup()) {
                TamanhoFonte.entries.forEach { f -> OpcaoRadio(t(f.rotulo), null, prefs.tamanhoFonte == f) { onFonte(f) } }
            }
            Text(t(R.string.ui_config_fonte_exemplo, t.fixo(18.015, 3)), style = MaterialTheme.typography.bodyMedium)
        }
        Cartao {
            TituloSecao(t(R.string.ui_config_nivel_titulo))
            Column(Modifier.selectableGroup()) {
                Nivel.entries.forEach { n -> OpcaoRadio(t(n.rotulo), t(n.descricao), prefs.nivel == n) { onNivel(n) } }
            }
        }
        Cartao {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(t(R.string.ui_config_economia_titulo), style = MaterialTheme.typography.titleSmall)
                    Text(t(R.string.ui_config_economia_descricao), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Switch(checked = prefs.economiaDeDados, onCheckedChange = onEconomia)
            }
        }
    }
}

/** Idiomas do seletor, cada um com o nome no próprio idioma (endônimo, igual em todos os catálogos). */
private val IDIOMAS_DO_SELETOR: List<Pair<String, Int>> = listOf(
    "pt-BR" to R.string.idioma_pt_br, "en" to R.string.idioma_en, "es" to R.string.idioma_es, "de" to R.string.idioma_de, "fr" to R.string.idioma_fr
)

@Composable
private fun OpcaoRadio(rotulo: String, descricao: String?, selecionado: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().selectable(selected = selecionado, onClick = onClick, role = Role.RadioButton).padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        RadioButton(selected = selecionado, onClick = null)
        Column {
            Text(rotulo, style = MaterialTheme.typography.bodyLarge)
            descricao?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}
