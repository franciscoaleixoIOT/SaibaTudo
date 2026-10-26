# -*- coding: utf-8 -*-
"""Space do Hugging Face (ZeroGPU) que gera a EXPLICAÇÃO do SaibaTudo LLMs, chamado só pelo servidor do projeto (api/ask.js).

Modelo: Qwen3-4B-Instruct-2507 (base, sem ajuste, no S1). Quando o S4 publicar o explicador treinado, aponte ASK_MODEL_ID para o repositório do
modelo e ASK_MODEL_REVISION para o SHA — nas "Variables" do Space, sem mexer no código. ASK_MODEL_LABEL é o rótulo que os apps mostram.

API (Gradio, api_name="ask"): entradas [pergunta, idioma, contexto, trechos (texto JSON: [{"id": "...", "texto": "..."}])];
saída {ok, answer, model, gpu_s} (ou {ok: false, error}). Não registra pergunta nem resposta. A verificação da resposta é feita na Vercel.
"""
import os
import time

import gradio as gr
import spaces
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

import ask_core as core

MODEL_ID = os.environ.get("ASK_MODEL_ID", "Qwen/Qwen3-4B-Instruct-2507")
MODEL_REVISION = os.environ.get("ASK_MODEL_REVISION") or None
ROTULO = os.environ.get("ASK_MODEL_LABEL", "Qwen3-4B")
GPU_SEGUNDOS = 45

tok = AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, revision=MODEL_REVISION, torch_dtype=torch.bfloat16).to("cuda")
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


def ask(question: str, lang: str = "pt-BR", context: str = "", trechos: str = ""):
    t0 = time.time()
    try:
        pergunta = core.validate_question(question)
        idioma = core.validate_lang(lang)
        contexto = core.validate_context(context)
        lista = core.parse_trechos(trechos)
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    texto, gpu_s, n = _gerar(core.build_ask_prompt(tok, pergunta, idioma, contexto, lista), core.MAX_NEW_TOKENS, 0.2)
    if not texto:
        return {"ok": False, "error": "empty_output"}
    return {"ok": True, "answer": texto, "model": ROTULO, "gpu_s": gpu_s, "total_s": round(time.time() - t0, 3), "tokens": n}


demo = gr.Interface(
    fn=ask,
    inputs=[
        gr.Textbox(label="Pergunta"),
        gr.Textbox(label="Idioma (pt-BR, en, es, de, fr, zh)"),
        gr.Textbox(label="Contexto (resumo do gráfico)", lines=4),
        gr.Textbox(label='Trechos (JSON: [{"id": "...", "texto": "..."}])', lines=6),
    ],
    outputs=gr.JSON(label="Resposta"),
    api_name="ask",
    title="SaibaTudo LLMs — explicação por IA",
    description="Uso do servidor do projeto. O texto é gerado por modelo e pode conter erros.",
)

if __name__ == "__main__":
    demo.queue(max_size=8).launch()
