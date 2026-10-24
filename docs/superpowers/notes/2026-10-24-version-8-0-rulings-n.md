# Version 8.0 "Clear and calm": Track N (messages, placing and the lesson fixes), rulings 1160-1174

Design: `docs/superpowers/specs/2026-10-24-thebes-version-8-0-design.md` sections 3, 4 and 5. Tests: `tests/v80/n/` (describe names start with `v80 n`).
Button weight uses Track V's classes (`docs/superpowers/notes/2026-10-24-version-8-0-rulings-v.md`): the tick is `primary`; Flip, Undo, Cancel and the chosen one of a row of choices are neutral
(no class); the lesson's Skip is `tertiary`.

1160. **The tray.** Every toast and every caption (placed, goal done, a first, caravan, rank, a warning's words) is kept in a message tray (`src/ui/tray.js`, never saved): the last 30, newest first, each with
  the place on the map it is about when it has one (a placement's centre, a first's tile, a caravan's trading post). It lives behind the existing scroll button at the top right, whose sheet is now
  "Messages and advice": the tray first, then City advice as before (with no message and nothing pinned the sheet is exactly the old City advice). The button carries a lapis number: the messages not read yet plus what is
  pinned; its name says the same in words ("Messages and advice: 3 new messages"); opening the sheet reads them. A message with a place has a 44 px Show that closes the sheet, glides there and rings the place with the
  map's own pulse. A toast still shows for TOAST_MS (4 s); the Undo toast keeps its 6 s (UNDO_TOAST_MS, 7.1.1) so the Undo can be reached; a toast held back by a lesson card is not shown but is still kept.
  A placement taken back (Undo) leaves the tray. The "Update ready" offer is not kept (its own way back). Cost if wrong: a player who expected a toast for each message sees a count and one more tap; the
  tray is memory only, so a reload empties it (no save change, no world state).
1161. **Pinned.** Raids, fires, raid warnings, a letter from the court, debt, a failing save and a city event waiting for an answer (`PINNED_CODES`) are not stored: they are read live from the alerts and listed
  first, in amber with "⚑ Needs you" in words, until the alert is gone (the player dealt with it). Fires roll into one row as the banner's do. Show/Open does what the banner's own button does. Cost if wrong: a
  pinned row that opens the wrong sheet; no data is lost.
1162. **What is placed.** The placing bar leads with the card's own picture (60x30) and the name at 20 px bold (capped at 115% text), inside a group named "Well: chosen". A different item flashes the bar for 900 ms
  with a lapis and gold ring: a class that a timer removes (so it reads under Gentle and Still, where css animations are off), kept through rebuilds. Cost if wrong: the bar is about 8 px taller on a phone
  (mobileBudget holds).
1163. **One primary.** The tick is the only filled, coloured button in a bar. Flip becomes a neutral icon (⇄, still named "Flip"). The chosen one of Route/Straight, a monument's styles, an area's spacing and the
  area toggle is an outlined button with a bold name and its ✓ (it was a teal fill that outweighed the tick). Cost if wrong: the chosen state is quieter; it stays aria-pressed and ticked.
1164. **The lit card.** The chosen tray card (aria-pressed) wears a lapis ring, a tint and a tick after its name. A phone's dock is hidden while a tool is in hand (css), so there the bar's picture and name are the cue;
  a wide screen and a sideways phone keep the tray beside the map. Cost if wrong: none on a phone.
1165. **Undo.** Undo covers the last action only and lapses when the next month starts (the month's end already cleared the stack). `undoLast` (src/sim/undo.js) takes that step back and then empties the stack; the
  placement's Undo, Ctrl+Z, Delete, the bar's Undo and the toast's Undo all go through it. The older action's toast Undo goes when the next action comes up (a wide screen showed two), and the toast goes when the month
  ends. `undo()` stays the one-step primitive scripts use, so the balance runs' roll-backs are unchanged. Cost if wrong: a player cannot take back two placements in a row; that is the intent.
1167. **One plot.** With the Housing plot tool and nothing drawn, one tap or click lays one plot at once (usual toast, Undo, the bar stays with Done); a one-tile drag does the same; a tile the sim refuses stays drawn so
  the bar says why, and the next tap replaces it; a longer drag, or a tap once a plan or rectangle is drawn, is as before (waits for the tick). The mouse's click-start then click-end for plots is gone (drag still
  draws a rectangle). Cost if wrong: a player who wanted to tap several separate tiles and tick once now lays each at once (each has Undo for the last).
1170. **The camera follows the step.** Every lesson step that points at a place frames it in the middle of the free map as it begins (7.1.1 moved the view only when the target was off the free map, so the tower
  step, four tiles from the bazaar that the fire and raid steps aim at, left the view on the bazaar). A step about the whole city leaves the view alone. Cost if wrong: the view moves at every such step.
1171. **The pulse and Leave.** The tray card and category a step needs wear `lesson-pulse`, the same teal ring as the map's target (pulsing under Full motion only). Leave the lesson is gone from the card and the docked
  row; the ☰ menu has it while a lesson runs (it already did), and still asks first. Cost if wrong: Leave is one tap further (dock the card, ☰, Leave).
1172. **Skip.** "Skip, I've played before" stays on the lesson's first card as a tertiary text button under the one primary (`lc-skip quiet tertiary`); Tab goes Show me, Skip.

Not done in this track: the Undo toast time (6 s) is not cut to 4 s; the advice dot (coral, in the top bar) is Track V's colour audit.
