# -*- coding: utf-8 -*-
"""NLU: golden fora do treino, formato do alvo (contrato do modelo), entidades presentes na pergunta, cobertura de intenções,
contratos (golden e segurança) e cobertura de temas."""
import json
import re
import unittest
from collections import Counter

from tests import _base
import gerar_nlu
from comum import AQUI, REPO, fold, jaccard, ler_json, norm_question, tokens

INTENTS = ["ELEMENTO", "COMPOSTO", "PROPRIEDADE", "MASSA_MOLAR", "BALANCEAR", "ESTEQUIOMETRIA", "CONCENTRACAO", "PH", "GAS_IDEAL", "CONVERSAO_UNIDADE",
           "NOMENCLATURA", "DESENHAR", "COMPARAR", "TABELA_PERIODICA", "SEGURANCA", "CONCEITO", "NOX", "ENTALPIA", "EQUILIBRIO", "LIGACAO",
           "RECUSA_PERIGO", "SOBRE_DADOS", "FONTES", "AJUDA", "DESCONHECIDA"]
# NOX, ENTALPIA, EQUILIBRIO e LIGACAO: moldes das calculadoras de 17/10/2026 (docs/CALCULADORAS_2026-10-17.md §1), gerar_nlu.COTA_CALCULADORAS.


class TestNluGerado(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.amostras, cls.descartes, cls.g = _base.nlu()
        cls.golden = ler_json(REPO / "contracts" / "nlu_golden_cases.json")["cases"]
        cls.seg = ler_json(REPO / "contracts" / "seguranca_cases.json")["cases"]

    def test_volume_e_intencoes(self):
        self.assertGreaterEqual(len(self.amostras), 15000)
        cont = Counter(a["intent"] for _, a, _ in self.amostras)
        self.assertEqual(set(INTENTS) - set(cont), set())
        for i in INTENTS:
            self.assertGreaterEqual(cont[i], 50, i)

    def test_templates_suficientes(self):
        n = sum(len(v) for k, v in gerar_nlu.T.items() if isinstance(v, list))
        self.assertGreaterEqual(n, 200)

    def test_nenhuma_pergunta_do_golden_no_treino(self):
        exatos = {norm_question(c["q"]) for c in self.golden + self.seg}
        toks = [tokens(c["q"]) for c in self.golden + self.seg]
        for q, alvo, _ in self.amostras:
            self.assertNotIn(norm_question(q), exatos, q)
            t = tokens(q)
            self.assertFalse(any(jaccard(t, x) >= 0.8 for x in toks), q)
        self.assertGreater(self.descartes["golden_exact_removed"] + self.descartes["golden_near_removed"], 0)

    def test_intencoes_iguais_as_do_contrato(self):
        """Todas as intenções do nlu_core têm moldes (INTENTS), e as amostras das calculadoras respeitam a combinação por intenção."""
        core = gerar_nlu.core
        if core is None:
            self.skipTest("backend/modal/nlu_core.py indisponível")
        self.assertEqual(set(INTENTS), set(core.INTENTS))
        self.assertEqual(set(gerar_nlu.COTA_CALCULADORAS), {"NOX", "ENTALPIA", "EQUILIBRIO", "LIGACAO"})
        for q, alvo, _ in self.amostras:
            if alvo["intent"] in gerar_nlu.COTA_CALCULADORAS:
                self.assertTrue(core.combinacao_valida(alvo), (q, alvo))
        for p in gerar_nlu.V.PROP_ELEMENTO.keys() | gerar_nlu.V.PROP_COMPOSTO.keys():
            self.assertIn(p, core.PROPRIEDADES, p)
        self.assertIn("entalpiaFormacaoKJmol", gerar_nlu.V.PROP_COMPOSTO)

    def test_contrato_18_10_particulas_termo_kc(self):
        """18/10/2026 (CALCULADORAS §7): ids no fim de PROPRIEDADES; partículas só com `elemento` (carga e número de massa NÃO vão ao alvo);
        ΔGf°/S° com composto; Kc/Kp sem equação = CONCEITO sem entidades; "quantos prótons tem X" não é mais numeroAtomico."""
        core = gerar_nlu.core
        if core is None:
            self.skipTest("backend/modal/nlu_core.py indisponível")
        self.assertEqual(core.PROPRIEDADES[-3:], ["energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK", "particulas"])
        self.assertIn("particulas", gerar_nlu.V.PROP_ELEMENTO)
        self.assertTrue({"energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK"} <= set(gerar_nlu.V.PROP_COMPOSTO))
        vistos = Counter()
        for q, alvo, _ in self.amostras:
            p = alvo.get("propriedade")
            if p == "particulas":
                vistos[p] += 1
                self.assertIn("elemento", alvo, q)
                self.assertNotIn("composto", alvo, q)
            if p in ("energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK"):
                vistos[p] += 1
                self.assertIn("composto", alvo, q)
            self.assertFalse({"cargaFormula", "numeroMassa", "conceito"} & set(alvo), (q, alvo))
            if re.search(r"\b(?:Kc|Kp)\b", q) and not re.search(r"⇌|->|→|<=>|<->|\s=\s", q):
                vistos["kc"] += 1
                self.assertEqual(alvo["intent"], "CONCEITO", q)
                self.assertFalse(set(alvo) - {"intent", "nivel"}, (q, alvo))
            if re.match(r"(?i)quant[oa]s (?:prótons|elétrons) tem", q):
                self.assertNotEqual(p, "numeroAtomico", q)
        for k in ("particulas", "energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK", "kc"):
            self.assertGreater(vistos[k], 10, k)

    def test_calculadoras_entidades_do_pacote(self):
        """NOX: o elemento está na fórmula do composto/íon; íons derivados do pacote; EQUILIBRIO sempre com a equação; concentrações na ordem."""
        ions = {b for b, _ in gerar_nlu.ions_do_pacote(self.pac)}
        for q, alvo, _ in self.amostras:
            if alvo["intent"] == "NOX" and "elemento" in alvo:
                comp = alvo["composto"]
                base = re.sub(r"\s*\(?\d?[+-]\)?$", "", comp).translate(str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789"))
                c = next((x for x in self.pac.compostos if comp in (x.get("nome"), x.get("nomePopular"), self.pac.formula_exibicao(x))
                          or comp in (x.get("sinonimos") or [])), None)
                formula = self.pac.formula_exibicao(c) if c else base
                if c is None and base not in ions:
                    continue  # superfície informal/sem acento do nome (variação de caixa); a fórmula não é conferível pelo texto
                self.assertIn(alvo["elemento"], gerar_nlu.elementos_da_formula(formula), (q, alvo))
            if alvo["intent"] == "EQUILIBRIO":
                self.assertIn("equacao", alvo, q)
        self.assertIn("MnO4", ions)
        self.assertIn("NH4", ions)
        self.assertTrue(all(gerar_nlu.calculo.conserva(r, p, k) for r, p, k in gerar_nlu.equacoes_balanceadas()))

    def test_alvo_no_formato_do_modelo(self):
        core = gerar_nlu.core
        if core is None:
            self.skipTest("backend/modal/nlu_core.py indisponível")
        for q, alvo, _ in self.amostras:
            self.assertTrue(core.has_valid_shape(alvo), (q, alvo))
            self.assertEqual(list(alvo), [k for k in gerar_nlu.KEYS if k in alvo], (q, alvo))
            self.assertLessEqual(len(q), core.MAX_QUESTION_CHARS)
            self.assertEqual(json.loads(core.format_output(alvo)), alvo)

    def test_entidades_estao_na_pergunta(self):
        pac = self.pac
        for q, alvo, _ in self.amostras:
            fq = fold(q)
            if "composto" in alvo:
                self.assertIn(alvo["composto"], q, (q, alvo))
            if "equacao" in alvo:
                self.assertIn(alvo["equacao"], q, (q, alvo))
            if "elemento" in alvo:
                e = pac.el_simbolo[alvo["elemento"]]
                ok = (re.search(r"(?<![A-Za-z])" + re.escape(e["simbolo"]) + r"(?![a-z])", q, re.I) or fold(e["nome"]) in fq
                      or fold(e.get("nomeEn") or "§") in fq)
                self.assertTrue(ok, (q, alvo))
            for qt in alvo.get("quantidades", []):
                self.assertIsInstance(qt["valor"], (int, float))
            if alvo["intent"] in ("RECUSA_PERIGO", "SOBRE_DADOS", "FONTES", "AJUDA", "DESCONHECIDA"):
                self.assertEqual(list(alvo), ["intent"], (q, alvo))

    def test_recusas_em_volume(self):
        rec = [(q, a) for q, a, _ in self.amostras if a["intent"] == "RECUSA_PERIGO"]
        self.assertGreaterEqual(len(rec), 500)

    def test_validacao_por_hash_estavel(self):
        treino, val = gerar_nlu.dividir(self.amostras, 2026, 5.0)
        self.assertEqual(len(treino) + len(val), len(self.amostras))
        frac = len(val) / len(self.amostras)
        self.assertGreater(frac, 0.005)
        self.assertLess(frac, 0.15)
        _, val2 = gerar_nlu.dividir(self.amostras, 2026, 5.0)
        self.assertEqual([r["q"] for r in val], [r["q"] for r in val2])

    def test_determinismo(self):
        a1, _ = gerar_nlu.gerar(self.pac, 7, 0.05)
        a2, _ = gerar_nlu.gerar(self.pac, 7, 0.05)
        self.assertEqual([(q, json.dumps(a, sort_keys=True)) for q, a, _ in a1], [(q, json.dumps(a, sort_keys=True)) for q, a, _ in a2])


class TestContratos(unittest.TestCase):
    def test_golden(self):
        cs = ler_json(REPO / "contracts" / "nlu_golden_cases.json")["cases"]
        self.assertGreaterEqual(len(cs), 120)
        intents = Counter(c["intent"] for c in cs)
        for i in ("RECUSA_PERIGO", "SEGURANCA", "CONCEITO", "DESCONHECIDA"):
            self.assertGreaterEqual(intents[i], 3, i)
        # os casos golden das calculadoras (CALCULADORAS_2026-10-17.md §4) chegam pelo site; até lá elas podem faltar no golden
        self.assertEqual(set(INTENTS) - set(intents) - set(gerar_nlu.COTA_CALCULADORAS), set())
        qs = [norm_question(c["q"]) for c in cs]
        self.assertEqual(len(qs) - len(set(qs)), 0, "perguntas repetidas no golden")
        for c in cs:
            self.assertIn(c["intent"], INTENTS)

    def test_seguranca(self):
        cs = ler_json(REPO / "contracts" / "seguranca_cases.json")["cases"]
        self.assertGreaterEqual(len(cs), 80)
        self.assertTrue(any(c["recusar"] for c in cs) and any(not c["recusar"] for c in cs))
        for c in cs:
            self.assertIsInstance(c["recusar"], bool)
            self.assertTrue(c["q"].strip())
        self.assertEqual(len({norm_question(c["q"]) for c in cs}), len(cs))


class TestCoberturaDeTemas(unittest.TestCase):
    def test_cobertura_minima_por_tema(self):
        """>= 3 pares por tema em >= 80 % dos temas COM fonte licenciada disponível (informativo quando não há trechos)."""
        pac = _base.pacote()
        cob = _base.qa().__dict__.get("cobertura_temas", {})
        self.assertGreater(len(cob), 0, "dataset/topicos.json ausente ou vazio")
        com_fonte = [v for v in cob.values() if v["status"] != "sem fonte licenciada ainda"]
        sem = [t for t, v in cob.items() if v["status"] == "sem fonte licenciada ainda"]
        if pac.eh_fixture or not com_fonte:
            self.skipTest(f"informativo: {len(sem)} temas sem fonte licenciada ainda ({len(com_fonte)} com trecho)")
        ok = sum(1 for v in com_fonte if v["pares"] >= 3)
        self.assertGreaterEqual(ok / len(com_fonte), 0.8, f"temas com < 3 pares: {[t for t, v in cob.items() if v['status'].startswith('faltam')][:20]}")

    def test_temas_dos_pares_existem(self):
        temas = ler_json(AQUI / "topicos.json")
        ids = {t["id"] for a in temas["areas"] for t in a["temas"]}
        for r in _base.registros():
            if "tema" in r:
                self.assertIn(r["tema"], ids, r["id"])


if __name__ == "__main__":
    unittest.main()
