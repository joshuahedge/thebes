# Danger in city builders and colony sims: digest for Thebes Stage 3

Researched 11 Oct 2026 for spec sections 4.12 (fire) and 4.13 (raids and defence). Source tags: [R] page opened and read; [S] search-result summary only (page blocked or not opened); [P] a player's claim, anecdotal. "S19" means source 19 in the list at the end. Many outlets block automated reading, so several designer pages could not be opened; those are marked.

## 1. The short version: 14 principles

1. **Warn with a countdown, a direction and a decision.** Manor Lords gives the first raid a one-year countdown [P, S20]. Farthest Frontier puts a bell over the town centre when a raid lands, and some bands first offer "pay gold or fight" [R, S19]. Dawn of Man veterans pause on the warning and read where raiders are [P, S35]. Kingdoms and Castles players complain they cannot tell where attackers will land [P, S21].
2. **Make the first threat small and beatable with the tool just taught.** RimWorld multiplies early raid points by 0.7 at day 10, rising to 1.0 at day 40, and by a further 0.8 during a 30-day grace [R, S24]. The most-cited unfairness in Manor Lords is its first raid (about 30 brigands, or 4x18 within two years) [P, S20]. Cities: Skylines disaster hits are called devastating "especially early on" in an aggregator summary [S, S17, low trust].
3. **Unlock the counter before the threat, and make it affordable.** Anno guides say build emergency services early because staffing them takes time [S, S16]. Farthest Frontier's developer says walls may be too costly to build early [R, S19]; a Townsmen reviewer says the same of barracks and towers [S, S30]. Thebes already does this (firehouse at Village, risk from Town).
4. **Scale threat to wealth and population with a capped curve, not the calendar alone.** RimWorld and Dwarf Fortress both do (numbers in section 2) [R, S23, S24]. Farthest Frontier: "as the town grows larger, so too will the raids" [R, S19]. Failure modes are raids skipped for up to 12 years by a bug and a combat update after which one player reported 134 villagers killed for six raiders [S, P, S19].
5. **Make wealth the bait, and let the player move it.** Farthest Frontier raiders fixate on gold and vaults; one player moved vault, barracks and town centre to the town edge and raiders followed, so no bell was needed [R, P, S19]. Caesar III invaders go for granaries, warehouses and the senate [R, S2]. Counterplay for free, and a clear "why me".
6. **Every loss should trace to a visible, fixable cause.** Caesar III's Risks overlay draws a column per building that falls as prefects walk past [R, S1]. The loud complaints are the untraceable ones: random tree fires in Cities: Skylines [R, S17], Banished tornadoes (players say nothing can be done) [P, S10], Fallout Shelter players not told that upgrading a room makes its incidents worse [S, P, S27].
7. **Danger as the price of growth is accepted; danger as random tax is not.** Fallout Shelter's Rush raises a room's incident chance each time you use it [R, S27]. Pocket City's fires and disasters grow with the city [S, S29]. A Frostpunk critique finds the storm loses bite because heating makes growth nearly free [S, S12].
8. **Recovery must be cheap, quick and part of the fun.** One Banished player calls recovery "one of the best parts"; the original poster says disasters make them reload [R, S8]. Pocket City sells "Rebuild Everything" for a fee [S, S29].
9. **Give the player a choice during the warning.** Zeus offers fight, bribe or surrender [S, S7]; Farthest Frontier offers pay, fight or ignore [R, S19]. Pitfalls: a pop-up that blocks everything else [P], and a price tied to visible gold that players dodge by moving gold [P, S19].
10. **Keep combat readable and mostly automatic, with one or two levers.** In Caesar III's tower fights you cannot affect the fight beyond cheering on the guards [R, S2], yet GameSpot called combat the weakest part [R, S3]. Dawn of Man: one horn arms able villagers while the rest hide [P, S35]. Manor Lords fights turn on stance choices ("hold ground" versus "balanced") [P, S20].
11. **Walls only earn their cost if they reliably do one job.** Manor Lords walls "purely cosmetic" early [P, S20]; Kingdoms and Castles raiders capture people through a one-tile wall [P, R, S21]; Farthest Frontier raiders converge on the weakest tower gap [P, S19]; Dawn of Man AI walks around palisades [P, S35]. Gates, towers and funnelling are what players praise.
12. **Give the player a dial and a way off.** Manor Lords: raider frequency None/Medium/Frequent plus 1 to 5 raider-free years [S, S20]. Farthest Frontier: Pacifist Mode, "a perfectly valid way to play" [R, S19]. Banished: disasters off at start, achievements kept [R, S8]. Caesar III: pick a peaceful or military map per mission [R, S3]. RimWorld: threat scale 0.1 to 2.2 [R, S24].
13. **Give pressure a face and a rhythm.** Against the Storm's designer says the Queen exists to judge how the settlement is doing, much as invasions punish weak settlements in other strategy games; a streamer shouted at the Queen's countdown instead of blaming the developers [R, S18]. A Frostpunk critique praises the alternation of looming deadline and relief [S, S12].
14. **No danger is a valid, loved design.** Dorfromantik has no loss state; tension comes from a finite tile stack, and the studio says calm was the goal from the start [S, S32]. Danger in a cosy game should be a mode the player chose, never a surprise.

## 2. System by system

### Fire
- **Works.** A per-building risk that rises with neglect and is reset by service, shown as an overlay: Caesar III risk climbs the longer a building goes unvisited; a passing prefect puts out loose sparks and cooking fires; bigger blazes need more water and longer [R, S1]. Anno's fire station fights fires in its radius and also lowers incident chance nearby; fires cluster in industry [S, S16]. Banished leans on spacing: citizens carry water from the nearest source, wells are the fallback, fire jumps about 3 tiles (so a road 4 wide is a firebreak), and the Priority tool pulls idle workers to a fire [P, R, S8].
- **Fails.** Hidden causes: any tree can ignite in Cities: Skylines, the Natural Disasters add-on made it feel worse, trucks do not respond to tree fires, and a community mod exists to lower the rate [R, S17]. Patrols that miss places: Caesar III re-implementers found prefects favouring clusters of small houses over a lone farm, and dead-end roads left farms unvisited [S, S34]. Anno players ask how to turn fires off or reduce them and get no clear answer [S, S16].
- **Numbers.** Fire spread about 3 tiles (Banished, P). Cities: Skylines fire watch tower unlocks near 8,500 population (P). No source gives a per-day ignition rate beyond the Pharaoh figures in the earlier note. Mobile: Fallout Shelter fire takes a room offline and spreads to neighbours [S, S27]; Pocket City gives XP for putting fires out [S, S29].

### Raids: warning, sizing, tribute
- **Works.** Sizing from wealth plus people, with floors and caps. RimWorld: wealth points are 0 up to 14,000 wealth, 2,400 at 400,000, 4,200 at 1,000,000 (cap); colonists add points; minimum raid 35 points; an "adaption" factor runs roughly 0.4 to 1.47 and falls when colonists die or go down, so a battered colony gets easier raids [R, S24]. Dwarf Fortress has five trigger levels: population 20/50/80/110/140 and created wealth 5,000/25,000/100,000/200,000/300,000 on Normal; Hard is roughly half (population 15/30/40/55/70) [R, S23]. A summary of the same page says level 1 brings ambushes only and level 3 starts sieges of about 10 regulars [S].
- **Manor Lords.** Setup offers raiders None, Medium (at most one raid per two years) or Frequent (under a year apart), plus 1 to 5 raider-free years [S, S20]. Player reports: the first raid showed a one-year countdown, the second came with no warning, and a commenter says warnings depend on a "track raiders" option [P, R, S20].
- **Other sizes (all [P], not reliable).** Farthest Frontier: raids every 3 to 4 years, mostly spring; 24 raiders to 80-90 [S19]. Dawn of Man: 18 to 23 groups in a small-town challenge [S35]. Kingdoms and Castles: first raids around year 25 to 35 as "two small boats" [R, S21].
- **Tribute.** Precedents: Zeus bribe [S, S7]; Farthest Frontier ultimatum [R, S19]. I found **no published tribute prices or formulas** for any game. Marked unverified.
- **Fails.** A first raid that outguns the starting defence; a second raid without warning; identical raids every time and unknowable spawn points (Kingdoms and Castles) [P, S21]; long waits for a wave (a They Are Billions player waited 45 minutes) [P, S26].

### Defence
- **Works.** Towers that shoot on their own; clustered, overlapping fields of fire around the vault or town centre [P, S19]; gatehouses that break up enemy formations [P, S20]; soldiers as a standing cost. Upkeep is real: Farthest Frontier towers cost upkeep even empty, soldiers cost gold to recruit plus pay, and one player mans towers only in raid years [R, P, S19]. Zeus call-ups pull citizens from jobs, which hurts the economy [S, S7]. Northgard mercenaries need kröwns to stay [S, S22]. Farthest Frontier archers run dry in 80-90 raiders [P, S19].
- **Fails.** Cosmetic walls, walls that just move the weak spot, and micromanagement (see principles 10 and 11).
- **Combat style.** Hands-off with one lever (Caesar III) or a single alarm (Dawn of Man) is the readable end. Fallout Shelter is simplest of all: a fixed raider route and your best fighters on the door floor [S, S27].

### Recovery
- Fire and raid losses that clear quickly are tolerated; ones that cost a reload are not (principle 8). Banished rebuilding returns some materials [S, S10]. Caesar III invasions have a temporary knock-on that clears: builders avoid fighting, immigrants avoid the city while enemies are present [R, S2]. Kingdoms and Castles raids hurt morale enough to stop immigration [P, S21]. In Fallout Shelter, reviving a dead dweller costs more the longer you wait [R, S27]. In Cities: Skylines a burned plot must be demolished before rebuilding [S, S17], a small friction Thebes's rubble clearing mirrors.

### Difficulty and toggles
- **Setup-time dials are the norm** (principle 12). Banished, Cities: Skylines (on/off plus frequency, but not per type [S, S17]), Anno pirates (toggle in custom games [S, S16]), Pharaoh: A New Era (easy mode, rule changes such as freezing worker pools, cheats that stop fire) [R, S5].
- **Fails.** A dial that does not change the feel: They Are Billions' lowest setting still punishes [S, S26]; Common Sense Media says the settings barely matter [S].
- **Compare.** Thebes's risk multipliers of 0.5, 1 and 1.5 are mild beside RimWorld's 0.1 to 2.2, and no game here lacks an off switch for raids. Not verified whether players want one in a cosy builder; the evidence says Pacifist modes are well received.

### Teaching the first threat
- Name the lesson, pause, give a goal: Caesar III's scribe note advises prefectures near the entry and Military and Fire Prevention as top labour priorities [R, S2]. Frostpunk's designers added a main goal (save resources for the storm) because without it the scenario felt too easy [R, S11]. Against the Storm's baseline storm mystery fires even at hostility 0 [S, S18].
- Timberborn shows a forecast with warnings; guides call the notice a final checkpoint, with the prep window opening earlier [S, S25]. First events are short (drought 1 day Easy, 2-3 Normal, 3-6 Hard) [R, S25].
- Fallout Shelter teaches through consequences only, which players found unfair [S, S27].

### Morale levers under pressure
- The evidence is thin. Frostpunk's levers are trade-offs: a 24-hour shift saves lives and raises discontent, and a broken promise hits hope and discontent together [S, S13]. Against the Storm: each hostility level above 0 cuts global Resolve by 2 (6 during storms) [S, S18]. Caesar III: winning raises morale [R, S2]. For a festival-as-pressure-valve, only the earlier Pharaoh note applies; I found no source testing it under raid pressure.

## 3. What to avoid, and flags on the current spec

**Avoid**
- Silent causes and silent losses (principle 6).
- A first threat before the player has the counter, or sized past it (principles 2, 3).
- A modal that freezes everything until answered, with no way to look around first.
- Walls that are decorative or merely redirect the attack; towers that need babysitting.
- Raids identical every time; spawn points the player cannot learn.
- Raid size that depends on what the player does during the warning (Thebes already fixes size at warning).
- Defence as a pure tax with no payoff beyond "nothing happened"; show what the tower stopped.
- A difficulty dial that only changes numbers, not the feel.
- Late-game raids that tune to zero, as with Banished, where reviewers said challenge fades as the town grows [R, S9].

**Flags for the spec (my arithmetic from section 4.3, not from sources)**
1. At 1x a month is 20 seconds, so the two-month warning is about 40 seconds of play, and a fire burning "a few game-days" lasts about 2 seconds. One Kingdoms and Castles reviewer reports "several minutes" before the alarm and Manor Lords players report a year-long countdown (real-time length unverified). Check that building, paying tribute and moving the camera all work while paused, or lengthen the warning.
2. The first raid at 2 game-years after 250 population is about 8 minutes of play at 1x. That fits principle 2 but leaves little teaching time.
3. Fixed raid size at warning and seeded ignition both match fairness evidence; seeded ignition also stops the Banished habit of reloading to dodge a tornado [P, S10].
4. Tribute pricing has no precedent to copy. Price it against the defence the player could have built, and show both on the same panel.

## 4. Sources

Tags as above. Not verified or not found: tribute prices (any game); Hooded Horse wiki figures (blocked on direct fetch, taken from search summaries); Frostpunk day-15 storm and stockpile figures (guide sites only); Timberborn warning lead time (sources disagree); Pharaoh and Caesar III numeric fire constants (manual gives none); Townscaper was not re-researched (see the earlier note); the 2019 Frostpunk GDC talk (S15) and Tynan Sylvester's 2017 RimWorld GDC talk (S24b) were not read, so no designer talk is cited as evidence; Northgard yielded nothing usable on raid warnings.

1. Caesar III manual, prefectures: https://www.caesar3augustus.com/book/sentiment/prefectures [R]
2. Caesar III manual, what to expect in battles: https://www.caesar3augustus.com/book/military/whattoexpectinbattles [R]
3. Caesar III, Wikipedia: https://en.wikipedia.org/wiki/Caesar_III [R]
4. Pharaoh, Wikipedia: https://en.wikipedia.org/wiki/Pharaoh_(video_game) [R]
5. Pharaoh: A New Era review, Shacknews: https://www.shacknews.com/article/134182/pharaoh-a-new-era-review-score [R]
6. City-Building Games wiki, Firehouse: https://citybuildinggames.fandom.com/wiki/Firehouse [S, blocked]
7. Zeus: https://www.mobygames.com/game/2640 and https://www.giantbomb.com/games/3030-3769/ [S]
8. Banished Steam threads: https://steamcommunity.com/app/242920/discussions/0/517142892053185898/ and https://steamcommunity.com/app/242920/discussions/0/517141807567891249/ [R]
9. Banished, Wikipedia: https://en.wikipedia.org/wiki/Banished_(video_game) [R]
10. Banished wiki, Disasters: https://banished.fandom.com/wiki/Disasters [S, blocked]
11. Frostpunk, IGC 2018 scenario-writing talk: https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing [R]
12. Frostpunk critical play report: https://lab.indienova.com/indie-game-review/critical-play-report-frostpunk/ [S]
13. Frostpunk, PC Gamer review: https://pcgamer.com/frostpunk-review [S]
14. Frostpunk lead designer quotes: https://tech.yahoo.com/general/articles/frostpunk-devs-theyre-not-depression-193645476.html [S]
15. Frostpunk and This War of Mine GDC 2019: https://gdconf.com/news/frostpunk-war-mine-devs-share-lessons-learned-gdc-2019 [not readable]
16. Anno 1800: https://anno1800.fandom.com/wiki/Emergency_services [S]; https://www.pcgamesn.com/anno-1800/anno-1800-riot [S]
17. Cities: Skylines: https://steamcommunity.com/app/255710/discussions/0/3058490685010859625 [R]; https://www.thesixthaxis.com/2016/08/24/cities-skylines-natural-disasters-are-both-deep-and-impactful/ [S]; https://vaporlens.app/app/515191/cities_skylines_natural_disasters [S, aggregator, low trust]
18. Against the Storm: https://www.gamedeveloper.com/road-to-igf-2023/how-against-the-storm-managed-to-mix-city-building-and-roguelite-play [R]; https://wiki.hoodedhorse.com/Against_the_Storm/Queen%27s_Impatience and https://wiki.hoodedhorse.com/Against_the_Storm/Forest_Hostility [S]
19. Farthest Frontier: https://farthestfrontier.com/?p=1210 [R]; https://forums.crateentertainment.com/t/journey-log-04-battle-for-survival/114702 [R]; https://steamcommunity.com/app/1044720/discussions/0/3809533595057222393 [R]; patch notes https://forums.crateentertainment.com/t/farthest-frontier-v0-9-6-hotfixes/142423 [S]
20. Manor Lords: https://steamcommunity.com/app/1363080/discussions/0/4362376451748813633 [R]; https://wiki.hoodedhorse.com/Manor_Lords/Game_setup/en [S]; https://steamcommunity.com/app/1363080/discussions/0/4362376451745848998/ [S]
21. Kingdoms and Castles: https://steamcommunity.com/app/569480/discussions/0/1458455461488557062 [R]; https://www.gog.com/en/game/kingdoms_castles?page=5 [S]
22. Northgard: https://steamcommunity.com/app/466560/discussions/1/6741412150958671254 [S, thin]
23. Dwarf Fortress wiki, Difficulty: https://dwarffortresswiki.org/index.php/Difficulty [R]
24. RimWorld wiki, Raid points: https://www.rimworldwiki.com/wiki/Raid_point [R]. 24b: Sylvester GDC 2017: https://gdcvault.com/play/1024232/-RimWorld-Contrarian-Ridiculous-and [not watched]
25. Timberborn wiki, Drought: https://timberborn.wiki.gg/wiki/Drought [R]
26. They Are Billions: https://bit-tech.net/previews/they-are-billions-preview/1/ [S]; https://www.gamereactor.eu/they-are-billions-review/ [S]
27. Fallout Shelter: https://mobilefreetoplay.com/a-deep-dive-into-fallout-shelter/ [R]; https://fallout-archive.fandom.com/wiki/Incidents [S]
28. SimCity BuildIt (disasters are player-triggered for rewards, not a threat): https://www.ea.com/en-gb/news/simcity-buildit-disasters-update-available [S]; https://vulcanpost.com/266621/simcity-buildit-tips-and-guide/ [S]
29. Pocket City: https://toucharcade.com/2018/07/31/pocket-city-review/ [S, blocked]; https://www.imore.com/pocket-city-review [S]
30. Townsmen mobile: https://www.handy-games.com/games/townsmen-mobile/ [S]; https://www.digitallydownloaded.net/?p=43333 [S]
31. Kingdom Two Crowns: https://steamcommunity.com/app/701160/discussions/0/4638239688793009104 [S] (blood moons poorly telegraphed, per players)
32. Dorfromantik: https://www.switchbladegaming.com/cozy-games/dorfromantik-guide/ [S]; https://gog.com/news/binterview_toukana_interactive_tells_us_more_about_dorfromantikb [S]
33. Telegraphing and fairness: https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing [R, an action-game piece: a hit feels earned only if the threat was clear]; https://www.keywordsstudios.com/en/about-us/news-events/news/what-is-player-agency-a-practical-guide-for-modern-game-teams/ [S]
34. Caesaria patrol bug report: https://bitbucket.org/dalerank/caesaria/issues/569/prefectures-are-not-working [S]
35. Dawn of Man Steam threads: https://steamcommunity.com/app/858810/discussions/0/1628539187778451311 [S]
