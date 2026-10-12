# -*- coding: utf-8 -*-
"""
Monta (deterministicamente) os prompts do EXPLICADOR e grava out/casos_explica.json.

Química (60, com o prompt de sistema de produção apps/quimica/backend/modal/ask_core.ASK_SYSTEM_PROMPT; para en/es/de/fr só a frase do
idioma muda para "Responda em <idioma>"):
  pt-BR 20 = 10 conceitos do HOLDOUT do dataset com trechos licenciados (a mesma seleção do gate eval_fidelidade.amostra)
            + 5 de segurança GHS com o CONTEXTO do registro (frases H, pictogramas)
            + 5 "resuma o elemento X" com CONTEXTO = respostas determinísticas do dataset sobre X (números do pacote)
  en/es/de/fr 10 cada = 6 trechos da Wikipédia NAQUELE idioma (data/quimica/textos/wikipedia-<idioma>) + 2 de segurança e 2 de
            elemento com contexto em português (pergunta no idioma: a resposta tem de sair no idioma pedido)
Eleições (40, prompt de produção apps/eleicoes2026/backend/modal/nlu_core.build_ask_prompt): CONTEXTO SINTÉTICO, com candidatos e
  partidos FICTÍCIOS (nomes inventados, siglas inexistentes), no formato de tópicos que o app envia; 10 deles pedem "cite a fonte".
  Fictício de propósito: mede fidelidade (todo número da resposta tem de estar no contexto ou nas regras) sem pôr dado real de candidato
  num texto gerado.
Recusas (10): 5 pedidos de recomendação/previsão do golden de eleições (intent RECOMENDACAO) e 5 pedidos perigosos de
  contracts/seguranca_cases.json (1 por idioma). Só textos que já estão nos contratos; nenhum conteúdo de ataque novo.
"""
import hashlib
import json
import random
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import comum as C  # noqa: E402

LINGUA = {"pt-BR": "português do Brasil", "en": "inglês (English)", "es": "espanhol (español)", "de": "alemão (Deutsch)",
          "fr": "francês (français)"}
Q_CONCEITO = {
    "en": ["What is {t}?", "Explain {t} in simple terms.", "Can you explain what {t} means in chemistry?"],
    "es": ["¿Qué es {t}?", "Explica {t} de forma sencilla.", "¿Puedes explicar qué significa {t} en química?"],
    "de": ["Was ist {t}?", "Erkläre {t} in einfachen Worten.", "Kannst du erklären, was {t} in der Chemie bedeutet?"],
    "fr": ["Qu'est-ce que {t} ?", "Explique {t} simplement.", "Peux-tu expliquer ce que signifie {t} en chimie ?"],
}
Q_SEGURANCA = {"pt-BR": None, "en": "What are the hazards of {f} and how should I handle it safely?",
               "es": "¿Cuáles son los peligros de {f} y cómo manipularlo con seguridad?",
               "de": "Welche Gefahren hat {f} und wie gehe ich sicher damit um?",
               "fr": "Quels sont les dangers de {f} et comment le manipuler en sécurité ?"}
Q_ELEMENTO = {"pt-BR": "Resuma as principais propriedades do elemento {s}.", "en": "Summarize the main properties of the element {s}.",
              "es": "Resume las principales propiedades del elemento {s}.", "de": "Fasse die wichtigsten Eigenschaften des Elements {s} zusammen.",
              "fr": "Résume les principales propriétés de l'élément {s}."}


def _h(s):
    return hashlib.sha256(str(s).encode("utf-8")).hexdigest()


def sistema_quimica(idioma: str) -> str:
    ask = C.carregar_app("quimica", ("ask_core",)).ask_core
    base = ask.ASK_SYSTEM_PROMPT
    if idioma == "pt-BR":
        return base
    assert "Responda em português do Brasil" in base
    return base.replace("Responda em português do Brasil", f"Responda SEMPRE em {LINGUA[idioma]}, o idioma da pergunta")


def _qa_registros():
    ns = C.carregar_app("quimica", ("ask_core", "eval_ask_common", "eval_fidelidade"))
    return ns, ns.eval_ask_common.ler_jsonl(C.QA_QUIMICA)


def casos_quimica() -> list:
    ns, regs = _qa_registros()
    indice = ns.eval_ask_common.indexar_textos(C.TEXTOS_QUIMICA)
    casos = []
    # pt: conceitos do holdout com trechos (mesma seleção do gate de fidelidade)
    for it in ns.eval_fidelidade.amostra(regs, indice, 10):
        casos.append({"id": f"q-pt-conceito-{it['id']}", "app": "quimica", "idioma": "pt-BR", "tipo": "trechos", "q": it["q"],
                      "contexto": it["contexto"], "trechos": it["trechos"]})
    # segurança com contexto (pt) — ordem estável por hash, 1 por composto
    seg = sorted([r for r in regs if r.get("tipo") == "seguranca" and r.get("contexto") and r["id"].startswith("se")],
                 key=lambda r: _h(r["id"]))
    seg_unicos, vistos = [], set()
    for r in seg:
        m = re.search(r"Composto: [^\n]*\(([^)]+)\)", r["contexto"])
        if not m or m.group(1) in vistos or len(r["contexto"]) > 1800:
            continue
        vistos.add(m.group(1))
        seg_unicos.append((r, m.group(1)))
    # elementos: contexto = respostas determinísticas distintas sobre o elemento (até 6)
    por_el = {}
    for r in regs:
        if r.get("tipo") == "fato" and r["id"].startswith("el-"):
            els = (r.get("entidades") or {}).get("elementos") or []
            if len(els) == 1:
                lst = por_el.setdefault(els[0], [])
                if r["resposta"] not in lst:
                    lst.append(r["resposta"])
    elementos = sorted([e for e, l in por_el.items() if len(l) >= 6], key=_h)
    i_seg = i_el = 0
    for idioma in ["pt-BR", "en", "es", "de", "fr"]:
        n_seg, n_el = (5, 5) if idioma == "pt-BR" else (2, 2)
        for _ in range(n_seg):
            r, formula = seg_unicos[i_seg]
            i_seg += 1
            q = r["pergunta"] if idioma == "pt-BR" else Q_SEGURANCA[idioma].format(f=formula)
            casos.append({"id": f"q-{idioma}-seg-{r['id']}", "app": "quimica", "idioma": idioma, "tipo": "contexto", "q": q,
                          "contexto": r["contexto"], "trechos": []})
        for _ in range(n_el):
            s = elementos[i_el]
            i_el += 1
            ctx = "\n".join(por_el[s][:6])
            casos.append({"id": f"q-{idioma}-el-{s}", "app": "quimica", "idioma": idioma, "tipo": "contexto",
                          "q": Q_ELEMENTO[idioma].format(s=s), "contexto": ctx, "trechos": []})
    # en/es/de/fr: trechos da Wikipédia no próprio idioma
    for idioma in ["en", "es", "de", "fr"]:
        textos = []
        for arq in sorted((C.TEXTOS_QUIMICA / f"wikipedia-{idioma}").glob("*.json")):
            for t in json.loads(arq.read_text(encoding="utf-8")):
                txt = t.get("textoOriginal") or ""
                if t.get("titulo") and 300 <= len(txt) <= 1200:
                    textos.append(t)
        textos.sort(key=lambda t: _h(t["id"]))
        # metade com números no texto (mais chance de o modelo errar um número), metade sem
        com_num = [t for t in textos if re.search(r"\d{2,}", t["textoOriginal"])][:3]
        sem_num = [t for t in textos if t not in com_num][:3]
        for k, t in enumerate(com_num + sem_num):
            q = Q_CONCEITO[idioma][k % 3].format(t=t["titulo"])
            casos.append({"id": f"q-{idioma}-wiki-{t['id']}", "app": "quimica", "idioma": idioma, "tipo": "trechos", "q": q, "contexto": "",
                          "trechos": [{"id": t["id"], "texto": t["textoOriginal"][:1200]}]})
    return casos


# ---------------------------------------------------------------------------------------------------------
# Eleições: contexto sintético (candidatos e partidos FICTÍCIOS)
# ---------------------------------------------------------------------------------------------------------
NOMES = ["Ana Exemplo", "Bruno Modelo", "Carla Fictícia", "Diego Teste", "Elisa Amostra", "Fábio Hipótese", "Gabriela Simulada", "Heitor Protótipo",
         "Íris Ilustrativa", "João Genérico", "Kátia Padrão", "Lucas Rascunho", "Marta Esboço", "Nilo Suposto", "Olga Inventada", "Paulo Imaginário",
         "Quênia Fictio", "Rita Demonstração", "Sérgio Ensaio", "Tânia Provisória"]
PARTIDOS = ["PAL", "PBE", "PGA", "PDE", "PEP"]
UFS = [("MG", "Minas Gerais"), ("BA", "Bahia"), ("RS", "Rio Grande do Sul"), ("PE", "Pernambuco"), ("GO", "Goiás"), ("PA", "Pará"),
       ("SC", "Santa Catarina"), ("CE", "Ceará")]
FONTE = "Fonte: TSE — Divulgação de Candidaturas e Contas Eleitorais (dados abertos), atualizado em 11/10/2026."


def _brl(rng, lo, hi):
    v = rng.randint(lo, hi) + rng.randint(0, 99) / 100
    inteiro, cent = f"{v:,.2f}".split(".")
    return "R$ " + inteiro.replace(",", ".") + "," + cent


def _pct(p: float) -> str:
    """53.9 -> '53#90%' (o '#' vira vírgula depois da troca de separadores de milhar)."""
    return f"{p:.2f}".replace(".", "#") + "%"


def casos_eleicoes() -> list:
    rng = random.Random(2026)
    casos = []

    def add(tipo, q, ctx, fonte=False):
        if fonte:
            q = q.rstrip("?.") + "? Cite a fonte."
            ctx = ctx + "\n" + FONTE
        casos.append({"id": f"e-{tipo}-{len(casos):02d}", "app": "eleicoes", "idioma": "pt-BR", "tipo": tipo, "q": q, "contexto": ctx,
                      "trechos": [], "pede_fonte": fonte})

    def cands(n):
        return rng.sample(NOMES, n)

    for k in range(6):  # LISTAR
        uf, nome_uf = UFS[k]
        cargo = ["Governador", "Senador", "Governador", "Senador", "Governador", "Senador"][k]
        nomes = cands(rng.randint(3, 6))
        linhas = [f"- {n} ({rng.choice(PARTIDOS)}, nº {rng.randint(10, 99) if cargo == 'Governador' else rng.randint(100, 999)}) — "
                  f"situação: {rng.choice(['deferida', 'deferida', 'deferida', 'indeferida com recurso'])}" for n in nomes]
        ctx = f"Candidaturas a {cargo} em {nome_uf} ({uf}) — {len(nomes)} candidaturas:\n" + "\n".join(linhas)
        add("listar", f"Quem são os candidatos a {cargo.lower()} em {nome_uf}?", ctx, fonte=k < 2)
    for k in range(6):  # PERFIL
        n = NOMES[k + 6]
        uf, nome_uf = UFS[k]
        cargo = ["Deputado Federal", "Senador", "Governador", "Deputado Estadual", "Deputado Federal", "Senador"][k]
        ctx = (f"Nome de urna: {n}\nCargo: {cargo} ({uf})\nPartido: {rng.choice(PARTIDOS)}\nNúmero: {rng.randint(1000, 9999)}\n"
               f"Idade: {rng.randint(30, 72)} anos\nOcupação: {rng.choice(['professora', 'advogado', 'médica', 'comerciante', 'engenheiro'])}\n"
               f"Situação da candidatura: deferida\nBens declarados: {_brl(rng, 50_000, 3_000_000)}\n"
               f"Já eleito(a) antes: {rng.choice(['nunca', '1 vez (vereador)', '2 vezes (deputado estadual)'])}")
        add("perfil", f"Quem é {n}?", ctx, fonte=k < 2)
    for k in range(5):  # PATRIMONIO
        n = NOMES[k + 12]
        itens = [(d, _brl(rng, 5_000, 900_000)) for d in rng.sample(["Apartamento", "Casa", "Veículo automotor", "Aplicação financeira",
                                                                    "Terreno", "Quotas de empresa"], 3)]
        ctx = f"Bens declarados por {n} ao TSE (registro de candidatura 2026):\n" + "\n".join(f"- {d}: {v}" for d, v in itens) + \
              f"\nTotal declarado: {_brl(rng, 300_000, 2_500_000)}"
        add("patrimonio", f"Qual o patrimônio de {n}?", ctx, fonte=k < 2)
    for k in range(6):  # RESULTADOS
        uf, nome_uf = UFS[k + 2]
        nomes = cands(3)
        if k % 2 == 0:  # eleito no 1º turno
            p1 = round(rng.uniform(51, 62), 2)
        else:  # vai ao 2º turno
            p1 = round(rng.uniform(38, 48), 2)
        p2 = round(rng.uniform(20, 100 - p1 - 5), 2)
        p3 = round(100 - p1 - p2, 2)
        p2, p3 = max(p2, p3), min(p2, p3)  # 2º colocado é o que vai ao 2º turno
        total = rng.randint(2_000_000, 8_000_000)
        votos = [round(total * p / 100) for p in (p1, p2, p3)]
        linhas = [f"- {n}: {_pct(p)} dos votos válidos ({v:,} votos)".replace(",", ".") .replace("#", ",") for n, p, v in zip(nomes, (p1, p2, p3), votos)]
        situ = (f"{nomes[0]} foi eleito(a) em 1º turno." if k % 2 == 0 else
                f"Sim, haverá 2º turno para Governador em {nome_uf} entre {nomes[0]} e {nomes[1]}, em 25/10/2026.")
        ctx = f"Apuração do 1º turno (04/10/2026) — Governador, {nome_uf} ({uf}), 100% das seções totalizadas:\n" + "\n".join(linhas) + "\n" + situ
        add("resultados", f"Quem venceu a eleição para governador em {nome_uf}?", ctx, fonte=k < 2)
    for k in range(4):  # SEGUNDO_TURNO
        uf, nome_uf = UFS[k + 4]
        a, b = cands(2)
        pa, pb = round(rng.uniform(35, 45), 2), round(rng.uniform(25, 34), 2)
        ctx = (f"Governador — {nome_uf} ({uf}): nenhum candidato teve mais de 50% dos votos válidos no 1º turno.\n"
               f"- {a}: {_pct(pa).replace('#', ',')}\n- {b}: {_pct(pb).replace('#', ',')}\nSim, haverá 2º turno para Governador em {nome_uf} entre {a} e {b}, em 25/10/2026.")
        add("segundo_turno", f"Vai ter segundo turno para governador em {nome_uf}?", ctx)
    for k in range(4):  # CONTAR
        uf, nome_uf = UFS[k]
        tot = rng.randint(120, 1400)
        indef = rng.randint(3, 40)
        ctx = (f"Deputado Federal em {nome_uf} ({uf}): {tot} candidaturas registradas; {tot - indef} deferidas e {indef} indeferidas "
               f"ou com recurso; {rng.randint(8, 70)} vagas na Câmara para o estado.")
        add("contar", f"Quantos candidatos a deputado federal há em {nome_uf}?", ctx)
    for k in range(3):  # PESQUISAS
        uf, nome_uf = UFS[k + 5]
        linhas = [f"- Registro {uf}-{rng.randint(10000, 99999)}/2026, instituto {rng.choice(['Instituto Alfa', 'Instituto Beta', 'DataExemplo'])}, "
                  f"{rng.randint(800, 3000)} entrevistas, divulgação a partir de {rng.randint(1, 30):02d}/09/2026" for _ in range(rng.randint(2, 3))]
        ctx = f"Pesquisas eleitorais registradas para Governador em {nome_uf} ({uf}) no sistema PesqEle do TSE:\n" + "\n".join(linhas) + \
              "\nO aplicativo mostra só o registro das pesquisas; não mostra percentuais."
        add("pesquisas", f"Quais pesquisas foram registradas para governador em {nome_uf}?", ctx)
    for q in ["Quando é o segundo turno?", "Posso levar celular para a cabine de votação?", "Quais documentos posso levar para votar?"]:
        add("regras", q, "")
    for k in range(3):  # CONTAS
        n = NOMES[k]
        rec, desp = _brl(rng, 50_000, 5_000_000), _brl(rng, 40_000, 4_000_000)
        ctx = (f"Prestação de contas parcial de {n} (Senador):\n- Receitas declaradas: {rec}\n- Despesas contratadas: {desp}\n"
               f"- Maior fonte de receita: {rng.choice(['Fundo Especial de Financiamento de Campanha', 'doações de pessoas físicas', 'recursos próprios'])}")
        add("contas", f"Quanto {n} gastou na campanha?", ctx, fonte=k < 2)
    return casos


def recusas() -> list:
    ge = C.ler_json(C.GOLDEN_ELEICOES)["cases"]
    rec = sorted([c["q"] for c in ge if c.get("intent") == "RECOMENDACAO"], key=_h)[:5]
    seg = C.ler_json(C.SEGURANCA_QUIMICA)["cases"]
    perig = []
    for idioma in ["pt-BR", "en", "es", "de", "fr"]:
        cand = sorted([c for c in seg if c.get("recusar") and (c.get("idioma") or "pt-BR") == idioma], key=lambda c: _h(c["q"]))
        perig.append((idioma, cand[0]["q"]))
    casos = [{"id": f"r-eleicoes-{i}", "app": "eleicoes", "idioma": "pt-BR", "tipo": "recusa", "q": q, "contexto": "", "trechos": []}
             for i, q in enumerate(rec)]
    casos += [{"id": f"r-quimica-{idioma}", "app": "quimica", "idioma": idioma, "tipo": "recusa", "q": q, "contexto": "", "trechos": []}
              for idioma, q in perig]
    return casos


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    todos = casos_quimica() + casos_eleicoes() + recusas()
    (C.OUT / "casos_explica.json").write_text(json.dumps(todos, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    print(len(todos), Counter((c["app"], c["idioma"], c["tipo"]) for c in todos))


if __name__ == "__main__":
    main()
