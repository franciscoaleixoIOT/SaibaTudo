#!/usr/bin/env bash
# Roda as etapas do benchmark em sequência (da raiz do repositório). Uso: bash tools/benchmark_ia/rodar_tudo.sh [etapas]
# Etapas: nlu-gpu explica nlu-cpu resumo cegas (padrão: todas). PY pode ser trocado por variável de ambiente.
set -u
PY="${PY:-/c/Users/franc/AndroidStudioProjects/SaibaTudoEleicao2026/ai_model/.venv/Scripts/python.exe}"
B=tools/benchmark_ia
ETAPAS="${*:-nlu-gpu explica nlu-cpu resumo cegas}"
for e in $ETAPAS; do
  echo "### $e $(date +%H:%M:%S)"
  case "$e" in
    nlu-gpu) "$PY" -I $B/nlu_bench.py --sem-cpu ${NLU_MODELOS:+--modelos $NLU_MODELOS} ;;
    explica) "$PY" -I $B/casos_explica.py >/dev/null && "$PY" -I $B/explica_bench.py ${EXP_MODELOS:+--modelos $EXP_MODELOS} ${EXP_FRACAO:+--fracao $EXP_FRACAO} ;;
    nlu-cpu) "$PY" -I $B/nlu_bench.py --so-cpu ${NLU_MODELOS:+--modelos $NLU_MODELOS} ;;
    resumo)  "$PY" -I $B/resumo.py ;;
    cegas)   "$PY" -I $B/cegas.py ;;
  esac
done
echo "### fim $(date +%H:%M:%S)"
