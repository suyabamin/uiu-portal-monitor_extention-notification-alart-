/**
 * Standalone Icon Generator
 * Generates valid PNG icon files (16, 32, 48, 128) using Node.js built-in zlib.
 * No external image libraries required.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = createCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePng(width, height, rgbaBuffer) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // Scanlines with filter byte 0
  const scanlineLength = width * 4;
  const rawScanlines = Buffer.alloc(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (scanlineLength + 1)] = 0; // Filter 0 (None)
    rgbaBuffer.copy(
      rawScanlines,
      y * (scanlineLength + 1) + 1,
      y * scanlineLength,
      (y + 1) * scanlineLength
    );
  }

  const compressedIdat = zlib.deflateSync(rawScanlines);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedIdat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcon(size) {
  const buffer = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.45;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // UIU Orange rounded icon with subtle gradient
        const t = y / size;
        const r = Math.round(249 - 50 * t); // #F97316 -> #C2410C
        const g = Math.round(115 - 50 * t);
        const b = Math.round(22 - 10 * t);

        // Academic symbol / "U" letter in white inside
        const nx = (x - center) / radius;
        const ny = (y - center) / radius;

        const inU = (
          (Math.abs(nx) <= 0.5 && ny >= -0.4 && ny <= 0.4) &&
          !(Math.abs(nx) < 0.25 && ny < 0.2)
        );

        if (inU && size >= 32) {
          buffer[idx] = 255;
          buffer[idx + 1] = 255;
          buffer[idx + 2] = 255;
          buffer[idx + 3] = 255;
        } else {
          buffer[idx] = r;
          buffer[idx + 1] = g;
          buffer[idx + 2] = b;
          buffer[idx + 3] = 255;
        }
      } else {
        // Transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  return writePng(size, size, buffer);
}

const outDir = path.resolve('assets/icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const pngData = generateIcon(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), pngData);
  console.log(`Generated icon${size}.png (${size}x${size})`);
}
