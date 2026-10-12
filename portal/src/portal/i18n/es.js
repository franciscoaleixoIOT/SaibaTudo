// Catálogo en español de la home. Mismas claves que pt-BR.js (referencia). Tratamiento: tú. Traducción por agente,
// 12/10/2026; revisión por hablante nativo pendiente.
export default {
  idioma: 'es',
  nomeNativo: 'Español',
  ogLocale: 'es_ES',
  revisao: 'pendente',
  meta: {
    titulo: 'SaibaTudo — Información verificada: Elecciones 2026 y Química',
    descricao: 'SaibaTudo: aplicaciones independientes, de código abierto y sin anuncios. Elecciones 2026 (Brasil, en portugués): candidaturas, encuestas registradas, reglas y resultados con datos abiertos del TSE. Química: tabla periódica, compuestos con estructura 2D, calculadoras paso a paso y seguridad química con datos abiertos.',
    ogDescricao: 'Aplicaciones independientes y de código abierto. Elecciones 2026 de Brasil con datos abiertos del TSE; Química con tabla periódica, compuestos, calculadoras y seguridad química a partir de fuentes abiertas.',
    ogImagemAlt: 'Símbolo de SaibaTudo: lupa con marca de verificación',
    twitterDescricao: 'Aplicaciones independientes y de código abierto, con datos oficiales y abiertos y sin anuncios: Elecciones 2026 (Brasil) y Química.'
  },
  topo: {
    pular: 'Ir al contenido',
    marcaAria: 'SaibaTudo — página de inicio',
    navAria: 'Principal',
    apps: 'Apps',
    instalar: 'Instalar',
    projeto: 'Proyecto público',
    temaAria: 'Tema: seguir el sistema. Toca para alternar entre sistema, claro y oscuro.',
    temaAuto: 'Auto'
  },
  idiomas: { rotulo: 'Idioma' },
  hero: {
    logoAlt: 'SaibaTudo — Información cívica verificada',
    titulo: 'Información cívica verificada',
    sub: 'Aplicaciones independientes, de código abierto y sin anuncios, que reúnen datos oficiales y abiertos — de las elecciones a la química — para que consultes los hechos y decidas por tu cuenta.',
    abrirEleicoes: 'Abrir la app Elecciones 2026',
    abrirQuimica: 'Abrir la app Química'
  },
  apps: { titulo: 'Nuestras apps' },
  eleicoes: {
    selo: 'Elecciones Generales 2026 de Brasil',
    nome: 'SaibaTudo — Eleições 2026',
    apenasPortugues: 'solo en portugués',
    descricao: 'Consulta candidaturas, encuestas registradas, reglas y resultados con datos abiertos del Tribunal Superior Electoral de Brasil (TSE). Pregunta en lenguaje natural: el asistente local responde solo con datos oficiales, cita la fuente y no recomienda candidatos.',
    vantagens: [
      'Candidaturas por cargo y estado, en orden fijo (cargo, estado y número)',
      'Situación oficial del registro — no es un certificado de antecedentes limpios («Ficha Limpa»)',
      'Encuestas registradas en el TSE y simulador educativo de la urna electrónica',
      'Funciona sin conexión y se actualiza con datos verificados por firma digital'
    ],
    abrir: 'Abrir la app Elecciones 2026',
    play: 'Descargar en Google Play',
    emBreve: 'próximamente',
    playNota: 'La versión para Android en Google Play aún no se ha publicado. Mientras tanto, usa la app web: se puede instalar y funciona sin conexión.'
  },
  quimica: {
    selo: 'Química general — del bachillerato a la universidad',
    nome: 'SaibaTudo — Química',
    descricao: 'Tabla periódica, compuestos y calculadoras con datos abiertos y verificados. Pregunta en español — por ejemplo, «masa molar del agua» o «pH de HCl 0,01 mol/L» — y la respuesta sale de los datos, con la fuente de cada número y el paso a paso de los cálculos.',
    vantagens: [
      'Tabla periódica interactiva con los {num:elementos} elementos y sus propiedades (masa atómica, electronegatividad, radio, energía de ionización, fusión y ebullición)',
      '{num:compostos} compuestos con fórmula, masa molar, nombre IUPAC y estructura dibujada en 2D; {num:compostosComGhsHarmonizado} con los peligros oficiales de la etiqueta (SGA/GHS)',
      'Calculadoras paso a paso: masa molar, balanceo de ecuaciones, estequiometría, concentración y dilución, pH, gas ideal y conversión de unidades',
      'Fuentes abiertas citadas en cada respuesta: PubChem, Wikidata, CODATA, ChEBI, Wikipedia y Wikilibros',
      'La seguridad primero: las peticiones peligrosas se rechazan y los riesgos de cada sustancia aparecen en su ficha'
    ],
    abrir: 'Abrir la app Química',
    nota: 'Funciona sin conexión y nada sale de tu dispositivo. La versión para Android está en preparación; mientras tanto, la app web se puede instalar.'
  },
  confianca: {
    titulo: 'Por qué confiar',
    pilares: [
      { titulo: 'Datos oficiales y abiertos', texto: 'Elecciones: archivos abiertos del TSE. Química: PubChem, Wikidata, CODATA y textos abiertos. Cada respuesta trae su fuente; nada es simulado ni inventado.' },
      { titulo: 'Neutral, independiente y seguro', texto: 'Sin vínculos con el TSE, el gobierno ni los partidos: no recomendamos, comparamos ni predecimos candidatos. En química, las peticiones peligrosas se rechazan.' },
      { titulo: 'Abierto y sin anuncios', texto: 'Código abierto bajo licencia MIT, auditable por cualquier persona. Sin anuncios y sin registro para consultar.' }
    ]
  },
  instalar: {
    titulo: 'Instálalo en tu dispositivo',
    intro: 'Las apps Elecciones 2026 y Química son PWA: funcionan en el navegador y se pueden instalar como aplicación, incluso para usarlas sin conexión con los datos ya cargados. Abre la app y usa el botón <strong>Instalar app</strong>, o sigue los pasos de tu dispositivo.',
    android: {
      titulo: 'Android',
      passos: [
        'Abre la app (Elecciones 2026 o Química) en Chrome o Edge.',
        'Toca <strong>Instalar app</strong> (o el menú ⋮ → <em>Instalar aplicación</em> / <em>Añadir a la pantalla de inicio</em>).',
        'Google Play: próximamente para las dos apps.'
      ]
    },
    ios: {
      titulo: 'iPhone y iPad',
      passos: [
        'Abre la app (Elecciones 2026 o Química) en Safari.',
        'Toca <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba).',
        'Elige <strong>Añadir a pantalla de inicio</strong> y confirma.'
      ]
    },
    desktop: {
      titulo: 'Windows, Mac y Linux',
      passos: [
        'Abre la app (Elecciones 2026 o Química) en Chrome o Edge.',
        'Haz clic en el botón <strong>Instalar app</strong> o en el icono de instalación de la barra de direcciones.',
        'La app se abre en su propia ventana, como cualquier programa.'
      ]
    },
    abrirEleicoes: 'Abrir la app Elecciones 2026',
    abrirQuimica: 'Abrir la app Química',
    portal: 'Instalar el portal SaibaTudo'
  },
  projeto: {
    titulo: 'Proyecto público',
    codigo: {
      titulo: 'Código abierto (MIT)',
      texto: 'Todo el código — sitio, app web, app Android, pipeline de datos y modelo de IA — es público y auditable.'
    },
    fontes: {
      titulo: 'Fuentes oficiales',
      eleicoes: 'Elecciones: <a href="https://dadosabertos.tse.jus.br/" target="_blank" rel="noopener noreferrer">Portal de Datos Abiertos del TSE</a>, licencia CC BY 4.0; en caso de discrepancia, siempre prevalece el sitio oficial del TSE.',
      quimica: 'Química: PubChem (dominio público), Wikidata (CC0), CODATA/NIST, ChEBI (CC BY 4.0), Wikipedia y Wikilibros (CC BY-SA 4.0); la página «Sobre los datos» de la app indica la versión y la licencia de cada fuente.',
      link: 'Sobre los datos: versión, fuentes y limitaciones (en portugués)'
    },
    neutralidade: {
      titulo: 'Neutralidad e independencia',
      texto: 'SaibaTudo es independiente: no tiene vínculos con el TSE, el gobierno ni los partidos. Las listas siguen un orden fijo (cargo, estado y número) y nunca clasifican candidatos.'
    },
    correcoes: {
      titulo: 'Canal de correcciones',
      texto: '¿Encontraste un error? Abre una <em>issue</em> pública en GitHub o usa el botón «Informar de un problema» de la app. Corregimos con transparencia.',
      link: 'Abrir una issue en GitHub'
    }
  },
  breve: {
    titulo: 'Próximamente',
    noscript: 'Las nuevas apps de SaibaTudo se anunciarán aquí.'
  },
  rodape: {
    navAria: 'Pie de página',
    privacidade: 'Privacidad (en portugués)',
    dados: 'Sobre los datos (en portugués)',
    github: 'GitHub',
    texto: 'SaibaTudo es independiente, apartidista y no tiene vínculos con el TSE, el gobierno ni los partidos. Datos electorales: Tribunal Superior Eleitoral (Tribunal Superior Electoral de Brasil) — Portal de Datos Abiertos, licencia CC BY 4.0. Datos de química: PubChem, Wikidata, CODATA/NIST, ChEBI, Wikipedia y Wikilibros. Código bajo licencia MIT.'
  }
};
