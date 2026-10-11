# -*- coding: utf-8 -*-
"""Família SEGURANÇA DO RÓTULO: para cada composto com classificação GHS HARMONIZADA no pacote (Regulamento CLP, Anexo VI, via PubChem):

  - o significado de cada frase de perigo (H) do rótulo, com o texto oficial em português (Anexo III do CLP, `ghs_frases.json`);
  - o que indica cada pictograma do rótulo (dicionário `ghs_pt.PICTOGRAMAS`);
  - a palavra de advertência (palavra de sinal) e o que ela indica;
  - os cuidados (frases P): o pacote NÃO traz frases de precaução, então a resposta diz isso, lista os perigos registrados e remete à
    ficha com dados de segurança (FDS/FISPQ). Nada de precaução é inventado.

Cada par leva `contexto` (os dados do pacote que o app mostraria: composto, CID, palavra de sinal, pictogramas, frases H): é a entrada
que o explicador recebe (backend/retrain/build_ask_dataset.py), de modo que a resposta só usa o que está no contexto.
"""
import re
from collections import Counter

import ghs_pt
from comum import Resp, cap, com_artigo, renderizar
from ghs_pt import PICTOGRAMAS, expandir_h, palavra_sinal_pt
from pacote import fontes_do_registro
from qa_base import FONTE_CLP, Ctx, SubCtx, nome_em_frase, sup_composto

FAM = "seguranca_rotulo"
SIGNIFICADO_PALAVRA = "no GHS, “Perigo” é usada para as categorias de perigo mais graves e “Atenção”, para as menos graves"

MODELOS_H = [
    "O que significa a frase {h} no rótulo {c_de}?", "O rótulo {c_de} traz a frase {h}. O que ela quer dizer?", "{h} no rótulo {c_de}: qual é o perigo?",
    "Qual o significado da frase de perigo {h} {c_de}?", "{c_cap} tem a frase {h} na classificação. Isso significa o quê?",
    "O que quer dizer {h} na ficha {c_de}?",
]
MODELOS_PICTO = [
    "O que indica o pictograma {p} no rótulo {c_de}?", "Por que o rótulo {c_de} tem o pictograma de {n}?", "O que quer dizer o símbolo de {n} na embalagem {c_de}?",
    "{c_cap} tem o pictograma {p}. O que ele significa?", "O pictograma {p} ({n}) {c_de} indica qual perigo?",
]
MODELOS_PALAVRA = [
    "Qual é a palavra de advertência no rótulo {c_de}?", "O rótulo {c_de} traz “Perigo” ou “Atenção”? O que isso indica?",
    "Qual a palavra de sinal {c_de} e o que ela significa?", "No rótulo {c_de}, a palavra de advertência é qual?",
]
MODELOS_P = [
    "Quais são as frases de precaução (P) {c_de}?", "Que cuidados o rótulo {c_de} recomenda?", "Quais as frases P {c_de}?",
    "Que cuidados devo ter ao manusear {c}?", "Quais precauções tomar com {c}?",
]


def _nome(pac, c, prep, r=None):
    nome = pac.nome_composto(c)
    if r is not None and re.search(r"\d", nome):
        r.lit(nome_em_frase(nome))
    return com_artigo(nome, prep, pendente=pac.comp_pendente(c))


def contexto_ghs(pac, c) -> str:
    """Bloco de dados do pacote sobre o rótulo do composto (o que o app mostra e envia ao explicador como CONTEXTO)."""
    g = c.get("ghs") or {}
    linhas = [f"Composto: {pac.nome_composto(c)} ({pac.formula_exibicao(c)}), PubChem CID {c['cid']}",
              "Classificação GHS harmonizada (Regulamento CLP, Anexo VI), registrada no pacote via PubChem; textos das frases: Regulamento CLP, Anexo III"]
    p = palavra_sinal_pt(g.get("palavraSinal"))
    if p:
        linhas.append(f"Palavra de sinal: {p} ({SIGNIFICADO_PALAVRA})")
    for pic in g.get("pictogramas") or []:
        nome_p, sig = PICTOGRAMAS.get(pic, (None, None))
        linhas.append(f"Pictograma {pic} ({nome_p}): {sig}" if nome_p else f"Pictograma {pic}")
    for h in g.get("frasesH") or []:
        t = expandir_h(h)
        linhas.append(f"Frase {h}: {t}" if t else f"Frase {h}: (sem texto oficial no pacote)")
    linhas.append("O pacote não traz frases de precaução (P) nem a ficha com dados de segurança (FDS/FISPQ) do produto")
    return "\n".join(linhas)


def lista_frases(c, r: Resp):
    """'H314 (Provoca queimaduras...); H335 (...)'; códigos sem texto oficial no pacote aparecem como tais, sem redação inventada."""
    itens = []
    for h in (c.get("ghs") or {}).get("frasesH") or []:
        t = expandir_h(h)
        if t:
            r.lit(t)
            r.lit(t.rstrip("."))
            itens.append(f"{h} ({t.rstrip('.')})")
        else:
            itens.append(f"{h} (texto oficial não disponível no pacote)")
    return "; ".join(itens)


def _valores(sub, c):
    c_de, _ = sup_composto(sub, c, "de")
    c_nu, _ = sup_composto(sub, c, "")
    return {"c_de": c_de, "c": c_nu, "c_cap": cap(c_nu)}


def _fontes(c):
    return fontes_do_registro(c, 2) + [FONTE_CLP]


def elegiveis(pac):
    cont = Counter(pac.nome_composto(c).lower() for c in pac.compostos)
    return [c for c in pac.compostos if (c.get("ghs") or {}).get("frasesH") and cont[pac.nome_composto(c).lower()] == 1 and pac.formula_exibicao(c)]


def gerar(ctx: Ctx):
    sub = SubCtx(ctx, FAM)
    pac, rng = sub.pac, sub.rng
    for c in elegiveis(pac):
        g = c["ghs"]
        cid = c["cid"]
        formula = pac.formula_exibicao(c)
        extra = {"contexto": contexto_ghs(pac, c)}
        ents = {"compostos": [cid]}
        # 1) cada frase H do rótulo
        for h in g.get("frasesH") or []:
            t = expandir_h(h)
            if not t:
                sub.stats["seguranca_rotulo_h_sem_texto"] += 1
                continue
            r = Resp()
            r.lit(t)
            vals = dict(_valores(sub, c), h=h)
            pergunta = renderizar(rng.choice(MODELOS_H), vals, rng)
            cid_txt = r.pkg_txt(str(cid), f"compostos#{cid}.cid")
            texto = (f"A frase {h}, que aparece na classificação harmonizada {_nome(pac, c, 'de', r)} ({formula}), significa: “{t}” "
                     f"(texto oficial do Regulamento CLP, Anexo III). Fonte da classificação: PubChem, CID {cid_txt} (Regulamento CLP, Anexo VI).")
            sub.add(f"sr-{cid}-{h}", pergunta, texto, r, "seguranca", "fundamental", ents, _fontes(c), "template:seguranca_rotulo.frase_h", FAM, extra)
        # 2) cada pictograma
        for pic in g.get("pictogramas") or []:
            if pic not in PICTOGRAMAS:
                continue
            nome_p, sig = PICTOGRAMAS[pic]
            r = Resp()
            vals = dict(_valores(sub, c), p=pic, n=nome_p)
            pergunta = renderizar(rng.choice(MODELOS_PICTO), vals, rng)
            lst = lista_frases(c, r)
            cid_txt = r.pkg_txt(str(cid), f"compostos#{cid}.cid")
            texto = (f"O pictograma {pic} ({nome_p}) no rótulo {_nome(pac, c, 'de', r)} ({formula}) indica perigo ligado a: {sig}. "
                     f"Na classificação harmonizada desse composto, as frases de perigo são: {lst}. "
                     f"Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III.")
            sub.add(f"sr-{cid}-{pic}", pergunta, texto, r, "seguranca", "fundamental", ents, _fontes(c), "template:seguranca_rotulo.pictograma", FAM, extra)
        # 3) palavra de advertência
        p = palavra_sinal_pt(g.get("palavraSinal"))
        if p:
            r = Resp()
            pergunta = renderizar(rng.choice(MODELOS_PALAVRA), _valores(sub, c), rng)
            cid_txt = r.pkg_txt(str(cid), f"compostos#{cid}.cid")
            texto = (f"No rótulo {_nome(pac, c, 'de', r)} ({formula}), a palavra de advertência (palavra de sinal) é “{p}”: {SIGNIFICADO_PALAVRA}. "
                     f"Fonte: PubChem, CID {cid_txt} (classificação harmonizada do Regulamento CLP).")
            sub.add(f"sr-{cid}-palavra", pergunta, texto, r, "seguranca", "fundamental", ents, _fontes(c), "template:seguranca_rotulo.palavra_sinal", FAM, extra)
        # 4) cuidados (frases P): ausentes do pacote -> resposta honesta
        r = Resp()
        pergunta = renderizar(rng.choice(MODELOS_P), _valores(sub, c), rng)
        lst = lista_frases(c, r)
        cid_txt = r.pkg_txt(str(cid), f"compostos#{cid}.cid")
        texto = (f"O pacote de dados não traz as frases de precaução (P) {_nome(pac, c, 'de', r)} ({formula}), por isso não as reproduzo. "
                 f"Os perigos harmonizados registrados são: {lst}. Os cuidados de manuseio, armazenamento, EPI e primeiros socorros estão na ficha com "
                 f"dados de segurança (FDS/FISPQ) do fornecedor: consulte-a antes de usar o produto. "
                 f"Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III.")
        sub.add(f"sr-{cid}-cuidados", pergunta, texto, r, "seguranca", "medio", ents, _fontes(c), "template:seguranca_rotulo.cuidados_sem_frases_p", FAM, extra)
    sub.stats["seguranca_rotulo_compostos"] = len(elegiveis(pac))
    sub.stats["seguranca_rotulo_fonte_frases"] = ghs_pt.FONTE_FRASES
