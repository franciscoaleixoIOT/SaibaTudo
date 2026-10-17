// Início: caixa de pergunta (motor local), resposta com fonte em cada bloco, sugestões e atalhos para as telas. Textos pelo catálogo do idioma.
// IA na nuvem (opt-in, 14/10/2026): botão "Perguntar à IA na nuvem" em toda resposta que não veio da nuvem (padrão docs/PADRAO_ASSISTENTE.md §IA na
// nuvem); o toque é o consentimento para enviar SÓ aquela pergunta; a resposta nova continua montada dos dados locais.
// "Ajudar a melhorar o app" (16/10/2026, js/melhoria.js): na resposta NÃO entendida (nunca na recusa de segurança), junto do bloco da nuvem, a
// explicação e o botão "Enviar esta pergunta" (consentimento daquela pergunta); com a chave ligada em Configurações, a pergunta já entra na fila.
import { dataDoPacote, sugestoesPadrao } from '../answers.js';
import { h, icon, anunciar, trocar } from '../dom.js';
import { t } from '../i18n/index.js';
import { filaMelhoria, respostaCandidata, textoEnfileiravel } from '../melhoria.js';
import { chaveFalhaNuvem, ofereceNuvem, pedirANuvem } from '../nuvem.js';
import { carregar, registrarPergunta } from '../prefs.js';
import { ajustarAltura, blocoEl, campoAutoAltura, cartaoEl, chip, linkExterno, linkRota, toast } from './componentes.js';

const URL_ISSUES = 'https://github.com/franciscoaleixoIOT/SaibaTudo/issues/new';

/** Copia a resposta em texto plano (título, blocos e fontes). Padrão dos apps SaibaTudo. */
async function copiarResposta(r) {
  const fontes = (r.fontes ?? []).map((f) => `- ${f.nome}${f.licenca ? ` (${f.licenca})` : ''}${f.url ? `: ${f.url}` : ''}`).join('\n');
  const texto = `${r.directAnswer}\n\n${t('ui.inicio.copiarRodape')}\n${fontes}\n\n${t('ui.marca')} — https://saibatudo.net/quimica/`;
  try { await navigator.clipboard.writeText(texto); toast(t('ui.inicio.copiada')); } catch { toast(t('ui.inicio.naoCopiou')); }
}

/** Link para relatar um problema na resposta (issue pública no GitHub, com a pergunta no título; nada é enviado sem a pessoa clicar). */
function urlRelato(pergunta) {
  const q = String(pergunta ?? '');
  const p = new URLSearchParams({ title: t('ui.inicio.relatoTitulo', { pergunta: q.slice(0, 80) }), labels: 'quimica,resposta', body: t('ui.inicio.relatoCorpo', { pergunta: q }) });
  return `${URL_ISSUES}?${p}`;
}

let ultima = null; // { pergunta, resposta, idioma } mantida ao navegar entre telas

/** Esquece a última resposta (ao trocar o idioma, por exemplo). */
export function limparUltimaResposta() { ultima = null; }

function acaoEl(a) {
  if (a.externo) return h('a', { class: 'btn btn-contorno peq', href: a.url, target: '_blank', rel: 'noopener noreferrer' }, a.rotulo, icon('external', 14));
  return linkRota(a.rota, a.rotulo, { class: 'btn btn-contorno peq' });
}

/** Bloco da IA na nuvem numa resposta: botão + nota de consentimento; `pedirNuvem(r, slot)` é definido pela tela (null = sem botão). */
function nuvemEl(r, pedirNuvem) {
  if (!pedirNuvem || !ofereceNuvem(r, carregar().nuvemAutomatica === true)) return null;
  const slot = h('div', { class: 'resp-nuvem' });
  const botao = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: () => pedirNuvem(r, slot) }, icon('cloud', 16), t('ui.nuvem.botao'));
  slot.replaceChildren(botao, h('p', { class: 'mini mudo' }, t(r.resolvida ? 'ui.nuvem.notaConferir' : 'ui.nuvem.nota')));
  return slot;
}

/** Resultado do envio (melhoria.js) → chave do catálogo ui.melhoria.*. Nenhum caso é mostrado como erro: a pergunta fica guardada. */
export const chaveResultadoMelhoria = (res) => ({ enviado: 'enviada', indisponivel: 'indisponivel', falhou: 'falhou', offline: 'falhou' })[res] ?? 'guardada';

/**
 * Bloco "Ajudar a melhorar o app" numa resposta não entendida. `naFila` = a chave está ligada e a pergunta já entrou na fila (só um aviso);
 * senão, explicação + botão "Enviar esta pergunta". null quando a resposta não é candidata ou o texto não pode ser enviado (dado pessoal, perigo).
 */
export function melhoriaEl(r, pergunta, { naFila = false, fila = filaMelhoria() } = {}) {
  const q = pergunta ?? r?.pergunta ?? null;
  if (!respostaCandidata(r) || !textoEnfileiravel(q)) return null;
  const slot = h('div', { class: 'resp-melhoria' });
  if (naFila) {
    slot.replaceChildren(h('p', { class: 'mini mudo' }, icon('info', 14), ' ', t('ui.melhoria.naFila')));
    return slot;
  }
  const botao = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: async () => {
    botao.disabled = true;
    botao.textContent = t('ui.melhoria.enviando');
    fila.enfileirar(q, r.intent, { explicito: true });
    let res = 'falhou';
    try { res = await fila.enviarSePreciso({ forcar: true }); } catch { res = 'falhou'; }
    slot.replaceChildren(h('p', { class: 'mini', role: 'status' }, icon(res === 'enviado' ? 'verified' : 'info', 14), ' ', t(`ui.melhoria.${chaveResultadoMelhoria(res)}`)));
    anunciar(t(`ui.melhoria.${chaveResultadoMelhoria(res)}`));
  } }, icon('send', 16), t('ui.melhoria.botao'));
  slot.replaceChildren(h('strong', null, t('ui.melhoria.titulo')), h('p', { class: 'mini mudo' }, t('ui.melhoria.explicacao')), botao);
  return slot;
}

export function respostaEl(r, perguntar, { pergunta = null, dataDados = null, fechar = null, pedirNuvem = null, melhoria = null } = {}) {
  const classe = r.intent === 'RECUSA_PERIGO' ? 'recusa' : r.resolvida ? '' : 'nao-resolvida';
  const rotulo = r.intent === 'RECUSA_PERIGO' ? t('ui.resposta.rotuloRecusa') : r.resolvida ? t('ui.resposta.rotuloResolvida') : t('ui.resposta.rotuloNaoResolvida');
  const titulo = h('h2', { class: 'resp-titulo', tabindex: '-1', id: 'resp-titulo' }, r.titulo);
  const origem = r.origem === 'NUVEM' ? t('ui.resposta.origemNuvem', { modelo: r.modelo ?? 'SaibaTudo IA' }) : t('ui.resposta.origemAparelho');
  const el = h('section', { class: `resposta ${classe}`.trim(), 'aria-labelledby': 'resp-titulo' },
    h('div', { class: 'resp-cab' },
      h('span', { class: 'resp-ic' }, icon(r.intent === 'RECUSA_PERIGO' ? 'shield' : r.resolvida ? 'verified' : 'help', 22)),
      h('div', { class: 'resp-corpo' }, h('div', { class: 'resp-rotulo' }, rotulo), titulo,
        h('p', { class: 'resp-origem mini mudo' }, t('ui.resposta.origem', { origem }) + (dataDados ? t('ui.resposta.dadosDe', { data: dataDados }) : ''))),
      fechar ? h('button', { type: 'button', class: 'btn-icone mini-btn', 'aria-label': t('ui.resposta.fechar'), onClick: fechar }, icon('x', 18)) : null),
    r.blocos.map(blocoEl),
    r.acoes?.length ? h('div', { class: 'resp-acoes' }, r.acoes.map(acaoEl)) : null,
    nuvemEl(r, pedirNuvem),
    melhoria ? melhoriaEl(r, pergunta, melhoria) : null,
    r.sugestoes?.length ? h('div', { class: 'resp-sugestoes' }, h('div', { class: 'rot' }, t('ui.resposta.tambem')),
      h('div', { class: 'chips' }, r.sugestoes.map((s) => chip({ rotulo: s, icone: false, classe: 'sug', onClick: () => perguntar(s) })))) : null,
    r.fontes?.length ? h('details', { class: 'resp-fontes' }, h('summary', null, t('ui.resposta.fontes', { n: r.fontes.length })),
      h('ul', null, r.fontes.map((f) => h('li', null, f.url ? linkExterno(f.url, f.nome) : f.nome, f.licenca ? ` — ${f.licenca}` : '')))) : null,
    h('div', { class: 'chips resp-rodape' },
      h('button', { type: 'button', class: 'btn btn-texto peq', onClick: () => copiarResposta(r) }, icon('copy', 14), t('ui.resposta.copiar')),
      h('a', { class: 'btn btn-texto peq', href: urlRelato(pergunta), target: '_blank', rel: 'noopener noreferrer' }, icon('flag', 14), t('ui.resposta.relatar'))));
  return el;
}

export function viewInicio({ engine, query }) {
  const regiao = h('div', { id: 'resposta', 'aria-live': 'polite' });
  let form = null;
  // campo que cresce de 1 a 3 linhas; Enter envia; o texto digitado fica limpo depois de enviar (como no app de Eleições)
  const campo = campoAutoAltura({
    maxLinhas: 3, classe: 'busca-campo', id: 'pergunta', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', maxlength: '300',
    'aria-label': t('ui.inicio.campoAria'), placeholder: t('ui.inicio.placeholder'),
    onEnter: () => { if (form?.requestSubmit) form.requestSubmit(); else perguntar(campo.value); }
  });
  let ocupado = false;
  let limpar = null; let enviar = null; let girando = null;
  const chipsDaHome = [];
  function atualizarEstado() {
    const tem = campo.value.trim().length > 0;
    if (limpar) limpar.hidden = !tem || ocupado;
    if (enviar) enviar.disabled = !tem || ocupado;
    if (girando) girando.hidden = !ocupado;
    for (const c of chipsDaHome) c.disabled = ocupado;
  }

  // histórico de perguntas (só neste navegador): cartão com a última pergunta e setas, e as teclas ↑/↓ no campo
  let historico = carregar().historicoPerguntas ?? [];
  let posicao = historico.length;
  let rascunho = '';
  const slotHistorico = h('div', { id: 'busca-historico-slot' });

  function porNoCampo(texto) {
    campo.value = texto;
    ajustarAltura(campo);
    campo.focus();
    campo.setSelectionRange?.(texto.length, texto.length);
  }
  function subir() {
    if (posicao <= 0 || !historico.length) return;
    if (posicao === historico.length) rascunho = campo.value;
    posicao--;
    porNoCampo(historico[posicao]);
    renderHistorico();
  }
  function descer() {
    if (posicao >= historico.length) return;
    posicao++;
    porNoCampo(posicao === historico.length ? rascunho : historico[posicao]);
    renderHistorico();
  }
  function cartaoHistorico() {
    const ultimaPergunta = historico[historico.length - 1];
    if (!ultimaPergunta) return null;
    return h('div', { class: 'busca-historico', id: 'busca-historico' },
      h('div', { class: 'busca-historico-txt' },
        h('span', { class: 'busca-historico-rotulo' }, t('ui.inicio.historico.ultima')),
        h('span', { class: 'busca-historico-pergunta', title: ultimaPergunta }, ultimaPergunta)),
      h('div', { class: 'busca-historico-acoes' },
        h('button', { type: 'button', class: 'busca-historico-btn', id: 'hist-subir', 'aria-label': t('ui.inicio.historico.anterior'), title: t('ui.inicio.historico.anterior'), disabled: posicao <= 0, onClick: subir }, icon('chevUp', 18)),
        h('button', { type: 'button', class: 'busca-historico-btn', id: 'hist-descer', 'aria-label': t('ui.inicio.historico.proxima'), title: t('ui.inicio.historico.proxima'), disabled: posicao >= historico.length, onClick: descer }, icon('chevDown', 18))));
  }
  function renderHistorico() { trocar(slotHistorico, cartaoHistorico()); }
  campo.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowUp' && posicao > 0 && (campo.selectionStart === 0 || !campo.value.includes('\n'))) { e.preventDefault(); subir(); }
    else if (e.key === 'ArrowDown' && posicao < historico.length && (campo.selectionEnd === campo.value.length || !campo.value.includes('\n'))) { e.preventDefault(); descer(); }
  });

  async function perguntar(texto) {
    const q = String(texto ?? campo.value).trim();
    if (!q || ocupado) return;
    historico = registrarPergunta(q);
    posicao = historico.length;
    rascunho = '';
    campo.value = '';
    ajustarAltura(campo);
    renderHistorico();
    ocupado = true;
    atualizarEstado();
    anunciar(t('ui.inicio.analisandoPergunta'));
    regiao.replaceChildren(h('div', { class: 'carregando', role: 'status' }, h('span', { class: 'spinner mini', 'aria-hidden': 'true' }), h('span', { class: 'mudo' }, t('ui.inicio.pensando'))));
    try {
      const r = await engine.responder(q);
      // "Ajudar a melhorar o app" ligado: a pergunta não entendida entra na fila (filtrada) e vai em lote quando houver o bastante
      const fila = filaMelhoria();
      const candidata = respostaCandidata(r);
      if (candidata && fila.enfileirar(q, r.intent)) fila.enviarSePreciso().catch(() => {});
      const naFila = candidata && fila.habilitada() === true;
      ultima = { pergunta: q, resposta: r, naFila };
      mostrar(r, true);
    } finally { ocupado = false; atualizarEstado(); }
  }

  const dataDados = () => dataDoPacote(engine.store);
  // toque em "Perguntar à IA na nuvem": consentimento desta pergunta; enquanto consulta, o botão vira um aviso; falha = aviso com o motivo (e sugestões)
  async function pedirNuvem(r, slot) {
    if (ocupado) return;
    const pergunta = ultima?.pergunta ?? r.pergunta;
    ocupado = true;
    atualizarEstado();
    slot.replaceChildren(h('div', { class: 'carregando', role: 'status' }, h('span', { class: 'spinner mini', 'aria-hidden': 'true' }), h('span', { class: 'mudo' }, t('ui.nuvem.consultando'))));
    anunciar(t('ui.nuvem.consultando'));
    try {
      const res = await pedirANuvem({ engine, atual: r, pergunta });
      if (res.ok) {
        ultima = { pergunta, resposta: res.resposta, naFila: false };
        mostrar(res.resposta, true);
        return;
      }
      const aviso = h('p', { class: 'aviso-caixa discreto', role: 'status' }, icon('info', 16), t(`ui.nuvem.${chaveFalhaNuvem(r.resolvida, res.motivo)}`));
      const sug = res.sugestoes?.length ? h('div', { class: 'resp-sugestoes' }, h('div', { class: 'rot' }, t('ui.nuvem.quisDizer')),
        h('div', { class: 'chips' }, res.sugestoes.map((s) => chip({ rotulo: s.nome, icone: false, classe: 'sug', onClick: () => perguntar(s.nome) })))) : null;
      slot.replaceChildren(aviso, sug);
    } finally { ocupado = false; atualizarEstado(); }
  }
  function mostrar(r, foco) {
    regiao.replaceChildren(respostaEl(r, perguntar, { pergunta: ultima?.pergunta, dataDados: dataDados(), pedirNuvem, melhoria: { naFila: ultima?.naFila === true }, fechar: () => { ultima = null; engine.limparContexto?.(); regiao.replaceChildren(); campo.focus(); } }));
    if (foco) {
      document.getElementById('resp-titulo')?.focus({ preventScroll: false });
      anunciar(r.resolvida ? t('ui.inicio.respostaAnuncio', { titulo: r.titulo }) : r.titulo);
    }
  }

  limpar = h('button', { type: 'button', class: 'btn-icone mini-btn', 'aria-label': t('ui.inicio.limpar'), hidden: true, onClick: () => { campo.value = ''; ajustarAltura(campo); atualizarEstado(); campo.focus(); } }, icon('x', 18));
  girando = h('span', { class: 'spinner mini', hidden: true, role: 'img', 'aria-label': t('ui.inicio.analisando') });
  enviar = h('button', { class: 'btn-icone mini-btn envia', type: 'submit', 'aria-label': t('ui.inicio.perguntar'), disabled: true }, icon('send', 22));
  campo.addEventListener('input', atualizarEstado);
  form = h('form', { class: 'busca-form', role: 'search', onSubmit: (e) => { e.preventDefault(); perguntar(); } },
    h('label', { class: 'sr-only', for: 'pergunta' }, t('ui.inicio.campoAria')),
    icon('search', 22), campo, limpar, girando, enviar);
  renderHistorico();

  const C = (k) => t(`ui.inicio.cartoes.${k}`);
  const no = h('div', null,
    h('section', { class: 'hero' },
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, t('ui.inicio.cabecalho')),
      h('p', null, t('ui.inicio.intro')),
      slotHistorico,
      form,
      h('div', { class: 'chips sugestoes', role: 'group', 'aria-label': t('ui.inicio.exemplosAria') }, sugestoesPadrao().map((s) => { const c = chip({ rotulo: s, icone: false, classe: 'sug', onClick: () => perguntar(s) }); chipsDaHome.push(c); return c; })),
      h('span', { class: 'ia-badge' }, icon('shield', 14), t('ui.inicio.badge'))),
    regiao,
    h('section', { class: 'secao' },
      h('h2', null, t('ui.inicio.explore')),
      h('div', { class: 'cartoes' },
        cartaoEl('/quimica/tabela', 'table', C('tabela').titulo, C('tabela').descricao),
        cartaoEl('/quimica/compostos', 'molecule', C('compostos').titulo, C('compostos').descricao),
        cartaoEl('/quimica/calculadoras', 'calculator', C('calculadoras').titulo, C('calculadoras').descricao),
        cartaoEl('/quimica/seguranca', 'shield', C('seguranca').titulo, C('seguranca').descricao),
        cartaoEl('/quimica/sobre-os-dados', 'book', C('sobre').titulo, C('sobre').descricao))));

  const q0 = query?.get('q');
  if (q0) setTimeout(() => perguntar(q0), 0);
  else if (ultima) mostrar(ultima.resposta, false); // a pergunta anterior fica no histórico (↑), não no campo
  return { titulo: t('ui.inicio.titulo'), node: no, foco: '#pergunta' };
}
