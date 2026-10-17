// Catálogo en español (tú). Mismas claves que pt-BR (comprobado por test). Glosario y estilo: docs/I18N.md §8. Traducción inicial por agente: "revisao: 'pendente'" hasta que la revise un hablante nativo.
const MARCA = 'SaibaTudo Química';

export default {
  revisao: 'pendente',
  regras: { minusculaNoMeio: true },

  ui: {
    idiomas: { 'pt-BR': 'portugués', en: 'inglés', es: 'español', de: 'alemán', fr: 'francés' },
    listas: { e: ' y ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo Química — tabla periódica, compuestos y calculadoras con datos abiertos',
      descricao: 'Tabla periódica interactiva, fichas de elementos y compuestos con estructuras 2D, calculadoras paso a paso (masa molar, balanceo, estequiometría, pH, gas ideal) y seguridad química. Datos abiertos, funciona sin conexión y nada sale de tu dispositivo.',
      ogLocale: 'es_ES',
      pular: 'Saltar al contenido'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo Química',
      carregando: 'Cargando SaibaTudo Química…',
      abas: { inicio: 'Inicio', tabela: 'Tabla periódica', compostos: 'Compuestos', calculadoras: 'Calculadoras', seguranca: 'Seguridad' },
      secoes: 'Secciones',
      marcaAria: 'SaibaTudo Química, inicio',
      marcaSub: 'Datos abiertos, cálculos en tu dispositivo',
      configuracoes: 'Configuración',
      idioma: 'Idioma',
      rodape: { sobre: 'Sobre los datos', privacidade: 'Privacidad', configuracoes: 'Configuración', projeto: 'Proyecto independiente y de código abierto (MIT). Sin anuncios, inicio de sesión ni rastreadores.' },
      naoEncontrada: { titulo: 'Página no encontrada', texto: 'Esta dirección no existe en SaibaTudo Química.', inicio: 'Ir al inicio' },
      erro: { titulo: 'Error', cabecalho: 'Algo salió mal', texto: 'No se pudo construir esta pantalla ({msg}).', inicio: 'Ir al inicio' },
      erroDados: { titulo: 'No se pudieron cargar los datos', complemento: '{msg}. Revisa tu conexión; después de la primera carga, la app funciona sin conexión.', tentar: 'Intentar de nuevo' },
      avisoAssinatura: 'La firma digital del paquete de datos no coincide. Se siguen usando los datos del propio sitio, pero no se autenticaron: no confíes en los valores críticos.',
      dadosAtualizados: 'Datos actualizados. Recarga la página para usar la nueva versión en todas las pantallas.',
      novaVersao: 'Se instaló una nueva versión de la app. Ciérrala y vuelve a abrirla (o recarga la página) para usarla.',
      idiomaTrocado: 'Idioma cambiado. Se borró el contexto de la conversación.'
    },
    prefs: {
      tema: { SISTEMA: 'Seguir el sistema', CLARO: 'Claro', ESCURO: 'Oscuro' },
      fonte: { PEQUENA: 'Pequeño', NORMAL: 'Normal', GRANDE: 'Grande', MUITO_GRANDE: 'Muy grande' }
    },
    install: {
      ios: { titulo: 'Instalar en iPhone o iPad', passos: ['Abre esta página en Safari.', 'Toca Compartir (el cuadrado con la flecha hacia arriba).', 'Elige “Añadir a pantalla de inicio” y confirma con “Añadir”.'] },
      geral: {
        titulo: 'Instalar la app',
        passos: [
          'En Chrome o Edge (Windows, Mac, Linux, Android), usa el botón “Instalar app” de esta página o el icono de instalación de la barra de direcciones.',
          'En el menú del navegador, elige “Instalar SaibaTudo Química” (o “Añadir a la pantalla de inicio”).',
          'Una vez instalada, la app se abre en su propia ventana y también funciona sin internet (con los datos ya cargados).'
        ]
      }
    },
    componentes: {
      fonte: 'Fuente: ',
      palavraSinal: 'Palabra de advertencia: ',
      pictogramasAria: 'Pictogramas de peligro',
      frasesAria: 'Indicaciones de peligro (H)',
      fraseIndisponivel: 'El texto de la indicación no está disponible en este paquete.',
      passoAPasso: 'Paso a paso',
      fraseEmIdioma: '(texto en {idioma})'
    },
    molecula: {
      aria: 'Estructura 2D de {nome}',
      erroDesenho: 'No se pudo dibujar esta estructura.',
      erroSmiles: 'No se pudo interpretar el SMILES de esta estructura.',
      erroBiblioteca: 'La biblioteca de dibujo no está disponible ahora (¿sin conexión?). El SMILES sigue indicado en la ficha.'
    },
    nomes: {
      emIdioma: '{nome} (nombre en {idioma})',
      nomeEmIdioma: 'Nombre en {idioma}'
    },
    inicio: {
      titulo: 'Inicio',
      cabecalho: 'Pregunta sobre Química',
      intro: 'Elementos, compuestos, cálculos paso a paso y seguridad química. Las respuestas salen de datos abiertos y de cálculos hechos en tu dispositivo.',
      campoAria: 'Pregunta sobre Química',
      placeholder: 'Ej.: masa molar del agua, Fe + O2 -> Fe2O3, pH del HCl 0,01 mol/L',
      exemplosAria: 'Preguntas de ejemplo',
      badge: 'Nada sale de tu dispositivo, salvo que le preguntes a la IA en la nube.',
      explore: 'Explora',
      cartoes: {
        tabela: { titulo: 'Tabla periódica', descricao: 'Colores por categoría, filtros por bloque, periodo, grupo y estado.' },
        compostos: { titulo: 'Compuestos', descricao: 'Busca por nombre, fórmula, CAS o CID y mira la estructura 2D.' },
        calculadoras: { titulo: 'Calculadoras', descricao: 'Masa molar, balanceo, estequiometría, concentración, pH, gas ideal y unidades.' },
        seguranca: { titulo: 'Seguridad', descricao: 'Pictogramas GHS, indicaciones H y cómo evitar mezclas peligrosas.' },
        sobre: { titulo: 'Sobre los datos', descricao: 'Fuentes, licencias, fechas y comprobación de la firma digital.' }
      },
      historico: { ultima: 'Última pregunta', anterior: 'Pregunta anterior', proxima: 'Pregunta siguiente o cuadro vacío' },
      limpar: 'Borrar texto',
      analisando: 'Analizando',
      analisandoPergunta: 'Analizando la pregunta…',
      pensando: 'Pensando…',
      perguntar: 'Preguntar',
      copiada: 'Respuesta copiada.',
      naoCopiou: 'No se pudo copiar en este navegador.',
      copiarRodape: 'Fuentes:',
      relatoTitulo: 'Química: respuesta a “{pergunta}”',
      relatoCorpo: '¿Qué estaba mal o faltaba en la respuesta? (No incluyas datos personales.)\n\nPregunta: {pergunta}',
      respostaAnuncio: 'Respuesta: {titulo}'
    },
    nuvem: {
      botao: 'Preguntar a la IA en la nube',
      nota: 'Envía solo el texto de esta pregunta a nuestro servidor para interpretarla; la respuesta sigue viniendo de los datos. En una continuación («¿y el del potasio?»), también se envía la interpretación de la pregunta anterior, sin su texto. Puede tardar hasta 30 s.',
      notaConferir: 'La respuesta de arriba se construyó en tu dispositivo. Si no era lo que querías, la IA en la nube puede intentar entender la pregunta de otra manera; la respuesta sigue viniendo de los datos. Solo se envía el texto de esta pregunta. En una continuación («¿y el del potasio?»), también se envía la interpretación de la pregunta anterior, sin su texto. Puede tardar hasta 30 s.',
      consultando: 'Consultando a la IA en la nube…',
      mesmaInterpretacao: 'La IA en la nube entendió la pregunta igual que la app, así que la respuesta de arriba ya responde a esa pregunta. Si querías otra cosa, reformula la pregunta citando el elemento, el compuesto o la propiedad.',
      semOutraInterpretacao: 'La IA en la nube no encontró otra forma de entender esta pregunta. La respuesta de arriba sigue siendo válida.',
      indisponivelConferir: 'La IA en la nube no está disponible ahora o tardó demasiado. La respuesta de arriba sigue siendo válida; inténtalo de nuevo en unos instantes.',
      falhouConferir: 'La IA en la nube no pudo ofrecer otra respuesta en este momento. La respuesta de arriba sigue siendo válida.',
      naoEntendeu: 'La IA en la nube tampoco entendió esta pregunta. Intenta reformularla citando el elemento, el compuesto (nombre o fórmula) o la propiedad.',
      indisponivel: 'La IA en la nube no está disponible ahora o tardó demasiado. Inténtalo de nuevo en unos instantes o reformula la pregunta citando el elemento, el compuesto o la propiedad.',
      falhou: 'La IA en la nube no pudo interpretar la pregunta ahora. Intenta reformularla citando el elemento, el compuesto o la propiedad.',
      quisDizer: 'No encontré ese compuesto en los datos. ¿Quisiste decir:'
    },
    melhoria: {
      titulo: 'Ayudar a mejorar la aplicación',
      explicacao: 'La aplicación no entendió esta pregunta. Si quieres, envíala para ayudarnos a enseñar al intérprete. Solo se envían el texto de la pregunta y un código aleatorio de esta instalación, sin tu nombre ni nada que te identifique. Las preguntas con correo electrónico, teléfono, número de documento, dirección web o una petición peligrosa no se envían, pero ningún filtro es perfecto: no escribas datos personales. Una persona revisa las preguntas guardadas, que se borran en un plazo máximo de 4 meses. Para enviarlas siempre, activa "Ayudar a mejorar la aplicación" en Configuración; allí también puedes desactivarlo y vaciar la cola.',
      botao: 'Enviar esta pregunta',
      enviando: 'Enviando…',
      enviada: '¡Gracias! La pregunta se envió.',
      naFila: 'Esta pregunta entró en la cola de "Ayudar a mejorar la aplicación" y se enviará con las próximas. Para desactivarlo, ve a Configuración.',
      guardada: 'La pregunta quedó guardada en este dispositivo y se enviará con las próximas.',
      indisponivel: 'El envío no está disponible ahora. La pregunta queda guardada en este dispositivo y se enviará más tarde.',
      falhou: 'No se pudo enviar ahora (sin red o demasiados envíos seguidos). La pregunta queda guardada en este dispositivo y se enviará más tarde.',
      chave: 'Ayudar a mejorar la aplicación',
      chaveAjuda: 'Desactivado por defecto. Si lo activas, las preguntas que la aplicación no entendió entran en una cola en este dispositivo y se envían por lotes a nuestro servidor, solo con el texto de la pregunta y un código aleatorio de esta instalación, para que una persona las revise y enseñe a la aplicación a entenderlas. Las preguntas con datos personales (correo, teléfono, documento, sitio web) o una petición peligrosa no entran en la cola, pero ningún filtro es perfecto: evita escribir datos personales. Al desactivarlo se borra lo que aún no se ha enviado.',
      fila: (p) => (Number(p.n) === 0 ? 'Ninguna pregunta en la cola.' : Number(p.n) === 1 ? 'Una pregunta en la cola, esperando el envío.' : `${p.n} preguntas en la cola, esperando el envío.`),
      apagarFila: 'Vaciar la cola',
      filaApagada: 'Cola vaciada.'
    },
    resposta: {
      rotuloRecusa: 'Petición rechazada por motivos de seguridad',
      rotuloResolvida: 'Respuesta construida en tu dispositivo, a partir de los datos',
      rotuloNaoResolvida: 'No pude responder',
      origemNuvem: 'en tu dispositivo, con la pregunta interpretada por la IA en la nube ({modelo})',
      origemAparelho: 'en tu dispositivo',
      origem: 'Respuesta construida {origem}',
      dadosDe: ' • paquete de datos del {data}',
      fechar: 'Cerrar respuesta',
      tambem: 'También puedes preguntar',
      fontes: 'Fuentes y licencias ({n})',
      copiar: 'Copiar respuesta',
      relatar: 'Informar de un problema con esta respuesta'
    },
    tabela: {
      titulo: 'Tabla periódica',
      intro: 'Toca un elemento para ver todas sus propiedades, con unidades y fuentes. Los colores indican la categoría; filtra por bloque, periodo, grupo o estado físico.',
      buscar: 'Buscar',
      placeholder: 'Nombre, símbolo o número',
      filtrosAria: 'Filtros de la tabla periódica',
      bloco: 'Bloque', blocoN: 'Bloque {b}', periodo: 'Periodo', periodoN: 'Periodo {p}', grupo: 'Grupo', grupoN: 'Grupo {g}', estado: 'Estado estándar', todos: 'Todos',
      estados: { solido: 'Sólido', liquido: 'Líquido', gas: 'Gas' },
      limpar: 'Quitar filtros',
      legendaAria: 'Categorías (toca para filtrar)',
      contagemTodos: '{n} elementos',
      contagemFiltro: '{n} de {total} elementos cumplen los filtros',
      regiaoAria: 'Tabla periódica (desplázate hacia los lados en pantallas estrechas)',
      vazio: 'No hay datos de elementos disponibles.',
      rotuloElemento: '{nome}, símbolo {simbolo}, número atómico {z}, {categoria}, {estado}'
    },
    elemento: {
      naoEncontrado: 'Elemento no encontrado',
      naoHa: 'No hay ningún “{simbolo}” en los datos.',
      abrirTabela: 'Abrir la tabla periódica',
      voltar: 'Tabla periódica',
      nomeEmIngles: 'Nombre en inglés',
      incerteza: 'Incertidumbre de la masa atómica',
      sub: 'Elemento {z} · {categoria} · {estado} en condiciones estándar',
      propriedades: 'Propiedades',
      compostosCom: 'Compuestos que contienen {nome}',
      buscarCompostosDe: 'Buscar compuestos de {nome}',
      mostrando: (p) => (p.n === 1 ? 'Se muestra un compuesto del índice; usa la búsqueda de compuestos para ver más.' : `Se muestran ${p.n} compuestos del índice; usa la búsqueda de compuestos para ver más.`),
      calcular: 'Calcular',
      massaMolarDe: 'Masa molar: {nome}'
    },
    compostos: {
      titulo: 'Compuestos',
      intro: 'Busca por nombre, nombre común, nombre IUPAC, fórmula, número CAS o CID de PubChem.',
      placeholder: 'Nombre, fórmula, CAS o CID (ej.: aspirina, H2SO4, 64-17-5)',
      buscar: 'Buscar compuesto',
      buscando: 'Buscando…',
      semIndice: 'El índice de compuestos no está disponible.',
      erro: 'No se pudieron cargar los compuestos ({msg}).',
      resultados: (p) => `${p.n} resultado${p.n > 1 ? 's' : ''}`,
      nenhum: 'No se encontró ningún compuesto para “{q}”.',
      total: '{n} compuestos en el paquete, en orden alfabético.',
      faixa: 'Mostrando {de}–{ate} de {n}.',
      pagina: 'Página {p} de {total}',
      anterior: 'Página anterior',
      proxima: 'Página siguiente',
      paginacao: 'Páginas de resultados',
      cas: 'CAS {cas}',
      naoEncontrado: 'Compuesto no encontrado',
      naoHa: 'Este compuesto no está en el paquete de datos.',
      buscarCompostos: 'Buscar compuestos',
      cid: 'CID {cid}',
      voltar: 'Compuestos',
      nomePopular: 'Nombre común',
      nomeIupac: 'Nombre IUPAC',
      nomePt: 'Nombre en portugués',
      nomePtPendente: 'pendiente: el nombre que se muestra es el nombre IUPAC',
      sinonimos: 'Sinónimos',
      formula: 'Fórmula',
      formulaHill: 'Fórmula (notación de Hill)',
      cidPubchem: 'CID de PubChem',
      smiles: 'SMILES',
      wikidata: 'Wikidata',
      dados: 'Datos del compuesto',
      fontePubchem: 'PubChem CID {cid} (NCBI/NLM)',
      estrutura: 'Estructura 2D',
      desenhada: 'Dibujada en tu dispositivo a partir del SMILES del paquete de datos, con SmilesDrawer (MIT).',
      seguranca: 'Seguridad',
      classificacaoGhs: 'Clasificación de peligros (GHS)',
      fonteFrases: 'Indicaciones de peligro: UNECE GHS / ECHA CLP',
      semGhs: 'El paquete no tiene una clasificación GHS armonizada para este compuesto. Eso no significa que sea inofensivo: consulta la hoja de datos de seguridad del producto.',
      icsc: 'Ficha ICSC en el sitio de la OIT',
      comoLer: 'Cómo leer los pictogramas y las indicaciones H',
      definicao: 'Definición (ChEBI)',
      definicaoFonte: 'Definición en inglés. Fuente: ',
      chebi: 'ChEBI ({id})',
      chebiSem: 'ChEBI (EMBL-EBI)',
      calcular: 'Calcular',
      massaMolarDe: 'Masa molar de {formula}',
      perguntar: 'Preguntar sobre este compuesto',
      perguntaPerigos: 'Peligros: {nome}'
    },
    calculadoras: {
      titulo: 'Calculadoras',
      intro: 'Cada resultado muestra los pasos y las fórmulas. Todo se calcula en tu dispositivo; las masas atómicas y las constantes salen del paquete de datos firmado.',
      naoEncontrada: 'Calculadora no encontrada',
      verTodas: 'Ver todas las calculadoras',
      voltar: 'Calculadoras',
      resultadoAria: 'Resultado',
      passoAPasso: 'Paso a paso',
      exemplosAria: 'Ejemplos',
      unidadeDe: 'Unidad de {rotulo}',
      lista: {
        'massa-molar': { titulo: 'Masa molar', descricao: 'Suma de las masas atómicas del paquete de datos, con la composición porcentual.' },
        balanceamento: { titulo: 'Balanceo de ecuaciones', descricao: 'Álgebra lineal exacta, con iones y pasos.' },
        estequiometria: { titulo: 'Estequiometría', descricao: 'Masa, moles, partículas y volumen (CN); reactivo limitante.' },
        concentracao: { titulo: 'Concentración y dilución', descricao: 'Molaridad, g/L, porcentajes y C₁V₁ = C₂V₂.' },
        ph: { titulo: 'pH', descricao: 'Ácidos y bases fuertes y débiles (con Ka o Kb) y conversiones.' },
        'gas-ideal': { titulo: 'Gas ideal', descricao: 'PV = nRT con la constante R del paquete (CODATA).' },
        unidades: { titulo: 'Conversión de unidades', descricao: 'Presión, volumen, masa, temperatura, energía y más.' }
      },
      massaMolar: {
        formula: 'Fórmula química', placeholder: 'Ej.: Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3', ajuda: 'Paréntesis, hidratos con “·” (o “.”), cargas al final: Fe3+, SO4^2-.',
        fichaDe: 'ficha de {nome}', calcular: 'Calcular la masa molar'
      },
      balanceamento: {
        equacao: 'Ecuación química', placeholder: 'Ej.: Fe + O2 -> Fe2O3',
        ajuda: 'Separa las sustancias con “+” y usa “->” o “→”. Los iones funcionan: Zn + Cu2+ -> Zn2+ + Cu. Los estados (s), (l), (g), (aq) se ignoran.',
        conferencia: 'Comprobación: átomos de cada elemento (y la carga) en ambos lados', elemento: 'Elemento', reagentes: 'Reactivos', produtos: 'Productos', igual: '¿Igual?', carga: 'carga', sim: 'sí', nao: 'no',
        coeficientesIgnorados: 'Se ignoraron los coeficientes escritos: la app balancea toda la ecuación.', balancear: 'Balancear'
      },
      estequiometria: {
        modo: '¿Qué quieres hacer?', conv: 'Convertir masa, moles, partículas y volumen (CN) de una sustancia', reacao: 'Reacción: reactivo limitante y cantidad de productos',
        substancia: 'Sustancia (fórmula)', placeholderSubstancia: 'Ej.: H2O, CO2, NaCl', quantidade: 'Cantidad',
        ajudaQuantidade: 'L y mL = volumen de un gas ideal en CN (0 °C y 1 atm). “partículas” = moléculas, átomos o iones.', particulas: 'partículas',
        equacao: 'Ecuación química', placeholderEquacao: 'Ej.: H2 + O2 -> H2O', ajudaEquacao: 'La app balancea la ecuación. Indica la cantidad de al menos una sustancia.',
        rendimento: 'Rendimiento (%)', ajudaRendimento: 'Opcional. 100 % = rendimiento teórico.', quantidadeDe: 'Cantidad de {formula}', calcular: 'Calcular',
        tabelaTitulo: 'Cantidades de cada sustancia', tabelaLegenda: 'Reactivos: cantidades inicial, consumida y restante; productos: formada',
        cabecalho: ['Sustancia', 'Función', 'Coef.', 'M (g/mol)', 'Mol', 'Masa (g)', 'Partículas', 'Volumen CN (L)'],
        produto: 'producto', limitante: 'reactivo limitante', reagente: 'reactivo'
      },
      concentracao: {
        tipo: 'Tipo de cálculo', soluto: 'Soluto (fórmula)', exNaCl: 'Ej.: NaCl', exNaOH: 'Ej.: NaOH', massaSoluto: 'Masa de soluto', volumeSolucao: 'Volumen de disolución',
        concentracaoDesejada: 'Concentración deseada', valorConcentracao: 'Valor de la concentración', converter: 'Convertir', glParaMol: 'g/L → mol/L', molParaGl: 'mol/L → g/L',
        massaSolucao: 'Masa de disolución', unidadeConcentracao: 'Unidad de concentración', unidadeVolume: 'Unidad de volumen',
        c1: 'C₁ (concentración inicial)', v1: 'V₁ (volumen inicial)', c2: 'C₂ (concentración final)', v2: 'V₂ (volumen final)',
        deixeEmBranco: 'Deja en blanco el campo que quieres calcular.', calcular: 'Calcular'
      },
      ph: {
        tipo: 'Tipo de disolución', concentracao: 'Concentración (mol/L)', ex001: 'Ej.: 0,01', ex01: 'Ej.: 0,1', hLiberados: 'H⁺ liberados por unidad de fórmula', ohLiberados: 'OH⁻ liberados por unidad de fórmula',
        ajudaN: 'HCl = 1; H₂SO₄ = 2 (modelo escolar); NaOH = 1; Ca(OH)₂ = 2.', kaOuPka: 'Ka o pKa', kbOuPkb: 'Kb o pKb', exK: 'Ej.: 1,8e-5',
        ajudaK: 'Notación científica: 1,8e-5 o 1,8 x 10^-5.', valorInformado: 'El valor indicado es', valorConhecido: 'Valor conocido', hMolL: '[H⁺] (mol/L)', ohMolL: '[OH⁻] (mol/L)',
        valor: 'Valor', calcular: 'Calcular el pH'
      },
      gas: {
        calcular: 'Calcular', volume: 'Volumen (V)', pressao: 'Presión (P)', quantidade: 'Cantidad de sustancia (n)', temperatura: 'Temperatura (T)',
        formulaGas: 'Fórmula del gas', exCO2: 'Ej.: CO2', massaGas: 'Masa del gas', usarMassa: 'Indicar la masa y la fórmula del gas en lugar de n', botao: 'Calcular'
      },
      unidades: {
        grandeza: 'Magnitud', valor: 'Valor', ex5: 'Ej.: 5', de: 'De', para: 'A', converter: 'Convertir', inverter: 'Invertir', equivaleA: '{valor} {de} equivale a',
        grandezas: { massa: 'Masa', volume: 'Volumen', comprimento: 'Longitud', pressao: 'Presión', energia: 'Energía', temperatura: 'Temperatura', tempo: 'Tiempo', quantidade: 'Cantidad de sustancia', concentracao: 'Concentración' }
      }
    },
    seguranca: {
      titulo: 'Seguridad química',
      intro: 'Cómo leer las advertencias de peligro de los productos químicos. La app muestra la clasificación GHS de los compuestos del paquete de datos y te lleva a las fichas oficiales; no enseña a producir sustancias peligrosas.',
      aviso: 'Por seguridad, la app rechaza las peticiones de síntesis, purificación o recetas caseras de explosivos, armas químicas, drogas ilícitas y otros reactivos peligrosos. Las preguntas sobre peligros, EPP, almacenamiento y primeros auxilios sí se responden.',
      verPerigos: 'Ver los peligros de un compuesto', buscar: 'Buscar compuesto', placeholderBusca: 'Nombre, fórmula o CAS del compuesto', verPictogramas: 'Ver peligros y pictogramas',
      pictogramas: 'Pictogramas GHS',
      pictogramasIntro: 'El GHS (el Sistema Globalmente Armonizado de la ONU) usa rombos con borde rojo. Los dibujos de abajo son versiones simplificadas hechas para esta app.',
      palavraSinal: 'Palabra de advertencia', perigo: 'Peligro', atencao: 'Atención',
      sinalTexto1: ' señala las categorías más graves; ', sinalTexto2: ' señala las menos graves. Las sustancias de menor peligro pueden venir sin palabra de advertencia.',
      comoLer: 'Cómo leer las indicaciones H', frasesIntro: 'Cada indicación de peligro tiene un código: la letra H y tres dígitos. El primer dígito indica el tipo de peligro:',
      codigosSomados: 'Los códigos combinados, como H302+H312, reúnen las indicaciones en una sola. Textos: UNECE GHS / ECHA CLP, en español.',
      procurarFrase: 'Buscar una indicación', placeholderFiltro: 'Filtra por código o palabra (ej.: H314, inflamable)', nenhumaFrase: 'No se encontró ninguna indicación.',
      boasPraticas: 'Buenas prácticas', fontesOficiais: 'Fuentes oficiales (enlaces externos)',
      links: [
        ['Fichas Internacionales de Seguridad Química (ICSC), OIT/OMS', 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', 'Fichas por sustancia (la app no copia las fichas: solo te lleva a ellas).'],
        ['PubChem: clasificación GHS de los compuestos', 'https://pubchem.ncbi.nlm.nih.gov/ghs/', 'Explica el origen de la clasificación que usa esta app.'],
        ['UNECE: transporte de mercancías peligrosas y GHS', 'https://unece.org/transport/dangerous-goods', 'Origen del Sistema Globalmente Armonizado (GHS) de la ONU.']
      ]
    },
    perigos: {
      pictogramas: {
        GHS01: 'Explosivo', GHS02: 'Inflamable', GHS03: 'Comburente', GHS04: 'Gas a presión', GHS05: 'Corrosivo',
        GHS06: 'Toxicidad aguda (tóxico o mortal)', GHS07: 'Nocivo, irritante o sensibilizante', GHS08: 'Peligro grave para la salud', GHS09: 'Peligroso para el medio ambiente acuático'
      },
      descricoes: {
        GHS01: 'explosivos, sustancias autorreactivas y peróxidos orgánicos',
        GHS02: 'inflamables, pirofóricos, sustancias que se calientan espontáneamente o que desprenden gases inflamables en contacto con el agua',
        GHS03: 'comburentes', GHS04: 'gases a presión',
        GHS05: 'corrosivos para los metales, que causan quemaduras graves en la piel y lesiones oculares graves', GHS06: 'toxicidad aguda (mortal o tóxica)',
        GHS07: 'toxicidad aguda moderada (nocivo), irritación cutánea y ocular, sensibilización cutánea e irritación de las vías respiratorias',
        GHS08: 'carcinogenicidad, mutagenicidad, toxicidad para la reproducción, sensibilización respiratoria, toxicidad específica en determinados órganos y peligro por aspiración',
        GHS09: 'peligroso para el medio ambiente acuático'
      },
      grupos: [
        { faixa: 'H2xx', titulo: 'Peligros físicos', descricao: 'explosivos, inflamables, comburentes, gases a presión, corrosivos para los metales (H200 a H290).' },
        { faixa: 'H3xx', titulo: 'Peligros para la salud', descricao: 'toxicidad aguda, corrosión e irritación cutánea y ocular, sensibilización, mutagenicidad, carcinogenicidad, toxicidad para la reproducción y toxicidad específica en determinados órganos (H300 a H373).' },
        { faixa: 'H4xx', titulo: 'Peligros para el medio ambiente', descricao: 'toxicidad para los organismos acuáticos y para la capa de ozono (H400 a H420).' }
      ],
      sinal: { perigo: 'Peligro', atencao: 'Atención' }
    },
    sobre: {
      titulo: 'Sobre los datos',
      intro: 'Todo número que se muestra sale del paquete de datos firmado o de un cálculo hecho en tu dispositivo. La IA en la nube, opcional, solo interpreta la pregunta y nunca aporta números.',
      pacote: 'Paquete de datos', versao: 'Versión', geradoEm: 'Generado el', assinatura: 'Firma digital', origem: 'Origen', arquivos: 'Archivos', arquivosValor: '{n} ({kb} KB en total)',
      elementos: 'Elementos', compostos: 'Compuestos en el índice', ultimaVerificacao: 'Última comprobación', avisosCarga: 'Avisos de carga: {msgs}',
      dados: 'Datos del paquete', textos: 'Textos con licencia (explicaciones)', externas: 'Referencias externas (enlaces)', licencasManifesto: 'Licencias indicadas en el manifiesto',
      comoObtidos: 'Cómo se obtienen los valores',
      como: [
        'Elementos, compuestos, constantes y reglas: archivos JSON versionados, con SHA-256 comprobado y un manifiesto firmado.',
        'Masa molar, balanceo, estequiometría, concentración, pH, gas ideal y unidades: código determinista probado, en tu dispositivo.',
        'Estructura 2D: dibujada a partir del SMILES del paquete. Pictogramas GHS: dibujos simplificados hechos para esta app.',
        'Extractos de explicación: citados con su fuente y licencia; las traducciones automáticas se indican como tales.',
        'Propiedades físicas de los compuestos (fusión, ebullición, densidad, solubilidad en agua, pKa): de Wikidata, cada valor con su declaración y la referencia que cita; el estado físico a 25 °C se deriva del punto de fusión y del de ebullición.'
      ],
      bibliotecas: 'Bibliotecas de código abierto',
      rodape: 'SaibaTudo es independiente y de código abierto (MIT). ', privacidade: 'Política de privacidad',
      mantenedor: 'Responsable: {x}', licenca: 'Licencia: {x}', acessadoEm: 'Consultado el: {x}', atribuicao: 'Atribución: {x}', uso: 'Uso: {x}',
      somenteLink: 'solo enlace',
      referencias: {
        openstax: 'Libro de texto abierto con restricciones de uso: se sugiere como lectura; no se copió ningún extracto.',
        icsc: 'Fichas por sustancia; el botón “Ficha ICSC en el sitio de la OIT” abre la búsqueda por CAS.',
        nist: 'Datos termoquímicos y espectros; se sugiere como referencia.',
        libretexts: 'Textos abiertos de química; se sugieren como lectura complementaria.'
      },
      bibliotecasUso: { katex: 'Fórmulas y pasos de los cálculos', smiles: 'Estructura 2D de las moléculas', poppins: 'Fuente de los títulos' },
      assinaturaRotulo: {
        verificada: 'verificada (ECDSA P-256 con la clave pública de la app)',
        invalida: 'NO coincide: se siguen usando los datos del propio sitio, pero no se autenticaron',
        indisponivel: 'no se pudo verificar en este navegador (WebCrypto requiere HTTPS)'
      },
      origemRotulo: {
        verificada: 'sitio (firma digital verificada)', invalida: 'sitio (firma NO verificada)', indisponivel: 'sitio (verificación no disponible en este navegador)',
        atualizada: 'actualización verificada (firma digital)'
      },
      sigDetalhe: { invalida: 'La firma del manifiesto no coincide; se usan los archivos del propio sitio.', indisponivel: 'El navegador no ofrece WebCrypto en este contexto (usa HTTPS).' },
      atualizacao: {
        botao: 'Buscar actualizaciones de datos', verificando: 'Comprobando…', atual: 'Los datos ya están en la última versión.', atualizado: 'Datos actualizados a la versión {version}.',
        ignorado: 'No hay nada que hacer: {motivo}', falha: 'No se pudo comprobar ahora ({motivo}).',
        motivos: {
          semVerificacao: 'verificación de la firma no disponible (se requiere HTTPS)', assinaturaInvalida: 'firma del manifiesto NO válida — actualización rechazada',
          maisAntigo: 'el paquete remoto es más antiguo que el activo (protección contra retrocesos)'
        }
      }
    },
    config: {
      titulo: 'Configuración', salva: 'Preferencia guardada en este dispositivo.', aparencia: 'Apariencia', tema: 'Tema', tamanhoTexto: 'Tamaño del texto', idioma: 'Idioma',
      idiomaAjuda: 'Cambia la interfaz, las respuestas y el intérprete de preguntas. Los nombres y textos que aún no existen en el idioma aparecen en inglés o en portugués, siempre con una etiqueta.',
      instalar: 'Instalar', jaInstalado: 'La app ya está instalada en este dispositivo.', instalarApp: 'Instalar app',
      ia: 'Inteligencia artificial en la nube',
      iaAviso: 'Opcional y desactivada por defecto. Solo interpreta la pregunta: la respuesta sigue viniendo de los datos y de los cálculos de este dispositivo, y ningún número viene del modelo. Cuando tocas “Preguntar a la IA en la nube”, solo se envían a nuestro servidor el texto de esa pregunta y un código aleatorio de esta instalación. En una continuación («¿y el del potasio?»), también se envía la interpretación de la pregunta anterior, sin su texto.',
      nuvemAutomatica: 'IA en la nube automática',
      nuvemAutomaticaAjuda: 'Cuando la app no entiende una pregunta, la envía a la IA en la nube sin pedirte confirmación. Solo se envía el texto de la pregunta; las respuestas siguen viniendo de los datos. En una continuación («¿y el del potasio?»), también se envía la interpretación de la pregunta anterior, sin su texto.',
      dados: 'Datos', versaoPacote: 'Versión del paquete', assinatura: 'Firma',
      assinaturaValor: { verificada: 'verificada', invalida: 'NO verificada', indisponivel: 'no disponible en este navegador' },
      privacidade: 'Privacidad', privacidadeTexto: 'Guardamos en este dispositivo solo el tema, el tamaño del texto y el idioma, además de la caché para el uso sin conexión. ', politica: 'Política de privacidad',
      apagar: 'Borrar los datos de este dispositivo', confirmar: 'Toca de nuevo para confirmar', apagados: 'Datos borrados. Recargando…'
    }
  },

  propriedades: {
    rotulos: {
      numeroAtomico: 'número atómico', massaAtomica: 'masa atómica', simbolo: 'símbolo', grupo: 'grupo (familia)', periodo: 'periodo', bloco: 'bloque', categoria: 'categoría',
      configuracaoEletronica: 'configuración electrónica', eletronegatividade: 'electronegatividad (Pauling)', raioAtomicoPm: 'radio atómico (van der Waals)',
      afinidadeEletronicaKJmol: 'afinidad electrónica', energiaIonizacaoKJmol: 'energía de ionización', pontoFusaoK: 'punto de fusión', pontoEbulicaoK: 'punto de ebullición',
      densidadeKgm3: 'densidad', estadoPadrao: 'estado físico (condiciones estándar)', estadosOxidacao: 'estados de oxidación', descoberta: 'descubrimiento',
      massaMolar: 'masa molar', massaExata: 'masa exacta (monoisotópica)', formula: 'fórmula', cas: 'número CAS', cid: 'CID de PubChem', smiles: 'SMILES', inchiKey: 'InChIKey',
      nomeIupac: 'nombre IUPAC', xlogp: 'XLogP (lipofilia calculada)', doadoresH: 'donadores de enlaces de hidrógeno', aceptoresH: 'aceptores de enlaces de hidrógeno',
      ligacoesRotaveis: 'enlaces rotables', carga: 'carga eléctrica', tpsa: 'área de superficie polar (TPSA)', solubilidade: 'solubilidad en agua', pka: 'pKa'
    },
    medidas: {
      titulo: 'Propiedades físicas', intro: 'Valores medidos, cada uno con su fuente y las condiciones de la medida.',
      unidadeG100g: 'g/100 g de agua', unidadeGL: 'g/L (en agua)', pkaVarios: '{lista}',
      aTemperatura: 'a {k} K ({c} °C)', aPressao: 'a {pa} Pa ({atm} atm)', fase: 'fase: {fase}', referencia: 'referencia: {x}',
      semReferencia: 'sin referencia en Wikidata',
      semReferenciaCorroborado: (p) => `sin referencia en Wikidata (${p.n} declaraciones coinciden)`,
      derivado: 'derivado del punto de fusión y del punto de ebullición del paquete, a 25 °C y 1 atm', derivadoNome: 'SaibaTudo Química (valor derivado)',
      fontePacote: 'paquete de datos', revisar: 'valor por revisar',
      avisoRevisar: 'Valor por revisar: el de PubChem puede estar desactualizado (difiere de las tablas actuales) y Wikidata no tiene esta propiedad.',
      notaPauling: 'Escala de Pauling, con los valores revisados de Allred (1961), como en PubChem; los libros que usan los valores originales de Pauling difieren en algunos elementos.',
      notaPka: 'Menor pKa registrado (primera disociación); para las bases, Wikidata suele registrar el pKa del ácido conjugado, y los ácidos fuertes no tienen pKa.',
      estadoA25: 'estado físico a 25 °C y 1 atm'
    },
    categorias: {
      metal_alcalino: 'metal alcalino', metal_alcalino_terroso: 'metal alcalinotérreo', metal_transicao: 'metal de transición', metal_pos_transicao: 'metal postransicional',
      semimetal: 'metaloide', nao_metal: 'no metal', halogenio: 'halógeno', gas_nobre: 'gas noble', lantanideo: 'lantánido', actinideo: 'actínido',
      desconhecida: 'propiedades químicas desconocidas', metal: 'metal'
    },
    categoriasPlural: {
      metal_alcalino: 'metales alcalinos', metal_alcalino_terroso: 'metales alcalinotérreos', metal_transicao: 'metales de transición', metal_pos_transicao: 'metales postransicionales',
      semimetal: 'metaloides', nao_metal: 'no metales', halogenio: 'halógenos', gas_nobre: 'gases nobles', lantanideo: 'lantánidos', actinideo: 'actínidos', metal: 'metales'
    },
    estados: { solido: 'sólido', liquido: 'líquido', gas: 'gas', desconhecido: 'desconocido' },
    descoberta: { em: 'en {ano}', por: 'por {por}' },
    classes: {
      acido: 'ácido', acido_carboxilico: 'ácido carboxílico', base: 'base', sal: 'sal', oxido: 'óxido', hidroxido: 'hidróxido', peroxido: 'peróxido', oxidante: 'oxidante',
      inorganico: 'inorgánico', organico: 'orgánico', alcool: 'alcohol', fenol: 'fenol', aldeido: 'aldehído', cetona: 'cetona', eter: 'éter', ester: 'éster', amina: 'amina', amida: 'amida',
      alcano: 'alcano', alqueno: 'alqueno', alquino: 'alquino', hidrocarboneto: 'hidrocarburo', aromatico: 'aromático', heterociclico: 'heterocíclico', halogenado: 'compuesto halogenado',
      carboidrato: 'carbohidrato', aminoacido: 'aminoácido', lipidio: 'lípido', proteina: 'proteína', vitamina: 'vitamina', farmaco: 'fármaco', solvente: 'disolvente', polimero: 'polímero',
      gas: 'gas', metal: 'metal', nitrocomposto: 'compuesto nitro', nitrila: 'nitrilo', tiol: 'tiol', sulfonato: 'sulfonato', organometalico: 'organometálico', ionico: 'compuesto iónico',
      molecular: 'compuesto molecular', esteroide: 'esteroide', alcaloide: 'alcaloide', acido_forte: 'ácido fuerte', base_forte: 'base fuerte', organoclorado: 'organoclorado'
    },
    unidades: {
      kg: 'kilogramo', g: 'gramo', t: 'tonelada', lb: 'libra', oz: 'onza', 'µg': 'microgramo', m3: 'metro cúbico', L: 'litro', cm3: 'centímetro cúbico', dm3: 'decímetro cúbico',
      'µL': 'microlitro', gal: 'galón (EE. UU.)', m: 'metro', 'Å': 'ångström', in: 'pulgada', ft: 'pie', mi: 'milla', Pa: 'pascal', bar: 'bar', atm: 'atmósfera', mmHg: 'milímetro de mercurio',
      psi: 'libra-fuerza por pulgada cuadrada', J: 'julio', cal: 'caloría termoquímica', eV: 'electronvoltio', kWh: 'kilovatio-hora', K: 'kelvin', '°C': 'grado Celsius', '°F': 'grado Fahrenheit',
      s: 'segundo', min: 'minuto', h: 'hora', d: 'día', mol: 'mol', 'mol/L': 'mol por litro', 'mmol/L': 'milimol por litro', 'µmol/L': 'micromol por litro'
    }
  },

  respostas: {
    fontes: {
      app: 'SaibaTudo Química (esta app)',
      calculo: 'Cálculo local de la app, con datos del paquete firmado',
      pacote: 'Paquete de datos',
      frasesPadrao: 'Indicaciones de peligro: UNECE GHS / ECHA CLP',
      regras: 'regras.json (paquete de datos firmado)',
      politica: 'Política de seguridad de la app (reglas locales)',
      pubchemCid: 'PubChem CID {cid} (NCBI/NLM)',
      chebi: 'ChEBI ({id})', chebiSem: 'ChEBI (EMBL-EBI)',
      constanteR: 'Cálculo local con la constante R del paquete (CODATA)',
      tabelaUnidades: 'Tabla de unidades: {origem}',
      orientacaoGeral: 'Orientación general de la app (no son datos de una sustancia concreta)',
      massasAtomicas: 'Masas atómicas del paquete de datos (elementos.json)',
      constantes: 'Constantes del paquete de datos (constantes.json)',
      boyle: 'Cálculo local de la app, con la tabla de unidades del paquete de datos',
      wikipedia: 'Wikipedia en {idioma}',
      trechoEm: 'Texto en {idioma} (aún sin traducir).'
    },
    unidades: {
      origem: { pacote: 'regras.json (paquete de datos firmado)', padrao: 'la tabla estándar de la app (definiciones del SI)' },
      pKw: { regras: 'regras.json (paquete de datos)', constantes: 'constantes.json (paquete de datos)', convencao: 'convención a 25 °C (producto iónico del agua, pH + pOH = 14)' },
      constanteRDerivada: 'Constante universal de los gases (N_A × k_B)'
    },
    sugestoes: {
      padrao: [
        '¿Cuál es la masa molar del agua?', 'Balancear Fe + O2 -> Fe2O3', 'pH del HCl 0,01 mol/L', 'Estructura de la aspirina', 'Peligros del ácido sulfúrico', 'Convertir 5 atm a kPa',
        '¿Cuántos moles hay en 18 g de agua?', 'Punto de fusión del hierro', 'Elementos del grupo 17', '¿Qué es un mol?', '¿Por qué no mezclar lejía con amoníaco?'
      ],
      seguras: ['¿Qué EPP debo usar con ácido sulfúrico?', 'Primeros auxilios por salpicadura de sosa cáustica en el ojo', '¿Por qué no mezclar lejía con amoníaco?'],
      massaAgua: '¿Cuál es la masa molar del agua?', balancear: 'Balancear Fe + O2 -> Fe2O3', phHcl: 'pH del HCl 0,01 mol/L', perigosSulfurico: 'Peligros del ácido sulfúrico',
      converter: 'Convertir 5 atm a kPa', molsAgua: '¿Cuántos moles hay en 18 g de agua?', fusaoFerro: 'Punto de fusión del hierro', grupo17: 'Elementos del grupo 17', periodo3: 'Elementos del periodo 3',
      misturar: '¿Por qué no mezclar lejía con amoníaco?', fontes: '¿Cuáles son las fuentes?', origemDados: '¿De dónde vienen los datos?', massaMolarAgua: 'Masa molar del agua',
      formulaSulfurico: '¿Cuál es la fórmula del ácido sulfúrico?', compareNaCl: 'Comparar sodio y cloro', maisEletronegativo: 'Elemento más electronegativo',
      molaridade: 'Molaridad de 5,85 g de NaCl en 500 mL', volumeGas: '¿Cuál es el volumen de 2 moles de gas a 300 K y 1 atm?',
      fusaoDe: 'Punto de fusión: {nome}', configuracaoDe: 'Configuración electrónica: {nome}', massaMolarDe: 'Masa molar: {nome}', estruturaDe: 'Estructura: {nome}',
      perigosDe: 'Peligros: {nome}', densidadeDe: 'Densidad: {nome}'
    },
    orientacaoGeral: [
      'Lee la etiqueta y la hoja de datos de seguridad (HDS) del producto antes de usarlo y sigue las instrucciones del fabricante.',
      'Usa guantes y gafas de protección adecuados al producto y trabaja en un lugar ventilado.',
      'No mezcles productos químicos; guárdalos en su envase original, bien cerrado, lejos de niños, alimentos y fuentes de calor.',
      'Si hay contacto con la piel o los ojos, lava con abundante agua corriente; si lo has inhalado, sal al aire libre; no provoques el vómito sin indicación profesional.',
      'Ante cualquier intoxicación o accidente, busca atención médica o llama al centro de toxicología de tu región, llevando el envase del producto.'
    ],
    blocos: {
      palavraSinal: 'Palabra de advertencia: {x}', estrutura2d: 'Estructura 2D de {nome}', passoAPasso: 'Paso a paso', comoCalcular: 'Cómo calcular', comoConverter: 'Cómo convertir'
    },
    erro: { titulo: 'No pude construir esta respuesta', texto: 'Se produjo un problema al leer los datos ({msg}). Inténtalo de nuevo o usa las pantallas de la app.' },
    recusa: {
      tituloAutolesao: 'No estás solo ni sola', titulo: 'No puedo ayudarte con esta petición',
      padrao: 'No puedo ayudarte con eso. SaibaTudo Química no ofrece instrucciones para la síntesis, la purificación, el aumento de escala ni las recetas caseras de explosivos, armas químicas, drogas ilícitas, sus precursores u otros reactivos peligrosos, porque pueden causar muertes y lesiones graves.',
      alternativas: 'Sí puedo ayudarte en seguridad y conocimiento: peligros, equipo de protección personal (EPP), almacenamiento, eliminación y primeros auxilios de una sustancia; propiedades, fórmula, masa molar y estructura; cálculos y conceptos de química.',
      DANO_A_PESSOAS: 'No puedo ayudarte con eso. No doy orientación sobre cómo herir, envenenar o intoxicar a personas o animales. Si alguien está en peligro o ha estado expuesto a una sustancia, llama de inmediato a un servicio de emergencias o a tu centro regional de toxicología.',
      AUTOLESAO: 'Siento mucho que estés pasando por esto. No puedo orientarte sobre este tema, pero no estás solo ni sola: busca ahora mismo a alguien de confianza y a un servicio de emergencias de tu zona. En Brasil, el Centro de Valorização da Vida (CVV) atiende a cualquier persona, de forma gratuita y confidencial, en https://cvv.org.br; en otros lugares, busca la línea de ayuda en crisis de tu localidad.',
      categorias: {
        EXPLOSIVOS: 'explosivos', ARMAS_QUIMICAS: 'armas químicas', DROGAS: 'drogas ilícitas', PRECURSORES: 'precursores de drogas o de armas',
        REAGENTES_CASEIROS: 'recetas caseras con reactivos peligrosos', DANO_A_PESSOAS: 'daño a personas', AUTOLESAO: 'riesgo para la propia vida'
      }
    },
    ajuda: {
      titulo: 'Qué hace SaibaTudo Química',
      texto: 'Respondo preguntas de química con datos abiertos y cálculos hechos en tu dispositivo: nada sale de tu dispositivo.',
      podePerguntar: 'Puedes preguntar sobre',
      itens: [
        'elementos y la tabla periódica (propiedades, grupos, periodos)', 'compuestos (fórmula, masa molar, estructura 2D y peligros GHS)',
        'cálculos con pasos: masa molar, balanceo, estequiometría, concentración y dilución, pH, gas ideal y unidades',
        'seguridad: pictogramas, indicaciones de peligro y cómo evitar mezclas peligrosas', 'conceptos básicos, con extractos citados de fuentes abiertas'
      ],
      aviso: 'No ayudo con la síntesis, la purificación ni las recetas de explosivos, armas químicas, drogas ilícitas y otros reactivos peligrosos.',
      tabela: 'Tabla periódica', calculadoras: 'Calculadoras'
    },
    sobreDados: {
      titulo: 'Sobre los datos de esta app', versao: 'Versión del paquete de datos', geradoEm: 'Generado el', assinatura: 'Firma digital (ECDSA P-256)',
      sig: { verificada: 'verificada', invalida: 'NO verificada', indisponivel: 'no se pudo verificar en este navegador' },
      elementos: 'Elementos del paquete', compostos: 'Compuestos en el índice', fontesListadas: 'Fuentes enumeradas',
      texto: 'La lista completa de fuentes, licencias y fechas está en la pantalla “Sobre los datos”. Todo valor mostrado sale del paquete firmado o de un cálculo local.',
      acao: 'Ver todas las fuentes y licencias'
    },
    fontesResp: { titulo: 'Fuentes de los datos', usa: 'El paquete de datos usa', semLista: 'La lista de fuentes está en la pantalla “Sobre los datos”.', acao: 'Sobre los datos' },
    naoEntendi: {
      titulo: 'No entendí la pregunta', comPergunta: 'No entendí “{q}”. Prueba a nombrar un elemento, un compuesto, una fórmula o un cálculo, por ejemplo:', semPergunta: 'Escribe tu pregunta, por ejemplo:',
      tabela: 'Tabla periódica', compostos: 'Buscar compuestos', calculadoras: 'Calculadoras'
    },
    elemento: {
      nomeEmIngles: 'Nombre en inglés', titulo: '{nome} ({simbolo}), elemento {z}', ficha: 'Ficha completa de {nome}', verTabela: 'Ver en la tabla periódica'
    },
    composto: {
      nomePopular: 'Nombre común', nomeIupac: 'Nombre IUPAC', formula: 'Fórmula', massaMolar: 'Masa molar', cas: 'Número CAS', cid: 'CID de PubChem', classes: 'Clases',
      perigosGhs: 'Peligros (GHS)', definicaoIngles: 'Definición en inglés.', ficha: 'Ficha completa', icsc: 'Ficha ICSC en el sitio de la OIT', icscDe: 'Ficha ICSC de {nome} en el sitio de la OIT'
    },
    propriedade: {
      deQual: '¿De qué sustancia?',
      digaQualElemento: 'Dime de qué elemento o compuesto quieres saber {props}. Por ejemplo: “punto de fusión del hierro”.',
      digaQualPropriedade: 'Dime qué propiedad y de qué elemento o compuesto. Por ejemplo: “densidad del oro”.',
      de: '{prop}: {nome}',
      outroTipo: (p) => `${p.prop} (esta propiedad es de ${p.alvo === 'composto' ? 'compuestos' : 'elementos'}; ${p.outros} ${p.n > 1 ? 'son' : 'es'} de otro tipo)`,
      naoTem: 'El paquete de datos no tiene: {lista}.', fichaDe: 'Ficha de {nome}', propriedadesDe: 'Propiedades de {nomes}',
      oferece: 'Para {nome}, el paquete trae: {lista}.', solubilidadeDeQual: 'Dime de qué compuesto quieres la solubilidad en agua. Por ejemplo: "solubilidad de la urea".'
    },
    massaMolar: {
      tituloElemento: 'Masa molar: {nome} ({simbolo})', deAtomos: 'Masa molar de {nome} (átomos)',
      avisoMolecular: 'Para un elemento molecular, como O₂ o N₂, escribe la fórmula: la masa molar es la masa del átomo multiplicada por el número de átomos de la molécula.',
      abrirCalculadora: 'Abrir en la calculadora', deQue: '¿Masa molar de qué?',
      digite: 'Escribe la fórmula o el nombre de la sustancia. Por ejemplo: “masa molar del agua” o “masa molar de Ca(OH)2”.', calculadora: 'Calculadora de masa molar',
      naoConsegui: 'No pude calcular la masa molar', composicao: 'Composición en masa', referencia: 'Valor de referencia', pubchemInforma: 'PubChem indica',
      titulo: (p) => `Masa molar${p.nome ? `: ${p.nome}` : ''} (${p.formula})`
    },
    balancear: {
      titulo: 'Balanceo de ecuaciones',
      digite: 'Escribe la ecuación con los reactivos, una flecha y los productos. Por ejemplo: Fe + O2 -> Fe2O3. También funcionan los iones: Zn + Cu2+ -> Zn2+ + Cu.',
      abrir: 'Abrir la calculadora', naoConsegui: 'No pude balancearla', ajustar: 'Ajustar en la calculadora', balanceada: 'Ecuación balanceada',
      coeficientesIgnorados: 'Se ignoraron los coeficientes escritos: la app balancea toda la ecuación.', abrirNa: 'Abrir en la calculadora'
    },
    estequiometria: {
      abrir: 'Abrir la calculadora de estequiometría', faltam: 'Faltan las cantidades',
      digaCadaReagente: 'Indica la cantidad de cada reactivo con su nombre o fórmula, por ejemplo “4 g de H2 y 16 g de O2”.',
      informePeloMenos: 'Indica la cantidad de al menos un reactivo, por ejemplo “4 g de H2 y 16 g de O2”.', naoConsegui: 'No pude calcular',
      titulo: 'Estequiometría: {equacao}', particulas: 'partículas', tituloQuantidade: '{valor} {unidade} de {formula}', abrirNa: 'Abrir en la calculadora',
      volumeTitulo: 'Volumen de {valor} {unidade} de un gas ideal en CN', volumeCntp: 'Volumen en CN (0 °C y 1 atm)', volumeMolar: 'Volumen molar (RT/P)',
      passoVolume: 'Por la ecuación de los gases ideales, el volumen molar es Vm = RT/P, con T = 0 °C y P = 1 atm; multiplícalo por la cantidad de sustancia.',
      abrirGas: 'Abrir la calculadora de gas ideal', tituloGeral: 'Estequiometría',
      explicacao: 'Para convertir masa, moles, partículas y volumen, indica la cantidad y la sustancia, por ejemplo “¿cuántos moles hay en 18 g de agua?”. Para el reactivo limitante, escribe la ecuación y las cantidades.'
    },
    concentracao: {
      abrir: 'Abrir la calculadora', titulo: 'Concentración y dilución',
      diga: 'Indica los valores con sus unidades. Ejemplos: “molaridad de 5,85 g de NaCl en 500 mL”, “cuántos gramos de NaOH para 250 mL de disolución 0,1 mol/L” o “diluir 100 mL de disolución 2 mol/L hasta 0,5 mol/L”.',
      naoConsegui: 'No pude calcular', padrao: 'Concentración',
      modos: { molaridade: 'Molaridad de la disolución', massa: 'Masa de soluto necesaria', 'gl-mol': 'Conversión g/L ↔ mol/L', 'percentual-mm': 'Porcentaje en masa', 'percentual-mv': 'Porcentaje masa/volumen', diluicao: 'Dilución' }
    },
    ph: {
      abrir: 'Abrir la calculadora de pH', conversoes: 'Conversiones a partir de {de} = {valor}', titulo: 'pH de una disolución',
      informe: 'Indica la concentración en mol/L y la sustancia. Ejemplos: “pH del HCl 0,01 mol/L” o “pH del ácido acético 0,1 mol/L con Ka 1,8e-5”.',
      maisDados: 'Necesito más datos para el pH', naoTenho: 'No tengo “{formula}” en la lista de ácidos y bases fuertes del paquete. ',
      fracos: 'Para ácidos y bases débiles, indica Ka (o pKa) o Kb (o pKb); para los fuertes, escribe la fórmula, por ejemplo HCl o NaOH.',
      parcial: 'Solo la 1.ª ionización es fuerte; la 2.ª es parcial y se ignoró (aproximación).', naoConsegui: 'No pude calcular el pH',
      tituloResultado: (p) => `pH ${p.ph}${p.formula ? ` (${p.formula} ${p.conc} mol/L)` : ''}`
    },
    gas: {
      abrir: 'Abrir la calculadora de gas ideal', tituloEquacao: 'Gas ideal: PV = nRT', naEquacao: 'En la ecuación',
      variaveis: 'P es la presión, V es el volumen, n es la cantidad de sustancia (en moles) y T es la temperatura absoluta (en kelvin).',
      constante: 'R es la constante universal de los gases: {valor} J/(mol·K), valor del paquete de datos ({fonte}).', constanteSem: 'R es la constante universal de los gases.',
      informeTres: 'Indica tres de las cuatro magnitudes con sus unidades y calculo la cuarta, con los pasos.', tituloFalta: 'Gas ideal (PV = nRT)',
      informeTresEx: 'Indica tres de las cuatro magnitudes (presión, volumen, cantidad de sustancia y temperatura) con sus unidades. Ejemplo: “¿cuál es el volumen de 2 moles de gas a 300 K y 1 atm?”.',
      naoConsegui: 'No pude calcular'
    },
    conversao: {
      abrir: 'Abrir el conversor de unidades', titulo: 'Conversión de unidades', diga: 'Indica el valor, la unidad y la unidad de destino. Ejemplo: “convertir 5 atm a kPa”.',
      naoConsegui: 'No pude convertir', em: '{valor} {de} en {para}'
    },
    nomenclatura: {
      titulo: 'Nomenclatura', naoEncontreiFormula: 'No encontré “{formula}” entre los compuestos del paquete.', naoEncontrei: 'No encontré este compuesto.', tente: ' Prueba con el nombre común o la fórmula.',
      buscar: 'Buscar compuestos', nome: 'Nombre', nomePopular: 'Nombre común', nomeIupac: 'Nombre IUPAC', formula: 'Fórmula', formulaHill: 'Fórmula en notación de Hill',
      observacao: 'Nota', ptPendente: 'El nombre en portugués aún está pendiente; el nombre que se muestra es el nombre IUPAC.', ficha: 'Ficha completa'
    },
    desenhar: {
      estruturaDe: 'Estructura de {nome}', semSmiles: 'El paquete de datos no tiene el SMILES de este compuesto, así que no puedo dibujar la estructura.', ficha: 'Ficha completa',
      estrutura2d: 'Estructura 2D de {nome}', smiles: 'SMILES', formula: 'Fórmula'
    },
    comparar: {
      titulo: 'Comparación: {nomes}', propriedade: 'Propiedad', fichaDe: 'Ficha de {nome}',
      linhas: { formula: 'Fórmula', massaMolar: 'Masa molar', cas: 'Número CAS', nomeIupac: 'Nombre IUPAC', xlogp: 'XLogP', sinal: 'Palabra de advertencia (GHS)', pictogramas: 'Pictogramas (GHS)' },
      maior: '{prop}: mayor en {nome} ({valor}).', tituloGeral: 'Comparar', explicacao: 'Compara elementos o compuestos del mismo tipo: dos elementos (“compara sodio y cloro”) o dos compuestos (“diferencia entre etanol y ácido acético”).'
    },
    tabela: {
      abrir: 'Abrir la tabla periódica', naoTemProp: 'El paquete no tiene {prop} para los elementos cargados.',
      extremo: (p) => `${p.dir === 'max' ? 'Mayor' : 'Menor'} ${p.prop} en el paquete: ${p.nome} (${p.simbolo})`,
      entreOs: 'Entre los {n} elementos con este dato en el paquete', elemento: 'Elemento', simbolo: 'Símbolo', nome: 'Nombre', numero: 'N.º',
      grupo: 'grupo {g}', periodo: 'periodo {p}', bloco: 'bloque {b}', estado: 'estado {estado}', elementos: 'Elementos: {criterios}', titulo: 'Tabla periódica',
      pacoteTem: (p) => `El paquete tiene ${p.n} ${p.n === 1 ? 'elemento organizado' : 'elementos organizados'} por grupo, periodo y bloque, con colores por categoría. Toca un elemento para ver su ficha completa.`,
      nenhum: 'Ningún elemento del paquete cumple estos criterios.', destacar: 'Resaltar en la tabla periódica', comContagem: '{titulo} ({n})',
      tendencia: 'Tendencia: {prop}', tendenciaTexto: 'Valores del paquete de datos a lo largo de un periodo y de un grupo; compara las filas para ver la tendencia.',
      periodoLegenda: 'Periodo {p}, de izquierda a derecha (número atómico creciente)', grupoLegenda: 'Grupo {g}, de arriba abajo (periodo creciente)',
      colGrupo: 'Grupo', colPeriodo: 'Periodo', naoTemSuficiente: 'El paquete no tiene {prop} para suficientes elementos del mismo periodo o grupo.'
    },
    seguranca: {
      naoMisture: 'No mezcles {a} con {b}. {motivo}',
      naoMistureGeral: 'No mezcles {a} con {b}: mezclar productos químicos puede liberar calor, gases tóxicos o provocar otras reacciones peligrosas. Mira abajo los peligros de cada uno y nunca mezcles productos de limpieza.',
      semGhs: 'El paquete no tiene una clasificación de peligros GHS (armonizada) para {nome}. Eso no significa que sea inofensivo: consulta la hoja de datos de seguridad del producto.',
      perigosDe: 'Peligros de {nome} (GHS)',
      elementoSemGhs: 'El paquete solo tiene clasificaciones de peligros GHS para compuestos, no para el elemento {nome}. Los peligros dependen de la forma química (por ejemplo, el vapor del metal o una sal): consulta la hoja de datos de seguridad del producto.',
      orientacao: 'Orientación general de seguridad', naoIdentifiquei: 'No identifiqué la sustancia. Indica su nombre o fórmula para ver los peligros GHS, o sigue la orientación general de abajo.',
      comoLer: 'Cómo leer los pictogramas y las indicaciones H', titulo: 'Seguridad: {alvo}', tituloGeral: 'Seguridad química', eConector: ' y '
    },
    conceito: {
      semTexto: 'Aún no tengo un texto sobre eso',
      naoEncontrei: 'No encontré, entre los extractos con licencia del paquete de datos, una explicación de “{termo}”. Los datos de elementos y compuestos y las calculadoras siguen disponibles.',
      traducaoAutomatica: 'Traducción automática, aún no revisada por una persona.', emIngles: 'Texto en inglés (aún sin traducir).', padrao: 'Concepto'
    },
    calc: {
      formula: {
        vazia: 'Fórmula vacía', quantidadeInvalida: 'Cantidad no válida “{x}”', quantidadeGrande: 'Cantidad demasiado grande', fechaSemAbre: 'Paréntesis “)” sin su “(” correspondiente',
        abreSemFecha: 'Paréntesis “(” sin su “)” correspondiente', vazios: 'Paréntesis vacíos', naoSimbolo: '“{x}” no es un símbolo de elemento',
        minuscula: 'La letra minúscula “{c}” está fuera de lugar (los símbolos empiezan con mayúscula, como en “Na” y “Cl”)', inesperado: 'Carácter inesperado “{c}”', parteVazia: 'Parte vacía (revisa el “·” del hidrato)'
      },
      balancear: {
        digite: 'Escribe la ecuación, por ejemplo: Fe + O2 -> Fe2O3', semSeta: 'No encontré la flecha de la reacción. Escribe reactivos -> productos, por ejemplo: H2 + O2 -> H2O',
        duasSetas: 'La ecuación tiene más de una flecha. Escribe una reacción cada vez.', faltam: 'Faltan los {lado} de la ecuación', reagentes: 'reactivos', produtos: 'productos',
        substancia: 'Sustancia “{corpo}”: {msg}', grande: 'Ecuación demasiado grande (máximo de 40 sustancias).',
        soDeUmLado: (p) => `El elemento ${p.el} aparece solo ${p.lado === 'r' ? 'en los reactivos' : 'en los productos'}: revisa las fórmulas o añade la sustancia que falta.`,
        semCombinacao: 'No existe ninguna combinación de coeficientes que balancee esta ecuación. Revisa las fórmulas y las cargas.',
        varias: 'La ecuación combina más de una reacción independiente, así que hay varias formas de balancearla. Escribe una reacción cada vez.',
        coefZero: 'Alguna sustancia tendría coeficiente cero: no participa en la reacción tal como está escrita. Revisa la ecuación.',
        negativos: 'Los coeficientes no pueden ser todos positivos: la ecuación, tal como está escrita, no representa una reacción posible.', coefGrandes: 'Coeficientes demasiado grandes para esta ecuación.',
        passo1: 'Asigna a cada sustancia un coeficiente desconocido (letras) y escribe la ecuación con ellos.',
        passo2: (p) => `Para cada ${p.carga ? 'elemento (y para la carga eléctrica)' : 'elemento'}, el número de átomos debe ser igual en ambos lados:`, carga: 'carga',
        passo3: 'Resuelve el sistema (eliminación de Gauss con fracciones exactas), fijando una de las incógnitas en 1:',
        passo4: (p) => `${p.mmc ? `Multiplica todo por ${p.den} (el mínimo común múltiplo de los denominadores)` : 'Divide entre el máximo común divisor'} para obtener los números enteros más pequeños:`,
        passo4Ja: 'Los valores ya son los números enteros más pequeños:', balanceada: 'Ecuación balanceada:', conferencia: 'Comprobación (reactivos = productos): '
      },
      massa: {
        semMassa: 'El paquete de datos no tiene masa atómica para: {lista}.',
        passo1: (p) => `Cuenta los átomos de cada elemento en la fórmula${p.hidrato ? ' (sumando el agua de cristalización)' : ''}:`,
        passo2: 'Multiplica el número de átomos por la masa atómica de cada elemento (valores del paquete de datos, en g/mol):', passo3: 'Suma las contribuciones:',
        hidrato: 'Cada parte del hidrato contribuye así (g/mol):', eletrons: 'Se desprecia la masa de los electrones ganados o perdidos (es mucho menor que la incertidumbre de las masas atómicas).',
        massaMolarDe: 'Masa molar de {formula}', percentual: '{nome} ({simbolo}), % en masa'
      },
      concentracao: {
        modos: {
          molaridade: 'Molaridad (mol/L) a partir de la masa de soluto y el volumen', massa: 'Masa de soluto necesaria para una disolución', 'gl-mol': 'Convertir g/L ↔ mol/L',
          'percentual-mm': 'Porcentaje en masa (m/m)', 'percentual-mv': 'Porcentaje masa/volumen (g por 100 mL)', diluicao: 'Dilución (C₁V₁ = C₂V₂)'
        },
        informe: 'Indica {x}.', unidadeMassa: 'Unidad de masa desconocida: “{u}”.', unidadeVolume: 'Unidad de volumen desconocida: “{u}”.',
        maiorQueZero: '{x} debe ser mayor que cero.', massaSoluto: 'la masa de soluto', volumeSolucao: 'el volumen de disolución', aMassa: 'La masa', oVolume: 'El volumen',
        aMassaSoluto: 'La masa de soluto', aMassaSolucao: 'La masa de disolución', massaSolucao: 'la masa de disolución', aConcentracao: 'La concentración',
        concQuantidade: 'Concentración de cantidad de sustancia', quantidadeSoluto: 'Cantidad de sustancia de soluto', concMassa: 'Concentración másica',
        passoMassaMolar: 'Masa molar del soluto ({formula}):', passoN: 'Cantidad de sustancia de soluto (n = m ÷ M):', passoC: 'Molaridad (C = n ÷ V, con V en litros):',
        informeDesejada: 'Indica la concentración deseada.', unidadeConc: 'Unidad de concentración desconocida: “{u}”. Usa mol/L, mmol/L o g/L.',
        passoConcMolL: 'Concentración en mol/L:', passoNNecessaria: 'Cantidad de sustancia necesaria (n = C × V):', passoMassaSoluto: 'Masa de soluto (m = n × M):',
        massaDe: 'Masa de {formula}', quantidade: 'Cantidad de sustancia',
        notaDissolva: 'Disuelve el soluto en suficiente disolvente y enrasa hasta el volumen final de la disolución (el volumen es el de la disolución, no el del disolvente).',
        informeConc: 'Indica la concentración.', passoMassaMolarCurto: 'Masa molar ({formula}):', divida: 'Divide la concentración másica entre la masa molar:', multiplique: 'Multiplica la molaridad por la masa molar:',
        solutoMaior: 'La masa de soluto no puede ser mayor que la de la disolución.', percentualMM: 'Porcentaje en masa (m/m)', titulo: 'Fracción másica',
        passoPercentual: 'Divide la masa de soluto entre la masa de disolución y multiplica por 100:', percentualMV: 'Porcentaje masa/volumen', passoMV: 'Masa de soluto (g) por cada 100 mL de disolución:',
        umEmBranco: 'Deja exactamente uno de los cuatro campos en blanco: ese es el que se calcula.', maioresQueZero: 'Los valores indicados deben ser mayores que cero.',
        isoleC1: 'Despeja la concentración inicial:', isoleV1: 'Despeja el volumen de disolución concentrada que hay que medir:', isoleC2: 'Despeja la concentración final:', isoleV2: 'Despeja el volumen final:',
        rotulos: { C1: 'Concentración inicial (C₁)', V1: 'Volumen inicial (V₁)', C2: 'Concentración final (C₂)', V2: 'Volumen final (V₂)' },
        notaDiluicao: 'En una dilución la cantidad de soluto no cambia: C₁V₁ = C₂V₂. Usa la misma unidad de concentración y la misma unidad de volumen en ambos lados.',
        solventeAcrescentar: 'Volumen de disolvente que hay que añadir (V₂ − V₁)', atencaoConcentracao: 'Atención: el volumen final es menor que el inicial; eso es una concentración, no una dilución.',
        conserva: 'En una dilución se conserva la cantidad de soluto:', escolha: 'Elige el tipo de cálculo.', solucaoTex: 'disolución'
      },
      estequiometria: {
        semMassa: 'El paquete de datos no tiene masa atómica para: {lista}.',
        massaParaMol: (p) => `Masa → mol${p.rotulo ? ` de ${p.rotulo}` : ''}: divide la masa (en g) entre la masa molar (${p.M} g/mol).`,
        semVolumeMolar: 'Faltan R o las condiciones normales en el paquete de datos para calcular el volumen molar en CN.',
        volumeParaMol: 'Volumen (gas ideal, CN: 0 °C y 1 atm) → mol: divide entre el volumen molar Vm = RT/P = {vm} L/mol.',
        semAvogadro: 'La constante de Avogadro no está en el paquete de datos (constantes.json).', particulasParaMol: 'Partículas → mol: divide entre el número de Avogadro.',
        unidadeNaoReconhecida: 'Unidad no reconocida: “{u}”. Usa g, mg, kg, mol, mmol, L, mL o partículas.',
        quantidadeInvalida: 'Indica una cantidad válida (un número mayor o igual que cero).', massaMolarDe: 'Masa molar de {formula} (suma de las masas atómicas del paquete de datos):',
        molParaMassa: 'mol → masa: multiplica por la masa molar.', molParaParticulas: 'mol → partículas: multiplica por el número de Avogadro.',
        molParaVolume: 'mol → volumen en CN (0 °C y 1 atm, gas ideal): multiplica por el volumen molar {vm} L/mol.',
        quantidade: 'Cantidad de sustancia', massa: 'Masa', particulas: 'Número de partículas', volumeCntp: 'Volumen en CN (si es un gas ideal)',
        notaVolume: 'El volumen solo vale para gases ideales en las CN adoptadas (0 °C y 1 atm); los sólidos y los líquidos no siguen esta conversión.',
        semirreacoes: 'Las reacciones con electrones (semirreacciones) no tienen masa: usa ecuaciones completas.', informePeloMenos: 'Indica la cantidad de al menos una sustancia.',
        rendimento: 'El rendimiento debe estar entre 0 y 100 %.', passoEquacao: 'Ecuación balanceada (los coeficientes dan la relación molar):',
        naoAparece: 'La sustancia “{x}” no aparece en la ecuación.', quantidadesValidas: 'Indica cantidades válidas (números mayores o iguales que cero).',
        umaVez: 'Cada sustancia debe indicarse una sola vez.',
        soReagentes: 'Con más de una cantidad, indica solo reactivos (el reactivo limitante se elige entre ellos). Para partir de un producto, indica solo ese.',
        passoRazoes: 'Divide la cantidad de sustancia de cada reactivo entre su coeficiente: el menor cociente indica el reactivo limitante.',
        limitante: 'Reactivo limitante: {formula}.', umaQuantidade: 'Solo se indicó una cantidad ({formula}): el avance de la reacción es n ÷ coeficiente.',
        passoCoeficientes: (p) => `Usa los coeficientes como relación molar: n = coeficiente × ξ${p.rend != null ? ` × rendimiento (${p.rend} %)` : ''}.`,
        passoMassa: 'Convierte a masa (m = n × M):', sobra: 'Lo que queda de los reactivos en exceso (inicial − consumido):',
        reagenteLimitante: 'Reactivo limitante', formado: 'Cantidad formada de {formula}', emExcesso: 'Cantidad en exceso de {formula} (restante)', necessario: 'Cantidad necesaria de {formula}',
        coeficientesIgnorados: 'Se ignoraron los coeficientes escritos: la app balancea la ecuación.',
        produtoComRendimento: (p) => `La cantidad deseada de ${p.formula} es la que se obtiene con un rendimiento del ${p.rend} %: divide entre el rendimiento para hallar el avance que debe alcanzar la reacción (ξ = n ÷ coeficiente ÷ rendimiento); la cantidad de producto indicada no cambia.`,
        passoNecessarios: 'Reactivos necesarios (n = coeficiente × ξ):',
        notaCntp: 'CN (0 °C, 1 atm): {vm} L/mol, el volumen molar usado aquí.', notaIupac: 'En la condición estándar actual de la IUPAC (0 °C, 1 bar), el volumen molar es {vmIupac} L/mol.',
        notaTabela: 'El volumen y las partículas de los productos aparecen en la tabla; el volumen solo vale para gases ideales en CN (0 °C y 1 atm).'
      },
      gas: {
        semR: 'La constante de los gases (R) no está en el paquete de datos (constantes.json).', escolha: 'Elige la magnitud que quieres calcular: P, V, n o T.',
        rotulos: { P: 'Presión', V: 'Volumen', n: 'Cantidad de sustancia', T: 'Temperatura' }, informe: 'Indica {x}.', unidadeDesconhecida: 'Unidad de {x} desconocida: “{u}”.',
        unidadeQuantidade: 'Unidad de cantidad de sustancia desconocida: “{u}”.', semMassaAtomica: 'No hay masa atómica en el paquete para: {lista}.',
        passoMassa: 'Calcula la cantidad de sustancia a partir de la masa ({formula}, M = {M} g/mol):', informeN: 'Indica la cantidad de sustancia (mol) o la masa y la fórmula del gas.',
        temperaturaPositiva: 'La temperatura absoluta debe ser mayor que 0 K.', maiorQueZero: '{x} debe ser mayor que cero.',
        passoEquacao: 'Ecuación de los gases ideales, con R = {R} J/(mol·K) ({nome}). Usa siempre unidades del SI: Pa, m³, mol, K.', passoSI: 'Convierte al SI:',
        isoleP: 'Despeja la presión:', isoleV: 'Despeja el volumen:', isoleN: 'Despeja la cantidad de sustancia:', isoleT: 'Despeja la temperatura:', naoCalculou: 'No fue posible calcular con estos valores.',
        unidadeSaida: 'Unidad de salida desconocida: “{u}”.', converta: 'Convierte el resultado a {u}:', notaModelo: 'Modelo de gas ideal: funciona mejor a presiones bajas y temperaturas altas.',
        boyleUmEmBranco: 'Deja exactamente uno de los cuatro valores en blanco: ese es el que se calcula.', boyleUnidade: 'Unidad desconocida: “{u}”.',
        boylePositivos: 'Las presiones y los volúmenes deben ser mayores que cero.', boyleLei: 'Ley de Boyle: a temperatura constante y con la misma cantidad de gas, el producto presión × volumen no cambia.',
        boyleIsole: (p) => `Despeja ${p.grandeza === 'P' ? 'la' : 'el'} ${p.nome} ${p.n === '1' ? 'inicial' : 'final'} (todos los valores en la misma unidad de cada magnitud):`,
        boyleNomes: { P: 'presión', V: 'volumen' }, boyleRotulo: (p) => `${p.nome[0].toUpperCase()}${p.nome.slice(1)} ${p.n === '1' ? 'inicial' : 'final'} (${p.alvo})`,
        boyleNota: 'Válido para un gas ideal con la misma cantidad de sustancia y la misma temperatura en ambos estados.'
      },
      ph: {
        nota25C: 'pKw = {pKw} y pH neutro = {neutro} valen a 25 °C; a otras temperaturas ambos cambian (el agua pura sigue siendo neutra).',
        saturada: 'Atención: {formula} es poco soluble en agua{temp}: se disuelven como máximo unos {s} mol/L{kps}{fonte}. La concentración indicada lo supera: la disolución queda saturada (sobra sólido) y el pH real no pasa de aproximadamente {phMax}.',
        saturadaTemp: ' (a {temp} °C)', saturadaKps: ' (calculado a partir del Kps)', saturadaFonte: ', según {fonte}',
        tipos: { 'acido-forte': 'Ácido fuerte', 'base-forte': 'Base fuerte', 'acido-fraco': 'Ácido débil (con Ka)', 'base-fraca': 'Base débil (con Kb)', converter: 'Convertir pH, pOH, [H⁺], [OH⁻]' },
        classes: { neutra: 'neutra', acida: 'ácida', basica: 'básica' }, solucao: 'Disolución', pKw: 'Producto iónico del agua: pKw = {valor} ({origem}).',
        umValor: 'Indica exactamente un valor: pH, pOH, [H⁺] o [OH⁻].', concPositiva: 'La concentración debe ser mayor que cero.', phInformado: 'Se indicó el pH.',
        phDePoh: 'pH = pKw − pOH:', phDeH: 'pH = −log₁₀[H⁺]:', pohDeOh: 'pOH = −log₁₀[OH⁻] y pH = pKw − pOH:', relacoes: 'Relaciones usadas:',
        informeConc: 'Indica la concentración (mayor que cero) en mol/L.',
        forte: (p) => `${p.acido ? 'Ácido' : 'Base'} fuerte: ionización (disociación) completa. Cada unidad de fórmula libera ${p.n} ${p.acido ? 'H⁺' : 'OH⁻'}.`,
        diluida: 'Como la disolución está muy diluida, no se puede ignorar la autoionización del agua; resuelve [ion]² − c[ion] − Kw = 0:', notaDiluida: 'Disolución muy diluida: el cálculo incluyó el agua.',
        notaEscolar: 'Modelo escolar: se supone la ionización completa de los n hidrógenos ionizables (en la práctica, la segunda ionización de varios ácidos es parcial).',
        informeK: (p) => `Indica ${p.acido ? 'Ka (o pKa) del ácido' : 'Kb (o pKb) de la base'} débil.`,
        fraco: (p) => `${p.acido ? 'Ácido débil monoprótico' : 'Base débil monoácida'}: equilibrio ${p.acido ? 'HA ⇌ H⁺ + A⁻' : 'B + H₂O ⇌ BH⁺ + OH⁻'}. Con x = [${p.acido ? 'H⁺' : 'OH⁻'}] en el equilibrio:`,
        segundoGrau: 'Resuelve la ecuación de segundo grado x² + K·x − K·C = 0 (sin aproximaciones):', portanto: 'Por tanto, [{ion}] = x.',
        grau: (p) => `Grado de ${p.acido ? 'ionización' : 'ionización de la base'} (α = x ÷ C):`, notaPequeno: '[ion] resultó muy pequeño: la autoionización del agua puede influir y este modelo la ignora.',
        grauIonizacao: 'Grado de ionización', escolha: 'Elige el tipo de disolución.'
      },
      unidades: {
        informeNumero: 'Indica un número para convertir.', naoConheco: 'No conozco la unidad “{u}”.',
        grandezasDiferentes: '“{de}” ({gde}) y “{para}” ({gpara}) son magnitudes distintas: una no se puede convertir en la otra.',
        passoBase: 'Convierte a la unidad base de la magnitud ({base}): valor × factor + desfase.', passoDaBase: 'Convierte de la unidad base a {para}: (valor − desfase) ÷ factor.',
        passoEquivale: '1 {a} equivale a {fa} {base} y 1 {b} equivale a {fb} {base}.', passoFator: 'Multiplica por el factor de conversión (relación entre las unidades):',
        desconhecida: 'Unidad desconocida: {u}'
      }
    }
  }
};
