# Thebes Stage 3: UX research digest (threats, alerts, danger visuals)

Researched 11 Oct 2026 against spec sections 4.12, 4.13, 5.4, 5.5, 6.1, 6.3. Source tags like [S12] are listed with URLs at the end. Labels: **[verified]** = I read the primary page; **[secondary]** = forum/wiki/blog or search summary only; **[UNVERIFIED]** = my inference or recalled knowledge, not confirmed by a fetched source.

## 1. Short version: 15 rules for Stage 3

1. **Three tiers, one channel each.** Info = toast or log. Warning = count badge plus the minimap list. Critical = the banner under the top bar. Match intrusiveness to urgency and only interrupt when the player must act. [S25, S41, S16] (matches the spec; keep it)
2. **Critical banners never time out.** They stay until resolved or dismissed, and may collapse to a one-line chip with a countdown. Auto-dismissing alerts fail players who need more time. [S13, S18]; Frostpunk keeps its forecast permanently on screen beside the clock [S35, secondary].
3. **One critical banner at a time.** Priority: raid, fire, debt, save failing. Roll repeats into one line ("3 buildings on fire"). Announce each event once, through one primary channel. [S27, S41, S16]
4. **Colour never carries meaning alone.** Pair every alert with an icon and a text label. [S3, S10, S18]
5. **Screen readers: `role="alert"` for criticals only; everything else `role="status"` (polite).** Assertive on unimportant content is a named failure. [S4]
6. **Pause on the first fire and first raid warning** (spec already does this for raids). After that, offer a per-type setting: pause, jump to it, or inform only. [S33, S34, S39 all secondary]; [S9] for real-time games with pause.
7. **Nothing happens while the player is away.** Pause on hidden, save on hide, resume paused after a long absence with a one-line recap. Clash of Clans needed three overlapping protections because its world keeps running. [S22, S31]
8. **The camera moves only when the player taps View**, with a Back chip to return. Under reduced motion it is an instant cut. Never auto-pan. [S14, S19]
9. **Combat is readable by construction:** few, large, silhouette-distinct units, health only once damaged [UNVERIFIED as common practice], no micro-management, and slow/pause available. [S29, S9]
10. **Fire visuals: pulse or flicker at 2 Hz or less, small area, no luminance flip, no saturated-red flash, nothing pulsing longer than 5 s.** Static flame glyph under reduced motion. [S1, S2, S7, S15]
11. **Overlays: a single-hue ramp that changes in lightness, plus hatch density or a number, plus a legend with labels.** [S3, S10, S38]
12. **Sound and haptics are garnish.** The game must pass a muted, no-vibration first play. Haptics are short, optional, and do not exist on iOS web. [S8, S12, S17, S20, S21]
13. **Tribute gets one specific confirmation sheet:** cost, balance after, exactly what it cancels and what it does not, outcome-named buttons, no default. Not an "Are you sure?". [S24, S16, S11]
14. **Teach the first fire and first raid as small, survivable, telegraphed events** with cause, fix and "Show me", never text over the map. [S6, S36, S40]
15. **Telegraph with perfect information.** Raid size is fixed at warning time (spec). Also show direction, entry point and ETA in game time, so choices are about planning, not guessing. [S36]

## 2. Sections

### Alert hierarchy and banners
- NN/g: choose indicator vs notification by urgency and whether action is needed; critical information must not rely on passive, easy-to-miss cues; consistency teaches meaning [S25]. Carbon: high-contrast, modal treatment only for critical content [S41, secondary]. Apple HIG: alerts are for essential, actionable content; do not alert merely to inform [S16].
- An RTS write-up gives a useful 2x2: important+urgent = audio plus visual; urgent+minor = audio only; important+not urgent = persistent visual indicator. It names minimap pings and screen-edge indicators for off-screen events [S26]. For Thebes, with sound off by default, "audio" cells collapse to the banner and badge.
- RimWorld sorts events into letters by severity (blue good, grey neutral, yellow bad, red direct threat) and pauses on selected levels [S33, secondary]. Take the tiers, not the colour-only coding (rule 4).
- Frostpunk puts temperature and forecast markers top-centre beside the clock, the largest HUD element, and earlier cold waves foreshadow the big storm [S35, secondary]. Precedent for a persistent raid countdown, not just a banner.
- Cities: Skylines shows problem icons over buildings. Players complain about popups blocking the UI, and a community mod hides routine notices while keeping major ones [S32, secondary]. Supports tiering and not covering UI. Its detection buildings (fire watch tower, radar) give advance warning of specific disasters [S32, verified]; analogous to the firehouse reach and fire-risk overlay.
- Mini Motorways: a destination only gets a timer once pins exceed capacity (7 for square, 10 for round), and the timer drains on its own when relieved [S30, verified]. Calm comes from warnings that start late, are visible in the world, and visibly recover. Copy that for fire: a burning building shows duration remaining.
- Edge-of-screen arrows: common convention (clamp to nearest edge, rotate to target, hide when target visible). One mobile-games patent says small displays argue for showing an icon only when a rule is met [S44, secondary]. For Thebes: optional, one arrow, raid entry point only, at the edge (the spec forbids the middle). Clustering and tap-to-focus are [UNVERIFIED] design suggestions.
- Gap: I found no reliable detail on Anno 1800, Against the Storm, Northgard, Civ VI (base game) or Pocket City alert UIs. Only fragments: Civ VI mods use click-to-zoom and right-click-dismiss [S42, secondary]; Pocket City lets you switch disasters off [secondary]; Against the Storm shows hostility beside a red eye above the time controls [secondary]. Do not cite these as evidence.

### Pausing and fairness
- WCAG 2.2.2: real-time games count as moving content, and pausing is how turn-based or pausable games meet the intent [S2]. GAG (advanced): do not make precise timing essential; offer pause-able actions; GAG (basic): include a game-speed option [S6, S9]. Thebes already has pause and 1x/2x/3x.
- XAG 116: for non-core timers, let players extend or disable, and let notification durations scale to at least 10x default [S13]. A banner that persists satisfies this by design.
- Per-type alert behaviour is a known pattern: UFO: Aftermath offers pause, centre view or just inform [S39, secondary]; RimWorld has pause-on-threat settings [S33, secondary]; Dwarf Fortress configures pause and recentre per announcement, with in-game announcement settings since v50.10 (Sept 2023) [S34, secondary]. A RimWorld modder complaint: players pause by hand and then un-pause onto a threat, so avoid toggle-style pause that can invert [S33, secondary].
- Page Visibility: hidden tabs stop rAF and throttle timers, so the game must pause deliberately and use elapsed-time on resume. On mobile the page may be suspended or discarded, so persist on `visibilitychange` and `pagehide` [S22; mobile caveats are the fetch tool's general knowledge, UNVERIFIED].
- Clash of Clans (verified for 2015 numbers, may have changed): shield, Village Guard (15 min after each attack for lower leagues, up to 3 h in top leagues) and a forced offline "break" exist because a world that runs while you are away needs protections [S31]. Thebes avoids all of this by not simulating while away.
- On return: idle-game practice is to show what changed and to cap or threshold absence [S43, low-quality secondary]. Thebes version [UNVERIFIED]: stay paused if away longer than roughly 30 s, with one "Resume" button and a recap ("Raid from the north: 3 raiders left. 1 fire.").

### Combat readability on a phone
- Bad North's developers call readability the core art value, hide the simulation, keep commands minimal, make hits audible ("close your eyes and still understand"), and slow time during fights; islands run about 5 to 6 minutes [S29]. It has a touch port. Takeaway: raiders as real units is fine if few, big, and fights are short.
- Do not demand fast reactions: soldiers and towers act automatically (spec), which is the assist-mode pattern in GAG [S6]. Keep the Slow option available during raids.
- Health: show bars only on damaged units or on a tapped one [UNVERIFIED as common practice; I could not confirm Clash Royale's behaviour]. Distinguish raiders from defenders by silhouette or icon, not hue (rule 4).
- GAG (intermediate, vision): avoid essential temporary information outside the player's eye-line [S6]. Combat off-screen needs the banner, pin, or edge arrow.
- Camera: jump only on tap of View; add a Back chip that restores the previous position [Back chip is UNVERIFIED as a pattern]. XAG 117 asks for the ability to disable automatic camera movement [S14]. Apple: replace large movement with fades; do not make people wait for animations [S19].
- Touch: spec's 44 pt matches Apple's iOS default (28 pt minimum), with about 12 pt spacing around bezeled controls [S18]. WCAG 2.5.8 AA minimum is 24x24 CSS px [S5]. XAG 107 suggests 15 mm for phones and activating on release with a way to cancel [S11].

### Fire visuals and photosensitivity
- WCAG 2.3.1: at most 3 flashes in any second, unless below general and red flash thresholds or small enough area. Applies to everything on the page [S1]. GAG says to avoid flashing sequences over 5 s, more than 3 flashes per second over 25% or more of the screen, and counts any change to or from red as a flash [S7]. XAG 118 adds that low-intensity flashing continued for long periods can still fail [S15]. Epilepsy Society: 3 to 30 Hz is the most common trigger range, some people react up to 60 Hz [S37, secondary].
- Practical: fire is small sprites on a light ground. Animate shape (flame tip sway, ember rise) at 1 to 2 Hz, not brightness; keep smoke slow. Do not flash the whole banner or screen edge. A single slow pulse, three cycles at most, then static [UNVERIFIED design choice, bounded by S1 and S2].
- WCAG 2.2.2: auto-starting motion that runs over 5 s next to other content needs pause/stop/hide, or must be essential. A looping banner animation is not essential [S2].
- Reduced motion: remove non-essential movement; keep essential state visible in static form [S23, S19]. Static flame glyph plus "Burning" text and a progress bar; banner appears without a slide; camera jump is an instant cut.
- Offer an "Effects intensity" setting rather than an "epilepsy safe" label (GAG advises against the label) [S7]. Test footage with the Harding FPA tool if stakes warrant [S7, S15].

### Colour-blind safe overlays
- WCAG 1.4.1: colour cannot be the only distinction; a 3:1 lightness difference counts as an additional distinction; patterns and text are standard fixes [S3]. XAG 103: use symbols, shapes and text with colour; if colour is the main channel, let players choose colours [S10]. Apple: red-green and blue-orange pairs are especially hard; consider customisable colours [S18].
- Spec already uses a single-hue light-to-dark scale with a legend. Strengthen it: three or four bands with hatch density (none, light diagonal, dense cross) plus a number or label on tap; outline above-threshold buildings; legend with the same hatches. Viridis-style ramps vary mainly in lightness, which keeps them colour-blind and greyscale friendly [S38, secondary for the claim's detail].
- Fire itself: burning = flame icon + "Burning" label + outline, not red alone. Burned house = empty-plot icon; rubble = rubble icon. Distinct shapes.
- Housing overlay filled dot vs hollow ring is exactly the right pattern; reuse for "covered by firehouse" vs "not covered".

### Sound and haptics (both off by default)
- GAG basic: no essential information by sound alone; test by playing the first time muted [S8]. XAG 103 and 110: haptics must never be sole channel, need on/off and ideally intensity [S10, S12]. Apple: pair haptics with visuals, keep them consistent, avoid overuse [S17]. Apple also says to pair audio cues with matching haptics for people who cannot hear them [S18].
- Android: clicks of 10 to 20 ms; buzzy long vibration is worse than none; scale strength with importance [S20]. These are native-API guidance; apply as a design rule for short patterns.
- Web reality [S21, verified from MDN browser-compat-data]: `navigator.vibrate` is unsupported in Safari and iOS Safari, partial/disabled in Firefox Android 79+, supported in Chrome Android (needs a prior user gesture since Chrome 60, and is blocked in cross-origin iframes). So haptics reach Chrome-on-Android only. Treat as a bonus.
- Bad North shows sound as a readability aid, not an alarm [S29]. Raid horn: one short play on warning, a different one when raiders land. Both have visual twins (banner, then a "Raiders at the gate" chip).
- Medical alarm standards (IEC 60601-1-8) use three priority levels encoded by pulse count and rhythm [S28, secondary via patents; UNVERIFIED against the standard]. Useful analogy: two or three distinguishable sounds are enough.

### Irreversible choices (Pay tribute)
- NN/g: reserve confirmations for serious or irreversible actions; be specific; label buttons with outcomes; avoid a default "Yes"; prefer undo where possible [S24]. Apple HIG: skip alerts for common undoable actions; use a specific verb, not OK; always include Cancel; consider no default; avoid styling the choice the user deliberately made as destructive [S16].
- Tribute is irreversible (gold gone, raid cancelled) and rare, so it earns one confirmation. Sheet content: "Pay 420 gold. Cancels the raid from the north (about 12 raiders). Treasury 610 to 190. The next raid still comes." Buttons "Pay 420 gold" and "Keep gold, defend". [UNVERIFIED sample wording.]
- Spec-aware: if paying would put the treasury into debt (limit -500, mood penalty), say so in the sheet or block it. Activate on tap-up and allow slide-off to cancel [S11]. Affordability must not be colour-only: use a coin-slash icon plus text, as the spec already does for build cards.

### Teaching the first threat
- GAG: interactive tutorials (basic) and a way to practise without failure (intermediate) [S6]. Telegraphing prevents hits feeling arbitrary [S40, secondary]. Into the Breach shows intended attacks before the player commits and has no hidden percentages [S36, secondary].
- Tower-defence developer notes: intro text in the lull before wave one, a build window, and reviewers criticising hints that never leave the screen [S40, secondary].
- Thebes plan [UNVERIFIED synthesis]: first fire = one building, low spread chance, a goal card with cause, fix and Show me, and a short "what is a fire" line in How to play. First raid = pause on warning, entry point highlighted via tap-to-View, a single enemy type sized for one tower (spec), goal "Build a tower facing the north". Decision for Josh: whether to hide or de-emphasise Pay tribute on the very first raid so players see one fight; spec does not say.

### Avoiding alarm fatigue
- Joint Commission Sentinel Event Alert 50 (2013): estimates that 85 to 99 percent of clinical alarm signals need no intervention, causing desensitisation; NPSG.06.01.01 requires ranking alarms by risk [S27, secondary summaries]. The lesson transfers: every noisy non-event costs the trust a real raid needs.
- Rules: only conditions the player can act on become alerts; clear them on resolution, not on a timer; do not re-alarm standing conditions (debt gets one banner, then the badge); do not announce one event across title card, toast, banner and log [S41, secondary]; routine alerts stay quiet. A cap of one visible banner enforces this.
- Spec nuance: "Critical" currently includes debt and save failing. Raids and fires are time-critical; debt is chronic. Consider moving debt to warning after its first announcement. [Suggestion.]

## 3. Concrete specs gathered

| Topic | Spec | Source |
|---|---|---|
| Flash rate | Max 3 flashes in any 1 s | S1 |
| General flash | Opposing change of 10% or more of max relative luminance, darker state below 0.80 | S1 |
| Red flash | Saturated red: R/(R+G+B) 0.8 or more; counts as a flash on lower change | S1, S15 |
| Area | Passes if flashes cover 0.006 sr or less in any 10 degree field (341x256 px at 1024x768, about 25% of the field) | S1 |
| Game guideline | Avoid more than 3 flashes/s over 25% of screen; sequences over 5 s; any change to or from red counts | S7 |
| XAG failure | About over 3/s, covering about 20% of screen; low-intensity long flashing also fails | S15 |
| Trigger band | 3 to 30 Hz most common, up to 60 Hz for some | S37 |
| Auto-moving content | Over 5 s alongside other content needs pause/stop/hide | S2 |
| Notification time limits | Make duration adjustable up to 10x default; at least 20 s to extend a warning | S13 |
| Touch target | 44x44 pt default, 28 min (Apple); 24x24 CSS px AA minimum (WCAG); 15 mm phones (XAG) | S18, S5, S11 |
| Spacing | About 12 pt around bezeled controls, 24 pt around plain ones | S18 |
| Contrast | 4.5:1 body text; 3:1 lightness difference counts as an extra non-colour cue | S18, S3 |
| Haptic pulse | 10 to 20 ms clicks; avoid long buzzes | S20 |
| Vibration API | Not in Safari/iOS; Chrome Android needs a user gesture | S21 |
| Alarm flash rates (medical) | High priority red 1.4 to 2.8 Hz, medium yellow 0.4 to 0.8 Hz; low steady. UNVERIFIED, via patents | S28 |
| Overload timer | 7 pins square, 10 round before timer starts (Mini Motorways) | S30 |
| Clash Village Guard | 15 min (lower leagues) to 3 h (Titan I/Legend), 2015 values, may have changed | S31 |

## 4. Sources

- S1 WCAG 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- S2 WCAG 2.2.2: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- S3 WCAG 1.4.1: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- S4 WCAG 4.1.3: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- S5 WCAG 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- S6 Game Accessibility Guidelines, full list: https://gameaccessibilityguidelines.com/full-list/
- S7 GAG flicker: https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/
- S8 GAG sound-only info: https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-sounds-alone/
- S9 GAG timing: https://gameaccessibilityguidelines.com/do-not-make-precise-timing-essential-to-gameplay-offer-alternatives-actions-that-can-be-carried-out-while-paused-or-a-skip-mechanism/
- S10 XAG 103: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103
- S11 XAG 107: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107
- S12 XAG 110: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/110
- S13 XAG 116: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/116
- S14 XAG 117: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117
- S15 XAG 118: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118
- S16 Apple HIG Alerts: https://developer.apple.com/design/human-interface-guidelines/alerts
- S17 Apple HIG Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- S18 Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- S19 Apple HIG Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- S20 Android haptics principles: https://developer.android.com/develop/ui/views/haptics/haptics-principles
- S21 MDN Vibration API: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API ; compat data: https://github.com/mdn/browser-compat-data (api/Navigator.json, "vibrate")
- S22 MDN Page Visibility: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- S23 web.dev reduced motion: https://web.dev/articles/prefers-reduced-motion
- S24 NN/g confirmation dialogs: https://www.nngroup.com/articles/confirmation-dialog/
- S25 NN/g indicators and notifications: https://www.nngroup.com/articles/indicators-validations-notifications/
- S26 RTS information overload: https://cxong.github.io/2026/08/how-rts-games-solve-information-overload
- S27 Joint Commission SEA 50: https://digitalassets.jointcommission.org/api/public/content/f65e5c9df2b94000a99445e0a7877007 ; background: https://en.wikipedia.org/wiki/Alarm_fatigue
- S28 IEC 60601-1-8 (via rationale page and patents): https://standards.har-el.com/Projects/181701/60601-1-8/html/6-3-2-Visual-Generation.htm ; https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11797158
- S29 Bad North: https://www.nintendo.com/en-gb/News/2018/April/Interview-Taking-on-hordes-of-invading-Vikings-in-Bad-North-1368315.html ; https://gamingaudionews.com/2018/04/26/bad-norths-developers-talk-about-inspiration-behind-audio-and-gameplay/
- S30 Mini Motorways / Mini Metro: https://en.wikipedia.org/wiki/Mini_Motorways ; https://en.wikipedia.org/wiki/Mini_Metro_(video_game)
- S31 Clash of Clans shields: https://toucharcade.com/2015/11/24/clash-of-clans-town-hall-11-update-specifics-on-how-shields-work/ ; https://www.clash.ninja/guides/what-are-shields-and-guard
- S32 Cities: Skylines: https://skylines.paradoxwikis.com/Natural_Disasters ; popup complaints: https://steamcommunity.com/app/255710/discussions/0/485624149160556401/ ; mod: https://www.nexusmods.com/citiesskylines/mods/245
- S33 RimWorld: https://rimworldwiki.com/wiki/Events ; https://steamcommunity.com/app/294100/discussions/0/591760218823644744
- S34 Dwarf Fortress: https://steamcommunity.com/app/975370/discussions/0/3709307511569960933 ; https://dwarffortresswiki.org/Settings
- S35 Frostpunk: https://checkpointgaming.net/reviews/2018/04/frost-punk-review-not-winter-wonderland/ ; https://pixeltwelve.com/guides/frostpunk-beginner-guide-workers-heat-map-screen
- S36 Into the Breach: https://pcgamer.com/into-the-breach-preview ; https://cliqist.com/2018/03/06/into-the-breach-building-a-better-mech-with-subset-games-justin-ma/
- S37 Epilepsy Society: https://epilepsysociety.org.uk/sites/default/files/2025-04/PhotosensitiveepilepsyApril2025.pdf
- S38 viridis: https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html
- S39 Anno 1800 / UFO: Aftermath alert options (forum): https://forums.factorio.com/viewtopic.php?p=468232 ; Anno pause thread: https://steamcommunity.com/app/916440/discussions/0/3976176932759549865
- S40 Tower-defence notes and telegraphing: https://przemwo.itch.io/tower-zombie-defense/devlog/871940/tower-zombie-defense-update-057 ; https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs
- S41 Notification design systems: https://carbondesignsystem.com/components/notification/usage/ ; https://www.courier.com/blog/what-is-a-toast-message ; https://github.com/webdevcody/survive-the-night-fps/issues/221
- S42 Civ VI mods: https://github.com/pspjuth/cqui
- S43 Idle-game offline progress: https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f ; https://alexdb.itch.io/victorian-idle/devlog/978450/110x-is-now-a-thing-
- S44 Off-screen indicators: https://code.tutsplus.com/positioning-on-screen-indicators-to-point-to-off-screen-targets--gamedev-6644t ; https://patents.justia.com/patent/20220347573

## 5. Not verified or not found

- Official Apple/Google alert and haptic pages: Apple pages were read through Apple's JSON documentation endpoint (alerts, playing-haptics, accessibility, motion); Material Design banner/snackbar guidance was not read.
- WCAG 1.4.11 (non-text contrast, 3:1 for essential graphics) and 2.5.5 (44 px AAA) not re-fetched; stated from memory, UNVERIFIED here.
- No reliable sources found for: Anno 1800 notification system, Against the Storm storm countdown and pause behaviour, Northgard raid warnings, Civ VI base-game notifications, Pocket City warnings, Clash Royale health-bar behaviour, Mini Metro design intent.
- Chrome's exact vibrate rule (sticky user activation vs per-gesture) not confirmed beyond MDN's "requires a user gesture" note.
- Medical alarm figures (IEC 60601-1-8) come from patent reproductions of the table, not the paid standard.
