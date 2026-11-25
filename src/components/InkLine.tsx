import { useDemo } from '../store'
import type { CardData } from '../types'

/** STUB: the line under a card. Pencil guess, strike, ink input, ink. */
export function InkLine({ card, enlarged }: { card: CardData; enlarged: boolean }) {
  const { state, act } = useDemo()
  const line = state.lines[card.id]
  if (line.status === 'empty') return null
  if (line.status === 'guess')
    return (
      <p className="pencil text-xl text-center" onClick={() => act.startWriting(card.id)}>
        {card.pencilGuess}
      </p>
    )
  return <p className={`ink text-center ${enlarged ? 'text-3xl' : 'text-xl'}`}>{line.ink}</p>
}
