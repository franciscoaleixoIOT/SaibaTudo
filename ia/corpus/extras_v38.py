# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — extras do NLU v3.8 (20/10/2026): exemplos NOVOS para as classes de erro observadas no gate do v3.7 (ia/treino/README.md §v3.7),
gerados por padrão (templates) com entidades do pacote assinado — nunca a frase do golden ou do holdout (o misturador ainda passa tudo pelo
FiltroDeTeste). Famílias:

  química (foco)
    elemento_typo        ELEMENTO: nome do elemento com UM erro de digitação (letra dobrada, letra a menos, troca de vizinhas), nos 5 idiomas,
                         sozinho ou em frase curta ("hierrro" era o caso do golden) -> {"intent": "ELEMENTO", "elemento": "Fe"}
    conceito_substancia  CONCEITO: "¿qué es el azúcar?" e afins — classes e misturas do dia a dia (açúcar, sal de cozinha, aço, bronze, ar,
                         gasolina, vidro, plástico, sabão...) que não são UM composto do pacote -> {"intent": "CONCEITO"}
    balancear_igual      BALANCEAR com "=" como seta e prefixo "combustão de X:" ("combustión del metano: CH4 + O2 = CO2 + H2O") -> equação com "->"
    tabela_categoria     TABELA_PERIODICA só com o nome da categoria ("Edelgase", "gases nobles", "halogênios") -> {"categoria": id}
    conceito_lei         CONCEITO: leis e princípios com nome ("Was ist das ideale Gasgesetz?", "lei de Hess", "princípio de Le Chatelier")
    composto_o_que_e     COMPOSTO: "o que é a formamida", "litargírio" — nome do pacote sozinho ou em "o que é / me fale sobre", 5 idiomas
    esteq_reage          ESTEQUIOMETRIA: "quanto oxigênio reage com 10 g de magnésio?" -> elemento = o PEDIDO (o primeiro), quantidades do texto
  eleições (secundário, entram inteiros)
    uf_curta             LISTAR_CANDIDATOS só com a UF ("RS??", "PI?", "mostra piaui", "e Ceará?") -> {"uf": "RS"}
    mesario              REGRAS_URNA: "como ser mesário?", "quero ser mesária", "fui convocado para mesário"

Saída: ia/corpus/out/v38/extras_quimica.json e extras_eleicoes.json, no formato do train.json do corpus
({instruction, input, output, app, idioma, intent, familia}); o `instruction` é copiado do corpus base (prompt de produção de cada app).

Uso:  python -I ia/corpus/extras_v38.py --base ia/corpus/out/v35/train.json --out ia/corpus/out/v38 [--seed 38]
"""
import argparse
import glob
import json
import random
import re
import unicodedata
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
QUIMICA = RAIZ / "apps" / "quimica"
IDIOMAS = ("pt-BR", "en", "es", "de", "fr")
MAX_Q = 300


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


def instrucoes(base: Path) -> dict:
    regs = json.loads(base.read_text(encoding="utf-8"))
    out = {}
    for r in regs:
        out.setdefault(r["app"], r["instruction"])
        if len(out) == 2:
            break
    if {"quimica", "eleicoes2026"} - set(out):
        raise SystemExit("corpus base sem os dois apps")
    return out


def elementos() -> list:
    """[(simbolo, {idioma: nome})] a partir do pacote assinado."""
    dados = json.loads((QUIMICA / "data" / "quimica" / "elementos.json").read_text(encoding="utf-8"))
    lista = dados if isinstance(dados, list) else dados.get("elementos") or list(dados.values())
    out = []
    for e in lista:
        if not isinstance(e, dict) or not e.get("simbolo"):
            continue
        nomes = {}
        n = e.get("nomes") or {}
        for idi in IDIOMAS:
            v = n.get(idi) if isinstance(n, dict) else None
            if not v and idi == "pt-BR":
                v = e.get("nome")
            if isinstance(v, str) and v.strip():
                nomes[idi] = v.strip()
        if nomes:
            out.append((e["simbolo"], nomes))
    if len(out) < 100:
        raise SystemExit(f"elementos.json com poucos nomes: {len(out)}")
    return out


def compostos() -> list:
    """[(nome pt, {idioma: nome})] dos compostos do pacote (lotes)."""
    out = []
    for arq in sorted(glob.glob(str(QUIMICA / "data" / "quimica" / "compostos" / "lote-*.json"))):
        lote = json.loads(Path(arq).read_text(encoding="utf-8"))
        for c in (lote if isinstance(lote, list) else lote.values()):
            nome = (c.get("nome") or "").strip()
            if not nome or len(nome) > 40 or re.search(r"\d|[()\[\],]", nome):
                continue
            nomes = {"pt-BR": nome}
            for idi, v in (c.get("nomes") or {}).items():
                if idi in IDIOMAS and isinstance(v, str) and 3 <= len(v.strip()) <= 40 and not re.search(r"\d|[()\[\],]", v):
                    nomes[idi] = v.strip()
            out.append((nome, nomes))
    if len(out) < 500:
        raise SystemExit(f"poucos compostos lidos: {len(out)}")
    return out


def typo(palavra: str, rng: random.Random) -> str | None:
    """Um erro de digitação plausível; None se a palavra é curta demais."""
    letras = [c for c in palavra]
    if len(letras) < 5:
        return None
    pos = [i for i, c in enumerate(letras) if c.isalpha()]
    if len(pos) < 4:
        return None
    modo = rng.choice(("dobrar", "dobrar", "cair", "trocar"))
    i = rng.choice(pos[1:-1])
    if modo == "dobrar":
        letras.insert(i, letras[i])
    elif modo == "cair":
        del letras[i]
    else:
        j = i + 1 if i + 1 in pos else i - 1
        letras[i], letras[j] = letras[j], letras[i]
    novo = "".join(letras)
    return None if novo == palavra else novo


FRASES_ELEMENTO = {
    "pt-BR": ["{n}", "{n}?", "o que é {n}", "me fale do {n}", "informações sobre o {n}", "{n} elemento"],
    "en": ["{n}", "{n}?", "what is {n}", "tell me about {n}", "{n} element"],
    "es": ["{n}", "{n}?", "qué es el {n}", "¿qué es {n}?", "háblame del {n}", "información sobre el {n}"],
    "de": ["{n}", "{n}?", "was ist {n}", "erzähl mir etwas über {n}", "Infos zu {n}"],
    "fr": ["{n}", "{n} ?", "qu'est-ce que le {n}", "parle-moi du {n}", "infos sur le {n}"],
}

SUBSTANCIAS = {  # classes e misturas: não são UM composto do pacote -> CONCEITO
    "pt-BR": ["o açúcar", "o sal de cozinha", "o aço", "o bronze", "o latão", "o ar", "a gasolina", "o vidro", "o plástico", "o sabão", "o detergente",
              "o vinagre", "o leite", "o petróleo", "o papel", "a madeira", "a cerâmica", "o cimento", "a liga metálica", "o querosene", "o diesel"],
    "en": ["sugar", "table salt", "steel", "bronze", "brass", "air", "gasoline", "glass", "plastic", "soap", "detergent", "vinegar", "milk",
           "petroleum", "paper", "wood", "ceramics", "cement", "an alloy", "kerosene", "diesel"],
    "es": ["el azúcar", "la sal de mesa", "el acero", "el bronce", "el latón", "el aire", "la gasolina", "el vidrio", "el plástico", "el jabón",
           "el detergente", "el vinagre", "la leche", "el petróleo", "el papel", "la madera", "la cerámica", "el cemento", "una aleación", "el queroseno",
           "el diésel", "los azúcares", "las grasas", "las proteínas"],
    "de": ["Zucker", "Kochsalz", "Stahl", "Bronze", "Messing", "Luft", "Benzin", "Glas", "Kunststoff", "Seife", "Waschmittel", "Essig", "Milch", "Erdöl",
           "Papier", "Holz", "Keramik", "Zement", "eine Legierung", "Kerosin", "Diesel"],
    "fr": ["le sucre", "le sel de table", "l'acier", "le bronze", "le laiton", "l'air", "l'essence", "le verre", "le plastique", "le savon",
           "le détergent", "le vinaigre", "le lait", "le pétrole", "le papier", "le bois", "la céramique", "le ciment", "un alliage", "le kérosène"],
}
FRASES_SUBSTANCIA = {
    "pt-BR": ["o que é {s}?", "{s} é o quê?", "explique {s}", "do que é feito {s}?", "{s} é uma substância pura?"],
    "en": ["what is {s}?", "explain {s}", "what is {s} made of?", "is {s} a pure substance?"],
    "es": ["¿qué es {s}?", "qué es {s}", "explica {s}", "¿de qué está hecho {s}?", "¿{s} es una sustancia pura?"],
    "de": ["Was ist {s}?", "was ist {s}", "Erkläre {s}", "Woraus besteht {s}?", "Ist {s} ein Reinstoff?"],
    "fr": ["qu'est-ce que {s} ?", "explique {s}", "de quoi est fait {s} ?", "{s} est-il une substance pure ?"],
}

COMBUSTIVEIS = [("metano", "methane", "metano", "Methan", "méthane", "CH4"), ("etano", "ethane", "etano", "Ethan", "éthane", "C2H6"),
                ("propano", "propane", "propano", "Propan", "propane", "C3H8"), ("butano", "butane", "butano", "Butan", "butane", "C4H10"),
                ("octano", "octane", "octano", "Octan", "octane", "C8H18"), ("etanol", "ethanol", "etanol", "Ethanol", "éthanol", "C2H6O"),
                ("metanol", "methanol", "metanol", "Methanol", "méthanol", "CH4O"), ("hidrogênio", "hydrogen", "hidrógeno", "Wasserstoff", "hydrogène", "H2"),
                ("glicose", "glucose", "glucosa", "Glucose", "glucose", "C6H12O6"), ("acetileno", "acetylene", "acetileno", "Acetylen", "acétylène", "C2H2")]
PREFIXO_COMBUSTAO = {
    "pt-BR": ["combustão do {n}: {eq}", "queima do {n}: {eq}", "balanceie a combustão do {n}: {eq}", "{eq}"],
    "en": ["combustion of {n}: {eq}", "burning {n}: {eq}", "balance the combustion of {n}: {eq}", "{eq}"],
    "es": ["combustión del {n}: {eq}", "quema del {n}: {eq}", "balancea la combustión del {n}: {eq}", "reacción de combustión del {n}: {eq}", "{eq}"],
    "de": ["Verbrennung von {n}: {eq}", "Verbrennung des {n}: {eq}", "gleiche die Verbrennung von {n} aus: {eq}", "{eq}"],
    "fr": ["combustion du {n}: {eq}", "combustion de {n} : {eq}", "équilibre la combustion du {n}: {eq}", "{eq}"],
}

CATEGORIAS = {  # id -> nomes por idioma (formas curtas)
    "gas_nobre": {"pt-BR": ["gases nobres", "os gases nobres"], "en": ["noble gases", "the noble gases"], "es": ["gases nobles", "los gases nobles"],
                  "de": ["Edelgase", "die Edelgase", "edle Gase"], "fr": ["gaz nobles", "les gaz nobles", "gaz rares"]},
    "halogenio": {"pt-BR": ["halogênios", "os halogênios"], "en": ["halogens", "the halogens"], "es": ["halógenos", "los halógenos"],
                  "de": ["Halogene", "die Halogene"], "fr": ["halogènes", "les halogènes"]},
    "metal_alcalino": {"pt-BR": ["metais alcalinos", "alcalinos"], "en": ["alkali metals"], "es": ["metales alcalinos", "alcalinos"],
                       "de": ["Alkalimetalle", "die Alkalimetalle"], "fr": ["métaux alcalins", "alcalins"]},
    "metal_alcalino_terroso": {"pt-BR": ["metais alcalino-terrosos", "alcalinos terrosos"], "en": ["alkaline earth metals"],
                               "es": ["metales alcalinotérreos", "alcalinotérreos"], "de": ["Erdalkalimetalle", "die Erdalkalimetalle"],
                               "fr": ["métaux alcalino-terreux", "alcalino-terreux"]},
    "metal_transicao": {"pt-BR": ["metais de transição"], "en": ["transition metals"], "es": ["metales de transición"],
                        "de": ["Übergangsmetalle", "die Übergangsmetalle"], "fr": ["métaux de transition"]},
    "lantanideo": {"pt-BR": ["lantanídeos", "terras raras"], "en": ["lanthanides", "rare earths"], "es": ["lantánidos", "tierras raras"],
                   "de": ["Lanthanoide", "seltene Erden"], "fr": ["lanthanides", "terres rares"]},
    "actinideo": {"pt-BR": ["actinídeos"], "en": ["actinides"], "es": ["actínidos"], "de": ["Actinoide", "Aktinoide"], "fr": ["actinides"]},
    "semimetal": {"pt-BR": ["semimetais", "metaloides"], "en": ["metalloids", "semimetals"], "es": ["semimetales", "metaloides"],
                  "de": ["Halbmetalle", "Metalloide"], "fr": ["métalloïdes", "semi-métaux"]},
    "nao_metal": {"pt-BR": ["não metais", "ametais"], "en": ["nonmetals", "non-metals"], "es": ["no metales"], "de": ["Nichtmetalle"], "fr": ["non-métaux"]},
}
FRASES_CATEGORIA = {
    "pt-BR": ["{c}", "{c}?", "quais são os {c}?", "lista dos {c}", "me mostre os {c}"],
    "en": ["{c}", "{c}?", "which are the {c}?", "list the {c}", "show me the {c}"],
    "es": ["{c}", "{c}?", "¿cuáles son los {c}?", "lista de los {c}", "muéstrame los {c}"],
    "de": ["{c}", "{c}?", "Welche sind die {c}?", "Liste der {c}", "zeig mir die {c}", "Zähle die {c} auf"],
    "fr": ["{c}", "{c} ?", "quels sont les {c} ?", "liste des {c}", "montre-moi les {c}"],
}

LEIS = {
    "pt-BR": ["lei dos gases ideais", "lei de Hess", "princípio de Le Chatelier", "lei de Avogadro", "lei de Boyle", "lei de Charles", "lei de Gay-Lussac",
              "lei de Lavoisier", "lei de Proust", "regra do octeto", "princípio de Aufbau", "regra de Hund", "princípio da exclusão de Pauli",
              "lei de Raoult", "lei de Henry", "equação de Nernst", "equação de Arrhenius", "equação de Clapeyron"],
    "en": ["ideal gas law", "Hess's law", "Le Chatelier's principle", "Avogadro's law", "Boyle's law", "Charles's law", "Gay-Lussac's law",
           "law of conservation of mass", "law of definite proportions", "octet rule", "Aufbau principle", "Hund's rule", "Pauli exclusion principle",
           "Raoult's law", "Henry's law", "Nernst equation", "Arrhenius equation"],
    "es": ["ley de los gases ideales", "ley de Hess", "principio de Le Chatelier", "ley de Avogadro", "ley de Boyle", "ley de Charles",
           "ley de Gay-Lussac", "ley de Lavoisier", "ley de Proust", "regla del octeto", "principio de Aufbau", "regla de Hund",
           "principio de exclusión de Pauli", "ley de Raoult", "ley de Henry", "ecuación de Nernst", "ecuación de Arrhenius"],
    "de": ["das ideale Gasgesetz", "der Satz von Hess", "das Prinzip von Le Chatelier", "das Avogadro-Gesetz", "das Gesetz von Boyle-Mariotte",
           "das Gesetz von Gay-Lussac", "das Massenerhaltungsgesetz", "das Gesetz der konstanten Proportionen", "die Oktettregel",
           "das Aufbauprinzip", "die Hundsche Regel", "das Pauli-Prinzip", "das Raoultsche Gesetz", "das Henry-Gesetz", "die Nernst-Gleichung",
           "die Arrhenius-Gleichung", "die allgemeine Gasgleichung"],
    "fr": ["la loi des gaz parfaits", "la loi de Hess", "le principe de Le Chatelier", "la loi d'Avogadro", "la loi de Boyle-Mariotte",
           "la loi de Charles", "la loi de Gay-Lussac", "la loi de Lavoisier", "la loi de Proust", "la règle de l'octet", "le principe d'Aufbau",
           "la règle de Hund", "le principe d'exclusion de Pauli", "la loi de Raoult", "la loi de Henry", "l'équation de Nernst"],
}
FRASES_LEI = {
    "pt-BR": ["o que é a {l}?", "o que diz a {l}?", "explique a {l}", "{l}", "resuma a {l} para o ensino médio"],
    "en": ["what is the {l}?", "what does the {l} say?", "explain the {l}", "{l}"],
    "es": ["¿qué es la {l}?", "¿qué dice la {l}?", "explica la {l}", "{l}"],
    "de": ["Was ist {l}?", "Was besagt {l}?", "Erkläre {l}", "{l}", "Was ist {l}? Kurz bitte"],
    "fr": ["qu'est-ce que {l} ?", "que dit {l} ?", "explique {l}", "{l}"],
}

FRASES_COMPOSTO = {
    "pt-BR": ["o que é a {c}", "o que é o {c}", "o que é {c}?", "{c}", "me fale sobre {c}", "{c} o que é", "informações da {c}"],
    "en": ["what is {c}", "what is {c}?", "{c}", "tell me about {c}", "info on {c}"],
    "es": ["qué es {c}", "¿qué es la {c}?", "{c}", "háblame de {c}", "información sobre {c}"],
    "de": ["was ist {c}", "Was ist {c}?", "{c}", "erzähl mir etwas über {c}", "Infos zu {c}"],
    "fr": ["qu'est-ce que {c}", "c'est quoi {c} ?", "{c}", "parle-moi de {c}", "infos sur {c}"],
}

FRASES_ESTEQ = {
    "pt-BR": ["quanto {a} reage com {n} g de {b}?", "qual a massa de {a} que reage com {n} g de {b}?", "quantos gramas de {a} reagem com {n} g de {b}",
              "que quantidade de {a} reage completamente com {n} g de {b}?"],
    "en": ["how much {a} reacts with {n} g of {b}?", "what mass of {a} reacts with {n} g of {b}?", "how many grams of {a} react with {n} g of {b}"],
    "es": ["¿cuánto {a} reacciona con {n} g de {b}?", "¿qué masa de {a} reacciona con {n} g de {b}?", "cuántos gramos de {a} reaccionan con {n} g de {b}"],
}
PARES_ESTEQ = [("O", "Mg"), ("O", "Fe"), ("O", "Al"), ("O", "Ca"), ("O", "C"), ("Cl", "Na"), ("Cl", "K"), ("Cl", "Fe"), ("S", "Fe"), ("S", "Zn"),
               ("N", "Mg"), ("H", "O"), ("Na", "Cl"), ("Mg", "O"), ("Fe", "S"), ("Al", "O"), ("Zn", "S"), ("Ca", "O"), ("K", "Cl"), ("C", "O")]

UFS = {"AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
       "GO": "Goiás", "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso", "PA": "Pará", "PB": "Paraíba",
       "PE": "Pernambuco", "PI": "Piauí", "PR": "Paraná", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia", "RR": "Roraima",
       "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SE": "Sergipe", "SP": "São Paulo", "TO": "Tocantins"}
FRASES_UF = ["{UF}??", "{UF}???", "{uf}?", "{uf}??", "{Estado}", "{Estado}?", "{estado}??", "mostra {estado}", "mostra {Estado}", "lista {uf}",
             "e {Estado}?", "e {uf}?", "{uf} por favor", "ver {Estado}", "candidatos {UF}", "{UF} candidatos", "me mostra {uf}", "quero ver {Estado}",
             "agora {Estado}", "{estado} pfv", "{Estado}, por favor"]
MESARIO = ["como ser mesário?", "como ser mesária", "quero ser mesário, como faço?", "como virar mesário nas eleições", "mesário voluntário como me inscrevo",
           "fui convocado para mesário, o que faço?", "o que faz um mesário?", "quem pode ser mesário", "mesário recebe algo?", "como trabalhar na eleição como mesário",
           "convocação de mesário como funciona", "mesário tem folga?", "posso recusar ser mesário?", "dá para ser mesário voluntário?", "inscrição para mesário voluntário",
           "o que o mesário faz no dia da votação", "mesária precisa de treinamento?", "quais as funções do mesário", "quem convoca os mesários?", "ser mesário dá direito a dias de folga?",
           "quero me voluntariar como mesário", "o que acontece se o mesário faltar?", "mesário pode usar celular?", "como é escolhido o mesário", "presidente de mesa faz o quê?"]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--base", default=str(RAIZ / "ia" / "corpus" / "out" / "v35" / "train.json"))
    ap.add_argument("--out", default=str(RAIZ / "ia" / "corpus" / "out" / "v38"))
    ap.add_argument("--seed", type=int, default=38)
    ap.add_argument("--compostos", type=int, default=420)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    instr = instrucoes(Path(a.base))
    qui, ele = [], []
    stats = Counter()

    def add(lista, app, idioma, q, saida: dict, familia):
        q = re.sub(r"\s+", " ", q).strip()
        if not q or len(q) > MAX_Q:
            return
        lista.append({"instruction": instr[app], "input": q, "output": json.dumps(saida, ensure_ascii=False), "app": app, "idioma": idioma,
                      "intent": saida["intent"], "familia": familia})
        stats[f"{app}/{familia}/{idioma}"] += 1

    # --- química: elementos com erro de digitação
    for simbolo, nomes in elementos():
        for idi, nome in nomes.items():
            if idi not in FRASES_ELEMENTO or rng.random() > 0.55:
                continue
            errado = typo(nome.lower(), rng)
            if not errado:
                continue
            frase = rng.choice(FRASES_ELEMENTO[idi]).format(n=errado)
            add(qui, "quimica", idi, frase, {"intent": "ELEMENTO", "elemento": simbolo}, "elemento_typo")

    # --- química: classes e misturas -> CONCEITO
    for idi, lista in SUBSTANCIAS.items():
        for s in lista:
            for frase in rng.sample(FRASES_SUBSTANCIA[idi], 2):
                q = frase.format(s=s)
                add(qui, "quimica", idi, q[0].upper() + q[1:] if rng.random() < 0.5 else q, {"intent": "CONCEITO"}, "conceito_substancia")

    # --- química: combustão com "=" -> BALANCEAR com "->"
    col = {"pt-BR": 0, "en": 1, "es": 2, "de": 3, "fr": 4}
    for comb in COMBUSTIVEIS:
        formula = comb[5]
        produtos = "CO2 + H2O" if "C" in formula else "H2O"
        eq_txt = f"{formula} + O2 = {produtos}"
        eq_out = f"{formula} + O2 -> {produtos}"
        for idi, i in col.items():
            for frase in rng.sample(PREFIXO_COMBUSTAO[idi], 3):
                add(qui, "quimica", idi, frase.format(n=comb[i], eq=eq_txt), {"intent": "BALANCEAR", "equacao": eq_out}, "balancear_igual")

    # --- química: categoria curta -> TABELA_PERIODICA
    for cat, por_idioma in CATEGORIAS.items():
        for idi, nomes in por_idioma.items():
            for nome in nomes:
                for frase in rng.sample(FRASES_CATEGORIA[idi], 3):
                    add(qui, "quimica", idi, frase.format(c=nome), {"intent": "TABELA_PERIODICA", "categoria": cat}, "tabela_categoria")

    # --- química: leis com nome -> CONCEITO
    for idi, leis in LEIS.items():
        for lei in leis:
            for frase in rng.sample(FRASES_LEI[idi], 2):
                add(qui, "quimica", idi, frase.format(l=lei), {"intent": "CONCEITO"}, "conceito_lei")

    # --- química: "o que é a X" com nome do pacote -> COMPOSTO (composto = texto copiado)
    simbolos_fold = {fold(n) for _, nomes in elementos() for n in nomes.values()}
    todos = [c for c in compostos() if fold(c[0]) not in simbolos_fold]
    todos.sort(key=lambda c: c[0])
    rng.shuffle(todos)
    for nome, nomes in todos[:a.compostos]:
        for idi, n in nomes.items():
            if idi != "pt-BR" and rng.random() > 0.35:
                continue
            frase = rng.choice(FRASES_COMPOSTO[idi])
            texto = n if idi != "pt-BR" else (n.lower() if rng.random() < 0.6 else n)
            q = frase.format(c=texto)
            add(qui, "quimica", idi, q, {"intent": "COMPOSTO", "composto": texto}, "composto_o_que_e")

    # --- química: estequiometria "quanto A reage com N g de B" -> elemento = A
    nome_el = {s: n for s, n in elementos()}
    for idi, frases in FRASES_ESTEQ.items():
        for a_, b_ in PARES_ESTEQ:
            na, nb = nome_el.get(a_, {}).get(idi), nome_el.get(b_, {}).get(idi)
            if not na or not nb:
                continue
            n = rng.choice((5, 10, 12, 20, 25, 40, 50, 100))
            frase = rng.choice(frases)
            add(qui, "quimica", idi, frase.format(a=na.lower(), b=nb.lower(), n=n),
                {"intent": "ESTEQUIOMETRIA", "elemento": a_, "quantidades": [{"valor": n, "unidade": "g"}]}, "esteq_reage")

    # --- eleições: só a UF -> LISTAR_CANDIDATOS
    for uf, estado in UFS.items():
        for frase in rng.sample(FRASES_UF, 9):
            q = frase.format(UF=uf, uf=uf.lower(), Estado=estado, estado=fold(estado))
            add(ele, "eleicoes2026", "pt-BR", q, {"intent": "LISTAR_CANDIDATOS", "uf": uf}, "uf_curta")
    # --- eleições: mesário -> REGRAS_URNA
    for q in MESARIO:
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
