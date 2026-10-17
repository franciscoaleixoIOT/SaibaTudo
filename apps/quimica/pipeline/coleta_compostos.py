# -*- coding: utf-8 -*-
"""
Compostos do núcleo (DATA_CONTRACT §3), lotes de 200 em `compostos/lote-NNN.json` + `compostos/index.json`.

Fontes por campo (política de docs/FONTES_E_LICENCAS.md §5):
- PubChem (só campos calculados pelo NLM e identificadores): formulaHill, massaMolar, massaExata, smiles, inchiKey, nomeIupac,
  propriedades (xlogp, tpsa, contagens, carga). Sem sinônimos nem depósitos de terceiros.
- GHS: só a classificação harmonizada da UE (Regulamento 1272/2008, Anexo VI) lida do PUG View; `ghs.fonte` guarda o texto
  literal da fonte; as frases H em português estão em `ghs_frases.json` (Anexo III do CLP, EUR-Lex).
- Wikidata (CC0): nome em português, rótulos/apelidos, CAS (identificador), fórmula convencional (P274), QID, ChEBI ID (P683);
  `nomes` e `sinonimosPorIdioma` (docs/I18N.md §4) pelos rótulos e apelidos do item em en/es/de/fr (`wbgetentities`), e os
  títulos de artigo por idioma (sitelinks) para a coleta da Wikipédia. Composto sem item no Wikidata (ou sem rótulo no idioma)
  fica sem `nomes[idioma]` — o cliente cai para `nomeIupac`/`nome` e rotula; `nomes["pt-BR"]` só quando há nome em português de verdade.
- ChEBI (CC BY 4.0): `definicaoChebi` (texto em inglês) e nomes alternativos.
- Apelidos de autoria própria (`lista_fixa.APELIDOS_POR_IDIOMA`, por CID e conferidos pela fórmula): nomes de uso corrente que o Wikidata não
  traz ("sal" em pt/fr, "Salzsäure", "eau de Javel"…); entram na frente dos apelidos do Wikidata em `sinonimosPorIdioma` (e em `sinonimos` no pt-BR).
- ICSC: nada é copiado; cada composto com CAS recebe `icscBuscaUrl` (link de busca por CAS no site da OIT, em português).
"""
import json
import re
from pathlib import Path

import clp
import coleta_chebi
import coleta_icsc
import lista_fixa
import pubchem as P
import quimica_util as Q
import wikidata as W
from common import IDIOMAS
from http_cache import CacheMiss, HttpErro

LOTE_ARQUIVO = 200
LOTE_WIKIDATA = 100
URL_PUBCHEM_CID = "https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"
LICENCA_PUBCHEM = "domínio público (NCBI/NLM)"
URL_WIKIDATA = "https://www.wikidata.org/wiki/{q}"
URL_EURLEX_CLP = "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32008R1272"

CONSULTA_ENRIQUECER = """SELECT ?cid ?item ?sl
  (GROUP_CONCAT(DISTINCT ?lbr; separator="|") AS ?pbr)
  (GROUP_CONCAT(DISTINCT ?lpt; separator="|") AS ?ppt)
  (GROUP_CONCAT(DISTINCT ?len; separator="|") AS ?pen)
  (GROUP_CONCAT(DISTINCT ?apt; separator="|") AS ?apts)
  (GROUP_CONCAT(DISTINCT ?aen; separator="|") AS ?aens)
  (GROUP_CONCAT(DISTINCT ?cas; separator="|") AS ?cass)
  (GROUP_CONCAT(DISTINCT ?frm; separator="|") AS ?frms)
  (GROUP_CONCAT(DISTINCT ?chebi; separator="|") AS ?chebis)
  (GROUP_CONCAT(DISTINCT ?ptw; separator="|") AS ?ptws) WHERE {
  VALUES ?cid { %s }
  ?item wdt:P662 ?cid ; wikibase:sitelinks ?sl .
  OPTIONAL { ?item rdfs:label ?lbr . FILTER(LANG(?lbr) = "pt-br") }
  OPTIONAL { ?item rdfs:label ?lpt . FILTER(LANG(?lpt) = "pt") }
  OPTIONAL { ?item rdfs:label ?len . FILTER(LANG(?len) = "en") }
  OPTIONAL { ?item skos:altLabel ?apt . FILTER(LANG(?apt) IN ("pt", "pt-br")) }
  OPTIONAL { ?item skos:altLabel ?aen . FILTER(LANG(?aen) = "en") }
  OPTIONAL { ?item wdt:P231 ?cas }
  OPTIONAL { ?item wdt:P274 ?frm }
  OPTIONAL { ?item wdt:P683 ?chebi }
  OPTIONAL { ?art schema:about ?item ; schema:isPartOf <https://pt.wikipedia.org/> ; schema:name ?ptw }
} GROUP BY ?cid ?item ?sl"""


# ------------------------------------------------------------------------------------------------ Wikidata
def _formula_bate(reg, formula_pubchem):
    """O item tem fórmula (P274) igual à do PubChem e sem carga (H₂⁺ não representa o H₂ neutro)."""
    if not formula_pubchem:
        return False
    for f in reg.get("formulas", []):
        f2 = Q.sem_subscritos(f).strip()
        if f2 and not re.search(r"[+\-⁺⁻]", f2) and Q.hill_igual(f2, formula_pubchem):
            return True
    return False


def _prefere(novo, atual, formula_pubchem):
    """Vários itens com o mesmo CID: vence o que tem a fórmula do PubChem; depois, o de mais sitelinks (conferência de
    11/10/2026: o CID do H₂ aponta também para o íon H₂⁺, que tem mais sitelinks e outro CAS)."""
    return (_formula_bate(novo, formula_pubchem), novo["sl"]) > (_formula_bate(atual, formula_pubchem), atual["sl"])


def enriquecer_wikidata(http, cids, log=print, excluir_qids=frozenset(), formulas_pubchem=None):
    """{cid: {...}} com o item de maior número de sitelinks para cada CID. `excluir_qids`: itens que nunca representam o
    composto (os 118 elementos: o H₂ pegava o CAS do item "hidrogênio", que tem mais sitelinks; conferência de 11/10/2026)."""
    cids = sorted({int(c) for c in cids})
    por_cid, falhas = {}, []
    for i in range(0, len(cids), LOTE_WIKIDATA):
        lote = cids[i:i + LOTE_WIKIDATA]
        valores = " ".join(f'"{c}"' for c in lote)
        try:
            linhas = W.sparql(http, CONSULTA_ENRIQUECER % valores, post=True)
        except Exception as exc:  # noqa: BLE001
            falhas.append({"cids": f"{lote[0]}-{lote[-1]}", "erro": str(exc)[:160]})
            log(f"  [wikidata] enriquecimento {lote[0]}-{lote[-1]} falhou: {exc}")
            continue
        for l in linhas:
            cid = int(l["cid"])
            if W.qid(l["item"]) in excluir_qids:
                continue
            reg = {"qid": W.qid(l["item"]), "sl": int(l["sl"]), "pbr": W.valores(l.get("pbr")), "ppt": W.valores(l.get("ppt")),
                   "pen": W.valores(l.get("pen")), "apt": W.valores(l.get("apts")), "aen": W.valores(l.get("aens")),
                   "cas": W.valores(l.get("cass")), "formulas": W.valores(l.get("frms")),
                   "chebi": W.valores(l.get("chebis")), "ptwiki": W.valores(l.get("ptws"))}
            if cid not in por_cid or _prefere(reg, por_cid[cid], (formulas_pubchem or {}).get(cid)):
                por_cid[cid] = reg
        log(f"  [wikidata] enriquecimento {min(i + LOTE_WIKIDATA, len(cids))}/{len(cids)}")
    return por_cid, falhas


def escolher_cas(candidatos, sinonimos=None):
    """CAS válido (dígito verificador). Com mais de um no Wikidata, desempata pela ordem dos sinônimos do PubChem para o
    mesmo CID: o primeiro CAS listado é o do composto (conferência de 11/10/2026: SnO₂ levava o CAS do Sn(OH)₂ e o
    tetraborato anidro o do decaidratado, porque a regra antiga pegava o menor número)."""
    validos = sorted({c.strip() for c in candidatos if Q.cas_valido(c.strip())}, key=lambda c: (len(c), c))
    if len(validos) > 1 and sinonimos:
        pos = {}
        for i, s in enumerate(sinonimos):
            pos.setdefault(s.strip(), i)
        validos.sort(key=lambda c: pos.get(c, len(sinonimos)))
    return validos[0] if validos else None


LIMIAR_ISOTOPO = 0.5  # g/mol: diferença maior que isto entre fórmula e PubChem não é arredondamento, é isótopo (ex.: D₂O)


def massa_pela_formula(formula, pesos):
    """Massa molar pela fórmula e pelos pesos atômicos padrão do pacote (2 casas, como o PubChem), ou None."""
    if not pesos:
        return None
    try:
        cont = Q.contagem_atomos(formula)
    except ValueError:
        return None
    if not cont or any(el not in pesos for el in cont):
        return None
    return round(sum(n * pesos[el] for el, n in cont.items()), 2)


def deduplicar(compostos, meta=None):
    """Remove repetidos (mesmo InChIKey ou mesmo CAS), mantendo o primeiro: a lista fixa vem antes. Devolve (unicos, duplicados)."""
    por_ik, por_cas, unicos, duplicados = {}, {}, [], []
    for c in compostos:
        ik, cas = c.get("inchiKey"), c.get("cas")
        dono = (por_ik.get(ik) if ik else None) or (por_cas.get(cas) if cas else None)
        if dono:
            duplicados.append({"cid": c["cid"], "nome": c.get("nome"), "igualA": dono})
            if meta is not None:
                meta.pop(c["cid"], None)
            continue
        if ik:
            por_ik[ik] = c["cid"]
        if cas:
            por_cas[cas] = c["cid"]
        unicos.append(c)
    return unicos, duplicados


def escolher_formula(declarada, wd_formulas, formula_pubchem):
    """Fórmula convencional: a declarada na lista fixa > Wikidata P274 (se a composição bate) > fórmula Hill do PubChem."""
    if declarada and Q.hill_igual(declarada, formula_pubchem):
        return declarada
    for f in sorted(wd_formulas, key=lambda x: (len(x), x)):
        f2 = Q.sem_subscritos(f).strip()
        if f2 and Q.hill_igual(f2, formula_pubchem):
            return f2
    return formula_pubchem


_CODIGO = re.compile(r"[A-Z0-9][A-Z0-9\-\s.,:/()]*")

_LEXICO_DIR = Path(__file__).resolve().parent.parent / "contracts" / "lexico"


def _palavras_funcionais():
    """Palavras funcionais e de parada dos cinco idiomas (contracts/lexico/*.json), normalizadas; com reserva fixa se os
    arquivos não existirem. Um apelido do Wikidata igual a uma delas ("PARA", apelido em inglês do 1,4-diclorobenzeno) faria
    qualquer pergunta com essa palavra apontar para o composto errado."""
    base = {"para", "por", "com", "sem", "the", "and", "for", "with", "from", "das", "der", "die", "und", "mit", "les", "des",
            "pour", "avec", "con", "sin", "sobre", "entre", "como", "que", "este", "esta", "esse", "essa", "isso", "mais", "menos"}
    for arq in sorted(_LEXICO_DIR.glob("*.json")) if _LEXICO_DIR.is_dir() else []:
        try:
            lex = json.loads(arq.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for chave in ("stopPalavras", "palavrasFuncionais"):
            base.update(Q.norm(x) for x in lex.get(chave, []) if isinstance(x, str))
    return frozenset(x for x in base if x)


PALAVRAS_FUNCIONAIS = _palavras_funcionais()


def sinonimo_valido(s, formula=None):
    """Nome aceitável como sinônimo: não é CAS, código de banco, fórmula do próprio composto, sequência de códigos/números nem
    uma palavra funcional de algum idioma do pacote (ex.: "PARA")."""
    s = (s or "").strip()
    if not (2 <= len(s) <= 50):
        return False
    if Q.norm(s) in PALAVRAS_FUNCIONAIS:
        return False
    plano = Q.sem_subscritos(s)
    if Q.cas_valido(s) or re.search(r"\d", plano) and not re.search(r"[a-zà-ú]", plano):
        return False
    if formula:
        try:
            if Q.hill_igual(plano, formula):
                return False
        except (ValueError, TypeError):
            pass
    if re.search(r"[<>&=]", s) or s.startswith(("[", "(")) or s.count("(") != s.count(")"):
        return False
    if s.upper().startswith(("CHEBI", "CHEMBL", "UNII", "DTXSID", "SCHEMBL", "NSC", "EINECS", "INCHI")):
        return False
    return True


def montar_sinonimos(exclui, *listas, maximo=10, formula=None):
    ja = {Q.norm(x) for x in exclui if x}
    out = []
    for lista in listas:
        for s in lista:
            n = Q.norm(s)
            if n and n not in ja and sinonimo_valido(s, formula):
                ja.add(n)
                out.append(s.strip())
                if len(out) >= maximo:
                    return out
    return out


# ------------------------------------------------------------------------------------------------ montagem
def apelidos_manuais(cid, formula_pubchem):
    """`{idioma: [apelidos]}` de `lista_fixa.APELIDOS_POR_IDIOMA` para o CID, ou `{}` se não há entrada ou se a fórmula declarada não
    tem a composição da fórmula Hill do PubChem (CID trocado por engano nunca vira apelido errado)."""
    reg = lista_fixa.APELIDOS_POR_IDIOMA.get(cid)
    if not reg or not formula_pubchem or not Q.hill_igual(reg["formula"], formula_pubchem):
        return {}
    return reg["apelidos"]


def nomes_por_idioma(c, ent, idiomas, sinonimos_chebi=(), formula=None, manuais=None):
    """`nomes` e `sinonimosPorIdioma` do composto a partir da entidade do Wikidata (`ent` = saída de wikidata.entidades).

    pt-BR: `nome` (só quando não é pendente) e apelidos pt/pt-br; en/es/de/fr: rótulo e apelidos do item (en também recebe os
    sinônimos do ChEBI). Sem rótulo no idioma, a chave fica ausente (nunca se copia o IUPAC para `nomes.en`: o cliente faz isso
    e rotula). Até 10 sinônimos por idioma, sem fórmulas, CAS ou códigos (sinonimo_valido), sem repetir o nome.
    `manuais` (de `apelidos_manuais`) entra na frente dos apelidos do Wikidata: o teto de 10 nunca os corta."""
    ent = ent or {}
    manuais = manuais or {}
    rot, ape = ent.get("rotulos") or {}, ent.get("apelidos") or {}
    nomes, sin = {}, {}
    excl_base = [c.get("nome"), c.get("nomePopular"), c.get("nomeIupac")]
    for idioma in [i for i in IDIOMAS if i in idiomas]:
        if idioma == "pt-BR":
            if not c.get("nomePtPendente") and c.get("nome"):
                nomes[idioma] = c["nome"]
        elif rot.get(idioma):
            nomes[idioma] = rot[idioma]
        extras = list(sinonimos_chebi) if idioma == "en" else []
        lista = montar_sinonimos(excl_base + [nomes.get(idioma)], manuais.get(idioma, []), ape.get(idioma, []), extras, formula=formula)
        if lista:
            sin[idioma] = lista
    return nomes, sin


def montar(sel, props, wd, ghs, chebi, hoje, pesos=None, sinonimos_pubchem=None, ent=None, idiomas=None, anexo_vi=None,
           ghs_rejeitados=None):
    """Monta o registro do contrato §3 (ou None se faltar o essencial). `ent`: entidade do Wikidata (rótulos por idioma).
    `ghs`: candidatos harmonizados do PubChem (lista; um dict vale como lista de um). Só entra o que casa por chave forte
    com o composto (`clp.escolher_ghs`, com o Anexo VI `anexo_vi`); os recusados vão para `ghs_rejeitados` (lista)."""
    cid = sel["cid"]
    p = props
    if not p or not p.get("MolecularFormula") or not p.get("ConnectivitySMILES"):
        return None, "sem fórmula/SMILES no PubChem"
    wd = wd or {}
    fontes = [Q.fonte(f"PubChem CID {cid}", URL_PUBCHEM_CID.format(cid=cid), LICENCA_PUBCHEM, hoje)]
    c = {"cid": cid}
    iupac = (p.get("IUPACName") or "").strip() or None
    en = (wd.get("pen") or [None])[0]
    pt = next((x for x in (wd.get("pbr") or []) + (wd.get("ppt") or []) if x), None)
    nome_pt = sel.get("nome") or (Q.capitalizar(pt) if pt else None)
    if nome_pt:
        c["nome"] = nome_pt
    else:
        pend = iupac or en
        if not pend:
            return None, "sem nome"
        c["nome"] = pend
        c["nomePtPendente"] = True
    if sel.get("popular"):
        c["nomePopular"] = sel["popular"]
    if iupac:
        c["nomeIupac"] = iupac
    excl = [c["nome"], c.get("nomePopular"), iupac]
    manuais = apelidos_manuais(cid, p["MolecularFormula"])
    sin = montar_sinonimos(excl, manuais.get("pt-BR", []), wd.get("apt", []), [Q.capitalizar(x) for x in (wd.get("pbr", []) + wd.get("ppt", []))
                                                      if Q.norm(x) != Q.norm(c["nome"])],
                           ([en] if en else []), wd.get("aen", []), (chebi or {}).get("sinonimos", []), formula=p["MolecularFormula"])
    if sin:
        c["sinonimos"] = sin
    nomes, sin_idioma = nomes_por_idioma(c, ent, idiomas or IDIOMAS, (chebi or {}).get("sinonimos", []), formula=p["MolecularFormula"],
                                         manuais=manuais)
    if nomes:
        c["nomes"] = nomes
    if sin_idioma:
        c["sinonimosPorIdioma"] = sin_idioma
    c["formula"] = escolher_formula(sel.get("formulaDeclarada"), wd.get("formulas", []), p["MolecularFormula"])
    c["formulaHill"] = p["MolecularFormula"]
    mm, me = P.numero(p.get("MolecularWeight")), P.numero(p.get("ExactMass"))
    if mm is None:
        return None, "sem massa molar"
    calc = massa_pela_formula(p["MolecularFormula"], pesos)
    isotopico = calc is not None and abs(calc - mm) >= LIMIAR_ISOTOPO
    if calc is not None and not isotopico:
        mm = calc  # pesos atômicos padrão: o PubChem arredonda alguns (PbO 223 → 223,2; LiOH 24,0 → 23,95; Ar 39,9 → 39,95)
    if isotopico:  # a fórmula do PubChem perde o isótopo (D₂O aparece como H2O): usa a fórmula do Wikidata com D
        f_d = next((Q.sem_subscritos(f).strip() for f in wd.get("formulas", []) if "D" in Q.sem_subscritos(f)), None)
        if f_d:
            c["formula"] = f_d
    c["massaMolar"] = mm
    if me is not None:
        c["massaExata"] = me
    c["smiles"] = p["ConnectivitySMILES"]
    if p.get("InChIKey"):
        c["inchiKey"] = p["InChIKey"]
    cas = escolher_cas(wd.get("cas", []), sinonimos_pubchem)
    if cas:
        c["cas"] = cas
        c["icscBuscaUrl"] = coleta_icsc.url_busca_cas(cas)
    prop = {}
    for chave, campo in (("XLogP", "xlogp"), ("HBondDonorCount", "doadoresH"), ("HBondAcceptorCount", "aceptoresH"),
                         ("RotatableBondCount", "ligacoesRotaveis"), ("Charge", "carga"), ("TPSA", "tpsa")):
        v = P.numero(p.get(chave))
        if v is not None:
            prop[campo] = v
    if prop:
        c["propriedades"] = prop
    candidatos = [ghs] if isinstance(ghs, dict) else list(ghs or [])
    ghs, rejeitados = clp.escolher_ghs(candidatos, c, anexo_vi) if candidatos else (None, [])
    if rejeitados and ghs_rejeitados is not None:
        ghs_rejeitados.extend(dict(r, cid=cid, nome=c["nome"], cas=c.get("cas"), aceita=(ghs or {}).get("indice")) for r in rejeitados)
    if ghs:
        c["ghs"] = ghs
        fontes.append(Q.fonte("Regulamento (CE) n.º 1272/2008, Anexo VI (classificação harmonizada), via PubChem",
                              ghs.get("fonteUrl") or URL_EURLEX_CLP, "reutilização livre da legislação (EUR-Lex)", hoje))
    if sel.get("classes"):
        c["classes"] = sel["classes"]
    if wd.get("qid"):
        c["wikidata"] = wd["qid"]
        fontes.append(Q.fonte("Wikidata", URL_WIKIDATA.format(q=wd["qid"]), "CC0", hoje))
    if chebi and chebi.get("definicao"):
        cid_chebi = f"CHEBI:{chebi['id']}"
        c["definicaoChebi"] = {"texto": chebi["definicao"], "chebiId": cid_chebi, "licenca": coleta_chebi.LICENCA}
        fontes.append(Q.fonte(f"ChEBI {cid_chebi}", coleta_chebi.URL_PAGINA.format(id=chebi["id"]), coleta_chebi.LICENCA, hoje))
    c["fontes"] = fontes
    return c, None


def coletar(http, pubchem, selecao, hoje, frases_h=None, com_ghs=True, com_chebi=True, log=print, pesos=None,
            qids_elementos=frozenset(), idiomas=None, anexo_vi=None):
    """Devolve (compostos, meta, stats). `meta[cid]` = {"sl", "ptwiki", "qid", "artigos": {idioma: título}} para a etapa de textos.
    `idiomas`: códigos do projeto para `nomes`/`sinonimosPorIdioma` e para os títulos de artigo (padrão: common.IDIOMAS)."""
    idiomas = list(idiomas or IDIOMAS)
    cids = [s["cid"] for s in selecao]
    props = pubchem.propriedades(cids)
    wd_por_cid, wd_falhas = enriquecer_wikidata(http, cids, log, excluir_qids=qids_elementos,
                                                formulas_pubchem={c: p.get("MolecularFormula") for c, p in props.items() if p})
    # rótulos, apelidos e artigos por idioma (wbgetentities, 50 itens por chamada); falha não derruba o build
    try:
        ents = W.entidades(http, [wd["qid"] for wd in wd_por_cid.values()], idiomas, log=log)
        ents_status = "ok"
    except Exception as exc:  # noqa: BLE001
        ents, ents_status = {}, f"falhou: {exc}"
        log(f"  [wikidata] rótulos por idioma falharam: {exc}")

    ghs_por_cid, ghs_falhas = {}, []
    if com_ghs:
        for i, cid in enumerate(cids, 1):
            try:
                g = pubchem.ghs_harmonizados(cid)  # candidatos; o casamento é conferido em montar()
            except CacheMiss as exc:  # --pubchem-offline sem esta entrada: conta como falha (o limite abaixo decide)
                ghs_falhas.append({"cid": cid, "erro": f"sem cache: {exc}"[:120]})
                continue
            except HttpErro as exc:
                if exc.status == 429:
                    raise
                ghs_falhas.append({"cid": cid, "erro": str(exc)[:120]})
                continue
            if g:
                ghs_por_cid[cid] = g
            if i % 200 == 0:
                log(f"  [ghs] {i}/{len(cids)} (com classificação harmonizada: {len(ghs_por_cid)})")

    if len(ghs_falhas) > max(3, 0.02 * len(cids)):  # não publica pacote com GHS silenciosamente incompleto
        raise RuntimeError(f"GHS: {len(ghs_falhas)} falhas de rede em {len(cids)} compostos (ex.: {ghs_falhas[0]})")

    multi = [cid for cid, wd in wd_por_cid.items() if len({x.strip() for x in wd.get("cas", []) if Q.cas_valido(x.strip())}) > 1]
    sin_pc = pubchem.sinonimos(multi) if multi else {}
    if multi:
        log(f"  [cas] {len(multi)} compostos com mais de um CAS no Wikidata: desempate pelos sinônimos do PubChem")

    chebi_dados, chebi_stats = {}, {}
    if com_chebi:
        ids = {int(x) for wd in wd_por_cid.values() for x in wd.get("chebi", []) if str(x).isdigit()}
        chebi_dados, chebi_stats = coleta_chebi.coletar(http, ids, log)

    compostos, meta, descartados, ghs_rejeitados = [], {}, [], []
    for sel in selecao:
        cid = sel["cid"]
        wd = wd_por_cid.get(cid)
        ch = None
        if wd:
            for x in wd.get("chebi", []):
                if str(x).isdigit() and int(x) in chebi_dados:
                    ch = dict(chebi_dados[int(x)], id=int(x))
                    break
        ent = ents.get((wd or {}).get("qid"))
        c, motivo = montar(sel, props.get(cid), wd, ghs_por_cid.get(cid), ch, hoje, pesos=pesos, sinonimos_pubchem=sin_pc.get(cid),
                           ent=ent, idiomas=idiomas, anexo_vi=anexo_vi, ghs_rejeitados=ghs_rejeitados)
        if c is None:
            descartados.append({"cid": cid, "motivo": motivo})
            continue
        compostos.append(c)
        meta[cid] = {"sl": (wd or {}).get("sl", 0), "ptwiki": ((wd or {}).get("ptwiki") or [None])[0],
                     "qid": (wd or {}).get("qid"), "artigos": dict((ent or {}).get("artigos") or {})}

    compostos, duplicados = deduplicar(compostos, meta)
    if duplicados:
        log(f"  [compostos] {len(duplicados)} repetidos removidos (mesmo InChIKey ou CAS): " + ", ".join(f"{d['nome']} ({d['cid']})" for d in duplicados))
    faltam_h = sorted({h for c in compostos for h in c.get("ghs", {}).get("frasesH", []) if frases_h is not None and h not in frases_h})
    stats = {"compostos": len(compostos), "descartados": descartados, "duplicados": duplicados, "casDesempatadosPeloPubchem": len(multi), "comGhsHarmonizado": sum(1 for c in compostos if "ghs" in c),
             "ghsCandidatosPubchem": len(ghs_por_cid), "ghsCasadoPor": {k: sum(1 for c in compostos if c.get("ghs", {}).get("casadoPor") == k) for k in clp.CASADO_POR},
             "ghsAnexoVi": len(anexo_vi or {}), "ghsRejeitados": ghs_rejeitados, "ghsFalhasDeRede": ghs_falhas,
             "comCas": sum(1 for c in compostos if "cas" in c), "comWikidata": sum(1 for c in compostos if "wikidata" in c),
             "nomePtPendente": sum(1 for c in compostos if c.get("nomePtPendente")),
             "comDefinicaoChebi": sum(1 for c in compostos if "definicaoChebi" in c),
             "frasesHSemTextoPt": faltam_h, "wikidataFalhas": wd_falhas, "chebi": chebi_stats,
             "rotulosWikidata": ents_status,
             "comNomePorIdioma": {i: sum(1 for c in compostos if i in c.get("nomes", {})) for i in idiomas},
             "comArtigoPorIdioma": {i: sum(1 for m in meta.values() if i in m.get("artigos", {})) for i in idiomas},
             "sinonimosDePubChem": "não coletados (política de campos calculados do PubChem)"}
    return compostos, meta, stats


# ------------------------------------------------------------------------------------------------ saída
def para_lotes(compostos):
    """[(nome_lote, lista), ...] com 200 por arquivo e o índice `{porCid, nomes, nomesPorIdioma}`.

    `nomes`: pares [chave normalizada, cid] como sempre (nome pt, popular, IUPAC, sinônimos, fórmulas). `nomesPorIdioma[idioma]`
    (en/es/de/fr): os pares de `nomes[idioma]` + `sinonimosPorIdioma[idioma]` que AINDA NÃO estão em `nomes` — a busca no idioma X
    usa `nomes` ∪ `nomesPorIdioma[X]` sem baixar os lotes (sem a deduplicação o índice dobrava de tamanho: o inglês já está em
    `sinonimos`). Só idiomas com alguma entrada."""
    lotes, porcid, nomes, por_idioma = [], {}, set(), {}
    for i in range(0, len(compostos), LOTE_ARQUIVO):
        nome = f"lote-{i // LOTE_ARQUIVO + 1:03d}"
        parte = compostos[i:i + LOTE_ARQUIVO]
        lotes.append((nome, parte))
        for c in parte:
            porcid[str(c["cid"])] = nome
            for n in [c["nome"], c.get("nomePopular"), c.get("nomeIupac")] + c.get("sinonimos", []) + [c["formula"], c["formulaHill"]]:
                if n:
                    nomes.add((Q.norm(n), c["cid"]))
            for idioma in IDIOMAS:
                if idioma == "pt-BR":
                    continue
                for n in [c.get("nomes", {}).get(idioma)] + c.get("sinonimosPorIdioma", {}).get(idioma, []):
                    if n and (Q.norm(n), c["cid"]) not in nomes:
                        por_idioma.setdefault(idioma, set()).add((Q.norm(n), c["cid"]))
    indice = {"porCid": porcid, "nomes": [[n, cid] for n, cid in sorted(nomes)]}
    if por_idioma:
        indice["nomesPorIdioma"] = {i: [[n, cid] for n, cid in sorted(por_idioma[i] - nomes)] for i in IDIOMAS if i in por_idioma}
    return lotes, indice
