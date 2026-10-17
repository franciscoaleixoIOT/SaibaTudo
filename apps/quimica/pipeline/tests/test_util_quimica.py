# -*- coding: utf-8 -*-
"""Utilitários de química: fórmulas (Hill), CAS, posição na tabela periódica, sub/sobrescritos, lista fixa."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import lista_fixa  # noqa: E402
import quimica_util as Q  # noqa: E402


class FormulaTest(unittest.TestCase):
    def test_hill(self):
        casos = {"H2SO4": "H2O4S", "Ca(OH)2": "CaH2O2", "CuSO4.5H2O": "CuH10O9S", "CH3COOH": "C2H4O2", "NaCl": "ClNa",
                 "C₂H₅OH": "C2H6O", "Al2(SO4)3": "Al2O12S3", "K4[Fe(CN)6]": "C6FeK4N6", "H2O": "H2O"}
        for conv, hill in casos.items():
            self.assertEqual(Q.formula_hill(conv), hill, conv)

    def test_hill_igual(self):
        self.assertTrue(Q.hill_igual("HCl", "ClH"))
        self.assertTrue(Q.hill_igual("CH3COONa", "C2H3NaO2"))
        self.assertFalse(Q.hill_igual("CH4", "C2H6"))
        self.assertFalse(Q.hill_igual("Xx2", "H2"))  # símbolo inexistente

    def test_formula_invalida(self):
        for f in ("", "H2(", "Foo", "(OH"):
            with self.assertRaises(ValueError):
                Q.formula_hill(f)

    def test_lista_fixa_formulas_validas(self):
        itens = lista_fixa.parse_lista()
        self.assertGreaterEqual(len(itens), 300)
        for it in itens:
            Q.formula_hill(it["formula"])  # levanta se a fórmula declarada estiver errada
            self.assertTrue(it["classes"], it["nome"])
        self.assertEqual(len({i["termo"] for i in itens}), len(itens), "termos de busca repetidos")

    def test_lista_fixa_dica_de_cid(self):
        itens = lista_fixa.parse_lista("## oxido\nÓxido de ferro(III) | iron(III) oxide | Fe2O3 | Hematita | cid=518696\n"
                                       "Óxido de prata | silver oxide | Ag2O | | cid=9794626\nÁgua | water | H2O\n")
        self.assertEqual(itens[0]["cid"], 518696)
        self.assertEqual(itens[0]["popular"], "Hematita")
        self.assertEqual(itens[1]["cid"], 9794626)
        self.assertNotIn("popular", itens[1])
        self.assertNotIn("cid", itens[2])
        with self.assertRaises(ValueError):
            lista_fixa.parse_lista("## x\nA | a | H2O | | 518696\n")
        with self.assertRaises(ValueError):
            lista_fixa.parse_lista("## x\nA | a | H2O | | cid=1 | sobra\n")
        reais = lista_fixa.parse_lista()
        com_dica = {i["nome"]: i["cid"] for i in reais if "cid" in i}
        for nome in ("Óxido de ferro(III)", "Óxido de ferro(II,III)", "Óxido de prata", "Carbeto de cálcio", "Cloreto de cobalto(II)",
                     "Hidróxido de ferro(III)", "Sulfeto de sódio", "Glutamato monossódico", "Pentóxido de difósforo"):
            self.assertIn(nome, com_dica)
        for nome in ("Fluoreto de potássio", "Sulfeto de cobre(I)"):
            self.assertIn(nome, {i["nome"] for i in reais})

    def test_resolver_lista_fixa_usa_a_dica_e_confere_a_formula(self):
        import selecao_compostos as S

        class PubChemFalso:
            def __init__(self):
                self.props = {518696: {"MolecularFormula": "Fe2O3"}, 14833: {"MolecularFormula": "Fe2O3"}, 237873: {"MolecularFormula": "HNa2S+"},
                              14804: {"MolecularFormula": "Na2S"}, 999: {"MolecularFormula": "CO2"}}

            def nome_para_cids(self, nome):
                return {"iron(III) oxide": [], "sodium sulfide": [237873], "silver oxide": [], "water": [962]}.get(nome, [])

            def propriedades(self, cids):
                return {c: self.props[c] for c in cids if c in self.props}

        itens = lista_fixa.parse_lista("## x\nÓxido de ferro(III) | iron(III) oxide | Fe2O3 | Hematita | cid=518696\n"
                                       "Sulfeto de sódio | sodium sulfide | Na2S | | cid=14804\n"
                                       "Óxido de prata | silver oxide | Ag2O | | cid=999\n")
        sel, desc = S.resolver_lista_fixa(PubChemFalso(), itens, log=lambda *a: None)
        self.assertEqual([(r["nome"], r["cid"]) for r in sel], [("Óxido de ferro(III)", 518696), ("Sulfeto de sódio", 14804)])
        self.assertEqual(len(desc), 1)
        self.assertEqual(desc[0]["nome"], "Óxido de prata")
        self.assertIn("não confere", desc[0]["motivo"])  # dica com CID errado é descartada, não publicada


class CasTest(unittest.TestCase):
    def test_checksum(self):
        for cas in ("64-17-5", "50-78-2", "7732-18-5", "7647-01-0"):
            self.assertTrue(Q.cas_valido(cas), cas)
        for cas in ("64-17-6", "abc", "", "50-78", None):
            self.assertFalse(Q.cas_valido(cas), cas)


class TabelaPeriodicaTest(unittest.TestCase):
    def test_posicoes(self):
        esperado = {1: (1, 1, "s"), 2: (1, 18, "s"), 6: (2, 14, "p"), 8: (2, 16, "p"), 26: (4, 8, "d"), 31: (4, 13, "p"),
                    55: (6, 1, "s"), 72: (6, 4, "d"), 79: (6, 11, "d"), 86: (6, 18, "p"), 104: (7, 4, "d"), 118: (7, 18, "p")}
        for z, (per, grp, blo) in esperado.items():
            self.assertEqual((Q.periodo(z), Q.grupo(z), Q.bloco(z)), (per, grp, blo), z)

    def test_lantanideos_e_actinideos_sem_grupo(self):
        for z in list(range(57, 72)) + list(range(89, 104)):
            self.assertIsNone(Q.grupo(z))
            self.assertEqual(Q.bloco(z), "f")

    def test_tabela_fixa_118(self):
        self.assertEqual([z for z, _, _ in Q.ELEMENTOS_PT], list(range(1, 119)))
        self.assertEqual(len(Q.SIMBOLOS), 118)
        self.assertEqual(Q.NOME_PT_POR_Z[8], "Oxigênio")
        self.assertEqual(Q.NOME_PT_POR_Z[118], "Oganessônio")


class TextoTest(unittest.TestCase):
    def test_subscritos(self):
        self.assertEqual(Q.subscrito("2"), "₂")
        self.assertEqual(Q.sobrescrito("2+"), "²⁺")
        self.assertEqual(Q.sobrescrito("−"), "⁻")
        self.assertEqual(Q.subscrito("xy"), "_(xy)")
        self.assertEqual(Q.sem_subscritos("H₂SO₄"), "H2SO4")

    def test_capitalizar_e_norm(self):
        self.assertEqual(Q.capitalizar("ácido acético"), "Ácido acético")
        self.assertEqual(Q.norm("  Ácido   Sulfúrico "), "acido sulfurico")


if __name__ == "__main__":
    unittest.main()
