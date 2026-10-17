# -*- coding: utf-8 -*-
"""Validação do pacote (gates), assinatura ECDSA (chave temporária), regras.json e fontes.json."""
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build  # noqa: E402
import fontes as F  # noqa: E402
import regras as R  # noqa: E402
import sign  # noqa: E402
from common import dump_json  # noqa: E402


def elemento(z):
    return {"z": z, "simbolo": f"X{z}", "nome": f"El{z}", "nomeEn": f"El{z}", "periodo": 1, "bloco": "s",
            "categoria": "nao_metal", "massaAtomica": 1.0 + z, "fontes": [{"nome": "PubChem", "url": "u", "licenca": "l", "acessadoEm": "d"}]}


def composto(cid, **extra):
    c = {"cid": cid, "nome": f"C{cid}", "formula": "H2O", "formulaHill": "H2O", "massaMolar": 18.015, "smiles": "O",
         "fontes": [{"nome": "PubChem", "url": "u", "licenca": "l", "acessadoEm": "d"}]}
    c.update(extra)
    return c


def texto(i, **extra):
    t = {"id": f"wikipedia-pt-t{i}", "fonte": "Wikipédia em português", "licenca": "CC BY-SA 4.0", "url": "https://pt.wikipedia.org/",
         "textoOriginal": "x" * 300, "textoPt": "x" * 300, "traducao": "n/a", "fontes": [{"nome": "n", "url": "u", "licenca": "l", "acessadoEm": "d"}]}
    t.update(extra)
    return t


def montar_pacote(raiz: Path, elementos=None, compostos=None, textos=None, extras=None):
    rels = []
    els = elementos if elementos is not None else [elemento(z) for z in range(1, 119)]
    cps = compostos if compostos is not None else [composto(i) for i in range(1, 21)]
    txs = textos if textos is not None else [texto(i) for i in range(5)]
    rels.append(build.escrever_json(raiz, "elementos.json", els))
    rels.append(build.escrever_json(raiz, "compostos/lote-001.json", cps))
    rels.append(build.escrever_json(raiz, "compostos/index.json", {"porCid": {str(c["cid"]): "lote-001" for c in cps}, "nomes": []}))
    rels.append(build.escrever_json(raiz, "constantes.json", {"constantes": [{"id": f"c{i}", "valor": 1.0, "fontes": [{"nome": "n"}]} for i in range(45)]}))
    for rel in ("regras.json", "fontes.json", "ghs_frases.json"):
        rels.append(build.escrever_json(raiz, rel, {}))
    for i, t in enumerate(txs):
        rels.append(build.escrever_json(raiz, f"textos/wikipedia-pt/t{i}.json", t))
    for rel, obj in (extras or {}).items():
        rels.append(build.escrever_json(raiz, rel, obj))
    fontes = F.gerar({"pubchem"}, "2026-10-10")
    return build.montar_manifest(raiz, rels, fontes, {"compostos": len(cps)}, "2026-10-10", datetime(2026, 10, 10, tzinfo=timezone.utc))


MIN = {"compostos": 10, "textos": 3}


class ValidacaoTest(unittest.TestCase):
    def pacote(self, **kw):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        raiz = Path(tmp.name)
        montar_pacote(raiz, **kw)
        return raiz

    def test_pacote_valido(self):
        self.assertEqual(build.validar(self.pacote(), minimos=MIN), [])

    def test_z_repetido_ou_faltando(self):
        els = [elemento(z) for z in range(1, 119)]
        els[5] = elemento(1)
        erros = build.validar(self.pacote(elementos=els), minimos=MIN)
        self.assertTrue(any("Z de 1 a 118" in e for e in erros))

    def test_cid_duplicado_e_smiles_vazio(self):
        cps = [composto(i) for i in range(1, 15)] + [composto(3), composto(99, smiles="")]
        erros = build.validar(self.pacote(compostos=cps), minimos=MIN)
        self.assertTrue(any("CID duplicado 3" in e for e in erros))
        self.assertTrue(any("99" in e and "smiles" in e for e in erros))

    def test_unidades_invalidas(self):
        els = [elemento(z) for z in range(1, 119)]
        els[7]["pontoFusaoK"] = -5
        self.assertTrue(any("pontoFusaoK" in e for e in build.validar(self.pacote(elementos=els), minimos=MIN)))

    def test_checksum_e_arquivo_alterado(self):
        raiz = self.pacote()
        (raiz / "elementos.json").write_text("[]", encoding="utf-8")
        self.assertTrue(any("checksum" in e for e in build.validar(raiz, minimos=MIN)))

    def test_ghs_so_harmonizado_e_icsc_so_link(self):
        cps = [composto(i) for i in range(1, 15)]
        cps[0]["ghs"] = {"pictogramas": ["GHS07"], "frasesH": ["H302"], "fonte": "ECHA C&L Notifications Summary"}
        cps[1]["cas"] = "64-17-5"  # sem icscBuscaUrl
        erros = build.validar(self.pacote(compostos=cps), minimos=MIN)
        self.assertTrue(any("harmonizada" in e for e in erros))
        self.assertTrue(any("icscBuscaUrl" in e for e in erros))

    def test_licenca_nc_e_openstax_barradas(self):
        txs = [texto(0), texto(1, licenca="CC BY-NC-SA 4.0"), texto(2, fonte="OpenStax Chemistry 2e", id="openstax-chem2e-3.1-001"), texto(3)]
        erros = build.validar(self.pacote(textos=txs), minimos=MIN)
        self.assertTrue(any("licença não permitida" in e for e in erros))
        self.assertTrue(any("OpenStax" in e for e in erros))

    def test_icsc_nao_pode_estar_no_pacote(self):
        erros = build.validar(self.pacote(extras={"seguranca/icsc/0044.json": {"icsc": "0044"}}), minimos=MIN)
        self.assertTrue(any("seguranca" in e for e in erros))

    def test_queda_anormal(self):
        erros = build.validar(self.pacote(), previo={"contagens": {"compostos": 1000}}, minimos=MIN)
        self.assertTrue(any("queda anormal" in e for e in erros))


class TextosEmLotesTest(unittest.TestCase):
    def pacote(self, **kw):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        raiz = Path(tmp.name)
        montar_pacote(raiz, **kw)
        return raiz

    def regs(self, n, fonte="wikipedia-en", idioma="en"):
        out = []
        for i in range(n):
            t = texto(i, id=f"{fonte}-artigo-{i:03d}", fonte="Wikipedia (en)", idioma=idioma, textoPt=None, titulo=f"Artigo {i}")
            t["_arquivo"] = f"artigo-{i:03d}.json"
            t["entidades"] = {"elementos": ["O"], "compostos": []}
            out.append(t)
        return out

    def test_escrever_lotes_divide_ordena_e_indexa(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp)
            idx = build.novo_indice_textos()
            regs = list(reversed(self.regs(450)))  # fora de ordem: a saída tem de ser ordenada por id
            rels = build.escrever_lotes(raiz, "wikipedia-en", regs, "en", idx)
            self.assertEqual(rels, ["textos/wikipedia-en/lote-001.json", "textos/wikipedia-en/lote-002.json", "textos/wikipedia-en/lote-003.json"])
            lote1 = json.loads((raiz / rels[0]).read_text(encoding="utf-8"))
            self.assertEqual(len(lote1), 200)
            self.assertEqual(lote1[0]["id"], "wikipedia-en-artigo-000")
            self.assertFalse(any(k.startswith("_") for k in lote1[0]))  # chaves internas não vão para o pacote
            self.assertEqual(len(json.loads((raiz / rels[2]).read_text(encoding="utf-8"))), 50)
            self.assertEqual(idx["versao"], 1)
            self.assertEqual([l["caminho"] for l in idx["lotes"]], rels)
            l1 = idx["lotes"][0]
            self.assertEqual((l1["fonte"], l1["idioma"]), ("wikipedia-en", "en"))
            self.assertEqual(l1["trechos"][0], {"id": "wikipedia-en-artigo-000", "titulo": "Artigo 0", "chave": "artigo",
                                                "entidades": {"elementos": ["O"], "compostos": []}})

    def test_chave_do_trecho(self):
        self.assertEqual(build.chave_do_trecho({"id": "x", "_chave": "oxygen"}), "oxygen")
        self.assertEqual(build.chave_do_trecho({"id": "x", "_arquivo": "acido-sulfurico-003.json"}), "acido-sulfurico")
        self.assertEqual(build.chave_do_trecho({"id": "x", "_arquivo": "lecture-1-012.json"}), "lecture-1")
        self.assertEqual(build.chave_do_trecho({"id": "gutenberg-14474-preface-001"}), "gutenberg-14474-preface")

    def test_validar_aceita_lotes_e_exige_indice_coerente(self):
        idx = build.novo_indice_textos()
        regs = self.regs(5)
        raiz = self.pacote(textos=[], extras={})
        # monta de novo com lotes + índice (montar_pacote grava um arquivo por trecho; aqui acrescentamos lotes)
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp)
            rels = build.escrever_lotes(raiz, "wikipedia-en", regs, "en", idx)
            extras = {"textos/index.json": idx}
            montar_pacote(raiz, textos=[texto(9)], extras=extras)
            # o manifesto de montar_pacote não conhece os lotes: reconstrói com eles
            m = json.loads((raiz / "manifest.json").read_text(encoding="utf-8"))
            for rel in rels:
                p = raiz / rel
                m["files"][rel] = {"bytes": p.stat().st_size, "sha256": build.sha256_file(p)}
            dump_json(raiz / "manifest.json", m, indent=2)
            self.assertEqual(build.validar(raiz, minimos=MIN), [])
            # índice que aponta para lote inexistente
            idx2 = dict(idx, lotes=idx["lotes"] + [{"caminho": "textos/wikipedia-fr/lote-001.json", "fonte": "wikipedia-fr", "idioma": "fr", "trechos": []}])
            dump_json(raiz / "textos/index.json", idx2)
            p = raiz / "textos/index.json"
            m["files"]["textos/index.json"] = {"bytes": p.stat().st_size, "sha256": build.sha256_file(p)}
            dump_json(raiz / "manifest.json", m, indent=2)
            erros = build.validar(raiz, minimos=MIN)
            self.assertTrue(any("não está no manifesto" in e for e in erros), erros)
            # lote maior que o permitido
            grande = self.regs(201)
            build.escrever_json(raiz, "textos/wikipedia-en/lote-001.json", [{k: v for k, v in r.items() if not k.startswith("_")} for r in grande])
            p = raiz / "textos/wikipedia-en/lote-001.json"
            m["files"]["textos/wikipedia-en/lote-001.json"] = {"bytes": p.stat().st_size, "sha256": build.sha256_file(p)}
            dump_json(raiz / "manifest.json", m, indent=2)
            erros = build.validar(raiz, minimos=MIN)
            self.assertTrue(any("máximo 200" in e for e in erros), erros)

    def test_validar_nomes_por_idioma(self):
        els = [elemento(z) for z in range(1, 119)]
        els[0]["nomes"] = {"pt-BR": "El1", "en": "Hydrogen", "de": "Wasserstoff"}
        els[1]["nomes"] = {"pt-BR": "outro"}  # diverge de nome
        els[2]["nomes"] = {"pt-BR": "El3", "xx": "?"}  # idioma desconhecido
        erros = build.validar(self.pacote(elementos=els), minimos=MIN)
        self.assertEqual(len([e for e in erros if "nomes inválido" in e]), 2, erros)
        cps = [composto(i) for i in range(1, 15)]
        cps[0]["nomes"] = {"en": "water"}  # sem pt-BR é permitido (nomePtPendente)
        cps[1]["nomes"] = {"pt-BR": "x"}
        cps[2]["sinonimosPorIdioma"] = {"zz": ["a"]}
        erros = build.validar(self.pacote(compostos=cps), minimos=MIN)
        self.assertTrue(any("nomes.pt-BR diverge" in e for e in erros))
        self.assertTrue(any("sinonimosPorIdioma inválido" in e for e in erros))
        self.assertFalse(any("composto 1:" in e for e in erros), erros)

    def test_montar_ghs_frases_multilingue(self):
        frases = {"H300": {"pt-BR": "Mortal por ingestão.", "en": "Fatal if swallowed.", "de": "Lebensgefahr bei Verschlucken."},
                  "H310": {"pt-BR": "Mortal em contacto com a pele.", "en": "Fatal in contact with skin."},
                  "H225": "Líquido e vapor facilmente inflamáveis."}  # forma antiga (str) ainda aceita
        comp = [composto(1, ghs={"frasesH": ["H300+H310", "H225", "H999"], "pictogramas": ["GHS06"], "fonte": "1272/2008"})]
        g, sem = build.montar_ghs_frases(frases, comp, "2026-10-10", {}, ["pt-BR", "en", "de"])
        self.assertEqual(sem, ["H999"])
        self.assertEqual(g["frasesH"]["H225"], {"texto": frases["H225"], "textoPorIdioma": {"pt-BR": frases["H225"]}})
        comb = g["frasesH"]["H300+H310"]
        self.assertEqual(comb["texto"], "Mortal por ingestão; Mortal em contacto com a pele")
        self.assertEqual(comb["textoPorIdioma"], {"pt-BR": "Mortal por ingestão; Mortal em contacto com a pele",
                                                  "en": "Fatal if swallowed; Fatal in contact with skin"})  # de só em um componente: fora
        self.assertEqual(comb["componentes"], ["H300", "H310"])
        self.assertEqual(g["idiomas"], ["pt-BR", "en", "de"])
        self.assertEqual(g["todasAsFrases"]["H300"], "Mortal por ingestão.")
        self.assertEqual(g["todasAsFrasesPorIdioma"]["H300"]["de"], "Lebensgefahr bei Verschlucken.")
        self.assertEqual(set(g["pictogramasPorIdioma"]["GHS01"]), {"pt-BR", "en", "de"})
        self.assertEqual(g["palavrasSinalPorIdioma"]["Atenção"], {"pt-BR": "Atenção", "en": "Warning", "de": "Achtung"})
        self.assertEqual(g["palavrasSinal"], ["Perigo", "Atenção"])


class ManifestoEAssinaturaTest(unittest.TestCase):
    def test_manifesto_segue_o_contrato_e_assinatura_confere(self):
        with tempfile.TemporaryDirectory() as tmp:
            raiz = Path(tmp) / "pacote"
            m = montar_pacote(raiz)
            for k in ("version", "generatedAt", "schemaVersion", "files", "sources", "licencas", "cliente", "idiomas"):
                self.assertIn(k, m)
            self.assertEqual(m["idiomas"], ["pt-BR"])  # montar_pacote não passa idiomas
            self.assertEqual(m["schemaVersion"], 1)
            self.assertEqual(m["cliente"]["pollIntervalMinutes"], 10080)
            self.assertEqual(m["cliente"]["baseUrl"], "https://saibatudo.net/quimica/data/")
            self.assertFalse(m["cliente"]["ask"]["enabled"])
            self.assertFalse(m["cliente"]["melhoria"]["enabled"])
            self.assertEqual(set(m["files"]["elementos.json"]), {"bytes", "sha256"})
            self.assertNotIn("manifest.json", m["files"])
            priv, pub = Path(tmp) / "k.pem", Path(tmp) / "pub.pem"
            sign.gerar(priv, pub)  # chave temporária
            sign.assinar(raiz / "manifest.json", priv)
            self.assertTrue(sign.verificar(raiz / "manifest.json", pub))
            (raiz / "manifest.json").write_bytes((raiz / "manifest.json").read_bytes() + b" ")
            self.assertFalse(sign.verificar(raiz / "manifest.json", pub))

    def test_troca_atomica_mantem_o_anterior_em_falha(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino, novo = Path(tmp) / "pacote", Path(tmp) / "pacote.novo"
            destino.mkdir()
            (destino / "v.txt").write_text("antigo")
            novo.mkdir()
            (novo / "v.txt").write_text("novo")
            build.trocar_atomicamente(novo, destino)
            self.assertEqual((destino / "v.txt").read_text(), "novo")
            self.assertFalse(novo.exists())
            self.assertFalse((Path(tmp) / "pacote.antigo").exists())


class RegrasEFontesTest(unittest.TestCase):
    def test_regras(self):
        r = R.montar("2026-10-10")
        self.assertEqual(len(r["prefixosSI"]), 24)
        kilo = next(p for p in r["prefixosSI"] if p["simbolo"] == "k")
        self.assertEqual((kilo["expoente"], kilo["fator"]), (3, 1000.0))
        self.assertEqual(r["unidades"]["pressao"]["fatores"]["atm"], 101325)
        self.assertAlmostEqual(r["unidades"]["pressao"]["fatores"]["Torr"] * 760, 101325)
        self.assertEqual(r["unidades"]["energia"]["fatores"]["cal"], 4.184)
        f = r["unidades"]["temperatura"]["afins"]["°F"]
        self.assertAlmostEqual(f["a"] * 212 + f["b"], 373.15)  # 212 °F = 100 °C
        self.assertEqual(r["serieReatividadeMetais"]["ordem"][0], "Li")
        self.assertIn("HCl", [a["formula"] for a in r["acidosFortes"]])
        self.assertIn("NaOH", [b["formula"] for b in r["basesFortes"]])
        for pid, p in r["propriedades"].items():
            base = {"nome", "unidade", "origem", "escopo", "sinonimos", "rotulos", "sinonimosPorIdioma"}
            self.assertTrue(base <= set(p) <= base | {"origens", "escopos", "unidades", "nota", "escala"}, pid)
            if "origens" in p:
                self.assertIn(p["origem"], p["origens"], pid)
            self.assertEqual(p["rotulos"]["pt-BR"], p["nome"])
            self.assertEqual(p["sinonimosPorIdioma"]["pt-BR"], p["sinonimos"])
            self.assertEqual(set(p["rotulos"]), {"pt-BR", "en", "es", "de", "fr"}, pid)  # toda propriedade traduzida
            self.assertEqual(set(p["sinonimosPorIdioma"]), {"pt-BR", "en", "es", "de", "fr"}, pid)
            for i, lst in p["sinonimosPorIdioma"].items():
                self.assertTrue(lst and all(isinstance(x, str) and x.strip() for x in lst), (pid, i, lst))
        self.assertEqual(r["propriedades"]["pontoFusaoK"]["rotulos"]["fr"], "Point de fusion")
        self.assertEqual(r["propriedadesRevisao"], {"pt-BR": "humana", "en": "pendente", "es": "pendente", "de": "pendente", "fr": "pendente"})
        so_en = R.montar("2026-10-10", ["pt-BR", "en"])["propriedades"]["massaMolar"]
        self.assertEqual(set(so_en["rotulos"]), {"pt-BR", "en"})
        self.assertIn("massaMolar", r["propriedades"])
        self.assertTrue(any("Green Book" in f["nome"] for f in r["fontes"]))

    def test_fontes_e_licencas(self):
        todas = F.gerar(None, "2026-10-10")
        ids = {f["id"] for f in todas}
        self.assertNotIn("openstax", ids)
        self.assertFalse(any("OpenStax" in f["nome"] for f in todas))
        for f in todas:
            self.assertEqual(f["acessadoEm"], "2026-10-10")
            self.assertIn(f["treino"], ("sim", "cond.", "nao"))
        self.assertEqual(F.POR_ID["icsc-oit"]["uso"], "link")
        self.assertEqual(F.POR_ID["icsc-oit"]["treino"], "nao")
        self.assertEqual(F.POR_ID["chebi"]["licenca"], "CC BY 4.0")
        self.assertEqual(F.POR_ID["wikipedia-pt"]["licenca"], "CC BY-SA 4.0")
        for lang, idioma in (("pt", "pt-BR"), ("en", "en"), ("es", "es"), ("de", "de"), ("fr", "fr")):  # uma fonte por idioma
            f = F.POR_ID[f"wikipedia-{lang}"]
            self.assertEqual((f["licenca"], f["idioma"], f["uso"]), ("CC BY-SA 4.0", idioma, "textos"))
            self.assertEqual(f["url"], f"https://{lang}.wikipedia.org/")
        self.assertEqual(F.POR_ID["wikipedia-en"]["nome"], "Wikipedia (en)")
        self.assertEqual(F.POR_ID["chebi"]["idioma"], "en")
        self.assertEqual(F.POR_ID["wikidata"]["licenca"], "CC0")
        self.assertEqual({lic["licenca"] for lic in F.licencas(todas)} >= {"CC0", "CC BY 4.0", "CC BY-SA 4.0", "domínio público"}, True)


if __name__ == "__main__":
    unittest.main()
