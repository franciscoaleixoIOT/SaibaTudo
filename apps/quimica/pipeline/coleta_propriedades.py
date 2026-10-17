# -*- coding: utf-8 -*-
"""
Propriedades físicas MEDIDAS dos compostos, do Wikidata (CC0), com a origem de cada valor (DATA_CONTRACT §3.1).

Propriedades (Wikidata -> campo em `compostos[].propriedades`, unidades do contrato):
- P2101 ponto de fusão            -> `pontoFusaoK` (K)
- P2102 ponto de ebulição         -> `pontoEbulicaoK` (K)
- P2054 densidade                 -> `densidadeKgm3` (kg/m³)
- P2177 solubilidade em água      -> `solubilidadeAguaGL` (g/L; g/L, mg/L, g/m³, kg/m³) ou `solubilidadeAguaG100g` (g por 100 g de água;
                                     g/100 g e g/kg **de solvente**); só com o qualificador solvente (P2178) = água (Q283)
- P1117 pKa                       -> `pka` (o menor valor aceito = a primeira dissociação) e `pkaValores` (todos, crescente, quando há mais de um)
- derivado                        -> `estadoPadrao` ("solido" | "liquido" | "gas") a 298,15 K, comparando `pontoFusaoK`/`pontoEbulicaoK`
                                     (cálculo local; só fora de uma faixa de ±2 K em volta de 298,15 K)

Regras de aceitação de uma declaração (nada de valor calculado como se fosse medido):
- posto (`rank`) normal ou preferido; o depreciado fica fora;
- fora se tiver qualificador de valor aproximado/limite (P1480 "circa", "maior que"), critério máximo/mínimo (P1013, exceto VSMOW),
  método de determinação computacional (P459 diferente de ITS-90/temperatura termodinâmica), ponto triplo (P5102), "aplica-se a parte"
  (P518), motivo de depreciação (P2241) ou unidade desconhecida;
- fusão e ebulição: sem pressão (P2077) ou com pressão a 1 atm (95-107 kPa); outra pressão fica fora;
- densidade e solubilidade: temperatura (P2076) guardada nas condições; a mais próxima de 25 °C vence;
- **com referência** no próprio Wikidata (P248 "afirmado em" ou P854 URL de referência; P143 "importado de" a Wikipédia e afins não
  contam): sem referência fica fora (ex.: solubilidade da aspirina 0,003 g/L, sem referência, contra ~3 g/L medidos);
- faixa física plausível (0 < T < 7000 K; 0,05 < densidade < 25 000 kg/m³; pKa entre -15 e 60); fusão > ebulição descarta as duas;
- densidade com fase declarada (P515) diferente do estado a 298,15 K (ex.: hidrogênio líquido, 70,8 kg/m³) fica fora;
- pKa dos ácidos fortes da tabela `regras.ACIDOS_FORTES` fica fora: o pKa₁ é negativo e mal determinado, e o Wikidata costuma trazer só
  o da segunda dissociação sem dizer (ácido sulfúrico: 1,92 com referência, -3 sem).
Escolha entre várias declarações aceitas (em ordem): posto preferido > condições padrão > unidade original não Fahrenheit > mais algarismos significativos.
As outras declarações aceitas NÃO entram no pacote: vão para `<cache>/propriedades_wikidata_alternativas.json` (auditoria).
"""
import json
import re
from decimal import Decimal, InvalidOperation

import quimica_util as Q
import wikidata as W

LOTE = 100
URL_ITEM = "https://www.wikidata.org/wiki/{q}"
LICENCA = "CC0"

PROPS = {"P2101": "pontoFusaoK", "P2102": "pontoEbulicaoK", "P2054": "densidadeKgm3", "P2177": "solubilidade", "P1117": "pka"}
CAMPOS = ("pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "solubilidadeAguaGL", "solubilidadeAguaG100g", "pka", "pkaValores", "estadoPadrao")

AGUA = "Q283"
# unidade (QID) -> (símbolo, função para a unidade do contrato)
TEMPERATURA = {"Q11579": ("K", lambda x: x), "Q25267": ("°C", lambda x: x + Decimal("273.15")),
               "Q42289": ("°F", lambda x: (x + Decimal("459.67")) * 5 / 9)}
PRESSAO = {"Q44395": ("Pa", 1), "Q5139563": ("hPa", 100), "Q3495543": ("mbar", 100), "Q21064807": ("kPa", 1000),
           "Q103510": ("bar", 100000), "Q177974": ("atm", 101325), "Q185648": ("Torr", Decimal(101325) / 760),
           "Q6859652": ("mmHg", Decimal("133.322387415"))}
DENSIDADE = {"Q844211": ("kg/m³", 1), "Q13147228": ("g/cm³", 1000), "Q834105": ("g/L", 1), "Q21604951": ("g/m³", Decimal("0.001")),
             "Q21077820": ("g/mL", 1000)}
SOLUBILIDADE_GL = {"Q834105": ("g/L", 1), "Q55726194": ("mg/L", Decimal("0.001")), "Q21604951": ("g/m³", Decimal("0.001")),
                   "Q844211": ("kg/m³", 1)}
SOLUBILIDADE_G100G = {"Q21127659": ("g/100 g de solvente", 1), "Q60606516": ("g/kg de solvente", Decimal("0.1"))}
ADIMENSIONAL = {"Q199": ("1", 1), None: ("", 1)}

# qualificadores que tiram a declaração do pacote (P459/P1013 têm exceções)
QUALIF_EXCLUI = {"P1480", "P5102", "P518", "P2241"}
P459_OK = {"Q907684", "Q264647"}   # ITS-90, temperatura termodinâmica
P1013_OK = {"Q904874"}             # VSMOW (água)
REFERENCIAS_FRACAS = {"P143", "P4656", "P3452", "P887"}  # importado de / URL de importação / inferido de / baseado em heurística

T_PADRAO = Decimal("298.15")
EXIGIR_REFERENCIA = True
ATM = Decimal(101325)

CONSULTA = """SELECT ?item ?prop ?st ?rank ?amt ?unit
  (GROUP_CONCAT(DISTINCT ?qT; separator="|") AS ?temps) (GROUP_CONCAT(DISTINCT ?qP; separator="|") AS ?press)
  (GROUP_CONCAT(DISTINCT ?qX; separator="|") AS ?quals) (GROUP_CONCAT(DISTINCT ?rr; separator="|") AS ?refs) WHERE {
  VALUES ?item { %s }
  VALUES (?prop ?p ?psv) { ("P2101" p:P2101 psv:P2101) ("P2102" p:P2102 psv:P2102) ("P2054" p:P2054 psv:P2054)
                           ("P2177" p:P2177 psv:P2177) ("P1117" p:P1117 psv:P1117) }
  ?item ?p ?st . ?st ?psv ?v ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
  ?v wikibase:quantityAmount ?amt . OPTIONAL { ?v wikibase:quantityUnit ?unit }
  OPTIONAL { ?st pqv:P2076 ?t . ?t wikibase:quantityAmount ?ta . OPTIONAL { ?t wikibase:quantityUnit ?tu }
             BIND(CONCAT(STR(?ta), "@", STRAFTER(STR(?tu), "entity/")) AS ?qT) }
  OPTIONAL { ?st pqv:P2077 ?pr . ?pr wikibase:quantityAmount ?pa . OPTIONAL { ?pr wikibase:quantityUnit ?pu }
             BIND(CONCAT(STR(?pa), "@", STRAFTER(STR(?pu), "entity/")) AS ?qP) }
  OPTIONAL { ?st ?pqx ?qv . ?pqp wikibase:qualifier ?pqx .
             FILTER(?pqp IN (wd:P2178, wd:P1480, wd:P1013, wd:P459, wd:P5102, wd:P518, wd:P2241, wd:P515, wd:P1545))
             BIND(CONCAT(STRAFTER(STR(?pqp), "entity/"), "=", REPLACE(STR(?qv), "^http://www.wikidata.org/entity/", "")) AS ?qX) }
  OPTIONAL { ?st prov:wasDerivedFrom ?ref . ?ref ?prx ?rv . ?rpp wikibase:reference ?prx .
             FILTER(?rpp IN (wd:P248, wd:P854, wd:P143, wd:P4656, wd:P3452, wd:P887))
             OPTIONAL { ?rv rdfs:label ?rl . FILTER(LANG(?rl) = "en") }
             BIND(CONCAT(STRAFTER(STR(?rpp), "entity/"), "=", REPLACE(STR(?rv), "^http://www.wikidata.org/entity/", ""),
                         IF(BOUND(?rl), CONCAT("~", STR(?rl)), "")) AS ?rr) }
} GROUP BY ?item ?prop ?st ?rank ?amt ?unit"""


# ------------------------------------------------------------------------------------------------ leitura
def _dec(txt):
    try:
        return Decimal(str(txt).strip())
    except (InvalidOperation, ValueError, TypeError):
        return None


def _quantidades(txt):
    """'25@Q25267|...' -> [(Decimal, 'Q25267')]."""
    out = []
    for parte in W.valores(txt):
        v, _, u = parte.partition("@")
        d = _dec(v)
        if d is not None:
            out.append((d, u or None))
    return out


def _pares(txt):
    """'P2178=Q283|P1545=1' -> [('P2178', 'Q283'), ...]."""
    return [tuple(p.split("=", 1)) for p in W.valores(txt) if "=" in p]


def declaracao(linha):
    """Linha do SPARQL -> declaração normalizada (dict) ou None se faltar o essencial."""
    amt = _dec(linha.get("amt"))
    if amt is None:
        return None
    unit = W.qid(linha.get("unit")) if linha.get("unit") else None
    refs, refs_fracas = [], []
    for prop, val in _pares(linha.get("refs")):
        rotulo = None
        if "~" in val:
            val, rotulo = val.split("~", 1)
        (refs_fracas if prop in REFERENCIAS_FRACAS else refs).append({"prop": prop, "valor": val, "rotulo": rotulo})
    st = linha.get("st", "")
    return {"qid": W.qid(linha["item"]), "prop": linha["prop"], "id": st.rsplit("/", 1)[-1].replace("-", "$", 1),
            "preferido": linha.get("rank", "").endswith("PreferredRank"), "valor": amt, "unidade": unit,
            "temperaturas": _quantidades(linha.get("temps")), "pressoes": _quantidades(linha.get("press")),
            "qualificadores": _pares(linha.get("quals")), "referencias": refs, "referenciasFracas": refs_fracas}


def consultar(http, qids, log=print):
    """{QID: [declarações]} para os itens (lotes de LOTE, POST, cache HTTP). Devolve (por_qid, falhas)."""
    qids = sorted({q for q in qids if q and q.startswith("Q")}, key=lambda q: (len(q), q))
    por_qid, falhas = {}, []
    for i in range(0, len(qids), LOTE):
        lote = qids[i:i + LOTE]
        try:
            linhas = W.sparql(http, CONSULTA % " ".join(f"wd:{q}" for q in lote), post=True)
        except Exception as exc:  # noqa: BLE001
            falhas.append({"qids": f"{lote[0]}-{lote[-1]}", "erro": str(exc)[:160]})
            log(f"  [wikidata] propriedades físicas {lote[0]}-{lote[-1]} falharam: {exc}")
            continue
        for l in linhas:
            d = declaracao(l)
            if d:
                por_qid.setdefault(d["qid"], []).append(d)
        log(f"  [wikidata] propriedades físicas {min(i + LOTE, len(qids))}/{len(qids)}")
    return por_qid, falhas


# ------------------------------------------------------------------------------------------------ conversão e filtros
def _temperatura_k(d, u):
    conv = TEMPERATURA.get(u)
    return conv[1](d) if conv else None


def _pressao_pa(d, u):
    conv = PRESSAO.get(u)
    return d * conv[1] if conv else None


def _sig(d):
    """Algarismos significativos do valor como foi escrito."""
    t = d.as_tuple()
    digitos = "".join(map(str, t.digits)).lstrip("0")
    return len(digitos) or 1


def _num(d, casas):
    """Decimal -> int/float arredondado, sem artefatos (-0.0 vira 0)."""
    d = round(d, casas)
    if d == d.to_integral_value():
        return int(d)
    f = float(d)
    return 0 if f == 0 else f


def motivo_exclusao(dec):
    """Texto do motivo pelo qual a declaração não entra, ou None."""
    for prop, val in dec["qualificadores"]:
        if prop in QUALIF_EXCLUI:
            return f"qualificador {prop}={val}"
        if prop == "P459" and val not in P459_OK:
            return f"método de determinação {val}"
        if prop == "P1013" and val not in P1013_OK:
            return f"critério {val}"
    return None


def solvente(dec):
    return [v for p, v in dec["qualificadores"] if p == "P2178"]


def converter(dec):
    """(campo, valor Decimal na unidade do contrato, unidade original legível, condições) ou (None, motivo)."""
    prop, v, u = dec["prop"], dec["valor"], dec["unidade"]
    cond = {}
    if dec["temperaturas"]:
        t, tu = dec["temperaturas"][0]
        tk = _temperatura_k(t, tu)
        if tk is None:
            return None, f"unidade de temperatura desconhecida {tu}"
        cond["temperaturaK"] = tk
    if dec["pressoes"]:
        p, pu = dec["pressoes"][0]
        pa = _pressao_pa(p, pu)
        if pa is None:
            return None, f"unidade de pressão desconhecida {pu}"
        cond["pressaoPa"] = pa
    fases = [val for p, val in dec["qualificadores"] if p == "P515"]
    if fases:
        cond["fase"] = {"Q11438": "solido", "Q11435": "liquido", "Q11432": "gas"}.get(fases[0], fases[0])
    if prop in ("P2101", "P2102"):
        if u not in TEMPERATURA:
            return None, f"unidade desconhecida {u}"
        if "pressaoPa" in cond and not (Decimal(95000) <= cond["pressaoPa"] <= Decimal(107000)):
            return None, "pressão diferente de 1 atm"
        return (PROPS[prop], _temperatura_k(v, u), TEMPERATURA[u][0], cond), None
    if prop == "P2054":
        if u not in DENSIDADE:
            return None, f"unidade desconhecida {u}"
        return ("densidadeKgm3", v * DENSIDADE[u][1], DENSIDADE[u][0], cond), None
    if prop == "P2177":
        solv = solvente(dec)
        if AGUA not in solv:
            return None, "solvente não é água (ou não declarado)" if not solv else f"solvente {solv[0]}"
        if u in SOLUBILIDADE_GL:
            return ("solubilidadeAguaGL", v * SOLUBILIDADE_GL[u][1], SOLUBILIDADE_GL[u][0], cond), None
        if u in SOLUBILIDADE_G100G:
            return ("solubilidadeAguaG100g", v * SOLUBILIDADE_G100G[u][1], SOLUBILIDADE_G100G[u][0], cond), None
        return None, f"unidade de solubilidade não convertida {u}"
    if prop == "P1117":
        solv = solvente(dec)
        if solv and AGUA not in solv:
            return None, f"pKa em outro solvente {solv[0]}"
        if u not in ADIMENSIONAL:
            return None, f"unidade desconhecida {u}"
        return ("pka", v, "", cond), None
    return None, "propriedade fora do escopo"


def plausivel(campo, v):
    if campo in ("pontoFusaoK", "pontoEbulicaoK"):
        return Decimal(0) < v < Decimal(7000)
    if campo == "densidadeKgm3":
        return Decimal("0.05") < v < Decimal(25000)
    if campo.startswith("solubilidade"):
        return v >= 0
    if campo == "pka":
        return Decimal(-15) <= v <= Decimal(60)
    return True


def _pontuacao(dec, campo, cond, unidade_orig):
    """Maior = melhor (ver docstring do módulo)."""
    if campo in ("pontoFusaoK", "pontoEbulicaoK"):
        condicao = 2 if "pressaoPa" in cond else 1
        dist = Decimal(0)
    else:
        tk = cond.get("temperaturaK")
        if tk is None:
            condicao, dist = 1, Decimal(50)
        else:
            dist = abs(tk - T_PADRAO)
            condicao = 3 if dist <= 5 else 2 if dist <= 10 else 0
    return (int(dec["preferido"]), int(bool(dec["referencias"])), condicao, int(unidade_orig != "°F"), -dist, _sig(dec["valor"]), dec["id"])


def _referencia(dec):
    """Texto curto da referência declarada no Wikidata (afirmado em / URL), ou None."""
    partes = []
    for r in dec["referencias"]:
        if r["prop"] == "P248":
            partes.append(f"{r['rotulo']} ({r['valor']})" if r.get("rotulo") else r["valor"])
        elif r["prop"] == "P854":
            partes.append(r["valor"])
    vistos = []
    for p in partes:
        if p not in vistos:
            vistos.append(p)
    return "; ".join(vistos[:2]) or None


def fonte_valor(dec, unidade_orig, cond, hoje):
    """Origem de um valor (DATA_CONTRACT §3.1)."""
    f = Q.fonte("Wikidata", URL_ITEM.format(q=dec["qid"]) + f"#{dec['prop']}", LICENCA, hoje)
    f["declaracao"] = dec["id"]
    ref = _referencia(dec)
    if ref:
        f["referencia"] = ref
    f["valorOriginal"] = _num(dec["valor"], 6)
    if unidade_orig:
        f["unidadeOriginal"] = unidade_orig
    c = {}
    if "temperaturaK" in cond:
        c["temperaturaK"] = _num(cond["temperaturaK"], 2)
    if "pressaoPa" in cond:
        c["pressaoPa"] = _num(cond["pressaoPa"], 0)
    if "fase" in cond:
        c["fase"] = cond["fase"]
    if c:
        f["condicoes"] = c
    if cond.get("_corroborado"):
        f["semReferencia"] = True
        f["corroboradoPor"] = cond["_corroborado"]
    return f


def _contar(stats, motivo):
    chave = motivo.split(" Q")[0]
    stats.setdefault("descartadas", {})[chave] = stats.get("descartadas", {}).get(chave, 0) + 1


def _concordam(campo, a, b):
    if campo in ("pontoFusaoK", "pontoEbulicaoK"):
        return abs(a - b) <= 1
    return abs(a - b) <= Decimal("0.02") * max(abs(a), abs(b))


def _divergem(campo, a, b):
    if campo in ("pontoFusaoK", "pontoEbulicaoK"):
        return abs(a - b) > 5
    return abs(a - b) > Decimal("0.05") * max(abs(a), abs(b))


def _consenso(campo, lista):
    """Candidata escolhida (lista já ordenada pela pontuação). Se as declarações COM referência divergem (> 5 K; > 5 % nas
    demais), vence o grupo concordante maior; empate = nenhuma (o valor fica fora e vai para as alternativas). Temperatura de
    densidade/solubilidade diferente não é divergência: só se comparam candidatas com a mesma condição de pontuação."""
    topo = lista[0]
    temperatura = campo in ("pontoFusaoK", "pontoEbulicaoK")
    pares = [x for x in lista if x[1]["referencias"] and (temperatura or x[0][2] == topo[0][2])]
    if topo not in pares:
        pares.insert(0, topo)
    if not any(_divergem(campo, topo[2], x[2]) for x in pares):
        return topo
    grupos = []
    for x in pares:
        for g in grupos:
            if not _divergem(campo, g[0][2], x[2]):
                g.append(x)
                break
        else:
            grupos.append([x])
    grupos.sort(key=len, reverse=True)
    if len(grupos) > 1 and len(grupos[0]) == len(grupos[1]):
        return None
    return grupos[0][0]


CASAS = {"pontoFusaoK": 2, "pontoEbulicaoK": 2, "densidadeKgm3": 3, "solubilidadeAguaGL": 4, "solubilidadeAguaG100g": 4, "pka": 2}


def escolher(declaracoes, hoje, stats=None, exigir_referencia=None, acido_forte=False):
    """Declarações de UM item -> (propriedades, fontesPorPropriedade, alternativas). Ver as regras no docstring do módulo."""
    exigir_referencia = EXIGIR_REFERENCIA if exigir_referencia is None else exigir_referencia
    stats = stats if stats is not None else {}
    aceitas, sem_ref = {}, {}
    for dec in declaracoes:
        m = motivo_exclusao(dec)
        conv = None
        if m is None:
            conv, m = converter(dec)
        if conv is not None:
            campo, v, uo, cond = conv
            if not plausivel(campo, v):
                conv, m = None, "fora da faixa física plausível"
            elif campo == "pka" and acido_forte:
                conv, m = None, "pKa de ácido forte"
            elif exigir_referencia and not dec["referencias"]:
                sem_ref.setdefault(campo, []).append((_pontuacao(dec, campo, cond, uo), dec, v, uo, cond))
                continue
        if conv is None:
            _contar(stats, m)
            continue
        aceitas.setdefault(campo, []).append((_pontuacao(dec, campo, cond, uo), dec, v, uo, cond))
    # sem referência: só entra se o campo não tem nenhuma declaração com referência E duas declarações independentes concordam
    # (±1 K nas temperaturas, ±2 % nas demais; pKa nunca) — ex.: fusão da água (0 e 0,0025 °C, nenhuma com referência)
    for campo, lista in sem_ref.items():
        par = None
        if campo not in aceitas and campo != "pka":
            lista.sort(key=lambda x: x[0], reverse=True)
            for i, a in enumerate(lista):
                iguais = [b for b in lista if b is not a and _concordam(campo, a[2], b[2])]
                if iguais:
                    par = (a, 1 + len(iguais))
                    break
        if par:
            a, n = par
            a[4]["_corroborado"] = n
            aceitas[campo] = [a]
            stats["corroboradasSemReferencia"] = stats.get("corroboradasSemReferencia", 0) + 1
            for _ in range(len(lista) - 1):
                _contar(stats, "sem referência")
        else:
            for _ in lista:
                _contar(stats, "sem referência")
    # estado a 298,15 K pelas temperaturas escolhidas, antes da densidade (que depende da fase)
    def melhor(campo):
        lista = sorted(aceitas.get(campo, []), key=lambda x: x[0], reverse=True)
        return float(lista[0][2]) if lista else None
    est_prev = estado_a_298(melhor("pontoFusaoK"), melhor("pontoEbulicaoK"))
    if est_prev and "densidadeKgm3" in aceitas:
        fora = [x for x in aceitas["densidadeKgm3"] if x[4].get("fase") not in (None, est_prev)]
        if fora:
            stats.setdefault("descartadas", {}).setdefault("densidade de outra fase", 0)
            stats["descartadas"]["densidade de outra fase"] += len(fora)
            aceitas["densidadeKgm3"] = [x for x in aceitas["densidadeKgm3"] if x not in fora]
            if not aceitas["densidadeKgm3"]:
                del aceitas["densidadeKgm3"]
    props, fontes, alternativas = {}, {}, {}
    for campo, lista in aceitas.items():
        lista.sort(key=lambda x: x[0], reverse=True)
        if campo == "pka":
            # agrupa valores a menos de 0,5 (a mesma constante medida por fontes diferentes); um representante por grupo
            grupos = []
            for item in sorted(lista, key=lambda x: x[2]):
                if grupos and item[2] - grupos[-1][-1][2] < Decimal("0.5"):
                    grupos[-1].append(item)
                else:
                    grupos.append([item])
            reps = [max(g, key=lambda x: x[0]) for g in grupos]
            props["pka"] = _num(reps[0][2], CASAS["pka"])
            fontes["pka"] = fonte_valor(reps[0][1], reps[0][3], reps[0][4], hoje)
            if len(reps) > 1:
                props["pkaValores"] = [_num(r[2], CASAS["pka"]) for r in reps]
                fontes["pkaValores"] = [fonte_valor(r[1], r[3], r[4], hoje) for r in reps]
            usados = {r[1]["id"] for r in reps}
        else:
            escolhida = _consenso(campo, lista)
            if escolhida is None:
                stats["divergentes"] = stats.get("divergentes", 0) + 1
                stats.setdefault("divergentesPorCampo", {})[campo] = stats.get("divergentesPorCampo", {}).get(campo, 0) + 1
                alternativas[campo] = [{"valor": _num(x[2], CASAS[campo]), "declaracao": x[1]["id"], "temReferencia": bool(x[1]["referencias"])}
                                       for x in lista]
                continue
            _, dec, v, uo, cond = escolhida
            props[campo] = _num(v, CASAS[campo])
            fontes[campo] = fonte_valor(dec, uo, cond, hoje)
            usados = {dec["id"]}
        resto = [{"valor": _num(x[2], CASAS[campo]), "declaracao": x[1]["id"], "temReferencia": bool(x[1]["referencias"])}
                 for x in lista if x[1]["id"] not in usados]
        if resto:
            alternativas[campo] = resto
    # densidade incoerente com o estado a 298,15 K: < 20 kg/m³ só para gás (unidade trocada: g/cm³ gravado como kg/m³); gás com
    # > 20 kg/m³ é a densidade do líquido sem a fase declarada
    est = estado_a_298(props.get("pontoFusaoK"), props.get("pontoEbulicaoK"))
    d = props.get("densidadeKgm3")
    if d is not None and ((d < 20 and est != "gas") or (d > 20 and est == "gas")):
        _contar(stats, "densidade incoerente com o estado")
        props.pop("densidadeKgm3")
        fontes.pop("densidadeKgm3")
    # fusão acima da ebulição: erro de dado em uma das duas, nenhuma entra
    if "pontoFusaoK" in props and "pontoEbulicaoK" in props and props["pontoFusaoK"] >= props["pontoEbulicaoK"]:
        stats["fusaoAcimaDaEbulicao"] = stats.get("fusaoAcimaDaEbulicao", 0) + 1
        for campo in ("pontoFusaoK", "pontoEbulicaoK"):
            props.pop(campo)
            fontes.pop(campo)
    est = estado_a_298(props.get("pontoFusaoK"), props.get("pontoEbulicaoK"))
    if est:
        props["estadoPadrao"] = est
        fontes["estadoPadrao"] = {"nome": "derivado (SaibaTudo Química)", "licenca": "CC0",
                                  "metodo": "pontoFusaoK e pontoEbulicaoK do pacote comparados com 298,15 K (1 atm)",
                                  "acessadoEm": hoje}
    return props, fontes, alternativas


def estado_a_298(fusao_k, ebulicao_k, margem=2):
    """Estado físico a 298,15 K e 1 atm pela fusão/ebulição; None perto demais de 298,15 K ou sem o dado necessário."""
    t = float(T_PADRAO)
    if fusao_k is None:
        return None
    if fusao_k > t + margem:
        return "solido"
    if fusao_k >= t - margem or ebulicao_k is None or abs(ebulicao_k - t) <= margem:
        return None
    return "liquido" if ebulicao_k > t else "gas"


# ------------------------------------------------------------------------------------------------ etapa do build
def _acidos_fortes():
    try:
        import regras
        return {Q.sem_subscritos(a["formula"]) for a in regras.ACIDOS_FORTES}
    except Exception:  # noqa: BLE001
        return set()


def coletar(http, compostos, hoje, log=print, alternativas_em=None):
    """Acrescenta as propriedades medidas a `compostos` (in place): `propriedades[campo]` + `fontesPorPropriedade[campo]`.

    Campos já presentes (calculados do PubChem) não são tocados. Devolve stats (contagens por campo, descartes por motivo,
    falhas de rede). `alternativas_em`: caminho para gravar as declarações aceitas que não foram escolhidas (fora do pacote)."""
    qids = [c["wikidata"] for c in compostos if c.get("wikidata")]
    por_qid, falhas = consultar(http, qids, log)
    stats = {"itensConsultados": len(set(qids)), "itensComDeclaracao": len(por_qid), "falhas": falhas, "descartadas": {},
             "fusaoAcimaDaEbulicao": 0}
    contagem = {c: 0 for c in CAMPOS}
    alts = {}
    fortes = _acidos_fortes()
    for c in compostos:
        decs = por_qid.get(c.get("wikidata"))
        if not decs:
            continue
        forte = c.get("formula") in fortes or c.get("formulaHill") in fortes
        props, fontes, alt = escolher(decs, hoje, stats, acido_forte=forte)
        if not props:
            continue
        destino = c.setdefault("propriedades", {})
        fpp = c.setdefault("fontesPorPropriedade", {})
        for campo in CAMPOS:
            if campo in props and campo not in destino:
                destino[campo] = props[campo]
                fpp[campo] = fontes[campo]
                contagem[campo] += 1
        if not fpp:
            c.pop("fontesPorPropriedade")
        if alt:
            alts[str(c["cid"])] = {"wikidata": c.get("wikidata"), **alt}
    stats["compostosComPropriedade"] = contagem
    stats["compostosComAlguma"] = sum(1 for c in compostos if c.get("fontesPorPropriedade"))
    stats["comReferencia"] = {campo: sum(1 for c in compostos if isinstance(c.get("fontesPorPropriedade", {}).get(campo), dict)
                                         and c["fontesPorPropriedade"][campo].get("referencia")) for campo in CAMPOS}
    if alternativas_em:
        try:
            alternativas_em.parent.mkdir(parents=True, exist_ok=True)
            alternativas_em.write_text(json.dumps(alts, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        except OSError:
            pass
    stats["compostosComAlternativas"] = len(alts)
    return stats


_RE_CAMPO = re.compile(r"^[a-z][A-Za-z0-9]*$")


def validar_registro(c):
    """Erros de um composto quanto a `fontesPorPropriedade` (usado pelo validar() do build)."""
    erros = []
    fpp = c.get("fontesPorPropriedade")
    if fpp is None:
        return erros
    if not isinstance(fpp, dict):
        return [f"composto {c.get('cid')}: fontesPorPropriedade não é objeto"]
    props = c.get("propriedades") or {}
    for campo, f in fpp.items():
        if not _RE_CAMPO.match(campo) or campo not in props:
            erros.append(f"composto {c.get('cid')}: fontesPorPropriedade.{campo} sem valor em propriedades")
            continue
        lista = f if isinstance(f, list) else [f]
        if isinstance(f, list) != isinstance(props[campo], list) or (isinstance(f, list) and len(f) != len(props[campo])):
            erros.append(f"composto {c.get('cid')}: fontesPorPropriedade.{campo} não casa com o valor")
        for x in lista:
            if not isinstance(x, dict) or not x.get("nome") or not x.get("licenca") or not x.get("acessadoEm"):
                erros.append(f"composto {c.get('cid')}: fontesPorPropriedade.{campo} sem nome/licença/data")
            elif "PubChem" in x.get("nome", "") and "comput" in json.dumps(x).lower():
                erros.append(f"composto {c.get('cid')}: {campo} calculado pelo PubChem não pode passar por medido")
    for campo in ("pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3", "solubilidadeAguaGL", "solubilidadeAguaG100g", "pka"):
        if campo in props and campo not in fpp:
            erros.append(f"composto {c.get('cid')}: {campo} sem fonte por valor")
        if campo in props and not isinstance(props[campo], (int, float)):
            erros.append(f"composto {c.get('cid')}: {campo} não numérico")
    if "estadoPadrao" in props and props["estadoPadrao"] not in ("solido", "liquido", "gas"):
        erros.append(f"composto {c.get('cid')}: estadoPadrao inválido")
    return erros
