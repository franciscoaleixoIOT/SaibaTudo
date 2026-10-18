// NLU LOCAL determinístico (regras): converte uma pergunta em ParsedQuery (intenção + entidades). Não consulta nem produz fatos.
// Mesma ordem de regras do Android (LocalNlu.kt); os casos de referência estão em contracts/nlu_golden_cases.json (campo `idioma`; ausente = pt-BR).
// Intenções (docs/DATA_CONTRACT.md §8): ELEMENTO, COMPOSTO, PROPRIEDADE, MASSA_MOLAR, BALANCEAR, ESTEQUIOMETRIA, CONCENTRACAO, PH, GAS_IDEAL,
// CONVERSAO_UNIDADE, NOMENCLATURA, DESENHAR, COMPARAR, TABELA_PERIODICA, SEGURANCA, CONCEITO, NOX, ENTALPIA, EQUILIBRIO, LIGACAO, RECUSA_PERIGO,
// SOBRE_DADOS, FONTES, AJUDA, DESCONHECIDA. NOX, ENTALPIA, EQUILIBRIO e LIGACAO (17/10/2026): contrato em docs/CALCULADORAS_2026-10-17.md §1.
// Todo texto em língua natural (gatilhos, unidades por extenso, categorias…) vem do LÉXICO do idioma (contracts/lexico/<idioma>.json → js/nlu/lex/),
// recebido em `parse(pergunta, dic, contexto, lex)`; o padrão é o léxico do idioma ativo. Nada de português fixo aqui.
import { dividirEspecies } from './calc/balancear.js';
import { acharUnidade } from './calc/unidades.js';
import { tentarFormula } from './calc/formula.js';
import { lerNumero } from './formato.js';
import { avaliarSeguranca } from './seguranca.js';
import { normalizar } from './texto.js';
import { tokensOriginais } from './dicionario.js';
import { lexico } from './nlu/lex/index.js';

export const INTENTS = [
  'ELEMENTO', 'COMPOSTO', 'PROPRIEDADE', 'MASSA_MOLAR', 'BALANCEAR', 'ESTEQUIOMETRIA', 'CONCENTRACAO', 'PH', 'GAS_IDEAL', 'CONVERSAO_UNIDADE',
  'NOMENCLATURA', 'DESENHAR', 'COMPARAR', 'TABELA_PERIODICA', 'SEGURANCA', 'CONCEITO', 'NOX', 'ENTALPIA',
  'EQUILIBRIO', 'LIGACAO', 'RECUSA_PERIGO', 'SOBRE_DADOS', 'FONTES', 'AJUDA', 'DESCONHECIDA'
];

export const TAMANHO_MAXIMO = 300;

/** Grandezas (grupos de regras.unidades) de uma quantidade de estequiometria: massa, quantidade de matéria e volume. */
const GRANDEZAS_ESTEQUIOMETRIA = new Set(['massa', 'quantidade', 'volume']);
/** Propriedades (ids de regras.propriedades) que são o próprio nome: "nome IUPAC de X" num pedido de nomenclatura não é pergunta de propriedade. */
const PROPRIEDADES_DE_NOME = new Set(['nomeIupac']);

// ---------------------------------------------------------------------------------------------------- unidades (nomes por extenso: léxico)
/** Interpreta uma unidade escrita (símbolo ou nome por extenso no idioma): devolve o símbolo ou null. */
export function lerUnidade(texto, unidades, lex = lexico()) {
  const bruto = String(texto ?? '').trim().replace(/[.,;:!?]+$/, '');
  if (!bruto) return null;
  if (bruto === '%') return '%';
  const n = normalizar(bruto);
  for (const [rx, sim] of lex.unidades) if (rx.test(n)) return sim;
  if (/^[A-Za-zµμ°º/³²⁻¹·.-]+(?:-?[1-3])?$/.test(bruto) && unidades && acharUnidade(unidades, bruto.replace(/·/g, '/').replace(/\/+/g, '/')).length) return bruto;
  return null;
}

// número com vírgula ou ponto (decimal ou milhar), notação científica ("2,5 x 10^-3", "1,2 × 10²³", "1,2·10^23", "6,02.10^23", "1.2 × 10**23",
// "1.8e-5"): lerNumero decide pela heurística do idioma. Um ".10^" depois da mantissa é o "vezes dez elevado a", não a casa decimal.
const NUM = String.raw`(\d+(?:[.,](?!10\s*(?:\^|\*\*))\d+)*(?:\s*(?:[x×*·]\s*10\s*(?:(?:\^|\*\*)?\s*\{?[-−]?\d+\}?|⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)|\.10\s*(?:\^|\*\*)\s*\{?[-−]?\d+\}?|e[+-]?\d+))?)`;
// fração escrita com barra ("1/2 mol") ou caractere de fração ("½ mol"): vem antes do número comum, senão "1/2" viraria "1" e "2 mol"
const FRACAO = String.raw`\d+\s?\/\s?[1-9]\d*|[½¼¾]`;
const FRACOES_UNICODE = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
/** Valor de um número lido: fração ("1/2", "½") ou número com vírgula/ponto (lerNumero, com a convenção do idioma do léxico). */
function valorDoNumero(s, idioma) {
  if (s in FRACOES_UNICODE) return FRACOES_UNICODE[s];
  const f = /^(\d+)\s?\/\s?(\d+)$/.exec(s);
  if (f) return Number(f[2]) ? Number(f[1]) / Number(f[2]) : NaN;
  return lerNumero(s, idioma);
}
/**
 * Unidade logo depois do número (símbolo com o expoente em dígito, "dm3"; °C, % ou nome por extenso com até duas palavras: "mol por litro",
 * "degrees celsius"); a palavra vai inteira, com acentos ("átomos", "años"), como em Quantidades.kt.
 */
const unidadeRx = (lex) => String.raw`(°\s*[CF]|º\s*[CF]|%|[\p{L}µμ°º][\p{L}µμ°º/³²⁻¹·.-]*(?:-?[1-3](?![\d.,]?\d))?(?:\s+${lex.pistas.quantidadeComplemento}\s+[${lex.pistas.letrasUnidade}]+)?(?:\s+[${lex.pistas.letrasUnidade}]+)?)`;
const rxQuantCache = new WeakMap();
/** Quantidade + unidade (número, fração ou numeral por extenso do léxico: "meio mol", "two moles"). */
function rxQuant(lex) {
  if (!rxQuantCache.has(lex)) {
    const palavras = lex.numerais.map(([src]) => `(?:${src})`).join('|');
    rxQuantCache.set(lex, {
      digitos: new RegExp(String.raw`(?<![A-Za-z(\[)\]^_\-.,\d])(${FRACAO}|${NUM.slice(1, -1)})\s*${unidadeRx(lex)}?`, 'gu'),
      // aplicado ao texto em minúsculas e sem acentos (mesmo comprimento do original): "Meio mol", "três mols", "une demi-mole"
      extenso: palavras ? new RegExp(String.raw`(?<![A-Za-z\d])(${palavras})[\s-]+${unidadeRx(lex)}`, 'gu') : null,
      numerais: lex.numerais.map(([src, valor]) => [new RegExp(`^(?:${src})$`), valor])
    });
  }
  return rxQuantCache.get(lex);
}

/** Minúsculas sem acento, caractere a caractere (o texto continua com o MESMO comprimento: as posições valem no original). */
function dobrarMesmoComprimento(s) {
  let out = '';
  for (const ch of s) {
    const d = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += d.length === ch.length ? d : ch;
  }
  return out;
}

/** A unidade no começo de `cand` (até três palavras): { unidade, usado } ou nulos. */
function unidadeNoInicio(cand, unidades, lex) {
  const palavras = String(cand ?? '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  for (let k = Math.min(palavras.length, 3); k >= 1; k--) {
    const frase = palavras.slice(0, k).join(' ');
    const unidade = lerUnidade(frase.replace(/^°\s*/, '°'), unidades, lex);
    if (unidade) return { unidade, usado: frase };
  }
  return { unidade: null, usado: '' };
}

/** Quantidades com unidade encontradas no texto, na ordem: [{valor, unidade, texto}] (unidade null quando não reconhecida). */
export function lerQuantidades(texto, unidades, lex = lexico()) {
  const achadas = [];
  const original = String(texto);
  const R = rxQuant(lex);
  for (const m of original.matchAll(R.digitos)) {
    const valor = valorDoNumero(m[1], lex.idioma);
    if (!Number.isFinite(valor)) continue;
    const { unidade, usado } = unidadeNoInicio(m[2], unidades, lex);
    achadas.push({ pos: m.index, q: { valor, unidade, texto: `${m[1]}${usado ? ' ' + usado : ''}`.trim() } });
  }
  // numeral por extenso ("meio mol", "half a mole", "zwei Mol"): só conta com unidade reconhecida (senão "um elemento" seria quantidade)
  if (R.extenso) {
    for (const m of dobrarMesmoComprimento(original).matchAll(R.extenso)) {
      const inicioUnidade = m.index + m[0].length - m[2].length;
      const { unidade, usado } = unidadeNoInicio(original.slice(inicioUnidade, m.index + m[0].length), unidades, lex);
      const valor = R.numerais.find(([rxN]) => rxN.test(m[1]))?.[1];
      if (!unidade || unidade === '%' || valor == null) continue;
      achadas.push({ pos: m.index, q: { valor, unidade, texto: `${original.slice(m.index, m.index + m[1].length)} ${usado}` } });
    }
  }
  return achadas.sort((a, b) => a.pos - b.pos).map((x) => x.q);
}

/**
 * Unidades de destino de uma conversão escritas no fim da pergunta, depois de uma preposição do léxico (`pistas.paraUnidades`): uma ou várias,
 * separadas por vírgula ou por conectivo (`pistas.conectivoLista`): "para litros e metros cúbicos" → ['L', 'm3']; "para atm, kPa e torr" →
 * ['atm', 'kPa', 'Torr']. Todas as partes têm de ser unidades (senão a preposição não é a da conversão); `pistas.paraUnidadesFim` tira o resto
 * (pontuação, "umrechnen"). Devolve [] quando não acha. Espelho de `Quantidades.lerDestinos` (Android).
 */
export function lerDestinos(texto, unidades, lex = lexico()) {
  const original = String(texto ?? '');
  const dobrado = dobrarMesmoComprimento(original);
  const P = lex.pistas;
  for (const m of dobrado.matchAll(new RegExp(P.paraUnidades.source, 'g'))) {
    const ini = m.index + m[0].length;
    const caudaD = dobrado.slice(ini);
    const mf = P.paraUnidadesFim.exec(caudaD);
    const cauda = original.slice(ini, ini + (mf ? mf.index : caudaD.length));
    const partes = [[]];
    for (const tok of cauda.replace(/,/g, ' , ').split(/\s+/).filter(Boolean)) {
      if (tok === ',' || P.conectivoLista.test(normalizar(tok))) partes.push([]);
      else partes[partes.length - 1].push(tok);
    }
    // "en litres et en mètres cubes", "e para m³": a preposição repetida no começo de uma parte não conta
    const semPreposicao = (x) => { const mp = P.paraUnidades.exec(dobrarMesmoComprimento(x)); return mp && mp.index === 0 ? x.slice(mp[0].length).trim() : x; };
    const textos = partes.filter((x) => x.length).map((x) => semPreposicao(x.join(' '))).filter(Boolean);
    if (!textos.length || textos.some((x) => x.split(' ').length > 3)) continue;
    const lidas = textos.map((x) => lerUnidade(x.replace(/^°\s*/, '°'), unidades, lex));
    if (lidas.every((u) => u && u !== '%')) return [...new Set(lidas)];
  }
  return [];
}

/**
 * Liga cada "número unidade de X" à substância X: [{valor, unidade, especie (fórmula ou símbolo), cid|null}].
 * Ex.: "4 g de H2 e 16 g de O2" → [{4, g, H2}, {16, g, O2}]; "4 g of H2" em inglês.
 */
export function ligarQuantidades(texto, dic, lex = dic?.lex ?? lexico()) {
  const rx = new RegExp(String.raw`(?<![A-Za-z(\[)\]^_\-.,\d])${NUM}\s*([A-Za-zµμ°º]+(?:/[A-Za-z]+)?)\s+${lex.pistas.ligacaoPreposicoes}\s+(?=(\S+(?:\s+\S+){0,2}))`, 'gu');
  const out = [];
  for (const m of String(texto).matchAll(rx)) {
    const valor = lerNumero(m[1], lex.idioma);
    const unidade = lerUnidade(m[2], dic.unidades, lex);
    if (!Number.isFinite(valor) || !unidade) continue;
    const toks = m[3].split(/\s+/);
    for (let k = Math.min(toks.length, 3); k >= 1; k--) {
      const ent = dic.entidades(toks.slice(0, k).join(' ').replace(/[?!.,;]+$/, ''));
      const c = ent.compostos[0];
      const f = ent.formulas[0];
      const e = ent.elementos[0];
      const especie = c ? dic.entrada(c.cid)?.formula ?? null : f?.texto ?? e?.simbolo;
      if (c || especie) { out.push({ valor, unidade, especie, cid: c ? c.cid : null }); break; } // com o índice do pipeline a fórmula vem do registro do composto
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- equação (independente de idioma)
const RX_SETA = /\s*(?:<=>|<->|⇌|⇄|-->|->|→|⟶|⇒|=>|==|=)\s*/;

function ehEspecie(tok) {
  const t = tok.replace(/[.,;:!?]+$/, '');
  if (!t) return false;
  if (t === '+' || /^\d+$/.test(t)) return true;
  const partes = dividirEspecies(t);
  if (partes.length === 0) return false;
  return partes.every((p) => {
    const corpo = p.replace(/^\d+\s*/, '');
    return /^e(?:\^?[-−]|⁻)$/.test(corpo) || (!!corpo && /^[A-Z(\[]/.test(corpo) && tentarFormula(corpo) != null);
  });
}

/** Extrai "Fe + O2 -> Fe2O3" de uma frase ("balanceie a equação Fe + O2 -> Fe2O3 por favor"). null se não houver. */
export function extrairEquacao(texto) {
  const original = String(texto ?? '');
  const m = RX_SETA.exec(original);
  if (!m) return null;
  const esq = original.slice(0, m.index).trim().split(/\s+/).filter(Boolean);
  const dir = original.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean);
  const L = [];
  for (let i = esq.length - 1; i >= 0; i--) { if (ehEspecie(esq[i])) L.unshift(esq[i]); else break; }
  const R = [];
  for (let i = 0; i < dir.length; i++) { if (ehEspecie(dir[i])) R.push(dir[i].replace(/[.,;:!?]+$/, '')); else break; }
  // não termina em "+" solto
  while (L.length && L[L.length - 1] === '+') L.pop();
  while (R.length && R[R.length - 1] === '+') R.pop();
  if (!L.length || !R.length || L.every((t) => /^\d+$|^\+$/.test(t)) || R.every((t) => /^\d+$|^\+$/.test(t))) return null;
  return `${L.join(' ')} -> ${R.join(' ')}`;
}

// ---------------------------------------------------------------------------------------------------- calculadoras novas (17/10/2026)
// Contrato: docs/CALCULADORAS_2026-10-17.md §1. Campos só do cliente (como `unidadesDestino`): `concentracoes` ([X] = v mol/L, na ordem) e
// `cargaFormula` (carga escrita separada da fórmula: "Cr2O7 2-"). O símbolo Δ/∆ de "ΔH" não é palavra de nenhum idioma (a normalização o apaga).
const RX_DELTA_H = /[Δ∆]\s*H(?![a-z])/;
const RX_DELTA_HF = /[Δ∆]\s*H\s*°?\s*f(?![a-z])/;
// 18/10/2026 (§7): "ΔGf", "ΔG°f", "ΔGf°" e "ΔG de formação" (a palavra "formação" vem do léxico: `pistas.deFormacao`)
const RX_DELTA_G = /[Δ∆]\s*G\s*°?(?![a-z])/;
const RX_DELTA_GF = /[Δ∆]\s*G\s*°?\s*f(?![a-z])/;
/** Assunto de CONCEITO de "Kc/Kp" sem equação na pergunta (a resposta oferece a calculadora de equilíbrio). */
export const CONCEITO_CONSTANTE_EQUILIBRIO = 'constante de equilibrio';
/** Propriedades termoquímicas de formação de um composto (a pergunta de uma delas não é ENTALPIA de reação). */
const PROPRIEDADES_TERMO = new Set(['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK']);
const RX_SETA_DUPLA = /<=>|<->|⇌|⇄|↔/;

const rxColcheteCache = new WeakMap();
/** "[N2] = 0,5 mol/L", "[H2] é 1,5 mol/L": a espécie entre colchetes, o conector do léxico (`pistas.concentracaoColchete`) e o número. */
function rxColchete(lex) {
  if (!rxColcheteCache.has(lex)) rxColcheteCache.set(lex, new RegExp(String.raw`\[\s*([^\[\]\s]{1,24})\s*\]\s*(?:${lex.pistas.concentracaoColchete.source})\s*${NUM}`, 'gu'));
  return rxColcheteCache.get(lex);
}

/**
 * Concentrações escritas com colchetes, na ordem: [{especie, valor, unidade, inicio, fim}] (a espécie com a caixa original; `fim` inclui a unidade).
 * Espelho de `Quantidades.lerConcentracoes` (Android, a portar).
 */
export function lerConcentracoes(texto, unidades, lex = lexico()) {
  const original = String(texto ?? '');
  const dobrado = dobrarMesmoComprimento(original);
  const out = [];
  for (const m of dobrado.matchAll(rxColchete(lex))) {
    const iEsp = m.index + m[0].indexOf(m[1]);
    const iNum = m.index + m[0].length - m[2].length;
    const valor = lerNumero(original.slice(iNum, iNum + m[2].length), lex.idioma);
    if (!Number.isFinite(valor)) continue;
    const resto = original.slice(m.index + m[0].length);
    const { unidade, usado } = unidadeNoInicio(resto, unidades, lex);
    const fim = m.index + m[0].length + (usado ? resto.indexOf(usado) + usado.length : 0);
    out.push({ especie: original.slice(iEsp, iEsp + m[1].length), valor, unidade, inicio: m.index, fim });
  }
  return out;
}

/** O texto sem as concentrações entre colchetes (para achar a equação mesmo quando elas vêm antes dela). */
function semConcentracoes(original, concentracoes) {
  let s = original;
  for (const c of [...concentracoes].reverse()) s = `${s.slice(0, c.inicio)}${' '.repeat(c.fim - c.inicio)}${s.slice(c.fim)}`;
  return s;
}

/** Elemento pedido no NOX ("do enxofre no H2SO4", "of Mn in MnO4-"): o símbolo, ou null. Só pela pista do léxico (`pistas.noxAlvo`). */
function elementoDoNox(n, original, dic, lex) {
  const toks = original.split(/\s+/).map((x) => x.replace(/^[^\p{L}\d]+|[^\p{L}\d+-]+$/gu, '')).filter(Boolean);
  for (const m of n.matchAll(new RegExp(lex.pistas.noxAlvo.source, 'g'))) {
    const alvo = m[1];
    const palavras = alvo.split(' ');
    // a palavra com a caixa original ("Mn"), achada pela forma normalizada
    const orig = palavras.map((w) => toks.find((x) => normalizar(x) === w) ?? w).join(' ');
    const e = dic.entidades(orig);
    if (e.elementos.length === 1 && !e.formulas.length && !e.compostos.some((c) => c.via === 'formula')) return e.elementos[0].simbolo;
  }
  return null;
}

/** Carga escrita separada logo depois da fórmula ("Cr2O7 2-", "SO4 2-", "NH4 +"): número ou null. */
export function cargaDepoisDa(formula, original) {
  if (!formula) return null;
  const i = original.indexOf(formula);
  if (i < 0) return null;
  const m = /^\s+(\d?)([+-])(?![\w.,])|^\s+([+-])(\d)(?![\w.,])/.exec(original.slice(i + formula.length));
  if (!m) return null;
  const sinal = (m[2] ?? m[3]) === '-' ? -1 : 1;
  return sinal * Number(m[1] || m[4] || 1);
}

// ---------------------------------------------------------------------------------------------------- íons e número de massa (18/10/2026)
// Contrato: docs/CALCULADORAS_2026-10-17.md §7. Campos só do cliente: `cargaFormula` (carga de UM símbolo de elemento: "Fe2+", "Fe²⁺", "Fe+2",
// "Fe 2+", "Cl-", "íon ferro 2+", "íon ferro(II)") e `numeroMassa` ("Fe-56", "⁵⁶Fe", "ferro-56", "carbono 14?"). O modelo da nuvem não os emite:
// nuvem.js os mescla a partir de `lerIonsEIsotopo`. Espelho de `LocalNlu.lerIonsEIsotopo` (Android).
const SOBRESCRITOS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '−': '-' };
const RX_SOBRESCRITO = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻−]/g;
/** Símbolo com carga e/ou número de massa à frente: "Fe2+", "Fe+2", "Fe^{2+}", "56Fe", "56Fe3+" (o texto já sem sobrescritos). */
const RX_TOKEN_ION = /^(\d{1,3})?([A-Z][a-z]?)(?:\^?\{?(\d?[+-]|[+-]\d)\}?)?$/;
const RX_SIMBOLO_MASSA = /^([A-Z][a-z]?)-(\d{1,3})$/;
const RX_NOME_MASSA = /^(\p{L}+)-(\d{1,3})$/u;
const RX_CARGA_SOLTA = /^(?:\d[+-]|[+-]\d)$/;
const ROMANOS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

/** Carga escrita ("2+", "+2", "-", "3-") → inteiro com sinal. */
function cargaDe(s) {
  const m = /^(\d?)([+-])(\d?)$/.exec(s);
  if (!m) return null;
  return (m[2] === '-' ? -1 : 1) * Number(m[1] || m[3] || 1);
}

/** Número de massa plausível para o elemento (Z ≤ A ≤ 3Z + 10): corta coeficientes ("2Na") e temperaturas ("100K"). */
function massaPlausivel(dic, simbolo, a) {
  const z = dic.porSimbolo?.get(simbolo)?.z;
  return Number.isInteger(z) && a >= z && a <= 3 * z + 10;
}

/**
 * Íons de UM elemento e número de massa citados na pergunta: `{ ions: [{simbolo, carga}], isotopo: {simbolo, numeroMassa}|null, simbolos }`
 * (`simbolos` = os elementos citados assim, na ordem). Fórmula de mais de um elemento ("NO3-", "SO4 2-") não conta. `comPista`: a pergunta
 * fala de partículas — só então "56Fe" sem sobrescrito vale (sem a pista, "100K" e "100W" são temperatura e potência).
 */
export function lerIonsEIsotopo(original, dic, lex = dic?.lex ?? lexico(), comPista = false) {
  const texto = String(original ?? '');
  const ions = [];
  let isotopo = null;
  const simbolos = [];
  const elementoValido = (s) => !!s && !!dic?.porSimbolo?.has(s);
  const porNome = (w) => dic?.nomesElementoMap?.get(normalizar(w)) ?? null;
  const addIon = (simbolo, carga) => { if (carga != null && carga !== 0) { ions.push({ simbolo, carga }); if (!simbolos.includes(simbolo)) simbolos.push(simbolo); } };
  const addIsotopo = (simbolo, a) => {
    if (!isotopo && massaPlausivel(dic, simbolo, a)) { isotopo = { simbolo, numeroMassa: a }; if (!simbolos.includes(simbolo)) simbolos.push(simbolo); }
  };
  const brutos = texto.split(/\s+/).filter(Boolean);
  const toks = brutos.map((b) => b.replace(RX_SOBRESCRITO, (c) => SOBRESCRITOS[c]).replace(/^[^\p{L}\d+-]+|[^\p{L}\d+}-]+$/gu, '').replace(/^(.*[+-]\}?)-\p{L}+$/u, '$1'));
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prox = toks[i + 1] ?? '';
    let m = RX_TOKEN_ION.exec(t);
    if (m && (m[1] || m[3]) && elementoValido(m[2])) {
      if (m[3]) addIon(m[2], cargaDe(m[3]));
      // "56Fe" sem sobrescrito só com pista de partículas; "⁵⁶Fe" sempre
      if (m[1] && (comPista || /^[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(brutos[i].replace(/^[^\p{L}\d⁰¹²³⁴⁵⁶⁷⁸⁹]+/u, '')))) addIsotopo(m[2], Number(m[1]));
      continue;
    }
    if ((m = RX_SIMBOLO_MASSA.exec(t)) && elementoValido(m[1])) { addIsotopo(m[1], Number(m[2])); continue; }
    if (/^[A-Z][a-z]?$/.test(t) && elementoValido(t) && RX_CARGA_SOLTA.test(prox)) { addIon(t, cargaDe(prox)); i++; continue; }
    if ((m = RX_NOME_MASSA.exec(t))) { const s = porNome(m[1]); if (s) addIsotopo(s, Number(m[2])); continue; }
    const s = /^\p{L}{3,}$/u.test(t) ? porNome(t) : null;
    if (s && RX_CARGA_SOLTA.test(prox)) { addIon(s, cargaDe(prox)); i++; continue; }
    // "carbono 14?" / "carbon 14": o número no fim da frase (ou antes de pontuação), sem unidade depois
    if (s && /^\d{1,3}$/.test(prox) && (i + 2 === toks.length || /[?!.,;:)]$/.test(brutos[i + 1]))) { addIsotopo(s, Number(prox)); i++; }
  }
  // "íon ferro(II)", "iron(III) ion": nome do elemento + algarismo romano junto da palavra íon/cátion (`pistas.ionRomano` do léxico)
  if (lex?.pistas?.ionRomano) {
    const mr = lex.pistas.ionRomano.exec(normalizar(texto));
    if (mr) {
      const grupos = mr.slice(1).filter((x) => x != null);
      const s = grupos.length >= 2 ? porNome(grupos[0]) : null;
      if (s && ROMANOS[grupos[1]] && !ions.some((x) => x.simbolo === s)) addIon(s, ROMANOS[grupos[1]]);
    }
  }
  return { ions, isotopo, simbolos };
}

// ---------------------------------------------------------------------------------------------------- parse
function parseVazio(original) {
  return {
    intent: 'DESCONHECIDA', textoOriginal: original, elemento: null, elementos: [], composto: null, compostoNome: null, compostos: [], formulas: [], formula: null,
    propriedade: null, propriedades: [], quantidades: [], equacao: null, nivel: null, unidadeDestino: null, unidadesDestino: [], conceito: null,
    grupo: null, periodo: null, bloco: null, categoria: null, estado: null, extremo: null, tendencia: false, ordem: null, mistura: false, constantes: {}, seguranca: null,
    concentracoes: [], cargaFormula: null, numeroMassa: null
  };
}

function nivelDe(n, lex) {
  if (lex.nivel.fundamental.test(n)) return 'fundamental';
  if (lex.nivel.medio.test(n)) return 'medio';
  if (lex.nivel.superior.test(n)) return 'superior';
  return null;
}

function lerConstantes(original, lex) {
  const out = {};
  for (const m of original.matchAll(lex.pistas.constantes)) {
    const v = lerNumero(m[2], lex.idioma);
    if (Number.isFinite(v)) out[m[1].toLowerCase() === 'pka' ? 'pKa' : m[1].toLowerCase() === 'pkb' ? 'pKb' : m[1].toLowerCase() === 'ka' ? 'Ka' : 'Kb'] = v;
  }
  return out;
}

/** Remove o gatilho de conceito e artigos: "o que é um mol" → "mol". */
export function limparConceito(n, lex) {
  let s = n.replace(lex.intencoes.conceitoCue, '');
  for (const rx of lex.pistas.limparConceito) s = s.replace(rx, '');
  return s.trim();
}

/**
 * Tema "limpo" (como `LocalNlu.temaDoConceito` do Android): repete gatilho + limpeza do léxico, aparando, até estabilizar ("o que e um sal" → "sal").
 * O ParsedQuery guarda `limparConceito` (contrato com o Android); este só decide a regra da classe genérica.
 */
export function temaDoConceito(conceito, lex = lexico()) {
  let s = normalizar(conceito).trim();
  for (let k = 0; k < 4; k++) {
    let t = s.replace(lex.intencoes.conceitoCue, '').trim();
    for (const rx of lex.pistas.limparConceito) t = t.replace(rx, '').trim();
    if (t === s || !t) return t || s;
    s = t;
  }
  return s;
}

/**
 * "o que é um sal?" / "what is sugar?": a pergunta é só o gatilho de conceito + UM nome de classe de compostos que o pacote também usa como
 * apelido de um composto (sal → NaCl, açúcar → sacarose). Devolve o tema (a chave casada) ou null. O composto fica no ParsedQuery como sugestão.
 */
function classeGenerica(compostos, p, n, dic, lex) {
  if (compostos.length !== 1 || p.elementos.length || p.formulas.length || typeof dic.ehClasseDeCompostos !== 'function') return null;
  const c = compostos[0];
  if (c.via !== 'nome' || !c.chave || !dic.ehClasseDeCompostos(c.chave)) return null;
  return temaDoConceito(n, lex) === c.chave ? c.chave : null;
}

/**
 * @param {string} pergunta
 * @param {import('./dicionario.js').Dicionario} dic
 * @param {object|null} [contexto] ParsedQuery da última pergunta resolvida (para "e o ponto de ebulição?")
 * @param {object} [lex] léxico compilado do idioma (js/nlu/lex/index.js); padrão: o do dicionário ou o do idioma ativo
 */
export function parse(pergunta, dic, contexto = null, lex = dic?.lex ?? lexico()) {
  const original = String(pergunta ?? '').replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO);
  const p = parseVazio(original);
  const n = normalizar(original);
  if (!n && !RX_SETA.test(original)) return p;
  const I = lex.intencoes;
  const P = lex.pistas;

  // 1) segurança: antes de tudo (idioma do léxico + inglês + português)
  const seg = avaliarSeguranca(original, [lex.idioma, 'en', 'pt-BR']);
  if (seg.recusar) { p.intent = 'RECUSA_PERIGO'; p.seguranca = seg; return p; }

  const unidades = dic.unidades ?? null;
  const ents = dic.entidades(original);
  const props = dic.propriedadesEm(n);
  const quant = lerQuantidades(original, unidades, lex);
  const temQuant = quant.some((q) => q.unidade && q.unidade !== '%');
  const equacao = extrairEquacao(original);
  const nivel = nivelDe(n, lex);
  Object.assign(p, { nivel, quantidades: quant, constantes: lerConstantes(original, lex) });

  // entidades
  const comps = ents.compostos;
  const els = ents.elementos;
  // um nome que é de elemento e de composto ao mesmo tempo (ex.: "oxigênio"/"oxygen") prefere o elemento, salvo "gás"/fórmula molecular digitada
  let compostos = comps;
  if (els.length && comps.length) {
    const nomesEl = new Set(els.map((e) => normalizar(e.nome)));
    compostos = comps.filter((c) => c.via !== 'nome' || !nomesEl.has(normalizar(c.nome)) || P.gasSubstancia.test(n));
  }
  // com vários compostos, o primeiro é o da quantidade ("16 g de metano" em "quantos gramas de CO2 se formam na queima de 16 g de metano?")
  if (compostos.length > 1 && quant.length) {
    const ligado = ligarQuantidades(original, dic, lex).find((x) => x.cid != null && compostos.some((c) => c.cid === x.cid));
    if (ligado) compostos = [compostos.find((c) => c.cid === ligado.cid), ...compostos.filter((c) => c.cid !== ligado.cid)];
  }
  // um nome de elemento que só aparece dentro do nome de uma propriedade não cita o elemento ("radio atómico" em espanhol não é o rádio)
  const nSemProp = props.length && typeof dic.semPropriedades === 'function' ? dic.semPropriedades(n) : n;
  const temPalavra = (txt, w) => !!w && ` ${txt} `.includes(` ${w} `);
  const soNaPropriedade = (e) => e.via === 'nome' && temPalavra(n, normalizar(e.nome)) && !temPalavra(nSemProp, normalizar(e.nome));
  const elementos = els.filter((e) => !(compostos.length && compostos.some((c) => c.via === 'formula' && c.texto === e.simbolo)) && !soNaPropriedade(e));
  p.elementos = elementos.map((e) => e.simbolo);
  p.elemento = p.elementos[0] ?? null;
  p.compostos = compostos.map((c) => c.cid);
  p.composto = p.compostos[0] ?? null;
  p.compostoNome = compostos[0]?.nome ?? null;
  p.formulas = ents.formulas.map((f) => f.texto);
  p.formula = p.formulas[0] ?? compostos.find((c) => c.via === 'formula')?.texto ?? null;
  p.propriedades = props.map((x) => x.id);
  p.propriedade = p.propriedades[0] ?? null;
  // íon de UM elemento ("Fe2+", "Cl-", "íon ferro 2+") e número de massa ("Fe-56", "carbono-14"): o elemento, `cargaFormula` e `numeroMassa`;
  // o token sai das fórmulas e dos compostos por fórmula ("O2-" é o óxido, não o O2). Com equação na pergunta, nada muda (semirreações).
  if (!equacao) {
    const ext = lerIonsEIsotopo(original, dic, lex, props.some((x) => x.id === 'particulas'));
    if (ext.simbolos.length) {
      const doIon = (txt) => ext.simbolos.includes(String(txt ?? '').replace(/[\d+\-^{}⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻−]/g, ''));
      compostos = compostos.filter((c) => !(c.via === 'formula' && doIon(c.texto)));
      p.compostos = compostos.map((c) => c.cid);
      p.composto = p.compostos[0] ?? null;
      p.compostoNome = compostos[0]?.nome ?? null;
      p.formulas = p.formulas.filter((f) => !doIon(f));
      p.formula = p.formulas[0] ?? compostos.find((c) => c.via === 'formula')?.texto ?? null;
      // o elemento do íon/isótopo é o assunto da pergunta: vem primeiro
      p.elementos = [...new Set([...ext.simbolos, ...p.elementos])];
      p.elemento = p.elementos[0];
      const ion = ext.ions.find((x) => x.simbolo === p.elemento);
      p.cargaFormula = ion ? ion.carga : null;
      p.numeroMassa = ext.isotopo && ext.isotopo.simbolo === p.elemento ? ext.isotopo.numeroMassa : null;
    }
  }
  const nEnt = p.elementos.length + p.compostos.length + p.formulas.length;
  const tem = nEnt > 0;

  const fim = (intent, extra = {}) => { p.intent = intent; Object.assign(p, extra); return p; };

  // 2) conversa e meta
  const soAproximado = ents.tudo.length > 0 && ents.tudo.every((a) => a.via === 'aproximado');
  if (I.saudacao.test(n) && (!tem || soAproximado)) return fim('AJUDA');
  if (I.sobreDados.test(n)) return fim('SOBRE_DADOS');
  if (I.fontes.test(n) && !tem) return fim('FONTES');
  if (I.ajuda.test(n)) return fim('AJUDA');

  // 2b) equilíbrio e entalpia (docs/CALCULADORAS_2026-10-17.md §1): antes da equação química, senão a equação viraria BALANCEAR.
  // EQUILIBRIO exige a equação (⇌, <=>, <->, ⇄, → ou = entre espécies); as concentrações entre colchetes ficam em `concentracoes`.
  const concentracoes = lerConcentracoes(original, unidades, lex);
  if (I.equilibrio.test(n) || (RX_SETA_DUPLA.test(original) && concentracoes.length)) {
    const eqE = concentracoes.length ? extrairEquacao(semConcentracoes(original, concentracoes)) ?? equacao : equacao;
    // com seta dupla na pergunta (⇌, <=>, <->, ⇄), a equação fica com ⇌ (a mesma forma que a normalização do serviço usa)
    if (eqE) return fim('EQUILIBRIO', { equacao: RX_SETA_DUPLA.test(original) ? eqE.replace(' -> ', ' ⇌ ') : eqE, concentracoes });
    // Kc/Kp SEM equação ("qual o Kp a 500 K", "como calcular o Kc", "o que é Kc", "fórmula do Kp"): o conceito (18/10/2026, §7)
    if (P.constanteEquilibrio.test(n)) return fim('CONCEITO', { conceito: CONCEITO_CONSTANTE_EQUILIBRIO, propriedade: null, propriedades: [] });
  }
  const temComposto = p.compostos.length > 0 || p.formulas.length > 0;
  // "ΔHf do metano", "ΔH de formação do metano": a propriedade (entalpia padrão de formação), como "entalpia de formação do metano";
  // "ΔGf da água", "ΔG°f", "ΔG de formação": energia livre de Gibbs padrão de formação (18/10/2026)
  const deltaFormacao = (rxF, rx) => (rxF.test(original) || (rx.test(original) && P.deFormacao.test(n))) && temComposto && !equacao && !p.propriedade;
  if (deltaFormacao(RX_DELTA_GF, RX_DELTA_G)) {
    return fim('PROPRIEDADE', { propriedade: 'energiaGibbsFormacaoKJmol', propriedades: ['energiaGibbsFormacaoKJmol'], alvoPropriedade: 'composto' });
  }
  if (deltaFormacao(RX_DELTA_HF, RX_DELTA_H) && !P.entalpiaCombustao.test(n) && !P.hess.test(n)) {
    return fim('PROPRIEDADE', { propriedade: 'entalpiaFormacaoKJmol', propriedades: ['entalpiaFormacaoKJmol'], alvoPropriedade: 'composto' });
  }
  if (I.entalpia.test(n) || RX_DELTA_H.test(original)) {
    const combustao = P.entalpiaCombustao.test(n);
    const hess = P.hess.test(n);
    // "entalpia de formação da água" é PROPRIEDADE (entalpiaFormacaoKJmol); "o que é entalpia?" é CONCEITO; "entalpia livre de formação" (ΔGf) e
    // "enthalpie libre standard de formation" também são PROPRIEDADE (a propriedade termoquímica citada)
    const soFormacao = (P.entalpiaFormacao.test(n) || PROPRIEDADES_TERMO.has(p.propriedade)) && temComposto && !combustao && !hess && !equacao;
    const definicao = !equacao && !temComposto && (P.prefixoDefinicao.test(n) || I.conceitoCue.test(n));
    if (!soFormacao && !definicao && (equacao || temComposto || combustao || hess)) return fim('ENTALPIA', { equacao });
  }

  // 3) equação química
  if (equacao || I.balancear.test(n)) {
    const eq = equacao ?? null;
    const querCalcular = temQuant && P.querCalcular.test(n);
    if (eq && querCalcular) return fim('ESTEQUIOMETRIA', { equacao: eq });
    if (eq || I.balancear.test(n)) return fim('BALANCEAR', { equacao: eq });
  }

  // 4) conversão de unidades (duas unidades de uma mesma grandeza, ou "converter X para Y")
  const unidadesLidas = quant.filter((q) => q.unidade);
  const paraUnidade = (() => {
    const m = P.paraUnidade.exec(original.replace(/^(.*\d)\s+/, '$1 ').trim());
    return m ? lerUnidade(m[1], unidades, lex) : null;
  })();
  const quantosUnidade = P.quantosUnidade.exec(original);
  // "para litros e metros cúbicos", "para atm, kPa e torr": um ou vários destinos (o primeiro é o unidadeDestino)
  const destinos = lerDestinos(original, unidades, lex);
  if (!tem || p.formulas.length === 0 || temQuant) {
    const temConv = I.conversao.test(n) || P.conversaoPreposicoes.test(original);
    if (unidadesLidas.length >= 1 && temConv && !I.ph.test(n) && !I.gas.test(n) && !I.concentracao.test(n) && !I.estequiometria.test(n) && !I.massaMolar.test(n)) {
      let destino = quantosUnidade ? lerUnidade(quantosUnidade[1], unidades, lex) : paraUnidade ?? destinos[0] ?? null;
      if (!destino && unidadesLidas.length >= 2) destino = unidadesLidas[unidadesLidas.length - 1].unidade;
      const origem = unidadesLidas[0].unidade;
      if (destino && origem && destino !== origem && acharUnidade(unidades ?? { grupos: {}, prefixos: [] }, origem).length) {
        const unidadesDestino = destinos.length > 1 && destinos[0] === destino ? destinos.filter((u) => u !== origem) : [];
        return fim('CONVERSAO_UNIDADE', { unidadeDestino: destino, unidadesDestino, quantidades: [unidadesLidas[0]] });
      }
    }
  }

  // 5) cálculos
  const temKaKb = Object.keys(p.constantes).length > 0;
  if (I.ph.test(n)) {
    if (temQuant || temKaKb || tem || P.phContexto.test(n)) {
      if (temQuant || temKaKb) return fim('PH');
      if (P.conector.test(n) && tem) return fim('PH'); // "pH da água" (sem concentração): a resposta pede os dados
    }
    return fim('CONCEITO', { conceito: 'ph' });
  }
  if (I.gas.test(n) || /pv\s*=\s*nrt/i.test(original) || (I.gasVariavel.test(n) && unidadesLidas.some((q) => ['atm', 'Pa', 'kPa', 'mmHg', 'bar', 'K', '°C'].includes(q.unidade)) && P.gasGrandezas.test(n))) {
    if (P.prefixoExplicacao.test(n) && !temQuant) return fim('CONCEITO', { conceito: 'gas ideal' });
    return fim('GAS_IDEAL');
  }
  if (I.concentracao.test(n) && (temQuant || P.concentracaoForte.test(n)) && !P.prefixoExplicacaoPalavra.test(n)) return fim('CONCENTRACAO');
  // "quantas partículas subatômicas tem o oxigênio" é PROPRIEDADE particulas; "quantas partículas há em 2 mol de Fe" (com quantidade) continua cálculo
  const soParticulas = p.propriedade === 'particulas' && !temQuant;
  if (I.estequiometria.test(n) && (temQuant || tem) && !P.prefixoDefinicao.test(n) && !soParticulas) return fim('ESTEQUIOMETRIA', { equacao });
  if (I.massaMolar.test(n) && !P.prefixoDefinicao.test(n)) return fim('MASSA_MOLAR');
  // estequiometria sem "quantos": uma quantidade de massa, mols ou volume + substância citada + verbo de reação ("formada a partir de 2 g de
  // hidrogênio", "reage com 10 g de Cu2S") ou pedido de massa/mols/volume ("massa de meio mol de NaCl")
  const quantEsteq = unidadesLidas.some((q) => unidades && acharUnidade(unidades, q.unidade).some((x) => GRANDEZAS_ESTEQUIOMETRIA.has(x.grupo)));
  if (tem && quantEsteq && (P.reacaoVerbo.test(n) || P.pedidoQuantidade.test(n)) && !P.prefixoDefinicao.test(n)) return fim('ESTEQUIOMETRIA', { equacao });

  // 5b) NOX e tipo de ligação (docs/CALCULADORAS_2026-10-17.md §1). NOX exige o composto (fórmula ou nome); o `elemento` é só o átomo pedido
  // ("do enxofre no H2SO4"). "Estados de oxidação do ferro" (sem composto) continua PROPRIEDADE estadosOxidacao. O gatilho "nox" também é o
  // nome de um composto do pacote (óxidos de nitrogênio, NOx): dentro do gatilho ele não conta como composto citado.
  const outraPropriedade = p.propriedades.some((x) => x !== 'estadosOxidacao');
  const mNox = I.nox.exec(n);
  if (mNox && !outraPropriedade) {
    const gatilho = ` ${mNox[0]} `;
    const compNox = compostos.filter((c) => !(c.via === 'nome' && gatilho.includes(` ${c.chave} `)));
    const formulaNox = p.formulas[0] ?? compNox.find((c) => c.via === 'formula')?.texto ?? null;
    if (compNox.length || formulaNox) {
      const elementoNox = elementoDoNox(n, original, dic, lex);
      const cids = compNox.map((c) => c.cid);
      return fim('NOX', {
        composto: cids[0] ?? null, compostos: cids, compostoNome: compNox[0]?.nome ?? null, formula: formulaNox,
        elemento: elementoNox, elementos: elementoNox ? [elementoNox] : [], propriedade: null, propriedades: [], cargaFormula: cargaDepoisDa(formulaNox, original)
      });
    }
  }
  // LIGACAO: com composto/fórmula, ou com dois elementos (`elemento` = o primeiro, como em COMPARAR; os dois ficam em `elementos`)
  const pistaLigacao = I.ligacao.test(n) || (P.ligacaoPolaridade.test(n) && !I.comparar.test(n));
  if (pistaLigacao && !p.propriedade && !I.seguranca.test(n) && (temComposto || p.elementos.length >= 2)) return fim('LIGACAO');

  // 6) representação, comparação, segurança, nomenclatura
  if (I.comparar.test(n) && p.compostos.length + p.elementos.length + p.formulas.length >= 2) {
    // "ordem crescente de número atômico", "qual tem maior raio": a ordem pedida e, sem propriedade citada, a do extremo ("qual é mais denso")
    const extremoCmp = lex.extremos.find(([rx]) => rx.test(n))?.[1] ?? null;
    const ordem = P.ordemDecrescente.test(n) ? 'decrescente' : P.ordemCrescente.test(n) ? 'crescente' : extremoCmp ? (extremoCmp[1] === 'max' ? 'decrescente' : 'crescente') : null;
    return fim('COMPARAR', { ordem, propriedade: p.propriedade ?? (ordem && extremoCmp ? extremoCmp[0] : null) });
  }
  if (I.desenhar.test(n) && (p.compostos.length || p.formulas.length) && !P.propriedadesPalavra.test(n)) return fim('DESENHAR');
  // "a água mineral é pura ou mistura?", "classifique em substâncias e misturas": a mistura como CONCEITO, não o aviso de mistura perigosa.
  // Vale quando a palavra "mistura" (`pistas.misturaTema`) vem com uma pista de classificação (`pistas.misturaConceito`) e, sem ela, nada na
  // pergunta fala de perigo nem de misturar X com Y ("misturar água sanitária com amoníaco" e "essa mistura é tóxica?" continuam SEGURANCA).
  const temaMistura = P.misturaTema.exec(n);
  if (temaMistura && P.misturaConceito.test(n)) {
    const resto = n.replace(new RegExp(P.misturaTema.source, 'g'), ' ');
    if (!I.seguranca.test(resto) && !P.mistura.test(resto)) return fim('CONCEITO', { conceito: temaMistura[1] });
  }
  if (I.seguranca.test(n)) {
    const mistura = P.mistura.test(n);
    return fim('SEGURANCA', { mistura });
  }
  if (I.nomenclatura.test(n) && (p.compostos.length || p.formulas.length)) return fim('NOMENCLATURA');
  // "como se chama o 2-cloro-butano?", "nomeie este composto orgânico": o pedido de nome (`pistas.nomenclaturaPedido`) sobre um composto
  // (`pistas.nomenclaturaAlvo`: "composto", "molécula" ou nome com raiz orgânica; ou uma fórmula/composto citado) é NOMENCLATURA mesmo sem composto do pacote (a resposta diz
  // que não o encontrou); pergunta de elemento ou de outra propriedade (que não o próprio nome IUPAC) não entra
  const soPropriedadeDeNome = p.propriedades.every((x) => PROPRIEDADES_DE_NOME.has(x));
  if (P.nomenclaturaPedido.test(n) && (P.nomenclaturaAlvo.test(n) || p.formulas.length || p.compostos.length) && !p.elementos.length && soPropriedadeDeNome && !P.elementoPalavra.test(n)) return fim('NOMENCLATURA');

  // 7) tabela periódica
  const grupo = P.grupo.exec(n);
  const periodo = P.periodo.exec(n);
  const blocoM = P.bloco.exec(n);
  const bloco = blocoM ? blocoM.slice(1).find((x) => x != null) : null;
  const categoria = lex.categorias.find(([rx]) => rx.test(n))?.[1] ?? null;
  const estado = lex.estados.find(([rx]) => rx.test(n))?.[1] ?? null;
  const extremo = lex.extremos.find(([rx]) => rx.test(n))?.[1] ?? null;
  const tendencia = P.tendencia.test(n);
  const filtroTabela = grupo || periodo || bloco || categoria || extremo || tendencia || P.tabelaPalavra.test(n);
  if (filtroTabela && !(p.propriedade && nEnt > 0 && !grupo && !periodo && !bloco && !tendencia)) {
    const naoEhFiltroPuro = nEnt > 0 && categoria === 'metal' && !grupo && !periodo;
    if (!naoEhFiltroPuro) {
      return fim('TABELA_PERIODICA', {
        grupo: grupo ? Number(grupo[1]) : null, periodo: periodo ? Number(periodo[1]) : null, bloco: bloco ?? null, categoria,
        estado: P.elementoPalavra.test(n) || categoria ? estado : null, extremo, tendencia, propriedade: p.propriedade ?? (extremo ? extremo[0] : null)
      });
    }
  }
  if (estado && P.elementoPalavra.test(n) && nEnt === 0) return fim('TABELA_PERIODICA', { estado });

  // 8) propriedades e perfis
  if (p.propriedade && tem) {
    const alvos = new Set(props.flatMap((x) => (Array.isArray(x.escopos) && x.escopos.length ? x.escopos : [x.alvo])));
    // propriedade de composto com um elemento citado: prefere o alvo certo
    return fim('PROPRIEDADE', { alvoPropriedade: alvos.has('composto') && p.compostos.length ? 'composto' : p.elementos.length ? 'elemento' : 'composto' });
  }
  const cue = I.conceitoCue.test(n);
  if (p.propriedade && !tem && cue) return fim('CONCEITO', { conceito: limparConceito(n, lex) });
  if (p.propriedade && !tem) {
    const herdado = contexto && (contexto.elemento || contexto.composto);
    if (herdado) {
      return fim('PROPRIEDADE', { elemento: contexto.elemento, elementos: contexto.elementos ?? [], composto: contexto.composto, compostos: contexto.compostos ?? [], compostoNome: contexto.compostoNome, herdado: true });
    }
    return fim('PROPRIEDADE');
  }
  // "o que é um sal?": a classe (CONCEITO), não a ficha do composto do apelido; o composto fica em p.composto como sugestão de ficha.
  // "ponto de fusão do sal", "massa molar do sal", "o sal é perigoso?" continuam no composto (regras acima).
  const classe = cue && tem ? classeGenerica(compostos, p, n, dic, lex) : null;
  if (classe) return fim('CONCEITO', { conceito: classe });
  if (tem && (p.compostos.length || p.elementos.length || p.formulas.length)) {
    // "e do ferro?" / "and gold?" depois de uma pergunta de propriedade
    if (P.continuacao.test(n) && n.split(' ').length <= 5 && contexto?.propriedade && contexto.intent === 'PROPRIEDADE') {
      return fim('PROPRIEDADE', { propriedade: contexto.propriedade, propriedades: contexto.propriedades ?? [contexto.propriedade], herdado: true });
    }
    if (p.compostos.length || p.formulas.length) {
      if (p.elementos.length && !p.compostos.length && !p.formulas.length) return fim('ELEMENTO');
      return fim('COMPOSTO');
    }
    return fim('ELEMENTO');
  }

  // 9) conceito
  if (cue || I.conceitoTemas.test(n)) {
    const conceito = limparConceito(n, lex);
    if (conceito) return fim('CONCEITO', { conceito });
  }
  return p;
}

/** Palavras da pergunta úteis para recuperar trechos de texto (sem artigos nem verbos de pedido do idioma). */
export function termosDeBusca(texto, lex = lexico()) {
  return normalizar(texto).split(' ').filter((t) => t.length >= 2 && !lex.stopwordsBusca.has(t));
}

export { tokensOriginais };
