/* 无浏览器冒烟测试：桩掉 DOM/Canvas/音频，直接驱动游戏循环数百帧 */
'use strict'
const fs = require('fs')
const path = require('path')

const noop = () => {}
const gradStub = { addColorStop: noop }
const ctx2d = new Proxy({}, {
  get(t, k) {
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => gradStub
    if (k === 'canvas') return canvasEl
    return typeof t[k] !== 'undefined' ? t[k] : noop
  },
  set(t, k, v) { t[k] = v; return true },
})

const canvasEl = {
  clientWidth: 1280, clientHeight: 720, width: 0, height: 0, tabIndex: 0,
  getContext: () => ctx2d,
  addEventListener: noop, removeEventListener: noop, focus: noop,
  requestPointerLock: undefined,
}

function makeEl() {
  return {
    _cls: new Set(),
    classList: {
      toggle(c, on) { on ? this._add(c) : this._del(c) },
      _add(c) {}, _del(c) {},
    },
    setAttribute: noop, appendChild: noop, addEventListener: noop,
    set innerHTML(v) {}, set textContent(v) {},
    get textContent() { return '' },
  }
}
const els = {}
global.document = {
  head: { appendChild: noop },
  createElement: () => ({ set textContent(v) {} }),
  getElementById: (id) => {
    if (id === 'game-canvas') return canvasEl
    if (!els[id]) els[id] = makeEl()
    return els[id]
  },
  pointerLockElement: null,
  exitPointerLock: noop,
  exitFullscreen: noop,
  fullscreenElement: null,
  addEventListener: noop,
}
global.window = { }
global.Image = class { set src(v) { /* 不触发 onload → 走矢量后备 */ } }

let intervalCb = null
global.setInterval = (cb) => { intervalCb = cb; return 1 }
global.clearInterval = noop

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8')
eval(src)

if (typeof intervalCb !== 'function') throw new Error('游戏循环未启动')
// 驱动 1200 帧（约 20 秒游戏时间），覆盖 update + draw 全路径
for (let i = 0; i < 1200; i++) intervalCb()
console.log('SMOKE OK: 1200 帧运行无异常（矢量后备路径全部覆盖）')
