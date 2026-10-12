// Preferências (tema e tamanho do texto): ficam só neste navegador (localStorage). Nada é enviado a servidores.
const CHAVE = 'stq:prefs';

export const TEMAS = { SISTEMA: 'Seguir o sistema', CLARO: 'Claro', ESCURO: 'Escuro' };
export const FONTES = {
  PEQUENA: { rotulo: 'Pequena', fator: 0.9 }, NORMAL: { rotulo: 'Normal', fator: 1 },
  GRANDE: { rotulo: 'Grande', fator: 1.15 }, MUITO_GRANDE: { rotulo: 'Muito grande', fator: 1.3 }
};
export const PADRAO = Object.freeze({ tema: 'SISTEMA', tamanhoFonte: 'NORMAL', historicoPerguntas: Object.freeze([]) });
export const MAX_HISTORICO = 50;

let memoria = null; // fallback quando o armazenamento está bloqueado (modo privado etc.)

/** Valida e completa as preferências lidas (valores inválidos voltam ao padrão). */
/** Histórico de perguntas: só textos não vazios, sem espaços nas pontas, no máximo 300 caracteres e as últimas MAX_HISTORICO. */
export function sanearHistorico(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x) => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim().slice(0, 300)).slice(-MAX_HISTORICO);
}

/** Acrescenta a pergunta ao histórico salvo (sem repetir a última) e devolve a lista nova. */
export function registrarPergunta(pergunta) {
  const atual = carregar();
  const itens = atual.historicoPerguntas ?? [];
  const texto = String(pergunta ?? '').trim();
  if (!texto || itens[itens.length - 1] === texto) return itens;
  const novos = sanearHistorico([...itens, texto]);
  salvar({ ...atual, historicoPerguntas: novos });
  return novos;
}

export function sanear(b) {
  const o = b && typeof b === 'object' ? b : {};
  return {
    historicoPerguntas: sanearHistorico(o.historicoPerguntas), tema: o.tema in TEMAS ? o.tema : PADRAO.tema, tamanhoFonte: o.tamanhoFonte in FONTES ? o.tamanhoFonte : PADRAO.tamanhoFonte };
}

export function carregar() {
  let bruto = null;
  try { bruto = JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); } catch { bruto = memoria; }
  memoria = sanear(bruto);
  return memoria;
}

export function salvar(p) {
  memoria = p;
  try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: vale só nesta sessão */ }
}

export function apagar() {
  memoria = null;
  try { localStorage.removeItem(CHAVE); } catch { /* ignorado */ }
}

/** Aplica tema e tamanho de texto ao documento. */
export function aplicarAparencia(p, doc = document) {
  const r = doc.documentElement;
  if (p.tema === 'CLARO') r.setAttribute('data-theme', 'light');
  else if (p.tema === 'ESCURO') r.setAttribute('data-theme', 'dark');
  else r.removeAttribute('data-theme');
  r.style.setProperty('--fs', String(FONTES[p.tamanhoFonte].fator));
}

/** O tema efetivo agora ('light' | 'dark'), considerando a preferência do aparelho. */
export function temaEfetivo(doc = document) {
  const t = doc.documentElement.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
