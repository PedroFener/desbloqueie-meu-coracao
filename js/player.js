/* =========================================================
   player.js — personagem controlável (movimento, colisão,
   animação de caminhada, sombra e "respiração" parado)
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;

  const SPEED = 64;          // pixels virtuais por segundo
  const HB_W = 8, HB_H = 5;  // caixa de colisão nos pés

  class Player {
    constructor(x, y) {
      this.x = x;            // centro dos pés
      this.y = y;
      this.dir = 'down';
      this.moving = false;
      this.animT = 0;
      this.stepT = 0;
      this.frozen = false;
      this.bounce = 0;       // pulinho de alegria
    }

    /** Caixa de colisão para uma posição. */
    box(x = this.x, y = this.y) {
      return { x: x - HB_W / 2, y: y - HB_H, w: HB_W, h: HB_H };
    }

    /** Ponto à frente do personagem (para interações). */
    facingPoint(dist = 10) {
      const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.dir];
      return { x: this.x + d[0] * dist, y: this.y - 3 + d[1] * dist };
    }

    /**
     * Atualiza movimento.
     * @param {number} dt
     * @param {{x:number,y:number}} axis direção (-1..1)
     * @param {(box)=>boolean} isBlocked função de colisão do nível
     * @param {DMC.Particles} particles
     */
    update(dt, axis, isBlocked, particles) {
      this.animT += dt;
      if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt);
      if (this.frozen) { this.moving = false; return; }

      const mag = Math.hypot(axis.x, axis.y);
      this.moving = mag > 0.01;
      if (!this.moving) return;

      // direção dominante define o sprite
      if (Math.abs(axis.x) > Math.abs(axis.y) * 1.1) this.dir = axis.x > 0 ? 'right' : 'left';
      else this.dir = axis.y > 0 ? 'down' : 'up';

      const speed = SPEED * Math.min(1, mag);
      const dx = axis.x / Math.max(mag, 1) * speed * dt;
      const dy = axis.y / Math.max(mag, 1) * speed * dt;

      // eixos separados: desliza ao encostar em paredes
      if (!isBlocked(this.box(this.x + dx, this.y))) this.x += dx;
      else this.nudge(dx, 0, isBlocked);
      if (!isBlocked(this.box(this.x, this.y + dy))) this.y += dy;
      else this.nudge(0, dy, isBlocked);

      // passos: som e poeirinha
      this.stepT += dt * speed / SPEED;
      if (this.stepT > 0.28) {
        this.stepT = 0;
        DMC.Audio.sfx('step');
        if (particles) particles.dust(this.x, this.y);
      }
    }

    /** Ajuda a contornar quinas: tenta deslizar 1px para o lado. */
    nudge(dx, dy, isBlocked) {
      const tries = dx !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (const [ox, oy] of tries) {
        if (!isBlocked(this.box(this.x + ox, this.y + oy)) && !isBlocked(this.box(this.x + ox + dx, this.y + oy + dy))) {
          this.x += ox + dx * 0.5;
          this.y += oy + dy * 0.5;
          return;
        }
      }
    }

    celebrate() { this.bounce = 0.5; this.dir = 'down'; }

    render(ctx, camX, camY) {
      const S = DMC.Sprites;
      let frame = 0;
      if (this.moving) frame = Math.floor(this.animT * 8) % 4 === 1 ? 1 : Math.floor(this.animT * 8) % 4 === 3 ? 2 : 0;
      const img = S.player[this.dir][frame];
      const bob = this.moving && frame !== 0 ? -1 : 0;
      const jump = this.bounce > 0 ? -Math.round(Math.sin((this.bounce / 0.5) * Math.PI) * 6) : 0;
      const px = Math.round(this.x - camX - 6);
      const py = Math.round(this.y - camY - 16 + bob + jump);
      // sombra
      ctx.fillStyle = 'rgba(43,27,61,0.3)';
      ctx.fillRect(Math.round(this.x - camX - 4), Math.round(this.y - camY - 1), 8, 2);
      ctx.fillRect(Math.round(this.x - camX - 3), Math.round(this.y - camY - 2), 6, 1);
      ctx.drawImage(img, px, py);
      // respiração: pisca os olhos às vezes
      if (!this.moving && this.dir === 'down' && (this.animT % 3.2) < 0.12) {
        ctx.fillStyle = '#ffd9bf';
        ctx.fillRect(px + 3, py + 6, 1, 1);
        ctx.fillRect(px + 8, py + 6, 1, 1);
      }
    }
  }

  DMC.Player = Player;
})();
