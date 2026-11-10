/* =========================================================
   sprites.js — toda a pixel art do jogo, gerada por código.
   Os sprites são desenhados uma única vez em canvases fora
   da tela (cache) e depois apenas copiados: rápido em
   celulares modestos e sem depender de arquivos de imagem.
   ========================================================= */
(function () {
  'use strict';
  const DMC = window.DMC;
  const { makeCanvas, seeded } = DMC.util;

  /* ---------- Paleta global ---------- */
  const C = {
    outline: '#2b1b3d',
    grass: '#86d19c', grassD: '#6cbd88', grassL: '#b2ebc0', grassXL: '#d4f7da',
    path: '#f3dab0', pathD: '#dcbb8c', pathL: '#fff0d4',
    water: '#86b9ff', waterD: '#6a9ef0', waterL: '#d4e8ff', foam: '#eef6ff',
    leafD: '#3f8a6c', leaf: '#5fb58c', leafL: '#8fdcae', leafXL: '#c4f2d4',
    blossomD: '#d9649d', blossom: '#ff9ccb', blossomL: '#ffc7e2', blossomXL: '#fff0f7',
    trunk: '#8a5a44', trunkD: '#5e3a2e', trunkL: '#b07a5c',
    rock: '#b9aad6', rockD: '#8a7bb0', rockL: '#ddd2f2',
    wood: '#c98e6b', woodD: '#8f5b42', woodL: '#e8b48f',
    cream: '#fff4e8', creamD: '#ead6c4',
    roof: '#ff8fb8', roofD: '#d9578f', roofL: '#ffc2dc',
    pink: '#ff7eb6', pinkD: '#d9478a', pinkL: '#ffc2dc',
    purple: '#6b4fa0', purpleD: '#3a2453', purpleL: '#a98bdb',
    gold: '#ffd166', goldD: '#e09a2c', goldL: '#fff1b8',
    glow: '#ffe9a8',
    white: '#ffffff',
  };

  /** Desenha um sprite a partir de linhas de texto (cada caractere = um pixel). */
  function fromMap(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const { canvas, ctx } = makeCanvas(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  /** Espelha horizontalmente um canvas. */
  function flipH(src) {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return canvas;
  }

  /** Recolore um sprite inteiro (usado para silhuetas/brilhos). */
  function tint(src, color) {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, src.width, src.height);
    return canvas;
  }

  /** Preenche uma forma "blob" (união de círculos) com sombreamento e contorno. */
  function blob(ctx, circles, w, h, light, colors, rnd, speckle) {
    const inside = (x, y) => circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x + 0.5, y + 0.5)) continue;
        const edge = !inside(x - 0.5, y + 0.5) || !inside(x + 1.5, y + 0.5) || !inside(x + 0.5, y - 0.5) || !inside(x + 0.5, y + 1.5);
        let col;
        if (edge) col = colors.outline;
        else {
          const d = Math.hypot(x - light[0], y - light[1]) + (rnd() - 0.5) * (speckle || 3);
          col = d < light[2] * 0.45 ? colors.xl : d < light[2] * 0.8 ? colors.l : d < light[2] * 1.25 ? colors.m : colors.d;
        }
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /* =========================================================
     PERSONAGEM PRINCIPAL (12x16) — 4 direções × 3 quadros
     ========================================================= */
  const PLAYER_PAL = {
    k: C.outline, h: '#6b3f8f', H: '#a473cf', s: '#ffd9bf', S: '#f0b394', e: '#2b1b3d',
    b: '#ff9cc2', p: C.pink, P: C.pinkD, w: C.white, j: '#6a7ee8', J: '#4656b8', o: '#5a3a33',
  };

  const HEAD_DOWN = [
    '...kkkkkk...',
    '..khHHhhhk..',
    '.khHhhhhhhk.',
    '.khhhhhhhhk.',
    '.khsshhsshk.',
    '.kssssssssk.',
    '.ksessssesk.',
    '.kbssssssbk.',
    '..kssSSssk..',
  ];
  const BODY_DOWN = [
    '..kppppppk..',
    '.kspwppwpsk.',
    '.ksppwwppsk.',
    '.kkPPPPPPkk.',
  ];
  const HEAD_UP = [
    '...kkkkkk...',
    '..khhhhhhk..',
    '.khhHHhhhhk.',
    '.khHhhhhhhk.',
    '.khhhhhhhhk.',
    '.khhhhhhhhk.',
    '.khhhhhhhhk.',
    '.kshhhhhhsk.',
    '..kSssssSk..',
  ];
  const BODY_UP = [
    '..kppppppk..',
    '.ksppppppsk.',
    '.ksppppppsk.',
    '.kkPPPPPPkk.',
  ];
  const HEAD_SIDE = [
    '...kkkkk....',
    '..khHHhhk...',
    '.khHhhhhhk..',
    '.khhhhhhhhk.',
    '.khhhhhsssk.',
    '.khhhsssssk.',
    '.khhssssesk.',
    '.khhsssbssk.',
    '..khkssssk..',
  ];
  const BODY_SIDE = [
    '...kppppk...',
    '..kppsspk...',
    '..kpppppk...',
    '..kPPPPPk...',
  ];
  const LEGS_FRONT = [
    ['..kjjkkjjk..', '..kjjkkjjk..', '..kookkook..'],
    ['..kjjkkjjk..', '..kjjkkook..', '..kook......'],
    ['..kjjkkjjk..', '..kookkjjk..', '......kook..'],
  ];
  const LEGS_SIDE = [
    ['...kjjjk....', '...kjjjk....', '...kooook...'],
    ['..kjjkjjk...', '..kjk..kjk..', '.kook..kook.'],
    ['...kjjjk....', '...kjjjk....', '...kooook...'],
  ];

  function buildPlayer(pal = PLAYER_PAL) {
    const frames = { down: [], up: [], right: [], left: [] };
    for (let f = 0; f < 3; f++) {
      frames.down.push(fromMap([...HEAD_DOWN, ...BODY_DOWN, ...LEGS_FRONT[f]], pal));
      frames.up.push(fromMap([...HEAD_UP, ...BODY_UP, ...LEGS_FRONT[f]], pal));
      const side = fromMap([...HEAD_SIDE, ...BODY_SIDE, ...LEGS_SIDE[f]], pal);
      frames.right.push(side);
      frames.left.push(flipH(side));
    }
    return frames;
  }

  /* Personagem parceiro(a) (para fases futuras e créditos) */
  const PARTNER_PAL = Object.assign({}, PLAYER_PAL, { h: '#3d5aa8', H: '#6f8fe0', p: '#7fb4ff', P: '#4f7fd0', j: '#a98bdb', J: '#7b62b0' });
  function buildPartner() {
    return fromMap([...HEAD_DOWN, ...BODY_DOWN, ...LEGS_FRONT[0]], PARTNER_PAL);
  }

  /* =========================================================
     TILES DO CHÃO (16x16)
     ========================================================= */
  function buildGrass(seed) {
    const { canvas, ctx } = makeCanvas(16, 16);
    const r = seeded(seed);
    ctx.fillStyle = C.grass;
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
      ctx.fillStyle = r() < 0.6 ? C.grassD : C.grassL;
      ctx.fillRect(x, y, 1, 1);
      if (r() < 0.4) ctx.fillRect(x, y - 1, 1, 1); // folhinha de 2px
    }
    if (r() < 0.3) { ctx.fillStyle = C.grassXL; ctx.fillRect(Math.floor(r() * 14), Math.floor(r() * 14), 1, 1); }
    return canvas;
  }

  function buildPath(seed) {
    const { canvas, ctx } = makeCanvas(16, 16);
    const r = seeded(seed);
    ctx.fillStyle = C.path;
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 15), y = Math.floor(r() * 15);
      ctx.fillStyle = C.pathD;
      ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = C.pathL;
      ctx.fillRect(x, y - 1, 1, 1);
    }
    return canvas;
  }

  function buildWater(frame) {
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = C.water;
    ctx.fillRect(0, 0, 16, 16);
    const r = seeded(77);
    for (let i = 0; i < 5; i++) {
      const y = Math.floor(r() * 15);
      const x = (Math.floor(r() * 16) + frame * 2) % 16;
      ctx.fillStyle = C.waterD;
      ctx.fillRect(x, y + 1, 4, 1);
      ctx.fillStyle = C.waterL;
      ctx.fillRect((x + 1) % 16, y, 2, 1);
    }
    return canvas;
  }

  function buildBridge() {
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = C.woodD;
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      ctx.fillStyle = C.wood;
      ctx.fillRect(1, y, 14, 3);
      ctx.fillStyle = C.woodL;
      ctx.fillRect(1, y, 14, 1);
    }
    ctx.fillStyle = C.outline;
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    return canvas;
  }

  /* =========================================================
     DECORAÇÃO E OBJETOS
     ========================================================= */
  function buildTree(kind, seed) {
    const r = seeded(seed);
    const cols = kind === 'cherry'
      ? { outline: '#8c3a66', d: C.blossomD, m: C.blossom, l: C.blossomL, xl: C.blossomXL }
      : { outline: '#25523f', d: C.leafD, m: C.leaf, l: C.leafL, xl: C.leafXL };
    // copa 32x28
    const canopy = makeCanvas(32, 28, true);
    blob(canopy.ctx, [[16, 14, 12], [8, 17, 7.5], [24, 17, 7.5], [16, 8, 8.5], [10, 10, 6], [22, 10, 6]], 32, 28, [11, 7, 12], cols, r, 4);
    // pequenas flores/frutos
    for (let i = 0; i < 7; i++) {
      const x = 6 + Math.floor(r() * 20), y = 6 + Math.floor(r() * 16);
      const d = canopy.ctx.getImageData(x, y, 1, 1).data;
      if (d[3] === 0) continue;
      canopy.ctx.fillStyle = kind === 'cherry' ? C.white : (r() < 0.5 ? C.pinkL : C.white);
      canopy.ctx.fillRect(x, y, 1, 1);
    }
    // tronco 32x14 (inclui sombra no chão)
    const trunk = makeCanvas(32, 14);
    const t = trunk.ctx;
    t.fillStyle = 'rgba(43,27,61,0.28)';
    t.beginPath();
    t.ellipse(16, 11, 11, 3, 0, 0, Math.PI * 2);
    t.fill();
    t.fillStyle = C.trunkD;
    t.fillRect(12, 0, 8, 12);
    t.fillStyle = C.trunk;
    t.fillRect(13, 0, 6, 11);
    t.fillStyle = C.trunkL;
    t.fillRect(14, 0, 1, 10);
    t.fillStyle = C.trunkD;
    t.fillRect(11, 10, 2, 2);
    t.fillRect(19, 10, 2, 2);
    t.fillRect(16, 4, 1, 2);
    return { canopy: canopy.canvas, trunk: trunk.canvas };
  }

  function buildBush(seed, berries) {
    const r = seeded(seed);
    const { canvas, ctx } = makeCanvas(18, 16);
    ctx.fillStyle = 'rgba(43,27,61,0.25)';
    ctx.beginPath();
    ctx.ellipse(9, 13.5, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    blob(ctx, [[9, 8, 6.5], [5, 10, 4.5], [13, 10, 4.5]], 18, 15, [6, 5, 7], { outline: '#25523f', d: C.leafD, m: C.leaf, l: C.leafL, xl: C.leafXL }, r, 3);
    if (berries) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = C.pink;
        const x = 4 + Math.floor(r() * 10), y = 5 + Math.floor(r() * 6);
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = C.white;
        ctx.fillRect(x, y - 1, 1, 1);
      }
    }
    return canvas;
  }

  function buildRock(seed) {
    const r = seeded(seed);
    const { canvas, ctx } = makeCanvas(16, 13);
    ctx.fillStyle = 'rgba(43,27,61,0.25)';
    ctx.beginPath();
    ctx.ellipse(8, 10.5, 7, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    blob(ctx, [[8, 7, 5.5], [5, 8, 3.5], [11, 8, 3.5]], 16, 12, [5, 4, 6], { outline: '#4e4270', d: C.rockD, m: C.rock, l: C.rockL, xl: '#f3edff' }, r, 2);
    return canvas;
  }

  function buildFence() {
    const { canvas, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = 'rgba(43,27,61,0.2)';
    ctx.fillRect(0, 13, 16, 2);
    ctx.fillStyle = C.outline;
    ctx.fillRect(0, 4, 16, 1); ctx.fillRect(0, 8, 16, 1);
    ctx.fillRect(2, 1, 4, 13); ctx.fillRect(10, 1, 4, 13);
    ctx.fillStyle = C.wood;
    ctx.fillRect(0, 5, 16, 3); ctx.fillRect(0, 9, 16, 2);
    ctx.fillRect(3, 2, 2, 11); ctx.fillRect(11, 2, 2, 11);
    ctx.fillStyle = C.woodL;
    ctx.fillRect(0, 5, 16, 1); ctx.fillRect(3, 2, 1, 11); ctx.fillRect(11, 2, 1, 11);
    return canvas;
  }

  function buildHouse() {
    const { canvas, ctx } = makeCanvas(48, 52);
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    // sombra
    ctx.fillStyle = 'rgba(43,27,61,0.28)';
    ctx.fillRect(4, 48, 42, 4);
    // paredes
    R(C.outline, 4, 22, 40, 27);
    R(C.cream, 5, 23, 38, 25);
    R(C.creamD, 5, 44, 38, 4);
    for (let y = 27; y < 44; y += 5) R(C.creamD, 5, y, 38, 1); // tábuas
    // telhado
    for (let i = 0; i < 18; i++) {
      R(C.outline, 1 + i - 1 < 0 ? 0 : i, 22 - i, 48 - i * 2, 1);
    }
    for (let i = 0; i < 17; i++) {
      const w = 46 - i * 2;
      if (w <= 0) break;
      R(i % 4 === 0 ? C.roofD : C.roof, 1 + i, 22 - i, w, 1);
      if (i % 4 === 1) R(C.roofL, 2 + i, 22 - i, w - 2, 1);
    }
    R(C.roofD, 0, 22, 48, 2);
    R(C.outline, 0, 24, 48, 1);
    // chaminé
    R(C.outline, 33, 3, 7, 12); R('#c97a8f', 34, 4, 5, 11); R('#e6a1b4', 34, 4, 5, 2);
    // porta
    R(C.outline, 19, 31, 10, 18); R(C.purple, 20, 32, 8, 17); R(C.purpleL, 21, 33, 6, 1); R(C.gold, 26, 40, 1, 2);
    // coração na porta
    R(C.pinkL, 22, 35, 1, 1); R(C.pinkL, 25, 35, 1, 1); R(C.pinkL, 22, 36, 4, 1); R(C.pinkL, 23, 37, 2, 1);
    // janelas iluminadas
    [[8, 30], [33, 30]].forEach(([x, y]) => {
      R(C.outline, x, y, 8, 8); R(C.glow, x + 1, y + 1, 6, 6); R('#fff8dc', x + 1, y + 1, 3, 3);
      R(C.outline, x + 4, y, 1, 8); R(C.outline, x, y + 4, 8, 1);
      R(C.pink, x - 1, y + 8, 10, 2); R('#ff5fa0', x, y + 8, 2, 1); R(C.white, x + 5, y + 8, 1, 1); // floreira
    });
    // degrau
    R(C.outline, 17, 48, 14, 3); R('#cbb6a3', 18, 48, 12, 2);
    return canvas;
  }

  function buildLamp() {
    const { canvas, ctx } = makeCanvas(10, 26);
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    ctx.fillStyle = 'rgba(43,27,61,0.25)';
    ctx.fillRect(1, 24, 8, 2);
    R(C.outline, 4, 8, 2, 17);
    R(C.purpleL, 4, 8, 1, 16);
    R(C.outline, 2, 23, 6, 2);
    R(C.outline, 1, 1, 8, 8);
    R(C.glow, 2, 2, 6, 6);
    R('#fffbe8', 3, 3, 3, 3);
    R(C.outline, 2, 0, 6, 1);
    R(C.purpleD, 3, 0, 4, 1);
    return canvas;
  }

  function buildSign() {
    return fromMap([
      '.kkkkkkkkkkkk.',
      'kwWWWWWWWWWWwk',
      'kWwwwwwwwwwwWk',
      'kWwkkkkkkkkwWk',
      'kWwwwwwwwwwwWk',
      'kWwkkkkkkwwwWk',
      'kWwwwwwwwwwwWk',
      '.kkkkkkkkkkkk.',
      '.....kddk.....',
      '.....kdWk.....',
      '.....kdWk.....',
      '.....kdWk.....',
      '....sssssss...',
    ], { k: C.outline, w: C.woodL, W: C.wood, d: C.woodD, s: 'rgba(43,27,61,0.25)' });
  }

  function buildMailbox(flagUp) {
    return fromMap([
      '..kkkkkkk..',
      '.kpppppppk' + (flagUp ? 'r' : '.'),
      'kpLLLLLLLpk' ,
      'kpLppppppPk',
      'kpppppppPPk',
      'kPPPPPPPPPk',
      '.kkkkkkkkk.',
      '....kdk....',
      '....kdk....',
      '....kdk....',
      '....kdk....',
      '....kdk....',
      '...sssss...',
    ], { k: C.outline, p: C.pink, P: C.pinkD, L: C.pinkL, d: C.woodD, r: '#ff4f7f', s: 'rgba(43,27,61,0.25)' });
  }

  /* Baú: 4 quadros de abertura (16x18) */
  function buildChest() {
    const pal = { k: C.outline, w: C.wood, W: C.woodD, l: C.woodL, g: C.gold, G: C.goldD, h: C.pink, H: C.pinkD, i: C.purpleD, y: C.glow, Y: '#fffbe8', s: 'rgba(43,27,61,0.28)' };
    const body = [
      'kkkkkkkkkkkkkkkk',
      'kgWWWWWkhkWWWWgk',
      'kgwwwwkhhhkwwwgk',
      'kgwwwwkhHhkwwwgk',
      'kgwwwwwkhkwwwwgk',
      'kgwwwwwwkwwwwwgk',
      'kgWWWWWWWWWWWWgk',
      'kkkkkkkkkkkkkkkk',
      '.ssssssssssssss.',
    ];
    const lids = [
      // fechado
      ['................', '................', '................', '................',
        '.kkkkkkkkkkkkkk.', 'kgllllllllllllgk', 'kgwwwwwwwwwwwwgk', 'kgwwwwwwwwwwwwgk', 'kGGGGGGGGGGGGGGk'],
      // abrindo 1
      ['................', '................', '.kkkkkkkkkkkkkk.', 'kgllllllllllllgk',
        'kgwwwwwwwwwwwwgk', 'kGGGGGGGGGGGGGGk', 'kkkkkkkkkkkkkkkk', 'kiiiiiiiiiiiiiik', 'kiiiiyyyyyyiiiik'],
      // abrindo 2
      ['.kkkkkkkkkkkkkk.', 'kgwwwwwwwwwwwwgk', 'kGGGGGGGGGGGGGGk', 'kkkkkkkkkkkkkkkk',
        'kiiiiiiiiiiiiiik', 'kiiyyyyyyyyyyiik', 'kiyyyyYYYYyyyyik', 'kiyyyYYYYYYyyyik', 'kyyyYYYYYYYYyyyk'],
      // aberto
      ['kkkkkkkkkkkkkkkk', 'kGGGGGGGGGGGGGGk', 'kkkkkkkkkkkkkkkk', 'kiyyyyyyyyyyyyik',
        'kiyyyYYYYYYyyyik', 'kyyyYYYYYYYYyyyk', 'kyyYYYYYYYYYYyyk', 'kyYYYYYYYYYYYYyk', 'kyYYYYYYYYYYYYyk'],
    ];
    return lids.map((lid) => fromMap([...lid, ...body], pal));
  }

  const KEY = fromMap([
    '.kkk.......',
    'kgYgk......',
    'kY.gkkkkkk.',
    'kg.gggggggk',
    'kgggkkkgkgk',
    '.kkk...k.k.',
  ], { k: C.outline, g: C.gold, Y: C.goldL });

  const HEART_SMALL = fromMap([
    '.kk.kk.',
    'kpwkppk',
    'kwppppk',
    'kppppPk',
    '.kpPPk.',
    '..kPk..',
    '...k...',
  ], { k: C.outline, p: C.pink, P: C.pinkD, w: C.white });

  const HEART_BIG = fromMap([
    '..kkk...kkk..',
    '.kpppk.kpppk.',
    'kpwwppkppppPk',
    'kpwpppppppPPk',
    'kppppppppPPPk',
    'kppppppppPPPk',
    '.kpppppPPPPk.',
    '..kpppPPPPk..',
    '...kpPPPPk...',
    '....kPPPk....',
    '.....kPk.....',
    '......k......',
  ], { k: C.outline, p: C.pink, P: C.pinkD, w: C.white });

  const BUBBLE = fromMap([
    '.kkkkk.',
    'kwwgwwk',
    'kwwgwwk',
    'kwwgwwk',
    'kwwwwwk',
    'kwwgwwk',
    '.kkwkk.',
    '...k...',
  ], { k: C.outline, w: C.white, g: C.pinkD });

  /* Flores: cabeças pequenas em várias cores (desenhadas por quadro, com balanço) */
  const FLOWER_COLORS = [
    ['#ff8fc0', '#ffd6e8'], ['#c9a6ff', '#efe3ff'], ['#ffffff', '#fff6c2'], ['#8ec5ff', '#e2f0ff'], ['#ffd166', '#fff1b8'],
  ];

  /* =========================================================
     OBJETOS DAS FASES 4 E 5
     ========================================================= */
  /** Sebe do labirinto (16x16). face=true desenha a lateral escura (há chão abaixo). */
  function buildHedge(seed, face, flowers) {
    const r = seeded(seed);
    const { canvas, ctx } = makeCanvas(16, 16);
    const top = face ? 11 : 16;
    ctx.fillStyle = C.leaf;
    ctx.fillRect(0, 0, 16, top);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * 16), y = Math.floor(r() * top);
      ctx.fillStyle = r() < 0.5 ? C.leafL : C.leafD;
      ctx.fillRect(x, y, r() < 0.4 ? 2 : 1, 1);
    }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = C.leafXL; ctx.fillRect(Math.floor(r() * 15), Math.floor(r() * (top - 1)), 1, 1); }
    if (flowers) {
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * (top - 4));
        ctx.fillStyle = r() < 0.5 ? C.blossom : C.white;
        ctx.fillRect(x, y, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillStyle = C.gold; ctx.fillRect(x, y, 1, 1);
      }
    }
    if (face) {
      ctx.fillStyle = '#25523f';
      ctx.fillRect(0, top, 16, 16 - top);
      ctx.fillStyle = C.leafD;
      for (let x = 1; x < 16; x += 3) ctx.fillRect(x, top + 1, 1, 3);
      ctx.fillStyle = '#1c3d2f';
      ctx.fillRect(0, 15, 16, 1);
    }
    return canvas;
  }

  /** Nuvenzinha de chuva triste (obstáculo do labirinto) — 2 quadros. */
  function buildCloud(frame) {
    const { canvas, ctx } = makeCanvas(22, 20);
    const r = seeded(12);
    blob(ctx, [[11, 7, 6], [6, 9, 4.5], [16, 9, 4.5], [11, 10, 5]], 22, 14, [8, 5, 7], { outline: '#4e4270', d: '#8a7bb0', m: '#a99bd0', l: '#cfc4ea', xl: '#ece6fb' }, r, 2);
    ctx.fillStyle = C.outline;
    ctx.fillRect(8, 8, 1, 2); ctx.fillRect(13, 8, 1, 2);       // olhos
    ctx.fillRect(10, 11, 2, 1); ctx.fillRect(9, 12, 1, 1); ctx.fillRect(12, 12, 1, 1); // boquinha triste
    ctx.fillStyle = '#8ec5ff';
    const off = frame ? 2 : 0;
    [[5, 15], [10, 17], [15, 15], [8, 18], [14, 18]].forEach(([x, y], i) => {
      const yy = ((y + off + i) % 6) + 14;
      ctx.fillRect(x, yy, 1, 2);
    });
    return canvas;
  }

  /** Flor-santuário (ponto de descanso): apagada ou acesa. */
  function buildShrine(lit) {
    const p = lit ? { a: C.pink, b: C.pinkL, c: C.gold } : { a: '#9d8fbf', b: '#cfc4ea', c: '#ead6c4' };
    return fromMap([
      '...kk.kk...',
      '..kabkbak..',
      '.kabbbbbak.',
      'kaabbcbbaak',
      '.kabbbbbak.',
      '..kabkbak..',
      '...kkgkk...',
      '..kk.g.kk..',
      '.kgk.g.kgk.',
      '..kkkgkkk..',
      '.....g.....',
      '...sssss...',
    ], { k: C.outline, a: p.a, b: p.b, c: p.c, g: C.leafD, s: 'rgba(43,27,61,0.25)' });
  }

  /** Arco de rosas (48x46). */
  function buildArch() {
    const { canvas, ctx } = makeCanvas(48, 46);
    const r = seeded(88);
    ctx.fillStyle = 'rgba(43,27,61,0.25)';
    ctx.fillRect(2, 43, 10, 3); ctx.fillRect(36, 43, 10, 3);
    // postes
    [[4, 20], [38, 20]].forEach(([x, y]) => {
      ctx.fillStyle = C.outline; ctx.fillRect(x - 1, y, 8, 25);
      ctx.fillStyle = C.cream; ctx.fillRect(x, y, 6, 24);
      ctx.fillStyle = C.creamD; ctx.fillRect(x + 4, y, 2, 24);
    });
    // arco de folhas e rosas
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 48; x++) {
        const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24);
        if (y > 26 || d < 15.5 || d > 23) continue;
        const edge = d < 16.5 || d > 22;
        ctx.fillStyle = edge ? '#25523f' : (r() < 0.25 ? C.leafL : r() < 0.5 ? C.leafD : C.leaf);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // rosas ao longo do arco e descendo pelos postes
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (i / 15) * Math.PI;
      const x = Math.round(24 + Math.cos(a) * 19), y = Math.round(24 + Math.sin(a) * 19);
      ctx.fillStyle = i % 3 === 0 ? C.white : C.blossom;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = C.blossomD; ctx.fillRect(x, y, 1, 1);
    }
    for (let y = 26; y < 42; y += 5) {
      [[6, y], [40, y + 2]].forEach(([x, yy]) => {
        ctx.fillStyle = C.leafD; ctx.fillRect(x - 2, yy, 2, 3);
        ctx.fillStyle = C.blossom; ctx.fillRect(x + 1, yy + 1, 2, 2);
      });
    }
    return canvas;
  }

  /** Pedestal com a carta final (16x22). */
  function buildPedestal() {
    return fromMap([
      '...kkkkkkkkk....',
      '..kwwwwwwwwwk...',
      '..kwLwwwwwLwk...',
      '..kwwLwhwLwwk...',
      '..kwwwLhLwwwk...',
      '..kwwwwLwwwwk...',
      '...kkkkkkkkk....',
      '.kkkkkkkkkkkkk..',
      '.kcccccccccccck.',
      '.kCCCCCCCCCCCCk.',
      '..kkkkkkkkkkkk..',
      '...kccccccccK...',
      '...kccccccccK...',
      '...kcCccccccK...',
      '...kcCccccccK...',
      '...kccccccccK...',
      '...kccccccccK...',
      '..kkkkkkkkkkkk..',
      '.kcccccccccccck.',
      '.kCCCCCCCCCCCCk.',
      '.kkkkkkkkkkkkkk.',
      '.ssssssssssssss.',
    ], { k: C.outline, w: C.white, L: C.pinkL, h: C.pink, c: C.rockL, C: C.rock, K: C.rockD, s: 'rgba(43,27,61,0.25)' });
  }

  /** Fonte do jardim (48x40), base de pedra; a água é animada na fase. */
  function buildFountain() {
    const { canvas, ctx } = makeCanvas(48, 40);
    ctx.fillStyle = 'rgba(43,27,61,0.25)';
    ctx.beginPath(); ctx.ellipse(24, 35, 23, 5, 0, 0, Math.PI * 2); ctx.fill();
    const ell = (cx, cy, rx, ry, col) => {
      ctx.fillStyle = col;
      for (let y = -ry; y <= ry; y++) {
        const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
        ctx.fillRect(cx - w, cy + y, w * 2, 1);
      }
    };
    ell(24, 30, 22, 8, C.outline);
    ell(24, 29, 21, 7, C.rockD);
    ell(24, 27, 21, 7, C.rock);
    ell(24, 27, 18, 5, C.outline);
    ell(24, 27, 17, 4, C.water);
    ell(22, 26, 8, 2, C.waterL);
    ctx.fillStyle = C.outline; ctx.fillRect(21, 10, 6, 18);
    ctx.fillStyle = C.rockL; ctx.fillRect(22, 10, 4, 17);
    ell(24, 10, 9, 3, C.outline);
    ell(24, 9, 8, 2, C.rock);
    ell(24, 9, 6, 1, C.water);
    return canvas;
  }

  /* ---------- Construção do cache ---------- */
  const Sprites = {
    C,
    fromMap,
    flipH,
    tint,
    FLOWER_COLORS,
    built: false,

    build() {
      if (this.built) return;
      this.player = buildPlayer();
      this.partner = buildPartner();
      this.partnerFrames = buildPlayer(PARTNER_PAL);
      this.hedge = [buildHedge(61, false), buildHedge(62, false, true), buildHedge(63, false)];
      this.hedgeFace = [buildHedge(64, true), buildHedge(65, true, true), buildHedge(66, true)];
      this.cloud = [buildCloud(0), buildCloud(1)];
      this.shrine = [buildShrine(false), buildShrine(true)];
      this.arch = buildArch();
      this.pedestal = buildPedestal();
      this.fountain = buildFountain();
      this.grass = [1, 2, 3, 4, 5, 6].map(buildGrass);
      this.path = [11, 12, 13].map(buildPath);
      this.water = [0, 1, 2, 3, 4, 5, 6, 7].map(buildWater);
      this.bridge = buildBridge();
      this.trees = [buildTree('green', 3), buildTree('green', 9), buildTree('green', 21)];
      this.cherries = [buildTree('cherry', 5), buildTree('cherry', 14)];
      this.bushes = [buildBush(31, true), buildBush(37, false), buildBush(43, true)];
      this.rocks = [buildRock(51), buildRock(58)];
      this.fence = buildFence();
      this.house = buildHouse();
      this.lamp = buildLamp();
      this.lampOff = (() => {
        const { canvas, ctx } = makeCanvas(10, 26);
        ctx.drawImage(this.lamp, 0, 0);
        ctx.fillStyle = '#6a5a8c'; ctx.fillRect(2, 2, 6, 6);
        ctx.fillStyle = '#8a7bb0'; ctx.fillRect(3, 3, 2, 2);
        return canvas;
      })();
      this.sign = buildSign();
      this.mailbox = [buildMailbox(false), buildMailbox(true)];
      this.chest = buildChest();
      this.key = KEY;
      this.keyGlow = tint(KEY, C.white);
      this.heart = HEART_SMALL;
      this.heartWhite = tint(HEART_SMALL, C.white);
      this.heartBig = HEART_BIG;
      this.heartBigWhite = tint(HEART_BIG, C.white);
      this.bubble = BUBBLE;
      this.glow = this.makeGlow(64, 'rgba(255,233,168,1)');
      this.glowPink = this.makeGlow(64, 'rgba(255,156,203,1)');
      this.built = true;
    },

    /** Gradiente radial pré-renderizado (iluminação barata). */
    /** Desenha a imagem pixel art ampliada por um fator inteiro. */
    drawScaled(ctx, img, x, y, k) { ctx.drawImage(img, Math.round(x), Math.round(y), img.width * k, img.height * k); },

    makeGlow(size, color) {
      const { canvas, ctx } = makeCanvas(size, size);
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, color);
      g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return canvas;
    },
  };

  DMC.Sprites = Sprites;
})();
