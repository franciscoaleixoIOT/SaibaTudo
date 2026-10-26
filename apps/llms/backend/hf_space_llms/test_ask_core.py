# -*- coding: utf-8 -*-
"""ask_core do Space do SaibaTudo LLMs, sem baixar modelo: validação, mensagens do prompt (idioma, rodapé, contexto, trechos) e limites.
Uso: python -m unittest discover -s backend/hf_space_llms -p "test_*.py"
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ask_core as core  # noqa: E402


class Validacao(unittest.TestCase):
    def test_pergunta_curta_ou_longa(self):
        with self.assertRaises(ValueError):
            core.validate_question("ab")
        with self.assertRaises(ValueError):
            core.validate_question("x" * 401)
        self.assertEqual(core.validate_question("  o que é um token?  "), "o que é um token?")

    def test_idioma(self):
        self.assertEqual(core.validate_lang("zh"), "zh")
        self.assertEqual(core.validate_lang("ja"), "pt-BR")
        self.assertEqual(core.validate_lang(None), "pt-BR")

    def test_trechos(self):
        self.assertEqual(core.parse_trechos(""), [])
        t = core.parse_trechos('[{"id": "pt-BR:tokens", "texto": "Tokens são pedaços."}, {"id": "x", "texto": ""}]')
        self.assertEqual(t, [{"id": "pt-BR:tokens", "texto": "Tokens são pedaços."}])
        with self.assertRaises(ValueError):
            core.parse_trechos("não é json")
        self.assertEqual(len(core.parse_trechos('[{"id": "a", "texto": "x"}] ' * 1)), 1)
        self.assertEqual(len(core.parse_trechos('[' + ",".join('{"id": "t%d", "texto": "texto"}' % i for i in range(6)) + ']')), 3)


class Prompt(unittest.TestCase):
    def test_mensagens_em_chines(self):
        msgs = core.build_messages("什么是 token？", "zh", "palavras: king, queen", [{"id": "zh:tokens", "texto": "Token 是文本片段。"}])
        self.assertEqual([m["role"] for m in msgs], ["system", "user"])
        sistema = msgs[0]["content"]
        self.assertIn(core.NOMES_IDIOMA["zh"], sistema)
        self.assertIn(core.RODAPES["zh"], sistema)
        self.assertIn("king, queen", msgs[1]["content"])
        self.assertIn("Token 是文本片段。", msgs[1]["content"])
        self.assertIn("什么是 token？", msgs[1]["content"])

    def test_rodapes_e_nomes_para_os_seis_idiomas(self):
        self.assertEqual(set(core.RODAPES), {"pt-BR", "en", "es", "de", "fr", "zh"})
        self.assertEqual(set(core.NOMES_IDIOMA), set(core.RODAPES))
        self.assertEqual(core.RODAPES["en"], "AI-generated text")

    def test_sem_contexto_nem_trechos(self):
        msgs = core.build_messages("o que é um embedding?", "pt-BR", "", [])
        self.assertIn("o que é um embedding?", msgs[1]["content"])
        self.assertEqual(core.MAX_NEW_TOKENS, 350)


if __name__ == "__main__":
    unittest.main()
