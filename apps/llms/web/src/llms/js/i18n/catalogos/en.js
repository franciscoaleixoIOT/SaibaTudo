// English catalogue (same keys as pt-BR; checked by test). Translated by agent; native-speaker review pending.
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'pendente',

  ui: {
    idiomas: { 'pt-BR': 'Portuguese', en: 'English', es: 'Spanish', de: 'German', fr: 'French', zh: 'Chinese' },
    listas: { e: ' and ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — how a language model works, with word vectors in 3D',
      descricao: 'Understand how a language model works: pick words, see their GloVe vectors projected onto 3 axes in an interactive chart, do vector arithmetic (king − man + woman) and explore neighbours and dot products. Open data, works offline, and nothing leaves your device without your tap.',
      ogLocale: 'en_US',
      pular: 'Skip to content'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: 'Loading SaibaTudo LLMs…',
      abas: { inicio: 'Explore', aprenda: 'Learn', sobre: 'About the data' },
      secoes: 'Sections',
      marcaAria: 'SaibaTudo LLMs, home',
      marcaSub: 'Word vectors in 3D, on your device',
      configuracoes: 'Settings',
      idioma: 'Language',
      rodape: { sobre: 'About the data', privacidade: 'Privacy', configuracoes: 'Settings', projeto: 'Independent, open-source project (MIT). No ads, login or trackers.' },
      naoEncontrada: { titulo: 'Page not found', texto: 'That address does not exist in SaibaTudo LLMs.', inicio: 'Go to the start' },
      erro: { titulo: 'Error', cabecalho: 'Something went wrong', texto: 'This screen could not be built ({msg}).', inicio: 'Go to the start' },
      erroDados: { titulo: 'Data unavailable', complemento: 'The word vectors could not be loaded ({msg}). The lessons and the concept assistant remain available.', tentar: 'Try again' },
      avisoAssinatura: 'The digital signature of the data package does not match. The explorer was disabled: do not trust values from this data.',
      dadosAtualizados: 'Data updated. Reload the page to use the new version on every screen.',
      novaVersao: 'A new version of the app was installed. Close and reopen (or reload) to use it.',
      idiomaTrocado: 'Language changed. The conversation context was cleared.'
    },
    prefs: {
      tema: { SISTEMA: 'Follow the system', CLARO: 'Light', ESCURO: 'Dark' },
      fonte: { PEQUENA: 'Small', NORMAL: 'Normal', GRANDE: 'Large', MUITO_GRANDE: 'Very large' }
    },
    install: {
      ios: { titulo: 'To install on iPhone or iPad:', passos: ['Tap Share (the square with the arrow) in the Safari bar.', 'Choose "Add to Home Screen".', 'Confirm the name and tap Add.'] },
      geral: { titulo: 'To install as an app:', passos: ['Open the browser menu (⋮ or ⋯).', 'Choose "Install app" or "Add to home screen".', 'Confirm. The app opens in its own window and works offline.'] }
    },
    componentes: { fonte: 'Source: ', passoAPasso: 'Step by step' },
    inicio: {
      titulo: 'Explore embeddings',
      subtitulo: 'Pick words and see their GloVe vectors projected onto three axes. King − man + woman ≈ queen.',
      campoRotulo: 'Ask something or request words for the chart', placeholder: 'E.g. show king, queen, man and woman · king − man + woman · what is a token?',
      enviar: 'Ask', limparCampo: 'Clear the field', analisando: 'Analysing…', ultimaPergunta: 'Last question', anterior: 'Previous question', proxima: 'Next question',
      sugestoesTitulo: 'You can also ask', copiar: 'Copy answer', copiado: 'Answer copied.', fechar: 'Close answer', relatar: 'Report a problem with this answer',
      relatarAjuda: 'Opens a public GitHub issue with the question in the title; nothing is sent until you confirm there.',
      abrir: 'Open', respostaAria: 'Answer', historicoVazio: 'No questions yet.'
    },
    aprenda: {
      titulo: 'Learn: the parts of a language model', subtitulo: 'Six short lessons, from next-token prediction to softmax. Each has a "Try it" that takes you to the explorer.',
      secaoN: 'Lesson {n} of {total}', experimente: 'Try it', abrir: 'Open in the explorer', referencias: 'References', link: 'view', navegacao: 'Neighbouring lessons', irExplorar: 'Go to the explorer', indice: 'All lessons',
      autoria: 'Text written by the SaibaTudo project (MIT), with academic references. Translated by an agent in the other languages; native-speaker review pending.'
    },
    sobre: {
      titulo: 'About the data', subtitulo: 'Where the vectors come from, how the numbers are computed and what the cloud AI does (and does not do).',
      vetores: 'Word vectors', fonte: 'Source', licenca: 'Licence', palavras: 'Words', dimensoes: 'Dimensions', quantizacao: 'Quantisation', versaoPacote: 'Package version', geradoEm: 'Generated on',
      ingles: 'GloVe was trained on English texts (Wikipedia 2014 and Gigaword 5 news): the words are English and the associations, biases included, are those of these texts. The glossary translates example words for convenience; the 100,000 most frequent words go into the package, with vectors stored as int8 (one scale per vector).',
      comoCalcula: 'How the numbers are computed', calculos: ['Cosine and dot product: computed on this device from the int8 vectors, with no rounding beyond the quantisation.', 'Neighbours and analogies: a scan of the whole vocabulary by cosine; the analogy is a − b + c excluding a, b and c.', 'Chart axes: the 3 dimensions with the largest variance among the chosen words, or the 3 principal components (PCA) with their explained variance.', 'No number comes from a language model; generated text, when you ask for it, is labelled and checked on the server.'],
      ia: 'Cloud AI (optional)', iaTexto: 'Off by default. When you ask, the project server sends the question, the language, a chart summary and lesson excerpts to an open model (Qwen3-4B-Instruct-2507, Apache 2.0) in a Hugging Face Space; the answer comes back labelled with the model name and is rejected if it contains a number that is not in what was sent.',
      referencias: 'References', licencas: 'Licences', traducoes: 'Translations', revisao: { pendente: 'translated by an agent, native-speaker review pending', humana: 'source text, reviewed' }, codigo: 'App source code on GitHub'
    },
    nuvem: {
      botao: 'Ask the cloud AI', consultando: 'Asking the cloud AI…', titulo: 'Cloud AI explanation',
      consentimento: 'Send this question to the cloud AI? The question text, the language, a summary of the current chart and lesson excerpts go to our server, plus a random code of this installation. Nothing is stored with the question. The answer is generated by a model (currently Qwen3-4B), labelled and verified: numbers outside what was sent are rejected.',
      confirmar: 'Send', cancelar: 'Not now', lembrar: 'Do not ask again (automatic mode; can be turned off in Settings)',
      falha: { desligada: 'The cloud AI is off in this version. The answer above was built on your device.', cota: 'The cloud AI reached its usage limit for now. Try again later.', timeout: 'The cloud AI took too long and the call was cancelled.', rejeitada: 'The cloud AI answered, but the text failed verification (a number or language outside what was expected) and was discarded.', dadopessoal: 'The question seems to contain personal data and was not sent to the cloud.', rede: 'Could not reach the cloud AI (no network or service down).' }
    },
    presets: {
      realeza: { nome: 'Royalty and gender', nota: 'The difference king − queen resembles man − woman: one direction of the space carries grammatical gender.' },
      capitais: { nome: 'Countries and capitals', nota: 'Each country sits at a similar distance from its own capital: the "capital of" direction repeats.' },
      plural: { nome: 'Plural', nota: 'The direction cats − cat resembles dogs − dog; the dot product with it separates singulars from plurals.' },
      familia: { nome: 'Family', nota: 'Pairs such as father/mother and brother/sister differ by the same gender direction.' },
      cores: { nome: 'Colours', nota: 'Colours form a compact group: they appear in similar contexts in the corpus.' },
      numeros: { nome: 'Numbers', nota: 'From one to ten, the vectors line up along a band; nearby numbers stay nearby.' },
      lideres: { nome: 'Countries and leaders', nota: 'Historical note: Italy − Germany + Hitler lands near Mussolini because the corpus (Wikipedia and news) associates each Axis dictator with his country. It is a statistical regularity of the texts, not a judgement by the app.' }
    },
    explorador: {
      palavras: 'Words in the chart', palavrasAria: 'Chosen words', adicionarRotulo: 'Add word', adicionarPlaceholder: 'Type an English word (or a translated one) and press Enter',
      botaoAdicionar: 'Add', limpar: 'Clear', remover: 'Remove {palavra}', destacar: 'Highlight {palavra} and see its neighbours', adicionarEsta: 'Add to the chart',
      modoDimensoes: '3 dimensions', modoPca: 'PCA', diferencas: 'Show differences (arrows between pairs)',
      presetsTitulo: 'Ready-made examples', tabelaTitulo: 'Coordinates on the 3 axes', tabelaLegenda: 'Coordinates of each word on the chosen axes', tabelaPalavra: 'Word',
      semPalavras: 'No words yet. Type one above, pick an example or ask the assistant.',
      eixo: 'Axis {n}', eixoDimensao: 'dimension {n} of the vector', eixoPca: 'principal component {n} ({pct} % of the variance)',
      aviso: { pcaPoucasPalavras: 'PCA needs at least 3 words; showing the 3 dimensions with the largest variance.' },
      avisoLimite: 'At most {n} words in the chart.', naoEncontrada: '“{palavra}” is not among the 100,000 GloVe words (English, no accents). Suggestions:',
      traduzida: '{original} → {en} (translated by the glossary)',
      vizinhosTitulo: 'Nearest neighbours', vizinhosVazio: 'Tap a word in the chart or a chip to see the 10 nearest words (cosine).', vizinhosDe: 'The 10 words nearest to {palavra}:', cosseno: 'cosine',
      analogiaTitulo: 'Analogy (a − b + c)', analogiaExplicacao: 'Subtract b from a and add c: the words nearest to the result complete the analogy. E.g. king − man + woman ≈ queen.',
      analogiaA: 'word a', analogiaB: 'word b', analogiaC: 'word c', analogiaBotao: 'Compute', analogiaLimpar: 'Remove from chart', analogiaInvalida: 'Choose three different words from the chart (a and c cannot be the same).',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: 'Direction and dot product', direcaoExplicacao: 'The difference w1 − w2 defines a direction (e.g. cats − cat, the plural). The dot product of each word with that direction measures how much it “points” that way.',
      direcaoW1: 'word w1', direcaoW2: 'word w2', direcaoLista: 'Words to measure, comma-separated (empty = those in the chart)', direcaoBotao: 'Measure', direcaoInvalida: 'Choose two different words.',
      direcaoResultado: 'Dot product with the direction {w1} − {w2}:',
      graficoAria: '3D chart of the chosen words; drag to rotate, use the wheel or pinch to zoom, arrow keys rotate. The table below has the same coordinates.',
      calculadoNoAparelho: 'Computed on your device from GloVe (Pennington, Socher & Manning, 2014; PDDL 1.0 licence). English words.'
    },
    config: {
      titulo: 'Settings', salva: 'Preference saved on this device.', aparencia: 'Appearance', tema: 'Theme', tamanhoTexto: 'Text size', idioma: 'Language',
      idiomaAjuda: 'Changes the interface, the answers and the question interpreter. The words in the chart stay in English, the language of GloVe.',
      instalar: 'Install', jaInstalado: 'The app is already installed on this device.', instalarApp: 'Install app',
      ia: 'Artificial intelligence in the cloud',
      iaAviso: 'Optional and off by default. It only explains concepts and what the chart shows; the numbers are still computed on this device. When you tap "Ask the cloud AI", the question text, the language, a summary of the current chart and a random code of this installation are sent to our server.',
      nuvemAutomatica: 'Automatic cloud AI',
      nuvemAutomaticaAjuda: 'When the app does not understand a question, send it to the cloud AI without asking. Only the question text, the language and the chart summary are sent.',
      dados: 'Data', versaoPacote: 'Package version', palavras: 'Words', assinatura: 'Signature', semDados: 'The data package has not been loaded yet.',
      assinaturaValor: { verificada: 'verified', invalida: 'NOT verified', indisponivel: 'unavailable in this browser' },
      privacidade: 'Privacy', privacidadeTexto: 'We keep on this device only the theme, the text size, the language and the question history, plus the cache for offline use. ', politica: 'Privacy policy',
      apagar: 'Delete the data on this device', confirmar: 'Tap again to confirm', apagados: 'Data deleted. Reloading…'
    }
  },

  respostas: {
    origem: { local: 'Built on your device • GloVe data from {data}', generativa: 'AI-generated text ({modelo}) • Cloud — may contain errors', nuvem: 'cloud AI' },
    sugestoes: {
      padrao: ['show king, queen, man and woman', 'king − man + woman', 'neighbours of tower', 'plural direction', 'show the capitals', 'what is an embedding?'],
      vizinhosDe: 'neighbours of {palavra}', analogiaCom: '{a} − {b} + {c}', plural: 'plural direction', conceitoToken: 'what is a token?', mostrar: 'show {palavra}'
    },
    saudacao: { titulo: 'Hello!', texto: 'I am the SaibaTudo LLMs assistant. Ask for words in the chart, an analogy, the neighbours of a word or the explanation of a concept.' },
    ajuda: { titulo: 'What you can ask', texto: 'I understand requests about the chart (English words, or words translated by the glossary) and questions about the concepts of the six lessons. Examples:', exemplos: ['show king, queen, man and woman', 'king − man + woman', 'neighbours of tower', 'are cat and dog similar?', 'plural direction', 'what is attention?'] },
    sobreDados: { titulo: 'About the data', texto: 'The vectors come from GloVe (Pennington, Socher & Manning, 2014; Wikipedia 2014 + Gigaword 5; PDDL 1.0 licence): {n} English words, 50 dimensions, package {versao}, verified by digital signature on this device.' },
    fontes: { titulo: 'Sources', itens: ['GloVe 6B, 50 dimensions — Stanford NLP (PDDL 1.0)', 'Pennington, Socher & Manning (2014), GloVe: Global Vectors for Word Representation', 'Mikolov et al. (2013), Linguistic Regularities in Continuous Space Word Representations', 'Vaswani et al. (2017), Attention Is All You Need'] },
    limpar: { titulo: 'Chart cleared', texto: 'I removed every word from the chart.' },
    preset: { texto: 'I loaded the "{nome}" example: {lista}.' },
    conceito: { leiaMais: 'The full lesson is under Learn; tap the button to open it.' },
    mostrar: { titulo: 'Words in the chart', texto: 'I put {lista} in the chart.', textoContinuacao: 'I added {lista} to the chart.', traduzidas: 'Translated by the glossary: {lista}.', desconhecidas: 'Not found in GloVe: {lista}.' },
    analogia: { titulo: 'Analogy', texto: '{a} − {b} + {c} ≈', item: '{palavra} (cosine {cos})', explicacao: 'I subtracted the vector of b from a, added c and looked for the words nearest to the result (excluding a, b and c).' },
    vizinhos: { titulo: 'Neighbours of {palavra}', texto: 'The 10 words nearest to {palavra}, by cosine:' },
    similaridade: { titulo: 'Similarity', texto: 'Cosine between {a} and {b}: {cos}.', escala: 'Near 1 = vectors in almost the same direction (similar contexts); near 0 = unrelated; negative = opposite directions.' },
    direcao: { titulo: 'Direction and dot product', texto: 'Direction {w1} − {w2}. Dot product of each word with that direction:', palavra: 'Word', produto: 'Dot product', explicacao: 'Larger values point more towards {w1}; smaller ones towards {w2}.' },
    naoEntendi: { titulo: 'I did not understand', texto: 'I did not understand "{q}". I can put words in the chart, compute analogies, neighbours and directions, or explain the concepts of the lessons.', sugestoesPalavras: 'Similar GloVe words: {lista}.', palavrasAchadas: 'I recognised the words {lista}; say "show" to put them in the chart.' },
    copiar: { pergunta: 'Question:', rodape: 'Source: GloVe (PDDL 1.0) • SaibaTudo LLMs • https://saibatudo.net/llms/' }
  },
};
