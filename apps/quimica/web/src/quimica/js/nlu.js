// NLU LOCAL determinístico (regras): converte uma pergunta em ParsedQuery (intenção + entidades). Não consulta nem produz fatos.
// Mesma ordem de regras do Android (LocalNlu.kt); os casos de referência estão em contracts/nlu_golden_cases.json (campo `idioma`; ausente = pt-BR).
// Intenções (docs/DATA_CONTRACT.md §8): ELEMENTO, COMPOSTO, PROPRIEDADE, MASSA_MOLAR, BALANCEAR, ESTEQUIOMETRIA, CONCENTRACAO, PH, GAS_IDEAL,
// CONVERSAO_UNIDADE, NOMENCLATURA, DESENHAR, COMPARAR, TABELA_PERIODICA, SEGURANCA, CONCEITO, RECUSA_PERIGO, SOBRE_DADOS, FONTES, AJUDA, DESCONHECIDA.
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
  'NOMENCLATURA', 'DESENHAR', 'COMPARAR', 'TABELA_PERIODICA', 'SEGURANCA', 'CONCEITO', 'RECUSA_PERIGO', 'SOBRE_DADOS', 'FONTES', 'AJUDA', 'DESCONHECIDA'
];

export const TAMANHO_MAXIMO = 300;

// ---------------------------------------------------------------------------------------------------- unidades (nomes por extenso: léxico)
/** Interpreta uma unidade escrita (símbolo ou nome por extenso no idioma): devolve o símbolo ou null. */
export function lerUnidade(texto, unidades, lex = lexico()) {
  const bruto = String(texto ?? '').trim().replace(/[.,;:!?]+$/, '');
  if (!bruto) return null;
  if (bruto === '%') return '%';
  const n = normalizar(bruto);
  for (const [rx, sim] of lex.unidades) if (rx.test(n)) return sim;
  if (/^[A-Za-zµμ°º/³²⁻¹·.-]+$/.test(bruto) && unidades && acharUnidade(unidades, bruto.replace(/·/g, '/').replace(/\/+/g, '/')).length) return bruto;
  return null;
}

// número com vírgula ou ponto (decimal ou milhar), notação científica ("2,5 x 10^-3", "1.8e-5"): lerNumero decide pela heurística do idioma
const NUM = String.raw`(\d+(?:[.,]\d+)*(?:\s*(?:[x×*]\s*10\s*\^?\s*\{?-?\d+\}?|e[+-]?\d+))?)`;
const rxQuantCache = new WeakMap();
/** Quantidade + unidade (símbolo, °C, % ou nome por extenso com até duas palavras: "mol por litro", "degrees celsius"). */
function rxQuant(lex) {
  if (!rxQuantCache.has(lex)) {
    const L = lex.pistas.letrasUnidade;
    rxQuantCache.set(lex, new RegExp(String.raw`(?<![A-Za-z(\[)\]^_\-.,\d])${NUM}\s*(°\s*[CF]|º\s*[CF]|%|[A-Za-zµμ°º][A-Za-zµμ°º/³²⁻¹·.-]*(?:\s+${lex.pistas.quantidadeComplemento}\s+[${L}]+)?(?:\s+[${L}]+)?)?`, 'gu'));
  }
  return rxQuantCache.get(lex);
}

/** Quantidades com unidade encontradas no texto: [{valor, unidade, texto}] (unidade null quando não reconhecida). */
export function lerQuantidades(texto, unidades, lex = lexico()) {
  const out = [];
  for (const m of String(texto).matchAll(rxQuant(lex))) {
    const valor = lerNumero(m[1]);
    if (!Number.isFinite(valor)) continue;
    let unidade = null;
    let usado = '';
    const cand = (m[2] ?? '').trim().replace(/\s+/g, ' ');
    if (cand) {
      const palavras = cand.split(' ');
      for (let k = Math.min(palavras.length, 3); k >= 1 && !unidade; k--) {
        const frase = palavras.slice(0, k).join(' ');
        unidade = lerUnidade(frase.replace(/^°\s*/, '°'), unidades, lex);
        if (unidade) usado = frase;
      }
    }
    out.push({ valor, unidade, texto: `${m[1]}${usado ? ' ' + usado : ''}`.trim() });
  }
  return out;
}

/**
 * Liga cada "número unidade de X" à substância X: [{valor, unidade, especie (fórmula ou símbolo), cid|null}].
 * Ex.: "4 g de H2 e 16 g de O2" → [{4, g, H2}, {16, g, O2}]; "4 g of H2" em inglês.
 */
export function ligarQuantidades(texto, dic, lex = dic?.lex ?? lexico()) {
  const rx = new RegExp(String.raw`(?<![A-Za-z(\[)\]^_\-.,\d])${NUM}\s*([A-Za-zµμ°º]+(?:/[A-Za-z]+)?)\s+${lex.pistas.ligacaoPreposicoes}\s+(?=(\S+(?:\s+\S+){0,2}))`, 'gu');
  const out = [];
  for (const m of String(texto).matchAll(rx)) {
    const valor = lerNumero(m[1]);
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

// ---------------------------------------------------------------------------------------------------- parse
function parseVazio(original) {
  return {
    intent: 'DESCONHECIDA', textoOriginal: original, elemento: null, elementos: [], composto: null, compostoNome: null, compostos: [], formulas: [], formula: null,
    propriedade: null, propriedades: [], quantidades: [], equacao: null, nivel: null, unidadeDestino: null, conceito: null,
    grupo: null, periodo: null, bloco: null, categoria: null, estado: null, extremo: null, tendencia: false, mistura: false, constantes: {}, seguranca: null
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
    const v = lerNumero(m[2]);
    if (Number.isFinite(v)) out[m[1].toLowerCase() === 'pka' ? 'pKa' : m[1].toLowerCase() === 'pkb' ? 'pKb' : m[1].toLowerCase() === 'ka' ? 'Ka' : 'Kb'] = v;
  }
  return out;
}

/** Remove o gatilho de conceito e artigos: "o que é um mol" → "mol". */
function limparConceito(n, lex) {
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
  const elementos = els.filter((e) => !(compostos.length && compostos.some((c) => c.via === 'formula' && c.texto === e.simbolo)));
  p.elementos = elementos.map((e) => e.simbolo);
  p.elemento = p.elementos[0] ?? null;
  p.compostos = compostos.map((c) => c.cid);
  p.composto = p.compostos[0] ?? null;
  p.compostoNome = compostos[0]?.nome ?? null;
  p.formulas = ents.formulas.map((f) => f.texto);
  p.formula = p.formulas[0] ?? compostos.find((c) => c.via === 'formula')?.texto ?? null;
  p.propriedades = props.map((x) => x.id);
  p.propriedade = p.propriedades[0] ?? null;
  const nEnt = p.elementos.length + p.compostos.length + p.formulas.length;
  const tem = nEnt > 0;

  const fim = (intent, extra = {}) => { p.intent = intent; Object.assign(p, extra); return p; };

  // 2) conversa e meta
  const soAproximado = ents.tudo.length > 0 && ents.tudo.every((a) => a.via === 'aproximado');
  if (I.saudacao.test(n) && (!tem || soAproximado)) return fim('AJUDA');
  if (I.sobreDados.test(n)) return fim('SOBRE_DADOS');
  if (I.fontes.test(n) && !tem) return fim('FONTES');
  if (I.ajuda.test(n)) return fim('AJUDA');

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
  if (!tem || p.formulas.length === 0 || temQuant) {
    const temConv = I.conversao.test(n) || P.conversaoPreposicoes.test(original);
    if (unidadesLidas.length >= 1 && temConv && !I.ph.test(n) && !I.gas.test(n) && !I.concentracao.test(n) && !I.estequiometria.test(n) && !I.massaMolar.test(n)) {
      let destino = quantosUnidade ? lerUnidade(quantosUnidade[1], unidades, lex) : paraUnidade;
      if (!destino && unidadesLidas.length >= 2) destino = unidadesLidas[unidadesLidas.length - 1].unidade;
      const origem = unidadesLidas[0].unidade;
      if (destino && origem && destino !== origem && acharUnidade(unidades ?? { grupos: {}, prefixos: [] }, origem).length) {
        return fim('CONVERSAO_UNIDADE', { unidadeDestino: destino, quantidades: [unidadesLidas[0]] });
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
  if (I.estequiometria.test(n) && (temQuant || tem) && !P.prefixoDefinicao.test(n)) return fim('ESTEQUIOMETRIA', { equacao });
  if (I.massaMolar.test(n) && !P.prefixoDefinicao.test(n)) return fim('MASSA_MOLAR');

  // 6) representação, comparação, segurança, nomenclatura
  if (I.comparar.test(n) && p.compostos.length + p.elementos.length + p.formulas.length >= 2) return fim('COMPARAR');
  if (I.desenhar.test(n) && (p.compostos.length || p.formulas.length) && !P.propriedadesPalavra.test(n)) return fim('DESENHAR');
  if (I.seguranca.test(n)) {
    const mistura = P.mistura.test(n);
    return fim('SEGURANCA', { mistura });
  }
  if (I.nomenclatura.test(n) && (p.compostos.length || p.formulas.length)) return fim('NOMENCLATURA');

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
