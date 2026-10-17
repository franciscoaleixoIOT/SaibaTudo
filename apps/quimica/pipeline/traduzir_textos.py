# -*- coding: utf-8 -*-
"""
Tradução para o português do Brasil dos textos em inglês do pacote (`traducao: "pendente"`: ChEBI e Faraday/Gutenberg)
com a CLI **kilo** (modelo Qwen3.8 Max do plano de tokens; reservas GLM-5.3 e DeepSeek V4 Pro).

Entrada : `data/quimica/textos/<fonte>/lote-*.json` (o pacote gerado; não é alterado).
Saída   : `pipeline/traducoes/<fonte>.jsonl`, uma linha por texto, em ordem de `id`:
          {"id", "hash" (sha256 do `textoOriginal`), "titulo", "texto", "idiomaOrigem": "en", "modelo", "data",
           "traducao": "automatica"}
          Auxiliares (todos em `pipeline/traducoes/`): `titulos.jsonl` (títulos de seção traduzidos uma vez cada; ChEBI mantém o
          título, que já é o nome em português do Wikidata), `descartes.jsonl` (traduções rejeitadas, com o motivo e a resposta do
          modelo, para auditoria) e `execucoes.jsonl` (uma linha por execução: contagens, tempo, falhas).

Reexecutável e retomável: o cache é por hash do texto original (um texto cujo hash já está no arquivo não é enviado de novo; se o
texto mudou no pacote, o hash muda e ele é traduzido outra vez). Cada tradução válida é gravada na hora; ao fim o arquivo é
reescrito ordenado e sem duplicatas.

Garantias (rejeita e registra em `descartes.jsonl`, o texto continua pendente):
- o lote devolvido tem de ter exatamente os mesmos itens (marcadores `### ITEM n`); se não bate, cada item é refeito sozinho;
- os números (sequências de dígitos, com subscritos/sobrescritos normalizados) são os mesmos do original, na mesma contagem;
- toda fórmula/símbolo do original (H2O, NaCl, C12H12N2O3...) aparece na tradução; as marcações HTML são as mesmas;
- a resposta não pode ter ficado em inglês, igual ao original, vazia, curta ou longa demais.

O texto original é conteúdo de terceiros (ChEBI CC BY 4.0; Gutenberg, domínio público): o prompt leva só ele e as regras de
tradução (nada de segredos nem de código do projeto). O kilo roda numa pasta temporária vazia, fora do repositório, por um
`kilo serve` local (127.0.0.1, porta livre, senha aleatória, agente `ask`, uma sessão por chamada, apagada depois); `--por-processo`
usa um `kilo run` por chamada (~10 s de partida cada). Medido em 16/10/2026: 6 chamadas em paralelo ~8 s por lote de 8 definições.

Uso (de dentro de apps/quimica):
    python pipeline/traduzir_textos.py                 # tudo o que falta, 4 chamadas em paralelo
    python pipeline/traduzir_textos.py --contar        # só mostra quantos faltam
    python pipeline/traduzir_textos.py --fonte chebi --limite 20 --paralelo 1
Se a cota do kilo acabar em todos os modelos, a execução para, salva o que já foi feito e diz quantos ficaram.
"""
import argparse
import base64
import collections
import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent  # apps/quimica
DADOS = RAIZ / "data" / "quimica"
SAIDA = Path(__file__).resolve().parent / "traducoes"

MODELOS = [
    "alibaba-token-plan/qwen3.8-max",
    "bailian-token-plan-personal/qwen3.8-max",  # mesmo modelo, outro plano (outra cota)
    "alibaba-token-plan/glm-5.3",
    "alibaba-token-plan/deepseek-v4-pro-0813",
]
LOTE_PADRAO = 8          # itens por chamada
MAX_CHARS_LOTE = 5000    # e no máximo isto de texto original por chamada (Faraday: ~5 itens)
PARALELO_PADRAO = 4
TIMEOUT_CHAMADA = 420    # segundos
FALHAS_PARA_TROCAR = 6   # falhas seguidas (não de cota) de um modelo até deixá-lo de lado

# Fontes traduzidas. `titulo`: "manter" (o título do ChEBI já é o nome do composto em português, vindo do Wikidata) ou "traduzir".
FONTES = {
    "chebi": {"titulo": "manter", "contexto": "definições de compostos do ChEBI (EMBL-EBI): frases curtas de nomenclatura química."},
    "gutenberg-14474": {"titulo": "traduzir",
                        "contexto": "trechos de 'The Chemical History of a Candle' (Michael Faraday, conferências de 1861 na Royal Institution "
                                    "para um público jovem); mantenha a voz oral e clara do conferencista; medidas e unidades antigas "
                                    "(grains, polegadas, libras, graus Fahrenheit) ficam como no original. O título do livro, 'The Chemical History of a "
                                    "Candle', é 'A História Química de uma Vela'."},
}

_SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹", "01234567890123456789")
_NUM_RE = re.compile(r"[0-9]+")
_FORMULA_RE = re.compile(r"(?<![A-Za-z0-9])(?:[A-Z][a-z]?[0-9]*){2,}(?![A-Za-z0-9])|(?<![A-Za-z0-9])[A-Z][a-z]?[0-9]+(?![A-Za-z0-9])")
_TAG_RE = re.compile(r"</?[A-Za-z][^<>]*>")
_ROMANO_RE = re.compile(r"(?<![A-Za-z])[IVXL]+(?![A-Za-z])")
_MARCADOR_RE = re.compile(r"^[ \t]*#{2,4}[ \t]*ITEM[ \t]+(\d+)\b[^\n]*$", re.M | re.I)
_EN_STOP = {"the", "of", "and", "is", "that", "which", "with", "by", "are", "was", "were", "from", "this", "these", "has", "have",
            "been", "into", "their", "its", "it", "an", "at", "not", "but"}  # só palavras que não existem em português
_PREFACIO_RE = re.compile(r"^\s*(aqui est[aá]|segue|claro|tradu[cç][aã]o\s*:|translation\s*:|here is|certo)", re.I)
_ORIGEM_PREFACIO_RE = re.compile(r"\s*(here|follow|of course|clear|certain|sure|right|translation)", re.I)
_COTA_RE = re.compile(r"quota|rate.?limit|429|insufficient|exceed|limit reached|credit|balance|billing|too many requests|"
                      r"usage limit|capacity|overloaded|esgot", re.I)


class ErroKilo(Exception):
    def __init__(self, msg, cota=False):
        super().__init__(msg)
        self.cota = cota


class CotaEsgotada(Exception):
    pass


class LoteInvalido(Exception):
    pass


class Item:
    __slots__ = ("id", "fonte", "titulo", "texto", "hash")

    def __init__(self, id, fonte, titulo, texto):
        self.id, self.fonte, self.titulo, self.texto = id, fonte, titulo, texto
        self.hash = hash_texto(texto)

    def __repr__(self):
        return f"Item({self.id!r})"


def hash_texto(txt):
    return hashlib.sha256(txt.encode("utf-8")).hexdigest()


# ----------------------------------------------------------------------------------------------------------------------
# Entrada e cache
# ----------------------------------------------------------------------------------------------------------------------
def carregar_pendentes(dados, fontes):
    """Itens `traducao == "pendente"` e `idioma == "en"` de `dados/textos/<fonte>/lote-*.json`, ordenados por id."""
    itens = []
    for fonte in fontes:
        pasta = Path(dados) / "textos" / fonte
        for arq in sorted(pasta.glob("lote-*.json")):
            conteudo = json.loads(arq.read_text(encoding="utf-8"))
            if isinstance(conteudo, dict):
                conteudo = [conteudo]
            for t in conteudo:
                if t.get("traducao") == "pendente" and t.get("idioma") == "en" and t.get("textoOriginal"):
                    itens.append(Item(t["id"], fonte, t.get("titulo") or t.get("secao") or "", t["textoOriginal"]))
    itens.sort(key=lambda i: (i.fonte, i.id))
    return itens


def ler_jsonl(caminho):
    caminho = Path(caminho)
    if not caminho.exists():
        return []
    out = []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha:
            continue
        try:
            out.append(json.loads(linha))
        except ValueError:  # linha cortada por uma execução interrompida
            continue
    return out


def _linha(reg):
    return json.dumps(reg, ensure_ascii=False, separators=(", ", ": ")) + "\n"


def gravar_jsonl(caminho, registros):
    """Reescreve o arquivo inteiro de forma atômica."""
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    tmp = caminho.with_suffix(caminho.suffix + ".tmp")
    tmp.write_text("".join(_linha(r) for r in registros), encoding="utf-8", newline="\n")
    os.replace(tmp, caminho)


def anexar_jsonl(caminho, reg):
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "a", encoding="utf-8", newline="\n") as f:
        f.write(_linha(reg))


class Cache:
    """Traduções já feitas de uma fonte. Chave: id (com hash igual ao do texto atual) ou, de reserva, só o hash."""

    def __init__(self, caminho):
        self.caminho = Path(caminho)
        self.por_id = {}
        for r in ler_jsonl(self.caminho):
            if r.get("id") and r.get("hash") and r.get("texto"):
                self.por_id[r["id"]] = r  # a última linha vale

    def por_hash(self):
        return {r["hash"]: r for r in self.por_id.values()}

    def tem(self, item):
        r = self.por_id.get(item.id)
        return bool(r and r["hash"] == item.hash)

    def gravar(self, reg):
        self.por_id[reg["id"]] = reg
        anexar_jsonl(self.caminho, reg)

    def compactar(self):
        gravar_jsonl(self.caminho, [self.por_id[k] for k in sorted(self.por_id)])


# ----------------------------------------------------------------------------------------------------------------------
# Prompt, resposta e validação
# ----------------------------------------------------------------------------------------------------------------------
REGRAS = """Você é um tradutor técnico de química, do inglês para o português do Brasil, para um app educacional.
Traduza cada ITEM abaixo em registro didático e claro, com a terminologia usada nos livros de química brasileiros.

Regras:
- Preserve exatamente todos os números, unidades, fórmulas (H2O, C12H12N2O3), símbolos de elementos, SMILES, códigos e locantes
  (1H, 2R, N-, 3,4-). Não converta unidades nem arredonde.
- Nomes sistemáticos (IUPAC) sem nome consagrado em português: mantenha a estrutura e os números e adapte só a terminação
  à grafia portuguesa (-yl -> -ila, -one -> -ona, -amine -> -amina, -acid -> ácido). Use o nome consagrado quando existir.
- Termos: hydroxy -> hidroxi; hydroxy group -> grupo hidroxila; substituted -> substituído; conjugate base -> base conjugada;
  "a member of the class of X" -> "um membro da classe dos X"; "is a" -> "é um/uma"; oxoacid -> oxiácido; zwitterion -> zwitteríon.
- Preserve a marcação Markdown/HTML e as quebras de linha que existirem.
- Não acrescente, não omita e não explique nada; não corrija o original; não comente a tradução.
- Não traduza nomes próprios de pessoas, instituições, obras e fontes (Faraday, Royal Institution, ChEBI, PubChem) nem nomes de
  espécies (E. coli, Klebsiella).
- {contexto}

Formato: cada ITEM começa por uma linha "### ITEM n (id)". Responda com os mesmos itens, na mesma ordem, cada um começando exatamente
pela mesma linha "### ITEM n (id)" e seguida só da tradução do texto. Nada antes do primeiro item e nada depois do último.
"""


def montar_prompt(itens, contexto="", rotulo="texto"):
    cabecalho = REGRAS.format(contexto=contexto or "Textos de química.")
    if rotulo == "titulo":
        cabecalho += "\nOs ITENS são títulos de capítulos (uma linha cada): traduza cada um em uma única linha, mantendo a pontuação e os numerais romanos.\n"
    corpo = "".join(f"\n### ITEM {n} ({it.id})\n{it.texto}\n" for n, it in enumerate(itens, 1))
    return cabecalho + "\n" + corpo


def parse_lote(resposta, n):
    """Resposta -> lista de n traduções (na ordem). `LoteInvalido` se faltar, sobrar, repetir ou vier fora de ordem."""
    resposta = (resposta or "").strip()
    resposta = re.sub(r"^```[a-zA-Z]*\s*\n", "", resposta)
    resposta = re.sub(r"\n```\s*$", "", resposta)
    marcas = list(_MARCADOR_RE.finditer(resposta))
    numeros = [int(m.group(1)) for m in marcas]
    if numeros != list(range(1, n + 1)):
        raise LoteInvalido(f"esperados {n} itens ({list(range(1, n + 1))}), vieram os marcadores {numeros}")
    partes = []
    for i, m in enumerate(marcas):
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(resposta)
        txt = resposta[m.end():fim].strip()
        if not txt:
            raise LoteInvalido(f"item {i + 1} vazio")
        partes.append(txt)
    return partes


def _norm(txt):
    return txt.translate(_SUB)


def _formulas(txt):
    """Fórmulas/símbolos: tokens com dígito (H2O, C12H12N2O3, 1H) ou de capitalização mista (NaCl, HCl). Siglas só em maiúsculas
    (COPD -> DPOC, US -> EUA, LPG -> GLP) não entram: a sigla muda de forma ao traduzir e seus dígitos já estão na checagem de números."""
    return [m for m in _FORMULA_RE.findall(txt) if re.search(r"[0-9]", m) or re.search(r"[a-z]", m)]


def validar_traducao(orig, trad, tipo="texto"):
    """None se a tradução passa; senão o motivo (string curta)."""
    if not trad or not trad.strip():
        return "vazia"
    m = _PREFACIO_RE.match(trad)
    if m and not _ORIGEM_PREFACIO_RE.match(orig):  # "Here is a platinum wire" -> "Aqui está um fio de platina" é tradução, não prefácio
        return "prefacio"
    if "### ITEM" in trad:
        return "marcador_no_texto"
    o, t = _norm(orig), _norm(trad)
    if collections.Counter(_NUM_RE.findall(o)) != collections.Counter(_NUM_RE.findall(t)):
        return "numeros_alterados"
    if tipo != "titulo":  # em título, "II" seria lido como fórmula; os numerais romanos têm checagem própria
        ausentes = set(_formulas(o)) - set(_formulas(t))
        if ausentes:
            return "formula_alterada:" + ",".join(sorted(ausentes))
    if _TAG_RE.findall(orig) != _TAG_RE.findall(trad):
        return "marcacao_alterada"
    if tipo == "titulo":
        if collections.Counter(_ROMANO_RE.findall(orig)) != collections.Counter(_ROMANO_RE.findall(trad)):
            return "numeral_romano_alterado"
        if "\n" in trad.strip():
            return "titulo_com_quebra"
    razao = len(trad) / max(1, len(orig))
    if len(orig) >= 40 and not 0.5 <= razao <= 2.2:
        return f"tamanho({razao:.2f})"
    if len(orig) >= 40 and trad.strip() == orig.strip():
        return "igual_ao_original"
    palavras = re.findall(r"[^\W\d_]+", trad.lower())
    if len(palavras) >= 6 and sum(p in _EN_STOP for p in palavras) / len(palavras) > 0.12:
        return "ainda_em_ingles"
    return None


# ----------------------------------------------------------------------------------------------------------------------
# kilo
# ----------------------------------------------------------------------------------------------------------------------
def localizar_kilo():
    """Comando do kilo sem passar pelo cmd.exe (o shim .cmd quebraria quebras de linha, aspas e & do prompt)."""
    env = os.environ.get("KILO_EXE")
    if env:
        return [env]
    achado = shutil.which("kilo")
    if not achado:
        raise FileNotFoundError("CLI kilo não encontrada no PATH (defina KILO_EXE)")
    p = Path(achado)
    if os.name == "nt" and p.suffix.lower() in {".cmd", ".bat", ".ps1", ""}:
        base = p.parent / "node_modules" / "@kilocode" / "cli"
        for pacote in ("cli-windows-x64", "cli-windows-x64-baseline"):
            exe = base / "node_modules" / "@kilocode" / pacote / "bin" / "kilo.exe"
            if exe.exists():
                return [str(exe)]
        script, node = base / "bin" / "kilo", shutil.which("node")
        if script.exists() and node:
            return [node, str(script)]
    return [achado]


def interpretar_saida_kilo(stdout, stderr="", codigo=0):
    """Eventos `--format json` -> texto da resposta. `ErroKilo` (com `cota` quando parece limite de uso) se não houver texto."""
    textos, erros = [], []
    for linha in (stdout or "").splitlines():
        linha = linha.strip()
        if not linha.startswith("{"):
            continue
        try:
            ev = json.loads(linha)
        except ValueError:
            continue
        if ev.get("type") == "text":
            textos.append((ev.get("part") or {}).get("text") or "")
        elif ev.get("type") == "error":
            e = ev.get("error")
            erros.append(json.dumps(e, ensure_ascii=False) if not isinstance(e, str) else e)
    texto = "".join(textos).strip()
    if texto and not erros:
        return texto
    detalhe = " | ".join(erros) or (stderr or "").strip()[-400:] or f"sem texto (código {codigo})"
    raise ErroKilo(detalhe[:600], cota=bool(_COTA_RE.search(detalhe)))


def chamar_kilo(prompt, modelo, comando=None, cwd=None, timeout=TIMEOUT_CHAMADA):
    comando = comando or localizar_kilo()
    cwd = cwd or str(Path(tempfile.gettempdir()) / "saibatudo_traduzir_kilo")
    Path(cwd).mkdir(parents=True, exist_ok=True)
    try:
        r = subprocess.run(comando + ["run", "-m", modelo, "--format", "json", prompt], capture_output=True, text=True,
                           encoding="utf-8", errors="replace", cwd=cwd, timeout=timeout, stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        raise ErroKilo(f"tempo esgotado ({timeout}s)")
    return interpretar_saida_kilo(r.stdout, r.stderr, r.returncode)


def interpretar_resposta_servidor(msg):
    """Resposta de `POST /session/<id>/message` do `kilo serve` -> texto. `ErroKilo` (com `cota` quando parece limite) se vier erro."""
    info = (msg or {}).get("info") or {}
    texto = "".join(p.get("text") or "" for p in (msg or {}).get("parts") or [] if p.get("type") == "text").strip()
    erro = info.get("error")
    if erro or not texto:
        detalhe = json.dumps(erro, ensure_ascii=False) if erro else "resposta sem texto"
        raise ErroKilo(detalhe[:600], cota=bool(_COTA_RE.search(detalhe)))
    return texto


class ServidorKilo:
    """`kilo serve` local (127.0.0.1, porta livre, senha aleatória só no ambiente do processo filho): uma única instância atende
    todas as chamadas, sem pagar a partida do `kilo run` (~10 s de CPU e 1 GB por chamada). Cada tradução usa uma sessão nova,
    apagada depois, com o agente `ask` (sem edição de arquivos)."""

    def __init__(self, comando=None, cwd=None, log=print):
        self.comando = comando or localizar_kilo()
        self.cwd = cwd or str(Path(tempfile.gettempdir()) / "saibatudo_traduzir_kilo")
        self.senha = secrets.token_hex(16)
        self.proc = None
        self.url = None
        self.log = log

    def __enter__(self):
        self.iniciar()
        return self

    def __exit__(self, *exc):
        self.parar()

    def iniciar(self, espera=120):
        Path(self.cwd).mkdir(parents=True, exist_ok=True)
        with socket.socket() as sk:
            sk.bind(("127.0.0.1", 0))
            porta = sk.getsockname()[1]
        self.url = f"http://127.0.0.1:{porta}"
        env = {**os.environ, "KILO_SERVER_PASSWORD": self.senha}
        self.proc = subprocess.Popen(self.comando + ["serve", "--port", str(porta), "--pure"], cwd=self.cwd, env=env,
                                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        fim = time.time() + espera
        while time.time() < fim:
            if self.proc.poll() is not None:
                raise ErroKilo(f"kilo serve terminou (código {self.proc.returncode})")
            try:
                self._http("GET", "/session", timeout=5)
                self.log(f"kilo serve pronto em {self.url}")
                return
            except ErroKilo:
                time.sleep(1)
        self.parar()
        raise ErroKilo("kilo serve não ficou pronto a tempo")

    def parar(self):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.proc = None

    def _http(self, metodo, caminho, corpo=None, timeout=60):
        cred = base64.b64encode(f"kilo:{self.senha}".encode()).decode()
        req = urllib.request.Request(self.url + caminho, method=metodo, data=None if corpo is None else json.dumps(corpo).encode("utf-8"),
                                     headers={"Authorization": "Basic " + cred, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                bruto = r.read()
        except urllib.error.HTTPError as e:
            detalhe = e.read().decode("utf-8", "replace")[:400]
            raise ErroKilo(f"HTTP {e.code}: {detalhe}", cota=e.code == 429 or bool(_COTA_RE.search(detalhe)))
        except (urllib.error.URLError, OSError) as e:  # inclui tempo esgotado
            raise ErroKilo(f"rede/tempo: {e}")
        return json.loads(bruto) if bruto else None

    def chamar(self, prompt, modelo, timeout=TIMEOUT_CHAMADA):
        provedor, _, modelo_id = modelo.partition("/")
        sessao = self._http("POST", "/session", {"title": "traducao"})["id"]
        try:
            msg = self._http("POST", f"/session/{sessao}/message",
                             {"agent": "ask", "model": {"providerID": provedor, "modelID": modelo_id},
                              "parts": [{"type": "text", "text": prompt}]}, timeout=timeout)
            return interpretar_resposta_servidor(msg)
        finally:
            try:
                self._http("DELETE", f"/session/{sessao}", timeout=15)
            except ErroKilo:
                pass


class Chamador:
    """Chama o kilo com reserva de modelos: cota esgotada -> próximo modelo; falhas seguidas -> próximo modelo.
    `__call__(prompt) -> (texto, modelo)`. `CotaEsgotada` quando não sobrou nenhum modelo."""

    def __init__(self, modelos, chamar_um=chamar_kilo, espera_cota=20, log=print):
        self.modelos = list(modelos)
        self.chamar_um = chamar_um
        self.espera_cota = espera_cota
        self.log = log
        self.fora = {}          # modelo -> motivo
        self.falhas = collections.Counter()
        self.chamadas = collections.Counter()
        self.erros = []
        self.lock = threading.Lock()

    def _ativos(self):
        with self.lock:
            return [m for m in self.modelos if m not in self.fora]

    def _tirar(self, modelo, motivo):
        with self.lock:
            if modelo not in self.fora:
                self.fora[modelo] = motivo
                self.log(f"  [modelo fora] {modelo}: {motivo}")

    def __call__(self, prompt):
        ultimo_erro = None
        for modelo in self._ativos():
            tentativas_cota = 0
            tentativa = 0
            while tentativa < 2:
                tentativa += 1
                with self.lock:
                    self.chamadas[modelo] += 1
                try:
                    texto = self.chamar_um(prompt, modelo)
                    with self.lock:
                        self.falhas[modelo] = 0
                    return texto, modelo
                except ErroKilo as e:
                    ultimo_erro = e
                    with self.lock:
                        self.erros.append((modelo, str(e)[:200]))
                    if e.cota:
                        tentativas_cota += 1
                        if tentativas_cota >= 3:
                            self._tirar(modelo, "cota/limite: " + str(e)[:120])
                            break
                        tentativa -= 1  # espera e tenta de novo (limite temporário de taxa)
                        time.sleep(self.espera_cota * tentativas_cota)
                        continue
                    with self.lock:
                        self.falhas[modelo] += 1
                        seguidas = self.falhas[modelo]
                    if seguidas >= FALHAS_PARA_TROCAR:
                        self._tirar(modelo, f"{seguidas} falhas seguidas: " + str(e)[:120])
                        break
                    time.sleep(2)
        if not self._ativos():
            raise CotaEsgotada("nenhum modelo disponível: " + "; ".join(f"{m}: {v}" for m, v in self.fora.items()))
        raise ultimo_erro or ErroKilo("falha na chamada")


# ----------------------------------------------------------------------------------------------------------------------
# Tradução de lotes
# ----------------------------------------------------------------------------------------------------------------------
def nome_modelo(modelo):
    return modelo.split("/", 1)[-1]


def _uma(itens, chamar, contexto, rotulo, ultimo):
    """Uma chamada para `itens` -> lista de (traducao|None, motivo|None) por item. `ultimo` guarda a resposta crua."""
    try:
        resposta, modelo = chamar(montar_prompt(itens, contexto, rotulo))
    except ErroKilo as e:
        return None, None, f"erro_kilo: {str(e)[:160]}"
    ultimo["resposta"] = resposta
    try:
        partes = parse_lote(resposta, len(itens))
    except LoteInvalido as e:
        return None, modelo, f"lote_invalido: {e}"
    return partes, modelo, None


def traduzir_lote(itens, chamar, contexto="", rotulo="texto"):
    """Traduz `itens` (lista de Item) em uma chamada; cai para um item por chamada se o lote voltar torto ou algum item falhar na
    validação. Retorna (ok, descartes): ok = [(item, traducao, modelo)], descartes = [{"id","hash","motivo","resposta",...}].
    `CotaEsgotada` sobe para o chamador."""
    ok, descartes = [], []
    pendentes = list(itens)
    if len(itens) > 1:
        ultimo = {}
        partes, modelo, erro = _uma(itens, chamar, contexto, rotulo, ultimo)
        pendentes = []
        if partes is not None:
            for it, trad in zip(itens, partes):
                motivo = validar_traducao(it.texto, trad, rotulo)
                if motivo is None:
                    ok.append((it, trad, modelo))
                else:
                    pendentes.append(it)
        else:
            pendentes = list(itens)
    for it in pendentes:  # cada um sozinho
        ultimo = {}
        partes, modelo, erro = _uma([it], chamar, contexto, rotulo, ultimo)
        if partes is None:
            descartes.append({"id": it.id, "hash": it.hash, "motivo": erro, "resposta": (ultimo.get("resposta") or "")[:1500]})
            continue
        motivo = validar_traducao(it.texto, partes[0], rotulo)
        if motivo is None:
            ok.append((it, partes[0], modelo))
        else:
            descartes.append({"id": it.id, "hash": it.hash, "motivo": motivo, "modelo": nome_modelo(modelo), "resposta": partes[0][:1500]})
    return ok, descartes


def montar_lotes(itens, tamanho=LOTE_PADRAO, max_chars=MAX_CHARS_LOTE):
    """Agrupa itens consecutivos da mesma fonte: até `tamanho` itens e `max_chars` caracteres de original."""
    lotes, atual, chars = [], [], 0
    for it in itens:
        if atual and (len(atual) >= tamanho or chars + len(it.texto) > max_chars or atual[0].fonte != it.fonte):
            lotes.append(atual)
            atual, chars = [], 0
        atual.append(it)
        chars += len(it.texto)
    if atual:
        lotes.append(atual)
    return lotes


def registro(item, titulo, texto, modelo, data):
    return {"id": item.id, "hash": item.hash, "titulo": titulo, "texto": texto, "idiomaOrigem": "en",
            "modelo": nome_modelo(modelo), "data": data, "traducao": "automatica"}


# ----------------------------------------------------------------------------------------------------------------------
# Execução
# ----------------------------------------------------------------------------------------------------------------------
def traduzir_titulos(itens, saida, chamar, data, contexto, log=print):
    """Traduz os títulos distintos das fontes com `titulo: traduzir` que ainda não estão em `titulos.jsonl`.
    Retorna ({hash do título: tradução}, [títulos sem tradução])."""
    caminho = Path(saida) / "titulos.jsonl"
    feitos = {r["hash"]: r for r in ler_jsonl(caminho) if r.get("hash") and r.get("titulo")}
    distintos = {}
    for it in itens:
        if FONTES.get(it.fonte, {}).get("titulo") == "traduzir" and it.titulo:
            distintos.setdefault(hash_texto(it.titulo), it.titulo)
    faltam = [Item(f"titulo-{i}", "titulos", t, t) for i, (h, t) in enumerate(sorted(distintos.items()), 1) if h not in feitos]
    sem = []
    if faltam:
        ok, desc = traduzir_lote(faltam, chamar, contexto, "titulo")
        for it, trad, modelo in ok:
            reg = {"hash": it.hash, "original": it.texto, "titulo": " ".join(trad.split()), "modelo": nome_modelo(modelo), "data": data}
            feitos[it.hash] = reg
            anexar_jsonl(caminho, reg)
        sem = [d["id"] for d in desc]
        for d in desc:
            anexar_jsonl(Path(saida) / "descartes.jsonl", {**d, "tipo": "titulo", "data": data})
        log(f"  títulos: {len(ok)} traduzidos, {len(desc)} descartados, {len(distintos) - len(faltam)} em cache")
    return {h: r["titulo"] for h, r in feitos.items()}, sem


def titulo_do_item(item, titulos):
    if FONTES.get(item.fonte, {}).get("titulo") == "traduzir":
        return titulos.get(hash_texto(item.titulo))
    return item.titulo


def executar(itens, saida, chamar, data, lote=LOTE_PADRAO, max_chars=MAX_CHARS_LOTE, paralelo=PARALELO_PADRAO, limite=None, log=print):
    """Traduz o que falta. Retorna o resumo (dict). `chamar(prompt) -> (texto, modelo)`."""
    saida = Path(saida)
    t0 = time.time()
    caches = {f: Cache(saida / f"{f}.jsonl") for f in sorted({i.fonte for i in itens})}
    resumo = {"data": data, "total": len(itens), "emCache": 0, "reaproveitados": 0, "traduzidos": 0, "descartados": 0, "naoTentados": 0,
              "chamadasLote": 0, "porFonte": {}, "cotaEsgotada": False, "descartesPorMotivo": {}}
    faltam = []
    for it in itens:
        c = caches[it.fonte]
        if c.tem(it):
            resumo["emCache"] += 1
        else:
            faltam.append(it)
    porh = {f: c.por_hash() for f, c in caches.items()}
    # reaproveitamento por hash (mesmo texto, outro id)
    ainda = []
    titulos, sem_titulo = {}, []
    if any(FONTES.get(i.fonte, {}).get("titulo") == "traduzir" for i in faltam):
        fonte_t = next(i.fonte for i in faltam if FONTES.get(i.fonte, {}).get("titulo") == "traduzir")
        try:
            titulos, sem_titulo = traduzir_titulos(faltam, saida, chamar, data, FONTES[fonte_t]["contexto"], log)
        except CotaEsgotada as e:
            log(f"COTA ESGOTADA nos títulos: {e}")
            resumo["cotaEsgotada"] = True
            titulos = {}
    for it in faltam:
        tit = titulo_do_item(it, titulos)
        if tit is None:
            ainda_sem = True  # título ainda sem tradução: não dá para gravar o registro
        else:
            ainda_sem = False
        r = porh[it.fonte].get(it.hash)
        if r is not None and not ainda_sem:
            caches[it.fonte].gravar({**r, "id": it.id, "titulo": tit})
            resumo["reaproveitados"] += 1
        else:
            ainda.append(it)
    faltam = ainda
    if limite is not None:
        resumo["naoTentados"] += max(0, len(faltam) - limite)
        faltam = faltam[:limite]
    lotes = montar_lotes(faltam, lote, max_chars)
    parar = threading.Event()

    def trabalhar(b):
        if parar.is_set():
            return None
        try:
            return traduzir_lote(b, chamar, FONTES[b[0].fonte]["contexto"])
        except CotaEsgotada as e:
            parar.set()
            return e

    feitos_lotes = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, paralelo)) as pool:
        futuros = {pool.submit(trabalhar, b): b for b in lotes}
        for fut in concurrent.futures.as_completed(futuros):
            b = futuros[fut]
            r = fut.result()
            fonte = b[0].fonte
            pf = resumo["porFonte"].setdefault(fonte, {"traduzidos": 0, "descartados": 0})
            if r is None:
                resumo["naoTentados"] += len(b)
                continue
            if isinstance(r, CotaEsgotada):
                resumo["cotaEsgotada"] = True
                resumo["naoTentados"] += len(b)
                continue
            ok, descartes = r
            for it, trad, modelo in ok:
                tit = titulo_do_item(it, titulos)
                caches[fonte].gravar(registro(it, tit, trad, modelo, data))
            for d in descartes:
                anexar_jsonl(saida / "descartes.jsonl", {**d, "tipo": "texto", "data": data})
                chave = d["motivo"].split(":")[0].split("(")[0]
                resumo["descartesPorMotivo"][chave] = resumo["descartesPorMotivo"].get(chave, 0) + 1
            resumo["traduzidos"] += len(ok)
            resumo["descartados"] += len(descartes)
            pf["traduzidos"] += len(ok)
            pf["descartados"] += len(descartes)
            feitos_lotes += 1
            log(f"  lote {feitos_lotes}/{len(lotes)} ({fonte}): {len(ok)} ok, {len(descartes)} descartados  "
                f"[{time.time() - t0:.0f}s]")
    for c in caches.values():
        c.compactar()
    resumo["chamadasLote"] = len(lotes)
    resumo["semTituloTraduzido"] = len(sem_titulo)
    resumo["pendentesNoFim"] = resumo["total"] - sum(1 for it in itens if caches[it.fonte].tem(it))
    resumo["segundos"] = round(time.time() - t0, 1)
    anexar_jsonl(saida / "execucoes.jsonl", resumo)
    return resumo


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dados", default=str(DADOS), help="pasta do pacote (padrão: data/quimica)")
    ap.add_argument("--saida", default=str(SAIDA), help="pasta das traduções (padrão: pipeline/traducoes)")
    ap.add_argument("--fonte", default="todas", help="chebi | gutenberg-14474 | todas")
    ap.add_argument("--modelo", action="append", help="id provedor/modelo; repita para a ordem de reserva (padrão: Qwen3.8 Max, "
                                                     "Qwen3.8 Max no outro plano, GLM-5.3, DeepSeek V4 Pro)")
    ap.add_argument("--lote", type=int, default=LOTE_PADRAO)
    ap.add_argument("--max-chars", type=int, default=MAX_CHARS_LOTE)
    ap.add_argument("--paralelo", type=int, default=PARALELO_PADRAO)
    ap.add_argument("--limite", type=int, default=None, help="no máximo N textos nesta execução (piloto)")
    ap.add_argument("--data", default=datetime.date.today().isoformat())
    ap.add_argument("--contar", action="store_true", help="só mostra quantos faltam e sai")
    ap.add_argument("--por-processo", action="store_true", help="um `kilo run` por chamada (lento: ~10 s de partida cada) em vez do `kilo serve` local")
    args = ap.parse_args(argv)

    fontes = list(FONTES) if args.fonte == "todas" else [args.fonte]
    for f in fontes:
        if f not in FONTES:
            ap.error(f"fonte desconhecida: {f}")
    itens = carregar_pendentes(args.dados, fontes)
    saida = Path(args.saida)
    por_fonte = collections.Counter(i.fonte for i in itens)
    em_cache = sum(1 for i in itens if Cache(saida / f"{i.fonte}.jsonl").tem(i))
    print(f"pendentes no pacote: {len(itens)} ({dict(por_fonte)}); já em cache: {em_cache}; faltam: {len(itens) - em_cache}")
    if args.contar or len(itens) == em_cache:
        return 0
    servidor = None
    if not args.por_processo:
        try:
            servidor = ServidorKilo()
            servidor.iniciar()
        except (ErroKilo, FileNotFoundError, OSError) as e:
            print(f"kilo serve indisponível ({e}); usando um `kilo run` por chamada")
            if servidor:
                servidor.parar()
            servidor = None
    try:
        chamador = Chamador(args.modelo or MODELOS, servidor.chamar if servidor else chamar_kilo)
        resumo = executar(itens, saida, chamador, args.data, args.lote, args.max_chars, args.paralelo, args.limite)
    finally:
        if servidor:
            servidor.parar()
    resumo["chamadasPorModelo"] = dict(chamador.chamadas)
    resumo["modelosFora"] = chamador.fora
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    if resumo["cotaEsgotada"]:
        print(f"COTA ESGOTADA: pararam {resumo['pendentesNoFim']} textos sem tradução; rode de novo quando a cota voltar (retoma do cache).")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
