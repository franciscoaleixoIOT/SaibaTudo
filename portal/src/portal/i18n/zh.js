// 首页目录（简体中文）：与 pt-BR 相同的键；由测试核对。品牌名称不翻译："SaibaTudo"、"SaibaTudo — Eleições 2026"、"SaibaTudo — Química"、
// "SaibaTudo — AchaVagaIA"、"SaibaTudo — LLMs"、"PubChem"、"Wikidata"。由智能体翻译（2026-10-26）；母语者审校待定。
export default {
  idioma: 'zh',
  nomeNativo: '中文',
  ogLocale: 'zh_CN',
  revisao: 'pendente',
  meta: {
    titulo: 'SaibaTudo — 经过核实的信息：2026 年选举、化学与 LLMs',
    descricao: 'SaibaTudo：独立、开源、无广告的应用。Eleições 2026：巴西最高选举法院（TSE）开放数据中的候选人、登记民调、规则和结果。Química：元素周期表、带二维结构的化合物、分步计算器和化学安全。LLMs：语言模型是如何工作的，三维词向量。',
    ogDescricao: '独立的开源应用。Eleições 2026 使用 TSE 开放数据；Química 提供元素周期表、化合物、计算器和化学安全；LLMs 用三维词向量解释语言模型。',
    ogImagemAlt: 'SaibaTudo 标志：带对勾的放大镜',
    twitterDescricao: '独立、开源、使用官方开放数据、无广告的应用：Eleições 2026、Química 和 LLMs。'
  },
  topo: {
    pular: '跳到正文',
    marcaAria: 'SaibaTudo — 首页',
    navAria: '主导航',
    apps: '应用',
    instalar: '安装',
    projeto: '公开项目',
    temaAria: '主题：跟随系统。点按可在系统、浅色和深色之间切换。',
    temaAuto: '自动'
  },
  idiomas: { rotulo: '语言' },
  hero: {
    logoAlt: 'SaibaTudo — 经过核实的公民信息',
    titulo: '经过核实的公民信息',
    sub: '独立、开源、无广告的应用，汇集官方和开放数据——从选举到化学，再到语言模型——让你自己查证事实、自己做决定。',
    abrirEleicoes: '打开 Eleições 2026 应用',
    abrirQuimica: '打开 Química 应用',
    abrirLLMs: '打开 LLMs 应用',
    abrirAchaVagaIA: '打开 AchaVagaIA'
  },
  apps: { titulo: '我们的应用' },
  eleicoes: {
    selo: '2026 年巴西大选',
    nome: 'SaibaTudo — Eleições 2026',
    apenasPortugues: '仅葡萄牙语',
    descricao: '查询 TSE 开放数据中的候选人、登记民调、规则和结果。用自然语言提问：本地助手只用官方数据回答，注明来源，不推荐候选人。',
    vantagens: [
      '按职位和州列出候选人，顺序固定（职位、州和号码）',
      '官方登记状态——不是“清白记录”证明',
      'TSE 登记的民调和教学用投票机模拟器',
      '可离线使用，并通过数字签名核实的数据更新'
    ],
    abrir: '打开 Eleições 2026 应用',
    play: '在 Google Play 下载',
    emBreve: '即将推出',
    playNota: 'Google Play 上的 Android 版本尚未发布。在此期间请使用网页应用：它可以安装并离线使用。'
  },
  quimica: {
    selo: '普通化学——从高中到大学',
    nome: 'SaibaTudo — Química',
    descricao: '基于开放且经过核实的数据的元素周期表、化合物和计算器。用自己的语言提问——例如“水的摩尔质量”或“0.01 mol/L HCl 的 pH”——答案来自数据，每个数字都有来源，计算有分步过程。',
    vantagens: [
      '交互式元素周期表，{num:elementos} 种元素及其性质（原子质量、电负性、半径、电离能、熔点和沸点）',
      '{num:compostos} 种化合物，含分子式、摩尔质量、IUPAC 名称和二维结构图；其中 {num:compostosComGhsHarmonizado} 种带有官方标签危险信息（GHS）',
      '分步计算器：摩尔质量、方程式配平、化学计量、浓度与稀释、pH、理想气体和单位换算',
      '每个回答都注明开放来源：PubChem、Wikidata、CODATA、ChEBI、维基百科和维基教科书',
      '安全第一：危险请求会被拒绝，每种物质的风险都显示在资料卡中'
    ],
    abrir: '打开 Química 应用',
    nota: '可离线使用，任何内容都不会离开您的设备。Android 版本正在准备中；在此期间，网页应用可以安装。'
  },
  llms: {
    selo: '语言模型——从词向量到 Transformer',
    nome: 'SaibaTudo — LLMs',
    descricao: '用三维交互图表理解语言模型如何工作：选择单词，应用把 GloVe 的词向量投影到三个坐标轴上，进行向量运算（king − man + woman ≈ queen），查看近邻和点积。六个简短章节和一个支持六种语言（含中文）的助手。',
    vantagens: [
      '10 万个 GloVe 词向量（斯坦福，PDDL 许可），在您的设备上计算，经数字签名验证',
      '三维探索器：方差最大的 3 个维度或 PCA，类比、近邻和复数方向',
      '六个原创章节：token、词嵌入、注意力、层、softmax 和温度',
      '可选的云端 AI，只负责解释，带模型名称标注并经过校验：数值从不来自模型'
    ],
    abrir: '打开 LLMs 应用',
    nota: '可离线使用，未经您点击任何内容都不会离开您的设备。界面有六种语言；单词是英文的（GloVe 的语言），示例单词可由词汇表翻译。'
  },
  achavagaia: {
    selo: '职业——简历与求职',
    emConstrucao: '首个版本建设中',
    apenasPortugues: '仅葡萄牙语',
    nome: 'SaibaTudo — AchaVagaIA',
    descricao: '个人职业助手：通过诊断（和可选的 AI）改进您的简历，通过官方链接为每个招聘渠道生成正确的搜索，跟踪您的申请，并为您已经使用的 AI 生成提示词和自动化包。',
    vantagens: [
      '简历诊断，指出需要改进的地方——可选的 AI，只在您需要时使用',
      '通过官方链接为每个招聘渠道生成搜索：LinkedIn、Catho、Indeed、Gupy 等',
      '在一个地方跟踪您的所有申请',
      '为您已经使用的 AI 生成提示词和自动化包：Claude、ChatGPT、Gemini、Perplexity 和 Kilo Code'
    ],
    abrir: '打开 AchaVagaIA',
    nota: '隐私：未经您点击，简历中的任何内容都不会离开设备。这是应用的首个版本，仍在建设中。'
  },
  confianca: {
    titulo: '为什么值得信任',
    pilares: [
      { titulo: '官方和开放的数据', texto: '选举：TSE 的开放文件。化学：PubChem、Wikidata、CODATA 和开放文本。LLMs：斯坦福的 GloVe。每个回答都注明来源；没有任何内容是模拟或编造的。' },
      { titulo: '中立、独立、安全', texto: '与 TSE、政府或政党没有任何关联：我们不推荐、不比较、不预测候选人。在化学中，危险请求会被拒绝。' },
      { titulo: '开放且无广告', texto: 'Eleições 2026、Química 和 LLMs 以 MIT 许可开源，任何人都可以审计；建设中的 AchaVagaIA 尚未公开代码。无广告，查询无需注册。' }
    ]
  },
  instalar: {
    titulo: '安装到您的设备',
    intro: 'Eleições 2026、Química 和 LLMs 都是 PWA：在浏览器中运行，也可以作为应用安装，包括使用已加载数据的离线模式。打开应用并使用<strong>安装应用</strong>按钮，或按照您设备的步骤操作。',
    android: {
      titulo: 'Android',
      passos: [
        '在 Chrome 或 Edge 中打开应用（Eleições 2026、Química 或 LLMs）。',
        '点按<strong>安装应用</strong>（或菜单 ⋮ → <em>安装应用</em> / <em>添加到主屏幕</em>）。',
        'Google Play：即将上线。'
      ]
    },
    ios: {
      titulo: 'iPhone 和 iPad',
      passos: [
        '在 Safari 中打开应用（Eleições 2026、Química 或 LLMs）。',
        '点按<strong>共享</strong>（带向上箭头的方框）。',
        '选择<strong>添加到主屏幕</strong>并确认。'
      ]
    },
    desktop: {
      titulo: 'Windows、Mac 和 Linux',
      passos: [
        '在 Chrome 或 Edge 中打开应用（Eleições 2026、Química 或 LLMs）。',
        '点击<strong>安装应用</strong>按钮或地址栏中的安装图标。',
        '应用会像其他程序一样在独立窗口中打开。'
      ]
    },
    abrirEleicoes: '打开 Eleições 2026 应用',
    abrirQuimica: '打开 Química 应用',
    abrirLLMs: '打开 LLMs 应用',
    portal: '安装 SaibaTudo 门户'
  },
  projeto: {
    titulo: '公开项目',
    codigo: {
      titulo: '开源（MIT）',
      texto: '在 Eleições 2026、Química 和 LLMs 中，所有代码——网站、网页应用、Android 应用、数据管道和 AI 模型——都是公开且可审计的。建设中的 AchaVagaIA 尚未公开代码。'
    },
    fontes: {
      titulo: '官方来源',
      eleicoes: '选举：<a href="https://dadosabertos.tse.jus.br/" target="_blank" rel="noopener noreferrer">TSE 开放数据门户</a>，CC BY 4.0 许可；如有差异，以 TSE 官方网站为准。',
      quimica: '化学：PubChem（公有领域）、Wikidata（CC0）、CODATA/NIST、ChEBI（CC BY 4.0）、维基百科和维基教科书（CC BY-SA 4.0）；应用中的“关于数据”页面列出每个来源的版本和许可。',
      llms: 'LLMs：GloVe 6B 词向量（斯坦福大学，PDDL 1.0 许可）；章节文本由项目撰写，附学术参考文献。',
      link: '关于数据：版本、来源和局限'
    },
    neutralidade: {
      titulo: '中立与独立',
      texto: 'SaibaTudo 是独立的：与 TSE、政府或政党没有任何关联。列表按固定顺序排列（职位、州和号码），从不对候选人排名。'
    },
    correcoes: {
      titulo: '纠错渠道',
      texto: '发现错误？在 GitHub 上打开一个公开 <em>issue</em>，或使用应用中的“报告问题”按钮。我们会透明地更正。',
      link: '在 GitHub 上打开 issue'
    }
  },
  breve: {
    titulo: '即将推出',
    noscript: '新的 SaibaTudo 应用将在这里公布。'
  },
  rodape: {
    navAria: '页脚',
    privacidade: '隐私',
    dados: '关于数据',
    github: 'GitHub',
    texto: 'SaibaTudo 是独立、无党派的，与 TSE、政府或政党没有任何关联。选举数据：巴西最高选举法院——开放数据门户，CC BY 4.0 许可。化学数据：PubChem、Wikidata、CODATA/NIST、ChEBI、维基百科和维基教科书。LLMs 数据：GloVe（斯坦福，PDDL 1.0）。Eleições 2026、Química 和 LLMs 的代码采用 MIT 许可。'
  }
};
