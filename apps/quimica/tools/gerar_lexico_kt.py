#!/usr/bin/env python
"""Gera os léxicos do interpretador para o Android a partir do contrato compartilhado (docs/I18N.md §3 e §6).

    python tools/gerar_lexico_kt.py            # escreve app/src/main/java/net/saibatudo/quimica/ai/nlu/lexico/Lexico<Idioma>.kt + LexicosGerados.kt
    python tools/gerar_lexico_kt.py --check    # só confere se os gerados estão em dia (código de saída 1 se não)

O mesmo JSON que alimenta o site (tools/gerar_lexico.py) vira código Kotlin: uma árvore de `linkedMapOf`/`listOf`/strings por idioma (regexes
como TEXTO, sem flags; o app compila em net.saibatudo.quimica.ai.nlu.lexico.Lexico). Cada contêiner até a profundidade 2 ganha uma função
própria (o JVM limita o tamanho de um método a 64 KiB). Saída determinística: a ordem é a do JSON. A validação é a do gerador do site (chaves
obrigatórias, mesmas chaves do pt-BR, regexes no subconjunto comum a JS e java.util.regex) mais as armadilhas próprias do Java; o teste
unitário do Android (LexicoTest) compila TODAS as regexes dos cinco idiomas com java.util.regex. Os arquivos gerados NÃO devem ser editados à
mão: mude contracts/lexico/<idioma>.json e rode de novo.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:  # python -m unittest tools.test_gerar_lexico_kt (da pasta apps/quimica)
    from tools import gerar_lexico as base
except ImportError:  # python tools/gerar_lexico_kt.py
    import gerar_lexico as base  # type: ignore[no-redef]

RAIZ = Path(__file__).resolve().parent.parent
CONTRATOS = RAIZ / "contracts" / "lexico"
PACOTE = "net.saibatudo.quimica.ai.nlu.lexico"
SAIDA = RAIZ / "app" / "src" / "main" / "java" / Path(*PACOTE.split("."))
CABECALHO = ("// gerado — não editar. Fonte: contracts/lexico/{fonte} (tools/gerar_lexico_kt.py).\n"
             "// Regexes como texto, sem flags; o app compila em Lexico.kt (mesma semântica de web/src/quimica/js/nlu/lex/index.js).\n")
INDICE = "LexicosGerados.kt"
IDIOMAS = base.IDIOMAS
PROFUNDIDADE_FUNCOES = 2
INDENTACAO = "    "

# armadilhas do java.util.regex que o JS (sem a flag u) aceita
PROIBIDOS_JAVA = (
    (re.compile(r"(?<!\\)\{(?!\d+(?:,\d*)?\})"), "chave '{' sem escape fora de um quantificador (o Java recusa: Illegal repetition)"),
    (re.compile(r"[*+?}](?<!\\[*+?}])\+"), "quantificador possessivo (só existe no Java)"),
    (re.compile(r"\\[hHvVRXzZG]"), "classe ou âncora só do Java/PCRE"),
)


def sufixo(idioma: str) -> str:
    """'pt-BR' → 'PtBr', 'en' → 'En'."""
    return "".join(p[:1].upper() + p[1:].lower() for p in re.split(r"[^A-Za-z0-9]+", idioma) if p)


def nome_arquivo(idioma: str) -> str:
    return f"Lexico{sufixo(idioma)}.kt"


def texto_kt(s: str) -> str:
    """Literal de string Kotlin com escape de \\, ", $ e de caracteres invisíveis (fora do BMP vira par substituto)."""
    out = ['"']
    for c in s:
        o = ord(c)
        if c == "\\":
            out.append("\\\\")
        elif c == '"':
            out.append('\\"')
        elif c == "$":
            out.append("\\$")
        elif c == "\n":
            out.append("\\n")
        elif c == "\r":
            out.append("\\r")
        elif c == "\t":
            out.append("\\t")
        elif o > 0xFFFF:
            v = o - 0x10000
            out.append("\\u%04X\\u%04X" % (0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF)))
        elif not c.isprintable() or o in (0x2028, 0x2029):
            out.append("\\u%04X" % o)
        else:
            out.append(c)
    out.append('"')
    return "".join(out)


def _ident(caminho: list[str]) -> str:
    return "n_" + "_".join(re.sub(r"[^A-Za-z0-9]", "_", p) for p in caminho)


class _Gerador:
    def __init__(self):
        self.funcoes: list[str] = []

    def valor(self, v, caminho: list[str], nivel: int) -> str:
        """Expressão Kotlin do valor; contêineres até PROFUNDIDADE_FUNCOES viram chamada a uma função própria."""
        if isinstance(v, (dict, list)) and 0 < len(caminho) <= PROFUNDIDADE_FUNCOES:
            nome = _ident(caminho)
            tipo = "Map<String, Any?>" if isinstance(v, dict) else "List<Any?>"
            corpo = self.conteiner(v, caminho, 1)
            self.funcoes.append(f"{INDENTACAO}private fun {nome}(): {tipo} = {corpo}\n")
            return f"{nome}()"
        if isinstance(v, (dict, list)):
            return self.conteiner(v, caminho, nivel)
        if isinstance(v, bool):
            return "true" if v else "false"
        if v is None:
            return "null"
        if isinstance(v, int):
            return str(v)
        if isinstance(v, float):
            return repr(v)
        if isinstance(v, str):
            return texto_kt(v)
        raise TypeError(f"valor não suportado em {'.'.join(caminho)}: {type(v).__name__}")

    def conteiner(self, v, caminho: list[str], nivel: int) -> str:
        dentro = INDENTACAO * (nivel + 1)
        fora = INDENTACAO * nivel
        if isinstance(v, dict):
            if not v:
                return "linkedMapOf<String, Any?>()"
            itens = [f"{dentro}{texto_kt(k)} to {self.valor(x, caminho + [k], nivel + 1)}" for k, x in v.items()]
            return "linkedMapOf<String, Any?>(\n" + ",\n".join(itens) + f"\n{fora})"
        if not v:
            return "emptyList<Any?>()"
        itens = [f"{dentro}{self.valor(x, caminho + [str(i)], nivel + 1)}" for i, x in enumerate(v)]
        return "listOf<Any?>(\n" + ",\n".join(itens) + f"\n{fora})"


def gerar_kt(dados: dict, fonte: str) -> str:
    """Arquivo Kotlin de UM idioma: `internal object Lexico<Idioma> { fun bruto(): Map<String, Any?> }`."""
    g = _Gerador()
    raiz = g.conteiner(dados, [], 1)
    objeto = f"Lexico{sufixo(dados['idioma'])}"
    return (
        CABECALHO.format(fonte=fonte)
        + f"package {PACOTE}\n\n"
        + f"/** Léxico bruto de {dados['idioma']} (árvore do JSON; `Lexico.compilar` transforma em Regex e conjuntos). */\n"
        + f"internal object {objeto} {{\n"
        + f"{INDENTACAO}fun bruto(): Map<String, Any?> = {raiz}\n"
        + ("\n" if g.funcoes else "")
        + "\n".join(g.funcoes)
        + "}\n"
    )


def gerar_indice(idiomas: list[str]) -> str:
    casos = "\n".join(f"{INDENTACAO * 2}{texto_kt(i)} -> Lexico{sufixo(i)}.bruto()" for i in idiomas)
    lista = ", ".join(texto_kt(i) for i in idiomas)
    return (
        CABECALHO.format(fonte="<idioma>.json")
        + f"package {PACOTE}\n\n"
        + "/** Léxicos gerados, na ordem do contrato (pt-BR é a referência e o padrão). */\n"
        + "internal object LexicosGerados {\n"
        + f"{INDENTACAO}val IDIOMAS: List<String> = listOf({lista})\n\n"
        + f"{INDENTACAO}fun bruto(idioma: String): Map<String, Any?>? = when (idioma) {{\n"
        + casos + "\n"
        + f"{INDENTACAO * 2}else -> null\n"
        + f"{INDENTACAO}}}\n"
        + "}\n"
    )


def validar_java(dados: dict, nome: str) -> list[str]:
    problemas = []
    for caminho, rx in base._regexes(dados):
        if any(x in caminho for x in ("palavrasFuncionais", "stopPalavras", "stopwordsBusca", "colada")):
            continue
        for padrao, motivo in PROIBIDOS_JAVA:
            if padrao.search(rx):
                problemas.append(f"{nome}{caminho}: {motivo}: {rx}")
    return problemas


def gerar(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA, escrever: bool = True) -> dict[str, str]:
    """Devolve {nome do arquivo .kt: conteúdo}. Lança ValueError se algum contrato for inválido (mesma validação do gerador do site)."""
    base.gerar(pasta_contratos, escrever=False)  # chaves obrigatórias, mesmas chaves do pt-BR, regexes no subconjunto comum
    contratos = base.carregar(pasta_contratos)
    problemas = []
    for nome, dados in contratos.items():
        problemas += validar_java(dados, nome)
    if problemas:
        raise ValueError("\n".join(problemas))
    por_idioma = {dados["idioma"]: (nome, dados) for nome, dados in contratos.items()}
    idiomas = [i for i in IDIOMAS if i in por_idioma]
    gerados = {nome_arquivo(i): gerar_kt(por_idioma[i][1], por_idioma[i][0]) for i in idiomas}
    gerados[INDICE] = gerar_indice(idiomas)
    if escrever:
        saida.mkdir(parents=True, exist_ok=True)
        for nome, conteudo in gerados.items():
            (saida / nome).write_text(conteudo, encoding="utf-8", newline="\n")
    return gerados


def desatualizados(pasta_contratos: Path = CONTRATOS, saida: Path = SAIDA) -> list[str]:
    """Arquivos gerados que faltam, diferem do que o contrato produz hoje ou sobram (Lexico*.kt de idioma que saiu do contrato)."""
    esperados = gerar(pasta_contratos, saida, escrever=False)
    ruins = [n for n, c in esperados.items() if not (saida / n).exists() or (saida / n).read_text(encoding="utf-8") != c]
    if saida.exists():
        for arq in sorted(saida.glob("Lexico*.kt")):
            if arq.name not in esperados and arq.name != "Lexico.kt":
                ruins.append(arq.name)
    return ruins


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="não escreve; falha se algum gerado estiver desatualizado")
    args = ap.parse_args(argv)
    try:
        if args.check:
            ruins = desatualizados()
            if ruins:
                print("léxicos Kotlin desatualizados: " + ", ".join(ruins) + " (rode python tools/gerar_lexico_kt.py)")
                return 1
            print("léxicos Kotlin em dia")
            return 0
        for nome in gerar():
            print(f"✔ {(SAIDA / nome).relative_to(RAIZ)}")
        return 0
    except ValueError as e:
        print(f"ERRO nos contratos de léxico:\n{e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
