# -*- coding: utf-8 -*-
"""Família ESCOPO: perguntas de física, biologia e matemática pura, e pedidos de "faça o dever inteiro", com uma RESPOSTA DE LIMITE
educada (o que o app faz e como ajudar), sem número e sem recusa de segurança.

Tipo: `fato` (DATA_CONTRACT §7, sem mudar o esquema). Motivo: como as respostas de ausência ("o pacote não traz X"), é uma afirmação
determinística sobre a cobertura do app. `recusa` fica reservado aos pedidos perigosos (resposta padrão única, conferida por teste) e
`conceito` exige trecho licenciado. O explicador (backend/retrain/build_ask_dataset.py) só lê conceito/segurança/recusa, então estes
pares não mudam o treino dele; no NLU, as mesmas perguntas viram DESCONHECIDA (e o dever inteiro, AJUDA).
"""
from comum import Resp, finalizar
from dados_escopo import AREAS, RESPOSTAS
from qa_base import FONTE_AUTORIA, Ctx, SubCtx

FAM = "escopo"


def gerar(ctx: Ctx):
    sub = SubCtx(ctx, FAM)
    rng = sub.rng
    for area, perguntas in AREAS.items():
        for k, base in enumerate(perguntas):
            # a pergunta como escrita e uma variação de superfície (prefixo, caixa, pontuação), como nas outras famílias
            sufixo = 0.0 if base.rstrip("?.!").endswith("pra mim") else 0.3  # sem "pra mim pra mim"
            for j, q in enumerate([base, finalizar([(base, False)], rng, permitir_sem_acento=True, p_prefixo=0.5, p_sufixo=sufixo)]):
                sub.add(f"es-{area}-{k + 1}-{j + 1}", q, RESPOSTAS[area], Resp(), "fato", "fundamental", {}, [FONTE_AUTORIA],
                        f"template:escopo.{area}", FAM)
