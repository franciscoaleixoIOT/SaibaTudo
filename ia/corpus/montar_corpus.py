# -*- coding: utf-8 -*-
"""
Corpus único de treino do interpretador (NLU) da SaibaTudo.IA — etapa 2 de docs/PLANO_IA_SAIBATUDO.md.

Um modelo só para todos os apps: em produção a função `nlu` recebe `app` (+ `idioma`) e escolhe o system prompt e a gramática do app.
Por isso cada exemplo leva como `instruction` EXATAMENTE o system prompt de produção do seu app, importado por caminho (sem cópia):
  eleicoes2026 -> apps/eleicoes2026/backend/modal/nlu_core.py  SYSTEM_PROMPT_V2   (formato v2)
  quimica      -> apps/quimica/backend/modal/nlu_core.py      SYSTEM_PROMPT      (formato v1)

Fontes:
  eleições (só pt-BR, como está; nada novo antes de 27/10): ../SaibaTudoEleicao2026/backend/retrain/out-v23/{train,val,holdout_cases}.json
           (treino do v2.3 e as 435 perguntas reservadas do gate); origem "externo" para as perguntas de backend/retrain/extra/*.jsonl.
  química pt-BR: apps/quimica/dataset/nlu/{train,val}.jsonl (gerar_nlu.py) passados por backend/retrain/build_nlu_dataset.construir
           (as mesmas garantias do montador do app: forma do contrato, evidência, contratos de teste fora; val.jsonl vira holdout).
  química en/es/de/fr: quimica_multilingue.py (etapa F da i18n), também passado por build_nlu_dataset.construir.
Testes (NUNCA treinam): golden de cada app (química nos cinco idiomas), perguntas reais/nomes/opinião da eleição, segurança da química e
o holdout de 435 da eleição — nada idêntico nem quase idêntico (Jaccard de palavras >= 0,8, normalização de build_nlu_dataset.py da
eleição) entra em train/val.

Saídas (ia/corpus/out/, fora do Git):
  corpus_nlu.jsonl   formato único {app, idioma, tarefa, entrada, saida, fonte, licenca, origem, divisao}
  train.json/val.json  {instruction, input, output, app, idioma, intent} (o que ai_model/scripts/train_hybrid.py lê)
  holdout_<app>.json   {"cases": [...]} no esquema dos golden (eval_golden.py --cases), com `idioma`
  contagens.json     por app, idioma, intenção, origem e divisão; descartes e limites aplicados

Uso (da raiz):  python -I ia/corpus/montar_corpus.py [--teto-intencao-quimica-pt 2400] [--val-pct-quimica 3]
"""
import argparse
import hashlib
import importlib
import importlib.util
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
APPS = RAIZ / "apps"
ELEICOES = APPS / "eleicoes2026"
QUIMICA = APPS / "quimica"
OUT = AQUI / "out"
V23 = Path(r"C:\Users\franc\AndroidStudioProjects\SaibaTudoEleicao2026\backend\retrain\out-v23")

TESTES_ELEICOES = [ELEICOES / "contracts" / n for n in ("nlu_golden_cases.json", "nlu_real_cases.json", "nlu_nome_cases.json", "opiniao_cases.json")]
TESTES_QUIMICA = [QUIMICA / "contracts" / n for n in ("nlu_golden_cases.json", "seguranca_cases.json")]
JACCARD_QUASE_IGUAL = 0.8
SEED = 2026

FONTE_ELEICOES = "SaibaTudo Eleições 2026: build_nlu_dataset.py v2.3 (moldes sobre o pacote oficial do TSE)"
LICENCA_ELEICOES = "formulações do projeto; rótulos sobre dados abertos do TSE (CC BY)"
FONTE_QUIMICA_PT = "SaibaTudo Química: dataset/gerar_nlu.py (moldes pt-BR sobre o pacote de dados: PubChem, Wikidata, CLP/EUR-Lex, Wikipédia pt)"
LICENCA_QUIMICA = "CC BY-SA 4.0"
# Linha de idioma PROPOSTA para o prompt da química (não está em produção; ver README §Prompt). Só entra com --linha-idioma-quimica.
LINHA_IDIOMA_QUIMICA = ("A pergunta pode estar em português, inglês, espanhol, alemão ou francês; o JSON usa sempre o vocabulário do "
                        "contrato e copia o composto e a equação como foram escritos.")
_MODULOS_APP = ("nlu_core", "ask_core", "eval_ask_common", "eval_golden", "dataset_common", "build_nlu_dataset")


# ---------------------------------------------------------------------------------------------------------
# Normalização e quase-igualdade (as MESMAS de apps/eleicoes2026/backend/retrain/build_nlu_dataset.py)
# ---------------------------------------------------------------------------------------------------------
def fold(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def norm_question(s: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", fold(s)))


def tokens(s: str) -> frozenset:
    return frozenset(norm_question(s).split())


def jaccard(a: frozenset, b: frozenset) -> float:
    return len(a & b) / len(a | b) if (a or b) else 0.0


def chave_texto(s: str) -> str:
    """Duplicata = mesmo texto, a menos de espaços. Variantes de caixa NÃO são duplicatas: o rótulo copia a caixa da pergunta."""
    return re.sub(r"\s+", " ", s).strip()


def balde(chave: str, mod: int = 1000) -> int:
    return int(hashlib.sha256(f"{SEED}|{chave}".encode("utf-8")).hexdigest()[:8], 16) % mod


class FiltroDeTeste:
    """Pergunta idêntica (normalizada) ou quase idêntica (Jaccard >= 0,8) a algum caso de teste. Índice invertido por palavra para não
    comparar com todos os casos."""

    def __init__(self, perguntas):
        self.exatas = {norm_question(q) for q in perguntas}
        self.conj = [tokens(q) for q in perguntas]
        self.indice = defaultdict(set)
        for i, t in enumerate(self.conj):
            for w in t:
                self.indice[w].add(i)

    def veredito(self, q: str):
        if norm_question(q) in self.exatas:
            return "exata"
        t = tokens(q)
        cands = set()
        for w in t:
            cands |= self.indice.get(w, set())
        for i in cands:
            if jaccard(t, self.conj[i]) >= JACCARD_QUASE_IGUAL:
                return "quase"
        return None


def perguntas_de(arquivos) -> list:
    out = []
    for p in arquivos:
        if not Path(p).exists():
            continue
        d = json.loads(Path(p).read_text(encoding="utf-8"))
        for c in (d.get("cases", []) if isinstance(d, dict) else d):
            q = c.get("q") or c.get("pergunta") or c.get("texto")
            if isinstance(q, str):
                out.append(q)
    return out


# ---------------------------------------------------------------------------------------------------------
# Módulos dos apps (os dois têm nlu_core: cada um é importado isolado, como tools/benchmark_ia/comum.py faz)
# ---------------------------------------------------------------------------------------------------------
def _limpar_modulos():
    for n in _MODULOS_APP:
        sys.modules.pop(n, None)


def modulos_quimica():
    """build_nlu_dataset (+ dataset_common e nlu_core da química) importados pelo caminho do app; sys.modules limpo depois."""
    _limpar_modulos()
    pastas = [str(QUIMICA / "backend" / "retrain"), str(QUIMICA / "backend" / "modal")]
    antes = list(sys.path)
    sys.path[:0] = pastas
    try:
        bq = importlib.import_module("build_nlu_dataset")
    finally:
        sys.path[:] = antes
        _limpar_modulos()
    return bq


def nlu_core_eleicoes():
    spec = importlib.util.spec_from_file_location("eleicoes_nlu_core", ELEICOES / "backend" / "modal" / "nlu_core.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def multilingue():
    spec = importlib.util.spec_from_file_location("quimica_multilingue", AQUI / "quimica_multilingue.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def populares():
    """Gerador focado dos compostos do dia a dia (5 idiomas), somado ao corpus desde o v3.1 (gate do v3: `composto` omitido no golden)."""
    spec = importlib.util.spec_from_file_location("quimica_populares", AQUI / "quimica_populares.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------------------------------------
# Validação dos rótulos pelo contrato de cada app
# ---------------------------------------------------------------------------------------------------------
def rotulo_valido_eleicoes(core, saida: str) -> bool:
    try:
        obj = json.loads(saida)
    except ValueError:
        return False
    if not core.has_valid_shape(obj, "v2") or any(k not in core.V2_KEYS for k in obj):
        return False
    regras = {"cargo": lambda v: v in core.CARGOS, "uf": lambda v: v in core.UFS, "tema": lambda v: v in core.TEMAS_V2,
              "historico": lambda v: v in core.HISTORICOS, "turno": lambda v: v in (1, 2), "apenasDeferidas": lambda v: v is True,
              "nome": lambda v: isinstance(v, str) and v.strip() != "", "partido": lambda v: isinstance(v, str) and v.strip() != ""}
    if not all(regras[k](v) for k, v in obj.items() if k != "intent"):
        return False
    return core.format_output_v2(obj) == saida


def rotulo_valido_quimica(core, saida: str) -> bool:
    obj = core.parse_model_output(saida)
    return core.has_valid_shape(obj) and core.format_output(obj) == saida


# ---------------------------------------------------------------------------------------------------------
# Eleições
# ---------------------------------------------------------------------------------------------------------
def extras_eleicoes() -> dict:
    """{pergunta normalizada: (fonte, licença)} das perguntas externas (backend/retrain/extra/*.jsonl)."""
    out = {}
    for arq in sorted((ELEICOES / "backend" / "retrain" / "extra").glob("rotuladas_*.jsonl")):
        for linha in arq.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                r = json.loads(linha)
                out[norm_question(r["q"])] = (r.get("fonte") or arq.stem, r.get("licenca") or "")
    return out


def carregar_eleicoes(core, stats) -> tuple:
    if not (V23 / "train.json").exists():
        raise SystemExit(f"treino do v2.3 não encontrado em {V23}")
    extras = extras_eleicoes()
    prompt = core.SYSTEM_PROMPT_V2
    meta = json.loads((V23 / "meta.json").read_text(encoding="utf-8"))
    if meta.get("system_prompt") != prompt:
        stats["avisos"].append("o system prompt do v2.3 (meta.json) difere do SYSTEM_PROMPT_V2 atual: usa-se o atual")
    lados = {}
    for divisao, arq in (("treino", "train.json"), ("val", "val.json")):
        regs = []
        for r in json.loads((V23 / arq).read_text(encoding="utf-8")):
            if r.get("instruction") != prompt:
                stats["avisos"].append(f"eleições {arq}: instruction diferente do prompt de produção ({r.get('instruction', '')[:40]}...)")
            ext = extras.get(norm_question(r["input"]))
            regs.append({"app": "eleicoes2026", "idioma": "pt-BR", "entrada": r["input"], "saida": r["output"], "intent": r["intent"],
                         "fonte": ext[0] if ext else FONTE_ELEICOES, "licenca": ext[1] if ext else LICENCA_ELEICOES,
                         "origem": "externo" if ext else "template", "divisao": divisao})
        lados[divisao] = regs
    hold = json.loads((V23 / "holdout_cases.json").read_text(encoding="utf-8"))["cases"]
    casos = []
    for c in hold:
        casos.append({**c, "idioma": "pt-BR"})
    return lados["treino"], lados["val"], casos


# ---------------------------------------------------------------------------------------------------------
# Química
# ---------------------------------------------------------------------------------------------------------
def carregar_quimica(bq, ml, stats, idiomas, escala) -> tuple:
    dc, nlu = bq.dc, bq.nlu
    filtro = dc.FiltroDeContrato(dc.perguntas_dos_contratos(QUIMICA / "contracts"))
    pasta_pt = QUIMICA / "dataset" / "nlu"
    dc.exigir_dados_reais(pasta_pt)
    treino, holdout_casos = [], []
    st_pt = json.loads((pasta_pt / "stats.json").read_text(encoding="utf-8"))
    tr, _ho, casos, desc, st = bq.construir(bq.ler_registros(pasta_pt), filtro)
    stats["quimica_build"]["pt-BR"] = {**{k: v for k, v in st.items() if not k.startswith("intent_")}, "descartados": len(desc),
                                       "versaoDados": st_pt.get("versaoDados"), "fonteDados": st_pt.get("fonteDados")}
    for ex in tr:
        treino.append({"app": "quimica", "idioma": "pt-BR", "entrada": ex["input"], "saida": ex["output"], "intent": ex["intent"],
                       "fonte": FONTE_QUIMICA_PT, "licenca": LICENCA_QUIMICA, "origem": "template", "divisao": "treino"})
    holdout_casos += [{**c, "idioma": "pt-BR"} for c in casos]
    ds = ml._dataset()
    pac = ds[4].localizar(None)
    if pac.eh_fixture:
        raise SystemExit("pacote data/quimica ausente: o gerador multilíngue caiu na fixture de teste")
    for idioma in idiomas:
        regs, st_ml = ml.gerar_idioma(pac, idioma, SEED, escala, ds)
        tr, _ho, casos, desc, st = bq.construir(regs, filtro)
        stats["quimica_build"][idioma] = {**{k: v for k, v in st.items() if not k.startswith("intent_")}, "descartados": len(desc),
                                         "gerador": {k: v for k, v in st_ml.items() if k != "por_intencao"}}
        for ex in tr:
            treino.append({"app": "quimica", "idioma": idioma, "entrada": ex["input"], "saida": ex["output"], "intent": ex["intent"],
                           "fonte": ml.FONTE, "licenca": ml.LICENCA, "origem": "template", "divisao": "treino"})
        holdout_casos += [{**c, "idioma": idioma} for c in casos]
        assert all(ex["instruction"] == nlu.SYSTEM_PROMPT for ex in tr)
    return treino, holdout_casos


def carregar_populares(bq, pop, stats, idiomas, escala) -> tuple:
    """Compostos do dia a dia nos 5 idiomas (quimica_populares.py), pelo mesmo construtor/filtro do app. Fica FORA do teto por intenção da
    química pt (o teto é para o gerador base; estes exemplos são a correção do gate do v3). escala 0 desliga."""
    treino, holdout_casos = [], []
    if escala <= 0:
        return treino, holdout_casos
    dc = bq.dc
    filtro = dc.FiltroDeContrato(dc.perguntas_dos_contratos(QUIMICA / "contracts"))
    comum, pacote = pop._dataset()
    pac = pacote.localizar(None)
    if pac.eh_fixture:
        raise SystemExit("pacote data/quimica ausente: o gerador de compostos populares caiu na fixture de teste")
    for idioma in ["pt-BR"] + list(idiomas):
        regs, st_pop = pop.gerar_idioma(pac, idioma, SEED, escala, (comum, pacote))
        tr, _ho, casos, desc, st = bq.construir(regs, filtro)
        stats["quimica_build"][f"populares/{idioma}"] = {**{k: v for k, v in st.items() if not k.startswith("intent_")}, "descartados": len(desc),
                                                         "gerador": {k: v for k, v in st_pop.items() if k != "por_intencao"}}
        for ex in tr:
            treino.append({"app": "quimica", "idioma": idioma, "entrada": ex["input"], "saida": ex["output"], "intent": ex["intent"],
                           "fonte": pop.FONTE, "licenca": pop.LICENCA, "origem": "template", "divisao": "treino"})
        holdout_casos += [{**c, "idioma": idioma} for c in casos]
    return treino, holdout_casos


def limitar_por_intencao(regs, teto: int, stats, rotulo: str):
    """Teto de exemplos por intenção (escolha estável por hash da pergunta), para um app/idioma não enviesar o modelo."""
    if not teto:
        return regs
    por = defaultdict(list)
    for r in regs:
        por[r["intent"]].append(r)
    saida = []
    for it, lst in por.items():
        if len(lst) > teto:
            lst = sorted(lst, key=lambda r: balde(r["entrada"], 10 ** 9))[:teto]
            stats["limite_por_intencao"].setdefault(rotulo, {})[it] = {"antes": len(por[it]), "depois": teto}
        saida += lst
    return saida


def separar_val(regs, pct: float):
    tr, va = [], []
    for r in regs:
        (va if balde("val|" + norm_question(r["entrada"])) < pct * 10 else tr).append(r)
    for r in va:
        r["divisao"] = "val"
    return tr, va


# ---------------------------------------------------------------------------------------------------------
def montar(args) -> dict:
    stats = {"avisos": [], "quimica_build": {}, "limite_por_intencao": {}, "removidos_por_teste": Counter(), "duplicatas_removidas": Counter(),
             "conflitos_de_rotulo": 0, "rotulo_invalido": Counter()}
    bq = modulos_quimica()
    qcore = bq.nlu
    ecore = nlu_core_eleicoes()
    ml = multilingue()
    prompts = {"eleicoes2026": ecore.SYSTEM_PROMPT_V2,
               "quimica": qcore.SYSTEM_PROMPT + ((" " + LINHA_IDIOMA_QUIMICA) if args.linha_idioma_quimica else "")}

    e_tr, e_va, e_hold = carregar_eleicoes(ecore, stats)
    idiomas = [i for i in args.idiomas.split(",") if i]
    q_tr, q_hold = carregar_quimica(bq, ml, stats, idiomas, args.escala)
    pt = [r for r in q_tr if r["idioma"] == "pt-BR"]
    resto = [r for r in q_tr if r["idioma"] != "pt-BR"]
    pt = limitar_por_intencao(pt, args.teto_intencao_quimica_pt, stats, "quimica/pt-BR")
    p_tr, p_hold = carregar_populares(bq, populares(), stats, idiomas, args.escala_populares)  # fora do teto: correção do gate do v3
    q_hold += p_hold
    q_tr, q_va = separar_val(pt + resto + p_tr, args.val_pct_quimica)

    # filtro de teste (todos os apps), validade do rótulo, duplicatas e conflitos
    filtro = FiltroDeTeste(perguntas_de(TESTES_ELEICOES + TESTES_QUIMICA) + [c["q"] for c in e_hold])
    # holdout da química: cada gerador já separa por entidade, mas dois geradores podem produzir a MESMA pergunta (um no treino, outro no
    # holdout); o texto exato do holdout nunca treina (só exato: a quase-igualdade removeria metade dos moldes)
    holdout_quimica_exato = {chave_texto(c["q"]) for c in q_hold}
    validos = {"eleicoes2026": lambda s: rotulo_valido_eleicoes(ecore, s), "quimica": lambda s: rotulo_valido_quimica(qcore, s)}
    vistos, finais = {}, []
    for r in e_tr + e_va + q_tr + q_va:
        v = filtro.veredito(r["entrada"])
        if not v and r["app"] == "quimica" and chave_texto(r["entrada"]) in holdout_quimica_exato:
            v = "holdout_exato"
        if v:
            stats["removidos_por_teste"][f"{r['app']}/{r['idioma']}/{v}"] += 1
            continue
        if not validos[r["app"]](r["saida"]):
            stats["rotulo_invalido"][f"{r['app']}/{r['idioma']}"] += 1
            continue
        k = (r["app"], chave_texto(r["entrada"]))  # texto exato (caixa conta: o nome/composto é copiado com a caixa da pergunta)
        if k in vistos:
            if vistos[k]["saida"] != r["saida"]:
                stats["conflitos_de_rotulo"] += 1
            stats["duplicatas_removidas"][f"{r['app']}/{r['idioma']}"] += 1
            continue
        vistos[k] = r
        finais.append(r)

    # saídas
    OUT.mkdir(parents=True, exist_ok=True)
    corpus = []
    for r in finais:
        corpus.append({"app": r["app"], "idioma": r["idioma"], "tarefa": "nlu", "entrada": r["entrada"], "saida": r["saida"], "fonte": r["fonte"],
                       "licenca": r["licenca"], "origem": r["origem"], "divisao": r["divisao"]})
    holdouts = {"eleicoes2026": e_hold, "quimica": q_hold}
    for app, casos in holdouts.items():
        fonte = FONTE_ELEICOES if app == "eleicoes2026" else None
        for c in casos:
            if app == "eleicoes2026":
                saida = ecore.format_output_v2({k: v for k, v in c.items() if k in ecore.V2_KEYS})
                corpus.append({"app": app, "idioma": "pt-BR", "tarefa": "nlu", "entrada": c["q"], "saida": saida, "fonte": "perguntas reservadas do gate do v2.3 (backend/retrain/holdout.py)",
                               "licenca": LICENCA_ELEICOES, "origem": "holdout", "divisao": "holdout"})
            else:
                alvo = {k: v for k, v in c.items() if k in qcore.KEYS and v is not None}
                corpus.append({"app": app, "idioma": c["idioma"], "tarefa": "nlu", "entrada": c["q"], "saida": qcore.format_output(alvo),
                               "fonte": FONTE_QUIMICA_PT if c["idioma"] == "pt-BR" else ml.FONTE, "licenca": LICENCA_QUIMICA, "origem": "holdout",
                               "divisao": "holdout"})
        del fonte
    with open(OUT / "corpus_nlu.jsonl", "w", encoding="utf-8", newline="\n") as f:
        for r in corpus:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    def sft(r):
        return {"instruction": prompts[r["app"]], "input": r["entrada"], "output": r["saida"], "app": r["app"], "idioma": r["idioma"], "intent": r["intent"]}

    # ordem estável e misturada (apps e idiomas intercalados), para o treino não ver um app inteiro de cada vez
    finais.sort(key=lambda r: balde(r["app"] + "|" + r["entrada"], 10 ** 9))
    train = [sft(r) for r in finais if r["divisao"] == "treino"]
    val = [sft(r) for r in finais if r["divisao"] == "val"]
    (OUT / "train.json").write_text(json.dumps(train, ensure_ascii=False, indent=0), encoding="utf-8")
    (OUT / "val.json").write_text(json.dumps(val, ensure_ascii=False, indent=0), encoding="utf-8")
    for app, casos in holdouts.items():
        nome = "eleicoes" if app == "eleicoes2026" else app
        (OUT / f"holdout_{nome}.json").write_text(json.dumps({"app": app, "cases": casos}, ensure_ascii=False, indent=1), encoding="utf-8")

    cont = contagens(corpus, finais)
    cont["config"] = {"teto_intencao_quimica_pt": args.teto_intencao_quimica_pt, "val_pct_quimica": args.val_pct_quimica, "idiomas_estrangeiros": args.idiomas,
                      "escala_estrangeiros": args.escala, "escala_populares": args.escala_populares, "linha_idioma_quimica": bool(args.linha_idioma_quimica),
                      "seed": SEED, "jaccard_quase_igual": JACCARD_QUASE_IGUAL}
    cont["prompts"] = prompts
    cont["filtros"] = {k: (dict(sorted(v.items())) if isinstance(v, Counter) else v) for k, v in stats.items()}
    (OUT / "contagens.json").write_text(json.dumps(cont, ensure_ascii=False, indent=1), encoding="utf-8")
    return cont


def contagens(corpus, finais) -> dict:
    def arv(regs, chave_intent):
        out = {}
        for r in regs:
            a = out.setdefault(r["app"], {"total": 0, "por_idioma": {}, "por_origem": Counter(), "por_divisao": Counter()})
            a["total"] += 1
            a["por_origem"][r["origem"]] += 1
            a["por_divisao"][r["divisao"]] += 1
            i = a["por_idioma"].setdefault(r["idioma"], {"total": 0, "por_divisao": Counter(), "por_intencao": Counter()})
            i["total"] += 1
            i["por_divisao"][r["divisao"]] += 1
            i["por_intencao"][chave_intent(r)] += 1
        for a in out.values():
            a["por_origem"] = dict(sorted(a["por_origem"].items()))
            a["por_divisao"] = dict(sorted(a["por_divisao"].items()))
            for i in a["por_idioma"].values():
                i["por_divisao"] = dict(sorted(i["por_divisao"].items()))
                i["por_intencao"] = dict(sorted(i["por_intencao"].items()))
        return out

    por_app = arv(corpus, lambda r: json.loads(r["saida"])["intent"])
    tr = sum(1 for r in corpus if r["divisao"] == "treino")
    return {"total": len(corpus), "treino": tr, "val": sum(1 for r in corpus if r["divisao"] == "val"),
            "holdout": sum(1 for r in corpus if r["divisao"] == "holdout"),
            "proporcao_treino": {app: round(sum(1 for r in corpus if r["app"] == app and r["divisao"] == "treino") / max(tr, 1), 3) for app in por_app},
            "por_app": por_app}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--idiomas", default="en,es,de,fr", help="idiomas estrangeiros da química")
    ap.add_argument("--escala", type=float, default=1.0, help="escala das cotas do gerador multilíngue")
    ap.add_argument("--escala-populares", type=float, default=1.0, help="escala das cotas do gerador de compostos do dia a dia (5 idiomas; 0 desliga)")
    ap.add_argument("--teto-intencao-quimica-pt", type=int, default=2400, help="teto por intenção na química pt (0 = sem teto)")
    ap.add_argument("--val-pct-quimica", type=float, default=3.0, help="%% do lado de treino da química que vira val.json")
    ap.add_argument("--linha-idioma-quimica", action="store_true", help="acrescenta ao prompt da química a linha de idioma PROPOSTA (não está em produção)")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    cont = montar(a)
    resumo = {app: {"total": v["total"], "por_divisao": v["por_divisao"], "por_idioma": {i: x["total"] for i, x in v["por_idioma"].items()}}
              for app, v in cont["por_app"].items()}
    print(json.dumps({"total": cont["total"], "treino": cont["treino"], "val": cont["val"], "holdout": cont["holdout"],
                      "proporcao_treino": cont["proporcao_treino"], "por_app": resumo}, ensure_ascii=False, indent=1))
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
