// Catálogo de referência da home (português do Brasil): toda chave existe aqui; os outros idiomas são conferidos contra este.
// Valores são fragmentos de HTML confiáveis (só <strong>, <em> e <a> com os mesmos atributos em todos os idiomas).
// {num:chave} vira <span data-num="chave">número no formato do idioma</span>, com o número de NUMEROS_QUIMICA (apps.js).
// Nunca traduzir as marcas: "SaibaTudo", "SaibaTudo — Eleições 2026", "SaibaTudo — Química", "SaibaTudo — AchaVagaIA", "PubChem", "Wikidata".
export default {
  idioma: 'pt-BR',
  nomeNativo: 'Português (Brasil)',
  ogLocale: 'pt_BR',
  revisao: 'original',
  meta: {
    titulo: 'SaibaTudo — Informação verificada: Eleições 2026 e Química',
    descricao: 'SaibaTudo: aplicativos independentes, de código aberto e sem anúncios. Eleições 2026: candidaturas, pesquisas registradas, regras e resultados com dados abertos do TSE. Química: tabela periódica, compostos com estrutura 2D, calculadoras com passo a passo e segurança química com dados abertos.',
    ogDescricao: 'Aplicativos independentes e de código aberto. Eleições 2026 com dados abertos do TSE; Química com tabela periódica, compostos, calculadoras e segurança química a partir de fontes abertas.',
    ogImagemAlt: 'Símbolo SaibaTudo: lupa com marca de verificação',
    twitterDescricao: 'Aplicativos independentes e de código aberto, com dados oficiais e abertos e sem anúncios: Eleições 2026 e Química.'
  },
  topo: {
    pular: 'Ir para o conteúdo',
    marcaAria: 'SaibaTudo — página inicial',
    navAria: 'Principal',
    apps: 'Apps',
    instalar: 'Instalar',
    projeto: 'Projeto público',
    temaAria: 'Tema: seguir o sistema. Toque para alternar entre sistema, claro e escuro.',
    temaAuto: 'Auto'
  },
  idiomas: { rotulo: 'Idioma' },
  hero: {
    logoAlt: 'SaibaTudo — Informação cívica verificada',
    titulo: 'Informação cívica verificada',
    sub: 'Aplicativos independentes, de código aberto e sem anúncios, que reúnem dados oficiais e abertos — das eleições à química — para você consultar os fatos e decidir por conta própria.',
    abrirEleicoes: 'Abrir app Eleições 2026',
    abrirQuimica: 'Abrir app Química',
    abrirAchaVagaIA: 'Abrir o AchaVagaIA'
  },
  apps: { titulo: 'Nossos apps' },
  eleicoes: {
    selo: 'Eleições Gerais 2026',
    nome: 'SaibaTudo — Eleições 2026',
    apenasPortugues: '',
    descricao: 'Consulte candidaturas, pesquisas registradas, regras e resultados com dados abertos do TSE. Pergunte em linguagem natural: o assistente local responde somente com dados oficiais, cita a fonte e não recomenda candidatos.',
    vantagens: [
      'Candidaturas por cargo e estado, em ordem fixa (cargo, estado e número)',
      'Situação oficial do registro — não é certidão de "Ficha Limpa"',
      'Pesquisas registradas no TSE e simulador educativo da urna',
      'Funciona offline e atualiza com dados verificados por assinatura digital'
    ],
    abrir: 'Abrir app Eleições 2026',
    play: 'Baixar na Google Play',
    emBreve: 'em breve',
    playNota: 'A versão para Android na Google Play ainda não foi publicada. Enquanto isso, use o app web: ele pode ser instalado e funciona offline.'
  },
  quimica: {
    selo: 'Química geral — do ensino médio à graduação',
    nome: 'SaibaTudo — Química',
    descricao: 'Tabela periódica, compostos e calculadoras com dados abertos e verificados. Pergunte em português — por exemplo, “massa molar da água” ou “pH de HCl 0,01 mol/L” — e a resposta sai dos dados, com a fonte de cada número e o passo a passo dos cálculos.',
    vantagens: [
      'Tabela periódica interativa com os {num:elementos} elementos e suas propriedades (massa atômica, eletronegatividade, raio, energia de ionização, fusão e ebulição)',
      '{num:compostos} compostos com fórmula, massa molar, nome IUPAC e estrutura desenhada em 2D; {num:compostosComGhsHarmonizado} com os perigos oficiais do rótulo (GHS)',
      'Calculadoras com passo a passo: massa molar, balanceamento de equações, estequiometria, concentração e diluição, pH, gás ideal e conversão de unidades',
      'Fontes abertas citadas em cada resposta: PubChem, Wikidata, CODATA, ChEBI, Wikipédia e Wikilivros',
      'Segurança em primeiro lugar: pedidos perigosos são recusados e os riscos de cada substância aparecem na ficha'
    ],
    abrir: 'Abrir app Química',
    nota: 'Funciona offline e nada sai do seu aparelho. A versão para Android está em preparação; enquanto isso, o app web pode ser instalado.'
  },
  achavagaia: {
    selo: 'Carreira — currículo e busca de vagas',
    emConstrucao: 'primeira versão em construção',
    apenasPortugues: '',
    nome: 'SaibaTudo — AchaVagaIA',
    descricao: 'Assistente pessoal de carreira: melhora o seu currículo com diagnóstico (e IA opcional), monta a busca certa em cada canal de vagas pelos links oficiais, acompanha as suas candidaturas e gera prompts e pacotes de automação para as IAs que você já usa.',
    vantagens: [
      'Diagnóstico do currículo, com pontos a melhorar — e IA opcional, só se você quiser',
      'Busca montada para cada canal de vagas pelos links oficiais: LinkedIn, Catho, Indeed, Gupy e outros',
      'Acompanhamento das suas candidaturas em um só lugar',
      'Prompts e pacotes de automação para as IAs que você já usa: Claude, ChatGPT, Gemini, Perplexity e Kilo Code'
    ],
    abrir: 'Abrir o AchaVagaIA',
    nota: 'Privacidade: nada do seu currículo sai do aparelho sem um toque seu. É a primeira versão do app e ainda está em construção.'
  },
  confianca: {
    titulo: 'Por que confiar',
    pilares: [
      { titulo: 'Dados oficiais e abertos', texto: 'Eleições: arquivos abertos do TSE. Química: PubChem, Wikidata, CODATA e textos abertos. Cada resposta traz a fonte; nada é simulado ou inventado.' },
      { titulo: 'Neutro, independente e seguro', texto: 'Sem vínculo com o TSE, o governo ou partidos: não indicamos, comparamos nem prevemos candidatos. Em química, pedidos perigosos são recusados.' },
      { titulo: 'Aberto e sem anúncios', texto: 'Eleições 2026 e Química têm código aberto sob licença MIT, auditável por qualquer pessoa; o AchaVagaIA, em construção, ainda não tem o código publicado. Sem anúncios e sem cadastro para consultar.' }
    ]
  },
  instalar: {
    titulo: 'Instale no seu aparelho',
    intro: 'Os apps Eleições 2026 e Química são PWAs: funcionam no navegador e podem ser instalados como aplicativo, inclusive para uso offline com os dados já carregados. Abra o app e use o botão <strong>Instalar app</strong>, ou siga o passo a passo do seu aparelho.',
    android: {
      titulo: 'Android',
      passos: [
        'Abra o app (Eleições 2026 ou Química) no Chrome ou Edge.',
        'Toque em <strong>Instalar app</strong> (ou no menu ⋮ → <em>Instalar aplicativo</em> / <em>Adicionar à tela inicial</em>).',
        'Google Play: em breve para os dois apps.'
      ]
    },
    ios: {
      titulo: 'iPhone e iPad',
      passos: [
        'Abra o app (Eleições 2026 ou Química) no Safari.',
        'Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).',
        'Escolha <strong>Adicionar à Tela de Início</strong> e confirme.'
      ]
    },
    desktop: {
      titulo: 'Windows, Mac e Linux',
      passos: [
        'Abra o app (Eleições 2026 ou Química) no Chrome ou Edge.',
        'Clique no botão <strong>Instalar app</strong> ou no ícone de instalação na barra de endereço.',
        'O app abre em janela própria, como qualquer programa.'
      ]
    },
    abrirEleicoes: 'Abrir app Eleições 2026',
    abrirQuimica: 'Abrir app Química',
    portal: 'Instalar o portal SaibaTudo'
  },
  projeto: {
    titulo: 'Projeto público',
    codigo: {
      titulo: 'Código aberto (MIT)',
      texto: 'Em Eleições 2026 e Química, todo o código — site, app web, app Android, pipeline de dados e modelo de IA — é público e auditável. O AchaVagaIA, em construção, ainda não tem o código publicado.'
    },
    fontes: {
      titulo: 'Fontes oficiais',
      eleicoes: 'Eleições: <a href="https://dadosabertos.tse.jus.br/" target="_blank" rel="noopener noreferrer">Portal de Dados Abertos do TSE</a>, licença CC BY 4.0; em caso de divergência, vale sempre o site oficial do TSE.',
      quimica: 'Química: PubChem (domínio público), Wikidata (CC0), CODATA/NIST, ChEBI (CC BY 4.0), Wikipédia e Wikilivros (CC BY-SA 4.0); a página “Sobre os dados” do app lista versão e licença de cada fonte.',
      link: 'Sobre os dados: versão, fontes e limitações'
    },
    neutralidade: {
      titulo: 'Neutralidade e independência',
      texto: 'O SaibaTudo é independente: não tem vínculo com o TSE, com o governo ou com partidos. Listas seguem ordem fixa (cargo, estado e número) e nunca ranqueiam candidatos.'
    },
    correcoes: {
      titulo: 'Canal de correções',
      texto: 'Encontrou um erro? Abra uma <em>issue</em> pública no GitHub ou use o botão "Relatar problema" no app. Corrigimos com transparência.',
      link: 'Abrir uma issue no GitHub'
    }
  },
  breve: {
    titulo: 'Em breve',
    noscript: 'Novos apps SaibaTudo serão anunciados aqui.'
  },
  rodape: {
    navAria: 'Rodapé',
    privacidade: 'Privacidade',
    dados: 'Sobre os dados',
    github: 'GitHub',
    texto: 'SaibaTudo é independente, apartidário e não tem vínculo com o TSE, com o governo ou com partidos. Dados eleitorais: Tribunal Superior Eleitoral — Portal de Dados Abertos, licença CC BY 4.0. Dados de química: PubChem, Wikidata, CODATA/NIST, ChEBI, Wikipédia e Wikilivros. Código de Eleições 2026 e Química sob licença MIT.'
  }
};
