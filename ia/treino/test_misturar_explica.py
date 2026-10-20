# -*- coding: utf-8 -*-
"""Testes de misturar_explica.py (mistura do explicador): teto por app:tipo, exemplos protegidos (--manter) e extras (--extra).
Rodar da raiz: $PY -I -m unittest discover -s ia/treino -p "test_*.py" """
import json
import random
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import misturar_explica as me  # noqa: E402


def ex(app, tipo, rid):
    return {"app": app, "tipo": tipo, "id": rid, "instruction": "s", "input": f"PERGUNTA: {rid}", "output": "r"}


class TestTetos(unittest.TestCase):
    def test_teto_sorteia_acima_do_limite(self):
        itens = [ex("quimica", "seguranca", f"sr-{i}") for i in range(50)] + [ex("quimica", "conceito", f"co-{i}") for i in range(5)]
        out = me.aplicar_tetos(itens, {("quimica", "seguranca"): 10}, random.Random(1))
        self.assertEqual(sum(1 for it in out if it["tipo"] == "seguranca"), 10)
        self.assertEqual(sum(1 for it in out if it["tipo"] == "conceito"), 5)

    def test_manter_protege_do_teto_e_nao_conta(self):
        itens = [ex("quimica", "seguranca", f"sr-{i}") for i in range(50)] + [ex("quimica", "seguranca", f"sp-{i}") for i in range(30)]
        out = me.aplicar_tetos(itens, {("quimica", "seguranca"): 10}, random.Random(1), manter=(("quimica", "sp-"),))
        ids = [it["id"] for it in out]
        self.assertEqual(sum(1 for i in ids if i.startswith("sp-")), 30)   # inteiros
        self.assertEqual(sum(1 for i in ids if i.startswith("sr-")), 10)   # o teto só vale para os demais
        # o prefixo é por app: "sp-" de outro app não é protegido
        out2 = me.aplicar_tetos([ex("eleicoes", "seguranca", f"sp-{i}") for i in range(30)], {("eleicoes", "seguranca"): 5}, random.Random(1),
                                manter=(("quimica", "sp-"),))
        self.assertEqual(len(out2), 5)

    def test_sem_teto_mantem_tudo_e_e_deterministico(self):
        itens = [ex("quimica", "seguranca", f"sr-{i}") for i in range(20)]
        a = me.aplicar_tetos(itens, {("quimica", "seguranca"): 7}, random.Random(3))
        b = me.aplicar_tetos(itens, {("quimica", "seguranca"): 7}, random.Random(3))
        self.assertEqual([x["id"] for x in a], [x["id"] for x in b])
        self.assertEqual(len(me.aplicar_tetos(itens, {}, random.Random(3))), 20)


class TestMain(unittest.TestCase):
    def test_extra_entra_com_o_app_e_resumo_registra(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            (d / "q.json").write_text(json.dumps([ex("quimica", "seguranca", f"sr-{i}") for i in range(6)] + [ex("quimica", "seguranca", "sp-1")]),
                                      encoding="utf-8")
            (d / "e.json").write_text(json.dumps([ex("eleicoes", "contexto", "el-1")]), encoding="utf-8")
            (d / "x.json").write_text(json.dumps([{**ex("quimica", "recusa", "xq-ren-1"), "idioma": "en"}]), encoding="utf-8")
            argv = sys.argv
            sys.argv = ["misturar_explica.py", "--quimica", str(d / "q.json"), "--eleicoes", str(d / "e.json"), "--extra", f"quimica={d / 'x.json'}",
                        "--teto", "quimica:seguranca=2", "--manter", "quimica:sp-", "--manter", "quimica:xq-", "--out", str(d / "out" / "train.json")]
            try:
                me.main()
            finally:
                sys.argv = argv
            treino = json.loads((d / "out" / "train.json").read_text(encoding="utf-8"))
            resumo = json.loads((d / "out" / "train.resumo.json").read_text(encoding="utf-8"))
            ids = sorted(it["id"] for it in treino)
            self.assertIn("sp-1", ids)
            self.assertIn("xq-ren-1", ids)
            self.assertIn("el-1", ids)
            self.assertEqual(sum(1 for i in ids if i.startswith("sr-")), 2)
            self.assertEqual(resumo["mantidos"], {"quimica:sp-": 1, "quimica:xq-": 1})
            self.assertEqual(resumo["por_idioma"], {"pt-BR": 4, "en": 1})
            self.assertEqual([it["app"] for it in treino if it["id"] == "xq-ren-1"], ["quimica"])


if __name__ == "__main__":
    unittest.main()
