import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { CANVAS, CHIP, chipPos, demo, STEP, stepPos, TRAIL_NAME_Y, TRAIL_W, TRAIL_X } from '../layout'
import { chipKey, useDemo } from '../store'
import type { Need, TrailData } from '../types'

const INK = '#1F2A44'
const PENCIL = '#9A9A94'
const SAGE = '#A8B89A'
const TERRACOTTA = '#D98B6A'

/** Choreography, in seconds after the phase changes. */
const NAME_AT = (t: number) => 0.5 + t * 0.15
const CHIPS_AT = (t: number) => 1.4 + t * 0.3
const CHIP_GAP = 0.17
const STEP_AT = (t: number) => CHIPS_AT(t) + 4 * CHIP_GAP + 0.2

const EASE = [0.22, 0.8, 0.3, 1] as const

/** Small deterministic random source, so every wobble is the same on every take. */
function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** A rounded box drawn by hand: sides bow a little, the end overshoots the start. */
function handBox(w: number, h: number, seed: number, amp = 1.5) {
  const r = rng(seed)
  const j = (k = 1) => (r() - 0.5) * 2 * amp * k
  const f = (n: number) => n.toFixed(1)
  const c = 11
  const x0 = 2
  const y0 = 2
  const x1 = w - 2
  const y1 = h - 2
  const pts = [
    `M ${f(x0 + c + j())} ${f(y0 + j())}`,
    `Q ${f((x0 + x1) / 2 + j(6))} ${f(y0 + j(1.4))} ${f(x1 - c + j())} ${f(y0 + j())}`,
    `Q ${f(x1 + j(0.6))} ${f(y0 + j(0.6))} ${f(x1 + j())} ${f(y0 + c + j())}`,
    `Q ${f(x1 + j(1.4))} ${f((y0 + y1) / 2 + j(4))} ${f(x1 + j())} ${f(y1 - c + j())}`,
    `Q ${f(x1 + j(0.6))} ${f(y1 + j(0.6))} ${f(x1 - c + j())} ${f(y1 + j())}`,
    `Q ${f((x0 + x1) / 2 + j(6))} ${f(y1 + j(1.4))} ${f(x0 + c + j())} ${f(y1 + j())}`,
    `Q ${f(x0 + j(0.6))} ${f(y1 + j(0.6))} ${f(x0 + j())} ${f(y1 - c + j())}`,
    `Q ${f(x0 + j(1.4))} ${f((y0 + y1) / 2 + j(4))} ${f(x0 + j())} ${f(y0 + c + j())}`,
    `Q ${f(x0 + j(0.6))} ${f(y0 + j(0.6))} ${f(x0 + c + 5 + j())} ${f(y0 + 0.5 + j())}`,
    `L ${f(x0 + c + 16 + j(2))} ${f(y0 + 1.2 + j(0.5))}`,
  ]
  return pts.join(' ')
}

function Chip({ t, i, need, dim }: { t: number; i: number; need: Need; dim: number }) {
  const { state, act } = useDemo()
  const key = chipKey(t, need.kind)
  const inked = !!state.chips[key]
  const pos = chipPos(t, i)
  const seed = t * 10 + i + 1
  const { pencilPath, inkPath, tilt } = useMemo(() => {
    const r = rng(seed * 7 + 3)
    return {
      pencilPath: handBox(CHIP.w, CHIP.h, seed, 1.7),
      inkPath: handBox(CHIP.w, CHIP.h, seed + 100, 1.2),
      tilt: (r() - 0.5) * 2.6,
    }
  }, [seed])
  const delay = CHIPS_AT(t) + i * CHIP_GAP

  return (
    <motion.div
      className="absolute"
      style={{ left: pos.x, top: pos.y, width: CHIP.w, height: CHIP.h }}
      animate={{ opacity: dim }}
      initial={false}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="h-full w-full cursor-pointer select-none"
        initial={{ opacity: 0, y: 12, rotate: tilt * 2.4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: EASE }}
        whileHover={inked ? undefined : { y: -2 }}
        onClick={() => act.inkChip(key)}
      >
        <motion.div
          className="relative h-full w-full"
          animate={inked ? { scale: [1, 1.045, 0.995, 1], rotate: [0, -0.5, 0] } : { scale: 1 }}
          transition={{ duration: 0.6, times: [0, 0.3, 0.7, 1], ease: 'easeOut' }}
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={CHIP.w}
            height={CHIP.h}
            viewBox={`0 0 ${CHIP.w} ${CHIP.h}`}
            fill="none"
          >
            {/* pencil: dashed, rough, tentative */}
            <motion.path
              d={pencilPath}
              stroke={PENCIL}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="7 6"
              filter="url(#pencil-rough)"
              animate={{ opacity: inked ? 0 : 1 }}
              transition={{ duration: 0.5, delay: inked ? 0.25 : 0 }}
            />
            {/* ink: one confident line, drawn in one go */}
            {inked && (
              <motion.path
                d={inkPath}
                stroke={INK}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col justify-center pl-[14px] pr-[10px]">
            <motion.div
              className="label mb-[3px]"
              style={{ fontSize: 9 }}
              animate={{ color: inked ? INK : PENCIL }}
              initial={false}
              transition={{ duration: 0.5 }}
            >
              {need.kind}
            </motion.div>
            <div className="relative text-[19px] leading-[1.05]">
              <motion.div
                className="pencil"
                animate={{ opacity: inked ? 0 : 1 }}
                initial={false}
                transition={{ duration: 0.25, delay: inked ? 0.6 : 0 }}
              >
                {need.text}
              </motion.div>
              <motion.div
                className="ink absolute inset-0 font-semibold"
                style={{ fontWeight: 600 }}
                initial={false}
                animate={{
                  clipPath: inked ? 'inset(-20% -4% -20% -4%)' : 'inset(-20% 104% -20% -4%)',
                }}
                transition={{ duration: inked ? 0.7 : 0, ease: [0.45, 0, 0.25, 1] }}
              >
                {need.text}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const NAME_UNDERLINES = [
  'M4 9 C 30 3, 62 12, 96 6 S 150 4, 176 8',
  'M5 6 C 36 11, 70 2, 104 8 S 152 9, 175 5',
  'M4 8 C 28 4, 58 10, 92 5 S 146 10, 176 6',
]
const STEP_TILT = [-1.1, 0.8, -0.6]

function Trail({ t, trail }: { t: number; trail: TrailData }) {
  const { state, act } = useDemo()
  const tracing = state.trace !== null
  const traced = state.trace === t
  const other = tracing && !traced
  const sp = stepPos(t)

  return (
    <>
      {/* name */}
      <motion.div
        className="absolute select-none text-center"
        style={{ left: TRAIL_X[t] - TRAIL_W / 2, top: TRAIL_NAME_Y, width: TRAIL_W }}
        initial={false}
        animate={{ opacity: other ? 0.16 : 1 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          className="ink text-[46px] font-bold leading-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: NAME_AT(t), ease: EASE }}
        >
          {trail.name}
        </motion.div>
        <svg width="180" height="14" viewBox="0 0 180 14" className="mx-auto mt-[2px] block" fill="none">
          <motion.path
            d={NAME_UNDERLINES[t % 3]}
            stroke={SAGE}
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.55, delay: NAME_AT(t) + 0.3, ease: 'easeInOut' },
              opacity: { duration: 0.01, delay: NAME_AT(t) + 0.3 },
            }}
          />
        </svg>
      </motion.div>

      {/* footpath: a faint dotted pencil line down the gap to the first step */}
      <motion.svg
        className="pointer-events-none absolute left-0 top-0"
        width={CANVAS.w}
        height={CANVAS.h}
        fill="none"
        initial={false}
        animate={{ opacity: tracing ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.path
          d={`M ${TRAIL_X[t]} ${CHIP.top - 8} C ${TRAIL_X[t] - 3} ${CHIP.top + 50}, ${TRAIL_X[t] + 3} ${
            CHIP.top + 110
          }, ${TRAIL_X[t]} ${STEP.top - 10}`}
          stroke={PENCIL}
          strokeOpacity={0.6}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="0.1 9"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: CHIPS_AT(t) + 0.2 }}
        />
      </motion.svg>

      {/* what it needs */}
      {trail.needs.map((need, i) => (
        <Chip key={need.kind} t={t} i={i} need={need} dim={other ? 0.16 : traced ? 0.3 : 1} />
      ))}

      {/* first step: a strip of paper pinned to the page */}
      <motion.div
        className="absolute"
        style={{ left: sp.x, top: sp.y, width: STEP.w, height: STEP.h }}
        initial={false}
        animate={{ opacity: other ? 0.16 : 1 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0, y: 18, rotate: STEP_TILT[t % 3] * 2.5 }}
          animate={{ opacity: 1, y: 0, rotate: STEP_TILT[t % 3] }}
          transition={{ duration: 0.6, delay: STEP_AT(t), ease: EASE }}
        >
          <motion.div
            className="relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-center px-6 pt-[10px] text-center"
            style={{
              background: '#FFFDF8',
              borderRadius: '3px 4px 3px 5px',
              boxShadow: traced
                ? '0 1px 1px rgba(90,60,30,0.14), 0 16px 22px -10px rgba(90,60,30,0.42)'
                : '0 1px 1px rgba(90,60,30,0.14), 0 9px 16px -9px rgba(90,60,30,0.38)',
            }}
            animate={{ y: traced ? -3 : 0 }}
            whileHover={{ y: -5, rotate: -0.4 }}
            whileTap={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            onClick={() => act.toggleTrace(t)}
          >
            {/* the pin the thread ties on to */}
            <svg
              className="absolute left-1/2 top-[-4px] -translate-x-1/2 overflow-visible"
              width="18"
              height="18"
              viewBox="0 0 18 18"
            >
              <ellipse cx="10.5" cy="11.5" rx="5" ry="4" fill="rgba(90,60,30,0.22)" />
              <circle cx="9" cy="8" r="5" fill={TERRACOTTA} stroke="#B9704F" strokeWidth="1.2" />
              <circle cx="7.4" cy="6.4" r="1.3" fill="#F0B79C" />
            </svg>
            <div className="label mb-[5px]" style={{ color: TERRACOTTA }}>
              First step
            </div>
            <div className="ink text-[28px] font-semibold leading-[0.98]" style={{ textWrap: 'balance' }}>
              {trail.firstStep}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  )
}

/** Trail names, need chips and first steps. Only visible in the path phase. */
export function PathLayer() {
  const { state } = useDemo()
  return (
    <AnimatePresence>
      {state.phase === 'path' && (
        <motion.div
          key="path"
          className="absolute left-0 top-0"
          style={{ width: CANVAS.w, height: CANVAS.h }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          {demo.trails.map((trail, t) => (
            <Trail key={t} t={t} trail={trail} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
