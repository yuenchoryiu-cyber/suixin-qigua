// 生成简易安装图标（绿十字，256×256 PNG）
// 用法: node scripts/make-icon.mjs

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'build')
const size = 256

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

const raw = Buffer.alloc((size * 4 + 1) * size)
for (let y = 0; y < size; y++) {
  const row = y * (size * 4 + 1)
  raw[row] = 0
  for (let x = 0; x < size; x++) {
    const i = row + 1 + x * 4
    const cx = x - size / 2
    const cy = y - size / 2
    const arm = Math.abs(cx) < size * 0.12 || Math.abs(cy) < size * 0.12
    const inCircle = cx * cx + cy * cy < (size * 0.42) ** 2
    if (inCircle && arm) {
      raw[i] = 57
      raw[i + 1] = 255
      raw[i + 2] = 20
      raw[i + 3] = 255
    } else if (inCircle) {
      raw[i] = 8
      raw[i + 1] = 28
      raw[i + 2] = 8
      raw[i + 3] = 255
    } else {
      raw[i] = 0
      raw[i + 1] = 0
      raw[i + 2] = 0
      raw[i + 3] = 0
    }
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(size, 0)
ihdr.writeUInt32BE(size, 4)
ihdr[8] = 8
ihdr[9] = 6
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

fs.mkdirSync(outDir, { recursive: true })
const out = path.join(outDir, 'icon.png')
fs.writeFileSync(out, png)
console.log('wrote', out)
