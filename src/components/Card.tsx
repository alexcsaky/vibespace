import { useState } from 'react'
import type { CSSProperties } from 'react'
import { CARD_SIZE } from '../layout'
import type { CardData } from '../types'

const INK = '#1F2A44'
const SAGE = '#A8B89A'
const TERRACOTTA = '#D98B6A'
const PRINT = '#FFFDF8'

/** Soft layered shadow: a tight contact line, a near blur, a long low one. */
const SHADOW =
  '0 1px 1.5px rgba(74,52,30,0.20), 0 5px 10px -3px rgba(74,52,30,0.16), 0 18px 28px -14px rgba(74,52,30,0.28)'
/** Same idea for shapes that are clipped or masked (box-shadow would be cut off). */
const DROP =
  'drop-shadow(0 1px 1px rgba(74,52,30,0.22)) drop-shadow(0 6px 7px rgba(74,52,30,0.13))'

/* ---------- deterministic variation ---------- */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let a = seed || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- washi tape ---------- */

type Pattern = 'plain' | 'stripe' | 'dots'
interface TapeSpec {
  /** centre of the strip as a fraction of the card box */
  fx: number
  fy: number
  angle: number
  w: number
  color: 'sage' | 'terracotta'
  pattern: Pattern
}

const TAPE_PRESETS: TapeSpec[][] = [
  [{ fx: 0.5, fy: 0, angle: -3, w: 86, color: 'sage', pattern: 'stripe' }],
  [
    { fx: 0.07, fy: 0.035, angle: -41, w: 66, color: 'terracotta', pattern: 'plain' },
    { fx: 0.93, fy: 0.035, angle: 40, w: 66, color: 'terracotta', pattern: 'plain' },
  ],
  [{ fx: 0.32, fy: 0, angle: 5, w: 78, color: 'terracotta', pattern: 'dots' }],
  [{ fx: 0.52, fy: 0, angle: 2.5, w: 98, color: 'sage', pattern: 'plain' }],
  [
    { fx: 0.06, fy: 0.04, angle: -38, w: 68, color: 'sage', pattern: 'dots' },
    { fx: 0.94, fy: 0.96, angle: -40, w: 68, color: 'sage', pattern: 'dots' },
  ],
  [{ fx: 0.3, fy: 0, angle: -6, w: 76, color: 'terracotta', pattern: 'stripe' }],
  [{ fx: 0.5, fy: 0, angle: 3.5, w: 92, color: 'sage', pattern: 'stripe' }],
  [
    { fx: 0.24, fy: 0, angle: -5, w: 78, color: 'terracotta', pattern: 'stripe' },
    { fx: 0.8, fy: 0, angle: 4, w: 64, color: 'sage', pattern: 'plain' },
  ],
]

const TAPE_FILL = {
  sage: 'rgba(160,178,144,0.80)',
  terracotta: 'rgba(217,139,106,0.74)',
}

function Tape({ spec, id, boxW, boxH, jitter }: {
  spec: TapeSpec
  id: string
  boxW: number
  boxH: number
  jitter: () => number
}) {
  const w = Math.round(spec.w + (jitter() - 0.5) * 10)
  const h = 23
  const angle = spec.angle + (jitter() - 0.5) * 4
  const cx = spec.fx * boxW + (jitter() - 0.5) * 12
  const cy = spec.fy * boxH + (jitter() - 0.5) * 3

  // zig-zag torn ends, a slightly different bite on each strip
  const teeth = 5
  const bite = 2.4 + jitter() * 1.6
  const pts: string[] = []
  for (let i = 0; i <= teeth; i++) {
    const y = (h * i) / teeth
    pts.push(`${(i % 2 === 0 ? 0 : bite).toFixed(1)},${y.toFixed(1)}`)
  }
  for (let i = teeth; i >= 0; i--) {
    const y = (h * i) / teeth
    pts.push(`${(w - (i % 2 === 0 ? bite : 0)).toFixed(1)},${y.toFixed(1)}`)
  }
  const clip = `tape-${id}`

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - h / 2,
        transform: `rotate(${angle.toFixed(2)}deg)`,
        filter: 'drop-shadow(0 1px 1px rgba(74,52,30,0.16))',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <clipPath id={clip}>
          <polygon points={pts.join(' ')} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={w} height={h} fill={TAPE_FILL[spec.color]} />
        {spec.pattern === 'stripe' &&
          Array.from({ length: Math.ceil((w + h) / 9) }, (_, i) => (
            <line
              key={i}
              x1={i * 9 - h}
              y1={h + 2}
              x2={i * 9}
              y2={-2}
              stroke="rgba(255,253,248,0.42)"
              strokeWidth={3}
            />
          ))}
        {spec.pattern === 'dots' &&
          Array.from({ length: Math.ceil(w / 6) }, (_, i) => (
            <circle
              key={i}
              cx={5 + i * 6}
              cy={i % 2 === 0 ? 7 : 16}
              r={1.9}
              fill="rgba(255,253,248,0.55)"
            />
          ))}
        {/* the faint lighter edges of paper tape */}
        <rect width={w} height={1.2} fill="rgba(255,253,248,0.28)" />
        <rect y={h - 1.2} width={w} height={1.2} fill="rgba(74,52,30,0.07)" />
      </g>
    </svg>
  )
}

function Tapes({ card }: { card: CardData }) {
  const size = CARD_SIZE[card.type]
  const h = hash(card.id)
  const n = parseInt(card.id.replace(/\D/g, ''), 10)
  const preset = TAPE_PRESETS[(Number.isFinite(n) ? n - 1 + 8 : h) % TAPE_PRESETS.length]
  const jitter = rng(h)
  return (
    <>
      {preset.map((spec, i) => (
        <Tape
          key={i}
          spec={spec}
          id={`${card.id}-${i}`}
          boxW={size.w}
          boxH={size.h}
          jitter={jitter}
        />
      ))}
    </>
  )
}

/* ---------- photo ---------- */

function Photo({ card }: { card: CardData }) {
  const [failed, setFailed] = useState(false)
  const { w, h } = CARD_SIZE.photo
  const border = 11
  const img = w - border * 2
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: PRINT,
        borderRadius: 2,
        boxShadow: `${SHADOW}, inset 0 0 0 1px rgba(74,52,30,0.05)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: border,
          top: border,
          width: img,
          height: Math.min(img, h - border - 38),
          background: SAGE,
          overflow: 'hidden',
          borderRadius: 1,
        }}
      >
        {card.src && !failed ? (
          <img
            src={card.src}
            alt={card.label ?? ''}
            draggable={false}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              boxSizing: 'border-box',
              textAlign: 'center',
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.04em',
              color: 'rgba(31,42,68,0.7)',
            }}
          >
            {card.label}
          </div>
        )}
        {/* faint inner edge where the image meets the border */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 0 1px rgba(31,42,68,0.10), inset 0 1px 3px rgba(31,42,68,0.10)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}

/* ---------- song ---------- */

function Song({ card }: { card: CardData }) {
  const s = CARD_SIZE.song.w
  const d = s - 22
  const showing = 28
  const r = d / 2
  const title = card.text ?? ''
  const titleSize = title.length > 30 ? 21 : title.length > 18 ? 24 : 28
  return (
    <>
      {/* the record, sliding out of the right-hand side */}
      <svg
        width={d}
        height={d}
        viewBox={`0 0 ${d} ${d}`}
        aria-hidden
        style={{
          position: 'absolute',
          left: s - d + showing,
          top: (s - d) / 2,
          filter: 'drop-shadow(0 2px 3px rgba(74,52,30,0.28))',
        }}
      >
        <circle cx={r} cy={r} r={r} fill="#191817" />
        {[0.93, 0.86, 0.79, 0.72, 0.65, 0.58, 0.51].map((k) => (
          <circle
            key={k}
            cx={r}
            cy={r}
            r={r * k}
            fill="none"
            stroke="rgba(255,253,248,0.13)"
            strokeWidth={0.9}
          />
        ))}
        <circle cx={r} cy={r} r={r * 0.36} fill={TERRACOTTA} />
        <circle cx={r} cy={r} r={3} fill="#FAF3E7" />
      </svg>

      {/* the sleeve */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: SAGE,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `${SHADOW}, inset 0 0 0 1px rgba(31,42,68,0.07)`,
        }}
      >
        {/* printed artwork: flat rings rising from the corner */}
        <svg
          width={s}
          height={s}
          viewBox={`0 0 ${s} ${s}`}
          aria-hidden
          style={{ position: 'absolute', inset: 0 }}
        >
          {[104, 82, 60].map((rr) => (
            <circle
              key={rr}
              cx={s - 6}
              cy={s + 14}
              r={rr}
              fill="none"
              stroke="rgba(255,253,248,0.62)"
              strokeWidth={7}
            />
          ))}
          <circle cx={s - 6} cy={s + 14} r={38} fill={TERRACOTTA} />
          {/* the dark slot the record slides out of */}
          <rect x={s - 2.5} y={0} width={2.5} height={s} fill="rgba(31,42,68,0.22)" />
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 30,
            width: s - 40,
            maxHeight: 96,
            overflow: 'hidden',
            fontFamily: 'var(--font-hand)',
            fontWeight: 700,
            fontSize: titleSize,
            lineHeight: 0.98,
            color: INK,
            overflowWrap: 'break-word',
          }}
        >
          {title}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 17,
            bottom: 16,
            width: 92,
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 9.5,
            lineHeight: 1.25,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: 'rgba(31,42,68,0.78)',
            overflowWrap: 'break-word',
          }}
        >
          {card.artist}
        </div>
      </div>
    </>
  )
}

/* ---------- phrase ---------- */

function Phrase({ card }: { card: CardData }) {
  const text = card.text ?? ''
  const rand = rng(hash(card.id) ^ 0x51ed)
  const { w, h } = CARD_SIZE.phrase
  // a scrap torn along the bottom and the right-hand side
  const pts: string[] = ['0px 0px', `${w}px 0px`]
  const stepsR = 9
  for (let i = 1; i < stepsR; i++) {
    pts.push(`${(w - rand() * 2.6).toFixed(1)}px ${((h * i) / stepsR).toFixed(1)}px`)
  }
  const stepsB = 22
  for (let i = 0; i <= stepsB; i++) {
    pts.push(`${(w - (w * i) / stepsB).toFixed(1)}px ${(h - rand() * 4.2).toFixed(1)}px`)
  }
  const size = text.length > 40 ? 25 : text.length > 30 ? 28 : 31
  return (
    <div style={{ position: 'absolute', inset: 0, filter: DROP }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: PRINT,
          clipPath: `polygon(${pts.join(', ')})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 20px 12px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1.0,
            color: INK,
            textAlign: 'center',
            textWrap: 'balance',
            overflowWrap: 'break-word',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}

/* ---------- journal ---------- */

const RULE = 21
const J_TOP = 34
const J_MARGIN = 36

function Journal({ card }: { card: CardData }) {
  const { h } = CARD_SIZE.journal
  const holes = [58, h / 2, h - 58]
  const mask = holes
    .map((y) => `radial-gradient(circle at 16px ${y}px, transparent 5.2px, #000 5.9px)`)
    .join(', ')
  const maskStyle: CSSProperties = {
    maskImage: mask,
    maskComposite: 'intersect',
    WebkitMaskImage: mask,
  }
  return (
    <div style={{ position: 'absolute', inset: 0, filter: DROP }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#FFFCF4',
          borderRadius: 2,
          overflow: 'hidden',
          ...maskStyle,
        }}
      >
        {/* ruled lines: drawn as lines, 1px every RULE px */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: J_TOP - 3,
            bottom: 6,
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${RULE - 1}px, rgba(96,128,160,0.30) ${RULE - 1}px, rgba(96,128,160,0.30) ${RULE}px)`,
          }}
        />
        {/* margin line */}
        <div
          style={{
            position: 'absolute',
            left: J_MARGIN,
            top: 0,
            bottom: 0,
            width: 1.5,
            background: 'rgba(217,139,106,0.75)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: J_MARGIN + 9,
            right: 11,
            top: J_TOP,
            fontFamily: 'var(--font-hand)',
            fontWeight: 500,
            fontSize: 16.5,
            lineHeight: `${RULE}px`,
            color: INK,
            overflowWrap: 'break-word',
          }}
          data-journal-text
        >
          {card.text}
        </div>
      </div>
    </div>
  )
}

/* ---------- the face ---------- */

/** The face of a card (the print itself), exactly CARD_SIZE[card.type] big. */
export function CardFace({ card }: { card: CardData }) {
  const size = CARD_SIZE[card.type]
  return (
    <div
      style={{
        position: 'relative',
        width: size.w,
        height: size.h,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {card.type === 'photo' && <Photo card={card} />}
      {card.type === 'song' && <Song card={card} />}
      {card.type === 'phrase' && <Phrase card={card} />}
      {card.type === 'journal' && <Journal card={card} />}
      <Tapes card={card} />
    </div>
  )
}
