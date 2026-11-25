import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { CANVAS, CARD_SIZE, cardsInTrail, CHIP, PATH_SLOTS, STEP, TRAIL_X } from '../layout'
import { useDemo } from '../store'
import type { CardData } from '../types'

const THREAD = '#D98B6A'
const THREAD_DARK = '#B9704F'
const CARD = '#FFFDF8'

/** The port on the top edge of the first step, where the thread plugs in (see PathLayer). */
const port = (t: number): P => ({ x: TRAIL_X[t], y: STEP.top + 1 })

interface P {
  x: number
  y: number
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
 * One thread per card: a shared line up the gap between the chip columns,
 * then a gentle S out to a square handle on the bottom edge of the card face.
 * The threads themselves lie UNDER the traced cards and the lines written
 * beneath them (see the z-index below), so they never run over the ink.
 */
function buildThreads(t: number): Thread[] {
  const cards = cardsInTrail(t)
  const tx = TRAIL_X[t]
  const start = port(t)
  // dead straight up the gap, so every thread shares one clean line
  const trunk: P[] = [
    { x: start.x, y: start.y },
    { x: tx, y: CHIP.top + CHIP.h * 1.6 },
    { x: tx, y: CHIP.top + CHIP.h * 0.55 },
  ]

  return cards.map((card) => {
    const b = box(card)
    const mid = (b.left + b.right) / 2
    const across = b.left < tx - 12 && b.right > tx + 12
    const side = mid < tx ? -1 : 1
    // a card sitting across the centre gap, lower down, is in the way of the cards above it
    const inWay = cards
      .filter((c) => c !== card)
      .map(box)
      .find((o) => o.left < tx - 12 && o.right > tx + 12 && o.bottom > b.bottom)
    // handle towards the corner nearest the centre gap, or mid-edge for a card sitting across it
    const u = across ? 0.5 + ((tx - mid) / (b.right - b.left)) * 0.6 : inWay ? 0.5 : side < 0 ? 0.74 : 0.26
    const end = facePoint(card, u, 0.955)
    const leave = { x: tx + (end.x - tx) * 0.04, y: CHIP.top - 2 }
    const dy = leave.y - end.y
    const pts: P[] = [...trunk, leave]
    if (inWay) {
      // swing out beside the card in the way, so the thread stays in view
      const out = side < 0 ? inWay.left - 15 : inWay.right + 24
      const h = inWay.bottom - inWay.top
      pts.push({ x: out + side * 3, y: inWay.bottom - h * 0.12 })
      pts.push({ x: out, y: inWay.top + h * 0.3 })
    } else {
      pts.push({ x: tx + (end.x - tx) * 0.2 - side * 6, y: leave.y - dy * 0.36 })
      pts.push({ x: tx + (end.x - tx) * 0.78 + side * 7, y: leave.y - dy * 0.74 })
    }
    pts.push(end)
    return { id: card.id, d: spline(pts), end }
  })
}

/** Connector threads from a first step up to its cards: precise 2px lines, in terracotta. */
export function TraceLayer() {
  const { state } = useDemo()
  const t = state.phase === 'path' ? state.trace : null
  const valid = t !== null && t >= 0 && t < TRAIL_X.length
  const threads = useMemo(() => (valid ? buildThreads(t) : []), [t, valid])
  const s = valid ? port(t) : { x: 0, y: 0 }

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
              {threads.map((th, i) => (
                <motion.path
                  key={th.id}
                  d={th.d}
                  stroke={THREAD}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={draw(i)}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Port and handles: on top of everything. Small solid pixel squares. */}
      <svg {...svgProps} style={{ zIndex: 80 }} shapeRendering="crispEdges">
        <AnimatePresence>
          {valid && (
            <motion.g key={t} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
              <motion.rect
                x={s.x - 4}
                y={s.y - 4}
                width={8}
                height={8}
                fill={THREAD}
                stroke={THREAD_DARK}
                strokeWidth={1}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ transformOrigin: `${s.x}px ${s.y}px`, transformBox: 'view-box' }}
              />
              {threads.map((th, i) => {
                const x = Math.round(th.end.x)
                const y = Math.round(th.end.y)
                return (
                  <motion.g
                    key={th.id}
                    initial={{ opacity: 0, scale: 0.2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.1 + i * 0.12 + 0.8 }}
                    style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }}
                  >
                    {/* a diagram handle: terracotta square with a card-coloured keyline and a hard step */}
                    <rect x={x - 6} y={y - 4} width={12} height={12} fill={THREAD_DARK} />
                    <rect x={x - 6} y={y - 6} width={12} height={12} fill={CARD} />
                    <rect x={x - 4} y={y - 4} width={8} height={8} fill={THREAD} />
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </>
  )
}
