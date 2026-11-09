# Version 9.2, Track W (words): rulings 1835-1844

Source: the deep review's section 5 in full, the design's section 7 (7.1 to 7.5), the plan's "Track W". Track W edits older player strings in place (`src/ui/text.js`, the per-version `*Text.js` files, How to play, `src/ui/s46/whatsNew.js`, older `src/data/releases.js` entries). It never changes a number's source and never touches the newest releases entry or `APP_VERSION`.

## The glossary (ruling 1835)

Each name was checked against what the code shows before it was chosen.

| Thing | The one name | What the code showed, and what changed |
|---|---|---|
| Ipi's guided first city | the lesson (button: Lesson; "Leave the lesson"; "Skip the lesson") | The first card and the title both said "I've played before"; both now say "Skip the lesson" (`V711_TEXT.skip`). |
| The goals strip, the Suggested ring and the tips | the guide (Help level "Guide and tips"; "Skip guide", "Resume guide") | Unchanged. "Skip guide" skips the guide, "Skip the lesson" skips the lesson. |
| The title's main button | Play (starts the lesson on a new device, opens New city otherwise; Continue with a saved city) | Unchanged. |
| The advice sheet | City advice | The list inside the Messages sheet was headed "Ipi suggests"; it is "City advice" (`TRAY_TEXT.adviceHead`). "The scroll button" is "the scroll at the top right". The card tag "Ipi suggests" is "Suggested", as the guide's help already said. |
| The first screen | the title screen | "title card" and "the title" in player text became "the title screen". The menu's Home goes there. |
| The map-colour picker | Layers (one layer at a time: "layer") | "overlay" in the key table, the close button, the tip and the legend's name became "layer". |
| Settings sheet | Options | Older release notes said Settings; now Options. |
| Motion | no word | Options has no motion row (the game always moves in full, ruling 1147). How to play no longer names Gentle or Still. The rows that remain in the text files are the test rig's only; no player surface reads them. |
| Fetch | Keep stocked (the 8.3 name) | No player string said Fetch; the 4.7 to 6.0 release notes did. They now say Keep stocked. The 8.3 note, which announces the rename, keeps "Fetch is now Keep stocked". |
| A place to build a home or Large home | plot (never "lot") | "lot" became "plot" in the Large plot's lines. |
| One cell of the map or a footprint | tile (never "square") | Placing messages said "3 of 4 squares are taken"; they say tiles. "Square up" (soldiers) and the iOS Share icon stay. |
| Ranks | Great City, Great Capital (Village, Town, Market town, City, Capital, Seat of the Two Lands) | `MILESTONES` named it "Great city"; it is "Great City" in the data, the goal and the help. |
| Prestige | "prestige", defined where it first stands in the way: the Monuments tab's lock reads "Needs 30 prestige, from finished monuments (you have 20)" | Defined at first sight rather than renamed: the number is on the summary, the score and 28 lines. |
| The map's seed | map number | "Seed 482113" and "Start this seed" are "Map number 482113" and "Start this map". |
| Desirability | pleasantness (the home row, the layer, the tips); "how pleasant the street is" in the score's line | The layer and the need row said Desirability next to "nicer" and "a pleasanter street". |
| The camera's "ghost" | the building you are placing | In the Touch help and the placing help. |
| The lesson's marker | "the marked end of the road" | "(the diamond)" named a shape the card had not shown. |
| The top bar's short date | "Yr 1 Mo 3" | "Y1 M3" was a code. "Year 1, month 3" would not fit a phone's top bar at 150% text. |

## Rulings

- **1835.** One name per thing, the table above. Cost if wrong: a name a player prefers is one string away; the tests name each retired word (`tests/v92/w/words.test.js`).
- **1836.** A What's new heading prints the version and the date only. The build stays on the version line in Options and About. `renderWhatsNew` lost its `stamp` and `read` arguments, which only the hash used. Cost if wrong: none for a player; a later wish for the hash is a one-line argument.
- **1837.** The error card's "Where:" line is in the copied details only. The collapsed details on the card leave it out. Cost if wrong: a bug report from a screenshot lacks it; the copy has it.
- **1838.** The short date is "Yr 1 Mo 3". Cost if wrong: it is two tokens longer than "Y1 M3"; the top bar's mobile budget test covers it.
- **1839.** Map number, pleasantness and the prestige lock line as in the table. Cost if wrong: players who knew "seed" find "map number" once; the link and file formats never change.
- **1840.** The figures typed into sentences are read from the data: the daily goals (`DAILY_POOL.n`, read when the line is asked for), the goals list (`{n}` filled from the need it checks), the burned row's window (`DANGER_MOOD.burnedDays`), "of 50" (`SCORE_TERMS.pleasant`), the plague warning (`PLAGUE.warnDays`), "a quarter of its founding" (`ECONOMY.demolishRefund`). Each has a test that sets the data both ways. Cost if wrong: a text getter that throws on a missing id; the test walks every pool entry.
- **1841.** T13 enumerates the text objects (every export of `src/ui/text.js` and each `*Text.js` the cache list names, through objects and arrays) and fails on any string over 90 characters that no listed exemption covers. Exemptions, each with its reason in the test: tips (their own 20-word budget), How to play bodies and help entries, the picture cards, a celebration's "why" (screen readers only on a phone), the map-layout lines, and two sheet rule paragraphs. A second test fails if an exemption covers nothing. Sentences that functions build are not enumerated; the advice, alert and lesson rows the review named were shortened by hand. Cost if wrong: a long function-built row can still slip in; the review's cited rows were all done.
- **1842.** "Skip the lesson" replaces "I've played before" on the lesson's first card, its confirm button and the title. The 9.1 note and the 7.1.1 and 8.0 notes keep the old label because that was the button then; the docs step rewrites the newest. Cost if wrong: a returning player has to learn a new label for a button they used twice.
- **1843.** Release notes before 9.1 are edited in place for the same words (Fetch, Settings, "the ghost", "title card", "square") and cut where a sentence had stopped being true or a player could not feel it ("60 frames a second", "rebuilds the map layers for nothing", Gentle and Still). The newest entry is untouched.
- **1844.** How to play sentences a player cannot act on were cut: the older-save grace sentences, "homes merged under the old rule", the zoom-out limit's reasoning, "A raid now plays out", the motion levels. "Keep stocked and supply lines" is two entries (Keep stocked; Takes in and supply lines). The leave-the-lesson confirm is one sentence: "Leave the lesson? Your step is kept; the streets you laid are not."

## Tests updated for the new words

Each older test that named a changed string was edited to the new words; the list is in the commit message and in the report. New tests: `tests/v92/w/words.test.js`.

## Left for the second pass

Track D's and Track A's strings (their sections of `src/ui/text.js` were left alone), and the newest release entry's "I've played before".
