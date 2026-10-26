// Lessons in English (translation of pt-BR, the reference). Original SaibaTudo content (MIT). Native-speaker review pending.
export default {
  revisao: 'pendente',
  secoes: [
    {
      id: 'modelo',
      titulo: 'What a language model does',
      resumo: 'A language model takes a text and returns, for every possible continuation, a probability. Everything else grows out of that.',
      paragrafos: [
        'A **language model** is a program trained for a single task: given a piece of text, estimate what the next piece is. It does not return one word but a list of candidates, each with a probability. "The cat climbed onto the" is followed by "roof" with high probability, by "wall" with a lower one and by "ocean" with almost none.',
        'To write a whole text, the model repeats that step: it picks a continuation, appends it to the text and estimates the next one. A chat assistant is this same process applied to a text that starts with the conversation so far; the reply is the most likely continuation of that dialogue, piece by piece.',
        'Always choosing the most likely candidate produces repetitive text; sampling among the candidates according to their probabilities produces more varied text. That is why the same question can get different answers: at every step there is a draw.',
        'A large model learns this habit by reading billions of words. It does not look things up in a database of facts: what it "knows" is spread across numbers adjusted during training. That is why it can be confidently wrong, and why the SaibaTudo apps label what comes from a model and never take a critical number from it.',
        'This app opens the parts of that mechanism one by one: how text becomes pieces (tokens), how each piece becomes a vector (embedding), how the vectors talk to each other (attention), how they are transformed (layers) and how the final list of numbers becomes probabilities (softmax).'
      ],
      experimente: [
        { texto: 'Start with the part you can see: load the "Royalty and gender" example and rotate the chart.', acao: { tipo: 'preset', id: 'realeza' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'tokens',
      titulo: 'Tokens: text in pieces',
      resumo: 'The model reads neither letters nor whole words: it reads tokens, pieces of text from a fixed vocabulary, each with a number.',
      paragrafos: [
        'Before any computation, the text is cut into **tokens**. A token can be a whole common word ("house"), a piece of a word ("tion") or a punctuation mark. The set of all possible tokens is the model\'s **vocabulary**, with tens or hundreds of thousands of entries, and each entry has an identification number.',
        'The split is learned from frequency: letter sequences that appear often become a single token; rare ones are assembled from several. In English many words fit in one token. In Portuguese, long words usually become two or three. In Chinese, a character may be a token or part of one, depending on frequency.',
        'This explains some curious behaviours: a model "sees" the number 1234 as one or two pieces, not four digits, and may stumble when counting the letters of a word that is, to it, a single block.',
        'What matters for the next section: after the cut, the model no longer works with text. It works with the list of token numbers, and the first step is to swap each number for a vector.'
      ],
      experimente: [
        { texto: 'See what happens to each token in the next section: word vectors.', acao: { tipo: 'irPara', rota: '/llms/aprenda/embeddings' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'embeddings',
      titulo: 'Embeddings: words as vectors',
      resumo: 'Each token becomes a list of numbers, a vector. Directions in that space carry meaning: king − man + woman lands near queen.',
      paragrafos: [
        'An **embedding** is a vector: a list of numbers that represents a token. The GloVe vectors used in this app have 50 numbers each; those of a large language model have thousands. Nobody chooses the values: they come out of training, adjusted so that words used in similar contexts end up with similar vectors.',
        'How do we measure "similar"? By the **cosine** of the angle between two vectors: 1 when they point the same way, 0 when they are perpendicular, −1 when opposite. The **dot product** is the same idea without normalising: positive when the vectors agree, negative when they disagree. The nearest neighbours of "tower" are words about buildings because they appear in the same contexts.',
        'The most surprising part is that **directions** have meaning. The difference between the vectors of king and queen resembles the difference between man and woman: there is a direction that carries gender. That is why the arithmetic works: king − man + woman yields a vector whose nearest neighbour is queen. The same holds for country and capital, singular and plural, and for whatever associations the corpus contains, good or bad.',
        'With 50 dimensions there is nothing to draw. This app\'s chart picks **3 axes**. In "3 dimensions" mode the axes are three of the 50 original coordinates, the ones that vary most among the chosen words: what you see are real numbers from the vector. In PCA mode the axes are combinations of the 50 dimensions that keep the most variation; distances are more faithful, but the axes stop being simple coordinates.',
        'Two caveats. First, GloVe is trained on English texts (Wikipedia and news): the words are English and the associations are those of these texts, biases included. Second, in today\'s language models the embedding is only the starting point: the following layers change each vector according to the context.'
      ],
      experimente: [
        { texto: 'Compute king − man + woman and see who shows up as the result\'s neighbour.', acao: { tipo: 'analogia', a: 'king', b: 'man', c: 'woman' } },
        { texto: 'Measure the plural direction (cats − cat) against dog, dogs, house and houses.', acao: { tipo: 'direcao', w1: 'cats', w2: 'cat', lista: ['dog', 'dogs', 'house', 'houses'] } },
        { texto: 'Load "Countries and capitals" and switch between 3 dimensions and PCA.', acao: { tipo: 'preset', id: 'capitais' } }
      ],
      referencias: ['glove2014', 'word2vec2013']
    },
    {
      id: 'atencao',
      titulo: 'Attention: vectors that talk',
      resumo: 'A word\'s vector starts out the same in any sentence. Attention lets each vector absorb information from the others, so that "bank" knows whether it is money or a river.',
      paragrafos: [
        'The embedding of "bank" is the same in "I went to the bank" and in "we sat on the river bank". For the model to understand the sentence, each vector must be **updated by the context**. That is what the **attention** mechanism does: each token looks at the other tokens of the sequence and decides which ones it should receive information from, and how much.',
        'In simple terms, each token asks a question (a query) and offers an answer (a key and a value). When one token\'s query matches another\'s key, part of that other token\'s value is added to the first token\'s vector. "bank" matches "money" and pulls in the financial sense; it matches "river" and pulls in the shore.',
        'This happens in parallel for all tokens and in several **attention heads**, each free to learn one kind of relation: agreement, pronoun reference, proximity. The result is a set of vectors that no longer represent isolated words but words in that sentence.',
        'Attention is the part that named the **transformer** architecture, presented in 2017: replace sequential reading with a mechanism in which any token can connect to any other, which makes training parallel and long contexts tractable.'
      ],
      experimente: [
        { texto: 'See how family words cluster before any context: that is where attention starts from.', acao: { tipo: 'preset', id: 'familia' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'camadas',
      titulo: 'Layers, parameters and training',
      resumo: 'Between one attention step and the next, each vector goes through a small neural network. Dozens of such layers, with billions of adjustable numbers, make up the model.',
      paragrafos: [
        'After attention comes a step in which each vector is processed on its own, without looking at the others: a **multilayer perceptron** (MLP), two matrix multiplications with a non-linear function in between. A good part of the factual knowledge seems to be stored there; attention moves information, the MLP transforms it.',
        'A transformer stacks dozens of identical blocks, each with an attention step and an MLP. Each token\'s vector enters the first block as an embedding and leaves the last block loaded with context. The last vector of the sequence is the one used to predict the next token.',
        'Everything the model knows is in its **parameters**: the numbers in the matrices. A small model has hundreds of millions; large ones, hundreds of billions. Training means adjusting those numbers, little by little, so that next-token prediction on real texts keeps improving. Nobody writes rules: the behaviour emerges from the adjustment.',
        'That is why a model cannot be fixed by editing a line. To change what it says you must train more (fine-tuning) or give the information in the input text. In the SaibaTudo apps, official data goes into the input text and a verifier checks the output: the model explains, the data answers.'
      ],
      experimente: [
        { texto: 'Load "Colours" and watch a compact group form from embeddings alone, before any layer.', acao: { tipo: 'preset', id: 'cores' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'softmax',
      titulo: 'Softmax and temperature',
      resumo: 'At the end, the model has one number for every token in the vocabulary. Softmax turns those numbers into probabilities; temperature controls how much the draw takes risks.',
      paragrafos: [
        'The last vector of the sequence is multiplied by a final matrix and becomes a list with one number per vocabulary token: the **logits**. Larger numbers mean more plausible continuations, but they are not yet probabilities: they can be negative and do not add up to 1.',
        'The **softmax** function fixes that. For each logit z_i it computes e^(z_i) and divides by the sum of all of them: p_i = e^(z_i) / Σ_j e^(z_j). The result is a list of probabilities, all positive, adding up to 1, in which large differences between logits become huge differences between probabilities.',
        'The **temperature** T comes in by dividing the logits before the softmax: p_i = e^(z_i / T) / Σ_j e^(z_j / T). With T near 0, the largest probability swallows the others and the model almost always picks the same continuation. With T = 1 the probabilities are those of training. With a high T the distribution flattens and unlikely continuations start being drawn: more creative and more wrong texts.',
        'After the draw, the chosen token is appended to the text and the cycle starts again: tokens, embeddings, attention, layers, softmax. Every word an assistant writes has travelled that whole path.'
      ],
      experimente: [
        { texto: 'Load "Numbers": vectors of words close in meaning stay close, the same regularity softmax exploits at the end.', acao: { tipo: 'preset', id: 'numeros' } }
      ],
      referencias: ['transformer2017']
    }
  ]
};
