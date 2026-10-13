# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — latência de CPU do NLU no runtime do Modal (`llama-cpp-python`, 8 threads), comparando GGUFs na MESMA máquina e hora.

Para cada GGUF e as mesmas N perguntas do golden de eleições, mede:
  - prompt: só a leitura do prompt (max_tokens=1, sem gramática);
  - livre:  geração completa sem gramática;
  - gramática: geração completa com a gramática v2 de produção (o modo do serviço).
Prompt por modelo: `--qwen35` = prompt v2 + bloco de raciocínio vazio (Qwen3.5); senão o prompt v2 de produção (v2.3, Qwen2.5).

Uso:
  python -I ia/treino/latencia_cpu.py --n 30 --gguf rotulo=caminho[:qwen35] [--gguf ...] --out ia/treino/out/latencia_cpu.json
"""
import argparse
import importlib.util
import json
import statistics
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("avaliar_gguf", AQUI / "avaliar_gguf.py")
av = importlib.util.module_from_spec(spec)
spec.loader.exec_module(av)
core, eval_golden = av.core, av.eval_golden


def p(xs, q):
    s = sorted(xs)
    return round(s[min(len(s) - 1, int(q * len(s)))] * 1000)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gguf", action="append", required=True, help="rotulo=caminho[:qwen35]")
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--out")
    a = ap.parse_args()
    from llama_cpp import Llama, LlamaGrammar

    casos = eval_golden.load_cases()
    passo = max(1, len(casos) // a.n)
    qs = [c["q"] for c in casos[::passo]][: a.n]
    res = {}
    for item in a.gguf:
        rotulo, resto = item.split("=", 1)
        qwen35 = resto.endswith(":qwen35")
        caminho = resto[: -len(":qwen35")] if qwen35 else resto
        llm = Llama(model_path=caminho, n_ctx=1024, n_threads=a.threads, n_batch=256, verbose=False)
        gram = LlamaGrammar.from_string(core.grammar_for("v2"), verbose=False)
        montar = av.prompt_servico if qwen35 else (lambda q: core.build_prompt(q, "v2"))
        llm.create_completion(prompt=montar("aquecimento"), max_tokens=4, temperature=0.0)
        med = {"prompt": [], "livre": [], "gramatica": []}
        ntok = {"livre": [], "gramatica": []}
        for q in qs:
            pr = montar(core.validate_question(q))
            for modo in ("prompt", "livre", "gramatica"):
                kw = dict(prompt=pr, temperature=0.0, repeat_penalty=1.0, stop=core.STOP_TOKENS,
                          max_tokens=1 if modo == "prompt" else core.MAX_NEW_TOKENS["v2"])
                if modo == "gramatica":
                    kw["grammar"] = gram
                t0 = time.perf_counter()
                r = llm.create_completion(**kw)
                med[modo].append(time.perf_counter() - t0)
                if modo != "prompt":
                    ntok[modo].append(r["usage"]["completion_tokens"])
        res[rotulo] = {
            "gguf": caminho, "qwen35": qwen35, "n": len(qs),
            **{f"{m}_p50_ms": round(statistics.median(v) * 1000) for m, v in med.items()},
            **{f"{m}_p90_ms": p(v, 0.9) for m, v in med.items()},
            **{f"tokens_{m}_media": round(sum(v) / len(v), 1) for m, v in ntok.items()},
        }
        g = res[rotulo]
        g["ms_por_token_gramatica"] = round((g["gramatica_p50_ms"] - g["prompt_p50_ms"]) / max(1, g["tokens_gramatica_media"]), 1)
        g["ms_por_token_livre"] = round((g["livre_p50_ms"] - g["prompt_p50_ms"]) / max(1, g["tokens_livre_media"]), 1)
        print(rotulo, json.dumps(g, ensure_ascii=False), flush=True)
        del llm
    if a.out:
        Path(a.out).write_text(json.dumps(res, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
