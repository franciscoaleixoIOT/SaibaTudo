# -*- coding: utf-8 -*-
"""Limite de geração do explicador de eleições: o gate (`avaliar_explica_holdout.py --max-tokens`) mede com o MESMO limite do Space
(`hf_space_explica/app.py` MAX_NEW_TOKENS), e esse limite cobre o maior texto que o próprio app produz.

Medido em 27/10/2026 (v1.7, tokenizador do Qwen3-4B): maior saída esperada 519 tokens no treino e 515 no holdout; com 400 (limite até então)
6 das 223 respostas do holdout eram cortadas antes do rodapé "pode conter erros" — não por erro do modelo, mas pelo teto.
"""
import re
import unittest
from pathlib import Path

AQUI = Path(__file__).resolve().parent
APP_SPACE = AQUI.parents[0] / "hf_space_explica" / "app.py"
AVALIADOR = AQUI / "avaliar_explica_holdout.py"
MINIMO_TOKENS = 560  # 519 (maior saída do dataset de 27/10) com folga para listas um pouco maiores


def limite_space() -> int:
    m = re.search(r"^MAX_NEW_TOKENS\s*=\s*(\d+)", APP_SPACE.read_text(encoding="utf-8"), re.M)
    assert m, "MAX_NEW_TOKENS não encontrado em app.py"
    return int(m.group(1))


def limite_gate() -> int:
    m = re.search(r'"--max-tokens",\s*type=int,\s*default=(\d+)', AVALIADOR.read_text(encoding="utf-8"))
    assert m, "--max-tokens sem default inteiro em avaliar_explica_holdout.py"
    return int(m.group(1))


class LimiteTokensTest(unittest.TestCase):
    def test_gate_usa_o_mesmo_limite_do_space(self):
        self.assertEqual(limite_gate(), limite_space())

    def test_limite_cobre_a_maior_saida_do_app(self):
        self.assertGreaterEqual(limite_space(), MINIMO_TOKENS)


if __name__ == "__main__":
    unittest.main()
