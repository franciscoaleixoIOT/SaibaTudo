package net.saibatudo.quimica.data.model

import androidx.annotation.StringRes
import net.saibatudo.quimica.R

/** Fonte de um dado (nome, endereço, licença e data de acesso), exibida em toda resposta e em "Sobre os dados". */
data class Fonte(
    val nome: String,
    val url: String? = null,
    val licenca: String? = null,
    val acessadoEm: String? = null,
    val uso: String? = null,
    val id: String? = null
) {
    /** "PubChem CID 2244 – domínio público (NIH)". */
    fun rotulo(): String = buildString {
        append(nome)
        if (!licenca.isNullOrBlank()) append(" – ").append(licenca)
    }
}

/**
 * Categorias de elemento do contrato (docs/DATA_CONTRACT.md §2). Três textos por categoria, todos em strings.xml: [rotulo] ("Metal alcalino", para
 * listas e legendas), [meio] (no meio da frase: "metal alcalino", "semimetal (metaloide)") e [plural] ("metais alcalinos").
 */
enum class CategoriaElemento(
    val id: String, @param:StringRes val rotulo: Int, @param:StringRes val meio: Int, @param:StringRes val plural: Int, val letra: String
) {
    METAL_ALCALINO("metal_alcalino", R.string.categoria_metal_alcalino, R.string.categoria_metal_alcalino_meio, R.string.categoria_metal_alcalino_plural, "A"),
    METAL_ALCALINO_TERROSO("metal_alcalino_terroso", R.string.categoria_metal_alcalino_terroso, R.string.categoria_metal_alcalino_terroso_meio, R.string.categoria_metal_alcalino_terroso_plural, "T"),
    METAL_TRANSICAO("metal_transicao", R.string.categoria_metal_transicao, R.string.categoria_metal_transicao_meio, R.string.categoria_metal_transicao_plural, "M"),
    METAL_POS_TRANSICAO("metal_pos_transicao", R.string.categoria_metal_pos_transicao, R.string.categoria_metal_pos_transicao_meio, R.string.categoria_metal_pos_transicao_plural, "P"),
    SEMIMETAL("semimetal", R.string.categoria_semimetal, R.string.categoria_semimetal_meio, R.string.categoria_semimetal_plural, "S"),
    NAO_METAL("nao_metal", R.string.categoria_nao_metal, R.string.categoria_nao_metal_meio, R.string.categoria_nao_metal_plural, "N"),
    HALOGENIO("halogenio", R.string.categoria_halogenio, R.string.categoria_halogenio_meio, R.string.categoria_halogenio_plural, "H"),
    GAS_NOBRE("gas_nobre", R.string.categoria_gas_nobre, R.string.categoria_gas_nobre_meio, R.string.categoria_gas_nobre_plural, "G"),
    LANTANIDEO("lantanideo", R.string.categoria_lantanideo, R.string.categoria_lantanideo_meio, R.string.categoria_lantanideo_plural, "L"),
    ACTINIDEO("actinideo", R.string.categoria_actinideo, R.string.categoria_actinideo_meio, R.string.categoria_actinideo_plural, "C"),
    DESCONHECIDA("desconhecida", R.string.categoria_desconhecida, R.string.categoria_desconhecida_meio, R.string.categoria_desconhecida_plural, "?");

    companion object {
        fun de(id: String?): CategoriaElemento = entries.firstOrNull { it.id == id } ?: DESCONHECIDA
    }
}

/** Estado físico: [rotulo] ("Sólido", para legendas) e [meio] ("sólido", no meio da frase), ambos em strings.xml. */
enum class EstadoFisico(val id: String, @param:StringRes val rotulo: Int, @param:StringRes val meio: Int) {
    SOLIDO("solido", R.string.estado_solido, R.string.estado_solido_meio), LIQUIDO("liquido", R.string.estado_liquido, R.string.estado_liquido_meio),
    GAS("gas", R.string.estado_gas, R.string.estado_gas_meio), DESCONHECIDO("desconhecido", R.string.estado_desconhecido, R.string.estado_desconhecido_meio);

    companion object {
        fun de(id: String?): EstadoFisico = entries.firstOrNull { it.id == id } ?: DESCONHECIDO
    }
}

/** Elemento químico (118 no pacote real). Campo ausente no JSON = null aqui (nunca inventamos valor). */
data class Elemento(
    val z: Int,
    val simbolo: String,
    val nome: String,
    val nomeEn: String? = null,
    /** Nome por idioma (`elementos[].nomes`, Wikidata; es/fr vêm em minúsculas como no Wikidata). Só os idiomas com dado. */
    val nomes: Map<String, String> = emptyMap(),
    val massaAtomica: Double? = null,
    val massaAtomicaIncerteza: Double? = null,
    val grupo: Int? = null,
    val periodo: Int? = null,
    val bloco: String? = null,
    val categoria: CategoriaElemento = CategoriaElemento.DESCONHECIDA,
    val configuracaoEletronica: String? = null,
    val eletronegatividade: Double? = null,
    val raioAtomicoPm: Double? = null,
    val afinidadeEletronicaKJmol: Double? = null,
    val energiaIonizacaoKJmol: Double? = null,
    val pontoFusaoK: Double? = null,
    val pontoEbulicaoK: Double? = null,
    val densidadeKgm3: Double? = null,
    val estadoPadrao: EstadoFisico = EstadoFisico.DESCONHECIDO,
    val estadosOxidacao: List<Int> = emptyList(),
    val descobertaAno: Int? = null,
    val descobertaPor: String? = null,
    val fontes: List<Fonte> = emptyList()
)

/** Classificação GHS harmonizada (CLP/UE, Anexo VI) do composto, quando existe no dado. */
data class Ghs(
    val pictogramas: List<String> = emptyList(),
    val palavraSinal: String? = null,
    val frasesH: List<String> = emptyList(),
    /** Texto das frases H em português, se o pacote trouxer (código → texto). */
    val textosH: Map<String, String> = emptyMap(),
    val fonte: String? = null
)

/** Definição do composto no ChEBI (CC BY 4.0): sempre exibida com a atribuição. */
data class DefinicaoChebi(val texto: String, val id: String? = null, val url: String? = null, val licenca: String = "CC BY 4.0")

/** Composto (ficha completa, carregada sob demanda a partir do lote). */
data class Composto(
    val cid: Long,
    val nome: String,
    val nomePopular: String? = null,
    val nomeIupac: String? = null,
    val nomePtPendente: Boolean = false,
    val sinonimos: List<String> = emptyList(),
    /** Nome por idioma (`compostos[].nomes`, Wikidata; sem `pt-BR` quando o nome em português está pendente; `en` nunca é o IUPAC). */
    val nomes: Map<String, String> = emptyMap(),
    /** Apelidos por idioma (`compostos[].sinonimosPorIdioma`, até 10 por idioma). */
    val sinonimosPorIdioma: Map<String, List<String>> = emptyMap(),
    val formula: String? = null,
    val formulaHill: String? = null,
    val massaMolar: Double? = null,
    val massaExata: Double? = null,
    val smiles: String? = null,
    val inchiKey: String? = null,
    val cas: String? = null,
    /** Propriedades numéricas em SI (chave do contrato → valor). */
    val propriedades: Map<String, Double> = emptyMap(),
    /** Propriedades textuais, se houver. */
    val propriedadesTexto: Map<String, String> = emptyMap(),
    val ghs: Ghs? = null,
    val classes: List<String> = emptyList(),
    val wikidata: String? = null,
    /** Busca desta substância (por CAS) no site da OIT/ICSC: o app só abre o link; nenhuma ficha é copiada. */
    val icscBuscaUrl: String? = null,
    val definicaoChebi: DefinicaoChebi? = null,
    val fontes: List<Fonte> = emptyList()
) {
    /** Nome a exibir: o nome em português; se pendente, o nome IUPAC (a interface avisa). */
    val nomeExibicao: String get() = if (nomePtPendente && !nomeIupac.isNullOrBlank()) nomeIupac else nome
}

data class Constante(
    val id: String,
    val nome: String,
    val simbolo: String? = null,
    val valor: Double,
    val unidade: String? = null,
    val incerteza: Double? = null,
    val fontes: List<Fonte> = emptyList()
)

/** Trecho licenciado de texto (explicações, retrieval). */
data class Trecho(
    val id: String,
    val fonte: String,
    val licenca: String,
    val url: String? = null,
    val capitulo: String? = null,
    val secao: String? = null,
    val titulo: String? = null,
    val textoOriginal: String? = null,
    val textoPt: String? = null,
    val traducao: String? = null,
    val palavrasChave: List<String> = emptyList(),
    /** Idioma do TEXTO como vem no trecho (`pt`, `en`, `es`…); ausente nos pacotes antigos (= português). */
    val idiomaTexto: String? = null,
    /** Caminho do arquivo do pacote de onde o trecho veio (lote ou arquivo avulso). */
    val caminho: String? = null
) {
    /** Idioma do trecho no código do projeto (`pt-BR`, `en`…), para casar com o idioma ativo; sem o campo vale português. */
    val idioma: String get() = net.saibatudo.quimica.domain.Idiomas.normalizar(idiomaTexto) ?: net.saibatudo.quimica.domain.Idiomas.PADRAO
}

/** Um trecho listado em `textos/index.json` (sem o texto: só o que serve para escolher o lote). */
data class TrechoIndice(val id: String, val titulo: String? = null, val chave: String? = null)

/** Um lote de textos (`textos/<fonte>/lote-NNN.json`) listado no índice, com o idioma no código do projeto. */
data class LoteTextos(val caminho: String, val fonte: String, val idioma: String, val trechos: List<TrechoIndice>)

/** `textos/index.json` (docs/DATA_CONTRACT.md §5): os lotes de trechos por fonte e idioma. */
data class TextosIndice(val versao: Int, val lotes: List<LoteTextos>)

/** Definição de propriedade pesquisável (regras.propriedades). `alvo`: elemento ou composto; `tipo` define a formatação. */
data class PropriedadeDef(
    val id: String,
    val rotulo: String,
    val campo: String?,
    val alvo: String = "elemento",
    val tipo: String = "texto",
    val unidade: String? = null,
    val sinonimos: List<String> = emptyList(),
    /** Rótulo por idioma (`regras.propriedades[id].rotulos`). */
    val rotulos: Map<String, String> = emptyMap(),
    /** Sinônimos por idioma (`regras.propriedades[id].sinonimosPorIdioma`); `sinonimos` continua sendo pt-BR. */
    val sinonimosPorIdioma: Map<String, List<String>> = emptyMap(),
    /** Campo de origem no formato do pipeline ("elementos.pontoFusaoK", "compostos.propriedades.xlogp"). */
    val origem: String? = null
)

/** Unidade de medida: base = valor × fator + offset (unidade-base da grandeza). */
data class UnidadeDef(
    val grandeza: String,
    val simbolo: String,
    val nome: String? = null,
    val fator: Double,
    val offset: Double = 0.0,
    val apelidos: List<String> = emptyList(),
    /** Aceita prefixos SI (k, m, µ…): "kPa", "mmol", "nm". */
    val prefixavel: Boolean = false
)

data class PrefixoSi(val simbolo: String, val nome: String, val fator: Double)

/** Regras de autoria própria do pacote (propriedades, unidades, prefixos SI, reatividade…). */
data class Regras(
    val propriedades: List<PropriedadeDef> = emptyList(),
    val unidades: List<UnidadeDef> = emptyList(),
    val prefixos: List<PrefixoSi> = emptyList(),
    val serieReatividade: List<String> = emptyList(),
    /** Texto livre de regras de solubilidade e nomenclatura, se vierem no pacote. */
    val solubilidade: List<String> = emptyList(),
    val nomenclatura: List<String> = emptyList(),
    /** Frases H (código → texto em português), se o pacote trouxer. */
    val frasesH: Map<String, String> = emptyMap(),
    /** Frases H por idioma (`ghs_frases.json`: código → idioma → texto oficial do Anexo III do CLP). */
    val frasesHPorIdioma: Map<String, Map<String, String>> = emptyMap()
)

/** Entrada do índice de compostos (cid → lote) com os dados necessários para a busca. */
data class EntradaIndice(
    val cid: Long,
    val lote: String,
    val nomes: List<String> = emptyList(),
    val formula: String? = null,
    val cas: String? = null,
    val nomePtPendente: Boolean = false,
    /** Chaves de busca já normalizadas do formato do pipeline (`index.nomes` = [[chave, cid]]): nomes, sinônimos e fórmulas. */
    val chaves: List<String> = emptyList(),
    /** Chaves por idioma (`index.nomesPorIdioma[idioma]`): só as que não estão em [chaves]. */
    val chavesPorIdioma: Map<String, List<String>> = emptyMap()
)

class CompostoIndice(val entradas: List<EntradaIndice>) {
    private val porCid: Map<Long, EntradaIndice> = entradas.associateBy { it.cid }
    val tamanho: Int get() = entradas.size
    fun entrada(cid: Long): EntradaIndice? = porCid[cid]

    /** O índice traz nomes para busca? Senão a busca precisa carregar os lotes. */
    val temNomes: Boolean get() = entradas.any { it.nomes.isNotEmpty() }
}
