# -*- coding: utf-8 -*-
"""Testes das partes puras de empacotar_versao.py (decisão do gate, eval.json e meta.json). Não copia GGUF nem chama o Modal.
Rodar da raiz: $PY -I -m unittest discover -s ia/treino -p "test_*.py" """
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import empacotar_versao as emp  # noqa: E402

APP, CONV, EV = emp.carregar_app("quimica")


def resultado(n=100, json_pct=100.0, intent=97.0, composto=95.0, label="x"):
    r = {"label": label, "format": "v1", "n_cases": n, "json_valid_pct": json_pct, "intent_acc_pct": intent, "intent_cases": n,
         "latency_s_mean": 1.0, "latency_s_max": 2.0, "cases": []}
    for e in EV.ENTIDADES:
        r[f"{e}_acc_pct"] = composto if e == "composto" else 99.0
        r[f"{e}_cases"] = 40
        r[f"{e}_null_cases"] = 10
        r[f"{e}_nao_medido"] = 0
        r[f"{e}_hallucination_pct"] = 0.0
    return r


def eval_q4(**kw):
    composto = kw.pop("composto", 95.0)
    base = {
        "app": "quimica", "gguf": "x-Q4_K_M.gguf", "threads": 8, "duracao_total_s": 10.0,
        "template": {"gguf_template_igual_servico": True, "hf_template_igual_servico": True, "tokens_iguais_hf_gguf": True, "arquitetura": "qwen35"},
        "think_com_gramatica": 0, "think_sem_gramatica": 0,
        "latencia_com_gramatica": {"p50": 1.8}, "latencia_sem_gramatica": {"p50": 0.9},
        "constrained": resultado(composto=composto, label="COM gramática"),
        "unconstrained": resultado(json_pct=99.0, composto=composto, label="SEM gramática"),
        "real": resultado(n=400, intent=99.5, label="holdout"),
        "golden_por_idioma": [{"idioma": i, "n": 20} for i in ("pt-BR", "en", "es", "de", "fr")],
        "holdout_por_idioma": [], "holdout_arquivo": "holdout_quimica.json",
        "gates_por_idioma": {i: {"passou": True, "motivos": []} for i in ("pt-BR", "en", "es", "de", "fr")},
    }
    base.update(kw)
    return base


def eval_q8(intent=97.0, composto=95.0):
    return {"app": "quimica", "gguf": "x-Q8_0.gguf", "constrained": resultado(intent=intent, composto=composto, label="Q8")}


class TestDecisao(unittest.TestCase):
    def test_aprova_quando_tudo_passa(self):
        ok, motivos, notas = emp.decidir(EV, eval_q4(), eval_q8(), None, emp.limites_do_app(EV))
        self.assertTrue(ok, motivos)
        self.assertEqual(motivos, [])
        self.assertTrue(any("catraca" in n for n in notas))
        self.assertTrue(any("holdout 400" in n for n in notas))

    def test_reprova_por_entidade_do_app(self):
        ok, motivos, _ = emp.decidir(EV, eval_q4(composto=88.3), eval_q8(composto=88.3), None, emp.limites_do_app(EV))
        self.assertFalse(ok)
        self.assertTrue(any("composto" in m for m in motivos), motivos)

    def test_reprova_por_idioma_mesmo_com_media_boa(self):
        q4 = eval_q4()
        q4["gates_por_idioma"]["en"] = {"passou": False, "motivos": ["acerto de composto 77.5% < 90.0% (40 casos)"]}
        ok, motivos, _ = emp.decidir(EV, q4, eval_q8(), None, emp.limites_do_app(EV))
        self.assertFalse(ok)
        self.assertIn("[en] acerto de composto 77.5% < 90.0% (40 casos)", motivos)

    def test_reprova_por_queda_de_quantizacao(self):
        ok, motivos, _ = emp.decidir(EV, eval_q4(), eval_q8(intent=97.0 + 3.5), None, emp.limites_do_app(EV))
        self.assertFalse(ok)
        self.assertTrue(any("Q8" in m or "quantiza" in m.lower() for m in motivos), motivos)

    def test_reprova_por_template_diferente_e_think(self):
        q4 = eval_q4(think_sem_gramatica=2)
        q4["template"]["gguf_template_igual_servico"] = False
        ok, motivos, _ = emp.decidir(EV, q4, eval_q8(), None, emp.limites_do_app(EV))
        self.assertFalse(ok)
        self.assertTrue(any("template" in m for m in motivos))
        self.assertTrue(any("<think>" in m for m in motivos))

    def test_sem_q8_e_nota_nao_bloqueio(self):
        ok, motivos, notas = emp.decidir(EV, eval_q4(), None, None, emp.limites_do_app(EV))
        self.assertTrue(ok, motivos)
        self.assertTrue(any("Q8" in n for n in notas))


class TestPacote(unittest.TestCase):
    def test_meta_e_eval_no_formato_do_app(self):
        meta, ev_json = emp.montar_pacote(
            CONV, EV, app_cfg=emp.APPS["quimica"], version="nlu-v3.1-20261013", q4=eval_q4(), q8=eval_q8(), origem="teste",
            train_meta={"base_model": "Qwen/Qwen3.5-2B", "passos": 1205}, arquivos={"model-Q4_K_M.gguf": {"bytes": 1, "sha256": "aa"}},
            previous=None, agora="2026-10-13T12:00:00Z",
        )
        self.assertEqual((meta["target"], meta["version"], meta["file"], meta["format"]), ("nlu", "nlu-v3.1-20261013", "model-Q4_K_M.gguf", "v1"))
        self.assertTrue(meta["passed"])
        self.assertEqual(meta["prompt_suffix"], CONV.core.THINK_VAZIO)
        self.assertEqual(meta["base_model"], "Qwen/Qwen3.5-2B")
        self.assertEqual(meta["llama_cpp_ref"], "b11575")
        self.assertEqual(meta["idiomas"], ["pt-BR", "en", "es", "de", "fr"])
        self.assertEqual(meta["treino"]["passos"], 1205)
        self.assertIn("ia/treino/exportar_gguf.py", meta["converted_localmente"])
        # eval.json: o que eval_golden.escolher_previous e normalizar_previous do app esperam (catraca do próximo ciclo)
        self.assertEqual(ev_json["Q4_K_M"]["constrained"]["n_cases"], 100)
        self.assertEqual(ev_json["Q8_0"]["constrained"]["label"], "Q8")
        self.assertIs(CONV.normalizar_previous(ev_json), ev_json)
        prev, aviso = EV.escolher_previous({"version": "nlu-v3.1-20261013", "format": "v1"}, ev_json, 100)
        self.assertIsNone(aviso)
        self.assertEqual(prev["intent_acc_pct"], 97.0)
        self.assertEqual(ev_json["Q4_K_M"]["holdout_informativo"]["n_cases"], 400)
        self.assertEqual(ev_json["Q4_K_M"]["por_idioma"]["gates"]["fr"], {"passou": True, "motivos": []})

    def test_ponteiro_do_app_leva_o_sufixo(self):
        sys.path.insert(0, str(emp.APPS["quimica"]["pasta"] / "backend" / "modal"))
        import promover  # noqa: E402

        meta, _ = emp.montar_pacote(
            CONV, EV, app_cfg=emp.APPS["quimica"], version="nlu-v3.1-20261013", q4=eval_q4(), q8=eval_q8(), origem="", train_meta=None,
            arquivos={"model-Q4_K_M.gguf": {"bytes": 1, "sha256": "aa"}}, previous=None, agora="2026-10-13T12:00:00Z",
        )
        p = promover.montar_ponteiro(meta, "2026-10-13T12:00:00Z")
        self.assertEqual((p["version"], p["file"], p["sha256"], p["prompt_suffix"]), ("nlu-v3.1-20261013", "model-Q4_K_M.gguf", "aa", CONV.core.THINK_VAZIO))

    def test_versao_invalida(self):
        with self.assertRaises(SystemExit):
            emp.montar_pacote(CONV, EV, app_cfg=emp.APPS["quimica"], version="v3.1-20261013", q4=eval_q4(), q8=None, origem="", train_meta=None,
                              arquivos={}, previous=None, agora="x")


if __name__ == "__main__":
    unittest.main(verbosity=2)
