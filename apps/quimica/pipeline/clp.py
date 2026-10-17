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
    xhtml = r.corpo.decode("utf-8", errors="replace")
    frases = parse_anexo_iii_multi(xhtml, idiomas)
    frases = {c: d for c, d in frases.items() if d.get("pt-BR")}  # sem texto em português não entra
    if len(frases) < 70:
        raise RuntimeError(f"Anexo III com poucas frases ({len(frases)}): formato mudou?")
    stats = {"celex": celex, "url": URL_EURLEX.format(celex=celex), "idiomas": idiomas,
             "frasesH": len([c for c in frases if c.startswith("H")]),
             "frasesEUH": len([c for c in frases if c.startswith("EUH")]),
             "combinadas": len([c for c in frases if "+" in c]),
             "frasesPorIdioma": {i: sum(1 for d in frases.values() if d.get(i)) for i in idiomas}}
    # Anexo VI, Parte 3 (mesmo documento): índice -> nome, EC, CAS, para conferir o casamento composto -> entrada harmonizada.
    # `_anexoVi` não vai para o stats.json (o build o retira); sem ele o casamento só aceita nome exato.
    try:
        anexo_vi = parse_anexo_vi(xhtml)
        if len(anexo_vi) < 1000:
            raise ValueError(f"poucas entradas ({len(anexo_vi)})")
        stats["_anexoVi"] = anexo_vi
        stats["anexoViEntradas"] = len(anexo_vi)
    except ValueError as exc:
        stats["anexoViEntradas"] = 0
        stats["anexoViErro"] = str(exc)[:200]
    return frases, stats


# ---------------------------------------------------------------- Anexo VI (classificação harmonizada) e casamento
_INDICE = re.compile(r"^\d{3}-\d{3}-\d{2}-[\dX]$")  # o dígito de controle pode ser X ("006-006-00-X")
_EC = re.compile(r"(?<![\d-])\d{3}-\d{3}-\d(?![\d-])")
_CAS = re.compile(r"(?<![\d-])\d{2,7}-\d{2}-\d(?![\d-])")
# entradas que não são substância pura (UVCB, produto-por-processo, massa/mistura de reação): nunca casam com um composto
_NAO_PURA = re.compile(r"product[- ]by[- ]process|produto[- ]por[- ]processo|reaction\s+(mass|mixture|products?)|"
                       r"mistura\s+reac?cional|massa\s+de\s+rea[cç][aã]o|produtos?\s+de\s+rea[cç][aã]o|"
                       r"\buvcb\b|obtained\s+by|obtid[oa]s?\s+por", re.I)
CASADO_POR = ("cas", "ec", "indice", "nome")
# marcas de alteração da versão consolidada ("►C5 022-006-00-2 ◄", "▼M14"): só a marca sai, o conteúdo fica
_MARCAS_VI = re.compile(r"►\s*[A-Z]\d+|◄|▼\s*[A-Z]\d+")


def _celulas(tr):
    out = []
    for td in re.finditer(r"<td[^>]*>(.*?)</td>", tr, flags=re.S):
        ps = [_MARCAS_VI.sub(" ", _texto_p(m.group(1))).strip() for m in re.finditer(r"<p[^>]*>(.*?)</p>", td.group(1), flags=re.S)]
        ps = [re.sub(r"\s+", " ", x) for x in ps]
        out.append([x for x in ps if x])
    return out


def parse_anexo_vi(xhtml):
    """{índice: {"indice", "nome" (português, linhas unidas por espaço), "ec": [...], "cas": [...]}} da Parte 3 do Anexo VI.
    Só linhas cuja 1ª célula é um número de índice (ddd-ddd-dd-d); EC e CAS só pelos padrões numéricos ("—" = sem número).
    Levanta ValueError se o Anexo VI não for encontrado."""
    ini = re.search(r"ANEXO\s*(?:<[^>]*>\s*)*VI(?![IVX])", xhtml)
    if not ini:
        raise ValueError("Anexo VI não encontrado (formato do documento mudou?)")
    fim = re.search(r"ANEXO\s*(?:<[^>]*>\s*)*VII(?![IVX])", xhtml[ini.end():])
    seg = xhtml[ini.end(): ini.end() + fim.start()] if fim else xhtml[ini.end():]
    out = {}
    for tr in re.finditer(r"<tr[^>]*>(.*?)</tr>", seg, flags=re.S):
        cel = _celulas(tr.group(1))
        if len(cel) < 4 or len(cel[0]) != 1 or not _INDICE.match(cel[0][0]):
            continue
        idx = cel[0][0]
        if idx in out:
            continue
        out[idx] = {"indice": idx, "nome": " ".join(cel[1]),
                    "ec": [m.group(0) for x in cel[2] for m in _EC.finditer(x)],
                    "cas": [m.group(0) for x in cel[3] for m in _CAS.finditer(x)]}
    return out


def _norm_nome(s):
    import unicodedata
    t = unicodedata.normalize("NFKD", s or "")
    t = "".join(ch for ch in t if not unicodedata.combining(ch)).lower()
    t = re.sub(r"\[\d+\]", " ", t)  # "dimetilamina; [2]": nº da substância na linha do Anexo VI
    t = re.sub(r"\s+(a\s+)?\.\.\.\s*%", "", t)  # "sulphuric acid ... %", "ácido sulfúrico a ... %": concentração variável
    t = re.sub(r"\s+", " ", t).strip(" ;,.")
    return t


def nomes_da_entrada(*nomes):
    """Nomes normalizados de uma entrada (o Anexo VI separa sinônimos por ';'); nome truncado ('...') não serve para
    comparação exata e fica fora."""
    out = set()
    for n in nomes:
        for parte in (n or "").split(";"):
            parte = parte.strip()
            if not parte or re.search(r"\.\.\.\s*$", parte):
                continue
            k = _norm_nome(parte)
            if k:
                out.add(k)
    return out


def nomes_do_composto(c):
    nomes = [c.get("nome"), c.get("nomePopular"), c.get("nomeIupac")]
    nomes += list((c.get("nomes") or {}).values()) + list(c.get("sinonimos") or [])
    for lst in (c.get("sinonimosPorIdioma") or {}).values():
        nomes += list(lst)
    return {k for k in (_norm_nome(n) for n in nomes if isinstance(n, str)) if k}


def nao_e_substancia_pura(*nomes):
    return any(_NAO_PURA.search(n or "") for n in nomes)


def casar_entrada(cand, composto, anexo_vi=None):
    """(chave, motivo) do casamento composto -> entrada harmonizada; chave em CASADO_POR ou None (o motivo diz por quê).
    Regra (17/10/2026: o NaCl recebia um corante poliazo "produto-por-processo" cujo nome termina em "e cloreto de sódio"):
    - entrada UVCB/produto-por-processo/massa de reação nunca casa com composto puro;
    - CAS do composto entre os CAS da entrada -> "cas"; os dois presentes e diferentes -> rejeita;
    - EC do composto (quando houver) entre os EC da entrada -> "ec"; os dois presentes e diferentes -> rejeita;
    - número de índice do composto (quando houver) = índice da entrada -> "indice";
    - nome normalizado (sem acento/caixa) exatamente igual a nome/IUPAC/sinônimo do composto -> "nome". Nunca nome parcial."""
    idx = cand.get("indice")
    vi = (anexo_vi or {}).get(idx) if idx else None
    nome_pc, nome_vi = cand.get("entrada") or "", (vi or {}).get("nome") or ""
    if nao_e_substancia_pura(nome_pc, nome_vi):
        return None, "entrada não é substância pura (UVCB/produto-por-processo/massa de reação)"
    cas_c = (composto.get("cas") or "").strip()
    cas_e = list((vi or {}).get("cas") or [])
    if cas_c and cas_e:
        return ("cas", None) if cas_c in cas_e else (None, f"CAS diferente ({cas_c} x {', '.join(cas_e)})")
    ec_c = (composto.get("ec") or "").strip()
    ec_e = list((vi or {}).get("ec") or [])
    if ec_c and ec_e:
        return ("ec", None) if ec_c in ec_e else (None, f"EC diferente ({ec_c} x {', '.join(ec_e)})")
    if idx and composto.get("indiceClp") and composto["indiceClp"] == idx:
        return "indice", None
    if nomes_da_entrada(nome_pc, nome_vi) & nomes_do_composto(composto):
        return "nome", None
    if vi is None:
        return None, "sem chave forte (entrada fora do Anexo VI lido e nome diferente)"
    return None, "sem chave forte (CAS/EC ausentes de um dos lados e nome diferente)"


def escolher_ghs(candidatos, composto, anexo_vi=None):
    """(ghs ou None, rejeitados): o candidato que casa pela chave mais forte (cas > ec > indice > nome), com `casadoPor`
    e `indice`; `rejeitados` = [{indice, entrada, motivo}] para o stats."""
    aceitos, rejeitados = [], []
    for ordem, cand in enumerate(candidatos or []):
        chave, motivo = casar_entrada(cand, composto, anexo_vi)
        if chave:
            aceitos.append((CASADO_POR.index(chave), ordem, chave, cand))
        else:
            rejeitados.append({"indice": cand.get("indice"), "entrada": cand.get("entrada"), "motivo": motivo})
    if not aceitos:
        return None, rejeitados
    _, _, chave, cand = min(aceitos, key=lambda t: t[:2])
    g = {k: v for k, v in cand.items() if k != "indice"}
    if cand.get("indice"):
        g["indice"] = cand["indice"]
    g["casadoPor"] = chave
    return g, rejeitados


def texto_pt(frase):
    """Texto em português de uma entrada (str antiga ou dict por idioma)."""
    return frase if isinstance(frase, str) else (frase or {}).get("pt-BR")


def por_idioma(frase):
    """Dicionário {idioma: texto} de uma entrada (str antiga vira só pt-BR)."""
    return {"pt-BR": frase} if isinstance(frase, str) else dict(frase or {})
