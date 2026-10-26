// Catálogo pt-BR (REFERÊNCIA: toda chave existe aqui; os outros catálogos são conferidos contra este). Valores: string com {param} ou função.
// Chaves estáveis em inglês técnico ou no nome do módulo. Nunca escreva texto em português fora dos catálogos (docs/I18N.md).
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'humana',

  ui: {
    idiomas: { 'pt-BR': 'português', en: 'inglês', es: 'espanhol', de: 'alemão', fr: 'francês', zh: 'chinês' },
    listas: { e: ' e ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — como um modelo de linguagem funciona, com vetores de palavras em 3D',
      descricao: 'Entenda como um modelo de linguagem funciona: escolha palavras, veja os vetores do GloVe projetados em 3 eixos num gráfico interativo, faça aritmética de vetores (rei − homem + mulher) e explore vizinhos e produto escalar. Dados abertos, funciona offline e nada sai do seu aparelho sem o seu toque.',
      ogLocale: 'pt_BR',
      pular: 'Ir para o conteúdo'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: 'Carregando SaibaTudo LLMs…',
      abas: { inicio: 'Explorar', aprenda: 'Aprenda', sobre: 'Sobre os dados' },
      secoes: 'Seções',
      marcaAria: 'SaibaTudo LLMs, início',
      marcaSub: 'Vetores de palavras em 3D, no seu aparelho',
      configuracoes: 'Configurações',
      idioma: 'Idioma',
      rodape: { sobre: 'Sobre os dados', privacidade: 'Privacidade', configuracoes: 'Configurações', projeto: 'Projeto independente e de código aberto (MIT). Sem anúncios, login ou rastreadores.' },
      naoEncontrada: { titulo: 'Página não encontrada', texto: 'Esse endereço não existe no SaibaTudo LLMs.', inicio: 'Ir para o início' },
      erro: { titulo: 'Erro', cabecalho: 'Algo deu errado', texto: 'Não foi possível montar esta tela ({msg}).', inicio: 'Ir para o início' },
      erroDados: { titulo: 'Dados indisponíveis', complemento: 'Os vetores de palavras não puderam ser carregados ({msg}). As seções e o assistente de conceitos continuam disponíveis.', tentar: 'Tentar de novo' },
      avisoAssinatura: 'A assinatura digital do pacote de dados não confere. O explorador foi desativado: não confie em valores vindos destes dados.',
      dadosAtualizados: 'Dados atualizados. Recarregue a página para usar a versão nova em todas as telas.',
      novaVersao: 'Nova versão do app instalada. Feche e reabra (ou recarregue) para usá-la.',
      idiomaTrocado: 'Idioma alterado. O contexto da conversa foi limpo.'
    },
    prefs: {
      tema: { SISTEMA: 'Seguir o sistema', CLARO: 'Claro', ESCURO: 'Escuro' },
      fonte: { PEQUENA: 'Pequena', NORMAL: 'Normal', GRANDE: 'Grande', MUITO_GRANDE: 'Muito grande' }
    },
    install: {
      ios: { titulo: 'Para instalar no iPhone ou iPad:', passos: ['Toque em Compartilhar (o quadrado com a seta) na barra do Safari.', 'Escolha "Adicionar à Tela de Início".', 'Confirme o nome e toque em Adicionar.'] },
      geral: { titulo: 'Para instalar como aplicativo:', passos: ['Abra o menu do navegador (⋮ ou ⋯).', 'Escolha "Instalar app" ou "Adicionar à tela inicial".', 'Confirme. O app abre em janela própria e funciona offline.'] }
    },
    componentes: { fonte: 'Fonte: ', passoAPasso: 'Passo a passo' },
    inicio: {
      titulo: 'Explorar embeddings',
      subtitulo: 'Escolha palavras e veja os vetores do GloVe projetados em três eixos. Rei − homem + mulher ≈ rainha.',
      campoRotulo: 'Pergunte ou peça palavras para o gráfico', placeholder: 'Ex.: mostre king, queen, man e woman · king − man + woman · o que é um token?',
      enviar: 'Perguntar', limparCampo: 'Limpar o campo', analisando: 'Analisando…', ultimaPergunta: 'Última pergunta', anterior: 'Pergunta anterior', proxima: 'Pergunta seguinte',
      sugestoesTitulo: 'Você também pode perguntar', copiar: 'Copiar resposta', copiado: 'Resposta copiada.', fechar: 'Fechar resposta', relatar: 'Relatar problema nesta resposta',
      relatarAjuda: 'Abre uma issue pública no GitHub com a pergunta no título; nada é enviado sem você confirmar lá.',
      respostaAria: 'Resposta', historicoVazio: 'Nenhuma pergunta ainda.'
    },
    aprenda: {
      titulo: 'Aprenda: as peças de um modelo de linguagem', subtitulo: 'Seis seções curtas, da previsão do próximo token à softmax. Cada uma tem um "Experimente" que leva ao explorador.',
      secaoN: 'Seção {n} de {total}', experimente: 'Experimente', abrir: 'Abrir no explorador', referencias: 'Referências', link: 'ver', navegacao: 'Seções vizinhas', irExplorar: 'Ir ao explorador', indice: 'Todas as seções',
      autoria: 'Texto de autoria do projeto SaibaTudo (MIT), com referências acadêmicas. Tradução por agente nos outros idiomas; revisão por falante nativo pendente.'
    },
    presets: {
      realeza: { nome: 'Realeza e gênero', nota: 'A diferença rei − rainha é parecida com homem − mulher: uma direção do espaço carrega o gênero gramatical.' },
      capitais: { nome: 'Países e capitais', nota: 'Cada país fica a uma distância parecida da própria capital: a direção "capital de" se repete.' },
      plural: { nome: 'Plural', nota: 'A direção gatos − gato se parece com cães − cão; o produto escalar com ela separa singulares de plurais.' },
      familia: { nome: 'Família', nota: 'Pares como pai/mãe e irmão/irmã diferem pela mesma direção de gênero.' },
      cores: { nome: 'Cores', nota: 'As cores formam um grupo compacto: aparecem em contextos parecidos no corpus.' },
      numeros: { nome: 'Números', nota: 'De um a dez, os vetores se alinham numa faixa; números próximos ficam próximos.' },
      lideres: { nome: 'Países e líderes', nota: 'Nota histórica: Itália − Alemanha + Hitler aproxima-se de Mussolini porque o corpus (Wikipédia e notícias) associa cada ditador do Eixo ao seu país. É uma regularidade estatística dos textos, não um juízo do app.' }
    },
    explorador: {
      palavras: 'Palavras no gráfico', palavrasAria: 'Palavras escolhidas', adicionarRotulo: 'Adicionar palavra', adicionarPlaceholder: 'Digite uma palavra em inglês (ou traduzida) e Enter',
      botaoAdicionar: 'Adicionar', limpar: 'Limpar', remover: 'Remover {palavra}', destacar: 'Destacar {palavra} e ver os vizinhos', adicionarEsta: 'Adicionar ao gráfico',
      modoDimensoes: '3 dimensões', modoPca: 'PCA', diferencas: 'Mostrar diferenças (setas entre pares)',
      presetsTitulo: 'Exemplos prontos', tabelaTitulo: 'Coordenadas nos 3 eixos', tabelaLegenda: 'Coordenadas de cada palavra nos eixos escolhidos', tabelaPalavra: 'Palavra',
      semPalavras: 'Nenhuma palavra ainda. Digite uma acima, escolha um exemplo ou peça ao assistente.',
      eixo: 'Eixo {n}', eixoDimensao: 'dimensão {n} do vetor', eixoPca: 'componente principal {n} ({pct} % da variância)',
      aviso: { pcaPoucasPalavras: 'O PCA precisa de pelo menos 3 palavras; mostrando as 3 dimensões de maior variância.' },
      avisoLimite: 'No máximo {n} palavras no gráfico.', naoEncontrada: '“{palavra}” não está entre as 100 mil palavras do GloVe (em inglês, sem acentos). Sugestões:',
      traduzida: '{original} → {en} (traduzido pelo glossário)',
      vizinhosTitulo: 'Vizinhos mais próximos', vizinhosVazio: 'Toque numa palavra do gráfico ou num chip para ver as 10 palavras mais próximas (cosseno).', vizinhosDe: 'As 10 palavras mais próximas de {palavra}:', cosseno: 'cosseno',
      analogiaTitulo: 'Analogia (a − b + c)', analogiaExplicacao: 'Subtrai b de a e soma c: as palavras mais próximas do resultado completam a analogia. Ex.: king − man + woman ≈ queen.',
      analogiaA: 'palavra a', analogiaB: 'palavra b', analogiaC: 'palavra c', analogiaBotao: 'Calcular', analogiaLimpar: 'Tirar do gráfico', analogiaInvalida: 'Escolha três palavras diferentes do gráfico (a e c não podem ser iguais).',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: 'Direção e produto escalar', direcaoExplicacao: 'A diferença w1 − w2 define uma direção (ex.: cats − cat, o plural). O produto escalar de cada palavra com essa direção mede quanto ela “aponta” para lá.',
      direcaoW1: 'palavra w1', direcaoW2: 'palavra w2', direcaoLista: 'Palavras para medir, separadas por vírgula (vazio = as do gráfico)', direcaoBotao: 'Medir', direcaoInvalida: 'Escolha duas palavras diferentes.',
      direcaoResultado: 'Produto escalar com a direção {w1} − {w2}:',
      graficoAria: 'Gráfico 3D das palavras escolhidas; arraste para girar, use a roda ou pinça para aproximar, setas do teclado giram. A tabela abaixo tem as mesmas coordenadas.',
      calculadoNoAparelho: 'Calculado no aparelho a partir do GloVe (Pennington, Socher & Manning, 2014; licença PDDL 1.0). Palavras em inglês.'
    },
    config: {
      titulo: 'Configurações', salva: 'Preferência salva neste aparelho.', aparencia: 'Aparência', tema: 'Tema', tamanhoTexto: 'Tamanho do texto', idioma: 'Idioma',
      idiomaAjuda: 'Muda a interface, as respostas e o interpretador de perguntas. As palavras do gráfico continuam em inglês, o idioma do GloVe.',
      instalar: 'Instalar', jaInstalado: 'O aplicativo já está instalado neste aparelho.', instalarApp: 'Instalar app',
      ia: 'Inteligência artificial na nuvem',
      iaAviso: 'Opcional e desligada por padrão. Só explica conceitos e o que o gráfico mostra; os números continuam calculados neste aparelho. Quando você toca em "Perguntar à IA na nuvem", vão ao nosso servidor o texto da pergunta, o idioma, um resumo do gráfico atual e um código aleatório desta instalação.',
      nuvemAutomatica: 'IA na nuvem automática',
      nuvemAutomaticaAjuda: 'Quando o app não entender uma pergunta, enviá-la à IA na nuvem sem perguntar. Só o texto da pergunta, o idioma e o resumo do gráfico são enviados.',
      dados: 'Dados', versaoPacote: 'Versão do pacote', palavras: 'Palavras', assinatura: 'Assinatura', semDados: 'O pacote de dados ainda não foi carregado.',
      assinaturaValor: { verificada: 'verificada', invalida: 'NÃO verificada', indisponivel: 'indisponível neste navegador' },
      privacidade: 'Privacidade', privacidadeTexto: 'Guardamos neste aparelho só o tema, o tamanho do texto, o idioma e o histórico de perguntas, além do cache para uso offline. ', politica: 'Política de privacidade',
      apagar: 'Apagar os dados deste aparelho', confirmar: 'Toque de novo para confirmar', apagados: 'Dados apagados. Recarregando…'
    }
  },

  respostas: {
    origem: { local: 'Montada no aparelho • dados GloVe de {data}', generativa: 'Texto gerado por IA ({modelo}) • Nuvem — pode conter erros', nuvem: 'IA na nuvem' },
    sugestoes: {
      padrao: ['mostre king, queen, man e woman', 'king − man + woman', 'vizinhos de tower', 'direção do plural', 'mostre as capitais', 'o que é um embedding?'],
      vizinhosDe: 'vizinhos de {palavra}', analogiaCom: '{a} − {b} + {c}', plural: 'direção do plural', conceitoToken: 'o que é um token?', mostrar: 'mostre {palavra}'
    },
    saudacao: { titulo: 'Olá!', texto: 'Sou o assistente do SaibaTudo LLMs. Peça palavras para o gráfico, uma analogia, os vizinhos de uma palavra ou a explicação de um conceito.' },
    ajuda: { titulo: 'O que dá para pedir', texto: 'Entendo pedidos sobre o gráfico (palavras em inglês ou traduzidas pelo glossário) e perguntas sobre conceitos das seis seções. Exemplos:', exemplos: ['mostre king, queen, man e woman', 'king − man + woman', 'vizinhos de tower', 'cat e dog são parecidas?', 'direção do plural', 'o que é atenção?'] },
    sobreDados: { titulo: 'Sobre os dados', texto: 'Os vetores vêm do GloVe (Pennington, Socher & Manning, 2014; Wikipédia 2014 + Gigaword 5; licença PDDL 1.0): {n} palavras em inglês, 50 dimensões, pacote {versao}, verificado por assinatura digital neste aparelho.' },
    fontes: { titulo: 'Fontes', itens: ['GloVe 6B, 50 dimensões — Stanford NLP (PDDL 1.0)', 'Pennington, Socher & Manning (2014), GloVe: Global Vectors for Word Representation', 'Mikolov et al. (2013), Linguistic Regularities in Continuous Space Word Representations', 'Vaswani et al. (2017), Attention Is All You Need'] },
    limpar: { titulo: 'Gráfico limpo', texto: 'Tirei todas as palavras do gráfico.' },
    preset: { texto: 'Carreguei o exemplo "{nome}": {lista}.' },
    conceito: { leiaMais: 'A seção completa está em Aprenda; toque no botão para abrir.' },
    mostrar: { titulo: 'Palavras no gráfico', texto: 'Coloquei {lista} no gráfico.', textoContinuacao: 'Acrescentei {lista} ao gráfico.', traduzidas: 'Traduzi pelo glossário: {lista}.', desconhecidas: 'Não encontrei no GloVe: {lista}.' },
    analogia: { titulo: 'Analogia', texto: '{a} − {b} + {c} ≈', item: '{palavra} (cosseno {cos})', explicacao: 'Subtraí o vetor de b do de a, somei o de c e procurei as palavras mais próximas do resultado (fora de a, b e c).' },
    vizinhos: { titulo: 'Vizinhos de {palavra}', texto: 'As 10 palavras mais próximas de {palavra}, pelo cosseno:' },
    similaridade: { titulo: 'Similaridade', texto: 'Cosseno entre {a} e {b}: {cos}.', escala: 'Perto de 1 = vetores quase na mesma direção (contextos parecidos); perto de 0 = sem relação; negativo = direções opostas.' },
    direcao: { titulo: 'Direção e produto escalar', texto: 'Direção {w1} − {w2}. Produto escalar de cada palavra com essa direção:', palavra: 'Palavra', produto: 'Produto escalar', explicacao: 'Valores maiores apontam mais para o lado de {w1}; menores, para o lado de {w2}.' },
    naoEntendi: { titulo: 'Não entendi', texto: 'Não entendi "{q}". Posso colocar palavras no gráfico, calcular analogias, vizinhos e direções, ou explicar conceitos das seções.', sugestoesPalavras: 'Palavras parecidas no GloVe: {lista}.', palavrasAchadas: 'Reconheci as palavras {lista}; peça "mostre" para colocá-las no gráfico.' },
    copiar: { pergunta: 'Pergunta:', rodape: 'Fonte: GloVe (PDDL 1.0) • SaibaTudo LLMs • https://saibatudo.net/llms/' }
  },
};
