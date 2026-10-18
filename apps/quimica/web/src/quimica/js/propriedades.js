// Propriedades consultáveis de elementos e compostos (ids usados pelo NLU: `regras.propriedades`). O pacote pode trazer a lista em
// regras.json (mesmo formato abaixo); sem ela vale a lista padrão, que só nomeia os campos do contrato (docs/DATA_CONTRACT.md §2 e §3).
// Rótulos no idioma ativo: `regras.propriedades[id].rotulos[idioma]` do pacote → catálogo (propriedades.rotulos) → rótulo pt-BR de referência.
// Sinônimos para o interpretador: léxico do idioma (contracts/lexico/<idioma>.json) + os do pacote (`sinonimos` em pt-BR; `sinonimosPorIdioma[idioma]`).
import { fmt } from './formato.js';
import { acharUnidade, deBase, paraBase } from './calc/unidades.js';
import { idiomaAtual, t } from './i18n/index.js';
import { lexico } from './nlu/lex/index.js';
import { listar } from './texto.js';

/**
 * @typedef {{id: string, rotulo: string, alvo: 'elemento'|'composto', escopos: ('elemento'|'composto')[], campo: string, campos?: string[], tipo?: string,
 *   unidade?: string, medida?: boolean, sinonimos: string[]}} Propriedade
 * `alvo` é o escopo principal (compatibilidade); `escopos` diz em que registros a propriedade existe (DATA_CONTRACT §3.1: fusão, ebulição, densidade e
 * estado físico valem para elemento E composto). `medida` = propriedade física medida do composto, lida de `propriedades` com origem por valor
 * (`fontesPorPropriedade[campo]`); `campos` = campos possíveis no registro do composto, em ordem de preferência (solubilidade e pKa têm dois).
 */

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
  { id: 'pontoFusaoK', rotulo: 'ponto de fusão', alvo: 'elemento', escopos: ['elemento', 'composto'], campo: 'pontoFusaoK', tipo: 'temperatura', medida: true },
  { id: 'pontoEbulicaoK', rotulo: 'ponto de ebulição', alvo: 'elemento', escopos: ['elemento', 'composto'], campo: 'pontoEbulicaoK', tipo: 'temperatura', medida: true },
  { id: 'densidadeKgm3', rotulo: 'densidade', alvo: 'elemento', escopos: ['elemento', 'composto'], campo: 'densidadeKgm3', tipo: 'densidade', medida: true },
  { id: 'estadoPadrao', rotulo: 'estado físico (condições padrão)', alvo: 'elemento', escopos: ['elemento', 'composto'], campo: 'estadoPadrao', tipo: 'estado', medida: true },
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
  { id: 'tpsa', rotulo: 'área de superfície polar (TPSA)', alvo: 'composto', campo: 'tpsa', tipo: 'numero', unidade: 'Å²' },
  // medidas do composto (Wikidata, DATA_CONTRACT §3.1): sem valor no pacote = sem valor na resposta
  { id: 'solubilidade', rotulo: 'solubilidade em água', alvo: 'composto', campo: 'solubilidadeAguaG100g', campos: ['solubilidadeAguaG100g', 'solubilidadeAguaGL'], tipo: 'solubilidade', medida: true },
  { id: 'pka', rotulo: 'pKa', alvo: 'composto', campo: 'pka', campos: ['pkaValores', 'pka'], tipo: 'pka', medida: true },
  // 17/10/2026 (docs/CALCULADORAS_2026-10-17.md §3): ΔHf° a 298,15 K, Wikidata P3078 (CC0), em `propriedades.entalpiaFormacaoKJmol`
  { id: 'entalpiaFormacaoKJmol', rotulo: 'entalpia padrão de formação', alvo: 'composto', campo: 'entalpiaFormacaoKJmol', tipo: 'numero', unidade: 'kJ/mol', medida: true, casasMax: 2, grandeza: 'ΔHf°' },
  // 18/10/2026 (docs/CALCULADORAS_2026-10-17.md §7): ΔGf° (kJ/mol) e S° (J/(mol·K)) a 298,15 K, chembox da Wikipédia em inglês (CC BY-SA 4.0),
  // em `propriedades.energiaGibbsFormacaoKJmol` / `propriedades.entropiaPadraoJmolK` (DATA_CONTRACT §3.1)
  { id: 'energiaGibbsFormacaoKJmol', rotulo: 'energia livre de Gibbs padrão de formação', alvo: 'composto', campo: 'energiaGibbsFormacaoKJmol', tipo: 'numero', unidade: 'kJ/mol', medida: true, casasMax: 2, grandeza: 'ΔGf°' },
  { id: 'entropiaPadraoJmolK', rotulo: 'entropia molar padrão', alvo: 'composto', campo: 'entropiaPadraoJmolK', tipo: 'numero', unidade: 'J/(mol·K)', medida: true, casasMax: 2, grandeza: 'S°' },
  // prótons, nêutrons e elétrons do átomo ou do íon (derivados de `z`, da carga `cargaFormula` e do número de massa `numeroMassa` da pergunta)
  { id: 'particulas', rotulo: 'prótons, nêutrons e elétrons', alvo: 'elemento', campo: 'z', tipo: 'particulas' }
];

/** Ids das propriedades físicas medidas dos compostos, na ordem da ficha (a termoquímica padrão por último, 18/10/2026). */
export const MEDIDAS_COMPOSTO = ['estadoPadrao', 'pontoFusaoK', 'pontoEbulicaoK', 'densidadeKgm3', 'solubilidade', 'pka', 'entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK'];
/** Termoquímica padrão a 298,15 K (chembox da Wikipédia en, CC BY-SA 4.0; DATA_CONTRACT §3.1): valor sem estimativa, fase do estado padrão. */
export const MEDIDAS_TERMO = ['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol', 'entropiaPadraoJmolK'];
/** As de energia (kJ/mol), em que "mais negativo" tem sentido na comparação. */
export const TERMO_ENERGIA = ['entalpiaFormacaoKJmol', 'energiaGibbsFormacaoKJmol'];
/** Símbolo da grandeza ("ΔGf°"), para os avisos de falta; o id se a propriedade não tem símbolo. */
export const simboloDaPropriedade = (prop) => prop?.grandeza ?? PROPRIEDADES_PADRAO.find((x) => x.id === prop?.id)?.grandeza ?? prop?.id ?? '';

/** Escopos da propriedade ('elemento' | 'composto'): `escopos` → `[alvo]`. */
export const escoposDe = (prop) => (Array.isArray(prop?.escopos) && prop.escopos.length ? prop.escopos : prop?.alvo ? [prop.alvo] : []);
/** A propriedade existe neste escopo? */
export const temEscopo = (prop, alvo) => escoposDe(prop).includes(alvo);
/** Escopo de um registro do pacote: composto tem `cid` e não tem `simbolo`. */
export const escopoDoRegistro = (r) => (r && r.cid != null && r.simbolo == null ? 'composto' : 'elemento');

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
  const mapa = new Map(PROPRIEDADES_PADRAO.map((p) => [p.id, { ...p, escopos: escoposDe(p), rotuloPt: p.rotulo, rotulo: rotuloPropriedade(p, idioma), sinonimos: [...(lex.propriedades[p.id] ?? [])] }]));
  const somar = (base, sin) => { base.sinonimos = [...new Set([...(base.sinonimos ?? []), ...(Array.isArray(sin) ? sin : [])])]; };
  const sinonimosDoPacote = (p) => [...(idioma === 'pt-BR' && Array.isArray(p.sinonimos) ? p.sinonimos : []), ...(Array.isArray(p.sinonimosPorIdioma?.[idioma]) ? p.sinonimosPorIdioma[idioma] : [])];
  for (const p of lista) {
    if (!p?.id) continue;
    const alvo = p.alvo ?? p.escopo ?? (Array.isArray(p.escopos) ? p.escopos[0] : undefined);
    let base = mapa.get(p.id);
    if (!base && p.origem) {
      const caminho = String(p.origem).split('.').slice(1); // ['pontoFusaoK'] | ['descoberta', 'ano'] | ['propriedades', 'xlogp']
      const campo = caminho[0] === 'propriedades' ? caminho[1] : caminho[0];
      base = [...mapa.values()].find((x) => (!alvo || temEscopo(x, alvo)) && (x.campo === campo || (caminho[0] === 'propriedades' && x.id === campo)));
    }
    if (base) {
      somar(base, sinonimosDoPacote(p));
      // escopos novos do pacote (`escopos`, ou o prefixo de `origens`: "compostos.propriedades.pontoFusaoK" → composto); o pacote só acrescenta
      const PREFIXO = { elementos: 'elemento', compostos: 'composto' };
      const doPacote = [...(Array.isArray(p.escopos) ? p.escopos : []), ...(Array.isArray(p.origens) ? p.origens : []).map((o) => PREFIXO[String(o).split('.')[0]])]
        .filter((x) => x === 'elemento' || x === 'composto');
      base.escopos = [...new Set([...escoposDe(base), ...doPacote])];
      if (typeof p.rotulos?.[idioma] === 'string' && p.rotulos[idioma]) base.rotulo = p.rotulos[idioma];
      continue;
    }
    if (p.campo) {
      const nova = { alvo: alvo ?? 'elemento', tipo: 'texto', ...p, sinonimos: sinonimosDoPacote(p) };
      nova.escopos = escoposDe(nova);
      nova.rotulo = p.rotulos?.[idioma] ?? (idioma === 'pt-BR' ? p.rotulo ?? p.nome : null) ?? p.rotulo ?? p.nome ?? p.id;
      mapa.set(p.id, nova);
    }
  }
  return [...mapa.values()];
}

/**
 * Valor da propriedade no registro, com o campo de onde veio: `{valor, campo}` ou null. Composto: os calculados e as medidas ficam em
 * `registro.propriedades` (DATA_CONTRACT §3 e §3.1); elemento: no próprio registro. Solubilidade e pKa têm dois campos possíveis (`campos`).
 */
export function lerValor(prop, registro) {
  if (!registro || !prop) return null;
  const composto = escopoDoRegistro(registro) === 'composto';
  if (composto && !temEscopo(prop, 'composto')) return null;
  if (composto && (CAMPOS_EM_PROPRIEDADES.has(prop.id) || prop.medida)) {
    for (const campo of prop.campos ?? [prop.campo]) {
      const v = registro.propriedades?.[campo];
      if (v !== undefined && v !== null && !(Array.isArray(v) && !v.length)) return { valor: v, campo };
    }
    return null;
  }
  const v = !composto && CAMPOS_EM_PROPRIEDADES.has(prop.id) && registro.propriedades ? registro.propriedades[prop.id] : registro[prop.campo];
  return v === undefined || v === null ? null : { valor: v, campo: prop.campo };
}

/** Valor bruto da propriedade no registro (elemento ou composto); undefined se ausente. */
export function valorBruto(prop, registro) {
  if (!registro) return undefined;
  return lerValor(prop, registro)?.valor;
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
 * `campo` (de `lerValor`) escolhe a unidade quando a propriedade tem mais de um campo (solubilidade em g/100 g de água ou em g/L).
 * @returns {{texto: string, curto: string, numeros: number[]}|null}
 */
export function formatarValor(prop, valor, ctx, campo = null) {
  if (valor === undefined || valor === null || valor === '') return null;
  switch (prop.tipo) {
    case 'solubilidade': {
      if (typeof valor !== 'number') return null;
      const porLitro = (campo ?? prop.campo) === 'solubilidadeAguaGL';
      const tx = `${fmt(valor, { sig: 6 })} ${porLitro ? t('propriedades.medidas.unidadeGL') : t('propriedades.medidas.unidadeG100g')}`;
      return { texto: tx, curto: `${fmt(valor, { sig: 6 })} ${porLitro ? 'g/L' : 'g/100 g'}`, numeros: [valor] };
    }
    case 'pka': {
      const l = (Array.isArray(valor) ? valor : [valor]).filter((x) => typeof x === 'number' && Number.isFinite(x));
      if (!l.length) return null;
      const tx = l.length > 1 ? t('propriedades.medidas.pkaVarios', { lista: listar(l.map((x) => fmt(x, { sig: 4 }))) }) : fmt(l[0], { sig: 4 });
      return { texto: tx, curto: l.map((x) => fmt(x, { sig: 4 })).join('; '), numeros: l };
    }
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
      // `casasMax`: no máximo N casas decimais, sem zeros à direita inventados (a termoquímica vem com até 2 casas: −74,6 e −285,83)
      const v = typeof valor === 'number' && Number.isInteger(prop.casasMax) ? Math.round(valor * 10 ** prop.casasMax) / 10 ** prop.casasMax : valor;
      const tx = `${fmt(v, { sig: 7 })}${prop.unidade ? ` ${prop.unidade}` : ''}`;
      return { texto: tx, curto: tx, numeros: [valor] };
    }
    case 'inteiro': return { texto: String(valor), curto: String(valor), numeros: [valor] };
    // prótons, nêutrons e elétrons não são um valor do registro: a resposta própria os calcula (answers.js `blocosParticulas`)
    case 'particulas': return null;
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

// ------------------------------------------------------------------------------------------------ origem por valor (DATA_CONTRACT §3.1)

/** Condições da medida ("a 298,15 K (25 °C)", "a 101.325 Pa (1 atm)", "fase: líquido"), no idioma ativo; [] se não houver. */
export function condicoesDaMedida(f, ctx) {
  const c = f?.condicoes;
  if (!c || typeof c !== 'object') return [];
  const out = [];
  if (typeof c.temperaturaK === 'number') {
    const cel = emCelsius(c.temperaturaK, ctx);
    out.push(t('propriedades.medidas.aTemperatura', { k: fmt(c.temperaturaK, { sig: 6 }), c: cel == null ? '' : fmt(cel, { sig: 5 }) }));
  }
  if (typeof c.pressaoPa === 'number') {
    let atm = null;
    try { atm = deBase(ctx.unidades, 'atm', 'pressao', c.pressaoPa); } catch { atm = null; }
    out.push(t('propriedades.medidas.aPressao', { pa: fmt(c.pressaoPa, { sig: 7 }), atm: atm == null ? '' : fmt(atm, { sig: 4 }) }));
  }
  if (c.fase) out.push(t('propriedades.medidas.fase', { fase: estadoRotulo(c.fase) }));
  return out;
}

/**
 * Fonte de UM valor (`fontesPorPropriedade[campo]`) no formato das fontes da interface: `{nome, url, licenca, detalhe, condicoes, semReferencia, revisar}`.
 * `detalhe` junta referência citada, "sem referência no Wikidata", método de derivação e aviso de revisão, já no idioma ativo.
 * O nome do pacote vale como está (nome próprio: "Wikidata", "PubChem…"); o do valor derivado pelo app vem do catálogo.
 */
export function fonteDoValor(f, ctx) {
  if (!f || typeof f !== 'object') return null;
  const derivado = !f.url && !!f.metodo;
  const detalhes = [];
  const condicoes = condicoesDaMedida(f, ctx);
  if (typeof f.referencia === 'string' && f.referencia) detalhes.push(t('propriedades.medidas.referencia', { x: f.referencia }));
  if (typeof f.campoOriginal === 'string' && f.campoOriginal && /wikipedia/i.test(String(f.nome ?? ''))) detalhes.push(t('propriedades.medidas.campoChembox', { campo: f.campoOriginal }));
  if (f.semReferencia) detalhes.push(Number.isInteger(f.corroboradoPor) && f.corroboradoPor > 1 ? t('propriedades.medidas.semReferenciaCorroborado', { n: f.corroboradoPor }) : t('propriedades.medidas.semReferencia'));
  if (derivado) detalhes.push(t('propriedades.medidas.derivado'));
  if (f.revisar || f.aviso) detalhes.push(t('propriedades.medidas.revisar'));
  return {
    nome: derivado ? t('propriedades.medidas.derivadoNome') : String(f.nome ?? t('propriedades.medidas.fontePacote')),
    url: typeof f.url === 'string' && /^https:\/\//.test(f.url) ? f.url : undefined,
    licenca: f.licenca,
    detalhe: detalhes.join('; ') || undefined,
    condicoes, semReferencia: !!f.semReferencia, revisar: !!(f.revisar || f.aviso)
  };
}

/** Fontes de um valor do registro: lista (pkaValores traz uma por valor, alinhada), sem repetir a mesma declaração. */
export function fontesDoCampo(registro, campo, ctx) {
  const bruto = registro?.fontesPorPropriedade?.[campo] ?? (campo === 'pkaValores' ? registro?.fontesPorPropriedade?.pka : null);
  const lista = (Array.isArray(bruto) ? bruto : [bruto]).map((f) => fonteDoValor(f, ctx)).filter(Boolean);
  const vistos = new Set();
  return lista.filter((f) => { const k = `${f.nome}|${f.url ?? ''}|${f.detalhe ?? ''}|${f.condicoes.join()}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

/**
 * Uma medida do composto: `{prop, campo, valor, f, fontes, condicoes}` ou null (sem valor no pacote). `condicoes` = as das fontes, sem repetir; na
 * termoquímica padrão, também "estado padrão a 298,15 K" e, quando a fonte não marca a fase, a do `estadoPadrao` do composto (o pipeline só
 * aceita valor da fase do estado padrão, DATA_CONTRACT §3.1).
 */
export function medidaDoComposto(prop, c, ctx) {
  const lido = prop ? lerValor(prop, c) : null;
  if (!lido) return null;
  const f = formatarValor(prop, lido.valor, ctx, lido.campo);
  if (!f) return null;
  const fontes = fontesDoCampo(c, lido.campo, ctx);
  const condicoes = [...new Set(fontes.flatMap((x) => x.condicoes))];
  if (MEDIDAS_TERMO.includes(prop.id)) {
    condicoes.unshift(t('propriedades.medidas.padrao298'));
    const temFase = typeof c.fontesPorPropriedade?.[lido.campo]?.condicoes?.fase === 'string';
    const est = c.propriedades?.estadoPadrao;
    if (!temFase && est && estadoChave(est) !== 'desconhecido') condicoes.push(t('propriedades.medidas.faseEstadoPadrao', { fase: estadoRotulo(est) }));
  }
  return { prop, campo: lido.campo, valor: lido.valor, f, fontes, condicoes };
}

/**
 * Propriedades físicas medidas de um composto, na ordem de MEDIDAS_COMPOSTO: `[{prop, campo, valor, f, fontes, condicoes}]` (só as que existem no
 * registro). `props` = tabela efetiva (`tabelaDePropriedades`), para os rótulos do idioma e os escopos do pacote.
 */
export function medidasDoComposto(c, props, ctx) {
  const porId = new Map((props ?? []).map((p) => [p.id, p]));
  const out = [];
  for (const id of MEDIDAS_COMPOSTO) {
    const m = medidaDoComposto(porId.get(id), c, ctx);
    if (m) out.push(m);
  }
  return out;
}

/** Aviso de revisão de um valor do elemento (`fontesPorPropriedade[campo].aviso`/`revisar`), no idioma ativo; null se não houver. */
export const avisoDoValor = (registro, campo) => {
  const f = registro?.fontesPorPropriedade?.[campo];
  return f && (f.revisar || f.aviso) ? t('propriedades.medidas.avisoRevisar') : null;
};

/** Nota da escala da eletronegatividade (Pauling, valores revisados de Allred), quando o pacote a declara; null se não houver. */
export function notaEletronegatividade(regras, elemento = null) {
  const f = elemento?.fontesPorPropriedade?.eletronegatividade;
  const r = regras?.propriedades && !Array.isArray(regras.propriedades) ? regras.propriedades.eletronegatividade : null;
  const escala = f?.escala ?? r?.escala ?? null;
  return escala && /pauling/i.test(String(escala)) ? t('propriedades.medidas.notaPauling') : null;
}
