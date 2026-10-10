# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Requirements

Python 3 on your PATH, and Microsoft Edge for the command-line tests.

## Run it locally

    python tests/serve.py 8000 .

Then open http://localhost:8000/.

## Play it

    python tests/serve.py 8000 .

Then open http://localhost:8000/. The title card shows a sample city; **New city** starts a fresh one, paused, with 2,000 gold and a road in from the edge. The goals strip under the top bar says what to do next, and **Show me** opens the right card and points at the place.

**Saving.** The game saves on its own at the end of every game month and whenever you leave the page, keeping the previous save as a backup. Come back and **Continue** opens the Welcome back card: how long you were away, what moved, open goals and alerts; **Carry on** restores your speed. A warning banner appears if saving stops working (private browsing, full storage): export your city from the menu.

**Export and import.** Menu → **Export city** shares a `thebes-city-<date>.json` file (or downloads it); **Import city** loads one. Starting a new city offers to export first.

**Install.** On an iPhone the game shows how to add it to the home screen (Share → Add to Home Screen) before you build anything, because the installed app keeps its own storage; if you built in Safari first, export there and **Bring a city from Safari** in the installed app. Android and desktop Chrome or Edge offer **Install** on the title card and in the menu. Installed, it works offline; when a new version is ready, a toast offers **Restart**. Chat apps' built-in browsers cannot install or keep saves: open the link in Safari or Chrome.

**Sound and vibration** are off by default: **Play with sound** on the title card or the Settings sheet turns them on. The iPhone silent switch is respected.

Add `?seed=7` for another map, `?sample=1` for a small ready-made city, `?stress=1` for a full 64×64 city, or `?speed=1` to start running.

Keys: Space pauses, + and − change the speed, 1–7 pick a build category, arrows or WASD move the view, M opens the minimap, O cycles the overlays, Enter confirms, Esc goes back one step (it also closes an open tray), Ctrl+Z (Cmd+Z) undoes, ? lists the shortcuts. With a mouse: drag to pan, wheel to zoom, click to place. On a phone: one finger pans, two fingers zoom, tap to select or to move the ghost, then ✓.

To try it on a phone on the same network: `python tests/serve.py 8000 . "" 0.0.0.0`, then open `http://<this computer's address>:8000/` on the phone (saving and installing need HTTPS or localhost, so the phone can play but not install from here).

`tests/screenshot.ps1 -Url '/?skipTitle=1&seed=1&sample=1' -Out shot.png -Width 390 -Height 844` saves a PNG of the page from headless Edge at that size.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

The script starts `tests/serve.py` and headless Edge. The test page sends its results back to the server by POST (to `/__results`), and the script waits for them on the real clock for up to 45 seconds, retrying once if they never arrive. It exits 0 only when the output ends with `ALL PASSED`.

Add `-Grep "reach"` to run only tests whose full name contains that text. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Tools

`tools/render-assets.ps1` redraws the app icons and `og-image.png` with the art code (commit the PNGs). `tools/sw-files.ps1` rewrites `sw-files.js`, the list of files the offline cache holds, with a build stamp; run it after adding or changing files, before a publish (the test suite fails when it is stale).

For development, `?skipTitle=1` starts a fresh city without the title card, `?welcome=1` starts a sample city behind the Welcome back card, and `?nosw=1` drops the offline cache so edits show without a restart. Neither of the first two writes anything at once, but the next autosave replaces the saved city, so use them on a scratch browser profile.

## Publishing

The site is plain files: GitHub Pages serves `main` from the repository root at `https://joshuahedge.github.io/thebes/`. Every path in the page is relative so it works under that `/thebes/` folder; `.nojekyll` keeps Pages from processing the files.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
