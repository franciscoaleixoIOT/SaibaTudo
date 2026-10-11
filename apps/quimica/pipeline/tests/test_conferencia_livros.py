# -*- coding: utf-8 -*-
"""Correções apontadas pela conferência local com os livros de referência (11/10/2026). Os livros só indicaram ONDE olhar:
cada correção vem de fonte pública (pesos atômicos padrão do pacote, Wikidata, PubChem) ou de não publicar o dado."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import coleta_compostos as CC  # noqa: E402
import coleta_elementos as CE  # noqa: E402
from test_elementos_constantes import LINHA_O  # noqa: E402

PESOS = {"H": 1.008, "O": 15.999, "Pb": 207.2, "Li": 6.94, "Ar": 39.948, "Sn": 118.71}


def props(formula, mw, smiles="X"):
    return {"MolecularFormula": formula, "MolecularWeight": mw, "ConnectivitySMILES": smiles, "IUPACName": formula}


class Cas(unittest.TestCase):
    def test_desempata_pela_ordem_dos_sinonimos_do_pubchem(self):
        # SnO₂: o Wikidata traz 12026-24-3 (Sn(OH)₂) e 18282-10-5; o PubChem lista o do SnO₂ primeiro
        self.assertEqual(CC.escolher_cas(["12026-24-3", "18282-10-5"], ["Tin dioxide", "18282-10-5", "Stannic oxide", "12026-24-3"]),
                         "18282-10-5")
        # tetraborato anidro × decaidratado
        self.assertEqual(CC.escolher_cas(["1303-96-4", "1330-43-4"], ["Sodium tetraborate", "1330-43-4", "1303-96-4"]), "1330-43-4")

    def test_sem_sinonimos_mantem_a_regra_antiga_e_ignora_cas_invalido(self):
        self.assertEqual(CC.escolher_cas(["1303-96-4", "1330-43-4"]), "1303-96-4")
        self.assertEqual(CC.escolher_cas(["1330-43-5", "1330-43-4"]), "1330-43-4", "dígito verificador errado é descartado")
        self.assertIsNone(CC.escolher_cas([]))

    def test_enriquecimento_nunca_escolhe_o_item_do_elemento(self):
        class Http:
            pass
        linhas = [{"cid": "783", "item": "http://www.wikidata.org/entity/Q556", "sl": "250", "cass": "12385-13-6"},
                  {"cid": "783", "item": "http://www.wikidata.org/entity/Q1", "sl": "40", "cass": "1333-74-0"}]
        original = CC.W.sparql
        CC.W.sparql = lambda *a, **k: linhas
        try:
            por_cid, _ = CC.enriquecer_wikidata(Http(), [783], log=lambda *_: None, excluir_qids=frozenset({"Q556"}))
        finally:
            CC.W.sparql = original
        self.assertEqual(por_cid[783]["qid"], "Q1")
        self.assertEqual(por_cid[783]["cas"], ["1333-74-0"])


class SinonimosOpcionais(unittest.TestCase):
    def test_sem_resposta_do_pubchem_o_desempate_e_pulado_sem_derrubar_o_build(self):
        import pubchem as PC
        from http_cache import CacheMiss, HttpErro

        class Http:
            def __init__(self, erro):
                self.erro = erro

            def get(self, url):
                raise self.erro
        for erro in (CacheMiss("x"), HttpErro(429, "https://pubchem.ncbi.nlm.nih.gov/x")):
            self.assertEqual(PC.PubChem(Http(erro)).sinonimos([1, 2, 3]), {})


class ItemDoWikidata(unittest.TestCase):
    def test_prefere_o_item_com_a_formula_do_pubchem_ao_de_mais_sitelinks(self):
        linhas = [{"cid": "783", "item": "http://www.wikidata.org/entity/Q902508", "sl": "17", "cass": "12184-90-6", "frms": "H₂⁺"},
                  {"cid": "783", "item": "http://www.wikidata.org/entity/Q3027893", "sl": "14", "cass": "1333-74-0", "frms": "H₂"}]
        original = CC.W.sparql
        CC.W.sparql = lambda *a, **k: linhas
        try:
            por_cid, _ = CC.enriquecer_wikidata(object(), [783], log=lambda *_: None, formulas_pubchem={783: "H2"})
            sem_formula, _ = CC.enriquecer_wikidata(object(), [783], log=lambda *_: None)
        finally:
            CC.W.sparql = original
        self.assertEqual((por_cid[783]["qid"], por_cid[783]["cas"]), ("Q3027893", ["1333-74-0"]))
        self.assertEqual(sem_formula[783]["qid"], "Q902508", "sem fórmula do PubChem, a regra antiga (mais sitelinks)")


class MassaMolar(unittest.TestCase):
    def test_massa_pela_formula_com_pesos_padrao(self):
        self.assertEqual(CC.massa_pela_formula("PbO", PESOS), 223.2)
        self.assertEqual(CC.massa_pela_formula("HLiO", PESOS), 23.95)
        self.assertIsNone(CC.massa_pela_formula("XeF2", PESOS), "elemento sem peso: fica o valor do PubChem")
        self.assertIsNone(CC.massa_pela_formula("PbO", None))

    def test_montar_corrige_o_arredondamento_do_pubchem(self):
        c, motivo = CC.montar({"cid": 14827, "nome": "Óxido de chumbo(II)"}, props("OPb", "223"), {}, None, None, "2026-10-11", pesos=PESOS)
        self.assertIsNone(motivo)
        self.assertEqual(c["massaMolar"], 223.2)

    def test_isotopo_mantem_a_massa_do_pubchem_e_mostra_d(self):
        c, _ = CC.montar({"cid": 24602, "nome": "Água deuterada"}, props("H2O", "20.028"), {"formulas": ["D₂O"]}, None, None,
                         "2026-10-11", pesos=PESOS)
        self.assertEqual(c["massaMolar"], 20.028)
        self.assertEqual(c["formula"], "D2O")

    def test_sem_pesos_fica_como_antes(self):
        c, _ = CC.montar({"cid": 14827, "nome": "Óxido de chumbo(II)"}, props("OPb", "223"), {}, None, None, "2026-10-11")
        self.assertEqual(c["massaMolar"], 223)


class Duplicatas(unittest.TestCase):
    def test_remove_mesmo_inchikey_ou_mesmo_cas_mantendo_o_primeiro(self):
        cs = [{"cid": 6093208, "nome": "Hidróxido de cálcio", "inchiKey": "AXCZ", "cas": "1305-62-0"},
              {"cid": 14777, "nome": "Hidróxido de cálcio", "inchiKey": "AXCZ", "cas": "1305-62-0"},
              {"cid": 135398634, "nome": "Guanina", "inchiKey": "UYTP-A", "cas": "73-40-5"},
              {"cid": 764, "nome": "Guanina", "inchiKey": "UYTP-B", "cas": "73-40-5"},
              {"cid": 702, "nome": "Etanol", "inchiKey": "LFQS", "cas": "64-17-5"}]
        meta = {c["cid"]: {} for c in cs}
        unicos, dups = CC.deduplicar(cs, meta)
        self.assertEqual([c["cid"] for c in unicos], [6093208, 135398634, 702])
        self.assertEqual({d["cid"]: d["igualA"] for d in dups}, {14777: 6093208, 764: 135398634})
        self.assertNotIn(764, meta)


class Elementos(unittest.TestCase):
    def test_carbono_e_arsenio_sem_fusao_nem_ebulicao_a_1_atm(self):
        for z, s, n in ((6, "C", "Carbon"), (33, "As", "Arsenic")):
            e = CE.montar_elemento(dict(LINHA_O, AtomicNumber=str(z), Symbol=s, Name=n, MeltingPoint="3823", BoilingPoint="4098"),
                                   None, "2026-10-11")
            self.assertNotIn("pontoFusaoK", e, s)
            self.assertNotIn("pontoEbulicaoK", e, s)
        o = CE.montar_elemento(LINHA_O, None, "2026-10-11")
        self.assertIn("pontoFusaoK", o)


if __name__ == "__main__":
    unittest.main()
