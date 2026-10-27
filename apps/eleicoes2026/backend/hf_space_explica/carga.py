# -*- coding: utf-8 -*-
"""Qual modelo o Space carrega, decidido pelas "Variables" do Space (sem mexer no código):

- ASK_MODEL_ID / ASK_MODEL_REVISION: modelo base ou já fundido (padrão: a base pública Qwen3-4B-Instruct-2507).
- ASK_ADAPTER_ID / ASK_ADAPTER_REVISION (opcional): adaptador LoRA (repositório privado; o Space precisa do segredo HF_TOKEN) aplicado e fundido
  sobre o modelo acima na carga. Desde 27/10/2026 a publicação envia só o adaptador (137 MB) em vez do modelo fundido (7,6 GB).

Sem torch nem transformers aqui: os carregadores entram por parâmetro, para o teste (`backend/retrain/test_carga_space.py`) rodar sem GPU.
"""
BASE_PADRAO = "Qwen/Qwen3-4B-Instruct-2507"


def _limpo(env, chave):
    v = (env.get(chave) or "").strip()
    return v or None


def resolver(env) -> dict:
    return {
        "base": _limpo(env, "ASK_MODEL_ID") or BASE_PADRAO,
        "base_revision": _limpo(env, "ASK_MODEL_REVISION"),
        "adapter": _limpo(env, "ASK_ADAPTER_ID"),
        "adapter_revision": _limpo(env, "ASK_ADAPTER_REVISION"),
    }


def carregar(env, carregar_base, carregar_adaptador):
    """carregar_base(model_id, revision) -> modelo; carregar_adaptador(modelo, adapter_id, revision) -> modelo fundido. Devolve (modelo, cfg)."""
    cfg = resolver(env)
    modelo = carregar_base(cfg["base"], cfg["base_revision"])
    if cfg["adapter"]:
        modelo = carregar_adaptador(modelo, cfg["adapter"], cfg["adapter_revision"])
    return modelo, cfg
