/* =========================================================
   FASE 3 — NOSSO DESTINO
   Puzzle de constelação: ligue as estrelas na ordem certa
   para formar um coração. Rodada 1 com números (aprendizado);
   rodada 2 maior, sem números e com estrelas "intrusas".
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const { makeCanvas, seeded, dist, clamp, lerp } = DMC.util;
  const LEVEL_ID = 3;

  const ROUNDS = [
    { n: 6, numbers: true, scale: 0.72, decoys: 0 },
    { n: 12, numbers: false, scale: 1, decoys: 5 },
  ];

  // fonte 3x5 para os números das estrelas
  const DIG = {
    0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
    9: ['111', '101', '111', '001', '111'],
  };
  function drawNum(ctx, n, x, y, color) {
    const s = String(n);
    for (let k = 0; k < s.length; k++) {
      const g = DIG[s[k]];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        if (g[r][c] === '1') {
          ctx.fillStyle = 'rgba(15,10,36,0.8)'; ctx.fillRect(x + k * 4 + c + 1, y + r + 1, 1, 1);
          ctx.fillStyle = color; ctx.fillRect(x + k * 4 + c, y + r, 1, 1);
        }
      }
    }
  }

  /** Curva do coração normalizada (y para baixo, ponta inferior em t = PI). */
  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3) / 17;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
    return [x, y];
  }

  class Level3 extends DMC.SceneBase {
    constructor(game, saved) {
      super(game, LEVEL_ID, saved, { introDone: false, round: 0, mistakes: 0, elapsed: 0 });
      const r = seeded(555);
      this.bgStars = [];
      for (let i = 0; i < 140; i++) this.bgStars.push({ x: r(), y: r() * 0.8, p: r() * 6, b: r() < 0.08, c: r() < 0.2 ? '#ffc2dc' : r() < 0.5 ? '#c6e0ff' : '#ffffff' });
      this.pointer = null;
      this.flash = 0;
      this.heartFly = null;
      this.setupRound();
      this.layout();
    }

    setupRound() {
      const R = ROUNDS[Math.min(this.state.round, ROUNDS.length - 1)];
      this.R = R;
      this.chain = [];
      this.dir = 0;
      this.roundMistakes = 0;
      this.fill = 0;
      this.roundDone = false;
      this.stars = [];
      for (let i = 0; i < R.n; i++) {
        const [nx, ny] = heartPoint(Math.PI + (i * 2 * Math.PI) / R.n);
        this.stars.push({ idx: i, nx, ny, shake: 0, lit: false, pop: 0 });
      }
      const r = seeded(900 + this.state.round);
      let guard = 0;
      while (this.stars.filter((s) => s.idx < 0).length < R.decoys && guard++ < 500) {
        const nx = (r() - 0.5) * 2.2, ny = (r() - 0.5) * 2 + 0.1;
        if (this.stars.some((s) => Math.hypot(s.nx - nx, s.ny - ny) < 0.32)) continue;
        this.stars.push({ idx: -1, nx, ny, shake: 0, lit: false, pop: 0 });
      }
      if (this.game.viewW) this.layout();
    }

    layout() {
      const vw = this.game.viewW, vh = this.game.viewH;
      const hudPad = Math.ceil(80 / this.game.scale);
      const ground = Math.round(vh * 0.86);
      const avail = ground - hudPad - 14;
      const rad = Math.min(vw * 0.4, avail * 0.52) * this.R.scale;
      this.cx = vw / 2;
      this.cy = hudPad + avail * 0.47;
      this.rad = rad;
      this.stars.forEach((s) => { s.x = Math.round(this.cx + s.nx * rad); s.y = Math.round(this.cy + (s.ny - 0.15) * rad); });
      this.ground = ground;
      this.bg = null;
    }
    onResize() { this.layout(); }

    buildBg() {
      const vw = this.game.viewW, vh = this.game.viewH;
      const { canvas, ctx } = makeCanvas(vw, vh);
      ctx.drawImage(this.makeSkyBands(vw, vh, ['#0f0a24', '#151034', '#1b1240', '#22164c', '#2a1b58', '#352066', '#45276f', '#5a2f78', '#7a3a86'], 0.95), 0, 0, vw, vh);
      // via láctea: faixa diagonal de brilho e poeira de estrelas
      const r = seeded(31);
      for (let i = 0; i < 70; i++) {
        const t = r();
        const x = t * vw, y = vh * 0.1 + t * vh * 0.45 + (r() - 0.5) * 40;
        ctx.globalAlpha = 0.05;
        ctx.drawImage(DMC.Sprites.glowPink, x - 25, y - 25, 50, 50);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 260; i++) {
        const t = r();
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(198,224,255,0.4)';
        ctx.fillRect(Math.round(t * vw), Math.round(vh * 0.1 + t * vh * 0.45 + (r() - 0.5) * 34), 1, 1);
      }
      // colina em silhueta
      const g = this.ground;
      for (let x = 0; x < vw; x++) {
        const top = g + Math.round(Math.pow((x - vw / 2) / (vw / 2), 2) * 10 - 2 + Math.sin(x * 0.08) * 1.5);
        ctx.fillStyle = '#1b1233'; ctx.fillRect(x, top, 1, vh - top);
        ctx.fillStyle = '#2d1d52'; ctx.fillRect(x, top, 1, 1);
      }
      // grama alta na silhueta
      ctx.fillStyle = '#1b1233';
      for (let x = 2; x < vw; x += 5) ctx.fillRect(x, g - 4 + Math.round(Math.pow((x - vw / 2) / (vw / 2), 2) * 10) + (x % 3), 1, 4);
      this.bg = canvas;
      this.vignette = this.makeVignette(vw, vh, 0.5);
    }

    /* ---------- Ciclo de vida ---------- */
    enter() {
      this.enterBase('stars', this.state.introDone ? 'Fase 3 — Nosso Destino' : null);
      this.updateHUD();
      if (!this.state.introDone) this.intro();
    }

    updateHUD() {
      const done = Math.max(0, this.chain.length - (this.roundDone ? 1 : 0));
      this.hud(`Constelação ${this.state.round + 1}/${ROUNDS.length} — estrelas: ${done}/${this.R.n}`);
    }

    async intro() {
      this.busy = true;
      await this.wait(0.8);
      if (this.dead) return;
      await DMC.Dialogue.show([
        'Que céu lindo... dizem que algumas estrelas guardam o desenho de um destino.',
        'Toque nas estrelas na ordem certa (ou arraste de uma para a outra) para desenhar um coração.',
        'Comece pela estrela número 1, na ponta de baixo, e volte até ela para fechar o desenho.',
      ]);
      if (this.dead) return;
      this.state.introDone = true;
      this.persist();
      this.busy = false;
      DMC.Input.clear();
    }

    /* ---------- Entrada ---------- */
    starAt(x, y) {
      let best = null, bd = 13;
      for (const s of this.stars) { const d = dist(x, y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
      return best;
    }

    onPointer(type, x, y) {
      if (this.busy || this.roundDone || this.completed || DMC.Dialogue.active) { this.pointer = null; return; }
      if (type === 'down') this.pointer = { x, y };
      else if (type === 'move' && this.pointer) { this.pointer.x = x; this.pointer.y = y; }
      else if (type === 'up' || type === 'cancel') {
        const s = type === 'up' ? this.starAt(x, y) : null;
        this.pointer = null;
        if (s) this.tryStar(s);
      }
      // ao arrastar sobre a próxima estrela correta, ela já é conectada
      if (type === 'move' && this.pointer && this.chain.length) {
        const s = this.starAt(x, y);
        if (s && s.idx >= 0 && s.idx === this.expected()) this.tryStar(s);
      }
    }

    expected() {
      const n = this.R.n;
      if (!this.chain.length) return 0;
      if (this.chain.length === 1) return null; // segunda estrela define o sentido
      if (this.chain.length === n) return 0;
      return (this.chain[this.chain.length - 1] + this.dir + n) % n;
    }

    tryStar(s) {
      const n = this.R.n;
      const last = this.chain[this.chain.length - 1];
      if (s.idx >= 0 && s.idx === last) return;
      let ok = false;
      if (!this.chain.length) ok = s.idx === 0;
      else if (this.chain.length === 1) {
        if (s.idx === 1) { this.dir = 1; ok = true; }
        else if (s.idx === n - 1) { this.dir = -1; ok = true; }
      } else ok = s.idx === this.expected();

      if (ok) {
        this.chain.push(s.idx);
        s.lit = true;
        s.pop = 0.4;
        DMC.Audio.sfx('note', this.chain.length - 1);
        this.particles.sparkles(s.x, s.y, 10, '#fff1b8', 35);
        if (this.chain.length === n + 1) this.roundComplete();
        this.updateHUD();
      } else {
        s.shake = 0.4;
        DMC.Audio.sfx('wrong');
        this.state.mistakes++;
        this.roundMistakes++;
        this.dirty = true;
        if (this.roundMistakes === 2) DMC.UI.toast('Dica: siga a estrela que brilha mais');
      }
    }

    async roundComplete() {
      this.roundDone = true;
      this.busy = true;
      DMC.Audio.sfx('complete');
      for (const s of this.stars) if (s.idx >= 0) this.particles.sparkles(s.x, s.y, 8, '#ffc2dc', 30);
      await this.wait(1.6);
      if (this.dead) return;
      if (this.state.round < ROUNDS.length - 1) {
        await DMC.Dialogue.show([
          'Lindo! Mas o céu ainda guarda uma constelação maior...',
          'Desta vez sem números, e com algumas estrelas intrusas. Comece pela ponta de baixo e siga o contorno do coração.',
        ]);
        if (this.dead) return;
        this.state.round++;
        this.persist();
        this.setupRound();
        this.updateHUD();
        this.busy = false;
        DMC.Input.clear();
        return;
      }
      // ---- final da fase: estrelas cadentes e a parte do coração descendo ----
      for (let i = 0; i < 4; i++) {
        this.particles.shootingStar(Math.random() * this.game.viewW * 0.6, 10 + Math.random() * 40);
        DMC.Audio.sfx('shoot');
        await this.wait(0.35);
        if (this.dead) return;
      }
      DMC.Audio.sfx('heart');
      this.heartFly = { t: 0 };
      await this.wait(2.2);
      if (this.dead) return;
      const hx = this.game.viewW / 2, hy = this.ground - 24;
      this.particles.hearts(hx, hy, 24, 14);
      this.particles.sparkles(hx, hy, 30, '#ffc2dc', 70);
      this.flash = 0.6;
      await this.wait(0.8);
      if (this.dead) return;
      await this.reward({ text: `Erros: ${this.state.mistakes} · Tempo: ${DMC.SceneBase.formatTime(this.state.elapsed)}` });
    }

    /* ---------- Atualização ---------- */
    update(dt) {
      this.updateBase(dt);
      this.handleDialogue();
      if (this.state.introDone && !this.busy) this.state.elapsed += dt;
      this.stars.forEach((s) => { if (s.shake > 0) s.shake = Math.max(0, s.shake - dt); if (s.pop > 0) s.pop = Math.max(0, s.pop - dt); });
      if (this.roundDone) this.fill = Math.min(1, this.fill + dt / 1.2);
      if (this.heartFly) this.heartFly.t += dt;
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      if (Math.random() < dt * 0.15) {
        this.particles.shootingStar(Math.random() * this.game.viewW * 0.7, Math.random() * this.game.viewH * 0.3);
      }
      if (Math.random() < dt * 0.6) this.particles.firefly(Math.random() * this.game.viewW, this.ground + Math.random() * 20);
    }

    /* ---------- Renderização ---------- */
    render(ctx) {
      const S = DMC.Sprites;
      const vw = this.game.viewW, vh = this.game.viewH;
      if (!this.bg) this.buildBg();
      ctx.drawImage(this.bg, 0, 0);
      // estrelas de fundo cintilando
      for (const s of this.bgStars) {
        const tw = Math.sin(this.time * 1.7 + s.p);
        if (tw < -0.5) continue;
        const x = Math.round(s.x * vw), y = Math.round(s.y * this.ground);
        ctx.fillStyle = s.c;
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, tw);
        ctx.fillRect(x, y, 1, 1);
        if (s.b && tw > 0.6) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
      ctx.globalAlpha = 1;

      // preenchimento do coração quando a rodada termina
      const heartStars = this.stars.filter((s) => s.idx >= 0);
      if (this.fill > 0) {
        ctx.globalAlpha = this.fill * (0.3 + 0.1 * Math.sin(this.time * 4));
        ctx.fillStyle = '#ff7eb6';
        ctx.beginPath();
        heartStars.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = this.fill * 0.6;
        ctx.drawImage(S.glowPink, this.cx - this.rad * 1.4, this.cy - this.rad * 1.4, this.rad * 2.8, this.rad * 2.8);
        ctx.globalAlpha = 1;
      }

      // linhas da constelação
      const byIdx = (i) => heartStars[i];
      const line = (a, b) => {
        ctx.strokeStyle = 'rgba(255,194,220,0.35)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x + 0.5, a.y + 0.5); ctx.lineTo(b.x + 0.5, b.y + 0.5); ctx.stroke();
        ctx.strokeStyle = '#fff1b8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x + 0.5, a.y + 0.5); ctx.lineTo(b.x + 0.5, b.y + 0.5); ctx.stroke();
      };
      for (let i = 1; i < this.chain.length; i++) line(byIdx(this.chain[i - 1]), byIdx(this.chain[i]));
      if (this.pointer && this.chain.length && !this.roundDone) {
        const a = byIdx(this.chain[this.chain.length - 1]);
        ctx.strokeStyle = 'rgba(198,224,255,0.55)'; ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(a.x + 0.5, a.y + 0.5); ctx.lineTo(this.pointer.x, this.pointer.y); ctx.stroke();
        ctx.setLineDash([]);
      }

      // estrelas
      const exp = this.expected();
      const hint = this.roundMistakes >= 2 || this.R.numbers;
      for (const s of this.stars) {
        const sx = s.x + (s.shake > 0 ? Math.round(Math.sin(s.shake * 50) * 2) : 0), sy = s.y;
        const isStart = s.idx === 0 && !this.chain.length;
        const isNext = !this.roundDone && s.idx >= 0 && (exp === null ? (s.idx === 1 || s.idx === this.R.n - 1) : s.idx === exp) && this.chain.length > 0;
        let glowR = 7 + Math.sin(this.time * 3 + s.nx * 5) * 1.5;
        if (isStart) glowR = 11 + Math.sin(this.time * 5) * 3;
        if (isNext && hint) glowR = 10 + Math.sin(this.time * 7) * 3;
        if (s.pop > 0) glowR += s.pop * 20;
        ctx.globalAlpha = s.lit ? 0.85 : 0.5;
        ctx.drawImage(s.lit ? S.glowPink : S.glow, sx - glowR, sy - glowR, glowR * 2, glowR * 2);
        ctx.globalAlpha = 1;
        const col = s.shake > 0 ? '#ff6b8b' : s.lit ? '#fff1b8' : '#e2f0ff';
        ctx.fillStyle = col;
        ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3);
        const twinkle = Math.sin(this.time * 4 + s.nx * 9) > 0.3 || isStart || s.lit;
        if (twinkle) { ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillRect(sx, sy - 2, 1, 5); }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1);
        if (this.R.numbers && s.idx >= 0 && !this.roundDone) drawNum(ctx, s.idx + 1, sx + 4, sy - 8, s.lit ? '#ffc2dc' : '#c6e0ff');
      }

      // o casal sentado na colina olhando o céu
      const cx = Math.round(vw / 2), gy = this.ground - 1;
      ctx.drawImage(S.player.up[0], cx - 13, gy - 16);
      ctx.drawImage(S.partnerFrames.up[0], cx + 1, gy - 16);
      if (this.heartFly) {
        const t = clamp(this.heartFly.t / 2, 0, 1);
        const e = DMC.util.easeInOut(t);
        this.drawHeartPiece(ctx, lerp(this.cx, cx, e), lerp(this.cy, gy - 26, e), 2 - e);
      }

      this.particles.render(ctx, 0, 0);
      ctx.drawImage(this.vignette, 0, 0);
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,240,250,${this.flash})`; ctx.fillRect(0, 0, vw, vh); }
    }
  }

  DMC.Levels.register(LEVEL_ID, (game, saved) => new Level3(game, saved));
})();
