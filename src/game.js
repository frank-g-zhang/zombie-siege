/* ============================================================================
 * 末日突围 · ZOMBIE SIEGE
 * 第一人称丧尸射击游戏 —— 纯 HTML5 Canvas 2D 实现，无第三方依赖。
 *
 * 由 DeepSeek Harness 动态 Cordis 插件（zomfps-1/pkg-3）迁移而来的独立版本。
 * 主要改动：React 界面 → 原生 DOM；Cordis timer 服务 → setInterval；
 * 插槽注册 → 页面直接承载游戏界面。
 * ==========================================================================*/
;(function () {
  'use strict'

  // ============================ 样式 ============================
  const CSS = [
    'body{margin:0;background:#000}',
    '.zfps-hidden{display:none!important}',
    '.zfps-root{position:fixed;inset:0;background:#000;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,PingFang SC,Microsoft YaHei,sans-serif;color:#eee}',
    '.zfps-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;cursor:crosshair}',
    '.zfps-topbar{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:linear-gradient(rgba(0,0,0,.6),transparent);z-index:5}',
    '.zfps-topbar-title{font-size:13px;letter-spacing:.24em;color:#e8d9c8;font-weight:700}',
    '.zfps-topbar-actions{display:flex;gap:8px}',
    '.zfps-mini-btn{padding:6px 14px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.08);color:#ddd;font-size:12px;cursor:pointer}',
    '.zfps-mini-btn:hover{background:rgba(255,255,255,.16)}',
    '.zfps-screen{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,5,7,.6);backdrop-filter:blur(4px);z-index:4;padding:20px}',
    '.zfps-panel{width:min(540px,92vw);max-height:92vh;overflow:auto;background:rgba(18,11,14,.93);border:1px solid rgba(255,85,50,.4);border-radius:18px;padding:34px 36px;text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.65),0 0 70px rgba(255,60,30,.1)}',
    '.zfps-launcher-badge{display:inline-block;font-size:11px;letter-spacing:.18em;color:#ffb199;background:rgba(255,70,40,.1);border:1px solid rgba(255,90,50,.35);padding:3px 10px;border-radius:999px;margin-bottom:12px}',
    '.zfps-panel h1{margin:0;font-size:32px;font-weight:800;letter-spacing:.14em;background:linear-gradient(90deg,#ffdcc8,#ff5a38);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '.zfps-panel .zfps-panel-sub{margin:6px 0 14px;font-size:11px;letter-spacing:.38em;color:#8a7d76}',
    '.zfps-panel p{margin:0 0 14px;font-size:13.5px;color:#c9bfb8;line-height:1.8}',
    '.zfps-panel h2{margin:0 0 10px;font-size:26px;font-weight:800;letter-spacing:.08em;color:#ff9d80}',
    '.zfps-stats{display:flex;justify-content:center;gap:10px;margin:16px 0 22px;flex-wrap:wrap}',
    '.zfps-stat{min-width:96px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px}',
    '.zfps-stat b{display:block;font-size:24px;color:#ffd9c4}',
    '.zfps-stat span{font-size:11px;color:#9a9088;letter-spacing:.14em}',
    '.zfps-controls-mini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 18px;text-align:left;margin:4px 0 18px;font-size:12.5px}',
    '.zfps-controls-mini b{color:#e8d9c8;font-weight:600;margin-right:8px}',
    '.zfps-controls-mini span{color:#9a9088}',
    '.zfps-btn{display:block;min-width:200px;margin:8px auto;padding:13px 26px;border:0;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:.24em;color:#fff;cursor:pointer;background:linear-gradient(180deg,#ff7a45,#d9301c);box-shadow:0 6px 22px rgba(255,60,30,.35),inset 0 1px 0 rgba(255,255,255,.25)}',
    '.zfps-btn:hover{transform:translateY(-1px)}',
    '.zfps-btn.sec{background:rgba(255,255,255,.09);box-shadow:none;border:1px solid rgba(255,255,255,.15)}',
    '.zfps-panel .zfps-note{font-size:11.5px;color:#7d736c;margin-top:10px}',
  ].join('')
  const styleEl = document.createElement('style')
  styleEl.textContent = CSS
  document.head.appendChild(styleEl)

  // ============================ 音效（程序化合成） ============================
  function createAudio() {
    let ac = null
    let master = null
    let ambience = null
    let enabled = true
    try {
      if (typeof window === 'undefined') return null
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      function makeNoiseBuffer(seconds) {
        const len = Math.max(1, Math.floor(ac.sampleRate * seconds))
        const buf = ac.createBuffer(1, len, ac.sampleRate)
        const d = buf.getChannelData(0)
        let last = 0
        for (let i = 0; i < len; i++) {
          last = last * 0.82 + (Math.random() * 2 - 1) * 0.18
          d[i] = last
        }
        return buf
      }
      function startAmbience() {
        if (!ac || !master || ambience) return
        try {
          const bus = ac.createGain()
          const wind = ac.createBufferSource()
          const windHigh = ac.createBiquadFilter()
          const windLow = ac.createBiquadFilter()
          const windGain = ac.createGain()
          const droneGain = ac.createGain()
          const droneA = ac.createOscillator()
          const droneB = ac.createOscillator()
          const lfo = ac.createOscillator()
          const lfoGain = ac.createGain()
          bus.gain.value = 0.42
          wind.buffer = makeNoiseBuffer(4)
          wind.loop = true
          windHigh.type = 'highpass'
          windHigh.frequency.value = 70
          windLow.type = 'lowpass'
          windLow.frequency.value = 760
          windGain.gain.value = 0.12
          droneA.type = 'sine'
          droneA.frequency.value = 43
          droneB.type = 'triangle'
          droneB.frequency.value = 56
          droneGain.gain.value = 0.035
          lfo.type = 'sine'
          lfo.frequency.value = 0.08
          lfoGain.gain.value = 0.025
          wind.connect(windHigh)
          windHigh.connect(windLow)
          windLow.connect(windGain)
          windGain.connect(bus)
          droneA.connect(droneGain)
          droneB.connect(droneGain)
          droneGain.connect(bus)
          lfo.connect(lfoGain)
          lfoGain.connect(windGain.gain)
          bus.connect(master)
          wind.start()
          droneA.start()
          droneB.start()
          lfo.start()
          ambience = { bus, wind, droneA, droneB, lfo }
        } catch (e) {}
      }
      function ensure() {
        try {
          if (!ac) {
            ac = new AC()
            master = ac.createGain()
            const limiter = ac.createDynamicsCompressor()
            limiter.threshold.value = -12
            limiter.knee.value = 18
            limiter.ratio.value = 8
            limiter.attack.value = 0.003
            limiter.release.value = 0.22
            master.gain.value = enabled ? 0.46 : 0.0001
            master.connect(limiter)
            limiter.connect(ac.destination)
            startAmbience()
          }
          if (enabled && ac.state === 'suspended') ac.resume()
        } catch (e) {}
      }
      function tone(f0, f1, dur, type, vol, when) {
        if (!ac || !master) return
        try {
          const t = ac.currentTime + (when || 0)
          const o = ac.createOscillator()
          const g = ac.createGain()
          o.type = type
          o.frequency.setValueAtTime(f0, t)
          if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur)
          g.gain.setValueAtTime(vol, t)
          g.gain.exponentialRampToValueAtTime(0.001, t + dur)
          o.connect(g)
          g.connect(master)
          o.start(t)
          o.stop(t + dur + 0.02)
        } catch (e) {}
      }
      function noise(dur, vol, freq, when) {
        if (!ac || !master) return
        try {
          const t = ac.currentTime + (when || 0)
          const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate)
          const d = buf.getChannelData(0)
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
          const src = ac.createBufferSource()
          src.buffer = buf
          const f = ac.createBiquadFilter()
          f.type = 'lowpass'
          f.frequency.value = freq
          const g = ac.createGain()
          g.gain.setValueAtTime(vol, t)
          g.gain.exponentialRampToValueAtTime(0.001, t + dur)
          src.connect(f)
          f.connect(g)
          g.connect(master)
          src.start(t)
        } catch (e) {}
      }
      return {
        ensure,
        isEnabled() { return enabled },
        toggle() {
          enabled = !enabled
          if (enabled) ensure()
          if (ac && master) {
            const t = ac.currentTime
            master.gain.cancelScheduledValues(t)
            master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t)
            master.gain.exponentialRampToValueAtTime(enabled ? 0.46 : 0.0001, t + 0.08)
          }
          return enabled
        },
        shot() { tone(190, 38, 0.15, 'square', 0.62); tone(980, 260, 0.035, 'square', 0.2); noise(0.12, 0.78, 4200) },
        zombieHit() { tone(240, 82, 0.11, 'sawtooth', 0.32); noise(0.045, 0.16, 1250) },
        headshot() { tone(360, 55, 0.16, 'sawtooth', 0.42); noise(0.12, 0.42, 1800) },
        reload() { tone(620, 260, 0.055, 'square', 0.2, 0); noise(0.04, 0.16, 2200, 0.34); tone(420, 190, 0.07, 'square', 0.2, 0.36); tone(920, 460, 0.055, 'square', 0.24, 1.02) },
        empty() { tone(1200, 620, 0.045, 'square', 0.2); noise(0.025, 0.08, 3000) },
        zombieDie() { tone(155, 36, 0.62, 'sawtooth', 0.34); noise(0.2, 0.14, 600, 0.12) },
        hurt() { tone(130, 58, 0.2, 'square', 0.44); noise(0.15, 0.32, 980) },
        pickup() { tone(520, 880, 0.1, 'triangle', 0.25); tone(780, 1180, 0.12, 'triangle', 0.22, 0.08) },
        wave() { tone(200, 420, 0.4, 'triangle', 0.3); tone(300, 630, 0.5, 'triangle', 0.22, 0.15) },
        death() { tone(90, 30, 1.2, 'sawtooth', 0.5); noise(0.8, 0.3, 400) },
        growl() { tone(76, 38, 0.8, 'sawtooth', 0.16); tone(58, 31, 0.9, 'square', 0.07, 0.08) },
        step(sprint) { noise(0.075, sprint ? 0.2 : 0.14, 520); tone(74, 48, 0.07, 'sine', sprint ? 0.11 : 0.08) },
      }
    } catch (e) {
      return null
    }
  }

  const audio = createAudio()

  function updateAudioUI() {
    const btn = document.getElementById('btn-sound')
    if (!btn) return
    const on = !!(audio && audio.isEnabled())
    btn.textContent = audio ? (on ? '声音：开' : '声音：关') : '声音：不可用'
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  }

  function toggleAudio() {
    if (audio) audio.toggle()
    updateAudioUI()
  }

  // ============================ 界面 ============================
  const canvas = document.getElementById('game-canvas')
  const root = document.getElementById('game-root')
  const topbar = document.getElementById('topbar')
  const screens = {
    menu: document.getElementById('screen-menu'),
    paused: document.getElementById('screen-paused'),
    over: document.getElementById('screen-over'),
    victory: document.getElementById('screen-victory'),
  }
  const screenKey = { menu: 'menu', paused: 'paused', gameover: 'over', victory: 'victory' }

  function renderStats(el, s) {
    el.innerHTML = ''
    const items = [
      [s.wave || 0, '抵达波数'],
      [s.kills || 0, '击杀丧尸'],
      [s.headshots || 0, '爆头'],
      [s.score || 0, '总分'],
    ]
    for (const item of items) {
      const box = document.createElement('div')
      box.className = 'zfps-stat'
      const b = document.createElement('b')
      b.textContent = String(item[0])
      const span = document.createElement('span')
      span.textContent = item[1]
      box.appendChild(b)
      box.appendChild(span)
      el.appendChild(box)
    }
  }

  function setPhaseUI(phase, stats) {
    for (const key of Object.keys(screens)) {
      screens[key].classList.toggle('zfps-hidden', screenKey[phase] !== key)
    }
    topbar.classList.toggle('zfps-hidden', phase === 'playing')
    if (stats && (phase === 'gameover' || phase === 'victory')) {
      renderStats(document.getElementById('stats-' + screenKey[phase]), stats)
    }
  }

  // ============================ 游戏引擎 ============================
  function createEngine(canvas, hooks) {
    const TAU = Math.PI * 2
    const MAG = 30
    const RELOAD_TIME = 1.75
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
    const rand = (a, b) => a + Math.random() * (b - a)
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const normAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a }
    const seeded = (seed, salt) => {
      const n = Math.sin(seed * 91.73 + salt * 37.19) * 43758.5453
      return n - Math.floor(n)
    }
    const SKINS = ['#7d9b6a', '#8aa86f', '#6f8f5f', '#93a97a']
    const SHIRTS = ['#3a2f33', '#4a3a2e', '#2e3430', '#4d3320']
    const PANTS = ['#23252b', '#2b2420', '#1f2730']
    function darken(hex, f) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')'
    }

    const W = {
      phase: 'menu', px: 0, pz: 0, yaw: Math.PI * 0.75, pitch: 0,
      hp: 100, ammo: MAG, reserve: 60, kills: 0, score: 0, headshots: 0, wave: 1, camH: 1.6,
      zombies: [], particles: [], weaponFx: [], floats: [], decals: [], pickups: [], props: [], smoke: [], ash: [], ashW: 0, ashH: 0,
      spawnQueue: 0, spawnCd: 1.2, waveCleared: false, waveDelay: 0, supplyCd: 9,
      reloading: false, reloadT: 0, reloadDelay: 0, fireCd: 0, firing: false,
      keys: {}, moving: false, shake: 0, dmgFlash: 0, hitT: 0, flashT: 0, recoil: 0,
      dead: false, deathT: 0, time: 0, locked: false,
      bannerText: '', bannerT: 0, bannerMax: 0, emptyT: 0, growlCd: 3, footstepCd: 0,
      gunMuzzleX: 0, gunMuzzleY: 0, gunEjectX: 0, gunEjectY: 0,
      cw: 0, ch: 0, _dt: 0, _focal: 0, _cx: 0, _cy: 0, _horizon: 0,
    }

    let loopTimer = null
    let lastT = Date.now()
    const weaponImage = new Image()
    let weaponImageReady = false
    weaponImage.onload = () => { weaponImageReady = true }
    weaponImage.src = 'assets/m4a1-first-person.png'

    function buildWorld() {
      W.props = []
      const buildingKinds = ['apartment', 'office', 'shop', 'tower']
      const facades = ['#34272d', '#3a3037', '#3b2927', '#2c3337', '#403128']
      const signs = ['24H', 'MOTEL', '急救', 'CAFE', 'EXIT', '药']
      for (let i = 0; i < 42; i++) {
        const ang = (i / 42) * TAU + rand(-0.075, 0.075)
        const r = rand(55, 94)
        const kind = buildingKinds[i % buildingKinds.length]
        const tower = kind === 'tower'
        const shop = kind === 'shop'
        W.props.push({
          x: Math.cos(ang) * r,
          z: Math.sin(ang) * r,
          w: tower ? rand(11, 17) : rand(13, 27),
          h: shop ? rand(8, 13) : tower ? rand(25, 38) : rand(15, 29),
          c: pick(facades),
          kind,
          roof: i % 4,
          damage: seeded(i, 4),
          sign: signs[i % signs.length],
          seed: i + 1,
        })
      }
      W.decals = []
      for (let i = 0; i < 46; i++) {
        const a = rand(0, TAU)
        const r = rand(2, 44)
        W.decals.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: rand(0.4, 1.6), a: rand(0.1, 0.28), blood: Math.random() < 0.2 })
      }
      W.smoke = []
      for (let i = 0; i < 5; i++) {
        const a = rand(0, TAU)
        const r = rand(62, 110)
        W.smoke.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, seed: rand(0, 100) })
      }
    }

    function waveCount(n) { return 5 + n * 2 }

    function spawnZombie(dist) {
      const ang = rand(0, TAU)
      const x = W.px + Math.cos(ang) * dist
      const z = W.pz + Math.sin(ang) * dist
      const wv = Math.max(W.wave, 1)
      let type = 'normal'
      const r = Math.random()
      if (wv >= 4 && r < 0.12) type = 'brute'
      else if (wv >= 2 && r < 0.38) type = 'runner'
      const cfg = {
        normal: { hp: 44, speed: 1.25 + Math.min(wv * 0.08, 1.1) + rand(0, 0.35), dmg: 9, atk: 1.0, h: 1.72, bw: 0.92 },
        runner: { hp: 30, speed: 2.6 + rand(0, 0.4), dmg: 6, atk: 0.75, h: 1.6, bw: 0.78 },
        brute: { hp: 130, speed: 0.72 + rand(0, 0.15), dmg: 20, atk: 1.45, h: 2.15, bw: 1.35 },
      }
      const c = cfg[type]
      W.zombies.push({
        x, z, type, hp: c.hp, maxHp: c.hp, speed: c.speed, dmg: c.dmg, atkCd: c.atk, attackCd: c.atk * rand(0.5, 1.2),
        h: c.h, bw: c.bw, walkT: rand(0, 10), seed: Math.random() * 100, spawnT: 0.6,
        attackT: 0, hitFlash: 0, dead: false, fallT: 0,
        skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS), wounds: [],
      })
    }

    function resetWorld(menu) {
      W.px = 0; W.pz = 0; W.yaw = Math.PI * 0.75; W.pitch = 0
      W.hp = 100; W.ammo = MAG; W.reserve = 90
      W.kills = 0; W.score = 0; W.headshots = 0; W.wave = 1
      W.zombies = []; W.particles = []; W.weaponFx = []; W.floats = []; W.pickups = []
      W.spawnQueue = 0; W.spawnCd = 1.2; W.waveCleared = false; W.waveDelay = 0; W.supplyCd = rand(7, 11)
      W.reloading = false; W.reloadT = 0; W.reloadDelay = 0; W.fireCd = 0; W.firing = false
      W.dead = false; W.deathT = 0; W.dmgFlash = 0; W.shake = 0; W.hitT = 0; W.flashT = 0; W.recoil = 0; W.emptyT = 0; W.footstepCd = 0
      if (menu) {
        for (let i = 0; i < 9; i++) spawnZombie(rand(13, 27))
      } else {
        W.spawnQueue = waveCount(1)
        W.bannerText = '第 1 波 · 尸潮来袭'
        W.bannerMax = 2.2
        W.bannerT = W.bannerMax
      }
    }

    function stats() { return { wave: W.wave, kills: W.kills, score: W.score, headshots: W.headshots } }

    // ---------- 动作 ----------
    function beginReload() {
      if (W.reloading || W.ammo >= MAG || W.reserve <= 0 || W.phase !== 'playing') return
      W.reloading = true
      W.reloadT = 0
      audio && audio.reload()
    }
    function finishReload() {
      const take = Math.min(MAG - W.ammo, W.reserve)
      W.ammo += take
      W.reserve -= take
      W.reloading = false
    }
    function damagePlayer(d) {
      if (W.phase !== 'playing' || W.dead) return
      W.hp -= d
      W.dmgFlash = 0.5
      W.shake = Math.min(1.2, W.shake + 0.6)
      audio && audio.hurt()
      if (W.hp <= 0) {
        W.hp = 0
        W.dead = true
        W.deathT = 0
        audio && audio.death()
      }
    }
    function addFloat(text, x, y, color) {
      W.floats.push({ text, x: x || W.cw / 2 + rand(-30, 30), y: y || W.ch * 0.4, color: color || '#ffd166', life: 1.2 })
    }

    function project(x, z, hgt) {
      const dx = x - W.px
      const dz = z - W.pz
      const dist = Math.hypot(dx, dz)
      const rel = normAngle(W.yaw - Math.atan2(dx, dz))
      const depth = dist * Math.cos(rel)
      const res = { dist, rel, depth, visible: depth > 0.25 && Math.abs(rel) < 1.62 }
      if (!res.visible) return res
      const h = W.ch
      const focal = h * 0.95
      const shx = Math.sin(W.time * 61) * W.shake * 7
      const shy = Math.cos(W.time * 53) * W.shake * 5
      res.sx = W.cw / 2 + Math.tan(rel) * focal + shx
      res.sy = h / 2 + Math.tan(W.pitch) * focal + (W.camH - hgt) * (focal / depth) + shy
      res.scale = focal / depth
      return res
    }

    function spawnBlood(hitH, depthX, rel, head) {
      const w = W.cw, h = W.ch
      if (!w || !h) return
      const focal = h * 0.95
      const sx = w / 2 + Math.tan(rel) * focal
      const sy = h / 2 + Math.tan(W.pitch) * focal + (W.camH - hitH) * (focal / depthX)
      const n = head ? 14 : 9
      for (let i = 0; i < n; i++) W.particles.push({ x: sx + rand(-4, 4), y: sy + rand(-4, 4), vx: rand(-95, 95), vy: rand(-150, -10), g: 520, life: rand(0.3, 0.6), size: rand(2, 5) })
    }

    function shoot() {
      W.fireCd = 0.105
      W.ammo--
      W.flashT = 0.055
      W.recoil = 1
      W.shake = Math.min(1, W.shake + 0.22)
      W.pitch = clamp(W.pitch + 0.0038, -1.05, 1.05)
      audio && audio.shot()
      const gunU = W.ch / 560
      const ejectX = W.gunEjectX || W.cw * 0.72
      const ejectY = W.gunEjectY || W.ch * 0.66
      const muzzleX = W.gunMuzzleX || W.cw * 0.62
      const muzzleY = W.gunMuzzleY || W.ch * 0.64
      W.weaponFx.push({ kind: 'casing', x: ejectX, y: ejectY, vx: rand(120, 210) * gunU, vy: rand(-190, -115) * gunU, g: 520 * gunU, rot: rand(0, TAU), vr: rand(9, 16), life: 0.72, maxLife: 0.72 })
      for (let i = 0; i < 3; i++) {
        W.weaponFx.push({ kind: 'smoke', x: muzzleX + rand(-3, 3) * gunU, y: muzzleY, vx: rand(-24, -6) * gunU, vy: rand(-46, -18) * gunU, g: -8, size: rand(5, 10) * gunU, life: rand(0.28, 0.48), maxLife: 0.48 })
      }
      if (W.ammo <= 0) W.reloadDelay = 0.5
      let best = null
      let bestDepth = Infinity
      let bestHit = 0
      let bestRel = 0
      for (const z of W.zombies) {
        if (z.dead) continue
        const dx = z.x - W.px
        const dz = z.z - W.pz
        const dist = Math.hypot(dx, dz)
        if (dist > 44 || dist < 0.2) continue
        const rel = normAngle(W.yaw - Math.atan2(dx, dz))
        if (Math.abs(rel) > 1.5) continue
        const depthX = dist * Math.cos(rel)
        if (depthX <= 0.1) continue
        if (dist * Math.abs(Math.sin(rel)) > 0.52) continue
        const hitH = W.camH + Math.tan(W.pitch) * depthX
        if (hitH < 0 || hitH > z.h) continue
        if (depthX < bestDepth) {
          bestDepth = depthX
          best = z
          bestHit = hitH
          bestRel = rel
        }
      }
      if (best) {
        const head = bestHit >= best.h * 0.82
        const dmg = head ? 90 : 30
        best.hp -= dmg
        best.hitFlash = 0.14
        if (best.wounds.length < 6) best.wounds.push({ dx: rand(-0.28, 0.28), dy: rand(-0.95, -0.15), r: rand(0.05, 0.12) })
        const ddx = best.x - W.px
        const ddz = best.z - W.pz
        const dd = Math.hypot(ddx, ddz) || 1
        best.x += ddx / dd * 0.55
        best.z += ddz / dd * 0.55
        spawnBlood(bestHit, bestDepth, bestRel, head)
        W.hitT = 0.12
        audio && (head ? audio.headshot() : audio.zombieHit())
        if (best.hp <= 0) killZombie(best, head)
      }
    }

    function killZombie(z, head) {
      z.dead = true
      z.fallT = 0
      W.kills++
      const pts = head ? 25 : 10
      W.score += pts
      if (head) W.headshots++
      const p = project(z.x, z.z, z.h * 0.6)
      addFloat(head ? '+25 爆头' : '+10', p.visible ? p.sx : W.cw / 2, p.visible ? p.sy : W.ch * 0.4, head ? '#ff6b5e' : '#ffd166')
      W.decals.push({ x: z.x, z: z.z, r: rand(0.5, 0.95), a: 0.55, blood: true })
      audio && audio.zombieDie()
      if (Math.random() < 0.24) {
        W.pickups.push({ x: z.x, z: z.z, kind: Math.random() < 0.5 ? 'ammo' : 'med', bob: rand(0, 6), taken: false })
      }
    }

    // ---------- 更新 ----------
    function updateZombies(dt, menu) {
      const arr = W.zombies
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]
        if (a.dead) continue
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]
          if (b.dead) continue
          const dx = b.x - a.x
          const dz = b.z - a.z
          const d = Math.hypot(dx, dz)
          if (d > 0.01 && d < 1.05) {
            const push = (1.05 - d) * 0.5
            a.x -= dx / d * push; a.z -= dz / d * push
            b.x += dx / d * push; b.z += dz / d * push
          }
        }
      }
      for (const z of arr) {
        if (z.dead) {
          z.fallT += dt * 2.1
          continue
        }
        if (z.spawnT > 0) z.spawnT -= dt
        z.walkT += dt * (3 + z.speed * 1.5)
        z.hitFlash = Math.max(0, z.hitFlash - dt)
        z.attackT = Math.max(0, z.attackT - dt)
        const dx = W.px - z.x
        const dz = W.pz - z.z
        const dist = Math.hypot(dx, dz) || 0.01
        const ux = dx / dist
        const uz = dz / dist
        if (menu) {
          if (dist > 12) {
            z.x += ux * z.speed * dt * 0.6
            z.z += uz * z.speed * dt * 0.6
          } else {
            z.x += -uz * Math.sin(z.walkT * 0.7 + z.seed) * dt * 0.9
            z.z += ux * Math.cos(z.walkT * 0.7 + z.seed) * dt * 0.9
          }
        } else {
          if (dist > 1.5) {
            const str = Math.sin(z.walkT * 1.3 + z.seed) * 0.3
            z.x += (ux - uz * str) * z.speed * dt
            z.z += (uz + ux * str) * z.speed * dt
          } else if (z.spawnT <= 0) {
            z.attackCd -= dt
            if (z.attackCd <= 0) {
              z.attackCd = z.atkCd
              z.attackT = 0.55
              damagePlayer(z.dmg + rand(0, 4))
            }
          }
        }
      }
      W.zombies = W.zombies.filter((z) => !(z.dead && z.fallT >= 1))
    }

    function spawnSupply(forcedKind) {
      const ang = rand(0, TAU)
      const dist = rand(8, 18)
      const kind = forcedKind || (W.hp < 48 && Math.random() < 0.68 ? 'med' : (Math.random() < 0.64 ? 'ammo' : 'med'))
      W.pickups.push({
        x: clamp(W.px + Math.cos(ang) * dist, -42, 42),
        z: clamp(W.pz + Math.sin(ang) * dist, -42, 42),
        kind,
        bob: rand(0, 6),
        taken: false,
      })
      addFloat(kind === 'ammo' ? '弹药补给已投放' : '医疗补给已投放', W.cw / 2, W.ch * 0.34, kind === 'ammo' ? '#9fc8ff' : '#7dffa0')
    }

    function updatePickups(dt) {
      for (const p of W.pickups) {
        p.bob += dt * 3
        const d = Math.hypot(p.x - W.px, p.z - W.pz)
        if (d < 1.5) {
          p.taken = true
          if (p.kind === 'ammo') {
            W.reserve = Math.min(120, W.reserve + 30)
            addFloat('+30 弹药', W.cw / 2, W.ch * 0.4, '#9fc8ff')
          } else {
            W.hp = Math.min(100, W.hp + 30)
            addFloat('+30 生命', W.cw / 2, W.ch * 0.4, '#7dffa0')
          }
          audio && audio.pickup()
        }
      }
      W.pickups = W.pickups.filter((p) => !p.taken)
    }

    function updateParticles(dt) {
      for (const p of W.particles) {
        p.vy += p.g * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
      }
      W.particles = W.particles.filter((p) => p.life > 0)
      for (const p of W.weaponFx) {
        p.vy += p.g * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.rot != null) p.rot += p.vr * dt
        p.life -= dt
      }
      W.weaponFx = W.weaponFx.filter((p) => p.life > 0 && p.y < W.ch + 30)
      for (const f of W.floats) {
        f.y -= 26 * dt
        f.life -= dt
      }
      W.floats = W.floats.filter((f) => f.life > 0)
    }

    function update(dt) {
      W.time += dt
      W._dt = dt
      W.locked = document.pointerLockElement === canvas
      W.shake = Math.max(0, W.shake - dt * 2.6)
      W.dmgFlash = Math.max(0, W.dmgFlash - dt)
      W.hitT = Math.max(0, W.hitT - dt)
      W.flashT = Math.max(0, W.flashT - dt)
      W.recoil = Math.max(0, W.recoil - dt * 9)
      W.bannerT = Math.max(0, W.bannerT - dt)
      W.emptyT = Math.max(0, W.emptyT - dt)
      updateParticles(dt)
      if (W.phase === 'menu') {
        W.yaw += dt * 0.05
        updateZombies(dt, true)
        return
      }
      if (W.phase !== 'playing') return
      if (W.dead) {
        W.deathT += dt
        updateZombies(dt, false)
        if (W.deathT > 1.5) {
          W.dead = false
          W.phase = 'gameover'
          hooks.onPhase('gameover', stats())
          exitLock()
        }
        return
      }
      const ammoOnGround = W.pickups.some((p) => !p.taken && p.kind === 'ammo')
      const emergencyAmmo = W.ammo === 0 && W.reserve === 0 && !ammoOnGround
      if (emergencyAmmo) W.supplyCd = Math.min(W.supplyCd, 2)
      W.supplyCd -= dt
      if (W.supplyCd <= 0) {
        if (emergencyAmmo || W.pickups.length < 3) spawnSupply(emergencyAmmo ? 'ammo' : null)
        W.supplyCd = rand(9, 16)
      }
      if (audio) {
        let near = false
        for (const z of W.zombies) {
          if (!z.dead && Math.hypot(z.x - W.px, z.z - W.pz) < 14) { near = true; break }
        }
        if (near) {
          W.growlCd -= dt
          if (W.growlCd <= 0) {
            W.growlCd = rand(2.2, 4.5)
            audio.growl()
          }
        }
      }
      // 移动
      const k = W.keys
      let mx = 0
      let mz = 0
      if (k.KeyW) mz += 1
      if (k.KeyS) mz -= 1
      if (k.KeyA) mx -= 1
      if (k.KeyD) mx += 1
      const sprint = k.ShiftLeft || k.ShiftRight
      W.moving = false
      if (mx !== 0 || mz !== 0) {
        W.moving = true
        const len = Math.hypot(mx, mz)
        mx /= len; mz /= len
        const s = Math.sin(W.yaw)
        const c = Math.cos(W.yaw)
        const speed = sprint ? 7.4 : 4.6
        W.px = clamp(W.px + (s * mz - c * mx) * speed * dt, -46, 46)
        W.pz = clamp(W.pz + (c * mz + s * mx) * speed * dt, -46, 46)
        W.footstepCd -= dt
        if (W.footstepCd <= 0) {
          W.footstepCd = sprint ? 0.28 : 0.42
          audio && audio.step(sprint)
        }
      } else {
        W.footstepCd = Math.min(W.footstepCd, 0.06)
      }
      // 射击
      if (W.fireCd > 0) W.fireCd -= dt
      if (W.firing && W.locked && W.fireCd <= 0) {
        if (!W.reloading) {
          if (W.ammo <= 0) {
            if (W.emptyT <= 0) {
              audio && audio.empty()
              W.emptyT = 0.4
            }
          } else shoot()
        }
      }
      // 换弹
      if (!W.reloading && W.ammo === 0 && W.reloadDelay > 0) {
        W.reloadDelay -= dt
        if (W.reloadDelay <= 0) beginReload()
      }
      if (W.reloading) {
        W.reloadT += dt
        if (W.reloadT >= RELOAD_TIME) finishReload()
      }
      // 出怪
      if (W.spawnQueue > 0) {
        W.spawnCd -= dt
        if (W.spawnCd <= 0) {
          W.spawnCd = rand(0.55, 1.15)
          W.spawnQueue--
          spawnZombie(rand(34, 40))
        }
      }
      // 波次
      if (W.spawnQueue === 0 && W.zombies.length === 0 && !W.waveCleared) {
        if (W.wave >= 6) {
          W.phase = 'victory'
          hooks.onPhase('victory', stats())
          exitLock()
          return
        }
        W.wave++
        W.hp = Math.min(100, W.hp + 25)
        W.reserve = Math.min(120, W.reserve + 30)
        W.waveCleared = true
        W.waveDelay = 2.6
        W.bannerText = '第 ' + (W.wave - 1) + ' 波已清除 · 补给 +25 生命 +30 弹药'
        W.bannerMax = 2.6
        W.bannerT = W.bannerMax
        audio && audio.wave()
      } else if (W.waveCleared) {
        W.waveDelay -= dt
        if (W.waveDelay <= 0) {
          W.waveCleared = false
          W.spawnQueue = waveCount(W.wave)
          W.bannerText = '第 ' + W.wave + ' 波 · 尸潮来袭'
          W.bannerMax = 2.2
          W.bannerT = W.bannerMax
          audio && audio.wave()
        }
      }
      updateZombies(dt, false)
      updatePickups(dt)
    }

    // ---------- 绘制 ----------
    function linePath(g, x0, z0, x1, z1) {
      const n = 10
      let started = false
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const p = project(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0)
        if (p.visible && p.depth < 48) {
          if (!started) { g.moveTo(p.sx, p.sy); started = true }
          else g.lineTo(p.sx, p.sy)
        } else started = false
      }
    }

    function drawGrid(g) {
      const span = 44
      const step = 4
      g.strokeStyle = 'rgba(156,118,88,0.22)'
      g.lineWidth = 1
      g.beginPath()
      for (let k = -span; k <= span; k += step) {
        linePath(g, k, -span, k, span)
        linePath(g, -span, k, span, k)
      }
      g.stroke()
    }

    function drawDecals(g) {
      for (const d of W.decals) {
        const p = project(d.x, d.z, 0)
        if (!p.visible || p.depth > 42) continue
        const r = d.r * p.scale
        const ry = r * clamp(W.camH * 1.7 / p.depth, 0.08, 0.42)
        const fade = clamp(1 - (p.depth - 30) / 18, 0, 1) * d.a
        g.fillStyle = d.blood ? 'rgba(120,20,16,' + fade.toFixed(3) + ')' : 'rgba(18,14,11,' + fade.toFixed(3) + ')'
        g.beginPath()
        g.ellipse(p.sx, p.sy, r, ry, 0, 0, TAU)
        g.fill()
      }
    }

    function drawProps(g) {
      const visible = []
      for (const b of W.props) {
        const p = project(b.x, b.z, 0)
        if (p.visible && p.depth < 120) visible.push({ b, p })
      }
      visible.sort((a, b) => b.p.depth - a.p.depth)
      for (const item of visible) {
        const b = item.b
        const p = item.p
        const wpx = b.w * p.scale
        const hpx = b.h * p.scale
        const x0 = p.sx - wpx / 2
        const y0 = p.sy - hpx
        const fog = clamp((p.depth - 12) / 70, 0, 0.9)
        const alpha = 1 - fog * 0.58
        const sideDir = p.rel > 0 ? -1 : 1
        const sideW = clamp(wpx * 0.11, 4, wpx * 0.18)
        const chip = b.damage > 0.7 ? Math.min(hpx * 0.075, 28) : 0
        g.save()
        g.globalAlpha = alpha

        // 屋顶轮廓：水箱、天线、机房和坍塌女儿墙让天际线不再是方盒子。
        g.fillStyle = '#121116'
        if (b.roof === 0) {
          const ax = p.sx + sideDir * wpx * 0.18
          g.lineWidth = Math.max(1, p.scale * 0.06)
          g.strokeStyle = '#30282b'
          g.beginPath()
          g.moveTo(ax, y0)
          g.lineTo(ax, y0 - Math.min(42, hpx * 0.14))
          g.moveTo(ax - 8, y0 - Math.min(27, hpx * 0.09))
          g.lineTo(ax + 8, y0 - Math.min(27, hpx * 0.09))
          g.stroke()
          g.fillStyle = 'rgba(180,45,30,0.55)'
          g.beginPath()
          g.arc(ax, y0 - Math.min(42, hpx * 0.14), Math.max(1.5, p.scale * 0.12), 0, TAU)
          g.fill()
        } else if (b.roof === 1) {
          const rw = Math.min(wpx * 0.27, 44)
          const rh = Math.min(hpx * 0.1, 30)
          g.fillStyle = '#19191c'
          g.fillRect(p.sx - rw / 2, y0 - rh, rw, rh)
          g.fillStyle = '#303035'
          g.beginPath()
          g.ellipse(p.sx, y0 - rh, rw / 2, Math.max(2, rh * 0.2), 0, 0, TAU)
          g.fill()
          g.fillStyle = '#0d0e10'
          g.fillRect(p.sx - rw * 0.37, y0, 3, Math.min(12, p.scale))
          g.fillRect(p.sx + rw * 0.34, y0, 3, Math.min(12, p.scale))
        } else if (b.roof === 2) {
          const rw = Math.min(wpx * 0.34, 58)
          const rh = Math.min(hpx * 0.08, 22)
          g.fillStyle = '#17171b'
          g.fillRect(p.sx - rw / 2, y0 - rh, rw, rh)
          g.strokeStyle = 'rgba(255,255,255,0.1)'
          g.lineWidth = 1
          for (let k = -1; k <= 1; k++) {
            g.beginPath()
            g.moveTo(p.sx - rw * 0.34, y0 - rh * (0.25 + k * 0.18))
            g.lineTo(p.sx + rw * 0.34, y0 - rh * (0.25 + k * 0.18))
            g.stroke()
          }
        }

        // 侧墙和主体采用不同明度，形成可读的立体体块。
        g.fillStyle = darken(b.c, 0.68)
        g.beginPath()
        if (sideDir > 0) {
          g.moveTo(x0 + wpx, y0)
          g.lineTo(x0 + wpx + sideW, y0 + sideW * 0.38)
          g.lineTo(x0 + wpx + sideW, p.sy)
          g.lineTo(x0 + wpx, p.sy)
        } else {
          g.moveTo(x0, y0)
          g.lineTo(x0 - sideW, y0 + sideW * 0.38)
          g.lineTo(x0 - sideW, p.sy)
          g.lineTo(x0, p.sy)
        }
        g.closePath()
        g.fill()

        const facade = g.createLinearGradient(x0, y0, x0 + wpx, p.sy)
        facade.addColorStop(0, darken(b.c, 0.86))
        facade.addColorStop(0.45, b.c)
        facade.addColorStop(1, darken(b.c, 0.76))
        g.fillStyle = facade
        g.beginPath()
        g.moveTo(x0, y0 + chip)
        if (chip) {
          g.lineTo(x0 + chip * 0.5, y0 + chip * 0.35)
          g.lineTo(x0 + chip, y0)
        }
        g.lineTo(x0 + wpx, y0)
        g.lineTo(x0 + wpx, p.sy)
        g.lineTo(x0, p.sy)
        g.closePath()
        g.fill()

        // 楼板、立柱与窗格。
        const cols = clamp(Math.round(b.w / (b.kind === 'office' ? 3.3 : 4.3)), 3, 8)
        const rows = clamp(Math.round(b.h / (b.kind === 'shop' ? 4.8 : 4.1)), 2, 9)
        const cw = wpx / cols
        const ch = hpx / rows
        g.fillStyle = 'rgba(255,255,255,0.035)'
        for (let j = 1; j < rows; j++) g.fillRect(x0, y0 + j * ch - 1, wpx, Math.max(1, p.scale * 0.055))
        if (cw > 5 && ch > 6) {
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const v = seeded(b.seed + i * 3, j + 11)
              const wx = x0 + (i + 0.2) * cw
              const wy = y0 + (j + 0.22) * ch
              const ww = cw * 0.58
              const wh = ch * 0.5
              g.fillStyle = v < 0.15 ? 'rgba(238,139,69,0.5)' : v < 0.23 ? 'rgba(150,194,193,0.24)' : 'rgba(5,8,12,0.7)'
              g.fillRect(wx, wy, ww, wh)
              g.strokeStyle = 'rgba(164,154,146,0.15)'
              g.lineWidth = Math.max(0.6, p.scale * 0.025)
              g.strokeRect(wx, wy, ww, wh)
              if (v > 0.78 && v < 0.9) {
                g.strokeStyle = 'rgba(196,181,163,0.42)'
                g.beginPath()
                g.moveTo(wx + ww * 0.08, wy + wh * 0.86)
                g.lineTo(wx + ww * 0.9, wy + wh * 0.2)
                g.moveTo(wx + ww * 0.14, wy + wh * 0.18)
                g.lineTo(wx + ww * 0.82, wy + wh * 0.9)
                g.stroke()
              } else if (v >= 0.9) {
                g.fillStyle = 'rgba(77,58,48,0.95)'
                g.fillRect(wx - ww * 0.04, wy + wh * 0.18, ww * 1.08, Math.max(2, wh * 0.18))
                g.fillRect(wx - ww * 0.04, wy + wh * 0.64, ww * 1.08, Math.max(2, wh * 0.18))
              }
            }
          }
        }

        // 临街招牌与入口，为建筑提供尺度参照。
        if ((b.kind === 'shop' || b.seed % 5 === 0) && p.depth < 92 && wpx > 70) {
          const sw = Math.min(wpx * 0.55, 130)
          const sh = clamp(ch * 0.42, 12, 24)
          const sx = p.sx - sw / 2
          const sy = p.sy - ch * 1.05
          g.fillStyle = 'rgba(25,8,10,0.94)'
          g.fillRect(sx, sy, sw, sh)
          g.strokeStyle = 'rgba(255,91,55,0.62)'
          g.lineWidth = 1.5
          g.strokeRect(sx, sy, sw, sh)
          g.font = '700 ' + Math.max(9, sh * 0.55) + 'px system-ui, sans-serif'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillStyle = seeded(b.seed, 33) > 0.35 ? 'rgba(255,126,82,0.9)' : 'rgba(255,126,82,0.28)'
          g.fillText(b.sign, p.sx, sy + sh * 0.53)
          g.textBaseline = 'alphabetic'
        }

        // 结构裂缝和焦黑面，强化末日损毁感。
        if (b.damage > 0.45 && p.depth < 86) {
          const crackX = x0 + wpx * (0.24 + seeded(b.seed, 41) * 0.48)
          const crackY = y0 + hpx * 0.16
          g.strokeStyle = 'rgba(5,4,5,0.48)'
          g.lineWidth = clamp(p.scale * 0.05, 1, 3)
          g.beginPath()
          g.moveTo(crackX, crackY)
          g.lineTo(crackX - cw * 0.18, crackY + ch * 0.48)
          g.lineTo(crackX + cw * 0.13, crackY + ch * 0.86)
          g.lineTo(crackX - cw * 0.08, crackY + ch * 1.3)
          g.moveTo(crackX - cw * 0.17, crackY + ch * 0.5)
          g.lineTo(crackX - cw * 0.42, crackY + ch * 0.7)
          g.stroke()
        }

        if (fog > 0.12) {
          g.fillStyle = '#4a2a24'
          g.globalAlpha = fog * 0.48
          g.fillRect(x0, y0, wpx, hpx)
        }
        g.restore()
      }
    }

    function strokeLimb(g, color, lw, x0, y0, x1, y1) {
      g.strokeStyle = color
      g.lineWidth = lw
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.stroke()
    }

    function clawHand(g, hx, hy, dir, s, skin) {
      g.fillStyle = skin
      g.beginPath()
      g.arc(hx, hy, 0.055 * s, 0, TAU)
      g.fill()
      for (let i = 0; i < 3; i++) {
        const a = 0.55 + i * 0.4
        const lx = hx + Math.cos(a) * 0.05 * s * dir
        const ly = hy + Math.sin(a) * 0.05 * s
        const cx1 = hx + Math.cos(a + 0.1 * dir) * 0.1 * s * dir
        const cy1 = hy + Math.sin(a) * 0.1 * s
        const ex = hx + Math.cos(a + 0.14 * dir) * 0.16 * s * dir
        const ey = hy + Math.sin(a + 0.14 * dir) * 0.16 * s
        g.strokeStyle = skin
        g.lineWidth = 0.017 * s
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(lx, ly)
        g.quadraticCurveTo(cx1, cy1, ex, ey)
        g.stroke()
        g.strokeStyle = '#171310'
        g.lineWidth = 0.011 * s
        g.beginPath()
        g.moveTo(ex, ey)
        g.lineTo(ex + Math.cos(a) * 0.02 * s * dir, ey + Math.sin(a) * 0.02 * s)
        g.stroke()
      }
    }

    function drawZombie(g, z, p) {
      const grow = z.spawnT > 0 ? clamp(1 - z.spawnT / 0.6, 0, 1) : 1
      const H = z.h * p.scale * grow
      const W = z.bw * p.scale * grow
      const feet = p.sy
      const fog = clamp((p.depth - 9) / 36, 0, 0.92)
      const alpha = 1 - fog * 0.8
      const lean = z.dead ? z.fallT * (z.seed % 2 ? 1.2 : -1.2) : 0
      const sq = z.dead ? 1 - z.fallT * 0.3 : 1
      const wq = z.walkT * 2.2
      const breath = Math.sin(W.time * 1.7 + z.seed) * 0.014 * H
      const tilt = Math.sin(z.seed * 7.3) * 0.2
      const brute = z.type === 'brute'
      const runner = z.type === 'runner'
      const skin = brute ? darken(z.skin, 0.72) : z.skin
      const shirt = z.shirt
      const pants = z.pants
      const bodyW = brute ? 1.3 : runner ? 0.85 : 1

      g.save()
      g.globalAlpha = alpha
      g.translate(p.sx, feet)
      if (lean) g.rotate(lean)
      g.scale(1, sq)

      // 地面阴影
      g.fillStyle = 'rgba(0,0,0,0.28)'
      g.beginPath()
      g.ellipse(0, -0.01 * H, 0.36 * W * bodyW, 0.05 * H * bodyW, 0, 0, TAU)
      g.fill()

      const hipY = -0.44 * H + breath
      const shoulderY = -0.72 * H + breath

      // 双腿：两段式跛行 + 破烂裤脚
      for (const side of [-1, 1]) {
        const ph = wq + (side > 0 ? Math.PI : 0)
        const step = Math.sin(ph)
        const hipX = side * 0.1 * W * bodyW
        const kneeX = hipX + step * 0.16 * W * bodyW
        const kneeY = hipY * 0.52
        const footX = hipX + step * 0.3 * W * bodyW
        const footY = -0.012 * H
        g.strokeStyle = pants
        g.lineCap = 'round'
        g.lineJoin = 'round'
        g.lineWidth = 0.1 * W * bodyW
        g.beginPath()
        g.moveTo(hipX, hipY)
        g.quadraticCurveTo(kneeX, kneeY, footX, footY)
        g.stroke()
        g.lineWidth = 0.035 * W * bodyW
        for (let k = -1; k <= 1; k++) {
          g.beginPath()
          g.moveTo(footX + k * 0.045 * W * bodyW, footY)
          g.lineTo(footX + k * 0.055 * W * bodyW, footY - (0.045 + (k < 0 ? 0.02 : 0)) * H)
          g.stroke()
        }
        g.fillStyle = 'rgba(0,0,0,0.4)'
        g.beginPath()
        g.ellipse(footX, -0.008 * H, 0.075 * W * bodyW, 0.024 * H, 0, 0, TAU)
        g.fill()
      }

      // 躯干：驼背 + 锯齿下摆
      const shW = 0.21 * W * bodyW
      const hemW = 0.17 * W * bodyW
      g.fillStyle = shirt
      g.beginPath()
      g.ellipse(-0.14 * W * bodyW, shoulderY + 0.06 * H, 0.15 * W * bodyW, 0.085 * H, -0.3, 0, TAU)
      g.fill()
      g.beginPath()
      g.moveTo(-shW, shoulderY)
      g.lineTo(shW, shoulderY)
      g.lineTo(hemW, hipY + 0.02 * H)
      g.lineTo(hemW - 0.03 * W * bodyW, hipY + 0.04 * H)
      g.lineTo(hemW + 0.02 * W * bodyW, hipY + 0.055 * H)
      g.lineTo(0.02 * W * bodyW, hipY + 0.035 * H)
      g.lineTo(-hemW + 0.03 * W * bodyW, hipY + 0.06 * H)
      g.lineTo(-hemW - 0.02 * W * bodyW, hipY + 0.038 * H)
      g.lineTo(-hemW, hipY + 0.015 * H)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(10,6,8,0.45)'
      g.lineWidth = Math.max(1, 0.008 * H)
      g.stroke()
      // 侧面阴影
      g.fillStyle = 'rgba(0,0,0,0.22)'
      g.beginPath()
      g.moveTo(-shW, shoulderY)
      g.lineTo(-shW * 0.15, shoulderY)
      g.lineTo(-hemW * 0.2, hipY + 0.04 * H)
      g.lineTo(-hemW, hipY + 0.015 * H)
      g.closePath()
      g.fill()
      // 衣服破洞露出皮肤
      g.fillStyle = skin
      g.beginPath()
      g.moveTo(0.05 * W * bodyW, hipY + 0.17 * H)
      g.lineTo(0.11 * W * bodyW, hipY + 0.11 * H)
      g.lineTo(0.07 * W * bodyW, hipY + 0.2 * H)
      g.closePath()
      g.fill()
      // 狂暴者肩部隆起
      if (brute) {
        g.fillStyle = shirt
        g.beginPath()
        g.ellipse(-0.1 * W * bodyW, shoulderY + 0.02 * H, 0.22 * W * bodyW, 0.1 * H, -0.15, 0, TAU)
        g.fill()
      }

      // 躯干伤口（流血 + 滴落）
      if (z.wounds.length) {
        for (const wd of z.wounds) {
          const wx = wd.dx * W
          const wy = wd.dy * H
          const wr = wd.r * H
          g.fillStyle = 'rgba(88,14,10,0.9)'
          g.beginPath()
          g.arc(wx, wy, wr, 0, TAU)
          g.fill()
          g.fillStyle = 'rgba(88,14,10,0.7)'
          g.beginPath()
          g.ellipse(wx, wy + wr * 1.4, wr * 0.45, wr * 0.9, 0, 0, TAU)
          g.fill()
          g.fillStyle = 'rgba(255,90,70,0.35)'
          g.beginPath()
          g.arc(wx - wr * 0.3, wy - wr * 0.3, wr * 0.3, 0, TAU)
          g.fill()
        }
      }

      // 手臂：烂袖口 + 前伸利爪
      const atkRaise = z.attackT > 0 ? 0.3 : 0
      for (const side of [-1, 1]) {
        const ph = wq * 0.8 + (side > 0 ? 0 : Math.PI)
        const sw = Math.sin(ph) * 0.05
        const sx0 = side * 0.16 * W * bodyW
        const sy0 = shoulderY + 0.045 * H
        const ex = side * (0.32 * W * bodyW) + sw * W
        const ey = sy0 + 0.12 * H + atkRaise * 0.05 * H
        const hx = side * (0.16 - atkRaise * 0.4) * W * bodyW + sw * W * 0.6
        const hy = ey + 0.2 * H - atkRaise * 0.16 * H
        strokeLimb(g, shirt, 0.085 * W * bodyW, sx0, sy0, ex, ey)
        strokeLimb(g, skin, 0.065 * W * bodyW, ex, ey, hx, hy)
        clawHand(g, hx, hy, side, W * bodyW, skin)
      }

      // 头部：歪斜头骨 + 下垂裂口 + 发光眼
      const headR = 0.155 * H * (brute ? 0.8 : 1)
      const headY = shoulderY - headR * 1.02 - 0.02 * H
      g.save()
      g.translate((runner ? Math.sin(wq * 0.6) * 0.04 : 0) * W, headY)
      g.rotate(tilt)
      // 脖子
      g.fillStyle = skin
      g.fillRect(-0.05 * W * bodyW, -0.02 * H, 0.1 * W * bodyW, 0.085 * H)
      // 头骨
      g.beginPath()
      g.ellipse(0, 0, headR, headR * 1.08, 0, 0, TAU)
      g.fillStyle = skin
      g.fill()
      g.save()
      g.clip()
      g.fillStyle = 'rgba(0,0,0,0.18)'
      g.beginPath()
      g.ellipse(-headR * 0.4, 0, headR * 0.5, headR * 1.1, 0, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(52,74,40,0.55)'
      g.beginPath()
      g.ellipse(headR * 0.3, -headR * 0.35, headR * 0.3, headR * 0.22, 0.5, 0, TAU)
      g.fill()
      g.beginPath()
      g.ellipse(-headR * 0.15, headR * 0.45, headR * 0.22, headR * 0.16, -0.4, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(96,16,12,0.9)'
      g.beginPath()
      g.ellipse(headR * 0.55, headR * 0.1, headR * 0.16, headR * 0.3, 0.6, 0, TAU)
      g.fill()
      g.restore()
      g.strokeStyle = 'rgba(10,6,8,0.5)'
      g.lineWidth = Math.max(1, 0.008 * H)
      g.stroke()
      // 残发
      if (z.seed % 3 !== 0) {
        g.strokeStyle = 'rgba(20,16,14,0.8)'
        g.lineCap = 'round'
        for (let i = -2; i <= 2; i++) {
          const hx0 = i * headR * 0.28
          const hy0 = -headR * 0.88
          g.lineWidth = headR * 0.12
          g.beginPath()
          g.moveTo(hx0, hy0)
          g.quadraticCurveTo(hx0 + (i < 0 ? -1 : 1) * headR * 0.1, hy0 - headR * 0.35, hx0 + (i < 0 ? -1 : 1) * headR * 0.22, hy0 - headR * 0.1)
          g.stroke()
        }
      }
      // 下垂的下巴
      const jawOpen = (z.attackT > 0 ? 0.05 : 0.016) * H + Math.abs(Math.sin(wq * 0.5)) * 0.006 * H
      g.fillStyle = skin
      g.beginPath()
      g.ellipse(0, headR * 0.55 + jawOpen, headR * 0.5, headR * 0.3 + jawOpen * 0.5, 0, 0, TAU)
      g.fill()
      g.strokeStyle = 'rgba(10,6,8,0.45)'
      g.lineWidth = Math.max(1, 0.007 * H)
      g.stroke()
      // 口腔 + 獠牙
      g.fillStyle = 'rgba(20,6,6,0.85)'
      g.beginPath()
      g.ellipse(0, headR * 0.28, headR * 0.42, jawOpen * 0.9 + headR * 0.05, 0, 0, TAU)
      g.fill()
      g.fillStyle = '#cfc4a8'
      for (let i = -2; i <= 2; i++) {
        const tx = i * headR * 0.17
        g.beginPath()
        g.moveTo(tx - headR * 0.07, headR * 0.24)
        g.lineTo(tx + headR * 0.07, headR * 0.24)
        g.lineTo(tx, headR * 0.34 + jawOpen * 0.6)
        g.closePath()
        g.fill()
      }
      g.fillStyle = 'rgba(120,20,16,0.65)'
      g.beginPath()
      g.ellipse(headR * 0.5, headR * 0.5, headR * 0.12, headR * 0.2, 0.4, 0, TAU)
      g.fill()
      // 双眼（不对称、发光）
      for (const side of [-1, 1]) {
        const ex0 = side * headR * 0.34
        const ey0 = -headR * 0.18 + (side > 0 ? 0.03 * headR : 0)
        const er = headR * (side > 0 ? 0.16 : 0.11)
        g.fillStyle = 'rgba(0,0,0,0.45)'
        g.beginPath()
        g.arc(ex0, ey0, er * 1.6, 0, TAU)
        g.fill()
        g.fillStyle = 'rgba(255,60,30,0.28)'
        g.beginPath()
        g.arc(ex0, ey0, er * 1.7, 0, TAU)
        g.fill()
        g.fillStyle = brute ? '#ff1f0a' : '#ff3a1c'
        g.beginPath()
        g.arc(ex0, ey0, er, 0, TAU)
        g.fill()
        g.fillStyle = '#ffe08a'
        g.beginPath()
        g.arc(ex0 - er * 0.3, ey0 - er * 0.3, er * 0.28, 0, TAU)
        g.fill()
      }
      g.restore()

      // 受击闪烁
      if (z.hitFlash > 0) {
        g.globalAlpha = alpha * Math.min(1, z.hitFlash / 0.14) * 0.55
        g.fillStyle = '#ff2a1a'
        g.fillRect(-W * 0.65, -H * 1.06, W * 1.3, H * 1.06)
        g.globalAlpha = alpha
      }
      g.restore()
      // 雾效
      if (fog > 0.12) {
        g.globalAlpha = fog * 0.75
        g.fillStyle = '#2c1817'
        g.fillRect(p.sx - W / 2, feet - H, W, H)
        g.globalAlpha = 1
      }
    }

    function drawPickup(g, pk, p) {
      const s = p.scale
      const bob = Math.sin(pk.bob) * 0.14 * s
      const sz = 0.55 * s
      const y = p.sy + bob
      const alpha = clamp(1 - (p.depth - 30) / 16, 0, 1)
      g.save()
      g.globalAlpha = alpha
      g.fillStyle = pk.kind === 'med' ? 'rgba(255,80,90,0.15)' : 'rgba(255,190,80,0.14)'
      g.beginPath()
      g.arc(p.sx, y - sz * 0.55, sz * 2.3, 0, TAU)
      g.fill()
      g.fillStyle = pk.kind === 'med' ? '#3a1a1e' : '#3a2f1d'
      g.fillRect(p.sx - sz * 0.55, y - sz * 1.1, sz * 1.1, sz * 1.1)
      g.lineWidth = 2
      g.strokeStyle = pk.kind === 'med' ? '#e05656' : '#e0b056'
      g.strokeRect(p.sx - sz * 0.55, y - sz * 1.1, sz * 1.1, sz * 1.1)
      if (pk.kind === 'med') {
        g.fillStyle = '#ff6a5e'
        g.fillRect(p.sx - sz * 0.16, y - sz * 0.82, sz * 0.32, sz * 0.6)
        g.fillRect(p.sx - sz * 0.42, y - sz * 0.58, sz * 0.84, sz * 0.16)
      } else {
        g.fillStyle = '#ffd166'
        for (const k of [-0.2, 0, 0.2]) g.fillRect(p.sx + k * sz - sz * 0.07, y - sz * (0.7 + Math.abs(k) * 0.9), sz * 0.14, sz * 0.32)
      }
      g.restore()
    }

    function drawSmoke(g, s, p) {
      g.save()
      g.globalAlpha = 0.14
      g.fillStyle = '#4a3333'
      for (let i = 0; i < 5; i++) {
        const ph = (W.time * 0.05 + s.seed * 0.7 + i * 0.37) % 1
        const r = (0.6 + ph * 2.3) * p.scale * 2.4
        const y = p.sy - (2 + ph * 7) * p.scale
        const x = p.sx + Math.sin(W.time * 0.3 + s.seed + i) * p.scale * (1 + ph * 2)
        g.beginPath()
        g.arc(x, y, r, 0, TAU)
        g.fill()
      }
      g.restore()
    }

    function drawEntities(g) {
      const list = []
      for (const z of W.zombies) {
        const p = project(z.x, z.z, 0)
        if (p.visible && p.depth < 46) list.push({ d: p.depth, k: 0, o: z, p })
      }
      for (const pk of W.pickups) {
        const p = project(pk.x, pk.z, 0.6)
        if (p.visible) list.push({ d: p.depth, k: 1, o: pk, p })
      }
      for (const s of W.smoke) {
        const p = project(s.x, s.z, 0)
        if (p.visible && p.depth < 130) list.push({ d: p.depth, k: 2, o: s, p })
      }
      list.sort((a, b) => b.d - a.d)
      for (const it of list) {
        if (it.k === 0) drawZombie(g, it.o, it.p)
        else if (it.k === 1) drawPickup(g, it.o, it.p)
        else drawSmoke(g, it.o, it.p)
      }
    }

    function drawGun(g) {
      if (!weaponImageReady) return
      const w = W.cw
      const h = W.ch
      const u = h / 720
      const t = W.time
      const scale = Math.min(w / weaponImage.naturalWidth, h / weaponImage.naturalHeight) * 0.82
      const dw = weaponImage.naturalWidth * scale
      const dh = weaponImage.naturalHeight * scale
      const bobX = W.moving ? Math.cos(t * 5.5) * 6 * u : Math.sin(t * 1.5) * 1.5 * u
      const bobY = W.moving ? Math.sin(t * 11) * 5 * u : Math.sin(t * 2.1) * 1.4 * u
      const reloadP = W.reloading ? clamp(W.reloadT / RELOAD_TIME, 0, 1) : 0
      const reloadArc = Math.sin(reloadP * Math.PI)
      const x = w - dw + bobX + W.recoil * 5 * u
      const y = h - dh + bobY + W.recoil * 9 * u + reloadArc * h * 0.065
      const pivotX = w - 26
      const pivotY = h + 18
      const muzzleX = x + dw * 0.558
      const muzzleY = y + dh * 0.51
      W.gunMuzzleX = muzzleX
      W.gunMuzzleY = muzzleY
      W.gunEjectX = x + dw * 0.72
      W.gunEjectY = y + dh * 0.64

      g.save()
      g.translate(pivotX, pivotY)
      g.rotate(W.recoil * 0.012 + reloadArc * 0.07)
      g.translate(-pivotX, -pivotY)
      g.drawImage(weaponImage, x, y, dw, dh)

      if (W.flashT > 0) {
        const fs = W.flashT / 0.055
        g.save()
        g.globalCompositeOperation = 'lighter'
        const glow = g.createRadialGradient(muzzleX, muzzleY, 2, muzzleX, muzzleY, 38 * u)
        glow.addColorStop(0, 'rgba(255,250,207,' + fs.toFixed(3) + ')')
        glow.addColorStop(0.32, 'rgba(255,157,48,' + (fs * 0.78).toFixed(3) + ')')
        glow.addColorStop(1, 'rgba(255,63,10,0)')
        g.fillStyle = glow
        g.beginPath()
        g.arc(muzzleX, muzzleY, 38 * u, 0, TAU)
        g.fill()

        const aimAngle = Math.atan2(h * 0.5 - muzzleY, w * 0.5 - muzzleX)
        g.translate(muzzleX, muzzleY)
        g.rotate(aimAngle)
        g.fillStyle = 'rgba(255,241,154,' + fs.toFixed(3) + ')'
        g.beginPath()
        g.moveTo(0, 0)
        g.lineTo(70 * u, -15 * u)
        g.lineTo(43 * u, 0)
        g.lineTo(74 * u, 14 * u)
        g.lineTo(31 * u, 8 * u)
        g.closePath()
        g.fill()
        g.restore()
      }
      g.restore()
    }

    function drawWeaponFx(g) {
      for (const p of W.weaponFx) {
        const a = clamp(p.life / p.maxLife, 0, 1)
        if (p.kind === 'smoke') {
          g.fillStyle = 'rgba(192,184,174,' + (a * 0.18).toFixed(3) + ')'
          g.beginPath()
          g.arc(p.x, p.y, p.size * (1.35 - a * 0.35), 0, TAU)
          g.fill()
        } else {
          g.save()
          g.globalAlpha = a
          g.translate(p.x, p.y)
          g.rotate(p.rot)
          g.fillStyle = '#b8863c'
          g.fillRect(-5, -2, 10, 4)
          g.fillStyle = '#e3bd67'
          g.beginPath()
          g.ellipse(5, 0, 2, 2, 0, 0, TAU)
          g.fill()
          g.restore()
        }
      }
    }

    function drawHud(g) {
      const w = W.cw
      const h = W.ch
      const hp = Math.max(0, W.hp)
      const bx = 24
      const by = h - 38
      const bw = 210
      const bh = 14
      g.textAlign = 'left'
      g.font = '600 13px system-ui, sans-serif'
      g.fillStyle = '#f2e6dc'
      g.fillText('生命  ' + Math.ceil(hp), bx, by - 7)
      g.fillStyle = 'rgba(12,10,12,0.55)'
      g.fillRect(bx - 2, by - 2, bw + 4, bh + 4)
      g.fillStyle = 'rgba(30,26,30,0.85)'
      g.fillRect(bx, by, bw, bh)
      const frac = hp / 100
      g.fillStyle = hp > 50 ? '#b5432e' : hp > 25 ? '#d65a2e' : '#e03030'
      g.fillRect(bx, by, bw * frac, bh)
      g.strokeStyle = 'rgba(255,255,255,0.22)'
      g.lineWidth = 1
      g.strokeRect(bx, by, bw, bh)
      const ax = w - 26
      const ay = h - 38
      g.textAlign = 'right'
      g.fillStyle = 'rgba(8,10,12,0.38)'
      g.fillRect(ax - 216, ay - 48, 216, 74)
      g.font = '700 38px system-ui, sans-serif'
      g.fillStyle = (W.ammo === 0 && !W.reloading) ? '#ff5a38' : '#f2e6dc'
      g.fillText(String(W.ammo), ax - 68, ay)
      g.font = '600 17px system-ui, sans-serif'
      g.fillStyle = '#9a8f88'
      g.fillText('/ ' + W.reserve, ax, ay)
      g.font = '600 12px system-ui, sans-serif'
      g.fillStyle = '#8d827a'
      g.fillText('M4A1 · 自动 · R 换弹 · M 声音', ax, ay + 20)
      if (W.reloading) {
        const pr = clamp(W.reloadT / RELOAD_TIME, 0, 1)
        g.fillStyle = 'rgba(255,255,255,0.16)'
        g.fillRect(ax - 150, ay - 62, 150, 6)
        g.fillStyle = '#ffb199'
        g.fillRect(ax - 150, ay - 62, 150 * pr, 6)
        g.fillText('换弹中…', ax, ay - 68)
      }
      g.font = '700 20px system-ui, sans-serif'
      g.fillStyle = '#ffb199'
      g.fillText('第 ' + W.wave + ' 波', w - 26, 36)
      g.font = '600 14px system-ui, sans-serif'
      g.fillStyle = '#c9bfb8'
      g.fillText('击杀 ' + W.kills + ' · 得分 ' + W.score, w - 26, 58)
      const remaining = W.spawnQueue + W.zombies.filter((z) => !z.dead).length
      g.fillText('剩余丧尸 ' + remaining, w - 26, 78)
      g.textAlign = 'center'
      g.font = '600 12px system-ui, sans-serif'
      g.fillStyle = 'rgba(233,222,212,0.62)'
      g.fillText('Esc  暂停 / 退出本局', w / 2, 26)
      g.font = '600 13px system-ui, sans-serif'
      g.fillStyle = 'rgba(233,222,212,0.7)'
      g.fillText('消灭所有丧尸 · 第 ' + W.wave + ' / 6 波 · 随机补给持续投放', w / 2, h - 18)
      const spread = (W.moving ? 7 : 2) + W.recoil * 9
      const cx = w / 2
      const cy = h / 2
      const gap = 9 + spread
      const len = 7
      g.strokeStyle = 'rgba(232,244,239,0.94)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(cx - gap - len, cy); g.lineTo(cx - gap, cy)
      g.moveTo(cx + gap, cy); g.lineTo(cx + gap + len, cy)
      g.moveTo(cx, cy - gap - len); g.lineTo(cx, cy - gap)
      g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + len)
      g.stroke()
      g.fillStyle = 'rgba(126,224,197,0.95)'
      g.fillRect(cx - 1, cy - 1, 2, 2)
      if (W.hitT > 0) {
        g.strokeStyle = 'rgba(255,80,50,0.95)'
        g.lineWidth = 2
        g.beginPath()
        const m = 7
        g.moveTo(cx - m, cy - m); g.lineTo(cx - m + 5, cy - m + 5)
        g.moveTo(cx + m, cy - m); g.lineTo(cx + m - 5, cy - m + 5)
        g.moveTo(cx - m, cy + m); g.lineTo(cx - m + 5, cy + m - 5)
        g.moveTo(cx + m, cy + m); g.lineTo(cx + m - 5, cy + m - 5)
        g.stroke()
      }
    }

    function drawAsh(g) {
      const w = W.cw
      const h = W.ch
      if (!W.ash.length || W.ashW !== w || W.ashH !== h) {
        W.ashW = w
        W.ashH = h
        W.ash = []
        for (let i = 0; i < 60; i++) W.ash.push({ x: Math.random() * w, y: Math.random() * h, vy: rand(10, 30), vx: rand(-8, 8), s: rand(1, 2.6), a: rand(0.05, 0.18) })
      }
      const dt = W._dt
      g.fillStyle = '#d8c8b0'
      for (const p of W.ash) {
        p.y -= p.vy * dt
        p.x += p.vx * dt
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        g.globalAlpha = p.a
        g.fillRect(p.x, p.y, p.s, p.s)
      }
      g.globalAlpha = 1
    }

    function drawFloats(g) {
      g.textAlign = 'center'
      for (const f of W.floats) {
        g.globalAlpha = clamp(f.life / 0.45, 0, 1)
        g.font = '700 15px system-ui, sans-serif'
        g.fillStyle = f.color
        g.fillText(f.text, f.x, f.y)
      }
      g.globalAlpha = 1
    }

    function drawBanner(g) {
      if (W.bannerT <= 0) return
      const w = W.cw
      const h = W.ch
      const inA = clamp((W.bannerMax - W.bannerT) / 0.3, 0, 1)
      const outA = clamp(W.bannerT / 0.4, 0, 1)
      const a = Math.min(inA, outA)
      g.globalAlpha = a
      g.font = '800 34px system-ui, sans-serif'
      g.textAlign = 'center'
      g.fillStyle = 'rgba(10,6,8,0.55)'
      g.fillText(W.bannerText, w / 2 + 2, h * 0.24 + 2)
      g.fillStyle = '#ffb199'
      g.fillText(W.bannerText, w / 2, h * 0.24)
      g.globalAlpha = 1
    }

    function drawOverlays(g) {
      const w = W.cw
      const h = W.ch
      const cx = w / 2
      const cy = h / 2
      const vg = g.createRadialGradient(cx, cy, h * 0.52, cx, cy, h * 0.98)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.3)')
      g.fillStyle = vg
      g.fillRect(0, 0, w, h)
      const hp = Math.max(0, W.hp)
      const low = clamp(1 - hp / 45, 0, 1)
      const dmgA = clamp(W.dmgFlash / 0.5, 0, 1) * 0.38
      const pulse = low * (0.15 + 0.09 * Math.sin(W.time * 5))
      const a = Math.min(1, dmgA + pulse)
      if (a > 0.015) {
        const rg = g.createRadialGradient(cx, cy, h * 0.3, cx, cy, h * 0.75)
        rg.addColorStop(0, 'rgba(190,10,10,0)')
        rg.addColorStop(1, 'rgba(190,10,10,' + a.toFixed(3) + ')')
        g.fillStyle = rg
        g.fillRect(0, 0, w, h)
      }
      if (W.dead) {
        const da = clamp(W.deathT / 1.3, 0, 1) * 0.9
        g.fillStyle = 'rgba(60,0,0,' + da.toFixed(3) + ')'
        g.fillRect(0, 0, w, h)
      }
    }

    function draw() {
      const w = W.cw
      const h = W.ch
      const g = canvas.getContext('2d')
      if (!g || w < 2 || h < 2) return
      const focal = h * 0.95
      const cx = w / 2 + Math.sin(W.time * 61) * W.shake * 7
      const cy = h / 2 + Math.cos(W.time * 53) * W.shake * 5
      const horizon = cy + Math.tan(W.pitch) * focal
      W._focal = focal; W._cx = cx; W._cy = cy; W._horizon = horizon
      const skyTop = Math.max(0, Math.min(horizon, h))
      if (skyTop > 0) {
        const sky = g.createLinearGradient(0, 0, 0, skyTop)
        sky.addColorStop(0, '#15111d')
        sky.addColorStop(0.55, '#47202c')
        sky.addColorStop(1, '#aa5029')
        g.fillStyle = sky
        g.fillRect(0, 0, w, skyTop)
      }
      const moonX = w * 0.24
      const moonY = horizon - h * 0.4
      g.fillStyle = 'rgba(240,190,150,0.12)'
      g.beginPath()
      g.arc(moonX, moonY, h * 0.09, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(242,196,158,0.9)'
      g.beginPath()
      g.arc(moonX, moonY, h * 0.045, 0, TAU)
      g.fill()
      if (horizon > -h * 0.2 && horizon < h) {
        g.fillStyle = 'rgba(255,142,70,0.22)'
        g.fillRect(0, horizon - h * 0.015, w, h * 0.03)
      }
      if (horizon < h) {
        const gy = Math.max(0, horizon)
        const grd = g.createLinearGradient(0, gy, 0, h)
        grd.addColorStop(0, '#6b4b3a')
        grd.addColorStop(0.35, '#433127')
        grd.addColorStop(1, '#201814')
        g.fillStyle = grd
        g.fillRect(0, gy, w, h - gy)
        drawGrid(g)
        drawDecals(g)
      }
      drawProps(g)
      drawEntities(g)
      drawParticles(g)
      drawAsh(g)
      if (W.phase === 'playing') {
        drawGun(g)
        drawWeaponFx(g)
        drawHud(g)
        if (!W.locked && !W.dead) {
          g.font = '600 14px system-ui, sans-serif'
          g.fillStyle = 'rgba(255,220,190,0.85)'
          g.textAlign = 'center'
          g.fillText('点击屏幕锁定鼠标', w / 2, h * 0.62)
        }
      }
      drawFloats(g)
      drawBanner(g)
      drawOverlays(g)
    }

    function drawParticles(g) {
      for (const pt of W.particles) {
        const a = clamp(pt.life / 0.5, 0, 1)
        g.fillStyle = 'rgba(150,22,16,' + a.toFixed(3) + ')'
        g.beginPath()
        g.arc(pt.x, pt.y, pt.size, 0, TAU)
        g.fill()
      }
    }

    // ---------- 输入 ----------
    function onMouseMove(e) {
      if (W.phase === 'playing' && W.locked) {
        W.yaw = normAngle(W.yaw - e.movementX * 0.0022)
        W.pitch = clamp(W.pitch - e.movementY * 0.0022, -1.05, 1.05)
      }
    }
    function onKeyDown(e) {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault()
      W.keys[e.code] = true
      if (e.code === 'Escape' && W.phase === 'playing' && !W.dead) {
        e.preventDefault()
        W.firing = false
        W.phase = 'paused'
        hooks.onPhase('paused')
        exitLock()
        return
      }
      if (e.code === 'KeyR' && W.phase === 'playing' && !W.dead) beginReload()
      if (e.code === 'KeyM' && !e.repeat) toggleAudio()
    }
    function onKeyUp(e) {
      W.keys[e.code] = false
    }
    function onMouseDown(e) {
      if (e.button !== 0) return
      try { canvas.focus() } catch (err) {}
      if (W.phase !== 'playing' || W.dead) return
      if (!W.locked) {
        requestLock()
        return
      }
      W.firing = true
      W.fireCd = Math.min(W.fireCd, 0.03)
    }
    function onMouseUp(e) {
      if (e.button === 0) W.firing = false
    }
    function onLockChange() {
      const locked = document.pointerLockElement === canvas
      W.locked = locked
      if (locked) {
        if (W.phase === 'paused' && !W.dead) {
          W.phase = 'playing'
          hooks.onPhase('playing')
        }
      } else if (W.phase === 'playing' && !W.dead) {
        W.phase = 'paused'
        hooks.onPhase('paused')
      }
    }
    function onLockError() {}
    function requestLock() {
      try {
        canvas.focus()
        const p = canvas.requestPointerLock ? canvas.requestPointerLock() : null
        if (p && p.catch) p.catch(() => {})
      } catch (e) {}
    }
    function exitLock() {
      try {
        if (document.pointerLockElement === canvas) document.exitPointerLock()
      } catch (e) {}
    }

    function loop() {
      try {
        const now = Date.now()
        let dt = (now - lastT) / 1000
        lastT = now
        if (dt > 0.05) dt = 0.05
        if (dt <= 0) dt = 0.001
        const w = canvas.clientWidth || 1
        const h = canvas.clientHeight || 1
        if (w !== W.cw || h !== W.ch || canvas.width !== w || canvas.height !== h) {
          W.cw = w
          W.ch = h
          canvas.width = w
          canvas.height = h
        }
        update(dt)
        draw()
      } catch (err) {
        console.error('zfps engine error', err)
        if (loopTimer) {
          clearInterval(loopTimer)
          loopTimer = null
        }
      }
    }

    buildWorld()

    return {
      mount() {
        canvas.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('keydown', onKeyDown)
        canvas.addEventListener('keyup', onKeyUp)
        canvas.addEventListener('mousedown', onMouseDown)
        canvas.addEventListener('mouseup', onMouseUp)
        canvas.addEventListener('pointerlockchange', onLockChange)
        canvas.addEventListener('pointerlockerror', onLockError)
        resetWorld(true)
        W.phase = 'menu'
        hooks.onPhase('menu')
        try { canvas.focus() } catch (e) {}
        loopTimer = setInterval(loop, 16)
      },
      dispose() {
        if (loopTimer) {
          clearInterval(loopTimer)
          loopTimer = null
        }
        canvas.removeEventListener('mousemove', onMouseMove)
        canvas.removeEventListener('keydown', onKeyDown)
        canvas.removeEventListener('keyup', onKeyUp)
        canvas.removeEventListener('mousedown', onMouseDown)
        canvas.removeEventListener('mouseup', onMouseUp)
        canvas.removeEventListener('pointerlockchange', onLockChange)
        canvas.removeEventListener('pointerlockerror', onLockError)
        exitLock()
      },
      start() {
        audio && audio.ensure()
        resetWorld(false)
        W.phase = 'playing'
        hooks.onPhase('playing')
        requestLock()
      },
      resume() {
        audio && audio.ensure()
        W.phase = 'playing'
        hooks.onPhase('playing')
        requestLock()
      },
      toMenu() {
        exitLock()
        resetWorld(true)
        W.phase = 'menu'
        hooks.onPhase('menu')
      },
    }
  }

  // ============================ 启动 ============================
  const engine = createEngine(canvas, { onPhase: setPhaseUI })
  engine.mount()
  updateAudioUI()

  document.getElementById('btn-start').addEventListener('click', () => engine.start())
  document.getElementById('btn-sound').addEventListener('click', () => toggleAudio())
  document.getElementById('btn-resume').addEventListener('click', () => engine.resume())
  document.getElementById('btn-restart-paused').addEventListener('click', () => engine.start())
  document.getElementById('btn-menu-paused').addEventListener('click', () => engine.toMenu())
  document.getElementById('btn-restart-over').addEventListener('click', () => engine.start())
  document.getElementById('btn-menu-over').addEventListener('click', () => engine.toMenu())
  document.getElementById('btn-restart-victory').addEventListener('click', () => engine.start())
  document.getElementById('btn-menu-victory').addEventListener('click', () => engine.toMenu())
  document.getElementById('btn-close').addEventListener('click', () => engine.toMenu())
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()
      else if (root.requestFullscreen) {
        const p = root.requestFullscreen()
        if (p && p.catch) p.catch(() => {})
      }
    } catch (e) {}
  })
})()
