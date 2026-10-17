# -*- coding: utf-8 -*-
"""traduzir_textos.py: cache por hash, parse do lote, descarte quando os itens não batem ou os números mudam, reserva de modelos.
A chamada ao kilo é sempre simulada (nenhum teste usa rede nem a CLI)."""
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import traduzir_textos as T  # noqa: E402

A = "A carboxylic acid with 3 carbon atoms (C3H6O3, 90.08 g/mol) that is used in industry and medicine."
A_PT = "Um ácido carboxílico com 3 átomos de carbono (C3H6O3, 90,08 g/mol) usado na indústria e na medicina."
B = "A triol with a structure of propane substituted at positions 1, 2 and 3 by hydroxy groups."
B_PT = "Um triol com estrutura de propano substituído nas posições 1, 2 e 3 por grupos hidroxila."
C = "Water (H2O) boils at 100 degrees Celsius under normal pressure."
C_PT = "A água (H₂O) ferve a 100 graus Celsius sob pressão normal."
TRADUCOES = {A: A_PT, B: B_PT, C: C_PT}


def itens_do_prompt(prompt):
    """[(n, id, texto)] do prompt enviado ao modelo."""
    partes = re.split(r"^### ITEM (\d+) \(([^)]*)\)\n", prompt, flags=re.M)
    return [(int(partes[i]), partes[i + 1], partes[i + 2].strip()) for i in range(1, len(partes), 3)]


def resposta(itens_traduzidos):
    return "".join(f"### ITEM {n} ({i})\n{t}\n" for n, i, t in itens_traduzidos)


def tradutor_ok(prompt):
    return resposta([(n, i, TRADUCOES[t]) for n, i, t in itens_do_prompt(prompt)]), "alibaba-token-plan/qwen3.8-max"


def escrever_pacote(raiz, textos_por_fonte):
    for fonte, textos in textos_por_fonte.items():
        pasta = Path(raiz) / "textos" / fonte
        pasta.mkdir(parents=True)
        regs = [{"id": f"{fonte}-{k:03d}", "titulo": titulo, "secao": titulo, "textoOriginal": txt, "textoPt": None,
                 "traducao": "pendente", "idioma": "en"} for k, (titulo, txt) in enumerate(textos, 1)]
        (pasta / "lote-001.json").write_text(json.dumps(regs, ensure_ascii=False), encoding="utf-8")
    pasta = Path(raiz) / "textos" / "wikipedia-en"  # fonte que não é pendente: nunca entra
    pasta.mkdir(parents=True)
    (pasta / "lote-001.json").write_text(json.dumps([{"id": "w-1", "titulo": "x", "textoOriginal": A, "traducao": "não se aplica", "idioma": "en"}]),
                                         encoding="utf-8")


class ParseLoteTest(unittest.TestCase):
    def test_ok_e_cerca_de_codigo(self):
        r = "```\n### ITEM 1 (a)\nUm.\n\n### ITEM 2 (b)\nDois\nlinhas.\n```"
        self.assertEqual(T.parse_lote(r, 2), ["Um.", "Dois\nlinhas."])

    def test_prefacio_antes_do_primeiro_item_e_ignorado(self):
        self.assertEqual(T.parse_lote("Aqui está.\n### ITEM 1 (a)\nUm.", 1), ["Um."])

    def test_numero_de_itens_que_nao_bate(self):
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("### ITEM 1 (a)\nUm.", 2)  # faltou
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("### ITEM 1 (a)\nUm.\n### ITEM 2 (b)\nDois.\n### ITEM 3 (c)\nTrês.", 2)  # sobrou
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("### ITEM 2 (b)\nDois.\n### ITEM 1 (a)\nUm.", 2)  # fora de ordem
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("### ITEM 1 (a)\nUm.\n### ITEM 1 (a)\nUm.", 2)  # repetido
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("", 1)

    def test_item_vazio(self):
        with self.assertRaises(T.LoteInvalido):
            T.parse_lote("### ITEM 1 (a)\n\n### ITEM 2 (b)\nDois.", 2)


class ValidacaoTest(unittest.TestCase):
    def test_traducao_boa_passa_com_virgula_decimal_e_subscrito(self):
        self.assertIsNone(T.validar_traducao(A, A_PT))
        self.assertIsNone(T.validar_traducao(C, C_PT))  # H2O -> H₂O: subscritos normalizados

    def test_numero_alterado_ou_perdido(self):
        self.assertEqual(T.validar_traducao(A, A_PT.replace("3 átomos", "4 átomos")), "numeros_alterados")
        self.assertEqual(T.validar_traducao(B, B_PT.replace("1, 2 e 3", "1 e 2")), "numeros_alterados")
        self.assertEqual(T.validar_traducao(C, C_PT.replace("100", "1000")), "numeros_alterados")

    def test_formula_alterada(self):
        motivo = T.validar_traducao(A, A_PT.replace("C3H6O3", "C3O6H3"))  # mesmos dígitos, fórmula diferente
        self.assertTrue(motivo.startswith("formula_alterada"), motivo)
        self.assertEqual(T.validar_traducao("Sodium chloride (NaCl) dissolves in water at 25 degrees.",
                                            "O cloreto de sódio (sal) se dissolve em água a 25 graus."), "formula_alterada:NaCl")

    def test_siglas_localizadas_e_acentos_nao_sao_falsos_positivos(self):
        self.assertIsNone(T.validar_traducao("Used for chronic obstructive pulmonary disease (COPD) in the US and the EU.",
                                             "Usado na doença pulmonar obstrutiva crônica (DPOC) nos EUA e na UE."))
        self.assertIsNone(T.validar_traducao("A tricyclic orthofused hydrocarbon comprising three fused benzene rings.",
                                             "Um hidrocarboneto tricíclico orto-condensado que compreende três anéis de benzeno fundidos."))

    def test_aqui_esta_na_traducao_de_here_is_nao_e_prefacio(self):
        self.assertIsNone(T.validar_traducao("Here is a platinum wire, a body which does not change by heat.",
                                             "Aqui está um fio de platina, um corpo que não se altera pelo calor."))
        self.assertEqual(T.validar_traducao("A platinum wire is a body which does not change by heat.",
                                            "Aqui está a tradução: um fio de platina é um corpo que não se altera pelo calor."), "prefacio")

    def test_marcacao_prefacio_ingles_e_tamanho(self):
        self.assertEqual(T.validar_traducao("Text <i>E. coli</i> grows fast in the gut of humans.", "Texto E. coli cresce rápido."),
                         "marcacao_alterada")
        self.assertEqual(T.validar_traducao(B, "Aqui está a tradução:\n" + B_PT), "prefacio")
        self.assertEqual(T.validar_traducao(B, B), "igual_ao_original")
        self.assertEqual(T.validar_traducao(B, "A triol of the propane that is substituted by the groups with the hydroxy of the positions 1, 2 and 3."),
                         "ainda_em_ingles")
        self.assertTrue(T.validar_traducao("A triol, an alcohol with three hydroxy groups, as described in many books.",
                                           "Um triol.").startswith("tamanho"))
        self.assertEqual(T.validar_traducao(B, ""), "vazia")

    def test_titulo_exige_mesmos_numerais_romanos_e_uma_linha(self):
        self.assertIsNone(T.validar_traducao("Lecture II: A Candle", "Conferência II: Uma vela", "titulo"))
        self.assertEqual(T.validar_traducao("Lecture II: A Candle", "Conferência III: Uma vela", "titulo"), "numeral_romano_alterado")
        self.assertEqual(T.validar_traducao("Lecture II: A Candle", "Conferência II:\nUma vela", "titulo"), "titulo_com_quebra")


class MontarLotesTest(unittest.TestCase):
    def test_tamanho_caracteres_e_fonte(self):
        its = [T.Item(f"c-{i}", "chebi", "t", "x" * 100) for i in range(7)] + [T.Item("g-1", "gutenberg-14474", "t", "y" * 100)]
        lotes = T.montar_lotes(its, tamanho=3, max_chars=10_000)
        self.assertEqual([len(b) for b in lotes], [3, 3, 1, 1])
        self.assertEqual(lotes[-1][0].fonte, "gutenberg-14474")
        lotes = T.montar_lotes(its[:7], tamanho=10, max_chars=250)
        self.assertEqual([len(b) for b in lotes], [2, 2, 2, 1])


class TraduzirLoteTest(unittest.TestCase):
    def itens(self, *textos):
        return [T.Item(f"chebi-{k}", "chebi", "t", t) for k, t in enumerate(textos, 1)]

    def test_lote_ok_uma_chamada(self):
        chamadas = []

        def chamar(prompt):
            chamadas.append(prompt)
            return tradutor_ok(prompt)
        ok, desc = T.traduzir_lote(self.itens(A, B, C), chamar)
        self.assertEqual(len(chamadas), 1)
        self.assertEqual([t for _, t, _ in ok], [A_PT, B_PT, C_PT])
        self.assertEqual(desc, [])
        self.assertIn("### ITEM 3 (chebi-3)", chamadas[0])

    def test_numero_de_itens_que_nao_bate_refaz_cada_item_sozinho(self):
        chamadas = []

        def chamar(prompt):
            chamadas.append(prompt)
            its = itens_do_prompt(prompt)
            if len(its) == 3:  # o lote volta com um item a menos
                return resposta([(n, i, TRADUCOES[t]) for n, i, t in its[:2]]), "m/x"
            return tradutor_ok(prompt)
        ok, desc = T.traduzir_lote(self.itens(A, B, C), chamar)
        self.assertEqual(len(chamadas), 1 + 3)
        self.assertEqual(len(ok), 3)
        self.assertEqual(desc, [])

    def test_numero_alterado_no_lote_e_refeito_sozinho_e_depois_descartado(self):
        def chamar(prompt):
            its = itens_do_prompt(prompt)
            saida = []
            for n, i, t in its:
                trad = TRADUCOES[t]
                if t == B:
                    trad = trad.replace("1, 2 e 3", "1, 2 e 4")  # sempre erra o número
                saida.append((n, i, trad))
            return resposta(saida), "m/x"
        ok, desc = T.traduzir_lote(self.itens(A, B, C), chamar)
        self.assertEqual([it.texto for it, _, _ in ok], [A, C])
        self.assertEqual(len(desc), 1)
        self.assertEqual(desc[0]["id"], "chebi-2")
        self.assertEqual(desc[0]["motivo"], "numeros_alterados")
        self.assertEqual(desc[0]["hash"], T.hash_texto(B))
        self.assertIn("1, 2 e 4", desc[0]["resposta"])

    def test_erro_transitorio_do_item_no_lote_some_na_segunda_tentativa(self):
        estado = {"n": 0}

        def chamar(prompt):
            its = itens_do_prompt(prompt)
            estado["n"] += 1
            if estado["n"] == 1:  # lote: devolve o item B com número errado
                return resposta([(n, i, TRADUCOES[t].replace("3 átomos", "9 átomos") if t == A else TRADUCOES[t]) for n, i, t in its]), "m/x"
            return tradutor_ok(prompt)
        ok, desc = T.traduzir_lote(self.itens(A, B), chamar)
        self.assertEqual(len(ok), 2)
        self.assertEqual(desc, [])

    def test_erro_do_kilo_vira_descarte_e_cota_sobe(self):
        def quebrado(prompt):
            raise T.ErroKilo("timeout")
        ok, desc = T.traduzir_lote(self.itens(A, B), quebrado)
        self.assertEqual(ok, [])
        self.assertEqual({d["id"] for d in desc}, {"chebi-1", "chebi-2"})
        self.assertTrue(desc[0]["motivo"].startswith("erro_kilo"))

        def sem_cota(prompt):
            raise T.CotaEsgotada("acabou")
        with self.assertRaises(T.CotaEsgotada):
            T.traduzir_lote(self.itens(A, B), sem_cota)


class ChamadorTest(unittest.TestCase):
    def test_cota_do_primeiro_modelo_passa_para_o_proximo(self):
        usados = []

        def um(prompt, modelo):
            usados.append(modelo)
            if modelo == "a/m1":
                raise T.ErroKilo("rate limit exceeded 429", cota=True)
            return "ok"
        with mock.patch.object(T.time, "sleep"):
            c = T.Chamador(["a/m1", "b/m2"], um, espera_cota=0, log=lambda *_: None)
            self.assertEqual(c("p"), ("ok", "b/m2"))
            self.assertIn("a/m1", c.fora)
            self.assertEqual(c("q"), ("ok", "b/m2"))
            self.assertEqual(usados.count("a/m1"), 3)  # só tentou o primeiro enquanto ele estava ativo

    def test_todos_sem_cota_levanta_cota_esgotada(self):
        def um(prompt, modelo):
            raise T.ErroKilo("insufficient quota", cota=True)
        with mock.patch.object(T.time, "sleep"):
            c = T.Chamador(["a/m1", "b/m2"], um, espera_cota=0, log=lambda *_: None)
            with self.assertRaises(T.CotaEsgotada):
                c("p")

    def test_falha_isolada_nao_tira_o_modelo(self):
        estado = {"n": 0}

        def um(prompt, modelo):
            estado["n"] += 1
            if estado["n"] <= 2:
                raise T.ErroKilo("tempo esgotado")
            return "ok"
        with mock.patch.object(T.time, "sleep"):
            c = T.Chamador(["a/m1", "b/m2"], um, log=lambda *_: None)
            texto, modelo = c("p")
        self.assertEqual((texto, modelo), ("ok", "b/m2"))  # a/m1 falhou 2x neste prompt; usou a reserva só para ele
        self.assertEqual(c.fora, {})


class SaidaKiloTest(unittest.TestCase):
    def ev(self, tipo, **kw):
        return json.dumps({"type": tipo, **kw})

    def test_texto(self):
        out = "\n".join([self.ev("step_start"), self.ev("text", part={"text": "Olá "}), self.ev("text", part={"text": "mundo"}),
                         self.ev("step_finish")])
        self.assertEqual(T.interpretar_saida_kilo(out), "Olá mundo")

    def test_erro_de_cota(self):
        out = self.ev("error", error={"name": "APIError", "data": {"message": "Rate limit exceeded (429)"}})
        with self.assertRaises(T.ErroKilo) as cm:
            T.interpretar_saida_kilo(out)
        self.assertTrue(cm.exception.cota)

    def test_sem_texto_nem_erro(self):
        with self.assertRaises(T.ErroKilo) as cm:
            T.interpretar_saida_kilo("", "algo quebrou", 1)
        self.assertFalse(cm.exception.cota)


class RespostaServidorTest(unittest.TestCase):
    def test_texto_ignora_raciocinio(self):
        msg = {"info": {"role": "assistant"}, "parts": [{"type": "step-start"}, {"type": "reasoning", "text": "pensando"},
                                                          {"type": "text", "text": "Um naftol."}]}
        self.assertEqual(T.interpretar_resposta_servidor(msg), "Um naftol.")

    def test_erro_de_api_e_cota(self):
        msg = {"info": {"error": {"name": "APIError", "data": {"message": "Rate limit exceeded", "statusCode": 429}}}, "parts": []}
        with self.assertRaises(T.ErroKilo) as cm:
            T.interpretar_resposta_servidor(msg)
        self.assertTrue(cm.exception.cota)

    def test_sem_texto(self):
        with self.assertRaises(T.ErroKilo) as cm:
            T.interpretar_resposta_servidor({"info": {}, "parts": [{"type": "reasoning", "text": "x"}]})
        self.assertFalse(cm.exception.cota)


class CacheEExecucaoTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self.tmp.name)
        self.dados = self.raiz / "dados"
        self.saida = self.raiz / "saida"
        escrever_pacote(self.dados, {"chebi": [("Ácido láctico", A), ("Glicerol", B)], "gutenberg-14474": [("Lecture II: A Candle", C)]})
        self.log = lambda *_: None

    def tearDown(self):
        self.tmp.cleanup()

    def test_carregar_pendentes_so_pega_pendente_em_ingles(self):
        its = T.carregar_pendentes(self.dados, ["chebi", "gutenberg-14474"])
        self.assertEqual([i.id for i in its], ["chebi-001", "chebi-002", "gutenberg-14474-001"])
        self.assertEqual(its[0].hash, T.hash_texto(A))

    def chamador(self, contador):
        def chamar(prompt):
            contador.append(prompt)
            its = itens_do_prompt(prompt)
            saida = []
            for n, i, t in its:
                saida.append((n, i, TRADUCOES.get(t, "Conferência II: Uma vela" if t == "Lecture II: A Candle" else t)))
            return resposta(saida), "alibaba-token-plan/qwen3.8-max"
        return chamar

    def test_execucao_grava_formato_e_depois_usa_cache_por_hash(self):
        its = T.carregar_pendentes(self.dados, ["chebi", "gutenberg-14474"])
        chamadas = []
        r1 = T.executar(its, self.saida, self.chamador(chamadas), "2026-10-16", lote=8, paralelo=1, log=self.log)
        self.assertEqual((r1["traduzidos"], r1["descartados"], r1["pendentesNoFim"]), (3, 0, 0))
        linhas = [json.loads(l) for l in (self.saida / "chebi.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertEqual([l["id"] for l in linhas], ["chebi-001", "chebi-002"])
        self.assertEqual(list(linhas[0]), ["id", "hash", "titulo", "texto", "idiomaOrigem", "modelo", "data", "traducao"])
        self.assertEqual(linhas[0]["hash"], T.hash_texto(A))
        self.assertEqual(linhas[0]["titulo"], "Ácido láctico")        # ChEBI mantém o título (já é pt)
        self.assertEqual(linhas[0]["texto"], A_PT)
        self.assertEqual((linhas[0]["idiomaOrigem"], linhas[0]["modelo"], linhas[0]["data"], linhas[0]["traducao"]),
                         ("en", "qwen3.8-max", "2026-10-16", "automatica"))
        gut = json.loads((self.saida / "gutenberg-14474.jsonl").read_text(encoding="utf-8").splitlines()[0])
        self.assertEqual(gut["titulo"], "Conferência II: Uma vela")    # Gutenberg traduz o título
        # segunda execução: tudo em cache, nenhuma chamada
        n = len(chamadas)
        r2 = T.executar(its, self.saida, self.chamador(chamadas), "2026-10-16", paralelo=1, log=self.log)
        self.assertEqual(len(chamadas), n)
        self.assertEqual((r2["emCache"], r2["traduzidos"]), (3, 0))

    def test_texto_alterado_no_pacote_e_traduzido_de_novo_so_ele(self):
        its = T.carregar_pendentes(self.dados, ["chebi"])
        T.executar(its, self.saida, self.chamador([]), "2026-10-16", paralelo=1, log=self.log)
        novos = [T.Item(its[0].id, "chebi", "Ácido láctico", C), its[1]]  # o primeiro texto mudou (hash novo)
        chamadas = []
        r = T.executar(novos, self.saida, self.chamador(chamadas), "2026-10-16", paralelo=1, log=self.log)
        self.assertEqual((r["emCache"], r["traduzidos"]), (1, 1))
        self.assertEqual(len(chamadas), 1)
        self.assertIn(C, chamadas[0])
        self.assertNotIn(B, chamadas[0])
        linhas = [json.loads(l) for l in (self.saida / "chebi.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertEqual(len(linhas), 2)  # compactado: sem duplicata do id
        self.assertEqual(linhas[0]["hash"], T.hash_texto(C))

    def test_mesmo_texto_com_outro_id_reaproveita_a_traducao(self):
        its = T.carregar_pendentes(self.dados, ["chebi"])
        T.executar(its, self.saida, self.chamador([]), "2026-10-16", paralelo=1, log=self.log)
        copia = T.Item("chebi-999", "chebi", "Outro", A)
        chamadas = []
        r = T.executar(its + [copia], self.saida, self.chamador(chamadas), "2026-10-16", paralelo=1, log=self.log)
        self.assertEqual((r["reaproveitados"], len(chamadas)), (1, 0))
        reg = {json.loads(l)["id"]: json.loads(l) for l in (self.saida / "chebi.jsonl").read_text(encoding="utf-8").splitlines()}
        self.assertEqual(reg["chebi-999"]["texto"], A_PT)
        self.assertEqual(reg["chebi-999"]["titulo"], "Outro")

    def test_descarte_fica_pendente_e_e_registrado(self):
        def ruim(prompt):
            its = itens_do_prompt(prompt)
            return resposta([(n, i, TRADUCOES[t].replace("3 átomos", "5 átomos") if t == A else TRADUCOES[t]) for n, i, t in its]), "m/x"
        its = T.carregar_pendentes(self.dados, ["chebi"])
        r = T.executar(its, self.saida, ruim, "2026-10-16", paralelo=1, log=self.log)
        self.assertEqual((r["traduzidos"], r["descartados"], r["pendentesNoFim"]), (1, 1, 1))
        self.assertEqual(r["descartesPorMotivo"], {"numeros_alterados": 1})
        desc = [json.loads(l) for l in (self.saida / "descartes.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertEqual(desc[0]["id"], "chebi-001")
        self.assertEqual(desc[0]["tipo"], "texto")
        ids = [json.loads(l)["id"] for l in (self.saida / "chebi.jsonl").read_text(encoding="utf-8").splitlines()]
        self.assertEqual(ids, ["chebi-002"])

    def test_cota_esgotada_para_salva_o_que_fez_e_conta_o_resto(self):
        estado = {"n": 0}

        def chamar(prompt):
            estado["n"] += 1
            if estado["n"] > 1:
                raise T.CotaEsgotada("acabou")
            return tradutor_ok(prompt)
        its = [T.Item(f"chebi-{k}", "chebi", "t", t) for k, t in enumerate([A, B, C, A + " ", B + " "], 1)]
        TRADUCOES[A + " "], TRADUCOES[B + " "] = A_PT + " ", B_PT + " "
        try:
            r = T.executar(its, self.saida, chamar, "2026-10-16", lote=2, paralelo=1, log=self.log)
        finally:
            TRADUCOES.pop(A + " "), TRADUCOES.pop(B + " ")
        self.assertTrue(r["cotaEsgotada"])
        self.assertEqual(r["traduzidos"], 2)
        self.assertEqual(r["pendentesNoFim"], 3)
        self.assertEqual(len(T.ler_jsonl(self.saida / "chebi.jsonl")), 2)

    def test_limite_e_linha_cortada_no_jsonl(self):
        its = T.carregar_pendentes(self.dados, ["chebi"])
        (self.saida).mkdir()
        (self.saida / "chebi.jsonl").write_text('{"id": "x", "hash": "h", "texto": "t"}\n{"id": "cortada', encoding="utf-8")
        r = T.executar(its, self.saida, self.chamador([]), "2026-10-16", limite=1, paralelo=1, log=self.log)
        self.assertEqual((r["traduzidos"], r["naoTentados"]), (1, 1))

    def test_prompt_leva_so_o_texto_e_as_regras(self):
        p = T.montar_prompt([T.Item("chebi-1", "chebi", "t", A)], T.FONTES["chebi"]["contexto"])
        self.assertIn(A, p)
        self.assertIn("### ITEM 1 (chebi-1)", p)
        for proibido in ("secrets", "apps/quimica", "C:\\", "token", "api_key"):
            self.assertNotIn(proibido, p)


if __name__ == "__main__":
    unittest.main()
