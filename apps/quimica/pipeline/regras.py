# -*- coding: utf-8 -*-
"""
`regras.json`: prefixos SI, unidades e fatores de conversão, série de reatividade dos metais, regras gerais de solubilidade,
ácidos e bases fortes, nomenclatura básica e a tabela de propriedades suportadas (`propriedades`).

Autoria própria do projeto. Os fatos (definições de unidades e prefixos do SI, fatores exatos) seguem o SI Brochure do BIPM
e o IUPAC Green Book; o texto das regras de ensino é nosso. Nenhum trecho de obra protegida foi copiado.
Fatores: valor da unidade expresso na unidade base da grandeza (base = valor 1).
"""
import quimica_util as Q
from common import IDIOMAS

SCHEMA = 1

PREFIXOS_SI = [
    ("quetta", "Q", 30), ("ronna", "R", 27), ("yotta", "Y", 24), ("zetta", "Z", 21), ("exa", "E", 18), ("peta", "P", 15),
    ("tera", "T", 12), ("giga", "G", 9), ("mega", "M", 6), ("quilo", "k", 3), ("hecto", "h", 2), ("deca", "da", 1),
    ("deci", "d", -1), ("centi", "c", -2), ("mili", "m", -3), ("micro", "µ", -6), ("nano", "n", -9), ("pico", "p", -12),
    ("femto", "f", -15), ("atto", "a", -18), ("zepto", "z", -21), ("yocto", "y", -24), ("ronto", "r", -27), ("quecto", "q", -30),
]

UNIDADES = {
    "pressao": {"nome": "Pressão", "base": "Pa", "fatores": {
        "Pa": 1, "hPa": 100, "kPa": 1000, "MPa": 1000000, "bar": 100000, "mbar": 100, "atm": 101325,
        "mmHg": 133.322387415, "Torr": 101325 / 760, "psi": 6894.757293168}},
    "volume": {"nome": "Volume", "base": "m3", "fatores": {
        "m3": 1, "dm3": 0.001, "L": 0.001, "mL": 0.000001, "cm3": 0.000001, "µL": 0.000000001,
        "gal (EUA)": 0.003785411784, "ft3": 0.028316846592}},
    "energia": {"nome": "Energia", "base": "J", "fatores": {
        "J": 1, "kJ": 1000, "MJ": 1000000, "cal": 4.184, "kcal": 4184, "cal (IT)": 4.1868, "eV": 1.602176634e-19,
        "kWh": 3600000, "L·atm": 101.325, "erg": 1e-7}},
    "massa": {"nome": "Massa", "base": "kg", "fatores": {
        "kg": 1, "g": 0.001, "mg": 0.000001, "µg": 1e-9, "ng": 1e-12, "t": 1000, "lb": 0.45359237, "oz": 0.028349523125}},
    "comprimento": {"nome": "Comprimento", "base": "m", "fatores": {
        "m": 1, "km": 1000, "cm": 0.01, "mm": 0.001, "µm": 1e-6, "nm": 1e-9, "pm": 1e-12, "Å": 1e-10,
        "in": 0.0254, "ft": 0.3048, "mi": 1609.344}},
    "tempo": {"nome": "Tempo", "base": "s", "fatores": {"s": 1, "min": 60, "h": 3600, "d": 86400}},
    "quantidade": {"nome": "Quantidade de matéria", "base": "mol", "fatores": {"mol": 1, "mmol": 0.001, "kmol": 1000}},
    # K = a*x + b  (x na unidade dada)
    "temperatura": {"nome": "Temperatura", "base": "K", "afins": {
        "K": {"a": 1, "b": 0}, "°C": {"a": 1, "b": 273.15},
        "°F": {"a": 5 / 9, "b": 459.67 * 5 / 9}, "°R": {"a": 5 / 9, "b": 0}},
        "nota": "K = a·x + b; °F: K = (x + 459,67)·5/9"},
}

# do mais para o menos reativo (ordem da série eletroquímica dos potenciais-padrão de redução)
SERIE_REATIVIDADE = ["Li", "Rb", "K", "Cs", "Ba", "Sr", "Ca", "Na", "Mg", "Al", "Mn", "Zn", "Cr", "Fe", "Cd", "Co", "Ni", "Sn",
                     "Pb", "H", "Cu", "Ag", "Hg", "Pt", "Au"]

SOLUBILIDADE = [
    {"id": "alcalinos-amonio", "regra": "Os sais de metais alcalinos (Li⁺, Na⁺, K⁺, Rb⁺, Cs⁺) e de amônio (NH₄⁺) são solúveis em água.",
     "solubilidade": "soluvel", "ions": ["Li+", "Na+", "K+", "Rb+", "Cs+", "NH4+"], "excecoes": []},
    {"id": "nitratos-acetatos", "regra": "Os nitratos (NO₃⁻), acetatos (CH₃COO⁻), cloratos (ClO₃⁻) e percloratos (ClO₄⁻) são solúveis.",
     "solubilidade": "soluvel", "ions": ["NO3-", "CH3COO-", "ClO3-", "ClO4-"], "excecoes": []},
    {"id": "haletos", "regra": "Cloretos, brometos e iodetos são solúveis, exceto os de Ag⁺, Pb²⁺ e Hg₂²⁺ (insolúveis ou pouco solúveis).",
     "solubilidade": "soluvel", "ions": ["Cl-", "Br-", "I-"], "excecoes": ["Ag+", "Pb2+", "Hg2 2+"]},
    {"id": "sulfatos", "regra": "Os sulfatos (SO₄²⁻) são solúveis, exceto os de Ba²⁺, Sr²⁺ e Pb²⁺ (insolúveis); os de Ca²⁺ e Ag⁺ são pouco solúveis.",
     "solubilidade": "soluvel", "ions": ["SO4 2-"], "excecoes": ["Ba2+", "Sr2+", "Pb2+", "Ca2+", "Ag+"]},
    {"id": "hidroxidos", "regra": "Os hidróxidos (OH⁻) são insolúveis, exceto os de metais alcalinos e de amônio; os de Ca²⁺, Sr²⁺ e Ba²⁺ são moderadamente solúveis.",
     "solubilidade": "insoluvel", "ions": ["OH-"], "excecoes": ["Li+", "Na+", "K+", "Rb+", "Cs+", "NH4+", "Ca2+", "Sr2+", "Ba2+"]},
    {"id": "carbonatos-fosfatos", "regra": "Carbonatos (CO₃²⁻), fosfatos (PO₄³⁻), sulfitos (SO₃²⁻), cromatos (CrO₄²⁻) e oxalatos (C₂O₄²⁻) são insolúveis, exceto os de metais alcalinos e de amônio.",
     "solubilidade": "insoluvel", "ions": ["CO3 2-", "PO4 3-", "SO3 2-", "CrO4 2-", "C2O4 2-"], "excecoes": ["Li+", "Na+", "K+", "Rb+", "Cs+", "NH4+"]},
    {"id": "sulfetos", "regra": "Os sulfetos (S²⁻) são insolúveis, exceto os de metais alcalinos, alcalinoterrosos e de amônio.",
     "solubilidade": "insoluvel", "ions": ["S2-"], "excecoes": ["Li+", "Na+", "K+", "Rb+", "Cs+", "NH4+", "Ca2+", "Sr2+", "Ba2+"]},
    {"id": "oxidos-metalicos", "regra": "Os óxidos metálicos são em geral insolúveis; os de metais alcalinos e de Ca, Sr e Ba reagem com a água formando hidróxidos.",
     "solubilidade": "insoluvel", "ions": ["O2-"], "excecoes": ["Li+", "Na+", "K+", "Rb+", "Cs+", "Ca2+", "Sr2+", "Ba2+"]},
]
SOLUBILIDADE_NOTA = "Regras gerais de ensino, com exceções; solubilidade real depende de temperatura e concentração. Em caso de dúvida, consulte dados medidos."

ACIDOS_FORTES = [
    {"formula": "HCl", "nome": "Ácido clorídrico"}, {"formula": "HBr", "nome": "Ácido bromídrico"},
    {"formula": "HI", "nome": "Ácido iodídrico"}, {"formula": "HNO3", "nome": "Ácido nítrico"},
    {"formula": "H2SO4", "nome": "Ácido sulfúrico", "nota": "forte na 1ª ionização"},
    {"formula": "HClO4", "nome": "Ácido perclórico"}, {"formula": "HClO3", "nome": "Ácido clórico"},
]
BASES_FORTES = [
    {"formula": "LiOH", "nome": "Hidróxido de lítio"}, {"formula": "NaOH", "nome": "Hidróxido de sódio"},
    {"formula": "KOH", "nome": "Hidróxido de potássio"}, {"formula": "RbOH", "nome": "Hidróxido de rubídio"},
    {"formula": "CsOH", "nome": "Hidróxido de césio"}, {"formula": "Ca(OH)2", "nome": "Hidróxido de cálcio", "nota": "pouco solúvel; dissocia-se totalmente o que dissolve"},
    {"formula": "Sr(OH)2", "nome": "Hidróxido de estrôncio"}, {"formula": "Ba(OH)2", "nome": "Hidróxido de bário"},
]

NOMENCLATURA = {
    "prefixosNumericos": [
        {"n": 1, "prefixo": "mono"}, {"n": 2, "prefixo": "di"}, {"n": 3, "prefixo": "tri"}, {"n": 4, "prefixo": "tetra"},
        {"n": 5, "prefixo": "penta"}, {"n": 6, "prefixo": "hexa"}, {"n": 7, "prefixo": "hepta"}, {"n": 8, "prefixo": "octa"},
        {"n": 9, "prefixo": "nona"}, {"n": 10, "prefixo": "deca"}],
    "sufixosAnions": [
        {"sufixo": "-eto", "uso": "ânions monoatômicos e binários", "exemplos": ["cloreto (Cl⁻)", "sulfeto (S²⁻)", "cianeto (CN⁻)"]},
        {"sufixo": "-ato", "uso": "oxiânions com mais oxigênio", "exemplos": ["sulfato (SO₄²⁻)", "nitrato (NO₃⁻)", "carbonato (CO₃²⁻)"]},
        {"sufixo": "-ito", "uso": "oxiânions com menos oxigênio", "exemplos": ["sulfito (SO₃²⁻)", "nitrito (NO₂⁻)"]},
        {"prefixo": "hipo-", "uso": "ainda menos oxigênio (hipo…ito)", "exemplos": ["hipoclorito (ClO⁻)"]},
        {"prefixo": "per-", "uso": "mais oxigênio (per…ato)", "exemplos": ["perclorato (ClO₄⁻)"]}],
    "acidos": [
        {"sufixo": "-ídrico", "uso": "ácidos binários (sem oxigênio)", "exemplos": ["ácido clorídrico (HCl)", "ácido sulfídrico (H₂S)"]},
        {"sufixo": "-ico", "uso": "oxiácidos cujo ânion termina em -ato", "exemplos": ["ácido sulfúrico (H₂SO₄)", "ácido nítrico (HNO₃)"]},
        {"sufixo": "-oso", "uso": "oxiácidos cujo ânion termina em -ito", "exemplos": ["ácido sulfuroso (H₂SO₃)", "ácido nitroso (HNO₂)"]}],
    "radicaisOrganicos": [
        {"n": 1, "radical": "met"}, {"n": 2, "radical": "et"}, {"n": 3, "radical": "prop"}, {"n": 4, "radical": "but"},
        {"n": 5, "radical": "pent"}, {"n": 6, "radical": "hex"}, {"n": 7, "radical": "hept"}, {"n": 8, "radical": "oct"},
        {"n": 9, "radical": "non"}, {"n": 10, "radical": "dec"}],
    "sufixosOrganicos": [
        {"funcao": "alcano", "sufixo": "-ano"}, {"funcao": "alceno", "sufixo": "-eno"}, {"funcao": "alcino", "sufixo": "-ino"},
        {"funcao": "álcool", "sufixo": "-ol"}, {"funcao": "aldeído", "sufixo": "-al"}, {"funcao": "cetona", "sufixo": "-ona"},
        {"funcao": "ácido carboxílico", "sufixo": "-óico", "nota": "ácido …óico"}, {"funcao": "amina", "sufixo": "-amina"},
        {"funcao": "amida", "sufixo": "-amida"}, {"funcao": "éster", "sufixo": "-oato de …ila"}],
    "ions": [
        {"formula": "H⁺", "nome": "hidrogênio (próton); em água, hidrônio H₃O⁺", "carga": 1},
        {"formula": "Li⁺", "nome": "lítio", "carga": 1}, {"formula": "Na⁺", "nome": "sódio", "carga": 1},
        {"formula": "K⁺", "nome": "potássio", "carga": 1}, {"formula": "NH₄⁺", "nome": "amônio", "carga": 1},
        {"formula": "Ag⁺", "nome": "prata", "carga": 1}, {"formula": "Mg²⁺", "nome": "magnésio", "carga": 2},
        {"formula": "Ca²⁺", "nome": "cálcio", "carga": 2}, {"formula": "Sr²⁺", "nome": "estrôncio", "carga": 2},
        {"formula": "Ba²⁺", "nome": "bário", "carga": 2}, {"formula": "Zn²⁺", "nome": "zinco", "carga": 2},
        {"formula": "Al³⁺", "nome": "alumínio", "carga": 3}, {"formula": "Fe²⁺", "nome": "ferro(II) (ferroso)", "carga": 2},
        {"formula": "Fe³⁺", "nome": "ferro(III) (férrico)", "carga": 3}, {"formula": "Cu⁺", "nome": "cobre(I) (cuproso)", "carga": 1},
        {"formula": "Cu²⁺", "nome": "cobre(II) (cúprico)", "carga": 2}, {"formula": "Pb²⁺", "nome": "chumbo(II)", "carga": 2},
        {"formula": "Sn²⁺", "nome": "estanho(II) (estanoso)", "carga": 2}, {"formula": "Hg²⁺", "nome": "mercúrio(II)", "carga": 2},
        {"formula": "F⁻", "nome": "fluoreto", "carga": -1}, {"formula": "Cl⁻", "nome": "cloreto", "carga": -1},
        {"formula": "Br⁻", "nome": "brometo", "carga": -1}, {"formula": "I⁻", "nome": "iodeto", "carga": -1},
        {"formula": "O²⁻", "nome": "óxido", "carga": -2}, {"formula": "S²⁻", "nome": "sulfeto", "carga": -2},
        {"formula": "OH⁻", "nome": "hidróxido", "carga": -1}, {"formula": "CN⁻", "nome": "cianeto", "carga": -1},
        {"formula": "NO₃⁻", "nome": "nitrato", "carga": -1}, {"formula": "NO₂⁻", "nome": "nitrito", "carga": -1},
        {"formula": "SO₄²⁻", "nome": "sulfato", "carga": -2}, {"formula": "SO₃²⁻", "nome": "sulfito", "carga": -2},
        {"formula": "CO₃²⁻", "nome": "carbonato", "carga": -2}, {"formula": "HCO₃⁻", "nome": "hidrogenocarbonato (bicarbonato)", "carga": -1},
        {"formula": "PO₄³⁻", "nome": "fosfato", "carga": -3}, {"formula": "ClO⁻", "nome": "hipoclorito", "carga": -1},
        {"formula": "ClO₃⁻", "nome": "clorato", "carga": -1}, {"formula": "ClO₄⁻", "nome": "perclorato", "carga": -1},
        {"formula": "CH₃COO⁻", "nome": "acetato", "carga": -1}, {"formula": "MnO₄⁻", "nome": "permanganato", "carga": -1},
        {"formula": "CrO₄²⁻", "nome": "cromato", "carga": -2}, {"formula": "Cr₂O₇²⁻", "nome": "dicromato", "carga": -2}],
}

# id -> {nome, unidade, origem, escopo, sinonimos}. `origem` = "<arquivo>.<campo>" do pacote.
PROPRIEDADES = {
    "numeroAtomico": ("Número atômico", "", "elementos.z", "elemento", ["número atômico", "z"]),
    "simbolo": ("Símbolo", "", "elementos.simbolo", "elemento", ["símbolo"]),
    "massaAtomica": ("Massa atômica", "u", "elementos.massaAtomica", "elemento", ["massa atômica", "peso atômico"]),
    "grupo": ("Grupo", "", "elementos.grupo", "elemento", ["grupo", "família"]),
    "periodo": ("Período", "", "elementos.periodo", "elemento", ["período"]),
    "bloco": ("Bloco", "", "elementos.bloco", "elemento", ["bloco"]),
    "categoria": ("Categoria", "", "elementos.categoria", "elemento", ["categoria", "classificação"]),
    "configuracaoEletronica": ("Configuração eletrônica", "", "elementos.configuracaoEletronica", "elemento",
                                ["configuração eletrônica", "distribuição eletrônica"]),
    "eletronegatividade": ("Eletronegatividade (Pauling)", "", "elementos.eletronegatividade", "elemento", ["eletronegatividade"]),
    "raioAtomicoPm": ("Raio atômico (van der Waals)", "pm", "elementos.raioAtomicoPm", "elemento", ["raio atômico", "raio de van der Waals"]),
    "afinidadeEletronicaKJmol": ("Afinidade eletrônica", "kJ/mol", "elementos.afinidadeEletronicaKJmol", "elemento",
                             ["afinidade eletrônica", "eletroafinidade"]),
    "energiaIonizacaoKJmol": ("Energia de ionização", "kJ/mol", "elementos.energiaIonizacaoKJmol", "elemento",
                         ["energia de ionização", "potencial de ionização"]),
    "pontoFusaoK": ("Ponto de fusão", "K", "elementos.pontoFusaoK", "elemento", ["ponto de fusão", "temperatura de fusão"]),
    "pontoEbulicaoK": ("Ponto de ebulição", "K", "elementos.pontoEbulicaoK", "elemento", ["ponto de ebulição", "temperatura de ebulição"]),
    "densidadeKgm3": ("Densidade", "kg/m³", "elementos.densidadeKgm3", "elemento", ["densidade", "massa específica"]),
    "estadoPadrao": ("Estado físico padrão", "", "elementos.estadoPadrao", "elemento", ["estado físico", "estado padrão"]),
    "estadosOxidacao": ("Estados de oxidação", "", "elementos.estadosOxidacao", "elemento", ["estados de oxidação", "nox"]),
    "descoberta": ("Descoberta", "", "elementos.descoberta", "elemento", ["descoberta", "quem descobriu", "quando foi descoberto", "descobriu"]),
    "massaMolar": ("Massa molar", "g/mol", "compostos.massaMolar", "composto", ["massa molar", "massa molecular", "peso molecular"]),
    "massaExata": ("Massa exata (monoisotópica)", "u", "compostos.massaExata", "composto", ["massa exata", "massa monoisotópica"]),
    "formula": ("Fórmula", "", "compostos.formula", "composto", ["fórmula", "fórmula molecular"]),
    "formulaHill": ("Fórmula de Hill", "", "compostos.formulaHill", "composto", ["fórmula de hill"]),
    "smiles": ("SMILES", "", "compostos.smiles", "composto", ["smiles"]),
    "inchiKey": ("InChIKey", "", "compostos.inchiKey", "composto", ["inchikey"]),
    "nomeIupac": ("Nome IUPAC (PubChem)", "", "compostos.nomeIupac", "composto", ["nome iupac", "nomenclatura iupac"]),
    "cas": ("Número CAS", "", "compostos.cas", "composto", ["cas", "número cas"]),
    "xlogp": ("XLogP", "", "compostos.propriedades.xlogp", "composto", ["xlogp", "logp"]),
    "tpsa": ("Área de superfície polar topológica (TPSA)", "Å²", "compostos.propriedades.tpsa", "composto", ["tpsa"]),
    "doadoresH": ("Doadores de ligação de hidrogênio", "", "compostos.propriedades.doadoresH", "composto", ["doadores de hidrogênio"]),
    "aceptoresH": ("Aceptores de ligação de hidrogênio", "", "compostos.propriedades.aceptoresH", "composto", ["aceptores de hidrogênio"]),
    "ligacoesRotaveis": ("Ligações rotáveis", "", "compostos.propriedades.ligacoesRotaveis", "composto", ["ligações rotáveis"]),
    "carga": ("Carga", "e", "compostos.propriedades.carga", "composto", ["carga"]),
    "pictogramas_ghs": ("Pictogramas GHS (classificação harmonizada)", "", "compostos.ghs.pictogramas", "composto", ["pictogramas", "perigos"]),
    "frases_h": ("Frases de perigo H (classificação harmonizada)", "", "compostos.ghs.frasesH", "composto", ["frases h", "advertências de perigo"]),
    "palavra_sinal": ("Palavra de advertência GHS", "", "compostos.ghs.palavraSinal", "composto", ["palavra de advertência"]),
}


# Rótulos e sinônimos das propriedades em en/es/de/fr (docs/I18N.md §8: termos fixos de química, não são texto criativo; a
# tradução inicial é de agente e fica marcada "revisao": "pendente" em `propriedades.revisao`). pt-BR vem de PROPRIEDADES.
# id -> {idioma: (rótulo, [sinônimos])}
PROPRIEDADES_I18N = {
    "numeroAtomico": {"en": ("Atomic number", ["atomic number", "z"]), "es": ("Número atómico", ["número atómico", "z"]),
                      "de": ("Ordnungszahl", ["ordnungszahl", "kernladungszahl", "z"]), "fr": ("Numéro atomique", ["numéro atomique", "z"])},
    "simbolo": {"en": ("Symbol", ["symbol"]), "es": ("Símbolo", ["símbolo"]), "de": ("Symbol", ["symbol", "elementsymbol"]),
                "fr": ("Symbole", ["symbole"])},
    "massaAtomica": {"en": ("Atomic mass", ["atomic mass", "atomic weight"]), "es": ("Masa atómica", ["masa atómica", "peso atómico"]),
                     "de": ("Atommasse", ["atommasse", "atomgewicht"]), "fr": ("Masse atomique", ["masse atomique", "poids atomique"])},
    "grupo": {"en": ("Group", ["group", "family"]), "es": ("Grupo", ["grupo", "familia"]), "de": ("Gruppe", ["gruppe", "hauptgruppe"]),
              "fr": ("Groupe", ["groupe", "famille"])},
    "periodo": {"en": ("Period", ["period"]), "es": ("Período", ["período", "periodo"]), "de": ("Periode", ["periode"]),
                "fr": ("Période", ["période"])},
    "bloco": {"en": ("Block", ["block"]), "es": ("Bloque", ["bloque"]), "de": ("Block", ["block"]), "fr": ("Bloc", ["bloc"])},
    "categoria": {"en": ("Category", ["category", "classification"]), "es": ("Categoría", ["categoría", "clasificación"]),
                  "de": ("Kategorie", ["kategorie", "einteilung"]), "fr": ("Catégorie", ["catégorie", "classification"])},
    "configuracaoEletronica": {"en": ("Electron configuration", ["electron configuration", "electronic configuration"]),
                               "es": ("Configuración electrónica", ["configuración electrónica"]),
                               "de": ("Elektronenkonfiguration", ["elektronenkonfiguration"]),
                               "fr": ("Configuration électronique", ["configuration électronique"])},
    "eletronegatividade": {"en": ("Electronegativity (Pauling)", ["electronegativity"]), "es": ("Electronegatividad (Pauling)", ["electronegatividad"]),
                           "de": ("Elektronegativität (Pauling)", ["elektronegativität"]), "fr": ("Électronégativité (Pauling)", ["électronégativité"])},
    "raioAtomicoPm": {"en": ("Atomic radius (van der Waals)", ["atomic radius", "van der waals radius"]),
                      "es": ("Radio atómico (van der Waals)", ["radio atómico", "radio de van der waals"]),
                      "de": ("Atomradius (Van-der-Waals)", ["atomradius", "van-der-waals-radius"]),
                      "fr": ("Rayon atomique (van der Waals)", ["rayon atomique", "rayon de van der waals"])},
    "afinidadeEletronicaKJmol": {"en": ("Electron affinity", ["electron affinity"]), "es": ("Afinidad electrónica", ["afinidad electrónica"]),
                                 "de": ("Elektronenaffinität", ["elektronenaffinität"]), "fr": ("Affinité électronique", ["affinité électronique"])},
    "energiaIonizacaoKJmol": {"en": ("Ionization energy", ["ionization energy", "ionisation energy", "ionization potential"]),
                              "es": ("Energía de ionización", ["energía de ionización", "potencial de ionización"]),
                              "de": ("Ionisierungsenergie", ["ionisierungsenergie", "ionisationsenergie"]),
                              "fr": ("Énergie d'ionisation", ["énergie d'ionisation", "potentiel d'ionisation"])},
    "pontoFusaoK": {"en": ("Melting point", ["melting point", "melting temperature"]), "es": ("Punto de fusión", ["punto de fusión", "temperatura de fusión"]),
                    "de": ("Schmelzpunkt", ["schmelzpunkt", "schmelztemperatur"]), "fr": ("Point de fusion", ["point de fusion", "température de fusion"])},
    "pontoEbulicaoK": {"en": ("Boiling point", ["boiling point", "boiling temperature"]), "es": ("Punto de ebullición", ["punto de ebullición", "temperatura de ebullición"]),
                       "de": ("Siedepunkt", ["siedepunkt", "siedetemperatur"]), "fr": ("Point d'ébullition", ["point d'ébullition", "température d'ébullition"])},
    "densidadeKgm3": {"en": ("Density", ["density", "specific mass"]), "es": ("Densidad", ["densidad", "masa específica"]),
                      "de": ("Dichte", ["dichte"]), "fr": ("Densité", ["densité", "masse volumique"])},
    "estadoPadrao": {"en": ("Standard physical state", ["physical state", "standard state", "state of matter"]),
                     "es": ("Estado físico estándar", ["estado físico", "estado estándar"]),
                     "de": ("Aggregatzustand (Standardbedingungen)", ["aggregatzustand", "standardzustand"]),
                     "fr": ("État physique standard", ["état physique", "état standard"])},
    "estadosOxidacao": {"en": ("Oxidation states", ["oxidation states", "oxidation numbers"]), "es": ("Estados de oxidación", ["estados de oxidación", "números de oxidación"]),
                        "de": ("Oxidationsstufen", ["oxidationsstufen", "oxidationszahlen"]), "fr": ("États d'oxydation", ["états d'oxydation", "nombres d'oxydation"])},
    "descoberta": {"en": ("Discovery", ["discovery", "who discovered", "when was it discovered", "discovered"]),
                   "es": ("Descubrimiento", ["descubrimiento", "quién descubrió", "cuándo fue descubierto", "descubrió"]),
                   "de": ("Entdeckung", ["entdeckung", "wer entdeckte", "wann wurde entdeckt", "entdeckt"]),
                   "fr": ("Découverte", ["découverte", "qui a découvert", "quand a été découvert", "découvert"])},
    "massaMolar": {"en": ("Molar mass", ["molar mass", "molecular mass", "molecular weight"]), "es": ("Masa molar", ["masa molar", "masa molecular", "peso molecular"]),
                   "de": ("Molare Masse", ["molare masse", "molmasse", "molekülmasse", "molekulargewicht"]),
                   "fr": ("Masse molaire", ["masse molaire", "masse moléculaire", "poids moléculaire"])},
    "massaExata": {"en": ("Exact mass (monoisotopic)", ["exact mass", "monoisotopic mass"]), "es": ("Masa exacta (monoisotópica)", ["masa exacta", "masa monoisotópica"]),
                   "de": ("Exakte Masse (monoisotopisch)", ["exakte masse", "monoisotopische masse"]), "fr": ("Masse exacte (monoisotopique)", ["masse exacte", "masse monoisotopique"])},
    "formula": {"en": ("Formula", ["formula", "molecular formula", "chemical formula"]), "es": ("Fórmula", ["fórmula", "fórmula molecular", "fórmula química"]),
                "de": ("Formel", ["formel", "summenformel", "molekülformel", "chemische formel"]), "fr": ("Formule", ["formule", "formule moléculaire", "formule chimique"])},
    "formulaHill": {"en": ("Hill formula", ["hill formula"]), "es": ("Fórmula de Hill", ["fórmula de hill"]), "de": ("Hill-Formel", ["hill-formel"]),
                    "fr": ("Formule de Hill", ["formule de hill"])},
    "smiles": {"en": ("SMILES", ["smiles"]), "es": ("SMILES", ["smiles"]), "de": ("SMILES", ["smiles"]), "fr": ("SMILES", ["smiles"])},
    "inchiKey": {"en": ("InChIKey", ["inchikey"]), "es": ("InChIKey", ["inchikey"]), "de": ("InChIKey", ["inchikey"]), "fr": ("InChIKey", ["inchikey"])},
    "nomeIupac": {"en": ("IUPAC name (PubChem)", ["iupac name", "iupac nomenclature"]), "es": ("Nombre IUPAC (PubChem)", ["nombre iupac", "nomenclatura iupac"]),
                  "de": ("IUPAC-Name (PubChem)", ["iupac-name", "iupac-nomenklatur"]), "fr": ("Nom IUPAC (PubChem)", ["nom iupac", "nomenclature iupac"])},
    "cas": {"en": ("CAS number", ["cas", "cas number", "cas registry number"]), "es": ("Número CAS", ["cas", "número cas"]),
            "de": ("CAS-Nummer", ["cas", "cas-nummer"]), "fr": ("Numéro CAS", ["cas", "numéro cas"])},
    "xlogp": {"en": ("XLogP", ["xlogp", "logp"]), "es": ("XLogP", ["xlogp", "logp"]), "de": ("XLogP", ["xlogp", "logp"]), "fr": ("XLogP", ["xlogp", "logp"])},
    "tpsa": {"en": ("Topological polar surface area (TPSA)", ["tpsa", "polar surface area"]), "es": ("Área de superficie polar topológica (TPSA)", ["tpsa"]),
             "de": ("Topologische polare Oberfläche (TPSA)", ["tpsa"]), "fr": ("Surface polaire topologique (TPSA)", ["tpsa"])},
    "doadoresH": {"en": ("Hydrogen bond donors", ["hydrogen bond donors", "h-bond donors"]), "es": ("Donantes de enlace de hidrógeno", ["donantes de hidrógeno"]),
                  "de": ("Wasserstoffbrücken-Donatoren", ["wasserstoffbrückendonatoren", "h-donatoren"]), "fr": ("Donneurs de liaison hydrogène", ["donneurs d'hydrogène"])},
    "aceptoresH": {"en": ("Hydrogen bond acceptors", ["hydrogen bond acceptors", "h-bond acceptors"]), "es": ("Aceptores de enlace de hidrógeno", ["aceptores de hidrógeno"]),
                   "de": ("Wasserstoffbrücken-Akzeptoren", ["wasserstoffbrückenakzeptoren", "h-akzeptoren"]), "fr": ("Accepteurs de liaison hydrogène", ["accepteurs d'hydrogène"])},
    "ligacoesRotaveis": {"en": ("Rotatable bonds", ["rotatable bonds"]), "es": ("Enlaces rotables", ["enlaces rotables"]),
                         "de": ("Drehbare Bindungen", ["drehbare bindungen", "rotierbare bindungen"]), "fr": ("Liaisons rotatives", ["liaisons rotatives"])},
    "carga": {"en": ("Charge", ["charge"]), "es": ("Carga", ["carga"]), "de": ("Ladung", ["ladung"]), "fr": ("Charge", ["charge"])},
    "pictogramas_ghs": {"en": ("GHS pictograms (harmonised classification)", ["pictograms", "hazards"]),
                        "es": ("Pictogramas GHS (clasificación armonizada)", ["pictogramas", "peligros"]),
                        "de": ("GHS-Piktogramme (harmonisierte Einstufung)", ["piktogramme", "gefahren"]),
                        "fr": ("Pictogrammes SGH (classification harmonisée)", ["pictogrammes", "dangers"])},
    "frases_h": {"en": ("Hazard statements H (harmonised classification)", ["h statements", "hazard statements"]),
                 "es": ("Indicaciones de peligro H (clasificación armonizada)", ["frases h", "indicaciones de peligro"]),
                 "de": ("Gefahrenhinweise H (harmonisierte Einstufung)", ["h-sätze", "gefahrenhinweise"]),
                 "fr": ("Mentions de danger H (classification harmonisée)", ["mentions h", "mentions de danger"])},
    "palavra_sinal": {"en": ("GHS signal word", ["signal word"]), "es": ("Palabra de advertencia GHS", ["palabra de advertencia"]),
                      "de": ("GHS-Signalwort", ["signalwort"]), "fr": ("Mention d'avertissement SGH", ["mention d'avertissement"])},
}


def propriedades(idiomas=None):
    """Tabela `propriedades` do regras.json: campos de sempre (nome, unidade, origem, escopo, sinonimos — pt-BR) mais `rotulos`
    e `sinonimosPorIdioma` ({idioma: ...}) para os idiomas pedidos (pt-BR sempre). Quem não tem tradução fica sem a chave."""
    idiomas = [i for i in IDIOMAS if i in (idiomas or IDIOMAS) or i == "pt-BR"]
    out = {}
    for pid, (nome, un, orig, esc, sin) in PROPRIEDADES.items():
        rot, sin_i = {"pt-BR": nome}, {"pt-BR": list(sin)}
        for idioma in idiomas:
            tr = PROPRIEDADES_I18N.get(pid, {}).get(idioma)
            if tr:
                rot[idioma], sin_i[idioma] = tr[0], list(tr[1])
        out[pid] = {"nome": nome, "unidade": un, "origem": orig, "escopo": esc, "sinonimos": sin, "rotulos": rot, "sinonimosPorIdioma": sin_i}
    return out


def montar(hoje=None, idiomas=None):
    hoje = hoje or Q.hoje_iso()
    fontes = [
        Q.fonte("Autoria própria do SaibaTudo Química (regras de ensino de química geral)",
                "https://github.com/franciscoaleixoIOT/SaibaTudo", "MIT", hoje),
        Q.fonte("BIPM — SI Brochure (definições de unidades e prefixos do SI; fatos)", "https://www.bipm.org/en/publications/si-brochure",
                "fatos (definições do SI), citados", hoje),
        Q.fonte("IUPAC — Green Book, Quantities, Units and Symbols in Physical Chemistry (símbolos e unidades; fatos)",
                "https://iupac.org/what-we-do/books/greenbook/", "fatos (símbolos e unidades), citados; texto não copiado", hoje),
    ]
    return {
        "versao": SCHEMA,
        "descricao": "Regras e tabelas de apoio: prefixos SI, unidades e fatores, série de reatividade, solubilidade, ácidos e bases fortes, "
                     "nomenclatura básica e propriedades suportadas. Autoria própria; fatos conforme BIPM/IUPAC.",
        "prefixosSI": [{"nome": n, "simbolo": s, "expoente": e, "fator": float(f"1e{e}")} for n, s, e in PREFIXOS_SI],
        "unidades": UNIDADES,
        "serieReatividadeMetais": {"ordem": SERIE_REATIVIDADE, "nota": "do mais reativo (cede elétrons com mais facilidade) ao menos "
                                   "reativo; o hidrogênio (H) é a referência. Um metal desloca o cátion de outro que está depois dele."},
        "solubilidade": {"regras": SOLUBILIDADE, "nota": SOLUBILIDADE_NOTA},
        "acidosFortes": ACIDOS_FORTES,
        "basesFortes": BASES_FORTES,
        "nomenclatura": NOMENCLATURA,
        "propriedades": propriedades(idiomas),
        "propriedadesRevisao": {"pt-BR": "humana", **{i: "pendente" for i in IDIOMAS if i != "pt-BR" and i in (idiomas or IDIOMAS)}},
        "fontes": fontes,
    }
