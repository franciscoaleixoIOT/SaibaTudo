// Catálogo pt-BR (REFERÊNCIA: toda chave existe aqui; os outros catálogos são conferidos contra este). Extraído dos textos originais do app, sem
// mudança de redação. Valores: string com {param} ou função (plural/concordância). Chaves estáveis em inglês técnico ou no nome do módulo.
const MARCA = 'SaibaTudo Química';

export default {
  revisao: 'humana',
  regras: { minusculaNoMeio: true },

  ui: {
    idiomas: { 'pt-BR': 'português', en: 'inglês', es: 'espanhol', de: 'alemão', fr: 'francês' },
    listas: { e: ' e ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo Química — tabela periódica, compostos e calculadoras com dados abertos',
      descricao: 'Tabela periódica interativa, fichas de elementos e compostos com estrutura 2D, calculadoras com passo a passo (massa molar, balanceamento, estequiometria, pH, gás ideal) e segurança química. Dados abertos, funciona offline e nada sai do seu aparelho.',
      ogLocale: 'pt_BR',
      pular: 'Ir para o conteúdo'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo Química',
      carregando: 'Carregando SaibaTudo Química…',
      abas: { inicio: 'Início', tabela: 'Tabela periódica', compostos: 'Compostos', calculadoras: 'Calculadoras', seguranca: 'Segurança' },
      secoes: 'Seções',
      marcaAria: 'SaibaTudo Química, início',
      marcaSub: 'Dados abertos, cálculos no seu aparelho',
      configuracoes: 'Configurações',
      idioma: 'Idioma',
      rodape: { sobre: 'Sobre os dados', privacidade: 'Privacidade', configuracoes: 'Configurações', projeto: 'Projeto independente e de código aberto (MIT). Sem anúncios, login ou rastreadores.' },
      naoEncontrada: { titulo: 'Página não encontrada', texto: 'Esse endereço não existe no SaibaTudo Química.', inicio: 'Ir para o início' },
      erro: { titulo: 'Erro', cabecalho: 'Algo deu errado', texto: 'Não foi possível montar esta tela ({msg}).', inicio: 'Ir para o início' },
      erroDados: { titulo: 'Não foi possível carregar os dados', complemento: '{msg}. Verifique a conexão; depois da primeira carga o aplicativo funciona offline.', tentar: 'Tentar de novo' },
      avisoAssinatura: 'A assinatura digital do pacote de dados não confere. Os dados do próprio site continuam em uso, mas não foram autenticados: não confie em valores críticos.',
      dadosAtualizados: 'Dados atualizados. Recarregue a página para usar a versão nova em todas as telas.',
      novaVersao: 'Nova versão do app instalada. Feche e reabra (ou recarregue) para usá-la.',
      idiomaTrocado: 'Idioma alterado. O contexto da conversa foi limpo.'
    },
    prefs: {
      tema: { SISTEMA: 'Seguir o sistema', CLARO: 'Claro', ESCURO: 'Escuro' },
      fonte: { PEQUENA: 'Pequena', NORMAL: 'Normal', GRANDE: 'Grande', MUITO_GRANDE: 'Muito grande' }
    },
    install: {
      ios: { titulo: 'Instalar no iPhone ou iPad', passos: ['Abra esta página no Safari.', 'Toque em Compartilhar (o quadrado com a seta para cima).', 'Escolha "Adicionar à Tela de Início" e confirme em "Adicionar".'] },
      geral: {
        titulo: 'Instalar o aplicativo',
        passos: [
          'No Chrome ou Edge (Windows, Mac, Linux, Android), use o botão "Instalar app" desta página ou o ícone de instalar na barra de endereço.',
          'No menu do navegador, escolha "Instalar SaibaTudo Química" (ou "Adicionar à tela inicial").',
          'Depois de instalado, o app abre em janela própria e funciona também sem internet (com os dados já carregados).'
        ]
      }
    },
    componentes: {
      fonte: 'Fonte: ',
      palavraSinal: 'Palavra de sinal: ',
      pictogramasAria: 'Pictogramas de perigo',
      frasesAria: 'Frases de perigo (H)',
      fraseIndisponivel: 'Texto da frase não disponível neste pacote.',
      passoAPasso: 'Passo a passo',
      fraseEmIdioma: '(texto em {idioma})'
    },
    molecula: {
      aria: 'Estrutura 2D de {nome}',
      erroDesenho: 'Não foi possível desenhar esta estrutura.',
      erroSmiles: 'Não foi possível interpretar o SMILES desta estrutura.',
      erroBiblioteca: 'A biblioteca de desenho não está disponível agora (sem conexão?). O SMILES continua listado na ficha.'
    },
    nomes: {
      emIdioma: '{nome} (nome em {idioma})',
      nomeEmIdioma: 'Nome em {idioma}'
    },
    inicio: {
      titulo: 'Início',
      cabecalho: 'Pergunte sobre Química',
      intro: 'Elementos, compostos, cálculos com passo a passo e segurança química. As respostas vêm de dados abertos e de cálculos feitos no seu aparelho.',
      campoAria: 'Pergunte sobre Química',
      placeholder: 'Ex.: massa molar da água, Fe + O2 -> Fe2O3, pH de HCl 0,01 mol/L',
      exemplosAria: 'Exemplos de perguntas',
      badge: 'Nada sai do seu aparelho, a menos que você peça à IA na nuvem.',
      explore: 'Explore',
      cartoes: {
        tabela: { titulo: 'Tabela periódica', descricao: 'Cores por categoria, filtros por bloco, período, grupo e estado.' },
        compostos: { titulo: 'Compostos', descricao: 'Busque por nome, fórmula, CAS ou CID e veja a estrutura 2D.' },
        calculadoras: { titulo: 'Calculadoras', descricao: 'Massa molar, balanceamento, estequiometria, concentração, pH, gás ideal e unidades.' },
        seguranca: { titulo: 'Segurança', descricao: 'Pictogramas do GHS, frases H e como evitar misturas perigosas.' },
        sobre: { titulo: 'Sobre os dados', descricao: 'Fontes, licenças, datas e verificação da assinatura digital.' }
      },
      historico: { ultima: 'Última pergunta', anterior: 'Pergunta anterior', proxima: 'Próxima pergunta ou caixa em branco' },
      limpar: 'Limpar texto',
      analisando: 'Analisando',
      analisandoPergunta: 'Analisando a pergunta…',
      pensando: 'Pensando…',
      perguntar: 'Perguntar',
      copiada: 'Resposta copiada.',
      naoCopiou: 'Não foi possível copiar neste navegador.',
      copiarRodape: 'Fontes:',
      relatoTitulo: 'Química: resposta a "{pergunta}"',
      relatoCorpo: 'O que estava errado ou faltou na resposta? (Não inclua dados pessoais.)\n\nPergunta: {pergunta}',
      respostaAnuncio: 'Resposta: {titulo}'
    },
    nuvem: {
      botao: 'Perguntar à IA na nuvem',
      nota: 'Envia só o texto desta pergunta ao nosso servidor para interpretar; a resposta continua vindo dos dados. Numa continuação (“e o do potássio?”), vai também a interpretação da pergunta anterior, sem o texto dela. Pode levar até 30 s.',
      notaConferir: 'A resposta acima foi montada no seu aparelho. Se não era o que você queria, a IA na nuvem tenta entender a pergunta de outro jeito; a resposta continua vindo dos dados. Envia só o texto desta pergunta. Numa continuação (“e o do potássio?”), vai também a interpretação da pergunta anterior, sem o texto dela. Pode levar até 30 s.',
      consultando: 'Consultando a IA na nuvem…',
      mesmaInterpretacao: 'A IA na nuvem entendeu a pergunta do mesmo jeito que o app: a resposta acima já é a resposta para ela. Se queria outra coisa, reformule citando o elemento, o composto ou a propriedade.',
      semOutraInterpretacao: 'A IA na nuvem não encontrou outra forma de entender esta pergunta. A resposta acima continua valendo.',
      indisponivelConferir: 'A IA na nuvem está indisponível agora ou demorou demais. A resposta acima continua valendo; tente de novo em instantes.',
      falhouConferir: 'A IA na nuvem não trouxe outra resposta agora. A resposta acima continua valendo.',
      naoEntendeu: 'A IA na nuvem também não entendeu esta pergunta. Tente reformular citando o elemento, o composto (nome ou fórmula) ou a propriedade.',
      indisponivel: 'A IA na nuvem está indisponível agora ou demorou demais. Tente de novo em instantes ou reformule citando o elemento, o composto ou a propriedade.',
      falhou: 'A IA na nuvem não conseguiu interpretar agora. Tente reformular citando o elemento, o composto ou a propriedade.',
      quisDizer: 'Não encontrei esse composto nos dados. Você quis dizer:'
    },
    melhoria: {
      titulo: 'Ajudar a melhorar o app',
      explicacao: 'O app não entendeu esta pergunta. Se quiser, envie-a para nos ajudar a ensinar o interpretador. Vão só o texto da pergunta e um código aleatório desta instalação, sem seu nome e sem nada que identifique você. Perguntas com e-mail, telefone, CPF, endereço de site ou pedido perigoso não são enviadas, mas nenhum filtro é perfeito: não escreva dados pessoais. Uma pessoa revisa as perguntas guardadas, que são apagadas em até 4 meses. Para enviar sempre, ligue "Ajudar a melhorar o app" em Configurações; lá também dá para desligar e apagar a fila.',
      botao: 'Enviar esta pergunta',
      enviando: 'Enviando…',
      enviada: 'Obrigado! A pergunta foi enviada.',
      naFila: 'Esta pergunta entrou na fila do "Ajudar a melhorar o app" e será enviada com as próximas. Para desligar, vá a Configurações.',
      guardada: 'A pergunta ficou guardada neste aparelho e será enviada com as próximas.',
      indisponivel: 'O envio não está disponível agora. A pergunta fica guardada neste aparelho e será enviada depois.',
      falhou: 'Não deu para enviar agora (sem rede ou muitos envios seguidos). A pergunta fica guardada neste aparelho e será enviada depois.',
      chave: 'Ajudar a melhorar o app',
      chaveAjuda: 'Desligado por padrão. Ligado, as perguntas que o app não entendeu entram numa fila neste aparelho e são enviadas em lotes ao nosso servidor, só com o texto da pergunta e um código aleatório desta instalação, para uma pessoa revisar e ensinar o app a entendê-las. Perguntas com dado pessoal (e-mail, telefone, CPF, site) ou pedido perigoso não entram na fila, mas nenhum filtro é perfeito: evite escrever dados pessoais. Desligar apaga o que ainda não foi enviado.',
      fila: (p) => (Number(p.n) === 0 ? 'Nenhuma pergunta na fila.' : Number(p.n) === 1 ? 'Uma pergunta na fila, aguardando envio.' : `${p.n} perguntas na fila, aguardando envio.`),
      apagarFila: 'Apagar fila',
      filaApagada: 'Fila apagada.'
    },
    resposta: {
      rotuloRecusa: 'Pedido recusado por segurança',
      rotuloResolvida: 'Resposta montada no seu aparelho, a partir dos dados',
      rotuloNaoResolvida: 'Não consegui responder',
      origemNuvem: 'no seu aparelho, com a pergunta interpretada pela IA na nuvem ({modelo})',
      origemAparelho: 'no seu aparelho',
      origem: 'Resposta montada {origem}',
      dadosDe: ' • dados do pacote de {data}',
      fechar: 'Fechar resposta',
      tambem: 'Você também pode perguntar',
      fontes: 'Fontes e licenças ({n})',
      copiar: 'Copiar resposta',
      relatar: 'Relatar problema nesta resposta'
    },
    tabela: {
      titulo: 'Tabela periódica',
      intro: 'Toque num elemento para ver todas as propriedades, com unidades e fontes. As cores indicam a categoria; filtre por bloco, período, grupo ou estado físico.',
      buscar: 'Buscar',
      placeholder: 'Nome, símbolo ou número',
      filtrosAria: 'Filtros da tabela periódica',
      bloco: 'Bloco', blocoN: 'Bloco {b}', periodo: 'Período', periodoN: 'Período {p}', grupo: 'Grupo', grupoN: 'Grupo {g}', estado: 'Estado padrão', todos: 'Todos',
      estados: { solido: 'Sólido', liquido: 'Líquido', gas: 'Gás' },
      limpar: 'Limpar filtros',
      legendaAria: 'Categorias (toque para filtrar)',
      contagemTodos: '{n} elementos',
      contagemFiltro: '{n} de {total} elementos correspondem aos filtros',
      regiaoAria: 'Tabela periódica (role para o lado em telas estreitas)',
      vazio: 'Os dados dos elementos não estão disponíveis.',
      rotuloElemento: '{nome}, símbolo {simbolo}, número atômico {z}, {categoria}, {estado}'
    },
    elemento: {
      naoEncontrado: 'Elemento não encontrado',
      naoHa: 'Não há "{simbolo}" nos dados.',
      abrirTabela: 'Abrir a tabela periódica',
      voltar: 'Tabela periódica',
      nomeEmIngles: 'Nome em inglês',
      incerteza: 'Incerteza da massa atômica',
      sub: 'Elemento {z} · {categoria} · {estado} nas condições padrão',
      propriedades: 'Propriedades',
      compostosCom: 'Compostos com {nome}',
      buscarCompostosDe: 'Buscar compostos de {nome}',
      mostrando: (p) => (p.n === 1 ? 'Mostrando um composto do índice; use a busca de compostos para ver mais.' : `Mostrando ${p.n} compostos do índice; use a busca de compostos para ver mais.`),
      calcular: 'Calcular',
      massaMolarDe: 'Massa molar de {nome}'
    },
    compostos: {
      titulo: 'Compostos',
      intro: 'Busque por nome em português, nome popular, nome IUPAC, fórmula, número CAS ou CID do PubChem.',
      placeholder: 'Nome, fórmula, CAS ou CID (ex.: aspirina, H2SO4, 64-17-5)',
      buscar: 'Buscar composto',
      buscando: 'Buscando…',
      semIndice: 'O índice de compostos não está disponível.',
      erro: 'Não foi possível carregar os compostos ({msg}).',
      resultados: (p) => `${p.n} resultado${p.n > 1 ? 's' : ''}`,
      nenhum: 'Nenhum composto encontrado para "{q}".',
      total: '{n} compostos no pacote, em ordem alfabética.',
      faixa: 'Mostrando {de}–{ate} de {n}.',
      pagina: 'Página {p} de {total}',
      anterior: 'Página anterior',
      proxima: 'Próxima página',
      paginacao: 'Páginas de resultados',
      cas: 'CAS {cas}',
      naoEncontrado: 'Composto não encontrado',
      naoHa: 'Não há esse composto no pacote de dados.',
      buscarCompostos: 'Buscar compostos',
      cid: 'CID {cid}',
      voltar: 'Compostos',
      nomePopular: 'Nome popular',
      nomeIupac: 'Nome IUPAC',
      nomePt: 'Nome em português',
      nomePtPendente: 'pendente: o nome mostrado é o IUPAC',
      sinonimos: 'Sinônimos',
      formula: 'Fórmula',
      formulaHill: 'Fórmula (notação de Hill)',
      cidPubchem: 'CID no PubChem',
      smiles: 'SMILES',
      wikidata: 'Wikidata',
      dados: 'Dados do composto',
      fontePubchem: 'PubChem CID {cid} (NCBI/NLM)',
      estrutura: 'Estrutura 2D',
      desenhada: 'Desenhada no seu aparelho a partir do SMILES do pacote de dados, com SmilesDrawer (MIT).',
      seguranca: 'Segurança',
      classificacaoGhs: 'Classificação de perigo (GHS)',
      fonteFrases: 'Frases de perigo: UNECE GHS / ECHA CLP',
      semGhs: 'O pacote não traz classificação GHS harmonizada para este composto. Isso não quer dizer que seja inofensivo: consulte a ficha de segurança do produto.',
      icsc: 'Ficha ICSC no site da OIT',
      comoLer: 'Como ler pictogramas e frases H',
      definicao: 'Definição (ChEBI)',
      definicaoFonte: 'Definição em inglês. Fonte: ',
      chebi: 'ChEBI ({id})',
      chebiSem: 'ChEBI (EMBL-EBI)',
      calcular: 'Calcular',
      massaMolarDe: 'Massa molar de {formula}',
      perguntar: 'Perguntar sobre este composto',
      perguntaPerigos: 'Perigos de {nome}'
    },
    calculadoras: {
      titulo: 'Calculadoras',
      intro: 'Cada resultado mostra os passos e as fórmulas. Tudo é calculado no seu aparelho; massas atômicas e constantes vêm do pacote de dados assinado.',
      naoEncontrada: 'Calculadora não encontrada',
      verTodas: 'Ver todas as calculadoras',
      voltar: 'Calculadoras',
      resultadoAria: 'Resultado',
      passoAPasso: 'Passo a passo',
      exemplosAria: 'Exemplos',
      unidadeDe: 'Unidade de {rotulo}',
      lista: {
        'massa-molar': { titulo: 'Massa molar', descricao: 'Soma das massas atômicas do pacote de dados, com composição percentual.' },
        balanceamento: { titulo: 'Balanceamento de equações', descricao: 'Álgebra linear exata, com íons e passos.' },
        estequiometria: { titulo: 'Estequiometria', descricao: 'Massa, mol, partículas e volume (CNTP); reagente limitante.' },
        concentracao: { titulo: 'Concentração e diluição', descricao: 'Molaridade, g/L, percentuais e C₁V₁ = C₂V₂.' },
        ph: { titulo: 'pH', descricao: 'Ácidos e bases fortes, fracos (com Ka ou Kb) e conversões.' },
        'gas-ideal': { titulo: 'Gás ideal', descricao: 'PV = nRT com a constante R do pacote (CODATA).' },
        unidades: { titulo: 'Conversão de unidades', descricao: 'Pressão, volume, massa, temperatura, energia e mais.' },
        entalpia: { titulo: 'Entalpia (formação e Hess)', descricao: 'ΔH da reação pelas entalpias de formação do pacote ou pela lei de Hess, com até 4 equações.' },
        'configuracao-eletronica': { titulo: 'Configuração eletrônica', descricao: 'Diagrama de Linus Pauling, camadas e elétrons de valência; também para íons.' },
        nox: { titulo: 'Número de oxidação (NOX)', descricao: 'NOX de cada elemento pelas regras, com íons e NOX médio.' },
        equilibrio: { titulo: 'Equilíbrio (Kc e Kp)', descricao: 'Expressão de Kc, Δn, Kp = Kc·(RT)^Δn e o valor de Kc pelas concentrações.' },
        ligacao: { titulo: 'Tipo de ligação', descricao: 'Iônica, covalente polar, covalente apolar ou metálica, pela eletronegatividade.' }
      },
      entalpia: {
        modo: 'Cálculo', formacao: 'Pelas entalpias de formação', hess: 'Lei de Hess', equacao: 'Equação da reação', placeholder: 'Ex.: CH4 + 2 O2 -> CO2 + 2 H2O',
        ajuda: 'Sem coeficientes, o aplicativo balanceia. Os ΔHf° vêm do pacote de dados; substâncias simples (O2, N2, Fe…) valem 0.',
        alvo: 'Equação alvo', placeholderAlvo: 'Ex.: C + 2 H2 -> CH4', equacaoN: 'Equação {n}', dH: 'ΔH da equação {n} (kJ)',
        ajudaHess: 'Digite as equações balanceadas como estão no enunciado, cada uma com o seu ΔH. Frações valem (1/2 O2). Deixe em branco as que não usar.', calcular: 'Calcular ΔH'
      },
      eletronica: {
        elemento: 'Elemento (símbolo ou nome)', placeholder: 'Ex.: Fe, ferro, Cl', carga: 'Carga do íon', ajudaCarga: '0 para o átomo neutro; 2 para Fe²⁺, -1 para Cl⁻.',
        calcular: 'Distribuir', naoEncontrei: 'Não encontrei esse elemento no pacote de dados.'
      },
      nox: {
        formula: 'Fórmula (com a carga, se for íon)', placeholder: 'Ex.: H2SO4, MnO4-, Cr2O7 2-', ajuda: 'Carga no fim: MnO4-, SO4^2-, NH4+ ou "Cr2O7 2-". Hidratos não valem.',
        elemento: 'Elemento em destaque (opcional)', placeholderElemento: 'Ex.: S', calcular: 'Calcular NOX'
      },
      equilibrio: {
        equacao: 'Equação', placeholder: 'Ex.: N2 + 3 H2 ⇌ 2 NH3', ajuda: 'Aceita ⇌, <=>, -> ou =. Estados (s), (l), (g), (aq) valem: sólidos e líquidos puros saem da expressão.',
        concentracoes: 'Concentrações no equilíbrio (opcional)', placeholderConc: 'Ex.: [N2] = 0,5; [H2] = 1,5; [NH3] = 0,2', ajudaConc: 'Uma por espécie, em mol/L, separadas por ponto e vírgula.',
        temperatura: 'Temperatura (opcional, para o Kp)', calcular: 'Calcular'
      },
      ligacao: {
        modo: 'Entrada', porFormula: 'Fórmula', porElementos: 'Dois elementos', formula: 'Fórmula', placeholder: 'Ex.: NaCl, HCl, Cl2, NaOH',
        a: 'Elemento 1', b: 'Elemento 2', placeholderA: 'Ex.: H', placeholderB: 'Ex.: Cl', calcular: 'Classificar'
      },
      massaMolar: {
        formula: 'Fórmula química', placeholder: 'Ex.: Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3', ajuda: 'Parênteses, hidratos com "·" (ou "."), cargas no fim: Fe3+, SO4^2-.',
        fichaDe: 'ficha de {nome}', calcular: 'Calcular massa molar'
      },
      balanceamento: {
        equacao: 'Equação química', placeholder: 'Ex.: Fe + O2 -> Fe2O3',
        ajuda: 'Separe as substâncias com "+" e use "->" ou "→". Íons valem: Zn + Cu2+ -> Zn2+ + Cu. Estados (s), (l), (g), (aq) são ignorados.',
        conferencia: 'Conferência: átomos de cada elemento (e carga) nos dois lados', elemento: 'Elemento', reagentes: 'Reagentes', produtos: 'Produtos', igual: 'Igual?', carga: 'carga', sim: 'sim', nao: 'não',
        coeficientesIgnorados: 'Os coeficientes digitados foram ignorados: o aplicativo balanceia a equação inteira.', balancear: 'Balancear'
      },
      estequiometria: {
        modo: 'O que você quer fazer?', conv: 'Converter massa, mol, partículas e volume (CNTP) de uma substância', reacao: 'Reação: reagente limitante e quantidade de produtos',
        substancia: 'Substância (fórmula)', placeholderSubstancia: 'Ex.: H2O, CO2, NaCl', quantidade: 'Quantidade',
        ajudaQuantidade: 'L e mL = volume de um gás ideal nas CNTP (0 °C e 1 atm). "partículas" = moléculas, átomos ou íons.', particulas: 'partículas',
        equacao: 'Equação química', placeholderEquacao: 'Ex.: H2 + O2 -> H2O', ajudaEquacao: 'O aplicativo balanceia a equação. Informe a quantidade de pelo menos uma substância.',
        rendimento: 'Rendimento (%)', ajudaRendimento: 'Opcional. 100 % = rendimento teórico.', quantidadeDe: 'Quantidade de {formula}', calcular: 'Calcular',
        tabelaTitulo: 'Quantidades de cada substância', tabelaLegenda: 'Reagentes: quantidades iniciais, consumidas e restantes; produtos: formados',
        cabecalho: ['Substância', 'Papel', 'Coef.', 'M (g/mol)', 'Mol', 'Massa (g)', 'Partículas', 'Volume CNTP (L)'],
        produto: 'produto', limitante: 'reagente limitante', reagente: 'reagente'
      },
      concentracao: {
        tipo: 'Tipo de cálculo', soluto: 'Soluto (fórmula)', exNaCl: 'Ex.: NaCl', exNaOH: 'Ex.: NaOH', massaSoluto: 'Massa do soluto', volumeSolucao: 'Volume da solução',
        concentracaoDesejada: 'Concentração desejada', valorConcentracao: 'Valor da concentração', converter: 'Converter', glParaMol: 'g/L → mol/L', molParaGl: 'mol/L → g/L',
        massaSolucao: 'Massa da solução', unidadeConcentracao: 'Unidade de concentração', unidadeVolume: 'Unidade de volume',
        c1: 'C₁ (concentração inicial)', v1: 'V₁ (volume inicial)', c2: 'C₂ (concentração final)', v2: 'V₂ (volume final)',
        deixeEmBranco: 'Deixe em branco o campo que você quer calcular.', calcular: 'Calcular'
      },
      ph: {
        tipo: 'Tipo de solução', concentracao: 'Concentração (mol/L)', ex001: 'Ex.: 0,01', ex01: 'Ex.: 0,1', hLiberados: 'H⁺ liberados por fórmula', ohLiberados: 'OH⁻ liberados por fórmula',
        ajudaN: 'HCl = 1; H₂SO₄ = 2 (modelo escolar); NaOH = 1; Ca(OH)₂ = 2.', kaOuPka: 'Ka ou pKa', kbOuPkb: 'Kb ou pKb', exK: 'Ex.: 1,8e-5',
        ajudaK: 'Notação científica: 1,8e-5 ou 1,8 x 10^-5.', valorInformado: 'O valor informado é', valorConhecido: 'Valor conhecido', hMolL: '[H⁺] (mol/L)', ohMolL: '[OH⁻] (mol/L)',
        valor: 'Valor', calcular: 'Calcular pH'
      },
      gas: {
        calcular: 'Calcular', volume: 'Volume (V)', pressao: 'Pressão (P)', quantidade: 'Quantidade de matéria (n)', temperatura: 'Temperatura (T)',
        formulaGas: 'Fórmula do gás', exCO2: 'Ex.: CO2', massaGas: 'Massa do gás', usarMassa: 'Informar massa e fórmula do gás em vez de n', botao: 'Calcular'
      },
      unidades: {
        grandeza: 'Grandeza', valor: 'Valor', ex5: 'Ex.: 5', de: 'De', para: 'Para', converter: 'Converter', inverter: 'Inverter', equivaleA: '{valor} {de} equivale a',
        grandezas: { massa: 'Massa', volume: 'Volume', comprimento: 'Comprimento', pressao: 'Pressão', energia: 'Energia', temperatura: 'Temperatura', tempo: 'Tempo', quantidade: 'Quantidade de matéria', concentracao: 'Concentração' }
      }
    },
    seguranca: {
      titulo: 'Segurança química',
      intro: 'Como ler os avisos de perigo dos produtos químicos. O aplicativo mostra a classificação GHS dos compostos que estão no pacote de dados e leva você às fichas oficiais; ele não ensina a produzir substâncias perigosas.',
      aviso: 'Por segurança, o aplicativo recusa pedidos de síntese, purificação ou receitas caseiras de explosivos, armas químicas, drogas ilícitas e outros reagentes perigosos. Perguntas sobre perigos, EPI, armazenamento e primeiros socorros são respondidas.',
      verPerigos: 'Ver os perigos de um composto', buscar: 'Buscar composto', placeholderBusca: 'Nome, fórmula ou CAS do composto', verPictogramas: 'Ver perigos e pictogramas',
      pictogramas: 'Pictogramas do GHS',
      pictogramasIntro: 'O GHS (Sistema Globalmente Harmonizado, da ONU) usa losangos de borda vermelha. Os desenhos abaixo são versões simplificadas, feitas para este aplicativo.',
      palavraSinal: 'Palavra de sinal', perigo: 'Perigo', atencao: 'Atenção',
      sinalTexto1: ' indica as categorias mais graves; ', sinalTexto2: ' indica as menos graves. Substâncias de menor perigo podem vir sem palavra de sinal.',
      comoLer: 'Como ler as frases H', frasesIntro: 'Cada frase de perigo tem um código: a letra H e três algarismos. O primeiro algarismo diz o tipo de perigo:',
      codigosSomados: 'Códigos somados, como H302+H312, juntam as frases em uma só. Textos: UNECE GHS / ECHA CLP, em português.',
      procurarFrase: 'Procurar uma frase', placeholderFiltro: 'Filtrar por código ou palavra (ex.: H314, inflamável)', nenhumaFrase: 'Nenhuma frase encontrada.',
      boasPraticas: 'Boas práticas', fontesOficiais: 'Fontes oficiais (links externos)',
      links: [
        ['Fichas Internacionais de Segurança Química (ICSC), OIT/OMS', 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', 'Fichas por substância (o aplicativo não copia as fichas: só aponta para elas).'],
        ['PubChem: classificação GHS dos compostos', 'https://pubchem.ncbi.nlm.nih.gov/ghs/', 'Explica a fonte da classificação usada neste aplicativo.'],
        ['UNECE: transporte de mercadorias perigosas e GHS', 'https://unece.org/transport/dangerous-goods', 'Origem do Sistema Globalmente Harmonizado (GHS) da ONU.']
      ]
    },
    perigos: {
      pictogramas: {
        GHS01: 'Explosivo', GHS02: 'Inflamável', GHS03: 'Comburente (oxidante)', GHS04: 'Gás sob pressão', GHS05: 'Corrosivo',
        GHS06: 'Toxicidade aguda (tóxico ou fatal)', GHS07: 'Nocivo, irritante ou sensibilizante', GHS08: 'Perigo grave à saúde', GHS09: 'Perigoso ao ambiente aquático'
      },
      descricoes: {
        GHS01: 'explosivos, substâncias autorreativas e peróxidos orgânicos',
        GHS02: 'inflamáveis, pirofóricos, sujeitos a autoaquecimento ou que liberam gases inflamáveis em contato com a água',
        GHS03: 'comburentes (oxidantes)', GHS04: 'gases sob pressão',
        GHS05: 'corrosivos para metais, que queimam a pele e causam lesões oculares graves', GHS06: 'toxicidade aguda (fatal ou tóxico)',
        GHS07: 'toxicidade aguda moderada (nocivo), irritação da pele e dos olhos, sensibilização da pele e irritação das vias respiratórias',
        GHS08: 'carcinogenicidade, mutagenicidade, toxicidade reprodutiva, sensibilização respiratória, toxicidade para órgãos-alvo e perigo por aspiração',
        GHS09: 'perigo para o ambiente aquático'
      },
      grupos: [
        { faixa: 'H2xx', titulo: 'Perigos físicos', descricao: 'explosivos, inflamáveis, comburentes, gases sob pressão, corrosivos para metais (H200 a H290).' },
        { faixa: 'H3xx', titulo: 'Perigos para a saúde', descricao: 'toxicidade aguda, corrosão e irritação da pele e dos olhos, sensibilização, mutagenicidade, carcinogenicidade, toxicidade reprodutiva e para órgãos-alvo (H300 a H373).' },
        { faixa: 'H4xx', titulo: 'Perigos ao meio ambiente', descricao: 'toxicidade para organismos aquáticos e para a camada de ozônio (H400 a H420).' }
      ],
      sinal: { perigo: 'Perigo', atencao: 'Atenção' }
    },
    sobre: {
      titulo: 'Sobre os dados',
      intro: 'Todo número mostrado vem do pacote de dados assinado ou de um cálculo feito no seu aparelho. A IA na nuvem, opcional, só interpreta a pergunta e nunca fornece números.',
      pacote: 'Pacote de dados', versao: 'Versão', geradoEm: 'Gerado em', assinatura: 'Assinatura digital', origem: 'Origem', arquivos: 'Arquivos', arquivosValor: '{n} ({kb} KB no total)',
      elementos: 'Elementos', compostos: 'Compostos no índice', ultimaVerificacao: 'Última verificação', avisosCarga: 'Avisos de carga: {msgs}',
      dados: 'Dados no pacote', textos: 'Textos licenciados (explicações)', externas: 'Referências externas (links)', licencasManifesto: 'Licenças listadas no manifesto',
      comoObtidos: 'Como os valores são obtidos',
      como: [
        'Elementos, compostos, constantes e regras: arquivos JSON versionados, com SHA-256 conferido e manifesto assinado.',
        'Massa molar, balanceamento, estequiometria, concentração, pH, gás ideal e unidades: código determinístico testado, no seu aparelho.',
        'Estrutura 2D: desenhada a partir do SMILES do pacote. Pictogramas do GHS: desenhos simplificados deste aplicativo.',
        'Trechos de explicação: citados com fonte e licença; traduções automáticas são avisadas como tais.',
        'Propriedades físicas dos compostos (fusão, ebulição, densidade, solubilidade em água, pKa): do Wikidata, cada valor com a declaração e a referência que ela cita; o estado físico a 25 °C é derivado do ponto de fusão e do de ebulição.'
      ],
      bibliotecas: 'Bibliotecas de código aberto',
      rodape: 'O SaibaTudo é independente e de código aberto (MIT). ', privacidade: 'Política de privacidade',
      mantenedor: 'Mantenedor: {x}', licenca: 'Licença: {x}', acessadoEm: 'Acessado em: {x}', atribuicao: 'Atribuição: {x}', uso: 'Uso: {x}',
      somenteLink: 'somente link',
      referencias: {
        openstax: 'Livro didático aberto, com restrições de uso: indicado como leitura; nenhum trecho foi copiado.',
        icsc: 'Fichas por substância; o botão "Ficha ICSC no site da OIT" abre a busca por CAS.',
        nist: 'Dados termoquímicos e espectros; indicado como referência.',
        libretexts: 'Textos de Química abertos; indicados como leitura complementar.'
      },
      bibliotecasUso: { katex: 'Fórmulas e passos de cálculo', smiles: 'Estrutura 2D das moléculas', poppins: 'Fonte dos títulos' },
      assinaturaRotulo: {
        verificada: 'verificada (ECDSA P-256 com a chave pública do aplicativo)',
        invalida: 'NÃO confere: os dados do próprio site continuam em uso, mas não foram autenticados',
        indisponivel: 'não pôde ser verificada neste navegador (WebCrypto exige HTTPS)'
      },
      origemRotulo: {
        verificada: 'site (assinatura digital verificada)', invalida: 'site (assinatura NÃO verificada)', indisponivel: 'site (verificação indisponível neste navegador)',
        atualizada: 'atualização verificada (assinatura digital)'
      },
      sigDetalhe: { invalida: 'A assinatura do manifesto não confere; usando os arquivos do próprio site.', indisponivel: 'O navegador não oferece WebCrypto neste contexto (use HTTPS).' },
      atualizacao: {
        botao: 'Verificar atualização dos dados', verificando: 'Verificando…', atual: 'Os dados já estão na versão mais recente.', atualizado: 'Dados atualizados para a versão {version}.',
        ignorado: 'Nada a fazer: {motivo}', falha: 'Não foi possível verificar agora ({motivo}).',
        motivos: {
          semVerificacao: 'verificação de assinatura indisponível (HTTPS necessário)', assinaturaInvalida: 'assinatura do manifesto INVÁLIDA — atualização rejeitada',
          maisAntigo: 'pacote remoto é mais antigo que o ativo (anti-rollback)'
        }
      }
    },
    config: {
      titulo: 'Configurações', salva: 'Preferência salva neste aparelho.', aparencia: 'Aparência', tema: 'Tema', tamanhoTexto: 'Tamanho do texto', idioma: 'Idioma',
      idiomaAjuda: 'Muda a interface, as respostas e o interpretador de perguntas. Nomes e textos que ainda não existem no idioma aparecem em inglês ou português, sempre identificados.',
      instalar: 'Instalar', jaInstalado: 'O aplicativo já está instalado neste aparelho.', instalarApp: 'Instalar app',
      ia: 'Inteligência artificial na nuvem',
      iaAviso: 'Opcional e desligada por padrão. Só interpreta a pergunta: a resposta continua vindo dos dados e dos cálculos deste aparelho, e nenhum número vem do modelo. Quando você toca em "Perguntar à IA na nuvem", só o texto daquela pergunta e um código aleatório desta instalação são enviados ao nosso servidor. Numa continuação (“e o do potássio?”), vai também a interpretação da pergunta anterior, sem o texto dela.',
      nuvemAutomatica: 'IA na nuvem automática',
      nuvemAutomaticaAjuda: 'Quando o app não entender uma pergunta, enviá-la à IA na nuvem sem perguntar. Só o texto da pergunta é enviado; as respostas continuam vindo dos dados. Numa continuação (“e o do potássio?”), vai também a interpretação da pergunta anterior, sem o texto dela.',
      dados: 'Dados', versaoPacote: 'Versão do pacote', assinatura: 'Assinatura',
      assinaturaValor: { verificada: 'verificada', invalida: 'NÃO verificada', indisponivel: 'indisponível neste navegador' },
      privacidade: 'Privacidade', privacidadeTexto: 'Guardamos neste aparelho só o tema, o tamanho do texto e o idioma, além do cache para uso offline. ', politica: 'Política de privacidade',
      apagar: 'Apagar os dados deste aparelho', confirmar: 'Toque de novo para confirmar', apagados: 'Dados apagados. Recarregando…'
    }
  },

  propriedades: {
    rotulos: {
      numeroAtomico: 'número atômico', massaAtomica: 'massa atômica', simbolo: 'símbolo', grupo: 'grupo (família)', periodo: 'período', bloco: 'bloco', categoria: 'categoria',
      configuracaoEletronica: 'configuração eletrônica', eletronegatividade: 'eletronegatividade (Pauling)', raioAtomicoPm: 'raio atômico (van der Waals)',
      afinidadeEletronicaKJmol: 'afinidade eletrônica', energiaIonizacaoKJmol: 'energia de ionização', pontoFusaoK: 'ponto de fusão', pontoEbulicaoK: 'ponto de ebulição',
      densidadeKgm3: 'densidade', estadoPadrao: 'estado físico (condições padrão)', estadosOxidacao: 'estados de oxidação', descoberta: 'descoberta',
      massaMolar: 'massa molar', massaExata: 'massa exata (monoisotópica)', formula: 'fórmula', cas: 'número CAS', cid: 'CID no PubChem', smiles: 'SMILES', inchiKey: 'InChIKey',
      nomeIupac: 'nome IUPAC', xlogp: 'XLogP (lipofilicidade calculada)', doadoresH: 'doadores de ligação de hidrogênio', aceptoresH: 'aceptores de ligação de hidrogênio',
      ligacoesRotaveis: 'ligações rotáveis', carga: 'carga elétrica', tpsa: 'área de superfície polar (TPSA)', solubilidade: 'solubilidade em água', pka: 'pKa',
      entalpiaFormacaoKJmol: 'entalpia padrão de formação',
      energiaGibbsFormacaoKJmol: 'energia livre de Gibbs padrão de formação', entropiaPadraoJmolK: 'entropia molar padrão', particulas: 'prótons, nêutrons e elétrons'
    },
    medidas: {
      titulo: 'Propriedades físicas', intro: 'Valores medidos, cada um com a sua fonte e as condições da medida.',
      unidadeG100g: 'g/100 g de água', unidadeGL: 'g/L (em água)', pkaVarios: '{lista}',
      aTemperatura: 'a {k} K ({c} °C)', aPressao: 'a {pa} Pa ({atm} atm)', fase: 'fase: {fase}', referencia: 'referência: {x}',
      semReferencia: 'sem referência no Wikidata',
      semReferenciaCorroborado: (p) => `sem referência no Wikidata (${p.n} declarações concordam)`,
      derivado: 'derivado do ponto de fusão e do ponto de ebulição do pacote, a 25 °C e 1 atm', derivadoNome: 'SaibaTudo Química (valor derivado)',
      fontePacote: 'pacote de dados', revisar: 'valor a revisar',
      avisoRevisar: 'Valor a revisar: o do PubChem pode estar desatualizado (difere das tabelas atuais) e o Wikidata não tem esta propriedade.',
      notaPauling: 'Escala de Pauling, com os valores revisados de Allred (1961), como no PubChem; livros que usam os valores originais de Pauling diferem em alguns elementos.',
      notaPka: 'Menor pKa registrado (primeira dissociação); para bases, o Wikidata costuma registrar o pKa do ácido conjugado, e ácidos fortes ficam sem pKa.',
      estadoA25: 'estado físico a 25 °C e 1 atm',
      padrao298: 'estado padrão a 298,15 K (25 °C)', faseEstadoPadrao: 'fase: {fase} (estado físico do composto a 25 °C)', campoChembox: 'campo {campo} do chembox'
    },
    categorias: {
      metal_alcalino: 'metal alcalino', metal_alcalino_terroso: 'metal alcalino-terroso', metal_transicao: 'metal de transição', metal_pos_transicao: 'metal pós-transição',
      semimetal: 'semimetal (metaloide)', nao_metal: 'não metal', halogenio: 'halogênio', gas_nobre: 'gás nobre', lantanideo: 'lantanídeo', actinideo: 'actinídeo',
      desconhecida: 'propriedades químicas desconhecidas', metal: 'metal'
    },
    categoriasPlural: {
      metal_alcalino: 'metais alcalinos', metal_alcalino_terroso: 'metais alcalino-terrosos', metal_transicao: 'metais de transição', metal_pos_transicao: 'metais pós-transição',
      semimetal: 'semimetais', nao_metal: 'não metais', halogenio: 'halogênios', gas_nobre: 'gases nobres', lantanideo: 'lantanídeos', actinideo: 'actinídeos', metal: 'metais'
    },
    estados: { solido: 'sólido', liquido: 'líquido', gas: 'gás', desconhecido: 'desconhecido' },
    descoberta: { em: 'em {ano}', por: 'por {por}' },
    classes: {
      acido: 'ácido', acido_carboxilico: 'ácido carboxílico', base: 'base', sal: 'sal', oxido: 'óxido', hidroxido: 'hidróxido', peroxido: 'peróxido', oxidante: 'oxidante',
      inorganico: 'inorgânico', organico: 'orgânico', alcool: 'álcool', fenol: 'fenol', aldeido: 'aldeído', cetona: 'cetona', eter: 'éter', ester: 'éster', amina: 'amina', amida: 'amida',
      alcano: 'alcano', alqueno: 'alqueno', alquino: 'alquino', hidrocarboneto: 'hidrocarboneto', aromatico: 'aromático', heterociclico: 'heterocíclico', halogenado: 'composto halogenado',
      carboidrato: 'carboidrato', aminoacido: 'aminoácido', lipidio: 'lipídio', proteina: 'proteína', vitamina: 'vitamina', farmaco: 'fármaco', solvente: 'solvente', polimero: 'polímero',
      gas: 'gás', metal: 'metal', nitrocomposto: 'nitrocomposto', nitrila: 'nitrila', tiol: 'tiol', sulfonato: 'sulfonato', organometalico: 'organometálico', ionico: 'composto iônico',
      molecular: 'composto molecular', esteroide: 'esteroide', alcaloide: 'alcaloide', acido_forte: 'ácido forte', base_forte: 'base forte', organoclorado: 'organoclorado'
    },
    unidades: {
      kg: 'quilograma', g: 'grama', t: 'tonelada', lb: 'libra', oz: 'onça', 'µg': 'micrograma', m3: 'metro cúbico', L: 'litro', cm3: 'centímetro cúbico', dm3: 'decímetro cúbico',
      'µL': 'microlitro', gal: 'galão (EUA)', m: 'metro', 'Å': 'ångström', in: 'polegada', ft: 'pé', mi: 'milha', Pa: 'pascal', bar: 'bar', atm: 'atmosfera', mmHg: 'milímetro de mercúrio',
      psi: 'libra-força por polegada quadrada', J: 'joule', cal: 'caloria termoquímica', eV: 'elétron-volt', kWh: 'quilowatt-hora', K: 'kelvin', '°C': 'grau Celsius', '°F': 'grau Fahrenheit',
      s: 'segundo', min: 'minuto', h: 'hora', d: 'dia', mol: 'mol', 'mol/L': 'mol por litro', 'mmol/L': 'milimol por litro', 'µmol/L': 'micromol por litro'
    }
  },

  respostas: {
    fontes: {
      app: 'SaibaTudo Química (este aplicativo)',
      calculo: 'Cálculo local do aplicativo, com dados do pacote assinado',
      pacote: 'Pacote de dados',
      frasesPadrao: 'Frases de perigo: UNECE GHS / ECHA CLP',
      regras: 'regras.json (pacote de dados assinado)',
      politica: 'Política de segurança do aplicativo (regras locais)',
      pubchemCid: 'PubChem CID {cid} (NCBI/NLM)',
      chebi: 'ChEBI ({id})', chebiSem: 'ChEBI (EMBL-EBI)',
      constanteR: 'Cálculo local com a constante R do pacote (CODATA)',
      tabelaUnidades: 'Tabela de unidades: {origem}',
      orientacaoGeral: 'Orientação geral do aplicativo (não é dado de uma substância específica)',
      massasAtomicas: 'Massas atômicas do pacote de dados (elementos.json)',
      constantes: 'Constantes do pacote de dados (constantes.json)',
      boyle: 'Cálculo local do aplicativo, com a tabela de unidades do pacote de dados',
      wikipedia: 'Wikipédia em {idioma}',
      trechoEm: 'Texto em {idioma} (ainda sem tradução).',
      regrasNox: 'Regras de NOX dos livros didáticos (convenção), aplicadas pelo aplicativo',
      regraLigacao: 'Regra didática da diferença de eletronegatividade (escala de Pauling; limites 0,4 e 1,7 por convenção)',
      acaoDasMassas: 'Lei da ação das massas (regra), cálculo local do aplicativo',
      particulas: 'Contagem por regra: prótons = Z, elétrons = Z − carga, nêutrons = A − Z (número de massa menos número atômico)',
      distribuicao: 'Distribuição calculada pelo aplicativo a partir da configuração do pacote (regra de Madelung, diagrama de Linus Pauling)',
      substanciaSimples: 'Convenção: ΔHf° = 0 para substância simples no estado padrão',
      entalpiaCalculo: 'Cálculo local do aplicativo (lei de Hess), com os ΔHf° do pacote de dados'
    },
    unidades: {
      origem: { pacote: 'regras.json (pacote de dados assinado)', padrao: 'tabela padrão do aplicativo (definições do SI)' },
      pKw: { regras: 'regras.json (pacote de dados)', constantes: 'constantes.json (pacote de dados)', convencao: 'convenção a 25 °C (produto iônico da água, pH + pOH = 14)' },
      constanteRDerivada: 'Constante universal dos gases (N_A × k_B)'
    },
    sugestoes: {
      padrao: [
        'Qual é a massa molar da água?', 'Balancear Fe + O2 -> Fe2O3', 'pH de HCl 0,01 mol/L', 'Estrutura da aspirina', 'Perigos do ácido sulfúrico', 'Converter 5 atm em kPa',
        'Quantos mols há em 18 g de água?', 'Ponto de fusão do ferro', 'Elementos do grupo 17', 'O que é um mol?', 'Por que não misturar água sanitária com amoníaco?'
      ],
      seguras: ['Quais EPIs usar com ácido sulfúrico?', 'Primeiros socorros para respingo de soda cáustica no olho', 'Por que não misturar água sanitária com amoníaco?'],
      massaAgua: 'Qual é a massa molar da água?', balancear: 'Balancear Fe + O2 -> Fe2O3', phHcl: 'pH de HCl 0,01 mol/L', perigosSulfurico: 'Perigos do ácido sulfúrico',
      converter: 'Converter 5 atm em kPa', molsAgua: 'Quantos mols há em 18 g de água?', fusaoFerro: 'Ponto de fusão do ferro', grupo17: 'Elementos do grupo 17', periodo3: 'Elementos do período 3',
      misturar: 'Por que não misturar água sanitária com amoníaco?', fontes: 'Quais as fontes?', origemDados: 'De onde vêm os dados?', massaMolarAgua: 'Massa molar da água',
      formulaSulfurico: 'Qual a fórmula do ácido sulfúrico?', compareNaCl: 'Compare sódio e cloro', maisEletronegativo: 'Elemento mais eletronegativo',
      molaridade: 'Molaridade de 5,85 g de NaCl em 500 mL', volumeGas: 'Qual o volume de 2 mols de gás a 300 K e 1 atm?',
      fusaoDe: 'Ponto de fusão de {nome}', configuracaoDe: 'Configuração eletrônica de {nome}', massaMolarDe: 'Massa molar de {nome}', estruturaDe: 'Estrutura de {nome}',
      perigosDe: 'Perigos de {nome}', densidadeDe: 'Densidade de {nome}',
      noxSulfurico: 'NOX do enxofre no H2SO4', ligacaoHCl: 'Tipo de ligação do HCl', kcAmonia: 'Expressão do Kc para N2 + 3 H2 ⇌ 2 NH3', entalpiaHess: 'Entalpia da reação pela lei de Hess'
    },
    orientacaoGeral: [
      'Leia o rótulo e a ficha de segurança (FISPQ) do produto antes de usar e siga as instruções do fabricante.',
      'Use luvas e óculos de proteção compatíveis com o produto e trabalhe em local ventilado.',
      'Não misture produtos químicos; guarde no recipiente original, bem fechado, longe de crianças, alimentos e fontes de calor.',
      'Em contato com a pele ou os olhos, lave com água corrente em abundância; se inalar, vá para o ar livre; não provoque vômito sem orientação profissional.',
      'Em qualquer intoxicação ou acidente, procure atendimento médico ou o centro de informação toxicológica da sua região, levando a embalagem do produto.'
    ],
    blocos: {
      palavraSinal: 'Palavra de sinal: {x}', estrutura2d: 'Estrutura 2D de {nome}', passoAPasso: 'Passo a passo', comoCalcular: 'Como calcular', comoConverter: 'Como converter'
    },
    erro: { titulo: 'Não consegui montar essa resposta', texto: 'Ocorreu um problema ao ler os dados ({msg}). Tente de novo ou use as telas do aplicativo.' },
    recusa: {
      tituloAutolesao: 'Você não está sozinho(a)', titulo: 'Não posso ajudar com esse pedido',
      padrao: 'Não posso ajudar com isso. O SaibaTudo Química não fornece instruções de síntese, purificação, ampliação de escala nem receitas caseiras de explosivos, armas químicas, drogas ilícitas, seus precursores ou outros reagentes perigosos, porque podem causar mortes e ferimentos graves.',
      alternativas: 'Posso ajudar com segurança e conhecimento: perigos, equipamentos de proteção (EPI), armazenamento, descarte e primeiros socorros de uma substância; propriedades, fórmula, massa molar e estrutura; cálculos e conceitos de Química.',
      DANO_A_PESSOAS: 'Não posso ajudar com isso. Não oriento sobre como ferir, envenenar ou intoxicar pessoas ou animais. Se alguém corre perigo ou foi exposto a uma substância, procure imediatamente um serviço de emergência ou um centro de informação toxicológica da sua região.',
      AUTOLESAO: 'Sinto muito que você esteja passando por isso. Não posso orientar sobre esse assunto, mas você não está sozinho(a): procure agora alguém de confiança e um serviço de emergência da sua região. O Centro de Valorização da Vida (CVV) conversa com qualquer pessoa, de forma gratuita e sigilosa, em https://cvv.org.br.',
      categorias: {
        EXPLOSIVOS: 'explosivos', ARMAS_QUIMICAS: 'armas químicas', DROGAS: 'drogas ilícitas', PRECURSORES: 'precursores de drogas ou de armas',
        REAGENTES_CASEIROS: 'receitas caseiras com reagentes perigosos', DANO_A_PESSOAS: 'dano a pessoas', AUTOLESAO: 'risco à própria vida'
      }
    },
    ajuda: {
      titulo: 'O que o SaibaTudo Química faz',
      texto: 'Eu respondo perguntas de Química com dados abertos e com cálculos feitos no seu aparelho: nada sai do seu celular ou computador.',
      podePerguntar: 'Você pode perguntar sobre',
      itens: [
        'elementos e a tabela periódica (propriedades, grupos, períodos)', 'compostos (fórmula, massa molar, estrutura 2D e perigos do GHS)',
        'cálculos com passos: massa molar, balanceamento, estequiometria, concentração e diluição, pH, gás ideal e unidades',
        'segurança: pictogramas, frases de perigo e como evitar misturas perigosas', 'conceitos básicos, com trechos de fontes abertas citadas'
      ],
      aviso: 'Não ajudo com síntese, purificação ou receitas de explosivos, armas químicas, drogas ilícitas e outros reagentes perigosos.',
      tabela: 'Tabela periódica', calculadoras: 'Calculadoras'
    },
    sobreDados: {
      titulo: 'Sobre os dados deste aplicativo', versao: 'Versão do pacote de dados', geradoEm: 'Gerado em', assinatura: 'Assinatura digital (ECDSA P-256)',
      sig: { verificada: 'verificada', invalida: 'NÃO verificada', indisponivel: 'não pôde ser verificada neste navegador' },
      elementos: 'Elementos no pacote', compostos: 'Compostos no índice', fontesListadas: 'Fontes listadas',
      texto: 'A lista completa de fontes, licenças e datas está na tela "Sobre os dados". Todo valor mostrado vem do pacote assinado ou de um cálculo local.',
      acao: 'Ver todas as fontes e licenças'
    },
    fontesResp: { titulo: 'Fontes dos dados', usa: 'O pacote de dados usa', semLista: 'A lista de fontes está na tela "Sobre os dados".', acao: 'Sobre os dados' },
    naoEntendi: {
      titulo: 'Não entendi a pergunta', comPergunta: 'Não entendi "{q}". Tente citar um elemento, um composto, uma fórmula ou um cálculo, por exemplo:', semPergunta: 'Escreva sua pergunta, por exemplo:',
      tabela: 'Tabela periódica', compostos: 'Buscar compostos', calculadoras: 'Calculadoras'
    },
    elemento: {
      nomeEmIngles: 'Nome em inglês', titulo: '{nome} ({simbolo}), elemento {z}', ficha: 'Ficha completa de {nome}', verTabela: 'Ver na tabela periódica'
    },
    composto: {
      nomePopular: 'Nome popular', nomeIupac: 'Nome IUPAC', formula: 'Fórmula', massaMolar: 'Massa molar', cas: 'Número CAS', cid: 'CID no PubChem', classes: 'Classes',
      perigosGhs: 'Perigos (GHS)', definicaoIngles: 'Definição em inglês.', ficha: 'Ficha completa', icsc: 'Ficha ICSC no site da OIT', icscDe: 'Ficha ICSC de {nome} no site da OIT'
    },
    propriedade: {
      deQual: 'De qual substância?',
      digaQualElemento: 'Diga de qual elemento ou composto você quer {props}. Por exemplo: "ponto de fusão do ferro".',
      digaQualPropriedade: 'Diga qual propriedade e de qual elemento ou composto. Por exemplo: "densidade do ouro".',
      de: '{prop} de {nome}',
      outroTipo: (p) => `${p.prop} (essa propriedade é de ${p.alvo === 'composto' ? 'compostos' : 'elementos'}; ${p.outros} ${p.n > 1 ? 'são' : 'é'} de outro tipo)`,
      faltaTermo: 'Falta {simbolo} de {nome} no pacote de dados; o aplicativo não estima esse valor.', naoTem: 'O pacote de dados não tem: {lista}.', fichaDe: 'Ficha de {nome}', propriedadesDe: 'Propriedades de {nomes}',
      oferece: 'Para {nome}, o pacote traz: {lista}.', solubilidadeDeQual: 'Diga de qual composto você quer a solubilidade em água. Por exemplo: "solubilidade da ureia".'
    },
    massaMolar: {
      tituloElemento: 'Massa molar: {nome} ({simbolo})', deAtomos: 'Massa molar de {nome} (átomos)',
      avisoMolecular: 'Para a substância simples molecular, como O₂ ou N₂, digite a fórmula: a massa molar é a do átomo vezes o número de átomos da molécula.',
      abrirCalculadora: 'Abrir na calculadora', deQue: 'Massa molar de quê?',
      digite: 'Digite a fórmula ou o nome da substância. Por exemplo: "massa molar da água" ou "massa molar de Ca(OH)2".', calculadora: 'Calculadora de massa molar',
      naoConsegui: 'Não consegui calcular a massa molar', composicao: 'Composição em massa', referencia: 'Valor de referência', pubchemInforma: 'PubChem informa',
      titulo: (p) => `Massa molar${p.nome ? `: ${p.nome}` : ''} (${p.formula})`
    },
    balancear: {
      titulo: 'Balanceamento de equações',
      digite: 'Digite a equação com os reagentes, uma seta e os produtos. Por exemplo: Fe + O2 -> Fe2O3. Íons também valem: Zn + Cu2+ -> Zn2+ + Cu.',
      abrir: 'Abrir a calculadora', naoConsegui: 'Não consegui balancear', ajustar: 'Ajustar na calculadora', balanceada: 'Equação balanceada',
      coeficientesIgnorados: 'Os coeficientes digitados foram ignorados: o aplicativo balanceia a equação inteira.', abrirNa: 'Abrir na calculadora'
    },
    estequiometria: {
      abrir: 'Abrir a calculadora de estequiometria', faltam: 'Faltam as quantidades',
      digaCadaReagente: 'Diga a quantidade de cada reagente com o nome ou a fórmula, por exemplo "4 g de H2 e 16 g de O2".',
      informePeloMenos: 'Informe a quantidade de pelo menos um reagente, por exemplo "4 g de H2 e 16 g de O2".', naoConsegui: 'Não consegui calcular',
      titulo: 'Estequiometria: {equacao}', particulas: 'partículas', tituloQuantidade: '{valor} {unidade} de {formula}', abrirNa: 'Abrir na calculadora',
      volumeTitulo: 'Volume de {valor} {unidade} de um gás ideal nas CNTP', volumeCntp: 'Volume nas CNTP (0 °C e 1 atm)', volumeMolar: 'Volume molar (RT/P)',
      passoVolume: 'Pela equação dos gases ideais, o volume molar é Vm = RT/P, com T = 0 °C e P = 1 atm; multiplique pela quantidade de matéria.',
      abrirGas: 'Abrir a calculadora de gás ideal', tituloGeral: 'Estequiometria',
      explicacao: 'Para converter massa, mol, partículas e volume, diga a quantidade e a substância, por exemplo "quantos mols há em 18 g de água?". Para reagente limitante, escreva a equação e as quantidades.'
    },
    concentracao: {
      abrir: 'Abrir a calculadora', titulo: 'Concentração e diluição',
      diga: 'Diga os valores com unidades. Exemplos: "molaridade de 5,85 g de NaCl em 500 mL", "quantos gramas de NaOH para 250 mL de solução 0,1 mol/L" ou "diluir 100 mL de solução 2 mol/L para 0,5 mol/L".',
      naoConsegui: 'Não consegui calcular', padrao: 'Concentração',
      modos: { molaridade: 'Molaridade da solução', massa: 'Massa de soluto necessária', 'gl-mol': 'Conversão g/L ↔ mol/L', 'percentual-mm': 'Percentual em massa', 'percentual-mv': 'Percentual massa/volume', diluicao: 'Diluição' }
    },
    ph: {
      abrir: 'Abrir a calculadora de pH', conversoes: 'Conversões a partir de {de} = {valor}', titulo: 'pH de uma solução',
      informe: 'Informe a concentração em mol/L e a substância. Exemplos: "pH de HCl 0,01 mol/L" ou "pH do ácido acético 0,1 mol/L com Ka 1,8e-5".',
      maisDados: 'Preciso de mais dados para o pH', naoTenho: 'Não tenho "{formula}" na lista de ácidos e bases fortes do pacote. ',
      fracos: 'Para ácidos e bases fracos, informe Ka (ou pKa) ou Kb (ou pKb); para fortes, escreva a fórmula, por exemplo HCl ou NaOH.',
      parcial: 'Só a 1ª ionização é forte; a 2ª é parcial e foi ignorada (aproximação).', naoConsegui: 'Não consegui calcular o pH',
      tituloResultado: (p) => `pH ${p.ph}${p.formula ? ` (${p.formula} ${p.conc} mol/L)` : ''}`
    },
    gas: {
      abrir: 'Abrir a calculadora de gás ideal', tituloEquacao: 'Gás ideal: PV = nRT', naEquacao: 'Na equação',
      variaveis: 'P é a pressão, V é o volume, n é a quantidade de matéria (em mol) e T é a temperatura absoluta (em kelvin).',
      constante: 'R é a constante universal dos gases: {valor} J/(mol·K), valor do pacote de dados ({fonte}).', constanteSem: 'R é a constante universal dos gases.',
      informeTres: 'Informe três das quatro grandezas com unidades e eu calculo a quarta, com os passos.', tituloFalta: 'Gás ideal (PV = nRT)',
      informeTresEx: 'Informe três das quatro grandezas (pressão, volume, quantidade de matéria e temperatura) com unidades. Exemplo: "qual o volume de 2 mols de gás a 300 K e 1 atm?".',
      naoConsegui: 'Não consegui calcular'
    },
    conversao: {
      abrir: 'Abrir o conversor de unidades', titulo: 'Conversão de unidades', diga: 'Diga o valor, a unidade e a unidade de destino. Exemplo: "converter 5 atm em kPa".',
      naoConsegui: 'Não consegui converter', em: '{valor} {de} em {para}'
    },
    nomenclatura: {
      titulo: 'Nomenclatura', naoEncontreiFormula: 'Não encontrei "{formula}" entre os compostos do pacote.', naoEncontrei: 'Não encontrei esse composto.', tente: ' Tente o nome comum ou a fórmula.',
      buscar: 'Buscar compostos', nome: 'Nome', nomePopular: 'Nome popular', nomeIupac: 'Nome IUPAC', formula: 'Fórmula', formulaHill: 'Fórmula na notação de Hill',
      observacao: 'Observação', ptPendente: 'O nome em português ainda está pendente; o nome mostrado é o IUPAC.', ficha: 'Ficha completa'
    },
    desenhar: {
      estruturaDe: 'Estrutura de {nome}', semSmiles: 'O pacote de dados não tem o SMILES desse composto, então não consigo desenhar a estrutura.', ficha: 'Ficha completa',
      estrutura2d: 'Estrutura 2D de {nome}', smiles: 'SMILES', formula: 'Fórmula'
    },
    comparar: {
      titulo: 'Comparação: {nomes}', propriedade: 'Propriedade', fichaDe: 'Ficha de {nome}',
      linhas: { formula: 'Fórmula', massaMolar: 'Massa molar', cas: 'Número CAS', nomeIupac: 'Nome IUPAC', xlogp: 'XLogP', sinal: 'Palavra de sinal (GHS)', pictogramas: 'Pictogramas (GHS)' },
      maior: '{prop}: maior em {nome} ({valor}).', maisNegativo: '{prop}: mais negativo em {nome} ({valor}).',
      ordemCrescente: '{prop}, em ordem crescente: {lista}.', ordemDecrescente: '{prop}, em ordem decrescente: {lista}.', semDadoOrdem: 'Sem esse dado no pacote: {nomes}.', tituloGeral: 'Comparar', explicacao: 'Compare itens do mesmo tipo: dois elementos ("compare sódio e cloro") ou dois compostos ("diferença entre etanol e ácido acético").'
    },
    tabela: {
      abrir: 'Abrir a tabela periódica', naoTemProp: 'O pacote não tem {prop} para os elementos carregados.',
      extremo: (p) => `${p.dir === 'max' ? 'Maior' : 'Menor'} ${p.prop} no pacote: ${p.nome} (${p.simbolo})`,
      entreOs: 'Entre os {n} elementos com esse dado no pacote', elemento: 'Elemento', simbolo: 'Símbolo', nome: 'Nome', numero: 'Nº',
      grupo: 'grupo {g}', periodo: 'período {p}', bloco: 'bloco {b}', estado: 'estado {estado}', elementos: 'Elementos: {criterios}', titulo: 'Tabela periódica',
      pacoteTem: (p) => `O pacote tem ${p.n} ${p.n === 1 ? 'elemento' : 'elementos'} organizados por grupo, período e bloco, com cores por categoria. Toque num elemento para ver a ficha completa.`,
      nenhum: 'Nenhum elemento do pacote atende a esses critérios.', destacar: 'Destacar na tabela periódica', comContagem: '{titulo} ({n})',
      tendencia: 'Tendência: {prop}', tendenciaTexto: 'Valores do pacote de dados ao longo de um período e de um grupo; compare as linhas para ver a tendência.',
      periodoLegenda: 'Período {p}, da esquerda para a direita (número atômico crescente)', grupoLegenda: 'Grupo {g}, de cima para baixo (período crescente)',
      colGrupo: 'Grupo', colPeriodo: 'Período', naoTemSuficiente: 'O pacote não tem {prop} para elementos suficientes de um mesmo período ou grupo.'
    },
    seguranca: {
      naoMisture: 'Não misture {a} com {b}. {motivo}',
      naoMistureGeral: 'Não misture {a} com {b}: misturar produtos químicos pode gerar calor, gases tóxicos ou outras reações perigosas. Veja os perigos de cada um abaixo e nunca misture produtos de limpeza.',
      semGhs: 'O pacote não traz classificação de perigo GHS (harmonizada) para {nome}. Isso não quer dizer que seja inofensivo: consulte a ficha de segurança do produto.',
      perigosDe: 'Perigos de {nome} (GHS)',
      elementoSemGhs: 'O pacote traz a classificação de perigo (GHS) apenas de compostos, não do elemento {nome}. Os perigos dependem da forma química (por exemplo, o vapor do metal ou um sal): consulte a ficha de segurança do produto.',
      orientacao: 'Orientação geral de segurança', naoIdentifiquei: 'Não identifiquei a substância. Diga o nome ou a fórmula para ver os perigos do GHS, ou siga a orientação geral abaixo.',
      comoLer: 'Como ler pictogramas e frases H', titulo: 'Segurança: {alvo}', tituloGeral: 'Segurança química', eConector: ' e '
    },
    particulas: {
      titulo: '{especie}: {protons}, {neutrons} e {eletrons}',
      tituloAprox: '{especie}: {protons}, {eletrons} e cerca de {neutrons}',
      contProtons: (p) => (Number(p.n) === 1 ? '1 próton' : `${p.n} prótons`),
      contNeutrons: (p) => (Number(p.n) === 1 ? '1 nêutron' : `${p.n} nêutrons`),
      contEletrons: (p) => (Number(p.n) === 1 ? '1 elétron' : `${p.n} elétrons`),
      especie: 'Espécie',
      protons: 'Prótons (Z)',
      eletrons: 'Elétrons',
      neutrons: 'Nêutrons',
      numeroMassa: 'Número de massa (A)',
      atomoNeutro: 'átomo neutro de {nome}',
      cation: 'cátion {ion} ({nome})',
      anion: 'ânion {ion} ({nome})',
      isotopo: 'isótopo {iso}',
      eletronsNeutro: 'átomo neutro: igual a Z',
      neutronsAprox: 'cerca de {n}',
      numeroMassaAprox: 'cerca de {a}',
      aproxMassa: 'aproximado pela massa atômica, {m}',
      avisoAprox: 'Número de massa aproximado pela massa atômica ({m} → {a}); o número de nêutrons depende do isótopo. Para um isótopo, pergunte, por exemplo: "nêutrons do {simbolo}-{a}".',
      semMassa: 'O pacote de dados não tem a massa atômica de {nome}: sem o número de massa, os nêutrons não são calculados.',
      cargaInvalida: 'A carga {carga} tiraria mais elétrons do que {nome} tem ({z}): esse íon não existe.',
      linhaIon: 'Íon {ion} ({tipo}): {eletrons} ({conta}).',
      linhaIsotopo: 'Isótopo {iso}: {protons} e {neutrons} ({conta}).',
      tipoCation: 'cátion',
      tipoAnion: 'ânion'
    },
    constanteEquilibrio: {
      titulo: 'Constante de equilíbrio (Kc e Kp)',
      explicacao: 'A constante de equilíbrio Kc é o quociente das concentrações no equilíbrio (mol/L) dos produtos pelas dos reagentes, cada uma elevada ao seu coeficiente na equação balanceada: para aA + bB ⇌ cC + dD, Kc = [C]^c·[D]^d / ([A]^a·[B]^b). Só entram gases e espécies em solução aquosa; sólidos e líquidos puros ficam fora. Kp é a mesma expressão com as pressões parciais dos gases, e as duas se relacionam por Kp = Kc·(RT)^Δn, em que Δn é a variação do número de mols de gás (produtos − reagentes) e T, a temperatura em kelvin. O valor de K depende só da temperatura.',
      equacao: 'Me dê a equação (ex.: N2 + 3 H2 ⇌ 2 NH3) e eu monto a expressão.',
      temperatura: 'A temperatura da pergunta ({t} K) já vai preenchida na calculadora.'
    },
    conceito: {
      semTexto: 'Ainda não tenho um texto sobre isso',
      naoEncontrei: 'Não encontrei, entre os trechos licenciados do pacote de dados, uma explicação sobre "{termo}". Os dados de elementos, compostos e as calculadoras continuam disponíveis.',
      traducaoAutomatica: 'Tradução automática, ainda não revisada por uma pessoa.', emIngles: 'Texto em inglês (ainda sem tradução).', padrao: 'Conceito'
    },
    equacaoErros: {
      semSeta: 'Não encontrei a seta da reação. Escreva reagentes -> produtos, por exemplo: N2 + 3 H2 ⇌ 2 NH3.', duasSetas: 'A equação tem mais de uma seta. Digite uma reação por vez.',
      lado: 'Falta um dos lados da equação (reagentes ou produtos).', eletron: 'Semirreações (com elétrons) não entram neste cálculo: use a equação completa.',
      formula: 'Há uma fórmula inválida na equação.', balancear: 'Não consegui balancear a equação.', expressao: 'Não consegui montar a expressão.'
    },
    nox: {
      titulo: 'NOX em {formula}', tituloElemento: 'NOX de {el} em {formula}: {nox}', deQual: 'NOX de qual composto?',
      digite: 'Diga a fórmula (com a carga, se for um íon). Exemplos: "NOX do enxofre no H2SO4", "NOX do Mn no MnO4-", "NOX do cromo no Cr2O7 2-".',
      naoConsegui: 'Não consegui calcular o NOX', hidrato: 'Hidratos não entram neste cálculo: digite a fórmula sem a água de cristalização.',
      indeterminado: 'Indeterminado pelas regras: {lista} ficam sem regra que fixe o NOX. Use a fórmula estrutural (ligação por ligação) para atribuir o NOX.',
      inconsistente: 'As regras dão soma {soma}, diferente da carga {carga}: confira a fórmula e a carga.',
      semDados: 'O pacote de dados não tem a eletronegatividade de: {lista}.', medio: 'NOX médio',
      regras: {
        substanciaSimples: 'substância simples: 0', ionMonoatomico: 'íon de um só elemento: carga ÷ átomos', fluor: 'flúor: sempre −1', grupo1: 'grupo 1: +1', grupo2: 'grupo 2: +2',
        aluminio: 'alumínio: +3', hidrogenio: 'hidrogênio: +1', hidretoMetalico: 'hidreto metálico: H −1', oxigenio: 'oxigênio: −2', peroxido: 'peróxido: O −1',
        superoxido: 'superóxido: O −1/2', halogenio: 'halogênio mais eletronegativo do composto: −1', eletronegatividade: 'o mais eletronegativo recebe o NOX negativo usual do grupo',
        balanco: 'pelo balanço (soma dos NOX = carga)'
      },
      passoRegras: 'Aplique as regras na ordem (substância simples, íon, F, grupos 1 e 2, Al, H, O, halogênios); o elemento que sobra sai do balanço.',
      passoSoma: 'A soma dos NOX vezes o número de átomos é igual à carga ({carga}):',
      avisoMedio: 'NOX fracionário é um NOX médio: os átomos desse elemento podem ter NOX diferentes entre si (veja a fórmula estrutural).',
      elementoAusente: '{el} não aparece em {formula}.', abrir: 'Abrir a calculadora de NOX'
    },
    ligacao: {
      titulo: 'Tipo de ligação: {alvo}', deQual: 'Ligação de quê?', digite: 'Diga a fórmula ou dois elementos. Exemplos: "tipo de ligação do NaCl", "que ligação há entre H e Cl".',
      naoConsegui: 'Não consegui classificar a ligação', semCategoria: 'O pacote de dados não tem a categoria (metal ou não metal) de: {lista}.',
      semEletronegatividade: 'O pacote de dados não tem a eletronegatividade de: {lista}.', semElemento: 'Não encontrei no pacote de dados o elemento: {lista}.',
      semEntrada: 'Diga a fórmula ou dois elementos.',
      tipos: { metalica: 'metálica', ionica: 'iônica', covalentePolar: 'covalente polar', covalenteApolar: 'covalente apolar', nenhuma: 'não forma ligação em condições comuns (gás nobre)' },
      delta: 'ΔEN = {d} ({a}: {ea}; {b}: {eb})', metalMetal: 'metal com metal',
      convencao: 'Regra didática: metal com metal → metálica; metal com não metal e ΔEN ≥ 1,7 → iônica; 0,4 ≤ ΔEN < 1,7 → covalente polar; ΔEN < 0,4 → covalente apolar. Os limites 0,4 e 1,7 são convenção (escala de Pauling); semimetais contam como não metais.',
      estimado: 'Com três ou mais elementos, os pares foram estimados pela fórmula (cada metal e cada não metal com o não metal mais eletronegativo); a estrutura real pode ter outras ligações.',
      polaridadeMolecula: 'A polaridade da molécula depende também da geometria: ligações polares podem se anular (como no CO₂, que é apolar).',
      abrir: 'Abrir a calculadora de tipo de ligação'
    },
    equilibrio: {
      titulo: 'Equilíbrio: {equacao}', deQual: 'Equilíbrio de qual reação?',
      digite: 'Escreva a equação com ⇌ (ou <=>, ->). Exemplos: "expressão do Kc para N2 + 3 H2 ⇌ 2 NH3", "Kc de N2 + 3 H2 ⇌ 2 NH3 com [N2] = 0,5 mol/L, [H2] = 1,5 mol/L e [NH3] = 0,2 mol/L".',
      naoConsegui: 'Não consegui montar a expressão do equilíbrio', balanceada: 'A equação foi balanceada antes: {equacao}.',
      semSolidoLiquido: 'Sólidos e líquidos puros não entram na expressão: {lista}.', gasPorHipotese: 'Sem o estado físico escrito nem dado no pacote, considerei gasosas: {lista}.',
      faseDoPacote: 'Estado físico tirado do pacote de dados (condições padrão): {lista}.', faseNaTemperatura: 'Estado físico a {t} K pelos pontos de fusão e de ebulição do pacote de dados: {lista}.', deltaN: 'Δn (gases): produtos − reagentes',
      kc: 'Kc', kp: 'Kp', fatorRT: '(RT)^Δn', temperatura: 'Temperatura', unidadeKc: 'concentrações em mol/L',
      faltam: 'Faltam as concentrações no equilíbrio de: {lista}. Sem elas, só a expressão de Kc.', invalida: 'As concentrações devem ser maiores que zero.',
      passoKc: 'Substitua as concentrações no equilíbrio (mol/L) na expressão:', passoKp: 'Kp = Kc·(RT)^Δn, com R = {R} L·atm/(mol·K) e T em kelvin:',
      semT: 'Para o valor de Kp, diga a temperatura (por exemplo, "a 500 K").', semR: 'A constante R não está no pacote de dados (constantes.json).',
      abrir: 'Abrir a calculadora de Kc e Kp'
    },
    entalpia: {
      tituloReacao: 'Entalpia da reação: {equacao}', tituloCombustao: 'Entalpia de combustão: {nome}', tituloHess: 'Entalpia da reação (lei de Hess)', tituloHessResultado: 'Lei de Hess',
      tituloAmostra: 'Calor da amostra', naoConsegui: 'Não consegui calcular a entalpia',
      digite: 'Diga a reação ou o composto. Exemplos: "ΔH da combustão do metano", "variação de entalpia de 2 H2 + O2 -> 2 H2O". Para a lei de Hess (várias equações com ΔH), use a calculadora.',
      hess: 'A lei de Hess soma equações conhecidas (multiplicadas por um fator ou invertidas) até chegar à reação desejada, e o ΔH se soma do mesmo jeito. Na calculadora você digita a equação alvo e até 4 equações com ΔH, e o aplicativo acha a combinação.',
      falta: 'O pacote de dados não tem a entalpia padrão de formação (ΔHf°) de: {lista}. Sem esse dado o ΔH não é calculado (nenhum valor é inventado).',
      expressao: 'ΔH° = Σ n·ΔHf°(produtos) − Σ n·ΔHf°(reagentes):', passoSoma: 'Com os valores do pacote de dados (kJ/mol):',
      valores: 'Entalpias padrão de formação usadas (298,15 K)', dHfDe: 'ΔHf° de {formula}', semValor: 'sem valor no pacote de dados',
      simples: '0 (substância simples no estado padrão, por definição)', resultado: 'ΔH° da reação', porMol: 'ΔH° de combustão por mol de {nome}',
      amostra: 'Calor de {valor} {unidade} de {nome}', passoAmostra: 'Quantidade de matéria da amostra: n = {mol} mol; o calor é a extensão da reação vezes o ΔH:',
      semMol: 'Não consegui converter a quantidade informada em mol.',
      exotermica: 'ΔH < 0: reação exotérmica (libera calor).', endotermica: 'ΔH > 0: reação endotérmica (absorve calor).',
      combustaoCompleta: 'Combustão completa, com os produtos no estado padrão (CO₂, H₂O, N₂, SO₂).', balanceada: 'A equação foi balanceada antes: {equacao}.',
      naoQueima: 'A combustão completa aqui só vale para compostos de C, H, O, N e S.',
      hessAlvo: 'Equação alvo: {msg}', hessEquacao: 'Equação {n}: {msg}', naoBalanceada: 'A equação {n} não está balanceada como foi escrita.',
      semDH: 'Falta o ΔH da equação {n}.', semCombinacao: 'Não há combinação das equações dadas que resulte na reação alvo.',
      hessPasso: 'Equação {n} × {fator}: ΔH = {dH} kJ', hessInvertida: 'Equação {n} invertida, × {fator}: ΔH = {dH} kJ', hessSoma: 'Some os ΔH das equações combinadas:',
      hessResultado: 'ΔH da reação alvo', abrir: 'Abrir a calculadora de entalpia', abrirHess: 'Abrir a calculadora (Hess)'
    },
    eletronica: {
      titulo: 'Distribuição eletrônica de {nome}', tituloIon: 'Distribuição eletrônica do íon {simbolo} ({carga})', deQual: 'Configuração eletrônica de qual elemento?',
      digite: 'Diga o elemento (símbolo ou nome), por exemplo "configuração eletrônica do ferro".',
      pacote: 'Configuração no pacote de dados', completa: 'Notação completa (ordem de preenchimento, Linus Pauling)', camadasOrdem: 'Em ordem de camadas',
      porCamada: 'Elétrons por camada', camadaValencia: 'Camada de valência', camadaValenciaValor: '{camada} (n = {n}), {e} elétron(s)',
      eletronsValencia: 'Elétrons de valência', valenciaTransicao: '{e} (convenção para metais de transição: ns + (n−1)d)', valenciaF: '{e} (convenção: ns + (n−1)d + (n−2)f)',
      maisEnergetico: 'Subnível mais energético', bloco: 'Bloco',
      totalDiferente: 'A configuração do pacote de dados soma {total} elétrons, mas o número atômico é {z}: a distribuição não foi calculada (o dado não é corrigido à mão).',
      semConfiguracao: 'O pacote de dados não tem a configuração eletrônica de {nome}.', cargaInvalida: 'Carga inválida para {nome}.',
      ignorados: 'Observação do pacote de dados: {lista}.', abrir: 'Abrir a calculadora de configuração eletrônica'
    },
    calc: {
      formula: {
        vazia: 'Fórmula vazia', quantidadeInvalida: 'Quantidade inválida "{x}"', quantidadeGrande: 'Quantidade grande demais', fechaSemAbre: 'Parêntese ")" sem "(" correspondente',
        abreSemFecha: 'Parêntese "(" sem ")" correspondente', vazios: 'Parênteses vazios', naoSimbolo: '"{x}" não é símbolo de elemento',
        minuscula: 'Letra minúscula "{c}" fora de lugar (símbolos começam com maiúscula, como em "Na" e "Cl")', inesperado: 'Caractere inesperado "{c}"', parteVazia: 'Parte vazia (confira o "·" do hidrato)'
      },
      balancear: {
        digite: 'Digite a equação, por exemplo: Fe + O2 -> Fe2O3', semSeta: 'Não encontrei a seta da reação. Escreva reagentes -> produtos, por exemplo: H2 + O2 -> H2O',
        duasSetas: 'A equação tem mais de uma seta. Digite uma reação por vez.', faltam: 'Faltam os {lado} da equação', reagentes: 'reagentes', produtos: 'produtos',
        substancia: 'Substância "{corpo}": {msg}', grande: 'Equação grande demais (máximo de 40 substâncias).',
        soDeUmLado: (p) => `O elemento ${p.el} aparece só ${p.lado === 'r' ? 'nos reagentes' : 'nos produtos'}: confira as fórmulas ou acrescente a substância que falta.`,
        semCombinacao: 'Não existe combinação de coeficientes que equilibre essa equação. Confira as fórmulas e as cargas.',
        varias: 'A equação reúne mais de uma reação independente, então há várias maneiras de balanceá-la. Digite uma reação por vez.',
        coefZero: 'Alguma substância ficaria com coeficiente zero: ela não participa da reação como escrita. Confira a equação.',
        negativos: 'Os coeficientes não podem ser todos positivos: a equação, como escrita, não representa uma reação possível.', coefGrandes: 'Coeficientes grandes demais para esta equação.',
        passo1: 'Dê um coeficiente desconhecido a cada substância (letras) e escreva a equação com eles.',
        passo2: (p) => `Para cada ${p.carga ? 'elemento (e para a carga elétrica)' : 'elemento'}, a quantidade de átomos tem de ser igual nos dois lados:`, carga: 'carga',
        passo3: 'Resolva o sistema (eliminação de Gauss com frações exatas), escolhendo uma das incógnitas como 1:',
        passo4: (p) => `${p.mmc ? `Multiplique tudo por ${p.den} (o mínimo múltiplo comum dos denominadores)` : 'Divida pelo maior divisor comum'} para obter os menores números inteiros:`,
        passo4Ja: 'Os valores já são os menores números inteiros:', balanceada: 'Equação balanceada:', conferencia: 'Conferência (reagentes = produtos): '
      },
      massa: {
        semMassa: 'O pacote de dados não tem a massa atômica de: {lista}.',
        passo1: (p) => `Conte os átomos de cada elemento na fórmula${p.hidrato ? ' (somando a água de cristalização)' : ''}:`,
        passo2: 'Multiplique o número de átomos pela massa atômica de cada elemento (valores do pacote de dados, em g/mol):', passo3: 'Some as contribuições:',
        hidrato: 'Cada parte do hidrato contribui assim (g/mol):', eletrons: 'A massa dos elétrons ganhos ou perdidos é desprezada (é muito menor que a incerteza das massas atômicas).',
        massaMolarDe: 'Massa molar de {formula}', percentual: '{nome} ({simbolo}), % em massa'
      },
      concentracao: {
        modos: {
          molaridade: 'Molaridade (mol/L) a partir da massa de soluto e do volume', massa: 'Massa de soluto necessária para uma solução', 'gl-mol': 'Converter g/L ↔ mol/L',
          'percentual-mm': 'Percentual em massa (m/m)', 'percentual-mv': 'Percentual massa/volume (g por 100 mL)', diluicao: 'Diluição (C₁V₁ = C₂V₂)'
        },
        informe: 'Informe {x}.', unidadeMassa: 'Unidade de massa desconhecida: "{u}".', unidadeVolume: 'Unidade de volume desconhecida: "{u}".',
        maiorQueZero: '{x} deve ser maior que zero.', massaSoluto: 'a massa do soluto', volumeSolucao: 'o volume da solução', aMassa: 'A massa', oVolume: 'O volume',
        aMassaSoluto: 'A massa do soluto', aMassaSolucao: 'A massa da solução', massaSolucao: 'a massa da solução', aConcentracao: 'A concentração',
        concQuantidade: 'Concentração em quantidade de matéria', quantidadeSoluto: 'Quantidade de matéria do soluto', concMassa: 'Concentração em massa',
        passoMassaMolar: 'Massa molar do soluto ({formula}):', passoN: 'Quantidade de matéria do soluto (n = m ÷ M):', passoC: 'Molaridade (C = n ÷ V, com V em litros):',
        informeDesejada: 'Informe a concentração desejada.', unidadeConc: 'Unidade de concentração desconhecida: "{u}". Use mol/L, mmol/L ou g/L.',
        passoConcMolL: 'Concentração em mol/L:', passoNNecessaria: 'Quantidade de matéria necessária (n = C × V):', passoMassaSoluto: 'Massa de soluto (m = n × M):',
        massaDe: 'Massa de {formula}', quantidade: 'Quantidade de matéria',
        notaDissolva: 'Dissolva o soluto em solvente suficiente e complete até o volume final da solução (o volume é o da solução, não o do solvente).',
        informeConc: 'Informe a concentração.', passoMassaMolarCurto: 'Massa molar ({formula}):', divida: 'Divida a concentração em massa pela massa molar:', multiplique: 'Multiplique a molaridade pela massa molar:',
        solutoMaior: 'A massa do soluto não pode ser maior que a da solução.', percentualMM: 'Percentual em massa (m/m)', titulo: 'Título (fração em massa)',
        passoPercentual: 'Divida a massa do soluto pela massa da solução e multiplique por 100:', percentualMV: 'Percentual massa/volume', passoMV: 'Massa de soluto (g) por 100 mL de solução:',
        umEmBranco: 'Deixe exatamente um dos quatro campos em branco: é ele que será calculado.', maioresQueZero: 'Os valores informados devem ser maiores que zero.',
        isoleC1: 'Isole a concentração inicial:', isoleV1: 'Isole o volume da solução concentrada a medir:', isoleC2: 'Isole a concentração final:', isoleV2: 'Isole o volume final:',
        rotulos: { C1: 'Concentração inicial (C₁)', V1: 'Volume inicial (V₁)', C2: 'Concentração final (C₂)', V2: 'Volume final (V₂)' },
        notaDiluicao: 'Na diluição a quantidade de soluto não muda: C₁V₁ = C₂V₂. Use a mesma unidade de concentração e a mesma unidade de volume nos dois lados.',
        solventeAcrescentar: 'Volume de solvente a acrescentar (V₂ − V₁)', atencaoConcentracao: 'Atenção: o volume final ficou menor que o inicial; isso é uma concentração, não uma diluição.',
        conserva: 'Na diluição a quantidade de soluto se conserva:', escolha: 'Escolha o tipo de cálculo.', solucaoTex: 'solução'
      },
      estequiometria: {
        semMassa: 'O pacote de dados não tem a massa atômica de: {lista}.',
        massaParaMol: (p) => `Massa → mol${p.rotulo ? ` de ${p.rotulo}` : ''}: divida a massa (em g) pela massa molar (${p.M} g/mol).`,
        semVolumeMolar: 'Faltam R ou as condições padrão no pacote de dados para calcular o volume molar nas CNTP.',
        volumeParaMol: 'Volume (gás ideal, CNTP: 0 °C e 1 atm) → mol: divida pelo volume molar Vm = RT/P = {vm} L/mol.',
        semAvogadro: 'A constante de Avogadro não está no pacote de dados (constantes.json).', particulasParaMol: 'Partículas → mol: divida pelo número de Avogadro.',
        unidadeNaoReconhecida: 'Unidade não reconhecida: "{u}". Use g, mg, kg, mol, mmol, L, mL ou partículas.',
        quantidadeInvalida: 'Informe uma quantidade válida (número maior ou igual a zero).', massaMolarDe: 'Massa molar de {formula} (soma das massas atômicas do pacote de dados):',
        molParaMassa: 'mol → massa: multiplique pela massa molar.', molParaParticulas: 'mol → partículas: multiplique pelo número de Avogadro.',
        molParaVolume: 'mol → volume nas CNTP (0 °C e 1 atm, gás ideal): multiplique pelo volume molar {vm} L/mol.',
        quantidade: 'Quantidade de matéria', massa: 'Massa', particulas: 'Número de partículas', volumeCntp: 'Volume nas CNTP (se for um gás ideal)',
        notaVolume: 'O volume vale só para gases ideais nas CNTP adotadas (0 °C e 1 atm); sólidos e líquidos não seguem essa conversão.',
        semirreacoes: 'Reações com elétrons (semirreações) não têm massa: use equações completas.', informePeloMenos: 'Informe a quantidade de pelo menos uma substância.',
        rendimento: 'O rendimento deve estar entre 0 e 100 %.', passoEquacao: 'Equação balanceada (os coeficientes dão a proporção em mol):',
        naoAparece: 'A substância "{x}" não aparece na equação.', quantidadesValidas: 'Informe quantidades válidas (números maiores ou iguais a zero).',
        umaVez: 'Cada substância deve ser informada uma só vez.',
        soReagentes: 'Com mais de uma quantidade, informe só reagentes (o reagente limitante é escolhido entre eles). Para partir de um produto, informe apenas ele.',
        passoRazoes: 'Divida a quantidade de matéria de cada reagente pelo seu coeficiente: o menor quociente indica o reagente limitante.',
        limitante: 'Reagente limitante: {formula}.', umaQuantidade: 'Há uma só quantidade informada ({formula}): a extensão da reação é n ÷ coeficiente.',
        passoCoeficientes: (p) => `Use os coeficientes como razão em mol: n = coeficiente × ξ${p.rend != null ? ` × rendimento (${p.rend} %)` : ''}.`,
        passoMassa: 'Converta para massa (m = n × M):', sobra: 'O que sobra dos reagentes em excesso (inicial − consumido):',
        reagenteLimitante: 'Reagente limitante', formado: '{formula} formado', emExcesso: '{formula} em excesso (sobra)', necessario: '{formula} necessário',
        coeficientesIgnorados: 'Os coeficientes digitados foram ignorados: o aplicativo balanceia a equação.',
        produtoComRendimento: (p) => `A quantidade desejada de ${p.formula} é a obtida com rendimento de ${p.rend} %: divida pelo rendimento para achar a extensão que a reação precisa alcançar (ξ = n ÷ coeficiente ÷ rendimento); o produto informado não muda.`,
        passoNecessarios: 'Reagentes necessários (n = coeficiente × ξ):',
        notaCntp: 'CNTP (0 °C, 1 atm): {vm} L/mol, o volume molar usado aqui.', notaIupac: 'Na condição padrão atual da IUPAC (0 °C, 1 bar), o volume molar é {vmIupac} L/mol.',
        notaTabela: 'Volume e partículas dos produtos aparecem na tabela; o volume vale só para gases ideais nas CNTP (0 °C e 1 atm).'
      },
      gas: {
        semR: 'A constante dos gases (R) não está no pacote de dados (constantes.json).', escolha: 'Escolha a grandeza a calcular: P, V, n ou T.',
        rotulos: { P: 'Pressão', V: 'Volume', n: 'Quantidade de matéria', T: 'Temperatura' }, informe: 'Informe {x}.', unidadeDesconhecida: 'Unidade de {x} desconhecida: "{u}".',
        unidadeQuantidade: 'Unidade de quantidade de matéria desconhecida: "{u}".', semMassaAtomica: 'Sem massa atômica no pacote para: {lista}.',
        passoMassa: 'Calcule a quantidade de matéria a partir da massa ({formula}, M = {M} g/mol):', informeN: 'Informe a quantidade de matéria (mol) ou a massa e a fórmula do gás.',
        temperaturaPositiva: 'A temperatura absoluta deve ser maior que 0 K.', maiorQueZero: '{x} deve ser maior que zero.',
        passoEquacao: 'Equação dos gases ideais, com R = {R} J/(mol·K) ({nome}). Use sempre unidades do SI: Pa, m³, mol, K.', passoSI: 'Converta para o SI:',
        isoleP: 'Isole a pressão:', isoleV: 'Isole o volume:', isoleN: 'Isole a quantidade de matéria:', isoleT: 'Isole a temperatura:', naoCalculou: 'Não foi possível calcular com esses valores.',
        unidadeSaida: 'Unidade de saída desconhecida: "{u}".', converta: 'Converta o resultado para {u}:', notaModelo: 'Modelo de gás ideal: vale melhor a baixas pressões e altas temperaturas.',
        boyleUmEmBranco: 'Deixe exatamente um dos quatro valores em branco: é ele que será calculado.', boyleUnidade: 'Unidade desconhecida: "{u}".',
        boylePositivos: 'Pressões e volumes devem ser maiores que zero.', boyleLei: 'Lei de Boyle: à temperatura constante e com a mesma quantidade de gás, o produto pressão × volume não muda.',
        boyleIsole: (p) => `Isole ${p.grandeza === 'P' ? 'a' : 'o'} ${p.nome} ${p.n === '1' ? 'inicial' : 'final'} (todos os valores na mesma unidade de cada grandeza):`,
        boyleNomes: { P: 'pressão', V: 'volume' }, boyleRotulo: (p) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} ${p.n === '1' ? 'inicial' : 'final'} (${p.alvo})`,
        boyleNota: 'Vale para gás ideal com a mesma quantidade de matéria e a mesma temperatura nos dois estados.'
      },
      ph: {
        nota25C: 'pKw = {pKw} e pH neutro = {neutro} valem a 25 °C; em outras temperaturas os dois mudam (a água pura continua neutra).',
        saturada: 'Atenção: {formula} é pouco solúvel em água{temp}: dissolve no máximo cerca de {s} mol/L{kps}{fonte}. A concentração informada passa disso: a solução fica saturada (sobra sólido) e o pH real não passa de cerca de {phMax}.',
        saturadaTemp: ' (a {temp} °C)', saturadaKps: ' (calculado do Kps)', saturadaFonte: ', segundo {fonte}',
        tipos: { 'acido-forte': 'Ácido forte', 'base-forte': 'Base forte', 'acido-fraco': 'Ácido fraco (Ka dado)', 'base-fraca': 'Base fraca (Kb dado)', converter: 'Converter pH, pOH, [H⁺], [OH⁻]' },
        classes: { neutra: 'neutra', acida: 'ácida', basica: 'básica' }, solucao: 'Solução', pKw: 'Produto iônico da água: pKw = {valor} ({origem}).',
        umValor: 'Informe exatamente um valor: pH, pOH, [H⁺] ou [OH⁻].', concPositiva: 'A concentração deve ser maior que zero.', phInformado: 'O pH foi informado.',
        phDePoh: 'pH = pKw − pOH:', phDeH: 'pH = −log₁₀[H⁺]:', pohDeOh: 'pOH = −log₁₀[OH⁻] e pH = pKw − pOH:', relacoes: 'Relações usadas:',
        informeConc: 'Informe a concentração (maior que zero) em mol/L.',
        forte: (p) => `${p.acido ? 'Ácido' : 'Base'} forte: ionização (dissociação) total. Cada fórmula libera ${p.n} ${p.acido ? 'H⁺' : 'OH⁻'}.`,
        diluida: 'Como a solução é muito diluída, a autoionização da água não pode ser ignorada; resolva [íon]² − c[íon] − Kw = 0:', notaDiluida: 'Solução muito diluída: o cálculo incluiu a água.',
        notaEscolar: 'Modelo escolar: considera-se a ionização completa dos n hidrogênios ionizáveis (na prática, a segunda ionização de vários ácidos é parcial).',
        informeK: (p) => `Informe ${p.acido ? 'Ka (ou pKa)' : 'Kb (ou pKb)'} do ${p.acido ? 'ácido' : 'da base'} fraco(a).`,
        fraco: (p) => `${p.acido ? 'Ácido' : 'Base'} fraco(a) monoprótico(a): equilíbrio ${p.acido ? 'HA ⇌ H⁺ + A⁻' : 'B + H₂O ⇌ BH⁺ + OH⁻'}. Com x = [${p.acido ? 'H⁺' : 'OH⁻'}] no equilíbrio:`,
        segundoGrau: 'Resolva a equação do segundo grau x² + K·x − K·C = 0 (sem aproximações):', portanto: 'Portanto [{ion}] = x.',
        grau: (p) => `Grau de ${p.acido ? 'ionização' : 'ionização da base'} (α = x ÷ C):`, notaPequeno: '[íon] resultou muito pequeno: a autoionização da água pode ser relevante e este modelo a ignora.',
        grauIonizacao: 'Grau de ionização', escolha: 'Escolha o tipo de solução.'
      },
      unidades: {
        informeNumero: 'Informe um número para converter.', naoConheco: 'Não conheço a unidade "{u}".',
        grandezasDiferentes: '"{de}" ({gde}) e "{para}" ({gpara}) são grandezas diferentes: não dá para converter uma na outra.',
        passoBase: 'Converta para a unidade base da grandeza ({base}): valor × fator + deslocamento.', passoDaBase: 'Converta da unidade base para {para}: (valor − deslocamento) ÷ fator.',
        passoEquivale: '1 {a} equivale a {fa} {base} e 1 {b} equivale a {fb} {base}.', passoFator: 'Multiplique pelo fator de conversão (razão entre as unidades):',
        desconhecida: 'Unidade desconhecida: {u}'
      }
    }
  }
};
