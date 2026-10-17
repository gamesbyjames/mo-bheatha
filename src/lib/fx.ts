/** Tiny confetti effect with no dependencies. Skipped if the user prefers reduced motion. */

const COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#f97316']

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 2, amount = 24) {
  if (reduced()) return
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '100',
  })
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const parts = Array.from({ length: amount }, () => {
    const a = Math.random() * Math.PI * 2
    const v = 3 + Math.random() * 6
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      s: 5 + Math.random() * 5,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
  })

  const start = performance.now()
  const DURATION = 1300
  const tick = (now: number) => {
    const t = now - start
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = Math.max(0, 1 - t / DURATION)
    for (const p of parts) {
      p.vy += 0.25
      p.vx *= 0.98
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      ctx.restore()
    }
    if (t < DURATION) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

/** Floating "+10" label that drifts up from the tap point. */
export function floatText(text: string, x: number, y: number, color = '#34d399') {
  const el = document.createElement('div')
  el.textContent = text
  el.className = 'float-text'
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, color })
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 900)
}
