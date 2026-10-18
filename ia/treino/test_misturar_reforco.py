# -*- coding: utf-8 -*-
"""Testes de misturar_reforco.py (mistura de reforço do v3.6): estratificação, partes, textos garantidos e exclusão de casos de teste.
Rodar da raiz: $PY -I -m unittest discover -s ia/treino -p "test_*.py" """
import json
import random
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import misturar_reforco as mr  # noqa: E402

GOLDEN_QUIMICA = HERE.parent.parent / "apps" / "quimica" / "contracts" / "nlu_golden_cases.json"


def par(app, idioma, q, intent, **saida):
    return {"app": app, "idioma": idioma, "instruction": "x", "input": q, "output": json.dumps({"intent": intent, **saida}, ensure_ascii=False)}


class TestEstratificar(unittest.TestCase):
    def test_proporcional_com_minimo_um(self):
        pares = [{"g": "a", "i": i} for i in range(90)] + [{"g": "b", "i": i} for i in range(9)] + [{"g": "c", "i": 0}]
        out = mr.estratificar(pares, lambda e: e["g"], 20, random.Random(1))
        por = {}
        for e in out:
            por[e["g"]] = por.get(e["g"], 0) + 1
        self.assertEqual(por["a"], 18)
        self.assertEqual(por["b"], 2)
        self.assertEqual(por["c"], 1)  # grupo pequeno nunca some

    def test_n_maior_que_total_devolve_tudo(self):
        pares = [{"g": "a"}] * 5
        self.assertEqual(len(mr.estratificar(pares, lambda e: e["g"], 50, random.Random(1))), 5)


class TestMistura(unittest.TestCase):
    def setUp(self):
        golden_q = json.loads(GOLDEN_QUIMICA.read_text(encoding="utf-8"))["cases"][0]["q"]  # pergunta real do golden: deve ser excluída
        # frases sintéticas (zorb…) para não coincidir, nem por Jaccard, com casos reais do golden; só golden_q é real de propósito
        self.base = [
            par("quimica", "pt-BR", "o que é um zorbitólio de bohr zz", "CONCEITO"),
            par("quimica", "en", "what is a zorbital mole zz", "CONCEITO"),
            par("quimica", "pt-BR", golden_q, "CONCEITO"),  # igual a um caso do golden
            par("quimica", "pt-BR", "massa molar do zorbitol zz", "MASSA_MOLAR", composto="zorbitol"),
            par("quimica", "fr", "masse molaire du zorbitol zz", "MASSA_MOLAR", composto="zorbitol"),
            par("quimica", "pt-BR", "desenhe o zorbitol zz", "DESENHAR", composto="zorbitol"),
            par("eleicoes2026", "pt-BR", "quem é candidato a governador em zorbópolis zz", "LISTAR_CANDIDATOS", cargo="GOVERNADOR", uf="SP"),
            par("eleicoes2026", "pt-BR", "fulano zorb é ficha limpa zz", "ELEGIBILIDADE", nome="fulano zorb", apenasDeferidas=True),
            par("eleicoes2026", "pt-BR", "quando é o segundo turno em zorbópolis zz", "CALENDARIO"),
            par("eleicoes2026", "pt-BR", "resultado para presidente em zorbópolis zz", "RESULTADOS", cargo="PRESIDENTE"),
        ]
        self.extra = [
            par("quimica", "pt-BR", "o que é um zorbitólio de bohr zz", "CONCEITO"),  # já na base: não duplica
            par("quimica", "pt-BR", "explique o que é a zorbitância zz", "CONCEITO"),  # só no corpus anterior: entra
            par("quimica", "pt-BR", "ph do zorbitol zz", "PH", composto="zorbitol"),  # fora do foco: não entra
        ]
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        (d / "base.json").write_text(json.dumps(self.base, ensure_ascii=False), encoding="utf-8")
        (d / "extra.json").write_text(json.dumps(self.extra, ensure_ascii=False), encoding="utf-8")
        self.out = d / "mix.json"
        mr.main(["--base", str(d / "base.json"), "--extra", str(d / "extra.json"), "--app", "quimica", "--intencoes", "CONCEITO",
                 "--amostra-app", "eleicoes2026=4", "--sempre-com", "apenasDeferidas", "--retencao", "3", "--out", str(self.out), "--seed", "3"])
        self.mix = json.loads(self.out.read_text(encoding="utf-8"))
        self.resumo = json.loads(self.out.with_suffix(".resumo.json").read_text(encoding="utf-8"))

    def tearDown(self):
        self.tmp.cleanup()

    def entradas(self, app=None):
        return {e["input"] for e in self.mix if app is None or e["app"] == app}

    def test_foco_leva_todos_os_conceitos_inclusive_do_extra(self):
        q = self.entradas("quimica")
        self.assertIn("o que é um zorbitólio de bohr zz", q)
        self.assertIn("what is a zorbital mole zz", q)
        self.assertIn("explique o que é a zorbitância zz", q)
        self.assertNotIn("ph do zorbitol zz", q)
        self.assertEqual(self.resumo["foco"]["dos_extras"], 1)

    def test_caso_do_golden_e_excluido(self):
        golden_q = json.loads(GOLDEN_QUIMICA.read_text(encoding="utf-8"))["cases"][0]["q"]
        self.assertNotIn(golden_q, self.entradas())
        self.assertEqual(self.resumo["excluidos_por_serem_teste"].get("foco/exata"), 1)

    def test_secundario_garante_sempre_com_e_respeita_o_tamanho(self):
        el = [e for e in self.mix if e["app"] == "eleicoes2026"]
        self.assertEqual(len(el), 4)  # 1 garantido + 3 da amostra (1 por intenção: a estratificação nunca zera um grupo)
        self.assertIn("fulano zorb é ficha limpa zz", {e["input"] for e in el})
        self.assertEqual(self.resumo["secundario"]["garantidos_por_sempre_com"], 1)

    def test_retencao_so_fora_do_foco(self):
        ret = [e for e in self.mix if e["app"] == "quimica" and "CONCEITO" not in e["output"]]
        self.assertEqual(len(ret), 3)  # MASSA_MOLAR pt, MASSA_MOLAR fr, DESENHAR pt: 1 por (intenção, idioma)
        self.assertEqual(self.resumo["retencao"]["total"], 3)

    def test_sem_duplicatas_e_sem_campo_auxiliar(self):
        chaves = [e["app"] + "|" + e["input"] for e in self.mix]
        self.assertEqual(len(chaves), len(set(chaves)))
        self.assertTrue(all("parte" not in e for e in self.mix))
        self.assertEqual(set(self.mix[0].keys()), {"app", "idioma", "instruction", "input", "output"})

    def test_ordem_estavel_pela_semente(self):
        d = Path(self.tmp.name)
        out2 = d / "mix2.json"
        mr.main(["--base", str(d / "base.json"), "--extra", str(d / "extra.json"), "--app", "quimica", "--intencoes", "CONCEITO",
                 "--amostra-app", "eleicoes2026=4", "--sempre-com", "apenasDeferidas", "--retencao", "3", "--out", str(out2), "--seed", "3"])
        self.assertEqual(out2.read_text(encoding="utf-8"), self.out.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
