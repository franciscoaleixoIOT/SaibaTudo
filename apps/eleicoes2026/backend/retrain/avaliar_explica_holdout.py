# -*- coding: utf-8 -*-
"""
Gera, com o GGUF do explicador (SaibaTudo-Explica), as respostas do HOLDOUT de eleições (`out-ask/holdout.json`, 188 pares que o treino
nunca viu) para o verificador do servidor conferir (`verificar_holdout_explica.mjs`: recomendação, contradição com os dados, número sem fonte).

O prompt é exatamente o do treino e o do Space (`treino_utils.montar_textos` = `nlu_core.build_ask_prompt`): system = `instruction`,
user = `input` ("CONTEXTO (...):\\n…\\n\\nPERGUNTA DO ELEITOR: …"). Decodificação gulosa (reprodutível), `max_tokens` igual ao do Space (400).

  python -I backend/retrain/avaliar_explica_holdout.py --gguf ../quimica/ai_model/output/gguf/ask-v1-20261020/model-Q4_K_M.gguf --threads 10
  node backend/retrain/verificar_holdout_explica.mjs backend/retrain/out-ask/holdout_respostas.jsonl

Rode de dentro de `apps/eleicoes2026`. Saída: `out-ask/holdout_respostas.jsonl` ({id, tipo, q, context, esperado, resposta, segundos}).
"""
import argparse
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
IM_START, IM_END = "<|im_start|>", "<|im_end|>"
STOP = [IM_END, "<|endoftext|>"]
MARCA_PERGUNTA = "PERGUNTA DO ELEITOR: "
MARCA_CONTEXTO = "CONTEXTO (enviado pelo aplicativo, a partir do pacote de dados do TSE):\n"


def separar(entrada: str) -> tuple:
    """Devolve (pergunta, contexto) a partir do `input` do dataset."""
    if MARCA_PERGUNTA not in entrada:
        return entrada.strip(), ""
    antes, _, q = entrada.rpartition(MARCA_PERGUNTA)
    ctx = antes.strip()
    if ctx.startswith(MARCA_CONTEXTO.strip()):
        ctx = ctx[len(MARCA_CONTEXTO.strip()):].strip()
    return q.strip(), ctx


def prompt_de(item: dict) -> str:
    return (f"{IM_START}system\n{item['instruction']}{IM_END}\n"
            f"{IM_START}user\n{item['input']}{IM_END}\n"
            f"{IM_START}assistant\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gguf", required=True)
    ap.add_argument("--holdout", default=str(HERE / "out-ask" / "holdout.json"))
    ap.add_argument("--out", default=str(HERE / "out-ask" / "holdout_respostas.jsonl"))
    ap.add_argument("--n", type=int, default=0, help="limitar aos n primeiros (0 = todos)")
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--gpu-layers", type=int, default=0)
    ap.add_argument("--n-ctx", type=int, default=4096)
    ap.add_argument("--max-tokens", type=int, default=400, help="igual ao MAX_NEW_TOKENS do Space")
    ap.add_argument("--retomar", action="store_true", help="pula ids já presentes em --out")
    a = ap.parse_args(argv)

    from llama_cpp import Llama  # import tardio

    itens = json.loads(Path(a.holdout).read_text(encoding="utf-8"))
    if a.n:
        itens = itens[: a.n]
    feitos = set()
    saida = Path(a.out)
    if a.retomar and saida.exists():
        for linha in saida.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                feitos.add(json.loads(linha)["id"])
    else:
        saida.parent.mkdir(parents=True, exist_ok=True)
        saida.write_text("", encoding="utf-8")

    llm = Llama(model_path=a.gguf, n_ctx=a.n_ctx, n_threads=a.threads, n_gpu_layers=a.gpu_layers, verbose=False)
    t_total = time.time()
    n = 0
    with saida.open("a", encoding="utf-8") as f:
        for i, item in enumerate(itens, 1):
            if item["id"] in feitos:
                continue
            q, ctx = separar(item["input"])
            t0 = time.time()
            out = llm.create_completion(prompt=prompt_de(item), temperature=0.0, repeat_penalty=1.05, stop=STOP, max_tokens=a.max_tokens)
            resposta = out["choices"][0]["text"].strip()
            reg = {"id": item["id"], "tipo": item.get("tipo"), "q": q, "context": ctx, "esperado": item["output"],
                   "resposta": resposta, "segundos": round(time.time() - t0, 1), "tokens": out["usage"]["completion_tokens"]}
            f.write(json.dumps(reg, ensure_ascii=False) + "\n")
            f.flush()
            n += 1
            print(f"[{i}/{len(itens)}] {item.get('tipo')} {reg['segundos']}s {reg['tokens']} tok | {q[:70]}", flush=True)
    print(f"{n} respostas em {round(time.time() - t_total)} s → {saida}")


if __name__ == "__main__":
    sys.exit(main())
