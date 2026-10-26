// Validação de entrada de /api/ask. Funções puras: { ok:true, value } ou { ok:false, status, error, field? }. Porte do validate.js da química,
// com `lang` obrigatório (um dos seis idiomas do app) e limites do SaibaTudo LLMs: pergunta ≤ 400, contexto do gráfico ≤ 1500, até 3 trechos × 2000.

export const IDIOMAS = ['pt-BR', 'en', 'es', 'de', 'fr', 'zh'];
export const CLIENTS = new Set(['web', 'android']);
export const MAX_Q = 400;
export const MIN_Q = 3;
export const MAX_ASK_CONTEXT = 1500;
export const MAX_TRECHOS = 3;
export const MAX_TRECHO_TEXTO = 2000;
export const MAX_TRECHOS_TOTAL = 6000;
/** Tamanho máximo do corpo de /api/ask (pergunta + contexto + 3 trechos + folga de escape JSON). */
export const MAX_ASK_BODY_BYTES = 24_576;

/** UUID v4 ou v7. */
export const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** id de trecho: "<idioma>:<secao>" (conteudo/index.js). */
export const TRECHO_ID_RX = /^[A-Za-z0-9._:-]{1,80}$/;

// C0/C1 de controle (menos tab, LF e CR), zero-width, marcas bidi e BOM. Montada por código: sem caracteres invisíveis no arquivo.
const FAIXAS_DE_CONTROLE = [[0, 8], [0xb, 0xc], [0xe, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], [0xfeff, 0xfeff]];
export const CONTROLES = new RegExp(`[${FAIXAS_DE_CONTROLE.map(([a, b]) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`).join('')}]`, 'g');

/** Limpa texto do usuário: remove controles/zero-width, espaços repetidos e neutraliza os delimitadores do ChatML (`<|im_start|>`…). */
export function cleanText(s) {
  return String(s).replace(CONTROLES, ' ').replace(/<\|/g, '< |').replace(/\|>/g, '| >').replace(/\s+/g, ' ').trim();
}

const fail = (status, error, field) => ({ ok: false, status, error, ...(field ? { field } : {}) });
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Valida o corpo de POST /api/ask: { q, lang, context?, trechos?: [{id, texto}], v:1, client, iid }. */
export function validateAskBody(body) {
  if (!isObject(body)) return fail(400, 'bad_request', 'body');
  const { q, lang, v, client, iid, context, trechos } = body;
  if (typeof q !== 'string' || q.length > MAX_Q) return fail(400, 'bad_request', 'q');
  const limpa = cleanText(q);
  if (limpa.length < MIN_Q) return fail(400, 'bad_request', 'q');
  if (typeof lang !== 'string' || !IDIOMAS.includes(lang)) return fail(400, 'bad_request', 'lang');
  if (v !== 1) return fail(400, 'bad_request', 'v');
  if (typeof client !== 'string' || !CLIENTS.has(client)) return fail(400, 'bad_request', 'client');
  if (typeof iid !== 'string' || !UUID_RX.test(iid)) return fail(400, 'bad_request', 'iid');

  let limpoContexto = '';
  if (context !== undefined && context !== null && context !== '') {
    if (typeof context !== 'string' || context.length > MAX_ASK_CONTEXT) return fail(400, 'bad_request', 'context');
    limpoContexto = cleanText(context);
  }
  const limpos = [];
  if (trechos !== undefined && trechos !== null) {
    if (!Array.isArray(trechos) || trechos.length > MAX_TRECHOS) return fail(400, 'bad_request', 'trechos');
    const vistos = new Set();
    let total = 0;
    for (const t of trechos) {
      if (!isObject(t) || typeof t.id !== 'string' || !TRECHO_ID_RX.test(t.id) || vistos.has(t.id)) return fail(400, 'bad_request', 'trechos');
      if (typeof t.texto !== 'string' || t.texto.length > MAX_TRECHO_TEXTO * 2) return fail(400, 'bad_request', 'trechos');
      const texto = cleanText(t.texto).slice(0, MAX_TRECHO_TEXTO);
      if (texto.length < 3) return fail(400, 'bad_request', 'trechos');
      total += texto.length;
      if (total > MAX_TRECHOS_TOTAL) return fail(400, 'bad_request', 'trechos');
      vistos.add(t.id);
      limpos.push({ id: t.id, texto });
    }
  }
  return { ok: true, value: { q: limpa, lang, client, iid: iid.toLowerCase(), context: limpoContexto, trechos: limpos } };
}
