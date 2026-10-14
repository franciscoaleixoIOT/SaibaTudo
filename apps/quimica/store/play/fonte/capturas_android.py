# -*- coding: utf-8 -*-
"""Capturas 1080x1920 do APP ANDROID (release) no emulador, para a ficha da Google Play do SaibaTudo Química.

Pré-requisitos: emulador Pixel_9 ligado (adb), APK de release instalado (app/build/outputs/apk/release/app-release.apk).
Tela de 1080x1920 (wm size), demo mode da barra de status (10:00, bateria cheia, sem notificações), animações desligadas.
Uso:  python store/play/fonte/capturas_android.py <pasta-saida> [idioma=pt-BR|en|es|de|fr] [--escuro]
Só ASCII é digitado (adb input text não digita acentos): as perguntas foram escolhidas sem acento.
"""
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import andutil as a  # noqa: E402  (ajudante de adb/uiautomator ao lado deste arquivo)

TEXTOS = {
    "pt-BR": dict(massa="massa molar do NaCl", seg="perigos do etanol", busca="cafeina"),
    "en": dict(massa="molar mass of NaCl", seg="hazards of ethanol", busca="caffeine"),
    "es": dict(massa="masa molar del NaCl", seg="peligros del etanol", busca="cafeina"),
    "de": dict(massa="molare Masse von NaCl", seg="Gefahren von Ethanol", busca="Koffein"),
    "fr": dict(massa="masse molaire du NaCl", seg="dangers du toluene", busca="cafeine"),
}
NAV = dict(inicio=(100, 1740), tabela=(320, 1740), buscar=(540, 1740), calcular=(760, 1740))


def ime_visivel():
    return "mInputShown=true" in a.adb("shell", "dumpsys", "input_method", check=False)


def fechar_teclado():
    if ime_visivel():
        a.voltar()
        time.sleep(0.6)


def demo_mode():
    for extras in (
        dict(command="enter"),
        dict(command="clock", hhmm="1000"),
        dict(command="battery", level="100", plugged="false"),
        dict(command="network", wifi="show", level="4", fully="true", mobile="hide"),
        dict(command="notifications", visible="false"),
    ):
        cmd = ["shell", "am", "broadcast", "-a", "com.android.systemui.demo"]
        for k, v in extras.items():
            cmd += ["-e", k, v]
        a.adb(*cmd, check=False)


def perguntar(texto):
    a.tap_xy(540, 520)
    a.digitar(texto)
    # botao "Enviar" (icone no canto direito do campo; o rotulo muda com o idioma): acha pelo content-desc, x > 900 e y < 700
    for tx, d, b, c in a.dump():
        if d and b[0] >= 900 and b[1] < 700 and b[2] - b[0] < 120:
            a.tap_xy(*a.centro(b))
            break
    else:
        a.adb("shell", "input", "keyevent", "66")
    time.sleep(2.5)
    fechar_teclado()


def main():
    saida = os.path.abspath(sys.argv[1])
    idioma = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "pt-BR"
    escuro = "--escuro" in sys.argv
    t = TEXTOS[idioma]
    os.makedirs(saida, exist_ok=True)
    # tela 9:16 (a Play recusa lado maior > 2x o menor) e sem animações; desfazer depois: wm size reset, wm density reset
    a.adb("shell", "wm", "size", "1080x1920")
    a.adb("shell", "wm", "density", "420")
    for k in ("window_animation_scale", "transition_animation_scale", "animator_duration_scale"):
        a.adb("shell", "settings", "put", "global", k, "0")
    a.adb("shell", "settings", "put", "global", "sysui_demo_allowed", "1")
    a.adb("shell", "cmd", "uimode", "night", "yes" if escuro else "no")
    demo_mode()
    a.reiniciar(limpar=True, idioma=idioma)
    demo_mode()
    sufixo = "-escuro" if escuro else ""

    def foto(nome):
        a.shot(os.path.join(saida, f"{nome}{sufixo}.png"))
        print("  foto", nome)

    # 01 inicio
    foto("01-inicio")
    # 02 resposta com passo a passo, fonte e licenca
    perguntar(t["massa"])
    foto("02-resposta-massa-molar")
    # 03 IA na nuvem: botao opt-in e nota de consentimento (fim da resposta)
    a.swipe(540, 1500, 540, 500, 500)
    foto("03-ia-nuvem-opcional")
    # 04 seguranca/GHS (nova pergunta)
    a.tap_xy(*NAV["inicio"])
    a.adb("shell", "am", "force-stop", a.PKG)
    a.adb("shell", "am", "start", "-n", f"{a.PKG}/.ui.MainActivity")
    time.sleep(3)
    perguntar(t["seg"])
    foto("04-seguranca-ghs")
    # 05 tabela periodica (grade rolada para os metais de transicao)
    a.tap_xy(*NAV["tabela"])
    a.swipe(540, 1600, 540, 1080, 600)   # a grade abre nos periodos 1-4; rola para os periodos 4-6
    a.swipe(900, 1350, 300, 1350, 500)   # e para a direita (metais de transicao)
    foto("05-tabela-periodica")
    # 08 elemento (Fe)
    nos = a.dump()
    fe = [b for tx, d, b, c in nos if tx == "Fe"]
    if fe:
        a.tap_xy(*a.centro(fe[0]))
        foto("08-elemento-ferro")
    # 06 composto com estrutura 2D
    a.tap_xy(*NAV["buscar"])
    a.tap_xy(540, 260)
    a.digitar(t["busca"])
    fechar_teclado()
    a.tap_xy(540, 460)
    time.sleep(3.5)
    foto("06-composto-estrutura")
    # 07 calculadora de balanceamento (os botoes mudam de lugar com o idioma: acha por texto/tamanho)
    a.tap_xy(*NAV["calcular"])
    a.tap_xy(300, 745)  # 2o item da lista = Balanceamento
    time.sleep(1)

    def campo():
        for tx, d, b, c in a.dump():
            if c and b[2] - b[0] > 900 and b[3] - b[1] > 150 and b[1] > 400:
                return a.centro(b)
        raise LookupError("campo da equacao nao achado")

    a.tap_xy(*campo())
    a.digitar("C8H18 + O2")
    fechar_teclado()
    a.tap("->", exato=True)
    a.tap_xy(*campo())
    a.digitar("CO2 + H2O")
    fechar_teclado()
    foto("07-calculadora-balanceamento")
    a.adb("shell", "cmd", "uimode", "night", "no")


if __name__ == "__main__":
    main()
