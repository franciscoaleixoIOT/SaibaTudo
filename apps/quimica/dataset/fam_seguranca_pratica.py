# -*- coding: utf-8 -*-
"""Família SEGURANÇA PRÁTICA (20/10/2026): pedidos LEGÍTIMOS de segurança que o explicador tem de RESPONDER, não recusar.

Motivo: o Explica v1 reprovou no gate de segurança (contracts/seguranca_cases.json) respondendo só 39 % dos pedidos legítimos: o treino
tinha 330 recusas ("como fazer X perigoso", sem trechos) e nenhum exemplo parecido com resposta — EPI, neutralizar, armazenar, descartar,
primeiros socorros, "qual a fórmula do TNT", "como fazer sabão". O modelo generalizou "como fazer" e "nome de substância perigosa" para recusa.

Aqui, para cada composto com classificação GHS harmonizada no pacote (as mesmas classes de perigo do rótulo: pictogramas e frases H):
  - EPI e cuidados de manuseio, armazenamento seguro, derramamento, primeiros socorros e descarte — orientações GERAIS por classe de perigo
    (corrosivo, tóxico, inflamável, comburente, gás sob pressão, perigo crônico, ambiente, explosivo), sem números, sem procedimento de
    laboratório e sempre remetendo à FDS/FISPQ do fornecedor para o que o pacote não traz (frases P);
  - para os compostos de destaque (ácidos e bases comuns, solventes, produtos domésticos, e também TNT, nitroglicerina, ácido pícrico,
    fosgênio, ácido cianídrico, efedrina, anidrido acético, permanganato): FATOS legítimos — fórmula, massa molar, "é inflamável?",
    "quais os perigos?" — tirados do pacote. Saber a fórmula ou os perigos de uma substância perigosa é legítimo; a recusa fica só para
    produção, purificação e obtenção.
Mais um conjunto de pares GERAIS escritos à mão (sem composto): misturas domésticas perigosas, diluição de ácido, mercúrio de termômetro,
vazamento de gás, pilhas, produto desconhecido, e pedidos "como fazer" BENIGNOS (sabão, vinagre, solução, tampão, eletrólise), respondidos
em termos conceituais, sem receita.

Cada par leva `contexto` (os dados do rótulo que o app mostra e que o montador do explicador passa como CONTEXTO), de modo que todo
número da resposta (CID, massa molar) está no contexto. As respostas evitam verbos de procedimento no imperativo (ask_core.ensina_producao)
e qualquer frase de recusa (ask_core.e_recusa): os dois verificadores são conferidos em dataset/tests/test_seguranca_pratica.py.
"""
import re

from comum import Resp, cap, com_artigo, lista_pt, renderizar
from fam_seguranca_rotulo import SIGNIFICADO_PALAVRA, contexto_ghs
from ghs_pt import PICTOGRAMAS, expandir_h, palavra_sinal_pt
from pacote import fontes_do_registro
from qa_base import FONTE_AUTORIA, FONTE_CLP, Ctx, SubCtx, nome_em_frase, sup_composto

FAM = "seguranca_pratica"

# Compostos de destaque (CID do PubChem): recebem TODAS as perguntas práticas e os fatos legítimos. Os demais com GHS recebem duas.
DESTAQUE = {
    313: "ácido clorídrico", 1118: "ácido sulfúrico", 944: "ácido nítrico", 14917: "ácido fluorídrico", 1004: "ácido fosfórico", 176: "ácido acético",
    284: "ácido fórmico", 311: "ácido cítrico", 14798: "hidróxido de sódio", 14797: "hidróxido de potássio", 222: "amônia", 23665760: "hipoclorito de sódio",
    784: "peróxido de hidrogênio", 180: "acetona", 702: "etanol", 887: "metanol", 1140: "tolueno", 241: "benzeno", 8058: "hexano", 712: "formaldeído",
    24526: "cloro", 281: "monóxido de carbono", 402: "ácido sulfídrico", 768: "ácido cianídrico", 6371: "fosgênio", 807: "iodo", 24408: "bromo",
    7843: "butano", 6334: "propano", 297: "metano", 10340: "carbonato de sódio", 516875: "permanganato de potássio", 7918: "anidrido acético",
    9294: "efedrina", 8376: "trinitrotolueno", 4510: "nitroglicerina", 6954: "ácido pícrico", 2519: "cafeína",
}

# ---------------------------------------------------------------------------------------------------------
# Classes de perigo a partir do rótulo (pictogramas e frases H)
# ---------------------------------------------------------------------------------------------------------
_H_CLASSES = (
    ("explosivo", r"^H20[0-5]|^H24[0-1]"), ("inflamavel", r"^H22[0-9]|^H25[01]|^H26[01]"), ("comburente", r"^H27[0-2]"),
    ("gas_pressao", r"^H28[01]"), ("corrosivo", r"^H290|^H314|^H318"), ("toxico", r"^H30[01]|^H31[01]|^H33[01]"),
    ("inalacao", r"^H33[0-6]|^H334"), ("nocivo", r"^H302|^H312|^H315|^H317|^H319|^H332|^H335|^H336"),
    ("cronico", r"^H304|^H334|^H34[01]|^H35[01]|^H36[0-2]|^H37[0-3]"), ("ambiente", r"^H4[0-2][0-9]"),
)
_PIC_CLASSES = {"GHS01": "explosivo", "GHS02": "inflamavel", "GHS03": "comburente", "GHS04": "gas_pressao", "GHS05": "corrosivo",
                "GHS06": "toxico", "GHS07": "nocivo", "GHS08": "cronico", "GHS09": "ambiente"}


def classes_de_perigo(c) -> set:
    g = c.get("ghs") or {}
    cls = {_PIC_CLASSES[p] for p in g.get("pictogramas") or [] if p in _PIC_CLASSES}
    for h in g.get("frasesH") or []:
        for parte in re.sub(r"\s+", "", h).split("+"):
            for nome, rx in _H_CLASSES:
                if re.match(rx, parte):
                    cls.add(nome)
    return cls


def e_gas(c) -> bool:
    return (c.get("propriedades") or {}).get("estadoPadrao") == "gas" or "gas_pressao" in classes_de_perigo(c)


# ---------------------------------------------------------------------------------------------------------
# Textos por classe (sem números, sem imperativo de procedimento, sem frase de recusa)
# ---------------------------------------------------------------------------------------------------------
EPI_BASE = "o básico é óculos de segurança, luvas adequadas ao produto e roupa que cubra braços e pernas, em local ventilado"
EPI = {
    "corrosivo": "por ser corrosivo, convém protetor facial, luvas resistentes a corrosivos (o material certo está na FDS) e avental impermeável, com água corrente ou lava-olhos ao alcance",
    "toxico": "por ser tóxico, o manuseio pede capela ou exaustão, a proteção respiratória indicada na FDS e nunca trabalhar sozinho",
    "inalacao": "por irritar ou intoxicar pela respiração, vale evitar inalar vapores e trabalhar com exaustão",
    "inflamavel": "por ser inflamável, nada de chamas, faíscas ou superfícies quentes por perto, e um extintor adequado ao alcance",
    "comburente": "por ser comburente (oxidante), luvas e roupa limpas, sem óleo ou graxa, e distância de materiais combustíveis",
    "gas_pressao": "por ser gás sob pressão, cilindro preso e com a válvula protegida, manuseado só por quem tem treinamento",
    "cronico": "por ter perigo para a saúde a longo prazo, a exposição deve ser a menor possível: capela, luvas e nada de comer ou beber no local",
    "ambiente": "por ser perigoso para o ambiente aquático, nada pode escorrer para ralos ou cursos d'água",
    "explosivo": "por ser explosivo, só pessoal treinado e autorizado manuseia, sem choque, atrito, calor ou chama",
}
ARMAZ_BASE = "na embalagem original, bem fechada e rotulada, em local fresco, seco e ventilado, fora do alcance de crianças e animais e longe de alimentos"
ARMAZ = {
    "corrosivo": "separado de substâncias incompatíveis (ácidos e bases nunca juntos) e, se possível, numa bandeja de contenção, longe de metais",
    "toxico": "em armário com chave ou área de acesso controlado",
    "inflamavel": "longe de calor, chamas e faíscas, de preferência em armário próprio para inflamáveis e nunca ao lado de comburentes",
    "comburente": "longe de combustíveis, solventes, papel e madeira",
    "gas_pressao": "com o cilindro em pé e preso, em área ventilada e longe de fontes de calor",
    "cronico": "em recipiente bem vedado e identificado, com a menor quantidade possível guardada",
    "ambiente": "em local sem risco de vazar para ralos ou para o solo",
    "explosivo": "só em instalações licenciadas para isso; em casa, não",
}
DERRAM_BASE = ("afastar as pessoas, ventilar o local e vestir o EPI antes de qualquer coisa; conter o líquido com material absorvente inerte "
               "(areia, vermiculita ou terra), recolher para um recipiente fechado e identificado e tratar o resíduo como perigoso")
DERRAM = {
    "corrosivo": "se for ácido, bicarbonato de sódio em pequenas porções neutraliza o que sobrou (a reação libera calor e gás, então aos poucos); se for base, o kit de derramamento indica o neutralizante",
    "toxico": "o certo é sair do local e só voltar com proteção respiratória; vazamento grande é caso para os bombeiros",
    "inalacao": "convém manter o ambiente arejado até os vapores se dispersarem",
    "inflamavel": "eliminar toda fonte de ignição e não ligar nem desligar aparelhos elétricos até ventilar bem",
    "comburente": "nunca usar serragem, papel ou pano para absorver (podem inflamar); só absorvente inerte",
    "gas_pressao": "fechar a válvula se for seguro, ventilar e sair; vazamento que não cessa é caso para os bombeiros",
    "cronico": "evitar qualquer contato com a pele e a respiração dos vapores durante a limpeza",
    "ambiente": "impedir que chegue a ralos, bueiros ou cursos d'água",
    "explosivo": "não tocar, afastar todo mundo e acionar bombeiros ou polícia",
}
PS_BASE = ("na pele, lavar com água corrente abundante por bastante tempo e tirar roupas e acessórios contaminados; nos olhos, lavar com água corrente "
           "mantendo as pálpebras abertas e retirar lentes de contato; em caso de inalação, levar a pessoa para o ar fresco; em caso de ingestão, "
           "não provocar vômito, enxaguar a boca e não dar nada para beber sem orientação. Em todos os casos, procurar atendimento médico levando o rótulo "
           "do produto e consultar um centro de informação toxicológica")
PS = {
    "corrosivo": "queimadura química é urgência: lavar e seguir para o atendimento, sem tentar neutralizar na pele",
    "toxico": "a intoxicação pode ser grave e rápida: emergência médica imediata",
    "inalacao": "quem inalou precisa de ar fresco e repouso; se houver falta de ar, é emergência",
    "inflamavel": "roupa que pegou fogo deve ser apagada e retirada; a queimadura térmica é tratada com água fria",
    "cronico": "mesmo sem sintoma imediato, convém acompanhamento médico, porque os efeitos podem aparecer depois",
    "gas_pressao": "contato com o gás que escapa pode causar congelamento: aquecer a área só com água morna, nunca quente",
}
DESC_BASE = ("nunca na pia, no ralo ou no lixo comum. Em casa, pequenas quantidades vão para o ecoponto ou a coleta de resíduos perigosos do município "
             "(ou de volta ao fabricante, pela logística reversa); em laboratório, o resíduo é segregado por classe, rotulado e recolhido por empresa licenciada. "
             "Resíduos diferentes nunca se misturam")
DESC = {
    "corrosivo": "em laboratório, a neutralização antes do descarte só segue a norma local e o plano de resíduos",
    "inflamavel": "solvente inflamável nunca vai ao esgoto: vapores podem se acumular e inflamar",
    "toxico": "a embalagem vazia também é resíduo perigoso",
    "ambiente": "nem uma pequena quantidade pode ir para rios, solo ou esgoto",
    "comburente": "longe de resíduos orgânicos e combustíveis, em recipiente próprio",
    "gas_pressao": "o cilindro volta ao fornecedor; nunca é furado nem descartado como sucata",
}
NOTA_FDS = "O pacote não traz as frases de precaução (P) nem a FDS/FISPQ: confira a ficha do fornecedor antes de usar o produto."

MODELOS = {
    "epi": ["Quais EPIs usar com {c}?", "Que equipamento de proteção preciso para manusear {c}?", "Como me proteger ao mexer com {c}?",
            "Preciso de luvas e óculos para trabalhar com {c}?", "Que cuidados de proteção individual {c} exige?", "Qual o EPI para manusear {c}?"],
    "armazenar": ["Como armazenar {c} com segurança?", "Onde guardar {c} em casa?", "Como guardar {c} no laboratório?", "Qual a forma segura de estocar {c}?",
                  "Posso guardar {c} em qualquer armário?"],
    "derramar": ["O que fazer se derramar {c}?", "Como limpar um derramamento {c_de}?", "Derrubei {c} no chão, e agora?", "Vazou {c}: o que devo fazer?",
                 "Como agir num vazamento {c_de}?"],
    "socorros": ["Primeiros socorros para contato com {c}", "O que fazer se {c} cair na pele?", "O que fazer se alguém inalar {c}?",
                 "E se alguém engolir {c}, o que fazer?", "{c_cap} caiu no olho: o que fazer?", "Quais os primeiros socorros em caso de acidente com {c}?"],
    "descartar": ["Como descartar {c} com segurança?", "Posso jogar {c} na pia?", "Onde descartar {c} que sobrou?", "Qual o descarte correto {c_de}?",
                  "Como me livrar de {c} velho em casa?"],
}
MODELOS_FATO = {
    "formula": ["Qual a fórmula {c_de}?", "Qual é a fórmula química {c_de}?", "Como se escreve a fórmula {c_de}?"],
    "massa": ["Qual a massa molar {c_de}?", "Quanto é a massa molar {c_de}?"],
    "inflamavel": ["{c_cap} é inflamável?", "{c_cap} pega fogo?"],
    "perigos": ["Quais os perigos {c_de}?", "Quais são os riscos {c_de}?", "{c_cap} é perigoso? Por quê?", "O que o rótulo {c_de} diz sobre os perigos?"],
}

# Pares GERAIS, sem composto (autoria própria). Cada item: (tema, [perguntas], resposta, nivel).
GERAIS = [
    ("mistura_sanitaria_amonia",
     ["Por que não misturar água sanitária com produtos com amônia?", "O que acontece se misturar alvejante com amoníaco?", "Água sanitária e amônia juntas fazem mal?"],
     "A mistura libera cloraminas, gases que irritam os olhos, a garganta e os pulmões e podem causar intoxicação séria em ambiente fechado. Produtos de limpeza "
     "devem ser usados um de cada vez, com o ambiente ventilado e enxágue entre eles. Quem inalou deve ir para o ar fresco e procurar atendimento se tiver "
     "falta de ar.", "fundamental"),
    ("mistura_sanitaria_acido",
     ["O que acontece se misturar água sanitária com vinagre ou outro ácido?", "Por que água sanitária e ácido liberam gás?", "É perigoso misturar alvejante com vinagre?"],
     "O hipoclorito da água sanitária reage com ácidos (vinagre, limpadores ácidos, ácido muriático) e libera gás cloro, tóxico e irritante para as vias "
     "respiratórias. É uma das misturas domésticas mais perigosas. O certo é usar cada produto separadamente, com ventilação, e nunca misturar para "
     "“aumentar a força”.", "fundamental"),
    ("mistura_produtos_limpeza",
     ["Qual é o perigo de misturar produtos de limpeza?", "Posso misturar produtos de limpeza diferentes?", "Misturar desinfetantes é perigoso?"],
     "Sim, pode ser perigoso: alvejante com amônia forma cloraminas, alvejante com ácido forma gás cloro, e água oxigenada com vinagre forma ácido "
     "peracético, todos irritantes ou tóxicos. A regra é um produto por vez, ambiente ventilado, enxágue entre um e outro e embalagens sempre fechadas "
     "e rotuladas.", "fundamental"),
    ("diluir_acido",
     ["Como diluir um ácido concentrado com segurança?", "Na diluição, o ácido vai na água ou a água vai no ácido?", "Por que não se joga água no ácido concentrado?"],
     "O ácido é adicionado lentamente à água, nunca o contrário: a diluição libera muito calor e, se a água cai sobre o ácido concentrado, ela pode "
     "ferver e espirrar ácido. O trabalho é feito com óculos, protetor facial, luvas resistentes a corrosivos e avental, em capela ou local ventilado, "
     "com o frasco apoiado e em banho de água fria quando for grande quantidade.", "medio"),
    ("neutralizar_acido_derramado",
     ["Como neutralizar um derramamento de ácido no laboratório?", "Derramei ácido na bancada: como neutralizar?", "O que usar para neutralizar ácido derramado?"],
     "Primeiro afastar as pessoas, ventilar e vestir o EPI. Para ácido, o neutralizante usual é bicarbonato de sódio (ou carbonato de sódio) espalhado em pequenas "
     "porções sobre o líquido, porque a reação libera calor e gás carbônico; quando parar de borbulhar, o resíduo é absorvido com material inerte, recolhido "
     "em recipiente fechado e descartado como resíduo químico. Volume grande é caso para a brigada ou os bombeiros.", "medio"),
    ("neutralizar_base_derramada",
     ["Como neutralizar soda cáustica derramada?", "O que fazer com um derramamento de base forte?", "Derramou hidróxido de sódio: como neutralizar?"],
     "Com EPI completo (as bases atacam a pele e os olhos sem dor imediata), o derramamento é contido com absorvente inerte e neutralizado com um ácido fraco "
     "diluído, como o indicado no kit de derramamento, em pequenas porções. O resíduo vai para recipiente fechado e identificado. Nunca usar pano ou "
     "papel sem luvas, e lavar bem a superfície depois.", "medio"),
    ("respingo_olho",
     ["Primeiros socorros para produto químico no olho", "Caiu produto de limpeza no meu olho, o que fazer?", "O que fazer se respingar soda ou ácido no olho?"],
     "Lavar imediatamente com água corrente limpa, mantendo as pálpebras abertas, por bastante tempo, e retirar lentes de contato. Não esfregar e não usar "
     "colírio ou neutralizante. Em seguida procurar atendimento oftalmológico de urgência levando o rótulo do produto. Lava-olhos ou chuveiro de "
     "emergência, quando existem, são a primeira opção.", "fundamental"),
    ("produto_na_pele",
     ["O que fazer se cair produto químico na pele?", "Queimei a pele com produto de limpeza: o que fazer?", "Primeiros socorros para ácido na pele"],
     "Tirar a roupa e os acessórios contaminados e lavar a região com água corrente abundante por bastante tempo, sem esfregar. Não aplicar pomada, pasta "
     "de dente ou neutralizante caseiro. Se houver queimadura, bolha ou dor persistente, procurar atendimento médico levando o rótulo do produto.", "fundamental"),
    ("inalacao_gas",
     ["O que fazer se inalar gás tóxico ou vapor de produto químico?", "Inalei vapor de produto de limpeza e estou tossindo, o que fazer?", "Primeiros socorros para inalação de gás"],
     "Sair do ambiente para o ar fresco imediatamente, abrir portas e janelas se for seguro, soltar roupas apertadas e ficar em repouso. Se houver falta "
     "de ar, chiado, tontura ou confusão, chamar a emergência. Quem socorre não deve entrar em local fechado sem proteção respiratória.", "fundamental"),
    ("ingestao",
     ["O que fazer se alguém engolir produto químico?", "Criança bebeu produto de limpeza: o que fazer?", "Primeiros socorros em caso de ingestão de produto químico"],
     "Não provocar vômito e não dar leite, água ou qualquer outra coisa sem orientação, porque um corrosivo machuca de novo na volta. Enxaguar a boca, "
     "guardar a embalagem e ligar para um centro de informação toxicológica ou levar a pessoa à emergência com o rótulo do produto.", "fundamental"),
    ("monoxido_carbono",
     ["Primeiros socorros para intoxicação por monóxido de carbono", "Quais os riscos do monóxido de carbono em casa?", "Como evitar intoxicação por monóxido de carbono?"],
     "O monóxido de carbono não tem cheiro nem cor e vem da queima incompleta de gás, carvão, lenha ou combustível em ambiente fechado (aquecedores, "
     "fogareiros, motor ligado na garagem). Os sinais são dor de cabeça, tontura, náusea e sonolência. A pessoa deve ser levada para o ar fresco e a "
     "emergência deve ser chamada; a prevenção é ventilação e aparelhos a gás em ordem.", "fundamental"),
    ("mercurio_termometro",
     ["Como limpar mercúrio de um termômetro quebrado?", "Quebrei um termômetro de mercúrio: o que fazer?", "Posso aspirar mercúrio derramado?"],
     "Não usar aspirador nem vassoura: o aspirador espalha vapor de mercúrio pela casa. Com luvas, as gotas são juntadas com um cartão rígido e recolhidas "
     "com fita adesiva ou conta-gotas para um pote com tampa, que vai para a coleta de resíduos perigosos. O ambiente fica ventilado por horas e as "
     "crianças e animais ficam longe até terminar.", "fundamental"),
    ("vazamento_gas_cozinha",
     ["Como identificar um vazamento de gás de cozinha?", "Sinto cheiro de gás em casa: o que fazer?", "O que fazer num vazamento de gás de botijão?"],
     "O gás de cozinha recebe um odorizante com cheiro forte justamente para ser notado. Ao sentir o cheiro: fechar o registro do botijão ou da rede, abrir "
     "portas e janelas, não acender luz, fósforo nem usar celular ou interruptor no local, e sair. Com o cheiro persistente, chamar a distribuidora ou os "
     "bombeiros de fora do ambiente.", "fundamental"),
    ("pilhas_baterias",
     ["Como descartar pilhas e baterias?", "Pilha velha pode ir no lixo comum?", "Onde jogar baterias usadas?"],
     "Pilhas e baterias não vão para o lixo comum: contêm metais como chumbo, cádmio, mercúrio e lítio que contaminam solo e água. O descarte é em pontos de "
     "coleta (lojas, supermercados, assistências técnicas e ecopontos), previstos pela logística reversa. Baterias de lítio inchadas ou danificadas "
     "ficam em recipiente não inflamável até a entrega.", "fundamental"),
    ("descarte_domestico",
     ["Como descartar produtos de limpeza vencidos?", "O que fazer com produto químico que sobrou em casa?", "Posso jogar solvente na pia?"],
     "Solventes, tintas, óleo, ácidos e desinfetantes concentrados não vão para a pia nem para o lixo comum. Pequenas quantidades domésticas vão para o "
     "ecoponto ou a coleta de resíduos perigosos do município, sempre na embalagem original e sem misturar produtos. Produtos de limpeza comuns e diluídos "
     "podem seguir a orientação do rótulo.", "fundamental"),
    ("produto_desconhecido",
     ["Encontrei um frasco sem rótulo: o que fazer?", "Como lidar com um produto químico desconhecido?", "Achei um recipiente com líquido estranho, e agora?"],
     "Não cheirar, não provar e não misturar com nada. O frasco fica fechado, longe de calor, de crianças e de animais, e segue para a coleta de resíduos "
     "perigosos ou para o setor de resíduos do laboratório, identificado como “desconhecido”. Qualquer reação, cheiro forte ou vazamento é motivo para "
     "afastar as pessoas e chamar ajuda.", "fundamental"),
    ("explosivo_encontrado",
     ["O que fazer com explosivos encontrados em uma obra?", "Achei um artefato que parece explosivo: o que fazer?", "Encontrei dinamite velha, o que faço?"],
     "Não tocar, não mover e não molhar: explosivos velhos ficam mais sensíveis, não menos. A área é isolada, as pessoas se afastam e a polícia ou os "
     "bombeiros são acionados, porque só o esquadrão antibombas faz a remoção. Nunca se tenta desmontar nem transportar o artefato.", "fundamental"),
    ("seguranca_explosivos_industria",
     ["Como a indústria testa a segurança de explosivos?", "Quem fiscaliza a produção de explosivos no Brasil?", "Como explosivos são manuseados com segurança na mineração?"],
     "Explosivos comerciais são fabricados e testados por empresas licenciadas, com ensaios padronizados de sensibilidade ao choque, ao atrito e ao calor, "
     "feitos em laboratórios certificados e com equipamento remoto. No Brasil, a produção, o armazenamento e o uso são controlados pelo Exército, e só "
     "blasters habilitados manuseiam o material na mineração e na construção, em paióis licenciados.", "medio"),
    ("sabao_caseiro",
     ["Como fazer sabão caseiro?", "Qual é a química do sabão caseiro?", "Como se faz sabão a partir de óleo usado?"],
     "Sabão é o produto da saponificação: uma gordura ou óleo reage com uma base forte (soda cáustica, o hidróxido de sódio) e forma sais de ácidos graxos, "
     "o sabão, mais glicerol. É uma reação lenta, feita a frio ou com leve aquecimento, e exige cuidado porque a soda é corrosiva: óculos, luvas, "
     "ambiente ventilado e nada de recipiente de alumínio. Receitas com as proporções certas para cada óleo estão em cartilhas de reaproveitamento de óleo "
     "e devem ser seguidas à risca.", "medio"),
    ("vinagre_caseiro",
     ["Como fazer vinagre caseiro?", "Como o vinagre é produzido?", "Qual a química da fermentação do vinagre?"],
     "Vinagre vem de duas fermentações: primeiro leveduras transformam o açúcar de um suco ou do malte em etanol; depois bactérias acéticas, com oxigênio, "
     "oxidam o etanol a ácido acético. Em casa isso é feito deixando vinho, cidra ou suco fermentado em recipiente coberto por pano, em local morno, por "
     "semanas. A acidez final é baixa e a receita precisa de higiene para não mofar.", "medio"),
    ("preparar_solucao",
     ["Como preparar uma solução de concentração conhecida?", "Como preparar uma solução de NaOH de uma dada concentração?", "Quais os passos para preparar uma solução em mol por litro?"],
     "Uma solução de concentração em mol por litro é preparada calculando a massa de soluto correspondente ao volume desejado (mols vezes massa molar), "
     "pesando essa massa, dissolvendo em parte da água num béquer e transferindo para um balão volumétrico, que então é completado com água até a marca e "
     "homogeneizado. Com hidróxido de sódio o preparo libera calor e a base é corrosiva: óculos e luvas são obrigatórios.", "medio"),
    ("solucao_tampao",
     ["Como fazer uma solução tampão?", "O que é uma solução tampão e como se prepara?", "Como preparar um tampão de pH?"],
     "Uma solução tampão resiste a variações de pH porque contém um ácido fraco e a sua base conjugada (ou uma base fraca e o seu ácido conjugado) em "
     "quantidades comparáveis. Na prática, escolhe-se o par cujo pKa fica perto do pH desejado e ajustam-se as proporções pela equação de "
     "Henderson-Hasselbalch, conferindo o pH final com um pHmetro. Exemplos comuns são acetato/ácido acético e fosfatos.", "superior"),
    ("eletrolise_agua",
     ["Como produzir hidrogênio por eletrólise da água?", "Como funciona a eletrólise da água?", "A eletrólise da água é perigosa?"],
     "Na eletrólise, uma corrente elétrica contínua passa pela água com um pouco de eletrólito (um sal ou base) e separa hidrogênio no polo negativo e "
     "oxigênio no polo positivo, em volume de hidrogênio maior que o de oxigênio. É uma experiência clássica de escola com pilhas e eletrodos inertes; o "
     "cuidado é não acumular a mistura dos dois gases perto de chama, porque ela é explosiva, e não usar sal de cozinha, que libera cloro.", "medio"),
    ("bomba_calorimetrica",
     ["Como funciona uma bomba calorimétrica?", "O que é um calorímetro de bomba?", "Para que serve a bomba calorimétrica?"],
     "A bomba calorimétrica é um recipiente de aço resistente onde uma amostra é queimada em oxigênio sob pressão, imersa em água; o calor liberado "
     "aquece a água e a variação de temperatura, com a capacidade calorífica do aparelho, dá a energia de combustão. É o instrumento que mede o valor "
     "calórico de alimentos e combustíveis. Apesar do nome, nada tem a ver com explosivos.", "medio"),
    ("receita_culinaria",
     ["Como fazer bolo de cenoura?", "Me passa uma receita de bolo?", "Como fazer pão caseiro?"],
     "Receitas de cozinha estão fora do escopo do SaibaTudo Química, que trata de química. O que dá para explicar é a química por trás delas: o fermento "
     "libera gás carbônico que faz a massa crescer, o calor desnatura as proteínas do ovo e a caramelização e a reação de Maillard dão a cor e o aroma.", "fundamental"),
    ("overdose_droga",
     ["O que fazer se alguém ingerir metanfetamina ou outra droga em excesso?", "Como ajudar alguém com overdose?", "Primeiros socorros para intoxicação por droga"],
     "Chamar a emergência imediatamente e, enquanto ela não chega, manter a pessoa acordada e em local seguro; se estiver inconsciente mas respirando, "
     "deitá-la de lado para não aspirar vômito; se parar de respirar, iniciar reanimação. Não deixar a pessoa sozinha e informar ao socorro o que foi "
     "usado. Centros de informação toxicológica orientam por telefone.", "fundamental"),
    ("agua_oxigenada",
     ["Como manusear água oxigenada com segurança?", "Água oxigenada concentrada é perigosa?", "Posso guardar água oxigenada em qualquer frasco?"],
     "A água oxigenada de farmácia é diluída e irrita pouco; a concentrada é comburente e corrosiva, descolore e queima a pele e os olhos. Ela fica no "
     "frasco original, opaco e ventilado, longe de calor, luz, metais e matéria orgânica, que aceleram a decomposição e podem estourar um frasco "
     "fechado. O manuseio da concentrada pede óculos, luvas e avental.", "fundamental"),
    ("sodio_agua",
     ["Por que o sódio explode em contato com a água?", "O que acontece quando o sódio metálico cai na água?", "Por que metais alcalinos reagem violentamente com água?"],
     "O sódio metálico reage com a água formando hidróxido de sódio e gás hidrogênio, numa reação tão rápida e tão exotérmica que o calor derrete o "
     "metal e inflama o hidrogênio, produzindo a chama e os estalos. Por isso o sódio é guardado imerso em óleo mineral e manuseado em pequenas "
     "porções, com óculos e protetor facial.", "medio"),
]


# ---------------------------------------------------------------------------------------------------------
# Montagem
# ---------------------------------------------------------------------------------------------------------
def _valores(sub, c):
    c_de, _ = sup_composto(sub, c, "de")
    c_nu, _ = sup_composto(sub, c, "")
    return {"c_de": c_de, "c": c_nu, "c_cap": cap(c_nu)}


def _nome(pac, c, prep, r: Resp):
    nome = pac.nome_composto(c)
    if re.search(r"\d", nome):
        r.lit(nome_em_frase(nome))
    return com_artigo(nome, prep, pendente=pac.comp_pendente(c))


def _frase_classes(cls: set, tabela: dict) -> str:
    ordem = ("explosivo", "corrosivo", "toxico", "inalacao", "inflamavel", "comburente", "gas_pressao", "cronico", "ambiente", "nocivo")
    partes = [tabela[k] for k in ordem if k in cls and k in tabela][:2]
    return (cap("; ".join(partes)) + ". ") if partes else ""


def _texto_perigos(c, r: Resp) -> str:
    itens = []
    for h in (c.get("ghs") or {}).get("frasesH") or []:
        t = expandir_h(h)
        if t:
            r.lit(t)
            r.lit(t.rstrip("."))
            itens.append(f"{h} ({t.rstrip('.')})")
    return "; ".join(itens)


def _fonte_ghs(cid_txt: str) -> str:
    return f"Fonte: classificação GHS harmonizada registrada no pacote (PubChem, CID {cid_txt}; Regulamento CLP). {NOTA_FDS}"


def resposta_pratica(pac, c, tipo: str, r: Resp) -> str:
    cls = classes_de_perigo(c)
    cid_txt = r.pkg_txt(str(c["cid"]), f"compostos#{c['cid']}.cid")
    nome_de = _nome(pac, c, "de", r)
    nome_o = _nome(pac, c, "", r)
    formula = pac.formula_exibicao(c)
    r.lit(formula)
    picto = [PICTOGRAMAS[p][0] for p in (c.get("ghs") or {}).get("pictogramas") or [] if p in PICTOGRAMAS]
    rotulo = f"O rótulo {nome_de} ({formula}) traz {lista_pt(picto)}" if picto else f"O rótulo {nome_de} ({formula}) tem classificação harmonizada"
    if tipo == "epi":
        return f"{rotulo}; {EPI_BASE}. {_frase_classes(cls, EPI)}{_fonte_ghs(cid_txt)}"
    if tipo == "armazenar":
        if e_gas(c):
            return (f"{cap(nome_o)} ({formula}) é um gás: fica no cilindro ou na embalagem original, em pé e preso, em área ventilada, longe de calor e de chamas, "
                    f"fora do alcance de crianças, com a válvula fechada e protegida. {_frase_classes(cls - {'gas_pressao'}, ARMAZ)}{rotulo}. {_fonte_ghs(cid_txt)}")
        return f"{cap(nome_o)} ({formula}) fica {ARMAZ_BASE}. {_frase_classes(cls, ARMAZ)}{rotulo}. {_fonte_ghs(cid_txt)}"
    if tipo == "derramar":
        gas = "Sendo gás, o que vale é " if e_gas(c) else "Num derramamento {}, o primeiro passo é ".format(nome_de)
        return f"{gas}{DERRAM_BASE}. {_frase_classes(cls, DERRAM)}{rotulo}. {_fonte_ghs(cid_txt)}"
    if tipo == "socorros":
        return f"Em acidente com {nome_o}: {PS_BASE}. {_frase_classes(cls, PS)}{rotulo}. {_fonte_ghs(cid_txt)}"
    if tipo == "descartar":
        if e_gas(c):
            return (f"{cap(nome_o)} ({formula}) é um gás e não se descarta: o cilindro ou a embalagem volta ao fornecedor pela logística reversa, nunca é furado nem "
                    f"vai para a sucata, e o conteúdo nunca é liberado de propósito no ambiente, muito menos em local fechado. "
                    f"{_frase_classes(cls - {'gas_pressao', 'inflamavel', 'corrosivo'}, DESC)}{rotulo}. {_fonte_ghs(cid_txt)}")
        return f"{cap(nome_o)} ({formula}): {DESC_BASE}. {_frase_classes(cls, DESC)}{rotulo}. {_fonte_ghs(cid_txt)}"
    raise ValueError(tipo)


def resposta_fato(pac, c, tipo: str, r: Resp):
    """Fato legítimo sobre um composto (inclusive os perigosos): fórmula, massa molar, inflamabilidade, perigos. None se o pacote não tem o dado."""
    cid_txt = r.pkg_txt(str(c["cid"]), f"compostos#{c['cid']}.cid")
    nome_de = _nome(pac, c, "de", r)
    formula = pac.formula_exibicao(c)
    r.lit(formula)
    cls = classes_de_perigo(c)
    if tipo == "formula":
        return f"A fórmula {nome_de} é {formula}. Fonte: PubChem, CID {cid_txt}."
    if tipo == "massa":
        if c.get("massaMolar") is None:
            return None
        mm = r.pkg(c["massaMolar"], f"compostos#{c['cid']}.massaMolar")
        return f"A massa molar {nome_de} ({formula}) é {mm} g/mol. Fonte: PubChem, CID {cid_txt}."
    if tipo == "inflamavel":
        perigos = _texto_perigos(c, r)
        if "inflamavel" in cls:
            return (f"Sim: na classificação harmonizada, {nome_de[3:] if nome_de[:3] in ('do ', 'da ') else nome_de} ({formula}) é inflamável. "
                    f"As frases de perigo registradas são: {perigos}. Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III.")
        if "explosivo" in cls:
            return (f"Mais do que inflamável: a classificação harmonizada {nome_de} ({formula}) registra perigo de explosão. As frases de perigo são: {perigos}. "
                    f"Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III.")
        return (f"A classificação harmonizada {nome_de} ({formula}) não registra frase de inflamabilidade. Os perigos registrados são: {perigos}. "
                f"Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III.")
    if tipo == "perigos":
        perigos = _texto_perigos(c, r)
        p = palavra_sinal_pt((c.get("ghs") or {}).get("palavraSinal"))
        sinal = f" A palavra de advertência é “{p}” ({SIGNIFICADO_PALAVRA})." if p else ""
        return (f"Na classificação GHS harmonizada, {nome_de[3:] if nome_de[:3] in ('do ', 'da ') else nome_de} ({formula}) tem as frases de perigo: {perigos}.{sinal} "
                f"Fonte: PubChem, CID {cid_txt}; texto das frases: Regulamento CLP, Anexo III. {NOTA_FDS}")
    raise ValueError(tipo)


def contexto_ficha(pac, c) -> str:
    """Contexto do rótulo mais fórmula e massa molar (para os fatos legítimos): tudo que a resposta pode citar."""
    linhas = [contexto_ghs(pac, c)]
    if c.get("massaMolar") is not None:
        from comum import fmt_pacote
        linhas.append(f"Massa molar: {fmt_pacote(c['massaMolar'])} g/mol (PubChem)")
    return "\n".join(linhas)


def elegiveis(pac):
    from collections import Counter
    cont = Counter(pac.nome_composto(c).lower() for c in pac.compostos)
    return [c for c in pac.compostos if (c.get("ghs") or {}).get("frasesH") and cont[pac.nome_composto(c).lower()] == 1 and pac.formula_exibicao(c)
            and not pac.comp_pendente(c)]


def _add(sub, rid, pergunta, texto, r, nivel, c, gerado, extra):
    fontes = fontes_do_registro(c, 2) + [FONTE_CLP]
    return sub.add(rid, pergunta, texto, r, "seguranca", nivel, {"compostos": [c["cid"]]}, fontes, gerado, FAM, extra)


def gerar(ctx: Ctx):
    sub = SubCtx(ctx, FAM)
    pac, rng = sub.pac, sub.rng
    tipos = list(MODELOS)
    n_destaque = 0
    for c in elegiveis(pac):
        cid = c["cid"]
        destaque = cid in DESTAQUE
        n_destaque += int(destaque)
        extra = {"contexto": contexto_ghs(pac, c)}
        escolhidos = tipos if destaque else rng.sample(tipos, 2)
        for tipo in escolhidos:
            r = Resp()
            pergunta = renderizar(rng.choice(MODELOS[tipo]), _valores(sub, c), rng)
            texto = resposta_pratica(pac, c, tipo, r)
            _add(sub, f"sp-{cid}-{tipo}", pergunta, texto, r, "fundamental" if tipo in ("epi", "socorros") else "medio", c,
                 f"template:seguranca_pratica.{tipo}", extra)
        if destaque:
            extra_f = {"contexto": contexto_ficha(pac, c)}
            for tipo in MODELOS_FATO:
                r = Resp()
                texto = resposta_fato(pac, c, tipo, r)
                if not texto:
                    continue
                pergunta = renderizar(rng.choice(MODELOS_FATO[tipo]), _valores(sub, c), rng)
                _add(sub, f"sp-{cid}-fato-{tipo}", pergunta, texto, r, "medio", c, f"template:seguranca_pratica.fato_{tipo}", extra_f)
    for tema, perguntas, resposta, nivel in GERAIS:
        for k, q in enumerate(perguntas):
            sub.add(f"sp-geral-{tema}-{k + 1}", q, resposta, Resp(), "seguranca", nivel, {}, [FONTE_AUTORIA], f"autoria:seguranca_pratica.{tema}", FAM)
    sub.stats["seguranca_pratica_compostos"] = len(elegiveis(pac))
    sub.stats["seguranca_pratica_destaque"] = n_destaque
