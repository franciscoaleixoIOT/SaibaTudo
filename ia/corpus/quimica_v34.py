# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — geradores do corpus do NLU v3.4 (16/10/2026), química nos 5 idiomas (pt-BR, en, es, de, fr):

  multiturno  perguntas de CONTINUAÇÃO com o campo `contexto` (a interpretação da pergunta anterior: intenção + entidades, no formato do
              contrato) — "e o do potássio?", "e em gramas?", "e o ponto de ebulição?", "desenhe", "and for 2 mol?". A saída é a de uma
              pergunta completa: a entidade herdada aparece no JSON. ~22 % dos pares têm contexto mas uma pergunta COMPLETA e nova (o
              contexto não pode vazar). Formato da entrada: ia/corpus/contexto_nlu.py.
  comparar    comparação e raciocínio ancorados no pacote: "qual é mais eletronegativo, F ou Cl?", "qual tem maior ponto de ebulição e por
              quê", "por que X ... que Y?", "ordene por reatividade", "qual é mais ácido" -> COMPARAR com o PRIMEIRO elemento/composto citado
              (o contrato só tem um) e a `propriedade` certa (reatividade não tem id: fica sem propriedade). Os pares de elementos só usam
              propriedades que os DOIS (ou os três) têm no pacote, com valores diferentes. Nenhum fato vai para a saída (o NLU só interpreta).
  (recusas: NÃO há gerador novo — o corpus já tem 1.619 pares de RECUSA_PERIGO revisados, acima da meta de 1.000)
  conceito    CONCEITO em pt-BR a partir dos títulos dos textos em português do pacote (Wikipédia pt "conceito" e Wikilivros): "dê um
              exemplo de", "por que", "qual a diferença entre X e Y", "como funciona", com nível de ensino.

Cada gerador devolve registros {q, alvo, idioma, _lado} (o multi-turno também `contexto` e `entrada`); `_lado` = holdout em ~8 % por hash
estável. O montar_corpus.py passa comparar/conceito pelo build_nlu_dataset.construir do app e valida o multi-turno à parte (a
pergunta tem duas linhas).

Amostra:  python -I ia/corpus/quimica_v34.py --gerador multiturno --idioma de --n 20
"""
import argparse
import hashlib
import importlib.util
import json
import random
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
QUIMICA = RAIZ / "apps" / "quimica"
DATASET = QUIMICA / "dataset"
IDIOMAS = ["pt-BR", "en", "es", "de", "fr"]
FONTE = "SaibaTudo Química: geradores do NLU v3.4 (ia/corpus/quimica_v34.py) sobre o pacote de dados (PubChem, Wikidata, Wikipédia/Wikilivros pt)"
LICENCA = "CC BY-SA 4.0"
HOLDOUT_POR_MIL = 80
KEYS = ["intent", "elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino"]
PLACEHOLDER = re.compile(r"\{(\w+)\}")
NOME_OK = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ,'()+-]{1,38}$")


def _importar(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _dataset():
    if str(DATASET) not in sys.path:
        sys.path.insert(0, str(DATASET))
    import comum  # noqa: E402
    import pacote  # noqa: E402
    import vocab_nlu  # noqa: E402
    return comum, pacote, vocab_nlu


ctxmod = _importar("contexto_nlu", AQUI / "contexto_nlu.py")
pop = _importar("quimica_populares_v34", AQUI / "quimica_populares.py")
ml = _importar("quimica_multilingue_v34", AQUI / "quimica_multilingue.py")


def fold(s: str) -> str:
    return unicodedata.normalize("NFD", str(s).replace("ß", "ss")).encode("ascii", "ignore").decode().lower().strip()


def balde(s: str, seed: int, mod: int = 1000) -> int:
    return int(hashlib.sha1(f"{seed}|{s}".encode("utf-8")).hexdigest()[:8], 16) % mod


# ---------------------------------------------------------------------------------------------------------
# Língua: propriedades, artigos, unidades, acabamento
# ---------------------------------------------------------------------------------------------------------
PT_UNIDADES = {
    "g": ["g", "g", ("grama", "gramas")], "mg": ["mg", ("miligrama", "miligramas")], "kg": ["kg", ("quilo", "quilos"), ("quilograma", "quilogramas")],
    "mol": ["mol", "mol", ("mol", "mols")], "mmol": ["mmol", ("milimol", "milimols")], "L": ["L", "L", "l", ("litro", "litros")],
    "mL": ["mL", "mL", "ml", ("mililitro", "mililitros")], "mol/L": ["mol/L", "mol/L", "M", ("molar", "molar")],
    "K": ["K", "K", ("kelvin", "kelvin")], "°C": ["°C", "°C", ("grau Celsius", "graus Celsius")], "°F": ["°F", ("grau Fahrenheit", "graus Fahrenheit")],
    "atm": ["atm", "atm", ("atmosfera", "atmosferas")], "kPa": ["kPa"], "mmHg": ["mmHg"], "Pa": ["Pa", ("pascal", "pascals")], "bar": ["bar"],
    "J": ["J", ("joule", "joules")], "kJ": ["kJ", ("quilojoule", "quilojoules")], "cal": ["cal", ("caloria", "calorias")], "kcal": ["kcal", ("quilocaloria", "quilocalorias")],
}
DECIMAL = {"pt-BR": ",", "en": ".", "es": ",", "de": ",", "fr": ","}
CATEGORIA = {"g": "m", "mg": "m", "kg": "m", "mol": "n", "mmol": "n", "L": "v", "mL": "v", "mol/L": "c", "K": "T", "°C": "T", "°F": "T",
             "atm": "P", "kPa": "P", "mmHg": "P", "Pa": "P", "bar": "P", "J": "E", "kJ": "E", "cal": "E", "kcal": "E"}
VALS = {
    "g": ["1", "2", "5", "10", "18", "20", "25", "36", "44", "50", "100", "0.5", "250", "500", "12", "4.5"], "mg": ["5", "10", "50", "100", "250", "500"],
    "kg": ["1", "2", "5", "0.5", "1.5"], "mol": ["0.5", "1", "2", "3", "0.1", "5", "10", "0.25", "4", "1.5"], "mmol": ["5", "10", "50", "100"],
    "L": ["0.5", "1", "2", "5", "1.5", "0.25", "10", "22.4"], "mL": ["10", "25", "50", "100", "200", "250", "500"],
    "mol/L": ["0.1", "0.5", "1", "2", "0.01", "0.05", "0.2", "0.001", "0.25", "3"], "K": ["273", "298", "300", "350", "373", "400", "500"],
    "°C": ["0", "20", "25", "37", "50", "80", "100", "150"], "°F": ["32", "68", "98.6", "212"], "atm": ["1", "2", "0.5", "1.5", "3", "5"],
    "kPa": ["100", "101.3", "200", "50"], "mmHg": ["760", "380", "700"], "Pa": ["101325", "50000"], "bar": ["1", "2", "5"],
    "J": ["100", "500", "1000", "4184"], "kJ": ["1", "5", "10", "50"], "cal": ["100", "500", "1000"], "kcal": ["1", "2", "100", "250"],
}
ACABAMENTO = {
    "pt-BR": (["ok, ", "certo, ", "beleza, ", "e agora: ", "valeu! ", "show, ", "entendi, "], [" por favor", " pfv", " agora", " também"]),
    "en": (["ok, ", "thanks, ", "great, ", "got it, ", "cool, ", "and now: "], [" please", " pls", " too", " now"]),
    "es": (["vale, ", "gracias, ", "ok, ", "perfecto, ", "bien, ", "y ahora: "], [" por favor", " porfa", " también", " ahora"]),
    "de": (["ok, ", "danke, ", "gut, ", "super, ", "alles klar, ", "und jetzt: "], [" bitte", " auch", " jetzt", " danke"]),
    "fr": (["ok, ", "merci, ", "d'accord, ", "super, ", "très bien, ", "et maintenant : "], [" s'il te plaît", " stp", " aussi", " maintenant"]),
}


class Lingua:
    def __init__(self, idioma, comum, vocab, rng):
        self.idioma, self.comum, self.rng = idioma, comum, rng
        if idioma == "pt-BR":
            self.mod = None
            self.prop_el, self.prop_co, self.unidades = vocab.PROP_ELEMENTO, vocab.PROP_COMPOSTO, PT_UNIDADES
        else:
            self.mod = ml.carregar_moldes(idioma)
            self.prop_el, self.prop_co, self.unidades = self.mod.PROP_ELEMENTO, self.mod.PROP_COMPOSTO, self.mod.UNIDADES

    # artigos -------------------------------------------------------------------------------------------
    def x(self, nome, tipo, prep=""):
        """nome com artigo/preposição do idioma, sem alterar o nome. tipo: elemento|composto|formula|simbolo; prep: '' | 'de' | 'a' (pt 'ao')."""
        if self.idioma == "pt-BR":
            if tipo in ("formula", "simbolo"):
                art = {"": "o", "de": "do", "a": "ao"}[prep]
                return f"{art} {nome}"
            g = self.comum.genero(nome, elemento=(tipo == "elemento"))
            art = {"o": {"": "o", "de": "do", "a": "ao"}, "a": {"": "a", "de": "da", "a": "à"}}[g][prep]
            return f"{art} {nome}"
        prep = "de" if prep in ("de", "a") else ""
        return self.mod.com_prep(nome, prep, tipo, self.rng)

    def prop(self, pid, de_elemento):
        """(artigo + forma, forma) de uma propriedade."""
        tabela = self.prop_el if de_elemento else self.prop_co
        art, forma = self.rng.choice(tabela[pid])
        junto = f"{art}{forma}" if art.endswith("'") else f"{art} {forma}"
        return junto, forma

    def prop_a(self, pid, de_elemento):
        """pt: 'ao ponto de fusão' / 'à densidade'; outros: igual a prop()."""
        junto, forma = self.prop(pid, de_elemento)
        if self.idioma == "pt-BR":
            art = junto.split(" ", 1)[0]
            return {"o": "ao", "a": "à", "os": "aos", "as": "às"}.get(art, art) + " " + forma
        return junto

    # quantidades --------------------------------------------------------------------------------------
    def quant(self, unidade, num=None):
        num = num or self.rng.choice(VALS[unidade])
        valor = float(num)
        valor = int(valor) if valor == int(valor) else valor
        formas = self.unidades.get(unidade) or [unidade]
        forma = self.rng.choice(formas)
        if isinstance(forma, tuple):
            forma = forma[1] if abs(valor) != 1 else forma[0]
            sep = " "
        else:
            sep = "" if (forma == "M" and self.rng.random() < 0.7) else (" " if self.rng.random() < 0.85 else "")
        return f"{num.replace('.', DECIMAL[self.idioma])}{sep}{forma}", {"valor": valor, "unidade": unidade}

    def unidade_texto(self, unidade):
        formas = self.unidades.get(unidade) or [unidade]
        forma = self.rng.choice(formas)
        return forma[1] if isinstance(forma, tuple) else forma

    # acabamento ---------------------------------------------------------------------------------------
    def acabar(self, q, protegido=(), p_prefixo=0.15, p_sufixo=0.10, p_minuscula=0.35):
        rng = self.rng
        pre, suf = ACABAMENTO[self.idioma]
        q = ml.ajustar_gramatica(self.idioma, q) if self.idioma in ("es", "fr") else q
        if self.idioma == "fr":
            q = re.sub(r"\bque ([aeiouyéèêàâîôûAEIOUYÉÈÊÀÂÎÔÛ])", r"qu'\1", q)
            q = re.sub(r"\b([Dd])e ([aeiouyàâäéèêëîïôöûüAEIOUYÀÂÉÈÊËÎÏÔÛ])", r"\1'\2", q)
        if self.idioma == "pt-BR":
            q = re.sub(r"\bde o ", "do ", q)
            q = re.sub(r"\bde a ", "da ", q)
        orig = q
        r = rng.random()
        if r < p_minuscula and self.idioma != "de":
            q = q[:1].lower() + q[1:]
        elif r < p_minuscula + 0.4:
            q = q[:1].upper() + q[1:]
        if rng.random() < p_prefixo:
            q = rng.choice(pre) + (q[:1].lower() + q[1:] if self.idioma != "de" else q)
        if rng.random() < p_sufixo:
            q = q.rstrip(" ?¿.!") + rng.choice(suf) + ("?" if orig.rstrip().endswith("?") and rng.random() < 0.6 else "")
        if rng.random() < 0.18:
            q = q.rstrip(" ?.!")
        q = re.sub(r"\s+", " ", q).strip()
        if "¿" in q and not q.endswith("?"):
            q += "?"
        if any(p and p not in q for p in protegido):
            q = re.sub(r"\s+", " ", orig).strip()
        return q


# ---------------------------------------------------------------------------------------------------------
# Entidades do pacote
# ---------------------------------------------------------------------------------------------------------
ELEMENTOS_MUITO_COMUNS = pop.ELEMENTOS_MUITO_COMUNS
NUM_EL = ["eletronegatividade", "raioAtomicoPm", "energiaIonizacaoKJmol", "afinidadeEletronicaKJmol", "pontoFusaoK", "pontoEbulicaoK",
          "densidadeKgm3", "massaAtomica"]
PROP_EL_CONTINUACAO = NUM_EL + ["numeroAtomico", "configuracaoEletronica", "estadosOxidacao", "grupo", "periodo", "estadoPadrao", "categoria"]
PROP_CO_CONTINUACAO = ["pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "solubilidade", "pka", "cas", "formula", "xlogp", "tpsa", "smiles"]
PROP_AMBOS = {"pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3"}


class Entidades:
    def __init__(self, pac, idioma, rng):
        self.pac, self.idioma, self.rng = pac, idioma, rng
        self.elementos = []
        for e in pac.elementos:
            nome = (e.get("nomes") or {}).get(idioma) or (e.get("nome") if idioma == "pt-BR" else None)
            if nome and NOME_OK.match(nome):
                self.elementos.append((e, nome))
        self.pesos_el = [12 if e["simbolo"] in ELEMENTOS_MUITO_COMUNS else 4 if e.get("z", 99) <= 36 else 1 for e, _ in self.elementos]
        self.cotidiano = [(c, s) for c in pop.compostos_cotidiano(pac) for s in [pop.superficies(c, idioma)] if s]
        geral = []
        for c in pac.compostos:
            if pac.comp_pendente(c) or pop.eh_elementar(c):
                continue
            nome = c.get("nome") if idioma == "pt-BR" else (c.get("nomes") or {}).get(idioma)
            if nome and NOME_OK.match(nome) and len(nome.split()) <= 4 and not re.search(r"\d", nome):
                geral.append((c, [(nome, "nome")]))
        self.geral = geral

    def el(self, excluir=(), com=None):
        """(elemento, texto, tipo). `com` = propriedade que o elemento tem de ter no pacote."""
        for _ in range(200):
            e, nome = self.rng.choices(self.elementos, weights=self.pesos_el)[0]
            if e["simbolo"] in excluir or (com and e.get(com) is None):
                continue
            if self.rng.random() < 0.15:
                return e, e["simbolo"], "simbolo"
            return e, ml.superficie_nome(self.rng, nome, "de" if self.idioma == "de" else "x"), "elemento"
        raise RuntimeError("sem elemento")

    def co(self, excluir=(), pool=None, cotidiano=0.7):
        """(composto, texto, tipo) — nomes do dia a dia em 70 %, nomes gerais do pacote no resto."""
        for _ in range(200):
            if pool is None:
                lista = self.cotidiano if self.rng.random() < cotidiano else self.geral
            else:
                lista = pool
            c, sups = self.rng.choice(lista)
            if c["cid"] in excluir:
                continue
            texto, t = self.rng.choice(sups)
            tipo = "formula" if t == "formula" else "composto"
            if tipo != "formula":
                r = self.rng.random()
                if self.idioma == "de":
                    texto = texto[:1].upper() + texto[1:] if r < 0.85 else texto
                elif r < 0.55 and not texto[:2].isupper():
                    texto = texto[:1].lower() + texto[1:]
                elif r < 0.8:
                    texto = texto[:1].upper() + texto[1:]
            elif self.rng.random() < 0.15:
                texto = texto.lower()
            return c, texto, tipo
        raise RuntimeError("sem composto")


def _render(template, valores):
    q = template
    for n in PLACEHOLDER.findall(template):
        if n not in valores:
            raise KeyError(f"{{{n}}} sem valor em {template!r}")
        q = q.replace("{" + n + "}", valores[n], 1) if template.count("{" + n + "}") == 1 else q.replace("{" + n + "}", valores[n])
    return q


def _ordenar(alvo):
    return {k: alvo[k] for k in KEYS if k in alvo and alvo[k] not in (None, "", [])}


# =========================================================================================================
# 1. MULTI-TURNO
# =========================================================================================================
MT = {
    "pt-BR": {
        "ent": ["e {x}?", "e {x_de}?", "e para {x}?", "e {s}?", "{S} também?", "e no caso {x_de}?", "agora {s}", "e o mesmo para {s}?", "e quanto {x_a}?",
                "e se for {s}?", "e com {s}?", "e {x_de}, qual é?", "faz para {s} também", "agora com {x}"],
        "prop": ["e {p_art}?", "qual {p_art}?", "e {p}?", "e quanto {p_a}?", "e sobre {p_art}?", "me diz {p_art} também", "agora {p_art}", "e {p_art}, qual é?",
                 "qual é {p_art} então?", "{P}?"],
        "MASSA_MOLAR": ["e a massa molar?", "qual a massa molar?", "e o peso molecular?", "quanto pesa um mol?", "e a massa molar dele?", "massa molar?"],
        "SEGURANCA": ["é perigoso?", "é tóxico?", "e os perigos?", "quais os riscos?", "faz mal?", "e a segurança?", "precisa de EPI?", "é inflamável?",
                      "e os cuidados?", "pode fazer mal à saúde?"],
        "DESENHAR": ["desenhe", "desenha", "desenhe a estrutura", "mostre a estrutura", "e a estrutura?", "como é a molécula?", "desenha pra mim",
                     "mostra a fórmula estrutural", "quero ver a molécula", "desenhe a molécula"],
        "NOMENCLATURA": ["qual o nome IUPAC?", "e o nome oficial?", "qual a nomenclatura?", "como se chama pela IUPAC?"],
        "INFO": ["o que é?", "fale mais sobre isso", "me fala mais", "me conta mais", "o que mais você sabe?"],
        "quant": ["e para {q}?", "e com {q}?", "e se fossem {q}?", "e {q}?", "agora com {q}", "refaça com {q}", "e se eu usar {q}?", "e se for {q}?",
                  "mesma coisa com {q}", "e no caso de {q}?"],
        "unid": ["e em {u}?", "converte para {u}", "agora em {u}", "e se for em {u}?", "em {u}?", "passa para {u}", "e quanto dá em {u}?"],
    },
    "en": {
        "ent": ["what about {x}?", "and {x}?", "and for {x}?", "how about {x}?", "same for {s}", "now {s}", "and {x_de}?", "what about for {s}?", "{S} too?",
                "and with {s}?", "do {s} too", "and if it's {s}?"],
        "prop": ["and {p_art}?", "what about {p_art}?", "and its {p}?", "what's {p_art}?", "now {p_art}", "how about {p_art}?", "tell me {p_art} too",
                 "and what is {p_art}?", "{P}?"],
        "MASSA_MOLAR": ["and the molar mass?", "what about the molar mass?", "and its molecular weight?", "how much does a mole weigh?", "molar mass?"],
        "SEGURANCA": ["is it dangerous?", "is it toxic?", "and the hazards?", "what are the risks?", "is it flammable?", "is it safe?", "is it harmful?",
                      "do I need PPE?", "any safety precautions?"],
        "DESENHAR": ["draw it", "draw", "draw the structure", "show me the structure", "and the structure?", "can you draw it?", "show the molecule",
                     "draw the molecule", "what does the molecule look like?"],
        "NOMENCLATURA": ["what's the IUPAC name?", "and its official name?", "what is it called in IUPAC?", "and the systematic name?"],
        "INFO": ["what is it?", "tell me more about it", "more about it", "what else do you know?"],
        "quant": ["and for {q}?", "what about {q}?", "and with {q}?", "what if it were {q}?", "now with {q}", "redo it with {q}", "and {q}?",
                  "same thing with {q}", "and if I use {q}?"],
        "unid": ["and in {u}?", "what about in {u}?", "convert to {u}", "now in {u}", "in {u}?", "and how much is that in {u}?"],
    },
    "es": {
        "ent": ["¿y {x}?", "¿y {x_de}?", "¿y para {x}?", "¿qué tal {x}?", "lo mismo para {s}", "ahora {s}", "¿y en el caso {x_de}?", "¿{S} también?",
                "¿y con {s}?", "hazlo con {s}", "¿y si es {s}?"],
        "prop": ["¿y {p_art}?", "¿y su {p}?", "¿cuál es {p_art}?", "¿qué hay de {p_art}?", "ahora {p_art}", "dime {p_art} también", "¿y {p_art}, cuál es?",
                 "¿{P}?"],
        "MASSA_MOLAR": ["¿y la masa molar?", "¿cuál es la masa molar?", "¿y su peso molecular?", "¿cuánto pesa un mol?", "¿masa molar?"],
        "SEGURANCA": ["¿es peligroso?", "¿es tóxico?", "¿y los peligros?", "¿cuáles son los riesgos?", "¿es inflamable?", "¿es seguro?", "¿hace daño?",
                      "¿necesito EPP?", "¿qué precauciones hay?"],
        "DESENHAR": ["dibújalo", "dibuja", "dibuja la estructura", "muéstrame la estructura", "¿y la estructura?", "¿puedes dibujarlo?", "muestra la molécula",
                     "dibuja la molécula", "¿cómo es la molécula?"],
        "NOMENCLATURA": ["¿cuál es el nombre IUPAC?", "¿y su nombre oficial?", "¿cómo se llama según la IUPAC?", "¿y el nombre sistemático?"],
        "INFO": ["¿qué es?", "cuéntame más", "háblame más de eso", "¿qué más sabes?"],
        "quant": ["¿y para {q}?", "¿y con {q}?", "¿y si fueran {q}?", "ahora con {q}", "rehazlo con {q}", "¿y {q}?", "lo mismo con {q}", "¿y si uso {q}?"],
        "unid": ["¿y en {u}?", "¿y si lo paso a {u}?", "conviértelo a {u}", "ahora en {u}", "¿en {u}?", "¿y cuánto es en {u}?"],
    },
    "de": {
        "ent": ["und {x}?", "und bei {s}?", "und für {s}?", "was ist mit {s}?", "dasselbe für {s}", "jetzt {s}", "und {x_de}?", "{S} auch?", "und mit {s}?",
                "mach das für {s}", "und wenn es {s} ist?"],
        "prop": ["und {p_art}?", "wie ist {p_art}?", "und {p}?", "jetzt {p_art}", "sag mir auch {p_art}", "und wie hoch ist {p_art}?", "{P}?",
                 "was ist {p_art}?"],
        "MASSA_MOLAR": ["und die molare Masse?", "wie groß ist die molare Masse?", "und das Molekulargewicht?", "wie viel wiegt ein Mol?", "molare Masse?"],
        "SEGURANCA": ["ist es gefährlich?", "ist das giftig?", "und die Gefahren?", "welche Risiken gibt es?", "ist es brennbar?", "ist es sicher?",
                      "ist das schädlich?", "brauche ich Schutzausrüstung?", "welche Vorsichtsmaßnahmen gibt es?"],
        "DESENHAR": ["zeichne es", "zeichnen", "zeichne die Struktur", "zeig mir die Struktur", "und die Struktur?", "kannst du es zeichnen?", "zeig das Molekül",
                     "zeichne das Molekül", "wie sieht das Molekül aus?"],
        "NOMENCLATURA": ["wie lautet der IUPAC-Name?", "und der systematische Name?", "wie heißt es nach IUPAC?", "und der offizielle Name?"],
        "INFO": ["was ist das?", "erzähl mir mehr darüber", "mehr dazu", "was weißt du noch?"],
        "quant": ["und für {q}?", "und mit {q}?", "und wenn es {q} wären?", "jetzt mit {q}", "nochmal mit {q}", "und bei {q}?", "und {q}?", "dasselbe mit {q}"],
        "unid": ["und in {u}?", "und wie viel in {u}?", "rechne in {u} um", "jetzt in {u}", "in {u}?", "und das in {u}?"],
    },
    "fr": {
        "ent": ["et {x} ?", "et pour {x} ?", "qu'en est-il {x_de} ?", "pareil pour {s}", "maintenant {s}", "et dans le cas {x_de} ?", "{S} aussi ?",
                "et avec {s} ?", "fais-le pour {s}", "et si c'est {s} ?", "et {s} ?"],
        "prop": ["et {p_art} ?", "et pour {p_art} ?", "maintenant {p_art}", "donne-moi {p_art}", "et qu'en est-il de {p_art} ?", "dis-moi aussi {p_art}", "{P} ?"],
        "MASSA_MOLAR": ["et la masse molaire ?", "quelle est la masse molaire ?", "et son poids moléculaire ?", "combien pèse une mole ?", "masse molaire ?"],
        "SEGURANCA": ["c'est dangereux ?", "est-ce toxique ?", "et les dangers ?", "quels sont les risques ?", "est-ce inflammable ?", "c'est sans danger ?",
                      "c'est nocif ?", "il faut des EPI ?", "quelles précautions ?"],
        "DESENHAR": ["dessine-le", "dessine", "dessine la structure", "montre-moi la structure", "et la structure ?", "tu peux le dessiner ?", "montre la molécule",
                     "dessine la molécule", "à quoi ressemble la molécule ?"],
        "NOMENCLATURA": ["quel est le nom IUPAC ?", "et son nom officiel ?", "comment s'appelle-t-il selon l'IUPAC ?", "et le nom systématique ?"],
        "INFO": ["qu'est-ce que c'est ?", "dis-m'en plus", "parle-m'en davantage", "quoi d'autre ?"],
        "quant": ["et pour {q} ?", "et avec {q} ?", "et si c'était {q} ?", "maintenant avec {q}", "refais avec {q}", "et {q} ?", "pareil avec {q}"],
        "unid": ["et en {u} ?", "et si je le passe en {u} ?", "convertis en {u}", "maintenant en {u}", "en {u} ?", "et ça fait combien en {u} ?"],
    },
}
# perguntas de quantidade do contexto: (intenção, unidades das quantidades, com composto?)
CTX_QUANT = [("ESTEQUIOMETRIA", [["g"], ["mol"], ["kg"], ["mg"]], True), ("PH", [["mol/L"]], True), ("CONCENTRACAO", [["g", "L"], ["g", "mL"], ["mol", "L"]], True),
             ("GAS_IDEAL", [["mol", "L", "K"], ["mol", "atm", "K"], ["mol", "L", "°C"]], False), ("CONVERSAO_UNIDADE", [["°C"], ["K"], ["g"], ["kg"], ["mL"], ["L"], ["atm"], ["kJ"]], False)]
DESTINOS = {"T": ["K", "°C", "°F"], "m": ["g", "mg", "kg"], "v": ["L", "mL"], "P": ["atm", "kPa", "mmHg", "Pa", "bar"], "E": ["J", "kJ", "cal", "kcal"],
            "n": ["mol", "mmol"]}
CENARIOS = [("ent_el", 14), ("ent_co", 15), ("prop", 15), ("acao", 16), ("quant", 12), ("unid", 6), ("nova", 22)]


class GeradorMT:
    def __init__(self, pac, idioma, rng, comum, vocab, core, completas):
        self.idioma, self.rng, self.core = idioma, rng, core
        self.L = Lingua(idioma, comum, vocab, rng)
        self.E = Entidades(pac, idioma, rng)
        self.T = MT[idioma]
        self.completas = completas  # [(pergunta, saida_json)] do mesmo idioma (treino da química)
        self.props_el = [p for p in PROP_EL_CONTINUACAO if p in self.L.prop_el]
        self.props_co = [p for p in PROP_CO_CONTINUACAO if p in self.L.prop_co]

    # contexto aleatório de uma entidade ------------------------------------------------------------------
    def ctx_el(self):
        e, texto, _ = self.E.el()
        intent = self.rng.choices(["ELEMENTO", "PROPRIEDADE", "MASSA_MOLAR", "SEGURANCA"], weights=[3, 5, 2, 1])[0]
        ctx = {"intent": intent, "elemento": e["simbolo"]}
        if intent == "PROPRIEDADE":
            ctx["propriedade"] = self.rng.choice([p for p in self.props_el if e.get(p) is not None] or self.props_el)
        return ctx, e

    def ctx_co(self):
        c, texto, tipo = self.E.co()
        intent = self.rng.choices(["COMPOSTO", "PROPRIEDADE", "MASSA_MOLAR", "SEGURANCA", "NOMENCLATURA", "DESENHAR"], weights=[3, 5, 4, 3, 1, 1])[0]
        ctx = {"intent": intent, "composto": texto}
        if intent == "PROPRIEDADE":
            ctx["propriedade"] = self.rng.choice(self.props_co)
        return ctx, c

    def ctx_quant(self):
        intent, opcoes, com_co = self.rng.choice(CTX_QUANT)
        unidades = self.rng.choice(opcoes)
        ctx = {"intent": intent}
        if com_co and (intent != "GAS_IDEAL"):
            c, texto, _ = self.E.co(pool=[x for x in self.E.cotidiano if x[0]["cid"] != 962] if intent in ("PH", "CONCENTRACAO") else None)
            ctx["composto"] = texto
        ctx["quantidades"] = [self.L.quant(u)[1] for u in unidades]
        if intent == "CONVERSAO_UNIDADE":
            cat = CATEGORIA[unidades[0]]
            ctx["unidadeDestino"] = self.rng.choice([d for d in DESTINOS[cat] if d != unidades[0]])
        return ctx

    def _ctx_json(self, ctx):
        return self.core.format_output(_ordenar(ctx))

    # cenários -----------------------------------------------------------------------------------------
    def _ent(self, tipo):
        """Troca de entidade: mesma intenção (e propriedade), elemento/composto novo."""
        rng, L = self.rng, self.L
        if tipo == "el":
            ctx, e = self.ctx_el()
            prop = ctx.get("propriedade")
            e2, s, t = self.E.el(excluir={e["simbolo"]}, com=prop if prop in NUM_EL else None)
            alvo = {**ctx, "elemento": e2["simbolo"]}
        else:
            ctx, c = self.ctx_co()
            c2, s, t = self.E.co(excluir={c["cid"]})
            alvo = {**ctx, "composto": s}
        tpl = rng.choice(self.T["ent"])
        q = _render(tpl, {"x": L.x(s, t), "x_de": L.x(s, t, "de"), "x_a": L.x(s, t, "a"), "s": s, "S": s[:1].upper() + s[1:] if t != "formula" else s})
        return ctx, q, alvo, [s] if tipo == "co" else [], f"ent{tipo}:{tpl}|{s}"

    def _prop(self):
        rng, L = self.rng, self.L
        if rng.random() < 0.5:
            ctx, e = self.ctx_el()
            base = {"elemento": e["simbolo"]}
            novas = [p for p in self.props_el if p != ctx.get("propriedade") and e.get(p) is not None and p != "massaAtomica"] or self.props_el
            de_el = True
        else:
            ctx, c = self.ctx_co()
            base = {"composto": ctx["composto"]}
            novas = [p for p in self.props_co if p != ctx.get("propriedade")]
            de_el = False
        if ctx["intent"] in ("DESENHAR", "NOMENCLATURA") and rng.random() < 0.5:
            ctx["intent"] = "COMPOSTO"
        pid = rng.choice(novas)
        junto, forma = L.prop(pid, de_el)
        tpl = rng.choice(self.T["prop"])
        q = _render(tpl, {"p_art": junto, "p": forma, "p_a": L.prop_a(pid, de_el), "P": forma[:1].upper() + forma[1:]})
        if ctx.get("intent") == "PROPRIEDADE" and "propriedade" not in ctx:
            ctx["propriedade"] = pid
        alvo = {"intent": "PROPRIEDADE", **base, "propriedade": pid}
        return ctx, q, alvo, [], f"prop:{tpl}|{pid}"

    def _acao(self):
        rng = self.rng
        acao = rng.choices(["MASSA_MOLAR", "SEGURANCA", "DESENHAR", "NOMENCLATURA", "INFO"], weights=[3, 4, 5, 2, 2])[0]
        if acao in ("DESENHAR", "NOMENCLATURA") or rng.random() < 0.6:
            ctx, c = self.ctx_co()
            base = {"composto": ctx["composto"]}
            info = "COMPOSTO"
        else:
            ctx, e = self.ctx_el()
            base = {"elemento": e["simbolo"]}
            info = "ELEMENTO"
        intent = info if acao == "INFO" else acao
        if ctx["intent"] == intent:  # pergunta de continuação tem de mudar alguma coisa: troca a intenção do contexto
            ctx["intent"] = "PROPRIEDADE" if "propriedade" in ctx else ("MASSA_MOLAR" if intent != "MASSA_MOLAR" else "SEGURANCA")
            if ctx["intent"] == "PROPRIEDADE" and "propriedade" not in ctx:
                ctx["propriedade"] = rng.choice(self.props_el if "elemento" in ctx else self.props_co)
        if ctx["intent"] != "PROPRIEDADE":
            ctx.pop("propriedade", None)
        tpl = rng.choice(self.T[acao])
        return ctx, tpl, {"intent": intent, **base}, [], f"acao:{tpl}"

    def _quant(self):
        rng, L = self.rng, self.L
        for _ in range(20):
            ctx = self.ctx_quant()
            alvo_q = [dict(x) for x in ctx["quantidades"]]
            i = rng.randrange(len(alvo_q))
            cat = CATEGORIA[alvo_q[i]["unidade"]]
            opcoes = [u for u in VALS if CATEGORIA[u] == cat and (cat != "T" or u == alvo_q[i]["unidade"])]
            u = alvo_q[i]["unidade"] if rng.random() < 0.7 else rng.choice(opcoes)
            if ctx["intent"] == "CONVERSAO_UNIDADE" and u == ctx["unidadeDestino"]:
                continue
            txt, nova = L.quant(u)
            if nova == alvo_q[i] or any(nova == x for x in alvo_q):
                continue
            # a categoria da nova quantidade não pode ser ambígua no contexto (duas quantidades da mesma categoria)
            if sum(1 for x in alvo_q if CATEGORIA[x["unidade"]] == cat) > 1:
                continue
            alvo_q[i] = nova
            alvo = {**ctx, "quantidades": alvo_q}
            tpl = rng.choice(self.T["quant"])
            return ctx, _render(tpl, {"q": txt}), alvo, [], f"quant:{tpl}|{txt}"
        return None

    def _unid(self):
        rng, L = self.rng, self.L
        unidades = rng.choice([["°C"], ["K"], ["°F"], ["g"], ["kg"], ["mg"], ["mL"], ["L"], ["atm"], ["kPa"], ["kJ"], ["cal"]])
        ctx = {"intent": "CONVERSAO_UNIDADE", "quantidades": [L.quant(unidades[0])[1]]}
        cat = CATEGORIA[unidades[0]]
        dest = [d for d in DESTINOS[cat] if d != unidades[0]]
        ctx["unidadeDestino"] = rng.choice(dest)
        novos = [d for d in dest if d != ctx["unidadeDestino"]]
        if not novos:
            return None
        d2 = rng.choice(novos)
        tpl = rng.choice(self.T["unid"])
        return ctx, _render(tpl, {"u": L.unidade_texto(d2)}), {**ctx, "unidadeDestino": d2}, [], f"unid:{tpl}|{d2}"

    def _nova(self):
        rng = self.rng
        ctx = rng.choice([lambda: self.ctx_el()[0], lambda: self.ctx_co()[0], self.ctx_quant])()
        q, saida = rng.choice(self.completas)
        alvo = json.loads(saida)
        return ctx, q, alvo, [alvo["composto"]] if "composto" in alvo else [], f"nova:{q}", True

    def amostra(self):
        cen = self.rng.choices([c for c, _ in CENARIOS], weights=[w for _, w in CENARIOS])[0]
        if cen == "nova" and not self.completas:
            cen = "acao"
        r = {"ent_el": lambda: self._ent("el"), "ent_co": lambda: self._ent("co"), "prop": self._prop, "acao": self._acao, "quant": self._quant,
             "unid": self._unid, "nova": self._nova}[cen]()
        if r is None:
            return None
        ctx, q, alvo, protegidos, chave = r[:5]
        pronta = len(r) > 5
        if not pronta:
            q = self.L.acabar(q, protegidos)
        ctx_json = self._ctx_json(ctx)
        alvo = _ordenar(alvo)
        if ctx_json == self.core.format_output(alvo) and cen != "nova":
            return None  # continuação que não muda nada
        return cen, ctx_json, q, alvo, chave


def gerar_multiturno(pac, idioma, seed, escala, core, completas, ds=None):
    comum, _pacote, vocab = ds or _dataset()
    rng = random.Random(f"{seed}-v34-mt-{idioma}")
    g = GeradorMT(pac, idioma, rng, comum, vocab, core, completas)
    meta = int(round((560 if idioma == "pt-BR" else 440) * escala))
    regs, vistos, tent = [], set(), 0
    cont = Counter()
    while len(regs) < meta and tent < meta * 30:
        tent += 1
        r = g.amostra()
        if not r:
            continue
        cen, ctx_json, q, alvo, chave = r
        entrada = ctxmod.montar_entrada(ctx_json, q)
        k = (fold(entrada), json.dumps(alvo, sort_keys=True, ensure_ascii=False))
        if k in vistos or len(entrada) > 300:
            continue
        vistos.add(k)
        lado = "holdout" if balde(f"{idioma}|{chave}|{ctx_json}", seed) < HOLDOUT_POR_MIL else "treino"
        regs.append({"q": q, "contexto": ctx_json, "entrada": entrada, "alvo": alvo, "idioma": idioma, "_lado": lado, "cenario": cen})
        cont[cen] += 1
    return regs, {"idioma": idioma, "gerados": len(regs), "por_cenario": dict(sorted(cont.items())),
                  "por_intencao": dict(sorted(Counter(r["alvo"]["intent"] for r in regs).items()))}


# =========================================================================================================
# 2. COMPARAÇÃO E RACIOCÍNIO
# =========================================================================================================
# predicados comparativos (frase verbal na 3ª pessoa) -> propriedade. de: (verbo, resto) para a ordem V2 / verbo no fim.
PRED_EL = {
    "pt-BR": {"eletronegatividade": ["é mais eletronegativo", "é menos eletronegativo", "atrai mais os elétrons", "tem eletronegatividade maior"],
              "raioAtomicoPm": ["tem raio atômico maior", "tem raio atômico menor", "tem o átomo maior", "tem átomos menores"],
              "energiaIonizacaoKJmol": ["tem energia de ionização maior", "perde elétrons com mais facilidade", "tem energia de ionização menor"],
              "afinidadeEletronicaKJmol": ["tem afinidade eletrônica maior", "tem afinidade eletrônica menor"],
              "pontoFusaoK": ["tem ponto de fusão mais alto", "derrete a uma temperatura mais alta", "funde a uma temperatura mais baixa"],
              "pontoEbulicaoK": ["tem ponto de ebulição mais alto", "ferve a uma temperatura mais alta", "ferve a uma temperatura mais baixa"],
              "densidadeKgm3": ["é mais denso", "é menos denso", "tem densidade maior"],
              "massaAtomica": ["tem massa atômica maior", "tem massa atômica menor", "tem o átomo mais pesado"]},
    "en": {"eletronegatividade": ["is more electronegative", "is less electronegative", "attracts electrons more strongly", "has a higher electronegativity"],
           "raioAtomicoPm": ["has a larger atomic radius", "has a smaller atomic radius", "has bigger atoms"],
           "energiaIonizacaoKJmol": ["has a higher ionization energy", "loses electrons more easily", "has a lower ionization energy"],
           "afinidadeEletronicaKJmol": ["has a higher electron affinity", "has a lower electron affinity"],
           "pontoFusaoK": ["has a higher melting point", "melts at a higher temperature", "melts at a lower temperature"],
           "pontoEbulicaoK": ["has a higher boiling point", "boils at a higher temperature", "boils at a lower temperature"],
           "densidadeKgm3": ["is denser", "is less dense", "has a higher density"],
           "massaAtomica": ["has a higher atomic mass", "has a lower atomic mass", "has heavier atoms"]},
    "es": {"eletronegatividade": ["es más electronegativo", "es menos electronegativo", "atrae más los electrones", "tiene mayor electronegatividad"],
           "raioAtomicoPm": ["tiene mayor radio atómico", "tiene un radio atómico menor", "tiene átomos más grandes"],
           "energiaIonizacaoKJmol": ["tiene mayor energía de ionización", "pierde electrones con más facilidad", "tiene menor energía de ionización"],
           "afinidadeEletronicaKJmol": ["tiene mayor afinidad electrónica", "tiene menor afinidad electrónica"],
           "pontoFusaoK": ["tiene mayor punto de fusión", "funde a mayor temperatura", "se funde a menor temperatura"],
           "pontoEbulicaoK": ["tiene mayor punto de ebullición", "hierve a mayor temperatura", "hierve a menor temperatura"],
           "densidadeKgm3": ["es más denso", "es menos denso", "tiene mayor densidad"],
           "massaAtomica": ["tiene mayor masa atómica", "tiene menor masa atómica", "tiene átomos más pesados"]},
    "de": {"eletronegatividade": [("ist", "elektronegativer"), ("ist", "weniger elektronegativ"), ("zieht", "Elektronen stärker an"), ("hat", "eine höhere Elektronegativität")],
           "raioAtomicoPm": [("hat", "einen größeren Atomradius"), ("hat", "einen kleineren Atomradius"), ("hat", "größere Atome")],
           "energiaIonizacaoKJmol": [("hat", "eine höhere Ionisierungsenergie"), ("gibt", "Elektronen leichter ab"), ("hat", "eine niedrigere Ionisierungsenergie")],
           "afinidadeEletronicaKJmol": [("hat", "eine höhere Elektronenaffinität"), ("hat", "eine niedrigere Elektronenaffinität")],
           "pontoFusaoK": [("hat", "einen höheren Schmelzpunkt"), ("schmilzt", "bei höherer Temperatur"), ("schmilzt", "bei niedrigerer Temperatur")],
           "pontoEbulicaoK": [("hat", "einen höheren Siedepunkt"), ("siedet", "bei höherer Temperatur"), ("siedet", "bei niedrigerer Temperatur")],
           "densidadeKgm3": [("ist", "dichter"), ("hat", "eine geringere Dichte"), ("hat", "eine höhere Dichte")],
           "massaAtomica": [("hat", "eine größere Atommasse"), ("hat", "eine kleinere Atommasse"), ("hat", "schwerere Atome")]},
    "fr": {"eletronegatividade": ["est plus électronégatif", "est moins électronégatif", "attire plus les électrons", "a une électronégativité plus élevée"],
           "raioAtomicoPm": ["a un rayon atomique plus grand", "a un rayon atomique plus petit", "a des atomes plus gros"],
           "energiaIonizacaoKJmol": ["a une énergie d'ionisation plus élevée", "perd ses électrons plus facilement", "a une énergie d'ionisation plus faible"],
           "afinidadeEletronicaKJmol": ["a une affinité électronique plus élevée", "a une affinité électronique plus faible"],
           "pontoFusaoK": ["a un point de fusion plus élevé", "fond à une température plus élevée", "fond à une température plus basse"],
           "pontoEbulicaoK": ["a un point d'ébullition plus élevé", "bout à une température plus élevée", "bout à une température plus basse"],
           "densidadeKgm3": ["est plus dense", "est moins dense", "a une densité plus élevée"],
           "massaAtomica": ["a une masse atomique plus élevée", "a une masse atomique plus faible", "a des atomes plus lourds"]},
}
REATIVO = {"pt-BR": ["é mais reativo", "é menos reativo", "reage mais com a água", "reage com mais violência"],
           "en": ["is more reactive", "is less reactive", "reacts more vigorously with water", "reacts more violently"],
           "es": ["es más reactivo", "es menos reactivo", "reacciona más con el agua", "reacciona con más violencia"],
           "de": [("ist", "reaktiver"), ("ist", "weniger reaktiv"), ("reagiert", "heftiger mit Wasser"), ("reagiert", "stärker")],
           "fr": ["est plus réactif", "est moins réactif", "réagit plus avec l'eau", "réagit plus violemment"]}
PRED_CO = {
    "pt-BR": {"pontoEbulicaoK": ["tem ponto de ebulição mais alto", "ferve a uma temperatura mais alta", "evapora mais fácil", "ferve primeiro"],
              "pontoFusaoK": ["tem ponto de fusão mais alto", "derrete a uma temperatura mais alta", "derrete primeiro"],
              "densidadeKgm3": ["é mais denso", "é menos denso", "tem densidade maior"],
              "solubilidade": ["é mais solúvel em água", "dissolve melhor em água", "é menos solúvel em água"],
              "pka": ["é mais ácido", "é um ácido mais forte", "tem pKa menor", "é menos ácido"],
              "xlogp": ["é mais lipofílico", "é mais solúvel em gordura", "é mais hidrofóbico"],
              "massaMolar": ["tem massa molar maior", "tem massa molar menor", "tem a molécula mais pesada"],
              "tpsa": ["tem TPSA maior", "tem área de superfície polar maior"]},
    "en": {"pontoEbulicaoK": ["has a higher boiling point", "boils at a higher temperature", "evaporates more easily", "boils first"],
           "pontoFusaoK": ["has a higher melting point", "melts at a higher temperature", "melts first"],
           "densidadeKgm3": ["is denser", "is less dense", "has a higher density"],
           "solubilidade": ["is more soluble in water", "dissolves better in water", "is less soluble in water"],
           "pka": ["is more acidic", "is a stronger acid", "has a lower pKa", "is less acidic"],
           "xlogp": ["is more lipophilic", "is more fat-soluble", "is more hydrophobic"],
           "massaMolar": ["has a higher molar mass", "has a lower molar mass", "has the heavier molecule"],
           "tpsa": ["has a higher TPSA", "has a larger polar surface area"]},
    "es": {"pontoEbulicaoK": ["tiene mayor punto de ebullición", "hierve a mayor temperatura", "se evapora más fácil", "hierve primero"],
           "pontoFusaoK": ["tiene mayor punto de fusión", "se funde a mayor temperatura", "se derrite primero"],
           "densidadeKgm3": ["es más denso", "es menos denso", "tiene mayor densidad"],
           "solubilidade": ["es más soluble en agua", "se disuelve mejor en agua", "es menos soluble en agua"],
           "pka": ["es más ácido", "es un ácido más fuerte", "tiene menor pKa", "es menos ácido"],
           "xlogp": ["es más lipofílico", "es más soluble en grasa", "es más hidrofóbico"],
           "massaMolar": ["tiene mayor masa molar", "tiene menor masa molar", "tiene la molécula más pesada"],
           "tpsa": ["tiene mayor TPSA", "tiene mayor área de superficie polar"]},
    "de": {"pontoEbulicaoK": [("hat", "einen höheren Siedepunkt"), ("siedet", "bei höherer Temperatur"), ("verdampft", "leichter")],
           "pontoFusaoK": [("hat", "einen höheren Schmelzpunkt"), ("schmilzt", "bei höherer Temperatur"), ("schmilzt", "früher")],
           "densidadeKgm3": [("ist", "dichter"), ("hat", "eine geringere Dichte"), ("hat", "eine höhere Dichte")],
           "solubilidade": [("ist", "besser in Wasser löslich"), ("ist", "schlechter in Wasser löslich"), ("ist", "wasserlöslicher")],
           "pka": [("ist", "saurer"), ("ist", "die stärkere Säure"), ("hat", "einen kleineren pKa-Wert"), ("ist", "weniger sauer")],
           "xlogp": [("ist", "lipophiler"), ("ist", "fettlöslicher"), ("ist", "hydrophober")],
           "massaMolar": [("hat", "eine größere molare Masse"), ("hat", "eine kleinere molare Masse"), ("hat", "das schwerere Molekül")],
           "tpsa": [("hat", "eine größere TPSA"), ("hat", "eine größere polare Oberfläche")]},
    "fr": {"pontoEbulicaoK": ["a un point d'ébullition plus élevé", "bout à une température plus élevée", "s'évapore plus facilement", "bout en premier"],
           "pontoFusaoK": ["a un point de fusion plus élevé", "fond à une température plus élevée", "fond en premier"],
           "densidadeKgm3": ["est plus dense", "est moins dense", "a une densité plus élevée"],
           "solubilidade": ["est plus soluble dans l'eau", "se dissout mieux dans l'eau", "est moins soluble dans l'eau"],
           "pka": ["est plus acide", "est un acide plus fort", "a un pKa plus faible", "est moins acide"],
           "xlogp": ["est plus lipophile", "est plus soluble dans les graisses", "est plus hydrophobe"],
           "massaMolar": ["a une masse molaire plus élevée", "a une masse molaire plus faible", "a la molécule la plus lourde"],
           "tpsa": ["a une TPSA plus élevée", "a une surface polaire plus grande"]},
}
# moldes de par: {a}/{b} nomes crus, {A}/{B} com artigo (sujeito), {pred}. de usa {v} (verbo) e {r} (resto).
PAR = {
    "pt-BR": ["Qual {pred}, {a} ou {b}?", "Quem {pred}: {a} ou {b}?", "Entre {a} e {b}, qual {pred}?", "Entre {a} e {b}, qual {pred} e por quê?",
              "{a} ou {b}, qual {pred}? Explique", "Por que {A} {pred} que {B}?", "{A} {pred} que {B}?", "É verdade que {A} {pred} que {B}? Por quê?",
              "Explique por que {A} {pred} que {B}", "Qual dos dois {pred}, {a} ou {b}? Justifique", "{a} x {b}: qual {pred}?", "Compare {a} e {b}: qual {pred}?"],
    "en": ["Which {pred}, {a} or {b}?", "Which one {pred}: {a} or {b}? Why?", "Between {a} and {b}, which {pred} and why?", "{a} or {b}, which {pred}? Explain",
           "Explain why {A} {pred} than {B}", "Is it true that {A} {pred} than {B}?", "Why is it that {A} {pred} than {B}?", "Which of the two {pred}, {a} or {b}?",
           "{a} vs {b}: which {pred}?", "Compare {a} and {b}: which {pred}?"],
    "es": ["¿Cuál {pred}, {a} o {b}?", "¿Quién {pred}: {a} o {b}? ¿Por qué?", "Entre {a} y {b}, ¿cuál {pred} y por qué?", "{a} o {b}, ¿cuál {pred}? Explica",
           "¿Por qué {A} {pred} que {B}?", "¿Es cierto que {A} {pred} que {B}?", "Explica por qué {A} {pred} que {B}", "¿Cuál de los dos {pred}, {a} o {b}?",
           "{a} vs {b}: ¿cuál {pred}?", "Compara {a} y {b}: ¿cuál {pred}?"],
    "de": ["Welches {v} {r}, {a} oder {b}?", "Was {v} {r}: {a} oder {b}? Warum?", "Wer {v} {r}, {a} oder {b}, und warum?", "{a} oder {b}: welches {v} {r}? Erkläre",
           "Warum {v} {A} {r} als {B}?", "Stimmt es, dass {A} {r} {v} als {B}?", "Erkläre, warum {A} {r} {v} als {B}", "Welcher der beiden Stoffe {v} {r}, {a} oder {b}?",
           "{a} vs. {b}: welches {v} {r}?", "Vergleiche {a} und {b}: welches {v} {r}?"],
    "fr": ["Lequel {pred}, {a} ou {b} ?", "Qui {pred} : {a} ou {b} ? Pourquoi ?", "Entre {a} et {b}, lequel {pred} et pourquoi ?", "{a} ou {b}, lequel {pred} ? Explique",
           "Pourquoi {A} {pred} que {B} ?", "Est-il vrai que {A} {pred} que {B} ?", "Explique pourquoi {A} {pred} que {B}", "Lequel des deux {pred}, {a} ou {b} ?",
           "{a} vs {b} : lequel {pred} ?", "Compare {a} et {b} : lequel {pred} ?"],
}
# moldes com o nome da propriedade: {p} forma crua, {p_art} com artigo, {a_de}/{b_de}
PAR_PROP = {
    "pt-BR": ["Compare {p_art} {a_de} e {b_de}", "Qual tem {p} maior, {a} ou {b}, e por quê?", "Explique a diferença de {p} entre {a} e {b}",
              "{a} e {b}: qual a diferença de {p} e por quê?", "Por que {p_art} {a_de} é diferente {b_de}?"],
    "en": ["Compare {p_art} {a_de} and {b_de}", "Which has the higher {p}, {a} or {b}, and why?", "Explain the difference in {p} between {a} and {b}",
           "{a} and {b}: what is the difference in {p} and why?", "Why is {p_art} {a_de} different from that {b_de}?"],
    "es": ["Compara {p_art} {a_de} y {b_de}", "¿Cuál tiene mayor {p}, {a} o {b}, y por qué?", "Explica la diferencia de {p} entre {a} y {b}",
           "{a} y {b}: ¿cuál es la diferencia de {p} y por qué?"],
    "de": ["Vergleiche {p_art} {a_de} und {b_de}", "Ist {p_art} {a_de} oder {b_de} höher, und warum?", "Erkläre, wie sich {p_art} von {a} und von {b} unterscheidet",
           "{a} und {b}: wie unterscheidet sich {p_art} und warum?"],
    "fr": ["Compare {p_art} {a_de} et {b_de}", "Qu'est-ce qui est plus élevé, {p_art} {a_de} ou {b_de}, et pourquoi ?", "Explique la différence de {p} entre {a} et {b}",
           "{a} et {b} : quelle différence de {p} et pourquoi ?"],
}
TRIO = {
    "pt-BR": ["Ordene {a}, {b} e {c} por {p}", "Coloque {a}, {b} e {c} em ordem crescente de {p}", "Ordene {a}, {b} e {c} em ordem decrescente de {p} e explique",
              "Qual a ordem de {p} entre {a}, {b} e {c}? Justifique", "Classifique {a}, {b} e {c} pela {p}"],
    "en": ["Order {a}, {b} and {c} by {p}", "Put {a}, {b} and {c} in increasing order of {p}", "Rank {a}, {b} and {c} by {p} and explain",
           "What is the order of {p} for {a}, {b} and {c}? Justify"],
    "es": ["Ordena {a}, {b} y {c} por {p}", "Pon {a}, {b} y {c} en orden creciente de {p}", "Ordena {a}, {b} y {c} de mayor a menor {p} y explica",
           "¿Cuál es el orden de {p} entre {a}, {b} y {c}? Justifica"],
    "de": ["Ordne {a}, {b} und {c} nach {p}", "Sortiere {a}, {b} und {c} nach steigender {p}", "Bringe {a}, {b} und {c} in eine Reihenfolge nach {p} und erkläre",
           "Wie ist die Reihenfolge der {p} bei {a}, {b} und {c}? Begründe"],
    "fr": ["Classe {a}, {b} et {c} selon {p_art}", "Range {a}, {b} et {c} par ordre croissant de {p}", "Classe {a}, {b} et {c} par {p} décroissante et explique",
           "Quel est l'ordre de {p} entre {a}, {b} et {c} ? Justifie"],
}
TRIO_REATIVIDADE = {
    "pt-BR": ["Ordene {a}, {b} e {c} por reatividade", "Coloque {a}, {b} e {c} em ordem de reatividade", "Qual a ordem de reatividade de {a}, {b} e {c}? Por quê?",
              "Do mais ao menos reativo: {a}, {b} e {c}"],
    "en": ["Order {a}, {b} and {c} by reactivity", "Rank {a}, {b} and {c} from most to least reactive", "What is the reactivity order of {a}, {b} and {c}? Why?",
           "Most to least reactive: {a}, {b}, {c}"],
    "es": ["Ordena {a}, {b} y {c} por reactividad", "Ordena {a}, {b} y {c} del más al menos reactivo", "¿Cuál es el orden de reactividad de {a}, {b} y {c}? ¿Por qué?"],
    "de": ["Ordne {a}, {b} und {c} nach Reaktivität", "Sortiere {a}, {b} und {c} vom reaktivsten zum am wenigsten reaktiven", "Wie ist die Reaktivitätsreihe von {a}, {b} und {c}? Warum?"],
    "fr": ["Classe {a}, {b} et {c} par réactivité", "Range {a}, {b} et {c} du plus au moins réactif", "Quel est l'ordre de réactivité de {a}, {b} et {c} ? Pourquoi ?"],
}
GRUPOS_REATIVOS = {1, 2, 17}
CLASSES_ACIDO = {"acido", "acido_carboxilico"}


class GeradorComp:
    def __init__(self, pac, idioma, rng, comum, vocab):
        self.pac, self.idioma, self.rng = pac, idioma, rng
        self.L = Lingua(idioma, comum, vocab, rng)
        self.E = Entidades(pac, idioma, rng)
        self.acidos = [(c, s) for c, s in self.E.cotidiano + self.E.geral if CLASSES_ACIDO & set(c.get("classes") or [])]

    def _par_el(self, pid, n=2):
        """n elementos diferentes que TÊM a propriedade no pacote, com valores distintos; 50 % vizinhos de grupo/período."""
        rng = self.rng
        e1, s1, t1 = self.E.el(com=pid)
        escolhidos = [(e1, s1, t1)]
        for _ in range(n - 1):
            for _ in range(80):
                if rng.random() < 0.5:
                    viz = [(e, nome) for e, nome in self.E.elementos if e.get(pid) is not None and e["simbolo"] not in {x[0]["simbolo"] for x in escolhidos}
                           and ((e.get("grupo") and e.get("grupo") == e1.get("grupo")) or e.get("periodo") == e1.get("periodo")) and abs(e["z"] - e1["z"]) <= 18]
                    if viz:
                        e, nome = rng.choice(viz)
                        s, t = (e["simbolo"], "simbolo") if rng.random() < 0.15 else (ml.superficie_nome(rng, nome, "de" if self.idioma == "de" else "x"), "elemento")
                    else:
                        e, s, t = self.E.el(excluir={x[0]["simbolo"] for x in escolhidos}, com=pid)
                else:
                    e, s, t = self.E.el(excluir={x[0]["simbolo"] for x in escolhidos}, com=pid)
                if all(e.get(pid) != x[0].get(pid) for x in escolhidos) and fold(s) not in {fold(x[1]) for x in escolhidos}:
                    escolhidos.append((e, s, t))
                    break
            else:
                return None
        return escolhidos

    def _par_reativo(self, n=2):
        rng = self.rng
        g = rng.choice(sorted(GRUPOS_REATIVOS))
        membros = [(e, nome) for e, nome in self.E.elementos if e.get("grupo") == g and e["z"] <= 87]
        if len(membros) < n:
            return None
        out = []
        for e, nome in rng.sample(membros, n):
            s, t = (e["simbolo"], "simbolo") if rng.random() < 0.15 else (ml.superficie_nome(rng, nome, "de" if self.idioma == "de" else "x"), "elemento")
            out.append((e, s, t))
        return out

    def _par_co(self, pid, n=2):
        rng = self.rng
        pool = self.acidos if pid == "pka" else None
        out = []
        for _ in range(60):
            c, s, t = self.E.co(excluir={x[0]["cid"] for x in out}, pool=pool)
            if fold(s) in {fold(x[1]) for x in out}:
                continue
            if pid in ("massaMolar", "xlogp", "tpsa"):  # ancorado: os dois têm o valor e são diferentes
                v = c.get("massaMolar") if pid == "massaMolar" else (c.get("propriedades") or {}).get(pid)
                if v is None or any(v == (x[0].get("massaMolar") if pid == "massaMolar" else (x[0].get("propriedades") or {}).get(pid)) for x in out):
                    continue
            if pid == "solubilidade" and c["cid"] == 962:
                continue
            out.append((c, s, t))
            if len(out) == n:
                return out
        return None

    def _valores(self, ents):
        L = self.L
        v = {}
        for nome, (e, s, t) in zip("abc", ents):
            v[nome] = s
            v[nome.upper()] = L.x(s, t)
            v[nome + "_de"] = L.x(s, t, "de")
        return v

    def _pred(self, pred, v):
        if isinstance(pred, tuple):
            v["v"], v["r"] = pred
        else:
            v["pred"] = pred
        return v

    def amostra(self):
        rng, idioma = self.rng, self.idioma
        tipo = rng.choices(["el_pred", "el_prop", "el_trio", "reativo", "reativo_trio", "co_pred", "co_prop"], weights=[30, 8, 10, 7, 4, 30, 8])[0]
        alvo = {"intent": "COMPARAR"}
        if tipo in ("el_pred", "el_prop", "el_trio"):
            pid = rng.choice(NUM_EL)
            ents = self._par_el(pid, 3 if tipo == "el_trio" else 2)
            if not ents:
                return None
            v = self._valores(ents)
            if tipo == "el_pred":
                tpl = rng.choice(PAR[idioma])
                v = self._pred(rng.choice(PRED_EL[idioma][pid]), v)
            else:
                junto, forma = self.L.prop(pid, True)
                v["p"], v["p_art"] = forma, junto
                tpl = rng.choice(PAR_PROP[idioma] if tipo == "el_prop" else TRIO[idioma])
            alvo.update({"elemento": ents[0][0]["simbolo"], "propriedade": pid})
        elif tipo in ("reativo", "reativo_trio"):
            ents = self._par_reativo(3 if tipo == "reativo_trio" else 2)
            if not ents:
                return None
            v = self._valores(ents)
            if tipo == "reativo":
                tpl = rng.choice(PAR[idioma])
                v = self._pred(rng.choice(REATIVO[idioma]), v)
            else:
                tpl = rng.choice(TRIO_REATIVIDADE[idioma])
            alvo["elemento"] = ents[0][0]["simbolo"]
            pid = "reatividade"
        else:
            pid = rng.choices(list(PRED_CO[idioma]), weights=[5, 3, 2, 3, 4, 2, 3, 1])[0]
            ents = self._par_co(pid)
            if not ents:
                return None
            v = self._valores(ents)
            if tipo == "co_pred":
                tpl = rng.choice(PAR[idioma])
                v = self._pred(rng.choice(PRED_CO[idioma][pid]), v)
            else:
                if pid not in self.L.prop_co:
                    return None
                junto, forma = self.L.prop(pid, False)
                v["p"], v["p_art"] = forma, junto
                tpl = rng.choice(PAR_PROP[idioma])
            alvo.update({"composto": ents[0][1], "propriedade": pid})
        # o primeiro citado é o do rótulo: o molde tem de citar {a}/{A}/{a_de} antes de {b}
        pos = [tpl.find("{" + k + "}") for k in ("a", "A", "a_de")]
        pos_b = [tpl.find("{" + k + "}") for k in ("b", "B", "b_de")]
        if min(p for p in pos if p >= 0) > min(p for p in pos_b if p >= 0):
            return None
        q = _render(tpl, v)
        protegido = [ents[0][1]] if "composto" in alvo else []
        q = self.L.acabar(q, protegido, p_prefixo=0.2, p_sufixo=0.05)
        if protegido and protegido[0] not in q:
            return None
        chave = f"{tipo}|{pid}|" + "|".join(sorted(fold(x[1]) for x in ents))
        return q, _ordenar(alvo), chave


def gerar_comparar(pac, idioma, seed, escala, ds=None):
    comum, _pacote, vocab = ds or _dataset()
    rng = random.Random(f"{seed}-v34-comp-{idioma}")
    g = GeradorComp(pac, idioma, rng, comum, vocab)
    meta = int(round((620 if idioma == "pt-BR" else 480) * escala))
    regs, vistos, tent = [], set(), 0
    while len(regs) < meta and tent < meta * 40:
        tent += 1
        r = g.amostra()
        if not r:
            continue
        q, alvo, chave = r
        k = " ".join(re.findall(r"[a-z0-9]+", fold(q)))
        if k in vistos or len(q) > 300:
            continue
        vistos.add(k)
        lado = "holdout" if balde(f"{idioma}|{chave}", seed) < HOLDOUT_POR_MIL else "treino"
        regs.append({"q": q, "alvo": alvo, "idioma": idioma, "_lado": lado})
    return regs, {"idioma": idioma, "gerados": len(regs), "com_propriedade": sum(1 for r in regs if "propriedade" in r["alvo"]),
                  "por_propriedade": dict(sorted(Counter(r["alvo"].get("propriedade", "-") for r in regs).items()))}

# =========================================================================================================
# 3. CONCEITOS (pt-BR, títulos dos textos em português do pacote)
# =========================================================================================================
CONCEITO_PT = [
    ("Dê um exemplo de {t}", None), ("Me dá exemplos de {t}", None), ("Cite exemplos de {t}", None), ("Por que {t} acontece?", None),
    ("Como funciona {t} na prática?", None), ("Explique {t} com um exemplo", None), ("Explique {t} passo a passo", None), ("Resuma {t}", None),
    ("Em poucas palavras, o que é {t}?", None), ("Explique {t} como se eu tivesse 10 anos", "fundamental"), ("{t} de um jeito fácil, por favor", "fundamental"),
    ("Explique {t} para o vestibular", "medio"), ("{t} cai no ENEM? Me explica", "medio"), ("Resumo de {t} para a prova do ensino médio", "medio"),
    ("Explique {t} em nível universitário com detalhes", "superior"), ("Explique {t} para a graduação em química", "superior"),
    ("Onde {t} aparece no dia a dia?", None), ("Qual a relação de {t} com a química?", None), ("Tenho dúvida em {t}, pode explicar?", None),
]
DIFERENCA_PT = [("Qual a diferença entre {t} e {t2}?", None), ("{t} e {t2}: qual a diferença?", None), ("Diferencie {t} de {t2}", None),
                ("O que distingue {t} de {t2}?", None), ("Compare os conceitos de {t} e {t2} para o ensino médio", "medio")]
GENERICOS = {"introducao", "caracteristicas", "historia", "aplicacoes", "propriedades", "exemplos", "definicao", "resumo", "conclusao", "exercicios"}


def titulos_conceito(pac):
    """[(título, tema)] da Wikipédia pt (tipo conceito, filtros do gerar_nlu) e títulos do Wikilivros pt que não são nome de composto/elemento."""
    if str(DATASET) not in sys.path:
        sys.path.insert(0, str(DATASET))
    import gerar_nlu  # noqa: E402
    import fam_conceitos_texto as fct  # noqa: E402
    nomes = {fold(e.get("nome") or "") for e in pac.elementos}
    for c in pac.compostos:
        nomes |= {fold(c.get("nome") or ""), fold(c.get("nomePopular") or "")}
    tema = {fold(fct.titulo_limpo(t)): t.get("tema") for t in pac.textos.values() if t.get("_pasta") == "wikipedia-pt"}
    out = [(t, tema.get(fold(t))) for t in gerar_nlu.titulos_de_conceito(pac)]
    vistos = {fold(t) for t, _ in out}
    for t in sorted(pac.textos.values(), key=lambda x: x["id"]):
        if t.get("fonte") != "Wikilivros em português":
            continue
        tit = (t.get("titulo") or "").strip()
        f = fold(tit)
        if not 4 <= len(tit) <= 50 or f in vistos or f in nomes or f in GENERICOS or not re.match(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ,'-]+$", tit):
            continue
        frases = fct.dividir_frases(t.get("textoPt") or t.get("textoOriginal") or "")
        if fct.artigo_sensivel(t, frases[0] if frases else ""):
            continue
        vistos.add(f)
        out.append((tit[:1].lower() + tit[1:] if not tit[:2].isupper() else tit, (t.get("secao") or "").split("/")[-1]))
    return out


def gerar_conceito(pac, seed, escala, ds=None):
    comum, _pacote, vocab = ds or _dataset()
    rng = random.Random(f"{seed}-v34-conceito")
    L = Lingua("pt-BR", comum, vocab, rng)
    tits = titulos_conceito(pac)
    por_tema = {}
    for t, tema in tits:
        if tema:
            por_tema.setdefault(tema, []).append(t)
    meta = int(round(1100 * escala))
    regs, vistos, tent = [], set(), 0
    while len(regs) < meta and tent < meta * 30:
        tent += 1
        t, tema = rng.choice(tits)
        if rng.random() < 0.2 and tema and len(por_tema.get(tema, [])) > 1:
            t2 = rng.choice([x for x in por_tema[tema] if x != t])
            tpl, nivel = rng.choice(DIFERENCA_PT)
            q = _render(tpl, {"t": t, "t2": t2})
            chave = "dif|" + "|".join(sorted([fold(t), fold(t2)]))
        else:
            tpl, nivel = rng.choice(CONCEITO_PT)
            q = _render(tpl, {"t": t})
            chave = "c|" + fold(t)
        q = L.acabar(q, (), p_prefixo=0.15, p_sufixo=0.05)
        k = " ".join(re.findall(r"[a-z0-9]+", fold(q)))
        if k in vistos or len(q) > 300:
            continue
        vistos.add(k)
        alvo = {"intent": "CONCEITO", **({"nivel": nivel} if nivel else {})}
        lado = "holdout" if balde(chave, seed) < HOLDOUT_POR_MIL else "treino"
        regs.append({"q": q, "alvo": alvo, "idioma": "pt-BR", "_lado": lado})
    return regs, {"idioma": "pt-BR", "gerados": len(regs), "titulos": len(tits)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gerador", choices=["multiturno", "comparar", "conceito"], default="multiturno")
    ap.add_argument("--idioma", default="pt-BR", choices=IDIOMAS)
    ap.add_argument("--n", type=int, default=25)
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    ds = _dataset()
    pac = ds[1].localizar(None)
    core = _importar("nlu_core_quimica_v34", QUIMICA / "backend" / "modal" / "nlu_core.py")
    if a.gerador == "multiturno":
        regs, st = gerar_multiturno(pac, a.idioma, 2026, 1.0, core, [("Qual a massa molar do NaCl?", '{"intent": "MASSA_MOLAR", "composto": "NaCl"}')], ds)
    elif a.gerador == "comparar":
        regs, st = gerar_comparar(pac, a.idioma, 2026, 1.0, ds)
    else:
        regs, st = gerar_conceito(pac, 2026, 1.0, ds)
    rng = random.Random(1)
    for r in rng.sample(regs, min(a.n, len(regs))):
        print(repr(r.get("entrada", r["q"])), "->", json.dumps(r["alvo"], ensure_ascii=False))
    print(json.dumps(st, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
