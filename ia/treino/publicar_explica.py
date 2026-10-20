# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — publicação do EXPLICADOR (SaibaTudo-Explica) no Hugging Face, em um comando, depois que o modelo fundido passou nos gates
(`convert_local.py --target ask`; registro em ia/treino/README.md §Explica v1):

  1. repositório PRIVADO do modelo (`--modelo`), criado se não existir, com o diretório fundido (`--merged`) enviado como uma revisão;
  2. os dois Spaces PRIVADOS (Gradio, ZeroGPU `zero-a10g`), criados se não existirem, com o código de `backend/hf_space_*` + o `*_core.py`
     copiado de `backend/modal/` (o prompt é o do treino): `--space-eleicoes` e `--space-quimica`;
  3. as variáveis dos Spaces: ASK_MODEL_ID = `--modelo`, ASK_MODEL_REVISION = SHA da revisão enviada, ASK_MODEL_LABEL = `--rotulo`;
  4. `--teste`: espera o Space ficar RUNNING e chama `/gradio_api/call/ask` como o servidor do app faz (api/_lib/ask-handler.js).

Nada muda nos sites: eleições continua no Space `saibatudo-qwen7b` até `HF_ASK_SPACE_URL` apontar para o Space novo (Vercel, depois do
congelamento de 24-26/10), e química continua com `ASK_ENABLED` desligado. Os dois ficam para o mantenedor.

Token: o `hf_token.txt` de eleições só LÊ (fine-grained, `repo.content.read`). Para publicar, grave um token com escrita em repositórios e
Spaces em `secrets/hf_token_write.txt` (raiz; ignorado) — nunca no Git nem no chat.

  python -I ia/treino/publicar_explica.py --merged ia/treino/out/explica-v1/merged --versao ask-v1-20261020 --teste
  python -I ia/treino/publicar_explica.py --so-spaces --teste          # só republica o código dos Spaces (modelo já enviado)
"""
import argparse
import json
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ELE = RAIZ / "apps" / "eleicoes2026"
QUI = RAIZ / "apps" / "quimica"

SPACES = {
    # nome → (pasta do Space, módulo core copiado de backend/modal/, título curto)
    "eleicoes": (ELE / "backend" / "hf_space_explica", ELE / "backend" / "modal" / "nlu_core.py"),
    "quimica": (QUI / "backend" / "hf_space_quimica", QUI / "backend" / "modal" / "ask_core.py"),
}

CONTEXTO_TESTE = {
    "eleicoes": ("Quem foi para o segundo turno para presidente?",
                 "Dados oficiais do TSE (extração de 19/10/2026 19:30). Presidente — 1º turno: nenhum candidato alcançou mais da metade dos votos "
                 "válidos; os dois mais votados disputam o 2º turno em 25/10/2026. Fonte: TSE, divulgação de resultados."),
    "quimica": ("O que é a água?",
                "Água (CID 962): H2O, massa molar 18,015 g/mol, líquido incolor à temperatura ambiente, ponto de ebulição 100 °C a 1 atm. "
                "Fonte: PubChem (CC0)."),
}


def ler_token(caminho: Path) -> str:
    if not caminho.is_file():
        sys.exit(f"token de escrita ausente: {caminho} (grave um token do Hugging Face com escrita em repositórios e Spaces; nunca no Git nem no chat)")
    t = caminho.read_text(encoding="utf-8").strip()
    if not t.startswith("hf_"):
        sys.exit("token inválido (esperado começar por hf_)")
    return t


def montar_space(nome: str, destino: Path) -> Path:
    pasta, core = SPACES[nome]
    d = destino / f"space_{nome}"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    for f in ("app.py", "requirements.txt", "README.md"):
        shutil.copy(pasta / f, d / f)
    shutil.copy(core, d / core.name)
    return d


def esperar_running(api, repo_id: str, segundos: int) -> str:
    fim = time.time() + segundos
    estado = "?"
    while time.time() < fim:
        info = api.space_info(repo_id)
        estado = info.runtime.stage if info.runtime else "?"
        if estado in ("RUNNING",):
            return estado
        if estado in ("RUNTIME_ERROR", "BUILD_ERROR", "CONFIG_ERROR"):
            return estado
        time.sleep(20)
    return estado


def chamar_space(url_base: str, token: str, dados: list, timeout: int = 180) -> dict:
    """Igual ao servidor: POST /gradio_api/call/ask → event_id; GET …/<event_id> (SSE) até 'complete' ou 'error'."""
    cab = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = url_base.rstrip("/") + "/gradio_api/call/ask"
    req = urllib.request.Request(base, data=json.dumps({"data": dados}).encode("utf-8"), headers=cab, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        event_id = json.loads(r.read().decode("utf-8"))["event_id"]
    req = urllib.request.Request(f"{base}/{event_id}", headers={"Authorization": f"Bearer {token}"})
    evento, dado = None, None
    with urllib.request.urlopen(req, timeout=timeout) as r:
        for linha in r:
            linha = linha.decode("utf-8").rstrip("\n")
            if linha.startswith("event:"):
                evento = linha[6:].strip()
            elif linha.startswith("data:") and evento in ("complete", "error"):
                dado = linha[5:].strip()
                break
    if evento != "complete" or dado is None:
        return {"ok": False, "error": f"evento={evento} dado={dado}"}
    saida = json.loads(dado)
    return saida[0] if isinstance(saida, list) else saida


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--token-file", default=str(RAIZ / "secrets" / "hf_token_write.txt"))
    ap.add_argument("--modelo", default="franciscoaleixo/SaibaTudoIA-Explica", help="repositório privado do modelo fundido")
    ap.add_argument("--merged", help="diretório do modelo fundido a enviar (omita com --so-spaces)")
    ap.add_argument("--versao", default="", help="rótulo da versão na mensagem do commit (ex.: ask-v1-20261020)")
    ap.add_argument("--rotulo", default="SaibaTudo IA", help="ASK_MODEL_LABEL mostrado pelos apps")
    ap.add_argument("--space-eleicoes", default="franciscoaleixo/SaibaTudoIA-Explica-Eleicoes")
    ap.add_argument("--space-quimica", default="franciscoaleixo/saibatudo-quimica")
    ap.add_argument("--so", choices=["eleicoes", "quimica"], action="append", default=[], help="publicar só este Space (padrão: os dois)")
    ap.add_argument("--so-spaces", action="store_true", help="não envia o modelo; usa a revisão atual do repositório")
    ap.add_argument("--hardware", default="zero-a10g")
    ap.add_argument("--teste", action="store_true", help="espera RUNNING e faz uma chamada de teste em cada Space (gasta ZeroGPU)")
    ap.add_argument("--espera", type=int, default=1500, help="segundos máximos esperando cada Space construir")
    a = ap.parse_args(argv)

    from huggingface_hub import HfApi  # import tardio: o venv do treino tem a biblioteca
    token = ler_token(Path(a.token_file))
    api = HfApi(token=token)
    quem = api.whoami()
    print("conta:", quem.get("name"), "| token:", quem.get("auth", {}).get("accessToken", {}).get("displayName"))
    relatorio = {"modelo": a.modelo, "spaces": {}}

    # 1. modelo
    if not a.so_spaces:
        if not a.merged or not Path(a.merged).is_dir():
            sys.exit("--merged deve apontar para o diretório do modelo fundido (ou use --so-spaces)")
        api.create_repo(a.modelo, repo_type="model", private=True, exist_ok=True)
        msg = f"Explica {a.versao or 'nova revisão'}: QLoRA Qwen3-4B-Instruct-2507 fundido; comportamento SaibaTudo IA (quimica + eleicoes)"
        print("enviando modelo:", a.merged, "→", a.modelo)
        api.upload_folder(repo_id=a.modelo, repo_type="model", folder_path=a.merged, commit_message=msg,
                          ignore_patterns=["*.gguf", "checkpoint-*", "runs/*", "*.log"])
    sha = api.model_info(a.modelo).sha
    relatorio["revisao"] = sha
    print("revisão do modelo:", sha)

    # 2-3. Spaces
    alvos = a.so or ["eleicoes", "quimica"]
    ids = {"eleicoes": a.space_eleicoes, "quimica": a.space_quimica}
    with tempfile.TemporaryDirectory() as tmp:
        for nome in alvos:
            rid = ids[nome]
            novo = not api.repo_exists(rid, repo_type="space")
            if novo:
                api.create_repo(rid, repo_type="space", space_sdk="gradio", space_hardware=a.hardware, private=True)
                print("Space criado:", rid, a.hardware)
            pasta = montar_space(nome, Path(tmp))
            api.upload_folder(repo_id=rid, repo_type="space", folder_path=str(pasta),
                              commit_message=f"Explica {a.versao or ''}: codigo do Space + {SPACES[nome][1].name}".strip())
            for k, v in (("ASK_MODEL_ID", a.modelo), ("ASK_MODEL_REVISION", sha), ("ASK_MODEL_LABEL", a.rotulo)):
                api.add_space_variable(rid, k, v)
            info = api.space_info(rid)
            hw = info.runtime.hardware if info.runtime else None
            if hw and hw != a.hardware and hw != "cpu-basic":
                print("  aviso: hardware atual", hw)
            elif hw == "cpu-basic":
                api.request_space_hardware(rid, a.hardware)
                print("  hardware pedido:", a.hardware)
            url = f"https://{rid.replace('/', '-').lower()}.hf.space"
            relatorio["spaces"][nome] = {"repo": rid, "url": url, "arquivos": sorted(p.name for p in pasta.iterdir())}
            print("Space publicado:", rid, "→", url)

    # 4. teste
    if a.teste:
        for nome in alvos:
            rid = ids[nome]
            estado = esperar_running(api, rid, a.espera)
            relatorio["spaces"][nome]["estado"] = estado
            print(f"{rid}: {estado}")
            if estado != "RUNNING":
                continue
            q, ctx = CONTEXTO_TESTE[nome]
            dados = [q, ctx] if nome == "eleicoes" else [q, ctx, "[]"]
            t0 = time.time()
            try:
                r = chamar_space(relatorio["spaces"][nome]["url"], token, dados)
            except Exception as e:  # noqa: BLE001
                r = {"ok": False, "error": f"{type(e).__name__}: {e}"}
            r["_segundos"] = round(time.time() - t0, 1)
            relatorio["spaces"][nome]["teste"] = r
            print(json.dumps(r, ensure_ascii=False)[:600])

    saida = RAIZ / "ia" / "treino" / "out" / "explica-v1" / "publicacao.json"
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps(relatorio, ensure_ascii=False, indent=1), encoding="utf-8")
    print("relatório:", saida)


if __name__ == "__main__":
    sys.exit(main())
