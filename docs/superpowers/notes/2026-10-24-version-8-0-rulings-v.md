# Version 8.0 "Clear and calm": Track V (the look), rulings 1130-1144

Track V owns the look: the band, the frame every panel wears, the four button weights and the one meaning of each colour.
This file is first published with the class names the other tracks use; the rulings are filled in as they are made.

## Class names (use these, nothing else, for button weight)

Put the class on the `<button>`. A button with none of them is the plain neutral button (parchment, ink outline) used for
icon buttons such as Flip, Undo and Cancel.

| Class | Weight | Look | Use |
| --- | --- | --- | --- |
| `primary` | the one filled style | gold on deep blue (lapis), as Start the lesson wears today | one per screen, sheet, card or bar |
| `secondary` | outlined | lapis words in a lapis outline on the linen | the next-most-likely action |
| `tertiary` | plain text | lapis words, underlined, no outline or fill | "Skip", "Leave", "Not now" links |
| `danger` | coral | white on coral | only the confirm of something destructive (Demolish) |

Rules for the other tracks:
- `primary` and `danger` are the only filled buttons. Flip/Straight, Undo and Cancel stay neutral (no class) or take
  `secondary`; they may never be filled or coloured.
- `tertiary` keeps a 44 px tap box (the underline is the text's, the box is the button's).
- A row's own action inside a sheet's list that carries `primary` is drawn as `secondary` by the sheet's CSS already
  (7.0's rule); you need no extra class there.
- `quiet` (7.0) still works and now means the same as `tertiary` without the underline; new code uses `tertiary`.

Frame hooks (CSS only, nothing to call): `.frame-band` puts the band on the top edge of any box that has a linen background
(radius-aware); `.frame-title` is the cartouche header class for a heading inside a framed box. The shared surfaces (sheets,
dialogs, the lesson card, the event card, What's new, Options, the new-city card, How to play, toasts, the placing bar) wear
the band without any class.

Colours (design rule 5): teal or blue is "covered / reaches / works", amber is "works but something is missing", coral or
red is only "cannot". Do not use `--coral`, `--coral-text` or `--coral-soft` for anything that is not a refusal, a cannot
or a destructive confirm; use `--amber*` for a warning, `--teal*` for a good state and `--lapis` for emphasis.

## Rulings (1130-1143)

1130. The band is 6 px (it was 4), one and a half times thicker; each colour block is 15 px of every 16 (it was 11 of 12), so colour weighs 94% of its face, not 92%. It is the token `--band-h` and the shorthand `--look-frieze`; the top bar keeps it on its lower edge and adds a 3 px foot (`--band-foot`, so `--topbar-h` and `TOPBAR_PX` are 51 at 100% text) so the whole band shows under the 44 px buttons (the bar is 3 px taller at 100% text; ruling 1143 takes it back from the gap below). — Cost if wrong: the bar is 3 px taller on a phone; changing `--band-h` and `--band-foot` retunes both.
1131. The frame is the band as two background layers on a box's top edge over its own linen, so the box's radius clips it and a scrolling box keeps it. The list is in the v80 v block of css/ui.css: `.frame-band`, the title card (so What's new, Options, the new-city card and How to play), dialogs, the lesson card, the placing bar, a sheet's head and toasts. Each got a few px of top padding so no text touches the band. — Cost if wrong: one list to edit; a new panel takes `.frame-band`.
1132. Titles are cartouches: the title card's panel headings and anything marked `.frame-title` wear the sheet heading's outline in the serif; there is no new corner ornament in 8.0a. — Cost if wrong: the ornament is a later CSS addition.
1133. Button weights are shared classes (`primary`, `secondary`, `tertiary`, `danger`); existing buttons (the title's others, the lesson card's Leave and Skip, a dialog's Cancel) take their weight from CSS, so no markup changed there. — Cost if wrong: moving one button's weight is one selector.
1134. The placing bar's chips (style, spacing, route, one-or-area) show "chosen" by a soft teal fill, a ring and weight, never a solid fill; Flip, Undo, Cancel and Rotate stay neutral. The tick is the one filled button, so Straight can no longer outweigh it. — Cost if wrong: the chosen state reads a little quieter.
1135. Colours: teal or blue is covered, amber is works-but-missing, coral or red is only cannot. A service's reach is washed in teal (water in its own blue) whichever service it is (`COVER_HUE`); the dots and rings keep each overlay's hue. — Cost if wrong: the overlays are less distinct by wash alone.
1136. Overlay changes: fire risk is a burnt amber `#B86A00` (it was the ember red `#9C2A1C`); the hatching of homes a building would make less pleasant (the granary's, which the friend read as "should not be here") and the desirability overlay's below-zero ground and its legend swatch are amber, not coral. The ghost's refusals (taken, water, off the map) stay coral. — Cost if wrong: one colour constant per overlay.
1137. A dialog's OK is coral (`danger`) by default; a confirm that destroys nothing passes `destructive: false` and wears `primary` (Enlarge the palace now does). — Cost if wrong: any other non-destructive confirm that omits it stays coral until it passes the flag.
1138. Interface coral that was not a refusal and is not now: the advice dot (teal), a falling trend (amber), a switch that is off (soft ink), a low favour meter (amber) and the confirm bar's "makes N homes less pleasant" line (amber). — Cost if wrong: five one-line selectors.
1139. Coral kept, because each is a cannot or a danger: the critical alert banner and its icon (raid, fire, plague), the alert count badge, an unaffordable cost, a short step or cost, a refused condition (`.cond.cant`), the demolish bar and its confirm, and the sheet cross. — Cost if wrong: a raid reads amber instead; one selector.
1140. At 375 px and 150% text the wrapped stats row keeps its old 3 px foot (it fills the bar); the band shows under it as it did in 7.1.1. Every other bar button clears the band. — Cost if wrong: none seen; 1 px of band hides behind a transparent button.
1141. Toasts take the band without the linen fibre (they had none). — Cost if wrong: a toast reads plainer than a sheet.
1142. Contrast of the new frames is tested at 4.5:1 or more (ink, lapis, soft ink and amber text on linen, and lapis-ink on lapis). — Cost if wrong: a text colour is retuned in one token.
1143. The band's 3 px foot costs no height where a budget holds. At 100% text the gap under the top bar is 3 px, not 6 (`--under-gap`), so the rows under it sit exactly where they did in 7.1.1 and tests/ui/mobileBudget.test.js holds (the portrait phone was 1% over without it); at 125% and 150% the bar is as tall as its content, so the full 6 px stays. On a landscape phone (compact) the foot is 2 px and the gap 5 px, so it costs 1 px. The score chip keeps its 6 px from the bottom. — Cost if wrong: the rows sit 3 px nearer the bar at 100% text; one variable.

Colour audit, in short: `src/render/overlays.js` (fire hue, desirability hatching, tint hatching, the covered wash), `src/ui/overlayUi.js` (the legend swatch), css/ui.css (the five lines in ruling 1138). Nothing else coral was found outside "cannot".
