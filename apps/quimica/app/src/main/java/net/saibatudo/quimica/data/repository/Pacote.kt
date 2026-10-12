package net.saibatudo.quimica.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import net.saibatudo.quimica.data.bundle.BundleManifest
import net.saibatudo.quimica.data.bundle.BundleReader
import net.saibatudo.quimica.data.bundle.ManifestVerifier
import net.saibatudo.quimica.data.bundle.OrigemPacote
import net.saibatudo.quimica.data.model.CompostoIndice
import net.saibatudo.quimica.data.model.Composto
import net.saibatudo.quimica.data.model.Constante
import net.saibatudo.quimica.data.model.Elemento
import net.saibatudo.quimica.data.model.Fonte
import net.saibatudo.quimica.data.model.LoteTextos
import net.saibatudo.quimica.data.model.PacoteJson
import net.saibatudo.quimica.data.model.Regras
import net.saibatudo.quimica.data.model.TextosIndice
import net.saibatudo.quimica.data.model.Trecho
import net.saibatudo.quimica.domain.Idiomas
import net.saibatudo.quimica.domain.Texto

/**
 * Pacote de dados carregado: o núcleo (elementos, constantes, regras, fontes, índice de compostos) fica em memória e o
 * resto (lotes de compostos, fichas ICSC, textos) é lido sob demanda do mesmo leitor (assets ou pasta baixada).
 * Quando [verificarHash] é verdadeiro, cada arquivo lido é conferido com o sha256 do manifesto assinado.
 */
class Pacote(
    val manifest: BundleManifest,
    val origem: OrigemPacote,
    val elementos: List<Elemento>,
    val constantes: List<Constante>,
    val regras: Regras,
    val fontes: List<Fonte>,
    val indice: CompostoIndice,
    private val reader: BundleReader,
    private val verificarHash: Boolean
) {
    val porSimbolo: Map<String, Elemento> = elementos.associateBy { it.simbolo }
    val porZ: Map<Int, Elemento> = elementos.associateBy { it.z }

    fun elemento(simbolo: String): Elemento? = porSimbolo[simbolo]
    fun constante(id: String): Constante? = constantes.firstOrNull { it.id.equals(id, ignoreCase = true) }

    private val trava = Mutex()
    private val lotes = HashMap<String, List<Composto>>()
    private var trechosCache: List<Trecho>? = null
    private var todos: List<Composto>? = null

    /** Lê um arquivo do pacote conferindo o sha256 (se exigido) contra o manifesto assinado. */
    suspend fun bytes(path: String): ByteArray = withContext(Dispatchers.IO) {
        val dados = reader.open(path).use { it.readBytes() }
        if (verificarHash) {
            val esperado = manifest.arquivo(path) ?: throw IllegalStateException("arquivo fora do manifesto: $path")
            check(ManifestVerifier.sha256Hex(dados) == esperado.sha256) { "checksum divergente em $path" }
        }
        dados
    }

    fun existe(path: String): Boolean = manifest.arquivo(path) != null

    /** Lote de compostos (cacheado). */
    suspend fun lote(lote: String): List<Composto> = trava.withLock {
        lotes[lote] ?: run {
            val caminho = PacoteJson.caminhoDoLote(lote)
            val lista = PacoteJson.compostos(PacoteJson.parse(bytes(caminho)))
            if (lotes.size >= MAX_LOTES_EM_MEMORIA) lotes.remove(lotes.keys.first())
            lotes[lote] = lista
            lista
        }
    }

    /** Ficha completa de um composto, carregando só o lote que o contém. */
    suspend fun composto(cid: Long): Composto? {
        val entrada = indice.entrada(cid) ?: return null
        return lote(entrada.lote).firstOrNull { it.cid == cid }
    }

    /** Todos os compostos do pacote (carrega todos os lotes; usado só quando o índice não traz nomes). */
    suspend fun todosOsCompostos(): List<Composto> {
        todos?.let { return it }
        val lista = indice.entradas.map { it.lote }.distinct().flatMap { lote(it) }
        trava.withLock { todos = lista }
        return lista
    }

    /** Arquivos de textos já lidos (caminho → trechos); falha de leitura = lista vazia (o resto do pacote continua). */
    private val textosLidos = HashMap<String, List<Trecho>>()
    private var indiceTextosLido = false
    private var indiceTextosCache: TextosIndice? = null

    /** `textos/index.json` (lotes por fonte e idioma) ou null quando o pacote é do formato antigo (um arquivo por trecho). */
    suspend fun indiceDeTextos(): TextosIndice? {
        if (indiceTextosLido) return indiceTextosCache
        val idx = if (existe(CAMINHO_INDICE_TEXTOS)) runCatching { PacoteJson.textosIndice(PacoteJson.parse(bytes(CAMINHO_INDICE_TEXTOS))) }.getOrNull() else null
        trava.withLock { indiceTextosCache = idx; indiceTextosLido = true }
        return idx
    }

    private suspend fun lerTextos(caminho: String): List<Trecho> {
        trava.withLock { textosLidos[caminho] }?.let { return it }
        val lista = runCatching { PacoteJson.trechos(PacoteJson.parse(bytes(caminho)), caminho) }.getOrDefault(emptyList())
        trava.withLock { textosLidos[caminho] = lista }
        return lista
    }

    /** Arquivos de texto fora do índice (formato antigo: um trecho por arquivo), sem o próprio índice. */
    private suspend fun avulsos(): List<String> {
        val emLote = indiceDeTextos()?.lotes?.map { it.caminho }?.toSet().orEmpty()
        return manifest.caminhos("textos/").filter { it.endsWith(".json") && it != CAMINHO_INDICE_TEXTOS && it !in emLote }
    }

    /** TODOS os trechos licenciados do pacote (lotes do índice + arquivos avulsos), de todos os idiomas e fontes, lidos uma vez. */
    suspend fun trechos(): List<Trecho> {
        trechosCache?.let { return it }
        val caminhos = indiceDeTextos()?.lotes?.map { it.caminho }.orEmpty().filter { existe(it) } + avulsos()
        val lista = caminhos.flatMap { lerTextos(it) }
        trava.withLock { trechosCache = lista }
        return lista
    }

    /**
     * Trechos para o retrieval de "O que é…?" no [idioma] (espelha `DataStore.textos` do site): com [reserva], também inglês e depois português,
     * nessa ordem de prioridade (o trecho traz o próprio idioma, para a interface rotular). Com [termos] (palavras da pergunta), lê só os lotes/
     * arquivos cuja chave ou título combina com algum termo; sem combinação, todos os do(s) idioma(s). As definições do ChEBI ficam de fora (já
     * vêm no registro do composto). Aceita o pacote antigo (um arquivo por trecho, sem índice).
     */
    suspend fun trechos(idioma: String, termos: List<String>? = null, reserva: Boolean = false): List<Trecho> {
        val idiomas = if (reserva) Idiomas.comReservas(idioma) else listOf(Idiomas.normalizar(idioma) ?: Idiomas.PADRAO)
        val uteis = termos.orEmpty().filter { it.length >= 3 }
        fun combina(chaves: List<String>) = uteis.isEmpty() || chaves.any { c -> uteis.any { c.contains(it) } }
        val lotes = indiceDeTextos()?.lotes.orEmpty().filter { existe(it.caminho) && !it.caminho.startsWith("textos/chebi/") && it.fonte != "chebi" }
        val lotesAlvo = lotes.filter { it.idioma in idiomas }
        val chavesDoLote = { l: LoteTextos -> l.trechos.flatMap { listOf(Texto.nlu(it.chave), Texto.nlu(it.titulo)) }.filter { it.isNotEmpty() } }
        val lotesCand = if (uteis.isNotEmpty()) lotesAlvo.filter { combina(chavesDoLote(it)) } else lotesAlvo
        val soltos = avulsos().filter { !it.startsWith("textos/chebi/") }
        val nomeDoArquivo = { c: String -> Texto.nlu(c.removePrefix("textos/").substringAfter('/').removeSuffix(".json")) }
        val soltosCand = if (uteis.isNotEmpty()) soltos.filter { combina(listOf(nomeDoArquivo(it))) } else soltos
        val final = if (lotesCand.size + soltosCand.size > 0) lotesCand.map { it.caminho } + soltosCand else lotesAlvo.map { it.caminho } + soltos
        val ordem = idiomas.withIndex().associate { (i, id) -> id to i }
        return final.flatMap { lerTextos(it) }.filter { it.idioma in ordem }.sortedBy { ordem.getValue(it.idioma) }
    }

    /**
     * Texto das frases H no [idioma] (código → frase): `ghs_frases.json` do pacote (`textoPorIdioma`, Anexo III do CLP). Em pt-BR fica o que o
     * app já mostrava (GhsTextos, mesmo texto do site); nos outros idiomas, o idioma pedido e, sem ele, o inglês do pacote e o português.
     */
    fun frasesH(idioma: String): Map<String, String> {
        val id = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO
        if (id == Idiomas.PADRAO) return regras.frasesH
        val ordem = Idiomas.comReservas(id)
        return regras.frasesHPorIdioma.mapNotNull { (cod, m) -> ordem.firstNotNullOfOrNull { m[it] }?.let { cod to it } }.toMap()
    }

    /** Fontes para "Sobre os dados": `fontes.json` e, se faltar, as do manifesto. */
    val fontesExibicao: List<Fonte> get() = fontes.ifEmpty { manifest.sources }

    /** Chave normalizada de nome → CID (apenas nomes do índice) para a pergunta/busca. */
    fun nomeNormalizado(s: String): String = Texto.chaveNome(s)

    companion object {
        private const val MAX_LOTES_EM_MEMORIA = 12
        const val CAMINHO_INDICE_TEXTOS = "textos/index.json"
    }
}
