import { AnimatePresence, motion } from 'framer-motion'
import { CANVAS, CHIP, chipPos, demo, STEP, stepPos, TRAIL_NAME_Y, TRAIL_W, TRAIL_X } from '../layout'
import { chipKey, useDemo } from '../store'
import type { Need, TrailData } from '../types'
import { PixelIcon } from './Pixel'

const INK = '#1F2A44'
const PENCIL = '#9A9A94'
const SAGE = '#A8B89A'
const TERRACOTTA = '#D98B6A'
const TERRACOTTA_DARK = '#B9704F'
const CARD = '#FFFDF8'
const LINE = 'rgba(31, 42, 68, 0.14)'
const LINE_HOVER = 'rgba(31, 42, 68, 0.5)'

/** One accent per trail. */
const ACCENTS = [SAGE, TERRACOTTA, INK]

/** Choreography, in seconds after the phase changes. */
const NAME_AT = (t: number) => 0.5 + t * 0.15
const CHIPS_AT = (t: number) => 1.4 + t * 0.3
const CHIP_GAP = 0.17
const STEP_AT = (t: number) => CHIPS_AT(t) + 4 * CHIP_GAP + 0.2

const EASE = [0.22, 0.8, 0.3, 1] as const
const CHIP_R = 10

/**
 * A need chip. Pencil: a dashed, see-through suggestion. Ink: a solid card
 * with a navy line, a hard step shadow and a tick. Clicking keeps it.
 */
function Chip({ t, i, need, dim }: { t: number; i: number; need: Need; dim: number }) {
  const { state, act } = useDemo()
  const key = chipKey(t, need.kind)
  const inked = !!state.chips[key]
  const pos = chipPos(t, i)
  const delay = CHIPS_AT(t) + i * CHIP_GAP
  const rect = { x: 0.75, y: 0.75, width: CHIP.w - 1.5, height: CHIP.h - 1.5, rx: CHIP_R - 0.75 }

  return (
    <motion.div
      className="absolute"
      style={{ left: pos.x, top: pos.y, width: CHIP.w, height: CHIP.h }}
      animate={{ opacity: dim }}
      initial={false}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="group h-full w-full cursor-pointer select-none"
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay, ease: EASE }}
        whileHover={inked ? undefined : { y: -2 }}
        onClick={() => act.inkChip(key)}
      >
        <motion.div
          className="relative h-full w-full"
          animate={inked ? { scale: [1, 1.04, 0.995, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, times: [0, 0.3, 0.7, 1], ease: 'easeOut' }}
        >
          {/* ink: the solid card and its hard step shadow */}
          <motion.div
            className="absolute inset-0"
            style={{
              borderRadius: CHIP_R,
              background: CARD,
              boxShadow: `0 2px 0 ${INK}, 0 12px 20px -14px rgba(60, 40, 20, 0.5)`,
            }}
            initial={false}
            animate={{ opacity: inked ? 1 : 0 }}
            transition={{ duration: inked ? 0.35 : 0, delay: inked ? 0.12 : 0 }}
          />
          <svg
            className="absolute inset-0"
            width={CHIP.w}
            height={CHIP.h}
            viewBox={`0 0 ${CHIP.w} ${CHIP.h}`}
            fill="none"
          >
            {/* pencil: a straight dashed outline, barely filled */}
            <motion.rect
              {...rect}
              className="transition-[stroke] duration-200 group-hover:stroke-[#7d7d78]"
              fill="rgba(255, 253, 248, 0.45)"
              stroke={PENCIL}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              initial={false}
              animate={{ opacity: inked ? 0 : 1 }}
              transition={{ duration: inked ? 0.3 : 0, delay: inked ? 0.2 : 0 }}
            />
            {/* ink: one solid navy line, drawn round in one go */}
            {inked && (
              <motion.rect
                {...rect}
                stroke={INK}
                strokeWidth={1.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </svg>

          <div className="absolute inset-0 pl-[12px] pr-[10px] pt-[6px]">
            <motion.div
              className="flex h-[18px] items-center gap-[7px]"
              animate={{ color: inked ? INK : PENCIL }}
              initial={false}
              transition={{ duration: 0.45 }}
            >
              <PixelIcon name={need.kind} size={18} />
              <span className="label" style={{ fontSize: 11 }}>
                {need.kind}
              </span>
              {inked && (
                <motion.span
                  className="ml-auto flex"
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 15, delay: 0.5 }}
                >
                  <PixelIcon name="check" size={18} color={INK} />
                </motion.span>
              )}
            </motion.div>
            <div className="relative mt-[1px] text-[19px] leading-[20px]" style={{ fontWeight: 500 }}>
              <motion.div
                className="pencil"
                animate={{ opacity: inked ? 0 : 1 }}
                initial={false}
                transition={{ duration: 0.25, delay: inked ? 0.6 : 0 }}
              >
                {need.text}
              </motion.div>
              <motion.div
                className="ink absolute inset-0"
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

function Trail({ t, trail }: { t: number; trail: TrailData }) {
  const { state, act } = useDemo()
  const tracing = state.trace !== null
  const traced = state.trace === t
  const other = tracing && !traced
  const sp = stepPos(t)
  const accent = ACCENTS[t % ACCENTS.length]

  return (
    <>
      {/* name: the user's ink, with a pixel label above and a straight accent bar below */}
      <motion.div
        className="absolute select-none"
        style={{ left: TRAIL_X[t] - TRAIL_W / 2, top: TRAIL_NAME_Y, width: TRAIL_W }}
        initial={false}
        animate={{ opacity: other ? 0.16 : 1 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: NAME_AT(t), ease: EASE }}
        >
          <div className="label flex items-center gap-[6px]" style={{ fontSize: 11, color: PENCIL }}>
            <span style={{ width: 6, height: 6, background: accent }} />
            Trail {t + 1}
          </div>
          <div className="ink whitespace-nowrap font-bold" style={{ fontSize: 44, lineHeight: '40px', marginTop: 2 }}>
            {trail.name}
          </div>
        </motion.div>
        <div className="mt-[7px] flex items-center justify-center gap-[3px]">
          <motion.span
            className="block"
            style={{ width: 40, height: 3, background: accent, transformOrigin: '0 50%' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              scaleX: { duration: 0.55, delay: NAME_AT(t) + 0.3, ease: 'easeInOut' },
              opacity: { duration: 0.01, delay: NAME_AT(t) + 0.3 },
            }}
          />
          {[0, 1].map((k) => (
            <motion.span
              key={k}
              className="block"
              style={{ width: 3, height: 3, background: accent }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.01, delay: NAME_AT(t) + 0.85 + k * 0.08 }}
            />
          ))}
        </div>
      </motion.div>

      {/* footpath: a faint row of pixel dots down the gap to the first step */}
      <motion.svg
        className="pointer-events-none absolute left-0 top-0"
        width={CANVAS.w}
        height={CANVAS.h}
        fill="none"
        shapeRendering="crispEdges"
        initial={false}
        animate={{ opacity: tracing ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.line
          x1={TRAIL_X[t]}
          x2={TRAIL_X[t]}
          y1={CHIP.top - 8}
          y2={STEP.top - 10}
          stroke={PENCIL}
          strokeOpacity={0.5}
          strokeWidth={2}
          strokeDasharray="2 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: CHIPS_AT(t) + 0.2 }}
        />
      </motion.svg>

      {/* what it needs */}
      {trail.needs.map((need, i) => (
        <Chip key={need.kind} t={t} i={i} need={need} dim={other ? 0.16 : traced ? 0.3 : 1} />
      ))}

      {/* first step: a task card. Clicking it traces the thread back to the cards. */}
      <motion.div
        className="absolute"
        style={{ left: sp.x, top: sp.y, width: STEP.w, height: STEP.h }}
        initial={false}
        animate={{ opacity: other ? 0.16 : 1 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: STEP_AT(t), ease: EASE }}
        >
          <motion.div
            className="relative h-full w-full cursor-pointer select-none"
            initial={false}
            animate={traced ? 'traced' : 'rest'}
            whileHover={traced ? undefined : 'hover'}
            whileTap={traced ? undefined : 'rest'}
            variants={{ rest: { y: 0 }, traced: { y: 0 }, hover: { y: -2 } }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={() => act.toggleTrace(t)}
          >
          <motion.div
            className="surface flex h-full w-full items-center gap-[14px] pl-[16px] pr-[18px]"
            style={{ borderRadius: 12 }}
            variants={{
              rest: {
                borderColor: LINE,
                boxShadow: '0 2px 0 rgba(31, 42, 68, 0.1), 0 12px 24px -14px rgba(60, 40, 20, 0.35)',
              },
              traced: {
                borderColor: TERRACOTTA,
                boxShadow: `0 2px 0 ${TERRACOTTA_DARK}, 0 14px 24px -14px rgba(120, 70, 40, 0.5)`,
              },
              hover: {
                borderColor: LINE_HOVER,
                boxShadow: '0 4px 0 rgba(31, 42, 68, 0.14), 0 16px 26px -14px rgba(60, 40, 20, 0.42)',
              },
            }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <motion.span
              className="flex flex-none items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 9 }}
              initial={false}
              animate={{
                backgroundColor: traced ? TERRACOTTA : 'rgba(217, 139, 106, 0.17)',
                color: traced ? CARD : TERRACOTTA_DARK,
              }}
              transition={{ duration: 0.25 }}
            >
              <PixelIcon name="flag" size={18} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="label" style={{ fontSize: 11, color: TERRACOTTA_DARK }}>
                  First step
                </span>
                <motion.span
                  className="label flex items-center gap-[5px]"
                  style={{ fontSize: 10 }}
                  initial={false}
                  animate={{ color: traced ? TERRACOTTA_DARK : PENCIL }}
                  transition={{ duration: 0.25 }}
                >
                  {traced ? 'Tracing' : 'Trace'}
                  <PixelIcon name="arrow" size={9} className="-rotate-90" />
                </motion.span>
              </div>
              <div
                className="ink mt-[5px] text-[27px] font-semibold leading-[26px]"
                style={{ textWrap: 'balance' }}
              >
                {trail.firstStep}
              </div>
            </div>
          </motion.div>
            {/* the port the thread plugs in to (TraceLayer fills it in terracotta) */}
            <span
              className="absolute"
              style={{
                left: STEP.w / 2 - 4,
                top: -3,
                width: 8,
                height: 8,
                background: CARD,
                border: '1px solid rgba(31, 42, 68, 0.38)',
              }}
            />
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
