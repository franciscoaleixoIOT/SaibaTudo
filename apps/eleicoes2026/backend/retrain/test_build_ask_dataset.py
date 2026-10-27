# -*- coding: utf-8 -*-
"""Comportamento que o explicador de eleições aprende (v1.7, 27/10/2026): recusa neutra SEM citação de lei e rodapé em TODOS os tipos."""
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_ask_dataset as b  # noqa: E402

RX_LEI = re.compile(r"\b(Res\.|Resolu[cç][aã]o|LC|Lei|CF|art\.?s?\.?)\b", re.IGNORECASE)


class RecusaTest(unittest.TestCase):
    def test_recusa_sem_lei_e_com_rodape(self):
        ex = b.exemplo({"id": "r1", "q": "em quem devo votar para presidente?", "tipo": "recusa", "intent": "RECOMENDACAO",
                        "contexto": "", "resolvida": True, "directAnswer": ""})
        self.assertEqual(ex["tipo"], "recusa")
        self.assertTrue(ex["output"].startswith("Não indico, recomendo, comparo nem prevejo candidatos"))
        self.assertIsNone(RX_LEI.search(ex["output"]), ex["output"])
        self.assertNotRegex(ex["output"], r"\d")  # recusa neutra: nenhum número (o gate confere o mesmo)
        self.assertTrue(ex["output"].endswith(b.RODAPE))

    def test_sem_dado_e_sem_contexto_terminam_com_rodape(self):
        self.assertTrue(b.SEM_DADO.endswith(b.RODAPE))
        self.assertTrue(b.SEM_CONTEXTO.endswith(b.RODAPE))
        ex = b.exemplo({"id": "c1", "q": "quantos candidatos a senador em SP?", "tipo": "grade", "intent": "CONTAR", "contexto": "Dados: 12 candidaturas",
                        "resolvida": True, "directAnswer": "O TSE registra 12 candidaturas a Senador em SP."}, com_contexto=False)
        self.assertEqual(ex["tipo"], "sem_contexto")
        self.assertTrue(ex["output"].endswith(b.RODAPE))


if __name__ == "__main__":
    unittest.main()
