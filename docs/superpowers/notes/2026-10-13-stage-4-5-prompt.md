# Prompt for the Stage 4.5 chat (paste everything below the line)

---

Build Stage 4.5 of my personal game Thebes at C:\dev\thebes: "polish and pressure". Work autonomously, but cheaply. I'm watching my weekly token limit, so be as token-efficient as you can.

Read first, and nothing more than you need:
1. Your memory note for Thebes.
2. The plan: docs/superpowers/plans/2026-10-13-thebes-stage-4-5-polish-and-pressure.md. It holds what I asked for, my choices, the rules, the process, the tasks (1, 2, 3, 4a, 4b, 5, 6) and the proposed rulings 309-321.

Then follow the plan's process exactly:
- One branch, `stage-4-5`. Tasks run one at a time; no worktrees, no parallel tracks, no plan writers.
- Per task: a Sonnet implementer working from the task's section, then a Sonnet reviewer working from the diff. At most two fix rounds, and Opus only for a second round that did not converge.
- Do not read diffs or whole files yourself. Read reports, keep the ledger, and rule on what is left.
- Screenshots only for Tasks 1, 3 and 5, at 390x844 and 1280x800, under Gentle and Full. Look at two or three yourself.
- No Fable and no Opus reviews. The end-of-branch review is Sonnet.

Stop and talk to me at these points only:
- after Task 3, with four small shots (an east map, a middle map, an island map, a bridge);
- after Task 4a, with the economy page. Wait for my picks before Task 4b;
- if my weekly usage passes 62% (check with the usage tool at each checkpoint);
- before any push (a push to main deploys the live site).

Otherwise don't ask me questions. Accept the plan's rulings unless the code shows one is wrong, and record any change as a new ruling with its cost if wrong.

Rules that never bend:
- The commit identity is the repo-local one: `git config --local user.email` must print 181878008+joshuahedge@users.noreply.github.com.
- Every commit message ends with exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never write my employer's name anywhere. Run `git grep -n -i` for it before every commit, and tell every agent.
- `tools/sw-files.ps1` runs after any change to src/, css/, index.html or assets/.
- The full suite (`powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -WaitSeconds 150`) prints ALL PASSED before every commit.
- Stage files by path; never commit .superpowers/.

When you're done:
- Merge to main locally and run the full suite on main.
- Update the README, the follow-ups note and rulings Part 12.
- Then ask me before pushing.
- End with the outcome in plain words, screenshots of what changed, the rulings you made, and what is left for me.
