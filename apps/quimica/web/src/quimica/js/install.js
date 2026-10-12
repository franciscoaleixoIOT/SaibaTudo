// Instalação do PWA: `beforeinstallprompt` quando disponível; instruções para iPhone/iPad e demais navegadores (textos do catálogo do idioma).
import { t, tl } from './i18n/index.js';

let evento = null;
const ouvintes = new Set();

export function iniciarInstalacao() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    ouvintes.forEach((f) => f());
  });
}

export const aoMudarInstalacao = (f) => { ouvintes.add(f); return () => ouvintes.delete(f); };

export const jaInstalado = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const podeInstalarAgora = () => evento != null && !jaInstalado();

/** Abre o diálogo nativo de instalação. Retorna 'accepted' | 'dismissed' | null (sem suporte). */
export async function instalar() {
  if (!evento) return null;
  const e = evento;
  evento = null;
  ouvintes.forEach((f) => f());
  await e.prompt();
  try { return (await e.userChoice).outcome; } catch { return null; }
}

/** Passo a passo por plataforma, para quando não há prompt automático. */
export function instrucoes() {
  const chave = ehIos() ? 'ios' : 'geral';
  return { titulo: t(`ui.install.${chave}.titulo`), passos: tl(`ui.install.${chave}.passos`) };
}
