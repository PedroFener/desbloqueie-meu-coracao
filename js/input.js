/* =========================================================
   input.js — teclado, joystick virtual e botão de ação
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;

  const keys = {};
  let actionQueued = false;
  let pauseQueued = false;
  const joy = { x: 0, y: 0, active: false, pointerId: null, cx: 0, cy: 0 };
  const JOY_RADIUS = 46;

  const Input = {
    enabled: true,

    init() {
      // ---------- Teclado ----------
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        const k = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
        if (!keys[k]) {
          if (k === ' ' || k === 'e' || k === 'enter' || k === 'z') actionQueued = true;
          if (k === 'escape' || k === 'p') pauseQueued = true;
        }
        keys[k] = true;
      });
      window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
      window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

      // ---------- Joystick virtual (flutuante) ----------
      const zone = document.getElementById('joystick-zone');
      const base = document.getElementById('joystick-base');
      const knob = document.getElementById('joystick-knob');
      const baseHome = () => { base.style.left = ''; base.style.top = ''; base.style.bottom = ''; };

      const moveKnob = (px, py) => {
        let dx = px - joy.cx, dy = py - joy.cy;
        const d = Math.hypot(dx, dy);
        if (d > JOY_RADIUS) { dx = (dx / d) * JOY_RADIUS; dy = (dy / d) * JOY_RADIUS; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        // zona morta de 18%
        const nx = dx / JOY_RADIUS, ny = dy / JOY_RADIUS;
        const mag = Math.hypot(nx, ny);
        if (mag < 0.18) { joy.x = 0; joy.y = 0; } else { joy.x = nx; joy.y = ny; }
      };

      zone.addEventListener('pointerdown', (e) => {
        if (joy.active) return;
        e.preventDefault();
        joy.active = true;
        joy.pointerId = e.pointerId;
        zone.setPointerCapture && zone.setPointerCapture(e.pointerId);
        // Base aparece onde o dedo tocou
        const rect = zone.getBoundingClientRect();
        const size = base.offsetWidth;
        base.style.left = (e.clientX - rect.left - size / 2) + 'px';
        base.style.top = (e.clientY - rect.top - size / 2) + 'px';
        base.style.bottom = 'auto';
        joy.cx = e.clientX;
        joy.cy = e.clientY;
        base.classList.add('active');
        moveKnob(e.clientX, e.clientY);
      });
      zone.addEventListener('pointermove', (e) => {
        if (!joy.active || e.pointerId !== joy.pointerId) return;
        e.preventDefault();
        moveKnob(e.clientX, e.clientY);
      });
      const end = (e) => {
        if (!joy.active || e.pointerId !== joy.pointerId) return;
        joy.active = false;
        joy.x = joy.y = 0;
        knob.style.transform = '';
        base.classList.remove('active');
        baseHome();
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('lostpointercapture', end);

      // ---------- Botão de ação ----------
      const btn = document.getElementById('btn-action');
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        actionQueued = true;
        btn.classList.add('pressed');
        DMC.Audio.unlock();
      });
      const up = () => btn.classList.remove('pressed');
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);

      // Primeiro toque em qualquer lugar ativa o modo touch
      window.addEventListener('touchstart', () => DMC.events.emit('touch-detected'), { once: true, passive: true });
    },

    /** Direção do movimento normalizada (-1..1). */
    axis() {
      if (!this.enabled) return { x: 0, y: 0 };
      let x = 0, y = 0;
      if (keys['arrowleft'] || keys['a'] || keys['q']) x -= 1;
      if (keys['arrowright'] || keys['d']) x += 1;
      if (keys['arrowup'] || keys['w']) y -= 1;
      if (keys['arrowdown'] || keys['s']) y += 1;
      if (x || y) {
        const m = Math.hypot(x, y);
        return { x: x / m, y: y / m };
      }
      return { x: joy.x, y: joy.y };
    },

    /** Retorna true uma única vez por toque/tecla de ação. */
    consumeAction() {
      const a = actionQueued;
      actionQueued = false;
      return this.enabled && a;
    },
    consumePause() {
      const p = pauseQueued;
      pauseQueued = false;
      return p;
    },
    clear() {
      actionQueued = false;
      pauseQueued = false;
    },
  };

  DMC.Input = Input;
})();
