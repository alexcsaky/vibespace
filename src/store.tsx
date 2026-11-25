import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { demo } from './layout'
import type { NeedKind } from './types'

export type Phase = 'board' | 'path'

/**
 * Life of the line under a card:
 *  empty    -> nothing written yet (card is clickable)
 *  guess    -> the pencil guess has written itself in
 *  writing  -> guess struck through, ink input open
 *  inked    -> the user's line, in ink
 *  checking -> pasted 50+ words, shown in ink while the ink check runs
 *  borrowed -> reads as AI: faded to pencil, with the "sounds borrowed" note
 */
export type LineStatus = 'empty' | 'guess' | 'writing' | 'inked' | 'checking' | 'borrowed'

export interface LineState {
  status: LineStatus
  ink: string
}

/** idle -> checking -> human (stamp) | borrowed (no stamp) */
export type CheckState = 'idle' | 'checking' | 'human' | 'borrowed'

export interface State {
  phase: Phase
  lines: Record<string, LineState>
  /** card most recently touched, drawn on top */
  activeCard: string | null
  /** inked need chips, keyed by chipKey(trail, kind) */
  chips: Record<string, boolean>
  /** trail whose first step is being traced, or null */
  trace: number | null
  check: CheckState
}

export const chipKey = (trail: number, kind: NeedKind) => `${trail}:${kind}`

type Action =
  | { type: 'line'; id: string; status: LineStatus; ink?: string }
  | { type: 'phase'; phase: Phase }
  | { type: 'chip'; key: string }
  | { type: 'trace'; trail: number | null }
  | { type: 'check'; check: CheckState }

function initialState(): State {
  const q = new URLSearchParams(window.location.search)
  const lines: Record<string, LineState> = {}
  for (const c of demo.cards) {
    lines[c.id] = { status: c.ink ? 'inked' : 'empty', ink: c.ink }
  }
  // Dev shortcuts for checking states quickly, e.g. ?phase=path&trace=1&stamp=1&guess=c2
  const guess = q.get('guess')
  if (guess && lines[guess]) lines[guess].status = 'guess'
  const writing = q.get('writing')
  if (writing && lines[writing]) lines[writing].status = 'writing'
  const borrowed = q.get('borrowed')
  if (borrowed && lines[borrowed]) {
    lines[borrowed] = {
      status: 'borrowed',
      ink: 'My goal for the coming year is to cultivate a balanced and fulfilling lifestyle by embracing new challenges, fostering meaningful connections, and prioritising personal growth across every area of my life, while remaining mindful of my wellbeing and committed to continuous improvement in everything that I choose to pursue.',
    }
  }
  const trace = q.get('trace')
  return {
    phase: q.get('phase') === 'path' ? 'path' : 'board',
    lines,
    activeCard: guess ?? writing ?? borrowed ?? null,
    chips: {},
    trace: trace !== null ? Number(trace) : null,
    check: q.get('stamp') ? 'human' : 'idle',
  }
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'line': {
      const prev = state.lines[a.id]
      return {
        ...state,
        activeCard: a.id,
        lines: { ...state.lines, [a.id]: { status: a.status, ink: a.ink ?? prev.ink } },
      }
    }
    case 'phase':
      return { ...state, phase: a.phase, trace: null }
    case 'chip':
      return { ...state, chips: { ...state.chips, [a.key]: true } }
    case 'trace':
      return { ...state, trace: a.trail }
    case 'check':
      return { ...state, check: a.check }
  }
}

export interface Actions {
  /** empty -> guess: the pencil guess writes itself in */
  revealGuess(id: string): void
  /** guess | borrowed -> writing: strike the pencil line and open the ink input */
  startWriting(id: string): void
  /** writing -> inked */
  commitInk(id: string, text: string): void
  /** writing -> checking (pasted 50+ words, shown as ink while the check runs) */
  commitPaste(id: string, text: string): void
  /** checking -> borrowed | inked */
  setVerdict(id: string, verdict: 'human' | 'ai'): void
  unfold(): void
  backToBoard(): void
  inkChip(key: string): void
  toggleTrace(trail: number): void
  setCheck(check: CheckState): void
}

const Ctx = createContext<{ state: State; act: Actions } | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const act = useMemo<Actions>(
    () => ({
      revealGuess: (id) => dispatch({ type: 'line', id, status: 'guess' }),
      startWriting: (id) => dispatch({ type: 'line', id, status: 'writing' }),
      commitInk: (id, text) => dispatch({ type: 'line', id, status: 'inked', ink: text }),
      commitPaste: (id, text) => dispatch({ type: 'line', id, status: 'checking', ink: text }),
      setVerdict: (id, verdict) =>
        dispatch({ type: 'line', id, status: verdict === 'ai' ? 'borrowed' : 'inked' }),
      unfold: () => dispatch({ type: 'phase', phase: 'path' }),
      backToBoard: () => dispatch({ type: 'phase', phase: 'board' }),
      inkChip: (key) => dispatch({ type: 'chip', key }),
      toggleTrace: (trail) => dispatch({ type: 'trace', trail }),
      setCheck: (check) => dispatch({ type: 'check', check }),
    }),
    [],
  )
  // toggleTrace needs the current value, so wrap it here
  const value = useMemo(
    () => ({
      state,
      act: {
        ...act,
        toggleTrace: (trail: number) =>
          dispatch({ type: 'trace', trail: state.trace === trail ? null : trail }),
      },
    }),
    [state, act],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemo() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDemo outside DemoProvider')
  return v
}
