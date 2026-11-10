/* =========================================================
   FASE 2 — PEÇAS QUE SE ENCAIXAM
   Quebra-cabeça de verdade (peças com encaixes) formando uma
   imagem pixel art do casal. Arraste com o dedo ou o mouse;
   a peça encaixa sozinha quando chega perto do lugar certo.
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const { makeCanvas, seeded, dist, clamp, lerp } = DMC.util;
  const LEVEL_ID = 2;
  const GRID = 3;      // 3x3 peças
  const BASE = 96;     // tamanho da imagem (px virtuais)
  const CELL = BASE / GRID;
  const MARGIN = 8;    // espaço para os "dentes" das peças
  const KNOB = 5;      // raio do dente

  /** Pinta a ilustração do casal (fictícios) em 96x96. */
  function buildCoupleImage() {
    const S = DMC.Sprites;
    const { canvas, ctx } = makeCanvas(BASE, BASE);
    const bands = ['#2a1b4a', '#35205a', '#45276a', '#5a2f78', '#783a86', '#9a4a90', '#bf6a9e', '#e08fb0', '#ffb3cf'];
    for (let y = 0; y < BASE; y++) {
      ctx.fillStyle = bands[Math.min(bands.length - 1, Math.floor((y / 74) * bands.length))];
      ctx.fillRect(0, y, BASE, 1);
    }
    const r = seeded(321);
    for (let i = 0; i < 34; i++) {
      ctx.fillStyle = r() < 0.7 ? '#ffffff' : '#c6e0ff';
      const x = Math.floor(r() * BASE), y = Math.floor(r() * 50);
      ctx.fillRect(x, y, 1, 1);
      if (r() < 0.15) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    // lua
    ctx.fillStyle = '#fff4e8';
    for (let y = -6; y <= 6; y++) { const w = Math.round(Math.sqrt(36 - y * y)); ctx.fillRect(82 - w, 14 + y, w * 2, 1); }
    ctx.fillStyle = '#ead6c4'; ctx.fillRect(80, 12, 2, 2); ctx.fillRect(84, 16, 2, 1);
    // coração grande no céu
    ctx.globalAlpha = 0.8;
    ctx.drawImage(S.glowPink, 18, -6, 60, 60);
    ctx.globalAlpha = 1;
    ctx.drawImage(S.heartBig, 35, 10, 26, 24);
    // colina
    for (let x = 0; x < BASE; x++) {
      const top = 70 + Math.round(Math.pow((x - 48) / 48, 2) * 10);
      ctx.fillStyle = '#5fb58c'; ctx.fillRect(x, top, 1, BASE - top);
      ctx.fillStyle = '#8fdcae'; ctx.fillRect(x, top, 1, 1);
      ctx.fillStyle = '#3f8a6c'; ctx.fillRect(x, top + 12, 1, BASE - top - 12);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * BASE), y = 76 + Math.floor(r() * 18);
      const cols = S.FLOWER_COLORS[Math.floor(r() * S.FLOWER_COLORS.length)];
      ctx.fillStyle = cols[0]; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillStyle = cols[1]; ctx.fillRect(x, y, 1, 1);
    }
    // o casal (ampliado 2x) de mãos dadas
    ctx.fillStyle = 'rgba(43,27,61,0.3)';
    ctx.fillRect(24, 71, 44, 3);
    ctx.drawImage(S.player.right[0], 23, 40, 24, 32);
    ctx.drawImage(S.partnerFrames.left[0], 47, 40, 24, 32);
    ctx.fillStyle = '#ffd9bf'; ctx.fillRect(45, 61, 4, 2); // mãos dadas
    // coraçõezinhos
    ctx.drawImage(S.heart, 12, 40);
    ctx.drawImage(S.heart, 78, 46);
    return canvas;
  }

  class Level2 extends DMC.SceneBase {
    constructor(game, saved) {
      super(game, LEVEL_ID, saved, { introDone: false, placed: [], moves: 0, elapsed: 0 });
      this.image = buildCoupleImage();
      // encaixes: +1 dente para fora, -1 para dentro (sorteio fixo)
      const r = seeded(77);
      this.hEdges = [0, 1].map(() => [0, 1, 2].map(() => (r() < 0.5 ? 1 : -1)));
      this.vEdges = [0, 1, 2].map(() => [0, 1].map(() => (r() < 0.5 ? 1 : -1)));
      this.pieces = [];
      for (let i = 0; i < GRID * GRID; i++) {
        this.pieces.push({ i, r: Math.floor(i / GRID), c: i % GRID, x: 0, y: 0, z: i, placed: this.state.placed.includes(i), snap: 0 });
      }
      this.zTop = 20;
      this.drag = null;
      this.preview = 0;
      this.shineT = -1;
      this.heartRise = null;
      this.flash = 0;
      this.bs = 0;
      this.layout(true);
    }

    /* ---------- Layout responsivo (retrato / paisagem) ---------- */
    layout(scatter) {
      const vw = this.game.viewW, vh = this.game.viewH;
      const hudPad = Math.ceil(80 / this.game.scale);
      const land = vw > vh * 1.15;
      let bs;
      if (land) {
        bs = Math.max(1, Math.floor(Math.min(vw * 0.5 - 20, vh - hudPad - 16) / (BASE + 24)));
        this.boardSize = BASE * bs;
        this.boardX = Math.max(14, Math.floor(vw * 0.27 - this.boardSize / 2));
        this.boardY = hudPad + Math.max(4, Math.floor((vh - hudPad - this.boardSize) / 2));
        this.tray = { x: Math.floor(vw * 0.52), y: hudPad, w: Math.floor(vw * 0.48) - 8, h: vh - hudPad - 8 };
      } else {
        bs = Math.max(1, Math.floor(Math.min(vw - 30, (vh - hudPad) * 0.48) / (BASE + 24)));
        this.boardSize = BASE * bs;
        this.boardX = Math.floor((vw - this.boardSize) / 2);
        this.boardY = hudPad + 10;
        const ty = this.boardY + this.boardSize + 18;
        this.tray = { x: 8, y: ty, w: vw - 16, h: vh - ty - 10 };
      }
      this.btn = { x: this.boardX + this.boardSize + 10, y: this.boardY, w: 18, h: 18 };
      if (this.btn.x + this.btn.w > vw - 4) this.btn = { x: this.boardX - 28, y: this.boardY, w: 18, h: 18 };
      if (bs !== this.bs) { this.bs = bs; this.buildPieceImages(); }
      const P = CELL * bs;
      this.pieces.forEach((p) => { p.homeX = this.boardX + p.c * P; p.homeY = this.boardY + p.r * P; if (p.placed) { p.x = p.homeX; p.y = p.homeY; } });
      if (scatter) this.scatter();
      else this.pieces.forEach((p) => { if (!p.placed) this.clampPiece(p); });
      this.wall = null;
    }

    scatter() {
      const P = CELL * this.bs;
      const t = this.tray;
      const cols = t.w > t.h ? 3 : 3, rows = 3;
      const slots = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) slots.push([x, y]);
      for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
      let k = 0;
      this.pieces.forEach((p) => {
        if (p.placed) return;
        const [sx, sy] = slots[k++ % slots.length];
        const cw = t.w / cols, ch = t.h / rows;
        p.x = Math.round(t.x + sx * cw + cw / 2 - P / 2 + (Math.random() - 0.5) * 6);
        p.y = Math.round(t.y + sy * ch + ch / 2 - P / 2 + (Math.random() - 0.5) * 6);
        this.clampPiece(p);
      });
    }

    clampPiece(p) {
      const P = CELL * this.bs, m = MARGIN * this.bs;
      p.x = clamp(p.x, m - 2, this.game.viewW - P - m + 2);
      p.y = clamp(p.y, m + 4, this.game.viewH - P - m + 2);
    }

    /* ---------- Gera as imagens das peças com encaixes e contorno pixel ---------- */
    buildPieceImages() {
      const bs = this.bs, P = CELL * bs, m = MARGIN * bs, rad = KNOB * bs, size = P + 2 * m;
      this.pieces.forEach((p) => {
        const { r, c } = p;
        const top = r > 0 ? -this.hEdges[r - 1][c] : 0;
        const bottom = r < GRID - 1 ? this.hEdges[r][c] : 0;
        const left = c > 0 ? -this.vEdges[r][c - 1] : 0;
        const right = c < GRID - 1 ? this.vEdges[r][c] : 0;
        const { canvas, ctx } = makeCanvas(size, size, true);
        ctx.save();
        ctx.translate(m, m);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const knob = (v, cx, cy, a0, a1) => { if (v) ctx.arc(cx, cy, rad, a0, a1, v < 0); };
        knob(top, P / 2, 0, Math.PI, 0); ctx.lineTo(P, 0);
        knob(right, P, P / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(P, P);
        knob(bottom, P / 2, P, 0, Math.PI); ctx.lineTo(0, P);
        knob(left, 0, P / 2, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
        ctx.clip();
        ctx.drawImage(this.image, -c * P, -r * P, BASE * bs, BASE * bs);
        ctx.restore();
        // borda nítida (alfa binário) + contorno de 1px + brilho superior
        const img = ctx.getImageData(0, 0, size, size), d = img.data;
        const a = new Uint8Array(size * size);
        for (let i = 0; i < size * size; i++) a[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const i = y * size + x;
            if (!a[i]) { d[i * 4 + 3] = 0; continue; }
            d[i * 4 + 3] = 255;
            const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1 || !a[i - 1] || !a[i + 1] || !a[i - size] || !a[i + size];
            if (edge) { d[i * 4] = 43; d[i * 4 + 1] = 27; d[i * 4 + 2] = 61; }
            else if (!a[i - size * 2] || !a[i - 2]) { d[i * 4] = Math.min(255, d[i * 4] + 40); d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] + 40); d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] + 40); }
          }
        }
        ctx.putImageData(img, 0, 0);
        p.img = canvas;
        p.shadow = DMC.Sprites.tint(canvas, '#1b1233');
      });
    }

    onResize() { this.layout(false); }

    /* ---------- Ciclo de vida ---------- */
    enter() {
      this.enterBase('garden', this.state.introDone ? 'Fase 2 — Peças que se Encaixam' : null);
      this.updateHUD();
      if (this.state.placed.length >= GRID * GRID) { this.finish(); return; }
      if (!this.state.introDone) this.intro();
    }

    updateHUD() {
      this.hud(`Peças encaixadas: ${this.state.placed.length}/${GRID * GRID}`);
    }

    async intro() {
      this.busy = true;
      await this.wait(0.6);
      if (this.dead) return;
      await DMC.Dialogue.show([
        'Uma moldura vazia... e várias peças espalhadas, cada uma com um pedacinho de uma lembrança.',
        'Arraste cada peça até o lugar certo. Quando ela chegar pertinho, vai encaixar sozinha!',
        'Se precisar, toque no quadradinho ao lado da moldura para espiar a imagem completa.',
      ]);
      if (this.dead) return;
      this.state.introDone = true;
      this.persist();
      this.busy = false;
      DMC.Input.clear();
    }

    /* ---------- Entrada por toque/mouse ---------- */
    onPointer(type, x, y) {
      if (this.busy || this.completed || DMC.Dialogue.active) { if (type !== 'move') this.drag = null; return; }
      const P = CELL * this.bs;
      if (type === 'down') {
        const b = this.btn;
        if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) {
          this.preview = 2.2;
          DMC.Audio.sfx('click');
          return;
        }
        const list = this.pieces.filter((p) => !p.placed).sort((a, c) => c.z - a.z);
        for (const p of list) {
          if (x >= p.x - 3 && x <= p.x + P + 3 && y >= p.y - 3 && y <= p.y + P + 3) {
            p.z = ++this.zTop;
            this.drag = { p, ox: x - p.x, oy: y - p.y };
            DMC.Audio.sfx('pickup');
            return;
          }
        }
      } else if (type === 'move' && this.drag) {
        const p = this.drag.p;
        p.x = x - this.drag.ox;
        p.y = y - this.drag.oy;
        this.clampPiece(p);
      } else if ((type === 'up' || type === 'cancel') && this.drag) {
        const p = this.drag.p;
        this.drag = null;
        this.state.moves++;
        this.dirty = true;
        if (dist(p.x, p.y, p.homeX, p.homeY) <= 10 * this.bs) this.place(p);
      }
    }

    place(p) {
      p.placed = true;
      p.snap = 0.15;
      p.fromX = p.x; p.fromY = p.y;
      if (!this.state.placed.includes(p.i)) this.state.placed.push(p.i);
      const P = CELL * this.bs;
      DMC.Audio.sfx('snap');
      this.particles.sparkles(p.homeX + P / 2, p.homeY + P / 2, 14, '#fff1b8', 45);
      this.updateHUD();
      this.persist();
      if (this.state.placed.length >= GRID * GRID) this.finish();
    }

    async finish() {
      this.busy = true;
      this.drag = null;
      await this.wait(0.4);
      if (this.dead) return;
      this.shineT = 0;
      DMC.Audio.sfx('heart');
      const P = CELL * this.bs;
      this.pieces.forEach((p) => this.particles.hearts(p.homeX + P / 2, p.homeY + P / 2, 2, 6));
      await this.wait(1.3);
      if (this.dead) return;
      this.heartRise = { t: 0 };
      await this.wait(1.8);
      if (this.dead) return;
      const cx = this.boardX + this.boardSize / 2, cy = this.boardY - 4;
      this.particles.hearts(cx, cy, 24, 18);
      this.particles.sparkles(cx, cy, 30, '#ffc2dc', 70);
      this.flash = 0.6;
      await this.wait(0.8);
      if (this.dead) return;
      await this.reward({ text: `Movimentos: ${this.state.moves} · Tempo: ${DMC.SceneBase.formatTime(this.state.elapsed)}` });
    }

    /* ---------- Atualização ---------- */
    update(dt) {
      this.updateBase(dt);
      this.handleDialogue();
      if (this.state.introDone && !this.busy && !this.completed) { this.state.elapsed += dt; }
      if (this.preview > 0) this.preview = Math.max(0, this.preview - dt);
      if (this.shineT >= 0) this.shineT += dt;
      if (this.heartRise) this.heartRise.t += dt;
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      this.pieces.forEach((p) => {
        if (p.snap > 0) {
          p.snap = Math.max(0, p.snap - dt);
          const t = 1 - p.snap / 0.15;
          p.x = lerp(p.fromX, p.homeX, t);
          p.y = lerp(p.fromY, p.homeY, t);
        }
      });
      // corações flutuando ao fundo
      if (Math.random() < dt * 1.5) {
        this.particles.spawn({ kind: 'heart', x: Math.random() * this.game.viewW, y: this.game.viewH + 4, vx: 0, vy: -10 - Math.random() * 10, life: 7, color: 'rgba(255,194,220,0.5)' });
      }
    }

    /* ---------- Renderização ---------- */
    buildWall() {
      const vw = this.game.viewW, vh = this.game.viewH;
      const { canvas, ctx } = makeCanvas(vw, vh);
      ctx.fillStyle = '#3b2766';
      ctx.fillRect(0, 0, vw, vh);
      // papel de parede com losangos
      for (let y = 0; y < vh; y += 12) {
        for (let x = (y / 12) % 2 ? 6 : 0; x < vw; x += 12) {
          ctx.fillStyle = '#45306f';
          ctx.fillRect(x + 5, y + 2, 2, 1); ctx.fillRect(x + 4, y + 3, 4, 1); ctx.fillRect(x + 5, y + 4, 2, 1);
        }
      }
      // mesa de madeira na área das peças
      const t = this.tray;
      ctx.fillStyle = 'rgba(27,18,51,0.35)';
      ctx.fillRect(t.x - 2, t.y - 2, t.w + 4, t.h + 4);
      this.wall = canvas;
      this.vignette = this.makeVignette(vw, vh, 0.5);
    }

    render(ctx) {
      const S = DMC.Sprites;
      if (!this.wall) this.buildWall();
      ctx.drawImage(this.wall, 0, 0);
      const bx = this.boardX, by = this.boardY, bsz = this.boardSize, P = CELL * this.bs, m = MARGIN * this.bs;

      // moldura de madeira
      ctx.fillStyle = S.C.outline; ctx.fillRect(bx - 8, by - 8, bsz + 16, bsz + 16);
      ctx.fillStyle = S.C.woodD; ctx.fillRect(bx - 7, by - 7, bsz + 14, bsz + 14);
      ctx.fillStyle = S.C.wood; ctx.fillRect(bx - 6, by - 6, bsz + 12, bsz + 10);
      ctx.fillStyle = S.C.woodL; ctx.fillRect(bx - 6, by - 6, bsz + 12, 1);
      ctx.fillStyle = S.C.outline; ctx.fillRect(bx - 1, by - 1, bsz + 2, bsz + 2);
      ctx.fillStyle = '#24173f'; ctx.fillRect(bx, by, bsz, bsz);
      // imagem-fantasma e grade
      ctx.globalAlpha = 0.14;
      ctx.drawImage(this.image, bx, by, bsz, bsz);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(169,139,219,0.25)';
      for (let i = 1; i < GRID; i++) {
        for (let k = 0; k < bsz; k += 3) { ctx.fillRect(bx + i * P, by + k, 1, 1); ctx.fillRect(bx + k, by + i * P, 1, 1); }
      }
      // coraçõezinhos nos cantos da moldura
      [[bx - 7, by - 7], [bx + bsz + 1, by - 7], [bx - 7, by + bsz + 1], [bx + bsz + 1, by + bsz + 1]].forEach(([x, y]) => {
        ctx.fillStyle = S.C.pink; ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 4, y + 1, 2, 2); ctx.fillRect(x + 2, y + 3, 3, 2);
      });

      // botão "espiar imagem"
      const b = this.btn;
      ctx.fillStyle = S.C.outline; ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = this.preview > 0 ? S.C.gold : S.C.pinkL; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.drawImage(this.image, b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      if (!this.completed && Math.sin(this.time * 3) > 0.7) { ctx.fillStyle = '#fff'; ctx.fillRect(b.x + b.w - 3, b.y + 1, 2, 2); }

      // peças encaixadas
      for (const p of this.pieces) if (p.placed && p.snap <= 0) ctx.drawImage(p.img, Math.round(p.x - m), Math.round(p.y - m));
      // peças soltas (e animando o encaixe), por ordem de profundidade
      const loose = this.pieces.filter((p) => !p.placed || p.snap > 0).sort((a, c) => a.z - c.z);
      for (const p of loose) {
        const lifted = this.drag && this.drag.p === p;
        const bob = !lifted && !p.placed ? Math.round(Math.sin(this.time * 2 + p.i) * 0.6) : 0;
        if (lifted) {
          ctx.globalAlpha = 0.35;
          ctx.drawImage(p.shadow, Math.round(p.x - m + 2), Math.round(p.y - m + 4));
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(p.img, Math.round(p.x - m), Math.round(p.y - m - (lifted ? 2 : 0) + bob));
      }

      // espiar a imagem completa
      if (this.preview > 0) {
        ctx.globalAlpha = Math.min(1, this.preview * 2);
        ctx.drawImage(this.image, bx, by, bsz, bsz);
        ctx.globalAlpha = 1;
      }

      // brilho diagonal na conclusão
      if (this.shineT >= 0 && this.shineT < 1.4) {
        ctx.save();
        ctx.beginPath(); ctx.rect(bx, by, bsz, bsz); ctx.clip();
        const sx = bx - bsz + (this.shineT / 1.4) * bsz * 3;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 14; k++) ctx.fillRect(Math.round(sx + k), by, 1, bsz);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (this.shineT >= 0) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.time * 4);
        ctx.drawImage(S.glowPink, bx - 30, by - 30, bsz + 60, bsz + 60);
        ctx.globalAlpha = 1;
      }

      if (this.heartRise) {
        const t = clamp(this.heartRise.t / 1.6, 0, 1);
        this.drawHeartPiece(ctx, bx + bsz / 2, by + bsz / 2 - DMC.util.easeInOut(t) * (bsz / 2 + 4), 1 + t);
      }

      this.particles.render(ctx, 0, 0);
      ctx.drawImage(this.vignette, 0, 0);
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,240,250,${this.flash})`; ctx.fillRect(0, 0, this.game.viewW, this.game.viewH); }
    }
  }

  DMC.Levels.register(LEVEL_ID, (game, saved) => new Level2(game, saved));
})();
