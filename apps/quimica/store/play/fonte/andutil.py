# -*- coding: utf-8 -*-
"""Ajudante de ADB para as capturas do app Android no emulador (uiautomator para achar elementos). Uso: import andutil as a."""
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

ADB = os.path.join(os.environ["LOCALAPPDATA"], "Android", "Sdk", "platform-tools", "adb.exe")
PKG = "net.saibatudo.quimica"


def adb(*args, check=True, binary=False):
    r = subprocess.run([ADB, *args], capture_output=True, check=False)
    if check and r.returncode != 0:
        raise RuntimeError(f"adb {' '.join(args)} falhou: {r.stderr.decode(errors='replace')}")
    return r.stdout if binary else r.stdout.decode("utf-8", errors="replace")


def dump():
    """Lista de nos da tela: (texto, content-desc, (x1,y1,x2,y2), clicavel)."""
    for _ in range(4):
        out = adb("exec-out", "uiautomator", "dump", "/dev/tty", check=False)
        i = out.find("<?xml")
        j = out.rfind("</hierarchy>")
        if i >= 0 and j > i:
            root = ET.fromstring(out[i:j + len("</hierarchy>")])
            nos = []
            for n in root.iter("node"):
                b = tuple(int(v) for v in re.findall(r"\d+", n.get("bounds", "")))
                if len(b) == 4:
                    nos.append((n.get("text", ""), n.get("content-desc", ""), b, n.get("clickable") == "true"))
            return nos
        time.sleep(0.7)
    raise RuntimeError("uiautomator dump sem resultado")


def achar(sub, exato=False, nos=None, indice=0):
    nos = nos if nos is not None else dump()
    cand = []
    for t, d, b, c in nos:
        for campo in (t, d):
            if campo and ((campo == sub) if exato else (sub.lower() in campo.lower())):
                cand.append(b)
                break
    if len(cand) <= indice:
        raise LookupError(f"nao achei '{sub}' na tela (textos: {[t or d for t, d, _, _ in nos if (t or d)][:40]})")
    return cand[indice]


def centro(b):
    return (b[0] + b[2]) // 2, (b[1] + b[3]) // 2


def tap_xy(x, y):
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(0.8)


def tap(sub, exato=False, indice=0, esperar=1.0):
    b = achar(sub, exato=exato, indice=indice)
    x, y = centro(b)
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(esperar)
    return b


def digitar(texto):
    adb("shell", "input", "text", texto.replace(" ", "%s"))
    time.sleep(0.6)


def swipe(x1, y1, x2, y2, ms=400):
    adb("shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms))
    time.sleep(0.8)


def voltar():
    adb("shell", "input", "keyevent", "4")
    time.sleep(0.8)


def shot(caminho):
    time.sleep(0.8)
    dados = adb("exec-out", "screencap", "-p", binary=True)
    with open(caminho, "wb") as f:
        f.write(dados)
    return caminho


def esperar_texto(sub, ms=20000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        try:
            return achar(sub)
        except LookupError:
            time.sleep(0.6)
    raise TimeoutError(f"timeout esperando '{sub}'")


def reiniciar(limpar=True, idioma=None):
    if limpar:
        adb("shell", "pm", "clear", PKG)
    if idioma:
        adb("shell", "cmd", "locale", "set-app-locales", PKG, "--locales", idioma)
    adb("shell", "am", "force-stop", PKG)
    adb("shell", "am", "start", "-n", f"{PKG}/.ui.MainActivity")
    time.sleep(3.5)


if __name__ == "__main__":
    for t, d, b, c in dump():
        if t or d:
            print(b, "|", t, "|", d, "|", "C" if c else "")
