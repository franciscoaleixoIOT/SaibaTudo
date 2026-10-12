"""Testes do gerador de léxicos Kotlin (tools/gerar_lexico_kt.py): gerados em dia, saída determinística, escape de strings e validação.

    python -m unittest tools.test_gerar_lexico_kt      (da pasta apps/quimica)

A compilação de TODAS as regexes com java.util.regex fica no teste unitário do Android (app/src/test/.../LexicoTest.kt).
"""
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

from tools import gerar_lexico_kt as g


class GerarLexicoKtTest(unittest.TestCase):
    def test_gerados_em_dia(self):
        self.assertEqual(g.desatualizados(), [], "rode python tools/gerar_lexico_kt.py")
        self.assertEqual(g.main(["--check"]), 0)

    def test_um_arquivo_por_idioma_do_contrato_mais_o_indice(self):
        gerados = g.gerar(escrever=False)
        idiomas = [json.loads(a.read_text(encoding="utf-8"))["idioma"] for a in sorted(g.CONTRATOS.glob("*.json"))]
        self.assertEqual(set(gerados), {g.nome_arquivo(i) for i in idiomas} | {g.INDICE})
        self.assertIn("LexicoPtBr.kt", gerados)
        indice = gerados[g.INDICE]
        for i in idiomas:
            self.assertIn(f'"{i}" -> Lexico{g.sufixo(i)}.bruto()', indice)
        self.assertTrue(indice.index('"pt-BR"') < indice.index('"en"'), "pt-BR primeiro (padrão)")

    def test_saida_deterministica_com_cabecalho_pacote_e_objeto(self):
        with tempfile.TemporaryDirectory() as tmp:
            saida = Path(tmp) / "lexico"
            a = g.gerar(saida=saida)
            b = g.gerar(saida=saida)
            self.assertEqual(a, b)
            for nome, kt in a.items():
                self.assertTrue(kt.startswith("// gerado — não editar"), nome)
                self.assertIn(f"package {g.PACOTE}\n", kt)
                self.assertEqual((saida / nome).read_bytes().decode("utf-8"), kt)
                self.assertNotIn("\r\n", kt)
                if nome != g.INDICE:
                    self.assertIn(f"internal object {nome[:-3]} {{", kt)
                    self.assertIn("fun bruto(): Map<String, Any?> = linkedMapOf<String, Any?>(", kt)

    def test_check_falha_quando_o_gerado_esta_velho_ou_falta(self):
        with tempfile.TemporaryDirectory() as tmp:
            saida = Path(tmp) / "lexico"
            g.gerar(saida=saida)
            self.assertEqual(g.desatualizados(saida=saida), [])
            alvo = saida / "LexicoEn.kt"
            alvo.write_text(alvo.read_text(encoding="utf-8").replace('"en"', '"xx"', 1), encoding="utf-8", newline="\n")
            (saida / "LexicoFr.kt").unlink()
            (saida / "LexicoXx.kt").write_text("// sobra\n", encoding="utf-8")
            self.assertEqual(sorted(g.desatualizados(saida=saida)), ["LexicoEn.kt", "LexicoFr.kt", "LexicoXx.kt"])

    def test_contrato_alterado_muda_o_gerado(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp) / "lexico"
            shutil.copytree(g.CONTRATOS, pasta)
            en = json.loads((pasta / "en.json").read_text(encoding="utf-8"))
            en["intencoes"]["ph"] = r"\b(?:ph|poh|acidity)\b"
            (pasta / "en.json").write_text(json.dumps(en, ensure_ascii=False, indent=1), encoding="utf-8")
            novo = g.gerar(pasta, escrever=False)["LexicoEn.kt"]
            self.assertIn(r'"ph" to "\\b(?:ph|poh|acidity)\\b"', novo)
            self.assertNotEqual(novo, g.gerar(escrever=False)["LexicoEn.kt"])

    def test_cada_regex_do_json_aparece_com_escape_kotlin(self):
        """Todo valor textual do contrato está no .kt exatamente como literal Kotlin (\\, ", $ escapados)."""
        gerados = g.gerar(escrever=False)
        for arq in sorted(g.CONTRATOS.glob("*.json")):
            dados = json.loads(arq.read_text(encoding="utf-8"))
            kt = gerados[g.nome_arquivo(dados["idioma"])]
            for _, rx in g.base._regexes(dados):
                self.assertIn(g.texto_kt(rx), kt, f"{arq.name}: {rx}")
            # nenhum "$" sem escape (seria template do Kotlin)
            self.assertIsNone(re.search(r'(?<!\\)\$(?=[A-Za-z_{])', kt), arq.name)

    def test_escape_de_strings(self):
        self.assertEqual(g.texto_kt('a\\b"c$d'), '"a\\\\b\\"c\\$d"')
        self.assertEqual(g.texto_kt("é°µ"), '"é°µ"')
        self.assertEqual(g.texto_kt("x​y\n"), '"x\\u200By\\n"')
        self.assertEqual(g.texto_kt("😀"), '"\\uD83D\\uDE00"')
        self.assertEqual(g.sufixo("pt-BR"), "PtBr")
        self.assertEqual(g.sufixo("en"), "En")

    def test_validacao_rejeita_armadilhas_do_java(self):
        base = json.loads((g.CONTRATOS / "en.json").read_text(encoding="utf-8"))
        base["intencoes"]["ph"] = r"\bph{\b"
        self.assertTrue(any("Illegal repetition" in p for p in g.validar_java(base, "en.json")))
        base["intencoes"]["ph"] = r"\bph++\b"
        self.assertTrue(any("possessivo" in p for p in g.validar_java(base, "en.json")))
        base["intencoes"]["ph"] = r"\bph\z"
        self.assertTrue(any("Java" in p for p in g.validar_java(base, "en.json")))
        base["intencoes"]["ph"] = r"\b(?:ph|poh)\b|x\{?-?\d+\}?|a{1,3}|\++"
        self.assertEqual(g.validar_java(base, "en.json"), [])

    def test_contrato_invalido_nao_gera(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp) / "lexico"
            shutil.copytree(g.CONTRATOS, pasta)
            en = json.loads((pasta / "en.json").read_text(encoding="utf-8"))
            en["intencoes"]["ph"] = "(ab"
            (pasta / "en.json").write_text(json.dumps(en), encoding="utf-8")
            with self.assertRaises(ValueError):
                g.gerar(pasta, saida=Path(tmp) / "saida")
            self.assertFalse((Path(tmp) / "saida").exists())


if __name__ == "__main__":
    unittest.main()
