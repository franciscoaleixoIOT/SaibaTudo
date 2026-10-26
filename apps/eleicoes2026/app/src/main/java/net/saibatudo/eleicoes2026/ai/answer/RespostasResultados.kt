package net.saibatudo.eleicoes2026.ai.answer

import net.saibatudo.eleicoes2026.ai.model.AiFilterExtraction
import net.saibatudo.eleicoes2026.ai.model.AiMenuResponse
import net.saibatudo.eleicoes2026.ai.model.Intent
import net.saibatudo.eleicoes2026.ai.model.ParsedQuery
import net.saibatudo.eleicoes2026.core.constants.AppConstants
import net.saibatudo.eleicoes2026.domain.model.ApuracaoCargo
import net.saibatudo.eleicoes2026.domain.model.FaseEleitoral
import net.saibatudo.eleicoes2026.domain.model.LinhaApuracao
import net.saibatudo.eleicoes2026.domain.model.Texto
import net.saibatudo.eleicoes2026.domain.model.Ufs
import net.saibatudo.eleicoes2026.domain.model.tituloCargo

// Resultados (apuração ao vivo e CSV oficiais) e segundo turno.
// Funções de extensão de [AnswerBuilder] (estado e helpers são `internal` na classe); o despacho por intenção fica em AnswerBuilder.kt.

// ------------------------------------------------------------------ resultados

private val RX_DEPUTADO_GENERICO = Regex("""\bdeputad[oa]s?\b""")

internal suspend fun AnswerBuilder.resultados(p: ParsedQuery): AiMenuResponse {
    val r = resultadosSemAviso(p)
    // abstenção/comparecimento/brancos e nulos: o app não traz esses totais (nem do pacote nem da apuração) — diz isso em vez de ignorar (26/10/2026)
    val norm = Texto.normalizar(p.textoOriginal.orEmpty())
    if (!Regex("""\babstenc|\bcomparecimento\b|\bbrancos? e nulos\b|\bvotos (brancos|nulos)\b""").containsMatchIn(norm)) return r
    return r.copy(directAnswer = "Abstenção, comparecimento e votos brancos e nulos: o app não traz esses totais; consulte ${AppConstants.URL_RESULTADOS_TSE}\n\n${r.directAnswer}")
}

private suspend fun AnswerBuilder.resultadosSemAviso(p: ParsedQuery): AiMenuResponse {
    val textoNorm = (p.textoOriginal ?: "").lowercase()
    // "deputado mais votado" sem federal/estadual: a Câmara é o padrão e o aviso oferece a Assembleia (paridade com o site)
    val generico = if (p.cargo == null && RX_DEPUTADO_GENERICO.containsMatchIn(textoNorm)) "DEPUTADO_FEDERAL" else null
    val cargo = p.cargo ?: generico
    val abrir = AiFilterExtraction(cargo = cargo, estadoUf = p.uf, resetar = true)
    if (!fase.mostraResultados) {
        return AiMenuResponse(
            targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = abrir,
            directAnswer = "A votação ainda não ocorreu.\n" +
                "1º turno: ${dataBr(regras.turno1)}, das 8h às 17h (Brasília)\n" +
                "Os resultados oficiais são divulgados pelo TSE em ${AppConstants.URL_RESULTADOS_TSE} e aparecerão aqui durante a apuração.",
            suggestedQuestions = listOf("Calendário eleitoral 2026", "Quem disputa a Presidência?"), fonte = fonte, origem = origem
        )
    }
    // "Lula foi eleito?", "quantos votos o X teve no 2º turno?": resultado do candidato citado (apuração ao vivo ou pacote) — 26/10/2026
    if (p.nome != null || p.numero != null) {
        resultadoCandidato(p, abrir)?.let { return it }
    }
    val cargosValidos = setOf("PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO_FEDERAL", "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL")
    if (cargo == null || cargo !in cargosValidos) return panoramaResultados(p, abrir)
    var cargoConsulta = cargo
    val uf = if (cargo == "PRESIDENTE") "BR" else (p.uf ?: ufPadrao)
    if (uf == "DF" && cargoConsulta == "DEPUTADO_ESTADUAL") {
        cargoConsulta = "DEPUTADO_DISTRITAL"
    }
    // Governador/Senador sem estado: resumo nacional pelo pacote em vez de pedir a UF (paridade com answers.js, 21/10/2026). Com UF padrão,
    // só quando a pergunta pede o país ("governadores", "já ganhou", "todos os estados").
    if (p.uf == null && cargoConsulta in setOf("GOVERNADOR", "SENADOR") && (uf == null || RX_RESULTADO_NACIONAL.containsMatchIn(textoNorm))) {
        resultadosNacionais(p, cargoConsulta, abrir)?.let { return anotarResultado(it, generico, null, null) }
    }
    if (uf == null) {
        return AiMenuResponse(
            targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = abrir,
            directAnswer = "De qual estado? Informe a UF (ex.: \"Resultado para ${tituloCargo(cargoConsulta)} em SP\").",
            suggestedQuestions = listOf("Resultado para ${tituloCargo(cargoConsulta)} em SP"), fonte = fonte, origem = origem
        )
    }
    val ehLegislativo = cargoConsulta in setOf("SENADOR", "DEPUTADO_FEDERAL", "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL")
    val turno = if (ehLegislativo) 1 else (p.turno ?: if (fase == FaseEleitoral.ENTRE_TURNOS || fase == FaseEleitoral.DIA_2T || fase == FaseEleitoral.POS_ELEICAO) 2 else 1)
    val ap = obterApuracao(cargoConsulta, uf, turno) ?: (if (turno == 2) obterApuracao(cargoConsulta, uf, 1) else null)
    val comVotos = ap != null && ap.temVotos
    val r = if (comVotos) respostaApuracao(p, ap!!, abrir) else respostaResultadosCsv(p, cargoConsulta, uf, turno, abrir)
    val maisVotado = if (comVotos && textoNorm.contains("mais votad")) ap!!.linhas.maxByOrNull { it.votos } else null
    return anotarResultado(r, generico, uf, maisVotado)
}

/** Linhas que antecedem a resposta de resultados: o mais votado (quando perguntado) e o aviso de "deputado" genérico. */
internal fun AnswerBuilder.anotarResultado(r: AiMenuResponse, generico: String?, uf: String?, maisVotado: LinhaApuracao?): AiMenuResponse {
    val linhas = mutableListOf<String>()
    if (maisVotado != null) {
        linhas += "Mais votado(a): ${maisVotado.nome} (${maisVotado.partido}), nº ${maisVotado.numero} — ${inteiro.format(maisVotado.votos)} votos" +
            (maisVotado.percentual?.let { " ($it%)" } ?: "") + (if (maisVotado.eleito) " — ELEITO" else "") + "."
    }
    if (generico == "DEPUTADO_FEDERAL") {
        val onde = if (uf != null && uf != "BR") " em $uf" else ""
        linhas += "Você perguntou por \"deputado\": mostrei Deputado Federal$onde. Para a Assembleia, pergunte \"deputado estadual mais votado$onde\"."
    }
    val atual = r.directAnswer
    if (linhas.isEmpty() || atual == null) return r
    return r.copy(directAnswer = linhas.joinToString("\n") + "\n\n" + atual)
}

/**
 * Resultado de UM candidato citado pela pergunta: linha dele na apuração ao vivo (turno pedido; Executivo depois do 1º turno: 2º, senão 1º) ou,
 * sem apuração, o que o pacote (CSV oficial do TSE) traz. null quando o nome não identifica um candidato (segue o fluxo por cargo). Texto = site.
 */
internal suspend fun AnswerBuilder.resultadoCandidato(p: ParsedQuery, fi: AiFilterExtraction): AiMenuResponse? {
    val c = escolher(localizar(p), p.nome) ?: return null
    val cargo = c.cargoCodigo
    val uf = c.estadoUf
    val ehLegislativo = cargo in setOf("SENADOR", "DEPUTADO_FEDERAL", "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL")
    val depoisDo1T = fase in setOf(FaseEleitoral.ENTRE_TURNOS, FaseEleitoral.DIA_2T, FaseEleitoral.POS_ELEICAO)
    val turno = if (ehLegislativo) 1 else (p.turno ?: if (depoisDo1T) 2 else 1)
    var ap = obterApuracao(cargo, uf, turno)
    if (!(ap != null && ap.temVotos) && turno == 2 && p.turno == null) ap = obterApuracao(cargo, uf, 1)
    val onde = if (uf != "BR") " ${Ufs.em(uf)}" else ""
    val cabeca = "${c.nomeUrna} (${c.partido}, nº ${c.numero}) — ${tituloCargo(cargo)}$onde"
    val linha = if (ap != null && ap.temVotos) ap.linhas.firstOrNull { it.sqCandidato == c.id || it.nome.equals(c.nomeUrna, ignoreCase = true) } else null
    val sugestoes = listOf("Resultado para ${tituloCargo(cargo)}${if (uf != "BR") " em $uf" else ""}", "Calendário eleitoral 2026")
    fun resposta(texto: String, fonteTexto: String) = AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = fi, abrirResultados = true,
        directAnswer = texto, candidateIds = listOf(c.id), suggestedQuestions = sugestoes, fonte = fonteTexto, origem = origem
    )
    if (linha != null && ap != null) {
        val ord = ap.linhas.sortedByDescending { it.votos }
        val situacao = if (linha.eleito) " — ELEITO" else if (linha.segundoTurno) " — 2º TURNO" else if (ap.totalizacaoFinal) " — NÃO ELEITO" else ""
        val andamento = if (ap.totalizacaoFinal) "Totalização final." else
            "Apuração em andamento" + (ap.secoesTotalizadasPct?.let { " (${it}% das seções totalizadas)" } ?: "") + "."
        return resposta(
            "$cabeca, ${ap.turno}º turno: ${inteiro.format(linha.votos)} votos${linha.percentual?.let { " ($it%)" } ?: ""}$situacao\n" +
                "• ${ord.indexOf(linha) + 1}º colocado(a) entre ${ap.linhas.size} na apuração. $andamento\n" +
                "Dados divulgados pelo TSE em ${ap.geradoEm}; números exibidos como publicados (${AppConstants.URL_RESULTADOS_TSE}).",
            "Fonte: TSE – resultados.tse.jus.br (ao vivo), consultado agora."
        )
    }
    val r = c.resultado ?: return resposta(
        "$cabeca: ainda não há resultado oficial publicado para este candidato (pacote de dados e apuração ao vivo do TSE).\n" +
            "A apuração é divulgada em ${AppConstants.URL_RESULTADOS_TSE}.", fonte
    )
    val ptBr = java.util.Locale.forLanguageTag("pt-BR")
    val turnos = r.turnos.keys.sorted().map { n ->
        val t = r.turnos.getValue(n)
        "${n}º turno: ${t.votos?.let { "${inteiro.format(it)} votos" } ?: "votos não publicados no pacote"}" +
            (t.percentual?.let { " (${String.format(ptBr, "%.2f", it)}%)" } ?: "") + (t.situacao?.let { " — ${it.uppercase(ptBr)}" } ?: "")
    }
    var texto = if (turnos.isNotEmpty()) "$cabeca, ${turnos.joinToString("; ")}" else cabeca
    r.situacaoTotalizacao?.let { texto += "\n• Situação na totalização oficial do TSE: $it" }
    if (r.segundoTurno && !r.turnos.containsKey(2)) {
        texto += if (fase == FaseEleitoral.POS_ELEICAO)
            "\n• O 2º turno ocorreu em ${dataBr(regras.turno2)}; não foi possível consultar agora a apuração oficial do TSE — resultado em ${AppConstants.URL_RESULTADOS_TSE}"
        else "\n• Disputa o 2º turno em ${dataBr(regras.turno2)}"
    }
    return resposta(texto, fonte)
}

internal suspend fun AnswerBuilder.panoramaResultados(p: ParsedQuery, fi: AiFilterExtraction): AiMenuResponse {
    val turno = p.turno ?: if (fase in setOf(FaseEleitoral.ENTRE_TURNOS, FaseEleitoral.DIA_2T, FaseEleitoral.POS_ELEICAO)) 2 else 1
    val uf = p.uf ?: ufPadrao
    val apPres = obterApuracao("PRESIDENTE", "BR", turno) ?: (if (turno == 2) obterApuracao("PRESIDENTE", "BR", 1) else null)
    val comVotosPres = apPres != null && apPres.temVotos
    val apGov = if (uf != null) (obterApuracao("GOVERNADOR", uf, turno) ?: (if (turno == 2) obterApuracao("GOVERNADOR", uf, 1) else null)) else null
    val comVotosGov = apGov != null && apGov.temVotos

    val cabecalho = when (fase) {
        FaseEleitoral.DIA_1T -> "Status da votação e apuração — 1º turno (${dataBr(regras.turno1)}, votação das 8h às 17h pelo horário de Brasília):"
        FaseEleitoral.DIA_2T -> "Status da votação e apuração — 2º turno (${dataBr(regras.turno2)}, votação das 8h às 17h pelo horário de Brasília):"
        FaseEleitoral.ENTRE_TURNOS -> "Status da apuração — 1º turno realizado em ${dataBr(regras.turno1)} (2º turno em ${dataBr(regras.turno2)}):"
        else -> "Status dos resultados das Eleições 2026 (1º turno em ${dataBr(regras.turno1)} e 2º turno em ${dataBr(regras.turno2)}):"
    }

    val ids = mutableListOf<String>()
    val linhaPres = if (comVotosPres) {
        val ord = apPres!!.linhas.sortedByDescending { it.votos }
        val and = if (apPres.totalizacaoFinal) "Totalização final" else
            "Apuração em andamento" + (apPres.secoesTotalizadasPct?.let { " (${it}% das seções totalizadas)" } ?: "")
        val top = ord.take(2).joinToString(" | ") { l ->
            "${l.numero} — ${l.nome} (${l.partido}): ${inteiro.format(l.votos)} votos" +
                (l.percentual?.let { " ($it%)" } ?: "") +
                (if (l.eleito) " — ELEITO" else if (l.segundoTurno) " — 2º TURNO" else "")
        }
        ord.take(2).mapNotNull { it.sqCandidato }.filter { data.porId.containsKey(it) }.forEach { ids += it }
        "• Presidente da República (${apPres.turno}º turno — $and): $top"
    } else {
        val daquiPres = data.candidatos.filter { it.cargoCodigo == "PRESIDENTE" && it.estadoUf == "BR" && it.resultado != null }
        val elPres = daquiPres.firstOrNull { it.resultado?.eleito == true }
        val clPres = daquiPres.filter { it.resultado?.segundoTurno == true }.sortedByDescending { it.resultado?.turnos?.get(1)?.votos ?: 0L }
        when {
            elPres != null -> {
                ids += elPres.id
                "• Presidente da República: ${elPres.numero} — ${elPres.nomeUrna} (${elPres.partido}) — ELEITO segundo o TSE"
            }
            clPres.size >= 2 -> {
                ids += clPres.take(2).map { it.id }
                val dupla = clPres.take(2).joinToString(" e ") { "${it.numero} — ${it.nomeUrna} (${it.partido})" }
                if (fase == FaseEleitoral.POS_ELEICAO)
                    "• Presidente da República: 2º turno em ${dataBr(regras.turno2)} entre $dupla — resultado oficial em ${AppConstants.URL_RESULTADOS_TSE} (apuração ao vivo indisponível agora)"
                else "• Presidente da República (2º turno): disputam $dupla"
            }
            else -> "• Presidente da República: apuração divulgada em tempo real pelo TSE em ${AppConstants.URL_RESULTADOS_TSE}"
        }
    }

    var linhaGov = ""
    if (uf != null) {
        if (comVotosGov) {
            val ordG = apGov!!.linhas.sortedByDescending { it.votos }
            val andG = if (apGov.totalizacaoFinal) "Totalização final" else
                "Apuração em andamento" + (apGov.secoesTotalizadasPct?.let { " (${it}% das seções totalizadas)" } ?: "")
            val topG = ordG.take(2).joinToString(" | ") { l ->
                "${l.numero} — ${l.nome} (${l.partido}): ${inteiro.format(l.votos)} votos" +
                    (l.percentual?.let { " ($it%)" } ?: "") +
                    (if (l.eleito) " — ELEITO" else if (l.segundoTurno) " — 2º TURNO" else "")
            }
            linhaGov = "\n• Governador ($uf, ${apGov.turno}º turno — $andG): $topG"
        } else {
            val daquiGov = data.candidatos.filter { it.cargoCodigo == "GOVERNADOR" && it.estadoUf == uf && it.resultado != null }
            val elGov = daquiGov.firstOrNull { it.resultado?.eleito == true }
            val clGov = daquiGov.filter { it.resultado?.segundoTurno == true }.sortedByDescending { it.resultado?.turnos?.get(1)?.votos ?: 0L }
            if (elGov != null) {
                linhaGov = "\n• Governador ($uf): ${elGov.numero} — ${elGov.nomeUrna} (${elGov.partido}) — ELEITO segundo o TSE"
            } else if (clGov.size >= 2) {
                val duplaG = clGov.take(2).joinToString(" e ") { "${it.numero} — ${it.nomeUrna} (${it.partido})" }
                linhaGov = if (fase == FaseEleitoral.POS_ELEICAO)
                    "\n• Governador ($uf): 2º turno em ${dataBr(regras.turno2)} entre $duplaG — resultado oficial em ${AppConstants.URL_RESULTADOS_TSE} (apuração ao vivo indisponível agora)"
                else "\n• Governador ($uf — 2º turno): disputam $duplaG"
            }
        }
    }

    val texto = "$cabecalho\n$linhaPres$linhaGov\n" +
        "De qual cargo você quer ver os resultados?\n" +
        "• Presidente, Governador, Senador, Deputado Federal e Deputado Estadual/Distrital\n" +
        "• Para cargos estaduais, informe também o estado (ex.: \"Resultado para Deputado Federal em SP\")"
    return AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = fi,
        abrirResultados = true, directAnswer = texto, candidateIds = ids,
        suggestedQuestions = listOf("Resultado para Presidente", "Resultado para Governador em ${ufPadrao ?: "SP"}", "Resultado para Deputado Federal em ${ufPadrao ?: "SP"}"),
        fonte = if (comVotosPres || comVotosGov) "Fonte: TSE – resultados.tse.jus.br (ao vivo), consultado agora." else fonte,
        origem = origem
    )
}

internal suspend fun AnswerBuilder.obterApuracao(cargo: String, uf: String, turno: Int): ApuracaoCargo? =
    try { apuracao?.obter(cargo, uf, turno) } catch (_: Exception) { null }

internal fun AnswerBuilder.respostaApuracao(p: ParsedQuery, ap: ApuracaoCargo, filtros: AiFilterExtraction): AiMenuResponse {
    val ordenadas = ap.linhas.sortedByDescending { it.votos }
    val eleitos = ordenadas.filter { it.eleito }
    val ehProporcional = ap.cargo in setOf("DEPUTADO_FEDERAL", "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL")
    val max = if (ap.cargo == "PRESIDENTE" || ap.linhas.size <= 12) ordenadas.size else if (ehProporcional) 15 else 10
    val andamento = if (ap.totalizacaoFinal) "Totalização final." else
        "Apuração em andamento" + (ap.secoesTotalizadasPct?.let { " (${it}% das seções totalizadas)" } ?: "") + "."
    val texto = buildString {
        append("${tituloCargo(ap.cargo)}${if (ap.uf != "BR") " — ${ap.uf}" else ""}, ${ap.turno}º turno. $andamento")
        if (ehProporcional && eleitos.isNotEmpty()) {
            append("\n\nDeputados eleitos (${eleitos.size}):")
            eleitos.forEach {
                append("\n• ${it.numero} — ${it.nome} (${it.partido}): ${inteiro.format(it.votos)} votos — ELEITO")
            }
            append("\n\nMais votados na apuração geral:")
        }
        ordenadas.take(max).forEach {
            append("\n• ${it.numero} — ${it.nome} (${it.partido}): ${inteiro.format(it.votos)} votos")
            it.percentual?.let { pc -> append(" ($pc%)") }
            if (it.eleito && (!ehProporcional || eleitos.isEmpty())) append(" — ELEITO")
            else if (it.segundoTurno) append(" — 2º TURNO")
        }
        if (ordenadas.size > max) append("\n…e outros ${ordenadas.size - max}.")
        append("\nDados divulgados pelo TSE em ${ap.geradoEm}; números exibidos como publicados (${AppConstants.URL_RESULTADOS_TSE}).")
    }
    return AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = filtros,
        directAnswer = texto, abrirResultados = true, candidateIds = ordenadas.take(10).mapNotNull { it.sqCandidato }
            .filter { data.porId.containsKey(it) },
        suggestedQuestions = listOf("Resultado para Governador em ${ap.uf.takeIf { it != "BR" } ?: ufPadrao ?: "SP"}", "Resultado para Presidente"),
        fonte = "Fonte: TSE – resultados.tse.jus.br (ao vivo), consultado agora.", origem = origem
    )
}

internal fun AnswerBuilder.respostaResultadosCsv(p: ParsedQuery, cargo: String, uf: String, turno: Int, filtros: AiFilterExtraction): AiMenuResponse {
    val daqui = data.candidatos.filter { it.cargoCodigo == cargo && it.estadoUf == uf && it.resultado != null }
    val eleitos = daqui.filter { it.resultado?.eleito == true }
    val classificados = daqui.filter { it.resultado?.segundoTurno == true }.sortedByDescending { it.resultado?.turnos?.get(1)?.votos ?: 0L }
    val onde = if (uf != "BR") " ${Ufs.em(uf)}" else ""
    val texto = when {
        eleitos.isNotEmpty() -> "Eleito${if (eleitos.size > 1) "s" else ""} para ${tituloCargo(cargo)}$onde segundo o TSE${if (eleitos.size > 1) " (${eleitos.size})" else ""}:" +
            eleitos.joinToString("") { "\n• ${it.numero} — ${it.nomeUrna} (${it.partido})" }
        classificados.size >= 2 && fase == FaseEleitoral.POS_ELEICAO ->
            "O 2º turno para ${tituloCargo(cargo)}$onde ocorreu em ${dataBr(regras.turno2)} entre os classificados no 1º turno, segundo o TSE:" +
                classificados.joinToString("") { "\n• ${it.numero} — ${it.nomeUrna} (${it.partido})" } +
                "\nNão foi possível consultar agora a apuração oficial do 2º turno; o resultado está em ${AppConstants.URL_RESULTADOS_TSE}"
        classificados.size >= 2 -> "Ninguém foi eleito no 1º turno para ${tituloCargo(cargo)}$onde; disputam o 2º turno (${dataBr(regras.turno2)}), segundo o TSE:" +
            classificados.joinToString("") { "\n• ${it.numero} — ${it.nomeUrna} (${it.partido})" }
        daqui.isNotEmpty() -> "O TSE já publicou a situação de totalização, mas ainda não há eleito definido para ${tituloCargo(cargo)}$onde:" +
            daqui.filter { it.resultado?.situacaoTotalizacao != null }.take(6).joinToString("") { "\n• ${it.nomeUrna}: ${it.resultado?.situacaoTotalizacao}" }
        else -> "Ainda não há resultado oficial publicado para ${tituloCargo(cargo)}$onde (${turno}º turno).\n" +
            "A apuração do TSE é divulgada em ${AppConstants.URL_RESULTADOS_TSE}; assim que estiver disponível, aparece aqui."
    }
    return AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = filtros,
        abrirResultados = true, directAnswer = texto, candidateIds = (if (eleitos.isNotEmpty()) eleitos else classificados).take(6).map { it.id },
        suggestedQuestions = listOf("Calendário eleitoral 2026", "Quem disputa a Presidência?"), fonte = fonte, origem = origem
    )
}

internal suspend fun AnswerBuilder.segundoTurno(p: ParsedQuery): AiMenuResponse {
    val cargo = p.cargo
    val textoNorm = Texto.normalizar(p.textoOriginal)
    val ehLegislativo = (cargo != null && listOf("SENADOR", "DEPUTADO_FEDERAL", "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL").contains(cargo)) ||
        Regex("""\b(senad\w*|deputad\w*)\b""").containsMatchIn(textoNorm)

    val dataTurno1 = dataBr(regras.turno1)
    val dataTurno2 = dataBr(regras.turno2)

    // 1. Cargo legislativo: não tem segundo turno
    if (ehLegislativo) {
        val nomeCargo = if (cargo != null) tituloCargo(cargo) else if (textoNorm.contains("senad")) "Senador" else "Deputado"
        return AiMenuResponse(
            targetRoute = "info/calendario", menuId = AppConstants.MENU_CALENDARIO, intent = Intent.SEGUNDO_TURNO,
            directAnswer = "Não há 2º turno para $nomeCargo.\n" +
                "• A eleição para o Poder Legislativo (Senadores e Deputados) é decidida em turno único no 1º turno ($dataTurno1)\n" +
                "• O 2º turno existe apenas para cargos do Poder Executivo: Presidente da República e Governador de Estado/DF quando nenhum candidato alcança mais de 50% dos votos válidos",
            suggestedQuestions = listOfNotNull("Segundo turno para Presidente", ufPadrao?.let { "Segundo turno para Governador em $it" } ?: "Segundo turno para Governador", "Calendário eleitoral 2026"),
            fonte = fonte, origem = origem
        )
    }

    // 2. Cargo do Executivo especificado (Presidente ou Governador)
    if (cargo == "PRESIDENTE" || cargo == "GOVERNADOR") {
        val uf = if (cargo == "PRESIDENTE") "BR" else (p.uf ?: ufPadrao)
        val onde = if (uf != null && uf != "BR") " ${Ufs.em(uf)}" else ""
        val rotuloCargo = if (cargo == "PRESIDENTE") "Presidente da República" else "Governador$onde"

        val pos = fase == FaseEleitoral.POS_ELEICAO
        // 2º turno já realizado: primeiro a apuração ao vivo do turno 2 (eleito(a) e colocados), no passado (26/10/2026)
        if (pos) {
            val ap2 = obterApuracao(cargo, uf ?: "BR", 2)
            if (ap2 != null && ap2.temVotos) return segundoTurnoOcorrido(rotuloCargo, ap2)
        }
        val naoHouve = if (pos) "Não houve" else "Não haverá"
        val rodape2T = if (pos) "• Não foi possível consultar agora a apuração oficial do 2º turno; o resultado está em ${AppConstants.URL_RESULTADOS_TSE}"
        else "• Votação do 2º turno: $dataTurno2, das 8h às 17h (horário de Brasília)"
        val ap = obterApuracao(cargo, uf ?: "BR", 1)
        val daqui = data.candidatos.filter { it.cargoCodigo == cargo && it.estadoUf == (uf ?: "BR") && it.resultado != null }
        val eleitos = daqui.filter { it.resultado?.eleitoNoPrimeiroTurno == true }

        if (ap != null && ap.temVotos) {
            val lt = leituraSegundoTurno(ap)
            val l1 = lt.l1
            val l2 = lt.l2

            if (l1 != null && lt.tipo == TipoSegundoTurno.ELEITO) {
                return AiMenuResponse(
                    targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                    directAnswer = "$naoHouve 2º turno para $rotuloCargo.\n" +
                        "• ${l1.nome} (${l1.partido}) foi eleito(a) em 1º turno com ${l1.percentual}% dos votos válidos (${inteiro.format(l1.votos)} votos)\n" +
                        (if (lt.maioria) "• Como obteve a maioria absoluta dos votos válidos (mais de 50%), a eleição foi liquidada em turno único"
                        else "• Situação informada pela apuração oficial do TSE"),
                    candidateIds = listOfNotNull(l1.sqCandidato).filter { data.porId.containsKey(it) },
                    suggestedQuestions = listOf("Quem foi eleito Governador?", "Resultado para Senador"), fonte = fonte, origem = origem
                )
            }

            if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.SEGUNDO) {
                return AiMenuResponse(
                    targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                    directAnswer = (if (pos) "Houve 2º turno para $rotuloCargo em $dataTurno2.\n" else "Sim, haverá 2º turno para $rotuloCargo.\n") +
                        "• Nenhum candidato alcançou mais de 50% dos votos válidos no 1º turno\n" +
                        "• ${if (pos) "Disputaram" else "Disputam"} o 2º turno os dois candidatos mais votados no 1º turno:\n" +
                        "  1º: ${l1.nome} (${l1.partido}) — ${l1.percentual}% (${inteiro.format(l1.votos)} votos)\n" +
                        "  2º: ${l2.nome} (${l2.partido}) — ${l2.percentual}% (${inteiro.format(l2.votos)} votos)\n" +
                        rodape2T,
                    candidateIds = listOfNotNull(l1.sqCandidato, l2.sqCandidato).filter { data.porId.containsKey(it) },
                    suggestedQuestions = listOf("Pesquisas para ${tituloCargo(cargo)}", "Calendário eleitoral 2026"), fonte = fonte, origem = origem
                )
            }

            if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.ANDAMENTO) {
                return AiMenuResponse(
                    targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                    directAnswer = "Definição de 2º turno para $rotuloCargo em andamento (${ap.secoesTotalizadasPct ?: "0"}% apurado):\n" +
                        "• Até o momento, nenhum candidato atingiu mais de 50% dos votos válidos\n" +
                        "• Liderança parcial:\n" +
                        "  1º: ${l1.nome} (${l1.partido}) — ${l1.percentual}%\n" +
                        "  2º: ${l2.nome} (${l2.partido}) — ${l2.percentual}%\n" +
                        "• Se a apuração terminar sem que o primeiro alcance mais de 50%, haverá 2º turno em $dataTurno2",
                    candidateIds = listOfNotNull(l1.sqCandidato, l2.sqCandidato).filter { data.porId.containsKey(it) },
                    suggestedQuestions = listOf("Resultado para ${tituloCargo(cargo)}", "Calendário eleitoral 2026"), fonte = fonte, origem = origem
                )
            }
        }

        if (eleitos.isNotEmpty()) {
            val el = eleitos.first()
            return AiMenuResponse(
                targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                directAnswer = "$naoHouve 2º turno para $rotuloCargo.\n" +
                    "• ${el.nomeUrna} (${el.partido}) foi eleito(a) em 1º turno segundo os dados oficiais do TSE\n" +
                    "• A eleição está definida sem necessidade de 2º turno",
                candidateIds = listOf(el.id),
                suggestedQuestions = listOf("Quem foi eleito Governador?", "Resultado para Senador"), fonte = fonte, origem = origem
            )
        }

        // Sem apuração ao vivo: o PACOTE (CSV oficial do TSE) pode trazer os classificados com a situação "2º TURNO"
        val classificados = daqui.filter { it.resultado?.segundoTurno == true }.sortedByDescending { it.resultado?.turnos?.get(1)?.votos ?: 0L }
        if (classificados.size >= 2) {
            fun linha(c: net.saibatudo.eleicoes2026.domain.model.Candidate): String {
                val t1 = c.resultado?.turnos?.get(1)
                val numeros = t1?.votos?.let { v -> " — ${t1?.percentual?.let { pc -> "${String.format(java.util.Locale.forLanguageTag("pt-BR"), "%.2f", pc)}% " } ?: ""}(${inteiro.format(v)} votos)" } ?: ""
                return "${c.nomeUrna} (${c.partido})$numeros"
            }
            return AiMenuResponse(
                targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                directAnswer = (if (pos) "Houve 2º turno para $rotuloCargo em $dataTurno2.\n" else "Sim, haverá 2º turno para $rotuloCargo.\n") +
                    "• Nenhum candidato alcançou mais de 50% dos votos válidos no 1º turno\n" +
                    "• ${if (pos) "Disputaram" else "Disputam"} o 2º turno, segundo a totalização oficial do TSE:\n" +
                    "  1º: ${linha(classificados[0])}\n" +
                    "  2º: ${linha(classificados[1])}\n" +
                    rodape2T,
                candidateIds = classificados.take(2).map { it.id },
                suggestedQuestions = listOf("Pesquisas para ${tituloCargo(cargo)}", "Calendário eleitoral 2026"), fonte = fonte, origem = origem
            )
        }

        // O 1º turno já passou e nem a apuração ao vivo nem o pacote definem: não repete "depende da apuração" como se ela não tivesse ocorrido
        if (fase in setOf(FaseEleitoral.ENTRE_TURNOS, FaseEleitoral.DIA_2T, FaseEleitoral.POS_ELEICAO)) {
            return AiMenuResponse(
                targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
                directAnswer = "Segundo turno para $rotuloCargo:\n" +
                    "• O 1º turno foi em $dataTurno1, mas não foi possível consultar agora a apuração oficial do TSE para confirmar o resultado\n" +
                    (if (pos) "• Há 2º turno quando nenhum candidato obtém mais de 50% dos votos válidos; onde houve, a votação foi em $dataTurno2\n"
                    else "• Há 2º turno quando nenhum candidato obtém mais de 50% dos votos válidos; se houver, a votação é em $dataTurno2\n") +
                    "• Confira em ${AppConstants.URL_RESULTADOS_TSE} ou tente de novo em instantes",
                suggestedQuestions = listOf("Resultado para ${tituloCargo(cargo)}${if (cargo == "GOVERNADOR" && uf != null) " em $uf" else ""}", "Calendário eleitoral 2026"),
                fonte = fonte, origem = origem
            )
        }

        return AiMenuResponse(
            targetRoute = "info/calendario", menuId = AppConstants.MENU_CALENDARIO, intent = Intent.SEGUNDO_TURNO,
            directAnswer = "Segundo turno para $rotuloCargo:\n" +
                "• A realização de 2º turno depende da apuração do 1º turno ($dataTurno1)\n" +
                "• Só haverá 2º turno se nenhum candidato obtiver a maioria absoluta (mais de 50% dos votos válidos, desconsiderando brancos e nulos)\n" +
                "• Se houver 2º turno, a votação será no dia $dataTurno2, entre os dois candidatos mais votados",
            suggestedQuestions = listOfNotNull(
                if (cargo == "PRESIDENTE") "Quem disputa a Presidência?" else "Candidatos a Governador$onde",
                "Calendário eleitoral 2026"
            ),
            fonte = fonte, origem = origem
        )
    }

    // 3. Pergunta genérica (sem cargo): overview completo para a localização do usuário
    val jaVotou = fase in setOf(FaseEleitoral.ENTRE_TURNOS, FaseEleitoral.DIA_2T, FaseEleitoral.POS_ELEICAO)
    val pos = fase == FaseEleitoral.POS_ELEICAO
    val uf = p.uf ?: ufPadrao
    var statusPresidente: String? = null
    var statusGov: String? = null

    /** Depois do 2º turno: o que a apuração ao vivo do turno 2 diz (eleito(a) ou andamento); null se não respondeu. */
    suspend fun statusTurno2(cargo: String, ufAp: String): String? {
        if (!pos) return null
        val ap2 = obterApuracao(cargo, ufAp, 2)
        if (ap2 == null || !ap2.temVotos) return null
        val ord = ap2.linhas.sortedByDescending { it.votos }
        ord.firstOrNull { it.eleito }?.let { el -> return "Houve 2º turno em $dataTurno2 — ${el.nome} (${el.partido}) eleito(a) com ${el.percentual}% dos votos válidos" }
        val seg = ord.getOrNull(1)
        return "Houve 2º turno em $dataTurno2 — apuração em andamento${ap2.secoesTotalizadasPct?.let { " ($it%)" } ?: ""}: ${ord[0].nome} (${ord[0].percentual}%) e ${seg?.nome ?: "—"} (${seg?.percentual ?: "—"}%)"
    }

    statusPresidente = statusTurno2("PRESIDENTE", "BR")
    val apPres = if (statusPresidente != null) null else obterApuracao("PRESIDENTE", "BR", 1)
    if (apPres != null && apPres.temVotos) {
        val lt = leituraSegundoTurno(apPres)
        val l1 = lt.l1
        val l2 = lt.l2
        if (l1 != null && lt.tipo == TipoSegundoTurno.ELEITO) {
            statusPresidente = "${if (pos) "Não houve" else "Não haverá"} 2º turno — ${l1.nome} (${l1.partido}) foi eleito(a) em 1º turno (${l1.percentual}%)"
        } else if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.SEGUNDO) {
            statusPresidente = if (pos) "Houve 2º turno entre ${l1.nome} (${l1.percentual}% no 1º turno) e ${l2.nome} (${l2.percentual}%) — resultado oficial em ${AppConstants.URL_RESULTADOS_TSE}"
            else "Sim, haverá 2º turno entre ${l1.nome} (${l1.percentual}%) e ${l2.nome} (${l2.percentual}%)"
        } else if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.ANDAMENTO) {
            statusPresidente = "Apuração em andamento (${apPres.secoesTotalizadasPct ?: "0"}%) — liderança de ${l1.nome} (${l1.percentual}%) e ${l2.nome} (${l2.percentual}%)"
        }
    }
    if (statusPresidente == null) statusPresidente = statusSegundoTurnoPacote("PRESIDENTE", "BR")
    if (statusPresidente == null) {
        statusPresidente = if (jaVotou) "não foi possível consultar agora a apuração oficial do 1º turno ($dataTurno1); confira em ${AppConstants.URL_RESULTADOS_TSE}"
        else "Só haverá se nenhum candidato atingir mais de 50% dos votos válidos no 1º turno ($dataTurno1)"
    }

    if (uf != null) {
        statusGov = statusTurno2("GOVERNADOR", uf)
        val apGov = if (statusGov != null) null else obterApuracao("GOVERNADOR", uf, 1)
        if (apGov != null && apGov.temVotos) {
            val lt = leituraSegundoTurno(apGov)
            val l1 = lt.l1
            val l2 = lt.l2
            if (l1 != null && lt.tipo == TipoSegundoTurno.ELEITO) {
                statusGov = "${if (pos) "Não houve" else "Não haverá"} 2º turno — ${l1.nome} (${l1.partido}) foi eleito(a) em 1º turno (${l1.percentual}%)"
            } else if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.SEGUNDO) {
                statusGov = if (pos) "Houve 2º turno entre ${l1.nome} (${l1.percentual}% no 1º turno) e ${l2.nome} (${l2.percentual}%) — resultado oficial em ${AppConstants.URL_RESULTADOS_TSE}"
                else "Sim, haverá 2º turno entre ${l1.nome} (${l1.percentual}%) e ${l2.nome} (${l2.percentual}%)"
            } else if (l1 != null && l2 != null && lt.tipo == TipoSegundoTurno.ANDAMENTO) {
                statusGov = "Apuração em andamento (${apGov.secoesTotalizadasPct ?: "0"}%) — parcial: ${l1.nome} (${l1.percentual}%) e ${l2.nome} (${l2.percentual}%)"
            }
        }
        if (statusGov == null) statusGov = statusSegundoTurnoPacote("GOVERNADOR", uf)
        if (statusGov == null) {
            statusGov = if (jaVotou) "não foi possível consultar agora a apuração oficial do 1º turno; confira em ${AppConstants.URL_RESULTADOS_TSE}"
            else "Segue a mesma regra no seu estado — haverá 2º turno se nenhum candidato alcançar mais de 50% dos votos válidos"
        }
    }

    val texto = buildString {
        append("Segundo turno nas Eleições 2026:\n")
        append("• Só para Presidente e Governador, quando nenhum candidato ${if (pos) "alcançou" else "alcança"} mais de 50% dos votos válidos no 1º turno ($dataTurno1). Senadores e Deputados são eleitos em turno único\n")
        append("• Presidente da República: $statusPresidente\n")
        if (uf != null) {
            append("• Governador ($uf): $statusGov\n")
        } else {
            append(if (pos) "• Governador: cada estado teve ou não 2º turno conforme os votos válidos locais; pergunte \"Segundo turno para Governador em SP\"\n"
            else "• Governador: cada estado define individualmente se haverá 2º turno de acordo com os votos válidos locais\n")
        }
        append(if (pos) "• O 2º turno, onde houve, foi em $dataTurno2, das 8h às 17h (horário de Brasília)."
        else "• Data da votação do 2º turno (onde houver): $dataTurno2, das 8h às 17h (horário de Brasília).")
    }

    return AiMenuResponse(
        targetRoute = "info/calendario", menuId = AppConstants.MENU_CALENDARIO, intent = Intent.SEGUNDO_TURNO,
        directAnswer = texto,
        suggestedQuestions = listOfNotNull(
            "Segundo turno para Presidente",
            uf?.let { "Segundo turno para Governador em $it" } ?: "Segundo turno para Governador",
            "Calendário eleitoral 2026"
        ),
        fonte = fonte, origem = origem
    )
}

internal enum class TipoSegundoTurno { ELEITO, SEGUNDO, ANDAMENTO, INDEFINIDO }

/** Ver [leituraSegundoTurno]. [maioria] = o primeiro colocado passou de 50% dos votos válidos. */
internal data class LeituraSegundoTurno(val tipo: TipoSegundoTurno, val l1: LinhaApuracao?, val l2: LinhaApuracao?, val maioria: Boolean = false)

/**
 * Lê a apuração do 1º turno de um cargo do Executivo e diz em que pé está o 2º turno:
 *  - SEGUNDO: há 2º turno (o TSE marcou os classificados com a situação "2º turno", ou a totalização terminou sem ninguém acima de 50%);
 *  - ELEITO: o primeiro colocado foi eleito no 1º turno;  ANDAMENTO: apuração parcial;  INDEFINIDO: não dá para dizer.
 * NUNCA devolve ELEITO quando dois candidatos aparecem como classificados/eleitos com o primeiro abaixo de 50%.
 */
internal fun leituraSegundoTurno(ap: ApuracaoCargo): LeituraSegundoTurno {
    val ord = ap.linhas.sortedByDescending { it.votos }
    val l1 = ord.getOrNull(0)
    val l2 = ord.getOrNull(1)
    val pct1 = l1?.percentual?.replace(',', '.')?.toDoubleOrNull() ?: 0.0
    val totalizado = ap.totalizacaoFinal || (ap.secoesTotalizadasPct?.replace(',', '.')?.toDoubleOrNull() ?: 0.0) >= 100.0
    val classificados = ord.filter { it.segundoTurno }
    return when {
        classificados.size >= 2 -> LeituraSegundoTurno(TipoSegundoTurno.SEGUNDO, classificados[0], classificados[1])
        // defesa: dois "eleitos" num cargo de uma vaga, com o primeiro sem maioria, só pode ser 2º turno
        ord.count { it.eleito } >= 2 && pct1 <= 50.0 -> LeituraSegundoTurno(TipoSegundoTurno.SEGUNDO, l1, l2)
        l1 != null && (l1.eleito || pct1 > 50.0) -> LeituraSegundoTurno(TipoSegundoTurno.ELEITO, l1, l2, maioria = pct1 > 50.0)
        l1 != null && l2 != null && totalizado -> LeituraSegundoTurno(TipoSegundoTurno.SEGUNDO, l1, l2)
        l1 != null && l2 != null -> LeituraSegundoTurno(TipoSegundoTurno.ANDAMENTO, l1, l2)
        else -> LeituraSegundoTurno(TipoSegundoTurno.INDEFINIDO, l1, l2)
    }
}

/** Situação do 2º turno segundo o PACOTE (CSV oficial do TSE), para quando a apuração ao vivo não respondeu; null se o pacote não define. */
/** Pergunta de resultado que pede o país inteiro (Governador/Senador sem UF): plural, "já ganhou", "todos os estados", "quais estados". */
private val RX_RESULTADO_NACIONAL =
    Regex("""\b(governadores|senadores|todos os estados|no brasil|no pa[ií]s|quais estados|em quais|em quantos|j[aá] (ganhou|ganharam|venceu|venceram|foi eleito|foram eleitos))\b""")

/**
 * Resumo nacional de Governador ou Senador pelo PACOTE (CSV oficial do TSE): eleitos no 1º turno por estado e, para Governador, os estados que
 * vão ao 2º turno. null quando o pacote ainda não traz resultado de nenhum estado (a resposta volta a pedir a UF). Texto idêntico ao do site.
 */
internal fun AnswerBuilder.resultadosNacionais(p: ParsedQuery, cargo: String, filtros: AiFilterExtraction): AiMenuResponse? {
    val comResultado = data.candidatos.filter { it.cargoCodigo == cargo && it.estadoUf != "BR" && it.resultado != null }
    if (comResultado.isEmpty()) return null
    val porUf = comResultado.groupBy { it.estadoUf }.toSortedMap()
    fun linha(c: net.saibatudo.eleicoes2026.domain.model.Candidate) = "${c.numero} — ${c.nomeUrna} (${c.partido})"
    fun votos1(c: net.saibatudo.eleicoes2026.domain.model.Candidate) = c.resultado?.turnos?.get(1)?.votos ?: 0L
    val eleitos1 = mutableListOf<Pair<String, List<net.saibatudo.eleicoes2026.domain.model.Candidate>>>()
    val segundo = mutableListOf<Pair<String, List<net.saibatudo.eleicoes2026.domain.model.Candidate>>>()
    val semDefinicao = mutableListOf<String>()
    for ((uf, daqui) in porUf) {
        val el = daqui.filter { if (cargo == "GOVERNADOR") it.resultado?.eleitoNoPrimeiroTurno == true else it.resultado?.eleito == true }
        if (el.isNotEmpty()) {
            eleitos1 += uf to el.sortedByDescending { votos1(it) }
            continue
        }
        val cl = daqui.filter { it.resultado?.segundoTurno == true }.sortedByDescending { votos1(it) }
        if (cargo == "GOVERNADOR" && cl.size >= 2) segundo += uf to cl.take(2) else semDefinicao += uf
    }
    val titulo = if (cargo == "GOVERNADOR") "Governador" else "Senador"
    val sb = StringBuilder("$titulo — 1º turno (${dataBr(regras.turno1)}), segundo o TSE.")
    if (eleitos1.isNotEmpty()) {
        sb.append("\n\n${if (cargo == "GOVERNADOR") "Eleitos no 1º turno" else "Eleitos"} (${eleitos1.size} estado${if (eleitos1.size == 1) "" else "s"}):")
        for ((uf, cands) in eleitos1) sb.append("\n• ${Ufs.NOMES[uf] ?: uf} ($uf): ${cands.joinToString("; ") { linha(it) }}")
    } else {
        sb.append("\n\nNenhum ${titulo.lowercase()} eleito no 1º turno consta no pacote.")
    }
    if (segundo.isNotEmpty()) {
        sb.append("\n\n2º turno em ${segundo.size} estado${if (segundo.size == 1) "" else "s"} (${dataBr(regras.turno2)}):")
        for ((uf, cands) in segundo) sb.append("\n• ${Ufs.NOMES[uf] ?: uf} ($uf): ${linha(cands[0])} × ${linha(cands[1])}")
    }
    if (semDefinicao.isNotEmpty()) sb.append("\n\nSem eleito definido no pacote: ${semDefinicao.joinToString(", ")}.")
    sb.append("\nPara um estado: \"Resultado para $titulo em SP\". Dados oficiais: ${AppConstants.URL_RESULTADOS_TSE}")
    return AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = p.intent, filters = filtros, abrirResultados = true,
        directAnswer = sb.toString(), candidateIds = eleitos1.flatMap { it.second }.take(6).map { it.id },
        suggestedQuestions = listOf(
            "Resultado para $titulo em ${ufPadrao ?: "SP"}",
            if (cargo == "GOVERNADOR") "Em quais estados haverá 2º turno?" else "Resultado para Governador",
            "Resultado para Presidente"
        ),
        fonte = fonte, origem = origem
    )
}

internal fun AnswerBuilder.statusSegundoTurnoPacote(cargo: String, uf: String): String? {
    val daqui = data.candidatos.filter { it.cargoCodigo == cargo && it.estadoUf == uf && it.resultado != null }
    val pos = fase == FaseEleitoral.POS_ELEICAO
    daqui.firstOrNull { it.resultado?.eleitoNoPrimeiroTurno == true }?.let {
        return "${if (pos) "Não houve" else "Não haverá"} 2º turno — ${it.nomeUrna} (${it.partido}) foi eleito(a) em 1º turno"
    }
    val cl = daqui.filter { it.resultado?.segundoTurno == true }.sortedByDescending { it.resultado?.turnos?.get(1)?.votos ?: 0L }
    if (cl.size < 2) return null
    val dupla = "${cl[0].nomeUrna} (${cl[0].partido}) e ${cl[1].nomeUrna} (${cl[1].partido})"
    return if (pos) "Houve 2º turno entre $dupla — resultado oficial em ${AppConstants.URL_RESULTADOS_TSE}" else "Sim, haverá 2º turno entre $dupla"
}

/** 2º turno já ocorrido e com apuração ao vivo do turno 2: eleito(a), colocados e andamento, no passado (POS_ELEICAO). Texto = site. */
internal fun AnswerBuilder.segundoTurnoOcorrido(rotuloCargo: String, ap2: ApuracaoCargo): AiMenuResponse {
    val ord = ap2.linhas.sortedByDescending { it.votos }
    val el = ord.firstOrNull { it.eleito }
    val andamento = if (ap2.totalizacaoFinal) "Totalização final" else
        "Apuração em andamento" + (ap2.secoesTotalizadasPct?.let { " (${it}% das seções totalizadas)" } ?: "")
    fun linha(l: LinhaApuracao, i: Int) = "  ${i + 1}º: ${l.nome} (${l.partido}) — ${l.percentual}% (${inteiro.format(l.votos)} votos)${if (l.eleito) " — ELEITO" else ""}"
    return AiMenuResponse(
        targetRoute = "info/resultados", menuId = AppConstants.MENU_RESULTADOS, intent = Intent.SEGUNDO_TURNO, abrirResultados = true,
        directAnswer = "Houve 2º turno para $rotuloCargo em ${dataBr(regras.turno2)}.\n" +
            (el?.let { "• ELEITO(A): ${it.nome} (${it.partido}) — ${it.percentual}% dos votos válidos (${inteiro.format(it.votos)} votos)\n" } ?: "") +
            "• $andamento:\n${ord.take(2).withIndex().joinToString("\n") { (i, l) -> linha(l, i) }}\n" +
            "• Dados divulgados pelo TSE em ${ap2.geradoEm}; números exibidos como publicados (${AppConstants.URL_RESULTADOS_TSE})",
        candidateIds = ord.take(2).mapNotNull { it.sqCandidato }.filter { data.porId.containsKey(it) },
        suggestedQuestions = listOf("Resultado para Presidente", "Calendário eleitoral 2026"),
        fonte = "Fonte: TSE – resultados.tse.jus.br (ao vivo), consultado agora.", origem = origem
    )
}
