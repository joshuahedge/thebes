# Thebes: scoring, "each time" structures, ethical engagement, sharing without a backend

Researched 11 Oct 2026. Builds on the existing notes (goals, firsts, daily goals, tips, nudge, achievements) and does not repeat them. Bracketed numbers [n] point to the source list at the end. "Via search summary" means the page itself blocked direct reading. **Unverified** marks claims I could not confirm.

## 1. Short version: 14 recommendations

1. **Rate the city in named parts, Pharaoh-style, not as one opaque number.** Pharaoh missions gate on five scales (population, culture, prosperity, monument, kingdom); Iunet asks 4,000 people, culture 30, prosperity 30, monument 9, kingdom 65 [4]. Each Thebes part is a 0-100 bar with its top reason in words, so the score doubles as a tutor. Stage 1 has People, Prosperity, Culture; add the rest as systems arrive. [1][2][3][4]
2. **Measure against size, from state, never from actions.** Caesar III culture compares active buildings with population, so the target moves as you grow [3]. Score what the city is, not how often you clicked. [2][3]
3. **Show a small live number; give the full breakdown on a sheet and at the end.** Mini Metro, Islanders and Dorfromantik show score live; Slay the Spire and Tropico tally at the end [8][10][11][12][14]. Islanders previews points in the ghost before you commit [10]. Thebes already shows "Gives water to 6 homes", so add "+3 Culture".
4. **Make personal best the default comparison.** Dorfromantik's aim is "beat your previous best" [12]; Islanders' only multiplayer is a best-score board [10]. With no server, PB per seed and per difficulty is the honest ladder.
5. **Score at each milestone (Village to Capital) as splits.** Speedrunners compare ahead/behind per split against a personal best, and "best segments" sum to a possible ideal [19]. Show "Town: 2 years faster than your best" (my adaptation). Years of city time, not wall-clock time.
6. **Seal a "reign" instead of forcing an end.** Islanders and Two Point Hospital let you stay and keep building after the target [10][17]; Anno's sandbox goals never stop play [9]. A "Seal this reign" button freezes a chronicle entry (score, parts, seed, medal) while the city lives on.
7. **Bronze/silver/gold from playtest percentiles, with the next threshold always visible.** Trackmania medals sit roughly 1.07-1.11x, 1.21-1.25x and 1.50x the author time (three examples, ratios computed from a search summary, not official) [18]. Tune Thebes medals by your own and friends' runs.
8. **One seeded challenge map per week, derived from the date, played offline.** Slay the Spire's daily is one seed plus three random modifiers [14]; Spelunky gives everyone one level a day [15]. Weekly, not daily, avoids the "playing by appointment" dark pattern [20].
9. **Share a seed + score code in a URL fragment.** The fragment never reaches a server; compress with `deflate-raw`, base64url, add a version byte [31]. A friend opens the link, plays the same seed, and sees "Your best: 612, theirs: 701".
10. **Share a card, Wordle-style.** Wordle's grid shows effort without spoiling, copies to the clipboard, and needs no account [29]. Render the city and part bars to a canvas, send via `navigator.share({files})`, fall back to download [30].
11. **Be honest that codes are unverifiable.** A client-side checksum stops typos, not cheats [32]. Label scores "friends' honour". Later option: embed a seed + command log so anyone can "Replay it" (the Crimsonland model) [32].
12. **Name optional style bonuses.** Slay the Spire's end screen lists 28 named rows (Highlander 100, Pauper 50, Light Speed 50) [14]; Dorfromantik's challenges unlock tiles and skins that push players to try different styles [12b]. Ten Thebes ones ("No debt month until Town", "Fed everyone 12 months running") give replay goals; they never gate content.
13. **Use honest progress mechanics for the early game.** An endowed head start raised redemption from 19% to 34% [26]; people speed up near a reward [26]. Start the goals list with "Founded Thebes" already ticked and show a "Town: 83 of 150" bar. Disclose why, and never frame leaving as loss.
14. **Variable in content, fixed in payout.** Vary seeds, small events, and citizen remarks. Keep gold rewards fixed or tightly capped, with odds visible. Hopson's test: acceptable if the designer believes the player ends up happier [22]. Never use near-miss tricks (section 3).

## 2. Scoring, with numbers

**City-builder ratings that gate progress**
- **Caesar III:** four ratings (culture, prosperity, peace, favor) against population [1]. Prosperity rises with low unemployment, income above spending, wages above Rome's, villas over shacks, food variety; falls with subsidies and unpaid tribute. No point values are published on the page [2]. Culture counts only staffed buildings [3]. Sandbox has no formal victory [1].
- **Pharaoh:** targets rise by mission: Iunet 4,000 pop / culture 30 / prosperity 30 / monument 9 / kingdom 65; Rowarty 7,000 / 65 / 50 / 29 / 80 [4] (via search summary). Kingdom decays about 1 per year in A New Era per one player (**unverified**, remake). Update notes mention a Ratings Overseer panel [5].
- **SimCity (1989 / Micropolis):** a 0-1000 score; seven penalties (crime, pollution, land value, tax rate, traffic, unemployment, fires) plus an unemployment term that can add points; best algorithmic city 949.5 at 1% tax [6] (via search summary). One guide: 500+ better than average, 800+ very successful (version unclear).
- **Civilization:** forum reverse-engineering disagrees. Civ IV: population 50%, land 20%, tech 20%, wonders 10%, scaled to 10,000 [7a]. Civ II: happy citizen 2, content 1, wonder 20, future tech 5, polluted square -10 [7b]. Civ VI: 2 per tech; early wins lower Hall of Fame rank [7c]. **All unverified against developer sources.** The disagreement itself says players want a score they can read.
- **Tropico (original):** end score from happiness, economy, Swiss-bank savings and difficulty; custom games run 10-70 years [8]. Tropico 6 elections are every ten years; its end score is **unverified**.
- **No score at all:** Anno 1800 (statistics menu, optional sandbox goals) [9]; Banished (no victory; achievements list **unverified**).
- **Against the Storm:** grace and impatience meters; every expedition's resources feed the upgrade tree, win or lose [9b] (via search summary). Losing still progresses.

**Run-based scores**
- **Mini Metro:** score is passengers delivered; run ends at overcrowding; typical normal run 10-20 minutes; Endless scores passengers per day; the daily challenge is "an evening ritual" [11b][11c].
- **Islanders:** each building has a base score plus neighbour effects, previewed in the ghost; thresholds restock the inventory and unlock the next island; cumulative score; global best-score board [10]. Reported numbers (house 1, +1 per house or park, city centre 6, windmill -20 for a second one) are from one review (**unverified**) [10b]. New Shores reportedly applies boon and undo multipliers; sources disagree on whether they multiply or add [10c]. A penalty for undo punishes the accessibility feature; avoid.
- **Dorfromantik:** 10 per matched edge, 60 for a perfect tile (which also adds a tile); quests and closed features refill the stack; run ends when it is empty [12]. Devs: the most frequent action must feel best [12b].
- **Slay the Spire:** 5 per floor, 2 per enemy, elites 10/20/30, bosses 50/100/150, +5% per Ascension level [14]. Readable because every row is named.
- **Polytopia:** Perfection is 30 turns; difficulty and opponent multipliers; a patch changed temple scoring (reported 50 to 100) so older scores stopped matching [16] (fan sources). Star thresholds **unverified**.

**What makes a score feel fair (synthesis from the above)**
Derived from visible state; named parts with causes; previewed before commit; relative to city size; stable (version the formula, as the Polytopia change shows); failure still yields something (Against the Storm); never rewards unwanted play. An essay calls Spelunky's daily scoring "a bad idea" after "a disturbing trend" in its high-score lists; the reason is behind a paywall (**unread**) [15c].

## 3. Structures for "each time"

- **Endless vs ended:** Pharaoh's new map per mission lost players around mission three (existing notes). Better models: Islanders (end when buildings run out, stay as long as you like), Two Point Hospital (one star unlocks the next hospital, return any time) [10][17], Tropico (player picks 10-70 years) [8]. Thebes hybrid: no forced end, optional seal.
- **Run lengths seen:** Mini Metro 10-20 min [11b]; Islanders about 45 min per sitting and "half an hour or less" per island (third-party) [10d]; Polytopia Perfection 30 turns [16]; Slay the Spire bonuses at 45 and 60 minutes [14]. Target a satisfying sitting of 20-40 minutes to Town; confirm by play-testing.
- **Seeded challenges:** Slay the Spire's daily counts only your first run (stops grinding) and Custom Mode lets you set a seed but disables boards [14]. Spelunky: one attempt a day; gambling wheel locked so luck does not skew results; leaderboard compares money and depth; no replays recorded [15]. Dorfromantik's monthly mode uses a set starting map (**unverified detail**) [12c]. Mini Metro's daily needs internet [11d].
- **Thebes version:** the weekly seed comes from the date (no server), unlimited attempts, best counts, no leaderboard. Optional rule modifiers from the seed ("Dry year", "Generous caravans") add variety.
- **Ghosts:** per-milestone splits and a faint "best run" line on the people graph, not a moving ghost city (my adaptation of [19]).
- **Medals:** see recommendation 7. Trackmania mappers set them by hand: a messy-run style for bronze, a top-50 target for silver; bronze often proves too hard [18]. Two Point-style stars from objectives (not points) are an alternative: 1 star = Town, 2 = all parts above 50, 3 = a style bonus.

## 4. Ethical engagement for the first 10-30 minutes

- **Self-determination theory (Ryan, Rigby, Przybylski):** need satisfaction predicted game preference and motivation to keep playing across four studies [23]. Competence = clear feedback and challenge matched to skill; autonomy = choices about goals and strategies; relatedness = connection. Check every new mechanic against these three.
- **Hodent:** wants ethics evidence-based; calls purposely deceptive UI and continued in-game rewards "punishing engagement" [21].
- **Hopson:** a reward schedule is ethical if the designer believes players end up having more fun; a loyalty card is not manipulative. Princeton: players mostly prefer variable schedules, but wide ranges exhaust them [22].
- **Koster:** fun is mastery and learning; too easy and too hard both bore [24]. **Schell:** Surprise, Curiosity and Endogenous Value lenses; an early "hook" in the interest curve [25].
- **Honest near-miss:** Clark 2009 showed slot near-misses felt unpleasant yet raised the urge to continue, but only when the player pressed start, and near-misses carry no information in random games [27]. In skill games attention to a near-miss is rational. So show honest gaps ("38 points to Silver"); never stage fake ones.
- **Juice:** "maximum output for minimum input" [34]; spend it on the most repeated action (placing), and keep it from obscuring mechanics.
- **Concrete mechanics that pass:** endowed first ticks; one visible next threshold; three-tier celebrations (existing); named style bonuses; the weekly seed; a chronicle that credits what you did; PB deltas; collectible cosmetic stamps per sealed reign (no power). Rule of thumb: skipping any of it costs the player nothing.

## 5. Sharing without a backend

- **Wordle:** the result copies as a spoiler-free coloured grid; the creator left out a link as "trashy" and liked its mystery; no account, no notifications, one puzzle a day [29]. Thebes needs a link so friends can reach the seed, but can keep the grid: five emoji bars for five parts.
- **Image card:** canvas `toBlob`, wrap in a `File`, call `navigator.canShare({files})` then `navigator.share` from a click, inside try/catch; HTTPS only; fall back to download [30]. Generate the blob before the click so the gesture does not lapse.
- **Link:** `#t1.<seed>.<score parts>.<years>.<check>` in the fragment; `CompressionStream('deflate-raw')` is supported since May 2023 (Chrome 80, Edge 80, Firefox 113, Safari 16.4) [31]; keep under about 2,000 characters; validate and cap decoded size.
- **Friend comparison:** the link opens a "Beat 701?" page; your PB sits beside theirs; no server needed. Include the formula version so mismatched builds say so.
- **Verification:** none is possible against a determined cheater without a server or third-party replay; replay logs need fixed timesteps and stable maths [32]. Label unverified.
- **Townscaper note:** its spread came from its creator's own GIFs and a "display mode" in his earlier project, not a share button [33]. A clean screenshot mode (hide UI) is cheap and worth adding.

## 6. What to avoid, and why

- **Streaks, appointment play, daily-only rewards, FOMO timers:** named dark patterns [20]; already ruled out.
- **Global leaderboards:** cheated within days (Slay the Spire boards "always ruined by cheaters", player report [14]); effects on low-ranked players are mixed, high ranks bred complacency [28].
- **One-attempt-a-day locks:** punish casual players and invite the scoring distortions Spelunky showed [15].
- **Opaque or shifting formulas:** Civ players reverse-engineer scores and get conflicting answers [7]; Polytopia's temple change broke comparisons [16]. Publish the formula; version it.
- **Penalising undo, pausing or slow play, or scoring wall-clock speed:** Islanders' undo multiplier and Slay the Spire's Speedster pressure players; score game-years.
- **Fake near-misses, loss-framed progress bars** ("you will lose your 80%"): critics note bars magnify proximity and frame stopping as loss [26].
- **Referral rewards or sharing nags:** "social pyramid scheme" [20]. Sharing is opt-in only.
- **Achievement-gated content:** frustrates players (Dorfromantik, existing notes); keep stamps cosmetic.
- **Treating the taxonomy as a checklist:** endowed progress, collections and variable rewards appear in the 28-pattern list [20b], but a 2020 DiGRA paper argues "dark" depends on intent and player state [20c]. Judge by honesty and skip-ability.

## 7. Sources

[1] Caesar III: https://en.wikipedia.org/wiki/Caesar_III
[2] Caesar III prosperity: https://www.caesar3augustus.com/book/gameratings/prosperity
[3] Caesar III culture: https://www.caesar3augustus.com/book/gameratings/culture
[4] Pharaoh missions (via search summary): https://citybuildinggames.fandom.com/wiki/Iunet_(Pharaoh) ; https://impressionsgames.fandom.com/wiki/Rowarty
[5] Pharaoh update notes: https://sierrahelp.com/Documents/Misc/Pharaoh_Appendices.html
[6] SimCity score: https://jeffquast.com/post/a-perfect-simcity
[7] Civ: a https://apolyton.net/forum/civilization-iv/civilization-iv-general/164451-how-is-the-civilization-iv-score-calculated ; b https://civfanatics.com/?p=714 ; c https://www.keengamer.com/articles/guides/5-civilization-vi-tips-for-score-victory-conditions/ ; Civ V https://forums.civfanatics.com/threads/score-calculations.609108
[8] Tropico: https://en.wikipedia.org/wiki/Tropico_(video_game)
[9] Anno: https://steamcommunity.com/app/916440/discussions/0/3827541651934257703 ; Against the Storm b https://eremitegames.com/progression-update/ ; https://www.pcgamer.com/against-the-storm-review/
[10] Islanders: https://en.wikipedia.org/wiki/Islanders_(video_game) ; b https://turnbasedlovers.com/review/islanders-new-shores-impressions/ ; c https://checkpointgaming.net/reviews/2025/07/islanders-new-shores-review-a-whole-new-world/ ; d https://playpile.gg/games/islanders
[11] Mini Metro: https://en.wikipedia.org/wiki/Mini_Metro_(video_game) ; b https://www.gamedeveloper.com/design/let-s-talk-about-mini-metro ; d https://www.untappedcities.com/build-your-own-subway-system-with-mini-metro-game/
[12] Dorfromantik: https://filmstories.co.uk/?p=83460 ; b https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i- ; c https://en.wikipedia.org/wiki/Dorfromantik
[14] Slay the Spire: https://slaythespire.wiki.gg/wiki/Score ; https://slaythespire.wiki.gg/wiki/Custom_Mode ; https://intothespine.com/2018/03/05/slay-the-spire-daily-climb/
[15] Spelunky: https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_(HD) ; c https://theludite.com/tag/daily-challenge/
[16] Polytopia (fan/search summaries): https://polytopia.fandom.com/wiki/Singleplayer ; https://twt.omada.cafe/r/Polytopia/comments/1nl1oay/crazy_high_score
[17] Two Point Hospital: https://en.wikipedia.org/wiki/Two_Point_Hospital
[18] Trackmania medals: https://blog.vjeux.com/?p=5346 ; https://tm.mania.exchange/blogs/entry/569/what-do-you-think-medal-times ; https://devtrackers.gg/trackmania/p/92351a6c-totd-20-05-2023-seasonal-sprint-by-evo-xlrb-discussion
[19] Split comparison: https://sourceforge.net/app/livesplit/ ; https://miniwebtool.com/speedrun-split-timer/
[20] Dark patterns: https://research.chalmers.se/en/publication/177148 (Zagal, Björk, Lewis 2013) ; b https://arxiv.org/html/2412.05039v1 ; c https://eprints.whiterose.ac.uk/156460/1/DiGRA_2020_paper_189.pdf
[21] Hodent / Ethical Games: https://www.gamedeveloper.com/business/ethical-games-looking-to-craft-industrywide-ethics-code-seeks-developer-input
[22] Hopson: https://www.gamedeveloper.com/design/behavioral-game-design ; https://www.cs.princeton.edu/techreports/2012/931.pdf
[23] SDT/PENS: https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/ ; https://journals.sagepub.com/doi/10.1037/a0019440
[24] Koster: https://www.engadget.com/2012-10-10-gdc-online-2012-raph-kosters-keynote-on-a-theory-of-fun-10-ye.html ; https://raphkoster.com/gaming/ethicsofonlinedesign.shtml
[25] Schell: https://circa.cs.ualberta.ca/index.php/CIRCA:The_Art_of_Game_Design_-_Jesse_Schell ; https://karlkapp.com/?p=1653
[26] Endowed progress and goal gradient: https://thinkinsights.net/consulting/endowed-progress-effect ; https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf
[27] Near-miss: https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/
[28] Leaderboards: https://www.emerald.com/insight/content/doi/10.1108/intr-12-2021-0897/full/html ; https://experts.umn.edu/en/publications/gamification-of-task-performance-with-leaderboards-a-goal-setting/
[29] Wordle: https://www.boston.com/news/national-news/2022/01/04/he-made-wordle-for-his-partner-now-its-an-online-hit/ ; https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth ; https://nishad.substack.com/p/why-wordle-won
[30] Web Share: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare ; https://web.dev/patterns/files/share-files
[31] URL state: https://web.dev/blog/compressionstreams ; https://leanrada.com/notes/compressing-websites-into-urls/
[32] Replay and cheating: https://devfolio.co/blog/when-the-dino-hopped-onchain ; https://www.mintlify.com/banteg/crimson/cli/replay/overview ; https://bugnet.io/blog/how-to-fix-replay-verification-failing-from-nondeterministic-simulation ; https://gamedev.net/forums/topic/643789-how-to-prevent-cheating-in-html5-game
[33] Townscaper: https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town
[34] Juice: https://gamedeveloper.com/design/video-is-your-game-juicy-enough-

Not covered: Zeus's rating numbers, Frostpunk's end report, Mini Metro's daily seed details, and Dorfromantik's monthly seed (all searched, none confirmed). Search summaries sometimes paraphrase forum posts; treat fan-sourced numbers as indicative.
