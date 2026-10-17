# -*- coding: utf-8 -*-
"""Propriedades físicas medidas do Wikidata (coleta_propriedades) e 1ª energia de ionização dos elementos (coleta_elementos):
linhas SPARQL sintéticas no formato que a consulta devolve, sem rede."""
import functools
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import coleta_elementos as CE  # noqa: E402
import coleta_propriedades as CP  # noqa: E402

E = "http://www.wikidata.org/entity/"
HOJE = "2026-10-16"
N = "http://wikiba.se/ontology#NormalRank"
PREF = "http://wikiba.se/ontology#PreferredRank"
CRC = "P248=Q22236188~Basic Laboratory and Industrial Chemicals: A CRC Quick Reference Handbook"


def linha(prop, amt, unit, st, temps="", press="", quals="", refs=CRC, rank=N, item="Q1"):
    return {"item": E + item, "prop": prop, "st": f"http://www.wikidata.org/entity/statement/{item}-{st}", "rank": rank, "amt": str(amt),
            "unit": E + unit if unit else None, "temps": temps, "press": press, "quals": quals, "refs": refs}


def decs(*linhas):
    return [CP.declaracao(l) for l in linhas]


def com_referencia_fraca(teste):
    """Liga `ENTALPIA_ACEITA_REFERENCIA_FRACA` (desligada por padrão) só durante o teste."""
    @functools.wraps(teste)
    def interno(*a, **k):
        antes = CP.ENTALPIA_ACEITA_REFERENCIA_FRACA
        CP.ENTALPIA_ACEITA_REFERENCIA_FRACA = True
        try:
            return teste(*a, **k)
        finally:
            CP.ENTALPIA_ACEITA_REFERENCIA_FRACA = antes
    return interno


class EscolhaTest(unittest.TestCase):
    def test_conversoes_e_origem_por_valor(self):
        props, fontes, _ = CP.escolher(decs(
            linha("P2101", "-114.1", "Q25267", "a"),
            linha("P2102", "173", "Q42289", "b", press="760@Q185648"),
            linha("P2054", "0.789", "Q13147228", "c", temps="20@Q25267"),
        ), HOJE)
        self.assertEqual(props["pontoFusaoK"], 159.05)
        self.assertEqual(props["pontoEbulicaoK"], 351.48)
        self.assertEqual(props["densidadeKgm3"], 789)
        self.assertEqual(props["estadoPadrao"], "liquido")
        f = fontes["pontoFusaoK"]
        self.assertEqual((f["nome"], f["licenca"], f["acessadoEm"]), ("Wikidata", "CC0", HOJE))
        self.assertEqual(f["url"], "https://www.wikidata.org/wiki/Q1#P2101")
        self.assertEqual(f["declaracao"], "Q1$a")
        self.assertIn("CRC", f["referencia"])
        self.assertEqual((f["valorOriginal"], f["unidadeOriginal"]), (-114.1, "°C"))
        self.assertEqual(fontes["pontoEbulicaoK"]["condicoes"], {"pressaoPa": 101325})
        self.assertEqual(fontes["densidadeKgm3"]["condicoes"], {"temperaturaK": 293.15})

    def test_sem_referencia_fica_fora_salvo_corroborada(self):
        props, _, _ = CP.escolher(decs(linha("P2177", "0.003", "Q834105", "a", temps="20@Q25267", quals="P2178=Q283", refs="")), HOJE)
        self.assertNotIn("solubilidadeAguaGL", props)  # aspirina: um valor sem referência
        props, fontes, _ = CP.escolher(decs(linha("P2101", "0", "Q25267", "a", refs=""),
                                            linha("P2101", "0.002519", "Q25267", "b", refs="P143=Q328~English Wikipedia")), HOJE)
        self.assertEqual(props["pontoFusaoK"], 273.15)  # água: duas declarações concordam
        self.assertTrue(fontes["pontoFusaoK"]["semReferencia"])
        self.assertEqual(fontes["pontoFusaoK"]["corroboradoPor"], 2)

    def test_exclusoes(self):
        props, _, _ = CP.escolher(decs(
            linha("P2102", "50", "Q25267", "a", press="10@Q185648"),                 # outra pressão
            linha("P2101", "100", "Q25267", "b", quals="P1480=Q5727902"),           # circa
            linha("P2054", "1.2", "Q13147228", "c", quals="P459=Q1048589"),        # DFT
            linha("P2177", "10", "Q834105", "d", quals="P2178=Q153"),             # em etanol
            linha("P2177", "360", "Q21061369", "e", quals="P2178=Q283"),          # g/kg sem "de solvente": ambíguo
            linha("P2101", "5", "Q25267", "f", quals="P5102=Q106410"),           # ponto triplo
        ), HOJE)
        self.assertEqual(props, {})

    def test_solubilidade_por_100g_e_temperatura_mais_proxima(self):
        props, fontes, alt = CP.escolher(decs(
            linha("P2177", "35.7", "Q21127659", "a", temps="0@Q25267", quals="P2178=Q283"),
            linha("P2177", "36.0", "Q21127659", "b", temps="25@Q25267", quals="P2178=Q283"),
        ), HOJE)
        self.assertEqual(props["solubilidadeAguaG100g"], 36)
        self.assertEqual(fontes["solubilidadeAguaG100g"]["condicoes"]["temperaturaK"], 298.15)
        self.assertEqual(alt["solubilidadeAguaG100g"][0]["valor"], 35.7)  # a outra fica fora do pacote

    def test_divergencia_empatada_nao_publica(self):
        props, _, alt = CP.escolher(decs(linha("P2102", "2", "Q25267", "a", press="1@Q177974"),
                                         linha("P2102", "76.1", "Q25267", "b")), HOJE)
        self.assertNotIn("pontoEbulicaoK", props)
        self.assertEqual(len(alt["pontoEbulicaoK"]), 2)
        props, _, _ = CP.escolher(decs(linha("P2102", "2", "Q25267", "a", press="1@Q177974"),
                                       linha("P2102", "76.1", "Q25267", "b"), linha("P2102", "76.0", "Q42289", "c")), HOJE)
        self.assertNotIn("pontoEbulicaoK", props)  # 76,0 °F = 297,6 K diverge das duas
        props, _, _ = CP.escolher(decs(linha("P2102", "2", "Q25267", "a", press="1@Q177974"),
                                       linha("P2102", "76.1", "Q25267", "b"), linha("P2102", "76.0", "Q25267", "c")), HOJE)
        self.assertAlmostEqual(props["pontoEbulicaoK"], 349.2, delta=0.1)  # o grupo maior vence

    def test_densidade_de_outra_fase_e_incoerente(self):
        props, _, _ = CP.escolher(decs(linha("P2101", "-259.16", "Q25267", "a"), linha("P2102", "-252.88", "Q25267", "b"),
                                       linha("P2054", "70.8", "Q844211", "c", quals="P515=Q11435")), HOJE)
        self.assertEqual(props["estadoPadrao"], "gas")
        self.assertNotIn("densidadeKgm3", props)  # densidade do hidrogênio líquido
        props, _, _ = CP.escolher(decs(linha("P2101", "560", "Q25267", "a"), linha("P2054", "2.09", "Q844211", "c")), HOJE)
        self.assertNotIn("densidadeKgm3", props)  # sólido com 2,09 kg/m³: unidade trocada

    def test_pka(self):
        props, fontes, _ = CP.escolher(decs(linha("P1117", "2.15", "Q199", "a", temps="25@Q25267"),
                                            linha("P1117", "2.12", "Q199", "b"), linha("P1117", "7.2", "Q199", "c"),
                                            linha("P1117", "12.35", "Q199", "d")), HOJE)
        self.assertEqual(props["pka"], 2.15)
        self.assertEqual(props["pkaValores"], [2.15, 7.2, 12.35])
        self.assertEqual(len(fontes["pkaValores"]), 3)
        props, _, _ = CP.escolher(decs(linha("P1117", "1.92", "Q199", "a")), HOJE, acido_forte=True)
        self.assertNotIn("pka", props)

    def test_entalpia_formacao_kjmol_direto(self):
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)
        f = fontes["entalpiaFormacaoKJmol"]
        self.assertEqual((f["nome"], f["licenca"], f["acessadoEm"]), ("Wikidata", "CC0", HOJE))
        self.assertEqual(f["url"], "https://www.wikidata.org/wiki/Q1#P3078")
        self.assertEqual(f["declaracao"], "Q1$a")
        self.assertIn("CRC", f["referencia"])
        self.assertEqual((f["valorOriginal"], f["unidadeOriginal"]), (-74.52, "kJ/mol"))
        self.assertNotIn("condicoes", f)  # sem fase declarada, sem temperatura
        self.assertIn("P3078", CP.PROPS)
        self.assertIn("p:P3078", CP.CONSULTA)
        self.assertIn("entalpiaFormacaoKJmol", CP.CAMPOS)

    def test_entalpia_formacao_converte_j_e_kcal(self):
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-285830", "Q13035094", "a")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)
        self.assertEqual((fontes["entalpiaFormacaoKJmol"]["valorOriginal"], fontes["entalpiaFormacaoKJmol"]["unidadeOriginal"]),
                         (-285830, "J/mol"))
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-57.8", "Q6408112", "a")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -241.84)  # 57,8 kcal/mol termoquímica x 4,184
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["unidadeOriginal"], "kcal/mol")
        props, _, _ = CP.escolher(decs(linha("P3078", "0", "Q752197", "a")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], 0)  # elemento no estado padrão

    def test_entalpia_formacao_unidade_ou_referencia_inferida_fica_fora(self):
        props, _, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs="P3452=Q1")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)  # "inferido de" nunca entra, nem como fraca
        props, _, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs="P887=Q1")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)  # "baseado em heurística" idem
        stats = {}
        props, _, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q11574", "a"), linha("P3078", "-74.52", "Q11574", "b")), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)  # unidade desconhecida (segundo)
        self.assertEqual(stats["descartadas"]["unidade desconhecida"], 2)

    @com_referencia_fraca
    def test_entalpia_formacao_referencia_fraca_aceita(self):
        # só "importado de" a Wikipédia: entra, marcada como referência fraca (e sem `referencia`)
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs="P143=Q328~English Wikipedia")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)
        f = fontes["entalpiaFormacaoKJmol"]
        self.assertTrue(f["referenciaFraca"])
        self.assertNotIn("referencia", f)
        self.assertNotIn("semReferencia", f)
        self.assertEqual(f["importadoDe"], "English Wikipedia (Q328)")
        self.assertEqual((f["nome"], f["licenca"], f["declaracao"]), ("Wikidata", "CC0", "Q1$a"))
        # P4656 (URL da Wikipédia) também
        _, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a",
                                               refs="P4656=https://en.wikipedia.org/wiki/Methane|P143=Q328~English Wikipedia")), HOJE)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["importadoDe"], "https://en.wikipedia.org/wiki/Methane; English Wikipedia (Q328)")
        # nenhuma referência: entra igual, e também com `semReferencia` (os clientes atuais já avisam)
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs="")), HOJE)
        f = fontes["entalpiaFormacaoKJmol"]
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)
        self.assertTrue(f["referenciaFraca"] and f["semReferencia"])
        self.assertNotIn("importadoDe", f)
        # as outras propriedades continuam exigindo referência
        props, _, _ = CP.escolher(decs(linha("P2101", "0", "Q25267", "a", refs="P143=Q328~English Wikipedia")), HOJE)
        self.assertNotIn("pontoFusaoK", props)
        # os demais filtros valem também para a fraca: magnitude e temperatura
        props, _, _ = CP.escolher(decs(linha("P3078", "-285830", "Q752197", "a", refs=""),
                                       linha("P3078", "-100", "Q752197", "b", refs="", temps="1000@Q11579")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)

    @com_referencia_fraca
    def test_entalpia_formacao_referencia_fraca_preterida_pela_forte(self):
        agua = [linha("P2101", "0", "Q25267", "f"), linha("P2102", "100", "Q25267", "g")]
        fraca = "P143=Q328~English Wikipedia"
        props, fontes, alt = CP.escolher(decs(
            linha("P3078", "-285.5", "Q752197", "a", refs=fraca, quals="P515=Q11435"),   # fraca, líquido
            linha("P3078", "-285.83", "Q752197", "b", quals="P515=Q11435"),              # forte, líquido
            *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)  # a forte vence
        f = fontes["entalpiaFormacaoKJmol"]
        self.assertEqual(f["declaracao"], "Q1$b")
        self.assertNotIn("referenciaFraca", f)
        self.assertIn("CRC", f["referencia"])
        self.assertEqual(alt["entalpiaFormacaoKJmol"], [{"valor": -285.5, "declaracao": "Q1$a", "temReferencia": False, "fase": "liquido",
                                                         "referenciaFraca": True}])
        # a forte vence mesmo se a fraca for "preferida" e discordar muito (nem entra na comparação)
        props, fontes, _ = CP.escolher(decs(
            linha("P3078", "-100", "Q752197", "a", refs="", rank=PREF), linha("P3078", "-285.83", "Q752197", "b", quals="P515=Q11435"),
            *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)
        self.assertNotIn("referenciaFraca", fontes["entalpiaFormacaoKJmol"])
        # a forte é de OUTRA fase (gás): sai pela fase, e a fraca do líquido passa a ser a única candidata
        props, fontes, alt = CP.escolher(decs(
            linha("P3078", "-241.82", "Q752197", "a", quals="P515=Q11432"),
            linha("P3078", "-285.8", "Q752197", "b", refs=fraca, quals="P515=Q11435"), *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.8)
        self.assertTrue(fontes["entalpiaFormacaoKJmol"]["referenciaFraca"])
        self.assertEqual(alt["entalpiaFormacaoKJmol"], [{"valor": -241.82, "declaracao": "Q1$a", "temReferencia": True, "fase": "gas"}])
        # a fraca de outra fase também fica fora
        props, _, alt = CP.escolher(decs(linha("P3078", "-241.82", "Q752197", "a", refs="", quals="P515=Q11432"), *agua), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertEqual(alt["entalpiaFormacaoKJmol"][0]["referenciaFraca"], True)

    @com_referencia_fraca
    def test_entalpia_formacao_referencia_fraca_discordante_nao_publica(self):
        agua = [linha("P2101", "0", "Q25267", "f"), linha("P2102", "100", "Q25267", "g")]
        fraca = "P143=Q328~English Wikipedia"
        # duas fracas da mesma fase que discordam (> 5 %): nada é publicado, nem por maioria (3 contra 1 também não)
        stats = {}
        props, _, alt = CP.escolher(decs(linha("P3078", "-285.8", "Q752197", "a", refs=fraca), linha("P3078", "-250", "Q752197", "b", refs=fraca),
                                         *agua), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertEqual(len(alt["entalpiaFormacaoKJmol"]), 2)
        self.assertEqual(stats["divergentesPorCampo"], {"entalpiaFormacaoKJmol": 1})
        props, _, _ = CP.escolher(decs(linha("P3078", "-285.8", "Q752197", "a", refs=fraca), linha("P3078", "-285.5", "Q752197", "b", refs=fraca),
                                       linha("P3078", "-286.0", "Q752197", "c", refs=fraca), linha("P3078", "-250", "Q752197", "d", refs=fraca),
                                       *agua), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        # as que concordam (< 5 %) entram
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-285.8", "Q752197", "a", refs=fraca), linha("P3078", "-285.5", "Q752197", "b", refs=fraca),
                                            *agua), HOJE)
        self.assertAlmostEqual(props["entalpiaFormacaoKJmol"], -285.8, delta=0.5)
        self.assertTrue(fontes["entalpiaFormacaoKJmol"]["referenciaFraca"])
        # estado desconhecido: forte em uma fase e fraca em outra discordando = nada (a fraca não é ignorada nem vence)
        props, _, _ = CP.escolher(decs(linha("P3078", "-241.8", "Q752197", "a", quals="P515=Q11432"),
                                       linha("P3078", "-285.8", "Q752197", "b", refs=fraca, quals="P515=Q11435")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        # estado desconhecido, forte e fraca na MESMA fase: a forte vence
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-241.8", "Q752197", "a", quals="P515=Q11432"),
                                            linha("P3078", "-200", "Q752197", "b", refs=fraca, quals="P515=Q11432")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -241.8)
        self.assertNotIn("referenciaFraca", fontes["entalpiaFormacaoKJmol"])

    def test_entalpia_formacao_fase_desconhecida_ou_nao_reconhecida(self):
        agua = [linha("P2101", "0", "Q25267", "f"), linha("P2102", "100", "Q25267", "g")]
        genid = "P515=http://www.wikidata.org/.well-known/genid/a6a3f82487ac46500b4874a73912a960"
        # "valor desconhecido" (nó anônimo) = fase não informada: o valor entra sem `fase` (nada de URL em condicoes.fase)
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-285.83", "Q752197", "a", quals=genid), *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)
        self.assertNotIn("condicoes", fontes["entalpiaFormacaoKJmol"])
        # outro item de fase (solução aquosa, supercrítico...) ou fases em conflito: não é a entalpia do estado padrão
        stats = {}
        props, _, _ = CP.escolher(decs(linha("P3078", "-285.83", "Q752197", "a", quals="P515=Q11588"),
                                       linha("P3078", "-285.83", "Q752197", "b", quals="P515=Q11435|P515=Q11432")), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertEqual(stats["descartadas"]["fase de matéria não reconhecida ou ambígua"], 2)

    def test_entalpia_formacao_referencia_fraca_vem_desligada(self):
        # padrão (17/10/2026): CO2 +394 e NaCl -234,8 vinham de importações da Wikipédia; só referência forte (ou corroboração) entra
        self.assertIs(CP.ENTALPIA_ACEITA_REFERENCIA_FRACA, False)
        fraca = "P143=Q328~English Wikipedia"
        stats = {}
        props, _, _ = CP.escolher(decs(linha("P3078", "394", "Q752197", "a", refs="P143=Q206855~Russian Wikipedia")), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertEqual(stats["descartadas"]["sem referência"], 1)
        props, _, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs="")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        # duas declarações sem referência forte que concordam continuam valendo como nas demais propriedades (corroboração)
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", refs=fraca),
                                            linha("P3078", "-74.6", "Q752197", "b", refs="")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)
        f = fontes["entalpiaFormacaoKJmol"]
        self.assertTrue(f["semReferencia"])
        self.assertEqual(f["corroboradoPor"], 2)
        self.assertNotIn("referenciaFraca", f)
        # a forte entra normalmente
        props, _, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)

    def test_entalpia_formacao_condicoes_e_faixa(self):
        props, _, _ = CP.escolher(decs(
            linha("P3078", "-100", "Q752197", "a", temps="1000@Q11579"),                 # a 1000 K: não é a de formação padrão
            linha("P3078", "-101", "Q752197", "b", press="1@Q177974"),                  # 1 atm: ok
            linha("P3078", "-285830", "Q752197", "c"),                                   # J/mol gravado como kJ/mol
        ), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -101)
        props, _, _ = CP.escolher(decs(linha("P3078", "-100", "Q752197", "a", press="10@Q185648")), HOJE)
        self.assertNotIn("entalpiaFormacaoKJmol", props)  # outra pressão
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-100", "Q752197", "a", temps="25@Q25267")), HOJE)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["condicoes"], {"temperaturaK": 298.15})

    def test_entalpia_formacao_prefere_a_fase_do_estado_padrao(self):
        agua = [linha("P2101", "0", "Q25267", "f"), linha("P2102", "100", "Q25267", "g")]
        props, fontes, alt = CP.escolher(decs(
            linha("P3078", "-241818", "Q13035094", "a", quals="P515=Q11432"),       # gás
            linha("P3078", "-285830", "Q13035094", "b", quals="P515=Q11435"),       # líquido
            *agua), HOJE)
        self.assertEqual(props["estadoPadrao"], "liquido")
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["condicoes"], {"fase": "liquido"})
        self.assertEqual(alt["entalpiaFormacaoKJmol"], [{"valor": -241.82, "declaracao": "Q1$a", "temReferencia": True, "fase": "gas"}])
        # só a de outra fase: não entra (ΔHf° do vapor de água não é a do líquido)
        stats = {}
        props, fontes, alt = CP.escolher(decs(linha("P3078", "-241818", "Q13035094", "a", quals="P515=Q11432"), *agua), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertNotIn("entalpiaFormacaoKJmol", fontes)
        self.assertEqual(alt["entalpiaFormacaoKJmol"][0]["fase"], "gas")
        self.assertEqual(stats["descartadas"]["entalpia de outra fase"], 1)
        # sem fase declarada continua valendo; a da mesma fase vence a sem fase (mesmo rank), mesmo com valores concordando
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-285.5", "Q752197", "a"),
                                            linha("P3078", "-285.83", "Q752197", "b", quals="P515=Q11435"), *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.83)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["declaracao"], "Q1$b")
        props, _, _ = CP.escolher(decs(linha("P3078", "-285.5", "Q752197", "a"), *agua), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -285.5)
        # sólido (fusão acima de 298,15 K): vale a fase sólida
        props, fontes, _ = CP.escolher(decs(
            linha("P3078", "-411.15", "Q752197", "a", quals="P515=Q11438"), linha("P3078", "-181.4", "Q752197", "b", quals="P515=Q11432"),
            linha("P2101", "801", "Q25267", "c")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -411.15)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["condicoes"]["fase"], "solido")

    def test_entalpia_formacao_estado_desconhecido_nao_chuta_a_fase(self):
        # sem fusão/ebulição não há estado padrão: fases que discordam (> 5 %) empatam e nada é publicado
        stats = {}
        props, _, alt = CP.escolher(decs(linha("P3078", "-241.8", "Q752197", "a", quals="P515=Q11432"),
                                         linha("P3078", "-285.8", "Q752197", "b", quals="P515=Q11435")), HOJE, stats)
        self.assertNotIn("entalpiaFormacaoKJmol", props)
        self.assertEqual(len(alt["entalpiaFormacaoKJmol"]), 2)
        self.assertEqual(stats["divergentesPorCampo"], {"entalpiaFormacaoKJmol": 1})
        # uma única declaração com fase e estado desconhecido: entra, com a fase nas condições
        props, fontes, _ = CP.escolher(decs(linha("P3078", "-74.52", "Q752197", "a", quals="P515=Q11432")), HOJE)
        self.assertEqual(props["entalpiaFormacaoKJmol"], -74.52)
        self.assertEqual(fontes["entalpiaFormacaoKJmol"]["condicoes"]["fase"], "gas")
        self.assertNotIn("estadoPadrao", props)

    def test_coletar_grava_entalpia_com_fonte(self):
        decl = decs(linha("P3078", "-285830", "Q13035094", "b", quals="P515=Q11435"),
                    linha("P3078", "-241818", "Q13035094", "a", quals="P515=Q11432"),
                    linha("P2101", "0", "Q25267", "c"), linha("P2102", "100", "Q25267", "d"))
        original = CP.consultar
        CP.consultar = lambda http, qids, log=print: ({"Q1": decl}, [])
        try:
            comp = [{"cid": 962, "wikidata": "Q1", "formula": "H2O", "propriedades": {"massaMolar": 18.015}}]
            st = CP.coletar(None, comp, HOJE, log=lambda *a: None)
        finally:
            CP.consultar = original
        self.assertEqual(comp[0]["propriedades"]["entalpiaFormacaoKJmol"], -285.83)
        self.assertEqual(comp[0]["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["condicoes"], {"fase": "liquido"})
        self.assertEqual(st["compostosComPropriedade"]["entalpiaFormacaoKJmol"], 1)
        self.assertEqual(st["comReferencia"]["entalpiaFormacaoKJmol"], 1)
        self.assertEqual(st["entalpiaReferenciaFraca"], 0)
        self.assertEqual(CP.validar_registro(comp[0]), [])
        # só a fraca (com a chave ligada): conta em `entalpiaReferenciaFraca`, não em `comReferencia`, e o pacote valida
        CP.consultar = lambda http, qids, log=print: ({"Q1": decs(linha("P3078", "-74.52", "Q752197", "a", refs="P143=Q328~English Wikipedia"))}, [])
        CP.ENTALPIA_ACEITA_REFERENCIA_FRACA = True
        try:
            comp = [{"cid": 297, "wikidata": "Q1", "formula": "CH4", "propriedades": {}}]
            st = CP.coletar(None, comp, HOJE, log=lambda *a: None)
        finally:
            CP.consultar = original
            CP.ENTALPIA_ACEITA_REFERENCIA_FRACA = False
        self.assertEqual(comp[0]["propriedades"]["entalpiaFormacaoKJmol"], -74.52)
        self.assertEqual((st["entalpiaReferenciaFraca"], st["comReferencia"]["entalpiaFormacaoKJmol"]), (1, 0))
        self.assertEqual(CP.validar_registro(comp[0]), [])

    def test_estado_a_298(self):
        self.assertEqual(CP.estado_a_298(400, None), "solido")
        self.assertEqual(CP.estado_a_298(200, 350), "liquido")
        self.assertEqual(CP.estado_a_298(90, 111), "gas")
        self.assertIsNone(CP.estado_a_298(297, 400))
        self.assertIsNone(CP.estado_a_298(200, 299))
        self.assertIsNone(CP.estado_a_298(200, None))

    def test_validar_registro(self):
        c = {"cid": 1, "propriedades": {"xlogp": 1.0, "pontoFusaoK": 300}, "fontesPorPropriedade": {}}
        self.assertTrue(CP.validar_registro(c))  # valor sem fonte
        c["fontesPorPropriedade"] = {"pontoFusaoK": {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE}}
        self.assertEqual(CP.validar_registro(c), [])
        c["fontesPorPropriedade"]["xlogp"] = {"nome": "PubChem", "licenca": "x", "acessadoEm": HOJE, "metodo": "computed"}
        self.assertTrue(CP.validar_registro(c))
        c = {"cid": 1, "propriedades": {"entalpiaFormacaoKJmol": -74.52}, "fontesPorPropriedade": {}}
        self.assertTrue(CP.validar_registro(c))  # entalpia de formação sem fonte por valor
        c["fontesPorPropriedade"] = {"entalpiaFormacaoKJmol": {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE}}
        self.assertIn("sem referencia, referenciaFraca nem revisao", CP.validar_registro(c)[0])  # nem forte, nem fraca, nem Wikipédia
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["referencia"] = "CRC"
        self.assertEqual(CP.validar_registro(c), [])
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"] = {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE, "referenciaFraca": True}
        self.assertEqual(CP.validar_registro(c), [])
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["referencia"] = "CRC"
        self.assertTrue(CP.validar_registro(c))  # fraca com `referencia` é contraditória
        del c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["referencia"]
        c["propriedades"]["pontoFusaoK"] = 300
        c["fontesPorPropriedade"]["pontoFusaoK"] = {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE, "referenciaFraca": True}
        self.assertTrue(CP.validar_registro(c))  # referenciaFraca só vale para a entalpia de formação
        del c["propriedades"]["pontoFusaoK"], c["fontesPorPropriedade"]["pontoFusaoK"]
        c["propriedades"]["entalpiaFormacaoKJmol"] = "-74,52"
        self.assertTrue(CP.validar_registro(c))  # não numérico

    def test_coletar_nao_sobrescreve_calculados(self):
        class Http:
            def get(self, *a, **k):
                raise RuntimeError("sem rede")
        comp = [{"cid": 1, "wikidata": "Q1", "propriedades": {"xlogp": 1.0}}]
        st = CP.coletar(Http(), comp, HOJE, log=lambda *a: None)
        self.assertEqual(comp[0]["propriedades"], {"xlogp": 1.0})
        self.assertTrue(st["falhas"])


class IonizacaoTest(unittest.TestCase):
    def setUp(self):
        self.e = {"z": 73, "simbolo": "Ta", "energiaIonizacaoKJmol": 761.3, "afinidadeEletronicaKJmol": 31.1, "eletronegatividade": 1.5,
                  "fontes": [{"nome": "PubChem Periodic Table"}]}

    def test_troca_com_origem(self):
        ie = {"kJmol": 728.4, "valorOriginal": 7.549571, "unidadeOriginal": "eV", "declaracao": "Q1123$x", "qid": "Q1123",
              "simbolo": "Ta", "referencia": "https://physics.nist.gov/asd"}
        self.assertEqual(CE.aplicar_ionizacao(self.e, ie, HOJE), (761.3, 728.4))
        f = self.e["fontesPorPropriedade"]["energiaIonizacaoKJmol"]
        self.assertEqual((f["nome"], f["licenca"], f["substituiu"]["valor"]), ("Wikidata", "CC0", 761.3))
        CE.marcar_origens_pubchem(self.e, HOJE)
        self.assertEqual(self.e["fontesPorPropriedade"]["eletronegatividade"]["escala"], "Pauling")
        self.assertNotIn("aviso", self.e["fontesPorPropriedade"]["afinidadeEletronicaKJmol"])

    def test_conflito_grande_mantem_pubchem(self):
        ie = {"kJmol": 600.0, "simbolo": "Ta", "qid": "Q1123", "declaracao": "x", "valorOriginal": 6.2, "unidadeOriginal": "eV"}
        self.assertEqual(CE.aplicar_ionizacao(self.e, ie, HOJE)[0], "conflito")
        self.assertEqual(self.e["energiaIonizacaoKJmol"], 761.3)

    def test_afinidade_desatualizada_marcada(self):
        e = {"z": 81, "simbolo": "Tl", "afinidadeEletronicaKJmol": 19.3, "fontes": []}
        CE.marcar_origens_pubchem(e, HOJE)
        f = e["fontesPorPropriedade"]["afinidadeEletronicaKJmol"]
        self.assertTrue(f["revisar"])
        self.assertIn("desatualizado", f["aviso"])

    def test_ler_ionizacao_so_nist_e_ate_lr(self):
        linhas = [
            {"z": "17", "sym": "Cl", "item": E + "Q688", "st": E + "statement/Q688-a", "rank": N, "amt": "11.48", "unit": E + "Q83327",
             "ords": "1", "refs": "http://www.cdc.gov/niosh/npg/npgd0115.html"},
            {"z": "73", "sym": "Ta", "item": E + "Q1123", "st": E + "statement/Q1123-b", "rank": N, "amt": "7.549571", "unit": E + "Q83327",
             "ords": "1", "refs": "https://physics.nist.gov/asd|NIST Atomic Spectra Database, Ionization Energies"},
            {"z": "73", "sym": "Ta", "item": E + "Q1123", "st": E + "statement/Q1123-c", "rank": N, "amt": "23.1", "unit": E + "Q83327",
             "ords": "3", "refs": "https://physics.nist.gov/asd"},
            {"z": "104", "sym": "Rf", "item": E + "Q1226", "st": E + "statement/Q1226-d", "rank": N, "amt": "6.02", "unit": E + "Q83327",
             "ords": "1", "refs": "https://physics.nist.gov/asd"},
        ]
        orig = CE.W.sparql
        CE.W.sparql = lambda http, consulta, **k: linhas
        try:
            r = CE.ler_ionizacao(None)
        finally:
            CE.W.sparql = orig
        self.assertEqual(set(r), {73})
        self.assertEqual(r[73]["kJmol"], 728.4)
        self.assertEqual(r[73]["declaracao"], "Q1123$b")


if __name__ == "__main__":
    unittest.main()
