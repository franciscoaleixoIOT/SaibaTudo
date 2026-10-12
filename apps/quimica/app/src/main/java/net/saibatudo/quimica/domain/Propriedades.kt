package net.saibatudo.quimica.domain

import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import net.saibatudo.quimica.ai.nlu.lexico.Lexico
import net.saibatudo.quimica.data.model.CategoriaElemento
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.PropriedadeDef
import net.saibatudo.quimica.data.model.Regras
import net.saibatudo.quimica.data.prefs.Nivel
import net.saibatudo.quimica.domain.calc.Unidades

/** Valor formatado de uma propriedade, com os números exibidos (para conferência) e a unidade. */
data class ValorFormatado(val texto: String, val curto: String)

/** Linha de uma ficha: rótulo e valor legíveis. */
data class LinhaFicha(val rotulo: String, val valor: String)

/**
 * Propriedades consultáveis de elementos e compostos. Os ids são os do NLU (`regras.propriedades`); a lista padrão só nomeia
 * os campos do contrato (docs/DATA_CONTRACT.md §2 e §3) e é a mesma do site (web/src/quimica/js/propriedades.js). O pacote
 * pode complementar ou substituir cada id.
 */
object Propriedades {

    /** Propriedade padrão do contrato: o rótulo é um recurso de strings.xml (cada idioma tem o seu); os sinônimos vêm do léxico do idioma. */
    private class Padrao(val id: String, @param:StringRes val rotulo: Int, val alvo: String, val campo: String, val tipo: String, val unidade: String? = null)

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
        Padrao("pontoFusaoK", R.string.prop_ponto_fusao, "elemento", "pontoFusaoK", "temperatura"),
        Padrao("pontoEbulicaoK", R.string.prop_ponto_ebulicao, "elemento", "pontoEbulicaoK", "temperatura"),
        Padrao("densidadeKgm3", R.string.prop_densidade, "elemento", "densidadeKgm3", "densidade"),
        Padrao("estadoPadrao", R.string.prop_estado_padrao, "elemento", "estadoPadrao", "estado"),
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
        Padrao("tpsa", R.string.prop_tpsa, "composto", "tpsa", "numero", "Å²")
    )

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
        PADRAO.forEach { mapa[it.id] = PropriedadeDef(it.id, t(it.rotulo), it.campo, it.alvo, it.tipo, it.unidade, lex.propriedades[it.id].orEmpty()) }
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
                mapa[base.id] = base.copy(
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
    fun bruto(def: PropriedadeDef, c: Composto): Any? {
        val campo = def.campo ?: return null
        return when (campo) {
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
    }

    fun formatar(t: Textos, def: PropriedadeDef, valor: Any?, un: Unidades, nivel: Nivel = Nivel.MEDIO): ValorFormatado? {
        if (valor == null) return null
        fun num(d: Double, sig: Int = 7) = t.sig(d, sig)
        return when (def.tipo) {
            "temperatura" -> {
                val k = (valor as? Number)?.toDouble() ?: return null
                val kTxt = "${num(k)} K"
                val c = un.buscar("°C", "temperatura")?.let { un.converter(k, un.porSimbolo("K", "temperatura") ?: return@let null, it) }
                val txt = if (c == null) kTxt else "$kTxt (${num(c)} °C)"
                ValorFormatado(txt, kTxt)
            }
            "densidade" -> {
                val d = (valor as? Number)?.toDouble() ?: return null
                val base = "${num(d)} kg/m³"
                val g = un.porSimbolo("g/cm³", "densidade")?.let { un.converter(d, un.porSimbolo("kg/m³", "densidade") ?: return@let null, it) }
                ValorFormatado(if (g == null) base else "$base (${num(g)} g/cm³)", base)
            }
            "massaAtomica" -> (valor as? Number)?.toDouble()?.let { ValorFormatado("${num(it, 9)} u (g/mol)", "${num(it, 9)} u") }
            "massaMolar" -> (valor as? Number)?.toDouble()?.let { ValorFormatado("${num(it, 9)} g/mol", "${num(it, 9)} g/mol") }
            "numero" -> (valor as? Number)?.toDouble()?.let {
                val t = num(it) + (def.unidade?.let { u -> " $u" } ?: "")
                ValorFormatado(t, t)
            }
            "inteiro" -> (valor as? Number)?.let { ValorFormatado(it.toLong().toString(), it.toLong().toString()) }
            "categoria" -> (valor as? CategoriaElemento)?.let { ValorFormatado(rotuloCategoria(it, t), rotuloCategoria(it, t)) }
            "estado" -> (valor as? net.saibatudo.quimica.data.model.EstadoFisico)?.let { ValorFormatado(t(it.meio), t(it.meio)) }
            "lista" -> (valor as? List<*>)?.let { l -> l.joinToString(", ") { x -> (x as? Number)?.toInt()?.let { n -> if (n > 0) "+$n" else "$n" } ?: x.toString() } }?.let { ValorFormatado(it, it) }
            "formula" -> (valor as? String)?.let { ValorFormatado(Texto.formulaUnicode(it), Texto.formulaUnicode(it)) }
            "descoberta" -> (valor as? Pair<*, *>)?.let { (ano, por) ->
                val texto = listOfNotNull((ano as? Int)?.toString(), (por as? String)?.takeIf { it.isNotBlank() }?.let { p -> t(R.string.prop_descoberta_por, p) }).joinToString(" ")
                texto.takeIf { it.isNotBlank() }?.let { ValorFormatado(it, it) }
            }
            else -> valor.toString().takeIf { it.isNotBlank() }?.let { ValorFormatado(it, it) }
        }
    }

    // ---- fichas ----------------------------------------------------------------------------------------------------------------

    private val ELEMENTO_BASICAS = listOf("numeroAtomico", "massaAtomica", "categoria", "grupo", "periodo", "estadoPadrao")
    private val ELEMENTO_MEDIO = ELEMENTO_BASICAS + listOf("bloco", "configuracaoEletronica", "eletronegatividade", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "estadosOxidacao", "descoberta")

    /** Linhas da ficha do elemento; o nível controla quantas propriedades aparecem. */
    fun fichaElemento(t: Textos, e: Elemento, tabela: List<PropriedadeDef>, un: Unidades, nivel: Nivel): List<LinhaFicha> {
        val defs = tabela.filter { it.alvo == "elemento" || it.alvo == "ambos" }
        val ids: List<String> = when (nivel) {
            Nivel.FUNDAMENTAL -> ELEMENTO_BASICAS
            Nivel.MEDIO -> ELEMENTO_MEDIO
            Nivel.SUPERIOR -> defs.map { it.id }
        }
        return ids.mapNotNull { id ->
            val d = defs.firstOrNull { it.id == id } ?: return@mapNotNull null
            if (id == "simbolo") return@mapNotNull null
            val v = formatar(t, d, bruto(d, e), un, nivel) ?: return@mapNotNull null
            LinhaFicha(d.rotulo.replaceFirstChar { it.uppercase() }, v.texto)
        }
    }

    private val COMPOSTO_BASICAS = listOf("formula", "massaMolar", "cas", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3")

    /** Linhas de propriedades do composto (identificadores ficam em bloco próprio na tela). */
    fun fichaComposto(t: Textos, c: Composto, tabela: List<PropriedadeDef>, un: Unidades, nivel: Nivel): List<LinhaFicha> {
        val defs = tabela.filter { it.alvo == "composto" || it.alvo == "ambos" || it.campo?.let { campo -> c.propriedades.containsKey(campo) } == true }
        val usados = mutableSetOf<String>()
        val linhas = mutableListOf<LinhaFicha>()
        val ordem: List<PropriedadeDef> = when (nivel) {
            Nivel.FUNDAMENTAL -> COMPOSTO_BASICAS.mapNotNull { id -> tabela.firstOrNull { it.id == id } }
            else -> defs
        }
        for (d in ordem) {
            if (d.id in setOf("cid", "smiles", "inchiKey", "nomeIupac", "cas")) continue
            val v = formatar(t, d, bruto(d, c), un, nivel) ?: continue
            if (usados.add(d.id)) linhas += LinhaFicha(d.rotulo.replaceFirstChar { it.uppercase() }, v.texto)
        }
        // propriedades numéricas do pacote que a tabela não nomeia: rótulo derivado da chave
        if (nivel == Nivel.SUPERIOR) {
            val conhecidos = tabela.mapNotNull { it.campo }.toSet()
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
