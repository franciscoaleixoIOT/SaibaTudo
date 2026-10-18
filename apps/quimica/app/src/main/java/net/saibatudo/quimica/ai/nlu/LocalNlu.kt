package net.saibatudo.quimica.ai.nlu

import net.saibatudo.quimica.ai.Seguranca
import net.saibatudo.quimica.ai.model.Concentracao
import net.saibatudo.quimica.ai.model.Intent
import net.saibatudo.quimica.ai.model.ParsedQuery
import net.saibatudo.quimica.ai.model.Quantidade
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto
import net.saibatudo.quimica.domain.calc.Balanceador
import net.saibatudo.quimica.domain.calc.FormulaQuimica

/**
 * NLU LOCAL determinístico (regras + dicionário derivado dos dados): converte uma pergunta em [ParsedQuery] (intenção +
 * entidades). Não consulta nem produz fatos. É o espelho de web/src/quimica/js/nlu.js, com a MESMA ORDEM de regras; os casos
 * de referência de contracts/nlu_golden_cases.json (por `idioma`) validam os dois. Todo texto em língua natural (gatilhos, unidades por
 * extenso, categorias…) vem do LÉXICO do idioma ([Lexico], gerado de contracts/lexico/<idioma>.json): nada de português fixo aqui.
 *
 * Ordem (a primeira regra que casa vence):
 *  1. segurança química (RECUSA_PERIGO), antes de qualquer outra coisa;
 *  2. conversa e meta: AJUDA (saudação), SOBRE_DADOS, FONTES, AJUDA ("o que você faz");
 *  2b. EQUILIBRIO e ENTALPIA (antes da equação, senão viram BALANCEAR); "ΔHf do X" = PROPRIEDADE entalpiaFormacaoKJmol; "ΔGf do X" =
 *      energiaGibbsFormacaoKJmol; Kc/Kp sem equação = CONCEITO "constante de equilibrio" (18/10/2026);
 *  3. equação química: ESTEQUIOMETRIA (com quantidades) ou BALANCEAR;
 *  4. CONVERSAO_UNIDADE (duas unidades da mesma grandeza);
 *  5. cálculos: PH, GAS_IDEAL, CONCENTRACAO, ESTEQUIOMETRIA, MASSA_MOLAR;
 *  5b. NOX e LIGACAO (antes de COMPARAR);
 *  6. COMPARAR, DESENHAR, SEGURANCA, NOMENCLATURA;
 *  7. TABELA_PERIODICA;
 *  8. PROPRIEDADE, ELEMENTO, COMPOSTO;
 *  9. CONCEITO e, por fim, DESCONHECIDA.
 */
object LocalNlu {

    const val TAMANHO_MAXIMO = 300

    private val RX_SETA = Regex("""\s*(?:<=>|<->|⇌|⇄|-->|->|→|⟶|⇒|=>|==|=)\s*""")

    // ---- equação -----------------------------------------------------------------------------------------------------------------

    private val RX_ELETRON = Regex("""^e(?:\^?[-−]|⁻)$""")

    private fun ehEspecie(tok: String): Boolean {
        val t = tok.trimEnd('.', ',', ';', ':', '!', '?')
        if (t.isEmpty()) return false
        if (t == "+" || t.all { it.isDigit() }) return true
        val partes = Balanceador.dividirEspecies(t)
        if (partes.isEmpty()) return false
        return partes.all { p ->
            val corpo = p.replace(Regex("""^\d+\s*"""), "")
            RX_ELETRON.matches(corpo) || (corpo.isNotEmpty() && (corpo[0] in 'A'..'Z' || corpo[0] == '(' || corpo[0] == '[') && FormulaQuimica.tentar(corpo) != null)
        }
    }

    /** Extrai "Fe + O2 -> Fe2O3" de uma frase; null se não houver equação. */
    fun extrairEquacao(original: String): String? = extrairEquacaoComPosicao(original)?.first

    /** A equação normalizada e o trecho (índices do texto original) que ela ocupa. */
    fun extrairEquacaoComPosicao(original: String): Pair<String, IntRange>? {
        val m = RX_SETA.find(original) ?: return null
        val tok = Regex("""\S+""")
        val esq = tok.findAll(original.substring(0, m.range.first)).toList()
        val dirOffset = m.range.last + 1
        val dir = tok.findAll(original.substring(dirOffset)).toList()
        val l = ArrayDeque<MatchResult>()
        for (i in esq.indices.reversed()) { if (ehEspecie(esq[i].value)) l.addFirst(esq[i]) else break }
        val r = mutableListOf<Pair<String, IntRange>>()
        for (x in dir) {
            if (!ehEspecie(x.value)) break
            val limpo = x.value.trimEnd('.', ',', ';', ':', '!', '?')
            r += limpo to ((dirOffset + x.range.first)..(dirOffset + x.range.first + limpo.length - 1))
        }
        val lista = l.map { it.value to it.range }.toMutableList()
        while (lista.isNotEmpty() && lista.last().first == "+") lista.removeAt(lista.lastIndex)
        while (r.isNotEmpty() && r.last().first == "+") r.removeAt(r.lastIndex)
        fun soNumerosOuMais(x: List<Pair<String, IntRange>>) = x.all { it.first.all { c -> c.isDigit() } || it.first == "+" }
        if (lista.isEmpty() || r.isEmpty() || soNumerosOuMais(lista) || soNumerosOuMais(r)) return null
        val equacao = lista.joinToString(" ") { it.first } + " -> " + r.joinToString(" ") { it.first }
        return equacao to (lista.first().second.first..r.last().second.last)
    }

    // ---- parse -------------------------------------------------------------------------------------------------------------------------

    /**
     * Interpreta [pergunta] com o dicionário [d] (pacote + idioma) e o léxico [lex] do idioma (padrão: o do dicionário). [contexto] é a
     * pergunta anterior já resolvida (para "e o ponto de ebulição?"/"and gold?").
     */
    fun parse(pergunta: String, d: Dicionario, contexto: ParsedQuery? = null, lex: Lexico = d.lexico): ParsedQuery {
        val original = Regex("""\s+""").replace(pergunta, " ").trim().take(TAMANHO_MAXIMO)
        val n = Texto.nlu(original)
        var p = ParsedQuery(Intent.DESCONHECIDA, textoOriginal = original)
        if (n.isEmpty() && !RX_SETA.containsMatchIn(original)) return p
        fun i(nome: String) = lex.intencao(nome).containsMatchIn(n)
        fun pista(nome: String) = lex.pista(nome).containsMatchIn(n)

        // 1) segurança: antes de tudo (idioma do léxico + inglês + português)
        if (Seguranca.avaliar(original, Seguranca.idiomasDaAvaliacao(lex.idioma)).recusar) return p.copy(intent = Intent.RECUSA_PERIGO)

        val unidades = d.unidades
        val ents = d.entidades(original)
        val props = d.propriedadesEm(n)
        val quant = Quantidades.ler(original, unidades, lex)
        val temQuant = quant.any { it.unidade != null && it.unidade != "%" }
        val equacao = extrairEquacao(original)
        val nivel = lex.nivelDe(n)
        val constantes = Quantidades.lerConstantes(original, lex)
        val quantidadesPublicas = quant.mapNotNull { q -> q.unidade?.let { Quantidade(q.valor, it, q.texto) } }

        // entidades: um nome de elemento que também é de composto prefere o elemento, salvo "gás"/fórmula digitada
        val els = ents.elementos
        val comps = ents.compostos
        var compostos = comps
        if (els.isNotEmpty() && comps.isNotEmpty()) {
            val nomesEl = els.map { Texto.nlu(it.nome) }.toSet()
            compostos = comps.filter { it.via != "nome" || Texto.nlu(it.nome) !in nomesEl || pista("gasSubstancia") }
        }
        // um nome de elemento que só aparece dentro do nome de uma propriedade não cita o elemento ("radio atómico" em espanhol não é o rádio)
        val nSemProp = if (props.isNotEmpty()) d.semPropriedades(n) else n
        fun temPalavra(txt: String, w: String) = w.isNotEmpty() && " $txt ".contains(" $w ")
        fun soNaPropriedade(e: Achado) = e.via == "nome" && temPalavra(n, Texto.nlu(e.nome)) && !temPalavra(nSemProp, Texto.nlu(e.nome))
        val elementos = els.filter { e -> !(compostos.isNotEmpty() && compostos.any { it.via == "formula" && it.texto == e.simbolo }) && !soNaPropriedade(e) }
        val formulasTexto = ents.formulas.map { it.texto!! }
        p = p.copy(
            nivel = nivel, quantidades = quantidadesPublicas, constantes = constantes,
            elementos = elementos.map { it.simbolo!! }, elemento = elementos.firstOrNull()?.simbolo,
            compostos = compostos.map { it.cid.toString() }, composto = compostos.firstOrNull()?.cid?.toString(), compostoNome = compostos.firstOrNull()?.nome,
            formulas = formulasTexto, formula = formulasTexto.firstOrNull() ?: compostos.firstOrNull { it.via == "formula" }?.texto,
            propriedades = props.map { it.id }, propriedade = props.firstOrNull()?.id
        )
        // íon de UM elemento ("Fe2+", "Cl-", "íon ferro 2+") e número de massa ("Fe-56", "carbono-14"): o elemento, `cargaFormula` e `numeroMassa`;
        // o token sai das fórmulas e dos compostos por fórmula ("O2-" é o óxido, não o O2). Com equação na pergunta, nada muda (semirreações).
        if (equacao == null) {
            val ext = lerIonsEIsotopo(original, d, lex, props.any { it.id == "particulas" })
            if (ext.simbolos.isNotEmpty()) {
                fun doIon(txt: String?) = (txt ?: "").replace(RX_CARGA_E_MASSA, "") in ext.simbolos
                compostos = compostos.filter { !(it.via == "formula" && doIon(it.texto)) }
                val formulasSemIon = p.formulas.filter { !doIon(it) }
                // o elemento do íon/isótopo é o assunto da pergunta: vem primeiro
                val elementosComIon = (ext.simbolos + p.elementos).distinct()
                val elementoIon = elementosComIon.first()
                p = p.copy(
                    compostos = compostos.map { it.cid.toString() }, composto = compostos.firstOrNull()?.cid?.toString(), compostoNome = compostos.firstOrNull()?.nome,
                    formulas = formulasSemIon, formula = formulasSemIon.firstOrNull() ?: compostos.firstOrNull { it.via == "formula" }?.texto,
                    elementos = elementosComIon, elemento = elementoIon,
                    cargaFormula = ext.ions.firstOrNull { it.first == elementoIon }?.second,
                    numeroMassa = ext.isotopo?.takeIf { it.first == elementoIon }?.second
                )
            }
        }
        val nEnt = p.elementos.size + p.compostos.size + p.formulas.size
        val tem = nEnt > 0
        fun fim(intent: Intent, extra: (ParsedQuery) -> ParsedQuery = { it }): ParsedQuery = extra(p.copy(intent = intent))

        // 2) conversa e meta (uma saudação cujo único "nome" veio de aproximação por erro de digitação continua saudação)
        val todos = ents.elementos + ents.compostos + ents.formulas
        val soAproximado = todos.isNotEmpty() && todos.all { it.via == "aproximado" }
        if (i("saudacao") && (!tem || soAproximado)) return fim(Intent.AJUDA)
        if (i("sobreDados")) return fim(Intent.SOBRE_DADOS)
        if (i("fontes") && !tem) return fim(Intent.FONTES)
        if (i("ajuda")) return fim(Intent.AJUDA)

        // 2b) equilíbrio e entalpia (docs/CALCULADORAS_2026-10-17.md §1): antes da equação química, senão a equação viraria BALANCEAR.
        // EQUILIBRIO exige a equação (⇌, <=>, <->, ⇄, → ou = entre espécies); as concentrações entre colchetes ficam em `concentracoes`.
        val concentracoes = Quantidades.lerConcentracoes(original, unidades, lex)
        val setaDupla = RX_SETA_DUPLA.containsMatchIn(original)
        if (i("equilibrio") || (setaDupla && concentracoes.isNotEmpty())) {
            val eqE = if (concentracoes.isNotEmpty()) extrairEquacao(semConcentracoes(original, concentracoes)) ?: equacao else equacao
            // com seta dupla na pergunta (⇌, <=>, <->, ⇄), a equação fica com ⇌ (a mesma forma que a normalização do serviço usa)
            if (eqE != null) return fim(Intent.EQUILIBRIO) {
                it.copy(equacao = if (setaDupla) eqE.replaceFirst(" -> ", " ⇌ ") else eqE, concentracoes = concentracoes.map { c -> Concentracao(c.especie, c.valor, c.unidade) })
            }
            // Kc/Kp SEM equação ("qual o Kp a 500 K", "como calcular o Kc", "o que é Kc", "fórmula do Kp"): o conceito (18/10/2026, §7)
            if (pista("constanteEquilibrio")) return fim(Intent.CONCEITO) { it.copy(conceito = CONCEITO_CONSTANTE_EQUILIBRIO, propriedade = null, propriedades = emptyList()) }
        }
        val temComposto = p.compostos.isNotEmpty() || p.formulas.isNotEmpty()
        // "ΔHf do metano", "ΔH de formação do metano": a propriedade (entalpia padrão de formação), como "entalpia de formação do metano";
        // "ΔGf da água", "ΔG°f", "ΔG de formação": energia livre de Gibbs padrão de formação (18/10/2026)
        fun deltaFormacao(rxF: Regex, rx: Regex) =
            (rxF.containsMatchIn(original) || (rx.containsMatchIn(original) && pista("deFormacao"))) && temComposto && equacao == null && p.propriedade == null
        if (deltaFormacao(RX_DELTA_GF, RX_DELTA_G)) {
            return fim(Intent.PROPRIEDADE) { it.copy(propriedade = "energiaGibbsFormacaoKJmol", propriedades = listOf("energiaGibbsFormacaoKJmol"), alvoPropriedade = "composto") }
        }
        if (deltaFormacao(RX_DELTA_HF, RX_DELTA_H) && !pista("entalpiaCombustao") && !pista("hess")) {
            return fim(Intent.PROPRIEDADE) { it.copy(propriedade = "entalpiaFormacaoKJmol", propriedades = listOf("entalpiaFormacaoKJmol"), alvoPropriedade = "composto") }
        }
        if (i("entalpia") || RX_DELTA_H.containsMatchIn(original)) {
            val combustao = pista("entalpiaCombustao")
            val hess = pista("hess")
            // "entalpia de formação da água" é PROPRIEDADE (entalpiaFormacaoKJmol); "o que é entalpia?" é CONCEITO; "entalpia livre de formação" (ΔGf)
            // e "enthalpie libre standard de formation" também são PROPRIEDADE (a propriedade termoquímica citada)
            val soFormacao = (pista("entalpiaFormacao") || p.propriedade in PROPRIEDADES_TERMO) && temComposto && !combustao && !hess && equacao == null
            val definicao = equacao == null && !temComposto && (pista("prefixoDefinicao") || i("conceitoCue"))
            if (!soFormacao && !definicao && (equacao != null || temComposto || combustao || hess)) return fim(Intent.ENTALPIA) { it.copy(equacao = equacao) }
        }

        // 3) equação química
        if (equacao != null || i("balancear")) {
            val querCalcular = temQuant && pista("querCalcular")
            if (equacao != null && querCalcular) return fim(Intent.ESTEQUIOMETRIA) { it.copy(equacao = equacao) }
            return fim(Intent.BALANCEAR) { it.copy(equacao = equacao) }
        }

        // 4) conversão de unidades (duas unidades de uma mesma grandeza, ou "converter X para Y")
        val unidadesLidas = quant.filter { it.unidade != null }
        val textoCompacto = Regex("""^(.*\d)\s+""").replace(original.trim(), "$1 ").trim()
        val paraUnidade: String? = lex.paraUnidade.find(textoCompacto)?.let { Quantidades.lerUnidade(it.groupValues[1], unidades, lex) }
        val quantosUnidade = lex.quantosUnidade.find(Texto.semAcentos(original))
        // "para litros e metros cúbicos", "para atm, kPa e torr": um ou vários destinos (o primeiro é o unidadeDestino)
        val destinos = Quantidades.lerDestinos(original, unidades, lex)
        if (!tem || p.formulas.isEmpty() || temQuant) {
            val temConv = i("conversao") || quantosUnidade != null || lex.pista("conversaoPreposicoes").containsMatchIn(original)
            if (unidadesLidas.isNotEmpty() && temConv && !i("ph") && !i("gas") && !i("concentracao") && !i("estequiometria") && !i("massaMolar")) {
                var destino = if (quantosUnidade != null) Quantidades.lerUnidade(quantosUnidade.groupValues[1], unidades, lex) else paraUnidade ?: destinos.firstOrNull()
                if (destino == null && unidadesLidas.size >= 2) destino = unidadesLidas.last().unidade
                val origem = unidadesLidas.first().unidade
                if (destino != null && origem != null && destino != origem && unidades.buscar(origem) != null) {
                    val unidadesDestino = if (destinos.size > 1 && destinos[0] == destino) destinos.filter { u -> u != origem } else emptyList()
                    return fim(Intent.CONVERSAO_UNIDADE) { it.copy(unidadeDestino = destino, unidadesDestino = unidadesDestino, quantidades = listOfNotNull(unidadesLidas.first().let { q -> q.unidade?.let { u -> Quantidade(q.valor, u, q.texto) } })) }
                }
            }
        }

        // 5) cálculos
        val temKaKb = constantes.isNotEmpty()
        if (i("ph")) {
            if (temQuant || temKaKb || tem || pista("phContexto")) {
                if (temQuant || temKaKb) return fim(Intent.PH)
                if (pista("conector") && tem) return fim(Intent.PH)   // "pH da água" (sem concentração): a resposta pede os dados
            }
            return fim(Intent.CONCEITO) { it.copy(conceito = "ph") }
        }
        val gasPorVariaveis = i("gasVariavel") && unidadesLidas.any { it.unidade in UNIDADES_DE_GAS } && pista("gasGrandezas")
        if (i("gas") || RX_PV_NRT.containsMatchIn(original) || gasPorVariaveis) {
            if (pista("prefixoExplicacao") && !temQuant) return fim(Intent.CONCEITO) { it.copy(conceito = "gas ideal") }
            return fim(Intent.GAS_IDEAL)
        }
        if (i("concentracao") && (temQuant || pista("concentracaoForte")) && !pista("prefixoExplicacaoPalavra")) return fim(Intent.CONCENTRACAO)
        // "quantas partículas subatômicas tem o oxigênio" é PROPRIEDADE particulas; "quantas partículas há em 2 mol de Fe" (com quantidade) continua cálculo
        val soParticulas = p.propriedade == "particulas" && !temQuant
        if (i("estequiometria") && (temQuant || tem) && !pista("prefixoDefinicao") && !soParticulas) {
            // com várias substâncias, a primeira é a que recebe a quantidade ("16 g de metano" em "quantos gramas de CO2 se formam de 16 g de metano")
            val ligado = compostoLigadoAQuantidade(original, quant, d, p.compostos, lex)
            return fim(Intent.ESTEQUIOMETRIA) {
                if (ligado == null) it.copy(equacao = equacao)
                else it.copy(equacao = equacao, composto = ligado, compostos = listOf(ligado) + it.compostos.filter { c -> c != ligado })
            }
        }
        if (i("massaMolar") && !pista("prefixoDefinicao")) return fim(Intent.MASSA_MOLAR)
        // estequiometria sem "quantos": uma quantidade de massa, mols ou volume + substância citada + verbo de reação ("formada a partir de 2 g
        // de hidrogênio", "reage com 10 g de Cu2S") ou pedido de massa/mols/volume ("massa de meio mol de NaCl")
        val quantEsteq = unidadesLidas.any { q -> GRANDEZAS_ESTEQUIOMETRIA.any { g -> unidades.buscar(q.unidade!!, g) != null } }
        if (tem && quantEsteq && (pista("reacaoVerbo") || pista("pedidoQuantidade")) && !pista("prefixoDefinicao")) {
            val ligado = compostoLigadoAQuantidade(original, quant, d, p.compostos, lex)
            return fim(Intent.ESTEQUIOMETRIA) {
                if (ligado == null) it.copy(equacao = equacao)
                else it.copy(equacao = equacao, composto = ligado, compostos = listOf(ligado) + it.compostos.filter { c -> c != ligado })
            }
        }

        // 5b) NOX e tipo de ligação (docs/CALCULADORAS_2026-10-17.md §1). NOX exige o composto (fórmula ou nome); o `elemento` é só o átomo pedido
        // ("do enxofre no H2SO4"). "Estados de oxidação do ferro" (sem composto) continua PROPRIEDADE estadosOxidacao. O gatilho "nox" também é o
        // nome de um composto do pacote (óxidos de nitrogênio, NOx): dentro do gatilho ele não conta como composto citado.
        val outraPropriedade = p.propriedades.any { it != "estadosOxidacao" }
        val mNox = lex.intencao("nox").find(n)
        if (mNox != null && !outraPropriedade) {
            val gatilho = " ${mNox.value} "
            val compNox = compostos.filter { c -> !(c.via == "nome" && c.chave != null && gatilho.contains(" ${c.chave} ")) }
            val formulaNox = p.formulas.firstOrNull() ?: compNox.firstOrNull { it.via == "formula" }?.texto
            if (compNox.isNotEmpty() || formulaNox != null) {
                val elementoNox = elementoDoNox(n, original, d, lex)
                val cids = compNox.map { it.cid.toString() }
                return fim(Intent.NOX) {
                    it.copy(
                        composto = cids.firstOrNull(), compostos = cids, compostoNome = compNox.firstOrNull()?.nome, formula = formulaNox,
                        elemento = elementoNox, elementos = listOfNotNull(elementoNox), propriedade = null, propriedades = emptyList(),
                        cargaFormula = cargaDepoisDa(formulaNox, original)
                    )
                }
            }
        }
        // LIGACAO: com composto/fórmula, ou com dois elementos (`elemento` = o primeiro, como em COMPARAR; os dois ficam em `elementos`)
        val pistaLigacao = i("ligacao") || (pista("ligacaoPolaridade") && !i("comparar"))
        if (pistaLigacao && p.propriedade == null && !i("seguranca") && (temComposto || p.elementos.size >= 2)) return fim(Intent.LIGACAO)

        // 6) representação, comparação, segurança, nomenclatura
        if (i("comparar") && p.compostos.size + p.elementos.size + p.formulas.size >= 2) {
            // "ordem crescente de número atômico", "qual tem maior raio": a ordem pedida e, sem propriedade citada, a do extremo ("qual é mais denso")
            val extremoCmp = lex.extremos.firstOrNull { it.first.containsMatchIn(n) }?.second
            val ordem = when {
                pista("ordemDecrescente") -> "decrescente"
                pista("ordemCrescente") -> "crescente"
                extremoCmp != null -> if (extremoCmp.second == "max") "decrescente" else "crescente"
                else -> null
            }
            return fim(Intent.COMPARAR) { it.copy(ordem = ordem, propriedade = p.propriedade ?: if (ordem != null && extremoCmp != null) extremoCmp.first else null) }
        }
        if (i("desenhar") && (p.compostos.isNotEmpty() || p.formulas.isNotEmpty()) && !pista("propriedadesPalavra")) return fim(Intent.DESENHAR)
        // "a água mineral é pura ou mistura?", "classifique em substâncias e misturas": a mistura como CONCEITO, não o aviso de mistura perigosa.
        // Vale quando a palavra "mistura" (`pistas.misturaTema`) vem com uma pista de classificação (`pistas.misturaConceito`) e, sem ela, nada
        // na pergunta fala de perigo nem de misturar X com Y ("misturar água sanitária com amoníaco" e "essa mistura é tóxica?" continuam SEGURANCA)
        val temaMistura = lex.pista("misturaTema").find(n)
        if (temaMistura != null && pista("misturaConceito")) {
            val resto = lex.pista("misturaTema").replace(n, " ")
            if (!lex.intencao("seguranca").containsMatchIn(resto) && !lex.pista("mistura").containsMatchIn(resto)) {
                return fim(Intent.CONCEITO) { it.copy(conceito = temaMistura.groupValues[1]) }
            }
        }
        if (i("seguranca")) return fim(Intent.SEGURANCA) { it.copy(mistura = pista("mistura")) }
        if (i("nomenclatura") && (p.compostos.isNotEmpty() || p.formulas.isNotEmpty())) return fim(Intent.NOMENCLATURA)
        // "como se chama o 2-cloro-butano?", "nomeie este composto orgânico": o pedido de nome (`pistas.nomenclaturaPedido`) sobre um composto
        // (`pistas.nomenclaturaAlvo`: "composto", "molécula" ou nome com raiz orgânica; ou uma fórmula/composto citado) é NOMENCLATURA mesmo sem composto do pacote (a resposta
        // diz que não o encontrou); pergunta de elemento ou de outra propriedade (que não o próprio nome IUPAC) não entra
        val soPropriedadeDeNome = p.propriedades.all { it in PROPRIEDADES_DE_NOME }
        if (pista("nomenclaturaPedido") && (pista("nomenclaturaAlvo") || p.formulas.isNotEmpty() || p.compostos.isNotEmpty()) && p.elementos.isEmpty() && soPropriedadeDeNome && !pista("elementoPalavra")) return fim(Intent.NOMENCLATURA)

        // 7) tabela periódica
        val grupo = lex.pista("grupo").find(n)
        val periodo = lex.pista("periodo").find(n)
        val bloco = lex.pista("bloco").find(n)?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }
        val categoria = lex.categorias.firstOrNull { it.first.containsMatchIn(n) }?.second
        val estado = lex.estados.firstOrNull { it.first.containsMatchIn(n) }?.second
        val extremo = lex.extremos.firstOrNull { it.first.containsMatchIn(n) }?.second
        val tendencia = pista("tendencia")
        val filtroTabela = grupo != null || periodo != null || bloco != null || categoria != null || extremo != null || tendencia || pista("tabelaPalavra")
        if (filtroTabela && !(p.propriedade != null && nEnt > 0 && grupo == null && periodo == null && bloco == null && !tendencia)) {
            val naoEhFiltroPuro = nEnt > 0 && categoria == "metal" && grupo == null && periodo == null
            if (!naoEhFiltroPuro) {
                return fim(Intent.TABELA_PERIODICA) {
                    it.copy(
                        grupo = grupoDe(grupo), periodo = grupoDe(periodo), bloco = bloco, categoria = categoria,
                        estado = if (pista("elementoPalavra") || categoria != null) estado else null, extremo = extremo, tendencia = tendencia,
                        propriedade = p.propriedade ?: extremo?.first
                    )
                }
            }
        }
        if (estado != null && pista("elementoPalavra") && nEnt == 0) return fim(Intent.TABELA_PERIODICA) { it.copy(estado = estado) }

        // 8) propriedades e perfis
        if (p.propriedade != null && tem) {
            // escopos (DATA_CONTRACT §3.1): fusão, ebulição, densidade e estado valem para elemento E composto; propriedade de composto
            // com um elemento citado prefere o composto
            val alvos = props.flatMap { it.escopos }.toSet()
            return fim(Intent.PROPRIEDADE) { it.copy(alvoPropriedade = if ("composto" in alvos && p.compostos.isNotEmpty()) "composto" else if (p.elementos.isNotEmpty()) "elemento" else "composto") }
        }
        val cue = i("conceitoCue")
        if (p.propriedade != null && !tem && cue) return fim(Intent.CONCEITO) { it.copy(conceito = conceitoDe(n, lex)) }
        if (p.propriedade != null && !tem) {
            if (contexto != null && (contexto.elemento != null || contexto.composto != null)) {
                return fim(Intent.PROPRIEDADE) {
                    it.copy(elemento = contexto.elemento, elementos = contexto.elementos, composto = contexto.composto, compostos = contexto.compostos, compostoNome = contexto.compostoNome, herdado = true)
                }
            }
            return fim(Intent.PROPRIEDADE)
        }
        // "o que é um sal?": a classe (CONCEITO), não a ficha do composto do apelido; o composto fica em p.composto como sugestão de ficha.
        // "ponto de fusão do sal", "massa molar do sal", "o sal é perigoso?" continuam no composto (regras acima).
        val classe = if (cue && tem) classeGenerica(compostos, p, n, d, lex) else null
        if (classe != null) return fim(Intent.CONCEITO) { it.copy(conceito = classe) }
        if (tem) {
            // "e do ferro?" / "and gold?" depois de uma pergunta de propriedade
            if (pista("continuacao") && n.split(' ').size <= 5 && contexto?.propriedade != null && contexto.intent == Intent.PROPRIEDADE) {
                return fim(Intent.PROPRIEDADE) { it.copy(propriedade = contexto.propriedade, propriedades = contexto.propriedades.ifEmpty { listOf(contexto.propriedade) }, herdado = true) }
            }
            if (p.compostos.isNotEmpty() || p.formulas.isNotEmpty()) {
                if (p.elementos.isNotEmpty() && p.compostos.isEmpty() && p.formulas.isEmpty()) return fim(Intent.ELEMENTO)
                return fim(Intent.COMPOSTO)
            }
            return fim(Intent.ELEMENTO)
        }

        // 9) conceito
        if (cue || i("conceitoTemas")) {
            val conceito = conceitoDe(n, lex)
            if (conceito.isNotEmpty()) return fim(Intent.CONCEITO) { it.copy(conceito = conceito) }
        }
        return p
    }

    // ---- calculadoras novas (17/10/2026) --------------------------------------------------------------------------------------------
    // O símbolo Δ/∆ de "ΔH" não é palavra de nenhum idioma (a normalização o apaga): estes padrões olham o texto original.
    private val RX_DELTA_H = Regex("""[Δ∆]\s*H(?![a-z])""")
    private val RX_DELTA_HF = Regex("""[Δ∆]\s*H\s*°?\s*f(?![a-z])""")
    private val RX_SETA_DUPLA = Regex("""<=>|<->|⇌|⇄|↔""")
    private val RX_BORDA_INICIO = Regex("""^[^\p{L}\d]+""")
    private val RX_BORDA_FIM = Regex("""[^\p{L}\d+-]+$""")
    // 18/10/2026 (§7): "ΔGf", "ΔG°f", "ΔGf°" e "ΔG de formação" (a palavra "formação" vem do léxico: `pistas.deFormacao`)
    private val RX_DELTA_G = Regex("""[Δ∆]\s*G\s*°?(?![a-z])""")
    private val RX_DELTA_GF = Regex("""[Δ∆]\s*G\s*°?\s*f(?![a-z])""")
    /** Assunto de CONCEITO de "Kc/Kp" sem equação na pergunta (a resposta oferece a calculadora de equilíbrio). Igual ao site. */
    const val CONCEITO_CONSTANTE_EQUILIBRIO = "constante de equilibrio"
    /** Propriedades termoquímicas de formação de um composto (a pergunta de uma delas não é ENTALPIA de reação). */
    private val PROPRIEDADES_TERMO = setOf("entalpiaFormacaoKJmol", "energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK")
    private val RX_CARGA_E_MASSA = Regex("""[\d+\-^{}⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻−]""")

    // ---- íons e número de massa (18/10/2026, docs/CALCULADORAS_2026-10-17.md §7) — espelho de `lerIonsEIsotopo` do site ----------------
    private val SOBRESCRITOS = mapOf('⁰' to '0', '¹' to '1', '²' to '2', '³' to '3', '⁴' to '4', '⁵' to '5', '⁶' to '6', '⁷' to '7', '⁸' to '8', '⁹' to '9',
        '⁺' to '+', '⁻' to '-', '−' to '-')
    /** Símbolo com carga e/ou número de massa à frente: "Fe2+", "Fe+2", "Fe^{2+}", "56Fe", "56Fe3+" (o texto já sem sobrescritos). */
    private val RX_TOKEN_ION = Regex("""^(\d{1,3})?([A-Z][a-z]?)(?:\^?\{?(\d?[+-]|[+-]\d)\}?)?$""")
    private val RX_SIMBOLO_MASSA = Regex("""^([A-Z][a-z]?)-(\d{1,3})$""")
    private val RX_NOME_MASSA = Regex("""^(\p{L}+)-(\d{1,3})$""")
    private val RX_CARGA_SOLTA = Regex("""^(?:\d[+-]|[+-]\d)$""")
    private val RX_TOKEN_INICIO = Regex("""^[^\p{L}\d+-]+""")
    private val RX_TOKEN_FIM = Regex("""[^\p{L}\d+}-]+$""")
    private val RX_SUFIXO_ION = Regex("""^(.*[+-]\}?)-\p{L}+$""")
    private val ROMANOS = mapOf("i" to 1, "ii" to 2, "iii" to 3, "iv" to 4, "v" to 5, "vi" to 6, "vii" to 7)

    /** Íons de UM elemento ([ions]: símbolo → carga, na ordem), isótopo (símbolo → número de massa) e os símbolos citados assim, na ordem. */
    data class IonsEIsotopo(val ions: List<Pair<String, Int>>, val isotopo: Pair<String, Int>?, val simbolos: List<String>)

    /** Carga escrita ("2+", "+2", "-", "3-") → inteiro com sinal. */
    private fun cargaDe(s: String): Int? {
        val m = Regex("""^(\d?)([+-])(\d?)$""").find(s) ?: return null
        return (if (m.groupValues[2] == "-") -1 else 1) * (m.groupValues[1].ifEmpty { m.groupValues[3] }.ifEmpty { "1" }).toInt()
    }

    /** Número de massa plausível para o elemento (Z ≤ A ≤ 3Z + 10): corta coeficientes ("2Na") e temperaturas ("100K"). */
    private fun massaPlausivel(d: Dicionario, simbolo: String, a: Int): Boolean {
        val z = d.pacote.porSimbolo[simbolo]?.z ?: return false
        return a >= z && a <= 3 * z + 10
    }

    /**
     * Íons de UM elemento e número de massa citados na pergunta. Fórmula de mais de um elemento ("NO3-", "SO4 2-") não conta. [comPista]: a
     * pergunta fala de partículas — só então "56Fe" sem sobrescrito vale (sem a pista, "100K" e "100W" são temperatura e potência).
     */
    fun lerIonsEIsotopo(original: String, d: Dicionario, lex: Lexico = d.lexico, comPista: Boolean = false): IonsEIsotopo {
        val ions = mutableListOf<Pair<String, Int>>()
        var isotopo: Pair<String, Int>? = null
        val simbolos = mutableListOf<String>()
        fun valido(s: String) = d.pacote.porSimbolo.containsKey(s)
        fun porNome(w: String): String? = d.elementoPorNome(w)
        fun addIon(s: String, carga: Int?) { if (carga != null && carga != 0) { ions += s to carga; if (s !in simbolos) simbolos += s } }
        fun addIsotopo(s: String, a: Int) { if (isotopo == null && massaPlausivel(d, s, a)) { isotopo = s to a; if (s !in simbolos) simbolos += s } }
        val brutos = original.split(Regex("""\s+""")).filter { it.isNotEmpty() }
        val toks = brutos.map { b ->
            val semSobrescrito = b.map { c -> SOBRESCRITOS[c] ?: c }.joinToString("")
            RX_SUFIXO_ION.replace(RX_TOKEN_FIM.replace(RX_TOKEN_INICIO.replace(semSobrescrito, ""), ""), "$1")
        }
        var i = 0
        while (i < toks.size) {
            val t = toks[i]
            val prox = toks.getOrElse(i + 1) { "" }
            val m = RX_TOKEN_ION.find(t)
            if (m != null && (m.groupValues[1].isNotEmpty() || m.groupValues[3].isNotEmpty()) && valido(m.groupValues[2])) {
                if (m.groupValues[3].isNotEmpty()) addIon(m.groupValues[2], cargaDe(m.groupValues[3]))
                // "56Fe" sem sobrescrito só com pista de partículas; "⁵⁶Fe" sempre
                val comSobrescrito = brutos[i].dropWhile { !it.isLetterOrDigit() && it !in SOBRESCRITOS.keys }.firstOrNull()?.let { it in "⁰¹²³⁴⁵⁶⁷⁸⁹" } == true
                if (m.groupValues[1].isNotEmpty() && (comPista || comSobrescrito)) addIsotopo(m.groupValues[2], m.groupValues[1].toInt())
                i++; continue
            }
            val sm = RX_SIMBOLO_MASSA.find(t)
            if (sm != null && valido(sm.groupValues[1])) { addIsotopo(sm.groupValues[1], sm.groupValues[2].toInt()); i++; continue }
            if (Regex("""^[A-Z][a-z]?$""").matches(t) && valido(t) && RX_CARGA_SOLTA.matches(prox)) { addIon(t, cargaDe(prox)); i += 2; continue }
            val nm = RX_NOME_MASSA.find(t)
            if (nm != null) { porNome(nm.groupValues[1])?.let { addIsotopo(it, nm.groupValues[2].toInt()) }; i++; continue }
            val s = if (t.length >= 3 && t.all { it.isLetter() }) porNome(t) else null
            if (s != null && RX_CARGA_SOLTA.matches(prox)) { addIon(s, cargaDe(prox)); i += 2; continue }
            // "carbono 14?" / "carbon 14": o número no fim da frase (ou antes de pontuação), sem unidade depois
            if (s != null && Regex("""^\d{1,3}$""").matches(prox) && (i + 2 == toks.size || Regex("""[?!.,;:)]$""").containsMatchIn(brutos[i + 1]))) {
                addIsotopo(s, prox.toInt()); i += 2; continue
            }
            i++
        }
        // "íon ferro(II)", "iron(III) ion": nome do elemento + algarismo romano junto da palavra íon/cátion (`pistas.ionRomano` do léxico)
        lex.pista("ionRomano").find(Texto.nlu(original))?.let { mr ->
            val grupos = mr.groupValues.drop(1).filter { it.isNotEmpty() }
            val s = if (grupos.size >= 2) porNome(grupos[0]) else null
            val r = grupos.getOrNull(1)?.let { ROMANOS[it] }
            if (s != null && r != null && ions.none { it.first == s }) addIon(s, r)
        }
        return IonsEIsotopo(ions, isotopo, simbolos)
    }

    private val RX_CARGA_SEPARADA = Regex("""^\s+(\d?)([+-])(?![\w.,])|^\s+([+-])(\d)(?![\w.,])""")

    /** O texto sem as concentrações entre colchetes (para achar a equação mesmo quando elas vêm antes dela). */
    private fun semConcentracoes(original: String, concentracoes: List<ConcentracaoLida>): String {
        var s = original
        for (c in concentracoes.reversed()) s = s.substring(0, c.inicio) + " ".repeat(c.fim - c.inicio) + s.substring(c.fim)
        return s
    }

    /** Elemento pedido no NOX ("do enxofre no H2SO4", "of Mn in MnO4-"): o símbolo, ou null. Só pela pista do léxico (`pistas.noxAlvo`). */
    private fun elementoDoNox(n: String, original: String, d: Dicionario, lex: Lexico): String? {
        val toks = original.split(Regex("""\s+""")).map { RX_BORDA_FIM.replace(RX_BORDA_INICIO.replace(it, ""), "") }.filter { it.isNotEmpty() }
        for (m in lex.pista("noxAlvo").findAll(n)) {
            val alvo = m.groupValues[1]
            // a palavra com a caixa original ("Mn"), achada pela forma normalizada
            val orig = alvo.split(' ').joinToString(" ") { w -> toks.firstOrNull { Texto.nlu(it) == w } ?: w }
            val e = d.entidades(orig)
            if (e.elementos.size == 1 && e.formulas.isEmpty() && e.compostos.none { it.via == "formula" }) return e.elementos[0].simbolo
        }
        return null
    }

    /** Carga escrita separada logo depois da fórmula ("Cr2O7 2-", "SO4 2-", "NH4 +"): número ou null. */
    internal fun cargaDepoisDa(formula: String?, original: String): Int? {
        if (formula == null) return null
        val i = original.indexOf(formula)
        if (i < 0) return null
        val m = RX_CARGA_SEPARADA.find(original.substring(i + formula.length)) ?: return null
        val sinal = if (m.groupValues[2].ifEmpty { m.groupValues[3] } == "-") -1 else 1
        return sinal * (m.groupValues[1].ifEmpty { m.groupValues[4] }.ifEmpty { "1" }).toInt()
    }

    private val RX_PV_NRT = Regex("""pv\s*=\s*nrt""", RegexOption.IGNORE_CASE)
    private val UNIDADES_DE_GAS = setOf("atm", "Pa", "kPa", "mmHg", "Torr", "bar", "K", "°C")
    /** Grandezas (grupos de regras.unidades) de uma quantidade de estequiometria: massa, quantidade de matéria e volume. */
    private val GRANDEZAS_ESTEQUIOMETRIA = listOf("massa", "quantidade", "volume")
    /** Propriedades (ids de regras.propriedades) que são o próprio nome: "nome IUPAC de X" num pedido de nomenclatura não é pergunta de propriedade. */
    private val PROPRIEDADES_DE_NOME = setOf("nomeIupac")

    /** Número do primeiro grupo de captura que casou (as pistas `grupo`/`periodo` de alguns idiomas têm alternativas com grupos diferentes). */
    private fun grupoDe(m: MatchResult?): Int? = m?.groupValues?.drop(1)?.firstOrNull { it.isNotEmpty() }?.toIntOrNull()

    /**
     * Assunto de CONCEITO exatamente como o site (`limparConceito` de nlu.js): tira o gatilho e aplica UMA vez cada padrão de limpeza do
     * léxico, SEM aparar o espaço que o gatilho deixa — por isso, como no site, o artigo fica em "o que é a massa molar" ("a massa molar") e
     * "explique o que é massa molar" vira "o que e massa molar". O contrato (ParsedQuery) é igual nos dois clientes; quem procura o texto
     * usa [temaDoConceito], que limpa de verdade.
     */
    internal fun conceitoDe(n: String, lex: Lexico): String {
        var s = n.replaceFirst(lex.intencao("conceitoCue"), "")
        for (rx in lex.limparConceito) s = s.replaceFirst(rx, "")
        return s.trim()
    }

    /**
     * Tema "limpo" para procurar o trecho licenciado: repete gatilho + limpeza do léxico até estabilizar ("o que e massa molar" → "massa molar";
     * "a massa molar" → "massa molar"; "what molar mass is" → "molar mass is"). Só a busca de texto usa; o ParsedQuery guarda [conceitoDe].
     */
    fun temaDoConceito(conceito: String, lex: Lexico): String {
        var s = Texto.nlu(conceito).trim()
        repeat(4) {
            var t = s.replaceFirst(lex.intencao("conceitoCue"), "").trim()
            for (rx in lex.limparConceito) t = t.replaceFirst(rx, "").trim()
            if (t == s || t.isEmpty()) return if (t.isEmpty()) s else t
            s = t
        }
        return s
    }

    /**
     * "o que é um sal?" / "what is sugar?": a pergunta é só o gatilho de conceito + UM nome de classe de compostos que o pacote também usa como
     * apelido de um composto (sal → NaCl, açúcar → sacarose). Devolve o tema (a chave casada) ou null. Espelho de `classeGenerica` do site.
     */
    private fun classeGenerica(compostos: List<Achado>, p: ParsedQuery, n: String, d: Dicionario, lex: Lexico): String? {
        if (compostos.size != 1 || p.elementos.isNotEmpty() || p.formulas.isNotEmpty()) return null
        val c = compostos[0]
        val chave = c.chave ?: return null
        if (c.via != "nome" || !d.ehClasseDeCompostos(chave)) return null
        return if (temaDoConceito(n, lex) == chave) chave else null
    }

    /** Composto citado logo depois de uma quantidade ("16 g de metano"): é a substância à qual a quantidade se refere. */
    private fun compostoLigadoAQuantidade(original: String, quant: List<QuantidadeLida>, d: Dicionario, cids: List<String>, lex: Lexico): String? {
        if (cids.size < 2) return null
        val sem = Texto.semAcentos(original).lowercase()
        for (q in quant) {
            if (q.unidade == null || q.unidade == "%") continue
            val resto = sem.substring(minOf(q.faixa.last + 1, sem.length)).trimStart(' ', ',', ':')
                .replace(Regex("""^${lex.ligacaoPreposicoes}\s+"""), "")
            for (cid in cids) {
                if (d.nomesEFormulaDe(cid.toLong()).any { resto.startsWith(it) }) return cid
            }
        }
        return null
    }

    /**
     * Variante para conversa: se a pergunta não traz entidade (ex.: "e o ponto de ebulição?"), herda a do contexto.
     * O parse já trata a continuação quando há propriedade; aqui só se completa o que faltou.
     */
    fun parseComContexto(pergunta: String, d: Dicionario, contexto: ParsedQuery?): ParsedQuery = parse(pergunta, d, contexto, d.lexico)

    /** Palavras da pergunta úteis para recuperar trechos de texto (sem artigos nem verbos de pedido do idioma). */
    fun termosDeBusca(texto: String, lex: Lexico = Lexico.de(Idiomas.PADRAO)): List<String> =
        Texto.nlu(texto).split(' ').filter { it.length >= 2 && it !in lex.stopwordsBusca }
}
