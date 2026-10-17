# -*- coding: utf-8 -*-
"""
Coleta dos 118 elementos (DATA_CONTRACT §2).

Fonte principal: PubChem Periodic Table (domínio público). Nomes em português: tabela fixa da SBQ (quimica_util).
Complementos via Wikidata (CC0): descobridor, CAS, QID, rótulos (conferência dos nomes) e massa atômica convencional
quando o PubChem a entrega com poucas casas (ex.: Li "7.0", Fe "55.84").
Nomes por idioma (`nomes`, docs/I18N.md §4): pt-BR = tabela da SBQ (`nome`), en = `nomeEn` do PubChem; es/de/fr = rótulo do
item do Wikidata (`wbgetentities`, CC0). Idioma sem rótulo = chave ausente (o cliente cai para o inglês e rotula).

Energia de ionização (1ª): Wikidata P2260 com qualificador "número de ordem" (P1545) = 1, posto não depreciado e referência
(no Wikidata elas citam o NIST ASD, que é "todos os direitos reservados": o valor é fato e vem do Wikidata, CC0; o NIST fica só
como referência citada). Sem declaração assim, fica o valor do PubChem. A origem de cada valor vai em `fontesPorPropriedade`.
Afinidade eletrônica: o Wikidata não tem a propriedade; fica o PubChem e, nos elementos que a conferência de 11/10/2026 achou
desatualizados (PENDENCIAS §10), `fontesPorPropriedade.afinidadeEletronicaKJmol.aviso`.

Unidades de saída (SI/contrato): K, kg/m³, pm, kJ/mol (eV x 96,485).
"""
import re
from decimal import Decimal

import quimica_util as Q
import wikidata as W
from common import IDIOMAS

URL_PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON"
URL_PUBCHEM_PAGINA = "https://pubchem.ncbi.nlm.nih.gov/periodic-table/"
LICENCA_PUBCHEM = "domínio público (NCBI/NLM)"
EV_PARA_KJ_MOL = Decimal("96.485")

CATEGORIAS = {
    "Alkali metal": "metal_alcalino",
    "Alkaline earth metal": "metal_alcalino_terroso",
    "Transition metal": "metal_transicao",
    "Post-transition metal": "metal_pos_transicao",
    "Metalloid": "semimetal",
    "Nonmetal": "nao_metal",
    "Halogen": "halogenio",
    "Noble gas": "gas_nobre",
    "Lanthanide": "lantanideo",
    "Actinide": "actinideo",
}
ESTADOS = {"Solid": "solido", "Liquid": "liquido", "Gas": "gas"}

URL_WIKIDATA_ITEM = "https://www.wikidata.org/wiki/{q}"
EV = "Q83327"
Z_MAX_MEDIDO = 103  # Rf (104) em diante: o NIST ASD só tem valores teóricos; não entram como medidos (Lr, 103, foi medido em 2015)
LIMITE_TROCA = 0.05  # diferença maior que 5 % contra o PubChem não é atualização, é outro dado: fica o PubChem e vai para stats
KJ_MOL = "Q752197"
# afinidade eletrônica do PubChem que difere das tabelas atuais (conferência com os livros de referência, 11/10/2026)
AFINIDADE_DESATUALIZADA = {"B", "F", "Al", "Fe", "Ga", "Ge", "Rb", "Nb", "Sn", "Sb", "La", "Ce", "Tl", "Pb", "Fr"}
AVISO_AFINIDADE = ("valor do PubChem possivelmente desatualizado (difere das tabelas atuais; conferência de 11/10/2026); "
                   "o Wikidata não tem a propriedade")
NOTA_ELETRONEGATIVIDADE = ("escala de Pauling com os valores revisados (Allred, 1961), como no PubChem; livros que usam os valores "
                           "originais de Pauling diferem (ex.: W 1,7 × 2,36; Pb 1,8 × 2,33)")

CONSULTA_IONIZACAO = """
SELECT ?z ?sym ?item ?st ?rank ?amt ?unit (GROUP_CONCAT(DISTINCT ?ord; separator="|") AS ?ords)
       (GROUP_CONCAT(DISTINCT ?rr; separator="|") AS ?refs) WHERE {
  ?item wdt:P31 wd:Q11344 ; wdt:P246 ?sym ; wdt:P1086 ?z . FILTER(xsd:integer(?z) <= 118)
  ?item p:P2260 ?st . ?st psv:P2260 ?v ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
  ?v wikibase:quantityAmount ?amt . OPTIONAL { ?v wikibase:quantityUnit ?unit }
  OPTIONAL { ?st pq:P1545 ?ord }
  OPTIONAL { ?st prov:wasDerivedFrom ?ref . { ?ref pr:P854 ?rv } UNION { ?ref pr:P248 ?rv } UNION { ?ref pr:P1476 ?rv }
             BIND(STR(?rv) AS ?rr) }
} GROUP BY ?z ?sym ?item ?st ?rank ?amt ?unit ORDER BY xsd:integer(?z)
"""

CONSULTA_WIKIDATA = """
SELECT ?item ?sym ?z ?cas ?lpt ?lptbr ?len ?mass ?ano
       (GROUP_CONCAT(DISTINCT ?porNome; separator="|") AS ?por) WHERE {
  ?item wdt:P31 wd:Q11344 ; wdt:P246 ?sym ; wdt:P1086 ?z .
  FILTER(xsd:integer(?z) <= 118)
  OPTIONAL { ?item wdt:P231 ?cas }
  OPTIONAL { ?item wdt:P2067 ?mass }
  OPTIONAL { ?item wdt:P575 ?disc . BIND(YEAR(?disc) AS ?ano) }
  OPTIONAL {
    ?item wdt:P61 ?d .
    OPTIONAL { ?d rdfs:label ?dbr . FILTER(LANG(?dbr) = "pt-br") }
    OPTIONAL { ?d rdfs:label ?dpt . FILTER(LANG(?dpt) = "pt") }
    OPTIONAL { ?d rdfs:label ?den . FILTER(LANG(?den) = "en") }
    BIND(COALESCE(?dbr, ?dpt, ?den) AS ?porNome)
  }
  OPTIONAL { ?item rdfs:label ?lpt . FILTER(LANG(?lpt) = "pt") }
  OPTIONAL { ?item rdfs:label ?lptbr . FILTER(LANG(?lptbr) = "pt-br") }
  OPTIONAL { ?item rdfs:label ?len . FILTER(LANG(?len) = "en") }
} GROUP BY ?item ?sym ?z ?cas ?lpt ?lptbr ?len ?mass ?ano ORDER BY xsd:integer(?z)
"""


# ------------------------------------------------------------------------------------------------ conversões
def numero(txt):
    """'13.598' -> Decimal; '', None, 'Ancient' -> None."""
    if txt is None:
        return None
    txt = str(txt).strip()
    if not txt:
        return None
    try:
        return Decimal(txt)
    except Exception:  # noqa: BLE001
        return None


def _nu(d, casas=None):
    """Decimal -> int se inteiro, senão float (sem artefatos de ponto flutuante)."""
    if d is None:
        return None
    if casas is not None:
        d = round(d, casas)
    if d == d.to_integral_value():
        return int(d)
    return float(d)


def ev_para_kj_mol(ev_txt):
    d = numero(ev_txt)
    return None if d is None else float(round(d * EV_PARA_KJ_MOL, 1))


def g_cm3_para_kg_m3(txt):
    d = numero(txt)
    if d is None:
        return None
    return _nu(d * 1000, 6)


def categoria(group_block):
    return CATEGORIAS.get((group_block or "").strip(), "desconhecida")


def estado_padrao(txt):
    """Só estados medidos; 'Expected to be a ...' (previsão para os superpesados) não vira dado."""
    return ESTADOS.get((txt or "").strip())


def estados_oxidacao(txt):
    out = set()
    for p in re.split(r"[,\s]+", (txt or "").strip()):
        p = p.strip().replace("+", "")
        if re.fullmatch(r"-?\d+", p):
            out.add(int(p))
    return sorted(out)


def configuracao(txt):
    t = (txt or "").strip()
    if not t:
        return None
    sufixo = ""
    m = re.search(r"\s*\((predicted|calculated)\)\s*$", t)
    if m:
        sufixo = " (prevista)" if m.group(1) == "predicted" else " (calculada)"
        t = t[:m.start()]
    t = re.sub(r"\](?=\S)", "] ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t + sufixo


def decimais(txt):
    s = str(txt).strip()
    return len(s.split(".")[1].rstrip("0")) if "." in s else 0


def escolher_massa(pubchem_txt, wikidata_txt):
    """PubChem por padrão. Usa o Wikidata (massa atômica convencional) quando ele refina o valor do PubChem: tem mais
    casas decimais e difere em no máximo uma unidade da última casa do PubChem (Li 7.0 -> 6.94, Fe 55.84 -> 55.845).
    Isótopos diferentes dos superpesados (Og 295.216 x 294.214) ficam de fora por essa regra."""
    pc = numero(pubchem_txt)
    wd = numero(wikidata_txt)
    if pc is None and wd is None:
        return None, None
    if pc is None:
        return _nu(wd), "wikidata"
    if wd is not None and decimais(wikidata_txt) > decimais(pubchem_txt) and             abs(wd - pc) <= Decimal(1).scaleb(-decimais(pubchem_txt)):
        return _nu(wd), "wikidata"
    return _nu(pc), "pubchem"


# ------------------------------------------------------------------------------------------------ coleta
def ler_pubchem(http):
    r = http.get(URL_PUBCHEM)
    if r.status != 200:
        raise RuntimeError(f"PubChem Periodic Table devolveu HTTP {r.status}")
    tab = r.json()["Table"]
    cols = tab["Columns"]["Column"]
    return [dict(zip(cols, linha["Cell"])) for linha in tab["Row"]]


def ler_wikidata(http):
    """Devolve {z: {...}} (apenas Z 1..118, símbolo conferido depois)."""
    por_z = {}
    for l in W.sparql(http, CONSULTA_WIKIDATA):
        z = int(l["z"])
        d = por_z.setdefault(z, {"itens": set(), "sym": l["sym"], "cas": set(), "massas": set(), "anos": set(),
                                 "por": [], "pt": set(), "ptbr": set(), "en": set()})
        d["itens"].add(W.qid(l["item"]))
        for k, campo in (("cas", "cas"), ("mass", "massas"), ("ano", "anos"), ("lpt", "pt"), ("lptbr", "ptbr"),
                         ("len", "en")):
            if l.get(k):
                d[campo].add(l[k])
        for nome in W.valores(l.get("por")):
            if nome not in d["por"]:
                d["por"].append(nome)
    return por_z


def ler_ionizacao(http):
    """{z: {...}} da 1ª energia de ionização (P2260, P1545 = 1, com referência; preferido > normal; empate = mais algarismos)."""
    melhor = {}
    for l in W.sparql(http, CONSULTA_IONIZACAO):
        refs_txt = l.get("refs") or ""
        # só o valor ATÔMICO do NIST ASD: as declarações referenciadas ao NIOSH são do gás diatômico (Cl₂ 11,48 eV, I₂ 9,31 eV)
        if "1" not in W.valores(l.get("ords")) or not ("physics.nist.gov/asd" in refs_txt or "NIST Atomic Spectra Database" in refs_txt):
            continue
        amt = numero(l.get("amt"))
        unit = W.qid(l.get("unit")) if l.get("unit") else None
        if amt is None or unit not in (EV, KJ_MOL):
            continue
        kj = float(round(amt * EV_PARA_KJ_MOL, 1)) if unit == EV else float(round(amt, 1))
        if kj <= 0:
            continue
        z = int(l["z"])
        if z > Z_MAX_MEDIDO:
            continue
        refs = W.valores(l.get("refs"))
        legiveis = [r for r in refs if not r.startswith("http://www.wikidata.org/entity/")] or refs
        cand = {"kJmol": kj, "valorOriginal": _nu(amt), "unidadeOriginal": "eV" if unit == EV else "kJ/mol",
                "declaracao": l["st"].rsplit("/", 1)[-1].replace("-", "$", 1), "qid": W.qid(l["item"]), "simbolo": l["sym"],
                "referencia": "; ".join(sorted(set(legiveis))[:2]),
                "_ordem": (l.get("rank", "").endswith("PreferredRank"), len(str(amt).replace(".", "").lstrip("0-")))}
        if z not in melhor or cand["_ordem"] > melhor[z]["_ordem"]:
            melhor[z] = cand
    return melhor


def aplicar_ionizacao(e, ie, hoje):
    """Troca `energiaIonizacaoKJmol` pelo valor do Wikidata e registra a origem. Devolve (antigo, novo) ou None."""
    if not ie or ie.get("simbolo") != e["simbolo"]:
        return None
    antigo = e.get("energiaIonizacaoKJmol")
    if antigo and abs(ie["kJmol"] - antigo) > LIMITE_TROCA * antigo:
        return "conflito", antigo, ie["kJmol"]
    e["energiaIonizacaoKJmol"] = ie["kJmol"]
    f = Q.fonte("Wikidata", URL_WIKIDATA_ITEM.format(q=ie["qid"]) + "#P2260", "CC0", hoje)
    f.update({"declaracao": ie["declaracao"], "valorOriginal": ie["valorOriginal"], "unidadeOriginal": ie["unidadeOriginal"]})
    if ie.get("referencia"):
        f["referencia"] = ie["referencia"]
    if antigo is not None and antigo != ie["kJmol"]:
        f["substituiu"] = {"valor": antigo, "fonte": "PubChem Periodic Table"}
    e.setdefault("fontesPorPropriedade", {})["energiaIonizacaoKJmol"] = f
    if not any(x["nome"] == "Wikidata" for x in e["fontes"]):
        e["fontes"].append(Q.fonte("Wikidata", URL_WIKIDATA_ITEM.format(q=ie["qid"]), "CC0", hoje))
    return antigo, ie["kJmol"]


def marcar_origens_pubchem(e, hoje):
    """Origem por valor dos campos que continuam do PubChem e pedem nota (afinidade desatualizada, escala de Pauling)."""
    fpp = e.setdefault("fontesPorPropriedade", {})
    if "afinidadeEletronicaKJmol" in e:
        f = Q.fonte("PubChem Periodic Table", URL_PUBCHEM_PAGINA, LICENCA_PUBCHEM, hoje)
        if e["simbolo"] in AFINIDADE_DESATUALIZADA:
            f["aviso"] = AVISO_AFINIDADE
            f["revisar"] = True
        fpp["afinidadeEletronicaKJmol"] = f
    if "eletronegatividade" in e:
        f = Q.fonte("PubChem Periodic Table", URL_PUBCHEM_PAGINA, LICENCA_PUBCHEM, hoje)
        f["escala"] = "Pauling"
        f["nota"] = NOTA_ELETRONEGATIVIDADE
        fpp["eletronegatividade"] = f
    if "energiaIonizacaoKJmol" in e and "energiaIonizacaoKJmol" not in fpp:
        fpp["energiaIonizacaoKJmol"] = Q.fonte("PubChem Periodic Table", URL_PUBCHEM_PAGINA, LICENCA_PUBCHEM, hoje)
    if not fpp:
        e.pop("fontesPorPropriedade")


# A 1 atm estes elementos sublimam: o "ponto de fusão" do PubChem é de outra pressão e a sublimação aparece como "ebulição".
# Melhor não publicar do que publicar com rótulo errado (conferência de 11/10/2026).
SUBLIMAM_A_1ATM = {"C", "As"}


def montar_elemento(linha, wd, hoje, info=None):
    z = int(linha["AtomicNumber"])
    info = {} if info is None else info
    simbolo = linha["Symbol"]
    if Q.SIMBOLO_POR_Z.get(z) != simbolo:
        raise ValueError(f"símbolo do PubChem diverge da tabela fixa: Z={z} {simbolo}")
    fontes = [Q.fonte("PubChem Periodic Table", URL_PUBCHEM_PAGINA, LICENCA_PUBCHEM, hoje)]
    usou_wikidata = False
    e = {"z": z, "simbolo": simbolo, "nome": Q.NOME_PT_POR_Z[z], "nomeEn": linha["Name"]}

    wd_mass = None
    if wd and len(wd["massas"]) == 1:
        wd_mass = next(iter(wd["massas"]))
    massa, origem_massa = escolher_massa(linha.get("AtomicMass"), wd_mass)
    if massa is not None:
        e["massaAtomica"] = massa
        usou_wikidata |= origem_massa == "wikidata"
        info["massaDoWikidata"] = origem_massa == "wikidata"

    e["grupo"] = Q.grupo(z)
    if e["grupo"] is None:
        del e["grupo"]
    e["periodo"] = Q.periodo(z)
    e["bloco"] = Q.bloco(z)
    e["categoria"] = categoria(linha.get("GroupBlock"))
    cfg = configuracao(linha.get("ElectronConfiguration"))
    if cfg:
        e["configuracaoEletronica"] = cfg
    en = numero(linha.get("Electronegativity"))
    if en is not None:
        e["eletronegatividade"] = _nu(en)
    raio = numero(linha.get("AtomicRadius"))
    if raio is not None:
        e["raioAtomicoPm"] = _nu(raio)
    af = ev_para_kj_mol(linha.get("ElectronAffinity"))
    if af is not None:
        e["afinidadeEletronicaKJmol"] = af
    ie = ev_para_kj_mol(linha.get("IonizationEnergy"))
    if ie is not None:
        e["energiaIonizacaoKJmol"] = ie
    for campo, chave in (("pontoFusaoK", "MeltingPoint"), ("pontoEbulicaoK", "BoilingPoint")):
        v = numero(linha.get(chave))
        if v is not None and simbolo not in SUBLIMAM_A_1ATM:
            e[campo] = _nu(v)
    dens = g_cm3_para_kg_m3(linha.get("Density"))
    if dens is not None:
        e["densidadeKgm3"] = dens
    est = estado_padrao(linha.get("StandardState"))
    if est:
        e["estadoPadrao"] = est
    ox = estados_oxidacao(linha.get("OxidationStates"))
    if ox:
        e["estadosOxidacao"] = ox

    ano_pc = (linha.get("YearDiscovered") or "").strip()
    desc = {}
    if ano_pc.isdigit():
        desc["ano"] = int(ano_pc)
        # descobridor só quando o Wikidata concorda com o ano (evita atribuir a pessoa de outra "descoberta")
        if wd and wd["por"] and str(int(ano_pc)) in wd["anos"]:
            desc["por"] = "; ".join(wd["por"])
            usou_wikidata = True
    if desc:
        e["descoberta"] = desc

    if wd:
        # CAS fica de fora de propósito: nos gases diatômicos o CAS do "elemento" é o do átomo (H 12385-13-6,
        # O 17778-80-2), não o da substância (H2 1333-74-0, O2 7782-44-7); o CAS das substâncias está em compostos/.
        if len(wd["itens"]) == 1:
            e["wikidata"] = next(iter(wd["itens"]))
            usou_wikidata = True
    if usou_wikidata:
        fontes.append(Q.fonte("Wikidata", f"https://www.wikidata.org/wiki/{e.get('wikidata', 'Q11344')}", "CC0", hoje))
    e["fontes"] = fontes
    return e


def nomes_por_idioma(e, rotulos, idiomas):
    """`nomes` do elemento: pt-BR e en do próprio registro; os demais do Wikidata (`rotulos` = {idioma: rótulo})."""
    nomes = {"pt-BR": e["nome"], "en": e["nomeEn"]}
    for idioma in idiomas:
        if idioma in nomes:
            continue
        r = (rotulos or {}).get(idioma)
        if r:
            nomes[idioma] = r
    return {i: nomes[i] for i in IDIOMAS if i in nomes and (i in idiomas or i in ("pt-BR", "en"))}


def rotular(http, elementos, idiomas, stats, log=print):
    """Preenche `nomes` (e devolve {QID: artigos por idioma} para a coleta da Wikipédia). Falha do Wikidata não derruba o build."""
    qids = [e["wikidata"] for e in elementos if e.get("wikidata")]
    try:
        ents = W.entidades(http, qids, idiomas, log=log) if qids else {}
        stats["rotulosWikidata"] = "ok"
    except Exception as exc:  # noqa: BLE001
        ents = {}
        stats["rotulosWikidata"] = f"falhou: {exc}"
    faltam = {i: 0 for i in idiomas if i not in ("pt-BR", "en")}
    for e in elementos:
        ent = ents.get(e.get("wikidata")) or {}
        e["nomes"] = nomes_por_idioma(e, ent.get("rotulos"), idiomas)
        for i in faltam:
            if i not in e["nomes"]:
                faltam[i] += 1
    stats["nomesSemRotulo"] = faltam
    return {q: ents[q].get("artigos", {}) for q in ents}


def coletar(http, hoje, idiomas=None):
    """Devolve (elementos, stats). Levanta exceção se o PubChem falhar (o Wikidata é opcional).
    `idiomas`: códigos do projeto para `nomes` (padrão: todos de common.IDIOMAS); os títulos de artigo por idioma ficam em
    `stats["_artigos"]` ({QID: {idioma: título}}) para a coleta da Wikipédia (chave com sublinhado: não vai para stats.json)."""
    idiomas = list(idiomas or IDIOMAS)
    linhas = ler_pubchem(http)
    stats = {"pubchemLinhas": len(linhas), "wikidata": "ok", "nomesDivergentesWikidata": [], "massaDoWikidata": 0,
             "descobertaSemDescobridor": [], "semEstadoPadrao": []}
    try:
        wd_por_z = ler_wikidata(http)
    except Exception as exc:  # noqa: BLE001  (Wikidata é complemento)
        wd_por_z = {}
        stats["wikidata"] = f"falhou: {exc}"
    elementos = []
    for linha in linhas:
        z = int(linha["AtomicNumber"])
        wd = wd_por_z.get(z)
        if wd and wd["sym"] != linha["Symbol"]:
            wd = None
        info = {}
        e = montar_elemento(linha, wd, hoje, info)
        if wd:
            rotulos = {Q.norm(x) for x in (wd["ptbr"] | wd["pt"])}
            if rotulos and Q.norm(e["nome"]) not in rotulos:
                stats["nomesDivergentesWikidata"].append({"z": z, "nome": e["nome"], "wikidata": sorted(wd["ptbr"] | wd["pt"])})
        if info.get("massaDoWikidata"):
            stats["massaDoWikidata"] += 1
        if "descoberta" in e and "por" not in e["descoberta"]:
            stats["descobertaSemDescobridor"].append(z)
        if "estadoPadrao" not in e:
            stats["semEstadoPadrao"].append(z)
        elementos.append(e)
    elementos.sort(key=lambda x: x["z"])
    try:
        ies = ler_ionizacao(http)
        stats["ionizacaoWikidata"] = "ok"
    except Exception as exc:  # noqa: BLE001  (complemento: sem ele fica o PubChem)
        ies = {}
        stats["ionizacaoWikidata"] = f"falhou: {exc}"
    trocas, conflitos = [], []
    for e in elementos:
        r = aplicar_ionizacao(e, ies.get(e["z"]), hoje)
        if r and r[0] == "conflito":
            conflitos.append({"simbolo": e["simbolo"], "pubchem": r[1], "wikidata": r[2]})
        elif r and r[0] != r[1]:
            trocas.append({"simbolo": e["simbolo"], "pubchem": r[0], "wikidata": r[1]})
        marcar_origens_pubchem(e, hoje)
    stats["ionizacaoDoWikidata"] = sum(1 for e in elementos
                                       if e.get("fontesPorPropriedade", {}).get("energiaIonizacaoKJmol", {}).get("nome") == "Wikidata")
    stats["ionizacaoTrocada"] = trocas
    stats["ionizacaoConflitoMantidoPubchem"] = conflitos
    stats["afinidadeComAviso"] = sorted(e["simbolo"] for e in elementos
                                        if e.get("fontesPorPropriedade", {}).get("afinidadeEletronicaKJmol", {}).get("aviso"))
    stats["_artigos"] = rotular(http, elementos, idiomas, stats)
    stats["elementos"] = len(elementos)
    return elementos, stats
