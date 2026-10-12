# -*- coding: utf-8 -*-
"""
Executa um GGUF no llama-server (binário oficial do llama.cpp, build CUDA) e conversa com ele por HTTP (só biblioteca padrão).

Por que llama-server e não llama-cpp-python: a roda 0.3.19 do ambiente de treino foi compilada SEM CUDA (llama_supports_gpu_offload() ==
False) e é anterior a arquiteturas novas (Qwen3.5, SmolLM3); o binário oficial do llama.cpp traz CUDA 13 (RTX 5060, sm_120), aplica o
template de chat de cada GGUF (jinja) com `enable_thinking`, aceita gramática GBNF e devolve tempos por requisição.

- GPU: `-ngl auto` + `--fit on` (padrão do llama.cpp): carrega o máximo de camadas que cabem em ~1 GB de folga; o log diz quantas.
- CPU: `--device none -ngl 0 -t 8` (o Modal serve o NLU com 8 threads em CPU).
- Um único slot (`-np 1`) e `cache_prompt`: o prefixo comum (instrução de sistema com exemplos) é reaproveitado entre perguntas, como num
  servidor que fica de pé.
- Memória de vídeo: amostrada com nvidia-smi a cada 0,5 s enquanto o servidor vive (pico = máximo usado − uso antes de carregar).
"""
import json
import os
import re
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

LLAMA_BIN = Path(os.environ.get("LLAMA_BIN", r"C:\Users\franc\models\llama.cpp\b11575"))


def vram_usada_mib() -> int:
    try:
        r = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"], capture_output=True, text=True,
                           timeout=10)
        return int(r.stdout.strip().splitlines()[0])
    except Exception:
        return -1


def _porta_livre() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Servidor:
    def __init__(self, gguf: str, *, gpu: bool = True, ctx: int = 4096, threads: int = 8, log_dir: Path | None = None, rotulo: str = "modelo",
                 extra=()):
        self.gguf, self.gpu, self.ctx, self.threads = gguf, gpu, ctx, threads
        self.rotulo = rotulo
        self.log_path = (Path(log_dir) if log_dir else Path(".")) / f"server_{rotulo}_{'gpu' if gpu else 'cpu'}.log"
        self.extra = list(extra)
        self.proc = None
        self.porta = None
        self.vram_base = self.vram_pico = -1
        self._parar_monitor = threading.Event()
        self.carga_s = None

    # ------------------------------------------------------------------ ciclo de vida
    def __enter__(self):
        self.iniciar()
        return self

    def __exit__(self, *exc):
        self.parar()

    def iniciar(self, timeout: float = 600.0):
        self.porta = _porta_livre()
        cmd = [str(LLAMA_BIN / "llama-server.exe"), "-m", self.gguf, "--host", "127.0.0.1", "--port", str(self.porta),
               "-c", str(self.ctx), "-np", "1", "--jinja", "--reasoning-format", "none", "-t", str(self.threads), "--no-webui",
               "--seed", "2026"]
        if self.gpu:
            cmd += ["-ngl", "auto", "--fit", "on", "-fa", "auto"]
        else:
            cmd += ["--device", "none", "-ngl", "0", "-fa", "off"]
        cmd += self.extra
        self.vram_base = vram_usada_mib()
        self.vram_pico = self.vram_base
        self._log = open(self.log_path, "w", encoding="utf-8", errors="replace")
        t0 = time.time()
        self.proc = subprocess.Popen(cmd, stdout=self._log, stderr=subprocess.STDOUT, cwd=str(LLAMA_BIN),
                                     creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        threading.Thread(target=self._monitor, daemon=True).start()
        while time.time() - t0 < timeout:
            if self.proc.poll() is not None:
                raise RuntimeError(f"llama-server saiu com código {self.proc.returncode}; veja {self.log_path}")
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{self.porta}/health", timeout=5) as r:
                    if json.loads(r.read().decode()).get("status") == "ok":
                        self.carga_s = round(time.time() - t0, 1)
                        return
            except (urllib.error.URLError, ConnectionError, TimeoutError, ValueError):
                pass
            time.sleep(0.5)
        self.parar()
        raise RuntimeError("llama-server não ficou pronto a tempo")

    def _monitor(self):
        while not self._parar_monitor.is_set() and self.proc and self.proc.poll() is None:
            v = vram_usada_mib()
            if v > self.vram_pico:
                self.vram_pico = v
            time.sleep(0.5)

    def parar(self):
        self._parar_monitor.set()
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=30)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        if getattr(self, "_log", None):
            self._log.close()
        time.sleep(2)  # libera a VRAM antes do próximo modelo

    # ------------------------------------------------------------------ informação do log
    def info_log(self) -> dict:
        try:
            t = self.log_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return {}
        info = {}
        m = re.search(r"offloaded (\d+)/(\d+) layers to GPU", t)
        if m:
            info["camadas_gpu"] = f"{m.group(1)}/{m.group(2)}"
        m = re.search(r"n_ctx\s*=\s*(\d+)", t)
        if m:
            info["n_ctx"] = int(m.group(1))
        return info

    def vram_pico_mib(self) -> int | None:
        if self.vram_base < 0 or self.vram_pico < 0:
            return None
        return max(0, self.vram_pico - self.vram_base)

    # ------------------------------------------------------------------ chamadas
    def _post(self, caminho: str, corpo: dict, timeout: float = 600.0) -> dict:
        req = urllib.request.Request(f"http://127.0.0.1:{self.porta}{caminho}", data=json.dumps(corpo).encode("utf-8"), method="POST",
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))

    def chat(self, mensagens: list, *, max_tokens: int, grammar: str | None = None, kwargs_template: dict | None = None,
             temperature: float = 0.0, stop=None, extra: dict | None = None) -> dict:
        """Chat com o template do próprio GGUF. Devolve {texto, ms, n_prompt, n_gerados, n_cache, tok_s}."""
        corpo = {"messages": mensagens, "max_tokens": max_tokens, "temperature": temperature, "top_k": 1, "seed": 2026,
                 "cache_prompt": True, "stream": False}
        if grammar:
            corpo["grammar"] = grammar
        if kwargs_template:
            corpo["chat_template_kwargs"] = kwargs_template
        if stop:
            corpo["stop"] = stop
        corpo.update(extra or {})
        t0 = time.time()
        r = self._post("/v1/chat/completions", corpo)
        ms = (time.time() - t0) * 1000
        msg = r["choices"][0]["message"]
        texto = msg.get("content") or ""
        if msg.get("reasoning_content"):
            texto = "<think>" + msg["reasoning_content"] + "</think>" + texto
        tm = r.get("timings") or {}
        return {"texto": texto, "ms": round(ms, 1), "n_prompt": tm.get("prompt_n"), "n_cache": tm.get("cache_n"),
                "n_gerados": tm.get("predicted_n") or (r.get("usage") or {}).get("completion_tokens"),
                "tok_s": round(tm["predicted_per_second"], 1) if tm.get("predicted_per_second") else None,
                "fim": r["choices"][0].get("finish_reason")}

    def completar(self, prompt: str, *, max_tokens: int, grammar: str | None = None, stop=None, temperature: float = 0.0) -> dict:
        """Completação com prompt cru (usado pelo modelo de produção, que foi treinado com um prompt ChatML fixo)."""
        corpo = {"prompt": prompt, "n_predict": max_tokens, "temperature": temperature, "top_k": 1, "seed": 2026, "cache_prompt": True,
                 "stop": stop or []}
        if grammar:
            corpo["grammar"] = grammar
        t0 = time.time()
        r = self._post("/completion", corpo)
        ms = (time.time() - t0) * 1000
        tm = r.get("timings") or {}
        return {"texto": r.get("content") or "", "ms": round(ms, 1), "n_prompt": tm.get("prompt_n"), "n_cache": tm.get("cache_n"),
                "n_gerados": tm.get("predicted_n"), "tok_s": round(tm["predicted_per_second"], 1) if tm.get("predicted_per_second") else None,
                "fim": "length" if r.get("stop_type") == "limit" or r.get("stopped_limit") else "stop"}
