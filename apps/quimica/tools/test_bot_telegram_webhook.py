# -*- coding: utf-8 -*-
"""Testes da ferramenta do webhook do Telegram (tools/bot_telegram_webhook.py): payload exato, erros sem o token, saída só com o resumo."""
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import bot_telegram_webhook as w  # noqa: E402

TOKEN = "123456:ABC-segredo"


class Abridor:
    """urlopen falso: guarda URL e payload; responde o que `respostas` manda, na ordem."""

    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.chamadas = []

    def __call__(self, req, timeout=None):
        self.chamadas.append((req.full_url, json.loads(req.data.decode("utf-8")) if req.data else None))
        corpo = json.dumps(self.respostas.pop(0)).encode("utf-8")
        return io.BytesIO(corpo)


class Arquivos(unittest.TestCase):
    def test_ler_token_e_env(self):
        with tempfile.TemporaryDirectory() as d:
            t = Path(d, "t.txt")
            t.write_text(TOKEN + "\n", encoding="utf-8")
            e = Path(d, "b.env")
            e.write_text("# comentário\nBOT_TELEGRAM_IDS=1\nBOT_TELEGRAM_SECRET=abc=def\n\n", encoding="utf-8")
            self.assertEqual(w.ler_token(t), TOKEN)
            self.assertEqual(w.ler_env(e), {"BOT_TELEGRAM_IDS": "1", "BOT_TELEGRAM_SECRET": "abc=def"})


class Chamadas(unittest.TestCase):
    def test_registrar_payload_exato(self):
        a = Abridor([{"ok": True, "result": True}])
        w.registrar("https://saibatudo.net/quimica/api/bot/telegram", "seg", TOKEN, abrir=a)
        url, payload = a.chamadas[0]
        self.assertEqual(url, f"https://api.telegram.org/bot{TOKEN}/setWebhook")
        self.assertEqual(payload, {"url": "https://saibatudo.net/quimica/api/bot/telegram", "secret_token": "seg",
                                   "allowed_updates": ["message", "callback_query"], "drop_pending_updates": True, "max_connections": 4})

    def test_remover_e_info(self):
        a = Abridor([{"ok": True, "result": True}, {"ok": True, "result": {"url": "", "pending_update_count": 0}}])
        w.remover(TOKEN, abrir=a)
        self.assertTrue(a.chamadas[0][0].endswith("/deleteWebhook"))
        self.assertEqual(a.chamadas[0][1], {"drop_pending_updates": True})
        r = w.info(TOKEN, abrir=a)
        self.assertEqual(r["pending_update_count"], 0)

    def test_erro_da_api_nao_vaza_token(self):
        a = Abridor([{"ok": False, "description": "Unauthorized"}])
        with self.assertRaises(RuntimeError) as cm:
            w.chamar("getWebhookInfo", TOKEN, None, abrir=a)
        self.assertNotIn(TOKEN, str(cm.exception))
        self.assertIn("Unauthorized", str(cm.exception))

    def test_resumo_info(self):
        s = w.resumo_info({"url": "https://x/y", "pending_update_count": 2, "max_connections": 4})
        self.assertIn("url=https://x/y", s)
        self.assertIn("pending_update_count=2", s)
        self.assertIn("last_error_message=nenhum", s)
        self.assertIn("max_connections=4", s)


class Main(unittest.TestCase):
    def test_main_registrar_imprime_so_o_resumo(self):
        with tempfile.TemporaryDirectory() as d:
            t = Path(d, "t.txt")
            t.write_text(TOKEN, encoding="utf-8")
            e = Path(d, "b.env")
            e.write_text("BOT_TELEGRAM_SECRET=segredo-webhook\n", encoding="utf-8")
            a = Abridor([{"ok": True, "result": True},
                         {"ok": True, "result": {"url": "https://saibatudo.net/quimica/api/bot/telegram", "pending_update_count": 0}}])
            saida = io.StringIO()
            with redirect_stdout(saida):
                rc = w.main(["--registrar", "https://saibatudo.net/quimica/api/bot/telegram", "--token-arquivo", str(t), "--env-arquivo", str(e)], abrir=a)
            self.assertEqual(rc, 0)
            self.assertNotIn(TOKEN, saida.getvalue())
            self.assertNotIn("segredo-webhook", saida.getvalue())
            self.assertIn("pending_update_count=0", saida.getvalue())
            self.assertEqual(len(a.chamadas), 2)

    def test_main_recusa_http_antes_de_ler_arquivos(self):
        erro = io.StringIO()
        with redirect_stderr(erro):
            rc = w.main(["--registrar", "http://inseguro/x", "--token-arquivo", "nao-existe.txt", "--env-arquivo", "nao-existe.env"], abrir=Abridor([]))
        self.assertEqual(rc, 2)
        self.assertIn("https://", erro.getvalue())

    def test_main_erro_da_api_devolve_1(self):
        with tempfile.TemporaryDirectory() as d:
            t = Path(d, "t.txt")
            t.write_text(TOKEN, encoding="utf-8")
            erro = io.StringIO()
            with redirect_stderr(erro):
                rc = w.main(["--info", "--token-arquivo", str(t), "--env-arquivo", str(Path(d, "x.env"))], abrir=Abridor([{"ok": False, "description": "Unauthorized"}]))
            self.assertEqual(rc, 1)
            self.assertNotIn(TOKEN, erro.getvalue())


if __name__ == "__main__":
    unittest.main()
