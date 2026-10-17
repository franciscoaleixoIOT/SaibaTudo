# -*- coding: utf-8 -*-
"""Onda 2 (17/10/2026): correções de química em regras.json (revisão independente), chaves do cliente no manifesto vindas do
ambiente e o gancho das traduções automáticas (pipeline/traducoes/<fonte>.jsonl) no build."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import build  # noqa: E402
import fontes as F  # noqa: E402
import regras as R  # noqa: E402

REGRAS = R.montar("2026-10-17")


class SerieReatividadeTest(unittest.TestCase):
    def test_ordem_segue_o_potencial_padrao(self):
        serie = REGRAS["serieReatividadeMetais"]
        ordem = serie["ordem"]
        self.assertEqual(ordem[:4], ["Li", "Cs", "Rb", "K"])
        self.assertLess(ordem.index("Hg"), ordem.index("Ag"))  # Hg₂²⁺/Hg +0,7973 V < Ag⁺/Ag +0,7996 V
        self.assertEqual(ordem[-5:], ["Cu", "Hg", "Ag", "Pt", "Au"])
        pots = serie["potenciais"]
        self.assertEqual([p["simbolo"] for p in pots], ordem)
        valores = [p["E0V"] for p in pots]
        self.assertEqual(valores, sorted(valores), "a série tem de estar em ordem crescente de E°")
        e = {p["simbolo"]: p["E0V"] for p in pots}
        self.assertEqual((e["Li"], e["K"], e["Ba"], e["Sr"], e["Ca"], e["Na"]), (-3.0401, -2.931, -2.912, -2.899, -2.868, -2.71))
        self.assertEqual((e["Hg"], e["Ag"], e["H"]), (0.7973, 0.7996, 0.0))
        self.assertIn("oldid=", serie["fonte"]["url"])
        self.assertEqual(serie["fonte"]["licenca"], "CC BY-SA 4.0")
        self.assertIn("termodinâmica", serie["nota"])


class SolubilidadeTest(unittest.TestCase):
    def regra(self, rid):
        return next(r for r in REGRAS["solubilidade"]["regras"] if r["id"] == rid)

    def test_haletos_com_nota_dos_fluoretos(self):
        h = self.regra("haletos")
        self.assertTrue(h["regra"].startswith("Cloretos, brometos e iodetos"))
        self.assertNotIn("F-", h["ions"])
        for f in ("AgF", "CaF₂", "MgF₂", "SrF₂", "BaF₂", "PbF₂"):
            self.assertIn(f, h["nota"])

    def test_sulfatos_com_mercurio_I(self):
        s = self.regra("sulfatos")
        self.assertIn("Hg2 2+", s["excecoes"])
        self.assertIn("Hg₂²⁺", s["regra"])

    def test_hidroxidos_ba_sr_ca(self):
        texto = self.regra("hidroxidos")["regra"]
        self.assertIn("Ba(OH)₂ é solúvel", texto)
        self.assertIn("Sr(OH)₂ é moderadamente solúvel", texto)
        self.assertIn("Ca(OH)₂ é pouco solúvel", texto)

    def test_tabela_de_bases_pouco_soluveis(self):
        tab = {b["formula"]: b for b in REGRAS["solubilidadeBases"]}
        self.assertEqual(set(tab), {"Ca(OH)2", "Mg(OH)2", "Sr(OH)2", "Ba(OH)2"})
        for f, b in tab.items():
            self.assertGreater(b["solubilidadeMolL"], 0, f)
            self.assertIsInstance(b["temperaturaC"], (int, float), f)
            self.assertEqual(set(b["fonte"]), {"nome", "url", "licenca"}, f)
            self.assertIn("oldid=", b["fonte"]["url"], f)
            self.assertEqual(b["fonte"]["licenca"], "CC BY-SA 4.0", f)
        self.assertEqual(tab["Ca(OH)2"]["kps"], 5.02e-6)
        self.assertEqual(tab["Mg(OH)2"]["kps"], 5.61e-12)
        self.assertAlmostEqual(tab["Ca(OH)2"]["solubilidadeMolL"], 1.73 / 74.093, places=4)
        # ordem esperada: Mg ≪ Ca < Sr < Ba
        s = {f: b["solubilidadeMolL"] for f, b in tab.items()}
        self.assertLess(s["Mg(OH)2"], s["Ca(OH)2"])
        self.assertLess(s["Ca(OH)2"], s["Sr(OH)2"])
        self.assertLess(s["Sr(OH)2"], s["Ba(OH)2"])
        # Mg(OH)₂: o Kps e a solubilidade medida concordam (s = (Kps/4)^(1/3))
        self.assertAlmostEqual((5.61e-12 / 4) ** (1 / 3) / s["Mg(OH)2"], 1.0, delta=0.05)

    def test_bases_fortes_nota_do_estroncio(self):
        b = {x["formula"]: x for x in REGRAS["basesFortes"]}
        self.assertIn("moderadamente", b["Sr(OH)2"]["nota"])


class NomenclaturaEAguaTest(unittest.TestCase):
    def test_sufixo_oico_sem_acento(self):
        acido = next(x for x in REGRAS["nomenclatura"]["sufixosOrganicos"] if x["funcao"] == "ácido carboxílico")
        self.assertEqual(acido["sufixo"], "-oico")
        texto = json.dumps(REGRAS, ensure_ascii=False)
        self.assertNotIn("óico", texto)

    def test_ions_hidron_e_oxonio(self):
        ions = {i["formula"]: i["nome"] for i in REGRAS["nomenclatura"]["ions"]}
        self.assertIn("hidron", ions["H⁺"])
        self.assertIn("próton", ions["H⁺"])
        self.assertTrue(ions["H₃O⁺"].startswith("oxônio"))
        self.assertIn("hidrônio", ions["H₃O⁺"])
        self.assertIn("Hg₂²⁺", ions)

    def test_pkw(self):
        a = REGRAS["agua"]
        self.assertEqual((a["pKw"], a["temperaturaC"]), (14.00, 25))
        self.assertAlmostEqual(a["pKw25CPreciso"], 13.997)
        tab = {x["temperaturaC"]: x["pKw"] for x in a["pKwPorTemperatura"]}
        self.assertEqual(sorted(tab), [0, 10, 20, 25, 30, 40, 50])
        self.assertEqual(tab[25], a["pKw25CPreciso"])
        valores = [tab[t] for t in sorted(tab)]
        self.assertEqual(valores, sorted(valores, reverse=True), "pKw cai com a temperatura entre 0 e 50 °C")
        self.assertIn("oldid=", a["fonte"]["url"])

    def test_fontes_das_tabelas_novas(self):
        urls = [f["url"] for f in REGRAS["fontes"]]
        self.assertTrue(any("Standard_electrode_potential" in u for u in urls))
        self.assertTrue(any("Self-ionization_of_water" in u for u in urls))
        self.assertTrue(any("Calcium_hydroxide" in u for u in urls))
        self.assertIn("wikipedia-en-dados", F.POR_ID)
        self.assertEqual(F.POR_ID["wikipedia-en-dados"]["uso"], "dados")


class ManifestoClienteTest(unittest.TestCase):
    def montar(self, ambiente):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / "a.json").write_text("{}", encoding="utf-8")
            from datetime import datetime, timezone
            return build.montar_manifest(out, ["a.json"], [], {}, "2026-10-17", datetime(2026, 10, 17, tzinfo=timezone.utc),
                                         ambiente=ambiente)

    def test_desligado_por_padrao(self):
        c = self.montar({})["cliente"]
        self.assertEqual((c["ask"]["enabled"], c["melhoria"]["enabled"]), (False, False))
        self.assertEqual(c["nlu"]["endpoint"], "https://saibatudo.net/quimica/api/nlu")

    def test_ligado_pelo_ambiente(self):
        c = self.montar({"SAIBATUDO_MELHORIA_ENABLED": "1", "SAIBATUDO_ASK_ENABLED": "true"})["cliente"]
        self.assertEqual((c["ask"]["enabled"], c["melhoria"]["enabled"]), (True, True))
        c = self.montar({"SAIBATUDO_MELHORIA_ENABLED": "0", "SAIBATUDO_ASK_ENABLED": ""})["cliente"]
        self.assertEqual((c["ask"]["enabled"], c["melhoria"]["enabled"]), (False, False))
        c = self.montar({"SAIBATUDO_MELHORIA_ENABLED": " On "})["cliente"]
        self.assertEqual((c["ask"]["enabled"], c["melhoria"]["enabled"]), (False, True))

    def test_nome_das_variaveis_igual_ao_workflow(self):
        wf = Path(__file__).resolve().parents[4] / ".github" / "workflows" / "quimica-data-refresh.yml"
        if not wf.exists():
            self.skipTest("workflow fora do repositório")
        texto = wf.read_text(encoding="utf-8")
        self.assertIn("SAIBATUDO_MELHORIA_ENABLED:", texto)
        self.assertIn("SAIBATUDO_ASK_ENABLED:", texto)


def _h(txt):
    return hashlib.sha256(txt.encode("utf-8")).hexdigest()


class TraducoesTest(unittest.TestCase):
    def reg(self, i, texto, titulo="Lecture I"):
        return {"id": f"gutenberg-14474-x-{i:03d}", "titulo": titulo, "textoOriginal": texto, "textoPt": None, "traducao": "pendente",
                "idioma": "en", "fontes": [{"nome": "Project Gutenberg #14474", "url": "https://www.gutenberg.org/ebooks/14474",
                                            "licenca": "domínio público", "acessadoEm": "2026-10-17"}]}

    def test_aplica_quando_o_hash_bate_e_ignora_quando_mudou(self):
        a, b, c = "Here is a candle burning in the air.", "Water is composed of hydrogen and oxygen.", "Carbon burns."
        regs = [self.reg(1, a), self.reg(2, b), self.reg(3, c), dict(self.reg(4, "Já em português."), traducao="não se aplica")]
        with tempfile.TemporaryDirectory() as tmp:
            linhas = [
                {"id": regs[0]["id"], "hash": _h(a), "titulo": "Conferência I", "texto": "Eis uma vela queimando no ar.",
                 "idiomaOrigem": "en", "modelo": "qwen3.8-max", "data": "2026-10-16", "traducao": "automatica"},
                {"id": regs[1]["id"], "hash": _h("texto antigo, diferente"), "titulo": "Conferência I", "texto": "A água ...",
                 "idiomaOrigem": "en", "modelo": "qwen3.8-max", "data": "2026-10-16", "traducao": "automatica"},
                {"id": regs[3]["id"], "hash": _h("Já em português."), "titulo": "x", "texto": "não deve entrar", "modelo": "m"},
            ]
            texto = "\n".join(json.dumps(x, ensure_ascii=False) for x in linhas) + "\n{linha quebrada\n\n"
            (Path(tmp) / "gutenberg-14474.jsonl").write_text(texto, encoding="utf-8")
            st = build.aplicar_traducoes(regs, "gutenberg-14474", tmp)
        self.assertEqual(st, {"aplicadas": 1, "hashDivergente": 1, "semTraducao": 1})
        r = regs[0]
        self.assertEqual(r["textoPt"], "Eis uma vela queimando no ar.")
        self.assertEqual(r["textoOriginal"], a)  # original preservado
        self.assertEqual((r["traducao"], r["traducaoModelo"], r["traducaoData"], r["idiomaOriginal"], r["idioma"]),
                         ("automatica", "qwen3.8-max", "2026-10-16", "en", "en"))
        self.assertEqual((r["titulo"], r["tituloPt"]), ("Lecture I", "Conferência I"))
        self.assertIn("traduzido automaticamente", r["fontes"][0]["nome"])
        self.assertEqual(r["fontes"][0]["licenca"], "domínio público")
        self.assertNotIn("traduzido", regs[1]["fontes"][0]["nome"])
        for x in regs[1:3]:  # hash divergente e sem tradução: continuam pendentes, sem campos novos
            self.assertEqual((x["traducao"], x["textoPt"]), ("pendente", None))
            self.assertNotIn("traducaoModelo", x)
        self.assertEqual(regs[3]["textoPt"], None)  # só pendentes recebem tradução

    def test_sem_arquivo_ou_sem_pasta(self):
        regs = [self.reg(1, "Some text in English here.")]
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(build.aplicar_traducoes(regs, "chebi", tmp), {"aplicadas": 0, "hashDivergente": 0, "semTraducao": 1})
        self.assertEqual(build.aplicar_traducoes(regs, "chebi", None)["aplicadas"], 0)
        self.assertEqual(regs[0]["traducao"], "pendente")

    def test_chebi_nunca_recebe_tituloPt_mesmo_quando_a_linha_traz_outro_titulo(self):
        # cache por hash: definições iguais compartilham a linha, e o título da linha pode ser de OUTRO composto (visto em 17/10: "Asparagina" × "N-óxido de trimetilamina")
        regs = [{"id": "chebi-58048", "titulo": "Asparagina", "textoOriginal": "An amino acid.", "textoPt": None, "traducao": "pendente", "idioma": "en"}]
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "chebi.jsonl").write_text(json.dumps({"id": "chebi-58048", "hash": _h("An amino acid."), "titulo": "N-óxido de trimetilamina",
                                                              "texto": "Um aminoácido.", "idiomaOrigem": "en", "modelo": "qwen3.8-max", "data": "2026-10-16",
                                                              "traducao": "automatica"}), encoding="utf-8")
            build.aplicar_traducoes(regs, "chebi", tmp)
        self.assertEqual(regs[0]["textoPt"], "Um aminoácido.")
        self.assertNotIn("tituloPt", regs[0])
        self.assertEqual(regs[0]["titulo"], "Asparagina")

    def test_chebi_mantem_titulo_igual_sem_tituloPt(self):
        regs = [{"id": "chebi-1", "titulo": "Metoclopramida", "textoOriginal": "A member of the benzamides.", "textoPt": None,
                 "traducao": "pendente", "idioma": "en"}]
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "chebi.jsonl").write_text(json.dumps({"id": "chebi-1", "hash": _h("A member of the benzamides."),
                                                              "titulo": "Metoclopramida", "texto": "Um membro das benzamidas.",
                                                              "idiomaOrigem": "en", "modelo": "qwen3.8-max", "data": "2026-10-16",
                                                              "traducao": "automatica"}), encoding="utf-8")
            build.aplicar_traducoes(regs, "chebi", tmp)
        self.assertEqual(regs[0]["textoPt"], "Um membro das benzamidas.")
        self.assertNotIn("tituloPt", regs[0])

    def test_validar_exige_campos_da_traducao_automatica(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out / "textos").mkdir()
            t = {"id": "chebi-1", "fonte": "ChEBI", "licenca": "CC BY 4.0", "url": "https://x", "textoOriginal": "A member of the benzamides.",
                 "traducao": "automatica", "textoPt": "Um membro.", "fontes": [{}]}
            (out / "textos" / "a.json").write_text(json.dumps([t]), encoding="utf-8")
            build.dump_json(out / "manifest.json", {"files": {}})
            m = {"files": {"textos/a.json": {"bytes": (out / "textos" / "a.json").stat().st_size,
                                             "sha256": build.sha256_file(out / "textos" / "a.json")}}}
            build.dump_json(out / "manifest.json", m)
            erros = [e for e in build.validar(out) if "chebi-1" in e]
            self.assertTrue(any("tradução automática" in e for e in erros), erros)
            t.update(traducaoModelo="qwen3.8-max", idiomaOriginal="en")
            (out / "textos" / "a.json").write_text(json.dumps([t]), encoding="utf-8")
            m["files"]["textos/a.json"] = {"bytes": (out / "textos" / "a.json").stat().st_size, "sha256": build.sha256_file(out / "textos" / "a.json")}
            build.dump_json(out / "manifest.json", m)
            self.assertFalse([e for e in build.validar(out) if "chebi-1" in e and "tradução" in e])


if __name__ == "__main__":
    unittest.main()
