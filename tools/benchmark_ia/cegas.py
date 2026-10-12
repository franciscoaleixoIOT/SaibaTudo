# -*- coding: utf-8 -*-
"""
Painel às cegas para o mantenedor: 20 prompts (10 de química, 2 por idioma; 10 de eleições) × (explicador atual × melhor candidato),
com a ordem A/B sorteada por item (semente fixa). Lê as respostas já geradas em out/explica_<modelo>.jsonl (não roda modelo).

Saídas: out/cegas.md (perguntas, contexto resumido, respostas A e B e um campo para a escolha) e out/cegas_chave.json (qual modelo é A e B
em cada item — abrir só DEPOIS de avaliar).
Uso: python -I tools/benchmark_ia/cegas.py [--atual qwen2.5-7b] [--candidato <id>]   (padrão do candidato: 1º do ranking em resumo.json
     que não seja o atual)
"""
import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comum as C  # noqa: E402


def ler(modelo):
    p = C.OUT / f"explica_{modelo}.jsonl"
    return {r["id"]: r for r in (json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip())}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--atual", default="qwen2.5-7b")
    ap.add_argument("--candidato", default="")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    cand = a.candidato
    if not cand:
        rk = C.ler_json(C.OUT / "resumo.json")["explica_ranking"]
        cand = next(m for m in rk if m != a.atual)
    ra, rb = ler(a.atual), ler(cand)
    casos = {c["id"]: c for c in C.ler_json(C.OUT / "casos_explica.json")}
    h = lambda s: hashlib.sha256(s.encode()).hexdigest()  # noqa: E731
    comuns = [i for i in casos if i in ra and i in rb and casos[i]["tipo"] != "recusa"]
    escolhidos = []
    for idioma in ["pt-BR", "en", "es", "de", "fr"]:
        escolhidos += sorted([i for i in comuns if casos[i]["app"] == "quimica" and casos[i]["idioma"] == idioma], key=h)[:2]
    escolhidos += sorted([i for i in comuns if casos[i]["app"] == "eleicoes"], key=h)[:10]
    rng = random.Random(20261012)
    chave, md = {}, ["# Painel às cegas — explicador (A × B)\n",
                     "Para cada item, leia a pergunta e o material enviado ao modelo e marque a melhor resposta (A, B ou empate), pensando em: "
                     "fidelidade ao material, clareza, idioma pedido, citação da fonte e neutralidade. **Não abra `cegas_chave.json` antes de "
                     "terminar.** Os dados de eleições são FICTÍCIOS (candidatos e partidos inventados para o teste).\n"]
    for n, i in enumerate(escolhidos, 1):
        c = casos[i]
        troca = rng.random() < 0.5
        A, B = (rb[i], ra[i]) if troca else (ra[i], rb[i])
        chave[f"item-{n:02d}"] = {"id": i, "A": A["modelo"], "B": B["modelo"]}
        material = c["contexto"] or "\n".join(f"[{t['id']}] {t['texto']}" for t in c["trechos"])
        material = material if len(material) <= 900 else material[:900] + " […]"
        md.append(f"\n---\n\n## Item {n:02d} — {c['app']}, {c['idioma']}\n\n**Pergunta:** {c['q']}\n\n"
                  f"<details><summary>Material enviado ao modelo</summary>\n\n```\n{material}\n```\n</details>\n\n"
                  f"### Resposta A\n\n{A['resposta'].strip()}\n\n### Resposta B\n\n{B['resposta'].strip()}\n\n"
                  f"**Escolha:** [ ] A  [ ] B  [ ] empate — comentário: \n")
    (C.OUT / "cegas.md").write_text("".join(md), encoding="utf-8")
    (C.OUT / "cegas_chave.json").write_text(json.dumps({"atual": a.atual, "candidato": cand, "itens": chave}, ensure_ascii=False, indent=1),
                                            encoding="utf-8")
    print(f"cegas.md com {len(escolhidos)} itens: {a.atual} × {cand}")


if __name__ == "__main__":
    main()
