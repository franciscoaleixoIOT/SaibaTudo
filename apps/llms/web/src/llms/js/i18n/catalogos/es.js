// Catálogo es (mismas claves que pt-BR; comprobado por test). Traducido por agente; revisión por hablante nativo pendiente.
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'pendente',

  ui: {
    idiomas: { 'pt-BR': 'portugués', en: 'inglés', es: 'español', de: 'alemán', fr: 'francés', zh: 'chino' },
    listas: { e: ' y ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — cómo funciona un modelo de lenguaje, con vectores de palabras en 3D',
      descricao: 'Entiende cómo funciona un modelo de lenguaje: elige palabras, mira sus vectores de GloVe proyectados en 3 ejes en un gráfico interactivo, haz aritmética de vectores (rey − hombre + mujer) y explora vecinos y producto escalar. Datos abiertos, funciona sin conexión y nada sale de tu dispositivo sin tu toque.',
      ogLocale: 'es_ES',
      pular: 'Ir al contenido'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: 'Cargando SaibaTudo LLMs…',
      abas: { inicio: 'Explorar', aprenda: 'Aprende', sobre: 'Sobre los datos' },
      secoes: 'Secciones',
      marcaAria: 'SaibaTudo LLMs, inicio',
      marcaSub: 'Vectores de palabras en 3D, en tu dispositivo',
      configuracoes: 'Configuración',
      idioma: 'Idioma',
      rodape: { sobre: 'Sobre los datos', privacidade: 'Privacidad', configuracoes: 'Configuración', projeto: 'Proyecto independiente y de código abierto (MIT). Sin anuncios, inicio de sesión ni rastreadores.' },
      naoEncontrada: { titulo: 'Página no encontrada', texto: 'Esa dirección no existe en SaibaTudo LLMs.', inicio: 'Ir al inicio' },
      erro: { titulo: 'Error', cabecalho: 'Algo salió mal', texto: 'No se pudo montar esta pantalla ({msg}).', inicio: 'Ir al inicio' },
      erroDados: { titulo: 'Datos no disponibles', complemento: 'No se pudieron cargar los vectores de palabras ({msg}). Las lecciones y el asistente de conceptos siguen disponibles.', tentar: 'Intentar de nuevo' },
      avisoAssinatura: 'La firma digital del paquete de datos no coincide. El explorador se desactivó: no confíes en valores de estos datos.',
      dadosAtualizados: 'Datos actualizados. Recarga la página para usar la nueva versión en todas las pantallas.',
      novaVersao: 'Se instaló una nueva versión de la app. Ciérrala y vuelve a abrirla (o recarga) para usarla.',
      idiomaTrocado: 'Idioma cambiado. El contexto de la conversación se limpió.'
    },
    prefs: {
      tema: { SISTEMA: 'Seguir el sistema', CLARO: 'Claro', ESCURO: 'Oscuro' },
      fonte: { PEQUENA: 'Pequeño', NORMAL: 'Normal', GRANDE: 'Grande', MUITO_GRANDE: 'Muy grande' }
    },
    install: {
      ios: { titulo: 'Para instalar en iPhone o iPad:', passos: ['Toca Compartir (el cuadrado con la flecha) en la barra de Safari.', 'Elige "Añadir a pantalla de inicio".', 'Confirma el nombre y toca Añadir.'] },
      geral: { titulo: 'Para instalar como aplicación:', passos: ['Abre el menú del navegador (⋮ o ⋯).', 'Elige "Instalar app" o "Añadir a la pantalla de inicio".', 'Confirma. La app se abre en su propia ventana y funciona sin conexión.'] }
    },
    componentes: { fonte: 'Fuente: ', passoAPasso: 'Paso a paso' },
    inicio: {
      titulo: 'Explorar embeddings',
      subtitulo: 'Elige palabras y mira sus vectores de GloVe proyectados en tres ejes. Rey − hombre + mujer ≈ reina.'
    },
    aprenda: {
      titulo: 'Aprende: las piezas de un modelo de lenguaje', subtitulo: 'Seis secciones cortas, de la predicción del siguiente token a la softmax. Cada una tiene un "Pruébalo" que lleva al explorador.',
      secaoN: 'Sección {n} de {total}', experimente: 'Pruébalo', abrir: 'Abrir en el explorador', referencias: 'Referencias', link: 'ver', navegacao: 'Secciones vecinas', irExplorar: 'Ir al explorador', indice: 'Todas las secciones',
      autoria: 'Texto escrito por el proyecto SaibaTudo (MIT), con referencias académicas. Traducido por agente en los demás idiomas; revisión por hablante nativo pendiente.'
    },
    presets: {
      realeza: { nome: 'Realeza y género', nota: 'La diferencia rey − reina se parece a hombre − mujer: una dirección del espacio lleva el género gramatical.' },
      capitais: { nome: 'Países y capitales', nota: 'Cada país queda a una distancia parecida de su propia capital: la dirección "capital de" se repite.' },
      plural: { nome: 'Plural', nota: 'La dirección gatos − gato se parece a perros − perro; el producto escalar con ella separa singulares de plurales.' },
      familia: { nome: 'Familia', nota: 'Pares como padre/madre y hermano/hermana difieren por la misma dirección de género.' },
      cores: { nome: 'Colores', nota: 'Los colores forman un grupo compacto: aparecen en contextos parecidos en el corpus.' },
      numeros: { nome: 'Números', nota: 'Del uno al diez, los vectores se alinean en una franja; los números cercanos quedan cerca.' },
      lideres: { nome: 'Países y líderes', nota: 'Nota histórica: Italia − Alemania + Hitler se acerca a Mussolini porque el corpus (Wikipedia y noticias) asocia a cada dictador del Eje con su país. Es una regularidad estadística de los textos, no un juicio de la app.' }
    },
    explorador: {
      palavras: 'Palabras en el gráfico', palavrasAria: 'Palabras elegidas', adicionarRotulo: 'Añadir palabra', adicionarPlaceholder: 'Escribe una palabra en inglés (o traducida) y pulsa Intro',
      botaoAdicionar: 'Añadir', limpar: 'Limpiar', remover: 'Quitar {palavra}', destacar: 'Destacar {palavra} y ver sus vecinos', adicionarEsta: 'Añadir al gráfico',
      modoDimensoes: '3 dimensiones', modoPca: 'PCA', diferencas: 'Mostrar diferencias (flechas entre pares)',
      presetsTitulo: 'Ejemplos listos', tabelaTitulo: 'Coordenadas en los 3 ejes', tabelaLegenda: 'Coordenadas de cada palabra en los ejes elegidos', tabelaPalavra: 'Palabra',
      semPalavras: 'Aún no hay palabras. Escribe una arriba, elige un ejemplo o pídeselo al asistente.',
      eixo: 'Eje {n}', eixoDimensao: 'dimensión {n} del vector', eixoPca: 'componente principal {n} ({pct} % de la varianza)',
      aviso: { pcaPoucasPalavras: 'El PCA necesita al menos 3 palabras; se muestran las 3 dimensiones de mayor varianza.' },
      avisoLimite: 'Como máximo {n} palabras en el gráfico.', naoEncontrada: '“{palavra}” no está entre las 100 mil palabras de GloVe (en inglés, sin acentos). Sugerencias:',
      traduzida: '{original} → {en} (traducido por el glosario)',
      vizinhosTitulo: 'Vecinos más cercanos', vizinhosVazio: 'Toca una palabra del gráfico o un chip para ver las 10 palabras más cercanas (coseno).', vizinhosDe: 'Las 10 palabras más cercanas a {palavra}:', cosseno: 'coseno',
      analogiaTitulo: 'Analogía (a − b + c)', analogiaExplicacao: 'Resta b de a y suma c: las palabras más cercanas al resultado completan la analogía. Ej.: king − man + woman ≈ queen.',
      analogiaA: 'palabra a', analogiaB: 'palabra b', analogiaC: 'palabra c', analogiaBotao: 'Calcular', analogiaLimpar: 'Quitar del gráfico', analogiaInvalida: 'Elige tres palabras distintas del gráfico (a y c no pueden ser iguales).',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: 'Dirección y producto escalar', direcaoExplicacao: 'La diferencia w1 − w2 define una dirección (ej.: cats − cat, el plural). El producto escalar de cada palabra con esa dirección mide cuánto “apunta” hacia allí.',
      direcaoW1: 'palabra w1', direcaoW2: 'palabra w2', direcaoLista: 'Palabras a medir, separadas por comas (vacío = las del gráfico)', direcaoBotao: 'Medir', direcaoInvalida: 'Elige dos palabras distintas.',
      direcaoResultado: 'Producto escalar con la dirección {w1} − {w2}:',
      graficoAria: 'Gráfico 3D de las palabras elegidas; arrastra para girar, usa la rueda o pinza para acercar, las flechas del teclado giran. La tabla de abajo tiene las mismas coordenadas.',
      calculadoNoAparelho: 'Calculado en tu dispositivo a partir de GloVe (Pennington, Socher y Manning, 2014; licencia PDDL 1.0). Palabras en inglés.'
    },
    config: {
      titulo: 'Configuración', salva: 'Preferencia guardada en este dispositivo.', aparencia: 'Apariencia', tema: 'Tema', tamanhoTexto: 'Tamaño del texto', idioma: 'Idioma',
      idiomaAjuda: 'Cambia la interfaz, las respuestas y el intérprete de preguntas. Las palabras del gráfico siguen en inglés, el idioma de GloVe.',
      instalar: 'Instalar', jaInstalado: 'La aplicación ya está instalada en este dispositivo.', instalarApp: 'Instalar app',
      ia: 'Inteligencia artificial en la nube',
      iaAviso: 'Opcional y desactivada por defecto. Solo explica conceptos y lo que muestra el gráfico; los números siguen calculándose en este dispositivo. Cuando tocas "Preguntar a la IA en la nube", van a nuestro servidor el texto de la pregunta, el idioma, un resumen del gráfico actual y un código aleatorio de esta instalación.',
      nuvemAutomatica: 'IA en la nube automática',
      nuvemAutomaticaAjuda: 'Cuando la app no entienda una pregunta, enviarla a la IA en la nube sin preguntar. Solo se envían el texto de la pregunta, el idioma y el resumen del gráfico.',
      dados: 'Datos', versaoPacote: 'Versión del paquete', palavras: 'Palabras', assinatura: 'Firma', semDados: 'El paquete de datos aún no se ha cargado.',
      assinaturaValor: { verificada: 'verificada', invalida: 'NO verificada', indisponivel: 'no disponible en este navegador' },
      privacidade: 'Privacidad', privacidadeTexto: 'Guardamos en este dispositivo solo el tema, el tamaño del texto, el idioma y el historial de preguntas, además de la caché para uso sin conexión. ', politica: 'Política de privacidad',
      apagar: 'Borrar los datos de este dispositivo', confirmar: 'Toca de nuevo para confirmar', apagados: 'Datos borrados. Recargando…'
    }
  }
};
