# -*- coding: utf-8 -*-
"""Pipeline do pacote GloVe: filtro de palavras, quantização int8 por vetor, vizinhos iguais em float e int8, pacote assinado.
Roda sem rede (vetores sintéticos). Uso: python -m unittest discover -s pipeline/tests -v
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent))

import sign  # noqa: E402
from gerar_pacote import LIMITE, desquantizar, escrever_pacote, filtrar_palavras, quantizar  # noqa: E402


def _top10(matriz: np.ndarray, i: int) -> list:
    m = matriz / np.linalg.norm(matriz, axis=1, keepdims=True)
    cos = m @ m[i]
    cos[i] = -2
    return list(np.argsort(-cos)[:10])


class Filtro(unittest.TestCase):
    def test_filtrar_mantem_ordem_e_regras(self):
        palavras = ["the", ",", "of", "u.s.", "1990", "rock-and-roll", "o'neill", "King", "a" * 21, "zebra", "fim"]
        self.assertEqual(filtrar_palavras(palavras, limite=5), ["the", "of", "rock-and-roll", "o'neill", "zebra"])

    def test_limite_padrao(self):
        self.assertEqual(LIMITE, 100_000)
        self.assertEqual(len(filtrar_palavras(("w%d" % i for i in range(5)))), 0)  # dígitos não entram
        self.assertEqual(len(filtrar_palavras(("w" * (i + 1) for i in range(30)))), 20)  # até 20 caracteres


class Quantizacao(unittest.TestCase):
    def test_quantizar_ida_e_volta(self):
        m = np.random.default_rng(1).normal(size=(20, 50)).astype(np.float32)
        m[3] = 0
        q, e = quantizar(m)
        self.assertEqual((q.dtype, e.dtype, q.shape, e.shape), (np.int8, np.float32, (20, 50), (20,)))
        self.assertTrue(np.all(np.abs(desquantizar(q, e) - m) <= e[:, None] / 2 + 1e-6))
        self.assertEqual(float(e[3]), 1.0)
        self.assertEqual(int(np.abs(q).max()), 127)

    def test_vizinhos_iguais_em_float_e_int8(self):
        rng = np.random.default_rng(7)
        centros = rng.normal(size=(6, 50))
        grupos = [centros[i // 10] + rng.normal(scale=0.15, size=50) for i in range(60)]
        m = np.array(grupos, dtype=np.float32)
        q, e = quantizar(m)
        volta = desquantizar(q, e)
        for i in (0, 11, 25, 42, 59):
            a, b = _top10(m, i), _top10(volta, i)
            self.assertEqual(a[0], b[0], f"consulta {i}: vizinho mais próximo")
            self.assertEqual(sorted(a), sorted(b), f"consulta {i}: mesmo conjunto dos 10 vizinhos")


class Pacote(unittest.TestCase):
    def test_escrever_pacote_assina_e_lista_arquivos(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            priv, pub = tmp / "k.pem", tmp / "pub.pem"
            sign.gerar(priv, pub)
            palavras = ["king", "queen", "cat"]
            m = np.random.default_rng(3).normal(size=(3, 50)).astype(np.float32)
            saida = tmp / "pacote"
            manifesto = escrever_pacote(
                saida, palavras, m, glossario={"king": {"pt-BR": "rei"}}, presets={"realeza": ["king", "queen"]},
                chave_privada=priv, fonte={"nome": "GloVe 6B 50d", "licenca": "PDDL 1.0", "url": "https://nlp.stanford.edu/projects/glove/"},
            )
            self.assertEqual(sorted(manifesto["files"]), ["escalas.f32", "glossario.json", "presets.json", "vetores.i8", "vocab.json"])
            self.assertEqual(manifesto["vetores"]["palavras"], 3)
            self.assertEqual(manifesto["vetores"]["dimensoes"], 50)
            self.assertEqual(manifesto["vetores"]["licenca"], "PDDL 1.0")
            self.assertEqual(manifesto["schemaVersion"], 1)
            self.assertRegex(manifesto["version"], r"^\d{8}T\d{6}Z-[0-9a-f]{12}$")
            self.assertTrue(sign.verificar(saida / "manifest.json", pub))
            self.assertEqual((saida / "vetores.i8").stat().st_size, 3 * 50)
            self.assertEqual((saida / "escalas.f32").stat().st_size, 3 * 4)
            self.assertEqual(json.loads((saida / "vocab.json").read_text(encoding="utf-8")), palavras)
            gravado = json.loads((saida / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(gravado["files"]["vetores.i8"]["bytes"], 150)
            self.assertEqual(len(gravado["files"]["vetores.i8"]["sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
