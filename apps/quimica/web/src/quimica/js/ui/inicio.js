// Início: caixa de pergunta (motor local), resposta com fonte em cada bloco, sugestões e atalhos para as telas.
import { SUGESTOES_PADRAO } from '../answers.js';
import { h, icon, anunciar, trocar } from '../dom.js';
import { carregar, registrarPergunta } from '../prefs.js';
import { ajustarAltura, blocoEl, campoAutoAltura, cartaoEl, chip, linkExterno, linkRota, toast } from './componentes.js';

const URL_ISSUES = 'https://github.com/franciscoaleixoIOT/SaibaTudo/issues/new';
const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : null; };

/** Copia a resposta em texto plano (título, blocos e fontes). Padrão dos apps SaibaTudo. */
async function copiarResposta(r) {
  const fontes = (r.fontes ?? []).map((f) => `- ${f.nome}${f.licenca ? ` (${f.licenca})` : ''}${f.url ? `: ${f.url}` : ''}`).join('\n');
  const texto = `${r.directAnswer}\n\nFontes:\n${fontes}\n\nSaibaTudo Química — https://saibatudo.net/quimica/`;
  try { await navigator.clipboard.writeText(texto); toast('Resposta copiada.'); } catch { toast('Não foi possível copiar neste navegador.'); }
}

/** Link para relatar um problema na resposta (issue pública no GitHub, com a pergunta no título; nada é enviado sem a pessoa clicar). */
function urlRelato(pergunta) {
  const p = new URLSearchParams({ title: `Química: resposta a "${String(pergunta ?? '').slice(0, 80)}"`, labels: 'quimica,resposta',
    body: 'O que estava errado ou faltou na resposta? (Não inclua dados pessoais.)\n\nPergunta: ' + String(pergunta ?? '') });
  return `${URL_ISSUES}?${p}`;
}

let ultima = null; // { pergunta, resposta } mantida ao navegar entre telas

function acaoEl(a) {
  if (a.externo) return h('a', { class: 'btn btn-contorno peq', href: a.url, target: '_blank', rel: 'noopener noreferrer' }, a.rotulo, icon('external', 14));
  return linkRota(a.rota, a.rotulo, { class: 'btn btn-contorno peq' });
}

export function respostaEl(r, perguntar, { pergunta = null, dataDados = null, fechar = null } = {}) {
  const classe = r.intent === 'RECUSA_PERIGO' ? 'recusa' : r.resolvida ? '' : 'nao-resolvida';
  const rotulo = r.intent === 'RECUSA_PERIGO' ? 'Pedido recusado por segurança' : r.resolvida ? 'Resposta montada no seu aparelho, a partir dos dados' : 'Não consegui responder';
  const titulo = h('h2', { class: 'resp-titulo', tabindex: '-1', id: 'resp-titulo' }, r.titulo);
  const origem = r.origem === 'NUVEM' ? 'IA na nuvem' : 'no seu aparelho';
  const el = h('section', { class: `resposta ${classe}`.trim(), 'aria-labelledby': 'resp-titulo' },
    h('div', { class: 'resp-cab' },
      h('span', { class: 'resp-ic' }, icon(r.intent === 'RECUSA_PERIGO' ? 'shield' : r.resolvida ? 'verified' : 'help', 22)),
      h('div', { class: 'resp-corpo' }, h('div', { class: 'resp-rotulo' }, rotulo), titulo,
        h('p', { class: 'resp-origem mini mudo' }, `Resposta montada ${origem}` + (dataDados ? ` • dados do pacote de ${dataDados}` : ''))),
      fechar ? h('button', { type: 'button', class: 'btn-icone mini-btn', 'aria-label': 'Fechar resposta', onClick: fechar }, icon('x', 18)) : null),
    r.blocos.map(blocoEl),
    r.acoes?.length ? h('div', { class: 'resp-acoes' }, r.acoes.map(acaoEl)) : null,
    r.sugestoes?.length ? h('div', { class: 'resp-sugestoes' }, h('div', { class: 'rot' }, 'Você também pode perguntar'),
      h('div', { class: 'chips' }, r.sugestoes.map((s) => chip({ rotulo: s, icone: false, classe: 'sug', onClick: () => perguntar(s) })))) : null,
    r.fontes?.length ? h('details', { class: 'resp-fontes' }, h('summary', null, `Fontes e licenças (${r.fontes.length})`),
      h('ul', null, r.fontes.map((f) => h('li', null, f.url ? linkExterno(f.url, f.nome) : f.nome, f.licenca ? ` — ${f.licenca}` : '')))) : null,
    h('div', { class: 'chips resp-rodape' },
      h('button', { type: 'button', class: 'btn btn-texto peq', onClick: () => copiarResposta(r) }, icon('copy', 14), 'Copiar resposta'),
      h('a', { class: 'btn btn-texto peq', href: urlRelato(pergunta), target: '_blank', rel: 'noopener noreferrer' }, icon('flag', 14), 'Relatar problema nesta resposta')));
  return el;
}

export function viewInicio({ engine, query }) {
  const regiao = h('div', { id: 'resposta', 'aria-live': 'polite' });
  let form = null;
  // campo que cresce de 1 a 3 linhas; Enter envia; o texto digitado fica limpo depois de enviar (como no app de Eleições)
  const campo = campoAutoAltura({
    maxLinhas: 3, classe: 'busca-campo', id: 'pergunta', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', maxlength: '300',
    'aria-label': 'Pergunte sobre Química', placeholder: 'Ex.: massa molar da água, Fe + O2 -> Fe2O3, pH de HCl 0,01 mol/L',
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
        h('span', { class: 'busca-historico-rotulo' }, 'Última pergunta'),
        h('span', { class: 'busca-historico-pergunta', title: ultimaPergunta }, ultimaPergunta)),
      h('div', { class: 'busca-historico-acoes' },
        h('button', { type: 'button', class: 'busca-historico-btn', id: 'hist-subir', 'aria-label': 'Pergunta anterior', title: 'Pergunta anterior', disabled: posicao <= 0, onClick: subir }, icon('chevUp', 18)),
        h('button', { type: 'button', class: 'busca-historico-btn', id: 'hist-descer', 'aria-label': 'Próxima pergunta ou caixa em branco', title: 'Próxima pergunta ou caixa em branco', disabled: posicao >= historico.length, onClick: descer }, icon('chevDown', 18))));
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
    anunciar('Analisando a pergunta…');
    regiao.replaceChildren(h('div', { class: 'carregando', role: 'status' }, h('span', { class: 'spinner mini', 'aria-hidden': 'true' }), h('span', { class: 'mudo' }, 'Pensando…')));
    try {
      const r = await engine.responder(q);
      ultima = { pergunta: q, resposta: r };
      mostrar(r, true);
    } finally { ocupado = false; atualizarEstado(); }
  }

  const dataDados = () => dataBr(engine.store?.manifest?.generatedAt);
  function mostrar(r, foco) {
    regiao.replaceChildren(respostaEl(r, perguntar, { pergunta: ultima?.pergunta, dataDados: dataDados(), fechar: () => { ultima = null; regiao.replaceChildren(); campo.focus(); } }));
    if (foco) {
      document.getElementById('resp-titulo')?.focus({ preventScroll: false });
      anunciar(r.resolvida ? `Resposta: ${r.titulo}` : r.titulo);
    }
  }

  limpar = h('button', { type: 'button', class: 'btn-icone mini-btn', 'aria-label': 'Limpar texto', hidden: true, onClick: () => { campo.value = ''; ajustarAltura(campo); atualizarEstado(); campo.focus(); } }, icon('x', 18));
  girando = h('span', { class: 'spinner mini', hidden: true, role: 'img', 'aria-label': 'Analisando' });
  enviar = h('button', { class: 'btn-icone mini-btn envia', type: 'submit', 'aria-label': 'Perguntar', disabled: true }, icon('send', 22));
  campo.addEventListener('input', atualizarEstado);
  form = h('form', { class: 'busca-form', role: 'search', onSubmit: (e) => { e.preventDefault(); perguntar(); } },
    h('label', { class: 'sr-only', for: 'pergunta' }, 'Pergunte sobre Química'),
    icon('search', 22), campo, limpar, girando, enviar);
  renderHistorico();

  const no = h('div', null,
    h('section', { class: 'hero' },
      h('h1', { class: 'titulo-pagina', id: 'titulo-pagina', tabindex: '-1' }, 'Pergunte sobre Química'),
      h('p', null, 'Elementos, compostos, cálculos com passo a passo e segurança química. As respostas vêm de dados abertos e de cálculos feitos no seu aparelho.'),
      slotHistorico,
      form,
      h('div', { class: 'chips sugestoes', role: 'group', 'aria-label': 'Exemplos de perguntas' }, SUGESTOES_PADRAO.map((s) => { const c = chip({ rotulo: s, icone: false, classe: 'sug', onClick: () => perguntar(s) }); chipsDaHome.push(c); return c; })),
      h('span', { class: 'ia-badge' }, icon('shield', 14), 'Nada sai do seu aparelho. A IA na nuvem ainda não está disponível.')),
    regiao,
    h('section', { class: 'secao' },
      h('h2', null, 'Explore'),
      h('div', { class: 'cartoes' },
        cartaoEl('/quimica/tabela', 'table', 'Tabela periódica', 'Cores por categoria, filtros por bloco, período, grupo e estado.'),
        cartaoEl('/quimica/compostos', 'molecule', 'Compostos', 'Busque por nome, fórmula, CAS ou CID e veja a estrutura 2D.'),
        cartaoEl('/quimica/calculadoras', 'calculator', 'Calculadoras', 'Massa molar, balanceamento, estequiometria, concentração, pH, gás ideal e unidades.'),
        cartaoEl('/quimica/seguranca', 'shield', 'Segurança', 'Pictogramas do GHS, frases H e como evitar misturas perigosas.'),
        cartaoEl('/quimica/sobre-os-dados', 'book', 'Sobre os dados', 'Fontes, licenças, datas e verificação da assinatura digital.'))));

  const q0 = query?.get('q');
  if (q0) setTimeout(() => perguntar(q0), 0);
  else if (ultima) mostrar(ultima.resposta, false); // a pergunta anterior fica no histórico (↑), não no campo
  return { titulo: 'Início', node: no, foco: '#pergunta' };
}
