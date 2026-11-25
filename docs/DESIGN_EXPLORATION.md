# Design exploration brief (for Paper)

A brief for exploring alternative looks and affordances for Someday on a Paper canvas. Written so a Claude Code session with the Paper MCP connected can start from it without other context. Everything here is a proposal; Alex picks what to explore.

## Starting point

- The app as built: run `npm run dev`, or see the screenshots in the session that produced this brief.
- Canvas: 1440 x 900, desktop only.
- Tokens: paper `#FAF3E7`, card `#FFFDF8`, sage `#A8B89A`, terracotta `#D98B6A`, ink navy `#1F2A44`, pencil grey `#9A9A94`, hairline `rgba(31,42,68,0.14)`.
- Type: Caveat (pencil and ink), Nunito (interface), Pixelify Sans (wordmark and small labels).
- Components to draw from: `src/components/Card.tsx` (pin, music tile, sticky note, journal card), `src/components/PathLayer.tsx` (need chips, first-step task card), `src/components/InkCheck.tsx` (button, stamp), `TopBar` in `src/App.tsx`, shared styles in `src/index.css`.
- Photos: `public/cards/1.jpg` to `5.jpg` and `sleeve.jpg`.

## The rule that must survive every version

The AI writes in pencil (grey, tentative). The user writes in ink (navy, crisp). Only ink goes into the plan. No chat box, no assistant avatar, no sparkle icons, no gradients.

## How to lay it out in Paper

One artboard per screen, 1440 x 900, named `<Look> / <State>`. For each look, draw two states: Board (with one card mid pencil-to-ink) and Path (with one trail traced). Put the affordance studies on a separate row of smaller artboards (about 480 x 360 each), named `Affordance / <Topic> / <Option>`, drawn in the baseline look so that only the affordance changes.

## Looks to compare

1. **Pinboard (baseline).** What is built now: warm paper with a dot grid, rounded photo pins at slight angles, pixel pushpins, pixel labels, app bar.
2. **Pixel desk.** Push the pixel-art side: 2px navy outlines, hard offset shadows with no blur, a pixel-art corkboard or wooden desk as the ground, larger pixel icons, and a bottom dock like a game inventory bar holding the main action. Photos stay real photos inside pixel frames.
3. **Quiet studio.** Pull back to a calm product: off-white ground, no rotation, a strict masonry grid like Are.na or Cosmos, hairlines only, generous spacing. Pixel type only in the wordmark. Handwriting only for pencil and ink.
4. **Lamp-lit.** An evening version: deep navy ground, cream cards, warm highlights. Ink becomes cream on navy and pencil stays grey. Tests whether the pencil and ink contrast still reads when inverted.

## Affordances to compare

For each, the current behaviour comes first.

1. **A card still needs your words.** Now: a faint dashed stroke under the card. Options: a pencil chip under the card reading "Why is this here?"; a small pencil badge on the card corner; a count in the app bar ("2 cards still in pencil").
2. **Answering a pencil guess.** Now: click the guess, it is struck through, type your own line. Options: two quiet actions under the guess, "Keep" (trace over it in ink) and "Rewrite"; drag an ink pen over the line to trace it; type directly over the guess, which fades as you type.
3. **Borrowed text.** Now: the pasted text fades to pencil with a margin note. Options: an inline pill on the line ("Sounds borrowed") with one action, "Say it your way"; a side-by-side of the borrowed line and an empty ink line.
4. **Ink progress.** Now: none until "Check my ink". Options: an ink meter in the app bar (cards in ink out of 8, and words towards the 50 the check needs); the stamp outline printed faintly on the board until it is earned.
5. **Starting the unfold.** Now: one primary button, always available. Options: the Board / Path switch alone; the button held back with a reason ("2 cards still in pencil") until every card is in ink; a pull handle at the bottom edge of the board.
6. **Accepting a need chip.** Now: click a pencil chip and it turns to ink as written. Options: click to edit the wording before it becomes ink; a rubber on each chip to rub out a suggestion you reject; drag a chip onto the first step to keep it.
7. **Tracing.** Now: click a first step to draw threads back to its cards. Options: hover to preview, click to pin; click any card to trace forwards to the step it feeds; a persistent thin thread at low contrast that brightens on hover.
8. **Adding a card.** Now: not shown. Options: a tray on the left with photo, phrase, song and journal slots; a single "Add" button that opens a small menu; drop a file anywhere on the board.

## What to bring back

For each look, one sentence on whether pencil and ink stay distinguishable at a glance in a screen recording. For each affordance, the option that explains itself without narration.
