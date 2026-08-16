#!/usr/bin/env node
/* 判断横向武器图的朝向：按列/行统计不透明像素，推断细长端（枪口/刀尖）方向 */
'use strict'
const fs = require('fs')
const zlib = require('zlib')

function decode(path) {
  const buf = fs.readFileSync(path)
  let off = 8, width = 0, height = 0, colorType = 0, bitDepth = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.slice(off + 8, off + 8 + len)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = 4, stride = width * bpp
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
      else { const pa = Math.abs(up - ul), pb = Math.abs(left - ul), pc = Math.abs(left + up - 2 * ul); const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul; v = b + pr }
      lines[row + x] = v & 0xff
    }
  }
  return { lines, width, height, stride, bpp }
}

for (const f of process.argv.slice(2)) {
  const { lines, width, height, stride, bpp } = decode(f)
  const colH = new Array(width).fill(0)
  const rowW = new Array(height).fill(0)
  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (lines[y * stride + x * bpp + 3] > 32) {
        colH[x]++
        rowW[y]++
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  const seg = (arr, a, b) => {
    let sum = 0, n = 0, mx = 0
    for (let i = a; i <= b; i++) { sum += arr[i]; n++; if (arr[i] > mx) mx = arr[i] }
    return { mean: n ? (sum / n).toFixed(1) : 0, max: mx }
  }
  const bw = maxX - minX + 1
  const q1 = Math.floor(minX + bw * 0.05), q4 = Math.floor(minX + bw * 0.95)
  const L = seg(colH, q1, q1 + Math.floor(bw * 0.12))
  const R = seg(colH, q4 - Math.floor(bw * 0.12), q4)
  console.log('=== ' + f.split('/').pop() + '  bbox:' + bw + 'x' + (maxY - minY + 1))
  console.log('  左端列高 mean=' + L.mean + ' max=' + L.max + ' | 右端列高 mean=' + R.mean + ' max=' + R.max)
  const tipSide = Number(L.max) < Number(R.max) * 0.7 ? '左端更细长 → 尖端朝左' : Number(R.max) < Number(L.max) * 0.7 ? '右端更细长 → 尖端朝右' : '两端相近（可能都有粗结构）'
  console.log('  判断: ' + tipSide)
}
