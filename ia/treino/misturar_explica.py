# -*- coding: utf-8 -*-
"""Mistura de treino do EXPLICADOR SaibaTudo IA (um modelo para os apps): junta os conjuntos que cada app monta sozinho
(apps/quimica/backend/retrain/build_ask_dataset.py e apps/eleicoes2026/backend/retrain/build_ask_dataset.py), com teto por tipo
para não enviesar (a química tem 4.249 exemplos de segurança GHS quase repetidos), embaralhamento com semente e resumo.

Só lê os apps (dados gerados, fora do Git); não copia código de um app para outro.

Uso:
  python ia/treino/misturar_explica.py --quimica apps/quimica/backend/retrain/out-ask/train.json \
      --eleicoes apps/eleicoes2026/backend/retrain/out-ask/train.json --teto quimica:seguranca=2000 --seed 7 \
      --out ia/treino/out/explica-v1/train.json
"""
import argparse
import json
import random
from collections import Counter
from pathlib import Path


def carregar(caminho: str, app: str) -> list:
    itens = json.loads(Path(caminho).read_text(encoding="utf-8"))
    for it in itens:
        it.setdefault("app", app)
        it.setdefault("tipo", "?")
        for k in ("instruction", "input", "output"):
            if not isinstance(it.get(k), str) or not it[k].strip():
                raise SystemExit(f"{caminho}: exemplo {it.get('id')} sem {k}")
    return itens


def aplicar_tetos(itens: list, tetos: dict, rng: random.Random) -> list:
    por_chave = {}
    for it in itens:
        por_chave.setdefault((it["app"], it["tipo"]), []).append(it)
    saida = []
    for chave, lista in sorted(por_chave.items()):
        teto = tetos.get(chave)
        if teto is not None and len(lista) > teto:
            lista = sorted(lista, key=lambda x: x.get("id", ""))
            rng.shuffle(lista)
            lista = lista[:teto]
        saida.extend(lista)
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--quimica", required=True)
    ap.add_argument("--eleicoes", required=True)
    ap.add_argument("--teto", action="append", default=[], help="app:tipo=N (repetível)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    tetos = {}
    for t in a.teto:
        chave, n = t.split("=")
        app, tipo = chave.split(":")
        tetos[(app, tipo)] = int(n)
    itens = carregar(a.quimica, "quimica") + carregar(a.eleicoes, "eleicoes")
    antes = Counter((it["app"], it["tipo"]) for it in itens)
    itens = aplicar_tetos(itens, tetos, rng)
    ids = Counter(it.get("id") for it in itens)
    repetidos = [k for k, v in ids.items() if v > 1]
    if repetidos:
        raise SystemExit(f"ids repetidos entre os apps: {repetidos[:5]}")
    rng.shuffle(itens)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(itens, ensure_ascii=False, indent=0), encoding="utf-8")
    depois = Counter((it["app"], it["tipo"]) for it in itens)
    resumo = {
        "total": len(itens), "seed": a.seed,
        "antes": {f"{k[0]}:{k[1]}": v for k, v in sorted(antes.items())},
        "depois": {f"{k[0]}:{k[1]}": v for k, v in sorted(depois.items())},
        "tetos": {f"{k[0]}:{k[1]}": v for k, v in sorted(tetos.items())},
        "caracteres_input_mediana": sorted(len(it["input"]) for it in itens)[len(itens) // 2],
        "caracteres_input_max": max(len(it["input"]) for it in itens),
    }
    out.with_suffix(".resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
