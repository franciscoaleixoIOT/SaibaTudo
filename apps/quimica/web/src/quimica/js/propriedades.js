// Propriedades consultáveis de elementos e compostos (ids usados pelo NLU: `regras.propriedades`). O pacote pode trazer a lista em
// regras.json (mesmo formato abaixo); sem ela vale a lista padrão, que só nomeia os campos do contrato (docs/DATA_CONTRACT.md §2 e §3).
// Rótulos no idioma ativo: `regras.propriedades[id].rotulos[idioma]` do pacote → catálogo (propriedades.rotulos) → rótulo pt-BR de referência.
// Sinônimos para o interpretador: léxico do idioma (contracts/lexico/<idioma>.json) + os do pacote (`sinonimos` em pt-BR; `sinonimosPorIdioma[idioma]`).
import { fmt } from './formato.js';
import { acharUnidade, deBase, paraBase } from './calc/unidades.js';
import { idiomaAtual, t } from './i18n/index.js';
import { lexico } from './nlu/lex/index.js';
import { listar } from './texto.js';

/** @typedef {{id: string, rotulo: string, alvo: 'elemento'|'composto', campo: string, tipo?: string, unidade?: string, sinonimos: string[]}} Propriedade */

/** Lista padrão (rótulo pt-BR de referência; os outros idiomas vêm do catálogo). Os sinônimos ficam no léxico por idioma. */
export const PROPRIEDADES_PADRAO = [
  { id: 'numeroAtomico', rotulo: 'número atômico', alvo: 'elemento', campo: 'z', tipo: 'inteiro' },
  { id: 'massaAtomica', rotulo: 'massa atômica', alvo: 'elemento', campo: 'massaAtomica', tipo: 'massaAtomica', unidade: 'u' },
  { id: 'simbolo', rotulo: 'símbolo', alvo: 'elemento', campo: 'simbolo', tipo: 'texto' },
  { id: 'grupo', rotulo: 'grupo (família)', alvo: 'elemento', campo: 'grupo', tipo: 'inteiro' },
  { id: 'periodo', rotulo: 'período', alvo: 'elemento', campo: 'periodo', tipo: 'inteiro' },
  { id: 'bloco', rotulo: 'bloco', alvo: 'elemento', campo: 'bloco', tipo: 'texto' },
  { id: 'categoria', rotulo: 'categoria', alvo: 'elemento', campo: 'categoria', tipo: 'categoria' },
  { id: 'configuracaoEletronica', rotulo: 'configuração eletrônica', alvo: 'elemento', campo: 'configuracaoEletronica', tipo: 'texto' },
  { id: 'eletronegatividade', rotulo: 'eletronegatividade (Pauling)', alvo: 'elemento', campo: 'eletronegatividade', tipo: 'numero' },
  { id: 'raioAtomicoPm', rotulo: 'raio atômico (van der Waals)', alvo: 'elemento', campo: 'raioAtomicoPm', tipo: 'numero', unidade: 'pm' },
  { id: 'afinidadeEletronicaKJmol', rotulo: 'afinidade eletrônica', alvo: 'elemento', campo: 'afinidadeEletronicaKJmol', tipo: 'numero', unidade: 'kJ/mol' },
  { id: 'energiaIonizacaoKJmol', rotulo: 'energia de ionização', alvo: 'elemento', campo: 'energiaIonizacaoKJmol', tipo: 'numero', unidade: 'kJ/mol' },
  { id: 'pontoFusaoK', rotulo: 'ponto de fusão', alvo: 'elemento', campo: 'pontoFusaoK', tipo: 'temperatura' },
  { id: 'pontoEbulicaoK', rotulo: 'ponto de ebulição', alvo: 'elemento', campo: 'pontoEbulicaoK', tipo: 'temperatura' },
  { id: 'densidadeKgm3', rotulo: 'densidade', alvo: 'elemento', campo: 'densidadeKgm3', tipo: 'densidade' },
  { id: 'estadoPadrao', rotulo: 'estado físico (condições padrão)', alvo: 'elemento', campo: 'estadoPadrao', tipo: 'estado' },
  { id: 'estadosOxidacao', rotulo: 'estados de oxidação', alvo: 'elemento', campo: 'estadosOxidacao', tipo: 'lista' },
  { id: 'descoberta', rotulo: 'descoberta', alvo: 'elemento', campo: 'descoberta', tipo: 'descoberta' },

  { id: 'massaMolar', rotulo: 'massa molar', alvo: 'composto', campo: 'massaMolar', tipo: 'massaMolar', unidade: 'g/mol' },
  { id: 'massaExata', rotulo: 'massa exata (monoisotópica)', alvo: 'composto', campo: 'massaExata', tipo: 'numero', unidade: 'u' },
  { id: 'formula', rotulo: 'fórmula', alvo: 'composto', campo: 'formula', tipo: 'formula' },
  { id: 'cas', rotulo: 'número CAS', alvo: 'composto', campo: 'cas', tipo: 'texto' },
  { id: 'cid', rotulo: 'CID no PubChem', alvo: 'composto', campo: 'cid', tipo: 'inteiro' },
  { id: 'smiles', rotulo: 'SMILES', alvo: 'composto', campo: 'smiles', tipo: 'texto' },
  { id: 'inchiKey', rotulo: 'InChIKey', alvo: 'composto', campo: 'inchiKey', tipo: 'texto' },
  { id: 'nomeIupac', rotulo: 'nome IUPAC', alvo: 'composto', campo: 'nomeIupac', tipo: 'texto' },
  { id: 'xlogp', rotulo: 'XLogP (lipofilicidade calculada)', alvo: 'composto', campo: 'xlogp', tipo: 'numero' },
  { id: 'doadoresH', rotulo: 'doadores de ligação de hidrogênio', alvo: 'composto', campo: 'doadoresH', tipo: 'inteiro' },
  { id: 'aceptoresH', rotulo: 'aceptores de ligação de hidrogênio', alvo: 'composto', campo: 'aceptoresH', tipo: 'inteiro' },
  { id: 'ligacoesRotaveis', rotulo: 'ligações rotáveis', alvo: 'composto', campo: 'ligacoesRotaveis', tipo: 'inteiro' },
  { id: 'carga', rotulo: 'carga elétrica', alvo: 'composto', campo: 'carga', tipo: 'inteiro' },
  { id: 'tpsa', rotulo: 'área de superfície polar (TPSA)', alvo: 'composto', campo: 'tpsa', tipo: 'numero', unidade: 'Å²' }
];

/** Compostos têm os campos calculados dentro de `propriedades`. */
const CAMPOS_EM_PROPRIEDADES = new Set(['xlogp', 'doadoresH', 'aceptoresH', 'ligacoesRotaveis', 'carga', 'tpsa']);

/** Rótulos pt-BR de referência (compatibilidade); use rotuloCategoria()/categoriaRotulo() para o idioma ativo. */
export const ROTULO_CATEGORIA = {
  metal_alcalino: 'metal alcalino', metal_alcalino_terroso: 'metal alcalino-terroso', metal_transicao: 'metal de transição',
  metal_pos_transicao: 'metal pós-transição', semimetal: 'semimetal (metaloide)', nao_metal: 'não metal', halogenio: 'halogênio',
  gas_nobre: 'gás nobre', lantanideo: 'lantanídeo', actinideo: 'actinídeo', desconhecida: 'propriedades químicas desconhecidas'
};
export const CATEGORIAS = Object.keys(ROTULO_CATEGORIA);

const CHAVE_ESTADO = { solido: 'solido', solid: 'solido', liquido: 'liquido', liquid: 'liquido', gas: 'gas', gasoso: 'gas', desconhecido: 'desconhecido', unknown: 'desconhecido' };
export const ROTULO_ESTADO = { solido: 'sólido', solid: 'sólido', liquido: 'líquido', liquid: 'líquido', gas: 'gás', gasoso: 'gás', desconhecido: 'desconhecido', unknown: 'desconhecido' };

/** Chave interna do estado físico ('solido' | 'liquido' | 'gas' | 'desconhecido') a partir do valor do pacote (pt ou en). */
export const estadoChave = (e) => CHAVE_ESTADO[String(e ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? 'desconhecido';
/** Rótulo do estado físico no idioma ativo. */
export const estadoRotulo = (e) => {
  const k = CHAVE_ESTADO[String(e ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')];
  return k ? t(`propriedades.estados.${k}`) : e ? String(e) : t('propriedades.estados.desconhecido');
};
/** Rótulo da categoria no idioma ativo (singular). */
export const categoriaRotulo = (c) => (c in ROTULO_CATEGORIA || c === 'metal' ? t(`propriedades.categorias.${c}`) : String(c ?? '').replace(/_/g, ' '));
export const rotuloCategoria = categoriaRotulo;
/** Rótulo da categoria no plural ("metais alcalinos"). */
export const categoriaPlural = (c) => (c in ROTULO_CATEGORIA || c === 'metal' ? t(`propriedades.categoriasPlural.${c}`) : categoriaRotulo(c));

/** Rótulo de uma propriedade no idioma: do pacote (`rotulos[idioma]`) → catálogo → referência pt-BR. */
export function rotuloPropriedade(p, idioma = idiomaAtual()) {
  const doPacote = p?.rotulos?.[idioma];
  if (typeof doPacote === 'string' && doPacote) return doPacote;
  const doCatalogo = t(`propriedades.rotulos.${p.id}`, undefined, idioma);
  if (doCatalogo !== `propriedades.rotulos.${p.id}`) return doCatalogo;
  return p.rotulo ?? p.nome ?? p.id;
}

/**
 * Lista efetiva no idioma: a padrão, com rótulos do idioma e sinônimos do léxico, enriquecida com `regras.propriedades` do pacote. Aceita o formato
 * do pipeline ({id: {nome, unidade, origem: "elementos.pontoFusaoK", escopo, sinonimos, rotulos?, sinonimosPorIdioma?}}, ids em snake_case): cada
 * propriedade do pacote é casada com a padrão pelo campo de origem, e seus sinônimos são somados (os `sinonimos` legados são pt-BR; os por idioma
 * valem no idioma). Propriedades do pacote sem correspondente e sem `campo` (ex.: pictogramas) são ignoradas aqui: os perigos têm tratamento próprio.
 */
export function tabelaDePropriedades(regras, idioma = idiomaAtual()) {
  const lex = lexico(idioma);
  const doPacote = regras?.propriedades;
  const lista = Array.isArray(doPacote) ? doPacote : doPacote && typeof doPacote === 'object' ? Object.entries(doPacote).map(([id, v]) => ({ id, ...v })) : [];
  const mapa = new Map(PROPRIEDADES_PADRAO.map((p) => [p.id, { ...p, rotuloPt: p.rotulo, rotulo: rotuloPropriedade(p, idioma), sinonimos: [...(lex.propriedades[p.id] ?? [])] }]));
  const somar = (base, sin) => { base.sinonimos = [...new Set([...(base.sinonimos ?? []), ...(Array.isArray(sin) ? sin : [])])]; };
  const sinonimosDoPacote = (p) => [...(idioma === 'pt-BR' && Array.isArray(p.sinonimos) ? p.sinonimos : []), ...(Array.isArray(p.sinonimosPorIdioma?.[idioma]) ? p.sinonimosPorIdioma[idioma] : [])];
  for (const p of lista) {
    if (!p?.id) continue;
    const alvo = p.alvo ?? p.escopo;
    let base = mapa.get(p.id);
    if (!base && p.origem) {
      const caminho = String(p.origem).split('.').slice(1); // ['pontoFusaoK'] | ['descoberta', 'ano'] | ['propriedades', 'xlogp']
      const campo = caminho[0] === 'propriedades' ? caminho[1] : caminho[0];
      base = [...mapa.values()].find((x) => (!alvo || x.alvo === alvo) && (x.campo === campo || (caminho[0] === 'propriedades' && x.id === campo)));
    }
    if (base) {
      somar(base, sinonimosDoPacote(p));
      if (typeof p.rotulos?.[idioma] === 'string' && p.rotulos[idioma]) base.rotulo = p.rotulos[idioma];
      continue;
    }
    if (p.campo) {
      const nova = { alvo: alvo ?? 'elemento', tipo: 'texto', ...p, sinonimos: sinonimosDoPacote(p) };
      nova.rotulo = p.rotulos?.[idioma] ?? (idioma === 'pt-BR' ? p.rotulo ?? p.nome : null) ?? p.rotulo ?? p.nome ?? p.id;
      mapa.set(p.id, nova);
    }
  }
  return [...mapa.values()];
}

/** Valor bruto da propriedade no registro (elemento ou composto); undefined se ausente. */
export function valorBruto(prop, registro) {
  if (!registro) return undefined;
  const v = CAMPOS_EM_PROPRIEDADES.has(prop.id) && prop.alvo === 'composto' ? registro.propriedades?.[prop.id] : registro[prop.campo];
  return v === null ? undefined : v;
}

function emCelsius(K, ctx) {
  try { return deBase(ctx.unidades, '°C', 'temperatura', K); } catch { return null; }
}

/** Densidade em g/cm³ a partir de kg/m³, usando a tabela de unidades (kg→g e m³→cm³). */
function paraGcm3(kgm3, ctx) {
  try {
    const kgParaG = paraBase(ctx.unidades, 'kg', 'massa', 1) / paraBase(ctx.unidades, 'g', 'massa', 1);
    const m3ParaCm3 = paraBase(ctx.unidades, 'm3', 'volume', 1) / paraBase(ctx.unidades, 'cm3', 'volume', 1);
    return (kgm3 * kgParaG) / m3ParaCm3;
  } catch { return null; }
}

/**
 * Texto legível do valor, com unidades (K também em °C, kg/m³ também em g/cm³), no formato numérico do idioma ativo.
 * @returns {{texto: string, curto: string, numeros: number[]}|null}
 */
export function formatarValor(prop, valor, ctx) {
  if (valor === undefined || valor === null || valor === '') return null;
  switch (prop.tipo) {
    case 'temperatura': {
      const c = emCelsius(valor, ctx);
      const k = `${fmt(valor, { sig: 7 })} K`;
      return { texto: c == null ? k : `${k} (${fmt(c, { sig: 7 })} °C)`, curto: k, numeros: c == null ? [valor] : [valor, c] };
    }
    case 'densidade': {
      const g = paraGcm3(valor, ctx);
      const base = `${fmt(valor, { sig: 7 })} kg/m³`;
      return { texto: g == null ? base : `${base} (${fmt(g, { sig: 7 })} g/cm³)`, curto: base, numeros: g == null ? [valor] : [valor, g] };
    }
    case 'massaAtomica': return { texto: `${fmt(valor, { sig: 9 })} u (g/mol)`, curto: `${fmt(valor, { sig: 9 })} u`, numeros: [valor] };
    case 'massaMolar': return { texto: `${fmt(valor, { sig: 9 })} g/mol`, curto: `${fmt(valor, { sig: 9 })} g/mol`, numeros: [valor] };
    case 'numero': {
      const tx = `${fmt(valor, { sig: 7 })}${prop.unidade ? ` ${prop.unidade}` : ''}`;
      return { texto: tx, curto: tx, numeros: [valor] };
    }
    case 'inteiro': return { texto: String(valor), curto: String(valor), numeros: [valor] };
    case 'categoria': return { texto: categoriaRotulo(valor), curto: categoriaRotulo(valor), numeros: [] };
    case 'estado': return { texto: estadoRotulo(valor), curto: estadoRotulo(valor), numeros: [] };
    case 'lista': {
      const l = (Array.isArray(valor) ? valor : [valor]).map((x) => (typeof x === 'number' && x > 0 ? `+${x}` : String(x).replace('-', '−')));
      return { texto: listar(l), curto: l.join(', '), numeros: Array.isArray(valor) ? valor.filter((x) => typeof x === 'number') : [] };
    }
    case 'descoberta': {
      const ano = valor?.ano;
      const por = valor?.por;
      const tx = [ano != null ? t('propriedades.descoberta.em', { ano }) : null, por ? t('propriedades.descoberta.por', { por }) : null].filter(Boolean).join(' ');
      return tx ? { texto: tx, curto: tx, numeros: ano != null ? [ano] : [] } : null;
    }
    default: return { texto: String(valor), curto: String(valor), numeros: [] };
  }
}

/** Unidades da propriedade reconhecidas na tabela (útil para validar `unidade` do pacote). */
export const unidadeConhecida = (ctx, u) => acharUnidade(ctx.unidades, u).length > 0;

/** Rótulo da classe de um composto ("acido_carboxilico" → "ácido carboxílico") no idioma ativo. */
export const classeRotulo = (x) => { const v = t(`propriedades.classes.${x}`); return v === `propriedades.classes.${x}` ? String(x).replace(/_/g, ' ') : v; };

/** Nome legível de uma unidade (seletor do conversor): catálogo do idioma → nome da tabela (pacote/padrão). */
export const nomeUnidade = (simbolo, nomeDaTabela) => { const v = t(`propriedades.unidades.${simbolo}`); return v === `propriedades.unidades.${simbolo}` ? nomeDaTabela ?? simbolo : v; };
