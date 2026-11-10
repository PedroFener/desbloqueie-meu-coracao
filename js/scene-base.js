/* =========================================================
   scene-base.js — base comum das fases 2 a 5
   (temporizadores que respeitam a pausa, diálogos, HUD,
   salvamento automático e a revelação da mensagem)
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;

  class SceneBase {
    /**
     * @param {object} game      DMC.Game
     * @param {number} id        número da fase
     * @param {object} saved     estado salvo (ou null)
     * @param {object} defaults  estado inicial padrão
     */
    constructor(game, id, saved, defaults) {
      this.game = game;
      this.id = id;
      this.time = 0;
      this.timers = [];
      this.dead = false;
      this.busy = false;
      this.completed = false;
      this.usesJoystick = false;   // fases de quebra-cabeça usam toque direto na tela
      this.particles = new DMC.Particles();
      this.state = Object.assign({}, defaults || {}, saved || {});
      this.saveT = 0;
      this.dirty = false;
    }

    /** Espera N segundos de jogo (congela durante a pausa). */
    wait(s) { return new Promise((r) => this.timers.push({ t: s, r })); }

    /** Atualizações comuns: tempo, timers, diálogo, partículas, auto-save. */
    updateBase(dt) {
      this.time += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); tm.r(); }
      }
      DMC.Dialogue.update(dt);
      this.particles.update(dt);
      this.saveT += dt;
      if (this.saveT > 2.5) {
        this.saveT = 0;
        if (this.dirty) this.persist();
      }
    }

    /** Se há diálogo aberto, o botão de ação avança o texto. Retorna true se o diálogo está ativo. */
    handleDialogue() {
      if (!DMC.Dialogue.active) return false;
      if (DMC.Input.consumeAction()) DMC.Dialogue.advance();
      return true;
    }

    async say(lines) {
      this.busy = true;
      await DMC.Dialogue.show(lines);
      this.busy = false;
      DMC.Input.clear();
    }

    getState() { return Object.assign({}, this.state); }

    persist() {
      if (this.dead || this.completed) return;
      DMC.Save.setLevelState(this.id, this.getState());
      this.dirty = false;
    }

    enterBase(music, title) {
      DMC.Audio.playMusic(music);
      DMC.UI.showHUD(true);
      if (title) DMC.UI.toast(title);
    }

    exit() {
      this.dead = true;
      DMC.Dialogue.abort();
      DMC.UI.showHUD(false);
    }

    hud(objective, sparks, sparksTotal, key) {
      DMC.UI.setHUD({
        pieces: DMC.Save.data.progress.pieces,
        sparks: sparks || 0,
        sparksTotal: sparksTotal || 0,
        key: !!key,
        objective,
      });
    }

    /** Revela a mensagem romântica desta parte do coração e conclui a fase. */
    async reward(stats) {
      const cfg = DMC.Save.data.config;
      DMC.Audio.sfx('complete');
      await DMC.UI.showLetter({
        to: DMC.util.fill('{to},', cfg),
        body: DMC.Levels.message(this.id, cfg),
        from: DMC.util.fill('— {from}', cfg),
        button: 'Guardar no coração',
      });
      if (this.dead) return;
      this.completed = true;
      this.game.completeLevel(this.id, stats);
    }

    /** Desenha uma parte do coração brilhando (usado nas recompensas). */
    drawHeartPiece(ctx, x, y, k = 1) {
      const S = DMC.Sprites;
      const pulse = 1 + Math.sin(this.time * 8) * 0.06;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(S.glowPink, x - 24 * k, y - 24 * k, 48 * k, 48 * k);
      ctx.globalAlpha = 1;
      const w = Math.round(13 * k * pulse), h = Math.round(12 * k * pulse);
      ctx.drawImage(Math.floor(this.time * 6) % 3 === 0 ? S.heartBigWhite : S.heartBig, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    }

    /** Fundo noturno com faixas de cor (pré-renderizado e reaproveitado). */
    makeSkyBands(vw, vh, bands, horizon = 0.85) {
      const sky = DMC.util.makeCanvas(1, vh);
      for (let y = 0; y < vh; y++) {
        const i = Math.min(bands.length - 1, Math.floor((y / (vh * horizon)) * bands.length));
        sky.ctx.fillStyle = bands[i];
        sky.ctx.fillRect(0, y, 1, 1);
      }
      return sky.canvas;
    }

    /** Vinheta suave nas bordas. */
    makeVignette(vw, vh, strength = 0.55) {
      const v = DMC.util.makeCanvas(vw, vh);
      const g = v.ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, 'rgba(27,18,51,0)');
      g.addColorStop(1, `rgba(27,18,51,${strength})`);
      v.ctx.fillStyle = g;
      v.ctx.fillRect(0, 0, vw, vh);
      return v.canvas;
    }

    static formatTime(s) {
      const m = Math.floor(s / 60), r = Math.floor(s % 60);
      return `${m}:${r < 10 ? '0' : ''}${r}`;
    }
  }

  DMC.SceneBase = SceneBase;
})();
