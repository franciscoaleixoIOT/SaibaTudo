# -*- coding: utf-8 -*-
"""Família COMPARAÇÕES: raciocínio entre elementos, SEMPRE decidido pelos valores do pacote (`elementos.json`).

  - pares vizinhos do MESMO GRUPO e do MESMO PERÍODO ("qual é mais eletronegativo, F ou Cl?", "qual átomo é maior, Na ou Mg?");
  - trios vizinhos ("ordene Li, Na e K por raio atômico");
  - extremos de um grupo/período ("qual o elemento mais denso do período 4?").

Só entram elementos que têm o valor no pacote (sem valor = fora da comparação; nos extremos, a resposta diz quem ficou sem valor).
A tendência periódica geral aparece apenas como EXPLICAÇÃO e só quando um trecho licenciado do pacote a enuncia: a frase é citada
literalmente, entre aspas, com a fonte (id, URL e licença em `fontes`); o gerador confere que a frase existe no trecho. Se os valores
fogem da tendência, a resposta diz isso e que vale o valor medido. Números: só valores do pacote (e °C convertido de K por definição).
"""
import re

from calculo import ZERO_CELSIUS_K
from comum import Resp, cap, com_artigo, dec, renderizar
from pacote import fontes_do_registro
from qa_base import Ctx, SubCtx, fonte_trecho, sup_elemento

FAM = "comparacoes"
ALTERACAO = "citação literal de uma frase do trecho"

# Tendências enunciadas em trechos do pacote (Wikilivros, CC BY-SA). previsao(a, b) devolve o elemento que a TENDÊNCIA aponta como o de
# MAIOR valor (ou None se a frase não decide o par). A frase é procurada literalmente no trecho; se não estiver lá, não é citada.
_PERTO_DO_FLUOR = "Na tabela periódica, quanto mais próximo um elemento encontra-se do flúor, maior é sua eletronegatividade."
TENDENCIAS = {
    "eletronegatividade": {
        "periodo": ("wikilivros-pt-quimica-inorganica-introducao-tabela-e-propriedades-periodicas-004", _PERTO_DO_FLUOR, None,
                    lambda a, b: a if a["z"] > b["z"] else b),
        "grupo": ("wikilivros-pt-quimica-inorganica-introducao-tabela-e-propriedades-periodicas-004", _PERTO_DO_FLUOR, None,
                  lambda a, b: a if a["periodo"] < b["periodo"] else b),
    },
    "raioAtomicoPm": {
        "periodo": ("wikilivros-pt-introducao-a-quimica-propriedades-da-materia-001",
                    "O átomo que apresenta maior numero de prótons exerce uma maior atração sobre seus elétrons.",
                    "no mesmo período, isso tende a diminuir o raio", lambda a, b: a if a["z"] < b["z"] else b),
        "grupo": ("wikilivros-pt-introducao-a-quimica-propriedades-da-materia-001", "Quanto maior o numero de níveis, maior será o tamanho do átomo.",
                  "descendo no grupo, o número de níveis aumenta", lambda a, b: a if a["periodo"] > b["periodo"] else b),
    },
    "energiaIonizacaoKJmol": {
        "periodo": ("wikilivros-pt-introducao-a-quimica-propriedades-da-materia-002",
                    "Em um mesmo período a energia de ionização aumenta da esquerda para a direita.", None,
                    lambda a, b: a if a["z"] > b["z"] else b),
        "grupo": ("wikilivros-pt-introducao-a-quimica-propriedades-da-materia-002", "Em uma mesma família esta energia aumenta de baixo para cima.", None,
                  lambda a, b: a if a["periodo"] < b["periodo"] else b),
    },
    "densidadeKgm3": {
        "grupo": ("wikilivros-pt-introducao-a-quimica-propriedades-da-materia-003", "Numa família: A densidade cresce de cima para baixo.", None,
                  lambda a, b: a if a["periodo"] > b["periodo"] else b),
    },
}

# campo -> (rótulo, sufixo de unidade, nível, modelos de par [(texto, sentido, frase do vencedor)], modelos de trio [(texto, ordem)])
#   sentido: "maior" (o vencedor tem o MAIOR valor) | "menor"; ordem: "crescente" | "decrescente"
PROPS = {
    "eletronegatividade": ("eletronegatividade", " na escala de Pauling", "medio", [
        ("Qual é mais eletronegativo, {a} ou {b}?", "maior", "é mais eletronegativo"),
        ("Quem é mais eletronegativo: {a} ou {b}?", "maior", "é mais eletronegativo"),
        ("Qual é menos eletronegativo, {a} ou {b}?", "menor", "é menos eletronegativo"),
        ("Entre {a} e {b}, qual tem maior eletronegatividade?", "maior", "tem a maior eletronegatividade"),
        ("Qual atrai mais os elétrons de uma ligação, {a} ou {b}?", "maior", "atrai mais os elétrons de uma ligação (tem a maior eletronegatividade)"),
        ("{a} ou {b}: qual tem menor eletronegatividade?", "menor", "tem a menor eletronegatividade"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de eletronegatividade.", "crescente"),
        ("Ordene {a}, {b} e {c} do mais eletronegativo para o menos eletronegativo.", "decrescente"),
        ("Coloque {a}, {b} e {c} em ordem decrescente de eletronegatividade.", "decrescente"),
    ]),
    "raioAtomicoPm": ("raio atômico (van der Waals)", " pm", "medio", [
        ("Qual átomo é maior, {a} ou {b}?", "maior", "tem o átomo maior (maior raio atômico de van der Waals)"),
        ("Qual tem maior raio atômico: {a} ou {b}?", "maior", "tem o maior raio atômico de van der Waals"),
        ("Entre {a} e {b}, qual tem o menor raio atômico?", "menor", "tem o menor raio atômico de van der Waals"),
        ("Qual átomo é menor: {a} ou {b}?", "menor", "tem o átomo menor (menor raio atômico de van der Waals)"),
        ("Compare o raio atômico {a_de} e {b_de}: qual é maior?", "maior", "tem o maior raio atômico de van der Waals"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de raio atômico.", "crescente"),
        ("Ordene os átomos {a}, {b} e {c} do maior para o menor.", "decrescente"),
        ("Coloque {a}, {b} e {c} em ordem decrescente de raio atômico.", "decrescente"),
    ]),
    "energiaIonizacaoKJmol": ("energia de ionização", " kJ/mol", "superior", [
        ("Qual tem maior energia de ionização, {a} ou {b}?", "maior", "tem a maior energia de ionização"),
        ("Entre {a} e {b}, qual tem a menor energia de ionização?", "menor", "tem a menor energia de ionização"),
        ("É mais fácil tirar um elétron {a_de} ou {b_de}?", "menor", "perde um elétron com mais facilidade (tem a menor energia de ionização)"),
        ("Qual precisa de mais energia para perder um elétron: {a} ou {b}?", "maior", "precisa de mais energia (tem a maior energia de ionização)"),
        ("Compare a energia de ionização {a_de} e {b_de}.", "maior", "tem a maior energia de ionização"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de energia de ionização.", "crescente"),
        ("Coloque {a}, {b} e {c} em ordem decrescente de energia de ionização.", "decrescente"),
    ]),
    "pontoFusaoK": ("ponto de fusão", " K", "medio", [
        ("Qual tem maior ponto de fusão, {a} ou {b}?", "maior", "tem o maior ponto de fusão"),
        ("Qual derrete a uma temperatura mais alta: {a} ou {b}?", "maior", "derrete a uma temperatura mais alta (maior ponto de fusão)"),
        ("Entre {a} e {b}, qual tem o menor ponto de fusão?", "menor", "tem o menor ponto de fusão"),
        ("Qual funde a uma temperatura mais baixa, {a} ou {b}?", "menor", "funde a uma temperatura mais baixa (menor ponto de fusão)"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de ponto de fusão.", "crescente"),
        ("Coloque {a}, {b} e {c} do maior para o menor ponto de fusão.", "decrescente"),
    ]),
    "pontoEbulicaoK": ("ponto de ebulição", " K", "medio", [
        ("Qual tem maior ponto de ebulição, {a} ou {b}?", "maior", "tem o maior ponto de ebulição"),
        ("Qual ferve a uma temperatura mais baixa: {a} ou {b}?", "menor", "ferve a uma temperatura mais baixa (menor ponto de ebulição)"),
        ("Entre {a} e {b}, qual tem o menor ponto de ebulição?", "menor", "tem o menor ponto de ebulição"),
        ("Qual precisa de temperatura mais alta para ferver, {a} ou {b}?", "maior", "precisa de temperatura mais alta para ferver (maior ponto de ebulição)"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de ponto de ebulição.", "crescente"),
        ("Coloque {a}, {b} e {c} do maior para o menor ponto de ebulição.", "decrescente"),
    ]),
    "densidadeKgm3": ("densidade", " kg/m³", "medio", [
        ("Qual é mais denso, {a} ou {b}?", "maior", "é mais denso"),
        ("Qual tem maior densidade: {a} ou {b}?", "maior", "tem a maior densidade"),
        ("Qual é menos denso, {a} ou {b}?", "menor", "é menos denso"),
        ("Entre {a} e {b}, qual tem a menor densidade?", "menor", "tem a menor densidade"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de densidade.", "crescente"),
        ("Coloque {a}, {b} e {c} do mais denso para o menos denso.", "decrescente"),
    ]),
    "massaAtomica": ("massa atômica", " u", "medio", [
        ("Qual tem maior massa atômica, {a} ou {b}?", "maior", "tem a maior massa atômica"),
        ("Qual átomo é mais pesado: {a} ou {b}?", "maior", "é mais pesado (maior massa atômica)"),
        ("Qual é mais leve, {a} ou {b}?", "menor", "é mais leve (menor massa atômica)"),
        ("Entre {a} e {b}, qual tem a menor massa atômica?", "menor", "tem a menor massa atômica"),
    ], [
        ("Ordene {a}, {b} e {c} em ordem crescente de massa atômica.", "crescente"),
        ("Coloque {a}, {b} e {c} do mais pesado para o mais leve.", "decrescente"),
    ]),
}
# extremos: (texto com {onde}, sentido, frase do vencedor)
EXTREMOS = {
    "eletronegatividade": [("Qual é o elemento mais eletronegativo {onde}?", "maior", "o mais eletronegativo"),
                           ("Qual é o elemento menos eletronegativo {onde}?", "menor", "o menos eletronegativo")],
    "raioAtomicoPm": [("Qual elemento {onde} tem o maior raio atômico?", "maior", "o de maior raio atômico de van der Waals"),
                      ("Qual elemento {onde} tem o menor raio atômico?", "menor", "o de menor raio atômico de van der Waals")],
    "energiaIonizacaoKJmol": [("Qual elemento {onde} tem a maior energia de ionização?", "maior", "o de maior energia de ionização"),
                              ("Qual elemento {onde} perde um elétron com mais facilidade?", "menor", "o de menor energia de ionização")],
    "pontoFusaoK": [("Qual elemento {onde} tem o maior ponto de fusão?", "maior", "o de maior ponto de fusão"),
                    ("Qual elemento {onde} tem o menor ponto de fusão?", "menor", "o de menor ponto de fusão")],
    "pontoEbulicaoK": [("Qual elemento {onde} tem o maior ponto de ebulição?", "maior", "o de maior ponto de ebulição"),
                       ("Qual elemento {onde} tem o menor ponto de ebulição?", "menor", "o de menor ponto de ebulição")],
    "densidadeKgm3": [("Qual é o elemento mais denso {onde}?", "maior", "o mais denso"),
                      ("Qual é o elemento menos denso {onde}?", "menor", "o menos denso")],
    "massaAtomica": [("Qual elemento {onde} tem a maior massa atômica?", "maior", "o de maior massa atômica"),
                     ("Qual elemento {onde} tem a menor massa atômica?", "menor", "o de menor massa atômica")],
}
TRIOS_POR_PROPRIEDADE = 30


def P(e, campo):
    return f"elementos.json#{e['simbolo']}.{campo}"


def nome_el(e):
    return e["nome"][:1].lower() + e["nome"][1:]


def o_el(e):
    return com_artigo(e["nome"], "", elemento=True)


def do_el(e):
    return com_artigo(e["nome"], "de", elemento=True)


def _fonte_valores(els):
    nomes = []
    for e in els:
        fs = e.get("fontes") or []
        nome = fs[0]["nome"] if fs else "PubChem"
        nome = "PubChem" if nome.lower().startswith("pubchem") else nome
        if nome not in nomes:
            nomes.append(nome)
    return " Fonte dos valores: " + ", ".join(nomes) + "."


def _fontes(els, trecho=None):
    out = []
    for e in els:
        for f in fontes_do_registro(e):
            if f not in out:
                out.append(f)
    if trecho is not None:
        out.append(fonte_trecho(trecho, ALTERACAO))
    return out


def valor_txt(e, campo, r: Resp, unidade=True, entre_parenteses=False):
    """Valor do pacote com unidade; temperaturas também em °C (conversão por definição, mesmas casas decimais do valor em K).
    `unidade=False` só para a escala de Pauling, que não se repete no segundo valor ("3,98 na escala de Pauling, contra 3,44").
    `entre_parenteses`: o valor já está dentro de parênteses (trios), então °C vem depois de uma barra, não em outro parêntese."""
    unid = PROPS[campo][1] if (unidade or campo != "eletronegatividade") else ""
    v = r.pkg(e[campo], P(e, campo))
    if campo in ("pontoFusaoK", "pontoEbulicaoK"):
        dk = dec(e[campo])
        casas = max(0, -dk.normalize().as_tuple().exponent)
        c = r.calc_casas(dk - ZERO_CELSIUS_K, f"{campo}_celsius", casas)
        return f"{v}{unid} / {c} °C" if entre_parenteses else f"{v}{unid} ({c} °C)"
    return f"{v}{unid}"


def _norm_ws(s):
    return re.sub(r"\s+", " ", s or "").strip()


def tendencia(pac, campo, eixo):
    """(texto do pacote, frase citada, complemento, previsão) se o trecho existe e contém a frase LITERALMENTE; senão None."""
    item = TENDENCIAS.get(campo, {}).get(eixo)
    if not item:
        return None
    tid, frase, compl, prev = item
    t = pac.textos.get(tid)
    if not t or _norm_ws(frase) not in _norm_ws((t.get("textoPt") or "") + " " + (t.get("textoOriginal") or "")):
        return None
    return t, frase, compl, prev


def _frase_tendencia(tend, eixo, n, segue):
    t, frase, compl, _ = tend
    onde = f"Os {'dois' if n == 2 else 'três'} estão no mesmo {'período' if eixo == 'periodo' else 'grupo'}"
    fonte = (t.get("fonte") or "").split(" (")[0].replace("Wikilivros (Wikibooks)", "Wikilivros")
    txt = f" {onde}. Tendência geral ({fonte}): “{frase.rstrip('.')}”" + (f"; {compl}." if compl else ".")
    if segue is True:
        txt += " Aqui os valores seguem essa tendência."
    elif segue is False:
        txt += " Aqui os valores fogem dessa tendência geral: vale o valor medido."
    return txt


def _vizinhos(pac, campo, eixo):
    """Listas ordenadas de elementos com o valor, por grupo (ordem de período) ou por período (ordem de Z)."""
    grupos = {}
    for e in pac.elementos:
        if e.get(campo) is None:
            continue
        chave = e.get("grupo") if eixo == "grupo" else e.get("periodo")
        if chave is None:
            continue
        grupos.setdefault(chave, []).append(e)
    for k in grupos:
        grupos[k].sort(key=lambda x: (x["periodo"], x["z"]) if eixo == "grupo" else x["z"])
    return grupos


def _sup(sub, e, prep):
    return sup_elemento(sub, e, prep, True)


def _par(sub: SubCtx, campo, a, b, eixo):
    pac, rng = sub.pac, sub.rng
    rotulo, _, nivel, modelos, _ = PROPS[campo]
    modelo, sentido, frase_venc = rng.choice(modelos)
    x, y = (a, b) if rng.random() < 0.5 else (b, a)  # ordem na pergunta: o vencedor nem sempre vem primeiro
    vals = {"a": _sup(sub, x, ""), "b": _sup(sub, y, ""), "a_de": _sup(sub, x, "de"), "b_de": _sup(sub, y, "de")}
    pergunta = renderizar(modelo, vals, rng)
    r = Resp()
    va, vb = dec(a[campo]), dec(b[campo])
    tend = tendencia(pac, campo, eixo)
    trecho = None
    if va == vb:
        texto = (f"{cap(o_el(a))} ({a['simbolo']}) e {o_el(b)} ({b['simbolo']}) têm o mesmo valor de {rotulo} no pacote de dados: "
                 f"{valor_txt(a, campo, r)}.{_fonte_valores([a, b])}")
    else:
        maior, menor = (a, b) if va > vb else (b, a)
        venc, perd = (maior, menor) if sentido == "maior" else (menor, maior)
        texto = (f"{cap(o_el(venc))} ({venc['simbolo']}) {frase_venc}: {valor_txt(venc, campo, r)}, contra "
                 f"{valor_txt(perd, campo, r, unidade=False)} {do_el(perd)} ({perd['simbolo']}).")
        if tend:
            previsto = tend[3](a, b)
            texto += _frase_tendencia(tend, eixo, 2, previsto is maior)
            trecho = tend[0]
        texto += _fonte_valores([venc, perd])
    s1, s2 = sorted([a, b], key=lambda e: e["z"])
    venc_s = None if va == vb else (venc["simbolo"])
    extra = {"comparacao": {"campo": campo, "eixo": eixo, "sentido": sentido, "elementos": [x["simbolo"], y["simbolo"]], "vencedor": venc_s}}
    ok = sub.add(f"cmp-{campo}-{s1['simbolo']}-{s2['simbolo']}", pergunta, texto, r, "fato", nivel,
                 {"elementos": [x["simbolo"], y["simbolo"]]}, _fontes([a, b], trecho), f"template:comparacao.par.{campo}.{eixo}", FAM, extra)
    sub.stats[f"comparacoes_par_{'ok' if ok else 'descartado'}"] += 1


def _trio(sub: SubCtx, campo, trio, eixo):
    pac, rng = sub.pac, sub.rng
    rotulo, _, nivel, _, modelos = PROPS[campo]
    modelo, ordem = rng.choice(modelos)
    embaralhado = list(trio)
    rng.shuffle(embaralhado)
    vals = {k: _sup(sub, e, "") for k, e in zip("abc", embaralhado)}
    pergunta = renderizar(modelo, vals, rng)
    r = Resp()
    crescente = sorted(trio, key=lambda e: (dec(e[campo]), e["z"]))
    seq = crescente if ordem == "crescente" else list(reversed(crescente))
    partes, sinais = [], []
    for i, e in enumerate(seq):
        partes.append(f"{nome_el(e)} ({e['simbolo']}, {valor_txt(e, campo, r, entre_parenteses=True)})")
        if i < len(seq) - 1:
            igual = dec(e[campo]) == dec(seq[i + 1][campo])
            sinais.append("=" if igual else ("<" if ordem == "crescente" else ">"))
    corpo = partes[0] + "".join(f" {s} {p}" for s, p in zip(sinais, partes[1:]))
    texto = f"Em ordem {ordem} de {rotulo}: {corpo}."
    tend = tendencia(pac, campo, eixo)
    trecho = None
    if tend:
        # a tendência prevê, par a par, quem tem o maior valor; a ordem "segue" se todos os pares concordam com os valores
        pares = [(trio[i], trio[j]) for i in range(3) for j in range(i + 1, 3) if dec(trio[i][campo]) != dec(trio[j][campo])]
        segue = all((tend[3](p, q) is (p if dec(p[campo]) > dec(q[campo]) else q)) for p, q in pares) if pares else None
        texto += _frase_tendencia(tend, eixo, 3, segue)
        trecho = tend[0]
    texto += _fonte_valores(trio)
    simbs = "-".join(e["simbolo"] for e in sorted(trio, key=lambda e: e["z"]))
    extra = {"comparacao": {"campo": campo, "eixo": eixo, "ordem": ordem, "elementos": [e["simbolo"] for e in embaralhado],
                            "resultado": [e["simbolo"] for e in seq]}}
    sub.add(f"cmp3-{campo}-{simbs}", pergunta, texto, r, "fato", nivel, {"elementos": [e["simbolo"] for e in embaralhado]},
            _fontes(trio, trecho), f"template:comparacao.trio.{campo}.{eixo}", FAM, extra)


def _extremo(sub: SubCtx, campo, eixo, chave, membros_todos):
    pac, rng = sub.pac, sub.rng
    rotulo, _, nivel, _, _ = PROPS[campo]
    com = [e for e in membros_todos if e.get(campo) is not None]
    sem = [e for e in membros_todos if e.get(campo) is None]
    if len(com) < 3:
        return
    modelo, sentido, frase = rng.choice(EXTREMOS[campo])
    r = Resp()
    ref = com[0]
    num = r.pkg(chave, P(ref, "grupo" if eixo == "grupo" else "periodo"))
    onde_q = f"do {'grupo' if eixo == 'grupo' else 'período'} {chave}"
    pergunta = renderizar(modelo, {"onde": onde_q}, rng)
    ordenados = sorted(com, key=lambda e: (dec(e[campo]), e["z"]))
    alvo = ordenados[-1] if sentido == "maior" else ordenados[0]
    empatados = [e for e in com if dec(e[campo]) == dec(alvo[campo]) and e is not alvo]
    if empatados:
        return  # empate no extremo: a pergunta "qual é o..." não tem resposta única
    outro = ordenados[0] if sentido == "maior" else ordenados[-1]
    lugar = f"{'grupo' if eixo == 'grupo' else 'período'} {num}"
    texto = (f"Entre os elementos do {lugar} que têm {rotulo} no pacote de dados, {frase} é {o_el(alvo)} ({alvo['simbolo']}), com "
             f"{valor_txt(alvo, campo, r)}. No outro extremo está {o_el(outro)} ({outro['simbolo']}), com {valor_txt(outro, campo, r, unidade=False)}.")
    if sem:
        texto += " Sem esse valor no pacote: " + ", ".join(f"{nome_el(e)} ({e['simbolo']})" for e in sem) + "."
    texto += _fonte_valores([alvo, outro])
    extra = {"comparacao": {"campo": campo, "eixo": eixo, "sentido": sentido, "chave": chave, "vencedor": alvo["simbolo"],
                            "semValor": [e["simbolo"] for e in sem]}}
    sub.add(f"cmpx-{campo}-{eixo}-{chave}", pergunta, texto, r, "fato", nivel, {"elementos": [alvo["simbolo"], outro["simbolo"]]},
            _fontes([alvo, outro]), f"template:comparacao.extremo.{campo}.{eixo}", FAM, extra)


def gerar(ctx: Ctx):
    sub = SubCtx(ctx, FAM)
    pac, rng = sub.pac, sub.rng
    for campo in PROPS:
        for eixo in ("grupo", "periodo"):
            for _, membros in sorted(_vizinhos(pac, campo, eixo).items()):
                for a, b in zip(membros, membros[1:]):
                    _par(sub, campo, a, b, eixo)
        trios = []
        for eixo in ("grupo", "periodo"):
            for _, membros in sorted(_vizinhos(pac, campo, eixo).items()):
                trios += [(eixo, membros[i:i + 3]) for i in range(len(membros) - 2)]
        for eixo, trio in rng.sample(trios, min(TRIOS_POR_PROPRIEDADE, len(trios))):
            _trio(sub, campo, trio, eixo)
        for eixo in ("grupo", "periodo"):
            todos = {}
            for e in pac.elementos:
                k = e.get("grupo") if eixo == "grupo" else e.get("periodo")
                if k is not None:
                    todos.setdefault(k, []).append(e)
            for chave, membros in sorted(todos.items()):
                _extremo(sub, campo, eixo, chave, membros)
