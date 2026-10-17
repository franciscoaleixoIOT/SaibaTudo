package net.saibatudo.quimica.domain

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.EstadoFisico
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.FonteValor
import net.saibatudo.quimica.data.model.PropriedadeDef
import net.saibatudo.quimica.data.model.Regras
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.calc.Unidades

/** Valor formatado de uma propriedade, com os números exibidos (para conferência) e a unidade. */
data class ValorFormatado(val texto: String, val curto: String)

/** Linha de uma ficha: rótulo e valor legíveis; [aviso] = "valor a revisar" do pacote, [nota] = nota da escala (Pauling), já no idioma. */
data class LinhaFicha(val rotulo: String, val valor: String, val aviso: String? = null, val nota: String? = null)

/** Origem de UM valor pronta para exibir: a [fonte] (com o detalhe no idioma), as [condicoes] da medida, e as marcas de "sem referência" e de revisão. */
data class FonteMedida(val fonte: Fonte, val condicoes: List<String>, val semReferencia: Boolean, val revisar: Boolean)

/** Valor lido de um registro e o campo de onde veio (solubilidade e pKa têm dois campos possíveis). */
data class ValorLido(val valor: Any, val campo: String)

/** Propriedade física medida de um composto, pronta para a ficha e as respostas (espelha `medidasDoComposto` do site). */
data class Medida(val def: PropriedadeDef, val campo: String, val valor: Any, val formatado: ValorFormatado, val fontes: List<FonteMedida>) {
    /** Condições da medida, sem repetir (as de todas as origens do valor). */
    val condicoes: List<String> get() = fontes.flatMap { it.condicoes }.distinct()
    val semReferencia: Boolean get() = fontes.any { it.semReferencia }
}

/**
 * Propriedades consultáveis de elementos e compostos. Os ids são os do NLU (`regras.propriedades`); a lista padrão só nomeia
 * os campos do contrato (docs/DATA_CONTRACT.md §2 e §3) e é a mesma do site (web/src/quimica/js/propriedades.js). O pacote
 * pode complementar ou substituir cada id.
 */
object Propriedades {

    /** Propriedade padrão do contrato: o rótulo é um recurso de strings.xml (cada idioma tem o seu); os sinônimos vêm do léxico do idioma. */
    private class Padrao(
        val id: String, @param:StringRes val rotulo: Int, val alvo: String, val campo: String, val tipo: String, val unidade: String? = null,
        val escopos: List<String> = emptyList(), val medida: Boolean = false, val campos: List<String> = emptyList()
    )

    private val AMBOS = listOf("elemento", "composto")

    private val PADRAO: List<Padrao> = listOf(
        Padrao("numeroAtomico", R.string.prop_numero_atomico, "elemento", "z", "inteiro"),
        Padrao("massaAtomica", R.string.prop_massa_atomica, "elemento", "massaAtomica", "massaAtomica", "u"),
        Padrao("simbolo", R.string.prop_simbolo, "elemento", "simbolo", "texto"),
        Padrao("grupo", R.string.prop_grupo, "elemento", "grupo", "inteiro"),
        Padrao("periodo", R.string.prop_periodo, "elemento", "periodo", "inteiro"),
        Padrao("bloco", R.string.prop_bloco, "elemento", "bloco", "texto"),
        Padrao("categoria", R.string.prop_categoria, "elemento", "categoria", "categoria"),
        Padrao("configuracaoEletronica", R.string.prop_configuracao_eletronica, "elemento", "configuracaoEletronica", "texto"),
        Padrao("eletronegatividade", R.string.prop_eletronegatividade, "elemento", "eletronegatividade", "numero"),
        Padrao("raioAtomicoPm", R.string.prop_raio_atomico, "elemento", "raioAtomicoPm", "numero", "pm"),
        Padrao("afinidadeEletronicaKJmol", R.string.prop_afinidade_eletronica, "elemento", "afinidadeEletronicaKJmol", "numero", "kJ/mol"),
        Padrao("energiaIonizacaoKJmol", R.string.prop_energia_ionizacao, "elemento", "energiaIonizacaoKJmol", "numero", "kJ/mol"),
        Padrao("pontoFusaoK", R.string.prop_ponto_fusao, "elemento", "pontoFusaoK", "temperatura", escopos = AMBOS, medida = true),
        Padrao("pontoEbulicaoK", R.string.prop_ponto_ebulicao, "elemento", "pontoEbulicaoK", "temperatura", escopos = AMBOS, medida = true),
        Padrao("densidadeKgm3", R.string.prop_densidade, "elemento", "densidadeKgm3", "densidade", escopos = AMBOS, medida = true),
        Padrao("estadoPadrao", R.string.prop_estado_padrao, "elemento", "estadoPadrao", "estado", escopos = AMBOS, medida = true),
        Padrao("estadosOxidacao", R.string.prop_estados_oxidacao, "elemento", "estadosOxidacao", "lista"),
        Padrao("descoberta", R.string.prop_descoberta, "elemento", "descoberta", "descoberta"),

        Padrao("massaMolar", R.string.prop_massa_molar, "composto", "massaMolar", "massaMolar", "g/mol"),
        Padrao("massaExata", R.string.prop_massa_exata, "composto", "massaExata", "numero", "u"),
        Padrao("formula", R.string.prop_formula, "composto", "formula", "formula"),
        Padrao("cas", R.string.prop_cas, "composto", "cas", "texto"),
        Padrao("cid", R.string.prop_cid, "composto", "cid", "inteiro"),
        Padrao("smiles", R.string.prop_smiles, "composto", "smiles", "texto"),
        Padrao("inchiKey", R.string.prop_inchikey, "composto", "inchiKey", "texto"),
        Padrao("nomeIupac", R.string.prop_nome_iupac, "composto", "nomeIupac", "texto"),
        Padrao("xlogp", R.string.prop_xlogp, "composto", "xlogp", "numero"),
        Padrao("doadoresH", R.string.prop_doadores_h, "composto", "doadoresH", "inteiro"),
        Padrao("aceptoresH", R.string.prop_aceptores_h, "composto", "aceptoresH", "inteiro"),
        Padrao("ligacoesRotaveis", R.string.prop_ligacoes_rotaveis, "composto", "ligacoesRotaveis", "inteiro"),
        Padrao("carga", R.string.prop_carga, "composto", "carga", "inteiro"),
        Padrao("tpsa", R.string.prop_tpsa, "composto", "tpsa", "numero", "Å²"),
        // medidas do composto (Wikidata, DATA_CONTRACT §3.1): sem valor no pacote = sem valor na resposta
        Padrao("solubilidade", R.string.prop_solubilidade, "composto", "solubilidadeAguaG100g", "solubilidade", medida = true, campos = listOf("solubilidadeAguaG100g", "solubilidadeAguaGL")),
        Padrao("pka", R.string.prop_pka, "composto", "pka", "pka", medida = true, campos = listOf("pkaValores", "pka"))
    )

    /** Ids das propriedades físicas medidas dos compostos, na ordem da ficha (igual a `MEDIDAS_COMPOSTO` do site). */
    val MEDIDAS_COMPOSTO = listOf("estadoPadrao", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "solubilidade", "pka")

    /**
     * Lista efetiva no idioma de [t] (espelha `tabelaDePropriedades` do site): a padrão (rótulos de strings.xml no idioma), com os sinônimos do
     * LÉXICO do idioma (contracts/lexico/<idioma>.json, `propriedades`), enriquecida com `regras.propriedades` do pacote — casada pelo id ou pelo
     * campo de `origem` ("elementos.pontoFusaoK"); somam-se os sinônimos do pacote (`sinonimos` legados valem em pt-BR; `sinonimosPorIdioma[idioma]`
     * no idioma) e o rótulo passa a ser `rotulos[idioma]`. Propriedade do pacote sem correspondente e sem `campo` (pictogramas, frases H)
     * fica de fora: os perigos têm tratamento próprio.
     */
    fun tabela(regras: Regras, t: Textos): List<PropriedadeDef> {
        val id = t.idioma
        val lex = Lexico.de(id)
        val mapa = LinkedHashMap<String, PropriedadeDef>()
        PADRAO.forEach {
            mapa[it.id] = PropriedadeDef(
                it.id, t(it.rotulo), it.campo, it.alvo, it.tipo, it.unidade, lex.propriedades[it.id].orEmpty(),
                escopos = it.escopos.ifEmpty { listOf(it.alvo) }, campos = it.campos, medida = it.medida
            )
        }
        fun doPacote(r: PropriedadeDef) = (if (id == Idiomas.PADRAO) r.sinonimos else emptyList()) + r.sinonimosPorIdioma[id].orEmpty()
        // rótulo: o do idioma no pacote; em pt-BR o `rotulo`/`nome` do pacote; nos outros idiomas o inglês do pacote e, sem ele, o padrão (strings.xml)
        fun rotulo(r: PropriedadeDef, padrao: String) = r.rotulos[id] ?: if (id == Idiomas.PADRAO) r.rotulo else r.rotulos["en"] ?: padrao
        for (r in regras.propriedades) {
            val alvoR = r.alvo.takeIf { it.isNotEmpty() }
            var chave = r.id.takeIf { mapa.containsKey(it) }
            if (chave == null && r.origem != null) {
                val caminho = r.origem.split('.').drop(1)                                   // [pontoFusaoK] | [descoberta, ano] | [propriedades, xlogp]
                val campo = if (caminho.firstOrNull() == "propriedades") caminho.getOrNull(1) else caminho.firstOrNull()
                chave = mapa.values.firstOrNull { x -> (alvoR == null || x.alvo == alvoR) && (x.campo == campo || (caminho.firstOrNull() == "propriedades" && x.id == campo)) }?.id
            }
            val base = chave?.let { mapa[it] }
            if (base != null) {
                // escopos novos do pacote (`escopos`, os prefixos de `origens` e "ambos" do fixture): o pacote só acrescenta
                val doPacote = if (r.escopos.isNotEmpty() || r.origens.isNotEmpty() || r.alvo == "ambos") r.escoposEfetivos else emptyList()
                val escopos = (base.escoposEfetivos + doPacote).distinct()
                mapa[base.id] = base.copy(
                    escopos = escopos, origens = r.origens, escala = r.escala ?: base.escala,
                    rotulo = rotulo(r, base.rotulo),
                    campo = r.campo ?: base.campo,
                    alvo = r.alvo.ifEmpty { base.alvo },
                    tipo = r.tipo.ifEmpty { base.tipo },
                    unidade = r.unidade ?: base.unidade,
                    sinonimos = (base.sinonimos + doPacote(r)).distinct(),
                    rotulos = r.rotulos, sinonimosPorIdioma = r.sinonimosPorIdioma
                )
                continue
            }
            if (r.campo != null) {
                mapa[r.id] = r.copy(alvo = r.alvo.ifEmpty { "elemento" }, tipo = r.tipo.ifEmpty { "texto" }, sinonimos = doPacote(r), rotulo = rotulo(r, r.rotulo))
            }
        }
        return mapa.values.toList()
    }

    /** Categoria no meio da frase ("metal alcalino", "semimetal (metaloide)"). */
    fun rotuloCategoria(c: CategoriaElemento, t: Textos): String = t(c.meio)

    // ---- valores ---------------------------------------------------------------------------------------------------------------

    /** Valor bruto de [def] num elemento; null se ausente. */
    fun bruto(def: PropriedadeDef, e: Elemento): Any? = when (def.campo) {
        "z" -> e.z
        "simbolo" -> e.simbolo
        "massaAtomica" -> e.massaAtomica
        "grupo" -> e.grupo
        "periodo" -> e.periodo
        "bloco" -> e.bloco
        "categoria" -> e.categoria.takeIf { it != CategoriaElemento.DESCONHECIDA }
        "configuracaoEletronica" -> e.configuracaoEletronica
        "eletronegatividade" -> e.eletronegatividade
        "raioAtomicoPm" -> e.raioAtomicoPm
        "afinidadeEletronicaKJmol" -> e.afinidadeEletronicaKJmol
        "energiaIonizacaoKJmol" -> e.energiaIonizacaoKJmol
        "pontoFusaoK" -> e.pontoFusaoK
        "pontoEbulicaoK" -> e.pontoEbulicaoK
        "densidadeKgm3" -> e.densidadeKgm3
        "estadoPadrao" -> e.estadoPadrao.takeIf { it.id != "desconhecido" }
        "estadosOxidacao" -> e.estadosOxidacao.takeIf { it.isNotEmpty() }
        "descoberta" -> e.descobertaAno?.let { it to e.descobertaPor } ?: e.descobertaPor?.let { null to it }
        else -> null
    }

    /** Valor bruto de [def] num composto; null se ausente. */
    fun bruto(def: PropriedadeDef, c: Composto): Any? = lerValor(def, c)?.valor

    /** Estado físico do pacote ("solido", "liquid", "gasoso"…) como [EstadoFisico]; desconhecido = null. */
    fun estadoDe(s: String?): EstadoFisico? {
        val k = Texto.semAcentos(s.orEmpty().trim().lowercase())
        val id = when (k) { "solido", "solid" -> "solido"; "liquido", "liquid" -> "liquido"; "gas", "gasoso" -> "gas"; else -> null }
        return id?.let { EstadoFisico.de(it) }
    }

    /**
     * Valor da propriedade no composto, com o campo de onde veio (espelha `lerValor` do site): os calculados e as medidas ficam em
     * `propriedades` (DATA_CONTRACT §3 e §3.1); solubilidade e pKa têm dois campos possíveis ([PropriedadeDef.campos]). Medida fora do escopo
     * "composto" = null.
     */
    fun lerValor(def: PropriedadeDef, c: Composto): ValorLido? {
        val campo = def.campo
        if (def.medida) {
            if (!def.temEscopo("composto")) return null
            for (k in def.campos.ifEmpty { listOfNotNull(campo, def.id) }) {
                c.propriedadesListas[k]?.takeIf { it.isNotEmpty() }?.let { return ValorLido(it, k) }
                c.propriedades[k]?.let { return ValorLido(it, k) }
                val txt = c.propriedadesTexto[k] ?: continue
                if (def.tipo != "estado") return ValorLido(txt, k)
                estadoDe(txt)?.let { return ValorLido(it, k) }
            }
            return null
        }
        if (campo == null) return null
        val v: Any? = when (campo) {
            "massaMolar" -> c.massaMolar
            "massaExata" -> c.massaExata
            "formula" -> c.formula
            "cas" -> c.cas
            "cid" -> c.cid
            "smiles" -> c.smiles
            "inchiKey" -> c.inchiKey
            "nomeIupac" -> c.nomeIupac
            else -> c.propriedades[campo] ?: c.propriedades[def.id] ?: c.propriedadesTexto[campo]
        }
        return v?.let { ValorLido(it, campo) }
    }

    /**
     * Texto legível do valor, com unidades (K também em °C, kg/m³ também em g/cm³), no formato numérico do idioma. [campo] (de [lerValor])
     * escolhe a unidade quando a propriedade tem mais de um campo (solubilidade em g/100 g de água ou em g/L).
     */
    fun formatar(t: Textos, def: PropriedadeDef, valor: Any?, un: Unidades, nivel: Nivel = Nivel.MEDIO, campo: String? = null): ValorFormatado? {
        if (valor == null) return null
        fun num(d: Double, sig: Int = 7) = t.sig(d, sig)
        return when (def.tipo) {
            "temperatura" -> {
                val k = (valor as? Number)?.toDouble() ?: return null
                val kTxt = "${num(k)} K"
                val c = celsius(k, un)
                val txt = if (c == null) kTxt else "$kTxt (${num(c)} °C)"
                ValorFormatado(txt, kTxt)
            }
            "densidade" -> {
                val d = (valor as? Number)?.toDouble() ?: return null
                val base = "${num(d)} kg/m³"
                val g = un.porSimbolo("g/cm³", "densidade")?.let { un.converter(d, un.porSimbolo("kg/m³", "densidade") ?: return@let null, it) }
                ValorFormatado(if (g == null) base else "$base (${num(g)} g/cm³)", base)
            }
            "solubilidade" -> {
                val v = (valor as? Number)?.toDouble() ?: return null
                val porLitro = (campo ?: def.campo) == "solubilidadeAguaGL"
                ValorFormatado(
                    "${num(v, 6)} ${t(if (porLitro) R.string.prop_medida_unidade_gl else R.string.prop_medida_unidade_g100g)}",
                    "${num(v, 6)} ${if (porLitro) "g/L" else "g/100 g"}"
                )
            }
            "pka" -> {
                val l = (if (valor is List<*>) valor else listOf(valor)).mapNotNull { (it as? Number)?.toDouble()?.takeIf { d -> d.isFinite() } }
                if (l.isEmpty()) return null
                val textos = l.map { num(it, 4) }
                ValorFormatado(if (l.size > 1) listar(t, textos) else textos[0], textos.joinToString("; "))
            }
            "massaAtomica" -> (valor as? Number)?.toDouble()?.let { ValorFormatado("${num(it, 9)} u (g/mol)", "${num(it, 9)} u") }
            "massaMolar" -> (valor as? Number)?.toDouble()?.let { ValorFormatado("${num(it, 9)} g/mol", "${num(it, 9)} g/mol") }
            "numero" -> (valor as? Number)?.toDouble()?.let {
                val t = num(it) + (def.unidade?.let { u -> " $u" } ?: "")
                ValorFormatado(t, t)
            }
            "inteiro" -> (valor as? Number)?.let { ValorFormatado(it.toLong().toString(), it.toLong().toString()) }
            "categoria" -> (valor as? CategoriaElemento)?.let { ValorFormatado(rotuloCategoria(it, t), rotuloCategoria(it, t)) }
            "estado" -> ((valor as? EstadoFisico) ?: (valor as? String)?.let(::estadoDe))?.let { ValorFormatado(t(it.meio), t(it.meio)) }
            "lista" -> (valor as? List<*>)?.let { l -> l.joinToString(", ") { x -> (x as? Number)?.toInt()?.let { n -> if (n > 0) "+$n" else "$n" } ?: x.toString() } }?.let { ValorFormatado(it, it) }
            "formula" -> (valor as? String)?.let { ValorFormatado(Texto.formulaUnicode(it), Texto.formulaUnicode(it)) }
            "descoberta" -> (valor as? Pair<*, *>)?.let { (ano, por) ->
                val texto = listOfNotNull((ano as? Int)?.toString(), (por as? String)?.takeIf { it.isNotBlank() }?.let { p -> t(R.string.prop_descoberta_por, p) }).joinToString(" ")
                texto.takeIf { it.isNotBlank() }?.let { ValorFormatado(it, it) }
            }
            else -> valor.toString().takeIf { it.isNotBlank() }?.let { ValorFormatado(it, it) }
        }
    }

    /** "a, b e c" com a conjunção do idioma (`lista_e`), como `listar` do site. */
    fun listar(t: Textos, itens: List<String>): String {
        val l = itens.filter { it.isNotEmpty() }
        if (l.size <= 1) return l.joinToString("")
        return t(R.string.lista_e, l.dropLast(1).joinToString(", "), l.last())
    }

    private fun celsius(k: Double, un: Unidades): Double? =
        un.buscar("°C", "temperatura")?.let { un.converter(k, un.porSimbolo("K", "temperatura") ?: return@let null, it) }

    // ---- origem por valor (DATA_CONTRACT §3.1) -----------------------------------------------------------------------------------

    /** Condições da medida ("a 298,15 K (25 °C)", "a 101.325 Pa (1 atm)", "fase: líquido"), no idioma; vazio se não houver. */
    fun condicoesDaMedida(f: FonteValor, t: Textos, un: Unidades): List<String> {
        val c = f.condicoes ?: return emptyList()
        val out = mutableListOf<String>()
        c.temperaturaK?.let { k -> out += t(R.string.prop_medida_a_temperatura, t.sig(k, 6), t.sig(celsius(k, un) ?: (k - 273.15), 5)) }
        c.pressaoPa?.let { pa ->
            val atm = un.porSimbolo("atm", "pressao")?.let { un.converter(pa, un.porSimbolo("Pa", "pressao") ?: return@let null, it) } ?: (pa / 101325.0)
            out += t(R.string.prop_medida_a_pressao, t.sig(pa, 7), t.sig(atm, 4))
        }
        c.fase?.takeIf { it.isNotBlank() }?.let { fase -> out += t(R.string.prop_medida_fase, estadoDe(fase)?.let { t(it.meio) } ?: fase) }
        return out
    }

    /**
     * Fonte de UM valor pronta para exibir (espelha `fonteDoValor` do site): o detalhe junta a referência citada, "sem referência no Wikidata",
     * o método de um valor derivado e o aviso de revisão, no idioma. O nome do pacote vale como está ("Wikidata", "PubChem…"); o do valor
     * derivado pelo app vem do strings.xml. Endereço só https.
     */
    fun fonteDoValor(f: FonteValor, t: Textos, un: Unidades): FonteMedida {
        val derivado = f.url == null && f.metodo != null
        val detalhes = mutableListOf<String>()
        f.referencia?.takeIf { it.isNotBlank() }?.let { detalhes += t(R.string.prop_medida_referencia, it) }
        if (f.semReferencia) {
            val n = f.corroboradoPor
            detalhes += if (n != null && n > 1) t.plural(R.plurals.prop_medida_sem_referencia_corroborado, n, n) else t(R.string.prop_medida_sem_referencia)
        }
        if (derivado) detalhes += t(R.string.prop_medida_derivado)
        if (f.precisaRevisar) detalhes += t(R.string.prop_medida_revisar)
        val fonte = Fonte(
            nome = if (derivado) t(R.string.prop_medida_derivado_nome) else f.nome ?: t(R.string.prop_medida_fonte_pacote),
            url = f.url?.takeIf { it.startsWith("https://") }, licenca = f.licenca, acessadoEm = f.acessadoEm,
            detalhe = detalhes.joinToString("; ").ifEmpty { null }
        )
        return FonteMedida(fonte, condicoesDaMedida(f, t, un), f.semReferencia, f.precisaRevisar)
    }

    /** Fontes de um valor do composto: lista (`pkaValores` traz uma por valor, alinhada), sem repetir a mesma declaração. */
    fun fontesDoCampo(c: Composto, campo: String, t: Textos, un: Unidades): List<FonteMedida> {
        val bruto = c.fontesPorPropriedade[campo] ?: if (campo == "pkaValores") c.fontesPorPropriedade["pka"] else null
        return bruto.orEmpty().map { fonteDoValor(it, t, un) }.distinctBy { "${it.fonte.nome}|${it.fonte.url}|${it.fonte.detalhe}|${it.condicoes}" }
    }

    /** Rótulo de uma medida: o estado físico do composto sai como "estado físico a 25 °C e 1 atm" (é derivado nessas condições). */
    fun rotuloMedida(def: PropriedadeDef, t: Textos): String = if (def.id == "estadoPadrao") t(R.string.prop_medida_estado_a25) else def.rotulo

    /** Uma medida do composto (ou null se o pacote não a traz). */
    fun medida(c: Composto, def: PropriedadeDef, t: Textos, un: Unidades): Medida? {
        if (!def.medida) return null
        val lido = lerValor(def, c) ?: return null
        val f = formatar(t, def, lido.valor, un, campo = lido.campo) ?: return null
        return Medida(def, lido.campo, lido.valor, f, fontesDoCampo(c, lido.campo, t, un))
    }

    /** Propriedades físicas medidas do composto, na ordem de [MEDIDAS_COMPOSTO] (só as que existem no registro). [tabela] = a do idioma. */
    fun medidasDoComposto(c: Composto, tabela: List<PropriedadeDef>, t: Textos, un: Unidades): List<Medida> {
        val porId = tabela.associateBy { it.id }
        return MEDIDAS_COMPOSTO.mapNotNull { id -> porId[id]?.let { medida(c, it, t, un) } }
    }

    /** "1.073,85 K (800,7 °C) — a 101.325 Pa (1 atm); sem referência no Wikidata": valor, condições e a marca de sem referência (`itemMedida` do site). */
    fun textoMedida(m: Medida, t: Textos): String {
        val extras = m.condicoes.toMutableList()
        if (m.semReferencia) extras += t(R.string.prop_medida_sem_referencia)
        return m.formatado.texto + if (extras.isEmpty()) "" else " — " + extras.distinct().joinToString("; ")
    }

    /** Aviso de revisão de um valor do elemento (`fontesPorPropriedade[campo].aviso`/`revisar`), no idioma; null se não houver. */
    fun avisoDoValor(e: Elemento, campo: String?, t: Textos): String? =
        campo?.let { e.fontesPorPropriedade[it] }?.takeIf { l -> l.any { it.precisaRevisar } }?.let { t(R.string.prop_medida_aviso_revisar) }

    /** Nota da escala da eletronegatividade (Pauling, valores revisados de Allred), quando o pacote a declara; null se não houver. */
    fun notaEletronegatividade(def: PropriedadeDef?, e: Elemento?, t: Textos): String? {
        val escala = e?.fontesPorPropriedade?.get("eletronegatividade")?.firstNotNullOfOrNull { it.escala } ?: def?.escala
        return if (escala != null && escala.contains("pauling", ignoreCase = true)) t(R.string.prop_medida_nota_pauling) else null
    }

    // ---- fichas ----------------------------------------------------------------------------------------------------------------

    private val ELEMENTO_BASICAS = listOf("numeroAtomico", "massaAtomica", "categoria", "grupo", "periodo", "estadoPadrao")
    private val ELEMENTO_MEDIO = ELEMENTO_BASICAS + listOf(
        "bloco", "configuracaoEletronica", "eletronegatividade", "energiaIonizacaoKJmol", "afinidadeEletronicaKJmol", "pontoFusaoK", "pontoEbulicaoK",
        "densidadeKgm3", "estadosOxidacao", "descoberta"
    )

    /** Linhas da ficha do elemento; o nível controla quantas propriedades aparecem. Cada linha leva o aviso de revisão e a nota de Pauling. */
    fun fichaElemento(t: Textos, e: Elemento, tabela: List<PropriedadeDef>, un: Unidades, nivel: Nivel): List<LinhaFicha> {
        val defs = tabela.filter { it.temEscopo("elemento") }
        val ids: List<String> = when (nivel) {
            Nivel.FUNDAMENTAL -> ELEMENTO_BASICAS
            Nivel.MEDIO -> ELEMENTO_MEDIO
            Nivel.SUPERIOR -> defs.map { it.id }
        }
        return ids.mapNotNull { id ->
            val d = defs.firstOrNull { it.id == id } ?: return@mapNotNull null
            if (id == "simbolo") return@mapNotNull null
            val v = formatar(t, d, bruto(d, e), un, nivel) ?: return@mapNotNull null
            LinhaFicha(
                Texto.capitalizar(d.rotulo), v.texto, aviso = avisoDoValor(e, d.campo, t),
                nota = if (d.id == "eletronegatividade") notaEletronegatividade(d, e, t) else null
            )
        }
    }

    private val COMPOSTO_BASICAS = listOf("formula", "massaMolar", "cas")

    /**
     * Linhas de propriedades do composto (identificadores ficam em bloco próprio na tela). As medidas (fusão, ebulição, densidade, estado,
     * solubilidade, pKa) ficam de fora: vão para "Propriedades físicas", cada uma com a sua fonte ([medidasDoComposto]).
     */
    fun fichaComposto(t: Textos, c: Composto, tabela: List<PropriedadeDef>, un: Unidades, nivel: Nivel): List<LinhaFicha> {
        val defs = tabela.filter { !it.medida && (it.temEscopo("composto") || it.campo?.let { campo -> c.propriedades.containsKey(campo) } == true) }
        val usados = mutableSetOf<String>()
        val linhas = mutableListOf<LinhaFicha>()
        val ordem: List<PropriedadeDef> = when (nivel) {
            Nivel.FUNDAMENTAL -> COMPOSTO_BASICAS.mapNotNull { id -> defs.firstOrNull { it.id == id } }
            else -> defs
        }
        for (d in ordem) {
            if (d.id in setOf("cid", "smiles", "inchiKey", "nomeIupac", "cas")) continue
            val v = formatar(t, d, bruto(d, c), un, nivel) ?: continue
            if (usados.add(d.id)) linhas += LinhaFicha(Texto.capitalizar(d.rotulo), v.texto)
        }
        // propriedades numéricas do pacote que a tabela não nomeia: rótulo derivado da chave
        if (nivel == Nivel.SUPERIOR) {
            val conhecidos = tabela.flatMap { listOfNotNull(it.campo) + it.campos }.toSet()
            for ((chave, valor) in c.propriedades) {
                if (chave in conhecidos) continue
                linhas += LinhaFicha(rotuloDeChave(chave), t.sig(valor, 7) + sufixoPorChave(chave))
            }
        }
        return linhas
    }

    private fun rotuloDeChave(chave: String): String =
        chave.replace(Regex("([a-z])([A-Z])"), "$1 $2").replace(Regex("(K|Pa|Kgm3|Pm|KJmol)$"), "").trim().replaceFirstChar { it.uppercase() }

    private fun sufixoPorChave(chave: String): String = when {
        chave.endsWith("Kgm3") -> " kg/m³"
        chave.endsWith("KJmol") -> " kJ/mol"
        chave.endsWith("Pm") -> " pm"
        chave.endsWith("K") -> " K"
        chave.endsWith("Pa") -> " Pa"
        else -> ""
    }
}
