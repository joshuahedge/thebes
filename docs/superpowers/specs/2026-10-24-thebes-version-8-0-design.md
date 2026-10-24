# Thebes 8.0 "The vizier": design draft (for Josh's approval)

**Josh's calls (24 Oct):**
- Drag to build builds at once on release (with the short Undo).
- Always full motion for everyone. The Motion row goes, and the game no longer follows the phone's Reduce motion. The test rig may keep its forced Gentle mode internally.
- Delete "Bring a city from Safari" entirely.
- He asked whether the visual design (the colour elements) is part of this; see section 8.

Source: a friend's longer playtest notes (24 Oct 2026), relayed by Josh, who asked to "consider and further refine across the broader game". Each note is read as a symptom of a wider rule. Section 1 states the rules; sections 2 to 7 apply them across the game. Everything marked **Josh** is a call for him to make.

## 1. The rules behind the notes

1. **Every screen has one obvious next action.** One primary button, short (one or two words, Minecraft-style: "Play", "Options", "Build"). Everything else is quieter: secondary is outlined, and tertiary is a plain text link or sits in a menu. Colour and weight belong to the primary action only.
2. **The game teaches why, not just what.** Every instruction carries its reason ("Roads carry people and goods; nothing works without one"). A trusted advisor says it, not a manual.
3. **Nothing interrupts unless it must.** Messages time out on their own and collect in a tray the player can open. Only decisions stop the game.
4. **Show less, reveal more as the city grows.** Choices unlock in layers, and the advisor points at the next useful one.
5. **One visual language.** The patterned band, linen and colour weighting repeat on every panel, so the whole game feels made by one hand. Red means "no" and nothing else.
6. **The player sees what they are doing.** What is selected, what will be built and what it reaches are always clear before the tap.

## 2. Story and advisor (notes: the aim means nothing; Clippy-like advisor; why they are doing it)

- **The frame.** Pharaoh has named you his vizier and sent you to a small village at Thebes on the Nile. Make it a city worthy of his court, so that he names it the Seat of the Two Lands, the capital of all Egypt. Crown your service with the great temple of Amun. This replaces the bare goal sentence from 7.1.1 everywhere it shows. The rank names and the great-temple win stay exactly as the sim has them; only the telling changes.
- **The advisor.** Pharaoh's scribe goes with you. Default name **Ipi** (**Josh**: name and whether male or female). The scribe has a small drawn portrait and one voice: warm, brief, never more than two short sentences at a time.
- **Where the scribe speaks:**
  - the tutorial;
  - the first time something new appears (replacing today's "first" tips);
  - Advice, renamed "Ipi suggests" and kept in the scribe's voice;
  - rank-ups ("Pharaoh has heard of Thebes...").
- **AI.** The friend wrote that AI can be good at suggesting. The game is an offline web app with no server, so a live AI model would need a paid server, a key and a network on every turn. **Recommendation:** the scribe's suggestions come from the existing Advice engine, which already ranks the city's real needs and never suggests what the game would refuse. It reads as an assistant without needing one. (**Josh**: agree?)

## 3. The tutorial (notes: steps with why, feedback per step, Leave less prominent, the glow on the build option, focus stuck on the bazaar, seamless hand-over)

- **Chapters and micro-steps.** The tutorial's 14 steps become about 5 short chapters: Roads and homes, Water and food, Work and trade, Fire and growth, and Defence. Each chapter has 2 to 4 micro-steps. Every micro-step has a *why* line and a *do* line. For example:
  - "Every building needs a road: it is how people and goods move. *Lay a road from the village gate west to the green land.*"
  - "The green land floods each year; farms there feed the city. *Place a farm on it, touching the road.*"
- **The card and the bubble.** A chapter opens with the paused card in the middle of the screen (7.0's card, kept for the big moments). Micro-steps inside a chapter use a speech bubble from the scribe, docked at the bottom, which does not pause the game. Fewer full stops, still clear.
- **Feedback after every step.** A one-line reaction from the scribe that names the result ("The road reaches the fields: carts can bring grain now."). It comes with a small glow on what was built and a soft sound, and fades by itself after 2 to 3 seconds.
- **The same glow everywhere.** The tray card and the category button the step needs pulse with the same ring the map uses. One language for "here".
- **Leave the lesson** moves out of the card into the menu (☰). "I've played before" stays on the title screen.
- **The camera follows the step.** Bug: during the tower step the focus stayed on the bazaar, because the fire and raid steps aim at the bazaar and the tower step does not move the view or the pulse ring away. Every step's view and ring will be set from that step's own target.
- **No end-of-lesson stop.** The tutorial city *is* your city. The last step is the scribe handing over ("From here, Thebes is yours. I will keep an eye out.") and opening the first real goal. The title's main button becomes "Continue".

## 4. Building and placing (notes: drag from the build menu, what is selected, single house, Straight vs Enter, granary range red, "paint", undo too far)

- **Drag to build.** Press a tray card and drag it onto the map: the building follows the finger, shows its fit square by square (7.0), and on release:
  - **Recommended:** it builds at once if it fits and is affordable, with the short Undo.
  - Alternative: it waits as a ghost for ✓.
  - **Josh** picks.
  - Tap-to-select still works, so nothing is lost for players who tap.
  - Roads and plots: drag the card onto the map, then keep dragging to draw the line or the rectangle.
- **Always clear what is selected:**
  - The placing bar leads with the building's icon and name, large ("Well").
  - The ghost carries a small label.
  - The tray card stays lit while it is selected.
  - Picking a different item flashes the bar, so a well can no longer be mistaken for a house.
- **A single house plot.** The friend found that placing one house "seems like it doesn't work". To be reproduced: today a tap may only start a rectangle, or leave the plot waiting for ✓ with no sign. Fix: a tap places one plot, the same as a 1x1 drag.
- **One primary in every bar.**
  - ✓ (build) is the only filled, coloured button.
  - Flip/Straight, Undo and Cancel become neutral icons.
  - Today Straight outweighs ✓, which invites the wrong tap.
  - Every bar and dialog gets the same audit.
- **Colours mean one thing:**
  - Reach and range (granary, well, bazaar, tower) are drawn in teal/blue as "covered".
  - Amber is "works, but something is missing".
  - Coral/red is only "cannot".
  - Every overlay is audited.
- **Words.** "Paint" becomes "place" (plots) or "lay" (roads) everywhere, and every verb on screen is audited. Labels are shortened to the rule-1 length.
- **Undo is a safety net, not a time machine.**
  - Undo covers only your last action, and only until the next month starts.
  - It can never walk back through earlier progress.
  - Ctrl+Z follows the same rule.

## 5. Messages and progressive disclosure (notes: notifications tray, layers of actions)

- **The notification tray.**
  - Every message (placed, goal done, caravan, rank, warnings) shows for about 4 seconds, then folds into a tray behind the existing top-right scroll icon, with a count. The tray is a list of the last 30, newest first; each opens its place on the map.
  - Raids, fires and events that need a decision stay pinned in the tray until they are dealt with.
  - No new top-bar button (the 7.0 rule).
- **Layers in the build tray.**
  - Each category first shows the 3 to 5 things that matter at your rank, with "More" for the rest.
  - Locked items do not show until unlocked; unlocking is a scribe moment.
  - The scribe's top suggestion glows in the tray.

## 6. Menus and settings (notes: version, settings size, motion, difficulty, import)

- **Title screen.**
  - **Continue** (or **Play** the first time) is the primary.
  - "I've played before", **Options** and **What's new** follow.
  - No version number: it moves to the foot of Options and to What's new.
- **New city.** Difficulty is the one big choice: 3 or 4 large tiles, each with one line on what it means. Map size and layout sit under "More choices", and both default to a seeded "Surprise me".
- **Options.**
  - Rows are smaller and grouped: Sound (Music, Effects), Display (Text size, Day and night), Controls (Single keys), Saves.
  - **Motion.** The Motion row goes; the game moves by default. **Recommendation:** still honour the phone's own "Reduce motion" accessibility setting silently. Some players get motion-sick, and the friend's note was about the choice cluttering the menu, not about those players. (**Josh**: honour the phone's setting, or always full motion?)
  - **Import.** "Bring a city from Safari" exists because on an iPhone, Safari and the installed app keep separate saves. **Recommendation:** remove it from the title and keep a quiet "Move a city" under Options > Saves. The alternative is to delete it, which strands any city started in Safari. (**Josh**.)

## 7. Sound and look (notes: music variants, C418, human touches, thicker pattern, colour theme)

- **Music in the C418 way:**
  - 6 to 8 short pieces, 1.5 to 3 minutes each, soft and low.
  - Instruments: harp, low flute, warm pad and a little piano-like pluck in a lower register.
  - Long silences of 1 to 4 minutes between pieces, so the city's own sounds carry the gaps.
  - Never the same piece twice in a row.
  - The high pluck becomes a rare accent, not a loop.
  - Each piece is played with seeded variations, so it never sounds identical twice.
  - The danger tune is kept, softened.
- **The design language:**
  - The patterned band above the linen thickens to about 1.5x, with stronger colour weighting.
  - The band becomes the frame of every panel, card, dialog, sheet header and the tray, so the title card's look runs through the whole game.
  - Cartouche-style headers and one corner ornament.
  - The same teal / ochre / coral weighting on every button state (rule 1).
  - The scribe's portrait and speech bubble share the frame.

## 8. Order, size and usage

The week's usage stands at 88% of 99%; it resets Sunday 25 Oct at about 20:00.
- **8.0 "Clear and calm"** (this week; Josh, 24 Oct: "build 8.0a now and push it when it's tested", with the visual style moved in):
  - rules 1, 3, 5 and 6;
  - section 4 except drag;
  - the notification tray (section 5);
  - section 6;
  - **the design language from section 7**;
  - the cheap tutorial fixes from section 3: the same glow on the tray card, Leave the lesson into the menu, and the camera following the step;
  - the bugs: single house, the bazaar focus, Straight vs ✓, granary red, "paint", undo limit.
- **8.1 "The vizier"** (after the reset): the story, the scribe, the tutorial rewrite into chapters with feedback beats, drag-to-build, and the layered tray with the scribe's suggestions.
- **8.2 "Song of the Nile"** (after the reset): the music.

Each ships and pushes on its own once Josh says go.
