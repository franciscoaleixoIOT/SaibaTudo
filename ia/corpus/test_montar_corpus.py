# -*- coding: utf-8 -*-
"""Testes do corpus único do NLU (ia/corpus). Rodar da raiz:  python -I -m unittest discover -s ia/corpus -p "test_*.py"

Se ia/corpus/out/ não existir (ou estiver incompleto), o corpus é montado uma vez (~1 min, só CPU).
"""
import importlib.util
import json
import os
import random
import re
import sys
import unittest
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
OUT = Path(os.environ["CORPUS_OUT"]) if os.environ.get("CORPUS_OUT") else AQUI / "out"  # CORPUS_OUT=ia/corpus/out/v34 testa outro corpus
ESTRANGEIROS = ["en", "es", "de", "fr"]
ENTIDADES_QUIMICA = ["elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino"]
# Intenções das calculadoras (17/10/2026, apps/quimica/docs/CALCULADORAS_2026-10-17.md §1): desde o v3.5 têm famílias no corpus nos 5 idiomas.
INTENCOES_CALCULADORAS = ("NOX", "ENTALPIA", "EQUILIBRIO", "LIGACAO")


def _mod(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


MC = _mod("montar_corpus_t", AQUI / "montar_corpus.py")
VM = _mod("verificar_modulo_t", AQUI / "quimica_idiomas" / "verificar_modulo.py")


def _ler_jsonl(p):
    return [json.loads(x) for x in Path(p).read_text(encoding="utf-8").splitlines() if x.strip()]


class Corpus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        arquivos = ["corpus_nlu.jsonl", "train.json", "val.json", "holdout_eleicoes.json", "holdout_quimica.json", "contagens.json"]
        if not all((OUT / a).exists() for a in arquivos):
            MC.montar(MC.argparse.Namespace(idiomas=",".join(ESTRANGEIROS), escala=1.0, teto_intencao_quimica_pt=2400, val_pct_quimica=3.0,
                                            linha_idioma_quimica=False))
        cls.corpus = _ler_jsonl(OUT / "corpus_nlu.jsonl")
        cls.train = json.loads((OUT / "train.json").read_text(encoding="utf-8"))
        cls.val = json.loads((OUT / "val.json").read_text(encoding="utf-8"))
        cls.hold = {a: json.loads((OUT / f"holdout_{a}.json").read_text(encoding="utf-8"))["cases"] for a in ("eleicoes", "quimica")}
        cls.cont = json.loads((OUT / "contagens.json").read_text(encoding="utf-8"))
        cls.bq = MC.modulos_quimica()
        cls.qcore = cls.bq.nlu
        cls.ecore = MC.nlu_core_eleicoes()
        cls.testes = MC.perguntas_de(MC.TESTES_ELEICOES + MC.TESTES_QUIMICA) + [c["q"] for c in cls.hold["eleicoes"]]
        cls.filtro = MC.FiltroDeTeste(cls.testes)

    # -- formato -------------------------------------------------------------------------------------------
    def test_formato_unico(self):
        campos = {"app", "idioma", "tarefa", "entrada", "saida", "fonte", "licenca", "origem", "divisao"}
        for r in self.corpus:
            self.assertEqual(set(r), campos)
            self.assertEqual(r["tarefa"], "nlu")
            self.assertIn(r["app"], ("eleicoes2026", "quimica"))
            self.assertIn(r["origem"], ("template", "externo", "holdout"))
            self.assertIn(r["divisao"], ("treino", "val", "holdout"))
            self.assertTrue(r["fonte"] and r["licenca"])
            json.loads(r["saida"])

    def test_instruction_e_o_prompt_de_producao(self):
        com_linha = self.cont["config"]["linha_idioma_quimica"]
        esperado = {"eleicoes2026": self.ecore.SYSTEM_PROMPT_V2,
                    "quimica": self.qcore.SYSTEM_PROMPT + ((" " + MC.LINHA_IDIOMA_QUIMICA) if com_linha else "")}
        for ex in self.train + self.val:
            self.assertEqual(ex["instruction"], esperado[ex["app"]])
            for k in ("instruction", "input", "output"):
                self.assertIsInstance(ex[k], str)
        if not com_linha:
            self.assertEqual(esperado["quimica"], self.qcore.SYSTEM_PROMPT)

    # -- rótulos ---------------------------------------------------------------------------------------------
    def test_rotulos_validos_pelo_contrato(self):
        for r in self.corpus:
            if r["app"] == "eleicoes2026":
                self.assertTrue(MC.rotulo_valido_eleicoes(self.ecore, r["saida"]), r)
            else:
                self.assertTrue(MC.rotulo_valido_quimica(self.qcore, r["saida"]), r)
        for c in self.hold["quimica"]:
            alvo = {k: v for k, v in c.items() if k in self.qcore.KEYS and v is not None}
            self.assertTrue(self.qcore.has_valid_shape(alvo), c)
        for c in self.hold["eleicoes"]:
            self.assertIn(c["intent"], self.ecore.INTENTS)

    def test_quimica_entidades_copiadas_da_pergunta(self):
        """composto e equação são o texto copiado: aparecem na pergunta exatamente como no rótulo (erros de digitação só fora das entidades)."""
        for r in self.corpus:
            if r["app"] != "quimica":
                continue
            alvo = json.loads(r["saida"])
            for k in ("composto", "equacao"):
                if k in alvo and r["origem"] == "template" and r["idioma"] != "pt-BR":
                    self.assertIn(alvo[k], r["entrada"], r)

    # -- testes fora do treino -----------------------------------------------------------------------------
    def test_nenhum_caso_de_teste_no_treino(self):
        for ex in self.train + self.val:
            self.assertIsNone(self.filtro.veredito(ex["input"]), ex["input"])

    def test_filtro_indexado_igual_a_forca_bruta(self):
        conj = [MC.tokens(q) for q in self.testes]
        exatas = {MC.norm_question(q) for q in self.testes}
        amostra = random.Random(7).sample(self.train, 1500) + [{"input": q} for q in random.Random(8).sample(self.testes, 200)]
        for ex in amostra:
            t = MC.tokens(ex["input"])
            bruto = MC.norm_question(ex["input"]) in exatas or any(MC.jaccard(t, c) >= MC.JACCARD_QUASE_IGUAL for c in conj)
            self.assertEqual(bruto, self.filtro.veredito(ex["input"]) is not None, ex["input"])

    def test_holdout_nunca_treina(self):
        entradas = {MC.chave_texto(ex["input"]) for ex in self.train + self.val}
        for app, casos in self.hold.items():
            for c in casos:
                self.assertNotIn(MC.chave_texto(c["q"]), entradas, (app, c["q"]))

    # -- duplicatas e contagens ----------------------------------------------------------------------------
    def test_sem_duplicatas(self):
        chaves = Counter((ex["app"], MC.chave_texto(ex["input"])) for ex in self.train + self.val)
        dup = [k for k, n in chaves.items() if n > 1]
        self.assertEqual(dup, [])

    def test_contagens_batem(self):
        c = self.cont
        self.assertEqual(c["total"], len(self.corpus))
        self.assertEqual(c["treino"], len(self.train))
        self.assertEqual(c["val"], len(self.val))
        extras = sum(len(json.loads(a.read_text(encoding="utf-8"))["cases"]) for a in [*OUT.glob("holdout_v34_*.json"), *OUT.glob("holdout_v35_*.json")]
                     if a.name != "holdout_v34_revisor.json")  # conjuntos do v3.4 e do v3.5 (o do revisor é externo ao montador)
        self.assertEqual(c["holdout"], sum(len(v) for v in self.hold.values()) + extras)
        for app, a in c["por_app"].items():
            regs = [r for r in self.corpus if r["app"] == app]
            self.assertEqual(a["total"], len(regs))
            for idioma, i in a["por_idioma"].items():
                ri = [r for r in regs if r["idioma"] == idioma]
                self.assertEqual(i["total"], len(ri))
                self.assertEqual(i["por_intencao"], dict(sorted(Counter(json.loads(r["saida"])["intent"] for r in ri).items())))
                self.assertEqual(i["por_divisao"], dict(sorted(Counter(r["divisao"] for r in ri).items())))
            self.assertEqual(a["por_origem"], dict(sorted(Counter(r["origem"] for r in regs).items())))
        por_app_tr = Counter(ex["app"] for ex in self.train)
        for app, n in por_app_tr.items():
            self.assertEqual(n, c["por_app"][app]["por_divisao"]["treino"])

    # -- cobertura e proporção -----------------------------------------------------------------------------
    def test_eleicoes_so_portugues(self):
        self.assertEqual({r["idioma"] for r in self.corpus if r["app"] == "eleicoes2026"}, {"pt-BR"})
        self.assertEqual(len(self.hold["eleicoes"]), 435)

    def test_quimica_cinco_idiomas_com_todas_as_intencoes_e_entidades(self):
        q = self.cont["por_app"]["quimica"]["por_idioma"]
        for idioma in ["pt-BR"] + ESTRANGEIROS:
            self.assertIn(idioma, q)
            usadas = set(q[idioma]["por_intencao"])
            self.assertLessEqual(usadas, set(self.qcore.INTENTS), idioma)
            self.assertEqual(set(self.qcore.INTENTS) - usadas, set(), idioma)
            treino = [json.loads(ex["output"]) for ex in self.train if ex["app"] == "quimica" and ex["idioma"] == idioma]
            for ent in ENTIDADES_QUIMICA:
                self.assertTrue(any(ent in a for a in treino), f"{idioma}: nenhuma amostra com {ent}")
            if idioma != "pt-BR":
                self.assertGreaterEqual(len(treino), 3000, idioma)
                self.assertTrue(any(c["idioma"] == idioma for c in self.hold["quimica"]), idioma)

    def test_v35_calculadoras_e_familias(self):
        """v3.5: as 4 intenções novas treinam em todos os idiomas (>= 400 no total cada), a propriedade nova aparece, os holdouts do v3.5
        nunca treinam e as famílias de superfície têm presença útil (>= 150 no pt)."""
        if not self.cont.get("treino_v35"):
            self.skipTest("corpus sem o v3.5 (--escala-v35 0)")
        novas = self.cont["intencoes_novas_treino"]
        for it in INTENCOES_CALCULADORAS:
            self.assertGreaterEqual(sum(novas[it].values()), 400, it)
            for idioma in ["pt-BR"] + ESTRANGEIROS:
                self.assertGreater(novas[it].get(idioma, 0), 0, (it, idioma))
        saidas = [json.loads(ex["output"]) for ex in self.train if ex["app"] == "quimica"]
        self.assertTrue(any(a.get("propriedade") == "entalpiaFormacaoKJmol" and a["intent"] == "PROPRIEDADE" for a in saidas))
        self.assertTrue(any(a.get("propriedade") == "entalpiaFormacaoKJmol" and a["intent"] == "COMPARAR" for a in saidas))
        # 18/10: ΔGf°, S° e partículas (ids novos do contrato) e Kc/Kp sem equação -> CONCEITO
        for pid in ("energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK"):
            self.assertTrue(any(a.get("propriedade") == pid and a["intent"] == "PROPRIEDADE" for a in saidas), pid)
        self.assertGreaterEqual(sum(1 for a in saidas if a.get("propriedade") == "particulas"), 200)
        fam = self.cont["treino_v35"]["por_familia_idioma"]
        for idioma in ["pt-BR"] + ESTRANGEIROS:
            self.assertGreater(fam.get(f"particulas/{idioma}", 0), 0, idioma)
        hold_eq = json.loads((OUT / "holdout_v35_equilibrio.json").read_text(encoding="utf-8"))["cases"]
        self.assertEqual({c["intent"] for c in hold_eq}, {"EQUILIBRIO", "CONCEITO"})
        for f in ("notacao", "extenso", "esteq_formada", "nomenclatura_nome", "mistura", "ordenacao"):
            self.assertGreaterEqual(fam.get(f"{f}/pt-BR", 0), 150, f)
            for idioma in ESTRANGEIROS:
                self.assertGreater(fam.get(f"{f}/{idioma}", 0), 0, (f, idioma))
        entradas = {MC.chave_texto(ex["input"]) for ex in self.train + self.val}
        arquivos = sorted(OUT.glob("holdout_v35_*.json"))
        self.assertEqual(len(arquivos), len(MC.v35().FAMILIAS))
        for a in arquivos:
            casos = json.loads(a.read_text(encoding="utf-8"))["cases"]
            self.assertTrue(casos, a.name)
            for c in casos:
                self.assertNotIn(MC.chave_texto(c["q"]), entradas, (a.name, c["q"]))
                self.assertIsNone(self.filtro.veredito(c["q"]), c["q"])
                alvo = {k: v for k, v in c.items() if k in self.qcore.KEYS and v is not None}
                self.assertTrue(self.qcore.has_valid_shape(alvo) and self.qcore.combinacao_valida(alvo), c)
                for k in ("composto", "equacao"):
                    if k in alvo:
                        self.assertIn(alvo[k], c["q"], c)

    def test_v35_rotulos_pelo_contrato(self):
        """Exemplos do v3.5: combinação de chaves válida por intenção, composto/equação copiados do texto e quantidades com evidência."""
        gv = MC.v35()
        por_entrada = {r["entrada"]: r for r in self.corpus if r["fonte"] == gv.FONTE and r["divisao"] != "holdout"}
        self.assertTrue(por_entrada or not self.cont.get("treino_v35"))
        for q, r in por_entrada.items():
            alvo = json.loads(r["saida"])
            self.assertTrue(self.qcore.combinacao_valida(alvo), r)
            for k in ("composto", "equacao"):
                if k in alvo:
                    self.assertIn(alvo[k], q, r)
            if alvo.get("quantidades"):
                self.assertIsNone(gv.evidencia_v35(q, alvo, r["idioma"], self.bq), r)

    def test_nenhum_app_domina(self):
        for app, p in self.cont["proporcao_treino"].items():
            self.assertLess(p, 0.70, app)

    def test_licencas_registradas(self):
        for r in self.corpus:
            if r["app"] == "quimica":
                self.assertEqual(r["licenca"], "CC BY-SA 4.0")


class Moldes(unittest.TestCase):
    def test_modulos_de_idioma_conferem_com_o_lexico(self):
        for i in ESTRANGEIROS:
            self.assertEqual(VM.problemas(i), [], i)


class EvidenciaV35(unittest.TestCase):
    """A evidência das famílias de notação e números por extenso (quimica_v35.evidencia_v35) lê o que a do app não lê, e só isso."""

    @classmethod
    def setUpClass(cls):
        cls.bq = MC.modulos_quimica()
        cls.gv = MC.v35()

    def _tem(self, q, valor, idioma="pt-BR"):
        return self.gv._chave(valor) in self.gv.numeros_v35(self.bq.nlu.validate_question(q), idioma, self.bq.ask_core)

    def test_le_extenso_fracoes_e_notacao(self):
        for q, v, i in [("massa de meio mol de NaCl", 0.5, "pt-BR"), ("2,5 × 10³ g de água", 2500, "pt-BR"), ("1,5·10⁻³ mol/L", 0.0015, "pt-BR"),
                        ("3x10^-2 mol", 0.03, "pt-BR"), ("um quarto de mol", 0.25, "pt-BR"), ("dois mols de CO2", 2, "pt-BR"), ("1/2 mol", 0.5, "pt-BR"),
                        ("½ mol", 0.5, "pt-BR"), ("half a mole of water", 0.5, "en"), ("medio mol de agua", 0.5, "es"), ("ein halbes Mol Wasser", 0.5, "de"),
                        ("einem halben Mol", 0.5, "de"), ("une demi-mole d'eau", 0.5, "fr"), ("un litre et demi", 1.5, "fr"), ("um mol e meio", 1.5, "pt-BR")]:
            self.assertTrue(self._tem(q, v, i), (q, v))

    def test_nao_inventa_numero(self):
        self.assertFalse(self._tem("massa de meio mol de NaCl", 2))
        self.assertFalse(self._tem("dois mols de CO2", 0.5))
        self.assertFalse(self._tem("2,5 × 10³ g", 25))
        alvo = {"intent": "ESTEQUIOMETRIA", "composto": "NaCl", "quantidades": [{"valor": 0.25, "unidade": "mol"}]}
        self.assertEqual(self.gv.evidencia_v35("massa de meio mol de NaCl", alvo, "pt-BR", self.bq), "quantidades")
        alvo["quantidades"][0]["valor"] = 0.5
        self.assertIsNone(self.gv.evidencia_v35("massa de meio mol de NaCl", alvo, "pt-BR", self.bq))

    def test_a_evidencia_do_app_nao_le_estas_formas(self):
        """Documenta por que a família tem a própria evidência (apps/ não muda: congelamento das eleições e outro agente no site)."""
        for q in ("massa de meio mol de NaCl", "1,5·10⁻³ mol/L", "half a mole"):
            alvo = {"intent": "ESTEQUIOMETRIA", "quantidades": [{"valor": 0.5 if "mol" in q and "·" not in q else 0.0015, "unidade": "mol"}]}
            self.assertEqual(self.bq.evidencia_basica(self.bq.nlu.validate_question(q), alvo), "quantidades", q)


class GeradorV35Novas(unittest.TestCase):
    """18/10/2026: termoquímica (ΔGf°, S°) em entalpia_formacao, família `particulas` e equilíbrio sem equação -> CONCEITO, direto no gerador
    (não depende do corpus montado). Os rótulos passam pelo contrato só quando nlu_core já conhece os ids novos."""
    TERMO_NOVAS = ("energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK")

    @classmethod
    def setUpClass(cls):
        cls.gv = MC.v35()
        cls.ds = cls.gv._dataset()
        cls.pac = cls.ds[1].localizar(None)
        if cls.pac.eh_fixture:
            raise unittest.SkipTest("pacote data/quimica ausente")
        cls.regs = {(f, i): cls.gv.gerar_familia(cls.pac, i, f, 2026, 1.0, cls.ds)[0]
                    for f in ("entalpia_formacao", "particulas", "equilibrio") for i in cls.gv.IDIOMAS}
        cls.core = MC.modulos_quimica().nlu

    def _contrato(self, alvo):
        novos = {"particulas", *self.TERMO_NOVAS}
        if alvo.get("propriedade") in novos and alvo["propriedade"] not in self.core.PROPRIEDADES:
            return  # o contrato (nlu_core.PROPRIEDADES) ganha os ids em paralelo; o carregar_v35 descarta até lá
        self.assertTrue(self.core.has_valid_shape(alvo) and self.core.combinacao_valida(alvo), alvo)

    def test_cotas_e_familias(self):
        self.assertEqual(self.gv.COTAS["entalpia_formacao"], (160, 90))
        self.assertEqual(self.gv.COTAS["particulas"], (130, 70))
        self.assertEqual(self.gv.COTAS["equilibrio"], (130, 80))
        self.assertIn("particulas", self.gv.FAMILIAS)

    def test_termoquimica_so_com_valor_no_pacote(self):
        for idioma in self.gv.IDIOMAS:
            g = self.gv.Gerador(self.pac, idioma, random.Random(0), self.ds)
            regs = self.regs[("entalpia_formacao", idioma)]
            for pid in self.TERMO_NOVAS:
                pool = g.p_termo[pid]
                self.assertTrue(pool and all((c.get("propriedades") or {}).get(pid) is not None for c, _s in pool), (idioma, pid))
                sups = {self.gv.fold(t) for _c, s in pool for t, _ in s}
                usados = [r for r in regs if r["alvo"].get("propriedade") == pid]
                self.assertTrue(any(r["alvo"]["intent"] == "PROPRIEDADE" for r in usados), (idioma, pid))
                for r in usados:
                    self.assertIn(self.gv.fold(r["alvo"]["composto"]), sups, r)  # o composto citado (o primeiro, no COMPARAR) tem o valor
            self.assertTrue(any(r["alvo"]["intent"] == "CONCEITO" for r in regs), idioma)
            for r in regs:
                self._contrato(r["alvo"])
                if "composto" in r["alvo"]:
                    self.assertIn(r["alvo"]["composto"], r["q"], r)
        todos = [r for i in self.gv.IDIOMAS for r in self.regs[("entalpia_formacao", i)]]
        for pid in self.TERMO_NOVAS:
            self.assertTrue(any(r["alvo"].get("propriedade") == pid and r["alvo"]["intent"] == "COMPARAR" for r in todos), pid)
        self.assertTrue(any(self.gv.fold(r["q"]).startswith("o que e entropia") for r in self.regs[("entalpia_formacao", "pt-BR")]))

    def test_particulas_rotulo_so_elemento_e_propriedade(self):
        ions = isotopos = 0
        for idioma in self.gv.IDIOMAS:
            regs = self.regs[("particulas", idioma)]
            props = Counter(r["alvo"]["propriedade"] for r in regs)
            self.assertGreaterEqual(props["particulas"] / len(regs), 0.75, idioma)
            self.assertLessEqual(set(props), {"particulas", "configuracaoEletronica", "numeroAtomico"}, idioma)
            self.assertTrue(props["configuracaoEletronica"] + props["numeroAtomico"] > 0, idioma)  # contrastes
            for r in regs:
                a = r["alvo"]
                self.assertEqual(set(a), {"intent", "elemento", "propriedade"}, r)  # sem carga nem número de massa no rótulo
                self.assertEqual(a["intent"], "PROPRIEDADE")
                self.assertIn(a["elemento"], self.pac.el_simbolo, r)
                self._contrato(a)
                if a["propriedade"] == "particulas":
                    if re.search(re.escape(a["elemento"]) + r"(?:\^?\d?[+-]\d?|[⁰-⁹]*[⁺⁻])(?![A-Za-z])", r["q"]):
                        ions += 1
                    if re.search(r"[-\s]\d{1,3}\b|\b\d{1,3}" + re.escape(a["elemento"]) + r"\b|[⁰-⁹]+" + re.escape(a["elemento"]), r["q"]):
                        isotopos += 1
        self.assertGreater(ions, 50)
        self.assertGreater(isotopos, 30)
        pt = " | ".join(r["q"] for r in self.regs[("particulas", "pt-BR")])
        for forma in ("íon", "prótons", "nêutrons", "elétrons", "número de massa"):
            self.assertIn(forma, pt.lower(), forma)

    def test_equilibrio_sem_equacao_e_conceito(self):
        todos, holdout = [], Counter()
        for idioma in self.gv.IDIOMAS:
            regs = self.regs[("equilibrio", idioma)]
            todos += regs
            conceito = [r for r in regs if r["alvo"]["intent"] == "CONCEITO"]
            self.assertTrue(conceito, idioma)
            for r in regs:
                if r["alvo"]["intent"] == "CONCEITO":
                    self.assertEqual(r["alvo"], {"intent": "CONCEITO"}, r)
                else:
                    self.assertEqual(r["alvo"]["intent"], "EQUILIBRIO", r)
                    self.assertIn(r["alvo"]["equacao"], r["q"], r)
                self._contrato(r["alvo"])
                if r["_lado"] == "holdout":
                    holdout[r["alvo"]["intent"]] += 1
        frac = sum(r["alvo"]["intent"] == "CONCEITO" for r in todos) / len(todos)
        self.assertTrue(0.18 <= frac <= 0.32, frac)
        self.assertEqual(set(holdout), {"CONCEITO", "EQUILIBRIO"})  # holdout_v35_equilibrio com os dois lados


class Gerador(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ml = _mod("quimica_multilingue_t", AQUI / "quimica_multilingue.py")
        cls.ds = cls.ml._dataset()
        cls.pac = cls.ds[4].localizar(None)

    def test_deterministico(self):
        a, _ = self.ml.gerar_idioma(self.pac, "en", 11, 0.05, self.ds)
        b, _ = self.ml.gerar_idioma(self.pac, "en", 11, 0.05, self.ds)
        self.assertEqual(a, b)

    def test_ancorar(self):
        self.assertEqual(self.ml.ancorar("Water is toxic?", {"intent": "SEGURANCA", "composto": "water"})["composto"], "Water")
        self.assertIsNone(self.ml.ancorar("Is it toxic?", {"intent": "SEGURANCA", "composto": "water"}))

    def test_subscrito(self):
        q, alvo = self.ml.variante_subscrita("Molar mass of H2SO4", {"intent": "MASSA_MOLAR", "composto": "H2SO4"})
        self.assertEqual((q, alvo["composto"]), ("Molar mass of H₂SO₄", "H₂SO₄"))
        q, alvo = self.ml.variante_subscrita("Balance 2H2 + O2 -> H2O", {"intent": "BALANCEAR", "equacao": "2H2 + O2 -> H2O"})
        self.assertEqual(alvo["equacao"], "2H₂ + O₂ -> H₂O")
        self.assertIn(alvo["equacao"], q)

    def test_entidades_sem_erro_de_digitacao(self):
        """Os nomes de elementos e compostos no texto vêm do pacote (com variação só de caixa/acentos)."""
        regs, _ = self.ml.gerar_idioma(self.pac, "de", 3, 0.1, self.ds)
        nomes = set()
        for c in self.pac.compostos:
            for v in [*(c.get("nomes") or {}).values(), *sum(((c.get("sinonimosPorIdioma") or {}).values()), []), c.get("formula") or ""]:
                nomes.add(self.ml.fold(v))
        for r in regs:
            comp = r["alvo"].get("composto")
            if comp and not re.search(r"[₀-₉·]", comp):
                self.assertIn(self.ml.fold(comp), nomes | {self.ml.fold(f) for f in self.ml.GeradorIdioma(self.pac, self.ml.carregar_moldes("de"), random.Random(0), self.ds).formulas_livres}, r)



class TestPisoPorPropriedade(unittest.TestCase):
    """limitar_por_intencao com piso: cada id de propriedade mantém pelo menos `piso` exemplos (ou todos) dentro do teto."""

    def _regs(self):
        regs = []
        for i in range(300):
            regs.append({"intent": "PROPRIEDADE", "entrada": f"ponto de fusão do composto {i}", "saida": json.dumps({"intent": "PROPRIEDADE", "propriedade": "pontoFusaoK"})})
        for i in range(8):
            regs.append({"intent": "PROPRIEDADE", "entrada": f"ligações rotáveis do composto {i}", "saida": json.dumps({"intent": "PROPRIEDADE", "propriedade": "ligacoesRotaveis"})})
        for i in range(60):
            regs.append({"intent": "PROPRIEDADE", "entrada": f"carga do íon {i}", "saida": json.dumps({"intent": "PROPRIEDADE", "propriedade": "carga"})})
        for i in range(50):
            regs.append({"intent": "ELEMENTO", "entrada": f"elemento {i}", "saida": json.dumps({"intent": "ELEMENTO"})})
        return regs

    def _por_prop(self, regs):
        c = Counter(MC._propriedade_de(r) for r in regs if r["intent"] == "PROPRIEDADE")
        return dict(c)

    def test_sem_piso_pode_zerar_propriedade_rara(self):
        stats = {"limite_por_intencao": {}}
        saida = MC.limitar_por_intencao(self._regs(), 100, stats, "t")
        self.assertEqual(sum(1 for r in saida if r["intent"] == "PROPRIEDADE"), 100)
        self.assertEqual(stats["limite_por_intencao"]["t"]["PROPRIEDADE"], {"antes": 368, "depois": 100})

    def test_com_piso_mantem_cada_propriedade(self):
        stats = {"limite_por_intencao": {}}
        saida = MC.limitar_por_intencao(self._regs(), 100, stats, "t", piso_propriedade=30)
        por = self._por_prop(saida)
        self.assertEqual(por["ligacoesRotaveis"], 8)  # todos os que havia
        self.assertEqual(por["carga"], 30)
        self.assertEqual(por["pontoFusaoK"], 100 - 8 - 30)  # o resto completa o teto por hash
        self.assertEqual(sum(1 for r in saida if r["intent"] == "ELEMENTO"), 50)  # intenção abaixo do teto não muda
        lim = stats["limite_por_intencao"]["t"]["PROPRIEDADE"]
        self.assertEqual((lim["antes"], lim["depois"], lim["piso_propriedade"], lim["propriedades"], lim["propriedades_acima_do_piso"]), (368, 100, 30, 3, 2))

    def test_piso_e_estavel(self):
        a = MC.limitar_por_intencao(self._regs(), 100, {"limite_por_intencao": {}}, "t", piso_propriedade=30)
        b = MC.limitar_por_intencao(self._regs(), 100, {"limite_por_intencao": {}}, "t", piso_propriedade=30)
        self.assertEqual([r["entrada"] for r in a], [r["entrada"] for r in b])

if __name__ == "__main__":
    sys.exit(unittest.main())
