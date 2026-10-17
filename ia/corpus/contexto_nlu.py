# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — formato do campo `contexto` (multi-turno) na entrada do NLU, desde o v3.4 (16/10/2026).

Proposta (o serviço e os clientes AINDA NÃO a implementam; ver ia/treino/README.md, seção "v3.4"): quando o usuário faz uma pergunta de
continuação ("e o do potássio?", "e em gramas?", "desenhe"), o cliente manda junto a interpretação da pergunta ANTERIOR já resolvida — o
JSON do NLU no formato do contrato do app (`nlu_core.format_output`: intenção + entidades, composto como texto) — e a mensagem do usuário
no prompt passa a ter duas linhas:

    contexto: {"intent": "MASSA_MOLAR", "composto": "NaCl"}
    e a do KCl?

Sem contexto, a mensagem continua sendo só a pergunta (idêntica ao v3.3: nada muda para quem não manda contexto). O system prompt não
muda. A saída é a de uma pergunta completa: a entidade herdada aparece no JSON ({"intent": "MASSA_MOLAR", "composto": "KCl"}).

Este módulo é a ÚNICA definição do formato no treino e no gate (montar_corpus.py, quimica_v34.py, avaliar_gguf.py). Sem dependências.
"""
import json
import re

PREFIXO = "contexto: "
SEPARADOR = "\n"
_CTX = re.compile(r"^contexto: (\{.*\})\n(.*)$", re.S)


def montar_entrada(contexto_json: str, pergunta: str) -> str:
    """Mensagem do usuário com contexto. `contexto_json` já no formato do contrato (format_output); `pergunta` já limpa."""
    if not contexto_json:
        return pergunta
    if "\n" in contexto_json or "\n" in pergunta:
        raise ValueError("contexto e pergunta não podem ter quebra de linha")
    json.loads(contexto_json)  # tem de ser JSON
    return f"{PREFIXO}{contexto_json}{SEPARADOR}{pergunta}"


def separar_entrada(texto: str):
    """(contexto_json | None, pergunta). Inverso de montar_entrada; texto sem a linha de contexto devolve (None, texto)."""
    m = _CTX.match(texto or "")
    if not m:
        return None, texto
    return m.group(1), m.group(2)


def limpar_entrada(texto: str, core) -> str:
    """O que o serviço faria: valida a pergunta com `core.validate_question` (limpeza de produção) e o contexto com `has_valid_shape` +
    `format_output` (forma canônica), e remonta. Levanta ValueError como o serviço (400)."""
    ctx, q = separar_entrada(texto)
    q = core.validate_question(q)
    if ctx is None:
        return q
    obj = core.parse_model_output(ctx)
    if not core.has_valid_shape(obj):
        raise ValueError("contexto fora do contrato")
    return montar_entrada(core.format_output(obj), q)
