package net.saibatudo.quimica.ui

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import kotlinx.coroutines.launch
import net.saibatudo.quimica.SaibaTudoApp
import net.saibatudo.quimica.ui.screens.MainAppScreen
import net.saibatudo.quimica.ui.theme.SaibaTudoTheme
import net.saibatudo.quimica.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private var vmRef: MainViewModel? = null

    /** Android 12 ou anterior: aplica o idioma escolhido no app ao contexto da tela (no 13+ o sistema faz isso). */
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(IdiomaApp.contexto(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as SaibaTudoApp).container

        setContent {
            val vm: MainViewModel = viewModel(
                factory = viewModelFactory {
                    initializer {
                        MainViewModel(
                            dados = container.dados, prefs = container.preferencias, atualizacoes = container.atualizacoes,
                            fonteDeTextos = container.recursos, idiomaInicial = IdiomaApp.atual(this@MainActivity)
                        )
                    }
                }
            )
            vmRef = vm
            // a Activity é recriada quando o idioma muda (no app ou, no Android 13+, nas configurações do sistema): o ViewModel sobrevive e se ajusta
            LaunchedEffect(Unit) { vm.sincronizarIdioma(IdiomaApp.atual(this@MainActivity)) }
            val estado by vm.estado.collectAsState()
            SaibaTudoTheme(tema = estado.prefs.tema, escalaFonte = estado.prefs.tamanhoFonte.fator) {
                MainAppScreen(vm)
            }
        }

        // Ao voltar para o app, confere se há dados novos (respeita o intervalo do manifesto e a economia de dados)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.RESUMED) { vmRef?.verificarAtualizacaoAoRetomar() }
        }
    }
}
