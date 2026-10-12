package net.saibatudo.quimica.data.bundle

import android.content.res.AssetManager
import androidx.annotation.StringRes
import net.saibatudo.quimica.R
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.io.InputStream

/** De onde veio o pacote de dados: [rotulo] é o texto exibido ("Pacote embutido no app", "Atualização baixada"), em strings.xml. */
enum class OrigemPacote(@param:StringRes val rotulo: Int) {
    EMBUTIDO(R.string.origem_pacote_embutido),
    BAIXADO(R.string.origem_pacote_baixado)
}

/** Acesso de leitura a um pacote de dados (snapshot embutido nos assets ou versão baixada em disco). */
interface BundleReader {
    /** Origem do pacote, para exibição. */
    val origem: OrigemPacote
    fun open(path: String): InputStream
    fun exists(path: String): Boolean
}

class AssetBundleReader(
    private val assets: AssetManager,
    private val base: String = ASSET_BASE
) : BundleReader {
    override val origem: OrigemPacote = OrigemPacote.EMBUTIDO

    override fun open(path: String): InputStream = assets.open("$base/$path")

    override fun exists(path: String): Boolean = try {
        assets.open("$base/$path").use { true }
    } catch (_: FileNotFoundException) {
        false
    } catch (_: IOException) {
        false
    }

    companion object {
        /** Pasta dos assets onde o pacote é embutido (data/quimica/ vira assets/quimica/). */
        const val ASSET_BASE = "quimica"
    }
}

class DirBundleReader(private val dir: File, override val origem: OrigemPacote = OrigemPacote.BAIXADO) : BundleReader {

    private fun resolve(path: String): File {
        val f = File(dir, path).canonicalFile
        require(f.path.startsWith(dir.canonicalPath)) { "caminho fora do pacote: $path" }
        return f
    }

    override fun open(path: String): InputStream = resolve(path).inputStream().buffered()
    override fun exists(path: String): Boolean = resolve(path).isFile
}
