# -*- coding: utf-8 -*-
"""Carga do modelo no Space do explicador (`backend/hf_space_explica/carga.py`): base + adaptador LoRA opcional, decididos pelas variáveis do Space.

27/10/2026: o modelo fundido (7,6 GB) não sobe pelo link do mantenedor (0,8 MB/s); o Space passa a aplicar o adaptador (137 MB, repositório privado)
sobre a base pública. Sem ASK_ADAPTER_ID, continua carregando o modelo de ASK_MODEL_ID (fundido ou base), como antes."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "hf_space_explica"))
import carga  # noqa: E402


class Gravador:
    def __init__(self):
        self.chamadas = []

    def base(self, model_id, revision):
        self.chamadas.append(("base", model_id, revision))
        return "MODELO_BASE"

    def adaptador(self, modelo, adapter_id, revision):
        self.chamadas.append(("adaptador", modelo, adapter_id, revision))
        return "MODELO_FUNDIDO"


class CargaTest(unittest.TestCase):
    def test_sem_adaptador_carrega_so_o_modelo_indicado(self):
        g = Gravador()
        modelo, cfg = carga.carregar({"ASK_MODEL_ID": "franciscoaleixo/SaibaTudoIA-Explica", "ASK_MODEL_REVISION": "abc"}, g.base, g.adaptador)
        self.assertEqual(modelo, "MODELO_BASE")
        self.assertEqual(g.chamadas, [("base", "franciscoaleixo/SaibaTudoIA-Explica", "abc")])
        self.assertEqual(cfg["adapter"], None)

    def test_com_adaptador_aplica_sobre_a_base(self):
        g = Gravador()
        env = {"ASK_MODEL_ID": "Qwen/Qwen3-4B-Instruct-2507", "ASK_MODEL_REVISION": "", "ASK_ADAPTER_ID": "franciscoaleixo/SaibaTudoIA-Explica-Eleicoes",
               "ASK_ADAPTER_REVISION": "sha1"}
        modelo, cfg = carga.carregar(env, g.base, g.adaptador)
        self.assertEqual(modelo, "MODELO_FUNDIDO")
        self.assertEqual(g.chamadas, [("base", "Qwen/Qwen3-4B-Instruct-2507", None),
                                      ("adaptador", "MODELO_BASE", "franciscoaleixo/SaibaTudoIA-Explica-Eleicoes", "sha1")])
        self.assertEqual(cfg, {"base": "Qwen/Qwen3-4B-Instruct-2507", "base_revision": None,
                               "adapter": "franciscoaleixo/SaibaTudoIA-Explica-Eleicoes", "adapter_revision": "sha1"})

    def test_sem_variaveis_usa_a_base_publica(self):
        g = Gravador()
        _, cfg = carga.carregar({}, g.base, g.adaptador)
        self.assertEqual(cfg["base"], "Qwen/Qwen3-4B-Instruct-2507")
        self.assertIsNone(cfg["adapter"])

    def test_variaveis_vazias_contam_como_ausentes(self):
        g = Gravador()
        _, cfg = carga.carregar({"ASK_ADAPTER_ID": "  ", "ASK_ADAPTER_REVISION": ""}, g.base, g.adaptador)
        self.assertIsNone(cfg["adapter"])
        self.assertEqual(len(g.chamadas), 1)


class AppZeroGpuTest(unittest.TestCase):
    def test_adaptador_e_carregado_na_cpu(self):
        # ZeroGPU: fora de @spaces.GPU, torch.cuda.is_available() é True (emulado) mas não há GPU; o peft inferiria "cuda" e o
        # safetensors falharia com "No CUDA GPUs are available" (27/10/2026). O adaptador tem de ser carregado e fundido na CPU.
        app = (Path(__file__).resolve().parents[1] / "hf_space_explica" / "app.py").read_text(encoding="utf-8")
        self.assertRegex(app, r'PeftModel\.from_pretrained\([^)]*torch_device="cpu"')


if __name__ == "__main__":
    unittest.main()
