# Version 7.1 follow-ups

Carried forward from the track reviews, the bug review of 7.0 and the three fix batches (24 Oct 2026). Nothing below blocks the merge. The design is `specs/2026-10-24-thebes-version-7-1-design.md`, and every decision taken on Josh's behalf is in the rulings list (`notes/handoff-2026-10-11/rulings-so-far.md`, Part 19, rulings 1020 on). The 7.0 items still open are in `notes/2026-10-23-version-7-0-followups.md`; section 3 below carries them on.

## For Josh to check on a real phone
Nothing in 7.1 was tried on a real device; every screen was read in headless Edge at 375x667, 390x844, 667x375, 1280x800 and 1920x1080, at 100% and 150% text, under Gentle motion.
- **Start a few new cities and judge the new maps.** About two new cities in three now come up on a delta, confluence, twin rivers, wide Nile, cataract or lake-fed map, each in its own orientation. Look at how they read on a phone, at each size, on the minimap too; whether the start feels fair and the river feels like a river (ruling 1020 sets the odds, 1021-1025 the shapes). Saved cities keep their own map.
- **Lay a ferry on a wide Nile and watch carts cross.** The Ferry tool is in the Roads tray; one drag over 5 to 12 tiles of water, a road beside each landing and a ferryman each. Check the road tool's "Too wide for a bridge" line and its Show me, the landing's sheet saying why a crossing is not running, and that carts and walkers cross. Under Gentle the boat sits one tile off a bank (ruling 1048), so a full-motion look is also worth one try.
- **The folded How to play.** Every section is a closed 44 px heading that opens with a tap or Enter (the key table, Touch, Goals and Tips included); check Trade, Events, Seasons, Maps and Ferries can be found without a long scroll.
- **The lesson card now holding every key.** With the card up, `]`, M, O, ?, the number keys and the arrows do nothing; Ctrl+Z still undoes (ruling 1060). Check Space, Enter and Esc still dock it, Leave the lesson is always in reach, and focus returns to it after Cancel.
- **Trade's Buy line.** Tap Buy on a good: at Keep at least 0 the amber line says it buys nothing yet; raise it and the normal line returns. Check the step of 50 from 100 up (ruling 1069) feels right on a thumb, and the held-for-the-temple line shows only under Sell.
- **Sound Off wording in Settings.** With Sound off, the Music switch reads "On, silenced" and the volume rows say so in words, not only a dimmer colour; the volume readouts speak to a screen reader.

## What was cut or left
- **Rapids have no animation.** The cataract is a gorge with stone on each bank and a wide stretch round small rocky islands; nothing moves white. Its Maps line no longer says "rapids".
- **No season wash or glints on the new layouts' water** (ruling 1024): the water is drawn the way the oasis pools are, so flood season does not tint it and the glints are missing.
- **The cart is drawn crossing the water in one segment.** The sim's timing is right (3 + ceil(water/3) road tiles, ruling 1044); only the picture jumps.
- **Shops, goals and achievements do not name the ferry, and there is no "first ferry".** The Ferry card, tip and How to play entry exist; the lists that mention buildings were left alone.
- **Raider distance is enforced at 0.25, not 0.4** (ruling 1076): a confluence map at Normal size can put the first entry at 0.35 of the side from the start. A test asserts 0.4 on over 95% of maps; a raid can arrive sooner than on Classic on the rest.
- **Confluence runs north to south only, and so does twin from Normal size up** (the spec said any edge); the trade road always enters from the south edge (ruling 1021).
- **Old "auto" seeds map differently** (ruling 1020, stated): only fresh cities on "auto" change. The overview shots fix the zoom on the camera because the game no longer lets the view zoom below 0.5.
- **The wide Nile cannot be bridged** (ruling 1027): its far bank's farmland is reached only by ferry.

### Minors the reviewers raised that nobody fixed
- **The waiting event's Advice weight** (the logic review's minor; ruling 996 stands): in a grown city the event item ranks below the home-need items and never reaches the Advice sheet's top five. Its alert row with View always shows it.
- **The Keyboard paragraph in How to play still repeats the key list** that the key table also shows (fix batch B left it, because it lives in batch A's part of `text.js`); both sections are closed by default now.
- **The Map button's M and the other aria-keyshortcuts** are set from `createUI.js`, not `corners.js` (batch B: `corners.js` was not in its files).
- **The Keep at least row can say "its switches are Off" where no open route lists the good at all** (`placesFor` returns nothing for both): low risk, since a good no route lists is probably not shown.
- **The default line on the event card sits 5 px short in the test shell at 375x667 and 150% text** (ruling 1065); the test asserts it starts in view with 24 px under it. Fully visible on the real page and on desktop, but worth a look on a real phone.
- **A player's own re-pause of a struck building** is kept (the `owned` list, ruling 1062), but it only fires when Pause is pressed on an already-paused struck building, so it may rarely trigger in play; harmless either way.
- **The `byKeyboard` listeners register once per page** through a `globalThis` flag; fine in a browser, but a fresh document in a later test rig would not get them.
- **Two batch B tests step with click events, not real key events** (the Keep at least step, the volume focus handoff); the logic is the same.
- **Two small test wordings**: the cataract "wide" test's title hardcodes "6 or more" while the code reads the data; the v50 Show me route test no longer covers the water case (`tests/v71/f/ui.test.js` does).
- **One line outside batch C's file list**: `world.js` `removeBuilding` bumps roadVersion for a landing (ruling 1074); a reviewer accepted it.
- **The Opet "smaller" festival, the lesson's Space with single keys off and the season line's soft ink** are 7.0 accepted minors and unchanged.

Dropped as not real or not reproduced: the two-row top bar overlap with the alert row (the bar measured 72.8 px at 375x667 and 150%, no overlap), the compact 667x375 Show me below the fold (no refusal reachable there), the Ground legend folding while placing, the placing bar over the tray at 1280x800 at 150%, and the Quay Advice item (a roadless Quay already raises the no-road alert). These four were open in 7.0's list; section 3 keeps them for a real device.

## 7.0 follow-ups still open (carried forward)
- **Real-phone checks from 7.0** are still undone: the Trade sheet one-handed, an event card read and answered, night, the Music and Effects volumes, the Quay on a real river, Delete and Backspace on a real keyboard, the farm reason line at 150% text on the smallest phone, and house plots at every zoom including the Huge map's floor.
- **Deferred in the 7.0 final review and not touched in 7.1:** the Ground legend card could fold while placing at 125% text and above; compact 667x375 Show me sits below the placing drawer's fold; a two-row top bar may overlap the alert row by 4 px (`--topbar-h` assumes 49 px); the placing bar covers the tray and half of Layers at 1280x800 at 150% text; picture cards opened from How to play also close How to play; the event card scrolls at 375x667 at 150% text and at 667x375 (ruling 997).
- **Closed by 7.1:** the Trade sheet's Keep at least help ignoring route switches and the held line under Buy and Ignore; the event default line below the fold; number keys changing the category while a sheet is open on a wide screen; focus not moving into a sheet; missing aria-keyshortcuts on the zoom buttons, M and ?; the Keep at least step of 10; the road fix's bare "here" (the tower step now says "the spot Show me marks", though there is still no lasting render marker).
- **Accepted minors from 7.0** stay as they were: three pick-path ghost tests that pass with or without the fix, the farm-warn ghost under the Paused badge, the Opet "smaller" festival, wall-clock tests that can flake on a loaded machine (the stage 2 placement preview ran 22.3 ms against 20 ms under load in batch C; it passed alone), the `v70-trade` dev scene's Large plots card, the synthetic v9 fixture.
- **Balance, carried:** `setLegacyTowers` is still kept for the grand and great-work runs (ruling 978); the village and capital runs have no events (ruling 975); the great-work run's grand years keep the hold on events in the dangers-on runs (ruling 976). The open question stands: dangers on at the Seat, where the seed-5 win needs the player's habits and seed 10 only wins with them. The balance runs use the 7.0 six layouts, which draw as before; the new layouts are checked for playability (one connected piece of land for the start, the trade road and the raiders, the resources on it, a Quay site, water under 22%), not for pace.
- **Store plan** (after 7.1, not started) is unchanged: Steam via Electron (Windows first), Google Play via Capacitor, a paid one-off price on the stores, the web version staying free. Ruling 850 keeps the game free of anything that needs the network after load.

## 6.1 carry-overs, still agreed
- **"Skip, I've played before" on the lesson.** Josh's call after the 23 Oct playtest; it contradicts ruling 617 (the lesson is mandatory once per device for a player with no saved city), so 6.1 must reverse that ruling and say so.
- **The Huge map on a mid-range phone is untested** (about 29 ms a frame at its zoom floor in headless 1920x1080, carried from 6.0). Nobody has measured a real tablet or phone, and the new layouts are not timed on it either.

## Process lessons
- **A review that drives the live build in a browser found what the tracks missed.** The fever card's thrown error and the lesson card letting keys through did not show in screenshots; both came from probing the page and reading the sim.
- **Words against the sim stayed the rule that finds most.** The paid choices that spared nothing, the strike line that pointed at a choice already gone, and Buy at 0 that read as active were all words saying more than the sim did.
- **A sweep at every size found what the first run missed.** Seed 185 on a Small map merged a delta's two arms into one wide mouth; the fix batch found it by sweeping every seed and size.
- **One full suite at a time**, and every batch that needs the full run is better batched; one timing test failed once under load and passed alone.

- From the final fix batch: a walker on a ferry glides across the water in one step, so it moves faster there than the crossing time the sim uses (cosmetic, like the cart).

## 7.1.1
- **Done:** the lesson card and the placement toast no longer meet (no timed toast while a card is up, the card waits for a stroke or a finger on the map, every Undo toast has a ✕, the step's own placement offers no Undo); action rows, dialogs and the picture cards' Back and Next are centred; the goal sentence is on the title card, the first lesson card and How to play; "Skip, I've played before" is on the title card and the first lesson card (ruling 1111 overrides 617). Rulings 1100 to 1114 are in Part 20.
- **Left:** Back is Continue at the foot of What's new and the install guide only (ruling 1106); if Josh wants more, it is a one-line change per button. The step the friend called "Lesson 11" is the firehouse card (the large plot is Lesson 10). A kept toast (Update ready) is hidden, not moved, while a card is up. The title card has two more rows (the goal, Skip); it was measured to fit 375x667 at 150% text and 667x375 at 100% and 150% (at 667x375 Start and Skip share a row and the size line goes). Real-phone check of the skip, the dialog and the ✕ is still undone.
