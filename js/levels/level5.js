/* =========================================================
   FASE 5 — A ÚLTIMA SURPRESA
   Jardim noturno: as lanternas acendem conforme o jogador
   passa, as quatro partes do coração orbitam ao seu redor e,
   no pedestal sob o arco de rosas, a carta final une as cinco
   partes. Fogos de coração, música especial, a pessoa amada
   chega e a declaração personalizada é revelada.
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const T = DMC.TILE;
  const { seeded, dist, clamp, lerp, rand, makeCanvas, fill, easeInOut } = DMC.util;
  const LEVEL_ID = 5;

  /* Legenda: # árvore, Y cerejeira, . grama, , grama alta, * flores, = caminho,
     L lanterna, U fonte, b arbusto, A pedestal + arco, P início */
  const MAP = [
    'YY##Y##Y##Y##Y##Y##Y##',
    '#..*.....,.....*.....#',
    'Y.....*.........,..*.Y',
    '#....***...*.........Y',
    '#..Y.....*........Y.*#',
    'Y....Y..==A===...,..*#',
    '#,*.....======,.Y....Y',
    '#..*....======.......#',
    'Y.Y..b.*..==.,*......#',
    '#......*L*==.L**b..Y.Y',
    '#......*..==.**......#',
    'Y..U...*L.==.L*......#',
    '#......*..==..*..Y...Y',
    '#......*L*==.L*......#',
    'Y.....b*..==..*b...b.#',
    '#.**...*L.==.L*......Y',
    '#...Y..**.==..**.....#',
    'Y......*L.==.L*..Y...#',
    '#......*..P=..*....,.Y',
    '##Y##Y##Y##Y##Y##Y##Y#',
  ];
  const MW = MAP[0].length, MH = MAP.length;

  class Level5 extends DMC.SceneBase {
    constructor(game, saved) {
      super(game, LEVEL_ID, saved, { introDone: false, px: null, py: null, dir: 'up', lit: [] });
      this.usesJoystick = true;
      this.cam = { x: 0, y: 0 };
      this.night = 0.55;          // escuridão do jardim (diminui no final)
      this.flash = 0;
      this.fireworkT = 0;
      this.fireworks = 0;         // intensidade dos fogos
      this.parse();
      this.buildGround();
      this.player = new DMC.Player(this.state.px != null ? this.state.px : this.start.x, this.state.py != null ? this.state.py : this.start.y);
      this.player.dir = this.state.dir || 'up';
      this.pieceCount = Math.min(4, DMC.Save.data.progress.completed.filter((id) => id < 5).length) || 4;
      this.snapCamera();
      for (let i = 0; i < 20; i++) this.particles.firefly(rand(16, MW * T - 16), rand(16, MH * T - 16));
    }

    /* ---------- Mundo ---------- */
    parse() {
      const S = DMC.Sprites;
      const r = seeded(5150);
      this.ground = []; this.objects = []; this.solids = []; this.interactables = [];
      this.flowers = []; this.tallGrass = []; this.lanterns = []; this.cherryTops = [];
      let treeIdx = 0;
      for (let ty = 0; ty < MH; ty++) {
        this.ground.push([]);
        for (let tx = 0; tx < MW; tx++) {
          const ch = MAP[ty][tx], x = tx * T, y = ty * T;
          this.ground[ty].push(ch === '=' || ch === 'A' || ch === 'P' ? 'path' : 'grass');
          switch (ch) {
            case '#': case 'Y': {
              const spr = ch === 'Y' ? S.cherries[treeIdx % 2] : S.trees[treeIdx % 3];
              treeIdx++;
              const ph = r() * 6.28;
              this.objects.push({ sortY: y + 15, bounds: [x - 8, y - 21, 32, 39], draw: (ctx, cx, cy) => {
                const sway = Math.round(Math.sin(this.time * 1.3 + ph) * 0.6);
                ctx.drawImage(spr.trunk, x - 8 - cx, y + 4 - cy);
                ctx.drawImage(spr.canopy, x - 8 + sway - cx, y - 21 - cy);
              } });
              this.solids.push({ x: x + 3, y: y + 6, w: 10, h: 10 });
              if (ch === 'Y') this.cherryTops.push({ x: x + 8, y: y - 10 });
              break;
            }
            case '*': for (let i = 0; i < 3; i++) this.flowers.push({ x: x + 2 + Math.floor(r() * 12), y: y + 4 + Math.floor(r() * 10), c: Math.floor(r() * S.FLOWER_COLORS.length) }); break;
            case ',': for (let i = 0; i < 3; i++) this.tallGrass.push({ x: x + 2 + Math.floor(r() * 11), y: y + 6 + Math.floor(r() * 9), h: 3 + Math.floor(r() * 3) }); break;
            case 'b': {
              const spr = S.bushes[(tx + ty) % 3];
              this.objects.push({ sortY: y + 14, bounds: [x - 1, y, 18, 16], draw: (ctx, cx, cy) => ctx.drawImage(spr, x - 1 - cx, y + 1 - cy) });
              this.solids.push({ x: x + 2, y: y + 7, w: 12, h: 8 });
              break;
            }
            case 'L': {
              const idx = this.lanterns.length;
              const l = { idx, x: x + 8, y: y - 5, lit: this.state.lit.includes(idx), p: r() * 6 };
              this.lanterns.push(l);
              this.objects.push({ sortY: y + 15, bounds: [x, y - 10, 16, 26], draw: (ctx, cx, cy) => ctx.drawImage(l.lit ? S.lamp : S.lampOff, x + 3 - cx, y - 10 - cy) });
              this.solids.push({ x: x + 5, y: y + 11, w: 6, h: 5 });
              break;
            }
            case 'U': {
              const fx = x, fy = y + 2 * T;  // base da fonte
              this.fountain = { x: fx + 24, y: fy - 14 };
              this.objects.push({ sortY: fy - 4, bounds: [fx, fy - 40, 48, 40], draw: (ctx, cx, cy) => this.drawFountain(ctx, fx - cx, fy - 40 - cy) });
              this.solids.push({ x: fx + 3, y: fy - 18, w: 42, h: 14 });
              this.interactables.push({ x: fx + 24, y: fy - 2, top: fy - 40, onUse: () => this.say(['A fonte canta baixinho...', 'Dizem que quem joga um desejo aqui sempre encontra o caminho de volta para quem ama.']) });
              break;
            }
            case 'A': {
              const px = x + T;           // centro entre dois tiles
              const baseY = y + T;
              this.pedestal = { x: px, y: baseY - 2, topY: baseY - 22 };
              this.objects.push({ sortY: baseY - 30, bounds: [px - 24, baseY - 56, 48, 46], draw: (ctx, cx, cy) => ctx.drawImage(S.arch, px - 24 - cx, baseY - 56 - cy) });
              this.objects.push({ sortY: baseY - 2, bounds: [px - 8, baseY - 22, 16, 22], draw: (ctx, cx, cy) => {
                if (!this.finalStarted) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 3); ctx.drawImage(S.glowPink, px - 18 - cx, baseY - 36 - cy, 36, 36); ctx.globalAlpha = 1; }
                ctx.drawImage(S.pedestal, px - 8 - cx, baseY - 22 - cy);
              } });
              this.solids.push({ x: px - 7, y: baseY - 8, w: 14, h: 7 });
              this.solids.push({ x: px - 22, y: baseY - 14, w: 8, h: 4 }, { x: px + 14, y: baseY - 14, w: 8, h: 4 });
              this.interactables.push({ x: px, y: baseY + 2, top: baseY - 24, onUse: () => this.finalSequence() });
              break;
            }
            case 'P': this.start = { x: x + T, y: y + 12 }; break;
            default: break;
          }
        }
      }
    }

    buildGround() {
      const S = DMC.Sprites;
      const { canvas, ctx } = makeCanvas(MW * T, MH * T);
      const r = seeded(51);
      const gAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH ? 'grass' : this.ground[ty][tx]);
      for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
        const x = tx * T, y = ty * T;
        if (this.ground[ty][tx] === 'path') {
          ctx.drawImage(S.path[Math.floor(r() * 3)], x, y);
          ctx.fillStyle = S.C.pathD;
          if (gAt(tx, ty - 1) !== 'path') ctx.fillRect(x, y, 16, 1);
          if (gAt(tx, ty + 1) !== 'path') ctx.fillRect(x, y + 15, 16, 1);
          if (gAt(tx - 1, ty) !== 'path') ctx.fillRect(x, y, 1, 16);
          if (gAt(tx + 1, ty) !== 'path') ctx.fillRect(x + 15, y, 1, 16);
          // pétalas caídas no caminho
          if (r() < 0.5) { ctx.fillStyle = S.C.blossomL; ctx.fillRect(x + Math.floor(r() * 14), y + Math.floor(r() * 14), 2, 1); }
        } else ctx.drawImage(S.grass[Math.floor(r() * S.grass.length)], x, y);
      }
      this.groundCanvas = canvas;
    }

    drawFountain(ctx, x, y) {
      const S = DMC.Sprites;
      ctx.drawImage(S.fountain, x, y);
      // água animada
      const f = Math.floor(this.time * 6) % 3;
      ctx.fillStyle = S.C.waterL;
      ctx.fillRect(x + 23, y + 2 - f, 2, 7 + f);
      ctx.fillStyle = S.C.foam;
      ctx.fillRect(x + 20 + f, y + 5, 1, 2); ctx.fillRect(x + 27 - f, y + 5, 1, 2);
      ctx.fillRect(x + 12 + f * 3, y + 26, 2, 1); ctx.fillRect(x + 30 - f * 2, y + 28, 2, 1);
      if (Math.random() < 0.3) this.particles.spawn({ kind: 'dot', x: this.fountain.x + rand(-3, 3), y: this.fountain.y - 26, vx: rand(-14, 14), vy: rand(-20, -8), ay: 60, life: 0.6, color: '#d4e8ff' });
    }

    /* ---------- Ciclo de vida ---------- */
    enter() {
      this.enterBase('menu', this.state.introDone ? 'Fase 5 — A Última Surpresa' : null);
      this.updateHUD();
      if (!this.state.introDone) this.intro();
    }

    updateHUD() {
      this.hud(this.finalStarted ? 'A mensagem final' : 'Siga as lanternas até o arco de rosas');
    }

    getState() {
      return Object.assign({}, this.state, { px: Math.round(this.player.x), py: Math.round(this.player.y), dir: this.player.dir });
    }

    async intro() {
      this.busy = true;
      this.player.frozen = true;
      await this.wait(0.8);
      if (this.dead) return;
      await DMC.Dialogue.show([
        'Um jardim secreto... as quatro partes do coração brilham ao seu redor.',
        'As lanternas parecem esperar por você. Lá no alto, sob o arco de rosas, há algo reluzindo.',
      ]);
      if (this.dead) return;
      this.state.introDone = true;
      this.persist();
      this.player.frozen = false;
      this.busy = false;
      DMC.Input.clear();
    }

    /* ---------- Sequência final ---------- */
    async finalSequence() {
      if (this.finalStarted) return;
      this.finalStarted = true;
      this.busy = true;
      this.player.frozen = true;
      this.player.dir = 'up';
      this.updateHUD();
      const cfg = DMC.Save.data.config;
      await DMC.Dialogue.show([
        fill('Uma carta com o nome "{to}" escrito à mão, sobre um pedestal de pedra...', cfg),
        'Ao redor dela, um espaço vazio em forma de coração. As quatro partes começam a brilhar!',
      ]);
      if (this.dead) return;

      // 1) as partes voam e se unem com a quinta, que sai da carta
      this.assemble = { t: 0 };
      DMC.Audio.sfx('heart');
      this.lanterns.forEach((l) => { l.lit = true; });
      await this.wait(2.7);
      if (this.dead) return;
      this.assembled = true;
      this.flash = 0.9;
      DMC.Audio.sfx('fanfare');
      DMC.Audio.playMusic('finale');
      const hx = this.pedestal.x, hy = this.pedestal.topY - 22;
      this.particles.hearts(hx, hy, 30, 20);
      this.particles.sparkles(hx, hy, 40, '#fff1b8', 90);
      this.fireworks = 1;
      await this.wait(2.0);
      if (this.dead) return;

      // 2) a pessoa amada chega pelo caminho
      this.partner = { x: this.start.x, y: MH * T - 4, dir: 'up', anim: 0, jump: 0, walking: true };
      const target = { x: this.player.x + 16, y: this.player.y };
      await new Promise((resolve) => { this.partnerWalk = { target, resolve }; });
      if (this.dead) return;
      this.partner.dir = 'left';
      this.player.dir = 'right';
      await this.wait(0.5);
      if (this.dead) return;
      DMC.Audio.sfx('collect');
      this.particles.hearts((this.player.x + this.partner.x) / 2, this.player.y - 20, 14, 10);
      await DMC.Dialogue.show([
        { name: cfg.from || '???', text: 'Eu preparei esse caminho inteiro só para chegar até este momento.' },
        { name: cfg.from || '???', text: fill('Tem uma última coisa que eu preciso te dizer, {to}...', cfg) },
      ]);
      if (this.dead) return;

      // 3) a declaração
      this.completed = true;
      this.game.completeLevel(LEVEL_ID, { final: true });
      this.updateHUD();
      const type = cfg.type || 'namoro';
      const choice = await DMC.UI.showFinal({
        to: fill('Para {to},', cfg),
        body: cfg.message ? cfg.message : fill(DMC.Levels.DEFAULT_FINAL[type] || DMC.Levels.DEFAULT_FINAL.namoro, cfg),
        closing: fill(DMC.Levels.FINAL_CLOSING[type] || DMC.Levels.FINAL_CLOSING.namoro, cfg),
        from: fill('Com todo o meu amor, {from}', cfg),
        answers: DMC.Levels.FINAL_ANSWERS[type] || DMC.Levels.FINAL_ANSWERS.namoro,
        celebrateTitle: DMC.Levels.FINAL_CELEBRATE[type] || DMC.Levels.FINAL_CELEBRATE.namoro,
        names: fill('♥ {to} & {from} ♥', cfg),
        onAnswer: () => this.celebrate(),
      });
      if (this.dead) return;
      this.game.finishGame(choice);
    }

    celebrate() {
      DMC.Audio.sfx('fanfare');
      this.fireworks = 2.2;
      this.player.celebrate();
      if (this.partner) this.partner.jump = 0.5;
      this.particles.hearts(this.player.x + 8, this.player.y - 20, 30, 20);
    }

    /* ---------- Atualização ---------- */
    findTarget() {
      const fp = this.player.facingPoint(9);
      let best = null, bd = 16;
      for (const it of this.interactables) {
        const d = Math.min(dist(fp.x, fp.y, it.x, it.y), dist(this.player.x, this.player.y - 3, it.x, it.y) + 3);
        if (d < bd) { bd = d; best = it; }
      }
      return best;
    }

    isBlocked(b) {
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      if (x0 < 0 || y0 < 0 || x1 >= MW || y1 >= MH) return true;
      for (const s of this.solids) if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) return true;
      return false;
    }

    update(dt) {
      this.updateBase(dt);
      const Input = DMC.Input;
      if (this.handleDialogue()) {
        this.player.update(dt, { x: 0, y: 0 }, () => true, null);
        this.target = null;
      } else {
        const axis = this.busy ? { x: 0, y: 0 } : Input.axis();
        const ox = this.player.x, oy = this.player.y;
        this.player.update(dt, axis, (b) => this.isBlocked(b), this.particles);
        if (ox !== this.player.x || oy !== this.player.y) this.dirty = true;
        this.target = this.busy ? null : this.findTarget();
        DMC.UI.setActionReady(!!this.target);
        if (Input.consumeAction() && this.target && !this.busy) this.target.onUse();
      }

      // lanternas acendem quando o jogador passa
      for (const l of this.lanterns) {
        if (!l.lit && dist(l.x, l.y + 14, this.player.x, this.player.y) < 54) {
          l.lit = true;
          if (!this.state.lit.includes(l.idx)) this.state.lit.push(l.idx);
          DMC.Audio.sfx('chime');
          this.particles.sparkles(l.x, l.y, 12, '#fff1b8', 30);
          this.dirty = true;
          if (this.state.lit.length === this.lanterns.length) DMC.UI.toast('O jardim está todo iluminado!');
        }
      }

      // pessoa amada caminhando
      if (this.partner) {
        const p = this.partner;
        p.anim += dt;
        if (p.jump > 0) p.jump = Math.max(0, p.jump - dt);
        if (this.partnerWalk) {
          const tg = this.partnerWalk.target;
          const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy);
          if (d < 1.5) {
            p.x = tg.x; p.y = tg.y; p.walking = false;
            const res = this.partnerWalk.resolve; this.partnerWalk = null; res();
          } else {
            // sobe pelo caminho e depois vai para o lado
            // primeiro vai para o lado do jogador e depois sobe até ele
            const step = 48 * dt;
            if (Math.abs(dx) > 1) { p.x += Math.sign(dx) * Math.min(step, Math.abs(dx)); p.dir = dx > 0 ? 'right' : 'left'; }
            else { p.y += Math.sign(dy) * Math.min(step, Math.abs(dy)); p.dir = dy < 0 ? 'up' : 'down'; }
            if (Math.random() < dt * 4) this.particles.dust(p.x, p.y);
          }
        }
      }

      if (this.assemble) this.assemble.t += dt;
      if (this.assembled) this.night = Math.max(0.1, this.night - dt * 0.25);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.8);

      // fogos de artifício em forma de coração
      if (this.fireworks > 0) {
        this.fireworkT -= dt * this.fireworks;
        if (this.fireworkT <= 0) {
          this.fireworkT = 0.8;
          const cols = ['#ff7eb6', '#ffc2dc', '#c6e0ff', '#fff1b8', '#a98bdb'];
          this.particles.firework(this.cam.x + rand(30, this.game.viewW - 30), this.cam.y + rand(24, this.game.viewH * 0.4), cols[Math.floor(Math.random() * cols.length)], rand(0.7, 1.1));
          DMC.Audio.sfx('firework');
        }
      }
      // pétalas e vaga-lumes
      if (Math.random() < dt * (this.assembled ? 6 : 1.5)) {
        if (this.assembled) this.particles.petal(this.cam.x + rand(-40, this.game.viewW), this.cam.y - 4);
        else { const c = this.cherryTops[Math.floor(Math.random() * this.cherryTops.length)]; if (c) this.particles.petal(c.x + rand(-10, 10), c.y); }
      }
      if (Math.random() < dt * 0.8) this.particles.firefly(this.cam.x + rand(0, this.game.viewW), this.cam.y + rand(0, this.game.viewH));
      this.updateCamera(dt);
    }

    camTarget() {
      const vw = this.game.viewW, vh = this.game.viewH, mw = MW * T, mh = MH * T;
      let fy = this.player.y - 8;
      if (this.assemble && !this.partner) fy = this.player.y - 28;
      let x = this.player.x - vw / 2, y = fy - vh / 2;
      x = mw <= vw ? (mw - vw) / 2 : clamp(x, 0, mw - vw);
      y = mh <= vh ? (mh - vh) / 2 : clamp(y, 0, mh - vh);
      return { x, y };
    }
    snapCamera() { const t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; }
    updateCamera(dt) { const t = this.camTarget(), k = 1 - Math.pow(0.0025, dt); this.cam.x = lerp(this.cam.x, t.x, k); this.cam.y = lerp(this.cam.y, t.y, k); }
    onResize() { this.snapCamera(); this.lightCanvas = null; }

    /* ---------- Renderização ---------- */
    render(ctx) {
      const S = DMC.Sprites;
      const vw = this.game.viewW, vh = this.game.viewH;
      const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      const visible = (x, y, w, h) => x + w > cx && x < cx + vw && y + h > cy && y < cy + vh;
      ctx.fillStyle = '#25523f';
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(this.groundCanvas, cx, cy, vw, vh, 0, 0, vw, vh);

      for (const f of this.flowers) {
        if (!visible(f.x - 2, f.y - 4, 5, 6)) continue;
        const sway = Math.round(Math.sin(this.time * 2 + f.x * 0.25) * 0.7);
        const x = f.x - cx, y = f.y - cy, [c1, c2] = S.FLOWER_COLORS[f.c];
        ctx.fillStyle = S.C.grassD; ctx.fillRect(x, y - 1, 1, 2);
        ctx.fillStyle = c1; ctx.fillRect(x - 1 + sway, y - 3, 3, 1); ctx.fillRect(x + sway, y - 4, 1, 3);
        ctx.fillStyle = c2; ctx.fillRect(x + sway, y - 3, 1, 1);
      }
      for (const g of this.tallGrass) {
        if (!visible(g.x - 2, g.y - 6, 5, 7)) continue;
        const sway = Math.sin(this.time * 2.2 + g.x * 0.3) > 0.3 ? 1 : 0, x = g.x - cx, y = g.y - cy;
        ctx.fillStyle = S.C.grassD; ctx.fillRect(x - 1, y - g.h + 1, 1, g.h - 1); ctx.fillRect(x + 1, y - g.h + 2, 1, g.h - 2);
        ctx.fillStyle = S.C.leaf; ctx.fillRect(x, y - g.h, 1, g.h); ctx.fillRect(x + sway, y - g.h - 1, 1, 1);
      }

      const drawables = this.objects.filter((o) => visible(o.bounds[0], o.bounds[1], o.bounds[2], o.bounds[3]));
      drawables.push({ sortY: this.player.y, draw: () => this.player.render(ctx, cx, cy) });
      if (this.partner) {
        const p = this.partner;
        drawables.push({ sortY: p.y, draw: () => {
          const fr = p.walking ? (Math.floor(p.anim * 8) % 4 === 1 ? 1 : Math.floor(p.anim * 8) % 4 === 3 ? 2 : 0) : 0;
          const j = p.jump > 0 ? -Math.round(Math.sin((p.jump / 0.5) * Math.PI) * 6) : 0;
          ctx.fillStyle = 'rgba(43,27,61,0.3)'; ctx.fillRect(Math.round(p.x - 4 - cx), Math.round(p.y - 1 - cy), 8, 2);
          ctx.drawImage(S.partnerFrames[p.dir][fr], Math.round(p.x - 6 - cx), Math.round(p.y - 16 - cy + j));
        } });
      }
      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw(ctx, cx, cy);

      this.renderHearts(ctx, cx, cy);
      if (this.partner && !this.partnerWalk) {
        const hy = this.player.y - 30 + Math.round(Math.sin(this.time * 3) * 2);
        ctx.drawImage(Math.floor(this.time * 3) % 2 ? S.heart : S.heartWhite, Math.round((this.player.x + this.partner.x) / 2 - 3 - cx), Math.round(hy - cy));
      }

      this.renderLighting(ctx, cx, cy, vw, vh);
      this.particles.render(ctx, cx, cy);

      if (this.target && !DMC.Dialogue.active) {
        const bob = Math.round(Math.sin(this.time * 6) * 1.5);
        ctx.drawImage(S.bubble, Math.round(this.target.x - 3 - cx), Math.round(this.target.top - 11 + bob - cy));
      }
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,240,250,${Math.min(1, this.flash)})`; ctx.fillRect(0, 0, vw, vh); }
    }

    /** Partes do coração: orbitando o jogador → voando → unidas sobre o pedestal. */
    renderHearts(ctx, cx, cy) {
      const S = DMC.Sprites;
      const n = this.pieceCount;
      const hx = this.pedestal.x, hy = this.pedestal.topY - 22;
      if (this.assembled) {
        this.drawHeartPiece(ctx, hx - cx, hy - cy + Math.sin(this.time * 2) * 2, 2.2);
        return;
      }
      const t = this.assemble ? this.assemble.t : 0;
      for (let i = 0; i < n; i++) {
        const a = this.time * 1.8 + (i / n) * Math.PI * 2;
        const ox = this.player.x + Math.cos(a) * 13, oy = this.player.y - 12 + Math.sin(a) * 5;
        let x = ox, y = oy;
        if (this.assemble) {
          const k1 = easeInOut(clamp(t / 1.6, 0, 1));
          const corner = [[-9, -6], [9, -6], [-9, 6], [9, 6]][i % 4];
          x = lerp(ox, hx + corner[0], k1); y = lerp(oy, hy + corner[1], k1);
          const k2 = easeInOut(clamp((t - 1.6) / 1.0, 0, 1));
          const spin = k2 * Math.PI * 2;
          const rr = (1 - k2) * 11;
          if (k2 > 0) { x = hx + Math.cos(spin + (i / n) * Math.PI * 2) * rr; y = hy + Math.sin(spin + (i / n) * Math.PI * 2) * rr; }
        }
        ctx.globalAlpha = 0.45; ctx.drawImage(S.glowPink, Math.round(x - 8 - cx), Math.round(y - 8 - cy), 16, 16); ctx.globalAlpha = 1;
        ctx.drawImage(S.heart, Math.round(x - 3 - cx), Math.round(y - 3 - cy));
      }
      if (this.assemble) {
        // quinta parte saindo da carta
        const k = easeInOut(clamp((t - 0.8) / 1.4, 0, 1));
        const y = lerp(this.pedestal.topY + 2, hy, k);
        ctx.globalAlpha = 0.6; ctx.drawImage(S.glow, hx - 12 - cx, y - 12 - cy, 24, 24); ctx.globalAlpha = 1;
        ctx.drawImage(S.heartWhite, Math.round(hx - 3 - cx), Math.round(y - 3 - cy));
      }
    }

    renderLighting(ctx, cx, cy, vw, vh) {
      const S = DMC.Sprites;
      if (!this.lightCanvas || this.lightCanvas.width !== vw || this.lightCanvas.height !== vh) {
        this.lightCanvas = makeCanvas(vw, vh).canvas;
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.vignette = this.makeVignette(vw, vh, 0.5);
      }
      const L = this.lightCtx;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, vw, vh);
      L.fillStyle = `rgba(30,16,70,${this.night})`;
      L.fillRect(0, 0, vw, vh);
      L.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a = 1) => { if (x + r < 0 || y + r < 0 || x - r > vw || y - r > vh) return; L.globalAlpha = a; L.drawImage(S.glow, x - r, y - r, r * 2, r * 2); };
      hole(this.player.x - cx, this.player.y - 8 - cy, 50, 0.85);
      for (const l of this.lanterns) if (l.lit) hole(l.x - cx, l.y - cy, 52 + Math.sin(this.time * 6 + l.p) * 2);
      hole(this.pedestal.x - cx, this.pedestal.topY - cy, this.assembled ? 140 : 40);
      if (this.fountain) hole(this.fountain.x - cx, this.fountain.y - cy, 30, 0.6);
      L.globalAlpha = 1;
      ctx.drawImage(this.lightCanvas, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this.lanterns) {
        if (!l.lit) continue;
        const x = l.x - cx, y = l.y - cy;
        if (x < -40 || y < -40 || x > vw + 40 || y > vh + 40) continue;
        ctx.globalAlpha = 0.24; ctx.drawImage(S.glow, x - 20, y - 20, 40, 40);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.vignette, 0, 0);
    }
  }

  DMC.Levels.register(LEVEL_ID, (game, saved) => new Level5(game, saved));
})();
