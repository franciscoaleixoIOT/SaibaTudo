package net.saibatudo.quimica.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.R
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.data.repository.Pacote
import net.saibatudo.quimica.domain.ClassesCompostos
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.domain.Propriedades
import net.saibatudo.quimica.domain.calc.Unidades
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.components.AvisoBox
import net.saibatudo.quimica.ui.components.Cartao
import net.saibatudo.quimica.ui.components.FontesView
import net.saibatudo.quimica.ui.components.FormulaTexto
import net.saibatudo.quimica.ui.components.GhsView
import net.saibatudo.quimica.ui.components.LinhaCampo
import net.saibatudo.quimica.ui.components.MoleculaView
import net.saibatudo.quimica.ui.components.TituloSecao

/** Ficha do composto: fórmula, estrutura 2D, propriedades, GHS harmonizado (do dado), ficha ICSC (link) e fontes. */
@Composable
fun CompostoScreen(
    cid: Long,
    pacote: Pacote?,
    nivel: Nivel,
    carregar: suspend (Long) -> Composto?,
    onAbrirUrl: (String) -> Unit,
    onAbrirSeguranca: () -> Unit,
    modifier: Modifier = Modifier
) {
    val t = LocalTextos.current
    val composto by produceState<Composto?>(null, cid) { value = runCatching { carregar(cid) }.getOrNull() }
    if (pacote == null) {
        Text(t(R.string.ui_tabela_carregando), modifier.padding(16.dp))
        return
    }
    val c = composto
    if (c == null) {
        Column(modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (pacote.indice.entrada(cid) == null) Text(t(R.string.ui_composto_nao_encontrado), style = MaterialTheme.typography.bodyLarge)
            else CircularProgressIndicator()
        }
        return
    }
    val un = Unidades.de(pacote.regras)
    val tabela = Propriedades.tabela(pacote.regras, t)
    val linhas = Propriedades.fichaComposto(t, c, tabela, un, nivel)
    val nome = t.nomeRotulado(Nomes.composto(c, t.idioma))
    // frases H no idioma do app; os textos do registro do composto são em português (só valem em pt-BR; nos outros, completam o que faltar)
    val textosH = LinkedHashMap<String, String>().apply {
        putAll(pacote.frasesH(t.idioma))
        val doComposto = c.ghs?.textosH.orEmpty()
        if (t.idioma == Idiomas.PADRAO) putAll(doComposto) else doComposto.forEach { (k, v) -> putIfAbsent(k, v) }
    }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(nome, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            c.nomePopular?.takeIf { t.idioma == Idiomas.PADRAO && !it.equals(c.nome, true) }?.let { Text(t(R.string.ui_composto_tambem_conhecido, it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            c.formula?.let { FormulaTexto(it, estilo = MaterialTheme.typography.headlineMedium) }
        }
        // o aviso é sobre o nome em português: só aparece em pt-BR (como no site)
        if (c.nomePtPendente && t.idioma == Idiomas.PADRAO) AvisoBox(t(R.string.ui_composto_nome_pt_pendente))

        c.smiles?.let { smiles ->
            Cartao {
                TituloSecao(t(R.string.ui_composto_estrutura_2d))
                MoleculaView(smiles, c.formula?.let { t(R.string.ui_composto_molecula_descricao, nome, it) } ?: nome)
                Text(t(R.string.ui_composto_estrutura_nota), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Cartao {
            TituloSecao(t(R.string.ui_elemento_propriedades))
            if (linhas.isEmpty()) Text(t(R.string.ui_composto_sem_propriedades), style = MaterialTheme.typography.bodyMedium)
            linhas.forEach { LinhaCampo(it.rotulo, it.valor) }
            // a massa exata já vem na ficha quando a tabela a nomeia; senão entra aqui (compara com o rótulo que a ficha usou)
            val rotuloMassaExata = tabela.firstOrNull { it.id == "massaExata" }?.rotulo?.replaceFirstChar { it.uppercase() }
            c.massaExata?.takeIf { nivel == Nivel.SUPERIOR && linhas.none { l -> l.rotulo == rotuloMassaExata } }?.let { LinhaCampo(t(R.string.ui_composto_massa_exata), "${t.num(it, 5)} u") }
            if (c.classes.isNotEmpty()) LinhaCampo(t(R.string.ui_composto_classes), c.classes.joinToString(", ") { ClassesCompostos.nome(it, t) })
        }

        Cartao {
            TituloSecao(t(R.string.ui_composto_seguranca))
            val g = c.ghs
            if (g != null && (g.pictogramas.isNotEmpty() || g.frasesH.isNotEmpty() || g.palavraSinal != null)) {
                GhsView(g, textosH)
            } else {
                Text(
                    t(R.string.ui_composto_sem_ghs),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            c.icscBuscaUrl?.let { url ->
                Button(onClick = { onAbrirUrl(url) }, modifier = Modifier.fillMaxWidth()) { Text(t(R.string.ui_composto_icsc)) }
                Text(t(R.string.ui_composto_icsc_nota), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            AssistChip(onClick = onAbrirSeguranca, label = { Text(t(R.string.ui_composto_entender_ghs)) })
        }

        c.definicaoChebi?.let { d ->
            Cartao {
                TituloSecao(t(R.string.ui_composto_definicao_chebi))
                Text(d.texto, style = MaterialTheme.typography.bodyMedium)
                Text(
                    if (d.id != null) t(R.string.ui_composto_chebi_atribuicao_id, d.id, d.licenca) else t(R.string.ui_composto_chebi_atribuicao, d.licenca),
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                d.url?.let { u -> androidx.compose.material3.TextButton(onClick = { onAbrirUrl(u) }) { Text(t(R.string.ui_composto_ver_chebi)) } }
            }
        }

        Cartao {
            TituloSecao(t(R.string.ui_composto_identificadores))
            c.cas?.let { LinhaCampo(t(R.string.rot_numero_cas), it) }
            LinhaCampo(t(R.string.prop_cid), c.cid.toString())
            c.nomeIupac?.let { LinhaCampo(t(R.string.rot_nome_iupac), it) }
            c.inchiKey?.let { LinhaCampo("InChIKey", it) }
            c.smiles?.let { s ->
                SelectionContainer { LinhaCampo("SMILES", s) }
            }
        }

        Cartao { FontesView(c.fontes.ifEmpty { pacote.fontesExibicao.take(2) }, onAbrirUrl) }
    }
}
