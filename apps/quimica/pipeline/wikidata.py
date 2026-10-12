# -*- coding: utf-8 -*-
"""Consultas SPARQL ao Wikidata (CC0) pelo cache HTTP (1 req/s, `User-Agent` identificado) e leitura de rótulos, apelidos e
sitelinks por idioma pela API `wbgetentities` (50 itens por chamada, também em cache)."""
import urllib.parse

from common import IDIOMAS, WIKI_POR_IDIOMA

ENDPOINT = "https://query.wikidata.org/sparql"
API = "https://www.wikidata.org/w/api.php"
QID = "http://www.wikidata.org/entity/"
LOTE_ENTIDADES = 50  # máximo da API para usuários anônimos


def sparql(http, consulta, post=False, ttl_s=None):
    """Executa a consulta e devolve a lista de linhas (dict nome -> valor em texto). Levanta HttpErro em falha."""
    cab = {"Accept": "application/sparql-results+json"}
    if post:
        corpo = urllib.parse.urlencode({"query": consulta}).encode("utf-8")
        cab["Content-Type"] = "application/x-www-form-urlencoded"
        r = http.get(ENDPOINT, dados=corpo, cabecalhos=cab, ttl_s=ttl_s)
    else:
        r = http.get(ENDPOINT, params={"format": "json", "query": consulta}, cabecalhos=cab, ttl_s=ttl_s)
    if r.status != 200:
        raise RuntimeError(f"SPARQL devolveu HTTP {r.status}")
    dados = r.json()
    return [{k: v["value"] for k, v in linha.items()} for linha in dados["results"]["bindings"]]


def qid(uri):
    return uri.rsplit("/", 1)[-1] if uri else None


def valores(lista_str, sep="|"):
    return [x for x in (lista_str or "").split(sep) if x]


# ---------------------------------------------------------------------------------------------- wbgetentities
def _lang_wikidata(idioma):
    """Código do rótulo no Wikidata para o idioma do projeto (pt-BR -> 'pt-br' e, como reserva, 'pt')."""
    return "pt-br" if idioma == "pt-BR" else idioma


def entidades(http, qids, idiomas=None, log=None):
    """Rótulos, apelidos (altLabel) e títulos de artigo por idioma de cada item, via `wbgetentities` (CC0).

    Devolve {QID: {"rotulos": {idioma: str}, "apelidos": {idioma: [str]}, "artigos": {idioma: título}}} só para os itens que a
    API devolveu. Os idiomas são os do projeto (`pt-BR`, `en`, ...); para pt-BR vale o rótulo `pt-br` e, se faltar, `pt`.
    A URL de cada lote é determinística (ids ordenados), então o cache HTTP é reaproveitado entre as etapas do build.
    Levanta exceção se a API falhar (quem chama decide se o dado é opcional)."""
    idiomas = list(idiomas or IDIOMAS)
    langs = sorted({_lang_wikidata(i) for i in idiomas} | ({"pt"} if "pt-BR" in idiomas else set()))
    sites = sorted(f"{WIKI_POR_IDIOMA[i]}wiki" for i in idiomas)
    qids = sorted({q for q in qids if q and q.startswith("Q")}, key=lambda q: (len(q), q))
    saida = {}
    for i in range(0, len(qids), LOTE_ENTIDADES):
        lote = qids[i:i + LOTE_ENTIDADES]
        params = {"action": "wbgetentities", "ids": "|".join(lote), "props": "labels|aliases|sitelinks",
                  "languages": "|".join(langs), "sitefilter": "|".join(sites), "format": "json"}
        r = http.get(API, params=params, cabecalhos={"Accept": "application/json"})
        if r.status != 200:
            raise RuntimeError(f"wbgetentities devolveu HTTP {r.status}")
        dados = r.json()
        if "error" in dados:
            raise RuntimeError(f"wbgetentities: {dados['error'].get('info', dados['error'])}")
        for q, ent in (dados.get("entities") or {}).items():
            if "missing" in ent:
                continue
            labels = ent.get("labels") or {}
            aliases = ent.get("aliases") or {}
            sitelinks = ent.get("sitelinks") or {}
            reg = {"rotulos": {}, "apelidos": {}, "artigos": {}}
            for idioma in idiomas:
                lw = _lang_wikidata(idioma)
                rot = (labels.get(lw) or {}).get("value") or ((labels.get("pt") or {}).get("value") if idioma == "pt-BR" else None)
                if rot:
                    reg["rotulos"][idioma] = rot
                ap = [a["value"] for a in aliases.get(lw, [])]
                if idioma == "pt-BR":
                    ap += [a["value"] for a in aliases.get("pt", []) if a["value"] not in ap]
                if ap:
                    reg["apelidos"][idioma] = ap
                art = (sitelinks.get(f"{WIKI_POR_IDIOMA[idioma]}wiki") or {}).get("title")
                if art:
                    reg["artigos"][idioma] = art
            saida[q] = reg
        if log:
            log(f"  [wikidata] rótulos/sitelinks {min(i + LOTE_ENTIDADES, len(qids))}/{len(qids)}")
    return saida
