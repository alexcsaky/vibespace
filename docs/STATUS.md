# Status

Last updated: 25 Nov 2026

## Current facts

- Someday is a single-page demo (Vite, React, TypeScript, Tailwind v4, Framer Motion) for a screen recording on a fixed 1440 x 900 canvas. See README.md for how to run it and swap content.
- All four parts of the brief work on the scripted path: board with pencil and ink, unfold to three trails, ink check with paste fade and stamp, trace threads.
- The ink check is scripted in `src/pangram.ts`. No Pangram call is made. Alex chose this on 25 Nov 2026 so that takes are deterministic.
- All content comes from `src/demo.json`. Ink, the phrase, the journal entry, the song and the first steps are `REPLACE:` placeholders. Pencil guesses, trail names (Strength, Outdoors, Writing) and need chips are drafted.
- Restyled on 25 Nov 2026 after Alex's feedback that the scrapbook look was too cartoony: now a product-style canvas (app bar, pins, music tile, sticky note, journal card, UI chips and task cards) with pixel-art accents (Pixelify Sans labels, pixel icons). Pencil and ink stay in Caveat.
- `public/cards/1.jpg` to `5.jpg` and `sleeve.jpg` are real photos from Unsplash (Unsplash Licence). Credits are in `public/cards/CREDITS.md`.

## In progress

- Nothing.

## Waiting on Alex

- Replace every `REPLACE:` line in `src/demo.json`, and swap in his own photos if he prefers them to the Unsplash ones.
- Check real ink of two or three lines under each card still sits clear of the cards below it, and nudge `board` positions if not.

## Not built

- Sounds (left out of the brief).
- A real Pangram proxy.
