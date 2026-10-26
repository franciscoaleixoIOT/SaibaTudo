# -*- coding: utf-8 -*-
"""Contratos de conteúdo: glossário (palavras do GloVe em inglês com tradução em pt-BR, es, de, fr e zh) e presets do explorador.
Uso: python -m unittest discover -s tools -p "test_*.py"
"""
import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GLOSSARIO = RAIZ / "contracts" / "glossario.json"
PRESETS = RAIZ / "contracts" / "presets.json"
IDIOMAS_TRADUCAO = ("pt-BR", "es", "de", "fr", "zh")
PADRAO_PALAVRA = re.compile(r"^[a-z]+(?:[-'][a-z]+)*$")
PRESETS_ESPERADOS = ("realeza", "capitais", "plural", "familia", "cores", "numeros", "lideres")


class Glossario(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g = json.loads(GLOSSARIO.read_text(encoding="utf-8"))

    def test_tamanho_minimo(self):
        self.assertGreaterEqual(len(self.g), 300)

    def test_ids_sao_palavras_do_glove(self):
        for palavra in self.g:
            with self.subTest(palavra=palavra):
                self.assertRegex(palavra, PADRAO_PALAVRA)
                self.assertLessEqual(len(palavra), 20)

    def test_cinco_traducoes_nao_vazias(self):
        for palavra, trad in self.g.items():
            with self.subTest(palavra=palavra):
                self.assertEqual(sorted(trad), sorted(IDIOMAS_TRADUCAO))
                for idioma in IDIOMAS_TRADUCAO:
                    self.assertTrue(trad[idioma].strip(), f"{palavra}.{idioma} vazio")

    def test_chines_tem_caracteres_han(self):
        for palavra, trad in self.g.items():
            with self.subTest(palavra=palavra):
                self.assertRegex(trad["zh"], r"[一-鿿]")


class Presets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = json.loads(PRESETS.read_text(encoding="utf-8"))
        cls.g = json.loads(GLOSSARIO.read_text(encoding="utf-8"))

    def test_presets_esperados(self):
        self.assertEqual(tuple(self.p), PRESETS_ESPERADOS)

    def test_palavras_no_glossario_e_sem_repeticao(self):
        for nome, palavras in self.p.items():
            with self.subTest(preset=nome):
                self.assertGreaterEqual(len(palavras), 4)
                self.assertEqual(len(set(palavras)), len(palavras))
                for w in palavras:
                    self.assertIn(w, self.g, f"{nome}: {w} fora do glossário")


if __name__ == "__main__":
    unittest.main()
