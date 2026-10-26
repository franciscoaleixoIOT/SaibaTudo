# -*- coding: utf-8 -*-
"""Gera o pacote de dados do SaibaTudo LLMs a partir do GloVe (glove-wiki-gigaword-50: Wikipedia 2014 + Gigaword 5, 50 dimensões).

    python pipeline/gerar_pacote.py --saida data/llms --fonte gensim --limite 100000 \
        --chave secrets/data_signing_key.pem --glossario contracts/glossario.json --presets contracts/presets.json
    python pipeline/gerar_pacote.py --saida web/test/fixtures/data-llms --fonte gensim --palavras web/test/fixtures/palavras_fixture.txt \
        --chave web/test/fixtures/chave_teste.pem --glossario contracts/glossario.json --presets contracts/presets.json

Fonte: `--fonte gensim` baixa o modelo pelo gensim.downloader (66 MB, do GitHub, cache em pipeline/.cache); `--fonte hf` baixa o espelho
fse/glove-wiki-gigaword-50 do Hugging Face (mesmo modelo, formato KeyedVectors); `--fonte <glove.6B.50d.zip>` lê o espelho do Zenodo
(registro 4925376, word2vec binário em zip); `--fonte <arquivo.txt>` lê o formato texto
do Stanford ("palavra v1 … v50" por linha). Licença dos vetores: PDDL 1.0 (Open Data Commons); referência: Pennington, Socher & Manning (2014).

Seleção: na ordem de frequência do GloVe, as primeiras `--limite` palavras alfabéticas (`^[a-z]+(?:[-'][a-z]+)*$`, até 20 caracteres):
nada de números, pontuação ou <unk>. `--palavras lista.txt` restringe a essas palavras (fixture de teste), mantendo a ordem de frequência.

Quantização: int8 por vetor, `escala = max|x| / 127`, `q = round(x / escala)`. O cliente desquantiza (`q * escala`) ou calcula o produto
escalar direto nos int8. Arquivos: vocab.json (lista), vetores.i8 (n × 50 int8, ordem C), escalas.f32 (n float32 little-endian), glossario.json,
presets.json, manifest.json (bytes + SHA-256 de cada arquivo, metadados dos vetores) e manifest.sig (ECDSA P-256, sign.py).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sign  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
PADRAO_PALAVRA = re.compile(r"^[a-z]+(?:[-'][a-z]+)*$")
MAX_LEN = 20
LIMITE = 100_000
DIMENSOES = 50
MODELO_GENSIM = "glove-wiki-gigaword-50"
FONTE_PADRAO = {
    "nome": "GloVe 6B (Wikipedia 2014 + Gigaword 5), 50 dimensões — glove-wiki-gigaword-50",
    "licenca": "PDDL 1.0",
    "url": "https://nlp.stanford.edu/projects/glove/",
    "referencia": "Pennington, Socher & Manning (2014), GloVe: Global Vectors for Word Representation",
}


def filtrar_palavras(palavras: Iterable[str], limite: int = LIMITE) -> list[str]:
    """Mantém a ordem; só palavras alfabéticas em minúsculas (hífen e apóstrofo internos), até MAX_LEN caracteres; para em `limite`."""
    saida: list[str] = []
    for p in palavras:
        if len(saida) >= limite:
            break
        if len(p) <= MAX_LEN and PADRAO_PALAVRA.match(p):
            saida.append(p)
    return saida


def quantizar(matriz: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """int8 por vetor: escala = max|x|/127 (linha toda zero → escala 1.0). Devolve (int8 [n,d], float32 [n])."""
    m = np.asarray(matriz, dtype=np.float32)
    maximos = np.abs(m).max(axis=1)
    escalas = np.where(maximos > 0, maximos / 127.0, 1.0).astype(np.float32)
    q = np.rint(m / escalas[:, None]).clip(-127, 127).astype(np.int8)
    return q, escalas


def desquantizar(q: np.ndarray, escalas: np.ndarray) -> np.ndarray:
    return (np.asarray(q, dtype=np.float32) * np.asarray(escalas, dtype=np.float32)[:, None]).astype(np.float32)


def _sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def escrever_pacote(saida: Path, palavras: list[str], matriz: np.ndarray, glossario: dict, presets: dict,
                    chave_privada: Path, fonte: dict | None = None) -> dict:
    """Grava os arquivos do pacote em `saida`, o manifesto e a assinatura. Devolve o manifesto."""
    saida = Path(saida)
    saida.mkdir(parents=True, exist_ok=True)
    m = np.asarray(matriz, dtype=np.float32)
    if m.shape != (len(palavras), DIMENSOES):
        raise ValueError(f"matriz {m.shape} não bate com {len(palavras)} palavras × {DIMENSOES}")
    q, escalas = quantizar(m)
    arquivos = {
        "vocab.json": json.dumps(palavras, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        "vetores.i8": np.ascontiguousarray(q).tobytes(),
        "escalas.f32": escalas.astype("<f4").tobytes(),
        "glossario.json": json.dumps(glossario, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"),
        "presets.json": json.dumps(presets, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
    }
    for nome, conteudo in arquivos.items():
        (saida / nome).write_bytes(conteudo)
    agora = datetime.now(timezone.utc).replace(microsecond=0)
    manifesto = {
        "version": agora.strftime("%Y%m%dT%H%M%SZ") + "-" + _sha256(arquivos["vocab.json"])[:12],
        "generatedAt": agora.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schemaVersion": 1,
        "files": {nome: {"bytes": len(c), "sha256": _sha256(c)} for nome, c in arquivos.items()},
        "vetores": {
            **(fonte or FONTE_PADRAO),
            "palavras": len(palavras),
            "dimensoes": DIMENSOES,
            "quantizacao": "int8 por vetor (escala = max|x|/127)",
        },
    }
    caminho = saida / "manifest.json"
    caminho.write_text(json.dumps(manifesto, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")  # LF em qualquer SO: bytes assinados
    sign.assinar(caminho, Path(chave_privada))
    return manifesto


# ---------------------------------------------------------------------------------------------------- fontes


def carregar_gensim(cache: Path):
    """Baixa (ou lê do cache) o modelo do gensim. Devolve (palavras em ordem de frequência, matriz float32)."""
    os.environ.setdefault("GENSIM_DATA_DIR", str(cache))
    import gensim.downloader as api  # import tardio: só o CLI precisa do gensim

    kv = api.load(MODELO_GENSIM)
    palavras = list(kv.index_to_key)
    return palavras, np.asarray(kv.vectors, dtype=np.float32)


def carregar_keyedvectors(caminho: Path):
    """Modelo salvo pelo gensim (KeyedVectors.save: <nome>.model + <nome>.model.vectors.npy). Devolve (palavras, matriz float32)."""
    from gensim.models import KeyedVectors  # import tardio

    kv = KeyedVectors.load(str(caminho))
    return list(kv.index_to_key), np.asarray(kv.vectors, dtype=np.float32)


REPO_HF = "fse/glove-wiki-gigaword-50"


def carregar_hf(cache: Path):
    """Espelho do mesmo modelo no Hugging Face (repositório fse/glove-wiki-gigaword-50, formato KeyedVectors do gensim)."""
    from huggingface_hub import hf_hub_download  # import tardio

    cache.mkdir(parents=True, exist_ok=True)
    modelo = hf_hub_download(REPO_HF, "glove-wiki-gigaword-50.model", cache_dir=str(cache))
    hf_hub_download(REPO_HF, "glove-wiki-gigaword-50.model.vectors.npy", cache_dir=str(cache))
    return carregar_keyedvectors(Path(modelo))


def carregar_word2vec(caminho: Path):
    """Formato word2vec BINÁRIO (ex.: espelho do Zenodo 4925376: glove.6B.50d.zip com um .bin dentro, convertido pelo gensim).
    Aceita o .zip (primeiro arquivo que não seja diretório) ou o binário já extraído. Devolve (palavras em ordem, matriz float32)."""
    import zipfile

    from gensim.models import KeyedVectors  # import tardio

    caminho = Path(caminho)
    if caminho.suffix.lower() == ".zip":
        with zipfile.ZipFile(caminho) as zf:
            nomes = [n for n in zf.namelist() if not n.endswith("/")]
            if not nomes:
                raise SystemExit(f"zip vazio: {caminho}")
            destino = caminho.with_suffix("")
            if not destino.exists():
                destino.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(nomes[0]) as origem, open(destino, "wb") as saida:
                    while True:
                        bloco = origem.read(1 << 20)
                        if not bloco:
                            break
                        saida.write(bloco)
            caminho = destino
    kv = KeyedVectors.load_word2vec_format(str(caminho), binary=True)
    return list(kv.index_to_key), np.asarray(kv.vectors, dtype=np.float32)


def carregar_texto(caminho: Path):
    """Formato texto do Stanford: 'palavra v1 … v50' por linha, em ordem de frequência."""
    palavras: list[str] = []
    linhas: list[np.ndarray] = []
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            partes = linha.rstrip("\n").split(" ")
            if len(partes) != DIMENSOES + 1:
                continue
            palavras.append(partes[0])
            linhas.append(np.array(partes[1:], dtype=np.float32))
    return palavras, np.vstack(linhas)


def selecionar(palavras: list[str], matriz: np.ndarray, limite: int, restringir: set[str] | None):
    """Filtra e corta, preservando a ordem de frequência; `restringir` mantém só essas palavras (todas precisam existir)."""
    if restringir is not None:
        indices = [i for i, p in enumerate(palavras) if p in restringir]
        faltam = restringir - {palavras[i] for i in indices}
        if faltam:
            raise SystemExit(f"palavras ausentes do GloVe: {sorted(faltam)[:20]}")
        return [palavras[i] for i in indices], matriz[indices]
    mapa = {p: i for i, p in enumerate(palavras)}
    escolhidas = filtrar_palavras(palavras, limite)
    return escolhidas, matriz[[mapa[p] for p in escolhidas]]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--saida", required=True)
    ap.add_argument("--fonte", default="gensim", help="'gensim', 'hf' (espelho fse/glove-wiki-gigaword-50), um .zip/.bin word2vec binário (espelho Zenodo 4925376) ou o arquivo texto do GloVe")
    ap.add_argument("--limite", type=int, default=LIMITE)
    ap.add_argument("--palavras", help="arquivo com uma palavra por linha: restringe o vocabulário (fixture)")
    ap.add_argument("--chave", required=True, help="chave privada ECDSA (PEM) para assinar o manifesto")
    ap.add_argument("--glossario", default=str(RAIZ / "contracts" / "glossario.json"))
    ap.add_argument("--presets", default=str(RAIZ / "contracts" / "presets.json"))
    ap.add_argument("--cache", default=str(RAIZ / "pipeline" / ".cache"))
    a = ap.parse_args(argv)

    if a.fonte == "gensim":
        palavras, matriz = carregar_gensim(Path(a.cache))
    elif a.fonte == "hf":
        palavras, matriz = carregar_hf(Path(a.cache))
    elif a.fonte.lower().endswith((".zip", ".bin")):
        palavras, matriz = carregar_word2vec(Path(a.fonte))
    else:
        palavras, matriz = carregar_texto(Path(a.fonte))
    restringir = None
    if a.palavras:
        restringir = {l.strip().lower() for l in Path(a.palavras).read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")}
    escolhidas, m = selecionar(palavras, matriz, a.limite, restringir)
    glossario = json.loads(Path(a.glossario).read_text(encoding="utf-8"))
    presets = json.loads(Path(a.presets).read_text(encoding="utf-8"))
    manifesto = escrever_pacote(Path(a.saida), escolhidas, m, glossario, presets, Path(a.chave))
    print(f"pacote em {a.saida}: {len(escolhidas)} palavras × {DIMENSOES}, versão {manifesto['version']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
