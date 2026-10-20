# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — extras do NLU v3.9 (20/10/2026): os extras do v3.8 (extras_v38.py) com os três defeitos que o gate do v3.8 mostrou
corrigidos, mais contraexemplos para as regressões dele (ia/treino/README.md §v3.8). Mesmas regras: frases geradas por padrão, nunca a frase
do golden ou do holdout (o misturador ainda passa tudo pelo FiltroDeTeste e, desde o v3.9, pelo contrato da nuvem).

  Correções sobre o v3.8
    tabela_categoria     saída SEM a chave "categoria" (é do NLU local; o contrato da nuvem não a tem) -> {"intent": "TABELA_PERIODICA"}.
                         No v3.8, 176 pares com a chave derrubaram o JSON nativo no gate (96,8 % < 98 %).
    conceito_substancia  sem o sal de cozinha: o golden o trata como UM composto (NaCl, CID 5234), não como mistura. O v3.8 passou a responder
                         CONCEITO para "o que é o sal de cozinha?", "Was ist Kochsalz?" e "le sel est-il soluble dans l'eau ?".
  Famílias novas (contraexemplos)
    composto_sal         COMPOSTO / PROPRIEDADE solubilidade com o sal de cozinha nos 5 idiomas (composto = texto copiado da pergunta)
    composto_formula     fórmula digitada sozinha, em minúsculas ou não ("hcl", "NaOH", "h2so4") -> COMPOSTO (o v3.8 leu "hcl" como ELEMENTO H)
    seguranca_produto    SEGURANCA com produto de limpeza citado ("perigos da água sanitária", "misturar lejía con…") -> composto = o produto
                         (o v3.8 deixou de copiar o composto nesses casos)
    conversao_pressao    CONVERSAO_UNIDADE de pressão em frase de "quantos X há em N Y" ("Combien d'atmosphères dans 101325 Pa" virou GAS_IDEAL)
  As outras famílias do v3.8 (elemento_typo, balancear_igual, conceito_lei, composto_o_que_e, esteq_reage, uf_curta, mesario) seguem iguais.

Saída: ia/corpus/out/v39/extras_quimica.json e extras_eleicoes.json (formato do train.json do corpus) + extras.resumo.json.

Uso:  python -I ia/corpus/extras_v39.py --base ia/corpus/out/v35/train.json --out ia/corpus/out/v39 [--seed 39]
"""
import argparse
import importlib.util
import json
import random
import re
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("extras_v38", AQUI / "extras_v38.py")
V38 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(V38)

RAIZ = V38.RAIZ
MAX_Q = V38.MAX_Q
fold = V38.fold

SAL = {"pt-BR": ["o sal de cozinha", "o sal"], "en": ["table salt", "kitchen salt"], "es": ["la sal de mesa", "la sal común"],
       "de": ["Kochsalz", "Speisesalz", "Tafelsalz"], "fr": ["le sel de table", "le sel de cuisine"]}
SAL_TEXTO = {"pt-BR": ["sal de cozinha", "sal"], "en": ["table salt", "kitchen salt"], "es": ["sal de mesa", "sal común"],
             "de": ["Kochsalz", "Speisesalz", "Tafelsalz"], "fr": ["sel de table", "sel de cuisine"]}
FRASES_SAL = {
    "pt-BR": ["me fale sobre {s}", "{s} é um composto?", "qual a fórmula química de {t}?", "informações sobre {s}", "{t}", "{t}?"],
    "en": ["tell me about {s}", "is {s} a compound?", "what is the formula of {s}?", "info on {s}", "{t}", "{t}?"],
    "es": ["háblame de {s}", "¿{s} es un compuesto?", "¿cuál es la fórmula de {s}?", "información sobre {s}", "{t}"],
    "de": ["erzähl mir etwas über {s}", "Ist {s} eine Verbindung?", "Welche Formel hat {s}?", "Infos zu {s}", "{t}"],
    "fr": ["parle-moi du {t}", "le {t} est-il un composé ?", "quelle est la formule du {t} ?", "infos sur le {t}", "{t}"],
}
FRASES_SAL_SOLUBILIDADE = {
    "pt-BR": ["o {t} dissolve em água?", "solubilidade do {t} em água", "quanto {t} dissolve em 100 mL de água?"],
    "en": ["does {t} dissolve in water?", "solubility of {t} in water", "how soluble is {t}?"],
    "es": ["¿la {t} se disuelve en agua?", "solubilidad de la {t} en agua", "¿qué tan soluble es la {t}?"],
    "de": ["Löst sich {t} in Wasser?", "Löslichkeit von {t} in Wasser", "Wie gut löst sich {t}?"],
    "fr": ["le {t} se dissout-il dans l'eau ?", "solubilité du {t} dans l'eau", "le {t} est-il très soluble ?"],
}

FORMULAS = ["HCl", "NaCl", "NaOH", "H2SO4", "HNO3", "NH3", "CO2", "H2O2", "KOH", "CaCO3", "KCl", "CH4", "C2H5OH", "NaHCO3", "H3PO4",
            "Ca(OH)2", "KMnO4", "MgO", "SO2", "N2O", "HF", "HBr", "CuSO4", "AgNO3", "Fe2O3", "Al2O3", "NaClO", "C6H12O6", "CH3COOH", "H2CO3"]
FRASES_FORMULA = {"pt-BR": ["{f}", "{f}?", "o que é {f}", "fale do {f}"], "en": ["{f}", "{f}?", "what is {f}"], "es": ["{f}", "¿qué es {f}?"],
                  "de": ["{f}", "was ist {f}"], "fr": ["{f}", "c'est quoi {f} ?"]}

PRODUTOS = {"pt-BR": ["água sanitária", "cloro de piscina", "soda cáustica", "amoníaco"], "en": ["bleach", "drain cleaner", "ammonia"],
            "es": ["lejía", "sosa cáustica", "amoníaco"], "de": ["Chlorbleiche", "Abflussreiniger", "Ammoniak"],
            "fr": ["eau de Javel", "soude caustique", "ammoniaque"]}
FRASES_PRODUTO = {
    "pt-BR": ["quais os perigos de {p}?", "{p} é perigoso?", "posso misturar {p} com detergente?", "o que acontece se misturar {p} com vinagre?",
              "cuidados ao usar {p}"],
    "en": ["what are the hazards of {p}?", "is {p} dangerous?", "can I mix {p} with vinegar?", "safety tips for {p}"],
    "es": ["¿qué peligros tiene {p}?", "{p}: ¿es peligroso?", "¿puedo mezclar {p} con vinagre?", "precauciones con {p}"],
    "de": ["Welche Gefahren hat {p}?", "Ist {p} gefährlich?", "Darf man {p} mit Essig mischen?", "Sicherheitshinweise für {p}"],
    "fr": ["{p} : quels dangers ?", "est-ce que {p} est dangereux ?", "peut-on mélanger {p} et vinaigre ?", "précautions avec {p}"],
}

PRESSAO = [("atm", "Pa"), ("Pa", "atm"), ("kPa", "atm"), ("atm", "mmHg"), ("mmHg", "atm"), ("bar", "kPa"), ("bar", "atm"), ("torr", "Pa")]
NOMES_UNIDADE = {"pt-BR": {"atm": "atmosferas", "Pa": "pascals", "kPa": "quilopascals", "mmHg": "mmHg", "bar": "bar", "torr": "torr"},
                 "en": {"atm": "atmospheres", "Pa": "pascals", "kPa": "kilopascals", "mmHg": "mmHg", "bar": "bar", "torr": "torr"},
                 "es": {"atm": "atmósferas", "Pa": "pascales", "kPa": "kilopascales", "mmHg": "mmHg", "bar": "bar", "torr": "torr"},
                 "de": {"atm": "Atmosphären", "Pa": "Pascal", "kPa": "Kilopascal", "mmHg": "mmHg", "bar": "bar", "torr": "Torr"},
                 "fr": {"atm": "atmosphères", "Pa": "pascals", "kPa": "kilopascals", "mmHg": "mmHg", "bar": "bar", "torr": "torr"}}
FRASES_PRESSAO = {
    "pt-BR": ["quantas {d} há em {n} {o}?", "{n} {o} equivalem a quantas {d}?", "converta {n} {o} para {d}"],
    "en": ["how many {d} are in {n} {o}?", "{n} {o} is how many {d}?", "convert {n} {o} to {d}"],
    "es": ["¿cuántas {d} hay en {n} {o}?", "{n} {o} son cuántas {d}", "convierte {n} {o} a {d}"],
    "de": ["Wie viele {d} sind {n} {o}?", "{n} {o} in {d} umrechnen", "rechne {n} {o} in {d} um"],
    "fr": ["combien de {d} y a-t-il dans {n} {o} ?", "{n} {o} font combien de {d} ?", "convertis {n} {o} en {d}"],
}
VALORES_PRESSAO = {"atm": (1, 2, 0.5, 3), "Pa": (50000, 202650, 98000), "kPa": (100, 250, 50), "mmHg": (760, 380, 1520), "bar": (1, 2, 5), "torr": (760, 100)}

SUBSTANCIAS_SEM_SAL = {idi: [s for s in lista if fold(s) not in {fold(x) for x in SAL.get(idi, [])} and "salt" not in s and "sal " not in s + " "
                             and "sel " not in s + " " and "Kochsalz" not in s]
                       for idi, lista in V38.SUBSTANCIAS.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--base", default=str(RAIZ / "ia" / "corpus" / "out" / "v35" / "train.json"))
    ap.add_argument("--out", default=str(RAIZ / "ia" / "corpus" / "out" / "v39"))
    ap.add_argument("--seed", type=int, default=39)
    ap.add_argument("--compostos", type=int, default=420)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    instr = V38.instrucoes(Path(a.base))
    qui, ele = [], []
    stats = Counter()

    def add(lista, app, idioma, q, saida: dict, familia):
        q = re.sub(r"\s+", " ", q).strip()
        if not q or len(q) > MAX_Q:
            return
        lista.append({"instruction": instr[app], "input": q, "output": json.dumps(saida, ensure_ascii=False), "app": app, "idioma": idioma,
                      "intent": saida["intent"], "familia": familia})
        stats[f"{app}/{familia}/{idioma}"] += 1

    # --- química: elementos com erro de digitação (igual ao v3.8)
    for simbolo, nomes in V38.elementos():
        for idi, nome in nomes.items():
            if idi not in V38.FRASES_ELEMENTO or rng.random() > 0.55:
                continue
            errado = V38.typo(nome.lower(), rng)
            if errado:
                add(qui, "quimica", idi, rng.choice(V38.FRASES_ELEMENTO[idi]).format(n=errado), {"intent": "ELEMENTO", "elemento": simbolo}, "elemento_typo")

    # --- química: classes e misturas -> CONCEITO (SEM o sal de cozinha)
    for idi, lista in SUBSTANCIAS_SEM_SAL.items():
        for s in lista:
            for frase in rng.sample(V38.FRASES_SUBSTANCIA[idi], 2):
                q = frase.format(s=s)
                add(qui, "quimica", idi, q[0].upper() + q[1:] if rng.random() < 0.5 else q, {"intent": "CONCEITO"}, "conceito_substancia")

    # --- química: o sal de cozinha é UM composto (NaCl)
    for idi in SAL:
        for frase in FRASES_SAL[idi]:
            for s, t in zip(SAL[idi], SAL_TEXTO[idi]):
                add(qui, "quimica", idi, frase.format(s=s, t=t), {"intent": "COMPOSTO", "composto": t}, "composto_sal")
        for frase in FRASES_SAL_SOLUBILIDADE[idi]:
            for t in SAL_TEXTO[idi]:
                add(qui, "quimica", idi, frase.format(t=t), {"intent": "PROPRIEDADE", "composto": t, "propriedade": "solubilidade"}, "composto_sal")

    # --- química: fórmula digitada sozinha -> COMPOSTO
    for f in FORMULAS:
        for idi, frases in FRASES_FORMULA.items():
            if idi != "pt-BR" and rng.random() > 0.5:
                continue
            texto = f.lower() if rng.random() < 0.5 else f
            add(qui, "quimica", idi, rng.choice(frases).format(f=texto), {"intent": "COMPOSTO", "composto": texto}, "composto_formula")

    # --- química: segurança com produto citado -> SEGURANCA + composto
    for idi, produtos in PRODUTOS.items():
        for p in produtos:
            for frase in rng.sample(FRASES_PRODUTO[idi], 3):
                add(qui, "quimica", idi, frase.format(p=p), {"intent": "SEGURANCA", "composto": p}, "seguranca_produto")

    # --- química: conversão de pressão ("quantos X há em N Y") -> CONVERSAO_UNIDADE
    for origem, destino in PRESSAO:
        for idi, frases in FRASES_PRESSAO.items():
            n = rng.choice(VALORES_PRESSAO[origem])
            nomes = NOMES_UNIDADE[idi]
            q = rng.choice(frases).format(n=str(n).replace(".", ",") if idi in ("pt-BR", "es", "de", "fr") else n, o=origem, d=nomes[destino])
            add(qui, "quimica", idi, q, {"intent": "CONVERSAO_UNIDADE", "quantidades": [{"valor": n, "unidade": origem}], "unidadeDestino": destino},
                "conversao_pressao")

    # --- química: combustão com "=" (igual ao v3.8)
    col = {"pt-BR": 0, "en": 1, "es": 2, "de": 3, "fr": 4}
    for comb in V38.COMBUSTIVEIS:
        formula = comb[5]
        produtos = "CO2 + H2O" if "C" in formula else "H2O"
        for idi, i in col.items():
            for frase in rng.sample(V38.PREFIXO_COMBUSTAO[idi], 3):
                add(qui, "quimica", idi, frase.format(n=comb[i], eq=f"{formula} + O2 = {produtos}"),
                    {"intent": "BALANCEAR", "equacao": f"{formula} + O2 -> {produtos}"}, "balancear_igual")

    # --- química: categoria curta -> TABELA_PERIODICA, SEM a chave "categoria"
    for _, por_idioma in V38.CATEGORIAS.items():
        for idi, nomes in por_idioma.items():
            for nome in nomes:
                for frase in rng.sample(V38.FRASES_CATEGORIA[idi], 3):
                    add(qui, "quimica", idi, frase.format(c=nome), {"intent": "TABELA_PERIODICA"}, "tabela_categoria")

    # --- química: leis com nome -> CONCEITO (igual ao v3.8)
    for idi, leis in V38.LEIS.items():
        for lei in leis:
            for frase in rng.sample(V38.FRASES_LEI[idi], 2):
                add(qui, "quimica", idi, frase.format(l=lei), {"intent": "CONCEITO"}, "conceito_lei")

    # --- química: "o que é a X" com nome do pacote -> COMPOSTO (igual ao v3.8)
    simbolos_fold = {fold(n) for _, nomes in V38.elementos() for n in nomes.values()}
    todos = sorted((c for c in V38.compostos() if fold(c[0]) not in simbolos_fold), key=lambda c: c[0])
    rng.shuffle(todos)
    for _, nomes in todos[:a.compostos]:
        for idi, n in nomes.items():
            if idi != "pt-BR" and rng.random() > 0.35:
                continue
            texto = n if idi != "pt-BR" else (n.lower() if rng.random() < 0.6 else n)
            add(qui, "quimica", idi, rng.choice(V38.FRASES_COMPOSTO[idi]).format(c=texto), {"intent": "COMPOSTO", "composto": texto}, "composto_o_que_e")

    # --- química: "quanto A reage com N g de B" -> elemento = A (igual ao v3.8)
    nome_el = {s: n for s, n in V38.elementos()}
    for idi, frases in V38.FRASES_ESTEQ.items():
        for a_, b_ in V38.PARES_ESTEQ:
            na, nb = nome_el.get(a_, {}).get(idi), nome_el.get(b_, {}).get(idi)
            if na and nb:
                n = rng.choice((5, 10, 12, 20, 25, 40, 50, 100))
                add(qui, "quimica", idi, rng.choice(frases).format(a=na.lower(), b=nb.lower(), n=n),
                    {"intent": "ESTEQUIOMETRIA", "elemento": a_, "quantidades": [{"valor": n, "unidade": "g"}]}, "esteq_reage")

    # --- eleições: UF curta e mesário (iguais ao v3.8)
    for uf, estado in V38.UFS.items():
        for frase in rng.sample(V38.FRASES_UF, 9):
            add(ele, "eleicoes2026", "pt-BR", frase.format(UF=uf, uf=uf.lower(), Estado=estado, estado=fold(estado)),
                {"intent": "LISTAR_CANDIDATOS", "uf": uf}, "uf_curta")
    for q in V38.MESARIO:
        add(ele, "eleicoes2026", "pt-BR", q, {"intent": "REGRAS_URNA"}, "mesario")

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for nome, lista in (("extras_quimica.json", qui), ("extras_eleicoes.json", ele)):
        vistos, dedup = set(), []
        for r in lista:
            k = fold(r["input"])
            if k not in vistos:
                vistos.add(k)
                dedup.append(r)
        (out / nome).write_text(json.dumps(dedup, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"{nome}: {len(dedup)} exemplos")
    por_familia = Counter(k.rsplit("/", 1)[0] for k in stats.elements())
    (out / "extras.resumo.json").write_text(json.dumps({"por_familia": dict(sorted(por_familia.items())), "por_familia_idioma": dict(sorted(stats.items())),
                                                        "seed": a.seed}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(dict(sorted(por_familia.items())), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
