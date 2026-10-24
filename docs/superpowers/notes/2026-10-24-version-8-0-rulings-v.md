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
