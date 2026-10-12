// Segurança química: recusa por REGRA (antes de qualquer modelo) de pedidos de síntese, purificação, escalonamento ou obtenção
// caseira de explosivos, agentes químicos de guerra, drogas ilícitas e seus precursores controlados, venenos, gases tóxicos, reagentes
// perigosos "feitos em casa" e dano a pessoas (inclusive a si mesmo). Perigos, EPI, primeiros socorros, neutralização, descarte e
// incompatibilidades são respondidos normalmente.
//
// Paridade: este arquivo é espelhado em Seguranca.kt (Android) e em web/src/quimica/js/seguranca.js; os três são conferidos contra
// contracts/seguranca_cases.json (api/test/seguranca.test.mjs). Falha segura: na dúvida entre um pedido de produção e uma pergunta
// legítima, quem decide é a combinação ALVO (substância ou classe) + AÇÃO de produção, nunca a substância sozinha. Um contexto de
// proteção (primeiros socorros, antídoto, "o que fazer se...", efeitos...) salva uma ação GENÉRICA ("como fazer"), mas nunca uma ação
// FORTE ("sintetizar", "receita", "passo a passo"); e "com segurança" ou "descartar os resíduos" não salvam nada contra substâncias ilícitas.
//
// Tolerância a grafias alteradas: o texto é dobrado (acentos, caixa), "leet" (m3t4nf3t4m1n4), letras separadas (s i n t e s e),
// letras repetidas, palavras partidas (explo sivo) e variações fonéticas (k/c, z/s, ph/f, h mudo) são normalizados nos DOIS lados
// (texto e termos das regras); palavras longas toleram um erro de digitação. Aceita também os pedidos mais comuns em inglês.
//
// Todos os idiomas: além das regras em português acima (com tolerância fonética), `avaliarPedido` aplica SEMPRE os padrões de recusa do
// léxico compartilhado (contracts/lexico/<idioma>.json, bloco `seguranca`) de pt-BR, en, es, de e fr — a mesma lógica do site
// (web/src/quimica/js/seguranca.js): autolesão primeiro; depois ação + alvo, com as exceções de contexto seguro; por fim a versão "colada".
// Basta UMA das duas camadas recusar. O idioma da interface não chega à API e não deve importar: um pedido perigoso é recusado em qualquer língua.

import { editDistanceAtMost1, fold } from './ground.js';
import { colada as colar, segurancaPorIdioma } from './lexico.js';

export const RECUSA_PADRAO = 'Não posso ajudar com isso: o pedido envolve a produção, a purificação ou a obtenção de substâncias perigosas ou ilícitas '
  + '(explosivos, armas químicas, drogas ou venenos). Posso explicar os perigos, os equipamentos de proteção, os primeiros socorros, '
  + 'o descarte seguro e a química envolvida em nível conceitual.';

// ---------------------------------------------------------------- normalização

// Zero-width, soft hyphen e BOM (montado por código: sem caracteres invisíveis no arquivo)
const CONTROLES_INVISIVEIS = new RegExp(`[${[0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0xfeff, 0xad].map((c) => String.fromCodePoint(c)).join('')}]`, 'g');
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' };

/** Variações fonéticas: aplicadas ao texto e aos termos das regras (por isso as regras são escritas em português normal). */
export function fonetica(s) {
  return s
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/h/g, '')
    .replace(/k/g, 'c')
    .replace(/y/g, 'i')
    .replace(/w/g, 'u')
    .replace(/[zx]/g, 's')
    .replace(/c(?=[ei])/g, 's')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Duas visões do texto: `v1` (dobrado, só letras/dígitos, para siglas) e `v2` (leet resolvido, fonético, sem letras repetidas, para
 * palavras). `colado` = v2 sem espaços (pega "co.ca.ina" e "explo sivo").
 */
export function preparar(texto) {
  let t = fold(String(texto ?? '')).replace(CONTROLES_INVISIVEIS, '');
  t = t.replace(/[@]/g, 'a').replace(/\$/g, 's').replace(/(?<=[a-z])!(?=[a-z])/g, 'i');
  // letras soltas separadas por espaço, ponto, hífen ou asterisco ("s i n t e s e", "c.o.c.a.i.n.a") voltam a ser uma palavra
  t = t.replace(/(?<![a-z0-9])(?:[a-z0-9][ .\-_*]){3,}[a-z0-9](?![a-z0-9])/g, (m) => m.replace(/[ .\-_*]/g, ''));
  const v1 = t.replace(/[^a-z0-9]+/g, ' ').trim();
  const palavras = v1.split(' ').filter(Boolean).map((w) => (/[a-z]/.test(w) ? w.replace(/[0-9]/g, (d) => LEET[d] ?? d) : w));
  const t2 = palavras.map(fonetica);
  return { v1, tokens1: v1.split(' ').filter(Boolean), tokens2: t2, colado: t2.join('') };
}

// ---------------------------------------------------------------- termos

/** Compila um termo em português normal: "sintetiz*" (radical), "gas mostarda" (frase). */
function termo(txt) {
  const palavras = fold(txt).split(' ').filter(Boolean).map((p) => {
    const stem = p.endsWith('*');
    const w = fonetica(stem ? p.slice(0, -1) : p);
    return { w, stem };
  });
  // palavra única longa também é procurada no texto "colado" (pega palavras partidas ou com pontuação no meio)
  return { palavras, colar: palavras.length === 1 && palavras[0].w.length >= 8 ? palavras[0].w : null };
}

function palavraBate(tok, { w, stem }) {
  if (stem) return tok.startsWith(w);
  if (tok === w) return true;
  return w.length >= 7 && tok.length >= 6 && editDistanceAtMost1(tok, w);
}

function casa(p, t) {
  const n = t.palavras.length;
  for (let i = 0; i + n <= p.tokens2.length; i++) {
    let ok = true;
    for (let j = 0; j < n && ok; j++) ok = palavraBate(p.tokens2[i + j], t.palavras[j]);
    if (ok) return true;
  }
  return t.colar !== null && p.colado.includes(t.colar);
}

const compilar = (lista) => lista.map(termo);
const algum = (p, termos) => termos.some((t) => casa(p, t));
const siglas = (p, lista) => lista.some((s) => p.tokens1.includes(s));
const todos = (p, ...grupos) => grupos.every((g) => algum(p, typeof g[0] === 'string' ? compilar(g) : g));

// ---------------------------------------------------------------- ALVOS (substâncias e classes)

const CATEGORIAS = [
  {
    id: 'explosivo',
    siglas: ['tnt', 'rdx', 'hmx', 'petn', 'tatp', 'hmtd', 'anfo', 'ied', 'c4', 'c-4'],
    termos: compilar([
      'explosivo*', 'explosive*', 'bomba caseira', 'bomba artesanal', 'bomba improvisada', 'artefato explosivo', 'coquetel molotov', 'molotov',
      'granada', 'detonador*', 'dinamite', 'polvora', 'gunpowder', 'trinitrotolueno', 'nitroglicerina', 'hexogenio', 'octogeno', 'pentrita',
      'semtex', 'nitrocelulose', 'algodao polvora', 'peroxido de acetona', 'triperoxido de triacetona', 'azida de chumbo',
      'fulminato de mercurio', 'acido picrico', 'nitrato de ureia', 'napalm', 'termita', 'termite', 'fogos de artificio',
    ]),
    compostos: [
      [['nitrato de amonio'], ['diesel', 'oleo combustivel', 'combustivel']],
      [['acetona'], ['agua oxigenada', 'peroxido de hidrogenio'], ['acido']],
      [['clorato de potassio', 'perclorato'], ['acucar', 'enxofre', 'aluminio em po']],
      [['salitre', 'nitrato de potassio'], ['carvao'], ['enxofre']],
    ],
    // "bomba"/"bomb" sozinha: só vale se não for bomba de banho, de água, de chocolate etc.
    bomba: true,
  },
  {
    id: 'arma_quimica',
    siglas: ['vx'],
    termos: compilar([
      'sarin', 'soman', 'tabun', 'novichok', 'ciclosarin', 'agente nervoso', 'agentes nervosos', 'gas nervoso', 'gas mostarda',
      'mustard gas', 'mostarda sulfurada', 'mostarda nitrogenada', 'iperita', 'lewisita', 'fosgenio', 'phosgene', 'difosgenio', 'cianogenio',
      'arma quimica', 'armas quimicas', 'chemical weapon*', 'agente quimico de guerra', 'guerra quimica', 'gas de combate', 'agente laranja',
    ]),
  },
  {
    id: 'droga',
    siglas: ['lsd', 'mdma', 'ghb', 'pcp', 'dmt', 'meth'],
    termos: compilar([
      'cocaina', 'cocaine', 'crack', 'pasta base', 'pasta de coca', 'merla', 'heroina', 'heroin', 'metanfetamina', 'methamphetamine',
      'ecstasy', 'extase', 'molly', 'acido lisergico', 'dietilamida do acido lisergico', 'fentanil', 'fentanyl', 'fentanila', 'carfentanil',
      'mescalina', 'haxixe', 'hashish', 'catinona*', 'mefedrona', 'metcatinona', 'lean', 'opio', 'cloridrato de cocaina', 'spice',
      'canabinoide* sintetico*', 'droga* sintetica*', 'drogas ilicitas sinteticas',
      'fabricar droga*', 'produzir droga*', 'fazer droga*', 'cozinhar droga*', 'sintetizar droga*', 'preparar droga*', 'fabricar entorpecente*', 'produzir entorpecente*',
    ]),
  },
  {
    id: 'precursor',
    siglas: ['p2p', 'gbl'],
    termos: compilar([
      'pseudoefedrina', 'efedrina', 'safrol', 'isosafrol', 'piperonal', 'fenilacetona', 'acido fenilacetico', 'anidrido acetico',
      'ergotamina', 'norefedrina', 'fenilpropanolamina', 'butirolactona', 'acido antranilico', 'metilamina'
    ]),
  },
  {
    id: 'veneno',
    siglas: [],
    termos: compilar(['ricina', 'abrina', 'tetrodotoxina', 'aconitina', 'veneno indetectavel', 'veneno caseiro', 'cianeto*', 'cianureto', 'estricnina']),
  },
  {
    id: 'gas_toxico',
    siglas: [],
    termos: compilar([
      'gas toxico', 'gas venenoso', 'gas letal', 'gas asfixiante', 'gas lacrimogeneo', 'acido cianidrico', 'gas cianidrico',
      'cianeto de hidrogenio', 'arsina',
    ]),
    // o cloro (e a amônia) gasosos só viram alvo quando o pedido é usá-los contra alguém ou gerá-los misturando produtos de casa
    compostos: [[
      ['gas cloro', 'gas de cloro', 'cloro gasoso', 'gas amonia'],
      ['arma', 'atacar', 'ataque', 'machucar', 'ferir', 'matar', 'intoxicar', 'pessoas', 'produtos de limpeza', 'produto de limpeza', 'agua sanitaria', 'misturando', 'em casa', 'caseir*'],
    ]],
  },
  {
    id: 'cbrn',
    siglas: [],
    termos: compilar([
      'bomba atomica', 'bomba nuclear', 'bomba suja', 'arma nuclear', 'armas nucleares', 'bomba de hidrogenio', 'arma biologica',
      'armas biologicas', 'antraz', 'anthrax',
    ]),
  },
];

const PALAVRAS_BOMBA = ['bomba', 'bomb'].map(fonetica);
const BOMBA_BENIGNA = compilar([
  'atomica', 'nuclear', 'suja', // armas nucleares são da categoria cbrn
  'de banho', 'de chocolate', 'de agua', 'de ar', 'de calor', 'de vacuo', 'de insulina', 'de combustivel', 'de gasolina',
  'de bain', 'de bicicleta', 'de aquario', 'de piscina', 'de cabelo', 'de sorvete', 'de creme', 'hidraulica', 'submersa', 'peristaltica', 'centrifuga',
  'calorimetrica', 'calorimeter', 'calorimeters',
]);

/** "bomba" só conta se a(s) palavra(s) seguinte(s) não a tornam inofensiva (bomba de banho, de água, de chocolate...). */
// Em inglês o modificador vem ANTES: "bath bomb", "glitter bomb", "seed bomb" (inofensivos). Comparados pela mesma fonética dos tokens.
const BOMBA_BENIGNA_ANTES = compilar(['bath', 'glitter', 'seed', 'cherry', 'jam', 'fizzy', 'fizz', 'chocolate', 'cheese', 'flour', 'water', 'photo']).flatMap((t) => t.palavras);

function bombaPerigosa(p) {
  for (let i = 0; i < p.tokens2.length; i++) {
    const tk = p.tokens2[i];
    if (!PALAVRAS_BOMBA.some((b) => tk === b || tk === `${b}s`)) continue;
    const inicio = p.tokens2.slice(i + 1, i + 4);
    const benigna = BOMBA_BENIGNA.some((b) => b.palavras.every((pal, j) => inicio[j] !== undefined && palavraBate(inicio[j], pal)))
      || (i > 0 && BOMBA_BENIGNA_ANTES.some((b) => palavraBate(p.tokens2[i - 1], b)));
    if (!benigna) return true;
  }
  return false;
}

function temAlvo(p, cat) {
  if (siglas(p, cat.siglas)) return true;
  if (algum(p, cat.termos)) return true;
  if (cat.compostos?.some((grupos) => todos(p, ...grupos))) return true;
  if (cat.bomba && bombaPerigosa(p)) return true;
  if (cat.id === 'explosivo' && /(?:^| )c ?4(?: |$)/.test(p.v1)) return true;
  return false;
}

// ---------------------------------------------------------------- AÇÕES e contextos

// Verbos e expressões que descrevem PRODUZIR, PURIFICAR, AMPLIAR, OBTER ou ESCONDER: valem sozinhos junto de um alvo.
const ACAO_FORTE = compilar([
  'sintetiz*', 'synthesi*', 'sintese', 'fabricar', 'fabricacao', 'fabricando', 'fabricado', 'fabricada', 'cozinhar', 'cozinha*', 'purificar',
  'purificacao', 'refinar', 'refino', 'recristaliz*', 'extrair', 'extracao', 'receita', 'passo a passo', 'rota de sintese', 'larga escala',
  'escala industrial', 'em escala', 'escalonar', 'aumentar a producao', 'ampliar a producao', 'rendimento', 'caseir*', 'artesanal', 'clandestin*',
  'confeccionar', 'manufatur*', 'produzir', 'producao de', 'sem deixar rastro', 'sem ser detectado', 'sem ser descoberto', 'indetectavel',
  'esconder', 'ocultar', 'disfarcar', 'driblar', 'burlar', 'how to make', 'how to produce', 'how to build', 'how to cook', 'how to synthesize',
  'how to manufacture',
]);

// Verbos genéricos: só valem junto de um alvo e SEM contexto de proteção ("como fazer a descontaminação do sarin" passa).
// ("make"/"making" não estão aqui: a fonética deles ('mase') bate com "masse" (fr) e "Quelle est la masse molaire du TNT ?" era recusada;
// o inglês é coberto pelo léxico compartilhado, que casa "make" sem fonética.)
const ACAO_GENERICA = compilar([
  'como fazer', 'como faco', 'como se faz', 'como faz', 'fazer', 'preparar', 'preparo', 'obter', 'conseguir', 'criar', 'construir',
  'montar', 'misturar', 'ensine', 'ensina', 'tutorial', 'proporcao', 'proporcoes', 'quanto de', 'quantidade para', 'comprar', 'adquirir',
  'sem receita', 'escondido', 'reagentes', 'how to',
]);

// Contexto que descreve o PERIGO, o EFEITO, a DEFESA ou o PEDIDO DE AJUDA: não é pedido de produção. Não pode ser usado como camuflagem.
const PROTECAO_FORTE = compilar([
  'neutraliz*', 'descontamin*', 'derram*', 'vazamento', 'primeiros socorros', 'antidoto', 'tratamento', 'tratar', 'tratada', 'sintoma*',
  'o que fazer', 'o que acontece', 'epi', 'luva*', 'respirador', 'incompativ*', 'perigo*', 'perigoso', 'risco*', 'toxicidade', 'efeito*',
  'historia', 'ilegal', 'crime', 'proibid*', 'detectar', 'identificar', 'evitar', 'prevenir', 'prevencao', 'bombeiro*', 'formula',
  'estrutura', 'massa molar', 'propriedades', 'o que e', 'o que sao', 'significa', 'diferenca', 'parar de usar', 'largar', 'vicio',
  'dependencia', 'dependente', 'reabilitacao', 'abstinencia', 'overdose', 'socorro', 'por que', 'porque', 'como funciona', 'como age',
  'age no', 'estavel', 'quem inventou', 'encontrad*', 'emergencia',
]);
// Contexto que só faz sentido para substâncias do dia a dia (descartar ácido, armazenar solvente): NÃO salva pedido sobre droga ou explosivo.
const PROTECAO_BRANDA = compilar(['seguranca', 'descarte', 'descartar', 'armazen*', 'proteger', 'protecao']);

// "como envenenar alguém", "que produto mata uma pessoa sem deixar rastro"
const PESSOAS = compilar([
  'alguem', 'uma pessoa', 'pessoa', 'vizinho', 'vizinha', 'chefe', 'meu marido', 'minha esposa', 'minha mulher', 'meu ex', 'minha ex',
  'colega', 'professor', 'professora', 'crianca', 'cachorro', 'gato', 'animal',
]);
const DANO_ENVENENAR = [compilar(['envenenar', 'envenena']), PESSOAS];
const DANO_MATAR = [
  compilar(['matar', 'mata', 'matam', 'mate', 'matou', 'assassinar', 'ferir', 'machucar', 'intoxicar', 'prejudicar']),
  PESSOAS,
  compilar([
    'veneno', 'venenoso', 'letal', 'cianeto', 'raticida', 'gas toxico', 'sem deixar rastro', 'sem deixar vestigio', 'sem deixar vestigios',
    'indetectavel', 'dose letal', 'substancia*', 'quimic*', 'sem ser detectado', 'sem ser descoberto',
  ]),
];
const SEM_DANO = compilar(['primeiros socorros', 'antidoto', 'tratamento', 'sintoma*', 'prevenir', 'evitar', 'por que', 'como funciona', 'como age']);

// dano a si mesmo: recusa sempre (o app mostra a orientação de ajuda); só passa quem pergunta sobre prevenção
const AUTOLESAO = compilar(['me matar', 'me envenenar', 'me suicidar', 'suicidio', 'tirar minha vida', 'acabar com minha vida', 'me intoxicar', 'me machucar com']);
const AJUDA_AUTOLESAO = compilar(['prevenir', 'prevencao', 'evitar', 'sinais de', 'como ajudar', 'estatistica*', 'cvv']);

const MISTURA_GAS = [
  compilar(['misturar', 'mistura', 'juntar', 'combinar']),
  compilar(['gas toxico', 'gas venenoso', 'gas letal', 'gerar gas', 'liberar gas', 'produzir gas', 'fazer gas', 'gas cloro', 'cloroamina*']),
  compilar(['para machucar', 'para ferir', 'para matar', 'para intoxicar', 'para prejudicar', 'para fazer mal', 'para atacar']),
];

const DROGA_RECREATIVA = [
  compilar(['dose', 'dosagem', 'quanto tomar', 'quanto usar', 'quanto consumir', 'quanto cheirar', 'quanto fumar']),
  compilar(['recreativ*', 'curtir', 'balada', 'festa', 'viajar', 'ficar chapado', 'ficar doidao', 'pra ficar', 'para ficar']),
];

// Ácidos e reagentes fortes: produzi-los EM CASA é pedido de risco (e nada que um app de química precise ensinar); descartar, diluir, armazenar,
// manusear e a produção industrial são perguntas legítimas.
const REAGENTES_PERIGOSOS = compilar([
  'acido sulfurico', 'acido nitrico', 'acido cloridrico', 'acido muriatico', 'acido fluoridrico', 'acido perclorico', 'agua regia', 'oleum',
]);
const PRODUCAO_DE_REAGENTE = compilar([
  'fazer', 'como fazer', 'produzir', 'sintetiz*', 'fabricar', 'fabricacao', 'obter', 'extrair', 'gerar', 'criar', 'sintese', 'producao de',
]);
const CASEIRO = compilar(['em casa', 'caseir*', 'artesanal', 'na cozinha', 'no quintal', 'na garagem', 'sem laboratorio', 'at home', 'homemade']);

/** Regras próprias da API (termos em português normal, com tolerância fonética e a um erro de digitação). Ver `avaliarPedido`. */
export function avaliarRegrasProprias(texto) {
  const p = preparar(texto);
  if (!p.v1) return { recusar: false, categoria: null, regra: null };

  if (algum(p, AUTOLESAO) && !algum(p, AJUDA_AUTOLESAO)) return { recusar: true, categoria: 'autolesao', regra: 'autolesao' };
  if ((todos(p, ...DANO_ENVENENAR) || todos(p, ...DANO_MATAR)) && !algum(p, SEM_DANO)) {
    return { recusar: true, categoria: 'dano_a_pessoa', regra: 'dano_a_pessoa' };
  }
  if (todos(p, ...MISTURA_GAS)) return { recusar: true, categoria: 'gas_toxico', regra: 'mistura_gas' };

  const forte = algum(p, ACAO_FORTE);
  const generica = algum(p, ACAO_GENERICA);
  const protecaoForte = algum(p, PROTECAO_FORTE);
  for (const cat of CATEGORIAS) {
    if (!temAlvo(p, cat)) continue;
    if (forte) return { recusar: true, categoria: cat.id, regra: 'alvo+acao_forte' };
    if (generica && !protecaoForte) return { recusar: true, categoria: cat.id, regra: 'alvo+acao_generica' };
    if (cat.id === 'droga' && todos(p, ...DROGA_RECREATIVA)) return { recusar: true, categoria: cat.id, regra: 'droga_dose_recreativa' };
  }
  // reagente perigoso feito em casa: a proteção branda (descartar, armazenar, "com segurança") vale aqui, porque o pedido é do dia a dia
  if (algum(p, REAGENTES_PERIGOSOS) && algum(p, PRODUCAO_DE_REAGENTE) && algum(p, CASEIRO) && !protecaoForte && !algum(p, PROTECAO_BRANDA)) {
    return { recusar: true, categoria: 'reagente_caseiro', regra: 'reagente_caseiro' };
  }
  return { recusar: false, categoria: null, regra: null };
}

// ---------------------------------------------------------------- léxico compartilhado (todos os idiomas)

const MAPA_CATEGORIAS = Object.freeze({
  EXPLOSIVOS: 'explosivo',
  ARMAS_QUIMICAS: 'arma_quimica',
  DROGAS: 'droga',
  PRECURSORES: 'precursor',
  REAGENTES_CASEIROS: 'reagente_caseiro',
  DANO_A_PESSOAS: 'dano_a_pessoa',
  AUTOLESAO: 'autolesao',
});

const LEET_LEXICO = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '€': 'e' };
const LETRAS_SEM_DECOMPOSICAO = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', đ: 'd', ł: 'l' };
const leetLexico = (s) => s.replace(/[01345789@$!|€]/g, (c) => LEET_LEXICO[c] ?? c);
const espacado = (s) => s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Texto como o léxico o espera: minúsculo, sem acentos nem invisíveis (ß, æ, œ, ø, đ, ł viram letras ASCII, o que o site deixa cair). */
function limparLexico(texto) {
  return String(texto ?? '')
    .normalize('NFKD')
    .replace(CONTROLES_INVISIVEIS, '')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøđł]/g, (c) => LETRAS_SEM_DECOMPOSICAO[c]);
}

/** Visões do pedido para o léxico: normal, com "leet" resolvido e, para cada uma, a versão com letras soltas reunidas ("c o c a i n e"). */
function visoesLexico(texto) {
  const base = limparLexico(texto);
  const reunida = preparar(texto).v1;
  return [...new Set([espacado(base), espacado(leetLexico(base)), reunida, espacado(leetLexico(reunida))].filter(Boolean))];
}

// ---- exceções da API ao léxico (o léxico é mais grosso que as regras em português: estas frases são conteúdo legítimo) ----
// Cada uma remove uma FRASE ou uma PALAVRA do texto antes do teste; nenhuma delas "salva" o pedido inteiro, então uma ação forte
// (receita, passo a passo, sintetizar...) ou outro alvo na mesma frase continua recusando. Propostas de ajuste ao léxico: ver README.

// "Como fazer para parar de usar crack?": o verbo "fazer" aqui é de quem quer largar o vício. Exige o verbo de parar logo depois.
const FAZER_INOFENSIVO = new RegExp(`\\b(?:${[
  '(?:(?:como|o que) )?(?:(?:eu )?(?:posso|devo|tenho que|preciso) )?fa(?:zer|co|z) (?:para|pra) (?:parar|largar|deixar|abandonar|sair|me livrar|se livrar)',
  '(?:(?:como|que) )?(?:(?:yo )?(?:puedo|debo|tengo que|necesito) )?(?:hacer|hago|hace) para (?:dejar|parar|abandonar|salir|librarme|liberarme)',
  '(?:(?:comment|que) )?(?:(?:je )?(?:puis|peux|dois) )?(?:faire|fais|fait) pour (?:arreter|cesser|quitter|sortir|me liberer|me debarrasser)',
  'was (?:kann|soll|muss) ich (?:tun|machen),? (?:um|damit)(?: \\w+){0,3} (?:aufzuh(?:oe|o)ren|aufh(?:oe|o)ren|loszukommen|auszusteigen)',
  '(?:what|how) (?:can|should|do|could|would) (?:i|we|you) (?:do|make) (?:to|so that) (?:stop|quit|give up|kick|get off)',
].join('|')})\\b`, 'g');

// Pergunta sobre a lei ("qual a lei sobre produção de drogas?"): os substantivos de produção (que o espanhol e o francês pegam em "producao")
// deixam de ser ação. Verbos ("produzir", "fazer", "how to make"), receita e passo a passo continuam sendo.
const ENQUADRAMENTO_JURIDICO = /\b(?:lei|leis|legislacao|law|laws|legislation|ley|leyes|legislacion|gesetz\w*|strafrecht|rechtslage|loi|lois)\b/;
const PRODUCAO_SUBSTANTIVO = /\b(?:producao|production|produccion|produktion|fabricacao|fabricacion|fabrication|herstellung|manufatura|manufacturing|elaboracao|elaboracion)\b/g;

// Nomes de rua de drogas que também são palavras comuns do inglês ("ice", "speed", "crack", "weed", "hash", "spice", "coke"): a expressão
// inofensiva conhecida é removida antes do teste ("how to make ice cubes", "how to make crackers"). Só combinações inequívocas; "how to make ice"
// ou "how to make speed" continuam recusados (na dúvida, recusa).
const COLOCACOES_INOFENSIVAS = new RegExp(`\\b(?:${[
  'dry ice', 'ice (?:cubes?|cream|packs?|water|bath|age|sheets?|crystals?|point|melt\\w*|tea|machine|makers?|skat\\w+|hockey)',
  'speed (?:of|limit|up)', '(?:reaction|wind|rate) speed',
  'crackers?', 'cracking',
  'weed (?:killers?|control|barrier|whackers?|eaters?)', 'weeding',
  'hash (?:functions?|tables?|tags?|codes?|values?|maps?|rate)', 'hashing', 'hashtags?',
  'spice (?:mix|rack|blend|cabinet|cake)s?',
  'coke (?:oven|plant|battery)s?', 'coking coal', 'petroleum coke',
].join('|')})\\b`, 'g');

// ---- complementos da API (lacunas do léxico compartilhado, vistas em testes; ver README) ----
// Regras acrescentadas SÓ do lado da API, em OU com as do léxico. Quando o léxico ganhar estas formas, os complementos viram redundantes.
// ação: verbo separável do alemão ("Wie stelle ich Sprengstoff her?": o léxico só tem "herstell*"), "elaborar" (es, pt) e "élaborer" (fr)
const COMPLEMENTO_ACAO = /\bstell(?:e|st|t|en)\b(?: \w+){0,6} her\b|\belabor(?:ar|o|a|an|ando|acao)\b|\belaborer\b/;
// "Wie baue/mache ich eine Bombe?": na ordem natural do alemão o pronome fica entre o verbo e o artigo, e o léxico exige o artigo logo depois do verbo.
const COMPLEMENTO_FAZER_BOMBA = /\b(?:bau|mach|stell|konstruier|bast|erzeug|produzier|fertig)\w*(?: (?:ich|man|wir|du))? (?:eine?n? |die )?(?:bombe|bomben|sprengsatz|sprengsatze)\b/;
// dano a pessoas em alemão: "Welches Gift tötet unauffällig?" (verbo de matar + discrição, em qualquer ordem)
const COMPLEMENTO_DANO = new RegExp(`\\b(?:(?:vergift|tot|umbring|ermord)\\w*|gift\\w*)\\b.{0,40}\\b(?:unauffallig|spurlos|ohne spuren|unentdeckt|nicht nachweisbar)\\w*|\\b(?:unauffallig|spurlos|ohne spuren|unentdeckt)\\w*\\b.{0,40}\\b(?:vergift|tot|umbring|ermord)\\w*`);

// Cloro gasoso por eletrólise de salmoura (indústria cloro-álcali) fora de um contexto caseiro: química de aula, não arma.
const ELETROLISE_INDUSTRIAL = /\b(?:eletroli\w+|electroli\w+|electroly\w+|elektroly\w+|cloro ?alcali|chlor ?alk\w+|chlor ?alcali|salmoura|salmuera|brine|saumure|salzlake)\b/;
const CLORO_GASOSO = /\b(?:gas(?:es)? (?:de )?cloro|cloro gasoso|cloro em gas|cloro gaseoso|chlorine gas(?:es)?|gaseous chlorine|chlorgas|gaz (?:de )?chlore|chlore gazeux)\b/g;

// "fazer uma bomba de banho": o léxico (inglês) casa o verbo + "bomba" sem olhar o que vem depois; vale a mesma lista de bombas inofensivas das regras em português
// (sem as três primeiras entradas, 'atomica', 'nuclear' e 'suja', que são armas).
const BOMBA_BENIGNA_LEXICO = BOMBA_BENIGNA.slice(3);
function fazerBombaPerigosa(S, vc) {
  for (const m of vc.matchAll(S.fazerBombaG)) {
    const seguinte = vc.slice(m.index + m[0].length).split(' ').filter(Boolean).slice(0, 4).map(fonetica);
    const benigna = BOMBA_BENIGNA_LEXICO.some((b) => b.palavras.every((pal, j) => seguinte[j] !== undefined && palavraBate(seguinte[j], pal)));
    if (!benigna) return true;
  }
  return false;
}

/**
 * Aplica as exceções ao texto `v` (uma visão normalizada): devolve `vc` (para ação e alvos) e `vArmas` (vc sem "cloro gasoso" quando o contexto é
 * eletrólise industrial e não caseiro).
 */
function neutralizar(S, v, casa) {
  // "o que fazer se...", "fazer o descarte..." (léxico) e "como fazer para parar de usar..." (API) não são pedidos de produção
  let vc = v.replace(S.tirarFazerSeguro, ' ').replace(FAZER_INOFENSIVO, ' ').replace(COLOCACOES_INOFENSIVAS, ' ');
  if (ENQUADRAMENTO_JURIDICO.test(v)) vc = vc.replace(PRODUCAO_SUBSTANTIVO, ' ');
  const industrial = !casa && ELETROLISE_INDUSTRIAL.test(v);
  return { vc, vArmas: industrial ? vc.replace(CLORO_GASOSO, ' ') : vc };
}

const recusaLexico = (categoria, motivo, idioma) => ({ recusar: true, categoria: MAPA_CATEGORIAS[categoria] ?? categoria.toLowerCase(), regra: `lexico:${motivo}`, idioma });

/**
 * Aplica os padrões de recusa do léxico compartilhado nos cinco idiomas (mesma lógica de web/src/quimica/js/seguranca.js).
 * Devolve { recusar, categoria, regra, idioma? }.
 */
export function avaliarPorLexico(texto, lexicos = segurancaPorIdioma()) {
  const base = limparLexico(texto);
  if (!base.trim()) return { recusar: false, categoria: null, regra: null };
  const visoes = visoesLexico(texto);
  const v1 = visoes[0] ?? '';

  // autolesão primeiro, em todos os idiomas: o app responde com acolhimento, mesmo sem "ação"
  for (const S of lexicos) for (const v of visoes) if (S.alvoAutolesao.test(v)) return recusaLexico('AUTOLESAO', 'autolesao', S.idioma);

  for (const S of lexicos) {
    for (const v of visoes) {
      const incidente = S.contextoSeguro.test(v);
      const casa = S.casa.test(v);
      const { vc, vArmas } = neutralizar(S, v, casa);
      const acao = S.acao.test(vc) || COMPLEMENTO_ACAO.test(vc);
      // dano a pessoas: o alvo já contém a ação
      if (S.alvoDano.test(v) || COMPLEMENTO_DANO.test(v)) return recusaLexico('DANO_A_PESSOAS', 'dano', S.idioma);
      if (fazerBombaPerigosa(S, vc) || COMPLEMENTO_FAZER_BOMBA.test(vc)) return recusaLexico('EXPLOSIVOS', 'bomba', S.idioma);
      // alvos graves: a recusa vale mesmo com palavras de "segurança" na frase (não há como produzir "com segurança")
      if (acao && S.alvoExplosivos.test(vc)) return recusaLexico('EXPLOSIVOS', 'explosivos', S.idioma);
      if (acao && S.alvoArmas.test(vArmas)) return recusaLexico('ARMAS_QUIMICAS', 'armas', S.idioma);
      if (acao && S.alvoDrogas.test(vc)) return recusaLexico('DROGAS', 'drogas', S.idioma);
      if (acao && S.precursoresNomes.test(vc) && (S.alvoDrogas.test(vc) || S.precursoresAcao.test(vc))) return recusaLexico('PRECURSORES', 'precursores', S.idioma);
      // receitas caseiras com reagentes perigosos: "em casa" + produzir; fica de fora quem trata de descarte, EPI, incidente etc.
      if (!incidente && acao && casa && S.perigososCaseiros.test(vc)) return recusaLexico('REAGENTES_CASEIROS', 'caseiro', S.idioma);
    }
  }

  // versão colada: tolera "explo sivo", "e x p l o s i v o", "exploosivo"
  for (const S of lexicos) {
    const vl = espacado(leetLexico(base));
    const c = colar(neutralizar(S, vl, S.casa.test(vl)).vArmas);
    if (c.length >= 8 && !S.contextoSeguro.test(v1) && S.coladaAcoes.some((a) => c.includes(a))) {
      for (const [cat, alvos] of Object.entries(S.coladaAlvos)) {
        if (alvos.some((a) => c.includes(a))) return recusaLexico(cat, 'disfarce', S.idioma);
      }
    }
  }
  return { recusar: false, categoria: null, regra: null };
}

/**
 * Avalia o texto da PERGUNTA do usuário, em qualquer idioma. Devolve { recusar, categoria, regra }.
 *   regra: 'alvo+acao_forte' | 'alvo+acao_generica' | 'dano_a_pessoa' | 'autolesao' | 'mistura_gas' | 'droga_dose_recreativa' | 'reagente_caseiro'
 *          (regras próprias, em português) ou 'lexico:<motivo>' (léxico compartilhado; traz também `idioma`).
 * Recusa se QUALQUER uma das duas camadas recusar.
 */
export function avaliarPedido(texto) {
  const propria = avaliarRegrasProprias(texto);
  if (propria.recusar) return propria;
  return avaliarPorLexico(texto);
}

export const pedidoPerigoso = (texto) => avaliarPedido(texto).recusar;

// ---------------------------------------------------------------- verificação do TEXTO GERADO

const FRASES_DE_RECUSA = compilar(['nao posso', 'nao vou', 'nao consigo', 'nao devo', 'nao ofereco', 'nao fornec*', 'nao ensin*', 'nao ajud*', 'nao e possivel', 'recuso']);
const VERBOS_DE_PROCEDIMENTO = compilar([
  'adicione', 'misture', 'aqueca', 'aquecer', 'dissolva', 'filtre', 'destile', 'esfrie', 'resfrie', 'goteje', 'gotejar', 'reaja', 'cristalize',
  'seque', 'despeje', 'agite', 'misturar lentamente', 'junte', 'ferva',
]);

/**
 * A RESPOSTA gerada parece ensinar a produzir/obter algo perigoso? Uma resposta que descreve perigos ou recusa o pedido passa;
 * passos de procedimento (verbos no imperativo, lista numerada) junto de um alvo, ou produção sem contexto de proteção, reprovam.
 * Devolve { viola, categoria }.
 */
export function respostaViolaSeguranca(resposta) {
  const texto = String(resposta ?? '');
  const p = preparar(texto);
  const protecao = algum(p, PROTECAO_FORTE) || algum(p, PROTECAO_BRANDA);
  const cat = CATEGORIAS.find((c) => temAlvo(p, c));
  if (!cat) {
    if ((todos(p, ...DANO_ENVENENAR) || todos(p, ...DANO_MATAR)) && !algum(p, SEM_DANO)) return { viola: true, categoria: 'dano_a_pessoa' };
    return { viola: false, categoria: null };
  }
  const recusa = algum(p, FRASES_DE_RECUSA);
  const passos = (texto.match(/^\s*(?:\d{1,2}[.)]|[-•*])\s+\S/gm) ?? []).length;
  const verbos = VERBOS_DE_PROCEDIMENTO.filter((v) => casa(p, v)).length;
  if (verbos >= 2 || (passos >= 2 && verbos >= 1)) return { viola: true, categoria: cat.id };
  if (!recusa && algum(p, ACAO_FORTE) && !protecao) return { viola: true, categoria: cat.id };
  return { viola: false, categoria: null };
}
