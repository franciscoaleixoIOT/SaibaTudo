// POST /api/melhoria — "Ajudar a melhorar o app": captura, com consentimento próprio, das perguntas que o app NÃO entendeu (DESLIGADA por padrão).
// Regras, filtros (pedido perigoso e dado pessoal), privacidade e como ligar: api/_lib/melhoria-handler.js e api/README.md.

import { toNodeHandler } from './_lib/http.js';
import { createMelhoriaHandler, MAX_BODY_MELHORIA } from './_lib/melhoria-handler.js';

export const handle = createMelhoriaHandler();

export default toNodeHandler(handle, { maxBodyBytes: MAX_BODY_MELHORIA });

export const config = { maxDuration: 10 };
