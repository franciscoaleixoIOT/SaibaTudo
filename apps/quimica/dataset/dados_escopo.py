# -*- coding: utf-8 -*-
"""Perguntas FORA DO ESCOPO do SaibaTudo Química (física, biologia, matemática pura) e pedidos de "faça o dever inteiro", com a
resposta de limite educada. Usadas em `dataset/qa/escopo.jsonl` (fam_escopo.py) e no NLU (DESCONHECIDA; o dever inteiro vira AJUDA,
que mostra o que o app faz). Nenhuma pergunta aqui pode tratar de um tema de química do mapa (topicos.json / vocab_nlu.TOPICOS) nem
de uma constante que o pacote traz (velocidade da luz e aceleração da gravidade estão em `constantes.json`, por isso não aparecem
aqui): um teste confere isso, para não ensinar o modelo a recusar o que o app sabe responder.
"""

FISICA = [
    "Qual a fórmula da velocidade média?", "O que diz a primeira lei de Newton?", "Como funciona uma roldana?", "O que é um buraco negro?",
    "O que é movimento retilíneo uniforme?", "Como funciona um circuito elétrico em série?", "O que é refração da luz?", "Explique a lei de Ohm",
    "Como calcular o trabalho de uma força?", "O que é movimento uniformemente variado?", "Como funciona uma alavanca?", "O que é a teoria da relatividade?",
    "Como se forma o arco-íris?", "O que é empuxo?", "Como calcular a força resultante?", "O que é o efeito Doppler?", "Como funciona um ímã?",
    "Como calcular a potência elétrica de um chuveiro?", "O que é inércia?", "Quanto tempo a luz do Sol leva para chegar à Terra?",
    "O que é um vetor em física?", "Como funciona o motor elétrico?", "O que é movimento circular uniforme?", "Qual a fórmula do lançamento oblíquo?",
    "O que diz a terceira lei de Newton?", "Como funciona uma lente convergente?", "O que é corrente alternada?", "Como calcular a velocidade de um carro em queda livre?",
]
BIOLOGIA = [
    "O que é mitose?", "Qual a diferença entre mitose e meiose?", "Como funciona o sistema circulatório?", "O que são células-tronco?",
    "Quais são os reinos dos seres vivos?", "O que é a seleção natural?", "Quantos ossos tem o corpo humano?", "Como funciona uma vacina?",
    "O que é um ecossistema?", "Quais são as fases da meiose?", "O que faz o fígado?", "O que é cadeia alimentar?", "Como as abelhas se comunicam?",
    "O que é genética mendeliana?", "O que é a teoria da evolução?", "Como os peixes respiram?", "Qual a diferença entre vírus e bactéria?",
    "Como funciona o sistema nervoso?", "O que é um bioma?", "Quais são os tipos sanguíneos?", "Como as plantas se reproduzem?",
    "O que é a camada de pele chamada derme?", "Quais animais são mamíferos?", "O que é uma espécie endêmica?", "Como funciona o coração humano?",
    "O que é herança genética?", "Quais são as partes de uma flor?",
]
MATEMATICA = [
    "Resolva a equação 2x + 3 = 11", "Qual é a derivada de x ao quadrado?", "Como calcular a área de um círculo?", "O que é um número primo?",
    "Calcule a raiz quadrada de 225", "Qual a fórmula de Bhaskara?", "Como resolver um sistema de equações do primeiro grau?",
    "O que é uma função do segundo grau?", "Calcule 30% de 250", "Quanto é a integral de 1/x?", "O que é o teorema de Pitágoras?",
    "Qual o MMC de 12 e 18?", "Quanto é 7 elevado a 3?", "Simplifique a fração 18/24", "Qual o seno de 30 graus?", "Como calcular a média aritmética?",
    "O que é uma progressão aritmética?", "Quanto é 125 dividido por 5?", "Qual a área de um triângulo de base 10 e altura 4?", "O que é uma matriz?",
    "Como calcular o perímetro de um quadrado?", "Fatore x² − 9", "Quanto é 2 elevado a 10?", "O que é um número irracional?",
]
DEVER = [
    "Faz meu dever de casa de química inteiro", "Resolva todas as questões da minha lista de exercícios", "Responde a prova pra mim",
    "Faça o meu trabalho de química completo, com introdução e conclusão", "Escreva a minha redação sobre a tabela periódica",
    "Me passa todas as respostas do simulado", "Resolva os 20 exercícios de estequiometria da apostila", "Faz o relatório da aula prática pra mim",
    "Responda essa lista inteira de química orgânica", "Me dá as respostas da atividade da escola", "Faça meu TCC sobre polímeros",
    "Cola as respostas da prova de amanhã", "Resolve a lista toda que eu mando as fotos", "Faz todos os exercícios do capítulo 5 pra mim",
    "Preciso que você faça minha tarefa de química inteira", "Escreve meu trabalho de ciências todo", "Resolva a lista de exercícios completa e me manda o gabarito",
]

RESPOSTAS = {
    "fisica": "Essa é uma pergunta de física, e o SaibaTudo Química responde só sobre química: elementos, compostos, cálculos químicos (massa molar, "
              "estequiometria, soluções, pH, gases), segurança e conceitos de química, sempre com a fonte. Se a sua dúvida tiver uma parte de química, "
              "pergunte por ela.",
    "biologia": "Essa é uma pergunta de biologia, fora do que o SaibaTudo Química cobre. Posso ajudar com a química envolvida (substâncias, reações e "
                "conceitos de química), com dados de fontes abertas e a fonte de cada resposta.",
    "matematica": "Essa é uma pergunta de matemática pura, e o SaibaTudo Química só faz contas de química (massa molar, mols, concentração, pH, gases e "
                  "conversão de unidades), mostrando as etapas. Para matemática em geral, use uma calculadora ou um material de matemática.",
    "dever": "Não faço o dever, a lista ou a prova inteira por você, mas posso ajudar você a resolver: mande uma questão de cada vez e eu mostro as "
             "etapas do cálculo ou explico o conceito, sempre com a fonte.",
}
AREAS = {"fisica": FISICA, "biologia": BIOLOGIA, "matematica": MATEMATICA, "dever": DEVER}
