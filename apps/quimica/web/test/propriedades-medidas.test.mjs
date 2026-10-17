// Propriedades físicas medidas dos compostos (DATA_CONTRACT §3.1: compostos[].propriedades + fontesPorPropriedade, regras.propriedades com origens/escopos,
// ids solubilidade e pka) e avisos dos elementos (afinidade eletrônica a revisar, nota da escala de Pauling).
// Parte 1: fixture assinada + registros enriquecidos em memória (a fixture não é reassinada aqui). Parte 2: o pacote de DATA_DIR, quando ele traz as medidas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DADOS, FIXTURE, lojaNova } from './support.mjs';
import { Engine } from '../src/quimica/js/engine.js';
import { agruparFontes } from '../src/quimica/js/ui/sobre.js';
import { definirIdioma } from '../src/quimica/js/i18n/index.js';
import {
  avisoDoValor, escoposDe, fonteDoValor, formatarValor, lerValor, medidasDoComposto, notaEletronegatividade, tabelaDePropriedades, valorBruto
} from '../src/quimica/js/propriedades.js';
import { capitalizar } from '../src/quimica/js/texto.js';

const WD = (q, p) => ({ nome: 'Wikidata', url: `https://www.wikidata.org/wiki/${q}#${p}`, licenca: 'CC0', acessadoEm: '2026-10-17', declaracao: `${q}$x` });
const ESTADO = { nome: 'derivado (SaibaTudo Química)', licenca: 'CC0', metodo: 'pontoFusaoK e pontoEbulicaoK do pacote comparados com 298,15 K (1 atm)', acessadoEm: '2026-10-17' };
const ROT = (pt, en, es, de, fr) => ({ 'pt-BR': pt, en, es, de, fr });

/** Medidas no formato do pipeline de 16/10/2026 (valores do pacote gerado localmente). */
const MEDIDAS = {
  176: {
    propriedades: { pontoFusaoK: 289.75, pontoEbulicaoK: 391.05, densidadeKgm3: 1044.6, solubilidadeAguaG100g: 100, pka: 4.76, estadoPadrao: 'liquido' },
    fontesPorPropriedade: {
      pontoFusaoK: { ...WD('Q47512', 'P2101'), referencia: 'CRC Quick Reference Handbook (Q22236188)', valorOriginal: 16.6, unidadeOriginal: '°C' },
      pontoEbulicaoK: { ...WD('Q47512', 'P2102'), referencia: 'CRC Quick Reference Handbook (Q22236188)', valorOriginal: 117.9, unidadeOriginal: '°C', condicoes: { pressaoPa: 101325 } },
      densidadeKgm3: { ...WD('Q47512', 'P2054'), referencia: 'CRC Handbook of Chemistry and Physics (95th edition) (Q20887890)', valorOriginal: 1.0446, unidadeOriginal: 'g/cm³', condicoes: { temperaturaK: 298.15, fase: 'liquido' } },
      solubilidadeAguaG100g: { ...WD('Q47512', 'P2177'), referencia: 'GESTIS', valorOriginal: 100, unidadeOriginal: 'g/100 g', condicoes: { temperaturaK: 293.15 } },
      pka: { ...WD('Q47512', 'P1117'), referencia: 'CRC Handbook of Chemistry and Physics (95th edition) (Q20887890)', valorOriginal: 4.756, condicoes: { temperaturaK: 298.15 } },
      estadoPadrao: ESTADO
    }
  },
  702: {
    propriedades: { pontoFusaoK: 159.05, pontoEbulicaoK: 351.44, pka: 16, solubilidadeAguaGL: 1000, estadoPadrao: 'liquido' },
    fontesPorPropriedade: {
      pontoFusaoK: { ...WD('Q153', 'P2101'), referencia: 'CRC Quick Reference Handbook (Q22236188)' },
      pontoEbulicaoK: { ...WD('Q153', 'P2102'), condicoes: { pressaoPa: 101325 } },
      pka: { ...WD('Q153', 'P1117'), referencia: 'http://openmopac.net/pKa_table.html' },
      solubilidadeAguaGL: { ...WD('Q153', 'P2177'), condicoes: { temperaturaK: 293.15 } },
      estadoPadrao: ESTADO
    }
  },
  962: {
    propriedades: { pontoFusaoK: 273.15, pontoEbulicaoK: 373.13, densidadeKgm3: 997.048, estadoPadrao: 'liquido' },
    fontesPorPropriedade: {
      pontoFusaoK: { ...WD('Q283', 'P2101'), condicoes: { pressaoPa: 101325 }, semReferencia: true, corroboradoPor: 2 },
      pontoEbulicaoK: { ...WD('Q283', 'P2102'), condicoes: { pressaoPa: 101325 }, semReferencia: true, corroboradoPor: 2 },
      densidadeKgm3: { ...WD('Q283', 'P2054'), referencia: 'CRC Handbook of Chemistry and Physics (70th edition) (Q30322990)', condicoes: { temperaturaK: 298.15, fase: 'liquido' } },
      estadoPadrao: ESTADO
    }
  },
  5793: { // glicose: só pKa com dois valores (pkaValores + fonte alinhada)
    propriedades: { pka: 12.1, pkaValores: [12.1, 13.9] },
    fontesPorPropriedade: { pka: WD('Q37525', 'P1117'), pkaValores: [{ ...WD('Q37525', 'P1117'), condicoes: { temperaturaK: 298.15 } }, { ...WD('Q37525', 'P1117'), condicoes: { temperaturaK: 298.15 } }] }
  }
};

/** Fixture assinada + o que o pipeline novo acrescenta (regras com origens/escopos, solubilidade e pka; medidas; avisos dos elementos). */
async function lojaComMedidas() {
  const store = await lojaNova(FIXTURE);
  for (const [cid, extra] of Object.entries(MEDIDAS)) {
    const c = await store.composto(Number(cid));
    store._compostos.set(Number(cid), { ...c, propriedades: { ...c.propriedades, ...extra.propriedades }, fontesPorPropriedade: extra.fontesPorPropriedade });
  }
  const p = { ...store.regras.propriedades };
  for (const id of ['pontoFusaoK', 'pontoEbulicaoK', 'densidadeKgm3', 'estadoPadrao']) p[id] = { ...p[id], origens: [`elementos.${id}`, `compostos.propriedades.${id}`], escopos: ['elemento', 'composto'] };
  p.eletronegatividade = { ...p.eletronegatividade, escala: 'Pauling', nota: 'Escala de Pauling (Allred)' };
  p.solubilidade = {
    nome: 'Solubilidade em água', origem: 'compostos.propriedades.solubilidadeAguaG100g', escopo: 'composto',
    origens: ['compostos.propriedades.solubilidadeAguaG100g', 'compostos.propriedades.solubilidadeAguaGL'], sinonimos: ['solubilidade', 'solubilidade em água'],
    rotulos: ROT('Solubilidade em água', 'Solubility in water', 'Solubilidad en agua', 'Löslichkeit in Wasser', 'Solubilité dans l’eau'),
    sinonimosPorIdioma: { 'pt-BR': ['solubilidade', 'solubilidade em água'], en: ['solubility', 'water solubility'], es: ['solubilidad'], de: ['löslichkeit', 'wasserlöslichkeit'], fr: ['solubilité'] }
  };
  p.pka = {
    nome: 'pKa', origem: 'compostos.propriedades.pka', escopo: 'composto', origens: ['compostos.propriedades.pka', 'compostos.propriedades.pkaValores'],
    sinonimos: ['pka', 'constante de acidez'], rotulos: ROT('pKa', 'pKa', 'pKa', 'pKs-Wert', 'pKa'),
    sinonimosPorIdioma: { 'pt-BR': ['pka', 'constante de acidez'], en: ['pka', 'acid dissociation constant'], es: ['pka', 'constante de acidez'], de: ['pka', 'pks', 'pks-wert'], fr: ['pka', 'constante d acidite'] }
  };
  store.regras = { ...store.regras, propriedades: p };
  const o = store.porSimbolo.get('O');
  o.fontesPorPropriedade = {
    afinidadeEletronicaKJmol: { nome: 'PubChem Periodic Table', url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/', licenca: 'domínio público (NCBI/NLM)', aviso: 'valor do PubChem possivelmente desatualizado', revisar: true },
    eletronegatividade: { nome: 'PubChem Periodic Table', url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/', licenca: 'domínio público (NCBI/NLM)', escala: 'Pauling', nota: 'Allred' }
  };
  if (o.afinidadeEletronicaKJmol == null) o.afinidadeEletronicaKJmol = 141;
  return store;
}

const fontesUrl = (r) => r.fontes.map((f) => f.url ?? '');

test('tabela de propriedades: escopos do contrato (fusão, ebulição, densidade e estado valem para composto), ids solubilidade e pka, compatível com origem/escopo antigos', async () => {
  definirIdioma('pt-BR');
  const antiga = tabelaDePropriedades((await lojaNova(FIXTURE)).regras);
  const p = (t, id) => t.find((x) => x.id === id);
  assert.deepEqual(escoposDe(p(antiga, 'pontoFusaoK')), ['elemento', 'composto'], 'o contrato já diz que fusão vale para compostos');
  assert.deepEqual(escoposDe(p(antiga, 'massaMolar')), ['composto']);
  assert.ok(p(antiga, 'solubilidade') && p(antiga, 'pka'), 'ids novos existem mesmo sem o pacote declará-los');
  // propriedade nova do pacote só com `origens` (sem escopos): o prefixo dá o escopo
  const t = tabelaDePropriedades({ propriedades: { condutividade: { campo: 'condutividade', alvo: 'elemento', origens: ['elementos.condutividade', 'compostos.propriedades.condutividade'], escopo: 'elemento' }, pontoFusaoK: { origem: 'elementos.pontoFusaoK', escopo: 'elemento', sinonimos: ['derretimento'] } } });
  assert.ok(p(t, 'pontoFusaoK').sinonimos.includes('derretimento'));
  const store = await lojaComMedidas();
  const nova = tabelaDePropriedades(store.regras);
  assert.ok(p(nova, 'solubilidade').sinonimos.includes('solubilidade em água'), 'sinônimos do pacote para o id novo');
  assert.equal(p(tabelaDePropriedades(store.regras, 'de'), 'pka').rotulo, 'pKs-Wert');
  assert.equal(capitalizar('pKa'), 'pKa', 'símbolo com minúscula seguida de maiúscula não muda');
  assert.equal(capitalizar('densidade'), 'Densidade');
});

test('valores medidos do composto: lidos de propriedades, unidade certa da solubilidade, pKa em lista, fonte por valor com condições e "sem referência"', async () => {
  definirIdioma('pt-BR');
  const store = await lojaComMedidas();
  const props = tabelaDePropriedades(store.regras);
  const p = (id) => props.find((x) => x.id === id);
  const acido = await store.composto(176);
  const etanol = await store.composto(702);
  assert.equal(valorBruto(p('pontoFusaoK'), acido), 289.75);
  assert.equal(valorBruto(p('grupo'), acido), undefined, 'propriedade só de elemento não existe no composto');
  assert.equal(formatarValor(p('pontoFusaoK'), 289.75, store.ctx).texto, '289,75 K (16,6 °C)');
  const solEt = lerValor(p('solubilidade'), etanol);
  assert.equal(solEt.campo, 'solubilidadeAguaGL');
  assert.equal(formatarValor(p('solubilidade'), solEt.valor, store.ctx, solEt.campo).texto, '1.000 g/L (em água)');
  assert.equal(formatarValor(p('solubilidade'), 100, store.ctx, 'solubilidadeAguaG100g').texto, '100 g/100 g de água');
  assert.equal(formatarValor(p('pka'), [12.1, 13.9], store.ctx).texto, '12,1 e 13,9');
  assert.equal(formatarValor(p('pka'), [], store.ctx), null);
  const f = fonteDoValor(MEDIDAS[962].fontesPorPropriedade.pontoFusaoK, store.ctx);
  assert.equal(f.url, 'https://www.wikidata.org/wiki/Q283#P2101');
  assert.deepEqual(f.condicoes, ['a 101.325 Pa (1 atm)']);
  assert.match(f.detalhe, /sem referência no Wikidata \(2 declarações concordam\)/);
  const d = fonteDoValor(MEDIDAS[176].fontesPorPropriedade.densidadeKgm3, store.ctx);
  assert.deepEqual(d.condicoes, ['a 298,15 K (25 °C)', 'fase: líquido']);
  assert.match(d.detalhe, /^referência: CRC Handbook/);
  const est = fonteDoValor(ESTADO, store.ctx);
  assert.equal(est.nome, 'SaibaTudo Química (valor derivado)', 'nome do valor derivado vem do catálogo, não do texto em português do pacote');
  const ms = medidasDoComposto(acido, props, store.ctx);
  assert.deepEqual(ms.map((m) => m.prop.id), ['estadoPadrao', 'pontoFusaoK', 'pontoEbulicaoK', 'densidadeKgm3', 'solubilidade', 'pka']);
  assert.ok(ms.every((m) => m.fontes.length > 0));
  const glicose = medidasDoComposto(await store.composto(5793), props, store.ctx);
  assert.equal(glicose[0].campo, 'pkaValores');
  assert.equal(glicose[0].fontes.length, 1, 'fontes alinhadas iguais aparecem uma vez');
  definirIdioma('en');
  assert.deepEqual(fonteDoValor(MEDIDAS[176].fontesPorPropriedade.densidadeKgm3, store.ctx).condicoes, ['at 298.15 K (25 °C)', 'phase: liquid']);
  definirIdioma('pt-BR');
});

test('assistente: PROPRIEDADE de composto responde com o valor do pacote, fonte por valor e condições, nos 5 idiomas', async () => {
  const e = new Engine({ store: await lojaComMedidas() });
  const R = async (idioma, q) => { definirIdioma(idioma); e.limparContexto(); const r = await e.responder(q); assert.equal(r.origem, 'LOCAL'); return r; };
  let r = await R('pt-BR', 'qual o ponto de fusão do ácido acético?');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.equal(r.alvoPropriedade, 'composto');
  assert.match(r.directAnswer, /Ponto de fusão de Ácido acético: 289,75 K \(16,6 °C\)/);
  assert.ok(fontesUrl(r).includes('https://www.wikidata.org/wiki/Q47512#P2101'), 'fonte por valor (declaração do Wikidata)');
  assert.match(r.blocos.find((b) => b.tipo === 'kv').fonte[0].detalhe, /referência: CRC Quick Reference/);
  r = await R('pt-BR', 'pKa do ácido acético');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.match(r.directAnswer, /pKa de Ácido acético: 4,76 — a 298,15 K \(25 °C\)/);
  assert.match(r.directAnswer, /Menor pKa registrado/);
  r = await R('pt-BR', 'qual o ponto de ebulição da água?');
  assert.match(r.directAnswer, /373,13 K \(99,98 °C\) — a 101\.325 Pa \(1 atm\); sem referência no Wikidata/);
  r = await R('pt-BR', 'solubilidade do etanol em água');
  assert.match(r.directAnswer, /Solubilidade em água de Etanol: 1\.000 g\/L \(em água\) — a 293,15 K \(20 °C\)/, 'a água é o solvente, não o composto perguntado');
  assert.ok(!/de Água/.test(r.directAnswer));
  r = await R('pt-BR', 'solubilidade em água');
  assert.equal(r.resolvida, false);
  r = await R('pt-BR', 'densidade do etanol');
  assert.match(r.directAnswer, /O pacote de dados não tem: Densidade de Etanol\./);
  assert.match(r.directAnswer, /Para Etanol, o pacote traz: .*ponto de fusão \(159,05 K\)/);
  r = await R('en', 'melting point of ethanol');
  assert.match(r.directAnswer, /159\.05 K \(−114\.1 °C\)/);
  r = await R('en', 'pKa of acetic acid');
  assert.match(r.directAnswer, /4\.76 — at 298\.15 K/);
  r = await R('es', 'densidad del ácido acético');
  assert.match(r.directAnswer, /1\.?044,6 kg\/m³ \(1,0446 g\/cm³\) — a 298,15 K \(25 °C\); fase: líquido/);
  r = await R('de', 'Siedepunkt von Ethanol');
  assert.match(r.directAnswer, /351,44 K \(78,29 °C\) — bei 101\.325 Pa \(1 atm\)/);
  r = await R('de', 'pKs-Wert von Essigsäure');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.match(r.directAnswer, /4,76/);
  r = await R('fr', 'solubilité de l’acide acétique');
  assert.match(r.directAnswer, /100 g\/100 g d’eau — à 293,15 K/);
  definirIdioma('pt-BR');
});

test('assistente: COMPARAR compostos inclui as propriedades físicas que os dois têm, com a fonte de cada valor, e diz qual é maior quando pedida', async () => {
  definirIdioma('pt-BR');
  const e = new Engine({ store: await lojaComMedidas() });
  let r = await e.responder('compare etanol e ácido acético');
  assert.equal(r.intent, 'COMPARAR');
  const tab = r.blocos.find((b) => b.tipo === 'tabela');
  const linha = (rot) => tab.linhas.find((l) => l[0] === rot);
  assert.deepEqual(linha('Ponto de fusão'), ['Ponto de fusão', '159,05 K', '289,75 K']);
  assert.deepEqual(linha('pKa'), ['pKa', '16', '4,76']);
  assert.equal(linha('Densidade'), undefined, 'só o ácido acético tem densidade: sem linha');
  assert.ok(fontesUrl(r).includes('https://www.wikidata.org/wiki/Q153#P2101') && fontesUrl(r).includes('https://www.wikidata.org/wiki/Q47512#P2101'));
  e.limparContexto();
  r = await e.responder('compare a densidade da água e do ácido acético');
  assert.match(r.directAnswer, /Densidade: maior em Ácido acético \(1\.044,6 kg\/m³\)\./);
});

test('pacote antigo (sem medidas): pergunta de propriedade física de composto continua bem formada e diz que o pacote não traz', async () => {
  definirIdioma('pt-BR');
  const e = new Engine({ store: await lojaNova(FIXTURE) });
  const r = await e.responder('ponto de ebulição do etanol');
  assert.equal(r.intent, 'PROPRIEDADE');
  assert.match(r.directAnswer, /O pacote de dados não tem: Ponto de ebulição de Etanol/);
  assert.ok(!/NaN|undefined|null/.test(r.directAnswer));
});

test('elementos: aviso de revisão (afinidade eletrônica) e nota da escala de Pauling, no idioma ativo', async () => {
  definirIdioma('pt-BR');
  const store = await lojaComMedidas();
  const o = store.porSimbolo.get('O');
  assert.match(avisoDoValor(o, 'afinidadeEletronicaKJmol'), /^Valor a revisar/);
  assert.equal(avisoDoValor(o, 'energiaIonizacaoKJmol'), null);
  assert.match(notaEletronegatividade(store.regras, o), /Escala de Pauling/);
  assert.equal(notaEletronegatividade({}, store.porSimbolo.get('Fe')), null, 'sem escala declarada, sem nota');
  const e = new Engine({ store });
  let r = await e.responder('afinidade eletrônica do oxigênio');
  assert.ok(r.blocos.some((b) => b.tipo === 'aviso' && /Valor a revisar/.test(b.texto)));
  e.limparContexto();
  r = await e.responder('eletronegatividade do oxigênio');
  assert.ok(r.blocos.some((b) => b.tipo === 'aviso' && /Escala de Pauling/.test(b.texto)));
  definirIdioma('fr');
  assert.match(notaEletronegatividade(store.regras, o), /Échelle de Pauling/);
  definirIdioma('pt-BR');
});

test('Sobre os dados: o Wikidata aparece entre as fontes de dados', async () => {
  const store = await lojaNova(DADOS);
  const g = agruparFontes(store.fontes);
  assert.ok(g.dados.some((f) => /wikidata/i.test(`${f.id ?? ''} ${f.nome}`)), 'Wikidata em "Dados no pacote"');
});

// ---------------------------------------------------------------------------------------------------------------- pacote de DATA_DIR (real)
const comMedidas = async () => {
  const store = await lojaNova(DADOS);
  const c = await store.composto(702);
  return c?.fontesPorPropriedade ? store : null;
};

test('pacote com medidas (DATA_DIR): NaCl, etanol, ácido acético e água respondem com o valor e a fonte do Wikidata', async (t) => {
  const store = await comMedidas();
  if (!store) { t.skip('o pacote em uso não traz compostos[].fontesPorPropriedade (rode com DATA_DIR=<pacote de 16/10>)'); return; }
  definirIdioma('pt-BR');
  const e = new Engine({ store });
  const R = async (q) => { e.limparContexto(); return e.responder(q); };
  let r = await R('qual o ponto de fusão do NaCl?');
  assert.match(r.directAnswer, /Ponto de fusão de Cloreto de sódio: 1\.073,85 K \(800,7 °C\)/);
  assert.ok(fontesUrl(r).some((u) => /wikidata\.org\/wiki\/Q2314#P2101/.test(u)));
  r = await R('pKa do ácido acético');
  assert.match(r.directAnswer, /4,76/);
  r = await R('densidade do etanol');
  assert.equal(r.intent, 'PROPRIEDADE');
  r = await R('compare etanol e ácido acético');
  assert.ok(r.blocos.find((b) => b.tipo === 'tabela').linhas.some((l) => l[0] === 'Ponto de ebulição'));
  const props = tabelaDePropriedades(store.regras);
  // varredura: toda medida de todo composto carregado formata sem lixo e tem fonte
  let n = 0;
  for (const cid of [...store.indice.porCid.keys()]) {
    const c = await store.composto(cid);
    for (const m of medidasDoComposto(c, props, store.ctx)) {
      assert.ok(!/NaN|undefined|null|\{/.test(m.f.texto), `${cid} ${m.prop.id}: ${m.f.texto}`);
      assert.ok(m.fontes.length > 0, `${cid} ${m.prop.id} sem fonte`);
      n++;
    }
  }
  assert.ok(n > 1000, `medidas varridas: ${n}`);
  const b = store.porSimbolo.get('B');
  if (b?.fontesPorPropriedade?.afinidadeEletronicaKJmol?.revisar) assert.ok(avisoDoValor(b, 'afinidadeEletronicaKJmol'));
});
