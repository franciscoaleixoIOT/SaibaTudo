# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — avaliação de um GGUF do NLU no runtime do Modal (`llama-cpp-python`, CPU) com a gramática GBNF de produção.

O que faz (só lê os apps; nada é alterado):
  1. Template: lê `tokenizer.chat_template` do GGUF, renderiza com `enable_thinking=False` e confere que é IGUAL ao prompt que o
     treino usou (template do tokenizer HF) e ao prompt que o serviço montará (`nlu_core.build_prompt(q, "v2")` + o bloco de
     raciocínio vazio `<think>\\n\\n</think>\\n\\n`). Confere também a tokenização dos marcadores (um token especial cada).
  2. Golden de eleições (`apps/eleicoes2026/contracts/nlu_golden_cases.json`) com `eval_golden.evaluate` (a MESMA pontuação do gate),
     COM gramática (modo de produção) e SEM gramática (validade nativa do JSON e vazamento de `<think>`).
  3. Latência em CPU (n_threads como o Modal), p50/p95 por pergunta, e `check_gates` só como referência.

Uso:
  python -I ia/treino/avaliar_gguf.py --gguf ia/treino/out/gguf-teste/saibatudo-nlu-qwen35-2b-Q4_K_M.gguf --threads 8 --out ia/treino/out/eval_q4.json
"""
import argparse
import importlib.util
import json
import re
import statistics
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
MODAL = RAIZ / "apps" / "eleicoes2026" / "backend" / "modal"
HOLDOUT_PADRAO = Path(r"C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\backend\retrain\out-v23\holdout_cases.json")

# Bloco de raciocínio vazio que o template do Qwen3.5 põe no início do turno do assistente quando enable_thinking=False
# (e também quando enable_thinking não é passado: no Qwen3.5 o padrão é sem raciocínio).
THINK_VAZIO = "<think>\n\n</think>\n\n"


def _importar(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


eval_golden = _importar("eval_golden", MODAL / "eval_golden.py")  # insere a pasta do Modal no sys.path e importa nlu_core de lá
core = eval_golden.core


def prompt_servico(pergunta: str) -> str:
    """O que o serviço do Modal enviará ao GGUF do Qwen3.5: o prompt ChatML de produção (v2) + o bloco de raciocínio vazio."""
    return core.build_prompt(pergunta, "v2") + THINK_VAZIO


def conferir_template(llm, base_hf: str | None):
    import jinja2
    meta = llm.metadata or {}
    tpl = meta.get("tokenizer.chat_template")
    res = {"gguf_tem_template": bool(tpl), "arquitetura": meta.get("general.architecture"), "nome": meta.get("general.name")}
    q = "Quem são os candidatos a governador de SP?"
    msgs = [{"role": "system", "content": core.SYSTEM_PROMPT_V2}, {"role": "user", "content": q}]
    esperado = prompt_servico(q)
    if tpl:
        env = jinja2.Environment(trim_blocks=True, lstrip_blocks=True, loader=jinja2.BaseLoader())
        env.globals["raise_exception"] = lambda m: (_ for _ in ()).throw(RuntimeError(m))
        t = env.from_string(tpl)
        r_false = t.render(messages=msgs, add_generation_prompt=True, enable_thinking=False, bos_token="", eos_token="")
        r_padrao = t.render(messages=msgs, add_generation_prompt=True, bos_token="", eos_token="")
        res["gguf_template_igual_servico"] = r_false == esperado
        res["gguf_template_padrao_sem_raciocinio"] = r_padrao == esperado
        res["gguf_template_render"] = r_false
    if base_hf:
        from transformers import AutoTokenizer
        tok = AutoTokenizer.from_pretrained(base_hf, trust_remote_code=False)
        r_hf = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        res["hf_template_igual_servico"] = r_hf == esperado
        ids_hf = tok(esperado, add_special_tokens=False)["input_ids"]
        ids_gguf = llm.tokenize(esperado.encode("utf-8"), add_bos=False, special=True)
        res["tokens_iguais_hf_gguf"] = list(ids_hf) == list(ids_gguf)
        res["n_tokens_prompt"] = len(ids_gguf)
    especiais = {}
    for s in ("<|im_start|>", "<|im_end|>", "<think>", "</think>", "<|endoftext|>"):
        especiais[s] = llm.tokenize(s.encode("utf-8"), add_bos=False, special=True)
    res["tokens_especiais"] = especiais
    res["eos_gguf"] = meta.get("tokenizer.ggml.eos_token_id")
    return res


def gerador(llm, com_gramatica: bool, latencias: list):
    from llama_cpp import LlamaGrammar
    gram = LlamaGrammar.from_string(core.grammar_for("v2"), verbose=False) if com_gramatica else None

    def gen(q):
        prompt = prompt_servico(core.validate_question(q))
        kw = dict(prompt=prompt, temperature=0.0, repeat_penalty=1.0, stop=core.STOP_TOKENS,
                  max_tokens=core.MAX_NEW_TOKENS["v2"] if com_gramatica else 300)
        if gram is not None:
            kw["grammar"] = gram
        t0 = time.perf_counter()
        texto = llm.create_completion(**kw)["choices"][0]["text"]
        latencias.append(time.perf_counter() - t0)
        return texto

    return gen


def resumo_lat(lat):
    if not lat:
        return {}
    s = sorted(lat)
    return {"n": len(s), "p50_s": round(statistics.median(s), 3), "p95_s": round(s[min(len(s) - 1, int(0.95 * len(s)))], 3),
            "media_s": round(sum(s) / len(s), 3), "max_s": round(s[-1], 3)}


def contar_think(res):
    return sum(1 for c in res["cases"] if re.search(r"</?think>", c.get("saida") or ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gguf", required=True)
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--base_hf", default="Qwen/Qwen3.5-2B", help="tokenizer HF para conferir o template ('' desliga)")
    ap.add_argument("--sem_livre", action="store_true", help="não roda a passada sem gramática")
    ap.add_argument("--holdout", action="store_true", help="também roda o holdout reservado do v2.3 (435 casos, com gramática)")
    ap.add_argument("--out")
    a = ap.parse_args()

    import llama_cpp
    from llama_cpp import Llama
    t0 = time.time()
    llm = Llama(model_path=a.gguf, n_ctx=1024, n_threads=a.threads, n_batch=256, verbose=False)
    carga = time.time() - t0
    print(f"llama-cpp-python {llama_cpp.__version__}; GPU offload: {llama_cpp.llama_supports_gpu_offload()}; carga {carga:.1f} s")
    tpl = conferir_template(llm, a.base_hf or None)
    print(json.dumps({k: v for k, v in tpl.items() if k != "gguf_template_render"}, ensure_ascii=False, indent=1))

    casos = eval_golden.load_cases()
    lat_c, lat_l = [], []
    t1 = time.perf_counter()
    gen_c = gerador(llm, True, lat_c)
    gen_c("pergunta de aquecimento")  # 1ª chamada (prompt frio) fora da medida
    frio = lat_c.pop()
    c = eval_golden.evaluate(gen_c, casos, "v2", "COM gramática (produção)")
    eval_golden.print_summary(c)
    u = None
    if not a.sem_livre:
        u = eval_golden.evaluate(gerador(llm, False, lat_l), casos, "v2", "SEM gramática (validade nativa)")
        eval_golden.print_summary(u)
    real = None
    if a.holdout and HOLDOUT_PADRAO.exists():
        real = eval_golden.evaluate(gerador(llm, True, []), eval_golden.load_cases(HOLDOUT_PADRAO), "v2", "holdout v2.3 (435)")
        eval_golden.print_summary(real)
    ok, motivos = eval_golden.check_gates(c, u, real=real)
    resultado = {
        "gguf": str(a.gguf), "threads": a.threads, "carga_s": round(carga, 1), "prompt_frio_s": round(frio, 3),
        "template": tpl, "latencia_com_gramatica": resumo_lat(lat_c), "latencia_sem_gramatica": resumo_lat(lat_l),
        "think_com_gramatica": contar_think(c), "think_sem_gramatica": contar_think(u) if u else None,
        "gates_referencia": {"passou": ok, "motivos": motivos},
        "duracao_total_s": round(time.perf_counter() - t1, 1),
        "constrained": c, "unconstrained": u, "real": real,
    }
    print(json.dumps({k: resultado[k] for k in ("prompt_frio_s", "latencia_com_gramatica", "latencia_sem_gramatica",
                                                 "think_com_gramatica", "think_sem_gramatica", "gates_referencia")}, ensure_ascii=False, indent=1))
    if a.out:
        Path(a.out).write_text(json.dumps(resultado, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"gravado em {a.out}")


if __name__ == "__main__":
    sys.exit(main())
