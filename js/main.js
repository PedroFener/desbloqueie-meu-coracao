/* =========================================================
   main.js — laço principal, gerenciador de cenas, resolução
   adaptável e fluxo do jogo (menu → fases → conclusão)
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const { rand, makeCanvas, seeded } = DMC.util;

  /* =========================================================
     CENA DO MENU — céu noturno, colinas em parallax, o casal
     no alto da colina, corações e vaga-lumes subindo
     ========================================================= */
  class MenuScene {
    constructor(game) {
      this.game = game;
      this.time = 0;
      this.particles = new DMC.Particles();
      this.stars = [];
      const r = seeded(7);
      for (let i = 0; i < 90; i++) this.stars.push({ x: r(), y: r() * 0.6, p: r() * 6, b: r() < 0.15 });
      this.build();
    }

    build() {
      const vw = this.game.viewW, vh = this.game.viewH;
      // céu em degraus (aspecto pixelado)
      const sky = makeCanvas(1, vh);
      const bands = ['#1b1233', '#22163f', '#2a1b4a', '#35205a', '#45276a', '#5a2f78', '#783a86', '#9a4a90', '#bf6a9e', '#e08fb0'];
      for (let y = 0; y < vh; y++) {
        const i = Math.min(bands.length - 1, Math.floor((y / (vh * 0.78)) * bands.length));
        sky.ctx.fillStyle = bands[i];
        sky.ctx.fillRect(0, y, 1, 1);
      }
      this.sky = sky.canvas;
      // colinas (3 camadas) — perfis gerados por soma de senos
      const layer = (color, base, amp, freq, seed) => {
        const w = vw + 200;
        const c = makeCanvas(w, vh);
        const r = seeded(seed);
        const ph = [r() * 6, r() * 6, r() * 6];
        c.ctx.fillStyle = color;
        for (let x = 0; x < w; x++) {
          const h = Math.sin(x * freq + ph[0]) * amp + Math.sin(x * freq * 2.3 + ph[1]) * amp * 0.4 + Math.sin(x * freq * 5.1 + ph[2]) * amp * 0.12;
          const top = Math.round(vh * base - h);
          c.ctx.fillRect(x, top, 1, vh - top);
        }
        return c.canvas;
      };
      this.hills = [
        { img: layer('#4a2f7a', 0.68, 14, 0.012, 1), speed: 3 },
        { img: layer('#3a2463', 0.78, 10, 0.02, 2), speed: 7 },
        { img: layer('#2a1a4c', 0.88, 6, 0.03, 3), speed: 12 },
      ];
    }

    enter() { DMC.Audio.playMusic('menu'); }
    exit() {}
    onResize() { this.build(); }

    update(dt) {
      this.time += dt;
      const vw = this.game.viewW, vh = this.game.viewH;
      if (Math.random() < dt * 2.5) {
        this.particles.spawn({
          kind: 'heart', x: rand(0, vw), y: vh + 4, vx: rand(-4, 4), vy: rand(-22, -12), life: rand(5, 9),
          color: Math.random() < 0.6 ? '#ff9ccb' : '#ffc2dc', size: Math.random() < 0.25 ? 2 : 1,
        });
      }
      if (Math.random() < dt * 1.5) this.particles.firefly(rand(0, vw), rand(vh * 0.5, vh));
      if (Math.random() < dt * 2) this.particles.petal(rand(-40, vw * 0.8), -4);
      this.particles.update(dt);
    }

    render(ctx) {
      const vw = this.game.viewW, vh = this.game.viewH;
      const S = DMC.Sprites;
      ctx.drawImage(this.sky, 0, 0, vw, vh);
      // estrelas cintilando
      for (const s of this.stars) {
        const tw = Math.sin(this.time * 2 + s.p);
        if (tw < -0.6) continue;
        const x = Math.round(s.x * vw), y = Math.round(s.y * vh);
        ctx.fillStyle = tw > 0.7 ? '#ffffff' : '#c6e0ff';
        ctx.fillRect(x, y, 1, 1);
        if (s.b && tw > 0.5) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
      // lua
      const mx = Math.round(vw * 0.8), my = Math.round(vh * 0.16);
      ctx.globalAlpha = 0.35;
      ctx.drawImage(S.glow, mx - 34, my - 34, 68, 68);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff4e8';
      for (let y = -8; y <= 8; y++) {
        const w = Math.round(Math.sqrt(64 - y * y));
        ctx.fillRect(mx - w, my + y, w * 2, 1);
      }
      ctx.fillStyle = '#ead6c4';
      ctx.fillRect(mx - 3, my - 2, 2, 2); ctx.fillRect(mx + 2, my + 3, 3, 2); ctx.fillRect(mx + 1, my - 5, 1, 1);
      // colinas em parallax
      for (const h of this.hills) {
        const off = Math.floor((this.time * h.speed) % 200);
        ctx.drawImage(h.img, -off, 0);
      }
      // casal no topo da colina da frente
      // o casal fica sob a lua, fora da área dos botões
      const cx = Math.round(vw * 0.8), gy = Math.round(vh * 0.86);
      ctx.fillStyle = '#24173f';
      for (let y = 0; y < vh - gy; y++) {
        const w = Math.round(Math.min(44, 18 + Math.sqrt(y) * 9));
        ctx.fillRect(cx - w, gy + y, w * 2, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(cx - 14, gy, 28, 2);
      const blink = Math.floor(this.time * 2) % 2;
      ctx.drawImage(S.player.right[0], cx - 13, gy - 16);
      ctx.drawImage(this._partnerLeft(), cx + 1, gy - 16);
      const hy = gy - 26 + Math.round(Math.sin(this.time * 2) * 2);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(S.glowPink, cx - 12, hy - 10, 24, 24);
      ctx.globalAlpha = 1;
      ctx.drawImage(blink ? S.heart : S.heartWhite, cx - 3, hy);
      this.particles.render(ctx, 0, 0);
    }

    _partnerLeft() {
      if (!this.partnerLeft) {
        // versão lateral da parceira olhando para a esquerda (recolore o sprite lateral)
        const side = DMC.Sprites.player.left[0];
        const { canvas, ctx } = makeCanvas(side.width, side.height, true);
        ctx.drawImage(side, 0, 0);
        const img = ctx.getImageData(0, 0, side.width, side.height);
        const map = { '6b3f8f': [61, 90, 168], 'a473cf': [111, 143, 224], 'ff7eb6': [127, 180, 255], 'd9478a': [79, 127, 208], '6a7ee8': [169, 139, 219], '4656b8': [123, 98, 176] };
        for (let i = 0; i < img.data.length; i += 4) {
          const hex = ((1 << 24) + (img.data[i] << 16) + (img.data[i + 1] << 8) + img.data[i + 2]).toString(16).slice(1);
          const m = map[hex];
          if (m) { img.data[i] = m[0]; img.data[i + 1] = m[1]; img.data[i + 2] = m[2]; }
        }
        ctx.putImageData(img, 0, 0);
        this.partnerLeft = canvas;
      }
      return this.partnerLeft;
    }
  }

  /* =========================================================
     JOGO
     ========================================================= */
  const Game = {
    canvas: null,
    ctx: null,
    viewW: 320,
    viewH: 180,
    scale: 1,
    scene: null,
    menu: null,
    paused: false,
    levelId: null,
    last: 0,
    fps: 60,

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });

      DMC.Save.load();
      DMC.Sprites.build();
      const st = DMC.Save.data.settings;
      DMC.Audio.setMusic(st.music);
      DMC.Audio.setSfx(st.sfx);
      DMC.Input.init();
      DMC.Dialogue.init();
      DMC.UI.init(this);

      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

      // Salva e pausa quando o app vai para segundo plano
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.persistLevel();
          DMC.Audio.suspend();
          if (this.inLevel() && !this.paused && DMC.UI.current === null) this.pause(true);
        } else {
          DMC.Audio.resume();
        }
      });
      window.addEventListener('pagehide', () => this.persistLevel());

      // Toque/clique direto no canvas (quebra-cabeça e estrelas)
      const toV = (e) => [e.clientX / this.scale, e.clientY / this.scale];
      const send = (type) => (e) => {
        const s = this.scene;
        if (!s || !s.onPointer || this.paused) return;
        if (type === 'down') {
          DMC.Audio.unlock();
          try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignorado */ }
        }
        e.preventDefault();
        s.onPointer(type, ...toV(e), e.pointerId);
      };
      this.canvas.addEventListener('pointerdown', send('down'));
      this.canvas.addEventListener('pointermove', send('move'));
      this.canvas.addEventListener('pointerup', send('up'));
      this.canvas.addEventListener('pointercancel', send('cancel'));

      this.menu = new MenuScene(this);
      this.setScene(this.menu);

      // Tela "toque para começar": necessária para liberar o áudio
      const tts = document.getElementById('tap-to-start');
      tts.classList.remove('hidden');
      const start = () => {
        tts.removeEventListener('click', start);
        window.removeEventListener('keydown', start);
        DMC.Audio.unlock();
        DMC.Audio.sfx('click');
        // volta à tela cheia se a pessoa deixou essa opção ligada (precisa de um toque)
        if (DMC.Save.data.settings.fullscreen && DMC.UI.fullscreenSupported()) DMC.UI.enterFullscreen();
        tts.classList.add('hidden');
        DMC.UI.show('menu');
      };
      // 'click' (e não 'pointerdown') evita que o mesmo toque acione um botão do menu por baixo
      tts.addEventListener('click', start);
      window.addEventListener('keydown', start);

      // PWA / offline (somente quando servido por http/https)
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }

      requestAnimationFrame((t) => this.loop(t));
    },

    /** Resolução virtual adaptável: ~200px no menor lado, escala inteira. */
    resize() {
      const W = window.innerWidth, H = window.innerHeight;
      const s = Math.max(1, Math.round(Math.min(W, H) / 200));
      this.scale = s;
      this.viewW = Math.ceil(W / s);
      this.viewH = Math.ceil(H / s);
      this.canvas.width = this.viewW;
      this.canvas.height = this.viewH;
      this.canvas.style.width = this.viewW * s + 'px';
      this.canvas.style.height = this.viewH * s + 'px';
      this.ctx.imageSmoothingEnabled = false;
      if (this.scene && this.scene.onResize) this.scene.onResize();
      if (this.menu && this.menu !== this.scene) this.menu.onResize();
    },

    setScene(scene) {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.scene = scene;
      if (scene.enter) scene.enter();
    },

    inLevel() { return this.scene && this.scene !== this.menu; },

    loop(ts) {
      const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
      this.last = ts;

      // tecla de pausa (Esc / P)
      if (DMC.Input.consumePause() && this.inLevel() && DMC.UI.current !== 'final') {
        if (this.paused) this.resume();
        else if (DMC.UI.current === null) this.pause();
      }

      if (!this.paused && this.scene) this.scene.update(dt);
      if (this.scene) this.scene.render(this.ctx);
      requestAnimationFrame((t) => this.loop(t));
    },

    persistLevel() {
      if (this.inLevel() && this.scene.persist) this.scene.persist();
    },

    /* ---------------- Fluxo ---------------- */
    async newGame() {
      if (DMC.Save.hasProgress()) {
        const ok = await DMC.UI.confirm('Nova partida?', 'Seu progresso atual será substituído. A personalização continua salva.');
        if (!ok) { DMC.UI.show('menu'); return; }
      }
      DMC.Save.newGame();
      DMC.UI.openCustomize(() => this.startLevel(1, { fresh: true }));
    },

    continueGame() {
      const d = DMC.Save.data;
      if (!d.current && d.progress.finished) { DMC.UI.show('levels'); return; } // jogo concluído: escolha uma fase
      const id = (d.current && d.current.level) || d.progress.unlocked;
      if (DMC.Levels.isImplemented(id)) this.startLevel(id);
      else {
        DMC.UI.show('levels');
        DMC.UI.toast('A próxima fase chega em breve!');
      }
    },

    startLevel(id, opts = {}) {
      if (!DMC.Save.data.config.configured) {
        DMC.UI.openCustomize(() => this.startLevel(id, opts));
        return;
      }
      if (!DMC.Levels.isImplemented(id)) { DMC.UI.toast('Fase em desenvolvimento'); return; }
      const done = DMC.Save.data.progress.completed.includes(id);
      const saved = opts.fresh || (opts.fromSelect && done) ? null : DMC.Save.getLevelState(id);
      DMC.Input.enabled = false;
      DMC.UI.fade(() => {
        DMC.UI.hideScreens();
        this.paused = false;
        this.levelId = id;
        if (opts.fresh) DMC.Save.clearLevelState(id);
        const scene = DMC.Levels.create(id, this, saved);
        this.setScene(scene);
        DMC.Save.data.current = { level: id };
        DMC.Save.write();
        DMC.Input.clear();
        DMC.Input.enabled = true;
      });
    },

    completeLevel(id, stats) {
      DMC.Save.completeLevel(id, DMC.Levels.total);
      if (stats && stats.final) { DMC.UI.setActionReady(false); return; } // a Fase 5 cuida do próprio final
      DMC.Input.enabled = false;
      DMC.UI.setActionReady(false);
      setTimeout(() => {
        DMC.Audio.sfx('complete');
        DMC.UI.showComplete(id, stats);
      }, 300);
    },

    pause(silent) {
      if (!this.inLevel() || this.paused) return;
      if (DMC.UI.current !== null) return; // carta, conclusão ou final abertos: não pausa por cima
      this.paused = true;
      this.persistLevel();
      if (!silent) DMC.Audio.sfx('pause');
      DMC.UI.show('pause');
    },

    resume() {
      this.paused = false;
      DMC.UI.show(null);
      DMC.Input.clear();
    },

    async restartLevel() {
      const ok = await DMC.UI.confirm('Reiniciar fase?', 'O progresso desta fase será perdido.');
      if (!ok) { DMC.UI.show('pause'); return; }
      this.startLevel(this.levelId, { fresh: true });
    },

    replayLevel() { this.startLevel(this.levelId, { fresh: true }); },

    nextLevel() { this.startLevel(this.levelId + 1, { fresh: true }); },

    /** Depois da declaração final: créditos ou menu. */
    finishGame(choice) {
      DMC.UI.fade(() => {
        DMC.UI.hideScreens();
        this.paused = false;
        this.setScene(this.menu);
        DMC.Input.enabled = true;
        DMC.UI.show(choice === 'credits' ? 'credits' : 'menu');
      });
    },

    quitToMenu() {
      this.persistLevel();
      DMC.UI.fade(() => {
        DMC.UI.hideScreens();
        this.paused = false;
        this.setScene(this.menu);
        DMC.Input.enabled = true;
        DMC.UI.show('menu');
      });
    },
  };

  DMC.Game = Game;
  window.addEventListener('DOMContentLoaded', () => Game.init());
})();
