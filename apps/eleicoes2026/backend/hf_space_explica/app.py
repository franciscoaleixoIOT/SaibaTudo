# -*- coding: utf-8 -*-
"""Space do Hugging Face (ZeroGPU) que gera o texto do SaibaTudo IA para o app de eleições, chamado só pelo servidor do projeto (api/ask.js).

Substitui o Space de teste `backend/hf_space_qwen7b` (Qwen2.5-7B genérico). Modelo: o explicador SaibaTudo IA (Qwen3-4B-Instruct-2507 ajustado
por QLoRA em comportamento: só o contexto, neutralidade, recusa, "pode conter erros"), apontado por ASK_MODEL_ID / ASK_MODEL_REVISION nas
"Variables" do Space — sem mexer no código. Sem as variáveis, serve a base (Qwen3-4B-Instruct-2507), que o benchmark de 12/10/2026 já preferiu
ao 7B.

O prompt é o MESMO do treino, da avaliação e da reserva no Modal (nlu_core.build_ask_prompt, copiado de backend/modal/nlu_core.py para esta
pasta na publicação). A API é a mesma do Space anterior, então api/_lib/ask-handler.js não muda: só HF_ASK_SPACE_URL na Vercel.

API (Gradio, api_name="ask"): entradas [pergunta, contexto]; saída {ok, answer, model, gpu_s, total_s, tokens} (ou {ok: false, error}).
A verificação da resposta (recomendação, contradição com os dados, números sem fonte) é do servidor (api/_lib/neutralidade.js).
Não registra pergunta nem resposta.
"""
import os
import time

import gradio as gr
import spaces
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

import nlu_core as core

MODEL_ID = os.environ.get("ASK_MODEL_ID", "Qwen/Qwen3-4B-Instruct-2507")
MODEL_REVISION = os.environ.get("ASK_MODEL_REVISION") or None
ROTULO = os.environ.get("ASK_MODEL_LABEL", "SaibaTudo IA")
GPU_SEGUNDOS = 45
MAX_NEW_TOKENS = 400

tok = AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
# no ZeroGPU o modelo vai para "cuda" já na carga do módulo (emulação fora de @spaces.GPU; GPU real dentro)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, revision=MODEL_REVISION, dtype=torch.bfloat16).to("cuda")
model.eval()


@spaces.GPU(duration=GPU_SEGUNDOS)
def _gerar(prompt: str, max_new_tokens: int, temperature: float):
    t0 = time.time()
    ids = tok(prompt, return_tensors="pt").to("cuda")
    kw = {"do_sample": True, "temperature": temperature, "top_p": 0.9} if temperature > 0 else {"do_sample": False}
    with torch.inference_mode():
        out = model.generate(**ids, max_new_tokens=max_new_tokens, pad_token_id=tok.eos_token_id, repetition_penalty=1.05, **kw)
    novos = out[0][ids["input_ids"].shape[1]:]
    return tok.decode(novos, skip_special_tokens=True).strip(), round(time.time() - t0, 3), int(novos.shape[0])


def ask(question: str, context: str = ""):
    """Texto ancorado no contexto que o app enviou. Devolve também o tempo de GPU (o que conta para a cota)."""
    t0 = time.time()
    try:
        pergunta = core.validate_question(question)
        contexto = core.validate_context(context)
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    texto, gpu_s, n = _gerar(core.build_ask_prompt(pergunta, contexto), MAX_NEW_TOKENS, 0.0)
    if not texto:
        return {"ok": False, "error": "empty_output"}
    return {"ok": True, "answer": texto, "model": ROTULO, "gpu_s": gpu_s, "total_s": round(time.time() - t0, 3), "tokens": n}


demo = gr.Interface(
    fn=ask,
    inputs=[gr.Textbox(label="Pergunta"), gr.Textbox(label="Contexto (dados oficiais enviados pelo app)", lines=6)],
    outputs=gr.JSON(label="Resposta"),
    api_name="ask",
    title="SaibaTudo IA — texto gerado para o SaibaTudo Eleições 2026",
    description="Uso do servidor do projeto. O texto é gerado por modelo e pode conter erros; não é dado oficial.",
)

if __name__ == "__main__":
    demo.queue(max_size=8).launch()
