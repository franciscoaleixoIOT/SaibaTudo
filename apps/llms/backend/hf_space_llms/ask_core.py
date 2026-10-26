# -*- coding: utf-8 -*-
"""Núcleo do prompt do explicador do SaibaTudo LLMs (o MESMO que o S4 usará no treino e na avaliação).

Papel: professor de como funcionam os modelos de linguagem. Responde SÓ no idioma pedido, usa só o CONTEXTO (resumo do gráfico: palavras,
eixos, cossenos — números calculados pelo app) e os TRECHOS (seções didáticas do app) para fatos e números, não inventa coordenadas nem
cossenos, recusa com uma frase o que não é sobre o app ou sobre modelos de linguagem, e termina sempre com o rodapé do idioma.
O verificador do servidor (api/_lib/fidelidade.js) rejeita número fora do enviado, ausência do rodapé e escrita errada.
"""
from __future__ import annotations

import json

MAX_NEW_TOKENS = 350
MAX_Q = 400
MIN_Q = 3
MAX_CONTEXT = 1500
MAX_TRECHOS = 3
MAX_TRECHO = 2000

IDIOMAS = ("pt-BR", "en", "es", "de", "fr", "zh")
NOMES_IDIOMA = {"pt-BR": "português do Brasil", "en": "English", "es": "español", "de": "Deutsch", "fr": "français", "zh": "简体中文"}
# o mesmo dicionário de api/_lib/fidelidade.js (RODAPES)
RODAPES = {"pt-BR": "texto gerado por IA", "en": "AI-generated text", "es": "texto generado por IA", "de": "KI-generierter Text", "fr": "texte généré par IA", "zh": "AI生成的文本"}
COMPLEMENTO_RODAPE = {"pt-BR": ", pode conter erros.", "en": ", may contain errors.", "es": ", puede contener errores.", "de": ", kann Fehler enthalten.", "fr": ", peut contenir des erreurs.", "zh": "，可能有误。"}


def validate_question(q) -> str:
    s = " ".join(str(q or "").split())
    if len(s) < MIN_Q or len(s) > MAX_Q:
        raise ValueError("question")
    return s


def validate_lang(lang) -> str:
    return lang if lang in IDIOMAS else "pt-BR"


def validate_context(context) -> str:
    s = " ".join(str(context or "").split())
    return s[:MAX_CONTEXT]


def parse_trechos(texto) -> list[dict]:
    """JSON [{id, texto}] → lista saneada (até MAX_TRECHOS, textos não vazios cortados em MAX_TRECHO). Vazio → []."""
    if not texto or not str(texto).strip():
        return []
    try:
        bruto = json.loads(texto)
    except json.JSONDecodeError as e:
        raise ValueError("trechos") from e
    if not isinstance(bruto, list):
        raise ValueError("trechos")
    saida = []
    for t in bruto:
        if not isinstance(t, dict):
            continue
        tid = str(t.get("id", ""))[:80]
        tx = " ".join(str(t.get("texto", "")).split())[:MAX_TRECHO]
        if tid and tx:
            saida.append({"id": tid, "texto": tx})
        if len(saida) >= MAX_TRECHOS:
            break
    return saida


def sistema(lang: str) -> str:
    nome = NOMES_IDIOMA[lang]
    rodape = RODAPES[lang] + COMPLEMENTO_RODAPE[lang]
    return (
        "Você é o assistente didático do SaibaTudo LLMs, um app que ensina como um modelo de linguagem funciona (tokens, embeddings, atenção, "
        "camadas, softmax e temperatura) com um gráfico 3D de vetores de palavras do GloVe (inglês, 50 dimensões).\n"
        f"Regras:\n1. Responda SOMENTE em {nome}, em até 3 parágrafos curtos, linguagem simples.\n"
        "2. Use apenas o CONTEXTO (o que o gráfico mostra agora, com números calculados pelo app) e os TRECHOS (seções do app) como fonte de fatos "
        "e números. NÃO invente coordenadas, cossenos, contagens, datas ou nomes de autores que não estejam no contexto ou nos trechos; se não "
        "souber, diga que o app não tem esse dado.\n"
        "3. Se o pedido não for sobre o app ou sobre modelos de linguagem/vetores de palavras, recuse em uma frase e sugira o que você pode explicar.\n"
        "4. Nunca peça nem repita dados pessoais.\n"
        f"5. Termine SEMPRE a resposta com exatamente esta frase final: \"{rodape}\""
    )


def build_messages(question: str, lang: str, context: str = "", trechos: list[dict] | None = None) -> list[dict]:
    partes = []
    if context:
        partes.append(f"CONTEXTO (o que o gráfico mostra agora):\n{context}")
    if trechos:
        partes.append("TRECHOS (seções didáticas do app):\n" + "\n".join(f"[{t['id']}] {t['texto']}" for t in trechos))
    partes.append(f"PERGUNTA ({NOMES_IDIOMA[lang]}): {question}")
    return [{"role": "system", "content": sistema(lang)}, {"role": "user", "content": "\n\n".join(partes)}]


def build_ask_prompt(tokenizer, question: str, lang: str, context: str = "", trechos: list[dict] | None = None) -> str:
    """Prompt pronto para o modelo (chat template do Qwen3, sem raciocínio)."""
    msgs = build_messages(question, lang, context, trechos)
    return tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
