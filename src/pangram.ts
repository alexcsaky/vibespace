/**
 * Scripted ink check. Stands in for the Pangram text detection API so the
 * recording is deterministic. To make it real later, replace the body of
 * checkInk with a fetch to a proxy and keep the same return shape.
 */
export type Verdict = 'human' | 'ai'

export const MIN_WORDS = 50

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * source 'paste': text pasted into an ink input. Reads as AI (it is only called for 50+ words).
 * source 'board': every ink line on the board joined together. Reads as human.
 */
export async function checkInk(text: string, source: 'paste' | 'board'): Promise<Verdict> {
  await wait(source === 'paste' ? 900 : 1300)
  const verdict: Verdict = source === 'paste' && wordCount(text) >= MIN_WORDS ? 'ai' : 'human'
  console.log('[ink check, scripted]', { source, words: wordCount(text), verdict })
  return verdict
}
