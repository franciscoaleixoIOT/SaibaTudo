# -*- coding: utf-8 -*-
"""Roda `build.py --rapido` OFFLINE sobre respostas reais gravadas em fixtures/cache (PubChem, Wikidata, CODATA, Wikimedia,
ChEBI, Gutenberg). As frases H do CLP (29 MB no Cellar) são substituídas por um dicionário pequeno."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import build  # noqa: E402
import clp  # noqa: E402
import sign  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "cache"
FRASES = {"H225": "Líquido e vapor facilmente inflamáveis.", "H271": "Risco de incêndio ou de explosão; muito comburente.",
          "H272": "Pode agravar incêndios; comburente.", "H300": "Mortal por ingestão.", "H310": "Mortal em contacto com a pele.",
          "H314": "Provoca queimaduras na pele e lesões oculares graves.", "H330": "Mortal por inalação.",
          "H331": "Tóxico por inalação.", "H335": "Pode provocar irritação das vias respiratórias."}
# forma multilíngue que clp.coletar devolve hoje ({código: {idioma: texto}}); só H314 tem texto em inglês e alemão aqui
FRASES_MULTI = {c: {"pt-BR": t} for c, t in FRASES.items()}
FRASES_MULTI["H314"].update({"en": "Causes severe skin burns and eye damage.", "de": "Verursacht schwere Verätzungen der Haut und schwere Augenschäden."})


class BuildOfflineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls.tmp.name)
        cls.out = tmp / "pacote"
        cls.cache = tmp / "cache"
        shutil.copytree(FIXTURES, cls.cache)  # cópia: o build pode gravar (ultimo_stats.json)
        sign.gerar(tmp / "k.pem", tmp / "pub.pem")
        cls.pub = tmp / "pub.pem"
        cls._orig = clp.coletar
        clp.coletar = lambda http, hoje, idiomas=None: ({c: dict(d) for c, d in FRASES_MULTI.items()},
                                                        {"celex": "teste", "url": clp.URL_EURLEX.format(celex="32008R1272")})
        try:
            cls.rc = build.main(["--rapido", "--offline", "--cache", str(cls.cache), "--out", str(cls.out),
                                 "--limite-compostos", "12", "--limite-textos", "6", "--hoje", "2026-10-10",
                                 "--assinar-com", str(tmp / "k.pem")])
        finally:
            clp.coletar = cls._orig

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def lido(self, rel):
        return json.loads((self.out / rel).read_text(encoding="utf-8"))

    def test_build_terminou_e_assinou(self):
        self.assertEqual(self.rc, 0)
        self.assertTrue(sign.verificar(self.out / "manifest.json", self.pub))
        self.assertEqual(build.validar(self.out, minimos={"compostos": 10, "textos": 10, "constantes": 40}), [])
        self.assertFalse(Path(str(self.out) + ".novo").exists())

    def test_contagens(self):
        m = self.lido("manifest.json")
        self.assertEqual(m["contagens"]["elementos"], 118)
        self.assertEqual(m["contagens"]["compostos"], 12)
        self.assertGreaterEqual(m["contagens"]["constantes"], 50)
        self.assertGreater(m["contagens"]["textosPorFonte"]["gutenberg-14474"], 100)
        self.assertGreater(m["contagens"]["textosPorFonte"]["wikipedia-pt"], 5)
        self.assertEqual(m["contagens"]["textosPorFonte"]["gold-book"], 0)
        for lang in ("en", "es", "de", "fr"):  # Wikipédia nos outros idiomas, pelos sitelinks do Wikidata (fixtures reais)
            self.assertGreater(m["contagens"]["textosPorFonte"][f"wikipedia-{lang}"], 5, lang)
        self.assertEqual(m["idiomas"], ["pt-BR", "en", "es", "de", "fr"])
        self.assertEqual(m["contagens"]["elementosComNomePorIdioma"]["de"], 118)
        self.assertEqual(sum(m["contagens"]["textosPorIdioma"].values()), m["contagens"]["textos"])

    def test_elementos_e_compostos(self):
        els = self.lido("elementos.json")
        self.assertEqual([e["z"] for e in els], list(range(1, 119)))
        o = els[7]
        self.assertEqual(o["nomes"], {"pt-BR": "Oxigênio", "en": "Oxygen", "es": "oxígeno", "de": "Sauerstoff", "fr": "oxygène"})
        self.assertEqual(o["nome"], "Oxigênio")  # campos antigos continuam
        c = self.lido("compostos/lote-001.json")
        self.assertEqual(len(c), 12)
        hcl = next(x for x in c if x["cid"] == 313)
        self.assertEqual(hcl["formula"], "HCl")
        self.assertEqual(hcl["nomes"]["pt-BR"], hcl["nome"])
        self.assertEqual(hcl["nomes"]["de"], "Chlorwasserstoff")
        self.assertEqual(hcl["nomes"]["fr"], "chlorure d'hydrogène")
        self.assertNotIn("HCl", hcl["sinonimosPorIdioma"].get("en", []))  # a fórmula do composto não é sinônimo
        self.assertTrue(all(set(v) <= {"pt-BR", "en", "es", "de", "fr"} for x in c for v in (x.get("nomes", {}), x.get("sinonimosPorIdioma", {}))))
        self.assertTrue(all(len(lst) <= 10 for x in c for lst in x.get("sinonimosPorIdioma", {}).values()))
        idx = self.lido("compostos/index.json")
        self.assertIn(["chlorwasserstoff", 313], idx["nomesPorIdioma"]["de"])
        self.assertEqual(hcl["formulaHill"], "ClH")
        self.assertEqual(hcl["cas"], "7647-01-0")
        self.assertTrue(hcl["icscBuscaUrl"].startswith("https://chemicalsafety.ilo.org/dyn/icsc/showcard.listCards3?p_lang=pt&p_cas_number="))
        self.assertIn("1272/2008", hcl["ghs"]["fonte"])
        self.assertEqual(self.lido("compostos/index.json")["porCid"]["313"], "lote-001")

    def test_nada_de_openstax_nem_icsc_nos_dados(self):
        self.assertFalse((self.out / "seguranca").exists())
        self.assertFalse((self.out / "textos" / "openstax-chem2e").exists())
        pastas = {p.name for p in (self.out / "textos").iterdir()}
        self.assertTrue(pastas <= {"wikipedia-pt", "wikipedia-en", "wikipedia-es", "wikipedia-de", "wikipedia-fr", "wikibooks-pt", "chebi",
                                   "gutenberg-14474", "gold-book", "index.json"}, pastas)
        m = self.lido("manifest.json")
        self.assertFalse(any("openstax" in k.lower() or k.startswith("seguranca/") for k in m["files"]))

    def test_licencas_declaradas(self):
        licencas = {l["licenca"] for l in self.lido("manifest.json")["licencas"]}
        self.assertTrue({"CC0", "CC BY 4.0", "CC BY-SA 4.0", "domínio público"} <= licencas, licencas)
        fontes = {f["id"]: f for f in self.lido("fontes.json")["fontes"]}
        self.assertEqual(fontes["gutenberg-14474"]["licenca"], "domínio público")
        self.assertNotIn("openstax", fontes)

    def test_stats(self):
        s = self.lido("stats.json")
        self.assertNotIn("stats.json", self.lido("manifest.json")["files"])
        self.assertEqual(s["familias"]["goldBook"]["status"], "bloqueado")
        self.assertIn("trechosPorTema", s["familias"]["wikipedia"])
        self.assertIn("temasSemArtigo", s["familias"]["wikipedia"])
        self.assertIn("duracaoSegundos", s)
        self.assertEqual(s["erros"], [])

    def test_ghs_frases_em_portugues(self):
        g = self.lido("ghs_frases.json")
        self.assertEqual(g["frasesH"]["H314"]["texto"], FRASES["H314"])  # `texto` continua em português (site e Android leem)
        self.assertEqual(g["frasesH"]["H314"]["textoPorIdioma"], FRASES_MULTI["H314"])
        self.assertEqual(g["frasesH"]["H335"]["textoPorIdioma"], {"pt-BR": FRASES["H335"]})  # idioma sem texto = chave ausente
        self.assertEqual(g["todasAsFrases"]["H314"], FRASES["H314"])
        self.assertEqual(g["todasAsFrasesPorIdioma"]["H314"]["de"], FRASES_MULTI["H314"]["de"])
        self.assertEqual(g["palavrasSinalPorIdioma"]["Perigo"]["de"], "Gefahr")
        self.assertEqual(g["pictogramasPorIdioma"]["GHS05"]["en"], "Corrosion (corrosive)")
        self.assertEqual(g["pictogramas"]["GHS05"], "Corrosão (corrosivo)")
        self.assertEqual(g["usadosSemTexto"], [])

    def test_textos_em_lotes_e_indice(self):
        m = self.lido("manifest.json")
        textos = [k for k in m["files"] if k.startswith("textos/")]
        self.assertIn("textos/index.json", textos)
        self.assertTrue(all(k == "textos/index.json" or k.rsplit("/", 1)[-1].startswith("lote-") for k in textos), textos)
        idx = self.lido("textos/index.json")
        self.assertEqual(idx["versao"], 1)
        por_caminho = {l["caminho"]: l for l in idx["lotes"]}
        self.assertEqual(sorted(por_caminho), sorted(k for k in textos if k != "textos/index.json"))
        en = por_caminho["textos/wikipedia-en/lote-001.json"]
        self.assertEqual((en["fonte"], en["idioma"]), ("wikipedia-en", "en"))
        self.assertEqual(por_caminho["textos/wikipedia-pt/lote-001.json"]["idioma"], "pt-BR")
        self.assertEqual(por_caminho["textos/chebi/lote-001.json"]["idioma"], "en")
        lote = self.lido("textos/wikipedia-en/lote-001.json")
        self.assertIsInstance(lote, list)
        self.assertLessEqual(len(lote), build.LOTE_TEXTOS)
        self.assertEqual([t["id"] for t in lote], sorted(t["id"] for t in lote))  # ordem estável por id
        self.assertEqual([t["id"] for t in en["trechos"]], [t["id"] for t in lote])
        for t in en["trechos"]:
            self.assertEqual(set(t), {"id", "titulo", "chave", "entidades"})
        hidrogenio = next(t for t in lote if t["entidades"]["elementos"] == ["H"])  # --limite-textos 6: H..C
        self.assertEqual((hidrogenio["fonte"], hidrogenio["idioma"], hidrogenio["licenca"]), ("Wikipedia (en)", "en", "CC BY-SA 4.0"))
        self.assertTrue(hidrogenio["url"].startswith("https://en.wikipedia.org/w/index.php?title=Hydrogen&oldid="))
        self.assertTrue(hidrogenio["urlArtigo"].startswith("https://en.wikipedia.org/wiki/"))
        self.assertIsNone(hidrogenio["textoPt"])  # nunca traduzimos
        self.assertTrue(hidrogenio["id"].startswith("wikipedia-en-hydrogen-"))
        chave = next(t for t in en["trechos"] if t["id"] == hidrogenio["id"])["chave"]
        self.assertEqual(chave, "hydrogen")
        de = self.lido("textos/wikipedia-de/lote-001.json")
        self.assertTrue(any(t["entidades"]["elementos"] == ["H"] and t["id"].startswith("wikipedia-de-wasserstoff-") for t in de))
        pt = self.lido("textos/wikipedia-pt/lote-001.json")
        self.assertTrue(all(t["idioma"] == "pt" and t["textoPt"] for t in pt))
        fontes = {f["id"]: f for f in self.lido("fontes.json")["fontes"]}
        self.assertEqual(fontes["wikipedia-en"]["idioma"], "en")
        self.assertEqual(fontes["wikipedia-de"]["licenca"], "CC BY-SA 4.0")

    def test_regras_com_rotulos_por_idioma(self):
        r = self.lido("regras.json")
        self.assertEqual(r["propriedades"]["massaMolar"]["rotulos"]["de"], "Molare Masse")
        self.assertEqual(r["propriedades"]["massaMolar"]["sinonimos"], ["massa molar", "massa molecular", "peso molecular"])


if __name__ == "__main__":
    unittest.main()
