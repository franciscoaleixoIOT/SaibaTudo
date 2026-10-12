// Comportamento da home: ícones, botão da Google Play (configurável em apps.js), lista de apps, tema, instalação e aviso de
// idioma. Os textos fixos da página vêm do build (portal/src/portal/i18n/<idioma>.js); os poucos textos criados aqui em tempo
// de execução ficam em textos.js (UI, por idioma da página — <html lang> — e o aviso "esta página existe em…", AVISO).
import { svgIcone } from '/portal/icons.js';
import { APPS, EM_BREVE, GOOGLE_PLAY_URL } from '/portal/apps.js';
import { AVISO, UI } from '/portal/textos.js';

const CHAVE = 'st26:prefs';
const CHAVE_AVISO = 'st:portal-aviso-idioma';
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

const IDIOMA = document.documentElement.lang in UI ? document.documentElement.lang : 'pt-BR';
const ui = UI[IDIOMA];
const traduzido = (item, campo) => item.traducoes?.[IDIOMA]?.[campo] ?? item[campo];

// Ícones decorativos: <span data-icone="github" data-tam="20">
for (const s of document.querySelectorAll('[data-icone]')) {
  const t = document.createElement('template');
  t.innerHTML = svgIcone(s.dataset.icone, Number(s.dataset.tam) || 20);
  s.replaceChildren(t.content.firstChild);
}

// Botão "Baixar na Google Play": desabilitado ("em breve") até GOOGLE_PLAY_URL existir
const play = document.getElementById('btn-play');
if (play && GOOGLE_PLAY_URL) {
  const a = el('a', 'btn btn-contorno grande');
  a.href = GOOGLE_PLAY_URL;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = ui.play;
  play.replaceWith(a);
}

// Apps adicionais (APPS) e "Em breve" (EM_BREVE) a partir de dados
const listaApps = document.getElementById('apps-extra');
if (listaApps) {
  for (const app of APPS) {
    const c = el('article', 'card app-card');
    c.append(el('h3', null, traduzido(app, 'nome')), el('p', 'mudo', traduzido(app, 'descricao')));
    const acoes = el('div', 'acoes');
    const abrir = el('a', 'btn btn-primario', ui.abrir(traduzido(app, 'nome')));
    abrir.href = app.url;
    acoes.append(abrir);
    if (app.playUrl) { const p = el('a', 'btn btn-contorno', ui.play); p.href = app.playUrl; p.target = '_blank'; p.rel = 'noopener noreferrer'; acoes.append(p); }
    c.append(acoes);
    listaApps.append(c);
  }
}
const emBreve = document.getElementById('em-breve-lista');
if (emBreve) {
  for (const app of EM_BREVE) {
    const c = el('li', 'card breve');
    c.append(el('span', 'tag tag-ouro', ui.emBreve), el('h3', null, traduzido(app, 'titulo')), el('p', 'mudo', traduzido(app, 'descricao')));
    if (app.repo) { const r = el('p', 'mini mudo'); r.append(ui.repo, el('code', null, app.repo)); c.append(r); }
    emBreve.append(c);
  }
}

// Tema (compartilha a preferência "tema" com o app: localStorage st26:prefs)
const ciclo = ['SISTEMA', 'CLARO', 'ESCURO'];
const lerPrefs = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null') || {}; } catch { return {}; } };
const btnTema = document.getElementById('btn-tema');
function aplicarTema(t) {
  const r = document.documentElement;
  if (t === 'CLARO') r.setAttribute('data-theme', 'light'); else if (t === 'ESCURO') r.setAttribute('data-theme', 'dark'); else r.removeAttribute('data-theme');
  if (btnTema) {
    btnTema.setAttribute('aria-label', ui.temaAria(ui.tema[t]));
    btnTema.title = ui.temaTitulo(ui.tema[t]);
    const rot = btnTema.querySelector('.tema-rot');
    if (rot) rot.textContent = ui.temaRot[t];
  }
}
let tema = ciclo.includes(lerPrefs().tema) ? lerPrefs().tema : 'SISTEMA';
aplicarTema(tema);
btnTema?.addEventListener('click', () => {
  tema = ciclo[(ciclo.indexOf(tema) + 1) % ciclo.length];
  try { localStorage.setItem(CHAVE, JSON.stringify({ ...lerPrefs(), tema })); } catch { /* sem armazenamento */ }
  aplicarTema(tema);
});

// Aviso de idioma: só em /, para quem não navega em português e não veio de uma versão traduzida da própria home.
// Nunca redireciona; a dispensa fica em localStorage (ou dura só a visita, se não houver armazenamento).
const seletor = document.querySelector('nav.idiomas');
if (IDIOMA === 'pt-BR' && seletor) {
  let dispensado = false;
  try { dispensado = localStorage.getItem(CHAVE_AVISO) === '1'; } catch { /* sem armazenamento */ }
  const linguas = (navigator.languages?.length ? navigator.languages : [navigator.language || '']).map((l) => String(l).toLowerCase());
  let veioDaHome = false;
  try { const ref = new URL(document.referrer); veioDaHome = ref.origin === location.origin && /^\/(en|es|de|fr)\/?$/.test(ref.pathname); } catch { /* sem referrer */ }
  if (!dispensado && !veioDaHome && linguas.length && !linguas.some((l) => l === 'pt' || l.startsWith('pt-'))) {
    const oferecido = linguas.map((l) => l.split('-')[0]).find((l) => l in AVISO) || 'en';
    const aviso = el('div', 'aviso-idioma');
    aviso.lang = oferecido;
    aviso.setAttribute('role', 'status');
    const a = el('a', null, AVISO[oferecido].texto);
    a.href = `/${oferecido}/`;
    a.hreflang = oferecido;
    const fechar = el('button', 'aviso-fechar', '×');
    fechar.type = 'button';
    fechar.setAttribute('aria-label', AVISO[oferecido].fechar);
    fechar.addEventListener('click', () => { aviso.remove(); try { localStorage.setItem(CHAVE_AVISO, '1'); } catch { /* sem armazenamento */ } });
    aviso.append(a, fechar);
    seletor.after(aviso);
  }
}

// Instalação do portal SaibaTudo (a instalação do app Eleições 2026 é oferecida dentro do próprio app)
const btnInstalar = document.getElementById('btn-instalar');
let evento = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e; if (btnInstalar) btnInstalar.hidden = false; });
window.addEventListener('appinstalled', () => { evento = null; if (btnInstalar) btnInstalar.hidden = true; });
btnInstalar?.addEventListener('click', async () => {
  if (!evento) return;
  const e = evento; evento = null; btnInstalar.hidden = true;
  await e.prompt();
});

// Service worker do portal: só em HTTPS ou localhost
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname))) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); });
}
