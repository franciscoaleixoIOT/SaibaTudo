// Respostas montadas SÓ dos dados do pacote assinado e de cálculos locais testados. Cada bloco traz a fonte; nada vem do modelo (origem 'LOCAL').
// Todo texto passa pelo catálogo do idioma ativo (`t()`, docs/I18N.md §3); a tradução nunca introduz números: cada número vem do pacote ou do cálculo.
// Formato de uma resposta: { intent, resolvida, origem, titulo, blocos[], directAnswer, fontes[], acoes[], sugestoes[], ... } (ver `montar`).
import { balancear } from './calc/balancear.js';
import { calcularConcentracao } from './calc/concentracao.js';
import { calcularEstequiometria, converterQuantidade, molDeParticulas, notasCntp } from './calc/estequiometria.js';
import { calcularBoyle, calcularGas } from './calc/gas.js';
import { calcularMassaMolar } from './calc/massa.js';
import { calcularPH } from './calc/ph.js';
import { acharUnidade, converter, paraBase } from './calc/unidades.js';
import { chaveFormula, formulaTex, formulaUnicode, massaMolar as somaMassaMolar, parseFormula, tentarFormula } from './calc/formula.js';
import { distribuicaoEletronica, textoSubniveis } from './calc/eletronica.js';
import { calcularNox, dadosElementosDoContexto } from './calc/nox.js';
import { ligacoesDe } from './calc/ligacao.js';
import { calcularKc, estadoNaTemperatura, expressaoEquilibrio, kpDeKc, lerEquacaoComEstados, rLitroAtm, temperaturaEmK } from './calc/equilibrio.js';
import { calorDaAmostra, combinarHess, ehSubstanciaSimplesPadrao, equacaoDeCombustao, especiesDaEquacao, somaPorFormacao } from './calc/entalpia.js';
import { respostaRecusa } from './seguranca.js';
import { fmt, fmtTex } from './formato.js';
import { fmtData, idiomaAtual, nomeDoIdioma, t, tl } from './i18n/index.js';
import { ligarQuantidades, termosDeBusca } from './nlu.js';
import { exibirNome, minusNoMeio, nomeComposto as infoNomeComposto, nomeElemento as infoNomeElemento } from './nomes.js';
import { fonteGhs, descreverGhs, urlSegura } from './perigos.js';
import { avisoDoValor, categoriaPlural, categoriaRotulo, classeRotulo, escoposDe, estadoChave, estadoRotulo, fontesDoCampo, formatarValor, lerValor, medidasDoComposto, notaEletronegatividade, temEscopo, valorBruto } from './propriedades.js';
import { capitalizar, listar, normalizar } from './texto.js';

/** Fonte "este aplicativo" no idioma ativo (função: o idioma pode mudar em tempo de execução). */
export const fonteApp = () => ({ nome: t('respostas.fontes.app'), licenca: 'MIT' });
/** Compatibilidade (pt-BR). */
export const FONTE_APP = { nome: 'SaibaTudo Química (este aplicativo)', licenca: 'MIT' };
const fonteCalculo = () => ({ nome: t('respostas.fontes.calculo') });

/** Sugestões padrão no idioma ativo. `SUGESTOES_PADRAO` (pt-BR) fica por compatibilidade. */
export const sugestoesPadrao = () => tl('respostas.sugestoes.padrao');
export const SUGESTOES_PADRAO = tl('respostas.sugestoes.padrao', 'pt-BR');
export const orientacaoGeral = () => tl('respostas.orientacaoGeral');
export const ORIENTACAO_GERAL = tl('respostas.orientacaoGeral', 'pt-BR');
const sug = (chave, params) => t(`respostas.sugestoes.${chave}`, params);

const REGRAS_ACIDOS_BASES_PADRAO = [
  { formula: 'HCl', tipo: 'acido', n: 1 }, { formula: 'HBr', tipo: 'acido', n: 1 }, { formula: 'HI', tipo: 'acido', n: 1 }, { formula: 'HNO3', tipo: 'acido', n: 1 },
  { formula: 'HClO4', tipo: 'acido', n: 1 }, { formula: 'H2SO4', tipo: 'acido', nota: 'forte na 1ª ionização' }, { formula: 'NaOH', tipo: 'base', n: 1 }, { formula: 'KOH', tipo: 'base', n: 1 },
  { formula: 'LiOH', tipo: 'base', n: 1 }, { formula: 'Ca(OH)2', tipo: 'base', n: 2 }, { formula: 'Ba(OH)2', tipo: 'base', n: 2 }, { formula: 'Sr(OH)2', tipo: 'base', n: 2 }
];

const minus = (s) => minusNoMeio(s);
const fonteDe = (f) => (typeof f === 'string' ? { nome: f } : f && typeof f === 'object' ? { nome: f.nome ?? t('respostas.fontes.pacote'), url: f.url, licenca: f.licenca, ...(f.detalhe ? { detalhe: f.detalhe } : {}) } : fonteApp());
const dado = (...fontes) => fontes.filter(Boolean).map(fonteDe);
const origemUnidades = (tabela) => t(`respostas.unidades.origem.${tabela?.origemChave ?? 'padrao'}`);

function textoDoBloco(b) {
  switch (b.tipo) {
    case 'texto': case 'aviso': return b.texto;
    case 'formula': return formulaUnicode(b.formula);
    case 'lista': return [b.titulo, ...b.itens.map((i) => `• ${i}`)].filter(Boolean).join('\n');
    case 'kv': return [b.titulo, ...b.itens.map((i) => `${i.rotulo}: ${i.valor}`)].filter(Boolean).join('\n');
    case 'resultado': return [b.titulo, ...b.itens.map((i) => `${i.rotulo}: ${i.valor}${i.unidade ? ' ' + i.unidade : ''}${i.extra ? ` (${i.extra})` : ''}`)].filter(Boolean).join('\n');
    case 'passos': return [b.titulo, ...b.passos.map((p, i) => `${i + 1}. ${p.texto}`)].filter(Boolean).join('\n');
    case 'tabela': return [b.legenda, b.cabecalho.join(' | '), ...b.linhas.map((l) => l.join(' | '))].filter(Boolean).join('\n');
    case 'ghs': return [b.titulo, b.palavraSinal ? t('respostas.blocos.palavraSinal', { x: b.palavraSinal }) : null, ...b.pictogramas.map((p) => `${p.codigo}: ${p.nome}`), ...b.frases.map((f) => `${f.codigo}: ${f.texto ?? ''}`)].filter(Boolean).join('\n');
    case 'molecula': return t('respostas.blocos.estrutura2d', { nome: b.nome });
    case 'equacao': return b.texto;
    case 'citacao': return `${b.texto}\n(${b.aviso ? b.aviso + ' ' : ''}${b.fonte?.nome ?? ''}${b.fonte?.licenca ? ', ' + b.fonte.licenca : ''})`;
    default: return '';
  }
}

/** Monta a resposta final: texto plano, fontes agregadas (únicas), ações e sugestões. */
function montar({ intent, titulo, blocos, acoes = [], sugestoes = [], resolvida = true, extra = {} }) {
  const todos = blocos.map((b) => ({ ...b, fonte: b.fonte ?? fonteApp() }));
  const vistas = new Set();
  const fontes = [];
  for (const b of todos) {
    for (const f of Array.isArray(b.fonte) ? b.fonte : [b.fonte]) {
      const k = `${f.nome}|${f.url ?? ''}`;
      if (!vistas.has(k)) { vistas.add(k); fontes.push(f); }
    }
  }
  const directAnswer = [titulo, ...todos.map(textoDoBloco)].filter(Boolean).join('\n');
  return { intent, resolvida, origem: 'LOCAL', idioma: idiomaAtual(), titulo, blocos: todos, directAnswer, fontes, acoes, sugestoes: [...new Set(sugestoes)].slice(0, 6), ...extra };
}

const B = {
  texto: (texto, fonte = fonteApp()) => ({ tipo: 'texto', texto, fonte }),
  aviso: (texto, fonte = fonteApp()) => ({ tipo: 'aviso', texto, fonte }),
  lista: (titulo, itens, fonte = fonteApp()) => ({ tipo: 'lista', titulo, itens, fonte }),
  kv: (titulo, itens, fonte) => ({ tipo: 'kv', titulo, itens, fonte }),
  resultado: (titulo, itens, fonte = fonteCalculo()) => ({ tipo: 'resultado', titulo, itens, fonte }),
  passos: (titulo, passos, fonte = fonteCalculo()) => ({ tipo: 'passos', titulo, passos, fonte }),
  formula: (formula, fonte) => ({ tipo: 'formula', formula, fonte }),
  tabela: (legenda, cabecalho, linhas, fonte) => ({ tipo: 'tabela', legenda, cabecalho, linhas, fonte }),
  molecula: (smiles, nome, fonte) => ({ tipo: 'molecula', smiles, nome, fonte }),
  equacao: (tex, texto, fonte = fonteCalculo()) => ({ tipo: 'equacao', tex, texto, fonte })
};

const rota = (r, rotulo) => ({ rotulo, rota: r });

export class AnswerBuilder {
  /** @param {{store: import('./data.js').DataStore, dic: import('./dicionario.js').Dicionario}} o */
  constructor({ store, dic }) {
    this.store = store;
    this.dic = dic;
    this.ctx = store.ctx;
    this.idioma = dic?.idioma ?? idiomaAtual();
  }

  async construir(p) {
    try {
      switch (p.intent) {
        case 'RECUSA_PERIGO': return this.recusa(p);
        case 'AJUDA': return this.ajuda();
        case 'SOBRE_DADOS': return this.sobreDados();
        case 'FONTES': return this.fontes();
        case 'ELEMENTO': return this.elemento(p);
        case 'COMPOSTO': return await this.composto(p);
        case 'PROPRIEDADE': return await this.propriedade(p);
        case 'MASSA_MOLAR': return await this.massaMolar(p);
        case 'BALANCEAR': return this.balancear(p);
        case 'ESTEQUIOMETRIA': return await this.estequiometria(p);
        case 'CONCENTRACAO': return await this.concentracao(p);
        case 'PH': return await this.ph(p);
        case 'GAS_IDEAL': return await this.gas(p);
        case 'CONVERSAO_UNIDADE': return this.conversao(p);
        case 'NOMENCLATURA': return await this.nomenclatura(p);
        case 'DESENHAR': return await this.desenhar(p);
        case 'COMPARAR': return await this.comparar(p);
        case 'TABELA_PERIODICA': return this.tabela(p);
        case 'SEGURANCA': return await this.seguranca(p);
        case 'CONCEITO': return await this.conceito(p);
        case 'NOX': return await this.nox(p);
        case 'ENTALPIA': return await this.entalpia(p);
        case 'EQUILIBRIO': return await this.equilibrio(p);
        case 'LIGACAO': return await this.ligacao(p);
        default: return this.naoEntendi(p);
      }
    } catch (e) {
      return montar({
        intent: p.intent, resolvida: false, titulo: t('respostas.erro.titulo'),
        blocos: [B.aviso(t('respostas.erro.texto', { msg: e instanceof Error ? e.message : String(e) }))],
        sugestoes: sugestoesPadrao().slice(0, 4)
      });
    }
  }

  // ------------------------------------------------------------------------------------------------ utilidades
  /** Nome do composto no idioma, rotulado quando é reserva (inglês/português). */
  nomeComposto(c) { return exibirNome(infoNomeComposto(c, this.idioma)) || String(c?.cid ?? ''); }
  /** Nome do elemento no idioma, rotulado quando é reserva. */
  nomeElemento(e) { return exibirNome(infoNomeElemento(e, this.idioma)); }
  /** Nome do elemento com inicial maiúscula (títulos) — a reserva mantém o rótulo. */
  nomeElementoTitulo(e) { const i = infoNomeElemento(e, this.idioma); return exibirNome({ ...i, nome: capitalizar(i.nome) }); }
  rotaComposto(cid) { return `/quimica/composto/${cid}`; }
  rotaElemento(s) { return `/quimica/elemento/${encodeURIComponent(s)}`; }
  entradaComposto(cid) { return this.store.indice.porCid.get(Number(cid)) ?? null; }
  fontePubchem(cid) { return { nome: t('respostas.fontes.pubchemCid', { cid }) }; }

  /** Compostos citados (registro completo, quando o lote existe) e elementos. */
  async entidades(p) {
    const compostos = [];
    for (const cid of p.compostos ?? []) { const c = await this.store.composto(cid); if (c) compostos.push(c); }
    const elementos = (p.elementos ?? []).map((s) => this.store.porSimbolo.get(s)).filter(Boolean);
    return { compostos, elementos };
  }

  /** Fonte das frases H: a do pacote (CLP/EUR-Lex em ghs_frases.json) ou, sem ela, o texto padrão do aplicativo. */
  fonteFrases() { return this.store.fonteFrasesH ? fonteDe(this.store.fonteFrasesH) : { nome: t('respostas.fontes.frasesPadrao') }; }

  fonteRegras() { return fonteDe(this.store.regras?.fontes?.[0] ?? { nome: t('respostas.fontes.regras') }); }

  // ------------------------------------------------------------------------------------------------ meta
  recusa(p) {
    const r = respostaRecusa(p.seguranca);
    const fonte = { nome: t('respostas.fontes.politica') };
    return montar({
      intent: 'RECUSA_PERIGO', titulo: p.seguranca?.categoria === 'AUTOLESAO' ? t('respostas.recusa.tituloAutolesao') : t('respostas.recusa.titulo'),
      blocos: r.linhas.map((l) => B.aviso(l, fonte)), resolvida: true,
      sugestoes: p.seguranca?.categoria === 'AUTOLESAO' ? [] : [sug('perigosSulfurico'), sug('misturar'), sug('massaAgua')],
      extra: { categoriaRecusa: p.seguranca?.categoria ?? null }
    });
  }

  ajuda() {
    return montar({
      intent: 'AJUDA', titulo: t('respostas.ajuda.titulo'),
      blocos: [
        B.texto(t('respostas.ajuda.texto')),
        B.lista(t('respostas.ajuda.podePerguntar'), tl('respostas.ajuda.itens')),
        B.aviso(t('respostas.ajuda.aviso'))
      ],
      acoes: [rota('/quimica/tabela', t('respostas.ajuda.tabela')), rota('/quimica/calculadoras', t('respostas.ajuda.calculadoras'))],
      sugestoes: sugestoesPadrao().slice(0, 6)
    });
  }

  sobreDados() {
    const m = this.store.manifest;
    const fontesQtd = Array.isArray(this.store.fontes) ? this.store.fontes.length : (this.store.fontes?.fontes?.length ?? 0);
    const sig = t(`respostas.sobreDados.sig.${this.store.sig.estado}`);
    return montar({
      intent: 'SOBRE_DADOS', titulo: t('respostas.sobreDados.titulo'),
      blocos: [
        B.kv(null, [
          { rotulo: t('respostas.sobreDados.versao'), valor: String(this.store.versao) },
          { rotulo: t('respostas.sobreDados.geradoEm'), valor: String(m?.generatedAt ?? '—') },
          { rotulo: t('respostas.sobreDados.assinatura'), valor: sig },
          { rotulo: t('respostas.sobreDados.elementos'), valor: String(this.store.elementos.length) },
          { rotulo: t('respostas.sobreDados.compostos'), valor: String(this.store.indice.entradas.length) },
          ...(fontesQtd ? [{ rotulo: t('respostas.sobreDados.fontesListadas'), valor: String(fontesQtd) }] : [])
        ], fonteApp()),
        B.texto(t('respostas.sobreDados.texto'))
      ],
      acoes: [rota('/quimica/sobre-os-dados', t('respostas.sobreDados.acao'))],
      sugestoes: [sug('fontes'), sug('massaAgua')]
    });
  }

  fontes() {
    const lista = Array.isArray(this.store.fontes) ? this.store.fontes : this.store.fontes?.fontes ?? [];
    const itens = lista.filter((f) => f?.nome).map((f) => `${f.nome}${f.licenca ? ` — ${f.licenca}` : ''}`);
    return montar({
      intent: 'FONTES', titulo: t('respostas.fontesResp.titulo'),
      blocos: [itens.length ? B.lista(t('respostas.fontesResp.usa'), itens, fonteApp()) : B.texto(t('respostas.fontesResp.semLista'))],
      acoes: [rota('/quimica/sobre-os-dados', t('respostas.fontesResp.acao'))],
      sugestoes: [sug('origemDados')]
    });
  }

  naoEntendi(p) {
    const s = sugestoesPadrao();
    return montar({
      intent: 'DESCONHECIDA', resolvida: false, titulo: t('respostas.naoEntendi.titulo'),
      blocos: [
        B.texto(p.textoOriginal ? t('respostas.naoEntendi.comPergunta', { q: p.textoOriginal }) : t('respostas.naoEntendi.semPergunta')),
        B.lista(null, s.slice(0, 5))
      ],
      acoes: [rota('/quimica/tabela', t('respostas.naoEntendi.tabela')), rota('/quimica/compostos', t('respostas.naoEntendi.compostos')), rota('/quimica/calculadoras', t('respostas.naoEntendi.calculadoras'))],
      sugestoes: s.slice(0, 6)
    });
  }

  // ------------------------------------------------------------------------------------------------ elementos e compostos
  itensDoElemento(e) {
    const itens = [];
    for (const prop of this.dic.props.filter((x) => x.alvo === 'elemento' && x.id !== 'simbolo')) {
      const f = formatarValor(prop, valorBruto(prop, e), this.ctx);
      if (f) itens.push({ rotulo: capitalizar(prop.rotulo), valor: f.texto });
    }
    return itens;
  }

  elemento(p) {
    const e = this.store.porSimbolo.get(p.elemento);
    if (!e) return this.naoEntendi(p);
    const fonte = dado(e.fontes?.[0])[0] ?? fonteApp();
    const nome = this.nomeElementoTitulo(e);
    const nomeMeio = minus(infoNomeElemento(e, this.idioma).nome);
    const itens = [...(this.idioma === 'en' ? [] : [{ rotulo: t('respostas.elemento.nomeEmIngles'), valor: e.nomes?.en ?? e.nomeEn ?? '—' }]), ...this.itensDoElemento(e)].filter((i) => i.valor !== '—');
    const s = [sug('fusaoDe', { nome: nomeMeio }), sug('configuracaoDe', { nome: nomeMeio })].filter((_, i) => (i === 0 ? e.pontoFusaoK != null : !!e.configuracaoEletronica));
    if (e.massaAtomica != null) s.push(sug('massaMolarDe', { nome: nomeMeio }));
    return montar({
      intent: 'ELEMENTO', titulo: t('respostas.elemento.titulo', { nome, simbolo: e.simbolo, z: e.z }),
      blocos: [B.kv(null, itens, fonte)],
      acoes: [rota(this.rotaElemento(e.simbolo), t('respostas.elemento.ficha', { nome })), rota('/quimica/tabela', t('respostas.elemento.verTabela'))],
      sugestoes: s
    });
  }

  async composto(p) {
    const { compostos } = await this.entidades(p);
    const c = compostos[0];
    if (!c) return p.formulas?.length ? this.massaMolarDeFormula(p.formulas[0], p) : this.naoEntendi(p);
    return this.fichaResumida(c, p);
  }

  fichaResumida(c, p) {
    const fonte = dado(c.fontes?.[0])[0] ?? this.fontePubchem(c.cid);
    const nome = this.nomeComposto(c);
    const itens = [];
    if (this.idioma === 'pt-BR' && c.nomePopular && c.nomePopular !== c.nome) itens.push({ rotulo: t('respostas.composto.nomePopular'), valor: c.nomePopular });
    if (c.nomeIupac) itens.push({ rotulo: t('respostas.composto.nomeIupac'), valor: c.nomeIupac });
    if (c.formula) itens.push({ rotulo: t('respostas.composto.formula'), valor: formulaUnicode(c.formula) });
    if (c.massaMolar != null) itens.push({ rotulo: t('respostas.composto.massaMolar'), valor: formatarValor({ tipo: 'massaMolar' }, c.massaMolar, this.ctx).texto });
    if (c.cas) itens.push({ rotulo: t('respostas.composto.cas'), valor: c.cas });
    itens.push({ rotulo: t('respostas.composto.cid'), valor: String(c.cid) });
    for (const prop of this.dic.props.filter((x) => x.alvo === 'composto' && ['xlogp', 'doadoresH', 'aceptoresH', 'ligacoesRotaveis', 'carga', 'tpsa'].includes(x.id))) {
      const f = formatarValor(prop, valorBruto(prop, c), this.ctx);
      if (f) itens.push({ rotulo: capitalizar(prop.rotulo), valor: f.texto });
    }
    if (c.classes?.length) itens.push({ rotulo: t('respostas.composto.classes'), valor: listar(c.classes.map(classeRotulo)) });
    const blocos = [B.kv(null, itens, fonte)];
    const medidas = medidasDoComposto(c, this.dic.props, this.ctx);
    if (medidas.length) {
      const fontesMedidas = medidas.flatMap((m) => m.fontes);
      blocos.push(B.kv(t('propriedades.medidas.titulo'), medidas.map((m) => this.itemMedida(m)), fontesMedidas.length ? fontesMedidas : fonte));
    }
    if (c.smiles) blocos.push(B.molecula(c.smiles, nome, fonte));
    const g = descreverGhs(c.ghs, this.store.regras);
    if (g) blocos.push({ tipo: 'ghs', titulo: t('respostas.composto.perigosGhs'), ...g, fonte: dado(fonteGhs(c) ?? fonte, this.fonteFrases()) });
    const defin = this.definicaoChebi(c);
    if (defin) blocos.push({ tipo: 'citacao', texto: defin.texto, aviso: this.idioma === 'en' ? null : t('respostas.composto.definicaoIngles'), fonte: defin.fonte });
    const s = [sug('massaMolarDe', { nome: minus(nome) })];
    if (c.ghs) s.push(sug('perigosDe', { nome: minus(nome) }));
    return montar({
      intent: 'COMPOSTO', titulo: `${nome}${c.formula ? ` (${formulaUnicode(c.formula)})` : ''}`,
      blocos,
      acoes: [rota(this.rotaComposto(c.cid), t('respostas.composto.ficha')), ...this.acoesIcsc(c)],
      sugestoes: s,
      extra: { compostoCid: c.cid }
    });
  }

  /** Definição do ChEBI (`definicaoChebi`: texto ou objeto), com a atribuição exigida (CC BY 4.0). */
  definicaoChebi(c) {
    const d = c.definicaoChebi;
    if (!d) return null;
    const texto = typeof d === 'string' ? d : d.texto ?? d.definicao ?? null;
    if (!texto) return null;
    const id = typeof d === 'object' ? d.chebiId ?? d.chebi ?? d.id ?? null : null;
    const url = urlSegura(typeof d === 'object' ? d.url : null) ?? (id && /^(?:CHEBI:)?\d+$/i.test(String(id)) ? `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${/^\d+$/.test(String(id)) ? `CHEBI:${id}` : id}` : 'https://www.ebi.ac.uk/chebi/');
    return { texto, id, fonte: { nome: id ? t('respostas.fontes.chebi', { id }) : t('respostas.fontes.chebiSem'), url, licenca: (typeof d === 'object' && d.licenca) || 'CC BY 4.0' } };
  }

  acoesIcsc(c, comNome = false) {
    const url = urlSegura(c.icscBuscaUrl ?? this.entradaComposto(c.cid)?.icscBuscaUrl);
    return url ? [{ rotulo: comNome ? t('respostas.composto.icscDe', { nome: this.nomeComposto(c) }) : t('respostas.composto.icsc'), url, externo: true }] : [];
  }

  // ------------------------------------------------------------------------------------------------ propriedades
  /** Item {rotulo, valor} de uma medida do composto: valor com unidades, condições da medida e "sem referência" quando for o caso. */
  itemMedida(m, rotulo = null) {
    const extras = [...new Set(m.fontes.flatMap((f) => f.condicoes))];
    if (m.fontes.some((f) => f.semReferencia)) extras.push(t('propriedades.medidas.semReferencia'));
    const r = rotulo ?? capitalizar(m.prop.id === 'estadoPadrao' ? t('propriedades.medidas.estadoA25') : m.prop.rotulo);
    return { rotulo: r, valor: `${m.f.texto}${extras.length ? ` — ${extras.join('; ')}` : ''}` };
  }

  async propriedade(p) {
    const ids = p.propriedades?.length ? p.propriedades : p.propriedade ? [p.propriedade] : [];
    let { compostos, elementos } = await this.entidades(p);
    // "solubilidade do X em água": a água é o solvente, não o composto perguntado
    if (ids.includes('solubilidade') && compostos.length) {
      const semAgua = compostos.filter((c) => c.cid !== 962);
      if (semAgua.length || !elementos.length) compostos = semAgua;
    }
    if (!ids.length || (!compostos.length && !elementos.length)) {
      const soSolub = ids.length === 1 && ids[0] === 'solubilidade';
      return montar({
        intent: 'PROPRIEDADE', resolvida: false, titulo: t('respostas.propriedade.deQual'),
        blocos: [B.texto(soSolub ? t('respostas.propriedade.solubilidadeDeQual') : ids.length ? t('respostas.propriedade.digaQualElemento', { props: listar(ids.map((i) => this.dic.propPorId.get(i)?.rotulo ?? i)) }) : t('respostas.propriedade.digaQualPropriedade'))],
        sugestoes: [sug('fusaoFerro'), sug('massaMolarAgua')]
      });
    }
    const linhas = [];
    const ausentes = [];
    const fontes = [];
    const blocosMedidas = [];
    const avisos = [];
    const semMedida = new Map(); // cid → composto sem a medida pedida (para dizer o que o pacote traz dele)
    const nomeDe = (reg, alvo) => (alvo === 'composto' ? this.nomeComposto(reg) : this.nomeElemento(reg));
    for (const id of ids) {
      const prop = this.dic.propPorId.get(id);
      if (!prop) continue;
      const escopos = escoposDe(prop);
      let algum = false;
      for (const alvo of escopos) {
        const regs = alvo === 'composto' ? compostos : elementos;
        if (regs.length) algum = true;
        for (const reg of regs) {
          const nome = nomeDe(reg, alvo);
          const rotulo = t('respostas.propriedade.de', { prop: capitalizar(prop.id === 'estadoPadrao' && alvo === 'composto' ? t('propriedades.medidas.estadoA25') : prop.rotulo), nome });
          if (alvo === 'composto' && prop.medida) {
            // medida do composto (Wikidata): cada valor com a sua fonte e as condições da medida
            const lido = lerValor(prop, reg);
            const f = lido && formatarValor(prop, lido.valor, this.ctx, lido.campo);
            if (f) {
              const m = { prop, campo: lido.campo, valor: lido.valor, f, fontes: fontesDoCampo(reg, lido.campo, this.ctx) };
              blocosMedidas.push(B.kv(null, [this.itemMedida(m, rotulo)], m.fontes.length ? m.fontes : dado(reg.fontes?.[0])[0] ?? fonteApp()));
              linhas.push({ rotulo, valor: f.texto, medida: true });
              if (prop.id === 'pka') avisos.push(t('propriedades.medidas.notaPka'));
            } else { ausentes.push(t('respostas.propriedade.de', { prop: prop.rotulo, nome })); semMedida.set(reg.cid, reg); }
            continue;
          }
          let f = formatarValor(prop, valorBruto(prop, reg), this.ctx);
          if (f && prop.id === 'formula') f = { texto: formulaUnicode(String(valorBruto(prop, reg))) };
          if (f) {
            linhas.push({ rotulo, valor: f.texto });
            fontes.push(dado(reg.fontes?.[0])[0]);
            if (alvo === 'elemento') {
              const aviso = avisoDoValor(reg, prop.campo);
              if (aviso) avisos.push(`${this.nomeElementoTitulo(reg)}: ${aviso}`);
              if (prop.id === 'eletronegatividade') { const nota = notaEletronegatividade(this.store.regras, reg); if (nota) avisos.push(nota); }
            }
          } else ausentes.push(t('respostas.propriedade.de', { prop: prop.rotulo, nome }));
        }
      }
      // propriedade de elemento perguntada para um composto (ou o contrário)
      if (!algum) {
        const alvoProp = escopos[0] ?? prop.alvo;
        const outros = alvoProp === 'composto' ? elementos : compostos;
        if (outros.length) ausentes.push(t('respostas.propriedade.outroTipo', { prop: prop.rotulo, alvo: alvoProp, outros: outros.map((o) => nomeDe(o, alvoProp === 'composto' ? 'elemento' : 'composto')).join(', '), n: outros.length }));
      }
    }
    const blocos = [];
    const simples = linhas.filter((l) => !l.medida).map(({ rotulo, valor }) => ({ rotulo, valor }));
    if (simples.length) blocos.push(B.kv(null, simples, fontes.filter(Boolean).length ? fontes.filter(Boolean) : fonteApp()));
    blocos.push(...blocosMedidas);
    for (const a of [...new Set(avisos)]) blocos.push(B.aviso(a));
    if (ausentes.length) blocos.push(B.aviso(t('respostas.propriedade.naoTem', { lista: ausentes.join('; ') })));
    // o que o pacote traz dos compostos sem a medida pedida
    for (const c of semMedida.values()) {
      const tem = medidasDoComposto(c, this.dic.props, this.ctx).filter((m) => !ids.includes(m.prop.id));
      if (tem.length) blocos.push(B.texto(t('respostas.propriedade.oferece', { nome: this.nomeComposto(c), lista: listar(tem.map((m) => `${minus(m.prop.id === 'estadoPadrao' ? t('propriedades.medidas.estadoA25') : m.prop.rotulo)} (${m.f.curto})`)) }), dado(c.fontes?.[0])[0] ?? fonteApp()));
    }
    // configuração eletrônica (§2.2 de docs/CALCULADORAS_2026-10-17.md): além do valor do pacote, a distribuição calculada
    if (ids.includes('configuracaoEletronica')) for (const e of elementos.slice(0, 3)) blocos.push(...this.blocosEletronica(e));
    const primeiro = elementos[0] ?? compostos[0];
    const acoes = elementos[0] && ids.some((i) => temEscopo(this.dic.propPorId.get(i), 'elemento'))
      ? [rota(this.rotaElemento(elementos[0].simbolo), t('respostas.propriedade.fichaDe', { nome: this.nomeElemento(elementos[0]) }))]
      : compostos[0] ? [rota(this.rotaComposto(compostos[0].cid), t('respostas.propriedade.fichaDe', { nome: this.nomeComposto(compostos[0]) }))] : [];
    if (ids.includes('configuracaoEletronica') && elementos[0]?.configuracaoEletronica) acoes.push(rota(`/quimica/calculadoras/configuracao-eletronica?el=${encodeURIComponent(elementos[0].simbolo)}`, t('respostas.eletronica.abrir')));
    return montar({
      intent: 'PROPRIEDADE', titulo: linhas.length === 1 ? linhas[0].rotulo : t('respostas.propriedade.propriedadesDe', { nomes: listar([...elementos.map((e) => this.nomeElemento(e)), ...compostos.map((c) => this.nomeComposto(c))]) }),
      blocos, acoes,
      sugestoes: primeiro ? [elementos[0] ? sug('densidadeDe', { nome: minus(this.nomeElemento(elementos[0])) }) : sug('massaMolarDe', { nome: minus(this.nomeComposto(compostos[0])) })] : [],
      extra: { alvoPropriedade: elementos.length ? 'elemento' : 'composto' }
    });
  }

  // ------------------------------------------------------------------------------------------------ massa molar
  async massaMolar(p) {
    const { compostos, elementos } = await this.entidades(p);
    if (compostos[0]?.formula) return this.massaMolarDeFormula(compostos[0].formula, p, compostos[0]);
    if (p.formulas?.length) return this.massaMolarDeFormula(p.formulas[0], p);
    if (elementos[0]) {
      const e = elementos[0];
      const r = calcularMassaMolar(e.simbolo, this.ctx);
      if (r.ok) {
        const nome = this.nomeElementoTitulo(e);
        return montar({
          intent: 'MASSA_MOLAR', titulo: t('respostas.massaMolar.tituloElemento', { nome, simbolo: e.simbolo }),
          blocos: [
            B.resultado(null, r.resultados.slice(0, 1).map((x) => ({ ...x, rotulo: t('respostas.massaMolar.deAtomos', { nome: minus(this.nomeElemento(e)) }) })), dado(e.fontes?.[0])[0] ?? fonteCalculo()),
            B.aviso(t('respostas.massaMolar.avisoMolecular'))
          ],
          acoes: [rota(`/quimica/calculadoras/massa-molar?f=${encodeURIComponent(e.simbolo)}`, t('respostas.massaMolar.abrirCalculadora'))],
          sugestoes: [sug('massaMolarDe', { nome: minus(this.nomeElemento(e)) })]
        });
      }
    }
    return montar({
      intent: 'MASSA_MOLAR', resolvida: false, titulo: t('respostas.massaMolar.deQue'),
      blocos: [B.texto(t('respostas.massaMolar.digite'))],
      acoes: [rota('/quimica/calculadoras/massa-molar', t('respostas.massaMolar.calculadora'))],
      sugestoes: [sug('massaAgua')]
    });
  }

  massaMolarDeFormula(formula, p, composto = null) {
    const r = calcularMassaMolar(formula, this.ctx);
    if (!r.ok) {
      return montar({ intent: 'MASSA_MOLAR', resolvida: false, titulo: t('respostas.massaMolar.naoConsegui'), blocos: [B.aviso(r.erro)], sugestoes: [sug('massaAgua')] });
    }
    const nome = composto ? this.nomeComposto(composto) : null;
    const blocos = [
      B.resultado(null, r.resultados.slice(0, 1), r.fontes[0] ? fonteDe(r.fontes[0]) : fonteCalculo()),
      B.passos(t('respostas.blocos.comoCalcular'), r.passos),
      B.kv(t('respostas.massaMolar.composicao'), r.composicao.map((c) => ({ rotulo: `${c.nome} (${c.simbolo})`, valor: `${fmt(c.percentual, { sig: 4 })} %` })), fonteCalculo())
    ];
    if (composto?.massaMolar != null) {
      blocos.push(B.kv(t('respostas.massaMolar.referencia'), [{ rotulo: t('respostas.massaMolar.pubchemInforma'), valor: `${fmt(composto.massaMolar, { sig: 8 })} g/mol` }], dado(composto.fontes?.[0])[0] ?? this.fontePubchem(composto.cid)));
    }
    if (r.notas.length) blocos.push(B.aviso(r.notas.join(' ')));
    return montar({
      intent: 'MASSA_MOLAR', titulo: t('respostas.massaMolar.titulo', { nome, formula: r.formulaUnicode }),
      blocos,
      acoes: [rota(`/quimica/calculadoras/massa-molar?f=${encodeURIComponent(r.formula)}`, t('respostas.massaMolar.abrirCalculadora'))],
      sugestoes: composto ? [sug('estruturaDe', { nome: minus(nome) })] : []
    });
  }

  // ------------------------------------------------------------------------------------------------ balanceamento e estequiometria
  balancear(p) {
    if (!p.equacao) {
      return montar({
        intent: 'BALANCEAR', titulo: t('respostas.balancear.titulo'),
        blocos: [B.texto(t('respostas.balancear.digite'))],
        acoes: [rota('/quimica/calculadoras/balanceamento', t('respostas.balancear.abrir'))],
        sugestoes: [sug('balancear')]
      });
    }
    const r = balancear(p.equacao, { simbolos: this.ctx.simbolos });
    if (!r.ok) {
      return montar({
        intent: 'BALANCEAR', resolvida: false, titulo: t('respostas.balancear.naoConsegui'), blocos: [B.aviso(r.erro)],
        acoes: [rota(`/quimica/calculadoras/balanceamento?eq=${encodeURIComponent(p.equacao)}`, t('respostas.balancear.ajustar'))], sugestoes: [sug('balancear')]
      });
    }
    return montar({
      intent: 'BALANCEAR', titulo: t('respostas.balancear.balanceada'),
      blocos: [
        B.equacao(r.equacaoTex, r.equacao),
        B.passos(t('respostas.blocos.passoAPasso'), r.passos.slice(0, -1)),
        ...(r.digitouCoeficientes ? [B.aviso(t('respostas.balancear.coeficientesIgnorados'))] : [])
      ],
      acoes: [rota(`/quimica/calculadoras/balanceamento?eq=${encodeURIComponent(p.equacao)}`, t('respostas.balancear.abrirNa'))],
      sugestoes: [sug('molsAgua')],
      extra: { equacaoBalanceada: r.equacao }
    });
  }

  /** Liga cada "número unidade de X" ao composto/fórmula X: [{especie, valor, unidade}]. */
  async quantidadesComEspecie(original) {
    const out = [];
    for (const x of ligarQuantidades(original, this.dic)) {
      const especie = x.especie ?? (x.cid != null ? (await this.store.composto(x.cid))?.formula : null);
      if (especie) out.push({ especie, valor: x.valor, unidade: x.unidade });
    }
    return out;
  }

  async estequiometria(p) {
    const dados = await this.quantidadesComEspecie(p.textoOriginal);
    const acaoCalc = [rota('/quimica/calculadoras/estequiometria', t('respostas.estequiometria.abrir'))];
    if (p.equacao) {
      if (!dados.length) {
        const unid = p.quantidades.filter((q) => q.unidade);
        return montar({
          intent: 'ESTEQUIOMETRIA', resolvida: false, titulo: t('respostas.estequiometria.faltam'),
          blocos: [B.texto(unid.length ? t('respostas.estequiometria.digaCadaReagente') : t('respostas.estequiometria.informePeloMenos'))],
          acoes: acaoCalc, sugestoes: [sug('molsAgua')]
        });
      }
      const r = calcularEstequiometria({ equacao: p.equacao, dados }, this.ctx);
      if (!r.ok) return montar({ intent: 'ESTEQUIOMETRIA', resolvida: false, titulo: t('respostas.estequiometria.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: acaoCalc, sugestoes: [] });
      return montar({
        intent: 'ESTEQUIOMETRIA', titulo: t('respostas.estequiometria.titulo', { equacao: r.equacao }),
        blocos: [B.resultado(null, r.resultados), B.passos(t('respostas.blocos.passoAPasso'), r.passos), ...(r.notas.length ? [B.aviso(r.notas.join(' '))] : [])],
        acoes: acaoCalc, sugestoes: [sug('balancear')]
      });
    }
    // uma substância: massa ↔ mol ↔ partículas ↔ volume
    const q = dados[0] ?? await (async () => {
      const u = p.quantidades.find((x) => x.unidade && x.unidade !== '%');
      const formula = await this.formulaDoAlvo(p);
      return u && formula ? { especie: formula, valor: u.valor, unidade: u.unidade } : null;
    })();
    if (q) {
      const r = converterQuantidade({ formula: q.especie, valor: q.valor, unidade: q.unidade }, this.ctx);
      if (!r.ok) return montar({ intent: 'ESTEQUIOMETRIA', resolvida: false, titulo: t('respostas.estequiometria.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: acaoCalc, sugestoes: [] });
      return montar({
        intent: 'ESTEQUIOMETRIA', titulo: t('respostas.estequiometria.tituloQuantidade', { valor: fmt(q.valor, { sig: 6 }), unidade: q.unidade === 'particulas' ? t('respostas.estequiometria.particulas') : q.unidade, formula: formulaUnicode(r.formula) }),
        blocos: [B.resultado(null, r.resultados), B.passos(t('respostas.blocos.passoAPasso'), r.passos), ...(r.notas.length ? [B.aviso(r.notas.join(' '))] : [])],
        acoes: [rota(`/quimica/calculadoras/estequiometria?f=${encodeURIComponent(r.formula)}&v=${q.valor}&u=${encodeURIComponent(q.unidade)}`, t('respostas.estequiometria.abrirNa'))],
        sugestoes: [sug('balancear')]
      });
    }
    // "quantos mols há em 1,2 × 10²³ átomos?": partículas → mol não depende da substância (só da constante de Avogadro)
    const part = p.quantidades.find((x) => x.unidade === 'particulas');
    if (part) {
      const r = molDeParticulas(part.valor, this.ctx);
      if (r.ok) {
        return montar({
          intent: 'ESTEQUIOMETRIA', titulo: `${fmt(part.valor, { sig: 6 })} ${t('respostas.estequiometria.particulas')} = ${fmt(r.mol, { sig: 6 })} mol`,
          blocos: [B.resultado(null, r.resultados, r.fontes[0]), B.passos(t('respostas.blocos.passoAPasso'), r.passos, r.fontes[0])],
          acoes: acaoCalc, sugestoes: [sug('molsAgua')]
        });
      }
    }
    const mol = p.quantidades.find((x) => x.unidade && acharUnidade(this.ctx.unidades, x.unidade).some((u) => u.grupo === 'quantidade'));
    const vm = this.ctx.volumeMolarCNTP();
    if (mol && vm && this.dic.lex.pistas.cntp.test(normalizar(p.textoOriginal))) {
      const nMol = paraBase(this.ctx.unidades, mol.unidade, 'quantidade', mol.valor);
      const L = nMol * vm.valor * 1000;
      return montar({
        intent: 'ESTEQUIOMETRIA', titulo: t('respostas.estequiometria.volumeTitulo', { valor: fmt(mol.valor, { sig: 6 }), unidade: mol.unidade }),
        blocos: [
          B.resultado(null, [{ rotulo: t('respostas.estequiometria.volumeCntp'), valor: fmt(L, { sig: 6 }), unidade: 'L', destaque: true }, { rotulo: t('respostas.estequiometria.volumeMolar'), valor: fmt(vm.valor * 1000, { sig: 6 }), unidade: 'L/mol' }], { nome: t('respostas.fontes.constanteR') }),
          B.passos(t('respostas.blocos.comoCalcular'), [{ texto: t('respostas.estequiometria.passoVolume'), tex: `V = n\\dfrac{RT}{P} = ${fmtTex(nMol, { sig: 6 })} \\times ${fmtTex(vm.valor * 1000, { sig: 6 })}\\ \\mathrm{L/mol} = ${fmtTex(L, { sig: 6 })}\\ \\mathrm{L}` }]),
          ...notasCntp(this.ctx).map((n) => B.aviso(n))
        ],
        acoes: [rota('/quimica/calculadoras/gas-ideal', t('respostas.estequiometria.abrirGas'))], sugestoes: [sug('molsAgua')]
      });
    }
    return montar({
      intent: 'ESTEQUIOMETRIA', resolvida: false, titulo: t('respostas.estequiometria.tituloGeral'),
      blocos: [B.texto(t('respostas.estequiometria.explicacao'))],
      acoes: acaoCalc, sugestoes: [sug('molsAgua')]
    });
  }

  // ------------------------------------------------------------------------------------------------ concentração, pH, gás
  async formulaDoAlvo(p) {
    if (p.compostos?.length) return (await this.store.composto(p.compostos[0]))?.formula ?? null;
    if (p.formulas?.length) return p.formulas[0];
    if (p.elementos?.length) return p.elementos[0];
    return null;
  }

  async concentracao(p) {
    const calc = [rota('/quimica/calculadoras/concentracao', t('respostas.concentracao.abrir'))];
    const q = p.quantidades.filter((x) => x.unidade);
    const grupoDe = (u) => acharUnidade(this.ctx.unidades, u)[0]?.grupo;
    const massas = q.filter((x) => grupoDe(x.unidade) === 'massa');
    const volumes = q.filter((x) => grupoDe(x.unidade) === 'volume');
    const concs = q.filter((x) => x.unidade === 'g/L' || grupoDe(x.unidade) === 'concentracao');
    const formula = await this.formulaDoAlvo(p);
    const n = normalizar(p.textoOriginal);
    const P = this.dic.lex.pistas;
    let entrada = null;
    if (P.diluicao.test(n) && concs.length >= 1 && volumes.length >= 1 && concs.length + volumes.length >= 3) {
      const unidadeC = concs[0].unidade;
      const unidadeV = volumes[0].unidade;
      entrada = { modo: 'diluicao', C1: concs[0].valor, V1: volumes[0].valor, C2: concs[1]?.valor ?? null, V2: volumes[1]?.valor ?? null, unidadeC, unidadeV };
    } else if (formula && concs.length && volumes.length && !massas.length) {
      entrada = { modo: 'massa', formula, concentracao: { valor: concs[0].valor, unidade: concs[0].unidade }, volume: volumes[0] };
    } else if (formula && massas.length && volumes.length) {
      entrada = { modo: 'molaridade', formula, massa: massas[0], volume: volumes[0] };
    } else if (formula && concs.length === 1 && !volumes.length && !massas.length && (concs[0].unidade === 'g/L' || grupoDe(concs[0].unidade) === 'concentracao')) {
      entrada = { modo: 'gl-mol', formula, valor: concs[0].unidade === 'g/L' ? concs[0].valor : concs[0].valor * (acharUnidade(this.ctx.unidades, concs[0].unidade)[0]?.fator ?? 1000) / 1000, de: concs[0].unidade === 'g/L' ? 'g/L' : 'mol/L' };
    } else if (!formula && massas.length >= 2 && P.percentualMassa.test(n)) {
      entrada = { modo: 'percentual-mm', soluto: massas[0], solucao: massas[1] };
    }
    if (!entrada) {
      return montar({
        intent: 'CONCENTRACAO', resolvida: false, titulo: t('respostas.concentracao.titulo'),
        blocos: [B.texto(t('respostas.concentracao.diga'))],
        acoes: calc, sugestoes: [sug('molaridade')]
      });
    }
    const r = calcularConcentracao(entrada, this.ctx);
    if (!r.ok) return montar({ intent: 'CONCENTRACAO', resolvida: false, titulo: t('respostas.concentracao.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: calc, sugestoes: [] });
    const modos = t('respostas.concentracao.modos');
    return montar({
      intent: 'CONCENTRACAO', titulo: modos?.[r.modo] ?? t('respostas.concentracao.padrao'),
      blocos: [B.resultado(null, r.resultados, r.fontes?.[0] ? fonteDe(r.fontes[0]) : fonteCalculo()), B.passos(t('respostas.blocos.passoAPasso'), r.passos), ...(r.notas.length ? [B.aviso(r.notas.join(' '))] : [])],
      acoes: calc, sugestoes: [sug('phHcl')]
    });
  }

  /** Ácido ou base forte conhecido pelo pacote (`acidosFortes`/`basesFortes`, ou `acidosBases`) ou pela lista padrão: {tipo, n, parcial}. */
  regraAcidoBase(formula) {
    const regras = this.store.regras;
    const k = chaveFormula(formula);
    const doPacote = [
      ...(Array.isArray(regras?.acidosFortes) ? regras.acidosFortes.map((x) => ({ ...x, tipo: 'acido' })) : []),
      ...(Array.isArray(regras?.basesFortes) ? regras.basesFortes.map((x) => ({ ...x, tipo: 'base' })) : []),
      ...(Array.isArray(regras?.acidosBases) ? regras.acidosBases : [])
    ];
    const r = (doPacote.length ? doPacote : REGRAS_ACIDOS_BASES_PADRAO).find((x) => chaveFormula(x.formula) === k);
    if (!r) return null;
    const parcial = /1[ªa]\s*ioniza/i.test(r.nota ?? '');
    const hidrogenios = tentarFormula(r.formula)?.atomos.get('H') ?? 1; // H ionizáveis (ácidos) ou OH (hidróxidos: todos os H são de OH)
    return { ...r, n: r.n ?? (parcial ? 1 : hidrogenios), parcial };
  }

  async ph(p) {
    const calc = [rota('/quimica/calculadoras/ph', t('respostas.ph.abrir'))];
    const q = p.quantidades.filter((x) => x.unidade);
    const grupoDe = (u) => acharUnidade(this.ctx.unidades, u)[0]?.grupo;
    const conc = q.find((x) => grupoDe(x.unidade) === 'concentracao');
    const formula = await this.formulaDoAlvo(p);
    const k = p.constantes ?? {};
    let C = null;
    if (conc) C = paraBase(this.ctx.unidades, conc.unidade, 'concentracao', conc.valor) / 1000;
    else if (q.find((x) => x.unidade === 'g/L') && formula) {
      const g = q.find((x) => x.unidade === 'g/L');
      const m = calcularMassaMolar(formula, this.ctx);
      if (m.ok) C = g.valor / m.massaMolar;
    }
    const n = normalizar(p.textoOriginal);
    // conversão: "pH 3" sem concentração
    const solto = p.quantidades.find((x) => !x.unidade);
    if (C == null && solto && !Object.keys(k).length && /\b(?:ph|poh)\b/.test(n)) {
      const poh = /\bpoh\b/.test(n);
      const r = calcularPH(poh ? { tipo: 'converter', pOH: solto.valor } : { tipo: 'converter', pH: solto.valor }, this.ctx);
      if (r.ok) return this.respostaPh(r, t('respostas.ph.conversoes', { de: poh ? 'pOH' : 'pH', valor: fmt(solto.valor) }), calc);
    }
    if (C == null) {
      return montar({
        intent: 'PH', resolvida: false, titulo: t('respostas.ph.titulo'),
        blocos: [B.texto(t('respostas.ph.informe'))],
        acoes: calc, sugestoes: [sug('phHcl')]
      });
    }
    let entrada = null;
    const regra = formula ? this.regraAcidoBase(formula) : null;
    if (k.Ka != null || k.pKa != null) entrada = { tipo: 'acido-fraco', C, Ka: k.Ka, pKa: k.pKa };
    else if (k.Kb != null || k.pKb != null) entrada = { tipo: 'base-fraca', C, Kb: k.Kb, pKb: k.pKb };
    else if (regra) entrada = { tipo: regra.tipo === 'acido' ? 'acido-forte' : 'base-forte', C, n: regra.n ?? 1, formula: regra.formula ?? formula };
    if (!entrada) {
      return montar({
        intent: 'PH', resolvida: false, titulo: t('respostas.ph.maisDados'),
        blocos: [B.texto(`${formula ? t('respostas.ph.naoTenho', { formula: formatarFormulaTexto(formula) }) : ''}${t('respostas.ph.fracos')}`)],
        acoes: calc, sugestoes: [sug('phHcl')]
      });
    }
    const r = calcularPH(entrada, this.ctx);
    if (r.ok && regra?.parcial) r.notas.unshift(t('respostas.ph.parcial'));
    if (!r.ok) return montar({ intent: 'PH', resolvida: false, titulo: t('respostas.ph.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: calc, sugestoes: [] });
    const titulo = t('respostas.ph.tituloResultado', { ph: fmt(r.pH, { casas: 2 }), formula: formula ? formulaUnicode(formula) : null, conc: fmt(C, { sig: 4 }) });
    return this.respostaPh(r, titulo, calc, regra ? this.fonteRegras() : null);
  }

  respostaPh(r, titulo, acoes, fonteRegra = null) {
    return montar({
      intent: 'PH', titulo,
      blocos: [B.resultado(null, r.resultados, fonteRegra ? [fonteCalculo(), fonteRegra] : fonteCalculo()), B.passos(t('respostas.blocos.passoAPasso'), r.passos), ...(r.notas.length ? [B.aviso(r.notas.join(' '))] : [])],
      acoes, sugestoes: [sug('molsAgua')]
    });
  }

  async gas(p) {
    const calc = [rota('/quimica/calculadoras/gas-ideal', t('respostas.gas.abrir'))];
    const q = p.quantidades.filter((x) => x.unidade);
    const por = (g) => q.find((x) => acharUnidade(this.ctx.unidades, x.unidade).some((u) => u.grupo === g));
    const P = por('pressao'); const V = por('volume'); const T = por('temperatura'); const N = por('quantidade');
    const massa = por('massa');
    const formula = await this.formulaDoAlvo(p);
    // lei de Boyle: dois estados, mesma temperatura e mesma quantidade de gás
    const pressoes = q.filter((x) => acharUnidade(this.ctx.unidades, x.unidade).some((u) => u.grupo === 'pressao'));
    const volumesQ = q.filter((x) => acharUnidade(this.ctx.unidades, x.unidade).some((u) => u.grupo === 'volume'));
    if (!T && !N && !massa && pressoes.length + volumesQ.length === 3 && pressoes.length >= 1 && volumesQ.length >= 1) {
      const dd = (x) => (x ? { valor: x.valor, unidade: x.unidade } : null);
      const rb = calcularBoyle({ P1: dd(pressoes[0]), V1: dd(volumesQ[0]), P2: dd(pressoes[1]), V2: dd(volumesQ[1]) }, this.ctx);
      if (rb.ok) {
        return montar({
          intent: 'GAS_IDEAL', titulo: `${rb.resultados[0].rotulo}: ${rb.resultados[0].valor} ${rb.unidade}`,
          blocos: [B.resultado(null, rb.resultados, fonteCalculo()), B.passos(t('respostas.blocos.passoAPasso'), rb.passos), B.aviso(rb.notas.join(' '))],
          acoes: calc, sugestoes: [sug('converter')]
        });
      }
    }
    const dados = { P, V, T, n: N };
    let falta = ['P', 'V', 'T', 'n'].filter((k) => !dados[k]);
    if (falta.includes('n') && massa && formula) falta = falta.filter((k) => k !== 'n');
    if (falta.length === 4 && !q.length) {
      const R = this.ctx.gasR();
      return montar({
        intent: 'GAS_IDEAL', titulo: t('respostas.gas.tituloEquacao'),
        blocos: [
          B.equacao('PV = nRT', 'PV = nRT'),
          B.lista(t('respostas.gas.naEquacao'), [t('respostas.gas.variaveis'), R ? t('respostas.gas.constante', { valor: fmt(R.valor, { sig: 10 }), fonte: R.fonte?.nome ?? 'CODATA' }) : t('respostas.gas.constanteSem')], R ? dado(R.fonte)[0] ?? fonteApp() : fonteApp()),
          B.texto(t('respostas.gas.informeTres'))
        ],
        acoes: calc, sugestoes: [sug('volumeGas')]
      });
    }
    if (falta.length !== 1) {
      return montar({
        intent: 'GAS_IDEAL', resolvida: false, titulo: t('respostas.gas.tituloFalta'),
        blocos: [B.texto(t('respostas.gas.informeTresEx'))],
        acoes: calc, sugestoes: [sug('volumeGas')]
      });
    }
    const alvo = falta[0];
    const entrada = { resolver: alvo };
    if (P) entrada.P = { valor: P.valor, unidade: P.unidade };
    if (V) entrada.V = { valor: V.valor, unidade: V.unidade };
    if (T) entrada.T = { valor: T.valor, unidade: T.unidade };
    if (N) entrada.n = { valor: N.valor, unidade: N.unidade };
    else if (massa) { entrada.massa = { valor: massa.valor, unidade: massa.unidade }; entrada.formula = formula; }
    const r = calcularGas(entrada, this.ctx);
    if (!r.ok) return montar({ intent: 'GAS_IDEAL', resolvida: false, titulo: t('respostas.gas.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: calc, sugestoes: [] });
    return montar({
      intent: 'GAS_IDEAL', titulo: `${r.resultados[0].rotulo}: ${r.resultados[0].valor} ${r.resultados[0].unidade}`,
      blocos: [B.resultado(null, r.resultados, r.fontes?.[0] ? fonteDe(r.fontes[0]) : fonteCalculo()), B.passos(t('respostas.blocos.passoAPasso'), r.passos), B.aviso(r.notas.join(' '))],
      acoes: calc, sugestoes: [sug('converter')]
    });
  }

  conversao(p) {
    const q = p.quantidades.find((x) => x.unidade);
    const calc = [rota('/quimica/calculadoras/unidades', t('respostas.conversao.abrir'))];
    if (!q || !p.unidadeDestino) {
      return montar({ intent: 'CONVERSAO_UNIDADE', resolvida: false, titulo: t('respostas.conversao.titulo'), blocos: [B.texto(t('respostas.conversao.diga'))], acoes: calc, sugestoes: [sug('converter')] });
    }
    const r = converter(q.valor, q.unidade, p.unidadeDestino, this.ctx.unidades);
    if (!r.ok) return montar({ intent: 'CONVERSAO_UNIDADE', resolvida: false, titulo: t('respostas.conversao.naoConsegui'), blocos: [B.aviso(r.erro)], acoes: calc, sugestoes: [sug('converter')] });
    const fonteTabela = { nome: t('respostas.fontes.tabelaUnidades', { origem: origemUnidades(this.ctx.unidades) }) };
    const linha = (x, destaque) => ({ rotulo: t('respostas.conversao.em', { valor: fmt(x.valor, { sig: 8 }), de: x.de, para: x.para }), valor: fmt(x.resultado, { sig: 8 }), unidade: x.para, destaque });
    // "para atm, kPa e torr": as outras unidades de destino, uma linha cada (os passos são os do primeiro destino; destino de outra grandeza fica de fora)
    const outros = (p.unidadesDestino ?? []).filter((u) => u !== p.unidadeDestino).map((u) => converter(q.valor, q.unidade, u, this.ctx.unidades)).filter((x) => x.ok && x.para !== r.para);
    return montar({
      intent: 'CONVERSAO_UNIDADE', titulo: `${fmt(r.valor, { sig: 8 })} ${r.de} = ${fmt(r.resultado, { sig: 8 })} ${r.para}`,
      blocos: [B.resultado(null, [linha(r, true), ...outros.map((x) => linha(x, false))], fonteTabela), B.passos(t('respostas.blocos.comoConverter'), r.passos, fonteTabela)],
      acoes: calc, sugestoes: [sug('converter')]
    });
  }

  // ------------------------------------------------------------------------------------------------ nomenclatura, estrutura, comparação
  async nomenclatura(p) {
    const { compostos } = await this.entidades(p);
    const c = compostos[0];
    if (!c) {
      return montar({
        intent: 'NOMENCLATURA', resolvida: false, titulo: t('respostas.nomenclatura.titulo'),
        blocos: [B.aviso(`${p.formulas?.length ? t('respostas.nomenclatura.naoEncontreiFormula', { formula: p.formulas[0] }) : t('respostas.nomenclatura.naoEncontrei')}${t('respostas.nomenclatura.tente')}`)],
        acoes: [rota('/quimica/compostos', t('respostas.nomenclatura.buscar'))], sugestoes: [sug('formulaSulfurico')]
      });
    }
    const fonte = dado(c.fontes?.[0])[0] ?? this.fontePubchem(c.cid);
    const nome = this.nomeComposto(c);
    const itens = [{ rotulo: t('respostas.nomenclatura.nome'), valor: nome }];
    if (this.idioma === 'pt-BR' && c.nomePopular && c.nomePopular !== c.nome) itens.push({ rotulo: t('respostas.nomenclatura.nomePopular'), valor: c.nomePopular });
    if (c.nomeIupac) itens.push({ rotulo: t('respostas.nomenclatura.nomeIupac'), valor: c.nomeIupac });
    if (c.formula) itens.push({ rotulo: t('respostas.nomenclatura.formula'), valor: formulaUnicode(c.formula) });
    if (c.formulaHill && c.formulaHill !== c.formula) itens.push({ rotulo: t('respostas.nomenclatura.formulaHill'), valor: formulaUnicode(c.formulaHill) });
    if (c.nomePtPendente && this.idioma === 'pt-BR') itens.push({ rotulo: t('respostas.nomenclatura.observacao'), valor: t('respostas.nomenclatura.ptPendente') });
    return montar({
      intent: 'NOMENCLATURA', titulo: `${nome}${c.formula ? ` — ${formulaUnicode(c.formula)}` : ''}`,
      blocos: [B.kv(null, itens, fonte)],
      acoes: [rota(this.rotaComposto(c.cid), t('respostas.nomenclatura.ficha'))], sugestoes: [sug('estruturaDe', { nome: minus(nome) })]
    });
  }

  async desenhar(p) {
    const { compostos } = await this.entidades(p);
    const c = compostos[0];
    if (!c) return this.naoEntendi(p);
    const nome = this.nomeComposto(c);
    const fonte = dado(c.fontes?.[0])[0] ?? this.fontePubchem(c.cid);
    if (!c.smiles) {
      return montar({ intent: 'DESENHAR', resolvida: true, titulo: t('respostas.desenhar.estruturaDe', { nome }), blocos: [B.aviso(t('respostas.desenhar.semSmiles'))], acoes: [rota(this.rotaComposto(c.cid), t('respostas.desenhar.ficha'))], sugestoes: [] });
    }
    return montar({
      intent: 'DESENHAR', titulo: t('respostas.desenhar.estrutura2d', { nome }),
      blocos: [B.molecula(c.smiles, nome, fonte), B.kv(null, [{ rotulo: t('respostas.desenhar.smiles'), valor: c.smiles }, ...(c.formula ? [{ rotulo: t('respostas.desenhar.formula'), valor: formulaUnicode(c.formula) }] : [])], fonte)],
      acoes: [rota(this.rotaComposto(c.cid), t('respostas.desenhar.ficha'))], sugestoes: [sug('massaMolarDe', { nome: minus(nome) })]
    });
  }

  async comparar(p) {
    const { compostos, elementos } = await this.entidades(p);
    if (elementos.length >= 2 && !compostos.length) {
      const props = this.dic.props.filter((x) => x.alvo === 'elemento' && !['simbolo', 'descoberta'].includes(x.id));
      const linhas = props.map((pr) => [capitalizar(pr.rotulo), ...elementos.map((e) => formatarValor(pr, valorBruto(pr, e), this.ctx)?.curto ?? '—')]).filter((l) => l.slice(1).some((x) => x !== '—'));
      const nomes = elementos.map((e) => this.nomeElementoTitulo(e));
      const fonteEl = dado(...elementos.map((e) => e.fontes?.[0]))[0] ?? fonteApp();
      // "ordem crescente de número atômico de Na, Al, Zn…", "qual tem maior raio: K ou Na?": a lista ordenada vem antes da tabela
      const blocosOrdem = [];
      const prOrdem = p.ordem && p.propriedade ? this.dic.propPorId.get(p.propriedade) : null;
      if (prOrdem && (prOrdem.alvo === 'elemento' || (prOrdem.escopos ?? []).includes('elemento'))) {
        const itens = elementos.map((e, i) => {
          const v = valorBruto(prOrdem, e);
          return { nome: `${nomes[i]} (${e.simbolo})`, v, curto: typeof v === 'number' && Number.isFinite(v) ? formatarValor(prOrdem, v, this.ctx)?.curto ?? null : null };
        });
        const frase = this.fraseDeOrdem(p.ordem, prOrdem.rotulo, itens);
        if (frase) blocosOrdem.push(B.texto(frase, fonteEl));
      }
      return montar({
        intent: 'COMPARAR', titulo: t('respostas.comparar.titulo', { nomes: listar(nomes) }),
        blocos: [...blocosOrdem, B.tabela(null, [t('respostas.comparar.propriedade'), ...elementos.map((e, i) => `${nomes[i]} (${e.simbolo})`)], linhas, fonteEl)],
        acoes: elementos.map((e, i) => rota(this.rotaElemento(e.simbolo), t('respostas.comparar.fichaDe', { nome: nomes[i] }))), sugestoes: []
      });
    }
    if (compostos.length >= 2 && !elementos.length) {
      const L = t('respostas.comparar.linhas');
      const linhas = [
        [L.formula, ...compostos.map((c) => (c.formula ? formulaUnicode(c.formula) : '—'))],
        [L.massaMolar, ...compostos.map((c) => (c.massaMolar != null ? `${fmt(c.massaMolar, { sig: 8 })} g/mol` : '—'))],
        [L.cas, ...compostos.map((c) => c.cas ?? '—')],
        [L.nomeIupac, ...compostos.map((c) => c.nomeIupac ?? '—')],
        [L.xlogp, ...compostos.map((c) => (c.propriedades?.xlogp != null ? fmt(c.propriedades.xlogp, { sig: 5 }) : '—'))],
        [L.sinal, ...compostos.map((c) => descreverGhs(c.ghs)?.palavraSinal ?? '—')],
        [L.pictogramas, ...compostos.map((c) => (c.ghs?.pictogramas?.length ? c.ghs.pictogramas.join(', ') : '—'))]
      ].filter((l) => l.slice(1).some((x) => x !== '—'));
      // propriedades físicas medidas (Wikidata): linha só quando pelo menos dois compostos têm o valor; fonte por valor no bloco
      const medidas = compostos.map((c) => new Map(medidasDoComposto(c, this.dic.props, this.ctx).map((m) => [m.prop.id, m])));
      const fontesMedidas = [];
      const frases = [];
      const frasesOrdem = [];
      const pedidas = new Set(p.propriedades?.length ? p.propriedades : p.propriedade ? [p.propriedade] : []);
      for (const id of ['estadoPadrao', 'pontoFusaoK', 'pontoEbulicaoK', 'densidadeKgm3', 'solubilidade', 'pka']) {
        const ms = medidas.map((mm) => mm.get(id) ?? null);
        if (ms.filter(Boolean).length < 2) continue;
        const prop = ms.find(Boolean).prop;
        linhas.push([capitalizar(id === 'estadoPadrao' ? t('propriedades.medidas.estadoA25') : prop.rotulo), ...ms.map((m) => (m ? m.f.curto : '—'))]);
        for (const m of ms) if (m) fontesMedidas.push(...m.fontes);
        // a propriedade pedida ("compare a densidade do etanol e da água"): diz qual é maior, só entre valores da mesma unidade
        const num = ms.map((m, i) => (m && typeof m.valor === 'number' ? { m, i } : null)).filter(Boolean);
        if (pedidas.has(id) && num.length >= 2 && new Set(num.map((x) => x.m.campo)).size === 1) {
          const top = num.reduce((x, y) => (y.m.valor > x.m.valor ? y : x));
          if (num.filter((x) => x.m.valor === top.m.valor).length === 1) frases.push(t('respostas.comparar.maior', { prop: capitalizar(prop.rotulo), nome: this.nomeComposto(compostos[top.i]), valor: top.m.f.curto }));
        }
        // ordem pedida ("ordem crescente de densidade: água, etanol e glicerina"): lista ordenada antes da tabela
        if (p.ordem && pedidas.has(id) && num.length >= 2 && new Set(num.map((x) => x.m.campo)).size === 1) {
          const itens = ms.map((m, i) => ({ nome: this.nomeComposto(compostos[i]), v: m && typeof m.valor === 'number' ? m.valor : null, curto: m && typeof m.valor === 'number' ? m.f.curto : null }));
          const frase = this.fraseDeOrdem(p.ordem, prop.rotulo, itens);
          if (frase) frasesOrdem.push(frase);
        }
      }
      const fonteTabela = [...dado(...compostos.map((c) => c.fontes?.[0])), ...fontesMedidas];
      return montar({
        intent: 'COMPARAR', titulo: t('respostas.comparar.titulo', { nomes: listar(compostos.map((c) => this.nomeComposto(c))) }),
        blocos: [...frasesOrdem.map((f) => B.texto(f, fontesMedidas.length ? fontesMedidas : fonteApp())),
          B.tabela(null, ['', ...compostos.map((c) => this.nomeComposto(c))], linhas, fontesMedidas.length ? fonteTabela : dado(...compostos.map((c) => c.fontes?.[0]))[0] ?? fonteApp()),
          ...frases.map((f) => B.texto(f, fontesMedidas.length ? fontesMedidas : fonteApp()))],
        acoes: compostos.map((c) => rota(this.rotaComposto(c.cid), t('respostas.comparar.fichaDe', { nome: this.nomeComposto(c) }))), sugestoes: []
      });
    }
    return montar({
      intent: 'COMPARAR', resolvida: false, titulo: t('respostas.comparar.tituloGeral'),
      blocos: [B.texto(t('respostas.comparar.explicacao'))],
      sugestoes: [sug('compareNaCl')]
    });
  }

  /**
   * Frase com os itens em ordem de uma propriedade numérica ("Número atômico, em ordem crescente: Sódio (Na) 11 < Alumínio (Al) 13…").
   * `itens`: [{nome, v, curto}] (curto null = sem o valor no pacote, citado à parte). null se menos de dois têm o valor.
   */
  fraseDeOrdem(ordem, rotulo, itens) {
    const com = itens.filter((x) => x.curto != null && typeof x.v === 'number');
    if (com.length < 2) return null;
    const desc = ordem === 'decrescente';
    com.sort((a, b) => (desc ? b.v - a.v : a.v - b.v));
    let lista = `${com[0].nome} ${com[0].curto}`;
    for (let i = 1; i < com.length; i++) lista += `${com[i].v === com[i - 1].v ? ' = ' : desc ? ' > ' : ' < '}${com[i].nome} ${com[i].curto}`;
    let frase = t(desc ? 'respostas.comparar.ordemDecrescente' : 'respostas.comparar.ordemCrescente', { prop: capitalizar(rotulo), lista });
    const sem = itens.filter((x) => x.curto == null).map((x) => x.nome);
    if (sem.length) frase += ' ' + t('respostas.comparar.semDadoOrdem', { nomes: listar(sem) });
    return frase;
  }

  // ------------------------------------------------------------------------------------------------ tabela periódica
  filtrarElementos(p) {
    const METAIS = new Set(['metal_alcalino', 'metal_alcalino_terroso', 'metal_transicao', 'metal_pos_transicao', 'lantanideo', 'actinideo']);
    return this.store.elementos.filter((e) => {
      if (p.grupo != null && e.grupo !== p.grupo) return false;
      if (p.periodo != null && e.periodo !== p.periodo) return false;
      if (p.bloco && e.bloco !== p.bloco) return false;
      if (p.categoria === 'metal' && !METAIS.has(e.categoria)) return false;
      if (p.categoria && p.categoria !== 'metal' && e.categoria !== p.categoria) return false;
      if (p.estado && estadoChave(e.estadoPadrao) !== p.estado) return false;
      return true;
    });
  }

  tabela(p) {
    const fonte = dado(this.store.elementos.find((e) => e.fontes?.length)?.fontes[0])[0] ?? fonteApp();
    const acao = [rota('/quimica/tabela', t('respostas.tabela.abrir'))];
    const prop = p.propriedade ? this.dic.propPorId.get(p.propriedade) : null;
    const propEl = prop?.alvo === 'elemento' ? prop : null;
    const nomeTit = (e) => this.nomeElementoTitulo(e);
    if (p.extremo) {
      const [id, dir] = p.extremo;
      const pr = this.dic.propPorId.get(id);
      const com = this.store.elementos.map((e) => ({ e, v: valorBruto(pr, e) })).filter((x) => typeof x.v === 'number' && Number.isFinite(x.v));
      if (!com.length) return montar({ intent: 'TABELA_PERIODICA', resolvida: true, titulo: capitalizar(pr.rotulo), blocos: [B.aviso(t('respostas.tabela.naoTemProp', { prop: pr.rotulo }))], acoes: acao, sugestoes: [] });
      com.sort((a, b) => (dir === 'max' ? b.v - a.v : a.v - b.v) || a.e.z - b.e.z);
      const top = com.slice(0, 5);
      return montar({
        intent: 'TABELA_PERIODICA', titulo: t('respostas.tabela.extremo', { dir, prop: pr.rotulo, nome: nomeTit(top[0].e), simbolo: top[0].e.simbolo }),
        blocos: [B.tabela(t('respostas.tabela.entreOs', { n: com.length }), [t('respostas.tabela.elemento'), t('respostas.tabela.simbolo'), capitalizar(pr.rotulo)], top.map((x) => [nomeTit(x.e), x.e.simbolo, formatarValor(pr, x.v, this.ctx).curto]), fonte)],
        acoes: acao, sugestoes: [sug('grupo17')]
      });
    }
    if (p.tendencia && propEl) return this.tendencia(p, propEl, fonte, acao);
    const lista = this.filtrarElementos(p);
    const criterios = [];
    if (p.grupo != null) criterios.push(t('respostas.tabela.grupo', { g: p.grupo }));
    if (p.periodo != null) criterios.push(t('respostas.tabela.periodo', { p: p.periodo }));
    if (p.bloco) criterios.push(t('respostas.tabela.bloco', { b: p.bloco }));
    if (p.categoria) criterios.push(categoriaPlural(p.categoria));
    if (p.estado) criterios.push(t('respostas.tabela.estado', { estado: estadoRotulo(p.estado) }));
    const titulo = criterios.length ? t('respostas.tabela.elementos', { criterios: criterios.join(', ') }) : t('respostas.tabela.titulo');
    if (!criterios.length) {
      return montar({
        intent: 'TABELA_PERIODICA', titulo,
        blocos: [B.texto(t('respostas.tabela.pacoteTem', { n: this.store.elementos.length }))],
        acoes: acao, sugestoes: [sug('grupo17'), sug('periodo3')]
      });
    }
    if (!lista.length) {
      return montar({ intent: 'TABELA_PERIODICA', titulo, blocos: [B.aviso(t('respostas.tabela.nenhum'))], acoes: acao, sugestoes: [sug('grupo17')] });
    }
    const colProp = propEl ?? this.dic.propPorId.get('massaAtomica');
    const qs = new URLSearchParams();
    if (p.grupo != null) qs.set('grupo', p.grupo);
    if (p.periodo != null) qs.set('periodo', p.periodo);
    if (p.bloco) qs.set('bloco', p.bloco);
    if (p.categoria && p.categoria !== 'metal') qs.set('categoria', p.categoria);
    if (p.estado) qs.set('estado', p.estado);
    return montar({
      intent: 'TABELA_PERIODICA', titulo: t('respostas.tabela.comContagem', { titulo, n: lista.length }),
      blocos: [B.tabela(null, [t('respostas.tabela.numero'), t('respostas.tabela.simbolo'), t('respostas.tabela.nome'), capitalizar(colProp.rotulo)], lista.map((e) => [String(e.z), e.simbolo, nomeTit(e), formatarValor(colProp, valorBruto(colProp, e), this.ctx)?.curto ?? '—']), fonte)],
      acoes: [rota(`/quimica/tabela?${qs}`, t('respostas.tabela.destacar'))], sugestoes: [sug('maisEletronegativo')]
    });
  }

  tendencia(p, pr, fonte, acao) {
    const els = this.store.elementos.filter((e) => typeof valorBruto(pr, e) === 'number');
    const porPeriodo = new Map();
    const porGrupo = new Map();
    for (const e of els) {
      if (e.periodo != null) (porPeriodo.get(e.periodo) ?? porPeriodo.set(e.periodo, []).get(e.periodo)).push(e);
      if (e.grupo != null) (porGrupo.get(e.grupo) ?? porGrupo.set(e.grupo, []).get(e.grupo)).push(e);
    }
    const melhor = (mapa, prefer) => (prefer != null && (mapa.get(prefer)?.length ?? 0) >= 2 ? prefer : [...mapa].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0]?.[0] ?? null);
    const per = melhor(porPeriodo, p.periodo);
    const gr = melhor(porGrupo, p.grupo);
    const nomeTit = (e) => this.nomeElementoTitulo(e);
    const blocos = [];
    if (per != null) blocos.push(B.tabela(t('respostas.tabela.periodoLegenda', { p: per }), [t('respostas.tabela.elemento'), t('respostas.tabela.colGrupo'), capitalizar(pr.rotulo)], porPeriodo.get(per).sort((a, b) => a.z - b.z).map((e) => [`${nomeTit(e)} (${e.simbolo})`, String(e.grupo ?? '—'), formatarValor(pr, valorBruto(pr, e), this.ctx).curto]), fonte));
    if (gr != null) blocos.push(B.tabela(t('respostas.tabela.grupoLegenda', { g: gr }), [t('respostas.tabela.elemento'), t('respostas.tabela.colPeriodo'), capitalizar(pr.rotulo)], porGrupo.get(gr).sort((a, b) => a.periodo - b.periodo).map((e) => [`${nomeTit(e)} (${e.simbolo})`, String(e.periodo), formatarValor(pr, valorBruto(pr, e), this.ctx).curto]), fonte));
    if (!blocos.length) blocos.push(B.aviso(t('respostas.tabela.naoTemSuficiente', { prop: pr.rotulo })));
    return montar({
      intent: 'TABELA_PERIODICA', titulo: t('respostas.tabela.tendencia', { prop: pr.rotulo }),
      blocos: [B.texto(t('respostas.tabela.tendenciaTexto')), ...blocos],
      acoes: acao, sugestoes: [sug('maisEletronegativo')]
    });
  }

  // ------------------------------------------------------------------------------------------------ segurança
  incompatibilidade(a, b) {
    const lista = this.store.regras?.incompatibilidades;
    if (!Array.isArray(lista)) return null;
    const nomes = (c) => [c.nome, c.nomePopular, c.nomeIupac, ...(c.sinonimos ?? []), ...Object.values(c.nomes ?? {})].filter(Boolean).map(normalizar);
    const na = nomes(a);
    const nb = nomes(b);
    const tem = (ns, alvo) => ns.some((n) => n === normalizar(alvo) || n.includes(normalizar(alvo)) || normalizar(alvo).includes(n));
    return lista.find((r) => (tem(na, r.a) && tem(nb, r.b)) || (tem(na, r.b) && tem(nb, r.a))) ?? null;
  }

  blocoGhs(c) {
    const g = descreverGhs(c.ghs, this.store.regras);
    const nome = this.nomeComposto(c);
    const fonteC = dado(c.fontes?.[0])[0] ?? this.fontePubchem(c.cid);
    if (!g) {
      return B.aviso(t('respostas.seguranca.semGhs', { nome }), fonteC);
    }
    return { tipo: 'ghs', titulo: t('respostas.seguranca.perigosDe', { nome }), ...g, fonte: dado(fonteGhs(c) ?? fonteC, this.fonteFrases()) };
  }

  async seguranca(p) {
    const { compostos, elementos } = await this.entidades(p);
    const blocos = [];
    const acoes = [];
    if (p.mistura && compostos.length >= 2) {
      const reg = this.incompatibilidade(compostos[0], compostos[1]);
      const nomes = compostos.slice(0, 2).map((c) => this.nomeComposto(c));
      // o `motivo` das incompatibilidades do pacote é texto em pt-BR (regras.json); fora do pt-BR fica a orientação geral do app
      if (reg && (this.idioma === 'pt-BR' || reg.motivoPorIdioma?.[this.idioma])) blocos.push(B.aviso(t('respostas.seguranca.naoMisture', { a: nomes[0], b: nomes[1], motivo: reg.motivoPorIdioma?.[this.idioma] ?? reg.motivo }), this.fonteRegras()));
      else blocos.push(B.aviso(t('respostas.seguranca.naoMistureGeral', { a: nomes[0], b: nomes[1] })));
    }
    for (const c of compostos.slice(0, 3)) {
      blocos.push(this.blocoGhs(c));
      acoes.push(...this.acoesIcsc(c, compostos.length > 1));
    }
    for (const e of elementos.slice(0, 2)) {
      blocos.push(B.aviso(t('respostas.seguranca.elementoSemGhs', { nome: this.nomeElemento(e) }), dado(e.fontes?.[0])[0] ?? fonteApp()));
    }
    blocos.push(B.lista(t('respostas.seguranca.orientacao'), orientacaoGeral(), { nome: t('respostas.fontes.orientacaoGeral') }));
    if (!compostos.length && !elementos.length) {
      blocos.unshift(B.texto(t('respostas.seguranca.naoIdentifiquei')));
    }
    acoes.push(rota('/quimica/seguranca', t('respostas.seguranca.comoLer')));
    const alvo = compostos[0] ? this.nomeComposto(compostos[0]) : elementos[0] ? this.nomeElementoTitulo(elementos[0]) : null;
    return montar({
      intent: 'SEGURANCA', titulo: alvo ? t('respostas.seguranca.titulo', { alvo: p.mistura && compostos[1] ? `${this.nomeComposto(compostos[0])}${t('respostas.seguranca.eConector')}${this.nomeComposto(compostos[1])}` : alvo }) : t('respostas.seguranca.tituloGeral'),
      blocos, acoes,
      sugestoes: [sug('misturar'), sug('perigosSulfurico')],
      extra: { compostoCid: compostos[0]?.cid ?? null }
    });
  }

  // ------------------------------------------------------------------------------------------------ calculadoras novas (17/10/2026)
  // NOX, entalpia, equilíbrio, tipo de ligação e distribuição eletrônica (docs/CALCULADORAS_2026-10-17.md §2). Os métodos `resposta*` recebem as
  // entradas já separadas e também servem à tela Calculadoras (ui/calculadoras.js); os de intenção só leem o ParsedQuery.
  fonteRegra(chave) { return { nome: t(`respostas.fontes.${chave}`) }; }

  /** CID do composto do pacote com esta fórmula (índice do dicionário), ou null. */
  cidDaFormula(formula) {
    try { return this.dic.entidades(String(formula)).compostos.find((x) => x.via === 'formula')?.cid ?? null; } catch { return null; }
  }

  /** Nome do elemento no idioma (ou o símbolo, se o pacote não o tem). */
  nomeDoSimbolo(s) { const e = this.store.porSimbolo.get(s); return e ? this.nomeElemento(e) : s; }
  /** O mesmo, para o meio da frase (minúscula onde o idioma pede). */
  nomeDoSimboloMeio(s) { return minus(this.nomeDoSimbolo(s)); }

  /** Mensagem de erro de leitura de equação (códigos de calc/equilibrio.js). */
  erroDeEquacao(r) { return r.mensagem ?? t(`respostas.equacaoErros.${r.erro}`); }

  /** Equação montada das espécies [{formula, coef, lado}]: {texto: "CH₄ + 2 O₂ → CO₂ + 2 H₂O", tex}. */
  equacaoDasEspecies(especies, { equilibrio = false } = {}) {
    const lado = (l, tex) => especies.filter((x) => x.lado === l).map((x) => {
      const c = x.coef === 1 ? '' : tex ? `${fmtTex(x.coef)}\\,` : `${fmt(x.coef)} `;
      return `${c}${tex ? formulaTex(x.formula) : formulaUnicode(x.formula)}`;
    }).join(' + ');
    return { texto: `${lado('r', false)} ${equilibrio ? '⇌' : '→'} ${lado('p', false)}`, tex: `${lado('r', true)} ${equilibrio ? '\\rightleftharpoons' : '\\rightarrow'} ${lado('p', true)}` };
  }

  // ---- distribuição eletrônica
  /** Blocos da distribuição eletrônica de um elemento (ou íon, com `carga`). */
  blocosEletronica(e, carga = 0) {
    const nome = minus(this.nomeElemento(e));
    if (!e.configuracaoEletronica) return [B.aviso(t('respostas.eletronica.semConfiguracao', { nome }))];
    const r = distribuicaoEletronica({ configuracao: e.configuracaoEletronica, z: e.z, carga, bloco: e.bloco ?? null });
    if (!r.ok) {
      if (r.erro === 'totalDiferente') return [B.aviso(t('respostas.eletronica.totalDiferente', { total: String(r.total), z: String(r.esperado) }))];
      return [B.aviso(t(`respostas.eletronica.${r.erro}`, { nome }))];
    }
    const sup = (lista) => textoSubniveis(lista, { sobrescrito: true });
    const cv = r.camadaValencia;
    const valencia = r.valenciaTipo === 'camada' ? String(r.eletronsValencia) : t(r.valenciaTipo === 'ns+(n-1)d' ? 'respostas.eletronica.valenciaTransicao' : 'respostas.eletronica.valenciaF', { e: String(r.eletronsValencia) });
    const itens = [
      { rotulo: t('respostas.eletronica.pacote'), valor: r.configuracaoPacote },
      { rotulo: t('respostas.eletronica.completa'), valor: sup(r.ordemPauling) },
      { rotulo: t('respostas.eletronica.camadasOrdem'), valor: sup(r.ordemCamadas) },
      { rotulo: t('respostas.eletronica.porCamada'), valor: `${r.camadas.map((c) => c.eletrons).join(', ')} (${r.camadas.map((c) => c.camada).join(', ')})` },
      { rotulo: t('respostas.eletronica.camadaValencia'), valor: t('respostas.eletronica.camadaValenciaValor', { camada: cv.camada, n: String(cv.n), e: String(cv.eletrons) }) },
      ...(carga ? [] : [{ rotulo: t('respostas.eletronica.eletronsValencia'), valor: valencia }]),
      { rotulo: t('respostas.eletronica.maisEnergetico'), valor: sup([r.subnivelMaisEnergetico]) },
      { rotulo: t('respostas.eletronica.bloco'), valor: r.bloco ?? '—' }
    ];
    const titulo = carga ? t('respostas.eletronica.tituloIon', { simbolo: e.simbolo, carga: textoCarga(carga) }) : t('respostas.eletronica.titulo', { nome });
    const blocos = [B.kv(titulo, itens, [...dado(e.fontes?.[0]), this.fonteRegra('distribuicao')])];
    if (r.ignorados.length) blocos.push(B.aviso(t('respostas.eletronica.ignorados', { lista: r.ignorados.join(' ') })));
    return blocos;
  }

  /** Resposta da calculadora de configuração eletrônica (elemento + carga). */
  respostaEletronica({ simbolo, carga = 0 }) {
    const e = this.store.porSimbolo.get(simbolo);
    if (!e) return montar({ intent: 'PROPRIEDADE', resolvida: false, titulo: t('respostas.eletronica.deQual'), blocos: [B.texto(t('respostas.eletronica.digite'))] });
    const blocos = this.blocosEletronica(e, carga);
    return montar({ intent: 'PROPRIEDADE', resolvida: blocos[0]?.tipo === 'kv', titulo: blocos[0]?.titulo ?? t('respostas.eletronica.titulo', { nome: this.nomeElemento(e) }), blocos });
  }

  // ---- NOX
  async nox(p) {
    const { compostos } = await this.entidades(p);
    const formula = p.formula ?? compostos[0]?.formula ?? null;
    return this.respostaNox({ formula, carga: p.cargaFormula ?? null, elemento: p.elemento ?? null });
  }

  respostaNox({ formula, carga = null, elemento = null }) {
    const acao = (f) => [rota('/quimica/calculadoras/nox' + (f ? `?f=${encodeURIComponent(f)}` : ''), t('respostas.nox.abrir'))];
    if (!formula) return montar({ intent: 'NOX', resolvida: false, titulo: t('respostas.nox.deQual'), blocos: [B.texto(t('respostas.nox.digite'))], acoes: acao(null), sugestoes: [sug('noxSulfurico')] });
    const r = calcularNox(formula, { carga: Number.isInteger(carga) ? carga : null, dados: dadosElementosDoContexto(this.ctx), simbolos: this.ctx.simbolos });
    const fu = formatarFormulaTexto(formula);
    if (!r.ok) {
      const msg = r.erro === 'formula' ? r.mensagem : t(`respostas.nox.${r.erro}`, { lista: listar(r.faltam ?? []), soma: r.soma ?? '', carga: textoCarga(r.carga ?? 0), formula: fu });
      return montar({ intent: 'NOX', resolvida: false, titulo: t('respostas.nox.naoConsegui'), blocos: [B.aviso(msg, this.fonteRegra('regrasNox'))], acoes: acao(formula), sugestoes: [sug('noxSulfurico')] });
    }
    const fuR = formulaUnicode(r.carga ? `${r.corpo}^${Math.abs(r.carga) === 1 ? '' : Math.abs(r.carga)}${r.carga > 0 ? '+' : '-'}` : r.corpo);
    const alvo = elemento ? r.itens.find((i) => i.simbolo === elemento) : null;
    const usouEN = r.itens.some((i) => i.regra === 'eletronegatividade');
    const fonteRes = [this.fonteRegra('regrasNox'), ...(usouEN ? r.itens.map((i) => dado(this.store.porSimbolo.get(i.simbolo)?.fontes?.[0])[0]).filter(Boolean) : [])];
    const itens = r.itens.map((i) => ({ rotulo: `${capitalizar(this.nomeDoSimbolo(i.simbolo))} (${i.simbolo})`, valor: i.texto, extra: i.medio ? t('respostas.nox.medio') : t(`respostas.nox.regras.${i.regra}`), destaque: i.simbolo === elemento }));
    const soma = r.itens.map((i) => `${i.atomos}\\times(${texNox(i.nox)})`).join(' + ');
    const blocos = [
      B.resultado(null, itens, fonteRes),
      B.passos(t('respostas.blocos.comoCalcular'), [
        { texto: t('respostas.nox.passoRegras') },
        { texto: t('respostas.nox.passoSoma', { carga: textoCarga(r.carga) }), tex: `${soma} = ${r.carga}` }
      ], this.fonteRegra('regrasNox'))
    ];
    if (elemento && !alvo) blocos.push(B.aviso(t('respostas.nox.elementoAusente', { el: elemento, formula: fuR })));
    if (r.itens.some((i) => i.medio)) blocos.push(B.aviso(t('respostas.nox.avisoMedio')));
    return montar({
      intent: 'NOX', titulo: alvo ? t('respostas.nox.tituloElemento', { el: this.nomeDoSimboloMeio(alvo.simbolo), formula: fuR, nox: alvo.texto }) : t('respostas.nox.titulo', { formula: fuR }),
      blocos, acoes: acao(formula), sugestoes: [sug('ligacaoHCl')], extra: { nox: r.itens.map((i) => ({ simbolo: i.simbolo, nox: i.nox.toString() })) }
    });
  }

  // ---- tipo de ligação
  async ligacao(p) {
    const { compostos } = await this.entidades(p);
    const formula = compostos[0]?.formula ?? p.formula ?? p.formulas?.[0] ?? null;
    const n = normalizar(p.textoOriginal ?? '');
    return this.respostaLigacao({
      formula, simbolos: formula ? null : p.elementos ?? [], nome: compostos[0] ? this.nomeComposto(compostos[0]) : null,
      polaridade: this.dic.lex.pistas.ligacaoPolaridade.test(n)
    });
  }

  respostaLigacao({ formula = null, simbolos = null, nome = null, polaridade = false }) {
    const acao = [rota('/quimica/calculadoras/ligacao' + (formula ? `?f=${encodeURIComponent(formula)}` : ''), t('respostas.ligacao.abrir'))];
    if (!formula && !(simbolos?.length >= 2)) return montar({ intent: 'LIGACAO', resolvida: false, titulo: t('respostas.ligacao.deQual'), blocos: [B.texto(t('respostas.ligacao.digite'))], acoes: acao, sugestoes: [sug('ligacaoHCl')] });
    const r = ligacoesDe({ formula, simbolos, elemento: (s) => this.store.porSimbolo.get(s) ?? null, simbolosValidos: this.ctx.simbolos });
    const falha = !r.ok ? r : r.ligacoes.find((l) => !l.ok);
    if (falha) {
      const msg = falha.erro === 'formula' ? falha.mensagem : t(`respostas.ligacao.${falha.erro}`, { lista: listar(falha.faltam ?? []) });
      return montar({ intent: 'LIGACAO', resolvida: false, titulo: t('respostas.ligacao.naoConsegui'), blocos: [B.aviso(msg, this.fonteRegra('regraLigacao'))], acoes: acao, sugestoes: [sug('ligacaoHCl')] });
    }
    const alvo = nome ?? (formula ? formatarFormulaTexto(formula) : listar(simbolos.slice(0, 2).map((s) => this.nomeDoSimboloMeio(s))));
    const usados = [...new Set(r.ligacoes.flatMap((l) => [l.a, l.b]))];
    const fontes = [...usados.map((s) => dado(this.store.porSimbolo.get(s)?.fontes?.[0])[0]).filter(Boolean), this.fonteRegra('regraLigacao')];
    const itens = r.ligacoes.map((l) => ({
      rotulo: `${l.a}–${l.b}`, valor: t(`respostas.ligacao.tipos.${l.tipo}`), destaque: r.ligacoes.length === 1,
      extra: l.tipo === 'metalica' ? t('respostas.ligacao.metalMetal') : l.deltaEN != null ? t('respostas.ligacao.delta', { d: fmt(l.deltaEN, { sig: 3 }), a: l.a, ea: fmt(l.enA, { sig: 3 }), b: l.b, eb: fmt(l.enB, { sig: 3 }) }) : undefined
    }));
    const blocos = [B.resultado(null, itens, fontes), B.aviso(t('respostas.ligacao.convencao'))];
    if (r.estimado) blocos.push(B.aviso(t('respostas.ligacao.estimado')));
    if (polaridade && formula && usados.length >= 2 && r.ligacoes.every((l) => l.tipo !== 'ionica' && l.tipo !== 'metalica')) blocos.push(B.aviso(t('respostas.ligacao.polaridadeMolecula')));
    return montar({ intent: 'LIGACAO', titulo: t('respostas.ligacao.titulo', { alvo }), blocos, acoes: acao, sugestoes: [sug('noxSulfurico')], extra: { ligacoes: r.ligacoes.map((l) => ({ a: l.a, b: l.b, tipo: l.tipo, deltaEN: l.deltaEN })) } });
  }

  // ---- equilíbrio
  async equilibrio(p) {
    const temperatura = (p.quantidades ?? []).find((q) => q.unidade && temperaturaEmK(q, this.ctx) != null) ?? null;
    return this.respostaEquilibrio({ equacao: p.equacao, concentracoes: p.concentracoes ?? [], temperatura });
  }

  /**
   * Fase de cada espécie sem rótulo, pelo composto do pacote: a `temperaturaK`, pelos pontos de fusão e de ebulição; sem ela, o `estadoPadrao`.
   * Map(chave da fórmula → 'solido'|'liquido'|'gas').
   */
  async fasesDoPacote(equacao, temperaturaK = null) {
    const fases = new Map();
    let eq;
    try { eq = lerEquacaoComEstados(equacao, { simbolos: this.ctx.simbolos }); } catch { return fases; }
    const ler = (id, c) => { const prop = this.dic.propPorId.get(id); return c && prop ? lerValor(prop, c)?.valor ?? null : null; };
    for (const x of [...eq.reagentes, ...eq.produtos]) {
      if (x.estado || fases.has(x.chave)) continue;
      const cid = this.cidDaFormula(x.formula);
      const c = cid != null ? await this.store.composto(cid) : null;
      if (!c) continue;
      const v = estadoNaTemperatura({ estadoPadrao: ler('estadoPadrao', c), pontoFusaoK: ler('pontoFusaoK', c), pontoEbulicaoK: ler('pontoEbulicaoK', c) }, temperaturaK);
      if (v) fases.set(x.chave, v);
    }
    return fases;
  }

  async respostaEquilibrio({ equacao, concentracoes = [], temperatura = null }) {
    const acao = [rota('/quimica/calculadoras/equilibrio' + (equacao ? `?eq=${encodeURIComponent(equacao)}` : ''), t('respostas.equilibrio.abrir'))];
    if (!equacao) return montar({ intent: 'EQUILIBRIO', resolvida: false, titulo: t('respostas.equilibrio.deQual'), blocos: [B.texto(t('respostas.equilibrio.digite'))], acoes: acao, sugestoes: [sug('kcAmonia')] });
    const T = temperatura ? temperaturaEmK(temperatura, this.ctx) : null;
    const fases = await this.fasesDoPacote(equacao, T);
    const expr = expressaoEquilibrio(equacao, { estadoDoPacote: (f) => { try { return fases.get(chaveFormula(f)) ?? null; } catch { return null; } }, simbolos: this.ctx.simbolos });
    if (!expr.ok) return montar({ intent: 'EQUILIBRIO', resolvida: false, titulo: t('respostas.equilibrio.naoConsegui'), blocos: [B.aviso(this.erroDeEquacao(expr))], acoes: acao, sugestoes: [sug('kcAmonia')] });
    const regra = this.fonteRegra('acaoDasMassas');
    const eqTxt = this.equacaoDasEspecies(expr.especies, { equilibrio: true });
    const blocos = [B.equacao(expr.tex, expr.texto, regra)];
    const lista = (f) => listar(expr.especies.filter(f).map((x) => formulaUnicode(x.formula)));
    if (expr.balanceada) blocos.push(B.aviso(t('respostas.equilibrio.balanceada', { equacao: eqTxt.texto })));
    if (expr.especies.some((x) => !x.entra)) blocos.push(B.aviso(t('respostas.equilibrio.semSolidoLiquido', { lista: lista((x) => !x.entra) })));
    if (expr.especies.some((x) => x.origem === 'pacote')) blocos.push(B.aviso(t(T != null ? 'respostas.equilibrio.faseNaTemperatura' : 'respostas.equilibrio.faseDoPacote', { t: fmt(T ?? 0, { sig: 6 }), lista: listar(expr.especies.filter((x) => x.origem === 'pacote').map((x) => `${formulaUnicode(x.formula)} (${t(`propriedades.estados.${x.fase === 's' ? 'solido' : x.fase === 'l' ? 'liquido' : 'gas'}`)})`)) })));
    if (expr.especies.some((x) => x.origem === 'hipotese')) blocos.push(B.aviso(t('respostas.equilibrio.gasPorHipotese', { lista: lista((x) => x.origem === 'hipotese') })));
    const itens = [{ rotulo: t('respostas.equilibrio.deltaN'), valor: fmt(expr.deltaN, { sig: 6 }) }];
    let resolvida = true;
    let kc = null;
    const passos = [];
    if (concentracoes.length) {
      const r = calcularKc(expr, concentracoes);
      if (r.ok) {
        kc = r.kc;
        itens.push({ rotulo: t('respostas.equilibrio.kc'), valor: fmt(kc, { sig: 4 }), extra: t('respostas.equilibrio.unidadeKc'), destaque: true });
        const termo = (u) => `(${fmtTex(u.valor)})${u.coef === 1 ? '' : `^{${fmtTex(u.coef)}}`}`;
        const num = r.usadas.filter((u) => u.lado === 'p').map(termo).join('\\,') || '1';
        const den = r.usadas.filter((u) => u.lado === 'r').map(termo).join('\\,') || '1';
        passos.push({ texto: t('respostas.equilibrio.passoKc'), tex: `K_c = \\dfrac{${num}}{${den}} = ${fmtTex(kc, { sig: 4 })}` });
      } else {
        resolvida = false;
        blocos.push(B.aviso(r.erro === 'faltamConcentracoes' ? t('respostas.equilibrio.faltam', { lista: listar(r.faltam.map(formulaUnicode)) }) : t('respostas.equilibrio.invalida')));
      }
    }
    const R = rLitroAtm(this.ctx);
    const fonteR = { nome: t('respostas.fontes.constanteR') };
    if (!R) blocos.push(B.aviso(t('respostas.equilibrio.semR')));
    else if (T != null) {
      const k = kpDeKc({ deltaN: expr.deltaN, T, rLatm: R.valor, kc });
      if (k.ok) {
        itens.push({ rotulo: t('respostas.equilibrio.temperatura'), valor: fmt(T, { sig: 6 }), unidade: 'K' });
        itens.push({ rotulo: t('respostas.equilibrio.fatorRT'), valor: fmt(k.fator, { sig: 4 }) });
        if (k.kp != null) itens.push({ rotulo: t('respostas.equilibrio.kp'), valor: fmt(k.kp, { sig: 4 }), destaque: true });
        passos.push({ texto: t('respostas.equilibrio.passoKp', { R: fmt(R.valor, { sig: 6 }) }), tex: `K_p = K_c\\,(RT)^{${fmtTex(expr.deltaN)}} = K_c\\,(${fmtTex(R.valor, { sig: 6 })} \\times ${fmtTex(T, { sig: 6 })})^{${fmtTex(expr.deltaN)}}${k.kp != null ? ` = ${fmtTex(k.kp, { sig: 4 })}` : ` = ${fmtTex(k.fator, { sig: 4 })}\\,K_c`}` });
      } else blocos.push(B.aviso(t('respostas.equilibrio.semT')));
    } else {
      blocos.push(B.equacao(`K_p = K_c\\,(RT)^{${fmtTex(expr.deltaN)}}`, `Kp = Kc·(RT)^${fmt(expr.deltaN, { sig: 6 })}`, fonteR));
      blocos.push(B.texto(t('respostas.equilibrio.semT'), fonteR));
    }
    blocos.splice(1, 0, B.resultado(null, itens, T != null ? [regra, fonteR] : regra));
    if (passos.length) blocos.push(B.passos(t('respostas.blocos.comoCalcular'), passos, T != null ? [regra, fonteR] : regra));
    return montar({ intent: 'EQUILIBRIO', resolvida, titulo: t('respostas.equilibrio.titulo', { equacao: eqTxt.texto }), blocos, acoes: acao, sugestoes: [sug('ligacaoHCl')], extra: { deltaN: expr.deltaN, kc } });
  }

  // ---- entalpia
  async entalpia(p) {
    if (p.equacao) return this.respostaEntalpiaReacao(p.equacao);
    const { compostos } = await this.entidades(p);
    const c = compostos[0] ?? null;
    const formula = c?.formula ?? p.formulas?.[0] ?? null;
    const n = normalizar(p.textoOriginal ?? '');
    const P = this.dic.lex.pistas;
    if (formula && (P.entalpiaCombustao.test(n) || !P.entalpiaFormacao.test(n))) {
      const quantidade = (p.quantidades ?? []).find((q) => q.unidade && acharUnidade(this.ctx.unidades, q.unidade).some((u) => u.grupo === 'massa' || u.grupo === 'quantidade')) ?? null;
      return this.respostaCombustao({ formula, composto: c, quantidade });
    }
    // só a lei de Hess (ou a pergunta sem reação): o método e a calculadora
    return montar({
      intent: 'ENTALPIA', titulo: t('respostas.entalpia.tituloHess'),
      blocos: [B.texto(t('respostas.entalpia.hess'), this.fonteRegra('entalpiaCalculo')), B.texto(t('respostas.entalpia.digite'))],
      acoes: [rota('/quimica/calculadoras/entalpia?modo=hess', t('respostas.entalpia.abrirHess'))], sugestoes: [sug('kcAmonia')]
    });
  }

  /** ΔHf° de uma espécie: 0 por regra (substância simples no estado padrão) ou o valor do pacote com a fonte; `valor: null` se o pacote não tem. */
  async entalpiaFormacaoDe(formula) {
    if (ehSubstanciaSimplesPadrao(formula, { simbolos: this.ctx.simbolos })) return { valor: 0, origem: 'regra', fontes: [this.fonteRegra('substanciaSimples')], condicoes: [] };
    const cid = this.cidDaFormula(formula);
    const c = cid != null ? await this.store.composto(cid) : null;
    const v = c?.propriedades?.entalpiaFormacaoKJmol;
    if (typeof v !== 'number' || !Number.isFinite(v)) return { valor: null, origem: null, fontes: [], condicoes: [] };
    const fontes = fontesDoCampo(c, 'entalpiaFormacaoKJmol', this.ctx);
    return { valor: v, origem: 'pacote', fontes: fontes.length ? fontes : dado(c.fontes?.[0]), condicoes: [...new Set(fontes.flatMap((f) => f.condicoes ?? []))] };
  }

  /** Soma por formação com os ΔHf° resolvidos: {r, blocos} (tabela dos valores usados + passos). */
  async calculoPorFormacao(especies) {
    const resolvidas = [];
    for (const x of especies) { const h = await this.entalpiaFormacaoDe(x.formula); resolvidas.push({ ...x, dHf: h.valor, origem: h.origem, fontes: h.fontes, condicoes: h.condicoes }); }
    const r = somaPorFormacao(resolvidas);
    const valores = resolvidas.map((x) => ({
      rotulo: t('respostas.entalpia.dHfDe', { formula: formulaUnicode(x.formula) }),
      valor: x.dHf == null ? t('respostas.entalpia.semValor') : x.origem === 'regra' ? t('respostas.entalpia.simples') : `${fmt(x.dHf, { sig: 6 })} kJ/mol${x.condicoes.length ? ` — ${x.condicoes.join('; ')}` : ''}`
    }));
    const fontes = resolvidas.flatMap((x) => x.fontes ?? []);
    const blocos = [B.kv(t('respostas.entalpia.valores'), valores, fontes.length ? fontes : fonteApp())];
    const termoTex = (x, numero) => `${x.coef === 1 ? '' : `${fmtTex(x.coef)}\\,`}${numero ? `(${fmtTex(x.dHf)})` : `\\Delta H_f^{\\circ}(${formulaTex(x.formula)})`}`;
    const lado = (l, numero) => resolvidas.filter((x) => x.lado === l).map((x) => termoTex(x, numero)).join(' + ') || '0';
    const passos = [{ texto: t('respostas.entalpia.expressao'), tex: `\\Delta H^{\\circ} = [${lado('p', false)}] - [${lado('r', false)}]` }];
    if (r.ok) passos.push({ texto: t('respostas.entalpia.passoSoma'), tex: `\\Delta H^{\\circ} = [${lado('p', true)}] - [${lado('r', true)}] = ${fmtTex(r.dH, { sig: 6 })}\\ \\mathrm{kJ}` });
    blocos.push(B.passos(t('respostas.blocos.comoCalcular'), passos, this.fonteRegra('entalpiaCalculo')));
    return { r, blocos };
  }

  async respostaEntalpiaReacao(equacao) {
    const acao = [rota(`/quimica/calculadoras/entalpia?eq=${encodeURIComponent(equacao)}`, t('respostas.entalpia.abrir'))];
    const e = especiesDaEquacao(equacao, { simbolos: this.ctx.simbolos });
    if (!e.ok) return montar({ intent: 'ENTALPIA', resolvida: false, titulo: t('respostas.entalpia.naoConsegui'), blocos: [B.aviso(this.erroDeEquacao(e))], acoes: acao, sugestoes: [sug('entalpiaHess')] });
    const eq = this.equacaoDasEspecies(e.especies);
    const { r, blocos } = await this.calculoPorFormacao(e.especies);
    const topo = [B.equacao(eq.tex, eq.texto)];
    if (e.balanceada) topo.push(B.aviso(t('respostas.entalpia.balanceada', { equacao: eq.texto })));
    const titulo = t('respostas.entalpia.tituloReacao', { equacao: eq.texto });
    if (!r.ok) return montar({ intent: 'ENTALPIA', resolvida: false, titulo, blocos: [...topo, B.aviso(t('respostas.entalpia.falta', { lista: listar(r.faltam.map(formulaUnicode)) })), ...blocos], acoes: acao, sugestoes: [sug('entalpiaHess')] });
    return montar({
      intent: 'ENTALPIA', titulo,
      blocos: [...topo, B.resultado(null, [{ rotulo: t('respostas.entalpia.resultado'), valor: fmt(r.dH, { sig: 6 }), unidade: 'kJ', destaque: true }], this.fonteRegra('entalpiaCalculo')), ...blocos, B.aviso(t(r.exotermica ? 'respostas.entalpia.exotermica' : 'respostas.entalpia.endotermica'))],
      acoes: acao, sugestoes: [sug('entalpiaHess')], extra: { dH: r.dH }
    });
  }

  async respostaCombustao({ formula, composto = null, quantidade = null }) {
    const acao = [rota('/quimica/calculadoras/entalpia?modo=hess', t('respostas.entalpia.abrirHess'))];
    const nome = composto ? minus(this.nomeComposto(composto)) : formatarFormulaTexto(formula);
    const comb = equacaoDeCombustao(formula, { simbolos: this.ctx.simbolos });
    if (!comb.ok) return montar({ intent: 'ENTALPIA', resolvida: false, titulo: t('respostas.entalpia.naoConsegui'), blocos: [B.aviso(comb.mensagem ?? t('respostas.entalpia.naoQueima'))], acoes: acao, sugestoes: [sug('entalpiaHess')] });
    const { r, blocos } = await this.calculoPorFormacao(comb.especies);
    const titulo = t('respostas.entalpia.tituloCombustao', { nome });
    const topo = [B.equacao(comb.equacaoTex, comb.equacao), B.aviso(t('respostas.entalpia.combustaoCompleta'))];
    if (!r.ok) return montar({ intent: 'ENTALPIA', resolvida: false, titulo, blocos: [...topo, B.aviso(t('respostas.entalpia.falta', { lista: listar(r.faltam.map(formulaUnicode)) })), ...blocos], acoes: acao, sugestoes: [sug('entalpiaHess')] });
    const porMol = r.dH / comb.coefComposto;
    const itens = [{ rotulo: t('respostas.entalpia.porMol', { nome }), valor: fmt(porMol, { sig: 6 }), unidade: 'kJ/mol', destaque: true }];
    if (comb.coefComposto !== 1) itens.push({ rotulo: t('respostas.entalpia.resultado'), valor: fmt(r.dH, { sig: 6 }), unidade: 'kJ' });
    const passosAmostra = [];
    if (quantidade) {
      let mol = null;
      try {
        const u = acharUnidade(this.ctx.unidades, quantidade.unidade)[0];
        if (u?.grupo === 'quantidade') mol = paraBase(this.ctx.unidades, quantidade.unidade, 'quantidade', quantidade.valor);
        else if (u?.grupo === 'massa') {
          const M = somaMassaMolar(parseFormula(formula, { simbolos: this.ctx.simbolos }), this.ctx.massaDe);
          if (!M.faltando.length) mol = (paraBase(this.ctx.unidades, quantidade.unidade, 'massa', quantidade.valor) * 1000) / M.total;
        }
      } catch { mol = null; }
      if (mol != null && Number.isFinite(mol)) {
        const { q } = calorDaAmostra({ dH: r.dH, coefComposto: comb.coefComposto, mol });
        itens.push({ rotulo: t('respostas.entalpia.amostra', { valor: fmt(quantidade.valor, { sig: 6 }), unidade: quantidade.unidade, nome }), valor: fmt(q, { sig: 6 }), unidade: 'kJ', destaque: true });
        passosAmostra.push({ texto: t('respostas.entalpia.passoAmostra', { mol: fmt(mol, { sig: 6 }) }), tex: `q = \\dfrac{n}{${comb.coefComposto}} \\times \\Delta H^{\\circ} = \\dfrac{${fmtTex(mol, { sig: 6 })}}{${comb.coefComposto}} \\times (${fmtTex(r.dH, { sig: 6 })}) = ${fmtTex(q, { sig: 6 })}\\ \\mathrm{kJ}` });
      } else blocos.push(B.aviso(t('respostas.entalpia.semMol')));
    }
    if (passosAmostra.length) blocos.push(B.passos(t('respostas.entalpia.tituloAmostra'), passosAmostra, [fonteCalculo(), this.fonteRegra('entalpiaCalculo')]));
    return montar({
      intent: 'ENTALPIA', titulo,
      blocos: [...topo, B.resultado(null, itens, this.fonteRegra('entalpiaCalculo')), ...blocos, B.aviso(t(r.exotermica ? 'respostas.entalpia.exotermica' : 'respostas.entalpia.endotermica'))],
      acoes: acao, sugestoes: [sug('entalpiaHess')], extra: { dH: r.dH, dHporMol: porMol }
    });
  }

  /** Resposta da calculadora de Hess: equação alvo + equações com ΔH. */
  respostaHess(alvo, equacoes) {
    const r = combinarHess(alvo, equacoes, { simbolos: this.ctx.simbolos });
    if (!r.ok) {
      const msg = r.erro === 'alvo' ? t('respostas.entalpia.hessAlvo', { msg: r.mensagem ?? t('respostas.equacaoErros.semSeta') })
        : r.erro === 'equacao' ? t('respostas.entalpia.hessEquacao', { n: String(r.indice + 1), msg: r.mensagem ?? t('respostas.equacaoErros.semSeta') })
          : t(`respostas.entalpia.${r.erro}`, { n: String((r.indice ?? 0) + 1) });
      return montar({ intent: 'ENTALPIA', resolvida: false, titulo: t('respostas.entalpia.naoConsegui'), blocos: [B.aviso(msg, this.fonteRegra('entalpiaCalculo'))] });
    }
    const passos = r.passos.map((x) => ({
      texto: t(x.invertida ? 'respostas.entalpia.hessInvertida' : 'respostas.entalpia.hessPasso', { n: String(x.indice + 1), fator: textoFrac(x.invertida ? x.fator.neg() : x.fator), dH: fmt(x.dH, { sig: 6 }) }),
      tex: `${texFrac(x.fator)} \\times (${fmtTex(equacoes[x.indice].dH, { sig: 6 })}) = ${fmtTex(x.dH, { sig: 6 })}\\ \\mathrm{kJ}`
    }));
    passos.push({ texto: t('respostas.entalpia.hessSoma'), tex: `\\Delta H = ${r.passos.map((x) => `(${fmtTex(x.dH, { sig: 6 })})`).join(' + ')} = ${fmtTex(r.dH, { sig: 6 })}\\ \\mathrm{kJ}`, destaque: true });
    return montar({
      intent: 'ENTALPIA', titulo: t('respostas.entalpia.tituloHessResultado'),
      blocos: [
        B.resultado(null, [{ rotulo: t('respostas.entalpia.hessResultado'), valor: fmt(r.dH, { sig: 6 }), unidade: 'kJ', destaque: true }], this.fonteRegra('entalpiaCalculo')),
        B.passos(t('respostas.blocos.passoAPasso'), passos, this.fonteRegra('entalpiaCalculo')),
        B.aviso(t(r.exotermica ? 'respostas.entalpia.exotermica' : 'respostas.entalpia.endotermica'))
      ],
      extra: { dH: r.dH }
    });
  }

  /** Resposta da calculadora por formação (equação digitada). */
  async respostaFormacao(equacao) { return this.respostaEntalpiaReacao(equacao); }

  // ------------------------------------------------------------------------------------------------ conceitos (trechos licenciados)
  async conceito(p) {
    const termos = termosDeBusca(p.conceito || p.textoOriginal, this.dic.lex);
    const chave = normalizar(p.conceito || '');
    const idioma = this.idioma;
    const corpoDe = (x) => x.textoPt ?? x.textoOriginal ?? ''; // em pt-BR a tradução; nos outros idiomas o texto do artigo (textoPt é null)
    const pontuar = (textos) => textos.map((x) => {
      const kws = (x.palavrasChave ?? []).map(normalizar);
      const titulo = normalizar(x.titulo ?? '');
      const corpo = normalizar(x._idioma === 'pt-BR' ? corpoDe(x) : x.textoOriginal ?? x.textoPt ?? '');
      let s = 0;
      let cobertos = 0;
      if (chave && kws.includes(chave)) s += 6;
      if (chave && titulo === chave) s += 6;
      for (const termo of termos) {
        let achou = false;
        if (kws.some((k) => k === termo || k.split(' ').includes(termo))) { s += 3; achou = true; }
        if (titulo.split(' ').includes(termo)) { s += 2; achou = true; }
        if (corpo.split(' ').includes(termo)) { s += 1; achou = true; }
        if (achou) cobertos++;
      }
      // texto em outro idioma só entra se for o único jeito de responder (a interface está no idioma ativo)
      return { t: x, s: x._idioma === idioma ? s : s - 1, cobertura: termos.length ? cobertos / termos.length : 0 };
    }).filter((x) => x.s >= 3 && x.cobertura >= 0.6).sort((a, b) => b.s - a.s).slice(0, 2);
    // primeiro só os lotes/arquivos cujo nome combina com a pergunta, no idioma ativo; depois com as reservas (inglês, português); se nada servir, todos
    let pontuados = pontuar(await this.store.textos(termos, { idioma }));
    if (!pontuados.length) pontuados = pontuar(await this.store.textos(termos, { idioma, reserva: true }));
    if (!pontuados.length) pontuados = pontuar(await this.store.textos(null, { idioma, reserva: true }));
    if (!pontuados.length) {
      return montar({
        intent: 'CONCEITO', resolvida: false, titulo: t('respostas.conceito.semTexto'),
        blocos: [B.texto(t('respostas.conceito.naoEncontrei', { termo: p.conceito || p.textoOriginal }))],
        sugestoes: sugestoesPadrao().slice(0, 4)
      });
    }
    const blocos = pontuados.map(({ t: x }) => {
      const emPt = x._idioma === 'pt-BR';
      const automatica = emPt && /autom[aá]tic/i.test(x.traducao ?? '') && !/sem tradu/i.test(x.traducao ?? '') && !!x.textoPt;
      const textoBase = emPt ? (x.textoPt || x.textoOriginal || '') : (x.textoOriginal || x.textoPt || '');
      // trecho em pt-BR cujo original é inglês e ainda sem tradução
      const idiomaDoTexto = emPt && !x.textoPt && /pendente/i.test(x.traducao ?? '') ? 'en' : x._idioma;
      const corte = cortarEmFrase(textoBase, 900);
      const aviso = idiomaDoTexto !== idioma ? t('respostas.fontes.trechoEm', { idioma: nomeDoIdioma(idiomaDoTexto) }) : automatica && idioma === 'pt-BR' ? t('respostas.conceito.traducaoAutomatica') : null;
      return {
        tipo: 'citacao', texto: corte.texto, truncado: corte.truncado, idiomaTexto: idiomaDoTexto,
        aviso,
        fonte: { nome: `${x.fonte}${x.titulo ? `: ${x.titulo}` : ''}`, url: urlSegura(x.url) ?? undefined, licenca: x.licenca }
      };
    });
    return montar({
      intent: 'CONCEITO', titulo: capitalizar(pontuados[0].t.titulo ?? p.conceito ?? t('respostas.conceito.padrao')), blocos,
      acoes: [], sugestoes: [sug('molsAgua'), sug('phHcl')]
    });
  }
}

const formatarFormulaTexto = (f) => (tentarFormula(f) ? formulaUnicode(f) : f);

/** Carga como texto: "+1", "−2", "0". */
const textoCarga = (q) => (q === 0 ? '0' : `${q > 0 ? '+' : '−'}${Math.abs(q)}`);
/** NOX (Frac) em TeX: "+6", "-2", "-\frac{8}{3}". */
function texNox(f) {
  if (f.zero) return '0';
  const sinal = f.sinal() > 0 ? '+' : '-';
  const a = f.sinal() < 0 ? f.neg() : f;
  return a.inteiro ? `${sinal}${a.n}` : `${sinal}\\frac{${a.n}}{${a.d}}`;
}
/** Fração (Frac) como texto ("1/2", "2") e em TeX (com sinal). */
const textoFrac = (f) => f.toString().replace('-', '−');
function texFrac(f) {
  const sinal = f.sinal() < 0 ? '-' : '';
  const a = f.sinal() < 0 ? f.neg() : f;
  return a.inteiro ? `${sinal}${a.n}` : `${sinal}\\frac{${a.n}}{${a.d}}`;
}

function cortarEmFrase(texto, max) {
  const x = String(texto).replace(/\s+/g, ' ').trim();
  if (x.length <= max) return { texto: x, truncado: false };
  const corte = x.lastIndexOf('. ', max);
  return { texto: `${x.slice(0, corte > max * 0.5 ? corte + 1 : max).trim()}${corte > max * 0.5 ? '' : '…'}`, truncado: true };
}

/** Data do pacote no formato do idioma ativo, para a linha "origem + data dos dados" da interface. */
export const dataDoPacote = (store) => fmtData(store?.manifest?.generatedAt);
