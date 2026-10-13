# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — gerador focado da química: **compostos do dia a dia**, pelos nomes como as pessoas escrevem (nome popular, sinônimos
por idioma, fórmula, inclusive em minúsculas), nos padrões de pergunta que o golden usa e o corpus v3 cobria mal.

Por que existe (gate do NLU v3, 13/10/2026): o modelo acertou 97 % das intenções, mas deixou de copiar o `composto` em perguntas como
"qual o ponto de ebulição da água?", "what are the hazards of sulfuric acid?", "Was ist Kochsalz?", "hcl" — os moldes do corpus sorteiam os
1.971 compostos por igual (nomes técnicos, quase nunca "água", "soda cáustica", "bleach", "Kochsalz"), e algumas frases fixas do corpus
ensinavam o contrário ("Por que não misturar água sanitária com amoníaco?" sem composto).

Regras (iguais às do contrato da nuvem): o `composto` é copiado EXATAMENTE como está na pergunta (o cliente resolve pelo pacote);
quantidades na ordem em que aparecem; nada de equação inventada; nenhum texto fixo em português fora do bloco pt-BR.

Saída: registros `{q, alvo, idioma, _lado}` no mesmo formato de `quimica_multilingue.gerar_idioma`, para o `montar_corpus.py` passar
pelo mesmo `build_nlu_dataset.construir` (validação, filtro do golden, holdout).

Uso isolado (amostra):  python -I ia/corpus/quimica_populares.py --idioma de --n 20
"""
import argparse
import importlib.util
import json
import random
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
QUIMICA = RAIZ / "apps" / "quimica"
DATASET = QUIMICA / "dataset"
IDIOMAS = ["pt-BR", "en", "es", "de", "fr"]
FONTE = "SaibaTudo Química: compostos do dia a dia (ia/corpus/quimica_populares.py) sobre o pacote de dados (PubChem, Wikidata, CLP/EUR-Lex)"
LICENCA = "CC BY-SA 4.0"
HOLDOUT_POR_MIL = 50
KEYS = ["intent", "elemento", "composto", "propriedade", "quantidades", "equacao", "nivel", "unidadeDestino"]
SINONIMO_OK = re.compile(r"^[A-Za-zÀ-ÿ0-9 ,.'()+-]{3,40}$")
PLACEHOLDER = re.compile(r"\{(\w+)\}")

# CIDs de substâncias do cotidiano que existem no pacote (conferido em 13/10/2026) — além de TODOS os compostos com `nomePopular`.
CIDS_COTIDIANO = [
    962, 5234, 5988, 702, 176, 516892, 784, 222, 14798, 23665760, 297, 6334, 7843, 280, 281, 24823, 1118, 313, 944, 180, 5793, 2519, 2244,
    1983, 1176, 5284359, 10112, 24462, 6093208, 14778, 1119, 4873, 22985, 241, 1140, 712, 753, 6325, 977, 947, 783, 24526, 887, 3776, 24083,
    24434, 25517, 10340, 24456, 402, 1004, 311, 612, 5997, 89594, 54670067, 948, 931, 24928, 24261,
]
# combustíveis (perguntas de queima): metano, propano, butano, etanol, metanol, glicose, sacarose, benzeno, tolueno, hidrogênio
CIDS_COMBUSTIVEL = {297, 6334, 7843, 702, 887, 5793, 5988, 241, 1140, 783}
CIDS_SEM_SOLUBILIDADE = {962}  # a água não é "solúvel em água"
# Substância elementar (O2, H2, N2, Cl2, O3, Br2, I2, F2, gases nobres): fórmula de um só elemento. No app, o NOME de um elemento é
# ELEMENTO (golden: "Fale sobre o oxigênio" -> O; "Masa molar: azufre" -> S): essas entradas do pacote ficam FORA deste gerador
# (o v3.1 aprendeu "oxigênio"/"Sauerstoff"/"hydrogen" como composto por causa delas e errou 22 casos de elemento no golden).
ELEMENTAR = re.compile(r"^([A-Z][a-z]?)\d*$")


def eh_elementar(c) -> bool:
    formula = (c.get("formulaHill") or c.get("formula") or "").replace(" ", "")
    return bool(formula) and bool(ELEMENTAR.match(formula))

# ---------------------------------------------------------------------------------------------------------
# Moldes por idioma. Placeholders: {co_s} nome cru | {co} com artigo | {Co} com artigo, inicial maiúscula | {co_de} "do/da/of/von/de"
# {co2_s} segundo composto | {qm} massa | {qv} volume | {qc} {qc2} concentrações | {qn} mols | {prop}/{Prop}/{prop_art} propriedade
# ---------------------------------------------------------------------------------------------------------
M = {}
M["pt-BR"] = {
    "COMPOSTO": ["O que é {co}?", "o que é {co_s}", "{co_s}", "{co_s}?", "{Co}", "Fale sobre {co}", "Me fale {co_de}", "Informações sobre {co}",
                 "O que você sabe sobre {co}?", "ficha {co_de}", "Quero saber sobre {co}", "Me conte sobre {co}", "Resumo {co_de}", "{co_s} o que é",
                 "composto {co_s}", "substância {co_s}", "O que é {co_s}?", "Explique o que é {co}"],
    "PROPRIEDADE": ["Qual é {prop_art} {co_de}?", "Qual {prop_art} {co_de}?", "{Prop} {co_de}", "{prop} {co_de}", "Me diga {prop_art} {co_de}", "{co_s}: {prop}",
                    "Quero saber {prop_art} {co_de}", "{Prop} {co_de}?", "qual {prop_art} {co_de}", "Pode me dizer {prop_art} {co_de}?"],
    "PROPRIEDADE_FIXA": [("A que temperatura {co} ferve?", "pontoEbulicaoK"), ("A que temperatura {co} entra em ebulição?", "pontoEbulicaoK"),
                         ("A que temperatura {co} derrete?", "pontoFusaoK"), ("A que temperatura {co} congela?", "pontoFusaoK"),
                         ("{Co} é solúvel em água?", "solubilidade"), ("{Co} dissolve em água?", "solubilidade"), ("Quanto pesa um litro {co_de}?", "densidadeKgm3"),
                         ("{Co} é mais denso que a água?", "densidadeKgm3"), ("Qual o CAS {co_de}?", "cas")],
    "MASSA_MOLAR": ["Qual a massa molar {co_de}?", "massa molar {co_de}", "peso molecular {co_de}", "Quanto pesa um mol {co_de}?", "massa molecular {co_de}",
                    "Qual o peso molecular {co_de}?", "Calcule a massa molar {co_de}", "{co_s} massa molar", "Quantos gramas tem um mol {co_de}?"],
    "SEGURANCA": ["Quais os perigos {co_de}?", "{Co} é perigoso?", "{Co} é tóxico?", "{Co} é inflamável?", "{Co} faz mal?", "{Co} faz mal à saúde?", "riscos {co_de}",
                  "perigos {co_de}", "Que EPI usar com {co_s}?", "Primeiros socorros em contato de {co_s} com os olhos", "primeiros socorros contato de {co_s} com a pele",
                  "O que fazer se {co_s} cair na pele?", "O que fazer se alguém engolir {co_s}?", "Por que não misturar {co_s} com {co2_s}?", "Posso misturar {co_s} com {co2_s}?",
                  "Como armazenar {co_s}?", "Como descartar {co_s}?", "{Co} é corrosivo?", "Quais os sintomas de intoxicação por {co_s}?", "efeitos {co_de} no corpo",
                  "Quais os efeitos {co_de} no organismo?", "Ficha de segurança {co_de}", "Cuidados ao manusear {co_s}", "O que acontece se inalar {co_s}?",
                  "{co_s} pode explodir?", "Posso respirar {co_s}?", "É seguro misturar {co_s} e {co2_s}?"],
    "ESTEQUIOMETRIA": ["Quantos mols há em {qm} de {co_s}?", "Quantos gramas pesam {qn} de {co_s}?", "Qual a massa de {qn} de {co_s}?", "Converta {qm} de {co_s} em mols",
                       "{qm} de {co_s} são quantos mols?", "Quantas moléculas há em {qm} de {co_s}?", "{qn} de {co_s} pesam quanto?"],
    "ESTEQUIOMETRIA_QUEIMA": ["Quantos gramas de CO2 se formam na queima de {qm} de {co_s}?", "Quantos mols de O2 são necessários para queimar {qn} de {co_s}?",
                              "Na queima de {qm} de {co_s}, quanto CO2 se forma?", "Quanto oxigênio é preciso para queimar {qm} de {co_s}?",
                              "Queimando {qn} de {co_s}, quantos mols de CO2 saem?", "Quanta água se forma na combustão de {qm} de {co_s}?"],
    "CONCENTRACAO": ["Diluir {qv} de {co_s} {qc} para {qc2}", "Diluição: {qv} de {co_s} {qc} para {qc2}", "Qual a molaridade de {qm} de {co_s} em {qv}?",
                     "Quantos gramas de {co_s} preciso para {qv} de solução {qc}?", "Como preparar {qv} de solução {qc} de {co_s}?", "Concentração de {qm} de {co_s} em {qv}",
                     "Dissolvi {qm} de {co_s} em {qv}. Qual a concentração?", "Quero diluir {qv} de {co_s} {qc} até {qc2}", "{qm} de {co_s} em {qv}: qual a concentração em g/L?",
                     "Que volume de {co_s} {qc} dá {qv} a {qc2}?"],
    "PH": ["Qual o pH de {co_s} {qc}?", "pH de uma solução {qc} de {co_s}", "pH {co_de} {qc}", "Calcule o pH de {co_s} {qc}", "Qual o pH {co_de}?", "pH {co_de}"],
}
M["en"] = {
    "COMPOSTO": ["What is {co}?", "what is {co_s}", "{co_s}", "{co_s}?", "{Co}", "Tell me about {co}", "Information about {co}", "What do you know about {co}?",
                 "data sheet {co_de}", "I want to know about {co}", "Overview {co_de}", "compound {co_s}", "substance {co_s}", "What is {co_s}?", "Explain what {co} is",
                 "What's {co}?", "tell me about {co_s}", "{co_s} what is it"],
    "PROPRIEDADE": ["What is {prop_art} {co_de}?", "{Prop} {co_de}", "{prop} {co_de}", "Tell me {prop_art} {co_de}", "{co_s}: {prop}", "I want to know {prop_art} {co_de}",
                    "{Prop} {co_de}?", "what is {prop_art} {co_de}", "Can you tell me {prop_art} {co_de}?", "What's {prop_art} {co_de}?"],
    "PROPRIEDADE_FIXA": [("At what temperature does {co} boil?", "pontoEbulicaoK"), ("When does {co} start boiling?", "pontoEbulicaoK"),
                         ("At what temperature does {co} melt?", "pontoFusaoK"), ("At what temperature does {co} freeze?", "pontoFusaoK"),
                         ("Is {co} soluble in water?", "solubilidade"), ("Does {co} dissolve in water?", "solubilidade"), ("How much does a liter {co_de} weigh?", "densidadeKgm3"),
                         ("Is {co} denser than water?", "densidadeKgm3"), ("What is the CAS number {co_de}?", "cas")],
    "MASSA_MOLAR": ["What is the molar mass {co_de}?", "molar mass {co_de}", "molecular weight {co_de}", "How much does one mole {co_de} weigh?", "molecular mass {co_de}",
                    "What is the molecular weight {co_de}?", "Calculate the molar mass {co_de}", "{co_s} molar mass", "How many grams in a mole {co_de}?"],
    "SEGURANCA": ["What are the hazards {co_de}?", "Is {co} dangerous?", "Is {co} toxic?", "Is {co} flammable?", "Is {co} harmful?", "Is {co} bad for your health?", "risks {co_de}",
                  "hazards {co_de}", "Which PPE should I use with {co_s}?", "First aid for {co_s} in the eyes", "first aid for a {co_s} splash on the skin",
                  "What should I do if {co_s} gets on my skin?", "What to do if someone swallows {co_s}?", "Why not mix {co_s} with {co2_s}?", "Can I mix {co_s} with {co2_s}?",
                  "How should I store {co_s}?", "How do I dispose of {co_s}?", "Is {co} corrosive?", "What are the symptoms of {co_s} poisoning?", "effects {co_de} on the body",
                  "What are the effects {co_de} on the human body?", "Safety data sheet {co_de}", "Precautions when handling {co_s}", "What happens if I inhale {co_s}?",
                  "can {co_s} explode?", "Is it safe to breathe {co_s}?", "Is it safe to mix {co_s} and {co2_s}?"],
    "ESTEQUIOMETRIA": ["How many moles are in {qm} of {co_s}?", "How many grams do {qn} of {co_s} weigh?", "What is the mass of {qn} of {co_s}?", "Convert {qm} of {co_s} to moles",
                       "{qm} of {co_s} is how many moles?", "How many molecules are in {qm} of {co_s}?", "{qn} of {co_s} weigh how much?"],
    "ESTEQUIOMETRIA_QUEIMA": ["How many grams of CO2 form when burning {qm} of {co_s}?", "How many moles of O2 are needed to burn {qn} of {co_s}?",
                              "Burning {qm} of {co_s}, how much CO2 is formed?", "How much oxygen is needed to burn {qm} of {co_s}?",
                              "Burning {qn} of {co_s}, how many moles of CO2 come out?", "How much water forms in the combustion of {qm} of {co_s}?"],
    "CONCENTRACAO": ["Dilute {qv} of {co_s} {qc} to {qc2}", "Dilution: {qv} of {co_s} {qc} to {qc2}", "What is the molarity of {qm} of {co_s} in {qv}?",
                     "How many grams of {co_s} do I need for {qv} of a {qc} solution?", "How do I prepare {qv} of a {qc} solution of {co_s}?", "Concentration of {qm} of {co_s} in {qv}",
                     "I dissolved {qm} of {co_s} in {qv}. What is the concentration?", "I want to dilute {qv} of {co_s} {qc} down to {qc2}", "{qm} of {co_s} in {qv}: concentration in g/L?",
                     "What volume of {co_s} {qc} gives {qv} at {qc2}?"],
    "PH": ["What is the pH of {co_s} {qc}?", "pH of a {qc} solution of {co_s}", "pH {co_de} {qc}", "Calculate the pH of {co_s} {qc}", "What is the pH {co_de}?", "pH {co_de}"],
}
M["es"] = {
    "COMPOSTO": ["¿Qué es {co}?", "qué es {co_s}", "{co_s}", "{co_s}?", "{Co}", "Háblame {co_de}", "Información sobre {co}", "¿Qué sabes sobre {co}?", "ficha {co_de}",
                 "Quiero saber sobre {co}", "Cuéntame sobre {co}", "Resumen {co_de}", "compuesto {co_s}", "sustancia {co_s}", "¿Qué es {co_s}?", "Explica qué es {co}",
                 "que es {co_s}", "{co_s} qué es"],
    "PROPRIEDADE": ["¿Cuál es {prop_art} {co_de}?", "{Prop} {co_de}", "{prop} {co_de}", "Dime {prop_art} {co_de}", "{co_s}: {prop}", "Quiero saber {prop_art} {co_de}",
                    "{Prop} {co_de}?", "cuál es {prop_art} {co_de}", "¿Puedes decirme {prop_art} {co_de}?", "¿Me dices {prop_art} {co_de}?"],
    "PROPRIEDADE_FIXA": [("¿A qué temperatura hierve {co}?", "pontoEbulicaoK"), ("¿Cuándo empieza a hervir {co}?", "pontoEbulicaoK"),
                         ("¿A qué temperatura se derrite {co}?", "pontoFusaoK"), ("¿A qué temperatura se congela {co}?", "pontoFusaoK"),
                         ("¿{Co} es soluble en agua?", "solubilidade"), ("¿{Co} se disuelve en agua?", "solubilidade"), ("¿Cuánto pesa un litro {co_de}?", "densidadeKgm3"),
                         ("¿{Co} es más denso que el agua?", "densidadeKgm3"), ("¿Cuál es el CAS {co_de}?", "cas")],
    "MASSA_MOLAR": ["¿Cuál es la masa molar {co_de}?", "masa molar {co_de}", "peso molecular {co_de}", "¿Cuánto pesa un mol {co_de}?", "masa molecular {co_de}",
                    "¿Cuál es el peso molecular {co_de}?", "Calcula la masa molar {co_de}", "{co_s} masa molar", "¿Cuántos gramos tiene un mol {co_de}?"],
    "SEGURANCA": ["¿Cuáles son los peligros {co_de}?", "¿{Co} es peligroso?", "¿{Co} es tóxico?", "¿{Co} es inflamable?", "¿{Co} hace daño?", "¿{Co} es malo para la salud?", "riesgos {co_de}",
                  "peligros {co_de}", "¿Qué EPP usar con {co_s}?", "Primeros auxilios por {co_s} en los ojos", "primeros auxilios por salpicadura de {co_s} en la piel",
                  "¿Qué hacer si {co_s} cae en la piel?", "¿Qué hacer si alguien traga {co_s}?", "¿Por qué no mezclar {co_s} con {co2_s}?", "¿Puedo mezclar {co_s} con {co2_s}?",
                  "¿Cómo almacenar {co_s}?", "¿Cómo desechar {co_s}?", "¿{Co} es corrosivo?", "¿Cuáles son los síntomas de intoxicación por {co_s}?", "efectos {co_de} en el cuerpo",
                  "¿Qué efectos tiene {co} en el organismo?", "Ficha de seguridad {co_de}", "Cuidados al manipular {co_s}", "¿Qué pasa si inhalo {co_s}?",
                  "¿{co_s} puede explotar?", "¿Es seguro respirar {co_s}?", "¿Es seguro mezclar {co_s} y {co2_s}?"],
    "ESTEQUIOMETRIA": ["¿Cuántos moles hay en {qm} de {co_s}?", "¿Cuántos gramos pesan {qn} de {co_s}?", "¿Cuál es la masa de {qn} de {co_s}?", "Convierte {qm} de {co_s} a moles",
                       "{qm} de {co_s} son cuántos moles?", "¿Cuántas moléculas hay en {qm} de {co_s}?", "¿{qn} de {co_s} pesan cuánto?"],
    "ESTEQUIOMETRIA_QUEIMA": ["¿Cuántos gramos de CO2 se forman al quemar {qm} de {co_s}?", "¿Cuántos moles de O2 se necesitan para quemar {qn} de {co_s}?",
                              "Al quemar {qm} de {co_s}, ¿cuánto CO2 se forma?", "¿Cuánto oxígeno hace falta para quemar {qm} de {co_s}?",
                              "Quemando {qn} de {co_s}, ¿cuántos moles de CO2 salen?", "¿Cuánta agua se forma en la combustión de {qm} de {co_s}?"],
    "CONCENTRACAO": ["Diluir {qv} de {co_s} {qc} a {qc2}", "Dilución: {qv} de {co_s} {qc} a {qc2}", "¿Cuál es la molaridad de {qm} de {co_s} en {qv}?",
                     "¿Cuántos gramos de {co_s} necesito para {qv} de solución {qc}?", "¿Cómo preparo {qv} de solución {qc} de {co_s}?", "Concentración de {qm} de {co_s} en {qv}",
                     "Disolví {qm} de {co_s} en {qv}. ¿Cuál es la concentración?", "Quiero diluir {qv} de {co_s} {qc} hasta {qc2}", "{qm} de {co_s} en {qv}: ¿concentración en g/L?",
                     "¿Qué volumen de {co_s} {qc} da {qv} a {qc2}?"],
    "PH": ["¿Cuál es el pH de {co_s} {qc}?", "pH de una solución {qc} de {co_s}", "pH {co_de} {qc}", "Calcula el pH de {co_s} {qc}", "¿Cuál es el pH {co_de}?", "pH {co_de}"],
}
M["de"] = {
    "COMPOSTO": ["Was ist {co}?", "was ist {co_s}", "{co_s}", "{co_s}?", "{Co}", "Erzähl mir etwas über {co_s}", "Informationen über {co_s}", "Was weißt du über {co_s}?",
                 "Steckbrief {co_de}", "Ich möchte etwas über {co_s} wissen", "Überblick {co_de}", "Verbindung {co_s}", "Stoff {co_s}", "Was ist {co_s}?", "Erkläre, was {co_s} ist",
                 "Was ist eigentlich {co_s}?", "{co_s} was ist das", "Beschreibe {co_s}"],
    "PROPRIEDADE": ["Was ist {prop_art} {co_de}?", "{Prop} {co_de}", "{prop} {co_de}", "Sag mir {prop_art} {co_de}", "{co_s}: {prop}", "Ich möchte {prop_art} {co_de} wissen",
                    "{Prop} {co_de}?", "was ist {prop_art} {co_de}", "Kannst du mir {prop_art} {co_de} sagen?", "Wie hoch ist {prop_art} {co_de}?"],
    "PROPRIEDADE_FIXA": [("Bei welcher Temperatur siedet {co_s}?", "pontoEbulicaoK"), ("Wann beginnt {co_s} zu kochen?", "pontoEbulicaoK"),
                         ("Bei welcher Temperatur schmilzt {co_s}?", "pontoFusaoK"), ("Bei welcher Temperatur gefriert {co_s}?", "pontoFusaoK"),
                         ("Ist {co_s} in Wasser löslich?", "solubilidade"), ("Löst sich {co_s} in Wasser?", "solubilidade"), ("Wie viel wiegt ein Liter {co_s}?", "densidadeKgm3"),
                         ("Ist {co_s} dichter als Wasser?", "densidadeKgm3"), ("Was ist die CAS-Nummer {co_de}?", "cas")],
    "MASSA_MOLAR": ["Was ist die molare Masse {co_de}?", "molare Masse {co_de}", "Molekulargewicht {co_de}", "Wie viel wiegt ein Mol {co_s}?", "Molmasse {co_de}",
                    "Wie groß ist das Molekulargewicht {co_de}?", "Berechne die molare Masse {co_de}", "{co_s} molare Masse", "Wie viele Gramm hat ein Mol {co_s}?"],
    "SEGURANCA": ["Welche Gefahren gehen von {co_s} aus?", "Ist {co_s} gefährlich?", "Ist {co_s} giftig?", "Ist {co_s} brennbar?", "Ist {co_s} schädlich?", "Ist {co_s} gesundheitsschädlich?",
                  "Risiken {co_de}", "Gefahren {co_de}", "Welche Schutzausrüstung brauche ich für {co_s}?", "Erste Hilfe bei {co_s} im Auge", "Erste Hilfe, wenn {co_s} auf die Haut spritzt",
                  "Was tun, wenn {co_s} auf die Haut kommt?", "Was tun, wenn jemand {co_s} verschluckt?", "Warum darf man {co_s} nicht mit {co2_s} mischen?", "Darf ich {co_s} mit {co2_s} mischen?",
                  "Wie lagere ich {co_s}?", "Wie entsorge ich {co_s}?", "Ist {co_s} ätzend?", "Welche Symptome hat eine Vergiftung mit {co_s}?", "Wirkung {co_de} auf den Körper",
                  "Wie wirkt {co_s} auf den menschlichen Körper?", "Sicherheitsdatenblatt {co_de}", "Vorsichtsmaßnahmen beim Umgang mit {co_s}", "Was passiert, wenn ich {co_s} einatme?",
                  "kann {co_s} explodieren?", "Ist es sicher, {co_s} einzuatmen?", "Ist es sicher, {co_s} und {co2_s} zu mischen?"],
    "ESTEQUIOMETRIA": ["Wie viele Mol sind in {qm} {co_s}?", "Wie viel wiegen {qn} {co_s}?", "Welche Masse haben {qn} {co_s}?", "Rechne {qm} {co_s} in Mol um",
                       "{qm} {co_s} sind wie viele Mol?", "Wie viele Moleküle sind in {qm} {co_s}?", "{qn} {co_s} wiegen wie viel?"],
    "ESTEQUIOMETRIA_QUEIMA": ["Wie viele Gramm CO2 entstehen beim Verbrennen von {qm} {co_s}?", "Wie viele Mol O2 braucht man, um {qn} {co_s} zu verbrennen?",
                              "Beim Verbrennen von {qm} {co_s}: wie viel CO2 entsteht?", "Wie viel Sauerstoff braucht man, um {qm} {co_s} zu verbrennen?",
                              "Wenn {qn} {co_s} verbrennen, wie viele Mol CO2 entstehen?", "Wie viel Wasser entsteht bei der Verbrennung von {qm} {co_s}?"],
    "CONCENTRACAO": ["{qv} {co_s} {qc} auf {qc2} verdünnen", "Verdünnung: {qv} {co_s} {qc} auf {qc2}", "Welche Molarität haben {qm} {co_s} in {qv}?",
                     "Wie viele Gramm {co_s} brauche ich für {qv} einer {qc} Lösung?", "Wie stelle ich {qv} einer {qc} Lösung von {co_s} her?", "Konzentration von {qm} {co_s} in {qv}",
                     "Ich habe {qm} {co_s} in {qv} gelöst. Wie hoch ist die Konzentration?", "Ich will {qv} {co_s} {qc} auf {qc2} verdünnen", "{qm} {co_s} in {qv}: Konzentration in g/L?",
                     "Welches Volumen {co_s} {qc} ergibt {qv} mit {qc2}?"],
    "PH": ["Welchen pH-Wert hat {co_s} {qc}?", "pH-Wert einer {qc} Lösung von {co_s}", "pH {co_de} {qc}", "Berechne den pH-Wert von {co_s} {qc}", "Welchen pH-Wert hat {co_s}?", "pH {co_de}"],
}
M["fr"] = {
    "COMPOSTO": ["Qu'est-ce que {co} ?", "qu'est-ce que {co_s}", "{co_s}", "{co_s} ?", "{Co}", "Parle-moi {co_de}", "Informations sur {co}", "Que sais-tu sur {co} ?",
                 "fiche {co_de}", "Je veux en savoir plus sur {co}", "Résumé {co_de}", "composé {co_s}", "substance {co_s}", "Qu'est-ce que {co_s} ?", "Explique ce qu'est {co}",
                 "c'est quoi {co_s}", "{co_s} c'est quoi", "Décris {co_s}"],
    "PROPRIEDADE": ["Quel est {prop_art} {co_de} ?", "{Prop} {co_de}", "{prop} {co_de}", "Dis-moi {prop_art} {co_de}", "{co_s} : {prop}", "Je veux connaître {prop_art} {co_de}",
                    "{Prop} {co_de} ?", "quel est {prop_art} {co_de}", "Peux-tu me donner {prop_art} {co_de} ?", "Donne-moi {prop_art} {co_de}"],
    "PROPRIEDADE_FIXA": [("À quelle température bout {co_s} ?", "pontoEbulicaoK"), ("Quand {co} commence-t-il à bouillir ?", "pontoEbulicaoK"),
                         ("À quelle température fond {co_s} ?", "pontoFusaoK"), ("À quelle température gèle {co_s} ?", "pontoFusaoK"),
                         ("{Co} est-il soluble dans l'eau ?", "solubilidade"), ("{Co} se dissout-il dans l'eau ?", "solubilidade"), ("Combien pèse un litre {co_de} ?", "densidadeKgm3"),
                         ("{Co} est-il plus dense que l'eau ?", "densidadeKgm3"), ("Quel est le numéro CAS {co_de} ?", "cas")],
    "MASSA_MOLAR": ["Quelle est la masse molaire {co_de} ?", "masse molaire {co_de}", "poids moléculaire {co_de}", "Combien pèse une mole {co_de} ?", "masse moléculaire {co_de}",
                    "Quel est le poids moléculaire {co_de} ?", "Calcule la masse molaire {co_de}", "{co_s} masse molaire", "Combien de grammes dans une mole {co_de} ?"],
    "SEGURANCA": ["Quels sont les dangers {co_de} ?", "{Co} est-il dangereux ?", "{Co} est-il toxique ?", "{Co} est-il inflammable ?", "{Co} est-il nocif ?", "{Co} est-il mauvais pour la santé ?",
                  "risques {co_de}", "dangers {co_de}", "Quel EPI utiliser avec {co_s} ?", "Premiers secours en cas de {co_s} dans les yeux", "premiers secours en cas de projection de {co_s} sur la peau",
                  "Que faire si {co_s} touche la peau ?", "Que faire si quelqu'un avale {co_s} ?", "Pourquoi ne pas mélanger {co_s} avec {co2_s} ?", "Puis-je mélanger {co_s} avec {co2_s} ?",
                  "Comment stocker {co_s} ?", "Comment éliminer {co_s} ?", "{Co} est-il corrosif ?", "Quels sont les symptômes d'une intoxication par {co_s} ?", "effets {co_de} sur le corps",
                  "Quels sont les effets {co_de} sur l'organisme ?", "Fiche de sécurité {co_de}", "Précautions pour manipuler {co_s}", "Que se passe-t-il si j'inhale {co_s} ?",
                  "{co_s} peut-il exploser ?", "Est-il sûr de respirer {co_s} ?", "Est-il sûr de mélanger {co_s} et {co2_s} ?"],
    "ESTEQUIOMETRIA": ["Combien de moles dans {qm} de {co_s} ?", "Combien pèsent {qn} de {co_s} ?", "Quelle est la masse de {qn} de {co_s} ?", "Convertis {qm} de {co_s} en moles",
                       "{qm} de {co_s} font combien de moles ?", "Combien de molécules dans {qm} de {co_s} ?", "{qn} de {co_s} pèsent combien ?"],
    "ESTEQUIOMETRIA_QUEIMA": ["Combien de grammes de CO2 se forment en brûlant {qm} de {co_s} ?", "Combien de moles de O2 faut-il pour brûler {qn} de {co_s} ?",
                              "En brûlant {qm} de {co_s}, combien de CO2 se forme ?", "Combien d'oxygène faut-il pour brûler {qm} de {co_s} ?",
                              "En brûlant {qn} de {co_s}, combien de moles de CO2 sortent ?", "Combien d'eau se forme dans la combustion de {qm} de {co_s} ?"],
    "CONCENTRACAO": ["Diluer {qv} de {co_s} {qc} vers {qc2}", "Dilution : {qv} de {co_s} {qc} vers {qc2}", "Quelle est la molarité de {qm} de {co_s} dans {qv} ?",
                     "Combien de grammes de {co_s} pour {qv} de solution {qc} ?", "Comment préparer {qv} de solution {qc} de {co_s} ?", "Concentration de {qm} de {co_s} dans {qv}",
                     "J'ai dissous {qm} de {co_s} dans {qv}. Quelle est la concentration ?", "Je veux diluer {qv} de {co_s} {qc} jusqu'à {qc2}", "{qm} de {co_s} dans {qv} : concentration en g/L ?",
                     "Quel volume de {co_s} {qc} donne {qv} à {qc2} ?"],
    "PH": ["Quel est le pH de {co_s} {qc} ?", "pH d'une solution {qc} de {co_s}", "pH {co_de} {qc}", "Calcule le pH de {co_s} {qc}", "Quel est le pH {co_de} ?", "pH {co_de}"],
}

# propriedades em pt-BR (os outros idiomas usam PROP_COMPOSTO do módulo de idioma); só as que fazem sentido para compostos do cotidiano
PROP_PT = {
    "pontoEbulicaoK": [("o", "ponto de ebulição"), ("a", "temperatura de ebulição")], "pontoFusaoK": [("o", "ponto de fusão"), ("a", "temperatura de fusão")],
    "densidadeKgm3": [("a", "densidade")], "solubilidade": [("a", "solubilidade")], "cas": [("o", "número CAS"), ("o", "CAS")], "pka": [("o", "pKa")],
}
PROPS = sorted(PROP_PT)
# cotas por intenção e idioma (pt-BR recebe 1,6×: é o idioma do app)
COTA = {"COMPOSTO": 260, "PROPRIEDADE": 300, "MASSA_MOLAR": 160, "SEGURANCA": 420, "ESTEQUIOMETRIA": 160, "ESTEQUIOMETRIA_QUEIMA": 120, "CONCENTRACAO": 180, "PH": 110}
INTENT_DE = {"PROPRIEDADE_FIXA": "PROPRIEDADE", "ESTEQUIOMETRIA_QUEIMA": "ESTEQUIOMETRIA"}
# Perguntas pelo NOME do elemento (contrapeso aos compostos: "oxigênio", "ferro", "enxofre" são ELEMENTO, nunca composto).
# {el_s} nome cru | {El} nome com inicial maiúscula | {el} com artigo do idioma | {el_de} com "de" + artigo. Alvo: elemento = símbolo.
# PROPRIEDADE aqui é só a massa atômica: no golden "massa atômica do oxigênio" é PROPRIEDADE/massaAtomica e "massa molar do enxofre" é
# MASSA_MOLAR (o v3.2 misturou as duas sob MASSA_MOLAR e errou propriedade em pt-BR).
COTA_ELEMENTO = {"ELEMENTO": 130, "MASSA_MOLAR": 60, "PROPRIEDADE": 50, "SEGURANCA": 60}
PROPRIEDADE_ELEMENTO = "massaAtomica"
# os que o v3.1 confundiu com composto (gases elementares do pacote) e os metais/nao metais do dia a dia pesam 12x; Z <= 36 e metais conhecidos 4x
ELEMENTOS_MUITO_COMUNS = {"O", "H", "N", "Cl", "C", "S", "Fe", "Na", "K", "Ca", "Mg", "Al", "Cu", "Zn", "Ag", "Au", "Hg", "Pb", "He", "Ne", "Ar", "F", "Br", "I", "P", "Si", "Sn", "Ni"}
ELEMENTOS_COMUNS = {"Ag", "Au", "Hg", "Pb", "Sn", "Pt", "W", "U", "I", "Ba", "Sr", "Cs", "Ra", "Rn", "Xe", "Kr", "Cd", "Bi", "Pd"}
M_EL = {
    "pt-BR": {
        "ELEMENTO": ["Fale sobre {el}", "{el_s}", "{El}", "{el_s}?", "O que é {el}?", "o que é {el_s}", "Informações sobre {el}", "Me fale {el_de}",
                     "Quero saber sobre {el}", "Conte-me sobre {el}", "{El}, o que é?", "me fala {el_de}"],
        "MASSA_MOLAR": ["massa molar {el_de}", "Massa molar: {el_s}", "quanto pesa um mol de {el_s}?", "Qual a massa molar {el_de}?", "massa molar {el_s}"],
        "PROPRIEDADE": ["Massa atômica {el_de}", "qual a massa atômica {el_de}?", "massa atomica {el_de}", "massa atômica {el_s}", "Qual é a massa atômica {el_de}?"],
        "SEGURANCA": ["Perigos {el_de}", "{El} é tóxico?", "O que fazer em caso de inalação de {el_s}?", "{el_s} faz mal à saúde?", "riscos {el_de}",
                      "primeiros socorros: {el_s}", "{el_s} é perigoso?"],
    },
    "en": {
        "ELEMENTO": ["Tell me about {el}", "{el_s}", "{El}", "{el_s}?", "What is {el}?", "what is {el_s}", "Information about {el}", "What do you know about {el}?",
                     "I want to know about {el}", "{El}, what is it?"],
        "MASSA_MOLAR": ["molar mass of {el}", "Molar mass: {el_s}", "how much does one mole of {el_s} weigh?", "What is the molar mass of {el_s}?"],
        "PROPRIEDADE": ["Atomic mass of {el}", "what is the atomic mass of {el_s}?", "atomic mass {el_s}", "atomic weight of {el_s}"],
        "SEGURANCA": ["Hazards of {el}", "Is {el_s} toxic?", "What to do after inhaling {el_s}?", "is {el_s} harmful to health?", "first aid: {el_s}", "is {el_s} dangerous?"],
    },
    "es": {
        "ELEMENTO": ["Háblame {el_de}", "{el_s}", "{El}", "{el_s}?", "¿Qué es {el}?", "qué es {el_s}", "Información sobre {el}", "¿Qué sabes sobre {el}?",
                     "ficha {el_de}", "Quiero saber sobre {el}"],
        "MASSA_MOLAR": ["masa molar {el_de}", "Masa molar: {el_s}", "¿cuánto pesa un mol de {el_s}?", "¿Cuál es la masa molar {el_de}?"],
        "PROPRIEDADE": ["Masa atómica {el_de}", "¿cuál es la masa atómica {el_de}?", "masa atomica {el_de}", "peso atómico {el_de}"],
        "SEGURANCA": ["Peligros {el_de}", "¿{El} es tóxico?", "¿Qué hacer tras inhalar {el_s}?", "¿{el_s} es dañino para la salud?", "primeros auxilios: {el_s}",
                      "¿{el_s} es peligroso?"],
    },
    "de": {
        "ELEMENTO": ["Erzähl mir etwas über {el_s}", "{el_s}", "{El}", "{el_s}?", "Was ist {el_s}?", "was ist {el_s}", "Informationen über {el_s}",
                     "Was weißt du über {el_s}?", "Steckbrief {el_s}", "Ich möchte mehr über {el_s} wissen"],
        "MASSA_MOLAR": ["molare Masse von {el_s}", "Molare Masse: {el_s}", "wie viel wiegt ein Mol {el_s}?", "Was ist die molare Masse von {el_s}?"],
        "PROPRIEDADE": ["Atommasse von {el_s}", "wie groß ist die Atommasse von {el_s}?", "Atomgewicht von {el_s}", "atommasse {el_s}"],
        "SEGURANCA": ["Gefahren von {el_s}", "Ist {el_s} giftig?", "Was tun nach dem Einatmen von {el_s}?", "ist {el_s} gesundheitsschädlich?", "Erste Hilfe: {el_s}",
                      "ist {el_s} gefährlich?"],
    },
    "fr": {
        "ELEMENTO": ["Parle-moi {el_de}", "{el_s}", "{El}", "{el_s} ?", "Qu'est-ce que {el} ?", "qu'est-ce que {el_s}", "Informations sur {el}",
                     "Que sais-tu sur {el} ?", "fiche {el_de}", "Je veux en savoir plus sur {el}"],
        "MASSA_MOLAR": ["masse molaire {el_de}", "Masse molaire : {el_s}", "combien pèse une mole de {el_s} ?", "Quelle est la masse molaire {el_de} ?"],
        "PROPRIEDADE": ["Masse atomique {el_de}", "quelle est la masse atomique {el_de} ?", "masse atomique {el_s}", "poids atomique {el_de}"],
        "SEGURANCA": ["Dangers {el_de}", "{El} est-il toxique ?", "Que faire en cas d'inhalation de {el_s} ?", "{el_s} est-il nocif pour la santé ?",
                      "premiers secours : {el_s}", "{el_s} est-il dangereux ?"],
    },
}
VALS = {
    "g": ["1", "2", "2.5", "5", "10", "16", "20", "25", "40", "50", "100", "0.5", "250", "500"], "mg": ["5", "10", "50", "100", "250", "500"], "kg": ["1", "2", "5", "0.5"],
    "mL": ["10", "25", "50", "100", "200", "250", "500"], "L": ["0.5", "1", "2", "5", "1.5", "0.25", "10"],
    "mol/L": ["0.1", "0.5", "1", "2", "0.01", "0.05", "0.2", "1.5", "0.25", "3"], "mol": ["0.5", "1", "2", "3", "0.1", "5", "10", "0.25", "4"], "mmol": ["5", "10", "50", "100"],
}
PALAVRAS = {  # unidade -> (singular, plural) por idioma, usadas em ~25 % das quantidades
    "pt-BR": {"g": ("grama", "gramas"), "L": ("litro", "litros"), "mL": ("mililitro", "mililitros"), "mol": ("mol", "mols"), "kg": ("quilo", "quilos")},
    "en": {"g": ("gram", "grams"), "L": ("liter", "liters"), "mL": ("milliliter", "milliliters"), "mol": ("mole", "moles"), "kg": ("kilogram", "kilograms")},
    "es": {"g": ("gramo", "gramos"), "L": ("litro", "litros"), "mL": ("mililitro", "mililitros"), "mol": ("mol", "moles"), "kg": ("kilo", "kilos")},
    "de": {"g": ("Gramm", "Gramm"), "L": ("Liter", "Liter"), "mL": ("Milliliter", "Milliliter"), "mol": ("Mol", "Mol"), "kg": ("Kilogramm", "Kilogramm")},
    "fr": {"g": ("gramme", "grammes"), "L": ("litre", "litres"), "mL": ("millilitre", "millilitres"), "mol": ("mole", "moles"), "kg": ("kilogramme", "kilogrammes")},
}
CONC_FORMAS = {  # mol/L: formas escritas por idioma (a unidade canônica continua "mol/L")
    "pt-BR": ["mol/L", "mol/L", "M", "molar", "mol por litro"], "en": ["mol/L", "mol/L", "M", "molar"], "es": ["mol/L", "mol/L", "M", "molar"],
    "de": ["mol/L", "mol/L", "M", "molar"], "fr": ["mol/L", "mol/L", "M", "molaire"],
}
DECIMAL = {"pt-BR": ",", "en": ".", "es": ",", "de": ",", "fr": ","}
PREFIXOS = {
    "pt-BR": ["", "", "", "", "oi, ", "por favor, ", "me diga: ", "rapidinho: ", "preciso saber: ", "ei, "],
    "en": ["", "", "", "", "hi, ", "please, ", "tell me: ", "quick question: ", "I need to know: ", "hey, "],
    "es": ["", "", "", "", "hola, ", "por favor, ", "dime: ", "una pregunta: ", "necesito saber: ", "oye, "],
    "de": ["", "", "", "", "hallo, ", "bitte: ", "sag mir: ", "kurze Frage: ", "ich muss wissen: ", "hey, "],
    "fr": ["", "", "", "", "bonjour, ", "s'il te plaît, ", "dis-moi : ", "petite question : ", "j'ai besoin de savoir : ", "salut, "],
}
SUFIXOS = {
    "pt-BR": ["", "", "", "", " por favor", " pfv", " obrigado", " rapidinho"], "en": ["", "", "", "", " please", " pls", " thanks"],
    "es": ["", "", "", "", " por favor", " gracias", " porfa"], "de": ["", "", "", "", " bitte", " danke"], "fr": ["", "", "", "", " s'il te plaît", " merci", " stp"],
}


def fold(s: str) -> str:
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower().strip()


def _dataset():
    if str(DATASET) not in sys.path:
        sys.path.insert(0, str(DATASET))
    import comum  # noqa: E402
    import pacote  # noqa: E402
    return comum, pacote


def carregar_moldes(idioma: str):
    caminho = AQUI / "quimica_idiomas" / f"{idioma}.py"
    spec = importlib.util.spec_from_file_location(f"quimica_idiomas_{idioma}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def chave_estavel(s: str, seed: int, mod: int = 1000) -> int:
    import hashlib
    return int(hashlib.sha1(f"{seed}|{s}".encode("utf-8")).hexdigest()[:8], 16) % mod


def compostos_cotidiano(pac) -> list:
    """Compostos com `nomePopular` ∪ CIDS_COTIDIANO, com nome, fórmula, sem pendência de nome e que NÃO sejam substância elementar."""
    cids = set(CIDS_COTIDIANO) | {c["cid"] for c in pac.compostos if c.get("nomePopular")}
    saida = []
    for cid in sorted(cids):
        c = pac.comp_cid.get(cid)
        if not c or pac.comp_pendente(c) or not (c.get("formula") or c.get("formulaHill")) or eh_elementar(c):
            continue
        saida.append(c)
    return saida


_SINONIMO_RUIM = re.compile(
    r"\d|[(),;:/\[\]]|\b[A-Za-z]-[A-Za-z]|l[öo]e?sung|hydrat|hidrat"  # dígitos, pontuação técnica, prefixos de uma letra (D-Glc, t-butyl), "-lösung", "-hydrat"
    # radicais técnicos (casam com o começo da palavra: anhydrous, hidratado, solutions, intoxication...)
    r"|\b(estrutura|structure|strukt|molecul|molécul|molekül|sintese|síntese|synthes|intoxica|poison|vergift|factor|fator|acidum|kyseliny|glacial|troposf|"
    r"gasotrans|relaxing|activated|all-trans|anhydr|anidr|wasserfrei|hydrat|hidrat|solution|solu[cç][aã]o|lösung|unspecified|technical|signal|substance|"
    r"anhidr|di-?hydrog|di-?hidrog|diwasserstoff|hydroxide d|oxide de dihydrog)"
    # palavras inteiras (frases e produtos, não nomes)
    r"|\b(liver|mono|pure|pura|puro|grade|et|y|e|und|and|of|de la|du|des|the|der|die|das|as)\b", re.I)


def sinonimo_popular(s: str, nome) -> bool:
    """Sinônimo curto, como as pessoas escrevem: até 3 palavras e 26 caracteres, só letras/espaços/hífen/apóstrofo, sem termos técnicos ou
    frases ("Estrutura química do colesterol", "hypochlorous acid, sodium salt", "monóxido de di-hidrogênio" caem fora)."""
    s = s.strip()
    if not s or len(s) > 26 or len(s.split()) > 3 or fold(s) == fold(nome or ""):
        return False
    if not re.fullmatch(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*", s):
        return False
    if s.isupper() and len(s) <= 6:  # siglas (HMGR, DMF, PBS, ATP) não são como a pessoa pergunta por "aspirina"
        return False
    return not _SINONIMO_RUIM.search(s)


def superficies(c, idioma: str) -> list:
    """[(texto, tipo)] como as pessoas escrevem o composto no idioma: nome do idioma, popular/sinônimos do idioma, fórmula (também em minúsculas)."""
    nomes = c.get("nomes") or {}
    nome = c.get("nome") if idioma == "pt-BR" else nomes.get(idioma)
    out = []
    if nome and SINONIMO_OK.match(nome) and len(nome) <= 40:
        out.append((nome, "nome"))
    extras = []
    if idioma == "pt-BR" and c.get("nomePopular"):
        extras.append(c["nomePopular"])
    extras += list((c.get("sinonimosPorIdioma") or {}).get(idioma) or [])
    for s in extras:
        if sinonimo_popular(s, nome):
            out.append((s, "popular"))
    formula = c.get("formula") or c.get("formulaHill")
    if formula and len(formula) <= 12 and re.match(r"^[A-Za-z0-9()]+$", formula):
        out.append((formula, "formula"))
    return out


class Gerador:
    def __init__(self, pac, idioma: str, rng: random.Random, comum, mod):
        self.pac, self.idioma, self.rng, self.comum, self.mod = pac, idioma, rng, comum, mod
        self.compostos = [c for c in compostos_cotidiano(pac) if superficies(c, idioma)]
        self.elementos = [e for e in getattr(pac, "elementos", []) if self._nome_elemento(e)]
        self.pesos_el = [12 if e["simbolo"] in ELEMENTOS_MUITO_COMUNS else 4 if (e.get("z", 99) <= 36 or e["simbolo"] in ELEMENTOS_COMUNS) else 1
                         for e in self.elementos]
        self.props = sorted(PROP_PT) if idioma == "pt-BR" else [p for p in PROPS if p in getattr(mod, "PROP_COMPOSTO", {})]

    # -- elemento (pelo nome) ----------------------------------------------------------------------------
    def _nome_elemento(self, e):
        nomes = e.get("nomes") or {}
        nome = nomes.get(self.idioma) or (e.get("nome") if self.idioma == "pt-BR" else None)
        return nome if nome and SINONIMO_OK.match(nome) else None

    def _erro_digitacao(self, texto: str) -> str:
        """Como no golden ("ferrro", "hierrro", "Quecksilbr", "souffre"): dobra ou come uma letra do meio, sem mexer na inicial."""
        if len(texto) < 5:
            return texto
        i = self.rng.randrange(2, len(texto) - 1)
        if not texto[i].isalpha():
            return texto
        return texto[:i] + texto[i] + texto[i:] if self.rng.random() < 0.5 else texto[:i] + texto[i + 1:]

    def amostra_elemento(self, intent: str, template: str):
        rng = self.rng
        e = rng.choices(self.elementos, weights=self.pesos_el)[0]
        texto = self._nome_elemento(e)
        r = rng.random()
        if self.idioma == "de":
            texto = texto[:1].upper() + texto[1:] if r < 0.85 else texto
        elif r < 0.55:
            texto = texto[:1].lower() + texto[1:]
        elif r < 0.75:
            texto = texto[:1].upper() + texto[1:]
        elif r < 0.80:
            texto = fold(texto)
        if rng.random() < 0.08:
            texto = self._erro_digitacao(texto)
        valores = {}
        for n in PLACEHOLDER.findall(template):
            if n == "el_s":
                valores[n] = texto
            elif n == "El":
                valores[n] = texto[:1].upper() + texto[1:]
            elif n == "el":
                valores[n] = self._com_prep(texto, "", "elemento")
            elif n == "el_de":
                valores[n] = self._com_prep(texto, "de", "elemento")
            else:
                raise ValueError(f"placeholder desconhecido {{{n}}} em {template!r}")
        q = template
        for n, v in valores.items():
            q = q.replace("{" + n + "}", v)
        q = self._cortesia(q)
        if texto not in q:
            return None
        alvo = {"intent": intent, "elemento": e["simbolo"]}
        if intent == "PROPRIEDADE":
            alvo["propriedade"] = PROPRIEDADE_ELEMENTO
        return q, alvo, f"el:{e['simbolo']}"

    # -- composto ----------------------------------------------------------------------------------------
    def _co(self, c):
        """(texto como aparece na pergunta, tipo) — favorece os nomes populares/sinônimos (o que o corpus v3 não tinha)."""
        sups = superficies(c, self.idioma)
        n_pop = sum(1 for _, t in sups if t == "popular") or 1
        # nome 40 % | populares/sinônimos 45 % no total (os mais curtos pesam mais) | fórmula 15 %
        pesos = [{"nome": 0.40, "popular": 0.45 / n_pop * (2.0 / max(1, len(x.split()))), "formula": 0.15}[t] for x, t in sups]
        texto, tipo = self.rng.choices(sups, weights=pesos)[0]
        r = self.rng.random()
        if tipo == "formula":
            if r < 0.25:
                texto = texto.lower()  # "hcl", "nacl": o usuário digita assim; o composto é copiado como está
        elif self.idioma == "de":
            texto = texto[:1].upper() + texto[1:] if r < 0.85 else texto
        elif r < 0.55:
            texto = texto[:1].lower() + texto[1:] if not texto[:2].isupper() else texto
        elif r < 0.75:
            texto = texto[:1].upper() + texto[1:]
        elif r < 0.80:
            texto = fold(texto)  # sem acentos
        return texto, ("formula" if tipo == "formula" else "composto")

    def _genero_pt(self, texto, tipo):
        if tipo == "formula":
            return "o"
        return self.comum.genero(texto)

    def _com_prep(self, texto, prep, tipo):
        """Expressão com o nome dentro, com artigo/preposição do idioma. prep: "" | "de"."""
        if self.idioma != "pt-BR":
            return self.mod.com_prep(texto, prep, tipo, self.rng)
        g = self._genero_pt(texto, tipo)
        if prep == "de":
            return f"{'do' if g == 'o' else 'da'} {texto}"
        return f"{g} {texto}"

    # -- quantidades -------------------------------------------------------------------------------------
    def _numero(self, num: str) -> str:
        return num.replace(".", DECIMAL[self.idioma])

    def _quant(self, tipo):
        rng = self.rng
        unidade = {"m": rng.choices(["g", "mg", "kg"], weights=[8, 1, 1])[0], "v": rng.choices(["mL", "L"], weights=[55, 45])[0], "c": "mol/L",
                   "n": rng.choices(["mol", "mmol"], weights=[9, 1])[0]}[tipo]
        num = rng.choice(VALS[unidade])
        valor = float(num)
        valor = int(valor) if valor == int(valor) else valor
        palavras = PALAVRAS[self.idioma]
        if unidade == "mol/L":
            forma = rng.choice(CONC_FORMAS[self.idioma])
            sep = "" if forma == "M" and rng.random() < 0.7 else " "
        elif unidade in palavras and rng.random() < 0.25:
            s, p = palavras[unidade]
            forma, sep = (p if valor > 1 else s), " "
        else:
            forma, sep = unidade, (" " if rng.random() < 0.8 else "")
        return f"{self._numero(num)}{sep}{forma}", {"valor": valor, "unidade": unidade}

    # -- uma amostra -------------------------------------------------------------------------------------
    def amostra(self, grupo: str, template: str, prop_fixa=None):
        rng = self.rng
        intent = INTENT_DE.get(grupo, grupo)
        pool = self.compostos
        if grupo == "ESTEQUIOMETRIA_QUEIMA":
            pool = [c for c in pool if c["cid"] in CIDS_COMBUSTIVEL]
        if grupo in ("CONCENTRACAO", "PH"):
            pool = [c for c in pool if c["cid"] != 962] or pool  # água não é soluto
        if prop_fixa == "solubilidade":
            pool = [c for c in pool if c["cid"] not in CIDS_SEM_SOLUBILIDADE] or pool
        c = rng.choice(pool)
        texto, tipo = self._co(c)
        nomes = PLACEHOLDER.findall(template)
        valores, quant = {}, []
        alvo = {"intent": intent, "composto": texto}
        for n in nomes:
            if n in valores:
                continue
            if n == "co_s":
                valores[n] = texto
            elif n == "co":
                valores[n] = self._com_prep(texto, "", tipo)
            elif n == "Co":
                x = self._com_prep(texto, "", tipo)
                valores[n] = x if tipo == "formula" else x[:1].upper() + x[1:]
            elif n == "co_de":
                valores[n] = self._com_prep(texto, "de", tipo)
            elif n == "co2_s":
                c2 = rng.choice([x for x in self.compostos if x is not c])
                valores[n] = self._co(c2)[0]
            elif n in ("qm", "qv", "qc", "qc2", "qn"):
                t = {"qm": "m", "qv": "v", "qc": "c", "qc2": "c", "qn": "n"}[n]
                txt, q = self._quant(t)
                if n == "qc2":
                    anteriores = {x["valor"] for x in quant if x["unidade"] == "mol/L"}
                    while q["valor"] in anteriores:
                        txt, q = self._quant(t)
                valores[n] = txt
                quant.append(q)
            elif n in ("prop", "Prop", "prop_art"):
                pid = prop_fixa or rng.choice(self.props)
                tabela = PROP_PT if self.idioma == "pt-BR" else self.mod.PROP_COMPOSTO
                art, txt = rng.choice(tabela[pid])
                alvo["propriedade"] = pid
                junto = f"{art}{txt}" if art.endswith("'") else f"{art} {txt}"
                valores["prop"], valores["Prop"], valores["prop_art"] = txt, txt[:1].upper() + txt[1:], junto
            else:
                raise ValueError(f"placeholder desconhecido {{{n}}} em {template!r}")
        if prop_fixa:
            alvo["propriedade"] = prop_fixa
        q = template
        for n, v in valores.items():
            q = q.replace("{" + n + "}", v)
        # quantidades na ordem em que aparecem na pergunta (os placeholders já estão nessa ordem)
        if quant:
            alvo["quantidades"] = quant
        q = self._cortesia(q)
        if texto not in q:
            return None
        return q, alvo, f"pop:{c['cid']}"

    def _cortesia(self, q: str) -> str:
        rng = self.rng
        if rng.random() < 0.30:
            p = rng.choice(PREFIXOS[self.idioma])
            if p:
                q = p + (q[:1].lower() + q[1:] if self.idioma != "de" and not q[:2].isupper() else q)
        if rng.random() < 0.15:
            q = q.rstrip(" ?") + rng.choice(SUFIXOS[self.idioma])
        if self.idioma == "fr":  # elisão: "de acétone" -> "d'acétone" (o nome do composto não muda)
            q = re.sub(r"\b([Dd])e ([aeiouyàâäéèêëîïôöûüAEIOUYÀÂÉÈÊËÎÏÔÛ])", r"\1'\2", q)
        return re.sub(r"\s+", " ", q).strip()


def gerar_idioma(pac, idioma: str, seed: int = 2026, escala: float = 1.0, ds=None):
    """Lista de registros {q, alvo, idioma, _lado} e estatísticas, como em quimica_multilingue.gerar_idioma."""
    comum, _pacote = ds or _dataset()
    mod = carregar_moldes(idioma) if idioma != "pt-BR" else None
    rng = random.Random(f"{seed}-populares-{idioma}")
    g = Gerador(pac, idioma, rng, comum, mod)
    amostras = {}

    def guardar(q, alvo, chave):
        alvo = {k: alvo[k] for k in KEYS if k in alvo}
        q = re.sub(r"\s+", " ", q).strip()
        if not q or len(q) > 300:
            return False
        k = (" ".join(re.findall(r"[a-z0-9]+", fold(q))), json.dumps(alvo, sort_keys=True, ensure_ascii=False))
        if k in amostras:
            return False
        amostras[k] = (q, alvo, chave)
        return True

    fator = escala * (1.6 if idioma == "pt-BR" else 1.0)
    for grupo, meta in COTA.items():
        meta = int(meta * fator)
        if grupo == "PROPRIEDADE":
            modelos = [(t, None) for t in M[idioma]["PROPRIEDADE"]] + list(M[idioma]["PROPRIEDADE_FIXA"])
        else:
            modelos = [(t, None) for t in M[idioma][grupo]]
        feitos = tent = 0
        while feitos < meta and tent < meta * 40:
            tent += 1
            t, pf = rng.choice(modelos)
            r = g.amostra(grupo, t, pf)
            if r and guardar(*r):
                feitos += 1
    for intent, meta in COTA_ELEMENTO.items():
        meta = int(meta * fator)
        feitos = tent = 0
        while g.elementos and feitos < meta and tent < meta * 40:
            tent += 1
            r = g.amostra_elemento(intent, rng.choice(M_EL[idioma][intent]))
            if r and guardar(*r):
                feitos += 1
    registros = []
    for q, alvo, chave in amostras.values():
        lado = "holdout" if chave_estavel(f"{idioma}|{chave}", seed) < HOLDOUT_POR_MIL else "treino"
        registros.append({"q": q, "alvo": alvo, "idioma": idioma, "_lado": lado})
    stats = {"idioma": idioma, "gerados": len(registros), "compostos_no_pool": len(g.compostos), "elementos_no_pool": len(g.elementos),
             "por_intencao": dict(sorted(Counter(r["alvo"]["intent"] for r in registros).items()))}
    return registros, stats


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--idioma", default="pt-BR", choices=IDIOMAS)
    ap.add_argument("--n", type=int, default=30)
    ap.add_argument("--escala", type=float, default=1.0)
    a = ap.parse_args(argv)
    comum, pacote = _dataset()
    pac = pacote.localizar(None)
    regs, st = gerar_idioma(pac, a.idioma, 2026, a.escala, (comum, pacote))
    rng = random.Random(1)
    for r in rng.sample(regs, min(a.n, len(regs))):
        print(r["q"], "->", json.dumps(r["alvo"], ensure_ascii=False))
    print(json.dumps(st, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    sys.exit(main())
