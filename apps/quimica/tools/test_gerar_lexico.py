"""Testes do gerador de léxicos (tools/gerar_lexico.py): saída determinística, validação dos contratos e gerados em dia.

    python -m unittest tools.test_gerar_lexico      (da pasta apps/quimica)
"""
import json
import re
import tempfile
import unittest
from pathlib import Path

from tools import gerar_lexico as g


class GerarLexicoTest(unittest.TestCase):
    def test_contratos_existentes_sao_validos_e_tem_as_mesmas_chaves_do_pt_br(self):
        contratos = g.carregar()
        self.assertIn("pt-BR.json", contratos)
        self.assertIn("en.json", contratos)
        for nome, dados in contratos.items():
            self.assertEqual(g.validar(dados, nome), [], nome)
            if nome != "pt-BR.json":
                self.assertEqual(g.mesmas_chaves(contratos["pt-BR.json"], dados), [], nome)

    def test_todo_idioma_cobre_todas_as_intencoes_e_propriedades_do_pt_br(self):
        contratos = g.carregar()
        ref = contratos["pt-BR.json"]
        for nome, dados in contratos.items():
            self.assertEqual(set(dados["intencoes"]), set(ref["intencoes"]), nome)
            self.assertEqual(set(dados["propriedades"]), set(ref["propriedades"]), nome)
            self.assertEqual({u[1] for u in dados["unidades"]}, {u[1] for u in ref["unidades"]}, f"{nome}: símbolos de unidade")
            self.assertEqual({c[1] for c in dados["categorias"]}, {c[1] for c in ref["categorias"]}, f"{nome}: categorias")
            self.assertEqual({(e[1], e[2]) for e in dados["extremos"]}, {(e[1], e[2]) for e in ref["extremos"]}, f"{nome}: extremos")
            self.assertEqual(set(dados["seguranca"]["coladaAlvos"]), set(ref["seguranca"]["coladaAlvos"]), nome)
            for chave in ("acao", "alvoExplosivos", "alvoArmas", "alvoDrogas", "alvoDano", "alvoAutolesao", "perigososCaseiros", "casa"):
                self.assertGreaterEqual(len(dados["seguranca"][chave]), 5, f"{nome}: seguranca.{chave}")

    def test_gerados_em_dia(self):
        self.assertEqual(g.desatualizados(), [], "rode python tools/gerar_lexico.py")

    def test_saida_deterministica_com_cabecalho_e_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            saida = Path(tmp) / "lex"
            a = g.gerar(saida=saida)
            b = g.gerar(saida=saida)
            self.assertEqual(a, b)
            for nome, js in a.items():
                self.assertTrue(js.startswith("// gerado — não editar"), nome)
                self.assertIn("export default {", js)
                corpo = js[js.index("export default ") + len("export default "):].rstrip().rstrip(";")
                self.assertEqual(json.loads(corpo)["idioma"] + ".js", nome)
                self.assertEqual((saida / nome).read_text(encoding="utf-8"), js)

    def test_validacao_rejeita_regex_quebrada_lookbehind_variavel_e_idioma_errado(self):
        base = json.loads(json.dumps(g.carregar()["en.json"]))
        base["intencoes"]["ph"] = "(ab"
        self.assertTrue(any("regex inválida" in p for p in g.validar(base, "en.json")))
        base = json.loads(json.dumps(g.carregar()["en.json"]))
        base["intencoes"]["ph"] = r"(?<=a+)b"
        self.assertTrue(any("lookbehind" in p for p in g.validar(base, "en.json")))
        base["idioma"] = "xx"
        self.assertTrue(any("idioma inválido" in p for p in g.validar(base, "en.json")))

    def test_mesmas_chaves_detecta_falta_e_sobra(self):
        self.assertEqual(g.mesmas_chaves({"a": {"b": 1}}, {"a": {"b": 2}}), [])
        self.assertEqual(g.mesmas_chaves({"a": {"b": 1}}, {"a": {}}), ["falta .a.b"])
        self.assertEqual(g.mesmas_chaves({"a": {}}, {"a": {"c": 1}}), ["sobra .a.c"])

    def test_serializacao_igual_a_do_json_stringify(self):
        # o teste web (lexico.test.mjs) compara JSON.stringify(obj, null, 1) com o arquivo gerado: as duas serializações têm de coincidir
        s = g.serializar({"a": [1, "é", {"b": None, "c": True}], "d": ""})
        self.assertEqual(s, '{\n "a": [\n  1,\n  "é",\n  {\n   "b": null,\n   "c": true\n  }\n ],\n "d": ""\n}')
        self.assertFalse(re.search(r"\\u00", s))


if __name__ == "__main__":
    unittest.main()
