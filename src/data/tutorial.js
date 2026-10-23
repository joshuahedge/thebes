// The picture cards (spec 4.1, rulings 261-264): seven cards read before the first city and any time from How to play,
// each one real game screenshot with one ring or arrow, a title and one or two plain sentences (their words, and each
// picture's alt text, live in src/ui/text.js CARDS4_TEXT.cards under the card's id). Track G owns this file.
//
// The pictures are made by tools/tutorial.ps1 from the development scenes (src/dev/tutorialScenes.js: the `tutorial`
// scene with { picture: id }), saved as assets/tutorial/<id>.webp, TUTORIAL.size px square and at most TUTORIAL.maxBytes,
// with assets/tutorial/cards.json giving each card's mark in picture px, read from the scene itself:
//   { "size": 600, "cards": { "<id>": { "mark": { "kind": "ring", "x", "y", "w", "h"[, "pad"][, "radius"] }
//                                             | { "kind": "arrow", "x", "y", "angle" } } } }
// A ring is a rounded outline around the box centred on (x, y), w by h (a circle when they are equal), TUTORIAL.ringPad
// outside it, or the mark's own "pad" (a button's ring sits close, clear of the words beside it), with a pill's ends
// (corner radius half the shorter side) or the mark's own "radius" in px (a row of text gets square-ish corners, so the
// ends do not sit on its first and last letters). An arrow's tip is at
// (x, y) and it points along angle (degrees: 0 points right, 90 down). The interface draws the mark live over the
// picture (src/ui/tutorial.js), so it stays sharp and stays aligned when the pictures are made again.
//
// Version 6.0 (Track D2, rulings 760-779): the seven above are the `intro` cards, read before a device's first new city (the lesson, which ends by
// marking them seen, teaches the same ground), and six more come after them, each with a `first` moment (src/ui/cardMoments.js MOMENTS names the
// sim's own sign of it): shown alone, once a device, the first time it happens, and kept with the rest in How to play and Show the picture cards.
export const TUTORIAL_CARDS = [
  { id: 'road', mark: 'ring', intro: true },     // a road with homes, a well and a farm along it: a ring on the road
  { id: 'homes', mark: 'ring', intro: true },    // housing plots on a road and a well beside them: a ring on the well
  { id: 'farm', mark: 'arrow', intro: true },    // the Ground layer on, fertile land green by the river, a farm on it: an arrow to Layers
  { id: 'food', mark: 'ring', intro: true },     // a granary and a bazaar by the homes, a building sheet: a ring on its workers row
  { id: 'gold', mark: 'ring', intro: true },     // Stage 4.5: the top bar over a village, its gold chip showing the month's forecast: a ring on the forecast
  { id: 'goals', mark: 'ring', intro: true },    // the goals strip: a ring on Show me
  { id: 'ahead', mark: 'ring', intro: true },    // a pyramid under way, a tower and a firehouse beyond: a ring on the pyramid
  { id: 'large', mark: 'ring', first: 'largePlot' },   // a Large plot, laid and empty beside the homes: a ring on the lot (its first moment: the card opens)
  { id: 'demand', mark: 'ring', first: 'demand' },     // the court's demand sheet with its reward and failure cost: a ring on the Accept button
  { id: 'plague', mark: 'ring', first: 'plague' },     // the Health layer over a crowded district, a sick home's sheet: a ring on the sick home
  { id: 'drought', mark: 'ring', first: 'drought' },   // the Nile reading's low flood warned over the farms: a ring on the farms
  { id: 'locusts', mark: 'ring', first: 'locusts' },   // a band of farms warned, a farm's sheet with Harvest now: a ring on the first farm
  { id: 'raid', mark: 'ring', first: 'raid' },         // a raid's ruins, a wrecked building's rubble: a ring on the rubble
  { id: 'event', mark: 'ring', first: 'cityEvent' },   // Version 7.0 (Track E): a city event's card with its choices and what each does: a ring on the choices (its first moment: the first event is offered)
];
export const INTRO_CARDS = TUTORIAL_CARDS.filter((c) => c.intro);

export const TUTORIAL = {
  dir: './assets/tutorial/',        // the pictures and the marks, beside index.html (cached for offline play)
  marks: 'cards.json',
  size: 600,                        // the pictures' side in px, and the marks' coordinates
  maxBytes: 60 * 1024,              // each picture at most 60 KB (ruling 264)
  ringPad: 10,                      // px (picture) between a ring and the box it marks, unless the mark gives its own pad
  arrowLength: 110, arrowHead: 34,  // px (picture)
  swipePx: 40,                      // a swipe moves a card when it goes this far, more across than up or down
};
