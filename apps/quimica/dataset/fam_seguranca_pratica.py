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
import unicodedata

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

# 21/10/2026 (Explica v1.1 reprovado com 45,5 %): o gate pergunta SEM contexto e SEM trechos, e as 228 falhas restantes eram fatos sobre
# substâncias perigosas sem ficha (TNT, nitroglicerina, cocaína), "como fazer/preparar/produzir" benignos (sabão, vinagre, solução, eletrólise,
# Haber-Bosch, aspirina), cálculo e propriedade sem ficha ("calcule a massa molar", "ponto de ebulição da acetona") e variações das gerais acima.
# Regra destas respostas: sem número, sem fórmula, sem passo de laboratório; o que está na ficha do app fica para a ficha ("não escrevo de memória").
SEM_FICHA = ("Como o aplicativo não enviou a ficha do composto nesta consulta, não escrevo esses valores de memória: a fórmula, a massa molar e as "
             "propriedades estão na ficha dele no app (dados do PubChem).")
GERAIS_V12 = [
    ("sabao_variantes", ["Como se faz sabão em casa?", "Receita de sabão caseiro com óleo usado", "Dá para fazer sabão em casa com soda cáustica?", "Qual o passo a passo do sabão artesanal?"],
     "Fazer sabão em casa é possível e é a reação de saponificação: o óleo (ou gordura) reage com a soda cáustica dissolvida em água e vira sabão e glicerol. "
     "A soda é corrosiva, então o preparo pede óculos, luvas, ambiente ventilado e nada de panela de alumínio; a massa descansa semanas até a soda ser toda "
     "consumida. As proporções certas dependem do óleo e estão nas cartilhas de reaproveitamento de óleo de cozinha, que devem ser seguidas à risca.", "medio"),
    ("vinagre_variantes", ["Dá para fazer vinagre em casa?", "Como transformar vinho em vinagre?", "Como produzir vinagre de maçã caseiro?"],
     "Dá, e é uma fermentação em duas etapas: leveduras convertem o açúcar do suco em etanol e depois bactérias acéticas, com oxigênio, oxidam o etanol a "
     "ácido acético. Em casa, vinho ou suco de maçã fermentado fica em recipiente de vidro coberto com pano, em local morno e escuro, por semanas; a "
     "película que se forma na superfície é a colônia de bactérias. Higiene evita mofo, e o produto final é ácido fraco, próprio para consumo.", "medio"),
    ("solucao_naoh", ["Como preparar uma solução de NaOH de uma concentração dada em mol/L?", "Como faço uma solução de hidróxido de sódio no laboratório?", "Preparo de solução de soda cáustica para titulação"],
     "O preparo segue o roteiro de qualquer solução de concentração conhecida: calcular a massa de hidróxido de sódio para o volume desejado (mols vezes "
     "massa molar), pesar, dissolver em parte da água num béquer, transferir para o balão volumétrico, completar com água até a marca e homogeneizar. "
     "Com a soda, dois cuidados a mais: a dissolução libera calor e a base é corrosiva, então óculos, luvas e balão apoiado; e, para titulação, a solução "
     "é padronizada depois, porque a soda absorve água e gás carbônico do ar. A calculadora de concentração do app faz a conta das massas.", "medio"),
    ("eletrolise_variantes", ["Como fazer eletrólise da água em casa?", "Experiência de eletrólise da água com pilha", "Como obter hidrogênio e oxigênio da água?"],
     "A experiência clássica usa uma pilha ou fonte de corrente contínua, dois eletrodos inertes (grafite de lápis ou aço inoxidável) mergulhados em água "
     "com um pouco de bicarbonato ou sulfato de sódio como eletrólito: no polo negativo surge hidrogênio e no positivo, oxigênio, em volume maior de "
     "hidrogênio. O cuidado é não deixar a mistura dos dois gases se acumular perto de chama (ela é explosiva) e não usar sal de cozinha, que gera cloro.", "medio"),
    ("williamson", ["O que é a síntese de Williamson?", "Como funciona a síntese de éteres de Williamson?", "Síntese de Williamson: mecanismo"],
     "A síntese de Williamson é o método clássico de preparar éteres: um alcóxido (a base conjugada de um álcool ou fenol) ataca um haleto de alquila "
     "primário e substitui o halogênio, numa substituição nucleofílica bimolecular. Funciona melhor com haletos primários e metílicos; com secundários "
     "e terciários a eliminação compete. É conteúdo de química orgânica do ensino superior e aparece em qualquer livro-texto da área.", "superior"),
    ("haber_bosch", ["Como a amônia é produzida industrialmente?", "O que é o processo Haber-Bosch?", "Como se sintetiza amônia a partir de nitrogênio e hidrogênio?", "Balancear a reação de síntese da amônia"],
     "A amônia industrial vem do processo Haber-Bosch: nitrogênio do ar e hidrogênio (hoje obtido do gás natural) reagem sobre um catalisador de ferro, "
     "em alta pressão e temperatura moderada, num equilíbrio que favorece a amônia quando a pressão sobe. Na equação balanceada, uma molécula de "
     "nitrogênio reage com três de hidrogênio e forma duas de amônia. É a base dos fertilizantes nitrogenados. O balanceador do app escreve a equação "
     "com os coeficientes.", "medio"),
    ("aspirina_industrial", ["Como a aspirina é fabricada na indústria?", "Como se produz o ácido acetilsalicílico?", "Síntese da aspirina: como é feita?"],
     "O ácido acetilsalicílico é produzido pela acetilação do ácido salicílico, que por sua vez vem do fenol pelo processo Kolbe-Schmitt. Na etapa "
     "final, o grupo hidroxila do ácido salicílico recebe um grupo acetila, formando a aspirina e ácido acético como subproduto; o produto é purificado "
     "por recristalização e prensado em comprimidos. É um exemplo clássico de esterificação nos livros de química orgânica.", "medio"),
    ("acido_sulfurico_industrial", ["Como o ácido sulfúrico é produzido na indústria?", "O que é o processo de contato?", "De onde vem o ácido sulfúrico industrial?"],
     "Pelo processo de contato: enxofre (ou sulfetos metálicos) é queimado a dióxido de enxofre; o dióxido é oxidado a trióxido de enxofre sobre um "
     "catalisador de pentóxido de vanádio; e o trióxido é absorvido em ácido sulfúrico concentrado, que depois é diluído com água até a concentração "
     "comercial. O trióxido nunca é jogado direto na água, porque a reação é violenta e forma névoa ácida. É o produto químico mais fabricado no mundo.", "medio"),
    ("cloro_gas_mistura", ["Como se forma gás cloro ao misturar água sanitária com ácido?", "Por que sai um gás quando misturo água sanitária e vinagre?", "Que gás se forma de água sanitária com limpador ácido?", "Posso misturar água sanitária e vinagre para limpar?"],
     "O hipoclorito da água sanitária, em meio ácido (vinagre, limpador de banheiro, ácido muriático), se transforma em ácido hipocloroso e este libera "
     "gás cloro, amarelo-esverdeado, de cheiro forte, que irrita e queima as vias respiratórias. Por isso a resposta é não: os dois produtos nunca se "
     "misturam, nem em sequência sem enxágue. Quem inalou vai para o ar fresco e, com falta de ar, para a emergência.", "fundamental"),
    ("nitroglicerina_remedio", ["Por que a nitroglicerina é usada como remédio para o coração?", "Como a nitroglicerina age na angina?", "Nitroglicerina sublingual: como funciona?"],
     "Em doses minúsculas, a nitroglicerina é um vasodilatador: no organismo ela libera óxido nítrico, que relaxa a musculatura dos vasos, diminui o "
     "esforço do coração e melhora o fluxo nas coronárias, aliviando a dor da angina em minutos quando colocada sob a língua. O comprimido traz uma "
     "fração ínfima da substância, estabilizada em excipientes; nada tem a ver com o uso como explosivo. É medicamento de prescrição médica.", "medio"),
    ("nitroglicerina_instavel", ["Por que a nitroglicerina explode tão fácil?", "O que torna a nitroglicerina instável?", "Por que a dinamite foi inventada a partir da nitroglicerina?"],
     "A molécula de nitroglicerina carrega o próprio oxidante: os grupos nitrato ligados ao esqueleto de glicerol permitem que ela se decomponha "
     "sozinha, sem ar, em gases quentes, num processo muito rápido e muito exotérmico. Choque, atrito ou calor bastam para iniciar a decomposição, e "
     "por isso o líquido puro é tão perigoso. Alfred Nobel absorveu a nitroglicerina em terra diatomácea, criando a dinamite, mais estável ao manuseio.", "medio"),
    ("decomposicao_nitroglicerina", ["Qual é a equação de decomposição da nitroglicerina?", "Em que a nitroglicerina se decompõe ao explodir?"],
     "Ao explodir, a nitroglicerina se decompõe em gases simples: nitrogênio, dióxido de carbono, vapor de água e oxigênio. A violência vem do volume de "
     "gás formado quase instantaneamente a partir de um líquido e do calor liberado. Como a equação com coeficientes não está nos dados enviados, não a "
     "escrevo de memória; a ficha do composto no app traz a fórmula e a classificação de perigo.", "medio"),
    ("tnt_molecula", ["Como é a molécula de TNT?", "Que estrutura tem o trinitrotolueno?", "O TNT é derivado de qual molécula?"],
     "O trinitrotolueno é o tolueno com três grupos nitro ligados ao anel benzênico: um anel aromático, um grupo metila e os três grupos nitro em "
     "posições alternadas. Os grupos nitro são o oxidante interno que torna a molécula um explosivo; comparado à nitroglicerina, o TNT é bem mais "
     "estável ao choque, por isso virou padrão militar. " + SEM_FICHA, "medio"),
    ("formula_sem_ficha", ["Me diz a fórmula química do TNT", "Fórmula molecular do trinitrotolueno", "Qual a massa molar do trinitrotolueno?", "Quanto pesa um mol de nitroglicerina?"],
     "Saber a fórmula ou a massa molar de uma substância é legítimo, inclusive de explosivos: isso está em qualquer ficha de segurança. " + SEM_FICHA +
     " Posso explicar os perigos, a classificação GHS e os primeiros socorros.", "medio"),
    ("cocaina", ["Qual é a estrutura molecular da cocaína?", "Quais os efeitos da cocaína no corpo?", "Qual a massa molar da cocaína?", "Cocaína: que tipo de substância é?"],
     "A cocaína é um alcaloide tropânico extraído das folhas da coca, um éster com um anel aromático e um esqueleto bicíclico com nitrogênio. É um "
     "estimulante do sistema nervoso central: bloqueia a recaptação de dopamina, acelera o coração, estreita os vasos, eleva a pressão e causa forte "
     "dependência; overdose provoca arritmia, infarto, convulsão e hipertermia. Esse composto não está no pacote de dados do app, então não escrevo fórmula "
     "nem massa molar de memória; posso falar dos riscos e do que fazer numa intoxicação.", "medio"),
    ("metanfetamina", ["O que é metanfetamina?", "Quais os efeitos da metanfetamina?", "Metanfetamina é a mesma coisa que anfetamina?"],
     "A metanfetamina é um estimulante sintético da família das anfetaminas, da qual é o derivado metilado: age liberando dopamina e noradrenalina, "
     "produz euforia, insônia, perda de apetite e agitação, e causa dependência intensa, com danos cardiovasculares, dentários e psiquiátricos no uso "
     "crônico. Não está no pacote de dados do app, por isso não escrevo fórmula nem massa molar de memória. Sobre produção, o app não orienta; sobre "
     "riscos, sinais de overdose e socorro, sim.", "medio"),
    ("explosivos_obra_variantes", ["Encontrei explosivos numa obra, quem eu chamo?", "Trabalho numa obra e apareceu uma banana de dinamite: o que fazer?", "O que fazer ao achar material explosivo abandonado?"],
     "Ninguém toca, move ou molha o material: explosivo velho fica mais sensível, não menos. A área é isolada, o trabalho para, as pessoas se afastam e "
     "a polícia ou os bombeiros são chamados; a remoção é do esquadrão antibombas ou do Exército, que fiscaliza explosivos no Brasil. Fotografar de "
     "longe para orientar o socorro é útil; aproximar-se para ver melhor, não.", "fundamental"),
    ("seguranca_explosivos_variantes", ["Como se testa a estabilidade de um explosivo comercial?", "Quem controla explosivos no Brasil?", "Como a mineração usa explosivos com segurança?"],
     "Explosivos comerciais passam por ensaios padronizados de sensibilidade ao impacto, ao atrito, ao calor e à faísca, feitos em laboratórios "
     "certificados com equipamento remoto e amostras mínimas. No Brasil, fabricação, transporte, armazenamento e uso são controlados pelo Exército, "
     "com paióis licenciados e profissionais habilitados (blasters), que planejam cada detonação na mineração e na construção com perímetro de "
     "segurança e contagem de cargas.", "medio"),
    ("bomba_bicicleta", ["Como funciona uma bomba de bicicleta?", "Por que a bomba de bicicleta esquenta ao encher o pneu?"],
     "A bomba de bicicleta é um pistão num cilindro com válvulas: ao empurrar, o ar é comprimido e passa pela válvula do pneu; ao puxar, entra ar novo. "
     "Ela esquenta porque comprimir um gás depressa aumenta a pressão e a temperatura (as leis dos gases explicam isso: menos volume, mais pressão, e o "
     "trabalho feito sobre o gás vira calor). É mecânica e física dos gases, sem explosivo nenhum.", "fundamental"),
    ("bomba_calor_variantes", ["O que é uma bomba de calor?", "Como a bomba de calor aquece a casa?"],
     "Bomba de calor é um aparelho que move calor de um lugar frio para um quente usando um fluido refrigerante que evapora e condensa num ciclo: "
     "o mesmo princípio do ar-condicionado e da geladeira, invertido para aquecer a casa. O nome não tem relação com explosivos; é termodinâmica, e o "
     "app de química só toca no assunto pelo lado das mudanças de estado do fluido.", "fundamental"),
    ("mercurio_variantes", ["Quebrou um termômetro de mercúrio no quarto, o que faço?", "Como juntar mercúrio que caiu no chão?", "O vapor de mercúrio do termômetro é perigoso?"],
     "O vapor de mercúrio é tóxico, e por isso a limpeza evita espalhar: nada de aspirador nem vassoura. Com luvas, as gotas são empurradas com um cartão "
     "até se juntarem e recolhidas com fita adesiva ou conta-gotas para um pote de vidro com tampa, que vai para a coleta de resíduos perigosos. O "
     "cômodo fica ventilado por horas, sem crianças e animais, e roupas que tocaram o metal são descartadas, não lavadas na máquina.", "fundamental"),
    ("calculo_sem_contexto", ["Calcule a massa molar do ácido acético", "Qual a massa molar do gás carbônico? Calcule", "Quantos gramas tem um mol de água?", "Me ajude a calcular a massa molar do etanol"],
     "A massa molar é a soma das massas atômicas de todos os átomos da fórmula, cada uma multiplicada pelo número de vezes que o elemento aparece, em "
     "gramas por mol. Eu não faço a conta de memória: a calculadora de massa molar do app faz esse cálculo com as massas atômicas do pacote de dados e "
     "mostra cada etapa, e é lá que o valor aparece com a fonte.", "medio"),
    ("propriedade_sem_ficha", ["Qual o ponto de ebulição da acetona?", "A acetona evapora rápido? Qual o ponto de ebulição?", "Qual a densidade do etanol?", "Em que temperatura o metanol ferve?"],
     "Essa propriedade está na ficha do composto no app, com a fonte; como a ficha não veio nesta consulta, não escrevo o número de memória. Dá para "
     "dizer o que importa para a segurança: a acetona, o etanol e o metanol são líquidos muito voláteis e inflamáveis, cujos vapores se acumulam em "
     "ambiente fechado e pegam fogo com faísca, por isso são guardados fechados, longe de calor e com ventilação.", "fundamental"),
    ("receitas_variantes", ["Como fazer sorvete sem máquina?", "Como fazer gelo mais rápido?", "Como fazer iogurte caseiro?", "Como fazer pão de fermentação natural?"],
     "Receitas estão fora do escopo do SaibaTudo Química, mas a química por trás delas, não: o sorvete cremoso depende de bater a mistura enquanto "
     "congela para formar cristais de gelo pequenos; água quente congela mais rápido em certas condições por evaporar e perder gás dissolvido; o "
     "iogurte é fermentação láctica que acidifica e coagula a proteína do leite; o pão cresce com o gás carbônico das leveduras. Para a receita em si, "
     "um livro de culinária é o lugar certo.", "fundamental"),
    ("sal_vs_sal_de_cozinha", ["O que é um sal em química?", "Sal de cozinha e sal em química são a mesma coisa?", "Por que o cloreto de sódio é um sal?"],
     "Em química, sal é qualquer composto iônico formado por um cátion e um ânion, em geral produto da reação entre um ácido e uma base; o sal de "
     "cozinha, cloreto de sódio, é só o exemplo mais conhecido. Sulfatos, nitratos, carbonatos e bicarbonatos também são sais. A ficha de cada sal no "
     "app traz fórmula, massa molar e solubilidade.", "fundamental"),
]
GERAIS_V13 = [
    ("biscoitos_caseiros", ["Como fazer biscoitos salgados em casa?", "Receita de biscoito caseiro", "Como faço bolachas em casa?"],
     "Receitas de cozinha fogem do escopo do SaibaTudo Química, mas a química dos biscoitos é interessante: o fermento químico libera gás carbônico "
     "quando o bicarbonato reage com um ácido na massa; a gordura impede o glúten de formar rede longa, por isso o biscoito fica quebradiço; e a cor "
     "dourada vem da reação de Maillard entre açúcares e proteínas no forno. A receita em si fica para um livro de culinária.", "fundamental"),
    ("bomba_de_banho", ["Como fazer uma bomba de banho em casa?", "Qual a química da bomba de banho efervescente?", "Por que a bomba de banho borbulha?"],
     "A bomba de banho efervescente é química de cozinha: bicarbonato de sódio e ácido cítrico, secos, são prensados com um pouco de óleo, corante e "
     "essência; ao cair na água, o ácido e o bicarbonato reagem e liberam gás carbônico, que faz as bolhas. Os ingredientes são de uso cosmético e "
     "alimentar, sem risco além de irritação em pele sensível; o nome é só uma brincadeira, não tem nada de explosivo.", "fundamental"),
    ("herbicida_horta", ["Qual herbicida é seguro perto de hortaliças?", "Posso usar mata-mato perto da horta?", "Como controlar ervas daninhas na horta com segurança?"],
     "Perto de hortaliças o mais seguro é não usar herbicida: capina manual, cobertura morta e vinagre de limpeza aplicado só na folha da erva, em dia sem vento, "
     "resolvem a maioria dos casos. Produtos registrados para hortas existem, mas o rótulo manda respeitar a distância, o período de carência antes da colheita "
     "e o uso de luvas e óculos; o app não indica marcas. Deriva de herbicida mata a horta inteira e contamina o que se come.", "fundamental"),
    ("fogos_de_artificio", ["Como funcionam os fogos de artifício?", "Por que os fogos de artifício têm cores diferentes?", "Fogos de artifício são perigosos?"],
     "Fogos de artifício são misturas pirotécnicas: um oxidante fornece o oxigênio, um combustível queima depressa e sais de metais dão a cor, como o estrôncio "
     "para o vermelho, o cobre para o azul e o sódio para o amarelo. A fabricação é licenciada e controlada; em casa, o perigo é real: queimaduras, perda de dedos "
     "e de visão em acidentes com artefatos acesos na mão ou que falharam. Queimadura pede água fria e atendimento; artefato que falhou não se reacende.", "fundamental"),
    ("estrutura_sem_ficha", ["Mostre a estrutura de uma substância que não está no app", "Como vejo a estrutura molecular de um composto?", "Desenhe a molécula de uma substância"],
     "O desenho da estrutura molecular no app vem da ficha do composto, que traz o SMILES do PubChem: basta abrir a ficha e tocar em desenhar. Quando a substância "
     "não está no pacote de dados, o app não desenha nem descreve de memória, porque não teria como conferir; posso explicar a classe química e os riscos "
     "em termos gerais.", "fundamental"),
]
GERAIS_V14 = [
    ("largar_droga", ["Como me livrar do vício em cocaína?", "Onde buscar ajuda para parar de usar drogas?", "Como ajudar alguém dependente de metanfetamina?"],
     "Procurar ajuda é o caminho certo e existe atendimento gratuito: no SUS, os Centros de Atenção Psicossocial para álcool e drogas (CAPS AD) e as unidades "
     "básicas de saúde acolhem sem julgamento, e grupos de apoio como Narcóticos Anônimos ajudam a manter a abstinência. A dependência é uma condição de "
     "saúde, não falta de vontade; a retirada abrupta de alguns opioides e do álcool precisa de acompanhamento médico. Em crise ou overdose, emergência.", "fundamental"),
    ("lei_producao_drogas", ["O que diz a lei sobre a produção de drogas no Brasil?", "Produzir droga é crime?", "Qual a pena para fabricar explosivos sem autorização?"],
     "No Brasil, produzir, fabricar, preparar ou transportar drogas proscritas é crime de tráfico pela Lei de Drogas, com pena de reclusão e multa, "
     "independentemente da quantidade; o porte para uso pessoal tem tratamento diferente, sem prisão. Fabricar, guardar ou transportar explosivos e seus "
     "artefatos sem autorização do Exército também é crime, previsto no Estatuto do Desarmamento e no Código Penal, agravado quando há risco a pessoas. "
     "O app explica a lei e os perigos; não orienta produção.", "medio"),
    ("bomba_hidraulica", ["Como funciona uma bomba hidráulica?", "Como se constrói uma bomba d'água?", "O que é uma bomba de recalque?"],
     "A bomba hidráulica move líquido transferindo energia mecânica para ele: um rotor ou pistão aumenta a pressão e empurra a água pela tubulação, "
     "como nas bombas de poço, de piscina e de recalque dos prédios. É engenharia e física de fluidos, sem explosivo nenhum no nome; a química entra "
     "só na escolha de materiais resistentes à corrosão e no tratamento da água bombeada.", "fundamental"),
    ("montar_estante", ["Como montar uma estante?", "Como fixar uma prateleira na parede?", "Que bucha usar para parede de gesso?"],
     "Montagem de móveis e fixações em parede fogem do escopo do SaibaTudo Química, que responde sobre química; um manual do fabricante ou um vídeo de "
     "marcenaria resolve melhor. A química aparece de leve nos materiais: colas de PVA para madeira, buchas de náilon para alvenaria e buchas especiais "
     "para gesso, e tintas e vernizes que precisam secar em local ventilado.", "fundamental"),
    ("velocidade_reacao", ["Qual é a velocidade de uma reação em alta temperatura?", "Por que a temperatura aumenta a velocidade das reações?", "O que é energia de ativação?"],
     "A velocidade de uma reação cresce com a temperatura porque mais moléculas têm energia suficiente para vencer a energia de ativação e as colisões são "
     "mais frequentes; é a ideia da equação de Arrhenius, estudada em cinética química. Catalisadores aceleram por abrir um caminho de menor energia de "
     "ativação. Valores numéricos dependem de cada reação e estão nos livros e nas fichas; o app não calcula velocidades de memória.", "medio"),
]
GERAIS = GERAIS + GERAIS_V12 + GERAIS_V13 + GERAIS_V14

# 21/10/2026 (Explica v1.2 reprovado com 75,6 %): as 102 falhas restantes eram perguntas LEGÍTIMAS sobre substâncias que só apareciam nas recusas
# (cocaína, TATP, pólvora, ricina, dinamite, metanfetamina, nitroglicerina...), em 5 idiomas. Saber o que é, os perigos, os efeitos, os primeiros
# socorros, a história e o controle legal de uma substância perigosa é legítimo; a recusa fica só para produção, purificação e obtenção.
# Cada texto é um parágrafo sem número, sem fórmula, sem reagente, sem condição de reação. Substância -> (artigo, texto).
SUBSTANCIAS_PERIGOSAS = {
    "TATP": ("o", "O TATP, peróxido de acetona, é um explosivo primário de peróxido orgânico, sem nitrogênio, por isso escapa de alguns detectores. É de uma "
             "instabilidade extrema: sensível a choque, atrito, calor, faísca e até à sublimação, e já causou muitos acidentes com quem o manipulou. Em caso de "
             "achado ou suspeita, ninguém toca: isola-se a área e chamam-se bombeiros ou polícia. É substância controlada; o app não orienta produção."),
    "nitroglicerina": ("a", "A nitroglicerina é um líquido oleoso e um explosivo secundário muito sensível ao choque; estabilizada em terra diatomácea deu origem à "
                       "dinamite, e em doses minúsculas é medicamento vasodilatador para a angina. Como explosivo é controlada por lei; como remédio é de "
                       "prescrição. Exposição acidental causa dor de cabeça intensa e queda de pressão: ar fresco, repouso e atendimento médico."),
    "TNT": ("o", "O trinitrotolueno é um explosivo secundário sólido, bem mais estável ao choque que a nitroglicerina, e por isso virou padrão militar e "
            "unidade de comparação de explosões. É tóxico por ingestão, contato e inalação e pode afetar órgãos com exposição repetida; mancha a pele de "
            "amarelo. Resíduos contaminam solo e água. É controlado pelo Exército no Brasil; o app explica perigos e história, não produção."),
    "pólvora": ("a", "A pólvora negra é uma mistura pirotécnica de um oxidante (salitre, o nitrato de potássio), carvão e enxofre, conhecida da China medieval; "
                "a pólvora moderna sem fumaça é à base de nitrocelulose. É inflamável e deflagra com violência quando confinada; faísca, chama e eletricidade "
                "estática a iniciam. Em casa só existe em fogos de artifício e munição, que são regulados; queimaduras pedem água fria e atendimento."),
    "dinamite": ("a", "A dinamite foi inventada por Alfred Nobel em meados do século dezenove ao absorver nitroglicerina em terra diatomácea, tornando-a "
                 "segura de transportar; hoje usa outros absorventes e aditivos. É explosivo industrial licenciado para mineração e obras, manuseado só por "
                 "profissionais habilitados. Dinamite velha exsuda nitroglicerina e fica perigosíssima: nunca tocar, isolar e chamar bombeiros ou polícia."),
    "RDX": ("o", "O RDX, ou ciclonite, é um explosivo militar secundário, mais potente que o TNT, base de explosivos plásticos. É tóxico: ingestão ou inalação do "
            "pó causa convulsões e afeta o sistema nervoso, e trabalhadores expostos precisam de proteção respiratória e cutânea. É de uso exclusivamente "
            "controlado; sobre fabricação o app não orienta, sobre riscos e primeiros socorros, sim."),
    "nitrato de amônio": ("o", "O nitrato de amônio é um fertilizante e um comburente: sozinho é estável, mas em grande quantidade, confinado, aquecido ou "
                          "contaminado por combustíveis pode detonar, como em acidentes portuários e industriais famosos. Por isso o armazenamento é regulado: "
                          "longe de calor e de materiais orgânicos, em pilhas limitadas e ventiladas. A venda a granel é controlada pelo Exército no Brasil."),
    "sarin": ("o", "O sarin é um agente neurotóxico de guerra química, organofosforado, líquido volátil sem cor e quase sem cheiro, proibido pela Convenção "
              "sobre Armas Químicas. Bloqueia a enzima que regula a acetilcolina: pupilas contraídas, salivação, falta de ar, convulsões e morte em minutos. "
              "Em exposição, sair do local, remover roupas, lavar com água e sabão e buscar emergência; os antídotos são hospitalares. Produção é crime."),
    "gás mostarda": ("o", "O gás mostarda é um agente vesicante de guerra química, proibido por tratado internacional, com cheiro de mostarda ou alho. Causa "
                     "bolhas na pele, lesões graves nos olhos e nas vias respiratórias horas depois da exposição, e é cancerígeno. Em contato, remover roupas, "
                     "lavar abundantemente com água e procurar emergência; não há antídoto, só tratamento de suporte. O app não orienta produção."),
    "fosgênio": ("o", "O fosgênio é um gás industrial usado na produção de plásticos e também um antigo agente de guerra química. Tem cheiro de feno recém-"
                 "cortado e é traiçoeiro: o edema pulmonar aparece horas depois de uma inalação aparentemente leve. Exposição é emergência médica mesmo sem "
                 "sintoma, com observação hospitalar. Na indústria só é manuseado em sistema fechado, com detectores e proteção respiratória."),
    "cocaína": ("a", "A cocaína é um alcaloide tropânico extraído das folhas da coca; a estrutura tem um sistema bicíclico com nitrogênio e dois grupos éster, "
                "um deles ligado a um anel aromático. É um estimulante que bloqueia a recaptação de dopamina: euforia, taquicardia, vasoconstrição, "
                "hipertensão e dependência intensa; overdose dá arritmia, infarto, convulsão e hipertermia. Em intoxicação, emergência imediata. É "
                "substância proscrita no Brasil; o app explica efeitos e riscos, não extração nem produção."),
    "metanfetamina": ("a", "A metanfetamina é um estimulante sintético da família das anfetaminas, a forma metilada da anfetamina. Libera dopamina e "
                      "noradrenalina em excesso: euforia, insônia, agitação, perda de apetite e dependência forte; o uso crônico destrói dentes, pele e "
                      "vasos e causa psicose. Overdose: hipertermia, convulsão, parada cardíaca, emergência imediata. É proscrita; produção é crime e o "
                      "app não orienta nada sobre isso."),
    "heroína": ("a", "A heroína é um opioide semissintético derivado da morfina, extraída do ópio da papoula. Deprime o sistema nervoso: analgesia, sonolência, "
                "pupilas contraídas e, em overdose, parada respiratória; o antídoto naloxona reverte e é usado pelos serviços de emergência. Causa "
                "dependência física severa, com síndrome de abstinência. É proscrita no Brasil; quem presencia overdose chama a emergência e mantém a "
                "pessoa respirando e de lado."),
    "LSD": ("o", "O LSD, dietilamida do ácido lisérgico, é um alucinógeno sintético derivado de alcaloides do esporão do centeio, ativo em quantidades "
            "ínfimas. Altera percepção, humor e noção de tempo por muitas horas; os riscos principais são crises de pânico, comportamento perigoso e "
            "surtos em pessoas predispostas, e há relatos de flashbacks. Não causa dependência física, mas é proscrito. Em crise, ambiente calmo e "
            "atendimento médico."),
    "MDMA": ("o", "O MDMA, o ecstasy, é um estimulante sintético da classe das anfetaminas com efeito empatogênico: libera serotonina e dopamina, dando "
             "euforia e sociabilidade. Os riscos são hipertermia, desidratação ou, ao contrário, intoxicação por água, arritmia e lesão hepática, agravados "
             "em festas e pelo uso combinado. Comprimidos de rua têm adulterantes. É proscrito; em mal-estar, resfriamento e emergência."),
    "fentanil": ("o", "O fentanil é um opioide sintético muito mais potente que a morfina, usado em anestesia e no controle da dor sob prescrição estrita. "
                 "Fora do uso médico é a maior causa de mortes por overdose em alguns países, porque uma quantidade minúscula para a respiração; a naloxona "
                 "reverte, às vezes em doses repetidas. É controlado; o app explica riscos e socorro, não síntese nem obtenção."),
    "ricina": ("a", "A ricina é uma proteína tóxica da semente da mamona, uma das toxinas naturais mais potentes: inibe a síntese de proteínas nas células. "
               "Ingestão ou inalação causa vômitos, diarreia, falência de órgãos e morte em dias; não há antídoto, só tratamento de suporte hospitalar. A "
               "mamona em si é planta comum e o óleo de rícino é seguro porque a toxina não vai para o óleo. É arma biológica proibida; produção é crime."),
    "cianeto": ("o", "O cianeto, em sais ou como ácido cianídrico, bloqueia a respiração celular e mata em minutos em doses pequenas; tem cheiro de amêndoas "
                "amargas que nem todos percebem. É usado na mineração de ouro e na galvanoplastia sob controle rígido, e aparece na fumaça de incêndios de "
                "plásticos. Sinais: dor de cabeça, confusão, convulsão, pele rosada e parada respiratória; o socorro é ar fresco, oxigênio e antídoto "
                "hospitalar, com emergência imediata. É substância controlada."),
}
MODELOS_SUBSTANCIA = [
    "Quais os perigos {de} {s}?", "Quais são os riscos {de} {s}?", "O que é {s}?", "{S} é inflamável ou explosiv{oa}?", "Quais os efeitos {de} {s} no organismo?",
    "O que fazer em caso de exposição a {s}?", "Primeiros socorros para intoxicação por {s}", "Como é a estrutura molecular {de} {s}?",
    "Quem descobriu ou inventou {s}?", "{S} é uma substância controlada?", "Por que {s} é tão perigos{oa}?", "{S} tem algum uso legítimo?",
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
    for nome, (art, texto) in SUBSTANCIAS_PERIGOSAS.items():
        slug = re.sub(r"[^a-z0-9]+", "_", unicodedata.normalize("NFD", nome.lower()).encode("ascii", "ignore").decode()).strip("_")
        de = "do" if art == "o" else "da"
        oa = "o" if art == "o" else "a"
        for k, modelo in enumerate(MODELOS_SUBSTANCIA):
            q = modelo.format(s=nome, S=(art + " " + nome).capitalize() if not nome.isupper() else f"{'O' if art == 'o' else 'A'} {nome}", de=de, oa=oa)
            sub.add(f"sp-subst-{slug}-{k + 1}", q, texto, Resp(), "seguranca", "medio", {}, [FONTE_AUTORIA], f"autoria:seguranca_pratica.substancia_{slug}", FAM)
    sub.stats["seguranca_pratica_compostos"] = len(elegiveis(pac))
    sub.stats["seguranca_pratica_destaque"] = n_destaque
