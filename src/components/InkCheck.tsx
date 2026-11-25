import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { demo } from '../layout'
import { checkInk } from '../pangram'
import { useDemo } from '../store'
import { PixelIcon } from './Pixel'

/** Stamp ink: a touch deeper than the palette terracotta so it reads once multiplied into the paper. */
const STAMP_INK = '#C9744F'
const STAMP = { w: 250, h: 120 }
/** Centre of the stamp on the board, and of the small copy that stays in the corner of the plan. */
const BOARD_AT = { x: 1222, y: 660 }
const PATH_AT = { x: 1356, y: 863 }
const PATH_SCALE = 0.35
/** Seconds from first frame to the stamp hitting the paper. */
const IMPACT = 0.35

/** How long the board check takes (see checkInk): the progress line fills over exactly this. */
const CHECK_SECONDS = 1.3

const PENCIL = '#9A9A94'
const INK = '#1F2A44'
/** Confirmed state: sage, mixed into the card colour for the fill and deepened for the line and tick. */
const SAGE_FILL = '#E8ECDF'
const SAGE_LINE = '#9DAF8E'
const SAGE_DEEP = '#667D57'

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
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.3" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="5" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -12 0 0 0 9.1"
            result="holes"
          />
          <feComposite in="shape" in2="holes" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="23" result="patch" />
          <feColorMatrix
            in="patch"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 2.2 0 0 0.02"
            result="thin"
          />
          <feComposite in="worn" in2="thin" operator="in" />
        </filter>
      </defs>
      <g filter="url(#stamp-worn)" fill="none" stroke={STAMP_INK}>
        <rect x="4" y="4" width="242" height="112" rx="13" strokeWidth="4.5" />
        <rect x="12.5" y="12.5" width="225" height="95" rx="7" strokeWidth="1.6" />
        <path d="M32 28 H 82 M170 28 H 220" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M32 85 H 56 M197 85 H 221" strokeWidth="2.4" strokeLinecap="round" />
        <g
          stroke="none"
          fill={STAMP_INK}
          textAnchor="middle"
          style={{ fontFamily: "'Pixelify Sans', 'Nunito', sans-serif", fontWeight: 700 }}
        >
          {/* The small line stays in Nunito: at this size the pixel C closes up once rotated and worn. */}
          <text
            x="127"
            y="31.8"
            fontSize="10.5"
            style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 800, letterSpacing: '0.3em' }}
          >
            INK CHECK
          </text>
          <text x="126.5" y="64" fontSize="27" style={{ letterSpacing: '0.07em' }}>
            IN YOUR OWN
          </text>
          <text x="127" y="94" fontSize="27" style={{ letterSpacing: '0.16em' }}>
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

/** The "Check my ink" button in the app bar and the "In your own words" rubber stamp. */
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
  /** Not clickable: mid-check, already confirmed, or looking at the path. */
  const locked = checking || human || inPath
  /** Hover is tracked by hand so the lift can never stick once the button locks mid-hover. */
  const lift = hover && !locked

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

      {/* The app bar button. It sits in the gap the bar leaves between the key and the avatar. */}
      <motion.div
        className="absolute"
        style={{ right: 68, top: 10, zIndex: 95, pointerEvents: inPath ? 'none' : 'auto' }}
        initial={false}
        animate={{ opacity: inPath && !human && !checking ? 0.5 : 1 }}
        transition={{ duration: 0.35 }}
      >
        <motion.button
          type="button"
          onClick={locked ? undefined : run}
          // aria-disabled, not disabled: a disabled button swallows pointerleave and the hover lift would stick.
          aria-disabled={locked}
          tabIndex={locked ? -1 : 0}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          className="btn relative overflow-hidden"
          style={{
            width: 150,
            padding: 0,
            gap: 7,
            justifyContent: 'center',
            cursor: locked ? 'default' : 'pointer',
          }}
          initial={false}
          animate={{
            y: lift ? -1 : 0,
            backgroundColor: human ? SAGE_FILL : '#FFFDF8',
            borderColor: human ? SAGE_LINE : lift ? 'rgba(31, 42, 68, 0.3)' : 'rgba(31, 42, 68, 0.14)',
            boxShadow: human
              ? '0 2px 0 rgba(102, 125, 87, 0.22)'
              : lift
                ? '0 3px 0 rgba(31, 42, 68, 0.14)'
                : '0 2px 0 rgba(31, 42, 68, 0.12)',
          }}
          whileTap={locked ? undefined : { y: 1, boxShadow: '0 1px 0 rgba(31, 42, 68, 0.12)' }}
          transition={{ duration: 0.16, ease: 'easeOut', backgroundColor: { duration: 0.3 }, borderColor: { duration: 0.3 } }}
        >
          <PixelIcon
            name={human ? 'check' : 'drop'}
            size={18}
            color={human ? SAGE_DEEP : checking ? PENCIL : INK}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              style={{ color: checking ? PENCIL : INK }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
          {/* Determinate progress: one slim line along the bottom edge, filled over the length of the check. */}
          {checking && (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 block"
              style={{ height: 3, background: 'rgba(31, 42, 68, 0.1)' }}
              aria-hidden
            >
              <motion.span
                className="block h-full w-full"
                style={{ background: INK, transformOrigin: '0 50%' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: CHECK_SECONDS, ease: 'linear' }}
              />
            </span>
          )}
        </motion.button>

        {/* The borrowed note: a small bubble hanging just below the bar. */}
        <AnimatePresence>
          {note && (
            <motion.div
              key="note"
              role="status"
              className="surface absolute right-0 whitespace-nowrap"
              style={{ top: 50, padding: '9px 14px 10px', borderRadius: 10 }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2, transition: { duration: 0.4 } }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <span
                className="absolute block bg-card"
                style={{
                  right: 68,
                  top: -6.5,
                  width: 11,
                  height: 11,
                  transform: 'rotate(45deg)',
                  borderLeft: '1.5px solid rgba(31, 42, 68, 0.14)',
                  borderTop: '1.5px solid rgba(31, 42, 68, 0.14)',
                }}
                aria-hidden
              />
              <span className="pencil relative block text-[21px] leading-none">Some of this still sounds borrowed.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
