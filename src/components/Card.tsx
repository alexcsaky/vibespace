import { CARD_SIZE } from '../layout'
import type { CardData } from '../types'

/** STUB: the face of a card (the print itself), exactly CARD_SIZE[card.type] big. */
export function CardFace({ card }: { card: CardData }) {
  const size = CARD_SIZE[card.type]
  return (
    <div
      className="bg-white shadow-md p-3 font-hand text-ink overflow-hidden"
      style={{ width: size.w, height: size.h }}
    >
      {card.type}: {card.label ?? card.text}
    </div>
  )
}
