# -*- coding: utf-8 -*-
"""
Orquestra a coleta, valida e publica o pacote de dados `data/quimica/` (DATA_CONTRACT.md).

    python pipeline/build.py --assinar-com secrets/data_signing_key.pem        # build completo (leva ~30 min na 1ª vez)
    python pipeline/build.py --rapido --assinar-com secrets/data_signing_key.pem   # 300 compostos, textos reduzidos
    python pipeline/build.py --rapido --offline --cache pipeline/tests/fixtures/cache --out /tmp/pacote   # sem rede
    python pipeline/build.py --idiomas pt-BR,en --sem-textos-idiomas ...   # só nomes/GHS multilíngues, sem Wikipédia en/es/de/fr

Idiomas (docs/I18N.md §4): `--idiomas` (padrão: pt-BR,en,es,de,fr) controla `elementos[].nomes`, `compostos[].nomes`/
`sinonimosPorIdioma`, `ghs_frases.json` por idioma, `regras.propriedades[].rotulos` e as pastas `textos/wikipedia-<lang>/`.
Textos vão em LOTES (`textos/<fonte>/lote-NNN.json`, até 200 trechos, ordenados por id) com `textos/index.json`.

Saída atômica: o pacote é montado em `<out>.novo`, validado e só então troca `<out>` (se a validação falhar, o pacote anterior
continua intacto). `stats.json` fica ao lado do manifesto mas fora do manifesto (muda a cada execução).
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import clp  # noqa: E402
import coleta_chebi  # noqa: E402
import coleta_compostos  # noqa: E402
import coleta_constantes  # noqa: E402
import coleta_elementos  # noqa: E402
import coleta_textos  # noqa: E402
import coleta_wikimedia  # noqa: E402
import fontes as F  # noqa: E402
import quimica_util as Q  # noqa: E402
import regras as R  # noqa: E402
import exclusoes  # noqa: E402
import selecao_compostos  # noqa: E402
import wikidata as W  # noqa: E402
from common import IDIOMAS, WIKI_POR_IDIOMA, dump_json, normalizar_idiomas, sha256_file  # noqa: E402
from http_cache import HttpCache, PASTA_CACHE  # noqa: E402
from pubchem import PubChem  # noqa: E402
from robots import Robots  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
OUT_PADRAO = RAIZ / "data" / "quimica"
TOPICOS_PADRAO = RAIZ / "dataset" / "topicos.json"
SCHEMA_VERSION = 1
BASE_URL = "https://saibatudo.net/quimica/data/"
LICENCAS_TEXTO_PERMITIDAS = {"CC BY-SA 4.0", "CC BY 4.0", "domínio público"}
PICTOGRAMAS_VALIDOS = {f"GHS0{i}" for i in range(1, 10)}
LOTE_TEXTOS = 200  # trechos por arquivo em textos/<fonte>/lote-NNN.json
INDEX_TEXTOS = "textos/index.json"
INDEX_TEXTOS_VERSAO = 1
# idioma (código do projeto) dos textos de cada fonte que não é Wikipédia em outro idioma
IDIOMA_DA_FONTE = {"wikipedia-pt": "pt-BR", "wikibooks-pt": "pt-BR", "chebi": "en", "gutenberg-14474": "en"}

# Decisões de fonte/licença que o pipeline aplica (docs/FONTES_E_LICENCAS.md §5); vão para stats.json
DECISOES = [
    "OpenStax Chemistry 2e fora do pacote: CC BY-NC-SA 4.0 e cláusula contra IA generativa (nenhum clone, nenhum texto).",
    "ICSC fora dos dados (sem licença de reuso; versão PT © ACT): cada composto com CAS leva só icscBuscaUrl (link de busca da OIT).",
    "PubChem: só campos calculados pelo NLM e identificadores; sinônimos de depositantes não são lidos.",
    "GHS: só a classificação harmonizada da UE (Regulamento 1272/2008, Anexo VI); notificada (ECHA C&L) e NITE-CMC ficam fora.",
    "Frases H/EUH em português: Anexo III do CLP consolidado (EUR-Lex/Cellar); combinadas ausentes viram junção dos textos oficiais.",
    "CAS: só do Wikidata (identificador, CC0), validado pelo dígito verificador; elementos não levam CAS (CAS do átomo != substância).",
    "Textos: Wikipédia pt e Wikilivros pt (CC BY-SA 4.0), ChEBI (CC BY 4.0), Faraday (domínio público). Gold Book: bloqueado por Cloudflare.",
    "Idiomas (I18N §4): nomes de elementos/compostos por idioma só do Wikidata (CC0); textos em en/es/de/fr só da Wikipédia daquele "
    "idioma (CC BY-SA 4.0), escolhidos pelo item do Wikidata (sitelinks) — nunca tradução automática; frases H por idioma do Anexo III do CLP.",
    "Textos em lotes (textos/<fonte>/lote-NNN.json + textos/index.json) em vez de um arquivo por trecho (cota de upload da Vercel).",
    "APIs oficiais (PUG REST, WDQS, /w/api.php) são acessadas apesar do Disallow genérico do robots.txt, conforme robots.EXCECOES.",
]


# ====================================================================================================== escrita
def escrever_json(out: Path, rel: str, obj, indent=None):
    dump_json(out / rel, obj, indent=indent)
    return rel


def chave_do_trecho(r):
    """`chave` do índice: slug do título (o que era o nome do arquivo sem `.json` e sem o contador `-NNN`)."""
    if r.get("_chave"):
        return r["_chave"]
    base = (r.get("_arquivo") or r["id"]).rsplit("/", 1)[-1]
    base = base[:-5] if base.endswith(".json") else base
    return re.sub(r"-\d{3}$", "", base) or base


def escrever_lotes(out: Path, pasta: str, registros, idioma, indice):
    """Grava os trechos de uma fonte em textos/<pasta>/lote-NNN.json (listas de até LOTE_TEXTOS, ordenadas por id para o lote
    de cada trecho ser estável entre builds) e acrescenta os lotes a `indice["lotes"]` (formato de docs/I18N.md §4).
    Devolve os caminhos relativos gravados."""
    rels = []
    ordenados = sorted(registros, key=lambda r: r["id"])
    for i in range(0, len(ordenados), LOTE_TEXTOS):
        parte = ordenados[i:i + LOTE_TEXTOS]
        rel = f"textos/{pasta}/lote-{i // LOTE_TEXTOS + 1:03d}.json"
        rels.append(escrever_json(out, rel, [{k: v for k, v in r.items() if not k.startswith("_")} for r in parte]))
        indice["lotes"].append({"caminho": rel, "fonte": pasta, "idioma": idioma,
                                "trechos": [{"id": r["id"], "titulo": r.get("titulo") or r.get("secao") or "", "chave": chave_do_trecho(r),
                                             "entidades": r.get("entidades") or {"elementos": [], "compostos": []}} for r in parte]})
    return rels


def novo_indice_textos():
    return {"versao": INDEX_TEXTOS_VERSAO, "lotes": []}


def registros_chebi(compostos, hoje):
    regs = []
    for c in compostos:
        d = c.get("definicaoChebi")
        if not d:
            continue
        num = d["chebiId"].split(":")[1]
        regs.append({
            "_arquivo": f"{num}.json", "_chave": coleta_wikimedia.slug(c["nome"]), "id": f"chebi-{num}", "fonte": "ChEBI", "licenca": d["licenca"],
            "url": coleta_chebi.URL_PAGINA.format(id=num), "capitulo": "", "secao": "Definição", "titulo": c["nome"],
            "textoOriginal": d["texto"], "textoPt": None, "traducao": "pendente", "idioma": "en",
            "palavrasChave": [c["nome"].lower(), c["formula"]], "entidades": {"elementos": [], "compostos": [c["cid"]]},
            "fontes": [Q.fonte(f"ChEBI {d['chebiId']}", coleta_chebi.URL_PAGINA.format(id=num), d["licenca"], hoje)],
        })
    return regs


def montar_ghs_frases(frases_h, compostos, hoje, info_clp, idiomas=None):
    """Dicionário H/EUH + pictogramas + palavras de advertência. `frases_h` = {código: texto pt | {idioma: texto}}.

    Compatibilidade: `frasesH[cod].texto`, `todasAsFrases`, `pictogramas` e `palavrasSinal` continuam em português (é o que o site e
    o Android leem hoje). Por idioma (I18N §4): `frasesH[cod].textoPorIdioma`, `todasAsFrasesPorIdioma`, `pictogramasPorIdioma` e
    `palavrasSinalPorIdioma`, sempre com pt-BR e os idiomas pedidos que o Anexo III trouxer. Combinadas ausentes no CLP viram
    junção dos textos oficiais dos componentes, idioma a idioma."""
    idiomas = list(idiomas or IDIOMAS)
    multi = {cod: clp.por_idioma(v) for cod, v in frases_h.items()}
    usados = sorted({h for c in compostos for h in c.get("ghs", {}).get("frasesH", [])})
    dic, sem_texto = {}, []
    for cod in usados:
        if cod in multi:
            dic[cod] = {"texto": multi[cod]["pt-BR"], "textoPorIdioma": multi[cod]}
        elif "+" in cod and all(p in multi for p in cod.split("+")):
            partes = cod.split("+")
            comuns = [i for i in IDIOMAS if all(multi[p].get(i) for p in partes)]
            por_idioma = {i: "; ".join(multi[p][i].rstrip(".") for p in partes) for i in comuns}
            dic[cod] = {"texto": por_idioma["pt-BR"], "textoPorIdioma": por_idioma,
                        "derivado": "junção dos textos oficiais dos componentes (código combinado ausente no Anexo III)",
                        "componentes": partes}
        else:
            sem_texto.append(cod)
    return {"versao": 1,
            "descricao": "Frases de perigo (H/EUH) do Regulamento (CE) n.º 1272/2008 (CLP), Anexo III, texto consolidado (EUR-Lex), "
                         "para os códigos usados nas classificações harmonizadas do pacote; `texto` em português, "
                         "`textoPorIdioma` nos idiomas do pacote (linhas PT/EN/ES/DE/FR da mesma tabela multilíngue).",
            "idiomas": [i for i in IDIOMAS if i in idiomas],
            "frasesH": dic, "usadosSemTexto": sem_texto,
            "todasAsFrases": {cod: d["pt-BR"] for cod, d in multi.items()},
            "todasAsFrasesPorIdioma": multi,
            "pictogramas": clp.PICTOGRAMAS, "pictogramasPorIdioma": clp.pictogramas_por_idioma(idiomas),
            "palavrasSinal": list(clp.PALAVRAS_SINAL), "palavrasSinalPorIdioma": clp.palavras_sinal_por_idioma(idiomas),
            "fontes": [Q.fonte(clp.NOME_FONTE, info_clp.get("url", clp.URL_EURLEX.format(celex="32008R1272")), clp.LICENCA, hoje)]}, sem_texto


# ====================================================================================================== manifesto
def montar_manifest(out: Path, rels, fontes_usadas, contagens, hoje, agora, idiomas=None):
    arquivos = {}
    for rel in sorted(set(rels)):
        p = out / rel
        arquivos[rel] = {"bytes": p.stat().st_size, "sha256": sha256_file(p)}
    import hashlib
    h = hashlib.sha256("".join(f"{k}:{v['sha256']}" for k, v in arquivos.items()).encode()).hexdigest()[:12]
    manifest = {
        "version": f"{agora.strftime('%Y%m%dT%H%M%SZ')}-{h}",
        "generatedAt": agora.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schemaVersion": SCHEMA_VERSION,
        "files": arquivos,
        "sources": [{"id": f["id"], "nome": f["nome"], "url": f["url"], "licenca": f["licenca"], "uso": f["uso"],
                     "acessadoEm": f["acessadoEm"]} for f in fontes_usadas],
        "licencas": F.licencas(fontes_usadas),
        "idiomas": [i for i in IDIOMAS if i in (idiomas or ["pt-BR"])],
        "contagens": contagens,
        "atribuicao": "Dados: PubChem (NCBI/NLM) e CODATA 2022 (NIST), domínio público; Wikidata (nomes por idioma), CC0; textos da "
                      "Wikipédia (português, inglês, espanhol, alemão e francês, cada trecho no idioma do artigo) e do Wikilivros em "
                      "português, CC BY-SA 4.0; ChEBI, CC BY 4.0; Faraday (Project Gutenberg #14474), domínio público; "
                      "frases H do Regulamento CLP (EUR-Lex), por idioma. Aplicativo independente.",
        "cliente": {"pollIntervalMinutes": 10080, "baseUrl": BASE_URL, "nlu": {"endpoint": "https://saibatudo.net/api/quimica/nlu"},
                    "ask": {"enabled": False}, "melhoria": {"enabled": False}},
    }
    dump_json(out / "manifest.json", manifest, indent=2)
    return manifest


# ====================================================================================================== validação
def validar(out: Path, previo=None, minimos=None):
    """Gates de qualidade: devolve a lista de erros (vazia = pacote válido)."""
    mn = {"elementos": 118, "compostos": 250, "constantes": 40, "textos": 100}
    mn.update(minimos or {})
    erros = []
    try:
        m = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return [f"manifest.json ilegível: {exc}"]
    for rel, info in m["files"].items():
        p = out / rel
        if not p.exists():
            erros.append(f"arquivo ausente: {rel}")
        elif sha256_file(p) != info["sha256"] or p.stat().st_size != info["bytes"]:
            erros.append(f"checksum/tamanho divergente: {rel}")
    if (out / "seguranca").exists():
        erros.append("seguranca/ não pode existir no pacote (ICSC fora dos dados)")

    def ler(rel):
        return json.loads((out / rel).read_text(encoding="utf-8"))

    # elementos
    try:
        els = ler("elementos.json")
        zs = [e["z"] for e in els]
        if sorted(zs) != list(range(1, 119)) or len(set(zs)) != len(zs):
            erros.append(f"elementos: Z de 1 a 118 sem repetição falhou ({len(zs)} registros)")
        for e in els:
            for k in ("z", "simbolo", "nome", "nomeEn", "periodo", "bloco", "categoria", "fontes"):
                if not e.get(k):
                    erros.append(f"elemento {e.get('z')}: campo obrigatório ausente {k}")
            for k, ref in (("massaAtomica", None), ("pontoFusaoK", None), ("pontoEbulicaoK", None), ("densidadeKgm3", None),
                           ("energiaIonizacaoKJmol", None), ("raioAtomicoPm", None)):
                if k in e and not (isinstance(e[k], (int, float)) and e[k] > 0):
                    erros.append(f"elemento {e['z']}: {k} inválido ({e[k]!r})")
            if "estadoPadrao" in e and e["estadoPadrao"] not in ("solido", "liquido", "gas"):
                erros.append(f"elemento {e['z']}: estadoPadrao inválido")
            if "nomes" in e and (not isinstance(e["nomes"], dict) or e["nomes"].get("pt-BR") != e.get("nome")
                                 or not set(e["nomes"]) <= set(IDIOMAS)):
                erros.append(f"elemento {e['z']}: nomes inválido ({e['nomes']!r})")
    except (OSError, KeyError, ValueError) as exc:
        erros.append(f"elementos.json inválido: {exc}")
        els = []
    if len(els) < mn["elementos"]:
        erros.append(f"elementos insuficientes: {len(els)}")

    # compostos
    cids, total = set(), 0
    for rel in sorted(m["files"]):
        if rel.startswith("compostos/lote-"):
            for c in ler(rel):
                total += 1
                if c.get("cid") in cids:
                    erros.append(f"CID duplicado {c.get('cid')}")
                cids.add(c.get("cid"))
                for k in ("cid", "nome", "formula", "formulaHill", "massaMolar", "smiles", "fontes"):
                    if not c.get(k):
                        erros.append(f"composto {c.get('cid')}: campo obrigatório ausente {k}")
                if c.get("cas") and not Q.cas_valido(c["cas"]):
                    erros.append(f"composto {c['cid']}: CAS inválido {c['cas']}")
                if ("icscBuscaUrl" in c) != ("cas" in c):
                    erros.append(f"composto {c['cid']}: icscBuscaUrl deve existir exatamente quando há CAS")
                g = c.get("ghs")
                if g and (not set(g.get("pictogramas", [])) <= PICTOGRAMAS_VALIDOS or not g.get("fonte")):
                    erros.append(f"composto {c['cid']}: ghs inválido")
                if "ghs" in c and "1272/2008" not in c["ghs"].get("fonte", ""):
                    erros.append(f"composto {c['cid']}: ghs só pode vir da classificação harmonizada (CLP)")
                for campo in ("nomes", "sinonimosPorIdioma"):
                    if campo in c and (not isinstance(c[campo], dict) or not set(c[campo]) <= set(IDIOMAS)):
                        erros.append(f"composto {c['cid']}: {campo} inválido")
                if "nomes" in c and "pt-BR" in c["nomes"] and c["nomes"]["pt-BR"] != c.get("nome"):
                    erros.append(f"composto {c['cid']}: nomes.pt-BR diverge de nome")
    if total < mn["compostos"]:
        erros.append(f"compostos insuficientes: {total}")
    if previo and previo.get("contagens", {}).get("compostos") and total < 0.8 * previo["contagens"]["compostos"]:
        erros.append(f"queda anormal de compostos: {previo['contagens']['compostos']} -> {total}")
    try:
        idx = ler("compostos/index.json")
        if set(map(int, idx["porCid"])) != cids:
            erros.append("compostos/index.json diverge dos lotes")
    except (OSError, KeyError, ValueError) as exc:
        erros.append(f"compostos/index.json inválido: {exc}")

    # constantes
    try:
        cs = ler("constantes.json")["constantes"]
        if len(cs) < mn["constantes"]:
            erros.append(f"constantes insuficientes: {len(cs)}")
        for c in cs:
            if not isinstance(c.get("valor"), (int, float)) or not c.get("fontes"):
                erros.append(f"constante {c.get('id')} inválida")
    except (OSError, KeyError, ValueError) as exc:
        erros.append(f"constantes.json inválido: {exc}")

    # textos: licenças permitidas, ids únicos, campos; lotes (listas de até LOTE_TEXTOS) ou um arquivo por trecho (legado)
    ids, n_textos, ids_por_lote = set(), 0, {}
    for rel in m["files"]:
        if not rel.startswith("textos/") or rel == INDEX_TEXTOS:
            continue
        conteudo = ler(rel)
        itens = conteudo if isinstance(conteudo, list) else [conteudo]
        if isinstance(conteudo, list) and len(conteudo) > LOTE_TEXTOS:
            erros.append(f"{rel}: lote com {len(conteudo)} trechos (máximo {LOTE_TEXTOS})")
        ids_por_lote[rel] = []
        for t in itens:
            n_textos += 1
            if not isinstance(t, dict):
                erros.append(f"{rel}: trecho não é objeto")
                continue
            if t.get("id") in ids:
                erros.append(f"texto com id duplicado {t.get('id')}")
            ids.add(t.get("id"))
            ids_por_lote[rel].append(t.get("id"))
            for k in ("id", "fonte", "licenca", "url", "textoOriginal", "traducao", "fontes"):
                if not t.get(k):
                    erros.append(f"texto {t.get('id')}: campo obrigatório ausente {k}")
            if t.get("licenca") not in LICENCAS_TEXTO_PERMITIDAS:
                erros.append(f"texto {t.get('id')}: licença não permitida {t.get('licenca')!r}")
            if "openstax" in (t.get("fonte", "") + t.get("id", "")).lower():
                erros.append(f"texto {t.get('id')}: OpenStax não pode entrar")
            if not 30 <= len(t.get("textoOriginal", "")) <= 1600 and not str(t.get("id", "")).startswith("chebi-"):
                erros.append(f"texto {t.get('id')}: tamanho fora do esperado ({len(t.get('textoOriginal', ''))})")
    if n_textos < mn["textos"]:
        erros.append(f"textos insuficientes: {n_textos}")
    if INDEX_TEXTOS in m["files"]:  # o índice tem de descrever exatamente os lotes do manifesto
        try:
            idx = ler(INDEX_TEXTOS)
            if idx.get("versao") != INDEX_TEXTOS_VERSAO or not isinstance(idx.get("lotes"), list):
                erros.append(f"{INDEX_TEXTOS}: formato inválido")
            else:
                vistos = set()
                for lote in idx["lotes"]:
                    cam = lote.get("caminho")
                    if cam not in ids_por_lote:
                        erros.append(f"{INDEX_TEXTOS}: lote {cam!r} não está no manifesto")
                        continue
                    if not lote.get("fonte") or lote.get("idioma") not in IDIOMAS:
                        erros.append(f"{INDEX_TEXTOS}: lote {cam} sem fonte/idioma válidos")
                    if [t.get("id") for t in lote.get("trechos", [])] != ids_por_lote[cam]:
                        erros.append(f"{INDEX_TEXTOS}: ids do lote {cam} divergem do arquivo")
                    for t in lote.get("trechos", []):
                        if not t.get("chave") or "titulo" not in t or not isinstance(t.get("entidades"), dict):
                            erros.append(f"{INDEX_TEXTOS}: trecho {t.get('id')} sem titulo/chave/entidades")
                            break
                    vistos.add(cam)
                faltam = [c for c in ids_por_lote if c not in vistos and ids_por_lote[c] and c.rsplit("/", 1)[-1].startswith("lote-")]
                if faltam:
                    erros.append(f"{INDEX_TEXTOS}: lotes fora do índice: {faltam[:5]}")
        except (OSError, KeyError, ValueError, AttributeError) as exc:
            erros.append(f"{INDEX_TEXTOS} inválido: {exc}")

    for rel in ("regras.json", "fontes.json", "ghs_frases.json"):
        if rel not in m["files"]:
            erros.append(f"{rel} ausente do manifesto")
    return erros


def trocar_atomicamente(novo: Path, destino: Path):
    """Troca `destino` por `novo` sem deixar `destino` quebrado (o antigo vira `.antigo` até a troca concluir)."""
    antigo = destino.with_name(destino.name + ".antigo")
    if antigo.exists():
        shutil.rmtree(antigo)
    tinha = destino.exists()
    if tinha:
        os.replace(destino, antigo)
    # Windows: o antivírus ou um editor com a pasta aberta segura a árvore recém-escrita por alguns segundos e o rename dá
    # "Acesso negado" (aconteceu no build de 2.000 compostos, 12/10/2026): tenta de novo antes de desfazer a troca
    for tentativa in range(6):
        try:
            os.replace(novo, destino)
            break
        except OSError:
            if tentativa == 5:
                if tinha:
                    os.replace(antigo, destino)
                raise
            time.sleep(2 * (tentativa + 1))
    if antigo.exists():
        shutil.rmtree(antigo, ignore_errors=True)


# ====================================================================================================== orquestração
def tentar(stats, nome, fn, log, obrigatoria=False, vazio=None):
    """Executa uma etapa; se falhar e não for obrigatória, registra em stats e devolve `vazio`."""
    t0 = time.time()
    try:
        r = fn()
        stats["familias"].setdefault(nome, {})["status"] = "ok"
        stats["familias"][nome]["segundos"] = round(time.time() - t0, 1)
        return r
    except Exception as exc:  # noqa: BLE001
        if obrigatoria:
            raise
        log(f"  !! {nome} falhou: {exc}")
        stats["familias"][nome] = {"status": "falhou", "erro": f"{type(exc).__name__}: {exc}"[:300],
                                   "segundos": round(time.time() - t0, 1)}
        return vazio


def construir(opts, log=print):
    t0 = time.time()
    agora = Q.agora_utc()
    hoje = opts.hoje or Q.hoje_iso()
    # --paciente: o bloqueio do PubChem (429) dura horas; em vez de desistir em ~18 min, espera até 15 min por tentativa, 40 vezes,
    # e pede a 1 req/s (o progresso fica no cache, então o build pode ficar a noite toda e terminar)
    paciente = dict(tentativas=40, espera_max_429=900) if getattr(opts, 'paciente', False) else {}
    http = HttpCache(pasta=opts.cache, offline=opts.offline, log=log, **paciente)
    if paciente:
        http.limitador.reduzir('pubchem.ncbi.nlm.nih.gov', fator=0.5, minimo=0.5)
    idiomas = normalizar_idiomas(getattr(opts, "idiomas", None) or IDIOMAS)
    idiomas_textos = [] if getattr(opts, "sem_textos_idiomas", False) else [i for i in idiomas if i != "pt-BR"]
    stats = {"geradoEm": agora.strftime("%Y-%m-%dT%H:%M:%SZ"), "modo": "rapido" if opts.rapido else "completo",
             "idiomas": idiomas, "idiomasTextos": idiomas_textos,
             "familias": {}, "contagens": {}, "decisoes": list(DECISOES), "avisos": []}
    out = Path(opts.out)
    novo = out.with_name(out.name + ".novo")
    if novo.exists():
        shutil.rmtree(novo)
    novo.mkdir(parents=True)
    rels, fontes_usadas = [], {"pubchem", "codata", "wikidata", "icsc-oit"}

    try:
        log("== elementos")
        elementos, st = tentar(stats, "elementos", lambda: coleta_elementos.coletar(http, hoje, idiomas), log, obrigatoria=True)
        artigos_elementos = st.pop("_artigos", {})  # {QID: {idioma: título}} para a Wikipédia nos outros idiomas
        stats["familias"]["elementos"].update(st)
        rels.append(escrever_json(novo, "elementos.json", elementos))

        log("== constantes")
        constantes, st = tentar(stats, "constantes", lambda: coleta_constantes.coletar(http, hoje), log, obrigatoria=True)
        stats["familias"]["constantes"].update(st)
        rels.append(escrever_json(novo, "constantes.json", {"constantes": constantes}))

        log("== frases H (CLP, EUR-Lex)")
        r = tentar(stats, "clp", lambda: clp.coletar(http, hoje, idiomas), log, vazio=({}, {}))
        frases_h, st_clp = r
        stats["familias"]["clp"].update(st_clp)
        if frases_h:
            fontes_usadas.add("clp-eurlex")

        log("== compostos")
        # --pubchem-offline: o PubChem só responde do cache (útil quando ele bloqueia o IP com 429); as outras fontes seguem na rede
        pubchem = PubChem(HttpCache(pasta=opts.cache, offline=True, log=log) if opts.pubchem_offline else http)
        rapido_n = opts.limite_compostos if opts.limite_compostos is not None else (300 if opts.rapido else None)
        selecao, st_sel = tentar(stats, "selecaoCompostos",
                                 lambda: selecao_compostos.selecionar(http, pubchem, alvo=opts.alvo, rapido_n=rapido_n, log=log),
                                 log, obrigatoria=True)
        stats["familias"]["selecaoCompostos"].update(st_sel)
        compostos, meta, st_cmp = tentar(stats, "compostos",
                                         lambda: coleta_compostos.coletar(http, pubchem, selecao, hoje, frases_h, log=log,
                                                                                  pesos={e["simbolo"]: e["massaAtomica"] for e in elementos if e.get("massaAtomica")},
                                                                                  qids_elementos=frozenset(e["wikidata"] for e in elementos if e.get("wikidata")),
                                                                                  idiomas=idiomas),
                                         log, obrigatoria=True)
        stats["familias"]["compostos"].update(st_cmp)
        # segurança: fora do núcleo os agentes de guerra química e as drogas de uso proscrito que viriam pela popularidade
        cids_fixos = {s_["cid"] for s_ in selecao if s_.get("origem") != "wikidata"}
        compostos, excluidos = exclusoes.filtrar_sensiveis(compostos, cids_fixos, log=log)
        stats["familias"]["compostos"]["excluidosPorSeguranca"] = excluidos
        if any("definicaoChebi" in c for c in compostos):
            fontes_usadas.add("chebi")

        ghs_json, sem_texto = montar_ghs_frases(frases_h, compostos, hoje, st_clp, idiomas)
        stats["familias"]["clp"]["codigosSemTextoPt"] = sem_texto
        rels.append(escrever_json(novo, "ghs_frases.json", ghs_json))

        lotes, indice = coleta_compostos.para_lotes(compostos)
        for nome, parte in lotes:
            rels.append(escrever_json(novo, f"compostos/{nome}.json", parte))
        indice["lotes"] = [n for n, _ in lotes]
        rels.append(escrever_json(novo, "compostos/index.json", indice))

        log("== textos")
        nomes_en = {e["nomeEn"].lower(): e["simbolo"] for e in elementos}
        n_textos, indice_textos = {}, novo_indice_textos()
        lim = None
        if opts.rapido or opts.limite_textos is not None:
            n = opts.limite_textos if opts.limite_textos is not None else 30
            lim = {"elementos": n, "compostos": max(1, n // 2), "conceitos": n}
        if not opts.sem_wikimedia:
            regs, st = tentar(stats, "wikipedia", lambda: coleta_wikimedia.coletar_wikipedia(
                http, elementos, compostos, meta, opts.topicos, hoje, limites=lim, log=log), log, vazio=([], {}))
            conceitos, temas = st.pop("_conceitos", []), st.pop("_temas", {})
            stats["familias"]["wikipedia"].update(st)
            if regs:
                rels += escrever_lotes(novo, "wikipedia-pt", regs, "pt-BR", indice_textos)
                fontes_usadas.add("wikipedia-pt")
            n_textos["wikipedia-pt"] = len(regs)
            # os mesmos artigos nos outros idiomas, pelo item do Wikidata (elementos e compostos já trazem os títulos; os conceitos
            # pedem uma leitura de sitelinks: ~1 chamada por 50 itens, uma vez para todos os idiomas)
            if idiomas_textos:
                titulos_conceitos = tentar(stats, "sitelinksConceitos",
                                           lambda: W.entidades(http, [c["qid"] for c in conceitos], idiomas_textos, log=log), log, vazio={})
                for idioma in idiomas_textos:
                    lang = WIKI_POR_IDIOMA[idioma]
                    titulos = {q: a.get(idioma) for q, a in artigos_elementos.items() if a.get(idioma)}
                    titulos.update({m["qid"]: m["artigos"][idioma] for m in meta.values() if m.get("qid") and m.get("artigos", {}).get(idioma)})
                    titulos.update({q: e["artigos"][idioma] for q, e in (titulos_conceitos or {}).items() if e.get("artigos", {}).get(idioma)})
                    regs, st = tentar(stats, f"wikipedia-{lang}", lambda: coleta_wikimedia.coletar_wikipedia_idioma(
                        http, idioma, elementos, compostos, meta, conceitos, titulos, temas, hoje, limites=lim, log=log), log, vazio=([], {}))
                    stats["familias"][f"wikipedia-{lang}"].update(st)
                    if regs:
                        rels += escrever_lotes(novo, f"wikipedia-{lang}", regs, idioma, indice_textos)
                        fontes_usadas.add(f"wikipedia-{lang}")
                    n_textos[f"wikipedia-{lang}"] = len(regs)
            regs, st = tentar(stats, "wikilivros", lambda: coleta_wikimedia.coletar_wikilivros(
                http, hoje, limite_paginas=(lim["conceitos"] // 2 if lim else None), log=log), log, vazio=([], {}))
            stats["familias"]["wikilivros"].update(st)
            if regs:
                rels += escrever_lotes(novo, "wikibooks-pt", regs, "pt-BR", indice_textos)
                fontes_usadas.add("wikibooks-pt")
            n_textos["wikibooks-pt"] = len(regs)
        regs = registros_chebi(compostos, hoje)
        if regs:
            rels += escrever_lotes(novo, "chebi", regs, "en", indice_textos)
        n_textos["chebi"] = len(regs)

        def faraday():
            html = coleta_textos.ler_gutenberg(http, opts.gutenberg_zip, log)
            return coleta_textos.coletar_gutenberg(html, hoje, nomes_en)
        regs, st = tentar(stats, "faraday", faraday, log, vazio=([], {}))
        stats["familias"]["faraday"].update(st)
        if regs:
            rels += escrever_lotes(novo, coleta_textos.FONTE_GUTENBERG_DIR, regs, "en", indice_textos)
            fontes_usadas.add("gutenberg-14474")
        n_textos["gutenberg-14474"] = len(regs)

        def goldbook():
            rb = Robots(http)
            if not rb.permitido(coleta_textos.URL_GOLDBOOK):
                return {"status": "pulado", "motivo": "robots.txt não permite"}
            try:
                r = http.get(coleta_textos.URL_GOLDBOOK, ttl_s=24 * 3600)
            except Exception as exc:  # noqa: BLE001
                return {"status": "bloqueado", "motivo": str(exc)[:200]}
            if r.status != 200 or b"Just a moment" in r.corpo[:4000]:
                return {"status": "bloqueado", "motivo": f"HTTP {r.status} (desafio anti-robô do Cloudflare)"}
            return {"status": "acessivel-nao-implementado",
                    "motivo": "o site respondeu; a coleta por verbete não foi implementada (reavaliar com o download oficial JSON/XML)"}
        r = tentar(stats, "goldBook", goldbook, log, vazio={})
        stats["familias"]["goldBook"].update(r)
        n_textos["gold-book"] = 0
        stats["contagens"]["textosPorFonte"] = n_textos
        indice_textos["lotes"].sort(key=lambda l: l["caminho"])
        rels.append(escrever_json(novo, INDEX_TEXTOS, indice_textos))
        textos_por_idioma = {}
        for lote in indice_textos["lotes"]:
            textos_por_idioma[lote["idioma"]] = textos_por_idioma.get(lote["idioma"], 0) + len(lote["trechos"])

        log("== regras, fontes e manifesto")
        rels.append(escrever_json(novo, "regras.json", R.montar(hoje, idiomas)))
        usadas = F.gerar(fontes_usadas, hoje)
        rels.append(escrever_json(novo, "fontes.json", {"fontes": usadas}))
        contagens = {"elementos": len(elementos), "compostos": len(compostos), "constantes": len(constantes),
                     "textos": sum(n_textos.values()), "textosPorFonte": n_textos,
                     "textosPorIdioma": {i: textos_por_idioma[i] for i in IDIOMAS if i in textos_por_idioma},
                     "lotesDeTextos": len(indice_textos["lotes"]),
                     "compostosComGhsHarmonizado": sum(1 for c in compostos if "ghs" in c),
                     "compostosComCas": sum(1 for c in compostos if "cas" in c),
                     "compostosComNomePorIdioma": {i: sum(1 for c in compostos if i in c.get("nomes", {})) for i in idiomas},
                     "elementosComNomePorIdioma": {i: sum(1 for e in elementos if i in e.get("nomes", {})) for i in idiomas}}
        stats["contagens"].update(contagens)
        previo = None
        if (out / "manifest.json").exists():
            try:
                previo = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
            except ValueError:
                previo = None
        manifest = montar_manifest(novo, rels, usadas, contagens, hoje, agora, idiomas)
        if opts.assinar_com:
            from sign import assinar
            assinar(novo / "manifest.json", Path(opts.assinar_com))
            log("  manifesto assinado (manifest.sig)")

        stats["fontes"] = [f["id"] for f in usadas]
        stats["http"] = http.stats
        stats["duracaoSegundos"] = round(time.time() - t0, 1)
        stats["versao"] = manifest["version"]
        minimos = {"compostos": 10, "textos": 10, "constantes": 40} if (opts.rapido or opts.limite_compostos) else None
        if opts.sem_wikimedia:
            minimos = dict(minimos or {}, textos=1)
        erros = validar(novo, previo, minimos)
        stats["erros"] = erros
        dump_json(novo / "stats.json", stats, indent=2)
        try:  # cópia fora do pacote, útil para diagnosticar uma validação que falhou
            dump_json(Path(opts.cache) / "ultimo_stats.json", stats, indent=2)
        except OSError:
            pass
        if erros:
            return None, erros, stats
        trocar_atomicamente(novo, out)
        return manifest, [], stats
    finally:
        if novo.exists():
            shutil.rmtree(novo, ignore_errors=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Constrói, valida e assina o pacote de dados do SaibaTudo Química.")
    ap.add_argument("--out", default=str(OUT_PADRAO))
    ap.add_argument("--cache", default=str(PASTA_CACHE))
    ap.add_argument("--assinar-com", help="chave privada ECDSA (PEM) para assinar o manifesto")
    ap.add_argument("--rapido", action="store_true", help="300 compostos (só lista fixa) e textos reduzidos; para testes e CI")
    ap.add_argument("--offline", action="store_true", help="nunca usa a rede; falha se faltar entrada no cache")
    ap.add_argument("--paciente", action="store_true", help="espera o PubChem desbloquear (até 15 min por tentativa, 40 tentativas) e pede a 1 req/s")
    ap.add_argument("--pubchem-offline", action="store_true", help="PubChem só do cache (ele bloqueia o IP com 429 depois de muitas requisições)")
    ap.add_argument("--alvo", type=int, default=selecao_compostos.ALVO_PADRAO, help="tamanho do núcleo de compostos")
    ap.add_argument("--limite-compostos", type=int, help="limita o núcleo a N compostos da lista fixa (testes)")
    ap.add_argument("--limite-textos", type=int, help="limita os textos da Wikimedia (testes)")
    ap.add_argument("--sem-wikimedia", action="store_true", help="não coleta Wikipédia/Wikilivros")
    ap.add_argument("--idiomas", default=",".join(IDIOMAS),
                    help="idiomas do pacote, separados por vírgula (pt-BR sempre entra); padrão: %(default)s")
    ap.add_argument("--sem-textos-idiomas", action="store_true",
                    help="não coleta a Wikipédia em en/es/de/fr (nomes, GHS e rótulos por idioma continuam)")
    ap.add_argument("--topicos", default=str(TOPICOS_PADRAO))
    ap.add_argument("--gutenberg-zip", help="zip local do HTML do Gutenberg #14474 (reserva se a web falhar)")
    ap.add_argument("--hoje", help="data de acesso AAAA-MM-DD (padrão: hoje, UTC)")
    a = ap.parse_args(argv)
    try:
        manifest, erros, stats = construir(a)
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        print("\nFALHA NO BUILD (o pacote anterior foi mantido).")
        return 1
    if erros:
        print("\nVALIDAÇÃO FALHOU (o pacote anterior foi mantido):")
        for e in erros[:40]:
            print("  -", e)
        return 2
    print(f"\nPacote válido: {manifest['version']} | {stats['contagens']['compostos']} compostos | "
          f"{stats['contagens']['textos']} textos | {stats['duracaoSegundos']} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
