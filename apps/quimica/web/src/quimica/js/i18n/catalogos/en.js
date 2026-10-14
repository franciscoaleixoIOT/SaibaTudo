// English catalogue. Same keys as pt-BR (checked by test). Glossary and style: docs/I18N.md §8. Initial translation by agent: "revisao: 'pendente'" until a native speaker reviews it.
const MARCA = 'SaibaTudo Química';

export default {
  revisao: 'pendente',
  regras: { minusculaNoMeio: true },

  ui: {
    idiomas: { 'pt-BR': 'Portuguese', en: 'English', es: 'Spanish', de: 'German', fr: 'French' },
    listas: { e: ' and ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo Química — periodic table, compounds and calculators with open data',
      descricao: 'Interactive periodic table, element and compound sheets with 2D structures, step-by-step calculators (molar mass, balancing, stoichiometry, pH, ideal gas) and chemical safety. Open data, works offline and nothing leaves your device.',
      ogLocale: 'en_US',
      pular: 'Skip to content'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo Química',
      carregando: 'Loading SaibaTudo Química…',
      abas: { inicio: 'Home', tabela: 'Periodic table', compostos: 'Compounds', calculadoras: 'Calculators', seguranca: 'Safety' },
      secoes: 'Sections',
      marcaAria: 'SaibaTudo Química, home',
      marcaSub: 'Open data, calculations on your device',
      configuracoes: 'Settings',
      idioma: 'Language',
      rodape: { sobre: 'About the data', privacidade: 'Privacy', configuracoes: 'Settings', projeto: 'Independent, open-source project (MIT). No ads, login or trackers.' },
      naoEncontrada: { titulo: 'Page not found', texto: 'This address does not exist in SaibaTudo Química.', inicio: 'Go to the home page' },
      erro: { titulo: 'Error', cabecalho: 'Something went wrong', texto: 'This screen could not be built ({msg}).', inicio: 'Go to the home page' },
      erroDados: { titulo: 'The data could not be loaded', complemento: '{msg}. Check your connection; after the first load the app works offline.', tentar: 'Try again' },
      avisoAssinatura: 'The digital signature of the data package does not match. The site\'s own data is still in use, but it was not authenticated: do not rely on critical values.',
      dadosAtualizados: 'Data updated. Reload the page to use the new version on every screen.',
      novaVersao: 'A new version of the app was installed. Close and reopen (or reload) to use it.',
      idiomaTrocado: 'Language changed. The conversation context was cleared.'
    },
    prefs: {
      tema: { SISTEMA: 'Follow the system', CLARO: 'Light', ESCURO: 'Dark' },
      fonte: { PEQUENA: 'Small', NORMAL: 'Normal', GRANDE: 'Large', MUITO_GRANDE: 'Very large' }
    },
    install: {
      ios: { titulo: 'Install on iPhone or iPad', passos: ['Open this page in Safari.', 'Tap Share (the square with the arrow pointing up).', 'Choose "Add to Home Screen" and confirm with "Add".'] },
      geral: {
        titulo: 'Install the app',
        passos: [
          'In Chrome or Edge (Windows, Mac, Linux, Android), use the "Install app" button on this page or the install icon in the address bar.',
          'In the browser menu, choose "Install SaibaTudo Química" (or "Add to home screen").',
          'Once installed, the app opens in its own window and also works without internet (with the data already loaded).'
        ]
      }
    },
    componentes: {
      fonte: 'Source: ',
      palavraSinal: 'Signal word: ',
      pictogramasAria: 'Hazard pictograms',
      frasesAria: 'Hazard statements (H)',
      fraseIndisponivel: 'Statement text not available in this package.',
      passoAPasso: 'Step by step',
      fraseEmIdioma: '(text in {idioma})'
    },
    molecula: {
      aria: '2D structure of {nome}',
      erroDesenho: 'This structure could not be drawn.',
      erroSmiles: 'The SMILES of this structure could not be interpreted.',
      erroBiblioteca: 'The drawing library is not available right now (offline?). The SMILES is still listed on the sheet.'
    },
    nomes: {
      emIdioma: '{nome} (name in {idioma})',
      nomeEmIdioma: 'Name in {idioma}'
    },
    inicio: {
      titulo: 'Home',
      cabecalho: 'Ask about Chemistry',
      intro: 'Elements, compounds, step-by-step calculations and chemical safety. Answers come from open data and from calculations made on your device.',
      campoAria: 'Ask about Chemistry',
      placeholder: 'E.g.: molar mass of water, Fe + O2 -> Fe2O3, pH of HCl 0.01 mol/L',
      exemplosAria: 'Example questions',
      badge: 'Nothing leaves your device unless you ask the cloud AI.',
      explore: 'Explore',
      cartoes: {
        tabela: { titulo: 'Periodic table', descricao: 'Colours by category, filters by block, period, group and state.' },
        compostos: { titulo: 'Compounds', descricao: 'Search by name, formula, CAS or CID and see the 2D structure.' },
        calculadoras: { titulo: 'Calculators', descricao: 'Molar mass, balancing, stoichiometry, concentration, pH, ideal gas and units.' },
        seguranca: { titulo: 'Safety', descricao: 'GHS pictograms, H statements and how to avoid dangerous mixtures.' },
        sobre: { titulo: 'About the data', descricao: 'Sources, licences, dates and digital signature check.' }
      },
      historico: { ultima: 'Last question', anterior: 'Previous question', proxima: 'Next question or empty box' },
      limpar: 'Clear text',
      analisando: 'Analysing',
      analisandoPergunta: 'Analysing the question…',
      pensando: 'Thinking…',
      perguntar: 'Ask',
      copiada: 'Answer copied.',
      naoCopiou: 'Could not copy in this browser.',
      copiarRodape: 'Sources:',
      relatoTitulo: 'Chemistry: answer to "{pergunta}"',
      relatoCorpo: 'What was wrong or missing in the answer? (Do not include personal data.)\n\nQuestion: {pergunta}',
      respostaAnuncio: 'Answer: {titulo}'
    },
    nuvem: {
      botao: 'Ask the cloud AI',
      nota: 'Sends only the text of this question to our server to interpret it; the answer keeps coming from the data. It may take up to 30 s.',
      notaConferir: 'The answer above was built on your device. If it is not what you wanted, the cloud AI tries to understand the question another way; the answer keeps coming from the data. Only the text of this question is sent. It may take up to 30 s.',
      consultando: 'Asking the cloud AI…',
      mesmaInterpretacao: 'The cloud AI understood the question the same way the app did: the answer above is already the answer to it. If you meant something else, rephrase naming the element, the compound or the property.',
      semOutraInterpretacao: 'The cloud AI found no other way to understand this question. The answer above still stands.',
      indisponivelConferir: 'The cloud AI is unavailable right now or took too long. The answer above still stands; try again in a moment.',
      falhouConferir: 'The cloud AI did not bring another answer right now. The answer above still stands.',
      naoEntendeu: 'The cloud AI did not understand this question either. Try rephrasing it naming the element, the compound (name or formula) or the property.',
      indisponivel: 'The cloud AI is unavailable right now or took too long. Try again in a moment or rephrase naming the element, the compound or the property.',
      falhou: 'The cloud AI could not interpret the question right now. Try rephrasing it naming the element, the compound or the property.',
      quisDizer: 'I could not find that compound in the data. Did you mean:'
    },
    resposta: {
      rotuloRecusa: 'Request refused for safety reasons',
      rotuloResolvida: 'Answer built on your device, from the data',
      rotuloNaoResolvida: 'I could not answer',
      origemNuvem: 'on your device, with the question interpreted by the cloud AI ({modelo})',
      origemAparelho: 'on your device',
      origem: 'Answer built {origem}',
      dadosDe: ' • data package of {data}',
      fechar: 'Close answer',
      tambem: 'You can also ask',
      fontes: 'Sources and licences ({n})',
      copiar: 'Copy answer',
      relatar: 'Report a problem with this answer'
    },
    tabela: {
      titulo: 'Periodic table',
      intro: 'Tap an element to see all its properties, with units and sources. Colours show the category; filter by block, period, group or physical state.',
      buscar: 'Search',
      placeholder: 'Name, symbol or number',
      filtrosAria: 'Periodic table filters',
      bloco: 'Block', blocoN: 'Block {b}', periodo: 'Period', periodoN: 'Period {p}', grupo: 'Group', grupoN: 'Group {g}', estado: 'Standard state', todos: 'All',
      estados: { solido: 'Solid', liquido: 'Liquid', gas: 'Gas' },
      limpar: 'Clear filters',
      legendaAria: 'Categories (tap to filter)',
      contagemTodos: '{n} elements',
      contagemFiltro: '{n} of {total} elements match the filters',
      regiaoAria: 'Periodic table (scroll sideways on narrow screens)',
      vazio: 'Element data is not available.',
      rotuloElemento: '{nome}, symbol {simbolo}, atomic number {z}, {categoria}, {estado}'
    },
    elemento: {
      naoEncontrado: 'Element not found',
      naoHa: 'There is no "{simbolo}" in the data.',
      abrirTabela: 'Open the periodic table',
      voltar: 'Periodic table',
      nomeEmIngles: 'Name in English',
      incerteza: 'Atomic mass uncertainty',
      sub: 'Element {z} · {categoria} · {estado} at standard conditions',
      propriedades: 'Properties',
      compostosCom: 'Compounds containing {nome}',
      buscarCompostosDe: 'Search compounds of {nome}',
      mostrando: (p) => (p.n === 1 ? 'Showing one compound from the index; use the compound search to see more.' : `Showing ${p.n} compounds from the index; use the compound search to see more.`),
      calcular: 'Calculate',
      massaMolarDe: 'Molar mass of {nome}'
    },
    compostos: {
      titulo: 'Compounds',
      intro: 'Search by name, common name, IUPAC name, formula, CAS number or PubChem CID.',
      placeholder: 'Name, formula, CAS or CID (e.g.: aspirin, H2SO4, 64-17-5)',
      buscar: 'Search compound',
      buscando: 'Searching…',
      semIndice: 'The compound index is not available.',
      erro: 'The compounds could not be loaded ({msg}).',
      resultados: (p) => `${p.n} result${p.n > 1 ? 's' : ''}`,
      nenhum: 'No compound found for "{q}".',
      total: '{n} compounds in the package, in alphabetical order.',
      faixa: 'Showing {de}–{ate} of {n}.',
      pagina: 'Page {p} of {total}',
      anterior: 'Previous page',
      proxima: 'Next page',
      paginacao: 'Result pages',
      cas: 'CAS {cas}',
      naoEncontrado: 'Compound not found',
      naoHa: 'This compound is not in the data package.',
      buscarCompostos: 'Search compounds',
      cid: 'CID {cid}',
      voltar: 'Compounds',
      nomePopular: 'Common name',
      nomeIupac: 'IUPAC name',
      nomePt: 'Name in Portuguese',
      nomePtPendente: 'pending: the name shown is the IUPAC name',
      sinonimos: 'Synonyms',
      formula: 'Formula',
      formulaHill: 'Formula (Hill notation)',
      cidPubchem: 'PubChem CID',
      smiles: 'SMILES',
      wikidata: 'Wikidata',
      dados: 'Compound data',
      fontePubchem: 'PubChem CID {cid} (NCBI/NLM)',
      estrutura: '2D structure',
      desenhada: 'Drawn on your device from the SMILES in the data package, with SmilesDrawer (MIT).',
      seguranca: 'Safety',
      classificacaoGhs: 'Hazard classification (GHS)',
      fonteFrases: 'Hazard statements: UNECE GHS / ECHA CLP',
      semGhs: 'The package has no harmonised GHS classification for this compound. That does not mean it is harmless: check the product\'s safety data sheet.',
      icsc: 'ICSC card on the ILO website',
      comoLer: 'How to read pictograms and H statements',
      definicao: 'Definition (ChEBI)',
      definicaoFonte: 'Definition in English. Source: ',
      chebi: 'ChEBI ({id})',
      chebiSem: 'ChEBI (EMBL-EBI)',
      calcular: 'Calculate',
      massaMolarDe: 'Molar mass of {formula}',
      perguntar: 'Ask about this compound',
      perguntaPerigos: 'Hazards of {nome}'
    },
    calculadoras: {
      titulo: 'Calculators',
      intro: 'Every result shows the steps and the formulas. Everything is calculated on your device; atomic masses and constants come from the signed data package.',
      naoEncontrada: 'Calculator not found',
      verTodas: 'See all calculators',
      voltar: 'Calculators',
      resultadoAria: 'Result',
      passoAPasso: 'Step by step',
      exemplosAria: 'Examples',
      unidadeDe: 'Unit of {rotulo}',
      lista: {
        'massa-molar': { titulo: 'Molar mass', descricao: 'Sum of the atomic masses from the data package, with percent composition.' },
        balanceamento: { titulo: 'Equation balancing', descricao: 'Exact linear algebra, with ions and steps.' },
        estequiometria: { titulo: 'Stoichiometry', descricao: 'Mass, moles, particles and volume (STP); limiting reagent.' },
        concentracao: { titulo: 'Concentration and dilution', descricao: 'Molarity, g/L, percentages and C₁V₁ = C₂V₂.' },
        ph: { titulo: 'pH', descricao: 'Strong and weak acids and bases (with Ka or Kb) and conversions.' },
        'gas-ideal': { titulo: 'Ideal gas', descricao: 'PV = nRT with the R constant from the package (CODATA).' },
        unidades: { titulo: 'Unit conversion', descricao: 'Pressure, volume, mass, temperature, energy and more.' }
      },
      massaMolar: {
        formula: 'Chemical formula', placeholder: 'E.g.: Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3', ajuda: 'Parentheses, hydrates with "·" (or "."), charges at the end: Fe3+, SO4^2-.',
        fichaDe: 'sheet of {nome}', calcular: 'Calculate molar mass'
      },
      balanceamento: {
        equacao: 'Chemical equation', placeholder: 'E.g.: Fe + O2 -> Fe2O3',
        ajuda: 'Separate substances with "+" and use "->" or "→". Ions work: Zn + Cu2+ -> Zn2+ + Cu. States (s), (l), (g), (aq) are ignored.',
        conferencia: 'Check: atoms of each element (and charge) on both sides', elemento: 'Element', reagentes: 'Reactants', produtos: 'Products', igual: 'Equal?', carga: 'charge', sim: 'yes', nao: 'no',
        coeficientesIgnorados: 'The typed coefficients were ignored: the app balances the whole equation.', balancear: 'Balance'
      },
      estequiometria: {
        modo: 'What do you want to do?', conv: 'Convert mass, moles, particles and volume (STP) of one substance', reacao: 'Reaction: limiting reagent and amount of products',
        substancia: 'Substance (formula)', placeholderSubstancia: 'E.g.: H2O, CO2, NaCl', quantidade: 'Amount',
        ajudaQuantidade: 'L and mL = volume of an ideal gas at STP (0 °C and 1 atm). "particles" = molecules, atoms or ions.', particulas: 'particles',
        equacao: 'Chemical equation', placeholderEquacao: 'E.g.: H2 + O2 -> H2O', ajudaEquacao: 'The app balances the equation. Give the amount of at least one substance.',
        rendimento: 'Yield (%)', ajudaRendimento: 'Optional. 100 % = theoretical yield.', quantidadeDe: 'Amount of {formula}', calcular: 'Calculate',
        tabelaTitulo: 'Amounts of each substance', tabelaLegenda: 'Reactants: initial, consumed and remaining amounts; products: formed',
        cabecalho: ['Substance', 'Role', 'Coef.', 'M (g/mol)', 'Mol', 'Mass (g)', 'Particles', 'Volume STP (L)'],
        produto: 'product', limitante: 'limiting reagent', reagente: 'reactant'
      },
      concentracao: {
        tipo: 'Type of calculation', soluto: 'Solute (formula)', exNaCl: 'E.g.: NaCl', exNaOH: 'E.g.: NaOH', massaSoluto: 'Mass of solute', volumeSolucao: 'Volume of solution',
        concentracaoDesejada: 'Desired concentration', valorConcentracao: 'Concentration value', converter: 'Convert', glParaMol: 'g/L → mol/L', molParaGl: 'mol/L → g/L',
        massaSolucao: 'Mass of solution', unidadeConcentracao: 'Concentration unit', unidadeVolume: 'Volume unit',
        c1: 'C₁ (initial concentration)', v1: 'V₁ (initial volume)', c2: 'C₂ (final concentration)', v2: 'V₂ (final volume)',
        deixeEmBranco: 'Leave blank the field you want to calculate.', calcular: 'Calculate'
      },
      ph: {
        tipo: 'Type of solution', concentracao: 'Concentration (mol/L)', ex001: 'E.g.: 0.01', ex01: 'E.g.: 0.1', hLiberados: 'H⁺ released per formula unit', ohLiberados: 'OH⁻ released per formula unit',
        ajudaN: 'HCl = 1; H₂SO₄ = 2 (school model); NaOH = 1; Ca(OH)₂ = 2.', kaOuPka: 'Ka or pKa', kbOuPkb: 'Kb or pKb', exK: 'E.g.: 1.8e-5',
        ajudaK: 'Scientific notation: 1.8e-5 or 1.8 x 10^-5.', valorInformado: 'The value given is', valorConhecido: 'Known value', hMolL: '[H⁺] (mol/L)', ohMolL: '[OH⁻] (mol/L)',
        valor: 'Value', calcular: 'Calculate pH'
      },
      gas: {
        calcular: 'Calculate', volume: 'Volume (V)', pressao: 'Pressure (P)', quantidade: 'Amount of substance (n)', temperatura: 'Temperature (T)',
        formulaGas: 'Gas formula', exCO2: 'E.g.: CO2', massaGas: 'Mass of gas', usarMassa: 'Give the mass and formula of the gas instead of n', botao: 'Calculate'
      },
      unidades: {
        grandeza: 'Quantity', valor: 'Value', ex5: 'E.g.: 5', de: 'From', para: 'To', converter: 'Convert', inverter: 'Swap', equivaleA: '{valor} {de} equals',
        grandezas: { massa: 'Mass', volume: 'Volume', comprimento: 'Length', pressao: 'Pressure', energia: 'Energy', temperatura: 'Temperature', tempo: 'Time', quantidade: 'Amount of substance', concentracao: 'Concentration' }
      }
    },
    seguranca: {
      titulo: 'Chemical safety',
      intro: 'How to read the hazard warnings on chemical products. The app shows the GHS classification of the compounds in the data package and takes you to the official cards; it does not teach how to produce dangerous substances.',
      aviso: 'For safety, the app refuses requests for synthesis, purification or homemade recipes of explosives, chemical weapons, illicit drugs and other dangerous reagents. Questions about hazards, PPE, storage and first aid are answered.',
      verPerigos: 'See the hazards of a compound', buscar: 'Search compound', placeholderBusca: 'Compound name, formula or CAS', verPictogramas: 'See hazards and pictograms',
      pictogramas: 'GHS pictograms',
      pictogramasIntro: 'The GHS (the UN\'s Globally Harmonized System) uses red-bordered diamonds. The drawings below are simplified versions made for this app.',
      palavraSinal: 'Signal word', perigo: 'Danger', atencao: 'Warning',
      sinalTexto1: ' marks the more severe categories; ', sinalTexto2: ' marks the less severe ones. Lower-hazard substances may come without a signal word.',
      comoLer: 'How to read H statements', frasesIntro: 'Each hazard statement has a code: the letter H and three digits. The first digit tells the type of hazard:',
      codigosSomados: 'Combined codes, such as H302+H312, join the statements into one. Texts: UNECE GHS / ECHA CLP, in English.',
      procurarFrase: 'Find a statement', placeholderFiltro: 'Filter by code or word (e.g.: H314, flammable)', nenhumaFrase: 'No statement found.',
      boasPraticas: 'Good practices', fontesOficiais: 'Official sources (external links)',
      links: [
        ['International Chemical Safety Cards (ICSC), ILO/WHO', 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', 'Cards by substance (the app does not copy the cards: it only points to them).'],
        ['PubChem: GHS classification of compounds', 'https://pubchem.ncbi.nlm.nih.gov/ghs/', 'Explains the source of the classification used in this app.'],
        ['UNECE: transport of dangerous goods and GHS', 'https://unece.org/transport/dangerous-goods', 'Origin of the UN Globally Harmonized System (GHS).']
      ]
    },
    perigos: {
      pictogramas: {
        GHS01: 'Explosive', GHS02: 'Flammable', GHS03: 'Oxidising', GHS04: 'Gas under pressure', GHS05: 'Corrosive',
        GHS06: 'Acute toxicity (toxic or fatal)', GHS07: 'Harmful, irritant or sensitising', GHS08: 'Serious health hazard', GHS09: 'Hazardous to the aquatic environment'
      },
      descricoes: {
        GHS01: 'explosives, self-reactive substances and organic peroxides',
        GHS02: 'flammables, pyrophorics, self-heating substances or substances that release flammable gases in contact with water',
        GHS03: 'oxidisers', GHS04: 'gases under pressure',
        GHS05: 'corrosive to metals, causing skin burns and serious eye damage', GHS06: 'acute toxicity (fatal or toxic)',
        GHS07: 'moderate acute toxicity (harmful), skin and eye irritation, skin sensitisation and respiratory tract irritation',
        GHS08: 'carcinogenicity, mutagenicity, reproductive toxicity, respiratory sensitisation, target-organ toxicity and aspiration hazard',
        GHS09: 'hazardous to the aquatic environment'
      },
      grupos: [
        { faixa: 'H2xx', titulo: 'Physical hazards', descricao: 'explosives, flammables, oxidisers, gases under pressure, corrosive to metals (H200 to H290).' },
        { faixa: 'H3xx', titulo: 'Health hazards', descricao: 'acute toxicity, skin and eye corrosion and irritation, sensitisation, mutagenicity, carcinogenicity, reproductive and target-organ toxicity (H300 to H373).' },
        { faixa: 'H4xx', titulo: 'Environmental hazards', descricao: 'toxicity to aquatic organisms and to the ozone layer (H400 to H420).' }
      ],
      sinal: { perigo: 'Danger', atencao: 'Warning' }
    },
    sobre: {
      titulo: 'About the data',
      intro: 'Every number shown comes from the signed data package or from a calculation made on your device. The optional cloud AI only interprets the question and never provides numbers.',
      pacote: 'Data package', versao: 'Version', geradoEm: 'Generated on', assinatura: 'Digital signature', origem: 'Origin', arquivos: 'Files', arquivosValor: '{n} ({kb} KB in total)',
      elementos: 'Elements', compostos: 'Compounds in the index', ultimaVerificacao: 'Last check', avisosCarga: 'Loading warnings: {msgs}',
      dados: 'Data in the package', textos: 'Licensed texts (explanations)', externas: 'External references (links)', licencasManifesto: 'Licences listed in the manifest',
      comoObtidos: 'How the values are obtained',
      como: [
        'Elements, compounds, constants and rules: versioned JSON files, with SHA-256 checked and a signed manifest.',
        'Molar mass, balancing, stoichiometry, concentration, pH, ideal gas and units: tested deterministic code, on your device.',
        '2D structure: drawn from the SMILES in the package. GHS pictograms: simplified drawings made for this app.',
        'Explanation excerpts: quoted with source and licence; automatic translations are flagged as such.'
      ],
      bibliotecas: 'Open-source libraries',
      rodape: 'SaibaTudo is independent and open source (MIT). ', privacidade: 'Privacy policy',
      mantenedor: 'Maintainer: {x}', licenca: 'Licence: {x}', acessadoEm: 'Accessed on: {x}', atribuicao: 'Attribution: {x}', uso: 'Use: {x}',
      somenteLink: 'link only',
      referencias: {
        openstax: 'Open textbook with use restrictions: suggested as reading; no excerpt was copied.',
        icsc: 'Cards by substance; the "ICSC card on the ILO website" button opens the search by CAS.',
        nist: 'Thermochemical data and spectra; suggested as a reference.',
        libretexts: 'Open chemistry texts; suggested as complementary reading.'
      },
      bibliotecasUso: { katex: 'Formulas and calculation steps', smiles: '2D structure of molecules', poppins: 'Heading font' },
      assinaturaRotulo: {
        verificada: 'verified (ECDSA P-256 with the app\'s public key)',
        invalida: 'does NOT match: the site\'s own data is still in use, but it was not authenticated',
        indisponivel: 'could not be verified in this browser (WebCrypto requires HTTPS)'
      },
      origemRotulo: {
        verificada: 'site (digital signature verified)', invalida: 'site (signature NOT verified)', indisponivel: 'site (verification unavailable in this browser)',
        atualizada: 'verified update (digital signature)'
      },
      sigDetalhe: { invalida: 'The manifest signature does not match; using the site\'s own files.', indisponivel: 'The browser does not offer WebCrypto in this context (use HTTPS).' },
      atualizacao: {
        botao: 'Check for data updates', verificando: 'Checking…', atual: 'The data is already at the latest version.', atualizado: 'Data updated to version {version}.',
        ignorado: 'Nothing to do: {motivo}', falha: 'Could not check right now ({motivo}).',
        motivos: {
          semVerificacao: 'signature verification unavailable (HTTPS required)', assinaturaInvalida: 'INVALID manifest signature — update rejected',
          maisAntigo: 'the remote package is older than the active one (anti-rollback)'
        }
      }
    },
    config: {
      titulo: 'Settings', salva: 'Preference saved on this device.', aparencia: 'Appearance', tema: 'Theme', tamanhoTexto: 'Text size', idioma: 'Language',
      idiomaAjuda: 'Changes the interface, the answers and the question interpreter. Names and texts that do not exist yet in the language appear in English or Portuguese, always labelled.',
      instalar: 'Install', jaInstalado: 'The app is already installed on this device.', instalarApp: 'Install app',
      ia: 'Cloud artificial intelligence',
      iaAviso: 'Optional and off by default. It only interprets the question: the answer keeps coming from the data and the calculations on this device, and no number comes from the model. When you tap "Ask the cloud AI", only the text of that question and a random code of this installation are sent to our server.',
      nuvemAutomatica: 'Automatic cloud AI',
      nuvemAutomaticaAjuda: 'When the app does not understand a question, send it to the cloud AI without asking. Only the text of the question is sent; answers keep coming from the data.',
      dados: 'Data', versaoPacote: 'Package version', assinatura: 'Signature',
      assinaturaValor: { verificada: 'verified', invalida: 'NOT verified', indisponivel: 'unavailable in this browser' },
      privacidade: 'Privacy', privacidadeTexto: 'We keep on this device only the theme, the text size and the language, plus the cache for offline use. ', politica: 'Privacy policy',
      apagar: 'Delete the data on this device', confirmar: 'Tap again to confirm', apagados: 'Data deleted. Reloading…'
    }
  },

  propriedades: {
    rotulos: {
      numeroAtomico: 'atomic number', massaAtomica: 'atomic mass', simbolo: 'symbol', grupo: 'group (family)', periodo: 'period', bloco: 'block', categoria: 'category',
      configuracaoEletronica: 'electron configuration', eletronegatividade: 'electronegativity (Pauling)', raioAtomicoPm: 'atomic radius (van der Waals)',
      afinidadeEletronicaKJmol: 'electron affinity', energiaIonizacaoKJmol: 'ionization energy', pontoFusaoK: 'melting point', pontoEbulicaoK: 'boiling point',
      densidadeKgm3: 'density', estadoPadrao: 'physical state (standard conditions)', estadosOxidacao: 'oxidation states', descoberta: 'discovery',
      massaMolar: 'molar mass', massaExata: 'exact mass (monoisotopic)', formula: 'formula', cas: 'CAS number', cid: 'PubChem CID', smiles: 'SMILES', inchiKey: 'InChIKey',
      nomeIupac: 'IUPAC name', xlogp: 'XLogP (computed lipophilicity)', doadoresH: 'hydrogen bond donors', aceptoresH: 'hydrogen bond acceptors',
      ligacoesRotaveis: 'rotatable bonds', carga: 'electric charge', tpsa: 'polar surface area (TPSA)'
    },
    categorias: {
      metal_alcalino: 'alkali metal', metal_alcalino_terroso: 'alkaline earth metal', metal_transicao: 'transition metal', metal_pos_transicao: 'post-transition metal',
      semimetal: 'metalloid', nao_metal: 'non-metal', halogenio: 'halogen', gas_nobre: 'noble gas', lantanideo: 'lanthanide', actinideo: 'actinide',
      desconhecida: 'unknown chemical properties', metal: 'metal'
    },
    categoriasPlural: {
      metal_alcalino: 'alkali metals', metal_alcalino_terroso: 'alkaline earth metals', metal_transicao: 'transition metals', metal_pos_transicao: 'post-transition metals',
      semimetal: 'metalloids', nao_metal: 'non-metals', halogenio: 'halogens', gas_nobre: 'noble gases', lantanideo: 'lanthanides', actinideo: 'actinides', metal: 'metals'
    },
    estados: { solido: 'solid', liquido: 'liquid', gas: 'gas', desconhecido: 'unknown' },
    descoberta: { em: 'in {ano}', por: 'by {por}' },
    classes: {
      acido: 'acid', acido_carboxilico: 'carboxylic acid', base: 'base', sal: 'salt', oxido: 'oxide', hidroxido: 'hydroxide', peroxido: 'peroxide', oxidante: 'oxidiser',
      inorganico: 'inorganic', organico: 'organic', alcool: 'alcohol', fenol: 'phenol', aldeido: 'aldehyde', cetona: 'ketone', eter: 'ether', ester: 'ester', amina: 'amine', amida: 'amide',
      alcano: 'alkane', alqueno: 'alkene', alquino: 'alkyne', hidrocarboneto: 'hydrocarbon', aromatico: 'aromatic', heterociclico: 'heterocyclic', halogenado: 'halogenated compound',
      carboidrato: 'carbohydrate', aminoacido: 'amino acid', lipidio: 'lipid', proteina: 'protein', vitamina: 'vitamin', farmaco: 'drug (pharmaceutical)', solvente: 'solvent', polimero: 'polymer',
      gas: 'gas', metal: 'metal', nitrocomposto: 'nitro compound', nitrila: 'nitrile', tiol: 'thiol', sulfonato: 'sulfonate', organometalico: 'organometallic', ionico: 'ionic compound',
      molecular: 'molecular compound', esteroide: 'steroid', alcaloide: 'alkaloid', acido_forte: 'strong acid', base_forte: 'strong base', organoclorado: 'organochlorine'
    },
    unidades: {
      kg: 'kilogram', g: 'gram', t: 'tonne', lb: 'pound', oz: 'ounce', 'µg': 'microgram', m3: 'cubic metre', L: 'litre', cm3: 'cubic centimetre', dm3: 'cubic decimetre',
      'µL': 'microlitre', gal: 'gallon (US)', m: 'metre', 'Å': 'ångström', in: 'inch', ft: 'foot', mi: 'mile', Pa: 'pascal', bar: 'bar', atm: 'atmosphere', mmHg: 'millimetre of mercury',
      psi: 'pound-force per square inch', J: 'joule', cal: 'thermochemical calorie', eV: 'electronvolt', kWh: 'kilowatt-hour', K: 'kelvin', '°C': 'degree Celsius', '°F': 'degree Fahrenheit',
      s: 'second', min: 'minute', h: 'hour', d: 'day', mol: 'mole', 'mol/L': 'mole per litre', 'mmol/L': 'millimole per litre', 'µmol/L': 'micromole per litre'
    }
  },

  respostas: {
    fontes: {
      app: 'SaibaTudo Química (this app)',
      calculo: 'Local calculation by the app, with data from the signed package',
      pacote: 'Data package',
      frasesPadrao: 'Hazard statements: UNECE GHS / ECHA CLP',
      regras: 'regras.json (signed data package)',
      politica: 'App safety policy (local rules)',
      pubchemCid: 'PubChem CID {cid} (NCBI/NLM)',
      chebi: 'ChEBI ({id})', chebiSem: 'ChEBI (EMBL-EBI)',
      constanteR: 'Local calculation with the R constant from the package (CODATA)',
      tabelaUnidades: 'Unit table: {origem}',
      orientacaoGeral: 'General guidance from the app (not data about a specific substance)',
      massasAtomicas: 'Atomic masses from the data package (elementos.json)',
      constantes: 'Constants from the data package (constantes.json)',
      boyle: 'Local calculation by the app, with the unit table from the data package',
      wikipedia: 'Wikipedia in {idioma}',
      trechoEm: 'Text in {idioma} (not yet translated).'
    },
    unidades: {
      origem: { pacote: 'regras.json (signed data package)', padrao: 'the app\'s default table (SI definitions)' },
      pKw: { regras: 'regras.json (data package)', constantes: 'constantes.json (data package)', convencao: 'convention at 25 °C (ionic product of water, pH + pOH = 14)' },
      constanteRDerivada: 'Universal gas constant (N_A × k_B)'
    },
    sugestoes: {
      padrao: [
        'What is the molar mass of water?', 'Balance Fe + O2 -> Fe2O3', 'pH of HCl 0.01 mol/L', 'Structure of aspirin', 'Hazards of sulfuric acid', 'Convert 5 atm to kPa',
        'How many moles are in 18 g of water?', 'Melting point of iron', 'Elements in group 17', 'What is a mole?', 'Why not mix bleach with ammonia?'
      ],
      seguras: ['Which PPE should I use with sulfuric acid?', 'First aid for a caustic soda splash in the eye', 'Why not mix bleach with ammonia?'],
      massaAgua: 'What is the molar mass of water?', balancear: 'Balance Fe + O2 -> Fe2O3', phHcl: 'pH of HCl 0.01 mol/L', perigosSulfurico: 'Hazards of sulfuric acid',
      converter: 'Convert 5 atm to kPa', molsAgua: 'How many moles are in 18 g of water?', fusaoFerro: 'Melting point of iron', grupo17: 'Elements in group 17', periodo3: 'Elements in period 3',
      misturar: 'Why not mix bleach with ammonia?', fontes: 'What are the sources?', origemDados: 'Where does the data come from?', massaMolarAgua: 'Molar mass of water',
      formulaSulfurico: 'What is the formula of sulfuric acid?', compareNaCl: 'Compare sodium and chlorine', maisEletronegativo: 'Most electronegative element',
      molaridade: 'Molarity of 5.85 g of NaCl in 500 mL', volumeGas: 'What is the volume of 2 moles of gas at 300 K and 1 atm?',
      fusaoDe: 'Melting point of {nome}', configuracaoDe: 'Electron configuration of {nome}', massaMolarDe: 'Molar mass of {nome}', estruturaDe: 'Structure of {nome}',
      perigosDe: 'Hazards of {nome}', densidadeDe: 'Density of {nome}'
    },
    orientacaoGeral: [
      'Read the label and the safety data sheet (SDS) of the product before use and follow the manufacturer\'s instructions.',
      'Wear gloves and safety goggles compatible with the product and work in a ventilated place.',
      'Do not mix chemicals; keep them in the original container, tightly closed, away from children, food and heat sources.',
      'On contact with skin or eyes, rinse with plenty of running water; if inhaled, go into fresh air; do not induce vomiting without professional guidance.',
      'In any poisoning or accident, seek medical care or your regional poison control centre, taking the product packaging with you.'
    ],
    blocos: {
      palavraSinal: 'Signal word: {x}', estrutura2d: '2D structure of {nome}', passoAPasso: 'Step by step', comoCalcular: 'How to calculate', comoConverter: 'How to convert'
    },
    erro: { titulo: 'I could not build this answer', texto: 'A problem occurred while reading the data ({msg}). Try again or use the app screens.' },
    recusa: {
      tituloAutolesao: 'You are not alone', titulo: 'I cannot help with this request',
      padrao: 'I cannot help with that. SaibaTudo Química does not provide instructions for the synthesis, purification, scale-up or homemade recipes of explosives, chemical weapons, illicit drugs, their precursors or other dangerous reagents, because they can cause deaths and serious injuries.',
      alternativas: 'I can help with safety and knowledge: hazards, personal protective equipment (PPE), storage, disposal and first aid for a substance; properties, formula, molar mass and structure; chemistry calculations and concepts.',
      DANO_A_PESSOAS: 'I cannot help with that. I do not give guidance on how to hurt, poison or intoxicate people or animals. If someone is in danger or has been exposed to a substance, contact an emergency service or your regional poison control centre immediately.',
      AUTOLESAO: 'I am sorry you are going through this. I cannot give guidance on this subject, but you are not alone: reach out now to someone you trust and to an emergency service in your area. In Brazil, the Centro de Valorização da Vida (CVV) talks to anyone, free of charge and confidentially, at https://cvv.org.br; elsewhere, look for your local crisis line.',
      categorias: {
        EXPLOSIVOS: 'explosives', ARMAS_QUIMICAS: 'chemical weapons', DROGAS: 'illicit drugs', PRECURSORES: 'drug or weapon precursors',
        REAGENTES_CASEIROS: 'homemade recipes with dangerous reagents', DANO_A_PESSOAS: 'harm to people', AUTOLESAO: 'risk to one\'s own life'
      }
    },
    ajuda: {
      titulo: 'What SaibaTudo Química does',
      texto: 'I answer chemistry questions with open data and calculations made on your device: nothing leaves your phone or computer.',
      podePerguntar: 'You can ask about',
      itens: [
        'elements and the periodic table (properties, groups, periods)', 'compounds (formula, molar mass, 2D structure and GHS hazards)',
        'calculations with steps: molar mass, balancing, stoichiometry, concentration and dilution, pH, ideal gas and units',
        'safety: pictograms, hazard statements and how to avoid dangerous mixtures', 'basic concepts, with quoted excerpts from open sources'
      ],
      aviso: 'I do not help with the synthesis, purification or recipes of explosives, chemical weapons, illicit drugs and other dangerous reagents.',
      tabela: 'Periodic table', calculadoras: 'Calculators'
    },
    sobreDados: {
      titulo: 'About the data in this app', versao: 'Data package version', geradoEm: 'Generated on', assinatura: 'Digital signature (ECDSA P-256)',
      sig: { verificada: 'verified', invalida: 'NOT verified', indisponivel: 'could not be verified in this browser' },
      elementos: 'Elements in the package', compostos: 'Compounds in the index', fontesListadas: 'Sources listed',
      texto: 'The full list of sources, licences and dates is on the "About the data" screen. Every value shown comes from the signed package or from a local calculation.',
      acao: 'See all sources and licences'
    },
    fontesResp: { titulo: 'Data sources', usa: 'The data package uses', semLista: 'The list of sources is on the "About the data" screen.', acao: 'About the data' },
    naoEntendi: {
      titulo: 'I did not understand the question', comPergunta: 'I did not understand "{q}". Try naming an element, a compound, a formula or a calculation, for example:', semPergunta: 'Type your question, for example:',
      tabela: 'Periodic table', compostos: 'Search compounds', calculadoras: 'Calculators'
    },
    elemento: {
      nomeEmIngles: 'Name in English', titulo: '{nome} ({simbolo}), element {z}', ficha: 'Full sheet of {nome}', verTabela: 'See in the periodic table'
    },
    composto: {
      nomePopular: 'Common name', nomeIupac: 'IUPAC name', formula: 'Formula', massaMolar: 'Molar mass', cas: 'CAS number', cid: 'PubChem CID', classes: 'Classes',
      perigosGhs: 'Hazards (GHS)', definicaoIngles: 'Definition in English.', ficha: 'Full sheet', icsc: 'ICSC card on the ILO website', icscDe: 'ICSC card of {nome} on the ILO website'
    },
    propriedade: {
      deQual: 'Of which substance?',
      digaQualElemento: 'Tell me which element or compound you want {props} for. For example: "melting point of iron".',
      digaQualPropriedade: 'Tell me which property and which element or compound. For example: "density of gold".',
      de: '{prop} of {nome}',
      outroTipo: (p) => `${p.prop} (this property belongs to ${p.alvo === 'composto' ? 'compounds' : 'elements'}; ${p.outros} ${p.n > 1 ? 'are' : 'is'} of another type)`,
      naoTem: 'The data package does not have: {lista}.', fichaDe: 'Sheet of {nome}', propriedadesDe: 'Properties of {nomes}'
    },
    massaMolar: {
      tituloElemento: 'Molar mass: {nome} ({simbolo})', deAtomos: 'Molar mass of {nome} (atoms)',
      avisoMolecular: 'For a molecular element, such as O₂ or N₂, type the formula: the molar mass is the atom\'s mass times the number of atoms in the molecule.',
      abrirCalculadora: 'Open in the calculator', deQue: 'Molar mass of what?',
      digite: 'Type the formula or the name of the substance. For example: "molar mass of water" or "molar mass of Ca(OH)2".', calculadora: 'Molar mass calculator',
      naoConsegui: 'I could not calculate the molar mass', composicao: 'Mass composition', referencia: 'Reference value', pubchemInforma: 'PubChem reports',
      titulo: (p) => `Molar mass${p.nome ? `: ${p.nome}` : ''} (${p.formula})`
    },
    balancear: {
      titulo: 'Equation balancing',
      digite: 'Type the equation with the reactants, an arrow and the products. For example: Fe + O2 -> Fe2O3. Ions work too: Zn + Cu2+ -> Zn2+ + Cu.',
      abrir: 'Open the calculator', naoConsegui: 'I could not balance it', ajustar: 'Adjust in the calculator', balanceada: 'Balanced equation',
      coeficientesIgnorados: 'The typed coefficients were ignored: the app balances the whole equation.', abrirNa: 'Open in the calculator'
    },
    estequiometria: {
      abrir: 'Open the stoichiometry calculator', faltam: 'The amounts are missing',
      digaCadaReagente: 'Give the amount of each reactant with its name or formula, for example "4 g of H2 and 16 g of O2".',
      informePeloMenos: 'Give the amount of at least one reactant, for example "4 g of H2 and 16 g of O2".', naoConsegui: 'I could not calculate',
      titulo: 'Stoichiometry: {equacao}', particulas: 'particles', tituloQuantidade: '{valor} {unidade} of {formula}', abrirNa: 'Open in the calculator',
      volumeTitulo: 'Volume of {valor} {unidade} of an ideal gas at STP', volumeCntp: 'Volume at STP (0 °C and 1 atm)', volumeMolar: 'Molar volume (RT/P)',
      passoVolume: 'By the ideal gas equation, the molar volume is Vm = RT/P, with T = 0 °C and P = 1 atm; multiply by the amount of substance.',
      abrirGas: 'Open the ideal gas calculator', tituloGeral: 'Stoichiometry',
      explicacao: 'To convert mass, moles, particles and volume, give the amount and the substance, for example "how many moles are in 18 g of water?". For the limiting reagent, write the equation and the amounts.'
    },
    concentracao: {
      abrir: 'Open the calculator', titulo: 'Concentration and dilution',
      diga: 'Give the values with units. Examples: "molarity of 5.85 g of NaCl in 500 mL", "how many grams of NaOH for 250 mL of 0.1 mol/L solution" or "dilute 100 mL of 2 mol/L solution to 0.5 mol/L".',
      naoConsegui: 'I could not calculate', padrao: 'Concentration',
      modos: { molaridade: 'Molarity of the solution', massa: 'Mass of solute needed', 'gl-mol': 'Conversion g/L ↔ mol/L', 'percentual-mm': 'Mass percentage', 'percentual-mv': 'Mass/volume percentage', diluicao: 'Dilution' }
    },
    ph: {
      abrir: 'Open the pH calculator', conversoes: 'Conversions from {de} = {valor}', titulo: 'pH of a solution',
      informe: 'Give the concentration in mol/L and the substance. Examples: "pH of HCl 0.01 mol/L" or "pH of acetic acid 0.1 mol/L with Ka 1.8e-5".',
      maisDados: 'I need more data for the pH', naoTenho: 'I do not have "{formula}" in the package\'s list of strong acids and bases. ',
      fracos: 'For weak acids and bases, give Ka (or pKa) or Kb (or pKb); for strong ones, write the formula, for example HCl or NaOH.',
      parcial: 'Only the 1st ionization is strong; the 2nd is partial and was ignored (approximation).', naoConsegui: 'I could not calculate the pH',
      tituloResultado: (p) => `pH ${p.ph}${p.formula ? ` (${p.formula} ${p.conc} mol/L)` : ''}`
    },
    gas: {
      abrir: 'Open the ideal gas calculator', tituloEquacao: 'Ideal gas: PV = nRT', naEquacao: 'In the equation',
      variaveis: 'P is the pressure, V is the volume, n is the amount of substance (in moles) and T is the absolute temperature (in kelvin).',
      constante: 'R is the universal gas constant: {valor} J/(mol·K), value from the data package ({fonte}).', constanteSem: 'R is the universal gas constant.',
      informeTres: 'Give three of the four quantities with units and I calculate the fourth, with the steps.', tituloFalta: 'Ideal gas (PV = nRT)',
      informeTresEx: 'Give three of the four quantities (pressure, volume, amount of substance and temperature) with units. Example: "what is the volume of 2 moles of gas at 300 K and 1 atm?".',
      naoConsegui: 'I could not calculate'
    },
    conversao: {
      abrir: 'Open the unit converter', titulo: 'Unit conversion', diga: 'Give the value, the unit and the target unit. Example: "convert 5 atm to kPa".',
      naoConsegui: 'I could not convert', em: '{valor} {de} in {para}'
    },
    nomenclatura: {
      titulo: 'Nomenclature', naoEncontreiFormula: 'I did not find "{formula}" among the compounds in the package.', naoEncontrei: 'I did not find this compound.', tente: ' Try the common name or the formula.',
      buscar: 'Search compounds', nome: 'Name', nomePopular: 'Common name', nomeIupac: 'IUPAC name', formula: 'Formula', formulaHill: 'Formula in Hill notation',
      observacao: 'Note', ptPendente: 'The Portuguese name is still pending; the name shown is the IUPAC name.', ficha: 'Full sheet'
    },
    desenhar: {
      estruturaDe: 'Structure of {nome}', semSmiles: 'The data package has no SMILES for this compound, so I cannot draw the structure.', ficha: 'Full sheet',
      estrutura2d: '2D structure of {nome}', smiles: 'SMILES', formula: 'Formula'
    },
    comparar: {
      titulo: 'Comparison: {nomes}', propriedade: 'Property', fichaDe: 'Sheet of {nome}',
      linhas: { formula: 'Formula', massaMolar: 'Molar mass', cas: 'CAS number', nomeIupac: 'IUPAC name', xlogp: 'XLogP', sinal: 'Signal word (GHS)', pictogramas: 'Pictograms (GHS)' },
      tituloGeral: 'Compare', explicacao: 'Compare items of the same kind: two elements ("compare sodium and chlorine") or two compounds ("difference between ethanol and acetic acid").'
    },
    tabela: {
      abrir: 'Open the periodic table', naoTemProp: 'The package has no {prop} for the loaded elements.',
      extremo: (p) => `${p.dir === 'max' ? 'Highest' : 'Lowest'} ${p.prop} in the package: ${p.nome} (${p.simbolo})`,
      entreOs: 'Among the {n} elements with this datum in the package', elemento: 'Element', simbolo: 'Symbol', nome: 'Name', numero: 'No.',
      grupo: 'group {g}', periodo: 'period {p}', bloco: 'block {b}', estado: '{estado} state', elementos: 'Elements: {criterios}', titulo: 'Periodic table',
      pacoteTem: (p) => `The package has ${p.n} ${p.n === 1 ? 'element' : 'elements'} organised by group, period and block, with colours by category. Tap an element to see its full sheet.`,
      nenhum: 'No element in the package meets these criteria.', destacar: 'Highlight in the periodic table', comContagem: '{titulo} ({n})',
      tendencia: 'Trend: {prop}', tendenciaTexto: 'Values from the data package along a period and a group; compare the rows to see the trend.',
      periodoLegenda: 'Period {p}, from left to right (increasing atomic number)', grupoLegenda: 'Group {g}, from top to bottom (increasing period)',
      colGrupo: 'Group', colPeriodo: 'Period', naoTemSuficiente: 'The package has no {prop} for enough elements of the same period or group.'
    },
    seguranca: {
      naoMisture: 'Do not mix {a} with {b}. {motivo}',
      naoMistureGeral: 'Do not mix {a} with {b}: mixing chemicals can release heat, toxic gases or cause other dangerous reactions. See the hazards of each one below and never mix cleaning products.',
      semGhs: 'The package has no (harmonised) GHS hazard classification for {nome}. That does not mean it is harmless: check the product\'s safety data sheet.',
      perigosDe: 'Hazards of {nome} (GHS)',
      elementoSemGhs: 'The package has GHS hazard classifications only for compounds, not for the element {nome}. Hazards depend on the chemical form (for example, the metal vapour or a salt): check the product\'s safety data sheet.',
      orientacao: 'General safety guidance', naoIdentifiquei: 'I did not identify the substance. Give its name or formula to see the GHS hazards, or follow the general guidance below.',
      comoLer: 'How to read pictograms and H statements', titulo: 'Safety: {alvo}', tituloGeral: 'Chemical safety', eConector: ' and '
    },
    conceito: {
      semTexto: 'I do not have a text about that yet',
      naoEncontrei: 'I did not find, among the licensed excerpts in the data package, an explanation of "{termo}". Element and compound data and the calculators remain available.',
      traducaoAutomatica: 'Automatic translation, not yet reviewed by a person.', emIngles: 'Text in English (not yet translated).', padrao: 'Concept'
    },
    calc: {
      formula: {
        vazia: 'Empty formula', quantidadeInvalida: 'Invalid count "{x}"', quantidadeGrande: 'Count too large', fechaSemAbre: 'Parenthesis ")" without a matching "("',
        abreSemFecha: 'Parenthesis "(" without a matching ")"', vazios: 'Empty parentheses', naoSimbolo: '"{x}" is not an element symbol',
        minuscula: 'Lowercase letter "{c}" out of place (symbols start with a capital letter, as in "Na" and "Cl")', inesperado: 'Unexpected character "{c}"', parteVazia: 'Empty part (check the "·" of the hydrate)'
      },
      balancear: {
        digite: 'Type the equation, for example: Fe + O2 -> Fe2O3', semSeta: 'I did not find the reaction arrow. Write reactants -> products, for example: H2 + O2 -> H2O',
        duasSetas: 'The equation has more than one arrow. Type one reaction at a time.', faltam: 'The {lado} of the equation are missing', reagentes: 'reactants', produtos: 'products',
        substancia: 'Substance "{corpo}": {msg}', grande: 'Equation too large (maximum of 40 substances).',
        soDeUmLado: (p) => `The element ${p.el} appears only ${p.lado === 'r' ? 'in the reactants' : 'in the products'}: check the formulas or add the missing substance.`,
        semCombinacao: 'There is no combination of coefficients that balances this equation. Check the formulas and the charges.',
        varias: 'The equation combines more than one independent reaction, so there are several ways to balance it. Type one reaction at a time.',
        coefZero: 'Some substance would get a zero coefficient: it does not take part in the reaction as written. Check the equation.',
        negativos: 'The coefficients cannot all be positive: the equation, as written, does not represent a possible reaction.', coefGrandes: 'Coefficients too large for this equation.',
        passo1: 'Give each substance an unknown coefficient (letters) and write the equation with them.',
        passo2: (p) => `For each ${p.carga ? 'element (and for the electric charge)' : 'element'}, the number of atoms must be equal on both sides:`, carga: 'charge',
        passo3: 'Solve the system (Gaussian elimination with exact fractions), setting one of the unknowns to 1:',
        passo4: (p) => `${p.mmc ? `Multiply everything by ${p.den} (the least common multiple of the denominators)` : 'Divide by the greatest common divisor'} to get the smallest whole numbers:`,
        passo4Ja: 'The values are already the smallest whole numbers:', balanceada: 'Balanced equation:', conferencia: 'Check (reactants = products): '
      },
      massa: {
        semMassa: 'The data package has no atomic mass for: {lista}.',
        passo1: (p) => `Count the atoms of each element in the formula${p.hidrato ? ' (adding the water of crystallisation)' : ''}:`,
        passo2: 'Multiply the number of atoms by the atomic mass of each element (values from the data package, in g/mol):', passo3: 'Add up the contributions:',
        hidrato: 'Each part of the hydrate contributes as follows (g/mol):', eletrons: 'The mass of the electrons gained or lost is neglected (it is far smaller than the uncertainty of the atomic masses).',
        massaMolarDe: 'Molar mass of {formula}', percentual: '{nome} ({simbolo}), % by mass'
      },
      concentracao: {
        modos: {
          molaridade: 'Molarity (mol/L) from the mass of solute and the volume', massa: 'Mass of solute needed for a solution', 'gl-mol': 'Convert g/L ↔ mol/L',
          'percentual-mm': 'Mass percentage (m/m)', 'percentual-mv': 'Mass/volume percentage (g per 100 mL)', diluicao: 'Dilution (C₁V₁ = C₂V₂)'
        },
        informe: 'Give {x}.', unidadeMassa: 'Unknown mass unit: "{u}".', unidadeVolume: 'Unknown volume unit: "{u}".',
        maiorQueZero: '{x} must be greater than zero.', massaSoluto: 'the mass of solute', volumeSolucao: 'the volume of solution', aMassa: 'The mass', oVolume: 'The volume',
        aMassaSoluto: 'The mass of solute', aMassaSolucao: 'The mass of solution', massaSolucao: 'the mass of solution', aConcentracao: 'The concentration',
        concQuantidade: 'Amount-of-substance concentration', quantidadeSoluto: 'Amount of substance of solute', concMassa: 'Mass concentration',
        passoMassaMolar: 'Molar mass of the solute ({formula}):', passoN: 'Amount of substance of solute (n = m ÷ M):', passoC: 'Molarity (C = n ÷ V, with V in litres):',
        informeDesejada: 'Give the desired concentration.', unidadeConc: 'Unknown concentration unit: "{u}". Use mol/L, mmol/L or g/L.',
        passoConcMolL: 'Concentration in mol/L:', passoNNecessaria: 'Amount of substance needed (n = C × V):', passoMassaSoluto: 'Mass of solute (m = n × M):',
        massaDe: 'Mass of {formula}', quantidade: 'Amount of substance',
        notaDissolva: 'Dissolve the solute in enough solvent and fill up to the final volume of the solution (the volume is that of the solution, not of the solvent).',
        informeConc: 'Give the concentration.', passoMassaMolarCurto: 'Molar mass ({formula}):', divida: 'Divide the mass concentration by the molar mass:', multiplique: 'Multiply the molarity by the molar mass:',
        solutoMaior: 'The mass of solute cannot be greater than that of the solution.', percentualMM: 'Mass percentage (m/m)', titulo: 'Mass fraction',
        passoPercentual: 'Divide the mass of solute by the mass of solution and multiply by 100:', percentualMV: 'Mass/volume percentage', passoMV: 'Mass of solute (g) per 100 mL of solution:',
        umEmBranco: 'Leave exactly one of the four fields blank: that is the one to be calculated.', maioresQueZero: 'The values given must be greater than zero.',
        isoleC1: 'Isolate the initial concentration:', isoleV1: 'Isolate the volume of concentrated solution to measure:', isoleC2: 'Isolate the final concentration:', isoleV2: 'Isolate the final volume:',
        rotulos: { C1: 'Initial concentration (C₁)', V1: 'Initial volume (V₁)', C2: 'Final concentration (C₂)', V2: 'Final volume (V₂)' },
        notaDiluicao: 'In a dilution the amount of solute does not change: C₁V₁ = C₂V₂. Use the same concentration unit and the same volume unit on both sides.',
        solventeAcrescentar: 'Volume of solvent to add (V₂ − V₁)', atencaoConcentracao: 'Note: the final volume is smaller than the initial one; that is a concentration, not a dilution.',
        conserva: 'In a dilution the amount of solute is conserved:', escolha: 'Choose the type of calculation.', solucaoTex: 'solution'
      },
      estequiometria: {
        semMassa: 'The data package has no atomic mass for: {lista}.',
        massaParaMol: (p) => `Mass → moles${p.rotulo ? ` of ${p.rotulo}` : ''}: divide the mass (in g) by the molar mass (${p.M} g/mol).`,
        semVolumeMolar: 'R or the standard conditions are missing from the data package to calculate the molar volume at STP.',
        volumeParaMol: 'Volume (ideal gas, STP: 0 °C and 1 atm) → moles: divide by the molar volume Vm = RT/P = {vm} L/mol.',
        semAvogadro: 'The Avogadro constant is not in the data package (constantes.json).', particulasParaMol: 'Particles → moles: divide by the Avogadro number.',
        unidadeNaoReconhecida: 'Unit not recognised: "{u}". Use g, mg, kg, mol, mmol, L, mL or particles.',
        quantidadeInvalida: 'Give a valid amount (a number greater than or equal to zero).', massaMolarDe: 'Molar mass of {formula} (sum of the atomic masses from the data package):',
        molParaMassa: 'moles → mass: multiply by the molar mass.', molParaParticulas: 'moles → particles: multiply by the Avogadro number.',
        molParaVolume: 'moles → volume at STP (0 °C and 1 atm, ideal gas): multiply by the molar volume {vm} L/mol.',
        quantidade: 'Amount of substance', massa: 'Mass', particulas: 'Number of particles', volumeCntp: 'Volume at STP (if it is an ideal gas)',
        notaVolume: 'The volume applies only to ideal gases at the adopted STP (0 °C and 1 atm); solids and liquids do not follow this conversion.',
        semirreacoes: 'Reactions with electrons (half-reactions) have no mass: use complete equations.', informePeloMenos: 'Give the amount of at least one substance.',
        rendimento: 'The yield must be between 0 and 100 %.', passoEquacao: 'Balanced equation (the coefficients give the mole ratio):',
        naoAparece: 'The substance "{x}" does not appear in the equation.', quantidadesValidas: 'Give valid amounts (numbers greater than or equal to zero).',
        umaVez: 'Each substance must be given only once.',
        soReagentes: 'With more than one amount, give only reactants (the limiting reagent is chosen among them). To start from a product, give only that one.',
        passoRazoes: 'Divide the amount of substance of each reactant by its coefficient: the smallest quotient indicates the limiting reagent.',
        limitante: 'Limiting reagent: {formula}.', umaQuantidade: 'Only one amount was given ({formula}): the extent of reaction is n ÷ coefficient.',
        passoCoeficientes: (p) => `Use the coefficients as a mole ratio: n = coefficient × ξ${p.rend != null ? ` × yield (${p.rend} %)` : ''}.`,
        passoMassa: 'Convert to mass (m = n × M):', sobra: 'What remains of the reactants in excess (initial − consumed):',
        reagenteLimitante: 'Limiting reagent', formado: '{formula} formed', emExcesso: '{formula} in excess (remaining)', necessario: '{formula} needed',
        coeficientesIgnorados: 'The typed coefficients were ignored: the app balances the equation.',
        notaTabela: 'Volume and particles of the products appear in the table; the volume applies only to ideal gases at STP (0 °C and 1 atm).'
      },
      gas: {
        semR: 'The gas constant (R) is not in the data package (constantes.json).', escolha: 'Choose the quantity to calculate: P, V, n or T.',
        rotulos: { P: 'Pressure', V: 'Volume', n: 'Amount of substance', T: 'Temperature' }, informe: 'Give {x}.', unidadeDesconhecida: 'Unknown {x} unit: "{u}".',
        unidadeQuantidade: 'Unknown amount-of-substance unit: "{u}".', semMassaAtomica: 'No atomic mass in the package for: {lista}.',
        passoMassa: 'Calculate the amount of substance from the mass ({formula}, M = {M} g/mol):', informeN: 'Give the amount of substance (mol) or the mass and formula of the gas.',
        temperaturaPositiva: 'The absolute temperature must be greater than 0 K.', maiorQueZero: '{x} must be greater than zero.',
        passoEquacao: 'Ideal gas equation, with R = {R} J/(mol·K) ({nome}). Always use SI units: Pa, m³, mol, K.', passoSI: 'Convert to SI:',
        isoleP: 'Isolate the pressure:', isoleV: 'Isolate the volume:', isoleN: 'Isolate the amount of substance:', isoleT: 'Isolate the temperature:', naoCalculou: 'It was not possible to calculate with these values.',
        unidadeSaida: 'Unknown output unit: "{u}".', converta: 'Convert the result to {u}:', notaModelo: 'Ideal gas model: works best at low pressures and high temperatures.',
        boyleUmEmBranco: 'Leave exactly one of the four values blank: that is the one to be calculated.', boyleUnidade: 'Unknown unit: "{u}".',
        boylePositivos: 'Pressures and volumes must be greater than zero.', boyleLei: 'Boyle\'s law: at constant temperature and with the same amount of gas, the product pressure × volume does not change.',
        boyleIsole: (p) => `Isolate the ${p.n === '1' ? 'initial' : 'final'} ${p.nome} (all values in the same unit of each quantity):`,
        boyleNomes: { P: 'pressure', V: 'volume' }, boyleRotulo: (p) => `${p.n === '1' ? 'Initial' : 'Final'} ${p.nome} (${p.alvo})`,
        boyleNota: 'Valid for an ideal gas with the same amount of substance and the same temperature in both states.'
      },
      ph: {
        tipos: { 'acido-forte': 'Strong acid', 'base-forte': 'Strong base', 'acido-fraco': 'Weak acid (Ka given)', 'base-fraca': 'Weak base (Kb given)', converter: 'Convert pH, pOH, [H⁺], [OH⁻]' },
        classes: { neutra: 'neutral', acida: 'acidic', basica: 'basic' }, solucao: 'Solution', pKw: 'Ionic product of water: pKw = {valor} ({origem}).',
        umValor: 'Give exactly one value: pH, pOH, [H⁺] or [OH⁻].', concPositiva: 'The concentration must be greater than zero.', phInformado: 'The pH was given.',
        phDePoh: 'pH = pKw − pOH:', phDeH: 'pH = −log₁₀[H⁺]:', pohDeOh: 'pOH = −log₁₀[OH⁻] and pH = pKw − pOH:', relacoes: 'Relations used:',
        informeConc: 'Give the concentration (greater than zero) in mol/L.',
        forte: (p) => `Strong ${p.acido ? 'acid' : 'base'}: complete ionization (dissociation). Each formula unit releases ${p.n} ${p.acido ? 'H⁺' : 'OH⁻'}.`,
        diluida: 'Because the solution is very dilute, the autoionization of water cannot be ignored; solve [ion]² − c[ion] − Kw = 0:', notaDiluida: 'Very dilute solution: the calculation included water.',
        notaEscolar: 'School model: complete ionization of the n ionizable hydrogens is assumed (in practice, the second ionization of several acids is partial).',
        informeK: (p) => `Give ${p.acido ? 'Ka (or pKa)' : 'Kb (or pKb)'} of the weak ${p.acido ? 'acid' : 'base'}.`,
        fraco: (p) => `Weak monoprotic ${p.acido ? 'acid' : 'base'}: equilibrium ${p.acido ? 'HA ⇌ H⁺ + A⁻' : 'B + H₂O ⇌ BH⁺ + OH⁻'}. With x = [${p.acido ? 'H⁺' : 'OH⁻'}] at equilibrium:`,
        segundoGrau: 'Solve the quadratic equation x² + K·x − K·C = 0 (without approximations):', portanto: 'Therefore [{ion}] = x.',
        grau: (p) => `Degree of ${p.acido ? 'ionization' : 'ionization of the base'} (α = x ÷ C):`, notaPequeno: '[ion] came out very small: the autoionization of water may matter and this model ignores it.',
        grauIonizacao: 'Degree of ionization', escolha: 'Choose the type of solution.'
      },
      unidades: {
        informeNumero: 'Give a number to convert.', naoConheco: 'I do not know the unit "{u}".',
        grandezasDiferentes: '"{de}" ({gde}) and "{para}" ({gpara}) are different quantities: one cannot be converted into the other.',
        passoBase: 'Convert to the base unit of the quantity ({base}): value × factor + offset.', passoDaBase: 'Convert from the base unit to {para}: (value − offset) ÷ factor.',
        passoEquivale: '1 {a} equals {fa} {base} and 1 {b} equals {fb} {base}.', passoFator: 'Multiply by the conversion factor (ratio between the units):',
        desconhecida: 'Unknown unit: {u}'
      }
    }
  }
};
