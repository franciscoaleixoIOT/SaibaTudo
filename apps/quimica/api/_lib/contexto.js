// Campo `contexto` de POST /api/nlu (multi-turno, NLU v3.4+; proxy desde 17/10/2026).
//
// O cliente manda, numa pergunta de continuação ("e o do potássio?", "e em gramas?"), a interpretação da pergunta ANTERIOR: o mesmo
// objeto `nlu` que esta API devolve (intent + entidades como TEXTO; composto como nome/fórmula, nunca CID). Aqui ele é validado e
// serializado na forma canônica de `nlu_core.format_output` (backend/modal/nlu_core.py), que é a que o modelo viu no treino:
//   {"intent": "MASSA_MOLAR", "composto": "NaCl", "quantidades": [{"valor": 5, "unidade": "g"}]}
// (só chaves presentes, na ordem do contrato, separadores ", " e ": ", sem escapar acentos, inteiros sem ".0", floats como o repr do
// Python). A forma canônica entra na chave do cache; o objeto saneado vai ao Modal e à ancoragem (entidade herdada, normalize.js).
// O conteúdo do contexto NUNCA é registrado em log.

import { INTENT_SET, NIVEL_SET, PROPRIEDADE_SET, SIMBOLO_SET, UNIDADE_SET } from './vocab.js';

/** Chaves que cada intenção admite (as "permitidas" de nlu_core.ENTIDADES_POR_INTENCAO; test_nlu_core.py confere). */
export const ENTIDADES_POR_INTENCAO = Object.freeze({
  ELEMENTO: ['elemento'],
  COMPOSTO: ['composto'],
  PROPRIEDADE: ['elemento', 'composto', 'propriedade'],
  MASSA_MOLAR: ['elemento', 'composto'],
  BALANCEAR: ['equacao'],
  ESTEQUIOMETRIA: ['elemento', 'composto', 'quantidades', 'equacao'],
  CONCENTRACAO: ['composto', 'quantidades', 'unidadeDestino'],
  PH: ['composto', 'quantidades'],
  GAS_IDEAL: ['composto', 'quantidades'],
  CONVERSAO_UNIDADE: ['quantidades', 'unidadeDestino'],
  NOMENCLATURA: ['composto'],
  DESENHAR: ['composto'],
  COMPARAR: ['elemento', 'composto', 'propriedade'],
  TABELA_PERIODICA: ['propriedade'],
  SEGURANCA: ['elemento', 'composto'],
  CONCEITO: ['composto', 'nivel'],
  NOX: ['elemento', 'composto'],
  ENTALPIA: ['composto', 'quantidades', 'equacao'],
  EQUILIBRIO: ['equacao', 'quantidades'],
  LIGACAO: ['elemento', 'composto'],
  RECUSA_PERIGO: [],
  SOBRE_DADOS: [],
  FONTES: [],
  AJUDA: [],
  DESCONHECIDA: [],
});

/** Tamanho máximo da forma canônica (igual a nlu_core.MAX_CONTEXTO_CHARS; test_nlu_core.py confere). */
export const MAX_CONTEXTO = 400;
/** Ordem das chaves = nlu_core.KEYS (e ORDEM_CAMPOS de normalize.js). */
export const CHAVES_CONTEXTO = Object.freeze(['intent', 'elemento', 'composto', 'propriedade', 'quantidades', 'equacao', 'nivel', 'unidadeDestino']);
const MAX_QUANTIDADES_CONTEXTO = 4; // = nlu_core.MAX_QUANTIDADES (has_valid_shape)
const MAX_COMPOSTO = 60;
const MAX_EQUACAO = 120;
const PROIBIDOS = /[\r\n]|<\||\|>|["\\]/;
// controles C0/C1, zero-width, marcas bidi e BOM (as mesmas faixas de CONTROLES em validate.js)
const CONTROLES_CTX = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/**
 * Número como `nlu_core.format_number`: inteiro (|x| < 1e15) sem ".0"; senão o `repr` do Python (o mais curto que volta ao mesmo
 * float; notação científica quando o expoente decimal é < -4 ou >= 16, com sinal e 2 dígitos no mínimo: 1e-07, 1.5e+20).
 */
export function formatarNumero(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error('valor deve ser numérico e finito');
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x === 0 ? 0 : x);
  const [mantissa, expoTexto] = x.toExponential().split('e');
  const expo = Number(expoTexto);
  if (expo < -4 || expo >= 16) {
    const sinal = expo < 0 ? '-' : '+';
    return `${mantissa}e${sinal}${String(Math.abs(expo)).padStart(2, '0')}`;
  }
  const s = String(x);
  return s.includes('.') ? s : `${s}.0`;
}

/** Serialização canônica (= nlu_core.format_output) de um contexto JÁ validado. */
export function contextoCanonico(ctx) {
  const partes = [];
  for (const k of CHAVES_CONTEXTO) {
    const v = ctx[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (k === 'quantidades') {
      const itens = v.map((x) => `{"valor": ${formatarNumero(x.valor)}, "unidade": ${JSON.stringify(x.unidade)}}`);
      partes.push(`"quantidades": [${itens.join(', ')}]`);
    } else {
      partes.push(`${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    }
  }
  return `{${partes.join(', ')}}`;
}

const textoValido = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !PROIBIDOS.test(v) && !CONTROLES_CTX.test(v);

/**
 * Valida o `contexto` do corpo. Objeto plano; `intent` do contrato; só chaves do contrato e admitidas pela intenção
 * (ENTIDADES_POR_INTENCAO, sem exigir as obrigatórias: a ancoragem pode ter derrubado uma); valores do vocabulário fechado ou texto
 * curto sem quebra de linha/controle/aspas/delimitador de token; `null` = ausente; forma canônica com no máximo MAX_CONTEXTO caracteres.
 * @returns {{ok:true, value:{ctx:object, canonico:string}} | {ok:false}}
 */
export function validarContexto(bruto) {
  const falha = { ok: false };
  if (!isPlainObject(bruto)) return falha;
  const intent = bruto.intent;
  if (typeof intent !== 'string' || !INTENT_SET.has(intent)) return falha;
  const permitidas = new Set(ENTIDADES_POR_INTENCAO[intent] ?? []);
  const ctx = { intent };
  for (const [k, v] of Object.entries(bruto)) {
    if (k === 'intent') continue;
    if (!CHAVES_CONTEXTO.includes(k)) return falha;
    if (v === null) continue;
    if (!permitidas.has(k)) return falha;
    switch (k) {
      case 'elemento':
        if (!SIMBOLO_SET.has(v)) return falha;
        break;
      case 'propriedade':
        if (!PROPRIEDADE_SET.has(v)) return falha;
        break;
      case 'nivel':
        if (!NIVEL_SET.has(v)) return falha;
        break;
      case 'unidadeDestino':
        if (!UNIDADE_SET.has(v)) return falha;
        break;
      case 'composto':
        if (!textoValido(v, MAX_COMPOSTO)) return falha;
        break;
      case 'equacao':
        if (!textoValido(v, MAX_EQUACAO)) return falha;
        break;
      case 'quantidades': {
        if (!Array.isArray(v) || v.length < 1 || v.length > MAX_QUANTIDADES_CONTEXTO) return falha;
        const itens = [];
        for (const x of v) {
          if (!isPlainObject(x) || Object.keys(x).length !== 2 || !('valor' in x) || !('unidade' in x)) return falha;
          if (typeof x.valor !== 'number' || !Number.isFinite(x.valor) || !UNIDADE_SET.has(x.unidade)) return falha;
          itens.push({ valor: x.valor, unidade: x.unidade });
        }
        ctx[k] = itens;
        continue;
      }
      default:
        return falha;
    }
    ctx[k] = v;
  }
  // objeto saneado na ordem canônica
  const ordenado = {};
  for (const k of CHAVES_CONTEXTO) if (ctx[k] !== undefined) ordenado[k] = ctx[k];
  const canonico = contextoCanonico(ordenado);
  if (canonico.length > MAX_CONTEXTO || /\n/.test(canonico)) return falha;
  return { ok: true, value: { ctx: ordenado, canonico } };
}
