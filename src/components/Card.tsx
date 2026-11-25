import { useState } from 'react'
import { CARD_SIZE } from '../layout'
import type { CardData } from '../types'
import { PixelIcon } from './Pixel'

const INK = '#1F2A44'
const SAGE = '#A8B89A'
const TERRACOTTA = '#D98B6A'
const CARD = '#FFFDF8'
const PAPER = '#FAF3E7'
const LINE = 'rgba(31,42,68,0.14)'
const MUTED = 'rgba(31,42,68,0.55)'

/** The product surface shadow (see `.surface`): a 2px hard step, then a soft low one. */
const SHADOW = '0 2px 0 rgba(31,42,68,0.12), 0 14px 24px -14px rgba(60,40,20,0.40)'

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A stable small integer per card: c1 -> 0, c2 -> 1 ... (falls back to a hash). */
function ordinal(id: string) {
  const n = parseInt(id.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? Math.max(0, n - 1) : hash(id)
}

/* ---------- pushpin ---------- */

const PIN_COLORS = [TERRACOTTA, INK, SAGE]

function Pin({ card }: { card: CardData }) {
  const { w } = CARD_SIZE[card.type]
  let color = PIN_COLORS[ordinal(card.id) % PIN_COLORS.length]
  // never a sage pin on a sage note, or a terracotta pin on a terracotta note
  if (card.type === 'phrase' && color === phraseTint(card).pin) color = INK
  const size = 18
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: Math.round(w / 2 - size / 2),
        top: -size / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
        filter: 'drop-shadow(1px 2px 0 rgba(31,42,68,0.28))',
      }}
    >
      <PixelIcon name="pin" size={size} color={color} />
      {/* one lit pixel on the head */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: 2,
          width: 2,
          height: 2,
          background: 'rgba(255,253,248,0.6)',
        }}
      />
    </div>
  )
}

/* ---------- photo: a pin ---------- */

function Photo({ card }: { card: CardData }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 12,
        overflow: 'hidden',
        background: SAGE,
        boxShadow: SHADOW,
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
            padding: 20,
            boxSizing: 'border-box',
            textAlign: 'center',
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 12,
            color: 'rgba(31,42,68,0.72)',
          }}
        >
          {card.label}
        </div>
      )}
      {/* hairline inner edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          boxShadow: 'inset 0 0 0 1px rgba(31,42,68,0.16)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/* ---------- song: an embedded track ---------- */

const PLAY = ['.#....', '.##...', '.###..', '.####.', '.###..', '.##...', '.#....']
const EQ = [2, 4, 3, 5, 2] // bar heights in 2px pixels

function Song({ card }: { card: CardData }) {
  const [failed, setFailed] = useState(false)
  const s = CARD_SIZE.song.w
  const strip = 52
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 12,
        overflow: 'hidden',
        background: INK,
        boxShadow: SHADOW,
      }}
    >
      {/* cover art */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: s, height: s - strip, background: INK }}>
        {failed ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PixelIcon name="note" size={36} color="rgba(250,243,231,0.5)" />
          </div>
        ) : (
          <img
            src="cards/sleeve.jpg"
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>

      {/* play button, sitting on the artwork */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: 10,
          bottom: strip + 10,
          width: 30,
          height: 30,
          borderRadius: 8,
          background: TERRACOTTA,
          boxShadow: '0 2px 0 #B9704F, 0 0 0 1.5px rgba(255,253,248,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={12} height={14} viewBox="0 0 6 7" shapeRendering="crispEdges">
          {PLAY.flatMap((row, y) =>
            [...row].map((ch, x) =>
              ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={CARD} /> : null,
            ),
          )}
        </svg>
      </div>

      {/* title strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: strip,
          background: CARD,
          borderTop: `1.5px solid ${LINE}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px 1px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            data-fit="song-title"
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 13,
              lineHeight: '17px',
              color: INK,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.text}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: 11,
              lineHeight: '15px',
              color: MUTED,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.artist}
          </div>
        </div>
        {/* pixel equaliser */}
        <svg
          aria-hidden
          width={EQ.length * 4 - 2}
          height={12}
          viewBox={`0 0 ${EQ.length * 4 - 2} 12`}
          shapeRendering="crispEdges"
          style={{ flex: 'none' }}
        >
          {EQ.map((n, i) => (
            <rect key={i} x={i * 4} y={12 - n * 2} width={2} height={n * 2} fill={TERRACOTTA} />
          ))}
        </svg>
      </div>

      {/* hairline edge over everything */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 12,
          boxShadow: 'inset 0 0 0 1.5px rgba(31,42,68,0.16)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/* ---------- phrase: a sticky note ---------- */

const TINTS = [
  { fill: '#E4EBD9', edge: 'rgba(84,104,68,0.22)', label: '#6F8560', pin: SAGE },
  { fill: '#F8DFD0', edge: 'rgba(160,88,56,0.22)', label: '#B56F4F', pin: TERRACOTTA },
]

function phraseTint(card: CardData) {
  return TINTS[ordinal(card.id) % TINTS.length]
}

function Phrase({ card }: { card: CardData }) {
  const text = card.text ?? ''
  const tint = phraseTint(card)
  const size = text.length > 44 ? 23 : text.length > 34 ? 26 : text.length > 22 ? 29 : 32
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 8,
        background: tint.fill,
        boxShadow: `inset 0 0 0 1.5px ${tint.edge}, ${SHADOW}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '26px 20px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: tint.label,
        }}
      >
        <PixelIcon name="flag" size={9} />
        <span className="label" style={{ fontSize: 10 }}>
          Goal
        </span>
      </div>
      <div
        data-fit="phrase"
        style={{
          fontFamily: 'var(--font-hand)',
          fontWeight: 700,
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
  )
}

/* ---------- journal: a note card ---------- */

const J_HEAD = 34
const J_PAD = 16
const J_DATES = ['12 Nov', '9 Nov', '17 Nov', '21 Nov', '4 Nov']

function Journal({ card }: { card: CardData }) {
  const { h } = CARD_SIZE.journal
  const text = card.text ?? ''
  // step the writing down as the entry gets longer, so 90 words always fit
  const [font, rule] = text.length > 490 ? [16, 19] : text.length > 440 ? [17, 20] : [18, 21]
  const top = J_HEAD + 6
  const lines = Math.floor((h - top - 12) / rule)
  return (
    <div
      className="surface"
      style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', overflow: 'hidden', boxShadow: SHADOW }}
    >
      <div
        style={{
          height: J_HEAD,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: `0 ${J_PAD - 2}px`,
          borderBottom: `1.5px solid ${LINE}`,
          background: PAPER,
          color: INK,
        }}
      >
        <PixelIcon name="pencil" size={9} color={TERRACOTTA} />
        <span className="label" style={{ fontSize: 11 }}>
          Journal
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 11,
            color: MUTED,
          }}
        >
          {J_DATES[ordinal(card.id) % J_DATES.length]}
        </span>
      </div>
      {/* faint ruled lines, one under each line of writing */}
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: J_PAD - 2,
            right: J_PAD - 2,
            top: top + (i + 1) * rule - 3,
            height: 1,
            background: 'rgba(31,42,68,0.08)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: J_PAD - 1.5,
          right: J_PAD - 1.5,
          top: top - 1.5,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        <div
          data-journal-text
          style={{
            fontFamily: 'var(--font-hand)',
            fontWeight: 500,
            fontSize: font,
            lineHeight: `${rule}px`,
            color: INK,
            overflowWrap: 'break-word',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}

/* ---------- the face ---------- */

/** The face of a card, exactly CARD_SIZE[card.type] big. The parent rotates and scales it. */
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
      <Pin card={card} />
    </div>
  )
}
