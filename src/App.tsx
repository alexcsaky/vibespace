import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CardFace } from './components/Card'
import { InkCheck } from './components/InkCheck'
import { InkLine } from './components/InkLine'
import { PathLayer } from './components/PathLayer'
import { PixelIcon } from './components/Pixel'
import { TraceLayer } from './components/TraceLayer'
import {
  CANVAS,
  CARD_SIZE,
  demo,
  LINE_EXTRA_W,
  LINE_GAP,
  PATH_SLOTS,
  TOPBAR_H,
  UNFOLD_ORDER,
} from './layout'
import { useDemo } from './store'
import type { CardData } from './types'

/** The hero move. Roughly 1.2s per card, staggered. */
const UNFOLD_SPRING = { type: 'spring', stiffness: 52, damping: 13, mass: 1 } as const
const STAGGER = 0.085

function CardUnit({ card, z }: { card: CardData; z: number }) {
  const { state, act } = useDemo()
  const size = CARD_SIZE[card.type]
  const line = state.lines[card.id]
  const inPath = state.phase === 'path'
  const slot = PATH_SLOTS[card.id]
  const order = UNFOLD_ORDER[card.id]
  const delay = order * STAGGER

  const tracing = state.trace !== null
  const traced = state.trace === card.trail
  const dimmed = tracing && !traced

  // Each card lifts off the paper a little while it travels.
  const lift = useAnimationControls()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    lift.start({
      y: [0, -26, 0],
      scale: [1, 1.08, 1],
      transition: { duration: 1.15, delay, times: [0, 0.38, 1], ease: 'easeInOut' },
    })
  }, [state.phase, lift, delay])

  const clickable = !inPath && line.status === 'empty'
  const active = state.activeCard === card.id

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{
        width: size.w,
        height: size.h,
        originX: 0,
        originY: 0,
        // Traced cards sit above the threads (z 55); upper slots on top so their enlarged lines stay readable.
        zIndex: traced ? 75 - order : active && !inPath ? 40 : z,
      }}
      initial={false}
      animate={{
        x: inPath ? slot.x : card.board.x,
        y: inPath ? slot.y : card.board.y,
        rotate: inPath ? slot.rotate : card.board.rotate,
        scale: inPath ? slot.scale : 1,
        opacity: dimmed ? 0.16 : 1,
      }}
      transition={{ ...UNFOLD_SPRING, delay, opacity: { duration: 0.45 } }}
    >
      <motion.div
        animate={lift}
        className={clickable ? 'cursor-pointer' : undefined}
        whileHover={clickable ? { y: -4, rotate: -0.6 } : undefined}
        onClick={clickable ? () => act.revealGuess(card.id) : undefined}
      >
        <CardFace card={card} />
      </motion.div>
      <div
        className="absolute"
        style={{
          top: size.h + LINE_GAP,
          left: -LINE_EXTRA_W / 2,
          width: size.w + LINE_EXTRA_W,
        }}
      >
        <InkLine card={card} enlarged={inPath && traced} />
      </div>
    </motion.div>
  )
}

/** The app bar: wordmark, board name, Board / Path switch, and the pencil and ink key. */
function TopBar() {
  const { state, act } = useDemo()
  const inPath = state.phase === 'path'
  const tabs = [
    { id: 'board', label: 'Board', on: !inPath, go: act.backToBoard },
    { id: 'path', label: 'Path', on: inPath, go: act.unfold },
  ]
  return (
    <div
      className="absolute inset-x-0 top-0 z-[90] flex items-center border-b-[1.5px] border-line bg-card px-5"
      style={{ height: TOPBAR_H }}
    >
      <div className="flex items-center gap-2.5 text-ink">
        <PixelIcon name="logo" size={27} color="#D98B6A" />
        <span className="font-pixel text-[23px] font-semibold leading-none tracking-wide">Someday</span>
      </div>
      <span className="mx-4 h-5 w-[1.5px] bg-line" />
      <span className="font-ui text-[14px] font-bold text-ink/70">Next year</span>

      {/* Board / Path */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-[11px] border-[1.5px] border-line bg-paper p-[3px]"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={t.on ? undefined : t.go}
            className="relative h-[28px] w-[84px] cursor-pointer font-pixel text-[15px] font-medium tracking-wide"
          >
            {t.on && (
              <motion.span
                layoutId="tab"
                className="absolute inset-0 rounded-[8px] bg-ink"
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              />
            )}
            <span className={`relative ${t.on ? 'text-paper' : 'text-ink/60'}`}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* The one rule of the product, as a key. */}
      <div className="absolute right-[250px] flex items-center gap-4 font-ui text-[12.5px] font-bold">
        <span className="flex items-center gap-1.5 text-pencil">
          <PixelIcon name="pencil" size={18} />
          Pencil is a guess
        </span>
        <span className="flex items-center gap-1.5 text-ink">
          <PixelIcon name="drop" size={18} />
          Ink is yours
        </span>
      </div>

      <div className="absolute right-5 flex h-8 w-8 items-center justify-center rounded-full bg-sage font-pixel text-[15px] font-semibold text-ink">
        A
      </div>
    </div>
  )
}

/** Fit the fixed canvas into the window, never scaling above 1. */
function useFit() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(1, window.innerWidth / CANVAS.w, window.innerHeight / CANVAS.h))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export default function App() {
  const { state, act } = useDemo()
  const scale = useFit()
  const inPath = state.phase === 'path'

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div style={{ width: CANVAS.w * scale, height: CANVAS.h * scale }}>
        <div
          className="paper relative overflow-hidden"
          style={{
            width: CANVAS.w,
            height: CANVAS.h,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* One shared filter gives pencil marks their slightly rough edge. */}
          <svg width="0" height="0" className="absolute" aria-hidden>
            <defs>
              <filter id="pencil-rough" x="-5%" y="-20%" width="110%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
              </filter>
              <filter id="thread-rough" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
              </filter>
            </defs>
          </svg>

          <TopBar />

          <PathLayer />

          {demo.cards.map((card, i) => (
            <CardUnit key={card.id} card={card} z={10 + i} />
          ))}

          <TraceLayer />
          <InkCheck />

          <AnimatePresence>
            {!inPath && (
              <motion.button
                key="unfold"
                onClick={act.unfold}
                className="btn btn-primary absolute left-1/2 top-[826px] z-[70]"
                style={{ x: '-50%' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14, transition: { duration: 0.25 } }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 2, boxShadow: '0 0px 0 #b9704f, 0 6px 12px -10px rgba(120,70,40,0.5)' }}
              >
                Show me the way
                <PixelIcon name="arrow" size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
