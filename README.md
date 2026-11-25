# Someday

A cosy vision board that unfolds into a plan. The AI writes in pencil, you write in ink, and only ink goes into the plan.

The interface is a product-style canvas: an app bar, photo pins, a music tile, a sticky-note goal and a journal card, with pixel-art accents. Pencil and ink stay handwritten.

This is a demo for a screen recording. It is built for one scripted path on a fixed 1440 x 900 canvas. There is no backend, no saving and no tests.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 in a browser window at least 1440 x 900. The canvas is centred and scales down if the window is smaller, so for a crisp recording keep the window at 1440 x 900 or larger.

Reload the page to reset everything for another take. The Board / Path switch in the app bar also moves between the two views.

## The scripted path

1. Click the skiing photo. The pencil guess writes itself in underneath.
2. Click the pencil line. It is struck through and an ink input opens. Type, press Enter.
3. Click the phrase card, click its pencil line, and paste 50 or more words. The text goes down as ink, then fades to pencil with the note "This sounds borrowed. Want to say it your way?". Click it, retype, press Enter.
4. Click "Check my ink" (app bar, top right). The stamp lands: "In your own words".
5. Click "Show me the way". The same cards move into three trails.
6. Click a pencil chip to turn it to ink.
7. Click a first step to trace the thread back to its cards. Click again to clear.

## Swap the images

Replace these files, keeping the names. The pins are portrait, 7:8 (the current files are 840 x 960). The current photos are from Unsplash under the Unsplash Licence; credits are in `public/cards/CREDITS.md`, so update that file if you swap them.

| File | Card |
| --- | --- |
| `public/cards/1.jpg` | someone strong |
| `public/cards/2.jpg` | someone skiing |
| `public/cards/3.jpg` | someone in nature |
| `public/cards/4.jpg` | spare |
| `public/cards/5.jpg` | spare |
| `public/cards/sleeve.jpg` | cover art on the song tile (square; only the top three quarters shows) |

To use a different file name or type, change that card's `src` in `src/demo.json` (paths are relative to `public/`, with no leading slash). The song cover path is set in `src/components/Card.tsx`.

## Swap the text

Everything on screen comes from `src/demo.json`. Search the file for `REPLACE` to find every placeholder.

Each card has:

- `ink`: your line under the card. Leave it as `""` for a card that should start empty (the skiing photo `c2` and the phrase card `c7` do now).
- `pencilGuess`: the pencil question that appears when you click an empty card.
- `text`: the phrase on the phrase card, the entry on the journal card (about 80 words fits), or the song title (about 20 characters fit on one line). The song also has `artist`.
- `trail`: which trail the card moves to, 0, 1 or 2.
- `board`: where the card sits in the collage, `x` and `y` in pixels from the top left of the canvas, and `rotate` in degrees.

Each trail has a `name`, four `needs` (the pencil chips) and a `firstStep` (ink).

The dev server reloads as soon as you save.

## The ink check is scripted

`src/pangram.ts` stands in for the Pangram API so that every take behaves the same:

- Pasting 50 or more words into an ink input always reads as AI.
- "Check my ink" always reads as human, unless a line on the board is still marked as borrowed.

To make it real, replace the body of `checkInk` with a call to a proxy for the Pangram API and return `'human'` or `'ai'`.

## Tuning

- Positions in the path (trail columns, card slots, chips, first steps): `src/layout.ts`.
- The unfold timing: `UNFOLD_SPRING` and `STAGGER` at the top of `src/App.tsx`.
- Colours, fonts and the shared button and card styles: `src/index.css`.
- Pixel icons: `src/components/Pixel.tsx`.
- The board name in the app bar ("Next year") and the avatar initial: `TopBar` in `src/App.tsx`.

Shortcuts for jumping straight to a state: `?phase=path`, `?phase=path&trace=1`, `?stamp=1`, `?guess=c2`, `?writing=c2`, `?borrowed=c7`.
