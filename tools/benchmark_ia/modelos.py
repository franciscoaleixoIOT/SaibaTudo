# -*- coding: utf-8 -*-
"""
Registro dos modelos do benchmark da SaibaTudo IA (etapa 1 de docs/PLANO_IA_SAIBATUDO.md).

Cada modelo: id curto, repositório GGUF no Hugging Face (só repositórios oficiais ou de quantizadores conhecidos), arquivo Q4_K_M (ou o
mais próximo), tarefas em que entra, licença (lida do model card) e se a licença permite chamar um derivado de "SaibaTudo" sem carregar a
marca da base no NOME do produto. Os GGUF ficam no cache do Hugging Face (~/.cache/huggingface/hub); nada de código dos repositórios é
executado (só pesos .gguf, lidos pelo llama.cpp).

`think` diz como desligar o raciocínio no template de chat:
  "kwarg"   -> chat_template_kwargs {"enable_thinking": false} (Qwen3, Qwen3.5, SmolLM3)
  "none"    -> o modelo não tem modo de raciocínio (ou ele já vem desligado por padrão: Granite 3.3, Phi-4-mini, Qwen2.5, Tucano)
"""

# Referência de produção (NLU de eleições v2.3, Qwen2.5-1.5B + LoRA mesclado), fora do Hugging Face: caminho local.
PRODUCAO_NLU_GGUF = r"C:\Users\franc\AndroidStudioProjects\SaibaTudo\apps\eleicoes2026\ai_model\output\gguf\v2.3-20261007\model-Q4_K_M.gguf"

APACHE = "Apache 2.0"
MARCA_LIVRE = "sim (Apache/MIT: basta manter o aviso de licença e a atribuição no model card; o nome do produto é livre)"

MODELOS = [
    # ------------------------------------------------------------------ NLU (interpretador)
    {"id": "v2.3-producao", "repo": None, "arquivo": PRODUCAO_NLU_GGUF, "tarefas": ["nlu_eleicoes"], "think": "none",
     "prompt": "producao", "licenca": "Apache 2.0 (base Qwen2.5-1.5B-Instruct)", "marca": MARCA_LIVRE,
     "nota": "modelo em produção (eleições), AJUSTADO com LoRA; avaliado com o prompt curto de produção (o do treino)"},
    {"id": "qwen2.5-1.5b", "repo": "Qwen/Qwen2.5-1.5B-Instruct-GGUF", "arquivo": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "none", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "base do v2.3 sem ajuste (mede o que o ajuste fino acrescentou)"},
    {"id": "qwen3-1.7b", "repo": "unsloth/Qwen3-1.7B-GGUF", "arquivo": "Qwen3-1.7B-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "o repositório oficial Qwen/Qwen3-1.7B-GGUF só tem Q8_0; Q4_K_M da Unsloth (mesmos pesos)"},
    {"id": "qwen3.5-4b", "repo": "unsloth/Qwen3.5-4B-GGUF", "arquivo": "Qwen3.5-4B-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica", "explica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "não há Qwen/Qwen3.5-4B-GGUF oficial; Q4_K_M da Unsloth"},
    # extras (não estavam na lista do plano; a família Qwen3.5 saiu depois dele): mesmo tamanho do Qwen3-1.7B e um "mini" para o Android
    {"id": "qwen3.5-2b", "repo": "unsloth/Qwen3.5-2B-GGUF", "arquivo": "Qwen3.5-2B-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "extra: Qwen3.5 no tamanho do Qwen3-1.7B (Q4_K_M da Unsloth)"},
    {"id": "qwen3.5-0.8b", "repo": "unsloth/Qwen3.5-0.8B-GGUF", "arquivo": "Qwen3.5-0.8B-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "extra: candidato ao NLU-mini embarcado (etapa 7 do plano)"},
    {"id": "granite-3.3-2b", "repo": "ibm-granite/granite-3.3-2b-instruct-GGUF", "arquivo": "granite-3.3-2b-instruct-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "none", "licenca": APACHE, "marca": MARCA_LIVRE, "nota": "GGUF oficial da IBM"},
    {"id": "gemma-3-1b", "repo": "google/gemma-3-1b-it-qat-q4_0-gguf", "arquivo": "gemma-3-1b-it-q4_0.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "none",
     "licenca": "Gemma Terms of Use + Prohibited Use Policy", "marca": "nome livre, mas os termos e a política de uso proibido acompanham todo derivado (cláusula de repasse)",
     "nota": "repositório com acesso condicionado (gated)"},
    {"id": "phi-4-mini", "repo": "unsloth/Phi-4-mini-instruct-GGUF", "arquivo": "Phi-4-mini-instruct-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "none", "licenca": "MIT", "marca": MARCA_LIVRE, "nota": "controle barato"},
    {"id": "smollm3-3b", "repo": "ggml-org/SmolLM3-3B-GGUF", "arquivo": "SmolLM3-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes", "nlu_quimica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE, "nota": "GGUF do ggml-org"},
    {"id": "tucano-2b4", "repo": None, "fonte": "TucanoBR/Tucano-2b4-Instruct", "arquivo": r"C:\Users\franc\models\tucano-2b4-instruct-Q4_K_M.gguf",
     "tarefas": ["nlu_eleicoes"], "think": "none", "sem_system": True, "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "só português (entra só no golden de eleições); sem GGUF Q4_K_M de quantizador conhecido: convertido aqui do safetensors "
             "oficial; o template de chat não aceita papel 'system' (as instruções vão no turno do usuário). Os GGUF do Tucano (o convertido "
             "aqui e o de GuilhermeAumo) geram texto incoerente e erro de tokenizador no llama.cpp b11575: medido com tucano_hf.py "
             "(transformers bf16, sem gramática)"},
    # ------------------------------------------------------------------ Explicador (texto gerado com fontes)
    {"id": "qwen2.5-7b", "repo": "Qwen/Qwen2.5-7B-Instruct-GGUF",
     "arquivo": "qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf", "partes": ["qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf"],
     "tarefas": ["explica"], "think": "none", "licenca": APACHE, "marca": MARCA_LIVRE,
     "nota": "explicador ATUAL (em produção roda em bf16 no ZeroGPU; aqui Q4_K_M para comparar no mesmo runtime)"},
    {"id": "qwen3-4b-2507", "repo": "unsloth/Qwen3-4B-Instruct-2507-GGUF", "arquivo": "Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
     "tarefas": ["explica"], "think": "none", "licenca": APACHE, "marca": MARCA_LIVRE, "nota": "variante só 'instruct' (sem raciocínio)"},
    {"id": "granite-3.3-8b", "repo": "ibm-granite/granite-3.3-8b-instruct-GGUF", "arquivo": "granite-3.3-8b-instruct-Q4_K_M.gguf",
     "tarefas": ["explica"], "think": "none", "licenca": APACHE, "marca": MARCA_LIVRE, "nota": "GGUF oficial da IBM"},
    {"id": "gemma-3-4b", "repo": "google/gemma-3-4b-it-qat-q4_0-gguf", "arquivo": "gemma-3-4b-it-q4_0.gguf",
     "tarefas": ["explica"], "think": "none",
     "licenca": "Gemma Terms of Use + Prohibited Use Policy", "marca": "nome livre, mas os termos e a política de uso proibido acompanham todo derivado (cláusula de repasse)",
     "nota": "repositório com acesso condicionado (gated)"},
    {"id": "qwen3-8b", "repo": "Qwen/Qwen3-8B-GGUF", "arquivo": "Qwen3-8B-Q4_K_M.gguf",
     "tarefas": ["explica"], "think": "kwarg", "licenca": APACHE, "marca": MARCA_LIVRE, "nota": "GGUF oficial da Qwen"},
]

POR_ID = {m["id"]: m for m in MODELOS}


def caminho_local(m: dict):
    """Caminho do .gguf principal no disco (cache do HF), ou None se não baixado. Não baixa nada."""
    import os
    if m["repo"] is None:
        return m["arquivo"] if os.path.exists(m["arquivo"]) else None
    from huggingface_hub import try_to_load_from_cache
    p = try_to_load_from_cache(m["repo"], m["arquivo"])
    if not isinstance(p, str):
        return None
    for parte in m.get("partes", []):
        q = try_to_load_from_cache(m["repo"], parte)
        if not isinstance(q, str):
            return None
    return p
