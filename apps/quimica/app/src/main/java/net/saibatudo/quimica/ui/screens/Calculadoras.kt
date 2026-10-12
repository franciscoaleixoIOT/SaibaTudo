package net.saibatudo.quimica.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.data.model.UnidadeDef
import net.saibatudo.quimica.data.repository.Pacote
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.Textos
import net.saibatudo.quimica.domain.calc.Balanceador
import net.saibatudo.quimica.domain.calc.CalculoInvalido
import net.saibatudo.quimica.domain.calc.CampoQtd
import net.saibatudo.quimica.domain.calc.Estequiometria
import net.saibatudo.quimica.domain.calc.GasIdeal
import net.saibatudo.quimica.domain.calc.MassaMolar
import net.saibatudo.quimica.domain.calc.QuantidadeConhecida
import net.saibatudo.quimica.domain.calc.Qtd
import net.saibatudo.quimica.domain.calc.ResultadoCalculo
import net.saibatudo.quimica.domain.calc.Solucoes
import net.saibatudo.quimica.domain.calc.TipoForte
import net.saibatudo.quimica.domain.calc.Unidades
import net.saibatudo.quimica.domain.calc.VariavelGas
import net.saibatudo.quimica.ui.LocalTextos
import net.saibatudo.quimica.ui.components.AvisoBox
import net.saibatudo.quimica.ui.components.CampoNumero
import net.saibatudo.quimica.ui.components.Cartao
import net.saibatudo.quimica.ui.components.ChipsLinha
import net.saibatudo.quimica.ui.components.DropdownUnidade
import net.saibatudo.quimica.ui.components.FormulaTexto
import net.saibatudo.quimica.ui.components.LinhaCampo
import net.saibatudo.quimica.ui.components.PassosView
import net.saibatudo.quimica.ui.components.TituloSecao

/** Lista das calculadoras (todas rodam no aparelho e mostram os passos). */
@Composable
fun CalculadorasScreen(onAbrir: (TipoCalculadora) -> Unit, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    val itens = listOf(
        TipoCalculadora.MASSA_MOLAR to R.string.ui_calc_desc_massa_molar,
        TipoCalculadora.BALANCEAMENTO to R.string.ui_calc_desc_balanceamento,
        TipoCalculadora.ESTEQUIOMETRIA to R.string.ui_calc_desc_estequiometria,
        TipoCalculadora.CONCENTRACAO to R.string.ui_calc_desc_concentracao,
        TipoCalculadora.PH to R.string.ui_calc_desc_ph,
        TipoCalculadora.GAS_IDEAL to R.string.ui_calc_desc_gas_ideal,
        TipoCalculadora.UNIDADES to R.string.ui_calc_desc_unidades
    )
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(t(R.string.ui_calc_lista_titulo), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
        Text(t(R.string.ui_calc_lista_intro), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        itens.forEach { (tipo, desc) ->
            Card(
                onClick = { onAbrir(tipo) }, modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(t(tipo.rotulo), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(t(desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

// ---- peças comuns -----------------------------------------------------------------------------------------------------------------

/** Resultado de uma calculadora: linhas, passos e notas; ou a mensagem de erro de entrada. */
@Composable
private fun ResultadoCalcView(resultado: Result<ResultadoCalculo>?) {
    val t = LocalTextos.current
    if (resultado == null) return
    resultado.fold(
        onSuccess = { r ->
            Cartao {
                TituloSecao(r.titulo)
                r.linhas.forEach { l ->
                    if (l.destaque) Text("${l.rotulo}: ${l.valor}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    else LinhaCampo(l.rotulo, l.valor)
                }
                if (r.passos.isNotEmpty()) PassosView(t(R.string.ui_calc_passo_a_passo), r.passos)
                r.notas.forEach { AvisoBox(it) }
            }
        },
        onFailure = { e -> AvisoBox(if (e is CalculoInvalido) e.texto(t) else t(R.string.ui_calc_nao_foi_possivel)) }
    )
}

private fun <T> tentar(bloco: () -> T): Result<T> = try {
    Result.success(bloco())
} catch (e: CalculoInvalido) {
    Result.failure(e)
} catch (e: Exception) {
    Result.failure(CalculoInvalido(R.string.ui_calc_confira_valores))
}

/** Número digitado, lido no formato do idioma ativo (vírgula ou ponto); null se não for número. */
private fun numero(t: Textos, txt: String): Double? = Quantidades.lerNumero(txt, t.idioma)

/** Linha "valor + unidade" de uma grandeza. A unidade escolhida é guardada pelo símbolo. */
@Composable
private fun CampoComUnidade(
    rotulo: String, valor: String, onValor: (String) -> Unit, opcoes: List<UnidadeDef>, simbolo: String, onSimbolo: (String) -> Unit,
    dica: String? = null
) {
    val sel = opcoes.firstOrNull { it.simbolo == simbolo } ?: opcoes.first()
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.Top) {
        CampoNumero(valor, onValor, rotulo, Modifier.weight(0.58f), dica = dica)
        DropdownUnidade(opcoes, sel, { onSimbolo(it.simbolo) }, Modifier.weight(0.42f))
    }
}

private fun unidadesDe(un: Unidades, grandeza: String): List<UnidadeDef> = un.daGrandeza(grandeza)

/**
 * Chips de modo (id estável + rótulo no idioma): o estado guarda o id, que não muda com o idioma (nem ao girar a tela ou trocar de
 * idioma com a tela aberta); a tela mostra o rótulo.
 */
@Composable
private fun ChipsModo(modos: List<Pair<String, String>>, atual: String, onModo: (String) -> Unit) {
    ChipsLinha(
        modos.map { it.second }, modos.firstOrNull { it.first == atual }?.second,
        { rotulo -> modos.firstOrNull { it.second == rotulo }?.let { onModo(it.first) } }
    )
}

@Composable
private fun ColunaCalculadora(titulo: String, descricao: String, conteudo: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // o título já está na barra superior (a tela só abre por ela); o texto abaixo é o enunciado
        Text(descricao, modifier = Modifier.semantics { contentDescription = "$titulo. $descricao" }, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        conteudo()
    }
}

/** Despacha para a calculadora escolhida. */
@Composable
fun CalculadoraTela(tipo: TipoCalculadora, preenchimento: Map<String, String>, pacote: Pacote?, modifier: Modifier = Modifier) {
    val t = LocalTextos.current
    if (pacote == null) {
        Text(t(R.string.ui_calc_carregando), modifier.padding(16.dp))
        return
    }
    val un = remember(pacote) { Unidades.de(pacote.regras) }
    Column(modifier.fillMaxSize()) {
        when (tipo) {
            TipoCalculadora.MASSA_MOLAR -> MassaMolarCalc(pacote, preenchimento["formula"].orEmpty())
            TipoCalculadora.BALANCEAMENTO -> BalanceamentoCalc(preenchimento["equacao"].orEmpty())
            TipoCalculadora.ESTEQUIOMETRIA -> EstequiometriaCalc(pacote, un, preenchimento["equacao"].orEmpty())
            TipoCalculadora.CONCENTRACAO -> ConcentracaoCalc(pacote, un, preenchimento["formula"].orEmpty())
            TipoCalculadora.PH -> PhCalc(pacote, un)
            TipoCalculadora.GAS_IDEAL -> GasIdealCalc(pacote, un)
            TipoCalculadora.UNIDADES -> UnidadesCalc(un)
        }
    }
}

// ---- massa molar ------------------------------------------------------------------------------------------------------------------

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MassaMolarCalc(pacote: Pacote, inicial: String) {
    val t = LocalTextos.current
    var formula by rememberSaveable { mutableStateOf(inicial) }
    var massa by rememberSaveable { mutableStateOf("") }
    var mols by rememberSaveable { mutableStateOf("") }
    val resultado = remember(formula, pacote) { if (formula.isBlank()) null else tentar { MassaMolar.calcular(formula, pacote.porSimbolo) } }
    ColunaCalculadora(t(TipoCalculadora.MASSA_MOLAR.rotulo), t(R.string.ui_calc_mm_descricao)) {
        OutlinedTextField(formula, { formula = it.take(80) }, label = { Text(t(R.string.ui_calc_rot_formula)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("(", ")", "·", "+", "-").forEach { s -> AssistChip(onClick = { formula += s }, label = { Text(s) }) }
        }
        resultado?.fold(
            onSuccess = { mm ->
                Cartao {
                    FormulaTexto(mm.formula.texto)
                    Text("${t.fixo(mm.massaMolar, 3)} g/mol", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    mm.linhas.forEach { l ->
                        LinhaCampo("${l.simbolo} (${l.nomeNo(t)})", "${l.quantidade} × ${t.num(l.massaAtomica, 4)} = ${t.num(l.subtotal, 4)}")
                    }
                    if (mm.formula.carga != 0) AvisoBox(t(R.string.ui_calc_mm_carga_nao_altera))
                }
                Cartao {
                    TituloSecao(t(R.string.ui_calc_mm_massa_e_qtd))
                    CampoNumero(massa, { massa = it }, t(R.string.ui_calc_mm_massa_para_mol), Modifier.fillMaxWidth())
                    numero(t, massa)?.let { m -> Text("${t.sig(m, 5)} g ÷ ${t.fixo(mm.massaMolar, 3)} g/mol = ${t.sig(m / mm.massaMolar, 5)} mol", style = MaterialTheme.typography.bodyMedium) }
                    CampoNumero(mols, { mols = it }, t(R.string.ui_calc_mm_mol_para_massa), Modifier.fillMaxWidth())
                    numero(t, mols)?.let { n -> Text("${t.sig(n, 5)} mol × ${t.fixo(mm.massaMolar, 3)} g/mol = ${t.sig(n * mm.massaMolar, 5)} g", style = MaterialTheme.typography.bodyMedium) }
                }
            },
            onFailure = { e -> AvisoBox(if (e is CalculoInvalido) e.texto(t) else t(R.string.ui_calc_formula_invalida)) }
        )
    }
}

// ---- balanceamento ---------------------------------------------------------------------------------------------------------------

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BalanceamentoCalc(inicial: String) {
    val t = LocalTextos.current
    var equacao by rememberSaveable { mutableStateOf(inicial) }
    val resultado = remember(equacao, t.idioma) { if (equacao.isBlank()) null else tentar { Balanceador.balancear(t, equacao).comoResultado(t) } }
    ColunaCalculadora(t(TipoCalculadora.BALANCEAMENTO.rotulo), t(R.string.ui_calc_bal_descricao)) {
        OutlinedTextField(equacao, { equacao = it.take(200) }, label = { Text(t(R.string.calc_bal_linha_equacao)) }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(" -> ", " + ", "(", ")", "^").forEach { s -> AssistChip(onClick = { equacao += s }, label = { Text(s.trim().ifEmpty { s }) }) }
        }
        ResultadoCalcView(resultado)
    }
}

// ---- estequiometria ---------------------------------------------------------------------------------------------------------------

@Composable
private fun EstequiometriaCalc(pacote: Pacote, un: Unidades, inicial: String) {
    val t = LocalTextos.current
    var equacao by rememberSaveable { mutableStateOf(inicial) }
    var rendimento by rememberSaveable { mutableStateOf("") }
    val quantidades = remember { mutableStateMapOf<Int, String>() }
    val unidadesQtd = remember { mutableStateMapOf<Int, String>() }
    val balanceada = remember(equacao, t.idioma) { if (equacao.isBlank()) null else tentar { Balanceador.balancear(t, equacao) } }
    ColunaCalculadora(t(TipoCalculadora.ESTEQUIOMETRIA.rotulo), t(R.string.ui_calc_est_descricao)) {
        OutlinedTextField(equacao, { equacao = it.take(200) }, label = { Text(t(R.string.calc_bal_linha_equacao)) }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
        balanceada?.fold(
            onSuccess = { bal ->
                val eq = bal.balanceada
                Cartao {
                    TituloSecao(t(R.string.calc_bal_titulo))
                    Text(eq.texto(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(t(R.string.ui_calc_est_preencha), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                val opcoes = listOfNotNull(un.porSimbolo("g", "massa"), un.porSimbolo("mol", "quantidade"))
                eq.equacao.todas.forEachIndexed { i, esp ->
                    if (esp.eletron) return@forEachIndexed
                    CampoComUnidade(
                        t(R.string.ui_calc_est_qtd_de, Texto.formulaUnicode(esp.rotulo)), quantidades[i].orEmpty(), { quantidades[i] = it }, opcoes,
                        unidadesQtd[i] ?: "g", { unidadesQtd[i] = it }
                    )
                }
                CampoNumero(rendimento, { rendimento = it }, t(R.string.ui_calc_est_rendimento), Modifier.fillMaxWidth())
                val conhecidas = eq.equacao.todas.indices.mapNotNull { i ->
                    val v = numero(t, quantidades[i].orEmpty()) ?: return@mapNotNull null
                    QuantidadeConhecida(i, v, emMols = (unidadesQtd[i] ?: "g") == "mol")
                }
                if (conhecidas.isNotEmpty()) {
                    val r = tentar { Estequiometria.calcular(t, eq, conhecidas, pacote.porSimbolo).let { it.comoResultado(t, numero(t, rendimento)) } }
                    ResultadoCalcView(r)
                } else {
                    Text(t(R.string.ui_calc_est_aguardando), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Cartao { PassosView(t(R.string.ui_calc_est_como_balanceei), bal.passos) }
            },
            onFailure = { e -> AvisoBox(if (e is CalculoInvalido) e.texto(t) else t(R.string.ui_calc_equacao_invalida)) }
        )
    }
}

// ---- concentração e diluição ---------------------------------------------------------------------------------------------------------

private const val MODO_MOLARIDADE = "molaridade"
private const val MODO_PREPARAR = "preparar"
private const val MODO_DILUICAO = "diluicao"

@Composable
private fun ConcentracaoCalc(pacote: Pacote, un: Unidades, inicial: String) {
    val t = LocalTextos.current
    val modos = listOf(
        MODO_MOLARIDADE to t(R.string.calc_sol_molaridade),
        MODO_PREPARAR to t(R.string.ui_calc_conc_modo_preparar),
        MODO_DILUICAO to t(R.string.calc_dil_titulo)
    )
    var modo by rememberSaveable { mutableStateOf(MODO_MOLARIDADE) }
    var formula by rememberSaveable { mutableStateOf(inicial) }
    var a by rememberSaveable { mutableStateOf("") }   // massa | concentração | C1
    var b by rememberSaveable { mutableStateOf("") }   // volume | volume | V1
    var c by rememberSaveable { mutableStateOf("") }   // - | - | C2
    var d by rememberSaveable { mutableStateOf("") }   // - | - | V2
    var ua by rememberSaveable { mutableStateOf("g") }
    var ub by rememberSaveable { mutableStateOf("mL") }
    var uc by rememberSaveable { mutableStateOf("mol/L") }
    var uc2 by rememberSaveable { mutableStateOf("mol/L") }
    var ud by rememberSaveable { mutableStateOf("mL") }
    val massas = unidadesDe(un, "massa")
    val volumes = unidadesDe(un, "volume")
    val concs = unidadesDe(un, "concentracao")
    fun u(l: List<UnidadeDef>, s: String) = l.firstOrNull { it.simbolo == s } ?: l.first()

    ColunaCalculadora(t(TipoCalculadora.CONCENTRACAO.rotulo), t(R.string.ui_calc_conc_descricao)) {
        ChipsModo(modos, modo) { modo = it; a = ""; b = ""; c = ""; d = "" }
        if (modo != MODO_DILUICAO) {
            OutlinedTextField(formula, { formula = it.take(80) }, label = { Text(t(R.string.ui_calc_conc_substancia)) }, singleLine = true, modifier = Modifier.fillMaxWidth(), placeholder = { Text(t(R.string.ui_calc_conc_ex_nacl)) })
        }
        val resultado: Result<ResultadoCalculo>? = when (modo) {
            MODO_MOLARIDADE -> {
                CampoComUnidade(t(R.string.ui_calc_conc_massa_soluto), a, { a = it }, massas, ua, { ua = it })
                CampoComUnidade(t(R.string.ui_calc_conc_volume_solucao), b, { b = it }, volumes, ub, { ub = it })
                val m = numero(t, a); val v = numero(t, b)
                if (m != null && v != null && formula.isNotBlank()) tentar {
                    val mm = MassaMolar.calcular(formula, pacote.porSimbolo)
                    Solucoes.molaridade(t, Qtd(m, u(massas, ua)), mm.massaMolar, Qtd(v, u(volumes, ub)), un, mm.formula.exibicao())
                } else null
            }
            MODO_PREPARAR -> {
                CampoComUnidade(t(R.string.ui_calc_conc_conc_desejada), a, { a = it }, concs, uc, { uc = it })
                CampoComUnidade(t(R.string.ui_calc_conc_volume_de_solucao), b, { b = it }, volumes, ub, { ub = it })
                val cv = numero(t, a); val v = numero(t, b)
                if (cv != null && v != null && formula.isNotBlank()) tentar {
                    val mm = MassaMolar.calcular(formula, pacote.porSimbolo)
                    Solucoes.massaParaPreparar(t, Qtd(cv, u(concs, uc)), Qtd(v, u(volumes, ub)), mm.massaMolar, un, mm.formula.exibicao())
                } else null
            }
            else -> {
                Text(t(R.string.ui_calc_conc_dil_ajuda), style = MaterialTheme.typography.bodySmall)
                CampoComUnidade(t(R.string.ui_calc_conc_c1), a, { a = it }, concs, uc, { uc = it })
                CampoComUnidade(t(R.string.ui_calc_conc_v1), b, { b = it }, volumes, ub, { ub = it })
                CampoComUnidade(t(R.string.ui_calc_conc_c2), c, { c = it }, concs, uc2, { uc2 = it })
                CampoComUnidade(t(R.string.ui_calc_conc_v2), d, { d = it }, volumes, ud, { ud = it })
                val campos = listOf(a, b, c, d)
                if (campos.count { it.isBlank() } == 1 && campos.filter { it.isNotBlank() }.all { numero(t, it) != null }) tentar {
                    Solucoes.diluicao(
                        t,
                        CampoQtd(numero(t, a), u(concs, uc)), CampoQtd(numero(t, b), u(volumes, ub)),
                        CampoQtd(numero(t, c), u(concs, uc2)), CampoQtd(numero(t, d), u(volumes, ud)), un
                    )
                } else null
            }
        }
        ResultadoCalcView(resultado)
    }
}

// ---- pH ----------------------------------------------------------------------------------------------------------------------------------

private const val PH_ACIDO_FORTE = "acido_forte"
private const val PH_BASE_FORTE = "base_forte"
private const val PH_ACIDO_FRACO = "acido_fraco"
private const val PH_BASE_FRACA = "base_fraca"

@Composable
private fun PhCalc(pacote: Pacote, un: Unidades) {
    val t = LocalTextos.current
    val modos = listOf(
        PH_ACIDO_FORTE to t(R.string.forte_acido),
        PH_BASE_FORTE to t(R.string.forte_base),
        PH_ACIDO_FRACO to t(R.string.ui_calc_ph_modo_acido_fraco),
        PH_BASE_FRACA to t(R.string.ui_calc_ph_modo_base_fraca)
    )
    var modo by rememberSaveable { mutableStateOf(PH_ACIDO_FORTE) }
    var conc by rememberSaveable { mutableStateOf("") }
    var uConc by rememberSaveable { mutableStateOf("mol/L") }
    var k by rememberSaveable { mutableStateOf("") }
    var n by rememberSaveable { mutableStateOf("1") }
    val concs = unidadesDe(un, "concentracao")
    val acido = modo == PH_ACIDO_FORTE || modo == PH_ACIDO_FRACO
    val forte = modo == PH_ACIDO_FORTE || modo == PH_BASE_FORTE
    ColunaCalculadora(t(TipoCalculadora.PH.rotulo), t(R.string.ui_calc_ph_descricao)) {
        ChipsModo(modos, modo) { modo = it }
        CampoComUnidade(t(if (acido) R.string.ui_calc_ph_conc_acido else R.string.ui_calc_ph_conc_base), conc, { conc = it }, concs, uConc, { uConc = it })
        if (forte) {
            Text(t(if (acido) R.string.ui_calc_ph_quantos_h else R.string.ui_calc_ph_quantos_oh), style = MaterialTheme.typography.bodyMedium)
            ChipsLinha(listOf("1", "2", "3"), n, { n = it })
            Text(t(R.string.ui_calc_ph_exemplos), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            CampoNumero(k, { k = it }, if (acido) "Ka" else "Kb", Modifier.fillMaxWidth(), dica = t(R.string.ui_calc_ph_dica_k))
        }
        val c = numero(t, conc)
        val kv = numero(t, k)
        val pKw = Solucoes.pKwDoPacote(pacote.constantes)
        val resultado = if (c == null) null else tentar {
            val q = Qtd(c, concs.firstOrNull { it.simbolo == uConc } ?: concs.first())
            val tipo = if (acido) TipoForte.ACIDO else TipoForte.BASE
            if (forte) Solucoes.phForte(t, tipo, q, n.toIntOrNull() ?: 1, un, pKw.first, pKw.second)
            else if (kv == null) throw CalculoInvalido(R.string.ui_calc_ph_informe_constante, if (tipo == TipoForte.ACIDO) "Ka" else "Kb")
            else Solucoes.phFraco(t, tipo, q, kv, if (tipo == TipoForte.ACIDO) "Ka" else "Kb", un, pKw.first, pKw.second)
        }
        ResultadoCalcView(resultado)
    }
}

// ---- gás ideal ----------------------------------------------------------------------------------------------------------------------------

/** "Pressão (P)", "Volume (V)"…: nome da variável no idioma + símbolo. */
private fun rotuloGas(t: Textos, v: VariavelGas): String = "${t(v.nome)} (${v.simbolo})"

@Composable
private fun GasIdealCalc(pacote: Pacote, un: Unidades) {
    val t = LocalTextos.current
    var p by rememberSaveable { mutableStateOf("") }
    var v by rememberSaveable { mutableStateOf("") }
    var n by rememberSaveable { mutableStateOf("") }
    var temp by rememberSaveable { mutableStateOf("") }
    var up by rememberSaveable { mutableStateOf("atm") }
    var uv by rememberSaveable { mutableStateOf("L") }
    var un2 by rememberSaveable { mutableStateOf("mol") }
    var ut by rememberSaveable { mutableStateOf("K") }
    val ps = unidadesDe(un, "pressao"); val vs = unidadesDe(un, "volume"); val ns = unidadesDe(un, "quantidade"); val ts = unidadesDe(un, "temperatura")
    fun u(l: List<UnidadeDef>, s: String) = l.firstOrNull { it.simbolo == s } ?: l.first()
    ColunaCalculadora(t(TipoCalculadora.GAS_IDEAL.rotulo), t(R.string.ui_calc_gas_descricao)) {
        AssistChip(onClick = { n = "1"; un2 = "mol"; temp = "0"; ut = "°C"; p = "1"; up = "atm"; v = "" }, label = { Text(t(R.string.ui_calc_gas_cntp)) })
        CampoComUnidade(rotuloGas(t, VariavelGas.P), p, { p = it }, ps, up, { up = it })
        CampoComUnidade(rotuloGas(t, VariavelGas.V), v, { v = it }, vs, uv, { uv = it })
        CampoComUnidade(rotuloGas(t, VariavelGas.N), n, { n = it }, ns, un2, { un2 = it })
        CampoComUnidade(rotuloGas(t, VariavelGas.T), temp, { temp = it }, ts, ut, { ut = it })
        val campos = listOf(p, v, n, temp)
        val resultado = if (campos.count { it.isBlank() } == 1 && campos.filter { it.isNotBlank() }.all { numero(t, it) != null }) tentar {
            GasIdeal.resolver(
                t,
                CampoQtd(numero(t, p), u(ps, up)), CampoQtd(numero(t, v), u(vs, uv)), CampoQtd(numero(t, n), u(ns, un2)), CampoQtd(numero(t, temp), u(ts, ut)),
                pacote.constante("R"), un
            )
        } else null
        ResultadoCalcView(resultado)
    }
}

// ---- unidades ------------------------------------------------------------------------------------------------------------------------------

@Composable
private fun UnidadesCalc(un: Unidades) {
    val t = LocalTextos.current
    // nome da grandeza no idioma, com a primeira letra maiúscula (rótulo de chip)
    fun rotuloDe(id: String) = t.grandeza(id).replaceFirstChar { it.uppercase() }
    val grandezas = un.grandezas()
    var grandeza by rememberSaveable { mutableStateOf(grandezas.firstOrNull() ?: "") }
    var valor by rememberSaveable { mutableStateOf("") }
    var de by rememberSaveable { mutableStateOf("") }
    var para by rememberSaveable { mutableStateOf("") }
    val lista = un.daGrandeza(grandeza)
    val ud = lista.firstOrNull { it.simbolo == de } ?: lista.firstOrNull()
    val up = lista.firstOrNull { it.simbolo == para } ?: lista.getOrNull(1) ?: lista.firstOrNull()
    ColunaCalculadora(t(TipoCalculadora.UNIDADES.rotulo), t(R.string.ui_calc_un_descricao)) {
        ChipsLinha(grandezas.map { rotuloDe(it) }, rotuloDe(grandeza), { r -> grandeza = grandezas.firstOrNull { rotuloDe(it) == r } ?: r; de = ""; para = "" })
        if (lista.isNotEmpty() && ud != null && up != null) {
            CampoNumero(valor, { valor = it }, t(R.string.ui_calc_un_valor), Modifier.fillMaxWidth())
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                DropdownUnidade(lista, ud, { de = it.simbolo }, Modifier.weight(1f), rotulo = t(R.string.ui_calc_un_de))
                DropdownUnidade(lista, up, { para = it.simbolo }, Modifier.weight(1f), rotulo = t(R.string.ui_calc_un_para))
            }
            val v = numero(t, valor)
            if (v != null) {
                val r = tentar {
                    val (res, passo) = un.converterComPasso(t, v, ud, up)
                    val base = un.base(grandeza)
                    val passos = mutableListOf<String>()
                    if (base != null && (ud.offset != 0.0 || up.offset != 0.0)) {
                        val emBase = un.paraBase(v, ud)
                        passos += t(R.string.ui_calc_un_para_base, base.simbolo, t.sig(v, 6), t.sig(ud.fator, 7), t.sig(ud.offset, 7), t.sig(emBase, 7))
                        passos += t(R.string.ui_calc_un_da_base, up.simbolo, t.sig(res, 7))
                    } else {
                        passos += t(R.string.ui_calc_un_fatores, ud.simbolo, t.sig(ud.fator, 7), up.simbolo, t.sig(up.fator, 7), base?.simbolo ?: t(R.string.ui_calc_un_base))
                        passos += "$passo."
                    }
                    ResultadoCalculo(
                        t(R.string.ui_calc_un_resultado), listOf(net.saibatudo.quimica.domain.calc.LinhaResultado("${t.sig(v, 6)} ${ud.simbolo}", "${t.sig(res, 7)} ${up.simbolo}", destaque = true)), passos
                    )
                }
                ResultadoCalcView(r)
            }
        } else {
            AvisoBox(t(R.string.ui_calc_un_sem_unidades))
        }
    }
}
