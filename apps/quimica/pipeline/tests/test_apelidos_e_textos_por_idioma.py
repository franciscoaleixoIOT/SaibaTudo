# -*- coding: utf-8 -*-
"""Frente L (17/10/2026): apelidos de autoria própria por idioma (lista_fixa.APELIDOS_POR_IDIOMA -> coleta_compostos) e textos do pacote por idioma
(avisoPorIdioma, notaPorIdioma, nomePorIdioma, metodoPorIdioma), mais os sinônimos de solubilidade/pKa no contrato de léxico. Sem rede."""
import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))  # auxiliares de test_propriedades_wikidata

import coleta_compostos as CCP  # noqa: E402
import coleta_elementos as CE  # noqa: E402
import coleta_propriedades as CP  # noqa: E402
import lista_fixa as LF  # noqa: E402
import quimica_util as Q  # noqa: E402
import regras as R  # noqa: E402
from common import IDIOMAS  # noqa: E402
from test_propriedades_wikidata import decs, linha  # noqa: E402  (linhas SPARQL sintéticas)

LEXICOS = Path(__file__).resolve().parents[2] / "contracts" / "lexico"
HOJE = "2026-10-17"
NACL = 5234


def lexico(idioma):
    return json.loads((LEXICOS / f"{idioma}.json").read_text(encoding="utf-8"))


def entidade(**apelidos):
    """Entidade do Wikidata mínima (saída de wikidata.entidades) com rótulos e apelidos por idioma."""
    return {"rotulos": {"en": "sodium chloride", "es": "cloruro de sodio", "de": "Natriumchlorid", "fr": "chlorure de sodium"}, "apelidos": apelidos}


class TabelaDeApelidosTest(unittest.TestCase):
    def test_estrutura_e_formulas_validas(self):
        self.assertIn(NACL, LF.APELIDOS_POR_IDIOMA)
        for cid, reg in LF.APELIDOS_POR_IDIOMA.items():
            self.assertIsInstance(cid, int)
            self.assertTrue(reg["nome"] and reg["formula"], cid)
            Q.hill_igual(reg["formula"], reg["formula"])  # a fórmula é lida pela química do pipeline
            self.assertTrue(set(reg["apelidos"]) <= set(IDIOMAS), cid)
            for idioma, lista in reg["apelidos"].items():
                self.assertTrue(lista and len(lista) == len({Q.norm(x) for x in lista}), f"{cid} {idioma}: vazio ou repetido")
                for a in lista:
                    self.assertTrue(CCP.sinonimo_valido(a, reg["formula"]), f"{cid} {idioma}: apelido inválido {a!r}")

    def test_um_apelido_nao_aponta_para_dois_compostos_no_mesmo_idioma(self):
        vistos = {}
        for cid, reg in LF.APELIDOS_POR_IDIOMA.items():
            for idioma, lista in reg["apelidos"].items():
                for a in lista:
                    chave = (idioma, Q.norm(a))
                    self.assertNotIn(chave, vistos, f"{a!r} ({idioma}) em {cid} e em {vistos.get(chave)}")
                    vistos[chave] = cid

    def test_apelidos_pedidos_pela_frente_L(self):
        t = LF.APELIDOS_POR_IDIOMA
        sal = t[NACL]["apelidos"]
        self.assertTrue({"sal", "sal de mesa", "sal comum"} <= set(sal["pt-BR"]))
        self.assertTrue({"table salt", "salt"} <= set(sal["en"]))
        self.assertTrue({"sal de mesa", "sal común"} <= set(sal["es"]))
        self.assertTrue({"Kochsalz", "Speisesalz"} <= set(sal["de"]))
        self.assertTrue({"sel de table", "sel"} <= set(sal["fr"]))
        self.assertIn("Salzsäure", t[313]["apelidos"]["de"])           # ácido clorídrico
        self.assertIn("Natronlauge", t[14798]["apelidos"]["de"])       # hidróxido de sódio
        self.assertIn("Essig", t[176]["apelidos"]["de"])               # ácido acético
        self.assertIn("Zucker", t[5988]["apelidos"]["de"])             # sacarose
        self.assertIn("eau de Javel", t[23665760]["apelidos"]["fr"])   # hipoclorito de sódio
        for idioma, nome in (("es", "glucosa"), ("de", "Glukose"), ("fr", "glucose")):
            self.assertIn(nome, t[5793]["apelidos"][idioma])           # glicose
        # nomes mais longos que contêm "sal": existem para o "sal" sozinho não os capturar
        self.assertIn("sal de Epsom", t[24083]["apelidos"]["pt-BR"])
        self.assertIn("sal amoníaco", t[25517]["apelidos"]["pt-BR"])


class ApelidosNoPacoteTest(unittest.TestCase):
    def test_so_aplica_se_a_formula_confere(self):
        self.assertEqual(CCP.apelidos_manuais(NACL, "ClNa"), LF.APELIDOS_POR_IDIOMA[NACL]["apelidos"])   # Hill do PubChem
        self.assertEqual(CCP.apelidos_manuais(NACL, "H2O"), {})            # CID certo, fórmula errada: nada entra
        self.assertEqual(CCP.apelidos_manuais(NACL, None), {})
        self.assertEqual(CCP.apelidos_manuais(999999999, "ClNa"), {})      # CID fora da tabela

    def test_entram_na_frente_dos_do_wikidata_e_o_teto_de_10_nao_os_corta(self):
        c = {"cid": NACL, "nome": "Cloreto de sódio", "nomePopular": "Sal de cozinha"}
        wikidata_en = [f"apelido do wikidata {i}" for i in range(12)]
        ent = entidade(en=wikidata_en, es=["sal", "cloruro sódico"], de=["Kochsalz", "Salz"])
        manuais = CCP.apelidos_manuais(NACL, "ClNa")
        nomes, sin = CCP.nomes_por_idioma(c, ent, IDIOMAS, formula="ClNa", manuais=manuais)
        self.assertEqual(sin["en"][:2], ["table salt", "salt"])
        self.assertEqual(len(sin["en"]), 10)
        self.assertEqual(sin["fr"], ["sel de table", "sel de cuisine", "sel"])      # fr não tinha nada no Wikidata
        self.assertEqual(sin["pt-BR"], ["sal", "sal de mesa", "sal comum"])           # "Sal de cozinha" é o nomePopular: não repete
        self.assertEqual([x for x in sin["es"] if Q.norm(x) == "sal"], ["sal"])      # sem repetir o que o Wikidata também traz
        self.assertEqual(sin["de"].count("Kochsalz"), 1)
        self.assertEqual(nomes["fr"], "chlorure de sodium")

    def test_sem_manuais_o_resultado_e_o_de_sempre(self):
        c = {"cid": 1, "nome": "Água"}
        ent = entidade(en=["dihydrogen monoxide"])
        a = CCP.nomes_por_idioma(c, ent, IDIOMAS, formula="H2O")
        b = CCP.nomes_por_idioma(c, ent, IDIOMAS, formula="H2O", manuais={})
        self.assertEqual(a, b)
        self.assertEqual(a[1], {"en": ["dihydrogen monoxide"]})

    def test_montar_poe_o_apelido_pt_em_sinonimos_e_em_sinonimos_por_idioma(self):
        sel = {"cid": NACL, "nome": "Cloreto de sódio", "popular": "Sal de cozinha", "formulaDeclarada": "NaCl"}
        props = {"MolecularFormula": "ClNa", "ConnectivitySMILES": "[Na+].[Cl-]", "MolecularWeight": "58.44", "ExactMass": "57.96",
                 "IUPACName": "sodium chloride", "InChIKey": "FAPWRFPIFSIZLT-UHFFFAOYSA-M"}
        wd = {"pen": ["sodium chloride"], "apt": [], "aen": ["table salt"], "qid": "Q2314"}
        c, motivo = CCP.montar(sel, props, wd, None, None, HOJE, ent=entidade(en=["common salt"]))
        self.assertIsNone(motivo)
        self.assertEqual(c["sinonimos"][:3], ["sal", "sal de mesa", "sal comum"])
        self.assertEqual(c["sinonimosPorIdioma"]["pt-BR"], ["sal", "sal de mesa", "sal comum"])
        self.assertEqual(c["sinonimosPorIdioma"]["fr"], ["sel de table", "sel de cuisine", "sel"])
        self.assertEqual(c["sinonimosPorIdioma"]["de"][:2], ["Kochsalz", "Speisesalz"])
        # o índice de nomes do pacote (busca por nome sem baixar os lotes) enxerga os apelidos
        lotes, indice = CCP.para_lotes([c])
        nomes = {n for n, cid in indice["nomes"]}
        self.assertTrue({"sal", "sal de mesa", "sal comum"} <= nomes)
        self.assertIn("sel", {n for n, _ in indice["nomesPorIdioma"]["fr"]})
        self.assertIn("kochsalz", {n for n, _ in indice["nomesPorIdioma"]["de"]})

    def test_cid_com_formula_trocada_nao_ganha_apelido(self):
        sel = {"cid": NACL, "nome": "Água", "formulaDeclarada": "H2O"}
        props = {"MolecularFormula": "H2O", "ConnectivitySMILES": "O", "MolecularWeight": "18.015", "ExactMass": "18.01"}
        c, _ = CCP.montar(sel, props, {"qid": "Q283"}, None, None, HOJE, ent=entidade())
        self.assertNotIn("sal", c.get("sinonimos", []))
        self.assertNotIn("sal", c.get("sinonimosPorIdioma", {}).get("pt-BR", []))


def numeros(texto):
    """Números do texto com vírgula decimal normalizada para ponto ("2,36" e "2.36" -> "2.36"); a data da conferência vira "11 10 2026" em todos os idiomas."""
    for data in ("11/10/2026", "11.10.2026", "11 Oct 2026"):
        texto = texto.replace(data, "11 10 2026")
    return sorted(x.replace(",", ".") for x in re.findall(r"\d+(?:[.,]\d+)?", texto))


class TextosPorIdiomaTest(unittest.TestCase):
    TABELAS = {
        "AVISO_AFINIDADE_I18N": R.AVISO_AFINIDADE_I18N, "NOTA_ELETRONEGATIVIDADE_I18N": R.NOTA_ELETRONEGATIVIDADE_I18N,
        "NOME_FONTE_DERIVADA_I18N": R.NOME_FONTE_DERIVADA_I18N, "METODO_ESTADO_PADRAO_I18N": R.METODO_ESTADO_PADRAO_I18N,
    }

    def test_cinco_idiomas_e_pt_br_igual_ao_campo_antigo(self):
        for nome, tabela in self.TABELAS.items():
            self.assertEqual(list(tabela), list(IDIOMAS), nome)
            self.assertTrue(all(isinstance(v, str) and v.strip() for v in tabela.values()), nome)
        self.assertEqual(R.AVISO_AFINIDADE_I18N["pt-BR"], CE.AVISO_AFINIDADE)
        self.assertEqual(R.NOTA_ELETRONEGATIVIDADE_I18N["pt-BR"], CE.NOTA_ELETRONEGATIVIDADE)

    def test_a_traducao_nao_muda_nenhum_numero(self):
        for nome, tabela in list(self.TABELAS.items()) + [(f"nota {pid}", t) for pid, t in R.NOTAS_PROPRIEDADES_I18N.items()]:
            ref = numeros(tabela["pt-BR"]) if "pt-BR" in tabela else numeros(R.PROPRIEDADES_EXTRA[nome.split()[1]]["nota"])
            for idioma, texto in tabela.items():
                self.assertEqual(numeros(texto), ref, f"{nome} [{idioma}]: números diferentes do pt-BR")

    def test_nomes_de_campo_e_marcas_ficam_como_estao(self):
        for idioma, texto in R.METODO_ESTADO_PADRAO_I18N.items():
            self.assertIn("pontoFusaoK", texto, idioma)
            self.assertIn("pontoEbulicaoK", texto, idioma)
        for idioma, texto in R.NOME_FONTE_DERIVADA_I18N.items():
            self.assertIn("(SaibaTudo Química)", texto, idioma)
        for pid in ("energiaIonizacaoKJmol", "afinidadeEletronicaKJmol"):
            for idioma, texto in R.NOTAS_PROPRIEDADES_I18N[pid].items():
                self.assertIn("elementos[].fontesPorPropriedade", texto, f"{pid} {idioma}")
        for idioma, texto in R.NOTAS_PROPRIEDADES_I18N["pka"].items():
            self.assertIn("`pkaValores`", texto, idioma)

    def test_regras_propriedades_traz_nota_por_idioma_ao_lado_da_nota(self):
        props = R.montar(HOJE)["propriedades"]
        com_nota = [pid for pid, p in props.items() if "nota" in p]
        self.assertEqual(sorted(com_nota), sorted(R.NOTAS_PROPRIEDADES_I18N), "toda nota de propriedade tem as quatro traduções")
        for pid in com_nota:
            p = props[pid]
            self.assertEqual(list(p["notaPorIdioma"]), list(IDIOMAS), pid)
            self.assertEqual(p["notaPorIdioma"]["pt-BR"], p["nota"], pid)
        for pid, p in props.items():
            if "nota" not in p:
                self.assertNotIn("notaPorIdioma", p, pid)

    def test_respeita_os_idiomas_pedidos_ao_build(self):
        p = R.montar(HOJE, ["pt-BR", "en"])["propriedades"]["pka"]
        self.assertEqual(list(p["notaPorIdioma"]), ["pt-BR", "en"])

    def test_elementos_levam_aviso_e_nota_por_idioma(self):
        e = {"z": 81, "simbolo": "Tl", "afinidadeEletronicaKJmol": 19.3, "eletronegatividade": 1.62, "fontes": []}
        CE.marcar_origens_pubchem(e, HOJE)
        f = e["fontesPorPropriedade"]["afinidadeEletronicaKJmol"]
        self.assertEqual(f["aviso"], f["avisoPorIdioma"]["pt-BR"])
        self.assertEqual(set(f["avisoPorIdioma"]), set(IDIOMAS))
        self.assertIn("outdated", f["avisoPorIdioma"]["en"])
        n = e["fontesPorPropriedade"]["eletronegatividade"]
        self.assertEqual(n["nota"], n["notaPorIdioma"]["pt-BR"])
        self.assertIn("1.7 × 2.36", n["notaPorIdioma"]["en"])
        # elemento que não está na lista de desatualizados: sem aviso, nem por idioma
        e2 = {"z": 8, "simbolo": "O", "afinidadeEletronicaKJmol": 141.0, "fontes": []}
        CE.marcar_origens_pubchem(e2, HOJE)
        self.assertNotIn("avisoPorIdioma", e2["fontesPorPropriedade"]["afinidadeEletronicaKJmol"])

    def test_o_estado_padrao_derivado_leva_nome_e_metodo_por_idioma(self):
        props, fontes, _ = CP.escolher(decs(linha("P2101", "-114.1", "Q25267", "a"),
                                            linha("P2102", "173", "Q42289", "b", press="760@Q185648")), HOJE)
        self.assertEqual(props["estadoPadrao"], "liquido")
        f = fontes["estadoPadrao"]
        self.assertEqual((f["nome"], f["metodo"]), (R.NOME_FONTE_DERIVADA_PT, R.METODO_ESTADO_PADRAO_PT))
        self.assertEqual(f["nomePorIdioma"], R.NOME_FONTE_DERIVADA_I18N)
        self.assertEqual(f["metodoPorIdioma"], R.METODO_ESTADO_PADRAO_I18N)
        # a tabela do módulo não pode ser alterada por quem recebe o registro
        f["nomePorIdioma"]["en"] = "x"
        self.assertNotEqual(R.NOME_FONTE_DERIVADA_I18N["en"], "x")
        c = {"cid": 1, "propriedades": dict(props), "fontesPorPropriedade": fontes}
        self.assertEqual([e for e in CP.validar_registro(c) if "estadoPadrao" in e], [])


class SinonimosDeLexicoTest(unittest.TestCase):
    """Sinônimos de `solubilidade` e `pka` no contrato de léxico (formas normalizadas) nos cinco idiomas."""

    PEDIDOS = {
        "pt-BR": {"solubilidade": ["solubilidade", "soluvel em agua", "quanto dissolve", "se dissolve"],
                  "pka": ["pka", "constante de acidez", "constante de ionizacao acida", "ka de"]},
        "en": {"solubilidade": ["solubility", "soluble", "how much dissolves"], "pka": ["pka", "acid dissociation constant", "acidity constant"]},
        "es": {"solubilidade": ["solubilidad", "soluble"], "pka": ["constante de acidez"]},
        "de": {"solubilidade": ["loslichkeit", "loslich", "wasserloslich"], "pka": ["pks", "pks-wert", "saurekonstante"]},
        "fr": {"solubilidade": ["solubilite", "soluble"], "pka": ["pka", "constante d acidite"]},
    }

    def test_formas_pedidas_em_cada_idioma(self):
        for idioma, ids in self.PEDIDOS.items():
            props = lexico(idioma)["propriedades"]
            for pid, formas in ids.items():
                for f in formas:
                    self.assertIn(f, props[pid], f"{idioma}.{pid}: falta {f!r}")

    def test_formas_ja_normalizadas_e_de_uma_so_propriedade(self):
        for idioma in IDIOMAS:
            props = lexico(idioma)["propriedades"]
            for pid in ("solubilidade", "pka"):
                self.assertEqual(len(props[pid]), len(set(props[pid])), f"{idioma}.{pid}: repetida")
                for f in props[pid]:
                    self.assertRegex(f, r"^[a-z0-9+\- ]+$", f"{idioma}.{pid}: {f!r} não está normalizada (minúsculas, sem acento, só [a-z0-9+-] e espaços)")
                    donas = [k for k, v in props.items() if f in v]
                    self.assertEqual(donas, [pid], f"{idioma}: {f!r} está em {donas}")

    def test_sal_nao_vira_formula_SAl(self):
        # "sal" é apelido do NaCl (índice `nomes`, chave sem espaço): o dicionário do cliente também o lê como fórmula S+Al ("sal" = SAl), e essa
        # leitura não respeita o nome mais longo já achado ("sal de Epsom" traria o NaCl junto com o MgSO4). `naoFormulas` desliga só essa leitura.
        for idioma in IDIOMAS:
            self.assertIn("SAL", lexico(idioma)["naoFormulas"], idioma)

    def test_ph_nao_rouba_constante_de_acidez_de(self):
        # "acidez de"/"acidité de" sozinho é pH ("acidez de uma solução"); depois de "constante de" é pKa
        casos = {"pt-BR": ("constante de acidez de acido acetico", "acidez de uma solucao"),
                 "es": ("constante de acidez de acido acetico", "acidez de una solucion"),
                 "fr": ("constante d acidite de l acide acetique", "acidite de la solution")}
        for idioma, (pka, ph) in casos.items():
            rx = re.compile(lexico(idioma)["intencoes"]["ph"])
            self.assertIsNone(rx.search(pka), f"{idioma}: {pka!r} virou pH")
            self.assertTrue(rx.search(ph), f"{idioma}: {ph!r} deixou de ser pH")


if __name__ == "__main__":
    unittest.main()
