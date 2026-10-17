// Filtro de DADO PESSOAL das perguntas do "Ajudar a melhorar o app" (POST /api/melhoria). Porte de api/_lib/sanitize.js do Eleições
// (e-mail, CPF, telefone, número longo), adaptado à química e ampliado: CNPJ, URL/domínio, @usuário, telefone internacional e sequências
// longas de dígitos com separadores. Não mascara: qualquer acerto DESCARTA a pergunta inteira (quem decide é `temDadoPessoal`).
//
// Adaptações para não derrubar perguntas legítimas de química:
//   - número CAS (7732-18-5, até 1234567-89-0) e decimal comum (6.02214076, 1,602176634) não contam como sequência longa;
//   - o telefone sem DDD exige o 1º dígito de 2 a 9 e o formato 4+4 ou 5+4 (intervalos como "1000-1500 K" passam; "2000-3000 K" é descartado,
//     o que só significa não guardar aquela pergunta);
//   - hidrato escrito com ponto (CuSO4.5H2O, Na2CO3.H2O) não é domínio (o domínio exige um TLD conhecido em letras).
// ESPELHO: web/src/quimica/js/melhoria.js (`temDadoPessoal`), conferido por web/test/melhoria.test.mjs com os mesmos casos.
// Heurístico: pode falhar (nome próprio, endereço por extenso). Por isso a revisão humana segue obrigatória e o consentimento diz isso.

const RX_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const RX_EMAIL_DISFARCADO = /\b[a-z0-9._%+-]{2,}\s*(?:\[at\]|\(at\)|\[arroba\]|\(arroba\)|\sarroba\s|\sarobase\s)\s*[a-z0-9-]{2,}\s*(?:\.|\sponto\s|\spunto\s|\spoint\s|\sdot\s|\[dot\]|\(dot\))\s*[a-z]{2,}\b/i;
const RX_PROVEDOR = /\b(?:gmail|hotmail|outlook|yahoo|icloud|protonmail|proton\.me|bol\.com|uol\.com|terra\.com|live\.com|msn\.com|gmx|web\.de|laposte|orange\.fr|free\.fr)\b/i;
const RX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const RX_CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const RX_TELEFONE_BR = /(?:\+?55[\s-]?)?(?:\(?\d{2}\)[\s-]?)?(?<![\d.,])9?[2-9]\d{3}[\s-]\d{4}(?![\d.,])/;
const RX_TELEFONE_INTL = /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,}/;
const RX_URL = /\b(?:https?:\/\/|ftp:\/\/|www\.)\S+/i;
const TLDS = 'com|net|org|br|io|info|biz|gov|edu|me|co|app|dev|xyz|online|site|ly|tv|uk|eu|us|pt|de|fr|es|it|ar|mx|cl|ca|au|ru|cn|jp|in';
const RX_DOMINIO = new RegExp(`\\b[a-z0-9-]{2,}(?:\\.[a-z0-9-]{2,})*\\.(?:${TLDS})(?:\\.[a-z]{2})?(?=$|[\\s/?#:),;!]|\\.(?:\\s|$))`, 'i');
const RX_USUARIO = /(?:^|[^\w@＠])[@＠][A-Za-z0-9_][A-Za-z0-9_.]{1,}/;
const RX_RUN_DIGITOS = /\+?\d[\d\s().\-/]*\d/g;
// número CAS e decimal comum saem do texto antes de contar os dígitos (viram uma barreira que separa as sequências)
const RX_CAS_G = /(?<![\d-])\d{2,7}-\d{2}-\d(?![\d-])/g;
const RX_DECIMAL_G = /(?<![\d.,])\d+[.,]\d+(?![\d.,])/g;

/** Há uma sequência de 9 ou mais dígitos (com ou sem separadores) que não é número CAS nem decimal comum? */
export function temSequenciaLonga(texto) {
  const semCas = String(texto).replace(RX_CAS_G, ' | ').replace(RX_DECIMAL_G, ' | ');
  for (const m of semCas.matchAll(RX_RUN_DIGITOS)) if (m[0].replace(/\D/g, '').length >= 9) return true;
  return false;
}

/** Motivo do descarte (para os testes; nunca vai para o log com o texto), ou null quando não há dado pessoal aparente. */
export function motivoDadoPessoal(texto) {
  const t = String(texto ?? '');
  if (RX_EMAIL.test(t) || RX_EMAIL_DISFARCADO.test(t) || RX_PROVEDOR.test(t)) return 'email';
  if (RX_URL.test(t) || RX_DOMINIO.test(t)) return 'url';
  if (RX_USUARIO.test(t)) return 'usuario';
  if (RX_CNPJ.test(t) || RX_CPF.test(t)) return 'documento';
  if (RX_TELEFONE_INTL.test(t) || RX_TELEFONE_BR.test(t)) return 'telefone';
  if (temSequenciaLonga(t)) return 'numero';
  return null;
}

export const temDadoPessoal = (texto) => motivoDadoPessoal(texto) !== null;
