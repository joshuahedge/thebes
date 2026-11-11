// The release history (Stage 4.6, rulings 401-403): every build the game has had, newest first, in plain words for the "What's new" sheet on
// the title card. The version follows the stages ("Version 4.6": the Stage 4.6 build; a pass between stages takes the next tenth), and the
// one constant that names the current build is APP_VERSION in src/data/ui.js: a test fails if the newest entry here differs from it.
// Each entry: version, date (an ISO day), title (a few words), new and fixed (lists of one-sentence notes; either may be empty).
// Built from the git log, the README and the follow-ups notes under docs/superpowers/notes. Playable old builds are not kept.
// build: the short commit of that version's merge on main (git log --first-parent main), shown in its heading; the newest entry's is 'live',
// the running build's own stamp (read from sw-files.js), until the next version's entry gives it its merge commit.
// This file imports nothing (it is a leaf data file).

export const RELEASES = [
  {
    version: '9.3.1', date: '2026-11-11', title: 'Easier on a phone', build: 'live',
    new: [
      'A bridge or ferry is one straight line, laid where you drew it. Drag the road or the Crossing card over water and it lays a bridge over up to 4 tiles of water or a ferry over 5 to 12; where it can\'t, the bar says why, with Show me.',
      'Back on a phone closes one thing at a time: a stat\'s explainer, the Speed popup, the build tray, the lesson\'s chapter card and the title\'s panels no longer throw you out of the game.',
      'The outline of a building you are placing now lies on the ground, under the houses in front of it. The ✓ and ✕ stay on top.',
      'On a phone the Map sheet shows the map first, Fit the city closes it before framing, and the City page folds into rows. A sheet opens at its top, and the title\'s logo stays put while its card scrolls.',
      'An iPhone opens on the title with its buttons; the install guide opens from Install, with a Not now button.',
    ],
    fixed: [
      'The lesson\'s road step is framed at least 56 px from the screen\'s side and says "Drag along the dashed line"; once you have drawn the road it says "Tap ✓ to build the road you drew" and counts "9 of 9 planned".',
      'At 150% text the lesson\'s row and the goals strip wrap instead of cutting their words, a long building name no longer breaks inside a word, and in a raid Defence leads the dock\'s row.',
      'Held sideways on a notched phone, the rail no longer covers the corner buttons and sheets, and its words clear their colour bars.',
      'The housing-plots bar says Stop, the decree chip is 44 px tall, and the decree\'s end card leads with Try again.',
      'A two-finger pinch on a bar zooms the page to 200% at most. The title\'s decree card is shorter at large text on a short screen.',
    ],
  },
  {
    version: '9.3', date: '2026-11-10', title: 'A city that grows, and the decree', build: '22bb649',
    new: [
      'A city that grows: your buildings, ground and streets change look as the city ranks up. Town, City and Capital each bring a new look, so a Village of mud and thatch becomes whitewash, then warm stone, then pale limestone and gold.',
      'The new look spreads from the palace outward and takes 4 months to reach the farthest building. Full motion shows a gold ring sweeping out over 3 seconds, and the rank-up line says the city rebuilds.',
      'Homes come in three shapes at every tier: a single block, a stepped house with an outside stair, and a courtyard with a palm. The big homes differ in their outline and their own shadows. Zoomed out they draw as clean blocks.',
      'Services and workshops follow the look: painted bands, lamps and pots by the door. The granary, bazaar, temple, kiln, brickworks, weaver, well and firehouse each gain a landmark shape in the City and the Capital. The granary keeps its four domes, and awnings keep their colours.',
      'A workshop short of workers shows no goods in its yard. A shut one has a barred door and closed shutters, no figure and no smoke, so short and shut read apart at a glance.',
      'The ground has soft edges, trodden yards and worn paths. Roads step from a dirt track to gravel, then kerbs, then paving. A Capital street is warm cream stone with a gold kerb, palms and planters, and paving only where it is built up.',
      'Palms, rocks, reeds, people, animals, boats, carts and monuments all stand in soft shadow now, and the palace, rubble and the flood pool are redrawn to match.',
      'The decree: every Monday brings a decree, a six-year run on one map, scored out of 600 with a bonus part, with Bronze, Silver and Gold medals. A fourth week pairs two decrees. The first is week 47, starting 16 November 2026.',
      'Nine decrees: Sea Peoples, Low Nile, Year of the Plague, Stone famine, The Vizier\'s Levy, Open city, Golden caravans, Fire season and The Southern Host. Each says what changes, with real numbers: raids twice as often, farms 30% less, the court asking twice as much and paying double.',
      'The decree card sits on the title once your city has reached Town or you have passed the throne, or on a friend\'s decree link. Start opens the card over a paused game, and Begin starts the clock. A chip under the top bar shows Year 1 of 6 and the mark, and opens the card.',
      'A forbidden building stays in the tray, locked, with Not under this decree. A decree run has no guide, no daily goals and no chapter goals, and the top bar\'s score reads out of 600.',
      'At the end of year 6 the end card shows your six parts, the medal bars and your best, with Share, Try again and Back to your city. Your decree scores sit in Rulers beside your rulers, with the tries and the week\'s map.',
      'Share a decree score as a link and a picture. A friend who opens it sees your score as a rival on that week, kept on their device, and a link cannot be checked.',
      'A decree is saved apart from your city, so it never touches your own save or your records. Continue returns to a run in progress.',
    ],
    fixed: [
      'A better start for slower devices: the sprite memory is 32 MB on a computer and 24 MB on a phone, up from 16 MB for both, so a big city redraws less.',
      'A decree run\'s date holds at the last day of year 6 once the decree has ended.',
    ],
  },
  {
    version: '9.2', date: '2026-11-10', title: 'A city you can read', build: '853310a',
    new: [
      'The lesson\'s raid comes in from the south, so the tower, the target and the raiders fit on a phone from the first moment. A road that does not start at the marked end is refused, and the bar says where to start.',
      'In any city, a piece of road that joins nothing is outlined in amber and says so. The lesson now ends on a card with your city\'s numbers and what you learned: Keep building this city or Start my own city.',
      'Alerts roll up by cause: one row for every unstaffed workplace or every fire, and View steps through them. The Minimap sheet opens with Fix these first, the top three of City advice.',
      'The court sends one letter at a time, five to eight months apart, and each request or demand now weighs twice as much on its favour.',
      'On a wide screen the goals sit in the side panel above the minimap. Zoomed far out, a cause shows one marker instead of one for every building.',
      'Screenshot mode is now in Options, under Display, and keeps a small Show interface button. The debt sheet says why a lever is closed, with Show me where there is something to show.',
      'Score v3: a term that has not started counts nothing, so a new village is no longer close to Bronze. Fire safety counts from Town and defence from the raid clock, and the score sheet says so.',
      'The Villa pays more tax, and Great City has a new goal: open a route that sells a luxury. A monument site you have not looked at for a month gets one reminder.',
      'Titles and heirs are retuned: the Builder needs 8,000 monument units and the Merchant a quarter of the bills paid by trade. The Unconquered\'s heir sees every raid warning 15 days sooner; the Generous heir\'s taxes are 2% lower.',
      'Pass the throne shows a sealed-ruler card first, and nothing is sealed until the heir\'s Start. An heir starts with no guide, on the sealed city\'s layout. The title shows your Best reign, and Rulers rows lead with the name.',
      'Pinch zoom works on a phone, and Options has a 200% text step. A sheet opened from the keyboard takes focus, a confirm holds focus until you answer, and the minimap moves with the arrow keys.',
      'At large text the Layers legend, the tip and the lesson show their words, the rail names each icon, and small coloured words are darker so they read on parchment.',
      'One name per thing: map number, pleasantness, Great City and Skip the lesson read the same everywhere, and What\'s new no longer prints a build.',
      'Far roads and plots are easier to read, burnt rubble shows a charred wall and bricks, and the score chip wears a medal. The Health layer edges a home in a solid line when a physician reaches it and a dashed one when none does.',
      'Fit the city, with F or the Minimap\'s button, zooms out to show every building, and a city opens framed.',
    ],
    fixed: [
      'A confirm opened from a sheet gives focus back to where you were, and Screenshot mode keeps focus when you enter or leave it.',
      'A lost raid\'s line says the raid got through and that staffed towers stop it, instead of quoting the treasury.',
      'The end card shows both choices at 150% text on a phone, and a long ruler\'s name wraps instead of ending in dots.',
    ],
  },
  {
    version: '9.1', date: '2026-11-08', title: 'First hours', build: '42b1dce',
    new: [
      'The lesson now hands you a Village city with no surprise raid. A marker shows where to lay the first road, and the waits are shorter: the raid step runs at triple speed, then double, and its card says so.',
      'Toasts that only repeat what you just did no longer pile up in Messages, and the goals your city already meets at the hand-over complete quietly.',
      'Your first own city starts on the classic river, and Surprise me comes from the second. Skip the lesson starts a city at once.',
      'A loading screen shows while the game starts and says so when the connection is slow. If something breaks, a card keeps your city safe and offers Reload, Export this city and Copy the details. Nothing is sent anywhere.',
      'When gold runs out, the debt sheet\'s Back to gold lists what the month costs, the dearest kinds of building with a Pause for each, and how many months the fix gives you.',
      'About, in Options, says who made the game ("Made by Josh"), that all rights are reserved, and that nothing is sent anywhere.',
      'Big maps use less memory, so the tab is less likely to reload on a phone. The court\'s yearly due and the Nilometer now read your heir\'s traits.',
    ],
    fixed: [
      'The lesson\'s firehouse now reaches the buildings the lesson asks for.',
      'The error card is the one panel on screen, and says only what is true of your save.',
    ],
  },
  {
    version: '9.0', date: '2026-11-07', title: 'Dynasty', build: '1d937a4',
    new: [
      'Pass the throne: from the City milestone the game menu seals your best score as a ruler, gives it a title, and starts a new city for your heir. The sheet says what you keep and what ends before you tap, and Not yet changes nothing.',
      'A ruler is remembered as Unconquered, Builder, Merchant, Bountiful or Generous by how the reign went, or as the Steady when no title is met. The score sheet says why, and how close the next title is.',
      'Each heir has a strength and a weakness, shown on the sheet and on the heir\'s first screen: the Builder\'s crews lay 15% more but taxes are 5% less, and the Unconquered\'s soldiers cost 20% less but the first raid comes 100 days sooner.',
      'The Rulers list shows every reign with its name, number, title, score and a small map. Open one to see it side by side with a rival or your last reign, or tap Play this map to start again on the same land.',
      'A friend\'s link now carries their name and heir. It is kept as a rival on its map, and at a new split a toast says how you compare. Bring rulers in Options adds rulers and rivals from a file, never cities.',
      'Units walk in two poses and glide to where the game moved them. Buildings go up behind scaffold poles, workshops smoke, festivals light lamps and scatter petals, fires fought show their water, and a beaten raid gets its moment on the map.',
      'Phones run cooler, and panels fade open instead of snapping.',
    ],
    fixed: [
      'The Nilometer, the unit pay and the work gold now quote the numbers for your heir\'s city.',
      'Bring rulers keeps the dynasty you already have, and Play this map\'s choices go back if you press Back.',
    ],
  },
  {
    version: '8.4', date: '2026-11-07', title: 'Gold and war', build: '222cb61',
    new: [
      'The palace sets the tax rate: Low (a quarter less gold, mood +8), Normal, or High (a quarter more gold, mood -8). Each choice says its effect before you tap, and City advice points at it when gold piles up.',
      'Rush this course: a monument\'s crews lay twice the work a day for three times the work gold, until the course under way is laid. The button says the days it saves and the gold it costs before you tap.',
      'Villas and Estates now need an imported luxury: cedar, ivory or incense. Buy cedar and ivory on the Trade sheet; a home that lacks one stays where it is, and its sheet says so, with Show me.',
      'Scouts stand at the edge for 30 days before a raid\'s warning, where the raiders will come in. Raids now come sooner and more often: the first warning comes 300 days after the city reaches 250 people.',
      'Raids grow stronger with the years the raid clock has run, not with how many have come, so they come more often without each one being harder.',
      'A raid you beat leaves captured weapons: soldiers\' pay is a quarter less for a year. You also get a fanfare and a Victory in the mood.',
      'War elephants join the raids about twelve years after the raid clock starts. They trample, break walls and come in from upriver. Towers can frighten them back, and a fallen elephant leaves ivory.',
    ],
    fixed: [
      'A rushed monument site with no crew at work now says "Rushed: no crew today".',
      'The raid countdown chip never starts a line with its dot, and the elephant warning banner wraps clear of the panel on a tablet.',
      'A raid that comes as two bands now has scouts at both edges, and the alert names both sides.',
    ],
  },
  {
    version: '8.3', date: '2026-10-27', title: 'Lines', build: '26dfa6d',
    new: [
      'The road now crosses water by itself: drag it straight across and it lays a bridge over up to 4 tiles of water, or a ferry over 5 to 12. When it can\'t, the bar says why, with Show me.',
      'The Ferry card is now the Crossing card: it shows the best bridges and ferries near your roads, each with its water and price.',
      'Fetch is now Keep stocked, and a store can draw from one store you pick on the map. If that store runs dry the line turns amber and waits for you; it never takes from another store on its own. The delivery switches are now Takes in.',
      'A new map layer, Supply lines, draws the carts\' lines between stores: thicker for more carried last month, moving toward the store they feed, and amber and dashed when a line is stuck.',
      'Builders\' guilds now work far sites, slower with distance: full speed within 12 road tiles, 10% slower for each further 12, down to half speed. A site\'s sheet says how each crew is doing.',
      'A workers\' camp costs a tenth of a monument\'s founding price and puts every crew on that site at full speed. It can\'t be undone, and it goes when the monument is finished.',
      'The game menu has Home: it saves your city and goes back to the title screen, where Continue brings the city back.',
    ],
    fixed: [
      'When a bazaar\'s food runs low and another store has some to spare, City advice and its Show me now point at setting a store to keep it stocked, before suggesting another farm.',
      'A monument stalled for stone or bricks now says which store to keep stocked, or where to build one, and its Show me goes straight there.',
      'In the lesson, a farm or any building that needs a road can no longer be placed off the road, where the lesson could not go on.',
    ],
  },
  {
    version: '8.2.1', date: '2026-10-27', title: 'Easier ferries', build: '87b5ec3',
    new: [
      'Pick Ferry and the map shows the best crossings near your roads, each with its boat and price: tap one, then ✓.',
      'A ferry now brings a short road to any landing that has none, so the far bank no longer needs a road first; the price includes it.',
    ],
    fixed: [
      'Dragging a ferry across the water no longer has to follow one exact row: a crooked drag, or one that starts or ends in the water, snaps to the nearest crossing that works.',
      'When no crossing is near your roads, the Ferry bar says so and Show me finds the nearest place a ferry could go.',
      'The bazaar no longer says it has no food when its homes are fed. When food really is short, it says why: the granary is empty, paused, not joined by road, or the bazaar sells out. A home it leaves short asks for a second bazaar, and the "Get food to the bazaar" goal\'s Show me goes to the fix.',
    ],
  },
  {
    version: '8.2', date: '2026-10-26', title: 'Song of the Nile', build: 'c4bff18',
    new: [
      'The music is now seven short pieces instead of one endless tune: first light, the low reed, a lullaby, the river\'s turning, black earth, a harvest song and night on the west bank, played on a harp, a low flute, a warm pad and a low plucked string.',
      'Between the pieces the music rests for one to four minutes, so you hear the city itself; the first piece starts a few seconds after you begin.',
      'Each piece is played a little differently every time, and the season leans which ones you hear: the flood, the growing and the harvest each have their own.',
      'The danger music for raids, fires and other trouble is softer and lower, fades in over a few seconds, and gives way to quiet when the danger passes.',
      'A new map, the Oasis, with no river: one great lake ringed by palms and farmland, with spring pools and a dry wadi. The lake rises with the yearly flood, and trade comes by caravan.',
      'The new-city card shows a small picture of the map you will get. Press Another to draw a different one.',
    ],
    fixed: [
      'The high plucked note that repeated all through the music is now a rare touch, a few notes in a piece.',
      'New city in the game\'s menu now lets you choose the difficulty, map size and layout first.',
      'On a tablet or computer, the title screen, What\'s new, Options and the new-city card open in a wide, readable panel; on a phone every title panel scrolls inside its card.',
      'The lesson\'s raid step now says what the raiders are after, the build panel opens on what each step needs, and Ipi keeps to two short lines.',
      'The build list on the desktop panel and on phones shows every building and scrolls, with no More button, and every long sheet and the confirm box scroll by finger without moving the map behind.',
      'A new city on a phone now opens with its first road in view.',
    ],
  },
  {
    version: '8.1', date: '2026-10-26', title: 'The vizier', build: 'ad57f92',
    new: [
      'You are the king\'s new vizier, sent to the village at Thebes: make it worthy of the court, and crown your service with the great temple.',
      'Meet Ipi, the king\'s scribe, who talks you through the lesson, points out what the city needs, and says a word when you rise in rank or something new unlocks.',
      'The lesson now comes in seven short chapters, one idea each (roads, homes, water, food, work and trade, fire, defence). Everything you do not need yet is dimmed, Ipi says how you did after each step, and the city you build becomes your own city when it ends.',
      'The top bar is now pictures: gold, people, mood, the season and flood, and your score, each changing with the city. Tap one to see what it means, why it is moving, and what to do about it.',
      'The scroll icon opens Messages and a new City page: income and spending, people and jobs, what moves the mood, stores, and a year of gold, people and mood.',
      'Drag a card from the build tray onto the map and let go to build it. Roads and plots keep drawing as you drag.',
      'Each build group shows the few things that matter now, with More for the rest; things you have not unlocked yet stay out of the way, and the build marked Suggested glows.',
    ],
    fixed: [
      'The Nilometer now does something: with one staffed, the next flood shows on the top bar all year, and farms prepare, so a low flood costs a third less harvest.',
      'Pinching or double-tapping the build tray, bars and panels no longer zooms the whole page.',
      'In the lesson, cancelling a road and laying it again moves the lesson on; each step checks what is on the map, not the order of your taps.',
    ],
  },
  {
    version: '8.0', date: '2026-10-24', title: 'Clear and calm', build: '702481b',
    new: [
      'One look all through the game: a thicker patterned band and the same teal, ochre and lapis weighting on every panel and pop-up, with red kept for what you cannot do.',
      'A calmer title screen: one main button, Play (or Continue once you have a city), then Options and What\'s new. The version number now sits at the foot of Options.',
      'New city is one big choice, the difficulty, each level in a large tile with a line on what it means. Map size and layout wait under More choices, and the layout starts as Surprise me.',
      'Options is shorter and in four groups, Sound, Display, Controls and Saves, and buttons across the game use fewer words ("Place" and "Lay" instead of "Paint").',
      'Messages show for a few seconds and then fold into a tray behind the scroll icon, which keeps the last 30 and shows you the place each one is about. Raids, fires and anything that needs an answer stay at the top until you deal with them.',
      'Placing is clearer: the bar shows the picture and name of what you are placing, the card you picked stays lit in the tray, and the one filled button is the one that builds. Flip, Undo and Cancel stay plain.',
      'Leave the lesson now lives in the menu, and the lesson card keeps one main button, with "Skip, I\'ve played before" as a quiet link on its first card.',
      'The game always moves at full motion, so the Motion row is gone from Options; Bring a city from Safari is gone as well (Export city stays under Saves).',
    ],
    fixed: [
      'Placing a single house plot now works with one tap.',
      'The lesson\'s view and glow follow the step you are on, instead of staying on the bazaar.',
      'Reach is drawn as covered ground in teal, fire risk and homes a building would make less pleasant are amber, and red now means only that something cannot be done.',
      'Undo takes back only your last action, and only until the next month starts.',
      'Pop-up questions use the coral button only when something is lost, such as Demolish.',
    ],
  },
  {
    version: '7.1.1', date: '2026-10-24', title: 'Clearer first steps', build: 'a6eae26',
    new: [
      'The game now says what it is for: grow a village on the Nile into the Seat of the Two Lands, and win your reign by finishing the great temple. You see it on the title screen, at the start of the first lesson card, and at the top of How to play.',
      "Been here before? Skip, I've played before, under Start the lesson on the title screen or on the lesson's first card, marks the lesson done and takes you to a city of your own.",
    ],
    fixed: [
      'In the lesson, the Undo message after a placement no longer sits on top of the next lesson card, and a lesson card now waits until you have finished a road or plots you are drawing. The step you have just completed does not offer Undo.',
      'Every Undo message now has a close button (the cross), and buttons on cards, dialogs and sheets sit in the middle of their row instead of at one side.',
      "The last button of What's new and of the install guide now says Continue, and a lesson card puts away a placing tool that was still on behind it.",
      "The cataract has white rapids round its rocks, the new maps' rivers take the flood season's colour and the shimmer, and carts and walkers cross a ferry at the crossing's real pace, a cart on a boat of its own.",
    ],
  },
  {
    version: '7.1', date: '2026-10-24', title: 'Rivers of the world', build: 'e032f2c',
    new: [
      'Six new kinds of map: a delta that splits into arms, a confluence of two rivers in a Y, twin rivers, a wide Nile, a cataract with a rocky gorge, and a river flowing out of a lake. Each map draws its own direction for the river, and about two new cities in three now come up on one of them. Saved cities keep their own map.',
      'Ferries: where water is too wide to bridge (5 to 12 tiles), the road tool now says so and points you to the Ferry tool in the Roads tray. One drag lays a landing on each bank, each with a road beside it and a ferryman, and then walkers and carts cross. Raiders cannot use a ferry.',
    ],
    fixed: [
      'A fever card that stuck after you let a stranger in now closes, and the lesson card no longer lets the game run behind it or lets keys such as the map, the clock or the arrows act through it.',
      'Paid event choices that would spare nothing, because the workshops or stores were already gone, now say so instead of taking your gold, and the strike and quarrel lines say work starts again by itself.',
      'Trade: Buy at Keep at least 0 now says it buys nothing yet, the line follows the route switches, and Keep at least steps by 50 from 100 up.',
      'How to play folds into sections you open with a tap or Enter, and a sheet opened with the keyboard moves focus into it.',
      'Options says when Sound Off silences the music and effects, in words, and the volumes speak their level.',
      'Delta maps no longer merge two arms into one, and walkers and carts cross a running ferry as a short road.',
    ],
  },
  {
    version: '7.0', date: '2026-10-23', title: 'A living world', build: '16cda04',
    new: [
      'Trade with Nubia (from Capital) and Punt (from Great Capital) by river: build a Quay on a riverbank with a road and boats sail in. Punt sells incense. Each route can be switched off by good, and Keep at least stops trade selling what your city needs.',
      'A Trade sheet from the trading post, the Quay or the summary shows every route, last year\'s profit and what is held back for the great temple or the court. On a phone one route opens at a time.',
      'City events: once or twice a year from Town, an envoy, a fever, a festival or a quarrel asks for a decision. Each choice says exactly what it does first, a choice you cannot afford says why, and an unanswered card takes the default, which never costs gold.',
      'Seasons and a gentle day and night: the land and river change with flood, growing and harvest, and a six-minute loop darkens to lamp-lit evenings. Options can turn Day and night off.',
      'Sound polish: music that follows the season, a tense tune when danger is near, small sounds for placing, roads, fire, battle, caravans and boats, and separate Music and Effects volumes.',
      'Advice now says where a raid tower will truly defend, or to lay the road first, and to build a storehouse near a bazaar whose goods are stranded far away. It also covers the Quay and trade.',
      'The lesson card: each lesson step stops the game and sits in the middle of the screen; press Show me, Got it, Enter or Space and it docks, and play carries on by itself when you have done the step.',
      'On a computer, Delete or Backspace takes back what you just placed or demolishes the building whose sheet is open. The full list of keys is in How to play under Keyboard.',
      'Placing shows each tile as right or wrong, with a mark and not only a colour, and a line says what is missing in plain words, such as a road one tile away not counting. Land that suits a farm or a quarry is lightly marked.',
      'Empty house plots and building sites before work starts are pegged out on the map, so you can see what you placed. On a computer the Trade sheet and event card get the whole side panel.',
    ],
    fixed: [
      'The top bar keeps its date clear of the score chip when gold has five digits, and Space pauses after you click a speed button.',
      'On a phone held upright at large text, the building you are placing is framed above the placing bar and the Play and Speed buttons instead of landing behind them.',
    ],
  },
  {
    version: '6.0.1', date: '2026-10-23', title: 'A fairer finale', build: '4502f53',
    new: [
      'While the great temple rises, no plague, low Nile, locusts or blight comes: none is warned, and one warned before you found it does not strike, so a city at the Seat can finish the reign with the dangers on. Raids and fire do not ease. How to play and the great temple\'s sheet say so.',
    ],
    fixed: [
      'When the great temple waits for an offering and the workshop or farm that makes the good already stands, the advice now says to wait for it, or why it stands idle, instead of asking for another. Show me for a missing one aims at its own ground nearest the temple.',
      'The lesson\'s practice fire now always goes out and each step starts with a clear map, so the lesson can no longer leave you stuck on a dimmed, covered view; sideways on a phone the fire and raid steps now say what to do first, and a message waiting behind a raid report is no longer lost.',
    ],
  },
  {
    version: '6.0', date: '2026-10-23', title: 'A harder Nile', build: '01da086',
    new: [
      'A harder, longer game: wages, upkeep and monuments cost more as your city rises, and from year 8 the court takes a yearly due from your treasury, so a rich city can no longer bank gold without end.',
      'Court demands: from Town the court now and then asks for goods, gold, a building or soldiers by a deadline. Each says its reward and what failing costs before you accept, and you may decline.',
      'Two new ranks, Great Capital and the Seat of the Two Lands, and a last great work: a temple built in five stages with crews, stone and offerings. Finish it to win the reign, then play on.',
      'Raiders now wreck buildings and loot storehouses, and a chieftain leads the big bands. Rubble can be cleared and rebuilt in one tap.',
      'Plague (quarantine a district), drought and a low Nile, locusts and blight (Harvest now): each comes with a warning, a counter and an Advice item. None in your first three years, and milder on Relaxed.',
      'Raids you can watch: soldiers and raiders fight with visible blows, arrows arc from towers, and burned and wrecked buildings leave shells and smouldering rubble. The result shows in the alert row.',
      'Large plots: a 2x2 plot replaces merging for new grand homes, and people move in as a Manor once its needs are met. Small plots stop at Townhouse; homes you already merged keep working.',
      'A guided first city: on a new device the title offers a short lesson on a small map, from the first road to a fire and a raid warning, with picture cards for the new rules. Replay it from the menu.',
      'A Huge map, 112 tiles across, for tablets and computers; a phone is told it is best on a bigger screen.',
      'Desktop keys: arrows or WASD move the view, + and - zoom, ] and [ change the speed. They are listed in How to play.',
      'Sound is on by default and starts on your first tap; turn it off in Options. This week\'s Nile is gone.',
    ],
    fixed: [
      'A Route preview draws bridge tiles as bridges, locked layers show greyed with the rank that opens them, and farm-area leftovers are marked and counted.',
      'The advice now names the Estate trick: a store in the open, then a workshop beside it, then a Keep stocked order.',
    ],
  },
  {
    version: '5.0', date: '2026-10-16', title: 'Know your city', build: '486006a',
    new: [
      'A City advice button in the top bar opens a sheet that ranks what holds your city back: homes stuck for want of a good, a raid on its way, a street too plain, a shortage coming. Each item shows its cause, the fix, the price and a Show me. A dot says when the advice has changed.',
      'Every house sheet starts with the one next step for that home, with its price and a Show me, or says why there is nothing to do yet.',
      'Three new layers: Home progress (which homes are ready to grow and what each is missing), Goods supply (who asks for a good and which stores and bazaars hold it) and Workers (where the jobs and the jobless are).',
      'Build another on every building sheet copies that building, with its style and a store\'s Keep stocked orders, and tells you why when it cannot.',
      'Drag areas for farms, gardens and statues, like plots: the bar shows the total and what was skipped before you confirm, and one Undo takes it all back.',
      'Roads that find their way: Route takes two ends and lays the cheapest road round buildings and hills, over existing road, and over water by a bridge where one is allowed. It shows the tiles, bridges and price first. Straight is still there.',
      'A smoother camera: a quick swipe flings the map, Show me glides to the place and frames it, zoom stays under your fingers, and a two-finger double tap zooms out.',
      'Grand homes are within reach: new goals ask for a third kind of food and a better street, and the advice names the decoration that lifts a low street most, and where to put it.',
      'Large maps draw faster, so zooming out on one no longer drags.',
    ],
    fixed: [
      'Show me now says why when no tile fits, instead of opening a card that cannot be placed.',
      'A checklist row for a workshop or a hunting lodge says what its Show me will build, where, and what it costs.',
      'The new layers no longer make a big city stutter each game day.',
      'A street score below zero reads with a minus sign in the advice.',
    ],
  },
  {
    version: '4.7', date: '2026-10-15', title: 'Land and logistics', build: 'b541f9e',
    new: [
      'After you place a house, the plots that suit the next one light up: Good where water and a bazaar are in reach, Fair where one of them is. Done ends the house tool.',
      'A storehouse or granary can keep a good stocked from another store, by cart along the roads, at any distance. Set it from the store\'s sheet, which says what it will do before you tap and where the cart is after.',
      'Every new map has clay, a mine site and farmland near the start.',
      'Green now grows along the river and around oases, and fades out slowly into the desert instead of lying in patches.',
      'Oases form in the desert: a small pool with palms, rich soil and a little clay.',
      'Long belts of rock cross the land, and some carry ridges of hills that nothing can be built on or walked over.',
      'Hunters, herds and soldiers walk round water and hills instead of through them.',
      'From year 8 the capital asks a yearly tribute of goods, with a warning a year ahead and reminders. Send it from the court sheet: meet it for favour and a gift, miss it and favour falls.',
      'From year 10 raids grow with your wealth, and say so in the warning.',
      'Villas and Estates need a third kind of food and more household goods.',
    ],
    fixed: [
      'A Fair flood now gives x1.0 of a normal harvest (it was x0.9), so an average year is a small gain.',
      'Clay stranded in a far store no longer stops homes upgrading: a store near them can keep it stocked, and a tip points at the homes that wait.',
      'Your existing cities keep their land, with no hills, oases or new green. A Villa or Estate from before has two months to find a third food before it steps down a tier.',
    ],
  },
  {
    version: '4.6', date: '2026-10-13', title: 'Living land, the court, armies and wonders', build: '5bb08e5',
    new: [
      'Choose a Small, Normal or Large map for a new city, and every new map is shaped a little differently.',
      'The Nile floods every year in its season: a rhythm to plan around, not a disaster. Fields it reaches grow more in a high flood and less in a low one; a Nilometer tells you ahead.',
      'Build a Nilometer by the river to read the coming flood three months before the water rises.',
      'Roads cross the river on bridges, and the road card and the bar say where a bridge can go and what it costs.',
      'Gazelles and ostriches roam the land and boats fish the river. Build a hunting lodge or a fishing wharf and they feed your people.',
      'The court writes to you: requests for goods, gold, food or soldiers, and event cards with a real choice. Your favour with the capital rises when you help and falls when you refuse, and it changes how big the raids are.',
      'Archers and chariots, each trained in a building of their own, and raiders of more kinds that your towers and units answer differently.',
      'New monuments (a great sphinx, a sun temple, a step pyramid) and styles to paint them in.',
      'Enter lays what you have drawn, and Esc takes it back, whichever button you last pressed. The tick shows its Enter key where there is a keyboard.',
      'Play and pause read at a glance: pause is two clear bars, and a paused game says Paused on the corner button.',
      'Pause and the three speeds in the top bar each show a picture, and the one in use also says its word, so playing and paused are never a guess.',
      'The title screen shows the version and its build, and What\'s new lists what changed in every version.',
      'Easier to read: the overlay legend keeps its words on a wide screen, the bottom tabs scroll on a phone at large text, the confirm bar no longer squeezes its words, and sheet headings lose their heavy edge.',
    ],
    fixed: [
      'Big cities no longer pause for a moment at the end of every month.',
      'A clay pit needs 2 of its 4 tiles on clay, not all four. Its card says so before it is refused, and Show me takes you to a spot that fits.',
      'Enemy chariots fly a banner, so you can tell them from yours at a distance without relying on their colour.',
    ],
  },
  {
    version: '4.5', date: '2026-10-13', title: 'Polish and pressure', build: 'b2a5757',
    new: [
      'A game month lasts 30 seconds at 1x (it was 20), and everything counted in days stretches with it.',
      'Six river layouts for new cities: the classic river, one in the east, one through the middle, wide bends, an island and an oasis.',
      'Clay is ground of its own along the river banks, and a clay pit has to stand on it.',
      'Bridges carry a road over at most 4 tiles of water, and a road across a wall makes a gate.',
      'The gold chip shows the month\'s forecast, and every card says what a building costs a month in upkeep and wages. A new picture card, Gold, teaches where money comes from and goes.',
      'New villagers walk in from the road to their homes.',
      'Raids grow year by year, can come as two bands, and go after your granaries and homes. Sickness (with the physician) and thieves (with the police post) join fire as things to keep down.',
    ],
    fixed: [
      'Raiders have nineteen places to stand, and the confirm bar and a sheet now count the same homes.',
      'Shared links and personal bests keep the map layout.',
    ],
  },
  {
    version: '4.0', date: '2026-10-12', title: 'Monuments', build: '1d8cf1d',
    new: [
      'A Monuments tab with the builders\' guild, the quarry and the brickworks, and the monuments themselves: obelisks, the colossus, mastabas and the pyramids, each rising course by course while you play.',
      'Prestige: one monument of each kind lifts the mood, opens the pyramids and counts toward your score.',
      'The palace grows through five styles, and plazas and sphinxes make grand approaches. Festivals walk the roads in procession.',
      'Seven picture cards before your first city, music made in the browser as it plays, and the papyrus-and-lapis look with its frieze and cartouche headings.',
      'A Motion setting: Follow the device, Full, Gentle or Still.',
    ],
    fixed: [
      'Problem markers stand on their buildings, and a site that stops says why on the map, in the alerts and on its sheet.',
    ],
  },
  {
    version: '3.2', date: '2026-10-12', title: 'Placing with a finger', build: 'fdebfda',
    new: [
      'Fertile and rocky ground can be shown on the map, from a new Layers picker.',
      'Roads, walls, plots and demolish can be drawn with a finger, or tapped tile by tile.',
      'Each placing condition (free ground, a road beside it) is checked on its own and shown on the building you are placing and in the bar.',
    ],
    fixed: [
      'A building with no road gives nothing until a road touches it, and plots with no road say so in a big sign.',
      'After a touch you leave the tool, Undo is a small icon on a phone, and the new building stays in view.',
    ],
  },
  {
    version: '3.1', date: '2026-10-12', title: 'Made for phones', build: '8123159',
    new: [
      'A phone shows at most two rows under the top bar: one alert row and one guidance row that the legend, a tip, a caption and the goal take in turn.',
      'A phone height budget with measured screenshots, so the rows stay clear of the middle of the map.',
    ],
    fixed: [
      'The alert is one line, and a fire ranks above a raid warning.',
      'Toasts lift above the corner buttons at larger text, taps beside a toast reach the map, and buildings are framed below the rows.',
    ],
  },
  {
    version: '3.0', date: '2026-10-12', title: 'Danger and scoring', build: '2478e19',
    new: [
      'Fire: buildings build fire risk, a firehouse keeps it low, and a blaze nobody reaches burns and spreads.',
      'Raids: a banner warns three months ahead; draw walls and gates, build towers and a barracks, or pay tribute. A temple can hold a festival.',
      'Peaceful difficulty has no raids at all.',
      'A score out of 100 with a medal, records per map, This week\'s Nile, a link to share a score, and Screenshot mode.',
      'River life, sound and vibration (both off until you turn them on).',
    ],
    fixed: [],
  },
  {
    version: '2.0', date: '2026-10-11', title: 'The economy', build: '38dd2a4',
    new: [
      'Homes grow past House: Townhouses, Manors, Fine manors, Villas and Estates, each wanting more (pottery, beer, two foods, linen, jewellery).',
      'Chains of goods: a clay pit, barley farm, flax farm or gem mine fills a storehouse, a workshop turns it into pottery, beer, linen or jewellery, and bazaars sell it.',
      'Desirability decides which streets can hold the big homes, and booths bring entertainment.',
      'A trading post opens trade with Memphis and, later, Byblos. Milestones run up to Capital.',
      'Difficulty (Relaxed, Normal, Hard) changes what buildings, roads and trade cost.',
    ],
    fixed: [
      'A goal is only listed once the city can build what it asks for.',
    ],
  },
  {
    version: '1.1', date: '2026-10-11', title: 'A gentler start', build: 'fe78a79',
    new: [
      'A guided start: the goal under the top bar says what to do next, and Show me opens the right card and points at the place.',
      'Tips, captions for your firsts, daily goals and achievements, with a Help setting to turn it all down or off.',
      'Build cards with pictures, colour bands for the categories, and words on the corner buttons.',
      'A home\'s sheet says why it is not growing. Workers raise each building you place.',
    ],
    fixed: [
      'A building lands where it fits, and the confirm bar says what a service will do.',
      'The top bar keeps its numbers on one row, and the speed button and confirm bar stop jumping about.',
      'Calmer land: darker river loam, greener meadow and turquoise shallows.',
    ],
  },
  {
    version: '1.0', date: '2026-10-10', title: 'The first city', build: '012e9bf',
    new: [
      'A river town on a seeded map: roads, plots that grow from huts into houses as water, food and temples reach them, farms, granaries, bazaars and a monthly budget of taxes, wages and upkeep.',
      'Draw with a confirm bar and undo; play on a phone or a computer, with keys for the computer.',
      'The game saves itself every month, can be exported and imported, and installs to the home screen to play offline.',
    ],
    fixed: [],
  },
];

// A date as day, month name and year ("13 Oct 2026") from an ISO day, without a Date object (the sim's rule, kept here so the words are the
// same everywhere and a test can set any day).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function releaseDateText(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) return String(iso);
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}
