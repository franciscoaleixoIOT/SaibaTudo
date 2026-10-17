# -*- coding: utf-8 -*-
"""Auditoria do casamento composto -> entrada harmonizada do CLP (Anexo VI) num pacote, sem rede.

Lê os compostos com `ghs` do pacote, as respostas do PUG View ("GHS Classification") e o texto consolidado do CLP no cache do
pipeline (`pipeline/.cache`), e reaplica a regra de `clp.escolher_ghs` (chave forte: CAS, EC, índice ou nome exato; nunca
UVCB/produto-por-processo/massa de reação). Lista os casamentos suspeitos do pacote e o que a regra nova faz com cada um.

    python tools/auditar_ghs.py [--pacote data/quimica] [--cache pipeline/.cache] [--json saida.json] [--todos]
Saída 0 sempre que a auditoria roda (é relatório, não gate); 2 se faltar o pacote ou o Anexo VI no cache.
"""
import argparse
import gzip
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "pipeline"))
import clp  # noqa: E402
import pubchem as P  # noqa: E402
from http_cache import CacheMiss, HttpCache  # noqa: E402

PREFIXO_CLP = "http://publications.europa.eu/resource/celex/" + clp.CELEX_BASE + "-"


def ler_cache_por_url(pasta, prefixo):
    """(url, corpo) da entrada mais recente do cache cuja URL começa com `prefixo` (o celex consolidado muda de data)."""
    melhor = None
    for meta_f in Path(pasta).glob("*.json"):
        try:
            meta = json.loads(meta_f.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        url = meta.get("url") or ""
        if url.startswith(prefixo) and meta.get("status") == 200 and (melhor is None or url > melhor[0]):
            melhor = (url, meta_f, meta)
    if not melhor:
        return None, None
    url, meta_f, meta = melhor
    corpo = meta_f.with_suffix(".body").read_bytes()
    return url, (gzip.decompress(corpo) if meta.get("gz") else corpo)


def compostos(pacote):
    for f in sorted((Path(pacote) / "compostos").glob("lote-*.json")):
        yield from json.loads(f.read_text(encoding="utf-8"))


def suspeitas(c, vi):
    """Motivos de suspeita do casamento PUBLICADO (sem a regra nova)."""
    g = c["ghs"]
    out = []
    if clp.nao_e_substancia_pura(g.get("entrada"), (vi or {}).get("nome")):
        out.append("entrada não é substância pura (UVCB/produto-por-processo/massa de reação)")
    if vi is None:
        out.append("índice da entrada desconhecido (sem chave para conferir)")
    else:
        if c.get("cas") and vi["cas"] and c["cas"] not in vi["cas"]:
            out.append(f"CAS diferente ({c['cas']} x {', '.join(vi['cas'])})")
        if not vi["cas"] and not vi["ec"]:
            out.append("entrada sem CAS nem EC")
        elif not vi["cas"]:
            out.append("entrada sem CAS")
    if not (clp.nomes_da_entrada(g.get("entrada"), (vi or {}).get("nome")) & clp.nomes_do_composto(c)) and \
            not (vi and c.get("cas") in vi["cas"]):
        out.append("nome da entrada sem relação exata com o composto")
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--pacote", default=str(RAIZ / "data" / "quimica"))
    ap.add_argument("--cache", default=str(RAIZ / "pipeline" / ".cache"))
    ap.add_argument("--json", help="grava o relatório completo em JSON")
    ap.add_argument("--todos", action="store_true", help="lista também os casamentos que a regra nova mantém sem suspeita")
    a = ap.parse_args(argv)
    if not (Path(a.pacote) / "compostos").is_dir():
        print(f"pacote não encontrado: {a.pacote}", file=sys.stderr)
        return 2
    url_clp, corpo = ler_cache_por_url(a.cache, PREFIXO_CLP)
    if not corpo:
        print("texto consolidado do CLP não está no cache (rode o build uma vez com rede)", file=sys.stderr)
        return 2
    anexo_vi = clp.parse_anexo_vi(corpo.decode("utf-8", errors="replace"))
    pc = P.PubChem(HttpCache(pasta=a.cache, offline=True, log=lambda *_: None, ttl_s=10 ** 10))

    linhas, cont = [], {"comGhs": 0, "suspeitos": 0, "mantidos": 0, "trocados": 0, "removidos": 0, "semCachePugView": 0,
                        "casadoPor": {k: 0 for k in clp.CASADO_POR}}
    for c in compostos(a.pacote):
        if "ghs" not in c:
            continue
        cont["comGhs"] += 1
        g = c["ghs"]
        try:
            cands = pc.ghs_harmonizados(c["cid"])
        except CacheMiss:
            cands = None
            cont["semCachePugView"] += 1
        publicado = next((x for x in cands or [] if x.get("entrada") == g.get("entrada") and x.get("frasesH") == g.get("frasesH")), None)
        idx_pub = (publicado or {}).get("indice")
        vi = anexo_vi.get(idx_pub) if idx_pub else None
        sus = suspeitas(c, vi)
        if cands is None:
            novo, rej, destino = None, [], "sem cache do PUG View (não conferível)"
        else:
            novo, rej = clp.escolher_ghs(cands, c, anexo_vi)
            if not novo:
                destino = "removido"
                cont["removidos"] += 1
            elif novo.get("indice") == idx_pub:
                destino = f"mantido ({novo['casadoPor']})"
                cont["mantidos"] += 1
            else:
                destino = f"trocado por {novo.get('indice')} {novo.get('entrada')!r} ({novo['casadoPor']})"
                cont["trocados"] += 1
            if novo:
                cont["casadoPor"][novo["casadoPor"]] += 1
        if sus:
            cont["suspeitos"] += 1
        if sus or a.todos or not destino.startswith("mantido"):
            linhas.append({"cid": c["cid"], "nome": c["nome"], "cas": c.get("cas"), "entradaPublicada": g.get("entrada"),
                           "indicePublicado": idx_pub, "anexoVi": vi, "frasesH": g.get("frasesH"), "suspeitas": sus,
                           "regraNova": destino, "candidatos": len(cands or []),
                           "rejeitados": rej})
    print(f"CLP: {url_clp} | Anexo VI: {len(anexo_vi)} entradas | pacote: {a.pacote}")
    print(json.dumps(cont, ensure_ascii=False))
    for ln in sorted(linhas, key=lambda x: (not x["regraNova"].startswith(("removido", "trocado")), x["cid"])):
        vi = ln["anexoVi"] or {}
        print(f"- {ln['cid']} {ln['nome']} (CAS {ln['cas']}) <- {ln['indicePublicado']} {ln['entradaPublicada']!r} "
              f"[Anexo VI: CAS {vi.get('cas')}, EC {vi.get('ec')}] {ln['frasesH']}\n    suspeitas: {'; '.join(ln['suspeitas']) or '-'}"
              f"\n    regra nova: {ln['regraNova']}")
    if a.json:
        Path(a.json).write_text(json.dumps({"contagens": cont, "linhas": linhas}, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
