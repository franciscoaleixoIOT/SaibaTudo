# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — modelo fundido do EXPLICADOR → GGUF f16 → Q4_K_M (e, com --q8, Q8_0), SEM gate de app.

Serve ao explicador de eleições separado (v1.7, 27/10/2026): o `convert_local.py --target ask` da química roda os gates da química
(segurança GHS, fidelidade dos trechos), que não dizem nada sobre um modelo treinado só com eleições — o gate de eleições é o
`backend/retrain/avaliar_explica_holdout.py` + `verificar_holdout_explica.mjs` do app. Reaproveita o conversor fixo (tag do llama.cpp)
e a quantização do `convert_local.py` da química, pelo caminho, sem cópia.

  $PY -I ia/treino/gguf_explica.py --merged ia/treino/out/explica-ele-v1.7/merged --out apps/eleicoes2026/ai_model/output/gguf/ask-v1.7-20261027 [--q8] [--threads 12]

Saída: <out>/model-f16.gguf, model-Q4_K_M.gguf [, model-Q8_0.gguf], gguf.json (SHA-256, tamanhos, tag do conversor). Não publica nada.
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
QUI_MODAL = RAIZ / "apps" / "quimica" / "backend" / "modal"
sys.path.insert(0, str(QUI_MODAL))
import convert_local as cl  # noqa: E402  (funções puras: garantir_llama_cpp, quantizar, sha256)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--merged", required=True, help="pasta do modelo fundido (merge_and_export.py --target ask)")
    ap.add_argument("--out", required=True, help="pasta de saída (criada; recusa sobrescrever um GGUF existente)")
    ap.add_argument("--threads", type=int, default=12)
    ap.add_argument("--q8", action="store_true", help="gera também o Q8_0 (referência de quantização)")
    ap.add_argument("--llama-ref", default=cl.LLAMA_CPP_REF)
    a = ap.parse_args(argv)

    modelo = Path(a.merged).resolve()
    if not (modelo / "config.json").exists():
        raise SystemExit(f"{modelo} não parece um modelo fundido (falta config.json)")
    destino = Path(a.out).resolve()
    if (destino / "model-Q4_K_M.gguf").exists():
        raise SystemExit(f"{destino} já tem model-Q4_K_M.gguf; versões são imutáveis — escolha outra pasta")
    destino.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    llama_dir, llama_sha = cl.garantir_llama_cpp(a.llama_ref, QUI_MODAL.parents[1] / "ai_model" / "output" / ".llama_cpp")
    f16 = destino / "model-f16.gguf"
    if not f16.exists():
        cl._sh([sys.executable, str(llama_dir / "convert_hf_to_gguf.py"), str(modelo), "--outfile", str(f16), "--outtype", "f16"])
    arquivos = {"f16": f16}
    for q in ["Q4_K_M"] + (["Q8_0"] if a.q8 else []):
        saida = destino / f"model-{q}.gguf"
        print(f"\n### Quantizando {q}", flush=True)
        cl.quantizar(f16, saida, q, a.threads)
        arquivos[q] = saida
        print(f"{q}: {saida.stat().st_size / 1e6:.0f} MB", flush=True)

    info = {
        "merged": str(modelo), "llama_ref": a.llama_ref, "llama_sha": llama_sha, "segundos": round(time.time() - t0),
        "arquivos": {p.name: {"bytes": p.stat().st_size, "sha256": cl.sha256(p)} for p in arquivos.values()},
    }
    tm = modelo / "train_meta.json"
    if tm.exists():
        info["train_meta"] = json.loads(tm.read_text(encoding="utf-8"))
    (destino / "gguf.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nGGUF pronto em", destino)
    return 0


if __name__ == "__main__":
    sys.exit(main())
