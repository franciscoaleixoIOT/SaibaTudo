# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — monta o dataset de um treino de CONTINUAÇÃO do NLU (`treinar_nlu.py --lora_init <final>`): tudo o que é novo no corpus
atual em relação ao corpus do treino anterior + uma amostra de "revisão" do que já foi treinado (para o modelo não esquecer os outros
padrões e o outro app), intercalados de forma estável.

  python -I ia/treino/misturar_continuacao.py --novo ia/corpus/out/train.json --antigo ia/corpus/out/v3/train.json \
      --out ia/treino/out/nlu-v3.1-cont/train_cont.json [--revisao 1.2] [--seed 2026]

`--revisao` é a razão (revisão / novos): 1.2 = para cada 10 exemplos novos, 12 antigos, estratificados por app e idioma como no corpus atual.
"""
import argparse
import hashlib
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path


def chave(e: dict) -> str:
    return e["app"] + "|" + e["input"]


def balde(s: str) -> int:
    return int(hashlib.sha1(s.encode("utf-8")).hexdigest()[:12], 16)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--novo", required=True, help="train.json do corpus atual")
    ap.add_argument("--antigo", required=True, help="train.json do corpus que treinou o LoRA inicial")
    ap.add_argument("--out", required=True)
    ap.add_argument("--revisao", type=float, default=1.2)
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args(argv)

    novo = json.loads(Path(a.novo).read_text(encoding="utf-8"))
    antigo = json.loads(Path(a.antigo).read_text(encoding="utf-8"))
    vistos = {chave(e) for e in antigo}
    novos = [e for e in novo if chave(e) not in vistos]
    # exemplos cujo rótulo MUDOU (mesma pergunta, saída diferente) também são novos: entram com o rótulo atual
    saida_antiga = {chave(e): e["output"] for e in antigo}
    mudados = [e for e in novo if chave(e) in vistos and saida_antiga[chave(e)] != e["output"]]
    novos += mudados
    rng = random.Random(a.seed)
    # revisão estratificada por (app, idioma) na proporção do corpus atual, só com exemplos que o LoRA já viu com o MESMO rótulo
    comuns = [e for e in novo if chave(e) in vistos and saida_antiga[chave(e)] == e["output"]]
    por_grupo = defaultdict(list)
    for e in comuns:
        por_grupo[(e["app"], e["idioma"])].append(e)
    alvo_total = int(len(novos) * a.revisao)
    revisao = []
    for g, lista in sorted(por_grupo.items()):
        n = round(alvo_total * len(lista) / len(comuns))
        rng.shuffle(lista)
        revisao += lista[:n]
    mistura = novos + revisao
    mistura.sort(key=lambda e: balde(f"{a.seed}|{chave(e)}"))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(mistura, ensure_ascii=False, indent=0), encoding="utf-8")
    resumo = {
        "novos": len(novos), "rotulos_mudados": len(mudados), "revisao": len(revisao), "total": len(mistura),
        "novos_por_app_idioma": dict(sorted(Counter(f"{e['app']}/{e['idioma']}" for e in novos).items())),
        "novos_por_intencao": dict(sorted(Counter(e.get("intent") for e in novos).items())),
        "revisao_por_app_idioma": dict(sorted(Counter(f"{e['app']}/{e['idioma']}" for e in revisao).items())),
    }
    Path(a.out).with_suffix(".resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
