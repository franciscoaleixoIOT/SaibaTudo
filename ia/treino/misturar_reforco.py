# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — mistura de REFORÇO para uma continuação curta do NLU (`treinar_nlu.py --lora_init <final da versão anterior>`), quando o
gate da versão anterior mostrou recuo em intenções específicas (v3.5 → v3.6, 18/10/2026: CONCEITO pt e `apenasDeferidas` de eleições).

Diferente de `misturar_continuacao.py` (tudo o que é novo no corpus + revisão proporcional), aqui o LoRA já viu o corpus inteiro e a
mistura é escolhida à mão, em quatro partes, todas de pares que já existem nos corpora (nenhum exemplo novo é escrito aqui):
  1. FOCO: TODOS os pares do app de foco cujas intenções estão em `--intencoes`, tomados do corpus-base (o que o LoRA treinou) e, se
     `--extra` for dado, também do corpus anterior (pares que o corpus-base deixou de fora, p. ex. pelo teto por intenção), com o rótulo de lá.
  2. APP SECUNDÁRIO: amostra estratificada por intenção (`--amostra-app APP=N`), mais TODOS os pares cuja saída contém algum texto de
     `--sempre-com` (p. ex. `apenasDeferidas`).
  3. RETENÇÃO: amostra estratificada por (intenção, idioma) das demais intenções do app de foco (`--retencao N`), para o modelo não
     esquecer o resto nem passar a ver a intenção de foco em tudo.
  4. Nada que seja caso de teste: todo par passa pelo `FiltroDeTeste` de `montar_corpus.py` (golden e casos dos dois apps + todos os
     holdouts em `--holdouts-dir`), igual ao teste `test_nenhum_caso_de_teste_no_treino`; pares excluídos são contados no resumo.

  python -I ia/treino/misturar_reforco.py --base ia/corpus/out/v35/train.json --extra ia/corpus/out/v34/train.json \
      --app quimica --intencoes CONCEITO --amostra-app eleicoes2026=6000 --sempre-com apenasDeferidas --retencao 10000 \
      --holdouts-dir ia/corpus/out/v35 --holdouts-dir ia/corpus/out/v34 --holdouts-dir ia/corpus/out \
      --out ia/treino/out/nlu-v36-cont/train_cont.json [--seed 2026]
"""
import argparse
import hashlib
import importlib.util
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def carregar_montar_corpus():
    spec = importlib.util.spec_from_file_location("montar_corpus", RAIZ / "ia" / "corpus" / "montar_corpus.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def chave(e: dict) -> str:
    return e["app"] + "|" + e["input"]


def intencao(e: dict) -> str:
    if e.get("intent"):
        return e["intent"]
    try:
        return json.loads(e["output"]).get("intent") or "?"
    except Exception:
        return "?"


def balde(s: str) -> int:
    return int(hashlib.sha1(s.encode("utf-8")).hexdigest()[:12], 16)


def estratificar(pares, grupo, n, rng):
    """Amostra n pares proporcionalmente ao tamanho de cada grupo (mínimo 1 por grupo não vazio, se couber)."""
    por = defaultdict(list)
    for e in pares:
        por[grupo(e)].append(e)
    total = sum(len(v) for v in por.values())
    if n >= total:
        return list(pares)
    out = []
    for g, lista in sorted(por.items()):
        k = max(1, round(n * len(lista) / total))
        rng.shuffle(lista)
        out += lista[:k]
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", required=True, help="train.json do corpus que o LoRA inicial treinou")
    ap.add_argument("--extra", action="append", default=[], help="train.json anterior; só entram pares das intenções de foco ausentes da base")
    ap.add_argument("--app", required=True, help="app de foco (ex.: quimica)")
    ap.add_argument("--intencoes", required=True, help="intenções de foco, separadas por vírgula (ex.: CONCEITO)")
    ap.add_argument("--amostra-app", action="append", default=[], metavar="APP=N", help="amostra estratificada por intenção de outro app")
    ap.add_argument("--sempre-com", action="append", default=[], help="texto na saída que garante o par do app secundário (ex.: apenasDeferidas)")
    ap.add_argument("--retencao", type=int, default=0, help="pares de retenção do app de foco, fora das intenções de foco")
    ap.add_argument("--holdouts-dir", action="append", default=[], help="pastas com holdout_*.json a excluir (além do golden dos apps)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args(argv)

    MC = carregar_montar_corpus()
    perguntas = MC.perguntas_de(MC.TESTES_ELEICOES + MC.TESTES_QUIMICA)
    for d in a.holdouts_dir:
        perguntas += MC.perguntas_de(sorted(Path(d).glob("holdout_*.json")))
    filtro = MC.FiltroDeTeste(perguntas)

    base = json.loads(Path(a.base).read_text(encoding="utf-8"))
    vistos = {chave(e) for e in base}
    foco = set(a.intencoes.split(","))
    extras = []
    for p in a.extra:
        for e in json.loads(Path(p).read_text(encoding="utf-8")):
            if e["app"] == a.app and intencao(e) in foco and chave(e) not in vistos:
                extras.append(e)
                vistos.add(chave(e))
    rng = random.Random(a.seed)

    parte_foco = [e for e in base if e["app"] == a.app and intencao(e) in foco] + extras
    parte_sec = []
    for item in a.amostra_app:
        app_, _, n = item.partition("=")
        pares = [e for e in base if e["app"] == app_]
        garantidos = [e for e in pares if any(t in e["output"] for t in a.sempre_com)]
        resto = [e for e in pares if not any(t in e["output"] for t in a.sempre_com)]
        amostra = estratificar(resto, intencao, max(0, int(n) - len(garantidos)), rng)
        parte_sec += garantidos + amostra
    parte_ret = estratificar([e for e in base if e["app"] == a.app and intencao(e) not in foco],
                             lambda e: (intencao(e), e["idioma"]), a.retencao, rng) if a.retencao else []

    excluidos = Counter()
    vistos_mistura = set()
    mistura = []
    for nome, parte in (("foco", parte_foco), ("secundario", parte_sec), ("retencao", parte_ret)):
        for e in parte:
            k = chave(e)
            if k in vistos_mistura:
                continue
            v = filtro.veredito(e["input"])
            if v:
                excluidos[f"{nome}/{v}"] += 1
                continue
            vistos_mistura.add(k)
            mistura.append({**e, "parte": nome})
    mistura.sort(key=lambda e: balde(f"{a.seed}|{chave(e)}"))
    for e in mistura:
        e.pop("parte", None)

    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(mistura, ensure_ascii=False, indent=0), encoding="utf-8")
    resumo = {
        "total": len(mistura),
        "foco": {"intencoes": sorted(foco), "da_base": len(parte_foco) - len(extras), "dos_extras": len(extras),
                 "por_idioma": dict(sorted(Counter(e["idioma"] for e in parte_foco).items()))},
        "secundario": {"total": len(parte_sec), "por_intencao": dict(sorted(Counter(intencao(e) for e in parte_sec).items())),
                       "garantidos_por_sempre_com": sum(1 for e in parte_sec if any(t in e["output"] for t in a.sempre_com))},
        "retencao": {"total": len(parte_ret), "por_intencao": dict(sorted(Counter(intencao(e) for e in parte_ret).items()))},
        "excluidos_por_serem_teste": dict(excluidos),
        "por_app_idioma": dict(sorted(Counter(f"{e['app']}/{e['idioma']}" for e in mistura).items())),
        "por_intencao": dict(sorted(Counter(intencao(e) for e in mistura).items())),
        "casos_de_teste_no_filtro": len(perguntas),
    }
    Path(a.out).with_suffix(".resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
