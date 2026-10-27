# -*- coding: utf-8 -*-
"""publicar_explica.py: variáveis do Space para modelo fundido ou adaptador LoRA, e os arquivos que entram no Space.
Rodar da raiz: python -m unittest ia/treino/test_publicar_explica.py"""
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import publicar_explica as pub  # noqa: E402


class VariaveisTest(unittest.TestCase):
    def test_modelo_fundido(self):
        v = pub.variaveis_space("franciscoaleixo/SaibaTudoIA-Explica", "sha-m", "SaibaTudo IA")
        self.assertEqual(v, {"ASK_MODEL_ID": "franciscoaleixo/SaibaTudoIA-Explica", "ASK_MODEL_REVISION": "sha-m", "ASK_MODEL_LABEL": "SaibaTudo IA",
                             "ASK_ADAPTER_ID": "", "ASK_ADAPTER_REVISION": ""})

    def test_adaptador_aponta_a_base_publica_e_o_adaptador_privado(self):
        v = pub.variaveis_space("franciscoaleixo/SaibaTudoIA-Explica-Eleicoes", "sha-a", "SaibaTudo IA", base_do_adaptador="Qwen/Qwen3-4B-Instruct-2507")
        self.assertEqual(v, {"ASK_MODEL_ID": "Qwen/Qwen3-4B-Instruct-2507", "ASK_MODEL_REVISION": "", "ASK_MODEL_LABEL": "SaibaTudo IA",
                             "ASK_ADAPTER_ID": "franciscoaleixo/SaibaTudoIA-Explica-Eleicoes", "ASK_ADAPTER_REVISION": "sha-a"})

    def test_base_do_adaptador_vem_do_adapter_config(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "adapter_config.json").write_text(json.dumps({"base_model_name_or_path": "Qwen/Qwen3-4B-Instruct-2507", "peft_type": "LORA"}),
                                                          encoding="utf-8")
            self.assertEqual(pub.base_do_adaptador(Path(d)), "Qwen/Qwen3-4B-Instruct-2507")


class MontarSpaceTest(unittest.TestCase):
    def test_eleicoes_leva_todos_os_modulos_python_menos_testes(self):
        with tempfile.TemporaryDirectory() as d:
            pasta = pub.montar_space("eleicoes", Path(d))
            nomes = sorted(p.name for p in pasta.iterdir())
            self.assertIn("app.py", nomes)
            self.assertIn("carga.py", nomes)
            self.assertIn("nlu_core.py", nomes)
            self.assertIn("requirements.txt", nomes)
            self.assertIn("README.md", nomes)
            self.assertFalse([n for n in nomes if n.startswith("test_")], nomes)

    def test_short_description_dos_readmes_cabe_no_limite_do_hub(self):
        # o Hub recusa o upload com mais de 60 caracteres (publicação de 27/10/2026 falhou nisso)
        for nome, (pasta, _) in pub.SPACES.items():
            texto = (pasta / "README.md").read_text(encoding="utf-8")
            m = re.search(r"^short_description:\s*(.+?)\s*$", texto, re.M)
            self.assertIsNotNone(m, nome)
            self.assertLessEqual(len(m.group(1)), 60, f"{nome}: {m.group(1)!r}")

    def test_requirements_do_space_de_eleicoes_tem_peft(self):
        req = (pub.SPACES["eleicoes"][0] / "requirements.txt").read_text(encoding="utf-8")
        self.assertIn("peft", req)


if __name__ == "__main__":
    unittest.main()
