#!/usr/bin/env node
/* PNG 透明度/主体分析器：解析 RGBA PNG，输出不透明占比与内容包围盒 */
'use strict'
const fs = require('fs')
const zlib = require('zlib')

function analyze(path) {
  const buf = fs.readFileSync(path)
  if (buf.readUInt32BE(0) !== 0x89504e47) return { error: 'not png' }
  let off = 8
  let width = 0, height = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.slice(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (bitDepth !== 8 || colorType !== 6) return { width, height, bitDepth, colorType, error: 'unsupported (need 8-bit RGBA)' }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const lines = Buffer.alloc(stride * height)
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]
    const row = y * stride
    for (let x = 0; x < stride; x++) {
      const b = raw[p++]
      const left = x >= bpp ? lines[row + x - bpp] : 0
      const up = y > 0 ? lines[row - stride + x] : 0
      const ul = y > 0 && x >= bpp ? lines[row - stride + x - bpp] : 0
      let v
      if (filter === 0) v = b
      else if (filter === 1) v = b + left
      else if (filter === 2) v = b + up
      else if (filter === 3) v = b + ((left + up) >> 1)
      else {
        const pa = Math.abs(up - ul), pb = Math.abs(left - ul), pc = Math.abs(left + up - 2 * ul)
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul
        v = b + pr
      }
      lines[row + x] = v & 0xff
    }
  }
  let opaque = 0, semi = 0
  let minX = width, minY = height, maxX = -1, maxY = -1
  let sumX = 0, sumY = 0, cnt = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = lines[y * stride + x * bpp + 3]
      if (a > 200) opaque++
      else if (a > 16) semi++
      if (a > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        sumX += x; sumY += y; cnt++
      }
    }
  }
  const total = width * height
  const hasContent = maxX >= 0
  const bw = hasContent ? maxX - minX + 1 : 0
  const bh = hasContent ? maxY - minY + 1 : 0
  return {
    width, height,
    opaquePct: (opaque / total * 100).toFixed(1),
    semiPct: (semi / total * 100).toFixed(1),
    bbox: hasContent ? bw + 'x' + bh : 'none',
    bboxRatio: hasContent ? (bw / bh).toFixed(2) : '-',
    bboxFill: hasContent ? (cnt / (bw * bh) * 100).toFixed(0) + '%' : '-',
    centerX: hasContent ? (sumX / cnt / width).toFixed(2) : '-',
    centerY: hasContent ? (sumY / cnt / height).toFixed(2) : '-',
  }
}

for (const f of process.argv.slice(2)) {
  const r = analyze(f)
  console.log(f.split('/').pop().padEnd(28), JSON.stringify(r))
}
