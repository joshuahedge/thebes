# Thebes v9 roadmap: Lines, Gold and war, Dynasty, Weekly decree (for Josh's approval)

**Josh's calls (27 Oct):**
- v9's headline is a **dynasty**: each finished city leaves something for the next.
- The leaderboard is **friends via links**, with no server.
- A city hands on its legacy **at any rank the player chooses**, from City upward.
- The dynasty is **simplified** to four parts (section 4). Renown, a choice of heirs, the oracle's prophecy and the written history are dropped.
- The **weekly decree** has unique challenges, harder raids among them, and runs for a **fixed number of years**.
- **War elephants** join the raiders.
- v9 ships as **four releases**: 8.3, 8.4, 9.0 and 9.1, in that order. Each one ships and pushes on its own once Josh says go.

Source: Josh's six notes of 27 Oct.
1. Ferries and bridges are unclear. Is there a length limit on bridges?
2. Raids take a long time to come.
3. Builders' guilds near monuments are not ideal.
4. Manors make far more gold than there is any way to spend.
5. Ordering goods at granaries and storehouses is hard to find, and its controls do not make sense. Choosing which store to fetch from would make supply lines.
6. Make the game something players keep coming back to.

## 1. The rules behind the notes

1. **Gold buys whatever is scarce.** Late in the game that is time, people and standing, not buildings.
2. **Show how things move.** Roads, crossings, carts and crews are the city's veins, and the player should see them.
3. **One rule, not two.** Distance makes things slower, not impossible. That is already how carts work, so crews and deliveries follow the same rule.
4. **A legacy is a choice, never power.** Every trait trades a strength for a weakness, so two friends on one map play a fair game.
5. **No guilt.** No streaks, and nothing is lost by missing a day or a week. The daily goals already work this way.

## 2. 8.3 "Lines" (notes 1, 3 and 5)

The full design is `2026-10-27-thebes-version-8-3-lines-design.md`. In short:

- **One way across water.** The road tool lays a bridge or a ferry for you, depending on how wide the water is. While you drag, it says which and why. The Ferry card becomes the **Crossing** card.
- **Visible supply lines.** "Fetch" becomes "Keep stocked". A store can be set to take its goods from one store you choose. A Supply lines layer draws every route.
- **Crews at any distance.** A builders' guild works any monument site its road reaches, and a far one works more slowly. A cheap **workers' camp** beside a site makes far crews work at full speed, and it clears itself when the monument is finished.

## 3. 8.4 "Gold and war" (notes 2 and 4)

**Gold gets jobs:**
- **Tax rate.** Low, Normal or High on the palace. Low taxes lift mood and draw people in; high taxes do the opposite. A rich city can buy happiness.
- **Rush a course.** Pay gold to have a monument course laid faster. Gold buys time.
- **Luxury imports.** Villas and Estates also want one imported luxury, such as incense, cedar or lapis, bought from trade partners. Gold buys standing.
- **The numbers to beat.** An Estate pays 180 people x 8 = 1,440 gold a month, as much as 22 Townhouses. Ten Estates out-earn the dearest monument (8,000 to found) every few game months. 8.4's balance runs must show late gold being spent, not piling up.

**Raids come sooner and mean more:**
- **The first warning** comes about 300 game days after the raid clock starts (about 5 minutes at normal speed), not 720.
- **Later raids** come every 360 to 600 days (6 to 10 minutes), not every 720 to 1,440.
- **A build-up you can see.** Scouts on the horizon before a warning, and raiders favour the low-Nile season.
- **A reward for a beaten raid:** captured weapons, which make the next soldiers cheaper, and a moment to celebrate.

**War elephants** are a fifth enemy kind, next to foot, archers, chariots and boats.
- **Huge and slow.** About six times a foot raider's hit points, at the slowest pace. A band moves at its slowest kind's pace.
- **Wall-breakers.** They break walls and gates about three times faster than foot raiders.
- **They trample.** An elephant hurts every unit beside it, so packing soldiers around one is a mistake.
- **They panic.** Below half health from arrows, an elephant may stampede back through its own band.
- **Matchups.** Archers and towers are strong against elephants. Soldiers are weak in melee. Chariots will not charge them.
- **The warning.** "War elephants!" with a trumpet. The raid sheet's "what helps" lines come from the matchup table as today.
- **When they come.** 1 to 3 per raid from about the 8th raid, on bigger raids only. They enter from the upriver edge.
- **Ivory.** A fallen elephant leaves ivory, a valuable new good. Sell it, or use it for the luxury needs of the top homes.

## 4. 9.0 "Dynasty" (note 6)

1. **Pass the throne.** From City upward, the menu has Pass the throne.
   - It says what this ruler will be remembered as, then seals the city's score.
   - A new city begins, with one city at a time as today.
   - A won reign can still play on and pass the throne later.
2. **A title, earned from how the reign was played.** The game picks the one that fits best. Most of what it needs, the game already counts for feats.
3. **The heir inherits that title as a trait.** That is the whole legacy: no currency, no unlocks and no choice screen.

   | Title | Earned by | The next city starts with |
   |---|---|---|
   | the Builder | the most monument work | monuments go faster; taxes a little lower |
   | the Unconquered | every raid beaten | soldiers cheaper; the first raid comes sooner |
   | the Bountiful | homes kept fed | farms yield more; granaries hold less |
   | the Merchant | trade paid the bills | trade pays more; workshops slower |
   | the Generous | low taxes (needs 8.4's tax rate) | people arrive faster; the highest tax rate is lower |
   | the Steady | none of the above | a plain start |

4. **The ruler list.**
   - **What it shows:** every ruler, with name, title, rank, years, score and map, and a replay of each map.
   - **Kept for good:** never trimmed by the 200-record cap.
   - **Backup:** carried by the export file.
   - **Protection from Safari:** the game asks players to install it to the home screen, because Safari wipes the data of a site that is not installed after about 7 days without a visit.
5. **Rivals via links.** This builds on today's share link and the title screen's "Beat N?".
   - **Your name on the link:** the player picks a ruler name, and a shared link carries it and the trait.
   - **Rivals are kept:** opening a friend's link keeps them as a rival on that map for good.
   - **During the game:** each new rank compares the two, for example "Town: 2 months ahead of your rival". Today the game compares only against your own best.
   - **At the end:** the two scores are shown side by side.

## 5. 9.1 "Weekly decree" (note 6)

- **The map.** Every Monday everyone gets the same map, seeded from the week, with one or two decrees. The weekly seed code was removed in 6.0 (ruling 742) and is a few lines to bring back.
- **The decrees.** These are hand-written, not drawn at random:

  | Decree | Twist |
  |---|---|
  | Sea Peoples | raids twice as often and larger, boats can land, walls cost half |
  | Low Nile | weak floods, farms yield 30% less, granaries hold double |
  | Year of the Plague | sickness spreads fast, physicians cost half |
  | Stone famine | quarries at half speed, brickworks at double |
  | Pharaoh's levy | the court asks twice as much, its favour pays double |
  | Open city | no walls allowed |
  | Golden caravans | trade pays double, workshops make half |
  | Fire season | fires far more often, firehouses reach further |
  | The Southern Host | war elephants from the 2nd raid, archers cost half |

- **The same start for everyone.** The decree fixes the heir (the Steady), so every player starts equal.
- **A fixed length.** The game runs about 6 years, which is about 36 minutes at normal speed or 12 at fastest, and then it scores. Retry as often as you like; your best counts.
- **A second save slot.** The decree runs in its own slot, so it never replaces the dynasty city.
- **It joins the ruler list** with a mark, for example "Sea Peoples, week 44".
- **Rivals.** Two friends on the same week play the same map without sending a link. With no server, a score still travels by link: one tap on the result shares it, and the friend becomes a rival as in 9.0.

## 6. Order and size

| Release | Size | Why here |
|---|---|---|
| 8.3 Lines | medium | Josh's own frustrations; it changes no balance, so it is the safest to ship first |
| 8.4 Gold and war | medium, mostly balance | Traits and decrees bend its levers (tax rate, raids), so they must exist first |
| 9.0 Dynasty | medium | It reuses the seal, the scores, the feats and the share links |
| 9.1 Weekly decree | medium, mostly content | It reuses 9.0's trait, rivals and ruler list, and adds the second save slot |

**Later, not in v9:**
- **Past cities as neighbours.** A retired city becomes a trade partner on a later map.
- **Eras.** The dynasty moves from the Old Kingdom to the Middle and New Kingdoms, with new art and buildings.
- **The oracle's prophecy** and **the written history**, both dropped from 9.0.
