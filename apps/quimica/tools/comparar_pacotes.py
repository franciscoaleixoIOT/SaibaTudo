# -*- coding: utf-8 -*-
"""
Alerta de divergência de números entre o pacote de dados NOVO e o ANTERIOR (workflow quimica-data-refresh.yml, antes de publicar).
Sem dependências além da biblioteca padrão.

Por que existe: o pacote é reconstruído toda semana a partir de fontes externas (PubChem, Wikidata, ...). Uma fonte que muda um valor
(ou quebra um parser) não derruba nenhum teste de integridade e chega ao estudante como fato. Este comparador barra a publicação quando
o pacote novo contradiz o publicado em algo que só deveria mudar por decisão consciente.

Falha (código 1) quando, do pacote anterior para o novo:
  massa-molar            a massa molar de algum composto mudou mais que --limiar-massa (padrão 0,5 %) ou deixou de existir;
  elemento-propriedade   alguma propriedade numérica de elemento mudou mais que --limiar-elemento (padrão 2 %) ou deixou de existir;
  elementos-sumiram      algum elemento sumiu;
  compostos-sumiram      algum composto sumiu;
  queda-compostos        a quantidade de compostos caiu mais que --limiar-compostos (padrão 5 %);
  queda-textos           a quantidade de textos (total ou de uma fonte) caiu mais que --limiar-textos (padrão 10 %);
  licenca                a licença (ou a política de uso: uso/exibir/dataset/treino) de alguma fonte mudou ou a fonte saiu da lista;
  data-mais-antiga       o `generatedAt` do manifesto novo é mais antigo que o do anterior;
  constante              o valor de alguma constante (CODATA) mudou ou a constante sumiu;
  regras                 algum número de regras.json (fatores de unidades, prefixos SI, ...) mudou ou sumiu.
Também imprime o resumo do que mudou e foi aceito (compostos novos, propriedades novas, ...).

Diferença conhecida e revisada: --permitir REGRA[:ALVO] (repetível; aceita lista separada por vírgula ou espaço). ALVO é um identificador
do achado (CID, fórmula, símbolo ou Z do elemento, nome da propriedade, id da fonte/constante); sem ALVO a regra inteira é aceita.
Exemplos: --permitir elemento-propriedade:energiaIonizacaoKJmol   --permitir massa-molar:313   --permitir licenca:wikidata

--anterior aceita uma pasta (como data/quimica) ou a URL base do pacote publicado (https://saibatudo.net/quimica/data/); a URL é baixada
para uma pasta temporária e cada arquivo é conferido contra o sha256 do manifesto publicado. Com --anterior-reserva PASTA, se o download
falhar a comparação usa essa pasta (ex.: o pacote versionado no Git) e avisa no relatório.

Uso:  python tools/comparar_pacotes.py --novo data/quimica --anterior https://saibatudo.net/quimica/data/ --anterior-reserva ../anterior
                                       [--limiar-massa 0.5] [--json saida.json] [--permitir REGRA[:ALVO]]
Código de saída: 0 = sem divergência; 1 = divergência (o workflow bloqueia a publicação e abre/atualiza a issue); 2 = erro de uso ou de leitura.
"""
import argparse
import hashlib
import json
import math
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

LIMIAR_MASSA = 0.5       # % da massa molar de um composto
LIMIAR_ELEMENTO = 2.0    # % de uma propriedade numérica de elemento
LIMIAR_COMPOSTOS = 5.0   # % de queda na quantidade de compostos
LIMIAR_TEXTOS = 10.0     # % de queda na quantidade de textos
TOLERANCIA_EXATA = 1e-9  # constantes e números de regras.json: qualquer mudança real

REGRAS = {
    "massa-molar": "massa molar de composto mudou além do limiar (ou sumiu)",
    "elemento-propriedade": "propriedade numérica de elemento mudou além do limiar (ou sumiu)",
    "elementos-sumiram": "elemento do pacote anterior não está no novo",
    "compostos-sumiram": "composto do pacote anterior não está no novo",
    "queda-compostos": "quantidade de compostos caiu além do limiar",
    "queda-textos": "quantidade de textos caiu além do limiar (total ou de uma fonte)",
    "licenca": "licença ou política de uso de uma fonte mudou (ou a fonte saiu da lista)",
    "data-mais-antiga": "generatedAt do manifesto novo é mais antigo que o do anterior",
    "constante": "valor de constante física mudou (ou a constante sumiu)",
    "regras": "número de regras.json (unidades, prefixos SI, ...) mudou (ou sumiu)",
}

CAMPOS_POLITICA_FONTE = ("licenca", "uso", "exibir", "dataset", "treino")
ARQUIVOS_OBRIGATORIOS = ("elementos.json", "fontes.json", "regras.json", "compostos/index.json")
ARQUIVOS_OPCIONAIS = ("constantes.json",)
NOME_SEGURO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")


class ErroPacote(Exception):
    """Pacote ausente, ilegível ou inconsistente (código de saída 2)."""


@dataclass
class Divergencia:
    regra: str
    tags: tuple
    mensagem: str
    permitida_por: str = ""

    def como_dict(self):
        d = {"regra": self.regra, "tags": list(self.tags), "mensagem": self.mensagem}
        if self.permitida_por:
            d["permitidaPor"] = self.permitida_por
        return d


@dataclass
class Pacote:
    raiz: Path
    origem: str
    manifest: dict
    elementos: dict       # z -> elemento
    compostos: dict       # cid -> composto
    constantes: dict      # id -> constante
    fontes: dict          # id -> fonte (fontes.json)
    regras: dict
    avisos: list = field(default_factory=list)


# ------------------------------------------------------------------------------------------------------------------ leitura

def _ler_json(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ErroPacote(f"arquivo ausente: {p}") from None
    except (OSError, ValueError) as e:
        raise ErroPacote(f"não foi possível ler {p}: {e}") from None


def _lista_de_fontes(dados):
    if isinstance(dados, dict):
        dados = dados.get("fontes", [])
    if not isinstance(dados, list):
        raise ErroPacote('fontes.json: esperada uma lista de fontes (ou {"fontes": [...]})')
    return {f["id"]: f for f in dados if isinstance(f, dict) and "id" in f}


def carregar_pacote(pasta, origem=None) -> Pacote:
    raiz = Path(pasta)
    if not (raiz / "manifest.json").is_file():
        raise ErroPacote(f"pasta sem manifest.json: {raiz}")
    manifest = _ler_json(raiz / "manifest.json")
    elementos_lista = _ler_json(raiz / "elementos.json")
    if not isinstance(elementos_lista, list):
        raise ErroPacote(f"{raiz / 'elementos.json'}: esperada uma lista de elementos")
    elementos = {e["z"]: e for e in elementos_lista if isinstance(e, dict) and "z" in e}

    pasta_compostos = raiz / "compostos"
    indice = _ler_json(pasta_compostos / "index.json")
    lotes = indice.get("lotes") or sorted(p.stem for p in pasta_compostos.glob("lote-*.json"))
    compostos = {}
    for lote in lotes:
        if not NOME_SEGURO.match(str(lote)):
            raise ErroPacote(f"nome de lote inválido em compostos/index.json: {lote!r}")
        lista = _ler_json(pasta_compostos / f"{lote}.json")
        if not isinstance(lista, list):
            raise ErroPacote(f"compostos/{lote}.json: esperada uma lista de compostos")
        for c in lista:
            if isinstance(c, dict) and "cid" in c:
                compostos[c["cid"]] = c

    constantes = {}
    if (raiz / "constantes.json").is_file():
        dados = _ler_json(raiz / "constantes.json")
        lista = dados.get("constantes", []) if isinstance(dados, dict) else dados
        constantes = {c["id"]: c for c in lista if isinstance(c, dict) and "id" in c}

    return Pacote(
        raiz=raiz,
        origem=origem or str(raiz),
        manifest=manifest,
        elementos=elementos,
        compostos=compostos,
        constantes=constantes,
        fontes=_lista_de_fontes(_ler_json(raiz / "fontes.json")),
        regras=_ler_json(raiz / "regras.json"),
    )


# ------------------------------------------------------------------------------------------------------------------ download

def _get(url: str, timeout: float) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "saibatudo-comparar-pacotes/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _get_com_tentativas(url: str, tentativas: int, espera: float, timeout: float) -> bytes:
    ultimo = None
    for i in range(max(1, tentativas)):
        try:
            return _get(url, timeout)
        except urllib.error.HTTPError as e:
            ultimo = e
            if e.code == 404:  # não adianta tentar de novo
                break
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            ultimo = e
        if i + 1 < tentativas:
            time.sleep(espera * (i + 1))
    raise ErroPacote(f"download falhou ({url}): {ultimo}")


def baixar_pacote(base_url: str, destino, tentativas: int = 3, espera: float = 2.0, timeout: float = 60.0) -> Path:
    """Baixa o necessário para comparar (manifesto, elementos, constantes, fontes, regras, índice e lotes de compostos; não os textos).
    Cada arquivo é conferido contra o sha256 do manifesto baixado. Devolve a pasta com o pacote parcial."""
    base = re.sub(r"manifest\.json$", "", base_url.strip())
    if not base.endswith("/"):
        base += "/"
    destino = Path(destino).resolve()
    destino.mkdir(parents=True, exist_ok=True)

    bruto = _get_com_tentativas(base + "manifest.json", tentativas, espera, timeout)
    try:
        manifesto = json.loads(bruto.decode("utf-8"))
    except ValueError as e:
        raise ErroPacote(f"{base}manifest.json ilegível: {e}") from None
    (destino / "manifest.json").write_bytes(bruto)
    arquivos = manifesto.get("files") if isinstance(manifesto, dict) else None
    arquivos = arquivos if isinstance(arquivos, dict) else {}

    def buscar(rel: str, obrigatorio: bool = True):
        # o manifesto e o índice vêm da rede: nada de "..", barras iniciais ou nomes estranhos
        if not all(NOME_SEGURO.match(parte) for parte in rel.split("/")):
            raise ErroPacote(f"caminho inválido no pacote publicado: {rel!r}")
        try:
            corpo = _get_com_tentativas(base + rel, tentativas, espera, timeout)
        except ErroPacote:
            if obrigatorio:
                raise
            return
        esperado = (arquivos.get(rel) or {}).get("sha256")
        if esperado and hashlib.sha256(corpo).hexdigest() != esperado:
            raise ErroPacote(f"{base + rel}: sha256 diferente do manifesto publicado (deploy em andamento ou pacote corrompido)")
        alvo = (destino / rel).resolve()
        if destino not in alvo.parents:
            raise ErroPacote(f"caminho fora da pasta de destino: {rel!r}")
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_bytes(corpo)

    for rel in ARQUIVOS_OBRIGATORIOS:
        buscar(rel)
    for rel in ARQUIVOS_OPCIONAIS:
        buscar(rel, obrigatorio=False)
    indice = _ler_json(destino / "compostos" / "index.json")
    for lote in indice.get("lotes", []):
        buscar(f"compostos/{lote}.json")
    return destino


# ------------------------------------------------------------------------------------------------------------------ comparação

def _eh_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def variacao_pct(antes, depois) -> float:
    """Variação relativa assinada em %, em relação ao valor anterior (infinita se o anterior for 0 e o novo não)."""
    if antes == depois:
        return 0.0
    if antes == 0:
        return math.inf if depois > 0 else -math.inf
    return (depois - antes) / abs(antes) * 100.0


def _n(x) -> str:
    s = f"{x:.6g}" if isinstance(x, float) else str(x)
    return s.replace(".", ",")


def _pct(x: float, sinal: bool = True) -> str:
    if math.isinf(x):
        return "infinito"
    s = f"{x:+.2f}" if sinal else f"{abs(x):.2f}"
    return s.replace(".", ",") + " %"


def _iso(valor):
    if not isinstance(valor, str):
        return None
    try:
        t = datetime.fromisoformat(valor.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def _rotulo_composto(c: dict) -> str:
    nome = c.get("nome") or c.get("nomeIupac") or ""
    return f"CID {c.get('cid')} ({c.get('formula', '?')}{', ' + nome if nome else ''})"


def _rotulo_elemento(e: dict) -> str:
    nome = e.get("nome")
    return f"{e.get('simbolo', '?')} (Z={e.get('z')}{', ' + nome if nome else ''})"


def _identificador(no: dict, indice: int):
    for chave in ("id", "simbolo", "formula", "n", "ion", "chave", "nome"):
        v = no.get(chave)
        if isinstance(v, (str, int)) and not isinstance(v, bool):
            return str(v)
    return f"#{indice}"


def achatar_numeros(no, caminho="", saida=None) -> dict:
    """Folhas numéricas de um JSON, com caminhos estáveis (listas de objetos são indexadas por id/símbolo/fórmula, não pela posição)."""
    if saida is None:
        saida = {}
    if _eh_num(no):
        saida[caminho or "/"] = no
    elif isinstance(no, dict):
        for k, v in no.items():
            achatar_numeros(v, f"{caminho}/{k}", saida)
    elif isinstance(no, list):
        ids = [_identificador(v, i) if isinstance(v, dict) else f"#{i}" for i, v in enumerate(no)]
        if len(set(ids)) != len(ids):
            ids = [f"#{i}" for i in range(len(no))]
        for chave, v in zip(ids, no):
            achatar_numeros(v, f"{caminho}[{chave}]", saida)
    return saida


def comparar(anterior: Pacote, novo: Pacote, limiar_massa=LIMIAR_MASSA, limiar_elemento=LIMIAR_ELEMENTO,
             limiar_compostos=LIMIAR_COMPOSTOS, limiar_textos=LIMIAR_TEXTOS):
    """Devolve (divergências, aceitas): `aceitas` resume o que mudou sem violar nenhuma regra."""
    div: list = []
    aceitas: dict = {}

    def add(regra, tags, msg):
        div.append(Divergencia(regra, tuple(str(t) for t in tags), msg))

    # --- data do manifesto
    t_ant, t_novo = _iso(anterior.manifest.get("generatedAt")), _iso(novo.manifest.get("generatedAt"))
    if t_novo is None:
        add("data-mais-antiga", ("generatedAt",), f"generatedAt do manifesto novo ilegível: {novo.manifest.get('generatedAt')!r}")
    elif t_ant is not None and t_novo < t_ant:
        add("data-mais-antiga", ("generatedAt",),
            f"generatedAt do novo ({novo.manifest.get('generatedAt')}) é mais antigo que o do anterior ({anterior.manifest.get('generatedAt')})")

    # --- compostos: sumiram, queda, massa molar, campos novos
    cids_ant, cids_novo = set(anterior.compostos), set(novo.compostos)
    for cid in sorted(cids_ant - cids_novo):
        c = anterior.compostos[cid]
        add("compostos-sumiram", (cid, c.get("formula", "")), f"{_rotulo_composto(c)} está no anterior e não no novo")
    n_ant, n_novo = len(cids_ant), len(cids_novo)
    if n_ant and n_novo < n_ant:
        queda = (n_ant - n_novo) / n_ant * 100.0
        if queda > limiar_compostos:
            add("queda-compostos", ("total",), f"compostos: {n_ant} -> {n_novo} (queda de {_pct(queda, False)}; limite {_pct(limiar_compostos, False)})")
    novos = sorted(cids_novo - cids_ant)
    if novos:
        aceitas["compostosNovos"] = {"quantidade": len(novos), "cids": novos}

    abaixo, max_abaixo = 0, 0.0
    campos_novos = Counter()
    for cid in sorted(cids_ant & cids_novo):
        ca, cn = anterior.compostos[cid], novo.compostos[cid]
        ma, mn = ca.get("massaMolar"), cn.get("massaMolar")
        if _eh_num(ma):
            if not _eh_num(mn):
                add("massa-molar", (cid, ca.get("formula", "")), f"{_rotulo_composto(ca)}: massa molar {_n(ma)} -> ausente")
            else:
                v = variacao_pct(ma, mn)
                if abs(v) > limiar_massa:
                    add("massa-molar", (cid, ca.get("formula", "")),
                        f"{_rotulo_composto(ca)}: massa molar {_n(ma)} -> {_n(mn)} ({_pct(v)}; limite {_pct(limiar_massa, False)})")
                elif v != 0:
                    abaixo += 1
                    max_abaixo = max(max_abaixo, abs(v))
        for k in cn:
            if k not in ca and cn[k] not in (None, [], {}):
                campos_novos[k] += 1
        pa, pn = ca.get("propriedades") or {}, cn.get("propriedades") or {}
        if isinstance(pa, dict) and isinstance(pn, dict):
            for k in pn:
                if k not in pa and pn[k] is not None:
                    campos_novos[f"propriedades.{k}"] += 1
    if abaixo:
        aceitas["massaMolarAlteradaAbaixoDoLimite"] = {"compostos": abaixo, "maiorVariacaoPct": round(max_abaixo, 4)}
    if campos_novos:
        aceitas["camposNovosDeCompostos"] = dict(sorted(campos_novos.items()))

    # --- elementos
    zs_ant, zs_novo = set(anterior.elementos), set(novo.elementos)
    for z in sorted(zs_ant - zs_novo):
        e = anterior.elementos[z]
        add("elementos-sumiram", (z, e.get("simbolo", "")), f"{_rotulo_elemento(e)} está no anterior e não no novo")
    if zs_novo - zs_ant:
        aceitas["elementosNovos"] = sorted(str(novo.elementos[z].get("simbolo", z)) for z in zs_novo - zs_ant)
    props_novas = Counter()
    for z in sorted(zs_ant & zs_novo):
        ea, en = anterior.elementos[z], novo.elementos[z]
        simbolo = ea.get("simbolo", str(z))
        for prop in sorted((set(ea) | set(en)) - {"z"}):
            va, vn = ea.get(prop), en.get(prop)
            if _eh_num(va):
                if not _eh_num(vn):
                    add("elemento-propriedade", (prop, simbolo, z), f"{_rotulo_elemento(ea)}: {prop} {_n(va)} -> ausente")
                    continue
                v = variacao_pct(va, vn)
                if abs(v) > limiar_elemento:
                    add("elemento-propriedade", (prop, simbolo, z),
                        f"{_rotulo_elemento(ea)}: {prop} {_n(va)} -> {_n(vn)} ({_pct(v)}; limite {_pct(limiar_elemento, False)})")
            elif _eh_num(vn):
                props_novas[prop] += 1
    if props_novas:
        aceitas["propriedadesNovasDeElementos"] = dict(sorted(props_novas.items()))

    # --- constantes
    for id_, ca in sorted(anterior.constantes.items()):
        cn = novo.constantes.get(id_)
        if cn is None:
            add("constante", (id_,), f"constante {id_} ({ca.get('nome', '')}) está no anterior e não no novo")
        elif _eh_num(ca.get("valor")) and not (_eh_num(cn.get("valor")) and math.isclose(ca["valor"], cn["valor"], rel_tol=TOLERANCIA_EXATA)):
            depois = _n(cn["valor"]) if _eh_num(cn.get("valor")) else "ausente"
            add("constante", (id_,), f"constante {id_} ({ca.get('nome', '')}): valor {_n(ca['valor'])} -> {depois}")
    if set(novo.constantes) - set(anterior.constantes):
        aceitas["constantesNovas"] = sorted(set(novo.constantes) - set(anterior.constantes))

    # --- regras.json (só números)
    na, nn = achatar_numeros(anterior.regras), achatar_numeros(novo.regras)
    for caminho, va in sorted(na.items()):
        if caminho not in nn:
            add("regras", (caminho,), f"regras.json {caminho}: {_n(va)} -> ausente")
        elif va != nn[caminho] and not math.isclose(va, nn[caminho], rel_tol=TOLERANCIA_EXATA):
            add("regras", (caminho,), f"regras.json {caminho}: {_n(va)} -> {_n(nn[caminho])}")

    # --- licenças e política de uso das fontes (fontes.json e `sources` do manifesto)
    def politica(lista):
        return {f["id"]: {k: f.get(k) for k in CAMPOS_POLITICA_FONTE} for f in lista if isinstance(f, dict) and "id" in f}

    conjuntos = (
        ("fontes.json", politica(anterior.fontes.values()), politica(novo.fontes.values())),
        ("manifest.json (sources)", politica(anterior.manifest.get("sources") or []), politica(novo.manifest.get("sources") or [])),
    )
    fontes_novas = set()
    for arquivo, pa, pn in conjuntos:
        for fid, campos in sorted(pa.items()):
            if fid not in pn:
                add("licenca", (fid,), f"{arquivo}: a fonte {fid} (licença: {campos.get('licenca')}) saiu da lista")
                continue
            for k in CAMPOS_POLITICA_FONTE:
                if campos.get(k) != pn[fid].get(k):
                    add("licenca", (fid, k), f"{arquivo}: fonte {fid}, {k}: {campos.get(k)!r} -> {pn[fid].get(k)!r}")
        fontes_novas |= set(pn) - set(pa)
    if fontes_novas:
        aceitas["fontesNovas"] = sorted(fontes_novas)

    # --- textos (contagens do manifesto)
    def contagens_textos(p: Pacote):
        c = p.manifest.get("contagens") or {}
        por_fonte = c.get("textosPorFonte") if isinstance(c.get("textosPorFonte"), dict) else {}
        total = c.get("textos")
        if not _eh_num(total) and por_fonte:
            total = sum(v for v in por_fonte.values() if _eh_num(v))
        return (total if _eh_num(total) else None), por_fonte

    ta, fa = contagens_textos(anterior)
    tn, fn = contagens_textos(novo)
    if ta is not None and tn is None:
        add("queda-textos", ("total",), f"textos: {ta} -> ausente no manifesto novo (contagens.textos)")
    elif ta:
        queda = (ta - tn) / ta * 100.0
        if queda > limiar_textos:
            add("queda-textos", ("total",), f"textos: {ta} -> {tn} (queda de {_pct(queda, False)}; limite {_pct(limiar_textos, False)})")
        elif tn != ta:
            aceitas["textos"] = {"anterior": ta, "novo": tn}
    for fonte, qa in sorted(fa.items()):
        if not _eh_num(qa) or qa <= 0:
            continue
        qn = fn.get(fonte, 0) if _eh_num(fn.get(fonte, 0)) else 0
        queda = (qa - qn) / qa * 100.0
        if queda > limiar_textos:
            add("queda-textos", (fonte,), f"textos da fonte {fonte}: {qa} -> {qn} (queda de {_pct(queda, False)}; limite {_pct(limiar_textos, False)})")

    return div, aceitas


# ------------------------------------------------------------------------------------------------------------------ permissões

def interpretar_permitir(valores) -> list:
    itens = []
    for v in valores or []:
        for item in re.split(r"[,\s;]+", str(v).strip()):
            if not item:
                continue
            regra, _, alvo = item.partition(":")
            if regra not in REGRAS:
                raise ValueError(f"regra desconhecida em --permitir: {regra!r}. Regras: {', '.join(REGRAS)}")
            itens.append((regra, alvo or None))
    return itens


def aplicar_permissoes(divergencias, permitir):
    """Separa (bloqueantes, permitidas, itens de --permitir que não aceitaram nada)."""
    usados = set()
    bloqueantes, permitidas = [], []
    for d in divergencias:
        casou = None
        for i, (regra, alvo) in enumerate(permitir):
            if d.regra == regra and (alvo is None or alvo.casefold() in (t.casefold() for t in d.tags)):
                casou = i
                usados.add(i)
                break
        if casou is None:
            bloqueantes.append(d)
        else:
            regra, alvo = permitir[casou]
            d.permitida_por = f"{regra}:{alvo}" if alvo else regra
            permitidas.append(d)
    nao_usados = [f"{r}:{a}" if a else r for i, (r, a) in enumerate(permitir) if i not in usados]
    return bloqueantes, permitidas, nao_usados


# ------------------------------------------------------------------------------------------------------------------ relatório

def resumo_pacote(p: Pacote) -> dict:
    c = p.manifest.get("contagens") or {}
    return {
        "origem": p.origem,
        "version": p.manifest.get("version"),
        "generatedAt": p.manifest.get("generatedAt"),
        "compostos": len(p.compostos),
        "elementos": len(p.elementos),
        "textos": c.get("textos"),
    }


def _linha_pacote(rotulo: str, r: dict) -> str:
    return (f"  {rotulo} {r['origem']} (versão {r['version']}, gerado em {r['generatedAt']}; "
            f"{r['compostos']} compostos, {r['elementos']} elementos, {r['textos']} textos)")


def formatar_relatorio(res: dict, max_itens: int = 25) -> str:
    L = ["Comparação de pacotes de dados - SaibaTudo Química", _linha_pacote("anterior:", res["anterior"]), _linha_pacote("novo:    ", res["novo"])]
    for a in res.get("avisos", []):
        L.append(f"  AVISO: {a}")
    bloq = res["divergencias"]
    if bloq:
        ordem = list(REGRAS)
        regras = sorted({d["regra"] for d in bloq}, key=ordem.index)
        L += ["", f"RESULTADO: REPROVADO ({len(bloq)} divergência(s) em {len(regras)} regra(s)): a publicação deve ser bloqueada."]
        for regra in regras:
            itens = [d for d in bloq if d["regra"] == regra]
            L += ["", f"[{regra}] {REGRAS[regra]}: {len(itens)}"]
            L += [f"  - {d['mensagem']}" for d in itens[:max_itens]]
            if len(itens) > max_itens:
                L.append(f"  ... e mais {len(itens) - max_itens} (lista completa no JSON)")
    else:
        L += ["", "RESULTADO: APROVADO (nenhuma divergência acima dos limiares)."]

    perm = res.get("permitidas", [])
    if perm:
        L += ["", f"Divergências aceitas por --permitir: {len(perm)}"]
        por_regra = Counter((d["regra"], d.get("permitidaPor", "")) for d in perm)
        L += [f"  - {regra} ({quem}): {n}" for (regra, quem), n in sorted(por_regra.items())]
    if res.get("permitirNaoUsado"):
        L += ["", "AVISO: itens de --permitir que não aceitaram nada (confira a grafia): " + ", ".join(res["permitirNaoUsado"])]

    ac = res.get("aceitas", {})
    L += ["", "Diferenças aceitas (informativo):"]
    if not ac:
        L.append("  nenhuma além de metadados do manifesto")
    if "compostosNovos" in ac:
        cids = ac["compostosNovos"]["cids"]
        L.append(f"  + {ac['compostosNovos']['quantidade']} composto(s) novo(s) (CIDs: {', '.join(map(str, cids[:10]))}{', ...' if len(cids) > 10 else ''})")
    if "elementosNovos" in ac:
        L.append(f"  + elementos novos: {', '.join(ac['elementosNovos'])}")
    if "propriedadesNovasDeElementos" in ac:
        L.append("  + propriedades novas em elementos: " + ", ".join(f"{k} ({n})" for k, n in ac["propriedadesNovasDeElementos"].items()))
    if "camposNovosDeCompostos" in ac:
        L.append("  + campos novos em compostos: " + ", ".join(f"{k} ({n})" for k, n in ac["camposNovosDeCompostos"].items()))
    if "massaMolarAlteradaAbaixoDoLimite" in ac:
        m = ac["massaMolarAlteradaAbaixoDoLimite"]
        L.append(f"  ~ massa molar alterada abaixo do limiar em {m['compostos']} composto(s) (maior variação {_pct(m['maiorVariacaoPct'], False)})")
    if "constantesNovas" in ac:
        L.append(f"  + constantes novas: {', '.join(ac['constantesNovas'])}")
    if "fontesNovas" in ac:
        L.append(f"  + fontes novas: {', '.join(ac['fontesNovas'])}")
    if "textos" in ac:
        L.append(f"  ~ textos: {ac['textos']['anterior']} -> {ac['textos']['novo']}")
    if bloq:
        L += ["", "Para aceitar uma diferença conhecida e revisada: --permitir REGRA[:ALVO] (ex.: --permitir elemento-propriedade:energiaIonizacaoKJmol).",
              "No workflow: gh workflow run quimica-data-refresh.yml -f permitir=REGRA[:ALVO],... (docs/OPERACAO.md, seção 2)."]
    return "\n".join(L) + "\n"


# ------------------------------------------------------------------------------------------------------------------ CLI

def _eh_url(s: str) -> bool:
    return s.lower().startswith(("http://", "https://"))


def resolver_anterior(anterior: str, reserva, tmp: Path, **kw):
    """Devolve (Pacote, avisos). `anterior` é pasta ou URL; a reserva só entra se o download falhar."""
    if not _eh_url(anterior):
        return carregar_pacote(anterior), []
    try:
        pasta = baixar_pacote(anterior, tmp / "publicado", **kw)
        return carregar_pacote(pasta, origem=anterior), []
    except ErroPacote as e:
        if not reserva:
            raise ErroPacote(f"não foi possível obter o pacote publicado e não há --anterior-reserva: {e}") from None
        aviso = f"não foi possível baixar o pacote publicado ({e}); comparado com a reserva {reserva}"
        return carregar_pacote(reserva, origem=f"{reserva} (reserva)"), [aviso]


def main(argv=None) -> int:
    for fluxo in (sys.stdout, sys.stderr):
        if hasattr(fluxo, "reconfigure"):
            fluxo.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--novo", required=True, help="pasta do pacote novo (como data/quimica)")
    ap.add_argument("--anterior", required=True, help="pasta do pacote anterior OU URL base do pacote publicado")
    ap.add_argument("--anterior-reserva", help="pasta usada se o download de --anterior falhar (ex.: pacote versionado no Git)")
    ap.add_argument("--limiar-massa", type=float, default=LIMIAR_MASSA, help="%% máximo de mudança da massa molar (padrão 0,5)")
    ap.add_argument("--limiar-elemento", type=float, default=LIMIAR_ELEMENTO, help="%% máximo de mudança de propriedade de elemento (padrão 2)")
    ap.add_argument("--limiar-compostos", type=float, default=LIMIAR_COMPOSTOS, help="%% máximo de queda de compostos (padrão 5)")
    ap.add_argument("--limiar-textos", type=float, default=LIMIAR_TEXTOS, help="%% máximo de queda de textos (padrão 10)")
    ap.add_argument("--permitir", action="append", default=[], metavar="REGRA[:ALVO]", help="aceita uma diferença conhecida (repetível; aceita lista)")
    ap.add_argument("--json", help="grava o resultado completo em JSON")
    ap.add_argument("--max-itens", type=int, default=25, help="itens listados por regra no relatório de texto (o JSON tem todos)")
    ap.add_argument("--tentativas", type=int, default=3, help="tentativas de download")
    a = ap.parse_args(argv)

    try:
        permitir = interpretar_permitir(a.permitir)
    except ValueError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="comparar-pacotes-") as tmp:
        try:
            novo = carregar_pacote(a.novo)
            anterior, avisos = resolver_anterior(a.anterior, a.anterior_reserva, Path(tmp), tentativas=a.tentativas)
        except ErroPacote as e:
            print(f"erro: {e}", file=sys.stderr)
            return 2

    divergencias, aceitas = comparar(anterior, novo, a.limiar_massa, a.limiar_elemento, a.limiar_compostos, a.limiar_textos)
    bloqueantes, permitidas, nao_usados = aplicar_permissoes(divergencias, permitir)
    res = {
        "ok": not bloqueantes,
        "codigo": 0 if not bloqueantes else 1,
        "anterior": resumo_pacote(anterior),
        "novo": resumo_pacote(novo),
        "limiares": {"massaPct": a.limiar_massa, "elementoPct": a.limiar_elemento, "compostosPct": a.limiar_compostos, "textosPct": a.limiar_textos},
        "avisos": avisos,
        "divergencias": [d.como_dict() for d in bloqueantes],
        "permitidas": [d.como_dict() for d in permitidas],
        "permitirNaoUsado": nao_usados,
        "aceitas": aceitas,
    }
    if a.json:
        destino = Path(a.json)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.stdout.write(formatar_relatorio(res, a.max_itens))
    return res["codigo"]


if __name__ == "__main__":
    sys.exit(main())
