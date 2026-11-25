import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { CANVAS, CARD_SIZE, cardsInTrail, CHIP, PATH_SLOTS, stepAnchor, TRAIL_X } from '../layout'
import { useDemo } from '../store'
import type { CardData } from '../types'

const THREAD = '#D98B6A'
const THREAD_DARK = '#B9704F'

interface P {
  x: number
  y: number
}

function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** A point on the card face in path coordinates. u, v run 0..1 across and down the face. */
function facePoint(card: CardData, u: number, v: number): P {
  const s = PATH_SLOTS[card.id]
  const size = CARD_SIZE[card.type]
  const lx = u * size.w * s.scale
  const ly = v * size.h * s.scale
  const a = (s.rotate * Math.PI) / 180
  return { x: s.x + lx * Math.cos(a) - ly * Math.sin(a), y: s.y + lx * Math.sin(a) + ly * Math.cos(a) }
}

function box(card: CardData) {
  const s = PATH_SLOTS[card.id]
  const size = CARD_SIZE[card.type]
  return { left: s.x, right: s.x + size.w * s.scale, top: s.y, bottom: s.y + size.h * s.scale }
}

/** Smooth curve through the points (Catmull-Rom, as cubic Béziers). */
function spline(pts: P[], k = 1) {
  const f = (n: number) => n.toFixed(1)
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * k, y: p1.y + ((p2.y - p0.y) / 6) * k }
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * k, y: p2.y - ((p3.y - p1.y) / 6) * k }
    d += ` C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(p2.x)} ${f(p2.y)}`
  }
  return d
}

interface Thread {
  id: string
  d: string
  end: P
}

/**
 * One thread per card: a shared strand up the gap between the chip columns,
 * then a gentle S out to a pin on the bottom edge of the card face.
 * The threads themselves lie UNDER the traced cards and the lines written
 * beneath them (see the z-index below), so they never run over the ink.
 */
function buildThreads(t: number): Thread[] {
  const cards = cardsInTrail(t)
  const tx = TRAIL_X[t]
  const start = stepAnchor(t)
  const shared = rng(t * 31 + 5)
  const sw = (amp: number) => (shared() - 0.5) * 2 * amp
  const trunk: P[] = [
    { x: start.x, y: start.y - 2 },
    { x: tx + sw(2.2), y: CHIP.top + CHIP.h * 1.6 + sw(6) },
    { x: tx + sw(2.2), y: CHIP.top + CHIP.h * 0.55 + sw(6) },
  ]

  return cards.map((card, i) => {
    const r = rng(t * 17 + i * 7 + 3)
    const w = (amp: number) => (r() - 0.5) * 2 * amp
    const b = box(card)
    const mid = (b.left + b.right) / 2
    const across = b.left < tx - 12 && b.right > tx + 12
    const side = mid < tx ? -1 : 1
    // pin towards the corner nearest the centre gap, or mid-edge for a card sitting across it
    // a card sitting across the centre gap, lower down, is in the way of the cards above it
    const inWay = cards
      .filter((c) => c !== card)
      .map(box)
      .find((o) => o.left < tx - 12 && o.right > tx + 12 && o.bottom > b.bottom)
    // pin towards the corner nearest the centre gap, or mid-edge for a card sitting across it
    const u = across ? 0.5 + ((tx - mid) / (b.right - b.left)) * 0.6 : inWay ? 0.5 : side < 0 ? 0.74 : 0.26
    const end = facePoint(card, u, 0.955)
    const leave = { x: tx + (end.x - tx) * 0.04 + w(1), y: CHIP.top - 2 }
    const dy = leave.y - end.y
    const pts: P[] = [...trunk, leave]
    if (inWay) {
      // swing out beside the card in the way, so the thread stays in view
      const out = side < 0 ? inWay.left - 15 : inWay.right + 24
      const h = inWay.bottom - inWay.top
      pts.push({ x: out + side * 3 + w(2), y: inWay.bottom - h * 0.12 + w(4) })
      pts.push({ x: out + w(2), y: inWay.top + h * 0.3 + w(4) })
    } else {
      pts.push({ x: tx + (end.x - tx) * 0.2 + side * w(4) - side * 6, y: leave.y - dy * 0.36 + w(6) })
      pts.push({ x: tx + (end.x - tx) * 0.78 + side * 7 + w(3), y: leave.y - dy * 0.74 + w(6) })
    }
    pts.push(end)
    return { id: card.id, d: spline(pts), end }
  })
}

/** Hand-drawn SVG threads from a first step up to its cards. */
export function TraceLayer() {
  const { state } = useDemo()
  const t = state.phase === 'path' ? state.trace : null
  const valid = t !== null && t >= 0 && t < TRAIL_X.length
  const threads = useMemo(() => (valid ? buildThreads(t) : []), [t, valid])
  const s = valid ? stepAnchor(t) : { x: 0, y: 0 }

  const draw = (i: number) => ({
    pathLength: { duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.5, 0, 0.2, 1] as const },
    opacity: { duration: 0.01, delay: 0.1 + i * 0.12 },
  })
  const svgProps = {
    className: 'pointer-events-none absolute left-0 top-0',
    width: CANVAS.w,
    height: CANVAS.h,
    viewBox: `0 0 ${CANVAS.w} ${CANVAS.h}`,
    fill: 'none',
  }

  return (
    <>
      {/* Threads: above the page and the dimmed cards, beneath the traced cards (60+) and their ink. */}
      <svg {...svgProps} style={{ zIndex: 55 }}>
        <AnimatePresence>
          {valid && (
            <motion.g key={t} exit={{ opacity: 0, transition: { duration: 0.22 } }}>
              {/* soft shadow on the paper, so the thread sits above it */}
              <g transform="translate(1.5 2.5)" opacity={0.17}>
                {threads.map((th, i) => (
                  <motion.path
                    key={th.id}
                    d={th.d}
                    stroke="#5A371E"
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={draw(i)}
                  />
                ))}
              </g>
              <g filter="url(#thread-rough)">
                {/* keeps the filter region steady and wide */}
                <rect x={s.x - 260} y={90} width={520} height={620} />
                {threads.map((th, i) => (
                  <motion.path
                    key={th.id}
                    d={th.d}
                    stroke={THREAD}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={draw(i)}
                  />
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Knot and pins: on top of everything. */}
      <svg {...svgProps} style={{ zIndex: 80 }}>
        <AnimatePresence>
          {valid && (
            <motion.g key={t} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
              <motion.path
                d={`M ${s.x - 9} ${s.y + 3} c 3 -8, 14 -9, 16 -2 c 1 6, -11 7, -13 1 c -1 -5, 7 -8, 11 -4 M ${
                  s.x + 5
                } ${s.y + 3} q 5 3, 8 9 M ${s.x - 6} ${s.y + 4} q -4 4, -5 10`}
                stroke={THREAD_DARK}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
              {threads.map((th, i) => (
                <motion.g
                  key={th.id}
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.1 + i * 0.12 + 0.8 }}
                  style={{ transformOrigin: `${th.end.x}px ${th.end.y}px`, transformBox: 'view-box' }}
                >
                  <ellipse cx={th.end.x + 1.5} cy={th.end.y + 3} rx={5} ry={4} fill="rgba(90,55,30,0.25)" />
                  <circle cx={th.end.x} cy={th.end.y} r={5} fill={THREAD} stroke={THREAD_DARK} strokeWidth={1.2} />
                  <circle cx={th.end.x - 1.6} cy={th.end.y - 1.6} r={1.3} fill="#F0B79C" />
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </>
  )
}
