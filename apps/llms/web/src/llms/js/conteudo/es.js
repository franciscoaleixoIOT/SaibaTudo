// Lecciones en español (traducción del pt-BR, la referencia). Contenido original de SaibaTudo (MIT). Revisión por hablante nativo pendiente.
export default {
  revisao: 'pendente',
  secoes: [
    {
      id: 'modelo',
      titulo: 'Qué hace un modelo de lenguaje',
      resumo: 'Un modelo de lenguaje recibe un texto y devuelve, para cada continuación posible, una probabilidad. Todo lo demás nace de ahí.',
      paragrafos: [
        'Un **modelo de lenguaje** es un programa entrenado para una sola tarea: dado un trozo de texto, estimar cuál es el siguiente trozo. No devuelve una palabra, sino una lista de candidatas, cada una con una probabilidad. "El gato subió al" va seguido de "tejado" con probabilidad alta, de "muro" con una menor y de "océano" con casi ninguna.',
        'Para escribir un texto entero, el modelo repite ese paso: elige una continuación, la pega al texto y estima la siguiente. Un asistente de conversación es ese mismo proceso aplicado a un texto que empieza con los mensajes de la conversación; la respuesta es la continuación más probable de ese diálogo, trozo a trozo.',
        'Elegir siempre la candidata más probable produce textos repetitivos; sortear entre las candidatas respetando las probabilidades produce textos más variados. Por eso la misma pregunta puede recibir respuestas distintas: en cada paso hay un sorteo.',
        'Un modelo grande aprende ese hábito leyendo miles de millones de palabras. No consulta una base de hechos: lo que "sabe" está repartido en números ajustados durante el entrenamiento. Por eso puede equivocarse con seguridad, y por eso las apps SaibaTudo etiquetan lo que viene de un modelo y nunca toman de él un número crítico.',
        'Esta app abre las piezas de ese mecanismo una a una: cómo el texto se convierte en trozos (tokens), cómo cada trozo se convierte en un vector (embedding), cómo los vectores conversan entre sí (atención), cómo se transforman (capas) y cómo la lista final de números se convierte en probabilidades (softmax).'
      ],
      experimente: [
        { texto: 'Empieza por la pieza que se puede ver: carga el ejemplo "Realeza y género" y gira el gráfico.', acao: { tipo: 'preset', id: 'realeza' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'tokens',
      titulo: 'Tokens: el texto en trozos',
      resumo: 'El modelo no lee letras ni palabras enteras: lee tokens, trozos de texto de un vocabulario fijo, cada uno con un número.',
      paragrafos: [
        'Antes de cualquier cálculo, el texto se corta en **tokens**. Un token puede ser una palabra común entera ("casa"), un trozo de palabra ("ción") o un signo de puntuación. El conjunto de todos los tokens posibles es el **vocabulario** del modelo, con decenas o cientos de miles de entradas, y cada entrada tiene un número de identificación.',
        'La división se aprende a partir de la frecuencia: las secuencias de letras que aparecen mucho se convierten en un solo token; las raras se montan con varios. En inglés, muchas palabras caben en un único token. En español, las palabras largas suelen convertirse en dos o tres. En chino, un carácter puede ser un token o parte de uno, según la frecuencia.',
        'Esto explica algunos comportamientos curiosos: un modelo "ve" el número 1234 como uno o dos trozos, no como cuatro dígitos, y puede atascarse al contar las letras de una palabra que para él es un bloque único.',
        'Lo que importa para la siguiente sección: después del corte, el modelo ya no trabaja con texto. Trabaja con la lista de números de los tokens, y el primer paso es cambiar cada número por un vector.'
      ],
      experimente: [
        { texto: 'Mira qué pasa con cada token en la sección siguiente: los vectores de palabras.', acao: { tipo: 'irPara', rota: '/llms/aprenda/embeddings' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'embeddings',
      titulo: 'Embeddings: palabras como vectores',
      resumo: 'Cada token se convierte en una lista de números, un vector. Las direcciones de ese espacio llevan significado: rey − hombre + mujer cae cerca de reina.',
      paragrafos: [
        'Un **embedding** es un vector: una lista de números que representa un token. Los vectores de GloVe usados en esta app tienen 50 números cada uno; los de un modelo de lenguaje grande tienen miles. Nadie elige los valores: nacen del entrenamiento, ajustados para que las palabras usadas en contextos parecidos queden con vectores parecidos.',
        '¿Cómo medir "parecido"? Por el **coseno** del ángulo entre dos vectores: 1 cuando apuntan en la misma dirección, 0 cuando son perpendiculares, −1 cuando son opuestos. El **producto escalar** es la misma idea sin normalizar: positivo cuando los vectores coinciden, negativo cuando discrepan. Los vecinos más cercanos de "tower" son palabras de edificios y construcciones porque aparecen en los mismos contextos.',
        'Lo más sorprendente es que las **direcciones** tienen significado. La diferencia entre los vectores de king y queen se parece a la diferencia entre man y woman: existe una dirección que lleva el género. Por eso funciona la aritmética: king − man + woman produce un vector cuyo vecino más cercano es queen. Lo mismo vale para país y capital, singular y plural, y para las asociaciones que contiene el corpus, buenas o malas.',
        'Con 50 dimensiones no se puede dibujar. El gráfico de esta app elige **3 ejes**. En el modo "3 dimensiones", los ejes son tres de las 50 coordenadas originales, las que más varían entre las palabras elegidas: lo que ves son números reales del vector. En el modo PCA, los ejes son combinaciones de las 50 dimensiones que conservan el máximo de variación; las distancias son más fieles, pero los ejes dejan de ser coordenadas simples.',
        'Dos advertencias. Primera, GloVe está entrenado con textos en inglés (Wikipedia y noticias): las palabras son inglesas y las asociaciones son las de esos textos, sesgos incluidos. Segunda, en los modelos de lenguaje actuales el embedding es solo el punto de partida: las capas siguientes cambian cada vector según el contexto.'
      ],
      experimente: [
        { texto: 'Calcula king − man + woman y mira quién aparece como vecino del resultado.', acao: { tipo: 'analogia', a: 'king', b: 'man', c: 'woman' } },
        { texto: 'Mide la dirección del plural (cats − cat) contra dog, dogs, house y houses.', acao: { tipo: 'direcao', w1: 'cats', w2: 'cat', lista: ['dog', 'dogs', 'house', 'houses'] } },
        { texto: 'Carga "Países y capitales" y alterna entre 3 dimensiones y PCA.', acao: { tipo: 'preset', id: 'capitais' } }
      ],
      referencias: ['glove2014', 'word2vec2013']
    },
    {
      id: 'atencao',
      titulo: 'Atención: vectores que conversan',
      resumo: 'El vector de una palabra empieza igual en cualquier frase. La atención deja que cada vector absorba información de los demás, para que "banco" sepa si es un asiento o una entidad financiera.',
      paragrafos: [
        'El embedding de "banco" es el mismo en "me senté en el banco" y en "fui al banco a sacar dinero". Para que el modelo entienda la frase, cada vector tiene que **actualizarse con el contexto**. Eso es lo que hace el mecanismo de **atención**: cada token mira a los demás tokens de la secuencia y decide de cuáles debe recibir información, y en qué medida.',
        'En términos simples, cada token hace una pregunta (una consulta) y ofrece una respuesta (una clave y un valor). Cuando la consulta de un token coincide con la clave de otro, parte del valor de ese otro se suma al vector del primero. "banco" coincide con "senté" y atrae el sentido de asiento; coincide con "dinero" y atrae el sentido financiero.',
        'Esto ocurre en paralelo para todos los tokens y en varias **cabezas de atención**, cada una libre para aprender un tipo de relación: concordancia, referencia de pronombres, cercanía. El resultado es un conjunto de vectores que ya no representan palabras aisladas, sino palabras en esa frase.',
        'La atención es la pieza que dio nombre a la arquitectura **transformer**, presentada en 2017: cambiar la lectura secuencial por un mecanismo en el que cualquier token puede conectarse con cualquier otro, lo que hace el entrenamiento paralelizable y los contextos largos tratables.'
      ],
      experimente: [
        { texto: 'Mira cómo las palabras de familia se agrupan antes de cualquier contexto: de ahí parte la atención.', acao: { tipo: 'preset', id: 'familia' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'camadas',
      titulo: 'Capas, parámetros y entrenamiento',
      resumo: 'Entre una atención y otra, cada vector pasa por una pequeña red neuronal. Decenas de esas capas, con miles de millones de números ajustables, forman el modelo.',
      paragrafos: [
        'Después de la atención viene una etapa en la que cada vector se procesa solo, sin mirar a los demás: un **perceptrón multicapa** (MLP), dos multiplicaciones por matrices con una función no lineal en medio. En esa etapa parece guardarse buena parte del conocimiento factual; la atención mueve información, el MLP la transforma.',
        'Un transformer apila decenas de bloques iguales, cada uno con una atención y un MLP. El vector de cada token entra en el primer bloque como embedding y sale del último cargado de contexto. El último vector de la secuencia es el que se usará para predecir el siguiente token.',
        'Todo lo que el modelo sabe está en sus **parámetros**: los números de las matrices. Un modelo pequeño tiene cientos de millones; los grandes, cientos de miles de millones. Entrenar es ajustar esos números, poco a poco, para que la predicción del siguiente token en textos reales sea cada vez mejor. Nadie escribe reglas: el comportamiento emerge del ajuste.',
        'Por eso un modelo no se puede corregir editando una línea. Para cambiar lo que dice hay que entrenar más (ajuste fino) o dar la información en el texto de entrada. En las apps SaibaTudo, los datos oficiales van en el texto de entrada y un verificador comprueba la salida: el modelo explica, los datos responden.'
      ],
      experimente: [
        { texto: 'Carga "Colores" y observa cómo se forma un grupo compacto solo con los embeddings, antes de cualquier capa.', acao: { tipo: 'preset', id: 'cores' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'softmax',
      titulo: 'Softmax y temperatura',
      resumo: 'Al final, el modelo tiene un número por cada token del vocabulario. La softmax convierte esos números en probabilidades; la temperatura controla cuánto arriesga el sorteo.',
      paragrafos: [
        'El último vector de la secuencia se multiplica por una matriz final y se convierte en una lista con un número por token del vocabulario: los **logits**. Números mayores significan continuaciones más plausibles, pero todavía no son probabilidades: pueden ser negativos y no suman 1.',
        'La función **softmax** resuelve eso. Para cada logit z_i calcula e^(z_i) y divide por la suma de todos: p_i = e^(z_i) / Σ_j e^(z_j). El resultado es una lista de probabilidades, todas positivas, que suman 1, en la que diferencias grandes entre logits se convierten en diferencias enormes entre probabilidades.',
        'La **temperatura** T entra dividiendo los logits antes de la softmax: p_i = e^(z_i / T) / Σ_j e^(z_j / T). Con T cerca de 0, la mayor probabilidad se traga a las demás y el modelo casi siempre elige la misma continuación. Con T = 1, las probabilidades son las del entrenamiento. Con T alta, la distribución se aplana y continuaciones improbables empiezan a sortearse: textos más creativos y más equivocados.',
        'Tras el sorteo, el token elegido se pega al texto y el ciclo vuelve a empezar: tokens, embeddings, atención, capas, softmax. Cada palabra que escribe un asistente ha recorrido ese camino entero.'
      ],
      experimente: [
        { texto: 'Carga "Números": los vectores de palabras cercanas en significado quedan cerca, la misma regularidad que la softmax aprovecha al final.', acao: { tipo: 'preset', id: 'numeros' } }
      ],
      referencias: ['transformer2017']
    }
  ]
};
