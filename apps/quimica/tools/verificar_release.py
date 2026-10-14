# -*- coding: utf-8 -*-
"""
Verificação ESTÁTICA do APK de release (R8) do SaibaTudo Química, adaptada de apps/eleicoes2026/tools/verificar_release.py.

Por que existe: o primeiro release assinado do app de eleições crashou ao abrir porque o R8 removeu WorkDatabase_Impl (Room/WorkManager
criam essas classes por nome); testes unitários e build de debug não pegaram. Esta checagem lê o DEX direto (sem Android SDK) e confere:
  1. as classes instanciadas por reflexão/pelo sistema estão DEFINIDAS no dex (lista OBRIGATORIAS);
  2. o pacote de dados embutido (assets/quimica/) está completo: manifest.json + manifest.sig e todos os arquivos que o manifesto lista,
     com o tamanho declarado; e, se existir data/quimica/manifest.json no repositório, que a versão embutida é a mesma (pacote real, não o
     fixture de testes nem um pacote velho);
  3. os assets da estrutura 2D (molecula.html e o SmilesDrawer vendorizado com a licença);
  4. o tamanho do APK está numa faixa plausível.
É complementar: não substitui abrir o release num aparelho antes de publicar.

Uso:  python tools/verificar_release.py app/build/outputs/apk/release/app-release.apk [--sem-dados]
Código de saída: 0 = ok; 1 = problema; 2 = erro de uso.
"""
import json
import struct
import sys
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PACOTE_REPO = RAIZ / "data" / "quimica" / "manifest.json"

# Classes que DEVEM existir no release. Formato de descritor DEX: "Lpacote/Classe;".
OBRIGATORIAS = [
    # criada por reflexão pelo Room (o WorkManager guarda nele a fila da atualização semanal de dados): foi o crash do 1º release de eleições
    "Landroidx/work/impl/WorkDatabase_Impl;",
    # componentes e classes que o sistema ou o WorkManager instanciam pelo nome (AndroidManifest.xml / WorkRequest)
    "Lnet/saibatudo/quimica/ui/MainActivity;",
    "Lnet/saibatudo/quimica/SaibaTudoApp;",
    "Lnet/saibatudo/quimica/data/bundle/DataUpdateWorker;",
    # manifesto do pacote de dados (regras de keep em app/src/main/keepRules/rules.keep)
    "Lnet/saibatudo/quimica/data/bundle/BundleManifest;",
]
# Assets que o app abre pelo caminho.
ASSETS_OBRIGATORIOS = [
    "assets/molecula.html",
    "assets/vendor/smiles-drawer.min.js",
    "assets/vendor/LICENSE-smiles-drawer.md",
    "assets/quimica/manifest.json",
    "assets/quimica/manifest.sig",
]
TAMANHO_MIN = 4 * 1024 * 1024
TAMANHO_MAX = 60 * 1024 * 1024


def _uleb128(b: bytes, i: int):
    r = s = 0
    while True:
        x = b[i]
        i += 1
        r |= (x & 0x7F) << s
        if not x & 0x80:
            return r, i
        s += 7


def classes_definidas(dex: bytes) -> set:
    """Descritores das classes DEFINIDAS (class_defs) num arquivo DEX. Leitor mínimo do formato (header, string_ids, type_ids, class_defs)."""
    if dex[:4] != b"dex\n":
        raise ValueError("não é um arquivo DEX")
    str_n, str_off, tipo_n, tipo_off = struct.unpack_from("<IIII", dex, 0x38)
    cls_n, cls_off = struct.unpack_from("<II", dex, 0x60)
    strings = []
    for k in range(str_n):
        (off,) = struct.unpack_from("<I", dex, str_off + 4 * k)
        _, i = _uleb128(dex, off)
        fim = dex.index(b"\x00", i)
        strings.append(dex[i:fim].decode("utf-8", "replace"))
    tipos = [strings[struct.unpack_from("<I", dex, tipo_off + 4 * k)[0]] for k in range(tipo_n)]
    return {tipos[struct.unpack_from("<I", dex, cls_off + 32 * k)[0]] for k in range(cls_n)}


def classes_do_apk(apk: Path) -> set:
    out = set()
    with zipfile.ZipFile(apk) as z:
        dexes = [n for n in z.namelist() if n.startswith("classes") and n.endswith(".dex")]
        if not dexes:
            raise ValueError("APK sem classes*.dex")
        for n in dexes:
            out |= classes_definidas(z.read(n))
    return out


def verificar_dados(z: zipfile.ZipFile, manifesto_repo: Path = PACOTE_REPO):
    """Problemas do pacote de dados embutido (lista vazia = ok)."""
    problemas = []
    nomes = set(z.namelist())
    if "assets/quimica/manifest.json" not in nomes:
        return ["pacote de dados ausente: assets/quimica/manifest.json"]
    try:
        man = json.loads(z.read("assets/quimica/manifest.json").decode("utf-8"))
    except ValueError as e:
        return [f"manifest.json embutido inválido: {e}"]
    arquivos = man.get("files") or {}
    if not arquivos:
        problemas.append("manifest.json embutido não lista arquivos")
    for caminho, info in arquivos.items():
        nome = "assets/quimica/" + caminho
        if nome not in nomes:
            problemas.append(f"arquivo do pacote ausente no APK: {caminho}")
            continue
        esperado = (info or {}).get("bytes")
        if esperado is not None and z.getinfo(nome).file_size != esperado:
            problemas.append(f"tamanho diferente do manifesto: {caminho} ({z.getinfo(nome).file_size} != {esperado})")
    if manifesto_repo is not None and manifesto_repo.is_file():
        versao_repo = json.loads(manifesto_repo.read_text(encoding="utf-8")).get("version")
        if man.get("version") != versao_repo:
            problemas.append(f"pacote embutido ({man.get('version')}) diferente do pacote real do repositório ({versao_repo})")
    if "fixture" in str(man.get("version", "")).lower():
        problemas.append("o APK embutiu o FIXTURE de testes em vez do pacote real")
    return problemas


def verificar(apk: Path, obrigatorias=OBRIGATORIAS, dados: bool = True, manifesto_repo: Path = PACOTE_REPO):
    """Devolve (ok, problemas)."""
    problemas = []
    tam = apk.stat().st_size
    if not TAMANHO_MIN <= tam <= TAMANHO_MAX:
        problemas.append(f"tamanho do APK fora do esperado: {tam / 1e6:.1f} MB (esperado {TAMANHO_MIN / 1e6:.0f} a {TAMANHO_MAX / 1e6:.0f} MB)")
    definidas = classes_do_apk(apk)
    for c in obrigatorias:
        if c not in definidas:
            problemas.append(f"classe obrigatória AUSENTE no release (R8 removeu ou renomeou?): {c}")
    with zipfile.ZipFile(apk) as z:
        nomes = set(z.namelist())
        for a in ASSETS_OBRIGATORIOS if dados else [a for a in ASSETS_OBRIGATORIOS if not a.startswith("assets/quimica/")]:
            if a not in nomes:
                problemas.append(f"asset obrigatório ausente: {a}")
        if dados:
            problemas += [p for p in verificar_dados(z, manifesto_repo) if not p.startswith("pacote de dados ausente")]
    return (not problemas), problemas


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    sem_dados = "--sem-dados" in argv
    args = [a for a in argv if a != "--sem-dados"]
    if len(args) != 1 or not Path(args[0]).is_file():
        print("uso: python tools/verificar_release.py <app-release.apk> [--sem-dados]", file=sys.stderr)
        return 2
    ok, problemas = verificar(Path(args[0]), dados=not sem_dados)
    for p in problemas:
        print("PROBLEMA:", p)
    if ok:
        print(f"OK: {len(OBRIGATORIAS)} classes obrigatórias presentes no release" + ("" if sem_dados else "; pacote de dados embutido completo"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
