# -*- coding: utf-8 -*-
"""
Empacota um GGUF do SaibaTudo-NLU que passou pelo gate (`ia/treino/avaliar_gguf.py`) no formato que o APP lê para publicar:

  apps/<app>/ai_model/output/gguf/<versão>/{model-Q4_K_M.gguf, meta.json, eval.json}

Depois é o fluxo normal do app (química, `docs/MODELO.md` §13): `modal volume put` dos três arquivos, `backend/modal/promover.py --version
<versão>` (lê `passed` do meta.json) e `MODEL_VERSION` na Vercel. Este script NÃO avalia nada de novo e NÃO publica: lê os `eval_*.json`
gravados por avaliar_gguf.py (Q4 com `--holdout` e Q8 com `--sem_livre`) e aplica o `eval_golden.check_gates` DO APP — os mesmos limiares da
conversão local do app, mais o recorte por idioma do avaliador — para decidir `passed`. Grava no meta.json o sufixo do prompt do Qwen3.5
(`prompt_suffix` = `nlu_core.THINK_VAZIO`), que `promover.py` copia para o ponteiro e `nlu_app.py` acrescenta a `build_prompt()`, igual ao treino.

Uso (da raiz; $PY = Python do ambiente de treino):
  $PY -I ia/treino/empacotar_versao.py --app quimica --version nlu-v3.1-20261013 \
      --gguf ia/treino/out/nlu-v31-cont/gguf/saibatudo-nlu-qwen35-2b-Q4_K_M.gguf \
      --eval ia/treino/out/nlu-v31-cont/eval_quimica_q4.json --eval-q8 ia/treino/out/nlu-v31-cont/eval_quimica_q8.json \
      --train-meta ia/treino/out/nlu-v31-cont/final/train_meta.json --origem "v3.1: continuação do v3 com quimica_populares" \
      [--previous-eval <eval.json da versão em produção> --previous-version <versão>] [--copiar-link] [--forcar-pasta]
Só `--app quimica` por enquanto (o app de eleições tem o próprio `convert_gguf.py`/Volume; entra depois de 27/10).
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
APPS = {
    "quimica": {"pasta": RAIZ / "apps" / "quimica", "modal": "backend/modal", "target": "nlu", "base_model": "Qwen/Qwen3.5-2B"},
}
LLAMA_REF_EXPORT = "b11575"  # tag do conversor/quantizador usados por ia/treino/exportar_gguf.py
CONVERTIDO_POR = "ia/treino/exportar_gguf.py (convert_hf_to_gguf.py --no-mtp + llama-quantize, llama.cpp b11575)"


def carregar_app(nome: str):
    """Importa convert_local, eval_golden e nlu_core do app (pelo caminho, sem cópia). Um app por processo."""
    cfg = APPS[nome]
    pasta = cfg["pasta"] / cfg["modal"]
    if str(pasta) not in sys.path:
        sys.path.insert(0, str(pasta))
    import convert_local as conv  # noqa: E402
    import eval_golden as ev  # noqa: E402
    return cfg, conv, ev


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


# ------------------------------------------------------------------------------------------------- partes puras (testadas)
def limites_do_app(ev) -> dict:
    return {"min_json_valid": ev.MIN_JSON_VALID_PCT, "min_intent_acc": ev.MIN_INTENT_ACC_PCT, "min_entity_acc": ev.MIN_ENTITY_ACC_PCT,
            "max_hallucination": ev.MAX_HALLUCINATION_PCT, "max_quant_drop": ev.MAX_QUANT_DROP_PP}


def montar_eval(q4: dict, q8: dict | None) -> dict:
    """eval.json do Volume no formato que o app já lê ({"Q4_K_M": {"constrained", "unconstrained", ...}, "Q8_0": {...}}), com o que o
    avaliador do NLU único acrescenta: holdout, recortes por idioma, conferência do template e vazamento de <think>."""
    bloco_q4 = {
        "constrained": q4["constrained"], "unconstrained": q4.get("unconstrained"),
        "holdout_informativo": q4.get("real"), "holdout_arquivo": q4.get("holdout_arquivo"),
        "por_idioma": {"golden": q4.get("golden_por_idioma"), "holdout": q4.get("holdout_por_idioma"), "gates": q4.get("gates_por_idioma")},
        "template": q4.get("template"),
        "think": {"com_gramatica": q4.get("think_com_gramatica"), "sem_gramatica": q4.get("think_sem_gramatica")},
        "latencia_s": {"com_gramatica": q4.get("latencia_com_gramatica"), "sem_gramatica": q4.get("latencia_sem_gramatica")},
        "gguf_avaliado": q4.get("gguf"), "threads": q4.get("threads"), "duracao_total_s": q4.get("duracao_total_s"),
    }
    return {
        "Q4_K_M": bloco_q4,
        "Q8_0": {"constrained": q8["constrained"], "gguf_avaliado": q8.get("gguf")} if q8 else None,
        "fonte": "ia/treino/avaliar_gguf.py (gate do NLU único, por app e por idioma)",
    }


def decidir(ev, q4: dict, q8: dict | None, previous: dict | None, limites: dict) -> tuple:
    """`passed` do meta.json: gates do app (check_gates sobre golden, sem gramática, Q8, holdout e catraca) + recorte por idioma do
    avaliador (cada idioma tem de passar sozinho) + conferência do template (treino = serviço). Devolve (aprovado, motivos, notas)."""
    aprovado, motivos = ev.check_gates(q4["constrained"], q4.get("unconstrained"), (q8 or {}).get("constrained"),
                                       real=q4.get("real"), previous=previous, **limites)
    motivos = list(motivos)
    for idioma, g in (q4.get("gates_por_idioma") or {}).items():
        if isinstance(g, dict) and not g.get("passou", True):
            motivos += [f"[{idioma}] {m}" for m in (g.get("motivos") or ["reprovado"])]
    t = q4.get("template") or {}
    for chave in ("gguf_template_igual_servico", "hf_template_igual_servico", "tokens_iguais_hf_gguf"):
        if chave in t and not t[chave]:
            motivos.append(f"template: {chave} = false (prompt do serviço difere do do treino)")
    for chave in ("think_com_gramatica", "think_sem_gramatica"):
        if q4.get(chave):
            motivos.append(f"{chave}: {q4[chave]} saída(s) com <think> (o modelo deve responder sem raciocínio)")
    notas = []
    if not q8:
        notas.append("sem avaliação Q8: queda de quantização não medida")
    if previous is None:
        notas.append("sem versão anterior em produção: catraca não se aplica (primeira versão publicada neste app)")
    if q4.get("real"):
        r = q4["real"]
        notas.append(f"holdout {r.get('n_cases')} casos: intenção {r.get('intent_acc_pct')}%, JSON {r.get('json_valid_pct')}%")
    return (aprovado and not motivos), motivos, notas


def montar_pacote(conv, ev, *, app_cfg: dict, version: str, q4: dict, q8: dict | None, origem: str, train_meta: dict | None,
                  arquivos: dict, previous: dict | None, agora: str, segundos: int = 0) -> tuple:
    """(meta, eval) prontos para gravar. meta via conv.montar_meta (campos que o serviço e promover.py leem)."""
    target = app_cfg["target"]
    conv.validar_versao(version, target)
    limites = limites_do_app(ev)
    aprovado, motivos, notas = decidir(ev, q4, q8, previous, limites)
    meta = conv.montar_meta(
        target=target, version=version, origem=origem, llama_ref=LLAMA_REF_EXPORT, llama_sha=None, aprovado=aprovado, motivos=motivos,
        gate_notes=notas, limites={**limites, "por_idioma": True}, arquivos=arquivos, segundos=segundos, criado_em=agora, train_meta=train_meta,
        prompt_suffix=conv.core.THINK_VAZIO, base_model=(train_meta or {}).get("base_model") or app_cfg["base_model"], convertido_por=CONVERTIDO_POR,
    )
    meta["avaliado_por"] = "ia/treino/avaliar_gguf.py"
    meta["idiomas"] = [g["idioma"] for g in (q4.get("golden_por_idioma") or []) if isinstance(g, dict) and g.get("idioma")]
    return meta, montar_eval(q4, q8)


# ------------------------------------------------------------------------------------------------- CLI
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--app", required=True, choices=sorted(APPS))
    ap.add_argument("--version", required=True, help="nlu-v3.1-AAAAMMDD (imutável)")
    ap.add_argument("--gguf", required=True, help="GGUF Q4_K_M avaliado (vira model-Q4_K_M.gguf)")
    ap.add_argument("--eval", required=True, help="saída de avaliar_gguf.py para o Q4 (com --holdout)")
    ap.add_argument("--eval-q8", help="saída de avaliar_gguf.py para o Q8 (--sem_livre); sem ele a queda de quantização não é medida")
    ap.add_argument("--train-meta", help="final/train_meta.json do treino (gravado em meta.treino)")
    ap.add_argument("--origem", default="", help="texto livre: dataset, passos, perda, de onde veio")
    ap.add_argument("--previous-eval", help="eval.json da versão em produção (catraca); omitir na primeira versão do app")
    ap.add_argument("--previous-version")
    ap.add_argument("--out-root", help="padrão: apps/<app>/ai_model/output/gguf")
    ap.add_argument("--copiar-link", action="store_true", help="hard link em vez de cópia do GGUF (mesmo disco)")
    ap.add_argument("--forcar-pasta", action="store_true", help="sobrescreve uma pasta de versão já existente (versões são imutáveis: evite)")
    a = ap.parse_args(argv)

    app_cfg, conv, ev = carregar_app(a.app)
    q4 = json.loads(Path(a.eval).read_text(encoding="utf-8"))
    if q4.get("app") not in (None, a.app):
        raise SystemExit(f"--eval é do app {q4.get('app')!r}, não de {a.app!r}")
    q8 = json.loads(Path(a.eval_q8).read_text(encoding="utf-8")) if a.eval_q8 else None
    train_meta = json.loads(Path(a.train_meta).read_text(encoding="utf-8")) if a.train_meta else None
    previous = None
    if a.previous_eval:
        prev = conv.normalizar_previous(json.loads(Path(a.previous_eval).read_text(encoding="utf-8")))
        previous, aviso = ev.escolher_previous({"version": a.previous_version, "format": conv.core.FORMAT_VERSION}, prev,
                                               q4["constrained"]["n_cases"])
        if aviso:
            print(aviso)

    destino = Path(a.out_root or (app_cfg["pasta"] / "ai_model" / "output" / "gguf")) / a.version
    if destino.exists() and any(destino.iterdir()) and not a.forcar_pasta:
        raise SystemExit(f"{destino} já existe (versões são imutáveis); escolha outra versão ou passe --forcar-pasta")
    destino.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    alvo = destino / conv.ARQUIVO_PRODUCAO
    if alvo.exists():
        alvo.unlink()
    if a.copiar_link:
        os.link(a.gguf, alvo)
    else:
        shutil.copy2(a.gguf, alvo)
    arquivos = {conv.ARQUIVO_PRODUCAO: {"bytes": alvo.stat().st_size, "sha256": sha256(alvo), "origem": str(Path(a.gguf))}}
    agora = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    meta, ev_json = montar_pacote(conv, ev, app_cfg=app_cfg, version=a.version, q4=q4, q8=q8, origem=a.origem, train_meta=train_meta,
                                  arquivos=arquivos, previous=previous, agora=agora, segundos=int(time.time() - t0))
    (destino / "eval.json").write_text(json.dumps(ev_json, ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")

    c = q4["constrained"]
    print(f"\n{a.version} -> {destino}")
    print(f"  golden {c['n_cases']}: JSON {c['json_valid_pct']}%  intenção {c['intent_acc_pct']}%  "
          + "  ".join(f"{e} {c.get(e + '_acc_pct')}%" for e in ("elemento", "composto", "propriedade", "equacao", "unidadeDestino")))
    for n in meta["gate_notes"]:
        print("  nota:", n)
    if meta["passed"]:
        print("  GATE: APROVADO. Próximo: `modal volume put` dos três arquivos e backend/modal/promover.py (ver docs/MODELO.md §13).")
        return 0
    print("  GATE: REPROVADO — não publicar:")
    for m in meta["reasons"]:
        print("   -", m)
    return 2


if __name__ == "__main__":
    sys.exit(main())
