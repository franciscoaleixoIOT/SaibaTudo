// Respostas montadas NO APARELHO a partir da interpretação (nlu.js) e dos vetores (data.js): texto do catálogo do idioma, números calculados
// aqui (cosseno, produto escalar) e AÇÕES para o explorador (adicionar, analogia, direcao, preset, limpar, destacar, irPara). Origem sempre
// rotulada (rotuloOrigem). Nada de texto fixo em língua natural neste arquivo.
import { secao } from './conteudo/index.js';
import { fmtData, fmtNumero, t, tl } from './i18n/index.js';

const COS = { casas: 3 };
const COORD = { casas: 2 };
const MAX_SUGESTOES = 6;

/** Rótulo de origem da resposta: montada no aparelho (com a data dos dados) ou texto gerado (com o modelo que respondeu). */
export function rotuloOrigem(r) {
  if (r?.origem === 'GENERATIVA') return t('respostas.origem.generativa', { modelo: (typeof r.modelo === 'string' && r.modelo.trim()) || t('respostas.origem.nuvem') });
  const data = r?.dadosDe ? fmtData(r.dadosDe) ?? r.dadosDe : '—';
  return t('respostas.origem.local', { data });
}

const juntar = (lista) => lista.join(', ');

function sugestoesPara(intencao, parsed, vetores) {
  const base = tl('respostas.sugestoes.padrao');
  const extra = [];
  const w = parsed.palavras[0]?.en;
  if (['MOSTRAR', 'VIZINHOS', 'SIMILARIDADE'].includes(intencao) && w) extra.push(t('respostas.sugestoes.vizinhosDe', { palavra: w }));
  if (intencao === 'MOSTRAR' && parsed.palavras.length >= 3) extra.push(t('respostas.sugestoes.analogiaCom', { a: parsed.palavras[0].en, b: parsed.palavras[1].en, c: parsed.palavras[2].en }));
  if (intencao === 'ANALOGIA' || intencao === 'DIRECAO') extra.push(t('respostas.sugestoes.plural'));
  if (intencao !== 'CONCEITO') extra.push(t('respostas.sugestoes.conceitoToken'));
  return [...extra, ...base].filter((x, k, a) => a.indexOf(x) === k).slice(0, MAX_SUGESTOES);
}

/**
 * Monta a resposta para a interpretação.
 * @returns {{ intencao, titulo, blocos: ({tipo:'texto', texto}|{tipo:'lista', titulo?, itens: string[]}|{tipo:'tabela', cabecalho, linhas}|{tipo:'aviso', texto})[], acoes: object[], sugestoes: string[], origem: 'LOCAL', dadosDe: string }}
 */
export function responder(parsed, { vetores, estado, idioma }) {
  const dadosDe = vetores?.manifesto?.generatedAt ?? '';
  const base = { intencao: parsed.intencao, blocos: [], acoes: [], origem: 'LOCAL', dadosDe };
  const idx = (en) => vetores.indice(en);
  const nomes = parsed.palavras.map((p) => p.en);
  const traduzidas = parsed.palavras.filter((p) => p.traduzida).map((p) => `${p.original} → ${p.en}`);
  const avisosPalavras = [];
  if (traduzidas.length) avisosPalavras.push({ tipo: 'texto', texto: t('respostas.mostrar.traduzidas', { lista: juntar(traduzidas) }) });
  if (parsed.desconhecidas.length) avisosPalavras.push({ tipo: 'aviso', texto: t('respostas.mostrar.desconhecidas', { lista: juntar(parsed.desconhecidas) }) });
  const fim = (r) => ({ ...base, ...r, sugestoes: sugestoesPara(parsed.intencao, parsed, vetores) });

  switch (parsed.intencao) {
    case 'SAUDACAO':
      return fim({ titulo: t('respostas.saudacao.titulo'), blocos: [{ tipo: 'texto', texto: t('respostas.saudacao.texto') }] });
    case 'AJUDA':
      return fim({ titulo: t('respostas.ajuda.titulo'), blocos: [{ tipo: 'texto', texto: t('respostas.ajuda.texto') }, { tipo: 'lista', itens: tl('respostas.ajuda.exemplos') }] });
    case 'SOBRE_DADOS':
      return fim({ titulo: t('respostas.sobreDados.titulo'), blocos: [{ tipo: 'texto', texto: t('respostas.sobreDados.texto', { n: fmtNumero(vetores?.n ?? 0, { casas: 0 }), versao: vetores?.manifesto?.version ?? '—' }) }], acoes: [{ tipo: 'irPara', rota: '/llms/sobre-os-dados' }] });
    case 'FONTES':
      return fim({ titulo: t('respostas.fontes.titulo'), blocos: [{ tipo: 'lista', itens: tl('respostas.fontes.itens') }], acoes: [{ tipo: 'irPara', rota: '/llms/sobre-os-dados' }] });
    case 'LIMPAR':
      return fim({ titulo: t('respostas.limpar.titulo'), blocos: [{ tipo: 'texto', texto: t('respostas.limpar.texto') }], acoes: [{ tipo: 'limpar' }] });
    case 'PRESET':
      return fim({ titulo: t(`ui.presets.${parsed.preset}.nome`), blocos: [{ tipo: 'texto', texto: t('respostas.preset.texto', { nome: t(`ui.presets.${parsed.preset}.nome`), lista: juntar(vetores.presets[parsed.preset] ?? []) }) }, { tipo: 'texto', texto: t(`ui.presets.${parsed.preset}.nota`) }], acoes: [{ tipo: 'preset', id: parsed.preset }] });
    case 'CONCEITO': {
      const s = secao(idioma, { embedding: 'embeddings', vetor: 'embeddings', dimensao: 'embeddings', cosseno: 'embeddings', token: 'tokens', atencao: 'atencao', transformer: 'atencao', mlp: 'camadas', parametro: 'camadas', softmax: 'softmax', temperatura: 'softmax', proximoToken: 'modelo' }[parsed.conceito] ?? 'embeddings');
      return fim({ titulo: s.titulo, blocos: [{ tipo: 'texto', texto: s.resumo }, { tipo: 'texto', texto: s.paragrafos[0].replace(/\*\*/g, '') }, { tipo: 'texto', texto: t('respostas.conceito.leiaMais') }], acoes: [{ tipo: 'irPara', rota: `/llms/aprenda/${s.id}` }] });
    }
    case 'ANALOGIA': {
      const { a, b, c } = parsed.analogia;
      const r = vetores.analogia(idx(a), idx(b), idx(c), 5);
      return fim({ titulo: t('respostas.analogia.titulo'), blocos: [
        { tipo: 'texto', texto: t('respostas.analogia.texto', { a, b, c }) },
        { tipo: 'lista', itens: r.resultados.map((x) => t('respostas.analogia.item', { palavra: x.palavra, cos: fmtNumero(x.cos, COS) })) },
        { tipo: 'texto', texto: t('respostas.analogia.explicacao') }, ...avisosPalavras],
      acoes: [{ tipo: 'analogia', a: idx(a), b: idx(b), c: idx(c) }] });
    }
    case 'DIRECAO': {
      const { w1, w2 } = parsed.direcao;
      const lista = parsed.palavras.map((p) => idx(p.en)).filter((k) => k >= 0 && k !== idx(w1) && k !== idx(w2));
      const alvo = lista.length ? lista : (estado?.palavras?.length ? estado.palavras : ['dog', 'dogs', 'house', 'houses', 'one', 'two'].map(idx).filter((k) => k >= 0));
      const r = vetores.produtoEscalar(vetores.direcao(idx(w1), idx(w2)), [...new Set([idx(w1), idx(w2), ...alvo])]);
      return fim({ titulo: t('respostas.direcao.titulo'), blocos: [
        { tipo: 'texto', texto: t('respostas.direcao.texto', { w1, w2 }) },
        { tipo: 'tabela', cabecalho: [t('respostas.direcao.palavra'), t('respostas.direcao.produto')], linhas: r.map((x) => [x.palavra, fmtNumero(x.valor, COORD)]) },
        { tipo: 'texto', texto: t('respostas.direcao.explicacao') }],
      acoes: [{ tipo: 'direcao', w1: idx(w1), w2: idx(w2), lista: alvo }] });
    }
    case 'VIZINHOS': {
      const w = nomes[0]; const i = idx(w);
      const viz = vetores.vizinhos(vetores.vetor(i), 10, [i]);
      return fim({ titulo: t('respostas.vizinhos.titulo', { palavra: w }), blocos: [
        { tipo: 'texto', texto: t('respostas.vizinhos.texto', { palavra: w }) },
        { tipo: 'lista', itens: viz.map((x) => t('respostas.analogia.item', { palavra: x.palavra, cos: fmtNumero(x.cos, COS) })) }, ...avisosPalavras],
      acoes: [{ tipo: 'adicionar', indices: [i] }, { tipo: 'destacar', indice: i }] });
    }
    case 'SIMILARIDADE': {
      const [a, b] = nomes;
      const cos = vetores.cosseno(idx(a), idx(b));
      return fim({ titulo: t('respostas.similaridade.titulo'), blocos: [
        { tipo: 'texto', texto: t('respostas.similaridade.texto', { a, b, cos: fmtNumero(cos, COS) }) },
        { tipo: 'texto', texto: t('respostas.similaridade.escala') }, ...avisosPalavras],
      acoes: [{ tipo: 'adicionar', indices: [idx(a), idx(b)] }] });
    }
    case 'MOSTRAR': {
      const indices = nomes.map(idx).filter((k) => k >= 0);
      return fim({ titulo: t('respostas.mostrar.titulo'), blocos: [{ tipo: 'texto', texto: t(parsed.continuacao ? 'respostas.mostrar.textoContinuacao' : 'respostas.mostrar.texto', { lista: juntar(nomes) }) }, ...avisosPalavras],
        acoes: [{ tipo: 'adicionar', indices }] });
    }
    default: {
      const q = parsed.original ?? '';
      const proximas = parsed.desconhecidas.flatMap((d) => vetores.sugerir(d, 3)).filter((x, k, a) => a.indexOf(x) === k).slice(0, 6);
      const blocos = [{ tipo: 'texto', texto: t('respostas.naoEntendi.texto', { q }) }];
      if (proximas.length) blocos.push({ tipo: 'texto', texto: t('respostas.naoEntendi.sugestoesPalavras', { lista: juntar(proximas) }) });
      if (parsed.palavras.length) blocos.push({ tipo: 'texto', texto: t('respostas.naoEntendi.palavrasAchadas', { lista: juntar(nomes) }) });
      return { ...base, titulo: t('respostas.naoEntendi.titulo'), blocos, acoes: [], sugestoes: [...proximas.map((w) => t('respostas.sugestoes.mostrar', { palavra: w })), ...tl('respostas.sugestoes.padrao')].slice(0, MAX_SUGESTOES) };
    }
  }
}

/** Texto plano para "Copiar resposta": título, blocos, origem e endereço do app. */
export function textoParaCopiar(r, pergunta) {
  const linhas = [pergunta ? `${t('respostas.copiar.pergunta')} ${pergunta}` : null, r.titulo, ''];
  for (const b of r.blocos) {
    if (b.tipo === 'texto' || b.tipo === 'aviso') linhas.push(b.texto);
    else if (b.tipo === 'lista') linhas.push(...(b.titulo ? [b.titulo] : []), ...b.itens.map((i) => `• ${i}`));
    else if (b.tipo === 'tabela') linhas.push(b.cabecalho.join(' | '), ...b.linhas.map((l) => l.join(' | ')));
  }
  if (r.gerado) linhas.push('', r.gerado.texto, rotuloOrigem({ origem: 'GENERATIVA', modelo: r.gerado.modelo }));
  linhas.push('', rotuloOrigem(r), t('respostas.copiar.rodape'));
  return linhas.filter((l) => l != null).join('\n');
}
