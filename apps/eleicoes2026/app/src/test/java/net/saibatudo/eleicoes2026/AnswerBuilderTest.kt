package net.saibatudo.eleicoes2026

import kotlinx.coroutines.runBlocking
import net.saibatudo.eleicoes2026.ai.answer.AnswerBuilder
import net.saibatudo.eleicoes2026.ai.answer.TipoSegundoTurno
import net.saibatudo.eleicoes2026.ai.answer.leituraSegundoTurno
import net.saibatudo.eleicoes2026.ai.model.Intent
import net.saibatudo.eleicoes2026.ai.model.OrigemResposta
import net.saibatudo.eleicoes2026.ai.nlu.LocalNlu
import net.saibatudo.eleicoes2026.data.live.TseApuracaoParser
import net.saibatudo.eleicoes2026.domain.model.ApuracaoCargo
import net.saibatudo.eleicoes2026.domain.model.ApuracaoProvider
import net.saibatudo.eleicoes2026.domain.model.LinhaApuracao
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnswerBuilderTest {

    private fun responder(
        pergunta: String, hoje: String = "2026-10-01", uf: String? = null, apuracao: ApuracaoProvider? = null
    ) = runBlocking {
        val gaz = TestData.gazetteer
        AnswerBuilder(TestData.dados, gaz, hoje, uf, apuracao, OrigemResposta.LOCAL).construir(LocalNlu.parse(pergunta, gaz))
    }

    @Test
    fun presidenciaveisNaUrnaSaoListadosEPabloMarcalNaoAparece() {
        val r = responder("Quem disputa a Presidência em 2026?")
        val texto = r.directAnswer!!
        assertTrue(texto, texto.contains("13 candidaturas na urna"))
        assertTrue(texto, texto.contains("• 13 — LULA (PT)"))
        assertFalse("candidato com registro indeferido e fora da urna não deve ser listado: $texto", texto.contains("PABLO MARÇAL"))
        assertTrue(texto.contains("fora da urna"))
        assertTrue(r.fonte!!.contains("TSE"))
        assertEquals("PRESIDENTE", r.filters.cargo)
    }

    @Test
    fun perfilMostraSituacaoOficialENuncaFichaLimpaInferida() {
        val r = responder("Quem é Pablo Marçal?")
        val t = r.directAnswer!!
        assertTrue(t, t.contains("Candidatura indeferida"))
        assertTrue(t, t.contains("NÃO está inserida na urna"))
        assertFalse(t.lowercase().contains("ficha limpa sem pend"))
    }

    @Test
    fun pedidoDeRecomendacaoERecusadoComNeutralidade() {
        val r = responder("Em quem devo votar para presidente?")
        assertEquals(Intent.RECOMENDACAO, r.intent)
        assertTrue(r.directAnswer!!.contains("Não indico, recomendo"))
        assertTrue(r.candidateIds.isEmpty())
        assertEquals(OrigemResposta.AVISO, r.origem)
    }

    @Test
    fun resultadosAntesDaEleicaoExplicamQueAVotacaoNaoOcorreu() {
        val r = responder("Quem foi eleito presidente?", hoje = "2026-10-01")
        assertTrue(r.directAnswer!!.contains("ainda não ocorreu"))
    }

    @Test
    fun governadorSemUfResumeOPaisEQuemJaGanhouEhResultado() {
        // 21/10/2026 (paridade com answers.js): "quem já ganhou" era listagem; governador sem UF pedia o estado em vez do resumo do pacote
        val pais = responder("quem já ganhou no 1o turno para governador?", hoje = "2026-10-21", uf = "SP")
        assertEquals(Intent.RESULTADOS, pais.intent)
        assertTrue(pais.directAnswer!!, pais.directAnswer!!.contains("Governador — 1º turno") && pais.directAnswer!!.contains("(SP)"))
        assertTrue(pais.candidateIds.isNotEmpty())
        val semUf = responder("Quem foi eleito governador?", hoje = "2026-10-21")
        assertTrue(semUf.directAnswer!!, semUf.directAnswer!!.contains("Eleitos no 1º turno") && semUf.directAnswer!!.contains("2º turno em"))
        val senado = responder("quais senadores foram eleitos?", hoje = "2026-10-21")
        assertTrue(senado.directAnswer!!, senado.directAnswer!!.contains("Senador — 1º turno"))
        // deputado continua pedindo a UF; com UF padrão e pergunta sem plural, a resposta segue sendo a do estado
        assertTrue(responder("quem foi eleito deputado federal?", hoje = "2026-10-21").directAnswer!!.contains("De qual estado?"))
        assertTrue(responder("Quem foi eleito governador?", hoje = "2026-10-21", uf = "SP").directAnswer!!.contains("São Paulo"))
        val ap2t = ApuracaoProvider { cargo, uf, turno ->
            if (cargo == "PRESIDENTE" && turno == 2) ApuracaoCargo(
                cargo, uf, turno, "25/10/2026 18:10:00", "42,50", false,
                listOf(
                    LinhaApuracao("280002542548", "13", "LULA", "PT", 25100000, "50,40", false),
                    LinhaApuracao("280002551544", "22", "FLAVIO BOLSONARO", "PL", 24700000, "49,60", false)
                )
            ) else null
        }
        val status2t = responder("qual status das votação atual", hoje = "2026-10-25", uf = "SP", apuracao = ap2t)
        assertEquals(Intent.RESULTADOS, status2t.intent)
        assertTrue(status2t.directAnswer!!, status2t.directAnswer!!.contains("Status da votação e apuração — 2º turno"))
        assertTrue(status2t.directAnswer!!, status2t.directAnswer!!.contains("42,50% das seções totalizadas"))
        assertTrue(status2t.directAnswer!!, status2t.directAnswer!!.contains("13 — LULA (PT): 25.100.000 votos (50,40%)"))
        assertTrue(status2t.directAnswer!!, status2t.directAnswer!!.contains("Governador (SP):"))
        assertTrue(status2t.abrirResultados)
    }

    @Test
    fun resultadosAoVivoUsamNumerosDoTseSemAlterar() {
        val ap = ApuracaoProvider { cargo, uf, turno ->
            ApuracaoCargo(
                cargo, uf, turno, "04/10/2026 19:45:10", "50,00", false,
                listOf(
                    LinhaApuracao("280002542548", "13", "LULA", "PT", 1234567, "46,10", false),
                    LinhaApuracao("280002551544", "22", "FLAVIO BOLSONARO", "PL", 1100000, "41,07", false)
                )
            )
        }
        val r = responder("Resultado para presidente", hoje = "2026-10-04", apuracao = ap)
        val t = r.directAnswer!!
        assertTrue(t, t.contains("• 13 — LULA (PT): 1.234.567 votos (46,10%)"))
        assertTrue(t.contains("Apuração em andamento (50,00% das seções totalizadas)"))
        assertTrue(r.abrirResultados)
        assertEquals("280002542548", r.candidateIds.first())
    }

    @Test
    fun deputadoMaisVotadoSemFederalOuEstadualMostraDeputadoFederalComAviso() {
        val pedidos = mutableListOf<String>()
        val ap = ApuracaoProvider { cargo, uf, turno ->
            pedidos += cargo
            ApuracaoCargo(
                cargo, uf, turno, "05/10/2026 02:00:00", "100,00", true,
                listOf(
                    LinhaApuracao(null, "1234", "FULANA MAIS VOTADA", "PX", 900000, "3,50", true),
                    LinhaApuracao(null, "5678", "BELTRANO", "PY", 400000, "1,60", true)
                )
            )
        }
        for (q in listOf("qual o candidato a deputado mais votado", "deputado mais votado", "qual deputado foi o mais votado?")) {
            val r = responder(q, hoje = "2026-10-06", uf = "SP", apuracao = ap)
            val t = r.directAnswer!!
            assertEquals(q, Intent.RESULTADOS, r.intent)
            assertTrue("$q: $t", t.startsWith("Mais votado(a): FULANA MAIS VOTADA (PX), nº 1234 — 900.000 votos (3,50%) — ELEITO."))
            assertTrue(q, t.contains("Você perguntou por \"deputado\": mostrei Deputado Federal em SP."))
            assertFalse(q, t.contains("De qual cargo"))
            assertEquals("DEPUTADO_FEDERAL", r.filters.cargo)
        }
        assertTrue(pedidos.toString(), pedidos.all { it == "DEPUTADO_FEDERAL" })
        // sem estado conhecido pede só a UF; com "estadual" explícito não há aviso
        assertTrue(responder("deputado mais votado", hoje = "2026-10-06", apuracao = ap).directAnswer!!.startsWith("De qual estado?"))
        val est = responder("deputado estadual mais votado em SP", hoje = "2026-10-06", apuracao = ap).directAnswer!!
        assertTrue(est, est.startsWith("Mais votado(a):") && !est.contains("Você perguntou por"))
        assertFalse(responder("Resultado para deputado federal em SP", hoje = "2026-10-06", apuracao = ap).directAnswer!!.startsWith("Mais votado(a):"))
    }

    @Test
    fun calendarioMudaComAFaseEleitoral() {
        assertTrue(responder("Quando é a eleição?", hoje = "2026-10-01").directAnswer!!.contains("daqui a 3 dias"))
        assertTrue(responder("Quando é a eleição?", hoje = "2026-10-04").directAnswer!!.contains("Hoje é o 1º turno"))
        assertTrue(responder("Quando é a eleição?", hoje = "2026-10-10").directAnswer!!.contains("O 1º turno foi em 04/10/2026"))
        assertTrue(responder("Quando é a eleição?", hoje = "2026-11-02").directAnswer!!.contains("As votações ocorreram"))
    }

    @Test
    fun elegibilidadeNaoEmiteCertidaoDeFichaLimpa() {
        val r = responder("O que é ficha limpa?")
        assertTrue(r.directAnswer!!.contains("NÃO emite certidão"))
        assertEquals(true, r.filters.apenasDeferidas)
    }

    @Test
    fun perguntaDesconhecidaFicaNaoResolvidaParaPossivelApoioDaNuvem() {
        val r = responder("asdkjh qwerty")
        assertFalse(r.resolvida)
        assertNotNull(r.suggestedQuestions.firstOrNull())
    }

    @Test
    fun contagemPorCargoEUf() {
        val r = responder("Quantos candidatos a governador em SP?")
        assertTrue(r.directAnswer!!, r.directAnswer!!.contains("sendo"))
        assertEquals("SP", r.filters.estadoUf)
    }

    @Test
    fun meuEstadoValeParaCargosEstaduaisSemUfNaPergunta() {
        val r = responder("Candidatos a governador", uf = "SP")
        assertEquals("SP", r.filters.estadoUf)
        assertTrue(r.directAnswer!!, r.directAnswer!!.contains("Filtrado pelo seu estado (SP)"))
        // cargo nacional não é afetado; UF explícita na pergunta prevalece
        assertFalse(responder("Quem disputa a Presidência?", uf = "SP").directAnswer!!.contains("Filtrado"))
        assertEquals("RJ", responder("Candidatos a governador em RJ", uf = "SP").filters.estadoUf)
        // sem "Meu estado" (uf nula) a pergunta continua nacional
        assertEquals(null, responder("Candidatos a governador").filters.estadoUf)
    }

    @Test
    fun pedidoDeBrasilTodoAfastaOMeuEstado() {
        val r = responder("Candidatos a governador em todo o Brasil", uf = "SP")
        assertEquals(null, r.filters.estadoUf)
        assertFalse(r.directAnswer!!.contains("Filtrado pelo seu estado"))
    }

    // ---- 2º turno com a apuração REAL do TSE (05/10/2026): ninguém passou de 50% e o TSE marca os dois primeiros com "e":"s" ----
    private val apReal = ApuracaoProvider { cargo, uf, turno ->
        if (cargo == "PRESIDENTE" && turno == 1) {
            TseApuracaoParser.parse(javaClass.getResourceAsStream("/tse_apuracao_presidente_1t_final.json")!!.bufferedReader().readText(), cargo, uf, turno)
        } else null
    }

    @Test
    fun regressaoGraveCom47PorCentoOAppNuncaDizEleitoEmPrimeiroTurnoParaPresidente() {
        for (q in listOf("haverá 2a turno para presidente", "haverá 2º turno para presidente?", "vai ter segundo turno para presidente", "tem 2 turno pra presidente?")) {
            val r = responder(q, hoje = "2026-10-06", apuracao = apReal)
            assertEquals(q, Intent.SEGUNDO_TURNO, r.intent)
            val t = r.directAnswer!!
            assertTrue("$q: $t", t.startsWith("Sim, haverá 2º turno para Presidente da República."))
            assertFalse("$q: $t", t.contains("Não haverá 2º turno") || t.contains("foi eleito") || t.contains("a eleição foi liquidada"))
            assertTrue(t, t.contains("1º: FLAVIO BOLSONARO (PL) — 47,03% (56.104.503 votos)"))
            assertTrue(t, t.contains("2º: LULA (PT) — 45,16% (53.879.538 votos)"))
            assertTrue(t, t.contains("25/10/2026"))
        }
    }

    @Test
    fun visaoGeralEResultadosComAApuracaoRealNinguemEleito() {
        val geral = responder("Quem vai pro segundo turno?", hoje = "2026-10-06", apuracao = apReal).directAnswer!!
        assertTrue(geral, geral.contains("Presidente da República: Sim, haverá 2º turno entre FLAVIO BOLSONARO (47,03%) e LULA (45,16%)"))
        assertFalse(geral, geral.contains("Presidente da República: Não haverá"))
        val res = responder("Resultado para presidente", hoje = "2026-10-06", apuracao = apReal).directAnswer!!
        assertTrue(res, res.contains("47,03%) — 2º TURNO"))
        assertTrue(res, res.contains("45,16%) — 2º TURNO"))
        assertFalse(res, res.contains("— ELEITO"))
    }

    @Test
    fun leituraSegundoTurnoNuncaEleitoAbaixoDe50ComDoisMarcados() {
        fun l(nome: String, votos: Long, pct: String, eleito: Boolean = false, segundo: Boolean = false) =
            LinhaApuracao(null, "0", nome, "P", votos, pct, eleito, null, segundo)
        fun ap(vararg linhas: LinhaApuracao, fim: Boolean = true, pst: String = "100,00") =
            ApuracaoCargo("PRESIDENTE", "BR", 1, "05/10/2026 12:00:00", pst, fim, linhas.toList())
        // formato defensivo: dois "eleitos" sem a situação e o primeiro com menos de 50%
        assertEquals(TipoSegundoTurno.SEGUNDO, leituraSegundoTurno(ap(l("A", 47, "47,03", eleito = true), l("B", 45, "45,16", eleito = true))).tipo)
        assertEquals(TipoSegundoTurno.SEGUNDO, leituraSegundoTurno(ap(l("A", 47, "47,03", segundo = true), l("B", 45, "45,16", segundo = true), l("C", 8, "7,81"))).tipo)
        val eleito = leituraSegundoTurno(ap(l("A", 62, "62,65", eleito = true), l("B", 36, "36,42")))
        assertEquals(TipoSegundoTurno.ELEITO, eleito.tipo)
        assertTrue(eleito.maioria)
        assertEquals(TipoSegundoTurno.SEGUNDO, leituraSegundoTurno(ap(l("A", 49, "49,99"), l("B", 34, "34,51"))).tipo)
        assertEquals(TipoSegundoTurno.ANDAMENTO, leituraSegundoTurno(ap(l("A", 49, "49,99"), l("B", 34, "34,51"), fim = false, pst = "60,00")).tipo)
        assertEquals(TipoSegundoTurno.INDEFINIDO, leituraSegundoTurno(ap()).tipo)
    }

    @Test
    fun semApuracaoAoVivoDepoisDoPrimeiroTurnoUsaOPacoteENaoFalaComoSeAVotacaoNaoTivesseOcorrido() {
        val off = ApuracaoProvider { _, _, _ -> null }
        val pres = responder("haverá 2º turno para presidente?", hoje = "2026-10-06", apuracao = off).directAnswer!!
        assertFalse(pres, pres.contains("depende da apuração do 1º turno"))
        assertFalse(pres, pres.contains("Não haverá 2º turno"))
        if (TestData.dados.manifest.resultadosDisponiveis == true) {
            val ac = responder("vai ter segundo turno para governador do acre?", hoje = "2026-10-06", apuracao = off).directAnswer!!
            assertTrue(ac, ac.startsWith("Sim, haverá 2º turno para Governador no Acre."))
            assertTrue(ac, ac.contains("segundo a totalização oficial do TSE"))
            val sp = responder("tem 2ª turno pra governador em sp?", hoje = "2026-10-06", apuracao = off).directAnswer!!
            assertTrue(sp, sp.startsWith("Não haverá 2º turno para Governador em São Paulo."))
        }
    }

    // ------------------------------------------------------------------ pós-eleição (26/10/2026): o 2º turno já ocorreu (paridade com answers.test.mjs)
    private val POS = "2026-10-26"
    private fun linhaLula(eleito: Boolean = true) = LinhaApuracao("280002542548", "13", "LULA", "PT", 60_345_678L, "51,79", eleito, null, false)
    private fun linhaFlavio() = LinhaApuracao("280002551544", "22", "FLAVIO BOLSONARO", "PL", 56_123_456L, "48,21", false, null, false)
    /** Apuração ao vivo do 2º turno (totalização final) só para Presidente; nada para os demais. */
    private val ap2tFinal = ApuracaoProvider { cargo, uf, turno ->
        if (cargo == "PRESIDENTE" && turno == 2) ApuracaoCargo(cargo, uf, turno, "25/10/2026 23:27:10", "100,00", true, listOf(linhaLula(), linhaFlavio())) else null
    }
    private val semAoVivo = ApuracaoProvider { _, _, _ -> null }
    private fun noFuturo(t: String) = Regex("""haver[aá] 2º turno|Votação do 2º turno|disputam o 2º turno|no dia: leve""", RegexOption.IGNORE_CASE).containsMatchIn(t)

    @Test
    fun posEleicaoSegundoTurnoParaPresidenteFalaNoPassadoComOEleitoDoTurno2() {
        val r = responder("Segundo turno para presidente", hoje = POS, apuracao = ap2tFinal)
        assertEquals(Intent.SEGUNDO_TURNO, r.intent)
        val t = r.directAnswer!!
        assertTrue(t, t.startsWith("Houve 2º turno para Presidente da República em 25/10/2026"))
        assertTrue(t, t.contains("LULA (PT)") && t.contains("51,79%") && t.contains("ELEITO") && t.contains("Totalização final"))
        assertFalse(t, noFuturo(t))
        assertEquals(listOf("280002542548", "280002551544"), r.candidateIds)
    }

    @Test
    fun posEleicaoSemApuracaoAoVivoSegundoTurnoNoPassadoNuncaHavera() {
        for ((q, inicio) in listOf(
            "Segundo turno para presidente" to "Houve 2º turno para Presidente da República em 25/10/2026",
            "vai ter segundo turno para governador no ES?" to "Houve 2º turno para Governador no Espírito Santo em 25/10/2026"
        )) {
            val r = responder(q, hoje = POS, apuracao = semAoVivo)
            assertEquals(q, Intent.SEGUNDO_TURNO, r.intent)
            val t = r.directAnswer!!
            assertTrue("$q: $t", t.startsWith(inicio))
            assertTrue(t, t.contains("resultados.tse.jus.br"))
            assertFalse(t, noFuturo(t))
        }
        val geral = responder("Quem vai pro segundo turno?", hoje = POS, uf = "ES", apuracao = semAoVivo).directAnswer!!
        assertTrue(geral, geral.contains("O 2º turno, onde houve, foi em 25/10/2026"))
        assertTrue(geral, geral.contains("Presidente da República: Houve 2º turno entre"))
        assertTrue(geral, geral.contains("Governador (ES): Houve 2º turno entre"))
        assertFalse(geral, noFuturo(geral))
        val sp = responder("tem 2º turno pra governador em sp?", hoje = POS, apuracao = semAoVivo).directAnswer!!
        assertTrue(sp, sp.startsWith("Não houve 2º turno para Governador em São Paulo."))
    }

    @Test
    fun posEleicaoQuemFoiEleitoPresidenteSemAoVivoNaoDizQueDisputam() {
        val r = responder("Quem foi eleito presidente?", hoje = POS, apuracao = semAoVivo)
        assertEquals(Intent.RESULTADOS, r.intent)
        val t = r.directAnswer!!
        assertTrue(t, t.contains("O 2º turno para Presidente da República ocorreu em 25/10/2026"))
        assertTrue(t, t.contains("resultados.tse.jus.br"))
        assertFalse(t, noFuturo(t))
        val pan = responder("como está a apuração?", hoje = POS, uf = "ES", apuracao = semAoVivo).directAnswer!!
        assertFalse(pan, noFuturo(pan))
        assertTrue(pan, pan.contains("2º turno em 25/10/2026 entre"))
    }

    @Test
    fun posEleicaoResultadoPorCandidato() {
        for (q in listOf("Lula foi eleito?", "quantos votos o lula teve no segundo turno?", "o lula ganhou?")) {
            val r = responder(q, hoje = POS, apuracao = ap2tFinal)
            assertEquals(q, Intent.RESULTADOS, r.intent)
            val t = r.directAnswer!!
            assertTrue("$q: $t", t.startsWith("LULA (PT, nº 13) — Presidente da República, 2º turno"))
            assertTrue(t, t.contains("60.345.678 votos (51,79%) — ELEITO") && t.contains("Totalização final"))
            assertEquals(q, listOf("280002542548"), r.candidateIds)
            assertTrue(r.fonte!!, r.fonte!!.contains("ao vivo"))
        }
        val off = responder("Lula foi eleito?", hoje = POS, apuracao = semAoVivo).directAnswer!!
        assertTrue(off, off.startsWith("LULA (PT, nº 13) — Presidente da República"))
        assertTrue(off, off.contains("1º turno") && off.contains("resultados.tse.jus.br"))
        assertFalse(off, noFuturo(off))
        val tarc = responder("Tarcísio foi eleito?", hoje = POS, apuracao = semAoVivo).directAnswer!!
        assertTrue(tarc, tarc.startsWith("TARCÍSIO (REPUBLICANOS, nº 10) — Governador em São Paulo, 1º turno"))
        assertTrue(tarc, tarc.contains("— ELEITO"))
    }

    @Test
    fun posEleicaoAbstencaoEEleicaoAcabouSaoResultados() {
        val abs = responder("Qual foi a abstenção no segundo turno?", hoje = POS, apuracao = ap2tFinal)
        assertEquals(Intent.RESULTADOS, abs.intent)
        assertTrue(abs.directAnswer!!, abs.directAnswer!!.startsWith("Abstenção, comparecimento e votos brancos e nulos: o app não traz esses totais; consulte https://resultados.tse.jus.br/"))
        val fim = responder("A eleição acabou?", hoje = POS, apuracao = ap2tFinal)
        assertEquals(Intent.RESULTADOS, fim.intent)
        assertTrue(fim.directAnswer!!, fim.directAnswer!!.contains("Status dos resultados das Eleições 2026"))
    }

    @Test
    fun posEleicaoLocalDeVotacaoViraTituloJustificativaEMulta() {
        for (q in listOf("Onde voto?", "Não votei, como justifico?", "Qual o prazo para justificar?")) {
            val r = responder(q, hoje = POS)
            assertEquals(q, Intent.LOCAL_VOTACAO, r.intent)
            val t = r.directAnswer!!
            assertTrue("$q: $t", t.startsWith("Título de eleitor e justificativa depois das Eleições 2026 (sistemas oficiais):"))
            assertTrue(t, t.contains("03/12/2026") && t.contains("08/01/2027") && t.contains("multa"))
            assertFalse(t, Regex("""No dia: leve|pode votar no 2º|vota-se no mesmo local""").containsMatchIn(t))
        }
        assertTrue(responder("Onde voto?", hoje = "2026-10-20").directAnswer!!.contains("No dia: leve documento"))
    }

    @Test
    fun calendarioTrazPrazosPosEleitoraisComFonteOficial() {
        val t = responder("Quando é a eleição?", hoje = POS).directAnswer!!
        assertTrue(t, t.contains("Prestação de contas final: até 03/11/2026 (1º turno) e 14/11/2026 (2º turno) — Lei 9.504/1997, art. 29"))
        assertTrue(t, t.contains("Diplomação dos eleitos: até 18/12/2026 (Res. TSE 23.760/2026)"))
        assertTrue(t, t.contains("Posse: Presidente em 05/01/2027; Governadores em 06/01/2027 (EC 111/2021); Deputados e Senadores em 1º/02/2027"))
    }
}
