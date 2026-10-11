You are writing part of an implementation plan (not implementing it). Project: Thebes, a hobby isometric city builder in plain HTML/CSS/ES-module JavaScript with code-drawn canvas art, at C:\dev\thebes (branch stage-2-economy; no build step, no Node; tests run in headless Edge via `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 [-Grep "text"]`, 674 tests pass now; screenshots via tests/screenshot.ps1 with -Url, -Out, -Width, -Height and an optional -Eval JS string). DO NOT modify any file in C:\dev\thebes. You may read everything there.

Read, in this order:
1. The Stage 2 plan header, conventions and binding interface contract: C:\dev\thebes\docs\superpowers\plans\2026-10-11-thebes-stage-2-economy.md
2. The spec: C:\dev\thebes\docs\superpowers\specs\2026-10-09-thebes-design.md (sections 4.1, 4.6-4.8, 4.10, 4.11, 4.14, 4.15, 4.18, 5.3, 6.3, 10).
3. The task briefs: C:\Users\joshed\AppData\Local\Temp\claude\C--Users-joshed\f82cf012-409c-433f-b501-fa4db4de3c80\scratchpad\stage2-task-briefs.md
4. The early-game pass spec C:\dev\thebes\docs\superpowers\specs\2026-10-11-thebes-early-game-pass-design.md and its follow-ups note C:\dev\thebes\docs\superpowers\notes\2026-10-11-early-game-pass-followups.md (the mechanisms Stage 2 extends).
5. Every source and test file your tasks touch, so your code matches the real names, imports and behaviour.

Earlier tasks of this plan run before yours: assume exactly what the contract says they produce.

Write each task in the writing-plans format:

### Task N: <Name>
**Files:** Create / Modify / Test with exact paths.
**Interfaces:** Consumes / Produces (must match the contract).
- [ ] **Step 1: Write the failing tests** — full test file content (describe/it/expect from tests/harness.js and the helpers), plus the tests/all.js import line.
- [ ] **Step 2: Run them to see them fail** — exact command with -Grep and the expected failure.
- [ ] **Step 3: Implement** — complete code: whole new files, and for modified files exact before/after replacement blocks (or whole functions) an engineer can apply without guessing. Art is real drawing code in the existing style (primitives.js helpers, palette constants), not descriptions. No placeholders.
- [ ] **Step 4: Run the tests to see them pass**.
- [ ] **Step 5: Update the existing tests this breaks** — grep tests/ for what your change affects and give each exact change, or say why none.
- [ ] **Step 6 (visual tasks): Visual check** — screenshot commands and what should be visible.
- [ ] **Step 7: Full suite** — `powershell -ExecutionPolicy Bypass -File tools/sw-files.ps1` then the suite; expected `ALL PASSED`.
- [ ] **Step 8: Commit** — exact `git add` paths and a commit message in this project's style (plain-English summary sentence, no "feat:" prefix, short body, last line exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), as a PowerShell `git commit -m @'...'@` here-string.

Rules and gotchas:
- Follow the contract exactly; record any genuine contract problem in a line starting "CONTRACT NOTE:" at the top of your output file and resolve it minimally.
- The sim stays deterministic. The UI changes the world only through sim functions. Every player-facing string goes in src/ui/text.js. Spec 6.1 binds new controls (labels, 44 px, 4.5:1, nothing over the middle of the map, colour never alone). Reason about pixel tests in device pixels; art registry heights are the max z-top and bounds contain every drawn pixel; headless Edge reports prefers-reduced-motion.
- VERIFY YOUR CODE WHERE YOU CAN: copy the repo to a scratch folder under C:\Users\joshed\AppData\Local\Temp\claude\C--Users-joshed\f82cf012-409c-433f-b501-fa4db4de3c80\scratchpad\ (e.g. robocopy C:\dev\thebes <scratch>\s2-<yourtasks> /E /XD .git .superpowers), apply your tasks there (with minimal stand-ins for earlier tasks' contract outputs if they are not yet written), and run the suite from that copy (run-tests.ps1 serves the folder it lives in). Plans whose code was run were far better than predicted ones in this project; say in your reply which tasks you ran.
- Markdown hygiene: close every code fence before the next step; never nest triple-backtick fences (use ~~~ inside if needed).

OUTPUT: write your tasks to the scratch file named in your assignment (Write tool). Then reply with: the file path, a one-paragraph summary per task, every CONTRACT NOTE, whether you ran the code, and any risk for the implementer.
