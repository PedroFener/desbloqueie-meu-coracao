/* =========================================================
   utils.js — namespace global e funções auxiliares
   ========================================================= */
(function () {
  'use strict';

  /** Namespace único do jogo (evita poluir o escopo global). */
  const DMC = (window.DMC = window.DMC || {});

  DMC.TILE = 16; // tamanho do tile em pixels virtuais

  DMC.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    easeOutBack(t) {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

    /** Gerador pseudoaleatório determinístico (mesmo mapa sempre igual). */
    seeded(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    /** Cria um canvas fora da tela. readable=true quando formos usar getImageData. */
    makeCanvas(w, h, readable) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', readable ? { willReadFrequently: true } : undefined);
      ctx.imageSmoothingEnabled = false;
      return { canvas: c, ctx };
    },

    /** Escapa texto do usuário antes de inserir em HTML. */
    escapeHTML(str) {
      return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    },

    /** Substitui {to} e {from} pelos nomes configurados. */
    fill(text, cfg) {
      return String(text)
        .replace(/\{to\}/g, cfg.to || 'meu amor')
        .replace(/\{from\}/g, cfg.from || 'alguém especial');
    },

    isTouchDevice() {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    },
  };

  /** Barramento de eventos simples para desacoplar módulos. */
  const listeners = {};
  DMC.events = {
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    off(name, fn) { if (listeners[name]) listeners[name] = listeners[name].filter((f) => f !== fn); },
    emit(name, data) { (listeners[name] || []).slice().forEach((fn) => fn(data)); },
  };
})();
