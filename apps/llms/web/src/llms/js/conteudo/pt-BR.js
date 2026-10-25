// Seções didáticas em pt-BR (REFERÊNCIA; os outros idiomas são traduções). Autoria própria do projeto SaibaTudo (MIT): nada de trechos ou
// figuras de terceiros. Marcação mínima: **negrito**. Cada "Experimente" é uma ação no explorador.
export default {
  revisao: 'humana',
  secoes: [
    {
      id: 'modelo',
      titulo: 'O que um modelo de linguagem faz',
      resumo: 'Um modelo de linguagem recebe um texto e devolve, para cada possível continuação, uma probabilidade. Tudo o mais nasce disso.',
      paragrafos: [
        'Um **modelo de linguagem** é um programa treinado para uma única tarefa: dado um pedaço de texto, estimar qual é o próximo pedaço. Ele não devolve uma palavra, e sim uma lista de candidatas, cada uma com uma probabilidade. "O gato subiu no" é seguido por "telhado" com probabilidade alta, por "muro" com probabilidade menor e por "oceano" com probabilidade quase nula.',
        'Para escrever um texto inteiro, o modelo repete esse passo: escolhe uma continuação, cola no texto e estima a próxima. Um assistente de conversa é esse mesmo processo aplicado a um texto que começa com as mensagens da conversa; a resposta é a continuação mais provável desse diálogo, pedaço por pedaço.',
        'Escolher sempre a candidata mais provável produz textos repetitivos; sortear entre as candidatas, respeitando as probabilidades, produz textos mais variados. É por isso que a mesma pergunta pode receber respostas diferentes: a cada passo há um sorteio.',
        'Um modelo grande aprende esse hábito lendo bilhões de palavras. Ele não consulta uma base de fatos: o que "sabe" está espalhado em números ajustados durante o treino. Por isso pode errar com confiança, e por isso os apps SaibaTudo rotulam o que vem de modelo e nunca tiram dele um número crítico.',
        'Este app abre as peças desse mecanismo uma a uma: como o texto vira pedaços (tokens), como cada pedaço vira um vetor (embedding), como os vetores conversam entre si (atenção), como são transformados (camadas) e como a lista final de números vira probabilidades (softmax).'
      ],
      experimente: [
        { texto: 'Comece pela peça que dá para ver: carregue o exemplo "Realeza e gênero" e gire o gráfico.', acao: { tipo: 'preset', id: 'realeza' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'tokens',
      titulo: 'Tokens: o texto em pedaços',
      resumo: 'O modelo não lê letras nem palavras inteiras: lê tokens, pedaços de texto de um vocabulário fixo, cada um com um número.',
      paragrafos: [
        'Antes de qualquer cálculo, o texto é cortado em **tokens**. Um token pode ser uma palavra comum inteira ("casa"), um pedaço de palavra ("ção") ou um sinal de pontuação. O conjunto de todos os tokens possíveis é o **vocabulário** do modelo, com dezenas ou centenas de milhares de entradas, e cada entrada tem um número de identificação.',
        'A divisão é aprendida a partir da frequência: sequências de letras que aparecem muito viram um token só; as raras são montadas com vários. Em inglês, muitas palavras cabem num único token. Em português, palavras longas costumam virar dois ou três. Em chinês, um caractere pode ser um token ou parte de um, dependendo da frequência.',
        'Isso explica alguns comportamentos curiosos: um modelo "vê" o número 1234 como um ou dois pedaços, não como quatro dígitos, e pode se atrapalhar ao contar letras de uma palavra que para ele é um bloco único.',
        'O que importa para a próxima seção: depois do corte, o modelo não trabalha mais com texto. Trabalha com a lista de números dos tokens, e o primeiro passo é trocar cada número por um vetor.'
      ],
      experimente: [
        { texto: 'Veja o que acontece com cada token na seção seguinte: os vetores de palavras.', acao: { tipo: 'irPara', rota: '/llms/aprenda/embeddings' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'embeddings',
      titulo: 'Embeddings: palavras como vetores',
      resumo: 'Cada token vira uma lista de números, um vetor. Direções nesse espaço carregam significado: rei − homem + mulher cai perto de rainha.',
      paragrafos: [
        'Um **embedding** é um vetor: uma lista de números que representa um token. Os vetores do GloVe usados neste app têm 50 números cada; os de um modelo de linguagem grande têm milhares. Os valores não são escolhidos por ninguém: nascem do treino, ajustados para que palavras usadas em contextos parecidos fiquem com vetores parecidos.',
        'Como medir "parecido"? Pelo **cosseno** do ângulo entre dois vetores: 1 quando apontam na mesma direção, 0 quando são perpendiculares, −1 quando opostos. O **produto escalar** é a mesma ideia sem normalizar: positivo quando os vetores concordam, negativo quando discordam. Os vizinhos mais próximos de "tower" são palavras de prédios e construções porque aparecem nos mesmos contextos.',
        'O mais surpreendente é que **direções** têm significado. A diferença entre os vetores de king e queen é parecida com a diferença entre man e woman: existe uma direção que carrega gênero. Por isso a aritmética funciona: king − man + woman produz um vetor cujo vizinho mais próximo é queen. O mesmo vale para país e capital, singular e plural, e para associações que o corpus contém, boas ou más.',
        'Com 50 dimensões não dá para desenhar. O gráfico deste app escolhe **3 eixos**. No modo "3 dimensões", os eixos são três das 50 coordenadas originais, as que mais variam entre as palavras escolhidas: o que você vê são números reais do vetor. No modo PCA, os eixos são combinações das 50 dimensões que preservam o máximo de variação; as distâncias ficam mais fiéis, mas os eixos deixam de ser coordenadas simples.',
        'Dois cuidados. Primeiro, o GloVe é treinado em textos em inglês (Wikipédia e notícias): as palavras são inglesas e as associações são as desses textos, inclusive vieses. Segundo, nos modelos de linguagem atuais o embedding é só o ponto de partida: as camadas seguintes mudam cada vetor de acordo com o contexto.'
      ],
      experimente: [
        { texto: 'Calcule king − man + woman e veja quem aparece como vizinho do resultado.', acao: { tipo: 'analogia', a: 'king', b: 'man', c: 'woman' } },
        { texto: 'Meça a direção do plural (cats − cat) contra dog, dogs, house e houses.', acao: { tipo: 'direcao', w1: 'cats', w2: 'cat', lista: ['dog', 'dogs', 'house', 'houses'] } },
        { texto: 'Carregue "Países e capitais" e alterne entre 3 dimensões e PCA.', acao: { tipo: 'preset', id: 'capitais' } }
      ],
      referencias: ['glove2014', 'word2vec2013']
    },
    {
      id: 'atencao',
      titulo: 'Atenção: vetores que conversam',
      resumo: 'O vetor de uma palavra começa igual em qualquer frase. A atenção deixa cada vetor absorver informação dos outros, para que "manga" saiba se é fruta ou camisa.',
      paragrafos: [
        'O embedding de "manga" é o mesmo em "comi uma manga" e em "a manga da camisa rasgou". Para o modelo entender a frase, cada vetor precisa ser **atualizado pelo contexto**. É isso que o mecanismo de **atenção** faz: cada token olha para os outros tokens da sequência e decide de quais deve receber informação, e em que medida.',
        'Em termos simples, cada token faz uma pergunta (uma consulta) e oferece uma resposta (uma chave e um valor). Quando a consulta de um token combina com a chave de outro, parte do valor desse outro é somada ao vetor do primeiro. "manga" combina com "comi" e puxa o sentido de fruta; combina com "camisa" e puxa o sentido de roupa.',
        'Isso acontece em paralelo para todos os tokens e em várias **cabeças de atenção**, cada uma livre para aprender um tipo de relação: concordância, referência de pronomes, proximidade. O resultado é um conjunto de vetores que já não representam palavras isoladas, e sim palavras naquela frase.',
        'A atenção é a peça que deu nome à arquitetura **transformer**, apresentada em 2017: trocar a leitura sequencial por um mecanismo em que qualquer token pode se ligar a qualquer outro, o que torna o treino paralelizável e os contextos longos tratáveis.'
      ],
      experimente: [
        { texto: 'Veja como palavras de família se agrupam antes de qualquer contexto: é daí que a atenção parte.', acao: { tipo: 'preset', id: 'familia' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'camadas',
      titulo: 'Camadas, parâmetros e treino',
      resumo: 'Entre uma atenção e outra, cada vetor passa por uma pequena rede neural. Dezenas dessas camadas, com bilhões de números ajustáveis, formam o modelo.',
      paragrafos: [
        'Depois da atenção vem uma etapa em que cada vetor é processado sozinho, sem olhar os outros: um **perceptron multicamadas** (MLP), duas multiplicações por matrizes com uma função não linear no meio. É nessa etapa que boa parte do conhecimento factual parece ficar guardada; a atenção move informação, o MLP a transforma.',
        'Um transformer empilha dezenas de blocos iguais, cada um com uma atenção e um MLP. O vetor de cada token entra no primeiro bloco como embedding e sai do último bloco carregado de contexto. O último vetor da sequência é o que será usado para prever o próximo token.',
        'Tudo o que o modelo sabe está em seus **parâmetros**: os números das matrizes. Um modelo pequeno tem centenas de milhões; os grandes, centenas de bilhões. Treinar é ajustar esses números, aos poucos, para que a previsão do próximo token em textos reais fique cada vez melhor. Ninguém escreve regras: o comportamento emerge do ajuste.',
        'Por isso um modelo não pode ser corrigido editando uma linha. Para mudar o que ele diz, é preciso treinar mais (ajuste fino) ou dar a informação no texto de entrada. Nos apps SaibaTudo, os dados oficiais vão no texto de entrada e um verificador confere a saída: o modelo explica, os dados respondem.'
      ],
      experimente: [
        { texto: 'Carregue "Cores" e observe como um grupo compacto se forma só com os embeddings, antes de qualquer camada.', acao: { tipo: 'preset', id: 'cores' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'softmax',
      titulo: 'Softmax e temperatura',
      resumo: 'No fim, o modelo tem um número para cada token do vocabulário. A softmax transforma esses números em probabilidades; a temperatura controla quanto o sorteio arrisca.',
      paragrafos: [
        'O último vetor da sequência é multiplicado por uma matriz final e vira uma lista com um número por token do vocabulário: os **logits**. Números maiores significam continuações mais plausíveis, mas ainda não são probabilidades: podem ser negativos e não somam 1.',
        'A função **softmax** resolve isso. Para cada logit z_i, calcula e^(z_i) e divide pela soma de todos: p_i = e^(z_i) / Σ_j e^(z_j). O resultado é uma lista de probabilidades, todas positivas, somando 1, em que diferenças grandes entre logits viram diferenças enormes entre probabilidades.',
        'A **temperatura** T entra dividindo os logits antes da softmax: p_i = e^(z_i / T) / Σ_j e^(z_j / T). Com T perto de 0, a maior probabilidade engole as outras e o modelo quase sempre escolhe a mesma continuação. Com T = 1, as probabilidades são as do treino. Com T alta, a distribuição achata e continuações improváveis passam a ser sorteadas: textos mais criativos e mais errados.',
        'Depois do sorteio, o token escolhido é colado ao texto e o ciclo recomeça: tokens, embeddings, atenção, camadas, softmax. Cada palavra que um assistente escreve passou por esse caminho inteiro.'
      ],
      experimente: [
        { texto: 'Carregue "Números": vetores de palavras próximas em significado ficam próximos, a mesma regularidade que a softmax explora no fim.', acao: { tipo: 'preset', id: 'numeros' } }
      ],
      referencias: ['transformer2017']
    }
  ]
};
