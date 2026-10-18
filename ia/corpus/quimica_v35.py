# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — geradores do corpus do NLU v3.5 (17/10/2026), química nos 5 idiomas (pt-BR, en, es, de, fr).

Contrato: apps/quimica/docs/CALCULADORAS_2026-10-17.md (§1 intenções novas, §5 famílias do corpus). Só padrões escritos aqui — nenhuma frase de
livro didático; compostos, fórmulas, íons, equações e elementos vêm do pacote assinado e dos módulos do dataset (apps/quimica/dataset), nunca
inventados. O `composto`/`equacao` é o texto copiado da pergunta (com a caixa); `elemento` é o símbolo.

Famílias (cada registro leva `familia`; ~8 % de cada uma vai para o holdout por hash da entidade e nunca treina):
  intenções novas
    nox              NOX: "NOX do S no H2SO4" (elemento da fórmula + composto), "NOX de cada elemento no KMnO4" (só composto), íons do pacote
                     (MnO4-, Cr2O7 2-, NH4+: gerar_nlu.ions_do_pacote; sem ^ nem sobrescritos, que a gramática do modelo não copia)
    entalpia         ENTALPIA: ΔH da combustão de <composto> (combustíveis do pacote), de <equação balanceada>, calor da queima de <quantidade>
                     de <composto>, "pela lei de Hess" (sem entidade)
    equilibrio       EQUILIBRIO: expressão de Kc/Kp de <equação com ⇌, <=>, <->, → ou =>; Kp a <temperatura>; Kc com [X] = v mol/L (as
                     quantidades na ordem do texto). 18/10: ~25 % SEM equação -> CONCEITO ("como calcular o Kc", "o que é Kp", "qual o Kp a
                     500 K", "calcule o Kc da reação"): sem equação não há o que calcular (CALCULADORAS §1)
    ligacao          LIGACAO: tipo de ligação do <composto>; ligação entre <el1> e <el2> (elemento = o PRIMEIRO); "polar ou apolar"
    entalpia_formacao PROPRIEDADE/COMPARAR com a termoquímica padrão do pacote: `entalpiaFormacaoKJmol` ("entalpia de formação da água", "qual
                     tem maior calor de formação, X ou Y" -> o primeiro) e, desde 18/10, `energiaGibbsFormacaoKJmol` ("energia livre de Gibbs de
                     formação", "ΔG de formação") e `entropiaPadraoJmolK` ("entropia padrão", "entropia molar padrão", "entropia absoluta"), estas
                     duas só com compostos que TÊM o valor no pacote; + CONCEITO de contraste ("o que é entalpia?", "o que é entropia?", "o que é
                     energia livre de Gibbs?")
    particulas       (18/10) PROPRIEDADE `particulas` com elemento = símbolo: "quantos prótons tem o ferro", "quantos elétrons tem o íon Cl-",
                     "número de massa do sódio", íons ("Fe2+", "Fe²⁺", "Fe+2", "cátion Ca2+", "ânion O2-") e número de massa na pergunta ("Fe-56",
                     "56Fe", "carbono-14"); carga e número de massa NÃO vão no rótulo (o cliente lê do texto); ~15 % de contraste (elétrons de
                     valência -> configuracaoEletronica, número atômico -> numeroAtomico)
    configuracao     PROPRIEDADE configuracaoEletronica pelas pistas novas ("elétrons de valência", "camada de valência", "diagrama de Linus
                     Pauling", "distribuição eletrônica"): CALCULADORAS §1 (configuração eletrônica não ganha intenção)
  superfície das intenções existentes
    notacao          notação científica e sobrescritos nas quantidades ("2,5 × 10³ g", "3x10^-2 mol", "1,5·10⁻³ mol/L")
    extenso          frações e numerais por extenso ("meio mol", "dois mols", "um quarto de mol", "half a mole", "ein halbes Mol", "une demi-mole")
    esteq_formada    ESTEQUIOMETRIA sem "quantos": "massa de X formada a partir de N g de Y" (composto = o que tem a quantidade; elemento citado)
    nomenclatura_nome NOMENCLATURA: "como se chama <nome sistemático do pacote>", "que substância é <nome>" (composto copiado)
    mistura          CONCEITO: "é mistura ou substância pura", "mistura homogênea ou heterogênea", "água e óleo é que tipo de mistura" (nível opcional)
    ordenacao        COMPARAR: "ordem crescente de raio atômico de Na, K e Rb" (elemento = o primeiro, propriedade; valores distintos no pacote)

Validação (montar_corpus.carregar_v35): pergunta por validate_question, filtro dos contratos, forma + combinacao_valida, composto/equação no texto
e evidência das quantidades. A evidência do app (backend/retrain/build_nlu_dataset.evidencia_basica) não lê "meio mol", "1/2", "½" nem o ponto
médio de "1,5·10⁻³" (ask_core.numeros_de só conhece "x"/"×"/"*" e "e"); essas famílias passam por `evidencia_v35`, que aceita os números
por extenso/frações do idioma e o "·10^" além dos números de ask_core (nada em apps/ muda).

Amostra:  python -I ia/corpus/quimica_v35.py --familia extenso --idioma de --n 20
"""
import argparse
import importlib.util
import json
import random
import re
import sys
from collections import Counter
from decimal import Decimal
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
QUIMICA = RAIZ / "apps" / "quimica"
DATASET = QUIMICA / "dataset"
IDIOMAS = ["pt-BR", "en", "es", "de", "fr"]
FONTE = "SaibaTudo Química: geradores do NLU v3.5 (ia/corpus/quimica_v35.py) sobre o pacote de dados (PubChem, Wikidata) e as equações do dataset"
LICENCA = "CC BY-SA 4.0"
HOLDOUT_POR_MIL = 80


def _importar(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


v34 = _importar("quimica_v34_para_v35", AQUI / "quimica_v34.py")
fold, balde, _render, _ordenar = v34.fold, v34.balde, v34._render, v34._ordenar


def _dataset():
    """(comum, pacote, vocab_nlu, gerar_nlu) do app (gerar_nlu traz os íons e as equações balanceadas)."""
    comum, pacote, vocab = v34._dataset()
    import gerar_nlu  # noqa: E402  (DATASET já está no sys.path)
    return comum, pacote, vocab, gerar_nlu


# =========================================================================================================
# Evidência das quantidades (números por extenso, frações e "·10^")
# =========================================================================================================
_FRACOES_UNICODE = {"½": 0.5, "¼": 0.25, "¾": 0.75}
EXTENSO_LEITURA = {  # leitura (texto sem acento, minúsculo) -> valor; as mais longas primeiro
    "pt-BR": [(r"\btres quartos\b", 0.75), (r"\bum quarto\b", 0.25), (r"\b(?:um )?(?:mol|litro|quilo|grama) e meio\b", 1.5), (r"\bmeio\b", 0.5),
              (r"\bmeia\b", 0.5), (r"\bdois\b", 2), (r"\bduas\b", 2), (r"\btres\b", 3), (r"\bquatro\b", 4), (r"\bcinco\b", 5), (r"\bdez\b", 10), (r"\bcem\b", 100)],
    "en": [(r"\bthree quarters\b", 0.75), (r"\ba quarter\b", 0.25), (r"\bone and a half\b", 1.5), (r"\bhalf\b", 0.5), (r"\btwo\b", 2), (r"\bthree\b", 3),
           (r"\bfour\b", 4), (r"\bfive\b", 5), (r"\bten\b", 10), (r"\b(?:a|one) hundred\b", 100)],
    "es": [(r"\btres cuartos\b", 0.75), (r"\bun cuarto\b", 0.25), (r"\b(?:un )?(?:mol|litro|kilo|gramo) y medio\b", 1.5), (r"\bmedio\b", 0.5),
           (r"\bmedia\b", 0.5), (r"\bdos\b", 2), (r"\btres\b", 3), (r"\bcuatro\b", 4), (r"\bcinco\b", 5), (r"\bdiez\b", 10), (r"\bcien\b", 100)],
    "de": [(r"\bdreiviertel\b", 0.75), (r"\bviertel\b", 0.25), (r"\b(?:anderthalb|eineinhalb)\b", 1.5), (r"\bhalbe[nrs]?\b", 0.5), (r"\bzwei\b", 2),
           (r"\bdrei\b", 3), (r"\bvier\b", 4), (r"\bfunf\b", 5), (r"\bzehn\b", 10), (r"\bhundert\b", 100)],
    "fr": [(r"\btrois quarts\b", 0.75), (r"\bun quart\b", 0.25), (r"\b(?:une? )?(?:mole|litre|kilo|gramme) et demie?\b", 1.5), (r"\bdemie?\b", 0.5),
           (r"\bdeux\b", 2), (r"\btrois\b", 3), (r"\bquatre\b", 4), (r"\bcinq\b", 5), (r"\bdix\b", 10), (r"\bcent\b", 100)],
}


def _chave(v) -> str:
    return format(abs(float(v)), ".10g")


def numeros_v35(q: str, idioma: str, ask_core) -> set:
    """Chaves numéricas do texto: as de ask_core.numeros_de (com o ponto médio "·"/"⋅" antes de 10 lido como "x"), as frações "a/b" e "½ ¼ ¾"
    e os numerais por extenso do idioma."""
    t = re.sub(r"(\d)\s*[·⋅]\s*(?=10)", r"\1x", q)
    chaves = set(ask_core.numeros_de(t))
    for a, b in re.findall(r"(?<![\w.,])(\d+)\s*/\s*(\d+)(?![\w.,])", q):
        if int(b):
            chaves.add(_chave(int(a) / int(b)))
    chaves |= {_chave(v) for ch, v in _FRACOES_UNICODE.items() if ch in q}
    f = fold(q)
    for rx, v in EXTENSO_LEITURA.get(idioma, []):
        if re.search(rx, f):
            chaves.add(_chave(v))
    return chaves


def evidencia_v35(q: str, plano: dict, idioma: str, bq) -> str | None:
    """Como build_nlu_dataset.evidencia_basica (equação pela função do app), com as quantidades lidas por numeros_v35."""
    sem = bq.evidencia_basica(q, {k: v for k, v in plano.items() if k != "quantidades"})
    if sem:
        return sem
    chaves = numeros_v35(q, idioma, bq.ask_core)
    for x in plano.get("quantidades") or []:
        if _chave(x["valor"]) not in chaves:
            return "quantidades"
    return None


# =========================================================================================================
# Língua: preposição "em", listas, quantidades especiais
# =========================================================================================================
def x_em(L, nome, tipo):
    """"no H2SO4" / "na amônia" / "in H2SO4" / "en el ácido" / "in Wasser" / "dans l'eau"."""
    if L.idioma == "pt-BR":
        if tipo in ("formula", "simbolo"):
            return f"no {nome}"
        return ("na " if L.comum.genero(nome) == "a" else "no ") + nome
    if L.idioma == "en":
        return f"in {nome}"
    if L.idioma == "es":
        return "en " + L.x(nome, tipo)
    if L.idioma == "de":
        return f"in {nome}"
    return "dans " + L.x(nome, tipo)


CONJ = {"pt-BR": " e ", "en": " and ", "es": " y ", "de": " und ", "fr": " et "}


def lista(itens, idioma, rng):
    if rng.random() < 0.25:
        return ", ".join(itens)
    return ", ".join(itens[:-1]) + CONJ[idioma] + itens[-1]


SUP = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")
MANTISSAS = ["1", "1.2", "1.5", "2", "2.5", "3", "3.2", "4", "4.5", "5", "6", "6.02", "7.5", "8", "9.1"]
EXPOENTES = {"g": [-3, -2, -1, 2, 3, 4], "mg": [2, 3], "kg": [-3, -2, 2, 3], "mol": [-4, -3, -2, -1, 2], "mmol": [2, 3], "L": [-3, -2, -1, 2, 3],
             "mL": [2, 3, 4], "mol/L": [-6, -5, -4, -3, -2, -1], "K": [2], "Pa": [3, 4, 5], "kPa": [2, 3], "J": [2, 3, 4, 5], "kJ": [2, 3], "atm": [-2, -1, 1]}


def notacao(rng, idioma, unidade):
    """("2,5 × 10³", 2500.0): mantissa × 10^e em uma das formas escritas; valor exato (Decimal)."""
    m = rng.choice(MANTISSAS)
    e = rng.choice(EXPOENTES[unidade])
    valor = float(Decimal(m) * (Decimal(10) ** e))
    ms = m.replace(".", "," if idioma != "en" else ".")
    formas = [f"{ms} × 10^{e}", f"{ms} x 10^{e}", f"{ms}x10^{e}", f"{ms} × 10{str(e).translate(SUP)}", f"{ms}·10^{e}", f"{ms} · 10{str(e).translate(SUP)}",
              f"{ms}*10^{e}", f"{ms} x 10^({e})", f"{ms}×10{str(e).translate(SUP)}"]
    if idioma == "en" or rng.random() < 0.15:
        formas.append(f"{m}e{e}")
    return rng.choice(formas), valor


def unidade_simbolo(L, unidade):
    """Forma curta da unidade (símbolo), às vezes "M" para mol/L."""
    if unidade == "mol/L":
        return L.rng.choice(["mol/L", "mol/L", "M", "mol/l"])
    return unidade


# numerais por extenso: idioma -> unidade -> [(valor, forma [, forma no dativo (de)])]
EXTENSO = {
    "pt-BR": {"mol": [(0.5, "meio mol"), (0.5, "1/2 mol"), (0.5, "½ mol"), (0.25, "um quarto de mol"), (0.25, "1/4 de mol"), (0.25, "¼ de mol"),
                      (0.75, "três quartos de mol"), (0.75, "3/4 de mol"), (1.5, "um mol e meio"), (1.5, "mol e meio"), (2, "dois mols"), (2, "dois moles"),
                      (3, "três mols"), (4, "quatro mols"), (5, "cinco mols"), (10, "dez mols")],
              "g": [(2, "dois gramas"), (3, "três gramas"), (5, "cinco gramas"), (10, "dez gramas"), (100, "cem gramas"), (0.5, "meio grama")],
              "kg": [(0.5, "meio quilo"), (2, "dois quilos"), (1.5, "um quilo e meio")],
              "L": [(0.5, "meio litro"), (2, "dois litros"), (1.5, "um litro e meio"), (3, "três litros"), (5, "cinco litros")]},
    "en": {"mol": [(0.5, "half a mole"), (0.5, "half a mol"), (0.5, "1/2 mol"), (0.5, "½ mol"), (0.25, "a quarter of a mole"), (0.25, "a quarter mole"),
                   (0.25, "1/4 mol"), (0.75, "three quarters of a mole"), (0.75, "3/4 mol"), (1.5, "one and a half moles"), (2, "two moles"), (3, "three moles"),
                   (4, "four moles"), (5, "five moles"), (10, "ten moles")],
           "g": [(2, "two grams"), (5, "five grams"), (10, "ten grams"), (100, "a hundred grams"), (100, "one hundred grams"), (0.5, "half a gram")],
           "kg": [(0.5, "half a kilo"), (0.5, "half a kilogram"), (2, "two kilograms")],
           "L": [(0.5, "half a liter"), (0.5, "half a litre"), (2, "two liters"), (1.5, "one and a half liters"), (3, "three liters")]},
    "es": {"mol": [(0.5, "medio mol"), (0.5, "1/2 mol"), (0.25, "un cuarto de mol"), (0.25, "1/4 de mol"), (0.75, "tres cuartos de mol"), (1.5, "un mol y medio"),
                   (1.5, "mol y medio"), (2, "dos moles"), (3, "tres moles"), (5, "cinco moles"), (10, "diez moles")],
           "g": [(2, "dos gramos"), (5, "cinco gramos"), (10, "diez gramos"), (100, "cien gramos"), (0.5, "medio gramo")],
           "kg": [(0.5, "medio kilo"), (2, "dos kilos"), (1.5, "kilo y medio")],
           "L": [(0.5, "medio litro"), (2, "dos litros"), (1.5, "litro y medio"), (1.5, "un litro y medio"), (3, "tres litros")]},
    "de": {"mol": [(0.5, "ein halbes Mol", "einem halben Mol"), (0.5, "1/2 Mol", "1/2 Mol"), (0.25, "ein viertel Mol", "einem viertel Mol"),
                   (1.5, "anderthalb Mol", "anderthalb Mol"), (1.5, "eineinhalb Mol", "eineinhalb Mol"), (2, "zwei Mol", "zwei Mol"), (3, "drei Mol", "drei Mol"),
                   (5, "fünf Mol", "fünf Mol"), (10, "zehn Mol", "zehn Mol")],
           "g": [(2, "zwei Gramm", "zwei Gramm"), (5, "fünf Gramm", "fünf Gramm"), (10, "zehn Gramm", "zehn Gramm"), (100, "hundert Gramm", "hundert Gramm"),
                 (0.5, "ein halbes Gramm", "einem halben Gramm")],
           "kg": [(0.5, "ein halbes Kilo", "einem halben Kilo"), (2, "zwei Kilo", "zwei Kilo")],
           "L": [(0.5, "einen halben Liter", "einem halben Liter"), (2, "zwei Liter", "zwei Litern"), (1.5, "anderthalb Liter", "anderthalb Litern"),
                 (3, "drei Liter", "drei Litern")]},
    "fr": {"mol": [(0.5, "une demi-mole"), (0.5, "1/2 mole"), (0.25, "un quart de mole"), (0.75, "trois quarts de mole"), (1.5, "une mole et demie"),
                   (2, "deux moles"), (3, "trois moles"), (5, "cinq moles"), (10, "dix moles")],
           "g": [(2, "deux grammes"), (5, "cinq grammes"), (10, "dix grammes"), (100, "cent grammes"), (0.5, "un demi-gramme")],
           "kg": [(0.5, "un demi-kilo"), (2, "deux kilos")],
           "L": [(0.5, "un demi-litre"), (2, "deux litres"), (1.5, "un litre et demi"), (3, "trois litres")]},
}


def extenso(rng, idioma, unidade, dativo=False):
    item = rng.choice(EXTENSO[idioma][unidade])
    texto = item[2] if (dativo and len(item) > 2) else item[1]
    v = item[0]
    return texto, {"valor": int(v) if v == int(v) else v, "unidade": unidade}


# =========================================================================================================
# Moldes (padrões escritos para o v3.5)
# =========================================================================================================
# NOX: {el_de} elemento com "de"; {c_em} composto com "em"; {c_de}; {c} cru; {ion} íon cru
NOX = {
    "pt-BR": {"el": ["Qual o NOX {el_de} {c_em}?", "NOX {el_de} {c_em}", "número de oxidação {el_de} {c_em}", "Calcule o NOX {el_de} {c_em}",
                     "Qual é o estado de oxidação {el_de} {c_em}?", "{C_em}, qual o NOX {el_de}?", "Quanto vale o nox {el_de} {c_em}?",
                     "Determine o número de oxidação {el_de} {c_em}", "nox {el_de} {c_em}?", "Com que NOX {el} aparece {c_em}?"],
              "todos": ["estados de oxidação de cada elemento {c_em}", "NOX de todos os elementos {c_de}", "Quais os números de oxidação {c_em}?",
                        "Calcule o NOX de cada átomo {c_de}", "nox dos elementos {c_de}", "Me dá os NOX {c_de}", "Determine os estados de oxidação {c_em}"],
              "ion_el": ["Qual o NOX {el_de} no {ion}?", "número de oxidação {el_de} no íon {ion}", "NOX {el_de} em {ion}", "Calcule o nox {el_de} no ânion {ion}",
                         "No íon {ion}, qual o NOX {el_de}?", "nox {el_de} no cátion {ion}"],
              "ion": ["NOX de cada elemento no íon {ion}", "Quais os números de oxidação no {ion}?", "estados de oxidação no íon {ion}"]},
    "en": {"el": ["What is the oxidation number of {el} in {c}?", "oxidation state of {el} in {c}", "Find the oxidation number of {el} in {c}",
                  "What's the oxidation state of {el} in {c}?", "Calculate the oxidation number of {el} in {c}", "In {c}, what is the oxidation state of {el}?",
                  "oxidation number {el_de} in {c}"],
           "todos": ["oxidation states of each element in {c}", "What are the oxidation numbers in {c}?", "Assign oxidation numbers to every atom in {c}",
                     "oxidation numbers of all the elements in {c}", "Find the oxidation states in {c}"],
           "ion_el": ["What is the oxidation number of {el} in {ion}?", "oxidation state of {el} in the {ion} ion", "In the ion {ion}, what is the oxidation state of {el}?",
                      "Find the oxidation number of {el} in {ion}"],
           "ion": ["oxidation numbers of each element in the {ion} ion", "What are the oxidation states in {ion}?"]},
    "es": {"el": ["¿Cuál es el número de oxidación {el_de} {c_em}?", "estado de oxidación {el_de} {c_em}", "Calcula el número de oxidación {el_de} {c_em}",
                  "¿Qué número de oxidación tiene {el} {c_em}?", "Determina el estado de oxidación {el_de} {c_em}", "número de oxidación {el_de} {c_em}"],
           "todos": ["números de oxidación de cada elemento {c_em}", "¿Cuáles son los estados de oxidación {c_em}?", "Asigna los números de oxidación {c_de}",
                     "estados de oxidación de todos los átomos {c_de}"],
           "ion_el": ["¿Cuál es el número de oxidación {el_de} en el ion {ion}?", "estado de oxidación {el_de} en {ion}", "Calcula el número de oxidación {el_de} en {ion}"],
           "ion": ["números de oxidación en el ion {ion}", "¿Cuáles son los estados de oxidación en {ion}?"]},
    "de": {"el": ["Welche Oxidationszahl hat {el} {c_em}?", "Oxidationszahl {el_de} {c_em}", "Bestimme die Oxidationszahl {el_de} {c_em}",
                  "Wie groß ist die Oxidationsstufe {el_de} {c_em}?", "Berechne die Oxidationszahl {el_de} {c_em}", "Oxidationsstufe {el_de} {c_em}"],
           "todos": ["Oxidationszahlen aller Elemente {c_em}", "Welche Oxidationszahlen haben die Atome {c_em}?", "Bestimme alle Oxidationsstufen {c_em}",
                     "Oxidationszahlen {c_em}"],
           "ion_el": ["Welche Oxidationszahl hat {el} im Ion {ion}?", "Oxidationszahl {el_de} in {ion}", "Bestimme die Oxidationsstufe {el_de} im {ion}"],
           "ion": ["Oxidationszahlen im Ion {ion}", "Welche Oxidationszahlen gibt es in {ion}?"]},
    "fr": {"el": ["Quel est le nombre d'oxydation {el_de} {c_em} ?", "degré d'oxydation {el_de} {c_em}", "Calcule le nombre d'oxydation {el_de} {c_em}",
                  "Détermine le degré d'oxydation {el_de} {c_em}", "nombre d'oxydation {el_de} {c_em}", "Quel est l'état d'oxydation {el_de} {c_em} ?"],
           "todos": ["nombres d'oxydation de chaque élément {c_em}", "Quels sont les degrés d'oxydation {c_em} ?", "Attribue les nombres d'oxydation {c_de}",
                     "degrés d'oxydation de tous les atomes {c_em}"],
           "ion_el": ["Quel est le nombre d'oxydation {el_de} dans l'ion {ion} ?", "degré d'oxydation {el_de} dans {ion}", "Calcule le nombre d'oxydation {el_de} dans {ion}"],
           "ion": ["nombres d'oxydation dans l'ion {ion}", "Quels sont les degrés d'oxydation dans {ion} ?"]},
}
# ENTALPIA: {c_de}; {q} {c} (quantidade do combustível); {eq}; {eq} + {q}; sem entidade
ENT = {
    "pt-BR": {"co": ["ΔH da combustão {c_de}", "Qual a entalpia de combustão {c_de}?", "variação de entalpia da queima {c_de}", "calor de combustão {c_de}",
                     "Quanto calor libera a combustão {c_de}?", "A queima {c_de} é exotérmica?", "Calcule a entalpia de combustão {c_de}", "delta H da queima {c_de}",
                     "Qual o ΔH de combustão {c_de}?"],
              "q": ["calor liberado na queima de {q} de {c}", "Quanta energia sai da combustão de {q} de {c}?", "Quantos kJ libera a queima de {q} de {c}?",
                    "Qual o calor liberado ao queimar {q} de {c}?", "Queimando {q} de {c}, quanto calor é liberado?", "energia da combustão de {q} de {c}"],
              "eq": ["variação de entalpia de {eq}", "Calcule o ΔH da reação {eq}", "Qual o ΔH de {eq}?", "entalpia da reação {eq}", "{eq}: qual o ΔH?",
                     "A reação {eq} é exotérmica ou endotérmica?", "Calcule o ΔH de {eq} pelas entalpias de formação", "Use a lei de Hess para achar o ΔH de {eq}",
                     "Qual a variação de entalpia da reação {eq}?"],
              "eq_q": ["Na reação {eq}, quanto calor é liberado com {q}?", "Para {eq}, qual o calor envolvido com {q}?"],
              "nada": ["Calcule a entalpia de uma reação pela lei de Hess", "Como achar o ΔH pela lei de Hess?", "ΔH pela lei de Hess", "Lei de Hess: calcule o ΔH da reação",
                       "Quero calcular a variação de entalpia somando equações (lei de Hess)"]},
    "en": {"co": ["ΔH of combustion of {c}", "What is the enthalpy of combustion of {c}?", "enthalpy change for burning {c}", "heat of combustion of {c}",
                  "How much heat does burning {c} release?", "Is the combustion of {c} exothermic?", "Calculate the enthalpy of combustion of {c}"],
           "q": ["heat released by burning {q} of {c}", "How much energy is released when {q} of {c} burns?", "How many kJ does burning {q} of {c} release?",
                 "What heat is given off when {q} of {c} is burned?"],
           "eq": ["enthalpy change of {eq}", "Calculate ΔH for the reaction {eq}", "What is ΔH for {eq}?", "reaction enthalpy of {eq}", "Is {eq} exothermic or endothermic?",
                  "Use Hess's law to find ΔH for {eq}", "Calculate ΔH of {eq} from enthalpies of formation"],
           "eq_q": ["For {eq}, how much heat is released with {q}?"],
           "nada": ["Calculate a reaction enthalpy with Hess's law", "How do I find ΔH using Hess's law?", "Hess's law: calculate the reaction enthalpy"]},
    "es": {"co": ["ΔH de combustión {c_de}", "¿Cuál es la entalpía de combustión {c_de}?", "variación de entalpía al quemar {c}", "calor de combustión {c_de}",
                  "¿Cuánto calor libera la combustión {c_de}?", "¿La combustión {c_de} es exotérmica?", "Calcula la entalpía de combustión {c_de}"],
           "q": ["calor liberado al quemar {q} de {c}", "¿Cuánta energía se libera al quemar {q} de {c}?", "¿Cuántos kJ libera la combustión de {q} de {c}?",
                 "¿Qué calor se desprende al quemar {q} de {c}?"],
           "eq": ["variación de entalpía de {eq}", "Calcula el ΔH de la reacción {eq}", "¿Cuál es el ΔH de {eq}?", "entalpía de reacción de {eq}",
                  "¿La reacción {eq} es exotérmica o endotérmica?", "Usa la ley de Hess para hallar el ΔH de {eq}"],
           "eq_q": ["En la reacción {eq}, ¿cuánto calor se libera con {q}?"],
           "nada": ["Calcula la entalpía de una reacción con la ley de Hess", "¿Cómo hallo el ΔH con la ley de Hess?", "Ley de Hess: calcula el ΔH de la reacción"]},
    "de": {"co": ["ΔH der Verbrennung {c_de}", "Wie groß ist die Verbrennungsenthalpie {c_de}?", "Enthalpieänderung beim Verbrennen {c_de}", "Verbrennungswärme {c_de}",
                  "Wie viel Wärme setzt die Verbrennung {c_de} frei?", "Ist die Verbrennung {c_de} exotherm?", "Berechne die Verbrennungsenthalpie {c_de}"],
           "q": ["Wärme beim Verbrennen von {q} {c}", "Wie viel Energie wird beim Verbrennen von {q} {c} frei?", "Wie viele kJ setzt die Verbrennung von {q} {c} frei?",
                 "Welche Wärme entsteht, wenn {q} {c} verbrennen?"],
           "eq": ["Reaktionsenthalpie von {eq}", "Berechne ΔH der Reaktion {eq}", "Wie groß ist ΔH für {eq}?", "Enthalpieänderung von {eq}",
                  "Ist die Reaktion {eq} exotherm oder endotherm?", "Bestimme ΔH von {eq} mit dem Satz von Hess"],
           "eq_q": ["Bei der Reaktion {eq}: wie viel Wärme wird mit {q} frei?"],
           "nada": ["Berechne eine Reaktionsenthalpie mit dem Satz von Hess", "Wie bestimme ich ΔH mit dem Satz von Hess?", "Satz von Hess: berechne die Reaktionsenthalpie"]},
    "fr": {"co": ["ΔH de combustion {c_de}", "Quelle est l'enthalpie de combustion {c_de} ?", "variation d'enthalpie lors de la combustion {c_de}", "chaleur de combustion {c_de}",
                  "Quelle chaleur libère la combustion {c_de} ?", "La combustion {c_de} est-elle exothermique ?", "Calcule l'enthalpie de combustion {c_de}"],
           "q": ["chaleur libérée par la combustion de {q} de {c}", "Quelle énergie est libérée en brûlant {q} de {c} ?", "Combien de kJ libère la combustion de {q} de {c} ?",
                 "Quelle chaleur dégage la combustion de {q} de {c} ?"],
           "eq": ["variation d'enthalpie de {eq}", "Calcule le ΔH de la réaction {eq}", "Quel est le ΔH de {eq} ?", "enthalpie de réaction de {eq}",
                  "La réaction {eq} est-elle exothermique ou endothermique ?", "Utilise la loi de Hess pour trouver le ΔH de {eq}"],
           "eq_q": ["Pour la réaction {eq}, quelle chaleur est libérée avec {q} ?"],
           "nada": ["Calcule une enthalpie de réaction avec la loi de Hess", "Comment trouver le ΔH avec la loi de Hess ?", "Loi de Hess : calcule l'enthalpie de réaction"]},
}
# EQUILIBRIO: {eq}; {T}; {conc} (concentrações em ordem); {pp} (pressões parciais em atm)
EQM = {
    "pt-BR": {"eq": ["Escreva a expressão de Kc para {eq}", "expressão da constante de equilíbrio de {eq}", "Qual o Kc de {eq}?", "Monte o Kc da reação {eq}",
                     "expressão de Kp para {eq}", "Como fica a constante Kc para {eq}?", "relação entre Kp e Kc para {eq}", "Qual a expressão de Kp da reação {eq}?",
                     "constante de equilíbrio em termos de concentração para {eq}"],
              "T": ["Calcule Kp a partir de Kc para {eq} a {T}", "Kp da reação {eq} a {T}", "Qual o Kp de {eq} a {T}?", "relação Kp/Kc de {eq} a {T}",
                    "Converta Kc em Kp para {eq} a {T}"],
              "conc": ["Calcule o Kc de {eq} com {conc}", "No equilíbrio de {eq}: {conc}. Qual o Kc?", "Para {eq}, {conc}. Calcule a constante de equilíbrio",
                       "Kc de {eq} sabendo que {conc}", "Qual o valor do Kc de {eq} quando {conc}?", "{conc} no equilíbrio de {eq}. Quanto vale Kc?"],
              "conc_T": ["Calcule Kc e Kp de {eq} com {conc} a {T}", "Para {eq} a {T}, {conc}. Qual o Kp?"],
              "conc_antes": ["Com {conc}, qual o Kc de {eq}?", "Sabendo que {conc}, calcule o Kc de {eq}", "{conc}: quanto vale o Kc de {eq}?"],
              "pp": ["Calcule o Kp de {eq} com {pp}", "Kp de {eq} sabendo que {pp}"]},
    "en": {"eq": ["Write the Kc expression for {eq}", "equilibrium constant expression for {eq}", "What is Kc for {eq}?", "Kp expression for {eq}",
                  "relationship between Kp and Kc for {eq}", "Set up the equilibrium constant for {eq}"],
           "T": ["Calculate Kp from Kc for {eq} at {T}", "Kp for {eq} at {T}", "What is Kp of {eq} at {T}?", "Convert Kc to Kp for {eq} at {T}"],
           "conc": ["Calculate Kc for {eq} with {conc}", "At equilibrium for {eq}: {conc}. What is Kc?", "Find Kc of {eq} given {conc}", "{conc} at equilibrium in {eq}. Find Kc"],
           "conc_T": ["Calculate Kc and Kp for {eq} with {conc} at {T}"],
           "conc_antes": ["With {conc}, what is Kc for {eq}?", "Given {conc}, find Kc of {eq}"],
           "pp": ["Calculate Kp for {eq} with {pp}"]},
    "es": {"eq": ["Escribe la expresión de Kc para {eq}", "expresión de la constante de equilibrio de {eq}", "¿Cuál es el Kc de {eq}?", "expresión de Kp para {eq}",
                  "relación entre Kp y Kc para {eq}"],
           "T": ["Calcula Kp a partir de Kc para {eq} a {T}", "Kp de la reacción {eq} a {T}", "¿Cuál es el Kp de {eq} a {T}?"],
           "conc": ["Calcula el Kc de {eq} con {conc}", "En el equilibrio de {eq}: {conc}. ¿Cuál es Kc?", "Halla Kc de {eq} sabiendo que {conc}"],
           "conc_T": ["Calcula Kc y Kp de {eq} con {conc} a {T}"],
           "conc_antes": ["Con {conc}, ¿cuál es el Kc de {eq}?", "Sabiendo que {conc}, calcula el Kc de {eq}"],
           "pp": ["Calcula el Kp de {eq} con {pp}"]},
    "de": {"eq": ["Stelle den Kc-Ausdruck für {eq} auf", "Gleichgewichtskonstante von {eq}", "Wie lautet Kc für {eq}?", "Kp-Ausdruck für {eq}",
                  "Zusammenhang zwischen Kp und Kc für {eq}"],
           "T": ["Berechne Kp aus Kc für {eq} bei {T}", "Kp von {eq} bei {T}", "Wie groß ist Kp für {eq} bei {T}?"],
           "conc": ["Berechne Kc für {eq} mit {conc}", "Im Gleichgewicht von {eq} gilt {conc}. Wie groß ist Kc?", "Bestimme Kc von {eq}, wenn {conc}"],
           "conc_T": ["Berechne Kc und Kp für {eq} mit {conc} bei {T}"],
           "conc_antes": ["Mit {conc}: wie groß ist Kc für {eq}?", "Gegeben {conc}. Berechne Kc von {eq}"],
           "pp": ["Berechne Kp für {eq} mit {pp}"]},
    "fr": {"eq": ["Écris l'expression de Kc pour {eq}", "expression de la constante d'équilibre de {eq}", "Quel est le Kc de {eq} ?", "expression de Kp pour {eq}",
                  "relation entre Kp et Kc pour {eq}"],
           "T": ["Calcule Kp à partir de Kc pour {eq} à {T}", "Kp de la réaction {eq} à {T}", "Quel est le Kp de {eq} à {T} ?"],
           "conc": ["Calcule le Kc de {eq} avec {conc}", "À l'équilibre de {eq} : {conc}. Quel est Kc ?", "Trouve Kc de {eq} sachant que {conc}"],
           "conc_T": ["Calcule Kc et Kp de {eq} avec {conc} à {T}"],
           "conc_antes": ["Avec {conc}, quel est le Kc de {eq} ?", "Sachant que {conc}, calcule le Kc de {eq}"],
           "pp": ["Calcule le Kp de {eq} avec {pp}"]},
}
# LIGACAO: {a}/{b} elementos crus, {A} com artigo; {c}, {c_de}, {c_em}, {C}; {el} metal com artigo
LIG = {
    "pt-BR": {"par": ["Que tipo de ligação existe entre {a} e {b}?", "ligação entre {a} e {b}", "{a} e {b} fazem ligação iônica ou covalente?",
                      "A ligação {a}-{b} é polar ou apolar?", "Qual ligação química se forma entre {a} e {b}?", "tipo de ligação entre átomos de {a} e {b}",
                      "Entre {a} e {b}, a ligação é iônica, covalente ou metálica?", "Quando {A} se liga ao {b}, que ligação aparece?"],
              "co": ["Qual o tipo de ligação {c_de}?", "Que ligação há {c_em}?", "{C} é iônico ou covalente?", "A ligação {c_em} é polar ou apolar?",
                     "tipo de ligação química {c_em}", "As ligações {c_em} são polares?", "Classifique a ligação {c_de}", "{C} tem ligação iônica?",
                     "Que tipo de ligação une os átomos {c_em}?", "Qual a polaridade das ligações {c_em}?"],
              "metal": ["Que tipo de ligação existe no {el} metálico?", "Qual a ligação entre os átomos de {el}?"]},
    "en": {"par": ["What type of bond forms between {a} and {b}?", "bond between {a} and {b}", "Do {a} and {b} form an ionic or covalent bond?",
                   "Is the {a}-{b} bond polar or nonpolar?", "What kind of chemical bond is there between {a} and {b}?", "Between {a} and {b}, is the bond ionic, covalent or metallic?"],
           "co": ["What type of bonding is in {c}?", "Is {c} ionic or covalent?", "Is the bond in {c} polar or nonpolar?", "type of chemical bond in {c}",
                  "Are the bonds in {c} polar?", "Classify the bonding in {c}", "What holds the atoms together in {c}?"],
           "metal": ["What type of bonding is there in metallic {el}?", "What bond holds {el} atoms together?"]},
    "es": {"par": ["¿Qué tipo de enlace hay entre {a} y {b}?", "enlace entre {a} y {b}", "¿{a} y {b} forman un enlace iónico o covalente?", "¿El enlace {a}-{b} es polar o apolar?",
                   "¿Qué enlace químico se forma entre {a} y {b}?"],
           "co": ["¿Qué tipo de enlace tiene {c}?", "¿{C} es iónico o covalente?", "¿El enlace {c_em} es polar o apolar?", "tipo de enlace químico {c_em}",
                  "Clasifica el enlace {c_de}", "¿Son polares los enlaces {c_em}?"],
           "metal": ["¿Qué tipo de enlace hay en {el} metálico?"]},
    "de": {"par": ["Welche Bindung entsteht zwischen {a} und {b}?", "Bindung zwischen {a} und {b}", "Bilden {a} und {b} eine Ionenbindung oder eine kovalente Bindung?",
                   "Ist die {a}-{b}-Bindung polar oder unpolar?", "Welche Bindungsart gibt es zwischen {a} und {b}?"],
           "co": ["Welche Bindungsart hat {c}?", "Ist {c} ionisch oder kovalent?", "Ist die Bindung {c_em} polar oder unpolar?", "Bindungstyp {c_em}",
                  "Sind die Bindungen {c_em} polar?", "Klassifiziere die Bindung {c_em}"],
           "metal": ["Welche Bindung liegt in metallischem {el} vor?"]},
    "fr": {"par": ["Quel type de liaison y a-t-il entre {a} et {b} ?", "liaison entre {a} et {b}", "Entre {a} et {b}, la liaison est-elle ionique ou covalente ?",
                   "La liaison {a}-{b} est-elle polaire ou apolaire ?", "Quelle liaison chimique se forme entre {a} et {b} ?"],
           "co": ["Quel type de liaison a {c} ?", "Est-ce que {c} est ionique ou covalent ?", "La liaison {c_em} est-elle polaire ou apolaire ?", "type de liaison chimique {c_em}",
                  "Classe la liaison {c_de}", "Les liaisons {c_em} sont-elles polaires ?"],
           "metal": ["Quel type de liaison y a-t-il dans {el} métallique ?"]},
}
HF_FORMAS = {  # entalpiaFormacaoKJmol: (artigo, forma); as formas casam com contracts/lexico/<idioma>.json (propriedades.entalpiaFormacaoKJmol)
    "pt-BR": [("a", "entalpia de formação"), ("a", "entalpia padrão de formação"), ("o", "calor de formação")],
    "en": [("the", "enthalpy of formation"), ("the", "standard enthalpy of formation"), ("the", "heat of formation")],
    "es": [("la", "entalpía de formación"), ("la", "entalpía estándar de formación"), ("el", "calor de formación")],
    "de": [("die", "Bildungsenthalpie"), ("die", "Standardbildungsenthalpie"), ("die", "Bildungswärme")],
    "fr": [("l'", "enthalpie de formation"), ("l'", "enthalpie standard de formation"), ("la", "chaleur de formation")],
}
# Termoquímica padrão do pacote (18/10/2026): ΔHf°, ΔGf° e S° (DATA_CONTRACT §3.1). id -> idioma -> [(artigo, forma)]
TERMO_FORMAS = {
    "entalpiaFormacaoKJmol": HF_FORMAS,
    "energiaGibbsFormacaoKJmol": {
        "pt-BR": [("a", "energia livre de Gibbs de formação"), ("a", "energia livre de Gibbs padrão de formação"), ("o", "ΔG de formação"),
                  ("a", "energia de Gibbs de formação"), ("o", "Gibbs de formação"), ("a", "energia livre padrão de formação"), ("o", "ΔG° de formação")],
        "en": [("the", "standard Gibbs free energy of formation"), ("the", "Gibbs free energy of formation"), ("the", "Gibbs energy of formation"),
               ("the", "ΔG of formation"), ("the", "standard free energy of formation")],
        "es": [("la", "energía libre de Gibbs de formación"), ("la", "energía libre de Gibbs estándar de formación"), ("el", "ΔG de formación"),
               ("la", "energía de Gibbs de formación"), ("la", "energía libre estándar de formación")],
        "de": [("die", "freie Standardbildungsenthalpie"), ("die", "Gibbs-Energie der Bildung"), ("die", "freie Bildungsenthalpie"),
               ("die", "Gibbs-Bildungsenergie"), ("die", "freie Standardbildungsenergie")],
        "fr": [("l'", "enthalpie libre standard de formation"), ("l'", "enthalpie libre de formation"), ("l'", "énergie de Gibbs de formation"),
               ("l'", "énergie libre de Gibbs de formation")]},
    "entropiaPadraoJmolK": {
        "pt-BR": [("a", "entropia padrão"), ("a", "entropia molar padrão"), ("a", "entropia absoluta"), ("a", "entropia padrão molar"), ("o", "S°")],
        "en": [("the", "standard molar entropy"), ("the", "standard entropy"), ("the", "absolute entropy"), ("the", "molar entropy")],
        "es": [("la", "entropía molar estándar"), ("la", "entropía estándar"), ("la", "entropía absoluta")],
        "de": [("die", "Standardentropie"), ("die", "molare Standardentropie"), ("die", "absolute Entropie")],
        "fr": [("l'", "entropie molaire standard"), ("l'", "entropie standard"), ("l'", "entropie absolue")]},
}
TERMO_PESOS = {"entalpiaFormacaoKJmol": 45, "energiaGibbsFormacaoKJmol": 25, "entropiaPadraoJmolK": 30}
TERMO_UNIDADE = {"entalpiaFormacaoKJmol": ["kJ/mol"], "energiaGibbsFormacaoKJmol": ["kJ/mol"],
                 "entropiaPadraoJmolK": ["J/(mol·K)", "J/(mol·K)", "J/mol·K", "J/(K·mol)", "J mol⁻¹ K⁻¹"]}
# {u} unidade da propriedade; {neg} "mais negativo(a)" concordando com a forma ("comp_neg" só nas energias: S° padrão é sempre positiva)
HF = {
    "pt-BR": {"prop": ["{P} {c_de}", "Qual {p_art} {c_de}?", "Me diga {p_art} {c_de}", "{c}: {p}", "Quanto vale {p_art} {c_de}?", "Qual é {p_art} {c_de} em {u}?"],
              "comp": ["Qual tem maior {p}, {a} ou {b}?", "Compare {p_art} {a_de} e {b_de}", "Entre {a} e {b}, qual tem menor {p}?"],
              "comp_neg": ["{a} ou {b}: qual tem {p_art} {neg}?"]},
    "en": {"prop": ["{P} {c_de}", "What is {p_art} {c_de}?", "Tell me {p_art} {c_de}", "{c}: {p}", "{p_art} {c_de} in {u}"],
           "comp": ["Which has the higher {p}, {a} or {b}?", "Compare {p_art} {a_de} and {b_de}"],
           "comp_neg": ["{a} or {b}: which has the more negative {p}?"]},
    "es": {"prop": ["{P} {c_de}", "¿Cuál es {p_art} {c_de}?", "Dime {p_art} {c_de}", "{c}: {p}", "{P} {c_de} en {u}"],
           "comp": ["¿Cuál tiene mayor {p}, {a} o {b}?", "Compara {p_art} {a_de} y {b_de}"],
           "comp_neg": ["{a} o {b}: ¿cuál tiene {p_art} {neg}?"]},
    "de": {"prop": ["{P} {c_de}", "Wie groß ist {p_art} {c_de}?", "Nenne {p_art} {c_de}", "{c}: {p}", "{P} {c_de} in {u}"],
           "comp": ["Welches hat die höhere {p}, {a} oder {b}?", "Vergleiche {p_art} {a_de} und {b_de}"],
           "comp_neg": ["{a} oder {b}: welches hat die negativere {p}?"]},
    "fr": {"prop": ["{P} {c_de}", "Quelle est {p_art} {c_de} ?", "Donne-moi {p_art} {c_de}", "{c} : {p}", "{P} {c_de} en {u}"],
           "comp": ["Lequel a la plus grande {p}, {a} ou {b} ?", "Compare {p_art} {a_de} et {b_de}"],
           "comp_neg": ["{a} ou {b} : lequel a {p_art} {neg} ?"]},
}
NEG = {"pt-BR": {"o": "mais negativo", "a": "mais negativa"}, "es": {"el": "más negativo", "la": "más negativa"},
       "fr": {"le": "le plus négatif", "la": "la plus négative", "l'": "la plus négative"}}
CONTRASTE = {  # definições -> CONCEITO (não é cálculo: a pergunta não traz composto, equação nem par de elementos)
    "pt-BR": ["O que é entalpia?", "O que é número de oxidação?", "O que é NOX?", "O que é ligação iônica?", "O que é ligação covalente?", "O que é constante de equilíbrio?",
              "O que diz a lei de Hess?", "O que é entalpia de formação?", "Explique o que é ligação metálica", "O que significa reação exotérmica?",
              "Para que serve o Kc?", "O que é equilíbrio químico?", "Explique a diferença entre ligação polar e apolar", "O que é estado de oxidação?",
              "O que é entropia?", "O que é energia livre de Gibbs?", "O que significa ΔG negativo?", "O que é entropia padrão?", "Explique a energia de Gibbs",
              "Qual a diferença entre entalpia e entropia?", "O que mede a entropia?", "O que é uma reação espontânea?"],
    "en": ["What is enthalpy?", "What is an oxidation number?", "What is an ionic bond?", "What is a covalent bond?", "What is an equilibrium constant?",
           "What does Hess's law say?", "What is enthalpy of formation?", "Explain metallic bonding", "What does exothermic mean?", "What is chemical equilibrium?",
           "What is entropy?", "What is Gibbs free energy?", "What does a negative ΔG mean?", "What is standard entropy?", "Explain Gibbs energy",
           "What is the difference between enthalpy and entropy?"],
    "es": ["¿Qué es la entalpía?", "¿Qué es el número de oxidación?", "¿Qué es un enlace iónico?", "¿Qué es un enlace covalente?", "¿Qué es la constante de equilibrio?",
           "¿Qué dice la ley de Hess?", "Explica el enlace metálico", "¿Qué es el equilibrio químico?", "¿Qué es la entropía?", "¿Qué es la energía libre de Gibbs?",
           "¿Qué significa un ΔG negativo?", "Explica la entropía estándar"],
    "de": ["Was ist Enthalpie?", "Was ist eine Oxidationszahl?", "Was ist eine Ionenbindung?", "Was ist eine kovalente Bindung?", "Was ist die Gleichgewichtskonstante?",
           "Was besagt der Satz von Hess?", "Erkläre die Metallbindung", "Was ist ein chemisches Gleichgewicht?", "Was ist Entropie?", "Was ist die Gibbs-Energie?",
           "Was ist die freie Enthalpie?", "Was bedeutet ein negatives ΔG?"],
    "fr": ["Qu'est-ce que l'enthalpie ?", "Qu'est-ce qu'un nombre d'oxydation ?", "Qu'est-ce qu'une liaison ionique ?", "Qu'est-ce qu'une liaison covalente ?",
           "Qu'est-ce que la constante d'équilibre ?", "Que dit la loi de Hess ?", "Explique la liaison métallique", "Qu'est-ce que l'équilibre chimique ?",
           "Qu'est-ce que l'entropie ?", "Qu'est-ce que l'enthalpie libre ?", "Qu'est-ce que l'énergie de Gibbs ?", "Que signifie un ΔG négatif ?"],
}

# EQUILIBRIO sem equação (18/10/2026) -> CONCEITO: sem a reação não há Kc/Kp a montar; {T} temperatura em dígitos (não vai no rótulo)
EQM_CONCEITO = {
    "pt-BR": ["Como calcular o Kc?", "O que é Kc?", "O que é Kp?", "Qual o Kp a {T}?", "fórmula da constante de equilíbrio", "Calcule o Kc da reação",
              "Como se calcula o Kp?", "Qual a diferença entre Kc e Kp?", "Como converter Kc em Kp?", "fórmula de Kp em função de Kc", "O que significa um Kc muito grande?",
              "Como montar a expressão do Kc?", "Kc depende da temperatura?", "Calcule o Kc", "Qual o valor do Kc a {T}?", "Como achar a constante de equilíbrio de uma reação?",
              "o que é constante de equilíbrio em termos de pressão", "Qual a fórmula do Kc?", "Como calcular o Kp a {T}?", "Por que sólidos não entram no Kc?"],
    "en": ["How do I calculate Kc?", "What is Kc?", "What is Kp?", "What is Kp at {T}?", "formula for the equilibrium constant", "Calculate the Kc of the reaction",
           "How is Kp calculated?", "What is the difference between Kc and Kp?", "How do I convert Kc to Kp?", "Kp in terms of Kc formula", "What does a large Kc mean?",
           "How do I write the Kc expression?", "Does Kc depend on temperature?", "Calculate Kc", "Why are solids left out of Kc?"],
    "es": ["¿Cómo se calcula el Kc?", "¿Qué es Kc?", "¿Qué es Kp?", "¿Cuál es el Kp a {T}?", "fórmula de la constante de equilibrio", "Calcula el Kc de la reacción",
           "¿Cómo se calcula el Kp?", "¿Qué diferencia hay entre Kc y Kp?", "¿Cómo convertir Kc en Kp?", "¿Qué significa un Kc muy grande?", "¿El Kc depende de la temperatura?",
           "Calcula el Kc"],
    "de": ["Wie berechnet man Kc?", "Was ist Kc?", "Was ist Kp?", "Wie groß ist Kp bei {T}?", "Formel der Gleichgewichtskonstante", "Berechne das Kc der Reaktion",
           "Wie berechnet man Kp?", "Was ist der Unterschied zwischen Kc und Kp?", "Wie rechnet man Kc in Kp um?", "Was bedeutet ein großes Kc?",
           "Hängt Kc von der Temperatur ab?", "Berechne Kc"],
    "fr": ["Comment calculer le Kc ?", "Qu'est-ce que le Kc ?", "Qu'est-ce que le Kp ?", "Quel est le Kp à {T} ?", "formule de la constante d'équilibre",
           "Calcule le Kc de la réaction", "Comment calcule-t-on le Kp ?", "Quelle est la différence entre Kc et Kp ?", "Comment convertir Kc en Kp ?",
           "Que signifie un Kc très grand ?", "Le Kc dépend-il de la température ?", "Calcule le Kc"],
}
EQM_CONCEITO_FRACAO = 0.30  # sorteio; ~25 % depois de tirar as repetidas

# PARTICULAS (18/10/2026): prótons = Z, elétrons = Z − carga, nêutrons = A − Z; o rótulo leva só elemento + propriedade (carga e A ficam no texto,
# lidos pelo cliente). {x} a espécie (sujeito/objeto, com artigo onde a língua pede), {x_de} com a preposição ("do ferro", "of the Fe2+ ion", "von Fe2+").
PART = {
    "pt-BR": {"todos": ["Quantos prótons, nêutrons e elétrons tem {x}?", "prótons, nêutrons e elétrons {x_de}", "partículas {x_de}", "Quais as partículas subatômicas {x_de}?",
                        "número de prótons, nêutrons e elétrons {x_de}", "Calcule prótons, nêutrons e elétrons {x_de}", "Quantas partículas de cada tipo tem {x}?",
                        "Determine o número de prótons, elétrons e nêutrons {x_de}"],
              "p": ["Quantos prótons tem {x}?", "número de prótons {x_de}", "Quantos prótons há no núcleo {x_de}?", "prótons {x_de}", "Qual o número de prótons {x_de}?"],
              "n": ["Quantos nêutrons tem {x}?", "número de nêutrons {x_de}", "Calcule o número de nêutrons {x_de}", "nêutrons {x_de}", "Quantos nêutrons possui {x}?"],
              "e": ["Quantos elétrons tem {x}?", "número de elétrons {x_de}", "Quantos elétrons possui {x}?", "elétrons {x_de}", "Qual o número de elétrons {x_de}?"],
              "A": ["número de massa {x_de}", "Qual o número de massa {x_de}?", "Qual é o número de massa (A) {x_de}?"]},
    "en": {"todos": ["How many protons, neutrons and electrons does {x} have?", "protons, neutrons and electrons {x_de}", "subatomic particles {x_de}",
                     "number of protons, neutrons and electrons {x_de}", "Find the protons, neutrons and electrons {x_de}"],
           "p": ["How many protons does {x} have?", "number of protons {x_de}", "How many protons are in the nucleus {x_de}?", "protons {x_de}"],
           "n": ["How many neutrons does {x} have?", "number of neutrons {x_de}", "neutrons {x_de}", "Calculate the number of neutrons {x_de}"],
           "e": ["How many electrons does {x} have?", "number of electrons {x_de}", "electrons {x_de}", "How many electrons has {x} got?"],
           "A": ["mass number {x_de}", "What is the mass number {x_de}?"]},
    "es": {"todos": ["¿Cuántos protones, neutrones y electrones tiene {x}?", "protones, neutrones y electrones {x_de}", "partículas subatómicas {x_de}",
                     "número de protones, neutrones y electrones {x_de}", "Calcula los protones, neutrones y electrones {x_de}"],
           "p": ["¿Cuántos protones tiene {x}?", "número de protones {x_de}", "protones {x_de}"],
           "n": ["¿Cuántos neutrones tiene {x}?", "número de neutrones {x_de}", "neutrones {x_de}"],
           "e": ["¿Cuántos electrones tiene {x}?", "número de electrones {x_de}", "electrones {x_de}"],
           "A": ["número de masa {x_de}", "¿Cuál es el número de masa {x_de}?"]},
    "de": {"todos": ["Wie viele Protonen, Neutronen und Elektronen hat {x}?", "Protonen, Neutronen und Elektronen {x_de}", "Elementarteilchen {x_de}",
                     "Anzahl der Protonen, Neutronen und Elektronen {x_de}", "Bestimme Protonen, Neutronen und Elektronen {x_de}"],
           "p": ["Wie viele Protonen hat {x}?", "Anzahl der Protonen {x_de}", "Protonen {x_de}"],
           "n": ["Wie viele Neutronen hat {x}?", "Anzahl der Neutronen {x_de}", "Neutronenzahl {x_de}"],
           "e": ["Wie viele Elektronen hat {x}?", "Anzahl der Elektronen {x_de}", "Elektronenzahl {x_de}"],
           "A": ["Massenzahl {x_de}", "Wie groß ist die Massenzahl {x_de}?", "Welche Massenzahl hat {x}?"]},
    "fr": {"todos": ["Combien de protons, de neutrons et d'électrons a {x} ?", "protons, neutrons et électrons {x_de}", "particules subatomiques {x_de}",
                     "nombre de protons, de neutrons et d'électrons {x_de}", "Calcule les protons, neutrons et électrons {x_de}"],
           "p": ["Combien de protons a {x} ?", "nombre de protons {x_de}", "protons {x_de}"],
           "n": ["Combien de neutrons a {x} ?", "nombre de neutrons {x_de}", "neutrons {x_de}"],
           "e": ["Combien d'électrons a {x} ?", "nombre d'électrons {x_de}", "Combien d'électrons possède {x} ?", "électrons {x_de}"],
           "A": ["nombre de masse {x_de}", "Quel est le nombre de masse {x_de} ?"]},
}
# Contrastes da família (~15 %): elétrons de VALÊNCIA -> configuracaoEletronica; número atômico -> numeroAtomico ({el}, {el_de}; {p_art}/{P} do léxico)
PART_CONTRASTE = {
    "pt-BR": {"cfg": ["número de elétrons de valência {el_de}", "Quantos elétrons de valência tem {el}?", "elétrons na última camada {el_de}"],
              "z": ["Qual {p_art} {el_de}?", "{P} {el_de}"]},
    "en": {"cfg": ["number of valence electrons in {el}", "How many electrons are in the outer shell of {el}?"], "z": ["What is {p_art} {el_de}?", "{P} {el_de}"]},
    "es": {"cfg": ["número de electrones de valencia {el_de}", "¿Cuántos electrones hay en la última capa {el_de}?"], "z": ["¿Cuál es {p_art} {el_de}?", "{P} {el_de}"]},
    "de": {"cfg": ["Anzahl der Valenzelektronen {el_de}", "Wie viele Elektronen hat {el} auf der äußersten Schale?"], "z": ["Wie lautet {p_art} {el_de}?", "{P} {el_de}"]},
    "fr": {"cfg": ["nombre d'électrons de valence {el_de}", "Combien d'électrons sur la couche externe {el_de} ?"], "z": ["Quel est {p_art} {el_de} ?", "{P} {el_de}"]},
}
# palavras da espécie: (íon, cátion, ânion, isótopo, átomo de); de: nominativo e "von"-forma
PART_PALAVRAS = {
    "pt-BR": {"ion": "íon", "cat": "cátion", "an": "ânion", "iso": "isótopo", "atomo": "átomo de"},
    "en": {"ion": "ion", "cat": "cation", "an": "anion", "iso": "isotope", "atomo": "atom"},
    "es": {"ion": "ion", "cat": "catión", "an": "anión", "iso": "isótopo", "atomo": "átomo de"},
    "de": {"ion": "Ion", "cat": "Kation", "an": "Anion", "iso": "Isotop", "atomo": "Atom"},
    "fr": {"ion": "ion", "cat": "cation", "an": "anion", "iso": "isotope", "atomo": "atome de"},
}
# números de massa de isótopos conhecidos (fatos de tabela de nuclídeos); fora daqui vale a massa atômica do pacote arredondada
ISOTOPOS = {"H": [1, 2, 3], "He": [3, 4], "Li": [6, 7], "B": [10, 11], "C": [12, 13, 14], "N": [14, 15], "O": [16, 17, 18], "F": [19], "Ne": [20, 22],
            "Na": [23], "Mg": [24, 25, 26], "Al": [27], "Si": [28, 29, 30], "P": [31, 32], "S": [32, 34], "Cl": [35, 37], "Ar": [40], "K": [39, 40, 41],
            "Ca": [40, 44], "Fe": [54, 56, 57, 58], "Co": [59, 60], "Ni": [58, 60], "Cu": [63, 65], "Zn": [64, 66], "Br": [79, 81], "Sr": [88, 90],
            "Ag": [107, 109], "I": [127, 131], "Cs": [133, 137], "Au": [197], "Hg": [200, 202], "Pb": [206, 207, 208], "Rn": [222], "Ra": [226],
            "Th": [232], "U": [234, 235, 238], "Pu": [239], "Am": [241], "Tc": [99]}

# Quantidades (notação e extenso): {qm} massa, {qn} mols, {qv} volume, {qc} concentração, {q} conversão + {u} destino, {T}/{P} em dígitos. de: {qn_dat}/{qv_dat}.
QT = {
    "pt-BR": {"ESTEQ_m": ["Quantos mols há em {qm} de {c}?", "Converta {qm} de {c} em mols", "{qm} de {c} correspondem a quantos mols?", "Quantas moléculas há em {qm} de {c}?"],
              "ESTEQ_n": ["Qual a massa de {qn} de {c}?", "massa de {qn} de {c}", "Quanto pesa {qn} de {c}?", "Quantas moléculas há em {qn} de {c}?",
                          "Quantos gramas há em {qn} de {c}?", "Qual o volume de {qn} de {c} nas CNTP?", "Quantos átomos há em {qn} de {el}?"],
              "CONC": ["Qual a concentração de {qn} de {c} em {qv}?", "Dissolvi {qn} de {c} em {qv}. Qual a molaridade?", "molaridade de {qm} de {c} em {qv}",
                       "Qual a concentração em g/L de {qm} de {c} em {qv}?"],
              "PH": ["Qual o pH de uma solução {qc} de {c}?", "pH de {c} {qc}", "Calcule o pH de {c} a {qc}"],
              "CONV": ["Converta {q} para {u}", "Quanto é {q} em {u}?", "Passe {q} para {u}", "{q} em {u}", "Quantos {u} são {q}?"],
              "GAS": ["Qual o volume de {qn} de gás a {T} e {P}?", "Que pressão exercem {qn} de gás em {qv} a {T}?"]},
    "en": {"ESTEQ_m": ["How many moles are in {qm} of {c}?", "Convert {qm} of {c} to moles", "How many molecules are in {qm} of {c}?"],
           "ESTEQ_n": ["What is the mass of {qn} of {c}?", "mass of {qn} of {c}", "How much does {qn} of {c} weigh?", "How many molecules are in {qn} of {c}?",
                       "How many grams are in {qn} of {c}?", "How many atoms are in {qn} of {el}?"],
           "CONC": ["What is the concentration of {qn} of {c} in {qv}?", "I dissolved {qn} of {c} in {qv}. What is the molarity?", "molarity of {qm} of {c} in {qv}"],
           "PH": ["What is the pH of a {qc} solution of {c}?", "pH of {c} at {qc}"],
           "CONV": ["Convert {q} to {u}", "What is {q} in {u}?", "{q} in {u}", "How many {u} is {q}?"],
           "GAS": ["What volume do {qn} of gas occupy at {T} and {P}?", "What pressure do {qn} of gas exert in {qv} at {T}?"]},
    "es": {"ESTEQ_m": ["¿Cuántos moles hay en {qm} de {c}?", "Convierte {qm} de {c} a moles", "¿Cuántas moléculas hay en {qm} de {c}?"],
           "ESTEQ_n": ["¿Cuál es la masa de {qn} de {c}?", "masa de {qn} de {c}", "¿Cuánto pesa {qn} de {c}?", "¿Cuántas moléculas hay en {qn} de {c}?",
                       "¿Cuántos gramos hay en {qn} de {c}?", "¿Cuántos átomos hay en {qn} de {el}?"],
           "CONC": ["¿Cuál es la concentración de {qn} de {c} en {qv}?", "Disolví {qn} de {c} en {qv}. ¿Cuál es la molaridad?", "molaridad de {qm} de {c} en {qv}"],
           "PH": ["¿Cuál es el pH de una solución {qc} de {c}?", "pH de {c} a {qc}"],
           "CONV": ["Convierte {q} a {u}", "¿Cuánto es {q} en {u}?", "{q} en {u}", "Pasa {q} a {u}"],
           "GAS": ["¿Qué volumen ocupan {qn} de gas a {T} y {P}?"]},
    "de": {"ESTEQ_m": ["Wie viele Mol sind {qm} {c}?", "Rechne {qm} {c} in Mol um", "Wie viele Moleküle sind in {qm} {c}?"],
           "ESTEQ_n": ["Welche Masse hat {qn} {c}?", "Masse von {qn_dat} {c}", "Wie viel wiegt {qn} {c}?", "Wie viele Moleküle sind in {qn_dat} {c}?",
                       "Wie viele Gramm sind {qn} {c}?", "Wie viele Atome sind in {qn_dat} {el}?"],
           "CONC": ["Welche Konzentration haben {qn} {c} in {qv_dat}?", "Ich löse {qn} {c} in {qv_dat}. Wie groß ist die Molarität?", "Molarität von {qm} {c} in {qv_dat}"],
           "PH": ["Welchen pH-Wert hat eine {qc} Lösung von {c}?", "pH-Wert von {c} bei {qc}"],
           "CONV": ["Rechne {q} in {u} um", "Wie viel sind {q} in {u}?", "{q} in {u}"],
           "GAS": ["Welches Volumen nehmen {qn} Gas bei {T} und {P} ein?"]},
    "fr": {"ESTEQ_m": ["Combien de moles y a-t-il dans {qm} de {c} ?", "Convertis {qm} de {c} en moles", "Combien de molécules y a-t-il dans {qm} de {c} ?"],
           "ESTEQ_n": ["Quelle est la masse de {qn} de {c} ?", "masse de {qn} de {c}", "Combien pèse {qn} de {c} ?", "Combien de molécules y a-t-il dans {qn} de {c} ?",
                       "Combien de grammes y a-t-il dans {qn} de {c} ?", "Combien d'atomes y a-t-il dans {qn} de {el} ?"],
           "CONC": ["Quelle est la concentration de {qn} de {c} dans {qv} ?", "J'ai dissous {qn} de {c} dans {qv}. Quelle est la molarité ?", "molarité de {qm} de {c} dans {qv}"],
           "PH": ["Quel est le pH d'une solution {qc} de {c} ?", "pH de {c} à {qc}"],
           "CONV": ["Convertis {q} en {u}", "Combien font {q} en {u} ?", "{q} en {u}"],
           "GAS": ["Quel volume occupent {qn} de gaz à {T} et {P} ?"]},
}
QT_INTENT = {"ESTEQ_m": "ESTEQUIOMETRIA", "ESTEQ_n": "ESTEQUIOMETRIA", "CONC": "CONCENTRACAO", "PH": "PH", "CONV": "CONVERSAO_UNIDADE", "GAS": "GAS_IDEAL"}
# ESTEQUIOMETRIA sem "quantos": {p} produto cru, {r} reagente cru, {q} quantidade do reagente; {eq} equação (opcional)
FORMADA = {
    "pt-BR": {"geral": ["Qual a massa de {p} formada a partir de {q} de {r}?", "massa de {p} produzida a partir de {q} de {r}", "Que massa de {p} se obtém com {q} de {r}?",
                        "Quanto {p} se forma com {q} de {r}?", "Calcule a massa de {p} produzida por {q} de {r}", "A partir de {q} de {r}, que massa de {p} é formada?",
                        "{q} de {r} reagem. Qual a massa de {p} formada?", "Quanto de {p} é produzido quando {q} de {r} reagem?", "massa de {p} que se forma a partir de {q} de {r}",
                        "Na reação {eq}, que massa de {p} se forma a partir de {q} de {r}?"],
              "combustao": ["Quanto de {p} se forma na queima de {q} de {r}?", "massa de {p} liberada na combustão de {q} de {r}", "Na queima de {q} de {r}, que massa de {p} sai?"],
              "decomposicao": ["massa de {p} obtida na decomposição de {q} de {r}", "Que massa de {p} sai da decomposição de {q} de {r}?"]},
    "en": {"geral": ["What mass of {p} is formed from {q} of {r}?", "mass of {p} produced from {q} of {r}", "How much {p} forms from {q} of {r}?",
                     "Calculate the mass of {p} produced by {q} of {r}", "Starting from {q} of {r}, what mass of {p} is formed?", "In the reaction {eq}, what mass of {p} forms from {q} of {r}?"],
           "combustao": ["How much {p} is produced when {q} of {r} burns?", "mass of {p} released by burning {q} of {r}"],
           "decomposicao": ["mass of {p} obtained by decomposing {q} of {r}"]},
    "es": {"geral": ["¿Qué masa de {p} se forma a partir de {q} de {r}?", "masa de {p} producida a partir de {q} de {r}", "¿Cuánto {p} se forma con {q} de {r}?",
                     "Calcula la masa de {p} producida por {q} de {r}", "En la reacción {eq}, ¿qué masa de {p} se forma a partir de {q} de {r}?"],
           "combustao": ["¿Cuánto {p} se produce al quemar {q} de {r}?", "masa de {p} liberada en la combustión de {q} de {r}"],
           "decomposicao": ["masa de {p} obtenida al descomponer {q} de {r}"]},
    "de": {"geral": ["Welche Masse {p} entsteht aus {q} {r}?", "Masse an {p}, die aus {q} {r} gebildet wird", "Wie viel {p} entsteht aus {q} {r}?",
                     "Berechne die Masse {p}, die {q} {r} liefern", "Bei der Reaktion {eq}: welche Masse {p} entsteht aus {q} {r}?"],
           "combustao": ["Wie viel {p} entsteht beim Verbrennen von {q} {r}?", "Masse {p} bei der Verbrennung von {q} {r}"],
           "decomposicao": ["Masse {p} aus der Zersetzung von {q} {r}"]},
    "fr": {"geral": ["Quelle masse de {p} est formée à partir de {q} de {r} ?", "masse de {p} produite à partir de {q} de {r}", "Combien de {p} se forme avec {q} de {r} ?",
                     "Calcule la masse de {p} produite par {q} de {r}", "Dans la réaction {eq}, quelle masse de {p} se forme à partir de {q} de {r} ?"],
           "combustao": ["Combien de {p} se forme en brûlant {q} de {r} ?", "masse de {p} libérée par la combustion de {q} de {r}"],
           "decomposicao": ["masse de {p} obtenue par la décomposition de {q} de {r}"]},
}
# NOMENCLATURA com nome sistemático do pacote: {n} cru, {N} com artigo (pt/es/fr)
NOMEN = {
    "pt-BR": ["Como se chama {N}?", "Qual o nome usual {n_de}?", "Que substância é {N}?", "{n} é o nome IUPAC de qual substância?", "Qual o nome comum {n_de}?",
              "{N} é conhecido por qual nome?", "Que composto é {N}?", "Dê o nome popular {n_de}", "{n}: que substância é essa?", "Como é chamado {N} no dia a dia?"],
    "en": ["What is {n} called?", "What substance is {n}?", "What is the common name of {n}?", "{n} is the IUPAC name of what?", "What compound is {n}?",
           "Which substance has the IUPAC name {n}?", "{n}: what is it commonly called?", "Give the usual name of {n}"],
    "es": ["¿Cómo se llama {N}?", "¿Qué sustancia es {N}?", "¿Cuál es el nombre común {n_de}?", "{n} es el nombre IUPAC de qué sustancia?", "¿Qué compuesto es {N}?",
           "Dame el nombre usual {n_de}"],
    "de": ["Wie heißt {n} umgangssprachlich?", "Welcher Stoff ist {n}?", "Wie lautet der Trivialname von {n}?", "{n} ist der IUPAC-Name welcher Substanz?",
           "Welche Verbindung ist {n}?", "Nenne den gebräuchlichen Namen von {n}"],
    "fr": ["Comment s'appelle {N} ?", "Quelle substance est {N} ?", "Quel est le nom usuel {n_de} ?", "{n} est le nom IUPAC de quelle substance ?", "Quel composé est {N} ?",
           "Donne le nom courant {n_de}"],
}
# misturas (palavras do dia a dia, escritas aqui): sujeito com artigo; pares crus; nível opcional
MISTURAS = {
    "pt-BR": ["o leite", "o ar", "a água do mar", "o sangue", "o granito", "a gasolina", "o vinagre", "o refrigerante", "a maionese", "o bronze", "o aço", "o latão",
              "o suco de laranja", "a fumaça", "a neblina", "a gelatina", "o café", "o soro fisiológico", "o concreto", "o petróleo", "a água mineral", "o chá",
              "a tinta", "o iogurte", "a areia da praia", "o ar poluído", "o sorvete", "o mel", "o gelo", "o diamante", "o ouro 18 quilates", "a água da torneira"],
    "en": ["milk", "air", "seawater", "blood", "granite", "gasoline", "vinegar", "soda", "mayonnaise", "bronze", "steel", "brass", "orange juice", "smoke", "fog",
           "coffee", "saline solution", "concrete", "crude oil", "mineral water", "tea", "paint", "yogurt", "beach sand", "honey", "ice", "diamond", "tap water"],
    "es": ["la leche", "el aire", "el agua de mar", "la sangre", "el granito", "la gasolina", "el vinagre", "el refresco", "la mayonesa", "el bronce", "el acero",
           "el latón", "el zumo de naranja", "el humo", "la niebla", "el café", "el suero fisiológico", "el hormigón", "el petróleo", "el agua mineral", "el té", "la miel",
           "el hielo", "el diamante", "el agua del grifo"],
    "de": ["Milch", "Luft", "Meerwasser", "Blut", "Granit", "Benzin", "Essig", "Limonade", "Mayonnaise", "Bronze", "Stahl", "Messing", "Orangensaft", "Rauch",
           "Nebel", "Kaffee", "Kochsalzlösung", "Beton", "Erdöl", "Mineralwasser", "Tee", "Honig", "Eis", "Diamant", "Leitungswasser"],
    "fr": ["le lait", "l'air", "l'eau de mer", "le sang", "le granite", "l'essence", "le vinaigre", "le soda", "la mayonnaise", "le bronze", "l'acier", "le laiton",
           "le jus d'orange", "la fumée", "le brouillard", "le café", "le sérum physiologique", "le béton", "le pétrole", "l'eau minérale", "le thé", "le miel",
           "la glace", "le diamant", "l'eau du robinet"],
}
PARES = {
    "pt-BR": [("água", "óleo"), ("água", "areia"), ("água", "álcool"), ("óleo", "vinagre"), ("areia", "limalha de ferro"), ("água", "açúcar"), ("água", "gasolina"),
              ("água", "serragem"), ("leite", "café"), ("água", "gelo"), ("ar", "poeira"), ("água", "sal de cozinha"), ("arroz", "feijão")],
    "en": [("water", "oil"), ("water", "sand"), ("water", "alcohol"), ("oil", "vinegar"), ("sand", "iron filings"), ("water", "sugar"), ("water", "gasoline"),
           ("water", "sawdust"), ("milk", "coffee"), ("water", "ice"), ("rice", "beans")],
    "es": [("agua", "aceite"), ("agua", "arena"), ("agua", "alcohol"), ("aceite", "vinagre"), ("arena", "limaduras de hierro"), ("agua", "azúcar"), ("agua", "hielo")],
    "de": [("Wasser", "Öl"), ("Wasser", "Sand"), ("Wasser", "Alkohol"), ("Öl", "Essig"), ("Sand", "Eisenspäne"), ("Wasser", "Zucker"), ("Wasser", "Eis")],
    "fr": [("eau", "huile"), ("eau", "sable"), ("eau", "alcool"), ("huile", "vinaigre"), ("sable", "limaille de fer"), ("eau", "sucre"), ("eau", "glace")],
}
MIST = {  # (molde, nível)
    "pt-BR": [("{X} é uma mistura ou uma substância pura?", None), ("{X} é substância pura ou mistura?", None), ("{X} é mistura homogênea ou heterogênea?", None),
              ("{X} é uma mistura homogênea?", None), ("Classifique {x}: substância pura, mistura homogênea ou heterogênea", None),
              ("{a} e {b} é que tipo de mistura?", None), ("{a} com {b} forma mistura homogênea ou heterogênea?", None), ("Quantas fases tem {a} com {b}?", None),
              ("Juntando {a} e {b}, a mistura é homogênea ou heterogênea?", None), ("{X} é mistura ou substância? Explique para o ensino fundamental", "fundamental"),
              ("Para o ENEM: {x} é uma mistura homogênea?", "medio"), ("{X} é substância pura? Explique como se eu tivesse 10 anos", "fundamental"),
              ("{C} é uma substância pura ou uma mistura?", None)],
    "en": [("Is {x} a mixture or a pure substance?", None), ("Is {x} a homogeneous or heterogeneous mixture?", None), ("Is {x} a homogeneous mixture?", None),
           ("Classify {x}: pure substance, homogeneous or heterogeneous mixture", None), ("What kind of mixture is {a} and {b}?", None),
           ("Do {a} and {b} form a homogeneous or heterogeneous mixture?", None), ("How many phases does {a} with {b} have?", None),
           ("Is {x} a mixture? Explain it for middle school", "fundamental"), ("Is {c} a pure substance or a mixture?", None)],
    "es": [("¿{X} es una mezcla o una sustancia pura?", None), ("¿{X} es una mezcla homogénea o heterogénea?", None), ("Clasifica {x}: sustancia pura o mezcla", None),
           ("¿Qué tipo de mezcla es {a} con {b}?", None), ("¿{a} y {b} forman una mezcla homogénea o heterogénea?", None), ("¿Cuántas fases tiene {a} con {b}?", None),
           ("¿{C} es una sustancia pura o una mezcla?", None)],
    "de": [("Ist {x} ein Gemisch oder ein Reinstoff?", None), ("Ist {x} ein homogenes oder heterogenes Gemisch?", None), ("Ist {x} ein homogenes Gemisch?", None),
           ("Was für ein Gemisch sind {a} und {b}?", None), ("Bilden {a} und {b} ein homogenes oder heterogenes Gemisch?", None),
           ("Wie viele Phasen hat {a} mit {b}?", None), ("Ist {c} ein Reinstoff oder ein Gemisch?", None)],
    "fr": [("Est-ce que {x} est un mélange ou un corps pur ?", None), ("{X} : mélange homogène ou hétérogène ?", None), ("Classe {x} : corps pur ou mélange", None),
           ("Quel type de mélange forment {a} et {b} ?", None), ("{a} et {b} forment-ils un mélange homogène ou hétérogène ?", None),
           ("Combien de phases a {a} avec {b} ?", None), ("{C} : corps pur ou mélange ?", None)],
}
# ordenação: {lista}, {p} forma crua, {p_art}, {pelo_p} (pt) — elemento/composto do rótulo = o primeiro da lista
ORD = {
    "pt-BR": ["Ordem crescente de {p} de {lista}", "Coloque em ordem decrescente de {p}: {lista}", "Ordene {lista} {pelo_p}", "Ordene {lista} em ordem crescente de {p}",
              "Qual a ordem crescente de {p} entre {lista}?", "Organize {lista} do maior para o menor valor de {p}", "{lista}: ordene {pelo_p}",
              "Classifique {lista} em ordem decrescente de {p}", "Em ordem crescente de {p}, como ficam {lista}?", "Disponha {lista} do menor para o maior valor de {p}",
              "sequência de {p} de {lista}, do maior para o menor"],
    "en": ["Increasing order of {p} for {lista}", "Arrange {lista} in decreasing order of {p}", "Order {lista} by {p}", "Rank {lista} from highest to lowest {p}",
           "Put {lista} in order of increasing {p}", "{lista}: sort by {p}", "Sort {lista} by {p}, lowest first"],
    "es": ["Orden creciente de {p} de {lista}", "Ordena {lista} de mayor a menor {p}", "Ordena {lista} por {p}", "Coloca {lista} en orden decreciente de {p}",
           "{lista}: ordénalos por {p}"],
    "de": ["Ordne {lista} nach {p}", "Sortiere {lista} nach {p}, vom kleinsten zum größten", "Reihenfolge der {p} von {lista}", "Bringe {lista} in eine Reihenfolge nach {p}",
           "{lista}: nach {p} sortieren"],
    "fr": ["Ordre croissant de {p} de {lista}", "Classe {lista} par {p} décroissante", "Range {lista} selon {p_art}", "Classe {lista} selon {p_art}, de la plus grande à la plus petite valeur",
           "{lista} : classe-les selon {p_art}"],
}
CONFIG = {  # pistas de configuração eletrônica (CALCULADORAS §1): continuam PROPRIEDADE + configuracaoEletronica
    "pt-BR": ["elétrons de valência {el_de}", "camada de valência {el_de}", "diagrama de Linus Pauling {el_de}", "distribuição eletrônica {el_de}",
              "Faça a distribuição eletrônica {el_de}", "camadas eletrônicas {el_de}", "subnível mais energético {el_de}", "Quantos elétrons {el} tem na camada de valência?",
              "distribuição dos elétrons por camadas {el_de}", "Qual a distribuição em subníveis {el_de}?", "Como ficam os elétrons {el_de} nas camadas K, L, M?"],
    "en": ["valence electrons of {el}", "valence shell of {el}", "How many valence electrons does {el} have?", "electron shells of {el}",
           "highest energy sublevel of {el}", "electron distribution of {el} by shell", "orbital filling diagram of {el}"],
    "es": ["electrones de valencia {el_de}", "capa de valencia {el_de}", "distribución electrónica {el_de}", "¿Cuántos electrones de valencia tiene {el}?",
           "diagrama de Moeller {el_de}", "subnivel más energético {el_de}"],
    "de": ["Valenzelektronen {el_de}", "Valenzschale {el_de}", "Elektronenverteilung {el_de}", "Wie viele Valenzelektronen hat {el}?", "Schalenbesetzung {el_de}",
           "Elektronenschalen {el_de}"],
    "fr": ["électrons de valence {el_de}", "couche de valence {el_de}", "répartition électronique {el_de}", "Combien d'électrons de valence a {el} ?",
           "diagramme de Klechkowski {el_de}", "couches électroniques {el_de}"],
}
PROP_ORD_EL = ["eletronegatividade", "raioAtomicoPm", "energiaIonizacaoKJmol", "numeroAtomico", "massaAtomica", "pontoFusaoK", "pontoEbulicaoK", "densidadeKgm3",
               "afinidadeEletronicaKJmol"]
PROP_ORD_CO = ["pontoEbulicaoK", "pontoFusaoK", "massaMolar", "densidadeKgm3"]

COTAS = {  # (pt-BR, outros idiomas) com escala 1.0
    "nox": (110, 80), "entalpia": (110, 80), "equilibrio": (130, 80), "ligacao": (100, 70), "entalpia_formacao": (160, 90),
    "configuracao": (90, 50), "particulas": (130, 70), "notacao": (200, 85), "extenso": (200, 85), "esteq_formada": (200, 80), "nomenclatura_nome": (190, 70), "mistura": (200, 80), "ordenacao": (200, 85),
}
FAMILIAS = list(COTAS)


# =========================================================================================================
class Gerador:
    def __init__(self, pac, idioma, rng, ds):
        self.pac, self.idioma, self.rng = pac, idioma, rng
        comum, _pacote, vocab, gn = ds
        self.gn = gn
        self.L = v34.Lingua(idioma, comum, vocab, rng)
        self.E = v34.Entidades(pac, idioma, rng)
        todos = self.E.cotidiano + self.E.geral
        self.p_nox = [x for x in todos if gn.formula_inorganica_simples(x[0].get("formula"), pac)]
        self.p_comb = [x for x in self.E.cotidiano if gn.combustivel(x[0].get("formula"))] or [x for x in todos if gn.combustivel(x[0].get("formula"))]
        self.p_comb_geral = [x for x in self.E.geral if gn.combustivel(x[0].get("formula"))]
        self.p_lig = [x for x in todos if 2 <= len(gn.elementos_da_formula(x[0].get("formula"))) and len(x[0].get("formula") or "") <= 9]
        self.ions = gn.ions_do_pacote(pac)
        self.eq_eqm = gn.equacoes_balanceadas(sem_parenteses=True, max_especies=4, excluir_tipos=("combustao",))  # cabe em max_length 256
        self.eq_bal = gn.equacoes_balanceadas()
        self.tipo_eq = {}
        for tipo, eq in gn.equacoes.lista_equacoes():
            self.tipo_eq[eq] = tipo
        self.el_lig = [(e, n) for e, n in self.E.elementos if e.get("eletronegatividade") is not None and e.get("categoria") != "gas_nobre"
                       and (e["z"] <= 38 or e["simbolo"] in {"Ag", "Sn", "I", "Ba", "Au", "Hg", "Pb", "Cs"})]
        self.metais = [(e, n) for e, n in self.el_lig if gn.eh_metal(e)]
        self.formula_idx = {}
        for c in pac.compostos:
            f = c.get("formula")
            if f and not pac.comp_pendente(c):
                self.formula_idx.setdefault(f, c)
        self.nomes_sist = self._nomes_sistematicos()
        # ΔGf° e S°: só compostos que TÊM o valor no pacote (ΔHf° segue o sorteio geral do v3.5 de 17/10)
        self.p_termo = {pid: [x for x in todos if ((x[0].get("propriedades") or {}).get(pid)) is not None]
                        for pid in ("energiaGibbsFormacaoKJmol", "entropiaPadraoJmolK")}
        # partículas: elementos com nome no idioma, Z e massa atômica no pacote
        self.el_part = [(e, n) for e, n in self.E.elementos if e.get("z") and e["z"] <= 100 and e.get("massaAtomica")]
        self.pesos_part = [12 if e["simbolo"] in v34.ELEMENTOS_MUITO_COMUNS or e["simbolo"] in ISOTOPOS else 4 if e["z"] <= 56 else 1 for e, _ in self.el_part]

    # -- utilidades ------------------------------------------------------------------------------------
    def _el_nome(self, e):
        for x, nome in self.E.elementos:
            if x is e or x["simbolo"] == e["simbolo"]:
                return nome
        return None

    def _sup_el(self, e):
        """(texto, tipo) de um elemento: símbolo (25 %) ou nome do idioma."""
        nome = self._el_nome(e)
        if not nome or self.rng.random() < 0.25:
            return e["simbolo"], "simbolo"
        return v34.ml.superficie_nome(self.rng, nome, "de" if self.idioma == "de" else "x"), "elemento"

    def _sup_co(self, pool):
        c, texto, tipo = self.E.co(pool=pool)
        return c, texto, tipo

    def _eq(self, lista_eq, setas, pesos, coef=0.8):
        reag, prod, coefs = self.rng.choice(lista_eq)
        seta = self.rng.choices(setas, weights=pesos)[0]
        txt = self.gn.equacao_com_coeficientes(reag, prod, coefs if self.rng.random() < coef else None, seta, junto=self.rng.random() < 0.2)
        return txt, reag, prod, coefs

    def _p(self, pid, de_el=True):
        if pid in TERMO_FORMAS:
            art, forma = self.rng.choice(TERMO_FORMAS[pid][self.idioma])
            return (f"{art}{forma}" if art.endswith("'") else f"{art} {forma}"), forma, art
        tabela = self.L.prop_el if de_el else self.L.prop_co
        art, forma = self.rng.choice(tabela[pid])
        return (f"{art}{forma}" if art.endswith("'") else f"{art} {forma}"), forma, art

    def _q(self, unidade, modo, dativo=False):
        """quantidade em dígitos ('dig'), notação científica ('not') ou por extenso ('ext')."""
        if modo == "ext" and unidade in EXTENSO[self.idioma]:
            return extenso(self.rng, self.idioma, unidade, dativo)
        if modo == "not" and unidade in EXPOENTES:
            num, v = notacao(self.rng, self.idioma, unidade)
            sep = "" if self.rng.random() < 0.15 else " "
            return f"{num}{sep}{unidade_simbolo(self.L, unidade)}", {"valor": int(v) if v == int(v) else v, "unidade": unidade}
        return self.L.quant(unidade)

    def _nomes_sistematicos(self):
        ok = re.compile(r"^[A-Za-zÀ-ÿ0-9 ,'()-]{4,45}$")
        out = []
        for c in self.pac.compostos:
            if self.pac.comp_pendente(c):
                continue
            nome = (c.get("nomes") or {}).get(self.idioma) or (c.get("nome") if self.idioma == "pt-BR" else None)
            cands = [nome]
            if self.idioma == "en":
                cands.append(c.get("nomeIupac"))
            for n in cands:
                if n and ok.match(n) and re.search(r"\d-|-\d|,\d", n) and not re.search(r"\b[A-Z]{2,}-?\d", n):
                    out.append((c, n))
        vistos, uniq = set(), []
        for c, n in out:
            if fold(n) not in vistos:
                vistos.add(fold(n))
                uniq.append((c, n))
        return uniq

    def _art_pt(self, nome, prep=""):
        g = self.L.comum.genero(nome)
        return {"": {"o": "o", "a": "a"}, "de": {"o": "do", "a": "da"}}[prep][g] + " " + nome

    def _N(self, nome, prep=""):
        """nome com artigo (pt/es/fr) ou cru (en/de)."""
        if self.idioma == "pt-BR":
            return self._art_pt(nome, prep)
        if self.idioma in ("en", "de"):
            return (("of " if self.idioma == "en" else "von ") + nome) if prep else nome
        return self.L.x(nome, "composto", prep)

    def _fim(self, q, alvo, chave, protegido=(), **kw):
        q = self.L.acabar(q, [p for p in protegido if p], **kw)
        for k in ("composto", "equacao"):
            if k in alvo and alvo[k] not in q:
                return None
        return q, _ordenar(alvo), chave

    # -- famílias --------------------------------------------------------------------------------------
    def nox(self):
        rng, L, T = self.rng, self.L, NOX[self.idioma]
        r = rng.random()
        if r < 0.22:  # íon
            base, carga = rng.choice(self.ions)
            ion = self.gn.superficie_ion(base, carga, rng)
            formula, alvo = base, {"intent": "NOX", "composto": ion}
            if rng.random() < 0.7:
                tpl = rng.choice(T["ion_el"])
            else:
                tpl = rng.choice(T["ion"])
            chave = "ion|" + base
            comp_txt = ion
            valores = {"ion": ion}
        else:
            c, texto, tipo = self._sup_co(self.p_comb if rng.random() < 0.15 else self.p_nox)
            formula = c.get("formula")
            alvo = {"intent": "NOX", "composto": texto}
            tpl = rng.choice(T["el"] if rng.random() < 0.7 else T["todos"])
            chave = "co|" + str(c["cid"])
            comp_txt = texto
            c_em = x_em(L, texto, tipo)
            valores = {"c": texto, "c_de": L.x(texto, tipo, "de"), "c_em": c_em, "C_em": c_em[:1].upper() + c_em[1:]}
        if "{el" in tpl:
            simbolos = [s for s in self.gn.elementos_da_formula(formula) if s in self.pac.el_simbolo]
            centrais = [s for s in simbolos if s not in ("O", "H")]
            sim = rng.choice(centrais) if centrais and rng.random() < 0.8 else rng.choice(simbolos)
            e = self.pac.el_simbolo[sim]
            s, t = self._sup_el(e)
            valores.update({"el": L.x(s, t), "el_de": L.x(s, t, "de")})
            alvo["elemento"] = sim
            chave += "|" + sim
        return self._fim(_render(tpl, valores), alvo, chave, [comp_txt])

    def entalpia(self):
        rng, L, T = self.rng, self.L, ENT[self.idioma]
        tipo_m = rng.choices(["co", "q", "eq", "eq_q", "nada"], weights=[34, 22, 30, 6, 8])[0]
        alvo = {"intent": "ENTALPIA"}
        valores, prot = {}, []
        if tipo_m in ("co", "q"):
            pool = self.p_comb if rng.random() < 0.75 or not self.p_comb_geral else self.p_comb_geral
            c, texto, tipo = self._sup_co(pool)
            alvo["composto"] = texto
            valores.update({"c": texto, "c_de": L.x(texto, tipo, "de")})
            prot.append(texto)
            chave = "co|" + str(c["cid"])
        if tipo_m in ("eq", "eq_q"):
            txt, reag, prod, _ = self._eq(self.eq_bal, ["→", "->", "="], [6, 3, 1])
            alvo["equacao"] = txt
            valores["eq"] = txt
            prot.append(txt)
            chave = "eq|" + " + ".join(reag) + ">" + " + ".join(prod)
        if tipo_m in ("q", "eq_q"):
            u = rng.choices(["g", "kg", "mol", "mg"], weights=[6, 2, 3, 1])[0]
            qt, qd = self._q(u, "dig")
            valores["q"] = qt
            alvo["quantidades"] = [qd]
        if tipo_m == "nada":
            chave = "nada|" + str(rng.randrange(10 ** 6))
        tpl = rng.choice(T[tipo_m])
        return self._fim(_render(tpl, valores), alvo, chave, prot)

    def equilibrio(self):
        rng, L, T = self.rng, self.L, EQM[self.idioma]
        if rng.random() < EQM_CONCEITO_FRACAO:  # sem equação: CONCEITO (a temperatura, se houver, fica só no texto)
            tpl = rng.choice(EQM_CONCEITO[self.idioma])
            base = _render(tpl, {"T": L.quant(rng.choice(["K", "K", "°C"]))[0]} if "{T}" in tpl else {})
            return self._fim(base, {"intent": "CONCEITO"}, "conceito|" + fold(base), p_prefixo=0.2, p_sufixo=0.1)
        txt, reag, prod, coefs = self._eq(self.eq_eqm, ["⇌", "<=>", "<->", "→", "=", "->"], [45, 20, 8, 15, 7, 5], coef=0.85)
        especies = reag + prod
        if rng.random() < 0.25:
            com_fase = self._com_fases(reag, prod, coefs, txt)
            if com_fase:
                txt = com_fase
        alvo = {"intent": "EQUILIBRIO", "equacao": txt}
        tipo_m = rng.choices(["eq", "T", "conc", "conc_T", "conc_antes", "pp"], weights=[32, 17, 28, 6, 9, 8])[0]
        valores = {"eq": txt}
        quant = []

        def temp():
            u = rng.choice(["K", "K", "°C"])
            qt, qd = L.quant(u)
            return qt, qd

        def lista_conc(unidade, n_max):
            k = min(len(especies), n_max, rng.choice([2, 3, 3]))
            esc = especies if len(especies) <= k else sorted(rng.sample(especies, k), key=especies.index)
            partes, qs = [], []
            for sp in esc:
                if unidade == "mol/L":  # forma curta (mol/L, M): o par cabe em max_length 256
                    num = rng.choice(v34.VALS["mol/L"])
                    v = float(num)
                    qd = {"valor": int(v) if v == int(v) else v, "unidade": "mol/L"}
                    forma = unidade_simbolo(L, "mol/L")
                    qt = num.replace(".", v34.DECIMAL[self.idioma]) + ("" if forma == "M" and rng.random() < 0.5 else " ") + forma
                    partes.append(f"[{sp}] = {qt}")
                else:
                    qt, qd = L.quant("atm")
                    partes.append(rng.choice([f"p({sp}) = {qt}", f"P{sp} = {qt}", f"p{sp} = {qt}"]))
                qs.append(qd)
            return lista(partes, self.idioma, rng) if len(partes) > 1 else partes[0], qs

        if tipo_m == "T":
            valores["T"], qd = temp()
            quant = [qd]
        elif tipo_m in ("conc", "conc_T", "conc_antes"):
            valores["conc"], quant = lista_conc("mol/L", 2 if tipo_m == "conc_T" else 3)
            if tipo_m == "conc_T":
                valores["T"], qd = temp()
                quant.append(qd)
        elif tipo_m == "pp":
            valores["pp"], quant = lista_conc("atm", 3)
        if quant:
            alvo["quantidades"] = quant
        tpl = rng.choice(T[tipo_m])
        # as quantidades seguem a ordem do texto: {conc} antes de {T} em todos os moldes conc_T
        chave = "eq|" + " + ".join(reag) + ">" + " + ".join(prod)
        return self._fim(_render(tpl, valores), alvo, chave, [txt])

    FASE = {"solido": "(s)", "liquido": "(l)", "gas": "(g)"}

    def _fase(self, sp):
        """(s)/(l)/(g) da espécie pelo `estadoPadrao` do pacote (composto pela fórmula ou substância elementar pelo elemento); None se não há."""
        el = self._elementar(sp)
        if el:
            est = self.pac.el_simbolo[el].get("estadoPadrao")
        else:
            c = self.formula_idx.get(sp)
            est = ((c or {}).get("propriedades") or {}).get("estadoPadrao")
        return self.FASE.get(est)

    def _com_fases(self, reag, prod, coefs, txt):
        """A mesma equação com o estado físico de cada espécie (do pacote), ou None se falta o de alguma. Mantém seta e coeficientes."""
        fases = [self._fase(sp) for sp in reag + prod]
        if not all(fases):
            return None
        out = txt
        for sp, f in sorted(zip(reag + prod, fases), key=lambda x: -len(x[0])):
            out = re.sub(r"(?<![A-Za-z0-9(])" + re.escape(sp) + r"(?![A-Za-z0-9(])", sp + f, out)
        return out

    def ligacao(self):
        rng, L, T = self.rng, self.L, LIG[self.idioma]
        r = rng.random()
        if r < 0.42:
            for _ in range(50):
                (e1, _n1), (e2, _n2) = rng.sample(self.el_lig, 2)
                if e1["simbolo"] != e2["simbolo"]:
                    break
            s1, t1 = self._sup_el(e1)
            s2, t2 = self._sup_el(e2)
            if t1 != t2 and rng.random() < 0.7:  # os dois do mesmo jeito (nomes ou símbolos), como se escreve
                s2, t2 = (e2["simbolo"], "simbolo") if t1 == "simbolo" else (self._el_nome(e2) or e2["simbolo"], "elemento")
            tpl = rng.choice(T["par"])
            if "-{b}" in tpl:
                s1, s2 = e1["simbolo"], e2["simbolo"]
            valores = {"a": s1, "b": s2, "A": L.x(s1, t1)}
            alvo = {"intent": "LIGACAO", "elemento": e1["simbolo"]}
            chave = "par|" + "|".join(sorted([e1["simbolo"], e2["simbolo"]]))
            return self._fim(_render(tpl, valores), alvo, chave)
        if r < 0.47 and self.metais:
            e, _n = rng.choice(self.metais)
            nome = self._el_nome(e) or e["simbolo"]
            tpl = rng.choice(T["metal"])
            el = (self._art_pt(nome) if self.idioma == "pt-BR" else nome)
            if self.idioma == "pt-BR":
                tpl = tpl.replace("no {el}", "{el_em}")
                el_em = ("na " if self.L.comum.genero(nome, elemento=True) == "a" else "no ") + nome
                valores = {"el": el, "el_em": el_em}
            else:
                valores = {"el": nome}
            return self._fim(_render(tpl, valores), {"intent": "LIGACAO", "elemento": e["simbolo"]}, "metal|" + e["simbolo"])
        c, texto, tipo = self._sup_co(self.p_lig)
        c_em = x_em(L, texto, tipo)
        valores = {"c": texto, "c_de": L.x(texto, tipo, "de"), "c_em": c_em,
                   "C": (L.x(texto, tipo)[:1].upper() + L.x(texto, tipo)[1:]) if self.idioma in ("pt-BR", "es", "fr") else texto}
        tpl = rng.choice(T["co"])
        return self._fim(_render(tpl, valores), {"intent": "LIGACAO", "composto": texto}, "co|" + str(c["cid"]), [texto])

    def entalpia_formacao(self):
        rng, L = self.rng, self.L
        r = rng.random()
        if r < 0.14:
            q = rng.choice(CONTRASTE[self.idioma])
            return self._fim(q, {"intent": "CONCEITO"}, "contraste|" + fold(q), p_prefixo=0.25, p_sufixo=0.1)
        pid = rng.choices(list(TERMO_PESOS), weights=list(TERMO_PESOS.values()))[0]
        pool = self.p_termo.get(pid)  # None (ΔHf°): sorteio geral; ΔGf° e S°: só quem tem o valor no pacote
        if pool is not None and len(pool) < 2:
            return None
        junto, forma, art = self._p(pid)
        T = HF[self.idioma]
        u = rng.choice(TERMO_UNIDADE[pid])
        if r < 0.70:
            c, texto, tipo = self._sup_co(pool)
            tpl = rng.choice(T["prop"])
            valores = {"c": texto, "c_de": L.x(texto, tipo, "de"), "p": forma, "p_art": junto, "P": forma[:1].upper() + forma[1:], "u": u}
            alvo = {"intent": "PROPRIEDADE", "composto": texto, "propriedade": pid}
            return self._fim(_render(tpl, valores), alvo, "prop|" + str(c["cid"]), [texto])
        c1, t1, ty1 = self._sup_co(pool)
        for _ in range(30):
            c2, t2, ty2 = self._sup_co(pool)
            if c2["cid"] != c1["cid"] and fold(t2) != fold(t1):
                break
        else:
            return None
        moldes = T["comp"] + (T["comp_neg"] if pid != "entropiaPadraoJmolK" else [])
        tpl = rng.choice(moldes)
        neg = NEG.get(self.idioma, {}).get(art, "")
        valores = {"a": t1, "b": t2, "a_de": L.x(t1, ty1, "de"), "b_de": L.x(t2, ty2, "de"), "p": forma, "p_art": junto, "neg": neg}
        alvo = {"intent": "COMPARAR", "composto": t1, "propriedade": pid}
        return self._fim(_render(tpl, valores), alvo, "comp|" + "|".join(sorted([str(c1["cid"]), str(c2["cid"])])), [t1])

    def configuracao(self):
        e, s, t = self.E.el(com="configuracaoEletronica")
        tpl = self.rng.choice(CONFIG[self.idioma])
        valores = {"el": self.L.x(s, t), "el_de": self.L.x(s, t, "de")}
        alvo = {"intent": "PROPRIEDADE", "elemento": e["simbolo"], "propriedade": "configuracaoEletronica"}
        return self._fim(_render(tpl, valores), alvo, "cfg|" + e["simbolo"])

    # -- partículas (18/10/2026) -------------------------------------------------------------------------
    def _artigo_sim(self, tok, prep=""):
        """espécie escrita com símbolo ("Fe2+", "C-14") com o artigo/preposição do idioma: "do Fe2+", "of Fe2+", "del Fe2+", "von Fe2+", "du Fe2+"."""
        rng, i = self.rng, self.idioma
        if i == "pt-BR":
            return f"do {tok}" if prep else rng.choice([f"o {tok}", tok])
        if i == "es":
            return f"del {tok}" if prep else rng.choice([f"el {tok}", tok])
        if i == "fr":
            return rng.choice([f"du {tok}", f"de {tok}"]) if prep else rng.choice([f"le {tok}", tok])
        if i == "en":
            return f"of {tok}" if prep else tok
        return f"von {tok}" if prep else tok

    def _com_palavra(self, w, tok):
        """(x, x_de) com a palavra da espécie: "o íon Fe2+"/"do íon Fe2+", "the Fe2+ ion", "das Fe2+-Ion"/"des Fe2+-Ions", "l'ion Fe2+"."""
        rng, i = self.rng, self.idioma
        if i == "pt-BR":
            return f"o {w} {tok}", f"do {w} {tok}"
        if i == "es":
            return f"el {w} {tok}", f"del {w} {tok}"
        if i == "fr":
            art = "l'" if w[:1] in "aeiouéi" else "le "
            return f"{art}{w} {tok}", (f"de l'{w} {tok}" if art == "l'" else f"du {w} {tok}")
        if i == "en":
            x = rng.choice([f"the {tok} {w}", f"the {w} {tok}"])
            return x, "of " + x
        if rng.random() < 0.5 and not tok.endswith("-"):  # "das Fe2+-Ion"; "I--Anion" não
            return f"das {tok}-{w}", rng.choice([f"des {tok}-{w}s", f"vom {tok}-{w}"])
        return f"das {w} {tok}", f"vom {w} {tok}"

    def _especie(self):
        """(elemento, x, x_de, tipo, chave, token): átomo neutro (45 %), íon monoatômico (33 %; cargas dos estados de oxidação do pacote, + nos
        metais e − nos não metais) ou isótopo com o número de massa no texto (22 %; ISOTOPOS ou a massa atômica arredondada)."""
        rng, L, W = self.rng, self.L, PART_PALAVRAS[self.idioma]
        e, nome = rng.choices(self.el_part, weights=self.pesos_part)[0]
        sim = e["simbolo"]
        r = rng.random()
        if r < 0.33:
            metal = self.gn.eh_metal(e)
            cargas = [q for q in (e.get("estadosOxidacao") or []) if isinstance(q, int) and q and abs(q) <= 3 and (q > 0 if metal else q < 0 or sim == "H")]
            if cargas:
                q = rng.choice(cargas)
                n, s = abs(q), ("+" if q > 0 else "-")
                d = str(n) if n > 1 else ""
                formas = [f"{sim}{d}{s}"] * 4 + [f"{sim}{(d + s).translate(SUP)}"] * 2 + ([f"{sim}{s}{n}"] if n > 1 else []) + [f"{sim}^{d}{s}"]
                tok = rng.choice(formas)
                if rng.random() < 0.55:
                    w = W[rng.choice(["ion", "cat"] if q > 0 else ["ion", "an"])]
                    x, x_de = self._com_palavra(w, tok)
                else:
                    x, x_de = self._artigo_sim(tok), self._artigo_sim(tok, "de")
                return e, x, x_de, "ion", f"ion|{sim}{q:+d}", tok
        if r >= 0.78 or (r < 0.33 and rng.random() < 0.3):
            A = rng.choice(ISOTOPOS.get(sim) or [int(round(e["massaAtomica"]))])
            if rng.random() < 0.5:
                sep = rng.choice(["-", " "]) if self.idioma == "fr" else "-"
                nm = nome if self.idioma == "de" else (nome.lower() if rng.random() < 0.85 else nome)
                tok = f"{nm}{sep}{A}"
                if rng.random() < 0.3:
                    x, x_de = self._com_palavra(W["iso"], tok) if self.idioma != "de" else (f"das Isotop {tok}", f"des Isotops {tok}")
                else:
                    x, x_de = L.x(nm, "elemento") + f"{sep}{A}", L.x(nm, "elemento", "de") + f"{sep}{A}"
            else:
                tok = rng.choice([f"{sim}-{A}", f"{sim}-{A}", f"{A}{sim}", f"{str(A).translate(SUP)}{sim}"])
                if rng.random() < 0.3:
                    x, x_de = self._com_palavra(W["iso"], tok) if self.idioma != "de" else (f"das Isotop {tok}", f"des Isotops {tok}")
                else:
                    x, x_de = self._artigo_sim(tok), self._artigo_sim(tok, "de")
            return e, x, x_de, "iso", f"iso|{sim}{A}", tok
        s, t = self._sup_el(e)
        if rng.random() < 0.2:  # "do átomo de ferro", "of an iron atom"
            i, a = self.idioma, W["atomo"]
            if i == "pt-BR":
                x, x_de = f"um {a} {s}", rng.choice([f"do {a} {s}", f"de um {a} {s}"])
            elif i == "es":
                x, x_de = f"un {a} {s}", f"del {a} {s}"
            elif i == "fr":
                x, x_de = f"un {a} {s}", f"de l'{a} {s}"
            elif i == "en":
                x = rng.choice([f"an {a} of {s}", f"a {s} {a}"]) if t == "simbolo" else f"an {a} of {s.lower()}"
                x_de = "of " + x
            else:
                x, x_de = f"ein {s}-{a}", f"eines {s}-{a}s"
        else:
            x, x_de = L.x(s, t), L.x(s, t, "de")
        return e, x, x_de, "neutro", f"el|{sim}", s

    PART_PESOS = {"neutro": {"todos": 25, "p": 25, "n": 20, "e": 15, "A": 15}, "ion": {"todos": 35, "e": 40, "p": 15, "n": 10},
                  "iso": {"n": 40, "todos": 30, "p": 10, "e": 10, "A": 10}}

    def particulas(self):
        rng, L = self.rng, self.L
        r = rng.random()
        if r < 0.15:  # contraste: não é contagem de partículas
            C = PART_CONTRASTE[self.idioma]
            if r < 0.08:
                e, s, t = self.E.el(com="configuracaoEletronica")
                tpl, pid, chave = rng.choice(C["cfg"]), "configuracaoEletronica", "cfg|" + e["simbolo"]
                junto = forma = ""
            else:
                e, s, t = self.E.el()
                junto, forma, _art = self._p("numeroAtomico", True)
                tpl, pid, chave = rng.choice(C["z"]), "numeroAtomico", "z|" + e["simbolo"]
            valores = {"el": L.x(s, t), "el_de": L.x(s, t, "de"), "p_art": junto, "P": forma[:1].upper() + forma[1:]}
            return self._fim(_render(tpl, valores), {"intent": "PROPRIEDADE", "elemento": e["simbolo"], "propriedade": pid}, chave, [s])
        e, x, x_de, tipo, chave, tok = self._especie()
        pesos = self.PART_PESOS[tipo]
        grupo = rng.choices(list(pesos), weights=list(pesos.values()))[0]
        tpl = rng.choice(PART[self.idioma][grupo])
        alvo = {"intent": "PROPRIEDADE", "elemento": e["simbolo"], "propriedade": "particulas"}
        return self._fim(_render(tpl, {"x": x, "x_de": x_de}), alvo, chave, [tok])

    def _quantidades(self, modo):
        """Moldes de QT com as quantidades no modo pedido (ao menos uma no modo; as demais podem vir em dígitos)."""
        rng, L, idioma = self.rng, self.L, self.idioma
        grupos = ["ESTEQ_m", "ESTEQ_n", "CONC", "PH", "CONV", "GAS"] if modo == "not" else ["ESTEQ_m", "ESTEQ_n", "CONC", "CONV", "GAS"]
        pesos = [3, 4, 3, 2, 3, 1] if modo == "not" else [2, 6, 3, 2, 1]
        g = rng.choices(grupos, weights=pesos)[0]
        tpl = rng.choice(QT[idioma][g])
        intent = QT_INTENT[g]
        alvo = {"intent": intent}
        valores, quant, prot, chave = {}, [], [], None
        if "{c}" in tpl:
            pool = None
            if g in ("PH", "CONC"):
                pool = [x for x in self.E.cotidiano if x[0]["cid"] != 962]
            c, texto, tipo = self._sup_co(pool)
            valores["c"] = texto
            alvo["composto"] = texto
            prot.append(texto)
            chave = "co|" + str(c["cid"])
        if "{el}" in tpl:
            e, s, t = self.E.el()
            valores["el"] = s
            alvo["elemento"] = e["simbolo"]
            chave = "el|" + e["simbolo"]
        usou_modo = False
        for n in v34.PLACEHOLDER.findall(tpl):
            base = n.replace("_dat", "")
            dat = n.endswith("_dat")
            if base == "qm":
                u = rng.choices(["g", "kg", "mg"], weights=[7, 2, 1])[0] if modo == "not" else rng.choice(["g", "kg", "g"])
            elif base == "qn":
                u = "mol"
            elif base == "qv":
                u = rng.choice(["L", "mL"]) if modo == "not" else "L"
            elif base == "qc":
                u = "mol/L"
            elif base == "q":
                u = rng.choice(["g", "kg", "L", "mL", "mol", "Pa", "J", "atm"]) if modo == "not" else rng.choice(["kg", "L", "g", "mol"])
            elif base == "T":
                qt, qd = L.quant(rng.choice(["K", "°C"]))
                valores[n] = qt
                quant.append(qd)
                continue
            elif base == "P":
                qt, qd = L.quant(rng.choice(["atm", "kPa"]))
                valores[n] = qt
                quant.append(qd)
                continue
            else:
                continue
            m = modo if (not usou_modo or rng.random() < 0.5) else "dig"
            if m == "ext" and u not in EXTENSO[idioma]:
                m = "dig"
            qt, qd = self._q(u, m, dativo=dat)
            usou_modo = usou_modo or m == modo
            valores[n] = qt
            quant.append(qd)
            if base == "q":
                destinos = {"m": ["g", "kg", "mg"], "v": ["L", "mL"], "n": ["mol", "mmol"], "P": ["atm", "kPa", "Pa", "mmHg"], "E": ["J", "kJ", "cal"]}
                cat = {"g": "m", "kg": "m", "mg": "m", "L": "v", "mL": "v", "mol": "n", "Pa": "P", "atm": "P", "J": "E"}[u]
                ud = rng.choice([d for d in destinos[cat] if d != u])
                alvo["unidadeDestino"] = ud
                valores["u"] = L.unidade_texto(ud)
        if not usou_modo:
            return None
        alvo["quantidades"] = quant
        if chave is None:
            chave = g + "|" + "|".join(f"{x['valor']}{x['unidade']}" for x in quant)
        return self._fim(_render(tpl, valores), alvo, f"{modo}|{chave}", prot, p_minuscula=0.3)

    def notacao(self):
        return self._quantidades("not")

    def extenso(self):
        return self._quantidades("ext")

    def esteq_formada(self):
        rng, L = self.rng, self.L
        for _ in range(40):
            reag, prod, coefs = rng.choice(self.eq_bal)
            eq_txt = " + ".join(reag) + " -> " + " + ".join(prod)
            tipo_eq = self.tipo_eq.get(eq_txt, "geral")
            r_sp, p_sp = rng.choice(reag), rng.choice(prod)
            r_el, p_el = self._elementar(r_sp), self._elementar(p_sp)
            if r_el and p_el:
                continue
            if r_sp == "O2" and tipo_eq == "combustao":
                continue
            break
        else:
            return None
        alvo = {"intent": "ESTEQUIOMETRIA"}
        r_txt, r_tipo = self._sup_especie(r_sp)
        p_txt, p_tipo = self._sup_especie(p_sp)
        if r_tipo == "elemento_sim":
            alvo["elemento"] = r_el
            alvo["composto"] = p_txt
        elif p_tipo == "elemento_sim":
            alvo["elemento"] = p_el
            alvo["composto"] = r_txt
        else:
            alvo["composto"] = r_txt
        grupo = tipo_eq if tipo_eq in ("combustao", "decomposicao") and rng.random() < 0.5 else "geral"
        moldes = FORMADA[self.idioma].get(grupo) or FORMADA[self.idioma]["geral"]
        tpl = rng.choice(moldes)
        valores = {"p": p_txt, "r": r_txt}
        if "{eq}" in tpl:
            txt = self.gn.equacao_com_coeficientes(reag, prod, coefs if rng.random() < 0.7 else None, rng.choice(["→", "->"]))
            if r_txt not in txt or p_txt not in txt:
                return None  # a equação usa a fórmula; o reagente/produto por nome não estaria nela
            valores["eq"] = txt
            alvo["equacao"] = txt
        u = rng.choices(["g", "kg", "mol", "mg"], weights=[7, 1, 2, 1])[0]
        qt, qd = L.quant(u)
        valores["q"] = qt
        alvo["quantidades"] = [qd]
        chave = "f|" + r_sp + ">" + p_sp
        return self._fim(_render(tpl, valores), alvo, chave, [alvo.get("composto"), alvo.get("equacao")])

    def _lista_el(self, pid, n):
        """n elementos que TÊM a propriedade no pacote, com valores distintos; metade das vezes vizinhos de grupo ou período do primeiro."""
        rng, chave = self.rng, ("z" if pid == "numeroAtomico" else pid)
        cands = [(e, nome) for e, nome in self.E.elementos if e.get(chave) is not None]
        if len(cands) < n:
            return None
        pesos = [12 if e["simbolo"] in v34.ELEMENTOS_MUITO_COMUNS else 4 if e.get("z", 99) <= 36 else 1 for e, _ in cands]
        e1, _ = rng.choices(cands, weights=pesos)[0]
        if rng.random() < 0.5:
            viz = [x for x in cands if x[0] is not e1 and ((e1.get("grupo") and x[0].get("grupo") == e1.get("grupo")) or x[0].get("periodo") == e1.get("periodo"))]
        else:
            viz = [x for x in cands if x[0] is not e1]
        rng.shuffle(viz)
        escolhidos = [e1]
        for e, _ in viz:
            if len(escolhidos) == n:
                break
            if all(e.get(chave) != x.get(chave) for x in escolhidos):
                escolhidos.append(e)
        if len(escolhidos) < n:
            return None
        out = []
        for e in escolhidos:
            s, t = self._sup_el(e)
            out.append((e, s, t))
        return out

    def _elementar(self, sp):
        m = re.fullmatch(r"([A-Z][a-z]?)\d*", sp)
        return m.group(1) if m and m.group(1) in self.pac.el_simbolo else None

    def _sup_especie(self, sp):
        """(texto, tipo): substância elementar -> nome do elemento ou a fórmula (tipo elemento_sim); composto -> fórmula ou nome do pacote no idioma."""
        el = self._elementar(sp)
        if el:
            nome = self._el_nome(self.pac.el_simbolo[el])
            if nome and self.rng.random() < 0.6:
                return v34.ml.superficie_nome(self.rng, nome, "de" if self.idioma == "de" else "x"), "elemento_sim"
            return sp, "elemento_sim"
        c = self.formula_idx.get(sp)
        if c is not None and self.rng.random() < 0.45:
            sups = [s for s, t in v34.pop.superficies(c, self.idioma) if t != "formula"]
            if sups:
                return self.rng.choice(sups), "composto"
        return sp, "formula"

    def nomenclatura_nome(self):
        rng = self.rng
        if not self.nomes_sist:
            return None
        c, nome = rng.choice(self.nomes_sist)
        if rng.random() < 0.3 and not nome[:1].isdigit():
            nome = nome[:1].lower() + nome[1:] if rng.random() < 0.7 else nome[:1].upper() + nome[1:]
        tpl = rng.choice(NOMEN[self.idioma])
        valores = {"n": nome, "N": self._N(nome), "n_de": self._N(nome, "de")}
        return self._fim(_render(tpl, valores), {"intent": "NOMENCLATURA", "composto": nome}, "n|" + str(c["cid"]), [nome])

    def mistura(self):
        rng, L = self.rng, self.L
        tpl, nivel = rng.choice(MIST[self.idioma])
        alvo = {"intent": "CONCEITO", **({"nivel": nivel} if nivel else {})}
        valores, prot = {}, []
        if "{x}" in tpl or "{X}" in tpl:
            x = rng.choice(MISTURAS[self.idioma])
            valores.update({"x": x, "X": x[:1].upper() + x[1:]})
            chave = "x|" + fold(x)
        elif "{a}" in tpl:
            a, b = rng.choice(PARES[self.idioma])
            if rng.random() < 0.3:
                a, b = b, a
            valores.update({"a": a, "b": b})
            chave = "par|" + "|".join(sorted([fold(a), fold(b)]))
        else:  # composto do pacote: CONCEITO copia o composto, como no resto do corpus
            c, texto, tipo = self._sup_co([x for x in self.E.cotidiano if x[0]["cid"] != 962])
            if tipo == "formula":
                return None
            sujeito = L.x(texto, tipo) if self.idioma in ("pt-BR", "es", "fr") else texto
            valores.update({"c": texto, "C": sujeito[:1].upper() + sujeito[1:]})
            alvo["composto"] = texto
            prot.append(texto)
            chave = "co|" + str(c["cid"])
        return self._fim(_render(tpl, valores), alvo, chave, prot)

    def ordenacao(self):
        rng, L = self.rng, self.L
        if rng.random() < 0.82:
            pid = rng.choice(PROP_ORD_EL)
            if pid not in L.prop_el:
                return None
            ents = self._lista_el(pid, rng.choice([3, 3, 4]))
            if not ents:
                return None
            simb = rng.random() < 0.6
            itens = [e["simbolo"] if simb else s for e, s, _t in ents]
            alvo = {"intent": "COMPARAR", "elemento": ents[0][0]["simbolo"], "propriedade": pid}
            junto, forma, art = self._p(pid, True)
            chave = "el|" + pid + "|" + "|".join(sorted(e["simbolo"] for e, _s, _t in ents))
            prot = []
        else:
            pid = rng.choice(PROP_ORD_CO)
            if pid not in L.prop_co:
                return None
            ents, vistos = [], set()
            for _ in range(60):
                c, s, t = self.E.co()
                v = c.get("massaMolar") if pid == "massaMolar" else None
                if c["cid"] in vistos or fold(s) in {fold(x[1]) for x in ents} or (pid == "massaMolar" and (v is None or v in {x[0].get("massaMolar") for x in ents})):
                    continue
                vistos.add(c["cid"])
                ents.append((c, s, t))
                if len(ents) == 3:
                    break
            if len(ents) < 3:
                return None
            itens = [s for _c, s, _t in ents]
            alvo = {"intent": "COMPARAR", "composto": itens[0], "propriedade": pid}
            junto, forma, art = self._p(pid, False)
            chave = "co|" + pid + "|" + "|".join(sorted(str(c["cid"]) for c, _s, _t in ents))
            prot = [itens[0]]
        pelo = {"o": "pelo", "a": "pela", "os": "pelos", "as": "pelas"}.get(art, "por") + " " + forma if self.idioma == "pt-BR" else forma
        tpl = rng.choice(ORD[self.idioma])
        valores = {"lista": lista(itens, self.idioma, rng), "p": forma, "p_art": junto, "pelo_p": pelo}
        return self._fim(_render(tpl, valores), alvo, chave, prot, p_prefixo=0.15, p_sufixo=0.05)


def gerar_familia(pac, idioma, familia, seed, escala, ds=None):
    """Registros {q, alvo, idioma, familia, _lado, _ev} de uma família. `_ev = "v35"` marca a evidência por evidencia_v35."""
    ds = ds or _dataset()
    rng = random.Random(f"{seed}-v35-{familia}-{idioma}")
    g = Gerador(pac, idioma, rng, ds)
    meta = int(round(COTAS[familia][0 if idioma == "pt-BR" else 1] * escala))
    fn = getattr(g, familia)
    regs, vistos, tent = [], set(), 0
    while len(regs) < meta and tent < meta * 40:
        tent += 1
        r = fn()
        if not r:
            continue
        q, alvo, chave = r
        k = " ".join(re.findall(r"[a-z0-9]+", fold(q)))
        if k in vistos or len(q) > 300:
            continue
        vistos.add(k)
        lado = "holdout" if balde(f"{idioma}|{familia}|{chave}", seed) < HOLDOUT_POR_MIL else "treino"
        regs.append({"q": q, "alvo": alvo, "idioma": idioma, "familia": familia, "_lado": lado, "_ev": "v35" if familia in ("notacao", "extenso") else None})
    st = {"idioma": idioma, "familia": familia, "gerados": len(regs), "tentativas": tent,
          "por_intencao": dict(sorted(Counter(r["alvo"]["intent"] for r in regs).items()))}
    return regs, st


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--familia", choices=FAMILIAS, default="nox")
    ap.add_argument("--idioma", default="pt-BR", choices=IDIOMAS)
    ap.add_argument("--n", type=int, default=25)
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    ds = _dataset()
    pac = ds[1].localizar(None)
    regs, st = gerar_familia(pac, a.idioma, a.familia, 2026, 1.0, ds)
    rng = random.Random(1)
    for r in rng.sample(regs, min(a.n, len(regs))):
        print(repr(r["q"]), "->", json.dumps(r["alvo"], ensure_ascii=False))
    print(json.dumps(st, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
