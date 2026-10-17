# -*- coding: utf-8 -*-
"""Termoquímica padrão do chembox da Wikipédia em inglês (coleta_termo_wikipedia): wikitexto sintético no formato real dos artigos,
sem rede (a API é substituída por um objeto com `get`)."""
import sys
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import coleta_propriedades as CP  # noqa: E402
import coleta_termo_wikipedia as T  # noqa: E402
import fontes as F  # noqa: E402

HOJE = "2026-10-17"

CO2 = """{{Chembox
| Name = Carbon dioxide
| Section3 = {{Chembox Thermochemistry
| DeltaHf = −393.5{{nbsp}}kJ·mol<sup>−1</sup>
| HeatCapacity = 37.135{{nbsp}}J/(K·mol)
| Entropy = 214{{nbsp}}J·mol<sup>−1</sup>·K<sup>−1</sup>
}}
}}"""

ACETONA = """{{Chembox
| Section3 = {{Chembox Thermochemistry
| DeltaHf = −248.4{{nbsp}}kJ/mol (liquid)<br/>&minus;218.5 kJ/mol (gas)
| Entropy = 199.8{{nbsp}}J/(mol·K) (liquid)<br/>295.35{{nbsp}}J/(mol·K) (gas)
}}
}}"""

COM_REFERENCIA = """{{Chembox
| Section3 = {{Chembox Thermochemistry
| DeltaHf = −1207&nbsp;kJ/mol<ref name=b1>{{cite book| author = Zumdahl, Steven S.| title = Chemical Principles| page = A21 | isbn=0-618-37206-7}}</ref>
| Entropy = 93&nbsp;J/(mol·K)<ref name=b1 />
| DeltaGf = {{val|−1129|u=kJ.mol-1}}<!-- comentário -->
}}
| Section4 = {{Chembox Hazards| FlashPt = 20 }}
}}"""


class Resposta:
    def __init__(self, dados, status=200):
        self.status, self._dados = status, dados

    def json(self):
        return self._dados


class HttpFalso:
    """Imita a API de ações: devolve uma página (wikitexto + revid + QID) por título, com normalização e redirecionamento."""

    def __init__(self, paginas, redirecionamentos=None, ausentes=()):
        self.paginas, self.red, self.ausentes, self.chamadas = paginas, redirecionamentos or {}, set(ausentes), []

    def get(self, url, params=None, cabecalhos=None, **kw):
        self.chamadas.append((url, dict(params)))
        titulos = params["titles"].split("|")
        q = {"pages": [], "redirects": [], "normalized": []}
        for t in titulos:
            alvo = self.red.get(t, t)
            if t != alvo:
                q["redirects"].append({"from": t, "to": alvo})
            if alvo in self.ausentes or alvo not in self.paginas:
                q["pages"].append({"title": alvo, "missing": True})
                continue
            texto, revid, qid = self.paginas[alvo]
            q["pages"].append({"title": alvo, "pageprops": {"wikibase_item": qid},
                               "revisions": [{"revid": revid, "slots": {"main": {"content": texto}}}]})
        return Resposta({"query": q})


class AnalisadorTest(unittest.TestCase):
    def valor(self, bruto, familia="energia"):
        segs, motivos = T.interpretar(bruto, familia)
        return segs, motivos

    def test_campos_do_chembox_com_referencia_comentario_e_modelo(self):
        c = T.campos_chembox(COM_REFERENCIA)
        self.assertEqual(c["DeltaHf"], ["−1207&nbsp;kJ/mol"])  # a <ref> com {{cite book| ...}} e seus "|" saiu inteira
        self.assertEqual(c["Entropy"], ["93&nbsp;J/(mol·K)"])
        self.assertEqual(c["DeltaGf"], ["{{val|−1129|u=kJ.mol-1}}"])  # modelo preservado, comentário removido, para no "}}" do bloco
        self.assertNotIn("FlashPt", c)

    def test_numeros_e_unidades_aceitos(self):
        casos = [
            ("−393.5{{nbsp}}kJ·mol<sup>−1</sup>", "energia", "-393.5", "kJ/mol"),
            ("−74.6 kJ/mol", "energia", "-74.6", "kJ/mol"),
            ("-285830 J/mol", "energia", "-285.830", "J/mol"),
            ("−57.8 kcal/mol", "energia", "-241.8352", "kcal/mol"),
            ("−1,273 kJ/mol", "energia", "-1273", "kJ/mol"),
            ("−393.51(13) kJ/mol", "energia", "-393.51", "kJ/mol"),
            ("−350.46±0.27 kJ mol<sup>−1</sup>", "energia", "-350.46", "kJ/mol"),
            ("–393.5 kJ/mol", "energia", "-393.5", "kJ/mol"),
            ("{{val|-333.19|u=kJ/mol}}", "energia", "-333.19", "kJ/mol"),
            ("{{val|−494.00|u=kJ.mol-1}}", "energia", "-494.00", "kJ/mol"),
            ("{{val|-56|1|u=kJ.mol-1}}", "energia", "-56", "kJ/mol"),
            ("{{cvt|-2226.1|kJ/mol}}", "energia", "-2226.1", "kJ/mol"),
            ("{{nowrap|−1675.7 kJ/mol}}", "energia", "-1675.7", "kJ/mol"),
            ("−1675.7&nbsp;kJ·mol<sup>−1</sup> (α solid, 298.15&nbsp;K, 100&nbsp;kPa)", "energia", "-1675.7", "kJ/mol"),
            ("214{{nbsp}}J·mol<sup>−1</sup>·K<sup>−1</sup>", "entropia", "214", "J/(mol·K)"),
            ("186.3 J/(K·mol)", "entropia", "186.3", "J/(mol·K)"),
            ("248.223 J K<sup>−1</sup> mol<sup>−1</sup>", "entropia", "248.223", "J/(mol·K)"),
            ("135.98&nbsp;J{{thin space}}K<sup>−1</sup>{{thin space}}mol<sup>−1</sup>", "entropia", "135.98", "J/(mol·K)"),
            ("{{val|109.8|u=J/(mol·K)}}", "entropia", "109.8", "J/(mol·K)"),
            ("{{val|108.1|u=J.mol-1.K-1}}", "entropia", "108.1", "J/(mol·K)"),
            ("{{val|127.8|u=J.K-1|s=·mol{{sup|-1}}}}", "entropia", "127.8", "J/(mol·K)"),
            ("{{val|150.82|u=J|up=mol{{times}}K}}", "entropia", "150.82", "J/(mol·K)"),
            ("{{val|242.55|u=J·mol{{sup|–1}}·K{{sup|–1}}}}", "entropia", "242.55", "J/(mol·K)"),
        ]
        for bruto, familia, esperado, unidade in casos:
            segs, motivos = self.valor(bruto, familia)
            self.assertTrue(segs and not motivos, (bruto, motivos))
            self.assertEqual(len(segs), 1, bruto)
            self.assertEqual(segs[0]["valor"], Decimal(esperado), bruto)
            self.assertEqual(segs[0]["unidade"], unidade, bruto)

    def test_o_que_fica_fora(self):
        casos = [
            ("~−100 kJ/mol", "energia"), ("ca. −100 kJ/mol", "energia"), ("≈ −100 kJ/mol", "energia"), ("−100 to −90 kJ/mol", "energia"),
            ("−126.3–−124.9 kJ/mol", "energia"), ("−105.2–104.2 kJ/mol", "energia"), ("−36.45...−36.13 kJ/mol", "energia"),
            ("{{val|-225.2|to|-223.6|u=kJ.mol-1}}", "energia"), ("< −100 kJ/mol", "energia"), ("−13.66 kJ/g", "energia"),
            ("−20.01 kJ/g or −595.8 kJ/mol", "energia"), ("−276", "energia"), ("−100 kJ/mol (aq)", "energia"),
            ("−100 kJ/mol (estimated)", "energia"), ("−167.39 ± 0.23 kcal. mole-1 at 298.15 (K, C?)", "energia"),
            ("309.8 kJ/mol", "entropia"), ("91.2 J/mol", "entropia"), ("8.687 J/g K", "entropia"), ("{{foo|-100|kJ/mol}}", "energia"),
            ("−1.3130 MJ/mol", "energia"), ("", "energia"), ("−100 kJ/mol (anhydrous)", "energia"),
        ]
        for bruto, familia in casos:
            segs, motivos = self.valor(bruto, familia)
            self.assertFalse(segs, (bruto, segs))
            self.assertTrue(motivos, bruto)

    def test_varias_fases_no_mesmo_campo(self):
        segs, _ = self.valor("−248.4{{nbsp}}kJ/mol (liquid)<br/>&minus;218.5 kJ/mol (gas)")
        self.assertEqual([(str(s["valor"]), s["fase"]) for s in segs], [("-248.4", "liquido"), ("-218.5", "gas")])
        segs, _ = self.valor("{{ubl\n |{{val|-816.1|u=kJ.mol-1}} (solid)\n |{{val|-717.9|u=kJ.mol-1}} (gas)\n }}")
        self.assertEqual([(str(s["valor"]), s["fase"]) for s in segs], [("-816.1", "solido"), ("-717.9", "gas")])
        segs, motivos = self.valor("−13.66 kJ/g (gas) <br /> −14.99 kJ/g (liquid)")
        self.assertFalse(segs)

    def test_escolha_da_fase(self):
        liq, gas, sol = ({"valor": Decimal(v), "fase": f} for v, f in ((-248, "liquido"), (-218, "gas"), (-300, "solido")))
        sem = {"valor": Decimal(-100), "fase": None}
        self.assertEqual(T.escolher_segmento([liq, gas], "liquido")[0], liq)
        self.assertEqual(T.escolher_segmento([liq, gas], "gas")[0], gas)
        self.assertEqual(T.escolher_segmento([sem], "liquido")[0], sem)            # um valor sem fase vale para o estado padrão
        self.assertEqual(T.escolher_segmento([gas], "liquido")[1], "fase diferente do estado padrão")
        self.assertEqual(T.escolher_segmento([sem, gas], "liquido")[1], "fase ambígua")
        self.assertEqual(T.escolher_segmento([liq, gas], None)[0], liq)             # estado desconhecido: a única sólida/líquida
        self.assertEqual(T.escolher_segmento([sol, gas], None)[0], sol)
        self.assertIsNone(T.escolher_segmento([sol, liq], None)[0])                 # duas candidatas = ambíguo
        self.assertIsNone(T.escolher_segmento([gas, sem], None)[0])
        self.assertEqual(T.escolher_segmento([gas], None)[0], gas)                  # um valor só, mesmo com fase, entra (fase nas condições)

    def test_extrair_do_chembox(self):
        v, desc, _ = T.extrair(CO2, None)
        self.assertEqual(set(v), {"entalpiaFormacaoKJmol", "entropiaPadraoJmolK"})
        self.assertEqual((v["entalpiaFormacaoKJmol"]["valor"], v["entalpiaFormacaoKJmol"]["campoOriginal"]), (Decimal("-393.5"), "DeltaHf"))
        self.assertEqual(desc, {})
        v, _, _ = T.extrair(ACETONA, "liquido")
        self.assertEqual((v["entalpiaFormacaoKJmol"]["valor"], v["entalpiaFormacaoKJmol"]["fase"], v["entropiaPadraoJmolK"]["valor"]),
                         (Decimal("-248.4"), "liquido", Decimal("199.8")))
        v, _, _ = T.extrair(ACETONA, "gas")
        self.assertEqual((v["entalpiaFormacaoKJmol"]["valor"], v["entropiaPadraoJmolK"]["valor"]), (Decimal("-218.5"), Decimal("295.35")))
        v, desc, _ = T.extrair(COM_REFERENCIA, "solido")
        self.assertEqual({k: x["valor"] for k, x in v.items()},
                         {"entalpiaFormacaoKJmol": Decimal(-1207), "entropiaPadraoJmolK": Decimal(93), "energiaGibbsFormacaoKJmol": Decimal(-1129)})

    def test_faixa_plausivel_e_campo_repetido(self):
        v, desc, _ = T.extrair("| DeltaHf = −12000 kJ/mol\n| Entropy = 5 J/(mol·K)\n| DeltaGf = −30000 J/mol\n", None)
        self.assertEqual(set(v), {"energiaGibbsFormacaoKJmol"})  # −30 kJ/mol
        self.assertEqual(desc, {"fora da faixa física plausível": 2})
        v, desc, _ = T.extrair("| DeltaHf = −10 kJ/mol\n| DeltaHf = −20 kJ/mol\n", None)
        self.assertEqual(v, {})
        self.assertEqual(desc, {"campo repetido com valores diferentes": 1})
        v, _, _ = T.extrair("| DeltaHf = −10 kJ/mol\n| DeltaHf = −10 kJ/mol\n", None)
        self.assertEqual(v["entalpiaFormacaoKJmol"]["valor"], Decimal(-10))


class LeituraTest(unittest.TestCase):
    def test_lotes_de_50_redirecionamento_e_ausente(self):
        paginas = {f"Art {i}": (CO2, 1000 + i, f"Q{i}") for i in range(120)}
        paginas["Destino"] = (CO2, 7, "Q777")
        http = HttpFalso(paginas, redirecionamentos={"Redir": "Destino"}, ausentes=["Art 3"])
        titulos = [f"Art {i}" for i in range(120)] + ["Redir"]
        saida, falhas = T.ler_paginas(http, titulos, log=lambda *a: None)
        self.assertEqual(falhas, [])
        self.assertEqual(len(http.chamadas), 3)  # 50 + 50 + 21
        url, p = http.chamadas[0]
        self.assertEqual(url, "https://en.wikipedia.org/w/api.php")
        self.assertEqual((p["action"], p["rvsection"], p["redirects"], p["rvslots"]), ("query", 0, 1, "main"))
        self.assertEqual(len(p["titles"].split("|")), 50)
        self.assertIsNone(saida["Art 3"])
        self.assertEqual((saida["Art 5"]["revid"], saida["Art 5"]["qid"], saida["Art 5"]["titulo"]), (1005, "Q5", "Art 5"))
        self.assertEqual((saida["Redir"]["titulo"], saida["Redir"]["revid"]), ("Destino", 7))

    def test_falha_de_um_lote_nao_derruba_os_outros(self):
        class Quebra(HttpFalso):
            def get(self, url, params=None, **kw):
                if "Art 0" in params["titles"].split("|"):
                    raise RuntimeError("sem rede")
                return super().get(url, params=params, **kw)
        http = Quebra({f"Art {i}": (CO2, i, f"Q{i}") for i in range(60)})
        saida, falhas = T.ler_paginas(http, [f"Art {i}" for i in range(60)], log=lambda *a: None)
        self.assertEqual(len(falhas), 1)
        self.assertNotIn("Art 0", saida)
        self.assertIn("Art 55", saida)


def composto(cid, qid, estado=None, **props):
    c = {"cid": cid, "nome": f"composto {cid}", "wikidata": qid, "propriedades": dict(props)}
    if estado:
        c["propriedades"]["estadoPadrao"] = estado
    return c


class ColetaTest(unittest.TestCase):
    def rodar(self, compostos, paginas, titulos, **kw):
        http = HttpFalso(paginas)
        return T.coletar(http, compostos, None, HOJE, log=lambda *a: None, titulos=titulos, **kw), http

    def test_grava_valor_e_origem_com_permalink(self):
        comp = [composto(280, "Q1997")]
        st, _ = self.rodar(comp, {"Carbon dioxide": (CO2, 1380119955, "Q1997")}, {280: "Carbon dioxide"})
        p, f = comp[0]["propriedades"], comp[0]["fontesPorPropriedade"]
        self.assertEqual((p["entalpiaFormacaoKJmol"], p["entropiaPadraoJmolK"]), (-393.5, 214))
        h = f["entalpiaFormacaoKJmol"]
        self.assertEqual((h["nome"], h["licenca"], h["acessadoEm"]), ("Wikipedia (en): Carbon dioxide", "CC BY-SA 4.0", HOJE))
        self.assertEqual(h["url"], "https://en.wikipedia.org/w/index.php?title=Carbon_dioxide&oldid=1380119955")
        self.assertEqual((h["revisao"], h["campoOriginal"], h["valorOriginal"], h["unidadeOriginal"]), (1380119955, "DeltaHf", -393.5, "kJ/mol"))
        self.assertIn("CC BY-SA 4.0", h["atribuicao"])
        self.assertNotIn("condicoes", h)
        self.assertEqual(f["entropiaPadraoJmolK"]["campoOriginal"], "Entropy")
        self.assertEqual(st["publicados"], {"entalpiaFormacaoKJmol": 1, "energiaGibbsFormacaoKJmol": 0, "entropiaPadraoJmolK": 1})
        self.assertEqual(CP.validar_registro(comp[0]), [])

    def test_fase_pelo_estado_padrao_e_condicoes(self):
        comp = [composto(180, "Q1", "liquido"), composto(181, "Q2", "gas")]
        pag = {"Acetone": (ACETONA, 5, "Q1"), "Acetone gas": (ACETONA, 6, "Q2")}
        self.rodar(comp, pag, {180: "Acetone", 181: "Acetone gas"})
        self.assertEqual(comp[0]["propriedades"]["entalpiaFormacaoKJmol"], -248.4)
        self.assertEqual(comp[0]["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["condicoes"], {"fase": "liquido"})
        self.assertEqual(comp[1]["propriedades"]["entalpiaFormacaoKJmol"], -218.5)
        self.assertEqual(comp[1]["propriedades"]["entropiaPadraoJmolK"], 295.35)

    def test_chembox_substitui_o_wikidata_e_registra_divergencia(self):
        comp = [composto(1, "Q1", "gas", entalpiaFormacaoKJmol=-55.0), composto(2, "Q2", "gas", entalpiaFormacaoKJmol=-74.5)]
        comp[0]["fontesPorPropriedade"] = {"entalpiaFormacaoKJmol": {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE, "referencia": "CRC"}}
        comp[1]["fontesPorPropriedade"] = {"entalpiaFormacaoKJmol": {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE, "referencia": "CRC"}}
        metano = "| DeltaHf = −74.6 kJ/mol\n"
        st, _ = self.rodar(comp, {"A": (metano, 1, "Q1"), "B": (metano, 2, "Q2")}, {1: "A", 2: "B"})
        self.assertEqual(comp[0]["propriedades"]["entalpiaFormacaoKJmol"], -74.6)  # o do chembox vale, mesmo divergindo (−55 x −74,6)
        self.assertEqual(comp[0]["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["nome"], "Wikipedia (en): A")
        self.assertEqual(st["substituiuWikidata"], 2)
        self.assertEqual(st["iguaisAoWikidata"], 1)  # −74,5 x −74,6: dentro de 2 %
        self.assertEqual(st["divergenteDoWikidata"], {"n": 1, "amostra": [{"cid": 1, "nome": "composto 1", "chembox": -74.6, "wikidata": -55.0}]})

    def test_wikidata_com_a_fase_do_estado_padrao_vence_chembox_sem_fase(self):
        comp = [composto(99991, "Q1", "liquido", entalpiaFormacaoKJmol=-804.2)]
        comp[0]["fontesPorPropriedade"] = {"entalpiaFormacaoKJmol": {"nome": "Wikidata", "licenca": "CC0", "acessadoEm": HOJE, "referencia": "CRC",
                                                                     "condicoes": {"fase": "liquido"}}}
        st, _ = self.rodar(comp, {"TiCl4": ("| DeltaHf = −763 kJ/mol\n| Entropy = 355 J/(mol·K)\n", 3, "Q1")}, {99991: "TiCl4"})
        self.assertEqual(comp[0]["propriedades"]["entalpiaFormacaoKJmol"], -804.2)   # o gás do artigo não substitui o líquido do Wikidata
        self.assertEqual(comp[0]["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["nome"], "Wikidata")
        self.assertEqual((st["mantidoWikidataPorFase"], st["divergenteDoWikidata"]["n"]), (1, 1))
        self.assertEqual(comp[0]["propriedades"]["entropiaPadraoJmolK"], 355)

    def test_curadoria_e_filtros_de_pagina(self):
        comp = [composto(944, "Q1", "liquido"), composto(24462, "Q2", "solido"), composto(5793, "Q23905964"), composto(7, "Q3"), composto(8, "Q4")]
        pag = {"Nitric acid": ("| DeltaHf = −207 kJ/mol\n| Entropy = 146 J/(mol·K)\n", 1, "Q1"),
               "CuSO4": ("| DeltaHf = −769.98 kJ/mol\n| Entropy = 5 J/(K·mol)\n", 2, "Q2"),
               "Glucose": ("| DeltaHf = −1271 kJ/mol\n| Entropy = 209.2 J/(K·mol)\n", 3, "Q37525"),
               "Outro": ("| DeltaHf = -10 kJ/mol\n", 4, "Q999"),                   # a página é de outro item do Wikidata
               "Vazio": ("{{Chembox\n| Name = x\n}}", 5, "Q4")}
        st, _ = self.rodar(comp, pag, {944: "Nitric acid", 24462: "CuSO4", 5793: "Glucose", 7: "Outro", 8: "Vazio"})
        self.assertNotIn("entalpiaFormacaoKJmol", comp[0]["propriedades"])           # EXCLUIR: ácido nítrico (valor aquoso)
        self.assertNotIn("entropiaPadraoJmolK", comp[0]["propriedades"])
        self.assertEqual(comp[1]["propriedades"]["entalpiaFormacaoKJmol"], -769.98)  # CuSO4: ΔHf fica, S°=5 sai pela faixa plausível (> 10)
        self.assertNotIn("entropiaPadraoJmolK", comp[1]["propriedades"])
        self.assertEqual(comp[2]["propriedades"]["entalpiaFormacaoKJmol"], -1271)    # glicose: título curado, sem checar o QID
        self.assertNotIn("entalpiaFormacaoKJmol", comp[3]["propriedades"])
        self.assertEqual((st["qidDiferente"], st["semCampo"], st["excluidosPorCuradoria"], st["tituloCurado"]), (1, 1, 2, 1))

    def test_titulos_en_vem_de_meta_e_inclui_a_curadoria(self):
        comp = [composto(1, "Q1"), composto(2, "Q2"), composto(5793, "Q23905964")]
        meta = {1: {"artigos": {"en": "Methane"}}, 2: {"artigos": {"de": "Wasser"}}, 5793: {"artigos": {}}}
        self.assertEqual(T.titulos_en(comp, meta), {1: "Methane", 5793: "Glucose"})

    def test_validador_exige_oldid_e_licenca_na_origem_wikipedia(self):
        comp = [composto(280, "Q1997")]
        self.rodar(comp, {"Carbon dioxide": (CO2, 1380119955, "Q1997")}, {280: "Carbon dioxide"})
        c = comp[0]
        self.assertEqual(CP.validar_registro(c), [])
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["licenca"] = "CC0"
        self.assertTrue(CP.validar_registro(c))
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["licenca"] = "CC BY-SA 4.0"
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["url"] = "https://en.wikipedia.org/wiki/Carbon_dioxide"
        self.assertTrue(CP.validar_registro(c))
        c["fontesPorPropriedade"]["entalpiaFormacaoKJmol"]["url"] = "https://en.wikipedia.org/w/index.php?title=X&oldid=1"
        del c["fontesPorPropriedade"]["entropiaPadraoJmolK"]
        self.assertIn("entropiaPadraoJmolK sem fonte por valor", CP.validar_registro(c)[0])

    def test_fonte_declarada_e_campos_do_manifesto(self):
        fonte = F.POR_ID["wikipedia-en-dados"]
        self.assertEqual((fonte["licenca"], fonte["uso"]), ("CC BY-SA 4.0", "dados"))
        self.assertIn("chembox", fonte["atribuicao"])
        for campo in T.CAMPOS_PACOTE:
            self.assertIn(campo, CP.CAMPOS_TERMO_WIKIPEDIA)


if __name__ == "__main__":
    unittest.main()
