# -*- coding: utf-8 -*-
"""Mistura de treino do EXPLICADOR SaibaTudo IA (um modelo para os apps): junta os conjuntos que cada app monta sozinho
(apps/quimica/backend/retrain/build_ask_dataset.py e apps/eleicoes2026/backend/retrain/build_ask_dataset.py), com teto por tipo
para não enviesar (a química tem 4.249 exemplos de segurança GHS quase repetidos), embaralhamento com semente e resumo.

Só lê os apps (dados gerados, fora do Git); não copia código de um app para outro.

Explica v1.1 (20/10/2026): `--extra app=arquivo` acrescenta conjuntos no mesmo formato (ex.: apps/quimica/backend/retrain/build_ask_extras.py:
pedidos legítimos em en/es/de/fr e recusas com trechos) e `--manter app:prefixo` protege do teto os exemplos cujo id começa pelo prefixo
(ex.: `quimica:sp-`, a família seguranca_pratica, que precisa entrar inteira; o teto então só sorteia entre os demais do mesmo app:tipo):
  python ia/treino/misturar_explica.py ... --extra quimica=apps/quimica/backend/retrain/out-ask/extras.json \
      --teto quimica:seguranca=1300 --manter quimica:sp- --manter quimica:xq- --out ia/treino/out/explica-v1.1/train.json

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


def protegido(it: dict, manter) -> bool:
    """O exemplo fica fora do teto (id começa por um dos prefixos de `manter`, do mesmo app)?"""
    return any(it["app"] == app and str(it.get("id", "")).startswith(prefixo) for app, prefixo in manter)


def aplicar_tetos(itens: list, tetos: dict, rng: random.Random, manter=()) -> list:
    """Teto por (app, tipo): acima dele, sorteia. Os exemplos protegidos (`manter`) entram inteiros e não contam para o teto."""
    por_chave = {}
    saida = []
    for it in itens:
        if protegido(it, manter):
            saida.append(it)
        else:
            por_chave.setdefault((it["app"], it["tipo"]), []).append(it)
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
    ap.add_argument("--extra", action="append", default=[], help="app=arquivo.json no mesmo formato, acrescentado ao app (repetível)")
    ap.add_argument("--manter", action="append", default=[], help="app:prefixo-de-id protegido do teto (repetível)")
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
    for e in a.extra:
        app, caminho = e.split("=", 1)
        itens += carregar(caminho, app)
    manter = tuple(tuple(m.split(":", 1)) for m in a.manter)
    antes = Counter((it["app"], it["tipo"]) for it in itens)
    itens = aplicar_tetos(itens, tetos, rng, manter)
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
        "extras": list(a.extra),
        "mantidos": {f"{app}:{p}": sum(1 for it in itens if it["app"] == app and str(it.get("id", "")).startswith(p)) for app, p in manter},
        "por_idioma": dict(Counter(it.get("idioma", "pt-BR") for it in itens)),
        "caracteres_input_mediana": sorted(len(it["input"]) for it in itens)[len(itens) // 2],
        "caracteres_input_max": max(len(it["input"]) for it in itens),
    }
    out.with_suffix(".resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
