import { AnimatePresence, motion } from 'framer-motion'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { CARD_SIZE, LINE_EXTRA_W } from '../layout'
import { checkInk, MIN_WORDS, wordCount } from '../pangram'
import { useDemo, type LineStatus } from '../store'
import type { CardData } from '../types'

/**
 * The line under a card. The AI guesses in PENCIL, the user answers in INK.
 * Pencil guess writes itself in -> user strikes it -> writes their own line ->
 * ink floods through it. Pasted, borrowed words drain back to pencil.
 */

const NAVY = '#1F2A44'
const GREY = '#9A9A94'
const PAPER = 'rgba(250, 243, 231, 0.9)'

/** Timings, in seconds. */
const TYPE_TIME = 1.0 // pencil guess typewriter
const STRIKE_TIME = 0.45 // one strike stroke
const INPUT_DELAY = 0.5 // ink input opens after the strike
const RUB_AFTER = 0.8 // a struck borrowed line is rubbed out this long after the strike
const BEAT = 0.4 // the committed line sits in pencil grey for this long
const FLOOD_TIME = 0.9 // ink floods through, left to right
const DRAIN_TIME = 1.2 // borrowed ink drains back to pencil, right to left
const HOLD = 0.35 // ink rests before it starts to drain

/** How much a card's ink line grows while its trail is being traced. */
const ENLARGE = 1.45
const LONG_WORDS = 24
const LONG_W = 336

interface Typo {
  size: number
  lh: number
  weight: number
  width: number
  long: boolean
}

/** Short lines are big; pasted paragraphs are small and wider than the card. */
function typoFor(text: string, cardW: number, weight: number): Typo {
  const long = wordCount(text) > LONG_WORDS
  return long
    ? { size: 16.5, lh: 19.5, weight, width: LONG_W, long }
    : { size: 22, lh: 24.5, weight, width: cardW, long }
}

/* ---------- line splitting (the parent is rotated and scaled, so no DOM rects) ---------- */

interface Line {
  text: string
  w: number
}

let ctx: CanvasRenderingContext2D | null = null

function splitLines(text: string, t: Typo): Line[] {
  ctx ??= document.createElement('canvas').getContext('2d')
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!ctx || words.length === 0) return [{ text: text.trim(), w: t.width }]
  ctx.font = `${t.weight} ${t.size}px Caveat, cursive`
  const max = t.width - 6
  const out: Line[] = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && ctx.measureText(next).width > max) {
      out.push({ text: cur, w: ctx.measureText(cur).width })
      cur = word
    } else {
      cur = next
    }
  }
  if (cur) out.push({ text: cur, w: ctx.measureText(cur).width })
  return out
}

function useLines(text: string, t: Typo): Line[] {
  const [ready, setReady] = useState(() => document.fonts.check(`${t.weight} 22px Caveat`))
  useEffect(() => {
    if (ready) return
    let live = true
    document.fonts.load(`${t.weight} 22px Caveat`).then(() => live && setReady(true))
    return () => {
      live = false
    }
  }, [ready, t.weight])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => splitLines(text, t), [text, t.size, t.weight, t.width, ready])
}

/* ---------- hand-drawn strokes ---------- */

/** A slightly wobbly horizontal stroke, w px wide, in a 10px tall box. */
function wobble(w: number, seed: number): string {
  const r = (k: number) => {
    const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  const y = (k: number) => (3.4 + r(k) * 3.2).toFixed(2)
  const x = (f: number) => (f * w).toFixed(1)
  return `M1.5 ${y(0)} C ${x(0.18)} ${y(1)}, ${x(0.33)} ${y(2)}, ${x(0.5)} ${y(3)} S ${x(0.82)} ${y(4)}, ${(w - 1.5).toFixed(1)} ${y(5)}`
}

function Stroke({
  w,
  seed,
  color,
  width = 1.7,
  duration,
  delay,
  rough = false,
  fadeOut = false,
  style,
}: {
  w: number
  seed: number
  color: string
  width?: number
  duration: number
  delay: number
  rough?: boolean
  fadeOut?: boolean
  style?: React.CSSProperties
}) {
  const d = useMemo(() => wobble(w, seed), [w, seed])
  return (
    <svg
      width={w}
      height={10}
      viewBox={`0 0 ${w} 10`}
      aria-hidden
      style={{
        position: 'absolute',
        overflow: 'visible',
        pointerEvents: 'none',
        filter: rough ? 'url(#pencil-rough)' : undefined,
        ...style,
      }}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          fadeOut
            ? { pathLength: [0, 1, 1], opacity: [1, 1, 0] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={
          fadeOut
            ? { duration: duration * 2.2, delay, times: [0, 0.45, 1], ease: 'easeOut' }
            : {
                pathLength: { duration, delay, ease: [0.4, 0, 0.3, 1] },
                opacity: { duration: 0.01, delay },
              }
        }
      />
    </svg>
  )
}

/** Soft paper patch so long or enlarged lines stay legible over whatever is underneath. */
function Backing({ show, inset = '-7px -12px -8px -12px' }: { show: boolean; inset?: string }) {
  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset,
        background: PAPER,
        borderRadius: '14px 18px 12px 20px / 18px 12px 20px 14px',
        boxShadow: '0 0 10px 6px rgba(250, 243, 231, 0.9)',
        pointerEvents: 'none',
      }}
    />
  )
}

const stop = (e: MouseEvent) => e.stopPropagation()

/* ---------- empty: a faint dashed pencil stroke ---------- */

function Affordance() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.55 }}
      transition={{ duration: 0.6 }}
      style={{ height: 24, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}
    >
      <svg width="74" height="12" viewBox="0 0 74 12" style={{ filter: 'url(#pencil-rough)' }}>
        <path
          d="M3 7 C 16 4.5, 27 8.5, 38 6 S 60 4.5, 71 6.5"
          fill="none"
          stroke={GREY}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="6 7"
        />
      </svg>
    </motion.div>
  )
}

/* ---------- pencil text: types itself in, can be struck through ---------- */

function PencilLines({
  text,
  typo,
  cardW,
  typed,
  struck,
  onClick,
  onRubOut,
}: {
  text: string
  typo: Typo
  cardW: number
  /** typewriter on mount */
  typed: boolean
  struck: boolean
  onClick?: () => void
  /** called RUB_AFTER seconds after the strike has finished */
  onRubOut?: () => void
}) {
  const lines = useLines(text, typo)
  const total = text.length
  const [count, setCount] = useState(typed && !struck ? 0 : total)

  useEffect(() => {
    if (count >= total) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const n = Math.min(total, Math.ceil(((now - t0) / (TYPE_TIME * 1000)) * total))
      setCount(n)
      if (n < total) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = struck ? total : count
  const done = shown >= total

  const stroke = typo.long ? 0.3 : STRIKE_TIME
  const stagger = typo.long ? 0.06 : 0.3
  const strikeTotal = stroke + (lines.length - 1) * stagger

  const rubRef = useRef(onRubOut)
  rubRef.current = onRubOut
  useEffect(() => {
    if (!struck || !rubRef.current) return
    const t = setTimeout(() => rubRef.current?.(), (strikeTotal + RUB_AFTER) * 1000)
    return () => clearTimeout(t)
  }, [struck, strikeTotal])

  let offset = 0
  const clickable = !!onClick && done && !struck
  const padX = typo.long ? 26 : 12

  return (
    <motion.div
      exit={{
        opacity: 0,
        filter: 'blur(3px)',
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        transition: {
          opacity: { duration: 0.4, ease: 'easeOut' },
          filter: { duration: 0.4 },
          default: { duration: 0.42, delay: 0.12, ease: [0.4, 0, 0.2, 1] },
        },
      }}
      style={{
        // long blocks carry a paper backing, so leave room for its soft edge inside the clip
        width: typo.width + padX * 2,
        marginLeft: (cardW - typo.width) / 2 - padX,
        marginTop: typo.long ? -12 : 0,
        marginBottom: typo.long ? -12 : 0,
        padding: typo.long ? `14px ${padX}px 16px` : `2px ${padX}px 4px`,
        overflow: 'hidden',
        position: 'relative',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation()
              onClick?.()
            }
          : stop
      }
      whileHover={clickable ? { y: -1.5, rotate: -0.4 } : undefined}
    >
      {typo.long && <Backing show inset="7px 14px 8px 14px" />}
      <motion.div
        initial={false}
        animate={{ opacity: struck ? 0.45 : 1 }}
        transition={{ duration: 0.5, delay: struck ? strikeTotal + 0.05 : 0 }}
        style={{ position: 'relative' }}
      >
        {lines.map((l, i) => {
          const start = offset
          offset += l.text.length + 1
          const n = Math.max(0, Math.min(l.text.length, shown - start))
          return (
            <div
              key={i}
              style={{
                textAlign: 'center',
                whiteSpace: 'nowrap',
                fontSize: typo.size,
                lineHeight: `${typo.lh}px`,
                fontWeight: typo.weight,
              }}
            >
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span className="pencil" style={{ display: 'block' }}>
                  {l.text.slice(0, n)}
                  <span style={{ opacity: 0 }}>{l.text.slice(n)}</span>
                </span>
                {struck && (
                  <Stroke
                    w={l.w + 12}
                    seed={i + 1 + text.length}
                    color={NAVY}
                    width={typo.long ? 1.3 : 1.7}
                    duration={stroke}
                    delay={i * stagger}
                    style={{ left: -6, top: typo.lh * 0.56 - 5 }}
                  />
                )}
              </span>
            </div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

/* ---------- the ink input ---------- */

function InkInput({
  width,
  onCommit,
  onLongPaste,
}: {
  width: number
  onCommit: (text: string) => void
  onLongPaste: (text: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      const text = value.trim()
      if (text) onCommit(text)
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (wordCount(text) >= MIN_WORDS) {
      e.preventDefault()
      onLongPaste(text.trim())
    }
  }

  const baseW = width - 20

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: INPUT_DELAY }}
      style={{ position: 'relative', width, paddingBottom: 8 }}
      onClick={(e) => {
        e.stopPropagation()
        ref.current?.focus({ preventScroll: true })
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        spellCheck={false}
        autoComplete="off"
        aria-label="Say it in your own words"
        onChange={(e) => setValue(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className="ink"
        style={{
          display: 'block',
          width: '100%',
          padding: 0,
          margin: 0,
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          background: 'transparent',
          textAlign: 'center',
          fontSize: 22,
          lineHeight: '24.5px',
          fontWeight: 500,
          caretColor: NAVY,
        }}
      />
      <Stroke
        w={baseW}
        seed={7}
        color={NAVY}
        width={1.4}
        duration={0.45}
        delay={INPUT_DELAY + 0.05}
        style={{ left: 10, bottom: 0, opacity: 0.55 }}
      />
    </motion.div>
  )
}

/* ---------- the user's line: pencil underneath, ink on top, revealed by a clip ---------- */

const CLIP_SHOWN = 'inset(-30% -4% -30% -4%)'
const CLIP_HIDDEN = 'inset(-30% 104% -30% -4%)'

function InkText({
  text,
  typo,
  cardW,
  flood: floodProp,
  borrowed,
  backing,
  onRewrite,
}: {
  text: string
  typo: Typo
  cardW: number
  /** play the pencil-to-ink flood on mount */
  flood: boolean
  /** the check read it as AI: drain back to pencil and show the note */
  borrowed: boolean
  backing: boolean
  onRewrite?: () => void
}) {
  const [flood] = useState(floodProp)
  const lines = useLines(text, typo)
  const n = lines.length

  // Never start draining before the flood has finished and rested.
  const [drained, setDrained] = useState(borrowed)
  const born = useRef(performance.now())
  useEffect(() => {
    if (!borrowed) {
      setDrained(false)
      return
    }
    const floodEnds = flood ? (BEAT + FLOOD_TIME + HOLD) * 1000 : 0
    const wait = Math.max(0, floodEnds - (performance.now() - born.current))
    const t = setTimeout(() => setDrained(true), wait)
    return () => clearTimeout(t)
  }, [borrowed, flood])
  const startedBorrowed = useRef(borrowed).current

  // Flood: lines fill one after another, overlapping a little.
  const fd = FLOOD_TIME / (1 + (n - 1) * 0.6)
  const fs = fd * 0.6
  // Drain: from the last line back up to the first.
  const dd = DRAIN_TIME / (1 + (n - 1) * 0.35)
  const ds = dd * 0.35

  const clickable = drained && !!onRewrite
  const rewrite = (e: MouseEvent) => {
    e.stopPropagation()
    onRewrite?.()
  }

  const lastW = lines[n - 1]?.w ?? 0

  return (
    <div
      style={{
        width: typo.width,
        marginLeft: (cardW - typo.width) / 2,
        paddingTop: 2,
        position: 'relative',
      }}
      onClick={stop}
    >
      <Backing show={backing} />
      <motion.div
        initial={false}
        animate={flood ? { scale: [1, 1.045, 1] } : undefined}
        transition={{ duration: FLOOD_TIME + 0.25, delay: BEAT, times: [0, 0.3, 1], ease: 'easeOut' }}
        style={{ position: 'relative', cursor: clickable ? 'pointer' : 'default' }}
        onClick={clickable ? rewrite : undefined}
        whileHover={clickable ? { y: -1 } : undefined}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              whiteSpace: 'nowrap',
              fontSize: typo.size,
              lineHeight: `${typo.lh}px`,
              fontWeight: typo.weight,
            }}
          >
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {/* pencil underneath */}
              <motion.span
                className="pencil"
                style={{ display: 'block' }}
                initial={{ opacity: flood || startedBorrowed ? 1 : 0 }}
                animate={{ opacity: drained ? 1 : 0 }}
                transition={
                  drained
                    ? { duration: 0.2 }
                    : { duration: 0.25, delay: flood ? BEAT + i * fs + fd : 0 }
                }
              >
                {l.text}
              </motion.span>
              {/* ink on top */}
              <motion.span
                className="ink"
                aria-hidden
                style={{ position: 'absolute', left: 0, top: 0, display: 'block' }}
                initial={{ clipPath: flood || startedBorrowed ? CLIP_HIDDEN : CLIP_SHOWN }}
                animate={{ clipPath: drained ? CLIP_HIDDEN : CLIP_SHOWN }}
                transition={
                  drained
                    ? { duration: dd, delay: (n - 1 - i) * ds, ease: [0.45, 0, 0.55, 1] }
                    : { duration: fd, delay: BEAT + i * fs, ease: [0.25, 0.6, 0.3, 1] }
                }
              >
                {l.text}
              </motion.span>
            </span>
          </div>
        ))}
        {flood && !typo.long && (
          <Stroke
            w={Math.max(60, lastW * 0.8)}
            seed={3}
            color={NAVY}
            width={1.8}
            duration={0.5}
            delay={BEAT + FLOOD_TIME * 0.55}
            fadeOut
            style={{
              left: (typo.width - Math.max(60, lastW * 0.8)) / 2,
              top: n * typo.lh - 2,
            }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {drained && (
          <motion.div
            key="note"
            className="pencil"
            initial={{ opacity: 0, y: -6, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{
              duration: 0.5,
              delay: startedBorrowed ? 0.3 : DRAIN_TIME + 0.1,
              ease: 'easeOut',
            }}
            whileHover={{ rotate: -1, y: -1 }}
            onClick={rewrite}
            style={{
              position: 'relative',
              marginTop: 8,
              textAlign: 'center',
              fontSize: 21,
              lineHeight: '23px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              color: '#84847e',
            }}
          >
            This sounds borrowed. Want to say it your way?
            <svg
              width="250"
              height="8"
              viewBox="0 0 250 8"
              aria-hidden
              style={{ display: 'block', margin: '3px auto 0' }}
            >
              <path
                d="M3 4 C 50 1.5, 90 6.5, 130 3.5 S 215 2, 247 4.5"
                fill="none"
                stroke={GREY}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- the line itself ---------- */

export function InkLine({ card, enlarged }: { card: CardData; enlarged: boolean }) {
  const { state, act } = useDemo()
  const line = state.lines[card.id]
  const status = line.status
  const inPath = state.phase === 'path'
  const cardW = CARD_SIZE[card.type].w + LINE_EXTRA_W

  // Which status we arrived from (null on first render).
  const prev = useRef<LineStatus>(status)
  const from = useRef<LineStatus | null>(null)
  if (prev.current !== status) {
    from.current = prev.current
    prev.current = status
  }

  // Rewriting a borrowed line: strike the borrowed words, then rub them out.
  const rewrite = status === 'writing' && line.ink.trim() !== ''
  const [rubbed, setRubbed] = useState(false)
  useEffect(() => {
    if (status !== 'writing') setRubbed(false)
  }, [status])

  const guessTypo = useMemo(() => typoFor(card.pencilGuess, cardW, 400), [card.pencilGuess, cardW])
  const inkTypo = useMemo(() => typoFor(line.ink, cardW, 500), [line.ink, cardW])

  const showPencil = status === 'guess' || (status === 'writing' && !(rewrite && rubbed))
  const showInk = status === 'inked' || status === 'checking' || status === 'borrowed'
  const hidden = inPath && status !== 'inked'

  return (
    <motion.div
      initial={false}
      animate={{ scale: enlarged ? ENLARGE : 1 }}
      transition={{ type: 'spring', stiffness: 210, damping: 20 }}
      style={{
        transformOrigin: '50% 0%',
        display: hidden ? 'none' : undefined,
        pointerEvents: inPath ? 'none' : undefined,
        position: 'relative',
      }}
    >
      {status === 'empty' && <Affordance />}

      <AnimatePresence initial={false}>
        {showPencil && (
          <PencilLines
            key={rewrite ? 'borrowed-words' : 'guess'}
            text={rewrite ? line.ink : card.pencilGuess}
            typo={rewrite ? inkTypo : guessTypo}
            cardW={cardW}
            typed={status === 'guess'}
            struck={status === 'writing'}
            onClick={() => act.startWriting(card.id)}
            onRubOut={rewrite ? () => setRubbed(true) : undefined}
          />
        )}
      </AnimatePresence>

      {status === 'writing' && (
        <InkInput
          width={cardW}
          onCommit={(text) => act.commitInk(card.id, text)}
          onLongPaste={(text) => {
            act.commitPaste(card.id, text)
            checkInk(text, 'paste').then((v) => act.setVerdict(card.id, v))
          }}
        />
      )}

      {showInk && (
        <InkText
          key="ink"
          text={line.ink}
          typo={inkTypo}
          cardW={cardW}
          flood={from.current === 'writing'}
          borrowed={status === 'borrowed'}
          backing={inkTypo.long || enlarged}
          onRewrite={inPath ? undefined : () => act.startWriting(card.id)}
        />
      )}
    </motion.div>
  )
}
