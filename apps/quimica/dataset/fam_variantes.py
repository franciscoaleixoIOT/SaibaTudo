# -*- coding: utf-8 -*-
"""Família VARIANTES DE LINGUAGEM: a mesma pergunta escrita como estudantes escrevem, com a MESMA resposta (e os mesmos números, fontes e
entidades) do par original.

  - informal: minúsculas, sem acentos e abreviações/erros comuns de digitação ("oq", "vc", "pq", "pra", "eh", "masa", "dencidade"...),
    nunca dentro de nomes de compostos/elementos, fórmulas ou números;
  - subscrito: fórmula com índices Unicode (H2SO4 -> H₂SO₄), como sai de teclados de celular e de textos copiados;
  - nome popular: o nome do composto trocado por um nome popular CONFERIDO no pacote (nomes_populares.py); a resposta ganha, no começo,
    a frase que liga o nome popular ao composto (e, para produtos como vinagre e água sanitária, o aviso de que os dados são do composto).

Por que só estas: o dataset trata como a MESMA pergunta duas frases que diferem só em acento, maiúscula ou pontuação (`norm_question`),
e as perguntas originais já saem com essa variação (comum.finalizar). Variante útil é a que muda palavras.

Fração: 5 % dos pares elegíveis (fato, cálculo, nomenclatura, desenho, segurança e conceito; recusas e escopo ficam fora), escolhidos por
hash estável do id (sem depender do sorteio das outras famílias), mais até 4 pares por nome popular. Justificativa: cada tipo de variante
aparece centenas de vezes, espalhado por todas as famílias (a escolha é estratificada pelo hash, não por família), sem que respostas
repetidas passem de ~6 % do dataset nem mudem o equilíbrio entre famílias. O NLU, que é quem interpreta a pergunta, recebe a fatia maior
(gerar_nlu.py, 10 %). Cada variante cai do MESMO lado (treino/holdout do explicador) que o par original (`id_alinhado`) e nenhuma é gerada a
partir de pergunta parecida com as dos contratos de teste (Jaccard >= 0,5).
"""
import json
import re

from comum import (REPO, Resp, RespostaInconsistente, cap, fold, fold_alinhado, formula_subscrita, formula_sem_subscrito, jaccard,
                   numeros_do_texto, sem_acentos, stable_bucket, tokens)
from nomes_populares import AVISO_PRODUTO, MODELOS_PRODUTO, MODELOS_SINONIMO, NOMES_POPULARES, evidencia_ok
from qa_base import Ctx, SubCtx, fonte_trecho, id_alinhado

FAM = "variantes"
FRACAO_POR_MIL = 50
TIPOS_ELEGIVEIS = {"fato", "calculo", "nomenclatura", "desenho", "seguranca", "conceito"}
FAMILIAS_FORA = {"recusas", "escopo", FAM}
POR_NOME_POPULAR = 4
CONTRATOS = ("nlu_golden_cases.json", "seguranca_cases.json", "nlu_real_cases.json")

# abreviações e erros comuns, aplicados ao texto já sem acentos e em minúsculas, só fora de entidades ("o que" antes de "que").
# "é" -> "eh" é feito ANTES de tirar os acentos (depois, "é" e a conjunção "e" ficam iguais).
INFORMAL = [
    (r"\bo que\b", "oq"), (r"\bpor que\b", "pq"), (r"\bporque\b", "pq"), (r"\bvoce\b", "vc"), (r"\bque\b", "q"), (r"\bpara\b", "pra"),
    (r"\btambem\b", "tbm"), (r"\bquantos\b", "qnts"), (r"\bquantas\b", "qnts"), (r"\bquanto\b", "qnto"), (r"\bnao\b", "n"),
    (r"\bmassa\b", "masa"), (r"\bdensidade\b", "dencidade"), (r"\bperigoso\b", "perigozo"), (r"\bperigosa\b", "perigoza"),
    (r"\bexplique\b", "explica"), (r"\bcalcule\b", "calcula"), (r"\bbalanceie\b", "balanceia"), (r"\bdesenhe\b", "desenha"),
    (r"\bme diga\b", "me fala"),
]
# palavras comuns em que um erro de digitação (duas letras trocadas) é realista e não muda o sentido; nunca entidades nem unidades
PALAVRAS_TYPO = {"qual", "quais", "massa", "molar", "formula", "numero", "atomica", "atomico", "estrutura", "densidade", "ponto", "fusao",
                 "ebulicao", "eletrons", "configuracao", "eletronica", "perigos", "seguranca", "rotulo", "frase", "pictograma", "palavra",
                 "significa", "explique", "explica", "desenhe", "calcule", "quantos", "quantas", "elemento", "composto", "mostre", "pergunta",
                 "eletronegatividade", "energia", "ionizacao", "raio", "grupo", "periodo", "simbolo", "molecula", "molecular", "solucao", "reacao"}




def _normaliza_contrato(s):
    return tokens(formula_sem_subscrito(s))


def casos_de_contrato():
    out = []
    for nome in CONTRATOS:
        p = REPO / "contracts" / nome
        if p.exists():
            out += [_normaliza_contrato(c.get("q") or "") for c in json.loads(p.read_text(encoding="utf-8")).get("cases", [])]
    return [t for t in out if t]


def perto_de_contrato(q, casos, limiar=0.5):
    t = _normaliza_contrato(q)
    return any(jaccard(t, c) >= limiar for c in casos)


def parece_formula(s) -> bool:
    """'H2SO4', 'NaCl', 'HI', 'Ca(OH)2', 'CuSO4·5H2O', '(CH3)3N' sim; 'Teofilina', 'Fe' (símbolo sozinho), 'ácido' não."""
    return bool(s) and bool(re.fullmatch(r"(?:[A-Z][a-z]?\d*|[()\[\]·.]\d*)+", s)) and (len(re.findall(r"[A-Z]", s)) >= 2 or bool(re.search(r"\d", s)))


def termos_do_registro(reg, pac):
    """(protegidos, formulas): textos que não podem sofrer erro de digitação e TODAS as fórmulas (que mantêm a caixa; as que têm índice
    numérico podem virar subscritas)."""
    prot, formulas = set(), set()
    ents = reg.get("entidades") or {}
    for cid in ents.get("compostos", []) or []:
        c = pac.comp_cid.get(cid)
        if not c:
            continue
        for k in ("nome", "nomePopular", "formula", "formulaHill", "nomeIupac"):
            if c.get(k):
                prot.add(c[k])
        prot.update(s for s in (c.get("sinonimos") or []) if isinstance(s, str))
        for k in ("formula", "formulaHill"):
            if c.get(k):
                formulas.add(c[k])
    for s in ents.get("elementos", []) or []:
        e = pac.el_simbolo.get(s)
        if e:
            prot.update([e["nome"], e["simbolo"], e.get("nomeEn") or ""])
    for k in ("formula", "nome"):
        if ents.get(k):
            prot.add(ents[k])
            if k == "formula":
                formulas.add(ents[k])
    entrada = (reg.get("calculo") or {}).get("entrada") or {}
    for k, v in entrada.items():
        for x in (v if isinstance(v, list) else [v]):
            if isinstance(x, str) and parece_formula(x):
                prot.add(x)
                formulas.add(x)
    return {p for p in prot if p}, {f for f in formulas if parece_formula(f)}


def _spans(q, termos):
    fq = fold_alinhado(q)
    spans = []
    for t in sorted(termos, key=len, reverse=True):
        ft = fold_alinhado(t)
        for m in re.finditer(r"(?<![\w])" + re.escape(ft) + r"(?![\w])", fq):
            if not any(a < m.end() and m.start() < b for a, b in spans):
                spans.append((m.start(), m.end()))
    return sorted(spans)


def _fora_dos_spans(q, spans, fn):
    """Aplica `fn` só aos pedaços de `q` fora dos spans protegidos."""
    out, pos = [], 0
    for a, b in spans:
        out.append(fn(q[pos:a]))
        out.append(q[a:b])
        pos = b
    out.append(fn(q[pos:]))
    return "".join(out)


def informal(q, protegidos, formulas, rng):
    """Minúsculas e sem acentos fora das fórmulas e símbolos, + abreviações comuns fora das entidades. None se nenhuma palavra mudar."""
    trocas = [0]

    def eh(s):
        s, n = re.subn(r"(?<![\w])é(?![\w])", "eh", s)
        trocas[0] += n
        return s

    def abrevia(s):
        for rx, novo in INFORMAL:
            if rng.random() < 0.85:
                s, n = re.subn(rx, novo, s)
                trocas[0] += n
        return s

    texto = _fora_dos_spans(q, _spans(q, protegidos), eh) if rng.random() < 0.7 else q
    caixa = set(formulas) | {p for p in protegidos if re.fullmatch(r"[A-Z][a-z]?", p)}  # fórmulas e símbolos mantêm a caixa
    texto = _fora_dos_spans(texto, _spans(texto, caixa), lambda s: sem_acentos(s).lower())
    texto = _fora_dos_spans(texto, _spans(texto, protegidos), abrevia)
    if not trocas[0] or rng.random() < 0.25:  # sem abreviação possível (ou às vezes junto): uma troca de letras numa palavra comum
        spans = _spans(texto, protegidos)
        livres = [m for m in re.finditer(r"[a-z]{5,}", texto) if m.group(0) in PALAVRAS_TYPO
                  and not any(a < m.end() and m.start() < b for a, b in spans)]
        if livres:
            m = rng.choice(livres)
            w = m.group(0)
            i = rng.randrange(1, len(w) - 2)
            texto = texto[:m.start()] + w[:i] + w[i + 1] + w[i] + w[i + 2:] + texto[m.end():]
            trocas[0] += 1
    if not trocas[0]:
        return None
    if rng.random() < 0.5:
        texto = re.sub(r"[?!.]+$", "", texto).rstrip()
    return re.sub(r"\s+", " ", texto).strip()


def subscrito(q, formulas):
    novo = q
    for f in sorted((f for f in formulas if re.search(r"[A-Za-z)\]]\d", f)), key=len, reverse=True):
        novo = re.sub(r"(?<![\w])" + re.escape(f) + r"(?![\w])", formula_subscrita(f), novo)
    return novo if novo != q else None


TRANSFORMACOES = ("informal", "subscrito")


def gerar(ctx: Ctx):
    sub = SubCtx(ctx, FAM)
    pac, rng = sub.pac, sub.rng
    casos = casos_de_contrato()
    originais = [r for r in ctx.registros if r["_familia"] not in FAMILIAS_FORA and r["tipo"] in TIPOS_ELEGIVEIS]
    # 1) fração estável dos pares
    for reg in originais:
        if stable_bucket(reg["id"], ctx.seed, 1000) >= FRACAO_POR_MIL or perto_de_contrato(reg["pergunta"], casos):
            continue
        prot, formulas = termos_do_registro(reg, pac)
        ordem = list(TRANSFORMACOES) if stable_bucket(reg["id"] + "|tipo", ctx.seed, 2) == 0 else list(reversed(TRANSFORMACOES))
        for tipo in ordem:
            q = informal(reg["pergunta"], prot, formulas, rng) if tipo == "informal" else subscrito(reg["pergunta"], formulas)
            if q and _copiar(sub, reg, q, tipo):
                break
    # 2) nomes populares (conferidos no pacote)
    for alias, cid, g, tipo_alias, evidencia, explicacao in NOMES_POPULARES:
        c = pac.comp_cid.get(cid)
        if not c or not evidencia_ok(pac, evidencia, alias):
            sub.stats["variantes_nome_popular_sem_evidencia"] += 1
            continue
        modelos = MODELOS_SINONIMO if tipo_alias == "sinonimo" else MODELOS_PRODUTO
        fontes_extra = []
        if evidencia.startswith("textos#"):
            fontes_extra.append(fonte_trecho(pac.textos[evidencia[len("textos#"):].partition("|")[0]], "paráfrase de uma frase do trecho"))
        cands = [r for r in originais if r["geradoPor"] in modelos and (r.get("entidades") or {}).get("compostos") == [cid]
                 and not perto_de_contrato(r["pergunta"], casos)]
        rng.shuffle(cands)
        feitos = 0
        for reg in cands:
            if feitos >= POR_NOME_POPULAR:
                break
            q = trocar_por_nome_popular(pac, c, reg["pergunta"], alias, g)
            if not q:
                continue
            prefixo = cap(explicacao.format(do_nome=_nome_resposta(pac, c, "de"), o_nome=_nome_resposta(pac, c, ""), formula=pac.formula_exibicao(c)))
            if tipo_alias == "produto":
                prefixo += " " + AVISO_PRODUTO
            if _copiar(sub, reg, q, "nome_popular", prefixo=prefixo, fontes_extra=fontes_extra, alias=alias):
                feitos += 1


def _nome_resposta(pac, c, prep):
    from comum import com_artigo
    return com_artigo(pac.nome_composto(c), prep, pendente=pac.comp_pendente(c))


_ADJ_GENERO = re.compile(r"\b(?:perigos|t[oó]xic|corrosiv|chamad|conhecid|usad|utilizad|encontrad|considerad|classificad|inflam[aá]vel)[oa]?s?\b", re.I)
_ART = {"o": {"": "o", "de": "do", "em": "no", "a": "ao", "por": "pelo"}, "a": {"": "a", "de": "da", "em": "na", "a": "à", "por": "pela"}}
_PREP = {"do": "de", "da": "de", "dos": "de", "das": "de", "de": "de", "o": "", "a": "", "os": "", "as": "", "no": "em", "na": "em", "em": "em",
         "ao": "a", "pelo": "por", "pela": "por"}


def trocar_por_nome_popular(pac, c, pergunta, alias, g):
    """Troca a menção ao composto (nome, fórmula, nome popular ou sinônimo, com o artigo/preposição antes) pelo nome popular, com a
    concordância certa. None se não achar a menção ou se a frase tiver adjetivo que concordaria com o nome antigo."""
    from comum import genero
    nome = pac.nome_composto(c)
    if genero(nome) != g and _ADJ_GENERO.search(pergunta):
        return None
    superficies = [s for s in [nome, c.get("nomePopular"), pac.formula_exibicao(c), c.get("formulaHill")] + list(c.get("sinonimos") or []) if s]
    if fold(alias) in fold(pergunta):
        return None
    fq = fold_alinhado(pergunta)
    for s in sorted(set(superficies), key=len, reverse=True):
        m = re.search(r"(?<![\w])" + re.escape(fold_alinhado(s)) + r"(?![\w])", fq)
        if not m:
            continue
        ini, fim = m.start(), m.end()
        antes = pergunta[:ini]
        mp = re.search(r"(?:^|(?<=\s))(\w+)\s+$", antes)
        prep = None
        if mp and fold(mp.group(1)) in _PREP:
            prep = _PREP[fold(mp.group(1))]
            ini = mp.start(1)
        if prep is None:
            # sem artigo antes: "NaOH é perigoso?" -> "A soda cáustica é ...", "massa molar de NaOH" já tem "de"
            prep = ""
        novo = _ART[g][prep] + " " + alias
        if ini == 0 or re.match(r"^[\s:,;]*$", pergunta[:ini]):
            novo = cap(novo)
        return (pergunta[:ini] + novo + pergunta[fim:]).replace("  ", " ")
    return None


class _RespCopia(Resp):
    """A resposta da variante é a do original (já conferida pela fidelidade numérica), com no máximo um prefixo SEM números: os números
    e as origens são os do original."""

    def __init__(self, reg, prefixo):
        super().__init__()
        self._fechado = {"numeros": list(reg["numeros"]), "numerosOrigem": {k: list(v) for k, v in reg["numerosOrigem"].items()}}
        self._prefixo = prefixo or ""

    def fechar(self, texto):
        if numeros_do_texto(self._prefixo):
            raise RespostaInconsistente(f"prefixo com número: {self._prefixo!r}")
        return self._fechado


def _copiar(sub, reg, pergunta, tipo, prefixo=None, fontes_extra=(), alias=None):
    """Novo registro com a pergunta variante e a resposta/números/fontes do original (com o prefixo, se houver, sem números)."""
    r = _RespCopia(reg, prefixo)
    resposta = reg["resposta"] if not prefixo else f"{prefixo} {reg['resposta']}"
    extra = {k: reg[k] for k in ("calculo", "acao", "smiles", "tema", "contexto", "comparacao") if k in reg}
    extra["origem"] = reg["id"]
    if alias:
        extra["nomePopular"] = alias
    fontes = list(reg["fontes"]) + [f for f in fontes_extra if f not in reg["fontes"]]
    rid = id_alinhado(f"{reg['id']}-v", reg["id"])
    while rid in sub.ctx._ids:
        rid = id_alinhado(rid + "v", reg["id"])
    ok = sub.add(rid, pergunta, resposta, r, reg["tipo"], reg["nivel"], reg["entidades"], fontes, f"variante:{tipo}", FAM, extra)
    if ok:
        sub.stats[f"variantes_{tipo}"] += 1
    return ok
