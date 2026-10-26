// 中文（简体）目录（与 pt-BR 相同的键；由测试核对）。由智能体翻译；母语者审校待定。
const MARCA = 'SaibaTudo LLMs';

export default {
  revisao: 'pendente',

  ui: {
    idiomas: { 'pt-BR': '葡萄牙语', en: '英语', es: '西班牙语', de: '德语', fr: '法语', zh: '中文' },
    listas: { e: '和' },
    marca: MARCA,
    html: {
      titulo: 'SaibaTudo LLMs — 语言模型是如何工作的：三维词向量',
      descricao: '理解语言模型如何工作：选择单词，在交互式图表中查看它们的 GloVe 向量投影到 3 个坐标轴上，进行向量运算（国王 − 男人 + 女人），探索近邻和点积。开放数据，可离线使用，未经您点击，任何内容都不会离开您的设备。',
      ogLocale: 'zh_CN',
      pular: '跳到正文'
    },
    app: {
      tituloJanela: '{titulo} — SaibaTudo LLMs',
      carregando: '正在加载 SaibaTudo LLMs…',
      abas: { inicio: '探索', aprenda: '学习', sobre: '关于数据' },
      secoes: '栏目',
      marcaAria: 'SaibaTudo LLMs，首页',
      marcaSub: '在您的设备上查看三维词向量',
      configuracoes: '设置',
      idioma: '语言',
      rodape: { sobre: '关于数据', privacidade: '隐私', configuracoes: '设置', projeto: '独立的开源项目（MIT）。无广告、无登录、无跟踪器。' },
      naoEncontrada: { titulo: '找不到页面', texto: 'SaibaTudo LLMs 中不存在该地址。', inicio: '回到首页' },
      erro: { titulo: '错误', cabecalho: '出了点问题', texto: '无法构建此页面（{msg}）。', inicio: '回到首页' },
      erroDados: { titulo: '数据不可用', complemento: '无法加载词向量（{msg}）。课程和概念助手仍然可用。', tentar: '重试' },
      avisoAssinatura: '数据包的数字签名不匹配。探索器已停用：请不要信任来自这些数据的数值。',
      dadosAtualizados: '数据已更新。请重新加载页面，以便在所有页面使用新版本。',
      novaVersao: '应用已安装新版本。请关闭后重新打开（或重新加载）以使用。',
      idiomaTrocado: '语言已更改。对话上下文已清除。'
    },
    prefs: {
      tema: { SISTEMA: '跟随系统', CLARO: '浅色', ESCURO: '深色' },
      fonte: { PEQUENA: '小', NORMAL: '标准', GRANDE: '大', MUITO_GRANDE: '特大' }
    },
    install: {
      ios: { titulo: '在 iPhone 或 iPad 上安装：', passos: ['在 Safari 工具栏点按“共享”（带箭头的方框）。', '选择“添加到主屏幕”。', '确认名称并点按“添加”。'] },
      geral: { titulo: '作为应用安装：', passos: ['打开浏览器菜单（⋮ 或 ⋯）。', '选择“安装应用”或“添加到主屏幕”。', '确认。应用将在独立窗口中打开，并可离线使用。'] }
    },
    componentes: { fonte: '来源：', passoAPasso: '逐步说明' },
    inicio: {
      titulo: '探索词嵌入',
      subtitulo: '选择单词，查看它们的 GloVe 向量投影到三个坐标轴上。国王 − 男人 + 女人 ≈ 女王。',
      campoRotulo: '提问，或为图表指定单词', placeholder: '例如：显示 king、queen、man 和 woman · king − man + woman · 什么是 token？',
      enviar: '提问', limparCampo: '清空输入框', analisando: '正在分析…', ultimaPergunta: '上一个问题', anterior: '上一条', proxima: '下一条',
      sugestoesTitulo: '你还可以问', copiar: '复制回答', copiado: '回答已复制。', fechar: '关闭回答', relatar: '报告此回答的问题',
      relatarAjuda: '在 GitHub 上打开一个公开 issue，问题作为标题；在你确认之前不会发送任何内容。',
      abrir: '打开', respostaAria: '回答', historicoVazio: '还没有问题。'
    },
    aprenda: {
      titulo: '学习：语言模型的各个部件', subtitulo: '六个简短的章节，从预测下一个 token 到 softmax。每一节都有一个“试一试”，带你进入探索器。',
      secaoN: '第 {n} 节，共 {total} 节', experimente: '试一试', abrir: '在探索器中打开', referencias: '参考文献', link: '查看', navegacao: '相邻章节', irExplorar: '前往探索器', indice: '全部章节',
      autoria: '文本由 SaibaTudo 项目撰写（MIT），附学术参考文献。其他语言由智能体翻译；母语者审校待定。'
    },
    sobre: {
      titulo: '关于数据', subtitulo: '向量从哪里来、数值如何计算，以及云端 AI 做什么（不做什么）。',
      vetores: '词向量', fonte: '来源', licenca: '许可', palavras: '单词数', dimensoes: '维度', quantizacao: '量化', versaoPacote: '数据包版本', geradoEm: '生成时间',
      ingles: 'GloVe 是在英文文本（2014 年维基百科和 Gigaword 5 新闻）上训练的：单词是英文的，关联（包括偏见）也是这些文本中的关联。词汇表翻译示例单词以便使用；最常见的 10 万个单词进入数据包，向量以 int8 存储（每个向量一个缩放系数）。',
      comoCalcula: '数值如何计算', calculos: ['余弦和点积：在此设备上由 int8 向量计算，除量化外不做其他舍入。', '近邻和类比：按余弦遍历整个词表；类比为 a − b + c，排除 a、b、c。', '图表坐标轴：所选单词之间方差最大的 3 个维度，或 3 个主成分（PCA）及其解释的方差。', '没有任何数值来自语言模型；当你请求时，生成的文本会被标注并在服务器上校验。'],
      ia: '云端 AI（可选）', iaTexto: '默认关闭。当你请求时，项目服务器把问题、语言、图表摘要和章节摘录发送给 Hugging Face Space 中的一个开放模型（Qwen3-4B-Instruct-2507，Apache 2.0）；回答带着模型名称返回，若包含发送内容之外的数字则会被拒绝。',
      referencias: '参考文献', licencas: '许可', traducoes: '翻译', revisao: { pendente: '由智能体翻译，母语者审校待定', humana: '源文本，已审校' }, codigo: 'GitHub 上的应用源代码'
    },
    nuvem: {
      botao: '询问云端 AI', consultando: '正在询问云端 AI…', titulo: '云端 AI 的解释',
      consentimento: '把这个问题发送给云端 AI 吗？问题文本、语言、当前图表的摘要和章节摘录，以及本次安装的随机代码，会发送到我们的服务器。不会与问题一起保存任何内容。回答由模型（目前为 Qwen3-4B）生成，带有标注并经过校验：发送内容之外的数字会被拒绝。',
      confirmar: '发送', cancelar: '暂不', lembrar: '不再询问（自动模式；可在设置中关闭）',
      falha: { desligada: '此版本中云端 AI 已关闭。上面的回答是在您的设备上生成的。', cota: '云端 AI 暂时达到了使用上限。请稍后再试。', timeout: '云端 AI 响应太慢，调用已取消。', rejeitada: '云端 AI 已回答，但文本未通过校验（数字或语言超出预期）并已被丢弃。', dadopessoal: '问题似乎包含个人数据，未发送到云端。', rede: '无法联系云端 AI（无网络或服务不可用）。' }
    },
    presets: {
      realeza: { nome: '王室与性别', nota: '国王 − 女王 的差向量与 男人 − 女人 相似：空间中的一个方向承载了语法性别。' },
      capitais: { nome: '国家与首都', nota: '每个国家与自己首都的距离都相近：“……的首都”这一方向反复出现。' },
      plural: { nome: '复数', nota: 'cats − cat 的方向与 dogs − dog 相似；与它做点积可以区分单数和复数。' },
      familia: { nome: '家庭', nota: '父亲/母亲、兄弟/姐妹这样的词对，差别在同一个性别方向上。' },
      cores: { nome: '颜色', nota: '颜色词构成一个紧凑的群组：它们在语料中出现于相似的语境。' },
      numeros: { nome: '数字', nota: '从一到十，向量排列成一条带状；相邻的数字彼此靠近。' },
      lideres: { nome: '国家与领导人', nota: '历史说明：意大利 − 德国 + 希特勒 接近 墨索里尼，是因为语料（维基百科和新闻）把每位轴心国独裁者与其国家联系在一起。这是文本的统计规律，不是本应用的评判。' }
    },
    explorador: {
      palavras: '图中的单词', palavrasAria: '已选单词', adicionarRotulo: '添加单词', adicionarPlaceholder: '输入一个英文单词（或已翻译的词）并按回车',
      botaoAdicionar: '添加', limpar: '清空', remover: '移除 {palavra}', destacar: '高亮 {palavra} 并查看近邻', adicionarEsta: '添加到图中',
      modoDimensoes: '3 个维度', modoPca: 'PCA', diferencas: '显示差向量（词对之间的箭头）',
      presetsTitulo: '现成示例', tabelaTitulo: '3 个坐标轴上的坐标', tabelaLegenda: '每个单词在所选坐标轴上的坐标', tabelaPalavra: '单词',
      semPalavras: '还没有单词。在上方输入一个、选择一个示例，或向助手提问。',
      eixo: '坐标轴 {n}', eixoDimensao: '向量的第 {n} 维', eixoPca: '第 {n} 主成分（占方差的 {pct} %）',
      aviso: { pcaPoucasPalavras: 'PCA 至少需要 3 个单词；现在显示方差最大的 3 个维度。' },
      avisoLimite: '图中最多 {n} 个单词。', naoEncontrada: '“{palavra}” 不在 GloVe 的 10 万个单词中（英文，无重音符号）。建议：',
      traduzida: '{original} → {en}（由词汇表翻译）',
      vizinhosTitulo: '最近邻', vizinhosVazio: '点按图中的单词或标签，查看最接近的 10 个单词（余弦）。', vizinhosDe: '与 {palavra} 最接近的 10 个单词：', cosseno: '余弦',
      analogiaTitulo: '类比（a − b + c）', analogiaExplicacao: '从 a 中减去 b 再加上 c：最接近结果的单词补全类比。例如 king − man + woman ≈ queen。',
      analogiaA: '单词 a', analogiaB: '单词 b', analogiaC: '单词 c', analogiaBotao: '计算', analogiaLimpar: '从图中移除', analogiaInvalida: '请从图中选择三个不同的单词（a 和 c 不能相同）。',
      analogiaResultado: '{a} − {b} + {c} ≈',
      direcaoTitulo: '方向与点积', direcaoExplicacao: '差向量 w1 − w2 定义一个方向（例如 cats − cat，即复数）。每个单词与该方向的点积衡量它“指向”那里的程度。',
      direcaoW1: '单词 w1', direcaoW2: '单词 w2', direcaoLista: '要测量的单词，用逗号分隔（留空 = 图中的单词）', direcaoBotao: '测量', direcaoInvalida: '请选择两个不同的单词。',
      direcaoResultado: '与方向 {w1} − {w2} 的点积：',
      graficoAria: '所选单词的三维图；拖动旋转，滚轮或双指缩放，方向键旋转。下方表格有相同的坐标。',
      calculadoNoAparelho: '在您的设备上根据 GloVe 计算（Pennington、Socher 和 Manning，2014；许可 PDDL 1.0）。单词为英文。'
    },
    config: {
      titulo: '设置', salva: '偏好已保存在此设备上。', aparencia: '外观', tema: '主题', tamanhoTexto: '文字大小', idioma: '语言',
      idiomaAjuda: '更改界面、回答和问题解析器。图表中的单词仍为英文，即 GloVe 的语言。',
      instalar: '安装', jaInstalado: '应用已安装在此设备上。', instalarApp: '安装应用',
      ia: '云端人工智能',
      iaAviso: '可选，默认关闭。它只解释概念和图表所展示的内容；数值仍在此设备上计算。当您点按“询问云端 AI”时，问题文本、语言、当前图表的摘要以及本次安装的随机代码会发送到我们的服务器。',
      nuvemAutomatica: '自动使用云端 AI',
      nuvemAutomaticaAjuda: '当应用无法理解问题时，不再询问而直接发送给云端 AI。只发送问题文本、语言和图表摘要。',
      dados: '数据', versaoPacote: '数据包版本', palavras: '单词数', assinatura: '签名', semDados: '数据包尚未加载。',
      assinaturaValor: { verificada: '已验证', invalida: '未验证', indisponivel: '此浏览器不支持' },
      privacidade: '隐私', privacidadeTexto: '我们只在此设备上保存主题、文字大小、语言和提问历史，以及用于离线使用的缓存。', politica: '隐私政策',
      apagar: '删除此设备上的数据', confirmar: '再次点按以确认', apagados: '数据已删除。正在重新加载…'
    }
  },

  respostas: {
    origem: { local: '在您的设备上生成 • GloVe 数据日期 {data}', generativa: 'AI 生成的文本（{modelo}）• 云端 — 可能有误', nuvem: '云端 AI' },
    sugestoes: {
      padrao: ['显示 king、queen、man 和 woman', 'king − man + woman', 'tower 的近邻', '复数方向', '显示首都', '什么是词嵌入？'],
      vizinhosDe: '{palavra} 的近邻', analogiaCom: '{a} − {b} + {c}', plural: '复数方向', conceitoToken: '什么是 token？', mostrar: '显示 {palavra}'
    },
    saudacao: { titulo: '你好！', texto: '我是 SaibaTudo LLMs 的助手。你可以让我把单词放到图中、计算类比、查看某个单词的近邻，或解释一个概念。' },
    ajuda: { titulo: '可以问什么', texto: '我能理解关于图表的请求（英文单词，或由词汇表翻译的词），以及关于六个章节概念的问题。例如：', exemplos: ['显示 king、queen、man 和 woman', 'king − man + woman', 'tower 的近邻', 'cat 和 dog 相似吗？', '复数方向', '什么是注意力？'] },
    sobreDados: { titulo: '关于数据', texto: '向量来自 GloVe（Pennington、Socher 和 Manning，2014；维基百科 2014 + Gigaword 5；许可 PDDL 1.0）：{n} 个英文单词，50 个维度，数据包 {versao}，已在此设备上通过数字签名验证。' },
    fontes: { titulo: '来源', itens: ['GloVe 6B，50 维 — Stanford NLP（PDDL 1.0）', 'Pennington, Socher & Manning (2014), GloVe: Global Vectors for Word Representation', 'Mikolov et al. (2013), Linguistic Regularities in Continuous Space Word Representations', 'Vaswani et al. (2017), Attention Is All You Need'] },
    limpar: { titulo: '图表已清空', texto: '我已移除图中的所有单词。' },
    preset: { texto: '已加载示例“{nome}”：{lista}。' },
    conceito: { leiaMais: '完整章节在“学习”中；点按按钮打开。' },
    mostrar: { titulo: '图中的单词', texto: '我把 {lista} 放到了图中。', textoContinuacao: '我把 {lista} 加到了图中。', traduzidas: '由词汇表翻译：{lista}。', normalizadas: 'GloVe 只有不带重音的小写单词；我使用了 {lista}。', desconhecidas: '在 GloVe 中未找到：{lista}。' },
    analogia: { titulo: '类比', texto: '{a} − {b} + {c} ≈', item: '{palavra}（余弦 {cos}）', explicacao: '我用 a 的向量减去 b 的向量，加上 c 的向量，再寻找最接近结果的单词（不含 a、b、c）。' },
    vizinhos: { titulo: '{palavra} 的近邻', texto: '按余弦排序，与 {palavra} 最接近的 10 个单词：' },
    similaridade: { titulo: '相似度', texto: '{a} 和 {b} 的余弦：{cos}。', escala: '接近 1 = 向量方向几乎相同（语境相似）；接近 0 = 无关；负数 = 方向相反。' },
    direcao: { titulo: '方向与点积', texto: '方向 {w1} − {w2}。每个单词与该方向的点积：', palavra: '单词', produto: '点积', explicacao: '数值越大越指向 {w1} 一侧；越小越指向 {w2} 一侧。' },
    naoEntendi: { titulo: '没听懂', texto: '我没有理解“{q}”。我可以把单词放到图中、计算类比、近邻和方向，或解释章节中的概念。', sugestoesPalavras: 'GloVe 中相近的单词：{lista}。', palavrasAchadas: '我识别出了单词 {lista}；说“显示”即可把它们放到图中。' },
    copiar: { pergunta: '问题：', rodape: '来源：GloVe（PDDL 1.0）• SaibaTudo LLMs • https://saibatudo.net/llms/' }
  },
};
