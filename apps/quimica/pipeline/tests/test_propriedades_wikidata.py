# -*- coding: utf-8 -*-
"""Propriedades físicas medidas do Wikidata (coleta_propriedades) e 1ª energia de ionização dos elementos (coleta_elementos):
linhas SPARQL sintéticas no formato que a consulta devolve, sem rede."""
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
