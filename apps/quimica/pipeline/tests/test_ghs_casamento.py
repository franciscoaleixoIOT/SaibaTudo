# -*- coding: utf-8 -*-
"""Casamento composto -> entrada harmonizada do CLP (Anexo VI) por chave forte (17/10/2026).

Bug que motivou: o cloreto de sódio (CID 5234, CAS 7647-14-5) saía com GHS05/H318/H412 porque o PubChem liga a entrada
611-142-00-3 (corante poliazo "produto-por-processo" cujo nome termina em "e cloreto de sódio") a cada componente citado,
e o pipeline aceitava a 1ª referência com "1272/2008" sem conferir CAS, EC ou nome."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import clp  # noqa: E402
import coleta_compostos as CCP  # noqa: E402
import pubchem as P  # noqa: E402

FONTE = "Regulation (EC) No 1272/2008 of the European Parliament and of the Council"

ANEXO_VI = {
    "016-020-00-8": {"indice": "016-020-00-8", "nome": "ácido sulfúrico a ... %", "ec": ["231-639-5"], "cas": ["7664-93-9"]},
    "017-002-00-2": {"indice": "017-002-00-2", "nome": "cloreto de hidrogénio", "ec": ["231-595-7"], "cas": ["7647-01-0"]},
    "611-142-00-3": {"indice": "611-142-00-3",
                     "nome": "produto-por-processo: corante poliazóico obtido por acoplamento de ... sais de sódio, e cloreto de sódio",
                     "ec": ["425-740-5"], "cas": []},
    "603-002-00-5": {"indice": "603-002-00-5", "nome": "etanol; álcool etílico", "ec": ["200-578-6"], "cas": ["64-17-5"]},
    "082-001-00-6": {"indice": "082-001-00-6", "nome": "compostos de chumbo, com exceção dos especificados noutra parte deste anexo",
                     "ec": [], "cas": []},
    "999-001-00-1": {"indice": "999-001-00-1", "nome": "massa de reação de sulfato de sódio e cloreto de sódio",
                     "ec": ["900-000-1"], "cas": ["7647-14-5"]},
}


def cand(indice, entrada, frases=("H314",), pictos=("GHS05",)):
    return {"pictogramas": list(pictos), "frasesH": list(frases), "fonte": FONTE, "palavraSinal": "Perigo",
            "fonteUrl": "https://eur-lex.europa.eu/eli/reg/2008/1272/oj", "entrada": entrada, "indice": indice}


NACL = {"cid": 5234, "nome": "Cloreto de sódio", "cas": "7647-14-5", "nomeIupac": "sodium chloride",
        "nomes": {"pt-BR": "Cloreto de sódio", "en": "sodium chloride"}, "sinonimos": ["sal de cozinha", "sal"]}
H2SO4 = {"cid": 1118, "nome": "Ácido sulfúrico", "cas": "7664-93-9", "nomeIupac": "sulfuric acid",
         "nomes": {"pt-BR": "Ácido sulfúrico", "en": "sulfuric acid"}}
HCL = {"cid": 313, "nome": "Ácido clorídrico", "cas": "7647-01-0", "nomes": {"en": "hydrogen chloride"}}


class CasamentoTest(unittest.TestCase):
    def test_positivo_por_cas(self):
        g, rej = clp.escolher_ghs([cand("016-020-00-8", "sulphuric acid ... %")], H2SO4, ANEXO_VI)
        self.assertEqual(g["casadoPor"], "cas")
        self.assertEqual(g["indice"], "016-020-00-8")
        self.assertEqual(g["frasesH"], ["H314"])
        self.assertEqual(rej, [])

    def test_nacl_com_produto_por_processo_fica_sem_ghs(self):
        pc = cand("611-142-00-3", "product-by-process definition polyazodyestuff obtained by coupling...", ("H318", "H412"))
        g, rej = clp.escolher_ghs([pc], NACL, ANEXO_VI)
        self.assertIsNone(g)
        self.assertIn("substância pura", rej[0]["motivo"])
        # mesmo sem o Anexo VI (só o nome do PubChem) e mesmo se o nome do PubChem não dissesse "product-by-process"
        self.assertIsNone(clp.escolher_ghs([pc], NACL, None)[0])
        pc2 = dict(pc, entrada="polyazo dyestuff, sodium salts, and sodium chloride")
        self.assertIsNone(clp.escolher_ghs([pc2], NACL, ANEXO_VI)[0])  # nome do Anexo VI diz produto-por-processo
        self.assertIsNone(clp.escolher_ghs([dict(pc2, indice=None)], NACL, ANEXO_VI)[0])  # nome parcial não casa

    def test_massa_de_reacao_nunca_casa_mesmo_com_cas_igual(self):
        g, rej = clp.escolher_ghs([cand("999-001-00-1", "reaction mass of sodium sulphate and sodium chloride")], NACL, ANEXO_VI)
        self.assertIsNone(g)
        self.assertTrue(clp.nao_e_substancia_pura("UVCB substance"))
        self.assertTrue(clp.nao_e_substancia_pura("mistura reacional de: A; e B"))
        self.assertFalse(clp.nao_e_substancia_pura("sulphuric acid ... %"))

    def test_negativo_por_nome_parcial(self):
        # o nome do composto aparece dentro do nome da entrada, mas não é igual: não casa
        comp = {"cid": 1, "nome": "Cloreto de sódio", "nomes": {"en": "sodium chloride"}}
        vi = {"123-456-00-7": {"indice": "123-456-00-7", "nome": "cloreto de sódio e potássio", "ec": [], "cas": []}}
        g, rej = clp.escolher_ghs([cand("123-456-00-7", "sodium potassium chloride")], comp, vi)
        self.assertIsNone(g)
        self.assertIn("sem chave forte", rej[0]["motivo"])
        g, _ = clp.escolher_ghs([cand("082-001-00-6", "lead compounds with the exception of those specified elsewhere in this Annex")],
                                {"cid": 2, "nome": "Óxido de chumbo(II)", "nomes": {"en": "lead compounds"}}, ANEXO_VI)
        self.assertIsNone(g)

    def test_cas_diferente_rejeita_mesmo_com_nome_igual(self):
        comp = dict(H2SO4, cas="7664-93-0")
        g, rej = clp.escolher_ghs([cand("016-020-00-8", "sulfuric acid")], comp, ANEXO_VI)
        self.assertIsNone(g)
        self.assertIn("CAS diferente", rej[0]["motivo"])

    def test_nome_exato_sem_anexo_vi(self):
        g, _ = clp.escolher_ghs([cand("017-002-00-2", "hydrogen chloride")], HCL, None)
        self.assertEqual(g["casadoPor"], "nome")
        g, _ = clp.escolher_ghs([cand("603-002-00-5", "ethanol; ethyl alcohol")], {"cid": 702, "nome": "Etanol", "nomes": {"en": "Ethanol"}}, None)
        self.assertEqual(g["casadoPor"], "nome")  # sem acento/caixa, sinônimos separados por ';'
        # nome truncado pelo PubChem ("...") nunca vale como nome exato
        self.assertIsNone(clp.escolher_ghs([cand(None, "sodium chloride...")], NACL, None)[0])

    def test_ec_e_indice_quando_o_composto_os_tem(self):
        comp = {"cid": 3, "nome": "X", "ec": "200-578-6"}
        self.assertEqual(clp.escolher_ghs([cand("603-002-00-5", "y")], comp, ANEXO_VI)[0]["casadoPor"], "ec")
        self.assertIsNone(clp.escolher_ghs([cand("603-002-00-5", "y")], dict(comp, ec="200-000-0"), ANEXO_VI)[0])
        self.assertEqual(clp.escolher_ghs([cand("777-001-00-0", "y")], {"cid": 4, "nome": "Z", "indiceClp": "777-001-00-0"},
                                          ANEXO_VI)[0]["casadoPor"], "indice")

    def test_escolhe_a_entrada_certa_entre_varias(self):
        cs = [cand("611-142-00-3", "product-by-process ...", ("H318",)), cand("017-002-00-2", "hydrogen chloride", ("H331", "H314"))]
        g, rej = clp.escolher_ghs(cs, HCL, ANEXO_VI)
        self.assertEqual((g["indice"], g["casadoPor"], g["frasesH"]), ("017-002-00-2", "cas", ["H331", "H314"]))
        self.assertEqual(len(rej), 1)

    def test_montar_nacl_sem_ghs_e_registra_rejeicao(self):
        props = {"MolecularFormula": "ClNa", "ConnectivitySMILES": "[Na+].[Cl-]", "MolecularWeight": "58.44", "IUPACName": "sodium chloride"}
        rej = []
        c, motivo = CCP.montar({"cid": 5234, "nome": "Cloreto de sódio"}, props, {"cas": ["7647-14-5"]},
                               [cand("611-142-00-3", "product-by-process definition polyazodyestuff obtained by coupling...")],
                               None, "2026-10-17", anexo_vi=ANEXO_VI, ghs_rejeitados=rej)
        self.assertIsNone(motivo)
        self.assertNotIn("ghs", c)
        self.assertFalse(any("1272/2008" in f["nome"] for f in c["fontes"]))
        self.assertEqual((rej[0]["cid"], rej[0]["indice"]), (5234, "611-142-00-3"))


class AnexoViTest(unittest.TestCase):
    XHTML = """<html><body><p>ANEXO <br/>V</p>
<p class="oj-doc-ti">ANEXO <br/>VI</p><table>
<tr><td><p>Número de índice</p></td><td><p>Nome</p></td><td><p>N.º CE</p></td><td><p>N.º CAS</p></td></tr>
<tr><td><p>016-020-00-8</p></td><td><p>ácido sulfúrico a ... %</p></td><td><p>231-639-5</p></td><td><p>7664-93-9</p></td><td><p>H314</p></td></tr>
<tr><td><p><span>►C5</span> 022-006-00-2<span> ◄ </span></p></td><td><p>dióxido de titânio;</p><p>[em pó]</p></td>
<td><p>236-675-5</p></td><td><p>13463-67-7</p></td></tr>
<tr><td><p>611-142-00-3</p></td><td><p>produto-por-processo:</p><p>corante ... e cloreto de sódio</p></td><td><p>425-740-5</p></td><td><p>—</p></td></tr>
</table><p class="oj-doc-ti">ANEXO <br/>VII</p><table><tr><td><p>999-999-99-9</p></td><td><p>x</p></td><td><p>-</p></td><td><p>-</p></td></tr></table>
</body></html>"""

    def test_parse(self):
        d = clp.parse_anexo_vi(self.XHTML)
        self.assertEqual(set(d), {"016-020-00-8", "022-006-00-2", "611-142-00-3"})  # nada do Anexo VII
        self.assertEqual(d["016-020-00-8"]["cas"], ["7664-93-9"])
        self.assertEqual(d["016-020-00-8"]["ec"], ["231-639-5"])
        self.assertEqual(d["022-006-00-2"]["nome"], "dióxido de titânio; [em pó]")  # marca de alteração ►C5 ◄ não apaga o índice
        self.assertEqual(d["611-142-00-3"]["cas"], [])
        self.assertTrue(d["611-142-00-3"]["nome"].startswith("produto-por-processo"))

    def test_sem_anexo_vi_levanta(self):
        with self.assertRaises(ValueError):
            clp.parse_anexo_vi("<html><p>ANEXO III</p></html>")


class PubchemCandidatosTest(unittest.TestCase):
    def test_todas_as_entradas_harmonizadas_com_indice(self):
        def info(ref, nome, valores):
            return {"ReferenceNumber": ref, "Name": nome, "Value": {"StringWithMarkup": valores}}
        icone = lambda g: {"String": " ", "Markup": [{"URL": f"https://pubchem.ncbi.nlm.nih.gov/images/ghs/{g}.svg", "Type": "Icon"}]}
        d = {"Record": {"Section": [{"TOCHeading": "GHS Classification", "Information": [
            info(97, "Pictogram(s)", [icone("GHS05")]), info(97, "GHS Hazard Statements", [{"String": "H318: Causes serious eye damage"}]),
            info(52, "Pictogram(s)", [icone("GHS07")]),
            info(98, "Pictogram(s)", [icone("GHS06")]), info(98, "GHS Hazard Statements", [{"String": "H331: Toxic if inhaled"}])]}],
            "Reference": [
                {"ReferenceNumber": 97, "SourceName": FONTE, "SourceID": "611-142-00-3", "Name": "product-by-process definition ..."},
                {"ReferenceNumber": 52, "SourceName": "European Chemicals Agency (ECHA)", "SourceID": "103945", "Name": "Sodium chloride"},
                {"ReferenceNumber": 98, "SourceName": FONTE, "SourceID": "017-002-00-2", "Name": "hydrogen chloride"}]}}
        lst = P.extrair_ghs_harmonizados(d)
        self.assertEqual([x["indice"] for x in lst], ["611-142-00-3", "017-002-00-2"])  # a notificada (ECHA) fica fora
        self.assertEqual(P.extrair_ghs_harmonizado(d)["indice"], "611-142-00-3")  # compatibilidade: a 1ª, sem conferência


if __name__ == "__main__":
    unittest.main()
