package net.saibatudo.quimica.ui.screens

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.annotation.StringRes
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.core.net.toUri
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.repository.EstadoDados
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.ui.IdiomaApp
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.viewmodel.MainViewModel
import net.saibatudo.quimica.ui.viewmodel.Tela
import net.saibatudo.quimica.ui.viewmodel.aba

private data class ItemAba(val tela: Tela, @param:StringRes val rotulo: Int, val icone: ImageVector)

private val ABAS = listOf(
    ItemAba(Tela.Inicio, R.string.ui_aba_inicio, Icons.Filled.Home),
    ItemAba(Tela.Tabela, R.string.ui_aba_tabela, Icons.Filled.GridView),
    ItemAba(Tela.Busca, R.string.ui_aba_buscar, Icons.Filled.Search),
    ItemAba(Tela.Calculadoras, R.string.ui_aba_calcular, Icons.Filled.Calculate),
    ItemAba(Tela.Mais, R.string.ui_aba_mais, Icons.Filled.MoreHoriz)
)

/** Abre um endereço https no navegador (nunca outro esquema). */
fun abrirUrl(contexto: Context, url: String) {
    if (!url.startsWith("https://")) return
    try {
        contexto.startActivity(Intent(Intent.ACTION_VIEW, url.toUri()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
        // sem navegador instalado: nada a fazer
    }
}

/** Fornece os textos do idioma do app a todas as telas (`LocalTextos`). */
@Composable
fun MainAppScreen(vm: MainViewModel) {
    val estado by vm.estado.collectAsState()
    val textos = remember(estado.idioma) { vm.textos(estado.idioma) }
    CompositionLocalProvider(LocalTextos provides textos) { MainAppConteudo(vm) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainAppConteudo(vm: MainViewModel) {
    val t = LocalTextos.current
    val estado by vm.estado.collectAsState()
    val pilha by vm.pilha.collectAsState()
    val contexto = LocalContext.current
    val tela = pilha.last()
    val pacote = (estado.dados as? EstadoDados.Pronto)?.pacote
    val aberto: (String) -> Unit = { abrirUrl(contexto, it) }

    BackHandler(enabled = pilha.size > 1 || tela != Tela.Inicio) {
        if (!vm.voltar()) vm.irParaAba(Tela.Inicio)
    }

    Scaffold(
        topBar = {
            if (pilha.size > 1) {
                TopAppBar(
                    title = {
                        Text(
                            when (tela) {
                                is Tela.Elemento -> pacote?.porZ?.get(tela.z)?.let { t.nomeRotulado(Nomes.elemento(it, t.idioma)) } ?: t(R.string.ui_titulo_elemento)
                                is Tela.Composto -> vm.nomeDoComposto(tela.cid) ?: pacote?.indice?.entrada(tela.cid)?.nomes?.firstOrNull() ?: t(R.string.ui_titulo_composto)
                                is Tela.Calculadora -> t(tela.tipo.rotulo)
                                Tela.Seguranca -> t(R.string.ui_titulo_seguranca)
                                Tela.Sobre -> t(R.string.ui_titulo_sobre)
                                Tela.Privacidade -> t(R.string.ui_titulo_privacidade)
                                Tela.Configuracoes -> t(R.string.ui_titulo_configuracoes)
                                else -> t(R.string.app_name)
                            }
                        )
                    },
                    navigationIcon = { IconButton(onClick = { vm.voltar() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = t(R.string.ui_voltar)) } }
                )
            }
        },
        bottomBar = {
            NavigationBar {
                ABAS.forEach { item ->
                    NavigationBarItem(
                        selected = tela.aba() == item.tela,
                        onClick = { vm.irParaAba(item.tela) },
                        icon = { Icon(item.icone, contentDescription = null) },
                        label = { Text(t(item.rotulo)) }
                    )
                }
            }
        }
    ) { padding ->
        val m = Modifier.padding(padding)
        when (tela) {
            Tela.Inicio -> InicioScreen(
                estado = estado, onPerguntar = vm::perguntar, onLimpar = vm::limparResposta, onAcao = { vm.executar(it, aberto) }, onAbrir = vm::abrir,
                onAba = vm::irParaAba, onAbrirUrl = aberto, onLimparHistorico = vm::limparHistorico, modifier = m,
                onPerguntarNuvem = vm::perguntarNaNuvem, onEnviarMelhoria = vm::enviarPerguntaParaMelhoria
            )
            Tela.Tabela -> TabelaScreen(pacote, onAbrirElemento = { vm.abrir(Tela.Elemento(it)) }, modifier = m)
            Tela.Busca -> BuscaScreen(
                buscar = vm::buscar, pronto = pacote != null, onAbrirElemento = { vm.abrir(Tela.Elemento(it)) },
                onAbrirComposto = { vm.abrir(Tela.Composto(it)) }, modifier = m
            )
            Tela.Calculadoras -> CalculadorasScreen(onAbrir = { vm.abrir(Tela.Calculadora(it)) }, modifier = m)
            Tela.Mais -> MaisScreen(onAbrir = vm::abrir, modifier = m)
            is Tela.Elemento -> ElementoScreen(tela.z, pacote, estado.prefs.nivel, onAbrirElemento = { vm.abrir(Tela.Elemento(it)) }, onAbrirUrl = aberto, modifier = m)
            is Tela.Composto -> CompostoScreen(
                tela.cid, pacote, estado.prefs.nivel, carregar = vm::composto, onAbrirUrl = aberto, onAbrirSeguranca = { vm.abrir(Tela.Seguranca) }, modifier = m
            )
            is Tela.Calculadora -> CalculadoraTela(tela.tipo, tela.preenchimento, pacote, m)
            Tela.Seguranca -> SegurancaScreen(pacote, onAbrirUrl = aberto, modifier = m)
            Tela.Sobre -> SobreDadosScreen(pacote, estado.prefs, estado.atualizacao, onAtualizar = vm::atualizarAgora, onAbrirUrl = aberto, modifier = m)
            Tela.Privacidade -> PrivacidadeScreen(onAbrirUrl = aberto, onLimparHistorico = vm::limparHistorico, modifier = m)
            Tela.Configuracoes -> ConfiguracoesScreen(
                estado.prefs, onTema = vm::definirTema, onFonte = vm::definirFonte, onNivel = vm::definirNivel, onEconomia = vm::definirEconomia, modifier = m,
                idioma = estado.idioma, onIdioma = { id -> vm.definirIdioma(id); IdiomaApp.definir(contexto, id) },
                onNuvemAutomatica = vm::definirNuvemAutomatica,
                melhoriaDisponivel = estado.melhoriaDisponivel, onMelhoria = vm::definirMelhoria, onApagarDados = vm::apagarDadosDoAparelho
            )
        }
    }
}
