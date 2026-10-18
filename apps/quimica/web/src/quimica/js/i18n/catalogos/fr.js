// Catalogue français. Mêmes clés que le pt-BR (vérifié par test). Glossaire et style : docs/I18N.md §8 (« vous », phrases courtes). Traduction initiale par agent :
// "revisao: 'pendente'" jusqu’à la relecture par un locuteur natif. Typographie : apostrophe ’, guillemets « … » et espaces normales avant « : ; ? ! ».
const MARCA = 'SaibaTudo Química';
const maj = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default {
  revisao: 'pendente',
  regras: { minusculaNoMeio: true },

  ui: {
    idiomas: { 'pt-BR': 'portugais', en: 'anglais', es: 'espagnol', de: 'allemand', fr: 'français' },
    listas: { e: ' et ' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo Química — tableau périodique, composés et calculatrices avec des données ouvertes',
      descricao: 'Tableau périodique interactif, fiches d’éléments et de composés avec structures 2D, calculatrices pas à pas (masse molaire, équilibrage, stœchiométrie, pH, gaz parfait) et sécurité chimique. Données ouvertes, fonctionne hors ligne et rien ne quitte votre appareil.',
      ogLocale: 'fr_FR',
      pular: 'Aller au contenu'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo Química',
      carregando: 'Chargement de SaibaTudo Química…',
      abas: { inicio: 'Accueil', tabela: 'Tableau périodique', compostos: 'Composés', calculadoras: 'Calculatrices', seguranca: 'Sécurité' },
      secoes: 'Sections',
      marcaAria: 'SaibaTudo Química, accueil',
      marcaSub: 'Données ouvertes, calculs sur votre appareil',
      configuracoes: 'Paramètres',
      idioma: 'Langue',
      rodape: { sobre: 'À propos des données', privacidade: 'Confidentialité', configuracoes: 'Paramètres', projeto: 'Projet indépendant et open source (MIT). Sans publicité, sans connexion, sans traceurs.' },
      naoEncontrada: { titulo: 'Page introuvable', texto: 'Cette adresse n’existe pas dans SaibaTudo Química.', inicio: 'Aller à l’accueil' },
      erro: { titulo: 'Erreur', cabecalho: 'Une erreur s’est produite', texto: 'Impossible de construire cet écran ({msg}).', inicio: 'Aller à l’accueil' },
      erroDados: { titulo: 'Impossible de charger les données', complemento: '{msg}. Vérifiez votre connexion ; après le premier chargement, l’application fonctionne hors ligne.', tentar: 'Réessayer' },
      avisoAssinatura: 'La signature numérique du jeu de données ne correspond pas. Les données propres au site restent utilisées, mais elles n’ont pas été authentifiées : ne vous fiez pas aux valeurs critiques.',
      dadosAtualizados: 'Données mises à jour. Rechargez la page pour utiliser la nouvelle version sur tous les écrans.',
      novaVersao: 'Une nouvelle version de l’application a été installée. Fermez-la puis rouvrez-la (ou rechargez la page) pour l’utiliser.',
      idiomaTrocado: 'Langue modifiée. Le contexte de la conversation a été effacé.'
    },
    prefs: {
      tema: { SISTEMA: 'Suivre le système', CLARO: 'Clair', ESCURO: 'Sombre' },
      fonte: { PEQUENA: 'Petite', NORMAL: 'Normale', GRANDE: 'Grande', MUITO_GRANDE: 'Très grande' }
    },
    install: {
      ios: { titulo: 'Installer sur iPhone ou iPad', passos: ['Ouvrez cette page dans Safari.', 'Touchez Partager (le carré avec la flèche vers le haut).', 'Choisissez « Sur l’écran d’accueil », puis confirmez avec « Ajouter ».'] },
      geral: {
        titulo: 'Installer l’application',
        passos: [
          'Dans Chrome ou Edge (Windows, Mac, Linux, Android), utilisez le bouton « Installer l’application » de cette page ou l’icône d’installation dans la barre d’adresse.',
          'Dans le menu du navigateur, choisissez « Installer SaibaTudo Química » (ou « Ajouter à l’écran d’accueil »).',
          'Une fois installée, l’application s’ouvre dans sa propre fenêtre et fonctionne aussi sans internet (avec les données déjà chargées).'
        ]
      }
    },
    componentes: {
      fonte: 'Source : ',
      palavraSinal: 'Mention d’avertissement : ',
      pictogramasAria: 'Pictogrammes de danger',
      frasesAria: 'Mentions de danger (H)',
      fraseIndisponivel: 'Texte de la mention indisponible dans ce jeu de données.',
      passoAPasso: 'Pas à pas',
      fraseEmIdioma: '(texte en {idioma})'
    },
    molecula: {
      aria: 'Structure 2D : {nome}',
      erroDesenho: 'Impossible de dessiner cette structure.',
      erroSmiles: 'Impossible d’interpréter le SMILES de cette structure.',
      erroBiblioteca: 'La bibliothèque de dessin est indisponible pour le moment (hors ligne ?). Le SMILES reste indiqué sur la fiche.'
    },
    nomes: {
      emIdioma: '{nome} (nom en {idioma})',
      nomeEmIdioma: 'Nom en {idioma}'
    },
    inicio: {
      titulo: 'Accueil',
      cabecalho: 'Posez une question de chimie',
      intro: 'Éléments, composés, calculs pas à pas et sécurité chimique. Les réponses viennent de données ouvertes et de calculs effectués sur votre appareil.',
      campoAria: 'Poser une question de chimie',
      placeholder: 'Ex. : masse molaire de l’eau, Fe + O2 -> Fe2O3, pH de HCl 0,01 mol/L',
      exemplosAria: 'Exemples de questions',
      badge: 'Rien ne quitte votre appareil, sauf si vous interrogez l’IA dans le cloud.',
      explore: 'Explorer',
      cartoes: {
        tabela: { titulo: 'Tableau périodique', descricao: 'Couleurs par catégorie, filtres par bloc, période, groupe et état.' },
        compostos: { titulo: 'Composés', descricao: 'Recherche par nom, formule, CAS ou CID et affichage de la structure 2D.' },
        calculadoras: { titulo: 'Calculatrices', descricao: 'Masse molaire, équilibrage, stœchiométrie, concentration, pH, gaz parfait et unités.' },
        seguranca: { titulo: 'Sécurité', descricao: 'Pictogrammes SGH, mentions H et comment éviter les mélanges dangereux.' },
        sobre: { titulo: 'À propos des données', descricao: 'Sources, licences, dates et vérification de la signature numérique.' }
      },
      historico: { ultima: 'Dernière question', anterior: 'Question précédente', proxima: 'Question suivante ou zone vide' },
      limpar: 'Effacer le texte',
      analisando: 'Analyse en cours',
      analisandoPergunta: 'Analyse de la question…',
      pensando: 'Réflexion…',
      perguntar: 'Demander',
      copiada: 'Réponse copiée.',
      naoCopiou: 'Impossible de copier dans ce navigateur.',
      copiarRodape: 'Sources :',
      relatoTitulo: 'Chimie : réponse à « {pergunta} »',
      relatoCorpo: 'Qu’est-ce qui était faux ou manquant dans la réponse ? (N’incluez pas de données personnelles.)\n\nQuestion : {pergunta}',
      respostaAnuncio: 'Réponse : {titulo}'
    },
    nuvem: {
      botao: 'Demander à l’IA dans le cloud',
      nota: 'Envoie seulement le texte de cette question à notre serveur pour l’interpréter ; la réponse provient toujours des données. Pour une question de suite (« et pour le potassium ? »), l’interprétation de la question précédente est aussi envoyée, sans son texte. Cela peut prendre jusqu’à 30 s.',
      notaConferir: 'La réponse ci-dessus a été construite sur votre appareil. Si ce n’est pas ce que vous attendiez, l’IA dans le cloud peut essayer de comprendre la question autrement ; la réponse provient toujours des données. Seul le texte de cette question est envoyé. Pour une question de suite (« et pour le potassium ? »), l’interprétation de la question précédente est aussi envoyée, sans son texte. Cela peut prendre jusqu’à 30 s.',
      consultando: 'Interrogation de l’IA dans le cloud…',
      mesmaInterpretacao: 'L’IA dans le cloud a compris la question de la même façon que l’application ; la réponse ci-dessus y répond donc déjà. Si vous vouliez autre chose, reformulez la question en citant l’élément, le composé ou la propriété.',
      semOutraInterpretacao: 'L’IA dans le cloud n’a pas trouvé d’autre façon de comprendre cette question. La réponse ci-dessus reste valable.',
      indisponivelConferir: 'L’IA dans le cloud est indisponible pour le moment ou a mis trop de temps à répondre. La réponse ci-dessus reste valable ; réessayez dans un instant.',
      falhouConferir: 'L’IA dans le cloud n’a pas pu proposer d’autre réponse pour le moment. La réponse ci-dessus reste valable.',
      naoEntendeu: 'L’IA dans le cloud n’a pas compris cette question non plus. Essayez de la reformuler en citant l’élément, le composé (nom ou formule) ou la propriété.',
      indisponivel: 'L’IA dans le cloud est indisponible pour le moment ou a mis trop de temps à répondre. Réessayez dans un instant ou reformulez la question en citant l’élément, le composé ou la propriété.',
      falhou: 'L’IA dans le cloud n’a pas pu interpréter la question pour le moment. Essayez de la reformuler en citant l’élément, le composé ou la propriété.',
      quisDizer: 'Je n’ai pas trouvé ce composé dans les données. Vouliez-vous dire :'
    },
    melhoria: {
      titulo: 'Aider à améliorer l’application',
      explicacao: 'L’application n’a pas compris cette question. Si vous le souhaitez, envoyez-la pour nous aider à entraîner l’interpréteur. Seuls le texte de la question et un identifiant aléatoire propre à cette installation sont envoyés, sans votre nom ni rien qui vous identifie. Les questions contenant une adresse e-mail, un numéro de téléphone, un numéro de document, une adresse de site ou une demande dangereuse ne sont pas envoyées, mais aucun filtre n’est parfait : n’écrivez pas de données personnelles. Une personne relit les questions conservées, qui sont effacées dans un délai de 4 mois au plus. Pour les envoyer toujours, activez « Aider à améliorer l’application » dans les Paramètres ; vous pouvez aussi le désactiver et vider la file d’attente.',
      botao: 'Envoyer cette question',
      enviando: 'Envoi en cours…',
      enviada: 'Merci ! La question a été envoyée.',
      naFila: 'Cette question a rejoint la file d’attente « Aider à améliorer l’application » et sera envoyée avec les suivantes. Pour désactiver, allez dans les Paramètres.',
      guardada: 'La question est conservée sur cet appareil et sera envoyée avec les suivantes.',
      indisponivel: 'L’envoi n’est pas disponible pour le moment. La question reste sur cet appareil et sera envoyée plus tard.',
      falhou: 'Envoi impossible pour le moment (pas de réseau ou trop d’envois d’affilée). La question reste sur cet appareil et sera envoyée plus tard.',
      chave: 'Aider à améliorer l’application',
      chaveAjuda: 'Désactivé par défaut. Une fois activé, les questions que l’application n’a pas comprises entrent dans une file d’attente sur cet appareil et sont envoyées par lots à notre serveur, avec seulement le texte de la question et un identifiant aléatoire propre à cette installation, afin qu’une personne les relise et apprenne à l’application à les comprendre. Les questions contenant des données personnelles (e-mail, téléphone, numéro de document, site web) ou une demande dangereuse n’entrent pas dans la file, mais aucun filtre n’est parfait : évitez d’écrire des données personnelles. La désactivation efface ce qui n’a pas encore été envoyé.',
      fila: (p) => (Number(p.n) === 0 ? 'Aucune question dans la file d’attente.' : Number(p.n) === 1 ? 'Une question dans la file d’attente, en attente d’envoi.' : `${p.n} questions dans la file d’attente, en attente d’envoi.`),
      apagarFila: 'Vider la file d’attente',
      filaApagada: 'File d’attente vidée.'
    },
    resposta: {
      rotuloRecusa: 'Demande refusée pour des raisons de sécurité',
      rotuloResolvida: 'Réponse construite sur votre appareil, à partir des données',
      rotuloNaoResolvida: 'Je n’ai pas pu répondre',
      origemNuvem: 'sur votre appareil, avec la question interprétée par l’IA dans le cloud ({modelo})',
      origemAparelho: 'sur votre appareil',
      origem: 'Réponse construite {origem}',
      dadosDe: ' • jeu de données du {data}',
      fechar: 'Fermer la réponse',
      tambem: 'Vous pouvez aussi demander',
      fontes: 'Sources et licences ({n})',
      copiar: 'Copier la réponse',
      relatar: 'Signaler un problème avec cette réponse'
    },
    tabela: {
      titulo: 'Tableau périodique',
      intro: 'Touchez un élément pour voir toutes ses propriétés, avec unités et sources. Les couleurs indiquent la catégorie ; filtrez par bloc, période, groupe ou état physique.',
      buscar: 'Rechercher',
      placeholder: 'Nom, symbole ou numéro',
      filtrosAria: 'Filtres du tableau périodique',
      bloco: 'Bloc', blocoN: 'Bloc {b}', periodo: 'Période', periodoN: 'Période {p}', grupo: 'Groupe', grupoN: 'Groupe {g}', estado: 'État standard', todos: 'Tous',
      estados: { solido: 'Solide', liquido: 'Liquide', gas: 'Gaz' },
      limpar: 'Effacer les filtres',
      legendaAria: 'Catégories (touchez pour filtrer)',
      contagemTodos: '{n} éléments',
      contagemFiltro: 'Éléments correspondant aux filtres : {n} sur {total}',
      regiaoAria: 'Tableau périodique (faites défiler horizontalement sur les écrans étroits)',
      vazio: 'Les données des éléments ne sont pas disponibles.',
      rotuloElemento: '{nome}, symbole {simbolo}, numéro atomique {z}, {categoria}, {estado}'
    },
    elemento: {
      naoEncontrado: 'Élément introuvable',
      naoHa: 'Aucun « {simbolo} » dans les données.',
      abrirTabela: 'Ouvrir le tableau périodique',
      voltar: 'Tableau périodique',
      nomeEmIngles: 'Nom en anglais',
      incerteza: 'Incertitude sur la masse atomique',
      sub: 'Élément {z} · {categoria} · {estado} dans les conditions standard',
      propriedades: 'Propriétés',
      compostosCom: 'Composés de l’élément {nome}',
      buscarCompostosDe: 'Rechercher les composés de l’élément {nome}',
      mostrando: (p) => (p.n === 1 ? 'Un composé de l’index est affiché ; utilisez la recherche de composés pour en voir davantage.' : `${p.n} composés de l’index sont affichés ; utilisez la recherche de composés pour en voir davantage.`),
      calcular: 'Calculer',
      massaMolarDe: 'Masse molaire : {nome}'
    },
    compostos: {
      titulo: 'Composés',
      intro: 'Recherchez par nom, nom courant, nom IUPAC, formule, numéro CAS ou CID PubChem.',
      placeholder: 'Nom, formule, CAS ou CID (p. ex. : aspirine, H2SO4, 64-17-5)',
      buscar: 'Rechercher un composé',
      buscando: 'Recherche…',
      semIndice: 'L’index des composés n’est pas disponible.',
      erro: 'Impossible de charger les composés ({msg}).',
      resultados: (p) => `${p.n} résultat${p.n > 1 ? 's' : ''}`,
      nenhum: 'Aucun composé trouvé pour « {q} ».',
      total: '{n} composés dans le jeu de données, par ordre alphabétique.',
      faixa: 'Affichage de {de} à {ate} sur {n}.',
      pagina: 'Page {p} sur {total}',
      anterior: 'Page précédente',
      proxima: 'Page suivante',
      paginacao: 'Pages de résultats',
      cas: 'CAS {cas}',
      naoEncontrado: 'Composé introuvable',
      naoHa: 'Ce composé ne figure pas dans le jeu de données.',
      buscarCompostos: 'Rechercher des composés',
      cid: 'CID {cid}',
      voltar: 'Composés',
      nomePopular: 'Nom courant',
      nomeIupac: 'Nom IUPAC',
      nomePt: 'Nom en portugais',
      nomePtPendente: 'en attente : le nom affiché est le nom IUPAC',
      sinonimos: 'Synonymes',
      formula: 'Formule',
      formulaHill: 'Formule (notation de Hill)',
      cidPubchem: 'CID PubChem',
      smiles: 'SMILES',
      wikidata: 'Wikidata',
      dados: 'Données du composé',
      fontePubchem: 'PubChem CID {cid} (NCBI/NLM)',
      estrutura: 'Structure 2D',
      desenhada: 'Dessinée sur votre appareil à partir du SMILES du jeu de données, avec SmilesDrawer (MIT).',
      seguranca: 'Sécurité',
      classificacaoGhs: 'Classification de danger (SGH)',
      fonteFrases: 'Mentions de danger : SGH de la CEE-ONU / CLP de l’ECHA',
      semGhs: 'Le jeu de données ne contient aucune classification SGH harmonisée pour ce composé. Cela ne veut pas dire qu’il soit inoffensif : consultez la fiche de données de sécurité du produit.',
      icsc: 'Fiche ICSC sur le site de l’OIT',
      comoLer: 'Comment lire les pictogrammes et les mentions H',
      definicao: 'Définition (ChEBI)',
      definicaoFonte: 'Définition en anglais. Source : ',
      chebi: 'ChEBI ({id})',
      chebiSem: 'ChEBI (EMBL-EBI)',
      calcular: 'Calculer',
      massaMolarDe: 'Masse molaire : {formula}',
      perguntar: 'Poser une question sur ce composé',
      perguntaPerigos: 'Dangers : {nome}'
    },
    calculadoras: {
      titulo: 'Calculatrices',
      intro: 'Chaque résultat affiche les étapes et les formules. Tout est calculé sur votre appareil ; les masses atomiques et les constantes proviennent du jeu de données signé.',
      naoEncontrada: 'Calculatrice introuvable',
      verTodas: 'Voir toutes les calculatrices',
      voltar: 'Calculatrices',
      resultadoAria: 'Résultat',
      passoAPasso: 'Pas à pas',
      exemplosAria: 'Exemples',
      unidadeDe: 'Unité : {rotulo}',
      lista: {
        'massa-molar': { titulo: 'Masse molaire', descricao: 'Somme des masses atomiques du jeu de données, avec la composition en pourcentage.' },
        balanceamento: { titulo: 'Équilibrage d’équations', descricao: 'Algèbre linéaire exacte, avec ions et étapes.' },
        estequiometria: { titulo: 'Stœchiométrie', descricao: 'Masse, moles, particules et volume (CNTP) ; réactif limitant.' },
        concentracao: { titulo: 'Concentration et dilution', descricao: 'Molarité, g/L, pourcentages et C₁V₁ = C₂V₂.' },
        ph: { titulo: 'pH', descricao: 'Acides et bases forts et faibles (avec Ka ou Kb) et conversions.' },
        'gas-ideal': { titulo: 'Gaz parfait', descricao: 'PV = nRT avec la constante R du jeu de données (CODATA).' },
        unidades: { titulo: 'Conversion d’unités', descricao: 'Pression, volume, masse, température, énergie et plus encore.' },
        entalpia: { titulo: 'Enthalpie (formation et Hess)', descricao: 'ΔH de réaction à partir des enthalpies de formation du jeu de données ou par la loi de Hess (jusqu’à 4 équations).' },
        'configuracao-eletronica': { titulo: 'Configuration électronique', descricao: 'Règle de Klechkowski, couches et électrons de valence ; aussi pour les ions.' },
        nox: { titulo: 'Nombre d’oxydation', descricao: 'Nombre d’oxydation de chaque élément selon les règles, ions et valeurs moyennes compris.' },
        equilibrio: { titulo: 'Équilibre (Kc et Kp)', descricao: 'Expression de Kc, Δn, Kp = Kc·(RT)^Δn et la valeur de Kc à partir des concentrations.' },
        ligacao: { titulo: 'Type de liaison', descricao: 'Ionique, covalente polaire, covalente apolaire ou métallique, selon l’électronégativité.' }
      },
      entalpia: {
        modo: 'Calcul', formacao: 'Par les enthalpies de formation', hess: 'Loi de Hess', equacao: 'Équation de la réaction', placeholder: 'Ex. : CH4 + 2 O2 -> CO2 + 2 H2O',
        ajuda: 'Sans coefficients, l’application équilibre l’équation. Les ΔHf° viennent du jeu de données ; les corps simples (O2, N2, Fe…) valent 0.',
        alvo: 'Équation cible', placeholderAlvo: 'Ex. : C + 2 H2 -> CH4', equacaoN: 'Équation {n}', dH: 'ΔH de l’équation {n} (kJ)',
        ajudaHess: 'Saisissez les équations équilibrées comme dans l’énoncé, chacune avec son ΔH. Les fractions sont acceptées (1/2 O2). Laissez vides celles qui ne servent pas.', calcular: 'Calculer ΔH'
      },
      eletronica: {
        elemento: 'Élément (symbole ou nom)', placeholder: 'Ex. : Fe, fer, Cl', carga: 'Charge de l’ion', ajudaCarga: '0 pour l’atome neutre ; 2 pour Fe²⁺, -1 pour Cl⁻.',
        calcular: 'Répartir', naoEncontrei: 'Cet élément n’est pas dans le jeu de données.'
      },
      nox: {
        formula: 'Formule (avec la charge, pour un ion)', placeholder: 'Ex. : H2SO4, MnO4-, Cr2O7 2-', ajuda: 'Charge à la fin : MnO4-, SO4^2-, NH4+ ou « Cr2O7 2- ». Les hydrates ne sont pas acceptés.',
        elemento: 'Élément à mettre en évidence (facultatif)', placeholderElemento: 'Ex. : S', calcular: 'Calculer'
      },
      equilibrio: {
        equacao: 'Équation', placeholder: 'Ex. : N2 + 3 H2 ⇌ 2 NH3', ajuda: 'Accepte ⇌, <=>, -> ou =. Les états (s), (l), (g), (aq) sont pris en compte : les solides et liquides purs n’apparaissent pas dans l’expression.',
        concentracoes: 'Concentrations à l’équilibre (facultatif)', placeholderConc: 'Ex. : [N2] = 0,5 ; [H2] = 1,5 ; [NH3] = 0,2', ajudaConc: 'Une par espèce, en mol/L, séparées par des points-virgules.',
        temperatura: 'Température (facultatif, pour Kp)', calcular: 'Calculer'
      },
      ligacao: {
        modo: 'Saisie', porFormula: 'Formule', porElementos: 'Deux éléments', formula: 'Formule', placeholder: 'Ex. : NaCl, HCl, Cl2, NaOH',
        a: 'Élément 1', b: 'Élément 2', placeholderA: 'Ex. : H', placeholderB: 'Ex. : Cl', calcular: 'Classer'
      },
      massaMolar: {
        formula: 'Formule chimique', placeholder: 'Ex. : Ca(OH)2, CuSO4·5H2O, Fe2(SO4)3', ajuda: 'Parenthèses, hydrates avec « · » (ou « . »), charges à la fin : Fe3+, SO4^2-.',
        fichaDe: 'fiche : {nome}', calcular: 'Calculer la masse molaire'
      },
      balanceamento: {
        equacao: 'Équation chimique', placeholder: 'Ex. : Fe + O2 -> Fe2O3',
        ajuda: 'Séparez les substances avec « + » et utilisez « -> » ou « → ». Les ions fonctionnent : Zn + Cu2+ -> Zn2+ + Cu. Les états (s), (l), (g), (aq) sont ignorés.',
        conferencia: 'Vérification : atomes de chaque élément (et charge) de part et d’autre', elemento: 'Élément', reagentes: 'Réactifs', produtos: 'Produits', igual: 'Égal ?', carga: 'charge', sim: 'oui', nao: 'non',
        coeficientesIgnorados: 'Les coefficients saisis ont été ignorés : l’application équilibre toute l’équation.', balancear: 'Équilibrer'
      },
      estequiometria: {
        modo: 'Que voulez-vous faire ?', conv: 'Convertir masse, moles, particules et volume (CNTP) d’une substance', reacao: 'Réaction : réactif limitant et quantité de produits',
        substancia: 'Substance (formule)', placeholderSubstancia: 'Ex. : H2O, CO2, NaCl', quantidade: 'Quantité',
        ajudaQuantidade: 'L et mL = volume d’un gaz parfait aux CNTP (0 °C et 1 atm). « particules » = molécules, atomes ou ions.', particulas: 'particules',
        equacao: 'Équation chimique', placeholderEquacao: 'Ex. : H2 + O2 -> H2O', ajudaEquacao: 'L’application équilibre l’équation. Indiquez la quantité d’au moins une substance.',
        rendimento: 'Rendement (%)', ajudaRendimento: 'Facultatif. 100 % = rendement théorique.', quantidadeDe: 'Quantité de {formula}', calcular: 'Calculer',
        tabelaTitulo: 'Quantités de chaque substance', tabelaLegenda: 'Réactifs : quantités initiale, consommée et restante ; produits : quantité formée',
        cabecalho: ['Substance', 'Rôle', 'Coef.', 'M (g/mol)', 'Mol', 'Masse (g)', 'Particules', 'Volume CNTP (L)'],
        produto: 'produit', limitante: 'réactif limitant', reagente: 'réactif'
      },
      concentracao: {
        tipo: 'Type de calcul', soluto: 'Soluté (formule)', exNaCl: 'Ex. : NaCl', exNaOH: 'Ex. : NaOH', massaSoluto: 'Masse de soluté', volumeSolucao: 'Volume de solution',
        concentracaoDesejada: 'Concentration souhaitée', valorConcentracao: 'Valeur de la concentration', converter: 'Convertir', glParaMol: 'g/L → mol/L', molParaGl: 'mol/L → g/L',
        massaSolucao: 'Masse de solution', unidadeConcentracao: 'Unité de concentration', unidadeVolume: 'Unité de volume',
        c1: 'C₁ (concentration initiale)', v1: 'V₁ (volume initial)', c2: 'C₂ (concentration finale)', v2: 'V₂ (volume final)',
        deixeEmBranco: 'Laissez vide le champ à calculer.', calcular: 'Calculer'
      },
      ph: {
        tipo: 'Type de solution', concentracao: 'Concentration (mol/L)', ex001: 'Ex. : 0,01', ex01: 'Ex. : 0,1', hLiberados: 'H⁺ libérés par unité de formule', ohLiberados: 'OH⁻ libérés par unité de formule',
        ajudaN: 'HCl = 1 ; H₂SO₄ = 2 (modèle scolaire) ; NaOH = 1 ; Ca(OH)₂ = 2.', kaOuPka: 'Ka ou pKa', kbOuPkb: 'Kb ou pKb', exK: 'Ex. : 1,8e-5',
        ajudaK: 'Notation scientifique : 1,8e-5 ou 1,8 x 10^-5.', valorInformado: 'La valeur donnée est', valorConhecido: 'Valeur connue', hMolL: '[H⁺] (mol/L)', ohMolL: '[OH⁻] (mol/L)',
        valor: 'Valeur', calcular: 'Calculer le pH'
      },
      gas: {
        calcular: 'Calculer', volume: 'Volume (V)', pressao: 'Pression (P)', quantidade: 'Quantité de matière (n)', temperatura: 'Température (T)',
        formulaGas: 'Formule du gaz', exCO2: 'Ex. : CO2', massaGas: 'Masse de gaz', usarMassa: 'Indiquer la masse et la formule du gaz au lieu de n', botao: 'Calculer'
      },
      unidades: {
        grandeza: 'Grandeur', valor: 'Valeur', ex5: 'Ex. : 5', de: 'De', para: 'Vers', converter: 'Convertir', inverter: 'Inverser', equivaleA: '{valor} {de} équivaut à',
        grandezas: { massa: 'Masse', volume: 'Volume', comprimento: 'Longueur', pressao: 'Pression', energia: 'Énergie', temperatura: 'Température', tempo: 'Temps', quantidade: 'Quantité de matière', concentracao: 'Concentration' }
      }
    },
    seguranca: {
      titulo: 'Sécurité chimique',
      intro: 'Comment lire les avertissements de danger des produits chimiques. L’application affiche la classification SGH des composés du jeu de données et vous renvoie vers les fiches officielles ; elle n’explique pas comment fabriquer des substances dangereuses.',
      aviso: 'Par sécurité, l’application refuse les demandes de synthèse, de purification ou de recettes maison d’explosifs, d’armes chimiques, de drogues illicites et d’autres réactifs dangereux. Les questions sur les dangers, les EPI, le stockage et les premiers secours reçoivent une réponse.',
      verPerigos: 'Voir les dangers d’un composé', buscar: 'Rechercher un composé', placeholderBusca: 'Nom, formule ou CAS du composé', verPictogramas: 'Voir les dangers et les pictogrammes',
      pictogramas: 'Pictogrammes SGH (GHS)',
      pictogramasIntro: 'Le SGH (Système général harmonisé des Nations unies) utilise des losanges à bordure rouge. Les dessins ci-dessous sont des versions simplifiées réalisées pour cette application.',
      palavraSinal: 'Mention d’avertissement', perigo: 'Danger', atencao: 'Attention',
      sinalTexto1: ' signale les catégories les plus graves ; ', sinalTexto2: ' signale les moins graves. Les substances moins dangereuses peuvent n’avoir aucune mention d’avertissement.',
      comoLer: 'Comment lire les mentions H', frasesIntro: 'Chaque mention de danger a un code : la lettre H suivie de trois chiffres. Le premier chiffre indique le type de danger :',
      codigosSomados: 'Les codes combinés, comme H302+H312, regroupent les mentions en une seule. Textes : SGH de la CEE-ONU / CLP de l’ECHA, en français.',
      procurarFrase: 'Rechercher une mention', placeholderFiltro: 'Filtrer par code ou par mot (p. ex. : H314, inflammable)', nenhumaFrase: 'Aucune mention trouvée.',
      boasPraticas: 'Bonnes pratiques', fontesOficiais: 'Sources officielles (liens externes)',
      links: [
        ['Fiches internationales de sécurité chimique (ICSC), OIT/OMS', 'https://chemicalsafety.ilo.org/dyn/icsc/showcard.home', 'Fiches par substance (l’application ne copie pas les fiches : elle renvoie seulement vers elles).'],
        ['PubChem : classification SGH des composés', 'https://pubchem.ncbi.nlm.nih.gov/ghs/', 'Explique l’origine de la classification utilisée dans cette application.'],
        ['CEE-ONU : transport des marchandises dangereuses et SGH', 'https://unece.org/transport/dangerous-goods', 'Origine du Système général harmonisé (SGH) des Nations unies.']
      ]
    },
    perigos: {
      pictogramas: {
        GHS01: 'Explosif', GHS02: 'Inflammable', GHS03: 'Comburant', GHS04: 'Gaz sous pression', GHS05: 'Corrosif',
        GHS06: 'Toxicité aiguë (toxique ou mortel)', GHS07: 'Nocif, irritant ou sensibilisant', GHS08: 'Danger grave pour la santé', GHS09: 'Dangereux pour le milieu aquatique'
      },
      descricoes: {
        GHS01: 'explosifs, substances auto-réactives et peroxydes organiques',
        GHS02: 'inflammables, pyrophoriques, substances auto-échauffantes ou qui dégagent des gaz inflammables au contact de l’eau',
        GHS03: 'comburants', GHS04: 'gaz sous pression',
        GHS05: 'corrosif pour les métaux, provoquant des brûlures de la peau et de graves lésions des yeux', GHS06: 'toxicité aiguë (mortelle ou toxique)',
        GHS07: 'toxicité aiguë modérée (nocif), irritation de la peau et des yeux, sensibilisation cutanée et irritation des voies respiratoires',
        GHS08: 'cancérogénicité, mutagénicité, toxicité pour la reproduction, sensibilisation respiratoire, toxicité pour certains organes cibles et danger en cas d’aspiration',
        GHS09: 'dangereux pour le milieu aquatique'
      },
      grupos: [
        { faixa: 'H2xx', titulo: 'Dangers physiques', descricao: 'explosifs, inflammables, comburants, gaz sous pression, corrosifs pour les métaux (H200 à H290).' },
        { faixa: 'H3xx', titulo: 'Dangers pour la santé', descricao: 'toxicité aiguë, corrosion et irritation de la peau et des yeux, sensibilisation, mutagénicité, cancérogénicité, toxicité pour la reproduction et pour certains organes cibles (H300 à H373).' },
        { faixa: 'H4xx', titulo: 'Dangers pour l’environnement', descricao: 'toxicité pour les organismes aquatiques et pour la couche d’ozone (H400 à H420).' }
      ],
      sinal: { perigo: 'Danger', atencao: 'Attention' }
    },
    sobre: {
      titulo: 'À propos des données',
      intro: 'Chaque nombre affiché provient du jeu de données signé ou d’un calcul effectué sur votre appareil. L’IA dans le cloud, facultative, interprète seulement la question et ne fournit jamais de nombres.',
      pacote: 'Jeu de données', versao: 'Version', geradoEm: 'Généré le', assinatura: 'Signature numérique', origem: 'Origine', arquivos: 'Fichiers', arquivosValor: '{n} ({kb} Ko au total)',
      elementos: 'Éléments', compostos: 'Composés dans l’index', ultimaVerificacao: 'Dernière vérification', avisosCarga: 'Avertissements de chargement : {msgs}',
      dados: 'Données incluses', textos: 'Textes sous licence (explications)', externas: 'Références externes (liens)', licencasManifesto: 'Licences listées dans le manifeste',
      comoObtidos: 'Comment les valeurs sont obtenues',
      como: [
        'Éléments, composés, constantes et règles : fichiers JSON versionnés, avec SHA-256 vérifié et manifeste signé.',
        'Masse molaire, équilibrage, stœchiométrie, concentration, pH, gaz parfait et unités : code déterministe testé, sur votre appareil.',
        'Structure 2D : dessinée à partir du SMILES du jeu de données. Pictogrammes SGH : dessins simplifiés réalisés pour cette application.',
        'Extraits d’explication : cités avec leur source et leur licence ; les traductions automatiques sont signalées comme telles.',
        'Propriétés physiques des composés (fusion, ébullition, densité, solubilité dans l’eau, pKa) : de Wikidata, chaque valeur avec sa déclaration et la référence qu’elle cite ; l’état physique à 25 °C est déduit des points de fusion et d’ébullition.'
      ],
      bibliotecas: 'Bibliothèques open source',
      rodape: 'SaibaTudo est indépendant et open source (MIT). ', privacidade: 'Politique de confidentialité',
      mantenedor: 'Responsable : {x}', licenca: 'Licence : {x}', acessadoEm: 'Consulté le : {x}', atribuicao: 'Attribution : {x}', uso: 'Usage : {x}',
      somenteLink: 'lien uniquement',
      referencias: {
        openstax: 'Manuel ouvert avec restrictions d’usage : suggéré en lecture ; aucun extrait n’a été copié.',
        icsc: 'Fiches par substance ; le bouton « Fiche ICSC sur le site de l’OIT » ouvre la recherche par numéro CAS.',
        nist: 'Données thermochimiques et spectres ; suggéré comme référence.',
        libretexts: 'Textes ouverts de chimie ; suggérés en lecture complémentaire.'
      },
      bibliotecasUso: { katex: 'Formules et étapes de calcul', smiles: 'Structure 2D des molécules', poppins: 'Police des titres' },
      assinaturaRotulo: {
        verificada: 'vérifiée (ECDSA P-256 avec la clé publique de l’application)',
        invalida: 'ne correspond PAS : les données propres au site restent utilisées, mais elles n’ont pas été authentifiées',
        indisponivel: 'n’a pas pu être vérifiée dans ce navigateur (WebCrypto exige HTTPS)'
      },
      origemRotulo: {
        verificada: 'site (signature numérique vérifiée)', invalida: 'site (signature NON vérifiée)', indisponivel: 'site (vérification indisponible dans ce navigateur)',
        atualizada: 'mise à jour vérifiée (signature numérique)'
      },
      sigDetalhe: { invalida: 'La signature du manifeste ne correspond pas ; utilisation des fichiers propres au site.', indisponivel: 'Le navigateur n’offre pas WebCrypto dans ce contexte (utilisez HTTPS).' },
      atualizacao: {
        botao: 'Vérifier les mises à jour des données', verificando: 'Vérification…', atual: 'Les données sont déjà à la dernière version.', atualizado: 'Données mises à jour vers la version {version}.',
        ignorado: 'Rien à faire : {motivo}', falha: 'Vérification impossible pour le moment ({motivo}).',
        motivos: {
          semVerificacao: 'vérification de la signature indisponible (HTTPS requis)', assinaturaInvalida: 'signature du manifeste INVALIDE — mise à jour rejetée',
          maisAntigo: 'le jeu de données distant est plus ancien que le jeu actif (protection contre le retour en arrière)'
        }
      }
    },
    config: {
      titulo: 'Paramètres', salva: 'Préférence enregistrée sur cet appareil.', aparencia: 'Apparence', tema: 'Thème', tamanhoTexto: 'Taille du texte', idioma: 'Langue',
      idiomaAjuda: 'Modifie l’interface, les réponses et l’interpréteur de questions. Les noms et les textes qui n’existent pas encore dans la langue choisie apparaissent en anglais ou en portugais, toujours signalés.',
      instalar: 'Installer', jaInstalado: 'L’application est déjà installée sur cet appareil.', instalarApp: 'Installer l’application',
      ia: 'Intelligence artificielle dans le cloud',
      iaAviso: 'Facultative et désactivée par défaut. Elle interprète seulement la question : la réponse provient toujours des données et des calculs de cet appareil, et aucun nombre ne provient du modèle. Lorsque vous touchez « Demander à l’IA dans le cloud », seuls le texte de cette question et un identifiant aléatoire propre à cette installation sont envoyés à notre serveur. Pour une question de suite (« et pour le potassium ? »), l’interprétation de la question précédente est aussi envoyée, sans son texte.',
      nuvemAutomatica: 'IA dans le cloud automatique',
      nuvemAutomaticaAjuda: 'Lorsque l’application ne comprend pas une question, elle l’envoie à l’IA dans le cloud sans demander votre accord. Seul le texte de la question est envoyé ; les réponses proviennent toujours des données. Pour une question de suite (« et pour le potassium ? »), l’interprétation de la question précédente est aussi envoyée, sans son texte.',
      dados: 'Données', versaoPacote: 'Version du jeu de données', assinatura: 'Signature',
      assinaturaValor: { verificada: 'vérifiée', invalida: 'NON vérifiée', indisponivel: 'indisponible dans ce navigateur' },
      privacidade: 'Confidentialité', privacidadeTexto: 'Nous ne conservons sur cet appareil que le thème, la taille du texte et la langue, ainsi que le cache pour l’usage hors ligne. ', politica: 'Politique de confidentialité',
      apagar: 'Effacer les données de cet appareil', confirmar: 'Touchez à nouveau pour confirmer', apagados: 'Données effacées. Rechargement…'
    }
  },

  propriedades: {
    rotulos: {
      numeroAtomico: 'numéro atomique', massaAtomica: 'masse atomique', simbolo: 'symbole', grupo: 'groupe (famille)', periodo: 'période', bloco: 'bloc', categoria: 'catégorie',
      configuracaoEletronica: 'configuration électronique', eletronegatividade: 'électronégativité (Pauling)', raioAtomicoPm: 'rayon atomique (van der Waals)',
      afinidadeEletronicaKJmol: 'affinité électronique', energiaIonizacaoKJmol: 'énergie d’ionisation', pontoFusaoK: 'point de fusion', pontoEbulicaoK: 'point d’ébullition',
      densidadeKgm3: 'densité', estadoPadrao: 'état physique (conditions standard)', estadosOxidacao: 'nombres d’oxydation', descoberta: 'découverte',
      massaMolar: 'masse molaire', massaExata: 'masse exacte (monoisotopique)', formula: 'formule', cas: 'numéro CAS', cid: 'CID PubChem', smiles: 'SMILES', inchiKey: 'InChIKey',
      nomeIupac: 'nom IUPAC', xlogp: 'XLogP (lipophilie calculée)', doadoresH: 'donneurs de liaison hydrogène', aceptoresH: 'accepteurs de liaison hydrogène',
      ligacoesRotaveis: 'liaisons rotatives', carga: 'charge électrique', tpsa: 'surface polaire (TPSA)', solubilidade: 'solubilité dans l’eau', pka: 'pKa',
      entalpiaFormacaoKJmol: 'enthalpie standard de formation',
      energiaGibbsFormacaoKJmol: 'enthalpie libre standard de formation', entropiaPadraoJmolK: 'entropie molaire standard', particulas: 'protons, neutrons et électrons'
    },
    medidas: {
      titulo: 'Propriétés physiques', intro: 'Valeurs mesurées, chacune avec sa source et les conditions de la mesure.',
      unidadeG100g: 'g/100 g d’eau', unidadeGL: 'g/L (dans l’eau)', pkaVarios: '{lista}',
      aTemperatura: 'à {k} K ({c} °C)', aPressao: 'à {pa} Pa ({atm} atm)', fase: 'phase : {fase}', referencia: 'référence : {x}',
      semReferencia: 'sans référence dans Wikidata',
      semReferenciaCorroborado: (p) => `sans référence dans Wikidata (${p.n} déclarations concordent)`,
      derivado: 'déduit des points de fusion et d’ébullition du jeu de données, à 25 °C et 1 atm', derivadoNome: 'SaibaTudo Química (valeur déduite)',
      fontePacote: 'jeu de données', revisar: 'valeur à vérifier',
      avisoRevisar: 'Valeur à vérifier : celle de PubChem est peut-être obsolète (elle diffère des tables actuelles) et Wikidata n’a pas cette propriété.',
      notaPauling: 'Échelle de Pauling, avec les valeurs révisées d’Allred (1961), comme dans PubChem ; les livres qui utilisent les valeurs originales de Pauling diffèrent pour quelques éléments.',
      notaPka: 'Plus petit pKa enregistré (première dissociation) ; pour les bases, Wikidata enregistre en général le pKa de l’acide conjugué, et les acides forts n’ont pas de pKa.',
      estadoA25: 'état physique à 25 °C et 1 atm',
      padrao298: 'état standard à 298,15 K (25 °C)', faseEstadoPadrao: 'phase : {fase} (état physique du composé à 25 °C)', campoChembox: 'champ {campo} de la chembox'
    },
    categorias: {
      metal_alcalino: 'métal alcalin', metal_alcalino_terroso: 'métal alcalino-terreux', metal_transicao: 'métal de transition', metal_pos_transicao: 'métal pauvre',
      semimetal: 'métalloïde', nao_metal: 'non-métal', halogenio: 'halogène', gas_nobre: 'gaz noble', lantanideo: 'lanthanide', actinideo: 'actinide',
      desconhecida: 'propriétés chimiques inconnues', metal: 'métal'
    },
    categoriasPlural: {
      metal_alcalino: 'métaux alcalins', metal_alcalino_terroso: 'métaux alcalino-terreux', metal_transicao: 'métaux de transition', metal_pos_transicao: 'métaux pauvres',
      semimetal: 'métalloïdes', nao_metal: 'non-métaux', halogenio: 'halogènes', gas_nobre: 'gaz nobles', lantanideo: 'lanthanides', actinideo: 'actinides', metal: 'métaux'
    },
    estados: { solido: 'solide', liquido: 'liquide', gas: 'gaz', desconhecido: 'inconnu' },
    descoberta: { em: 'en {ano}', por: 'par {por}' },
    classes: {
      acido: 'acide', acido_carboxilico: 'acide carboxylique', base: 'base', sal: 'sel', oxido: 'oxyde', hidroxido: 'hydroxyde', peroxido: 'peroxyde', oxidante: 'comburant',
      inorganico: 'composé inorganique', organico: 'composé organique', alcool: 'alcool', fenol: 'phénol', aldeido: 'aldéhyde', cetona: 'cétone', eter: 'éther', ester: 'ester', amina: 'amine', amida: 'amide',
      alcano: 'alcane', alqueno: 'alcène', alquino: 'alcyne', hidrocarboneto: 'hydrocarbure', aromatico: 'composé aromatique', heterociclico: 'composé hétérocyclique', halogenado: 'composé halogéné',
      carboidrato: 'glucide', aminoacido: 'acide aminé', lipidio: 'lipide', proteina: 'protéine', vitamina: 'vitamine', farmaco: 'médicament', solvente: 'solvant', polimero: 'polymère',
      gas: 'gaz', metal: 'métal', nitrocomposto: 'composé nitré', nitrila: 'nitrile', tiol: 'thiol', sulfonato: 'sulfonate', organometalico: 'composé organométallique', ionico: 'composé ionique',
      molecular: 'composé moléculaire', esteroide: 'stéroïde', alcaloide: 'alcaloïde', acido_forte: 'acide fort', base_forte: 'base forte', organoclorado: 'composé organochloré'
    },
    unidades: {
      kg: 'kilogramme', g: 'gramme', t: 'tonne', lb: 'livre', oz: 'once', 'µg': 'microgramme', m3: 'mètre cube', L: 'litre', cm3: 'centimètre cube', dm3: 'décimètre cube',
      'µL': 'microlitre', gal: 'gallon (US)', m: 'mètre', 'Å': 'ångström', in: 'pouce', ft: 'pied', mi: 'mile', Pa: 'pascal', bar: 'bar', atm: 'atmosphère', mmHg: 'millimètre de mercure',
      psi: 'livre-force par pouce carré', J: 'joule', cal: 'calorie thermochimique', eV: 'électronvolt', kWh: 'kilowattheure', K: 'kelvin', '°C': 'degré Celsius', '°F': 'degré Fahrenheit',
      s: 'seconde', min: 'minute', h: 'heure', d: 'jour', mol: 'mole', 'mol/L': 'mole par litre', 'mmol/L': 'millimole par litre', 'µmol/L': 'micromole par litre'
    }
  },

  respostas: {
    fontes: {
      app: 'SaibaTudo Química (cette application)',
      calculo: 'Calcul local par l’application, avec les données du jeu de données signé',
      pacote: 'Jeu de données',
      frasesPadrao: 'Mentions de danger : SGH de la CEE-ONU / CLP de l’ECHA',
      regras: 'regras.json (jeu de données signé)',
      politica: 'Politique de sécurité de l’application (règles locales)',
      pubchemCid: 'PubChem CID {cid} (NCBI/NLM)',
      chebi: 'ChEBI ({id})', chebiSem: 'ChEBI (EMBL-EBI)',
      constanteR: 'Calcul local avec la constante R du jeu de données (CODATA)',
      tabelaUnidades: 'Table des unités : {origem}',
      orientacaoGeral: 'Conseils généraux de l’application (pas des données sur une substance précise)',
      massasAtomicas: 'Masses atomiques du jeu de données (elementos.json)',
      constantes: 'Constantes du jeu de données (constantes.json)',
      boyle: 'Calcul local par l’application, avec la table des unités du jeu de données',
      wikipedia: 'Wikipédia en {idioma}',
      trechoEm: 'Texte en {idioma} (pas encore traduit).',
      regrasNox: 'Règles des nombres d’oxydation des manuels (convention), appliquées par l’application',
      regraLigacao: 'Règle didactique de la différence d’électronégativité (échelle de Pauling ; seuils 0,4 et 1,7 par convention)',
      acaoDasMassas: 'Loi d’action de masse (règle), calcul local de l’application',
      particulas: 'Comptage par règle : protons = Z, électrons = Z − charge, neutrons = A − Z (nombre de masse moins numéro atomique)',
      distribuicao: 'Répartition électronique calculée par l’application à partir de la configuration du jeu de données (règle de Klechkowski)',
      substanciaSimples: 'Convention : ΔHf° = 0 pour un corps simple dans son état standard',
      entalpiaCalculo: 'Calcul local de l’application (loi de Hess), avec les ΔHf° du jeu de données'
    },
    unidades: {
      origem: { pacote: 'regras.json (jeu de données signé)', padrao: 'la table par défaut de l’application (définitions du SI)' },
      pKw: { regras: 'regras.json (jeu de données)', constantes: 'constantes.json (jeu de données)', convencao: 'convention à 25 °C (produit ionique de l’eau, pH + pOH = 14)' },
      constanteRDerivada: 'Constante universelle des gaz (N_A × k_B)'
    },
    sugestoes: {
      padrao: [
        'Quelle est la masse molaire de l’eau ?', 'Équilibrer Fe + O2 -> Fe2O3', 'pH de HCl 0,01 mol/L', 'Structure de l’aspirine', 'Dangers de l’acide sulfurique', 'Convertir 5 atm en kPa',
        'Combien de moles y a-t-il dans 18 g d’eau ?', 'Point de fusion du fer', 'Éléments du groupe 17', 'Qu’est-ce qu’une mole ?', 'Pourquoi ne faut-il pas mélanger l’hypochlorite de sodium et l’ammoniac ?'
      ],
      seguras: ['Quels EPI utiliser avec l’acide sulfurique ?', 'Premiers secours en cas de projection de soude caustique dans l’œil', 'Pourquoi ne faut-il pas mélanger l’hypochlorite de sodium et l’ammoniac ?'],
      massaAgua: 'Quelle est la masse molaire de l’eau ?', balancear: 'Équilibrer Fe + O2 -> Fe2O3', phHcl: 'pH de HCl 0,01 mol/L', perigosSulfurico: 'Dangers de l’acide sulfurique',
      converter: 'Convertir 5 atm en kPa', molsAgua: 'Combien de moles y a-t-il dans 18 g d’eau ?', fusaoFerro: 'Point de fusion du fer', grupo17: 'Éléments du groupe 17', periodo3: 'Éléments de la période 3',
      misturar: 'Pourquoi ne faut-il pas mélanger l’hypochlorite de sodium et l’ammoniac ?', fontes: 'Quelles sont les sources ?', origemDados: 'D’où viennent les données ?', massaMolarAgua: 'Masse molaire de l’eau',
      formulaSulfurico: 'Quelle est la formule de l’acide sulfurique ?', compareNaCl: 'Comparer le sodium et le chlore', maisEletronegativo: 'L’élément le plus électronégatif',
      molaridade: 'Molarité de 5,85 g de NaCl dans 500 mL', volumeGas: 'Quel est le volume de 2 moles de gaz à 300 K et 1 atm ?',
      fusaoDe: 'Point de fusion : {nome}', configuracaoDe: 'Configuration électronique : {nome}', massaMolarDe: 'Masse molaire : {nome}', estruturaDe: 'Structure : {nome}',
      perigosDe: 'Dangers : {nome}', densidadeDe: 'Densité : {nome}',
      noxSulfurico: 'Nombre d’oxydation du soufre dans H2SO4', ligacaoHCl: 'Type de liaison dans HCl', kcAmonia: 'Expression de Kc pour N2 + 3 H2 ⇌ 2 NH3', entalpiaHess: 'Enthalpie de réaction par la loi de Hess'
    },
    orientacaoGeral: [
      'Lisez l’étiquette et la fiche de données de sécurité (FDS) du produit avant de l’utiliser et suivez les instructions du fabricant.',
      'Portez des gants et des lunettes de protection adaptés au produit et travaillez dans un endroit ventilé.',
      'Ne mélangez pas les produits chimiques ; conservez-les dans leur contenant d’origine, bien fermé, hors de portée des enfants, des aliments et des sources de chaleur.',
      'En cas de contact avec la peau ou les yeux, rincez abondamment à l’eau courante ; en cas d’inhalation, sortez à l’air libre ; ne faites pas vomir sans avis professionnel.',
      'En cas d’intoxication ou d’accident, consultez un médecin ou le centre antipoison de votre région, en emportant l’emballage du produit.'
    ],
    blocos: {
      palavraSinal: 'Mention d’avertissement : {x}', estrutura2d: 'Structure 2D : {nome}', passoAPasso: 'Pas à pas', comoCalcular: 'Comment calculer', comoConverter: 'Comment convertir'
    },
    erro: { titulo: 'Je n’ai pas pu construire cette réponse', texto: 'Un problème est survenu pendant la lecture des données ({msg}). Réessayez ou utilisez les écrans de l’application.' },
    recusa: {
      tituloAutolesao: 'Vous n’êtes pas seul(e)', titulo: 'Je ne peux pas aider pour cette demande',
      padrao: 'Je ne peux pas vous aider pour cela. SaibaTudo Química ne fournit pas d’instructions de synthèse, de purification, de montée en échelle ni de recettes maison pour des explosifs, des armes chimiques, des drogues illicites, leurs précurseurs ou d’autres réactifs dangereux, car elles peuvent causer des morts et des blessures graves.',
      alternativas: 'Je peux vous aider sur la sécurité et les connaissances : dangers, équipements de protection individuelle (EPI), stockage, élimination et premiers secours pour une substance ; propriétés, formule, masse molaire et structure ; calculs et notions de chimie.',
      DANO_A_PESSOAS: 'Je ne peux pas vous aider pour cela. Je ne donne aucune indication pour blesser, empoisonner ou intoxiquer des personnes ou des animaux. Si quelqu’un est en danger ou a été exposé à une substance, contactez immédiatement un service d’urgence ou le centre antipoison de votre région.',
      AUTOLESAO: 'Je suis navré que vous traversiez cette épreuve. Je ne peux pas donner d’indications sur ce sujet, mais vous n’êtes pas seul(e) : contactez dès maintenant une personne de confiance et un service d’urgence de votre région. Au Brésil, le Centro de Valorização da Vida (CVV) écoute toute personne, gratuitement et de façon confidentielle, sur https://cvv.org.br ; ailleurs, cherchez la ligne d’écoute de crise de votre pays.',
      categorias: {
        EXPLOSIVOS: 'explosifs', ARMAS_QUIMICAS: 'armes chimiques', DROGAS: 'drogues illicites', PRECURSORES: 'précurseurs de drogues ou d’armes',
        REAGENTES_CASEIROS: 'recettes maison avec des réactifs dangereux', DANO_A_PESSOAS: 'atteinte aux personnes', AUTOLESAO: 'risque pour sa propre vie'
      }
    },
    ajuda: {
      titulo: 'Ce que fait SaibaTudo Química',
      texto: 'Je réponds aux questions de chimie avec des données ouvertes et des calculs effectués sur votre appareil : rien ne quitte votre téléphone ni votre ordinateur.',
      podePerguntar: 'Vous pouvez poser des questions sur',
      itens: [
        'les éléments et le tableau périodique (propriétés, groupes, périodes)', 'les composés (formule, masse molaire, structure 2D et dangers SGH)',
        'des calculs pas à pas : masse molaire, équilibrage, stœchiométrie, concentration et dilution, pH, gaz parfait et unités',
        'la sécurité : pictogrammes, mentions de danger et comment éviter les mélanges dangereux', 'des notions de base, avec des extraits cités de sources ouvertes'
      ],
      aviso: 'Je n’aide pas pour la synthèse, la purification ni les recettes d’explosifs, d’armes chimiques, de drogues illicites et d’autres réactifs dangereux.',
      tabela: 'Tableau périodique', calculadoras: 'Calculatrices'
    },
    sobreDados: {
      titulo: 'À propos des données de cette application', versao: 'Version du jeu de données', geradoEm: 'Généré le', assinatura: 'Signature numérique (ECDSA P-256)',
      sig: { verificada: 'vérifiée', invalida: 'NON vérifiée', indisponivel: 'n’a pas pu être vérifiée dans ce navigateur' },
      elementos: 'Éléments du jeu de données', compostos: 'Composés dans l’index', fontesListadas: 'Sources listées',
      texto: 'La liste complète des sources, des licences et des dates se trouve à l’écran « À propos des données ». Chaque valeur affichée provient du jeu de données signé ou d’un calcul local.',
      acao: 'Voir toutes les sources et licences'
    },
    fontesResp: { titulo: 'Sources des données', usa: 'Le jeu de données utilise', semLista: 'La liste des sources se trouve à l’écran « À propos des données ».', acao: 'À propos des données' },
    naoEntendi: {
      titulo: 'Je n’ai pas compris la question', comPergunta: 'Je n’ai pas compris « {q} ». Essayez de nommer un élément, un composé, une formule ou un calcul, par exemple :', semPergunta: 'Saisissez votre question, par exemple :',
      tabela: 'Tableau périodique', compostos: 'Rechercher des composés', calculadoras: 'Calculatrices'
    },
    elemento: {
      nomeEmIngles: 'Nom en anglais', titulo: '{nome} ({simbolo}), élément {z}', ficha: 'Fiche complète : {nome}', verTabela: 'Voir dans le tableau périodique'
    },
    composto: {
      nomePopular: 'Nom courant', nomeIupac: 'Nom IUPAC', formula: 'Formule', massaMolar: 'Masse molaire', cas: 'Numéro CAS', cid: 'CID PubChem', classes: 'Classes',
      perigosGhs: 'Dangers (SGH)', definicaoIngles: 'Définition en anglais.', ficha: 'Fiche complète', icsc: 'Fiche ICSC sur le site de l’OIT', icscDe: 'Fiche ICSC sur le site de l’OIT : {nome}'
    },
    propriedade: {
      deQual: 'De quelle substance ?',
      digaQualElemento: 'Indiquez l’élément ou le composé pour lequel vous voulez connaître : {props}. Par exemple : « point de fusion du fer ».',
      digaQualPropriedade: 'Indiquez la propriété et l’élément ou le composé. Par exemple : « densité de l’or ».',
      de: '{prop} ({nome})',
      outroTipo: (p) => `${p.prop} (cette propriété concerne les ${p.alvo === 'composto' ? 'composés' : 'éléments'} ; ${p.outros} ${p.n > 1 ? 'sont' : 'est'} d’un autre type)`,
      faltaTermo: '{simbolo} de {nome} manque dans le jeu de données ; l’application n’estime pas cette valeur.', naoTem: 'Le jeu de données ne contient pas : {lista}.', fichaDe: 'Fiche : {nome}', propriedadesDe: 'Propriétés : {nomes}',
      oferece: 'Pour {nome}, le jeu de données contient : {lista}.', solubilidadeDeQual: 'Indiquez le composé dont vous voulez la solubilité dans l’eau. Par exemple : « solubilité de l’urée ».'
    },
    massaMolar: {
      tituloElemento: 'Masse molaire : {nome} ({simbolo})', deAtomos: 'Masse molaire : {nome} (atomes)',
      avisoMolecular: 'Pour un élément moléculaire, comme O₂ ou N₂, saisissez la formule : la masse molaire est la masse de l’atome multipliée par le nombre d’atomes de la molécule.',
      abrirCalculadora: 'Ouvrir dans la calculatrice', deQue: 'Masse molaire de quoi ?',
      digite: 'Saisissez la formule ou le nom de la substance. Par exemple : « masse molaire de l’eau » ou « masse molaire de Ca(OH)2 ».', calculadora: 'Calculatrice de masse molaire',
      naoConsegui: 'Je n’ai pas pu calculer la masse molaire', composicao: 'Composition massique', referencia: 'Valeur de référence', pubchemInforma: 'PubChem indique',
      titulo: (p) => `Masse molaire${p.nome ? ` : ${p.nome}` : ''} (${p.formula})`
    },
    balancear: {
      titulo: 'Équilibrage d’équations',
      digite: 'Saisissez l’équation avec les réactifs, une flèche et les produits. Par exemple : Fe + O2 -> Fe2O3. Les ions fonctionnent aussi : Zn + Cu2+ -> Zn2+ + Cu.',
      abrir: 'Ouvrir la calculatrice', naoConsegui: 'Je n’ai pas pu l’équilibrer', ajustar: 'Ajuster dans la calculatrice', balanceada: 'Équation équilibrée',
      coeficientesIgnorados: 'Les coefficients saisis ont été ignorés : l’application équilibre toute l’équation.', abrirNa: 'Ouvrir dans la calculatrice'
    },
    estequiometria: {
      abrir: 'Ouvrir la calculatrice de stœchiométrie', faltam: 'Les quantités manquent',
      digaCadaReagente: 'Indiquez la quantité de chaque réactif avec son nom ou sa formule, par exemple « 4 g de H2 et 16 g de O2 ».',
      informePeloMenos: 'Indiquez la quantité d’au moins un réactif, par exemple « 4 g de H2 et 16 g de O2 ».', naoConsegui: 'Je n’ai pas pu calculer',
      titulo: 'Stœchiométrie : {equacao}', particulas: 'particules', tituloQuantidade: '{valor} {unidade} de {formula}', abrirNa: 'Ouvrir dans la calculatrice',
      volumeTitulo: 'Volume de {valor} {unidade} d’un gaz parfait aux CNTP', volumeCntp: 'Volume aux CNTP (0 °C et 1 atm)', volumeMolar: 'Volume molaire (RT/P)',
      passoVolume: 'D’après l’équation des gaz parfaits, le volume molaire est Vm = RT/P, avec T = 0 °C et P = 1 atm ; multipliez par la quantité de matière.',
      abrirGas: 'Ouvrir la calculatrice des gaz parfaits', tituloGeral: 'Stœchiométrie',
      explicacao: 'Pour convertir masse, moles, particules et volume, indiquez la quantité et la substance, par exemple « combien de moles y a-t-il dans 18 g d’eau ? ». Pour le réactif limitant, écrivez l’équation et les quantités.'
    },
    concentracao: {
      abrir: 'Ouvrir la calculatrice', titulo: 'Concentration et dilution',
      diga: 'Indiquez les valeurs avec leurs unités. Exemples : « molarité de 5,85 g de NaCl dans 500 mL », « combien de grammes de NaOH pour 250 mL de solution à 0,1 mol/L » ou « diluer 100 mL de solution à 2 mol/L à 0,5 mol/L ».',
      naoConsegui: 'Je n’ai pas pu calculer', padrao: 'Concentration',
      modos: { molaridade: 'Molarité de la solution', massa: 'Masse de soluté nécessaire', 'gl-mol': 'Conversion g/L ↔ mol/L', 'percentual-mm': 'Pourcentage massique', 'percentual-mv': 'Pourcentage masse/volume', diluicao: 'Dilution' }
    },
    ph: {
      abrir: 'Ouvrir la calculatrice de pH', conversoes: 'Conversions à partir de {de} = {valor}', titulo: 'pH d’une solution',
      informe: 'Indiquez la concentration en mol/L et la substance. Exemples : « pH de HCl 0,01 mol/L » ou « pH de l’acide acétique 0,1 mol/L avec Ka 1,8e-5 ».',
      maisDados: 'Il me faut plus de données pour le pH', naoTenho: 'Je n’ai pas « {formula} » dans la liste des acides et des bases forts du jeu de données. ',
      fracos: 'Pour les acides et les bases faibles, indiquez Ka (ou pKa) ou Kb (ou pKb) ; pour les forts, écrivez la formule, par exemple HCl ou NaOH.',
      parcial: 'Seule la 1re ionisation est forte ; la 2e est partielle et a été ignorée (approximation).', naoConsegui: 'Je n’ai pas pu calculer le pH',
      tituloResultado: (p) => `pH ${p.ph}${p.formula ? ` (${p.formula} ${p.conc} mol/L)` : ''}`
    },
    gas: {
      abrir: 'Ouvrir la calculatrice des gaz parfaits', tituloEquacao: 'Gaz parfait : PV = nRT', naEquacao: 'Dans l’équation',
      variaveis: 'P est la pression, V le volume, n la quantité de matière (en moles) et T la température absolue (en kelvins).',
      constante: 'R est la constante universelle des gaz : {valor} J/(mol·K), valeur du jeu de données ({fonte}).', constanteSem: 'R est la constante universelle des gaz.',
      informeTres: 'Indiquez trois des quatre grandeurs avec leurs unités et je calcule la quatrième, avec les étapes.', tituloFalta: 'Gaz parfait (PV = nRT)',
      informeTresEx: 'Indiquez trois des quatre grandeurs (pression, volume, quantité de matière et température) avec leurs unités. Exemple : « quel est le volume de 2 moles de gaz à 300 K et 1 atm ? ».',
      naoConsegui: 'Je n’ai pas pu calculer'
    },
    conversao: {
      abrir: 'Ouvrir le convertisseur d’unités', titulo: 'Conversion d’unités', diga: 'Indiquez la valeur, l’unité et l’unité souhaitée. Exemple : « convertir 5 atm en kPa ».',
      naoConsegui: 'Je n’ai pas pu convertir', em: '{valor} {de} en {para}'
    },
    nomenclatura: {
      titulo: 'Nomenclature', naoEncontreiFormula: 'Je n’ai pas trouvé « {formula} » parmi les composés du jeu de données.', naoEncontrei: 'Je n’ai pas trouvé ce composé.', tente: ' Essayez le nom courant ou la formule.',
      buscar: 'Rechercher des composés', nome: 'Nom', nomePopular: 'Nom courant', nomeIupac: 'Nom IUPAC', formula: 'Formule', formulaHill: 'Formule en notation de Hill',
      observacao: 'Remarque', ptPendente: 'Le nom en portugais est encore en attente ; le nom affiché est le nom IUPAC.', ficha: 'Fiche complète'
    },
    desenhar: {
      estruturaDe: 'Structure : {nome}', semSmiles: 'Le jeu de données ne contient pas de SMILES pour ce composé : je ne peux donc pas dessiner la structure.', ficha: 'Fiche complète',
      estrutura2d: 'Structure 2D : {nome}', smiles: 'SMILES', formula: 'Formule'
    },
    comparar: {
      titulo: 'Comparaison : {nomes}', propriedade: 'Propriété', fichaDe: 'Fiche : {nome}',
      linhas: { formula: 'Formule', massaMolar: 'Masse molaire', cas: 'Numéro CAS', nomeIupac: 'Nom IUPAC', xlogp: 'XLogP', sinal: 'Mention d’avertissement (SGH)', pictogramas: 'Pictogrammes (SGH)' },
      maior: '{prop} : plus élevé pour {nome} ({valor}).', maisNegativo: '{prop} : le plus négatif pour {nome} ({valor}).',
      ordemCrescente: '{prop}, par ordre croissant : {lista}.', ordemDecrescente: '{prop}, par ordre décroissant : {lista}.', semDadoOrdem: 'Absent du paquet de données : {nomes}.', tituloGeral: 'Comparer', explicacao: 'Comparez des éléments de même nature : deux éléments (« comparer le sodium et le chlore ») ou deux composés (« différence entre l’éthanol et l’acide acétique »).'
    },
    tabela: {
      abrir: 'Ouvrir le tableau périodique', naoTemProp: 'Le jeu de données ne contient aucune valeur de « {prop} » pour les éléments chargés.',
      extremo: (p) => `${p.dir === 'max' ? 'Maximum' : 'Minimum'} dans le jeu de données — ${p.prop} : ${p.nome} (${p.simbolo})`,
      entreOs: 'Parmi les {n} éléments disposant de cette donnée dans le jeu de données', elemento: 'Élément', simbolo: 'Symbole', nome: 'Nom', numero: 'N°',
      grupo: 'groupe {g}', periodo: 'période {p}', bloco: 'bloc {b}', estado: 'état {estado}', elementos: 'Éléments : {criterios}', titulo: 'Tableau périodique',
      pacoteTem: (p) => `Le jeu de données contient ${p.n} ${p.n > 1 ? 'éléments organisés' : 'élément organisé'} par groupe, période et bloc, avec des couleurs par catégorie. Touchez un élément pour voir sa fiche complète.`,
      nenhum: 'Aucun élément du jeu de données ne répond à ces critères.', destacar: 'Mettre en évidence dans le tableau périodique', comContagem: '{titulo} ({n})',
      tendencia: 'Tendance : {prop}', tendenciaTexto: 'Valeurs du jeu de données le long d’une période et d’un groupe ; comparez les lignes pour voir la tendance.',
      periodoLegenda: 'Période {p}, de gauche à droite (numéro atomique croissant)', grupoLegenda: 'Groupe {g}, de haut en bas (période croissante)',
      colGrupo: 'Groupe', colPeriodo: 'Période', naoTemSuficiente: 'Le jeu de données ne contient pas assez de valeurs de « {prop} » pour les éléments d’une même période ou d’un même groupe.'
    },
    seguranca: {
      naoMisture: 'Ne mélangez pas ces deux produits : {a} et {b}. {motivo}',
      naoMistureGeral: 'Ne mélangez pas ces deux produits : {a} et {b}. Mélanger des produits chimiques peut dégager de la chaleur, des gaz toxiques ou provoquer d’autres réactions dangereuses. Voyez ci-dessous les dangers de chacun et ne mélangez jamais des produits d’entretien.',
      semGhs: 'Le jeu de données ne contient aucune classification de danger SGH (harmonisée) pour ce composé ({nome}). Cela ne veut pas dire qu’il soit inoffensif : consultez la fiche de données de sécurité du produit.',
      perigosDe: 'Dangers (SGH) : {nome}',
      elementoSemGhs: 'Le jeu de données ne contient des classifications de danger SGH que pour les composés, pas pour l’élément {nome}. Les dangers dépendent de la forme chimique (par exemple la vapeur du métal ou un sel) : consultez la fiche de données de sécurité du produit.',
      orientacao: 'Conseils généraux de sécurité', naoIdentifiquei: 'Je n’ai pas identifié la substance. Indiquez son nom ou sa formule pour voir les dangers SGH, ou suivez les conseils généraux ci-dessous.',
      comoLer: 'Comment lire les pictogrammes et les mentions H', titulo: 'Sécurité : {alvo}', tituloGeral: 'Sécurité chimique', eConector: ' et '
    },
    particulas: {
      titulo: '{especie} : {protons}, {neutrons} et {eletrons}',
      tituloAprox: '{especie} : {protons}, {eletrons} et environ {neutrons}',
      contProtons: (p) => (Number(p.n) === 1 ? '1 proton' : `${p.n} protons`),
      contNeutrons: (p) => (Number(p.n) === 1 ? '1 neutron' : `${p.n} neutrons`),
      contEletrons: (p) => (Number(p.n) === 1 ? '1 électron' : `${p.n} électrons`),
      especie: 'Espèce',
      protons: 'Protons (Z)',
      eletrons: 'Électrons',
      neutrons: 'Neutrons',
      numeroMassa: 'Nombre de masse (A)',
      atomoNeutro: 'atome neutre ({nome})',
      cation: 'cation {ion} ({nome})',
      anion: 'anion {ion} ({nome})',
      isotopo: 'isotope {iso}',
      eletronsNeutro: 'atome neutre : égal à Z',
      neutronsAprox: 'environ {n}',
      numeroMassaAprox: 'environ {a}',
      aproxMassa: 'approché par la masse atomique, {m}',
      avisoAprox: 'Nombre de masse approché par la masse atomique ({m} → {a}) ; le nombre de neutrons dépend de l’isotope. Pour un isotope précis, demandez par exemple : « neutrons du {simbolo}-{a} ».',
      semMassa: 'Le jeu de données n’a pas la masse atomique de {nome} : sans nombre de masse, les neutrons ne sont pas calculés.',
      cargaInvalida: 'Une charge de {carga} retirerait plus d’électrons que {nome} n’en possède ({z}) : cet ion n’existe pas.',
      linhaIon: 'Ion {ion} ({tipo}) : {eletrons} ({conta}).',
      linhaIsotopo: 'Isotope {iso} : {protons} et {neutrons} ({conta}).',
      tipoCation: 'cation',
      tipoAnion: 'anion'
    },
    constanteEquilibrio: {
      titulo: 'Constante d’équilibre (Kc et Kp)',
      explicacao: 'La constante d’équilibre Kc est le rapport des concentrations à l’équilibre (mol/L) des produits sur celles des réactifs, chacune élevée à son coefficient dans l’équation équilibrée : pour aA + bB ⇌ cC + dD, Kc = [C]^c·[D]^d / ([A]^a·[B]^b). Seuls les gaz et les espèces en solution aqueuse y figurent ; les solides et liquides purs en sont exclus. Kp est la même expression avec les pressions partielles des gaz, et les deux sont reliées par Kp = Kc·(RT)^Δn, où Δn est la variation de la quantité de gaz (produits − réactifs) et T la température en kelvins. La valeur de K ne dépend que de la température.',
      equacao: 'Donnez-moi l’équation (ex. : N2 + 3 H2 ⇌ 2 NH3) et j’écris l’expression.',
      temperatura: 'La température de la question ({t} K) est déjà saisie dans la calculatrice.'
    },
    conceito: {
      semTexto: 'Je n’ai pas encore de texte à ce sujet',
      naoEncontrei: 'Je n’ai pas trouvé, parmi les extraits sous licence du jeu de données, d’explication pour « {termo} ». Les données des éléments et des composés et les calculatrices restent disponibles.',
      traducaoAutomatica: 'Traduction automatique, pas encore relue par une personne.', emIngles: 'Texte en anglais (pas encore traduit).', padrao: 'Notion'
    },
    equacaoErros: {
      semSeta: 'Je n’ai pas trouvé la flèche de la réaction. Écrivez réactifs -> produits, par exemple : N2 + 3 H2 ⇌ 2 NH3.', duasSetas: 'L’équation contient plus d’une flèche. Saisissez une réaction à la fois.',
      lado: 'Il manque un côté de l’équation (réactifs ou produits).', eletron: 'Les demi-équations (avec des électrons) ne servent pas à ce calcul : utilisez l’équation complète.',
      formula: 'L’équation contient une formule invalide.', balancear: 'Je n’ai pas pu équilibrer l’équation.', expressao: 'Je n’ai pas pu établir l’expression.'
    },
    nox: {
      titulo: 'Nombres d’oxydation dans {formula}', tituloElemento: 'Nombre d’oxydation ({el}) dans {formula} : {nox}', deQual: 'Nombres d’oxydation de quel composé ?',
      digite: 'Donnez la formule (avec la charge, pour un ion). Exemples : « nombre d’oxydation du soufre dans H2SO4 », « nombre d’oxydation du Mn dans MnO4- », « nombre d’oxydation du chrome dans Cr2O7 2- ».',
      naoConsegui: 'Je n’ai pas pu déterminer les nombres d’oxydation', hidrato: 'Les hydrates ne sont pas traités ici : saisissez la formule sans l’eau de cristallisation.',
      indeterminado: 'Indéterminé par les règles : aucune règle ne fixe le nombre d’oxydation de {lista}. Utilisez la formule développée (liaison par liaison) pour l’attribuer.',
      inconsistente: 'Les règles donnent une somme de {soma}, différente de la charge {carga} : vérifiez la formule et la charge.',
      semDados: 'Le jeu de données ne contient pas l’électronégativité de : {lista}.', medio: 'nombre d’oxydation moyen',
      regras: {
        substanciaSimples: 'corps simple : 0', ionMonoatomico: 'ion d’un seul élément : charge ÷ atomes', fluor: 'fluor : toujours −1', grupo1: 'groupe 1 : +1', grupo2: 'groupe 2 : +2',
        aluminio: 'aluminium : +3', hidrogenio: 'hydrogène : +1', hidretoMetalico: 'hydrure métallique : H −1', oxigenio: 'oxygène : −2', peroxido: 'peroxyde : O −1',
        superoxido: 'superoxyde : O −1/2', halogenio: 'halogène le plus électronégatif du composé : −1', eletronegatividade: 'le plus électronégatif reçoit la valeur négative habituelle de son groupe',
        balanco: 'par le bilan (somme des nombres d’oxydation = charge)'
      },
      passoRegras: 'Appliquez les règles dans l’ordre (corps simple, ion, F, groupes 1 et 2, Al, H, O, halogènes) ; l’élément restant découle du bilan.',
      passoSoma: 'La somme des nombres d’oxydation multipliés par le nombre d’atomes est égale à la charge ({carga}) :',
      avisoMedio: 'Une valeur fractionnaire est un nombre d’oxydation moyen : les atomes de cet élément peuvent avoir des nombres d’oxydation différents (voir la formule développée).',
      elementoAusente: '{el} n’apparaît pas dans {formula}.', abrir: 'Ouvrir la calculatrice de nombres d’oxydation'
    },
    ligacao: {
      titulo: 'Type de liaison : {alvo}', deQual: 'Quelle liaison voulez-vous classer ?', digite: 'Donnez la formule ou deux éléments. Exemples : « type de liaison dans NaCl », « quelle liaison entre H et Cl ».',
      naoConsegui: 'Je n’ai pas pu classer la liaison', semCategoria: 'Le jeu de données ne contient pas la catégorie (métal ou non-métal) de : {lista}.',
      semEletronegatividade: 'Le jeu de données ne contient pas l’électronégativité de : {lista}.', semElemento: 'Absent du jeu de données : {lista}.',
      semEntrada: 'Donnez la formule ou deux éléments.',
      tipos: { metalica: 'métallique', ionica: 'ionique', covalentePolar: 'covalente polaire', covalenteApolar: 'covalente apolaire', nenhuma: 'ne forme pas de liaison dans les conditions usuelles (gaz noble)' },
      delta: 'ΔEN = {d} ({a} : {ea} ; {b} : {eb})', metalMetal: 'métal avec métal',
      convencao: 'Règle didactique : métal avec métal → métallique ; métal avec non-métal et ΔEN ≥ 1,7 → ionique ; 0,4 ≤ ΔEN < 1,7 → covalente polaire ; ΔEN < 0,4 → covalente apolaire. Les seuils 0,4 et 1,7 sont une convention (échelle de Pauling) ; les métalloïdes comptent comme non-métaux.',
      estimado: 'Avec trois éléments ou plus, les paires ont été estimées à partir de la formule (chaque métal et chaque non-métal avec le non-métal le plus électronégatif) ; la structure réelle peut avoir d’autres liaisons.',
      polaridadeMolecula: 'La polarité de la molécule dépend aussi de sa géométrie : des liaisons polaires peuvent s’annuler (comme dans CO₂, qui est apolaire).',
      abrir: 'Ouvrir la calculatrice de type de liaison'
    },
    equilibrio: {
      titulo: 'Équilibre : {equacao}', deQual: 'Équilibre de quelle réaction ?',
      digite: 'Écrivez l’équation avec ⇌ (ou <=>, ->). Exemples : « expression de Kc pour N2 + 3 H2 ⇌ 2 NH3 », « Kc de N2 + 3 H2 ⇌ 2 NH3 avec [N2] = 0,5 mol/L, [H2] = 1,5 mol/L et [NH3] = 0,2 mol/L ».',
      naoConsegui: 'Je n’ai pas pu établir l’expression de l’équilibre', balanceada: 'L’équation a d’abord été équilibrée : {equacao}.',
      semSolidoLiquido: 'Les solides et liquides purs n’apparaissent pas dans l’expression : {lista}.', gasPorHipotese: 'Sans état physique indiqué ni donnée dans le jeu de données, j’ai considéré ces espèces comme gazeuses : {lista}.',
      faseDoPacote: 'État physique tiré du jeu de données (conditions standard) : {lista}.', faseNaTemperatura: 'État physique à {t} K d’après les points de fusion et d’ébullition du jeu de données : {lista}.', deltaN: 'Δn (gaz) : produits − réactifs',
      kc: 'Kc', kp: 'Kp', fatorRT: '(RT)^Δn', temperatura: 'Température', unidadeKc: 'concentrations en mol/L',
      faltam: 'Il manque les concentrations à l’équilibre de : {lista}. Sans elles, seule l’expression de Kc est donnée.', invalida: 'Les concentrations doivent être supérieures à zéro.',
      passoKc: 'Remplacez les concentrations à l’équilibre (mol/L) dans l’expression :', passoKp: 'Kp = Kc·(RT)^Δn, avec R = {R} L·atm/(mol·K) et T en kelvins :',
      semT: 'Pour la valeur de Kp, donnez la température (par exemple « à 500 K »).', semR: 'La constante R n’est pas dans le jeu de données (constantes.json).',
      abrir: 'Ouvrir la calculatrice de Kc et Kp'
    },
    entalpia: {
      tituloReacao: 'Enthalpie de réaction : {equacao}', tituloCombustao: 'Enthalpie de combustion : {nome}', tituloHess: 'Enthalpie de réaction (loi de Hess)', tituloHessResultado: 'Loi de Hess',
      tituloAmostra: 'Chaleur de l’échantillon', naoConsegui: 'Je n’ai pas pu calculer l’enthalpie',
      digite: 'Donnez la réaction ou le composé. Exemples : « ΔH de la combustion du méthane », « variation d’enthalpie de 2 H2 + O2 -> 2 H2O ». Pour la loi de Hess (plusieurs équations avec ΔH), utilisez la calculatrice.',
      hess: 'La loi de Hess additionne des équations connues (multipliées par un facteur ou inversées) jusqu’à obtenir la réaction voulue, et les ΔH s’additionnent de la même façon. Dans la calculatrice, vous saisissez l’équation cible et jusqu’à 4 équations avec leur ΔH, et l’application trouve la combinaison.',
      falta: 'Le jeu de données ne contient pas l’enthalpie standard de formation (ΔHf°) de : {lista}. Sans cette donnée, ΔH n’est pas calculé (aucune valeur n’est inventée).',
      expressao: 'ΔH° = Σ n·ΔHf°(produits) − Σ n·ΔHf°(réactifs) :', passoSoma: 'Avec les valeurs du jeu de données (kJ/mol) :',
      valores: 'Enthalpies standard de formation utilisées (298,15 K)', dHfDe: 'ΔHf° de {formula}', semValor: 'pas de valeur dans le jeu de données',
      simples: '0 (corps simple dans son état standard, par définition)', resultado: 'ΔH° de la réaction', porMol: 'ΔH° de combustion par mole ({nome})',
      amostra: 'Chaleur pour {valor} {unidade} ({nome})', passoAmostra: 'Quantité de matière de l’échantillon : n = {mol} mol ; la chaleur est l’avancement de la réaction multiplié par ΔH :',
      semMol: 'Je n’ai pas pu convertir la quantité donnée en moles.',
      exotermica: 'ΔH < 0 : réaction exothermique (libère de la chaleur).', endotermica: 'ΔH > 0 : réaction endothermique (absorbe de la chaleur).',
      combustaoCompleta: 'Combustion complète, avec les produits dans leur état standard (CO₂, H₂O, N₂, SO₂).', balanceada: 'L’équation a d’abord été équilibrée : {equacao}.',
      naoQueima: 'Ici, la combustion complète ne s’applique qu’aux composés de C, H, O, N et S.',
      hessAlvo: 'Équation cible : {msg}', hessEquacao: 'Équation {n} : {msg}', naoBalanceada: 'L’équation {n} n’est pas équilibrée telle qu’elle est écrite.',
      semDH: 'Il manque le ΔH de l’équation {n}.', semCombinacao: 'Aucune combinaison des équations données ne permet d’obtenir la réaction cible.',
      hessPasso: 'Équation {n} × {fator} : ΔH = {dH} kJ', hessInvertida: 'Équation {n} inversée, × {fator} : ΔH = {dH} kJ', hessSoma: 'Additionnez les ΔH des équations combinées :',
      hessResultado: 'ΔH de la réaction cible', abrir: 'Ouvrir la calculatrice d’enthalpie', abrirHess: 'Ouvrir la calculatrice (Hess)'
    },
    eletronica: {
      titulo: 'Configuration électronique : {nome}', tituloIon: 'Configuration électronique de l’ion {simbolo} ({carga})', deQual: 'Configuration électronique de quel élément ?',
      digite: 'Donnez l’élément (symbole ou nom), par exemple « configuration électronique du fer ».',
      pacote: 'Configuration dans le jeu de données', completa: 'Notation complète (ordre de remplissage, Klechkowski)', camadasOrdem: 'Dans l’ordre des couches',
      porCamada: 'Électrons par couche', camadaValencia: 'Couche de valence', camadaValenciaValor: '{camada} (n = {n}), {e} électron(s)',
      eletronsValencia: 'Électrons de valence', valenciaTransicao: '{e} (convention pour les métaux de transition : ns + (n−1)d)', valenciaF: '{e} (convention : ns + (n−1)d + (n−2)f)',
      maisEnergetico: 'Sous-couche de plus haute énergie', bloco: 'Bloc',
      totalDiferente: 'La configuration du jeu de données totalise {total} électrons, mais le numéro atomique est {z} : la répartition n’a pas été calculée (la donnée n’est pas corrigée à la main).',
      semConfiguracao: 'Le jeu de données ne contient pas la configuration électronique de l’élément {nome}.', cargaInvalida: 'Charge invalide pour l’élément {nome}.',
      ignorados: 'Remarque du jeu de données : {lista}.', abrir: 'Ouvrir la calculatrice de configuration électronique'
    },
    calc: {
      formula: {
        vazia: 'Formule vide', quantidadeInvalida: 'Indice non valide « {x} »', quantidadeGrande: 'Indice trop grand', fechaSemAbre: 'Parenthèse « ) » sans « ( » correspondante',
        abreSemFecha: 'Parenthèse « ( » sans « ) » correspondante', vazios: 'Parenthèses vides', naoSimbolo: '« {x} » n’est pas un symbole d’élément',
        minuscula: 'Lettre minuscule « {c} » mal placée (les symboles commencent par une majuscule, comme dans « Na » et « Cl »)', inesperado: 'Caractère inattendu « {c} »', parteVazia: 'Partie vide (vérifiez le « · » de l’hydrate)'
      },
      balancear: {
        digite: 'Saisissez l’équation, par exemple : Fe + O2 -> Fe2O3', semSeta: 'Je n’ai pas trouvé la flèche de réaction. Écrivez réactifs -> produits, par exemple : H2 + O2 -> H2O',
        duasSetas: 'L’équation contient plus d’une flèche. Saisissez une réaction à la fois.', faltam: 'Il manque les {lado} de l’équation', reagentes: 'réactifs', produtos: 'produits',
        substancia: 'Substance « {corpo} » : {msg}', grande: 'Équation trop grande (maximum de 40 substances).',
        soDeUmLado: (p) => `L’élément ${p.el} apparaît seulement ${p.lado === 'r' ? 'dans les réactifs' : 'dans les produits'} : vérifiez les formules ou ajoutez la substance manquante.`,
        semCombinacao: 'Aucune combinaison de coefficients n’équilibre cette équation. Vérifiez les formules et les charges.',
        varias: 'L’équation combine plus d’une réaction indépendante : il existe donc plusieurs façons de l’équilibrer. Saisissez une réaction à la fois.',
        coefZero: 'Une substance recevrait un coefficient nul : elle ne participe pas à la réaction telle qu’elle est écrite. Vérifiez l’équation.',
        negativos: 'Les coefficients ne peuvent pas tous être positifs : l’équation, telle qu’elle est écrite, ne représente pas une réaction possible.', coefGrandes: 'Coefficients trop grands pour cette équation.',
        passo1: 'Attribuez à chaque substance un coefficient inconnu (des lettres) et écrivez l’équation avec ces coefficients.',
        passo2: (p) => `Pour chaque ${p.carga ? 'élément (et pour la charge électrique)' : 'élément'}, le nombre d’atomes doit être identique de part et d’autre :`, carga: 'charge',
        passo3: 'Résolvez le système (élimination de Gauss avec des fractions exactes) en fixant l’une des inconnues à 1 :',
        passo4: (p) => `${p.mmc ? `Multipliez tout par ${p.den} (le plus petit commun multiple des dénominateurs)` : 'Divisez par le plus grand commun diviseur'} pour obtenir les plus petits nombres entiers :`,
        passo4Ja: 'Les valeurs sont déjà les plus petits nombres entiers :', balanceada: 'Équation équilibrée :', conferencia: 'Vérification (réactifs = produits) : '
      },
      massa: {
        semMassa: 'Le jeu de données n’a pas de masse atomique pour : {lista}.',
        passo1: (p) => `Comptez les atomes de chaque élément dans la formule${p.hidrato ? ' (en ajoutant l’eau de cristallisation)' : ''} :`,
        passo2: 'Multipliez le nombre d’atomes par la masse atomique de chaque élément (valeurs du jeu de données, en g/mol) :', passo3: 'Additionnez les contributions :',
        hidrato: 'Chaque partie de l’hydrate contribue comme suit (g/mol) :', eletrons: 'La masse des électrons gagnés ou perdus est négligée (elle est très inférieure à l’incertitude des masses atomiques).',
        massaMolarDe: 'Masse molaire : {formula}', percentual: '{nome} ({simbolo}), % en masse'
      },
      concentracao: {
        modos: {
          molaridade: 'Molarité (mol/L) à partir de la masse de soluté et du volume', massa: 'Masse de soluté nécessaire pour une solution', 'gl-mol': 'Conversion g/L ↔ mol/L',
          'percentual-mm': 'Pourcentage massique (m/m)', 'percentual-mv': 'Pourcentage masse/volume (g pour 100 mL)', diluicao: 'Dilution (C₁V₁ = C₂V₂)'
        },
        informe: 'Indiquez {x}.', unidadeMassa: 'Unité de masse inconnue : « {u} ».', unidadeVolume: 'Unité de volume inconnue : « {u} ».',
        maiorQueZero: '{x} : la valeur doit être supérieure à zéro.', massaSoluto: 'la masse de soluté', volumeSolucao: 'le volume de solution', aMassa: 'La masse', oVolume: 'Le volume',
        aMassaSoluto: 'La masse de soluté', aMassaSolucao: 'La masse de solution', massaSolucao: 'la masse de solution', aConcentracao: 'La concentration',
        concQuantidade: 'Concentration en quantité de matière', quantidadeSoluto: 'Quantité de matière de soluté', concMassa: 'Concentration massique',
        passoMassaMolar: 'Masse molaire du soluté ({formula}) :', passoN: 'Quantité de matière de soluté (n = m ÷ M) :', passoC: 'Molarité (C = n ÷ V, avec V en litres) :',
        informeDesejada: 'Indiquez la concentration souhaitée.', unidadeConc: 'Unité de concentration inconnue : « {u} ». Utilisez mol/L, mmol/L ou g/L.',
        passoConcMolL: 'Concentration en mol/L :', passoNNecessaria: 'Quantité de matière nécessaire (n = C × V) :', passoMassaSoluto: 'Masse de soluté (m = n × M) :',
        massaDe: 'Masse : {formula}', quantidade: 'Quantité de matière',
        notaDissolva: 'Dissolvez le soluté dans suffisamment de solvant et complétez jusqu’au volume final de la solution (le volume est celui de la solution, pas celui du solvant).',
        informeConc: 'Indiquez la concentration.', passoMassaMolarCurto: 'Masse molaire ({formula}) :', divida: 'Divisez la concentration massique par la masse molaire :', multiplique: 'Multipliez la molarité par la masse molaire :',
        solutoMaior: 'La masse de soluté ne peut pas dépasser celle de la solution.', percentualMM: 'Pourcentage massique (m/m)', titulo: 'Fraction massique',
        passoPercentual: 'Divisez la masse de soluté par la masse de solution et multipliez par 100 :', percentualMV: 'Pourcentage masse/volume', passoMV: 'Masse de soluté (g) pour 100 mL de solution :',
        umEmBranco: 'Laissez exactement un des quatre champs vide : c’est celui qui sera calculé.', maioresQueZero: 'Les valeurs indiquées doivent être supérieures à zéro.',
        isoleC1: 'Isolez la concentration initiale :', isoleV1: 'Isolez le volume de solution concentrée à prélever :', isoleC2: 'Isolez la concentration finale :', isoleV2: 'Isolez le volume final :',
        rotulos: { C1: 'Concentration initiale (C₁)', V1: 'Volume initial (V₁)', C2: 'Concentration finale (C₂)', V2: 'Volume final (V₂)' },
        notaDiluicao: 'Dans une dilution, la quantité de soluté ne change pas : C₁V₁ = C₂V₂. Utilisez la même unité de concentration et la même unité de volume de part et d’autre.',
        solventeAcrescentar: 'Volume de solvant à ajouter (V₂ − V₁)', atencaoConcentracao: 'Attention : le volume final est inférieur au volume initial ; il s’agit d’une concentration, pas d’une dilution.',
        conserva: 'Dans une dilution, la quantité de soluté se conserve :', escolha: 'Choisissez le type de calcul.', solucaoTex: 'solution'
      },
      estequiometria: {
        semMassa: 'Le jeu de données n’a pas de masse atomique pour : {lista}.',
        massaParaMol: (p) => `Masse → moles${p.rotulo ? ` de ${p.rotulo}` : ''} : divisez la masse (en g) par la masse molaire (${p.M} g/mol).`,
        semVolumeMolar: 'R ou les conditions standard sont absents du jeu de données pour calculer le volume molaire aux CNTP.',
        volumeParaMol: 'Volume (gaz parfait, CNTP : 0 °C et 1 atm) → moles : divisez par le volume molaire Vm = RT/P = {vm} L/mol.',
        semAvogadro: 'La constante d’Avogadro n’est pas dans le jeu de données (constantes.json).', particulasParaMol: 'Particules → moles : divisez par le nombre d’Avogadro.',
        unidadeNaoReconhecida: 'Unité non reconnue : « {u} ». Utilisez g, mg, kg, mol, mmol, L, mL ou particules.',
        quantidadeInvalida: 'Indiquez une quantité valide (un nombre supérieur ou égal à zéro).', massaMolarDe: 'Masse molaire ({formula}), somme des masses atomiques du jeu de données :',
        molParaMassa: 'moles → masse : multipliez par la masse molaire.', molParaParticulas: 'moles → particules : multipliez par le nombre d’Avogadro.',
        molParaVolume: 'moles → volume aux CNTP (0 °C et 1 atm, gaz parfait) : multipliez par le volume molaire {vm} L/mol.',
        quantidade: 'Quantité de matière', massa: 'Masse', particulas: 'Nombre de particules', volumeCntp: 'Volume aux CNTP (s’il s’agit d’un gaz parfait)',
        notaVolume: 'Le volume ne s’applique qu’aux gaz parfaits aux CNTP adoptées (0 °C et 1 atm) ; les solides et les liquides ne suivent pas cette conversion.',
        semirreacoes: 'Les réactions avec des électrons (demi-réactions) n’ont pas de masse : utilisez des équations complètes.', informePeloMenos: 'Indiquez la quantité d’au moins une substance.',
        rendimento: 'Le rendement doit être compris entre 0 et 100 %.', passoEquacao: 'Équation équilibrée (les coefficients donnent le rapport en moles) :',
        naoAparece: 'La substance « {x} » n’apparaît pas dans l’équation.', quantidadesValidas: 'Indiquez des quantités valides (des nombres supérieurs ou égaux à zéro).',
        umaVez: 'Chaque substance ne doit être indiquée qu’une seule fois.',
        soReagentes: 'Avec plus d’une quantité, n’indiquez que des réactifs (le réactif limitant est choisi parmi eux). Pour partir d’un produit, n’indiquez que celui-ci.',
        passoRazoes: 'Divisez la quantité de matière de chaque réactif par son coefficient : le plus petit quotient désigne le réactif limitant.',
        limitante: 'Réactif limitant : {formula}.', umaQuantidade: 'Une seule quantité a été indiquée ({formula}) : l’avancement de la réaction est n ÷ coefficient.',
        passoCoeficientes: (p) => `Utilisez les coefficients comme rapport en moles : n = coefficient × ξ${p.rend != null ? ` × rendement (${p.rend} %)` : ''}.`,
        passoMassa: 'Convertissez en masse (m = n × M) :', sobra: 'Ce qui reste des réactifs en excès (initial − consommé) :',
        reagenteLimitante: 'Réactif limitant', formado: 'Quantité formée : {formula}', emExcesso: 'Excès (reste) : {formula}', necessario: 'Quantité nécessaire : {formula}',
        coeficientesIgnorados: 'Les coefficients saisis ont été ignorés : l’application équilibre l’équation.',
        produtoComRendimento: (p) => `La quantité souhaitée de ${p.formula} est celle obtenue avec un rendement de ${p.rend} % : divisez par le rendement pour trouver l’avancement que la réaction doit atteindre (ξ = n ÷ coefficient ÷ rendement) ; la quantité de produit indiquée ne change pas.`,
        passoNecessarios: 'Réactifs nécessaires (n = coefficient × ξ) :',
        notaCntp: 'CNTP (0 °C, 1 atm) : {vm} L/mol, le volume molaire utilisé ici.', notaIupac: 'Dans la condition standard actuelle de l’IUPAC (0 °C, 1 bar), le volume molaire est de {vmIupac} L/mol.',
        notaTabela: 'Le volume et les particules des produits figurent dans le tableau ; le volume ne s’applique qu’aux gaz parfaits aux CNTP (0 °C et 1 atm).'
      },
      gas: {
        semR: 'La constante des gaz (R) n’est pas dans le jeu de données (constantes.json).', escolha: 'Choisissez la grandeur à calculer : P, V, n ou T.',
        rotulos: { P: 'Pression', V: 'Volume', n: 'Quantité de matière', T: 'Température' }, informe: 'Indiquez : {x}.', unidadeDesconhecida: 'Unité de {x} inconnue : « {u} ».',
        unidadeQuantidade: 'Unité de quantité de matière inconnue : « {u} ».', semMassaAtomica: 'Aucune masse atomique dans le jeu de données pour : {lista}.',
        passoMassa: 'Calculez la quantité de matière à partir de la masse ({formula}, M = {M} g/mol) :', informeN: 'Indiquez la quantité de matière (mol) ou la masse et la formule du gaz.',
        temperaturaPositiva: 'La température absolue doit être supérieure à 0 K.', maiorQueZero: '{x} : la valeur doit être supérieure à zéro.',
        passoEquacao: 'Équation des gaz parfaits, avec R = {R} J/(mol·K) ({nome}). Utilisez toujours les unités SI : Pa, m³, mol, K.', passoSI: 'Convertissez en unités SI :',
        isoleP: 'Isolez la pression :', isoleV: 'Isolez le volume :', isoleN: 'Isolez la quantité de matière :', isoleT: 'Isolez la température :', naoCalculou: 'Il n’a pas été possible de calculer avec ces valeurs.',
        unidadeSaida: 'Unité de sortie inconnue : « {u} ».', converta: 'Convertissez le résultat en {u} :', notaModelo: 'Modèle du gaz parfait : il convient mieux aux basses pressions et aux hautes températures.',
        boyleUmEmBranco: 'Laissez exactement une des quatre valeurs vide : c’est celle qui sera calculée.', boyleUnidade: 'Unité inconnue : « {u} ».',
        boylePositivos: 'Les pressions et les volumes doivent être supérieurs à zéro.', boyleLei: 'Loi de Boyle-Mariotte : à température constante et pour une même quantité de gaz, le produit pression × volume ne change pas.',
        boyleIsole: (p) => `Isolez ${p.grandeza === 'P' ? 'la' : 'le'} ${p.nome} ${p.n === '1' ? (p.grandeza === 'P' ? 'initiale' : 'initial') : (p.grandeza === 'P' ? 'finale' : 'final')} (toutes les valeurs dans la même unité pour chaque grandeur) :`,
        boyleNomes: { P: 'pression', V: 'volume' }, boyleRotulo: (p) => `${maj(p.nome)} ${p.n === '1' ? (p.nome === 'pression' ? 'initiale' : 'initial') : (p.nome === 'pression' ? 'finale' : 'final')} (${p.alvo})`,
        boyleNota: 'Valable pour un gaz parfait de même quantité de matière et de même température dans les deux états.'
      },
      ph: {
        nota25C: 'pKw = {pKw} et pH neutre = {neutro} valent à 25 °C ; à d’autres températures, les deux changent (l’eau pure reste neutre).',
        saturada: 'Attention : {formula} est peu soluble dans l’eau{temp} : il s’en dissout au plus environ {s} mol/L{kps}{fonte}. La concentration indiquée dépasse cette valeur : la solution est saturée (il reste du solide) et le pH réel ne dépasse pas environ {phMax}.',
        saturadaTemp: ' (à {temp} °C)', saturadaKps: ' (calculé à partir du Ks)', saturadaFonte: ', selon {fonte}',
        tipos: { 'acido-forte': 'Acide fort', 'base-forte': 'Base forte', 'acido-fraco': 'Acide faible (Ka donné)', 'base-fraca': 'Base faible (Kb donné)', converter: 'Convertir pH, pOH, [H⁺], [OH⁻]' },
        classes: { neutra: 'neutre', acida: 'acide', basica: 'basique' }, solucao: 'Solution', pKw: 'Produit ionique de l’eau : pKw = {valor} ({origem}).',
        umValor: 'Indiquez exactement une valeur : pH, pOH, [H⁺] ou [OH⁻].', concPositiva: 'La concentration doit être supérieure à zéro.', phInformado: 'Le pH a été donné.',
        phDePoh: 'pH = pKw − pOH :', phDeH: 'pH = −log₁₀[H⁺] :', pohDeOh: 'pOH = −log₁₀[OH⁻] et pH = pKw − pOH :', relacoes: 'Relations utilisées :',
        informeConc: 'Indiquez la concentration (supérieure à zéro) en mol/L.',
        forte: (p) => `${p.acido ? 'Acide fort' : 'Base forte'} : ionisation (dissociation) totale. Chaque unité de formule libère ${p.n} ${p.acido ? 'H⁺' : 'OH⁻'}.`,
        diluida: 'La solution étant très diluée, l’autoionisation de l’eau ne peut pas être ignorée ; résolvez [ion]² − c[ion] − Kw = 0 :', notaDiluida: 'Solution très diluée : le calcul a tenu compte de l’eau.',
        notaEscolar: 'Modèle scolaire : on suppose l’ionisation complète des n hydrogènes ionisables (en pratique, la deuxième ionisation de plusieurs acides est partielle).',
        informeK: (p) => `Indiquez ${p.acido ? 'Ka (ou pKa) de l’acide faible' : 'Kb (ou pKb) de la base faible'}.`,
        fraco: (p) => `${p.acido ? 'Acide faible monoprotique' : 'Base faible monoprotique'} : équilibre ${p.acido ? 'HA ⇌ H⁺ + A⁻' : 'B + H₂O ⇌ BH⁺ + OH⁻'}. Avec x = [${p.acido ? 'H⁺' : 'OH⁻'}] à l’équilibre :`,
        segundoGrau: 'Résolvez l’équation du second degré x² + K·x − K·C = 0 (sans approximations) :', portanto: 'Donc [{ion}] = x.',
        grau: (p) => `Degré d’ionisation${p.acido ? '' : ' de la base'} (α = x ÷ C) :`, notaPequeno: '[ion] est très petit : l’autoionisation de l’eau peut compter et ce modèle l’ignore.',
        grauIonizacao: 'Degré d’ionisation', escolha: 'Choisissez le type de solution.'
      },
      unidades: {
        informeNumero: 'Indiquez un nombre à convertir.', naoConheco: 'Je ne connais pas l’unité « {u} ».',
        grandezasDiferentes: '« {de} » ({gde}) et « {para} » ({gpara}) sont des grandeurs différentes : on ne peut pas convertir l’une en l’autre.',
        passoBase: 'Convertissez en unité de base de la grandeur ({base}) : valeur × facteur + décalage.', passoDaBase: 'Convertissez de l’unité de base vers {para} : (valeur − décalage) ÷ facteur.',
        passoEquivale: '1 {a} équivaut à {fa} {base} et 1 {b} équivaut à {fb} {base}.', passoFator: 'Multipliez par le facteur de conversion (rapport entre les unités) :',
        desconhecida: 'Unité inconnue : {u}'
      }
    }
  }
};
