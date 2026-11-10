/* =========================================================
   dialogue.js — caixa de diálogo com efeito máquina de escrever
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const CPS = 42; // caracteres por segundo

  const Dialogue = {
    active: false,
    queue: [],
    full: '',
    shown: 0,
    t: 0,
    resolve: null,
    el: null,

    init() {
      this.el = document.getElementById('dialogue');
      this.nameEl = document.getElementById('dlg-name');
      this.textEl = document.getElementById('dlg-text');
      this.nextEl = document.getElementById('dlg-next');
      this.el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.advance(); });
    },

    /**
     * Mostra uma sequência de falas.
     * @param {Array<string|{name:string,text:string}>} lines
     * @returns {Promise<void>} resolvida quando a última fala é fechada
     */
    show(lines) {
      return new Promise((resolve) => {
        this.queue = lines.map((l) => (typeof l === 'string' ? { name: '', text: l } : l));
        this.resolve = resolve;
        this.active = true;
        this.el.classList.remove('hidden');
        this._next();
      });
    },

    _next() {
      const line = this.queue.shift();
      if (!line) { this.close(); return; }
      this.nameEl.textContent = line.name || '';
      this.full = line.text;
      this.shown = 0;
      this.t = 0;
      this.textEl.textContent = '';
      this.nextEl.style.visibility = 'hidden';
    },

    /** Avança: completa o texto atual ou passa para a próxima fala. */
    advance() {
      if (!this.active) return;
      if (this.shown < this.full.length) {
        this.shown = this.full.length;
        this.textEl.textContent = this.full;
        this.nextEl.style.visibility = 'visible';
      } else {
        DMC.Audio.sfx('click');
        this._next();
      }
    },

    update(dt) {
      if (!this.active || this.shown >= this.full.length) return;
      this.t += dt * CPS;
      const target = Math.min(this.full.length, Math.floor(this.t));
      if (target > this.shown) {
        if (Math.floor(target / 2) !== Math.floor(this.shown / 2) && this.full[target - 1] !== ' ') DMC.Audio.sfx('blip');
        this.shown = target;
        this.textEl.textContent = this.full.slice(0, this.shown);
        if (this.shown >= this.full.length) this.nextEl.style.visibility = 'visible';
      }
    },

    close() {
      this.active = false;
      this.el.classList.add('hidden');
      const r = this.resolve;
      this.resolve = null;
      if (r) r();
    },

    /** Fecha sem resolver callbacks (ao sair da fase). */
    abort() {
      this.active = false;
      this.queue = [];
      this.resolve = null;
      if (this.el) this.el.classList.add('hidden');
    },
  };

  DMC.Dialogue = Dialogue;
})();
