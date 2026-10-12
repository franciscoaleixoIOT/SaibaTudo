#!/usr/bin/env python
"""Gera os léxicos do interpretador para o site a partir do contrato compartilhado (docs/I18N.md §3).

    python tools/gerar_lexico.py            # escreve web/src/quimica/js/nlu/lex/<idioma>.js para cada contracts/lexico/<idioma>.json
    python tools/gerar_lexico.py --check    # só confere se os gerados estão em dia (código de saída 1 se não)

Saída determinística: o mesmo JSON (indent=1, sem escapar não-ASCII — o mesmo formato de JSON.stringify(obj, null, 1)) entre um cabeçalho fixo e
um `export default`. Os arquivos gerados NÃO devem ser editados à mão: mude o JSON e rode de novo. A etapa E (Android) gera o Kotlin do mesmo JSON.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTRATOS = RAIZ / "contracts" / "lexico"
SAIDA = RAIZ / "web" / "src" / "quimica" / "js" / "nlu" / "lex"
CABECALHO = "// gerado — não editar. Fonte: contracts/lexico/{idioma}.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).\n"
IDIOMAS = ("pt-BR", "en", "es", "de", "fr")

# construções fora do subconjunto comum a JS e java.util.regex (docs/I18N.md §3)
PROIBIDOS = (
    (re.compile(r"\(\?<[=!][^)]*(?:[*+]|\{\d*,\d*\})"), "lookbehind de tamanho variável"),
    (re.compile(r"\\p\{"), "classe Unicode \\p{...}"),
    (re.compile(r"\(\?<[A-Za-z]"), "grupo nomeado"),
)

CHAVES_OBRIGATORIAS = ("idioma", "versao", "intencoes", "pistas", "nivel", "unidades", "categorias", "estados", "extremos", "propriedades",
                       "stopwordsBusca", "stopPalavras", "palavrasFuncionais", "simbolosAmbiguos", "naoFormulas", "seguranca")


def serializar(dados: dict) -> str:
    """O mesmo texto que JSON.stringify(dados, null, 1) produz em JS (indent=1, separadores ',' e ': ', sem escapar não-ASCII)."""
    return json.dumps(dados, ensure_ascii=False, indent=1, separators=(",", ": "))


def gerar_js(dados: dict) -> str:
    return CABECALHO.format(idioma=dados["idioma"]) + "export default " + serializar(dados) + ";\n"


def _regexes(obj, caminho=""):
    """Todas as strings que são regex (tudo exceto listas de palavras e metadados)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("descricao", "idioma", "versao", "rotulosPropriedadeNormalizados", "letrasUnidade"):
                continue
            yield from _regexes(v, f"{caminho}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _regexes(v, f"{caminho}[{i}]")
    elif isinstance(obj, str) and any(c in obj for c in "\\()[]^$|"):
        yield caminho, obj


def validar(dados: dict, nome: str) -> list[str]:
    """Problemas encontrados (lista vazia = ok): chaves obrigatórias, idioma coerente, regexes compiláveis e dentro do subconjunto comum."""
    problemas = []
    for k in CHAVES_OBRIGATORIAS:
        if k not in dados:
            problemas.append(f"{nome}: falta a chave '{k}'")
    if dados.get("idioma") not in IDIOMAS:
        problemas.append(f"{nome}: idioma inválido {dados.get('idioma')!r}")
    if dados.get("idioma") and nome != f"{dados['idioma']}.json":
        problemas.append(f"{nome}: o campo idioma ({dados['idioma']}) não bate com o nome do arquivo")
    for caminho, rx in _regexes(dados):
        if "palavrasFuncionais" in caminho or "stopPalavras" in caminho or "stopwordsBusca" in caminho or "colada" in caminho:
            continue
        try:
            re.compile(rx)
        except re.error as e:
            problemas.append(f"{nome}{caminho}: regex inválida ({e}): {rx}")
        for padrao, motivo in PROIBIDOS:
            if padrao.search(rx):
                problemas.append(f"{nome}{caminho}: {motivo} não é permitido: {rx}")
    return problemas


def mesmas_chaves(ref: dict, outro: dict, caminho="") -> list[str]:
    """Chaves (recursivas, só de dicionários) presentes num e ausentes no outro — o pt-BR é a referência."""
    difs = []
    if isinstance(ref, dict) and isinstance(outro, dict):
        for k in ref:
            if k not in outro:
                difs.append(f"falta {caminho}.{k}")
            else:
                difs += mesmas_chaves(ref[k], outro[k], f"{caminho}.{k}")
        for k in outro:
            if k not in ref:
                difs.append(f"sobra {caminho}.{k}")
    elif isinstance(ref, dict) != isinstance(outro, dict):
        difs.append(f"tipo diferente em {caminho}")
    return difs


def carregar(pasta: Path = CONTRATOS) -> dict[str, dict]:
    out = {}
    for arq in sorted(pasta.glob("*.json")):
        out[arq.name] = json.loads(arq.read_text(encoding="utf-8"))
    return out


def gerar(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA, escrever: bool = True) -> dict[str, str]:
    """Devolve {nome do arquivo .js: conteúdo}. Lança ValueError se algum contrato for inválido."""
    contratos = carregar(pasta_contratos)
    problemas = []
    for nome, dados in contratos.items():
        problemas += validar(dados, nome)
    ref = contratos.get("pt-BR.json")
    if ref is None:
        problemas.append("falta contracts/lexico/pt-BR.json (referência)")
    else:
        for nome, dados in contratos.items():
            if nome != "pt-BR.json":
                problemas += [f"{nome}: {d}" for d in mesmas_chaves(ref, dados)]
    if problemas:
        raise ValueError("\n".join(problemas))
    gerados = {}
    for nome, dados in contratos.items():
        js = gerar_js(dados)
        gerados[f"{dados['idioma']}.js"] = js
        if escrever:
            saida.mkdir(parents=True, exist_ok=True)
            (saida / f"{dados['idioma']}.js").write_text(js, encoding="utf-8", newline="\n")
    return gerados


def desatualizados(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA) -> list[str]:
    """Arquivos gerados que faltam ou diferem do que o contrato produz hoje."""
    esperados = gerar(pasta_contratos, saida, escrever=False)
    ruins = []
    for nome, conteudo in esperados.items():
        alvo = saida / nome
        if not alvo.exists() or alvo.read_text(encoding="utf-8") != conteudo:
            ruins.append(nome)
    return ruins


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="não escreve; falha se algum gerado estiver desatualizado")
    args = ap.parse_args(argv)
    try:
        if args.check:
            ruins = desatualizados()
            if ruins:
                print("léxicos gerados desatualizados: " + ", ".join(ruins) + " (rode python tools/gerar_lexico.py)")
                return 1
            print("léxicos gerados em dia")
            return 0
        gerados = gerar()
        for nome in gerados:
            print(f"✔ {SAIDA.relative_to(RAIZ) / nome}")
        return 0
    except ValueError as e:
        print(f"ERRO nos contratos de léxico:\n{e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
