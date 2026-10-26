// Botão "Perguntar à IA na nuvem" em cada resposta do assistente (docs/PADRAO_ASSISTENTE.md §3): opt-in por pergunta (diálogo de consentimento)
// ou contínuo (chave "IA na nuvem automática" em Configurações). Em caso de falha, aviso claro no idioma; nunca botão quebrado. O texto gerado
// entra na mesma resposta, rotulado com o nome do modelo (answers.rotuloOrigem), abaixo da resposta montada no aparelho, que permanece.
import { h, icon } from '../dom.js';
import { idiomaAtual, t } from '../i18n/index.js';
import { lexico } from '../nlu/lex/index.js';
import { NuvemExplica, contextoDoEstado, trechosDaPergunta } from '../nuvem.js';
import { carregar, installId, salvar } from '../prefs.js';
import { ganchos } from './inicio.js';

let nuvem = null;

/** Diálogo de consentimento (por pergunta). Resolve true/false; com "lembrar", grava o modo automático. */
function pedirConsentimento() {
  return new Promise((resolve) => {
    const lembrar = h('input', { type: 'checkbox', id: 'nuvem-lembrar' });
    const dlg = h('dialog', { class: 'dialogo' },
      h('form', { method: 'dialog', onSubmit: (e) => { e.preventDefault(); fechar(true); } },
        h('h2', null, t('ui.nuvem.botao')),
        h('p', { class: 'pequeno' }, t('ui.nuvem.consentimento')),
        h('label', { class: 'chave' }, lembrar, h('span', null, t('ui.nuvem.lembrar'))),
        h('div', { class: 'resposta-acoes' },
          h('button', { type: 'submit', class: 'btn btn-primario' }, t('ui.nuvem.confirmar')),
          h('button', { type: 'button', class: 'btn btn-contorno', onClick: () => fechar(false) }, t('ui.nuvem.cancelar')))));
    const fechar = (ok) => {
      if (ok && lembrar.checked) salvar({ ...carregar(), nuvemAutomatica: true });
      dlg.close(); dlg.remove(); resolve(ok);
    };
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); fechar(false); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

/** Liga o gancho do assistente. Chamar uma vez, antes de iniciarApp. */
export function iniciarNuvemUI({ fetch = undefined } = {}) {
  nuvem = new NuvemExplica({ fetch: fetch ?? ((...a) => globalThis.fetch(...a)), installId });
  ganchos.aoResponder = ({ ultima, vetores, estado, acrescentar }) => {
    if (!ultima || ultima.resposta.gerado) return;
    const aviso = h('p', { class: 'aviso-caixa discreto pequeno', role: 'status', hidden: true });
    const botao = h('button', { type: 'button', class: 'btn btn-contorno peq', onClick: () => pedir() }, icon('cloud', 16), t('ui.nuvem.botao'));
    let ocupado = false;
    async function pedir() {
      if (ocupado) return;
      if (carregar().nuvemAutomatica !== true && !(await pedirConsentimento())) return;
      ocupado = true;
      botao.disabled = true;
      botao.replaceChildren(h('span', { class: 'spinner peq', 'aria-hidden': 'true' }), ' ', t('ui.nuvem.consultando'));
      aviso.hidden = true;
      const idioma = idiomaAtual();
      const r = await nuvem.perguntar({ q: ultima.pergunta, idioma, contexto: contextoDoEstado(estado, vetores, idioma), trechos: trechosDaPergunta(ultima.parsed, idioma, lexico(idioma)) });
      ocupado = false;
      if (r.ok) { acrescentar({ gerado: { texto: r.answer, modelo: r.model }, extras: [] }); return; }
      botao.disabled = false;
      botao.replaceChildren(icon('cloud', 16), t('ui.nuvem.botao'));
      aviso.replaceChildren(icon('info', 14), ' ', t(`ui.nuvem.falha.${r.motivo}`));
      aviso.hidden = false;
    }
    acrescentar({ extras: [botao, aviso] });
    // modo automático: só quando o app não entendeu (padrão dos apps SaibaTudo); nas outras respostas o botão fica à mão
    if (carregar().nuvemAutomatica === true && ultima.resposta.intencao === 'DESCONHECIDA') pedir();
  };
}
