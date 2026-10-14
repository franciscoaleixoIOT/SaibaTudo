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
        c.smiles?.let { blocos += Bloco.Estrutura(it, "${nomeDe(c)}${c.formula?.let { f -> ", ${Texto.formulaUnicode(f)}" } ?: ""}") }
        c.definicaoChebi?.let { blocos += Bloco.Paragrafo(t(R.string.resp_definicao_chebi, it.licenca, it.texto)) }
        return Resposta(
            Intent.COMPOSTO, nomeDe(c), blocos, fontes = c.fontes.ifEmpty { fontesDoPacote() },
            acoes = listOf(acaoFichaComposto(c)) + listOfNotNull(c.icscBuscaUrl?.let { acaoIcsc(it) }),
            sugestoes = listOf(t(R.string.sug_perigos_de, nomeCru(c)), t(R.string.sug_estrutura_de, nomeCru(c)))
        )
    }

    private suspend fun propriedade(q: ParsedQuery): Resposta {
        val def = q.propriedade?.let { dic.propriedade(it) } ?: return naoEntendi(q)
        val e = elementoDe(q)
        val c = if (e == null) compostoDe(q) else null
        if (e == null && c == null) {
            val exemplos = pacote.elementos.take(40).mapNotNull { el ->
                if (Propriedades.formatar(t, def, Propriedades.bruto(def, el), un) != null) {
                    val pergunta = t(R.string.sug_propriedade_de, t.minusNoMeio(def.rotulo), nomeCru(el))
                    // português: "Qual ponto de fusão de X?" vira "Qual o ponto de fusão de X?" (nos outros idiomas o par de ajuste é vazio)
                    val de = t(R.string.sug_propriedade_ajuste_de)
                    if (de.isEmpty()) pergunta else pergunta.replace(de, t(R.string.sug_propriedade_ajuste_para))
                } else null
            }.take(3)
            return Resposta(
                Intent.PROPRIEDADE, def.rotulo.replaceFirstChar { it.uppercase() },
                listOf(Bloco.Paragrafo(t(R.string.resp_prop_de_qual))),
                sugestoes = exemplos, entendida = false
            )
        }
        val nome = e?.let { "${nomeDe(it)} (${it.simbolo})" } ?: nomeDe(c!!)
        val valor = if (e != null) Propriedades.formatar(t, def, Propriedades.bruto(def, e), un, nivel) else Propriedades.formatar(t, def, Propriedades.bruto(def, c!!), un, nivel)
        if (valor == null) {
            return Resposta(
                Intent.PROPRIEDADE, "$nome: ${def.rotulo}",
                listOf(Bloco.Paragrafo(t(R.string.resp_prop_sem_valor, def.rotulo, nome))),
                fontes = if (e != null) e.fontes else c!!.fontes,
                acoes = if (e != null) listOf(acaoFichaElemento(e)) else listOf(acaoFichaComposto(c!!)),
                entendida = false
            )
        }
        val blocos = mutableListOf<Bloco>(Bloco.Campo(def.rotulo.replaceFirstChar { it.uppercase() }, valor.texto))
        if (def.id == "estadosOxidacao" || def.id == "configuracaoEletronica") blocos += Bloco.Paragrafo(t(R.string.resp_valor_do_pacote))
        return Resposta(
            Intent.PROPRIEDADE, "$nome: ${def.rotulo}", blocos,
            fontes = (if (e != null) e.fontes else c!!.fontes).ifEmpty { fontesDoPacote() },
            acoes = if (e != null) listOf(acaoFichaElemento(e)) else listOf(acaoFichaComposto(c!!))
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
            val ids = listOf("numeroAtomico", "massaAtomica", "categoria", "eletronegatividade", "raioAtomicoPm", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3")
            for (id in ids) {
                val d = dic.propriedade(id) ?: continue
                val valores = elementos.map { Propriedades.formatar(t, d, Propriedades.bruto(d, it), un, nivel)?.curto }
                if (valores.all { it == null }) continue
                blocos += Bloco.Campo(d.rotulo.replaceFirstChar { it.uppercase() }, elementos.indices.joinToString(" | ") { i -> "${nomeDe(elementos[i])}: ${valores[i] ?: semDado}" })
            }
            elementos.forEach { fontes += it.fontes; acoes += acaoAbrir(it) }
        } else if (compostos.size >= 2) {
            val ids = listOf("formula", "massaMolar", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "xlogp")
            for (id in ids) {
                val d = dic.propriedade(id) ?: continue
                val valores = compostos.map { Propriedades.formatar(t, d, Propriedades.bruto(d, it), un, nivel)?.curto }
                if (valores.all { it == null }) continue
                blocos += Bloco.Campo(d.rotulo.replaceFirstChar { it.uppercase() }, compostos.indices.joinToString(" | ") { i -> "${nomeDe(compostos[i])}: ${valores[i] ?: semDado}" })
            }
            compostos.forEach { fontes += it.fontes; acoes += acaoAbrir(it) }
        } else {
            return semDado(q, t(R.string.resp_comparar_cite_dois))
        }
        val titulo = if (elementos.size >= 2) elementos.joinToString(" × ") { nomeDe(it) } else compostos.joinToString(" × ") { nomeDe(it) }
        return Resposta(
            Intent.COMPARAR, t(R.string.resp_comparar_titulo, titulo), blocos.ifEmpty { listOf(Bloco.Paragrafo(t(R.string.resp_comparar_sem_comum))) },
            fontes = fontes.distinctBy { it.nome }.take(3), acoes = acoes
        )
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

    private suspend fun conceito(q: ParsedQuery): Resposta = buscarConceito(q)

    private suspend fun naoEntendi(q: ParsedQuery): Resposta = respostaNaoEntendi(q)

    internal fun semDado(q: ParsedQuery, mensagem: String): Resposta = Resposta(
        q.intent, t(R.string.resp_sem_dado_titulo), listOf(Bloco.Paragrafo(mensagem)),
        sugestoes = emptyList(), entendida = false
    )
}
