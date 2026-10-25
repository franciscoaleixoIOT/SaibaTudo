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
      subtitulo: '选择单词，查看它们的 GloVe 向量投影到三个坐标轴上。国王 − 男人 + 女人 ≈ 女王。'
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
  }
};
