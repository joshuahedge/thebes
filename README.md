# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Requirements

Python 3 on your PATH, and Microsoft Edge for the command-line tests.

## Run it locally

    python tests/serve.py 8000 .

Then open http://localhost:8000/.

## Play it

    python tests/serve.py 8000 .

Then open http://localhost:8000/. The title card shows a sample city with a finished small obelisk, a colossus going up and a palace; **New city** starts a fresh one, paused, with 2,000 gold and a road in from the edge. The first time, six picture cards come first (roads, homes, fertile land, food and workers, the goals, and what lies ahead); **How to play** on the title card, or **Show the picture cards** at the top of How to play in the menu, shows them again. The goals strip under the top bar says what to do next, and **Show me** opens the right card and points at the place.

**Learning as you go.** A new city starts with a guided start: the goal under the top bar marks the card it needs with **Suggested** and rings the spot on the map, and every step also works while paused. **Skip guide** turns it off; **Resume guide** in How to play brings it back. Goals keep coming after the opening (homes to grow, people to reach), first-time troubles become goals, and a home's sheet says why it is not growing, with **Show me** or **View**. Small captions celebrate firsts, goals and Town; one-time tips appear on their first trigger; if you sit idle, Show me glows and then one "Next:" line appears. Once the opening is done, three small **daily goals** arrive each day (no streaks; one free swap), and the city summary lists **achievements**. The **Help** setting chooses Guide and tips, Tips only, or Off.

**The economy (Stage 2).** From Town (150 people) the city grows past House: Townhouses want pottery, and four Townhouses or empty plots in a square on a pleasant street join into a Manor, then a Fine manor (beer and two foods), a Villa (linen) and an Estate (jewellery). Each good has a chain: a clay pit, barley farm, flax farm or gem mine fills a **storehouse**, a workshop next to it turns the raw good into pottery, beer, linen or jewellery, and bazaars sell everything homes use. A storehouse's sheet lets you accept or refuse each good. **Desirability** decides which streets can hold the big homes: gardens, statues, temples and booths make a street nicer, workshops and storage make it worse; placing a building tints the ground it would change and the confirm bar says how many homes it makes nicer or less pleasant, and a home's sheet shows its score and the three biggest causes. The **booth** brings entertainment. At Market town a **trading post** opens trade with Memphis (and Byblos at Great city): for each good choose buy, sell or ignore and a level to keep, and a caravan comes every three months. Milestones run up to Capital (1,000 people); new build cards wear a "New" badge, and the next milestone's cards show greyed with when they unlock. Overlays add goods, entertainment and desirability. **Difficulty** (Peaceful, Relaxed, Normal, Hard, chosen under New city) changes what buildings, roads and trade routes cost, and from Stage 3 how fast fire risk builds and how big raids are.

**Danger (Stage 3).** From Town, buildings slowly build fire risk; a **firehouse** (from Village) whose staff reach a building by road keeps the risk low and puts out a small blaze within a day or two. A blaze no staffed firehouse reaches grows into a fire that burns for 10-15 days and can spread to the buildings beside it (roads are firebreaks); a burned home leaves empty plots that refill, anything else leaves rubble to clear. The **fire risk** overlay and a row on every building's sheet show what is at risk and why. Once the city has had 250 people, **raiders** come every few years: a banner warns three months ahead, names their direction and what they are after, and counts down. At Market town you can draw **walls** (a wall over a road is a gate), build **towers** that shoot at raiders within 4 tiles and a **barracks** that trains soldiers, or pay **tribute**: the sheet shows the price beside what the towers to beat them would cost (the very first raid cannot be bought off). Raiders break through walls, set fire to what they reach and steal a little gold; afterwards a short report says what your defences stopped. Combat is automatic. A temple can **hold a festival** to lift the mood. **Peaceful** has no raids and slower fire risk. Only one critical banner shows at a time (a raid under way, then a fire no firehouse reaches, then a raid warning, then debt), and the game pauses for the first fire and the first raid warning.

**On a phone** at most two rows sit under the top bar: the alert (one line; a raid warning is its countdown, and tapping it opens the raid sheet) and one guidance row that the overlay legend, a tip, a caption and the goal take in turn. Captions missed in a busy moment are listed under Recent in the Goals sheet. `tools/shots.ps1 -Mobile` takes and measures the busy moments, and `tests/ui/mobileBudget.test.js` holds the height budget.

**Score and records.** The city summary scores the city out of 100 on People, Prosperity, Culture and Safety, each with the main reason, and gives a medal (bronze, silver, gold) with the points to the next. Milestone times are compared with your best on the same map and difficulty. **Seal this reign** writes the score into the chronicle on this device (the title card lists your best cities and a stamp for each sealed reign) and the city carries on. **This week's Nile** on the title card is the same map for everyone this week; **Share score** makes a link (friends' honour: a link cannot be checked) and a picture, and **Screenshot mode** in the menu hides the interface until you tap. Records travel with Export.

**Monuments (Stage 4).** From City the Monuments tab holds the **builders' guild**, the **quarry** (on rocky ground) and the **brickworks**, and the monuments: the small and large obelisks at City, the colossus and the small mastaba at Great city, the large mastaba at Capital, and the small and great pyramids once the city's prestige reaches 100 and 300. Place a monument anywhere but the fields (⟳ or R turns a mastaba) and give it a road: each working guild within 12 road tiles sends a crew to the nearest site with room, and quarries and brickworks send stone and bricks to the sites in their reach (a storehouse bridges the gap, and Memphis sells stone from City). It rises course by course while the game runs (at 1× a month is 30 seconds, so a small obelisk takes a minute and a half and the great pyramid about 90 minutes, 30 at 3×); its founding is paid when it is placed and the crews' work as it is done (6.5 gold for each unit laid, 130 a crew a month), never taking the treasury below 0, and a quarry, brickworks or guild that no site needs idles with no wages. A site that stops says why, on the map, in the alert list and on its sheet, with the fix. To build your first: put up a builders' guild and a quarry (on rocky ground) near where it will stand, pick the small obelisk, and read the chips on the confirm bar: each says what the spot has (dry ground, a road, a crew, stone near) or what it still lacks; tap ✓ and play. Tap a site to see its course, crews, materials and pace. A mastaba also wants bricks: a brickworks with a clay pit and a storehouse. **Prestige** (one monument of each kind counts) lifts mood, unlocks the pyramids and is the score's fifth part, Monuments; medals are at 200, 300 and 400 of 500, and shared links from before Stage 4 open as older scoring. The **palace** (from Town) is enlarged through five styles from its sheet. **Plazas** and **sphinxes** make grand approaches, festivals walk the roads in procession, and a finished monument gets a dedication procession. Problem markers stand on their buildings.

**Ambient life and motion.** The river glints, reeds and palms sway, kilns smoke, and now and then a bird or a boat passes. Settings → **Motion** offers Follow the device (the start), Full, Gentle and Still. Full moves everything, the camera glides included; Gentle keeps people, sleds and processions walking while water and smoke fade in place, with nothing swaying, drifting or pulsing and camera moves as cuts; Still moves only people, sleds and processions. Following the device means Gentle on a phone or computer set to reduce motion, and Full otherwise.

**Saving.** The game saves on its own at the end of every game month and whenever you leave the page, keeping the previous save as a backup. Come back and **Continue** opens the Welcome back card: how long you were away, what moved, open goals and alerts; **Carry on** restores your speed. A warning banner appears if saving stops working (private browsing, full storage): export your city from the menu.

**Export and import.** Menu → **Export city** shares a `thebes-city-<date>.json` file (or downloads it); **Import city** loads one. Starting a new city offers to export first.

**Install.** On an iPhone the game shows how to add it to the home screen (Share → Add to Home Screen) before you build anything, because the installed app keeps its own storage; if you built in Safari first, export there and **Bring a city from Safari** in the installed app. Android and desktop Chrome or Edge offer **Install** on the title card and in the menu. Installed, it works offline; when a new version is ready, a toast offers **Restart**. Chat apps' built-in browsers cannot install or keep saves: open the link in Safari or Chrome.

**Sound and vibration** are off by default: **Play with sound** on the title card or the Settings sheet turns them on. **Music**, made in the browser as it plays, is on at volume 30 and has its own switch and volume in Settings; **Play muted** turns it off too. The iPhone silent switch is respected.

Add `?seed=7` for another map, `?sample=1` for a small ready-made city with its monuments and palace (seeds 4, 7 and 19 starve; seed 11, the title card's, grows into a Great city), `?stress=1` for a full 64×64 city with three monument sites, or `?speed=1` to start running.

Keys: Space pauses, + and − change the speed, 1–7 pick a build category, arrows or WASD move the view, M opens the minimap, O cycles the overlays, Enter confirms, Esc goes back one step (it also closes an open tray), Ctrl+Z (Cmd+Z) undoes, ? lists the shortcuts. With a mouse: drag to pan, wheel to zoom, click to place. On a phone: one finger pans, two fingers zoom, tap to select or to move the ghost, then ✓.

To try it on a phone on the same network: `python tests/serve.py 8000 . "" 0.0.0.0`, then open `http://<this computer's address>:8000/` on the phone (saving and installing need HTTPS or localhost, so the phone can play but not install from here).

`tests/screenshot.ps1 -Url '/?skipTitle=1&seed=1&sample=1' -Out shot.png -Width 390 -Height 844` saves a PNG of the page from headless Edge at that size.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

The script starts `tests/serve.py` and headless Edge. The test page sends its results back to the server by POST (to `/__results`), and the script waits for them on the real clock for up to 45 seconds (`-WaitSeconds 120` for a busy machine), retrying once if they never arrive. It exits 0 only when the output ends with `ALL PASSED`.

Add `-Grep "reach"` to run only tests whose full name contains that text. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Tools

`tools/render-assets.ps1` redraws the app icons and `og-image.png` with the art code (commit the PNGs). `tools/shots.ps1 -Tag <name>` takes the before/after screen set at four sizes (`-Stage2` for the Stage 2 scenes, `-Stage3` for the Stage 3 ones: the Peaceful choice, a fire, a raid warning with tribute, a battle at the walls, the score and ambient water; `-Stage4` for the nine Stage 4 scenes under Full and Gentle motion: the title, the picture cards, a pyramid site, a course going up, the capstone, a procession, the palace, a site sheet and the Motion row; all set up by `window.__thebes.devScene`) and `python tools/contact.py <raw dir> <out dir> <prefix> <before tag> <after tag> [--stage2|--stage3|--stage4]` builds contact sheets from it. `tools/tutorial.ps1` makes the picture cards' pictures again from the dev scenes (`assets/tutorial/`, WebP, with the marks' places in `cards.json`); run it whenever the art or the interface's look changes, then `tools/sw-files.ps1`. `tools/sw-files.ps1` rewrites `sw-files.js`, the list of files the offline cache holds, with a build stamp; run it after adding or changing files, before a publish (the test suite fails when it is stale).

For development, `?skipTitle=1` starts a fresh city without the title card, `?welcome=1` starts a sample city behind the Welcome back card, and `?nosw=1` drops the offline cache so edits show without a restart. Neither of the first two writes anything at once, but the next autosave replaces the saved city, so use them on a scratch browser profile.

## Publishing

The site is plain files: GitHub Pages serves `main` from the repository root at `https://joshuahedge.github.io/thebes/`. Every path in the page is relative so it works under that `/thebes/` folder; `.nojekyll` keeps Pages from processing the files.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
