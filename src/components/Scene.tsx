import { useEffect, useMemo } from 'react';
import type { Phase } from '../domain/program';
import type { Boss, TimeOfDay } from '../domain/world';
import { heroPalette, heroRows, mix, monsterPalette, monsterRows, Pixels } from './Sprite';

const W = 160;
const H = 72;
const GROUND_Y = 54;
const FEET_Y = 65;
const INK = '#11181c';
const PAGE_THEME = '#11181c';

const SKIES: Record<TimeOfDay | 'boss', string[]> = {
  night: ['#0b1026', '#101734', '#161f42', '#1d2a50', '#27375e', '#32456b'],
  dawn: ['#2b2a55', '#51386d', '#8a4a78', '#c9636d', '#ee9a6a', '#f7c98a'],
  day: ['#2f6ea3', '#3e85b8', '#56a0c9', '#74b8d6', '#97cde0', '#bfe2e6'],
  dusk: ['#1f2350', '#3f2a63', '#743371', '#b34366', '#e26a56', '#f49f55'],
  boss: ['#160a18', '#2a0f22', '#451426', '#65182a', '#86222c', '#a93a30'],
};

// Manzara renkleri tek yerde tanımlı, saat ve Boss günü bunları aynı ışıkla boyar.
const LIGHT: Record<TimeOfDay | 'boss', { color: string; amount: number }> = {
  day: { color: '#ffffff', amount: 0 },
  dawn: { color: '#5a2f60', amount: 0.32 },
  dusk: { color: '#4a1f55', amount: 0.45 },
  night: { color: '#0b1226', amount: 0.66 },
  boss: { color: '#2a0812', amount: 0.62 },
};

const LAND: Record<Phase['key'], { far: string; mid: string; ground: string; ground2: string; trail: string; farAmp: number; midAmp: number; sharp: boolean }> = {
  temel: { far: '#6a9a8a', mid: '#3f7a55', ground: '#4c8a3f', ground2: '#3a6e32', trail: '#a3895a', farAmp: 18, midAmp: 9, sharp: false },
  yukselis: { far: '#8496ae', mid: '#5f6f86', ground: '#7a7f6a', ground2: '#5f6553', trail: '#a59c86', farAmp: 40, midAmp: 22, sharp: true },
  ustalik: { far: '#a0acc6', mid: '#6f7994', ground: '#7d7f8e', ground2: '#63656f', trail: '#b5b3b8', farAmp: 44, midAmp: 24, sharp: true },
};

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function ridge(x: number, seed: number, amp: number, sharp: boolean): number {
  const wave = (freq: number, phase: number) => {
    const value = Math.abs(Math.sin(x * freq + phase));
    return sharp ? 1 - value : value;
  };
  return Math.round(amp * (0.62 * wave(0.031, seed) + 0.27 * wave(0.083, seed * 2) + 0.11 * wave(0.21, seed * 3)));
}

function pine(pixels: Pixels, x: number, base: number, height: number, leaf: string, leafDark: string, trunk: string) {
  pixels.rect(trunk, x, base - 2, 1, 2);
  for (let row = 0; row < height; row++) {
    const half = Math.floor((row % 3) + row / 3);
    const y = base - 2 - height + row;
    pixels.rect(leafDark, x - half, y, half * 2 + 1, 1);
    if (half > 0) pixels.rect(leaf, x - half + 1, y, half, 1);
  }
}

function disc(pixels: Pixels, color: string, cx: number, cy: number, radius: number, cut?: { x: number; y: number }) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y > radius * radius + 1) continue;
      if (cut && (x - cut.x) ** 2 + (y - cut.y) ** 2 < radius * radius) continue;
      pixels.rect(color, cx + x, cy + y);
    }
  }
}

function castle(pixels: Pixels, x: number, y: number, tint: (color: string) => string, windowColor: string) {
  const stone = tint('#7b7f96');
  const stoneDark = tint('#5c6078');
  const roof = tint('#5a3a5f');
  pixels.rect(stone, x, y - 12, 34, 12);
  for (let cren = 0; cren < 34; cren += 4) pixels.rect(stone, x + cren, y - 14, 2, 2);
  pixels.rect(stoneDark, x + 13, y - 7, 8, 7);
  for (const [tx, height] of [
    [x - 5, 22],
    [x + 12, 30],
    [x + 31, 20],
  ] as const) {
    pixels.rect(stone, tx, y - height, 8, height);
    pixels.rect(stoneDark, tx + 6, y - height, 2, height);
    for (let step = 0; step < 4; step++) pixels.rect(roof, tx + step, y - height - 4 + step, 8 - step * 2 > 0 ? 8 - step * 2 : 1, 1);
    pixels.rect(windowColor, tx + 3, y - height + 5, 2, 3);
  }
  pixels.rect(tint('#3c3f55'), x + 15, y - 34 - 7, 1, 7);
  pixels.rect('#c9414f', x + 16, y - 34 - 7, 5, 3);
}

function buildLayers(phase: Phase['key'], time: TimeOfDay, seed: number, bossPending: boolean) {
  const key = bossPending ? 'boss' : time;
  const land = LAND[phase];
  const light = LIGHT[key];
  const tint = (color: string) => mix(color, light.color, light.amount);
  const rand = random(seed);
  const heavens = new Pixels();
  const back = new Pixels();
  const front = new Pixels();
  const starsA = new Pixels();
  const starsB = new Pixels();
  const clouds = new Pixels();

  // Gökyüzü: bantlar arasında bir satır nokta dokusu.
  const sky = SKIES[key];
  sky.forEach((color, index) => {
    heavens.rect(color, 0, index * 9, W, 9);
    if (sky[index + 1]) {
      for (let x = (index % 2) * 1; x < W; x += 2) heavens.rect(sky[index + 1], x, index * 9 + 8);
    }
  });

  if (key === 'night' || key === 'boss' || key === 'dusk' || key === 'dawn') {
    const count = key === 'night' ? 34 : 12;
    for (let index = 0; index < count; index++) {
      const layer = index % 3 === 0 ? starsB : starsA;
      layer.rect(index % 5 === 0 ? '#fff6c9' : '#c9d8ff', Math.floor(rand() * W), Math.floor(rand() * (key === 'night' ? 34 : 14)));
    }
  }

  if (key === 'day') disc(heavens, '#fff0b0', 130, 12, 6);
  if (key === 'dawn') disc(heavens, '#ffe0a0', 28, 38, 8);
  if (key === 'dusk') disc(heavens, '#ffb36a', 128, 36, 9);
  if (key === 'night') disc(heavens, '#e8ecf5', 128, 12, 6, { x: 3, y: -2 });
  if (key === 'boss') disc(heavens, '#e2564a', 128, 13, 8);

  if (key !== 'night' && key !== 'boss') {
    const cloud = mix('#ffffff', sky[2], key === 'day' ? 0.05 : 0.55);
    for (const [cx, cy] of [
      [18, 10],
      [70, 18],
      [108, 7],
    ] as const) {
      clouds.rect(cloud, cx, cy, 16, 2);
      clouds.rect(cloud, cx + 3, cy - 2, 8, 2);
      clouds.rect(cloud, cx - 3, cy + 2, 22, 1);
    }
  }

  // Uzak ve yakın sırtlar.
  const far = tint(land.far);
  const snow = tint('#eef4f8');
  for (let x = 0; x < W; x++) {
    const top = GROUND_Y - 2 - ridge(x, seed % 7, land.farAmp, land.sharp);
    back.rect(far, x, top, 1, GROUND_Y - top);
    if (land.sharp && top < 26) back.rect(snow, x, top, 1, Math.ceil((26 - top) * 0.55) + (x % 3 === 0 ? 1 : 0));
  }
  const mid = tint(land.mid);
  for (let x = 0; x < W; x++) {
    const top = GROUND_Y - ridge(x, seed % 7 + 3, land.midAmp, land.sharp);
    back.rect(mid, x, top, 1, GROUND_Y - top);
  }

  // Zemin ve patika.
  const ground = tint(land.ground);
  const ground2 = tint(land.ground2);
  back.rect(ground, 0, GROUND_Y, W, H - GROUND_Y);
  for (let index = 0; index < 90; index++) {
    back.rect(ground2, Math.floor(rand() * W), GROUND_Y + Math.floor(rand() * 14), rand() > 0.6 ? 2 : 1, 1);
  }
  const trail = tint(land.trail);
  for (let x = 0; x < W; x++) {
    const y = 62 + Math.round(Math.sin(x * 0.06 + seed) * 1);
    back.rect(trail, x, y, 1, 3);
    if (x % 5 === 0) back.rect(ground2, x, y + 1, 1, 1);
  }

  // Bölgeye özgü süsler.
  const windowColor = key === 'day' ? tint('#30364a') : '#f7c95e';
  if (phase === 'temel') {
    const leaf = tint('#2f7a45');
    const leafDark = tint('#1f5a36');
    const trunk = tint('#5a3f28');
    for (const [x, height] of [
      [5, 13],
      [13, 10],
      [62, 12],
      [74, 9],
      [92, 14],
      [104, 10],
      [118, 13],
      [131, 16],
      [142, 11],
      [153, 14],
    ] as const) {
      pine(back, x, GROUND_Y + 2, height, leaf, leafDark, trunk);
    }
    // Çadır
    for (let row = 0; row < 9; row++) {
      back.rect(tint('#c98a3e'), 26 - row, 47 + row, row + 1, 1);
      back.rect(tint('#a56c2c'), 27, 47 + row, row + 1, 1);
    }
    back.rect(tint('#3a2a1c'), 25, 52, 3, 4);
  }
  if (phase === 'yukselis') {
    const pole = tint('#4a3a2a');
    back.rect(pole, 14, 34, 1, 22);
    back.rect(pole, 66, 38, 1, 18);
    const flags = ['#c9414f', '#f2b441', '#6fcf7f', '#6cc4e8', '#c58be0'];
    for (let x = 16; x < 66; x += 5) {
      const y = 35 + Math.round(Math.sin(((x - 14) / 52) * Math.PI) * 6);
      back.rect(tint('#3a3a3a'), x - 1, y - 1, 5, 1);
      back.rect(tint(flags[Math.floor(x / 5) % flags.length]), x, y, 3, 3);
    }
    for (const [x, y, w] of [
      [8, 56, 7],
      [84, 55, 9],
      [136, 56, 11],
      [150, 54, 6],
    ] as const) {
      back.rect(tint('#5f6470'), x, y, w, 3);
      back.rect(tint('#7c8290'), x + 1, y - 2, w - 2, 2);
    }
  }
  if (phase === 'ustalik') {
    castle(back, 104, GROUND_Y + 1, tint, windowColor);
    for (const x of [30, 62]) {
      back.rect(tint('#55586a'), x, 46, 4, 10);
      back.rect('#f2b441', x + 1, 44, 2, 2);
    }
  }

  // Sayfaya yumuşak geçiş.
  for (let x = 0; x < W; x++) {
    if (x % 4 === 0) front.rect(INK, x, 67);
    if (x % 2 === 0) front.rect(INK, x, 68);
    if (x % 4 !== 3) front.rect(INK, x, 69);
  }
  front.rect(INK, 0, 70, W, 2);

  return { heavens, back, front, starsA, starsB, clouds };
}

function Flame({ x, y }: { x: number; y: number }) {
  const logs = new Pixels();
  logs.rect('#5a3f28', x - 3, y, 7, 1);
  logs.rect('#3c2a1c', x - 2, y + 1, 5, 1);
  const a = new Pixels();
  a.rect('#ec6b3a', x - 2, y - 3, 5, 3);
  a.rect('#f2b441', x - 1, y - 5, 3, 3);
  a.rect('#fff0b0', x, y - 3, 1, 2);
  const b = new Pixels();
  b.rect('#ec6b3a', x - 2, y - 2, 5, 2);
  b.rect('#ec6b3a', x - 1, y - 4, 3, 2);
  b.rect('#f2b441', x - 1, y - 3, 2, 2);
  b.rect('#f2b441', x, y - 6, 1, 3);
  return (
    <>
      <g>{logs.render()}</g>
      <g className="scene-flick-a">{a.render()}</g>
      <g className="scene-flick-b">{b.render()}</g>
    </>
  );
}

interface SceneProps {
  phase: Phase['key'];
  time: TimeOfDay;
  /** Evre içindeki ilerleme, 0-1: karakter patikada buna göre ilerler. */
  journey: number;
  tier: number;
  boss?: Boss;
  won?: boolean;
  seed?: number;
  /** Tarayıcı üst çubuğu gökyüzünün rengini alsın. */
  tintStatusBar?: boolean;
}

export function Scene({ phase, time, journey, tier, boss, won = false, seed = 5, tintStatusBar = false }: SceneProps) {
  const bossPending = boss !== undefined;
  const layers = useMemo(() => {
    const built = buildLayers(phase, time, seed, bossPending);
    return {
      heavens: built.heavens.render(),
      back: built.back.render(),
      front: built.front.render(),
      starsA: built.starsA.render(),
      starsB: built.starsB.render(),
      clouds: built.clouds.render(),
    };
  }, [phase, time, seed, bossPending]);

  const heroX = bossPending ? 62 : Math.round(44 + Math.min(Math.max(journey, 0), 1) * 62);
  const heroY = FEET_Y - 15;
  const actors = useMemo(() => {
    const hero = new Pixels();
    hero.rect('#00000055', 3, 15, 9, 1);
    hero.sprite(heroRows(tier), heroPalette(tier), 0, 0);
    return hero.render();
  }, [tier]);
  const monster = useMemo(() => {
    if (!boss) return null;
    const pixels = new Pixels();
    pixels.sprite(monsterRows(boss.kind), monsterPalette(boss), 0, 0, 2);
    return pixels.render();
  }, [boss]);
  const banner = useMemo(() => {
    if (!won) return null;
    const pixels = new Pixels();
    pixels.rect('#5a3f28', 0, 0, 1, 15);
    pixels.rect('#f2b441', 1, 0, 8, 2);
    pixels.rect('#f2b441', 1, 2, 6, 2);
    pixels.rect('#f2b441', 1, 4, 4, 1);
    return pixels.render();
  }, [won]);

  useEffect(() => {
    if (!tintStatusBar) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', SKIES[bossPending ? 'boss' : time][0]);
    return () => meta?.setAttribute('content', PAGE_THEME);
  }, [tintStatusBar, time, bossPending]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-testid="scene"
    >
      <g>{layers.heavens}</g>
      <g className="scene-twinkle">{layers.starsA}</g>
      <g className="scene-twinkle-late">{layers.starsB}</g>
      <g className="scene-drift">{layers.clouds}</g>
      <g>{layers.back}</g>
      {phase === 'temel' && <Flame x={37} y={62} />}
      {banner && <g transform={`translate(${heroX + 16} ${FEET_Y - 15})`}>{banner}</g>}
      <g transform={`translate(${heroX} ${heroY})`}>
        <g className="scene-bob">{actors}</g>
      </g>
      {monster && (
        <g transform={`translate(112 ${FEET_Y - 26})`}>
          <g className="scene-hover">{monster}</g>
        </g>
      )}
      <g>{layers.front}</g>
    </svg>
  );
}
