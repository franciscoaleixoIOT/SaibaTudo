# -*- coding: utf-8 -*-
"""GHS (só classificação harmonizada), frases H do CLP (Anexo III, EUR-Lex), ChEBI, composição do composto e do índice."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import clp  # noqa: E402
import coleta_chebi  # noqa: E402
import coleta_compostos as CCP  # noqa: E402
import coleta_icsc  # noqa: E402
import pubchem as P  # noqa: E402


def info(ref, nome, valores):
    return {"ReferenceNumber": ref, "Name": nome, "Value": {"StringWithMarkup": valores}}


def sm(texto, icone=None):
    m = [{"Start": 0, "Length": 1, "URL": f"https://pubchem.ncbi.nlm.nih.gov/images/ghs/{icone}.svg", "Type": "Icon"}] if icone else []
    return {"String": texto, "Markup": m}


def registro_pugview():
    infos = [
        # ECHA C&L (notificada): NÃO pode entrar
        info(45, "Pictogram(s)", [sm(" ", "GHS07")]), info(45, "Signal", [sm("Warning")]),
        info(45, "GHS Hazard Statements", [sm("H302 (95.6%): Harmful if swallowed [Warning]")]),
        info(45, "ECHA C&L Notifications Summary", [sm("Aggregated GHS information provided per 315 reports")]),
        # NITE-CMC: NÃO pode entrar
        info(80, "Pictogram(s)", [sm(" ", "GHS08")]), info(80, "GHS Hazard Statements", [sm("H370: Causes damage to organs")]),
        # Regulamento (CE) 1272/2008 (harmonizada): ENTRA
        info(94, "Pictogram(s)", [sm(" ", "GHS05"), sm(" ", "GHS06")]), info(94, "Signal", [sm("Danger")]),
        info(94, "GHS Hazard Statements", [sm("H314: Causes severe skin burns and eye damage [Danger]"),
                                           sm("H300+H310: Fatal if swallowed or in contact with skin")]),
    ]
    refs = [{"ReferenceNumber": 45, "SourceName": "European Chemicals Agency (ECHA)", "Name": "X"},
            {"ReferenceNumber": 80, "SourceName": "NITE-CMC", "Name": "Y"},
            {"ReferenceNumber": 94, "SourceName": "Regulation (EC) No 1272/2008 of the European Parliament and of the Council",
             "Name": "sulphuric acid ... %", "URL": "https://eur-lex.europa.eu/eli/reg/2008/1272/oj"}]
    return {"Record": {"Section": [{"TOCHeading": "Safety and Hazards", "Section": [{"TOCHeading": "GHS Classification",
            "Information": infos}]}], "Reference": refs}}


class GhsTest(unittest.TestCase):
    def test_so_a_fonte_harmonizada_entra(self):
        g = P.extrair_ghs_harmonizado(registro_pugview())
        self.assertEqual(g["pictogramas"], ["GHS05", "GHS06"])
        self.assertEqual(g["palavraSinal"], "Perigo")
        self.assertEqual(g["frasesH"], ["H314", "H300+H310"])
        self.assertEqual(g["fonte"], "Regulation (EC) No 1272/2008 of the European Parliament and of the Council")  # literal
        self.assertNotIn("GHS07", g["pictogramas"])
        self.assertNotIn("GHS08", g["pictogramas"])

    def test_sem_fonte_harmonizada_nao_ha_ghs(self):
        d = registro_pugview()
        d["Record"]["Reference"] = d["Record"]["Reference"][:2]
        self.assertIsNone(P.extrair_ghs_harmonizado(d))
        self.assertIsNone(P.extrair_ghs_harmonizado({"Record": {"Section": []}}))


XHTML_CLP = """<html><body>
<p class="oj-doc-ti">ANEXO <br/>II</p><p class="oj-tbl-txt">H999</p><p class="oj-tbl-txt">PT</p><p class="oj-tbl-txt">Texto do anexo II.</p>
<p class="oj-doc-ti">ANEXO <br/>III</p>
<table><tr><td><p class="oj-tbl-hdr">H200 ►M2 ◄</p></td><td><p>Língua</p></td></tr>
<tr><td><p>EN</p></td><td><p>Unstable explosives.</p></td></tr><tr><td><p>PT</p></td><td><p>Explosivo instável.</p></td></tr>
<tr><td><p class="oj-tbl-hdr">H225<a href="#n">(1)</a></p></td><td><p>Língua</p></td></tr>
<tr><td><p>PT</p></td><td><p>Líquido e vapor facilmente inflamáveis.</p></td></tr>
<tr><td><p>H300 +</p></td></tr><tr><td><p>H310 +</p></td></tr><tr><td><p>H330</p></td></tr>
<tr><td><p>PT</p></td><td><p>Mortal por ingestão, contacto com a pele ou inalação</p></td></tr>
<tr><td><p>EUH211</p></td></tr><tr><td><p>PT</p></td><td><p>Atenção!</p></td></tr></table>
<p class="oj-doc-ti">ANEXO <br/>IV</p><p>H225</p><p>PT</p><p>Texto errado do anexo IV.</p></body></html>"""


class ClpTest(unittest.TestCase):
    def test_parse_anexo_iii(self):
        f = clp.parse_anexo_iii(XHTML_CLP)
        self.assertEqual(f["H200"], "Explosivo instável.")
        self.assertEqual(f["H225"], "Líquido e vapor facilmente inflamáveis.")
        self.assertEqual(f["H300+H310+H330"], "Mortal por ingestão, contacto com a pele ou inalação")
        self.assertEqual(f["EUH211"], "Atenção!")
        self.assertNotIn("H999", f)  # anexo II fica de fora
        self.assertEqual(len(f), 4)

    def test_parse_anexo_iii_multilingue(self):
        f = clp.parse_anexo_iii_multi(XHTML_CLP)
        self.assertEqual(f["H200"], {"en": "Unstable explosives.", "pt-BR": "Explosivo instável."})  # só as línguas pedidas; DE/ES/FR ausentes
        self.assertEqual(f["H225"], {"pt-BR": "Líquido e vapor facilmente inflamáveis."})
        self.assertEqual(f["H300+H310+H330"], {"pt-BR": "Mortal por ingestão, contacto com a pele ou inalação"})
        xhtml_de = ("<p>ANEXO III</p><p>H200</p><p>Língua</p><p>SV</p><p>Instabilt explosivt.</p><p>DE</p><p>Instabil, explosiv.</p>"
                    "<p>PT</p><p>Explosivo instável.</p><p>EN</p><p>Unstable explosives.</p><p>ANEXO IV</p>")
        so_de = clp.parse_anexo_iii_multi(xhtml_de, ["pt-BR", "de"])
        self.assertEqual(so_de["H200"], {"de": "Instabil, explosiv.", "pt-BR": "Explosivo instável."})  # SV e EN ignorados, não viram texto
        self.assertEqual(clp.parse_anexo_iii_multi(xhtml_de)["H200"]["en"], "Unstable explosives.")
        self.assertEqual(clp.LINGUA_JO, {"PT": "pt-BR", "EN": "en", "ES": "es", "DE": "de", "FR": "fr"})

    def test_rotulos_por_idioma_dos_pictogramas_e_palavras_de_advertencia(self):
        p = clp.pictogramas_por_idioma(["pt-BR", "en", "fr"])
        self.assertEqual(sorted(p), [f"GHS0{i}" for i in range(1, 10)])
        self.assertEqual(p["GHS06"], {"pt-BR": clp.PICTOGRAMAS["GHS06"], "en": "Skull and crossbones (acute toxicity)",
                                      "fr": "Tête de mort sur deux tibias (toxicité aiguë)"})
        for cod in clp.PICTOGRAMAS:  # todos os pictogramas têm os quatro idiomas
            self.assertEqual(set(clp.PICTOGRAMAS_POR_IDIOMA[cod]), {"en", "es", "de", "fr"}, cod)
        self.assertEqual(clp.palavras_sinal_por_idioma(["pt-BR", "es"]), {"Perigo": {"pt-BR": "Perigo", "es": "Peligro"},
                                                                          "Atenção": {"pt-BR": "Atenção", "es": "Atención"}})
        self.assertEqual(clp.texto_pt({"pt-BR": "a", "en": "b"}), "a")
        self.assertEqual(clp.texto_pt("a"), "a")
        self.assertEqual(clp.por_idioma("a"), {"pt-BR": "a"})

    def test_sem_anexo_levanta(self):
        with self.assertRaises(ValueError):
            clp.parse_anexo_iii("<html></html>")

    def test_pictogramas_cobrem_ghs01_a_09(self):
        self.assertEqual(sorted(clp.PICTOGRAMAS), [f"GHS0{i}" for i in range(1, 10)])


class ChebiTest(unittest.TestCase):
    def test_extrair_e_limpar_markup(self):
        resp = {"15365": {"exists": True, "primary_chebi_id": "CHEBI:15365", "data": {
            "name": "acetylsalicylic acid", "definition": "A <i>benzoic</i> acid with CO<sub>2</sub> &amp; H<sub>2</sub>O.",
            "names": {"SYNONYM": [{"name": "Acetylsalicylate", "language_code": "en"},
                                  {"name": "[ClO<small><sub>2</sub></small>(OH)]", "language_code": "en"},
                                  {"name": "Aspirina", "language_code": "pt"}]}}},
                "999": {"exists": False}}
        r = coleta_chebi.extrair(resp)
        self.assertEqual(list(r), [15365])
        self.assertEqual(r[15365]["definicao"], "A benzoic acid with CO₂ & H₂O.")
        self.assertIn("Acetylsalicylate", r[15365]["sinonimos"])
        self.assertNotIn("Aspirina", r[15365]["sinonimos"])  # só inglês
        self.assertEqual(coleta_chebi.LICENCA, "CC BY 4.0")


class CompostoTest(unittest.TestCase):
    PROPS = {"MolecularFormula": "H2O4S", "MolecularWeight": "98.08", "ExactMass": "97.96737971", "IUPACName": "sulfuric acid",
             "ConnectivitySMILES": "OS(=O)(=O)O", "InChIKey": "QAOWNCQODCNURD-UHFFFAOYSA-N", "XLogP": -1.4, "TPSA": 83,
             "HBondDonorCount": 2, "HBondAcceptorCount": 4, "RotatableBondCount": 0, "Charge": 0}
    WD = {"qid": "Q4118", "sl": 100, "pbr": ["ácido sulfúrico"], "ppt": [], "pen": ["sulfuric acid"],
          "apt": ["vitríolo", "ácido sulfúrico"], "aen": ["battery acid"], "cas": ["7664-93-9", "000-00-0"],
          "formulas": ["H₂SO₄"], "chebi": ["26836"], "ptwiki": ["Ácido sulfúrico"]}
    ENT = {"rotulos": {"pt-BR": "ácido sulfúrico", "en": "sulfuric acid", "es": "ácido sulfúrico", "de": "Schwefelsäure", "fr": "acide sulfurique"},
           "apelidos": {"pt-BR": ["vitríolo"], "en": ["battery acid", "H₂SO₄", "sulphuric acid", "7664-93-9", "CHEBI:26836"],
                        "de": ["Dihydrogensulfat", "Vitriolöl"], "fr": ["acide sulfurique", "huile de vitriol"]},
           "artigos": {"en": "Sulfuric acid", "de": "Schwefelsäure", "fr": "Acide sulfurique"}}

    def test_montar(self):
        sel = {"cid": 1118, "classes": ["acido"], "origem": "wikidata"}
        ghs = [{"pictogramas": ["GHS05"], "frasesH": ["H314"], "fonte": "Regulation (EC) No 1272/2008", "palavraSinal": "Perigo",
                "entrada": "sulphuric acid ... %", "indice": "016-020-00-8"}]
        anexo_vi = {"016-020-00-8": {"indice": "016-020-00-8", "nome": "ácido sulfúrico a ... %", "ec": ["231-639-5"], "cas": ["7664-93-9"]}}
        ch = {"id": 26836, "definicao": "Um oxiácido de enxofre.", "sinonimos": ["oil of vitriol", "CHEBI:26836"]}
        c, motivo = CCP.montar(sel, self.PROPS, self.WD, ghs, ch, "2026-10-10", anexo_vi=anexo_vi)
        self.assertIsNone(motivo)
        self.assertEqual(c["nome"], "Ácido sulfúrico")
        self.assertNotIn("nomePtPendente", c)
        self.assertEqual(c["formula"], "H2SO4")          # P274 normalizada (subscritos), composição conferida
        self.assertEqual(c["formulaHill"], "H2O4S")
        self.assertEqual(c["massaMolar"], 98.08)
        self.assertEqual(c["cas"], "7664-93-9")          # CAS com dígito verificador válido
        self.assertEqual(c["icscBuscaUrl"], coleta_icsc.url_busca_cas("7664-93-9"))
        self.assertEqual(c["propriedades"]["tpsa"], 83)
        self.assertEqual(c["ghs"]["frasesH"], ["H314"])
        self.assertEqual((c["ghs"]["casadoPor"], c["ghs"]["indice"]), ("cas", "016-020-00-8"))
        self.assertEqual(c["definicaoChebi"]["chebiId"], "CHEBI:26836")
        self.assertIn("oil of vitriol", c["sinonimos"])
        self.assertNotIn("CHEBI:26836", c["sinonimos"])
        self.assertNotIn("ácido sulfúrico", [s.lower() for s in c["sinonimos"]])  # não repete o nome
        self.assertEqual(c["nomes"], {"pt-BR": "Ácido sulfúrico"})  # sem entidade do Wikidata (ent=None): só o português; nada de IUPAC em `en`
        self.assertEqual(c["sinonimosPorIdioma"], {"en": ["oil of vitriol"]})  # ChEBI (inglês)
        nomes_fontes = [f["nome"] for f in c["fontes"]]
        self.assertEqual(nomes_fontes[0], "PubChem CID 1118")
        self.assertTrue(any("1272/2008" in n for n in nomes_fontes) and "Wikidata" in nomes_fontes)

    def test_nomes_e_sinonimos_por_idioma(self):
        sel = {"cid": 1118, "classes": ["acido"], "origem": "wikidata"}
        ch = {"id": 26836, "definicao": "Um oxiácido de enxofre.", "sinonimos": ["oil of vitriol", "CHEBI:26836"]}
        c, _ = CCP.montar(sel, self.PROPS, self.WD, None, ch, "2026-10-10", ent=self.ENT)
        self.assertEqual(c["nomes"], {"pt-BR": "Ácido sulfúrico", "en": "sulfuric acid", "es": "ácido sulfúrico", "de": "Schwefelsäure",
                                      "fr": "acide sulfurique"})
        sin = c["sinonimosPorIdioma"]
        self.assertEqual(sin["pt-BR"], ["vitríolo"])
        self.assertEqual(sin["en"], ["battery acid", "sulphuric acid", "oil of vitriol"])  # sem fórmula, CAS nem código; ChEBI entra em en
        self.assertEqual(sin["de"], ["Dihydrogensulfat", "Vitriolöl"])
        self.assertEqual(sin["fr"], ["huile de vitriol"])  # não repete o rótulo
        self.assertNotIn("es", sin)  # idioma sem apelidos = chave ausente
        # só os idiomas pedidos
        c2, _ = CCP.montar(sel, self.PROPS, self.WD, None, ch, "2026-10-10", ent=self.ENT, idiomas=["pt-BR", "en"])
        self.assertEqual(set(c2["nomes"]), {"pt-BR", "en"})
        # nome em português pendente: nomes.pt-BR ausente (o IUPAC não é nome em português)
        wd = dict(self.WD, pbr=[], ppt=[])
        c3, _ = CCP.montar(sel, self.PROPS, wd, None, None, "2026-10-10", ent=self.ENT)
        self.assertTrue(c3["nomePtPendente"])
        self.assertNotIn("pt-BR", c3["nomes"])
        self.assertEqual(c3["nomes"]["en"], "sulfuric acid")
        # a fórmula do próprio composto nunca é sinônimo (nem com subscritos); outra fórmula não é barrada por esta regra
        self.assertFalse(CCP.sinonimo_valido("H₂SO₄", "H2O4S"))
        self.assertFalse(CCP.sinonimo_valido("HCl", "ClH"))
        self.assertTrue(CCP.sinonimo_valido("PVC", "C2H3Cl"))
        # palavras funcionais de qualquer idioma nunca são sinônimo ("PARA" é apelido en do 1,4-diclorobenzeno no Wikidata)
        for palavra in ("PARA", "para", "The", "und", "pour", "con"):
            self.assertFalse(CCP.sinonimo_valido(palavra, "C6H4Cl2"), palavra)
        self.assertTrue(CCP.sinonimo_valido("PDCB", "C6H4Cl2"))
        self.assertTrue(CCP.sinonimo_valido("oil of vitriol", "H2O4S"))

    def test_indice_com_nomes_por_idioma(self):
        compostos = [{"cid": 1, "nome": "Água", "formula": "H2O", "formulaHill": "H2O", "sinonimos": ["aqua", "Dihydrogenmonoxid"],
                      "nomes": {"pt-BR": "Água", "en": "water", "de": "Wasser"},
                      "sinonimosPorIdioma": {"en": ["dihydrogen monoxide", "aqua"], "de": ["Dihydrogenmonoxid"]}},
                     {"cid": 2, "nome": "X", "formula": "H2", "formulaHill": "H2"}]
        _, idx = CCP.para_lotes(compostos)
        # só o que ainda não está em `nomes` (aqua e Dihydrogenmonoxid já estão lá pelos sinônimos legados)
        self.assertEqual(idx["nomesPorIdioma"], {"en": [["dihydrogen monoxide", 1], ["water", 1]], "de": [["wasser", 1]]})
        self.assertIn(["aqua", 1], idx["nomes"])
        self.assertNotIn("pt-BR", idx["nomesPorIdioma"])  # o português já está em `nomes`
        _, idx2 = CCP.para_lotes([compostos[1]])
        self.assertNotIn("nomesPorIdioma", idx2)

    def test_sem_nome_em_portugues_marca_pendente(self):
        wd = dict(self.WD, pbr=[], ppt=[], cas=[], chebi=[])
        c, _ = CCP.montar({"cid": 1118, "classes": [], "origem": "wikidata"}, self.PROPS, wd, None, None, "2026-10-10")
        self.assertTrue(c["nomePtPendente"])
        self.assertEqual(c["nome"], "sulfuric acid")
        self.assertNotIn("cas", c)
        self.assertNotIn("icscBuscaUrl", c)
        self.assertNotIn("ghs", c)

    def test_sem_smiles_descarta(self):
        c, motivo = CCP.montar({"cid": 1}, dict(self.PROPS, ConnectivitySMILES=""), self.WD, None, None, "2026-10-10")
        self.assertIsNone(c)
        self.assertTrue(motivo)

    def test_lotes_e_indice(self):
        compostos = [{"cid": i, "nome": f"Composto {i}", "formula": "H2O", "formulaHill": "H2O", "sinonimos": ["Água", "aqua"]}
                     for i in range(1, 451)]
        lotes, idx = CCP.para_lotes(compostos)
        self.assertEqual([n for n, _ in lotes], ["lote-001", "lote-002", "lote-003"])
        self.assertEqual([len(p) for _, p in lotes], [200, 200, 50])
        self.assertEqual(idx["porCid"]["1"], "lote-001")
        self.assertEqual(idx["porCid"]["450"], "lote-003")
        self.assertIn(["agua", 7], idx["nomes"])  # nome normalizado: minúsculo e sem acento


class IcscDesativadoTest(unittest.TestCase):
    def test_url_de_busca_por_cas_em_portugues(self):
        u = coleta_icsc.url_busca_cas("64-17-5")
        self.assertEqual(u, "https://chemicalsafety.ilo.org/dyn/icsc/showcard.listCards3?p_lang=pt&p_cas_number=64-17-5")

    def test_parser_desativado_com_html_sintetico(self):
        self.assertTrue(coleta_icsc.DESATIVADO)
        html = ("<table><tr><td><b>ETANOL (ANIDRO)</b></td><td>ICSC: 0044 (Maio 2018)</td></tr></table>"
                "<table><tr><td>CAS #: 64-17-5</td></tr><tr><td>ONU #: 1170</td></tr><tr><td>Número CE: 200-578-6</td></tr></table>")
        r = coleta_icsc.parse_cartao(html)
        self.assertEqual((r["nome"], r["icsc"], r["cas"], r["un"], r["ce"]), ("ETANOL (ANIDRO)", "0044", "64-17-5", "1170", "200-578-6"))


if __name__ == "__main__":
    unittest.main()
