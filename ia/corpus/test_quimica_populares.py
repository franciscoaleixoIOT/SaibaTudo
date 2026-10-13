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
                if "elemento" in alvo:  # grupo por nome de elemento: testado em test_perguntas_por_nome_de_elemento
                    continue
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

    def test_substancias_elementares_fora_do_pool_de_compostos(self):
        """O2, H2, Cl2, N2, O3 e gases nobres estao no pacote como "compostos", mas no app nome de elemento = ELEMENTO (golden)."""
        self._pular_sem_pacote()
        pool = qp.compostos_cotidiano(self.pac)
        self.assertTrue(pool)
        self.assertFalse([c["cid"] for c in pool if qp.eh_elementar(c)])
        self.assertTrue(qp.eh_elementar({"formulaHill": "O2"}) and qp.eh_elementar({"formula": "He"}) and qp.eh_elementar({"formula": "Cl2"}))
        self.assertFalse(qp.eh_elementar({"formula": "H2O"}) or qp.eh_elementar({"formula": "NaCl"}) or qp.eh_elementar({"formula": "CO"}))
        nomes_el = {qp.fold(n) for e in self.pac.elementos for n in [e.get("nome"), *(e.get("nomes") or {}).values()] if n}
        for idioma, regs in self.regs.items():
            for r in regs:
                co = r["alvo"].get("composto")
                self.assertFalse(co and qp.fold(co) in nomes_el, (idioma, r["q"], co))

    def test_perguntas_por_nome_de_elemento(self):
        self._pular_sem_pacote()
        simbolos = {e["simbolo"] for e in self.pac.elementos}
        for idioma, regs in self.regs.items():
            com_el = [r for r in regs if "elemento" in r["alvo"]]
            self.assertGreater(len(com_el), 100, idioma)
            self.assertEqual({r["alvo"]["intent"] for r in com_el}, {"ELEMENTO", "MASSA_MOLAR", "PROPRIEDADE", "SEGURANCA"}, idioma)
            for r in com_el:
                self.assertIn(r["alvo"]["elemento"], simbolos, r)
                self.assertNotIn("composto", r["alvo"], r)
                self.assertTrue(self.core.has_valid_shape(r["alvo"]), r)
                # convenção do golden: "massa atômica de X" = PROPRIEDADE/massaAtomica; "massa molar de X" = MASSA_MOLAR (o v3.2 misturou)
                ql = r["q"].lower()
                atomica = any(s in ql for s in ("atômica", "atomica", "atomic", "atómica", "atómico", "atommasse", "atomgewicht", "atomique"))
                if r["alvo"]["intent"] == "PROPRIEDADE":
                    self.assertEqual(r["alvo"]["propriedade"], "massaAtomica", r)
                    self.assertTrue(atomica, r)
                else:
                    self.assertFalse(atomica, r)
                    self.assertNotIn("propriedade", r["alvo"], r)
        # os elementos que o v3.1 confundiu com composto aparecem em todos os idiomas juntos (peso 12x; a geracao e deterministica)
        vistos = {r["alvo"]["elemento"] for regs in self.regs.values() for r in regs if "elemento" in r["alvo"]}
        self.assertTrue({"O", "H", "Fe", "Cl", "S", "N", "Hg"} <= vistos, sorted(vistos))
        pt = [r["q"] for r in self.regs["pt-BR"] if r["alvo"].get("elemento") == "O"]
        self.assertTrue(any("oxig" in q.lower() for q in pt), pt[:5])
        fr = [r["q"] for r in self.regs["fr"] if "elemento" in r["alvo"]]
        self.assertFalse([q for q in fr if "composé" in q], fr[:3])


if __name__ == "__main__":
    unittest.main()
