// Verificador de FIDELIDADE do texto gerado (/api/ask): o modelo explica, os dados respondem. A resposta é REJEITADA quando:
//   (a) traz um número (2 ou mais dígitos, ou decimal) que não está na pergunta, no contexto do gráfico nem nos trechos enviados;
//   (b) não termina com o rodapé do idioma ("texto gerado por IA…"), que o prompt exige;
//   (c) está na escrita errada: zh pedido sem caracteres Han, ou outro idioma com 5+ caracteres Han;
//   (d) contém dado pessoal aparente (e-mail, telefone, documento, URL…);
//   (e) passa de MAX_RESPOSTA caracteres.
// Falha segura: reprovou ⇒ o cliente continua exibindo a resposta montada localmente, sem o texto gerado. Nada é "corrigido".
import { temDadoPessoal } from './dadopessoal.js';

export const MAX_RESPOSTA = 3000;

/** Trecho obrigatório no fim da resposta, por idioma (o mesmo dicionário de backend/hf_space_llms/ask_core.py). */
export const RODAPES = {
  'pt-BR': 'texto gerado por IA',
  en: 'AI-generated text',
  es: 'texto generado por IA',
  de: 'KI-generierter Text',
  fr: 'texte généré par IA',
  zh: 'AI生成的文本'
};

const HAN = /[一-鿿]/g;
const chave = (v) => Number(v.toPrecision(10)).toString();

/** Texto sem o que parece número mas não é um dado: citações [id], endereços e marcadores de lista. */
function semRuido(texto) {
  return String(texto)
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, ' ')
    .replace(/^\s*\d{1,3}[.)]\s+/gm, ' ');
}

/** Conjunto de chaves numéricas de um texto: números de 2+ dígitos ou decimais, em TODAS as leituras possíveis ("1.000" vale 1 e 1000). */
export function numerosDe(texto) {
  const saida = new Set();
  for (const m of semRuido(texto).matchAll(/[+−-]?\d[\d.,]*/g)) {
    const bruto = m[0].replace(/^[+−-]/, '').replace(/[.,]$/, '');
    const digitos = bruto.replace(/\D/g, '');
    if (!/[.,]/.test(bruto) && digitos.length < 2) continue;
    const leituras = new Set();
    const seps = bruto.match(/[.,]/g) ?? [];
    if (!seps.length) leituras.add(Number(bruto));
    else if (seps.length === 1 && /^\d+[.,]\d{3}$/.test(bruto)) {
      // um separador e três dígitos depois: milhar ("1.000" = 1000) ou decimal ("1.000" = 1,0) — as duas leituras valem
      leituras.add(Number(digitos));
      leituras.add(Number(bruto.replace(',', '.')));
    } else {
      // o ÚLTIMO separador é o decimal; os outros são de milhar ("1.234,5" e "1,234.5" → 1234.5; "0,87" → 0.87)
      const k = Math.max(bruto.lastIndexOf('.'), bruto.lastIndexOf(','));
      leituras.add(Number(bruto.slice(0, k).replace(/[.,]/g, '') + '.' + bruto.slice(k + 1)));
    }
    for (const n of leituras) if (Number.isFinite(n)) saida.add(chave(n));
  }
  return saida;
}

/**
 * @param {string} resposta texto gerado
 * @param {{ q: string, lang: string, context: string, trechos: {id, texto}[] }} dados o que foi enviado ao modelo
 * @returns {{ ok: true } | { ok: false, motivo: 'tamanho'|'rodape'|'escrita'|'dadopessoal'|'numero' }}
 */
export function verificarFidelidade(resposta, dados) {
  const texto = String(resposta ?? '').trim();
  if (!texto || texto.length > MAX_RESPOSTA) return { ok: false, motivo: 'tamanho' };
  const rodape = RODAPES[dados.lang] ?? RODAPES['pt-BR'];
  if (!texto.toLowerCase().includes(rodape.toLowerCase())) return { ok: false, motivo: 'rodape' };
  const corpo = texto.slice(0, texto.toLowerCase().lastIndexOf(rodape.toLowerCase()));
  const han = (corpo.match(HAN) ?? []).length; // conta só o corpo: o rodapé em zh tem caracteres Han por definição
  if (dados.lang === 'zh' ? han === 0 : han >= 5) return { ok: false, motivo: 'escrita' };
  if (temDadoPessoal(texto)) return { ok: false, motivo: 'dadopessoal' };
  const permitidos = numerosDe([dados.q, dados.context, ...(dados.trechos ?? []).map((t) => t.texto)].filter(Boolean).join('\n'));
  for (const n of numerosDe(corpo)) if (!permitidos.has(n)) return { ok: false, motivo: 'numero' };
  return { ok: true };
}
