# Stage 2 task briefs (for plan writers)

Read first: the Stage 2 plan header and contract at C:\dev\thebes\docs\superpowers\plans\2026-10-11-thebes-stage-2-economy.md, and the spec C:\dev\thebes\docs\superpowers\specs\2026-10-09-thebes-design.md (sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18, 6.3, 10). The early-game pass is merged on main: read its spec (docs/superpowers/specs/2026-10-11-thebes-early-game-pass-design.md) for the mechanisms you extend (goals data, firsts, achievements, daily pool, tips, needCause, problem markers, cards/thumbs, celebrations). The contract is binding.

Task 1: World v3, difficulty and costs (sim + save only)
- world.js fields, WORLD_VERSION 3, MIGRATIONS[2], validateWorld; data/difficulty.js; sim/costs.js; commands and previews use costOf/roadCostOf; demolishRefundFor scaled; undo refunds recorded cost; settings.difficulty validated; boot creates new cities with it; cards/confirm bar show scaled cost (cardInfo). Tests: worldV3, migrateV3, costs (each level; minimum 1; undo refunds exactly what was spent), existing tests pinned to costs updated only if they assume the default (normal = unchanged).

Task 2: Goods, buildings, tiers, milestones, desirability and trade data
- All data per contract with exact numbers from spec 4.6/4.7/4.10/4.15 and these costs/workers/upkeep: garden 12/0/0; statue 60/0/0; farm_fig 70/6/8; clay_pit 50/5/6; potter 90/8/8; storehouse 70/5/6; booth 50/4/4; trading_post 150/10/6; farm_barley 60/6/8; brewery 100/8/8; farm_flax 60/6/8; weaver 110/8/8; gem_mine 140/10/10; jeweller 140/10/8 (cost/upkeep/workers). Priorities: farms essential (farm_fig) or industry (barley, flax); workshops industry; storehouse essential; booth services; trading post industry. producerReach 12 for producers, supplyReach unchanged. Data tests per contract. Keep Stage 1 behaviour: nothing new is placeable before Town; existing tests stay green (milestone list grows; update tests that count milestones or unlocks).

Task 3: Production chains and the storehouse (sim)
- Contract production rules; setAccept; alerts no_input/storage_full; tally.made. Tests: a clay pit feeding a storehouse; a potter taking clay and making pottery at 30/month full staff; no_input when no clay in reach; refusing a good sends it elsewhere or blocks with no_storage; granary only takes food; storage_full alert.

Task 4: Distribution of many goods (sim)
- Contract rules; bazaar per-good stock; houses top up household goods they want; two foods split and fill; met.twoFoods. Tests for each rule, including a tier-7-wanting house with only grain staying fed but not meeting twoFoods.

Task 5: Desirability (sim)
- Contract functions; memoisation; preview. Tests: a garden's 3/2/1 falloff; additive overlap; a 2×2 house uses its best tile; a building never affects its own footprint; contributors order; preview counts; memo invalidates when a building is added/removed/upgraded; performance with the stress city (budget like the existing stress test).

Task 6: Tiers 5-9, merges and splits, causes (sim)
- Contract rules; merge.js; houseStatus additions; needCause additions with text codes (text strings land in Task 14 but tests can check codes); invariant test extended (needCause null exactly when a checklist row is met, every need). Events merge/split. Tests: a square of four tier-5 plots on a pleasant street with a booth becomes one Manor with combined residents; the NW-first order; a merge needs empty or tier-5+ neighbours; dropping below tier 6 splits back; hysteresis (between keep and rise it holds; below keep for a month drops, with the countdown); capacity/tax per tile never fall across a merge.

Task 7: Trade (sim)
- Contract rules; commands; tradeMonth; drift; quotas; gift; postConnected. Tests: route opening (locked, no post, no gold, cost by difficulty); a caravan sells only above keep and buys only up to keep, never below 0 gold; per-visit and yearly caps; gift once; drift deterministic per seed and year and within ±10%; no caravan when the post is unstaffed or not joined to the trade entry; events and tallies.

Task 8: Goals, firsts, achievements, daily goals and tips for Stage 2 (data + sim)
- Contract additions with texts left to Task 14 where they are player-facing strings (goal texts stay in data/goals.js as before). Tests: new goal need kinds; firsts/achievements kinds made; daily availability (Town-only items unavailable before Town); the opening chain unchanged; a long run of goals in order on a scripted city.

Task 9: Art: housing tiers 5-9
- Port H5 and the four big() variants from docs/superpowers/notes/art-reference/v4-new-era-style.html (the mock-up's own drawing functions; see its README for conventions) into src/render/art/housing.js; registry entries (6-9 are 2×2), bounds/heights/shadows; one roof tell per tier visible at zoom 1 (awning, pergola, roof garden, painted parapet band, flag and pool). Tests in the style of housingArt/artBounds; screenshots of the tier ladder at zoom 1 and 2.

Task 10: Art: farms, orchard, garden, statue, booth
- farm_fig (orchard trees with fig stages g0-3), farm_barley and farm_flax (field tiles 'barley'/'flax' already exist in services.js fieldTile; four stages each, fallow when not working), garden (1×1 with shrubs, a pool or a palm), statue (1×1 plinth with a seated figure, gold accent), booth (1×1 small stage with an awning and a performer). Slots, bounds, stage helpers, thumbnails (drawThumb picks plain slots). Tests and screenshots.

Task 11: Art: workshops, storehouse and trading post
- clay_pit (2×2 pit with wet clay and drying bricks), potter (kiln, wheel, rows of pots, a little smoke drawn as soft puffs), brewery (vats and jars), weaver (looms with coloured cloth), gem_mine (rocky shaft with a winch and gem glints), jeweller (small whitewashed shop with a striped awning and a gold sign), storehouse (yard of crates, jars and bales in four stock stages s0-s3), trading_post (tents, a flag, tethered donkeys). Emblem pennants in the industry tint. Tests and screenshots.

Task 12: Interface: categories, cards, New badges, workshop and storehouse sheets
- Contract interface rules; text names for every new building and good in text.js; building sheet: "Making pottery from clay" / "Waiting for clay" status, stock rows with good names, storehouse accept switches calling setAccept; alert texts for no_input and storage_full with cause and fix; problem markers include the new codes; New badges from world.newItems (sim: updateMilestone fills it; place removes the type — a tiny sim change owned here with a test); tests for visibility rules and badges.

Task 13: Interface: the trading post sheet and caravans
- Trade button on the trading post's sheet opens a custom 'trade' sheet (one panel): routes with Open route (cost, disabled with a reason), per-good rows for goods any open partner trades (they pay / they ask, Buy/Sell/Ignore choice, keep stepper −10/+10 with 44 px buttons), next caravan date; setTradeOrder/openRoute through the sim; caravan events become captions ("A caravan from Memphis bought 30 pottery: +240 gold"); a tip on the first trading post. Tests.

Task 14: Interface: house sheet and summary for the economy
- New need rows with cause/fix/Show me for every new needCause code (Show me targets: potter or clay pit near the bazaar, booth near the home, garden near the home, etc.); desirability row "14 of 20: +6 temple, +3 garden, −4 potter" and the keep warning; tier-5 merge line; summary: goods made vs used last month (per good, from tally.made deltas recorded monthly — add a small monthly record in the sim if needed), trade income, difficulty; all strings; firsts/achievements/daily/tips texts for Task 8's additions. Tests including the extended invariant at the UI level.

Task 15: Interface: overlays and the placement preview
- Overlays goods/entertainment/desirability (graded: six steps <0, 0-19, 20-34, 35-49, 50-64, 65+, single hue light-to-dark, legend with words); OVERLAYS order water, food, religion, goods, entertainment, desirability, housing; AUTO_OVERLAY booth → entertainment, garden/statue → desirability; placement tint from desirabilityPreview (teal wash for better, coral hatch for worse, never colour alone: hatch vs wash) and the confirm-bar line. Tests incl. colour-blind-safe distinction (pattern) and performance (preview memoised per ghost tile).

Task 16: Difficulty on the title card and in Settings
- Title card: a Relaxed / Normal / Hard choice row under New city (aria-pressed buttons, 44 px), preselecting settings.difficulty; choosing sets the setting; New city (including the over-a-saved-city confirm path) starts with it; Settings sheet row "Difficulty for new cities"; summary shows the current city's level. Tests including boot.

Task 17: Balance and the sample cities
- A long-run test: a scripted city (through the public commands) that grows to Capital and keeps a positive treasury and no stuck chain over N game-years within the time budget; tune data numbers if it cannot (record each change); the title backdrop sample city gains a few Stage 2 buildings and tier 5-6 homes; the stress city includes new buildings; sw-files; screenshots of a Stage 2 city at the four sizes.

Task 18 (controller): wrap-up — README, follow-ups note, screenshots, merge.
