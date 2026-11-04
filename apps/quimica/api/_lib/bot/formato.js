// Formato do bot: a resposta do motor do site (título + blocos de answers.js + rodapé) vira HTML do Telegram (só <b>, <i>; tudo o mais
// escapado) em partes de até 4 000 caracteres, com "(i/n) " quando há mais de uma e o rodapé (fontes, data do pacote, modelo) só na última.
// `paraTextoSimples` é a mesma coisa sem tags (reserva para canais sem formatação).
import { textoDoBloco } from '../../../web/src/quimica/js/answers.js';

export const LIMITE_TELEGRAM = 4000;
const RESERVA_PREFIXO = 12; // "(99/99) " cabe com folga

export const escaparHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Rodapé em texto: as partes presentes, unidas por " · ". */
export function rodapeTexto(rodape = {}) {
  const partes = [];
  if (Array.isArray(rodape?.fontes) && rodape.fontes.length) partes.push(`Fontes: ${rodape.fontes.join(', ')}`);
  if (rodape?.dataPacote) partes.push(`Dados de ${rodape.dataPacote}`);
  if (rodape?.origem) partes.push(`Modelo: ${rodape.origem}`);
  return partes.join(' · ');
}

const textoBloco = (b) => {
  const t = textoDoBloco(b);
  return b.tipo === 'aviso' && t ? `⚠️ ${t}` : t;
};

export function paraTextoSimples(resposta) {
  const corpo = [resposta.titulo, ...(resposta.blocos ?? []).map(textoBloco)].filter(Boolean);
  const rodape = rodapeTexto(resposta.rodape);
  return [...corpo, rodape].filter(Boolean).join('\n\n');
}

function blocoHtml(b) {
  const t = escaparHtml(textoDoBloco(b));
  if (!t) return '';
  if (b.tipo === 'aviso') return `⚠️ ${t}`;
  if (b.tipo === 'citacao') return `<i>${t}</i>`;
  return t;
}

/** Corta em quebras de linha sem ultrapassar o limite e sem partir uma tag `<...>`. */
export function dividir(texto, limite = LIMITE_TELEGRAM) {
  const partes = [];
  let resto = String(texto ?? '');
  while (resto.length > limite) {
    let corte = resto.lastIndexOf('\n', limite);
    if (corte <= 0) corte = limite;
    // não cortar dentro de uma tag: se há um "<" aberto antes do corte sem ">" depois dele, recua até antes do "<"
    const abre = resto.lastIndexOf('<', corte - 1);
    if (abre >= 0 && resto.indexOf('>', abre) >= corte) corte = Math.max(1, abre);
    partes.push(resto.slice(0, corte).replace(/\n$/, ''));
    resto = resto.slice(corte).replace(/^\n/, '');
  }
  if (resto.length || !partes.length) partes.push(resto);
  return partes;
}

/** @returns {string[]} partes prontas para sendMessage (parse_mode HTML) */
export function paraTelegramHtml(resposta) {
  const corpo = [resposta.titulo ? `<b>${escaparHtml(resposta.titulo)}</b>` : '', ...(resposta.blocos ?? []).map(blocoHtml)].filter(Boolean).join('\n\n');
  const rodape = rodapeTexto(resposta.rodape);
  const rodapeHtml = rodape ? `<i>${escaparHtml(rodape)}</i>` : '';
  const partes = dividir(corpo, LIMITE_TELEGRAM - RESERVA_PREFIXO);
  if (rodapeHtml) {
    const ultima = partes.at(-1);
    const junto = ultima ? `${ultima}\n\n${rodapeHtml}` : rodapeHtml;
    if (junto.length <= LIMITE_TELEGRAM - RESERVA_PREFIXO) partes[partes.length - 1] = junto;
    else partes.push(rodapeHtml);
  }
  if (partes.length === 1) return partes;
  return partes.map((p, i) => `(${i + 1}/${partes.length}) ${p}`);
}
