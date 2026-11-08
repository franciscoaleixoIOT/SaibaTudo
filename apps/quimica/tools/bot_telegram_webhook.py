# -*- coding: utf-8 -*-
"""Registra, remove ou consulta o webhook do bot do Telegram (@SaibaTudoNetBot) sem nunca imprimir o token nem o segredo.

Uso (de dentro de apps/quimica, depois do deploy e com a política de privacidade 1.4 no ar):
    python tools/bot_telegram_webhook.py --registrar https://saibatudo.net/quimica/api/bot/telegram
    python tools/bot_telegram_webhook.py --info
    python tools/bot_telegram_webhook.py --remover

Lê o token de secrets/telegram_token.txt e o segredo (BOT_TELEGRAM_SECRET) de secrets/telegram_bot.env; ambos fora do Git.
A saída é só o resumo de getWebhookInfo (url, pending_update_count, last_error_message, max_connections). Operação: docs/OPERACAO.md §9.
"""
import argparse
import json
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
API = "https://api.telegram.org"
TIMEOUT = 20
ALLOWED_UPDATES = ["message", "callback_query"]
MAX_CONNECTIONS = 4


def ler_token(caminho: Path) -> str:
    return Path(caminho).read_text(encoding="utf-8").strip()


def ler_env(caminho: Path) -> dict:
    """Linhas CHAVE=valor (o valor pode conter '='); ignora vazias e comentários."""
    out = {}
    for linha in Path(caminho).read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        out[chave.strip()] = valor.strip()
    return out


def chamar(metodo: str, token: str, payload, abrir=urllib.request.urlopen) -> dict:
    """POST na Bot API; devolve o JSON. Erro da API vira RuntimeError com o método e a descrição, nunca com o token."""
    dados = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(f"{API}/bot{token}/{metodo}", data=dados, headers={"Content-Type": "application/json"}, method="POST")
    with abrir(req, timeout=TIMEOUT) as r:
        corpo = json.loads(r.read().decode("utf-8"))
    if not corpo.get("ok"):
        raise RuntimeError(f"{metodo}: {corpo.get('description', 'erro desconhecido')}")
    return corpo


def registrar(url: str, segredo: str, token: str, abrir=urllib.request.urlopen) -> dict:
    payload = {"url": url, "secret_token": segredo, "allowed_updates": ALLOWED_UPDATES, "drop_pending_updates": True, "max_connections": MAX_CONNECTIONS}
    return chamar("setWebhook", token, payload, abrir=abrir)


def remover(token: str, abrir=urllib.request.urlopen) -> dict:
    return chamar("deleteWebhook", token, {"drop_pending_updates": True}, abrir=abrir)


def info(token: str, abrir=urllib.request.urlopen) -> dict:
    return chamar("getWebhookInfo", token, None, abrir=abrir).get("result", {})


def resumo_info(resultado: dict) -> str:
    return "\n".join([
        f"url={resultado.get('url') or '(nenhum)'}",
        f"pending_update_count={resultado.get('pending_update_count', 0)}",
        f"last_error_message={resultado.get('last_error_message') or 'nenhum'}",
        f"max_connections={resultado.get('max_connections', '')}",
    ])


def main(argv=None, abrir=urllib.request.urlopen) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    acao = p.add_mutually_exclusive_group(required=True)
    acao.add_argument("--registrar", metavar="URL", help="registra o webhook nesta URL https")
    acao.add_argument("--remover", action="store_true", help="remove o webhook (o bot para de receber na hora)")
    acao.add_argument("--info", action="store_true", help="só mostra getWebhookInfo")
    p.add_argument("--token-arquivo", default=str(APP / "secrets" / "telegram_token.txt"))
    p.add_argument("--env-arquivo", default=str(APP / "secrets" / "telegram_bot.env"), help="arquivo com BOT_TELEGRAM_SECRET=...")
    args = p.parse_args(argv)

    if args.registrar and not args.registrar.startswith("https://"):
        print("a URL do webhook precisa começar com https://", file=sys.stderr)
        return 2
    try:
        token = ler_token(args.token_arquivo)
        if args.registrar:
            segredo = ler_env(args.env_arquivo).get("BOT_TELEGRAM_SECRET", "")
            if not segredo:
                print("BOT_TELEGRAM_SECRET ausente no arquivo de ambiente", file=sys.stderr)
                return 2
            registrar(args.registrar, segredo, token, abrir=abrir)
        elif args.remover:
            remover(token, abrir=abrir)
        print(resumo_info(info(token, abrir=abrir)))
        return 0
    except (OSError, RuntimeError, ValueError) as e:
        print(f"erro: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
