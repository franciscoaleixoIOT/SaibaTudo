# -*- coding: utf-8 -*-
"""Testes do verificador de release (tools/verificar_release.py). O teste com o APK real roda quando app/build/outputs/apk/release/app-release.apk existe.

Rodar de dentro de apps/quimica:  python -m unittest tools.test_verificar_release
"""
import contextlib
import io
import json
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import verificar_release as v  # noqa: E402

APK = HERE.parent / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"
ENCHIMENTO = 6 * 1024 * 1024


def dex_minimo(classes):
    """DEX mínimo e válido para o leitor: header + string_ids + strings + type_ids + class_defs (sem código)."""
    strings = sorted(classes)
    dados = b"".join(bytes([len(s)]) + s.encode() + b"\x00" for s in strings)
    str_off = 0x70
    dados_off = str_off + 4 * len(strings)
    offs, pos = [], dados_off
    for s in strings:
        offs.append(pos)
        pos += 1 + len(s) + 1
    tipo_off = pos
    cls_off = tipo_off + 4 * len(strings)
    header = bytearray(0x70)
    header[0:8] = b"dex\n035\x00"
    struct.pack_into("<IIII", header, 0x38, len(strings), str_off, len(strings), tipo_off)
    struct.pack_into("<II", header, 0x60, len(strings), cls_off)
    corpo = b"".join(struct.pack("<I", o) for o in offs) + dados
    tipos = b"".join(struct.pack("<I", i) for i in range(len(strings)))
    defs = b"".join(struct.pack("<I", i) + b"\x00" * 28 for i in range(len(strings)))
    return bytes(header) + corpo + tipos + defs


def manifesto(versao="20261012T171653Z-teste", arquivos=None):
    arquivos = arquivos if arquivos is not None else {"elementos.json": b'{"x":1}', "compostos/index.json": b"{}"}
    return {"version": versao, "schemaVersion": 1, "files": {k: {"bytes": len(b), "sha256": "0" * 64} for k, b in arquivos.items()}}, arquivos


class Leitor(unittest.TestCase):
    def test_lista_as_classes_definidas(self):
        cls = {"Lnet/exemplo/A;", "Lnet/exemplo/B$C;"}
        self.assertEqual(v.classes_definidas(dex_minimo(cls)), cls)

    def test_nao_dex_e_recusado(self):
        with self.assertRaises(ValueError):
            v.classes_definidas(b"isto nao e um dex" * 10)

    def test_uleb128(self):
        self.assertEqual(v._uleb128(bytes([0x05]), 0), (5, 1))
        self.assertEqual(v._uleb128(bytes([0xE5, 0x8E, 0x26]), 0), (624485, 3))


class Verificacao(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        man, _ = manifesto()
        self.repo = self.dir / "manifest-repo.json"
        self.repo.write_text(json.dumps(man), encoding="utf-8")

    def _apk(self, classes, tamanho_extra=ENCHIMENTO, man=None, arquivos=None, sem=(), nome="app.apk"):
        if man is None:
            man, arquivos = manifesto()
        p = self.dir / nome
        with zipfile.ZipFile(p, "w", zipfile.ZIP_STORED) as z:
            z.writestr("classes.dex", dex_minimo(classes))
            for a in ["assets/molecula.html", "assets/vendor/smiles-drawer.min.js", "assets/vendor/LICENSE-smiles-drawer.md"]:
                if a not in sem:
                    z.writestr(a, b"x")
            if "assets/quimica/manifest.json" not in sem:
                z.writestr("assets/quimica/manifest.json", json.dumps(man))
            if "assets/quimica/manifest.sig" not in sem:
                z.writestr("assets/quimica/manifest.sig", b"assinatura")
            for k, b in (arquivos or {}).items():
                if "assets/quimica/" + k not in sem:
                    z.writestr("assets/quimica/" + k, b)
            if tamanho_extra:
                z.writestr("res/raw/enchimento.bin", b"\x00" * tamanho_extra)
        return p

    def _verificar(self, p, **kw):
        return v.verificar(p, manifesto_repo=self.repo, **kw)

    def test_apk_completo_passa(self):
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS)))
        self.assertTrue(ok, problemas)

    def test_classe_removida_pelo_r8_e_apontada_pelo_nome(self):
        faltando = set(v.OBRIGATORIAS) - {"Landroidx/work/impl/WorkDatabase_Impl;"}
        ok, problemas = self._verificar(self._apk(faltando))
        self.assertFalse(ok)
        self.assertEqual(len(problemas), 1)
        self.assertIn("WorkDatabase_Impl", problemas[0])
        self.assertIn("AUSENTE", problemas[0])

    def test_worker_da_quimica_e_obrigatorio(self):
        self.assertIn("Lnet/saibatudo/quimica/data/bundle/DataUpdateWorker;", v.OBRIGATORIAS)
        faltando = set(v.OBRIGATORIAS) - {"Lnet/saibatudo/quimica/data/bundle/DataUpdateWorker;"}
        ok, problemas = self._verificar(self._apk(faltando))
        self.assertFalse(ok)
        self.assertIn("DataUpdateWorker", problemas[0])

    def test_tamanho_fora_do_esperado(self):
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS), tamanho_extra=0))
        self.assertFalse(ok)
        self.assertTrue(any("tamanho do APK" in p for p in problemas), problemas)

    def test_arquivo_do_pacote_ausente(self):
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS), sem=("assets/quimica/elementos.json",)))
        self.assertFalse(ok)
        self.assertTrue(any("elementos.json" in p for p in problemas), problemas)

    def test_tamanho_do_arquivo_diferente_do_manifesto(self):
        man, arquivos = manifesto()
        arquivos = dict(arquivos, **{"elementos.json": b'{"x":12345}'})
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS), man=man, arquivos=arquivos))
        self.assertFalse(ok)
        self.assertTrue(any("tamanho diferente" in p for p in problemas), problemas)

    def test_pacote_diferente_do_repositorio(self):
        man, arquivos = manifesto(versao="20250101T000000Z-velho")
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS), man=man, arquivos=arquivos))
        self.assertFalse(ok)
        self.assertTrue(any("diferente do pacote real" in p for p in problemas), problemas)

    def test_fixture_embutido_e_recusado(self):
        man, arquivos = manifesto(versao="2026.10.10-fixture")
        ok, problemas = v.verificar(self._apk(set(v.OBRIGATORIAS), man=man, arquivos=arquivos), manifesto_repo=None)
        self.assertFalse(ok)
        self.assertTrue(any("FIXTURE" in p for p in problemas), problemas)

    def test_sem_manifesto_e_sem_molecula(self):
        ok, problemas = self._verificar(self._apk(set(v.OBRIGATORIAS), sem=("assets/quimica/manifest.json", "assets/molecula.html")))
        self.assertFalse(ok)
        self.assertTrue(any("manifest.json" in p for p in problemas), problemas)
        self.assertTrue(any("molecula.html" in p for p in problemas), problemas)

    def test_apk_sem_dex(self):
        p = self.dir / "vazio.apk"
        with zipfile.ZipFile(p, "w") as z:
            z.writestr("AndroidManifest.xml", b"x")
        with self.assertRaises(ValueError):
            v.classes_do_apk(p)

    def test_cli_codigos_de_saida(self):
        # a saída é capturada: no log do CI, um "PROBLEMA: classe obrigatória AUSENTE" simulado pareceria uma falha real do release
        saida, erro = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(saida), contextlib.redirect_stderr(erro):
            self.assertEqual(v.main([]), 2)
            self.assertEqual(v.main(["/nao/existe.apk"]), 2)
            self.assertEqual(v.main([str(self._apk(set(v.OBRIGATORIAS), nome="ok.apk")), "--sem-dados"]), 0)
            self.assertEqual(v.main([str(self._apk({"Lx/Y;"}, nome="ruim.apk")), "--sem-dados"]), 1)
        self.assertIn("PROBLEMA: classe obrigatória AUSENTE", saida.getvalue())
        self.assertIn("OK: ", saida.getvalue())


@unittest.skipUnless(APK.exists(), "APK de release não gerado (rode ./gradlew.bat :app:assembleRelease)")
class ApkReal(unittest.TestCase):
    def test_o_release_real_tem_as_classes_e_o_pacote_real(self):
        ok, problemas = v.verificar(APK)
        self.assertTrue(ok, problemas)

    def test_o_dex_real_define_milhares_de_classes(self):
        self.assertGreater(len(v.classes_do_apk(APK)), 1000)


if __name__ == "__main__":
    unittest.main()
