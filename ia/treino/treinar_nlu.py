# -*- coding: utf-8 -*-
"""
SaibaTudo.IA — treino (QLoRA 4-bit NF4) do interpretador (NLU) sobre o Qwen3.5-2B.

Etapa 3a (treino-teste curto): prova que o Qwen3.5-2B (híbrido atenção + Gated DeltaNet, checkpoint multimodal) treina na RTX 5060
Laptop de 8 GB com a MESMA receita do v2.3 (QLoRA NF4, r=16, alpha=32, dropout 0.05, all-linear, lote 2 x acúmulo 8, lr 2e-4 cosseno,
max_length 256) e mede VRAM de pico, segundos por passo e perda. Só a parte de linguagem é carregada (Qwen3_5ForCausalLM: os pesos
`model.visual.*` e `mtp.*` do checkpoint são ignorados).

Diferença deliberada para o v2.3 (`apps/eleicoes2026/ai_model/scripts/train_hybrid.py`): o prompt é montado pelo TEMPLATE DE CHAT do
próprio tokenizer com `enable_thinking=False`, que é o que o serviço vai enviar ao GGUF:

  <|im_start|>system\\n{SYSTEM_PROMPT_V2}<|im_end|>\\n<|im_start|>user\\n{pergunta}<|im_end|>\\n<|im_start|>assistant\\n<think>\\n\\n</think>\\n\\n
  + alvo JSON + <|im_end|>\\n            (perda só no alvo + <|im_end|>\\n: máscara de treino_utils.mascarar_prompt)

Reaproveita, por caminho e sem cópia, `treino_utils.py` (máscara do prompt e train_meta.json) e o SYSTEM_PROMPT_V2 de `nlu_core.py`.

Uso (de qualquer pasta; Python do ambiente de treino, sempre com -I):
  python -I ia/treino/treinar_nlu.py --max_steps 200                  # treino-teste (etapa 3a)
  python -I ia/treino/treinar_nlu.py --epochs 3                       # treino completo (etapa 3)
"""
import argparse
import importlib.util
import json
import math
import os
import sys
import threading
import time
from collections import Counter
from pathlib import Path

# O Controle de Aplicativo do Windows (política da máquina) passou a bloquear `pyarrow/arrow_dataset.dll`, e o Trainer importa
# `datasets` (-> pyarrow.dataset) só porque o pacote existe. Este treino não usa `datasets`: escondê-lo (sem mexer no venv) evita a
# importação. `importlib.util.find_spec` devolve None para um módulo marcado como None em sys.modules.
sys.modules.setdefault("datasets", None)

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
ELEICOES = RAIZ / "apps" / "eleicoes2026"
DATASET_PADRAO = Path(r"C:\Users\franc\AndroidStudioProjects\SaibaTudo\apps\eleicoes2026\backend\retrain\out-v23\train.json")
BASE_PADRAO = "Qwen/Qwen3.5-2B"


def _importar(nome: str, caminho: Path):
    """Importa um módulo de um app pelo caminho (sem sys.path, sem colisão com módulos de mesmo nome de outro app)."""
    spec = importlib.util.spec_from_file_location(f"_saibatudo_{nome}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


treino_utils = _importar("treino_utils", ELEICOES / "ai_model" / "scripts" / "treino_utils.py")
nlu_core = _importar("nlu_core", ELEICOES / "backend" / "modal" / "nlu_core.py")


def montar_textos_chat(tokenizer, system: str, user: str, alvo: str):
    """(prompt, completo) pelo template de chat do modelo, raciocínio desligado. `completo` = template da conversa com a resposta."""
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    prompt = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    completo = tokenizer.apply_chat_template(msgs + [{"role": "assistant", "content": alvo}], tokenize=False, enable_thinking=False)
    if not completo.startswith(prompt):  # o template não pode reescrever o prefixo quando há resposta (senão treino != serviço)
        raise RuntimeError("template de chat: o texto com resposta não começa pelo prompt de geração")
    return prompt, completo


class DatasetNLU:
    """Pares {instruction,input,output} -> ids com perda só na saída. Descarta amostras truncadas antes da saída."""

    def __init__(self, amostras, tokenizer, max_length, system_forcado=None):
        import torch  # noqa: F401
        self.stats = Counter()
        self.itens = []
        self.comprimentos = []
        for s in amostras:
            alvo = s["output"] if isinstance(s["output"], str) else json.dumps(s["output"], ensure_ascii=False)
            system = system_forcado or s.get("instruction") or nlu_core.SYSTEM_PROMPT_V2
            prompt, completo = montar_textos_chat(tokenizer, system, s["input"], alvo)
            ids, labels, mask, status = treino_utils.mascarar_prompt(tokenizer, prompt, completo, max_length)
            self.stats[status] += 1
            if status != "truncado":
                self.itens.append({"input_ids": ids, "labels": labels, "attention_mask": mask})
                self.comprimentos.append(len(ids))
        print(f"Máscara do prompt: {dict(self.stats)} -> {len(self.itens)} amostras; tokens por exemplo: "
              f"média {sum(self.comprimentos) / max(1, len(self.comprimentos)):.1f}, máx {max(self.comprimentos or [0])}")

    def __len__(self):
        return len(self.itens)

    def __getitem__(self, i):
        return self.itens[i]


class AmostradorVRAM(threading.Thread):
    """Lê a memória usada da GPU (nvidia-smi via NVML do torch) a cada segundo: pico do PROCESSO e do dispositivo inteiro."""

    def __init__(self):
        super().__init__(daemon=True)
        self.pico_dispositivo_mib = 0
        self.parar = threading.Event()

    def run(self):
        import torch
        while not self.parar.is_set():
            try:
                livre, total = torch.cuda.mem_get_info(0)
                self.pico_dispositivo_mib = max(self.pico_dispositivo_mib, (total - livre) // (1 << 20))
            except Exception:  # noqa: BLE001
                pass
            self.parar.wait(1.0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base_model", default=BASE_PADRAO)
    ap.add_argument("--dataset", default=str(DATASET_PADRAO))
    ap.add_argument("--out", default=str(AQUI / "out" / "nlu-qwen35-2b-teste"))
    ap.add_argument("--max_steps", type=int, default=-1, help="> 0: para depois de N passos de otimização (treino-teste)")
    ap.add_argument("--epochs", type=float, default=3.0)
    ap.add_argument("--batch_size", type=int, default=2)
    ap.add_argument("--grad_accum", type=int, default=8)
    ap.add_argument("--max_length", type=int, default=256)
    ap.add_argument("--lr", type=float, default=2e-4)
    ap.add_argument("--lora_r", type=int, default=16)
    ap.add_argument("--lora_alpha", type=int, default=32)
    ap.add_argument("--target", default="all-linear", help="'all-linear' (padrão) ou lista separada por vírgulas")
    ap.add_argument("--sem_gc", action="store_true", help="desliga o gradient checkpointing (mais VRAM, mais rápido)")
    ap.add_argument("--cpu_offload", action="store_true", help="descarga híbrida de camadas para a RAM (como train_hybrid.py --cpu_offload on)")
    ap.add_argument("--pad_fixo", type=int, default=0,
                    help="> 0: completa todo lote até N tokens (formas constantes: evita a fragmentação do alocador do CUDA no Windows, "
                         "onde expandable_segments não existe; com lote 4 a memória reservada dobra sem isso)")
    ap.add_argument("--logging_steps", type=int, default=10)
    ap.add_argument("--save_steps", type=int, default=200)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--resume", default=None, help="pasta checkpoint-N de um treino interrompido (mesmo dataset e hiperparametros): retoma de la")
    ap.add_argument("--lora_init", default=None,
                    help="pasta final/ de um LoRA ja treinado: continua o treino a partir dele (novo dataset, novo agendamento de lr); r/alpha vem do adapter_config")
    a = ap.parse_args()

    import torch
    import transformers
    import peft
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, DataCollatorForSeq2Seq, Trainer,
                              TrainerCallback, TrainingArguments, set_seed)

    set_seed(a.seed)
    inicio = time.time()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    print("=" * 70)
    print(f"  SaibaTudo.IA — treino do NLU | base {a.base_model} | {'max_steps=' + str(a.max_steps) if a.max_steps > 0 else f'{a.epochs} épocas'}")
    print("=" * 70)
    print(f"GPU: {torch.cuda.get_device_name(0)} | torch {torch.__version__} | transformers {transformers.__version__} | peft {peft.__version__}")
    import importlib.util as iu
    kernels = {m: bool(iu.find_spec(m)) for m in ("fla", "causal_conv1d", "triton", "kernels")}
    print(f"Kernels lineares disponíveis: {kernels} (sem fla/causal_conv1d = implementação em PyTorch puro)")

    tok = AutoTokenizer.from_pretrained(a.base_model, trust_remote_code=False)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    tok.padding_side = "right"

    bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16,
                             bnb_4bit_use_double_quant=True)
    kw = {}
    if a.cpu_offload:
        import psutil
        total = torch.cuda.get_device_properties(0).total_memory / 1e9
        kw = {"device_map": "auto", "max_memory": {0: f"{max(4.0, total * 0.88 - 0.6):.2f}GiB",
                                                    "cpu": f"{int(psutil.virtual_memory().total / 1e9 * 0.75)}GiB"}}
    else:
        kw = {"device_map": {"": 0}}
    torch.cuda.reset_peak_memory_stats()
    t0 = time.time()
    model = AutoModelForCausalLM.from_pretrained(a.base_model, quantization_config=bnb, trust_remote_code=False,
                                                 dtype=torch.bfloat16, attn_implementation="sdpa", **kw)
    print(f"Modelo: {type(model).__name__} carregado em {time.time() - t0:.0f} s; VRAM alocada {torch.cuda.memory_allocated() / 2**20:.0f} MiB")
    model.config.use_cache = False
    gc = not a.sem_gc
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=gc,
                                            gradient_checkpointing_kwargs={"use_reentrant": False})
    alvo = a.target if a.target == "all-linear" else [x.strip() for x in a.target.split(",") if x.strip()]
    if a.lora_init:
        from peft import PeftModel
        model = PeftModel.from_pretrained(model, a.lora_init, is_trainable=True)
        print(f"LoRA inicial carregado de {a.lora_init} (continuacao)")
    else:
        lora = LoraConfig(r=a.lora_r, lora_alpha=a.lora_alpha, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM", target_modules=alvo)
        model = get_peft_model(model, lora)
    model.print_trainable_parameters()
    modulos = sorted({n.split(".")[-1] for n, m in model.named_modules() if hasattr(m, "lora_A") and isinstance(getattr(m, "lora_A"), torch.nn.ModuleDict)})
    print(f"Módulos com LoRA: {modulos}")
    print(f"VRAM depois do LoRA: {torch.cuda.memory_allocated() / 2**20:.0f} MiB")

    amostras = json.loads(Path(a.dataset).read_text(encoding="utf-8"))
    print(f"Dataset: {len(amostras)} pares ({a.dataset})")
    ds = DatasetNLU(amostras, tok, a.max_length)

    tempos = []

    class Medidor(TrainerCallback):
        def on_step_begin(self, args, state, control, **k):
            self.t = time.time()

        def on_step_end(self, args, state, control, **k):
            tempos.append(time.time() - self.t)
            if state.global_step in (1, 5, 10) or state.global_step % 50 == 0:
                rec = sorted(tempos[-20:])
                print(f"[passo {state.global_step}] {tempos[-1]:.2f} s (mediana últimos {len(rec)}: {rec[len(rec) // 2]:.2f} s); "
                      f"pico VRAM torch {torch.cuda.max_memory_reserved() / 2**20:.0f} MiB reservada", flush=True)

    targs = TrainingArguments(
        output_dir=str(out), num_train_epochs=a.epochs, max_steps=a.max_steps, per_device_train_batch_size=a.batch_size,
        gradient_accumulation_steps=a.grad_accum, learning_rate=a.lr, lr_scheduler_type="cosine", warmup_steps=25,
        weight_decay=0.01, bf16=True, gradient_checkpointing=gc, gradient_checkpointing_kwargs={"use_reentrant": False},
        logging_steps=a.logging_steps, save_strategy="steps", save_steps=a.save_steps, save_total_limit=2, report_to=[],
        optim="paged_adamw_8bit", max_grad_norm=0.3, dataloader_num_workers=0, remove_unused_columns=False,
        seed=a.seed, data_seed=a.seed,
    )
    trainer = Trainer(model=model, args=targs, train_dataset=ds, callbacks=[Medidor()],
                      data_collator=DataCollatorForSeq2Seq(tok, padding="max_length" if a.pad_fixo else True,
                                                                         max_length=a.pad_fixo or None, label_pad_token_id=-100))
    amostrador = AmostradorVRAM()
    amostrador.start()
    torch.cuda.reset_peak_memory_stats()
    t_treino = time.time()
    trainer.train(resume_from_checkpoint=a.resume or None)
    dur_treino = time.time() - t_treino
    amostrador.parar.set()

    final = out / "final"
    model.save_pretrained(str(final))
    tok.save_pretrained(str(final))
    passos = trainer.state.global_step
    passos_epoca = math.ceil(len(ds) / (a.batch_size * a.grad_accum))
    estaveis = sorted(tempos[10:]) or sorted(tempos)
    s_passo_med = estaveis[len(estaveis) // 2]
    perdas = [h for h in trainer.state.log_history if "loss" in h]
    medicoes = {
        "passos": passos,
        "duracaoTreinoS": round(dur_treino, 1),
        "sPorPassoMedia": round(dur_treino / max(1, passos), 3),
        "sPorPassoMediana": round(s_passo_med, 3),
        "passosPorEpoca": passos_epoca,
        "estimativa3EpocasH": round(3 * passos_epoca * dur_treino / max(1, passos) / 3600, 2),
        "picoVramTorchAlocadaMiB": round(torch.cuda.max_memory_allocated() / 2**20),
        "picoVramTorchReservadaMiB": round(torch.cuda.max_memory_reserved() / 2**20),
        "picoVramDispositivoMiB": amostrador.pico_dispositivo_mib,
        "perdaInicial": perdas[0]["loss"] if perdas else None,
        "perdaFinal": perdas[-1]["loss"] if perdas else None,
        "perdas": [(h["step"], round(h["loss"], 4)) for h in perdas],
        "kernels": kernels,
        "gradientCheckpointing": gc,
        "cpuOffload": a.cpu_offload,
        "loteXacumulo": [a.batch_size, a.grad_accum],
        "padFixo": a.pad_fixo,
        "modulosLora": modulos,
    }
    (out / "medicoes.json").write_text(json.dumps(medicoes, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    treino_utils.escrever_train_meta(
        final, dataset=a.dataset, base_model=a.base_model, semente=a.seed, amostras=len(ds),
        hiperparametros={"epochs": a.epochs, "max_steps": a.max_steps, "batch_size": a.batch_size, "grad_accum": a.grad_accum,
                         "max_length": a.max_length, "lr": a.lr, "lora_r": a.lora_r, "lora_alpha": a.lora_alpha, "lora_dropout": 0.05,
                         "target_modules": a.target, "pad_fixo": a.pad_fixo, "template": "chat_template do tokenizer, enable_thinking=False"},
        mascara=dict(ds.stats), log_history=trainer.state.log_history, inicio=inicio,
        versoes={"torch": torch.__version__, "transformers": transformers.__version__, "peft": peft.__version__},
    )
    print(json.dumps({k: v for k, v in medicoes.items() if k != "perdas"}, ensure_ascii=False, indent=1))
    print(f"LoRA salvo em {final}")


if __name__ == "__main__":
    sys.exit(main())
