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
    version: '6.0.1', date: '2026-10-23', title: 'A fairer finale', build: 'live',
    new: [
      'While the great temple rises, no plague, low Nile, locusts or blight comes: none is warned, and one warned before you found it does not strike, so a city at the Seat can finish the reign with the dangers on. Raids and fire do not ease. How to play and the great temple\'s sheet say so.',
    ],
    fixed: [
      'When the great temple waits for an offering and the workshop or farm that makes the good already stands, the advice now says to wait for it, or why it stands idle, instead of asking for another. Show me for a missing one aims at its own ground nearest the temple.',
    ],
  },
  {
    version: '6.0', date: '2026-10-23', title: 'A harder Nile', build: '588116e',
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
    version: '5.0', date: '2026-10-16', title: 'Know your city', build: '2653e92',
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
    version: '4.7', date: '2026-10-15', title: 'Land and logistics', build: 'eef5ccb',
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
    version: '4.6', date: '2026-10-13', title: 'Living land, the court, armies and wonders', build: 'ed005c5',
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
    version: '4.5', date: '2026-10-13', title: 'Polish and pressure', build: 'b444b16',
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
    version: '4.0', date: '2026-10-12', title: 'Monuments', build: '7833292',
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
    version: '3.2', date: '2026-10-12', title: 'Placing with a finger', build: 'b3f9781',
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
    version: '3.1', date: '2026-10-12', title: 'Made for phones', build: '1d5737a',
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
    version: '3.0', date: '2026-10-12', title: 'Danger and scoring', build: '2ff543f',
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
    version: '2.0', date: '2026-10-11', title: 'The economy', build: 'ce5593b',
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
    version: '1.1', date: '2026-10-11', title: 'A gentler start', build: '9803214',
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
    version: '1.0', date: '2026-10-10', title: 'The first city', build: 'bb1adee',
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
