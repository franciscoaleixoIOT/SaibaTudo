# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — mistura de REFORÇO para uma continuação curta do NLU (`treinar_nlu.py --lora_init <final da versão anterior>`), quando o
gate da versão anterior mostrou recuo em intenções específicas (v3.5 → v3.6, 18/10/2026: CONCEITO pt e `apenasDeferidas` de eleições).

Diferente de `misturar_continuacao.py` (tudo o que é novo no corpus + revisão proporcional), aqui o LoRA já viu o corpus inteiro e a
mistura é escolhida à mão, em quatro partes, todas de pares que já existem nos corpora (nenhum exemplo novo é escrito aqui):
  1. FOCO: TODOS os pares do app de foco cujas intenções estão em `--intencoes`, tomados do corpus-base (o que o LoRA treinou) e, se
     `--extra` for dado, também do corpus anterior (pares que o corpus-base deixou de fora, p. ex. pelo teto por intenção), com o rótulo de lá.
     `--foco-teto-idioma N` limita cada (intenção, idioma) a N pares, para o foco não ficar quase só em pt (lição do v3.6: reforço só em pt
     custou es no golden).
  2. APP SECUNDÁRIO: amostra estratificada por intenção (`--amostra-app APP=N`), mais TODOS os pares cuja saída contém algum texto de
     `--sempre-com` (p. ex. `apenasDeferidas`) ou cuja intenção está em `--sempre-intencoes` (p. ex. REGRAS_URNA,AJUDA).
  3. RETENÇÃO: amostra estratificada por (intenção, idioma) das demais intenções do app de foco (`--retencao N`), para o modelo não
     esquecer o resto nem passar a ver a intenção de foco em tudo; com `--retencao-equilibrada`, o orçamento é dividido igualmente entre os
     idiomas (e, dentro de cada idioma, proporcional por intenção).
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


def _carregar_core(app: str):
    caminho = RAIZ / "apps" / app / "backend" / "modal" / "nlu_core.py"
    spec = importlib.util.spec_from_file_location(f"nlu_core_{app}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Contrato:
    """Confere cada par de treino contra o contrato da nuvem do app (nlu_core), ANTES do treino. Lição do v3.8 (20/10): extras com a chave
    "categoria" (do NLU local, fora do contrato da nuvem) ensinaram o modelo a gerá-la e derrubaram o JSON nativo no gate (96,8 % < 98 %).
    Devolve o motivo (None = par dentro do contrato)."""

    def __init__(self):
        self._cores = {}

    def _core(self, app):
        if app not in self._cores:
            self._cores[app] = _carregar_core(app)
        return self._cores[app]

    def motivo(self, e: dict):
        try:
            obj = json.loads(e["output"])
        except (KeyError, TypeError, ValueError):
            return "json_quebrado"
        if e["app"] == "quimica":
            core = self._core("quimica")
            m = core.motivo_forma_invalida(obj)
            if m is None and not core.combinacao_valida(obj):
                m = f"combinacao:{obj['intent']}"
            return m
        if e["app"] == "eleicoes2026":
            core = self._core("eleicoes2026")
            if not isinstance(obj, dict) or obj.get("intent") not in core.INTENTS:
                return "intent_fora"
            fora = [k for k in obj if k not in core.V2_KEYS]
            return f"chave_fora:{fora[0]}" if fora else None
        return f"app_desconhecido:{e['app']}"


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
    ap.add_argument("--foco-teto-idioma", type=int, default=0, help="máximo de pares de foco por (intenção, idioma); 0 = sem teto")
    ap.add_argument("--amostra-app", action="append", default=[], metavar="APP=N", help="amostra estratificada por intenção de outro app")
    ap.add_argument("--sempre-com", action="append", default=[], help="texto na saída que garante o par do app secundário (ex.: apenasDeferidas)")
    ap.add_argument("--sempre-intencoes", default="", help="intenções do app secundário que entram inteiras, separadas por vírgula")
    ap.add_argument("--extra-secundario", action="append", default=[],
                    help="train.json com pares de OUTRO app que entram inteiros (ex.: extras de eleições do v3.8); passam pelo filtro de teste")
    ap.add_argument("--retencao", type=int, default=0, help="pares de retenção do app de foco, fora das intenções de foco")
    ap.add_argument("--retencao-equilibrada", action="store_true", help="divide a retenção igualmente entre os idiomas do app de foco")
    ap.add_argument("--holdouts-dir", action="append", default=[], help="pastas com holdout_*.json a excluir (além do golden dos apps)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--sem-contrato", action="store_true", help="não confere os pares contra o contrato da nuvem (só para reproduzir misturas antigas)")
    ap.add_argument("--max-fora-contrato", type=int, default=50,
                    help="aborta se mais pares que isso estiverem fora do contrato (sinal de gerador com rótulo errado, não de ruído)")
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
    n_foco_bruto = len(parte_foco)
    if a.foco_teto_idioma:
        grupos = defaultdict(list)
        for e in parte_foco:
            grupos[(intencao(e), e["idioma"])].append(e)
        parte_foco = []
        for g, lista in sorted(grupos.items()):
            rng.shuffle(lista)
            parte_foco += lista[:a.foco_teto_idioma]
    sempre_int = {s for s in a.sempre_intencoes.split(",") if s}

    def garantido(e):
        return any(t in e["output"] for t in a.sempre_com) or intencao(e) in sempre_int

    parte_sec = []
    for item in a.amostra_app:
        app_, _, n = item.partition("=")
        pares = [e for e in base if e["app"] == app_]
        garantidos = [e for e in pares if garantido(e)]
        resto = [e for e in pares if not garantido(e)]
        amostra = estratificar(resto, intencao, max(0, int(n) - len(garantidos)), rng)
        parte_sec += garantidos + amostra
    extras_sec = []
    for p in a.extra_secundario:
        for e in json.loads(Path(p).read_text(encoding="utf-8")):
            if e["app"] != a.app and chave(e) not in vistos:
                extras_sec.append(e)
                vistos.add(chave(e))
    parte_sec += extras_sec
    candidatos_ret = [e for e in base if e["app"] == a.app and intencao(e) not in foco]
    if a.retencao and a.retencao_equilibrada:
        idiomas = sorted({e["idioma"] for e in candidatos_ret})
        parte_ret = []
        for idi in idiomas:
            parte_ret += estratificar([e for e in candidatos_ret if e["idioma"] == idi], intencao, a.retencao // len(idiomas), rng)
    elif a.retencao:
        parte_ret = estratificar(candidatos_ret, lambda e: (intencao(e), e["idioma"]), a.retencao, rng)
    else:
        parte_ret = []

    excluidos = Counter()
    contrato = Contrato()
    fora_contrato, exemplos_fora = Counter(), {}
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
            m = None if a.sem_contrato else contrato.motivo(e)
            if m:
                fora_contrato[f"{e['app']}/{nome}/{m}"] += 1
                exemplos_fora.setdefault(f"{e['app']}/{m}", [e["input"], e["output"]])
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
        "foco": {"intencoes": sorted(foco), "da_base": n_foco_bruto - len(extras), "dos_extras": len(extras),
                 "teto_por_intencao_idioma": a.foco_teto_idioma, "apos_teto": len(parte_foco),
                 "por_idioma": dict(sorted(Counter(e["idioma"] for e in parte_foco).items())),
                 "por_intencao_idioma": {f"{i}/{l}": n for (i, l), n in sorted(Counter((intencao(e), e["idioma"]) for e in parte_foco).items())}},
        "secundario": {"total": len(parte_sec), "por_intencao": dict(sorted(Counter(intencao(e) for e in parte_sec).items())),
                       "garantidos_por_sempre_com": sum(1 for e in parte_sec if any(t in e["output"] for t in a.sempre_com)),
                       "garantidos_por_intencao": sum(1 for e in parte_sec if intencao(e) in sempre_int),
                       "dos_extras_secundarios": len(extras_sec)},
        "retencao": {"total": len(parte_ret), "equilibrada_por_idioma": a.retencao_equilibrada,
                     "por_idioma": dict(sorted(Counter(e["idioma"] for e in parte_ret).items())),
                     "por_intencao": dict(sorted(Counter(intencao(e) for e in parte_ret).items()))},
        "excluidos_por_serem_teste": dict(excluidos),
        "excluidos_fora_do_contrato": dict(sorted(fora_contrato.items())),
        "exemplos_fora_do_contrato": exemplos_fora,
        "por_app_idioma": dict(sorted(Counter(f"{e['app']}/{e['idioma']}" for e in mistura).items())),
        "por_intencao": dict(sorted(Counter(intencao(e) for e in mistura).items())),
        "casos_de_teste_no_filtro": len(perguntas),
    }
    Path(a.out).with_suffix(".resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=1))
    total_fora = sum(fora_contrato.values())
    if total_fora > a.max_fora_contrato:
        print(f"ERRO: {total_fora} pares fora do contrato (máximo {a.max_fora_contrato}); corrija o gerador. Ver exemplos_fora_do_contrato.",
              file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
