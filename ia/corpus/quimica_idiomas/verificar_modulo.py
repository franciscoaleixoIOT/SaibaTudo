# -*- coding: utf-8 -*-
"""Confere um módulo de moldes por idioma (en/es/de/fr) contra a estrutura de referência (en.py) e o léxico do interpretador.

Uso:  python -I ia/corpus/quimica_idiomas/verificar_modulo.py es     (código de saída 0 = ok)
Também usado por ia/corpus/test_montar_corpus.py.
"""
import importlib.util
import json
import random
import re
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent.parent
LEXICO = RAIZ / "apps" / "quimica" / "contracts" / "lexico"

PLACEHOLDERS = {
    "el", "el_s", "El", "el_de", "el2_s", "el2_de", "el3_s", "co", "co_s", "Co", "co_de", "co2_s", "cn_s", "cf_s", "ff_s",
    "prop", "Prop", "prop_art", "Prop_art", "prop_de", "qm", "qv", "qc", "qn", "qT", "qP", "qL", "qm2", "qv2", "qc2", "qconv", "ud", "eq",
    "n", "np", "b", "h", "pic", "picn",
}
ATRIBUTOS = ["IDIOMA", "DECIMAL", "DECIMAL_ALT", "com_prep", "plural", "PROP_ELEMENTO", "PROP_COMPOSTO", "UNIDADES", "T", "HARD_NEG", "PICTOGRAMAS_NOME",
             "TOPICOS", "MODELOS_CONCEITO", "PESSOAS", "MODELOS_PESSOA", "PEDIDOS_AJUDA", "PEDIDOS_DADOS", "PEDIDOS_FONTES", "FORA_DO_ESCOPO",
             "ALVOS_RECUSA", "MODELOS_SUBST", "MODELOS_OBJETO", "MODELOS_PRECURSOR", "DISFARCES_PREFIXO", "DISFARCES_SUFIXO", "PREFIXOS",
             "PREFIXOS_NEUTROS", "INICIOS_INTERROGATIVOS", "SUFIXOS", "TYPO_OK", "ABREVIACOES"]
_PH = re.compile(r"\{(\w+)\}")


def fold(s: str) -> str:
    """Como o léxico vê o texto: minúsculas, sem acento, só [a-z0-9+-] e espaços."""
    t = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+\- ]", " ", t)).strip()


def carregar(idioma: str):
    caminho = AQUI / f"{idioma}.py"
    spec = importlib.util.spec_from_file_location(f"quimica_idiomas_{idioma}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def problemas(idioma: str) -> list:
    erros = []
    mod = carregar(idioma)
    ref = carregar("en")
    for a in ATRIBUTOS:
        if not hasattr(mod, a):
            erros.append(f"falta {a}")
    if erros:
        return erros
    if mod.IDIOMA != idioma:
        erros.append(f"IDIOMA = {mod.IDIOMA!r}")
    lex = json.loads((LEXICO / f"{idioma}.json").read_text(encoding="utf-8"))
    sys.path.insert(0, str(RAIZ / "apps" / "quimica" / "backend" / "modal"))
    import nlu_core  # noqa: E402
    # moldes: mesmas chaves da referência, placeholders conhecidos, rótulos estáticos do contrato
    if set(mod.T) != set(ref.T):
        erros.append(f"chaves de T diferentes da referência: {sorted(set(ref.T) ^ set(mod.T))}")
    for k, lst in mod.T.items():
        if len(lst) < 0.6 * len(ref.T.get(k, [])):
            erros.append(f"T[{k}] com poucos moldes ({len(lst)} contra {len(ref.T.get(k, []))} em en)")
        for t, est in lst:
            for p in _PH.findall(t):
                if p not in PLACEHOLDERS:
                    erros.append(f"T[{k}] placeholder desconhecido {{{p}}} em {t!r}")
            if "propriedade" in est and est["propriedade"] not in nlu_core.PROPRIEDADES:
                erros.append(f"T[{k}] propriedade fora do contrato: {est}")
            if set(est) - {"propriedade"}:
                erros.append(f"T[{k}] rótulo estático inesperado: {est}")
            if "{qconv}" in t and "{ud}" not in t:
                erros.append(f"T[{k}] {{qconv}} sem {{ud}}: {t!r}")
    # estáticos: o conjunto de propriedades rotuladas por molde deve cobrir o da referência
    for k in ref.T:
        a = {e.get("propriedade") for _, e in ref.T[k] if e}
        b = {e.get("propriedade") for _, e in mod.T.get(k, []) if e}
        if a - b:
            erros.append(f"T[{k}] sem moldes com propriedade estática {sorted(a - b)}")
    for q, it in mod.HARD_NEG.items():
        if it not in nlu_core.INTENTS:
            erros.append(f"HARD_NEG intenção inválida {it}")
    # propriedades: ids do contrato e forma reconhecível pelo léxico do idioma
    formas_lex = {pid: [fold(f) for f in fs] for pid, fs in lex["propriedades"].items()}
    for tabela_nome in ("PROP_ELEMENTO", "PROP_COMPOSTO"):
        tab, tab_ref = getattr(mod, tabela_nome), getattr(ref, tabela_nome)
        if set(tab) != set(tab_ref):
            erros.append(f"{tabela_nome}: ids diferentes da referência {sorted(set(tab) ^ set(tab_ref))}")
        for pid, formas in tab.items():
            if pid not in nlu_core.PROPRIEDADES:
                erros.append(f"{tabela_nome}: id fora do contrato {pid}")
            for art, forma in formas:
                if pid in formas_lex:
                    f = fold(forma)
                    if not any(x and (x in f or f in x) for x in formas_lex[pid]):
                        erros.append(f"{tabela_nome}[{pid}] forma {forma!r} não reconhecida pelo léxico {lex['propriedades'][pid]}")
    # unidades: chaves do contrato; palavras reconhecidas pelo léxico (quando o léxico tem a unidade)
    unid_lex = [(re.compile(src), simb) for src, simb in lex["unidades"]]
    if set(mod.UNIDADES) != set(ref.UNIDADES):
        erros.append(f"UNIDADES: chaves diferentes da referência {sorted(set(ref.UNIDADES) ^ set(mod.UNIDADES))}")
    for u, formas in mod.UNIDADES.items():
        if u not in nlu_core.UNIDADES:
            erros.append(f"UNIDADES: {u} fora do contrato")
        tem_no_lex = any(s == u for _, s in unid_lex)
        for f in formas:
            if isinstance(f, tuple):
                if len(f) != 2:
                    erros.append(f"UNIDADES[{u}] tupla deve ser (singular, plural): {f}")
                    continue
                for w in f:
                    if tem_no_lex and not any(rx.search(fold(w)) and s == u for rx, s in unid_lex):
                        erros.append(f"UNIDADES[{u}] palavra {w!r} não reconhecida pelo léxico")
            elif not isinstance(f, str) or not f:
                erros.append(f"UNIDADES[{u}] forma inválida {f!r}")
    # com_prep mantém o nome intacto
    rng = random.Random(1)
    for nome, tipo in [("Eisen", "elemento"), ("oxígeno", "elemento"), ("eau", "composto"), ("H2SO4", "formula"), ("Fe", "simbolo"), ("acide sulfurique", "composto"),
                       ("água", "composto"), ("Ácido clorídrico", "composto"), ("ozone", "composto"), ("hierro", "elemento"), ("plata", "elemento")]:
        for prep in ("", "de"):
            for _ in range(20):
                r = mod.com_prep(nome, prep, tipo, rng)
                if nome not in r:
                    erros.append(f"com_prep({nome!r}, {prep!r}, {tipo!r}) = {r!r} não contém o nome intacto")
                    break
    for lst_nome in ("TOPICOS", "PEDIDOS_AJUDA", "PEDIDOS_DADOS", "PEDIDOS_FONTES", "FORA_DO_ESCOPO", "MODELOS_SUBST"):
        n, nr = len(getattr(mod, lst_nome)), len(getattr(ref, lst_nome))
        if n < 0.7 * nr:
            erros.append(f"{lst_nome} com poucos itens ({n} contra {nr} em en)")
    for t, nivel in mod.MODELOS_CONCEITO:
        if "{t}" not in t or nivel not in (None, "fundamental", "medio", "superior"):
            erros.append(f"MODELOS_CONCEITO inválido: {(t, nivel)}")
    if set(mod.ALVOS_RECUSA) != set(ref.ALVOS_RECUSA):
        erros.append("ALVOS_RECUSA: categorias diferentes")
    if set(mod.PICTOGRAMAS_NOME) != set(ref.PICTOGRAMAS_NOME):
        erros.append("PICTOGRAMAS_NOME: códigos diferentes")
    for rx, _ in mod.ABREVIACOES:
        re.compile(rx)
    return erros


if __name__ == "__main__":
    idiomas = sys.argv[1:] or ["en", "es", "de", "fr"]
    total = 0
    for i in idiomas:
        if not (AQUI / f"{i}.py").exists():
            print(f"{i}: arquivo ausente")
            total += 1
            continue
        e = problemas(i)
        total += len(e)
        print(f"{i}: {'ok' if not e else str(len(e)) + ' problema(s)'}")
        for x in e:
            print("  -", x)
    sys.exit(1 if total else 0)
