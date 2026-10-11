# -*- coding: utf-8 -*-
"""Família CONCEITOS A PARTIR DOS TEXTOS EM PORTUGUÊS do pacote (Wikipédia e Wikilivros, CC BY-SA 4.0).

A resposta é SEMPRE um recorte LITERAL do trecho, em frases completas (o gerador confere que o recorte existe no trecho), com a
atribuição em `fontes` (id do trecho, URL do artigo, revisão, licença e a alteração feita: "recorte em frases completas"). Modelos:

  - "O que é X?" / "O que são X?" (duas formas de perguntar) — a partir de uma frase DEFINITÓRIA ("X é um/uma ...", "X são ...") cujo
    sujeito é o assunto do artigo (Wikipédia: só a primeira definição) ou um termo curto (Wikilivros); resposta: essa frase (e a
    seguinte, se couber no limite);
  - "Explique X" — a mesma definição seguida das frases seguintes do trecho (2 a 4 frases);
  - "Para que serve X?" — frases cujo SUJEITO é X e que dizem como X é usado ("O X é usado em...", "É utilizado na..." logo depois de
    uma frase sobre X);
  - "Quais as características de X?", "Onde X é encontrado?", "Qual a origem do nome de X?" (artigos de elementos e compostos);
  - "Me conte mais sobre X" — continuação do artigo (2º trecho em diante), a partir da frase que retoma X pelo nome;
  - "Quem foi X?" — biografias de cientistas;
  - "Qual a diferença entre A e B?" — só onde o trecho compara A e B explicitamente (lista conferida à mão: DIFERENCAS).

Ficam de fora: frases com resto de fórmula LaTeX, notas de rodapé, figuras, listas, títulos, referências a "Wikipédia"; frases que
começam retomando a anterior ("Isso", "Esse", "Assim"...); nos artigos de elementos e compostos, frases com números soltos que não sejam o
número atômico ou o ano de descoberta do pacote (os números são do pacote, não do texto); frases que citam autores de livros protegidos;
trechos que o explicador não consegue receber (id com mais de 80 caracteres, recorte além dos 1200 primeiros caracteres) e recortes com
número que o montador do explicador não ancora no trecho. SEGURANÇA: artigos sobre explosivos, armas químicas, drogas ilícitas,
precursores e venenos (nomes de `dados_recusas` e palavras-chave) não geram pares automáticos; em todos os artigos, ficam fora as frases
que descrevem como uma substância é produzida ou obtida, as que falam de armas, guerra, explosivos, drogas ou venenos e as que tratam de
dose letal, suicídio ou de ferir alguém; nenhuma resposta pode trazer passos de procedimento (conferido por teste com ask_core).
"""
import re
import sys

import dados_recusas
from comum import REPO
from comum import Resp, cap, fold, genero, numeros_do_texto, renderizar
from fontes_permitidas import PROIBIDAS_NO_NOME
from qa_base import Ctx, SubCtx, fonte_trecho, id_alinhado

try:  # mesma conferência de números do montador do explicador (backend/retrain/build_ask_dataset.py); opcional
    sys.path.insert(0, str(REPO / "backend" / "modal"))
    import ask_core as _ask_core  # noqa: E402
except Exception:  # pragma: no cover
    _ask_core = None

FAM = "conceitos_texto"
PASTAS = ("wikipedia-pt", "wikibooks-pt")
ALTERACAO = "recorte em frases completas (texto literal, sem outras mudanças)"
LIMITE_DEF = 480
LIMITE_EXPL = 800
LIMITE_USO = 520
MIN_FRASE, MAX_FRASE = 25, 420

# títulos cujo artigo NÃO trata do sentido químico do termo (a pergunta "O que é X?" seria respondida fora do contexto da química)
FORA_DO_SENTIDO_QUIMICO = {"conformacao", "infixo", "sufixo", "ressonancia"}  # ressonância: o artigo é o da física (vibração), não o das estruturas

_ABREV = re.compile(r"(?:\b(?:[A-ZÁÉÍÓÚ]|Sr|Sra|Dr|Dra|Prof|Profa|etc|ex|p\.ex|n\.º|nº|a\.C|d\.C|séc|sec|aprox|Fig|fig|vol|pág|pp|cap|Inc|Ltd|Jr|cf|i\.e|e\.g|U\.S|S\.A|Ma|Mt|vs)\.)$")
_INICIO_ANAFORICO = re.compile(
    r"^(?:assim|por isso|portanto|logo|dessa forma|desta forma|desse modo|deste modo|esse|essa|esses|essas|este|esta|estes|estas|isso|isto|"
    r"ele|ela|eles|elas|tamb[eé]m|al[eé]m disso|no entanto|contudo|entretanto|por[eé]m|mas|e|ou|j[aá]|nesse|neste|nessa|nesta|nesses|nestes|"
    r"em seguida|da[ií]|por outro lado|outro|outra|outros|outras|o mesmo|a mesma|os mesmos|as mesmas|tal|tais|seu|sua|seus|suas|"
    r"o seu|a sua|os seus|as suas|o qual|a qual|cujo|cuja|"
    r"dentre eles|entre eles|exemplo|por exemplo|como resultado|como consequ[eê]ncia|consequentemente|ainda|apesar disso|aqui|ali)\b", re.I)
_RUIDO = re.compile(r"\{\\displaystyle|\\[a-z]+|\[editar|\[carece|\[\d+\]|https?://|www\.|wikip[eé]dia|wikilivros|wikibooks|→|⇌|⟶|®|\s{2,}\S\s{2,}|"
                    r"\(figura|\bfigura \d|\bfig\. ?\d|\bna figura\b|\bna tabela\b|\btabela \d|\bao lado\b|\bmostrad[oa]s? (?:abaixo|acima)\b|"
                    r"\babaixo\b(?! de)|\ba seguir\b|\bconforme (?:a|o) (?:figura|tabela|imagem)\b|\(ouça\)|\bver tamb[eé]m\b|-{3,}|_{3,}|={3,}|"
                    r"\bilustrad[oa]s?\b|\bna imagem\b|\bno desenho\b|\bno esquema\b", re.I)
# Recortes automáticos nunca descrevem COMO uma substância é produzida/obtida (nem processos industriais): essa informação, quando
# legítima, fica para os pares revisados à mão. Também ficam fora frases sobre armas, guerra, explosivos, drogas e venenos.
_PRODUCAO = re.compile(r"\b(?:é|são|foi|foram|pode ser|podem ser|sendo)\s+(?:\w+\s+){0,2}?(?:produzid|obtid|preparad|sintetizad|fabricad|manufaturad|"
                       r"extra[ií]d|isolad)\w*|\bobt[eé]m-se\b|\bproduz-se\b|\bprepara-se\b|\bsintetiza-se\b|\bpor eletr[oó]lise\b|"
                       r"\bnuma reac?[cç][aã]o de\b|\bnitra[cç][aã]o\b|\bprocesso (?:de produ[cç][aã]o|industrial)\b", re.I)
_SENSIVEL_FRASE = re.compile(r"suic[ií]d|\bletal|\bletais|\bld50|dose letal|\bmat(?:ar|ando|ou|a)\b|assassin|envenen", re.I)
_GUERRA = re.compile(r"\barmas?\b|\barmament|\bguerra|militar|b[eé]lic|explosiv|\bbombas?\b|\bdrogas?\b|alucin[oó]gen|entorpecent|venen", re.I)
_COPULA = re.compile(r"\s(é|são)\s")
_CONTEXTO_INICIAL = re.compile(r"^(?:(?:Na|No|Em|Nas|Nos|Pela|Pelo|Segundo a|Segundo o|De acordo com a|De acordo com o)\s[^,]{2,60},\s*)", re.I)
_PREDICADO_DEF = re.compile(
    r"^(?:o|a|os|as|um|uma|uns|umas|toda|todo|qualquer|cada|chamad[oa]s?|conhecid[oa]s?|definid[oa]s?|formad[oa]s?|constitu[ií]d[oa]s?|"
    r"compostos?|subst[aâ]ncias?|[aá]tomos|mol[eé]culas|[ií]ons|part[ií]culas|elementos|rea[cç][oõ]es|misturas|materiais|grandezas?|"
    r"propriedades?|fen[oô]menos|processos?|m[eé]todos?|t[eé]cnicas?|fun[cç][oõ]es|classes?|grupos?|esp[eé]cies|hidrocarbonetos|"
    r"pol[ií]meros|macromol[eé]culas|sais|[aá]cidos|bases|[oó]xidos|metais|n[aã]o metais|gases|l[ií]quidos|s[oó]lidos)\b", re.I)
_SUJ_RUIM = re.compile(r"^(?:quanto|como|quando|onde|porque|por que|se|que|qual|quais|isso|isto|ele|ela|eles|elas|este|esta|esse|essa|"
                       r"aquele|aquela|h[aá]|existe|existem|outro|outra|outros|outras|tal|tais|todos|todas|alguns|algumas|muitos|muitas|"
                       r"v[aá]rios|v[aá]rias|ambos|ambas|cada|a maioria|grande parte|parte|"
                       r"(?:o|a|os|as|um|uma) (?:termo|palavra|nome|express[aã]o|exemplo|caso|tipo|primeir[oa]|segund[oa]|[uú]ltim[oa]|[uú]nic[oa]|"
                       r"principal|principais|maior|menor|mais|menos|melhor|pior|resultado|objetivo|problema|restante|resto|sua|seu|suas|seus))\b", re.I)
_ARTIGO = re.compile(r"^(o|a|os|as|um|uma)\s+", re.I)
# o que fica entre o sujeito (cortado na 1ª vírgula) e a cópula tem de ser um aposto ("X, também chamado Y, é..."), não uma restrição
# ("A matéria orgânica, no estado sólido, presente na rocha... é chamada de querogênio" não define "matéria orgânica")
_APOSTO = re.compile(r"^\s*(?:tamb[eé]m|conhecid|chamad|denominad|designad|ou\b|do latim|do grego|do [aá]rabe|de f[oó]rmula|com f[oó]rmula|"
                     r"cuj[oa]s?\b|que\b|em qu[ií]mica|na qu[ií]mica|oficialmente|mais conhecid|popularmente|vulgarmente|abreviad|"
                     r"s[ií]mbolo|iupac|nome|sigla|ou seja|isto [eé]|em portugu[eê]s|em ingl[eê]s|plural|tamb[eé]m grafad)", re.I)


# ---------------------------------------------------------------------------------------------------------
# Frases
# ---------------------------------------------------------------------------------------------------------
def dividir_frases(texto: str) -> list:
    """Frases do trecho, na ordem. Cada parágrafo é dividido em fronteiras de frase (pontuação final + espaço + maiúscula), sem cortar em
    abreviações e iniciais ("George A. Olah"). Linhas sem pontuação final (títulos, itens, equações) viram "frases" inválidas que
    interrompem um recorte."""
    out = []
    for par in re.split(r"\n+", texto or ""):
        par = re.sub(r"[ \t]+", " ", par).strip()
        if not par:
            continue
        partes = re.split(r"(?<=[.!?])[\"”»)]?\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ“\"«(])", par)
        buf = ""
        for s in partes:
            buf = f"{buf} {s}".strip() if buf else s
            if _ABREV.search(buf):
                continue
            out.append(buf)
            buf = ""
        if buf:
            out.append(buf)
    return out


def _tem_math(s: str) -> bool:
    return any(0x1D400 <= ord(c) <= 0x1D7FF for c in s)


# autores de livros protegidos e fontes fora da política: um recorte nunca os menciona (o explicador não cita livros nem autores)
_PROIBIDOS = re.compile(r"(?<![a-z0-9])(?:" + "|".join(re.escape(p) for p in sorted(set(PROIBIDAS_NO_NOME) | {"tito e canto", "martha reis", "moderna plus"},
                                                                                         key=len, reverse=True)) + r")(?![a-z0-9])")


def frase_ok(s: str, sem_numeros: bool, permitidos=frozenset()) -> bool:
    """Frase completa e limpa. `sem_numeros`: (artigos de elementos e compostos) números soltos só se estiverem em `permitidos`
    (ex.: o número atômico do elemento do artigo, igual ao do pacote) — outros valores podem divergir do pacote."""
    if not s or not (MIN_FRASE <= len(s) <= MAX_FRASE):
        return False
    if not re.search(r"[.!?][\"”»)]?$", s) or s.endswith(":"):
        return False
    if _RUIDO.search(s) or _tem_math(s) or _SENSIVEL_FRASE.search(fold(s)) or _GUERRA.search(s) or _PRODUCAO.search(s) or _PROIBIDOS.search(fold(s)):
        return False
    if s.count("(") != s.count(")") or s.count("“") != s.count("”") or s.count('"') % 2:
        return False
    if sem_numeros and any(tok not in permitidos for tok in numeros_do_texto(s)):
        return False
    return True


def recorte(frases, i, oks, limite, max_frases):
    """Frases i, i+1, ... (todas válidas) até `max_frases` ou o limite de caracteres."""
    sel = []
    total = 0
    for j in range(i, min(len(frases), i + max_frases)):
        if not oks[j]:
            break
        if sel and total + 1 + len(frases[j]) > limite:
            break
        sel.append(frases[j])
        total += len(frases[j]) + (1 if len(sel) > 1 else 0)
    return " ".join(sel), len(sel)


# ---------------------------------------------------------------------------------------------------------
# Assunto, sensibilidade e definição
# ---------------------------------------------------------------------------------------------------------
def titulo_limpo(t: dict) -> str:
    tit = re.sub(r"\s*\([^)]*\)", "", t.get("titulo") or "").strip()
    return tit.split("/")[-1].strip()


def _radicais(texto: str):
    return {fold(w)[:5] for w in re.findall(r"[A-Za-zÀ-ÿ]{4,}", texto)}


_NOMES_PERIGOSOS = None


def nomes_perigosos():
    """Nomes das listas de `dados_recusas` (explosivos, guerra química, drogas, precursores), sem acento e sem artigo."""
    global _NOMES_PERIGOSOS
    if _NOMES_PERIGOSOS is None:
        nomes = set()
        for lista in dados_recusas.CATEGORIAS.values():
            for nome, _ in lista:
                n = re.sub(r"^(?:um|uma|o|a)\s+", "", fold(nome))
                n = re.split(r"\s+(?:para|como|a partir)\b", n)[0].strip()
                if len(n) >= 3:
                    nomes.add(n)
        _NOMES_PERIGOSOS = nomes
    return _NOMES_PERIGOSOS


def artigo_sensivel(t: dict, primeira: str) -> bool:
    """Explosivos, armas químicas, drogas, precursores e venenos: nada é gerado automaticamente a partir desses artigos."""
    alvo = fold(f"{t.get('titulo') or ''} {primeira or ''}")
    if re.search(r"explosiv|arma(?:s)? quimic|gas(?:es)? de guerra|agente de guerra|\bdroga|alucinogen|entorpecent|psicoativ|\bveneno|cianet|cianidric", alvo):
        return True
    tit = fold(titulo_limpo(t))
    return any(re.search(r"(?<![a-z])" + re.escape(n) + r"(?![a-z])", tit) for n in nomes_perigosos())


def definicao(s: str):
    """(sujeito como escrito, cópula 'é'|'são') se a frase é definitória ("X é um ...", "X são ..."); senão None."""
    resto = _CONTEXTO_INICIAL.sub("", s)
    m = _COPULA.search(resto)
    if not m or m.start() > 140:
        return None
    bruto = re.sub(r"\s*\([^)]*\)", "", resto[:m.start()])
    if ":" in bruto:
        return None  # "A existência da isomeria: são moléculas..." (título de item, não sujeito)
    predicado = resto[m.end():]
    if len(s) < 40 or re.match(r"^(?:o mesmo|a mesma|os mesmos|as mesmas|igual|iguais|semelhante|diferente|o contr[aá]rio)\b", predicado, re.I):
        return None  # "A nomenclatura é a mesma." não define nada
    partes = re.split(r",|\s+—\s+|\s+-\s+", bruto, maxsplit=1)
    if len(partes) > 1 and partes[1].strip() and not _APOSTO.search(partes[1]):
        return None
    suj = re.split(r"\s+(?:ou|também)\b", partes[0])[0].strip().strip(" ,;:\"“”'-–—")
    suj = re.sub(r"^(?:o|a)\s+(?:composto|subst[aâ]ncia|elemento)(?:\s+qu[ií]mic[oa])?\s+(?=\w)", "", suj, flags=re.I)  # "o composto químico X" -> "X"
    if (not suj or _SUJ_RUIM.search(suj) or re.search(r"\d|:", suj) or re.search(r"\s(?:e|com|de modo|quando|onde|se)\s", suj)
            or re.search(r"\bque\b", suj, re.I)):
        return None  # sujeito com oração ("o que determina o elemento que...") ou com dois-pontos não é um termo a definir
    if re.search(r"\b(?:mais|menos|maior|menor|principal|principais|comum|comuns|primeir[oa]|[uú]ltim[oa]|seu|sua|seus|suas)\b", suj, re.I):
        return None  # superlativos e possessivos: "o composto mais comum do titânio" não é um termo a definir
    palavras = _ARTIGO.sub("", suj).split()
    if not 1 <= len(palavras) <= 6 or not any(len(w) >= 3 for w in palavras):
        return None
    if not _PREDICADO_DEF.search(predicado):
        return None
    return suj, m.group(1)


def _sujeito_pergunta(suj: str, copula: str, tipo_texto: str):
    """Sujeito pronto para a pergunta: concepts sem artigo definido ("O que é cinética química?"), substâncias com artigo
    ("O que é o etanol?"), indefinido preservado ("O que é um ácido?")."""
    m = _ARTIGO.match(suj)
    art = m.group(1).lower() if m else ""
    nucleo = suj[m.end():] if m else suj
    nome_proprio = any(w[:1].isupper() for w in nucleo.split()[1:] if len(w) > 2)  # "Sistema Internacional de Unidades"
    if nucleo[:1].isupper() and not nucleo[:2].isupper() and not re.match(r"^[A-Z][a-z]?\b", nucleo) and not nome_proprio:
        nucleo = nucleo[:1].lower() + nucleo[1:]
    if art in ("um", "uma"):
        return f"{art} {nucleo}", copula
    if tipo_texto in ("composto", "elemento"):
        g = genero(nucleo) if tipo_texto == "composto" else "o"
        art2 = (art if art in ("o", "a") else ("a" if g == "a" else "o"))
        return (f"{art2} {nucleo}" if copula == "é" else nucleo), copula
    return nucleo, copula


MODELOS_DEF_SING = ["O que é {s}?", "O que significa {s}?", "Qual a definição {s_de}?", "Defina {s}.", "{S}: o que é?", "Me diga o que é {s}."]
MODELOS_DEF_PLUR = ["O que são {s}?", "Qual a definição {s_de}?", "Defina {s}.", "{S}: o que são?", "Me diga o que são {s}."]
MODELOS_EXPL_SING = ["Explique o que é {s}.", "Me explique {s}.", "Fale sobre {s}.", "Explique {s}.", "O que você pode me dizer sobre {s}?"]
MODELOS_EXPL_PLUR = ["Explique o que são {s}.", "Me explique {s}.", "Fale sobre {s}.", "O que você pode me dizer sobre {s}?"]
MODELOS_USO = ["Para que serve {s}?", "Para que {usado} {s}?", "Quais são os usos {s_de}?", "Onde se usa {s}?", "Qual a aplicação {s_de}?"]
MODELOS_CARACT = ["Quais são as características {s_de}?", "Como é {s}? Descreva o aspecto.", "Descreva o aspecto {s_de}.", "Como {s} se apresenta?",
                  "Qual a aparência {s_de}?"]
MODELOS_MAIS = ["Me conte mais sobre {s}.", "O que mais se sabe sobre {s}?", "Fale mais sobre {s}.", "Que outras informações existem sobre {s}?"]
MODELOS_OCORRE = ["Onde {s} {encontrado}?", "Onde se encontra {s} na natureza?", "Em que lugares {s} aparece?", "Onde {s} ocorre?"]
MODELOS_NOME = ["Qual a origem do nome {s_de}?", "De onde vem o nome {s_de}?", "Por que {s} tem esse nome?"]
MODELOS_PESSOA = ["Quem foi {s}?", "Quem era {s}?", "Me diga quem foi {s}."]
MODELOS_PESSOA_EXPL = ["Fale sobre {s}.", "O que {s} fez pela química?", "Qual a importância de {s}?"]

_USO_VERBO = re.compile(r"\b(?:é|são|foi|foram|pode ser|podem ser)\s+(?:\w+\s+){0,2}?(?:usad|utilizad|empregad|aplicad)\w*\s+"
                        r"(?:como|para|na|no|nas|nos|em|pela|pelo|principalmente|sobretudo|amplamente|largamente|atualmente|também|ainda|há)\b")
_USO_ELIDIDO = re.compile(r"^(?:É|São)\s+(?:\w+\s+){0,2}?(?:usad|utilizad|empregad)\w*\s+(?:como|para|na|no|nas|nos|em)\b")
_USO_META = re.compile(r"\b(?:termo|nome|express[aã]o|palavra|designa[cç][aã]o|sigla|t[ií]tulo|s[ií]mbolo)\b", re.I)
_USO_PARA_META = re.compile(r"para (?:distinguir|referir|designar|descrever|indicar|representar|denominar|nomear)", re.I)
# traços de ASPECTO (o que se vê, cheira ou toca); perigo (tóxico, corrosivo...) não conta como aspecto
_CARACT = re.compile(r"\b(?:incolor|inodor|odor|cheiro|sabor|colora[cç][aã]o|l[ií]quid[oa]|s[oó]lid[oa]|gasos[oa]|g[aá]s|vol[aá]til|"
                     r"cristalin[oa]|branc[oa]|amarel[oa]|esverdead[oa]|avermelhad[oa]|azulad[oa]|prateado|cinzent[oa]|"
                     r"met[aá]lic[oa]|brilhante|male[aá]vel|d[uú]ctil|mole|macio|viscos[oa]|oleos[oa]|cerosa?|"
                     r"transparente|transl[uú]cid[oa]|opac[oa]|p[oó] branco)\w*", re.I)
_CARACT_INICIO = re.compile(r"^(?:É|São|Apresenta-se|Em condições ambientes|Nas condições ambientes|Sob condições normais|À temperatura ambiente|"
                            r"Em temperatura ambiente|Quando puro|Em CNTP|Puro)\b")
_OCORRE = re.compile(r"\b(?:é|são|foi|foram|pode ser|podem ser)\s+(?:\w+\s+){0,2}?encontrad[oa]s?\s+(?!no estado|em estado|sob\b)(?:em|na|no|nas|nos|"
                     r"principalmente|naturalmente|livre|combinad|dissolvid|apenas|somente)\b|\bocorrem?\s+(?:naturalmente|na natureza|livre)\b|"
                     r"\bencontra-se\s+(?!no estado|em estado|sob\b|à temperatura)(?:na natureza|em|nos|nas|no|na|livre|dissolvid)|"
                     r"\best[aá] presente\b|\best[aã]o presentes\b|\bn[aã]o (?:é|são) encontrad", re.I)
_ETIMOLOGIA = re.compile(r"\((?:do|dos|da) (?:grego|latim|alem[aã]o|[aá]rabe|ingl[eê]s|franc[eê]s|sueco|persa|catal[aã]o)\b|\bem homenagem\b|"
                         r"\bnome (?:dado|deriva|vem|tem origem)\b|\bderiva do\b", re.I)
_PESSOA = re.compile(r"\bfoi\s+(?:um|uma)\s+(?:\w+\s+){0,2}?(?:qu[ií]mic|f[ií]sic|cientista|matem[aá]tic|m[eé]dic|farmac[eê]utic|engenheir|"
                     r"fil[oó]sof|naturalista|meteorologista|bi[oó]log|professor|pesquisador)", re.I)


def _vals(s):
    return {"s": s, "S": cap(s), "s_de": _de(s)}


def _de(s):
    """'o etanol' -> 'do etanol'; 'cinética química' -> 'de cinética química'; 'um ácido' -> 'de um ácido'."""
    m = re.match(r"^(o|a|os|as)\s+(.*)$", s)
    if m:
        return {"o": "do", "a": "da", "os": "dos", "as": "das"}[m.group(1)] + " " + m.group(2)
    return f"de {s}"


# ---------------------------------------------------------------------------------------------------------
# Diferenças: só onde o trecho compara explicitamente os dois termos (conferido à mão). (A, B, id do trecho, início da 1ª frase, n frases)
# ---------------------------------------------------------------------------------------------------------
DIFERENCAS = [
    ("densidade", "massa específica", "wikipedia-pt-densidade-002", "Há uma pequena diferença entre densidade e massa específica", 2),
    ("concentração de um ácido", "força de um ácido", "wikipedia-pt-acido-001", "Enquanto a concentração informa quanto ácido existe", 1),
    ("diamante", "grafite", "wikipedia-pt-carbono-002", "As propriedades físicas do carbono variam de acordo com sua forma alotrópica", 3),
    ("ligação covalente", "ligação iônica", "wikipedia-pt-ligacao-covalente-002", "Ao contrário das ligações iônicas", 2),
    ("eletrófilo", "nucleófilo", "wikipedia-pt-mecanismo-de-reacao-001", "As moléculas que tendem a aceitar os elétrons em uma reação", 1),
    ("substância hidrofóbica", "substância hidrofílica", "wikipedia-pt-solucao-aquosa-001", "Substâncias que não se dissolvem bem em água", 2),
    ("metal nobre", "metal precioso", "wikipedia-pt-metal-nobre-001", "Metal nobre é um metal pouco reativo", 2),
    ("evaporação", "ebulição", "wikipedia-pt-ponto-de-ebulicao-002", "Líquidos podem passar ao estado de vapor em temperaturas inferiores", 3),
    ("energia livre de Gibbs", "energia livre de Helmholtz", "wikipedia-pt-processo-espontaneo-001", "Por exemplo, a mudança de energia livre de Gibbs", 1),
    ("ponto de ebulição normal", "ponto de ebulição padrão", "wikipedia-pt-ponto-de-ebulicao-002", "O ponto de ebulição normal, também chamado", 2),
    ("coloide", "suspensão", "wikipedia-pt-coloide-001", "Em sentido mais restrito, um coloide se distingue", 1),
    ("solvente", "soluto", "wikipedia-pt-solucao-001", "Quando uma solução é muito rica em um componente", 1),
    ("átomo doador", "átomo receptor numa ligação dativa", "wikipedia-pt-ligacao-covalente-dativa-002", "O átomo (ou molécula) doador de elétrons adquire carga formal positiva", 1),
]
MODELOS_DIF = ["Qual a diferença entre {a} e {b}?", "Qual é a diferença entre {a} e {b}?", "{A} e {b}: qual a diferença?", "Como diferenciar {a} de {b}?",
               "Explique a diferença entre {a} e {b}."]
# Diferenças entre DOIS artigos: a resposta junta a frase definitória de cada um (literais, cada uma com a sua fonte). (A, id de A, B, id de B)
DIFERENCAS_ENTRE_ARTIGOS = [
    ("reação endotérmica", "wikipedia-pt-reacao-endotermica-001", "reação exotérmica", "wikipedia-pt-reacao-exotermica-001"),
    ("fenômeno físico", "wikipedia-pt-fenomeno-fisico-001", "fenômeno químico", "wikipedia-pt-fenomeno-quimico-001"),
    ("cátion", "wikipedia-pt-cation-001", "ânion", "wikipedia-pt-anion-001"),
    ("isótopos", "wikipedia-pt-isotopo-001", "isóbaros", "wikipedia-pt-isobaro-001"),
    ("isóbaros", "wikipedia-pt-isobaro-001", "isótonos", "wikipedia-pt-isotono-001"),
    ("isótopos", "wikipedia-pt-isotopo-001", "isótonos", "wikipedia-pt-isotono-001"),
    ("mistura", "wikipedia-pt-mistura-001", "substância", "wikipedia-pt-substancia-001"),
    ("alceno", "wikipedia-pt-alceno-001", "alcino", "wikipedia-pt-alcino-001"),
    ("aldeído", "wikipedia-pt-aldeido-001", "cetona", "wikipedia-pt-cetona-001"),
    ("amina", "wikipedia-pt-amina-001", "amida", "wikipedia-pt-amida-001"),
    ("decantação", "wikipedia-pt-decantacao-001", "filtração", "wikipedia-pt-filtracao-001"),
    ("destilação", "wikipedia-pt-destilacao-001", "filtração", "wikipedia-pt-filtracao-001"),
    ("solução", "wikipedia-pt-solucao-001", "suspensão", "wikipedia-pt-suspensao-quimica-001"),
    ("fusão", "wikipedia-pt-fusao-001", "ebulição", "wikipedia-pt-ebulicao-001"),
    ("ebulição", "wikipedia-pt-ebulicao-001", "condensação", "wikipedia-pt-condensacao-001"),
    ("ligação iônica", "wikipedia-pt-ligacao-ionica-001", "ligação metálica", "wikipedia-pt-ligacao-metalica-001"),
    ("ligação covalente", "wikipedia-pt-ligacao-covalente-001", "ligação metálica", "wikipedia-pt-ligacao-metalica-001"),
    ("átomo", "wikipedia-pt-atomo-001", "molécula", "wikipedia-pt-molecula-001"),
    ("elemento químico", "wikipedia-pt-elemento-quimica-001", "composto químico", "wikipedia-pt-composto-quimico-001"),
    ("partícula alfa", "wikipedia-pt-particula-alfa-001", "radiação beta", "wikipedia-pt-particula-beta-001"),
    ("solução", "wikipedia-pt-solucao-001", "coloide", "wikipedia-pt-coloide-001"),
]


# ---------------------------------------------------------------------------------------------------------
# o explicador só aceita trechos com id de até 80 caracteres e lê no máximo 1200 caracteres de cada um
# (backend/modal/ask_core.py: TRECHO_ID_RX e MAX_TRECHO_TEXTO); par cujo trecho ele não consegue receber não serve para treino
ID_TRECHO_OK = re.compile(r"^[A-Za-z0-9._:-]{1,80}$")
MAX_TRECHO_TEXTO = 1200


def _textos(pac):
    out = [t for t in pac.textos.values() if t.get("_pasta") in PASTAS and (t.get("idioma") in (None, "pt"))
           and "sa" in fold(t.get("licenca") or "") and (t.get("textoPt") or t.get("textoOriginal")) and ID_TRECHO_OK.match(t["id"])]
    return sorted(out, key=lambda t: t["id"])


def _cabe_no_trecho(resposta, t):
    """O recorte está nos primeiros MAX_TRECHO_TEXTO caracteres do trecho (o que o explicador recebe)."""
    texto = re.sub(r"\s+", " ", t.get("textoPt") or t.get("textoOriginal") or "")
    i = texto.find(re.sub(r"\s+", " ", resposta))
    return i >= 0 and i + len(resposta) <= MAX_TRECHO_TEXTO


def _artigos(textos):
    """Agrupa os trechos por artigo (URL do artigo), na ordem dos ids."""
    grupos = {}
    for t in textos:
        chave = t.get("urlArtigo") or f"{t.get('capitulo')}|{t.get('titulo')}"
        grupos.setdefault(chave, []).append(t)
    return grupos


def _add(sub, rid, pergunta, resposta, t, nivel, gerado):
    if not _cabe_no_trecho(resposta, t):
        sub.stats["conceitos_texto_fora_dos_1200_caracteres"] += 1
        return False
    if _ask_core is not None and _ask_core.numeros_sem_fonte(resposta, _ask_core.texto_das_fontes(pergunta, "", [{"id": t["id"], "texto": t.get("textoPt") or ""}])):
        sub.stats["conceitos_texto_numero_que_o_explicador_nao_ancora"] += 1  # o montador do explicador descartaria o par
        return False
    r = Resp()
    for tok in numeros_do_texto(resposta):
        r.passagem(tok, t["id"])
    extra = {"tema": t["tema"]} if t.get("tema") else {}
    # todos os pares de um mesmo trecho caem do mesmo lado (treino/holdout) do explicador: sem vazamento entre "O que é X?" e "Explique X"
    return sub.add(id_alinhado(rid, t["id"]), pergunta, resposta, r, "conceito", nivel, {}, [fonte_trecho(t, ALTERACAO)], gerado, FAM, extra)


def _nivel(t, temas):
    tema = temas.get(t.get("tema") or "")
    nv = (tema or {}).get("nivel")
    return nv if nv in ("fundamental", "medio", "superior") else "medio"


TITULOS_GENERICOS = {"introducao", "exemplo", "exemplos", "aplicacoes", "aplicacao", "caracteristicas", "propriedades", "principais", "outros", "outras",
                     "curiosidades", "resumo", "exercicios", "conclusao", "historico", "historia", "classificacao", "tipos", "estrutura", "usos",
                     "obtencao", "producao", "ocorrencia", "observacoes", "referencias", "nomenclatura", "definicao", "conceito", "conceitos"}


def _permitidos(pac, primeiro, tipo_texto):
    """Números aceitos em frases de artigos de ELEMENTOS: só os que coincidem com o pacote para o elemento do artigo (número atômico
    e ano de descoberta). Qualquer outro número (massa arredondada, ponto de fusão...) tira a frase do recorte."""
    if tipo_texto != "elemento":
        return frozenset()
    simbs = (primeiro.get("entidades") or {}).get("elementos") or []
    e = pac.el_simbolo.get(simbs[0]) if simbs else None
    if e is None:
        tit = fold(titulo_limpo(primeiro))
        e = next((x for x in pac.elementos if fold(x["nome"]) == tit), None)
    if not e:
        return frozenset()
    ok = {str(e["z"])}
    ano = (e.get("descoberta") or {}).get("ano")
    if isinstance(ano, int):
        ok.add(str(ano))
    return frozenset(ok)


def _frases_do_trecho(t, sem_num, permitidos):
    frases = dividir_frases(t.get("textoPt") or t.get("textoOriginal") or "")
    return frases, [frase_ok(f, sem_num, permitidos) for f in frases]


def _cita_assunto(frase: str, rad_tit, n=80) -> bool:
    return bool(_radicais(frase[:n]) & rad_tit)


def _sujeito_e_assunto(antes_do_verbo: str, rad_tit) -> bool:
    """O sujeito da frase (o que vem antes do verbo) COMEÇA pelo assunto do artigo: "O titânio é muito utilizado..." sim;
    "Polímeros aniônicos são usados..." (no artigo Ânion) não."""
    t = _ARTIGO.sub("", _CONTEXTO_INICIAL.sub("", antes_do_verbo).strip())
    palavras = re.findall(r"[A-Za-zÀ-ÿ]{4,}", t)[:2]
    return bool({fold(w)[:5] for w in palavras} & rad_tit)


def _encontrado(s, cop):
    if cop == "são":
        return "são encontrados"
    m = re.match(r"^(o|a|um|uma)\s", s)
    g = ("a" if m.group(1) in ("a", "uma") else "o") if m else genero(s)
    return "é encontrada" if g == "a" else "é encontrado"


def _usado(s, cop):
    if cop == "são":
        return "são usados"
    m = re.match(r"^(o|a|um|uma)\s", s)
    g = ("a" if m.group(1) in ("a", "uma") else "o") if m else genero(s)
    return "é usada" if g == "a" else "é usado"


def gerar(ctx: Ctx):
    import fam_textos  # temas de topicos.json (níveis)
    sub = SubCtx(ctx, FAM)
    pac = sub.pac
    temas = fam_textos.carregar_temas()
    for _, trechos in sorted(_artigos(_textos(pac)).items(), key=lambda kv: kv[1][0]["id"]):
        primeiro = trechos[0]
        tipo_texto = primeiro.get("tipo") or "conceito"
        sem_num = tipo_texto in ("composto", "elemento")
        tit = titulo_limpo(primeiro)
        if fold(tit) in FORA_DO_SENTIDO_QUIMICO:
            sub.stats["conceitos_texto_fora_do_sentido_quimico"] += 1
            continue
        frases0 = dividir_frases(primeiro.get("textoPt") or primeiro.get("textoOriginal") or "")
        if artigo_sensivel(primeiro, frases0[0] if frases0 else ""):
            sub.stats["conceitos_texto_artigo_sensivel_ignorado"] += 1
            continue
        permitidos = _permitidos(pac, primeiro, tipo_texto)
        partes = [(t, *_frases_do_trecho(t, sem_num, permitidos)) for t in trechos]
        rad_tit = _radicais(tit)
        wiki = primeiro.get("_pasta") == "wikipedia-pt"
        if wiki and _pessoa(sub, partes[0], tit, temas):
            continue
        sujeito = _definicoes(sub, partes, wiki, tipo_texto, rad_tit, temas)
        if not wiki:
            continue
        if sujeito is None and len(tit.split()) <= 4:
            sujeito = _sujeito_pergunta(tit, "é", tipo_texto)
        if sujeito is None:
            continue
        _usos(sub, partes, sujeito, rad_tit, temas)
        if tipo_texto in ("composto", "elemento"):
            _caracteristicas(sub, partes, sujeito, rad_tit, temas)
            _ocorrencia(sub, partes, sujeito, rad_tit, temas)
            _origem_nome(sub, partes[0], sujeito, rad_tit, temas)
        _mais(sub, partes, sujeito, rad_tit, temas)
    _diferencas(sub, temas)


def _ocorrencia(sub, partes, sujeito, rad_tit, temas):
    """'Onde X é encontrado?' (elementos e compostos): frase sobre onde X ocorre, com X como sujeito ou oculto logo depois de uma
    frase sobre X."""
    s, _ = sujeito
    rng = sub.rng
    for t, frases, oks in partes:
        for i, f in enumerate(frases):
            m = _OCORRE.search(f)
            if not (oks[i] and m) or _GUERRA.search(f):
                continue
            if re.search(r"estado (?:s[oó]lido|l[ií]quido|gasoso)", f, re.I):
                continue
            if re.match(r"^(?:É|São|Foi|Ocorre|Ocorrem|Encontra-se|Não é)\b", f):
                if not (i > 0 and oks[i - 1] and _cita_assunto(frases[i - 1], rad_tit)):
                    continue
            elif _INICIO_ANAFORICO.search(f) or not _sujeito_e_assunto(f[:max(m.start(), 1)], rad_tit):
                continue
            txt, _ = recorte(frases, i, oks, LIMITE_USO, 1)
            vals = dict(_vals(s), encontrado=_encontrado(s, sujeito[1]))
            if _add(sub, f"ct-ocorre-{t['id']}-{i + 1}", renderizar(rng.choice(MODELOS_OCORRE), vals, rng), txt, t, _nivel(t, temas),
                    "texto:conceito.onde_ocorre"):
                sub.stats["conceitos_texto_ocorrencia"] += 1
            return


def _origem_nome(sub, parte, sujeito, rad_tit, temas):
    """'Qual a origem do nome de X?': a frase de abertura que traz a etimologia ("O cloro (do grego khlorós, esverdeado) é...")."""
    s, _ = sujeito
    t, frases, oks = parte
    for i, f in enumerate(frases[:3]):
        if oks[i] and _ETIMOLOGIA.search(f) and _cita_assunto(f, rad_tit, 60) and not _INICIO_ANAFORICO.search(f):
            if _add(sub, f"ct-nome-{t['id']}-{i + 1}", renderizar(sub.rng.choice(MODELOS_NOME), _vals(s), sub.rng), f, t, _nivel(t, temas),
                    "texto:conceito.origem_do_nome"):
                sub.stats["conceitos_texto_origem_nome"] += 1
            return


def _definicoes(sub, partes, wiki, tipo_texto, rad_tit, temas):
    """'O que é X?' (+ 'Explique X'): na Wikipédia, só a definição do assunto do artigo (a primeira); no Wikilivros, cada termo
    definido no trecho (e o título da seção quando a frase começa com o sujeito oculto: "É a reação entre um ácido e uma base...")."""
    rng = sub.rng
    sujeito_artigo, vistos = None, set()
    for t, frases, oks in partes:
        nivel = _nivel(t, temas)
        for i, f in enumerate(frases):
            if not oks[i] or (wiki and sujeito_artigo is not None):
                continue
            d = None
            if not _INICIO_ANAFORICO.search(f):
                d = definicao(f)
                if d and wiki and not (_radicais(d[0]) & rad_tit):
                    d = None  # na Wikipédia, só a definição do ASSUNTO do artigo
                if d:
                    d = _sujeito_pergunta(d[0], d[1], tipo_texto)
            if d is None and not wiki and i == 0 and re.match(r"^(?:É|São)\s+(?:o|a|os|as|um|uma|toda|todo|qualquer|chamad\w*)\b", f):
                tit_secao = titulo_limpo(t)
                if 1 <= len(tit_secao.split()) <= 5 and fold(tit_secao.split()[0]) not in TITULOS_GENERICOS and not re.search(r"\d", tit_secao):
                    d = (tit_secao[:1].lower() + tit_secao[1:] if not tit_secao[:2].isupper() else tit_secao, "são" if f.startswith("São") else "é")
            if not d:
                continue
            s, cop = d
            chave = fold(re.sub(r"^(?:o|a|os|as|um|uma)\s+", "", s))
            if chave in vistos:
                continue
            vistos.add(chave)
            sujeito_artigo = sujeito_artigo or (s, cop)
            plural = cop == "são"
            curto, n1 = recorte(frases, i, oks, LIMITE_DEF, 2)
            base = f"{t['id']}-{i + 1}"
            # duas formas de perguntar a mesma definição ("O que é X?" / "Defina X."), como as famílias de elementos (2 variantes por modelo)
            for k, modelo in enumerate(rng.sample(MODELOS_DEF_PLUR if plural else MODELOS_DEF_SING, 2)):
                if _add(sub, f"ct-def{'' if k == 0 else k + 1}-{base}", renderizar(modelo, _vals(s), rng), curto, t, nivel, "texto:conceito.o_que_e"):
                    sub.stats["conceitos_texto_definicao"] += 1
            longo, n2 = recorte(frases, i, oks, LIMITE_EXPL, 4)
            if n2 >= 2 and n2 > n1:
                if _add(sub, f"ct-expl-{base}", renderizar(rng.choice(MODELOS_EXPL_PLUR if plural else MODELOS_EXPL_SING), _vals(s), rng), longo, t,
                        nivel, "texto:conceito.explique"):
                    sub.stats["conceitos_texto_explique"] += 1
    return sujeito_artigo


def _pessoa(sub, parte, tit, temas):
    """Biografias (cientistas): 'Quem foi X?' a partir da 1ª frase ("X (datas) foi um químico...")."""
    t, frases, oks = parte
    palavras = tit.split()
    if not frases or not oks[0] or len(palavras) < 2 or not all(w[:1].isupper() for w in palavras) or not _PESSOA.search(frases[0]):
        return False
    rng = sub.rng
    curto, n1 = recorte(frases, 0, oks, LIMITE_DEF, 2)
    _add(sub, f"ct-pessoa-{t['id']}", renderizar(rng.choice(MODELOS_PESSOA), _vals(tit), rng), curto, t, _nivel(t, temas), "texto:conceito.quem_foi")
    longo, n2 = recorte(frases, 0, oks, LIMITE_EXPL, 4)
    if n2 > n1:
        _add(sub, f"ct-pessoa-expl-{t['id']}", renderizar(rng.choice(MODELOS_PESSOA_EXPL), _vals(tit), rng), longo, t, _nivel(t, temas),
             "texto:conceito.quem_foi")
    sub.stats["conceitos_texto_pessoa"] += 1
    return True


def _usos(sub, partes, sujeito, rad_tit, temas):
    """'Para que serve X?' a partir de frases cujo sujeito é X ("O X é usado na...") ou com sujeito oculto logo depois de uma frase sobre X
    ("É usado como conservante..."). Nunca usos ligados a armas, guerra, drogas ou venenos, nem usos de um NOME/TERMO."""
    s, cop = sujeito
    rng, feitos = sub.rng, 0
    for t, frases, oks in partes:
        for i, f in enumerate(frases):
            if feitos >= 2:
                return
            if not oks[i] or _GUERRA.search(f) or _USO_PARA_META.search(f):
                continue
            m = _USO_VERBO.search(f)
            if _USO_ELIDIDO.match(f):
                if not (i > 0 and oks[i - 1] and _cita_assunto(frases[i - 1], rad_tit) and not _GUERRA.search(frases[i - 1])):
                    continue
            elif not (m and not _INICIO_ANAFORICO.search(f) and _sujeito_e_assunto(f[:m.start()], rad_tit) and not _USO_META.search(f[:m.start()])):
                continue
            txt, n = recorte(frases, i, oks, LIMITE_USO, 2)
            if n == 2 and not ((_USO_VERBO.search(frases[i + 1]) or _USO_ELIDIDO.match(frases[i + 1])) and not _GUERRA.search(frases[i + 1])
                               and not _USO_PARA_META.search(frases[i + 1])):
                txt, n = recorte(frases, i, oks, LIMITE_USO, 1)
            vals = {"s": s, "S": cap(s), "s_de": _de(s), "usado": _usado(s, cop)}
            if _add(sub, f"ct-uso-{t['id']}-{i + 1}", renderizar(rng.choice(MODELOS_USO), vals, rng), txt, t, _nivel(t, temas), "texto:conceito.para_que_serve"):
                feitos += 1
                sub.stats["conceitos_texto_uso"] += 1


def _caracteristicas(sub, partes, sujeito, rad_tit, temas):
    """'Quais são as características de X?' a partir da introdução do artigo: frase com ao menos dois traços (cor, odor, estado físico,
    solubilidade, inflamabilidade...) cujo sujeito é X ou está oculto logo depois de uma frase sobre X."""
    s, _ = sujeito
    t, frases, oks = partes[0]
    rng = sub.rng
    for i, f in enumerate(frases):
        if not oks[i] or _GUERRA.search(f) or len({m.group(0).lower()[:6] for m in _CARACT.finditer(f)}) < 2:
            continue
        if _CARACT_INICIO.match(f):
            if not (i > 0 and oks[i - 1] and _cita_assunto(frases[i - 1], rad_tit)):
                continue
        elif not (_cita_assunto(f, rad_tit, 50) and not _INICIO_ANAFORICO.search(f)):
            continue
        txt, n = recorte(frases, i, oks, LIMITE_USO, 2)
        if n == 2 and (len(_CARACT.findall(frases[i + 1])) < 1 or _GUERRA.search(frases[i + 1]) or definicao(frases[i + 1])):
            txt, n = recorte(frases, i, oks, LIMITE_USO, 1)
        if _add(sub, f"ct-caract-{t['id']}-{i + 1}", renderizar(rng.choice(MODELOS_CARACT), {"s": s, "S": cap(s), "s_de": _de(s)}, rng), txt, t,
                _nivel(t, temas), "texto:conceito.caracteristicas"):
            sub.stats["conceitos_texto_caracteristicas"] += 1
        return


def _mais(sub, partes, sujeito, rad_tit, temas):
    """'Me conte mais sobre X': continuação do artigo (2º trecho em diante), a partir da 1ª frase que retoma X pelo nome."""
    s, _ = sujeito
    rng, feitos = sub.rng, 0
    for t, frases, oks in partes[1:]:
        if feitos >= 3:
            return
        for i, f in enumerate(frases):
            if not oks[i] or _INICIO_ANAFORICO.search(f) or not _cita_assunto(f, rad_tit):
                continue
            txt, n = recorte(frases, i, oks, LIMITE_EXPL, 3)
            if n < 2 or any(_GUERRA.search(x) for x in frases[i:i + n]):
                continue
            if _add(sub, f"ct-mais-{t['id']}-{i + 1}", renderizar(rng.choice(MODELOS_MAIS), _vals(s), rng), txt, t, _nivel(t, temas),
                    "texto:conceito.mais_sobre"):
                feitos += 1
                sub.stats["conceitos_texto_mais_sobre"] += 1
            break


def _diferencas(sub, temas):
    pac, rng = sub.pac, sub.rng
    for a, b, tid, inicio, n in DIFERENCAS:
        t = pac.textos.get(tid)
        if not t:
            sub.stats["conceitos_texto_diferenca_sem_trecho"] += 1
            continue
        frases = dividir_frases(t.get("textoPt") or t.get("textoOriginal") or "")
        idx = next((i for i, f in enumerate(frases) if f.startswith(inicio)), None)
        if idx is None:
            sub.stats["conceitos_texto_diferenca_frase_nao_encontrada"] += 1
            continue
        oks = [frase_ok(f, False) for f in frases]
        txt, k = recorte(frases, idx, oks, LIMITE_EXPL, n)
        if k != n:
            sub.stats["conceitos_texto_diferenca_frase_invalida"] += 1
            continue
        pergunta = renderizar(rng.choice(MODELOS_DIF), {"a": a, "A": cap(a), "b": b}, rng)
        if _add(sub, f"ct-dif-{tid}-{idx + 1}", pergunta, txt, t, _nivel(t, temas), "texto:conceito.diferenca"):
            sub.stats["conceitos_texto_diferenca"] += 1
    _diferencas_entre_artigos(sub, temas)


def definicao_do_artigo(t):
    """Primeira frase definitória do ASSUNTO do trecho (a mesma regra de 'O que é X?'), ou None."""
    tipo_texto = t.get("tipo") or "conceito"
    rad = _radicais(titulo_limpo(t))
    for f in dividir_frases(t.get("textoPt") or ""):
        if frase_ok(f, tipo_texto in ("composto", "elemento")) and not _INICIO_ANAFORICO.search(f):
            d = definicao(f)
            if d and (_radicais(d[0]) & rad):
                return f
    return None


def _diferencas_entre_artigos(sub, temas):
    """'Qual a diferença entre A e B?' com a definição de A (do artigo de A) seguida da de B (do artigo de B), ambas literais."""
    pac, rng = sub.pac, sub.rng
    for a, ida, b, idb in DIFERENCAS_ENTRE_ARTIGOS:
        ta, tb = pac.textos.get(ida), pac.textos.get(idb)
        if not ta or not tb or not ID_TRECHO_OK.match(ida) or not ID_TRECHO_OK.match(idb):
            sub.stats["conceitos_texto_diferenca_sem_trecho"] += 1
            continue
        if any(artigo_sensivel(t, (dividir_frases(t.get("textoPt") or "") or [""])[0]) for t in (ta, tb)):
            continue
        fa, fb = definicao_do_artigo(ta), definicao_do_artigo(tb)
        if not fa or not fb or len(fa) + len(fb) + 1 > LIMITE_EXPL or not _cabe_no_trecho(fa, ta) or not _cabe_no_trecho(fb, tb):
            sub.stats["conceitos_texto_diferenca_sem_definicao"] += 1
            continue
        resposta = f"{fa} {fb}"
        pergunta = renderizar(rng.choice(MODELOS_DIF), {"a": a, "A": cap(a), "b": b}, rng)
        r = Resp()
        for tok in numeros_do_texto(fa):
            r.passagem(tok, ida)
        for tok in numeros_do_texto(fb):
            r.passagem(tok, idb)
        extra = {"tema": ta["tema"]} if ta.get("tema") else {}
        fontes = [fonte_trecho(ta, ALTERACAO), fonte_trecho(tb, ALTERACAO)]
        if sub.add(id_alinhado(f"ct-dif2-{ida}-{idb}", ida), pergunta, resposta, r, "conceito", _nivel(ta, temas), {}, fontes,
                   "texto:conceito.diferenca_entre_artigos", FAM, extra):
            sub.stats["conceitos_texto_diferenca_entre_artigos"] += 1
