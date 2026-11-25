/**
 * Every position in the demo is fixed. Canvas is 1440 x 900.
 * Board positions live in demo.json. Path positions are computed here.
 * All card coordinates are the TOP-LEFT of the card face, and cards
 * transform from their top-left corner (transform-origin 0 0).
 */
import demoJson from './demo.json'
import type { CardData, CardType, DemoData } from './types'

export const demo = demoJson as DemoData

export const CANVAS = { w: 1440, h: 900 }
/** Height of the app bar across the top of the canvas. */
export const TOPBAR_H = 52

/** Size of the card face (the print itself), before any scaling. */
export const CARD_SIZE: Record<CardType, { w: number; h: number }> = {
  photo: { w: 210, h: 240 },
  song: { w: 196, h: 196 },
  phrase: { w: 240, h: 132 },
  journal: { w: 290, h: 300 },
}

/** The ink line sits under the face, this far below it, and is this much wider than the face. */
export const LINE_GAP = 10
export const LINE_EXTRA_W = 24

/** PATH: three vertical trails. */
export const PATH_SCALE = 0.6
export const TRAIL_X = [250, 720, 1190] // centre x of each trail column
export const TRAIL_W = 400
export const TRAIL_NAME_Y = 64 // top of the trail name
export const CHIP = { w: 184, h: 68, gapX: 16, gapY: 12, top: 548 }
export const STEP = { w: 380, h: 92, top: 728 }

export interface Slot {
  x: number
  y: number
  rotate: number
  scale: number
}

// Offsets from the trail centre for 1, 2 or 3 cards in a trail.
const SLOT_PATTERNS: Record<number, { dx: number; y: number; rotate: number }[]> = {
  1: [{ dx: -70, y: 130, rotate: -2 }],
  2: [
    { dx: -178, y: 152, rotate: -1.5 },
    { dx: 52, y: 260, rotate: 2 },
  ],
  3: [
    { dx: -198, y: 142, rotate: -2 },
    { dx: 46, y: 132, rotate: 2 },
    { dx: -62, y: 352, rotate: -1 },
  ],
}

// Biggest card first, so the journal takes the roomy first slot of its trail.
const area = (c: CardData) => CARD_SIZE[c.type].w * CARD_SIZE[c.type].h
const byTrail = (t: number) => {
  const cards = demo.cards.filter((c) => c.trail === t)
  return cards.some((c) => c.type === 'journal') ? [...cards].sort((a, b) => area(b) - area(a)) : cards
}

/** Fixed path slot for each card id. */
export const PATH_SLOTS: Record<string, Slot> = {}
/** Order in which cards leave the board (for the stagger). */
export const UNFOLD_ORDER: Record<string, number> = {}

{
  let order = 0
  demo.trails.forEach((_, t) => {
    const cards = byTrail(t)
    const pattern = SLOT_PATTERNS[Math.min(cards.length, 3)] ?? SLOT_PATTERNS[3]
    cards.forEach((card, i) => {
      const p = pattern[i % pattern.length]
      PATH_SLOTS[card.id] = { x: TRAIL_X[t] + p.dx, y: p.y, rotate: p.rotate, scale: PATH_SCALE }
      UNFOLD_ORDER[card.id] = order++
    })
  })
}

export const cardsInTrail = byTrail

/** Top-left of need chip i (0..3) in trail t. 2 x 2 grid with a gap down the middle. */
export function chipPos(t: number, i: number) {
  const col = i % 2
  const row = Math.floor(i / 2)
  return {
    x: TRAIL_X[t] + (col === 0 ? -CHIP.w - CHIP.gapX / 2 : CHIP.gapX / 2),
    y: CHIP.top + row * (CHIP.h + CHIP.gapY),
  }
}

/** Top-left of the first step block in trail t. */
export function stepPos(t: number) {
  return { x: TRAIL_X[t] - STEP.w / 2, y: STEP.top }
}

/** Where a trace thread starts: top centre of the first step. */
export function stepAnchor(t: number) {
  return { x: TRAIL_X[t], y: STEP.top + 4 }
}

/** Where a trace thread ends: bottom centre of the card face in its path slot. */
export function cardAnchor(card: CardData) {
  const s = PATH_SLOTS[card.id]
  const size = CARD_SIZE[card.type]
  return { x: s.x + (size.w * s.scale) / 2, y: s.y + size.h * s.scale }
}
