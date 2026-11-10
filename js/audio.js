/* =========================================================
   audio.js — música e efeitos 100% originais, sintetizados
   em tempo real com Web Audio API (nenhum arquivo externo,
   nenhum direito autoral de terceiros, funciona offline).
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const _ = null; // pausa na partitura

  /* ---------------- Trilhas ----------------
     Cada trilha: bpm, acordes (um por compasso), melodia em colcheias
     (8 por compasso). Os compassos da melodia repetem em ciclo.        */
  const TRACKS = {
    // Menu: sonhador, caixinha de música
    menu: {
      bpm: 76,
      lead: 'sine', leadGain: 0.11, leadDecay: 0.9,
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
      melody: [
        [84, _, 81, _, 79, _, 76, _],
        [83, _, 79, _, 76, _, 74, _],
        [81, _, 77, _, 74, _, 72, 74],
        [76, _, _, _, 79, _, _, _],
        [84, _, 86, _, 88, _, 84, _],
        [83, _, 81, _, 79, _, 76, _],
        [77, _, 76, _, 74, _, 72, _],
        [72, _, _, _, _, _, _, _],
      ],
    },
    // Fase 1: jardim ao entardecer, alegre e leve
    garden: {
      bpm: 92,
      lead: 'triangle', leadGain: 0.12, leadDecay: 0.45,
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
      melody: [
        [72, _, 76, _, 79, 76, 74, _],
        [72, _, 69, _, 72, 76, _, _],
        [77, _, 76, 74, 72, _, 69, _],
        [71, _, 74, _, 79, _, 77, 74],
        [76, _, 79, _, 84, _, 83, 81],
        [81, _, 79, _, 76, _, 72, _],
        [74, _, 77, _, 81, 79, 77, 76],
        [74, _, 71, _, 67, _, _, _],
      ],
    },
    // Fase 3: céu estrelado, contemplativa
    stars: {
      bpm: 70,
      lead: 'sine', leadGain: 0.1, leadDecay: 1.2,
      chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [52, 55, 59, 62]],
      melody: [
        [88, _, _, 84, _, _, 81, _],
        [81, _, _, _, 84, _, _, _],
        [83, _, _, 79, _, _, 76, _],
        [79, _, _, _, _, _, _, _],
        [88, _, 91, _, 88, _, 84, _],
        [86, _, _, 84, _, _, 81, _],
        [83, _, 84, _, 86, _, 83, _],
        [81, _, _, _, _, _, _, _],
      ],
    },
    // Fase 4: labirinto, saltitante
    maze: {
      bpm: 104,
      lead: 'triangle', leadGain: 0.1, leadDecay: 0.3,
      chords: [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]],
      melody: [
        [77, _, 81, _, 84, _, 81, 79],
        [79, _, 83, _, 86, _, 83, _],
        [79, _, 76, _, 71, _, 76, 79],
        [81, _, _, 76, _, _, 72, _],
        [77, 79, 81, _, 84, _, 86, 84],
        [83, _, 79, _, 74, _, 79, _],
        [76, _, 79, _, 83, _, 81, 79],
        [81, _, _, _, _, _, _, _],
      ],
    },
    // Fase 5 / final: romântica, com dobra de oitava
    finale: {
      bpm: 80,
      lead: 'triangle', leadGain: 0.13, leadDecay: 0.9, harmony: -12,
      chords: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [55, 59, 64], [53, 57, 60], [52, 55, 60], [50, 53, 57, 60], [55, 59, 62]],
      melody: [
        [76, _, 74, _, 72, _, 74, 76],
        [74, _, 71, _, 67, _, 71, 74],
        [72, _, 76, _, 81, _, 79, 76],
        [79, _, _, 76, _, _, 74, _],
        [77, _, 76, _, 74, _, 72, 74],
        [76, _, 72, _, 67, _, 72, 76],
        [77, _, 81, _, 79, _, 77, 76],
        [74, _, _, _, 79, _, _, _],
      ],
    },
  };

  // Escala pentatônica usada nas notas das estrelas (Fase 3)
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100];

  const Audio = {
    ctx: null,
    master: null,
    musicBus: null,
    sfxBus: null,
    noiseBuf: null,
    musicOn: true,
    sfxOn: true,
    track: null,
    trackName: null,
    _timer: null,
    _nextTime: 0,
    _step: 0,

    /** Precisa ser chamado dentro de um gesto do usuário (política dos navegadores). */
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);

        // Barramento de música com um eco suave (sensação de ambiente)
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicOn ? 1 : 0;
        const delay = this.ctx.createDelay(1);
        delay.delayTime.value = 0.32;
        const fb = this.ctx.createGain();
        fb.gain.value = 0.28;
        const wet = this.ctx.createGain();
        wet.gain.value = 0.22;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        this.musicBus.connect(this.master);
        this.musicBus.connect(delay);
        delay.connect(lp);
        lp.connect(fb);
        fb.connect(delay);
        lp.connect(wet);
        wet.connect(this.master);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
        this.sfxBus.connect(this.master);

        // Buffer de ruído branco (passos, folhas)
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.trackName && !this._timer) this.playMusic(this.trackName, true);
    },

    setMusic(on) {
      this.musicOn = on;
      if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.1);
    },
    setSfx(on) {
      this.sfxOn = on;
      if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
    },

    /** Suspende tudo quando a aba fica oculta (economiza bateria). */
    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    /* ------------ síntese básica ------------ */
    tone(freq, t, dur, opt = {}) {
      const c = this.ctx;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = opt.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (opt.slideTo) osc.frequency.exponentialRampToValueAtTime(opt.slideTo, t + dur);
      if (opt.detune) osc.detune.value = opt.detune;
      const peak = opt.gain == null ? 0.2 : opt.gain;
      const a = opt.attack == null ? 0.01 : opt.attack;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(opt.dest || this.sfxBus);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },

    noise(t, dur, opt = {}) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = opt.filter || 'lowpass';
      f.frequency.value = opt.freq || 1200;
      f.Q.value = opt.q || 0.8;
      const g = c.createGain();
      g.gain.setValueAtTime(opt.gain || 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(opt.dest || this.sfxBus);
      src.start(t);
      src.stop(t + dur + 0.02);
    },

    /* ------------ música ------------ */
    playMusic(name, force) {
      if (!TRACKS[name]) return;
      if (this.trackName === name && this._timer && !force) return;
      this.stopMusic();
      this.trackName = name;
      this.track = TRACKS[name];
      if (!this.ctx) return; // tocará quando o áudio for desbloqueado
      this._step = 0;
      this._nextTime = this.ctx.currentTime + 0.1;
      this._timer = setInterval(() => this._schedule(), 50);
    },

    stopMusic() {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
    },

    _schedule() {
      const c = this.ctx;
      if (!c || c.state !== 'running') return;
      const tr = this.track;
      const eighth = 60 / tr.bpm / 2;
      while (this._nextTime < c.currentTime + 0.25) {
        const t = this._nextTime;
        const step = this._step;
        const barIdx = Math.floor(step / 8);
        const inBar = step % 8;
        const chord = tr.chords[barIdx % tr.chords.length];
        const mel = tr.melody[barIdx % tr.melody.length];
        const bus = this.musicBus;

        // Pad: acorde suave no início de cada compasso
        if (inBar === 0) {
          chord.forEach((n, i) => {
            this.tone(midi(n), t, eighth * 8.2, { type: 'sine', gain: 0.035, attack: 0.4, dest: bus, detune: i % 2 ? 4 : -4 });
          });
        }
        // Baixo nos tempos 1 e 3
        if (inBar === 0 || inBar === 4) {
          this.tone(midi(chord[0] - 12), t, eighth * 3.5, { type: 'triangle', gain: 0.09, attack: 0.02, dest: bus });
        }
        // Arpejo delicado
        const arpNote = chord[[0, 1, 2, 1][inBar % 4] % chord.length] + 12;
        this.tone(midi(arpNote), t, eighth * 1.4, { type: 'sine', gain: 0.025, attack: 0.005, dest: bus });
        // Melodia
        const m = mel[inBar];
        if (m != null) {
          this.tone(midi(m), t, tr.leadDecay * 1.6, { type: tr.lead, gain: tr.leadGain, attack: 0.01, dest: bus });
          this.tone(midi(m + 12), t, tr.leadDecay, { type: 'sine', gain: tr.leadGain * 0.18, attack: 0.01, dest: bus });
          if (tr.harmony) this.tone(midi(m + tr.harmony), t, tr.leadDecay * 1.4, { type: 'sine', gain: tr.leadGain * 0.45, attack: 0.02, dest: bus });
        }
        this._nextTime += eighth;
        this._step++;
      }
    },

    /* ------------ efeitos sonoros ------------ */
    sfx(name, arg) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime + 0.005;
      switch (name) {
        case 'click':
          this.tone(880, t, 0.06, { type: 'square', gain: 0.05 });
          this.tone(1320, t + 0.03, 0.05, { type: 'square', gain: 0.03 });
          break;
        case 'blip':
          this.tone(560 + Math.random() * 120, t, 0.04, { type: 'triangle', gain: 0.05 });
          break;
        case 'step':
          this.noise(t, 0.05, { freq: 600, gain: 0.025 });
          break;
        case 'rustle':
          this.noise(t, 0.25, { filter: 'bandpass', freq: 2500, q: 0.7, gain: 0.12 });
          this.noise(t + 0.08, 0.2, { filter: 'bandpass', freq: 3500, q: 0.7, gain: 0.08 });
          break;
        case 'collect':
          [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.05, 0.18, { type: 'square', gain: 0.045 }));
          break;
        case 'key':
          [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, t + i * 0.07, 0.35, { type: 'triangle', gain: 0.07 }));
          this.tone(523, t, 0.6, { type: 'sine', gain: 0.08 });
          break;
        case 'locked':
          this.tone(220, t, 0.12, { type: 'square', gain: 0.05 });
          this.tone(185, t + 0.12, 0.18, { type: 'square', gain: 0.05 });
          break;
        case 'unlock':
          this.noise(t, 0.08, { filter: 'highpass', freq: 3000, gain: 0.12 });
          this.tone(660, t + 0.05, 0.1, { type: 'square', gain: 0.05 });
          this.tone(990, t + 0.12, 0.15, { type: 'square', gain: 0.05 });
          break;
        case 'chest':
          this.tone(110, t, 0.3, { type: 'sine', gain: 0.25, slideTo: 60 });
          this.tone(300, t + 0.1, 0.6, { type: 'sawtooth', gain: 0.025, slideTo: 520 });
          [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + 0.55 + i * 0.09, 0.8, { type: 'triangle', gain: 0.07 }));
          break;
        case 'heart':
          this.tone(392, t, 1.2, { type: 'sine', gain: 0.1, slideTo: 1568 });
          [1568, 1976, 2349].forEach((f, i) => this.tone(f, t + 0.9 + i * 0.1, 0.6, { type: 'triangle', gain: 0.05 }));
          break;
        case 'complete':
          [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]].forEach(([f, d]) => this.tone(f, t + d, 0.5, { type: 'square', gain: 0.05 }));
          [523, 659, 784, 1047].forEach((f) => this.tone(f, t + 0.55, 1.4, { type: 'triangle', gain: 0.06, attack: 0.02 }));
          break;
        case 'pause':
          this.tone(660, t, 0.08, { type: 'triangle', gain: 0.06 });
          this.tone(440, t + 0.08, 0.1, { type: 'triangle', gain: 0.06 });
          break;
        case 'pickup':
          this.tone(520, t, 0.08, { type: 'triangle', gain: 0.06, slideTo: 760 });
          break;
        case 'snap':
          this.tone(180, t, 0.12, { type: 'sine', gain: 0.2, slideTo: 110 });
          this.tone(1047, t + 0.04, 0.25, { type: 'triangle', gain: 0.06 });
          this.tone(1568, t + 0.1, 0.25, { type: 'triangle', gain: 0.04 });
          break;
        case 'note': {
          const n = PENTA[Math.max(0, Math.min(PENTA.length - 1, arg || 0))];
          this.tone(midi(n), t, 0.9, { type: 'triangle', gain: 0.08 });
          this.tone(midi(n + 12), t, 0.6, { type: 'sine', gain: 0.04 });
          break;
        }
        case 'wrong':
          this.tone(240, t, 0.1, { type: 'square', gain: 0.04 });
          this.tone(200, t + 0.1, 0.16, { type: 'square', gain: 0.04 });
          break;
        case 'hurt':
          this.tone(320, t, 0.3, { type: 'square', gain: 0.05, slideTo: 110 });
          this.noise(t, 0.3, { filter: 'bandpass', freq: 900, gain: 0.08 });
          break;
        case 'checkpoint':
          [659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.08, 0.4, { type: 'sine', gain: 0.08 }));
          break;
        case 'chime':
          this.tone(1568 + Math.random() * 400, t, 0.5, { type: 'sine', gain: 0.035 });
          break;
        case 'firework':
          this.noise(t, 0.4, { filter: 'highpass', freq: 1500, gain: 0.06 });
          for (let i = 0; i < 4; i++) this.tone(1800 + Math.random() * 1600, t + 0.05 + i * 0.05, 0.25, { type: 'sine', gain: 0.025 });
          break;
        case 'shoot':
          this.tone(2400, t, 0.5, { type: 'sine', gain: 0.03, slideTo: 900 });
          break;
        case 'fanfare':
          [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.6], [1047, 0.75]].forEach(([f, d]) => this.tone(f, t + d, 0.4, { type: 'square', gain: 0.045 }));
          [523, 659, 784, 1047, 1319].forEach((f) => this.tone(f, t + 0.95, 2, { type: 'triangle', gain: 0.05, attack: 0.03 }));
          break;
        default:
          break;
      }
    },
  };

  DMC.Audio = Audio;
})();
