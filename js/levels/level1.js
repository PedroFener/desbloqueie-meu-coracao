/* =========================================================
   FASE 1 — A PRIMEIRA CHAVE
   Jardim explorável ao entardecer. O jogador lê a carta
   misteriosa, procura a chave nos arbustos (a placa dá a
   pista), abre o baú e recebe a primeira mensagem.
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const T = DMC.TILE;
  const { clamp, lerp, dist, seeded, rand, fill } = DMC.util;
  const LEVEL_ID = 1;

  /* Legenda do mapa:
     #  árvore          Y  cerejeira       .  grama          ,  grama alta
     *  flores          =  caminho         ~  água           w  ponte
     b  arbusto          K  arbusto da chave r pedra          F  cerca
     O  casa (âncora)    M  caixa de correio s placa          C  baú
     L  poste de luz     h  coração brilhante  P início do jogador */
  const MAP = [
    '##Y####Y####Y####Y####Y####Y####Y###',
    '#...................,,........*....Y',
    '#..O....*.....~~~~~~~~...........h.#',
    'Y.............~~~~~~~~..b.....Y....#',
    '#......M...b..~~~~~~~~.............#',
    '#....=.......#.~~~~~~......r.......Y',
    '#....P................,.......,....#',
    '#.Y..==========================.*..#',
    'Y...,....s..,,,..=.....r.....,=..#.#',
    '#..,...*....#....=....Y.*....*=....Y',
    '#FFFF,FFFF.,..r,*=......,.....=....#',
    '#..........,.*...=.*h....b....=....#',
    '#*h......b.......=...r........=....#',
    'Y..b...Y.........=.........#..=....Y',
    '#....*......~~~~~w~~~~~,......=....#',
    '#......*r...~~~~~w~~~~~.....*.=....#',
    '#.........r.~~~~~w~~~~~...**..=....#',
    '#....*..,..h~~~~~w~~~~~...b...=....Y',
    'Y...***......~~~~w~~~~....,...=....#',
    '#..**K**..#......=,.........*.=**.*#',
    '#...***...*......=......#..,,L=..L.#',
    '#.,..*...........==============.C..Y',
    '#.........*.b.........,..r.........#',
    'Y.r.*....r..........Y..*.....L.,.L.#',
    '#...*..............,...h....*.....*#',
    '###Y#####Y#####Y#####Y#####Y#####Y#Y',
  ];
  const MW = MAP[0].length, MH = MAP.length;

  const BUSH_TEXTS = [
    'Só folhas... e um besouro dormindo. Shhh.',
    'Nada aqui, mas tem um cheirinho bom de jasmim.',
    'Uma joaninha te olhou com cara de "não é aqui".',
    'Folhas, galhos e... nenhuma chave.',
    'Só um ninho vazio. Os passarinhos já foram dormir.',
    'Nada. Talvez a placa perto do caminho tenha uma pista?',
    'Só frutinhas cor-de-rosa. Que fofas!',
  ];

  class Level1 {
    constructor(game, saved) {
      this.game = game;
      this.id = LEVEL_ID;
      this.time = 0;
      this.timers = [];
      this.dead = false;
      this.busy = false;        // bloqueia interações durante sequências
      this.particles = new DMC.Particles();
      this.cam = { x: 0, y: 0 };
      this.saveT = 0;
      this.dirty = false;
      this.flash = 0;

      // Estado persistente da fase
      this.state = Object.assign({
        px: null, py: null, dir: 'down',
        introDone: false, keyFound: false, keyCollected: false,
        searched: [], sparks: [],
      }, saved || {});

      this.parseMap();
      this.buildGround();

      const sx = this.state.px != null ? this.state.px : this.start.x;
      const sy = this.state.py != null ? this.state.py : this.start.y;
      this.player = new DMC.Player(sx, sy);
      this.player.dir = this.state.dir || 'down';
      this.snapCamera();

      // pré-popula vaga-lumes
      for (let i = 0; i < 18; i++) this.particles.firefly(rand(16, MW * T - 16), rand(16, MH * T - 16));
    }

    /* ------------------------------------------------------
       Construção do mundo a partir do mapa de texto
       ------------------------------------------------------ */
    parseMap() {
      this.ground = [];      // grass | path | water | bridge
      this.objects = [];     // objetos desenhados com ordenação por Y
      this.solids = [];      // retângulos de colisão
      this.interactables = [];
      this.flowers = [];
      this.tallGrass = [];
      this.sparks = [];
      this.lights = [];      // fontes de luz {x,y,r,color}
      this.cherryTops = [];
      const rnd = seeded(2024);
      let bushIdx = 0, sparkIdx = 0, treeIdx = 0;
      const S = DMC.Sprites;

      for (let ty = 0; ty < MH; ty++) {
        this.ground.push([]);
        for (let tx = 0; tx < MW; tx++) {
          const ch = MAP[ty][tx];
          const x = tx * T, y = ty * T;
          let g = 'grass';
          if (ch === '=' || ch === 'P') g = 'path';
          else if (ch === '~') g = 'water';
          else if (ch === 'w') g = 'bridge';
          this.ground[ty].push(g);

          switch (ch) {
            case '#': case 'Y': {
              const cherry = ch === 'Y';
              const spr = cherry ? S.cherries[treeIdx % 2] : S.trees[treeIdx % 3];
              treeIdx++;
              const phase = rnd() * 6.28;
              this.objects.push({
                sortY: y + 15, draw: (ctx, cx, cy) => {
                  const sway = Math.round(Math.sin(this.time * 1.3 + phase) * 0.6);
                  ctx.drawImage(spr.trunk, x - 8 - cx, y + 4 - cy);
                  ctx.drawImage(spr.canopy, x - 8 + sway - cx, y - 21 - cy);
                }, bounds: [x - 8, y - 21, 32, 39],
              });
              this.solids.push({ x: x + 3, y: y + 6, w: 10, h: 10 });
              if (cherry) this.cherryTops.push({ x: x + 8, y: y - 10 });
              break;
            }
            case '*': {
              for (let i = 0; i < 3; i++) {
                this.flowers.push({ x: x + 2 + Math.floor(rnd() * 12), y: y + 4 + Math.floor(rnd() * 10), c: Math.floor(rnd() * S.FLOWER_COLORS.length) });
              }
              break;
            }
            case ',': {
              for (let i = 0; i < 3; i++) this.tallGrass.push({ x: x + 2 + Math.floor(rnd() * 11), y: y + 6 + Math.floor(rnd() * 9), h: 3 + Math.floor(rnd() * 3) });
              break;
            }
            case 'b': case 'K': this.addBush(x, y, ch === 'K' ? 'key' : bushIdx++); break;
            case 'r': {
              const spr = S.rocks[(tx + ty) % 2];
              this.objects.push({ sortY: y + 14, draw: (ctx, cx, cy) => ctx.drawImage(spr, x - cx, y + 3 - cy), bounds: [x, y, 16, 16] });
              this.solids.push({ x: x + 2, y: y + 7, w: 12, h: 8 });
              break;
            }
            case 'F':
              this.objects.push({ sortY: y + 12, draw: (ctx, cx, cy) => ctx.drawImage(S.fence, x - cx, y - cy), bounds: [x, y, 16, 16] });
              this.solids.push({ x, y: y + 8, w: 16, h: 6 });
              break;
            case 'O': this.addHouse(x - T, y); break;
            case 'M': this.addMailbox(x, y); break;
            case 's': this.addSign(x, y); break;
            case 'C': this.addChest(x, y); break;
            case 'L':
              this.objects.push({ sortY: y + 15, draw: (ctx, cx, cy) => ctx.drawImage(S.lamp, x + 3 - cx, y - 10 - cy), bounds: [x, y - 10, 16, 26] });
              this.solids.push({ x: x + 5, y: y + 11, w: 6, h: 5 });
              this.lights.push({ x: x + 8, y: y - 5, r: 58, flicker: rnd() * 6 });
              break;
            case 'h': {
              const id = sparkIdx++;
              if (!this.state.sparks.includes(id)) this.sparks.push({ id, x: x + 8, y: y + 10, phase: rnd() * 6 });
              break;
            }
            case 'P': this.start = { x: x + 8, y: y + 12 }; break;
            default: break;
          }
        }
      }
      this.sparksTotal = sparkIdx;
      this.bushTotal = bushIdx;
    }

    addBush(x, y, id) {
      const S = DMC.Sprites;
      const spr = S.bushes[(x / T + y / T) % 3 | 0];
      const bush = { id, x: x + 8, y: y + 10, shake: 0 };
      this.objects.push({
        sortY: y + 14, draw: (ctx, cx, cy) => {
          const sx = bush.shake > 0 ? Math.round(Math.sin(bush.shake * 40) * 1.5) : 0;
          ctx.drawImage(spr, x - 1 + sx - cx, y + 1 - cy);
        }, bounds: [x - 1, y, 18, 16],
      });
      this.solids.push({ x: x + 2, y: y + 7, w: 12, h: 8 });
      this.interactables.push({ x: x + 8, y: y + 10, top: y, onUse: () => this.searchBush(bush) });
      if (id === 'key') this.keyBush = bush;
      (this.bushes = this.bushes || []).push(bush);
    }

    addHouse(x, y) {
      const S = DMC.Sprites;
      // a casa ocupa 3 tiles de largura; a base fica 2 tiles abaixo da âncora
      const baseY = y + 3 * T;
      this.objects.push({ sortY: baseY - 4, draw: (ctx, cx, cy) => ctx.drawImage(S.house, x - cx, baseY - 52 - cy), bounds: [x, baseY - 52, 48, 52] });
      this.solids.push({ x: x + 4, y: baseY - 26, w: 40, h: 24 });
      this.interactables.push({ x: x + 24, y: baseY, top: baseY - 30, onUse: () => this.say([
        'Sua casinha aconchegante.',
        'Ainda não é hora de dormir — tem um coração esperando por você!',
      ]) });
      this.lights.push({ x: x + 12, y: baseY - 18, r: 30 });
      this.lights.push({ x: x + 37, y: baseY - 18, r: 30 });
    }

    addMailbox(x, y) {
      const S = DMC.Sprites;
      this.objects.push({
        sortY: y + 15, draw: (ctx, cx, cy) => ctx.drawImage(S.mailbox[this.state.introDone ? 0 : 1], x + 2 - cx, y + 3 - cy), bounds: [x, y, 16, 16],
      });
      this.solids.push({ x: x + 5, y: y + 11, w: 6, h: 4 });
      this.interactables.push({ x: x + 8, y: y + 12, top: y + 2, onUse: () => this.readLetterAgain() });
    }

    addSign(x, y) {
      const S = DMC.Sprites;
      this.objects.push({ sortY: y + 14, draw: (ctx, cx, cy) => ctx.drawImage(S.sign, x + 1 - cx, y + 3 - cy), bounds: [x, y, 16, 16] });
      this.solids.push({ x: x + 2, y: y + 9, w: 12, h: 6 });
      this.interactables.push({ x: x + 8, y: y + 12, top: y + 2, onUse: () => this.say([
        { name: 'Placa', text: '"O que é precioso se esconde no centro de uma roda de flores."' },
        { name: 'Placa', text: '"Procure onde as flores dançam em círculo."' },
      ]) });
    }

    addChest(x, y) {
      const S = DMC.Sprites;
      this.chest = { x: x + 8, y: y + 8, frame: 0, open: false };
      this.objects.push({
        sortY: y + 15, draw: (ctx, cx, cy) => {
          const c = this.chest;
          // brilho pulsante quando o jogador tem a chave
          if (this.state.keyCollected && !c.open) {
            ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.time * 4);
            ctx.drawImage(S.glowPink, x - 16 - cx, y - 18 - cy, 48, 48);
            ctx.globalAlpha = 1;
          }
          ctx.drawImage(S.chest[c.frame], x - cx, y - 1 - cy);
        }, bounds: [x, y - 2, 16, 18],
      });
      this.solids.push({ x: x + 1, y: y + 6, w: 14, h: 10 });
      this.interactables.push({ x: x + 8, y: y + 12, top: y - 2, onUse: () => this.useChest() });
      this.lights.push({ x: x + 8, y: y + 6, r: 26, chest: true });
    }

    /* Pré-renderiza o chão estático (grama, caminho, bordas) num canvas */
    buildGround() {
      const S = DMC.Sprites;
      const { canvas, ctx } = DMC.util.makeCanvas(MW * T, MH * T);
      const rnd = seeded(99);
      const gAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH ? 'grass' : this.ground[ty][tx]);
      this.waterTiles = [];
      this.bridgeTiles = [];
      for (let ty = 0; ty < MH; ty++) {
        for (let tx = 0; tx < MW; tx++) {
          const g = this.ground[ty][tx];
          const x = tx * T, y = ty * T;
          if (g === 'path') {
            ctx.drawImage(S.path[Math.floor(rnd() * 3)], x, y);
            // bordas suaves do caminho
            ctx.fillStyle = S.C.pathD;
            if (gAt(tx, ty - 1) !== 'path') ctx.fillRect(x, y, 16, 1);
            if (gAt(tx, ty + 1) !== 'path') ctx.fillRect(x, y + 15, 16, 1);
            if (gAt(tx - 1, ty) !== 'path') ctx.fillRect(x, y, 1, 16);
            if (gAt(tx + 1, ty) !== 'path') ctx.fillRect(x + 15, y, 1, 16);
            ctx.fillStyle = S.C.grass;
            if (gAt(tx, ty - 1) === 'grass') for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.floor(rnd() * 15), y + 1, 1, 1);
            if (gAt(tx, ty + 1) === 'grass') for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.floor(rnd() * 15), y + 14, 1, 1);
          } else {
            ctx.drawImage(S.grass[Math.floor(rnd() * S.grass.length)], x, y);
          }
          if (g === 'water') {
            const edges = {
              n: !['water', 'bridge'].includes(gAt(tx, ty - 1)),
              s: !['water', 'bridge'].includes(gAt(tx, ty + 1)),
              w: !['water', 'bridge'].includes(gAt(tx - 1, ty)),
              e: !['water', 'bridge'].includes(gAt(tx + 1, ty)),
            };
            this.waterTiles.push({ x, y, edges, off: (tx * 3 + ty * 5) % 8 });
          }
          if (g === 'bridge') this.bridgeTiles.push({ x, y });
        }
      }
      // sombra da margem na grama ao redor da água
      ctx.fillStyle = 'rgba(43,90,70,0.35)';
      this.waterTiles.forEach((w) => {
        if (w.edges.n) ctx.fillRect(w.x, w.y - 1, 16, 1);
        if (w.edges.s) ctx.fillRect(w.x, w.y + 16, 16, 2);
        if (w.edges.w) ctx.fillRect(w.x - 1, w.y, 1, 16);
        if (w.edges.e) ctx.fillRect(w.x + 16, w.y, 1, 16);
      });
      this.groundCanvas = canvas;
    }

    /* ------------------------------------------------------
       Ciclo de vida da cena
       ------------------------------------------------------ */
    enter() {
      const UI = DMC.UI;
      DMC.Audio.playMusic('garden');
      UI.showHUD(true);
      this.updateHUD();
      if (!this.state.introDone) this.runIntro();
      else UI.toast('Fase 1 — A Primeira Chave');
    }

    exit() {
      this.dead = true;
      DMC.Dialogue.abort();
      DMC.UI.showHUD(false);
    }

    objective() {
      if (!this.state.introDone) return 'Leia a carta na caixa de correio';
      if (!this.state.keyCollected) return 'Encontre a chave escondida';
      return 'Abra o baú na clareira iluminada';
    }

    updateHUD() {
      DMC.UI.setHUD({
        pieces: DMC.Save.data.progress.pieces,
        sparks: this.state.sparks.length,
        sparksTotal: this.sparksTotal,
        key: this.state.keyCollected,
        objective: this.objective(),
      });
    }

    /** Estado salvo desta fase. */
    getState() {
      return Object.assign({}, this.state, { px: Math.round(this.player.x), py: Math.round(this.player.y), dir: this.player.dir });
    }

    persist() {
      if (this.dead || this.completed) return;
      DMC.Save.setLevelState(LEVEL_ID, this.getState());
      this.dirty = false;
    }

    /** Espera N segundos de jogo (respeita pausa). */
    wait(s) { return new Promise((r) => this.timers.push({ t: s, r })); }

    async say(lines) {
      this.busy = true;
      await DMC.Dialogue.show(lines);
      this.busy = false;
      DMC.Input.clear();
    }

    /* ------------------------------------------------------
       Sequências da história
       ------------------------------------------------------ */
    async runIntro() {
      this.busy = true;
      this.player.frozen = true;
      await this.wait(0.8);
      if (this.dead) return;
      await DMC.Dialogue.show([
        'Que noite bonita no jardim... as primeiras estrelas já estão aparecendo.',
        'Ei! A bandeirinha da caixa de correio está levantada. Chegou alguma coisa?',
      ]);
      if (this.dead) return;
      DMC.Audio.sfx('collect');
      this.particles.hearts(7 * T + 8, 4 * T + 4, 10);
      await this.wait(0.5);
      if (this.dead) return;
      await this.showIntroLetter('Começar a busca');
      if (this.dead) return;
      this.state.introDone = true;
      this.persist();
      this.updateHUD();
      await DMC.Dialogue.show([
        'Cinco partes de um coração mágico... e a primeira chave está escondida aqui no jardim!',
        'Talvez a placa perto do caminho tenha alguma pista.',
      ]);
      if (this.dead) return;
      this.player.frozen = false;
      this.busy = false;
      DMC.Input.clear();
    }

    showIntroLetter(btnText) {
      const cfg = DMC.Save.data.config;
      return DMC.UI.showLetter({
        to: fill('Para {to},', cfg),
        body: 'Meu coração foi trancado em cinco partes por um feitiço muito antigo, e só uma pessoa no mundo pode desbloqueá-lo: você.\n\nA primeira chave está escondida neste jardim. Procure com atenção...',
        from: fill('Com carinho, {from}', cfg),
        button: btnText,
      });
    }

    async readLetterAgain() {
      if (!this.state.introDone) return;
      this.busy = true;
      await this.showIntroLetter('Fechar');
      this.busy = false;
      DMC.Input.clear();
    }

    async searchBush(bush) {
      this.busy = true;
      bush.shake = 0.45;
      DMC.Audio.sfx('rustle');
      this.particles.leaves(bush.x, bush.y - 6, 8);
      await this.wait(0.45);
      if (this.dead) return;

      if (bush.id === 'key' && !this.state.keyFound) {
        this.state.keyFound = true;
        // chave salta do arbusto e voa até o jogador
        this.keyAnim = { t: 0, fromX: bush.x, fromY: bush.y - 8 };
        DMC.Audio.sfx('key');
        this.particles.sparkles(bush.x, bush.y - 8, 18, '#fff1b8', 50);
        await this.wait(1.1);
        if (this.dead) return;
        this.keyAnim = null;
        this.state.keyCollected = true;
        this.player.celebrate();
        this.particles.hearts(this.player.x, this.player.y - 14, 10);
        DMC.UI.toast('Chave dourada encontrada!');
        DMC.UI.popHUD('hud-key');
        this.updateHUD();
        this.persist();
        await DMC.Dialogue.show([
          'Uma chave dourada com um coraçãozinho gravado!',
          'Agora é encontrar o baú... talvez naquela clareira iluminada a sudeste.',
        ]);
      } else if (bush.id === 'key') {
        await DMC.Dialogue.show(['Aqui foi onde a chave estava escondida. As flores parecem felizes.']);
      } else if (this.state.searched.includes(bush.id)) {
        await DMC.Dialogue.show(['Você já procurou neste arbusto.']);
      } else {
        this.state.searched.push(bush.id);
        this.dirty = true;
        const extra = this.state.searched.length >= 4 && !this.state.keyFound ? ['Dica: a placa perto da casa fala de uma roda de flores...'] : [];
        await DMC.Dialogue.show([BUSH_TEXTS[bush.id % BUSH_TEXTS.length], ...extra]);
      }
      this.busy = false;
      DMC.Input.clear();
    }

    async useChest() {
      if (this.chest.open) {
        await this.say(['O baú está vazio... mas seu coração está um pouquinho mais cheio.']);
        return;
      }
      if (!this.state.keyCollected) {
        DMC.Audio.sfx('locked');
        await this.say([
          'Um baú com um cadeado em forma de coração.',
          'Está trancado. Preciso encontrar a chave.',
        ]);
        return;
      }
      // ---- Sequência de abertura do baú ----
      this.busy = true;
      this.player.frozen = true;
      this.player.dir = 'up';
      DMC.Audio.sfx('unlock');
      this.particles.sparkles(this.chest.x, this.chest.y, 12);
      await this.wait(0.5);
      if (this.dead) return;
      DMC.Audio.sfx('chest');
      for (let f = 1; f <= 3; f++) {
        this.chest.frame = f;
        await this.wait(0.22);
        if (this.dead) return;
      }
      this.chest.open = true;
      this.beamT = 2.6;
      this.heartRise = { t: 0 };
      await this.wait(1.0);
      if (this.dead) return;
      DMC.Audio.sfx('heart');
      await this.wait(1.4);
      if (this.dead) return;
      this.particles.hearts(this.chest.x, this.chest.y - 30, 26, 16);
      this.particles.sparkles(this.chest.x, this.chest.y - 30, 30, '#ffc2dc', 70);
      this.player.celebrate();
      this.flash = 0.6;
      await this.wait(0.9);
      if (this.dead) return;

      // ---- Mensagem romântica ----
      const cfg = DMC.Save.data.config;
      DMC.Audio.sfx('complete');
      await DMC.UI.showLetter({
        to: fill('{to},', cfg),
        body: DMC.Levels.message(LEVEL_ID, cfg),
        from: fill('— {from}', cfg),
        button: 'Guardar no coração',
        title: 'Primeira parte do coração',
      });
      if (this.dead) return;
      this.heartRise = null;
      this.completed = true;
      this.game.completeLevel(LEVEL_ID, { sparks: this.state.sparks.length, sparksTotal: this.sparksTotal });
    }

    /* ------------------------------------------------------
       Atualização
       ------------------------------------------------------ */
    isBlocked(b) {
      // limites do mapa e água
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
      const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
          if (this.ground[ty][tx] === 'water') return true;
        }
      }
      for (let i = 0; i < this.solids.length; i++) {
        const s = this.solids[i];
        if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) return true;
      }
      return false;
    }

    findTarget() {
      const fp = this.player.facingPoint(9);
      let best = null, bestD = 15;
      for (const it of this.interactables) {
        const d = Math.min(dist(fp.x, fp.y, it.x, it.y), dist(this.player.x, this.player.y - 3, it.x, it.y) + 3);
        if (d < bestD) { bestD = d; best = it; }
      }
      return best;
    }

    update(dt) {
      this.time += dt;
      // temporizadores das sequências
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); tm.r(); }
      }
      DMC.Dialogue.update(dt);
      const Input = DMC.Input;

      if (DMC.Dialogue.active) {
        if (Input.consumeAction()) DMC.Dialogue.advance();
        this.player.update(dt, { x: 0, y: 0 }, () => true, null);
      } else {
        const axis = this.busy ? { x: 0, y: 0 } : Input.axis();
        const ox = this.player.x, oy = this.player.y;
        this.player.update(dt, axis, (b) => this.isBlocked(b), this.particles);
        if (ox !== this.player.x || oy !== this.player.y) this.dirty = true;

        // alvo de interação
        this.target = this.busy ? null : this.findTarget();
        DMC.UI.setActionReady(!!this.target);
        if (Input.consumeAction() && this.target && !this.busy) this.target.onUse();
      }

      // coleta dos corações brilhantes
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        if (dist(s.x, s.y, this.player.x, this.player.y - 4) < 10) {
          this.sparks.splice(i, 1);
          this.state.sparks.push(s.id);
          DMC.Save.addSpark(LEVEL_ID, s.id);
          DMC.Audio.sfx('collect');
          this.particles.hearts(s.x, s.y - 4, 8);
          this.particles.sparkles(s.x, s.y - 4, 8, '#c6e0ff');
          DMC.UI.popHUD('hud-sparks');
          this.updateHUD();
          this.persist();
          if (this.state.sparks.length === this.sparksTotal) DMC.UI.toast('Todos os corações brilhantes!');
        }
      }

      // arbustos balançando
      (this.bushes || []).forEach((b) => { if (b.shake > 0) b.shake = Math.max(0, b.shake - dt); });

      // partículas ambientes
      if (Math.random() < dt * 1.2) {
        const c = this.cherryTops[Math.floor(Math.random() * this.cherryTops.length)];
        if (c && Math.abs(c.x - this.player.x) < 260 && Math.abs(c.y - this.player.y) < 200) this.particles.petal(c.x + rand(-10, 10), c.y + rand(-6, 6));
      }
      if (Math.random() < dt * 0.8) {
        this.particles.firefly(this.cam.x + rand(0, this.game.viewW), this.cam.y + rand(0, this.game.viewH));
      }
      if (this.beamT > 0) {
        this.beamT -= dt;
        for (let i = 0; i < 3; i++) this.particles.beam(this.chest.x, this.chest.y);
      }
      if (this.heartRise) this.heartRise.t += dt;
      if (this.keyAnim) this.keyAnim.t += dt;
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      this.particles.update(dt);

      // câmera suave
      this.updateCamera(dt);

      // salvamento automático periódico
      this.saveT += dt;
      if (this.saveT > 2.5) {
        this.saveT = 0;
        if (this.dirty) this.persist();
      }
    }

    camTarget() {
      const vw = this.game.viewW, vh = this.game.viewH;
      const mw = MW * T, mh = MH * T;
      let tx = this.player.x - vw / 2, ty = this.player.y - 8 - vh / 2;
      tx = mw <= vw ? (mw - vw) / 2 : clamp(tx, 0, mw - vw);
      ty = mh <= vh ? (mh - vh) / 2 : clamp(ty, 0, mh - vh);
      return { x: tx, y: ty };
    }
    snapCamera() { const t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; }
    updateCamera(dt) {
      const t = this.camTarget();
      const k = 1 - Math.pow(0.0025, dt);
      this.cam.x = lerp(this.cam.x, t.x, k);
      this.cam.y = lerp(this.cam.y, t.y, k);
    }
    onResize() { this.snapCamera(); this.lightCanvas = null; }

    /* ------------------------------------------------------
       Renderização
       ------------------------------------------------------ */
    render(ctx) {
      const S = DMC.Sprites;
      const vw = this.game.viewW, vh = this.game.viewH;
      const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      const visible = (x, y, w, h) => x + w > cx && x < cx + vw && y + h > cy && y < cy + vh;

      ctx.fillStyle = '#25523f';
      ctx.fillRect(0, 0, vw, vh);

      // 1) chão estático
      ctx.drawImage(this.groundCanvas, cx, cy, vw, vh, 0, 0, vw, vh);

      // 2) água animada
      const wf = Math.floor(this.time * 3);
      for (const w of this.waterTiles) {
        if (!visible(w.x, w.y, 16, 16)) continue;
        const x = w.x - cx, y = w.y - cy;
        ctx.drawImage(S.water[(wf + w.off) % 8], x, y);
        ctx.fillStyle = S.C.foam;
        const foamShift = Math.floor(this.time * 2 + w.off) % 2;
        if (w.edges.n) { ctx.fillRect(x, y, 16, 1); ctx.fillStyle = S.C.waterL; ctx.fillRect(x + foamShift, y + 1, 15, 1); ctx.fillStyle = S.C.foam; }
        if (w.edges.s) ctx.fillRect(x, y + 15, 16, 1);
        if (w.edges.w) ctx.fillRect(x, y, 1, 16);
        if (w.edges.e) ctx.fillRect(x + 15, y, 1, 16);
      }
      for (const b of this.bridgeTiles) if (visible(b.x, b.y, 16, 16)) ctx.drawImage(S.bridge, b.x - cx, b.y - cy);

      // 3) flores e grama alta balançando
      for (const f of this.flowers) {
        if (!visible(f.x - 2, f.y - 4, 5, 6)) continue;
        const sway = Math.round(Math.sin(this.time * 2 + f.x * 0.25) * 0.7);
        const x = f.x - cx, y = f.y - cy;
        const [c1, c2] = S.FLOWER_COLORS[f.c];
        ctx.fillStyle = S.C.grassD;
        ctx.fillRect(x, y - 1, 1, 2);
        ctx.fillStyle = c1;
        ctx.fillRect(x - 1 + sway, y - 3, 3, 1);
        ctx.fillRect(x + sway, y - 4, 1, 3);
        ctx.fillStyle = c2;
        ctx.fillRect(x + sway, y - 3, 1, 1);
      }
      ctx.fillStyle = S.C.grassD;
      for (const g of this.tallGrass) {
        if (!visible(g.x - 2, g.y - 6, 5, 7)) continue;
        const sway = Math.sin(this.time * 2.2 + g.x * 0.3) > 0.3 ? 1 : 0;
        const x = g.x - cx, y = g.y - cy;
        ctx.fillStyle = S.C.grassD;
        ctx.fillRect(x - 1, y - g.h + 1, 1, g.h - 1);
        ctx.fillRect(x + 1, y - g.h + 2, 1, g.h - 2);
        ctx.fillStyle = S.C.leaf;
        ctx.fillRect(x, y - g.h, 1, g.h);
        ctx.fillRect(x + sway, y - g.h - 1, 1, 1);
      }

      // 4) corações brilhantes (flutuam)
      const drawables = [];
      for (const s of this.sparks) {
        if (!visible(s.x - 8, s.y - 16, 16, 20)) continue;
        drawables.push({
          sortY: s.y, draw: () => {
            const fy = Math.round(Math.sin(this.time * 3 + s.phase) * 2);
            ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.time * 5 + s.phase);
            ctx.drawImage(S.glowPink, s.x - 10 - cx, s.y - 18 + fy - cy, 20, 20);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(43,27,61,0.25)';
            ctx.fillRect(s.x - 3 - cx, s.y - cy, 6, 1);
            ctx.drawImage(S.heart, s.x - 3 - cx, s.y - 11 + fy - cy);
            if (Math.sin(this.time * 4 + s.phase) > 0.85) { ctx.fillStyle = '#fff'; ctx.fillRect(s.x + 3 - cx, s.y - 12 + fy - cy, 1, 1); }
          },
        });
      }

      // 5) objetos + jogador ordenados por profundidade (Y)
      for (const o of this.objects) {
        const b = o.bounds;
        if (b && !visible(b[0], b[1], b[2], b[3])) continue;
        drawables.push(o);
      }
      drawables.push({ sortY: this.player.y, draw: () => this.player.render(ctx, cx, cy) });
      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw(ctx, cx, cy);

      // silhueta do jogador quando está escondido atrás de uma árvore/casa
      const px = this.player.x - 6, py = this.player.y - 16;
      const hidden = drawables.some((o) => o.bounds && o.sortY > this.player.y &&
        px < o.bounds[0] + o.bounds[2] && px + 12 > o.bounds[0] && py < o.bounds[1] + o.bounds[3] - 12 && py + 16 > o.bounds[1]);
      if (hidden) {
        ctx.globalAlpha = 0.4;
        this.player.render(ctx, cx, cy);
        ctx.globalAlpha = 1;
      }

      // chave voando (por cima de tudo)
      if (this.keyAnim) {
        const k = this.keyAnim;
        const t = Math.min(1, k.t / 1.0);
        const x = lerp(k.fromX, this.player.x, t);
        const y = lerp(k.fromY, this.player.y - 26, t) - Math.sin(t * Math.PI) * 24;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(S.glow, x - 12 - cx, y - 12 - cy, 24, 24);
        ctx.globalAlpha = 1;
        ctx.drawImage(Math.floor(this.time * 10) % 2 ? S.key : S.keyGlow, Math.round(x - 5 - cx), Math.round(y - 3 - cy));
      }

      // feixe de luz e coração subindo do baú
      if (this.chest.open && (this.beamT > 0 || this.heartRise)) {
        const a = clamp(this.beamT / 2.6, 0, 1);
        const bx = this.chest.x - cx, by = this.chest.y - cy;
        ctx.globalAlpha = 0.25 + 0.35 * a;
        const grd = ctx.createLinearGradient(0, by - 60, 0, by);
        grd.addColorStop(0, 'rgba(255,241,184,0)');
        grd.addColorStop(1, 'rgba(255,241,184,0.9)');
        ctx.fillStyle = grd;
        ctx.fillRect(bx - 6, by - 60, 12, 60);
        ctx.globalAlpha = 1;
      }
      if (this.heartRise) {
        const t = clamp(this.heartRise.t / 1.6, 0, 1);
        const hx = this.chest.x - cx, hy = this.chest.y - 6 - DMC.util.easeInOut(t) * 26 - cy;
        const pulse = 1 + Math.sin(this.time * 8) * 0.06 * t;
        ctx.globalAlpha = 0.6;
        ctx.drawImage(S.glowPink, hx - 22, hy - 22, 44, 44);
        ctx.globalAlpha = 1;
        const w = Math.round(13 * pulse), h = Math.round(12 * pulse);
        ctx.drawImage(Math.floor(this.time * 6) % 3 === 0 ? S.heartBigWhite : S.heartBig, Math.round(hx - w / 2), Math.round(hy - h / 2), w, h);
      }

      // 6) iluminação de entardecer
      this.renderLighting(ctx, cx, cy, vw, vh);

      // 7) partículas por cima da luz (brilham no escuro)
      this.particles.render(ctx, cx, cy);

      // 8) balão "!" sobre o alvo de interação
      if (this.target && !DMC.Dialogue.active) {
        const bob = Math.round(Math.sin(this.time * 6) * 1.5);
        ctx.drawImage(S.bubble, Math.round(this.target.x - 3 - cx), Math.round(this.target.top - 11 + bob - cy));
      }

      if (this.flash > 0) {
        ctx.fillStyle = `rgba(255,240,250,${this.flash})`;
        ctx.fillRect(0, 0, vw, vh);
      }
    }

    renderLighting(ctx, cx, cy, vw, vh) {
      const S = DMC.Sprites;
      if (!this.lightCanvas || this.lightCanvas.width !== vw || this.lightCanvas.height !== vh) {
        this.lightCanvas = DMC.util.makeCanvas(vw, vh).canvas;
        this.lightCtx = this.lightCanvas.getContext('2d');
        // vinheta pré-renderizada
        const v = DMC.util.makeCanvas(vw, vh);
        const g = v.ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
        g.addColorStop(0, 'rgba(27,18,51,0)');
        g.addColorStop(1, 'rgba(27,18,51,0.55)');
        v.ctx.fillStyle = g;
        v.ctx.fillRect(0, 0, vw, vh);
        this.vignette = v.canvas;
      }
      const L = this.lightCtx;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, vw, vh);
      L.fillStyle = 'rgba(52,28,104,0.42)';
      L.fillRect(0, 0, vw, vh);
      // "fura" a escuridão onde há luz
      L.globalCompositeOperation = 'destination-out';
      const drawLight = (x, y, r, a) => {
        if (x + r < 0 || y + r < 0 || x - r > vw || y - r > vh) return;
        L.globalAlpha = a;
        L.drawImage(S.glow, x - r, y - r, r * 2, r * 2);
      };
      drawLight(this.player.x - cx, this.player.y - 8 - cy, 44, 0.8);
      for (const l of this.lights) {
        if (l.chest && !this.state.keyCollected && !this.chest.open) continue;
        const fl = l.flicker != null ? 1 + Math.sin(this.time * 7 + l.flicker) * 0.04 : 1;
        drawLight(l.x - cx, l.y - cy, l.r * fl * (l.chest && this.chest.open ? 2 : 1), 1);
      }
      for (const s of this.sparks) drawLight(s.x - cx, s.y - 8 - cy, 16, 0.7);
      if (this.heartRise) drawLight(this.chest.x - cx, this.chest.y - 30 - cy, 70, 1);
      L.globalAlpha = 1;
      ctx.drawImage(this.lightCanvas, 0, 0);

      // brilho aditivo quente nas lâmpadas
      ctx.globalCompositeOperation = 'lighter';
      for (const l of this.lights) {
        if (l.chest) continue;
        const x = l.x - cx, y = l.y - cy;
        if (x < -40 || y < -40 || x > vw + 40 || y > vh + 40) continue;
        ctx.globalAlpha = 0.22 + Math.sin(this.time * 5 + (l.flicker || 0)) * 0.03;
        ctx.drawImage(S.glow, x - 20, y - 20, 40, 40);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.vignette, 0, 0);
    }
  }

  DMC.Levels.register(LEVEL_ID, (game, saved) => new Level1(game, saved));
})();
