# -*- coding: utf-8 -*-
"""Família seguranca_pratica (20/10/2026): pedidos legítimos de segurança que o explicador tem de responder, nunca recusar."""
import json
import sys
import unittest
from collections import Counter
from pathlib import Path

from tests import _base
import fam_seguranca_pratica as fsp
from comum import REPO, jaccard, tokens
from dados_recusas import RECUSA_PADRAO

sys.path.insert(0, str(REPO / "backend" / "modal"))
import ask_core  # noqa: E402


class TestSegurancaPratica(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.regs = [r for r in _base.registros() if "seguranca_pratica." in r["geradoPor"]]
        cls.compostos = [r for r in cls.regs if r["geradoPor"].startswith("template:")]
        cls.gerais = [r for r in cls.regs if r["geradoPor"].startswith("autoria:")]

    def test_existe_e_e_do_tipo_seguranca(self):
        self.assertGreater(len(self.compostos), 20)
        total = sum(len(p) for _, p, _, _ in fsp.GERAIS)
        self.assertLessEqual(len(self.gerais), total)   # os quase iguais aos casos do gate saem em gerar_qa.filtrar_contra_casos_de_seguranca
        self.assertGreater(len(self.gerais), total * 0.7)
        for r in self.regs:
            self.assertEqual(r["tipo"], "seguranca", r["id"])
            self.assertTrue(r["id"].startswith("sp-"), r["id"])

    def test_nunca_recusa_nem_ensina_procedimento(self):
        """O motivo da família: o verificador do gate (ask_core) não pode ver recusa nem procedimento nestas respostas."""
        for r in self.regs:
            self.assertFalse(ask_core.e_recusa(r["resposta"]), (r["id"], r["resposta"][:120]))
            self.assertFalse(ask_core.ensina_producao(r["resposta"]), (r["id"], r["resposta"][:120]))
            self.assertNotEqual(r["resposta"], RECUSA_PADRAO, r["id"])

    def test_contexto_traz_os_numeros_da_resposta(self):
        """Pares por composto levam `contexto` (rótulo GHS, fórmula e massa molar): todo número da resposta está lá (fidelidade do explicador)."""
        for r in self.compostos:
            self.assertIn("contexto", r, r["id"])
            self.assertIn(f"CID {r['entidades']['compostos'][0]}", r["contexto"], r["id"])
            fontes = ask_core.texto_das_fontes(r["pergunta"], r["contexto"], [])
            self.assertEqual(ask_core.numeros_sem_fonte(r["resposta"], fontes), [], r["id"])

    def test_tipos_praticos_e_fatos(self):
        tipos = Counter(r["geradoPor"].split(".")[-1] for r in self.compostos)
        for t in fsp.MODELOS:
            self.assertGreater(tipos[t], 0, t)
        destaque = [c for c in fsp.elegiveis(self.pac) if c["cid"] in fsp.DESTAQUE]
        if destaque:  # a fixture pode não ter compostos de destaque
            for t in ("formula", "perigos"):
                self.assertGreater(tipos[f"fato_{t}"], 0, t)

    def test_classes_de_perigo(self):
        c = {"ghs": {"pictogramas": ["GHS02", "GHS05"], "frasesH": ["H331", "H411", "H302+H312"]}}
        self.assertEqual(fsp.classes_de_perigo(c), {"inflamavel", "corrosivo", "toxico", "inalacao", "ambiente", "nocivo"})
        self.assertEqual(fsp.classes_de_perigo({"ghs": {"frasesH": ["H201"]}}), {"explosivo"})

    def test_fora_dos_casos_do_contrato(self):
        """Nenhuma pergunta igual ou quase igual (Jaccard >= 0,8) às de contracts/seguranca_cases.json: o gate mede o que o treino não viu."""
        casos = json.loads((REPO / "contracts" / "seguranca_cases.json").read_text(encoding="utf-8"))["cases"]
        toks = [tokens(c["q"]) for c in casos]
        for r in self.regs:
            t = tokens(r["pergunta"])
            self.assertFalse(any(jaccard(t, x) >= 0.8 for x in toks), r["pergunta"])

    def test_textos_das_classes_sem_numeros_nem_imperativo(self):
        for tabela in (fsp.EPI, fsp.ARMAZ, fsp.DERRAM, fsp.PS, fsp.DESC):
            for k, texto in tabela.items():
                self.assertNotRegex(texto, r"\d", (k, texto))
                self.assertFalse(ask_core.ensina_producao(texto), (k, texto))
        for tema, perguntas, resposta, nivel in fsp.GERAIS:
            self.assertNotRegex(resposta, r"\d", tema)
            self.assertIn(nivel, ("fundamental", "medio", "superior"), tema)
            self.assertGreaterEqual(len(perguntas), 2, tema)


if __name__ == "__main__":
    unittest.main()
