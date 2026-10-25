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
      subtitulo: 'Pick words and see their GloVe vectors projected onto three axes. King − man + woman ≈ queen.'
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
  }
};
