import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { demo } from '../layout'
import { checkInk } from '../pangram'
import { useDemo } from '../store'

/** Stamp ink: a touch deeper than the palette terracotta so it reads once multiplied into the paper. */
const STAMP_INK = '#C9744F'
const STAMP = { w: 250, h: 120 }
/** Centre of the stamp on the board, and of the small copy that stays in the corner of the plan. */
const BOARD_AT = { x: 1220, y: 648 }
const PATH_AT = { x: 1352, y: 852 }
const PATH_SCALE = 0.42
/** Seconds from first frame to the stamp hitting the paper. */
const IMPACT = 0.35

const UNDERLINE = 'M2 5.2 C 22 2.2, 40 7.4, 62 4.2 S 100 6.4, 118 3.4'

/** Tiny hand-drawn ink drop. */
function Drop({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="11" height="14" viewBox="0 0 12 15" className="block shrink-0" aria-hidden>
      <path
        d="M6.1 1.4 C 7.4 4.6, 10.4 6.9, 10.2 9.9 C 10 12.3, 8.2 13.7, 5.9 13.6 C 3.5 13.5, 1.8 12, 1.8 9.7 C 1.8 6.9, 4.8 4.5, 6.1 1.4 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {!filled && (
        <path d="M4.2 9.6 C 4.3 10.7, 4.9 11.3, 5.8 11.5" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
      )}
    </svg>
  )
}

function Stamp() {
  return (
    <svg
      width={STAMP.w}
      height={STAMP.h}
      viewBox={`0 0 ${STAMP.w} ${STAMP.h}`}
      className="block overflow-visible"
      aria-label="In your own words"
      role="img"
    >
      <defs>
        {/* Worn rubber: wobble the edges, eat small holes out, then let the ink go thin in patches. */}
        <filter
          id="stamp-worn"
          x="-4%"
          y="-8%"
          width="108%"
          height="116%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="5" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -14 0 0 0 9.3"
            result="holes"
          />
          <feComposite in="shape" in2="holes" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="23" result="patch" />
          <feColorMatrix
            in="patch"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 3 0 0 -0.4"
            result="thin"
          />
          <feComposite in="worn" in2="thin" operator="in" />
        </filter>
      </defs>
      <g filter="url(#stamp-worn)" fill="none" stroke={STAMP_INK}>
        <rect x="4" y="4" width="242" height="112" rx="13" strokeWidth="4.5" />
        <rect x="12.5" y="12.5" width="225" height="95" rx="7" strokeWidth="1.6" />
        <path d="M34 28 H 86 M164 28 H 216" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M32 85 H 56 M197 85 H 221" strokeWidth="2.4" strokeLinecap="round" />
        <g
          stroke="none"
          fill={STAMP_INK}
          textAnchor="middle"
          style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 800 }}
        >
          <text x="126.5" y="31.6" fontSize="10" style={{ letterSpacing: '0.3em' }}>
            INK CHECK
          </text>
          <text x="126.5" y="64" fontSize="25" style={{ letterSpacing: '0.09em' }}>
            IN YOUR OWN
          </text>
          <text x="126.5" y="94" fontSize="25" style={{ letterSpacing: '0.16em' }}>
            WORDS
          </text>
        </g>
      </g>
    </svg>
  )
}

/** Specks thrown out at impact: [x, y, radius, dx, dy] around the stamp's own box. */
const SPECKS: [number, number, number, number, number][] = [
  [-6, 22, 1.8, -9, -4],
  [38, -7, 1.3, -3, -8],
  [203, -8, 1.6, 5, -9],
  [258, 44, 2, 10, -2],
  [252, 104, 1.4, 9, 6],
  [150, 128, 1.7, 2, 9],
  [58, 127, 1.2, -4, 8],
  [-8, 88, 1.5, -10, 4],
]

/** The "Check my ink" corner control and the "In your own words" rubber stamp. */
export function InkCheck() {
  const { state, act } = useDemo()
  const inPath = state.phase === 'path'
  const checking = state.check === 'checking'
  const human = state.check === 'human'
  const [note, setNote] = useState(false)
  const [hover, setHover] = useState(false)

  const latest = useRef(state)
  latest.current = state
  const noteTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (noteTimer.current) window.clearTimeout(noteTimer.current)
  }, [])

  async function run() {
    if (latest.current.check === 'checking' || latest.current.check === 'human') return
    if (noteTimer.current) window.clearTimeout(noteTimer.current)
    setNote(false)
    act.setCheck('checking')

    const parts: string[] = []
    for (const card of demo.cards) {
      const ink = latest.current.lines[card.id]?.ink
      if (ink) parts.push(ink)
      if ((card.type === 'phrase' || card.type === 'journal') && card.text) parts.push(card.text)
    }
    const verdict = await checkInk(parts.join(' '), 'board')

    const unsettled = Object.values(latest.current.lines).some(
      (l) => l.status === 'borrowed' || l.status === 'checking',
    )
    if (unsettled || verdict !== 'human') {
      act.setCheck('borrowed')
      setNote(true)
      noteTimer.current = window.setTimeout(() => {
        setNote(false)
        act.setCheck('idle')
      }, 4000)
      return
    }
    act.setCheck('human')
  }

  const label = checking ? 'Reading your ink' : human ? 'Ink checked' : 'Check my ink'
  const tracing = state.trace !== null

  return (
    <>
      {/* The stamp. One element: it lands on the board, then rides down to the corner of the plan. */}
      {human && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 select-none"
          style={{ width: STAMP.w, height: STAMP.h, zIndex: 8, mixBlendMode: 'multiply' }}
          initial={false}
          animate={{
            x: (inPath ? PATH_AT.x : BOARD_AT.x) - STAMP.w / 2,
            y: (inPath ? PATH_AT.y : BOARD_AT.y) - STAMP.h / 2,
            scale: inPath ? PATH_SCALE : 1,
            opacity: tracing ? 0.16 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 58,
            damping: 14,
            mass: 1,
            opacity: { duration: 0.45 },
          }}
        >
          {/* ink pressed out sideways at impact */}
          <motion.div
            className="absolute inset-0"
            style={{ rotate: -8, borderRadius: 15, border: `2px solid ${STAMP_INK}` }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.38, 0], scale: [1, 1.06, 1.2] }}
            transition={{ delay: IMPACT - 0.02, duration: 0.5, times: [0, 0.12, 1], ease: 'easeOut' }}
          />
          <svg
            width={STAMP.w}
            height={STAMP.h}
            viewBox={`0 0 ${STAMP.w} ${STAMP.h}`}
            className="absolute inset-0 overflow-visible"
            style={{ transform: 'rotate(-8deg)' }}
            aria-hidden
          >
            {SPECKS.map(([x, y, r, dx, dy], i) => (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill={STAMP_INK}
                initial={{ opacity: 0, x: -dx * 0.6, y: -dy * 0.6 }}
                animate={{ opacity: [0, 0.75, 0], x: [-dx * 0.6, dx * 0.6, dx], y: [-dy * 0.6, dy * 0.6, dy] }}
                transition={{ delay: IMPACT, duration: 0.85, times: [0, 0.18, 1], ease: 'easeOut' }}
              />
            ))}
          </svg>
          <motion.div
            initial={{ scale: 2.3, rotate: -15, opacity: 0 }}
            animate={{
              scale: [2.3, 0.95, 1.025, 1],
              rotate: [-15, -8.6, -7.8, -8],
              opacity: [0, 1, 1, 1],
            }}
            transition={{
              duration: IMPACT + 0.17,
              times: [0, IMPACT / (IMPACT + 0.17), 0.86, 1],
              ease: [[0.55, 0, 0.9, 0.35], 'easeOut', 'easeOut'],
            }}
          >
            <Stamp />
          </motion.div>
        </motion.div>
      )}

      {/* The corner control. */}
      <motion.div
        className="absolute flex flex-col items-end"
        style={{ right: 40, bottom: 34, zIndex: 70, pointerEvents: inPath ? 'none' : 'auto' }}
        initial={false}
        animate={{ opacity: inPath ? 0 : 1 }}
        transition={{ duration: 0.35 }}
      >
        <AnimatePresence>
          {note && (
            <motion.div
              key="note"
              className="pencil mb-2 whitespace-nowrap text-[21px] leading-none"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              transition={{ duration: 0.35 }}
            >
              Some of this still sounds borrowed.
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={run}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          disabled={checking || human}
          className="relative flex items-center gap-1.5 border-0 bg-transparent p-0 pb-2"
          style={{ cursor: checking || human ? 'default' : 'pointer', height: 30 }}
        >
          <motion.span animate={{ opacity: human ? 0.6 : 1, y: checking ? [0, -1.5, 0] : 0 }} transition={checking ? { duration: 1.05, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}>
            <Drop color={checking ? '#9A9A94' : '#1F2A44'} filled={human} />
          </motion.span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              className={
                checking
                  ? 'pencil whitespace-nowrap text-[21px] leading-none'
                  : 'whitespace-nowrap font-ui text-[13px] font-bold leading-none text-ink'
              }
              style={{ opacity: human ? 0.6 : 1 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: human ? 0.6 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
          <svg
            className="pointer-events-none absolute bottom-0 left-0 block w-full overflow-visible"
            height="8"
            viewBox="0 0 120 8"
            preserveAspectRatio="none"
            aria-hidden
          >
            {checking ? (
              <motion.path
                key="reading"
                d={UNDERLINE}
                fill="none"
                stroke="#9A9A94"
                strokeWidth="1.8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                filter="url(#pencil-rough)"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
                transition={{ duration: 1.05, times: [0, 0.72, 1], repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <motion.path
                key={hover && !human ? 'hover' : 'rest'}
                d={UNDERLINE}
                fill="none"
                stroke="#1F2A44"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={hover && !human ? { pathLength: 0 } : false}
                animate={{
                  pathLength: 1,
                  strokeWidth: hover && !human ? 2.4 : 1.5,
                  opacity: human ? 0.45 : 1,
                }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              />
            )}
          </svg>
        </button>
      </motion.div>
    </>
  )
}
