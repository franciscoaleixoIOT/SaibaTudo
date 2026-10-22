# -*- coding: utf-8 -*-
"""Testes de build_ask_extras.py (extras do Explica v1.1): legítimos em en/es/de/fr só do lado de treino, recusas com trechos, filtro de contrato."""
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_ask_extras as bx  # noqa: E402
import dataset_common as dc  # noqa: E402
import ask_core as core  # noqa: E402

RESPOSTA = "O rótulo do ácido X (HX) traz corrosão; o básico é óculos de segurança e luvas. Fonte: PubChem, CID 11 (Regulamento CLP)."


def registro(rid, tipo_familia, cid=11, gerado="template"):
    return {"id": rid, "pergunta": f"pergunta {rid}", "resposta": RESPOSTA, "tipo": "seguranca", "nivel": "medio",
            "entidades": {"compostos": [cid]} if gerado == "template" else {}, "geradoPor": f"{gerado}:seguranca_pratica.{tipo_familia}",
            "contexto": "Composto: ácido X (HX), PubChem CID 11"}


class TestExtras(unittest.TestCase):
    def setUp(self):
        self.compostos = {11: {"cid": 11, "nomes": {"pt-BR": "ácido X", "en": "acid X", "es": "ácido X", "de": "Säure X", "fr": "acide X"}}}
        self.indice = {f"t-{i}": "texto licenciado " * 30 for i in range(5)}
        self.filtro = dc.FiltroDeContrato(["How to store acid X safely?"])

    def _registros(self):
        regs = []
        for t in ("epi", "armazenar", "derramar", "socorros", "descartar", "fato_formula", "fato_perigos"):
            for k in range(6):
                regs.append(registro(f"sp-{k}-{t}", t))
        regs.append(registro("sp-geral-sabao_caseiro-1", "sabao_caseiro", gerado="autoria"))
        return regs

    def test_legitimos_por_idioma_so_do_lado_de_treino(self):
        regs = self._registros()
        itens, stats = bx.construir(regs, self.compostos, self.indice, self.filtro, seed=1, por_idioma=10, recusas_trechos=0, recusas_por_idioma=0)
        benignos = [it for it in itens if it["id"].startswith("xq-benigno-")]  # v1.4: pedidos benignos fora do escopo, em pt-BR e nos 4 idiomas
        self.assertEqual({it["idioma"] for it in benignos}, {"pt-BR", *bx.IDIOMAS})
        for it in benignos:
            self.assertEqual(it["output"], bx.RESPOSTA_FORA_DO_ESCOPO)
            self.assertFalse(core.e_recusa(it["output"]), it["id"])
        legit = [it for it in itens if it["tipo"] == "seguranca" and not it["id"].startswith("xq-benigno-")]
        self.assertTrue(legit)
        for it in legit:
            self.assertFalse(core.e_recusa(it["output"]), it["id"])
            self.assertIn(it["idioma"], bx.IDIOMAS)
            base = it["id"].split("-", 2)[2]  # xq-<idioma>-<id original>
            if base.startswith("sp-") and "geral" not in base:
                self.assertFalse(core.eh_holdout(base, 20), base)   # o holdout do explicador não vaza traduzido
                self.assertIn("CONTEXTO", it["input"])
        # a pergunta do contrato ("How to store acid X safely?") fica fora
        self.assertFalse(any(it["input"].rstrip().endswith("How to store acid X safely?") for it in legit))
        self.assertGreaterEqual(stats.get("contrato_removido", 0), 0)

    def test_recusas_com_trechos_e_multilingues(self):
        itens, stats = bx.construir(self._registros(), self.compostos, self.indice, self.filtro, seed=1, por_idioma=0, recusas_trechos=12, recusas_por_idioma=5)
        rt = [it for it in itens if it["id"].startswith("xq-rt-")]
        self.assertEqual(len(rt), 12)
        for it in rt:
            self.assertIn("TRECHOS (licenciados", it["input"])
            self.assertTrue(core.e_recusa(it["output"]))
            self.assertFalse(core.ensina_producao(it["output"]))
        for idioma in bx.IDIOMAS:
            self.assertEqual(sum(1 for it in itens if it["id"].startswith(f"xq-r{idioma}-")), 5, idioma)
        self.assertEqual(len({it["id"] for it in itens}), len(itens))

    def test_nome_no_idioma(self):
        c = {"nomes": {"en": "acid X"}, "sinonimosPorIdioma": {"es": ["ácido X"]}}
        self.assertEqual(bx.nome_no_idioma(c, "en"), "acid X")
        self.assertEqual(bx.nome_no_idioma(c, "es"), "ácido X")
        self.assertIsNone(bx.nome_no_idioma(c, "de"))

    def test_modelos_cobrem_todos_os_tipos_em_todos_os_idiomas(self):
        tipos = {"epi", "armazenar", "derramar", "socorros", "descartar", "fato_formula", "fato_massa", "fato_inflamavel", "fato_perigos"}
        for idioma in bx.IDIOMAS:
            self.assertEqual(set(bx.MODELOS[idioma]), tipos, idioma)
            for tema, por_idioma in bx.GERAIS.items():
                self.assertIn(idioma, por_idioma, tema)
            self.assertTrue(bx.MODELOS_RECUSA[idioma])


if __name__ == "__main__":
    unittest.main()
