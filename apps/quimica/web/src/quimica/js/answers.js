// Respostas montadas SÓ dos dados do pacote assinado e de cálculos locais testados. Cada bloco traz a fonte; nada vem do modelo (origem 'LOCAL').
// Todo texto passa pelo catálogo do idioma ativo (`t()`, docs/I18N.md §3); a tradução nunca introduz números: cada número vem do pacote ou do cálculo.
// Formato de uma resposta: { intent, resolvida, origem, titulo, blocos[], directAnswer, fontes[], acoes[], sugestoes[], ... } (ver `montar`).
import { balancear } from './calc/balancear.js';
import { calcularConcentracao } from './calc/concentracao.js';
import { calcularEstequiometria, converterQuantidade } from './calc/estequiometria.js';
import { calcularBoyle, calcularGas } from './calc/gas.js';
import { calcularMassaMolar } from './calc/massa.js';
import { calcularPH } from './calc/ph.js';
import { acharUnidade, converter, paraBase } from './calc/unidades.js';
import { chaveFormula, formulaUnicode, tentarFormula } from './calc/formula.js';
import { respostaRecusa } from './seguranca.js';
import { fmt, fmtTex } from './formato.js';
import { fmtData, idiomaAtual, nomeDoIdioma, t, tl } from './i18n/index.js';
import { ligarQuantidades, termosDeBusca } from './nlu.js';
import { exibirNome, minusNoMeio, nomeComposto as infoNomeComposto, nomeElemento as infoNomeElemento } from './nomes.js';
import { descreverGhs, urlSegura } from './perigos.js';
import { categoriaPlural, categoriaRotulo, classeRotulo, estadoChave, estadoRotulo, formatarValor, valorBruto } from './propriedades.js';
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
const fonteDe = (f) => (typeof f === 'string' ? { nome: f } : f && typeof f === 'object' ? { nome: f.nome ?? t('respostas.fontes.pacote'), url: f.url, licenca: f.licenca } : fonteApp());
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
    if (c.smiles) blocos.push(B.molecula(c.smiles, nome, fonte));
    const g = descreverGhs(c.ghs, this.store.regras);
    if (g) blocos.push({ tipo: 'ghs', titulo: t('respostas.composto.perigosGhs'), ...g, fonte: dado(c.ghs.fonte ? { nome: c.ghs.fonte } : fonte, this.fonteFrases()) });
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
  async propriedade(p) {
    const ids = p.propriedades?.length ? p.propriedades : p.propriedade ? [p.propriedade] : [];
    const { compostos, elementos } = await this.entidades(p);
    if (!ids.length || (!compostos.length && !elementos.length)) {
      return montar({
        intent: 'PROPRIEDADE', resolvida: false, titulo: t('respostas.propriedade.deQual'),
        blocos: [B.texto(ids.length ? t('respostas.propriedade.digaQualElemento', { props: listar(ids.map((i) => this.dic.propPorId.get(i)?.rotulo ?? i)) }) : t('respostas.propriedade.digaQualPropriedade'))],
        sugestoes: [sug('fusaoFerro'), sug('massaMolarAgua')]
      });
    }
    const linhas = [];
    const ausentes = [];
    const fontes = [];
    const nomeDe = (reg, alvo) => (alvo === 'composto' ? this.nomeComposto(reg) : this.nomeElemento(reg));
    for (const id of ids) {
      const prop = this.dic.propPorId.get(id);
      if (!prop) continue;
      const alvos = prop.alvo === 'composto' ? compostos : elementos;
      for (const reg of alvos) {
        const nome = nomeDe(reg, prop.alvo);
        let f = formatarValor(prop, valorBruto(prop, reg), this.ctx);
        if (f && prop.id === 'formula') f = { texto: formulaUnicode(String(valorBruto(prop, reg))) };
        if (f) { linhas.push({ rotulo: t('respostas.propriedade.de', { prop: capitalizar(prop.rotulo), nome }), valor: f.texto }); fontes.push(dado(reg.fontes?.[0])[0]); }
        else ausentes.push(t('respostas.propriedade.de', { prop: prop.rotulo, nome }));
      }
      // propriedade de elemento perguntada para um composto (ou o contrário)
      const outros = prop.alvo === 'composto' ? elementos : compostos;
      if (!alvos.length && outros.length) ausentes.push(t('respostas.propriedade.outroTipo', { prop: prop.rotulo, alvo: prop.alvo, outros: outros.map((o) => nomeDe(o, prop.alvo === 'composto' ? 'elemento' : 'composto')).join(', '), n: outros.length }));
    }
    const blocos = [];
    if (linhas.length) blocos.push(B.kv(null, linhas, fontes.filter(Boolean).length ? fontes.filter(Boolean) : fonteApp()));
    if (ausentes.length) blocos.push(B.aviso(t('respostas.propriedade.naoTem', { lista: ausentes.join('; ') })));
    const primeiro = elementos[0] ?? compostos[0];
    const acoes = elementos[0] && ids.some((i) => this.dic.propPorId.get(i)?.alvo === 'elemento')
      ? [rota(this.rotaElemento(elementos[0].simbolo), t('respostas.propriedade.fichaDe', { nome: this.nomeElemento(elementos[0]) }))]
      : compostos[0] ? [rota(this.rotaComposto(compostos[0].cid), t('respostas.propriedade.fichaDe', { nome: this.nomeComposto(compostos[0]) }))] : [];
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
    const mol = p.quantidades.find((x) => x.unidade && acharUnidade(this.ctx.unidades, x.unidade).some((u) => u.grupo === 'quantidade'));
    const vm = this.ctx.volumeMolarCNTP();
    if (mol && vm && this.dic.lex.pistas.cntp.test(normalizar(p.textoOriginal))) {
      const nMol = paraBase(this.ctx.unidades, mol.unidade, 'quantidade', mol.valor);
      const L = nMol * vm.valor * 1000;
      return montar({
        intent: 'ESTEQUIOMETRIA', titulo: t('respostas.estequiometria.volumeTitulo', { valor: fmt(mol.valor, { sig: 6 }), unidade: mol.unidade }),
        blocos: [
          B.resultado(null, [{ rotulo: t('respostas.estequiometria.volumeCntp'), valor: fmt(L, { sig: 6 }), unidade: 'L', destaque: true }, { rotulo: t('respostas.estequiometria.volumeMolar'), valor: fmt(vm.valor * 1000, { sig: 6 }), unidade: 'L/mol' }], { nome: t('respostas.fontes.constanteR') }),
          B.passos(t('respostas.blocos.comoCalcular'), [{ texto: t('respostas.estequiometria.passoVolume'), tex: `V = n\\dfrac{RT}{P} = ${fmtTex(nMol, { sig: 6 })} \\times ${fmtTex(vm.valor * 1000, { sig: 6 })}\\ \\mathrm{L/mol} = ${fmtTex(L, { sig: 6 })}\\ \\mathrm{L}` }])
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
    else if (regra) entrada = { tipo: regra.tipo === 'acido' ? 'acido-forte' : 'base-forte', C, n: regra.n ?? 1 };
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
    return montar({
      intent: 'CONVERSAO_UNIDADE', titulo: `${fmt(r.valor, { sig: 8 })} ${r.de} = ${fmt(r.resultado, { sig: 8 })} ${r.para}`,
      blocos: [B.resultado(null, [{ rotulo: t('respostas.conversao.em', { valor: fmt(r.valor, { sig: 8 }), de: r.de, para: r.para }), valor: fmt(r.resultado, { sig: 8 }), unidade: r.para, destaque: true }], fonteTabela), B.passos(t('respostas.blocos.comoConverter'), r.passos, fonteTabela)],
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
      return montar({
        intent: 'COMPARAR', titulo: t('respostas.comparar.titulo', { nomes: listar(nomes) }),
        blocos: [B.tabela(null, [t('respostas.comparar.propriedade'), ...elementos.map((e, i) => `${nomes[i]} (${e.simbolo})`)], linhas, dado(...elementos.map((e) => e.fontes?.[0]))[0] ?? fonteApp())],
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
      return montar({
        intent: 'COMPARAR', titulo: t('respostas.comparar.titulo', { nomes: listar(compostos.map((c) => this.nomeComposto(c))) }),
        blocos: [B.tabela(null, ['', ...compostos.map((c) => this.nomeComposto(c))], linhas, dado(...compostos.map((c) => c.fontes?.[0]))[0] ?? fonteApp())],
        acoes: compostos.map((c) => rota(this.rotaComposto(c.cid), t('respostas.comparar.fichaDe', { nome: this.nomeComposto(c) }))), sugestoes: []
      });
    }
    return montar({
      intent: 'COMPARAR', resolvida: false, titulo: t('respostas.comparar.tituloGeral'),
      blocos: [B.texto(t('respostas.comparar.explicacao'))],
      sugestoes: [sug('compareNaCl')]
    });
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
    return { tipo: 'ghs', titulo: t('respostas.seguranca.perigosDe', { nome }), ...g, fonte: dado(c.ghs.fonte ? { nome: c.ghs.fonte } : fonteC, this.fonteFrases()) };
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

function cortarEmFrase(texto, max) {
  const x = String(texto).replace(/\s+/g, ' ').trim();
  if (x.length <= max) return { texto: x, truncado: false };
  const corte = x.lastIndexOf('. ', max);
  return { texto: `${x.slice(0, corte > max * 0.5 ? corte + 1 : max).trim()}${corte > max * 0.5 ? '' : '…'}`, truncado: true };
}

/** Data do pacote no formato do idioma ativo, para a linha "origem + data dos dados" da interface. */
export const dataDoPacote = (store) => fmtData(store?.manifest?.generatedAt);
