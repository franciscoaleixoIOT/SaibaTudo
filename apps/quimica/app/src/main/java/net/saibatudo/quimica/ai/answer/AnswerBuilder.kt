package net.saibatudo.quimica.ai.answer

import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.Seguranca
import net.saibatudo.quimica.ai.model.Acao
import net.saibatudo.quimica.ai.model.Bloco
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.OrigemResposta
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Resposta
import net.saibatudo.quimica.ai.model.TipoCalculadora
import net.saibatudo.quimica.ai.nlu.Dicionario
import net.saibatudo.quimica.ai.nlu.LocalNlu
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.PropriedadeDef
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.data.repository.Pacote
import net.saibatudo.quimica.domain.GhsFonte
import net.saibatudo.quimica.domain.GhsPictogramas
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Nomes
import net.saibatudo.quimica.domain.Propriedades
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.Textos
import net.saibatudo.quimica.domain.calc.CalculoInvalido
import net.saibatudo.quimica.domain.calc.MassaMolar
import net.saibatudo.quimica.domain.calc.ResultadoCalculo

/**
 * Monta a RESPOSTA a partir de uma [ParsedQuery] usando SOMENTE os dados do pacote e cálculo local testado.
 * Nenhum texto gerado por modelo de linguagem é exibido como fato (origem sempre LOCAL nesta versão). Toda resposta
 * traz as fontes dos dados usados; quando o pacote não tem o dado, a resposta diz isso em vez de inventar.
 *
 * Todo texto sai de `res/values-<idioma>/strings.xml` no idioma do dicionário ([t] = `dic.textos`, o mesmo do interpretador): nada de português fixo
 * aqui (docs/I18N.md §6). Números e nomes seguem o idioma; um nome que não existe no idioma sai na reserva, com o rótulo "(nome em inglês)".
 */
class AnswerBuilder(
    internal val pacote: Pacote,
    val dic: Dicionario,
    internal val nivel: Nivel = Nivel.MEDIO
) {
    internal var sugestoesCache: List<String>? = null

    private companion object {
        /** CID da água no PubChem: em "solubilidade do X em água", ela é o solvente. */
        const val CID_AGUA = 962L
    }

    /** Interpreta e responde. [contexto] é a pergunta anterior (para "e o ponto de ebulição?"). */
    suspend fun responder(pergunta: String, contexto: ParsedQuery? = null): Pair<ParsedQuery, Resposta> {
        val q = LocalNlu.parseComContexto(pergunta, dic, contexto)
        return q to construir(q)
    }

    suspend fun construir(q: ParsedQuery, corrigir: Boolean = true): Resposta {
        val resposta = try {
            when (q.intent) {
                Intent.RECUSA_PERIGO -> recusa(q)
                Intent.AJUDA -> ajuda()
                Intent.FONTES -> fontes(q)
                Intent.SOBRE_DADOS -> sobreDados()
                Intent.ELEMENTO -> elemento(q)
                Intent.COMPOSTO -> composto(q)
                Intent.PROPRIEDADE -> propriedade(q)
                Intent.MASSA_MOLAR -> massaMolar(q)
                Intent.BALANCEAR -> balancear(q)
                Intent.ESTEQUIOMETRIA -> estequiometria(q)
                Intent.CONCENTRACAO -> concentracao(q)
                Intent.PH -> ph(q)
                Intent.GAS_IDEAL -> gasIdeal(q)
                Intent.CONVERSAO_UNIDADE -> conversao(q)
                Intent.NOMENCLATURA -> nomenclatura(q)
                Intent.DESENHAR -> desenhar(q)
                Intent.COMPARAR -> comparar(q)
                Intent.SEGURANCA -> seguranca(q)
                Intent.TABELA_PERIODICA -> tabelaPeriodica(q)
                Intent.CONCEITO -> conceito(q)
                // 17/10/2026 (docs/CALCULADORAS_2026-10-17.md): respostas das calculadoras novas (RespostasCalculadoras.kt)
                Intent.NOX -> nox(q)
                Intent.ENTALPIA -> entalpia(q)
                Intent.EQUILIBRIO -> equilibrio(q)
                Intent.LIGACAO -> ligacao(q)
                Intent.DESCONHECIDA -> naoEntendi(q)
            }
        } catch (e: CalculoInvalido) {
            erroDeCalculo(q, e.texto(t))
        }
        // pergunta sem entidade reconhecida: pode ser erro de digitação ("oxigenioo"); oferece o nome certo, já conferido
        if (corrigir && !resposta.entendida && q.intent != Intent.DESCONHECIDA && q.elemento == null && q.composto == null && q.formula == null) {
            val sugeridas = correcoes(q.textoOriginal)
            if (sugeridas.isNotEmpty()) {
                return resposta.copy(
                    blocos = resposta.blocos + Bloco.Paragrafo(t(R.string.resp_voce_quis_dizer, sugeridas.first())),
                    sugestoes = (sugeridas.take(2) + resposta.sugestoes).distinct()
                )
            }
        }
        return resposta
    }

    // ---- utilitários ----------------------------------------------------------------------------------------------------------

    internal val un get() = dic.unidades

    /** Os textos do idioma das respostas (o do dicionário). */
    internal val t: Textos get() = dic.textos

    internal fun elementoDe(q: ParsedQuery): Elemento? = q.elemento?.let { pacote.porSimbolo[it] }

    internal suspend fun compostoDe(q: ParsedQuery): Composto? = q.composto?.toLongOrNull()?.let { pacote.composto(it) }

    /** Idioma das respostas: o do dicionário (o mesmo do NLU). */
    internal val idioma: String get() = dic.idioma

    /** Nome no idioma para EXIBIR: se vem de outro idioma (reserva em inglês/português), sai com o rótulo "(nome em inglês)". */
    internal fun nomeDe(e: Elemento) = t.nomeRotulado(Nomes.elemento(e, idioma))
    internal fun nomeDe(c: Composto) = t.nomeRotulado(Nomes.composto(c, idioma))

    /** Nome no idioma SEM rótulo, para montar perguntas sugeridas (o interpretador entende o nome, não o rótulo). */
    internal fun nomeCru(e: Elemento) = Nomes.elemento(e, idioma).nome
    internal fun nomeCru(c: Composto) = Nomes.composto(c, idioma).nome

    internal fun fontesDeElementos(simbolos: Collection<String>): List<Fonte> =
        simbolos.mapNotNull { pacote.porSimbolo[it] }.flatMap { it.fontes }.distinctBy { it.nome }.take(3)

    internal fun fontesDoPacote(): List<Fonte> = pacote.fontesExibicao.take(2)

    /** "Cálculo feito no aparelho": fonte de toda resposta calculada localmente. */
    internal fun fonteCalculo() = Fonte(t(R.string.fonte_calculo_nome), licenca = t(R.string.fonte_calculo_licenca))

    // ---- ações (atalhos) --------------------------------------------------------------------------------------------------------

    internal fun acaoTabela() = Acao.AbrirTabela(t(R.string.acao_abrir_tabela))
    internal fun acaoSobreDados() = Acao.AbrirSobreDados(t(R.string.acao_sobre_dados))
    internal fun acaoSeguranca() = Acao.AbrirSeguranca(t(R.string.acao_ghs))
    internal fun acaoFichaElemento(e: Elemento) = Acao.AbrirElemento(e.z, t(R.string.acao_abrir_ficha_de, nomeDe(e)))
    internal fun acaoFichaComposto(c: Composto) = Acao.AbrirComposto(c.cid, t(R.string.acao_abrir_ficha_de, nomeDe(c)))
    internal fun acaoAbrir(e: Elemento) = Acao.AbrirElemento(e.z, t(R.string.acao_abrir_x, nomeDe(e)))
    internal fun acaoAbrir(c: Composto) = Acao.AbrirComposto(c.cid, t(R.string.acao_abrir_x, nomeDe(c)))
    internal fun acaoIcsc(url: String) = Acao.AbrirUrl(url, t(R.string.acao_icsc))

    /** Atalho para uma calculadora, com o texto próprio dela ("Abrir a calculadora de pH"). */
    internal fun acaoCalculadora(tipo: TipoCalculadora, preenchimento: Map<String, String> = emptyMap()) = Acao.AbrirCalculadora(
        tipo,
        t(
            when (tipo) {
                TipoCalculadora.MASSA_MOLAR -> R.string.acao_calc_massa_molar
                TipoCalculadora.BALANCEAMENTO -> R.string.acao_calc_balanceamento
                TipoCalculadora.ESTEQUIOMETRIA -> R.string.acao_calc_estequiometria
                TipoCalculadora.CONCENTRACAO -> R.string.acao_calc_concentracao
                TipoCalculadora.PH -> R.string.acao_calc_ph
                TipoCalculadora.GAS_IDEAL -> R.string.acao_calc_gas_ideal
                TipoCalculadora.UNIDADES -> R.string.acao_calc_unidades
                TipoCalculadora.ENTALPIA -> R.string.resp_ent_abrir
                TipoCalculadora.ELETRONICA -> R.string.resp_ele_abrir
                TipoCalculadora.NOX -> R.string.resp_nox_abrir
                TipoCalculadora.EQUILIBRIO -> R.string.resp_eqm_abrir
                TipoCalculadora.LIGACAO -> R.string.resp_lig_abrir
            }
        ),
        preenchimento
    )

    internal fun erroDeCalculo(q: ParsedQuery, mensagem: String): Resposta {
        val calc = when (q.intent) {
            Intent.BALANCEAR -> TipoCalculadora.BALANCEAMENTO
            Intent.ESTEQUIOMETRIA -> TipoCalculadora.ESTEQUIOMETRIA
            Intent.CONCENTRACAO -> TipoCalculadora.CONCENTRACAO
            Intent.PH -> TipoCalculadora.PH
            Intent.GAS_IDEAL -> TipoCalculadora.GAS_IDEAL
            Intent.CONVERSAO_UNIDADE -> TipoCalculadora.UNIDADES
            Intent.NOX -> TipoCalculadora.NOX
            Intent.ENTALPIA -> TipoCalculadora.ENTALPIA
            Intent.EQUILIBRIO -> TipoCalculadora.EQUILIBRIO
            Intent.LIGACAO -> TipoCalculadora.LIGACAO
            else -> TipoCalculadora.MASSA_MOLAR
        }
        return Resposta(
            q.intent, t(R.string.resp_erro_calculo_titulo),
            listOf(Bloco.Aviso(mensagem), Bloco.Paragrafo(t(R.string.resp_erro_calculo_dica))),
            acoes = listOf(Acao.AbrirCalculadora(calc, t(R.string.acao_abrir_calculadora_de, t.minusNoMeio(t(calc.rotulo))))),
            sugestoes = emptyList(), entendida = false
        )
    }

    internal fun resultadoComoBlocos(r: ResultadoCalculo): List<Bloco> = buildList {
        r.linhas.forEach { add(Bloco.Campo(it.rotulo, it.valor)) }
        if (r.passos.isNotEmpty()) add(Bloco.Passos(t(R.string.resp_passo_a_passo), if (nivel == Nivel.FUNDAMENTAL) r.passos else r.passos))
        r.notas.forEach { add(Bloco.Aviso(it)) }
    }

    // ---- recusa, ajuda, dados ---------------------------------------------------------------------------------------------------

    private fun recusa(q: ParsedQuery): Resposta {
        val av = Seguranca.avaliarNoIdioma(q.textoOriginal, idioma)
        val r = Seguranca.respostaRecusa(av, t)
        val acoes = if (r.categoria == net.saibatudo.quimica.ai.CategoriaRecusa.AUTOLESAO) listOf(Acao.AbrirUrl("https://cvv.org.br", t(R.string.acao_cvv))) else emptyList()
        return Resposta(
            Intent.RECUSA_PERIGO, t(R.string.resp_recusa_titulo), r.linhas.map { Bloco.Paragrafo(it) },
            origem = OrigemResposta.AVISO, acoes = acoes, sugestoes = Seguranca.sugestoesSeguras(t), recusa = true
        )
    }

    private suspend fun ajuda(): Resposta = Resposta(
        Intent.AJUDA, t(R.string.resp_ajuda_titulo),
        listOf(
            Bloco.Paragrafo(t(R.string.resp_ajuda_intro)),
            Bloco.Lista(
                listOf(
                    t(R.string.resp_ajuda_item_propriedades),
                    t(R.string.resp_ajuda_item_calculos),
                    t(R.string.resp_ajuda_item_estrutura),
                    t(R.string.resp_ajuda_item_seguranca),
                    t(R.string.resp_ajuda_item_numeros)
                )
            )
        ),
        sugestoes = sugestoes(6)
    )

    private fun fontes(q: ParsedQuery): Resposta {
        val e = elementoDe(q)
        val lista = (e?.fontes.orEmpty() + pacote.fontesExibicao).distinctBy { it.nome }
        return Resposta(
            Intent.FONTES, t(R.string.resp_fontes_titulo),
            listOf(
                Bloco.Paragrafo(t(R.string.resp_fontes_intro)),
                Bloco.Lista(lista.map { f ->
                    val base = f.rotulo() + (f.url?.let { " ($it)" } ?: "")
                    f.acessadoEm?.let { t(R.string.resp_fonte_acesso_em, base, it) } ?: base
                })
            ),
            acoes = listOf(acaoSobreDados()), fontes = emptyList()
        )
    }

    private fun sobreDados(): Resposta {
        val m = pacote.manifest
        val dias = m.pollIntervalMinutes / (24 * 60)
        val blocos = mutableListOf<Bloco>(
            Bloco.Campo(t(R.string.rot_versao_dados), m.version.orEmpty()),
            Bloco.Campo(t(R.string.rot_gerado_em), m.generatedAt.orEmpty()),
            Bloco.Campo(t(R.string.rot_origem), t(pacote.origem.rotulo)),
            Bloco.Campo(t(R.string.rot_elementos), pacote.elementos.size.toString()),
            Bloco.Campo(t(R.string.rot_compostos_pacote), dic.totalCompostos.toString()),
            Bloco.Paragrafo(t.plural(R.plurals.resp_pacote_assinado, dias, dias))
        )
        return Resposta(Intent.SOBRE_DADOS, t(R.string.resp_sobre_dados_titulo), blocos, acoes = listOf(acaoSobreDados()), fontes = fontesDoPacote())
    }

    // ---- elemento e composto ------------------------------------------------------------------------------------------------------

    private fun elemento(q: ParsedQuery): Resposta {
        val e = elementoDe(q) ?: return semDado(q, t(R.string.resp_elemento_nao_encontrado))
        val linhas = Propriedades.fichaElemento(t, e, dic.propriedades, un, nivel)
        val blocos = mutableListOf<Bloco>(Bloco.Paragrafo(t(R.string.resp_elemento_intro, nomeDe(e), e.simbolo, e.z)))
        linhas.forEach { blocos += Bloco.Campo(it.rotulo, it.valor) }
        // "o que é Fe2+", "o que é C-14": a ficha do elemento + os elétrons do íon / os nêutrons do isótopo (campos só do cliente, §7)
        if (q.elemento == e.simbolo) blocos += linhasIonIsotopo(e, q.cargaFormula, q.numeroMassa)
        return Resposta(
            Intent.ELEMENTO, "${nomeDe(e)} (${e.simbolo})", blocos, fontes = e.fontes.ifEmpty { fontesDoPacote() },
            acoes = listOf(acaoFichaElemento(e), acaoTabela()),
            sugestoes = listOf(t(R.string.sug_fusao_de, nomeCru(e)), t(R.string.sug_massa_molar_de, nomeCru(e)))
        )
    }

    private suspend fun composto(q: ParsedQuery): Resposta {
        val c = compostoDe(q)
        if (c == null) {
            // fórmula válida fora do índice: a massa molar ainda é calculável
            val f = q.formula ?: return semDado(q, t(R.string.resp_composto_nao_encontrado))
            val mm = MassaMolar.calcular(f, pacote.porSimbolo)
            return Resposta(
                Intent.COMPOSTO, Texto.formulaUnicode(f),
                listOf(
                    Bloco.Aviso(t(R.string.resp_composto_fora_indice)),
                    Bloco.Campo(t(R.string.rot_massa_molar), "${t.fixo(mm.massaMolar, 3)} g/mol")
                ) + listOf(Bloco.Passos(t(R.string.resp_como_calculei), mm.comoResultado(t).passos)),
                fontes = fontesDeElementos(mm.formula.contagem.keys),
                acoes = listOf(acaoCalculadora(TipoCalculadora.MASSA_MOLAR, mapOf("formula" to f)))
            )
        }
        val blocos = mutableListOf<Bloco>()
        c.formula?.let { blocos += Bloco.Destaque(Texto.formulaUnicode(it)) }
        // o aviso é sobre o nome em PORTUGUÊS: nos outros idiomas o nome vem do idioma (ou da reserva rotulada)
        if (c.nomePtPendente && idioma == Idiomas.PADRAO) blocos += Bloco.Aviso(t(R.string.resp_nome_pt_pendente))
        c.nomePopular?.takeIf { !it.equals(c.nome, true) }?.let { blocos += Bloco.Campo(t(R.string.rot_conhecido_como), it) }
        Propriedades.fichaComposto(t, c, dic.propriedades, un, nivel).forEach { blocos += Bloco.Campo(it.rotulo, it.valor) }
        c.cas?.let { blocos += Bloco.Campo(t(R.string.rot_numero_cas), it) }
        // propriedades físicas medidas (Wikidata): cada valor com as condições da medida; a fonte de cada valor vai na lista de fontes
        val medidas = Propriedades.medidasDoComposto(c, dic.propriedades, t, un)
        if (medidas.isNotEmpty()) {
            blocos += Bloco.Paragrafo(t(R.string.prop_medida_titulo))
            medidas.forEach { m -> blocos += Bloco.Campo(Texto.capitalizar(Propriedades.rotuloMedida(m.def, t)), Propriedades.textoMedida(m, t)) }
            if (medidas.any { it.def.id == "pka" }) blocos += Bloco.Aviso(t(R.string.prop_medida_nota_pka))
        }
        val fontesMedidas = medidas.flatMap { m -> m.fontes.map { it.fonte } }
        c.smiles?.let { blocos += Bloco.Estrutura(it, "${nomeDe(c)}${c.formula?.let { f -> ", ${Texto.formulaUnicode(f)}" } ?: ""}") }
        c.definicaoChebi?.let { blocos += Bloco.Paragrafo(t(R.string.resp_definicao_chebi, it.licenca, it.texto)) }
        return Resposta(
            Intent.COMPOSTO, nomeDe(c), blocos, fontes = (c.fontes + fontesMedidas).distinctBy { "${it.nome}|${it.url}|${it.detalhe}" }.ifEmpty { fontesDoPacote() },
            acoes = listOf(acaoFichaComposto(c)) + listOfNotNull(c.icscBuscaUrl?.let { acaoIcsc(it) }),
            sugestoes = listOf(t(R.string.sug_perigos_de, nomeCru(c)), t(R.string.sug_estrutura_de, nomeCru(c)))
        )
    }

    /**
     * PROPRIEDADE (espelha `propriedade` do site, answers.js): cada propriedade pedida, em cada escopo em que existe (fusão, ebulição, densidade e
     * estado valem para elemento E composto), para cada entidade citada. A medida de um composto (Wikidata) sai com as condições da medida e a fonte
     * POR VALOR (referência citada, "sem referência no Wikidata"); o pKa leva a nota da 1ª dissociação; a eletronegatividade, a nota de Pauling; um
     * valor marcado no pacote, "valor a revisar". Sem o dado, a resposta diz o que falta e o que o pacote traz do composto. Em "solubilidade do X em
     * água", a água é o solvente, não o composto perguntado.
     */
    private suspend fun propriedade(q: ParsedQuery): Resposta {
        val ids = q.propriedades.ifEmpty { listOfNotNull(q.propriedade) }.filter { dic.propriedade(it) != null }.distinct()
        if (ids.isEmpty()) return naoEntendi(q)
        val elementos = q.elementos.ifEmpty { listOfNotNull(q.elemento) }.distinct().mapNotNull { pacote.porSimbolo[it] }
        var compostos = q.compostos.ifEmpty { listOfNotNull(q.composto) }.distinct().mapNotNull { it.toLongOrNull() }.mapNotNull { pacote.composto(it) }
        if ("solubilidade" in ids && compostos.isNotEmpty()) {
            val semAgua = compostos.filter { it.cid != CID_AGUA }
            if (semAgua.isNotEmpty() || elementos.isEmpty()) compostos = semAgua
        }
        val def0 = dic.propriedade(ids.first())!!
        if (elementos.isEmpty() && compostos.isEmpty()) {
            if (ids == listOf("solubilidade")) {
                return Resposta(Intent.PROPRIEDADE, Texto.capitalizar(def0.rotulo), listOf(Bloco.Paragrafo(t(R.string.resp_prop_solubilidade_de_qual))), entendida = false)
            }
            val exemplos = pacote.elementos.take(40).mapNotNull { el ->
                if (Propriedades.formatar(t, def0, Propriedades.bruto(def0, el), un) != null) {
                    val pergunta = t(R.string.sug_propriedade_de, t.minusNoMeio(def0.rotulo), nomeCru(el))
                    // português: "Qual ponto de fusão de X?" vira "Qual o ponto de fusão de X?" (nos outros idiomas o par de ajuste é vazio)
                    val de = t(R.string.sug_propriedade_ajuste_de)
                    if (de.isEmpty()) pergunta else pergunta.replace(de, t(R.string.sug_propriedade_ajuste_para))
                } else null
            }.take(3)
            return Resposta(
                Intent.PROPRIEDADE, Texto.capitalizar(def0.rotulo),
                listOf(Bloco.Paragrafo(t(R.string.resp_prop_de_qual))),
                sugestoes = exemplos, entendida = false
            )
        }
        val umaEntidade = elementos.size + compostos.size == 1
        val campos = mutableListOf<Bloco.Campo>()
        val fontes = mutableListOf<Fonte>()
        val avisos = LinkedHashSet<String>()
        val ausentes = mutableListOf<Pair<PropriedadeDef, String>>()
        val semMedida = LinkedHashMap<Long, Composto>()   // compostos sem a medida pedida: a resposta diz o que o pacote traz deles
        for (id in ids) {
            val def = dic.propriedade(id) ?: continue
            for (alvo in def.escoposEfetivos) {
                // partículas (prótons, nêutrons, elétrons) dependem da carga e do número de massa da pergunta: blocos próprios, abaixo
                if (alvo == "elemento" && def.id != "particulas") for (e in elementos) {
                    val nome = "${nomeDe(e)} (${e.simbolo})"
                    val rotulo = if (umaEntidade) Texto.capitalizar(def.rotulo) else t(R.string.resp_prop_de, Texto.capitalizar(def.rotulo), nome)
                    val v = Propriedades.formatar(t, def, Propriedades.bruto(def, e), un, nivel)
                    if (v == null) { ausentes += def to nome; continue }
                    campos += Bloco.Campo(rotulo, v.texto)
                    fontes += e.fontes
                    Propriedades.avisoDoValor(e, def.campo, t)?.let { avisos += if (umaEntidade) it else "${nomeDe(e)}: $it" }
                    if (def.id == "eletronegatividade") Propriedades.notaEletronegatividade(def, e, t)?.let { avisos += it }
                }
                if (alvo == "composto") for (c in compostos) {
                    val nome = nomeDe(c)
                    val rotuloBase = if (def.medida) Propriedades.rotuloMedida(def, t) else def.rotulo
                    val rotulo = if (umaEntidade) Texto.capitalizar(rotuloBase) else t(R.string.resp_prop_de, Texto.capitalizar(rotuloBase), nome)
                    if (def.medida) {
                        // medida do composto (Wikidata): o valor com as condições da medida e a fonte deste valor
                        val m = Propriedades.medida(c, def, t, un)
                        if (m == null) { ausentes += def to nome; semMedida[c.cid] = c; continue }
                        campos += Bloco.Campo(rotulo, Propriedades.textoMedida(m, t))
                        fontes += m.fontes.map { it.fonte }.ifEmpty { c.fontes }
                        if (def.id == "pka") avisos += t(R.string.prop_medida_nota_pka)
                        continue
                    }
                    val v = Propriedades.formatar(t, def, Propriedades.bruto(def, c), un, nivel)
                    if (v == null) { ausentes += def to nome; continue }
                    campos += Bloco.Campo(rotulo, v.texto)
                    fontes += c.fontes
                }
            }
            // propriedade de elemento perguntada para um composto (ou o contrário): conta como ausente
            val escopos = def.escoposEfetivos
            if (("elemento" !in escopos || elementos.isEmpty()) && ("composto" !in escopos || compostos.isEmpty())) {
                (if ("composto" in escopos) elementos.map { "${nomeDe(it)} (${it.simbolo})" } else compostos.map { nomeDe(it) }).forEach { ausentes += def to it }
            }
        }
        val nomeTitulo = (elementos.map { "${nomeDe(it)} (${it.simbolo})" } + compostos.map { nomeDe(it) })
        val acoes = if (elementos.isNotEmpty() && ids.any { dic.propriedade(it)?.temEscopo("elemento") == true }) listOf(acaoFichaElemento(elementos[0]))
        else compostos.firstOrNull()?.let { listOf(acaoFichaComposto(it)) } ?: elementos.firstOrNull()?.let { listOf(acaoFichaElemento(it)) }.orEmpty()
        val blocos = mutableListOf<Bloco>()
        blocos += campos
        if (campos.isNotEmpty() && ids.any { it == "estadosOxidacao" || it == "configuracaoEletronica" }) blocos += Bloco.Paragrafo(t(R.string.resp_valor_do_pacote))
        avisos.forEach { blocos += Bloco.Aviso(it) }
        // partículas do átomo ou do íon (18/10/2026, §7): a carga e o número de massa da pergunta valem para o elemento citado nela
        var particulasOk = false
        var especieParticulas: String? = null
        if ("particulas" in ids) {
            for (e in elementos.take(3)) {
                val daPergunta = e.simbolo == q.elemento
                val p = blocosParticulas(e, if (daPergunta) q.cargaFormula else null, if (daPergunta) q.numeroMassa else null)
                if (!umaEntidade) blocos += Bloco.Paragrafo("${nomeDe(e)} (${p.especie})")
                blocos += p.blocos
                if (p.ok) { particulasOk = true; fontes += e.fontes }
                if (especieParticulas == null) especieParticulas = "${nomeDe(e)} (${p.especie})"
            }
        }
        if (ausentes.isNotEmpty()) {
            val d0 = ausentes[0].first
            blocos += if (campos.isEmpty() && !particulasOk && ausentes.size == 1 && d0.id in Propriedades.TERMO) {
                // termoquímica sem valor: diz qual falta (ΔGf° da água), sem estimar
                Bloco.Paragrafo(t(R.string.resp_prop_falta_termo, t.minusNoMeio(Propriedades.rotuloMedida(d0, t)), Propriedades.TERMO[d0.id], ausentes[0].second))
            } else if (campos.isEmpty() && !particulasOk && ausentes.size == 1) Bloco.Paragrafo(t(R.string.resp_prop_sem_valor, t.minusNoMeio(ausentes[0].first.rotulo), ausentes[0].second))
            else Bloco.Aviso(t(R.string.resp_prop_nao_tem, ausentes.joinToString("; ") { (d, n) -> t(R.string.resp_prop_de, t.minusNoMeio(d.rotulo), n) }))
        }
        // o que o pacote traz dos compostos sem a medida pedida ("o pacote não traz a densidade do etanol, mas traz…")
        for (c in semMedida.values) {
            val tem = Propriedades.medidasDoComposto(c, dic.propriedades, t, un).filter { it.def.id !in ids }
            if (tem.isNotEmpty()) {
                blocos += Bloco.Paragrafo(t(R.string.resp_prop_oferece, nomeDe(c), Propriedades.listar(t, tem.map { "${t.minusNoMeio(Propriedades.rotuloMedida(it.def, t))} (${it.formatado.curto})" })))
                fontes += tem.flatMap { m -> m.fontes.map { it.fonte } }
            } else fontes += c.fontes
        }
        // configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §2.2): além do valor do pacote, a distribuição calculada (como o site)
        val acoesFinais = acoes.toMutableList()
        if ("configuracaoEletronica" in ids) {
            for (e in elementos.take(3)) {
                val (bl, fs) = blocosEletronica(e)
                blocos += bl
                fontes += fs
            }
            elementos.firstOrNull()?.takeIf { it.configuracaoEletronica != null }?.let { acoesFinais += acaoCalculadora(TipoCalculadora.ELETRONICA, mapOf("elemento" to it.simbolo)) }
        }
        if (campos.isEmpty() && fontes.isEmpty()) fontes += (elementos.flatMap { it.fontes } + compostos.flatMap { it.fontes })
        val titulo = when {
            ids == listOf("particulas") && umaEntidade && especieParticulas != null -> t(R.string.resp_part_titulo, especieParticulas)
            umaEntidade -> "${nomeTitulo.first()}: ${if (compostos.isNotEmpty() && def0.medida) Propriedades.rotuloMedida(def0, t) else def0.rotulo}"
            else -> t(R.string.resp_prop_propriedades_de, Propriedades.listar(t, nomeTitulo))
        }
        return Resposta(
            Intent.PROPRIEDADE, titulo, blocos,
            fontes = fontes.distinctBy { "${it.nome}|${it.url}|${it.detalhe}" }.ifEmpty { fontesDoPacote() },
            acoes = acoesFinais, entendida = campos.isNotEmpty() || particulasOk
        )
    }

    // ---- nomenclatura, estrutura, comparação -----------------------------------------------------------------------------------------

    private suspend fun nomenclatura(q: ParsedQuery): Resposta {
        val c = compostoDe(q)
        if (c != null) {
            val perguntaFormula = Regex("""\bformula\b""").containsMatchIn(Texto.chaveNome(q.textoOriginal)) && q.formula == null
            val blocos = mutableListOf<Bloco>()
            if (perguntaFormula || q.formula == null) {
                c.formula?.let { blocos += Bloco.Campo(t(R.string.rot_formula), Texto.formulaUnicode(it)) }
                blocos += Bloco.Campo(t(R.string.rot_nome), nomeDe(c))
            } else {
                blocos += Bloco.Campo(t(R.string.rot_nome), nomeDe(c))
                c.formula?.let { blocos += Bloco.Campo(t(R.string.rot_formula), Texto.formulaUnicode(it)) }
            }
            c.nomeIupac?.let { blocos += Bloco.Campo(t(R.string.rot_nome_iupac), it) }
            c.nomePopular?.let { blocos += Bloco.Campo(t(R.string.rot_nome_popular), it) }
            return Resposta(
                Intent.NOMENCLATURA, t(R.string.resp_nome_e_formula, nomeDe(c)), blocos, fontes = c.fontes.ifEmpty { fontesDoPacote() },
                acoes = listOf(acaoFichaComposto(c))
            )
        }
        val e = elementoDe(q)
        if (e != null) {
            // o nome em inglês só vale como campo à parte quando o idioma não é o inglês
            val ingles = e.nomeEn?.takeIf { idioma != "en" }
            return Resposta(
                Intent.NOMENCLATURA, t(R.string.resp_nome_e_simbolo, nomeDe(e)),
                listOf(Bloco.Campo(t(R.string.rot_nome), nomeDe(e)), Bloco.Campo(t(R.string.rot_simbolo), e.simbolo), ingles?.let { Bloco.Campo(t.rotuloNomeEm("en"), it) } ?: Bloco.Paragrafo("")),
                fontes = e.fontes, acoes = listOf(acaoFichaElemento(e))
            )
        }
        return semDado(q, t(R.string.resp_nomenclatura_nao_encontrada))
    }

    private suspend fun desenhar(q: ParsedQuery): Resposta {
        val c = compostoDe(q)
        if (c?.smiles != null) {
            return Resposta(
                Intent.DESENHAR, t(R.string.resp_estrutura_de, nomeDe(c)),
                listOf(
                    Bloco.Estrutura(c.smiles, "${nomeDe(c)}${c.formula?.let { ", ${Texto.formulaUnicode(it)}" } ?: ""}"),
                    Bloco.Campo(t(R.string.rot_smiles), c.smiles)
                ),
                fontes = c.fontes.ifEmpty { fontesDoPacote() },
                acoes = listOf(acaoFichaComposto(c))
            )
        }
        if (c != null) return semDado(q, t(R.string.resp_sem_smiles, nomeDe(c)))
        val e = elementoDe(q)
        if (e != null) {
            return Resposta(
                Intent.DESENHAR, t(R.string.resp_e_um_elemento, nomeDe(e)),
                listOf(Bloco.Paragrafo(t(R.string.resp_elemento_sem_estrutura)), Bloco.Campo(t(R.string.rot_configuracao_eletronica), e.configuracaoEletronica.orEmpty()).takeIf { e.configuracaoEletronica != null } ?: Bloco.Paragrafo("")),
                fontes = e.fontes, acoes = listOf(acaoFichaElemento(e))
            )
        }
        return semDado(q, t(R.string.resp_desenhar_nao_encontrado))
    }

    private suspend fun comparar(q: ParsedQuery): Resposta {
        val elementos = q.elementos.mapNotNull { pacote.porSimbolo[it] }
        val compostos = q.compostos.mapNotNull { it.toLongOrNull() }.mapNotNull { pacote.composto(it) }
        val blocos = mutableListOf<Bloco>()
        val fontes = mutableListOf<Fonte>()
        val acoes = mutableListOf<Acao>()
        val semDado = t(R.string.resp_sem_dado_valor)
        if (elementos.size >= 2) {
            // "ordem crescente de número atômico de Na, Al, Zn…", "qual tem maior raio: K ou Na?": a lista ordenada vem antes da tabela (como no site)
            val defOrdem = if (q.ordem != null) q.propriedade?.let { dic.propriedade(it) } else null
            if (defOrdem != null && (defOrdem.alvo == "elemento" || "elemento" in defOrdem.escopos)) {
                val itens = elementos.map { e ->
                    val v = (Propriedades.bruto(defOrdem, e) as? Number)?.toDouble()?.takeIf { it.isFinite() }
                    Triple("${nomeDe(e)} (${e.simbolo})", v, v?.let { Propriedades.formatar(t, defOrdem, Propriedades.bruto(defOrdem, e), un, nivel)?.curto })
                }
                fraseDeOrdem(q.ordem!!, defOrdem.rotulo, itens)?.let { blocos += Bloco.Paragrafo(it) }
            }
            val ids = listOf("numeroAtomico", "massaAtomica", "categoria", "eletronegatividade", "raioAtomicoPm", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3")
            for (id in ids) {
                val d = dic.propriedade(id) ?: continue
                val valores = elementos.map { Propriedades.formatar(t, d, Propriedades.bruto(d, it), un, nivel)?.curto }
                if (valores.all { it == null }) continue
                blocos += Bloco.Campo(Texto.capitalizar(d.rotulo), elementos.indices.joinToString(" | ") { i -> "${nomeDe(elementos[i])}: ${valores[i] ?: semDado}" })
            }
            elementos.forEach { fontes += it.fontes; acoes += acaoAbrir(it) }
        } else if (compostos.size >= 2) {
            for (id in listOf("formula", "massaMolar", "xlogp")) {
                val d = dic.propriedade(id) ?: continue
                val valores = compostos.map { Propriedades.formatar(t, d, Propriedades.bruto(d, it), un, nivel)?.curto }
                if (valores.all { it == null }) continue
                blocos += Bloco.Campo(Texto.capitalizar(d.rotulo), compostos.indices.joinToString(" | ") { i -> "${nomeDe(compostos[i])}: ${valores[i] ?: semDado}" })
            }
            // como no site: a fonte principal de cada composto (PubChem) e, abaixo, a origem de cada valor medido
            compostos.forEach { fontes += it.fontes.take(1); acoes += acaoAbrir(it) }
            // propriedades físicas medidas (Wikidata, como no site): linha só quando pelo menos dois compostos têm o valor; fonte de cada valor
            val medidas = compostos.map { c -> Propriedades.medidasDoComposto(c, dic.propriedades, t, un).associateBy { it.def.id } }
            val pedidas = q.propriedades.ifEmpty { listOfNotNull(q.propriedade) }.toSet()
            val frases = mutableListOf<String>()
            val frasesOrdem = mutableListOf<String>()
            for (id in Propriedades.MEDIDAS_COMPOSTO) {
                val ms = medidas.map { it[id] }
                if (ms.count { it != null } < 2) continue
                val def = ms.firstNotNullOf { it }.def
                blocos += Bloco.Campo(Texto.capitalizar(Propriedades.rotuloMedida(def, t)), compostos.indices.joinToString(" | ") { i -> "${nomeDe(compostos[i])}: ${ms[i]?.formatado?.curto ?: semDado}" })
                ms.filterNotNull().forEach { m -> fontes += m.fontes.map { it.fonte } }
                // a propriedade pedida ("compare a densidade da água e do ácido acético"): qual é maior, só entre valores da mesma unidade
                val num = ms.withIndex().mapNotNull { (i, m) -> (m?.valor as? Number)?.toDouble()?.let { Triple(i, m, it) } }
                if (id in pedidas && num.size >= 2 && num.map { it.second.campo }.distinct().size == 1) {
                    val topo = num.maxBy { it.third }
                    val base = num.minBy { it.third }
                    val unicos = num.count { it.third == topo.third } == 1 && num.count { it.third == base.third } == 1
                    if (id in Propriedades.TERMO && unicos) {
                        // ΔHf°/ΔGf°/S° (18/10/2026): o maior e o menor; valor negativo = "mais negativo" (mais estável em relação aos elementos)
                        frases += t(
                            if (base.third < 0) R.string.resp_comparar_maior_mais_negativo else R.string.resp_comparar_maior_menor,
                            Texto.capitalizar(def.rotulo), nomeDe(compostos[topo.first]), topo.second.formatado.curto, nomeDe(compostos[base.first]), base.second.formatado.curto
                        )
                    } else if (num.count { it.third == topo.third } == 1) frases += t(R.string.resp_comparar_maior, Texto.capitalizar(def.rotulo), nomeDe(compostos[topo.first]), topo.second.formatado.curto)
                }
                // ordem pedida ("ordem crescente de densidade: água, etanol e glicerina"): lista ordenada antes da tabela
                if (q.ordem != null && id in pedidas && num.size >= 2 && num.map { it.second.campo }.distinct().size == 1) {
                    val itens = compostos.indices.map { i ->
                        val m = ms[i]
                        val v = (m?.valor as? Number)?.toDouble()
                        Triple(nomeDe(compostos[i]), v, if (v != null) m?.formatado?.curto else null)
                    }
                    fraseDeOrdem(q.ordem, def.rotulo, itens)?.let { frasesOrdem += it }
                }
            }
            frases.forEach { blocos += Bloco.Paragrafo(it) }
            if (frasesOrdem.isNotEmpty()) blocos.addAll(0, frasesOrdem.map { Bloco.Paragrafo(it) })
        } else {
            return semDado(q, t(R.string.resp_comparar_cite_dois))
        }
        val titulo = if (elementos.size >= 2) elementos.joinToString(" × ") { nomeDe(it) } else compostos.joinToString(" × ") { nomeDe(it) }
        return Resposta(
            Intent.COMPARAR, t(R.string.resp_comparar_titulo, titulo), blocos.ifEmpty { listOf(Bloco.Paragrafo(t(R.string.resp_comparar_sem_comum))) },
            fontes = fontes.distinctBy { "${it.nome}|${it.url}|${it.detalhe}" }.take(12), acoes = acoes
        )
    }

    /**
     * Frase com os itens em ordem de uma propriedade numérica ("Número atômico, em ordem crescente: Sódio (Na) 11 < Alumínio (Al) 13…"), como
     * `fraseDeOrdem` do site. [itens]: (nome, valor, valor formatado; null = sem o valor no pacote, citado à parte). null se menos de dois têm o valor.
     */
    private fun fraseDeOrdem(ordem: String, rotulo: String, itens: List<Triple<String, Double?, String?>>): String? {
        val desc = ordem == "decrescente"
        val com = itens.filter { it.second != null && it.third != null }.let { l -> if (desc) l.sortedByDescending { it.second!! } else l.sortedBy { it.second!! } }
        if (com.size < 2) return null
        val lista = StringBuilder("${com[0].first} ${com[0].third}")
        for (i in 1 until com.size) lista.append(if (com[i].second == com[i - 1].second) " = " else if (desc) " > " else " < ").append("${com[i].first} ${com[i].third}")
        var frase = t(if (desc) R.string.resp_comparar_ordem_decrescente else R.string.resp_comparar_ordem_crescente, Texto.capitalizar(rotulo), lista.toString())
        val sem = itens.filter { it.third == null }.map { it.first }
        if (sem.isNotEmpty()) frase += " " + t(R.string.resp_comparar_sem_dado_ordem, Propriedades.listar(t, sem))
        return frase
    }

    // ---- segurança -----------------------------------------------------------------------------------------------------------------------

    private suspend fun seguranca(q: ParsedQuery): Resposta {
        val c = compostoDe(q)
        val e = elementoDe(q)
        val blocos = mutableListOf<Bloco>()
        val acoes = mutableListOf<Acao>()
        var fontes: List<Fonte> = emptyList()
        val titulo: String
        val emMistura = Regex("""\b(misturar|mistura|misturo|misturas|juntar|combinar)\b""").containsMatchIn(Texto.chaveNome(q.textoOriginal))
        if (emMistura) {
            titulo = t(R.string.resp_misturar_titulo)
            blocos += Bloco.Paragrafo(t(R.string.resp_misturar_aviso))
            val citados = q.compostos.mapNotNull { it.toLongOrNull() }.mapNotNull { pacote.composto(it) }
            for (x in citados.filter { it.ghs != null && (it.ghs.pictogramas.isNotEmpty() || it.ghs.frasesH.isNotEmpty()) }) {
                blocos += Bloco.Paragrafo(t(R.string.resp_ghs_no_pacote, nomeDe(x)))
                blocos += Bloco.GhsBloco(x.ghs!!, textosH(x.ghs.textosH))
            }
            fontes = citados.flatMap { it.fontes }.distinctBy { it.nome }.take(3)
            citados.firstOrNull()?.let { acoes += acaoFichaComposto(it) }
        } else if (c != null) {
            titulo = t(R.string.resp_seguranca_titulo, nomeDe(c))
            val g = c.ghs
            if (g != null && (g.pictogramas.isNotEmpty() || g.frasesH.isNotEmpty())) {
                blocos += Bloco.GhsBloco(g, textosH(g.textosH))
                // a fonte CLP (1272/2008) já vai localizada na lista de fontes da resposta; só outra fonte ganha linha própria (GhsFonte)
                GhsFonte.linhaAvulsa(g.fonte)?.let { blocos += Bloco.Paragrafo(t(R.string.resp_ghs_classificacao, it)) }
            } else {
                blocos += Bloco.Paragrafo(t(R.string.resp_sem_ghs, nomeDe(c)))
            }
            blocos += Bloco.Aviso(t(R.string.resp_fispq_aviso))
            fontes = c.fontes
            acoes += acaoFichaComposto(c)
            c.icscBuscaUrl?.let { acoes += acaoIcsc(it) }
        } else if (e != null) {
            titulo = t(R.string.resp_seguranca_titulo, nomeDe(e))
            blocos += Bloco.Paragrafo(t(R.string.resp_seguranca_elemento, nomeDe(e)))
            fontes = e.fontes
            acoes += acaoFichaElemento(e)
        } else {
            titulo = t(R.string.resp_seguranca_geral_titulo)
            blocos += Bloco.Paragrafo(t(R.string.resp_seguranca_geral_intro))
            blocos += Bloco.Lista(GhsPictogramas.CODIGOS.map { "$it: ${t(GhsPictogramas.desenho(it))} (${t(GhsPictogramas.descricao(it))})" })
            fontes = listOf(Fonte(t(R.string.fonte_ghs_nome), licenca = t(R.string.fonte_ghs_licenca)))
        }
        blocos += Bloco.Paragrafo(t(R.string.resp_emergencia))
        acoes += acaoSeguranca()
        return Resposta(Intent.SEGURANCA, titulo, blocos, fontes = fontes.ifEmpty { fontesDoPacote() }, acoes = acoes, sugestoes = emptyList())
    }

    internal fun textosH(doComposto: Map<String, String>): Map<String, String> {
        val m = LinkedHashMap<String, String>()
        m.putAll(pacote.frasesH(idioma))
        // os textos que vêm no registro do composto são em português: só valem em pt-BR (nos outros idiomas, o pacote multilíngue)
        if (idioma == Idiomas.PADRAO) m.putAll(doComposto) else doComposto.forEach { (k, v) -> m.putIfAbsent(k, v) }
        return m
    }

    // ---- tabela periódica, conceito, não entendi ---------------------------------------------------------------------------------------

    /** "constante de equilibrio" (Kc/Kp sem equação, 18/10/2026): conceito + pedido da equação + calculadora de Kc e Kp (RespostasParticulas.kt). */
    private suspend fun conceito(q: ParsedQuery): Resposta =
        if (q.conceito == LocalNlu.CONCEITO_CONSTANTE_EQUILIBRIO) conceitoConstanteEquilibrio(q) else buscarConceito(q)

    private suspend fun naoEntendi(q: ParsedQuery): Resposta = respostaNaoEntendi(q)

    internal fun semDado(q: ParsedQuery, mensagem: String): Resposta = Resposta(
        q.intent, t(R.string.resp_sem_dado_titulo), listOf(Bloco.Paragrafo(mensagem)),
        sugestoes = emptyList(), entendida = false
    )
}
