# -*- coding: utf-8 -*-
"""
Reaplica o gate do EXPLICADOR a uma versão já convertida, com limites decididos pelo mantenedor, sem gerar nem avaliar de novo: lê o
`eval.json` gravado por convert_local.py, recalcula o veredito (eval_seguranca.check_gates e eval_fidelidade) com os limites novos e reescreve
o `meta.json` da versão — registrando em `gate_notes` o veredito original, os limites antigos e novos, o motivo e a data. A versão continua
imutável no que importa (arquivos, hashes, avaliação); só o critério muda, e fica escrito por quê.

Caso de 22/10/2026 (ia/treino/README.md §Explica v1.4): o ciclo por dados saturou em ~80 % dos pedidos legítimos respondidos; o mantenedor
escolheu aceitar o v1.3 (0 % útil a pedido perigoso, 99,2 % de fidelidade, 80,1 % legítimos) com a regra da API (api/_lib/seguranca.js) como
primeira barreira e o mínimo de legítimos em 80 %.

Uso:  python backend/modal/regatear.py --version ask-v1.3-20261021 --min-respondido 80 --motivo "decisão do mantenedor em 22/10/2026: ..."
Código de saída: 0 = aprovado com os limites novos (meta.json reescrito); 1 = continua reprovado (meta.json intocado).
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eval_fidelidade as ev_fid  # noqa: E402
import eval_seguranca as ev_seg  # noqa: E402

GGUF_DIR = HERE.parent.parent / "ai_model" / "output" / "gguf"


def reavaliar(eval_json: dict, max_util: float, min_respondido: float, min_fiel: float):
    """Devolve (aprovado, motivos) com os limites dados, a partir do eval.json do explicador ({"Q4_K_M": {"seguranca": ..., "fidelidade": ...}})."""
    q4 = eval_json["Q4_K_M"]
    ok_s, motivos_s = ev_seg.check_gates(q4["seguranca"], max_util=max_util, min_respondido=min_respondido)
    ok_f, motivos_f = ev_fid.check_gates(q4["fidelidade"], min_fiel=min_fiel)
    return ok_s and ok_f, list(motivos_s) + list(motivos_f)


def regatear(pasta: Path, max_util: float, min_respondido: float, min_fiel: float, motivo: str, agora: str | None = None) -> dict:
    meta = json.loads((pasta / "meta.json").read_text(encoding="utf-8"))
    if meta.get("target") != "ask":
        raise SystemExit("regatear.py só trata versões do explicador (target ask)")
    ev = json.loads((pasta / "eval.json").read_text(encoding="utf-8"))
    aprovado, motivos = reavaliar(ev, max_util, min_respondido, min_fiel)
    antigos = dict(meta.get("gate_thresholds") or {})
    novos = {"max_util_perigoso": max_util, "min_respondido_legitimo": min_respondido, "min_fiel": min_fiel,
             "amostra_fidelidade": antigos.get("amostra_fidelidade")}
    agora = agora or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    nota = (f"regateado em {agora}: veredito original passed={meta.get('passed')} reasons={meta.get('reasons')} com limites {antigos}; "
            f"limites novos {novos}; motivo: {motivo}")
    novo = dict(meta)
    novo["gate_notes"] = list(meta.get("gate_notes") or []) + [nota]
    if aprovado:
        novo["passed"] = True
        novo["reasons"] = []
        novo["gate_thresholds"] = novos
        novo["regateado_em"] = agora
    return {"aprovado": aprovado, "motivos": motivos, "meta": novo, "nota": nota}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", required=True)
    ap.add_argument("--pasta", default=None, help="pasta da versão (padrão: ai_model/output/gguf/<version>)")
    ap.add_argument("--max-util-perigoso", type=float, default=ev_seg.MAX_UTIL_PERIGOSO_PCT)
    ap.add_argument("--min-respondido", type=float, required=True)
    ap.add_argument("--min-fiel", type=float, default=ev_fid.MIN_FIEL_PCT)
    ap.add_argument("--motivo", required=True, help="quem decidiu, quando e por quê (fica em gate_notes)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    pasta = Path(a.pasta) if a.pasta else GGUF_DIR / a.version
    r = regatear(pasta, a.max_util_perigoso, a.min_respondido, a.min_fiel, a.motivo)
    print(("APROVADO" if r["aprovado"] else "REPROVADO") + " com os limites novos", "-", pasta)
    for m in r["motivos"]:
        print("  -", m)
    if r["aprovado"] and not a.dry_run:
        (pasta / "meta.json").write_text(json.dumps(r["meta"], ensure_ascii=False, indent=1), encoding="utf-8")
        print("meta.json reescrito; gate_notes:", r["nota"][:160], "…")
    return 0 if r["aprovado"] else 1


if __name__ == "__main__":
    sys.exit(main())
