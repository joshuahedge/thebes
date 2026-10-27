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
    version: '8.2.1', date: '2026-10-27', title: 'Easier ferries', build: 'live',
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
      'Each build group shows the few things that matter now, with More for the rest; things you have not unlocked yet stay out of the way, and the build Ipi suggests glows.',
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
      'The game now says what it is for: grow a village on the Nile into the Seat of the Two Lands, and win your reign by finishing the great temple. You see it on the title card, at the start of the first lesson card, and at the top of How to play.',
      "Been here before? Skip, I've played before, under Start the lesson on the title card or on the lesson's first card, marks the lesson done and takes you to a city of your own.",
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
      'Settings says when Sound Off silences the music and effects, in words, and the volumes speak their level.',
      'Delta maps no longer merge two arms into one, and walkers and carts cross a running ferry as a short road.',
    ],
  },
  {
    version: '7.0', date: '2026-10-23', title: 'A living world', build: '16cda04',
    new: [
      'Trade with Nubia (from Capital) and Punt (from Great Capital) by river: build a Quay on a riverbank with a road and boats sail in. Punt sells incense. Each route can be switched off by good, and Keep at least stops trade selling what your city needs.',
      'A Trade sheet from the trading post, the Quay or the summary shows every route, last year\'s profit and what is held back for the great temple or the court. On a phone one route opens at a time.',
      'City events: once or twice a year from Town, an envoy, a fever, a festival or a quarrel asks for a decision. Each choice says exactly what it does first, a choice you cannot afford says why, and an unanswered card takes the default, which never costs gold.',
      'Seasons and a gentle day and night: the land and river change with flood, growing and harvest, and a six-minute loop darkens to lamp-lit evenings. Settings can turn Day and night off, and Still motion keeps daylight.',
      'Sound polish: music that follows the season, a tense tune when danger is near, small sounds for placing, roads, fire, battle, caravans and boats, and separate Music and Effects volumes.',
      'Advice now says where a raid tower will truly defend, or to lay the road first, and to build a storehouse near a bazaar whose goods are stranded far away. It also covers the Quay and trade.',
      'The lesson card: each lesson step stops the game and sits in the middle of the screen; press Show me, Got it, Enter or Space and it docks, and play carries on by itself when you have done the step.',
      'On a computer, Delete or Backspace takes back what you just placed or demolishes the building whose sheet is open. The full list of keys is in How to play under Keyboard.',
      'Placing shows each square as right or wrong, with a mark and not only a colour, and a line says what is missing in plain words, such as a road one tile away not counting. Land that suits a farm or a quarry is lightly marked.',
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
      'Sound is on by default and starts on your first tap; turn it off in Settings. This week\'s Nile is gone.',
    ],
    fixed: [
      'A Route preview draws bridge tiles as bridges, locked layers show greyed with the rank that opens them, and farm-area leftovers are marked and counted.',
      'The advice now names the Estate trick: a store in the open, then a workshop beside it, then a Fetch order.',
      'Pausing no longer rebuilds the map layers for nothing.',
    ],
  },
  {
    version: '5.0', date: '2026-10-16', title: 'Know your city', build: '486006a',
    new: [
      'A City advice button in the top bar opens a sheet that ranks what holds your city back: homes stuck for want of a good, a raid on its way, a street too plain, a shortage coming. Each item shows its cause, the fix, the price and a Show me. A dot says when the advice has changed.',
      'Every house sheet starts with the one next step for that home, with its price and a Show me, or says why there is nothing to do yet.',
      'Three new layers: Home progress (which homes are ready to grow and what each is missing), Goods supply (who asks for a good and which stores and bazaars hold it) and Workers (where the jobs and the jobless are).',
      'Build another on every building sheet copies that building, with its style and a store\'s Fetch orders, and tells you why when it cannot.',
      'Drag areas for farms, gardens and statues, like plots: the bar shows the total and what was skipped before you confirm, and one Undo takes it all back.',
      'Roads that find their way: Route takes two ends and lays the cheapest road round buildings and hills, over existing road, and over water by a bridge where one is allowed. It shows the tiles, bridges and price first. Straight is still there.',
      'A smoother camera: a quick swipe flings the map, Show me glides to the place and frames it, zoom stays under your fingers, and a two-finger double tap zooms out. Gentle shortens these and Still turns them off.',
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
      'A storehouse or granary can Fetch a good from another store, by cart along the roads, at any distance. Set it from the store\'s sheet, which says what it will do before you tap and where the cart is after.',
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
      'Clay stranded in a far store no longer stops homes upgrading: a store near them can Fetch it, and a tip points at the homes that wait.',
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
      'The title card shows the version and its build, and What\'s new lists what changed in every version.',
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
      'New villagers walk in from the road to their homes, and fires show flames and smoke even under Gentle motion.',
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
      'Each placing condition (free ground, a road beside it) is checked on its own and shown on the ghost and in the bar.',
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
      'The ghost lands where it fits, and the confirm bar says what a service will do.',
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
