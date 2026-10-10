# Phone-first and cozy builders: reference notes for Thebes

Scope: phone UX, short sessions and onboarding in Townscaper, Pocket City 1 and 2, Islanders (plus New Shores and Mobile), SimCity BuildIt, Mini Metro and Mini Motorways, Dorfromantik, Kingdom New Lands and Two Crowns, and The Battle of Polytopia, with short notes on 14 more games.
Date: researched and written 11 Oct 2026. Every source was read on that date.
Method: web search, plus page fetches of reviews, developer interviews, store listings, wikis and forum threads. TouchArcade, Destructoid and AppUnwrapper blocked direct fetching, so their points come from search-result excerpts and are tagged "(excerpt)".
Caveats: I did not play these games for this note. Anything taken from my own memory of a game is tagged UNVERIFIED. Prices, ratings and features change, and many reviews describe launch versions.
How to read: each game has six parts (visuals, phone UX, design, teaching, reception, For Thebes). The cross-game patterns, the dark-pattern list and the sources come at the end.

---

## 1. Townscaper (Oskar Stålberg / Raw Fury; PC early access 2020, PC/Switch 1.0 Aug 2021, iOS/Android 20 Oct 2021)

**Visuals.** The palette is muted and illustrative (Pocket Tactics). Coloured blocks sit on an irregular, distorted grid in an endless sea, and procedural rules turn them into houses, arches, stairs, gardens and bridges (Wikipedia). Outlines are tuned to stay crisp at any distance (Game Developer), which is why the towns still read on a phone when zoomed out. Small details such as windows, chimneys, bushes and benches appear a beat after you place a block, and bigger structures take longer to finish (Game Developer). That staggered "settling" is the game's only celebration. Birds and butterflies react to the shapes you build. Every tap gets a pop and a click (TouchArcade, excerpt), the haptics are well judged (TapSmart, excerpt), and on console each palette colour makes its own sound (Electron Dance, excerpt).

**Phone UX.** Tap to place a block, and press and hold for a second or two to remove one. Pinch zooms, one finger rotates and two fingers pan (AppUnwrapper, excerpt). A colour picker sits on the edge of the screen, and you choose the colour before you place (AppUnwrapper, excerpt). Undo and redo live in the menu, and the history goes all the way back to the start (TapSmart, excerpt; Android Police). The game works in portrait and landscape with legible text (Android Police), and reviewers praised it for one-handed play (AppUnwrapper, excerpt). There is no drag-to-paint: one tap per block sets the pace (Electron Dance, excerpt). There was no iCloud sync at launch, only export and import. It costs $4.99 with no ads and no in-app purchases (Android Police).

**Design.** There are no goals and no story. Stålberg calls it "more of a toy" (Wikipedia). He priced it low because he expected people to play for 40 to 60 minutes (Game Developer). Hidden structures appear when you discover the right arrangement of blocks. There are 10 achievements, and every one is a first or a discovery: a garden, a lighthouse, a spire, a sculpture, a hook shape, a church door, a floating town, 100 blocks and 1,000 blocks. One estimate puts the whole set at about 10 minutes, or over an hour if Propelled is stubborn (TrueAchievements; PureXbox).

**How it teaches.** It doesn't teach at all. You open on water and sky. Tapping the water makes a foundation, and tapping a foundation makes a building (iPhone Mania, in Japanese). This works because there is one verb and no failure state. When the rules can't fit a shape, the game quietly ignores it and shows no error (Game Developer).

**Reception.** PC scored 86 on Metacritic and Switch scored 63 (Wikipedia). TouchArcade gave it 4.5/5 and PC Gamer 80. Pocket Tactics gave it 8/10, saying "your goal is simply to build something beautiful". The criticisms: the algorithm can feel limiting (TapSmart, excerpt), there is almost no music by design (TouchArcade, excerpt), and some players find it too slight (Nintendo Life comments, via search).

**For Thebes.**
- *Borrow:* a soft sound plus a light haptic on every successful placement, followed by a short "settling" animation (details popping in over a few hundred ms). It is cheap and calm, it works on a phone, and Townscaper shows that it can be the whole reward.
- *Borrow:* refuse impossible placements quietly in the ghost (red tint, no pop-up), the way Townscaper ignores failed shapes.
- *Adapt:* a short undo (the last placement or two, with a full refund while paused or within the same game day). Townscaper and Tiny Glade show that undo takes the fear out of building. Thebes has an economy, so cap it.
- *Adapt:* make achievements "firsts you discover" (first garden, first temple, first two-storey house). Townscaper's 10-item list is a good size to copy.
- *Skip:* the no-goals toy framing. Thebes has an economy and needs goals.

---

## 2. Pocket City (Codebrew Games, 2018) and Pocket City 2 (announced 2020, released April 2023)

Note: the brief says Pocket City 2 came out in 2022. The sources say it was announced in autumn 2020 and released in April 2023 (TouchArcade review dated 18 Apr 2023). A 2022 date does appear, but it is the original game's Windows/Mac release.

**Visuals.** Cute and colourful, and buildings can be recognised at a glance (iMore). The original looks fuzzy when you zoom in (iMore). Pocket City 2 is fully 3D and lets you zoom down to street level with a mayor avatar. It looks good at every zoom level apart from some flickering shadows, and its icons are better than the original's. However, some elements rely only on solid colour, and there is no colourblind mode (TouchArcade, excerpt).

**Phone UX (Pocket City 1).** Tap Build in the bottom toolbar, pick a category (Resources, Services, Leisure, Road, Zones), pick an item, then drag your finger across the map. Roads and zones can be dragged out as clusters (iMore). iMore's complaints:
- The camera does not pan while you drag, so long roads mean stopping to move the camera. iMore wrote "I think the developers should make it so that the view pans around automatically."
- The build menu goes back to the start every time instead of remembering where you were.
- Portrait mode is awkward in places.

PocketGamer also found roads and zoning fiddly and wanted an undo. Portrait and landscape switch in the menu in the first game, and on the fly in the second. A three-bar demand gauge (residential, commercial, industrial) sits top right, and a four-squares icon opens overlays (zones, health, fire, crime, traffic, environment). Buildings without power or water go dark and show a red bolt or droplet (LevelWinner). Tapping a power plant shows its reach (Android Police).

**Design.** An XP and level ladder unlocks buildings (in Pocket City 2 the bus depot comes at level 12, the hospital at 13 and public works at 27; LevelWinner). XP comes from building (40 XP per square in Pocket City 2), events and quests (Android Police). Residents give quests, shown on the map as a scroll with a question mark, which you accept or decline for cash and XP. Disasters can be switched off, and a single "Rebuild Everything" button repairs damage for a fee (TouchArcade, excerpt). There is a sandbox mode. Both games are premium, with "no microtransactions or annoying timers" (TouchArcade preview, excerpt). Pocket City 2 adds quest-giver relationships with gifts, research, minigames, and quests you must finish on foot in free roam.

**How it teaches.** The first game has a brief tutorial and then leaves you free (PocketGamer). In Pocket City 2 your first city is a fixed Tutorial City that lasts several levels. You can switch tutorials off when you start later cities, and Easy is recommended for new players (LevelWinner). Quests carry on the teaching after the tutorial ends.

**Reception.** TouchArcade gave the first game 5 stars and the second 5 stars ("Essential", plus Game of the Week). PocketGamer called it polished, compulsive and free of free-to-play friction, with "just five more minutes" appeal. Its main gripes were the controls and the missing undo. Destructoid said it lacks staying power: the map fills before level 50 and quests run out near level 70 (excerpt). iMore noted there is no finish line beyond clearing the quests.

**For Thebes.**
- *Borrow:* remember the last category and card when the build dock reopens. This is iMore's complaint, it is a small fix, and it saves taps every session.
- *Borrow:* auto-pan the camera when a drag (road or plot painting) gets near the screen edge. iMore asked for exactly this.
- *Borrow:* the "tutorial city is a real city" idea. The guided first ten minutes should leave the player with a real save, not a practice map to throw away. Add a "Show tips" toggle when starting later cities.
- *Borrow:* buildings that dim and show one small icon for the missing thing (water, food). It reads at phone zoom without opening a sheet.
- *Adapt:* goals given by a named person with a face (a scribe or priest), still in plain text.
- *Adapt:* a switch that turns risk systems (fire, collapse) off for calm players, as Pocket City does for disasters. This is a later stage.
- *Skip:* XP per tile built. Guides suggest building cheap dirt roads to top up XP, which shows the rule rewards spam building.
- *Skip:* the avatar and free roam.

---

## 3. Islanders (Grizzly Games, Apr 2019), Islanders: New Shores (The Station / Coatsink, Jul 2025), Islanders: Mobile (Coatsink, 9 Nov 2025)

**Visuals.** Low-poly and bright, with a calm soundtrack. New Shores has sharper, "dreamlike" colours, and buildings gain visual variants as you place more of the same kind (TheSixthAxis). New Shores' zoom is hit and miss: on tall islands, low buildings are hard to see (TheSixthAxis).

**Phone UX (Mobile).** It costs $4.99 with no in-app purchases, works offline, and has Game Center achievements. It is touch only, with no controller support (App Store). Points sit in the lower left, building options run along the bottom, and the sandbox settings icon is in the lower right. While you place a building, a blue circle shows which neighbours it affects (PocketGamer). A detailed App Store review raised three complaints:
- choosing a building takes two taps (one to view its info, one to start placing)
- tapping to rotate is slow
- it is easy to deselect a building or place it by accident

That reviewer suggested dragging straight from the bar and rotating with a swipe, and also reported slow performance (App Store review themes).

**Design.** Each round you pick one of two building packs and place the buildings one at a time. Each building scores plus or minus points depending on its neighbours, and you see the score before you commit (Wikipedia). For example, a mansion gains points near a city centre and loses them near a circus (PocketGamer). Hitting the score target gives you more buildings and the option to move to a new island. A run ends when you can no longer score. The developers aim for short, healthy sessions. Co-founder Friedemann Allmenröder: "Preserve simplicity, especially accessibility." (Game World Observer). New Shores has 20 levels where you choose the next island. Buildings cannot be moved after you place them, heavy use of undo lowers your end-of-level score multiplier, there is no in-game timer, and there is a sandbox (TheSixthAxis; Nintendo World Report).

**How it teaches.** Barely, and on purpose. New Shores gives a short overview of camera and placement and then starts the first level (TheSixthAxis). The score preview is the real tutorial, because moving a building around shows you the rules.

**Reception.** The original scored 78 on OpenCritic. Critics praised the minimalism, and some wanted more depth (Wikipedia). New Shores got 8/10 from TheSixthAxis ("gorgeously vibrant and chilled experience") and 8.5 from Nintendo World Report. Mobile got 4/5 from PocketGamer. The criticisms were subtle selection highlights and zoom in New Shores, and clunky selection and rotation on Mobile.

**For Thebes.**
- *Borrow:* show the consequence inside the ghost, before ✓. For example, show the plus or minus on nearby houses' desirability, or which houses fall inside a well's or temple's reach. This teaches the rules without any text.
- *Borrow:* an outline or ring showing what a building will affect while it is being placed.
- *Adapt:* avoid the two-tap selection that Islanders: Mobile was criticised for. Tapping a card in the tray should start placing straight away, with a small "i" on the card for details.
- *Skip:* undo penalties, buildings you can never move, and run-ending fail states.

---

## 4. SimCity BuildIt (EA, Dec 2014) — mostly a list of things to avoid

**Visuals.** Polished. Even its harshest reviewer praised how it looks (Macworld). Deconstructor of Fun called the placement tools "rudimentary at best".

**Phone UX.** To move a building, you long-press it until the screen goes pale, drag it (a white outline shows where it will sit), then tap a green checkmark to confirm (EA Help). Opinion bubbles above Sims show what they want, and red exclamation icons on the right edge of the screen flag problems (EA beginner guide). Production works by dragging an item onto a factory or store, then tapping the finished goods to collect them. Players complain about offer pop-ups and about red notification dots (r/SCBuildIt, EA forums; anecdotal).

**Design.** It copies the Hay Day loop: factories make raw materials, stores turn them into goods, and goods upgrade homes. Timers come in short, medium and long tiers to control when you come back. Early sessions are long, later ones short, and extra production queues are paid (Deconstructor of Fun). Level-ups trigger new service demands you often cannot afford yet, and happiness drops by as much as 20% (Macworld). It also has:
- Contest of Mayors assignments
- a Mayor's Pass with a free tier and paid tiers, plus weekly caps on pass points since Season 56 (EA Help; r/SCBuildIt, unverified)
- daily login rewards
- storage caps you expand with premium currency (SimCash)
- limited-time offers

**How it teaches.** It holds your hand closely at first, with step-by-step prompts (exact flow UNVERIFIED), and then switches to waiting on timers. EA's official beginner guide covers factories, then stores, then residential zones, then opinion bubbles and red alerts.

**Reception.** TouchArcade gave it 4 stars in 2014 and called it "relatively fair" for a free-to-play game (excerpt). Macworld's reviewer was absorbed at first but had lost interest within a week, summing it up as "obstacles, not opportunities". Common Sense Media called it a decent builder marred by freemium. Deconstructor of Fun called the short-term loop best in class and the long-term goals weak.

**For Thebes.**
- *Borrow:* a need icon floating over the house itself at phone zoom (one icon, no text).
- *Borrow:* problem alerts as small icons stacked at the screen edge, never over the middle of the map. Tapping one opens the matching sheet.
- *Learn:* "you levelled up, now you need a hospital" feels like a punishment. Thebes' house-tier needs should stay opt-in. Houses improve when you provide more, and growth alone should never take something away.
- *Avoid:* everything in the dark-pattern list at the end.

---

## 5. Mini Metro (Dinosaur Polo Club; PC 2015, mobile 2016) and Mini Motorways (Apple Arcade 2019, later PC/Switch)

**Visuals.** Tube-map minimalism: flat colours and clear shapes. The map zooms out gradually as the city grows, so you only ever see what you need (Transitmap). The studio's technical designer Tana Tanoi calls the pleasure of watching many small, predictable agents move "Wuselfaktor", and says it is "the bread and butter of our style of games" (Thumbsticks).

**Phone UX.**
- *Mini Metro:* you drag a line between stations. Dropping a line's end on empty space deletes it (TouchArcade forum). On a small screen a pinch-zoom can accidentally reroute a line, so pausing before big edits is the safe habit. Transitmap called it "dragging out new routes with your finger is intuitive and fun." It feels cramped on small iPhones (Mac Life).
- *Mini Motorways:* tap to enter drawing mode, then draw a stroke, and switch to an eraser to remove roads. The camera zooms in while you draw, so you lose the overview (MobileSyrup). There is no undo. If you delete a motorway while cars are on it, that piece stays locked until they have all driven home (Steam discussion).
- *Both:* pausing and redrawing are free. Mini Metro gives you an upgrade choice at the end of each in-game week, a calm "stop and choose" moment.

**Design.** You only control part of the system (lines or roads, not passengers or cars). The studio calls this "predictable chaos" (Pocket Tactics). Each game moves from calm to frantic and always ends, and you can restart at any time. Both games have daily and weekly challenges on the same map for everyone, with leaderboards and an internet requirement. The developer reports about 1.48 million daily-challenge plays (press release, undated). Neither game shows a streak counter. However, a PlayStation trophy in Mini Metro asks you to post a daily-challenge score every weekday for a week, which is a streak dressed as an achievement (PlatPursuit, via search).

**How it teaches.** Thinly, and players noticed. TouchArcade's 2016 review said it "could probably do with a better tutorial" (excerpt). In a 2014 Steam thread the developer admitted the quick track-editing tricks "aren't as intuitive as we thought" and planned a mini-tutorial. Players still reported not knowing how to switch or delete lines (TouchArcade forum).

**Reception.** Mini Metro got 5 stars from TouchArcade. Mini Motorways got 4.5 from TouchArcade and an OpenCritic top critic average of 81 (87% recommend). The criticisms: it gets repetitive, touch is fiddly on small screens, and there is no undo.

**For Thebes.**
- *Borrow:* Wuselfaktor. Walkers moving along roads are a reward in themselves, so keep them readable at phone zoom.
- *Borrow:* keep the camera still while the player is placing (the opposite of Motorways' zoom-in).
- *Borrow:* make every editing action visible in the UI. Mini Metro shows that hidden gesture tricks don't get discovered.
- *Adapt (later):* a "daily map" with the same seed for everyone, optional and never streak-counted.
- *Skip:* weekday-streak achievements.

---

## 6. Dorfromantik (Toukana Interactive; PC early access Mar 2021, 1.0 Apr 2022, Switch 2022, PS/Xbox Aug 2025, Mac Jun 2026; mobile announced 2025)

**Visuals.** An idealised, painted countryside with a tactile, board-game feel. Developer Timo Falcke says tiny animations and sounds give each tile placement impact, and none of them was allowed to break the calm (Game Developer). Trains and boats travel along the tracks and rivers you have built (Hamatti review).

**Phone UX.** The mobile version is being rebuilt rather than ported. ClockStone is doing it, with a new game flow and mechanics designed for touch and play on the go. An earlier mobile prototype from 2022 was dropped (Gamesmarket; Shazoo). I found no confirmed launch as of 11 Oct 2026, so it is UNVERIFIED whether it is out. On PC the tile follows the cursor, you rotate it, and you click to place it (UNVERIFIED details of the edge preview).

**Design.** You draw hex tiles from a stack and place them. Matching edges score 10 points each. A "perfect" placement, where all six edges match, makes the tile light up briefly and adds a tile to your stack (itemlevel). Quests sit on groups in the landscape (for example, a forest of at least N trees) and pay extra tiles. "Flag" quests ask you to close an area off. You don't have to do every quest. The run ends when the stack is empty. Challenges work like achievements that unlock biomes, tiles and skins (Game Developer). Later updates added Creative (no score), custom modes and a monthly challenge mode. The developers' framing (GOG): "We want Dorfromantik to be something to unwind with after a stressful day."

**How it teaches.** A tutorial covers the basics. One reviewer misunderstood quests at first and replayed the tutorial before it clicked (Find the Strawberry). Finishing the tutorial gives you a joker tile.

**Reception.** 96% positive on Steam from about 14,000 reviews (Notebookcheck). Nintendo World Report gave it 8.5. Players criticise it as repetitive over time, and find the achievement-gated unlocks frustrating (VaporLens summary of Steam reviews).

**For Thebes.**
- *Borrow:* Falcke's rule, "the interaction the player does the most has to feel as satisfying as possible" (Game Developer). For Thebes that is the ✓ on placement, so put the polish there first.
- *Borrow:* goals that live on the map. A marker over a street saying "this street wants a well" needs no panel, and it fits "Show me".
- *Borrow:* a small, immediate reward for a tidy placement. For example, a house placed already in reach of water and food gives a brief glint.
- *Adapt:* finishing the guided ten minutes gives a small useful gift (a gold bonus or a free monument), like the joker tile.
- *Skip:* unlocking content behind hard achievements.

---

## 7. Kingdom: New Lands (mobile 2017) and Kingdom Two Crowns (mobile 2020)

**Visuals.** Side-on pixel art with changing seasons and dust kicked up by the horse. If your defences fail, the kingdom visibly crumbles (PocketGamer).

**Phone UX.** Swipe left or right to ride, and tap to spend coins. Swipes are sometimes read as spending, so coins get thrown at your subjects by mistake (PocketGamer). AppUnwrapper described it as entirely gesture-based with no on-screen button (excerpt). Two Crowns on mobile added local split-screen co-op, controller support and, later, cross-saves through an account (TouchArcade, excerpt).

**Design.** There is one currency. Everything costs coins dropped onto it. Enemies attack at night, and losing the crown ends the run.

**How it teaches.** Almost without words. In New Lands and Two Crowns, a friendly ghost walks you through the first steps: setting up camp and putting coins into people and buildings (developer's beginner guide, Steam, 8 Oct 2024). It never explains later systems such as destroying portals (Comicsbeat). A Steam thread from 29 Apr 2020 complains that the ghost keeps coming back on later islands with "hey over here!", for example every time you pick up a hermit. Players said it could not be switched off and asked for a toggle. AppUnwrapper's reviewer quit after one loss wiped out an hour of building, with little explained (excerpt).

**Reception.** PocketGamer gave New Lands 4.5 stars and called it "as much as a joy on mobile as it was on PC". Critics split over the minimalism, which some found intriguing and others frustrating (OpenCritic excerpts).

**For Thebes.**
- *Borrow:* a guide that points at the target in the world instead of explaining in text. Thebes' "Show me" pulse is already in this spirit.
- *Borrow:* show the cost on the object itself, for example on the ghost while placing.
- *Avoid:* tips that return after the player has already shown they know the action, and tips that can't be turned off. Rule: each tip fires once, can be dismissed, and Settings has a "Tips off" switch.
- *Avoid:* letting one mistake wipe out an hour of building.

---

## 8. The Battle of Polytopia (Midjiwan; first released 2016 as Super Tribes)

**Visuals.** Low-poly and flat-coloured, with distinct tribes. Midjiwan's principles include "informative art": visuals should explain mechanics without relying on text (Mobidictum).

**Phone UX.** Free on mobile and ad-free, with paid extra tribes (Mobidictum; Wikipedia). You tap a unit, then tap where it should go. Because it is turn-based, interruptions cost you nothing. Portrait support is UNVERIFIED (from memory).

**Design.**
- *Perfection mode:* 30 turns to score as high as you can (Wikipedia), about 30 minutes a game (Culturageek). Stuff.tv called it the best mode.
- *Stars:* you earn stars each turn and spend them on actions.
- *Weekly Challenge (added 2025):* everyone plays the same spawn and settings. It unlocks after 5 normal games and has a friends league (patch notes via APKMirror).
- *Polysseum:* monthly tournaments on a separate leaderboard.

**How it teaches.** A short interactive tutorial covers most of the basics, then you choose a tribe (Tech-gaming; LadiesGamers). Some ideas, such as what stars represent, are left for players to work out over later games (Tech-gaming). Midjiwan says it introduces concepts gradually. The Mobidictum piece holds up Age of Empires Mobile as the counter-example: its tutorial is about three times longer than a typical mobile session. Its summary of Midjiwan's view: "simplicity makes a game appealing to a great many more players".

**Reception.** TouchArcade gave it 4.5 stars (as Super Tribes) and said it suits both quick check-ins and marathons (excerpt). Macworld found it hard to put down. Switch reviews were mixed, 6/10 from Cubed3, for being too simple.

**For Thebes.**
- *Borrow:* keep the tutorial shorter than one session. The guided first ten minutes is the right size, and it must save cleanly and be resumable at every step.
- *Borrow:* only offer daily or weekly content after the player has finished a few normal sessions (Polytopia waits for 5 games).
- *Borrow:* let the art carry meaning, so a house's look shows its tier without a label.
- *Adapt (later):* a fixed-length scenario mode (say, "grow to N people in 24 months") as a natural five-minute-session format.

---

## 9. Short notes on other games

- **Bad North: Jotunn Edition** (mobile 2019). You rotate the island with a finger, and you give broad orders while soldiers handle the details (TouchArcade, excerpt; Stuff). *Thebes:* keep walkers acting for themselves.
- **Rusty's Retirement** (PC 2024). It sits in a strip at the bottom of your desktop while you work, and a "Focus Mode" slows production. Players criticise thin onboarding and early manual chores (Siliconera; AIPT; VaporLens). *Thebes:* make sure the layout survives a narrow, short browser window.
- **Tiny Glade** (PC 2024). No goals. Every action has an animated undo and redo, and buildings add their own details (draw a path through a wall and a door appears) (80.lv excerpt). Its OpenCritic average is 73, and critics found little long-term pull. *Thebes:* animate undo, and add smart details automatically (gates where roads cross walls).
- **Townsmen** (HandyGames, mobile free-to-play). Ads, plus "prestige" points that speed up building. PocketGamer said in-app purchase prompts hang over every turn, and GameSpot called the controls barely usable. *Avoid.*
- **Pocket Build.** Long-press to delete, pinch to zoom, and saves sync through the cloud, but it now has an optional weekly subscription (Common Sense Media; App Store). *Avoid* subscriptions.
- **Cities: Skylines – Switch Edition.** Without the PC version's snapping guides, lining roads up is hard, and the touchscreen is barely used (Nintendo Life; Jumpdashroll; GodIsAGeek). *Thebes:* grid-snapped roads with a clear preview line are a must on touch.
- **Frostpunk: Beyond the Ice** (mobile free-to-play, 2023). The mood comes through, but PocketGamer said the constant workload makes it "feel more like doing work than playing" (excerpt). Users list timers, energy needed to gather coal and wood, shops, and trade requests that favour the game. *Avoid* energy systems.
- **Fallout Shelter** (2015). It opens with a line of survivors waiting outside the vault until you build basic rooms (Gamerevolution; Gamereactor), so the first goal is told through the scene. Objectives come three at a time, and you may delete one per day. Goal types repeat with higher targets, the first objectives walk you through each system, and completing 100 objectives is an achievement. A tutorial skip arrived in update 1.2 (Wikipedia). There is also a daily check-in reward that builds over 7 days (TrueAchievements excerpt; whether missing a day resets it is UNVERIFIED). *Thebes:* frame the first goal as migrants waiting on the start road, and copy "three goals, swap one a day".
- **Two Point Hospital / Two Point Museum.** In Hospital, one star unlocks the next level, stars two and three are optional, and objectives sit in a panel top right (Wikipedia; guides). In Two Point Museum (2025), players complained that upgrade pop-ups came "like every 5 min". On 7 Mar 2025 a developer pointed them to the "Advisor Filter" setting and said the cooldowns would be reviewed (Steam thread). *Thebes:* optional extra stars per scenario, and a nag filter.
- **Stardew Valley mobile** (2018 port by The Secret Police). The default tap-to-move scheme was unpopular on iPhone, so more control schemes were added. Auto-save was added after complaints that closing the app could lose the day (TouchArcade, excerpt). Years of forum reports describe notches and the Dynamic Island covering toolbar slots, and menus that could not be tapped in rounded corners. Fixes came as padding options and a larger-tooltip option (Stardew forums). *Thebes:* respect `env(safe-area-inset-*)`, test on notched phones in both orientations, and offer a text-size option.
- **Animal Crossing: New Horizons.** Nook Miles+ always shows a handful of small tasks (five, per Pixel Poppers). Each is replaced as soon as you finish it, and there is no daily cap (TheGamer; iMore). By contrast, the Nook Stop login bonus grows with consecutive days and resets, which is a streak (iMore; sources disagree on the exact reset). Pixel Poppers calls the series "a Zen garden, not a checklist."
- **Alto's Adventure vs Jetpack Joyride.** Both show three goals at a time. Alto's makes you finish all three before the next set appears, and reviewers report getting stuck on one bad goal. Jetpack Joyride replaces each goal as you finish it (Hardcore Gaming 101; TrustedReviews; Wikipedia).
- **Unpacking.** 25 achievements, many hidden, with jokey names, rewarding curiosity (for example, putting the cookie jar out of reach). The whole set takes 1 to 2 hours (TrueAchievements; Push Square).

---

## 10. Cross-game patterns

### (a) Placing things on a phone

Five patterns turn up:

| Pattern | Who | Good for | Watch out for |
|---|---|---|---|
| Tap places at once, undo fixes it | Townscaper, Pocket Build | cheap, reversible actions | needs a deep, easy undo |
| Pick up, drag a ghost, confirm ✓ / cancel ✕ | SimCity BuildIt moving buildings | costly one-off buildings | extra tap per building |
| Drag to paint a stroke | Pocket City roads and zones, Mini Motorways, Mini Metro lines | roads, walls, plots | camera must stay still and auto-pan at edges; needs undo |
| Preview the consequence in the ghost | Islanders (score and affected ring), Dorfromantik (edge fit) | teaching rules without text | highlight must be strong enough (New Shores' was too subtle) |
| Gestures only, no buttons | Kingdom | very simple verbs | gestures get misread (swipe read as spend) |

Recorded failures:
- needing two taps to select (Islanders: Mobile)
- the camera zooming in while you draw (Mini Motorways)
- the camera not panning during a drag (Pocket City)
- the build menu forgetting your place (Pocket City)
- no undo (Pocket City, Mini Motorways)
- no snapping (Cities: Skylines Switch)
- a pinch that edits instead of zooming (Mini Metro)
- slow tap-to-rotate (Islanders: Mobile)

**Thumb reach.** Don't design only for one hand. Steven Hoober's 2013 field study (1,333 observations) found people hold phones in several ways. His later revision says fewer than half hold a phone one-handed (UXmatters; the percentage comes from a UXPlanet summary and is UNVERIFIED). So: put the frequent controls (dock, ✓/✕, speed) along the bottom edge, where either thumb can reach them in portrait. Rare controls (menu, settings) can sit at the top. Townscaper, Pocket City and Islanders are all praised for working in both orientations.

**For Thebes' confirm bar:**
- Keep ✓/✕ for buildings.
- For roads and plots, confirm the whole stroke once, not tile by tile.
- Tapping a card should go straight into placing.
- Remember the last card.
- Auto-pan near the screen edge during drags.
- Never move the camera on its own while the ghost is active.
- Show cost and effect on the ghost (reach ring, plus or minus on nearby houses).
- Tint invalid tiles quietly instead of showing a pop-up.
- Give a short, refunded undo for the last placement.
- Pinch and two-finger pan must never place or edit.

### (b) The guided first session

What the sources show:
- Keep it shorter than one session (Midjiwan's warning, above) and make it a real game, as Pocket City 2's Tutorial City is.
- Teach one idea at a time and keep the player playing: "The first screen is the most important one." (Game-Wisdom). Fallout Shelter's first objectives each push you into a different system.
- Spotlight one thing at a time. Atlassian's pattern guide: "Only a single spotlight should be used on the screen at one time." It keeps Skip and Next in the same place on every step.
- Don't ask "Do you want a tutorial?" up front. PlaytestCloud reports that about 70% of players asked this way opt out and then flounder, and advises letting players perform a new action at least twice (search excerpt only, UNVERIFIED).
- Offer an exit (Fallout Shelter added a skip in update 1.2), and don't swing too thin (Mini Metro had to add a mini-tutorial).

**Recipe for Thebes' first ten minutes:**
1. Start straight into the real city with no "tutorial?" question. The first goal comes from the scene, for example migrants waiting at the end of the start road.
2. Show one goal at a time in the strip, each with Show me. Show me pulses the target, opens the right dock category and selects the right card.
3. Dim lightly instead of blacking out. Spotlight one UI target or one map area at a time, and keep the map usable so the player can always pan away.
4. Each step finishes when the player does the thing, never on "Next" alone. Have them do each new verb twice (two plots, then a run of road).
5. Show a small "Skip guide" link in the same place on every step. Skipping completes the goals silently and keeps the rewards, so experienced players don't lose out.
6. Save after every step, so a phone call in minute four resumes at minute four. The "Welcome back" card names the step.
7. End with a small gift and a short line pointing to the next open goals.

### (c) Daily goals without streak pressure

Good examples, all covered above: Nook Miles+ (rotating tasks, replaced on completion, no cap), Fallout Shelter (three objectives, delete one a day), Jetpack Joyride (each mission replaced on its own, so one hard mission never blocks you), and the shared daily, weekly or monthly maps in Mini Motorways, Mini Metro, Polytopia and Dorfromantik (no streak counter; Polytopia waits until you have played 5 games).

Bad examples: the Nook Stop's resetting consecutive-day bonus, Mini Metro's weekday trophy, Alto's gated trios, and SimCity BuildIt's pass with weekly caps. Duolingo-style streaks are the warning case. Loss aversion turns play into obligation, Yu-kai Chou calls monetised streak anxiety "the Duolingo trap", and War Thunder players describe burnout after streak resets (War Thunder forum).

**Rules for Thebes' daily goals:**
- Show three small goals, picked from what the player's city can actually do today (never "build X" before X is unlocked).
- Each goal is replaced when done, and the player can swap one per day for free.
- Goals don't expire. If you come back after a week, the same three are waiting.
- There is no streak counter, no calendar, no "day 6 of 7" and no missed-day message.
- Rewards are small and useful (gold, a decoration), never needed for progress.
- Count only lifetime totals ("daily goals done: 23"), which can never go down.
- They work offline and in a five-minute session. Each goal should be doable in 2 to 5 minutes at normal speed.
- Turn them on only after the guided first session is finished.

### (d) Celebrations for firsts

Restraint works: Toukana kept Dorfromantik's effects small enough never to break the calm, Townscaper's whole reward is a pop, a click, a haptic and details settling in, and Dorfromantik pairs its brief light-up with something useful (an extra tile). "Juice" (Jonasson and Purho, 2012) shows what feedback can do, but critics warn that over-juicing hides weak mechanics and clutters the screen. The good examples, like Celeste, use effects to explain rather than distract (Wayline; RPG Playground).

**Celebration rules for Thebes:**
1. **Every placement:** a sound plus a light haptic plus settling. No text.
2. **A first** (first house tier-up, first temple, first market): a small icon and a short caption near the top-bar edge or in the banner slot for about two seconds. A gentle chime, a short particle burst on the building itself, and the camera stays put. Show it once per save, and queue it if another banner is showing.
3. **Milestones** (town rank, population thresholds): the existing milestone banner, plus an optional "Share" or "See your city" action. Don't pause the game unless the player taps.
4. Never show modal pop-ups for celebrations, never cover the middle of the map, and never stack them. Combine them if several land at once ("3 new things").
5. Add a "Reduce effects" setting that respects `prefers-reduced-motion`.

### (e) Idle "what next" nudges

What the sources show:
- Nagging is the main failure (Kingdom's ghost, Two Point Museum's advisor), and players want an off switch.
- Good nudges live in the world: SimCity BuildIt's opinion bubbles and edge alerts, Pocket City's quest scrolls and demand bars, Dorfromantik's quest markers.
- Puzzle games often hint after 10 to 15 seconds idle, but a calm builder needs much longer, because idle time there is often deliberate (watching walkers, or a pause).
- A 2022 study of 18 players found people preferred hints that are short, implicit and don't give away the whole solution (Hao et al., University of Washington). Escalate gently, from a visual cue to a short text (Wayline).

**Rules for Thebes' "what next" nudge:**
- Trigger it only when (a) the game is running, not paused and with no sheet open, (b) there has been no build action for about 60 to 90 seconds of real time, and (c) there is an open goal the player can afford.
- First step: the goals strip's Show me button glows gently once. It is not a pop-up.
- Second step, after another idle period: one line in the strip, for example "Your houses want water — try a well".
- Never more than once every few minutes. Stop for the session after two ignored nudges, and never nudge on the title card or the Welcome back card.
- Put it under a "Tips" setting next to the one-time contextual tips, and stop counting idle time while the game is paused.

### (f) Achievements for a calm builder

What fits a calm builder: small lists of firsts and discoveries (Townscaper's 10, Unpacking's 25, often hidden and jokey), plus one long-tail total (Fallout Shelter's 100 objectives). What doesn't: unlocks gated behind hard challenges (Dorfromantik, which players found frustrating) and streak trophies (Mini Metro).

**Rules for Thebes' achievements list:**
- 15 to 30 achievements in three bands: firsts (most of the list), "craft" goals (for example, a house at top tier, or a district where every house has water and food), and a few long-tail totals (1,000 people, 100 daily goals).
- No time limits, no streaks, no "without pausing" or "in under N days" goals, no missable one-time goals, and no achievements that need luck.
- Achievements never unlock content. They are a record, not a gate.
- Show locked ones with a plain-English hint. A few playful hidden ones are fine if each has a vague hint once the player reaches a related tier.
- Unlocking one uses the celebration from rule (d)2.
- They live in one sheet reached from the menu, with no badge counts on the main screen.

### Dark patterns to avoid (all seen in the games above)

- **Wait timers** on building or production that push you to come back or pay (SimCity BuildIt; Frostpunk: Beyond the Ice; Townsmen).
- **Energy** that limits how much you can act per session (Frostpunk: Beyond the Ice).
- **Storage caps** you expand with premium currency (SimCity BuildIt).
- **Premium currency** with poor exchange rates (SimCity BuildIt SimCash; Macworld).
- **Season passes** with paid tiers and weekly point caps (SimCity BuildIt Mayor's Pass).
- **Streaks and login calendars** that reset when you miss a day (Nook Stop; Fallout Shelter's daily report, unverified; Duolingo-style).
- **FOMO:** limited-time offers and pop-ups on launch, plus red dots everywhere (SimCity BuildIt forums).
- **Level-ups that create new demands** you can't meet yet, so growth feels like punishment (SimCity BuildIt).
- **Ads, or paying to skip** (Townsmen prestige; Alto's coin skips).
- **Subscriptions** for a builder (Pocket Build's weekly subscription).
- **Guidance you can't turn off,** or that comes back after you have shown you know the action (Kingdom's ghost; Two Point Museum's advisor before the filter).
- **Progress that needs an account or a connection** (Mini Motorways daily challenge needs internet; Kingdom cross-save needs an account). For Thebes, everything should work offline, with export or import as the portable save.

---

## Sources (all read 11 Oct 2026)

Townscaper
- Game Developer, "How Townscaper works": https://gamedeveloper.com/blogs/how-townscaper-works-a-story-four-games-in-the-making
- Wikipedia, Townscaper: https://en.wikipedia.org/wiki/Townscaper
- Pocket Tactics review (Tilly Lawton, Sep 2021): https://www.pockettactics.com/townscaper/review
- Android Police: https://www.androidpolice.com/townscaper-is-a-charming-citybuilder-and-one-of-the-best-sandbox-games-on-android/
- TouchArcade mobile review (excerpt; page blocked): https://toucharcade.com/2021/10/20/townscaper-mobile-review-iphone-android-ipad-icloud-controller-support-raw-fury/
- AppUnwrapper iOS review (excerpt; page blocked): https://www.appunwrapper.com/2021/10/20/townscaper-ios-review/
- TapSmart review (excerpt): https://www.tapsmart.com/news/townscaper-review/
- Electron Dance (excerpt): https://www.electrondance.com/?p=15054
- iPhone Mania, Japanese (excerpt): https://iphone-mania.jp/news-418229/amp/
- Bloomberg (excerpt): https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town
- TrueAchievements achievement list: https://www.trueachievements.com/game/Townscaper/achievements
- PureXbox on achievements: https://www.purexbox.com/news/2021/12/townscaper-is-now-on-game-pass-and-its-an-easy-1000g-for-achievement-hunters

Pocket City 1 and 2
- iMore review: https://www.imore.com/pocket-city-review
- PocketGamer review: https://www.pocketgamer.com/pocket-city/review/
- TouchArcade Pocket City review (excerpt): https://toucharcade.com/2018/07/31/pocket-city-review/
- TouchArcade Pocket City 2 review (excerpt): https://toucharcade.com/2023/04/18/pocket-city-2-review-mobile-iphone-ipad-premium-city-builder/
- TouchArcade Pocket City 2 interview (excerpt): https://toucharcade.com/2023/04/11/pocket-city-2-mobile-interview-price-legend-of-zelda-city-builder-game-future-codebrew-games/
- Destructoid review (excerpt): https://destructoid.com/?p=227371
- Android Police Pocket City 2 guide: https://www.androidpolice.com/pocket-city-2-guide/
- LevelWinner Pocket City 2 beginner's guide: https://www.levelwinner.com/pocket-city-2-beginners-guide-tips-tricks-strategies/

Islanders
- Wikipedia: https://en.wikipedia.org/wiki/Islanders_(video_game)
- Game World Observer interview: https://gameworldobserver.com/2019/06/14/islanders
- TheSixthAxis New Shores review: https://www.thesixthaxis.com/2025/07/17/islanders-new-shores-review/
- Nintendo World Report New Shores (excerpt): https://www.nintendoworldreport.com/review/71483
- PocketGamer Islanders: Mobile review: https://www.pocketgamer.com/islanders-mobile/review
- App Store, Islanders: Mobile: https://apps.apple.com/app/id6745312000

SimCity BuildIt
- Macworld Freemium Field Test: https://www.macworld.com/article/225166/freemium-field-test-the-grinding-simcity-buildit-emphasizes-obstacles-not-opportunities.html
- Deconstructor of Fun: https://deconstructoroffun.com/blog//2015/02/simcity-buildit-nice-town-but-would-you.html
- EA beginner guide: https://help.ea.com/en/articles/simcity/simcity-buildit/beginner-guide/
- EA rewards / Mayor's Pass help: https://help.ea.com/hu/articles/simcity/simcity-buildit/rewards
- TouchArcade review 2014 (excerpt): https://toucharcade.com/2014/12/23/simcity-buildit-review/
- Common Sense Media (excerpt): https://www.commonsensemedia.org/app-reviews/simcity-buildit
- ACCM (excerpt): https://childrenandmedia.org.au/app-reviews/apps/simcity-buildit
- r/SCBuildIt storage and offers threads (anecdotal, excerpt): https://redlib.hackliberty.org/r/SCBuildIt/comments/1kqxwit/material_storage_is_tiny/mt9ygai/?context=3

Mini Metro / Mini Motorways
- Transitmap review: https://transitmap.net/mini-metro-review
- Thumbsticks on Wuselfaktor: https://www.thumbsticks.com/hustle-and-bustle-how-mini-motorways-built-its-wuselfaktor/
- Pocket Tactics interview: https://www.pockettactics.com/dinosaur-polo-club/interview
- TouchArcade Mini Metro review (excerpt): https://toucharcade.com/2016/12/30/mini-metro-review-train-braining/
- Steam thread with developer reply (excerpt): https://steamcommunity.com/app/287980/discussions/0/35221031597445938
- TouchArcade forum thread (excerpt): https://toucharcade.com/community/threads/mini-metro-by-dinosaur-polo-club.295652/
- MobileSyrup Mini Motorways review (excerpt): https://mobilesyrup.com/2021/08/22/mini-motorways-game-review-traffic-fun/
- Steam Mini Motorways undo thread (excerpt): https://steamcommunity.com/app/1127500/discussions/0/3191360100924201389
- TouchArcade Mini Motorways review (excerpt): https://toucharcade.com/2019/09/30/apple-arcade-mini-motorways-review/
- Mini Motorways challenge-plays press release (excerpt): https://gamespress.com/Best-Selling-Strategy-Sim-Mini-Motorways-Speeds-into-the-Holiday-Seaso
- PlatPursuit Mini Metro trophies (excerpt): https://platpursuit.com/games/7767/

Dorfromantik
- Game Developer, Falcke interview: https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-
- GOG interview: https://gog.com/news/binterview_toukana_interactive_tells_us_more_about_dorfromantikb
- Gamesmarket on mobile/console ports (excerpt): https://www.gamesmarket.global/games-and-products/new-platforms-dorfromantik-comes-to-mobile-phones-and-more-consoles-with-the-help-of-clockstone-and-headup-04f6c37bb4b4e2c646fda3aa72551721
- Shazoo on mobile (Russian, excerpt): https://shazoo.ru/2025/05/08/167501/rasslabliaiushhaia-golovolomka-dorfromantik-vyidet-na-konsoliax-i-mobilnyx-ustroistvax
- itemlevel perfect placement guide (excerpt): https://itemlevel.net/dorfromantik-the-perfect-tile-placement-guide/
- shapes.inc fan wiki, quests (excerpt): https://shapes.inc/fandom/dorfromantik/challenges
- Find the Strawberry first look (excerpt): https://findthestrawberry.com/?p=1565
- Hamatti review notes: https://notes.hamatti.org/Gaming/Video-games/Reviews/Dorfromantik
- Notebookcheck (excerpt): https://www.notebookcheck.net/Simple-and-peaceful-game-with-overwhelmingly-positive-reviews-runs-perfectly-on-Steam-Deck-and-is-60-off-right-now.1107581.0.html
- VaporLens Steam review summary (excerpt): https://vaporlens.app/app/1455840/dorfromantik

Kingdom
- PocketGamer New Lands review: https://www.pocketgamer.com/kingdom-new-lands/review
- Steam thread "How to get rid of the annoying tutorial ghost?!" (29 Apr 2020): https://steamcommunity.com/app/701160/discussions/0/2265817650393682850
- Steam developer beginner guide (8 Oct 2024): https://steamcommunity.com/app/701160/discussions/0/4849904828217616805
- Comicsbeat Two Crowns Switch review (excerpt): https://www.comicsbeat.com/review-kingdom-two-crowns-expands-its-reign-to-the-nintendo-switch
- AppUnwrapper Two Crowns iOS review (excerpt; page blocked): https://www.appunwrapper.com/2020/05/17/kingdom-two-crowns-ios-review/
- TouchArcade Two Crowns mobile launch (excerpt): https://toucharcade.com/2020/04/28/kingdom-two-crowns-mobile-version-out-now-controller-support-splitscreen-ios-android-bloodstained/

Polytopia
- Mobidictum on Midjiwan's minimalism: https://mobidictum.com/christian-lovstedt-midjiwan-polytopia-minimalism/
- Pocket Tactics interview with Felix Ekenstam: https://www.pockettactics.com/the-battle-of-polytopia/interview
- Wikipedia: https://en.wikipedia.org/wiki/The_Battle_of_Polytopia
- TouchArcade Super Tribes review (excerpt): https://toucharcade.com/2016/04/20/super-tribes-review/
- Tech-gaming review (excerpt): https://www.tech-gaming.com/the-battle-of-polytopia/
- Stuff.tv review (excerpt): https://www.stuff.tv/?p=72845
- APKMirror release notes, weekly challenges (excerpt): https://apkmirror.com/apk/midjiwan-ab/the-battle-of-polytopia/the-battle-of-polytopia-2-12-0-13844-release

Other games
- Bad North, Stuff review (excerpt): https://www.stuff.tv/app-reviews/bad-north-jotunn-edition/review
- Rusty's Retirement, Siliconera review (excerpt): https://www.siliconera.com/review-rustys-retirement-offers-a-calming-and-simplistic-respite/
- Rusty's Retirement, AIPT review (excerpt): https://aiptcomics.com/2024/05/13/rustys-retirement-idle-game-review
- Tiny Glade, 80.lv (excerpt): https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games/
- Tiny Glade, OpenCritic (excerpt): https://opencritic.com/game/17303/-
- Townsmen, PocketGamer review (excerpt): https://www.pocketgamer.com/townsmen/review
- Townsmen, GameSpot review (excerpt): https://gamespot.com/reviews/townsmen-review/1900-6094011/
- Pocket Build, Common Sense Media (excerpt): https://www.commonsensemedia.org/app-reviews/pocket-build
- Cities: Skylines Switch, Nintendo Life (excerpt): https://www.nintendolife.com/reviews/switch-eshop/cities_skylines_-_nintendo_switch_edition
- Cities: Skylines Switch, Jumpdashroll (excerpt): https://www.jumpdashroll.com/article/cities-skylines-switch-edition-review
- Frostpunk: Beyond the Ice, PocketGamer review (excerpt): https://www.pocketgamer.com/frostpunk-beyond-the-ice/review
- Frostpunk: Beyond the Ice, user reviews (excerpt): https://justuseapp.com/en/app/6450759796/frostpunk-beyond-the-ice/reviews
- Fallout Shelter, Wikipedia: https://en.wikipedia.org/wiki/Fallout_Shelter
- Fallout Shelter objectives, TrueAchievements (excerpt; page blocked): https://www.trueachievements.com/game/Fallout-Shelter/walkthrough/4
- Two Point Hospital star system, Wikipedia (excerpt): https://en.wikipedia.org/wiki/Two_Point_Hospital
- Two Point Museum advisor filter, Steam thread (7 Mar 2025): https://steamcommunity.com/app/2185060/discussions/0/603024075879670845
- Stardew Valley mobile controls update, TouchArcade (excerpt): https://toucharcade.com/2018/11/01/stardew-valley-mobile-controls-update/
- Stardew Valley Dynamic Island thread (excerpt): https://forums.stardewvalley.net/threads/ios-dynamic-island-covers-hotbar-slots-on-iphone-16-pro-max.55420/
- Animal Crossing, Pixel Poppers: https://pixelpoppers.com/2020/03/nook-miles-and-binge-playing/
- Animal Crossing Nook Miles, iMore (excerpt): https://www.imore.com/animal-crossing-new-horizons-how-earn-nook-miles-fast
- Alto's Adventure, Hardcore Gaming 101 (excerpt): https://www.hardcoregaming101.net/altos-adventure/
- Jetpack Joyride, Wikipedia (excerpt): https://en.wikipedia.org/wiki/Jetpack_Joyride
- Unpacking achievements, TrueAchievements (excerpt): https://www.trueachievements.com/game/Unpacking/achievements

Design references
- Game-Wisdom, first-time mobile experiences: https://game-wisdom.com/general/first-time-mobile-game-experiences-matter
- Atlassian spotlight pattern (excerpt): https://atlassian.design/patterns/spotlight
- PlaytestCloud tutorial mistakes (search excerpt only; original page now 404, UNVERIFIED): https://blog.playtestcloud.com/mistakes-mobile-game-tutorials/
- Hao et al. 2022, hints study (excerpt): https://faculty.washington.edu/weicaics/paper/papers/HaoHZC2022.pdf
- Wayline on over-juicing (excerpt; low-quality source): https://www.wayline.io/blog/the-perils-of-over-juicing
- RPG Playground on "Juice it or lose it" (excerpt): https://rpgplayground.com/research-making-a-juicy-game/
- Yu-kai Chou on streaks (excerpt): https://yukaichou.com/?p=38981
- War Thunder forum on login streaks (excerpt): https://forum.warthunder.com/t/fix-the-daily-login-streak-rewards/308510
- Steven Hoober, how users hold phones (UXmatters, 2013; later revised): https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
