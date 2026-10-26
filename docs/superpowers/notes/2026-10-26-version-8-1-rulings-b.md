# Thebes 8.1, Track B (the top bar, explainers and the City page): rulings 1220-1239

## The lock ids (shared contract, published first)

1220. The top bar's controls carry these `data-lock` ids, each on the element a tap lands on (a button):
   - `stat-gold`, `stat-people`, `stat-mood`, `stat-date` and `stat-score`: one button per stat in the top bar (src/ui/hud.js). The date button is also the flood icon.
   - `papyrus`: the scroll button (src/ui/hud.js), which opens Messages and its City tab.
   - `speed`: the speed control, on every button it is made of (src/ui/speed.js): the corner's main button and chevron on a phone, and each step of the wide bar's speed buttons. The wrapper that holds them carries it too, so a lock may dim the group as one.
   - `menu`: the menu button (☰) lives in the top bar (src/ui/hud.js), so Track B puts `data-lock="menu"` on it; Track D need not touch hud.js.
   - The explainer popover and the City tab carry no lock id: they open only from a stat or the papyrus, which a lock already refuses.
   — Cost if wrong: a lesson that dims by these ids misses a control and lets a stray tap through; the fix is one attribute.

## The Nilometer (Josh's option (a))

1221. Farms prepare: while a staffed (working) Nilometer stands, a flood level that costs the floodplain farms part of their harvest (harvest under 1: Low) loses a third less: Low's 60% becomes 1 − 0.4 × 2/3 ≈ 73% (`NILOMETER.lossCut`, `preparedHarvest` in src/data/river.js; `levelHarvest` in src/sim/flood.js). It is read live, with no new world state (no world v11): a Nilometer built after a Low rise helps from then on, and one that loses its workers stops helping. A drought year still takes the lower of the two (the drought's own factor). The other half of option (a), "a high flood's damage is halved", has nothing to act on: Thebes's High flood does no damage (it gives 125%), so no damage was invented for it. — Cost if wrong: if Josh wants High floods to carry a risk the Nilometer softens, that is a new balance rule for every city; the low-year boost itself is small (15% of years, floodplain farms only).

1222. The forecast on the top bar all year: `nextFlood(world)` (pure, reads only) names the next rise's level whenever a working Nilometer stands, this year's before its rise and next year's after it (levelOfYear, which a Nile reading's drought warning turns Low, as it already did a read forecast). Without one, only what the city knows shows (a forecast bought from the priests). The date icon's four-step gauge fills to the level (shape, not colour), its name and explainer say it, and the Nilometer's sheet names the next flood all year too (the old "known from month 4" wait is gone for a staffed one; the sim's month-4 reading event and its caption are unchanged). — Cost if wrong: a player may plan on next year's level a drought warning later turns Low; the drought alert says so when it comes.

## The top bar

1223. Each stat is its own 44 px button with a drawn SVG picture that has states (src/ui/v81/statIcons.js): gold a pile of 1-4 coins (100 / 1000 / 5000 gold), people 1-3 figures (50 / 300 people), mood a face with four mouths, date the sun over the river by season with the flood gauge, score a cartouche. One number size and weight (15/16/17 px at 100/125/150% text); the labels, the forecast line, the season line and the score chip are gone from the bar, and every state is said in the button's name. — Cost if wrong: the thresholds for coins and figures are presentation only; changing them is a constant.

1224. The gold turns amber with a falling arrow whenever the month's balance is negative (Josh's 26 Oct words), not only when the treasury runs out (ruling 316's chip). The name adds "the treasury runs out in about N months" when it does. — Cost if wrong: a deep-treasury opening shows amber for months; going back to ruling 316 is one condition in statState.

1225. Explainers: a tap on a stat opens a small dialog pinned under the bar beside it (src/ui/v81/stats.js): what it is, why it moves from the sim's own breakdown (monthForecast lines; labour counts; world.moodBreakdown, biggest first; nextFlood; scoreOf parts and the weakest part's reason) and one action: the city's top advice of that stat's kinds (its own Show me or View), else for gold the costliest building, for the date the Nilometer (build it, or show the idle one), else the City page at the stat's section. A second tap, a tap elsewhere or Esc closes it; it closes a sheet that is open, and a sheet opening closes it; Enter on a stat opens it with focus on its action. While open the bar sits above the rows under it. — Cost if wrong: the mood explainer's action is the city's top problem of any kind, which may not be a mood cause; narrowing it is a list of kinds.

1226. The City page is the existing city summary, reached as the second tab of the papyrus's sheet (Messages | City tabs on both sheets, from the first home, as the papyrus). Its new "The last year" section draws gold, people and mood from world.history, the month-end rows the sim already keeps and saves (HISTORY_MONTHS = 12), so the trend survives a reload with no world v11. — Cost if wrong: none for saves; the trend has month-end resolution only.

1227. One row always: a phone's date reads the month alone ("M9"; its name and explainer say the whole date), numbers past four digits read short ("12.5k", the name whole), and where the row still would not fit the stats lose their padding, then the score its number, then (the narrowest phone at 150% text with a late city) the score steps out to the City page. At 375 px and 150% text a real city's numbers fit unsqueezed with room to spare. — Cost if wrong: a player on a 360 px phone at 150% text in a late city does not see the score on the bar.

1228. The lesson's month step (src/data/lesson.js) points at the gold itself (`#topbar .stat.gold`) and its words say "Tap the gold for the month's forecast"; the Gold picture card rings the gold. These are Track T's and the picture cards' lines, changed only because the chip they pointed at is gone. — Cost if wrong: a merge conflict with Track T's rewrite; take theirs and keep the selector.
