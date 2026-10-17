// Estequiometria: conversão massa ↔ mol ↔ partículas ↔ volume (CNTP) e reação com reagente limitante.
// Massas molares do pacote de dados; N_A e R de constantes.json; volume molar nas CNTP = RT/P (0 °C, 1 atm).
import { arredondar, fmt, fmtTex } from '../formato.js';
import { balancear } from './balancear.js';
import { ErroFormula, formulaTex, formulaUnicode, massaMolar, parseFormula } from './formula.js';
import { acharUnidade, paraBase } from './unidades.js';
import { t } from '../i18n/index.js';

const T = (chave, params) => t(`respostas.calc.estequiometria.${chave}`, params);

const PARTICULAS = /^(part[ií]culas?|mol[eé]culas?|[aá]tomos?|[ií]ons?|unidades?|entidades?|f[oó]rmulas?|un\.?)$/i;
const fm = (x, sig = 6) => fmt(x, { sig });
const ft = (x, sig = 6) => fmtTex(x, { sig });

export const tipoDeUnidade = (unidade, ctx) => {
  if (PARTICULAS.test(String(unidade).trim())) return 'particulas';
  const g = acharUnidade(ctx.unidades, unidade).map((x) => x.grupo);
  if (g.includes('massa')) return 'massa';
  if (g.includes('quantidade')) return 'quantidade';
  if (g.includes('volume')) return 'volume';
  return null;
};

function massaDaFormula(f, ctx) {
  const mm = massaMolar(f, ctx.massaDe);
  if (mm.faltando.length) throw new ErroFormula(T('semMassa', { lista: mm.faltando.join(', ') }));
  return arredondar(mm.total, 6);
}

/** Converte (valor, unidade) em mol, devolvendo o passo explicado. */
function paraMol({ valor, unidade }, M, ctx, rotulo) {
  const tipo = tipoDeUnidade(unidade, ctx);
  const NA = ctx.avogadro();
  if (tipo === 'massa') {
    const g = paraBase(ctx.unidades, unidade, 'massa', valor) * 1000;
    const n = g / M;
    return { mol: n, tipo, passo: { texto: T('massaParaMol', { rotulo, M: fm(M) }), tex: `n = \\dfrac{m}{M} = \\dfrac{${ft(g)}\\ \\mathrm{g}}{${ft(M)}\\ \\mathrm{g/mol}} = ${ft(n)}\\ \\mathrm{mol}` } };
  }
  if (tipo === 'quantidade') {
    const n = paraBase(ctx.unidades, unidade, 'quantidade', valor);
    return { mol: n, tipo, passo: null };
  }
  if (tipo === 'volume') {
    const vm = ctx.volumeMolarCNTP();
    if (!vm) throw new ErroFormula(T('semVolumeMolar'));
    const L = paraBase(ctx.unidades, unidade, 'volume', valor) * 1000;
    const vmL = vm.valor * 1000;
    const n = L / vmL;
    return { mol: n, tipo, passo: { texto: T('volumeParaMol', { vm: fm(vmL) }), tex: `n = \\dfrac{V}{V_m} = \\dfrac{${ft(L)}\\ \\mathrm{L}}{${ft(vmL)}\\ \\mathrm{L/mol}} = ${ft(n)}\\ \\mathrm{mol}` } };
  }
  if (tipo === 'particulas') {
    if (!NA) throw new ErroFormula(T('semAvogadro'));
    const n = valor / NA.valor;
    return { mol: n, tipo, passo: { texto: T('particulasParaMol'), tex: `n = \\dfrac{N}{N_A} = \\dfrac{${ft(valor)}}{${ft(NA.valor, 9)}\\ \\mathrm{mol^{-1}}} = ${ft(n)}\\ \\mathrm{mol}` } };
  }
  throw new ErroFormula(T('unidadeNaoReconhecida', { u: unidade }));
}

/** Tudo que se obtém de uma quantidade de matéria (mol) de uma substância. */
export function equivalentes(mol, M, ctx) {
  const NA = ctx.avogadro();
  const vm = ctx.volumeMolarCNTP();
  return {
    mol,
    massa: mol * M,
    particulas: NA ? mol * NA.valor : null,
    volumeL: vm ? mol * vm.valor * 1000 : null
  };
}

/**
 * Converte uma quantidade de uma substância entre massa, mol, partículas e volume nas CNTP.
 * @param {{formula: string, valor: number, unidade: string}} e
 */
export function converterQuantidade(e, ctx) {
  let f;
  try { f = parseFormula(e.formula, { simbolos: ctx.simbolos }); } catch (err) {
    if (err instanceof ErroFormula) return { ok: false, erro: err.message };
    throw err;
  }
  if (!Number.isFinite(e.valor) || e.valor < 0) return { ok: false, erro: T('quantidadeInvalida') };
  try {
    const M = massaDaFormula(f, ctx);
    const passos = [{ texto: T('massaMolarDe', { formula: formulaUnicode(f.texto) }), tex: `M = ${ft(M)}\\ \\mathrm{g/mol}` }];
    const base = paraMol(e, M, ctx, formulaUnicode(f.texto));
    if (base.passo) passos.push(base.passo);
    const eq = equivalentes(base.mol, M, ctx);
    const NA = ctx.avogadro();
    const vm = ctx.volumeMolarCNTP();
    if (base.tipo !== 'massa') passos.push({ texto: T('molParaMassa'), tex: `m = nM = ${ft(eq.mol)} \\times ${ft(M)} = ${ft(eq.massa)}\\ \\mathrm{g}` });
    if (NA && base.tipo !== 'particulas') passos.push({ texto: T('molParaParticulas'), tex: `N = nN_A = ${ft(eq.mol)} \\times ${ft(NA.valor, 9)} = ${ft(eq.particulas)}` });
    if (vm && base.tipo !== 'volume') passos.push({ texto: T('molParaVolume', { vm: fm(vm.valor * 1000) }), tex: `V = nV_m = ${ft(eq.mol)} \\times ${ft(vm.valor * 1000)} = ${ft(eq.volumeL)}\\ \\mathrm{L}` });
    const resultados = [
      { rotulo: T('quantidade'), valor: fm(eq.mol), unidade: 'mol', destaque: base.tipo !== 'quantidade' },
      { rotulo: T('massa'), valor: fm(eq.massa), unidade: 'g' },
      ...(eq.particulas != null ? [{ rotulo: T('particulas'), valor: fm(eq.particulas), unidade: '' }] : []),
      ...(eq.volumeL != null ? [{ rotulo: T('volumeCntp'), valor: fm(eq.volumeL), unidade: 'L' }] : [])
    ];
    return {
      ok: true, formula: f.texto, massaMolar: M, ...eq, resultados, passos,
      notas: [T('notaVolume'), ...notasCntp(ctx)],
      fontes: fontesDe(ctx, NA)
    };
  } catch (err) {
    if (err instanceof ErroFormula) return { ok: false, erro: err.message };
    throw err;
  }
}

/** Nota das condições: CNTP adotada (0 °C, 1 atm) e, ao lado, a condição padrão atual da IUPAC (0 °C, 1 bar); ambos de RT/P. */
export function notasCntp(ctx) {
  const vm = ctx.volumeMolarCNTP();
  if (!vm) return [];
  const iu = ctx.volumeMolarIUPAC?.();
  const cntp = T('notaCntp', { vm: fmt(vm.valor * 1000, { sig: 3 }) });
  return [iu ? `${cntp} ${T('notaIupac', { vmIupac: fmt(iu.valor * 1000, { sig: 3 }) })}` : cntp];
}

function fontesDe(ctx, NA) {
  const f = [ctx.fonteElemento ?? { nome: t('respostas.fontes.massasAtomicas') }];
  if (NA) f.push(NA.fonte ? { nome: NA.fonte.nome ?? String(NA.fonte), url: NA.fonte.url, licenca: NA.fonte.licenca } : { nome: t('respostas.fontes.constantes') });
  return f;
}

const chaveEspecie = (e) => `${e.parsed?.hill ?? e.formula}|${e.carga ?? 0}${e.eletron ? '|e' : ''}`;

/**
 * Reação com reagente limitante.
 * @param {{equacao: string, dados: {especie: string|number, valor: number, unidade: string}[], rendimento?: number}} entrada
 */
export function calcularEstequiometria(entrada, ctx) {
  const eq = balancear(entrada.equacao, { simbolos: ctx.simbolos });
  if (!eq.ok) return { ok: false, erro: eq.erro };
  const especies = [...eq.reagentes.map((e) => ({ ...e, lado: 'reagente' })), ...eq.produtos.map((e) => ({ ...e, lado: 'produto' }))];
  if (especies.some((e) => e.eletron)) return { ok: false, erro: T('semirreacoes') };
  const dados = entrada.dados ?? [];
  if (dados.length === 0) return { ok: false, erro: T('informePeloMenos') };
  const rend = entrada.rendimento == null || Number.isNaN(entrada.rendimento) ? 100 : entrada.rendimento;
  if (!(rend > 0 && rend <= 100)) return { ok: false, erro: T('rendimento') };
  try {
    for (const e of especies) {
      e.M = massaDaFormula(e.parsed, ctx);
    }
    const passos = [{ texto: T('passoEquacao'), tex: eq.equacaoTex }];
    const dadosEsp = dados.map((d) => {
      let idx = typeof d.especie === 'number' ? d.especie : -1;
      if (idx < 0) {
        const alvo = parseFormula(String(d.especie), { simbolos: ctx.simbolos });
        const k = `${alvo.hill}|${alvo.carga}`;
        idx = especies.findIndex((e) => chaveEspecie(e) === k);
        if (idx < 0) throw new ErroFormula(T('naoAparece', { x: d.especie }));
      }
      if (!Number.isFinite(d.valor) || d.valor < 0) throw new ErroFormula(T('quantidadesValidas'));
      return { ...d, idx };
    });
    if (new Set(dadosEsp.map((d) => d.idx)).size !== dadosEsp.length) throw new ErroFormula(T('umaVez'));
    const informadas = dadosEsp.map((d) => ({ ...d, e: especies[d.idx] }));
    if (informadas.length > 1 && informadas.some((d) => d.e.lado === 'produto')) {
      throw new ErroFormula(T('soReagentes'));
    }
    // 1. tudo em mol
    const molIni = informadas.map((d) => {
      const r = paraMol(d, d.e.M, ctx, formulaUnicode(d.e.formula));
      if (r.passo) passos.push(r.passo);
      return { ...d, mol: r.mol };
    });
    // 2. extensão da reação
    const razoes = molIni.map((d) => ({ ...d, razao: d.mol / d.e.coef }));
    const lim = razoes.reduce((a, b) => (b.razao < a.razao ? b : a));
    // Partindo de um PRODUTO desejado com rendimento < 100 %: a quantidade informada é a obtida (real); a reação precisa avançar,
    // como se rendesse 100 %, numa extensão maior (ξ = n ÷ coeficiente ÷ rendimento), e os reagentes necessários saem dela.
    const doProduto = lim.e.lado === 'produto' && rend < 100;
    const xi = doProduto ? lim.razao / (rend / 100) : lim.razao;
    if (razoes.length > 1) {
      passos.push({
        texto: T('passoRazoes'),
        tex: razoes.map((d) => `\\dfrac{n(${formulaTex(d.e.formula)})}{${d.e.coef}} = \\dfrac{${ft(d.mol)}}{${d.e.coef}} = ${ft(d.razao)}`),
        lista: true
      });
      passos.push({ texto: T('limitante', { formula: formulaUnicode(lim.e.formula) }), tex: `\\xi = ${ft(xi)}\\ \\mathrm{mol}`, destaque: true });
    } else if (doProduto) {
      passos.push({
        texto: T('produtoComRendimento', { formula: formulaUnicode(lim.e.formula), rend: fm(rend) }),
        tex: `\\xi = \\dfrac{${ft(lim.mol)}}{${lim.e.coef} \\times ${ft(rend / 100)}} = ${ft(xi)}\\ \\mathrm{mol}`,
        destaque: true
      });
    } else {
      passos.push({ texto: T('umaQuantidade', { formula: formulaUnicode(lim.e.formula) }), tex: `\\xi = \\dfrac{${ft(lim.mol)}}{${lim.e.coef}} = ${ft(xi)}\\ \\mathrm{mol}`, destaque: true });
    }
    // 3. resultado por substância
    const NA = ctx.avogadro();
    const vm = ctx.volumeMolarCNTP();
    const tabela = especies.map((e, i) => {
      const ini = molIni.find((d) => d.idx === i);
      let mol;
      if (e.lado === 'produto') mol = e.coef * xi * (rend / 100);
      else mol = ini ? ini.mol - e.coef * xi : e.coef * xi; // reagente informado: o que sobra; não informado: o que é necessário
      const info = {
        indice: i, lado: e.lado, formula: e.formula, formulaUnicode: formulaUnicode(e.formula), coef: e.coef, massaMolar: e.M,
        limitante: i === lim.idx, informado: !!ini
      };
      if (e.lado === 'reagente') {
        const consumido = e.coef * xi;
        info.consumidoMol = consumido;
        info.consumidoG = consumido * e.M;
        if (ini) { info.inicialMol = ini.mol; info.sobraMol = Math.max(0, ini.mol - consumido); info.sobraG = info.sobraMol * e.M; }
        else { info.necessarioMol = consumido; info.necessarioG = consumido * e.M; }
      } else {
        info.formadoMol = mol;
        info.formadoG = mol * e.M;
        info.particulas = NA ? mol * NA.valor : null;
        info.volumeL = vm ? mol * vm.valor * 1000 : null;
        info.teoricoMol = e.coef * xi;
        info.teoricoG = e.coef * xi * e.M;
      }
      return info;
    });
    const produtos = tabela.filter((x) => x.lado === 'produto');
    passos.push({
      texto: T('passoCoeficientes', { rend: rend < 100 ? fm(rend) : null }),
      tex: produtos.map((p) => `n(${formulaTex(p.formula)}) = ${p.coef} \\times ${ft(xi)}${rend < 100 ? ` \\times ${ft(rend / 100)}` : ''} = ${ft(p.formadoMol)}\\ \\mathrm{mol}`),
      lista: true
    });
    passos.push({
      texto: T('passoMassa'),
      tex: produtos.map((p) => `m(${formulaTex(p.formula)}) = ${ft(p.formadoMol)} \\times ${ft(p.massaMolar)} = ${ft(p.formadoG)}\\ \\mathrm{g}`),
      lista: true, destaque: true
    });
    const necessarios = tabela.filter((x) => x.lado === 'reagente' && !x.informado);
    if (necessarios.length) {
      passos.push({
        texto: T('passoNecessarios'),
        tex: necessarios.map((x) => `n(${formulaTex(x.formula)}) = ${x.coef} \\times ${ft(xi)} = ${ft(x.necessarioMol)}\\ \\mathrm{mol} \\;(${ft(x.necessarioG)}\\ \\mathrm{g})`),
        lista: true
      });
    }
    const sobras = tabela.filter((x) => x.lado === 'reagente' && x.informado && x.sobraMol > 1e-12 * Math.max(1, x.inicialMol));
    if (sobras.length) {
      passos.push({
        texto: T('sobra'),
        tex: sobras.map((s) => `${formulaTex(s.formula)}:\\; ${ft(s.inicialMol)} - ${ft(s.consumidoMol)} = ${ft(s.sobraMol)}\\ \\mathrm{mol} \\;(${ft(s.sobraG)}\\ \\mathrm{g})`),
        lista: true
      });
    }
    const resultados = [
      ...(razoes.length > 1 ? [{ rotulo: T('reagenteLimitante'), valor: formulaUnicode(lim.e.formula), unidade: '', destaque: true }] : []),
      ...produtos.map((p) => ({ rotulo: T('formado', { formula: formulaUnicode(p.formula) }), valor: fm(p.formadoG), unidade: 'g', destaque: true, extra: `${fm(p.formadoMol)} mol` })),
      ...sobras.map((s) => ({ rotulo: T('emExcesso', { formula: formulaUnicode(s.formula) }), valor: fm(s.sobraG), unidade: 'g', extra: `${fm(s.sobraMol)} mol` })),
      ...tabela.filter((x) => x.lado === 'reagente' && !x.informado).map((x) => ({ rotulo: T('necessario', { formula: formulaUnicode(x.formula) }), valor: fm(x.necessarioG), unidade: 'g', extra: `${fm(x.necessarioMol)} mol` }))
    ];
    return {
      ok: true, equacao: eq.equacao, equacaoTex: eq.equacaoTex, balanceamento: eq, limitante: razoes.length > 1 ? lim.e.formula : null,
      xi, rendimento: rend, tabela, resultados, passos,
      notas: [
        ...(eq.digitouCoeficientes ? [T('coeficientesIgnorados')] : []),
        T('notaTabela'),
        ...notasCntp(ctx)
      ],
      fontes: fontesDe(ctx, NA)
    };
  } catch (err) {
    if (err instanceof ErroFormula) return { ok: false, erro: err.message };
    throw err;
  }
}
