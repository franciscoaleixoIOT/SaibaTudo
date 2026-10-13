# -*- coding: utf-8 -*-
"""Testes do gerador de compostos do dia a dia (quimica_populares.py). Roda com o pacote real; com a fixture, pula o que depende dele."""
import importlib.util
import json
import re
import sys
import unittest
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import quimica_populares as qp  # noqa: E402

MODAL = AQUI.parent.parent / "apps" / "quimica" / "backend" / "modal"


def _nlu_core():
    spec = importlib.util.spec_from_file_location("nlu_core_quimica_pop", MODAL / "nlu_core.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Populares(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.comum, cls.pacote = qp._dataset()
        cls.pac = cls.pacote.localizar(None)
        cls.core = _nlu_core()
        cls.regs = {}
        if not cls.pac.eh_fixture:
            for idioma in qp.IDIOMAS:
                cls.regs[idioma], _ = qp.gerar_idioma(cls.pac, idioma, 2026, 0.5, (cls.comum, cls.pacote))

    def _pular_sem_pacote(self):
        if self.pac.eh_fixture:
            self.skipTest("pacote data/quimica ausente")

    def test_cinco_idiomas_com_as_intencoes_alvo(self):
        self._pular_sem_pacote()
        for idioma, regs in self.regs.items():
            self.assertGreater(len(regs), 600, idioma)
            por = Counter(r["alvo"]["intent"] for r in regs)
            for intent in ("COMPOSTO", "PROPRIEDADE", "MASSA_MOLAR", "SEGURANCA", "ESTEQUIOMETRIA", "CONCENTRACAO", "PH"):
                self.assertGreater(por[intent], 30, f"{idioma} {intent}")

    def test_composto_copiado_da_pergunta_e_rotulo_valido(self):
        self._pular_sem_pacote()
        for idioma, regs in self.regs.items():
            for r in regs:
                alvo = r["alvo"]
                self.assertIn(alvo["composto"], r["q"], (idioma, r))
                saida = self.core.format_output(alvo)
                self.assertTrue(self.core.has_valid_shape(self.core.parse_model_output(saida)), (idioma, saida))
                self.assertNotIn("equacao", alvo)  # nunca inventa equação

    def test_quantidades_na_ordem_da_pergunta(self):
        self._pular_sem_pacote()
        for idioma, regs in self.regs.items():
            sep = qp.DECIMAL[idioma]
            for r in regs:
                qs = r["alvo"].get("quantidades")
                if not qs:
                    continue
                pos = -1
                for q in qs:
                    v = q["valor"]
                    txt = (str(int(v)) if float(v) == int(v) else str(v)).replace(".", sep)
                    i = r["q"].find(txt, pos + 1)
                    self.assertGreaterEqual(i, 0, (idioma, r["q"], txt))
                    pos = i
                    self.assertIn(q["unidade"], ("g", "mg", "kg", "mL", "L", "mol/L", "mol", "mmol"))

    def test_nomes_populares_aparecem(self):
        """A razão de existir do gerador: 'água', 'soda cáustica', 'bleach', 'Kochsalz', 'lejía' nas perguntas."""
        self._pular_sem_pacote()
        esperados = {"pt-BR": ["água", "soda cáustica", "sal de cozinha", "água sanitária"], "en": ["water", "bleach", "caustic soda", "table salt"],
                     "es": ["agua", "lejia", "sal", "sosa"], "de": ["Wasser", "Kochsalz", "Natronlauge", "Ätznatron"], "fr": ["eau", "soude caustique", "sel", "javel"]}
        for idioma, nomes in esperados.items():
            texto = " \n ".join(r["q"].lower() for r in self.regs[idioma])
            achados = [n for n in nomes if n.lower() in texto]
            self.assertGreaterEqual(len(achados), 2, (idioma, achados))

    def test_filtro_de_sinonimos(self):
        ok = ["soda cáustica", "bleach", "Kochsalz", "table salt", "lejia", "aspirina", "vitamina C", "Soude caustique", "gás carbônico", "sal"]
        ruins = ["Estrutura quimica do colesterol", "hypochlorous acid, sodium salt", "monóxido de di-hidrogênio", "HMGR", "Freon 12", "D-Glc",
                 "calcium chloride anhydrous", "nitrate et de potassium", "Sodium hydroxide solutions", "intoxication au naphtalène", "Ammoniumnitratlösung"]
        for s in ok:
            self.assertTrue(qp.sinonimo_popular(s, "x"), s)
        for s in ruins:
            self.assertFalse(qp.sinonimo_popular(s, "x"), s)
        self.assertFalse(qp.sinonimo_popular("Água", "água"))  # igual ao nome não conta como sinônimo

    def test_deterministico(self):
        self._pular_sem_pacote()
        a, _ = qp.gerar_idioma(self.pac, "de", 2026, 0.3, (self.comum, self.pacote))
        b, _ = qp.gerar_idioma(self.pac, "de", 2026, 0.3, (self.comum, self.pacote))
        self.assertEqual(json.dumps(a, ensure_ascii=False), json.dumps(b, ensure_ascii=False))

    def test_frances_com_elisao_e_sem_de_vogal(self):
        self._pular_sem_pacote()
        for r in self.regs["fr"]:
            self.assertIsNone(re.search(r"\b[Dd]e [aeiouyàâéèêëîïôûAEIOUYÀÂÉÈÊËÎÏÔÛ]", r["q"]), r["q"])

    def test_sem_texto_fixo_em_portugues_fora_do_pt(self):
        self._pular_sem_pacote()
        for idioma in ("en", "es", "de", "fr"):
            for r in self.regs[idioma]:
                self.assertIsNone(re.search(r"\b(qual|quais|quantos|misturar|perigos?)\b", r["q"], re.I), (idioma, r["q"]))


if __name__ == "__main__":
    unittest.main()
