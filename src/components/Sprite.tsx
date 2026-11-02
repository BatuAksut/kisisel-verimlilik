import type { Boss, MonsterKind } from '../domain/world';

/** Aynı renkteki pikselleri tek <path> içinde toplar; yüzlerce piksel olsa da DOM küçük kalır. */
export class Pixels {
  private paths = new Map<string, string>();

  rect(color: string, x: number, y: number, w = 1, h = 1) {
    this.paths.set(color, `${this.paths.get(color) ?? ''}M${x} ${y}h${w}v${h}h${-w}z`);
  }

  sprite(rows: readonly string[], palette: Record<string, string>, ox: number, oy: number, scale = 1) {
    rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        const color = palette[cell];
        if (color) this.rect(color, ox + x * scale, oy + y * scale, scale, scale);
      });
    });
  }

  render() {
    return [...this.paths].map(([color, d]) => <path key={color} fill={color} d={d} />);
  }
}

export function mix(a: string, b: string, amount: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);
  const blend = (start: number) =>
    Math.round(channel(a, start) * (1 - amount) + channel(b, start) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

const HERO_BASE = [
  '...............',
  '...............',
  '......hhh......',
  '.....hhhhh.....',
  '.....sssss.....',
  '.....seses.....',
  '.....sssss.....',
  '......sss......',
  '....ccccccc....',
  '...scccccccs...',
  '...s.ccccc.s...',
  '.....ccccc.....',
  '.....dd.dd.....',
  '.....dd.dd.....',
  '.....bb.bb.....',
];

const STAFF = ['.............g.', '.............k.'];
const SWORD = [
  '............w..',
  '............w..',
  '............w..',
  '............w..',
  '............w..',
  '............w..',
  '...........ggg.',
  '............k..',
];

// Her rütbe bir öncekinin üstüne eşya ekler. Satır numarası: { satır: üst katman }.
const TIER_LAYERS: Record<number, string>[][] = [
  [],
  [
    { 8: '..kk...........', 9: '..kk...........', 10: '..kk...........' },
    { 4: STAFF[0], 5: STAFF[1], 6: STAFF[1], 7: STAFF[1], 8: STAFF[1], 9: STAFF[1], 10: STAFF[1], 11: STAFF[1], 12: STAFF[1], 13: STAFF[1], 14: STAFF[1] },
  ],
  [Object.fromEntries(SWORD.map((row, index) => [index + 3, row]))],
  [
    Object.fromEntries(SWORD.map((row, index) => [index + 3, row])),
    { 1: '.......r.......', 2: '......mmm......', 3: '.....mmmmm.....', 9: '....r.....r....', 10: '....r.....r....', 11: '....r.....r....', 12: '....r.....r....' },
  ],
  [
    Object.fromEntries(SWORD.map((row, index) => [index + 3, row])),
    { 0: '.....g.g.g.....', 1: '.....ggggg.....', 9: '....r.....r....', 10: '....r.....r....', 11: '....r.....r....', 12: '...rr.....rr...', 13: '...r.......r...' },
  ],
];

const SKIN = { s: '#f0c9a0', e: '#2a1c14', b: '#3c2a22' };
const HERO_PALETTES = [
  { ...SKIN, h: '#6b4427', c: '#6d8a4a', d: '#5a4632', k: '#7c5a36', g: '#f2b441' },
  { ...SKIN, h: '#6b4427', c: '#3f8f8a', d: '#4a4a5a', k: '#8a6236', g: '#f2b441' },
  { ...SKIN, h: '#6b4427', c: '#9aa8b5', d: '#4a5563', k: '#6b4427', g: '#f2b441', w: '#e4eef2' },
  { ...SKIN, h: '#6b4427', c: '#b8c4cf', d: '#556070', k: '#6b4427', g: '#f2b441', w: '#f4fbff', m: '#d4dde4', r: '#c9414f' },
  { ...SKIN, h: '#f2d27a', c: '#f2b441', d: '#b07320', k: '#6b4427', g: '#ffe28a', w: '#ffffff', r: '#a83a8a' },
];

export function heroRows(tier: number): string[] {
  const rows = HERO_BASE.map((row) => [...row]);
  for (const layer of TIER_LAYERS[tier] ?? []) {
    for (const [index, overlay] of Object.entries(layer)) {
      [...overlay].forEach((cell, x) => {
        if (cell !== '.') rows[Number(index)][x] = cell;
      });
    }
  }
  return rows.map((row) => row.join(''));
}

export function heroPalette(tier: number): Record<string, string> {
  return HERO_PALETTES[tier] ?? HERO_PALETTES[0];
}

const MONSTERS: Record<MonsterKind, string[]> = {
  shade: [
    '....oooooo....',
    '..oooooooooo..',
    '.oooooooooooo.',
    '.ooyyooooyyoo.',
    '.ooyyooooyyoo.',
    '.oooooooooooo.',
    '.oooddddddooo.',
    '.oooddddddooo.',
    '.oooooooooooo.',
    'oooooooooooooo',
    'oooooooooooooo',
    'oo.oooo.oooo.o',
    'o...oo...oo...',
  ],
  golem: [
    '...dddddddd...',
    '...oooooooo...',
    '...oyyooyyo...',
    '...oooooooo...',
    '...odddddoo...',
    'dddooooooooddd',
    'oooooooooooooo',
    'ooo.oooooo.ooo',
    'ooo.oodooo.ooo',
    'dd..oooooo..dd',
    '....oo..oo....',
    '...ooo..ooo...',
    '...ddd..ddd...',
  ],
  horned: [
    '.o..........o.',
    '.oo........oo.',
    '..oooooooooo..',
    '..oooooooooo..',
    '..oyyooooyyo..',
    '..oooooooooo..',
    '...oddddddo...',
    '...oyoyoyoo...',
    '..oooooooooo..',
    '.oooooooooooo.',
    'oo.oooooooo.oo',
    'o..oooooooo..o',
    '...oo....oo...',
  ],
  gazer: [
    '....oooooo....',
    '..oooooooooo..',
    '.oooyyyyyyooo.',
    'oooyyyyyyyyooo',
    'oooyydddyyyooo',
    'oooyydddyyyooo',
    'oooyyyyyyyyooo',
    '.oooyyyyyyooo.',
    '..oooooooooo..',
    '...o.oo.oo.o..',
    '...o..o..o..o.',
    '..o...o...o..o',
  ],
};

export function monsterRows(kind: MonsterKind): string[] {
  return MONSTERS[kind];
}

export function monsterPalette(boss: Pick<Boss, 'color'>): Record<string, string> {
  return { o: boss.color, d: mix(boss.color, '#0b0a12', 0.65), y: '#fff2a8' };
}

function SpriteSvg({ rows, palette, scale, className }: { rows: string[]; palette: Record<string, string>; scale: number; className?: string }) {
  const pixels = new Pixels();
  pixels.sprite(rows, palette, 0, 0);
  const width = rows[0].length;
  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length}`}
      width={width * scale}
      height={rows.length * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={`inline-block shrink-0 ${className ?? ''}`}
    >
      {pixels.render()}
    </svg>
  );
}

export function HeroSprite({ tier, scale = 3, className }: { tier: number; scale?: number; className?: string }) {
  return <SpriteSvg rows={heroRows(tier)} palette={heroPalette(tier)} scale={scale} className={className} />;
}

export function MonsterSprite({ boss, scale = 4, className }: { boss: Boss; scale?: number; className?: string }) {
  return <SpriteSvg rows={monsterRows(boss.kind)} palette={monsterPalette(boss)} scale={scale} className={className} />;
}
