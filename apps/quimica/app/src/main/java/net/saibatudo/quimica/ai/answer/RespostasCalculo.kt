package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.ai.nlu.Quantidades
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.UnidadeDef
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.Balanceador
import net.saibatudo.quimica.domain.calc.CalculoInvalido
import net.saibatudo.quimica.domain.calc.CampoQtd
import net.saibatudo.quimica.domain.calc.EquacaoBalanceada
import net.saibatudo.quimica.domain.calc.Estequiometria
import net.saibatudo.quimica.domain.calc.FormulaQuimica
import net.saibatudo.quimica.domain.calc.GasIdeal
import net.saibatudo.quimica.domain.calc.MassaMolar
import net.saibatudo.quimica.domain.calc.Qtd
import net.saibatudo.quimica.domain.calc.QuantidadeConhecida
import net.saibatudo.quimica.domain.calc.ResultadoCalculo
import net.saibatudo.quimica.domain.calc.Solucoes
import net.saibatudo.quimica.domain.calc.TipoForte
import net.saibatudo.quimica.domain.calc.VariavelGas

/** Respostas de cálculo: tudo vem de cálculo local testado (com os passos) e dos dados do pacote; os textos, de strings.xml no idioma. */

private fun AnswerBuilder.fonteDe(vararg extras: List<Fonte>): List<Fonte> = listOf(fonteCalculo()) + extras.flatMap { it }.distinctBy { it.nome }.take(3)

private fun AnswerBuilder.unidadeDe(simbolo: String): UnidadeDef? = un.buscar(simbolo)

private val RX_ESTADO_FISICO = Regex("""\((?:s|l|g|aq)\)$""")

// ---- massa molar ------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.massaMolar(q: ParsedQuery): Resposta {
    val c = compostoDe(q)
    val e = if (q.formula == null && c == null) elementoDe(q) else null
    val formula = q.formula ?: c?.formula ?: e?.simbolo
    if (formula == null) {
        return Resposta(
            Intent.MASSA_MOLAR, t(R.string.rot_massa_molar), listOf(Bloco.Paragrafo(t(R.string.resp_mm_de_qual))),
            acoes = listOf(acaoCalculadora(TipoCalculadora.MASSA_MOLAR)),
            sugestoes = listOf(t(R.string.sug_massa_molar_agua), t(R.string.sug_massa_molar_caoh2)), entendida = false
        )
    }
    val mm = MassaMolar.calcular(formula, pacote.porSimbolo)
    val res = mm.comoResultado(t)
    val nome = e?.let { "${nomeDe(it)} (${it.simbolo})" } ?: c?.let { nomeDe(it) } ?: mm.formula.exibicao()
    val blocos = mutableListOf<Bloco>(Bloco.Destaque("${t.fixo(mm.massaMolar, 3)} g/mol"))
    if (c != null && c.massaMolar != null && kotlin.math.abs(c.massaMolar - mm.massaMolar) > 0.005) {
        blocos += Bloco.Campo(t(R.string.resp_mm_valor_pacote), "${t.num(c.massaMolar, 4)} g/mol")
    }
    // massa <-> mol de uma quantidade citada na pergunta
    val gUn = un.porSimbolo("g", "massa")
    val molUn = un.porSimbolo("mol", "quantidade")
    val extras = mutableListOf<String>()
    for (qt in q.quantidades) {
        val u = unidadeDe(qt.unidade) ?: continue
        if (u.grandeza == "massa" && gUn != null && molUn != null) {
            val massaG = un.converter(qt.valor, u, gUn)
            val mols = massaG / mm.massaMolar
            blocos += Bloco.Campo(t(R.string.resp_x_de_y, t.sig(qt.valor, 5), u.simbolo, nome), "${t.sig(mols, 5)} mol")
            extras += t(R.string.calc_mm_n_de_m, t.sig(massaG, 5), t.fixo(mm.massaMolar, 3), t.sig(mols, 5))
        } else if (u.grandeza == "quantidade" && gUn != null && molUn != null) {
            val mols = un.converter(qt.valor, u, molUn)
            val massa = mols * mm.massaMolar
            blocos += Bloco.Campo(t(R.string.resp_x_de_y, t.sig(qt.valor, 5), u.simbolo, nome), "${t.sig(massa, 5)} g")
            extras += t(R.string.calc_mm_m_de_n, t.sig(mols, 5), t.fixo(mm.massaMolar, 3), t.sig(massa, 5))
        }
    }
    blocos += Bloco.Passos(t(R.string.resp_como_calculei), res.passos + extras)
    res.notas.forEach { blocos += Bloco.Aviso(it) }
    return Resposta(
        Intent.MASSA_MOLAR, t(R.string.resp_mm_titulo, nome), blocos,
        fontes = fonteDe(fontesDeElementos(mm.formula.contagem.keys)),
        acoes = listOf(acaoCalculadora(TipoCalculadora.MASSA_MOLAR, mapOf("formula" to formula)))
    )
}

// ---- balanceamento --------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.balancear(q: ParsedQuery): Resposta {
    val eq = q.equacao
    if (eq == null) {
        return Resposta(
            Intent.BALANCEAR, t(R.string.resp_bal_titulo),
            listOf(Bloco.Paragrafo(t(R.string.resp_bal_escreva))),
            acoes = listOf(acaoCalculadora(TipoCalculadora.BALANCEAMENTO)),
            sugestoes = listOf(t(R.string.sug_balancear_fe)), entendida = false
        )
    }
    val r = Balanceador.balancear(t, eq)
    return Resposta(
        Intent.BALANCEAR, t(R.string.calc_bal_titulo),
        listOf(Bloco.Destaque(r.balanceada.texto()), Bloco.Passos(t(R.string.resp_passo_a_passo), r.passos)),
        fontes = listOf(fonteCalculo()),
        acoes = listOf(acaoCalculadora(TipoCalculadora.BALANCEAMENTO, mapOf("equacao" to eq)))
    )
}

// ---- estequiometria ---------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.estequiometria(q: ParsedQuery): Resposta {
    val eq = q.equacao ?: return conversaoMolar(q)
    val aviso: (String) -> Resposta = { msg ->
        Resposta(
            Intent.ESTEQUIOMETRIA, t(R.string.calc_est_titulo), listOf(Bloco.Aviso(msg)),
            acoes = listOf(acaoCalculadora(TipoCalculadora.ESTEQUIOMETRIA, mapOf("equacao" to eq))),
            sugestoes = emptyList(), entendida = false
        )
    }
    val bal = Balanceador.balancear(t, eq).balanceada
    if (bal.equacao.todas.any { it.eletron }) return aviso(t(R.string.resp_est_sem_eletrons))
    val posEq = LocalNlu.extrairEquacaoComPosicao(q.textoOriginal)?.second
    val texto = if (posEq != null) q.textoOriginal.replaceRange(posEq.first, minOf(posEq.last + 1, q.textoOriginal.length), " ".repeat((posEq.last - posEq.first + 1).coerceAtLeast(0))) else q.textoOriginal
    val gUn = un.porSimbolo("g", "massa") ?: return aviso(t(R.string.resp_est_falta_massa))
    val molUn = un.porSimbolo("mol", "quantidade") ?: return aviso(t(R.string.resp_est_falta_qtd))
    val conhecidas = mutableListOf<QuantidadeConhecida>()
    val usadas = mutableSetOf<Int>()
    val rotulos = bal.equacao.todas.map { it.rotulo }
    for (ql in Quantidades.ler(texto, un, dic.lexico)) {
        val u = ql.unidade?.let { unidadeDe(it) } ?: continue
        if (u.grandeza != "massa" && u.grandeza != "quantidade") continue
        val indice = especieMaisProxima(texto, ql.faixa, rotulos) ?: continue
        if (!usadas.add(indice)) continue
        val valor = if (u.grandeza == "massa") un.converter(ql.valor, u, gUn) else un.converter(ql.valor, u, molUn)
        conhecidas += QuantidadeConhecida(indice, valor, emMols = u.grandeza == "quantidade")
    }
    if (conhecidas.isEmpty()) return aviso(t(R.string.resp_est_diga_qual))
    val r = Estequiometria.calcular(t, bal, conhecidas, pacote.porSimbolo)
    val res = r.comoResultado(t)
    val blocos = mutableListOf<Bloco>(Bloco.Destaque(bal.texto()))
    r.limitante?.let { blocos += Bloco.Campo(t(R.string.resp_est_reagente_limitante), Texto.formulaUnicode(it)) }
    res.linhas.forEach { blocos += Bloco.Campo(it.rotulo, it.valor) }
    blocos += Bloco.Passos(t(R.string.resp_passo_a_passo), r.passos)
    val simbolos = bal.equacao.todas.flatMap { it.formula.contagem.keys }.toSet()
    return Resposta(
        Intent.ESTEQUIOMETRIA, t(R.string.calc_est_titulo), blocos, fontes = fonteDe(fontesDeElementos(simbolos)),
        acoes = listOf(acaoCalculadora(TipoCalculadora.ESTEQUIOMETRIA, mapOf("equacao" to eq)))
    )
}

/** Espécie da equação citada mais perto da quantidade (depois dela, "4 g de H2"; senão antes, "H2: 4 g"). */
private fun especieMaisProxima(texto: String, faixa: IntRange, rotulos: List<String>): Int? {
    var melhor: Int? = null
    var distancia = Int.MAX_VALUE
    for ((i, rot) in rotulos.withIndex()) {
        val rx = Regex("""(?<![A-Za-z0-9(])${Regex.escape(RX_ESTADO_FISICO.replace(rot, ""))}(?![a-z0-9(])""")
        for (m in rx.findAll(texto)) {
            val d = if (m.range.first > faixa.last) m.range.first - faixa.last else (faixa.first - m.range.last) + 25
            if (d < distancia && d < 60) { distancia = d; melhor = i }
        }
    }
    return melhor
}

/**
 * Estequiometria sem equação: conversões entre massa, quantidade de matéria (mol), número de entidades (constante de Avogadro
 * do pacote) e, nas CNTP, volume de gás ideal. Ex.: "quantos mols tem em 18 g de água?", "quantas moléculas há em 2 mol de CO2?".
 */
private suspend fun AnswerBuilder.conversaoMolar(q: ParsedQuery): Resposta {
    val n = Texto.nlu(q.textoOriginal)
    val acoes = listOf(acaoCalculadora(TipoCalculadora.ESTEQUIOMETRIA))
    val molUn = un.porSimbolo("mol", "quantidade")!!
    val gUn = un.porSimbolo("g", "massa")!!
    val cntp = Regex("""\b(?:cntp|condicoes normais|ntp)\b""").containsMatchIn(n)
    if (cntp) {
        val mols = q.quantidades.firstNotNullOfOrNull { qt -> unidadeDe(qt.unidade)?.takeIf { it.grandeza == "quantidade" }?.let { un.converter(qt.valor, it, molUn) } } ?: 1.0
        val r = pacote.constante("R") ?: throw CalculoInvalido(R.string.erro_gas_sem_r)
        val res = GasIdeal.resolver(
            t, CampoQtd(1.0, un.porSimbolo("atm", "pressao")!!), CampoQtd(null, un.porSimbolo("L", "volume")!!),
            CampoQtd(mols, molUn), CampoQtd(0.0, un.porSimbolo("°C", "temperatura")!!), r, un
        ).let { it.copy(notas = it.notas + GasIdeal.notasCntp(t, r, un)) }
        return Resposta(
            Intent.ESTEQUIOMETRIA, t(R.string.resp_est_volume_cntp_titulo),
            listOf(Bloco.Paragrafo(t(R.string.resp_est_cntp_adotadas))) + resultadoComoBlocos(res), fontes = fonteDe(r.fontes), acoes = acoes
        )
    }
    val c = compostoDe(q)
    // "quantos mols há em 1,2 × 10²³ átomos?": partículas → mol não depende da substância (só da constante de Avogadro do pacote)
    val particulas = q.quantidades.firstOrNull { it.unidade == "particulas" }
    val na = pacote.constante("NA")
    if (particulas != null && na != null && q.formula == null && c == null && elementoDe(q) == null) {
        val mols = particulas.valor / na.valor
        return Resposta(
            Intent.ESTEQUIOMETRIA, t(R.string.calc_est_titulo),
            listOf(
                Bloco.Campo(t(R.string.resp_est_entidades), t.cient(particulas.valor, 4)),
                Bloco.Campo(t(R.string.calc_sol_qtd_materia), "${t.sig(mols, 5)} mol"),
                Bloco.Passos(t(R.string.resp_como_calculei), listOf(t(R.string.calc_est_passo_n_avogadro, t.sig(particulas.valor, 5), t.cient(na.valor, 4), t.sig(mols, 5))))
            ),
            fontes = fonteDe(na.fontes), acoes = acoes
        )
    }
    val formula = q.formula ?: c?.formula ?: elementoDe(q)?.simbolo
        ?: return Resposta(
            Intent.ESTEQUIOMETRIA, t(R.string.calc_est_titulo),
            listOf(Bloco.Paragrafo(t(R.string.resp_est_diga_substancia))),
            acoes = acoes, sugestoes = listOf(t(R.string.sug_mols_agua)), entendida = false
        )
    val mm = MassaMolar.calcular(formula, pacote.porSimbolo)
    val avogadro = pacote.constante("NA")
    val nome = c?.let { nomeDe(it) } ?: mm.formula.exibicao()
    var mols: Double? = null
    var passoMols = ""
    for (qt in q.quantidades) {
        val u = unidadeDe(qt.unidade)
        if (qt.unidade == "particulas" && avogadro != null) {
            mols = qt.valor / avogadro.valor
            passoMols = t(R.string.calc_est_passo_n_avogadro, t.sig(qt.valor, 5), t.cient(avogadro.valor, 4), t.sig(mols, 5))
            break
        }
        if (u?.grandeza == "massa") {
            val g = un.converter(qt.valor, u, gUn); mols = g / mm.massaMolar
            passoMols = t(R.string.calc_est_passo_n_massa, t.sig(g, 5), t.fixo(mm.massaMolar, 3), t.sig(mols, 5))
            break
        }
        if (u?.grandeza == "quantidade") {
            mols = un.converter(qt.valor, u, molUn)
            passoMols = t(R.string.calc_est_passo_n_informado, t.sig(mols, 5))
            break
        }
    }
    if (mols == null) {
        return Resposta(
            Intent.ESTEQUIOMETRIA, t(R.string.resp_est_titulo_nome, nome), listOf(Bloco.Paragrafo(t(R.string.resp_est_informe_qtd, nome))),
            acoes = acoes, sugestoes = listOf(t(R.string.sug_mols_agua)), entendida = false
        )
    }
    val blocos = mutableListOf<Bloco>(
        Bloco.Campo(t(R.string.resp_est_massa_molar_de, nome), "${t.fixo(mm.massaMolar, 3)} g/mol"),
        Bloco.Campo(t(R.string.calc_sol_qtd_materia), "${t.sig(mols, 5)} mol"),
        Bloco.Campo(t(R.string.rot_massa), "${t.sig(mols * mm.massaMolar, 5)} g")
    )
    val passos = mutableListOf(
        mm.comoResultado(t).passos.last(), passoMols,
        t(R.string.calc_est_passo_m, t.sig(mols, 5), t.fixo(mm.massaMolar, 3), t.sig(mols * mm.massaMolar, 5))
    )
    if (avogadro != null) {
        blocos += Bloco.Campo(t(R.string.resp_est_entidades), t.cient(mols * avogadro.valor, 4))
        passos += t(R.string.calc_est_passo_avogadro, t.sig(mols, 5), t.cient(avogadro.valor, 4), t.cient(mols * avogadro.valor, 4))
    }
    blocos += Bloco.Passos(t(R.string.resp_como_calculei), passos)
    return Resposta(
        Intent.ESTEQUIOMETRIA, t(R.string.resp_est_titulo_nome, nome), blocos,
        fontes = fonteDe(fontesDeElementos(mm.formula.contagem.keys), avogadro?.fontes.orEmpty()), acoes = acoes
    )
}

// ---- concentração e diluição -------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.concentracao(q: ParsedQuery): Resposta {
    val n = Texto.nlu(q.textoOriginal)
    val qtds = q.quantidades.mapNotNull { qt -> unidadeDe(qt.unidade)?.let { Qtd(qt.valor, it) } }
    val massas = qtds.filter { it.unidade.grandeza == "massa" }
    val volumes = qtds.filter { it.unidade.grandeza == "volume" }
    val concs = qtds.filter { it.unidade.grandeza == "concentracao" }
    val c = compostoDe(q)
    val formula = q.formula ?: c?.formula
    val acoes = listOf(acaoCalculadora(TipoCalculadora.CONCENTRACAO))
    // a pista "diluição" do idioma (léxico) vale em todos os idiomas; o padrão em português continua valendo em pt-BR
    val emDiluicao = Regex("""\b(?:diluic\w+|dilui\w*|diluid\w+|c ?1 ?v ?1)\b""").containsMatchIn(n) ||
        (idioma != Idiomas.PADRAO && dic.lexico.pista("diluicao").containsMatchIn(n))

    fun pronta(r: ResultadoCalculo, fontes: List<Fonte> = emptyList()) = Resposta(
        Intent.CONCENTRACAO, r.titulo, resultadoComoBlocos(r), fontes = fonteDe(fontes), acoes = acoes
    )

    if (emDiluicao && concs.isNotEmpty()) {
        val lc = concs[0].unidade                                   // a incógnita sai na unidade que a pessoa usou
        val lv = volumes.firstOrNull()?.unidade ?: un.porSimbolo("L", "volume")!!
        val final = Regex("""\b(?:final|total|desejad\w+|obter|chegar|ficar)\b""").containsMatchIn(n)
        val (c1, v1, c2, v2) = when {
            concs.size == 2 && volumes.size == 1 ->
                if (final) listOf(CampoQtd(concs[0].valor, concs[0].unidade), CampoQtd(null, lv), CampoQtd(concs[1].valor, concs[1].unidade), CampoQtd(volumes[0].valor, volumes[0].unidade))
                else listOf(CampoQtd(concs[0].valor, concs[0].unidade), CampoQtd(volumes[0].valor, volumes[0].unidade), CampoQtd(concs[1].valor, concs[1].unidade), CampoQtd(null, lv))
            concs.size == 1 && volumes.size == 2 ->
                listOf(CampoQtd(concs[0].valor, concs[0].unidade), CampoQtd(volumes[0].valor, volumes[0].unidade), CampoQtd(null, lc), CampoQtd(volumes[1].valor, volumes[1].unidade))
            else -> throw CalculoInvalido(R.string.erro_conc_diluicao_tres)
        }
        return pronta(Solucoes.diluicao(t, c1, v1, c2, v2, un))
    }
    if (massas.size == 1 && volumes.size == 1) {
        val f = formula ?: throw CalculoInvalido(R.string.erro_conc_diga_substancia)
        val mm = MassaMolar.calcular(f, pacote.porSimbolo)
        return pronta(Solucoes.molaridade(t, massas[0], mm.massaMolar, volumes[0], un, mm.formula.exibicao()), fontesDeElementos(mm.formula.contagem.keys))
    }
    if (concs.size == 1 && volumes.size == 1) {
        val f = formula ?: throw CalculoInvalido(R.string.erro_conc_diga_substancia)
        val mm = MassaMolar.calcular(f, pacote.porSimbolo)
        return pronta(Solucoes.massaParaPreparar(t, concs[0], volumes[0], mm.massaMolar, un, mm.formula.exibicao()), fontesDeElementos(mm.formula.contagem.keys))
    }
    throw CalculoInvalido(R.string.erro_conc_geral)
}

// ---- pH ----------------------------------------------------------------------------------------------------------------------------------------

/** Ácidos fortes de uso comum (classificação química, não medida): ionização completa em água diluída. */
private val ACIDOS_FORTES = mapOf("HCl" to 1, "HBr" to 1, "HI" to 1, "HNO3" to 1, "HClO4" to 1, "HClO3" to 1, "H2SO4" to 2)
private val RX_BASE_FORTE = Regex("""^(Li|Na|K|Rb|Cs)OH$|^(Ca|Sr|Ba)\(OH\)2$""")

internal suspend fun AnswerBuilder.ph(q: ParsedQuery): Resposta {
    val n = Texto.nlu(q.textoOriginal)
    val c = compostoDe(q)
    val formula = q.formula ?: c?.formula
    val conc = q.quantidades.mapNotNull { qt -> unidadeDe(qt.unidade)?.takeIf { it.grandeza == "concentracao" }?.let { Qtd(qt.valor, it) } }.firstOrNull()
        ?: throw CalculoInvalido(R.string.erro_ph_informe_conc)
    val pKw = Solucoes.pKwDoPacote(pacote.constantes, pacote.regras.pKwAgua)
    val acoes = listOf(acaoCalculadora(TipoCalculadora.PH))
    val nome = c?.let { nomeDe(it) } ?: formula?.let { FormulaQuimica.tentar(it)?.exibicao() ?: it }

    // ácido ou base FRACOS: a pessoa informa Ka/Kb (ou pKa/pKb)
    val k = q.constantes
    val ka = k["Ka"] ?: k["pKa"]?.let { Math.pow(10.0, -it) }
    val kb = k["Kb"] ?: k["pKb"]?.let { Math.pow(10.0, -it) }
    if (ka != null || kb != null) {
        val tipo = if (ka != null) TipoForte.ACIDO else TipoForte.BASE
        val r = Solucoes.phFraco(t, tipo, conc, ka ?: kb!!, if (ka != null) "Ka" else "Kb", un, pKw.first, pKw.second)
        val titulo = (nome?.let { t(R.string.resp_ph_titulo_nome, it, t.sig(conc.valor, 4), conc.unidade.simbolo) } ?: r.titulo)
        return Resposta(Intent.PH, titulo, resultadoComoBlocos(r), fontes = fonteDe(emptyList()), acoes = acoes)
    }

    val tipo: TipoForte
    val ionizaveis: Int
    when {
        formula != null && ACIDOS_FORTES.containsKey(formula) -> { tipo = TipoForte.ACIDO; ionizaveis = ACIDOS_FORTES.getValue(formula) }
        formula != null && RX_BASE_FORTE.matches(formula) -> {
            tipo = TipoForte.BASE
            ionizaveis = FormulaQuimica.analisar(formula).contagem["O"] ?: 1
        }
        Regex("""\bbases? fortes?\b""").containsMatchIn(n) -> { tipo = TipoForte.BASE; ionizaveis = 1 }
        Regex("""\bacidos? fortes?\b""").containsMatchIn(n) -> { tipo = TipoForte.ACIDO; ionizaveis = 1 }
        formula != null -> throw CalculoInvalido(R.string.erro_ph_precisa_constante, Texto.formulaUnicode(formula))
        else -> throw CalculoInvalido(R.string.erro_ph_diga_qual)
    }
    val saturacao = if (tipo == TipoForte.BASE) Solucoes.solubilidadeDe(formula, pacote.regras.solubilidadeBases) else null
    val r = Solucoes.phForte(t, tipo, conc, ionizaveis, un, pKw.first, pKw.second, saturacao)
    val titulo = if (nome != null) t(R.string.resp_ph_titulo_nome, nome, t.sig(conc.valor, 4), conc.unidade.simbolo) else r.titulo
    return Resposta(
        Intent.PH, titulo, resultadoComoBlocos(r),
        fontes = fonteDe(pacote.constantes.filter { it.id.equals("Kw", true) || it.id.equals("pKw", true) }.flatMap { it.fontes }),
        acoes = acoes
    )
}

// ---- gás ideal ----------------------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.gasIdeal(q: ParsedQuery): Resposta {
    val n = Texto.nlu(q.textoOriginal)
    val r = pacote.constante("R") ?: throw CalculoInvalido(R.string.erro_gas_sem_r)
    val porGrandeza = HashMap<String, Qtd>()
    for (qt in q.quantidades) {
        val u = unidadeDe(qt.unidade) ?: continue
        if (u.grandeza in setOf("pressao", "volume", "temperatura", "quantidade") && porGrandeza.put(u.grandeza, Qtd(qt.valor, u)) != null) {
            throw CalculoInvalido(R.string.erro_gas_duas_vezes, t.grandeza(u.grandeza))
        }
    }
    val usaCntp = Regex("""\b(?:volume molar|cntp|ntp|condicoes (?:normais|padrao))\b""").containsMatchIn(n) && porGrandeza.size < 3
    if (usaCntp) {
        // CNTP adotadas: 1 mol, 0 °C e 1 atm (convenção declarada; os números vêm das unidades e de R)
        porGrandeza.putIfAbsent("quantidade", Qtd(1.0, un.porSimbolo("mol", "quantidade")!!))
        porGrandeza.putIfAbsent("temperatura", Qtd(0.0, un.porSimbolo("°C", "temperatura")!!))
        porGrandeza.putIfAbsent("pressao", Qtd(1.0, un.porSimbolo("atm", "pressao")!!))
    }
    if (porGrandeza.size != 3) {
        throw CalculoInvalido(R.string.erro_gas_tres)
    }
    val destino = q.unidadeDestino?.let { un.buscar(it) }
    fun campo(v: VariavelGas, padrao: String): CampoQtd {
        val dado = porGrandeza[v.grandeza]
        if (dado != null) return CampoQtd(dado.valor, dado.unidade)
        val alvo = destino?.takeIf { it.grandeza == v.grandeza } ?: un.porSimbolo(padrao, v.grandeza) ?: un.base(v.grandeza)!!
        return CampoQtd(null, alvo)
    }
    val res = GasIdeal.resolver(t, campo(VariavelGas.P, "atm"), campo(VariavelGas.V, "L"), campo(VariavelGas.N, "mol"), campo(VariavelGas.T, "K"), r, un)
        .let { if (usaCntp) it.copy(notas = it.notas + GasIdeal.notasCntp(t, r, un)) else it }
    return Resposta(
        Intent.GAS_IDEAL, res.titulo, resultadoComoBlocos(res), fontes = fonteDe(r.fontes.ifEmpty { listOf(Fonte(t(R.string.fonte_constantes_pacote))) }),
        acoes = listOf(acaoCalculadora(TipoCalculadora.GAS_IDEAL))
    )
}

// ---- conversão de unidades ------------------------------------------------------------------------------------------------------------------------

internal suspend fun AnswerBuilder.conversao(q: ParsedQuery): Resposta {
    val qt = q.quantidades.firstOrNull() ?: throw CalculoInvalido(R.string.erro_conv_informe)
    val de = unidadeDe(qt.unidade) ?: throw CalculoInvalido(R.string.erro_conv_unidade_desconhecida, qt.unidade)
    val destino = q.unidadeDestino?.let { un.buscar(it) } ?: throw CalculoInvalido(
        R.string.erro_conv_para_qual, t.sig(qt.valor, 4), de.simbolo,
        un.daGrandeza(de.grandeza).firstOrNull { it.simbolo != de.simbolo }?.simbolo ?: t(R.string.erro_conv_outra_unidade)
    )
    val (valor, passo) = un.converterComPasso(t, qt.valor, de, destino)
    val base = un.base(de.grandeza)
    val passos = mutableListOf<String>()
    if (base != null && (de.offset != 0.0 || destino.offset != 0.0)) {
        val emBase = un.paraBase(qt.valor, de)
        passos += t(R.string.calc_conv_para_base, base.simbolo, t.sig(qt.valor, 6), t.sig(de.fator, 7), t.sig(de.offset, 7), t.sig(emBase, 7))
        passos += t(R.string.calc_conv_da_base, destino.simbolo, t.sig(emBase, 7), t.sig(destino.offset, 7), t.sig(destino.fator, 7), t.sig(valor, 7))
    } else {
        val unidadeBase = base?.simbolo ?: t(R.string.calc_conv_unidade_base)
        passos += t(R.string.calc_conv_fatores, de.simbolo, t.sig(de.fator, 7), unidadeBase, destino.simbolo, t.sig(destino.fator, 7))
        passos += "$passo."
    }
    // "para atm, kPa e torr": as outras unidades de destino da mesma grandeza, uma linha cada (os passos são os do primeiro destino)
    val outros = q.unidadesDestino.filter { it != q.unidadeDestino }.mapNotNull { un.buscar(it, de.grandeza) }
        .filter { it.simbolo != destino.simbolo }
        .map { u -> Bloco.Destaque("${t.sig(qt.valor, 6)} ${de.simbolo} = ${t.sig(un.converterComPasso(t, qt.valor, de, u).first, 7)} ${u.simbolo}") }
    return Resposta(
        Intent.CONVERSAO_UNIDADE, t(R.string.resp_conv_titulo),
        listOf(Bloco.Destaque("${t.sig(qt.valor, 6)} ${de.simbolo} = ${t.sig(valor, 7)} ${destino.simbolo}")) + outros + Bloco.Passos(t(R.string.resp_como_converti), passos),
        fontes = fonteDe(emptyList()), acoes = listOf(acaoCalculadora(TipoCalculadora.UNIDADES))
    )
}
