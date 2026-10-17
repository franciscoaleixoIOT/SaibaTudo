# -*- coding: utf-8 -*-
"""
Termoquímica padrão dos compostos pelo `chembox` da Wikipédia em inglês (CC BY-SA 4.0), com o permalink (`oldid`) de cada valor.

Campos do pacote (`compostos[].propriedades` e `fontesPorPropriedade`, unidades do contrato, DATA_CONTRACT §3.1):
- `DeltaHf` -> `entalpiaFormacaoKJmol`      (kJ/mol; aceita kJ/mol, J/mol e kcal/mol termoquímica = 4,184 kJ)
- `DeltaGf` -> `energiaGibbsFormacaoKJmol`  (kJ/mol; idem)
- `Entropy` -> `entropiaPadraoJmolK`        (J/(mol·K); aceita as grafias J/(mol·K), J/(K·mol), J·mol⁻¹·K⁻¹, J·K⁻¹·mol⁻¹)
Todos a 298,15 K e 1 bar/1 atm (é o que o campo do chembox significa: Std enthalpy of formation, Gibbs e Std molar entropy).

Como o artigo é escolhido: sem busca. O título é o sitelink `enwiki` do item do Wikidata do composto (o mesmo que a coleta de textos usa:
`meta[cid]["artigos"]["en"]`, de `wikidata.entidades`); a página devolvida precisa ter o mesmo QID (`pageprops.wikibase_item`).
A leitura é pela API de ações (`/w/api.php`, exceção de robots.py), até 50 títulos por requisição, 1 req/s, `User-Agent` do pipeline,
só a seção 0 (`rvsection=0`; o chembox fica na introdução), pelo HttpCache (TTL padrão, como as outras famílias).

Regras do analisador (nada de valor aproximado como se fosse medido; o que não se entende fica fora e é contado em `descartadas`):
- as referências (`<ref>`), comentários e modelos de citação são removidos antes; o valor é o texto do campo até o próximo `|` ou `}}`
  fora de chaves/colchetes; só os modelos `{{nbsp}}`, `{{nowrap|..}}`, `{{nobr|..}}` e `{{minus}}` são entendidos (outro modelo = descartado);
- número com sinal (−, &minus;, – no início), decimal com ponto, milhar com vírgula e notação `×10^n`; a incerteza (`±0,3`, `(13)`) é ignorada;
- fora: `~`, `≈`, `ca.`, `approx`, `about`, `est.`, `<`, `>`, intervalos (`a–b`, `a to b`), `(aq)`, unidade que não seja a do campo;
- um campo pode trazer várias fases separadas por `<br>`/linha, cada uma com `(s)`, `(l)`, `(g)` (ou solid/liquid/gas/cr): vale a da MESMA fase
  do `estadoPadrao` do composto; sem estado conhecido, vale a única marcada sólida/líquida; mais de uma candidata = ambíguo = fora;
  valor com fase marcada diferente do `estadoPadrao` fica fora; sem fase marcada, entra sem `condicoes.fase`;
- faixa física plausível: |ΔHf|, |ΔGf| < 10 000 kJ/mol e 10 < S° < 3 000 J/(mol·K);
- campo repetido na introdução (dois chembox com valores diferentes) = fora.

Prioridade sobre o Wikidata (coleta_propriedades, P3078): o chembox é a fonte primária de `entalpiaFormacaoKJmol`; o valor do Wikidata (referência
forte) só fica onde o artigo não tem o campo. Onde os dois existem e diferem mais de 2 %, vale o do chembox e a divergência vai para o
`stats` (`divergenteDoWikidata`), para conferência; a exceção é o valor do Wikidata com a fase explícita igual ao `estadoPadrao` contra um
valor do chembox sem fase (`mantidoWikidataPorFase`: o do artigo costuma ser o do gás de um líquido).

Curadoria (listas curtas no topo do módulo, cada entrada conferida): `TITULO_EN_CURADO` (artigo certo quando o item não tem sitelink en: a
glicose) e `EXCLUIR` (valores do artigo incoerentes com o estado padrão do composto, achados na conferência de 17/10/2026 contra valores de
tabela: o campo fica sem o valor do artigo). O chembox tem erro residual (da ordem de 3 % nas amostras conferidas, quase todo de fase: valor
do gás num líquido sem marca de fase); `stats` guarda as divergências com o Wikidata para a próxima revisão.

A origem de cada valor: `{nome: "Wikipedia (en): <artigo>", url: permalink com oldid, urlArtigo, licenca: "CC BY-SA 4.0", acessadoEm, revisao,
campoOriginal, valorOriginal, unidadeOriginal, condicoes: {fase}, atribuicao}`; a fonte `wikipedia-en-dados` de `fontes.py` cobre o conjunto.
"""
import html
import re
import urllib.parse
from decimal import Decimal, InvalidOperation

import coleta_propriedades as CP

API = "https://en.wikipedia.org/w/api.php"
LOTE_TITULOS = 50
LICENCA = "CC BY-SA 4.0"
NOME_FONTE = "Wikipedia (en)"

# campo do chembox -> (campo do pacote, família de unidade)
CAMPOS_TERMO = {"DeltaHf": ("entalpiaFormacaoKJmol", "energia"), "DeltaGf": ("energiaGibbsFormacaoKJmol", "energia"),
                "Entropy": ("entropiaPadraoJmolK", "entropia")}
CAMPOS_PACOTE = tuple(v[0] for v in CAMPOS_TERMO.values())
CASAS = 2
DIVERGENCIA = Decimal("0.02")

# Artigo certo para o composto quando o item do Wikidata dele não tem sitelink em inglês (a glicose do pacote é a D-glucopiranose, que não tem
# artigo próprio; o artigo "Glucose" é o da D-glucose). Curadoria: só entra caso conferido, e a checagem de QID da página é dispensada.
TITULO_EN_CURADO = {5793: "Glucose"}
# Valores do chembox que a conferência de 17/10/2026 achou incoerentes com o estado padrão do composto (valor do gás ou de solução aquosa num
# líquido, número fora de escala): {CID: ({campos do pacote}, composto)}. O campo fica sem valor do artigo (e o do Wikidata, se houver, permanece).
EXCLUIR = {
    944: (frozenset({"entalpiaFormacaoKJmol", "entropiaPadraoJmolK"}), "ácido nítrico: valor em solução aquosa"),
    5943: (frozenset({"entalpiaFormacaoKJmol"}), "tetracloreto de carbono: valor do gás num líquido"),
    24682: (frozenset({"entalpiaFormacaoKJmol", "entropiaPadraoJmolK"}), "trióxido de enxofre: valores do gás num líquido"),
    24193: (frozenset({"entalpiaFormacaoKJmol", "entropiaPadraoJmolK"}), "tetracloreto de titânio: valores do gás num líquido"),
    244: (frozenset({"entalpiaFormacaoKJmol"}), "álcool benzílico: valor fora de escala"),
    12389: (frozenset({"entalpiaFormacaoKJmol"}), "tetradecano: valor fora de escala"),
    787: (frozenset({"entalpiaFormacaoKJmol", "entropiaPadraoJmolK"}), "hidroxilamina: valores do gás num sólido"),
    6338: (frozenset({"entalpiaFormacaoKJmol"}), "cloroeteno: valor 'sólido' num gás"),
}

# unidade (compacta: minúsculas, sem espaços, sem "·", "^" nem "*") -> fator para a unidade do contrato
UNIDADES = {
    "energia": {"kj/mol": (Decimal(1), "kJ/mol"), "kjmol-1": (Decimal(1), "kJ/mol"),
                "j/mol": (Decimal("0.001"), "J/mol"), "jmol-1": (Decimal("0.001"), "J/mol"),
                "kcal/mol": (Decimal("4.184"), "kcal/mol"), "kcalmol-1": (Decimal("4.184"), "kcal/mol")},
    "entropia": {"j/(molk)": (Decimal(1), "J/(mol·K)"), "j/(kmol)": (Decimal(1), "J/(mol·K)"), "jmol-1k-1": (Decimal(1), "J/(mol·K)"),
                 "jk-1mol-1": (Decimal(1), "J/(mol·K)"), "j/molk": (Decimal(1), "J/(mol·K)"), "j/kmol": (Decimal(1), "J/(mol·K)"),
                 "j/(mol*k)": (Decimal(1), "J/(mol·K)"), "jmol-1/k": (Decimal(1), "J/(mol·K)")},
}
FASES = {"s": "solido", "solid": "solido", "cr": "solido", "c": "solido", "crystal": "solido", "crystalline": "solido", "amorphous": "solido",
         "l": "liquido", "liquid": "liquido", "g": "gas", "gas": "gas", "gaseous": "gas", "vapor": "gas", "vapour": "gas"}
FASES_IGNORADAS = {"aq", "aqueous", "solution", "sol", "ion"}   # em solução aquosa: não é o estado padrão do composto
_RE_NUMERO = re.compile(r"^\s*([+-]?)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:\s*[×x]\s*10\s*\^?\s*\(?([+-]?\d+)\)?)?")
_PROIBIDO = re.compile(r"~|≈|≃|∼|\bca\b\.?|\bc\.\s|approx|about|\best\b|estimat|circa|<|>|≥|≤|\bto\b|\bor\b|\bnear\b|[?]", re.IGNORECASE)


# ------------------------------------------------------------------------------------------------ leitura da API
def ler_paginas(http, titulos, log=print):
    """{título pedido: {"titulo", "revid", "qid", "wikitexto"} | None}, falhas. Segue normalizações e redirecionamentos."""
    titulos = list(dict.fromkeys(titulos))
    saida, falhas = {}, []
    for i in range(0, len(titulos), LOTE_TITULOS):
        lote = titulos[i:i + LOTE_TITULOS]
        params = {"action": "query", "prop": "revisions|pageprops", "rvprop": "ids|content", "rvslots": "main", "rvsection": 0,
                  "ppprop": "wikibase_item", "redirects": 1, "titles": "|".join(lote), "format": "json", "formatversion": "2"}
        try:
            r = http.get(API, params=params, cabecalhos={"Accept": "application/json"})
            if r.status != 200:
                raise RuntimeError(f"API Wikimedia devolveu HTTP {r.status}")
            q = r.json().get("query", {})
        except Exception as exc:  # noqa: BLE001
            falhas.append({"titulos": f"{lote[0]} … {lote[-1]}", "erro": str(exc)[:160]})
            log(f"  [wikipedia-en] termoquímica {lote[0]}…{lote[-1]} falhou: {exc}")
            continue
        norm = {n["from"]: n["to"] for n in q.get("normalized", [])}
        red = {x["from"]: x["to"] for x in q.get("redirects", [])}
        paginas = {p["title"]: p for p in q.get("pages", [])}
        for t in lote:
            x = norm.get(t, t)
            for _ in range(5):
                if x in red:
                    x = red[x]
            pg = paginas.get(x)
            rev = ((pg or {}).get("revisions") or [None])[0]
            if pg is None or pg.get("missing") or rev is None:
                saida[t] = None
                continue
            saida[t] = {"titulo": pg["title"], "revid": rev.get("revid"), "qid": (pg.get("pageprops") or {}).get("wikibase_item"),
                        "wikitexto": ((rev.get("slots") or {}).get("main") or {}).get("content") or ""}
        log(f"  [wikipedia-en] termoquímica {min(i + LOTE_TITULOS, len(titulos))}/{len(titulos)}")
    return saida, falhas


# ------------------------------------------------------------------------------------------------ análise do wikitexto
def _sem_referencias(texto):
    texto = re.sub(r"<!--.*?-->", "", texto, flags=re.DOTALL)
    texto = re.sub(r"<ref\b[^>]*?/>", "", texto, flags=re.IGNORECASE)
    return re.sub(r"<ref\b[^>]*>.*?</ref>", "", texto, flags=re.IGNORECASE | re.DOTALL)


def campos_chembox(wikitexto):
    """{campo do chembox: [texto bruto de cada ocorrência]} para DeltaHf, DeltaGf e Entropy."""
    t = _sem_referencias(wikitexto or "")
    achados = {}
    for m in re.finditer(r"(?m)^[ \t]*\|[ \t]*(" + "|".join(CAMPOS_TERMO) + r")[ \t]*=", t):
        i, prof, n = m.end(), 0, len(t)
        while i < n:
            dois = t[i:i + 2]
            if dois in ("{{", "[["):
                prof += 1
                i += 2
                continue
            if dois in ("}}", "]]"):
                if prof == 0:
                    break
                prof -= 1
                i += 2
                continue
            if t[i] == "|" and prof == 0:
                break
            i += 1
        achados.setdefault(m.group(1), []).append(t[m.end():i].strip())
    return achados


_RE_MODELO = re.compile(r"\{\{([^{}]*)\}\}")
_MODELOS_ESPACO = {"nbsp", "nb", "space", "spaces", "thin space", "thinsp", "hsp", "hair space", "narrow space", "nsp", "en space", "em space"}
_NOMEADOS_VAL = {"u", "up", "s", "fmt", "e"}


class _ModeloDesconhecido(Exception):
    pass


def _modelo(corpo):
    """Texto de um modelo SEM modelos dentro: {{val|-393.5|u=kJ.mol-1}} -> '-393.5 kJ·mol^-1'. Só os usados nos chembox; outro = exceção."""
    partes = [x.strip() for x in corpo.split("|")]
    nome, args = partes[0].lower(), partes[1:]
    pos = [a for a in args if "=" not in a]
    nom = dict(a.split("=", 1) for a in args if "=" in a)
    nom = {k.strip().lower(): v.strip() for k, v in nom.items()}
    if nome in _MODELOS_ESPACO:
        return " "
    if nome == "minus":
        return "−"
    if nome in ("times", "×"):
        return "×"
    if nome in ("dot", "middot", "sdot"):
        return "·"
    if nome in ("nowrap", "nobr", "nobreak") and len(args) == 1:
        return args[0]
    if nome == "sup" and len(args) == 1:
        return "^" + args[0]
    if nome in ("ubl", "unbulleted list", "plainlist", "plain list"):
        return "\n".join(a for a in args if a)
    if nome in ("cvt", "convert") and len(pos) >= 2:
        return f"{pos[0]} {pos[1]}"
    if nome == "val" and pos and set(nom) <= _NOMEADOS_VAL:
        txt = pos[0]
        if len(pos) >= 3 and pos[1].lower() in ("to", "-", "–", "and"):
            return f"{pos[0]} to {pos[2]}"          # intervalo: o chamador descarta
        if len(pos) > 2:
            raise _ModeloDesconhecido(nome)
        if nom.get("e"):
            txt += f"×10^{nom['e']}"
        un = nom.get("u", "")
        un = re.sub(r"(?<=[A-Za-z\)])(-\d+)", r"^\1", un).replace(".", "·")
        if nom.get("up"):
            un += "/" + nom["up"]
        un += nom.get("s", "")
        return f"{txt} {un}".strip()
    raise _ModeloDesconhecido(nome)


def _limpar(bruto):
    """Texto do campo -> (lista de segmentos, um por fase, None) ou (None, motivo)."""
    t = bruto
    try:
        for _ in range(8):  # do modelo mais interno para fora
            novo = _RE_MODELO.sub(lambda m: _modelo(m.group(1)), t)
            if novo == t:
                break
            t = novo
    except _ModeloDesconhecido:
        return None, "modelo não reconhecido"
    if "{{" in t or "}}" in t:
        return None, "modelo não reconhecido"
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.IGNORECASE)
    t = re.sub(r"<sup>\s*([^<]*?)\s*</sup>", lambda m: "^" + m.group(1), t, flags=re.IGNORECASE)
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    t = html.unescape(t)
    for esp in ("\xa0", " ", " ", " ", " ", " "):
        t = t.replace(esp, " ")
    for aspas in ("'''", "''"):
        t = t.replace(aspas, "")
    t = t.replace("−", "-").replace("‒", "-").replace("—", "-")
    t = re.sub(r"\^\s*[–]", "^-", t)                  # expoente com travessão: mol^–1
    t = re.sub(r"(?m)^\s*[–]\s*(?=\d)", "-", t)      # "–393,5" no início do segmento = sinal
    segmentos = [re.sub(r"^\*\s*", "", s.strip()) for s in re.split(r"\n|;", t) if s.strip()]
    return (segmentos, None) if segmentos else (None, "vazio")


def _unidade_compacta(txt):
    u = txt.strip().lower()
    for lixo in ("·", "⋅", "*", "^", " ", "×", "."):
        u = u.replace(lixo, "")
    u = u.replace("−", "-").replace("(-1)", "-1").replace("⁻¹", "-1").replace("per", "/")
    return u.strip(",")


_PADRAO = re.compile(r"^(?:298(?:\.15)?\s*k|25\s*°\s*c|1\s*bar|100\s*kpa|1\s*atm|101\.325\s*kpa|standard (?:state|conditions)|std)$")


def _parenteses(txt):
    """Interpreta os parênteses do segmento. Devolve (texto sem os parênteses entendidos, fase | None, em_solucao). Parêntese que não é
    fase nem condição padrão (298,15 K, 1 bar...) fica no texto, e o segmento acaba descartado."""
    fase, solucao = None, False

    def troca(m):
        nonlocal fase, solucao
        fases, padrao, ignorar = set(), True, False
        for tok in m.group(1).split(","):
            tok = tok.strip().lower().rstrip(".")
            tok = re.sub(r"^[αβγδ](?:-|\s)?\s*", "", tok)
            tok = re.sub(r"\s*(?:form|phase)$", "", tok)
            if tok in FASES:
                fases.add(FASES[tok])
            elif tok in FASES_IGNORADAS:
                ignorar = True
            elif not _PADRAO.match(tok):
                padrao = False
        if not padrao or (not fases and not ignorar) or len(fases) > 1:
            return m.group(0)
        solucao = solucao or ignorar
        if fases:
            fase = next(iter(fases))
        return " "

    return re.sub(r"\(([^()]*)\)", troca, txt), fase, solucao


def _segmento(txt, familia):
    """'−393.5 kJ/mol (g)' -> ({"valor": Decimal na unidade do contrato, "unidade": 'kJ/mol', "fase": 'gas'|None, "original": Decimal}, None)."""
    resto, fase, solucao = _parenteses(txt)
    if solucao:
        return None, "em solução aquosa (aq)"
    if _PROIBIDO.search(resto):
        return None, "valor aproximado, limite ou intervalo"
    m = _RE_NUMERO.match(resto)
    if not m:
        return None, "sem número no início"
    sinal, mant, exp = m.groups()
    try:
        v = Decimal(mant.replace(",", ""))
        if exp:
            v = v * (Decimal(10) ** int(exp))
    except InvalidOperation:
        return None, "número ilegível"
    if sinal == "-":
        v = -v
    cauda = resto[m.end():]
    cauda = re.sub(r"^\s*(?:±|\+-|\+/-)\s*\d+(?:\.\d+)?", "", cauda)         # incerteza: ignorada
    cauda = re.sub(r"^\(\d+\)", "", cauda)                                    # incerteza concisa: 393.51(13)
    if re.match(r"^\s*[-–…]+\s*(?:\d|$)|^\s*\.\.\.", cauda):
        return None, "valor aproximado, limite ou intervalo"
    conv = UNIDADES[familia].get(_unidade_compacta(cauda))
    if conv is None:
        return None, "unidade fora da lista"
    return {"valor": v * conv[0], "unidade": conv[1], "fase": fase, "original": v}, None


def interpretar(bruto, familia):
    """Texto bruto do campo -> ([segmentos], [motivos dos descartados]) ou (None, [motivo])."""
    segs, motivo = _limpar(bruto)
    if segs is None:
        return None, [motivo]
    ok, motivos = [], []
    for s in segs:
        r, m = _segmento(s, familia)
        (ok.append(r) if r else motivos.append(m))
    return ok, motivos


def escolher_segmento(segmentos, estado):
    """Fase certa de um campo com uma ou mais fases. Devolve (segmento, None) ou (None, motivo)."""
    if not segmentos:
        return None, "nenhum valor aproveitável"
    if estado:
        iguais = [s for s in segmentos if s["fase"] == estado]
        if len(iguais) == 1:
            return iguais[0], None
        if len(iguais) > 1:
            return None, "várias declarações da mesma fase"
        sem_fase = [s for s in segmentos if s["fase"] is None]
        if len(segmentos) == 1 and len(sem_fase) == 1:
            return sem_fase[0], None
        return None, "fase diferente do estado padrão" if all(s["fase"] for s in segmentos) else "fase ambígua"
    if len(segmentos) == 1:
        return segmentos[0], None
    condensadas = [s for s in segmentos if s["fase"] in ("solido", "liquido")]
    if len(condensadas) == 1:
        return condensadas[0], None
    return None, "fase ambígua com o estado desconhecido"


def plausivel(campo, v):
    if campo == "entropiaPadraoJmolK":
        return Decimal(10) < v < Decimal(3000)
    return abs(v) < Decimal(10000)


def extrair(wikitexto, estado):
    """Wikitexto da introdução -> ({campo do pacote: {"valor": Decimal, "unidade", "fase", "original", "campoOriginal"}}, descartadas {motivo: n},
    amostras de texto não reconhecido). Só entra o que o analisador entende por completo."""
    brutos = campos_chembox(wikitexto)
    valores, descartadas, nao_reconhecidos = {}, {}, []

    def descartar(m):
        descartadas[m] = descartadas.get(m, 0) + 1

    for campo_wiki, ocorrencias in brutos.items():
        campo, familia = CAMPOS_TERMO[campo_wiki]
        if len(set(ocorrencias)) > 1:
            descartar("campo repetido com valores diferentes")
            continue
        segs, motivos = interpretar(ocorrencias[0], familia)
        if not segs:
            descartar((motivos or ["sem valor"])[0])
            if len(nao_reconhecidos) < 5 and motivos != ["vazio"]:
                nao_reconhecidos.append((campo_wiki, ocorrencias[0][:90]))
            continue
        escolhido, motivo = escolher_segmento(segs, estado)
        if escolhido is None:
            descartar(motivo)
            if motivos and len(nao_reconhecidos) < 5:
                nao_reconhecidos.append((campo_wiki, ocorrencias[0][:90]))
            continue
        if not plausivel(campo, escolhido["valor"]):
            descartar("fora da faixa física plausível")
            continue
        valores[campo] = dict(escolhido, campoOriginal=campo_wiki)
    return valores, descartadas, nao_reconhecidos


# ------------------------------------------------------------------------------------------------ origem de cada valor
def permalink(titulo, revid):
    return f"https://en.wikipedia.org/w/index.php?title={urllib.parse.quote(titulo.replace(' ', '_'))}&oldid={revid}"


def fonte_valor(pagina, v, hoje):
    """Origem de um valor (DATA_CONTRACT §3.1): Wikipedia (en), com o permalink da revisão lida."""
    titulo, revid = pagina["titulo"], pagina["revid"]
    f = {"nome": f"{NOME_FONTE}: {titulo}", "url": permalink(titulo, revid), "licenca": LICENCA, "acessadoEm": hoje,
         "urlArtigo": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(titulo.replace(' ', '_'))}", "revisao": revid,
         "campoOriginal": v["campoOriginal"], "valorOriginal": CP._num(v["original"], 6), "unidadeOriginal": v["unidade"],
         "atribuicao": f"Wikipedia (en), «{titulo}», revisão {revid}, CC BY-SA 4.0 (autores no histórico do artigo); "
                       f"valor do campo {v['campoOriginal']} do chembox"}
    if v["fase"]:
        f["condicoes"] = {"fase": v["fase"]}
    return f


# ------------------------------------------------------------------------------------------------ etapa do build
def titulos_en(compostos, meta, http=None, log=print):
    """{cid: título do artigo em inglês}: de `meta[cid]["artigos"]["en"]` (coleta de compostos); se o build não pediu o inglês, lê os
    sitelinks `enwiki` do Wikidata (wbgetentities, 50 itens por chamada)."""
    meta = meta or {}
    titulos = {c["cid"]: meta[c["cid"]]["artigos"]["en"] for c in compostos if (meta.get(c["cid"]) or {}).get("artigos", {}).get("en")}
    sem_meta = not titulos
    if sem_meta and http is not None and any(c.get("wikidata") for c in compostos):
        import wikidata as W
        ents = W.entidades(http, [c["wikidata"] for c in compostos if c.get("wikidata")], ["en"], log=log)
        titulos = {c["cid"]: ents[c["wikidata"]]["artigos"]["en"] for c in compostos
                   if c.get("wikidata") in ents and ents[c["wikidata"]]["artigos"].get("en")}
    for c in compostos:
        if c["cid"] not in titulos and c["cid"] in TITULO_EN_CURADO:
            titulos[c["cid"]] = TITULO_EN_CURADO[c["cid"]]
    return titulos


def _diverge(a, b):
    return abs(a - b) > DIVERGENCIA * max(abs(a), abs(b))


def coletar(http, compostos, meta, hoje, log=print, titulos=None, paginas=None):
    """Acrescenta a termoquímica do chembox a `compostos` (in place): `propriedades[campo]` + `fontesPorPropriedade[campo]`.

    Roda DEPOIS de coleta_propriedades (precisa do `estadoPadrao`). O chembox vale mais que o Wikidata (P3078): substitui o
    `entalpiaFormacaoKJmol` já gravado e registra em `stats.divergenteDoWikidata` os que diferem mais de 2 %; a única exceção é o valor do
    Wikidata com a fase explícita IGUAL ao `estadoPadrao` contra um valor do chembox sem fase (o do artigo costuma ser o do gás de um
    líquido), que fica (`mantidoWikidataPorFase`). `titulos`/`paginas`: injeção para teste ({cid: título}; {título: página}).
    Devolve stats (contagens, descartes por motivo, amostras, falhas de rede)."""
    titulos = titulos if titulos is not None else titulos_en(compostos, meta, http, log)
    falhas = []
    if paginas is None:
        paginas, falhas = ler_paginas(http, list(titulos.values()), log)
    stats = {"compostos": len(compostos), "comTituloEn": len(titulos), "paginasLidas": sum(1 for p in paginas.values() if p),
             "semArtigoEn": sum(1 for c in compostos if c["cid"] not in titulos), "semPagina": 0, "qidDiferente": 0, "semCampo": 0,
             "tituloCurado": sum(1 for c in compostos if c["cid"] in titulos and titulos[c["cid"]] == TITULO_EN_CURADO.get(c["cid"])),
             "publicados": {c: 0 for c in CAMPOS_PACOTE}, "descartadas": {}, "excluidosPorCuradoria": 0,
             "substituiuWikidata": 0, "iguaisAoWikidata": 0, "mantidoWikidataPorFase": 0, "divergenteDoWikidata": {"n": 0, "amostra": []},
             "naoReconhecidos": [], "falhas": falhas}
    for c in compostos:
        titulo = titulos.get(c["cid"])
        if not titulo:
            continue
        pg = paginas.get(titulo)
        if not pg:
            stats["semPagina"] += 1
            continue
        curado = TITULO_EN_CURADO.get(c["cid"]) == titulo
        if not curado and c.get("wikidata") and pg.get("qid") and pg["qid"] != c["wikidata"]:
            stats["qidDiferente"] += 1
            continue
        propriedades = c.get("propriedades") or {}
        valores, descartadas, nao_rec = extrair(pg["wikitexto"], propriedades.get("estadoPadrao"))
        for m, n in descartadas.items():
            stats["descartadas"][m] = stats["descartadas"].get(m, 0) + n
        if nao_rec and len(stats["naoReconhecidos"]) < 40:
            stats["naoReconhecidos"] += [{"cid": c["cid"], "artigo": pg["titulo"], "campo": k, "texto": t} for k, t in nao_rec]
        if not valores and not descartadas:
            stats["semCampo"] += 1
        for campo in [k for k in valores if k in EXCLUIR.get(c["cid"], (frozenset(), ""))[0]]:
            del valores[campo]
            stats["excluidosPorCuradoria"] += 1
        for campo, v in valores.items():
            novo = CP._num(v["valor"], CASAS)
            destino = c.setdefault("propriedades", {})
            anterior = destino.get(campo)
            if anterior is not None and campo == "entalpiaFormacaoKJmol":
                if _diverge(Decimal(str(anterior)), Decimal(str(novo))):
                    stats["divergenteDoWikidata"]["n"] += 1
                    if len(stats["divergenteDoWikidata"]["amostra"]) < 25:
                        stats["divergenteDoWikidata"]["amostra"].append(
                            {"cid": c["cid"], "nome": c.get("nome"), "chembox": novo, "wikidata": anterior})
                    fase_wd = (((c.get("fontesPorPropriedade") or {}).get(campo) or {}).get("condicoes") or {}).get("fase")
                    if v["fase"] is None and fase_wd is not None and fase_wd == propriedades.get("estadoPadrao"):
                        stats["mantidoWikidataPorFase"] += 1
                        continue
                else:
                    stats["iguaisAoWikidata"] += 1
                stats["substituiuWikidata"] += 1
            destino[campo] = novo
            c.setdefault("fontesPorPropriedade", {})[campo] = fonte_valor(pg, v, hoje)
            stats["publicados"][campo] += 1
    return stats
