/* =========================================================
   particles.js — sistema de partículas com pool de objetos
   (sem alocações a cada quadro = sem engasgos em celulares)
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const { rand } = DMC.util;
  const MAX = 320;

  class Particles {
    constructor() {
      this.pool = [];
      for (let i = 0; i < MAX; i++) this.pool.push({ alive: false });
    }

    /** Pega uma partícula livre do pool. */
    spawn(props) {
      for (let i = 0; i < MAX; i++) {
        const p = this.pool[i];
        if (!p.alive) {
          p.alive = true;
          p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.ax = 0; p.ay = 0;
          p.life = 1; p.maxLife = 1; p.size = 1; p.color = '#fff';
          p.kind = 'dot'; p.spin = 0; p.phase = Math.random() * 6.28; p.glow = false; p.fade = true;
          Object.assign(p, props);
          p.maxLife = p.life;
          return p;
        }
      }
      return null;
    }

    /* ---------- Emissores prontos ---------- */
    hearts(x, y, n = 8, spread = 10) {
      for (let i = 0; i < n; i++) {
        this.spawn({
          kind: 'heart', x: x + rand(-spread, spread), y: y + rand(-4, 4),
          vx: rand(-12, 12), vy: rand(-40, -18), ay: 4, life: rand(1.2, 2.2),
          color: Math.random() < 0.7 ? '#ff7eb6' : '#ffc2dc', size: Math.random() < 0.3 ? 2 : 1,
        });
      }
    }

    sparkles(x, y, n = 10, color = '#fff1b8', speed = 40) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = rand(speed * 0.3, speed);
        this.spawn({
          kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ax: 0, ay: 10,
          life: rand(0.4, 0.9), color, glow: true,
        });
      }
    }

    leaves(x, y, n = 6) {
      for (let i = 0; i < n; i++) {
        this.spawn({
          kind: 'dot', x: x + rand(-6, 6), y: y + rand(-6, 2), vx: rand(-30, 30), vy: rand(-50, -20), ay: 90,
          life: rand(0.5, 0.9), color: Math.random() < 0.5 ? '#5fb58c' : '#8fdcae', size: 1,
        });
      }
    }

    dust(x, y) {
      this.spawn({ kind: 'dot', x: x + rand(-2, 2), y, vx: rand(-6, 6), vy: rand(-8, -3), life: 0.35, color: 'rgba(255,240,212,0.8)', size: 1 });
    }

    petal(x, y) {
      this.spawn({
        kind: 'petal', x, y, vx: rand(6, 16), vy: rand(8, 16), life: rand(3, 6),
        color: Math.random() < 0.5 ? '#ffc7e2' : '#ff9ccb', fade: true,
      });
    }

    firefly(x, y) {
      this.spawn({
        kind: 'firefly', x, y, vx: rand(-6, 6), vy: rand(-6, 6), life: rand(4, 8),
        color: Math.random() < 0.6 ? '#fff1b8' : '#c6e0ff', glow: true,
      });
    }

    beam(x, y) {
      this.spawn({ kind: 'spark', x: x + rand(-5, 5), y: y + rand(-2, 2), vx: rand(-3, 3), vy: rand(-55, -30), life: rand(0.8, 1.4), color: Math.random() < 0.5 ? '#fff1b8' : '#ffc2dc', glow: true });
    }

    /** Fogos de artifício em formato de coração. */
    firework(x, y, color, size = 1) {
      const n = 28;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        this.spawn({ kind: 'spark', x, y, vx: hx * 2.6 * size, vy: hy * 2.6 * size, ay: 14, life: rand(1.1, 1.6), color, glow: true });
      }
      for (let i = 0; i < 8; i++) this.spawn({ kind: 'spark', x, y, vx: rand(-15, 15), vy: rand(-15, 15), ay: 10, life: rand(0.6, 1), color: '#ffffff', glow: true });
    }

    /** Estrela cadente. */
    shootingStar(x, y) {
      for (let i = 0; i < 10; i++) {
        this.spawn({ kind: 'dot', x: x - i * 2, y: y - i, vx: 160, vy: 80, life: 0.5 + i * 0.03, color: i < 2 ? '#ffffff' : '#c6e0ff', size: 1 });
      }
    }

    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const p = this.pool[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) { p.alive = false; continue; }
        p.phase += dt * 4;
        if (p.kind === 'firefly') {
          p.vx += Math.sin(p.phase * 0.7) * 6 * dt;
          p.vy += Math.cos(p.phase * 0.5) * 6 * dt;
        } else if (p.kind === 'petal') {
          p.vx = 10 + Math.sin(p.phase * 0.8) * 10;
        } else if (p.kind === 'heart') {
          p.vx *= 0.98;
          p.x += Math.sin(p.phase) * 0.2;
        }
        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    /** Desenha as partículas (coordenadas de mundo, câmera já aplicada pelo ctx). */
    render(ctx, camX, camY) {
      const S = DMC.Sprites;
      for (let i = 0; i < MAX; i++) {
        const p = this.pool[i];
        if (!p.alive) continue;
        const t = p.life / p.maxLife;
        const a = p.fade ? Math.min(1, t * 2) : 1;
        const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
        ctx.globalAlpha = a;
        switch (p.kind) {
          case 'heart':
            if (p.size > 1) ctx.drawImage(S.heart, x - 3, y - 3);
            else {
              ctx.fillStyle = p.color;
              ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1);
              ctx.fillRect(x - 1, y + 1, 3, 1); ctx.fillRect(x, y + 2, 1, 1);
            }
            break;
          case 'spark': {
            ctx.fillStyle = p.color;
            const big = Math.sin(p.phase * 3) > 0;
            ctx.fillRect(x, y, 1, 1);
            if (big) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
            break;
          }
          case 'firefly': {
            const tw = 0.5 + 0.5 * Math.sin(p.phase * 2);
            ctx.globalAlpha = a * (0.25 + tw * 0.35);
            ctx.drawImage(S.glow, x - 6, y - 6, 12, 12);
            ctx.globalAlpha = a * (0.5 + tw * 0.5);
            ctx.fillStyle = p.color;
            ctx.fillRect(x, y, 1, 1);
            break;
          }
          case 'petal':
            ctx.fillStyle = p.color;
            ctx.fillRect(x, y, 2, 1);
            if (Math.sin(p.phase) > 0) ctx.fillRect(x + 1, y + 1, 1, 1);
            break;
          default:
            ctx.fillStyle = p.color;
            ctx.fillRect(x, y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
    }

    clear() { for (let i = 0; i < MAX; i++) this.pool[i].alive = false; }

    count() { let n = 0; for (let i = 0; i < MAX; i++) if (this.pool[i].alive) n++; return n; }
  }

  DMC.Particles = Particles;
})();
