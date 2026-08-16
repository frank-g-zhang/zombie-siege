/* ============================================================================
 * 末日突围 · ZOMBIE SIEGE
 * 第一人称丧尸射击游戏 —— 纯 HTML5 Canvas 2D 实现，无第三方依赖。
 *
 * 武器系统：匕首（默认）/ M4A1 / 霰弹枪 / 手雷 / 火箭筒。
 * 右键或滚轮切换武器，数字键 1-5 直选；武器与弹药通过空投补给和击杀掉落获得。
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
        shotgun() { tone(140, 26, 0.22, 'square', 0.7); tone(700, 140, 0.05, 'square', 0.25); noise(0.2, 0.85, 2600) },
        zombieHit() { tone(240, 82, 0.11, 'sawtooth', 0.32); noise(0.045, 0.16, 1250) },
        headshot() { tone(360, 55, 0.16, 'sawtooth', 0.42); noise(0.12, 0.42, 1800) },
        reload() { tone(620, 260, 0.055, 'square', 0.2, 0); noise(0.04, 0.16, 2200, 0.34); tone(420, 190, 0.07, 'square', 0.2, 0.36); tone(920, 460, 0.055, 'square', 0.24, 1.02) },
        pump(delay) { tone(320, 240, 0.05, 'square', 0.22, delay || 0); tone(240, 180, 0.06, 'square', 0.24, (delay || 0) + 0.13); noise(0.05, 0.15, 1800, (delay || 0) + 0.02) },
        empty() { tone(1200, 620, 0.045, 'square', 0.2); noise(0.025, 0.08, 3000) },
        zombieDie() { tone(155, 36, 0.62, 'sawtooth', 0.34); noise(0.2, 0.14, 600, 0.12) },
        hurt() { tone(130, 58, 0.2, 'square', 0.44); noise(0.15, 0.32, 980) },
        pickup() { tone(520, 880, 0.1, 'triangle', 0.25); tone(780, 1180, 0.12, 'triangle', 0.22, 0.08) },
        pickupWeapon() { tone(392, 392, 0.09, 'triangle', 0.26); tone(523, 523, 0.1, 'triangle', 0.26, 0.09); tone(659, 659, 0.14, 'triangle', 0.26, 0.18) },
        wave() { tone(200, 420, 0.4, 'triangle', 0.3); tone(300, 630, 0.5, 'triangle', 0.22, 0.15) },
        death() { tone(90, 30, 1.2, 'sawtooth', 0.5); noise(0.8, 0.3, 400) },
        growl() { tone(76, 38, 0.8, 'sawtooth', 0.16); tone(58, 31, 0.9, 'square', 0.07, 0.08) },
        step(sprint) { noise(0.075, sprint ? 0.2 : 0.14, 520); tone(74, 48, 0.07, 'sine', sprint ? 0.11 : 0.08) },
        swing() { noise(0.12, 0.18, 900); tone(300, 90, 0.1, 'sine', 0.1) },
        meleeHit() { tone(160, 60, 0.1, 'square', 0.4); noise(0.08, 0.3, 700) },
        throwSfx() { tone(420, 180, 0.16, 'sine', 0.18); noise(0.14, 0.12, 1200) },
        bounce() { tone(300, 140, 0.06, 'square', 0.14) },
        launch() { tone(120, 34, 0.5, 'sawtooth', 0.5); noise(0.4, 0.6, 800) },
        explosion() { tone(88, 22, 0.7, 'sawtooth', 0.7); noise(0.55, 0.85, 520); noise(0.22, 0.5, 1600); tone(46, 20, 0.9, 'sine', 0.4, 0.03) },
        wswitch() { tone(520, 360, 0.05, 'square', 0.16); noise(0.03, 0.08, 2400) },
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

    // ---------- 武器定义 ----------
    const WEAPON_ORDER = ['dagger', 'rifle', 'shotgun', 'grenade', 'rocket']
    const WEAPONS = {
      dagger: { name: '战术匕首', tag: '近战', type: 'melee', rate: 0.38, range: 2.3, arc: 0.6, dmg: 50 },
      rifle: { name: 'M4A1 步枪', tag: '全自动', type: 'auto', rate: 0.105, dmg: 30, headMul: 3, mag: 30, reload: 1.75, pickupMag: 30, pickupReserve: 60, reserveMax: 180 },
      shotgun: { name: '霰弹枪', tag: '泵动', type: 'pump', rate: 0.85, dmg: 14, pellets: 8, spread: 0.05, headMul: 2, mag: 6, reload: 2.2, pickupMag: 6, pickupReserve: 12, reserveMax: 36 },
      grenade: { name: '破片手雷', tag: '投掷', type: 'throw', rate: 0.7, max: 5, pickupCount: 3, radius: 4.6, dmg: 150, selfDmg: 65 },
      rocket: { name: '火箭筒', tag: '爆破', type: 'launch', rate: 1.5, max: 3, pickupCount: 1, radius: 5.2, dmg: 210, selfDmg: 95, speed: 26 },
    }

    const W = {
      phase: 'menu', px: 0, pz: 0, yaw: Math.PI * 0.75, pitch: 0,
      hp: 100, kills: 0, score: 0, headshots: 0, wave: 1, camH: 1.6,
      weapons: null, curWeapon: 'dagger', pendingWeapon: null, switchT: 0, autoSwitchT: 0,
      zombies: [], particles: [], weaponFx: [], floats: [], decals: [], pickups: [], props: [], smoke: [], ash: [], ashW: 0, ashH: 0,
      projectiles: [], explosions: [], worldFx: [],
      spawnQueue: 0, spawnCd: 1.2, waveCleared: false, waveDelay: 0, supplyCd: 9, firstKill: true,
      reloading: false, reloadT: 0, reloadDelay: 0, fireCd: 0, firing: false,
      meleeT: 0, throwT: 0, pumpT: 0,
      keys: {}, moving: false, shake: 0, dmgFlash: 0, hitT: 0, flashT: 0, recoil: 0,
      dead: false, deathT: 0, time: 0, locked: false,
      bannerText: '', bannerT: 0, bannerMax: 0, emptyT: 0, growlCd: 3, footstepCd: 0,
      gunMuzzleX: 0, gunMuzzleY: 0, gunEjectX: 0, gunEjectY: 0,
      cw: 0, ch: 0, _dt: 0, _focal: 0, _cx: 0, _cy: 0, _horizon: 0,
    }

    let loopTimer = null
    let lastT = Date.now()
    const weaponImages = {}

    function loadWeaponImage(id, src) {
      const state = { image: null, ready: false }
      const source = new Image()
      source.onload = () => {
        state.image = source
        state.ready = true
      }
      source.src = src
      weaponImages[id] = state
    }

    loadWeaponImage('rifle', 'assets/m4a1-first-person.png')
    loadWeaponImage('dagger', 'assets/dagger-first-person.png')
    loadWeaponImage('shotgun', 'assets/shotgun-first-person.png')
    loadWeaponImage('grenade', 'assets/grenade-first-person.png')
    loadWeaponImage('rocket', 'assets/rocket-first-person.png')

    // ---------- 武器状态辅助 ----------
    function curDef() { return WEAPONS[W.curWeapon] }
    function curSt() { return W.weapons[W.curWeapon] }
    function ownedWeapons() { return WEAPON_ORDER.filter((id) => W.weapons[id].owned) }
    function requestSwitch(id) {
      if (!id || id === W.curWeapon || !W.weapons[id] || !W.weapons[id].owned) return
      W.pendingWeapon = id
      W.switchT = 0.24
      W.reloading = false
      W.firing = false
      W.autoSwitchT = 0
      audio && audio.wswitch()
    }
    function cycleWeapon(dir) {
      const owned = ownedWeapons()
      if (owned.length < 2) return
      const idx = owned.indexOf(W.curWeapon)
      const next = owned[(idx + dir + owned.length) % owned.length]
      requestSwitch(next)
    }
    function bestFallbackWeapon() {
      const prefer = ['rifle', 'shotgun', 'rocket', 'grenade', 'dagger']
      for (const id of prefer) {
        const st = W.weapons[id]
        if (!st.owned) continue
        const def = WEAPONS[id]
        if (def.type === 'melee') return id
        if (def.mag && st.ammo + st.reserve > 0) return id
        if (!def.mag && st.count > 0) return id
      }
      return 'dagger'
    }

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

    function waveCount(n) { return 7 + n * 3 }

    function spawnZombie(dist) {
      const ang = rand(0, TAU)
      const x = W.px + Math.cos(ang) * dist
      const z = W.pz + Math.sin(ang) * dist
      const wv = Math.max(W.wave, 1)
      let type = 'normal'
      const r = Math.random()
      if (wv >= 3 && r < 0.15) type = 'brute'
      else if (wv >= 2 && r < 0.44) type = 'runner'
      const cfg = {
        normal: { hp: 40 + wv * 5, speed: 1.35 + Math.min(wv * 0.1, 1.3) + rand(0, 0.4), dmg: 9, atk: 1.0, h: 1.72, bw: 0.92 },
        runner: { hp: 28 + wv * 4, speed: 2.6 + rand(0, 0.4) + Math.min(wv * 0.05, 0.5), dmg: 6, atk: 0.75, h: 1.6, bw: 0.78 },
        brute: { hp: 130 + wv * 15, speed: 0.72 + rand(0, 0.15) + Math.min(wv * 0.03, 0.25), dmg: 20, atk: 1.45, h: 2.15, bw: 1.35 },
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
      W.hp = 100
      W.kills = 0; W.score = 0; W.headshots = 0; W.wave = 1
      W.weapons = {
        dagger: { owned: true },
        rifle: { owned: false, ammo: 0, reserve: 0 },
        shotgun: { owned: false, ammo: 0, reserve: 0 },
        grenade: { owned: false, count: 0 },
        rocket: { owned: false, count: 0 },
      }
      W.curWeapon = 'dagger'; W.pendingWeapon = null; W.switchT = 0; W.autoSwitchT = 0
      W.zombies = []; W.particles = []; W.weaponFx = []; W.floats = []; W.pickups = []
      W.projectiles = []; W.explosions = []; W.worldFx = []
      W.spawnQueue = 0; W.spawnCd = 1.2; W.waveCleared = false; W.waveDelay = 0; W.supplyCd = rand(7, 11); W.firstKill = true
      W.reloading = false; W.reloadT = 0; W.reloadDelay = 0; W.fireCd = 0; W.firing = false
      W.meleeT = 0; W.throwT = 0; W.pumpT = 0
      W.dead = false; W.deathT = 0; W.dmgFlash = 0; W.shake = 0; W.hitT = 0; W.flashT = 0; W.recoil = 0; W.emptyT = 0; W.footstepCd = 0
      if (menu) {
        for (let i = 0; i < 9; i++) spawnZombie(rand(13, 27))
      } else {
        W.spawnQueue = waveCount(1)
        W.bannerText = '第 1 波 · 尸潮来袭 · 匕首已就绪'
        W.bannerMax = 2.2
        W.bannerT = W.bannerMax
      }
    }

    function stats() { return { wave: W.wave, kills: W.kills, score: W.score, headshots: W.headshots } }

    // ---------- 动作 ----------
    function beginReload() {
      const def = curDef()
      const st = curSt()
      if (W.reloading || !def.mag || !st.owned || W.phase !== 'playing') return
      if (st.ammo >= def.mag || st.reserve <= 0) return
      W.reloading = true
      W.reloadT = 0
      audio && audio.reload()
    }
    function finishReload() {
      const def = curDef()
      const st = curSt()
      const take = Math.min(def.mag - st.ammo, st.reserve)
      st.ammo += take
      st.reserve -= take
      W.reloading = false
      if (W.curWeapon === 'shotgun') audio && audio.pump(0.1)
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
    function spawnBloodAtScreen(x, y, n) {
      for (let i = 0; i < (n || 8); i++) W.particles.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-110, 110), vy: rand(-170, -20), g: 520, life: rand(0.3, 0.6), size: rand(2, 5) })
    }

    // 射线检测：返回准星前方最近的丧尸命中信息
    function raycastZombies(yawOff, pitchOff, maxDist) {
      let best = null
      let bestDepth = Infinity
      let bestHit = 0
      let bestRel = 0
      for (const z of W.zombies) {
        if (z.dead) continue
        const dx = z.x - W.px
        const dz = z.z - W.pz
        const dist = Math.hypot(dx, dz)
        if (dist > (maxDist || 44) || dist < 0.2) continue
        const rel = normAngle(W.yaw - Math.atan2(dx, dz)) - (yawOff || 0)
        if (Math.abs(rel) > 1.5) continue
        const depthX = dist * Math.cos(rel)
        if (depthX <= 0.1) continue
        if (dist * Math.abs(Math.sin(rel)) > 0.52) continue
        const hitH = W.camH + Math.tan(W.pitch + (pitchOff || 0)) * depthX
        if (hitH < 0 || hitH > z.h) continue
        if (depthX < bestDepth) {
          bestDepth = depthX
          best = z
          bestHit = hitH
          bestRel = rel
        }
      }
      return best ? { z: best, hitH: bestHit, depthX: bestDepth, rel: bestRel } : null
    }

    function applyHit(hit, baseDmg, headMul, knock, quiet) {
      const z = hit.z
      const head = hit.hitH >= z.h * 0.82
      const dmg = head ? baseDmg * (headMul || 3) : baseDmg
      z.hp -= dmg
      z.hitFlash = 0.14
      if (z.wounds.length < 6) z.wounds.push({ dx: rand(-0.28, 0.28), dy: rand(-0.95, -0.15), r: rand(0.05, 0.12) })
      const ddx = z.x - W.px
      const ddz = z.z - W.pz
      const dd = Math.hypot(ddx, ddz) || 1
      z.x += ddx / dd * (knock != null ? knock : 0.55)
      z.z += ddz / dd * (knock != null ? knock : 0.55)
      spawnBlood(hit.hitH, hit.depthX, hit.rel, head)
      if (!quiet) {
        W.hitT = 0.12
        audio && (head ? audio.headshot() : audio.zombieHit())
      }
      if (z.hp <= 0) killZombie(z, head)
      return head
    }

    function spawnCasing(shell, big) {
      const gunU = W.ch / 560
      const ejectX = W.gunEjectX || W.cw * 0.72
      const ejectY = W.gunEjectY || W.ch * 0.66
      const s = big ? 1.5 : 1
      W.weaponFx.push({
        kind: 'casing', shell: !!shell,
        x: ejectX, y: ejectY,
        vx: rand(120, 210) * gunU * s, vy: rand(-190, -115) * gunU * s, g: 520 * gunU,
        rot: rand(0, TAU), vr: rand(9, 16),
        life: 0.72, maxLife: 0.72,
      })
    }
    function spawnMuzzleSmoke(n, big) {
      const gunU = W.ch / 560
      const muzzleX = W.gunMuzzleX || W.cw * 0.62
      const muzzleY = W.gunMuzzleY || W.ch * 0.64
      for (let i = 0; i < n; i++) {
        W.weaponFx.push({
          kind: 'smoke',
          x: muzzleX + rand(-3, 3) * gunU, y: muzzleY,
          vx: rand(-24, -6) * gunU, vy: rand(-46, -18) * gunU, g: -8,
          size: rand(5, 10) * gunU * (big ? 2 : 1),
          life: rand(0.28, 0.48), maxLife: 0.48,
        })
      }
    }

    function shootRifle() {
      const def = WEAPONS.rifle
      const st = W.weapons.rifle
      W.fireCd = def.rate
      st.ammo--
      W.flashT = 0.055
      W.recoil = 1
      W.shake = Math.min(1, W.shake + 0.22)
      W.pitch = clamp(W.pitch + 0.0038, -1.05, 1.05)
      audio && audio.shot()
      spawnCasing(false, false)
      spawnMuzzleSmoke(3, false)
      if (st.ammo <= 0) W.reloadDelay = 0.5
      const hit = raycastZombies(0, 0, 44)
      if (hit) applyHit(hit, def.dmg, def.headMul, 0.55)
    }

    function shootShotgun() {
      const def = WEAPONS.shotgun
      const st = W.weapons.shotgun
      W.fireCd = def.rate
      st.ammo--
      W.flashT = 0.07
      W.recoil = 1.4
      W.shake = Math.min(1.2, W.shake + 0.5)
      W.pitch = clamp(W.pitch + 0.02, -1.05, 1.05)
      W.pumpT = 0.55
      audio && audio.shotgun()
      audio && audio.pump(0.38)
      spawnCasing(true, false)
      spawnMuzzleSmoke(5, true)
      let hits = 0
      let anyHead = false
      for (let i = 0; i < def.pellets; i++) {
        const yawOff = rand(-def.spread, def.spread)
        const pitchOff = rand(-def.spread * 0.7, def.spread * 0.7)
        const hit = raycastZombies(yawOff, pitchOff, 26)
        if (hit) {
          const falloff = clamp(1.15 - hit.depthX / 22, 0.25, 1)
          if (applyHit(hit, def.dmg * falloff, def.headMul, 0.3, true)) anyHead = true
          hits++
        }
      }
      if (hits > 0) {
        W.hitT = 0.12
        audio && (anyHead ? audio.headshot() : audio.zombieHit())
      }
      if (st.ammo <= 0) W.reloadDelay = 0.5
    }

    function meleeSwing() {
      const def = WEAPONS.dagger
      W.fireCd = def.rate
      W.meleeT = 0.3
      audio && audio.swing()
      let hitAny = false
      for (const z of W.zombies) {
        if (z.dead) continue
        const dx = z.x - W.px
        const dz = z.z - W.pz
        const dist = Math.hypot(dx, dz)
        if (dist > def.range) continue
        const rel = normAngle(W.yaw - Math.atan2(dx, dz))
        if (Math.abs(rel) > def.arc) continue
        hitAny = true
        z.hp -= def.dmg
        z.hitFlash = 0.14
        if (z.wounds.length < 6) z.wounds.push({ dx: rand(-0.28, 0.28), dy: rand(-0.95, -0.15), r: rand(0.05, 0.12) })
        const dd = dist || 1
        z.x += dx / dd * 0.9
        z.z += dz / dd * 0.9
        const p = project(z.x, z.z, z.h * 0.55)
        if (p.visible) spawnBloodAtScreen(p.sx, p.sy, 8)
        if (z.hp <= 0) killZombie(z, false)
      }
      if (hitAny) {
        W.hitT = 0.12
        audio && audio.meleeHit()
      }
    }

    function throwGrenade() {
      const def = WEAPONS.grenade
      const st = W.weapons.grenade
      if (st.count <= 0) {
        audio && audio.empty()
        W.firing = false
        return
      }
      st.count--
      W.fireCd = def.rate
      W.throwT = 0.35
      W.firing = false
      audio && audio.throwSfx()
      const cp = Math.cos(W.pitch)
      const sp = Math.sin(W.pitch)
      const dx = Math.sin(W.yaw)
      const dz = Math.cos(W.yaw)
      const speed = 13.5
      W.projectiles.push({
        kind: 'grenade',
        x: W.px + dx * 0.5, z: W.pz + dz * 0.5, h: W.camH - 0.05,
        vx: dx * cp * speed, vz: dz * cp * speed, vy: sp * speed + 1.5,
        fuse: 1.7, spin: rand(0, TAU), vr: rand(-9, 9),
      })
      if (st.count <= 0) W.autoSwitchT = 0.7
    }

    function fireRocket() {
      const def = WEAPONS.rocket
      const st = W.weapons.rocket
      if (st.count <= 0) {
        audio && audio.empty()
        W.firing = false
        return
      }
      st.count--
      W.fireCd = def.rate
      W.throwT = 0.4
      W.firing = false
      W.recoil = 1.6
      W.shake = Math.min(1.3, W.shake + 0.8)
      W.flashT = 0.09
      audio && audio.launch()
      const cp = Math.cos(W.pitch)
      const sp = Math.sin(W.pitch)
      const dx = Math.sin(W.yaw)
      const dz = Math.cos(W.yaw)
      W.projectiles.push({
        kind: 'rocket',
        x: W.px + dx * 0.7, z: W.pz + dz * 0.7, h: W.camH - 0.15,
        vx: dx * cp * def.speed, vz: dz * cp * def.speed, vy: sp * def.speed,
        life: 4,
      })
      spawnMuzzleSmoke(8, true)
      if (st.count <= 0) W.autoSwitchT = 0.9
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
      let dropKind = null
      if (W.firstKill) {
        dropKind = Math.random() < 0.55 ? 'rifle' : 'shotgun'
      } else if (Math.random() < 0.3) {
        const r = Math.random()
        dropKind = r < 0.38 ? 'ammo' : r < 0.6 ? 'med' : r < 0.78 ? 'grenade' : r < 0.88 ? 'shotgun' : r < 0.96 ? 'rifle' : 'rocket'
      }
      W.firstKill = false
      if (dropKind) W.pickups.push({ x: z.x, z: z.z, kind: dropKind, bob: rand(0, 6), taken: false })
    }

    // ---------- 爆炸 ----------
    function explode(x, z, h, def) {
      W.explosions.push({ x, z, h, t: 0, dur: 0.62, radius: def.radius })
      audio && audio.explosion()
      for (const zb of W.zombies) {
        if (zb.dead) continue
        const d = Math.hypot(zb.x - x, zb.z - z)
        if (d > def.radius) continue
        const fall = 1 - (d / def.radius) * 0.72
        zb.hp -= def.dmg * fall
        zb.hitFlash = 0.16
        if (zb.wounds.length < 6) zb.wounds.push({ dx: rand(-0.28, 0.28), dy: rand(-0.95, -0.15), r: rand(0.06, 0.14) })
        const ux = (zb.x - x) / (d || 1)
        const uz = (zb.z - z) / (d || 1)
        zb.x += ux * 1.6 * fall
        zb.z += uz * 1.6 * fall
        const p = project(zb.x, zb.z, zb.h * 0.5)
        if (p.visible) spawnBloodAtScreen(p.sx, p.sy, 7)
        if (zb.hp <= 0) killZombie(zb, false)
      }
      const pd = Math.hypot(W.px - x, W.pz - z)
      if (pd < def.radius * 0.9) {
        damagePlayer(Math.round(def.selfDmg * (1 - pd / (def.radius * 0.9))))
      }
      W.shake = Math.min(1.5, W.shake + clamp(1.3 - pd / 14, 0.25, 1.2))
      W.decals.push({ x, z, r: def.radius * 0.55, a: 0.5, blood: false, scorch: true })
      for (let i = 0; i < 14; i++) {
        const a = rand(0, TAU)
        const sp = rand(2, 9)
        W.worldFx.push({
          kind: 'spark', x: x + Math.cos(a) * 0.3, z: z + Math.sin(a) * 0.3, h: h + rand(0, 0.6),
          vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rand(2, 8),
          life: rand(0.35, 0.7), maxLife: 0.7,
        })
      }
      for (let i = 0; i < 8; i++) {
        W.worldFx.push({
          kind: 'smoke', x: x + rand(-1.2, 1.2), z: z + rand(-1.2, 1.2), h: h + rand(0.2, 1.4),
          life: rand(0.7, 1.3), maxLife: 1.3, r: rand(0.5, 1.1), rise: rand(0.8, 1.8),
        })
      }
    }

    function updateProjectiles(dt) {
      for (const p of W.projectiles) {
        if (p.kind === 'grenade') {
          p.vy -= 9.8 * dt
          p.x += p.vx * dt
          p.z += p.vz * dt
          p.h += p.vy * dt
          p.spin += p.vr * dt
          if (p.x < -46 || p.x > 46) { p.x = clamp(p.x, -46, 46); p.vx *= -0.5 }
          if (p.z < -46 || p.z > 46) { p.z = clamp(p.z, -46, 46); p.vz *= -0.5 }
          if (p.h < 0.12 && p.vy < 0) {
            p.h = 0.12
            p.vy *= -0.42
            p.vx *= 0.6
            p.vz *= 0.6
            if (Math.abs(p.vy) > 1.4) audio && audio.bounce()
          }
          p.fuse -= dt
          let contact = false
          for (const z of W.zombies) {
            if (!z.dead && Math.hypot(z.x - p.x, z.z - p.z) < 0.6 && p.h < z.h + 0.3) { contact = true; break }
          }
          if (p.fuse <= 0 || contact) {
            p.done = true
            explode(p.x, p.z, Math.max(p.h, 0.2), WEAPONS.grenade)
          }
        } else {
          p.vy -= 2.0 * dt
          p.x += p.vx * dt
          p.z += p.vz * dt
          p.h += p.vy * dt
          p.life -= dt
          W.worldFx.push({ kind: 'smoke', x: p.x, z: p.z, h: p.h, life: 0.4, maxLife: 0.4, r: 0.12, rise: 0.5 })
          let hit = p.h <= 0.15 || p.life <= 0
          if (!hit) {
            for (const z of W.zombies) {
              if (!z.dead && Math.hypot(z.x - p.x, z.z - p.z) < 0.85 && p.h < z.h + 0.35) { hit = true; break }
            }
          }
          if (hit) {
            p.done = true
            explode(p.x, p.z, Math.max(p.h, 0.2), WEAPONS.rocket)
          }
        }
      }
      W.projectiles = W.projectiles.filter((p) => !p.done)
      if (W.worldFx.length > 220) W.worldFx.splice(0, W.worldFx.length - 220)
    }

    function updateWorldFx(dt) {
      for (const p of W.worldFx) {
        p.life -= dt
        if (p.kind === 'spark') {
          p.vy -= 9.5 * dt
          p.x += p.vx * dt
          p.z += p.vz * dt
          p.h += p.vy * dt
          if (p.h < 0) {
            p.h = 0
            p.vy *= -0.4
            p.vx *= 0.7
            p.vz *= 0.7
          }
        } else {
          p.h += p.rise * dt
          p.r += dt * 1.1
        }
      }
      W.worldFx = W.worldFx.filter((p) => p.life > 0)
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
      let kind = forcedKind
      if (!kind) {
        const r = Math.random()
        if (W.hp < 48 && r < 0.5) kind = 'med'
        else kind = r < 0.4 ? 'ammo' : r < 0.62 ? 'med' : r < 0.8 ? 'grenade' : r < 0.89 ? 'shotgun' : r < 0.95 ? 'rifle' : 'rocket'
      }
      W.pickups.push({
        x: clamp(W.px + Math.cos(ang) * dist, -42, 42),
        z: clamp(W.pz + Math.sin(ang) * dist, -42, 42),
        kind,
        bob: rand(0, 6),
        taken: false,
      })
      const label = kind === 'ammo' ? '弹药补给已投放' : kind === 'med' ? '医疗补给已投放' : WEAPONS[kind].name + '补给已投放'
      const color = kind === 'ammo' ? '#9fc8ff' : kind === 'med' ? '#7dffa0' : '#ffd166'
      addFloat(label, W.cw / 2, W.ch * 0.34, color)
    }

    function updatePickups(dt) {
      for (const p of W.pickups) {
        p.bob += dt * 3
        const d = Math.hypot(p.x - W.px, p.z - W.pz)
        if (d >= 1.5) continue
        p.taken = true
        const rifle = W.weapons.rifle
        const shotgun = W.weapons.shotgun
        const grenade = W.weapons.grenade
        const rocket = W.weapons.rocket
        if (p.kind === 'ammo') {
          if (!rifle.owned && shotgun.owned) {
            shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, shotgun.reserve + 12)
            addFloat('+12 霰弹', W.cw / 2, W.ch * 0.4, '#9fc8ff')
          } else {
            rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, rifle.reserve + 30)
            addFloat('+30 步枪弹药', W.cw / 2, W.ch * 0.4, '#9fc8ff')
            if (shotgun.owned) {
              shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, shotgun.reserve + 6)
            }
          }
          audio && audio.pickup()
        } else if (p.kind === 'med') {
          W.hp = Math.min(100, W.hp + 30)
          addFloat('+30 生命', W.cw / 2, W.ch * 0.4, '#7dffa0')
          audio && audio.pickup()
        } else if (p.kind === 'grenade') {
          const isNew = !grenade.owned
          grenade.owned = true
          grenade.count = Math.min(WEAPONS.grenade.max, grenade.count + WEAPONS.grenade.pickupCount)
          addFloat(isNew ? '获得 破片手雷 ×' + grenade.count : '+' + WEAPONS.grenade.pickupCount + ' 手雷', W.cw / 2, W.ch * 0.4, '#a8e090')
          audio && audio.pickupWeapon()
          if (isNew) requestSwitch('grenade')
        } else if (p.kind === 'rocket') {
          const isNew = !rocket.owned
          rocket.owned = true
          rocket.count = Math.min(WEAPONS.rocket.max, rocket.count + WEAPONS.rocket.pickupCount)
          addFloat(isNew ? '获得 火箭筒！' : '+1 火箭弹', W.cw / 2, W.ch * 0.4, '#ffb27a')
          audio && audio.pickupWeapon()
          if (isNew) requestSwitch('rocket')
        } else if (p.kind === 'shotgun') {
          if (!shotgun.owned) {
            shotgun.owned = true
            shotgun.ammo = WEAPONS.shotgun.pickupMag
            shotgun.reserve = WEAPONS.shotgun.pickupReserve
            addFloat('获得 霰弹枪！', W.cw / 2, W.ch * 0.4, '#ffd166')
            audio && audio.pickupWeapon()
            requestSwitch('shotgun')
          } else {
            shotgun.reserve = Math.min(WEAPONS.shotgun.reserveMax, shotgun.reserve + WEAPONS.shotgun.pickupReserve)
            addFloat('+' + WEAPONS.shotgun.pickupReserve + ' 霰弹', W.cw / 2, W.ch * 0.4, '#ffd166')
            audio && audio.pickup()
          }
        } else if (p.kind === 'rifle') {
          if (!rifle.owned) {
            rifle.owned = true
            rifle.ammo = WEAPONS.rifle.pickupMag
            rifle.reserve = WEAPONS.rifle.pickupReserve
            addFloat('获得 M4A1 步枪！', W.cw / 2, W.ch * 0.4, '#9fc8ff')
            audio && audio.pickupWeapon()
            requestSwitch('rifle')
          } else {
            rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, rifle.reserve + WEAPONS.rifle.pickupReserve)
            addFloat('+' + WEAPONS.rifle.pickupReserve + ' 步枪弹药', W.cw / 2, W.ch * 0.4, '#9fc8ff')
            audio && audio.pickup()
          }
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
      for (const ex of W.explosions) ex.t += dt
      W.explosions = W.explosions.filter((ex) => ex.t < ex.dur)
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
      if (W.meleeT > 0) W.meleeT = Math.max(0, W.meleeT - dt)
      if (W.throwT > 0) W.throwT = Math.max(0, W.throwT - dt)
      if (W.pumpT > 0) W.pumpT = Math.max(0, W.pumpT - dt)
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
      // 武器切换
      if (W.switchT > 0) {
        W.switchT -= dt
        if (W.pendingWeapon && W.switchT <= 0.12) {
          W.curWeapon = W.pendingWeapon
          W.pendingWeapon = null
          W.fireCd = Math.max(W.fireCd, 0.12)
          // 切到空弹匣的枪时自动开始装填
          const nd = curDef()
          const ns = curSt()
          if (nd.mag && ns.ammo === 0 && ns.reserve > 0) beginReload()
        }
        if (W.switchT < 0) W.switchT = 0
      }
      if (W.autoSwitchT > 0) {
        W.autoSwitchT -= dt
        if (W.autoSwitchT <= 0) requestSwitch(bestFallbackWeapon())
      }
      // 投掷物与爆炸余波
      updateProjectiles(dt)
      updateWorldFx(dt)
      // 紧急补给判断：没有远程武器或远程弹药枯竭时优先投放
      const rs = W.weapons.rifle
      const sg = W.weapons.shotgun
      const hasRanged = rs.owned || sg.owned || W.weapons.rocket.owned || W.weapons.grenade.owned
      let rangedDry = true
      if (rs.owned && rs.ammo + rs.reserve > 0) rangedDry = false
      if (sg.owned && sg.ammo + sg.reserve > 0) rangedDry = false
      if (W.weapons.grenade.owned && W.weapons.grenade.count > 0) rangedDry = false
      if (W.weapons.rocket.owned && W.weapons.rocket.count > 0) rangedDry = false
      const ammoOnGround = W.pickups.some((p) => !p.taken && (p.kind === 'ammo' || p.kind === 'rifle' || p.kind === 'shotgun' || p.kind === 'grenade' || p.kind === 'rocket'))
      const emergency = W.zombies.some((z) => !z.dead) && !ammoOnGround && (!hasRanged || rangedDry)
      if (emergency) W.supplyCd = Math.min(W.supplyCd, 2)
      W.supplyCd -= dt
      if (W.supplyCd <= 0) {
        if (emergency || W.pickups.length < 4) spawnSupply(emergency ? (!hasRanged ? 'rifle' : 'ammo') : null)
        W.supplyCd = rand(8, 13)
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
      // 开火
      if (W.fireCd > 0) W.fireCd -= dt
      if (W.firing && W.locked && W.fireCd <= 0 && W.switchT <= 0) {
        const def = curDef()
        const st = curSt()
        if (def.type === 'melee') meleeSwing()
        else if (def.type === 'throw') throwGrenade()
        else if (def.type === 'launch') fireRocket()
        else if (!W.reloading) {
          if (st.ammo <= 0) {
            if (W.emptyT <= 0) {
              audio && audio.empty()
              W.emptyT = 0.4
            }
          } else if (W.curWeapon === 'rifle') shootRifle()
          else shootShotgun()
        }
      }
      // 换弹（弹匣类武器）
      const cdef = curDef()
      const cst = curSt()
      if (!W.reloading && cdef.mag && cst.ammo === 0 && cst.reserve > 0 && W.reloadDelay > 0) {
        W.reloadDelay -= dt
        if (W.reloadDelay <= 0) beginReload()
      }
      if (W.reloading) {
        W.reloadT += dt
        if (W.reloadT >= cdef.reload) finishReload()
      }
      // 出怪
      if (W.spawnQueue > 0) {
        W.spawnCd -= dt
        if (W.spawnCd <= 0) {
          W.spawnCd = rand(0.35, 0.8)
          W.spawnQueue--
          spawnZombie(rand(30, 38))
        }
      }
      // 波次
      if (W.spawnQueue === 0 && W.zombies.length === 0 && W.projectiles.length === 0 && !W.waveCleared) {
        if (W.wave >= 6) {
          W.phase = 'victory'
          hooks.onPhase('victory', stats())
          exitLock()
          return
        }
        W.wave++
        W.hp = Math.min(100, W.hp + 35)
        const rstat = W.weapons.rifle
        const sstat = W.weapons.shotgun
        rstat.reserve = Math.min(WEAPONS.rifle.reserveMax, rstat.reserve + 30)
        if (sstat.owned) sstat.reserve = Math.min(WEAPONS.shotgun.reserveMax, sstat.reserve + 6)
        W.waveCleared = true
        W.waveDelay = 2.6
        W.bannerText = '第 ' + (W.wave - 1) + ' 波已清除 · 补给 +35 生命 + 弹药'
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
        if (d.blood) g.fillStyle = 'rgba(120,20,16,' + fade.toFixed(3) + ')'
        else if (d.scorch) g.fillStyle = 'rgba(6,5,5,' + fade.toFixed(3) + ')'
        else g.fillStyle = 'rgba(18,14,11,' + fade.toFixed(3) + ')'
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
      const glow = {
        ammo: 'rgba(255,190,80,0.14)',
        med: 'rgba(255,80,90,0.15)',
        grenade: 'rgba(140,255,120,0.13)',
        shotgun: 'rgba(255,150,60,0.14)',
        rifle: 'rgba(120,200,255,0.13)',
        rocket: 'rgba(255,110,50,0.15)',
      }
      const border = {
        ammo: '#e0b056',
        med: '#e05656',
        grenade: '#7dc86a',
        shotgun: '#e08a3c',
        rifle: '#66b8e8',
        rocket: '#ff7a45',
      }
      g.save()
      g.globalAlpha = alpha
      g.fillStyle = glow[pk.kind] || glow.ammo
      g.beginPath()
      g.arc(p.sx, y - sz * 0.55, sz * 2.3, 0, TAU)
      g.fill()
      g.fillStyle = pk.kind === 'med' ? '#3a1a1e' : pk.kind === 'grenade' ? '#26301e' : '#3a2f1d'
      g.fillRect(p.sx - sz * 0.55, y - sz * 1.1, sz * 1.1, sz * 1.1)
      g.lineWidth = 2
      g.strokeStyle = border[pk.kind] || border.ammo
      g.strokeRect(p.sx - sz * 0.55, y - sz * 1.1, sz * 1.1, sz * 1.1)
      if (pk.kind === 'med') {
        g.fillStyle = '#ff6a5e'
        g.fillRect(p.sx - sz * 0.16, y - sz * 0.82, sz * 0.32, sz * 0.6)
        g.fillRect(p.sx - sz * 0.42, y - sz * 0.58, sz * 0.84, sz * 0.16)
      } else if (pk.kind === 'ammo') {
        g.fillStyle = '#ffd166'
        for (const k of [-0.2, 0, 0.2]) g.fillRect(p.sx + k * sz - sz * 0.07, y - sz * (0.7 + Math.abs(k) * 0.9), sz * 0.14, sz * 0.32)
      } else if (pk.kind === 'grenade') {
        g.fillStyle = '#3d4a2c'
        g.beginPath()
        g.arc(p.sx, y - sz * 0.62, sz * 0.2, 0, TAU)
        g.fill()
        g.fillStyle = '#8b8f95'
        g.fillRect(p.sx - sz * 0.05, y - sz * 0.92, sz * 0.1, sz * 0.12)
      } else if (pk.kind === 'shotgun') {
        g.fillStyle = '#c23b2e'
        for (const k of [-0.24, 0, 0.24]) g.fillRect(p.sx + k * sz - sz * 0.08, y - sz * 0.8, sz * 0.16, sz * 0.42)
        g.fillStyle = '#e3bd67'
        for (const k of [-0.24, 0, 0.24]) g.fillRect(p.sx + k * sz - sz * 0.08, y - sz * 0.46, sz * 0.16, sz * 0.08)
      } else if (pk.kind === 'rifle') {
        g.fillStyle = '#9fb6c9'
        g.fillRect(p.sx - sz * 0.4, y - sz * 0.72, sz * 0.8, sz * 0.09)
        g.fillRect(p.sx + sz * 0.28, y - sz * 0.68, sz * 0.22, sz * 0.05)
        g.fillRect(p.sx - sz * 0.12, y - sz * 0.64, sz * 0.12, sz * 0.2)
        g.fillRect(p.sx - sz * 0.52, y - sz * 0.7, sz * 0.14, sz * 0.14)
      } else if (pk.kind === 'rocket') {
        g.save()
        g.translate(p.sx, y - sz * 0.6)
        g.rotate(-0.5)
        g.fillStyle = '#c8342a'
        g.fillRect(-sz * 0.34, -sz * 0.09, sz * 0.68, sz * 0.18)
        g.fillStyle = '#e8e2d8'
        g.beginPath()
        g.moveTo(sz * 0.34, -sz * 0.09)
        g.lineTo(sz * 0.5, 0)
        g.lineTo(sz * 0.34, sz * 0.09)
        g.closePath()
        g.fill()
        g.fillStyle = '#5a5f52'
        g.fillRect(-sz * 0.34, -sz * 0.13, sz * 0.1, sz * 0.08)
        g.fillRect(-sz * 0.34, sz * 0.05, sz * 0.1, sz * 0.08)
        g.restore()
      }
      const isWeapon = pk.kind !== 'ammo' && pk.kind !== 'med'
      if (isWeapon && p.depth < 9) {
        g.font = '600 12px system-ui, sans-serif'
        g.textAlign = 'center'
        g.fillStyle = 'rgba(240,232,222,0.85)'
        g.fillText(WEAPONS[pk.kind].name, p.sx, y - sz * 1.45)
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

    // ---------- 投掷物 / 爆炸 / 世界特效 ----------
    function drawProjectiles(g) {
      for (const p of W.projectiles) {
        const pr = project(p.x, p.z, p.h)
        if (!pr.visible) continue
        const s = pr.scale
        g.save()
        g.translate(pr.sx, pr.sy)
        if (p.kind === 'grenade') {
          g.rotate(p.spin * 0.3)
          g.fillStyle = '#3d4a2c'
          g.beginPath()
          g.arc(0, 0, 0.11 * s, 0, TAU)
          g.fill()
          g.fillStyle = '#2a331f'
          g.beginPath()
          g.arc(-0.03 * s, 0.03 * s, 0.08 * s, 0, TAU)
          g.fill()
          g.fillStyle = '#8b8f95'
          g.fillRect(-0.03 * s, -0.17 * s, 0.06 * s, 0.06 * s)
          if (p.fuse < 0.55 && Math.floor(p.fuse * 9) % 2 === 0) {
            g.fillStyle = '#ff3a1c'
            g.beginPath()
            g.arc(0, -0.14 * s, 0.035 * s, 0, TAU)
            g.fill()
          }
        } else {
          const velYaw = Math.atan2(p.vx, p.vz)
          const rel = normAngle(W.yaw - velYaw)
          const ang = Math.atan2(-p.vy, Math.cos(rel) * Math.hypot(p.vx, p.vz))
          g.rotate(clamp(ang, -1.1, 1.1))
          const L = 0.55 * s
          const Wd = 0.13 * s
          g.fillStyle = 'rgba(255,170,60,0.85)'
          g.beginPath()
          g.moveTo(-L * 0.55, 0)
          g.lineTo(-L * 1.05, -Wd * 0.5)
          g.lineTo(-L * 1.05, Wd * 0.5)
          g.closePath()
          g.fill()
          g.fillStyle = '#c8342a'
          g.beginPath()
          g.moveTo(L * 0.5, 0)
          g.lineTo(L * 0.1, -Wd * 0.55)
          g.lineTo(-L * 0.55, -Wd * 0.42)
          g.lineTo(-L * 0.55, Wd * 0.42)
          g.lineTo(L * 0.1, Wd * 0.55)
          g.closePath()
          g.fill()
          g.fillStyle = '#e8e2d8'
          g.beginPath()
          g.moveTo(L * 0.5, 0)
          g.lineTo(L * 0.28, -Wd * 0.4)
          g.lineTo(L * 0.28, Wd * 0.4)
          g.closePath()
          g.fill()
        }
        g.restore()
      }
    }

    function drawWorldFx(g) {
      for (const p of W.worldFx) {
        const pr = project(p.x, p.z, p.h)
        if (!pr.visible) continue
        const a = clamp(p.life / p.maxLife, 0, 1)
        if (p.kind === 'spark') {
          g.fillStyle = 'rgba(255,' + Math.round(120 + 100 * a) + ',60,' + (a * 0.9).toFixed(3) + ')'
          g.beginPath()
          g.arc(pr.sx, pr.sy, Math.max(1.5, 0.09 * pr.scale), 0, TAU)
          g.fill()
        } else {
          g.fillStyle = 'rgba(120,110,102,' + (a * 0.34).toFixed(3) + ')'
          g.beginPath()
          g.arc(pr.sx, pr.sy, p.r * pr.scale, 0, TAU)
          g.fill()
        }
      }
    }

    function drawExplosions(g) {
      for (const ex of W.explosions) {
        const pr1 = clamp(ex.t / ex.dur, 0, 1)
        const ease = 1 - Math.pow(1 - pr1, 2)
        const p = project(ex.x, ex.z, ex.h)
        if (p.visible) {
          const r = ex.radius * p.scale * (0.3 + 0.55 * ease)
          const a = 1 - pr1
          const grad = g.createRadialGradient(p.sx, p.sy, Math.max(1, r * 0.1), p.sx, p.sy, r)
          grad.addColorStop(0, 'rgba(255,252,224,' + (a * 0.95).toFixed(3) + ')')
          grad.addColorStop(0.35, 'rgba(255,170,64,' + (a * 0.8).toFixed(3) + ')')
          grad.addColorStop(1, 'rgba(180,50,12,0)')
          g.fillStyle = grad
          g.beginPath()
          g.arc(p.sx, p.sy, r, 0, TAU)
          g.fill()
        }
        const gp = project(ex.x, ex.z, 0)
        if (gp.visible) {
          const ringR = ex.radius * gp.scale * (0.4 + 0.85 * ease)
          g.strokeStyle = 'rgba(255,200,140,' + ((1 - pr1) * 0.5).toFixed(3) + ')'
          g.lineWidth = Math.max(1.5, 3 * (1 - pr1))
          g.beginPath()
          g.ellipse(gp.sx, gp.sy, ringR, ringR * 0.3, 0, 0, TAU)
          g.stroke()
        }
      }
    }

    // ---------- 武器视图模型 ----------
    function vmBob(t, u) {
      return {
        x: W.moving ? Math.cos(t * 5.5) * 6 * u : Math.sin(t * 1.5) * 1.5 * u,
        y: W.moving ? Math.sin(t * 11) * 5 * u : Math.sin(t * 2.1) * 1.4 * u,
      }
    }
    function vmDip(u) {
      const def = curDef()
      const sw = W.switchT > 0 ? Math.sin(clamp(W.switchT / 0.24, 0, 1) * Math.PI) : 0
      const rl = W.reloading && def.reload ? Math.sin(clamp(W.reloadT / def.reload, 0, 1) * Math.PI) : 0
      return (sw * 130 + rl * 46) * u
    }
    function drawMuzzleFlash(g, mx, my, scale, fs, u) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      const glow = g.createRadialGradient(mx, my, 2, mx, my, 44 * scale)
      glow.addColorStop(0, 'rgba(255,250,207,' + fs.toFixed(3) + ')')
      glow.addColorStop(0.32, 'rgba(255,157,48,' + (fs * 0.78).toFixed(3) + ')')
      glow.addColorStop(1, 'rgba(255,63,10,0)')
      g.fillStyle = glow
      g.beginPath()
      g.arc(mx, my, 44 * scale, 0, TAU)
      g.fill()
      const aimAngle = Math.atan2(W.ch * 0.5 - my, W.cw * 0.5 - mx)
      g.translate(mx, my)
      g.rotate(aimAngle)
      g.fillStyle = 'rgba(255,241,154,' + fs.toFixed(3) + ')'
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(70 * scale, -15 * scale)
      g.lineTo(43 * scale, 0)
      g.lineTo(74 * scale, 14 * scale)
      g.lineTo(31 * scale, 8 * scale)
      g.closePath()
      g.fill()
      g.restore()
    }

    function drawDaggerVM(g) {
      const w = W.cw
      const h = W.ch
      const u = h / 560
      const t = W.time
      const bob = vmBob(t, u)
      const dip = vmDip(u)
      const swinging = W.meleeT > 0
      const swingP = swinging ? 1 - W.meleeT / 0.3 : 0
      const view = weaponImages.dagger
      if (view && view.ready) {
        const image = view.image
        const iw = image.naturalWidth || image.width
        const ih = image.naturalHeight || image.height
        const scale = Math.min(w / iw, h / ih) * 0.82
        const dw = iw * scale
        const dh = ih * scale
        const slash = swinging ? Math.sin(swingP * Math.PI) : 0
        const x = w - dw + bob.x - slash * 76 * u
        const y = h - dh + bob.y + dip - slash * 34 * u
        const pivotX = w + 34
        const pivotY = h + 28
        g.save()
        g.translate(pivotX, pivotY)
        g.rotate(-slash * 0.32)
        g.translate(-pivotX, -pivotY)
        g.drawImage(image, x, y, dw, dh)
        g.restore()
        return
      }
      const bx = w * 0.74 + bob.x
      const by = h * 0.86 + bob.y + dip
      g.save()
      g.translate(bx, by)
      // 小臂
      g.strokeStyle = '#2a2622'
      g.lineWidth = 46 * u
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(120 * u, 190 * u)
      g.lineTo(0, 20 * u)
      g.stroke()
      // 挥砍角度：从左上劈向右下
      const ang = swinging ? -1.15 + Math.pow(swingP, 0.65) * 1.9 : -0.35 + Math.sin(t * 1.7) * 0.05
      g.rotate(ang)
      // 握拳
      g.fillStyle = '#23201d'
      g.beginPath()
      g.arc(0, 0, 21 * u, 0, TAU)
      g.fill()
      // 刀刃
      const bl = 150 * u
      const grad = g.createLinearGradient(0, -14 * u, bl, 14 * u)
      grad.addColorStop(0, '#d9dde2')
      grad.addColorStop(0.5, '#f4f7fa')
      grad.addColorStop(1, '#aab2ba')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(6 * u, -16 * u)
      g.lineTo(bl, -4 * u)
      g.lineTo(bl + 22 * u, 2 * u)
      g.lineTo(6 * u, 12 * u)
      g.closePath()
      g.fill()
      // 护手与刀柄
      g.fillStyle = '#3c3630'
      g.fillRect(0, -20 * u, 8 * u, 40 * u)
      g.fillStyle = '#1c1916'
      g.fillRect(-34 * u, -11 * u, 34 * u, 22 * u)
      g.restore()
      // 挥砍轨迹
      if (swinging && swingP > 0.1) {
        g.save()
        g.globalAlpha = 0.3 * (W.meleeT / 0.3)
        g.strokeStyle = '#eef4f8'
        g.lineWidth = 10 * u
        g.lineCap = 'round'
        g.beginPath()
        g.arc(bx, by, 150 * u, -1.15 + Math.pow(Math.max(swingP - 0.3, 0), 0.65) * 1.9, ang)
        g.stroke()
        g.restore()
      }
    }

    function drawRifleVM(g) {
      const w = W.cw
      const h = W.ch
      const u = h / 720
      const t = W.time
      const def = WEAPONS.rifle
      const view = weaponImages.rifle
      if (!view || !view.ready) {
        // 图片未就绪时的简笔后备视图
        const bob = vmBob(t, u)
        const dip = vmDip(u)
        g.save()
        g.translate(w * 0.8 + bob.x, h * 0.9 + bob.y + dip + W.recoil * 12 * u)
        g.rotate(-0.18 + W.recoil * 0.03)
        g.fillStyle = '#26282e'
        g.fillRect(-40 * u, -30 * u, 320 * u, 34 * u)
        g.fillStyle = '#2f3238'
        g.fillRect(60 * u, -46 * u, 120 * u, 18 * u)
        g.fillStyle = '#2a2018'
        g.fillRect(-10 * u, 4 * u, 40 * u, 70 * u)
        g.restore()
        W.gunMuzzleX = w * 0.66
        W.gunMuzzleY = h * 0.64
        W.gunEjectX = w * 0.74
        W.gunEjectY = h * 0.68
        if (W.flashT > 0) drawMuzzleFlash(g, W.gunMuzzleX, W.gunMuzzleY, u, W.flashT / 0.055, u)
        return
      }
      const image = view.image
      const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight) * 0.82
      const dw = image.naturalWidth * scale
      const dh = image.naturalHeight * scale
      const bobX = W.moving ? Math.cos(t * 5.5) * 6 * u : Math.sin(t * 1.5) * 1.5 * u
      const bobY = W.moving ? Math.sin(t * 11) * 5 * u : Math.sin(t * 2.1) * 1.4 * u
      const reloadP = W.reloading ? clamp(W.reloadT / def.reload, 0, 1) : 0
      const reloadArc = Math.sin(reloadP * Math.PI)
      const x = w - dw + bobX + W.recoil * 5 * u
      const y = h - dh + bobY + W.recoil * 9 * u + reloadArc * h * 0.065 + vmDip(u)
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
      g.drawImage(image, x, y, dw, dh)

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

    function drawShotgunVM(g) {
      const w = W.cw
      const h = W.ch
      const u = h / 560
      const t = W.time
      const bob = vmBob(t, u)
      const dip = vmDip(u)
      const view = weaponImages.shotgun
      if (view && view.ready) {
        const image = view.image
        const iw = image.naturalWidth || image.width
        const ih = image.naturalHeight || image.height
        const scale = Math.min(w / iw, h / ih) * 0.8
        const dw = iw * scale
        const dh = ih * scale
        const pumpP = W.pumpT > 0 ? Math.sin(clamp((0.55 - W.pumpT) / 0.55, 0, 1) * Math.PI) : 0
        const x = w - dw + bob.x + W.recoil * 6 * u - pumpP * 14 * u
        const y = h - dh + bob.y + dip + W.recoil * 11 * u + pumpP * 4 * u
        const pivotX = w - 20
        const pivotY = h + 20
        g.save()
        g.translate(pivotX, pivotY)
        g.rotate(W.recoil * 0.018 - pumpP * 0.012)
        g.translate(-pivotX, -pivotY)
        g.drawImage(image, x, y, dw, dh)
        g.restore()
        const muzzleX = x + dw * 0.52
        const muzzleY = y + dh * 0.4
        W.gunMuzzleX = muzzleX
        W.gunMuzzleY = muzzleY
        W.gunEjectX = x + dw * 0.7
        W.gunEjectY = y + dh * 0.63
        if (W.flashT > 0) drawMuzzleFlash(g, muzzleX, muzzleY, u * 1.5, W.flashT / 0.07, u)
        return
      }
      const baseX = w * 0.88 + bob.x
      const baseY = h * 0.94 + bob.y + dip + W.recoil * 18 * u
      const ang = -0.62 + W.recoil * 0.05
      const L = Math.min(w, h) * 0.46
      g.save()
      g.translate(baseX, baseY)
      g.rotate(ang)
      // 双管
      g.fillStyle = '#26282e'
      g.fillRect(-70 * u, -26 * u, L, 22 * u)
      g.fillStyle = '#1b1d21'
      g.fillRect(-70 * u, -4 * u, L, 22 * u)
      g.fillStyle = 'rgba(255,255,255,0.09)'
      g.fillRect(-70 * u, -24 * u, L, 5 * u)
      // 管口
      g.fillStyle = '#0c0d10'
      g.fillRect(L - 70 * u - 8 * u, -28 * u, 8 * u, 50 * u)
      // 护木抽拉动画
      const pumpP = W.pumpT > 0 ? Math.sin(clamp((0.55 - W.pumpT) / 0.55, 0, 1) * Math.PI) : 0
      g.fillStyle = '#4a3527'
      g.fillRect(L * 0.4 - pumpP * 46 * u, -32 * u, 92 * u, 56 * u)
      g.strokeStyle = 'rgba(0,0,0,0.35)'
      g.lineWidth = 2
      g.strokeRect(L * 0.4 - pumpP * 46 * u, -32 * u, 92 * u, 56 * u)
      // 机匣
      g.fillStyle = '#33363d'
      g.fillRect(-46 * u, -32 * u, L * 0.5, 64 * u)
      g.restore()
      const muzzleX = baseX + Math.cos(ang) * (L - 70 * u)
      const muzzleY = baseY + Math.sin(ang) * (L - 70 * u)
      W.gunMuzzleX = muzzleX
      W.gunMuzzleY = muzzleY
      W.gunEjectX = baseX + Math.cos(ang) * L * 0.5
      W.gunEjectY = baseY + Math.sin(ang) * L * 0.5
      if (W.flashT > 0) drawMuzzleFlash(g, muzzleX, muzzleY, u * 1.5, W.flashT / 0.07, u)
    }

    function drawGrenadeVM(g) {
      const w = W.cw
      const h = W.ch
      const u = h / 560
      const t = W.time
      const bob = vmBob(t, u)
      const dip = vmDip(u)
      const st = W.weapons.grenade
      // 投掷动画：先后拉再前送
      let thrust = 0
      if (W.throwT > 0) {
        const p = 1 - W.throwT / 0.35
        thrust = Math.sin(p * Math.PI) * (p < 0.5 ? -1 : 1.6)
      }
      const view = weaponImages.grenade
      if (view && view.ready) {
        const image = view.image
        const iw = image.naturalWidth || image.width
        const ih = image.naturalHeight || image.height
        const scale = Math.min(w / iw, h / ih) * 0.9
        const dw = iw * scale
        const dh = ih * scale
        const x = w - dw + bob.x - thrust * 70 * u
        const y = h - dh + bob.y + dip + Math.abs(thrust) * 12 * u
        const pivotX = w + 24
        const pivotY = h + 24
        g.save()
        g.translate(pivotX, pivotY)
        g.rotate(-thrust * 0.11)
        g.translate(-pivotX, -pivotY)
        g.drawImage(image, x, y, dw, dh)
        g.restore()
        return
      }
      const bx = w * 0.78 + bob.x - thrust * 70 * u
      const by = h * 0.84 + bob.y + dip + Math.abs(thrust) * 12 * u
      g.save()
      g.translate(bx, by)
      // 手臂
      g.strokeStyle = '#2a2622'
      g.lineWidth = 42 * u
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(120 * u, 180 * u)
      g.lineTo(0, 10 * u)
      g.stroke()
      if (st.count > 0 || W.throwT <= 0) {
        g.save()
        g.rotate(-0.5)
        // 雷体
        g.fillStyle = '#3d4a2c'
        g.beginPath()
        g.arc(0, -26 * u, 30 * u, 0, TAU)
        g.fill()
        g.fillStyle = '#2f3a22'
        g.beginPath()
        g.arc(-8 * u, -20 * u, 20 * u, 0, TAU)
        g.fill()
        // 破片刻纹
        g.strokeStyle = 'rgba(0,0,0,0.35)'
        g.lineWidth = 2.5 * u
        g.beginPath()
        g.moveTo(-24 * u, -34 * u)
        g.lineTo(22 * u, -18 * u)
        g.moveTo(-26 * u, -18 * u)
        g.lineTo(20 * u, -34 * u)
        g.stroke()
        // 引信与保险夹
        g.fillStyle = '#8b8f95'
        g.fillRect(-7 * u, -62 * u, 14 * u, 10 * u)
        g.strokeStyle = '#a9adb3'
        g.lineWidth = 4 * u
        g.beginPath()
        g.moveTo(7 * u, -58 * u)
        g.quadraticCurveTo(26 * u, -52 * u, 18 * u, -34 * u)
        g.stroke()
        // 握持的手
        g.fillStyle = '#23201d'
        g.beginPath()
        g.arc(6 * u, -12 * u, 15 * u, 0, TAU)
        g.fill()
        g.restore()
      }
      g.restore()
    }

    function drawRocketVM(g) {
      const w = W.cw
      const h = W.ch
      const u = h / 560
      const t = W.time
      const bob = vmBob(t, u)
      const dip = vmDip(u)
      const kick = W.throwT > 0 ? Math.sin(clamp((0.4 - W.throwT) / 0.4, 0, 1) * Math.PI) : 0
      const view = weaponImages.rocket
      if (view && view.ready) {
        const image = view.image
        const iw = image.naturalWidth || image.width
        const ih = image.naturalHeight || image.height
        const scale = Math.min(w / iw, h / ih) * 0.78
        const dw = iw * scale
        const dh = ih * scale
        const x = w - dw + bob.x + kick * 34 * u
        const y = h - dh + bob.y + dip + kick * 24 * u
        const pivotX = w - 18
        const pivotY = h + 22
        g.save()
        g.translate(pivotX, pivotY)
        g.rotate(kick * 0.018)
        g.translate(-pivotX, -pivotY)
        g.drawImage(image, x, y, dw, dh)
        g.restore()
        W.gunMuzzleX = x + dw * 0.545
        W.gunMuzzleY = y + dh * 0.47
        W.gunEjectX = x + dw * 0.72
        W.gunEjectY = y + dh * 0.65
        if (W.flashT > 0) drawMuzzleFlash(g, W.gunMuzzleX, W.gunMuzzleY, u * 2.2, W.flashT / 0.09, u)
        return
      }
      const bx = w * 0.82 + bob.x + kick * 36 * u
      const by = h * 0.9 + bob.y + dip + kick * 28 * u
      const ang = -0.56
      const L = Math.min(w, h) * 0.5
      g.save()
      g.translate(bx, by)
      g.rotate(ang)
      // 发射筒
      const tubeGrd = g.createLinearGradient(0, -40 * u, 0, 40 * u)
      tubeGrd.addColorStop(0, '#3a4034')
      tubeGrd.addColorStop(0.5, '#2c3128')
      tubeGrd.addColorStop(1, '#20241d')
      g.fillStyle = tubeGrd
      g.fillRect(-L * 0.35, -38 * u, L, 76 * u)
      // 环箍
      g.fillStyle = '#191c16'
      for (const k of [0.05, 0.45, 0.85]) g.fillRect(-L * 0.35 + L * k, -40 * u, 10 * u, 80 * u)
      // 前端管口
      g.fillStyle = '#0a0b09'
      g.beginPath()
      g.ellipse(L * 0.65, 0, 16 * u, 38 * u, 0, 0, TAU)
      g.fill()
      // 准星片与握把
      g.fillStyle = '#5a5f52'
      g.fillRect(L * 0.55, -58 * u, 8 * u, 22 * u)
      g.fillStyle = '#23201d'
      g.save()
      g.translate(L * 0.1, 38 * u)
      g.rotate(0.5)
      g.fillRect(-9 * u, 0, 18 * u, 44 * u)
      g.restore()
      g.restore()
      W.gunMuzzleX = bx + Math.cos(ang) * L * 0.65
      W.gunMuzzleY = by + Math.sin(ang) * L * 0.65
      W.gunEjectX = bx
      W.gunEjectY = by
      if (W.flashT > 0) drawMuzzleFlash(g, W.gunMuzzleX, W.gunMuzzleY, u * 2.2, W.flashT / 0.09, u)
    }

    function drawViewmodel(g) {
      if (W.curWeapon === 'rifle') drawRifleVM(g)
      else if (W.curWeapon === 'shotgun') drawShotgunVM(g)
      else if (W.curWeapon === 'dagger') drawDaggerVM(g)
      else if (W.curWeapon === 'grenade') drawGrenadeVM(g)
      else drawRocketVM(g)
    }

    function drawWeaponFx(g) {
      for (const p of W.weaponFx) {
        const a = clamp(p.life / p.maxLife, 0, 1)
        if (p.kind === 'smoke') {
          g.fillStyle = 'rgba(192,184,174,' + (a * 0.18).toFixed(3) + ')'
          g.beginPath()
          g.arc(p.x, p.y, p.size * (1.35 - a * 0.35), 0, TAU)
          g.fill()
        } else if (p.shell) {
          g.save()
          g.globalAlpha = a
          g.translate(p.x, p.y)
          g.rotate(p.rot)
          g.fillStyle = '#c23b2e'
          g.fillRect(-7, -3, 13, 6)
          g.fillStyle = '#e3bd67'
          g.fillRect(-7, -3, 4, 6)
          g.restore()
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

    // ---------- 武器栏图标 ----------
    function drawWeaponIcon(g, id, cx, cy) {
      g.save()
      g.translate(cx, cy)
      if (id === 'dagger') {
        g.rotate(-0.7)
        g.fillStyle = '#e8ecf0'
        g.fillRect(-2, -10, 3.5, 15)
        g.beginPath()
        g.moveTo(-2, 5)
        g.lineTo(5, 8)
        g.lineTo(-2, 11)
        g.closePath()
        g.fill()
        g.fillStyle = '#6b625a'
        g.fillRect(-2.5, -13, 5, 3)
        g.fillRect(-1.5, 5, 3, 8)
      } else if (id === 'rifle') {
        g.fillStyle = '#c9d2da'
        g.fillRect(-15, -2, 26, 4)
        g.fillRect(11, -1, 7, 2.5)
        g.fillStyle = '#8a939c'
        g.fillRect(-10, 2, 5, 5)
        g.fillRect(-19, -1, 5, 3)
      } else if (id === 'shotgun') {
        g.fillStyle = '#c9d2da'
        g.fillRect(-14, -3.5, 27, 2.6)
        g.fillRect(-14, 0.5, 27, 2.6)
        g.fillStyle = '#9c6b3f'
        g.fillRect(-19, -3, 6, 7)
      } else if (id === 'grenade') {
        g.fillStyle = '#7fa065'
        g.beginPath()
        g.arc(0, 1.5, 5.5, 0, TAU)
        g.fill()
        g.fillStyle = '#aab0b6'
        g.fillRect(-1.7, -7, 3.4, 4)
        g.strokeStyle = '#aab0b6'
        g.lineWidth = 1.4
        g.beginPath()
        g.arc(4.5, -5, 2.6, -1, 1.4)
        g.stroke()
      } else if (id === 'rocket') {
        g.rotate(-0.45)
        g.fillStyle = '#d24a3c'
        g.fillRect(-11, -3, 18, 6)
        g.fillStyle = '#e8e2d8'
        g.beginPath()
        g.moveTo(7, -3)
        g.lineTo(12, 0)
        g.lineTo(7, 3)
        g.closePath()
        g.fill()
        g.fillStyle = '#8b8f95'
        g.fillRect(-11, -5, 4, 2.4)
        g.fillRect(-11, 2.6, 4, 2.4)
      }
      g.restore()
    }

    function drawHud(g) {
      const w = W.cw
      const h = W.ch
      const hp = Math.max(0, W.hp)
      const def = curDef()
      const st = curSt()
      // 左下：生命
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
      // 右下：武器面板
      const ax = w - 26
      const ay = h - 38
      g.textAlign = 'right'
      g.fillStyle = 'rgba(8,10,12,0.38)'
      g.fillRect(ax - 250, ay - 82, 250, 112)
      g.font = '600 13px system-ui, sans-serif'
      g.fillStyle = '#8d827a'
      g.fillText(def.name + ' · ' + def.tag, ax, ay - 62)
      if (def.mag) {
        g.font = '700 36px system-ui, sans-serif'
        g.fillStyle = (st.ammo === 0 && !W.reloading) ? '#ff5a38' : '#f2e6dc'
        g.fillText(String(st.ammo), ax - 74, ay - 12)
        g.font = '600 16px system-ui, sans-serif'
        g.fillStyle = '#9a8f88'
        g.fillText('/ ' + st.reserve, ax, ay - 12)
      } else if (def.type === 'throw' || def.type === 'launch') {
        g.font = '700 36px system-ui, sans-serif'
        g.fillStyle = st.count === 0 ? '#ff5a38' : '#f2e6dc'
        g.fillText('× ' + st.count, ax, ay - 12)
      } else {
        g.font = '700 36px system-ui, sans-serif'
        g.fillStyle = '#f2e6dc'
        g.fillText('∞', ax, ay - 12)
      }
      if (W.reloading && def.reload) {
        const pr = clamp(W.reloadT / def.reload, 0, 1)
        g.fillStyle = 'rgba(255,255,255,0.16)'
        g.fillRect(ax - 150, ay - 104, 150, 6)
        g.fillStyle = '#ffb199'
        g.fillRect(ax - 150, ay - 104, 150 * pr, 6)
        g.font = '600 12px system-ui, sans-serif'
        g.fillStyle = '#ffb199'
        g.fillText('换弹中…', ax, ay - 110)
      }
      // 武器槽
      const slotW = 42
      const slotH = 30
      const gap = 6
      const totalW2 = WEAPON_ORDER.length * slotW + (WEAPON_ORDER.length - 1) * gap
      const sx = ax - totalW2
      const sy = ay + 6
      g.textAlign = 'center'
      for (let i = 0; i < WEAPON_ORDER.length; i++) {
        const id = WEAPON_ORDER[i]
        const wst = W.weapons[id]
        const isCur = id === W.curWeapon
        const x = sx + i * (slotW + gap)
        g.globalAlpha = wst.owned ? 1 : 0.22
        g.fillStyle = isCur ? 'rgba(255,140,70,0.18)' : 'rgba(255,255,255,0.06)'
        g.fillRect(x, sy, slotW, slotH)
        g.strokeStyle = isCur ? 'rgba(255,150,80,0.9)' : 'rgba(255,255,255,0.18)'
        g.lineWidth = isCur ? 2 : 1
        g.strokeRect(x, sy, slotW, slotH)
        drawWeaponIcon(g, id, x + slotW / 2, sy + slotH / 2)
        g.font = '600 9px system-ui, sans-serif'
        g.fillStyle = '#8d827a'
        g.fillText(String(i + 1), x + 7, sy + 10)
        g.globalAlpha = 1
      }
      // 右上：波次
      g.font = '700 20px system-ui, sans-serif'
      g.fillStyle = '#ffb199'
      g.fillText('第 ' + W.wave + ' 波', w - 26, 36)
      g.font = '600 14px system-ui, sans-serif'
      g.fillStyle = '#c9bfb8'
      g.fillText('击杀 ' + W.kills + ' · 得分 ' + W.score, w - 26, 58)
      const remaining = W.spawnQueue + W.zombies.filter((z) => !z.dead).length
      g.fillText('剩余丧尸 ' + remaining, w - 26, 78)
      // 提示
      g.font = '600 12px system-ui, sans-serif'
      g.fillStyle = 'rgba(233,222,212,0.62)'
      g.fillText('Esc 暂停 / 退出本局', w / 2, 26)
      g.font = '600 13px system-ui, sans-serif'
      g.fillStyle = 'rgba(233,222,212,0.7)'
      g.fillText('左键 攻击 · 右键 / 滚轮 切换武器 · 1-5 直选 · R 换弹 · M 声音', w / 2, h - 18)
      // 准星
      const spread = (W.moving ? 7 : 2) + W.recoil * 9
      const cx = w / 2
      const cy = h / 2
      if (def.type === 'melee') {
        g.strokeStyle = 'rgba(232,244,239,0.8)'
        g.lineWidth = 2
        g.beginPath()
        g.arc(cx, cy, 10, 0, TAU)
        g.stroke()
        g.fillStyle = 'rgba(126,224,197,0.95)'
        g.fillRect(cx - 1, cy - 1, 2, 2)
      } else {
        const gap2 = 9 + spread
        const len = 7
        g.strokeStyle = 'rgba(232,244,239,0.94)'
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(cx - gap2 - len, cy); g.lineTo(cx - gap2, cy)
        g.moveTo(cx + gap2, cy); g.lineTo(cx + gap2 + len, cy)
        g.moveTo(cx, cy - gap2 - len); g.lineTo(cx, cy - gap2)
        g.moveTo(cx, cy + gap2); g.lineTo(cx, cy + gap2 + len)
        g.stroke()
        g.fillStyle = 'rgba(126,224,197,0.95)'
        g.fillRect(cx - 1, cy - 1, 2, 2)
      }
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
      drawWorldFx(g)
      drawProjectiles(g)
      drawExplosions(g)
      drawParticles(g)
      drawAsh(g)
      if (W.phase === 'playing') {
        drawViewmodel(g)
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
      const digit = e.code.match(/^Digit([1-5])$/)
      if (digit && W.phase === 'playing' && !W.dead) {
        const id = WEAPON_ORDER[Number(digit[1]) - 1]
        if (W.weapons[id].owned) requestSwitch(id)
      }
    }
    function onKeyUp(e) {
      W.keys[e.code] = false
    }
    function onMouseDown(e) {
      if (e.button === 2) {
        if (W.phase === 'playing' && !W.dead) cycleWeapon(1)
        return
      }
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
    function onContextMenu(e) {
      e.preventDefault()
    }
    function onWheel(e) {
      if (W.phase === 'playing' && !W.dead) cycleWeapon(e.deltaY > 0 ? 1 : -1)
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
        canvas.addEventListener('contextmenu', onContextMenu)
        canvas.addEventListener('wheel', onWheel, { passive: true })
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
        canvas.removeEventListener('contextmenu', onContextMenu)
        canvas.removeEventListener('wheel', onWheel)
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
