package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.PropriedadeDef
import net.saibatudo.quimica.data.model.Trecho
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Propriedades
import net.saibatudo.quimica.domain.Texto

// ---- tabela periódica ------------------------------------------------------------------------------------------------------------

private fun AnswerBuilder.numerico(def: PropriedadeDef, e: Elemento): Double? = (Propriedades.bruto(def, e) as? Number)?.toDouble()

private fun AnswerBuilder.rotuloElemento(e: Elemento) = "${nomeDe(e)} (${e.simbolo})"

private val CATEGORIAS_METAL = setOf(
    CategoriaElemento.METAL_ALCALINO, CategoriaElemento.METAL_ALCALINO_TERROSO, CategoriaElemento.METAL_TRANSICAO,
    CategoriaElemento.METAL_POS_TRANSICAO, CategoriaElemento.LANTANIDEO, CategoriaElemento.ACTINIDEO
)

internal suspend fun AnswerBuilder.tabelaPeriodica(q: ParsedQuery): Resposta {
    val acoes = listOf<Acao>(acaoTabela())
    var escopo: List<Elemento> = pacote.elementos
    val partes = mutableListOf<String>()
    q.grupo?.let { g -> escopo = escopo.filter { it.grupo == g }; partes += t(R.string.resp_tab_grupo, g) }
    q.periodo?.let { p -> escopo = escopo.filter { it.periodo == p }; partes += t(R.string.resp_tab_periodo, p) }
    q.bloco?.let { b -> escopo = escopo.filter { it.bloco == b }; partes += t(R.string.resp_tab_bloco, b) }
    q.categoria?.let { id ->
        if (id == "metal") { escopo = escopo.filter { it.categoria in CATEGORIAS_METAL }; partes += t(R.string.categoria_metal_plural) }
        else { val c = CategoriaElemento.de(id); escopo = escopo.filter { it.categoria == c }; partes += t.minusNoMeio(t(c.rotulo)) }
    }
    q.estado?.let { s ->
        escopo = escopo.filter { it.estadoPadrao.id == s }
        partes += t(R.string.resp_tab_estado, pacote.elementos.firstOrNull { it.estadoPadrao.id == s }?.estadoPadrao?.let { t(it.meio) } ?: s)
    }
    val def = (q.extremo?.first ?: q.propriedade)?.let { dic.propriedade(it) }
    val temEscopo = partes.isNotEmpty()
    val fontes = escopo.flatMap { it.fontes }.distinctBy { it.nome }.take(2)

    // extremos: "elemento mais eletronegativo"
    if (q.extremo != null && def != null) {
        val menor = q.extremo.second == "min"
        val ordenados = escopo.mapNotNull { e -> numerico(def, e)?.let { e to it } }.sortedBy { if (menor) it.second else -it.second }
        if (ordenados.isEmpty()) return semDado(q, t(R.string.resp_tab_sem_dado_props, def.rotulo))
        val topo = ordenados.take(3)
        val onde = if (temEscopo) " (${partes.joinToString(", ")})" else ""
        val primeiro = topo[0].first
        val blocos = listOf<Bloco>(
            Bloco.Paragrafo(
                t(
                    if (menor) R.string.resp_tab_extremo_menor else R.string.resp_tab_extremo_maior,
                    onde, def.rotulo, rotuloElemento(primeiro), Propriedades.formatar(t, def, Propriedades.bruto(def, primeiro), un, nivel)?.curto
                )
            ),
            Bloco.Lista(topo.map { (e, _) -> "${rotuloElemento(e)}: ${Propriedades.formatar(t, def, Propriedades.bruto(def, e), un, nivel)?.curto}" })
        )
        return Resposta(
            Intent.TABELA_PERIODICA, t(if (menor) R.string.resp_tab_titulo_menor else R.string.resp_tab_titulo_maior, def.rotulo), blocos,
            fontes = topo.flatMap { it.first.fontes }.distinctBy { it.nome }.take(2).ifEmpty { fontesDoPacote() }, acoes = acoes + acaoAbrir(primeiro)
        )
    }

    // tendências ao longo de um período e de um grupo, lidas dos próprios dados
    if (q.tendencia) {
        if (def == null) {
            return Resposta(
                Intent.TABELA_PERIODICA, t(R.string.resp_tab_tendencias_titulo),
                listOf(Bloco.Paragrafo(t(R.string.resp_tab_qual_propriedade))),
                acoes = acoes, sugestoes = listOf(t(R.string.sug_tendencia)), entendida = false
            )
        }
        val blocos = mutableListOf<Bloco>()
        val comValor = pacote.elementos.filter { it.periodo != null && it.grupo != null && numerico(def, it) != null }
        val periodos = comValor.groupBy { it.periodo!! }
        val grupos = comValor.groupBy { it.grupo!! }
        val p = q.periodo ?: periodos.maxByOrNull { it.value.size }?.key
        val g = q.grupo ?: grupos.maxByOrNull { it.value.size }?.key
        if (p != null) {
            val seq = periodos[p].orEmpty().sortedBy { it.grupo }
            if (seq.size >= 2) blocos += Bloco.Paragrafo(t(R.string.resp_tab_ao_longo_periodo, p, descrever(def, seq)))
        }
        if (g != null && q.periodo == null) {
            val seq = grupos[g].orEmpty().sortedBy { it.periodo }
            if (seq.size >= 2) blocos += Bloco.Paragrafo(t(R.string.resp_tab_descendo_grupo, g, descrever(def, seq)))
        }
        if (blocos.isEmpty()) return semDado(q, t(R.string.resp_tab_sem_tendencia, def.rotulo))
        return Resposta(Intent.TABELA_PERIODICA, t(R.string.resp_tab_tendencia_titulo, def.rotulo), blocos, fontes = fontes.ifEmpty { fontesDoPacote() }, acoes = acoes)
    }

    if (temEscopo) {
        if (escopo.isEmpty()) return semDado(q, t(R.string.resp_tab_sem_elementos, partes.joinToString(", ")))
        val titulo = t(R.string.resp_tab_elementos_titulo, partes.joinToString(", "))
        val linhas = escopo.sortedBy { it.z }.map { e ->
            val extra = def?.let { d -> Propriedades.formatar(t, d, Propriedades.bruto(d, e), un, nivel)?.curto?.let { " – $it" } }.orEmpty()
            "${rotuloElemento(e)}, Z = ${e.z}$extra"
        }
        return Resposta(
            Intent.TABELA_PERIODICA, titulo, listOf(Bloco.Paragrafo(t.plural(R.plurals.resp_tab_n_elementos, escopo.size, escopo.size)), Bloco.Lista(linhas)),
            fontes = fontes.ifEmpty { fontesDoPacote() }, acoes = acoes + escopo.take(3).map { acaoAbrir(it) }
        )
    }

    val porCategoria = pacote.elementos.groupBy { it.categoria }.entries.sortedBy { it.key.ordinal }
    return Resposta(
        Intent.TABELA_PERIODICA, t(R.string.resp_tab_titulo),
        listOf(
            Bloco.Paragrafo(t(R.string.resp_tab_descricao, pacote.elementos.size)),
            Bloco.Lista(porCategoria.map { (c, l) -> "${t(c.rotulo)}: ${l.size}" })
        ),
        fontes = fontesDoPacote(), acoes = acoes, sugestoes = listOf(t(R.string.sug_halogenios), t(R.string.sug_mais_eletronegativo))
    )
}

/** Sequência "A v1 → B v2 → …" com os valores formatados, e a direção calculada dos próprios números. */
private fun AnswerBuilder.descrever(def: PropriedadeDef, seq: List<Elemento>): String {
    val sequencia = seq.joinToString(" → ") { "${it.simbolo} ${Propriedades.formatar(t, def, Propriedades.bruto(def, it), un, nivel)?.curto}" }
    val v = seq.mapNotNull { numerico(def, it) }
    if (v.size < 2) return sequencia
    val sobe = v.zipWithNext().count { (a, b) -> b > a }
    val desce = v.zipWithNext().count { (a, b) -> b < a }
    val passos = v.size - 1
    val resumo = when {
        sobe == passos -> t(R.string.resp_tab_aumenta_todos, passos)
        desce == passos -> t(R.string.resp_tab_diminui_todos, passos)
        sobe > desce -> t(R.string.resp_tab_aumenta_parcial, sobe, passos)
        desce > sobe -> t(R.string.resp_tab_diminui_parcial, desce, passos)
        else -> t(R.string.resp_tab_sem_tendencia_unica)
    }
    return "$sequencia. $resumo"
}

// ---- conceito (textos licenciados) -------------------------------------------------------------------------------------------------

/**
 * "O que é…?": o trecho licenciado que melhor cobre o tema, no idioma das respostas. Como no site (answers.js `conceito`): primeiro só os
 * lotes/arquivos do idioma cujo nome combina com a pergunta; depois com as reservas (inglês, português); se nada servir, todos. Um trecho em
 * outro idioma perde um ponto (só entra se for o único jeito de responder) e sai rotulado ("Trecho em inglês").
 */
internal suspend fun AnswerBuilder.buscarConceito(q: ParsedQuery): Resposta {
    // o ParsedQuery guarda o assunto como o site (com o artigo que sobrou do gatilho); a busca usa o tema limpo
    val tema = LocalNlu.temaDoConceito(q.conceito.orEmpty(), dic.lexico)
    val palavras = LocalNlu.termosDeBusca(tema, dic.lexico).filter { it.length >= 3 }
    fun corpoDe(tr: Trecho) = if (tr.idioma == Idiomas.PADRAO) tr.textoPt ?: tr.textoOriginal.orEmpty() else tr.textoOriginal ?: tr.textoPt.orEmpty()
    fun pontos(tr: Trecho): Int {
        var s = 0
        val chaves = tr.palavrasChave.map { Texto.nlu(it) }
        val titulo = Texto.nlu(tr.titulo.orEmpty() + " " + tr.secao.orEmpty())
        val corpo = Texto.nlu(corpoDe(tr))
        if (tema.isNotBlank()) {
            if (chaves.any { it == tema }) s += 10
            if (titulo.contains(tema)) s += 6
        }
        for (p in palavras) {
            if (chaves.any { it == p || it.split(' ').contains(p) }) s += 3
            if (titulo.split(' ').contains(p)) s += 2
            if (corpo.split(' ').contains(p)) s += 1
        }
        return if (tr.idioma == idioma) s else s - 1
    }
    fun melhorDe(trechos: List<Trecho>) = trechos.map { it to pontos(it) }.filter { it.second >= 3 }.maxByOrNull { it.second }?.first
    val melhor = melhorDe(pacote.trechos(idioma, palavras))
        ?: melhorDe(pacote.trechos(idioma, palavras, reserva = true))
        ?: melhorDe(pacote.trechos(idioma, null, reserva = true))
    if (melhor == null) {
        return Resposta(
            Intent.CONCEITO, t(R.string.resp_conceito_sem_titulo),
            listOf(Bloco.Paragrafo(if (tema.isBlank()) t(R.string.resp_conceito_sem_texto_geral) else t(R.string.resp_conceito_sem_texto_tema, tema))),
            sugestoes = sugestoes(4), entendida = false
        )
    }
    val texto = corpoDe(melhor)
    val blocos = mutableListOf<Bloco>(Bloco.Paragrafo(texto))
    // trecho em pt-BR cujo original é inglês e ainda sem tradução conta como inglês
    val idiomaDoTexto = if (melhor.idioma == Idiomas.PADRAO && melhor.textoPt == null && melhor.traducao?.contains("pendente", true) == true) "en" else melhor.idioma
    if (idiomaDoTexto != idioma) blocos += Bloco.Aviso(t(R.string.resp_trecho_em, t.nomeDoIdioma(idiomaDoTexto)))
    else if (idioma == Idiomas.PADRAO && melhor.traducao?.contains("automática", true) == true) blocos += Bloco.Aviso(t(R.string.resp_traducao_automatica))
    val fonte = Fonte(
        nome = buildString { append(melhor.fonte); melhor.secao?.let { append(", ").append(it) } },
        url = melhor.url, licenca = melhor.licenca
    )
    return Resposta(Intent.CONCEITO, melhor.titulo ?: tema.replaceFirstChar { it.uppercase() }, blocos, fontes = listOf(fonte))
}

// ---- não entendi + sugestões ---------------------------------------------------------------------------------------------------------

/** Perguntas corrigidas por erro de digitação (cada uma conferida: é compreendida e respondida). */
internal suspend fun AnswerBuilder.correcoes(original: String): List<String> {
    val saida = mutableListOf<String>()
    val chave = Texto.nlu(original)
    for (p in chave.split(' ')) {
        for (nome in dic.nomesProximos(p, 2)) {
            val nova = Regex("""(?i)\b${Regex.escape(p)}\b""").replace(chave) { nome.lowercase() }
            val (_, resp) = responderSemRecursao(nova)
            if (resp != null) saida += nova.replaceFirstChar { it.uppercase() } + if (original.trimEnd().endsWith("?")) "?" else ""
        }
    }
    return saida.distinct()
}

internal suspend fun AnswerBuilder.respostaNaoEntendi(q: ParsedQuery): Resposta {
    val blocos = mutableListOf<Bloco>(Bloco.Paragrafo(t(R.string.resp_nao_entendi_texto)))
    val sugeridas = correcoes(q.textoOriginal)
    if (sugeridas.isNotEmpty()) blocos += Bloco.Paragrafo(t(R.string.resp_voce_quis_dizer, sugeridas.first()))
    val outras = sugestoes(6).filter { it !in sugeridas }
    return Resposta(Intent.DESCONHECIDA, t(R.string.resp_nao_entendi_titulo), blocos, sugestoes = (sugeridas.take(2) + outras).take(6), entendida = false)
}

/** Interpreta e responde sem gerar o fluxo de "não entendi" (usado para validar sugestões). */
internal suspend fun AnswerBuilder.responderSemRecursao(pergunta: String): Pair<ParsedQuery, Resposta?> {
    val q = LocalNlu.parse(pergunta, dic, null, dic.lexico)
    if (q.intent == Intent.DESCONHECIDA || q.intent == Intent.RECUSA_PERIGO) return q to null
    val r = try { construir(q, corrigir = false) } catch (_: Exception) { null }
    return q to r?.takeIf { it.entendida }
}

/**
 * Perguntas que o app SABE responder, montadas dos dados do pacote e conferidas (cada uma é interpretada e respondida
 * antes de ser oferecida). Nunca sugere pergunta que cairia em "não entendi" ou em "sem dado". Escritas no idioma das respostas.
 */
suspend fun AnswerBuilder.sugestoes(max: Int = 6): List<String> {
    sugestoesCache?.let { return it.take(max) }
    val candidatas = mutableListOf<String>()
    val elementos = pacote.elementos
    elementos.firstOrNull { it.pontoFusaoK != null }?.let { candidatas += t(R.string.sug_fusao_de, nomeCru(it)) }
    candidatas += t(R.string.sug_converter)
    val h = pacote.elemento("H")
    val o = pacote.elemento("O")
    if (h != null && o != null) candidatas += t(R.string.sug_balancear)
    if (pacote.elemento("Ca") != null && h != null && o != null) candidatas += t(R.string.sug_massa_molar_caoh2)
    elementos.firstOrNull { it.eletronegatividade != null && it.z > 8 }?.let { candidatas += t(R.string.sug_eletronegatividade_de, nomeCru(it)) }
    // compostos do índice (uma pergunta de cada tipo)
    var comEstrutura = false
    var comPerigos = false
    var comMassaMolar = false
    for (e in pacote.indice.entradas.take(60)) {
        val c = pacote.composto(e.cid) ?: continue
        val nome = nomeCru(c)
        if (c.smiles != null && !comEstrutura) { candidatas += t(R.string.sug_estrutura_de, nome); comEstrutura = true }
        val g = c.ghs
        if (g != null && g.pictogramas.isNotEmpty() && !comPerigos) { candidatas += t(R.string.sug_perigos_de, nome); comPerigos = true }
        if (c.massaMolar != null && !comMassaMolar) { candidatas += t(R.string.sug_massa_molar_de, nome); comMassaMolar = true }
        if (candidatas.size >= 14) break
    }
    pacote.trechos(idioma).firstOrNull { !it.titulo.isNullOrBlank() }?.let {
        candidatas += t(R.string.sug_o_que_e, if (idioma == Idiomas.PADRAO) it.titulo!!.lowercase() else t.minusNoMeio(it.titulo!!))
    }
    if (pacote.elemento("Cl") != null && h != null) candidatas += t(R.string.sug_ph_hcl)
    candidatas += t(R.string.sug_halogenios)
    val validas = mutableListOf<String>()
    for (c in candidatas.distinct()) {
        val (_, r) = responderSemRecursao(c)
        if (r != null && !r.recusa && r.intent != Intent.AJUDA) validas += c
        if (validas.size >= 12) break
    }
    sugestoesCache = validas
    return validas.take(max)
}
