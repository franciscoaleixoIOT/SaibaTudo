// Ponto de entrada do PWA /llms/.
import { iniciarApp, registrarCarregador, toast } from './app.js';
import { Vetores } from './data.js';
import { t } from './i18n/index.js';
import { iniciarNuvemUI } from './ui/nuvem-ui.js';

// pacote de dados (vetores do GloVe): carga verificada antes de montar a casca; falha vira aviso e o app segue sem o explorador
registrarCarregador(async (S) => { S.vetores = await Vetores.carregar(); });
// IA na nuvem (opt-in): botao em cada resposta do assistente; o consentimento e pedido por pergunta ou gravado como modo automatico
iniciarNuvemUI();

/** Service worker: somente em HTTPS (produção) ou localhost. */
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const seguro = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (!seguro) return;
  // só avisa quando o controlador anterior era o service worker do próprio app
  let anterior = navigator.serviceWorker.controller?.scriptURL ?? '';
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (anterior.endsWith('/llms/sw.js')) toast(t('ui.app.novaVersao'));
    anterior = navigator.serviceWorker.controller?.scriptURL ?? '';
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/llms/sw.js', { scope: '/llms/' }).catch(() => { /* sem offline; o app segue online */ });
  });
}

registrarServiceWorker();
iniciarApp();
