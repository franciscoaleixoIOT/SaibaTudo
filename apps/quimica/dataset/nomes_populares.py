# -*- coding: utf-8 -*-
"""Nomes populares e comerciais de compostos do pacote, cada um com a EVIDÊNCIA no próprio pacote (nada de memória).

Cada entrada: (alias como as pessoas escrevem, CID, gênero do alias, tipo, evidência, explicação)
  tipo "sinonimo": o pacote registra o alias como nome da MESMA substância (nomePopular ou sinonimos do composto);
  tipo "produto":  o alias é o nome de um produto que CONTÉM a substância (só entra em perguntas de fórmula, perfil e segurança, e a
                   resposta avisa que a classificação é a do composto, não a do produto comercial).
  evidência: "compostos#<cid>.nomePopular" | "compostos#<cid>.sinonimos" | "textos#<id do trecho>|<frase literal do trecho>"
  explicação: frase que liga o alias ao composto na resposta ({do_nome} = "do hidróxido de sódio", {o_nome} = "o hidróxido de sódio",
               {formula} = fórmula do pacote).

Conferido no pacote de 10/10/2026. FICARAM DE FORA (sem correspondência confirmada no pacote ou ambíguos): "cloro de piscina" (o pacote não
liga o termo a um composto), "soda" sozinho (soda cáustica × barrilha), "álcool" sozinho (classe de compostos × etanol), "cal hidratada"/
"cal apagada" (dois registros com o nome "Hidróxido de cálcio") e "gelo seco" (o trecho não diz que é CO₂). Um teste confere todas as evidências.
"""

NOMES_POPULARES = [
    ("soda cáustica", 14798, "a", "sinonimo", "compostos#14798.nomePopular", "Soda cáustica é o nome popular {do_nome} ({formula})."),
    ("potassa cáustica", 14797, "a", "sinonimo", "compostos#14797.nomePopular", "Potassa cáustica é o nome popular {do_nome} ({formula})."),
    ("cal virgem", 14778, "a", "sinonimo", "compostos#14778.nomePopular", "Cal virgem é o nome popular {do_nome} ({formula})."),
    ("cal viva", 14778, "a", "sinonimo", "compostos#14778.sinonimos", "Cal viva é outro nome {do_nome} ({formula})."),
    ("água oxigenada", 784, "a", "sinonimo", "compostos#784.nomePopular", "Água oxigenada é o nome popular {do_nome} ({formula})."),
    ("bicarbonato", 516892, "o", "sinonimo", "compostos#516892.nomePopular", "“Bicarbonato” é o nome popular {do_nome} ({formula})."),
    ("sal de cozinha", 5234, "o", "sinonimo", "compostos#5234.nomePopular", "Sal de cozinha é o nome popular {do_nome} ({formula})."),
    ("barrilha", 10340, "a", "sinonimo", "compostos#10340.nomePopular", "Barrilha é o nome popular {do_nome} ({formula})."),
    ("amoníaco", 222, "o", "sinonimo", "compostos#222.sinonimos", "Amoníaco é outro nome {do_nome} ({formula})."),
    ("álcool etílico", 702, "o", "sinonimo", "compostos#702.nomePopular", "Álcool etílico é o nome popular {do_nome} ({formula})."),
    ("álcool metílico", 887, "o", "sinonimo", "compostos#887.nomePopular", "Álcool metílico é o nome popular {do_nome} ({formula})."),
    ("álcool isopropílico", 3776, "o", "sinonimo", "compostos#3776.nomePopular", "Álcool isopropílico é o nome popular {do_nome} ({formula})."),
    ("gás carbônico", 280, "o", "sinonimo", "compostos#280.nomePopular", "Gás carbônico é o nome popular {do_nome} ({formula})."),
    ("gás hilariante", 948, "o", "sinonimo", "compostos#948.nomePopular", "Gás hilariante é o nome popular {do_nome} ({formula})."),
    ("salitre", 24434, "o", "sinonimo", "compostos#24434.nomePopular", "Salitre é o nome popular {do_nome} ({formula})."),
    ("gesso", 24928, "o", "sinonimo", "compostos#24928.nomePopular", "Gesso é o nome popular {do_nome} ({formula})."),
    ("naftalina", 931, "a", "sinonimo", "compostos#931.nomePopular", "Naftalina é o nome popular {do_nome} ({formula})."),
    ("sílica", 24261, "a", "sinonimo", "compostos#24261.nomePopular", "Sílica é o nome popular {do_nome} ({formula})."),
    ("cal clorada", 24504, "a", "sinonimo", "compostos#24504.sinonimos", "Cal clorada é outro nome {do_nome} ({formula})."),
    ("pedra-ume", 24856, "a", "sinonimo", "compostos#24856.sinonimos", "Pedra-ume é outro nome {do_nome} ({formula})."),
    ("açúcar de mesa", 5988, "o", "sinonimo", "compostos#5988.nomePopular", "Açúcar de mesa é o nome popular {do_nome} ({formula})."),
    ("ácido muriático", 313, "o", "produto",
     "textos#wikilivros-pt-introducao-a-quimica-aplicacoes-de-acidos-bases-sais-e-oxidos-001|O ácido clorídrico, na forma impura, ainda é vendido sob essa designação",
     "Ácido muriático é a designação com que {o_nome} ({formula}), na forma impura, ainda é vendido."),
    ("vinagre", 176, "o", "produto", "textos#wikipedia-pt-acido-etanoico-001|Em sua forma impura, é popularmente conhecido como vinagre",
     "Vinagre é como se chama popularmente {o_nome} ({formula}) na forma impura."),
    ("água sanitária", 23665760, "a", "produto", "compostos#23665760.nomePopular",
     "No pacote de dados, “água sanitária” é o nome popular registrado para {o_nome} ({formula})."),
]

# modelos de pergunta (geradoPor) em que cada tipo de alias pode substituir o nome do composto
MODELOS_SINONIMO = {
    "template:composto.formula", "template:composto.massa_molar", "template:composto.perigoso", "template:composto.ghs_pictogramas",
    "template:composto.ghs_frases_h", "template:composto.classes", "template:composto.perfil", "template:desenho.estrutura", "calculo:massa_molar",
    "template:seguranca_rotulo.cuidados_sem_frases_p", "template:seguranca_rotulo.palavra_sinal",
}
MODELOS_PRODUTO = {
    "template:composto.formula", "template:composto.perigoso", "template:composto.ghs_pictogramas", "template:composto.ghs_frases_h",
    "template:composto.perfil", "template:seguranca_rotulo.cuidados_sem_frases_p", "template:seguranca_rotulo.palavra_sinal",
}
AVISO_PRODUTO = ("A classificação e os dados a seguir são os registrados para o composto, não para um produto comercial específico: "
                 "confira o rótulo do produto.")


def evidencia_ok(pac, evidencia: str, alias: str) -> bool:
    """A correspondência alias -> composto está no pacote?"""
    import re

    from comum import fold
    if evidencia.startswith("compostos#"):
        cid_s, _, campo = evidencia[len("compostos#"):].partition(".")
        c = pac.comp_cid.get(int(cid_s))
        if not c:
            return False
        if campo == "nomePopular":
            return fold(c.get("nomePopular") or "") == fold(alias)
        if campo == "sinonimos":
            return fold(alias) in {fold(s) for s in (c.get("sinonimos") or [])}
        return False
    if evidencia.startswith("textos#"):
        tid, _, frase = evidencia[len("textos#"):].partition("|")
        t = pac.textos.get(tid)
        if not t:
            return False
        texto = re.sub(r"\s+", " ", (t.get("textoPt") or "") + " " + (t.get("textoOriginal") or ""))
        return re.sub(r"\s+", " ", frase) in texto and (fold(alias) in fold(texto))
    return False
