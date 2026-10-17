# -*- coding: utf-8 -*-
"""O formato do `contexto` multi-turno é o MESMO no treino/gate (ia/corpus/contexto_nlu.py, a definição) e no serviço da química
(apps/quimica/backend/modal/nlu_core.py: montar_entrada, separar_entrada, build_user_message). Rodar da raiz:
    python -m pytest -q ia/corpus/test_contexto_nlu.py
"""
import importlib.util
import json
import unittest
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
HOLDOUT_MT = AQUI / "out" / "v34" / "holdout_v34_multiturno.json"


def _mod(nome, caminho):
    spec = importlib.util.spec_from_file_location(nome, caminho)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


CTX = _mod("contexto_nlu_t", AQUI / "contexto_nlu.py")
CORE = _mod("nlu_core_quimica_t", RAIZ / "apps" / "quimica" / "backend" / "modal" / "nlu_core.py")

PARES = [
    ('{"intent": "MASSA_MOLAR", "composto": "NaCl"}', "e a do KCl?"),
    ('{"intent": "ELEMENTO", "elemento": "H"}', "e quanto ao carbono?"),
    ('{"intent": "SEGURANCA", "composto": "ácido sulfúrico"}', "e o ponto de fusão?"),
    ('{"intent": "CONVERSAO_UNIDADE", "quantidades": [{"valor": 25, "unidade": "°C"}], "unidadeDestino": "K"}', "and in fahrenheit?"),
    ('{"intent": "PROPRIEDADE", "elemento": "Na", "propriedade": "eletronegatividade"}', "und die von Kalium?"),
    ("", "qual a massa molar da água?"),
]


class FormatoIgual(unittest.TestCase):
    def test_montar_e_separar_iguais(self):
        for ctx, q in PARES:
            texto = CTX.montar_entrada(ctx, q)
            self.assertEqual(CORE.montar_entrada(ctx, q), texto)
            self.assertEqual(CORE.separar_entrada(texto), CTX.separar_entrada(texto))
        self.assertEqual(CORE.PREFIXO_CONTEXTO, CTX.PREFIXO)
        self.assertEqual(CORE.SEPARADOR_CONTEXTO, CTX.SEPARADOR)

    def test_servico_monta_o_mesmo_que_o_gate(self):
        """build_user_message (serviço) == limpar_entrada (gate) para as entradas com e sem contexto."""
        for ctx, q in PARES:
            texto = CTX.montar_entrada(ctx, q)
            obj = json.loads(ctx) if ctx else None
            self.assertEqual(CORE.build_user_message(q, obj), CTX.limpar_entrada(texto, CORE))

    @unittest.skipUnless(HOLDOUT_MT.exists(), "holdout multi-turno do v3.4 ausente (ia/corpus/out/v34)")
    def test_holdout_multiturno_inteiro(self):
        casos = json.loads(HOLDOUT_MT.read_text(encoding="utf-8"))["cases"]
        self.assertGreater(len(casos), 0)
        for c in casos:
            ctx, q = CTX.separar_entrada(c["q"])
            self.assertIsNotNone(ctx, c["q"])
            self.assertEqual(CORE.validate_contexto(ctx), ctx, "o contexto do holdout já está na forma canônica")
            self.assertEqual(CORE.build_user_message(q, json.loads(ctx)), CTX.limpar_entrada(c["q"], CORE))


if __name__ == "__main__":
    unittest.main(verbosity=2)
