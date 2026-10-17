# -*- coding: utf-8 -*-
"""
Testes de tools/comparar_pacotes.py (alerta de divergência de números entre o pacote novo e o anterior).
Usam o fixture web/test/fixtures/data-quimica e cópias modificadas em pasta temporária; o download é testado contra um servidor HTTP local.
Uso: python -m unittest discover -s tools -p "test_comparar_pacotes.py"
"""
import contextlib
import copy
import functools
import hashlib
import http.server
import io
import json
import shutil
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import comparar_pacotes as cp  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FIXTURE = RAIZ / "web" / "test" / "fixtures" / "data-quimica"
REAL = RAIZ / "data" / "quimica"


def ler(pasta: Path, rel: str):
    return json.loads((pasta / rel).read_text(encoding="utf-8"))


def gravar(pasta: Path, rel: str, dados):
    (pasta / rel).write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")


def editar(pasta: Path, rel: str, fn):
    dados = ler(pasta, rel)
    fn(dados)
    gravar(pasta, rel, dados)


def refazer_hashes(pasta: Path):
    """Atualiza sha256/bytes do manifesto para os arquivos que existem (necessário para o teste de download)."""
    m = ler(pasta, "manifest.json")
    for rel, info in m["files"].items():
        p = pasta / rel
        if p.is_file():
            corpo = p.read_bytes()
            info["sha256"], info["bytes"] = hashlib.sha256(corpo).hexdigest(), len(corpo)
    gravar(pasta, "manifest.json", m)


def rodar(*args):
    """Executa o CLI e devolve (código, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            codigo = cp.main([str(a) for a in args])
        except SystemExit as e:  # argparse
            codigo = e.code
    return codigo, out.getvalue(), err.getvalue()


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)
        self.anterior = self.copia("anterior")
        self.novo = self.copia("novo")

    def copia(self, nome: str) -> Path:
        destino = self.tmp / nome
        shutil.copytree(FIXTURE, destino)
        return destino

    def comparar(self, *extra, anterior=None):
        return rodar("--novo", self.novo, "--anterior", anterior or self.anterior, *extra)

    # atalhos de mutação do pacote novo
    def cid0(self):
        return ler(self.novo, "compostos/lote-001.json")[0]["cid"]

    def mudar_composto(self, fn, indice=0):
        def f(lote):
            fn(lote[indice])
        editar(self.novo, "compostos/lote-001.json", f)

    def mudar_elemento(self, z, fn):
        def f(lista):
            fn(next(e for e in lista if e["z"] == z))
        editar(self.novo, "elementos.json", f)


class SemDivergencia(Base):
    def test_pacotes_identicos_aprovam(self):
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 0, out)
        self.assertIn("APROVADO", out)

    def test_novo_pacote_mais_novo_e_com_compostos_a_mais_aprova_e_resume(self):
        def clonar(lote):
            c = copy.deepcopy(lote[0])
            c["cid"] = 99999991
            lote.append(c)
        editar(self.novo, "compostos/lote-001.json", clonar)
        editar(self.novo, "compostos/index.json", lambda i: i["porCid"].update({"99999991": "lote-001"}))
        editar(self.novo, "manifest.json", lambda m: m.update(generatedAt="2026-02-01T00:00:00Z"))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 0, out)
        self.assertIn("1 composto(s) novo(s)", out)
        self.assertIn("99999991", out)

    def test_pacote_real_contra_si_mesmo(self):
        if not (REAL / "manifest.json").is_file():
            self.skipTest("pacote real ausente")
        codigo, out, _ = rodar("--novo", REAL, "--anterior", REAL)
        self.assertEqual(codigo, 0, out)


class MassaMolar(Base):
    def test_acima_do_limiar_reprova(self):
        antes = ler(self.novo, "compostos/lote-001.json")[0]
        self.mudar_composto(lambda c: c.update(massaMolar=round(c["massaMolar"] * 1.01, 4)))
        saida = self.tmp / "res.json"
        codigo, out, _ = self.comparar("--json", saida)
        self.assertEqual(codigo, 1, out)
        self.assertIn("[massa-molar]", out)
        self.assertIn(f"CID {antes['cid']}", out)
        self.assertIn("REPROVADO", out)
        res = json.loads(saida.read_text(encoding="utf-8"))
        self.assertFalse(res["ok"])
        self.assertEqual([d["regra"] for d in res["divergencias"]], ["massa-molar"])
        self.assertIn(str(antes["cid"]), res["divergencias"][0]["tags"])

    def test_abaixo_do_limiar_aprova_e_resume(self):
        self.mudar_composto(lambda c: c.update(massaMolar=round(c["massaMolar"] * 1.004, 4)))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 0, out)
        self.assertIn("abaixo do limiar", out)

    def test_limiar_configuravel(self):
        self.mudar_composto(lambda c: c.update(massaMolar=round(c["massaMolar"] * 1.01, 4)))
        self.assertEqual(self.comparar("--limiar-massa", "2")[0], 0)
        self.assertEqual(self.comparar("--limiar-massa", "0.5")[0], 1)

    def test_massa_removida_reprova(self):
        self.mudar_composto(lambda c: c.pop("massaMolar"))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("ausente", out)

    def test_decimal_com_virgula_no_relatorio(self):
        self.mudar_composto(lambda c: c.update(massaMolar=c["massaMolar"] * 2))
        _, out, _ = self.comparar()
        self.assertIn("+100,00 %", out)


class Elementos(Base):
    def test_propriedade_acima_de_2_pct_reprova(self):
        self.mudar_elemento(1, lambda e: e.update(massaAtomica=e["massaAtomica"] * 1.03))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("[elemento-propriedade]", out)
        self.assertIn("massaAtomica", out)
        self.assertIn("H (Z=1", out)

    def test_propriedade_ate_2_pct_aprova(self):
        self.mudar_elemento(1, lambda e: e.update(massaAtomica=e["massaAtomica"] * 1.015))
        self.assertEqual(self.comparar()[0], 0)

    def test_limiar_de_elemento_configuravel(self):
        self.mudar_elemento(1, lambda e: e.update(massaAtomica=e["massaAtomica"] * 1.03))
        self.assertEqual(self.comparar("--limiar-elemento", "5")[0], 0)

    def test_propriedade_removida_reprova(self):
        self.mudar_elemento(1, lambda e: e.pop("massaAtomica"))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("massaAtomica", out)
        self.assertIn("ausente", out)

    def test_propriedade_nova_e_aceita_e_listada(self):
        self.mudar_elemento(1, lambda e: e.update(propriedadeInventada=12.5))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 0, out)
        self.assertIn("propriedades novas em elementos: propriedadeInventada (1)", out)

    def test_nao_numericos_nao_contam(self):
        self.mudar_elemento(1, lambda e: e.update(nome="Hidrogenio Alterado", categoria="outra"))
        self.assertEqual(self.comparar()[0], 0)

    def test_elemento_sumiu_reprova(self):
        editar(self.novo, "elementos.json", lambda lista: lista.pop())
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("[elementos-sumiram]", out)


class Compostos(Base):
    def remover_primeiro(self):
        editar(self.novo, "compostos/lote-001.json", lambda lote: lote.pop(0))

    def test_composto_sumiu_reprova_e_queda_de_6_pct_tambem(self):
        self.remover_primeiro()  # 1 de 15 = 6,7 %
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("[compostos-sumiram]", out)
        self.assertIn("[queda-compostos]", out)

    def test_limiar_de_queda_configuravel(self):
        self.remover_primeiro()
        _, out, _ = self.comparar("--limiar-compostos", "10")
        self.assertIn("[compostos-sumiram]", out)
        self.assertNotIn("[queda-compostos]", out)


class Textos(Base):
    def definir(self, pasta, total, por_fonte=None):
        def f(m):
            m["contagens"]["textos"] = total
            if por_fonte is not None:
                m["contagens"]["textosPorFonte"] = por_fonte
        editar(pasta, "manifest.json", f)

    def test_queda_acima_de_10_pct_reprova(self):
        self.definir(self.anterior, 100)
        self.definir(self.novo, 85)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("[queda-textos]", out)
        self.assertIn("100 -> 85", out)

    def test_queda_ate_10_pct_aprova(self):
        self.definir(self.anterior, 100)
        self.definir(self.novo, 91)
        self.assertEqual(self.comparar()[0], 0)

    def test_queda_de_uma_fonte_reprova(self):
        self.definir(self.anterior, 100, {"chebi": 50, "wikipedia-pt": 50})
        self.definir(self.novo, 100, {"chebi": 50, "wikipedia-pt": 40, "wikipedia-en": 10})
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("fonte wikipedia-pt", out)

    def test_fonte_que_sumiu_reprova(self):
        self.definir(self.anterior, 100, {"chebi": 50, "wikipedia-pt": 50})
        self.definir(self.novo, 100, {"chebi": 100})
        self.assertEqual(self.comparar()[0], 1)

    def test_mais_textos_e_aceito(self):
        self.definir(self.anterior, 100)
        self.definir(self.novo, 130)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 0)
        self.assertIn("textos: 100 -> 130", out)


class Licencas(Base):
    def test_licenca_alterada_em_fontes_json_reprova(self):
        def f(fontes):
            lista = fontes["fontes"] if isinstance(fontes, dict) else fontes
            lista[0]["licenca"] = "proprietária"
        editar(self.novo, "fontes.json", f)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("[licenca]", out)
        self.assertIn("fontes.json", out)
        self.assertIn("proprietária", out)

    def test_licenca_alterada_no_manifesto_reprova(self):
        editar(self.novo, "manifest.json", lambda m: m["sources"][0].update(licenca="CC BY-NC"))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("manifest.json (sources)", out)

    def test_politica_de_treino_alterada_reprova(self):
        def f(fontes):
            lista = fontes["fontes"] if isinstance(fontes, dict) else fontes
            lista[0]["treino"] = "nao" if lista[0].get("treino") != "nao" else "sim"
        editar(self.novo, "fontes.json", f)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("treino", out)

    def test_fonte_removida_reprova_e_fonte_nova_e_aceita(self):
        def sem_primeira(fontes):
            lista = fontes["fontes"] if isinstance(fontes, dict) else fontes
            lista.pop(0)
        editar(self.novo, "fontes.json", sem_primeira)
        self.assertEqual(self.comparar()[0], 1)
        # agora ao contrário: o anterior não tinha a fonte
        codigo, out, _ = rodar("--novo", self.anterior, "--anterior", self.novo)
        self.assertEqual(codigo, 0, out)
        self.assertIn("fontes novas", out)


class DataEConstantesERegras(Base):
    def test_generated_at_mais_antigo_reprova(self):
        editar(self.novo, "manifest.json", lambda m: m.update(generatedAt="2025-12-31T23:59:59Z"))
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("[data-mais-antiga]", out)

    def test_generated_at_ilegivel_reprova(self):
        editar(self.novo, "manifest.json", lambda m: m.update(generatedAt="ontem"))
        self.assertEqual(self.comparar()[0], 1)

    def test_constante_alterada_reprova(self):
        def f(c):
            lista = c["constantes"]
            lista[0]["valor"] = lista[0]["valor"] * 1.001
        editar(self.novo, "constantes.json", f)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1)
        self.assertIn("[constante]", out)

    def test_constante_removida_reprova(self):
        editar(self.novo, "constantes.json", lambda c: c["constantes"].pop(0))
        self.assertEqual(self.comparar()[0], 1)

    def test_numero_de_regras_alterado_reprova(self):
        def f(r):
            r["unidades"][next(iter(r["unidades"]))]["fatores"]["Pa"] = 2
        editar(self.novo, "regras.json", f)
        codigo, out, _ = self.comparar()
        self.assertEqual(codigo, 1, out)
        self.assertIn("[regras]", out)

    def test_texto_de_regras_alterado_nao_reprova(self):
        editar(self.novo, "regras.json", lambda r: r.update(descricao="outra descrição"))
        self.assertEqual(self.comparar()[0], 0)


class Permitir(Base):
    def setUp(self):
        super().setUp()
        self.mudar_elemento(1, lambda e: e.update(massaAtomica=e["massaAtomica"] * 1.5))
        self.mudar_composto(lambda c: c.update(massaMolar=c["massaMolar"] * 1.5))

    def test_sem_permitir_reprova_duas_regras(self):
        _, out, _ = self.comparar()
        self.assertIn("[massa-molar]", out)
        self.assertIn("[elemento-propriedade]", out)

    def test_permitir_regra_inteira(self):
        codigo, out, _ = self.comparar("--permitir", "massa-molar")
        self.assertEqual(codigo, 1)
        self.assertNotIn("[massa-molar]", out)
        self.assertIn("Divergências aceitas por --permitir: 1", out)

    def test_permitir_por_alvo_propriedade_cid_simbolo_e_lista(self):
        cid = self.cid0()
        codigo, out, _ = self.comparar("--permitir", f"massa-molar:{cid},elemento-propriedade:massaAtomica")
        self.assertEqual(codigo, 0, out)
        self.assertIn("APROVADO", out)
        codigo, _, _ = self.comparar("--permitir", "massa-molar", "--permitir", "elemento-propriedade:H")
        self.assertEqual(codigo, 0)
        # o alvo certo é obrigatório: outra propriedade não aceita esta
        self.assertEqual(self.comparar("--permitir", "massa-molar", "--permitir", "elemento-propriedade:pontoFusaoK")[0], 1)

    def test_permitir_nao_usado_e_avisado(self):
        _, out, _ = self.comparar("--permitir", "massa-molar,licenca:wikidata")
        self.assertIn("que não aceitaram nada", out)
        self.assertIn("licenca:wikidata", out)

    def test_regra_desconhecida_e_erro_de_uso(self):
        codigo, _, err = self.comparar("--permitir", "massa_molar")
        self.assertEqual(codigo, 2)
        self.assertIn("regra desconhecida", err)


class Erros(Base):
    def test_pasta_nova_inexistente_e_erro(self):
        codigo, _, err = rodar("--novo", self.tmp / "nao-existe", "--anterior", self.anterior)
        self.assertEqual(codigo, 2)
        self.assertIn("manifest.json", err)

    def test_json_corrompido_e_erro(self):
        (self.novo / "elementos.json").write_text("{nao e json", encoding="utf-8")
        codigo, _, err = self.comparar()
        self.assertEqual(codigo, 2)
        self.assertIn("elementos.json", err)

    def test_nome_de_lote_malicioso_e_erro(self):
        editar(self.novo, "compostos/index.json", lambda i: i.update(lotes=["../../manifest"]))
        self.assertEqual(self.comparar()[0], 2)


class _Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):  # noqa: D401
        pass


class Servidor:
    def __init__(self, pasta: Path):
        handler = functools.partial(_Silencioso, directory=str(pasta))
        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}/"
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *a):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(5)


class Download(Base):
    def setUp(self):
        super().setUp()
        refazer_hashes(self.anterior)  # a pasta servida precisa ter o manifesto coerente com os arquivos

    def test_baixa_confere_hash_e_compara(self):
        with Servidor(self.anterior) as s:
            codigo, out, _ = self.comparar("--tentativas", "1", anterior=s.url)
        self.assertEqual(codigo, 0, out)
        self.assertIn(s.url, out)
        self.assertNotIn("AVISO", out)

    def test_url_com_manifest_json_no_fim_tambem_serve(self):
        with Servidor(self.anterior) as s:
            codigo, out, _ = self.comparar("--tentativas", "1", anterior=s.url + "manifest.json")
        self.assertEqual(codigo, 0, out)

    def test_divergencia_contra_o_publicado(self):
        self.mudar_composto(lambda c: c.update(massaMolar=c["massaMolar"] * 1.02))
        with Servidor(self.anterior) as s:
            codigo, out, _ = self.comparar("--tentativas", "1", anterior=s.url)
        self.assertEqual(codigo, 1, out)
        self.assertIn("[massa-molar]", out)

    def test_hash_diferente_usa_a_reserva_e_avisa(self):
        (self.anterior / "elementos.json").write_text("[]", encoding="utf-8")  # manifesto publicado ainda cita o hash antigo
        with Servidor(self.anterior) as s:
            codigo, out, _ = self.comparar("--tentativas", "1", "--anterior-reserva", self.copia("reserva"), anterior=s.url)
        self.assertEqual(codigo, 0, out)
        self.assertIn("AVISO: não foi possível baixar o pacote publicado", out)
        self.assertIn("sha256", out)
        self.assertIn("(reserva)", out)

    def test_sem_reserva_falha_com_erro(self):
        (self.anterior / "elementos.json").write_text("[]", encoding="utf-8")
        with Servidor(self.anterior) as s:
            codigo, _, err = self.comparar("--tentativas", "1", anterior=s.url)
        self.assertEqual(codigo, 2)
        self.assertIn("--anterior-reserva", err)

    def test_servidor_fora_do_ar_usa_a_reserva(self):
        with Servidor(self.anterior) as s:
            url = s.url
        codigo, out, _ = self.comparar("--tentativas", "1", "--anterior-reserva", self.copia("reserva"), anterior=url)
        self.assertEqual(codigo, 0, out)
        self.assertIn("AVISO", out)

    def test_indice_com_lote_fora_da_pasta_e_recusado(self):
        editar(self.anterior, "compostos/index.json", lambda i: i.update(lotes=["../manifest"]))
        refazer_hashes(self.anterior)
        with Servidor(self.anterior) as s:
            codigo, out, err = self.comparar("--tentativas", "1", anterior=s.url)
        self.assertEqual(codigo, 2, out)
        self.assertIn("caminho inválido", err)
        self.assertFalse((self.tmp / "manifest.json").exists())


class Unidades(unittest.TestCase):
    def test_variacao_pct(self):
        self.assertEqual(cp.variacao_pct(100, 100), 0.0)
        self.assertAlmostEqual(cp.variacao_pct(100, 98), -2.0)
        self.assertAlmostEqual(cp.variacao_pct(-10, -11), -10.0)  # relativo ao módulo do anterior
        self.assertEqual(cp.variacao_pct(0, 5), float("inf"))

    def test_achatar_numeros_usa_ids_e_ignora_bool(self):
        a = cp.achatar_numeros({"x": [{"id": "a", "v": 1}, {"id": "b", "v": 2}], "ok": True, "t": "s"})
        b = cp.achatar_numeros({"x": [{"id": "b", "v": 2}, {"id": "a", "v": 1}], "ok": True, "t": "s"})
        self.assertEqual(a, b)
        self.assertEqual(a, {"/x[a]/v": 1, "/x[b]/v": 2})

    def test_interpretar_permitir(self):
        self.assertEqual(cp.interpretar_permitir(["licenca:wikidata, massa-molar  constante"]),
                         [("licenca", "wikidata"), ("massa-molar", None), ("constante", None)])
        with self.assertRaises(ValueError):
            cp.interpretar_permitir(["nao-existe"])

    def test_todas_as_regras_documentadas_no_cabecalho(self):
        for regra in cp.REGRAS:
            self.assertIn(regra, cp.__doc__)


if __name__ == "__main__":
    unittest.main()
