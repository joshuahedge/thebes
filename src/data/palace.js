// The palace (spec 4.20, rulings 271-275), every number a first value. One per city, a 3x3 civic building from Town
// (BUILDINGS.palace: 300 gold x the difficulty's cost, no workers, no upkeep, needs a road). The player enlarges it one
// style at a time from its sheet (enlargePalace, src/sim/palace.js): the price is paid in full at once and never takes
// the treasury below 0; the works then take `days` game days, during which the old style and its desirability hold.
//   id            the style's key (art slot palace.s<index>, words PALACE_TEXT in src/ui/text.js)
//   milestone     the milestone the city must have reached to enlarge to it (the first is as built)
//   price         gold to enlarge to it (x the difficulty's cost); 0 for the first
//   days          the works' game days (30 at 1x is 20 s)
//   desirability  its values by distance 1-6 (spec 4.7), only while a road touches it
//   mood          its Palace mood row (spec 4.9), only while a road touches it: +1 a style above the first
export const PALACE_STYLES = [
  { id: 'courtyard', milestone: 'town', price: 0, days: 0, desirability: [4, 3, 2, 1], mood: 0 },
  { id: 'columned', milestone: 'market_town', price: 600, days: 30, desirability: [6, 5, 4, 3, 2], mood: 1 },
  { id: 'pylons', milestone: 'city', price: 1500, days: 60, desirability: [8, 7, 6, 5, 4, 3], mood: 2 },
  { id: 'gilded', milestone: 'great_city', price: 4000, days: 90, desirability: [10, 9, 8, 6, 4, 2], mood: 3 },
  { id: 'lapis', milestone: 'capital', price: 10000, days: 120, desirability: [14, 12, 10, 8, 6, 4], mood: 4 },
];

// Demolishing refunds a quarter of the 300 to build it (ECONOMY.demolishRefund); the enlargements are lost.
export const PALACE = { type: 'palace', lastStyle: PALACE_STYLES.length - 1 };
