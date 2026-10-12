// Trade (spec 4.15, tunable). A partner opens once the city reaches its milestone and the player pays routeCost
// (scaled by difficulty: routeCostOf in src/sim/costs.js). buys: what it pays for the player's goods; sells: what it
// asks for its own; each good with a yearly quota, a quarter of which each caravan carries. A new route's first
// caravan brings a gift of the first good on its sale list. A good with `from` is listed only once the city has reached
// that milestone (Stage 4: Memphis's stone from City, ruling 255; Track A gates it in src/sim/trade.js); no partner buys
// stone or bricks.
export const PARTNERS = {
  memphis: {
    name: 'Memphis', milestone: 'market_town', routeCost: 300,
    buys: { grain: { price: 1, quota: 300 }, pottery: { price: 8, quota: 200 }, beer: { price: 10, quota: 160 } },
    sells: { clay: { price: 2, quota: 300 }, figs: { price: 3, quota: 200 }, barley: { price: 3, quota: 200 }, stone: { price: 6, quota: 200, from: 'city' } },
    gift: { good: 'clay', n: 40 },
  },
  byblos: {
    name: 'Byblos', milestone: 'great_city', routeCost: 600,
    buys: { pottery: { price: 8, quota: 120 }, linen: { price: 14, quota: 120 }, jewellery: { price: 20, quota: 80 } },
    sells: { flax: { price: 3, quota: 160 }, gems: { price: 9, quota: 100 }, beer: { price: 14, quota: 100 } },
    gift: { good: 'flax', n: 40 },
  },
};

export const CARAVAN_EVERY_MONTHS = 3;   // a caravan from each open route every three game-months
export const PRICE_DRIFT = 0.1;          // prices drift by up to ±10% a year (seeded)
export const TRADE_REACH = 16;           // road tiles from the trading post to the stores its caravans use
export const ARBITRAGE_MARGIN = 1.25;    // no partner sells a good for less than this times what any partner pays
