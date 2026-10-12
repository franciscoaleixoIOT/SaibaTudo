# -*- coding: utf-8 -*-
"""
Junta out/nlu_*.json, out/explica_*.json e out/downloads.json em out/resumo.json (pequeno, versionável) e out/tabelas.md (tabelas
Markdown usadas no relatório docs/BENCHMARK_IA_<data>.md), com os rankings:
  NLU        intenção média (eleições golden + holdout + química golden), depois entidade média, JSON nativo e latência em CPU
  Explicador fidelidade numérica, depois idioma, recusas e latência
Uso: python -I tools/benchmark_ia/resumo.py
"""
import json
import statistics
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comum as C  # noqa: E402
import modelos as M  # noqa: E402

ENT_ELEICOES = ("cargo", "uf", "partido", "nome", "tema", "historico", "turno", "apenasDeferidas")
ENT_QUIMICA = ("elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino")
IDIOMAS = ["pt-BR", "en", "es", "de", "fr"]


def media_entidades(met: dict, ents, minimo: int = 3):
    vals = [met.get(f"{k}_acc_pct") for k in ents if (met.get(f"{k}_cases") or 0) >= minimo and met.get(f"{k}_acc_pct") is not None]
    return round(statistics.mean(vals), 1) if vals else None


def alucinacao_max(met: dict, ents, minimo: int = 3):
    vals = [met.get(f"{k}_hallucination_pct") for k in ents if k != "nome" and (met.get(f"{k}_null_cases") or 0) >= minimo
            and met.get(f"{k}_hallucination_pct") is not None]
    return max(vals) if vals else None


def think_dos_brutos(modelo: str):
    """Casos com raciocínio NÃO vazio na saída (recontado dos registros brutos com comum.contar_think)."""
    p = C.OUT / f"nlu_{modelo}.jsonl"
    if not p.exists():
        return None
    regs = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    return sum(1 for r in regs if C.contar_think(r.get("saida", "")) > 0)


def linha_nlu(d: dict) -> dict:
    mt = d.get("metricas", {})
    g = lambda k: mt.get(k) or {}  # noqa: E731
    eg, eh, qg = g("eleicoes.golden.gpu"), g("eleicoes.holdout.gpu"), g("quimica.golden.gpu")
    intents = [x.get("intent_acc_pct") for x in (eg, eh, qg) if x.get("intent_acc_pct") is not None]
    ents = [v for v in (media_entidades(eg, ENT_ELEICOES), media_entidades(eh, ENT_ELEICOES), media_entidades(qg, ENT_QUIMICA)) if v is not None]
    livre = [x for x in (g("eleicoes.livre.gpu"), g("quimica.livre.gpu")) if x]
    cpu = [x for x in (g("eleicoes.cpu"), g("quimica.cpu")) if x]
    gpu_lat = [x.get("latencia", {}).get("ms_p50") for x in (eg, eh, qg) if x.get("latencia")]
    return {
        "modelo": d["modelo"],
        "gguf_mb": round(d.get("bytes", 0) / 2**20) if d.get("bytes") else None,
        "vram_pico_mib": d.get("vram_pico_mib"),
        "intencao_media": round(statistics.mean(intents), 1) if intents else None,
        "eleicoes_golden_intencao": eg.get("intent_acc_pct"), "eleicoes_holdout_intencao": eh.get("intent_acc_pct"),
        "eleicoes_golden_entidade": media_entidades(eg, ENT_ELEICOES), "eleicoes_holdout_entidade": media_entidades(eh, ENT_ELEICOES),
        "eleicoes_alucinacao_max": alucinacao_max(eh, ENT_ELEICOES),
        "quimica_intencao": qg.get("intent_acc_pct"), "quimica_entidade": media_entidades(qg, ENT_QUIMICA),
        "quimica_alucinacao_max": alucinacao_max(qg, ENT_QUIMICA),
        **{f"quimica_intencao_{i}": g(f"quimica.golden_{i}.gpu").get("intent_acc_pct") for i in IDIOMAS},
        **{f"quimica_{k}": qg.get(f"{k}_acc_pct") for k in ENT_QUIMICA},
        **{f"eleicoes_{k}": eh.get(f"{k}_acc_pct") for k in ("cargo", "uf", "partido", "nome", "tema", "turno")},
        "entidade_media": round(statistics.mean(ents), 1) if ents else None,
        "json_nativo_pct": round(statistics.mean([x["json_valid_pct"] for x in livre]), 1) if livre else None,
        "json_nativo_eleicoes": g("eleicoes.livre.gpu").get("json_valid_pct"), "json_nativo_quimica": g("quimica.livre.gpu").get("json_valid_pct"),
        "think_vazado": think_dos_brutos(d["modelo"]),
        "gpu_ms_p50": round(statistics.mean(gpu_lat)) if gpu_lat else None,
        "cpu_ms_p50": round(statistics.mean([x["latencia"]["ms_p50"] for x in cpu])) if cpu else None,
        "cpu_ms_p90": round(statistics.mean([x["latencia"]["ms_p90"] for x in cpu])) if cpu else None,
        "cpu_prompt_frio_ms": round(statistics.mean([x["prompt_frio_ms"] for x in cpu])) if cpu else None,
        "gpu_s": d.get("gpu_s"), "cpu_s": d.get("cpu_s"), "fracao_casos": d.get("fracao_casos"),
        "n_eleicoes_golden": eg.get("n_cases"), "n_eleicoes_holdout": eh.get("n_cases"), "n_quimica": qg.get("n_cases"),
    }


def linha_explica(d: dict) -> dict:
    g = d.get("geral", {})
    return {
        "modelo": d["modelo"], "gguf_mb": round(d.get("bytes", 0) / 2**20) if d.get("bytes") else None, "vram_pico_mib": d.get("vram_pico_mib"),
        "n": d.get("n"), "fiel_pct": g.get("fiel_pct"), "violacoes": g.get("violacoes_numericas"), "idioma_pct": g.get("idioma_ok_pct"),
        "fonte_pct": g.get("cita_fonte_pct"), "citacao_invalida": g.get("citacao_invalida"), "recomenda": g.get("recomenda"),
        "recusas": d.get("recusas_ok"), "recusas_pct": d.get("recusas_ok_pct"), "tokens": g.get("tokens_media"), "tok_s": g.get("tok_s_media"),
        "ms_p50": g.get("ms_p50"), "ms_media": g.get("ms_media"), "truncadas": g.get("truncadas"), "think": g.get("think"), "vazias": g.get("vazias"),
        "fiel_quimica": (d.get("quimica") or {}).get("fiel_pct"), "fiel_eleicoes": (d.get("eleicoes") or {}).get("fiel_pct"),
        **{f"idioma_{i}": (d.get(f"quimica_{i}") or {}).get("idioma_ok_pct") for i in IDIOMAS},
        **{f"fiel_{i}": (d.get(f"quimica_{i}") or {}).get("fiel_pct") for i in IDIOMAS},
        "gpu_s": d.get("gpu_s"), "fracao_casos": d.get("fracao_casos"),
    }


def _f(v, suf=""):
    return "—" if v is None else f"{v}{suf}"


def tabela(linhas, colunas):
    cab = "| " + " | ".join(c[0] for c in colunas) + " |\n| " + " | ".join(":--" if i == 0 else "--:" for i in range(len(colunas))) + " |\n"
    return cab + "".join("| " + " | ".join(_f(l.get(c[1]), c[2] if len(c) > 2 else "") for c in colunas) + " |\n" for l in linhas)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    downloads = C.ler_json(C.OUT / "downloads.json") if (C.OUT / "downloads.json").exists() else {}
    nlu, exp, erros = [], [], {}
    for m in M.MODELOS:
        for pref, lst, fn in (("nlu", nlu, linha_nlu), ("explica", exp, linha_explica)):
            p = C.OUT / f"{pref}_{m['id']}.json"
            if p.exists():
                d = C.ler_json(p)
                if "erro" in d:
                    erros[f"{pref}:{m['id']}"] = d["erro"]
                else:
                    lst.append(fn(d))
    chave_nlu = lambda l: (-(l["intencao_media"] or 0), -(l["entidade_media"] or 0), -(l["json_nativo_pct"] or 0), l["cpu_ms_p50"] or 1e9)  # noqa: E731
    candidatos_nlu = sorted([l for l in nlu if l["modelo"] != "v2.3-producao"], key=chave_nlu)
    chave_exp = lambda l: (-(l["fiel_pct"] or 0), -(l["idioma_pct"] or 0), -(l["recusas_pct"] or 0), l["ms_p50"] or 1e9)  # noqa: E731
    candidatos_exp = sorted(exp, key=chave_exp)
    pulados = {k: v["motivo"] for k, v in downloads.items() if not v.get("ok")}
    disco = sum(v.get("bytes", 0) for k, v in downloads.items() if v.get("ok") and k != "v2.3-producao")
    gpu_total = sum((l.get("gpu_s") or 0) + (l.get("cpu_s") or 0) for l in nlu) + sum(l.get("gpu_s") or 0 for l in exp)
    resumo = {
        "data": "2026-10-12", "llama_cpp": "b11575 (binário oficial win-cuda-13.4)",
        "licencas": {m["id"]: {"licenca": m["licenca"], "renomear_como_saibatudo": m["marca"], "repo": m.get("repo") or m.get("fonte")} for m in M.MODELOS},
        "pulados": pulados, "erros": erros, "disco_baixado_gb": round(disco / 1e9, 1), "tempo_medicao_s": gpu_total,
        "nlu": nlu, "nlu_ranking": [l["modelo"] for l in candidatos_nlu],
        "explica": exp, "explica_ranking": [l["modelo"] for l in candidatos_exp],
    }
    (C.OUT / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    ordem_nlu = [l for l in nlu if l["modelo"] == "v2.3-producao"] + candidatos_nlu
    md = "## NLU — visão geral\n\n" + tabela(ordem_nlu, [
        ("Modelo", "modelo"), ("Intenção média", "intencao_media", "%"), ("Eleições golden", "eleicoes_golden_intencao", "%"),
        ("Eleições holdout", "eleicoes_holdout_intencao", "%"), ("Química", "quimica_intencao", "%"), ("Entidade média", "entidade_media", "%"),
        ("JSON nativo", "json_nativo_pct", "%"), ("<think>", "think_vazado"), ("GPU p50 ms", "gpu_ms_p50"), ("CPU p50 ms", "cpu_ms_p50"),
        ("CPU p90 ms", "cpu_ms_p90"), ("CPU prompt frio ms", "cpu_prompt_frio_ms"), ("GGUF MB", "gguf_mb"), ("VRAM pico MiB", "vram_pico_mib")])
    md += "\n## NLU — química por idioma (intenção) e entidades\n\n" + tabela(ordem_nlu, [
        ("Modelo", "modelo"), ("pt-BR", "quimica_intencao_pt-BR", "%"), ("en", "quimica_intencao_en", "%"), ("es", "quimica_intencao_es", "%"),
        ("de", "quimica_intencao_de", "%"), ("fr", "quimica_intencao_fr", "%"), ("elemento", "quimica_elemento", "%"),
        ("composto", "quimica_composto", "%"), ("propriedade", "quimica_propriedade", "%"), ("quantidades", "quimica_quantidades", "%"),
        ("equação", "quimica_equacao", "%"), ("unid. destino", "quimica_unidadeDestino", "%"), ("alucinação máx", "quimica_alucinacao_max", "%")])
    md += "\n## NLU — eleições (holdout, entidades)\n\n" + tabela(ordem_nlu, [
        ("Modelo", "modelo"), ("cargo", "eleicoes_cargo", "%"), ("uf", "eleicoes_uf", "%"), ("nome", "eleicoes_nome", "%"),
        ("tema", "eleicoes_tema", "%"), ("turno", "eleicoes_turno", "%"), ("entidade golden", "eleicoes_golden_entidade", "%"),
        ("alucinação máx", "eleicoes_alucinacao_max", "%")])
    md += "\n## Explicador — visão geral\n\n" + tabela(candidatos_exp, [
        ("Modelo", "modelo"), ("Fiel", "fiel_pct", "%"), ("Violações", "violacoes"), ("Fiel química", "fiel_quimica", "%"),
        ("Fiel eleições", "fiel_eleicoes", "%"), ("Idioma", "idioma_pct", "%"), ("Cita fonte", "fonte_pct", "%"),
        ("Citação inválida", "citacao_invalida"), ("Recomenda", "recomenda"), ("Recusas", "recusas"), ("Tokens", "tokens"), ("tok/s", "tok_s"),
        ("ms p50", "ms_p50"), ("Truncadas", "truncadas"), ("GGUF MB", "gguf_mb"), ("VRAM pico MiB", "vram_pico_mib")])
    md += "\n## Explicador — química por idioma (idioma certo / fiel)\n\n" + tabela(candidatos_exp, [
        ("Modelo", "modelo")] + [(f"idioma {i}", f"idioma_{i}", "%") for i in IDIOMAS] + [(f"fiel {i}", f"fiel_{i}", "%") for i in IDIOMAS])
    (C.OUT / "tabelas.md").write_text(md, encoding="utf-8")
    print(md)
    print("ranking NLU:", resumo["nlu_ranking"])
    print("ranking explicador:", resumo["explica_ranking"])
    print("pulados:", pulados, "erros:", erros, "disco:", resumo["disco_baixado_gb"], "GB", "tempo:", gpu_total, "s")


if __name__ == "__main__":
    main()
