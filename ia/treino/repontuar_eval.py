# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — repontua um `eval_<app>_*.json` gravado por `avaliar_gguf.py` SEM gerar de novo: reaplica o `eval_golden.evaluate`
do app sobre as saídas guardadas (`cases[].saida`) e recalcula o geral, o recorte por idioma e os gates de referência.

Serve quando o avaliador do app muda (ex.: o carregador de nomes de compostos passou a conhecer os nomes por idioma) e não vale a
pena repetir 1 a 2 h de geração em CPU. A saída guardada é cortada em 600 caracteres: casos que bateram nesse teto são contados em
`saidas_truncadas` (não dá para repontuá-los com certeza).

Uso:
  python -I ia/treino/repontuar_eval.py --app quimica --eval <out>/eval_quimica_q4.json [--out <out>/eval_quimica_q4_repontuado.json]
"""
import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import avaliar_gguf as av  # noqa: E402

TETO_SAIDA = 600


def gerador_gravado(resultado: dict):
    """generate(q) que devolve a saída guardada daquela pergunta (a primeira ocorrência; as perguntas do golden são únicas)."""
    saidas = {}
    for c in resultado.get("cases") or []:
        saidas.setdefault(c["q"], c.get("saida") or "")

    def gen(q):
        if q not in saidas:
            raise KeyError(f"pergunta sem saída gravada: {q!r}")
        return saidas[q]

    gen.saidas = saidas
    return gen


def repontuar(app: av.App, resultado: dict | None, casos, label: str):
    if not resultado:
        return None, None, 0
    gen = gerador_gravado(resultado)
    truncadas = sum(1 for s in gen.saidas.values() if len(s) >= TETO_SAIDA)
    novo = app.evaluate(gen, casos, label)
    novo["latency_s_mean"], novo["latency_s_max"] = resultado.get("latency_s_mean"), resultado.get("latency_s_max")
    recortes = av.por_idioma(app, gen, casos, label)
    return novo, recortes, truncadas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--app", choices=sorted(av.APPS), required=True)
    ap.add_argument("--eval", required=True, help="eval_<app>_*.json gravado por avaliar_gguf.py")
    ap.add_argument("--baseline", help="eval do Q8_0 (já repontuado) para a queda de quantização")
    ap.add_argument("--out")
    a = ap.parse_args()

    app = av.App(a.app)
    antigo = json.loads(Path(a.eval).read_text(encoding="utf-8"))
    casos = app.eval.load_cases()
    c, c_idiomas, trunc_c = repontuar(app, antigo.get("constrained"), casos, "COM gramática (produção), repontuado")
    app.eval.print_summary(c)
    print("   por idioma:")
    c_tabela = av.linha_idiomas(app, c_idiomas)
    u, u_idiomas, trunc_u = repontuar(app, antigo.get("unconstrained"), casos, "SEM gramática (validade nativa), repontuado")
    if u:
        app.eval.print_summary(u)
        print("   por idioma (sem gramática):")
        av.linha_idiomas(app, u_idiomas, gates=False)
    real = real_idiomas = real_tabela = None
    trunc_r = 0
    if antigo.get("real") and antigo.get("holdout_arquivo") and Path(antigo["holdout_arquivo"]).exists():
        casos_h = app.eval.load_cases(antigo["holdout_arquivo"])
        real, real_idiomas, trunc_r = repontuar(app, antigo["real"], casos_h, f"holdout ({len(casos_h)}), repontuado")
        app.eval.print_summary(real)
        print("   por idioma:")
        real_tabela = av.linha_idiomas(app, real_idiomas)
    baseline = None
    if a.baseline and Path(a.baseline).exists():
        baseline = json.loads(Path(a.baseline).read_text(encoding="utf-8")).get("constrained")
    ok, motivos = app.check_gates(c, u, real=real, baseline=baseline)
    gates_idiomas = {i: app.check_gates(r, (u_idiomas or {}).get(i), real=(real_idiomas or {}).get(i)) for i, r in c_idiomas.items()}
    print("\nGATES (referência, repontuado):", "APROVADO" if ok else "REPROVADO")
    for m in motivos:
        print("  -", m)
    for i, (ok_i, ms) in gates_idiomas.items():
        print(f"  [{i}] {'ok' if ok_i else 'FALHA'}")
        for m in ms:
            print(f"      - {m}")
    print(f"saídas truncadas em {TETO_SAIDA} caracteres: golden {trunc_c} (sem gramática {trunc_u}), holdout {trunc_r}")
    novo = dict(antigo)
    novo.update({
        "repontuado_de": str(a.eval), "saidas_truncadas": {"golden": trunc_c, "golden_sem_gramatica": trunc_u, "holdout": trunc_r},
        "gates_referencia": {"passou": ok, "motivos": motivos},
        "gates_por_idioma": {i: {"passou": ok_i, "motivos": ms} for i, (ok_i, ms) in gates_idiomas.items()},
        "golden_por_idioma": c_tabela, "holdout_por_idioma": real_tabela,
        "constrained": c, "unconstrained": u, "real": real,
        "constrained_por_idioma": c_idiomas, "unconstrained_por_idioma": u_idiomas, "real_por_idioma": real_idiomas,
    })
    if a.out:
        Path(a.out).write_text(json.dumps(novo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"gravado em {a.out}")


if __name__ == "__main__":
    sys.exit(main())
