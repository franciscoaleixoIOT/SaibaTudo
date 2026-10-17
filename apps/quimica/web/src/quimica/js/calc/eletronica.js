// Configuração eletrônica (docs/CALCULADORAS_2026-10-17.md §2.2): a partir da notação do pacote (PubChem, abreviada com o cerne de gás nobre,
// ex.: "[Ar] 4s2 3d6"), expande o cerne, ordena pela ordem de preenchimento (diagrama de Linus Pauling / regra de Madelung) e por camadas,
// soma os elétrons por camada (K…Q), acha a camada de valência, os elétrons de valência e o subnível mais energético, e confere o total com Z.
// Íons (carga): o cátion perde elétrons da camada de maior n (e, nela, do subnível de maior l); o ânion ganha na ordem de preenchimento.
// Funções PURAS (sem texto: erros e avisos são códigos, traduzidos por quem mostra). Espelho no Android: domain/calc/Eletronica.kt.

/** Letras dos subníveis (l = 0…3) e capacidade de cada um (2·(2l+1)). */
export const LETRAS_SUBNIVEL = ['s', 'p', 'd', 'f'];
export const capacidadeSubnivel = (l) => 2 * (2 * l + 1);
/** Nomes das camadas pelo número quântico principal n = 1…7. */
export const CAMADAS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

/** Ordem de preenchimento (regra de Madelung, n + l crescente e, no empate, n crescente): 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p. */
export const ORDEM_PAULING = (() => {
  const out = [];
  for (let n = 1; n <= 7; n++) for (let l = 0; l <= Math.min(3, n - 1); l++) out.push({ n, l });
  // 5g e acima não existem nos 118 elementos
  return out.sort((a, b) => (a.n + a.l) - (b.n + b.l) || a.n - b.n);
})();
const indicePauling = (n, l) => ORDEM_PAULING.findIndex((x) => x.n === n && x.l === l);

/** Gases nobres do cerne e o número atômico de cada um (fatos da tabela periódica, IUPAC). */
export const CERNES = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86, Og: 118 };

/** Rótulo de um subnível: {n: 3, l: 2} → "3d". */
export const rotuloSubnivel = (s) => `${s.n}${LETRAS_SUBNIVEL[s.l]}`;

/** Preenchimento ideal (Madelung) de `z` elétrons, na ordem de preenchimento. Usado para expandir o cerne de gás nobre. */
export function preencherMadelung(z) {
  const out = [];
  let resto = z;
  for (const { n, l } of ORDEM_PAULING) {
    if (resto <= 0) break;
    const e = Math.min(resto, capacidadeSubnivel(l));
    out.push({ n, l, e });
    resto -= e;
  }
  return out;
}

const RX_SUBNIVEL = /^(\d)([spdf])(\d{1,2})$/;
const SOBRESCRITOS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

/**
 * Lê a notação (abreviada ou completa): "[Ar] 4s2 3d6", "1s2 2s2 2p6", "1s² 2s² 2p⁶", "[Rn] 7s2 7p6 5f14 6d10 (prevista)".
 * Devolve {cerne, subniveis: [{n, l, e}] (na ordem escrita, sem o cerne), ignorados: [texto]} ou null se não houver nenhum subnível válido.
 */
export function lerConfiguracao(texto) {
  const s = String(texto ?? '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SOBRESCRITOS[c]).replace(/\^/g, '').trim();
  if (!s) return null;
  let cerne = null;
  const subniveis = [];
  const ignorados = [];
  for (const tok of s.split(/[\s.,;]+/).filter(Boolean)) {
    const mC = /^\[([A-Z][a-z]?)\]$/.exec(tok);
    if (mC && CERNES[mC[1]] != null && cerne == null && !subniveis.length) { cerne = mC[1]; continue; }
    const m = RX_SUBNIVEL.exec(tok);
    if (m) {
      const n = Number(m[1]);
      const l = LETRAS_SUBNIVEL.indexOf(m[2]);
      const e = Number(m[3]);
      if (l < n && e >= 0 && e <= capacidadeSubnivel(l)) { subniveis.push({ n, l, e }); continue; }
    }
    ignorados.push(tok);
  }
  if (!subniveis.length && !cerne) return null;
  return { cerne, subniveis, ignorados };
}

/** Soma subníveis repetidos e tira os vazios: [{n, l, e}]. */
function juntar(lista) {
  const mapa = new Map();
  for (const s of lista) {
    const k = `${s.n}-${s.l}`;
    mapa.set(k, { n: s.n, l: s.l, e: (mapa.get(k)?.e ?? 0) + s.e });
  }
  return [...mapa.values()].filter((s) => s.e > 0);
}

/** Subníveis em ordem de preenchimento (Pauling). */
export const emOrdemPauling = (lista) => [...lista].sort((a, b) => indicePauling(a.n, a.l) - indicePauling(b.n, b.l));
/** Subníveis em ordem de camadas (n crescente, depois l). */
export const emOrdemCamadas = (lista) => [...lista].sort((a, b) => a.n - b.n || a.l - b.l);

/** Configuração completa (cerne expandido) de uma notação lida: [{n, l, e}] sem repetição. */
export function expandirCerne(lida) {
  if (!lida) return [];
  const base = lida.cerne ? preencherMadelung(CERNES[lida.cerne]) : [];
  return juntar([...base, ...lida.subniveis]);
}

/** Aplica a carga de um íon: cátion tira da camada de maior n (e maior l nela); ânion acrescenta na ordem de preenchimento. */
export function aplicarCarga(subniveis, carga) {
  let lista = juntar(subniveis.map((s) => ({ ...s })));
  if (carga > 0) {
    let tirar = carga;
    while (tirar > 0 && lista.length) {
      const alvo = [...lista].sort((a, b) => b.n - a.n || b.l - a.l)[0];
      const k = Math.min(tirar, alvo.e);
      alvo.e -= k;
      tirar -= k;
      lista = lista.filter((s) => s.e > 0);
    }
    if (tirar > 0) return null; // mais carga que elétrons
  } else if (carga < 0) {
    let por = -carga;
    for (const { n, l } of ORDEM_PAULING) {
      if (por <= 0) break;
      const atual = lista.find((s) => s.n === n && s.l === l);
      const livre = capacidadeSubnivel(l) - (atual?.e ?? 0);
      if (livre <= 0) continue;
      const k = Math.min(livre, por);
      if (atual) atual.e += k; else lista.push({ n, l, e: k });
      por -= k;
    }
  }
  return juntar(lista);
}

/** Texto de uma lista de subníveis ("1s2 2s2 2p6"; com `sobrescrito`, "1s² 2s² 2p⁶"). */
export function textoSubniveis(lista, { sobrescrito = false } = {}) {
  const sup = (x) => String(x).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  return lista.map((s) => `${rotuloSubnivel(s)}${sobrescrito ? sup(s.e) : s.e}`).join(' ');
}

/**
 * Distribuição eletrônica de um elemento (ou íon).
 * @param {{configuracao: string, z: number, carga?: number, bloco?: string|null}} e  `configuracao` = notação do pacote; `z` = número atômico
 * @returns {{ok: true, completa, ordemPauling, ordemCamadas, camadas: {camada, n, eletrons}[], camadaValencia: {camada, n, eletrons},
 *   eletronsValencia: number, valenciaTipo: 'camada'|'ns+(n-1)d'|'ns+(n-1)d+(n-2)f', subnivelMaisEnergetico, bloco, totalEletrons, carga, ignorados}
 *   | {ok: false, erro: 'semConfiguracao'|'totalDiferente'|'cargaInvalida', total?, esperado?}}
 */
export function distribuicaoEletronica({ configuracao, z, carga = 0, bloco = null }) {
  const lida = lerConfiguracao(configuracao);
  if (!lida) return { ok: false, erro: 'semConfiguracao' };
  const neutro = expandirCerne(lida);
  const totalNeutro = neutro.reduce((a, s) => a + s.e, 0);
  // o dado do pacote tem de fechar com Z: se não fechar, não "corrijo" à mão (§2.2)
  if (Number.isFinite(z) && totalNeutro !== z) return { ok: false, erro: 'totalDiferente', total: totalNeutro, esperado: z };
  const q = Number(carga) || 0;
  if (!Number.isInteger(q) || (Number.isFinite(z) && q >= z) || q < -8) return { ok: false, erro: 'cargaInvalida', carga: q };
  const lista = q ? aplicarCarga(neutro, q) : neutro;
  if (!lista) return { ok: false, erro: 'cargaInvalida', carga: q };
  const ordemPauling = emOrdemPauling(lista);
  const ordemCamadas = emOrdemCamadas(lista);
  const camadas = [];
  for (const s of ordemCamadas) {
    const c = camadas.find((x) => x.n === s.n);
    if (c) c.eletrons += s.e; else camadas.push({ camada: CAMADAS[s.n - 1], n: s.n, eletrons: s.e });
  }
  const totalEletrons = lista.reduce((a, s) => a + s.e, 0);
  const ultima = camadas[camadas.length - 1] ?? null;
  // bloco: o do pacote ou o do último subnível na ordem de preenchimento do átomo neutro
  const maisEnergeticoNeutro = emOrdemPauling(neutro).at(-1) ?? null;
  const blocoFinal = bloco ?? (maisEnergeticoNeutro ? LETRAS_SUBNIVEL[maisEnergeticoNeutro.l] : null);
  let eletronsValencia = ultima?.eletrons ?? 0;
  let valenciaTipo = 'camada';
  if (!q && ultima && (blocoFinal === 'd' || blocoFinal === 'f')) {
    // metais de transição: elétrons de valência convencionais ns + (n−1)d (e (n−2)f no bloco f)
    const nMax = ultima.n;
    const ePor = (n, l) => lista.find((s) => s.n === n && s.l === l)?.e ?? 0;
    eletronsValencia = ePor(nMax, 0) + ePor(nMax - 1, 2) + (blocoFinal === 'f' ? ePor(nMax - 2, 3) : 0);
    valenciaTipo = blocoFinal === 'f' ? 'ns+(n-1)d+(n-2)f' : 'ns+(n-1)d';
  }
  return {
    ok: true, carga: q, totalEletrons, bloco: blocoFinal, ignorados: lida.ignorados,
    configuracaoPacote: String(configuracao).trim(),
    completa: ordemPauling, ordemPauling, ordemCamadas, camadas,
    camadaValencia: ultima, eletronsValencia, valenciaTipo,
    subnivelMaisEnergetico: ordemPauling.at(-1) ?? null
  };
}
