package net.saibatudo.quimica.domain

import androidx.annotation.PluralsRes
import androidx.annotation.StringRes
import net.saibatudo.quimica.R

/**
 * De onde vêm os textos da interface e das respostas (docs/I18N.md §6): sempre de `res/values-<idioma>/strings.xml`, uma pasta por idioma
 * (`values` = pt-BR, a referência; `values-en`, `-es`, `-de`, `-fr`). No aparelho, a fonte é [net.saibatudo.quimica.ui.RecursosAndroid]
 * (Resources do idioma pedido); nos testes de unidade, que não têm Android, o mesmo `strings.xml` é lido do disco (TestSupport.kt).
 * Há UMA só fonte de texto: o XML. Nada de tabela paralela em Kotlin.
 */
interface FonteDeTextos {
    /** Texto do recurso [id] no [idioma]; os [args] preenchem `%1$s`, `%2$d`… (sem [args], o texto vem como está). */
    fun texto(@StringRes id: Int, idioma: String, args: Array<out Any?>): String

    /** Texto plural (`<plurals>`) de [quantidade] no [idioma]; [args] como em [texto] (o primeiro costuma ser a própria quantidade). */
    fun plural(@PluralsRes id: Int, quantidade: Int, idioma: String, args: Array<out Any?>): String
}

/**
 * Os textos de UM idioma: `t(R.string.chave, arg1, arg2)` devolve o texto do idioma com os argumentos já colocados, e os números saem no
 * formato do idioma (vírgula decimal em pt-BR, es, de e fr; ponto em inglês). É o que as respostas ([net.saibatudo.quimica.ai.answer.AnswerBuilder]),
 * as calculadoras e as telas recebem no lugar de texto fixo em português. Espelha `t()` e `fmt()` do site (web/src/quimica/js/i18n/index.js).
 */
class Textos(idioma: String, private val fonte: FonteDeTextos) {
    val idioma: String = Idiomas.normalizar(idioma) ?: Idiomas.PADRAO

    operator fun invoke(@StringRes id: Int, vararg args: Any?): String = fonte.texto(id, idioma, args)

    fun plural(@PluralsRes id: Int, quantidade: Int, vararg args: Any?): String = fonte.plural(id, quantidade, idioma, args)

    /** Os mesmos textos em outro idioma. */
    fun em(outro: String): Textos = Textos(outro, fonte)

    // ---- números no formato do idioma ----------------------------------------------------------------------------------------------

    /** Até [casas] casas decimais, sem zeros à direita ("1.234,5" / "1,234.5"). */
    fun num(v: Double, casas: Int = 3): String = Texto.numero(v, casas, idioma)

    /** Exatamente [casas] casas decimais ("18,015" / "18.015"). */
    fun fixo(v: Double, casas: Int): String = Texto.fixo(v, casas, idioma)

    /** [algarismos] algarismos significativos, com notação científica fora de 1e-3 ≤ |v| < 1e6. */
    fun sig(v: Double, algarismos: Int = 4): String = Texto.significativos(v, algarismos, idioma)

    /** "6,022 × 10²³". */
    fun cient(v: Double, casas: Int = 3): String = Texto.cientifica(v, casas, idioma)

    // ---- datas no formato do idioma --------------------------------------------------------------------------------------------------

    /**
     * Data ISO-8601 ("2026-10-12", "2026-10-12T17:16:53Z") escrita no formato do idioma ("12/10/2026", "Oct 12, 2026"), com a hora local se
     * [comHora]; null se [iso] não for uma data. Data sem hora não muda de dia com o fuso.
     */
    fun data(iso: String?, comHora: Boolean = false): String? {
        val s = iso?.trim().orEmpty()
        if (s.isEmpty()) return null
        val locale = Idiomas.locale(idioma)
        for ((padrao, utc) in PADROES_ISO) {
            val leitor = java.text.SimpleDateFormat(padrao, java.util.Locale.ROOT).apply { isLenient = false; timeZone = java.util.TimeZone.getTimeZone("UTC") }
            val d = try { leitor.parse(s) } catch (_: java.text.ParseException) { null } ?: continue
            val soData = padrao == "yyyy-MM-dd"
            val f = if (comHora && !soData) java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, locale)
            else java.text.DateFormat.getDateInstance(java.text.DateFormat.MEDIUM, locale)
            if (soData && utc) f.timeZone = java.util.TimeZone.getTimeZone("UTC")
            return f.format(d)
        }
        return null
    }

    /** Instante (milissegundos) com data e hora no formato do idioma. */
    fun dataHora(millis: Long): String =
        java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, Idiomas.locale(idioma)).format(java.util.Date(millis))

    // ---- grandezas ---------------------------------------------------------------------------------------------------------------------

    /** Nome (minúsculo no meio da frase) da grandeza de id [id] ("massa", "pressao"…); um id desconhecido volta como veio. */
    fun grandeza(id: String): String = when (id) {
        "massa" -> this(R.string.grandeza_massa)
        "volume" -> this(R.string.grandeza_volume)
        "comprimento" -> this(R.string.grandeza_comprimento)
        "pressao" -> this(R.string.grandeza_pressao)
        "energia" -> this(R.string.grandeza_energia)
        "temperatura" -> this(R.string.grandeza_temperatura)
        "tempo" -> this(R.string.grandeza_tempo)
        "quantidade" -> this(R.string.grandeza_quantidade)
        "concentracao" -> this(R.string.grandeza_concentracao)
        "densidade" -> this(R.string.grandeza_densidade)
        else -> id
    }

    // ---- GHS ---------------------------------------------------------------------------------------------------------------------------

    /** Palavra de sinal do GHS no idioma: o pacote a traz como "Perigo"/"Atenção" (pt-BR); qualquer outra fica como veio. */
    fun palavraSinal(p: String): String = when (Texto.nlu(p)) {
        "perigo", "danger" -> this(R.string.ghs_sinal_perigo)
        "atencao", "warning" -> this(R.string.ghs_sinal_atencao)
        else -> p
    }

    // ---- nomes de idiomas ------------------------------------------------------------------------------------------------------------

    /** Nome de [codigo] escrito neste idioma: "inglês", "English", "inglés", "Englisch", "anglais" (catálogos `ui.idiomas` do site). */
    fun nomeDoIdioma(codigo: String): String = when (Idiomas.normalizar(codigo)) {
        "pt-BR" -> this(R.string.idioma_nome_pt_br)
        "en" -> this(R.string.idioma_nome_en)
        "es" -> this(R.string.idioma_nome_es)
        "de" -> this(R.string.idioma_nome_de)
        "fr" -> this(R.string.idioma_nome_fr)
        else -> codigo
    }

    /** Nome com o rótulo da língua quando é uma reserva: "Hydrogen (nome em inglês)" (web: `ui.nomes.emIdioma`). */
    fun nomeRotulado(n: NomeNoIdioma): String = if (n.reserva) this(R.string.nome_em_idioma, n.nome, nomeDoIdioma(n.idioma)) else n.nome

    /** "Nome em inglês" como rótulo de campo (web: `ui.nomes.nomeEmIdioma`). */
    fun rotuloNomeEm(codigo: String): String = this(R.string.rotulo_nome_em_idioma, nomeDoIdioma(codigo))

    /** Primeira letra minúscula no meio da frase ("ponto de fusão de ferro"), exceto onde o idioma mantém a maiúscula (alemão). */
    fun minusNoMeio(s: String): String = Idiomas.minusNoMeio(s, idioma)

    private companion object {
        /** Formatos ISO aceitos (leitura em UTC): data e hora com "Z", com milissegundos, e só a data. */
        val PADROES_ISO = listOf("yyyy-MM-dd'T'HH:mm:ss'Z'" to false, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" to false, "yyyy-MM-dd" to true)
    }
}
