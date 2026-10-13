// The release history (Stage 4.6, rulings 401-403): every build the game has had, newest first, in plain words for the "What's new" sheet on
// the title card. The version follows the stages ("Version 4.6": the Stage 4.6 build; a pass between stages takes the next tenth), and the
// one constant that names the current build is APP_VERSION in src/data/ui.js: a test fails if the newest entry here differs from it.
// Each entry: version, date (an ISO day), title (a few words), new and fixed (lists of one-sentence notes; either may be empty).
// Built from the git log, the README and the follow-ups notes under docs/superpowers/notes. Playable old builds are not kept.
// `provisional: true` marks an entry written before its stage was final: the controller sets the real notes and drops the flag.
// This file imports nothing (it is a leaf data file).

export const RELEASES = [
  {
    version: '4.6', date: '2026-10-13', title: 'Living land, the court, armies and wonders', provisional: true,
    new: [
      'Choose a Small, Normal or Large map for a new city, and every new map is shaped a little differently.',
      'The Nile floods every year in its season: a rhythm to plan around, with a forecast, not a disaster. The fields it reaches grow richer.',
      'Gazelles and ostriches roam the land and boats fish the river. Build a hunting lodge or a fishing wharf and they feed your people.',
      'The court writes to you: requests for goods, gold, food or soldiers, and event cards with a real choice. Your favour with the capital rises when you help and falls when you refuse, and it changes how big the raids are.',
      'Archers and chariots, each trained in a building of their own, and raiders of more kinds that your towers and units answer differently.',
      'New monuments (a great sphinx, a sun temple, a step pyramid) and styles to paint them in.',
      'Enter lays what you have drawn, and Esc takes it back, whichever button you last pressed. The tick shows its Enter key where there is a keyboard.',
      'Pause and the three speeds in the top bar show a picture and a word, so playing and paused are never a guess.',
      'This list: Version and What\'s new on the title card.',
    ],
    fixed: [
      'A clay pit tells you what ground it needs before it is refused, and Show me takes you to a spot that fits.',
      'Enemy chariots fly a banner, so you can tell them from yours at a distance without relying on their colour.',
      'The overlay legend keeps its words on a wide screen, the bottom tabs scroll instead of running off a phone at large text, the confirm bar no longer squeezes its words on a wide screen, and the heavy edge on sheet headings is gone.',
    ],
  },
  {
    version: '4.5', date: '2026-10-13', title: 'Polish and pressure',
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
    version: '4.0', date: '2026-10-12', title: 'Monuments',
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
    version: '3.2', date: '2026-10-12', title: 'Placing with a finger',
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
    version: '3.1', date: '2026-10-12', title: 'Made for phones',
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
    version: '3.0', date: '2026-10-12', title: 'Danger and scoring',
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
    version: '2.0', date: '2026-10-11', title: 'The economy',
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
    version: '1.1', date: '2026-10-11', title: 'A gentler start',
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
    version: '1.0', date: '2026-10-10', title: 'The first city',
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
