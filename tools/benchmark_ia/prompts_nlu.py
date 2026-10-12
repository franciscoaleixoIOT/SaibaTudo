# -*- coding: utf-8 -*-
"""
Instrução de sistema do NLU para modelos SEM ajuste (zero/few-shot), uma por app, IGUAL para todos os candidatos.

- Texto em português (como o produto), com a lista de intenções explicada em uma linha cada, o vocabulário das entidades e exemplos
  tirados do conjunto de TREINO (nunca do golden nem do holdout; a seleção é determinística: o primeiro exemplo de cada intenção por hash).
- A química recebe ainda 4 exemplos escritos à mão em en/es/de/fr (conferidos: nenhum está no golden nem tem Jaccard >= 0,6 com um caso).
- A saída é sempre restringida pela GRAMÁTICA de produção de cada app (nlu_core.grammar_for("v2") / nlu_core.grammar()); a validade
  NATIVA (sem gramática) é medida à parte numa amostra.
"""
import hashlib
import json

import comum as C

_INTENCOES_ELEICOES = [
    ("LISTAR_CANDIDATOS", "listar candidatos (por cargo, UF, partido, tema do plano, histórico)"),
    ("PERFIL_CANDIDATO", "quem é / dados de um candidato específico citado pelo nome"),
    ("CONTAR", "quantos candidatos existem (contagens)"),
    ("PESQUISAS", "pesquisas eleitorais registradas, institutos"),
    ("CALENDARIO", "datas e prazos da eleição (turnos, diplomação, posse)"),
    ("LOCAL_VOTACAO", "onde votar, documentos aceitos, título, biometria, justificativa"),
    ("REGRAS_URNA", "dígitos do número de cada cargo, o que pode levar à cabine, funcionamento da urna"),
    ("REGRAS_VOTO", "voto nulo/branco, obrigatoriedade, quem precisa votar, como os votos contam"),
    ("SENADO_DOIS_VOTOS", "por que se vota em dois senadores, vagas do Senado"),
    ("ELEGIBILIDADE", "ficha limpa, candidatura deferida/indeferida, situação do registro"),
    ("PLANO_GOVERNO", "propostas e plano de governo registrados"),
    ("CONTAS_CAMPANHA", "receitas, despesas e custo da campanha"),
    ("RESULTADOS", "quem venceu/foi eleito, apuração, votação"),
    ("SEGUNDO_TURNO", "quem está no 2º turno, se haverá 2º turno"),
    ("PATRIMONIO", "bens declarados pelos candidatos"),
    ("FONTES", "sites e links oficiais (TSE, TREs)"),
    ("SOBRE_DADOS", "origem, atualização e oficialidade dos dados do aplicativo"),
    ("SIMULADOR", "simular o voto na urna"),
    ("AJUDA", "saudação, agradecimento, o que o aplicativo faz"),
    ("RECOMENDACAO", "pede recomendação, opinião, comparação ou previsão (em quem votar, quem é melhor, quem vai ganhar)"),
    ("DESCONHECIDA", "fora do tema eleições, texto sem sentido ou pergunta sobre a opinião do assistente"),
]

_INTENCOES_QUIMICA = [
    ("ELEMENTO", "ficha/resumo de um elemento químico"),
    ("COMPOSTO", "ficha/resumo de um composto ou substância"),
    ("PROPRIEDADE", "uma propriedade de um elemento ou composto (ponto de fusão, densidade, grupo, eletronegatividade...)"),
    ("MASSA_MOLAR", "massa molar de uma fórmula ou composto"),
    ("BALANCEAR", "balancear uma equação química"),
    ("ESTEQUIOMETRIA", "mols, massas, moléculas, reagente limitante a partir de quantidades"),
    ("CONCENTRACAO", "preparar solução, molaridade, diluição"),
    ("PH", "calcular ou explicar pH"),
    ("GAS_IDEAL", "PV = nRT: volume, pressão, temperatura ou mols de um gás"),
    ("CONVERSAO_UNIDADE", "converter unidades (temperatura, pressão, energia, massa, volume, tempo)"),
    ("NOMENCLATURA", "nome a partir da fórmula ou fórmula a partir do nome"),
    ("DESENHAR", "mostrar/desenhar a estrutura de uma molécula"),
    ("COMPARAR", "comparar elementos ou compostos numa propriedade"),
    ("TABELA_PERIODICA", "perguntas sobre a tabela periódica (grupos, períodos, qual elemento tem tal número atômico)"),
    ("SEGURANCA", "perigos, frases H/P, pictogramas GHS, EPI, primeiros socorros, descarte"),
    ("CONCEITO", "explicar um conceito de química"),
    ("RECUSA_PERIGO", "pedido perigoso: síntese de explosivos, armas químicas, drogas, venenos, 'como fazer em casa'"),
    ("SOBRE_DADOS", "versão, origem e funcionamento offline dos dados do aplicativo"),
    ("FONTES", "pede as fontes/referências"),
    ("AJUDA", "saudação, agradecimento, o que o aplicativo faz"),
    ("DESCONHECIDA", "fora do tema química ou texto sem sentido"),
]

# Exemplos multilíngues escritos à mão para o benchmark (não estão no golden)
_EXEMPLOS_QUIMICA_EXTRA = [
    ("What is the boiling point of ethanol?", {"intent": "PROPRIEDADE", "composto": "ethanol", "propriedade": "pontoEbulicaoK"}),
    ("Dime los riesgos del amoníaco para la salud", {"intent": "SEGURANCA", "composto": "amoníaco"}),
    ("Rechne 3 bar in kPa um", {"intent": "CONVERSAO_UNIDADE", "quantidades": [{"valor": 3, "unidade": "bar"}], "unidadeDestino": "kPa"}),
    ("Parle-moi du magnésium", {"intent": "ELEMENTO", "elemento": "Mg"}),
]


def _h(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def exemplos_eleicoes(n_por_intencao: int = 1) -> list:
    dados = C.ler_json(C.TREINO_ELEICOES)
    por = {}
    for r in sorted(dados, key=lambda r: _h(r["input"])):
        if len(r["input"]) > 90:
            continue
        lst = por.setdefault(r["intent"], [])
        if len(lst) < n_por_intencao:
            lst.append((r["input"], json.loads(r["output"])))
    return [ex for intent, _ in _INTENCOES_ELEICOES for ex in por.get(intent, [])]


def exemplos_quimica(n_por_intencao: int = 1) -> list:
    por = {}
    linhas = [json.loads(l) for l in C.TREINO_QUIMICA.read_text(encoding="utf-8").splitlines() if l.strip()]
    for r in sorted(linhas, key=lambda r: _h(r["q"])):
        if len(r["q"]) > 90:
            continue
        lst = por.setdefault(r["alvo"]["intent"], [])
        if len(lst) < n_por_intencao:
            lst.append((r["q"], r["alvo"]))
    return [ex for intent, _ in _INTENCOES_QUIMICA for ex in por.get(intent, [])] + _EXEMPLOS_QUIMICA_EXTRA


def _formatar_exemplos(exemplos, core, chem: bool) -> str:
    linhas = []
    for q, alvo in exemplos:
        js = core.format_output(alvo) if chem else core.format_output_v2(alvo)
        linhas.append(f"Pergunta: {q}\nJSON: {js}")
    return "\n".join(linhas)


def sistema_eleicoes() -> str:
    core = C.carregar_app("eleicoes2026").nlu_core
    intencoes = "\n".join(f"- {i}: {d}" for i, d in _INTENCOES_ELEICOES)
    return (
        "Você interpreta perguntas de eleitores para o SaibaTudo Eleições 2026 (eleições gerais do Brasil, outubro de 2026). "
        "Converta a pergunta em UM objeto JSON compacto com a intenção e somente as entidades citadas na pergunta. "
        "Não responda a pergunta e não invente dados.\n\n"
        f"INTENÇÕES (escolha exatamente uma):\n{intencoes}\n\n"
        "ENTIDADES (inclua só as que a pergunta cita; omita as demais):\n"
        f"- cargo: {', '.join(core.CARGOS)}\n"
        "- uf: sigla do estado (SP, MG, RJ...); nunca BR\n"
        "- partido: sigla do partido como escrita na pergunta\n"
        "- nome: nome do candidato como escrito na pergunta\n"
        f"- tema (assunto do plano de governo): {', '.join(core.TEMAS_V2)}\n"
        "- apenasDeferidas: true quando pede só candidaturas aptas/ficha limpa/deferidas\n"
        "- historico: NUNCA_ELEITO (estreantes, novatos), ELEITO_MESMO_CARGO (buscam reeleição), ELEITO_2_OU_MAIS (veteranos)\n"
        "- turno: 1 ou 2 quando a pergunta cita o turno\n\n"
        f"EXEMPLOS:\n{_formatar_exemplos(exemplos_eleicoes(), core, chem=False)}"
    )


def sistema_quimica() -> str:
    core = C.carregar_app("quimica").nlu_core
    intencoes = "\n".join(f"- {i}: {d}" for i, d in _INTENCOES_QUIMICA)
    return (
        "Você interpreta perguntas de química para o SaibaTudo Química. A pergunta pode estar em português, inglês, espanhol, alemão ou "
        "francês; o JSON usa sempre o vocabulário abaixo. Converta a pergunta em UM objeto JSON compacto com a intenção e somente as "
        "entidades citadas na pergunta. Não responda a pergunta, não calcule e não invente dados.\n\n"
        f"INTENÇÕES (escolha exatamente uma):\n{intencoes}\n\n"
        "ENTIDADES (inclua só as que a pergunta cita; omita as demais):\n"
        "- elemento: símbolo do elemento (Fe, O, Na...), mesmo quando a pergunta escreve o nome\n"
        "- composto: nome ou fórmula do composto COPIADO da pergunta exatamente como digitado\n"
        f"- propriedade: {', '.join(core.PROPRIEDADES)}\n"
        f"- quantidades: lista de {{\"valor\": número, \"unidade\": u}} com u em: {', '.join(core.UNIDADES)}\n"
        "- equacao: a equação química copiada da pergunta\n"
        f"- nivel: {', '.join(core.NIVEIS)} (quando pede explicação para um nível de ensino)\n"
        "- unidadeDestino: unidade de destino de uma conversão (mesma lista das unidades)\n\n"
        f"EXEMPLOS:\n{_formatar_exemplos(exemplos_quimica(), core, chem=True)}"
    )


# Prompt CURTO de produção (o do treino do v2.3): usado só no modelo ajustado, por completação crua (ChatML)
def prompt_producao_eleicoes(q: str) -> str:
    core = C.carregar_app("eleicoes2026").nlu_core
    return core.build_prompt(core.validate_question(q), "v2")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(sistema_eleicoes())
    print("\n=================\n")
    print(sistema_quimica())
