// Leçons en français (traduction du pt-BR, la référence). Contenu original de SaibaTudo (MIT). Relecture par un locuteur natif en attente.
export default {
  revisao: 'pendente',
  secoes: [
    {
      id: 'modelo',
      titulo: 'Ce que fait un modèle de langage',
      resumo: 'Un modèle de langage reçoit un texte et renvoie, pour chaque suite possible, une probabilité. Tout le reste en découle.',
      paragrafos: [
        'Un **modèle de langage** est un programme entraîné pour une seule tâche : étant donné un morceau de texte, estimer quel est le morceau suivant. Il ne renvoie pas un mot mais une liste de candidats, chacun avec une probabilité. « Le chat est monté sur le » est suivi de « toit » avec une probabilité élevée, de « mur » avec une probabilité plus faible et de « océan » avec une probabilité presque nulle.',
        'Pour écrire un texte entier, le modèle répète cette étape : il choisit une suite, la colle au texte et estime la suivante. Un assistant de conversation est ce même processus appliqué à un texte qui commence par les messages de la conversation ; la réponse est la suite la plus probable de ce dialogue, morceau par morceau.',
        'Choisir toujours le candidat le plus probable produit des textes répétitifs ; tirer au sort parmi les candidats, en respectant les probabilités, produit des textes plus variés. C’est pourquoi la même question peut recevoir des réponses différentes : à chaque étape il y a un tirage.',
        'Un grand modèle apprend cette habitude en lisant des milliards de mots. Il ne consulte pas une base de faits : ce qu’il « sait » est réparti dans des nombres ajustés pendant l’entraînement. C’est pourquoi il peut se tromper avec assurance, et pourquoi les applications SaibaTudo étiquettent ce qui vient d’un modèle et n’en tirent jamais un nombre critique.',
        'Cette application ouvre les pièces de ce mécanisme une à une : comment le texte devient des morceaux (tokens), comment chaque morceau devient un vecteur (embedding), comment les vecteurs se parlent (attention), comment ils sont transformés (couches) et comment la liste finale de nombres devient des probabilités (softmax).'
      ],
      experimente: [
        { texto: 'Commencez par la pièce que l’on peut voir : chargez l’exemple « Royauté et genre » et faites tourner le graphique.', acao: { tipo: 'preset', id: 'realeza' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'tokens',
      titulo: 'Tokens : le texte en morceaux',
      resumo: 'Le modèle ne lit ni des lettres ni des mots entiers : il lit des tokens, des morceaux de texte d’un vocabulaire fixe, chacun avec un numéro.',
      paragrafos: [
        'Avant tout calcul, le texte est découpé en **tokens**. Un token peut être un mot courant entier (« maison »), un morceau de mot (« tion ») ou un signe de ponctuation. L’ensemble de tous les tokens possibles est le **vocabulaire** du modèle, avec des dizaines ou des centaines de milliers d’entrées, et chaque entrée a un numéro d’identification.',
        'Le découpage est appris à partir de la fréquence : les suites de lettres qui apparaissent souvent deviennent un seul token ; les rares sont assemblées à partir de plusieurs. En anglais, beaucoup de mots tiennent dans un seul token. En français, les mots longs deviennent souvent deux ou trois tokens. En chinois, un caractère peut être un token ou une partie d’un token, selon la fréquence.',
        'Cela explique quelques comportements curieux : un modèle « voit » le nombre 1234 comme un ou deux morceaux, pas comme quatre chiffres, et peut se tromper en comptant les lettres d’un mot qui, pour lui, est un bloc unique.',
        'Ce qui compte pour la section suivante : après le découpage, le modèle ne travaille plus avec du texte. Il travaille avec la liste des numéros des tokens, et la première étape consiste à remplacer chaque numéro par un vecteur.'
      ],
      experimente: [
        { texto: 'Voyez ce qui arrive à chaque token dans la section suivante : les vecteurs de mots.', acao: { tipo: 'irPara', rota: '/llms/aprenda/embeddings' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'embeddings',
      titulo: 'Embeddings : les mots comme vecteurs',
      resumo: 'Chaque token devient une liste de nombres, un vecteur. Les directions de cet espace portent du sens : roi − homme + femme tombe près de reine.',
      paragrafos: [
        'Un **embedding** est un vecteur : une liste de nombres qui représente un token. Les vecteurs GloVe utilisés dans cette application ont 50 nombres chacun ; ceux d’un grand modèle de langage en ont des milliers. Personne ne choisit les valeurs : elles naissent de l’entraînement, ajustées pour que les mots employés dans des contextes semblables aient des vecteurs semblables.',
        'Comment mesurer « semblable » ? Par le **cosinus** de l’angle entre deux vecteurs : 1 quand ils pointent dans la même direction, 0 quand ils sont perpendiculaires, −1 quand ils sont opposés. Le **produit scalaire** est la même idée sans normalisation : positif quand les vecteurs s’accordent, négatif quand ils divergent. Les plus proches voisins de « tower » sont des mots de bâtiments parce qu’ils apparaissent dans les mêmes contextes.',
        'Le plus surprenant est que les **directions** ont un sens. La différence entre les vecteurs de king et queen ressemble à la différence entre man et woman : il existe une direction qui porte le genre. C’est pourquoi l’arithmétique fonctionne : king − man + woman produit un vecteur dont le plus proche voisin est queen. Il en va de même pour pays et capitale, singulier et pluriel, et pour les associations que le corpus contient, bonnes ou mauvaises.',
        'Avec 50 dimensions, impossible de dessiner. Le graphique de cette application choisit **3 axes**. En mode « 3 dimensions », les axes sont trois des 50 coordonnées d’origine, celles qui varient le plus entre les mots choisis : ce que vous voyez sont de vrais nombres du vecteur. En mode ACP, les axes sont des combinaisons des 50 dimensions qui conservent le maximum de variation ; les distances sont plus fidèles, mais les axes ne sont plus des coordonnées simples.',
        'Deux précautions. D’abord, GloVe est entraîné sur des textes en anglais (Wikipédia et presse) : les mots sont anglais et les associations sont celles de ces textes, biais compris. Ensuite, dans les modèles de langage actuels, l’embedding n’est que le point de départ : les couches suivantes modifient chaque vecteur selon le contexte.'
      ],
      experimente: [
        { texto: 'Calculez king − man + woman et voyez qui apparaît comme voisin du résultat.', acao: { tipo: 'analogia', a: 'king', b: 'man', c: 'woman' } },
        { texto: 'Mesurez la direction du pluriel (cats − cat) contre dog, dogs, house et houses.', acao: { tipo: 'direcao', w1: 'cats', w2: 'cat', lista: ['dog', 'dogs', 'house', 'houses'] } },
        { texto: 'Chargez « Pays et capitales » et alternez entre 3 dimensions et ACP.', acao: { tipo: 'preset', id: 'capitais' } }
      ],
      referencias: ['glove2014', 'word2vec2013']
    },
    {
      id: 'atencao',
      titulo: 'Attention : des vecteurs qui se parlent',
      resumo: 'Le vecteur d’un mot commence identique dans n’importe quelle phrase. L’attention permet à chaque vecteur d’absorber de l’information des autres, pour que « avocat » sache s’il est un fruit ou un juriste.',
      paragrafos: [
        'L’embedding de « avocat » est le même dans « j’ai mangé un avocat » et dans « mon avocat a plaidé ». Pour que le modèle comprenne la phrase, chaque vecteur doit être **mis à jour par le contexte**. C’est ce que fait le mécanisme d’**attention** : chaque token regarde les autres tokens de la séquence et décide desquels il doit recevoir de l’information, et dans quelle mesure.',
        'En termes simples, chaque token pose une question (une requête) et offre une réponse (une clé et une valeur). Quand la requête d’un token correspond à la clé d’un autre, une partie de la valeur de cet autre est ajoutée au vecteur du premier. « avocat » correspond à « mangé » et attire le sens du fruit ; il correspond à « plaidé » et attire le sens du juriste.',
        'Cela se produit en parallèle pour tous les tokens et dans plusieurs **têtes d’attention**, chacune libre d’apprendre un type de relation : accord, référence des pronoms, proximité. Le résultat est un ensemble de vecteurs qui ne représentent plus des mots isolés mais des mots dans cette phrase.',
        'L’attention est la pièce qui a donné son nom à l’architecture **transformer**, présentée en 2017 : remplacer la lecture séquentielle par un mécanisme où n’importe quel token peut se lier à n’importe quel autre, ce qui rend l’entraînement parallélisable et les longs contextes traitables.'
      ],
      experimente: [
        { texto: 'Voyez comment les mots de famille se regroupent avant tout contexte : c’est de là que part l’attention.', acao: { tipo: 'preset', id: 'familia' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'camadas',
      titulo: 'Couches, paramètres et entraînement',
      resumo: 'Entre deux étapes d’attention, chaque vecteur passe par un petit réseau de neurones. Des dizaines de ces couches, avec des milliards de nombres ajustables, forment le modèle.',
      paragrafos: [
        'Après l’attention vient une étape où chaque vecteur est traité seul, sans regarder les autres : un **perceptron multicouche** (MLP), deux multiplications par des matrices avec une fonction non linéaire entre les deux. C’est là qu’une bonne partie des connaissances factuelles semble être conservée ; l’attention déplace l’information, le MLP la transforme.',
        'Un transformer empile des dizaines de blocs identiques, chacun avec une attention et un MLP. Le vecteur de chaque token entre dans le premier bloc comme embedding et sort du dernier chargé de contexte. Le dernier vecteur de la séquence est celui qui servira à prédire le token suivant.',
        'Tout ce que le modèle sait se trouve dans ses **paramètres** : les nombres des matrices. Un petit modèle en a des centaines de millions ; les grands, des centaines de milliards. Entraîner, c’est ajuster ces nombres, petit à petit, pour que la prédiction du token suivant sur des textes réels s’améliore sans cesse. Personne n’écrit de règles : le comportement émerge de l’ajustement.',
        'C’est pourquoi un modèle ne se corrige pas en modifiant une ligne. Pour changer ce qu’il dit, il faut entraîner davantage (réglage fin) ou donner l’information dans le texte d’entrée. Dans les applications SaibaTudo, les données officielles vont dans le texte d’entrée et un vérificateur contrôle la sortie : le modèle explique, les données répondent.'
      ],
      experimente: [
        { texto: 'Chargez « Couleurs » et observez un groupe compact se former à partir des seuls embeddings, avant toute couche.', acao: { tipo: 'preset', id: 'cores' } }
      ],
      referencias: ['transformer2017']
    },
    {
      id: 'softmax',
      titulo: 'Softmax et température',
      resumo: 'À la fin, le modèle a un nombre pour chaque token du vocabulaire. La softmax transforme ces nombres en probabilités ; la température règle la part de risque du tirage.',
      paragrafos: [
        'Le dernier vecteur de la séquence est multiplié par une matrice finale et devient une liste avec un nombre par token du vocabulaire : les **logits**. Des nombres plus grands signifient des suites plus plausibles, mais ce ne sont pas encore des probabilités : ils peuvent être négatifs et leur somme n’est pas 1.',
        'La fonction **softmax** règle cela. Pour chaque logit z_i, elle calcule e^(z_i) et divise par la somme de tous : p_i = e^(z_i) / Σ_j e^(z_j). Le résultat est une liste de probabilités, toutes positives, de somme 1, où de grandes différences entre logits deviennent d’énormes différences entre probabilités.',
        'La **température** T intervient en divisant les logits avant la softmax : p_i = e^(z_i / T) / Σ_j e^(z_j / T). Avec T proche de 0, la plus grande probabilité avale les autres et le modèle choisit presque toujours la même suite. Avec T = 1, les probabilités sont celles de l’entraînement. Avec T élevée, la distribution s’aplatit et des suites improbables se mettent à être tirées : des textes plus créatifs et plus faux.',
        'Après le tirage, le token choisi est collé au texte et le cycle recommence : tokens, embeddings, attention, couches, softmax. Chaque mot qu’un assistant écrit a parcouru tout ce chemin.'
      ],
      experimente: [
        { texto: 'Chargez « Nombres » : les vecteurs de mots proches par le sens restent proches, la même régularité que la softmax exploite à la fin.', acao: { tipo: 'preset', id: 'numeros' } }
      ],
      referencias: ['transformer2017']
    }
  ]
};
