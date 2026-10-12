# Conferência dos catálogos do site com o DeepL (12/10/2026)

Método: os textos do catálogo pt-BR (`web/src/quimica/js/i18n/catalogos/pt-BR.js`, só valores com 12 a 400 caracteres e ≥ 2 palavras, 771 chaves) foram traduzidos pelo DeepL (API gratuita do mantenedor; pt → en-US, es informal, de e fr formais; parâmetros `{x}` protegidos) e comparados com a nossa tradução por uma medida de similaridade (0,6 × razão de caracteres + 0,4 × Jaccard de palavras, texto normalizado). **Similaridade baixa não quer dizer erro**: a lista abaixo é o que um falante nativo deve olhar primeiro. O DeepL não conhece o glossário do projeto (`docs/I18N.md` §8), então diverge justamente nos termos técnicos em que o catálogo segue a norma (ex.: "palavra de sinal" → *signal word* / *Mention d’avertissement*, que o DeepL traduziu como *password*). Consumo: 132.780 caracteres da cota mensal de 500.000.

| Idioma | Textos comparados | Similaridade média | Abaixo de 0,45 | Parâmetros `{x}` errados |
| :-- | --: | --: | --: | --: |
| Inglês | 771 | 0.848 | 29 | 0 |
| Espanhol | 771 | 0.871 | 14 | 0 |
| Alemão | 771 | 0.757 | 88 | 0 |
| Francês | 771 | 0.845 | 26 | 0 |

## Leitura dos resultados

- **Nenhum parâmetro perdido ou trocado** em nenhum idioma (os `{x}` dos catálogos batem com o pt-BR).
- Os itens de menor similaridade são dominados por **terminologia**: *signal word*, *Stoffmenge*, *Trivialname*, *gewässergefährdend*, *oxidisers*, *Mention d’avertissement*, *pas à pas*. Nesses, o catálogo está correto e o DeepL, genérico ou errado.
- O alemão tem a média mais baixa porque o DeepL usa paráfrases longas onde o catálogo usa o termo composto consagrado; não indica erro.
- Candidatos reais a melhoria (estilo, não erro): en "Full sheet of {nome}" → *{nome}: full profile*; de "Gute Praxis" → *Bewährte Verfahren*; es "No pude balancearla" → *No he podido balancear la ecuación*. Ficam para a revisão nativa; nada foi alterado agora.
- Os catálogos continuam marcados `revisao: 'pendente'`: esta conferência reduz o risco de erro grosseiro, mas não substitui um falante nativo.


## Inglês — 25 itens de menor similaridade

| Sim. | Chave | pt-BR | Catálogo | DeepL |
| --: | :-- | :-- | :-- | :-- |
| 0.15 | `ui.sobre.bibliotecasUso.poppins` | Fonte dos títulos | Heading font | Source of the titles |
| 0.20 | `respostas.recusa.AUTOLESAO` | Sinto muito que você esteja passando por isso. Não posso orientar sobre esse assunto, mas você não está sozinho(a): proc | I am sorry you are going through this. I cannot give guidance on this subject, but you are not alone: reach out now to s | I'm sorry you're going through this. I can't offer advice on this matter, but you're not alone: reach out right away to  |
| 0.22 | `respostas.elemento.ficha` | Ficha completa de {nome} | Full sheet of {nome} | {nome}'s complete profile |
| 0.24 | `ui.sobre.atualizacao.falha` | Não foi possível verificar agora ({motivo}). | Could not check right now ({motivo}). | We were unable to verify this at this time ( {motivo}). |
| 0.25 | `respostas.calc.concentracao.concQuantidade` | Concentração em quantidade de matéria | Amount-of-substance concentration | Concentration in terms of the amount of matter |
| 0.27 | `ui.seguranca.procurarFrase` | Procurar uma frase | Find a statement | Search for a phrase |
| 0.29 | `ui.perigos.descricoes.GHS03` | comburentes (oxidantes) | oxidisers | oxidizing agents |
| 0.29 | `respostas.recusa.alternativas` | Posso ajudar com segurança e conhecimento: perigos, equipamentos de proteção (EPI), armazenamento, descarte e primeiros  | I can help with safety and knowledge: hazards, personal protective equipment (PPE), storage, disposal and first aid for  | I can provide expert assistance on safety and knowledge related to a substance, including hazards, personal protective e |
| 0.31 | `ui.calculadoras.massaMolar.fichaDe` | ficha de {nome} | sheet of {nome} | {nome}'s profile |
| 0.31 | `respostas.propriedade.fichaDe` | Ficha de {nome} | Sheet of {nome} | {nome}'s Profile |
| 0.31 | `respostas.comparar.fichaDe` | Ficha de {nome} | Sheet of {nome} | {nome}'s Profile |
| 0.32 | `ui.componentes.palavraSinal` | Palavra de sinal:  | Signal word:  | Password:  |
| 0.32 | `ui.seguranca.palavraSinal` | Palavra de sinal | Signal word | Password |
| 0.33 | `ui.molecula.erroDesenho` | Não foi possível desenhar esta estrutura. | This structure could not be drawn. | It was not possible to draw this structure. |
| 0.33 | `ui.molecula.erroSmiles` | Não foi possível interpretar o SMILES desta estrutura. | The SMILES of this structure could not be interpreted. | We were unable to parse the SMILES structure. |
| 0.36 | `respostas.seguranca.elementoSemGhs` | O pacote traz a classificação de perigo (GHS) apenas de compostos, não do elemento {nome}. Os perigos dependem da forma  | The package has GHS hazard classifications only for compounds, not for the element {nome}. Hazards depend on the chemica | The package lists the hazard classification (GHS) only for compounds, not for the element {nome}. Hazards depend on the  |
| 0.36 | `ui.perigos.descricoes.GHS04` | gases sob pressão | gases under pressure | pressurized gases |
| 0.36 | `respostas.estequiometria.naoConsegui` | Não consegui calcular | I could not calculate | I couldn't figure it out |
| 0.36 | `respostas.concentracao.naoConsegui` | Não consegui calcular | I could not calculate | I couldn't figure it out |
| 0.36 | `respostas.gas.naoConsegui` | Não consegui calcular | I could not calculate | I couldn't figure it out |
| 0.38 | `ui.sobre.atribuicao` | Atribuição: {x} | Attribution: {x} | Assignment: {x} |
| 0.39 | `ui.perigos.pictogramas.GHS04` | Gás sob pressão | Gas under pressure | Pressurized gas |
| 0.39 | `ui.resposta.rotuloNaoResolvida` | Não consegui responder | I could not answer | I wasn't able to answer |
| 0.40 | `ui.perigos.pictogramas.GHS03` | Comburente (oxidante) | Oxidising | Oxidizing agent |
| 0.41 | `ui.resposta.origem` | Resposta montada {origem} | Answer built {origem} | Assembled response {origem} |

## Espanhol — 25 itens de menor similaridade

| Sim. | Chave | pt-BR | Catálogo | DeepL |
| --: | :-- | :-- | :-- | :-- |
| 0.19 | `ui.componentes.palavraSinal` | Palavra de sinal:  | Palabra de advertencia:  | Contraseña:  |
| 0.19 | `ui.seguranca.palavraSinal` | Palavra de sinal | Palabra de advertencia | Contraseña |
| 0.27 | `respostas.balancear.naoConsegui` | Não consegui balancear | No pude balancearla | No he podido mantener el equilibrio |
| 0.29 | `respostas.calc.estequiometria.necessario` | {formula} necessário | Cantidad necesaria de {formula} | {formula}: obligatorio |
| 0.31 | `ui.sobre.atualizacao.botao` | Verificar atualização dos dados | Buscar actualizaciones de datos | Comprobar si los datos están actualizados |
| 0.32 | `respostas.calc.estequiometria.formado` | {formula} formado | Cantidad formada de {formula} | {formula} formado |
| 0.32 | `respostas.calc.formula.quantidadeGrande` | Quantidade grande demais | Cantidad demasiado grande | Demasiada cantidad |
| 0.34 | `ui.calculadoras.naoEncontrada` | Calculadora não encontrada | Calculadora no encontrada | No se ha encontrado la calculadora |
| 0.35 | `respostas.blocos.palavraSinal` | Palavra de sinal: {x} | Palabra de advertencia: {x} | Contraseña: {x} |
| 0.40 | `ui.sobre.intro` | Todo número mostrado vem do pacote de dados assinado ou de um cálculo feito no seu aparelho. Texto gerado por IA nunca f | Todo número que se muestra sale del paquete de datos firmado o de un cálculo hecho en tu dispositivo. El texto generado  | Todas las cifras que se muestran provienen del paquete de datos contratado o de un cálculo realizado en tu dispositivo.  |
| 0.40 | `ui.inicio.historico.proxima` | Próxima pergunta ou caixa em branco | Pregunta siguiente o cuadro vacío | Siguiente pregunta o casilla en blanco |
| 0.41 | `respostas.recusa.AUTOLESAO` | Sinto muito que você esteja passando por isso. Não posso orientar sobre esse assunto, mas você não está sozinho(a): proc | Siento mucho que estés pasando por esto. No puedo orientarte sobre este tema, pero no estás solo ni sola: busca ahora mi | Siento mucho que estés pasando por esto. No puedo aconsejarte sobre este tema, pero no estás solo/a: busca ya mismo a al |
| 0.42 | `propriedades.categorias.metal_pos_transicao` | metal pós-transição | metal postransicional | metal de la era posterior a la transición |
| 0.43 | `ui.sobre.externas` | Referências externas (links) | Referencias externas (enlaces) | Enlaces externos |
| 0.46 | `respostas.calc.formula.parteVazia` | Parte vazia (confira o "·" do hidrato) | Parte vacía (revisa el “·” del hidrato) | Espacio en blanco (fíjate en el «·» del hidrato) |
| 0.46 | `ui.inicio.exemplosAria` | Exemplos de perguntas | Preguntas de ejemplo | Ejemplos de preguntas |
| 0.47 | `ui.sobre.origemRotulo.invalida` | site (assinatura NÃO verificada) | sitio (firma NO verificada) | página web (suscripción NO verificada) |
| 0.48 | `ui.calculadoras.ph.valorInformado` | O valor informado é | El valor indicado es | La cifra indicada es |
| 0.48 | `respostas.calc.concentracao.informe` | Informe {x}. | Indica {x}. | {x}. |
| 0.48 | `respostas.calc.gas.informe` | Informe {x}. | Indica {x}. | {x}. |
| 0.48 | `ui.compostos.naoEncontrado` | Composto não encontrado | Compuesto no encontrado | No se ha encontrado el compuesto |
| 0.49 | `respostas.calc.estequiometria.emExcesso` | {formula} em excesso (sobra) | Cantidad en exceso de {formula} (restante) | {formula} en exceso (sobrante) |
| 0.49 | `respostas.calc.concentracao.titulo` | Título (fração em massa) | Fracción másica | Título (fracción en masa) |
| 0.50 | `respostas.estequiometria.naoConsegui` | Não consegui calcular | No pude calcular | No he podido calcularlo |
| 0.50 | `respostas.concentracao.naoConsegui` | Não consegui calcular | No pude calcular | No he podido calcularlo |

## Alemão — 25 itens de menor similaridade

| Sim. | Chave | pt-BR | Catálogo | DeepL |
| --: | :-- | :-- | :-- | :-- |
| 0.18 | `ui.perigos.pictogramas.GHS09` | Perigoso ao ambiente aquático | Gewässergefährdend | Gefährlich für die aquatische Umwelt |
| 0.18 | `ui.compostos.nomePopular` | Nome popular | Trivialname | Allgemein gebräuchlicher Name |
| 0.18 | `respostas.composto.nomePopular` | Nome popular | Trivialname | Allgemein gebräuchlicher Name |
| 0.18 | `respostas.nomenclatura.nomePopular` | Nome popular | Trivialname | Allgemein gebräuchlicher Name |
| 0.18 | `respostas.recusa.categorias.AUTOLESAO` | risco à própria vida | Gefahr für das eigene Leben | Lebensgefahr |
| 0.19 | `ui.sobre.compostos` | Compostos no índice | Verbindungen im Index | Im Inhaltsverzeichnis aufgeführte Werke |
| 0.19 | `respostas.sobreDados.compostos` | Compostos no índice | Verbindungen im Index | Im Inhaltsverzeichnis aufgeführte Werke |
| 0.19 | `respostas.orientacaoGeral[3]` | Em contato com a pele ou os olhos, lave com água corrente em abundância; se inalar, vá para o ar livre; não provoque vôm | Spülen Sie bei Haut- oder Augenkontakt mit reichlich fließendem Wasser; gehen Sie nach dem Einatmen an die frische Luft; | Bei Kontakt mit der Haut oder den Augen spülen Sie die betroffene Stelle gründlich unter fließendem Wasser ab; bei Einat |
| 0.19 | `ui.perigos.descricoes.GHS09` | perigo para o ambiente aquático | gewässergefährdend | Gefahr für die aquatische Umwelt |
| 0.20 | `respostas.recusa.alternativas` | Posso ajudar com segurança e conhecimento: perigos, equipamentos de proteção (EPI), armazenamento, descarte e primeiros  | Ich kann bei Sicherheit und Wissen helfen: Gefahren, persönliche Schutzausrüstung (PSA), Lagerung, Entsorgung und Erste  | Ich kann Ihnen mit Fachwissen und Sicherheitstipps weiterhelfen: Gefahren, Schutzausrüstung (PSA), Lagerung, Entsorgung  |
| 0.21 | `ui.seguranca.boasPraticas` | Boas práticas | Gute Praxis | Bewährte Verfahren |
| 0.21 | `respostas.calc.concentracao.quantidade` | Quantidade de matéria | Stoffmenge | Menge des Materials |
| 0.21 | `respostas.calc.estequiometria.quantidade` | Quantidade de matéria | Stoffmenge | Menge des Materials |
| 0.21 | `respostas.calc.gas.rotulos.n` | Quantidade de matéria | Stoffmenge | Menge des Materials |
| 0.21 | `ui.compostos.semGhs` | O pacote não traz classificação GHS harmonizada para este composto. Isso não quer dizer que seja inofensivo: consulte a  | Das Paket enthält für diese Verbindung keine harmonisierte GHS-Einstufung. Das heißt nicht, dass sie harmlos ist: Prüfen | Auf der Verpackung ist keine harmonisierte GHS-Einstufung für diese Verbindung angegeben. Dies bedeutet jedoch nicht, da |
| 0.21 | `ui.perigos.descricoes.GHS03` | comburentes (oxidantes) | oxidierende Stoffe | Oxidationsmittel |
| 0.22 | `ui.app.naoEncontrada.inicio` | Ir para o início | Zur Startseite | Zum Anfang springen |
| 0.22 | `ui.app.erro.inicio` | Ir para o início | Zur Startseite | Zum Anfang springen |
| 0.23 | `respostas.propriedade.deQual` | De qual substância? | Von welchem Stoff? | Um welche Substanz handelt es sich? |
| 0.24 | `respostas.recusa.categorias.DANO_A_PESSOAS` | dano a pessoas | Schaden für Menschen | Personenschaden |
| 0.24 | `respostas.calc.concentracao.concQuantidade` | Concentração em quantidade de matéria | Stoffmengenkonzentration | Konzentration in Bezug auf die Stoffmenge |
| 0.24 | `respostas.calc.ph.tipos.base-fraca` | Base fraca (Kb dado) | Schwache Base (Kb angegeben) | Geringe Datenmenge (Kb) |
| 0.25 | `respostas.sobreDados.elementos` | Elementos no pacote | Elemente im Paket | Inhalt des Pakets |
| 0.25 | `ui.calculadoras.unidades.grandezas.quantidade` | Quantidade de matéria | Stoffmenge | Menge an Stoff |
| 0.26 | `respostas.recusa.padrao` | Não posso ajudar com isso. O SaibaTudo Química não fornece instruções de síntese, purificação, ampliação de escala nem r | Dabei kann ich Ihnen nicht helfen. SaibaTudo Química gibt keine Anleitungen zur Synthese, Reinigung, Hochskalierung oder | Dabei kann ich Ihnen nicht weiterhelfen. „SaibaTudo Química“ stellt keine Anleitungen zur Synthese, Reinigung oder Skali |

## Francês — 25 itens de menor similaridade

| Sim. | Chave | pt-BR | Catálogo | DeepL |
| --: | :-- | :-- | :-- | :-- |
| 0.16 | `respostas.comparar.linhas.sinal` | Palavra de sinal (GHS) | Mention d’avertissement (SGH) | Mot-clé (GHS) |
| 0.20 | `ui.componentes.passoAPasso` | Passo a passo | Pas à pas | Étape par étape |
| 0.20 | `ui.calculadoras.passoAPasso` | Passo a passo | Pas à pas | Étape par étape |
| 0.20 | `respostas.blocos.passoAPasso` | Passo a passo | Pas à pas | Étape par étape |
| 0.23 | `ui.app.naoEncontrada.inicio` | Ir para o início | Aller à l’accueil | Retour au début |
| 0.23 | `ui.app.erro.inicio` | Ir para o início | Aller à l’accueil | Retour au début |
| 0.28 | `ui.sobre.intro` | Todo número mostrado vem do pacote de dados assinado ou de um cálculo feito no seu aparelho. Texto gerado por IA nunca f | Chaque nombre affiché provient du jeu de données signé ou d’un calcul effectué sur votre appareil. Un texte généré par I | Tous les chiffres affichés proviennent du forfait de données souscrit ou d'un calcul effectué sur votre appareil. Le tex |
| 0.31 | `ui.componentes.palavraSinal` | Palavra de sinal:  | Mention d’avertissement :  | Mot de passe :  |
| 0.31 | `ui.seguranca.palavraSinal` | Palavra de sinal | Mention d’avertissement | Mot de passe |
| 0.31 | `ui.config.idiomaAjuda` | Muda a interface, as respostas e o interpretador de perguntas. Nomes e textos que ainda não existem no idioma aparecem e | Modifie l’interface, les réponses et l’interpréteur de questions. Les noms et les textes qui n’existent pas encore dans  | L'interface, les réponses et l'interpréteur de questions changent. Les noms et les textes qui n'existent pas encore dans |
| 0.32 | `respostas.calc.estequiometria.necessario` | {formula} necessário | Quantité nécessaire : {formula} | {formula} obligatoire |
| 0.34 | `ui.config.iaAviso` | Ainda não disponível. Quando existir, será opcional, só funcionará com o seu consentimento e nunca fornecerá números: el | Pas encore disponible. Lorsqu’elle existera, elle sera facultative, ne fonctionnera qu’avec votre consentement et ne fou | Cette fonctionnalité n'est pas encore disponible. Lorsqu'elle le sera, elle sera facultative, ne fonctionnera qu'avec vo |
| 0.35 | `ui.app.marcaAria` | SaibaTudo Química, início | SaibaTudo Química, accueil | Tout savoir sur la chimie, page d'accueil |
| 0.37 | `ui.sobre.dados` | Dados no pacote | Données incluses | Données contenues dans le paquet |
| 0.37 | `respostas.sobreDados.elementos` | Elementos no pacote | Éléments du jeu de données | Éléments contenus dans le coffret |
| 0.37 | `respostas.calc.estequiometria.formado` | {formula} formado | Quantité formée : {formula} | {formula} formé |
| 0.37 | `ui.calculadoras.ph.valorInformado` | O valor informado é | La valeur donnée est | Le montant indiqué est |
| 0.39 | `ui.seguranca.sinalTexto2` |  indica as menos graves. Substâncias de menor perigo podem vir sem palavra de sinal. |  signale les moins graves. Les substances moins dangereuses peuvent n’avoir aucune mention d’avertissement. |  indique les substances les moins dangereuses. Les substances présentant un danger moindre peuvent ne pas être accompagn |
| 0.40 | `respostas.recusa.categorias.DANO_A_PESSOAS` | dano a pessoas | atteinte aux personnes | dommages causés à des personnes |
| 0.40 | `respostas.calc.formula.quantidadeGrande` | Quantidade grande demais | Indice trop grand | Quantité trop importante |
| 0.42 | `respostas.blocos.palavraSinal` | Palavra de sinal: {x} | Mention d’avertissement : {x} | Mot de passe : {x} |
| 0.43 | `propriedades.categorias.metal_pos_transicao` | metal pós-transição | métal pauvre | métal post-transitionnel |
| 0.43 | `respostas.ph.maisDados` | Preciso de mais dados para o pH | Il me faut plus de données pour le pH | J'ai besoin de plus d'informations concernant le pH |
| 0.43 | `respostas.seguranca.semGhs` | O pacote não traz classificação de perigo GHS (harmonizada) para {nome}. Isso não quer dizer que seja inofensivo: consul | Le jeu de données ne contient aucune classification de danger SGH (harmonisée) pour ce composé ({nome}). Cela ne veut pa | L'emballage ne mentionne pas de classification de danger GHS (harmonisée) pour {nome}. Cela ne signifie pas pour autant  |
| 0.44 | `ui.inicio.naoCopiou` | Não foi possível copiar neste navegador. | Impossible de copier dans ce navigateur. | La copie n'a pas pu être effectuée dans ce navigateur. |
