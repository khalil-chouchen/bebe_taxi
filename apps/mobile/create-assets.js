/**
 * Run once from apps/mobile/ to generate placeholder PNG assets:
 *   node create-assets.js
 *
 * Creates: assets/icon.png, assets/adaptive-icon.png, assets/splash.png
 * All files are solid #F59E0B (Bebe Taxi gold) at the required sizes.
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcInput))]);
}

function createPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB
  // compression, filter, interlace = 0

  // One row = filter byte (0) + w * 3 RGB bytes
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const rawLines = Buffer.concat(Array.from({ length: h }, () => row));
  const compressed = zlib.deflateSync(rawLines, { level: 1 });

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// #F59E0B = 245, 158, 11
const R = 245, G = 158, B = 11;

const files = [
  ['icon.png',          1024, 1024],
  ['adaptive-icon.png', 1024, 1024],
  ['splash.png',         200,  400],  // small placeholder — Expo accepts any valid PNG
];

for (const [name, w, h] of files) {
  const dest = path.join(assetsDir, name);
  fs.writeFileSync(dest, createPNG(w, h, R, G, B));
  console.log(`Created ${dest}`);
}
console.log('\nDone. Run "npm start" to launch Expo.');
