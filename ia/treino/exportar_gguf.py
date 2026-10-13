# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — exportação do NLU treinado: LoRA -> modelo mesclado (bf16, só texto) -> GGUF bf16 -> GGUF quantizado (Q4_K_M; Q8_0 opcional).

Mesmo caminho do v2.3 (`apps/eleicoes2026/ai_model/scripts/merge_and_export.py` + conversão do llama.cpp), adaptado ao Qwen3.5:
  - a mescla carrega só a parte de linguagem (Qwen3_5ForCausalLM, sem visão nem MTP) em bf16, na CPU (não disputa a GPU);
  - o tokenizer e o template de chat salvos são os do modelo base (chat_template.jinja do Qwen3.5);
  - a conversão usa o `convert_hf_to_gguf.py` do llama.cpp (fonte na tag b11575, pasta própria) com `--no-mtp`: o modelo mesclado
    não tem a cabeça de predição múltipla (MTP) e o config ainda declara `mtp_num_hidden_layers`;
  - a quantização usa o `llama-quantize.exe` oficial da mesma tag.
O conversor é código baixado: roda só sobre os pesos, com `python -E -s`, a partir de uma pasta de trabalho que não é a dele.

Uso:
  python -I ia/treino/exportar_gguf.py --lora ia/treino/out/nlu-qwen35-2b-teste/final --out ia/treino/out/gguf-teste [--q8]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CONVERSOR_PADRAO = Path(r"C:\Users\franc\models\llama.cpp-src\b11575\convert_hf_to_gguf.py")
LLAMA_BIN_PADRAO = Path(r"C:\Users\franc\models\llama.cpp\b11575")


def mesclar(base: str, lora: Path, destino: Path):
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(base, trust_remote_code=False)
    modelo = AutoModelForCausalLM.from_pretrained(base, dtype=torch.bfloat16, device_map="cpu", trust_remote_code=False)
    print(f"base {type(modelo).__name__} carregada ({time.time() - t0:.0f} s)")
    modelo = PeftModel.from_pretrained(modelo, str(lora)).merge_and_unload()
    destino.mkdir(parents=True, exist_ok=True)
    modelo.save_pretrained(str(destino), safe_serialization=True)
    tok.save_pretrained(str(destino))
    meta = lora / "train_meta.json"
    if meta.exists():
        shutil.copy2(meta, destino / "train_meta.json")
    cfg = json.loads((destino / "config.json").read_text(encoding="utf-8"))
    print(f"mesclado em {destino} ({time.time() - t0:.0f} s): architectures={cfg.get('architectures')} model_type={cfg.get('model_type')} "
          f"mtp_num_hidden_layers={cfg.get('mtp_num_hidden_layers')}")


def rodar(cmd, **kw):
    print("$ " + " ".join(str(c) for c in cmd), flush=True)
    t0 = time.time()
    subprocess.run([str(c) for c in cmd], check=True, **kw)
    print(f"  ({time.time() - t0:.0f} s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base_model", default="Qwen/Qwen3.5-2B")
    ap.add_argument("--lora", required=True)
    ap.add_argument("--out", required=True, help="pasta de saída (mesclado/, *.gguf)")
    ap.add_argument("--nome", default="saibatudo-nlu-qwen35-2b")
    ap.add_argument("--nome_modelo", default="SaibaTudo-NLU", help="general.name gravado no GGUF")
    ap.add_argument("--conversor", default=str(CONVERSOR_PADRAO))
    ap.add_argument("--llama_bin", default=str(LLAMA_BIN_PADRAO))
    ap.add_argument("--q8", action="store_true", help="também gera Q8_0 (referência para a queda de quantização)")
    ap.add_argument("--pular_mescla", action="store_true")
    a = ap.parse_args()

    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    mesclado = out / "mesclado"
    if not a.pular_mescla:
        mesclar(a.base_model, Path(a.lora).resolve(), mesclado)

    bf16 = out / f"{a.nome}-bf16.gguf"
    # cwd = pasta de saída (não a do conversor). `-E -s` (e não -I): ignora PYTHON* e o site do usuário, mas mantém a pasta do script no
    # sys.path, onde fica o pacote `conversion/` do próprio conversor (o b11575 dividiu o conversor em módulos). O conversor insere o
    # próprio gguf-py no sys.path.
    rodar([sys.executable, "-E", "-s", a.conversor, str(mesclado), "--outfile", str(bf16), "--outtype", "bf16", "--no-mtp",
           "--model-name", a.nome_modelo], cwd=str(out))
    quantize = Path(a.llama_bin) / "llama-quantize.exe"
    tipos = ["Q4_K_M"] + (["Q8_0"] if a.q8 else [])
    for t in tipos:
        rodar([quantize, bf16, out / f"{a.nome}-{t}.gguf", t], cwd=str(out))
    for f in sorted(out.glob("*.gguf")):
        print(f"{f.name}: {f.stat().st_size / 2**20:.0f} MiB")


if __name__ == "__main__":
    main()
