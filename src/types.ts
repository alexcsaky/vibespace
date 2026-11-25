export type CardType = 'photo' | 'phrase' | 'song' | 'journal'
export type NeedKind = 'time' | 'money' | 'people' | 'skills'

export interface CardData {
  id: string
  type: CardType
  /** photo cards: image path under /public */
  src?: string
  /** phrase: the phrase. journal: the entry. song: the title. */
  text?: string
  /** song cards only */
  artist?: string
  /** photo cards: what the placeholder shows, also used as alt text */
  label?: string
  board: { x: number; y: number; rotate: number }
  trail: number
  pencilGuess: string
  ink: string
}

export interface Need {
  kind: NeedKind
  text: string
}

export interface TrailData {
  name: string
  needs: Need[]
  firstStep: string
}

export interface DemoData {
  cards: CardData[]
  trails: TrailData[]
}
