# -*- coding: utf-8 -*-
"""
Baixa os GGUF dos candidatos (um por vez) para o cache do Hugging Face e registra o resultado em out/downloads.json.

- Só arquivos .gguf (pesos); nenhum código de repositório é baixado nem executado.
- Repositórios com acesso condicionado (Gemma) dão 401/403 enquanto o mantenedor não aceitar a licença na conta: o modelo é PULADO
  com o motivo "licença não aceita pelo mantenedor".
- Tucano-2b4-Instruct não tem GGUF de quantizador conhecido em Q4_K_M: baixa-se o safetensors OFICIAL (TucanoBR) e converte-se aqui
  (convert_hf_to_gguf.py do llama.cpp + llama-quantize), em C:\\Users\\franc\\models\\.

Uso (Python do ambiente de treino, que tem huggingface_hub/torch/transformers/gguf):
  python -I tools/benchmark_ia/baixar.py [--so id1,id2] [--llama-bin DIR] [--llama-src DIR]
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import modelos as M  # noqa: E402

MODELS_DIR = Path(r"C:\Users\franc\models")
LLAMA_BIN = MODELS_DIR / "llama.cpp" / "b11575"
LLAMA_SRC = Path(r"C:\Users\franc\AndroidStudioProjects\SaibaTudo\apps\eleicoes2026\ai_model\output\.llama_cpp\b11355")
TUCANO_REPO = "TucanoBR/Tucano-2b4-Instruct"
TUCANO_GGUF = MODELS_DIR / "tucano-2b4-instruct-Q4_K_M.gguf"


def baixar_hf(m: dict) -> dict:
    from huggingface_hub import hf_hub_download
    from huggingface_hub.errors import GatedRepoError, HfHubHTTPError
    t0 = time.time()
    try:
        caminhos = [hf_hub_download(m["repo"], f) for f in [m["arquivo"], *m.get("partes", [])]]
    except GatedRepoError:
        return {"ok": False, "motivo": "licença não aceita pelo mantenedor (repositório condicionado, HTTP 403)"}
    except HfHubHTTPError as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        if code in (401, 403):
            return {"ok": False, "motivo": f"licença não aceita pelo mantenedor (HTTP {code})"}
        return {"ok": False, "motivo": f"erro HTTP {code}: {str(e)[:160]}"}
    tam = sum(os.path.getsize(p) for p in caminhos)
    return {"ok": True, "caminho": caminhos[0], "bytes": tam, "segundos": round(time.time() - t0)}


def preparar_tucano(llama_bin: Path, llama_src: Path) -> dict:
    """safetensors oficial -> GGUF f16 (convert_hf_to_gguf.py) -> Q4_K_M (llama-quantize). O f16 intermediário é apagado."""
    if TUCANO_GGUF.exists():
        return {"ok": True, "caminho": str(TUCANO_GGUF), "bytes": TUCANO_GGUF.stat().st_size, "segundos": 0, "origem": "convertido localmente"}
    from huggingface_hub import snapshot_download
    t0 = time.time()
    src = Path(snapshot_download(TUCANO_REPO, allow_patterns=["*.safetensors", "*.json", "tokenizer*", "LICENSE", "README.md"]))
    f16 = MODELS_DIR / "tucano-2b4-instruct-f16.gguf"
    conv = llama_src / "convert_hf_to_gguf.py"
    r = subprocess.run([sys.executable, str(conv), str(src), "--outfile", str(f16), "--outtype", "f16"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0 or not f16.exists():
        return {"ok": False, "motivo": "conversão para GGUF falhou: " + (r.stderr or r.stdout)[-400:]}
    r = subprocess.run([str(llama_bin / "llama-quantize.exe"), str(f16), str(TUCANO_GGUF), "Q4_K_M"], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    f16.unlink(missing_ok=True)
    if r.returncode != 0 or not TUCANO_GGUF.exists():
        return {"ok": False, "motivo": "quantização Q4_K_M falhou: " + (r.stderr or r.stdout)[-400:]}
    return {"ok": True, "caminho": str(TUCANO_GGUF), "bytes": TUCANO_GGUF.stat().st_size, "segundos": round(time.time() - t0),
            "origem": f"convertido localmente de {TUCANO_REPO} (llama.cpp convert_hf_to_gguf + llama-quantize Q4_K_M)"}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--so", default="", help="ids separados por vírgula (padrão: todos)")
    ap.add_argument("--llama-bin", default=str(LLAMA_BIN))
    ap.add_argument("--llama-src", default=str(LLAMA_SRC))
    a = ap.parse_args(argv)
    ids = [x for x in a.so.split(",") if x] or [m["id"] for m in M.MODELOS]
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    (AQUI / "out").mkdir(exist_ok=True)
    reg_path = AQUI / "out" / "downloads.json"
    reg = json.loads(reg_path.read_text(encoding="utf-8")) if reg_path.exists() else {}
    for i in ids:
        m = M.POR_ID[i]
        if i == "tucano-2b4":
            reg[i] = preparar_tucano(Path(a.llama_bin), Path(a.llama_src))
        elif m["repo"] is None:
            p = m["arquivo"]
            reg[i] = {"ok": os.path.exists(p), "caminho": p, "bytes": os.path.getsize(p) if os.path.exists(p) else 0, "origem": "local (produção)"}
        else:
            reg[i] = baixar_hf(m)
        print(i, json.dumps(reg[i], ensure_ascii=False), flush=True)
        reg_path.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
