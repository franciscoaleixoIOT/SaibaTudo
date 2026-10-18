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
  v3.4: --out ia/corpus/out/v34 --escala-v34 0.69 --escala-v35 0
  v3.5: ver ia/corpus/README.md (seção v3.5)
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


def v34():
    """Geradores do NLU v3.4 (multi-turno com contexto, comparação ancorada, conceitos pt)."""
    global _V34
    if _V34 is None:
        spec = importlib.util.spec_from_file_location("quimica_v34", AQUI / "quimica_v34.py")
        _V34 = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_V34)
    return _V34


_V34 = None
_V35 = None
ENTIDADES_MT = ("elemento", "composto", "propriedade", "quantidades", "unidadeDestino")
ISENTAS_DO_TETO = frozenset({"RECUSA_PERIGO"})  # recusas de segurança nunca são cortadas pelo teto por intenção


def v35():
    """Geradores do NLU v3.5 (calculadoras NOX/ENTALPIA/EQUILIBRIO/LIGACAO + entalpiaFormacaoKJmol e famílias de superfície)."""
    global _V35
    if _V35 is None:
        spec = importlib.util.spec_from_file_location("quimica_v35", AQUI / "quimica_v35.py")
        _V35 = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_V35)
    return _V35


def carregar_v35(bq, gv, stats, idiomas, escala) -> tuple:
    """Pares do v3.5, validados aqui com as regras do construtor do app (pergunta por validate_question, pergunta repetida, filtro dos
    contratos, forma + combinacao_valida do contrato, composto/equação copiados do texto normalizado) e a evidência das quantidades:
    build_nlu_dataset.evidencia_basica, ou quimica_v35.evidencia_v35 nas famílias de notação científica e números por extenso (a do app
    não lê "meio mol", "1/2", "½" nem "1,5·10⁻³"). Devolve (treino, {família: casos de holdout})."""
    treino, holdouts = [], {f: [] for f in gv.FAMILIAS}
    if escala <= 0:
        return treino, holdouts
    dc, core = bq.dc, bq.nlu
    filtro = dc.FiltroDeContrato(dc.perguntas_dos_contratos(QUIMICA / "contracts"))
    ds = gv._dataset()
    pac = ds[1].localizar(None)
    if pac.eh_fixture:
        raise SystemExit("pacote data/quimica ausente: o gerador v3.5 caiu na fixture de teste")
    for idioma in ["pt-BR"] + list(idiomas):
        for fam in gv.FAMILIAS:
            regs, st = gv.gerar_familia(pac, idioma, fam, SEED, escala, ds)
            cont, vistos = Counter(), set()
            for r in regs:
                try:
                    q = core.validate_question(r["q"])
                except ValueError:
                    cont["pergunta_invalida"] += 1
                    continue
                chave = bq.ask_core.normalizar_pergunta(q)
                if chave in vistos:
                    cont["pergunta_repetida"] += 1
                    continue
                vistos.add(chave)
                if filtro.veredito(q):
                    cont["contrato_removido"] += 1
                    continue
                plano = bq.alvo_normalizado(r["alvo"])
                for k in ("composto", "equacao"):  # a pergunta foi normalizada (subscritos, setas): o rótulo copia o texto normalizado
                    if k in plano and plano[k] not in q and core.normalize_question(plano[k]) in q:
                        plano[k] = core.normalize_question(plano[k])
                if not core.has_valid_shape(plano) or not core.combinacao_valida(plano):
                    cont["alvo_invalido"] += 1
                    continue
                if any(k in plano and plano[k] not in q for k in ("composto", "equacao")):
                    cont["entidade_fora_do_texto"] += 1
                    continue
                sem = gv.evidencia_v35(q, plano, idioma, bq) if r.get("_ev") == "v35" else bq.evidencia_basica(q, plano)
                if sem:
                    cont[f"sem_evidencia_{sem}"] += 1
                    continue
                if r["_lado"] == "holdout":
                    holdouts[fam].append({"q": q, "intent": plano["intent"], **{k: plano[k] for k in core.KEYS if k != "intent" and k in plano},
                                          "idioma": idioma, "familia": fam})
                    cont["holdout"] += 1
                else:
                    treino.append({"app": "quimica", "idioma": idioma, "entrada": q, "saida": core.format_output(plano), "intent": plano["intent"],
                                   "fonte": gv.FONTE, "licenca": gv.LICENCA, "origem": "template", "divisao": "treino", "familia": fam})
                    cont["treino"] += 1
            stats["quimica_build"][f"v35-{fam}/{idioma}"] = {**dict(cont), "gerador": {k: v for k, v in st.items() if k != "por_intencao"}}
    return treino, holdouts


def carregar_v34(bq, gv, stats, idiomas, escala, completas_por_idioma) -> tuple:
    """Pares do v3.4. comparar/conceito passam pelo construtor do app; o multi-turno (duas linhas: contexto + pergunta) é validado aqui com as
    mesmas regras (pergunta limpa por validate_question, filtro do contrato só na pergunta, forma e combinação por intenção do contrato,
    evidência das quantidades/equação no texto inteiro, composto do alvo presente no texto). Devolve (treino, {nome: casos de holdout})."""
    treino, holdouts = [], {"multiturno": [], "comparar": [], "conceito": []}
    if escala <= 0:
        return treino, holdouts
    dc, core = bq.dc, bq.nlu
    filtro = dc.FiltroDeContrato(dc.perguntas_dos_contratos(QUIMICA / "contracts"))
    ds = gv._dataset()
    pac = ds[1].localizar(None)
    if pac.eh_fixture:
        raise SystemExit("pacote data/quimica ausente: o gerador v3.4 caiu na fixture de teste")
    ctxmod = gv.ctxmod

    def add(regs, nome, idioma, rotulo):
        tr, _ho, casos, desc, st = bq.construir(regs, filtro)
        stats["quimica_build"][f"v34-{nome}/{idioma}"] = {**{k: v for k, v in st.items() if not k.startswith("intent_")}, "descartados": len(desc), "gerador": rotulo}
        for ex in tr:
            treino.append({"app": "quimica", "idioma": idioma, "entrada": ex["input"], "saida": ex["output"], "intent": ex["intent"],
                           "fonte": gv.FONTE, "licenca": gv.LICENCA, "origem": "template", "divisao": "treino"})
        holdouts[nome] += [{**c, "idioma": idioma} for c in casos]

    for idioma in ["pt-BR"] + list(idiomas):
        regs, st = gv.gerar_comparar(pac, idioma, SEED, escala, ds)
        add(regs, "comparar", idioma, st)
    regs, st = gv.gerar_conceito(pac, SEED, escala, ds)
    add(regs, "conceito", "pt-BR", st)

    for idioma in ["pt-BR"] + list(idiomas):
        regs, st = gv.gerar_multiturno(pac, idioma, SEED, escala, core, completas_por_idioma.get(idioma) or [], ds)
        cont = Counter()
        for r in regs:
            try:
                q = core.validate_question(r["q"])
            except ValueError:
                cont["pergunta_invalida"] += 1
                continue
            if filtro.veredito(q):
                cont["contrato_removido"] += 1
                continue
            plano = bq.alvo_normalizado(r["alvo"])
            entrada = ctxmod.montar_entrada(r["contexto"], q)
            if not core.has_valid_shape(plano) or not core.combinacao_valida(plano):
                cont["alvo_invalido"] += 1
                continue
            if bq.evidencia_basica(entrada, plano) or ("composto" in plano and plano["composto"] not in entrada):
                cont["sem_evidencia"] += 1
                continue
            saida = core.format_output(plano)
            if r["_lado"] == "holdout":
                caso = {"q": entrada, "intent": plano["intent"], **{k: plano.get(k) for k in ENTIDADES_MT}, "idioma": idioma, "cenario": r["cenario"]}
                holdouts["multiturno"].append(caso)
                cont["holdout"] += 1
            else:
                treino.append({"app": "quimica", "idioma": idioma, "entrada": entrada, "saida": saida, "intent": plano["intent"],
                               "fonte": gv.FONTE, "licenca": gv.LICENCA, "origem": "template", "divisao": "treino"})
                cont["treino"] += 1
        stats["quimica_build"][f"v34-multiturno/{idioma}"] = {**dict(cont), "gerador": st}
    return treino, holdouts


COM_PROPRIEDADE = frozenset({"PROPRIEDADE", "COMPARAR"})  # intenções cujo corte respeita um piso por id de propriedade


def _propriedade_de(r):
    try:
        return json.loads(r["saida"]).get("propriedade")
    except (ValueError, TypeError, KeyError):
        return None


def limitar_por_intencao(regs, teto: int, stats, rotulo: str, isentas=ISENTAS_DO_TETO, piso_propriedade: int = 0):
    """Teto de exemplos por intenção (escolha estável por hash da pergunta), para um app/idioma não enviesar o modelo. As `isentas` (recusas)
    nunca são cortadas. Em PROPRIEDADE e COMPARAR, `piso_propriedade` > 0 garante pelo menos esse número de exemplos de cada id de propriedade
    (ou todos os que houver) antes de completar o teto por hash: sem isso o teto de 850 do v3.5 deixava `ligacoesRotaveis`, `doadoresH`,
    `carga`, `bloco` com 5–14 exemplos em pt (18/10/2026). O piso pode passar do teto se houver muitas propriedades."""
    if not teto:
        return regs
    por = defaultdict(list)
    for r in regs:
        por[r["intent"]].append(r)
    saida = []
    for it, lst in por.items():
        if len(lst) > teto and it not in isentas:
            ordem = sorted(lst, key=lambda r: balde(r["entrada"], 10 ** 9))
            if piso_propriedade and it in COM_PROPRIEDADE:
                grupos = defaultdict(list)
                for r in ordem:
                    grupos[_propriedade_de(r)].append(r)
                base = [r for g in grupos.values() for r in g[:piso_propriedade]]
                ids_base = {id(r) for r in base}
                resto = [r for r in ordem if id(r) not in ids_base]
                lst = base + resto[:max(0, teto - len(base))]
                no_piso = sum(1 for g in grupos.values() if len(g) > piso_propriedade)
                stats["limite_por_intencao"].setdefault(rotulo, {})[it] = {"antes": len(por[it]), "depois": len(lst), "piso_propriedade": piso_propriedade,
                                                                           "propriedades": len(grupos), "propriedades_acima_do_piso": no_piso}
            else:
                lst = ordem[:teto]
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
    global OUT
    if getattr(args, "out", None):
        OUT = Path(args.out)
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
    pt = limitar_por_intencao(pt, args.teto_intencao_quimica_pt, stats, "quimica/pt-BR", piso_propriedade=getattr(args, "piso_propriedade_pt", 0))
    teto_est = getattr(args, "teto_intencao_quimica_estrangeiros", 0)
    if teto_est:  # por idioma, só no gerador multilíngue base (os populares e os v3.4/v3.5 ficam inteiros)
        resto = [r for i in idiomas for r in limitar_por_intencao([x for x in resto if x["idioma"] == i], teto_est, stats, f"quimica/{i}",
                                                                   piso_propriedade=getattr(args, "piso_propriedade_estrangeiros", 0))]
    p_tr, p_hold = carregar_populares(bq, populares(), stats, idiomas, args.escala_populares)  # fora do teto: correção do gate do v3
    q_hold += p_hold
    completas = defaultdict(list)  # perguntas completas (sem contexto) do treino da química, para o multi-turno "contexto ignorado"
    for r in sorted(pt + resto + p_tr, key=lambda r: balde("mt|" + r["entrada"], 10 ** 9)):
        if len(completas[r["idioma"]]) < 4000:
            completas[r["idioma"]].append((r["entrada"], r["saida"]))
    v_tr, v_hold = carregar_v34(bq, v34(), stats, idiomas, getattr(args, "escala_v34", 1.0), completas)
    w_tr, w_hold = carregar_v35(bq, v35(), stats, idiomas, getattr(args, "escala_v35", 1.0))
    q_tr, q_va = separar_val(pt + resto + p_tr + v_tr + w_tr, args.val_pct_quimica)

    # filtro de teste (todos os apps), validade do rótulo, duplicatas e conflitos
    filtro = FiltroDeTeste(perguntas_de(TESTES_ELEICOES + TESTES_QUIMICA) + [c["q"] for c in e_hold])
    # holdout da química: cada gerador já separa por entidade, mas dois geradores podem produzir a MESMA pergunta (um no treino, outro no
    # holdout); o texto exato do holdout nunca treina (só exato: a quase-igualdade removeria metade dos moldes)
    holdout_quimica_exato = ({chave_texto(c["q"]) for c in q_hold} | {chave_texto(c["q"]) for cs in v_hold.values() for c in cs}
                             | {chave_texto(c["q"]) for cs in w_hold.values() for c in cs})
    validos = {"eleicoes2026": lambda s: rotulo_valido_eleicoes(ecore, s), "quimica": lambda s: rotulo_valido_quimica(qcore, s)}
    vistos, finais = {}, []
    for r in e_tr + e_va + q_tr + q_va:
        v = filtro.veredito(r["entrada"])
        if not v and r["app"] == "quimica" and chave_texto(r["entrada"]) in holdout_quimica_exato:
            v = "holdout_exato"
        if v:
            stats["removidos_por_teste"][f"{r['app']}/{r['idioma']}/{v}"] += 1
            continue
        if r["app"] == "quimica" and '"equacao"' in r["saida"]:
            # desde 14/10 a pergunta passa por normalize_question no construtor ("=>"/"-->" viram "→"); o rótulo copia a equação como ela
            # está na pergunta normalizada (antes ficava com a seta original e o teste de cópia falhava)
            obj = qcore.parse_model_output(r["saida"])
            eq = qcore.normalize_question(obj.get("equacao") or "")
            if obj.get("equacao") and obj["equacao"] not in r["entrada"] and eq in r["entrada"]:
                obj["equacao"] = eq
                r["saida"] = qcore.format_output(obj)
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
    for nome, casos in v_hold.items():
        for c in casos:
            alvo = {k: v for k, v in c.items() if k in qcore.KEYS and v not in (None, "", [])}
            corpus.append({"app": "quimica", "idioma": c["idioma"], "tarefa": "nlu", "entrada": c["q"], "saida": qcore.format_output(alvo),
                           "fonte": v34().FONTE, "licenca": LICENCA_QUIMICA, "origem": "holdout", "divisao": "holdout"})
    for nome, casos in w_hold.items():
        for c in casos:
            alvo = {k: v for k, v in c.items() if k in qcore.KEYS and v not in (None, "", [])}
            corpus.append({"app": "quimica", "idioma": c["idioma"], "tarefa": "nlu", "entrada": c["q"], "saida": qcore.format_output(alvo),
                           "fonte": v35().FONTE, "licenca": LICENCA_QUIMICA, "origem": "holdout", "divisao": "holdout"})
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

    for nome, casos in v_hold.items():
        (OUT / f"holdout_v34_{nome}.json").write_text(json.dumps({"app": "quimica", "conjunto": f"v34-{nome}", "cases": casos}, ensure_ascii=False, indent=1),
                                                      encoding="utf-8")
    for nome, casos in w_hold.items():
        (OUT / f"holdout_v35_{nome}.json").write_text(json.dumps({"app": "quimica", "conjunto": f"v35-{nome}", "cases": casos}, ensure_ascii=False, indent=1),
                                                      encoding="utf-8")
    cont = contagens(corpus, finais)
    cont["holdouts_v34"] = {nome: {"total": len(cs), "por_idioma": dict(sorted(Counter(c["idioma"] for c in cs).items())),
                                   "por_intencao": dict(sorted(Counter(c["intent"] for c in cs).items()))} for nome, cs in v_hold.items()}
    cont["treino_v34"] = dict(sorted(Counter(f"{r['idioma']}/{r['intent']}" for r in finais if r["fonte"] == v34().FONTE and r["divisao"] == "treino").items()))
    cont["holdouts_v35"] = {nome: {"total": len(cs), "por_idioma": dict(sorted(Counter(c["idioma"] for c in cs).items())),
                                   "por_intencao": dict(sorted(Counter(c["intent"] for c in cs).items()))} for nome, cs in w_hold.items()}
    w_fin = [r for r in finais if r["fonte"] == v35().FONTE and r["divisao"] == "treino"]
    cont["treino_v35"] = {"total": len(w_fin), "por_familia_idioma": dict(sorted(Counter(f"{r['familia']}/{r['idioma']}" for r in w_fin).items())),
                          "por_intencao_idioma": dict(sorted(Counter(f"{r['idioma']}/{r['intent']}" for r in w_fin).items()))}
    novas = ("NOX", "ENTALPIA", "EQUILIBRIO", "LIGACAO")
    cont["intencoes_novas_treino"] = {it: dict(sorted(Counter(r["idioma"] for r in finais if r["app"] == "quimica" and r["divisao"] == "treino"
                                                              and r["intent"] == it).items())) for it in novas}
    cont["config"] = {"teto_intencao_quimica_pt": args.teto_intencao_quimica_pt, "val_pct_quimica": args.val_pct_quimica, "idiomas_estrangeiros": args.idiomas,
                      "escala_estrangeiros": args.escala, "escala_populares": args.escala_populares, "escala_v34": getattr(args, "escala_v34", 1.0), "escala_v35": getattr(args, "escala_v35", 1.0),
                      "teto_intencao_quimica_estrangeiros": getattr(args, "teto_intencao_quimica_estrangeiros", 0), "linha_idioma_quimica": bool(args.linha_idioma_quimica),
                      "piso_propriedade_pt": getattr(args, "piso_propriedade_pt", 0), "piso_propriedade_estrangeiros": getattr(args, "piso_propriedade_estrangeiros", 0),
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
    ap.add_argument("--escala-v34", type=float, default=1.0, help="escala dos geradores do v3.4 (multi-turno, comparação, conceitos; 0 desliga = corpus do v3.3)")
    ap.add_argument("--escala-v35", type=float, default=1.0, help="escala dos geradores do v3.5 (calculadoras e famílias de superfície; 0 desliga = corpus do v3.4)")
    ap.add_argument("--teto-intencao-quimica-estrangeiros", type=int, default=0,
                    help="teto por intenção e idioma no gerador multilíngue base da química (0 = sem teto; recusas isentas)")
    ap.add_argument("--piso-propriedade-pt", type=int, default=0,
                    help="dentro do teto pt de PROPRIEDADE/COMPARAR, mínimo de exemplos por id de propriedade (0 = só o hash)")
    ap.add_argument("--piso-propriedade-estrangeiros", type=int, default=0,
                    help="idem por idioma estrangeiro no gerador multilíngue base")
    ap.add_argument("--out", help="pasta de saída (padrão ia/corpus/out)")
    ap.add_argument("--linha-idioma-quimica", action="store_true", help="acrescenta ao prompt da química a linha de idioma PROPOSTA (não está em produção)")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    cont = montar(a)
    resumo = {app: {"total": v["total"], "por_divisao": v["por_divisao"], "por_idioma": {i: x["total"] for i, x in v["por_idioma"].items()}}
              for app, v in cont["por_app"].items()}
    print(json.dumps({"total": cont["total"], "treino": cont["treino"], "val": cont["val"], "holdout": cont["holdout"],
                      "proporcao_treino": cont["proporcao_treino"], "por_app": resumo}, ensure_ascii=False, indent=1))
    print(f"-> {OUT}")
    print(json.dumps(cont.get("holdouts_v34"), ensure_ascii=False))
    print(json.dumps({k: v["total"] for k, v in (cont.get("holdouts_v35") or {}).items()}, ensure_ascii=False))
    print(json.dumps(cont.get("intencoes_novas_treino"), ensure_ascii=False))


if __name__ == "__main__":
    main()
