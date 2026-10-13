# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — avaliação de um GGUF do NLU único no runtime do Modal (`llama-cpp-python`, CPU) com a gramática GBNF de produção
de CADA app (`--app eleicoes` ou `--app quimica`; um processo por app, porque os dois `nlu_core` têm o mesmo nome de módulo).

O que faz (só lê os apps; nada é alterado):
  1. Template: lê `tokenizer.chat_template` do GGUF, renderiza com `enable_thinking=False` e confere que é IGUAL ao prompt que o
     treino usou (template do tokenizer HF) e ao prompt que o serviço montará (`nlu_core.build_prompt(...)` do app + o bloco de
     raciocínio vazio `<think>\\n\\n</think>\\n\\n`). Confere também a tokenização dos marcadores (um token especial cada).
  2. Golden do app (`apps/<app>/contracts/nlu_golden_cases.json`) com o `eval_golden.evaluate` DO APP (a MESMA pontuação do gate),
     COM gramática (modo de produção) e SEM gramática (validade nativa do JSON e vazamento de `<think>`), e o mesmo resultado
     recortado POR IDIOMA (chave `idioma` do caso; ausente = pt-BR) sem gerar de novo (cache por pergunta).
  3. `--holdout`: casos reservados que o treino nunca viu (`ia/corpus/out/holdout_<app>.json`; para eleições é o holdout do v2.3),
     com gramática, também por idioma.
  4. Latência em CPU (n_threads como o Modal), p50/p95 por pergunta, e `check_gates` do app (geral e por idioma) como referência.

Uso:
  python -I ia/treino/avaliar_gguf.py --app quimica --gguf <gguf> --threads 8 --holdout --out <out>/eval_quimica_q4.json
  python -I ia/treino/avaliar_gguf.py --app eleicoes --gguf <gguf> --threads 8 --holdout --out <out>/eval_eleicoes_q4.json
"""
import argparse
import importlib.util
import json
import re
import statistics
import sys
import time
from collections import OrderedDict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
CORPUS_OUT = RAIZ / "ia" / "corpus" / "out"
HOLDOUT_V23 = Path(r"C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\backend\retrain\out-v23\holdout_cases.json")

APPS = {
    "eleicoes": {"pasta": "eleicoes2026", "holdouts": [CORPUS_OUT / "holdout_eleicoes.json", HOLDOUT_V23],
                 "pergunta": "Quem são os candidatos a governador de SP?"},
    "quimica": {"pasta": "quimica", "holdouts": [CORPUS_OUT / "holdout_quimica.json"],
                "pergunta": "Qual a massa molar do H2SO4?"},
}

# Bloco de raciocínio vazio que o template do Qwen3.5 põe no início do turno do assistente quando enable_thinking=False
# (e também quando enable_thinking não é passado: no Qwen3.5 o padrão é sem raciocínio).
THINK_VAZIO = "<think>\n\n</think>\n\n"


def _importar(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class App:
    """Adaptador sobre o `eval_golden`/`nlu_core` de um app (assinaturas diferem entre eleições e química)."""

    def __init__(self, nome: str):
        self.nome = nome
        cfg = APPS[nome]
        self.modal = RAIZ / "apps" / cfg["pasta"] / "backend" / "modal"
        self.eval = _importar("eval_golden", self.modal / "eval_golden.py")  # põe a pasta do Modal no sys.path e importa o nlu_core de lá
        self.core = self.eval.core
        self.holdouts = cfg["holdouts"]
        self.pergunta_teste = cfg["pergunta"]
        self.cids = None
        if nome == "quimica":
            self.cids = self.eval.carregar_cids(RAIZ / "apps" / "quimica" / "data" / "quimica" / "compostos")
            self.system_prompt = self.core.SYSTEM_PROMPT
            self.max_tokens = self.core.MAX_NEW_TOKENS
            self.gramatica = self.core.grammar()
        else:
            self.system_prompt = self.core.SYSTEM_PROMPT_V2
            self.max_tokens = self.core.MAX_NEW_TOKENS["v2"]
            self.gramatica = self.core.grammar_for("v2")

    def prompt_servico(self, pergunta: str) -> str:
        """O que o serviço do Modal enviará ao GGUF do Qwen3.5: o prompt ChatML de produção do app + o bloco de raciocínio vazio."""
        if self.nome == "quimica":
            return self.core.build_prompt(pergunta) + THINK_VAZIO
        return self.core.build_prompt(pergunta, "v2") + THINK_VAZIO

    def evaluate(self, gen, casos, label):
        if self.nome == "quimica":
            return self.eval.evaluate(gen, casos, label, self.cids)
        return self.eval.evaluate(gen, casos, "v2", label)

    def check_gates(self, c, u=None, real=None, baseline=None):
        return self.eval.check_gates(c, u, baseline, real=real)

    def entidades(self):
        return self.eval.ENTIDADES_TODAS if self.nome == "eleicoes" else self.eval.ENTIDADES


def conferir_template(llm, app: App, base_hf: str | None):
    import jinja2
    meta = llm.metadata or {}
    tpl = meta.get("tokenizer.chat_template")
    res = {"gguf_tem_template": bool(tpl), "arquitetura": meta.get("general.architecture"), "nome": meta.get("general.name")}
    q = app.pergunta_teste
    msgs = [{"role": "system", "content": app.system_prompt}, {"role": "user", "content": q}]
    esperado = app.prompt_servico(q)
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


def gerador(llm, app: App, com_gramatica: bool, latencias: list):
    """Gerador com cache por pergunta: a avaliação geral gera; os recortes por idioma só reaproveitam."""
    from llama_cpp import LlamaGrammar
    gram = LlamaGrammar.from_string(app.gramatica, verbose=False) if com_gramatica else None
    cache = {}

    def gen(q):
        if q in cache:
            return cache[q]
        prompt = app.prompt_servico(app.core.validate_question(q))
        kw = dict(prompt=prompt, temperature=0.0, repeat_penalty=1.0, stop=app.core.STOP_TOKENS,
                  max_tokens=app.max_tokens if com_gramatica else 300)
        if gram is not None:
            kw["grammar"] = gram
        t0 = time.perf_counter()
        texto = llm.create_completion(**kw)["choices"][0]["text"]
        latencias.append(time.perf_counter() - t0)
        cache[q] = texto
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


def idioma_de(caso) -> str:
    return caso.get("idioma") or "pt-BR"


def por_idioma(app: App, gen, casos, label):
    """Recorte por idioma (reaproveita o cache do gerador: não gera de novo). Devolve {idioma: resultado sem a lista de casos}."""
    grupos = OrderedDict()
    for c in casos:
        grupos.setdefault(idioma_de(c), []).append(c)
    saida = OrderedDict()
    for idioma, cs in grupos.items():
        r = app.evaluate(gen, cs, f"{label} [{idioma}]")
        r.pop("cases", None)
        saida[idioma] = r
    return saida


def linha_idiomas(app: App, recortes, gates=True):
    """Tabela compacta por idioma: n, JSON, intenção, acerto por entidade (média) e gate de referência."""
    linhas = []
    for idioma, r in recortes.items():
        ents = [r.get(f"{k}_acc_pct") for k in app.entidades()]
        ents = [v for v in ents if v is not None]
        media = round(sum(ents) / len(ents), 1) if ents else None
        aluc = [r.get(f"{k}_hallucination_pct") for k in app.entidades()]
        aluc = [v for v in aluc if v is not None]
        g = app.check_gates(r)[1] if gates else []
        linhas.append({"idioma": idioma, "n": r["n_cases"], "json_valido_pct": r["json_valid_pct"], "intencao_pct": r["intent_acc_pct"],
                       "entidades_media_pct": media, "alucinacao_max_pct": max(aluc) if aluc else None, "gate_motivos": g})
        estado = "ok" if not g else "FALHA: " + "; ".join(g)
        print(f"   {idioma:<6} n={r['n_cases']:<5} JSON {r['json_valid_pct']}%  intenção {r['intent_acc_pct']}%  "
              f"entidades(média) {media}%  alucinação(máx) {max(aluc) if aluc else None}%  {estado}")
    return linhas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--app", choices=sorted(APPS), default="eleicoes")
    ap.add_argument("--gguf", required=True)
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--base_hf", default="Qwen/Qwen3.5-2B", help="tokenizer HF para conferir o template ('' desliga)")
    ap.add_argument("--sem_livre", action="store_true", help="não roda a passada sem gramática")
    ap.add_argument("--holdout", action="store_true", help="também roda o holdout reservado do app (com gramática, por idioma)")
    ap.add_argument("--baseline", help="eval.json de um Q8_0 do MESMO treino: mede a queda de quantização no gate de referência")
    ap.add_argument("--out")
    a = ap.parse_args()

    app = App(a.app)
    import llama_cpp
    from llama_cpp import Llama
    t0 = time.time()
    llm = Llama(model_path=a.gguf, n_ctx=1024, n_threads=a.threads, n_batch=256, verbose=False)
    carga = time.time() - t0
    print(f"app {a.app}; llama-cpp-python {llama_cpp.__version__}; GPU offload: {llama_cpp.llama_supports_gpu_offload()}; carga {carga:.1f} s")
    tpl = conferir_template(llm, app, a.base_hf or None)
    print(json.dumps({k: v for k, v in tpl.items() if k != "gguf_template_render"}, ensure_ascii=False, indent=1))

    casos = app.eval.load_cases()
    lat_c, lat_l = [], []
    t1 = time.perf_counter()
    gen_c = gerador(llm, app, True, lat_c)
    gen_c("pergunta de aquecimento")  # 1ª chamada (prompt frio) fora da medida
    frio = lat_c.pop()
    c = app.evaluate(gen_c, casos, "COM gramática (produção)")
    app.eval.print_summary(c)
    c_idiomas = por_idioma(app, gen_c, casos, "golden com gramática")
    print("   por idioma:")
    c_tabela = linha_idiomas(app, c_idiomas)
    u = u_idiomas = None
    if not a.sem_livre:
        gen_l = gerador(llm, app, False, lat_l)
        u = app.evaluate(gen_l, casos, "SEM gramática (validade nativa)")
        app.eval.print_summary(u)
        u_idiomas = por_idioma(app, gen_l, casos, "golden sem gramática")
        print("   por idioma (sem gramática):")
        linha_idiomas(app, u_idiomas, gates=False)
    real = real_idiomas = real_tabela = None
    real_arq = None
    if a.holdout:
        real_arq = next((p for p in app.holdouts if p.exists()), None)
        if real_arq is None:
            print("AVISO: nenhum holdout encontrado:", [str(p) for p in app.holdouts])
        else:
            casos_h = app.eval.load_cases(real_arq)
            gen_h = gerador(llm, app, True, [])
            real = app.evaluate(gen_h, casos_h, f"holdout ({len(casos_h)}, nunca treinado)")
            app.eval.print_summary(real)
            real_idiomas = por_idioma(app, gen_h, casos_h, "holdout")
            print("   por idioma:")
            real_tabela = linha_idiomas(app, real_idiomas)
    baseline = None
    if a.baseline and Path(a.baseline).exists():
        baseline = json.loads(Path(a.baseline).read_text(encoding="utf-8")).get("constrained")
    ok, motivos = app.check_gates(c, u, real=real, baseline=baseline)
    gates_idiomas = {i: app.check_gates(r, (u_idiomas or {}).get(i), real=(real_idiomas or {}).get(i)) for i, r in c_idiomas.items()}
    print("\nGATES (referência):", "APROVADO" if ok else "REPROVADO")
    for m in motivos:
        print("  -", m)
    for i, (ok_i, ms) in gates_idiomas.items():
        print(f"  [{i}] {'ok' if ok_i else 'FALHA'}")
        for m in ms:
            print(f"      - {m}")
    resultado = {
        "app": a.app, "gguf": str(a.gguf), "threads": a.threads, "carga_s": round(carga, 1), "prompt_frio_s": round(frio, 3),
        "template": tpl, "latencia_com_gramatica": resumo_lat(lat_c), "latencia_sem_gramatica": resumo_lat(lat_l),
        "think_com_gramatica": contar_think(c), "think_sem_gramatica": contar_think(u) if u else None,
        "gates_referencia": {"passou": ok, "motivos": motivos},
        "gates_por_idioma": {i: {"passou": ok_i, "motivos": ms} for i, (ok_i, ms) in gates_idiomas.items()},
        "golden_por_idioma": c_tabela, "holdout_por_idioma": real_tabela, "holdout_arquivo": str(real_arq) if real_arq else None,
        "duracao_total_s": round(time.perf_counter() - t1, 1),
        "constrained": c, "unconstrained": u, "real": real,
        "constrained_por_idioma": c_idiomas, "unconstrained_por_idioma": u_idiomas, "real_por_idioma": real_idiomas,
    }
    print(json.dumps({k: resultado[k] for k in ("prompt_frio_s", "latencia_com_gramatica", "latencia_sem_gramatica",
                                                 "think_com_gramatica", "think_sem_gramatica", "gates_referencia", "duracao_total_s")},
                     ensure_ascii=False, indent=1))
    if a.out:
        Path(a.out).write_text(json.dumps(resultado, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"gravado em {a.out}")


if __name__ == "__main__":
    sys.exit(main())
