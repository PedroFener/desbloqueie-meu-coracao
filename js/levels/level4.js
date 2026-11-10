/* =========================================================
   FASE 4 — O CAMINHO ATÉ VOCÊ
   Labirinto de sebes à noite. Nuvenzinhas de chuva patrulham
   os corredores (encostar faz voltar ao último ponto de
   descanso), há corações brilhantes nos becos e, no fim do
   caminho, a pessoa amada está esperando.
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const T = DMC.TILE;
  const { seeded, dist, clamp, lerp, rand, makeCanvas, fill } = DMC.util;
  const LEVEL_ID = 4;
  const CW = 12, CH = 9;                 // células do labirinto
  const W = CW * 2 + 1, H = CH * 2 + 1;  // em tiles

  /** Gera um labirinto perfeito (sempre igual, semente fixa) com alguns atalhos. */
  function generateMaze(seed) {
    const r = seeded(seed);
    const wall = [];
    for (let y = 0; y < H; y++) wall.push(new Array(W).fill(true));
    const seen = new Set();
    const stack = [[0, 0]];
    seen.add('0,0');
    wall[1][1] = false;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < CW && ny < CH && !seen.has(nx + ',' + ny));
      if (!opts.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = opts[Math.floor(r() * opts.length)];
      wall[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = false;
      wall[ny * 2 + 1][nx * 2 + 1] = false;
      seen.add(nx + ',' + ny);
      stack.push([nx, ny]);
    }
    // atalhos: deixam o labirinto com rotas alternativas para fugir das nuvens
    let extra = 0, guard = 0;
    while (extra < 9 && guard++ < 2000) {
      const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * (H - 2));
      if (!wall[y][x] || (x % 2) === (y % 2)) continue;
      const horiz = x % 2 === 0;
      const a = horiz ? wall[y][x - 1] : wall[y - 1][x];
      const b = horiz ? wall[y][x + 1] : wall[y + 1][x];
      if (!a && !b) { wall[y][x] = false; extra++; }
    }
    return wall;
  }

  class Level4 extends DMC.SceneBase {
    constructor(game, saved) {
      super(game, LEVEL_ID, saved, { introDone: false, px: null, py: null, dir: 'down', checkpoint: 0, sparks: [], hurts: 0, elapsed: 0 });
      this.usesJoystick = true;
      this.cam = { x: 0, y: 0 };
      this.flash = 0;
      this.flashColor = '255,240,250';
      this.inv = 0;
      this.wall = generateMaze(1407);
      this.start = { tx: 1, ty: 1 };
      this.goal = { tx: W - 2, ty: H - 2 };
      this.analyze();
      this.buildGround();
      const sp = this.checkpointPos(this.state.checkpoint);
      this.player = new DMC.Player(this.state.px != null ? this.state.px : sp.x, this.state.py != null ? this.state.py : sp.y);
      this.player.dir = this.state.dir || 'down';
      this.partner = { x: this.goal.tx * T + 8, y: this.goal.ty * T + 13, dir: 'left', jump: 0 };
      this.snapCamera();
      for (let i = 0; i < 14; i++) this.particles.firefly(rand(16, W * T - 16), rand(16, H * T - 16));
    }

    isWall(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H || this.wall[ty][tx]; }

    /** Encontra o caminho da solução, becos, corredores e posiciona os elementos. */
    analyze() {
      const key = (x, y) => y * W + x;
      // BFS a partir do início
      const prev = new Map(), distMap = new Map();
      const q = [[this.start.tx, this.start.ty]];
      distMap.set(key(this.start.tx, this.start.ty), 0);
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = key(nx, ny);
          if (this.isWall(nx, ny) || distMap.has(k)) continue;
          distMap.set(k, distMap.get(key(x, y)) + 1);
          prev.set(k, [x, y]);
          q.push([nx, ny]);
        }
      }
      const path = [];
      let cur = [this.goal.tx, this.goal.ty];
      while (cur) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
      this.path = path;
      const onPath = new Set(path.map(([x, y]) => key(x, y)));

      // pontos de descanso a 1/3 e 2/3 do caminho
      this.checkpoints = [path[Math.floor(path.length / 3)], path[Math.floor((path.length * 2) / 3)]]
        .map(([tx, ty], i) => ({ tx, ty, x: tx * T + 8, y: ty * T + 12, active: this.state.checkpoint > i }));

      // corredores retos para as nuvens patrulharem
      const segs = [];
      for (let y = 1; y < H - 1; y += 2) {
        let x0 = null;
        for (let x = 0; x <= W; x++) {
          const floor = x < W && !this.isWall(x, y);
          if (floor && x0 === null) x0 = x;
          if (!floor && x0 !== null) { if (x - x0 >= 5) segs.push({ h: true, a: x0, b: x - 1, c: y }); x0 = null; }
        }
      }
      for (let x = 1; x < W - 1; x += 2) {
        let y0 = null;
        for (let y = 0; y <= H; y++) {
          const floor = y < H && !this.isWall(x, y);
          if (floor && y0 === null) y0 = y;
          if (!floor && y0 !== null) { if (y - y0 >= 5) segs.push({ h: false, a: y0, b: y - 1, c: x }); y0 = null; }
        }
      }
      const r = seeded(4242);
      for (let i = segs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [segs[i], segs[j]] = [segs[j], segs[i]]; }
      const used = [];
      const tilesOf = (s) => { const out = []; for (let v = s.a; v <= s.b; v++) out.push(s.h ? [v, s.c] : [s.c, v]); return out; };
      const special = [[this.start.tx, this.start.ty], [this.goal.tx, this.goal.ty], ...this.checkpoints.map((c) => [c.tx, c.ty])];
      this.clouds = [];
      for (const s of segs) {
        if (this.clouds.length >= 7) break;
        const tiles = tilesOf(s);
        if (tiles.some(([x, y]) => special.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) < 5))) continue;
        if (tiles.some(([x, y]) => used.some(([ux, uy]) => Math.abs(ux - x) + Math.abs(uy - y) < 3))) continue;
        used.push(...tiles);
        const a = s.h ? { x: s.a * T + 8, y: s.c * T + 8 } : { x: s.c * T + 8, y: s.a * T + 8 };
        const b = s.h ? { x: s.b * T + 8, y: s.c * T + 8 } : { x: s.c * T + 8, y: s.b * T + 8 };
        this.clouds.push({ a, b, len: dist(a.x, a.y, b.x, b.y), speed: 26 + r() * 14, phase: r() * 2, x: a.x, y: a.y });
      }

      // corações brilhantes nos becos mais afastados da solução
      const deadEnds = [];
      for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
        if (this.isWall(x, y) || onPath.has(key(x, y))) continue;
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !this.isWall(x + dx, y + dy)).length;
        if (open === 1) deadEnds.push([x, y, distMap.get(key(x, y)) || 0]);
      }
      deadEnds.sort((p, q2) => q2[2] - p[2]);
      const picks = [];
      for (const d of deadEnds) {
        if (picks.length >= 5) break;
        if (picks.some((p) => Math.abs(p[0] - d[0]) + Math.abs(p[1] - d[1]) < 6)) continue;
        picks.push(d);
      }
      this.sparksTotal = picks.length;
      this.sparks = picks.map(([x, y], id) => ({ id, x: x * T + 8, y: y * T + 11, phase: r() * 6 })).filter((s) => !this.state.sparks.includes(s.id));

      // lanternas flutuantes nos cruzamentos
      this.lanterns = [];
      let n = 0;
      for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
        if (this.isWall(x, y)) continue;
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !this.isWall(x + dx, y + dy)).length;
        if (open >= 3 && n++ % 3 === 0) this.lanterns.push({ x: x * T + 8, y: y * T + 2, p: r() * 6 });
      }
    }

    checkpointPos(i) {
      if (i <= 0) return { x: this.start.tx * T + 8, y: this.start.ty * T + 12 };
      const c = this.checkpoints[i - 1];
      return { x: c.x, y: c.y + 2 };
    }

    buildGround() {
      const S = DMC.Sprites;
      const { canvas, ctx } = makeCanvas(W * T, H * T);
      const r = seeded(808);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const px = x * T, py = y * T;
          if (this.isWall(x, y)) {
            const face = !this.isWall(x, y + 1);
            const v = Math.floor(r() * 3);
            ctx.drawImage(face ? S.hedgeFace[v] : S.hedge[v], px, py);
          } else {
            ctx.drawImage(S.path[Math.floor(r() * S.path.length)], px, py);
            // sombra da sebe sobre o chão
            if (this.isWall(x, y - 1)) { ctx.fillStyle = 'rgba(43,27,61,0.28)'; ctx.fillRect(px, py, 16, 3); }
            if (this.isWall(x - 1, y)) { ctx.fillStyle = 'rgba(43,27,61,0.15)'; ctx.fillRect(px, py, 2, 16); }
            // florzinhas nos cantos
            if (r() < 0.18) {
              const cols = S.FLOWER_COLORS[Math.floor(r() * S.FLOWER_COLORS.length)];
              const fx = px + 2 + Math.floor(r() * 12), fy = py + 4 + Math.floor(r() * 10);
              ctx.fillStyle = cols[0]; ctx.fillRect(fx - 1, fy, 3, 1); ctx.fillRect(fx, fy - 1, 1, 3);
              ctx.fillStyle = cols[1]; ctx.fillRect(fx, fy, 1, 1);
            }
          }
        }
      }
      this.groundCanvas = canvas;
    }

    /* ---------- Ciclo de vida ---------- */
    enter() {
      this.enterBase('maze', this.state.introDone ? 'Fase 4 — O Caminho Até Você' : null);
      this.updateHUD();
      if (!this.state.introDone) this.intro();
    }

    updateHUD() {
      this.hud('Encontre a saída do labirinto', this.state.sparks.length, this.sparksTotal);
    }

    getState() {
      return Object.assign({}, this.state, { px: Math.round(this.player.x), py: Math.round(this.player.y), dir: this.player.dir });
    }

    async intro() {
      this.busy = true;
      this.player.frozen = true;
      await this.wait(0.7);
      if (this.dead) return;
      const cfg = DMC.Save.data.config;
      await DMC.Dialogue.show([
        'Um labirinto de flores... e lá no fim, alguém está esperando por você.',
        { name: cfg.from || '???', text: fill('{to}! Estou aqui, no outro lado! Vem me encontrar!', cfg) },
        'Cuidado com as nuvenzinhas de chuva: elas estão tristes e molham quem chega perto.',
        'As flores que brilham são pontos de descanso. O coraçãozinho na borda da tela aponta o caminho.',
      ]);
      if (this.dead) return;
      this.state.introDone = true;
      this.persist();
      this.player.frozen = false;
      this.busy = false;
      DMC.Input.clear();
    }

    /* ---------- Colisão ---------- */
    isBlocked(b) {
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.isWall(tx, ty)) return true;
      return false;
    }

    async hurt() {
      this.busy = true;
      this.player.frozen = true;
      this.state.hurts++;
      DMC.Audio.sfx('hurt');
      this.flash = 0.5;
      this.flashColor = '140,190,255';
      for (let i = 0; i < 12; i++) this.particles.spawn({ kind: 'dot', x: this.player.x + rand(-6, 6), y: this.player.y - 14, vx: rand(-20, 20), vy: rand(-10, 30), ay: 120, life: 0.6, color: '#8ec5ff' });
      await this.wait(0.6);
      if (this.dead) return;
      const p = this.checkpointPos(this.state.checkpoint);
      this.player.x = p.x;
      this.player.y = p.y;
      this.player.dir = 'down';
      this.snapCamera();
      this.particles.sparkles(p.x, p.y - 8, 12, '#ffc2dc');
      DMC.UI.toast('Ops! Voltando ao ponto de descanso');
      this.inv = 1.5;
      this.player.frozen = false;
      this.busy = false;
      this.persist();
    }

    async reachExit() {
      this.busy = true;
      this.player.frozen = true;
      this.player.dir = this.player.x < this.partner.x ? 'right' : 'down';
      this.partner.dir = this.player.x < this.partner.x ? 'left' : 'up';
      await this.wait(0.4);
      if (this.dead) return;
      DMC.Audio.sfx('heart');
      this.player.celebrate();
      this.partner.jump = 0.5;
      this.particles.hearts((this.player.x + this.partner.x) / 2, this.player.y - 18, 20, 12);
      await this.wait(1.0);
      if (this.dead) return;
      const cfg = DMC.Save.data.config;
      await DMC.Dialogue.show([{ name: cfg.from || '???', text: fill('Você me encontrou! Eu sabia que você ia conseguir, {to}.', cfg) }]);
      if (this.dead) return;
      this.heartRise = { t: 0 };
      await this.wait(2.0);
      if (this.dead) return;
      this.particles.hearts(this.partner.x - 6, this.partner.y - 40, 24, 14);
      this.flash = 0.6;
      this.flashColor = '255,240,250';
      await this.wait(0.8);
      if (this.dead) return;
      await this.reward({ text: `Tempo: ${DMC.SceneBase.formatTime(this.state.elapsed)} · Corações: ${this.state.sparks.length}/${this.sparksTotal} · Molhadas: ${this.state.hurts}` });
    }

    /* ---------- Atualização ---------- */
    update(dt) {
      this.updateBase(dt);
      const Input = DMC.Input;
      if (this.handleDialogue()) {
        this.player.update(dt, { x: 0, y: 0 }, () => true, null);
      } else {
        const axis = this.busy ? { x: 0, y: 0 } : Input.axis();
        const ox = this.player.x, oy = this.player.y;
        this.player.update(dt, axis, (b) => this.isBlocked(b), this.particles);
        if (ox !== this.player.x || oy !== this.player.y) this.dirty = true;
        Input.consumeAction();
      }
      if (this.state.introDone && !this.completed && !this.busy) this.state.elapsed += dt;
      if (this.inv > 0) this.inv = Math.max(0, this.inv - dt);
      if (this.partner.jump > 0) this.partner.jump = Math.max(0, this.partner.jump - dt);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      if (this.heartRise) this.heartRise.t += dt;

      // nuvens patrulhando
      for (const c of this.clouds) {
        const pos = ((this.time * c.speed) / c.len + c.phase) % 2;
        const u = pos < 1 ? pos : 2 - pos;
        c.x = lerp(c.a.x, c.b.x, u);
        c.y = lerp(c.a.y, c.b.y, u);
        if (!this.busy && this.inv <= 0 && dist(c.x, c.y + 4, this.player.x, this.player.y - 5) < 10) this.hurt();
        if (Math.random() < dt * 4) this.particles.spawn({ kind: 'dot', x: c.x + rand(-6, 6), y: c.y + 6, vx: 0, vy: 50, life: 0.25, color: '#8ec5ff' });
      }

      if (!this.busy) {
        // pontos de descanso
        this.checkpoints.forEach((c, i) => {
          if (!c.active && dist(c.x, c.y, this.player.x, this.player.y) < 13) {
            c.active = true;
            this.state.checkpoint = Math.max(this.state.checkpoint, i + 1);
            DMC.Audio.sfx('checkpoint');
            this.particles.sparkles(c.x, c.y - 8, 16, '#ffc2dc', 40);
            DMC.UI.toast('Ponto de descanso!');
            this.persist();
          }
        });
        // corações brilhantes
        for (let i = this.sparks.length - 1; i >= 0; i--) {
          const s = this.sparks[i];
          if (dist(s.x, s.y, this.player.x, this.player.y - 4) < 10) {
            this.sparks.splice(i, 1);
            this.state.sparks.push(s.id);
            DMC.Save.addSpark(LEVEL_ID, s.id);
            DMC.Audio.sfx('collect');
            this.particles.hearts(s.x, s.y - 4, 8);
            DMC.UI.popHUD('hud-sparks');
            this.updateHUD();
            this.persist();
          }
        }
        // chegou até a pessoa amada
        if (!this.completed && dist(this.partner.x, this.partner.y, this.player.x, this.player.y) < 15) this.reachExit();
      }

      if (Math.random() < dt * 0.7) this.particles.firefly(this.cam.x + rand(0, this.game.viewW), this.cam.y + rand(0, this.game.viewH));
      this.updateCamera(dt);
    }

    camTarget() {
      const vw = this.game.viewW, vh = this.game.viewH, mw = W * T, mh = H * T;
      let x = this.player.x - vw / 2, y = this.player.y - 8 - vh / 2;
      x = mw <= vw ? (mw - vw) / 2 : clamp(x, 0, mw - vw);
      y = mh <= vh ? (mh - vh) / 2 : clamp(y, 0, mh - vh);
      return { x, y };
    }
    snapCamera() { const t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; }
    updateCamera(dt) {
      const t = this.camTarget(), k = 1 - Math.pow(0.0025, dt);
      this.cam.x = lerp(this.cam.x, t.x, k);
      this.cam.y = lerp(this.cam.y, t.y, k);
    }
    onResize() { this.snapCamera(); this.lightCanvas = null; }

    /* ---------- Renderização ---------- */
    render(ctx) {
      const S = DMC.Sprites;
      const vw = this.game.viewW, vh = this.game.viewH;
      const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      const vis = (x, y, m = 24) => x > cx - m && x < cx + vw + m && y > cy - m && y < cy + vh + m;
      ctx.fillStyle = '#1c3d2f';
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(this.groundCanvas, cx, cy, vw, vh, 0, 0, vw, vh);

      // pontos de descanso
      for (const c of this.checkpoints) {
        if (!vis(c.x, c.y)) continue;
        if (c.active) { ctx.globalAlpha = 0.4 + 0.15 * Math.sin(this.time * 4); ctx.drawImage(S.glowPink, c.x - 14 - cx, c.y - 20 - cy, 28, 28); ctx.globalAlpha = 1; }
        ctx.drawImage(S.shrine[c.active ? 1 : 0], c.x - 5 - cx, c.y - 11 - cy);
      }
      // corações brilhantes
      for (const s of this.sparks) {
        if (!vis(s.x, s.y)) continue;
        const fy = Math.round(Math.sin(this.time * 3 + s.phase) * 2);
        ctx.globalAlpha = 0.4; ctx.drawImage(S.glowPink, s.x - 10 - cx, s.y - 18 + fy - cy, 20, 20); ctx.globalAlpha = 1;
        ctx.drawImage(S.heart, s.x - 3 - cx, s.y - 11 + fy - cy);
      }
      // a pessoa amada esperando na saída
      const pj = this.partner.jump > 0 ? -Math.round(Math.sin((this.partner.jump / 0.5) * Math.PI) * 6) : 0;
      const wave = !this.busy && Math.floor(this.time * 2) % 2 === 0 ? 0 : -1;
      ctx.fillStyle = 'rgba(43,27,61,0.3)'; ctx.fillRect(this.partner.x - 4 - cx, this.partner.y - 1 - cy, 8, 2);
      ctx.drawImage(S.partnerFrames[this.partner.dir][0], Math.round(this.partner.x - 6 - cx), Math.round(this.partner.y - 16 - cy + pj + wave));
      if (!this.completed && !this.heartRise) {
        const hy = this.partner.y - 28 + Math.round(Math.sin(this.time * 3) * 2);
        ctx.drawImage(Math.floor(this.time * 3) % 2 ? S.heart : S.heartWhite, this.partner.x - 3 - cx, hy - cy);
      }
      // jogador (pisca quando está invulnerável)
      if (this.inv <= 0 || Math.floor(this.time * 12) % 2 === 0) this.player.render(ctx, cx, cy);
      // nuvens (com sombra no chão)
      const cf = Math.floor(this.time * 6) % 2;
      for (const c of this.clouds) {
        if (!vis(c.x, c.y)) continue;
        const bob = Math.round(Math.sin(this.time * 3 + c.phase * 3) * 1.5);
        ctx.fillStyle = 'rgba(43,27,61,0.3)'; ctx.fillRect(Math.round(c.x - 6 - cx), Math.round(c.y + 6 - cy), 12, 2);
        ctx.drawImage(S.cloud[cf], Math.round(c.x - 11 - cx), Math.round(c.y - 16 + bob - cy));
      }
      // lanternas flutuantes
      for (const l of this.lanterns) {
        if (!vis(l.x, l.y)) continue;
        const y = l.y + Math.round(Math.sin(this.time * 2 + l.p) * 2);
        ctx.fillStyle = S.C.outline; ctx.fillRect(l.x - 3 - cx, y - 4 - cy, 6, 8);
        ctx.fillStyle = S.C.pink; ctx.fillRect(l.x - 2 - cx, y - 3 - cy, 4, 6);
        ctx.fillStyle = S.C.glow; ctx.fillRect(l.x - 1 - cx, y - 2 - cy, 2, 4);
      }
      if (this.heartRise) {
        const t = clamp(this.heartRise.t / 1.6, 0, 1);
        this.drawHeartPiece(ctx, (this.player.x + this.partner.x) / 2 - cx, this.player.y - 24 - DMC.util.easeInOut(t) * 16 - cy, 1 + t * 0.5);
      }

      this.renderLighting(ctx, cx, cy, vw, vh);
      this.particles.render(ctx, cx, cy);
      this.renderCompass(ctx, cx, cy, vw, vh);
      if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashColor},${this.flash})`; ctx.fillRect(0, 0, vw, vh); }
    }

    renderLighting(ctx, cx, cy, vw, vh) {
      const S = DMC.Sprites;
      if (!this.lightCanvas || this.lightCanvas.width !== vw || this.lightCanvas.height !== vh) {
        this.lightCanvas = makeCanvas(vw, vh).canvas;
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.vignette = this.makeVignette(vw, vh, 0.6);
      }
      const L = this.lightCtx;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, vw, vh);
      L.fillStyle = 'rgba(22,12,54,0.66)';
      L.fillRect(0, 0, vw, vh);
      L.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a = 1) => { if (x + r < 0 || y + r < 0 || x - r > vw || y - r > vh) return; L.globalAlpha = a; L.drawImage(S.glow, x - r, y - r, r * 2, r * 2); };
      hole(this.player.x - cx, this.player.y - 8 - cy, 78);
      hole(this.player.x - cx, this.player.y - 8 - cy, 40);
      for (const l of this.lanterns) hole(l.x - cx, l.y - cy, 34, 0.9);
      for (const c of this.checkpoints) hole(c.x - cx, c.y - 6 - cy, c.active ? 40 : 22, 0.9);
      for (const s of this.sparks) hole(s.x - cx, s.y - 8 - cy, 16, 0.7);
      hole(this.partner.x - cx, this.partner.y - 10 - cy, this.heartRise ? 90 : 44);
      L.globalAlpha = 1;
      ctx.drawImage(this.lightCanvas, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this.lanterns) {
        const x = l.x - cx, y = l.y - cy;
        if (x < -30 || y < -30 || x > vw + 30 || y > vh + 30) continue;
        ctx.globalAlpha = 0.22; ctx.drawImage(S.glowPink, x - 16, y - 16, 32, 32);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.vignette, 0, 0);
    }

    /** Coraçãozinho na borda da tela apontando para a pessoa amada. */
    renderCompass(ctx, cx, cy, vw, vh) {
      if (this.completed || !this.state.introDone) return;
      const tx = this.partner.x - cx, ty = this.partner.y - 10 - cy;
      if (tx > 6 && ty > 6 && tx < vw - 6 && ty < vh - 6) return;
      const ox = vw / 2, oy = vh / 2;
      const a = Math.atan2(ty - oy, tx - ox);
      const m = 14;
      let x = ox + Math.cos(a) * vw, y = oy + Math.sin(a) * vh;
      const k = Math.min((vw / 2 - m) / Math.abs(x - ox || 1), (vh / 2 - m) / Math.abs(y - oy || 1));
      x = ox + (x - ox) * k; y = oy + (y - oy) * k;
      const pulse = Math.sin(this.time * 5) > 0;
      ctx.globalAlpha = 0.5; ctx.drawImage(DMC.Sprites.glowPink, x - 9, y - 9, 18, 18); ctx.globalAlpha = 1;
      ctx.drawImage(pulse ? DMC.Sprites.heart : DMC.Sprites.heartWhite, Math.round(x - 3), Math.round(y - 3));
      ctx.fillStyle = '#ffc2dc';
      ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 7), 2, 2);
    }
  }

  DMC.Levels.register(LEVEL_ID, (game, saved) => new Level4(game, saved));
})();
