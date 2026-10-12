# -*- coding: utf-8 -*-
"""
ETAPA NLU do benchmark: cada candidato interpreta os casos golden dos apps e é pontuado pelas MESMAS funções do gate de produção
(apps/<app>/backend/modal/eval_golden.evaluate), importadas sem cópia.

Conjuntos
  eleições: contracts/nlu_golden_cases.json (114) + holdout reservado do v2.3 (435 perguntas que o treino nunca viu)
  química:  contracts/nlu_golden_cases.json (723; pt-BR/en/es/de/fr), com o CID do golden traduzido pelos nomes do pacote de dados
Modos
  gpu    todos os casos, COM a gramática de produção (llama-server, -ngl auto)
  livre  amostra fixa SEM gramática (validade NATIVA do JSON e vazamento de <think>): 40 casos de eleições, 50 de química (10/idioma)
  cpu    amostra fixa de 30 casos por app, COM gramática, só CPU com 8 threads (aproxima o Modal); a 1ª chamada (prompt frio) é medida à parte
Prompt: o mesmo few-shot para todos os candidatos (prompts_nlu.py), aplicado pelo template de chat de cada GGUF, sem raciocínio. O modelo
de produção v2.3 usa o prompt CURTO do treino (é ajustado; com o few-shot ele sairia da distribuição em que foi treinado).

Saídas: out/nlu_<modelo>.jsonl (um registro por caso e modo) e out/nlu_<modelo>.json (métricas).
Uso:    python -I tools/benchmark_ia/nlu_bench.py --modelos qwen3-1.7b,granite-3.3-2b [--fracao 1.0] [--sem-cpu]
"""
import argparse
import hashlib
import json
import statistics
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comum as C  # noqa: E402
import modelos as M  # noqa: E402
import prompts_nlu as P  # noqa: E402
from servidor import Servidor  # noqa: E402

IDIOMAS = ["pt-BR", "en", "es", "de", "fr"]


def _h(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def amostra(casos, n):
    return sorted(casos, key=lambda c: _h(c["q"]))[:n]


def reduzir(casos, fracao):
    if fracao >= 1.0:
        return casos
    return amostra(casos, max(1, round(len(casos) * fracao)))


def conjuntos(fracao: float) -> dict:
    """{app: {nome_conjunto: casos}} + amostras livre/cpu."""
    ge = C.ler_json(C.GOLDEN_ELEICOES)["cases"]
    ho = C.ler_json(C.HOLDOUT_ELEICOES)["cases"] if C.HOLDOUT_ELEICOES.exists() else []
    gq = C.ler_json(C.GOLDEN_QUIMICA)["cases"]
    for c in gq:
        c.setdefault("idioma", "pt-BR")
    ge, ho, gq = reduzir(ge, fracao), reduzir(ho, fracao), reduzir(gq, fracao)
    q_por_idioma = {i: [c for c in gq if c["idioma"] == i] for i in IDIOMAS}
    return {
        "eleicoes": {"golden": ge, "holdout": ho,
                     "livre": amostra(ge, 20) + amostra(ho, 20), "cpu": amostra(ge, 15) + amostra(ho, 15)},
        "quimica": {"golden": gq, **{f"golden_{i}": q_por_idioma[i] for i in IDIOMAS},
                    "livre": [c for i in IDIOMAS for c in amostra(q_por_idioma[i], 10)],
                    "cpu": [c for i in IDIOMAS for c in amostra(q_por_idioma[i], 6)]},
    }


class Gerador:
    """Função generate(q) para o eval_golden do app, com memória por pergunta (cada pergunta é gerada uma vez por modo) e registro bruto."""

    def __init__(self, srv: Servidor, modelo: dict, app: str, restrito: bool):
        self.srv, self.m, self.app, self.restrito = srv, modelo, app, restrito
        self.memo, self.reg = {}, {}
        if app == "eleicoes":
            self.ev = C.carregar_app("eleicoes2026")
            self.gramatica = self.ev.nlu_core.grammar_for("v2")
            self.max_tokens = self.ev.nlu_core.MAX_NEW_TOKENS["v2"]
            self.sistema = P.sistema_eleicoes()
        else:
            self.ev = C.carregar_app("quimica")
            self.gramatica = self.ev.nlu_core.grammar()
            self.max_tokens = self.ev.nlu_core.MAX_NEW_TOKENS
            self.sistema = P.sistema_quimica()
        if not restrito:
            self.max_tokens = 300

    def chamar(self, q: str) -> dict:
        core = self.ev.nlu_core
        pergunta = core.validate_question(q)
        g = self.gramatica if self.restrito else None
        if self.m.get("prompt") == "producao":
            return self.srv.completar(P.prompt_producao_eleicoes(pergunta), max_tokens=self.max_tokens, grammar=g, stop=core.STOP_TOKENS)
        if self.m.get("sem_system"):
            msgs = [{"role": "user", "content": f"{self.sistema}\n\nPergunta: {pergunta}\nJSON:"}]
        else:
            msgs = [{"role": "system", "content": self.sistema}, {"role": "user", "content": pergunta}]
        kw = {"enable_thinking": False} if self.m.get("think") == "kwarg" else None
        return self.srv.chat(msgs, max_tokens=self.max_tokens, grammar=g, kwargs_template=kw)

    def __call__(self, q: str) -> str:
        if q in self.reg and self.reg[q].get("erro"):
            raise ValueError(self.reg[q]["erro"])
        if q not in self.memo:
            try:
                r = self.chamar(q)
            except ValueError as e:  # pergunta inválida (ex.: só espaços): o serviço responde 400; conta como inválida no eval
                self.reg[q] = {"texto": "", "ms": 0.0, "n_prompt": 0, "n_cache": 0, "n_gerados": 0, "tok_s": None, "fim": "erro", "think": 0,
                               "erro": str(e)}
                raise
            r["think"] = C.contar_think(r["texto"])
            self.reg[q] = r
            # o eval_golden extrai o JSON com find('{')..rfind('}'); um <think> com chaves dentro poderia confundir: retira-se antes
            self.memo[q] = C.tirar_think(r["texto"]) if r["think"] else r["texto"]
        return self.memo[q]


def resumo_lat(ms):
    if not ms:
        return {}
    s = sorted(ms)
    return {"ms_media": round(statistics.mean(s)), "ms_p50": round(s[len(s) // 2]), "ms_p90": round(s[min(len(s) - 1, int(len(s) * 0.9))]),
            "ms_max": round(s[-1])}


def avaliar(gen: Gerador, casos, rotulo: str, cids) -> dict:
    if gen.app == "eleicoes":
        res = gen.ev.eval_golden.evaluate(gen, casos, "v2", rotulo)
    else:
        res = gen.ev.eval_golden.evaluate(gen, casos, rotulo, cids)
    regs = [gen.reg[c["q"]] for c in casos]
    res.update({"latencia": resumo_lat([r["ms"] for r in regs]),
                "think_casos": sum(1 for r in regs if r["think"]),
                "tokens_gerados_media": round(statistics.mean([r["n_gerados"] or 0 for r in regs]), 1) if regs else None,
                "truncados": sum(1 for r in regs if r.get("fim") == "length")})
    return res


def registros_brutos(modelo_id, app, conjunto, modo, casos, gen: Gerador, res: dict):
    itens = res.get("cases") or []
    for c, it in zip(casos, itens):
        r = gen.reg[c["q"]]
        yield {"modelo": modelo_id, "app": app, "conjunto": conjunto, "modo": modo, "idioma": c.get("idioma", "pt-BR"), "q": c["q"],
               "esperado": {k: v for k, v in c.items() if k not in ("q",)}, "saida": r["texto"][:800], "json_valido": it.get("json_valido"),
               "intent_ok": it.get("intent_ok"), "ms": r["ms"], "n_prompt": r["n_prompt"], "n_cache": r["n_cache"], "n_gerados": r["n_gerados"],
               "think": r["think"], "fim": r.get("fim")}


def tirar_casos(res):
    return {k: v for k, v in res.items() if k != "cases"}


def rodar_modelo(m: dict, gguf: str, sets: dict, *, com_gpu: bool, com_cpu: bool, cids, anterior: dict | None = None) -> dict:
    apps = [a for a in ("eleicoes", "quimica") if f"nlu_{a}" in m["tarefas"]]
    saida = anterior or {"modelo": m["id"], "gguf": gguf, "bytes": Path(gguf).stat().st_size, "apps": apps, "metricas": {}}
    caminho_brutos = C.OUT / f"nlu_{m['id']}.jsonl"
    brutos = []
    if anterior and caminho_brutos.exists():  # mantém os registros do modo que não é refeito
        modos_refeitos = ({"gpu", "livre"} if com_gpu else set()) | ({"cpu"} if com_cpu else set())
        brutos = [r for r in (json.loads(l) for l in caminho_brutos.read_text(encoding="utf-8").splitlines() if l.strip())
                  if r["modo"] not in modos_refeitos]
    t0 = time.time()
    if com_gpu:
        with Servidor(gguf, gpu=True, ctx=4096, log_dir=C.OUT, rotulo=f"nlu_{m['id']}") as srv:
          saida["carga_gpu_s"] = srv.carga_s
          for app in apps:
              gen = Gerador(srv, m, app, restrito=True)
              gen("Olá")  # aquece o prefixo (instrução de sistema) fora da medição
              nomes = ["golden", "holdout"] if app == "eleicoes" else ["golden"] + [f"golden_{i}" for i in IDIOMAS]
              for nome in nomes:
                  casos = sets[app][nome]
                  if not casos:
                      continue
                  res = avaliar(gen, casos, f"{m['id']} {app} {nome} gpu", cids)
                  saida["metricas"][f"{app}.{nome}.gpu"] = tirar_casos(res)
                  if nome in ("golden", "holdout"):
                      brutos += list(registros_brutos(m["id"], app, nome, "gpu", casos, gen, res))
                  print(f"  {app}.{nome}: intenção {res['intent_acc_pct']}%  JSON {res['json_valid_pct']}%  "
                        f"lat p50 {res['latencia'].get('ms_p50')} ms", flush=True)
              livre = Gerador(srv, m, app, restrito=False)
              res = avaliar(livre, sets[app]["livre"], f"{m['id']} {app} livre", cids)
              saida["metricas"][f"{app}.livre.gpu"] = tirar_casos(res)
              brutos += list(registros_brutos(m["id"], app, "livre", "livre", sets[app]["livre"], livre, res))
              print(f"  {app}.livre (sem gramática): JSON {res['json_valid_pct']}%  <think> em {res['think_casos']} casos", flush=True)
          saida["vram_pico_mib"] = srv.vram_pico_mib()
        saida["gpu_s"] = round(time.time() - t0)
    if com_cpu:
        t1 = time.time()
        with Servidor(gguf, gpu=False, ctx=4096, threads=8, log_dir=C.OUT, rotulo=f"nlu_{m['id']}") as srv:
            for app in apps:
                gen = Gerador(srv, m, app, restrito=True)
                frio = gen.chamar("Olá")
                res = avaliar(gen, sets[app]["cpu"], f"{m['id']} {app} cpu", cids)
                res["prompt_frio_ms"] = frio["ms"]
                res["prompt_tokens"] = frio["n_prompt"]
                saida["metricas"][f"{app}.cpu"] = tirar_casos(res)
                brutos += list(registros_brutos(m["id"], app, "cpu", "cpu", sets[app]["cpu"], gen, res))
                print(f"  {app}.cpu: p50 {res['latencia'].get('ms_p50')} ms (frio {frio['ms']:.0f} ms, {frio['n_prompt']} tokens de prompt)", flush=True)
        saida["cpu_s"] = round(time.time() - t1)
    C.gravar_jsonl(caminho_brutos, brutos)
    return saida


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--modelos", default="", help="ids separados por vírgula (padrão: todos os de NLU já baixados)")
    ap.add_argument("--fracao", type=float, default=1.0, help="fração uniforme dos casos (para modelos lentos)")
    ap.add_argument("--sem-cpu", action="store_true", help="só GPU")
    ap.add_argument("--so-cpu", action="store_true", help="só a amostra de CPU; junta ao out/nlu_<modelo>.json existente")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    ids = [x for x in a.modelos.split(",") if x] or [m["id"] for m in M.MODELOS if any(t.startswith("nlu") for t in m["tarefas"])]
    cids = C.carregar_app("quimica").eval_golden.carregar_cids(C.COMPOSTOS_QUIMICA)
    print(f"compostos do pacote: {len(cids)} CIDs traduzíveis", flush=True)
    sets = conjuntos(a.fracao)
    for i in ids:
        m = M.POR_ID[i]
        gguf = M.caminho_local(m)
        if not gguf:
            print(f"== {i}: PULADO (GGUF ausente; ver out/downloads.json)", flush=True)
            continue
        print(f"== {i} ({Path(gguf).name})", flush=True)
        arq = C.OUT / f"nlu_{i}.json"
        anterior = json.loads(arq.read_text(encoding="utf-8")) if a.so_cpu and arq.exists() else None
        try:
            res = rodar_modelo(m, gguf, sets, com_gpu=not a.so_cpu, com_cpu=not a.sem_cpu, cids=cids, anterior=anterior)
            res.setdefault("fracao_casos", a.fracao)
        except Exception as e:  # um modelo que não carrega não derruba o benchmark
            res = {"modelo": i, "erro": f"{type(e).__name__}: {e}"}
            print(f"   ERRO: {res['erro']}", flush=True)
        arq.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
