# Onboarding and light gamification: research notes for Thebes
Read 10-11 Oct 2026 (one session that crossed midnight) as design reference for the guided start, tips, idle nudges, celebrations, daily goals and achievements. Raw notes, not a spec.
Method: web searches plus summarising fetches of primary pages where they loaded (developer posts, GDC listings, NN/g, Xbox and Game Accessibility Guidelines, W3C, MDN). Everything is paraphrased. At most one quote per source, under 15 words. Quotes came through a summarising fetch, so check the wording before reusing one.
"UNVERIFIED" marks claims seen only in search snippets, fan wikis or secondary write-ups. The numbers in each "Rules for Thebes" block are my recommendations, meant as starting values for playtesting, unless a source is named.
Sources with URLs and read dates are in section 10. Related notes: ../pharaoh-heaven/ (mechanics digests).

---

## 1. Onboarding in strategy and sim games

### What the sources say
- **Celia Hodent, GDC 2016 "The Gamer's Brain, Part 2: UX of Onboarding" (slides and notes on her blog).** "Playing a game is a learning experience." Her main points:
  - People learn by doing. Text boxes and voice-over mostly give shallow learning.
  - Working memory is small: give a new player about **three** new things at once.
  - Attention is a spotlight, and two things competing at once hurt learning.
  - People forget. Memory needs spaced repetition and in-game reminders.
  - Teach the "why" before the "how".
  - Don't punish players while they are learning.
  - Show locks before keys, so players can see what is coming.
- **Factorio, Friday Facts #241 (Wube, May 2018).** An honest critique of their own old tutorial:
  - It took 30-45 minutes to reach automation, the core loop.
  - Players were so constrained that they learned the tutorial, not the ideas.
  - "Collect N of X" tasks had no purpose beyond the instruction.
  - Three guidance channels repeated each other.
  - The fix: "Teaching by experimentation instead of jumping through arbitrary tasks." Let players find their own solutions, carry progress from one lesson to the next, and use one channel.
- **Dan Cook, "The Chemistry of Game Design" (2007).** A "skill atom" is a loop: act, the game updates, the game gives feedback, the player updates their mental model. Atoms link into chains.
  - Players usually go round an atom several times before it clicks.
  - Atoms that lead nowhere interesting get abandoned, and that blocks everything further down the chain.
  - Teaching a skill the player already has bores them. Assuming a skill they lack blocks them: "Don't assume skills that may not be there."
- **Raph Koster, A Theory of Fun.** Fun is learning patterns, and a mastered pattern goes stale. UNVERIFIED wording: seen only in summaries.
- **Half-Life 2.** Threats are introduced safely first: you watch a barnacle eat a bird before you are ever at risk. Layout then leaves one solution to discover. UNVERIFIED detail: secondary write-ups only.
- **Nintendo's four-step levels** (GMTK on Super Mario 3D World). Introduce an idea safely, develop it, twist it, conclude, all in about five minutes. Based on search summaries only.
- **Into the Breach.** Justin Ma (Game Developer, Feb 2018): "We wanted to make something where every death felt like your own fault." So attacks are announced before they happen and there is no hidden randomness. A Rock Paper Shotgun piece (read via a repost) says they dropped good ideas that couldn't be shown clearly.
- **"Training wheels" studies (NN/g, Nielsen 2006, on Carroll et al.).** Users given a cut-down feature set at first were 21-26% faster and learned 21-69% more. Once given full access later, they were still 52% faster than users who had everything from the start. This is the best evidence for showing less at first.
- **City builders:**
  - **Cities: Skylines II** (dev diary, Oct 2023). Uses an early task list, hints the first time a panel opens, an "Advisor" archive where any step can be reopened, and an on/off switch: "Tutorials are optional and can be turned on or off at any time." Criticised in a review (Ian Boudreau, Oct 2023) after a misclick opened a twelve-slide text tour, and for telling instead of showing.
  - **Civilization VII** (Ed Beach, Feb 2025). The tutorial is on in the first game, tips appear on first contact, and there are four advisors you can choose between. After that, an "Only Warnings" mode speaks up only before a major setback.
  - **Frostpunk 2.** Criticised for long reading; the lead developer's advice was "play slowly, use pause" (UNVERIFIED: reviews).
  - **Against the Storm.** A two-phase tutorial, reworked in patches; reviews mixed.
  - **Anno 117.** The campaign is the on-ramp, with an advisor. Endless mode can keep tutorials on "without artificial restrictions".
  - **Two Point.** The first level is the tutorial, with tiered star objectives (fan guides).
  - **Islanders.** No real tutorial: the placement preview shows the points gained or lost before you commit.
  - **Townscaper.** A self-described toy with no goals.
- **Not found:** a primary source for "Tutorials are dead", the "Game UX Master Guide", and Civ VI advisor design. Don't cite these yet.

### Rules for Thebes (onboarding)
1. **One goal at a time** in the guided phase (road, 6 plots, well, farm, granary, bazaar, temple, 100 people), then **up to 3** (Hodent).
2. **Each step has three parts:** a "why" line of 15 words or fewer, a verb-first instruction, and "Show me". It completes on a **world-state check**, never on reading or pressing "Next".
3. **Time targets** for a new player at normal speed:
   - first road and plot within **60 s** of the first goal appearing;
   - first house occupied within **3 min** of first unpause;
   - the whole chain in **10 min or less**.
   If it takes longer, cut steps (Factorio's lesson).
4. **Teach the concept, not a route.** The guide adds no placement limits beyond the normal rules.
5. **One channel:** guided steps, tips, nudges and first-time-event goals all appear in the goals strip.
6. **Preview before commit:** every placement preview shows its effect (reach, coverage, desirability, cost) (Islanders, Into the Breach).
7. **Gentle first hazards:** the first occurrence of each hazard is softened (for example, the first fire spreads slowly and threatens one building) and arrives as a goal.
8. **A guidance setting: Full / Tips only / Warnings only / Off** (CS2, Civ VII). The first screen offers a one-tap "I know city builders: tips only".
9. **A Guide list in Help** holds every lesson and tip seen, and each can be replayed (CS2 Advisor; XAG 109).

---

## 2. Highlighting and dimming, skip and resume, out-of-order play

### What the sources say
- **NN/g, coach marks (Aurora Harley, 2014).**
  - Coach marks are often unnecessary. Use them for unusual features, not to label everything.
  - Show **one tip per interaction**: chains of tips get dismissed faster.
  - Short tips in context beat walkthroughs, because people can't hold instructions in mind.
  - Point at the element the tip is about, make tips look different from real controls, and show them when the person first reaches that spot.
- **NN/g, tutorials vs contextual help (Page Laubheimer, 2023).** Upfront tutorials interrupt, get skipped and are forgotten. "Users want to start using the product right away." Help should be easy to dismiss and easy to find again.
- **NN/g, help and documentation (Alita Kendrick, 2020).** "Push" help (arriving regardless of context) gets ignored. "Pull" help (responding to what you are doing) gets read. Keep proactive help retrievable after it is dismissed.
- **Training wheels vs Factorio.** Limiting the start helps; heavy constraint teaches the tutorial, not the game. Middle path: de-emphasise, don't lock.
- **CS2's misclick trap.** Dismissing a tutorial must never destroy access to it.
- **WCAG 2.2 at AA:**
  - 2.4.11 Focus Not Obscured: a focused control must not be fully hidden by overlays the page shows.
  - 1.4.13 Content on Hover or Focus: popups must be dismissible (Esc), hoverable and persistent. W3C: "Unpredictable temporary content can be hard for some to consume."
  - 1.4.3 Contrast (from the standard's text, not fetched): only *inactive* controls are exempt. A dimmed card that still works must keep 4.5:1 text.

**Players who go off-script.** Make each step a check on the state of the city, not a fixed sequence of clicks. If the well is built before the plots, the well step ticks as soon as the guide reaches it. Nothing is ever undone or redone.

### Rules for Thebes (highlighting, skip, resume)
1. **Highlight the target, not the room:** outline the target card and the target tiles. No dark scrim over the map.
2. **Pulse at most 3 cycles (about 3 s),** then hold a static outline, and never more than 5 s of motion (WCAG 2.2.2). With reduced motion: no pulse, a thicker static outline and a pointer icon.
3. **Dimmed cards stay usable with 4.5:1 labels:** lower the icon saturation and add a "Suggested" tag to the target. Tapping a dimmed card works, with a note: "Not needed yet. You can still build it."
4. **Undim each card for good** once that building has been placed. Undim everything when the guide ends or is skipped.
5. **Out of order is fine:** a step already met ticks on arrival, and the strip moves to the first unmet step.
6. **Skip takes one tap, with no confirmation.** A one-line status ("Guide off. Turn it back on in Help.") stays until the next action. "Resume guide" lives permanently in Help and Settings.
7. **Resume is automatic:** guide progress is saved with the city and resumes at the first unmet step. The "Welcome back" card names it.
8. **Never hide focus:** pointer text never covers the focused element or the target, and Esc closes any tip.
9. **Never auto-open a multi-slide lesson.** Show one sentence plus "More", which opens the Help entry.

---

## 3. Contextual tips

### What the sources say
- **Pull, not push (NN/g).** Tie each tip to the moment it is needed, keep it short, make it dismissible and retrievable.
- **Hodent: memory fades.** One reminder when a problem comes back is legitimate. Endless repeats are not.
- **CS2 and Civ VII.** CS2 archives every hint it shows. Civ VII fires tips on first contact with a system.
- **XAG 116 Time limits.** Tutorial text and notifications that vanish on a timer count as UI time limits. Either the player can lengthen the time to **10 times the default**, or the element stays until dismissed.
- **XAG 109.** Interruptions not about the current objective should be possible to postpone or switch off.
- **Game Accessibility Guidelines (GAG).**
  - Contextual help: intermediate.
  - Text at the player's own pace: basic.
  - Replay all instructions: advanced.
- **WCAG 4.1.3 Status Messages (AA).** Announce results and state changes with `role="status"`, or `role="alert"` for urgent ones, without moving focus.
- **Interstellar Connection devlog.** A player asked for hints to stay until dismissed so slower readers aren't rushed. This is one player's request; UNVERIFIED as a general rule.

**Placement on a phone.** No source gives a phone layout for city builders. The general rules point to the edge of the screen, the place the player already looks for guidance, and never the play area. For Thebes that is the goals strip: a tip temporarily replaces the strip's goal line, and the goal stays one tap away. No new panel opens.

### Rules for Thebes (tips)
1. **Triggers only:** a tip fires on its trigger, never at launch and never on a timer.
2. **Cap: 1 unprompted tip per 3 minutes of unpaused play, and 5 per hour.** Guided steps and tips the player asked for don't count.
3. **Never mid-gesture:** wait until placement or dragging ends, then **2 s** with no input.
   - If the tip's condition no longer holds, drop it.
   - The queue holds **1** tip, in priority order: danger, then blocked action, then information.
4. **Once per device:**
   - Keep a "seen tips" list in browser storage, wrapped in try/catch.
   - "Reset tips" goes in Settings.
   - A danger tip may show **once more** if the problem returns at least **20 min** later.
5. **Short:** 20 words or fewer, verb first, an optional "Show me", and a close button.
6. **No timeout:** a tip stays until dismissed or until its condition clears. Announce it with `role="status"` and never take focus.
7. **Every seen tip goes into the Guide list.** A "Tips" switch in Settings turns unprompted tips off.

---

## 4. Idle "what to do next" nudges

### What the sources say
- **XAG 109.** Offer optional hints when the player seems stuck. The wait "varies by game/genre".
- **No agreed timing.** Puzzle games often use **10-15 s** of no input (devlogs; UNVERIFIED as a rule). In a city builder, watching the city is play, so those timings are far too short.
- **Hints can backfire:**
  - A University of Washington study found four hint systems all lowered performance in an educational game (snippet; UNVERIFIED).
  - An Illinois thesis found vague hints rated worse than none.
  - A 2024 Waterloo thesis on a strategy game found hints cut effort so far that learning suffered, and players valued agency most.
- **Nintendo's Super Guide (2009).** Help appears only after repeated failure and is offered, never forced.
  - Miyamoto refused to put it on the main menu.
  - The team debated 3, 5, 8 or 10 failures (Vooks, from Iwata Asks). The released game uses 8 deaths in a row (fan wiki).
- **Pocket City.** Quests pull the player forward, with no ads.
- **SimCity BuildIt.** Long timers and paid speed-ups bring players back (Macworld, Deconstructor of Fun). Avoid this; its own lead designer warned against "you wait, or you pay".
- **Islanders and Townscaper don't nudge at all.**

**Choosing the next action.** Base it on goals: name the single most useful thing the player can do now with what they have. If they can afford nothing useful, the honest nudge is "your treasury grows each month".

### Rules for Thebes (idle nudges)
1. **Trigger (all of these must hold):**
   - the game is unpaused, the tab is visible and no menu is open;
   - **45 s** have passed with no meaningful action and no progress on the current goal;
   - a next step is actually possible.
   Meaningful actions are placing, demolishing, opening a build card or completing a goal. Panning the camera doesn't count as progress.
2. **Paused start (first session only):** if the game has been paused for **30 s** after the first goal with no action, highlight the Play control once: "Press play to let people arrive".
3. **Two stages, never three:**
   - Stage 1: a silent glow on "Show me".
   - Stage 2, after **another 60 s**: one line in the strip naming the action.
   That is one cycle per goal, reset when the goal changes.
4. **Priority:** (a) an urgent problem with an affordable fix, then (b) the current guided goal, then (c) the requirement blocking the most houses from their next tier, then (d) an open daily goal. Use a fixed tie-break.
5. **Failure trigger:** **3 blocked placements of the same building within 30 s** offers "Show me where it fits". It is offered, never automatic.
6. **Off by default after the guided phase.** "Warnings only" keeps stage 2 for urgent problems. No nudges in sandbox mode unless the player turns them on.
7. **Nudges are silent:** never a sound, never a camera move, never an auto-opened panel.

---

## 5. Celebrations and "juice"

### What the sources say
- **Jonasson and Purho, "Juice it or lose it" (2012).** A plain breakout clone made satisfying with colour, easing, squash and stretch, sound, particles, screen shake, and faces on the blocks (from a summary; I didn't watch the talk).
- **Nijman, "The art of screenshake" (2013).** Screen shake with a small kick-back on firing, and enemies flashing white when hit (as described in the survey below).
- **Pichlmair and Johansen, game-feel survey (2020).**
  - Effects are layered according to how significant an event is.
  - Kao's study: **medium and high juice beat both none and extreme**.
  - Lars Doucet warns heavy juice "makes it hard to learn what aspects of interactivity have mechanical importance".
- **Folmer Kelly (2014).** Eye candy without regard to context costs immersion.
- **Hicks and colleagues.** Define juice as redundant feedback and say the evidence that it helps is thinner than its popularity. A Waterloo exergame thesis found enjoyment rose once some embellishment was present, then plateaued.
- **XAG 117 Visual distractions and motion.** Avoid camera shake or let players turn it off. Let players pause or hide moving content.
- **WCAG motion criteria.** 2.3.3 (AAA): motion triggered by interaction can be disabled, using `prefers-reduced-motion`. 2.2.2 (A): automatic motion over 5 s needs a pause control.
- **Hecker (GDC 2010) and Madigan (2016).**
  - Rewards that are expected, tangible and tied to finishing a task can weaken intrinsic motivation.
  - Unexpected, informational feedback can strengthen it.
  - Hecker's advice: don't make a big fuss, use rewards from inside the game, and make them informational rather than controlling.
- **Web haptics.** `navigator.vibrate()` needs prior user interaction (MDN). It is **not supported on iOS Safari at all**, and Firefox dropped it from version 129 (caniuse). Android Chrome supports it. Apple's haptics guidance page didn't load, so I have nothing from Apple.
- **GAG.** Make sounds for key events distinct, provide separate volume controls, and provide a haptics toggle.

### Rules for Thebes (celebrations)
1. **Three tiers, scaled to importance:**
   - **Small:** firsts of a kind, such as the first home filled. A local effect of **0.5 s or less**, plus one line in the strip.
   - **Medium:** the first harvest, the first month in profit, a daily goal done, an achievement. **1.2 s or less**, plus a strip banner.
   - **Large:** city rank milestones (Village, Town and so on). A top-edge banner for **2.5 s or less**, plus a gentle effect at the building. Nothing over the middle of the map.
2. **Nothing blocks play:** no focus grab, no pause, nothing to tap away. Banners that hide themselves are copied to a "Recent" log (`role="log"`).
3. **No screen shake and no full-screen flashes;** never more than 3 flashes per second (WCAG 2.3.1, from the standard).
4. **Reduced motion** (the OS setting, or an in-game toggle that overrides it either way): swap movement for a colour or fade change of **200 ms or less** and a static icon.
5. **Informational wording:** "First harvest: 40 wheat in the granary. Your bazaar can now sell food." Never "+100 XP".
6. **Rewards come from inside the game and stay small:** cosmetics (a flag or plaque) or a line of story. No resource gifts in v1.
7. **Rate limit:** at most **1 celebration per 10 s**.
   - Firsts that land together merge into one, and a bigger tier replaces a smaller one.
   - During a crisis, small celebrations are dropped; medium and large ones wait until it ends.
8. **Sound off by default.** When on: one distinct sound per tier, **1 s or less**, with UI sounds on their own volume control.
9. **Haptics off by default.** Offer the toggle only where `navigator.vibrate` exists (not iOS): one **20-30 ms** pulse for medium, two for large, none for small.
10. **Firsts are counted per city save. Achievements are counted per device.**

---

## 6. Daily goals without streaks

### What the sources say
- **Silverman and Barasch (Journal of Consumer Research, 2023), via University of Delaware coverage.**
  - Streaks motivate strongly, even partly artificial ones, and people come to care about the streak itself.
  - A broken streak is doubly demotivating, and coverage reports that broken-streak users are more likely to quit.
  - Advice: don't announce broken streaks. Silverman: "What counts as a streak is malleable."
- **Lally and others (2010), via the BPS Research Digest.** Habits took 18 to about 254 days to form. **Missing one day made little difference**, though many misses weakened the habit. The digest: "don't worry excessively if you miss a day or two."
- **Duolingo, "Improving the streak" (about 2020).**
  - A single lesson started extending the streak, instead of the full daily goal.
  - Day-14 retention rose 3.3% (relative), and new learners on a streak rose 19%.
  - "Establishing a goal appeared to be a barrier to forming a daily habit." A small daily ask beats a big one.
- **Khan Academy reportedly retired its streak feature** over motivation worries (Northwestern working paper snippet; UNVERIFIED).
- **A habit-app study (Lift, 2016)** found streaks create dependency and later drop-off (snippet; UNVERIFIED).
- **The "what-the-hell effect"** (giving up after "blowing it") is dieting research. It has not been tested on streaks, so treat it as an analogy only.
- **Wordle (Josh Wardle, Kotaku, Jan 2022).** About three minutes a day, no ads, no data use, no attention-seeking notifications. "I don't understand why something can't just be fun." Its streak counter is the part not to copy.
- **Mini Metro daily challenge.** One challenge per day, the same for everyone, with a leaderboard (UNVERIFIED detail). Thebes can share the "same seed for everyone" idea without any network.
- **Fallout Shelter objectives.** Three at a time, with one discard per day (fan guides).
- **Animal Crossing, Nook Miles+.** Tasks are replaced as they are completed, with no daily cap (fan guides).
- **Dorfromantik.** Optional quests pay out more tiles, and a missed quest just turns red. The developers wanted a "low barrier to entry" (Digital Trends; quest rules from a fan wiki).

### Rules for Thebes (daily goals)
1. **Three goals per local calendar day,** in a "Today" tab of the goals panel. One appears in the strip only when no main goal is active.
2. **Each one takes 5 minutes or less** in a typical city at the player's rank: "Fill 3 houses", "Store 100 grain".
3. **Deterministic and offline:**
   - Seed a shuffle of a fixed pool with the local date string ("2026-10-11").
   - Filter by city rank and by what this city can actually do.
   - The same date and rank give the same goals everywhere.
4. **No streaks anywhere:** no day counter, no missed-day calendar, no "come back tomorrow", no notifications. A lifetime total ("Daily goals done: 37") is fine.
5. **Missing a day has no effect.** Unfinished goals vanish quietly at local midnight, but a session that runs past midnight keeps its set until the next load.
6. **One free swap per day.**
7. **Rewards match a medium celebration:** informational wording plus a small cosmetic. Never something the main game needs.
8. **Hidden until the guided phase is done or skipped,** and can be switched off entirely.
9. **No real-time waiting:** no goal needs the player to come back later. If the device clock moves backwards, just show that date's goals.

---

## 7. Achievements in calm games

### What the sources say
- **Hamari and Eranti (DiGRA 2011), abstract only.** An achievement is a signifier, completion logic and a reward. From the game's point of view it is "an optional challenge provided by a meta-game".
- **Lucas Blair, "The Cake is Not a Lie" (2011).** "Achievements must be a forethought, and not an afterthought."
  - Prefer *measuring* how well something was done over simply *completing* it.
  - Reward dull tasks; give feedback on interesting ones.
  - Point achievements on interesting tasks at useful strategies.
  - Aim for moderate difficulty.
  - Keep new players focused on getting better (mastery), not on proving themselves.
- **Hecker and Madigan.** "You're not playing right until you chase this" feels controlling and hurts motivation. "We noticed how you played" feels informational and can help.
- **Xbox certification (XR-055, snippet).** **10-100 achievements at launch**, every one achievable, and none that unlock without core play (UNVERIFIED detail).
- **Xbox Wire on HyperDot (Jan 2020).**
  - Hide achievements only for spoilers or unmissable moments: "Tell them upfront to cut out the extra effort."
  - Mix progress milestones with play-style challenges.
  - Grind is acceptable only with a progress tracker.
  - Scale effort to game length: a 5-hour game shouldn't need 50 hours.
- **Celeste's strawberries.** Optional, never required to progress (fan and press sources). The designer's intent was not found (UNVERIFIED). Still a good model: a challenge beside the main path, not on it.
- **Steamworks.** Steam keeps only locked or unlocked, so the game must store progress itself (plugin docs; UNVERIFIED for Valve's wording).

**"A menu of play styles".** I found no primary source for that phrase. It fits Blair, Hecker and HyperDot: each achievement suggests a way to play, not another chore.

### Rules for Thebes (achievements)
1. **About 30-40 in v1,** in four groups:
   - **Firsts** (about 10).
   - **Growth** (about 8, one per city rank).
   - **Ways to play** (about 12): "500 people, no fire losses for a year"; "fed only from the river"; "never a monthly deficit".
   - **Mastery** (about 6, moderate challenges).
2. **All visible with exact conditions.** At most **3 hidden surprises**, and only unmissable ones.
3. **Progress bars on count-based ones** ("312 / 500").
4. **No grind and nothing missable:**
   - nothing needs more than about **10 hours** in one city;
   - nothing needs restarting the opening many times;
   - nothing is tied to dates, daily goals or streaks;
   - no permanent lockouts.
5. **Informational wording:** "Your granaries never ran dry for a whole year".
6. **No points or score.** Tiers (bronze, silver, gold) on at most 4-5 count-based achievements, and never more than 3 tiers.
7. **Unlocking is a medium celebration.** Achievements are stored per device across all cities, with try/catch on storage.
8. **Hidden during the guided phase,** so they don't compete with the guide or feel like orders.

---

## 8. Accessibility of tutorials

### What the sources say
- **Game Accessibility Guidelines, cognitive section:**
  - *Basic:* interactive tutorials; text at the player's own pace; simple language; a readable default font; no layers of menus before play.
  - *Intermediate:* objective reminders during play; contextual help; practice without failure; essential instructions not by text alone; hide background movement; distinct sounds for key events; separate volumes; adjustable game speed; a haptics toggle.
  - *Advanced:* replay all instructions; avoid sudden, unexpected events.
  - *Motor (advanced):* "Do not make precise timing essential", with actions that work while paused.
  - The tutorial guideline says teaching *within gameplay itself* is better still.
- **XAG 109 Objective clarity.**
  - Objectives can be reviewed at any time, with sub-steps and progress ("15/20").
  - Optional hints when the player is stuck.
  - Interruptions can be suppressed.
  - Tutorials are interactive and **available on demand, even after completion**.
  - Dragon Quest XI's "story so far" on every start is a close match for Thebes's "Welcome back" card.
- **XAG 112.** Consistent order and prompts, a persistent way back, and full keyboard reach.
- **XAG 116.** Tutorial text stays until dismissed, or its duration can be set to 10 times the default.
- **XAG 117.** Avoid camera shake.
- **WCAG 2.2.** 1.4.13, 2.4.11 and 4.1.3 at AA; 2.2.2 at A; 2.3.3 at AAA, where `prefers-reduced-motion` is cheap and already respected.

### Rules for Thebes (accessible guidance)
1. **Nothing in the guidance times out.** Banners that hide themselves are copied to the "Recent" log.
2. **Everything guided can be done while paused.** No step needs speed. If placement while paused isn't possible today, it is the one engine change this research asks for.
3. **The current goal is always visible** (strip) and **reviewable** (goals panel with ticked sub-steps and "4/6 plots" progress). "Welcome back" names the current goal and summarises what changed.
4. **Every lesson can be replayed** from the Guide list, including completed ones.
5. **Keyboard:**
   - "Show me", "Skip guide", tip close and daily swap are real focusable buttons in a consistent order.
   - Esc closes tips.
   - Highlights never hide the focused control.
6. **Screen readers:** `role="status"` for strip changes, tips and celebrations. `role="alert"` only for real danger, and sparingly.
7. **Motion:** pulses stop within 5 s, no shake, the OS reduced-motion setting is respected, and an in-game "Reduce motion" toggle exists.
8. **Plain language:**
   - 20 words or fewer per tip, everyday words ("people", "food", "water", not "walkers" or "coverage").
   - Never rely on colour alone: pair every highlight with an icon or text.
9. **Decision for Josh:** an option to **pause when something new happens** (the first fire, the first collapse), on by default during the guided phase only. It helps players who need reading time. It doesn't block play, since one tap resumes, but it does interrupt.

---

## 9. Shortlist: the 15 rules I'd adopt first
1. **Guided-phase goals:** one goal at a time, then up to 3. Every step is a world-state check, so any order works.
2. **Dimming:** dimmed cards stay usable with 4.5:1 labels, the target gets a "Suggested" tag, and nothing is locked.
3. **Highlight pulse:** at most 3 cycles, stopping within 5 s. Reduced motion gets a static outline and an icon. No scrim over the map.
4. **Skip and resume:** one-tap "Skip guide" with no confirmation, and "Resume guide" in Help. Progress saves with the city and resumes at the first unmet step.
5. **Guide list:** every lesson and tip seen goes into a replayable Guide list in Help.
6. **Guidance setting:** Full / Tips only / Warnings only / Off, with a one-tap "I know city builders" on the first screen.
7. **Tip triggers and cap:** tips fire only on their triggers. At most 1 per 3 minutes of unpaused play and 5 per hour, never mid-gesture, once per device.
8. **Where guidance lives:** tips, nudges and first-time events all appear in the goals strip, never time out, and are announced with `role="status"`.
9. **Idle nudge:** after 45 s unpaused with no meaningful action and no goal progress. A silent glow first, one line after another 60 s, then nothing more.
10. **What the nudge picks:** an urgent fix, then the guided goal, then the biggest next-tier blocker, then a daily goal. 3 blocked placements in 30 s offers "Show me where it fits".
11. **Celebrations:** three tiers (0.5 s, 1.2 s and 2.5 s or less), at most 1 per 10 s, never blocking input or shaking the screen, with informational wording.
12. **Sound and haptics:** off by default. Haptics only where `navigator.vibrate` exists (not iOS), with 20-30 ms pulses.
13. **Daily goals:** 3 a day, each 5 minutes or less, seeded by the local date and filtered by rank. No streaks, day counts, notifications or missed-day messages, and one swap per day.
14. **Achievements:** about 30-40, all visible with exact conditions (at most 3 unmissable surprises), progress bars, nothing over about 10 hours, nothing missable or tied to dates.
15. **First hazards and pausing:** the first occurrence of each hazard is gentle and arrives as a goal, and every guided step can be done while paused.

---

## 10. Sources (URL, read date)
"Fetched" means the page loaded and was summarised by a tool. "Snippet" means search results only, so the claims are UNVERIFIED.

**Onboarding and learning**
- Factorio Friday Facts #241, New player experience (Wube, 4 May 2018). Fetched 10 Oct 2026. https://factorio.com/blog/post/fff-241
- Celia Hodent, The Gamer's Brain Part 2: UX of Onboarding and Player Engagement (GDC16 slides and notes). Fetched 10 Oct 2026. https://celiahodent.com/gamers-brain-ux-onboarding/
- Daniel Cook, The Chemistry of Game Design (Gamasutra reprint, 2007). Fetched 11 Oct 2026. https://www.gamedeveloper.com/design/the-chemistry-of-game-design ; stub at https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/ (fetched 11 Oct 2026)
- Raph Koster, A Theory of Fun: secondary summaries only. Snippet 11 Oct 2026. https://bumblingthroughdungeons.com/theory-fun-game-design-raph-koster/
- Half-Life 2 teach-by-doing: secondary. Snippet 10 Oct 2026. https://www.escapistmagazine.com/half-life-2-pick-up-the-can/ ; https://gamedevacademy.org/game-tutorials-guide/
- GMTK, Super Mario 3D World's 4 Step Level Design (2015), via coverage. Snippet 11 Oct 2026. https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps
- Into the Breach: Road to the IGF (Game Developer, 23 Feb 2018). Fetched 11 Oct 2026. https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-
- Into the Breach's interface was a nightmare to make (Rock Paper Shotgun, Mar 2018), read via a repost. Fetched 11 Oct 2026. https://reads.mhlakhani.com/posts/582127219_10156233399322220
- Into the Breach Design Postmortem (GDC 2019 abstract). Snippet 10 Oct 2026. https://gdcvault.com/play/1025772/-Into-the-Breach-Design
- Jakob Nielsen, Training Wheels User Interface (NN/g, 4 Dec 2006). Fetched 11 Oct 2026. https://www.nngroup.com/articles/training-wheels-user-interface/
- Cities: Skylines II, Behind the Scenes #6: Tutorials & Advisor (Colossal Order, 22 Oct 2023). Fetched 10 Oct 2026. https://colossalorder.fi/?p=1924
- Ian Boudreau, Cities: Skylines II review (19 Oct 2023), TapTap repost. Fetched 10 Oct 2026. https://www.taptap.io/br/post/6454531
- Civilization VII dev recommends tutorials (GoNintendo, 1 Feb 2025, on Ed Beach's Steam diary). Fetched 11 Oct 2026. https://www.gonintendo.com/contents/45079-civilization-vii-dev-recommends-tutorials-for-new-and-returning-players
- Frostpunk 2 onboarding reviews and previews. Snippet 10 Oct 2026. https://gamecritics.com/ali-arkani/frostpunk-2-review/ ; https://mein-mmo.de/en/frostpunk-2-preview-tipps-chef-entwickler,1130845
- Against the Storm tutorial reception. Snippet 10 Oct 2026. https://www.thefandomentals.com/against-the-storm-simple-and-achievable/ ; https://www.gamequarter.be/reviews/against-the-storm/
- Anno 117 campaign and tutorial (Anno Union; Checkpoint preview). Snippet 11 Oct 2026. https://www.anno-union.com/?p=21911 ; https://checkpointgaming.net/features/2025/10/anno-117-pax-romana-hands-on-preview-prove-your-roman-rule/
- Two Point Hospital Getting Started (Sega support); Two Point Campus star guides. Snippet 11 Oct 2026. https://support.sega.com/hc/en-us/articles/360000328457-Getting-Started ; https://primagames.com/tips/two-point-campus-freshleigh-meadows-3-star-level-guide
- Islanders reviews and background. Snippet 11 Oct 2026. https://gameworldobserver.com/2019/06/14/islanders ; https://www.thesixthaxis.com/2025/07/17/islanders-new-shores-review/
- Townscaper "toy" framing. Snippet 10 Oct 2026. https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town ; https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making
- Lydia Choong, AI-supported onboarding in a turn-based strategy game (Waterloo thesis, 2024). Snippet 11 Oct 2026. https://uwspace.uwaterloo.ca/handle/10012/20444

**Help, tips, coach marks (NN/g)**
- Aurora Harley, Instructional Overlays and Coach Marks for Mobile Apps (16 Feb 2014). Fetched 11 Oct 2026. https://www.nngroup.com/articles/mobile-instructional-overlay/
- Page Laubheimer, Onboarding Tutorials vs. Contextual Help (12 Feb 2023). Fetched 11 Oct 2026. https://www.nngroup.com/articles/onboarding-tutorials/
- Alita Kendrick, Help and Documentation (13 Dec 2020). Fetched 11 Oct 2026. https://www.nngroup.com/articles/help-and-documentation/

**Idle nudges and hints**
- Interstellar Connection hint devlog. Snippet 11 Oct 2026. https://celia14.itch.io/interstellar-connection/devlog/160083/now-with-hints-and-try-story-focused-immediate-hint-mode
- O'Rourke and others, hint systems in an educational game (UW, 2014). Snippet 11 Oct 2026. https://grail.cs.washington.edu/wp-content/uploads/2015/08/orourke2014hsm.pdf
- Miyamoto reflects on the Super Guide (Vooks, 25 Nov 2009). Fetched 11 Oct 2026. https://vooks.net/miyamoto-reflects-on-the-super-guide ; Iwata Asks page failed to load (certificate error): https://iwataasks.nintendo.com/interviews/wii/nsmb/0/5 ; Super Guide wiki (snippet): https://giantbomb.com/wiki/Concepts/Super_Guide
- Pocket City coverage. Snippet 11 Oct 2026. https://toucharcade.com/2023/04/11/pocket-city-2-mobile-interview-price-legend-of-zelda-city-builder-game-future-codebrew-games/ ; https://kotaku.com/pocket-city-is-a-damn-fine-city-building-game-1828075635
- SimCity BuildIt critiques. Snippet 11 Oct 2026. https://www.macworld.com/article/225166/freemium-field-test-the-grinding-simcity-buildit-emphasizes-obstacles-not-opportunities.html ; https://deconstructoroffun.com/blog//2015/02/simcity-buildit-nice-town-but-would-you.html ; https://www.pocketgamer.biz/petri-ikonen-designing-simcity-buildit

**Juice and celebrations**
- Pichlmair and Johansen, Designing Game Feel: A Survey (arXiv 2011.09201, 2020). Fetched 10 Oct 2026. https://ar5iv.arxiv.org/html/2011.09201
- Folmer Kelly, Don't Juice It or Lose It (Game Developer video post, 2014). Fetched 10 Oct 2026. https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- Juice it or lose it, takeaways summary. Snippet 10 Oct 2026. https://rpgplayground.com/research-making-a-juicy-game/
- Art of Screenshake: listed in Kenney's must-see videos. Snippet 10 Oct 2026. https://kenney.nl/knowledge-base/learning/must-see-videos-for-indie-developers
- Hicks, Gerling, Dickinson, What makes a Game? Reflections on Juiciness. Snippet 10 Oct 2026. https://figshare.com/articles/Kieran_Hicks_Kathrin_Gerling_Patrick_Dickinson_-_What_makes_a_Game_Reflections_on_Juiciness_and_Player_Experience_/5147011
- MDN, Navigator.vibrate(). Fetched 11 Oct 2026. https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- Can I use: Vibration API. Fetched 11 Oct 2026. https://caniuse.com/vibration
- Apple HIG, Playing haptics: page content didn't load, so not used. 11 Oct 2026. https://developer.apple.com/design/human-interface-guidelines/playing-haptics

**Streaks and daily goals**
- University of Delaware, Power of streaks (Silverman; JCR 2023), Mar 2024. Fetched 10 Oct 2026. https://udel.edu/udaily/2024/march/power-of-streaks-motivation-jackie-silverman
- BPS Research Digest, How to form a habit (Lally and others, 2010). Fetched 10 Oct 2026. https://bps.org.uk/research-digest/how-form-habit
- Duolingo, Improving the streak (company blog, about 2020). Fetched 10 Oct 2026. https://blog.duolingo.com/improving-the-streak
- Northwestern IPR working paper 26-05 (Khan Academy streak retirement mention). Snippet 10 Oct 2026. https://www.ipr.northwestern.edu/documents/working-papers/2026/wp-26-05.pdf
- Don't kick the habit: dependency in habit apps (Northumbria, 2016). Snippet 10 Oct 2026. https://researchportal.northumbria.ac.uk/en/publications/dont-kick-the-habit-the-role-of-dependency-in-habit-formation-app/
- What-the-hell effect background. Snippet 10 Oct 2026. https://en.wikipedia.org/wiki/Counterregulatory_eating
- Kotaku, Wordle creator doesn't want his game to take over (6 Jan 2022). Fetched 10 Oct 2026. https://kotaku.com/wordle-creator-doesnt-want-his-popular-game-to-take-ove-1848316642
- Mini Metro daily challenge (Steam forum, TouchArcade review). Snippet 10 Oct 2026. https://steamcommunity.com/app/287980/discussions/0/1742229167200711179 ; https://toucharcade.com/2016/12/30/mini-metro-review-train-braining/
- Fallout Shelter objectives (TrueAchievements guide). Snippet 11 Oct 2026. https://www.trueachievements.com/game/Fallout-Shelter/walkthrough/4
- Animal Crossing Nook Miles+ (fan guides). Snippet 10 Oct 2026. https://www.thegamer.com/animal-crossing-new-horizons-daily-tasks/ ; https://animalcrossing.fandom.com/wiki/Nook_Miles
- Dorfromantik quests and intent (Digital Trends; fan wiki; GOG interview). Snippet 10 Oct 2026. https://qa2.www.digitaltrends.com/gaming/dorfromantik-interview ; https://shapes.inc/fandom/dorfromantik/challenges ; https://gog.com/news/binterview_toukana_interactive_tells_us_more_about_dorfromantikb

**Achievements**
- Hamari and Eranti, Framework for Designing and Evaluating Game Achievements (DiGRA 2011), abstract. Fetched 11 Oct 2026. https://dl.digra.org/index.php/dl/article/view/545
- Lucas Blair, The Cake is Not a Lie: How to Design Effective Achievements (27 Apr 2011). Fetched 11 Oct 2026. https://gamedeveloper.com/design/the-cake-is-not-a-lie-how-to-design-effective-achievements
- Chris Hecker, Achievements Considered Harmful? (GDC 2010 write-up). Fetched 11 Oct 2026. https://www.chrishecker.com/Achievements_Considered_Harmful%3F
- Jamie Madigan, The Overjustification Effect and Game Achievements (3 Oct 2016). Fetched 11 Oct 2026. https://psychologyofgames.com/2016/10/the-overjustification-effect-and-game-achievements
- Xbox Wire, How the ID@Xbox community influenced HyperDot's achievement design (31 Jan 2020). Fetched 11 Oct 2026. https://news.xbox.com/en-us/2020/01/31/how-community-influenced-hyperdot-achievement-design/
- Xbox certification XR-055 (achievements). Snippet 11 Oct 2026. https://devdocs.xbox.com/publishing/certification/xr/xr-055.md
- Steamworks Stats and Achievements overview. Snippet 11 Oct 2026. https://partner.steamgames.com/doc/features/achievements
- Celeste strawberries (Celeste Classic wiki; student review). Snippet 11 Oct 2026. https://cc-wiki.duckdns.org/wiki/Strawberry ; https://coppellstudentmedia.com/77597/entertainment/celeste-game-review-a-journey-through-mental-health-strawberries/

**Accessibility**
- Game Accessibility Guidelines, full list. Fetched 10 Oct 2026. https://gameaccessibilityguidelines.com/full-list/
- GAG, Include interactive tutorials. Fetched 10 Oct 2026. https://gameaccessibilityguidelines.com/include-interactive-tutorials/
- Xbox Accessibility Guidelines index (v3.2). Fetched 10 Oct 2026. https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md
- XAG 109 Objective clarity. Fetched 10 Oct 2026. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/109
- XAG 112 UI navigation. Fetched 10 Oct 2026. https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/112
- XAG 116 Time limits. Fetched 10 Oct 2026. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/116
- XAG 117 Visual distractions and motion. Fetched 10 Oct 2026. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117
- WCAG 2.2 Understanding 1.4.13 Content on Hover or Focus. Fetched 11 Oct 2026. https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- WCAG 2.2 Understanding 2.4.11 Focus Not Obscured (Minimum). Fetched 11 Oct 2026. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- WCAG 2.2 Understanding 4.1.3 Status Messages. Fetched 11 Oct 2026. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- WCAG 2.2 Understanding 2.3.3 Animation from Interactions. Fetched 11 Oct 2026. https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide. Fetched 11 Oct 2026. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- WCAG 1.4.3 (inactive components exemption) and 2.3.1 (three flashes): cited from the standard's text, not fetched this session.
