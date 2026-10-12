# -*- coding: utf-8 -*-
"""
Tucano-2b4-Instruct pelo transformers (bf16, GPU), porque os GGUF do Tucano (o convertido aqui e o de terceiro) geram texto incoerente e
erro de tokenizador ("invalid unordered_map<K, T> key") no llama.cpp b11575.

Diferenças em relação ao nlu_bench.py (anotadas no resultado): runtime transformers (não llama.cpp), SEM gramática GBNF (o JSON é extraído
da saída com nlu_core.parse_model_output, como na medição de validade nativa), pesos bf16 (não Q4_K_M), só eleições (golden + holdout).
O prompt é o mesmo few-shot (prompts_nlu.sistema_eleicoes) no turno do usuário (o template do Tucano não aceita papel "system").
Saídas: out/nlu_tucano-2b4.json / .jsonl.   Uso: python -I tools/benchmark_ia/tucano_hf.py [--fracao 1.0]
"""
import argparse
import json
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comum as C  # noqa: E402
import nlu_bench as NB  # noqa: E402
import prompts_nlu as P  # noqa: E402

REPO = "TucanoBR/Tucano-2b4-Instruct"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fracao", type=float, default=1.0)
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    import torch
    from huggingface_hub import snapshot_download
    from transformers import AutoModelForCausalLM, AutoTokenizer
    pasta = snapshot_download(REPO, allow_patterns=["*.safetensors", "*.json", "tokenizer*"])
    tok = AutoTokenizer.from_pretrained(pasta, trust_remote_code=False)
    base = C.carregar_app("eleicoes2026").nlu_core.validate_question
    t_carga = time.time()
    modelo = AutoModelForCausalLM.from_pretrained(pasta, dtype=torch.bfloat16, trust_remote_code=False).to("cuda").eval()
    carga = round(time.time() - t_carga, 1)
    torch.cuda.reset_peak_memory_stats()
    sistema = P.sistema_eleicoes()
    reg = {}

    def gerar(q: str) -> str:
        if q in reg:
            if reg[q].get("erro"):
                raise ValueError(reg[q]["erro"])
            return reg[q]["texto"]
        try:
            pergunta = base(q)
        except ValueError as e:
            reg[q] = {"texto": "", "ms": 0.0, "n_gerados": 0, "think": 0, "fim": "erro", "erro": str(e), "n_prompt": 0, "n_cache": 0}
            raise
        msgs = [{"role": "user", "content": f"{sistema}\n\nPergunta: {pergunta}\nJSON:"}]
        ids = tok.apply_chat_template(msgs, add_generation_prompt=True, return_tensors="pt", return_dict=True).to("cuda")
        t0 = time.time()
        with torch.no_grad():
            out = modelo.generate(**ids, max_new_tokens=96, do_sample=False, pad_token_id=tok.eos_token_id)
        novos = out[0][ids["input_ids"].shape[1]:]
        texto = tok.decode(novos, skip_special_tokens=True)
        reg[q] = {"texto": texto, "ms": round((time.time() - t0) * 1000, 1), "n_gerados": int(novos.shape[0]), "think": 0,
                  "fim": "length" if novos.shape[0] >= 96 else "stop", "n_prompt": int(ids["input_ids"].shape[1]), "n_cache": 0}
        return texto

    ev = C.carregar_app("eleicoes2026").eval_golden
    sets = NB.conjuntos(a.fracao)["eleicoes"]
    saida = {"modelo": "tucano-2b4", "runtime": "transformers bf16, sem gramática", "gguf": None, "bytes": None, "apps": ["eleicoes"],
             "metricas": {}, "carga_gpu_s": carga, "fracao_casos": a.fracao}
    brutos = []
    t0 = time.time()
    for nome in ("golden", "holdout"):
        casos = sets[nome]
        res = ev.evaluate(gerar, casos, "v2", f"tucano {nome}")
        regs = [reg[c["q"]] for c in casos]
        res["latencia"] = NB.resumo_lat([r["ms"] for r in regs])
        res["think_casos"] = 0
        saida["metricas"][f"eleicoes.{nome}.gpu"] = {k: v for k, v in res.items() if k != "cases"}
        for c, it in zip(casos, res["cases"]):
            r = reg[c["q"]]
            brutos.append({"modelo": "tucano-2b4", "app": "eleicoes", "conjunto": nome, "modo": "gpu-sem-gramatica", "idioma": "pt-BR", "q": c["q"],
                           "esperado": {k: v for k, v in c.items() if k != "q"}, "saida": r["texto"][:800], "json_valido": it.get("json_valido"),
                           "intent_ok": it.get("intent_ok"), "ms": r["ms"], "n_gerados": r["n_gerados"], "think": 0, "fim": r["fim"]})
        print(f"  eleicoes.{nome}: intenção {res['intent_acc_pct']}%  JSON (nativo) {res['json_valid_pct']}%  p50 {res['latencia'].get('ms_p50')} ms",
              flush=True)
    # a amostra "livre" é o próprio golden sem gramática
    saida["metricas"]["eleicoes.livre.gpu"] = {"json_valid_pct": saida["metricas"]["eleicoes.golden.gpu"]["json_valid_pct"], "think_casos": 0}
    saida["gpu_s"] = round(time.time() - t0)
    saida["vram_pico_mib"] = round(torch.cuda.max_memory_allocated() / 2**20)
    C.gravar_jsonl(C.OUT / "nlu_tucano-2b4.jsonl", brutos)
    (C.OUT / "nlu_tucano-2b4.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
