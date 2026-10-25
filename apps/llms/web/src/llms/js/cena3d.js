// Cena 3D em Canvas 2D, sem dependências: pontos com rótulo, eixos pela origem, setas para diferenças de vetores. Órbita por arrastar/toque,
// zoom por roda e pinça, duplo toque reinicia, teclas ← → ↑ ↓ giram e + − dão zoom (acessibilidade). Projeção ortográfica depois de uma
// rotação por dois ângulos (yaw em torno de y, pitch em torno de x). Hi-DPI (devicePixelRatio), tema claro/escuro por variáveis CSS
// (--cor-ponto, --cor-eixo, --cor-seta, --cor-texto, --cor-fundo) e prefers-reduced-motion (sem animação).
// As funções puras (rotacao, aplicar, ajustarEscala, ordenarPorProfundidade, posicaoRotulo) são testadas em Node; a classe só no navegador.

export const MARGEM = 48;
export const PASSO_ROTULO = 14;
export const MAX_TENTATIVAS_ROTULO = 4;
export const RAIO_PONTO = 5;
export const RAIO_DESTAQUE = 7;
export const PASSO_TECLA = 0.1;

/** Matriz 3×3 (ordem de linhas) = Rx(pitch) · Ry(yaw). */
export function rotacao(yaw, pitch) {
  const cy = Math.cos(yaw); const sy = Math.sin(yaw);
  const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  // Ry: [cy 0 sy; 0 1 0; -sy 0 cy]   Rx: [1 0 0; 0 cp -sp; 0 sp cp]   Rx·Ry:
  // `+ 0` elimina o -0 das multiplicações (deepEqual estrito distingue 0 de -0)
  return [
    cy + 0, 0, sy + 0,
    sp * sy + 0, cp + 0, -sp * cy + 0,
    -cp * sy + 0, sp + 0, cp * cy + 0
  ];
}

export function aplicar(R, p) {
  return {
    x: R[0] * p.x + R[1] * p.y + R[2] * p.z,
    y: R[3] * p.x + R[4] * p.y + R[5] * p.z,
    z: R[6] * p.x + R[7] * p.y + R[8] * p.z
  };
}

/** Pixels por unidade para caber todos os pontos (maior raio) na área com margem; 1 quando não há como calcular. */
export function ajustarEscala(pontos, largura, altura, margem = MARGEM) {
  const lado = Math.min(largura, altura) - 2 * margem;
  if (!pontos.length || !(lado > 0)) return 1;
  let raio = 0;
  for (const p of pontos) {
    const r = Math.hypot(p.x, p.y, p.z);
    if (Number.isFinite(r) && r > raio) raio = r;
  }
  if (!(raio > 0)) return 1;
  return lado / 2 / raio;
}

/** Cópia ordenada do mais distante (menor z) ao mais próximo. */
export function ordenarPorProfundidade(itens) {
  return [...itens].sort((a, b) => a.z - b.z);
}

const colide = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Desloca o rótulo para baixo em passos até não colidir com os retângulos ocupados (no máximo MAX_TENTATIVAS_ROTULO deslocamentos). */
export function posicaoRotulo(r, ocupados) {
  let y = r.y;
  for (let t = 0; t <= MAX_TENTATIVAS_ROTULO; t++) {
    const cand = { x: r.x, y, w: r.w, h: r.h };
    if (!ocupados.some((o) => colide(cand, o))) return { x: r.x, y };
    if (t === MAX_TENTATIVAS_ROTULO) break;
    y += PASSO_ROTULO;
  }
  return { x: r.x, y };
}

const PADRAO_CAMERA = { yaw: 0.6, pitch: 0.35, zoom: 1 };

export class Cena3D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ tema?: () => 'claro'|'escuro', reduzirMovimento?: boolean, aoDestacar?: (indice: number|null) => void }} o
   */
  constructor(canvas, { tema = () => 'claro', reduzirMovimento = false, aoDestacar = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tema = tema;
    this.reduzirMovimento = reduzirMovimento;
    this.aoDestacar = aoDestacar;
    this.camera = { ...PADRAO_CAMERA };
    this.dados = { pontos: [], eixos: [], setas: [] };
    this.destaque = null;
    this._projetados = [];
    this._ponteiros = new Map();
    this._ligar();
  }

  definir({ pontos = [], eixos = [], setas = [] }) {
    this.dados = { pontos, eixos, setas };
    if (this.destaque != null && this.destaque >= pontos.length) this.destaque = null;
    this.render();
  }

  girar(dyaw, dpitch) {
    this.camera.yaw += dyaw;
    this.camera.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.camera.pitch + dpitch));
    this.render();
  }

  zoom(fator) {
    this.camera.zoom = Math.max(0.25, Math.min(8, this.camera.zoom * fator));
    this.render();
  }

  reiniciar() { this.camera = { ...PADRAO_CAMERA }; this.render(); }

  destacar(i) {
    const novo = i == null || i < 0 || i >= this.dados.pontos.length ? null : i;
    if (novo === this.destaque) return;
    this.destaque = novo;
    this.aoDestacar?.(novo);
    this.render();
  }

  redimensionar() {
    const dpr = globalThis.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this._dpr = dpr;
    this.render();
  }

  destruir() {
    for (const [tipo, fn] of this._eventos) this.canvas.removeEventListener(tipo, fn);
    this._observador?.disconnect?.();
  }

  // ---------------------------------------------------------------- desenho

  _cor(nome, reserva) {
    try { return getComputedStyle(this.canvas).getPropertyValue(nome).trim() || reserva; } catch { return reserva; }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = this._dpr || globalThis.devicePixelRatio || 1;
    const W = this.canvas.width / dpr; const H = this.canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const escuro = this.tema() === 'escuro';
    const cores = {
      ponto: this._cor('--cor-ponto', escuro ? '#7FB3FF' : '#2F80ED'),
      eixo: this._cor('--cor-eixo', escuro ? '#8A94A6' : '#6B7280'),
      seta: this._cor('--cor-seta', escuro ? '#FFB86B' : '#D97706'),
      texto: this._cor('--cor-texto', escuro ? '#E6EDF3' : '#111827'),
      destaque: this._cor('--cor-destaque', escuro ? '#FFD166' : '#B45309')
    };
    const R = rotacao(this.camera.yaw, this.camera.pitch);
    const { pontos, eixos, setas } = this.dados;
    const escala = ajustarEscala(pontos, W, H) * this.camera.zoom;
    const cx = W / 2; const cy = H / 2;
    const tela = (p) => { const q = aplicar(R, p); return { x: cx + q.x * escala, y: cy - q.y * escala, z: q.z }; };

    // eixos pela origem, com marcas em −1, 0, +1 (nas unidades da projeção) e rótulo na ponta
    const alcance = pontos.length ? Math.max(1, ...pontos.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)))) : 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = cores.eixo;
    ctx.fillStyle = cores.eixo;
    ctx.font = '12px system-ui, sans-serif';
    const direcoes = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
    direcoes.forEach((d, k) => {
      const a = tela({ x: -d.x * alcance, y: -d.y * alcance, z: -d.z * alcance });
      const b = tela({ x: d.x * alcance, y: d.y * alcance, z: d.z * alcance });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      for (const m of [-1, 0, 1]) {
        const t = tela({ x: d.x * m, y: d.y * m, z: d.z * m });
        ctx.beginPath(); ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      if (eixos[k]) ctx.fillText(eixos[k].rotulo, b.x + 4, b.y - 4);
    });

    // pontos e setas ordenados por profundidade
    this._projetados = pontos.map((p, i) => ({ ...tela(p), i, rotulo: p.rotulo }));
    const ocupados = [];
    ctx.strokeStyle = cores.seta;
    ctx.fillStyle = cores.seta;
    ctx.lineWidth = 1.5;
    for (const s of setas) {
      const a = this._projetados[s.de]; const b = this._projetados[s.para];
      if (!a || !b) continue;
      this._seta(ctx, a, b);
      if (s.rotulo) { ctx.fillText(s.rotulo, (a.x + b.x) / 2 + 4, (a.y + b.y) / 2 - 4); }
    }
    ctx.font = '13px system-ui, sans-serif';
    for (const p of ordenarPorProfundidade(this._projetados)) {
      const destacado = p.i === this.destaque;
      ctx.fillStyle = destacado ? cores.destaque : cores.ponto;
      ctx.beginPath(); ctx.arc(p.x, p.y, destacado ? RAIO_DESTAQUE : RAIO_PONTO, 0, Math.PI * 2); ctx.fill();
      if (p.rotulo) {
        const w = ctx.measureText(p.rotulo).width + 4;
        const r = { x: p.x + 8, y: p.y - 6, w, h: 14 };
        const pos = posicaoRotulo(r, ocupados);
        ocupados.push({ ...r, y: pos.y });
        ctx.fillStyle = cores.texto;
        ctx.fillText(p.rotulo, pos.x, pos.y + 11);
      }
    }
  }

  _seta(ctx, a, b) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const comp = Math.hypot(b.x - a.x, b.y - a.y);
    if (comp < 2) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const cab = Math.min(9, comp / 3);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - cab * Math.cos(ang - 0.4), b.y - cab * Math.sin(ang - 0.4));
    ctx.lineTo(b.x - cab * Math.cos(ang + 0.4), b.y - cab * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }

  // ---------------------------------------------------------------- interação

  _pontoProximo(x, y) {
    let melhor = null; let dist = 12;
    for (const p of this._projetados) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= dist) { dist = d; melhor = p.i; }
    }
    return melhor;
  }

  _posicaoLocal(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _ligar() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    if (!c.hasAttribute('tabindex')) c.setAttribute('tabindex', '0');
    let ultimoToque = 0;
    const eventos = {
      pointerdown: (e) => {
        c.setPointerCapture?.(e.pointerId);
        this._ponteiros.set(e.pointerId, this._posicaoLocal(e));
        if (this._ponteiros.size === 2) { const [a, b] = [...this._ponteiros.values()]; this._pinca = Math.hypot(a.x - b.x, a.y - b.y); }
        const agora = Date.now();
        if (e.pointerType === 'touch' && agora - ultimoToque < 300) this.reiniciar();
        ultimoToque = agora;
      },
      pointermove: (e) => {
        const pos = this._posicaoLocal(e);
        if (!this._ponteiros.has(e.pointerId)) { this.destacar(this._pontoProximo(pos.x, pos.y)); return; }
        const antes = this._ponteiros.get(e.pointerId);
        this._ponteiros.set(e.pointerId, pos);
        if (this._ponteiros.size >= 2) {
          const [a, b] = [...this._ponteiros.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (this._pinca > 0) this.zoom(d / this._pinca);
          this._pinca = d;
          return;
        }
        this.girar((pos.x - antes.x) * 0.01, (pos.y - antes.y) * 0.01);
      },
      pointerup: (e) => { this._ponteiros.delete(e.pointerId); this._pinca = 0; },
      pointercancel: (e) => { this._ponteiros.delete(e.pointerId); this._pinca = 0; },
      pointerleave: () => { if (!this._ponteiros.size) this.destacar(null); },
      wheel: (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); },
      dblclick: () => this.reiniciar(),
      keydown: (e) => {
        const mapa = { ArrowLeft: [-PASSO_TECLA, 0], ArrowRight: [PASSO_TECLA, 0], ArrowUp: [0, PASSO_TECLA], ArrowDown: [0, -PASSO_TECLA] };
        if (mapa[e.key]) { e.preventDefault(); this.girar(...mapa[e.key]); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoom(1.1); }
        else if (e.key === '-') { e.preventDefault(); this.zoom(1 / 1.1); }
        else if (e.key === 'Home') { e.preventDefault(); this.reiniciar(); }
      }
    };
    this._eventos = Object.entries(eventos);
    for (const [tipo, fn] of this._eventos) c.addEventListener(tipo, fn, tipo === 'wheel' ? { passive: false } : undefined);
    if (globalThis.ResizeObserver) {
      this._observador = new ResizeObserver(() => this.redimensionar());
      this._observador.observe(c);
    }
    this.redimensionar();
  }
}
