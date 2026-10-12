package net.saibatudo.quimica

import kotlinx.coroutines.runBlocking
import net.saibatudo.quimica.data.bundle.BundleLoader
import net.saibatudo.quimica.data.bundle.BundleManifest
import net.saibatudo.quimica.data.bundle.DirBundleReader
import net.saibatudo.quimica.data.repository.Pacote
import java.io.File

/**
 * Dados dos testes. [Fixture] é o pacote mínimo e assinado de app/src/test/resources/data-quimica (10 elementos,
 * 20 compostos): determinístico, usado nos testes de cálculo. [Real] é data/quimica (pacote do pipeline), usado
 * nos testes de integridade e de contrato quando existe.
 */
class PacoteDeTeste(val dir: File) {
    val manifestBytes: ByteArray by lazy { File(dir, "manifest.json").readBytes() }
    val assinatura: String by lazy { File(dir, "manifest.sig").readText().trim() }
    val manifest: BundleManifest by lazy { BundleManifest.parse(manifestBytes).also { it.validar() } }
    val pacote: Pacote by lazy { runBlocking { BundleLoader.carregar(DirBundleReader(dir), manifest, verificarHash = true) } }
}

object TestData {
    val chavePublica: String by lazy { File("../pipeline/data_signing_public.b64").readText().trim() }

    val Fixture = PacoteDeTeste(File("src/test/resources/data-quimica").canonicalFile)

    private val dirReal = File("../data/quimica").canonicalFile
    val Real: PacoteDeTeste? = if (File(dirReal, "manifest.json").isFile && File(dirReal, "manifest.sig").isFile) PacoteDeTeste(dirReal) else null

    /** Snapshot embutido no APK (app/src/main/assets/quimica, copiado por app/tools/copiar_pacote_para_assets.py), se existir. */
    private val dirEmbutido = File("src/main/assets/quimica").canonicalFile
    val Embutido: PacoteDeTeste? = if (File(dirEmbutido, "manifest.json").isFile && File(dirEmbutido, "manifest.sig").isFile) PacoteDeTeste(dirEmbutido) else null

    /** Pacote usado onde só importa ter dados (NLU, respostas): o real, se existir; senão o fixture. */
    val Melhor: PacoteDeTeste get() = Real ?: Fixture

    /** Pasta de contratos compartilhados com o site (contracts/). */
    val contratos = File("../contracts").canonicalFile
}

/**
 * Textos nos testes de unidade, que não têm Android: lê os MESMOS `res/values-<idioma>/strings.xml` do app (a única fonte de texto) e resolve o nome → id
 * pela classe `R.string`/`R.plurals`. Segue as regras do aapt para o texto (aspas, `\'`, `\n`, `\uXXXX`, espaços colapsados) e a ordem do Android
 * (idioma → `values/`, que é o pt-BR). Os plurais usam as categorias one/other do CLDR (pt e fr: 0 e 1 são "one").
 */
object RecursosXml : net.saibatudo.quimica.domain.FonteDeTextos {
    private val res = File("src/main/res").canonicalFile
    private val nomeDoId: Map<Int, String> = ids("net.saibatudo.quimica.R\$string")
    private val nomeDoPlural: Map<Int, String> = ids("net.saibatudo.quimica.R\$plurals")

    private fun ids(classe: String): Map<Int, String> =
        Class.forName(classe).fields.filter { java.lang.reflect.Modifier.isStatic(it.modifiers) && it.type == Int::class.javaPrimitiveType }.associate { it.getInt(null) to it.name }

    class Arquivo(val strings: Map<String, String>, val plurais: Map<String, Map<String, String>>)

    private val cache = java.util.concurrent.ConcurrentHashMap<String, Arquivo>()

    /** Pasta de valores do idioma ("values", "values-en"…). */
    fun pasta(idioma: String): String = if (idioma == "pt-BR") "values" else "values-$idioma"

    fun arquivo(idioma: String): Arquivo = cache.getOrPut(idioma) { ler(File(res, "${pasta(idioma)}/strings.xml")) }

    /** Lê um strings.xml (nome → texto já desescapado; plurais por quantidade). Arquivo ausente = vazio. */
    fun ler(f: File): Arquivo {
        if (!f.isFile) return Arquivo(emptyMap(), emptyMap())
        val doc = javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(f)
        val strings = LinkedHashMap<String, String>()
        val plurais = LinkedHashMap<String, Map<String, String>>()
        val filhos = doc.documentElement.childNodes
        for (i in 0 until filhos.length) {
            val n = filhos.item(i) as? org.w3c.dom.Element ?: continue
            when (n.tagName) {
                "string" -> strings[n.getAttribute("name")] = desescapar(n.textContent)
                "plurals" -> {
                    val itens = LinkedHashMap<String, String>()
                    val l = n.getElementsByTagName("item")
                    for (j in 0 until l.length) { val it = l.item(j) as org.w3c.dom.Element; itens[it.getAttribute("quantity")] = desescapar(it.textContent) }
                    plurais[n.getAttribute("name")] = itens
                }
            }
        }
        return Arquivo(strings, plurais)
    }

    /** Texto como o aapt o entrega: sem espaços nas pontas nem repetidos (a não ser entre aspas) e com as barras invertidas resolvidas. */
    fun desescapar(bruto: String): String {
        val sb = StringBuilder()
        var aspas = false
        var i = 0
        var espaco = false
        while (i < bruto.length) {
            val c = bruto[i]
            when {
                c == '\\' && i + 1 < bruto.length -> {
                    if (espaco && sb.isNotEmpty()) sb.append(' ')
                    espaco = false
                    val d = bruto[i + 1]
                    when (d) {
                        'n' -> sb.append('\n'); 't' -> sb.append('\t')
                        'u' -> { sb.append(bruto.substring(i + 2, i + 6).toInt(16).toChar()); i += 4 }
                        else -> sb.append(d)
                    }
                    i += 2; espaco = false; continue
                }
                c == '"' -> { aspas = !aspas; i++; continue }
                c.isWhitespace() && !aspas -> { espaco = true; i++; continue }
                else -> { if (espaco && sb.isNotEmpty()) sb.append(' '); espaco = false; sb.append(c) }
            }
            i++
        }
        return sb.toString()
    }

    private fun nome(id: Int) = nomeDoId[id] ?: error("recurso de texto desconhecido: $id")

    /** Texto bruto (com %1$s) no idioma, com reserva no pt-BR. */
    fun bruto(nome: String, idioma: String): String =
        arquivo(idioma).strings[nome] ?: arquivo("pt-BR").strings[nome] ?: error("string '$nome' não existe em values/strings.xml")

    override fun texto(id: Int, idioma: String, args: Array<out Any?>): String {
        val t = bruto(nome(id), idioma)
        return if (args.isEmpty()) t else String.format(net.saibatudo.quimica.domain.Idiomas.locale(idioma), t, *args)
    }

    /** Categoria de plural (CLDR, só one/other): pt-BR e fr tratam 0 e 1 como "one"; os demais, só 1. */
    fun categoria(idioma: String, n: Int): String = if (n == 1 || (n == 0 && (idioma == "pt-BR" || idioma == "fr"))) "one" else "other"

    override fun plural(id: Int, quantidade: Int, idioma: String, args: Array<out Any?>): String {
        val nome = nomeDoPlural[id] ?: error("plural desconhecido: $id")
        val itens = arquivo(idioma).plurais[nome] ?: arquivo("pt-BR").plurais[nome] ?: error("plurals '$nome' não existe")
        val t = itens[categoria(idioma, quantidade)] ?: itens["other"] ?: error("plurals '$nome' sem 'other'")
        return String.format(net.saibatudo.quimica.domain.Idiomas.locale(idioma), t, *args)
    }

    /** Todos os nomes de `R.string` / `R.plurals` (para os testes de completude). */
    fun nomesDeString(): Set<String> = nomeDoId.values.toSet()
    fun nomesDePlural(): Set<String> = nomeDoPlural.values.toSet()
}

/** Textos dos testes por idioma (`Tx.pt`, `Tx.de("en")`). */
object Tx {
    private val porIdioma = java.util.concurrent.ConcurrentHashMap<String, net.saibatudo.quimica.domain.Textos>()
    fun de(idioma: String): net.saibatudo.quimica.domain.Textos = porIdioma.getOrPut(idioma) { net.saibatudo.quimica.domain.Textos(idioma, RecursosXml) }
    val pt: net.saibatudo.quimica.domain.Textos get() = de("pt-BR")
}

/** Dicionário do pacote no idioma, com os textos de strings.xml (atalho dos testes). */
fun dicionario(pacote: net.saibatudo.quimica.data.repository.Pacote, idioma: String = "pt-BR"): net.saibatudo.quimica.ai.nlu.Dicionario =
    kotlinx.coroutines.runBlocking { net.saibatudo.quimica.ai.nlu.Dicionario.criar(pacote, Tx.de(idioma)) }

/** Texto simples da resposta em pt-BR (os testes antigos escreviam `resposta.texto()`). */
fun net.saibatudo.quimica.ai.model.Resposta.texto(): String = texto(Tx.pt)
