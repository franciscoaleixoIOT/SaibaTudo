#!/usr/bin/env python
"""Gera os léxicos do interpretador para o site a partir do contrato compartilhado (docs/I18N.md).

    python tools/gerar_lexico.py            # escreve web/src/llms/js/nlu/lex/<idioma>.js para cada contracts/lexico/<idioma>.json
    python tools/gerar_lexico.py --check    # só confere se os gerados estão em dia (código de saída 1 se não)

Saída determinística: o mesmo JSON (indent=1, sem escapar não-ASCII — o mesmo formato de JSON.stringify(obj, null, 1)) entre um cabeçalho fixo e
um `export default`. Os arquivos gerados NÃO devem ser editados à mão: mude o JSON e rode de novo. Porte de apps/quimica/tools/gerar_lexico.py.

Regras do contrato: regexes como texto, sem flags embutidas, só sintaxe comum a JS e java.util.regex (sem lookbehind variável, sem \\p{…}, sem grupo
nomeado); em zh (`semFronteira: true`) nenhuma regex usa \\b, porque não há fronteira de palavra em chinês.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTRATOS = RAIZ / "contracts" / "lexico"
SAIDA = RAIZ / "web" / "src" / "llms" / "js" / "nlu" / "lex"
CABECALHO = "// gerado — não editar. Fonte: contracts/lexico/{idioma}.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).\n"
IDIOMAS = ("pt-BR", "en", "es", "de", "fr", "zh")

PROIBIDOS = (
    (re.compile(r"\(\?<[=!][^)]*(?:[*+]|\{\d*,\d*\})"), "lookbehind de tamanho variável"),
    (re.compile(r"\\p\{"), "classe Unicode \\p{...}"),
    (re.compile(r"\(\?<[A-Za-z]"), "grupo nomeado"),
)
CHAVES_OBRIGATORIAS = ("idioma", "versao", "intencoes", "pistas", "conceitos", "presets", "stopPalavras", "semFronteira", "normalizarAcentos")
INTENCOES = ("saudacao", "ajuda", "sobreDados", "fontes", "mostrar", "analogia", "vizinhos", "similaridade", "direcao", "conceito", "preset", "limpar")
PISTAS = ("separadorLista", "menos", "mais", "estaPara", "aspas", "continuacao", "plural", "pergunta")


def serializar(dados: dict) -> str:
    """O mesmo texto que JSON.stringify(dados, null, 1) produz em JS."""
    return json.dumps(dados, ensure_ascii=False, indent=1, separators=(",", ": "))


def gerar_js(dados: dict) -> str:
    return CABECALHO.format(idioma=dados["idioma"]) + "export default " + serializar(dados) + ";\n"


def validar(dados: dict, nome: str) -> list[str]:
    problemas = []
    for k in CHAVES_OBRIGATORIAS:
        if k not in dados:
            problemas.append(f"{nome}: falta a chave '{k}'")
    if dados.get("idioma") not in IDIOMAS:
        problemas.append(f"{nome}: idioma inválido {dados.get('idioma')!r}")
    if dados.get("idioma") and nome != f"{dados['idioma']}.json":
        problemas.append(f"{nome}: o campo idioma ({dados['idioma']}) não bate com o nome do arquivo")
    if set(dados.get("intencoes", {})) != set(INTENCOES):
        problemas.append(f"{nome}: intenções diferentes de {INTENCOES}")
    if set(dados.get("pistas", {})) != set(PISTAS):
        problemas.append(f"{nome}: pistas diferentes de {PISTAS}")
    zh = dados.get("semFronteira") is True
    for grupo in ("intencoes", "pistas"):
        for k, rx in dados.get(grupo, {}).items():
            caminho = f"{nome}.{grupo}.{k}"
            if not isinstance(rx, str):
                problemas.append(f"{caminho}: regex deve ser texto")
                continue
            try:
                re.compile(rx)
            except re.error as e:
                problemas.append(f"{caminho}: regex inválida ({e}): {rx}")
            for padrao, motivo in PROIBIDOS:
                if padrao.search(rx):
                    problemas.append(f"{caminho}: {motivo} não é permitido: {rx}")
            if zh and "\\b" in rx:
                problemas.append(f"{caminho}: \\b não vale em chinês: {rx}")
    for grupo in ("conceitos", "presets"):
        for k, lista in dados.get(grupo, {}).items():
            if not isinstance(lista, list) or not lista or not all(isinstance(x, str) and x for x in lista):
                problemas.append(f"{nome}.{grupo}.{k}: lista de termos vazia ou inválida")
    return problemas


def mesmas_chaves(ref: dict, outro: dict, caminho="") -> list[str]:
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
    return {arq.name: json.loads(arq.read_text(encoding="utf-8")) for arq in sorted(pasta.glob("*.json"))}


def gerar(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA, escrever: bool = True) -> dict[str, str]:
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


def checar(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA) -> list[str]:
    """Arquivos gerados que não batem com o contrato (lista vazia = em dia)."""
    desatualizados = []
    for nome, js in gerar(pasta_contratos, saida, escrever=False).items():
        atual = (saida / nome)
        if not atual.exists() or atual.read_text(encoding="utf-8").replace("\r\n", "\n") != js:
            desatualizados.append(nome)
    return desatualizados


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="só confere se os gerados estão em dia")
    a = ap.parse_args(argv)
    try:
        if a.check:
            fora = checar()
            if fora:
                print("DESATUALIZADOS: " + ", ".join(fora) + " — rode python tools/gerar_lexico.py")
                return 1
            print("léxicos em dia")
            return 0
        gerados = gerar()
        print("gerados: " + ", ".join(sorted(gerados)))
        return 0
    except ValueError as e:
        print(f"contrato inválido:\n{e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
