package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Concentracao
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Quantidade
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.domain.Propriedades
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.CalculoInvalido
import net.saibatudo.quimica.domain.calc.DadosElementos
import net.saibatudo.quimica.domain.calc.Eletronica
import net.saibatudo.quimica.domain.calc.ElementoLigacao
import net.saibatudo.quimica.domain.calc.Entalpia
import net.saibatudo.quimica.domain.calc.EspecieEntalpia
import net.saibatudo.quimica.domain.calc.Equilibrio
import net.saibatudo.quimica.domain.calc.FormulaQuimica
import net.saibatudo.quimica.domain.calc.Ligacao
import net.saibatudo.quimica.domain.calc.MassaMolar
import net.saibatudo.quimica.domain.calc.Nox
import net.saibatudo.quimica.domain.calc.Racional
import net.saibatudo.quimica.domain.calc.ResultadoFormacao
import net.saibatudo.quimica.domain.calc.Subnivel

/*
 * Respostas das calculadoras novas (17/10/2026, docs/CALCULADORAS_2026-10-17.md §2): NOX, tipo de ligação, equilíbrio (Kc/Kp), entalpia (formação,
 * combustão, Hess) e a distribuição eletrônica da PROPRIEDADE configuracaoEletronica. Espelho dos métodos homônimos de web/src/quimica/js/answers.js
 * (mesmos blocos, fontes e números; os textos vêm de strings.xml, traduzidos dos catálogos do site). Os `resposta*` recebem as entradas já separadas e
 * também servem à tela Calculadoras. Sem KaTeX no Android: a conta de cada passo sai em texto simples depois da frase do passo.
 */

/** Fonte de uma regra ou de um cálculo do app (nome no idioma, sem licença de terceiros). */
private fun AnswerBuilder.fonteRegra(id: Int) = Fonte(t(id))

/** CID do composto do pacote com esta fórmula (índice do dicionário), ou null. */
private fun AnswerBuilder.cidDaFormula(formula: String): Long? =
    runCatching { dic.entidades(formula).compostos.firstOrNull { it.via == "formula" }?.cid }.getOrNull()

/** Nome do elemento no idioma (ou o símbolo, se o pacote não o tem); [meio] = para o meio da frase. */
private fun AnswerBuilder.nomeDoSimbolo(s: String, meio: Boolean = false): String {
    val n = pacote.porSimbolo[s]?.let { nomeDe(it) } ?: s
    return if (meio) t.minusNoMeio(n) else n
}

private fun AnswerBuilder.listar(itens: List<String>) = Propriedades.listar(t, itens)

private fun formatarFormulaTexto(f: String) = if (FormulaQuimica.tentar(f) != null) Texto.formulaUnicode(f) else f

/** Carga como texto: "+1", "−2", "0". */
private fun textoCarga(q: Int) = if (q == 0) "0" else (if (q > 0) "+" else "−") + kotlin.math.abs(q)

/** Fração como texto ("1/2", "−1"). */
private fun textoFrac(f: Racional) = f.toString().replace('-', '−')

/** Mensagem de erro de leitura de equação (códigos de Equilibrio/Entalpia). */
private fun AnswerBuilder.erroDeEquacao(codigo: String?, mensagem: CalculoInvalido?): String = mensagem?.texto(t) ?: t(
    when (codigo) {
        "semSeta" -> R.string.resp_eq_erro_sem_seta
        "duasSetas" -> R.string.resp_eq_erro_duas_setas
        "lado" -> R.string.resp_eq_erro_lado
        "eletron" -> R.string.resp_eq_erro_eletron
        "balancear" -> R.string.resp_eq_erro_balancear
        "expressao" -> R.string.resp_eq_erro_expressao
        else -> R.string.resp_eq_erro_formula
    }
)

/** Equação montada das espécies (fórmula, coeficiente, lado): "CH₄ + 2 O₂ → CO₂ + 2 H₂O" (com [equilibrio], a seta ⇌). */
private fun AnswerBuilder.equacaoDasEspecies(especies: List<Triple<String, Double, String>>, equilibrio: Boolean = false): String {
    fun lado(l: String) = especies.filter { it.third == l }.joinToString(" + ") { (f, c, _) -> (if (c == 1.0) "" else "${t.sig(c, 6)} ") + Texto.formulaUnicode(f) }
    return "${lado("r")} ${if (equilibrio) "⇌" else "→"} ${lado("p")}"
}

private fun AnswerBuilder.acaoCalc(tipo: TipoCalculadora, rotulo: Int, preenchimento: Map<String, String> = emptyMap()) =
    Acao.AbrirCalculadora(tipo, t(rotulo), preenchimento)

private fun distintas(fontes: List<Fonte>) = fontes.distinctBy { "${it.nome}|${it.url}|${it.detalhe}" }

/** R em J·mol⁻¹·K⁻¹ do pacote: direto ou N_A × k_B (como `gasR` do site). */
private fun AnswerBuilder.rJmolK(): Pair<Double, List<Fonte>>? {
    pacote.constante("R")?.takeIf { it.unidade == null || "J" in it.unidade }?.let { return it.valor to it.fontes }
    val na = pacote.constante("NA") ?: return null
    val kb = pacote.constante("kB") ?: return null
    return na.valor * kb.valor to kb.fontes
}

// ---- distribuição eletrônica ------------------------------------------------------------------------------------------------------

/** Blocos da distribuição eletrônica de um elemento (ou íon, com [carga]) e as fontes deles. O primeiro bloco é o título (Paragrafo) se deu certo. */
internal fun AnswerBuilder.blocosEletronica(e: Elemento, carga: Int = 0): Pair<List<Bloco>, List<Fonte>> {
    val nome = t.minusNoMeio(nomeDe(e))
    if (e.configuracaoEletronica.isNullOrBlank()) return listOf<Bloco>(Bloco.Aviso(t(R.string.resp_ele_sem_configuracao, nome))) to emptyList()
    val r = Eletronica.distribuicao(e.configuracaoEletronica, e.z, carga, e.bloco)
    if (!r.ok) {
        val msg = when (r.erro) {
            "totalDiferente" -> t(R.string.resp_ele_total_diferente, r.total.toString(), r.esperado.toString())
            "semConfiguracao" -> t(R.string.resp_ele_sem_configuracao, nome)
            else -> t(R.string.resp_ele_carga_invalida, nome)
        }
        return listOf<Bloco>(Bloco.Aviso(msg)) to emptyList()
    }
    fun sup(l: List<Subnivel>) = Eletronica.textoSubniveis(l, sobrescrito = true)
    val cv = r.camadaValencia!!
    val valencia = when (r.valenciaTipo) {
        "camada" -> r.eletronsValencia.toString()
        "ns+(n-1)d" -> t(R.string.resp_ele_valencia_transicao, r.eletronsValencia.toString())
        else -> t(R.string.resp_ele_valencia_f, r.eletronsValencia.toString())
    }
    val campos = mutableListOf(
        Bloco.Campo(t(R.string.resp_ele_pacote), r.configuracaoPacote),
        Bloco.Campo(t(R.string.resp_ele_completa), sup(r.ordemPauling)),
        Bloco.Campo(t(R.string.resp_ele_camadas_ordem), sup(r.ordemCamadas)),
        Bloco.Campo(t(R.string.resp_ele_por_camada), "${r.camadas.joinToString(", ") { it.eletrons.toString() }} (${r.camadas.joinToString(", ") { it.camada }})"),
        Bloco.Campo(t(R.string.resp_ele_camada_valencia), t(R.string.resp_ele_camada_valencia_valor, cv.camada, cv.n.toString(), cv.eletrons.toString()))
    )
    if (carga == 0) campos += Bloco.Campo(t(R.string.resp_ele_eletrons_valencia), valencia)
    campos += Bloco.Campo(t(R.string.resp_ele_mais_energetico), r.subnivelMaisEnergetico?.let { sup(listOf(it)) } ?: "—")
    campos += Bloco.Campo(t(R.string.resp_ele_bloco), r.bloco ?: "—")
    val titulo = if (carga != 0) t(R.string.resp_ele_titulo_ion, e.simbolo, textoCarga(carga)) else t(R.string.resp_ele_titulo, nome)
    val blocos = mutableListOf<Bloco>(Bloco.Paragrafo(titulo))
    blocos += campos
    if (r.ignorados.isNotEmpty()) blocos += Bloco.Aviso(t(R.string.resp_ele_ignorados, r.ignorados.joinToString(" ")))
    return blocos to (e.fontes.take(1) + fonteRegra(R.string.fonte_distribuicao))
}

/** Resposta da calculadora de configuração eletrônica (elemento + carga). */
fun AnswerBuilder.respostaEletronica(simbolo: String, carga: Int = 0): Resposta {
    val e = pacote.porSimbolo[simbolo]
        ?: return Resposta(Intent.PROPRIEDADE, t(R.string.resp_ele_de_qual), listOf(Bloco.Paragrafo(t(R.string.resp_ele_digite))), entendida = false)
    val (blocos, fontes) = blocosEletronica(e, carga)
    val ok = blocos.firstOrNull() is Bloco.Paragrafo
    val titulo = (blocos.firstOrNull() as? Bloco.Paragrafo)?.texto ?: t(R.string.resp_ele_titulo, nomeDe(e))
    return Resposta(Intent.PROPRIEDADE, titulo, if (ok) blocos.drop(1) else blocos, fontes = distintas(fontes), entendida = ok)
}

// ---- NOX --------------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.nox(q: ParsedQuery): Resposta {
    val c = compostoDe(q)
    return respostaNox(q.formula ?: c?.formula, q.cargaFormula, q.elemento)
}

private fun regraNox(regra: String): Int = when (regra) {
    "substanciaSimples" -> R.string.resp_nox_regras_substancia_simples
    "ionMonoatomico" -> R.string.resp_nox_regras_ion_monoatomico
    "fluor" -> R.string.resp_nox_regras_fluor
    "grupo1" -> R.string.resp_nox_regras_grupo1
    "grupo2" -> R.string.resp_nox_regras_grupo2
    "aluminio" -> R.string.resp_nox_regras_aluminio
    "hidrogenio" -> R.string.resp_nox_regras_hidrogenio
    "hidretoMetalico" -> R.string.resp_nox_regras_hidreto_metalico
    "oxigenio" -> R.string.resp_nox_regras_oxigenio
    "peroxido" -> R.string.resp_nox_regras_peroxido
    "superoxido" -> R.string.resp_nox_regras_superoxido
    "halogenio" -> R.string.resp_nox_regras_halogenio
    "eletronegatividade" -> R.string.resp_nox_regras_eletronegatividade
    else -> R.string.resp_nox_regras_balanco
}

fun AnswerBuilder.respostaNox(formula: String?, carga: Int? = null, elemento: String? = null): Resposta {
    val acoes = listOf(acaoCalc(TipoCalculadora.NOX, R.string.resp_nox_abrir, formula?.let { mapOf("formula" to it) }.orEmpty()))
    val regras = fonteRegra(R.string.fonte_regras_nox)
    if (formula.isNullOrBlank()) {
        return Resposta(Intent.NOX, t(R.string.resp_nox_de_qual), listOf(Bloco.Paragrafo(t(R.string.resp_nox_digite))), acoes = acoes, sugestoes = listOf(t(R.string.sug_nox_sulfurico)), entendida = false)
    }
    val r = Nox.calcular(formula, DadosElementos.de(pacote.porSimbolo), carga)
    if (!r.ok) {
        val msg = when (r.erro) {
            "formula" -> r.erroFormula?.texto(t) ?: t(R.string.resp_eq_erro_formula)
            "hidrato" -> t(R.string.resp_nox_hidrato)
            "indeterminado" -> t(R.string.resp_nox_indeterminado, listar(r.faltam))
            "inconsistente" -> t(R.string.resp_nox_inconsistente, r.soma.toString(), textoCarga(r.carga))
            else -> t(R.string.resp_nox_sem_dados, listar(r.faltam))
        }
        return Resposta(Intent.NOX, t(R.string.resp_nox_nao_consegui), listOf(Bloco.Aviso(msg)), fontes = listOf(regras), acoes = acoes, sugestoes = listOf(t(R.string.sug_nox_sulfurico)), entendida = false)
    }
    val abs = kotlin.math.abs(r.carga)
    val fuR = Texto.formulaUnicode(if (r.carga != 0) "${r.corpo}^${if (abs == 1) "" else abs}${if (r.carga > 0) "+" else "-"}" else r.corpo)
    val alvo = elemento?.let { el -> r.itens.firstOrNull { it.simbolo == el } }
    val usouEN = r.itens.any { it.regra == "eletronegatividade" }
    val fontes = listOf(regras) + (if (usouEN) r.itens.mapNotNull { pacote.porSimbolo[it.simbolo]?.fontes?.firstOrNull() } else emptyList())
    val blocos = mutableListOf<Bloco>()
    r.itens.forEach { i ->
        val extra = if (i.medio) t(R.string.resp_nox_medio) else t(regraNox(i.regra))
        blocos += Bloco.Campo("${Texto.capitalizar(nomeDoSimbolo(i.simbolo))} (${i.simbolo})", "${i.texto} ($extra)")
    }
    val soma = r.itens.joinToString(" + ") { "${it.atomos} × (${it.texto})" } + " = ${textoCarga(r.carga)}"
    blocos += Bloco.Passos(t(R.string.resp_como_calculei), listOf(t(R.string.resp_nox_passo_regras), "${t(R.string.resp_nox_passo_soma, textoCarga(r.carga))} $soma"))
    if (elemento != null && alvo == null) blocos += Bloco.Aviso(t(R.string.resp_nox_elemento_ausente, elemento, fuR))
    if (r.itens.any { it.medio }) blocos += Bloco.Aviso(t(R.string.resp_nox_aviso_medio))
    val titulo = if (alvo != null) t(R.string.resp_nox_titulo_elemento, nomeDoSimbolo(alvo.simbolo, meio = true), fuR, alvo.texto) else t(R.string.resp_nox_titulo, fuR)
    return Resposta(Intent.NOX, titulo, blocos, fontes = distintas(fontes), acoes = acoes, sugestoes = listOf(t(R.string.sug_ligacao_hcl)))
}

// ---- tipo de ligação --------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.ligacao(q: ParsedQuery): Resposta {
    val c = compostoDe(q)
    val formula = c?.formula ?: q.formula ?: q.formulas.firstOrNull()
    val polaridade = dic.lexico.pista("ligacaoPolaridade").containsMatchIn(Texto.nlu(q.textoOriginal))
    return respostaLigacao(formula, if (formula == null) q.elementos else null, c?.let { nomeDe(it) }, polaridade)
}

private fun AnswerBuilder.elementoLigacao(s: String): ElementoLigacao? = pacote.porSimbolo[s]?.let { e ->
    ElementoLigacao(s, e.categoria.takeIf { it != CategoriaElemento.DESCONHECIDA }?.id, e.eletronegatividade)
}

private fun tipoLigacao(tipo: String?): Int = when (tipo) {
    "metalica" -> R.string.resp_lig_tipos_metalica
    "ionica" -> R.string.resp_lig_tipos_ionica
    "covalentePolar" -> R.string.resp_lig_tipos_covalente_polar
    "covalenteApolar" -> R.string.resp_lig_tipos_covalente_apolar
    else -> R.string.resp_lig_tipos_nenhuma
}

fun AnswerBuilder.respostaLigacao(formula: String? = null, simbolos: List<String>? = null, nome: String? = null, polaridade: Boolean = false): Resposta {
    val acoes = listOf(acaoCalc(TipoCalculadora.LIGACAO, R.string.resp_lig_abrir, formula?.let { mapOf("formula" to it) }.orEmpty()))
    val regra = fonteRegra(R.string.fonte_regra_ligacao)
    if (formula.isNullOrBlank() && (simbolos?.size ?: 0) < 2) {
        return Resposta(Intent.LIGACAO, t(R.string.resp_lig_de_qual), listOf(Bloco.Paragrafo(t(R.string.resp_lig_digite))), acoes = acoes, sugestoes = listOf(t(R.string.sug_ligacao_hcl)), entendida = false)
    }
    val r = Ligacao.ligacoesDe(formula?.takeIf { it.isNotBlank() }, simbolos, { elementoLigacao(it) })
    val falhaGeral = if (!r.ok) r else null
    val falhaPar = r.ligacoes.firstOrNull { !it.ok }
    if (falhaGeral != null || falhaPar != null) {
        val erro = falhaGeral?.erro ?: falhaPar!!.erro
        val faltam = falhaGeral?.faltam ?: falhaPar!!.faltam
        val msg = when (erro) {
            "formula" -> falhaGeral?.erroFormula?.texto(t) ?: t(R.string.resp_eq_erro_formula)
            "semEntrada" -> t(R.string.resp_lig_sem_entrada)
            "semElemento" -> t(R.string.resp_lig_sem_elemento, listar(faltam))
            "semCategoria" -> t(R.string.resp_lig_sem_categoria, listar(faltam))
            else -> t(R.string.resp_lig_sem_eletronegatividade, listar(faltam))
        }
        return Resposta(Intent.LIGACAO, t(R.string.resp_lig_nao_consegui), listOf(Bloco.Aviso(msg)), fontes = listOf(regra), acoes = acoes, sugestoes = listOf(t(R.string.sug_ligacao_hcl)), entendida = false)
    }
    val alvo = nome ?: if (!formula.isNullOrBlank()) formatarFormulaTexto(formula) else listar(simbolos!!.take(2).map { nomeDoSimbolo(it, meio = true) })
    val usados = r.ligacoes.flatMap { listOf(it.a, it.b) }.distinct()
    val fontes = usados.mapNotNull { pacote.porSimbolo[it]?.fontes?.firstOrNull() } + regra
    val blocos = mutableListOf<Bloco>()
    r.ligacoes.forEach { l ->
        val extra = when {
            l.tipo == "metalica" -> t(R.string.resp_lig_metal_metal)
            l.deltaEN != null -> t(R.string.resp_lig_delta, t.sig(l.deltaEN, 3), l.a, t.sig(l.enA!!, 3), l.b, t.sig(l.enB!!, 3))
            else -> null
        }
        blocos += Bloco.Campo("${l.a}–${l.b}", t(tipoLigacao(l.tipo)) + (extra?.let { " ($it)" } ?: ""))
    }
    blocos += Bloco.Aviso(t(R.string.resp_lig_convencao))
    if (r.estimado) blocos += Bloco.Aviso(t(R.string.resp_lig_estimado))
    if (polaridade && !formula.isNullOrBlank() && usados.size >= 2 && r.ligacoes.all { it.tipo != "ionica" && it.tipo != "metalica" }) blocos += Bloco.Aviso(t(R.string.resp_lig_polaridade_molecula))
    return Resposta(Intent.LIGACAO, t(R.string.resp_lig_titulo, alvo), blocos, fontes = distintas(fontes), acoes = acoes, sugestoes = listOf(t(R.string.sug_nox_sulfurico)))
}

// ---- equilíbrio -------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.equilibrio(q: ParsedQuery): Resposta {
    val temperatura = q.quantidades.firstOrNull { Equilibrio.temperaturaEmK(it.valor, it.unidade, un) != null }
    return respostaEquilibrio(q.equacao, q.concentracoes, temperatura)
}

/** Fase de cada espécie sem rótulo, pelo composto do pacote: a [temperaturaK], pelos pontos de fusão e de ebulição; sem ela, o `estadoPadrao`. */
private suspend fun AnswerBuilder.fasesDoPacote(equacao: String, temperaturaK: Double?): Map<String, String> {
    val fases = LinkedHashMap<String, String>()
    val eq = try { Equilibrio.lerEquacaoComEstados(equacao) } catch (_: Exception) { return fases }
    fun ler(id: String, c: Composto): Any? = dic.propriedade(id)?.let { Propriedades.bruto(it, c) }
    for (x in eq.todas) {
        if (x.estado != null || x.chave in fases) continue
        val c = cidDaFormula(x.formula)?.let { pacote.composto(it) } ?: continue
        val v = Equilibrio.estadoNaTemperatura(ler("estadoPadrao", c) as? String, (ler("pontoFusaoK", c) as? Number)?.toDouble(), (ler("pontoEbulicaoK", c) as? Number)?.toDouble(), temperaturaK)
        if (v != null) fases[x.chave] = v
    }
    return fases
}

suspend fun AnswerBuilder.respostaEquilibrio(equacao: String?, concentracoes: List<Concentracao> = emptyList(), temperatura: Quantidade? = null): Resposta {
    val acoes = listOf(acaoCalc(TipoCalculadora.EQUILIBRIO, R.string.resp_eqm_abrir, equacao?.let { mapOf("equacao" to it) }.orEmpty()))
    if (equacao.isNullOrBlank()) {
        return Resposta(Intent.EQUILIBRIO, t(R.string.resp_eqm_de_qual), listOf(Bloco.Paragrafo(t(R.string.resp_eqm_digite))), acoes = acoes, sugestoes = listOf(t(R.string.sug_kc_amonia)), entendida = false)
    }
    val temp = temperatura?.let { Equilibrio.temperaturaEmK(it.valor, it.unidade, un) }
    val fases = fasesDoPacote(equacao, temp)
    val expr = Equilibrio.expressao(equacao, { f -> fases[Equilibrio.chaveFormula(f)] })
    if (!expr.ok) {
        return Resposta(Intent.EQUILIBRIO, t(R.string.resp_eqm_nao_consegui), listOf(Bloco.Aviso(erroDeEquacao(expr.erro, expr.mensagem))), acoes = acoes, sugestoes = listOf(t(R.string.sug_kc_amonia)), entendida = false)
    }
    val regra = fonteRegra(R.string.fonte_acao_das_massas)
    val eqTxt = equacaoDasEspecies(expr.especies.map { Triple(it.formula, it.coef, it.lado) }, equilibrio = true)
    fun lista(filtro: (net.saibatudo.quimica.domain.calc.EspecieEquilibrio) -> Boolean) = listar(expr.especies.filter(filtro).map { Texto.formulaUnicode(it.formula) })
    val avisos = mutableListOf<Bloco>()
    if (expr.balanceada) avisos += Bloco.Aviso(t(R.string.resp_eqm_balanceada, eqTxt))
    if (expr.especies.any { !it.entra }) avisos += Bloco.Aviso(t(R.string.resp_eqm_sem_solido_liquido, lista { !it.entra }))
    if (expr.especies.any { it.origem == "pacote" }) {
        val itens = listar(expr.especies.filter { it.origem == "pacote" }.map { x ->
            val estado = when (x.fase) { "s" -> R.string.estado_solido_meio; "l" -> R.string.estado_liquido_meio; else -> R.string.estado_gas_meio }
            "${Texto.formulaUnicode(x.formula)} (${t(estado)})"
        })
        avisos += Bloco.Aviso(if (temp != null) t(R.string.resp_eqm_fase_na_temperatura, t.sig(temp, 6), itens) else t(R.string.resp_eqm_fase_do_pacote, itens))
    }
    if (expr.especies.any { it.origem == "hipotese" }) avisos += Bloco.Aviso(t(R.string.resp_eqm_gas_por_hipotese, lista { it.origem == "hipotese" }))
    val campos = mutableListOf(Bloco.Campo(t(R.string.resp_eqm_delta_n), t.sig(expr.deltaN, 6)))
    var resolvida = true
    var kc: Double? = null
    val passos = mutableListOf<String>()
    if (concentracoes.isNotEmpty()) {
        val r = Equilibrio.calcularKc(expr, concentracoes.map { it.especie to it.valor })
        if (r.ok) {
            kc = r.kc
            campos += Bloco.Campo(t(R.string.resp_eqm_kc), "${t.sig(r.kc, 4)} (${t(R.string.resp_eqm_unidade_kc)})")
            fun termo(u: net.saibatudo.quimica.domain.calc.ConcentracaoUsada) = "(${t.sig(u.valor, 6)})" + if (u.coef == 1.0) "" else "^${t.sig(u.coef, 6)}"
            val num = r.usadas.filter { it.lado == "p" }.joinToString("·") { termo(it) }.ifEmpty { "1" }
            val den = r.usadas.filter { it.lado == "r" }.joinToString("·") { termo(it) }.ifEmpty { "1" }
            passos += "${t(R.string.resp_eqm_passo_kc)} Kc = $num / $den = ${t.sig(r.kc, 4)}"
        } else {
            resolvida = false
            avisos += Bloco.Aviso(if (r.erro == "faltamConcentracoes") t(R.string.resp_eqm_faltam, listar(r.faltam.map { Texto.formulaUnicode(it) })) else t(R.string.resp_eqm_invalida))
        }
    }
    val rPacote = rJmolK()
    val rLatm = rPacote?.let { Equilibrio.rLitroAtm(it.first, un) }
    val fonteR = fonteRegra(R.string.fonte_constante_r)
    val fontes = mutableListOf(regra)
    if (rLatm == null) avisos += Bloco.Aviso(t(R.string.resp_eqm_sem_r))
    else {
        fontes += fonteR
        fontes += rPacote.second
        if (temp != null) {
            val k = Equilibrio.kpDeKc(expr.deltaN, temp, rLatm, kc)
            if (k.ok) {
                campos += Bloco.Campo(t(R.string.resp_eqm_temperatura), "${t.sig(temp, 6)} K")
                campos += Bloco.Campo(t(R.string.resp_eqm_fator_rt), t.sig(k.fator, 4))
                k.kp?.let { campos += Bloco.Campo(t(R.string.resp_eqm_kp), t.sig(it, 4)) }
                val dn = t.sig(expr.deltaN, 6)
                passos += "${t(R.string.resp_eqm_passo_kp, t.sig(rLatm, 6))} Kp = Kc·(RT)^$dn = Kc·(${t.sig(rLatm, 6)} × ${t.sig(temp, 6)})^$dn = " +
                    (k.kp?.let { t.sig(it, 4) } ?: "${t.sig(k.fator, 4)}·Kc")
            } else avisos += Bloco.Aviso(t(R.string.resp_eqm_sem_t))
        } else {
            avisos += Bloco.Destaque("Kp = Kc·(RT)^${t.sig(expr.deltaN, 6)}")
            avisos += Bloco.Paragrafo(t(R.string.resp_eqm_sem_t))
        }
    }
    val blocos = mutableListOf<Bloco>(Bloco.Destaque(expr.texto))
    blocos += campos
    blocos += avisos
    if (passos.isNotEmpty()) blocos += Bloco.Passos(t(R.string.resp_como_calculei), passos)
    return Resposta(Intent.EQUILIBRIO, t(R.string.resp_eqm_titulo, eqTxt), blocos, fontes = distintas(fontes), acoes = acoes, sugestoes = listOf(t(R.string.sug_ligacao_hcl)), entendida = resolvida)
}

// ---- entalpia ---------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.entalpia(q: ParsedQuery): Resposta {
    q.equacao?.let { return respostaEntalpiaReacao(it) }
    val c = compostoDe(q)
    val formula = c?.formula ?: q.formulas.firstOrNull()
    val n = Texto.nlu(q.textoOriginal)
    val lex = dic.lexico
    if (formula != null && (lex.pista("entalpiaCombustao").containsMatchIn(n) || !lex.pista("entalpiaFormacao").containsMatchIn(n))) {
        val quantidade = q.quantidades.firstOrNull { un.buscar(it.unidade)?.grandeza in setOf("massa", "quantidade") }
        return respostaCombustao(formula, c, quantidade)
    }
    // só a lei de Hess (ou a pergunta sem reação): o método e a calculadora
    return Resposta(
        Intent.ENTALPIA, t(R.string.resp_ent_titulo_hess),
        listOf(Bloco.Paragrafo(t(R.string.resp_ent_hess)), Bloco.Paragrafo(t(R.string.resp_ent_digite))),
        fontes = listOf(fonteRegra(R.string.fonte_entalpia_calculo)),
        acoes = listOf(acaoCalc(TipoCalculadora.ENTALPIA, R.string.resp_ent_abrir_hess, mapOf("modo" to "hess"))), sugestoes = listOf(t(R.string.sug_kc_amonia))
    )
}

/** ΔHf° de uma espécie: 0 por regra (substância simples no estado padrão) ou o valor do pacote com a fonte e as condições; valor null se não há. */
private class FormacaoDe(val valor: Double?, val regra: Boolean, val fontes: List<Fonte>, val condicoes: List<String>)

private suspend fun AnswerBuilder.entalpiaFormacaoDe(formula: String): FormacaoDe {
    if (Entalpia.ehSubstanciaSimplesPadrao(formula)) return FormacaoDe(0.0, true, listOf(fonteRegra(R.string.fonte_substancia_simples)), emptyList())
    val c = cidDaFormula(formula)?.let { pacote.composto(it) }
    val v = c?.propriedades?.get("entalpiaFormacaoKJmol")?.takeIf { it.isFinite() } ?: return FormacaoDe(null, false, emptyList(), emptyList())
    val fontes = Propriedades.fontesDoCampo(c, "entalpiaFormacaoKJmol", t, un)
    return FormacaoDe(v, false, fontes.map { it.fonte }.ifEmpty { c.fontes.take(1) }, fontes.flatMap { it.condicoes }.distinct())
}

/** Soma por formação com os ΔHf° resolvidos: o resultado, os blocos (valores usados + passos) e as fontes dos valores. */
private suspend fun AnswerBuilder.calculoPorFormacao(especies: List<EspecieEntalpia>): Triple<ResultadoFormacao, List<Bloco>, List<Fonte>> {
    val resolvidas = especies.map { x -> x to entalpiaFormacaoDe(x.formula) }
    val r = Entalpia.somaPorFormacao(resolvidas.map { (x, h) -> x.copy(dHf = h.valor) })
    val blocos = mutableListOf<Bloco>(Bloco.Paragrafo(t(R.string.resp_ent_valores)))
    resolvidas.forEach { (x, h) ->
        val valor = when {
            h.valor == null -> t(R.string.resp_ent_sem_valor)
            h.regra -> t(R.string.resp_ent_simples)
            else -> "${t.sig(h.valor, 6)} kJ/mol" + if (h.condicoes.isNotEmpty()) " — ${h.condicoes.joinToString("; ")}" else ""
        }
        blocos += Bloco.Campo(t(R.string.resp_ent_d_hf_de, Texto.formulaUnicode(x.formula)), valor)
    }
    fun termo(x: EspecieEntalpia, h: FormacaoDe, numero: Boolean) =
        (if (x.coef == 1.0) "" else "${t.sig(x.coef, 6)} ") + if (numero) "(${t.sig(h.valor ?: 0.0, 6)})" else "ΔHf°(${Texto.formulaUnicode(x.formula)})"
    fun lado(l: String, numero: Boolean) = resolvidas.filter { it.first.lado == l }.joinToString(" + ") { (x, h) -> termo(x, h, numero) }.ifEmpty { "0" }
    val passos = mutableListOf("${t(R.string.resp_ent_expressao)} ΔH° = [${lado("p", false)}] − [${lado("r", false)}]")
    if (r.ok) passos += "${t(R.string.resp_ent_passo_soma)} ΔH° = [${lado("p", true)}] − [${lado("r", true)}] = ${t.sig(r.dH, 6)} kJ"
    blocos += Bloco.Passos(t(R.string.resp_como_calculei), passos)
    return Triple(r, blocos, resolvidas.flatMap { it.second.fontes })
}

private fun AnswerBuilder.avisoSinal(exotermica: Boolean) = Bloco.Aviso(t(if (exotermica) R.string.resp_ent_exotermica else R.string.resp_ent_endotermica))

suspend fun AnswerBuilder.respostaEntalpiaReacao(equacao: String): Resposta {
    val acoes = listOf(acaoCalc(TipoCalculadora.ENTALPIA, R.string.resp_ent_abrir, mapOf("equacao" to equacao)))
    val sug = listOf(t(R.string.sug_entalpia_hess))
    val calculo = fonteRegra(R.string.fonte_entalpia_calculo)
    val e = Entalpia.especiesDaEquacao(equacao)
    if (!e.ok) return Resposta(Intent.ENTALPIA, t(R.string.resp_ent_nao_consegui), listOf(Bloco.Aviso(erroDeEquacao(e.erro, e.mensagem))), acoes = acoes, sugestoes = sug, entendida = false)
    val eqTxt = equacaoDasEspecies(e.especies.map { Triple(it.formula, it.coef, it.lado) })
    val (r, blocosCalc, fontesValores) = calculoPorFormacao(e.especies)
    val topo = mutableListOf<Bloco>(Bloco.Destaque(eqTxt))
    if (e.balanceada) topo += Bloco.Aviso(t(R.string.resp_ent_balanceada, eqTxt))
    val titulo = t(R.string.resp_ent_titulo_reacao, eqTxt)
    val fontes = distintas(listOf(calculo) + fontesValores)
    if (!r.ok) {
        return Resposta(Intent.ENTALPIA, titulo, topo + Bloco.Aviso(t(R.string.resp_ent_falta, listar(r.faltam.map { Texto.formulaUnicode(it) }))) + blocosCalc, fontes = fontes, acoes = acoes, sugestoes = sug, entendida = false)
    }
    val blocos = topo + Bloco.Campo(t(R.string.resp_ent_resultado), "${t.sig(r.dH, 6)} kJ") + blocosCalc + avisoSinal(r.exotermica)
    return Resposta(Intent.ENTALPIA, titulo, blocos, fontes = fontes, acoes = acoes, sugestoes = sug)
}

suspend fun AnswerBuilder.respostaCombustao(formula: String, composto: Composto? = null, quantidade: Quantidade? = null): Resposta {
    val acoes = listOf(acaoCalc(TipoCalculadora.ENTALPIA, R.string.resp_ent_abrir_hess, mapOf("modo" to "hess")))
    val sug = listOf(t(R.string.sug_entalpia_hess))
    val calculo = fonteRegra(R.string.fonte_entalpia_calculo)
    val nome = composto?.let { t.minusNoMeio(nomeDe(it)) } ?: formatarFormulaTexto(formula)
    val comb = Entalpia.equacaoDeCombustao(formula)
    if (!comb.ok) return Resposta(Intent.ENTALPIA, t(R.string.resp_ent_nao_consegui), listOf(Bloco.Aviso(comb.mensagem?.texto(t) ?: t(R.string.resp_ent_nao_queima))), acoes = acoes, sugestoes = sug, entendida = false)
    val (r, blocosCalc, fontesValores) = calculoPorFormacao(comb.especies)
    val titulo = t(R.string.resp_ent_titulo_combustao, nome)
    val topo = listOf(Bloco.Destaque(comb.equacao), Bloco.Aviso(t(R.string.resp_ent_combustao_completa)))
    val fontes = mutableListOf(calculo)
    fontes += fontesValores
    if (!r.ok) {
        return Resposta(Intent.ENTALPIA, titulo, topo + Bloco.Aviso(t(R.string.resp_ent_falta, listar(r.faltam.map { Texto.formulaUnicode(it) }))) + blocosCalc, fontes = distintas(fontes), acoes = acoes, sugestoes = sug, entendida = false)
    }
    val porMol = r.dH / comb.coefComposto
    val itens = mutableListOf(Bloco.Campo(t(R.string.resp_ent_por_mol, nome), "${t.sig(porMol, 6)} kJ/mol"))
    if (comb.coefComposto != 1) itens += Bloco.Campo(t(R.string.resp_ent_resultado), "${t.sig(r.dH, 6)} kJ")
    val extras = mutableListOf<Bloco>()
    if (quantidade != null) {
        val mol: Double? = try {
            val u = un.buscar(quantidade.unidade)
            when (u?.grandeza) {
                "quantidade" -> un.porSimbolo("mol", "quantidade")?.let { un.converter(quantidade.valor, u, it) }
                "massa" -> un.porSimbolo("g", "massa")?.let { g -> un.converter(quantidade.valor, u, g) / MassaMolar.calcular(formula, pacote.porSimbolo).massaMolar }
                else -> null
            }
        } catch (_: CalculoInvalido) { null }
        if (mol != null && mol.isFinite()) {
            val (calor, _) = Entalpia.calorDaAmostra(r.dH, comb.coefComposto, mol)
            itens += Bloco.Campo(t(R.string.resp_ent_amostra, t.sig(quantidade.valor, 6), quantidade.unidade, nome), "${t.sig(calor, 6)} kJ")
            val passo = "${t(R.string.resp_ent_passo_amostra, t.sig(mol, 6))} q = n / ${comb.coefComposto} × ΔH° = ${t.sig(mol, 6)} / ${comb.coefComposto} × (${t.sig(r.dH, 6)}) = ${t.sig(calor, 6)} kJ"
            extras += Bloco.Passos(t(R.string.resp_ent_titulo_amostra), listOf(passo))
            fontes += fonteCalculo()
        } else extras += Bloco.Aviso(t(R.string.resp_ent_sem_mol))
    }
    val blocos = topo + itens + blocosCalc + extras + avisoSinal(r.exotermica)
    return Resposta(Intent.ENTALPIA, titulo, blocos, fontes = distintas(fontes), acoes = acoes, sugestoes = sug)
}

/** Resposta da calculadora de Hess: equação alvo + equações (texto, ΔH em kJ; null = sem ΔH). */
fun AnswerBuilder.respostaHess(alvo: String, equacoes: List<Pair<String, Double?>>): Resposta {
    val calculo = fonteRegra(R.string.fonte_entalpia_calculo)
    val r = Entalpia.combinarHess(alvo, equacoes)
    if (!r.ok) {
        val n = ((r.indice ?: 0) + 1).toString()
        val msg = when (r.erro) {
            "alvo" -> t(R.string.resp_ent_hess_alvo, r.mensagem?.texto(t) ?: t(R.string.resp_eq_erro_sem_seta))
            "equacao" -> t(R.string.resp_ent_hess_equacao, n, r.mensagem?.texto(t) ?: t(R.string.resp_eq_erro_sem_seta))
            "naoBalanceada" -> t(R.string.resp_ent_nao_balanceada, n)
            "semDH" -> t(R.string.resp_ent_sem_dh, n)
            else -> t(R.string.resp_ent_sem_combinacao)
        }
        return Resposta(Intent.ENTALPIA, t(R.string.resp_ent_nao_consegui), listOf(Bloco.Aviso(msg)), fontes = listOf(calculo), entendida = false)
    }
    val passos = r.passos.map { x ->
        val frase = t(
            if (x.invertida) R.string.resp_ent_hess_invertida else R.string.resp_ent_hess_passo,
            (x.indice + 1).toString(), textoFrac(if (x.invertida) -x.fator else x.fator), t.sig(x.dH, 6)
        )
        "$frase (${textoFrac(x.fator)} × (${t.sig(equacoes[x.indice].second!!, 6)}) = ${t.sig(x.dH, 6)} kJ)"
    } + "${t(R.string.resp_ent_hess_soma)} ΔH = ${r.passos.joinToString(" + ") { "(${t.sig(it.dH, 6)})" }} = ${t.sig(r.dH, 6)} kJ"
    return Resposta(
        Intent.ENTALPIA, t(R.string.resp_ent_titulo_hess_resultado),
        listOf(Bloco.Campo(t(R.string.resp_ent_hess_resultado), "${t.sig(r.dH, 6)} kJ"), Bloco.Passos(t(R.string.resp_passo_a_passo), passos), avisoSinal(r.exotermica)),
        fontes = listOf(calculo)
    )
}
