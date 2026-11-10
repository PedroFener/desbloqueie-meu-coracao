/* =========================================================
   save.js — salvamento local (localStorage), sem internet
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const KEY = 'dmc_save_v1';

  /** Estrutura padrão do save. Novas fases só precisam usar levelState[id]. */
  function defaults() {
    return {
      version: 1,
      config: { to: '', from: '', type: 'namoro', message: '', configured: false },
      settings: { music: true, sfx: true, touch: 'auto', fullscreen: false }, // touch: auto | on | off
      progress: {
        unlocked: 1,        // maior fase liberada
        completed: [],      // ids das fases concluídas
        pieces: 0,          // partes do coração obtidas
        sparks: {},         // { levelId: [ids de corações brilhantes coletados] }
        finished: false,    // terminou a última fase
      },
      current: null,        // { level: id } — fase em andamento (para "Continuar")
      levelState: {},       // { levelId: { ...estado salvo da fase } }
    };
  }

  /** Mescla recursivamente o save carregado sobre os padrões (robusto a versões antigas). */
  function merge(base, data) {
    if (!data || typeof data !== 'object') return base;
    // percorre as chaves dos dois lados (dicionários como levelState têm chaves dinâmicas)
    new Set([...Object.keys(base), ...Object.keys(data)]).forEach((k) => {
      if (!(k in data)) return;
      const b = base[k], d = data[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && d && typeof d === 'object' && !Array.isArray(d)) {
        base[k] = merge(b, d);
      } else {
        base[k] = d;
      }
    });
    return base;
  }

  let memoryFallback = null; // usado se localStorage estiver bloqueado

  const Save = {
    data: defaults(),

    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = memoryFallback; }
      try {
        this.data = merge(defaults(), raw ? JSON.parse(raw) : null);
      } catch (e) {
        console.warn('[save] save corrompido, recomeçando', e);
        this.data = defaults();
      }
      return this.data;
    },

    write() {
      const json = JSON.stringify(this.data);
      try { localStorage.setItem(KEY, json); } catch (e) { memoryFallback = json; }
    },

    reset() {
      const settings = this.data.settings; // mantém preferências de som
      this.data = defaults();
      this.data.settings = settings;
      this.write();
    },

    /** Começa uma nova jornada mantendo a personalização. */
    newGame() {
      const { config, settings } = this.data;
      this.data = defaults();
      this.data.config = config;
      this.data.settings = settings;
      this.write();
    },

    setConfig(cfg) {
      Object.assign(this.data.config, cfg, { configured: true });
      this.write();
    },

    setSetting(key, value) {
      this.data.settings[key] = value;
      this.write();
    },

    getLevelState(id) { return this.data.levelState[id] || null; },

    setLevelState(id, state) {
      this.data.levelState[id] = state;
      this.data.current = { level: id };
      this.write();
    },

    clearLevelState(id) {
      delete this.data.levelState[id];
      this.write();
    },

    addSpark(levelId, sparkId) {
      const list = (this.data.progress.sparks[levelId] = this.data.progress.sparks[levelId] || []);
      if (!list.includes(sparkId)) list.push(sparkId);
      this.write();
    },

    completeLevel(id, totalLevels) {
      const p = this.data.progress;
      if (!p.completed.includes(id)) {
        p.completed.push(id);
        p.pieces = p.completed.length;
      }
      p.unlocked = Math.min(totalLevels, Math.max(p.unlocked, id + 1));
      delete this.data.levelState[id];
      // "Continuar" passa a apontar para a próxima fase (ou para a seleção, se o jogo acabou)
      if (id >= totalLevels) { this.data.current = null; p.finished = true; }
      else this.data.current = { level: id + 1 };
      this.write();
    },

    hasProgress() {
      const p = this.data.progress;
      return !!(this.data.current || p.completed.length > 0);
    },
  };

  DMC.Save = Save;
})();
