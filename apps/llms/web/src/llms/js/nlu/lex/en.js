// gerado — não editar. Fonte: contracts/lexico/en.json (tools/gerar_lexico.py). Regexes como texto; o cliente compila (js/nlu/lex/index.js).
export default {
 "idioma": "en",
 "versao": 1,
 "descricao": "SaibaTudo LLMs interpreter lexicon, English. Regexes run on normalised text (lower case, no accents).",
 "intencoes": {
  "saudacao": "^(?:hi|hello|hey|good morning|good afternoon|good evening|howdy|yo)\\b[!.,]*\\s*$",
  "ajuda": "\\b(?:help|how (?:do i|to) use|how does (?:this|it) work|what can (?:you|i) (?:do|ask)|what do you do)\\b",
  "sobreDados": "\\b(?:where (?:do|does) (?:the|this) data come from|about the data|which data|data source|data licen[cs]e|which corpus|which word vectors)\\b",
  "fontes": "\\b(?:sources?|references?|bibliography|glove paper|who made glove)\\b",
  "mostrar": "\\b(?:show|display|plot|draw|add|put|include|place|visuali[sz]e|project|see|view|chart|graph|map)\\b",
  "analogia": "[a-z'-]+\\s*[-−–]\\s*[a-z'-]+\\s*\\+\\s*[a-z'-]+|\\b(?:analogy|is to|as .* is to|complete the)\\b",
  "vizinhos": "\\b(?:neighbou?rs?|similar(?!ity) (?:to|words)|words (?:like|similar|close|near)|close to|near(?:est)? to|related to|resembl\\w*|like)\\b",
  "similaridade": "\\b(?:similarity|how similar|how close|how alike|are .* (?:similar|alike|close|related)|cosine (?:between|of)|distance between)\\b",
  "direcao": "\\b(?:direction|dot product|plural (?:axis|direction)|gender (?:axis|direction)|separate (?:singular|plural))\\b",
  "conceito": "\\b(?:what (?:is|are|does .* mean|do .* mean)|what's|explain|define|definition|how (?:does|do) .* work|why|what (?:is|are) .* for|concept of|meaning of)\\b",
  "preset": "\\b(?:examples?|presets?|ready[- ]made|built[- ]in)\\b",
  "limpar": "\\b(?:clear|erase|reset|remove (?:all|everything)|start over|empty|wipe)\\b"
 },
 "pistas": {
  "separadorLista": "\\s*(?:,|;|\\band\\b|\\bor\\b|\\bwith\\b)\\s*",
  "menos": "\\s[-−–]\\s|[-−–]",
  "mais": "\\+",
  "estaPara": "([a-z'-]+)\\s+is to\\s+([a-z'-]+)\\s+as\\s+([a-z'-]+)\\s+is to\\s*([a-z'-]*)",
  "aspas": "[\"“”'‘’«»]([^\"“”'‘’«»]+)[\"“”'‘’«»]",
  "continuacao": "^(?:and|also|now|plus|too|what about|how about|and also)\\b",
  "plural": "\\b(?:plurals?|singulars?)\\b",
  "pergunta": "\\b(?:which|who|where|when|how many|how much|what is the|what are the)\\b"
 },
 "conceitos": {
  "embedding": [
   "embedding",
   "embeddings",
   "word vector",
   "word vectors",
   "vector representation",
   "word2vec",
   "glove"
  ],
  "token": [
   "token",
   "tokens",
   "tokenization",
   "tokenizer",
   "subword",
   "word piece"
  ],
  "atencao": [
   "attention",
   "attention mechanism",
   "attention head",
   "attention heads",
   "self-attention"
  ],
  "mlp": [
   "mlp",
   "perceptron",
   "dense layer",
   "layers",
   "feed-forward",
   "feedforward",
   "neural network"
  ],
  "softmax": [
   "softmax",
   "probability",
   "probabilities",
   "probability distribution",
   "logit",
   "logits"
  ],
  "temperatura": [
   "temperature",
   "model creativity",
   "randomness",
   "sampling"
  ],
  "transformer": [
   "transformer",
   "transformers",
   "architecture",
   "llm",
   "language model",
   "gpt",
   "chatgpt"
  ],
  "parametro": [
   "parameter",
   "parameters",
   "weight",
   "weights",
   "training",
   "billions of parameters"
  ],
  "proximoToken": [
   "next token",
   "next word",
   "predict",
   "prediction",
   "autocomplete",
   "generate text"
  ],
  "dimensao": [
   "dimension",
   "dimensions",
   "axis",
   "axes",
   "50 dimensions",
   "coordinate",
   "coordinates",
   "pca",
   "principal component"
  ],
  "vetor": [
   "vector",
   "vectors",
   "arrow",
   "arrows",
   "vector arithmetic",
   "vector addition"
  ],
  "cosseno": [
   "cosine",
   "cosine similarity",
   "dot product",
   "angle between",
   "distance"
  ]
 },
 "presets": {
  "realeza": [
   "royalty",
   "gender",
   "royal"
  ],
  "capitais": [
   "capitals",
   "capital",
   "countries and capitals",
   "countries",
   "cities"
  ],
  "plural": [
   "plural",
   "plurals",
   "singular and plural"
  ],
  "familia": [
   "family",
   "relatives",
   "kinship"
  ],
  "cores": [
   "colors",
   "colours",
   "color",
   "colour"
  ],
  "numeros": [
   "numbers",
   "numerals",
   "one to ten",
   "counting"
  ],
  "lideres": [
   "leaders",
   "dictators",
   "countries and leaders",
   "hitler",
   "mussolini",
   "napoleon"
  ]
 },
 "stopPalavras": [
  "a",
  "an",
  "the",
  "of",
  "and",
  "or",
  "in",
  "on",
  "to",
  "for",
  "with",
  "by",
  "at",
  "from",
  "that",
  "which",
  "what",
  "how",
  "me",
  "my",
  "please",
  "i",
  "want",
  "would",
  "like",
  "could",
  "can",
  "you",
  "word",
  "words",
  "chart",
  "graph",
  "vector",
  "vectors",
  "show",
  "display",
  "plot",
  "draw",
  "add",
  "put",
  "include",
  "see",
  "view",
  "also",
  "now",
  "too",
  "plus",
  "between",
  "are",
  "is",
  "similar",
  "close",
  "near",
  "nearest",
  "related",
  "neighbours",
  "neighbors",
  "this",
  "these",
  "those",
  "it",
  "them",
  "as",
  "about",
  "same"
 ],
 "semFronteira": false,
 "normalizarAcentos": true
};
