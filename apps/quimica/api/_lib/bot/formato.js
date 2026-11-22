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

const MARGEM_TAGS = 16; // espaço para fechar as tags abertas no fim da parte (</i></b>)

/** Tags <b>/<i> abertas e não fechadas em `s`, na ordem de abertura. */
function tagsAbertas(s) {
  const pilha = [];
  for (const m of s.matchAll(/<(\/?)([bi])>/g)) {
    if (m[1]) { const i = pilha.lastIndexOf(m[2]); if (i >= 0) pilha.splice(i, 1); } else pilha.push(m[2]);
  }
  return pilha;
}

/**
 * Corta em quebras de linha sem ultrapassar o limite, sem partir uma tag `<...>` nem uma entidade `&...;`; uma tag <b>/<i> aberta
 * no fim de uma parte é fechada ali e reaberta no começo da seguinte (o Telegram recusa HTML desbalanceado).
 */
export function dividir(texto, limite = LIMITE_TELEGRAM) {
  const partes = [];
  let resto = String(texto ?? '');
  while (resto.length > limite) {
    const alvo = limite - MARGEM_TAGS;
    let corte = resto.lastIndexOf('\n', alvo);
    if (corte <= 0) corte = alvo;
    // não cortar dentro de uma tag: se há um "<" aberto antes do corte sem ">" antes dele, recua até antes do "<"
    const abre = resto.lastIndexOf('<', corte - 1);
    if (abre >= 0 && resto.indexOf('>', abre) >= corte) corte = Math.max(1, abre);
    // não cortar dentro de uma entidade: "&" antes do corte sem ";" antes do corte
    const ecomercial = resto.lastIndexOf('&', corte - 1);
    if (ecomercial >= 0 && resto.indexOf(';', ecomercial) >= corte) corte = Math.max(1, ecomercial);
    let parte = resto.slice(0, corte).replace(/\n$/, '');
    resto = resto.slice(corte).replace(/^\n/, '');
    const abertas = tagsAbertas(parte);
    if (abertas.length) {
      parte += abertas.map((t) => `</${t}>`).reverse().join('');
      resto = abertas.map((t) => `<${t}>`).join('') + resto;
    }
    partes.push(parte);
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
