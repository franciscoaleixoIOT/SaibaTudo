# -*- coding: utf-8 -*-
"""Publica o Space do explicador do SaibaTudo LLMs no Hugging Face (privado, ZeroGPU) e, com --teste, espera RUNNING e faz chamadas de teste.

    python backend/hf_space_llms/publicar.py --space franciscoaleixo/saibatudo-llms [--hardware zero-a10g] [--teste]

Token de ESCRITA: secrets/hf_token_write.txt na raiz do repositório (ignorado pelo Git) ou o login da CLI (hf auth login). Nunca no Git nem no chat.
O que envia: app.py, ask_core.py, requirements.txt e README.md desta pasta. Variáveis gravadas no Space: ASK_MODEL_ID, ASK_MODEL_LABEL.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ_REPO = AQUI.parents[3]
ARQUIVOS = ("app.py", "ask_core.py", "requirements.txt", "README.md")


def ler_token(caminho: Path) -> str:
    if caminho.exists():
        return caminho.read_text(encoding="utf-8").strip()
    from huggingface_hub import get_token

    tok = get_token()
    if not tok:
        raise SystemExit(f"sem token de escrita: crie {caminho} ou rode `hf auth login`")
    return tok


def esperar_running(api, repo_id: str, segundos: int) -> str:
    fim = time.time() + segundos
    estado = "?"
    while time.time() < fim:
        estado = api.get_space_runtime(repo_id).stage
        print(f"  {time.strftime('%H:%M:%S')} {estado}", flush=True)
        if estado == "RUNNING":
            return estado
        if estado in ("RUNTIME_ERROR", "BUILD_ERROR", "CONFIG_ERROR"):
            raise SystemExit(f"Space em {estado}: veja os logs em https://huggingface.co/spaces/{repo_id}")
        time.sleep(20)
    return estado


def chamar_space(url_base: str, token: str, dados: list, timeout: int = 180) -> dict:
    base = url_base.rstrip("/") + "/gradio_api/call/ask"
    cab = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    req = urllib.request.Request(base, data=json.dumps({"data": dados}).encode(), headers=cab, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        event_id = json.loads(r.read())["event_id"]
    req2 = urllib.request.Request(f"{base}/{event_id}", headers={"Authorization": cab["Authorization"]})
    with urllib.request.urlopen(req2, timeout=timeout) as r:
        texto = r.read().decode("utf-8")
    dado = None
    for linha in texto.splitlines():
        if linha.startswith("data:"):
            dado = linha[5:].strip()
    return json.loads(dado)[0] if dado else {"ok": False, "error": "sem dados"}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--space", default="franciscoaleixo/saibatudo-llms")
    ap.add_argument("--token-file", default=str(RAIZ_REPO / "secrets" / "hf_token_write.txt"))
    ap.add_argument("--hardware", default="zero-a10g")
    ap.add_argument("--modelo", default="Qwen/Qwen3-4B-Instruct-2507")
    ap.add_argument("--rotulo", default="Qwen3-4B")
    ap.add_argument("--teste", action="store_true", help="espera RUNNING e faz chamadas de teste em pt e zh (gasta ZeroGPU)")
    ap.add_argument("--espera", type=int, default=1500)
    a = ap.parse_args(argv)

    from huggingface_hub import HfApi

    token = ler_token(Path(a.token_file))
    api = HfApi(token=token)
    api.create_repo(a.space, repo_type="space", space_sdk="gradio", private=True, exist_ok=True, space_hardware=a.hardware)
    for nome in ARQUIVOS:
        api.upload_file(path_or_fileobj=str(AQUI / nome), path_in_repo=nome, repo_id=a.space, repo_type="space", commit_message=f"S1: {nome}")
    api.add_space_variable(a.space, "ASK_MODEL_ID", a.modelo)
    api.add_space_variable(a.space, "ASK_MODEL_LABEL", a.rotulo)
    try:
        api.request_space_hardware(a.space, a.hardware)
    except Exception as e:  # noqa: BLE001
        print(f"  hardware: {e}")
    url = f"https://{a.space.replace('/', '-')}.hf.space"
    print(f"Space enviado: https://huggingface.co/spaces/{a.space}  (API: {url})")
    if a.teste:
        esperar_running(api, a.space, a.espera)
        for lang, q in (("pt-BR", "o que o gráfico mostra?"), ("zh", "什么是词嵌入？")):
            r = chamar_space(url, token, [q, lang, "palavras: king, queen; cosseno king–queen 0.87", json.dumps([{"id": f"{lang}:embeddings", "texto": "Embeddings são vetores de 50 números."}])])
            print(f"  [{lang}] ok={r.get('ok')} model={r.get('model')} gpu_s={r.get('gpu_s')}\n  {str(r.get('answer', r.get('error')))[:300]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
