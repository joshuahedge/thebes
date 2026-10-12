# Prompt for the Stage 4 session

Paste everything between the two lines into a new Claude Code chat whose working folder is `C:\Users\joshed` (or `C:\dev\thebes`). It runs on its own with parallel agents, and stops only for a push or anything destructive.

---

Build Stage 4 of my personal Thebes game (monuments, and a city that looks grand) at C:\dev\thebes, autonomously, using multi-agent orchestration: use workflows and parallel agents to go faster. I opt in to running workflows for this work. Make the visuals clearly better again: I want to see the difference on my own phone and PC, which ask for reduced motion.

Read first:
1. Your memory note for Thebes.
2. docs/superpowers/notes/2026-10-12-stage-4-review.md: the scope, the measured late game, rulings 178-224 (accept them as proposed unless the spec or the code shows one is wrong, and record any change as a new ruling) and the parallel-track plan in section 10.
3. The spec docs/superpowers/specs/2026-10-09-thebes-design.md.
4. The Stage 3 plan's header and contract (docs/superpowers/plans/2026-10-11-thebes-stage-3-danger.md, the first ~300 lines, and the section "Controller rulings on the track writers' contract notes"): copy that shape.
5. Follow-ups: docs/superpowers/notes/2026-10-12-stage-3-followups.md, 2026-10-12-mobile-ux-followups.md.
6. The placement UX pass that landed after the Stage 4 review was written: docs/superpowers/notes/2026-10-12-placement-ux-review.md (rulings P1-P16 in the rulings list, part 8) and its follow-ups. Stage 4 builds on it: placing a monument uses the same per-condition chips (`conditionsFor`), the Ground overlay (rocky ground for the quarry), the Layers picker, touch drawing and "leave the tool after a touch ✓". Where the Stage 4 review's section 3.4 (placing big footprints on phones) differs from what placement now does, the placement rulings win unless you record a new ruling.

Stage 4 is: the seven monuments rising layer by layer (blocks, ramp, sleds, work gangs, casing, gold capstone), the quarry, brickworks and builders' guild with crews and delivery, monuments as the late-game gold sink, prestige (pyramid unlocks, mood, the Monuments score part), score v2 with records and the `t2` share link, the Monuments tab and an honest site sheet, placing big footprints on phones, Stage 4 goals, firsts, achievements, feats, daily goals and tips, and the visual payoff of review section 7: processions, plazas and sphinxes, a title backdrop with a monument going up, and the Motion setting (Full / Gentle / Still) so a device that asks for less motion still sees a living city.

Rules:
- Do not ask me questions. Decide from the review, the spec, and game-design and UX best practice, and record every decision in docs/superpowers/notes/handoff-2026-10-11/rulings-so-far.md (continuing after the review's rulings, from 225) with what it costs if wrong.
- Stop only for pushing (a push to main deploys the live site) or anything destructive. Merge to main locally; never push.
- Commits use the repo-local identity (`git config --local user.email` must be 181878008+joshuahedge@users.noreply.github.com) and end with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, whatever model writes them. Never write my employer's name anywhere in the repo (`git grep -n -i` for it before every commit; tell every agent).
- `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 150` must print ALL PASSED before every commit. Rerun `tools/sw-files.ps1` after editing anything under src/, css/ or index.html; never hand-edit sw-files.js (on a merge conflict take either side, regenerate, re-test). `tests/ui/mobileBudget.test.js` (the phone height budget) must keep passing.
- Explain plainly, lead with outcomes, and show me screenshots whenever something visual changes. Never host Thebes as a Claude artifact.

How to run it (this overrides any skill text that says not to run implementers in parallel):
1. Spec. On main, revise the spec from the review (4.10 goods, 4.11 money, 4.14 progression, 4.16 monuments with the new times, 4.19 score v2, 5.x art and motion, 6.x the Monuments tab, site sheet and placing, 7.3 commands, 10), record the rulings, commit.
2. Infrastructure on main: a `-Stage4` scene set in tools/shots.ps1 and tools/contact.py (site under way, a pyramid course, the capstone moment, a festival procession, the site sheet, the Motion choice), dev scenes behind `window.__thebes.devScene`, and "before" shots (tag s4before) at 390x844, 844x390, 1024x768 and 1280x800, each under Full motion and under reduced motion.
3. Plan, on branch `stage-4-monuments`:
   a. One architect agent (opus) writes the plan header, global constraints, a binding contract and Track 0's tasks (world version 5 and its migration, all data, stubs with final signatures, one-time wiring, per-track sections in text.js, ui.css and tips.js, test aggregators), and RUNS that code on a scratch copy of the repo until the suite passes, keeping the scratch copy and its git history.
   b. While the track writers write, build Track 0 on the branch from the architect's scratch patches (implementer, then reviewer, then fix rounds), plus any small contract follow-ups the writers need.
   c. Plan writers in parallel (opus), one per track as in review section 10 (A monuments sim and supply chain, B art for monuments and industry, C interface, D score v2 and gamification, E visual payoff and Motion, F balance), each copying the architect's scratch copy and running its own code before writing it into the plan. Assemble, rule on every CONTRACT NOTE in a "Controller rulings" section, check every code fence closes, commit the plan.
4. Tracks A-E in parallel, each in its own git worktree in a sibling folder (C:\dev\thebes-s4-<track>, branched from the contract commit), driven by ONE workflow with one agent per track at a time. Per task: a fresh implementer (sonnet when the plan has the complete code, opus for art and judgement), a task reviewer, and at most 3 fix rounds (round 3 on opus), then rule on anything left. Reviewers are sonnet, except art and visual tasks (Tracks B and E, and any task that changes how the map looks), whose reviewers are opus and must open the screenshots. Every interface reviewer checks the words match what the sim does. Skip the plan's "catch up before the last task" merge; the integrator merges.
5. Integrate on stage-4-monuments in the order A, B, C, D, E: rerun sw-files and the full suite after each merge, and send one fixer for any cross-track failure. Then run Track F (balance: the capital run's new band and gold ceiling, the sample, stress and title cities, the title backdrop's build time) the same way.
6. Visual pass (because I asked for better visuals again). Take the after shots at the four sizes under Full and reduced motion and LOOK at them yourself against the before shots. Then one art-direction reviewer (fable) judges them against the spec's art direction (5.1, 5.4, 5.6) and lists the changes that would most improve how the city and the monuments look on a phone. Run ONE opus visual polish wave on its top items, with screenshots before and after.
7. Final review: a whole-branch review on fable with the screenshots (four sizes, Full and reduced motion), then ONE opus fix wave, a scoped sonnet re-review, and a ruling on anything left.
8. Wrap up: README section, a follow-ups note, the after screenshots and contact sheets (retake them at HEAD before judging: a fix wave's own shots can predate its last commit), the rulings, a local merge to main, the full suite on main, and your memory note.

Limits and hazards (learnt in Stages 2 and 3):
- Concurrency: at most 5 agents running at once. If an agent stops on a usage limit, resume it with SendMessage after the reset rather than starting a fresh one.
- Ledgers: a master ledger at C:\dev\thebes\.superpowers\sdd\<plan>\progress.md (one line per task, fix round and ruling) and one per worktree. Trust the ledgers and git log after any compaction. Tell every fixer to stage files by path: a fixer once committed the ledger into a merge (`.superpowers/` must never be tracked).
- Motion: headless Edge, and my own devices, report reduced motion. Every visual change needs a version that reads with reduced motion, tests of normal motion force it off, and screenshots are taken both ways.
- Machine load: stagger full test runs across worktrees and use `-Grep "s4 <track>"` while iterating. If the suite times out, check `Get-Process python*` for CPU-heavy strays and stray `tests/serve.py` servers (one from a Stage 3 worktree was left listening on port 8765). Never run `python3 - <<EOF` with an empty heredoc; use `python`. contact.py needs plain `python`.
- Other sessions: check git log for commits you did not make. The session that wrote this prompt has stopped working on Thebes (its last work was the placement UX pass, merged to main before this prompt was handed over).
- Josh's phone feedback is the best test: after the final review, play the opening and a monument build on 390x844 by touch (scripted), and check each of his placement points still holds (fertile land shown, drag or tap tiles, no lock-in after ✓, tap to expand, conditions shown separately, a visible road sign, the Ground overlay).
- Worktrees go in sibling folders, never inside the repo. The old `C:\dev\thebes-s3-*` worktrees are merged; leave them unless I ask.

End with: the outcome in plain words, the models used, the new rulings, screenshots of the main Stage 4 screens (a monument rising, the capstone moment, the site sheet, placing a pyramid on a phone, a procession, the city under reduced motion), and what is left for me.

---

## Notes for Josh
- **Cost.** Stage 3 used roughly 25 million tokens across about 120 agents. Stage 4 is similar in size and adds a visual review and a polish wave. The prompt keeps Stage 3's savings: sonnet reviewers, at most 3 fix rounds, no separate 150% text pass. Art reviewers are on opus because you asked for better visuals.
- **What still needs you.** Pushing, the real-phone checks, and any taste calls listed at the end.
