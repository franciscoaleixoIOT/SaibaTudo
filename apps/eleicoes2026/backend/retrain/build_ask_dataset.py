# -*- coding: utf-8 -*-
"""
Monta o conjunto de treino do EXPLICADOR SaibaTudo IA para o app de eleições a partir das respostas determinísticas do site
(backend/retrain/dump_respostas_ask.mjs -> respostas.jsonl). O explicador aprende COMPORTAMENTO, não fatos: reescreve, em tópicos
neutros, SOMENTE o que o contexto (a resposta que o app já mostra, montada do pacote do TSE) traz; recusa pedidos de recomendação
com o texto do app; diz que o dado não está disponível quando o contexto não o traz. Nenhum número entra na saída que não esteja
no contexto ou na pergunta (conferido registro a registro; o que falhar vai para descartados.jsonl).

Cada registro vira um exemplo no formato de apps/quimica/ai_model/scripts/train_hybrid.py:
    {instruction, input, output, id, app: "eleicoes", tipo}
      instruction  nlu_core.ASK_SYSTEM_PROMPT (o mesmo do Space e da reserva no Modal)
      input        a mensagem do usuário de nlu_core.build_ask_prompt: CONTEXTO (...) + PERGUNTA DO ELEITOR
      output       a reescrita neutra (ou a recusa, ou "dado não disponível")

Holdout de 20 % por hash do id (o MESMO registro cai sempre do mesmo lado); o holdout nunca treina e serve ao gate de fidelidade.

Uso:  node backend/retrain/dump_respostas_ask.mjs --out backend/retrain/out-ask/respostas.jsonl
      python backend/retrain/build_ask_dataset.py --in backend/retrain/out-ask/respostas.jsonl --out backend/retrain/out-ask
"""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "modal"))
import nlu_core as core  # noqa: E402

RODAPE = "Texto gerado por IA a partir dos dados que o aplicativo apurou; pode conter erros. Confira os dados oficiais no aplicativo."
SEM_DADO = ("O aplicativo não encontrou, nos dados oficiais do TSE, uma resposta para essa pergunta, então não posso responder com segurança. "
            "Tente citar um cargo, um estado, um partido, o nome ou o número de um candidato. " + RODAPE)
SEM_CONTEXTO = ("Não recebi do aplicativo os dados dessa consulta, e não respondo de memória nem com dados de eleições passadas. "
                "Abra a consulta no aplicativo para ver os dados oficiais do TSE. " + RODAPE)
MAX_LINHAS = 14
MAX_SAIDA = 1100
_RX_NUM = re.compile(r"\d+(?:[.,]\d+)*")


def _numeros(texto: str) -> set:
    return {m.group(0).replace(".", "").replace(",", ".") for m in _RX_NUM.finditer(texto or "")}


def reescrever(direct_answer: str) -> str:
    """Reescrita neutra e determinística da resposta do app: abertura fixa + as mesmas linhas (tópicos preservados), cortadas em
    MAX_LINHAS, + rodapé. Não acrescenta fato, nome nem número."""
    linhas = [l.rstrip() for l in direct_answer.replace("\r\n", "\n").split("\n") if l.strip()]
    corpo = linhas[:MAX_LINHAS]
    cortou = len(linhas) > MAX_LINHAS
    if corpo and not corpo[0].lstrip().startswith(("•", "-")):
        corpo[0] = corpo[0].rstrip(":") + "."
    texto = "Com base nos dados do TSE apurados pelo aplicativo:\n" + "\n".join(corpo)
    if cortou:
        texto += "\n(…) A lista continua no aplicativo; não conto itens nem informo totais que não estejam escritos acima."
    texto += "\n" + RODAPE
    if len(texto) > MAX_SAIDA:
        corte = texto.rfind("\n", 0, MAX_SAIDA - len(RODAPE) - 2)
        texto = texto[:corte].rstrip() + "\n(…) O restante está no aplicativo.\n" + RODAPE
    return texto


def exemplo(reg: dict, com_contexto: bool = True) -> dict | None:
    q = reg["q"]
    tipo = reg["tipo"]
    intent = reg.get("intent")
    contexto = reg.get("contexto") or ""
    if tipo == "recusa" or intent == "RECOMENDACAO":
        # o app recusa com neutralidade; o explicador aprende a MESMA recusa (nunca chega a recomendar)
        # v1.7 (27/10/2026): sem citação de lei (o modelo acrescentava "(LC 64/90)" e o gate contava como número) e COM o rodapé,
        # como todo tipo de saída — o modelo aprende um único fecho
        saida = ("Não indico, recomendo, comparo nem prevejo candidatos: a decisão do voto é sua. "
                 "Com os dados oficiais do TSE, o aplicativo mostra quem disputa cada cargo, número na urna, perfil, Ficha Limpa, bens, "
                 "contas de campanha, plano de governo, pesquisas registradas e resultados oficiais. " + RODAPE)
        ctx = ""  # o site não envia contexto em recusas (perguntarANuvem pula RECOMENDACAO); treina-se sem contexto
    elif not com_contexto:
        saida, ctx = SEM_CONTEXTO, ""
    elif not reg.get("resolvida") or intent == "DESCONHECIDA" or not contexto:
        saida, ctx = SEM_DADO, contexto
    else:
        saida, ctx = reescrever(reg["directAnswer"]), contexto
    # fidelidade: todo número da saída tem de estar no contexto ou na pergunta
    sobra = _numeros(saida) - _numeros(ctx) - _numeros(q) - _numeros(core.ASK_SYSTEM_PROMPT)
    if sobra:
        return None
    user = core.build_ask_prompt(q, ctx).split(f"{core.IM_START}user\n", 1)[1].split(core.IM_END, 1)[0]
    sufixo = "" if com_contexto else "-semctx"
    return {"instruction": core.ASK_SYSTEM_PROMPT, "input": user, "output": saida, "id": f"e-{reg['id']}{sufixo}", "app": "eleicoes",
            "tipo": tipo if tipo == "recusa" else ("sem_dado" if saida == SEM_DADO else ("sem_contexto" if not com_contexto else "contexto"))}


def holdout(id_: str, pct: int) -> bool:
    return int(hashlib.sha256(id_.encode("utf-8")).hexdigest()[:8], 16) % 100 < pct


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--in", dest="entrada", default="backend/retrain/out-ask/respostas.jsonl")
    ap.add_argument("--out", default="backend/retrain/out-ask")
    ap.add_argument("--holdout-pct", type=int, default=20)
    ap.add_argument("--sem-contexto-cada", type=int, default=8, help="1 em N perguntas resolvidas ganha também a variante sem contexto")
    a = ap.parse_args()
    regs = [json.loads(l) for l in Path(a.entrada).read_text(encoding="utf-8").splitlines() if l.strip()]
    treino, hold, descartados = [], [], []
    stats = Counter()
    for i, reg in enumerate(regs):
        variantes = [exemplo(reg, True)]
        if reg.get("resolvida") and reg.get("tipo") != "recusa" and i % a.sem_contexto_cada == 0:
            variantes.append(exemplo(reg, False))
        for ex in variantes:
            if ex is None:
                descartados.append(reg)
                stats["descartado_numero_sem_fonte"] += 1
                continue
            destino = hold if holdout(ex["id"], a.holdout_pct) else treino
            destino.append(ex)
            stats[("holdout_" if destino is hold else "treino_") + ex["tipo"]] += 1
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "train.json").write_text(json.dumps(treino, ensure_ascii=False, indent=0), encoding="utf-8")
    (out / "holdout.json").write_text(json.dumps(hold, ensure_ascii=False, indent=0), encoding="utf-8")
    (out / "descartados.jsonl").write_text("".join(json.dumps(d, ensure_ascii=False) + "\n" for d in descartados), encoding="utf-8")
    stats["treino_total"], stats["holdout_total"] = len(treino), len(hold)
    (out / "stats.json").write_text(json.dumps(dict(sorted(stats.items())), ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(dict(sorted(stats.items())), ensure_ascii=False, indent=1))
    print(f"-> {out}: {len(treino)} treino, {len(hold)} holdout, {len(descartados)} descartados")


if __name__ == "__main__":
    main()
