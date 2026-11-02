// Özgün PWA ikonlarını bağımlılıksız üretir: piksel "66" ve altında bir XP çubuğu.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const INK = [17, 24, 28];
const PANEL = [36, 50, 58];
const AMBER = [242, 180, 65];
const AMBER_DARK = [176, 115, 32];
const MOSS = [111, 207, 127];

const SIX = ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'];

function buildGrid(size, offset) {
  const grid = Array.from({ length: size }, () => Array(size).fill(INK));
  const put = (x, y, color) => {
    grid[y + offset][x + offset] = color;
  };
  for (const startX of [5, 17]) {
    SIX.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        if (cell !== '#') return;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            put(startX + colIndex * 2 + dx, 5 + rowIndex * 2 + dy, dy === 1 && rowIndex === 6 ? AMBER_DARK : AMBER);
          }
        }
      });
    });
  }
  for (let x = 5; x < 27; x++) {
    for (let y = 22; y < 25; y++) put(x, y, x < 19 ? MOSS : PANEL);
  }
  return grid;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(grid, size) {
  const gridSize = grid.length;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let cursor = 0;
  for (let y = 0; y < size; y++) {
    raw[cursor++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = grid[Math.floor((y * gridSize) / size)][Math.floor((x * gridSize) / size)];
      raw[cursor++] = r;
      raw[cursor++] = g;
      raw[cursor++] = b;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(path, grid, size) {
  const target = join(publicDir, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(grid, size));
}

const regular = buildGrid(32, 0);
// Maskable ikonda içerik, Android'in güvenli bölgesine sığsın diye daha geniş bir boşlukla çizilir.
const maskable = buildGrid(48, 8);

save('favicon.png', regular, 64);
save('icons/icon-192.png', regular, 192);
save('icons/icon-512.png', regular, 512);
save('icons/apple-touch-icon.png', regular, 180);
save('icons/icon-maskable-512.png', maskable, 512);
