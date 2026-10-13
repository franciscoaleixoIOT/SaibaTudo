# -*- coding: utf-8 -*-
"""
Gerador do NLU da química em en/es/de/fr (etapa F da internacionalização), para o corpus único da SaibaTudo.IA.

Por que aqui e não dentro de `apps/quimica/dataset/gerar_nlu.py`: o gerador português é feito de concordância do português (artigos
o/a/do/da, gênero por terminação, plurais, prefixos de cortesia, abreviações "vc"/"oq") espalhada por todo o código; dar-lhe um
parâmetro de idioma exigiria reescrever quase tudo e arriscaria mudar a saída em pt, que tem de ficar idêntica. Aqui ficam só as partes
dependentes de idioma (os moldes em `quimica_idiomas/<idioma>.py`); o resto é REUSADO por import, sem cópia:
  - o pacote de dados assinado (`apps/quimica/dataset/pacote.py`): elementos[].nomes[idioma], compostos[].nomes[idioma] e
    sinonimosPorIdioma[idioma], classes dos compostos;
  - as equações (`dataset/equacoes.py`), as fórmulas livres da nomenclatura (`dataset/fam_nomenclatura.py`), os códigos H (`dataset/ghs_pt.py`)
    e as grafias alteradas das recusas (`dataset/dados_recusas.alterar_grafia`);
  - o contrato do modelo (`backend/modal/nlu_core.py`): a validação final e a montagem do exemplo passam por
    `backend/retrain/build_nlu_dataset.construir` em `montar_corpus.py` (forma do alvo, evidência da equação e das quantidades na
    pergunta, perguntas dos contratos de TESTE fora — golden nos cinco idiomas e casos de segurança).

Mesmas regras do gerador pt: o alvo é o contrato (composto/equação = texto COPIADO da pergunta; elemento = símbolo; propriedade = id;
quantidades = {valor, unidade canônica}); entidades nunca sofrem erro de digitação nem troca de caixa depois de escolhidas (o rótulo é a
superfície); variação de superfície em caixa, acentos, cortesia, abreviações e erros só em palavras de ligação; divisão estável por
ENTIDADE (5 % vira holdout, para medir generalização a compostos/elementos inéditos).
"""
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
IDIOMAS = ["en", "es", "de", "fr"]
FONTE = "SaibaTudo Química: moldes multilíngues (ia/corpus/quimica_idiomas) sobre o pacote de dados (PubChem, Wikidata, CLP/EUR-Lex)"
LICENCA = "CC BY-SA 4.0"
HOLDOUT_POR_MIL = 50  # 5 % das ENTIDADES (como o gerador pt)

# Cota por intenção e idioma (~4,3 mil por idioma antes dos filtros). Mesma proporção do gerador pt (INTENT_COTA), comprimida, com piso nas
# intenções de lista fixa (AJUDA/FONTES/SOBRE_DADOS), que têm poucas formas distintas.
COTA = {
    "ELEMENTO": 200, "COMPOSTO": 220, "PROPRIEDADE": 600, "MASSA_MOLAR": 220, "BALANCEAR": 170, "ESTEQUIOMETRIA": 250, "CONCENTRACAO": 200,
    "PH": 160, "GAS_IDEAL": 150, "CONVERSAO_UNIDADE": 200, "NOMENCLATURA": 200, "DESENHAR": 170, "COMPARAR": 220, "TABELA_PERIODICA": 180,
    "SEGURANCA": 330, "CONCEITO": 340, "RECUSA_PERIGO": 200, "SOBRE_DADOS": 60, "FONTES": 60, "AJUDA": 70, "DESCONHECIDA": 140,
}
GRUPOS = {
    "ELEMENTO": ["ELEMENTO"], "COMPOSTO": ["COMPOSTO"], "PROPRIEDADE": ["PROPRIEDADE_EL", "PROPRIEDADE_CO"], "MASSA_MOLAR": ["MASSA_MOLAR"],
    "BALANCEAR": ["BALANCEAR"], "ESTEQUIOMETRIA": ["ESTEQUIOMETRIA"], "CONCENTRACAO": ["CONCENTRACAO"], "PH": ["PH"], "GAS_IDEAL": ["GAS_IDEAL"],
    "CONVERSAO_UNIDADE": ["CONVERSAO_UNIDADE"], "NOMENCLATURA": ["NOMENCLATURA"], "DESENHAR": ["DESENHAR"], "COMPARAR": ["COMPARAR"],
    "TABELA_PERIODICA": ["TABELA_PERIODICA"], "SEGURANCA": ["SEGURANCA"],
}
KEYS = ["intent", "elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino"]
COMPOSTO_OK = re.compile(r"^[A-Za-z0-9 ,.'()+À-ÿ·₀-₉-]{2,60}$")  # = gramática do modelo (nlu_core._COMPOSTO_CHARS)
EQUACAO_OK = re.compile(r"^[A-Za-z0-9 +=<>()._/,^·→⇌↔⇄⟶₀-₉-]{3,80}$")
SINONIMO_OK = re.compile(r"^[A-Za-zÀ-ÿ0-9 ,.'()+-]{3,40}$")
PLACEHOLDER = re.compile(r"\{(\w+)\}")
NUMERICAS = {"massaAtomica", "numeroAtomico", "eletronegatividade", "raioAtomicoPm", "afinidadeEletronicaKJmol", "energiaIonizacaoKJmol", "pontoFusaoK",
             "pontoEbulicaoK", "densidadeKgm3", "massaMolar", "massaExata", "xlogp", "tpsa", "doadoresH", "aceptoresH", "ligacoesRotaveis"}
PROP_PLURAIS = {"estadosOxidacao", "doadoresH", "aceptoresH", "ligacoesRotaveis"}  # não cabem em "what is / es / est / ist {prop_art}"
_COPULA_SINGULAR = re.compile(r"(?:\bis|\bes|\best|\bist|What's|\bQuel est|\bQuelle est)\s+\{[Pp]rop_art\}|\{[Pp]rop_art\}\s+(?:is|es|est|ist)\b", re.I)
# "de" + artigo, para {prop_de}
PREP_DE = {
    "en": {"the": "of the"},
    "es": {"el": "del", "la": "de la", "los": "de los", "las": "de las"},
    "fr": {"le": "du", "la": "de la", "l'": "de l'", "les": "des"},
    "de": {"der": "vom", "das": "vom", "die": "von der"},
}
VALS = {
    "g": ["1", "2", "2.5", "5", "10", "20", "25", "40", "50", "100", "0.5", "250", "58.5", "4.0"], "mg": ["5", "10", "50", "100", "250", "500"],
    "kg": ["1", "2", "5", "10", "0.5", "25"], "mL": ["10", "25", "50", "100", "200", "250", "500", "1000"], "L": ["0.5", "1", "2", "5", "1.5", "0.25", "10", "22.4"],
    "mol/L": ["0.1", "0.5", "1", "2", "0.01", "0.05", "0.2", "0.001", "1.5", "0.25"], "mol": ["0.5", "1", "2", "3", "0.1", "5", "10", "0.25"],
    "mmol": ["5", "10", "50", "100", "2.5"], "K": ["273", "298", "300", "350", "400", "77", "500", "373"], "°C": ["0", "20", "25", "37", "100", "-10", "50", "15", "-196"],
    "atm": ["1", "2", "0.5", "1.5", "3", "5", "10"], "kPa": ["101.3", "100", "200", "50", "300"], "mmHg": ["760", "380", "500", "700"],
}
VALORES_NUM = ["1", "2", "2.5", "5", "10", "25", "100", "0.5", "250", "1000", "0.25", "750", "3.5", "12", "0.1", "20", "50", "1.5", "300", "0.05", "8", "15"]
GRUPOS_CONVERSAO = [
    ["g", "mg", "kg"], ["mL", "L", "dm3", "m3", "cm3"], ["atm", "Pa", "kPa", "bar", "mmHg", "torr"], ["K", "°C", "°F"], ["J", "kJ", "cal", "kcal"],
    ["m", "cm", "mm", "nm", "pm", "Å"], ["s", "min", "h"], ["mol", "mmol"],
]
LETRAS = "abcdefghijklmnopqrstuvwxyz"


# ---------------------------------------------------------------------------------------------------------
# Imports dos módulos do app (sem cópia)
# ---------------------------------------------------------------------------------------------------------
def _dataset():
    if str(DATASET) not in sys.path:
        sys.path.insert(0, str(DATASET))
    import dados_recusas  # noqa: E402
    import equacoes  # noqa: E402
    import fam_nomenclatura  # noqa: E402
    import ghs_pt  # noqa: E402
    import pacote  # noqa: E402
    return dados_recusas, equacoes, fam_nomenclatura, ghs_pt, pacote


def carregar_moldes(idioma: str):
    caminho = AQUI / "quimica_idiomas" / f"{idioma}.py"
    spec = importlib.util.spec_from_file_location(f"quimica_idiomas_{idioma}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fold(s: str) -> str:
    s = str(s).replace("ß", "ss")
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def sem_acentos(s: str) -> str:
    return unicodedata.normalize("NFD", str(s).replace("ß", "ss")).encode("ascii", "ignore").decode()


def chave_estavel(s: str, seed: int, mod: int = 1000) -> int:
    import hashlib
    return int(hashlib.sha256(f"{seed}|{s}".encode("utf-8")).hexdigest()[:8], 16) % mod


_SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def formula_subscrita(f: str) -> str:
    """H2SO4 -> H₂SO₄ (dígitos depois de letra ou parêntese; coeficientes iniciais ficam)."""
    return re.sub(r"(?<=[A-Za-z)\]])(\d+)", lambda m: m.group(1).translate(_SUB), f)


# ---------------------------------------------------------------------------------------------------------
# Superfície (caixa, acentos, cortesia, abreviações, erros só fora das entidades)
# ---------------------------------------------------------------------------------------------------------
def superficie_nome(rng, nome: str, idioma: str) -> str:
    """minúsculo | Capitalizado | MAIÚSCULO | sem acento (alemão: substantivo capitalizado é o mais comum)."""
    a, b, c = (0.30, 0.55, 0.03) if idioma == "de" else (0.55, 0.20, 0.04)
    r = rng.random()
    if r < a:
        return nome[:1].lower() + nome[1:] if not nome[:2].isupper() else nome
    if r < a + b:
        return nome[:1].upper() + nome[1:]
    if r < a + b + c:
        return nome.upper()
    return fold(nome)


def _primeira_letra(s: str) -> int:
    for i, ch in enumerate(s):
        if ch.isalpha():
            return i
    return -1


def _typo(rng, palavra: str, ok: set) -> str:
    base = re.sub(r"\W", "", fold(palavra))
    if base in ok and len(base) >= 6 and rng.random() < 0.6 and len(palavra) > 4:
        i = rng.randrange(1, len(palavra) - 2)
        return palavra[:i] + palavra[i + 1] + palavra[i] + palavra[i + 2:]
    return palavra


def finalizar(segmentos, rng, mod, permitir_sem_acento=True, p_typo=0.10, p_prefixo=0.30, p_sufixo=0.18, p_abrev=0.08) -> str:
    """Segmentos [(texto, protegido)] -> pergunta. Porte de apps/quimica/dataset/comum.finalizar com as listas do idioma; entidades
    (protegidas) nunca mudam."""
    ok = {fold(w) for w in mod.TYPO_OK}
    partes = []
    abrev = rng.random() < p_abrev
    sem_acento = permitir_sem_acento and rng.random() < 0.10
    for texto, protegido in segmentos:
        if not protegido:
            if rng.random() < p_typo:
                texto = " ".join(_typo(rng, w, ok) for w in texto.split(" "))
            if abrev:
                for rx, sub in mod.ABREVIACOES:
                    texto = re.sub(rx, sub, texto, flags=re.I)
            if sem_acento:
                texto = sem_acentos(texto)
        partes.append((texto, protegido))
    minuscula = rng.random() < 0.18
    if minuscula:
        partes = [(t if p else t.lower(), p) for t, p in partes]
    miolo = "".join(t for t, _ in partes)
    palavras = re.findall(r"[a-z0-9']+", fold(miolo))
    primeira = palavras[0] if palavras else ""
    interrogativa = primeira in {fold(x) for x in mod.INICIOS_INTERROGATIVOS} or miolo.lstrip().startswith("¿")
    lista = mod.PREFIXOS if interrogativa else mod.PREFIXOS_NEUTROS
    prefixo = rng.choice(lista) if rng.random() < p_prefixo else ""
    sufixo = rng.choice(mod.SUFIXOS) if rng.random() < p_sufixo else ""
    fim = re.search(r"[?!.\s]+$", miolo)
    pontuacao = fim.group(0).strip() if fim else ""
    miolo = miolo[:fim.start()] if fim else miolo
    primeiro_livre = bool(partes) and not partes[0][1]
    if prefixo and miolo.lstrip().startswith("¿") and not prefixo.rstrip().endswith((",", ":")):
        miolo = miolo.lstrip()[1:]  # "¿me puedes decir " + "¿cuál...?" -> "¿me puedes decir cuál...?"
    if prefixo and primeiro_livre and mod.IDIOMA != "de":
        i = _primeira_letra(miolo)
        if i >= 0 and not miolo[i:i + 2].isupper():
            miolo = miolo[:i] + miolo[i].lower() + miolo[i + 1:]
    corpo = prefixo + miolo + sufixo + ("" if rng.random() < 0.2 else pontuacao)
    corpo = re.sub(r"\s+", " ", corpo).strip()
    if (bool(prefixo) or primeiro_livre) and not minuscula and rng.random() < 0.85:
        i = _primeira_letra(corpo)
        if i >= 0:
            corpo = corpo[:i] + corpo[i].upper() + corpo[i + 1:]
    return corpo


def renderizar(template: str, valores: dict, rng, mod, **kw) -> str:
    segs, pos = [], 0
    for m in PLACEHOLDER.finditer(template):
        if m.start() > pos:
            segs.append((template[pos:m.start()], False))
        segs.append((str(valores[m.group(1)]), True))
        pos = m.end()
    if pos < len(template):
        segs.append((template[pos:], False))
    return finalizar(segs, rng, mod, **kw)


def ajustar_gramatica(idioma: str, q: str) -> str:
    """Concordâncias que o molde não resolve sozinho."""
    if idioma == "fr":
        q = re.sub(r"\b([Qq])uel est (la |l'(?:é|e)lectron|l'(?:é|e)nergie|l'affinit|l'(?:é|e)lectro)", r"\1uelle est \2", q)
        q = re.sub(r"\b([Qq])uel est les ", r"\1uels sont les ", q)
        q = q.replace("de le ", "du ").replace("à le ", "au ").replace("de les ", "des ")
    elif idioma == "es":
        q = re.sub(r"\bde el\b", "del", q).replace(" a el ", " al ")
    return q


# ---------------------------------------------------------------------------------------------------------
class GeradorIdioma:
    def __init__(self, pac, mod, rng, ds):
        self.pac, self.mod, self.rng = pac, mod, rng
        self.idioma = mod.IDIOMA
        dados_recusas, equacoes, fam_nomenclatura, ghs_pt, _ = ds
        self.alterar_grafia = dados_recusas.alterar_grafia
        self.elementos = [e for e in pac.elementos if (e.get("nomes") or {}).get(self.idioma)]
        vistos = Counter()
        cands = []
        for c in pac.compostos:
            nome = (c.get("nomes") or {}).get(self.idioma)
            formula = c.get("formula") or c.get("formulaHill")
            if not nome or not formula or pac.comp_pendente(c) or len(nome) > 45 or len(nome.split()) > 5 or not COMPOSTO_OK.match(nome):
                continue
            if re.search(r"\d", nome) and re.search(r"[\[\]{}]|\d,\d|\d-[a-z]", nome):  # nomes IUPAC longos com locantes não são como o usuário escreve
                continue
            cands.append(c)
            vistos[fold(nome)] += 1
        self.compostos = [c for c in cands if vistos[fold(c["nomes"][self.idioma])] == 1]
        livres = (list(fam_nomenclatura.CONHECIDAS.values()) + list(fam_nomenclatura.ACIDOS_CONHECIDOS.values())
                  + list(fam_nomenclatura.COVALENTES_CONHECIDOS.values()))
        livres += ["CuSO4·5H2O", "Na2CO3·10H2O", "CaSO4·2H2O", "MgSO4·7H2O", "FeSO4·7H2O", "CoCl2·6H2O"]
        self.formulas_livres = sorted(set(livres))
        ph_cls = {"acido", "base", "sal", "hidroxido", "acido_carboxilico", "inorganico", "oxido"}
        self.c_gas = [c for c in self.compostos if "gas" in (c.get("classes") or [])] or self.compostos
        self.c_ph = [c for c in self.compostos if ph_cls & set(c.get("classes") or [])] or self.compostos
        self.c_sol = [c for c in self.compostos if (ph_cls | {"carboidrato"}) & set(c.get("classes") or [])] or self.compostos
        self.equacoes = [e for _, e in equacoes.lista_equacoes()]
        self.codigos_h = sorted(ghs_pt.FRASES_H)

    # -- entidades ---------------------------------------------------------------------------------------
    def _el(self, e):
        """(superfície, tipo) de um elemento: símbolo, nome no idioma ou, às vezes, o nome em inglês."""
        r = self.rng.random()
        if r < 0.18:
            return e["simbolo"], "simbolo"
        if r < 0.22 and self.idioma != "en" and e.get("nomeEn"):
            return superficie_nome(self.rng, e["nomeEn"], "en"), "elemento"
        return superficie_nome(self.rng, e["nomes"][self.idioma], self.idioma), "elemento"

    def _co(self, c, forcado=None):
        rng, nome = self.rng, c["nomes"][self.idioma]
        formula = c.get("formula") or c.get("formulaHill")
        sins = [s for s in ((c.get("sinonimosPorIdioma") or {}).get(self.idioma) or [])
                if SINONIMO_OK.match(s) and fold(s) != fold(nome) and not re.search(r"\d,\d|\[|\(\w+\)-", s)]
        opcoes = [("nome", 0.60), ("formula", 0.22)] + ([("sinonimo", 0.18)] if sins else [])
        tipos, pesos = zip(*opcoes)
        tipo = forcado if forcado in tipos else rng.choices(tipos, weights=pesos)[0]
        if tipo == "formula":
            return formula, "formula"
        if tipo == "sinonimo":
            return superficie_nome(rng, rng.choice(sins), self.idioma), "composto"
        return superficie_nome(rng, nome, self.idioma), "composto"

    def _numero(self, num: str) -> str:
        sep = self.mod.DECIMAL
        if self.mod.DECIMAL_ALT and self.rng.random() < 0.12:
            sep = self.mod.DECIMAL_ALT
        return num.replace(".", sep)

    def _forma_unidade(self, unidade, valor):
        forma = self.rng.choice(self.mod.UNIDADES[unidade])
        if isinstance(forma, tuple):
            return (forma[1] if self.mod.plural(valor) else forma[0]), True
        return forma, False

    def _qty(self, kind):
        rng = self.rng
        unidade = {"m": rng.choices(["g", "mg", "kg"], weights=[7, 2, 1])[0], "v": rng.choices(["mL", "L"], weights=[55, 45])[0], "L": "L",
                   "c": "mol/L", "n": rng.choices(["mol", "mmol"], weights=[85, 15])[0], "T": rng.choice(["K", "°C"]),
                   "P": rng.choices(["atm", "kPa", "mmHg"], weights=[6, 2, 2])[0]}[kind]
        num = rng.choice(VALS[unidade])
        valor = float(num)
        forma, palavra = self._forma_unidade(unidade, valor)
        sep = " " if (palavra or len(forma) > 2 or rng.random() < 0.75) else ""
        if forma == "M" and rng.random() < 0.7:
            sep = ""
        valor = int(valor) if valor == int(valor) else valor
        return f"{self._numero(num)}{sep}{forma}", {"valor": valor, "unidade": unidade}

    # -- uma amostra a partir de um molde ----------------------------------------------------------------
    def amostra(self, intent, template, estaticos):
        rng, mod = self.rng, self.mod
        nomes = PLACEHOLDER.findall(template)
        lab, valores, quant = {}, {}, []
        e1 = e2 = e3 = c1 = c2 = None
        surf = {}
        eh_el = any(n.startswith(("el", "El")) for n in nomes) or intent == "TABELA_PERIODICA"
        eh_co = any(n.startswith(("co", "Co")) or n in ("cn_s", "cf_s") for n in nomes)
        if "propriedade" in estaticos:
            lab["propriedade"] = estaticos["propriedade"]

        def prop_forma():
            tabela = mod.PROP_ELEMENTO if (eh_el and not eh_co) else mod.PROP_COMPOSTO
            if "propriedade" not in lab:
                ids = sorted(tabela)
                if intent in ("COMPARAR", "TABELA_PERIODICA"):
                    ids = [i for i in ids if i in NUMERICAS]
                if _COPULA_SINGULAR.search(template):
                    ids = [i for i in ids if i not in PROP_PLURAIS]
                lab["propriedade"] = rng.choice(ids)
            pid = lab["propriedade"]
            t = tabela if pid in tabela else (mod.PROP_ELEMENTO if pid in mod.PROP_ELEMENTO else mod.PROP_COMPOSTO)
            if "_forma" not in lab:
                lab["_forma"] = rng.choice(t[pid])
            return lab["_forma"]

        for n in nomes:
            if n in valores:
                continue
            if n.startswith(("el", "El")):
                if e1 is None:
                    e1 = rng.choice(self.elementos)
                    lab["elemento"] = e1["simbolo"]
                if n.startswith("el2"):
                    if e2 is None:
                        e2 = rng.choice([x for x in self.elementos if x is not e1])
                        surf["e2"] = self._el(e2)
                    b, tipo = surf["e2"]
                    valores[n] = b if n == "el2_s" else mod.com_prep(b, "de", tipo, rng)
                elif n.startswith("el3"):
                    if e3 is None:
                        e3 = rng.choice([x for x in self.elementos if x is not e1 and x is not e2])
                        surf["e3"] = self._el(e3)
                    valores[n] = surf["e3"][0]
                else:
                    if "e1" not in surf:
                        surf["e1"] = self._el(e1)
                    b, tipo = surf["e1"]
                    if n == "el_s":
                        valores[n] = b
                    elif n == "El":
                        x = mod.com_prep(b, "", tipo, rng)
                        valores[n] = x[:1].upper() + x[1:]
                    elif n == "el":
                        valores[n] = mod.com_prep(b, "", tipo, rng)
                    else:
                        valores[n] = mod.com_prep(b, "de", tipo, rng)
            elif n in ("co", "co_de", "co_s", "Co", "cn_s", "cf_s"):
                if c1 is None:
                    pool = {"GAS_IDEAL": self.c_gas, "PH": self.c_ph, "CONCENTRACAO": self.c_sol, "ESTEQUIOMETRIA": self.c_sol}.get(intent, self.compostos)
                    c1 = rng.choice(pool)
                forcado = "formula" if n == "cf_s" else ("nome" if n == "cn_s" else None)
                if "c1" not in surf:
                    surf["c1"] = self._co(c1, forcado)
                b, tipo = surf["c1"]
                lab.setdefault("composto", b)
                lab.setdefault("_chave", fold(c1["nomes"][self.idioma]))
                if n in ("co_s", "cn_s", "cf_s"):
                    valores[n] = b
                elif n == "co":
                    valores[n] = mod.com_prep(b, "", tipo, rng)
                elif n == "Co":
                    x = mod.com_prep(b, "", tipo, rng)
                    valores[n] = x if tipo == "formula" else x[:1].upper() + x[1:]
                else:
                    valores[n] = mod.com_prep(b, "de", tipo, rng)
            elif n == "co2_s":
                c2 = rng.choice([x for x in self.compostos if x is not c1])
                valores[n] = self._co(c2)[0]
            elif n == "ff_s":
                f = rng.choice(self.formulas_livres)
                lab.setdefault("composto", f)
                lab.setdefault("_chave", f)
                valores[n] = lab["composto"]
            elif n in ("prop", "Prop", "prop_art", "Prop_art", "prop_de"):
                art, txt = prop_forma()
                junto = f"{art}{txt}" if art.endswith("'") else f"{art} {txt}"
                if n == "prop":
                    valores[n] = txt
                elif n == "Prop":
                    valores[n] = txt[:1].upper() + txt[1:]
                elif n == "prop_art":
                    valores[n] = junto
                elif n == "Prop_art":
                    valores[n] = junto[:1].upper() + junto[1:]
                else:
                    de = PREP_DE[self.idioma].get(art.lower(), PREP_DE[self.idioma].get(art, "")) if art else ""
                    valores[n] = (f"{de}{txt}" if de.endswith("'") else f"{de} {txt}").strip()
            elif n == "np":
                valores[n] = str(rng.randint(1, 7))
            elif n == "n":
                valores[n] = str(rng.randint(1, 18))
            elif n == "b":
                valores[n] = rng.choice(["s", "p", "d", "f"])
            elif n == "h":
                valores[n] = rng.choice(self.codigos_h)
            elif n == "pic":
                valores[n] = rng.choice(sorted(mod.PICTOGRAMAS_NOME))
            elif n == "picn":
                valores[n] = rng.choice(sorted(mod.PICTOGRAMAS_NOME.values()))
            elif n == "eq":
                eq = rng.choice(self.equacoes)
                reag, prod = eq.split(" -> ")
                txt = f"{reag} {rng.choice(['->', '→', '=', '=>', '->'])} {prod}"
                if not EQUACAO_OK.match(txt):
                    return None
                lab["equacao"] = txt
                lab["_chave"] = txt
                valores[n] = txt
            elif re.fullmatch(r"q[mvcnTPL]\d?", n):
                txt, q = self._qty(n[1])
                valores[n] = txt
                quant.append(q)
            elif n == "qconv":
                a, b = rng.sample(rng.choice(GRUPOS_CONVERSAO), 2)
                num = rng.choice(VALS.get(a) or VALORES_NUM)
                val = float(num)
                forma, palavra = self._forma_unidade(a, val)
                sep = " " if (palavra or len(forma) > 2 or rng.random() < 0.7) else ""
                valores[n] = f"{self._numero(num)}{sep}{forma}"
                quant.append({"valor": int(val) if val == int(val) else val, "unidade": a})
                lab["unidadeDestino"] = b
                ud = rng.choice(mod.UNIDADES[b])
                valores["ud"] = ud[1] if isinstance(ud, tuple) else ud
            elif n == "ud":
                continue
            else:
                raise KeyError(f"placeholder desconhecido: {n}")
        alvo = {"intent": intent}
        for k in KEYS[1:]:
            if k == "quantidades":
                if quant:
                    alvo[k] = quant
            elif k in lab:
                alvo[k] = lab[k]
        if intent == "TABELA_PERIODICA" and "propriedade" in alvo and "propriedade" not in estaticos and not {"prop", "Prop", "prop_art", "Prop_art", "prop_de"} & set(nomes):
            alvo.pop("propriedade")
        if "composto" in alvo and not COMPOSTO_OK.match(alvo["composto"]):
            return None
        sem_acento_ok = not ({"composto", "equacao", "quantidades", "unidadeDestino"} & set(alvo))
        q = renderizar(template, valores, rng, mod, permitir_sem_acento=sem_acento_ok)
        q = ajustar_gramatica(self.idioma, q)
        alvo = ancorar(q, alvo)
        if alvo is None:
            return None
        chave = lab.get("_chave") or (fold(lab["elemento"]) if "elemento" in lab else None)
        return q, alvo, chave


def ancorar(q: str, alvo: dict):
    """O composto e a equação do alvo são o texto COPIADO da pergunta: confere e, se a caixa mudou na finalização (primeira letra), copia
    a forma exata. None se não está lá."""
    alvo = dict(alvo)
    for k in ("composto", "equacao"):
        if k not in alvo:
            continue
        if alvo[k] in q:
            continue
        m = re.search(re.escape(alvo[k]), q, flags=re.I)
        if not m:
            return None
        alvo[k] = m.group(0)
    return alvo


def variante_subscrita(q, alvo):
    """H2SO4 -> H₂SO₄ na pergunta e no rótulo (fórmulas e equações), como o gerador pt."""
    novo, alvo = q, dict(alvo)
    comp = alvo.get("composto")
    if comp and re.fullmatch(r"[A-Za-z0-9()·]+", comp) and re.search(r"[A-Za-z]\d", comp):
        alvo["composto"] = formula_subscrita(comp)
        novo = novo.replace(comp, alvo["composto"])
    eq = alvo.get("equacao")
    if eq and re.search(r"[A-Za-z)]\d", eq):
        alvo["equacao"] = formula_subscrita(eq)
        novo = novo.replace(eq, alvo["equacao"])
    return (novo, alvo) if novo != q else None


def gerar_idioma(pac, idioma: str, seed: int = 2026, escala: float = 1.0, ds=None):
    """Lista de registros {q, alvo, idioma, _lado} (lado = treino | holdout por entidade) e estatísticas."""
    ds = ds or _dataset()
    mod = carregar_moldes(idioma)
    rng = random.Random(f"{seed}-{idioma}")
    g = GeradorIdioma(pac, mod, rng, ds)
    amostras = {}

    def guardar(q, alvo, chave):
        alvo = {k: alvo[k] for k in KEYS if k in alvo}
        q = re.sub(r"\s+", " ", q).strip()
        if not q or len(q) > 300:
            return False
        k = (" ".join(re.findall(r"[a-z0-9]+", fold(q))), json.dumps(alvo, sort_keys=True, ensure_ascii=False))
        if k in amostras:
            return False
        amostras[k] = (q, alvo, chave)
        return True

    for intent, chaves in GRUPOS.items():
        meta = int(COTA[intent] * escala)
        modelos = [(t, est) for ch in chaves for (t, est) in mod.T[ch]]
        feitos = tent = 0
        while feitos < meta and tent < meta * 60:
            tent += 1
            t, est = rng.choice(modelos)
            r = g.amostra(intent, t, dict(est))
            if r and guardar(*r):
                feitos += 1
    # conceitos e cientistas
    meta = int(COTA["CONCEITO"] * escala)
    feitos = tent = 0
    while feitos < meta and tent < meta * 40:
        tent += 1
        modelo, nivel = rng.choice(mod.MODELOS_CONCEITO)
        t = rng.choice(mod.TOPICOS)
        q = ajustar_gramatica(idioma, renderizar(modelo, {"t": t}, rng, mod, permitir_sem_acento=True))
        alvo = {"intent": "CONCEITO", **({"nivel": nivel} if nivel else {})}
        if guardar(q, alvo, "t:" + fold(t)):
            feitos += 1
    for p in mod.PESSOAS:
        for modelo in rng.sample(mod.MODELOS_PESSOA, min(3, len(mod.MODELOS_PESSOA))):
            guardar(renderizar(modelo, {"p": p}, rng, mod), {"intent": "CONCEITO"}, "p:" + fold(p))
    for q, it in mod.HARD_NEG.items():  # str = só intenção; dict = intenção + composto/elemento copiados da pergunta
        guardar(q, dict(it) if isinstance(it, dict) else {"intent": it}, None)
    # recusas (só nomes e formas de pedir)
    meta = int(COTA["RECUSA_PERIGO"] * escala)
    cats = sorted(mod.ALVOS_RECUSA)
    feitos = tent = 0
    while feitos < meta and tent < meta * 60:
        tent += 1
        nome, tipo = rng.choice(mod.ALVOS_RECUSA[rng.choice(cats)])
        modelos = mod.MODELOS_PRECURSOR if tipo == "precursor" else (mod.MODELOS_OBJETO if tipo == "objeto" else mod.MODELOS_SUBST)
        x = g.alterar_grafia(rng, nome) if rng.random() < 0.15 else nome
        frase = rng.choice(modelos).format(x=x)
        r = rng.random()
        if r < 0.30:
            p = rng.choice(mod.DISFARCES_PREFIXO)
            i = _primeira_letra(frase)
            frase = p + (frase[:i] + frase[i].lower() + frase[i + 1:] if i >= 0 and idioma != "de" else frase)
        elif r < 0.40:
            frase = frase.rstrip("?.") + "." + rng.choice(mod.DISFARCES_SUFIXO)
        if rng.random() < 0.12:
            frase = frase.lower()
        if guardar(frase, {"intent": "RECUSA_PERIGO"}, None):
            feitos += 1

    # listas fixas (com cortesia e caixa variadas)
    def fixas(intent, frases, meta_):
        for f in frases:
            guardar(f, {"intent": intent}, None)
        n = sum(1 for v in amostras.values() if v[1]["intent"] == intent)
        tent = 0
        while n < meta_ and tent < meta_ * 40:
            tent += 1
            if guardar(finalizar([(rng.choice(frases), False)], rng, mod, p_prefixo=0.45, p_sufixo=0.3), {"intent": intent}, None):
                n += 1
    fixas("SOBRE_DADOS", mod.PEDIDOS_DADOS, int(COTA["SOBRE_DADOS"] * escala))
    fixas("FONTES", mod.PEDIDOS_FONTES, int(COTA["FONTES"] * escala))
    fixas("AJUDA", mod.PEDIDOS_AJUDA, int(COTA["AJUDA"] * escala))
    meta = int(COTA["DESCONHECIDA"] * escala)
    fixas("DESCONHECIDA", mod.FORA_DO_ESCOPO, int(meta * 0.8))
    n = sum(1 for v in amostras.values() if v[1]["intent"] == "DESCONHECIDA")
    tent = 0
    while n < meta and tent < meta * 20:
        tent += 1
        q = " ".join("".join(rng.choice(LETRAS) for _ in range(rng.randint(3, 9))) for _ in range(rng.randint(1, 3)))
        if guardar(q, {"intent": "DESCONHECIDA"}, None):
            n += 1
    # variante com subscritos (H₂SO₄) em ~8 % dos exemplos com fórmula/equação
    subs = 0
    for q, alvo, chave in list(amostras.values()):
        if (alvo.get("composto") or alvo.get("equacao")) and chave_estavel(q, seed) < 80:
            r = variante_subscrita(q, alvo)
            if r and guardar(r[0], r[1], chave):
                subs += 1
    registros = []
    for q, alvo, chave in amostras.values():
        k = chave or " ".join(re.findall(r"[a-z0-9]+", fold(q)))
        lado = "holdout" if chave_estavel(f"{idioma}|{k}", seed) < HOLDOUT_POR_MIL else "treino"
        registros.append({"q": q, "alvo": alvo, "idioma": idioma, "_lado": lado})
    stats = {"idioma": idioma, "gerados": len(registros), "variantes_subscrito": subs, "elementos_no_pool": len(g.elementos),
             "compostos_no_pool": len(g.compostos), "moldes": sum(len(v) for v in mod.T.values()) + len(mod.MODELOS_CONCEITO),
             "por_intencao": dict(sorted(Counter(r["alvo"]["intent"] for r in registros).items()))}
    return registros, stats


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--idiomas", default=",".join(IDIOMAS))
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--escala", type=float, default=1.0)
    ap.add_argument("--amostra", type=int, default=0, help="imprime N exemplos por idioma")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    ds = _dataset()
    pac = ds[4].localizar(None)
    for i in a.idiomas.split(","):
        regs, st = gerar_idioma(pac, i, a.seed, a.escala, ds)
        print(json.dumps(st, ensure_ascii=False))
        if a.amostra:
            for r in random.Random(1).sample(regs, min(a.amostra, len(regs))):
                print("  ", r["q"], "=>", json.dumps(r["alvo"], ensure_ascii=False))


if __name__ == "__main__":
    main()
