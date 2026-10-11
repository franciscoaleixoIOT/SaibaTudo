# -*- coding: utf-8 -*-
"""
Substâncias que o app NÃO inclui quando completa o núcleo de compostos pela popularidade no Wikidata.

O núcleo tem uma lista fixa (currículo, curada à mão) e é completado pelos itens com mais artigos na Wikipédia. Por
popularidade entrariam agentes de guerra química e drogas de uso proscrito: não têm papel educacional no app e destoam
do princípio de segurança (o app recusa pedidos de síntese e mostra os perigos). A exclusão vale SÓ para os compostos
adicionados pela popularidade; a lista fixa fica como está (ex.: o fosgênio, pelo papel histórico e industrial).
Medicamentos de uso controlado (morfina, codeína, fentanil, cetamina, diazepam…) continuam: são medicamentos comuns.

Critério: o nome, o nome IUPAC ou um sinônimo do composto é IGUAL (sem acento e sem caixa) a um nome da lista. Não há
comparação por trecho (evita excluir "fosgênio" por causa de "fosgênio oxima") nem por CAS escrito à mão.
Fontes da lista: Convenção sobre Armas Químicas, Lista 1 (agentes); Portaria SVS/MS 344/1998, listas F1 e F2
(substâncias de uso proscrito no Brasil), nomes comuns em português e inglês.
"""
import unicodedata

GUERRA_QUIMICA = [
    'sarin', 'soman', 'tabun', 'ciclosarin', 'cyclosarin', 'vx', 'agente vx', 'vx nerve agent', 'vr', 'russian vx',
    'gas mostarda', 'mustard gas', 'sulfur mustard', 'iperita', 'yperite', 'bis(2-chloroethyl) sulfide', 'bis(2-cloroetil) sulfeto',
    'mostarda nitrogenada', 'nitrogen mustard', 'hn1', 'hn2', 'hn3', 'tris(2-chloroethyl)amine', 'bis(2-chloroethyl)ethylamine',
    'lewisita', 'lewisite', 'fosgenio oxima', 'phosgene oxime', 'novichok', 'a-230', 'a-232', 'a-234',
    'saxitoxina', 'saxitoxin', 'bz', 'quinuclidinil benzilato', '3-quinuclidinyl benzilate',
]
DROGAS_PROSCRITAS = [
    'cocaina', 'cocaine', 'crack', 'heroina', 'heroin', 'diacetilmorfina', 'diacetylmorphine', 'diamorphine',
    'metanfetamina', 'methamphetamine', 'mdma', 'ecstasy', 'midomafetamina', 'midomafetamine', '3,4-methylenedioxymethamphetamine',
    'mda', 'tenamfetamina', 'tenamfetamine', '3,4-methylenedioxyamphetamine',
    'lsd', 'lisergida', 'lysergide', 'lysergic acid diethylamide', 'dietilamida do acido lisergico',
    'psilocibina', 'psilocybin', 'psilocina', 'psilocin', 'mescalina', 'mescaline',
    'dmt', 'dimetiltriptamina', 'dimethyltryptamine', 'n,n-dimethyltryptamine', 'n,n-dimetiltriptamina', '5-meo-dmt',
    'fenciclidina', 'phencyclidine', 'pcp', 'catinona', 'cathinone', 'metcatinona', 'methcathinone', 'mefedrona', 'mephedrone',
    'mdpv', 'metilenodioxipirovalerona', 'methylenedioxypyrovalerone', 'alfa-pvp', 'alpha-pvp',
    'carfentanil', 'carfentanila', 'acetilfentanil', 'acetylfentanyl', '25i-nbome', '2c-b',
    'metaqualona', 'methaqualone', 'tetraidrocanabinol', 'tetrahydrocannabinol', 'thc', 'delta-9-tetrahydrocannabinol',
    'acido gama-hidroxibutirico', 'gamma-hydroxybutyric acid', 'ghb',
]


def normalizar(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode('ascii')
    return ' '.join(s.lower().split())


NOMES = {normalizar(n): 'guerra química' for n in GUERRA_QUIMICA} | {normalizar(n): 'droga de uso proscrito' for n in DROGAS_PROSCRITAS}


def motivo(composto):
    """Devolve o motivo da exclusão (ou None) olhando nome, nome IUPAC, nome popular e sinônimos."""
    nomes = [composto.get('nome'), composto.get('nomeIupac'), composto.get('nomePopular'), *(composto.get('sinonimos') or [])]
    for n in nomes:
        if n and normalizar(n) in NOMES:
            return f'{NOMES[normalizar(n)]} ({n})'
    return None


def filtrar_sensiveis(compostos, cids_fixos, log=print):
    """(mantidos, excluidos). Nunca exclui composto da lista fixa (`cids_fixos`)."""
    mantidos, excluidos = [], []
    for c in compostos:
        m = None if c['cid'] in cids_fixos else motivo(c)
        if m:
            excluidos.append({'cid': c['cid'], 'nome': c.get('nome'), 'motivo': m})
        else:
            mantidos.append(c)
    if excluidos:
        log(f'  [exclusões] {len(excluidos)} compostos fora do núcleo por segurança: ' + ', '.join(f"{e['nome']} ({e['cid']})" for e in excluidos))
    return mantidos, excluidos
