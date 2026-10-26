// Configuração do site SaibaTudo — ÚNICO lugar para: link da Google Play, lista de apps "Em breve" e os números do app de
// química citados na home.
//
// Como adicionar um novo app à home (ver portal/README.md):
//   1. Se ele já existe, adicione um objeto em APPS (aparece como cartão em "Nossos apps").
//   2. Se ainda é planejado, adicione em EM_BREVE (aparece como cartão "Em breve").
//   Cada app é um projeto independente (por ex.: repositório "SaibaTudo-eleicoesXXXX"), com a própria rota (/eleicoesXXXX/).

/** Link do app na Google Play. Deixe vazio ('') até o app ser publicado: o botão fica desabilitado ("em breve"). */
export const GOOGLE_PLAY_URL = '';

/**
 * Números do app de química citados no cartão da home ({num:chave} nos catálogos → <span data-num="chave">).
 * Devem bater com apps/quimica/data/quimica/manifest.json (contagens): o teste da raiz (tests/rotas.test.mjs) confere.
 */
export const NUMEROS_QUIMICA = { elementos: 118, compostos: 1971, compostosComGhsHarmonizado: 482 };

/**
 * Apps disponíveis além dos cartões principais (Eleições 2026, Química e AchaVagaIA, fixos no HTML da home).
 * Formato: { id, nome, descricao, url, playUrl?, traducoes?: { en: { nome, descricao }, … } }
 */
export const APPS = [];

/**
 * Apps planejados ("Em breve"). Formato: { id, titulo, descricao, repo?, traducoes: { <idioma>: { titulo, descricao } } }
 * `repo` é só um nome sugerido de repositório (texto), não um link. `titulo`/`descricao` são em pt-BR; `traducoes` tem os
 * outros idiomas da home (en, es, de, fr; revisão por falante nativo pendente).
 */
export const EM_BREVE = [
  {
    id: 'proximas-eleicoes',
    titulo: 'Próximas eleições',
    descricao: 'Novas edições do SaibaTudo Eleições, no mesmo modelo: dados oficiais, neutralidade e código aberto, uma por eleição.',
    repo: 'SaibaTudo-eleicoesXXXX',
    traducoes: {
      en: { titulo: 'Upcoming elections', descricao: 'New editions of SaibaTudo Eleições on the same model: official data, neutrality and open source, one per election.' },
      es: { titulo: 'Próximas elecciones', descricao: 'Nuevas ediciones de SaibaTudo Eleições con el mismo modelo: datos oficiales, neutralidad y código abierto, una por elección.' },
      de: { titulo: 'Kommende Wahlen', descricao: 'Neue Ausgaben von SaibaTudo Eleições nach demselben Modell: amtliche Daten, Neutralität und offener Code, eine pro Wahl.' },
      fr: { titulo: 'Prochaines élections', descricao: 'De nouvelles éditions de SaibaTudo Eleições sur le même modèle : données officielles, neutralité et code ouvert, une par élection.' },
      zh: { titulo: '下一届选举', descricao: '同一模式下的新版 SaibaTudo Eleições：官方数据、中立和开源，每届选举一个。' }
    }
  },
  {
    id: 'outros-temas-civicos',
    titulo: 'Outros temas cívicos',
    descricao: 'Ferramentas independentes para consultar informações públicas oficiais. Sugestões e contribuições são bem-vindas no GitHub.',
    repo: 'SaibaTudo-<tema>',
    traducoes: {
      en: { titulo: 'Other civic topics', descricao: 'Independent tools for looking up official public information. Suggestions and contributions are welcome on GitHub.' },
      es: { titulo: 'Otros temas cívicos', descricao: 'Herramientas independientes para consultar información pública oficial. Las sugerencias y contribuciones son bienvenidas en GitHub.' },
      de: { titulo: 'Weitere Bürgerthemen', descricao: 'Unabhängige Werkzeuge zum Nachschlagen amtlicher öffentlicher Informationen. Vorschläge und Beiträge sind auf GitHub willkommen.' },
      fr: { titulo: 'Autres thèmes civiques', descricao: 'Des outils indépendants pour consulter des informations publiques officielles. Suggestions et contributions sont bienvenues sur GitHub.' },
      zh: { titulo: '其他公民主题', descricao: '用于查询官方公开信息的独立工具。欢迎在 GitHub 上提出建议和贡献。' }
    }
  }
];
