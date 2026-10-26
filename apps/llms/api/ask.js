// POST /api/ask — explicação gerada por IA (opt-in), ancorada no contexto do gráfico e nos trechos das seções que o app enviou.
// Provedor: Space privado do Hugging Face (backend/hf_space_llms/). Operação e variáveis: api/README.md.
//
// Entrada : { q, lang, context?, trechos?: [{id, texto}], v:1, client:"android"|"web", iid:"<uuid>" }
// Saída   : { ok:true, answer, model, cached }   |   422 { ok:false, error:"rejected", motivo }   |   503 { error:"disabled"|"budget" }
//
// O servidor DESCARTA a resposta com número fora do enviado, sem o rodapé do idioma, na escrita errada ou com dado pessoal
// (api/_lib/fidelidade.js). O texto da pergunta nunca é registrado. Desligado por padrão (ASK_ENABLED=1 + Space configurado).
import { toNodeHandler } from './_lib/http.js';
import { createAskHandler } from './_lib/ask-handler.js';
import { MAX_ASK_BODY_BYTES } from './_lib/validate.js';

export const handle = createAskHandler();

export default toNodeHandler(handle, { maxBodyBytes: MAX_ASK_BODY_BYTES });

// Duração máxima da função (s): a GPU responde em ~3-8 s, mas a fila do ZeroGPU pode passar de 30 s.
export const config = { maxDuration: 50 };
