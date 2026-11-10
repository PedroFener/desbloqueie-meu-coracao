/* =========================================================
   ui.js — menus, telas, HUD, carta, avisos e transições
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['menu', 'customize', 'levels', 'settings', 'credits', 'pause', 'letter', 'complete', 'confirm', 'final'];

  const UI = {
    game: null,
    current: null,
    _afterCustomize: null,
    _toastTimer: null,

    init(game) {
      this.game = game;

      // ---------- Botões com data-action ----------
      document.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          DMC.Audio.unlock();
          DMC.Audio.sfx('click');
          this.handleAction(btn.dataset.action);
        });
      });
      document.querySelectorAll('[data-back]').forEach((btn) => {
        btn.addEventListener('click', () => { DMC.Audio.sfx('click'); this.show(btn.dataset.back); });
      });
      document.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => { DMC.Audio.unlock(); this.toggle(btn.dataset.toggle); DMC.Audio.sfx('click'); });
      });

      // ---------- Personalização ----------
      $('form-customize').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCustomize();
      });
      $('btn-customize-back').addEventListener('click', () => {
        DMC.Audio.sfx('click');
        this._afterCustomize = null;
        this.show('menu');
      });

      // ---------- Pausa ----------
      $('btn-pause').addEventListener('click', (e) => {
        e.stopPropagation();
        DMC.Audio.unlock();
        this.game.pause();
      });

      // ---------- Apagar progresso ----------
      $('btn-reset-save').addEventListener('click', async () => {
        DMC.Audio.sfx('click');
        const ok = await this.confirm('Apagar progresso?', 'Isso apaga fases concluídas, corações coletados e a personalização. Não dá para desfazer.');
        if (ok) {
          DMC.Save.reset();
          this.toast('Progresso apagado');
        }
        this.show('settings');
      });

      // ---------- Tela cheia ----------
      $('btn-fs-menu').addEventListener('click', () => { DMC.Audio.unlock(); DMC.Audio.sfx('click'); this.toggle('fullscreen'); });
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => {
        // se a pessoa sair pelo botão do sistema, a opção acompanha
        if (!this.isFullscreen() && DMC.Save.data.settings.fullscreen) DMC.Save.setSetting('fullscreen', false);
        this.refreshToggles();
        setTimeout(() => this.game.resize(), 100);
      }));
      if (!this.fullscreenSupported()) {
        document.querySelectorAll('[data-toggle="fullscreen"], #btn-fs-menu').forEach((b) => b.classList.add('hidden'));
      }

      DMC.events.on('touch-detected', () => this.updateTouchMode());
      this.updateTouchMode();
      this.refreshToggles();
    },

    /* ---------- Navegação entre telas ---------- */
    show(name) {
      SCREENS.forEach((s) => $('screen-' + s).classList.add('hidden'));
      this.current = name;
      if (!name) return;
      const el = $('screen-' + name);
      el.classList.remove('hidden');
      if (name === 'menu') this.refreshMenu();
      if (name === 'levels') this.renderLevelGrid();
      if (name === 'settings' || name === 'pause') this.refreshToggles();
      if (name === 'credits') this.refreshCredits();
      // foco no primeiro botão (teclado/acessibilidade)
      const first = el.querySelector('button:not([disabled]), input');
      if (first && !DMC.util.isTouchDevice()) setTimeout(() => first.focus({ preventScroll: true }), 30);
    },

    hideScreens() { this.show(null); },

    handleAction(action) {
      const g = this.game;
      switch (action) {
        case 'new': g.newGame(); break;
        case 'continue': g.continueGame(); break;
        case 'levels': this.show('levels'); break;
        case 'customize': this.openCustomize(null); break;
        case 'settings': this.show('settings'); break;
        case 'credits': this.show('credits'); break;
        case 'resume': g.resume(); break;
        case 'restart': g.restartLevel(); break;
        case 'quit': g.quitToMenu(); break;
        case 'next': g.nextLevel(); break;
        case 'replay': g.replayLevel(); break;
        default: console.warn('Ação desconhecida', action);
      }
    },

    refreshMenu() {
      $('btn-continue').disabled = !DMC.Save.hasProgress();
    },

    /* ---------- Personalização ---------- */
    openCustomize(after) {
      this._afterCustomize = after;
      const c = DMC.Save.data.config;
      $('cfg-to').value = c.to || '';
      $('cfg-from').value = c.from || '';
      $('cfg-message').value = c.message || '';
      document.querySelectorAll('input[name="cfg-type"]').forEach((r) => { r.checked = r.value === (c.type || 'namoro'); });
      $('btn-customize-save').textContent = after ? 'Começar aventura' : 'Salvar';
      this.show('customize');
    },

    saveCustomize() {
      const to = $('cfg-to').value.trim();
      const from = $('cfg-from').value.trim();
      if (!to || !from) {
        this.toast('Preencha os dois nomes ♥');
        (!to ? $('cfg-to') : $('cfg-from')).focus();
        return;
      }
      const typeEl = document.querySelector('input[name="cfg-type"]:checked');
      DMC.Save.setConfig({
        to, from,
        type: typeEl ? typeEl.value : 'namoro',
        message: $('cfg-message').value.trim(),
      });
      DMC.Audio.sfx('collect');
      const after = this._afterCustomize;
      this._afterCustomize = null;
      if (after) after();
      else { this.toast('Personalização salva!'); this.show('menu'); }
    },

    /* ---------- Seleção de fases ---------- */
    renderLevelGrid() {
      const grid = $('level-grid');
      grid.innerHTML = '';
      const p = DMC.Save.data.progress;
      DMC.Levels.list.forEach((lv) => {
        const unlocked = lv.id <= p.unlocked;
        const implemented = DMC.Levels.isImplemented(lv.id);
        const done = p.completed.includes(lv.id);
        const btn = document.createElement('button');
        btn.className = 'level-card' + (done ? ' done' : '') + (!unlocked ? ' locked' : '');
        let status = lv.desc;
        if (!unlocked) status = 'Bloqueada — conclua a fase anterior';
        else if (!implemented) status = 'Em desenvolvimento — chega na próxima atualização';
        else if (done) status = 'Concluída ♥ ' + ((p.sparks[lv.id] || []).length) + ' corações brilhantes';
        btn.innerHTML = `<span class="level-num">${!unlocked ? '🔒' : lv.id}</span><span class="level-info">${DMC.util.escapeHTML(lv.name)}<small>${DMC.util.escapeHTML(status)}</small></span>`;
        btn.disabled = !unlocked || !implemented;
        btn.addEventListener('click', () => {
          DMC.Audio.unlock();
          DMC.Audio.sfx('click');
          this.game.startLevel(lv.id, { fromSelect: true });
        });
        grid.appendChild(btn);
      });
    },

    /* ---------- Opções ---------- */
    toggle(key) {
      const s = DMC.Save.data.settings;
      if (key === 'music') { DMC.Save.setSetting('music', !s.music); DMC.Audio.setMusic(s.music); }
      if (key === 'sfx') { DMC.Save.setSetting('sfx', !s.sfx); DMC.Audio.setSfx(s.sfx); }
      if (key === 'fullscreen') {
        const on = !this.isFullscreen();
        if (on) this.enterFullscreen(); else this.exitFullscreen();
        DMC.Save.setSetting('fullscreen', on);
      }
      if (key === 'touch') {
        const order = ['auto', 'on', 'off'];
        DMC.Save.setSetting('touch', order[(order.indexOf(s.touch) + 1) % 3]);
        this.updateTouchMode();
      }
      this.refreshToggles();
    },

    refreshToggles() {
      const s = DMC.Save.data.settings;
      const labels = {
        music: 'Música: <b>' + (s.music ? 'ligada' : 'desligada') + '</b>',
        sfx: 'Efeitos: <b>' + (s.sfx ? 'ligados' : 'desligados') + '</b>',
        touch: 'Controles de toque: <b>' + ({ auto: 'auto', on: 'sempre', off: 'nunca' }[s.touch]) + '</b>',
        fullscreen: 'Tela cheia: <b>' + (this.isFullscreen() ? 'ligada' : 'desligada') + '</b>',
      };
      document.querySelectorAll('[data-toggle]').forEach((b) => { b.innerHTML = labels[b.dataset.toggle]; });
    },

    /* ---------- Tela cheia (Fullscreen API) ---------- */
    fullscreenSupported() {
      if (/DMCApp/.test(navigator.userAgent)) return false; // no app Android já é tela cheia
      const el = document.documentElement;
      return !!(el.requestFullscreen || el.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
    },
    isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    enterFullscreen() {
      const el = document.documentElement;
      try {
        const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
        if (p && p.catch) p.catch(() => { this.toast('Tela cheia indisponível aqui'); DMC.Save.setSetting('fullscreen', false); this.refreshToggles(); });
      } catch (e) { this.toast('Tela cheia indisponível aqui'); }
    },
    exitFullscreen() {
      try {
        if (!this.isFullscreen()) return;
        const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ignorado */ }
    },

    refreshCredits() {
      const c = DMC.Save.data.config;
      $('credits-couple').textContent = c.configured ? `De ${c.from}, para ${c.to}.` : 'De alguém especial, para alguém especial.';
    },

    /* ---------- Controles de toque ---------- */
    touchActive() {
      const mode = DMC.Save.data.settings.touch;
      if (mode === 'on') return true;
      if (mode === 'off') return false;
      return this._touchSeen || DMC.util.isTouchDevice();
    },
    updateTouchMode() {
      if (DMC.util.isTouchDevice()) this._touchSeen = true;
      document.body.classList.toggle('touch', this.touchActive());
      this.syncTouchControls();
    },
    syncTouchControls() {
      const inGame = !$('hud').classList.contains('hidden');
      const scene = this.game && this.game.scene;
      const wantsJoystick = !scene || scene.usesJoystick !== false;
      $('touch-controls').classList.toggle('hidden', !(inGame && wantsJoystick && this.touchActive()));
    },

    /* ---------- HUD ---------- */
    showHUD(on) {
      $('hud').classList.toggle('hidden', !on);
      if (!on) this.setActionReady(false);
      this.syncTouchControls();
    },

    setHUD({ pieces, sparks, sparksTotal, key, objective }) {
      $('hud-pieces-txt').textContent = `${pieces}/${DMC.Levels.total}`;
      $('hud-sparks-txt').textContent = `${sparks}/${sparksTotal}`;
      $('hud-sparks').classList.toggle('hidden', !sparksTotal);
      $('hud-key').classList.toggle('hidden', !key);
      if (objective != null) $('hud-objective').textContent = objective;
    },

    popHUD(id) {
      const el = $(id);
      el.classList.remove('pop');
      void el.offsetWidth; // reinicia a animação
      el.classList.add('pop');
    },

    setActionReady(on) {
      const b = $('btn-action');
      if (b.classList.contains('ready') !== on) b.classList.toggle('ready', on);
    },

    toast(text) {
      const t = $('toast');
      t.textContent = text;
      t.classList.add('hidden');
      void t.offsetWidth;
      t.classList.remove('hidden');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
    },

    /* ---------- Carta romântica (com efeito de escrita) ---------- */
    showLetter({ to, body, from, button }) {
      return new Promise((resolve) => {
        const prev = this.current;
        $('letter-to').textContent = to || '';
        $('letter-from').textContent = from || '';
        const bodyEl = $('letter-body');
        const btn = $('btn-letter-ok');
        btn.textContent = button || 'Continuar';
        bodyEl.textContent = '';
        this.show('letter');
        DMC.Input.enabled = false;

        let i = 0, done = false;
        const timer = setInterval(() => {
          i += 2;
          bodyEl.textContent = body.slice(0, i);
          if (i % 6 === 0) DMC.Audio.sfx('blip');
          if (i >= body.length) finishTyping();
        }, 45);
        function finishTyping() {
          clearInterval(timer);
          bodyEl.textContent = body;
          done = true;
        }
        const letterEl = document.querySelector('.letter');
        const skip = () => { if (!done) finishTyping(); };
        letterEl.addEventListener('pointerdown', skip);

        const close = () => {
          if (!done) { finishTyping(); return; }
          DMC.Audio.sfx('click');
          btn.removeEventListener('click', close);
          letterEl.removeEventListener('pointerdown', skip);
          window.removeEventListener('keydown', onKey);
          DMC.Input.enabled = true;
          DMC.Input.clear();
          this.show(prev === 'letter' ? null : prev);
          resolve();
        };
        const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') { e.preventDefault(); close(); } };
        btn.addEventListener('click', close);
        setTimeout(() => window.addEventListener('keydown', onKey), 300);
      });
    },

    /* ---------- Declaração final (Fase 5) ---------- */
    /**
     * Mostra a carta final com botões de resposta e, depois, a tela de comemoração.
     * Resolve com 'credits' ou 'menu'.
     */
    showFinal({ to, body, closing, from, answers, celebrateTitle, names, onAnswer }) {
      return new Promise((resolve) => {
        const letter = $('final-letter'), cel = $('final-celebrate');
        letter.classList.remove('hidden');
        cel.classList.add('hidden');
        $('final-to').textContent = to;
        $('final-from').textContent = from;
        $('final-closing').textContent = closing;
        const bodyEl = $('final-body');
        bodyEl.textContent = '';
        const box = $('final-answers');
        box.innerHTML = '';
        box.classList.add('hidden');
        this.show('final');
        DMC.Input.enabled = false;

        // texto escrito aos poucos, depois os botões aparecem
        let i = 0;
        const reveal = () => { clearInterval(timer); bodyEl.textContent = body; box.classList.remove('hidden'); $('final-closing').classList.add('show'); };
        const timer = setInterval(() => {
          i += 2;
          bodyEl.textContent = body.slice(0, i);
          if (i % 8 === 0) DMC.Audio.sfx('blip');
          if (i >= body.length) reveal();
        }, 55);
        letter.onpointerdown = () => { if (box.classList.contains('hidden')) reveal(); };
        $('final-closing').classList.remove('show');

        answers.forEach((label) => {
          const b = document.createElement('button');
          b.className = 'pbtn';
          b.textContent = label;
          b.addEventListener('click', () => {
            letter.onpointerdown = null;
            letter.classList.add('hidden');
            $('final-celebrate-title').textContent = celebrateTitle;
            $('final-names').textContent = names;
            cel.classList.remove('hidden');
            if (onAnswer) onAnswer();
          });
          box.appendChild(b);
        });

        const done = (choice) => {
          DMC.Audio.sfx('click');
          $('btn-final-credits').onclick = null;
          $('btn-final-menu').onclick = null;
          DMC.Input.enabled = true;
          resolve(choice);
        };
        $('btn-final-credits').onclick = () => done('credits');
        $('btn-final-menu').onclick = () => done('menu');
      });
    },

    /* ---------- Confirmação ---------- */
    confirm(title, text) {
      return new Promise((resolve) => {
        const prev = this.current;
        $('confirm-title').textContent = title;
        $('confirm-text').textContent = text;
        this.show('confirm');
        const yes = $('btn-confirm-yes'), no = $('btn-confirm-no');
        const done = (v) => {
          yes.removeEventListener('click', onYes);
          no.removeEventListener('click', onNo);
          DMC.Audio.sfx('click');
          this.show(prev);
          resolve(v);
        };
        const onYes = () => done(true);
        const onNo = () => done(false);
        yes.addEventListener('click', onYes);
        no.addEventListener('click', onNo);
      });
    },

    /* ---------- Conclusão de fase ---------- */
    showComplete(levelId, stats) {
      const lv = DMC.Levels.get(levelId);
      const next = DMC.Levels.get(levelId + 1);
      const nextReady = next && DMC.Levels.isImplemented(next.id);
      $('complete-title').textContent = 'Fase ' + levelId + ' concluída!';
      $('complete-sub').textContent = `"${lv.name}" — parte ${DMC.Save.data.progress.pieces} de ${DMC.Levels.total} do coração desbloqueada`;
      let txt = stats.text || `Corações brilhantes: ${stats.sparks}/${stats.sparksTotal}`;
      if (next && !nextReady) txt += ' · A Fase ' + next.id + ' chega na próxima atualização!';
      $('complete-stats').textContent = txt;
      $('btn-next-level').classList.toggle('hidden', !nextReady);
      this.show('complete');
    },

    /* ---------- Transição em fade ---------- */
    fade(fn) {
      const f = $('fade');
      return new Promise((resolve) => {
        f.classList.add('on');
        setTimeout(async () => {
          if (fn) await fn();
          requestAnimationFrame(() => {
            f.classList.remove('on');
            setTimeout(resolve, 450);
          });
        }, 460);
      });
    },
  };

  DMC.UI = UI;
})();
