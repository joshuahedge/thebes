# Stage 1a follow-ups

These items were carried forward from the Stage 1a reviews (per-task reviews and the final whole-branch review). Nothing here blocked the merge. Each one belongs to the plan that first consumes the code in question.

## Plan 1b (rendering)
- **Event channel:** `runMonth` drops `updateMilestone`'s result, and nothing reports upgrades or downgrades. Add an optional, unsaved `events` array to `tickDay` and `advanceDays` for milestone banners and "+Shack" / "−Cottage" effects.
- **Change counters:** only roads have one (`roadVersion`). Terrain-chunk rebakes also need to know about building and tier changes. Track them with a WeakMap side-channel, or add a counter field before the first public publish.

## Plan 1c (interface and input)
- **Alerts:**
  - Alerts are a month-old snapshot and can name demolished buildings, so filter out missing ids.
  - `computeAlerts` also writes `world.alerts`. Split out a pure `alertsFor(world)` if the UI needs to query alerts mid-month.
  - There's no severity field, so the UI decides that `debt` is critical.
  - `storage_full` is unreachable: full or unstaffed storage reads as `no_storage`. Fix this before writing distinct alert text.
- **State after commands:** derived state (`staff`, `world.labour`, `blocked`) goes stale after commands while paused. End commands with `assignLabour(world)`, which is cheap and changes no outcomes.
- **"Employed" label:** `employed` means assigned, so workers at buildings staffed below 25% still draw wages. Label the HUD carefully.
- **Hover preview cost:** placement previews on hover fill the reach cache. Use `checkTiles` for drag previews and only call `canPlace` on the hovered tile.
- **Undo:** undoing a paint after days have passed removes the residents who moved in, which spec 6.5 allows. Ask before undoing an occupied area.
- **Phone testing:** `tests/serve.py` binds 127.0.0.1 only. Add a bind argument for testing on a phone over the LAN.
- **Return shapes:** `previewDemolishArea` and `undo` don't follow the `{ ok, reason, warnings }` command shape. Normalise them if the UI wants uniformity.

## Plan 1d (onboarding, saving, shipping)
- **Load errors:** `deserialize` can throw five codes: `corrupt_save`, `not_a_save`, `newer_version`, `no_migration_<v>` and `bad_migration_<v>`. Handle all of them. Only `corrupt_save` should fall back to the backup; `newer_version` should be refused politely without overwriting anything.
- **Validation depth:** `validateWorld` checks top-level fields only. An unknown building type, or `occ` pointing at a missing building, still loads.
- **First migration:** guard against overshoot (a step that jumps past the target), and wrap step errors as `corrupt_save`. Migrations must also migrate the building snapshots inside `world.undo`, or clear undo on load.
- **Save shape:** until the first public publish, shape changes can edit `createWorld` and `REQUIRED` without bumping `WORLD_VERSION`. After that, every change needs a migration.
- **Loading into the live game:** never `Object.assign` a loaded save into the live world, because the reach cache is keyed by world object. Force speed 0 on load and remember the last speed for "Carry on".
- **Welcome back:** `stats` holds only `lastMonth`, so the Welcome back trends need a short history.
- **First arrivals:** they follow the calendar (days 10, 20, 30), so they come 0–6.7 s after the first plot at 1×, not "about 10 s".

## Stage 2 and later
- **Balance (Stage 1 numbers):**
  - A Town settles at mood 39, only 9 above the arrival floor, because of the unemployment penalty: 108 workers for 48 jobs. More job types in Stage 2 will fix this.
  - The treasury grows by about +301 a month at tier 4, with no gold sink yet.
  - Wages and upkeep come to about 40% of taxes against the spec's 60–70% target. Retune when industry arrives.
- **Billing timing:** wages and upkeep are billed on a month-end snapshot. A building paused on day 29 pays nothing for the month. Decide whether to accrue daily before the first publish, because it changes the save shape.
- **Storage rules:** unstaffed granaries still supply bazaars, though production only deposits into working storage.
- **Undo safety for Stage 3:** undo trusts LIFO order. Before fire or raids change occupancy outside commands, skip refunds when `removeBuilding` returns null, and refuse a demolish-undo onto an occupied footprint.
- **Month-end performance:** coverage and bazaar lookups cost O(houses × buildings) at month end. That's fine at Stage 1 sizes (a 10-year run takes about 110–145 ms), but index road tile → adjacent buildings if large maps stutter.
- **Edge-case guards:**
  - `roadPath` accepts huge integers, so a direct call can still spin. `previewRoad` bounds-checks first, so the live path is safe.
  - `rectTiles` with no size clamps only the lower bound.
