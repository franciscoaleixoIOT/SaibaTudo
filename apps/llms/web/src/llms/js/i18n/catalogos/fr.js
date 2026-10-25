// Catalogue fr (mêmes clés que pt-BR ; vérifié par test). Traduit par un agent ; relecture par un locuteur natif en attente.
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'pendente',

  ui: {
    idiomas: { 'pt-BR': 'portugais', en: 'anglais', es: 'espagnol', de: 'allemand', fr: 'français', zh: 'chinois' },
    listas: { e: ' et ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — comment fonctionne un modèle de langage, avec des vecteurs de mots en 3D',
      descricao: 'Comprenez comment fonctionne un modèle de langage : choisissez des mots, voyez leurs vecteurs GloVe projetés sur 3 axes dans un graphique interactif, faites de l’arithmétique de vecteurs (roi − homme + femme) et explorez voisins et produit scalaire. Données ouvertes, fonctionne hors ligne, et rien ne quitte votre appareil sans votre geste.',
      ogLocale: 'fr_FR',
      pular: 'Aller au contenu'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: 'Chargement de SaibaTudo LLMs…',
      abas: { inicio: 'Explorer', aprenda: 'Apprendre', sobre: 'À propos des données' },
      secoes: 'Sections',
      marcaAria: 'SaibaTudo LLMs, accueil',
      marcaSub: 'Des vecteurs de mots en 3D, sur votre appareil',
      configuracoes: 'Paramètres',
      idioma: 'Langue',
      rodape: { sobre: 'À propos des données', privacidade: 'Confidentialité', configuracoes: 'Paramètres', projeto: 'Projet indépendant et open source (MIT). Sans publicité, connexion ni traceurs.' },
      naoEncontrada: { titulo: 'Page introuvable', texto: 'Cette adresse n’existe pas dans SaibaTudo LLMs.', inicio: 'Aller à l’accueil' },
      erro: { titulo: 'Erreur', cabecalho: 'Quelque chose s’est mal passé', texto: 'Impossible de construire cet écran ({msg}).', inicio: 'Aller à l’accueil' },
      erroDados: { titulo: 'Données indisponibles', complemento: 'Les vecteurs de mots n’ont pas pu être chargés ({msg}). Les leçons et l’assistant de concepts restent disponibles.', tentar: 'Réessayer' },
      avisoAssinatura: 'La signature numérique du paquet de données ne correspond pas. L’explorateur a été désactivé : ne faites pas confiance aux valeurs issues de ces données.',
      dadosAtualizados: 'Données mises à jour. Rechargez la page pour utiliser la nouvelle version sur tous les écrans.',
      novaVersao: 'Une nouvelle version de l’application a été installée. Fermez et rouvrez (ou rechargez) pour l’utiliser.',
      idiomaTrocado: 'Langue modifiée. Le contexte de la conversation a été effacé.'
    },
    prefs: {
      tema: { SISTEMA: 'Suivre le système', CLARO: 'Clair', ESCURO: 'Sombre' },
      fonte: { PEQUENA: 'Petite', NORMAL: 'Normale', GRANDE: 'Grande', MUITO_GRANDE: 'Très grande' }
    },
    install: {
      ios: { titulo: 'Pour installer sur iPhone ou iPad :', passos: ['Touchez Partager (le carré avec la flèche) dans la barre de Safari.', 'Choisissez « Sur l’écran d’accueil ».', 'Confirmez le nom et touchez Ajouter.'] },
      geral: { titulo: 'Pour installer comme application :', passos: ['Ouvrez le menu du navigateur (⋮ ou ⋯).', 'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 'Confirmez. L’application s’ouvre dans sa propre fenêtre et fonctionne hors ligne.'] }
    },
    componentes: { fonte: 'Source : ', passoAPasso: 'Pas à pas' },
    inicio: {
      titulo: 'Explorer les embeddings',
      subtitulo: 'Choisissez des mots et voyez leurs vecteurs GloVe projetés sur trois axes. Roi − homme + femme ≈ reine.'
    },
    presets: {
      realeza: { nome: 'Royauté et genre', nota: 'La différence roi − reine ressemble à homme − femme : une direction de l’espace porte le genre grammatical.' },
      capitais: { nome: 'Pays et capitales', nota: 'Chaque pays se trouve à une distance semblable de sa capitale : la direction « capitale de » se répète.' },
      plural: { nome: 'Pluriel', nota: 'La direction chats − chat ressemble à chiens − chien ; le produit scalaire avec elle sépare singuliers et pluriels.' },
      familia: { nome: 'Famille', nota: 'Des paires comme père/mère et frère/sœur diffèrent par la même direction de genre.' },
      cores: { nome: 'Couleurs', nota: 'Les couleurs forment un groupe compact : elles apparaissent dans des contextes semblables dans le corpus.' },
      numeros: { nome: 'Nombres', nota: 'De un à dix, les vecteurs s’alignent sur une bande ; les nombres voisins restent voisins.' },
      lideres: { nome: 'Pays et dirigeants', nota: 'Note historique : Italie − Allemagne + Hitler aboutit près de Mussolini parce que le corpus (Wikipédia et presse) associe chaque dictateur de l’Axe à son pays. C’est une régularité statistique des textes, pas un jugement de l’application.' }
    },
    explorador: {
      palavras: 'Mots dans le graphique', palavrasAria: 'Mots choisis', adicionarRotulo: 'Ajouter un mot', adicionarPlaceholder: 'Saisissez un mot en anglais (ou traduit) puis Entrée',
      botaoAdicionar: 'Ajouter', limpar: 'Effacer', remover: 'Retirer {palavra}', destacar: 'Mettre {palavra} en évidence et voir ses voisins', adicionarEsta: 'Ajouter au graphique',
      modoDimensoes: '3 dimensions', modoPca: 'ACP', diferencas: 'Afficher les différences (flèches entre paires)',
      presetsTitulo: 'Exemples prêts', tabelaTitulo: 'Coordonnées sur les 3 axes', tabelaLegenda: 'Coordonnées de chaque mot sur les axes choisis', tabelaPalavra: 'Mot',
      semPalavras: 'Aucun mot pour l’instant. Saisissez-en un ci-dessus, choisissez un exemple ou demandez à l’assistant.',
      eixo: 'Axe {n}', eixoDimensao: 'dimension {n} du vecteur', eixoPca: 'composante principale {n} ({pct} % de la variance)',
      aviso: { pcaPoucasPalavras: 'L’ACP a besoin d’au moins 3 mots ; affichage des 3 dimensions de plus grande variance.' },
      avisoLimite: 'Au plus {n} mots dans le graphique.', naoEncontrada: '« {palavra} » ne fait pas partie des 100 000 mots de GloVe (anglais, sans accents). Suggestions :',
      traduzida: '{original} → {en} (traduit par le glossaire)',
      vizinhosTitulo: 'Plus proches voisins', vizinhosVazio: 'Touchez un mot du graphique ou une puce pour voir les 10 mots les plus proches (cosinus).', vizinhosDe: 'Les 10 mots les plus proches de {palavra} :', cosseno: 'cosinus',
      analogiaTitulo: 'Analogie (a − b + c)', analogiaExplicacao: 'On soustrait b de a et on ajoute c : les mots les plus proches du résultat complètent l’analogie. Ex. : king − man + woman ≈ queen.',
      analogiaA: 'mot a', analogiaB: 'mot b', analogiaC: 'mot c', analogiaBotao: 'Calculer', analogiaLimpar: 'Retirer du graphique', analogiaInvalida: 'Choisissez trois mots différents du graphique (a et c ne peuvent pas être identiques).',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: 'Direction et produit scalaire', direcaoExplicacao: 'La différence w1 − w2 définit une direction (ex. : cats − cat, le pluriel). Le produit scalaire de chaque mot avec cette direction mesure combien il « pointe » dans ce sens.',
      direcaoW1: 'mot w1', direcaoW2: 'mot w2', direcaoLista: 'Mots à mesurer, séparés par des virgules (vide = ceux du graphique)', direcaoBotao: 'Mesurer', direcaoInvalida: 'Choisissez deux mots différents.',
      direcaoResultado: 'Produit scalaire avec la direction {w1} − {w2} :',
      graficoAria: 'Graphique 3D des mots choisis ; faites glisser pour tourner, molette ou pincement pour zoomer, les flèches du clavier font tourner. Le tableau ci-dessous a les mêmes coordonnées.',
      calculadoNoAparelho: 'Calculé sur votre appareil à partir de GloVe (Pennington, Socher et Manning, 2014 ; licence PDDL 1.0). Mots en anglais.'
    },
    config: {
      titulo: 'Paramètres', salva: 'Préférence enregistrée sur cet appareil.', aparencia: 'Apparence', tema: 'Thème', tamanhoTexto: 'Taille du texte', idioma: 'Langue',
      idiomaAjuda: 'Change l’interface, les réponses et l’interpréteur de questions. Les mots du graphique restent en anglais, la langue de GloVe.',
      instalar: 'Installer', jaInstalado: 'L’application est déjà installée sur cet appareil.', instalarApp: 'Installer l’application',
      ia: 'Intelligence artificielle dans le nuage',
      iaAviso: 'Optionnelle et désactivée par défaut. Elle explique seulement des concepts et ce que montre le graphique ; les nombres restent calculés sur cet appareil. Quand vous touchez « Demander à l’IA dans le nuage », le texte de la question, la langue, un résumé du graphique actuel et un code aléatoire de cette installation partent vers notre serveur.',
      nuvemAutomatica: 'IA dans le nuage automatique',
      nuvemAutomaticaAjuda: 'Quand l’application ne comprend pas une question, l’envoyer à l’IA dans le nuage sans demander. Seuls le texte de la question, la langue et le résumé du graphique sont envoyés.',
      dados: 'Données', versaoPacote: 'Version du paquet', palavras: 'Mots', assinatura: 'Signature', semDados: 'Le paquet de données n’est pas encore chargé.',
      assinaturaValor: { verificada: 'vérifiée', invalida: 'NON vérifiée', indisponivel: 'indisponible dans ce navigateur' },
      privacidade: 'Confidentialité', privacidadeTexto: 'Nous ne gardons sur cet appareil que le thème, la taille du texte, la langue et l’historique des questions, plus le cache pour l’usage hors ligne. ', politica: 'Politique de confidentialité',
      apagar: 'Effacer les données de cet appareil', confirmar: 'Touchez à nouveau pour confirmer', apagados: 'Données effacées. Rechargement…'
    }
  }
};
