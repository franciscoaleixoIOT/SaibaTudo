# -*- coding: utf-8 -*-
"""
Núcleo PURO do NLU em nuvem do SaibaTudo Química (sem Modal, sem llama.cpp, só biblioteca padrão).

Concentra o que precisa ser idêntico entre treino, serviço e avaliação:
  - o prompt (ChatML do Qwen2.5) e a instrução de sistema;
  - a gramática GBNF que garante JSON válido, curto e SÓ com as chaves do contrato;
  - a limpeza/validação da pergunta, o parsing e a validação de forma da saída;
  - o formato do alvo de treino (format_output) e o texto completo de um exemplo (build_training_text).

Contrato de saída (docs/DATA_CONTRACT.md §8), só as chaves presentes, na ordem fixa:
  {"intent": "MASSA_MOLAR", "composto": "H2SO4"}
  {"intent": "CONCENTRACAO", "composto": "NaCl", "quantidades": [{"valor": 5, "unidade": "g"}, {"valor": 250, "unidade": "mL"}]}
  {"intent": "BALANCEAR", "equacao": "H2 + O2 -> H2O"}
  {"intent": "CONVERSAO_UNIDADE", "quantidades": [{"valor": 25, "unidade": "°C"}], "unidadeDestino": "K"}

A normalização e a ANCORAGEM de cada entidade no texto da pergunta são feitas no proxy (api/_lib/normalize.js e ground.js); este módulo
devolve o JSON bruto. Os vocabulários abaixo espelham api/_lib/vocab.js: test_nlu_core.py confere que não divergiram.
"""
import json
import re
import unicodedata

# ---------------------------------------------------------------------------------------------------------
# Limites
# ---------------------------------------------------------------------------------------------------------
MAX_QUESTION_CHARS = 300
MIN_QUESTION_CHARS = 1  # o proxy exige >= 3; aqui só se recusa o vazio

# Pior caso do alvo: intent + elemento + composto (60 car.) + 4 quantidades + equação (80 car.) + nível + unidadeDestino ≈ 170 tokens.
# O típico tem 10 a 40. Se a gramática não terminar dentro do limite o JSON fica truncado e o proxy responde 502.
MAX_NEW_TOKENS = 256

FORMAT_VERSION = "v1"

# ---------------------------------------------------------------------------------------------------------
# Prompt (ChatML do Qwen2.5; o MESMO usado no treino por ai_model/scripts/train_hybrid.py e na avaliação)
# ---------------------------------------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "Você interpreta perguntas de química para o SaibaTudo Química. "
    "Converta a pergunta em JSON compacto com a intenção e somente as entidades citadas na pergunta "
    "(elemento, composto, propriedade, quantidades, equacao, nivel, unidadeDestino). "
    "Não responda a pergunta, não calcule e não invente dados."
)

IM_START = "<|im_start|>"
IM_END = "<|im_end|>"
STOP_TOKENS = [IM_END, "<|endoftext|>"]

# Sufixo do turno do assistente que o SERVIÇO acrescenta depois de build_prompt(), igual ao do treino. Vazio para a base Qwen2.5;
# para a base Qwen3.5 (SaibaTudo-NLU v3+, treinado em ia/treino/ com enable_thinking=False) é o bloco de raciocínio vazio que o
# template do modelo põe no início da resposta. Vem do ponteiro do Volume (meta.json -> promover.py -> current.json).
THINK_VAZIO = "<think>\n\n</think>\n\n"
SUFIXOS_PROMPT = ("", THINK_VAZIO)

_CONTROLES = re.compile(
    "[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]"
)


# Normalização ANTES do modelo (14/10/2026): o mesmo texto chega ao modelo, ao gate (avaliar_gguf/eval_golden) e ao cache do proxy.
# Só variantes tipográficas que não mudam o sentido: subscritos (H₂O -> H2O), aspas e apóstrofos curvos, traços longos e sinal de menos,
# setas exóticas (⟶ ⇒ ➔ => --> -> '→' da equação continua '→'; '=' NÃO vira seta: 'pH = 7'), setas de equilíbrio (<=> <-> ⇄ -> '⇌'), espaços especiais (NBSP), '×' -> 'x',
# pontuação repetida ('???' -> '?'). Nada é posto em minúsculas e acentos ficam: o modelo copia o composto como está na pergunta.
_SUBSCRITOS = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
_TIPOGRAFIA = str.maketrans({"’": "'", "‘": "'", "´": "'", "`": "'", "“": '"', "”": '"', "„": '"', "−": "-", "–": "-", "—": "-", "‐": "-",
                             "\u00A0": " ", "\u202F": " ", "\u2009": " ", "\u3000": " ", "×": "x", "⟶": "→", "⇒": "→", "➔": "→", "⇾": "→", "⟹": "→"})
_SETA_EQUILIBRIO = re.compile(r"<=>|<->|⇄")  # 17/10/2026: setas de equilíbrio viram "⇌" (EQUILIBRIO); "->", "→" e "=" isolado ficam
_SETA_ASCII = re.compile(r"(?<![-<])(?:-->|=>)(?!>)")  # "-->" e "=>" entre espécies viram "→" ("->" e "→" já são as formas do treino)
_PONTUACAO_REPETIDA = re.compile(r"([?!.,;:])\1+")


def normalize_question(q: str) -> str:
    """Variantes tipográficas -> forma canônica (ver _TIPOGRAFIA). Idempotente; não altera letras, maiúsculas nem acentos."""
    q = unicodedata.normalize("NFC", str(q)).translate(_SUBSCRITOS).translate(_TIPOGRAFIA)
    q = _SETA_EQUILIBRIO.sub("⇌", q)
    q = _SETA_ASCII.sub("→", q)
    return _PONTUACAO_REPETIDA.sub(r"\1", q)


def clean_question(q: str) -> str:
    """Remove controles/zero-width, normaliza a tipografia (normalize_question), colapsa espaços e neutraliza os delimitadores de
    token especial do ChatML (a pergunta não pode fabricar turnos de conversa nem tokens especiais no prompt)."""
    q = _CONTROLES.sub(" ", str(q))
    q = normalize_question(q)
    q = q.replace("<|", "< |").replace("|>", "| >")
    return re.sub(r"\s+", " ", q).strip()


def validate_question(q) -> str:
    """Devolve a pergunta limpa ou levanta ValueError (o endpoint responde 400)."""
    if not isinstance(q, str):
        raise ValueError("q deve ser texto")
    if len(q) > MAX_QUESTION_CHARS:
        raise ValueError(f"q excede {MAX_QUESTION_CHARS} caracteres")
    limpa = clean_question(q)
    if len(limpa) < MIN_QUESTION_CHARS:
        raise ValueError("q vazia")
    return limpa


def build_prompt(question: str) -> str:
    """Prompt idêntico ao do treino: system + user (pergunta crua) + início do turno do assistente."""
    return (
        f"{IM_START}system\n{SYSTEM_PROMPT}{IM_END}\n"
        f"{IM_START}user\n{question}{IM_END}\n"
        f"{IM_START}assistant\n"
    )


def build_training_text(question: str, output_json: str) -> str:
    """Texto completo de um exemplo de treino (prompt + alvo + <|im_end|>), no formato de train_hybrid.py."""
    return build_prompt(question) + output_json + f"{IM_END}\n"


# ---------------------------------------------------------------------------------------------------------
# Vocabulários (espelham api/_lib/vocab.js — test_nlu_core.py confere que não divergiram)
# ---------------------------------------------------------------------------------------------------------
INTENTS = [
    "ELEMENTO", "COMPOSTO", "PROPRIEDADE", "MASSA_MOLAR", "BALANCEAR", "ESTEQUIOMETRIA", "CONCENTRACAO", "PH", "GAS_IDEAL",
    "CONVERSAO_UNIDADE", "NOMENCLATURA", "DESENHAR", "COMPARAR", "TABELA_PERIODICA", "SEGURANCA", "CONCEITO", "NOX", "ENTALPIA",
    "EQUILIBRIO", "LIGACAO", "RECUSA_PERIGO", "SOBRE_DADOS", "FONTES", "AJUDA", "DESCONHECIDA",
]
NIVEIS = ["fundamental", "medio", "superior"]
SIMBOLOS = [
    "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
    "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
    "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
    "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
    "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
    "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
]
PROPRIEDADES = [
    "massaAtomica", "massaMolar", "massaExata", "numeroAtomico", "grupo", "periodo", "bloco", "categoria", "configuracaoEletronica",
    "eletronegatividade", "raioAtomicoPm", "afinidadeEletronicaKJmol", "energiaIonizacaoKJmol", "pontoFusaoK", "pontoEbulicaoK",
    "densidadeKgm3", "estadoPadrao", "estadosOxidacao", "descoberta", "formula", "smiles", "cas", "xlogp", "tpsa", "doadoresH",
    "aceptoresH", "ligacoesRotaveis", "carga", "pka", "solubilidade", "entalpiaFormacaoKJmol",
]
# Vazio desde a unificação (10/10/2026, 21h30): cliente, modelo, golden e `regras.propriedades` usam os MESMOS ids — os nomes dos campos do
# contrato, com unidade (`pontoFusaoK`, `densidadeKgm3`, ...). Espelha PROPRIEDADE_CLIENTE do vocab.js (test_nlu_core.py confere).
PROPRIEDADE_CLIENTE = {}


def propriedade_do_modelo(pid):
    """Id de propriedade no vocabulário do modelo (nome do campo do contrato, com unidade). None se desconhecido."""
    if not isinstance(pid, str):
        return None
    for cand in PROPRIEDADES:
        if cand.lower() == pid.lower():
            return cand
    return None


UNIDADES = [
    "g", "mg", "kg", "u", "mol", "mmol", "L", "mL", "dm3", "m3", "cm3",
    "mol/L", "mmol/L", "g/L", "mg/L", "g/mL", "g/cm3", "kg/m3", "g/mol", "kJ/mol", "kcal/mol",
    "%", "ppm", "K", "°C", "°F", "atm", "Pa", "kPa", "bar", "mmHg", "torr",
    "J", "kJ", "cal", "kcal", "eV", "m", "cm", "mm", "nm", "pm", "Å", "s", "min", "h",
]

MAX_QUANTIDADES = 4  # a gramática desenrola 4; o proxy aceita até 6, mas o modelo nunca precisou de mais de 4

# Chaves PERMITIDAS e OBRIGATÓRIAS por intenção (14/10/2026). Derivadas dos dados: golden (723), corpus de treino (44.703) e validação
# (1.406) da química não têm nenhuma combinação fora desta tabela (test_nlu_core confere o golden). A gramática só deixa o modelo emitir
# as chaves da intenção escolhida e obriga as que aparecem em 100 % dos casos (ELEMENTO -> elemento, PROPRIEDADE -> propriedade,
# DESENHAR -> composto, CONVERSAO_UNIDADE -> unidadeDestino). MASSA_MOLAR/COMPOSTO/BALANCEAR NÃO obrigam entidade: o golden tem
# "como calcular a massa molar?", "balanceamento de equações" (o proxy decide o que fazer sem entidade: api/_lib/normalize.js REQUISITOS).
# Intenções sem entidade (RECUSA_PERIGO, SOBRE_DADOS, FONTES, AJUDA, DESCONHECIDA) não admitem chave nenhuma.
ENTIDADES_POR_INTENCAO = {
    "ELEMENTO": (("elemento",), ("elemento",)),
    "COMPOSTO": (("composto",), ()),
    "PROPRIEDADE": (("elemento", "composto", "propriedade"), ("propriedade",)),
    "MASSA_MOLAR": (("elemento", "composto"), ()),
    "BALANCEAR": (("equacao",), ()),
    "ESTEQUIOMETRIA": (("elemento", "composto", "quantidades", "equacao"), ()),
    "CONCENTRACAO": (("composto", "quantidades", "unidadeDestino"), ()),
    "PH": (("composto", "quantidades"), ()),
    "GAS_IDEAL": (("composto", "quantidades"), ()),
    "CONVERSAO_UNIDADE": (("quantidades", "unidadeDestino"), ("unidadeDestino",)),
    "NOMENCLATURA": (("composto",), ()),
    "DESENHAR": (("composto",), ("composto",)),
    "COMPARAR": (("elemento", "composto", "propriedade"), ()),
    "TABELA_PERIODICA": (("propriedade",), ()),
    "SEGURANCA": (("elemento", "composto"), ()),
    "CONCEITO": (("composto", "nivel"), ()),
    # 17/10/2026 (docs/CALCULADORAS_2026-10-17.md §1): calculadoras novas. LIGACAO com dois elementos leva o PRIMEIRO citado (como COMPARAR).
    "NOX": (("elemento", "composto"), ("composto",)),
    "ENTALPIA": (("composto", "quantidades", "equacao"), ()),
    "EQUILIBRIO": (("equacao", "quantidades"), ("equacao",)),
    "LIGACAO": (("elemento", "composto"), ()),
    "RECUSA_PERIGO": ((), ()),
    "SOBRE_DADOS": ((), ()),
    "FONTES": ((), ()),
    "AJUDA": ((), ()),
    "DESCONHECIDA": ((), ()),
}


def combinacao_valida(obj: dict) -> bool:
    """As chaves presentes cabem na intenção e as obrigatórias estão lá (ENTIDADES_POR_INTENCAO)."""
    regra = ENTIDADES_POR_INTENCAO.get(obj.get("intent"))
    if regra is None:
        return False
    permitidas, obrigatorias = regra
    presentes = {k for k, v in obj.items() if k != "intent" and v not in (None, "", [])}
    return presentes <= set(permitidas) and set(obrigatorias) <= presentes

# ---------------------------------------------------------------------------------------------------------
# Gramática GBNF
# ---------------------------------------------------------------------------------------------------------
# Escrita só com construções básicas do GBNF (literais, classes, alternativas, grupos, `?`), sem `{m,n}` e sem recursão, para funcionar
# em qualquer versão do llama-cpp-python. Comprimentos limitados por aninhamento de opcionais. Cada regra fica em UMA linha. Acentos em
# UTF-8 cru. `"` e `\` ficam FORA das classes de caracteres de texto: o JSON gerado nunca precisa de escape.

_SUB = "₀-₉"  # subscritos Unicode (H₂O) — contíguos em U+2080..U+2089
_COMPOSTO_CHARS = f"[A-Za-z0-9 ,.'()+À-ÿ·{_SUB}-]"  # letras, dígitos, espaço, , . ' ( ) + e acentuadas; "-" por último
_EQUACAO_CHARS = f"[A-Za-z0-9 +=<>()._/,^·→⇌↔⇄⟶{_SUB}-]"


def _lit(valor: str) -> str:
    """Literal GBNF de um valor string JSON, aspas JSON incluídas."""
    corpo = valor.replace("\\", "\\\\").replace('"', '\\"')
    return '"\\"' + corpo + '\\""'


def _alt(valores) -> str:
    return " | ".join(_lit(v) for v in valores)


def _bounded(char_rule: str, minimo: int, maximo: int) -> str:
    """`char{minimo,maximo}` usando só sequência + opcionais aninhados (compatível com qualquer versão)."""
    obrigatorios = " ".join([char_rule] * minimo)
    opcionais = maximo - minimo
    if opcionais <= 0:
        return obrigatorios
    aninhado = ""
    for _ in range(opcionais):
        aninhado = f"({char_rule}{(' ' + aninhado) if aninhado else ''})?"
    return f"{obrigatorios} {aninhado}".strip()


_REGRA_DA_CHAVE = {"elemento": "elemento", "composto": "composto", "propriedade": "propriedade", "quantidades": "quantidades",
                  "equacao": "equacao", "nivel": "nivel", "unidadeDestino": "destino"}


def _regra_intencao(intent: str) -> str:
    """Alternativa da raiz para uma intenção: o literal da intenção seguido SÓ das chaves permitidas (na ordem do contrato), com as
    obrigatórias sem `?`."""
    permitidas, obrigatorias = ENTIDADES_POR_INTENCAO[intent]
    partes = [_lit(intent)]
    for chave in KEYS[1:]:
        if chave in permitidas:
            partes.append(_REGRA_DA_CHAVE[chave] + ("" if chave in obrigatorias else "?"))
    return " ".join(partes)


def build_grammar() -> str:
    """Gramática do formato v1: só as chaves presentes, na ordem fixa do contrato, e — desde 14/10/2026 — só as chaves que a intenção
    escolhida admite (ENTIDADES_POR_INTENCAO), com as obrigatórias garantidas. A regra `intent` fica definida para referência."""
    # quantidades: 1 a MAX_QUANTIDADES itens, desenrolados (sem recursão)
    resto = ""
    for _ in range(MAX_QUANTIDADES - 1):
        resto = f'(", " quant{(" " + resto) if resto else ""})?'
    alternativas = " | ".join(f"i{n}" for n in range(len(INTENTS)))
    linhas = [
        f'root ::= "{{\\"intent\\": " ({alternativas}) "}}"',
        *[f"i{n} ::= {_regra_intencao(intent)}" for n, intent in enumerate(INTENTS)],
        f"intent ::= {_alt(INTENTS)}",
        f'elemento ::= ", \\"elemento\\": " ({_alt(SIMBOLOS)})',
        f'composto ::= ", \\"composto\\": \\"" {_bounded(_COMPOSTO_CHARS, 2, 60)} "\\""',
        f'propriedade ::= ", \\"propriedade\\": " ({_alt(PROPRIEDADES)})',
        f'quantidades ::= ", \\"quantidades\\": [" quant {resto} "]"',
        'quant ::= "{\\"valor\\": " numero ", \\"unidade\\": " unidade "}"',
        f"numero ::= \"-\"? {_bounded('[0-9]', 1, 9)} (\".\" {_bounded('[0-9]', 1, 9)})? ((\"e\" | \"E\") (\"-\" | \"+\")? [0-9] [0-9]? [0-9]?)?",
        f"unidade ::= {_alt(UNIDADES)}",
        f'equacao ::= ", \\"equacao\\": \\"" {_bounded(_EQUACAO_CHARS, 3, 80)} "\\""',
        f'nivel ::= ", \\"nivel\\": " ({_alt(NIVEIS)})',
        'destino ::= ", \\"unidadeDestino\\": " unidade',
    ]
    return "\n".join(linhas) + "\n"


_GRAMMAR = None


def grammar() -> str:
    global _GRAMMAR
    if _GRAMMAR is None:
        _GRAMMAR = build_grammar()
    return _GRAMMAR


# ---------------------------------------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------------------------------------
def parse_model_output(text):
    """Extrai o objeto JSON da saída do modelo (tolera lixo antes/depois, como o extrair_json do treino). Devolve dict ou None."""
    if not isinstance(text, str):
        return None
    i, j = text.find("{"), text.rfind("}")
    if i == -1 or j <= i:
        return None
    try:
        obj = json.loads(text[i : j + 1])
    except ValueError:
        return None
    return obj if isinstance(obj, dict) else None


# Ordem fixa das chaves (= ordem do contrato e da gramática)
KEYS = ["intent", "elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino"]


def has_valid_shape(obj) -> bool:
    """Forma esperada: intent do vocabulário, só chaves do contrato, entidades do vocabulário fechado, quantidades bem formadas.
    NÃO exige a combinação por intenção (combinacao_valida): a gramática a garante na geração; sem gramática, uma chave fora da
    intenção conta como erro de entidade/alucinação no avaliador, não como JSON inválido."""
    if not isinstance(obj, dict) or obj.get("intent") not in INTENTS:
        return False
    if any(k not in KEYS for k in obj):
        return False
    if "elemento" in obj and obj["elemento"] not in SIMBOLOS:
        return False
    if "propriedade" in obj and obj["propriedade"] not in PROPRIEDADES:
        return False
    if "nivel" in obj and obj["nivel"] not in NIVEIS:
        return False
    if "unidadeDestino" in obj and obj["unidadeDestino"] not in UNIDADES:
        return False
    for k in ("composto", "equacao"):
        if k in obj and not (isinstance(obj[k], str) and obj[k].strip()):
            return False
    if "quantidades" in obj:
        q = obj["quantidades"]
        if not (isinstance(q, list) and 1 <= len(q) <= MAX_QUANTIDADES):
            return False
        for item in q:
            if not (isinstance(item, dict) and set(item) == {"valor", "unidade"} and item["unidade"] in UNIDADES):
                return False
            if isinstance(item["valor"], bool) or not isinstance(item["valor"], (int, float)):
                return False
    return True


def format_number(valor) -> str:
    """Número no formato que a gramática aceita: inteiro sem ".0"; senão a repr mais curta do float."""
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError("valor deve ser numérico")
    f = float(valor)
    if f != f or f in (float("inf"), float("-inf")):
        raise ValueError("valor deve ser finito")
    if f == int(f) and abs(f) < 1e15:
        return str(int(f))
    return repr(f)


def format_output(nlu: dict) -> str:
    """Serializa um alvo de treino: só chaves presentes e não vazias, ordem fixa, separadores padrão (", " e ": ") — exatamente o que a
    gramática aceita. `quantidades` vira [{"valor": n, "unidade": "u"}]; valores nulos são omitidos."""
    partes = []
    for k in KEYS:
        v = nlu.get(k)
        if v is None or v == "" or v == []:
            continue
        if k == "quantidades":
            itens = [f'{{"valor": {format_number(x["valor"])}, "unidade": {json.dumps(x["unidade"], ensure_ascii=False)}}}' for x in v]
            partes.append(f'"quantidades": [{", ".join(itens)}]')
        else:
            partes.append(f"{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}")
    if not partes or not partes[0].startswith('"intent"'):
        raise ValueError("intent ausente")
    return "{" + ", ".join(partes) + "}"


# ---------------------------------------------------------------------------------------------------------
# Contexto multi-turno (desde o NLU v3.4; serviço e proxy desde 17/10/2026)
# ---------------------------------------------------------------------------------------------------------
# Espelho de ia/corpus/contexto_nlu.py (a definição de TREINO e do gate; este app não pode importar de ia/). O teste
# ia/corpus/test_contexto_nlu.py confere que as duas implementações montam a mesma string. Mensagem do usuário com contexto:
#     contexto: {"intent": "MASSA_MOLAR", "composto": "NaCl"}
#     e a do KCl?
# Sem contexto, a mensagem é só a pergunta (idêntica ao v3.3).
PREFIXO_CONTEXTO = "contexto: "
SEPARADOR_CONTEXTO = "\n"
MAX_CONTEXTO_CHARS = 400  # da forma canônica (format_output); o proxy aplica o mesmo limite
_CTX = re.compile(r"^contexto: (\{.*\})\n(.*)$", re.S)
_PROIBIDOS_NO_CONTEXTO = re.compile(r"[\r\n]|<\||\|>")


def montar_entrada(contexto_json: str, pergunta: str) -> str:
    """Mensagem do usuário com contexto. `contexto_json` já na forma canônica (format_output); `pergunta` já limpa."""
    if not contexto_json:
        return pergunta
    if "\n" in contexto_json or "\n" in pergunta:
        raise ValueError("contexto e pergunta não podem ter quebra de linha")
    json.loads(contexto_json)  # tem de ser JSON
    return f"{PREFIXO_CONTEXTO}{contexto_json}{SEPARADOR_CONTEXTO}{pergunta}"


def separar_entrada(texto: str):
    """(contexto_json | None, pergunta). Inverso de montar_entrada; texto sem a linha de contexto devolve (None, texto)."""
    m = _CTX.match(texto or "")
    if not m:
        return None, texto
    return m.group(1), m.group(2)


def validate_contexto(contexto) -> str:
    """Interpretação da pergunta anterior (dict no formato do contrato, ou o JSON dela) -> forma canônica (format_output).
    Levanta ValueError (o endpoint responde 400) se não tiver a forma do contrato (has_valid_shape), se algum texto trouxer
    controle, quebra de linha ou delimitador de token especial (`<|`, `|>`), ou se passar de MAX_CONTEXTO_CHARS."""
    if isinstance(contexto, str):
        try:
            contexto = json.loads(contexto)
        except ValueError:
            raise ValueError("contexto não é JSON") from None
    if not isinstance(contexto, dict):
        raise ValueError("contexto deve ser um objeto")
    obj = {k: v for k, v in contexto.items() if v is not None}
    if not has_valid_shape(obj):
        raise ValueError("contexto fora do contrato")
    for k in ("composto", "equacao"):
        if k in obj and (_CONTROLES.search(obj[k]) or _PROIBIDOS_NO_CONTEXTO.search(obj[k])):
            raise ValueError("contexto com caracteres proibidos")
    canonico = format_output(obj)
    if len(canonico) > MAX_CONTEXTO_CHARS:
        raise ValueError(f"contexto excede {MAX_CONTEXTO_CHARS} caracteres")
    return canonico


def build_user_message(pergunta, contexto=None) -> str:
    """Mensagem do usuário que o serviço manda ao modelo: pergunta validada sozinha (validate_question) e, se houver, o contexto
    validado e canônico na linha de cima. É o que ia/corpus/contexto_nlu.limpar_entrada faz no gate."""
    q = validate_question(pergunta)
    if contexto is None:
        return q
    return montar_entrada(validate_contexto(contexto), q)
