package net.saibatudo.quimica.data.model

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/**
 * Leitura tolerante dos arquivos do pacote (docs/DATA_CONTRACT.md): campo ausente = null, formatos alternativos
 * aceitos (lista na raiz ou objeto com a lista dentro) para que uma mudança pequena no pipeline não derrube o app.
 * Nada aqui inventa valores.
 */
object PacoteJson {

    fun parse(bytes: ByteArray): JsonElement = JsonParser.parseString(String(bytes, Charsets.UTF_8))

    // ---- utilitários de leitura -------------------------------------------------------------------------------

    private fun JsonElement?.obj(): JsonObject? = if (this != null && this.isJsonObject) this.asJsonObject else null
    private fun JsonElement?.arr(): JsonArray? = if (this != null && this.isJsonArray) this.asJsonArray else null

    internal fun JsonObject.texto(vararg chaves: String): String? {
        for (k in chaves) {
            val v = get(k)
            if (v != null && v.isJsonPrimitive) {
                val s = v.asString.trim()
                if (s.isNotEmpty()) return s
            }
        }
        return null
    }

    internal fun JsonObject.numero(vararg chaves: String): Double? {
        for (k in chaves) {
            val v = get(k)
            if (v != null && v.isJsonPrimitive) {
                val p = v.asJsonPrimitive
                if (p.isNumber) return p.asDouble
                if (p.isString) p.asString.trim().replace(',', '.').toDoubleOrNull()?.let { return it }
            }
        }
        return null
    }

    internal fun JsonObject.inteiro(vararg chaves: String): Int? = numero(*chaves)?.toInt()

    internal fun JsonObject.longo(vararg chaves: String): Long? = numero(*chaves)?.toLong()

    internal fun JsonObject.booleano(chave: String): Boolean? {
        val v = get(chave)
        return if (v != null && v.isJsonPrimitive && v.asJsonPrimitive.isBoolean) v.asBoolean else null
    }

    /** Lista de textos: aceita array de strings ou uma string única. */
    internal fun JsonObject.textos(vararg chaves: String): List<String> {
        for (k in chaves) {
            val v = get(k) ?: continue
            if (v.isJsonArray) return v.asJsonArray.mapNotNull { if (it.isJsonPrimitive) it.asString.trim().takeIf { s -> s.isNotEmpty() } else null }
            if (v.isJsonPrimitive) return listOf(v.asString.trim()).filter { it.isNotEmpty() }
        }
        return emptyList()
    }

    /** Dicionário `{ "<idioma>": "texto" }` (campos por idioma do contrato); entradas vazias ficam de fora. */
    internal fun porIdioma(e: JsonElement?): Map<String, String> {
        val o = e.obj() ?: return emptyMap()
        val out = linkedMapOf<String, String>()
        for ((k, v) in o.entrySet()) if (v.isJsonPrimitive) v.asString.trim().takeIf { it.isNotEmpty() }?.let { out[k] = it }
        return out
    }

    /** Dicionário `{ "<idioma>": ["a", "b"] }`. */
    internal fun listasPorIdioma(e: JsonElement?): Map<String, List<String>> {
        val o = e.obj() ?: return emptyMap()
        val out = linkedMapOf<String, List<String>>()
        for ((k, v) in o.entrySet()) {
            val l = v.arr()?.mapNotNull { if (it.isJsonPrimitive) it.asString.trim().takeIf { s -> s.isNotEmpty() } else null }.orEmpty()
            if (l.isNotEmpty()) out[k] = l
        }
        return out
    }

    /** Lista de objetos na raiz ou dentro de [chaves] (primeira que existir). */
    private fun listaDeObjetos(raiz: JsonElement, vararg chaves: String): List<JsonObject> {
        raiz.arr()?.let { a -> return a.mapNotNull { it.obj() } }
        val o = raiz.obj() ?: return emptyList()
        for (k in chaves) {
            val v = o.get(k)
            v.arr()?.let { a -> return a.mapNotNull { it.obj() } }
            v.obj()?.let { m -> return m.entrySet().mapNotNull { (id, el) -> el.obj()?.also { if (!it.has("id")) it.addProperty("id", id) } } }
        }
        return emptyList()
    }

    // ---- fontes -------------------------------------------------------------------------------------------------

    fun fonte(o: JsonObject): Fonte? {
        val nome = o.texto("nome", "descricao", "id") ?: return null
        return Fonte(
            nome = nome,
            url = o.texto("url"),
            licenca = o.texto("licenca", "licença"),
            acessadoEm = o.texto("acessadoEm", "coletadoEm", "data"),
            uso = o.texto("uso", "descricao").takeIf { it != nome },
            id = o.texto("id")
        )
    }

    fun fontes(e: JsonElement?): List<Fonte> = e.arr()?.mapNotNull { it.obj()?.let(::fonte) }.orEmpty()

    /** Origem de um valor (`fontesPorPropriedade[campo]`, DATA_CONTRACT §2 e §3.1); objeto sem nenhum campo conhecido = null. */
    fun fonteValor(o: JsonObject): FonteValor? {
        val c = o.get("condicoes").obj()?.let { x ->
            CondicoesMedida(x.numero("temperaturaK"), x.numero("pressaoPa"), x.texto("fase")).takeIf { !it.vazia }
        }
        val f = FonteValor(
            nome = o.texto("nome"), url = o.texto("url"), licenca = o.texto("licenca", "licença"), acessadoEm = o.texto("acessadoEm"),
            declaracao = o.texto("declaracao"), referencia = o.texto("referencia"), valorOriginal = o.numero("valorOriginal"),
            unidadeOriginal = o.texto("unidadeOriginal"), condicoes = c, semReferencia = o.booleano("semReferencia") == true,
            corroboradoPor = o.inteiro("corroboradoPor"), metodo = o.texto("metodo"), aviso = o.texto("aviso"), revisar = o.booleano("revisar") == true,
            escala = o.texto("escala"), nota = o.texto("nota")
        )
        return f.takeIf { it.nome != null || it.url != null || it.metodo != null || it.precisaRevisar || it.escala != null }
    }

    /** `fontesPorPropriedade`: campo → objeto (uma origem) ou lista alinhada (`pkaValores`). Campos sem origem legível ficam de fora. */
    fun fontesPorPropriedade(e: JsonElement?): Map<String, List<FonteValor>> {
        val o = e.obj() ?: return emptyMap()
        val out = linkedMapOf<String, List<FonteValor>>()
        for ((campo, v) in o.entrySet()) {
            val l = (v.arr()?.mapNotNull { it.obj()?.let(::fonteValor) } ?: v.obj()?.let(::fonteValor)?.let { listOf(it) }).orEmpty()
            if (l.isNotEmpty()) out[campo] = l
        }
        return out
    }

    fun fontesDeArquivo(raiz: JsonElement): List<Fonte> = listaDeObjetos(raiz, "fontes", "sources").mapNotNull(::fonte)

    // ---- elementos ----------------------------------------------------------------------------------------------

    fun elementos(raiz: JsonElement): List<Elemento> =
        listaDeObjetos(raiz, "elementos", "elements").mapNotNull(::elemento).sortedBy { it.z }

    fun elemento(o: JsonObject): Elemento? {
        val z = o.inteiro("z", "numeroAtomico") ?: return null
        val simbolo = o.texto("simbolo", "symbol") ?: return null
        val desc = o.get("descoberta").obj()
        return Elemento(
            z = z,
            simbolo = simbolo,
            nome = o.texto("nome") ?: simbolo,
            nomeEn = o.texto("nomeEn"),
            nomes = porIdioma(o.get("nomes")),
            massaAtomica = o.numero("massaAtomica"),
            massaAtomicaIncerteza = o.numero("massaAtomicaIncerteza"),
            grupo = o.inteiro("grupo"),
            periodo = o.inteiro("periodo"),
            bloco = o.texto("bloco"),
            categoria = CategoriaElemento.de(o.texto("categoria")),
            configuracaoEletronica = o.texto("configuracaoEletronica"),
            eletronegatividade = o.numero("eletronegatividade"),
            raioAtomicoPm = o.numero("raioAtomicoPm"),
            afinidadeEletronicaKJmol = o.numero("afinidadeEletronicaKJmol"),
            energiaIonizacaoKJmol = o.numero("energiaIonizacaoKJmol"),
            pontoFusaoK = o.numero("pontoFusaoK"),
            pontoEbulicaoK = o.numero("pontoEbulicaoK"),
            densidadeKgm3 = o.numero("densidadeKgm3"),
            estadoPadrao = EstadoFisico.de(o.texto("estadoPadrao")),
            estadosOxidacao = o.get("estadosOxidacao").arr()?.mapNotNull { if (it.isJsonPrimitive) it.asDouble.toInt() else null }.orEmpty(),
            descobertaAno = desc?.inteiro("ano"),
            descobertaPor = desc?.texto("por"),
            fontes = fontes(o.get("fontes")),
            fontesPorPropriedade = fontesPorPropriedade(o.get("fontesPorPropriedade"))
        )
    }

    // ---- compostos ----------------------------------------------------------------------------------------------

    fun compostos(raiz: JsonElement): List<Composto> =
        listaDeObjetos(raiz, "compostos", "compounds").mapNotNull(::composto)

    fun composto(o: JsonObject): Composto? {
        val cid = o.longo("cid") ?: return null
        val nomeIupac = o.texto("nomeIupac")
        val nome = o.texto("nome") ?: nomeIupac ?: return null
        val propsNum = linkedMapOf<String, Double>()
        val propsTxt = linkedMapOf<String, String>()
        val propsLista = linkedMapOf<String, List<Double>>()
        o.get("propriedades").obj()?.entrySet()?.forEach { (k, v) ->
            if (v.isJsonPrimitive) {
                val p = v.asJsonPrimitive
                if (p.isNumber) propsNum[k] = p.asDouble
                else if (p.isString) p.asString.trim().takeIf { it.isNotEmpty() }?.let { propsTxt[k] = it }
            } else if (v.isJsonArray) {
                // listas de números (pkaValores); outros formatos são ignorados
                val l = v.asJsonArray.mapNotNull { x -> if (x.isJsonPrimitive && x.asJsonPrimitive.isNumber) x.asDouble.takeIf { it.isFinite() } else null }
                if (l.isNotEmpty()) propsLista[k] = l
            }
        }
        val g = o.get("ghs").obj()
        return Composto(
            cid = cid,
            nome = nome,
            nomePopular = o.texto("nomePopular"),
            nomeIupac = nomeIupac,
            nomePtPendente = o.booleano("nomePtPendente") ?: false,
            sinonimos = o.textos("sinonimos"),
            nomes = porIdioma(o.get("nomes")),
            sinonimosPorIdioma = listasPorIdioma(o.get("sinonimosPorIdioma")),
            formula = o.texto("formula"),
            formulaHill = o.texto("formulaHill"),
            massaMolar = o.numero("massaMolar"),
            massaExata = o.numero("massaExata"),
            smiles = o.texto("smiles"),
            inchiKey = o.texto("inchiKey"),
            cas = o.texto("cas"),
            propriedades = propsNum,
            propriedadesTexto = propsTxt,
            propriedadesListas = propsLista,
            fontesPorPropriedade = fontesPorPropriedade(o.get("fontesPorPropriedade")),
            ghs = g?.let { ghs(it) },
            classes = o.textos("classes"),
            wikidata = o.texto("wikidata"),
            icscBuscaUrl = o.texto("icscBuscaUrl")?.takeIf { it.startsWith("https://") },
            definicaoChebi = definicaoChebi(o.get("definicaoChebi")),
            fontes = fontes(o.get("fontes"))
        )
    }

    /** GHS: `frasesH` pode ser lista de códigos ("H302") ou de objetos/textos com o código e a frase em português. */
    private fun ghs(g: JsonObject): Ghs {
        val codigos = mutableListOf<String>()
        val textos = linkedMapOf<String, String>()
        val rx = Regex("""^\s*(H\d{3}[A-Za-z]{0,2})\s*[:\-–]?\s*(.*)$""")
        g.get("frasesH").arr()?.forEach { el ->
            when {
                el.isJsonPrimitive -> rx.matchEntire(el.asString)?.let { m ->
                    codigos += m.groupValues[1]
                    m.groupValues[2].trim().takeIf { it.isNotEmpty() }?.let { t -> textos[m.groupValues[1]] = t }
                }
                el.isJsonObject -> {
                    val c = el.asJsonObject.texto("codigo", "código", "h", "id") ?: return@forEach
                    codigos += c
                    el.asJsonObject.texto("texto", "frase", "descricao")?.let { t -> textos[c] = t }
                }
            }
        }
        g.get("textosH").obj()?.entrySet()?.forEach { (k, v) -> if (v.isJsonPrimitive) textos[k] = v.asString }
        return Ghs(g.textos("pictogramas"), g.texto("palavraSinal"), codigos, textos, g.texto("fonte"))
    }

    private fun definicaoChebi(e: JsonElement?): DefinicaoChebi? {
        if (e == null || e is JsonNull) return null
        if (e.isJsonPrimitive) return e.asString.trim().takeIf { it.isNotEmpty() }?.let { DefinicaoChebi(it) }
        val o = e.obj() ?: return null
        val texto = o.texto("texto", "definicao", "definição", "textoPt") ?: return null
        return DefinicaoChebi(texto, o.texto("id"), o.texto("url")?.takeIf { it.startsWith("https://") }, o.texto("licenca") ?: "CC BY 4.0")
    }

    /**
     * Índice de compostos (compostos/index.json). Formatos aceitos (os mesmos do site):
     *  - lista de objetos, ou objeto com a lista em `compostos`/`itens`: `{cid, lote, nome, nomePopular, nomeIupac, sinonimos, formula, cas, ...}`;
     *  - mapa `cid` → lote em `porCid`/`cid`/`cids`/`lotes`/`mapa` (ou o próprio objeto), com `nomes` como `{cid: [nomes]}` ou `{nome: cid}`,
     *    e mapas paralelos opcionais `formulas` e `cas`.
     */
    fun indiceCompostos(raiz: JsonElement): CompostoIndice {
        class Acc(val cid: Long) {
            var lote: String? = null
            val nomes = LinkedHashSet<String>()
            var formula: String? = null
            var cas: String? = null
            var ptPendente = false
            val chaves = LinkedHashSet<String>()
            val chavesPorIdioma = LinkedHashMap<String, LinkedHashSet<String>>()
        }
        val porCid = LinkedHashMap<Long, Acc>()
        fun acc(cid: Long) = porCid.getOrPut(cid) { Acc(cid) }
        fun limparLote(l: String) = l.removePrefix("compostos/").removeSuffix(".json")

        fun deObjeto(o: JsonObject) {
            val cid = o.longo("cid") ?: return
            val a = acc(cid)
            o.texto("lote", "arquivo", "l")?.let { a.lote = limparLote(it) }
            listOfNotNull(o.texto("nome", "n"), o.texto("nomePopular", "popular"), o.texto("nomeIupac", "iupac")).forEach { a.nomes += it }
            a.nomes += o.textos("nomes")
            a.nomes += o.textos("sinonimos")
            o.texto("formula", "f")?.let { a.formula = it }
            o.texto("cas")?.let { a.cas = it }
            if (o.booleano("nomePtPendente") == true) a.ptPendente = true
        }

        val lista = raiz.arr() ?: raiz.obj()?.let { it.get("compostos").arr() ?: it.get("itens").arr() }
        if (lista != null) {
            lista.forEach { el -> el.obj()?.let(::deObjeto) }
        } else {
            val o = raiz.obj()
            if (o != null) {
                val mapa = listOf("porCid", "cid", "cids", "lotes", "mapa", "indice").firstNotNullOfOrNull { k ->
                    o.get(k).obj()?.takeIf { m -> m.keySet().any { it.toLongOrNull() != null } }
                } ?: o
                mapa.entrySet().forEach { (chave, v) ->
                    val cid = chave.toLongOrNull() ?: return@forEach
                    when {
                        v.isJsonPrimitive -> acc(cid).lote = limparLote(v.asString)
                        v.isJsonObject -> {
                            v.asJsonObject.also { it.addProperty("cid", cid) }.let(::deObjeto)
                        }
                    }
                }
                fun nomesDe(e: JsonElement): List<String> = when {
                    e.isJsonPrimitive -> listOf(e.asString)
                    e.isJsonArray -> e.asJsonArray.mapNotNull { if (it.isJsonPrimitive) it.asString else null }
                    else -> emptyList()
                }
                val nomes = o.get("nomes").obj() ?: o.get("busca").obj()
                nomes?.entrySet()?.forEach { (chave, v) ->
                    val cidDaChave = chave.toLongOrNull()
                    if (cidDaChave != null) {
                        porCid[cidDaChave]?.nomes?.addAll(nomesDe(v))          // { cid: [nomes] }
                    } else if (v.isJsonPrimitive) {
                        v.asString.trim().toLongOrNull()?.let { porCid[it]?.nomes?.add(chave) }   // { nome: cid }
                    }
                }
                o.get("nomes").arr()?.forEach { el ->
                    val par = el.arr()
                    if (par != null) {                                             // formato do pipeline: [ [chave normalizada, cid] ]
                        val (chave, cid) = parDeChave(par) ?: return@forEach
                        porCid[cid]?.chaves?.add(chave)
                        return@forEach
                    }
                    val x = el.obj() ?: return@forEach                             // [ {nome, cid} ]
                    val cid = x.longo("cid") ?: return@forEach
                    x.texto("nome", "n")?.let { porCid[cid]?.nomes?.add(it) }
                }
                // nomes por idioma (I18N §4): só as chaves que não estão em `nomes`; busca no idioma X = nomes ∪ nomesPorIdioma[X]
                o.get("nomesPorIdioma").obj()?.entrySet()?.forEach { (idioma, lista) ->
                    lista.arr()?.forEach { el ->
                        val (chave, cid) = el.arr()?.let(::parDeChave) ?: el.obj()?.let { x -> x.texto("nome", "n")?.let { n -> x.longo("cid")?.let { n to it } } } ?: return@forEach
                        porCid[cid]?.chavesPorIdioma?.getOrPut(idioma) { LinkedHashSet() }?.add(chave)
                    }
                }
                o.get("formulas").obj()?.entrySet()?.forEach { (k, v) -> k.toLongOrNull()?.let { c -> if (v.isJsonPrimitive) porCid[c]?.formula = v.asString } }
                o.get("cas").obj()?.entrySet()?.forEach { (k, v) -> k.toLongOrNull()?.let { c -> if (v.isJsonPrimitive) porCid[c]?.cas = v.asString } }
            }
        }
        return CompostoIndice(porCid.values.mapNotNull { a ->
            a.lote?.let { EntradaIndice(a.cid, it, a.nomes.toList(), a.formula, a.cas, a.ptPendente, a.chaves.toList(), a.chavesPorIdioma.mapValues { (_, v) -> v.toList() }) }
        })
    }

    /** `["aspirina", 2244]` → ("aspirina", 2244). */
    private fun parDeChave(par: JsonArray): Pair<String, Long>? {
        if (par.size() < 2 || !par[0].isJsonPrimitive || !par[1].isJsonPrimitive) return null
        val chave = par[0].asString.trim().takeIf { it.isNotEmpty() } ?: return null
        val cid = runCatching { par[1].asLong }.getOrNull() ?: return null
        return chave to cid
    }

    /** Caminho do lote no pacote: `compostos/<lote>.json` (aceita lote já com pasta e/ou extensão). */
    fun caminhoDoLote(lote: String): String {
        val base = if (lote.contains('/')) lote else "compostos/$lote"
        return if (base.endsWith(".json")) base else "$base.json"
    }

    // ---- constantes -----------------------------------------------------------------------------------------------

    fun constantes(raiz: JsonElement): List<Constante> {
        val lista = listaDeObjetos(raiz, "constantes", "constants")
        return lista.mapNotNull { o ->
            val id = o.texto("id", "simbolo", "nome") ?: return@mapNotNull null
            val valor = o.numero("valor", "value") ?: return@mapNotNull null
            Constante(id, o.texto("nome") ?: id, o.texto("simbolo"), valor, o.texto("unidade"), o.numero("incerteza"), fontes(o.get("fontes")))
        }
    }

    // ---- regras -----------------------------------------------------------------------------------------------------

    fun regras(raiz: JsonElement): Regras {
        val o = raiz.obj() ?: return Regras()
        val props = listaDeObjetos(o, "propriedades").mapNotNull { p ->
            val id = p.texto("id") ?: return@mapNotNull null
            PropriedadeDef(
                id, p.texto("rotulo", "nome") ?: id, p.texto("campo"), p.texto("alvo", "escopo") ?: "", p.texto("tipo") ?: "", p.texto("unidade"), p.textos("sinonimos"),
                rotulos = porIdioma(p.get("rotulos")), sinonimosPorIdioma = listasPorIdioma(p.get("sinonimosPorIdioma")), origem = p.texto("origem"),
                escopos = p.textos("escopos"), origens = p.textos("origens"), escala = p.texto("escala")
            )
        }
        val unidades = unidadesDeRegras(o)
        val prefixos = (o.get("prefixosSi") ?: o.get("prefixos")).arr()?.mapNotNull { it.obj() }.orEmpty().mapNotNull { p ->
            val simbolo = p.texto("simbolo", "prefixo") ?: return@mapNotNull null
            val fator = p.numero("fator") ?: p.numero("expoente")?.let { Math.pow(10.0, it) } ?: return@mapNotNull null
            PrefixoSi(simbolo, p.texto("nome") ?: simbolo, fator)
        }
        val frasesH = o.get("frasesH").obj()?.entrySet()?.mapNotNull { (k, v) -> if (v.isJsonPrimitive) k to v.asString else null }?.toMap().orEmpty()
        return Regras(
            propriedades = props,
            unidades = unidades,
            prefixos = prefixos,
            serieReatividade = serieReatividade(o.get("serieReatividadeMetais") ?: o.get("reatividade")),
            solubilidade = regrasDeSolubilidade(o.get("solubilidade")),
            nomenclatura = achatar(o.get("nomenclatura")),
            frasesH = frasesH,
            solubilidadeBases = solubilidadeBases(o.get("solubilidadeBases")),
            pKwAgua = (o.get("agua").obj()?.numero("pKw") ?: o.numero("pKw"))?.takeIf { it.isFinite() && it > 0 }
        )
    }

    /** Série de reatividade: lista de símbolos ou `{ordem: [...], criterio, potenciais, fonte}` (`regras.serieReatividadeMetais`). */
    private fun serieReatividade(e: JsonElement?): List<String> =
        (e.arr() ?: e.obj()?.get("ordem").arr())?.mapNotNull { if (it.isJsonPrimitive) it.asString else null }.orEmpty()

    /** Regras de solubilidade: `{regras: [{regra, nota?}]}` vira uma linha por regra (com a nota, quando houver); outro formato é achatado. */
    private fun regrasDeSolubilidade(e: JsonElement?): List<String> {
        val lista = e.obj()?.get("regras").arr() ?: e.arr()
        val linhas = lista?.mapNotNull { it.obj() }?.mapNotNull { r ->
            val regra = r.texto("regra", "texto") ?: return@mapNotNull null
            r.texto("nota")?.let { "$regra $it" } ?: regra
        }.orEmpty()
        return linhas.ifEmpty { achatar(e) }
    }

    /** `regras.solubilidadeBases`: lista de `{formula, kps?, solubilidadeMolL?, temperaturaC?, fonte}` ou mapa fórmula → objeto (igual ao site). */
    internal fun solubilidadeBases(e: JsonElement?): List<SolubilidadeBase> {
        val itens: List<Pair<String?, JsonObject>> = when {
            e.arr() != null -> e.arr()!!.mapNotNull { it.obj() }.map { null to it }
            e.obj() != null -> e.obj()!!.entrySet().mapNotNull { (f, v) -> v.obj()?.let { f to it } }
            else -> emptyList()
        }
        return itens.mapNotNull { (chave, o) ->
            val formula = o.texto("formula") ?: chave ?: return@mapNotNull null
            val fonteEl = o.get("fonte")
            val fonte = when {
                fonteEl == null || fonteEl is JsonNull -> null
                fonteEl.isJsonPrimitive -> fonteEl.asString.trim().ifEmpty { null }
                else -> fonteEl.obj()?.texto("nome")
            }
            SolubilidadeBase(
                formula, o.numero("kps", "Kps")?.takeIf { it > 0 }, o.numero("solubilidadeMolL", "solubilidade")?.takeIf { it > 0 },
                o.numero("temperaturaC"), fonte
            )
        }
    }

    /**
     * `regras.unidades` aceita: lista plana de `{grandeza, simbolo, fator, offset, nome, apelidos, prefixavel}`; lista ou mapa de grupos
     * (`grandeza` -> `unidades|itens|fatores|simbolos`) cujos itens são objetos ou `símbolo: fator`.
     */
    private fun unidadesDeRegras(o: JsonObject): List<UnidadeDef> {
        val src = o.get("unidades") ?: o.get("conversaoUnidades") ?: return emptyList()
        val out = mutableListOf<UnidadeDef>()
        fun item(grandeza: String, simboloPadrao: String?, e: JsonElement) {
            if (e.isJsonPrimitive && e.asJsonPrimitive.isNumber) {
                if (simboloPadrao != null && e.asDouble != 0.0) out += UnidadeDef(grandeza, simboloPadrao, null, e.asDouble)
                return
            }
            val u = e.obj() ?: return
            val simbolo = u.texto("simbolo", "unidade", "id") ?: simboloPadrao ?: return
            val fator = u.numero("fator", "paraBase", "fatorParaBase") ?: return
            if (fator == 0.0) return
            out += UnidadeDef(
                grandeza, simbolo, u.texto("nome"), fator, u.numero("offset", "deslocamento") ?: 0.0, u.textos("apelidos", "aliases"),
                u.booleano("prefixavel") == true || u.booleano("prefixos") == true
            )
        }
        fun grupo(grandeza: String, g: JsonObject) {
            val lista = g.get("unidades") ?: g.get("itens") ?: g.get("fatores") ?: g.get("simbolos") ?: return
            when {
                lista.isJsonArray -> lista.asJsonArray.forEach { item(grandeza, null, it) }
                lista.isJsonObject -> lista.asJsonObject.entrySet().forEach { (simbolo, v) -> item(grandeza, simbolo, v) }
            }
        }
        when {
            src.isJsonArray -> src.asJsonArray.forEach { el ->
                val g = el.obj() ?: return@forEach
                val nome = g.texto("grandeza", "id", "nome")
                if (g.has("unidades") || g.has("itens") || g.has("fatores") || g.has("simbolos")) grupo(nome ?: "outra", g)
                else item(nome ?: "outra", null, g)
            }
            src.isJsonObject -> src.asJsonObject.entrySet().forEach { (nome, g) -> g.obj()?.let { grupo(nome, it) } }
        }
        return out
    }

    /** Achata um JSON de regras livres em linhas de texto legíveis. */
    private fun achatar(e: JsonElement?): List<String> {
        if (e == null || e is JsonNull) return emptyList()
        if (e.isJsonPrimitive) return listOf(e.asString)
        if (e.isJsonArray) return e.asJsonArray.flatMap { achatar(it) }
        val o = e.asJsonObject
        return o.entrySet().flatMap { (k, v) ->
            if (v.isJsonPrimitive) listOf("$k: ${v.asString}") else achatar(v)
        }
    }

    /**
     * Arquivo opcional de frases H em português (`ghs_frases.json`, `seguranca/ghs_frases.json` ou `ghs/frases.json`):
     * `{ "H302": "Nocivo se ingerido." }`, com a lista em `frases`, ou lista de `{codigo|id, texto|pt}`.
     */
    fun frasesH(raiz: JsonElement): Map<String, String> {
        val o = raiz.obj()
        if (o?.get("frasesH").obj() != null) return emptyMap()   // formato multilíngue (frasesHPorIdioma); o texto pt-BR do app vem de GhsTextos
        val fonte: JsonElement = o?.get("frases") ?: raiz
        val saida = linkedMapOf<String, String>()
        fonte.obj()?.entrySet()?.forEach { (k, v) ->
            val texto = if (v.isJsonPrimitive) v.asString else v.obj()?.texto("texto", "pt")
            if (!texto.isNullOrBlank()) saida[k.replace(" ", "")] = texto
        }
        fonte.arr()?.forEach { el ->
            val x = el.obj() ?: return@forEach
            val c = x.texto("codigo", "id") ?: return@forEach
            val t = x.texto("texto", "pt") ?: return@forEach
            saida[c.replace(" ", "")] = t
        }
        return saida
    }

    /**
     * `ghs_frases.json` multilíngue (docs/DATA_CONTRACT.md §6): código → idioma → texto. Usa `frasesH[cod].textoPorIdioma` e, como reserva,
     * `todasAsFrasesPorIdioma[cod]`; o `texto` (português) entra como `pt-BR` quando o idioma não vier. Formato antigo = vazio.
     */
    fun frasesHPorIdioma(raiz: JsonElement): Map<String, Map<String, String>> {
        val o = raiz.obj() ?: return emptyMap()
        val saida = linkedMapOf<String, Map<String, String>>()
        o.get("todasAsFrasesPorIdioma").obj()?.entrySet()?.forEach { (cod, v) -> porIdioma(v).takeIf { it.isNotEmpty() }?.let { saida[cod.replace(" ", "")] = it } }
        o.get("frasesH").obj()?.entrySet()?.forEach { (cod, v) ->
            val x = v.obj() ?: return@forEach
            val m = LinkedHashMap(saida[cod.replace(" ", "")].orEmpty())
            m.putAll(porIdioma(x.get("textoPorIdioma")))
            x.texto("texto")?.let { m.putIfAbsent("pt-BR", it) }
            if (m.isNotEmpty()) saida[cod.replace(" ", "")] = m
        }
        return saida
    }

    // ---- trechos ----------------------------------------------------------------------------------------------------

    /** Trechos de um arquivo de textos: lote (lista JSON, formato atual) ou arquivo avulso (um objeto, formato antigo). */
    fun trechos(raiz: JsonElement, caminho: String? = null): List<Trecho> =
        (raiz.arr()?.toList() ?: listOf(raiz)).mapNotNull { trecho(it, caminho) }

    /** `textos/index.json` (docs/DATA_CONTRACT.md §5); null se não for o formato esperado. */
    fun textosIndice(raiz: JsonElement): TextosIndice? {
        val o = raiz.obj() ?: return null
        val lotes = o.get("lotes").arr() ?: return null
        return TextosIndice(
            versao = o.inteiro("versao") ?: 1,
            lotes = lotes.mapNotNull { el ->
                val l = el.obj() ?: return@mapNotNull null
                val caminho = l.texto("caminho") ?: return@mapNotNull null
                LoteTextos(
                    caminho = caminho,
                    fonte = l.texto("fonte") ?: caminho.substringAfter("textos/").substringBefore('/'),
                    idioma = net.saibatudo.quimica.domain.Idiomas.normalizar(l.texto("idioma")) ?: net.saibatudo.quimica.domain.Idiomas.PADRAO,
                    trechos = l.get("trechos").arr()?.mapNotNull { t -> t.obj()?.let { x -> x.texto("id")?.let { TrechoIndice(it, x.texto("titulo"), x.texto("chave")) } } }.orEmpty()
                )
            }
        )
    }

    fun trecho(raiz: JsonElement, caminho: String? = null): Trecho? {
        val o = raiz.obj() ?: return null
        return Trecho(
            id = o.texto("id") ?: return null,
            fonte = o.texto("fonte") ?: "fonte desconhecida",
            licenca = o.texto("licenca") ?: "licença não informada",
            url = o.texto("url"), capitulo = o.texto("capitulo"), secao = o.texto("secao"), titulo = o.texto("titulo"),
            textoOriginal = o.texto("textoOriginal"), textoPt = o.texto("textoPt"), traducao = o.texto("traducao"), tituloPt = o.texto("tituloPt"),
            palavrasChave = o.textos("palavrasChave"),
            idiomaTexto = o.texto("idioma"),
            caminho = caminho
        )
    }
}
