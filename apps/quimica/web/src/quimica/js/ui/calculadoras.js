// Calculadoras com passo a passo (KaTeX): massa molar, balanceamento, estequiometria, concentração, pH, gás ideal, unidades, entalpia (formação e Hess),
// configuração eletrônica, NOX, equilíbrio (Kc e Kp) e tipo de ligação.
// Todos os cálculos são determinísticos e rodam no aparelho (js/calc/); os números das constantes e massas vêm do pacote de dados. Rótulos pelo catálogo.
import { balancear, lerEquacao } from '../calc/balancear.js';
import { calcularConcentracao, modosConcentracao } from '../calc/concentracao.js';
import { calcularEstequiometria, converterQuantidade } from '../calc/estequiometria.js';
import { calcularGas } from '../calc/gas.js';
import { formulaUnicode } from '../calc/formula.js';
import { calcularMassaMolar } from '../calc/massa.js';
import { calcularPH, tiposPh } from '../calc/ph.js';
import { converter } from '../calc/unidades.js';
import { buscarCompostos } from '../busca.js';
import { h, icon } from '../dom.js';
import { fmt, lerNumero } from '../formato.js';
import { idiomaAtual, t, tl } from '../i18n/index.js';
import { mathEl } from '../math.js';
import { nomeCompostoExibicao } from '../nomes.js';
import { nomeUnidade } from '../propriedades.js';
import { blocoEl, chip, erroEl, fonteEl, formulaEl, linkRota, passosEl, resultadosEl, tabelaEl } from './componentes.js';
import { AnswerBuilder } from '../answers.js';
import { Dicionario } from '../dicionario.js';
import { lerConcentracoes } from '../nlu.js';
import { lexico } from '../nlu/lex/index.js';

const C = (chave, params) => t(`ui.calculadoras.${chave}`, params);

// ------------------------------------------------------------------------------------------------ construtores de campos
let _n = 0;
const nid = (p) => `${p}-${++_n}`;

function campo({ rotulo, valor = '', placeholder = '', ajuda = '', inputmode = 'text', tipo = 'text' }) {
  const id = nid('c');
  const input = h('input', { id, class: 'campo', type: tipo, value: valor, placeholder, inputmode, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-describedby': ajuda ? `${id}-aj` : null });
  const raiz = h('div', null, h('label', { class: 'rotulo-campo', for: id }, rotulo), input, ajuda ? h('div', { class: 'ajuda-campo', id: `${id}-aj` }, ajuda) : null);
  return { raiz, input, valor: () => input.value.trim(), numero: () => lerNumero(input.value) };
}

function selecao({ rotulo, opcoes, valor }) {
  const id = nid('s');
  const sel = h('select', { id, class: 'campo' }, opcoes.map(([v, r]) => h('option', { value: v, selected: String(v) === String(valor) }, r)));
  const raiz = h('div', null, h('label', { class: 'rotulo-campo', for: id }, rotulo), sel);
  return { raiz, select: sel, valor: () => sel.value };
}

/** Campo numérico + seletor de unidade lado a lado. */
function valorUnidade({ rotulo, unidades, padrao, valor = '', ajuda = '' }) {
  const idV = nid('v');
  const idU = nid('u');
  const input = h('input', { id: idV, class: 'campo', type: 'text', inputmode: 'decimal', value: valor, autocomplete: 'off', 'aria-describedby': ajuda ? `${idV}-aj` : null });
  const sel = h('select', { id: idU, class: 'campo', 'aria-label': C('unidadeDe', { rotulo: rotulo.toLowerCase() }) }, unidades.map((u) => h('option', { value: u, selected: u === padrao }, u)));
  const raiz = h('div', null, h('label', { class: 'rotulo-campo', for: idV }, rotulo), h('div', { class: 'campos-linha' }, input, sel), ajuda ? h('div', { class: 'ajuda-campo', id: `${idV}-aj` }, ajuda) : null);
  return { raiz, input, select: sel, numero: () => lerNumero(input.value), vazio: () => input.value.trim() === '', unidade: () => sel.value, dado: () => ({ valor: lerNumero(input.value), unidade: sel.value }) };
}

function unidadesDe(ctx, grupo, preferidas) {
  const todas = (ctx.unidades.grupos[grupo]?.itens ?? []).map((i) => i.simbolo);
  const certas = preferidas.filter((u) => todas.includes(u) || u === 'g/L');
  return certas.length ? certas : todas;
}

function exemplos(lista, aoEscolher) {
  return h('div', { class: 'chips exemplos', role: 'group', 'aria-label': C('exemplosAria') }, lista.map((e) => chip({ rotulo: e, icone: false, onClick: () => aoEscolher(e) })));
}

// ------------------------------------------------------------------------------------------------ resultado
function resultadoEl(r, topo = null) {
  if (!r.ok) return erroEl(r.erro);
  return h('section', { class: 'res-calc', tabindex: '-1', 'aria-label': C('resultadoAria') },
    topo,
    r.resultados?.length ? resultadosEl(r.resultados) : null,
    r.tabela && r.tabela.length ? tabelaEstequio(r) : null,
    r.passos?.length ? h('details', { open: true }, h('summary', { class: 'bloco-tit' }, C('passoAPasso')), passosEl(r.passos)) : null,
    r.notas?.length ? h('ul', { class: 'notas lista-pontos' }, r.notas.map((n) => h('li', null, n))) : null,
    r.fontes?.length ? fonteEl(r.fontes.map((f) => (typeof f === 'string' ? { nome: f } : f))) : null);
}

function tabelaEstequio(r) {
  const fm = (x) => (x == null ? '—' : fmt(x, { sig: 6 }));
  const E = (k) => C(`estequiometria.${k}`);
  return h('details', { open: true }, h('summary', { class: 'bloco-tit' }, E('tabelaTitulo')), tabelaEl({
    legenda: E('tabelaLegenda'),
    cabecalho: tl('ui.calculadoras.estequiometria.cabecalho'),
    linhas: r.tabela.map((x) => [formulaUnicode(x.formula), x.lado === 'produto' ? E('produto') : x.limitante ? E('limitante') : E('reagente'), String(x.coef), fm(x.massaMolar),
      fm(x.lado === 'produto' ? x.formadoMol : x.inicialMol ?? x.necessarioMol), fm(x.lado === 'produto' ? x.formadoG : (x.inicialMol != null ? x.inicialMol * x.massaMolar : x.necessarioG)),
      x.lado === 'produto' ? fm(x.particulas) : '—', x.lado === 'produto' ? fm(x.volumeL) : '—'])
  }));
}

// ------------------------------------------------------------------------------------------------ definição das calculadoras
function calcMassaMolar({ ctx, store, query, mostrar }) {
  const M = (k, p) => C(`massaMolar.${k}`, p);
  const f = campo({ rotulo: M('formula'), valor: query.get('f') ?? '', placeholder: M('placeholder'), ajuda: M('ajuda') });
  const executar = async () => {
    const r = calcularMassaMolar(f.valor(), ctx);
    let topo = null;
    if (r.ok) {
      const comp = buscarCompostos(store.indice.entradas, r.formula, 3).find((c) => c.motivo === 'fórmula');
      const reg = comp ? await store.composto(comp.cid).catch(() => null) : null;
      topo = h('p', null, formulaEl(r.formula, { grande: true }), comp ? [' — ', linkRota(`/quimica/composto/${comp.cid}`, M('fichaDe', { nome: nomeCompostoExibicao(reg ?? comp) || t('ui.compostos.cid', { cid: comp.cid }) }))] : null);
    }
    mostrar(resultadoEl(r, topo));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, f.raiz,
    exemplos(['H2O', 'Ca(OH)2', 'CuSO4·5H2O', 'C6H12O6', 'Fe2(SO4)3'], (e) => { f.input.value = e; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, M('calcular'))));
  return { form, autoexecutar: !!f.valor(), executar };
}

function calcBalanceamento({ ctx, query, mostrar }) {
  const Bq = (k) => C(`balanceamento.${k}`);
  const eq = campo({ rotulo: Bq('equacao'), valor: query.get('eq') ?? '', placeholder: Bq('placeholder'), ajuda: Bq('ajuda') });
  const executar = () => {
    const r = balancear(eq.valor(), { simbolos: ctx.simbolos });
    if (!r.ok) { mostrar(erroEl(r.erro)); return; }
    mostrar(h('section', { class: 'res-calc', tabindex: '-1', 'aria-label': C('resultadoAria') },
      h('div', { class: 'equacao-final' }, mathEl(r.equacaoTex), h('span', { class: 'sr-only' }, r.equacao)),
      h('details', { open: true }, h('summary', { class: 'bloco-tit' }, C('passoAPasso')), passosEl(r.passos.slice(0, -1))),
      h('div', { class: 'tabela-rolagem' }, tabelaEl({ legenda: Bq('conferencia'), cabecalho: [Bq('elemento'), Bq('reagentes'), Bq('produtos'), Bq('igual')], linhas: r.verificacao.map((v) => [v.elemento === 'carga' ? Bq('carga') : v.elemento, String(v.esquerda), String(v.direita), v.ok ? Bq('sim') : Bq('nao')]) })),
      r.digitouCoeficientes ? h('p', { class: 'notas' }, Bq('coeficientesIgnorados')) : null));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, eq.raiz,
    exemplos(['Fe + O2 -> Fe2O3', 'C8H18 + O2 -> CO2 + H2O', 'Al + HCl -> AlCl3 + H2', 'Zn + Cu2+ -> Zn2+ + Cu', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2'], (e) => { eq.input.value = e; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, Bq('balancear'))));
  return { form, autoexecutar: !!eq.valor(), executar };
}

function calcEstequiometria({ ctx, query, mostrar }) {
  const E = (k, p) => C(`estequiometria.${k}`, p);
  const PART = E('particulas');
  const UNID_QTD = ['g', 'mg', 'kg', 'mol', 'mmol', 'L', 'mL', PART];
  const normalizarU = (u) => (u === PART ? 'particulas' : u);
  const modo = selecao({ rotulo: E('modo'), opcoes: [['conv', E('conv')], ['reacao', E('reacao')]], valor: query.get('eq') ? 'reacao' : 'conv' });
  const area = h('div');
  let estadoLinhas = new Map();

  function montarConv() {
    const f = campo({ rotulo: E('substancia'), valor: query.get('f') ?? '', placeholder: E('placeholderSubstancia') });
    const uQ = query.get('u') === 'particulas' ? PART : query.get('u');
    const q = valorUnidade({ rotulo: E('quantidade'), unidades: UNID_QTD, padrao: UNID_QTD.includes(uQ) ? uQ : 'g', valor: query.get('v') ?? '', ajuda: E('ajudaQuantidade') });
    area.replaceChildren(f.raiz, q.raiz);
    return () => mostrar(resultadoEl(converterQuantidade({ formula: f.valor(), valor: q.numero(), unidade: normalizarU(q.unidade()) }, ctx)));
  }

  function montarReacao() {
    const eq = campo({ rotulo: E('equacao'), valor: query.get('eq') ?? '', placeholder: E('placeholderEquacao'), ajuda: E('ajudaEquacao') });
    const linhas = h('div', { class: 'grade-campos' });
    const rend = campo({ rotulo: E('rendimento'), valor: '100', inputmode: 'decimal', ajuda: E('ajudaRendimento') });
    let especies = [];
    function atualizarLinhas() {
      let lidas = [];
      try { const e = lerEquacao(eq.valor(), { simbolos: ctx.simbolos }); lidas = [...e.reagentes, ...e.produtos].filter((s) => !s.eletron); } catch { lidas = []; }
      especies = lidas.map((s) => ({ formula: s.corpo, vu: estadoLinhas.get(s.corpo) ?? valorUnidade({ rotulo: E('quantidadeDe', { formula: formulaUnicode(s.corpo) }), unidades: UNID_QTD, padrao: 'g' }) }));
      for (const s of especies) estadoLinhas.set(s.formula, s.vu);
      linhas.replaceChildren(...especies.map((s) => s.vu.raiz));
    }
    eq.input.addEventListener('input', atualizarLinhas);
    area.replaceChildren(eq.raiz, linhas, rend.raiz);
    atualizarLinhas();
    return () => {
      const dados = especies.filter((s) => !s.vu.vazio()).map((s) => ({ especie: s.formula, valor: s.vu.numero(), unidade: normalizarU(s.vu.unidade()) }));
      const rr = rend.valor() === '' ? 100 : lerNumero(rend.valor());
      mostrar(resultadoEl(calcularEstequiometria({ equacao: eq.valor(), dados, rendimento: rr }, ctx), null));
    };
  }

  let executarAtual = null;
  function trocar() { estadoLinhas = new Map(); executarAtual = modo.valor() === 'reacao' ? montarReacao() : montarConv(); mostrar(null); }
  modo.select.addEventListener('change', trocar);
  trocar();
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executarAtual(); } }, modo.raiz, area,
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, E('calcular'))));
  return { form, autoexecutar: !!(query.get('f') && query.get('v')), executar: () => executarAtual() };
}

function calcConcentracao({ ctx, mostrar }) {
  const K = (k) => C(`concentracao.${k}`);
  const MASSA = unidadesDe(ctx, 'massa', ['g', 'mg', 'kg']);
  const VOL = unidadesDe(ctx, 'volume', ['L', 'mL']);
  const modo = selecao({ rotulo: K('tipo'), opcoes: modosConcentracao().map((m) => [m.id, m.rotulo]), valor: 'molaridade' });
  const area = h('div');
  let leitura = () => ({});
  function montar() {
    const m = modo.valor();
    if (m === 'molaridade') {
      const f = campo({ rotulo: K('soluto'), placeholder: K('exNaCl') }); const ms = valorUnidade({ rotulo: K('massaSoluto'), unidades: MASSA, padrao: 'g' }); const v = valorUnidade({ rotulo: K('volumeSolucao'), unidades: VOL, padrao: 'mL' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, f.raiz, ms.raiz, v.raiz)); leitura = () => ({ modo: m, formula: f.valor(), massa: ms.dado(), volume: v.dado() });
    } else if (m === 'massa') {
      const f = campo({ rotulo: K('soluto'), placeholder: K('exNaOH') }); const c = valorUnidade({ rotulo: K('concentracaoDesejada'), unidades: ['mol/L', 'mmol/L', 'g/L'], padrao: 'mol/L' }); const v = valorUnidade({ rotulo: K('volumeSolucao'), unidades: VOL, padrao: 'mL' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, f.raiz, c.raiz, v.raiz)); leitura = () => ({ modo: m, formula: f.valor(), concentracao: c.dado(), volume: v.dado() });
    } else if (m === 'gl-mol') {
      const f = campo({ rotulo: K('soluto'), placeholder: K('exNaCl') }); const c = campo({ rotulo: K('valorConcentracao'), inputmode: 'decimal' }); const d = selecao({ rotulo: K('converter'), opcoes: [['g/L', K('glParaMol')], ['mol/L', K('molParaGl')]], valor: 'g/L' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, f.raiz, c.raiz, d.raiz)); leitura = () => ({ modo: m, formula: f.valor(), valor: c.numero(), de: d.valor() });
    } else if (m === 'percentual-mm') {
      const a = valorUnidade({ rotulo: K('massaSoluto'), unidades: MASSA, padrao: 'g' }); const b = valorUnidade({ rotulo: K('massaSolucao'), unidades: MASSA, padrao: 'g' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, a.raiz, b.raiz)); leitura = () => ({ modo: m, soluto: a.dado(), solucao: b.dado() });
    } else if (m === 'percentual-mv') {
      const a = valorUnidade({ rotulo: K('massaSoluto'), unidades: MASSA, padrao: 'g' }); const v = valorUnidade({ rotulo: K('volumeSolucao'), unidades: VOL, padrao: 'mL' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, a.raiz, v.raiz)); leitura = () => ({ modo: m, soluto: a.dado(), volume: v.dado() });
    } else {
      const uc = selecao({ rotulo: K('unidadeConcentracao'), opcoes: [['mol/L', 'mol/L'], ['mmol/L', 'mmol/L'], ['g/L', 'g/L'], ['%', '%']], valor: 'mol/L' }); const uv = selecao({ rotulo: K('unidadeVolume'), opcoes: VOL.map((u) => [u, u]), valor: 'mL' });
      const c1 = campo({ rotulo: K('c1'), inputmode: 'decimal' }); const v1 = campo({ rotulo: K('v1'), inputmode: 'decimal' });
      const c2 = campo({ rotulo: K('c2'), inputmode: 'decimal' }); const v2 = campo({ rotulo: K('v2'), inputmode: 'decimal' });
      area.replaceChildren(h('p', { class: 'ajuda-campo' }, K('deixeEmBranco')), h('div', { class: 'grade-campos' }, uc.raiz, uv.raiz, c1.raiz, v1.raiz, c2.raiz, v2.raiz));
      const val = (x) => (x.valor() === '' ? null : x.numero());
      leitura = () => ({ modo: 'diluicao', C1: val(c1), V1: val(v1), C2: val(c2), V2: val(v2), unidadeC: uc.valor(), unidadeV: uv.valor() });
    }
    mostrar(null);
  }
  modo.select.addEventListener('change', montar);
  montar();
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); mostrar(resultadoEl(calcularConcentracao(leitura(), ctx))); } }, modo.raiz, area,
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, K('calcular'))));
  return { form, autoexecutar: false };
}

function calcPH({ ctx, mostrar }) {
  const P = (k) => C(`ph.${k}`);
  const tipo = selecao({ rotulo: P('tipo'), opcoes: tiposPh().map((x) => [x.id, x.rotulo]), valor: 'acido-forte' });
  const area = h('div');
  let leitura = () => ({});
  function montar() {
    const tp = tipo.valor();
    if (tp === 'acido-forte' || tp === 'base-forte') {
      const c = campo({ rotulo: P('concentracao'), inputmode: 'decimal', placeholder: P('ex001') }); const n = campo({ rotulo: tp === 'acido-forte' ? P('hLiberados') : P('ohLiberados'), valor: '1', inputmode: 'numeric', ajuda: P('ajudaN') });
      area.replaceChildren(h('div', { class: 'grade-campos' }, c.raiz, n.raiz)); leitura = () => ({ tipo: tp, C: c.numero(), n: n.numero() });
    } else if (tp === 'acido-fraco' || tp === 'base-fraca') {
      const ac = tp === 'acido-fraco';
      const c = campo({ rotulo: P('concentracao'), inputmode: 'decimal', placeholder: P('ex01') });
      const k = campo({ rotulo: ac ? P('kaOuPka') : P('kbOuPkb'), inputmode: 'decimal', placeholder: P('exK'), ajuda: P('ajudaK') });
      const s = selecao({ rotulo: P('valorInformado'), opcoes: ac ? [['K', 'Ka'], ['pK', 'pKa']] : [['K', 'Kb'], ['pK', 'pKb']], valor: 'K' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, c.raiz, k.raiz, s.raiz));
      leitura = () => { const v = k.numero(); const e = { tipo: tp, C: c.numero() }; if (s.valor() === 'K') e[ac ? 'Ka' : 'Kb'] = v; else e[ac ? 'pKa' : 'pKb'] = v; return e; };
    } else {
      const q = selecao({ rotulo: P('valorConhecido'), opcoes: [['pH', 'pH'], ['pOH', 'pOH'], ['H', P('hMolL')], ['OH', P('ohMolL')]], valor: 'pH' }); const v = campo({ rotulo: P('valor'), inputmode: 'decimal' });
      area.replaceChildren(h('div', { class: 'grade-campos' }, q.raiz, v.raiz)); leitura = () => ({ tipo: 'converter', [q.valor()]: v.numero() });
    }
    mostrar(null);
  }
  tipo.select.addEventListener('change', montar);
  montar();
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); mostrar(resultadoEl(calcularPH(leitura(), ctx))); } }, tipo.raiz, area,
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, P('calcular'))));
  return { form, autoexecutar: false };
}

function calcGas({ ctx, mostrar }) {
  const G = (k) => C(`gas.${k}`);
  const alvo = selecao({ rotulo: G('calcular'), opcoes: [['V', G('volume')], ['P', G('pressao')], ['n', G('quantidade')], ['T', G('temperatura')]], valor: 'V' });
  const P = valorUnidade({ rotulo: G('pressao'), unidades: unidadesDe(ctx, 'pressao', ['atm', 'kPa', 'Pa', 'bar', 'mmHg']), padrao: 'atm' });
  const V = valorUnidade({ rotulo: G('volume'), unidades: unidadesDe(ctx, 'volume', ['L', 'mL', 'm3', 'cm3']), padrao: 'L' });
  const N = valorUnidade({ rotulo: G('quantidade'), unidades: unidadesDe(ctx, 'quantidade', ['mol', 'mmol']), padrao: 'mol' });
  const T = valorUnidade({ rotulo: G('temperatura'), unidades: unidadesDe(ctx, 'temperatura', ['K', '°C', '°F']), padrao: 'K' });
  const usarMassa = h('input', { type: 'checkbox', id: 'usar-massa' });
  const f = campo({ rotulo: G('formulaGas'), placeholder: G('exCO2') });
  const m = valorUnidade({ rotulo: G('massaGas'), unidades: unidadesDe(ctx, 'massa', ['g', 'mg', 'kg']), padrao: 'g' });
  const blocoMassa = h('div', { class: 'grade-campos', hidden: true }, f.raiz, m.raiz);
  const campos = { P, V, n: N, T };
  const nBloco = h('div', null, N.raiz);
  function atualizar() {
    const a = alvo.valor();
    for (const [k, c] of Object.entries(campos)) { c.input.disabled = k === a; c.select.disabled = k === a; if (k === a) c.input.value = ''; }
    const massa = usarMassa.checked && a !== 'n';
    blocoMassa.hidden = !massa;
    nBloco.hidden = massa;
    mostrar(null);
  }
  alvo.select.addEventListener('change', atualizar);
  usarMassa.addEventListener('change', atualizar);
  const executar = () => {
    const a = alvo.valor();
    const entrada = { resolver: a };
    for (const [k, c] of Object.entries(campos)) if (k !== a && !(k === 'n' && usarMassa.checked)) entrada[k] = c.dado();
    if (usarMassa.checked && a !== 'n') { entrada.massa = m.dado(); entrada.formula = f.valor(); }
    entrada.saida = campos[a].unidade();
    mostrar(resultadoEl(calcularGas(entrada, ctx), h('div', { class: 'equacao-final' }, mathEl('PV = nRT'))));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, alvo.raiz,
    h('div', { class: 'grade-campos' }, P.raiz, V.raiz, nBloco, T.raiz),
    h('div', { class: 'radio-linha' }, h('label', { class: 'radio', for: 'usar-massa' }, usarMassa, h('span', null, G('usarMassa')))),
    blocoMassa,
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, G('botao'))));
  atualizar();
  return { form, autoexecutar: false };
}

function calcUnidades({ ctx, mostrar }) {
  const U = (k, p) => C(`unidades.${k}`, p);
  const grupos = Object.entries(ctx.unidades.grupos).filter(([, g]) => g.itens.length > 1);
  const grandeza = selecao({ rotulo: U('grandeza'), opcoes: grupos.map(([g]) => [g, t('ui.calculadoras.unidades.grandezas')?.[g] ?? g]), valor: grupos.some(([g]) => g === 'pressao') ? 'pressao' : grupos[0]?.[0] });
  const valor = campo({ rotulo: U('valor'), inputmode: 'decimal', placeholder: U('ex5'), valor: '1' });
  const de = h('select', { id: 'u-de', class: 'campo' });
  const para = h('select', { id: 'u-para', class: 'campo' });
  function opcoes() {
    const g = ctx.unidades.grupos[grandeza.valor()];
    const itens = g?.itens ?? [];
    for (const [sel, pad] of [[de, 0], [para, 1]]) sel.replaceChildren(...itens.map((i, k) => h('option', { value: i.simbolo, selected: k === Math.min(pad, itens.length - 1) }, `${i.simbolo} — ${nomeUnidade(i.simbolo, i.nome)}`)));
    mostrar(null);
  }
  grandeza.select.addEventListener('change', opcoes);
  opcoes();
  const executar = () => {
    const r = converter(valor.numero(), de.value, para.value, ctx.unidades, grandeza.valor());
    if (!r.ok) { mostrar(erroEl(r.erro)); return; }
    mostrar(resultadoEl({ ok: true, resultados: [{ rotulo: U('equivaleA', { valor: fmt(r.valor, { sig: 10 }), de: r.de }), valor: fmt(r.resultado, { sig: 10 }), unidade: r.para, destaque: true }], passos: r.passos, notas: [], fontes: [{ nome: t('respostas.fontes.tabelaUnidades', { origem: t(`respostas.unidades.origem.${r.origemChave ?? 'padrao'}`) }) }] }));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, grandeza.raiz,
    h('div', { class: 'grade-campos' }, valor.raiz, h('div', null, h('label', { class: 'rotulo-campo', for: 'u-de' }, U('de')), de), h('div', null, h('label', { class: 'rotulo-campo', for: 'u-para' }, U('para')), para)),
    h('div', { class: 'form-acoes' },
      h('button', { class: 'btn btn-primario', type: 'submit' }, U('converter')),
      h('button', { class: 'btn btn-contorno', type: 'button', onClick: () => { const a = de.value; de.value = para.value; para.value = a; executar(); } }, icon('swap', 16), U('inverter'))));
  return { form, autoexecutar: false };
}

// ------------------------------------------------------------------------------------------------ calculadoras novas (17/10/2026)
// Entalpia (formação e Hess), configuração eletrônica, NOX, Kc/Kp e tipo de ligação (docs/CALCULADORAS_2026-10-17.md §2 e §4). O cálculo é o
// de js/calc/ e o texto é o mesmo das respostas do assistente (AnswerBuilder.resposta*), renderizado bloco a bloco.
const construtores = new WeakMap();
function construtor(store) {
  const idioma = idiomaAtual();
  const atual = construtores.get(store);
  if (atual && atual.idioma === idioma && atual.rev === store.rev) return atual.ab;
  const ab = new AnswerBuilder({ store, dic: new Dicionario(store, idioma) });
  construtores.set(store, { ab, idioma, rev: store.rev });
  return ab;
}

/** Resposta do construtor (título + blocos com fonte) como resultado da calculadora. */
function respostaEl(r) {
  return h('section', { class: 'res-calc', tabindex: '-1', 'aria-label': C('resultadoAria') },
    r.titulo ? h('h2', { class: 'bloco-tit' }, r.titulo) : null, r.blocos.map(blocoEl));
}

/** Símbolo do elemento digitado (símbolo ou nome no idioma); null se não houver. */
function simboloDe(store, texto) {
  const s = String(texto ?? '').trim();
  if (!s) return null;
  if (store.porSimbolo.has(s)) return s;
  const e = construtor(store).dic.entidades(s).elementos[0];
  return e ? e.simbolo : null;
}

function calcEntalpia({ store, query, mostrar }) {
  const E = (k, p) => C(`entalpia.${k}`, p);
  const modo = selecao({ rotulo: E('modo'), opcoes: [['formacao', E('formacao')], ['hess', E('hess')]], valor: query.get('modo') === 'hess' ? 'hess' : 'formacao' });
  const area = h('div');
  let executarAtual = () => {};
  function montarFormacao() {
    const eq = campo({ rotulo: E('equacao'), valor: query.get('eq') ?? '', placeholder: E('placeholder'), ajuda: E('ajuda') });
    area.replaceChildren(eq.raiz, exemplos(['CH4 + 2 O2 -> CO2 + 2 H2O', 'C2H6O + O2 -> CO2 + H2O', 'N2 + 3 H2 -> 2 NH3'], (x) => { eq.input.value = x; executarAtual(); }));
    return async () => mostrar(respostaEl(await construtor(store).respostaFormacao(eq.valor())));
  }
  function montarHess() {
    const alvo = campo({ rotulo: E('alvo'), placeholder: E('placeholderAlvo'), ajuda: E('ajudaHess') });
    const linhas = [1, 2, 3, 4].map((n) => ({ eq: campo({ rotulo: E('equacaoN', { n }) }), dH: campo({ rotulo: E('dH', { n }), inputmode: 'decimal' }) }));
    area.replaceChildren(alvo.raiz, ...linhas.map((l) => h('div', { class: 'grade-campos' }, l.eq.raiz, l.dH.raiz)));
    return () => {
      const eqs = linhas.filter((l) => l.eq.valor()).map((l) => ({ equacao: l.eq.valor(), dH: l.dH.numero() }));
      mostrar(respostaEl(construtor(store).respostaHess(alvo.valor(), eqs)));
    };
  }
  function trocar() { executarAtual = modo.valor() === 'hess' ? montarHess() : montarFormacao(); mostrar(null); }
  modo.select.addEventListener('change', trocar);
  trocar();
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executarAtual(); } }, modo.raiz, area,
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, E('calcular'))));
  return { form, autoexecutar: !!query.get('eq'), executar: () => executarAtual() };
}

function calcEletronica({ store, query, mostrar }) {
  const E = (k) => C(`eletronica.${k}`);
  const el = campo({ rotulo: E('elemento'), valor: query.get('el') ?? '', placeholder: E('placeholder') });
  const carga = campo({ rotulo: E('carga'), valor: query.get('q') ?? '0', inputmode: 'numeric', ajuda: E('ajudaCarga') });
  const executar = () => {
    const s = simboloDe(store, el.valor());
    if (!s) { mostrar(erroEl(E('naoEncontrei'))); return; }
    const q = carga.valor() === '' ? 0 : Math.trunc(lerNumero(carga.valor()));
    mostrar(respostaEl(construtor(store).respostaEletronica({ simbolo: s, carga: Number.isFinite(q) ? q : 0 })));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, h('div', { class: 'grade-campos' }, el.raiz, carga.raiz),
    exemplos(['Fe', 'Cr', 'Cu', 'S', 'Br'], (x) => { el.input.value = x; carga.input.value = '0'; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, E('calcular'))));
  return { form, autoexecutar: !!el.valor(), executar };
}

function calcNox({ store, query, mostrar }) {
  const N = (k) => C(`nox.${k}`);
  const f = campo({ rotulo: N('formula'), valor: query.get('f') ?? '', placeholder: N('placeholder'), ajuda: N('ajuda') });
  const el = campo({ rotulo: N('elemento'), valor: query.get('el') ?? '', placeholder: N('placeholderElemento') });
  const executar = () => mostrar(respostaEl(construtor(store).respostaNox({ formula: f.valor(), elemento: simboloDe(store, el.valor()) })));
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, h('div', { class: 'grade-campos' }, f.raiz, el.raiz),
    exemplos(['H2SO4', 'MnO4-', 'Cr2O7 2-', 'NH4+', 'H2O2', 'C3H8'], (x) => { f.input.value = x; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, N('calcular'))));
  return { form, autoexecutar: !!f.valor(), executar };
}

function calcEquilibrio({ ctx, store, query, mostrar }) {
  const Q = (k) => C(`equilibrio.${k}`);
  const eq = campo({ rotulo: Q('equacao'), valor: query.get('eq') ?? '', placeholder: Q('placeholder'), ajuda: Q('ajuda') });
  const conc = campo({ rotulo: Q('concentracoes'), placeholder: Q('placeholderConc'), ajuda: Q('ajudaConc') });
  // ?t=500&ut=K: temperatura vinda da resposta do assistente ("qual o Kp a 500 K", CONCEITO constante de equilíbrio)
  const unidadesT = unidadesDe(ctx, 'temperatura', ['K', '°C']);
  const temp = valorUnidade({ rotulo: Q('temperatura'), unidades: unidadesT, padrao: unidadesT.includes(query.get('ut')) ? query.get('ut') : 'K', valor: query.get('t') ?? '' });
  const executar = async () => {
    const concentracoes = lerConcentracoes(conc.valor(), ctx.unidades, lexico()).map(({ especie, valor }) => ({ especie, valor }));
    const temperatura = temp.vazio() ? null : temp.dado();
    mostrar(respostaEl(await construtor(store).respostaEquilibrio({ equacao: eq.valor(), concentracoes, temperatura })));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, eq.raiz, conc.raiz, temp.raiz,
    exemplos(['N2 + 3 H2 ⇌ 2 NH3', 'H2 + I2 ⇌ 2 HI', 'CaCO3(s) ⇌ CaO(s) + CO2(g)', '2 SO2 + O2 ⇌ 2 SO3'], (x) => { eq.input.value = x; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, Q('calcular'))));
  return { form, autoexecutar: !!eq.valor(), executar };
}

function calcLigacao({ store, query, mostrar }) {
  const L = (k) => C(`ligacao.${k}`);
  const modo = selecao({ rotulo: L('modo'), opcoes: [['formula', L('porFormula')], ['elementos', L('porElementos')]], valor: 'formula' });
  const f = campo({ rotulo: L('formula'), valor: query.get('f') ?? '', placeholder: L('placeholder') });
  const a = campo({ rotulo: L('a'), placeholder: L('placeholderA') });
  const b = campo({ rotulo: L('b'), placeholder: L('placeholderB') });
  const area = h('div');
  const trocar = () => { area.replaceChildren(...(modo.valor() === 'formula' ? [f.raiz] : [h('div', { class: 'grade-campos' }, a.raiz, b.raiz)])); mostrar(null); };
  modo.select.addEventListener('change', trocar);
  trocar();
  const executar = () => {
    const ab = construtor(store);
    if (modo.valor() === 'formula') { mostrar(respostaEl(ab.respostaLigacao({ formula: f.valor() || null }))); return; }
    const sa = simboloDe(store, a.valor());
    const sb = simboloDe(store, b.valor());
    mostrar(respostaEl(ab.respostaLigacao({ simbolos: [sa, sb].filter(Boolean) })));
  };
  const form = h('form', { class: 'form-calc', onSubmit: (e) => { e.preventDefault(); executar(); } }, modo.raiz, area,
    exemplos(['NaCl', 'HCl', 'Cl2', 'NaOH', 'CO2'], (x) => { modo.select.value = 'formula'; trocar(); f.input.value = x; executar(); }),
    h('div', { class: 'form-acoes' }, h('button', { class: 'btn btn-primario', type: 'submit' }, L('calcular'))));
  return { form, autoexecutar: !!f.valor(), executar };
}

/** Ids e ícones das calculadoras (títulos e descrições no catálogo: ui.calculadoras.lista). */
export const CALCULADORAS = [
  { id: 'massa-molar', icone: 'flask', montar: calcMassaMolar },
  { id: 'balanceamento', icone: 'swap', montar: calcBalanceamento },
  { id: 'estequiometria', icone: 'calculator', montar: calcEstequiometria },
  { id: 'concentracao', icone: 'molecule', montar: calcConcentracao },
  { id: 'ph', icone: 'info', montar: calcPH },
  { id: 'gas-ideal', icone: 'sparkles', montar: calcGas },
  { id: 'unidades', icone: 'refresh', montar: calcUnidades },
  { id: 'entalpia', icone: 'sparkles', montar: calcEntalpia },
  { id: 'configuracao-eletronica', icone: 'molecule', montar: calcEletronica },
  { id: 'nox', icone: 'calculator', montar: calcNox },
  { id: 'equilibrio', icone: 'swap', montar: calcEquilibrio },
  { id: 'ligacao', icone: 'flask', montar: calcLigacao }
];
const tituloDe = (c) => C(`lista.${c.id}.titulo`);
const descricaoDe = (c) => C(`lista.${c.id}.descricao`);

export function viewCalculadoras({ store, params, query }) {
  const def = CALCULADORAS.find((c) => c.id === params.id);
  if (!params.id) {
    return { titulo: C('titulo'), node: h('div', null,
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, C('titulo')),
      h('p', { class: 'sub-pagina' }, C('intro')),
      h('div', { class: 'cartoes' }, CALCULADORAS.map((c) => h('a', { class: 'cartao', href: `/quimica/calculadoras/${c.id}` }, icon(c.icone, 24), h('strong', null, tituloDe(c)), h('span', null, descricaoDe(c)))))) };
  }
  if (!def) {
    return { titulo: C('naoEncontrada'), status: 404, node: h('div', null, h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, C('naoEncontrada')), linkRota('/quimica/calculadoras', C('verTodas'), { class: 'btn btn-primario' })) };
  }
  const saida = h('div', { id: 'resultado', 'aria-live': 'polite' });
  const mostrar = (no) => { saida.replaceChildren(...(no ? [no] : [])); if (no?.tagName === 'SECTION') no.focus({ preventScroll: false }); };
  const { form, autoexecutar, executar } = def.montar({ ctx: store.ctx, store, query, mostrar });
  const no = h('div', null,
    linkRota('/quimica/calculadoras', [icon('back', 16), ` ${C('voltar')}`], { class: 'voltar' }),
    h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, tituloDe(def)),
    h('p', { class: 'sub-pagina' }, descricaoDe(def)),
    form, saida);
  if (autoexecutar && executar) setTimeout(executar, 0);
  return { titulo: tituloDe(def), node: no };
}
