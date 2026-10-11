# -*- coding: utf-8 -*-
"""Ampliação do dataset (PENDENCIAS §8.2, 10/10/2026): comparações, segurança do rótulo, conceitos dos textos em português, escopo,
variantes de linguagem e nomes populares — cada família conferida contra o PACOTE (nada de memória) e as metas da §8.2."""
import re
import sys
import unittest
from collections import Counter
from decimal import Decimal

from tests import _base
import dados_escopo
import fam_comparacoes
import fam_conceitos_texto
import ghs_pt
import vocab_nlu
from comum import REPO, fold, formula_sem_subscrito, norm_question
from nomes_populares import NOMES_POPULARES, evidencia_ok
from qa_base import id_alinhado, lado_holdout

sys.path.insert(0, str(REPO / "backend" / "modal"))
try:
    import ask_core  # noqa: E402
except Exception:  # pragma: no cover
    ask_core = None


def ws(s):
    return re.sub(r"\s+", " ", s or "").strip()


def D(x):
    return Decimal(str(x))


class TestComparacoes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.regs = [r for r in _base.registros() if r["geradoPor"].startswith("template:comparacao.")]

    def test_ha_pares_trios_e_extremos_de_grupo_e_periodo(self):
        if self.pac.eh_fixture:
            self.skipTest("fixture pequena")
        tipos = Counter((r["geradoPor"].split(".")[1], r["comparacao"]["eixo"]) for r in self.regs)
        for k in [("par", "grupo"), ("par", "periodo"), ("trio", "grupo"), ("trio", "periodo"), ("extremo", "grupo"), ("extremo", "periodo")]:
            self.assertGreater(tipos[k], 10, k)
        self.assertGreaterEqual(len(self.regs), 1000)

    def test_o_valor_do_pacote_decide(self):
        el = self.pac.el_simbolo
        for r in self.regs:
            c = r["comparacao"]
            campo, eixo = c["campo"], c["eixo"]
            if "vencedor" in c and "chave" not in c:  # par
                a, b = (el[s] for s in c["elementos"])
                self.assertTrue(a.get(campo) is not None and b.get(campo) is not None, r["id"])
                self.assertEqual(a.get(eixo), b.get(eixo), (r["id"], "mesmo grupo/período"))
                if D(a[campo]) == D(b[campo]):
                    self.assertIsNone(c["vencedor"], r["id"])
                    continue
                maior, menor = (a, b) if D(a[campo]) > D(b[campo]) else (b, a)
                esperado = maior if c["sentido"] == "maior" else menor
                self.assertEqual(c["vencedor"], esperado["simbolo"], r["id"])
                self.assertTrue(r["resposta"].startswith(f"{fam_comparacoes.cap(fam_comparacoes.o_el(esperado))} ({esperado['simbolo']})"), r["id"])
            elif "resultado" in c:  # trio
                valores = [D(el[s][campo]) for s in c["resultado"]]
                self.assertEqual(valores, sorted(valores, reverse=c["ordem"] == "decrescente"), r["id"])
                self.assertEqual(len({el[s][eixo] for s in c["resultado"]}), 1, r["id"])
            else:  # extremo
                membros = [e for e in self.pac.elementos if e.get(eixo) == c["chave"] and e.get(campo) is not None]
                alvo = (max if c["sentido"] == "maior" else min)(membros, key=lambda e: D(e[campo]))
                self.assertEqual(c["vencedor"], alvo["simbolo"], r["id"])
                sem = sorted(e["simbolo"] for e in self.pac.elementos if e.get(eixo) == c["chave"] and e.get(campo) is None)
                self.assertEqual(sorted(c["semValor"]), sem, r["id"])

    def test_tendencia_so_citada_literalmente_do_trecho(self):
        for r in self.regs:
            if "Tendência geral" not in r["resposta"]:
                continue
            citada = re.search(r"“([^”]+)”", r["resposta"]).group(1)
            trechos = [f for f in r["fontes"] if f.get("id")]
            self.assertEqual(len(trechos), 1, r["id"])
            t = self.pac.textos[trechos[0]["id"]]
            self.assertIn(ws(citada), ws(t.get("textoPt")), r["id"])
            self.assertTrue(trechos[0].get("url") and "BY-SA" in trechos[0]["licenca"], r["id"])


class TestSegurancaDoRotulo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.regs = [r for r in _base.registros() if r["geradoPor"].startswith("template:seguranca_rotulo.")]

    def test_frases_pictogramas_e_contexto_vem_do_pacote(self):
        self.assertGreater(len(self.regs), 0)
        for r in self.regs:
            cid = r["entidades"]["compostos"][0]
            g = self.pac.comp_cid[cid]["ghs"]
            self.assertIn(f"CID {cid}", r["contexto"], r["id"])
            if r["geradoPor"].endswith("frase_h"):
                h = re.search(r"A frase (H\d{3}[\w+]*)", r["resposta"]).group(1)  # inclui combinações "H302+H332"
                self.assertIn(h, g["frasesH"], r["id"])
                self.assertIn(f"“{ghs_pt.expandir_h(h)}”", r["resposta"], r["id"])
            elif r["geradoPor"].endswith("pictograma"):
                p = re.search(r"pictograma (GHS\d\d)", r["resposta"]).group(1)
                self.assertIn(p, g["pictogramas"], r["id"])
            elif r["geradoPor"].endswith("cuidados_sem_frases_p"):
                self.assertNotRegex(r["resposta"], r"\bP\d{3}\b", r["id"])  # nenhuma frase P inventada
                self.assertIn("FDS/FISPQ", r["resposta"])

    def test_sem_instrucoes_de_redacao_do_anexo_iii(self):
        for r in _base.registros():
            if r["tipo"] in ("seguranca", "fato"):
                self.assertNotRegex(r["resposta"], r"<indicar|<ou indicar", r["id"])
        self.assertEqual(ghs_pt.limpar_frase("Pode provocar cancro <indicar a via de exposição>."), "Pode provocar cancro.")
        self.assertEqual(ghs_pt.limpar_frase("Afecta os órgãos <ou indicar todos> após exposição <indicar a via>."),
                         "Afecta os órgãos após exposição.")

    def test_meta_seguranca(self):
        if self.pac.eh_fixture:
            self.skipTest("metas valem para o pacote real")
        # meta da §8.2 sem contar as variantes de linguagem (que repetem respostas)
        self.assertGreaterEqual(sum(1 for r in _base.registros() if r["tipo"] == "seguranca" and not r["geradoPor"].startswith("variante:")), 1500)


class TestConceitosDosTextos(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.regs = [r for r in _base.registros() if r["geradoPor"].startswith("texto:conceito.")]

    def test_recorte_literal_em_frases_completas_com_atribuicao(self):
        for r in self.regs:
            textos = [ws(self.pac.textos[f["id"]].get("textoPt") or "") for f in r["fontes"]]
            if len(textos) == 1:
                self.assertIn(ws(r["resposta"]), textos[0], r["id"])
            else:  # diferença entre dois artigos: definição de A (do texto A) + definição de B (do texto B)
                cortes = [m.end() for m in re.finditer(r"[.!?][\"”»)]? ", r["resposta"])]
                self.assertTrue(any(ws(r["resposta"][:i]) in textos[0] and ws(r["resposta"][i:]) in textos[1] for i in cortes), r["id"])
            self.assertRegex(r["resposta"], r"[.!?][\"”»)]?$", r["id"])
            self.assertLessEqual(len(r["resposta"]), fam_conceitos_texto.LIMITE_EXPL + 20, r["id"])
            for f in r["fontes"]:
                self.assertIn("BY-SA", f["licenca"])
                self.assertTrue(f.get("url") and f.get("alteracoes"), r["id"])

    def test_seguranca_dos_recortes(self):
        for r in self.regs:
            self.assertIsNone(fam_conceitos_texto._PRODUCAO.search(r["resposta"]), r["id"])
            self.assertIsNone(fam_conceitos_texto._GUERRA.search(r["resposta"]), r["id"])
            self.assertIsNone(fam_conceitos_texto._SENSIVEL_FRASE.search(fold(r["resposta"])), r["id"])
            if ask_core is not None:
                self.assertFalse(ask_core.ensina_producao(r["resposta"]), r["id"])
        for t in self.pac.textos.values():
            frases = fam_conceitos_texto.dividir_frases(t.get("textoPt") or "")
            if t.get("_pasta") in fam_conceitos_texto.PASTAS and fam_conceitos_texto.artigo_sensivel(t, frases[0] if frases else ""):
                self.assertFalse(any(r["fontes"][0]["id"] == t["id"] for r in self.regs), t["id"])

    def test_pares_do_mesmo_trecho_do_mesmo_lado_do_holdout(self):
        for r in self.regs:
            self.assertEqual(lado_holdout(r["id"]), lado_holdout(r["fontes"][0]["id"]), r["id"])
        if ask_core is not None:
            for k in ("a", "ct-def-x", "wikipedia-pt-acido-001", "co-1-v"):
                self.assertEqual(lado_holdout(k), ask_core.eh_holdout(k, 20))
        self.assertEqual(lado_holdout(id_alinhado("abc", "wikipedia-pt-mol-001")), lado_holdout("wikipedia-pt-mol-001"))

    def test_meta_conceitos(self):
        if self.pac.eh_fixture:
            self.skipTest("metas valem para o pacote real")
        self.assertGreaterEqual(sum(1 for r in _base.registros() if r["tipo"] == "conceito" and not r["geradoPor"].startswith("variante:")), 2000)


class TestEscopo(unittest.TestCase):
    def test_resposta_de_limite_sem_numero_e_sem_recusa(self):
        regs = [r for r in _base.registros() if r["geradoPor"].startswith("template:escopo.")]
        self.assertGreater(len(regs), 50)
        for r in regs:
            self.assertEqual(r["tipo"], "fato")
            self.assertIn(r["resposta"], dados_escopo.RESPOSTAS.values())
            self.assertNotRegex(r["resposta"], r"\d")

    def test_perguntas_nao_tratam_de_quimica_do_mapa_nem_de_constante_do_pacote(self):
        temas = [fold(t) for t in vocab_nlu.TOPICOS if len(t) >= 6 or " " in t]
        constantes = [fold(c.get("nome") or "") for c in _base.pacote().constantes]
        for area, perguntas in dados_escopo.AREAS.items():
            if area == "dever":
                continue  # pedir o dever inteiro de química é escopo de química, com resposta de limite
            for q in perguntas:
                fq = fold(q)
                self.assertFalse([t for t in temas if re.search(r"(?<![a-z])" + re.escape(t) + r"(?![a-z])", fq)], q)
                self.assertFalse([c for c in constantes if c and c in fq], q)


class TestVariantesENomesPopulares(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pac = _base.pacote()
        cls.regs = _base.registros()
        cls.por_id = {r["id"]: r for r in cls.regs}
        cls.var = [r for r in cls.regs if r["geradoPor"].startswith("variante:")]

    def test_variante_tem_a_resposta_do_original_e_o_mesmo_lado(self):
        self.assertGreater(len(self.var), 0)
        for r in self.var:
            o = self.por_id[r["origem"]]
            self.assertEqual((r["tipo"], r["entidades"], r["numeros"]), (o["tipo"], o["entidades"], o["numeros"]), r["id"])
            self.assertTrue(r["resposta"].endswith(o["resposta"]), r["id"])
            self.assertNotEqual(norm_question(r["pergunta"]), norm_question(o["pergunta"]), r["id"])
            self.assertEqual(lado_holdout(r["id"]), lado_holdout(o["id"]), r["id"])
            if r["geradoPor"] == "variante:subscrito":
                self.assertRegex(r["pergunta"], r"[₀-₉]", r["id"])
                self.assertEqual(norm_question(formula_sem_subscrito(r["pergunta"])), norm_question(o["pergunta"]), r["id"])

    def test_fracao_de_variantes(self):
        n = Counter(r["geradoPor"] for r in self.var)
        base = sum(1 for r in self.regs if not r["geradoPor"].startswith("variante:"))
        self.assertLessEqual((n["variante:informal"] + n["variante:subscrito"]) / base, 0.06)

    def test_nomes_populares_conferidos_no_pacote(self):
        if self.pac.eh_fixture:
            self.skipTest("os CIDs da tabela são do pacote real")
        for alias, cid, g, tipo, evidencia, _ in NOMES_POPULARES:
            self.assertTrue(evidencia_ok(self.pac, evidencia, alias), (alias, evidencia))
        for r in self.var:
            if r["geradoPor"] == "variante:nome_popular":
                self.assertIn(fold(r["nomePopular"]), fold(r["pergunta"]), r["id"])


class TestNluAmpliado(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.amostras, _, _ = _base.nlu()

    def test_variantes_escopo_e_comparacoes_no_nlu(self):
        por_q = {q: a for q, a, _ in self.amostras}
        self.assertTrue(any(re.search(r"[₀-₉]", a.get("composto", "") + a.get("equacao", "")) for a in por_q.values()))
        self.assertTrue(any(re.search(r"\b(?:oq|vc|eh|pq|qnts)\b", q) for q in por_q))
        desc = {norm_question(q) for q, a in por_q.items() if a["intent"] == "DESCONHECIDA"}
        ajuda = {norm_question(q) for q, a in por_q.items() if a["intent"] == "AJUDA"}
        self.assertGreater(sum(norm_question(q) in desc for q in dados_escopo.FISICA + dados_escopo.BIOLOGIA + dados_escopo.MATEMATICA), 50)
        self.assertGreater(sum(norm_question(q) in ajuda for q in dados_escopo.DEVER), 10)
        adj = [a for q, a in por_q.items() if a["intent"] == "COMPARAR" and re.search(r"mais (?:eletronegativo|denso)", q)]
        self.assertTrue(adj and all("propriedade" in a for a in adj))


if __name__ == "__main__":
    unittest.main()
