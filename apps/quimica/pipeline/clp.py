# -*- coding: utf-8 -*-
"""
Frases de perigo (H/EUH) do Anexo III do Regulamento (CE) n.º 1272/2008 (CLP), publicado no Jornal Oficial da UE e
distribuído pelo EUR-Lex / Serviço de Publicações da UE (Cellar). Legislação com reuso livre ("you can re-use the legal
documents published in EUR-Lex"); citar a fonte e indicar alterações (nenhuma é feita no texto).

O Anexo III é uma tabela multilíngue: para cada código vem uma linha por idioma ("PT" + texto, "EN" + texto, ...). O
mesmo documento (versão consolidada em português) traz todas as línguas oficiais, então extraímos de uma vez as linhas
PT, EN, ES, DE e FR (docs/I18N.md §4) — os códigos do projeto são `pt-BR`, `en`, `es`, `de`, `fr`.
Também reúne os rótulos dos pictogramas GHS (descritivos, autoria própria, com os nomes padronizados do GHS/UNECE em
cada idioma) e as palavras de advertência oficiais do CLP (art. 20) em cada idioma.
"""
import html as _html
import re

from common import IDIOMAS

CELEX_BASE = "02008R1272"
URL_CELLAR_SPARQL = "https://publications.europa.eu/webapi/rdf/sparql"
URL_CELLAR = "http://publications.europa.eu/resource/celex/{celex}"
URL_EURLEX = "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:{celex}"
NOME_FONTE = "Regulamento (CE) n.º 1272/2008 (CLP), Anexo III, texto consolidado, EUR-Lex"
LICENCA = "reutilização livre da legislação (EUR-Lex); citar a fonte"

# código de língua do Jornal Oficial -> código do projeto (o PT do JO é o português europeu; é o texto oficial que vale)
LINGUA_JO = {"PT": "pt-BR", "EN": "en", "ES": "es", "DE": "de", "FR": "fr"}
IDIOMA_PARA_JO = {v: k for k, v in LINGUA_JO.items()}
# todas as siglas de língua que aparecem na tabela (para não confundir uma sigla com texto de frase)
SIGLAS_JO = {"BG", "ES", "CS", "DA", "DE", "ET", "EL", "EN", "FR", "GA", "HR", "IT", "LV", "LT", "HU", "MT", "NL", "PL", "PT",
             "RO", "SK", "SL", "FI", "SV"}

_CODIGO = re.compile(r"^(H\d{3}[A-Za-z]*|EUH\d{3}[A-Z]?)\s*(\+)?$")
_MARCAS = re.compile(r"►[^◄]*◄|\(\d+\)|▼\S*")

# rótulos descritivos (pt-BR, autoria própria) + nome padronizado do pictograma no GHS/UNECE por idioma
PICTOGRAMAS = {
    "GHS01": "Bomba explodindo (explosivo)",
    "GHS02": "Chama (inflamável)",
    "GHS03": "Chama sobre círculo (comburente)",
    "GHS04": "Botijão de gás (gás sob pressão)",
    "GHS05": "Corrosão (corrosivo)",
    "GHS06": "Caveira e tíbias cruzadas (toxicidade aguda)",
    "GHS07": "Ponto de exclamação (irritante, nocivo)",
    "GHS08": "Perigo para a saúde (sistêmico)",
    "GHS09": "Meio ambiente (perigoso para o ambiente aquático)",
}
PICTOGRAMAS_POR_IDIOMA = {
    "GHS01": {"en": "Exploding bomb (explosive)", "es": "Bomba explotando (explosivo)", "de": "Explodierende Bombe (explosiv)",
              "fr": "Bombe explosant (explosif)"},
    "GHS02": {"en": "Flame (flammable)", "es": "Llama (inflamable)", "de": "Flamme (entzündbar)", "fr": "Flamme (inflammable)"},
    "GHS03": {"en": "Flame over circle (oxidising)", "es": "Llama sobre círculo (comburente)", "de": "Flamme über einem Kreis (oxidierend)",
              "fr": "Flamme au-dessus d'un cercle (comburant)"},
    "GHS04": {"en": "Gas cylinder (gas under pressure)", "es": "Bombona de gas (gas a presión)", "de": "Gasflasche (Gas unter Druck)",
              "fr": "Bouteille à gaz (gaz sous pression)"},
    "GHS05": {"en": "Corrosion (corrosive)", "es": "Corrosión (corrosivo)", "de": "Ätzwirkung (ätzend)", "fr": "Corrosion (corrosif)"},
    "GHS06": {"en": "Skull and crossbones (acute toxicity)", "es": "Calavera y tibias cruzadas (toxicidad aguda)",
              "de": "Totenkopf mit gekreuzten Knochen (akute Toxizität)", "fr": "Tête de mort sur deux tibias (toxicité aiguë)"},
    "GHS07": {"en": "Exclamation mark (irritant, harmful)", "es": "Signo de exclamación (irritante, nocivo)",
              "de": "Ausrufezeichen (reizend, gesundheitsschädlich)", "fr": "Point d'exclamation (irritant, nocif)"},
    "GHS08": {"en": "Health hazard (systemic)", "es": "Peligro para la salud (sistémico)", "de": "Gesundheitsgefahr (systemisch)",
              "fr": "Danger pour la santé (systémique)"},
    "GHS09": {"en": "Environment (hazardous to the aquatic environment)", "es": "Medio ambiente (peligroso para el medio ambiente acuático)",
              "de": "Umwelt (gewässergefährdend)", "fr": "Environnement (dangereux pour le milieu aquatique)"},
}
# palavras de advertência do CLP (art. 20) por idioma; chave = forma em português usada no pacote (`ghs.palavraSinal`)
PALAVRAS_SINAL = {"Perigo": "Danger", "Atenção": "Warning"}
PALAVRAS_SINAL_POR_IDIOMA = {
    "Perigo": {"pt-BR": "Perigo", "en": "Danger", "es": "Peligro", "de": "Gefahr", "fr": "Danger"},
    "Atenção": {"pt-BR": "Atenção", "en": "Warning", "es": "Atención", "de": "Achtung", "fr": "Attention"},
}


def pictogramas_por_idioma(idiomas=None):
    """{GHS0x: {idioma: rótulo}} para os idiomas pedidos (pt-BR sempre; só os que têm rótulo)."""
    idiomas = list(idiomas or IDIOMAS)
    out = {}
    for cod, pt in PICTOGRAMAS.items():
        d = {"pt-BR": pt}
        for i in idiomas:
            if i != "pt-BR" and PICTOGRAMAS_POR_IDIOMA.get(cod, {}).get(i):
                d[i] = PICTOGRAMAS_POR_IDIOMA[cod][i]
        out[cod] = d
    return out


def palavras_sinal_por_idioma(idiomas=None):
    idiomas = list(idiomas or IDIOMAS)
    return {pt: {i: v for i, v in d.items() if i == "pt-BR" or i in idiomas} for pt, d in PALAVRAS_SINAL_POR_IDIOMA.items()}


def norm_codigo(c):
    return re.sub(r"\s+", "", c)


def _texto_p(trecho):
    t = re.sub(r"<[^>]+>", "", trecho)
    return re.sub(r"\s+", " ", _html.unescape(t)).strip()


def parse_anexo_iii_multi(xhtml, idiomas=None):
    """Devolve {código sem espaços: {idioma do projeto: texto}} para os idiomas pedidos (padrão: todos de IDIOMAS).
    Levanta ValueError se o Anexo III não for encontrado.

    Na versão consolidada o código vem com marcas de alteração ("H200 ►M2 ◄") e os combinados ficam em células
    separadas ("H300 +", "H310 +", "H330"). Depois do código vem uma linha por língua: sigla ("PT", "EN", ...) e texto."""
    idiomas = list(idiomas or IDIOMAS)
    queridas = {IDIOMA_PARA_JO[i]: i for i in idiomas if i in IDIOMA_PARA_JO}
    ini = re.search(r"ANEXO\s*(?:<[^>]*>\s*)*III(?![IV])", xhtml)
    if not ini:
        raise ValueError("Anexo III não encontrado (formato do documento mudou?)")
    fim = re.search(r"ANEXO\s*(?:<[^>]*>\s*)*IV(?![IVX])", xhtml[ini.end():])
    seg = xhtml[ini.end(): ini.end() + fim.start()] if fim else xhtml[ini.end():]
    tokens = [_texto_p(m.group(1)) for m in re.finditer(r"<p[^>]*>(.*?)</p>", seg, flags=re.S)]
    frases, partes, atual, esperando = {}, [], None, None
    for t in tokens:
        t = _MARCAS.sub("", t).strip()
        if not t:
            continue
        m = _CODIGO.match(t)
        if m:
            partes.append(m.group(1))
            if not m.group(2):
                atual, partes, esperando = "+".join(partes), [], None
        elif t in SIGLAS_JO and atual:
            esperando = queridas.get(t)  # sigla de língua que não queremos: o texto seguinte é ignorado
            if esperando is None:
                esperando = "_ignorar"
        elif esperando:
            if esperando != "_ignorar":
                frases.setdefault(atual, {}).setdefault(esperando, t)
            esperando = None
    return frases


def parse_anexo_iii(xhtml):
    """Compatibilidade: {código: texto em português} (linha PT do Anexo III)."""
    return {cod: d["pt-BR"] for cod, d in parse_anexo_iii_multi(xhtml, ["pt-BR"]).items() if d.get("pt-BR")}


def ultima_consolidada(http, hoje):
    """CELEX da última versão consolidada em vigor até `hoje` (consulta o SPARQL do Serviço de Publicações da UE)."""
    import urllib.parse
    q = ('PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> SELECT DISTINCT ?c WHERE { ?w cdm:resource_legal_id_celex ?c . '
         'FILTER(STRSTARTS(STR(?c),"%s-")) } ORDER BY DESC(?c) LIMIT 40' % CELEX_BASE)
    r = http.get(URL_CELLAR_SPARQL, dados=urllib.parse.urlencode({"query": q}).encode(),
                 cabecalhos={"Accept": "application/sparql-results+json",
                             "Content-Type": "application/x-www-form-urlencoded"})
    limite = hoje.replace("-", "")
    datas = sorted(b["c"]["value"] for b in r.json()["results"]["bindings"]
                   if re.fullmatch(CELEX_BASE + r"-\d{8}", b["c"]["value"]) and b["c"]["value"][-8:] <= limite)
    if not datas:
        raise RuntimeError("nenhuma versão consolidada do CLP encontrada")
    return datas[-1]


def coletar(http, hoje, idiomas=None):
    """Devolve (frases, stats): frases = {código: {idioma: texto}} com pt-BR sempre e os demais idiomas pedidos.
    O XHTML do Cellar tem ~29 MB; fica em cache gzip."""
    idiomas = list(idiomas or IDIOMAS)
    celex = ultima_consolidada(http, hoje)
    r = http.get(URL_CELLAR.format(celex=celex), cabecalhos={"Accept": "application/xhtml+xml", "Accept-Language": "por"})
    if r.status != 200:
        raise RuntimeError(f"Cellar devolveu HTTP {r.status}")
    frases = parse_anexo_iii_multi(r.corpo.decode("utf-8", errors="replace"), idiomas)
    frases = {c: d for c, d in frases.items() if d.get("pt-BR")}  # sem texto em português não entra
    if len(frases) < 70:
        raise RuntimeError(f"Anexo III com poucas frases ({len(frases)}): formato mudou?")
    return frases, {"celex": celex, "url": URL_EURLEX.format(celex=celex), "idiomas": idiomas,
                    "frasesH": len([c for c in frases if c.startswith("H")]),
                    "frasesEUH": len([c for c in frases if c.startswith("EUH")]),
                    "combinadas": len([c for c in frases if "+" in c]),
                    "frasesPorIdioma": {i: sum(1 for d in frases.values() if d.get(i)) for i in idiomas}}


def texto_pt(frase):
    """Texto em português de uma entrada (str antiga ou dict por idioma)."""
    return frase if isinstance(frase, str) else (frase or {}).get("pt-BR")


def por_idioma(frase):
    """Dicionário {idioma: texto} de uma entrada (str antiga vira só pt-BR)."""
    return {"pt-BR": frase} if isinstance(frase, str) else dict(frase or {})
